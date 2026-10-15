import { camFacing } from './state.js';
import { t } from './i18n.js';
import { schedNew, schedPlan, schedAfter, HAND_POLICIES } from './core/handsched.js';
import { MP_LINE, rateOf } from './core/latency.js';
import { LOW_MODES, lowConstraints, lowVerdict, exposureSupported, LOW_SETTLE_MS, LOW_MEASURE_MS, devSnap, restoreAdvanced, restoreConstraints,
  healList, autoLeft } from './core/camlight.js';

/* ================= КАМЕРА + MEDIAPIPE ================= */
const video=document.getElementById('video');
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){this.rect(x,y,w,h);return this;};
let stream=null;                                 // текущий видеопоток — держим, чтобы гасить дорожки при переключении камеры
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize',resize); resize();

/* Test switches (session only, never saved). LAT1b: the model's processor, the camera frame rate requested (null = none, the default
   constraint set). LAT2: hands = the search policy ('2s' two hands, full search every 3rd frame — default; '2' search every frame — the
   app before LAT2; '1' one hand), path = where detection runs. LAT3: low = the «Low light (test)» mode ('off' = today's camera request;
   core/camlight.js). The canvas always draws the detected frame (rule #8; LAT3 removed the «live camera» picture switch — the dots must
   match the hand exactly). ⛳ path 'main' by default (LAT2b, measured on the user's desktop GPU, Intel HD 4000,
   sample hand photo): in a worker the same model runs ≈ 2× slower — one hand 98 vs 53 ms per frame, two hands 160 vs 80 — because WebGL
   inside a worker is slower there (plain JavaScript is not); 'worker' stays one switch away and falls back to 'main' by itself. */
const VISION_DEF={ hands:'2s', delegate:'GPU', camFps:null, path:'main', low:'off' };
const opts={ ...VISION_DEF };
let camStartT=NaN;   // performance time the current camera stream started playing (LAT1b: «startup» long tasks)

/* Open camera `facing` on the same <video>. Old tracks are stopped FIRST (a phone rarely opens a second camera while the first lives);
   a failed request throws upward — the caller rolls back (ui.js). LAT1b: frameRate is requested only when the test switch asks. */
const camBase=()=>({ width:{ideal:640}, height:{ideal:480}, ...(opts.camFps ? { frameRate:{ideal:opts.camFps} } : {}) });   // LAT3: also the base of every low-light set
const camWant=()=>({ facingMode:camFacing, ...camBase() });
/* CAM-FIX: before the old track stops, a low-light test gives the device back its own settings; the new track is healed if the device
   was left in manual mode (by an earlier session, a crash or another app). Both bounded — a hanging camera call never blocks the start. */
async function openCamera(facing){
  if(stream){ if(opts.low!=='off' || low.touched.size){ low.gen++; await bounded(devRestore(vtrack(), 'restore')); } for(const tr of stream.getTracks()) tr.stop(); stream=null; }
  const want={ ...camWant(), facingMode:facing };
  stream=await navigator.mediaDevices.getUserMedia({ video:want, audio:false });
  video.srcObject=stream; await video.play();
  camStartT=performance.now();
  if(opts.low!=='off'){ opts.low='off'; low.note='reopened'; low.asked=null; }   // LAT3: a reopened camera gets today's request
  low.orig=null; low.touched.clear();
  await bounded(camHeal());
  pumpStart();
}

/* LAT1b: which processor the hand model REALLY runs on. MediaPipe's task API does not report it; its WebAssembly prints its own log
   lines to the console — the CPU path announces the XNNPACK delegate, the GPU path only its WebGL context. A tap on the console keeps
   those lines (only MediaPipe-shaped ones; everything is passed through unchanged) since the last (re)start; LAT2: the detection worker
   forwards its own lines (they land in the same list). */
