/* PROBE1: LAT1 latency meter probe. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { row } from './rows.js';
/* ═══ LAT1 — THE LATENCY METER (P.checkLatency, quick and all; DRAWN — it needs frames) ═══
   The meter collects while the app plays: frame-loop and detection samples keep arriving (the runner's fake camera has frames, no hands);
   the report's numbers are present and plausible; the audio block is exactly 128 frames; the overlay shows numbers through the REAL
   Sound-panel buttons and hides again. CONTROL: a paused meter must add nothing — the liveness check must be able to fail. The pure
   statistics are checked exactly in node (row «LAT1 latency stats (core)» of tools/probe-data.mjs). */
export async function checkLatency(){
  const L=await import('../latmeter.js'), diff=[], miss=s=>diff.push(s); let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const n0=L.latCount('detect'), l0=L.latCount('loop'); await sleep(800);
  const n1=L.latCount('detect'), l1=L.latCount('loop');
  cases++; if(!(l1>l0)) miss(`the frame loop added no samples in 0.8 s (${l0} → ${l1})`);
  cases++; if(!(n1>n0)) miss(`hand detection added no samples in 0.8 s (${n0} → ${n1}) — is the camera running?`);
  const r=L.latReport();
  const plaus=(name,v,lo,hi)=>{ cases++; if(!(Number.isFinite(v)&&v>=lo&&v<=hi)) miss(`${name} = ${v}, outside ${lo}…${hi}`); };
  plaus('camera frames per second', r.camera.fps, 1, 240);
  plaus('hand detection, mean ms', r.stages.detect.mean, 0.01, 2000);
  plaus('gestures, mean ms', r.stages.gestures.mean, 0, 200);
  plaus('frame interval, mean ms', r.stages.loop.mean, 2, 2000);
  plaus('audio base latency ms', r.audio.baseMs, 0, 500);
  plaus('audio output latency ms', r.audio.outputMs, 0, 2000);
  plaus('hand → sound estimate ms', r.handToSoundMs, 0.5, 5000);
  cases++; if(r.audio.quantumMs!==128/r.audio.sampleRate*1000) miss(`audio block ${r.audio.quantumMs} ms is not 128 frames at ${r.audio.sampleRate} Hz`);
  cases++; if(!/^\d+x\d+$/.test(r.camera.size||'')) miss(`camera size «${r.camera.size}» unreadable`);
  L.latPauseDbg(true);   // CONTROL
  try{ const a=L.latCount('detect'), b=L.latCount('loop'); await sleep(500); cases++;
    if(L.latCount('detect')!==a||L.latCount('loop')!==b) miss('CONTROL: a paused meter still collected — the liveness check cannot fail'); }
  finally{ L.latPauseDbg(false); }
  const on=document.getElementById('latOn'), off=document.getElementById('latOff'), box=document.getElementById('latDiag'), was=L.latShown();
  try{
    on.click(); await sleep(700); cases++;
    if(box.hidden || !/\d/.test(box.textContent) || !/→/.test(box.textContent)) miss(`«Latency meter: On» did not show the numbers (overlay ${box.hidden?'hidden':'«'+box.textContent.slice(0,60)+'»'})`);
    off.click(); cases++; if(!box.hidden) miss('«Off» left the overlay visible');
  } finally { L.latShow(was); }
  return { cases, total:diff.length, differences:diff, report:r };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:580, name:'LAT1 latency meter', run:()=>checkLatency(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
