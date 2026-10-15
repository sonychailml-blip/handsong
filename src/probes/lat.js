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
  { const tx=L.latText(r), keys=['diag.camSet','diag.frameWait','diag.dup','diag.model','diag.gpu','diag.longStart','diag.longPlay','diag.totalWait','diag.path'];
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
  c(r.model && ['GPU','CPU','GPU+CPU'].includes(r.model.actual), `the hand model's real processor unknown («${r.model&&r.model.actual}»)`);
  c(r.model && r.switches && r.model.requested===r.switches.delegate, 'the model request differs from the switch');
  c(r.model && (r.model.actual===r.model.requested || (r.model.requested==='GPU' && r.model.actual==='GPU+CPU')), `the hand model runs on ${r.model&&r.model.actual} though ${r.model&&r.model.requested} was asked`);
  c(Number.isFinite(r.camera&&r.camera.processedFps) && r.camera.processedFps>0 && r.camera.processedFps<=r.camera.fps*1.05+1, `processed ${r.camera&&r.camera.processedFps} fps vs delivered ${r.camera&&r.camera.fps} — we cannot process more new frames than the camera delivers`);
  c(r.audio && r.audio.masterPathMs===0, `the master path delays ${r.audio&&r.audio.masterPathMs} ms (our limiter adds none; 6 ms = the browser limiter is back)`);
  const g=r.camera&&r.camera.granted||{}, q=r.camera&&r.camera.requested||{};
  c(num(g.width)&&g.width>0 && num(g.height)&&g.height>0 && num(g.frameRate)&&g.frameRate>0, `granted camera settings unreadable (${JSON.stringify(g)})`);
  c(q.width===640 && q.height===480 && q.frameRate===(r.switches?r.switches.camFps:undefined), `requested camera settings wrong (${JSON.stringify(q)})`);
  c(Number.isInteger(r.camera&&r.camera.duplicatesPerMinute) && r.camera.duplicatesPerMinute>=0, `duplicates per minute «${r.camera&&r.camera.duplicatesPerMinute}»`);
  c(num(r.camera&&r.camera.frameWaitMs) && Math.abs(r.camera.frameWaitMs-500/r.camera.fps)<=0.06+500/r.camera.fps*0.01, `frame wait ${r.camera&&r.camera.frameWaitMs} ms is not half the frame interval at ${r.camera&&r.camera.fps} fps`);
  c(num(r.handToSoundWithWaitMs) && Math.abs(r.handToSoundWithWaitMs-(r.handToSoundMs+r.camera.frameWaitMs))<=0.11, `the second total ${r.handToSoundWithWaitMs} is not ${r.handToSoundMs} + ${r.camera&&r.camera.frameWaitMs}`);
  const D=r.detection;   // LAT2: where detection runs (the asked path in a browser that has it), with the switches' policy
  c(D && ['main','worker'].includes(D.runs) && r.switches && D.runs===r.switches.path && D.policy===r.switches.hands, `detection path «${D&&D.runs}» / policy «${D&&D.policy}» vs switches ${JSON.stringify(r.switches&&{ path:r.switches.path, hands:r.switches.hands })}`);
  c(r.camera && r.camera.sameFrameAgain===0, `${r.camera&&r.camera.sameFrameAgain} detection(s) of an already processed frame (LAT2: never)`);
  const lt=r.longTasks;
  c(!lt || (lt.startup && Number.isInteger(lt.startup.n) && typeof lt.startup.cause==='string' && lt.playing && Number.isInteger(lt.playing.n)), `long tasks not split into startup / playing (${JSON.stringify(lt&&{ s:lt.startup, p:lt.playing })})`);
  return { cases:n, list };
}