/* TAP_MS: two minutes after a (re)start — long enough to see lines printed when the hand model first meets a hand */
const TAP_MS=120000;
let mpLog=[], tapOff=null, tapT=0, xnnBefore=false, xnnOnGpu=false;   // xnnBefore: an earlier window showed the XNNPACK line (TFLite prints it once per page); xnnOnGpu: it came while GPU was asked
function mpTap(){   // only for TAP_MS after a (re)start: outside that window the console is the browser's own (DevTools source lines stay true)
  clearTimeout(tapT); tapT=setTimeout(()=>{ if(tapOff){ tapOff(); tapOff=null; } }, TAP_MS);
  if(tapOff) return;
  const orig={};
  for(const k of ['log','info','warn','error','debug']){ const f=console[k]; if(typeof f!=='function') continue; orig[k]=f;
    console[k]=function(...a){ const s=a[0]; if(typeof s==='string' && s.length<600 && MP_LINE.test(s) && mpLog.length<40) mpLog.push(s); return f.apply(this,a); }; }
  tapOff=()=>{ for(const k in orig) console[k]=orig[k]; };
}
/* measured (runner, 2026-10-15): BOTH paths create a WebGL context (image conversion); the CPU path creates the XNNPACK delegate, and
   TensorFlow Lite announces it ONCE per page. SND-F1b fix (the user saw «unknown» on a page where he had not asked for CPU): the read-out
   starts from what was ASKED and SUCCEEDED (MediaPipe throws, it does not fall back, when a processor cannot start) and only evidence
   changes it — never «unknown» for GPU. Asked GPU: 'GPU', or 'GPU+CPU' once an XNNPACK line came while GPU was asked (a part of the model
   on the processor). Asked CPU: 'CPU' when its line came now or earlier on this page (`once`), 'unknown' only if it never came. */
const XNN=/XNNPACK/i;
function delegateOf(lines, before, asked){
  const xnn=lines.some(s=>XNN.test(s));
  if(asked==='GPU') return xnn||xnnOnGpu ? 'GPU+CPU' : 'GPU';
  return xnn||before ? 'CPU' : 'unknown';
}
const newWindow=()=>{ if(mpLog.some(s=>XNN.test(s))){ xnnBefore=true; if(opts.delegate==='GPU') xnnOnGpu=true; } mpLog=[]; mpTap(); };
const mpLine=s=>{ if(mpLog.length<40) mpLog.push(s); };   // a line forwarded by the worker
const modelInfo=()=>({ requested:opts.delegate, actual:delegateOf(mpLog, xnnBefore, opts.delegate), once:opts.delegate==='CPU' && xnnBefore && !mpLog.some(s=>XNN.test(s)), hands:opts.hands,
  evidence:mpLog.filter(s=>/gl_context.*GL version|XNNPACK|delegate/i.test(s)).map(s=>s.replace(/^[IWEF]\d{4} [\d:.]+ \d+ /,'').slice(0,160)) });

/* LAT1b: the camera's request and what the browser granted (track.getSettings). LAT3: + what the webcam can do (getCapabilities), its
   full settings and its name — read on the device, leaving it only inside the text the person copies (rule #33). */
let camSim=null;   // probe only (CAM-FIX): a simulated webcam whose device controls persist across opens, wrapped around the real track
const vtrack=()=>{ const tr=stream&&stream.getVideoTracks()[0]; return tr&&camSim ? camSim.wrap(tr) : tr; };
const capsOf=tr=>{ try{ return tr&&tr.getCapabilities ? tr.getCapabilities() : null; }catch(e){ return null; } };
function camInfo(){
  const tr=vtrack(), s=tr&&tr.getSettings ? tr.getSettings() : {};
  return { requested:{ width:640, height:480, frameRate:opts.camFps }, granted:{ width:s.width??null, height:s.height??null, frameRate:s.frameRate??null }, startT:camStartT,
           caps:capsOf(tr), settings:{ ...s }, label:tr&&tr.label||'' };
}

