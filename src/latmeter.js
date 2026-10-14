/* LAT1 — the latency meter, browser side. Measures, never changes what it measures: timestamps through the frame (main.loop calls
   latFrame), the camera's own frame clock (requestVideoFrameCallback: capture and presentation times where the browser reports them),
   the audio output (baseLatency, outputLatency, getOutputTimestamp), long tasks on the main thread. Feeds the pure meter of
   core/latency.js. Shows: the Diagnostics overlay (Sound panel → «Latency meter»), the console `R.latency()`, a one-time Bluetooth warning.
   UI-level module (owns its DOM: #latDiag, #latWarn, the toggle in #panelSound); nothing here is recorded or sent anywhere (rule #33). */
import { makeMeter, handToSound, looksBluetooth } from './core/latency.js';
import { AC } from './audio.js';
import { video } from './vision.js';
import { t } from './i18n.js';

const M=makeMeter();
let on=false, paused=false, shown=false, longOk=false;
let prevT0=NaN, lastN=-1, vf=null, fresh=0, dup=0, outLabel='', btSeen=false;
const camT=[], longT=[];
const el=id=>document.getElementById(id);

/* the camera's frame clock: one call per presented camera frame */
function onVF(now, md){
  vf={ now, n:md.presentedFrames, cap:md.captureTime, pres:md.presentationTime, w:md.width, h:md.height };
  camT.push(now); if(camT.length>61) camT.shift();
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
  if(vf && vf.n!==lastN){ lastN=vf.n; fresh++;   // a NEW camera frame: how long since the camera took it / the page got it
    if(Number.isFinite(vf.cap) && vf.cap>0) M.add('camera', tBg-vf.cap);
    M.add('wait', tBg-(Number.isFinite(vf.pres)&&vf.pres>0 ? vf.pres : vf.now)); }
  else dup++;   // the same camera frame detected again (the loop runs at the display rate)
}
export function latIdle(){ prevT0=NaN; }   // editor/window branch: no camera, no frame interval across it

function audioTick(){
  if(!AC||!AC.getOutputTimestamp) return;
  const o=AC.getOutputTimestamp();   // what the speaker plays now (context time) and when (performance time)
  if(o && o.contextTime>0 && o.performanceTime>0) M.add('pipeline', (AC.currentTime-o.contextTime)*1000-(performance.now()-o.performanceTime));
}
function watchLong(){
  try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()) longT.push({ t:e.startTime, ms:e.duration });
         const cut=performance.now()-60e3; while(longT.length && longT[0].t<cut) longT.shift(); }).observe({ type:'longtask', buffered:true });
       return true; }catch(e){ return false; }
}

/* started once by main.startApp, after the camera and the audio run */
export function latStart(){
  if(on) return; on=true;
  if(video.requestVideoFrameCallback) video.requestVideoFrameCallback(onVF);
  longOk=watchLong();
  setInterval(()=>{ if(!paused) audioTick(); if(shown) render(); }, 500);
  setTimeout(btCheck, 4000);
  try{ navigator.mediaDevices.addEventListener('devicechange', ()=>setTimeout(btCheck, 2000)); }catch(e){}
}

const r1=x=>Number.isFinite(x) ? Math.round(x*10)/10 : null;
const st=k=>{ const s=M.stats(k); return { n:s.n, mean:r1(s.mean), p95:r1(s.p95), jitter:r1(s.jitter), max:r1(s.max) }; };
const msOf=x=>Number.isFinite(x) ? x*1000 : NaN;
export function latReport(){
  const sr=AC?AC.sampleRate:NaN, q=128/sr*1000, base=msOf(AC&&AC.baseLatency), outp=msOf(AC&&AC.outputLatency);
  const fps= camT.length>1 ? (camT.length-1)/((camT[camT.length-1]-camT[0])/1000) : NaN;
  const stages={}; for(const k of ['camera','wait','detect','gestures','draw','loop','pipeline']) stages[k]=st(k);
  const now=performance.now(), lt=longT.filter(x=>x.t>now-60e3);
  const tot=handToSound({ camera:M.stats('camera').mean, detect:M.stats('detect').mean, gestures:M.stats('gestures').mean, quantumWait:q/2, base, output:outp });
  const w=vf&&vf.w||video.videoWidth, h=vf&&vf.h||video.videoHeight;
  return { camera:{ fps:r1(fps), size:w&&h?`${w}x${h}`:null, captureTime:stages.camera.n>0, framesDetected:fresh, sameFrameAgain:dup },
           stages, longTasks: longOk ? { lastMinute:lt.length, maxMs:r1(lt.reduce((a,x)=>Math.max(a,x.ms),0)), totalMs:r1(lt.reduce((a,x)=>a+x.ms,0)) } : null,
           audio:{ state:AC&&AC.state, sampleRate:sr, quantumMs:q, baseMs:r1(base), outputMs:r1(outp), pipelineMs:stages.pipeline.mean },
           output:{ label:outLabel, bluetooth:btSeen }, handToSoundMs:r1(tot.ms), missing:tot.missing,
           userAgent:navigator.userAgent };
}
/* the overlay's text (also what «Copy» copies) — numbers only */
export function latText(r=latReport()){
  const S=r.stages, f=x=>x==null?'—':String(x), L=[t('diag.title')];
  L.push(t(r.camera.captureTime?'diag.camera':'diag.cameraNoCap', { fps:f(r.camera.fps), size:f(r.camera.size),
    mean:f((r.camera.captureTime?S.camera:S.wait).mean), p95:f((r.camera.captureTime?S.camera:S.wait).p95) }));
  L.push(t('diag.detect', { mean:f(S.detect.mean), p95:f(S.detect.p95) }));
  L.push(t('diag.gestures', { mean:f(S.gestures.mean), p95:f(S.gestures.p95) }));
  L.push(t('diag.draw', { mean:f(S.draw.mean), p95:f(S.draw.p95), loop:f(S.loop.mean) }));
  L.push(t('diag.audio', { base:f(r.audio.baseMs), out:f(r.audio.outputMs), q:f(r1(r.audio.quantumMs)), pipe:f(r.audio.pipelineMs) }));
  if(r.longTasks) L.push(t('diag.long', { n:r.longTasks.lastMinute, max:f(r.longTasks.maxMs) }));
  L.push(t(r.missing.length?'diag.totalPart':'diag.total', { ms:f(r.handToSoundMs), missing:r.missing.join(', ') }));
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
