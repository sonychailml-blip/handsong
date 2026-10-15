/* PROBE1: LAT1 latency meter probe. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { row } from './rows.js';
import { t } from '../i18n.js';
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
  /* LAT1b: the new fields are present and consistent; CONTROL: a report missing one must be flagged by the same check */
  const fp=latFieldProblems(r); cases+=fp.cases; fp.list.forEach(miss);
  for(const [what,cut] of [['the graphics renderer',x=>{ x.gpu={ ...x.gpu, renderer:'' }; }],['the second total',x=>{ x.handToSoundWithWaitMs=null; }],
                           ['the startup long tasks',x=>{ x.longTasks={ ...x.longTasks, startup:undefined }; }],['the granted camera settings',x=>{ x.camera={ ...x.camera, granted:{} }; }]]){
    const bad={ ...r }; cut(bad); cases++; if(!latFieldProblems(bad).list.length) miss(`CONTROL: a report without ${what} passed the field check — the check cannot fail`); }
  { const tx=L.latText(r), keys=['diag.camSet','diag.frameWait','diag.dup','diag.model','diag.gpu','diag.longStart','diag.longPlay','diag.totalWait'];
    for(const k of keys){ cases++; const head=t(k,{}).split('{')[0].trim().slice(0,18); if(head && !tx.includes(head)) miss(`the meter text has no line «${head}…» (${k})`); } }
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

/* LAT1b: the new report fields — present, typed and consistent with each other. Returns { cases, list } (list empty = fine). */
function latFieldProblems(r){
  const list=[], c=(ok,why)=>{ n++; if(!ok) list.push(why); }; let n=0;
  const num=x=>typeof x==='number' && Number.isFinite(x);
  c(r.gpu && typeof r.gpu.renderer==='string' && r.gpu.renderer.length>0, `graphics renderer «${r.gpu&&r.gpu.renderer}» missing`);
  c(r.gpu && typeof r.gpu.software==='boolean', `graphics hardware/software unknown (${r.gpu&&r.gpu.software})`);
  const once=!!(r.model && r.model.actual==='unknown' && r.model.once);   // the XNNPACK line was already used up on this page (TFLite prints it once)
  c(r.model && (r.model.actual==='GPU'||r.model.actual==='CPU'||once), `the hand model's real processor unknown («${r.model&&r.model.actual}»)`);
  c(r.model && r.switches && r.model.requested===r.switches.delegate, 'the model request differs from the switch');
  c(r.model && (r.model.actual===r.model.requested || once), `the hand model runs on ${r.model&&r.model.actual} though ${r.model&&r.model.requested} was asked`);
  const g=r.camera&&r.camera.granted||{}, q=r.camera&&r.camera.requested||{};
  c(num(g.width)&&g.width>0 && num(g.height)&&g.height>0 && num(g.frameRate)&&g.frameRate>0, `granted camera settings unreadable (${JSON.stringify(g)})`);
  c(q.width===640 && q.height===480 && q.frameRate===(r.switches?r.switches.camFps:undefined), `requested camera settings wrong (${JSON.stringify(q)})`);
  c(Number.isInteger(r.camera&&r.camera.duplicatesPerMinute) && r.camera.duplicatesPerMinute>=0, `duplicates per minute «${r.camera&&r.camera.duplicatesPerMinute}»`);
  c(num(r.camera&&r.camera.frameWaitMs) && Math.abs(r.camera.frameWaitMs-500/r.camera.fps)<=0.06+500/r.camera.fps*0.01, `frame wait ${r.camera&&r.camera.frameWaitMs} ms is not half the frame interval at ${r.camera&&r.camera.fps} fps`);
  c(num(r.handToSoundWithWaitMs) && Math.abs(r.handToSoundWithWaitMs-(r.handToSoundMs+r.camera.frameWaitMs))<=0.11, `the second total ${r.handToSoundWithWaitMs} is not ${r.handToSoundMs} + ${r.camera&&r.camera.frameWaitMs}`);
  const lt=r.longTasks;
  c(!lt || (lt.startup && Number.isInteger(lt.startup.n) && typeof lt.startup.cause==='string' && lt.playing && Number.isInteger(lt.playing.n)), `long tasks not split into startup / playing (${JSON.stringify(lt&&{ s:lt.startup, p:lt.playing })})`);
  return { cases:n, list };
}

/* ═══ LAT1b — THE TEST SWITCHES (P.checkLatSwitches, quick and all; DRAWN) ═══
   Presses the REAL buttons of Sound → Diagnostics and checks each switch did what it claims, then returns everything to the defaults.
   Headless can show: the model's real processor (MediaPipe's own log lines: XNNPACK only on the CPU path), that the camera was reopened
   with the requested frame rate in its constraints, that detection keeps running after each switch, that the buttons light the active
   setting. It cannot show: a frame rate the fake camera does not obey (it always gives 20 fps), or two hands vs one (no hands in frame) —
   those are the user's steps. CONTROL: the read-out from before the CPU switch, offered as the answer to the CPU request, must be flagged. */