/* ================= LAT2 — THE DETECTION PATH =================
   A detector object: { kind:'worker'|'main', run(job) → Promise<{res, action, n, ms, w0, w1, bmp}>, setDelegate(d), dbg(o), close(),
   warmMs }. LAT2b: when the worker (src/hand-worker.js, a classic worker: MediaPipe's own loader needs importScripts) is asked for and
   cannot start (no Worker or OffscreenCanvas, the model fails there, 90 s without an answer) detection runs on the main thread through
   the same handdet.js — the meter says which and why. A worker that dies later hands over to the main thread the same way. */
const W_READY_MS=90000, EMPTY=Object.freeze({ landmarks:[], handednesses:[] });
const path={ runs:null, why:'', warmMs:null };
let det=null, detGen=0, workerFailDbg=false;
const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));   // let a message paint before the main thread blocks
function workerDet(step){
  return new Promise((resolve, reject)=>{
    let w; try{ w=new Worker(new URL('./hand-worker.js', import.meta.url)); }catch(e){ reject(e); return; }
    const pend=new Map(); let ready=false, seq=0, delegP=null, me=null;
    const fail=why=>{
      if(!ready){ clearTimeout(tm); w.terminate(); reject(new Error(why)); return; }
      for(const [,p] of pend) p.reject(new Error(why)); pend.clear(); w.terminate();
      if(det===me) detLost(why);
    };
    const tm=setTimeout(()=>fail('the worker did not answer within 90 s'), W_READY_MS);
    w.onerror=e=>{ if(e.preventDefault) e.preventDefault(); fail(e.message||'the worker failed to load'); };
    w.onmessageerror=()=>fail('a message from the worker could not be read');
    w.onmessage=e=>{ const m=e.data;
      if(m.type==='log') mpLine(m.line);
      else if(m.type==='step'){ if(step) step(m.step); }
      else if(m.type==='ready'){ ready=true; clearTimeout(tm); resolve(me=api(m.warmMs)); }
      else if(m.type==='fail') fail(m.msg);
      else if(m.type==='res'){ const p=pend.get(m.id); if(!p){ if(m.bmp) m.bmp.close(); return; } pend.delete(m.id);
        if(m.err) p.reject(new Error(m.err)); else { const o=performance.timeOrigin; p.resolve({ res:m.res, action:m.action, n:m.n, ms:m.ms, w0:m.t0-o, w1:m.t1-o, bmp:m.bmp }); } }
      else if(m.type==='delegated'){ const p=delegP; delegP=null; if(p){ if(m.err) p.reject(new Error(m.err)); else p.resolve(); } }
    };
    const api=warmMs=>({ kind:'worker', warmMs,
      run(job){ return new Promise((res, rej)=>{ const id=++seq; pend.set(id,{ resolve:res, reject:rej });
        w.postMessage({ type:'frame', id, t:job.t, bmp:job.bmp, action:job.action, policy:job.policy }, [job.bmp]); }); },
      setDelegate(d){ return new Promise((res, rej)=>{ delegP={ resolve:res, reject:rej }; w.postMessage({ type:'delegate', d }); }); },
      dbg(o){ w.postMessage({ type:'dbg', o }); },
      close(){ ready=false; w.terminate(); for(const [,p] of pend) p.reject(new Error('closed')); pend.clear(); } });
    w.postMessage({ type:'init', delegate:opts.delegate, w:640, h:480, failInit:workerFailDbg });
  });
}
async function mainDet(step){
  const H=await import('./handdet.js');
  const blank=()=>{ const c=typeof OffscreenCanvas!=='undefined' ? new OffscreenCanvas(640,480) : Object.assign(document.createElement('canvas'),{ width:640, height:480 });
    const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,640,480); return c; };
  const D=await H.createDetector({ delegate:opts.delegate, blank, step:async s=>{ if(step) step(s); await nextPaint(); } });
  return { kind:'main', warmMs:D.warmMs,
    run(job){ try{ const w0=performance.now(), r=D.run(job.bmp, job.t, job.action, job.policy); return Promise.resolve({ ...r, w0, w1:performance.now(), bmp:job.bmp }); }
              catch(e){ return Promise.reject(e); } },
    setDelegate:d=>D.setDelegate(d), dbg:o=>D.dbg(o), close:()=>D.close() };
}
async function buildDet(asked, step){
  if(asked==='worker'){
    if(typeof Worker==='undefined' || typeof OffscreenCanvas==='undefined') return { d:await mainDet(step), runs:'main', why:'no OffscreenCanvas or Worker in this browser' };
    try{ return { d:await workerDet(step), runs:'worker', why:'' }; }
    catch(e){ const why=String(e&&e.message||e); console.warn('[vision] hand detection worker unavailable — the main thread detects instead:', why);
      return { d:await mainDet(step), runs:'main', why }; }
  }
  return { d:await mainDet(step), runs:'main', why:'' };
}
/* (re)build the detection path; the old one keeps working until the new one is ready, then it is closed */
async function setPath(asked, step){
  const b=await buildDet(asked, step), old=det;
  det=b.d; detGen++; path.runs=b.runs; path.why=b.why; path.warmMs=b.d.warmMs;
  sched=schedNew(); if(old) old.close();
}
function detLost(why){   // the worker died mid-session: the main thread takes over
  console.warn('[vision] hand detection worker stopped — the main thread takes over:', why);
  det=null; detGen++; path.runs=null; path.why=why;
  buildDet('main').then(b=>{ if(det) { b.d.close(); return; } det=b.d; detGen++; path.runs='main'; path.why=why; path.warmMs=b.d.warmMs; sched=schedNew(); },
                        e=>{ path.why=why+' · main thread: '+(e&&e.message||e); });
}