/* ═══ LAT1b — THE TEST SWITCHES (P.checkLatSwitches, quick and all; DRAWN) ═══
   Presses the REAL buttons of Sound → Diagnostics and checks each switch did what it claims, then returns everything to the defaults.
   Headless can show: the model's real processor (MediaPipe's own log lines: XNNPACK only on the CPU path), that the camera was reopened
   with the requested frame rate in its constraints, that detection keeps running after each switch, that the buttons light the active
   setting. It cannot show: a frame rate the fake camera does not obey (it always gives 20 fps), or two hands vs one (no hands in frame) —
   those are the user's steps. LAT2: the three «Hands tracked» values; «Detection runs in» is row «LAT2b worker = main thread, fallback»;
   LAT3: «Low light (test)» is row «LAT3 low light» («Picture» is gone). CONTROL: the read-out from before the CPU switch, offered as the answer to the CPU request, must be flagged. */
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
  const m0=V.modelInfo(); let notes=[];
  cases++; if(m0.actual!=='GPU') miss(`at the default the hand model reads «${m0.actual}» — headless Chrome ran it on GPU when measured (it must never read «unknown» for GPU)`);
  try{
    await press('swModelCPU', o=>o.delegate==='CPU', 'Hand model on: CPU');
    { const m=await waitModel('CPU'); cases++; if(m.actual!=='CPU') miss(`asked for CPU, the read-out says «${m.actual}» (evidence: ${m.evidence.join(' | ')||'none'})`);
      if(m.once) notes.push('a second CPU switch on this page: MediaPipe stays silent; the read-out keeps CPU from its first confirmation'); }
    await detects('model on CPU');
    /* CONTROL: the GPU read-out from before the switch, as the answer to the CPU request, must be flagged by the field check */
    { const r=L.latReport(); cases++; if(!latFieldProblems({ ...r, model:{ requested:'CPU', actual:'GPU', once:false, hands:'2s', evidence:[] } }).list.length) miss('CONTROL: a GPU read-out passed as the answer to a CPU request — the processor check cannot fail'); }
    await press('swModelGPU', o=>o.delegate==='GPU', 'Hand model on: GPU');
    { const m=await waitModel('GPU'); cases++; if(m.actual!=='GPU') miss(`back to GPU, the read-out says «${m.actual}»`); }
    await press('swHands1', o=>o.hands==='1', 'Hands tracked: 1'); await detects('1 hand');
    await press('swHands2', o=>o.hands==='2', 'Hands tracked: 2 · search every frame'); await detects('2, search every frame');
    await press('swHands2s', o=>o.hands==='2s', 'Hands tracked: 2 · search every 3rd frame');
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

/* ═══ LAT3 — LOW LIGHT (P.checkLowLight, quick and all; DRAWN ≈ 12 s) ═══
   (1) The webcam's capabilities reach the report and the Copy text, with the low-light and hands-lost lines; «short exposure» is offered
   exactly when the camera reports manual exposure. (2) The REAL buttons «at least 15 / 24 fps»: either the mode holds with the
   constraints claimed (the set passed to applyConstraints AND the browser's own getConstraints, against literals written here) and a
   verdict that agrees with its measured fps, or it fell back to Off with a reason and today's request back on the track. (3) A simulated
   OverconstrainedError and (4) a simulated «no effect» fall back to Off, say so in the meter and the switch note, and detection keeps
   running. CONTROL (5): with the fall-back disabled the same failure must be flagged by the same check. (6) Hands lost: scripted
   frames through the real latHands (pump held) count exactly one loss for 1·0·1 and none for a hand away 1.3 s. (7) The «Too dark»
   message through its real show path: shown at the frame the core decides, with the fps, lets taps through except OK, OK hides it; a
   camera granted 20 fps shows nothing. The decision itself is checked exactly in node (row «LAT3 low light (core)»). */
const LOW_BASE={ width:{ ideal:640 }, height:{ ideal:480 } };
/* 1/40 s in 100-µs units (250), clamped into the camera's range and snapped to its step — written here independently of the core */
const expUnits=r=>{ let v=Math.min(r.max, Math.max(r.min, 250)); if(r.step>0){ v=r.min+Math.round((v-r.min)/r.step)*r.step; if(v>r.max) v-=r.step; } return +v.toFixed(6); };
function lowProblems(w, mode, C, caps){
  const L=[], fr=x=>x&&x.frameRate, exp=mode==='exposure';
  if(w.mode===mode){
    const want=JSON.stringify(exp ? { ...LOW_BASE, advanced:[{ exposureMode:'manual', exposureTime:expUnits(caps.exposureTime) }] } : { ...LOW_BASE, frameRate:{ min:mode==='fps15'?15:24, ideal:30 } });
    if(JSON.stringify(w.asked)!==want) L.push(`${mode}: asked ${JSON.stringify(w.asked)}, expected ${want}`);
    if(!exp && (!fr(w.applied) || fr(w.applied).min!==(mode==='fps15'?15:24))) L.push(`${mode}: the track's own constraints ${JSON.stringify(w.applied)} lack frameRate.min`);
    if(exp && !JSON.stringify(w.applied||{}).includes('"manual"')) L.push(`exposure: the track's own constraints ${JSON.stringify(w.applied)} lack exposureMode manual`);
    const v=C.lowVerdict({ mode, before:w.before, after:w.after, settings:{ exposureMode:'manual' } });
    if(!v.ok) L.push(`${mode}: kept although its verdict says «${v.why}» (${w.before} → ${w.after} fps)`);
  } else if(w.mode==='off'){
    if(!w.note) L.push(`${mode}: back at Off with no reason in the meter`);
    if(fr(w.applied) && fr(w.applied).min!=null) L.push(`${mode}: back at Off but the track still asks frameRate.min ${fr(w.applied).min}`);
    const back=exp && caps.exposureMode.includes('continuous') ? { ...LOW_BASE, advanced:[{ exposureMode:'continuous' }] } : LOW_BASE;   // Off after exposure hands it back
    if(JSON.stringify(w.asked)!==JSON.stringify(back)) L.push(`${mode}: back at Off with ${JSON.stringify(w.asked)} instead of ${JSON.stringify(back)}`);
  } else L.push(`${mode}: the switch ended in «${w.mode}»`);
  return L;
}
export async function checkLowLight(){
  const L=await import('../latmeter.js'), V=await import('../vision.js'), C=await import('../core/camlight.js');
  const diff=[], miss=s=>diff.push(s), notes=[]; let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id);
  const head=k=>t(k,{}).split('{')[0].replace(/^[\s—·]+/,'').trim().slice(0,16);
  const press=async id=>{ $(id).click(); const t0=performance.now(); await sleep(30); while($(id).disabled && performance.now()-t0<20000) await sleep(50); };
  const detects=async what=>{ const a=L.latCount('detect'); await sleep(900); cases++; if(!(L.latCount('detect')>a)) miss(`after «${what}» hand detection stopped`); };
  cases++; if(JSON.stringify(V.visionOpts())!==JSON.stringify(V.VISION_DEF)) miss(`the switches are not at their defaults (${JSON.stringify(V.visionOpts())})`);
  try{
    /* (1) capabilities, lines, the exposure button */
    const r=L.latReport(), tx=L.latText(r);
    cases++; if(!r.camera.caps || typeof r.camera.caps!=='object') miss('no camera capabilities in the report (getCapabilities)');
    cases++; if(!r.camera.capsText) miss('the capabilities line is empty'); else notes.push('runner camera: '+r.camera.capsText);
    for(const k of ['diag.caps','diag.low','diag.lost']){ cases++; if(!tx.includes(head(k))) miss(`the Copy text has no line «${head(k)}…» (${k})`); }
    cases++; if(!Number.isInteger(r.camera.lostPerMinute)) miss(`hands lost per minute «${r.camera.lostPerMinute}»`);
    cases++; if($('swLowExp').hidden!==!C.exposureSupported(r.camera.caps)) miss(`«short exposure» ${$('swLowExp').hidden?'hidden':'offered'} although the camera ${C.exposureSupported(r.camera.caps)?'has':'lacks'} manual exposure`);
    if(r.longTasks) notes.push(`longest startup task ${r.longTasks.startup.maxMs} ms (${r.longTasks.startup.cause||'no cause'}), began ${r.longTasks.startup.maxAtMs} ms from the camera start; warm-up ${JSON.stringify(r.detection.warmMs)}`);
    /* (6) hands lost through the real latHands, the pump held so no real frame interleaves */
    V.pumpDbg({ hold:true }); await sleep(300);
    { const n0=L.latLostDbg().n, T=performance.now()+5000, f=n=>({ n, action:'track1', ms:1, t0:0, cap:NaN, pres:NaN, vfNow:0, xfer:NaN });
      const feed=(seq,t)=>{ seq.forEach((n,i)=>{ const x=t+i*33; L.latHands({ ...f(n), t0:x, vfNow:x }, x, x+0.1); }); return t+seq.length*33; };
      let t1=feed([1,1,0,1,1], T); cases++; if(L.latLostDbg().n-n0!==1) miss(`hands lost: 1·1·0·1·1 counted ${L.latLostDbg().n-n0}, expected 1`);
      t1=feed([1,...Array(40).fill(0),1,1], t1+100); cases++; if(L.latLostDbg().n-n0!==1) miss(`hands lost: a hand away 1.3 s counted as lost (${L.latLostDbg().n-n0-1})`);
      feed([0,0,0], t1+2000); }
    V.pumpDbg({ hold:false });
    /* (2) the real switches on the runner's camera */
    const caps=r.camera.caps||{}, real=[['swLow15','fps15'],['swLow24','fps24'], ...(C.exposureSupported(caps) ? [['swLowExp','exposure']] : [])];
    if(real.length<3) notes.push('«short exposure» not offered by this camera — not pressed');
    for(const [id,mode] of real){
      await press(id); const w=V.lowInfo(); cases++; const p=lowProblems(w, mode, C, caps); p.forEach(miss);
      notes.push(`${mode}: ${w.mode==='off' ? 'fell back to Off — '+w.note : 'held'} (camera ${w.before} → ${w.after} fps)`);
      await detects(mode);
      await press('swLowOff'); cases++; if(V.visionOpts().low!=='off') miss(`«Off» did not take effect after ${mode}`); }
    /* (3) a simulated OverconstrainedError, (4) a simulated no-effect */
    for(const [o,id,mode,want] of [[{ fail:'OverconstrainedError' },'swLow24','fps24','OverconstrainedError'],[{ fakeFps:3 },'swLow15','fps15','noeffect']]){
      V.lowDbg(o); await press(id); V.lowDbg({ reset:true });
      const w=V.lowInfo(); cases++; if(w.mode!=='off' || !String(w.note).includes(want)) miss(`simulated ${want}: mode «${w.mode}», reason «${w.note}» — expected a fall-back to Off naming it`);
      lowProblems(w, mode, C, caps).forEach(miss);
      cases++; if(!L.latText().includes(head('diag.lowBack'))) miss(`simulated ${want}: the meter does not say «${head('diag.lowBack')}»`);
      cases++; if(!$('swNote').textContent.includes(head('diag.lowBack'))) miss(`simulated ${want}: the switch note does not say it fell back («${$('swNote').textContent}»)`);
      await detects('fall-back from '+want); }
    /* (5) CONTROL: no fall-back — the same check must flag it */
    V.lowDbg({ fail:'OverconstrainedError', noFallback:true }); await press('swLow15'); V.lowDbg({ reset:true });
    { const w=V.lowInfo(); cases++; if(!(w.mode!=='off' || !w.note)) miss('CONTROL: with the fall-back disabled the switch still came back to Off with a reason — the check cannot fail'); }
    await press('swLowOff');
    /* (7) the «Too dark» message */
    { const ts=Array.from({ length:40 },(_,i)=>i*1000/6), g=L.darkDbg(ts, 30), box=$('darkHint');
      const want=(()=>{ const st=C.darkNew(); return ts.findIndex(x=>C.darkStep(st, x, { granted:30 })); })();
      cases++; if(g.at!==want || g.at<0) miss(`«Too dark» at frame ${g.at}, the core decides ${want}`);
      cases++; if(!box.classList.contains('on') || !$('darkHintTx').textContent.includes('6')) miss(`«Too dark» not shown with its fps («${$('darkHintTx').textContent}»)`);
      cases++; if(getComputedStyle(box).pointerEvents!=='none' || getComputedStyle($('darkHintOk')).pointerEvents==='none') miss('«Too dark» catches taps on the stage (or its OK does not)');
      $('darkHintOk').click(); cases++; if(box.classList.contains('on')) miss('OK did not hide «Too dark»');
      const g2=L.darkDbg(ts, 20); cases++; if(g2.at!==-1 || box.classList.contains('on')) miss('«Too dark» shown for a camera granted only 20 fps'); }
  } finally {
    V.lowDbg({ reset:true }); V.pumpDbg({ hold:false }); L.darkHideDbg();
    if(V.visionOpts().low!=='off') await V.setLowLight('off').catch(e=>miss('restore: '+e.message));
    L.latSwSync();
  }
  cases++; if(JSON.stringify(V.visionOpts())!==JSON.stringify(V.VISION_DEF)) miss(`the switches did not return to their defaults (${JSON.stringify(V.visionOpts())})`);
  return { cases, total:diff.length, differences:diff, notes };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:580, name:'LAT1 latency meter', run:()=>checkLatency(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:581, name:'LAT1b test switches', run:()=>checkLatSwitches(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:585, name:'LAT3 low light', run:()=>checkLowLight(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