export async function checkLatSwitches(){
  const L=await import('../latmeter.js'), V=await import('../vision.js'), diff=[], miss=s=>diff.push(s); let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id);
  const press=async(id,ok,what)=>{ $(id).click(); const t0=performance.now();
    while(!ok(V.visionOpts()) && performance.now()-t0<20000) await sleep(50);
    while($(id).disabled && performance.now()-t0<20000) await sleep(50);   // the switch finished (buttons enabled again)
    cases++; if(!ok(V.visionOpts())) miss(`«${what}» did not take effect within 20 s (${JSON.stringify(V.visionOpts())})`);
    cases++; if(!$(id).classList.contains('act')) miss(`«${what}»: its button is not lit`); };
  const detects=async what=>{ const a=L.latCount('detect'); await sleep(900); cases++; if(!(L.latCount('detect')>a)) miss(`after «${what}» hand detection stopped (no samples in 0.9 s)`); };
  const waitModel=async want=>{ let m=V.modelInfo(); const t0=performance.now(); while(m.actual!==want && performance.now()-t0<5000){ await sleep(100); m=V.modelInfo(); } return m; };
  const D=V.VISION_DEF, o0=V.visionOpts();
  cases++; if(JSON.stringify(o0)!==JSON.stringify(D)) miss(`the switches are not at their defaults before the row (${JSON.stringify(o0)}) — a previous run leaked`);
  const m0=V.modelInfo(), first=!m0.once; let notes=[];   // `first`: no CPU switch on this page yet — the processor read-out can prove CPU
  cases++; if(first ? m0.actual!=='GPU' : m0.actual==='CPU') miss(`at the default the hand model reads «${m0.actual}» — headless Chrome ran it on GPU when measured`);
  try{
    await press('swModelCPU', o=>o.delegate==='CPU', 'Hand model on: CPU');
    { const m=await waitModel('CPU'); cases++;
      if(first){ if(m.actual!=='CPU') miss(`asked for CPU, MediaPipe reports «${m.actual}» (evidence: ${m.evidence.join(' | ')||'none'})`); }
      else { if(m.actual==='GPU') miss('asked for CPU, the read-out says GPU'); notes.push('second CPU switch on this page: MediaPipe stays silent, the read-out says «unknown» (the first switch per page is checked exactly)'); } }
    await detects('model on CPU');
    /* CONTROL: the GPU read-out from before the switch, as the answer to the CPU request, must be flagged by the field check */
    { const r=L.latReport(); cases++; if(!latFieldProblems({ ...r, model:{ requested:'CPU', actual:'GPU', once:false, hands:2, evidence:[] } }).list.length) miss('CONTROL: a GPU read-out passed as the answer to a CPU request — the processor check cannot fail'); }
    await press('swModelGPU', o=>o.delegate==='GPU', 'Hand model on: GPU');
    { const m=await waitModel('GPU'); cases++; if(!(m.actual==='GPU' || (m.actual==='unknown' && m.once))) miss(`back to GPU, the read-out says «${m.actual}»`); }
    await press('swHands1', o=>o.hands===1, 'Hands tracked: 1'); await detects('1 hand');
    await press('swHands2', o=>o.hands===2, 'Hands tracked: 2');
    for(const f of [30,60]){ const s0=V.camInfo().startT;
      await press('swFps'+f, o=>o.camFps===f, `Camera frame rate: ${f}`);
      const ci=V.camInfo(); cases++; if(ci.requested.frameRate!==f || !(ci.startT>s0)) miss(`frame rate ${f}: the camera was not reopened with it (requested ${ci.requested.frameRate}, start ${s0} → ${ci.startT})`);
      cases++; if(!(ci.granted.frameRate>0)) miss(`frame rate ${f}: no granted frame rate`);
      await detects(`camera ${f} fps`); }
    await press('swFpsDef', o=>o.camFps==null, 'Camera frame rate: default');
    { const ci=V.camInfo(); cases++; if(ci.requested.frameRate!==null) miss('back to the default the camera still requests a frame rate'); }
    await detects('camera default');
  } finally {
    const o=V.visionOpts();
    if(o.delegate!==D.delegate) await V.setModelDelegate(D.delegate).catch(e=>miss('restore: '+e.message));
    if(o.hands!==D.hands) await V.setHandsTracked(D.hands).catch(e=>miss('restore: '+e.message));
    if(o.camFps!==D.camFps) await V.setCamFps(D.camFps).catch(e=>miss('restore: '+e.message));
    L.latSwSync();
  }
  cases++; if(JSON.stringify(V.visionOpts())!==JSON.stringify(D)) miss(`the switches did not return to their defaults (${JSON.stringify(V.visionOpts())})`);
  return { cases, total:diff.length, differences:diff, notes };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:580, name:'LAT1 latency meter', run:()=>checkLatency(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:581, name:'LAT1b test switches', run:()=>checkLatSwitches(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
