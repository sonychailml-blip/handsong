/* LAT1 — the latency meter, browser side. Measures, never changes what it measures: timestamps through the frame (main.loop calls
   latFrame), the camera's own frame clock (requestVideoFrameCallback: capture and presentation times where the browser reports them),
   the audio output (baseLatency, outputLatency, getOutputTimestamp), long tasks on the main thread. Feeds the pure meter of
   core/latency.js. Shows: the Diagnostics overlay (Sound panel → «Latency meter»), the console `R.latency()`, a one-time Bluetooth warning.
   LAT1b adds: the graphics renderer (hardware or software), the processor the hand model really runs on, the camera settings granted,
   duplicate detections per minute, the camera frame wait and a second total, long tasks split into startup / while playing with causes,
   and three session-only TEST SWITCHES (hands tracked, model processor, camera frame rate) — defaults leave the app exactly as before.
   UI-level module (owns its DOM: #latDiag, #latWarn, the Diagnostics rows in #panelSound); nothing here is recorded or sent anywhere
   (rule #33): the renderer string stays on the device and leaves it only inside the text the person chooses to copy. */
import { makeMeter, handToSound, looksBluetooth, frameWaitMs, withFrameWait, perMinute, splitLongTasks, isSoftwareGL, STARTUP_MS, rateOf } from './core/latency.js';
import { AC, masterDelayMs } from './audio.js';
import { video, camInfo, modelInfo, visionOpts, setHandsTracked, setModelDelegate, setCamFps } from './vision.js';
import { t } from './i18n.js';

const M=makeMeter();
let on=false, paused=false, shown=false, longOk=false, loafOk=false;
let prevT0=NaN, lastN=-1, vf=null, fresh=0, dup=0, outLabel='', btSeen=false, camStart0=NaN, gpu=null, playFrom=-Infinity;
const camT=[], camN=[], procT=[], longT=[], loafT=[], dupT=[];   // camN: [time, presentedFrames] — what the camera DELIVERS; procT: our new-frame detections
const el=id=>document.getElementById(id);

/* the camera's frame clock: one call per presented camera frame */
function onVF(now, md){
  vf={ now, n:md.presentedFrames, cap:md.captureTime, pres:md.presentationTime, w:md.width, h:md.height };
  camT.push(now); if(camT.length>61) camT.shift();
  camN.push([now, md.presentedFrames]); while(camN.length>2 && now-camN[0][0]>3000) camN.shift();   // the compositor presents every frame, however busy we are
  video.requestVideoFrameCallback(onVF);
}

/* one call per play frame from main.loop: t0 start, tBg after the video background, tDet after detection, tHands after processHands,
   tEnd after the overlays; det = detection ran this frame */
export function latFrame(t0, tBg, tDet, tHands, tEnd, det){
  if(!on||paused) return;
  if(Number.isFinite(prevT0)) M.add('loop', t0-prevT0);
  prevT0=t0;
  M.add('draw', (tBg-t0)+(tEnd-tHands));
  if(!det) return;
  M.add('detect', tDet-tBg); M.add('gestures', tHands-tDet);
  if(vf && vf.n!==lastN){ lastN=vf.n; fresh++; procT.push([t0, fresh]); while(procT.length>2 && t0-procT[0][0]>3000) procT.shift();   // a NEW camera frame: how long since the camera took it / the page got it
    if(Number.isFinite(vf.cap) && vf.cap>0) M.add('camera', tBg-vf.cap);
    M.add('wait', tBg-(Number.isFinite(vf.pres)&&vf.pres>0 ? vf.pres : vf.now)); }
  else { dup++; dupT.push(t0); if(dupT.length>4000) dupT.splice(0, dupT.length-4000); }   // the same camera frame detected again (the loop runs at the display rate)
}
export function latIdle(){ prevT0=NaN; }   // editor/window branch: no camera, no frame interval across it

function audioTick(){
  if(!AC||!AC.getOutputTimestamp) return;
  const o=AC.getOutputTimestamp();   // what the speaker plays now (context time) and when (performance time)
  if(o && o.contextTime>0 && o.performanceTime>0) M.add('pipeline', (AC.currentTime-o.contextTime)*1000-(performance.now()-o.performanceTime));
}
/* long tasks kept: every one of the startup window (bounded: page load + 10 s) and the last minute of the rest */
const pruneLong=L=>{ const cut=performance.now()-60e3, keepTo=camStart0+STARTUP_MS;
  for(let i=L.length-1;i>=0;i--) if(L[i].t<cut && !(L[i].t<keepTo)) L.splice(i,1); };