/* ================= LAT2a — THE FRAME PUMP =================
   Every NEW camera frame (requestVideoFrameCallback; without it the draw loop polls the video's time) is snapshotted ONCE as an
   ImageBitmap and goes through at most one detection: one frame in flight, one waiting — a newer frame REPLACES the waiting one (stale
   frames are dropped, never queued). The schedule (core/handsched.js) picks what runs on it ('skip' runs nothing). Each processed frame
   is handed to the sink (main.js) with its result and its picture: the canvas draws the very frame whose hands it shows (rule #8). */
let sched=schedNew(), busy=false, pend=null, vfh=null, sink=null, isPaused=()=>false, lastId=-1, snapMax=-1, faultDbg=null, schedStayDbg=false, holdDbg=false, delayDbg=0;
const PS={ snapped:0, processed:0, detected:0, dropped:0, dup:0, notNewest:0, errors:0, err:'', log:[] };   // log: the last 300 processed frames {id, pf (the camera's presentedFrames), action, n}
function pumpStart(){
  if(!video.requestVideoFrameCallback) return;
  if(vfh!=null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(vfh);
  vfh=video.requestVideoFrameCallback(onVF);
}
/* frames are numbered here (the browser calls once per presented frame; presentedFrames may restart with a new camera stream) */
let frameSeq=0, pollT=-1;
const vfRing=[];   // LAT3: [time, presentedFrames] of the last 4 s — what the camera delivers, for the low-light verdict
function onVF(now, md){ vfh=video.requestVideoFrameCallback(onVF);
  vfRing.push([now, md.presentedFrames]); while(vfRing.length>2 && now-vfRing[0][0]>4000) vfRing.shift();
  takeFrame(++frameSeq, md.captureTime, md.presentationTime, now, md.presentedFrames); }
function pollFrame(){   // fallback (no requestVideoFrameCallback): a new frame = the video's time moved; called by the draw loop
  if(video.requestVideoFrameCallback || video.readyState<2 || video.currentTime===pollT) return;
  pollT=video.currentTime; takeFrame(++frameSeq, NaN, NaN, performance.now());
}
function takeFrame(id, cap, pres, now, pf=NaN){
  if(!det || isPaused() || holdDbg || video.readyState<2) return;
  const snapT=performance.now();
  let p; try{ p=createImageBitmap(video); }catch(e){ return; }   // the frame on screen now = this callback's frame
  p.then(bmp=>{
    if(isPaused()){ bmp.close(); return; }
    PS.snapped++; if(id>snapMax) snapMax=id;
    if(id<=lastId || (pend && pend.id>id)){ bmp.close(); PS.dropped++; return; }   // a snapshot that resolved after a newer one: stale
    const job={ id, pf, cap, pres, vfNow:now, snapT, bmp };
    if(pend){ if(faultDbg==='queue'){ bmp.close(); PS.dropped++; return; } pend.bmp.close(); PS.dropped++; }   // 'queue' = CONTROL: keep the oldest
    pend=job; pump();
  }, ()=>{});
}
async function pump(){
  if(busy || !pend || !det) return;
  const job=pend; pend=null; busy=true;
  const d=det, g=detGen;
  try{
    if(job.id<=lastId) PS.dup++;              // a frame detected before (must never happen)
    if(job.id<snapMax) PS.notNewest++;        // a newer snapshot existed (must never happen)
    if(job.id>lastId) lastId=job.id;
    const policy=opts.hands, action=schedPlan(sched, policy), t0=performance.now();
    const r= action==='skip' ? { res:EMPTY, action, n:0, ms:0, w0:t0, w1:t0, bmp:job.bmp }
                             : await d.run({ bmp:job.bmp, t:job.snapT, action, policy });
    if(delayDbg) await new Promise(res=>setTimeout(res, delayDbg));   // probe: a detector slower than the camera that does not block
    const t1=performance.now();
    if(g!==detGen){ if(r.bmp) r.bmp.close(); return; }   // the path was rebuilt meanwhile
    if(action!=='skip') PS.detected++;
    sched=schedAfter(sched, r.action.split('>').pop(), schedStayDbg && r.n>=2 ? 1 : r.n);   // schedStayDbg = CONTROL: a second hand never switches
    PS.processed++; PS.log.push({ id:job.id, pf:job.pf, action:r.action, n:r.n }); if(PS.log.length>300) PS.log.shift();
    if(faultDbg==='dupe' && !job.again){ pend={ ...job, bmp:r.bmp, again:true }; return; }   // CONTROL: the same frame goes through once more
    const f={ res:r.res||EMPTY, frame:r.bmp, id:job.id, action:r.action, n:r.n, cap:job.cap, pres:job.pres, vfNow:job.vfNow, snapT:job.snapT, t0, t1, ms:r.ms,
              xfer: d.kind==='worker' && action!=='skip' ? Math.max(0, (t1-t0)-(r.w1-r.w0)) : NaN, path:d.kind };
    if(sink && !isPaused()) sink(f); else if(f.frame) f.frame.close();
  }catch(e){ PS.errors++; PS.err=String(e&&e.message||e); }
  finally{ busy=false; if(pend) pump(); }
}
/* the sink gets every processed frame; paused() = the editor or the arrangement window is open (no frame is taken then) */
function setHandsSink(fn, paused){ sink=fn; isPaused=paused||(()=>false); }

async function initVision(msg){
  msg(t('load.model'));
  newWindow();
  await setPath(opts.path, s=>{ if(s==='warm') msg(t('load.warm')); });
  msg(t('load.camera'));
  await openCamera(camFacing);                   // стартовая камера — из состояния (по умолчанию фронтальная 'user')
}

/* Переключение камеры (фронт↔тыл) — уже ПОСЛЕ старта (панель #bar видна только после «▶ Запустить»,
   поэтому кнопки на странице при загрузке нет — правило AudioContext/камера соблюдено). Детектор не пересоздаём:
   новый поток идёт в тот же <video>, кадры приходят тем же насосом. Бросает при отказе — откат в ui.js. */
async function switchCamera(facing){ await openCamera(facing); }

/* Test switches. Hands: the schedule's policy (instant — both models are always built). Processor: setOptions on both models (graph
   rebuild ≈ 1 s each, in the worker when it runs). Frame rate: reopens the camera. Path: builds the other path, then swaps. Low light:
   applyConstraints on the running track (below). Values outside the offered ones refuse. */
async function setHandsTracked(m){
  if(!HAND_POLICIES.includes(m)) throw new Error('hands tracked: '+HAND_POLICIES.join(', '));
  if(m===opts.hands) return; opts.hands=m; sched=schedNew();
}
async function setModelDelegate(d){
  if(d!=='GPU'&&d!=='CPU') throw new Error('model processor: GPU or CPU');
  if(d===opts.delegate) return; if(!det) throw new Error('the hand model is not running yet');
  const keep=mpLog, kb=xnnBefore; newWindow();
  try{ await det.setDelegate(d); opts.delegate=d; sched=schedNew(); }
  catch(e){ mpLog=keep; xnnBefore=kb; throw e; }
}
async function setCamFps(f){
  if(f!==null&&f!==30&&f!==60) throw new Error('camera frame rate: default, 30 or 60');
  if(f===opts.camFps) return;
  const keep=opts.camFps; opts.camFps=f;
  try{ await openCamera(camFacing); } catch(e){ opts.camFps=keep; try{ await openCamera(camFacing); }catch(e2){} throw e; }
}
async function setDetectPath(p){
  if(p!=='worker'&&p!=='main') throw new Error('detection path: worker or main');
  if(path.runs===p){ opts.path=p; path.why=''; return; }   // already there (e.g. after a fallback)
  const keep=opts.path; opts.path=p;
  try{ await setPath(p); }catch(e){ opts.path=keep; throw e; }
}
/* LAT3: «Low light (test)». The mode's constraint set (core/camlight.js) goes to applyConstraints on the running track; then the camera
   settles (1 s) and the delivered frames are counted (2 s). An error (OverconstrainedError …) or no effect → back to Off (today's request,
   the exposure handed back to the camera); the reason stays in `low.note` for the meter. The camera is never closed for this; only when
   even Off cannot be applied is it reopened with today's request. */
/* CAM-FIX: `orig` = the device controls (getSettings) before the first test change on this track; `touched` = every device control a
   test set carried; `dev` = the last device action for the meter: { kind:'heal'|'restore', ok, what:[mode keys] }. */
const low={ asked:null, note:'', before:NaN, after:NaN, gen:0, orig:null, touched:new Set(), dev:null };
let lowDbgO={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bounded=(p, ms=2000)=>Promise.race([p.catch(()=>{}), sleep(ms)]);
const settingsOf=tr=>{ try{ return tr&&tr.getSettings ? tr.getSettings() : {}; }catch(e){ return {}; } };
const fpsOver=(a,b)=>rateOf(vfRing.filter(x=>x[0]>=a && x[0]<=b));
/* Chrome routes a set holding a camera control (exposure, white balance…) to its image-capture path and IGNORES the set's format part
   (width, frameRate); a set without one changes the format and leaves the controls alone (measured on the runner's camera, CAM-FIX — the
   pre-fix Off was such a format-only set). So the format and the controls go in two calls. */
async function applySet(tr, c){
  const { advanced, ...fmt }=c;
  await tr.applyConstraints(fmt);
  if(advanced && advanced.length) await tr.applyConstraints({ advanced });
}
/* modes still manual after asking 'continuous' — read again once after 300 ms (a camera may report its new state a little late) */
async function stillManual(adv, tr){ let left=autoLeft(adv, settingsOf(tr)); if(left.length){ await sleep(300); left=autoLeft(adv, settingsOf(tr)); } return left; }
/* CAM-FIX: give the device its own settings back — automatic exposure / white balance, touched values to their originals — and check
   what the camera reports afterwards. Throws when the camera refuses the set. probe CONTROL noRestore = the pre-fix Off (base only). */
async function devRestore(tr, kind){
  if(!tr || !tr.applyConstraints) return;
  const caps=capsOf(tr), touched=[...low.touched];
  const c=lowDbgO.noRestore ? lowConstraints('off', caps, camBase(), 'off') : restoreConstraints(caps, camBase(), low.orig||{}, touched);
  low.asked=c; low.touched.clear(); low.orig=null;
  await applySet(tr, c);
  const adv=c.advanced||[], left=await stillManual(adv, tr), modes=adv.filter(e=>Object.values(e)[0]==='continuous').map(e=>Object.keys(e)[0]);
  low.dev= touched.length||left.length ? { kind, ok:!left.length, what:left.length ? left : modes } : null;   // fps-only tests touch no device control
}
/* CAM-FIX: at every open — a device found in manual exposure / white balance (left by an earlier session, a crash or another app) is
   set back to automatic; the meter says so. probe CONTROL noHeal skips it. */
async function camHeal(){
  const tr=vtrack(); if(!tr || !tr.applyConstraints || lowDbgO.noHeal) return;
  const bad=healList(capsOf(tr), settingsOf(tr)); if(!bad.length) return;
  const adv=bad.map(m=>({ [m]:'continuous' }));
  try{ await tr.applyConstraints({ advanced:adv }); }catch(e){}   // controls only: the format stays as opened
  const left=await stillManual(adv, tr);
  low.dev={ kind:'heal', ok:!left.length, what:left.length ? left : bad };
}
async function lowOff(tr, caps, from, why){
  opts.low='off';
  try{ await devRestore(tr, 'restore'); }catch(e){ try{ await openCamera(camFacing); }catch(e2){} }
  low.note=why;
}
/* CAM-FIX: leaving the page ends a running test and restores the device (best effort: the page may be gone before the camera answers;
   the next open heals what is left) */
function lowLeave(){
  if(opts.low==='off' && !low.touched.size) return;
  const tr=vtrack(); if(!tr) return;
  low.gen++; opts.low='off'; low.note='left';
  devRestore(tr, 'restore').catch(()=>{});
}
addEventListener('pagehide', lowLeave);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') lowLeave(); });
async function setLowLight(m){
  if(!LOW_MODES.includes(m)) throw new Error('low light: '+LOW_MODES.join(', '));
  const tr=vtrack(); if(!tr || !tr.applyConstraints) throw new Error('the camera is not running');
  if(m===opts.low) return;
  const caps=capsOf(tr), from=opts.low, g=++low.gen, t0=performance.now();
  if(m==='off'){ low.before=fpsOver(t0-2000, t0); low.after=NaN; await lowOff(tr, caps, from, ''); return; }
  const c=lowConstraints(m, caps, camBase(), from);
  if(!c) throw new Error('this camera offers no manual exposure');
  if(lowDbgO.extra) c.advanced=[...(c.advanced||[]), { ...lowDbgO.extra }];   // probe: a test set that touches one more control
  if(!low.orig) low.orig=devSnap(settingsOf(tr));   // CAM-FIX: originals before the first change on this track
  if(low.touched.size){ const undo=restoreAdvanced(caps, low.orig, [...low.touched]); c.advanced=[...undo, ...(c.advanced||[])]; }   // from one test to another: undo the last one first
  for(const e of c.advanced||[]) for(const k in e) low.touched.add(k);
  low.before=fpsOver(t0-2000, t0); low.after=NaN; low.note=''; low.asked=c; opts.low=m;
  try{
    if(lowDbgO.fail){ const e=new Error('simulated by the probe'); e.name=lowDbgO.fail; e.constraint='frameRate'; lowDbgO.fail=null; throw e; }
    await applySet(tr, c);
  }catch(e){
    const why=(e&&e.name||'Error')+(e&&e.constraint ? ' ('+e.constraint+')' : e&&e.message ? ': '+e.message : '');
    if(!lowDbgO.noFallback) await lowOff(tr, caps, m, why);
    return;
  }
  await sleep(lowDbgO.fakeFps!=null ? 50 : LOW_SETTLE_MS+LOW_MEASURE_MS);   // probe: a faked reading needs no counting
  if(g!==low.gen || opts.low!==m) return;   // superseded by another press or a camera reopen
  let after=fpsOver(t0+LOW_SETTLE_MS, performance.now()); if(lowDbgO.fakeFps!=null) after=lowDbgO.fakeFps;
  const v=lowVerdict({ mode:m, before:low.before, after, settings:tr.getSettings() });
  low.after=after;
  if(!v.ok && !lowDbgO.noFallback) await lowOff(tr, caps, m, v.why); else low.note=v.why;
}
/* the low-light state for the meter: mode, the set passed to applyConstraints, the browser's own record of it (getConstraints), fps
   before / after, the reason of a fall-back ('noeffect', 'manual', an error name; 'partly' / 'unmeasured' when kept; 'reopened') */
const lowInfo=()=>{ const tr=vtrack(); let applied=null; try{ applied=tr&&tr.getConstraints ? tr.getConstraints() : null; }catch(e){}
  return { mode:opts.low, asked:low.asked, applied, before:low.before, after:low.after, note:low.note, exposure:exposureSupported(capsOf(tr)), dev:low.dev }; };
/* probe only: fail = the next applyConstraints throws an error of that name; fakeFps = the measured «after»; noFallback = CONTROL (a
   failure stays in the failed mode — the probe must catch it); CAM-FIX: extra = one more control in every test set, noRestore / noHeal =
   CONTROLS (the pre-fix Off; no heal at open); devClear forgets the last device action; reset */
function lowDbg(o={}){ lowDbgO= o.reset ? {} : { ...lowDbgO, ...o }; if(o.devClear) low.dev=null; }
/* probe only (CAM-FIX): sim = { wrap(track) → a track-like object } or null — the runner's fake camera cannot read back 'continuous', and
   its controls do not outlive a reopen; a simulated UVC device can, like the user's webcam */
function camSimDbg(sim){ camSim=sim||null; }
const visionOpts=()=>({ ...opts });
const pathInfo=()=>({ asked:opts.path, runs:path.runs, why:path.why, warmMs:path.warmMs });
const pumpStats=()=>({ ...PS, log:PS.log.slice(), sched:{ ...sched }, policy:opts.hands });
/* probe only: fault 'dupe' | 'queue' | null (CONTROLS of the frame-once row), schedStay (CONTROL of the schedule row), workerFail (the
   next worker start refuses — the fallback row), hold, delayMs (an awaited delay after each detection), and the detector's own hooks
   slowMs (a BLOCKING delay) / script / fake (handdet.js) */
async function detRunDbg(bmp, action, policy='2s'){   // one frame through the RUNNING detector, outside the pump (hold it first)
  if(!det) throw new Error('no detector'); const d=det; const r=await d.run({ bmp, t:performance.now(), action, policy }); return { kind:d.kind, ...r };
}
function pumpDbg(o={}){
  if('fault' in o) faultDbg=o.fault||null;
  if('schedStay' in o) schedStayDbg=!!o.schedStay;
  if('workerFail' in o) workerFailDbg=!!o.workerFail;
  if('hold' in o) holdDbg=!!o.hold;
  if('delayMs' in o) delayDbg=+o.delayMs||0;   // the pump takes no frame (the worker = main comparison feeds its own)
  const dd={}; for(const k of ['slowMs','script','fake']) if(k in o) dd[k]=o[k];
  if(Object.keys(dd).length && det) det.dbg(dd);
  if('reset' in o){ if(pend){ pend.bmp.close(); pend=null; } for(const k of ['snapped','processed','detected','dropped','dup','notNewest','errors']) PS[k]=0; PS.err=''; PS.log.length=0; lastId=-1; snapMax=-1; sched=schedNew(); }
}

/* Экспорт: детектор живёт здесь; кадры и результаты отдаются стоку (main.js). */
export { video, canvas, ctx, initVision, switchCamera, setHandsSink, pollFrame,
  camInfo, modelInfo, visionOpts, VISION_DEF, setHandsTracked, setModelDelegate, setCamFps, setDetectPath, setLowLight, lowInfo,
  pathInfo, pumpStats, pumpDbg, detRunDbg, lowDbg, camSimDbg };