/* the cause of a long task: the browser's attribution when it names one, else the longest script of the long animation frame around it */
const base=u=>{ try{ return new URL(u).pathname.split('/').pop()||u; }catch(e){ return String(u||''); } };
function causeOf(x){
  if(x.attr) return x.attr;
  const f=loafT.find(a=>a.t<=x.t+1 && a.end>=x.t+x.ms-1); if(!f) return '';
  return f.cause;
}
function watchLong(){
  try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()){ const a=e.attribution&&e.attribution[0];
           const attr= a && a.name && a.name!=='self' && a.name!=='unknown' ? a.name+(a.containerSrc?' '+base(a.containerSrc):'') : '';
           longT.push({ t:e.startTime, ms:e.duration, attr }); }
         pruneLong(longT); }).observe({ type:'longtask', buffered:true }); }
  catch(e){ return false; }
  try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()){ let w=null; for(const s of (e.scripts||[])) if(!w||s.duration>w.duration) w=s;
           const who= w ? (w.invoker||w.sourceFunctionName||w.invokerType||'script')+(w.sourceURL?' ('+base(w.sourceURL)+')':'') : (e.renderStart ? 'rendering' : '');
           loafT.push({ t:e.startTime, end:e.startTime+e.duration, ms:e.duration, cause:who }); }
         pruneLong(loafT); }).observe({ type:'long-animation-frame', buffered:true }); loafOk=true; }
  catch(e){ loafOk=false; }
  return true;
}

/* started once by main.startApp, after the camera and the audio run */
export function latStart(){
  if(on) return; on=true;
  camStart0=camInfo().startT;
  if(video.requestVideoFrameCallback) video.requestVideoFrameCallback(onVF);
  longOk=watchLong();
  setInterval(()=>{ if(!paused) audioTick(); if(shown) render(); }, 500);
  setTimeout(btCheck, 4000);
  try{ navigator.mediaDevices.addEventListener('devicechange', ()=>setTimeout(btCheck, 2000)); }catch(e){}
}

/* the graphics renderer (read once): the unmasked WebGL renderer where the browser gives it, and whether WebGL runs in software — a
   context that refuses `failIfMajorPerformanceCaveat` or a software rasteriser's name. Both throw-away contexts are released. */
function gpuInfo(){
  if(gpu) return gpu;
  const lose=g=>{ try{ const x=g&&g.getExtension('WEBGL_lose_context'); if(x) x.loseContext(); }catch(e){} };
  let renderer='', vendor='', webgl=null, caveat=null;
  try{ const c=document.createElement('canvas'); let g=c.getContext('webgl2'); webgl= g ? 2 : null; if(!g){ g=c.getContext('webgl'); if(g) webgl=1; }
    if(g){
      const d=g.getExtension('WEBGL_debug_renderer_info');
      renderer=String(g.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : g.RENDERER)||''); vendor=String(g.getParameter(d ? d.UNMASKED_VENDOR_WEBGL : g.VENDOR)||'');
      lose(g); }
    const c2=document.createElement('canvas'), g2=c2.getContext('webgl2',{ failIfMajorPerformanceCaveat:true })||c2.getContext('webgl',{ failIfMajorPerformanceCaveat:true });
    caveat= webgl ? !g2 : null; lose(g2); }catch(e){}
  return gpu={ renderer, vendor, webgl, software: webgl ? isSoftwareGL(renderer, caveat) : null };
}

const r1=x=>Number.isFinite(x) ? Math.round(x*10)/10 : null;
const st=k=>{ const s=M.stats(k); return { n:s.n, mean:r1(s.mean), p95:r1(s.p95), jitter:r1(s.jitter), max:r1(s.max) }; };
const msOf=x=>Number.isFinite(x) ? x*1000 : NaN;
export function latReport(){
  const sr=AC?AC.sampleRate:NaN, q=128/sr*1000, base=msOf(AC&&AC.baseLatency), outp=msOf(AC&&AC.outputLatency);
  const fps=rateOf(camN), proc=rateOf(procT);   // LAT1b fix: delivered by the camera vs processed by us (the old «fps» was the latter)
  const stages={}; for(const k of ['camera','wait','detect','gestures','draw','loop','pipeline']) stages[k]=st(k);
  const now=performance.now(), lt=longT.filter(x=>x.t>now-60e3);
  const graph=masterDelayMs();   // SND-F1b: the master path's own delay (0 with our limiter)
  const tot=handToSound({ camera:M.stats('camera').mean, detect:M.stats('detect').mean, gestures:M.stats('gestures').mean, quantumWait:q/2, graph, base, output:outp });
  const w=vf&&vf.w||video.videoWidth, h=vf&&vf.h||video.videoHeight, ci=camInfo(), fw=frameWaitMs(fps);
  const split=splitLongTasks(longT.filter(x=>x.t<camStart0+STARTUP_MS || x.t>=playFrom).map(x=>({ t:x.t, ms:x.ms, cause:causeOf(x) })), camStart0, now);   // «while playing» restarts after a test switch
  const part=p=>({ n:p.n, maxMs:r1(p.maxMs), cause:p.cause });
  return { camera:{ fps:r1(fps), processedFps:r1(proc), size:w&&h?`${w}x${h}`:null, captureTime:stages.camera.n>0, framesDetected:fresh, sameFrameAgain:dup,
                    requested:ci.requested, granted:ci.granted, duplicatesPerMinute:perMinute(dupT, now), frameWaitMs:r1(fw) },
           stages, longTasks: longOk ? { lastMinute:lt.length, maxMs:r1(lt.reduce((a,x)=>Math.max(a,x.ms),0)), totalMs:r1(lt.reduce((a,x)=>a+x.ms,0)),
                                        startup:part(split.startup), playing:part(split.playing), causes:loafOk } : null,
           audio:{ state:AC&&AC.state, sampleRate:sr, quantumMs:q, baseMs:r1(base), outputMs:r1(outp), pipelineMs:stages.pipeline.mean, masterPathMs:r1(graph) },
           output:{ label:outLabel, bluetooth:btSeen }, handToSoundMs:r1(tot.ms), missing:tot.missing,
           handToSoundWithWaitMs:r1(withFrameWait(r1(tot.ms), r1(fw))),
           gpu:gpuInfo(), model:modelInfo(), switches:visionOpts(),
           userAgent:navigator.userAgent };
}
/* the overlay's text (also what «Copy» copies) — numbers, the switches and the graphics renderer's name */
export function latText(r=latReport()){
  const S=r.stages, f=x=>x==null?'—':String(x), L=[t('diag.title')], C=r.camera;
  L.push(t(C.captureTime?'diag.camera':'diag.cameraNoCap', { fps:f(C.fps), proc:f(C.processedFps), size:f(C.size),
    mean:f((C.captureTime?S.camera:S.wait).mean), p95:f((C.captureTime?S.camera:S.wait).p95) }));
  L.push(t('diag.camSet', { rw:f(C.requested.width), rh:f(C.requested.height), rf:C.requested.frameRate==null?t('diag.sw.fpsDef'):f(C.requested.frameRate),
    gw:f(C.granted.width), gh:f(C.granted.height), gf:f(r1(C.granted.frameRate)) }));
  L.push(t('diag.frameWait', { ms:f(C.frameWaitMs) }));
  L.push(t('diag.detect', { mean:f(S.detect.mean), p95:f(S.detect.p95) }));
  L.push(t('diag.dup', { n:f(C.duplicatesPerMinute) }));
  L.push(t('diag.model', { req:r.model.requested, act:r.model.actual==='unknown' ? t('diag.unknown') : r.model.actual==='GPU+CPU' ? t('diag.gpuPart') : r.model.once ? t('diag.cpuOnce') : r.model.actual, hands:f(r.model.hands) }));
  L.push(t('diag.gpu', { name:r.gpu.renderer||t('diag.unknown'), kind:r.gpu.software==null?t('diag.unknown'):t(r.gpu.software?'diag.gpuSoft':'diag.gpuHard') }));
  L.push(t('diag.gestures', { mean:f(S.gestures.mean), p95:f(S.gestures.p95) }));
  L.push(t('diag.draw', { mean:f(S.draw.mean), p95:f(S.draw.p95), loop:f(S.loop.mean) }));
  L.push(t('diag.audio', { base:f(r.audio.baseMs), out:f(r.audio.outputMs), q:f(r1(r.audio.quantumMs)), pipe:f(r.audio.pipelineMs), mp:f(r.audio.masterPathMs) }));
  if(r.longTasks){ const LT=r.longTasks, why=c=>c?t('diag.cause',{ c }):'';
    L.push(t('diag.longStart', { n:LT.startup.n, max:f(LT.startup.maxMs), why:why(LT.startup.cause) }));
    L.push(t('diag.longPlay', { n:LT.playing.n, max:f(LT.playing.maxMs), why:why(LT.playing.cause) })); }
  L.push(t(r.missing.length?'diag.totalPart':'diag.total', { ms:f(r.handToSoundMs), missing:r.missing.join(', ') }));
  L.push(t('diag.totalWait', { ms:f(r.handToSoundWithWaitMs) }));
  if(r.output.bluetooth) L.push(t('diag.bt'));
  return L.join('\n');
}
export function latConsole(){ const r=latReport(); console.log(latText(r)); console.table(r.stages); return r; }

/* ---------- the overlay and its toggle (Sound panel) ---------- */
function render(){ const tx=el('latDiagTx'); if(tx) tx.textContent=latText(); }
export function latShow(v){
  shown=!!v; const box=el('latDiag'); if(box) box.hidden=!shown;
  const a=el('latOn'), b=el('latOff'); if(a&&b){ a.classList.toggle('act',shown); b.classList.toggle('act',!shown); }
  if(shown) render();
}
export const latShown=()=>shown;
{ const a=el('latOn'), b=el('latOff'), c=el('latClose'), cp=el('latCopy');
  if(a) a.onclick=()=>latShow(true);
  if(b) b.onclick=()=>latShow(false);
  if(c) c.onclick=()=>latShow(false);
  if(cp) cp.onclick=()=>{ const done=()=>{ cp.textContent=t('diag.copied'); setTimeout(()=>{ cp.textContent=t('diag.copy'); },1500); };
    try{ navigator.clipboard.writeText(latText()).then(done, ()=>{}); }catch(e){} };
}

/* ---------- LAT1b test switches (Sound panel → Diagnostics): session only, never saved ---------- */
const SW=[ ['swHands2',()=>setHandsTracked(2),o=>o.hands===2], ['swHands1',()=>setHandsTracked(1),o=>o.hands===1],
           ['swModelGPU',()=>setModelDelegate('GPU'),o=>o.delegate==='GPU'], ['swModelCPU',()=>setModelDelegate('CPU'),o=>o.delegate==='CPU'],
           ['swFpsDef',()=>setCamFps(null),o=>o.camFps==null], ['swFps30',()=>setCamFps(30),o=>o.camFps===30], ['swFps60',()=>setCamFps(60),o=>o.camFps===60] ];
let swBusy=null;
export function latSwSync(){ const o=visionOpts(); for(const [id,,is] of SW){ const b=el(id); if(b){ b.classList.toggle('act', is(o)); b.disabled=!!swBusy; } } }
/* one switch press; resolves when it took effect (the probe awaits it); a refusal or failure is shown in the note line */
export async function latSwitch(id){
  const s=SW.find(x=>x[0]===id); if(!s) throw new Error('no switch '+id);
  if(swBusy) await swBusy.catch(()=>{});
  const note=el('swNote');
  swBusy=s[1](); latSwSync(); if(note) note.textContent=t('diag.sw.busy');
  try{ await swBusy; if(note) note.textContent=t('diag.sw.note'); M.reset(); camT.length=0; camN.length=0; procT.length=0; dupT.length=0; prevT0=NaN; playFrom=performance.now(); }   // numbers restart with the new setting
  catch(e){ if(note) note.textContent=t('diag.sw.fail', { msg:(e&&e.message)||String(e) }); throw e; }
  finally{ swBusy=null; latSwSync(); }
}
for(const [id] of SW){ const b=el(id); if(b) b.onclick=()=>{ latSwitch(id).catch(()=>{}); }; }

/* ---------- Bluetooth: no API names it — output latency ≥ 100 ms or a wireless-looking device name; warned once per device ---------- */
async function btCheck(){
  try{ const outs=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput');
       const d=outs.find(x=>x.deviceId==='default')||outs[0]; outLabel=d&&d.label||''; }catch(e){}
  const outp=msOf(AC&&AC.outputLatency), pipe=M.stats('pipeline').mean;
  const ms=Math.max(Number.isFinite(outp)?outp:0, Number.isFinite(pipe)?pipe:0);
  btSeen=looksBluetooth({ outputMs:ms, label:outLabel });
  if(!btSeen) return;
  const key='handsong.btWarned.'+(outLabel||'unnamed');
  try{ if(localStorage.getItem(key)) return; localStorage.setItem(key,'1'); }catch(e){}
  const w=el('latWarn'), tx=el('latWarnTx'), ok=el('latWarnOk'); if(!w||!tx) return;
  tx.textContent=t('lat.btWarn', { ms:Math.round(ms) }); w.classList.add('on');
  const hide=()=>w.classList.remove('on'); if(ok) ok.onclick=hide; setTimeout(hide, 15000);
}

/* probe only: count of samples ever added to a stage; a paused meter (the probe's CONTROL) collects nothing */
export const latCount=stage=>M.count(stage);
export function latPauseDbg(v){ paused=!!v; prevT0=NaN; }
