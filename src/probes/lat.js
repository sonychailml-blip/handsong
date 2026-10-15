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
   constraints claimed (the set passed to applyConstraints, against literals written here, AND the calls that went through: format and
   camera controls in separate calls — CAM-FIX) and a
   verdict that agrees with its measured fps, or it fell back to Off with a reason and today's request back on the track. (3) A simulated
   OverconstrainedError and (4) a simulated «no effect» fall back to Off, say so in the meter and the switch note, and detection keeps
   running. CONTROL (5): with the fall-back disabled the same failure must be flagged by the same check. (6) Hands lost: scripted
   frames through the real latHands (pump held) count exactly one loss for 1·0·1 and none for a hand away 1.3 s. (7) The «Too dark»
   message through its real show path: shown at the frame the core decides, with the fps, lets taps through except OK, OK hides it; a
   camera granted 20 fps shows nothing. The decision itself is checked exactly in node (row «LAT3 low light (core)»). */
const LOW_BASE={ width:{ ideal:640 }, height:{ ideal:480 } };
/* 1/40 s in 100-µs units (250), clamped into the camera's range and snapped to its step — written here independently of the core */
const expUnits=r=>{ let v=Math.min(r.max, Math.max(r.min, 250)); if(r.step>0){ v=r.min+Math.round((v-r.min)/r.step)*r.step; if(v>r.max) v-=r.step; } return +v.toFixed(6); };
/* CAM-FIX: Chrome keeps reporting the last camera-control set in getConstraints() and ignores the format part of a set that holds a
   camera control (measured), so the evidence is the calls themselves: `calls` = every applyConstraints of the press { c, ok }. */
const FMT=['width','height','frameRate','aspectRatio','resizeMode'];
const isFmt=c=>!c.advanced, isCtl=c=>!!c.advanced && !FMT.some(k=>k in c);
function lowProblems(w, mode, C, caps, calls){
  const L=[], exp=mode==='exposure', okc=calls.filter(x=>x.ok).map(x=>x.c);
  if(w.mode===mode){
    const want=JSON.stringify(exp ? { ...LOW_BASE, advanced:[{ exposureMode:'manual', exposureTime:expUnits(caps.exposureTime) }] } : { ...LOW_BASE, frameRate:{ min:mode==='fps15'?15:24, ideal:30 } });
    if(JSON.stringify(w.asked)!==want) L.push(`${mode}: asked ${JSON.stringify(w.asked)}, expected ${want}`);
    if(!exp && !okc.some(c=>isFmt(c) && c.frameRate && c.frameRate.min===(mode==='fps15'?15:24))) L.push(`${mode}: no format-only call with frameRate.min went through (${JSON.stringify(calls)})`);
    if(exp && !okc.some(c=>isCtl(c) && c.advanced.some(e=>e.exposureMode==='manual'))) L.push(`exposure: no controls-only call with manual exposure went through (${JSON.stringify(calls)})`);
    const v=C.lowVerdict({ mode, before:w.before, after:w.after, settings:{ exposureMode:'manual' } });
    if(!v.ok) L.push(`${mode}: kept although its verdict says «${v.why}» (${w.before} → ${w.after} fps)`);
  } else if(w.mode==='off'){
    if(!w.note) L.push(`${mode}: back at Off with no reason in the meter`);
    const last=okc.filter(isFmt).pop();
    if(!last || (last.frameRate && last.frameRate.min!=null)) L.push(`${mode}: back at Off but no format-only call without frameRate.min went through (${JSON.stringify(calls)})`);
    const auto=['exposureMode','whiteBalanceMode'].filter(k=>Array.isArray(caps[k]) && caps[k].includes('continuous')).map(k=>({ [k]:'continuous' }));
    const back=auto.length ? { ...LOW_BASE, advanced:auto } : LOW_BASE;   // CAM-FIX: every Off hands exposure and white balance back to the camera
    if(JSON.stringify(w.asked)!==JSON.stringify(back)) L.push(`${mode}: back at Off with ${JSON.stringify(w.asked)} instead of ${JSON.stringify(back)}`);
    if(auto.length && !okc.some(c=>isCtl(c) && c.advanced.some(e=>e.exposureMode==='continuous'))) L.push(`${mode}: back at Off but no controls-only call handed exposure back (${JSON.stringify(calls)})`);
  } else L.push(`${mode}: the switch ended in «${w.mode}»`);
  return L;
}
export async function checkLowLight(){
  const L=await import('../latmeter.js'), V=await import('../vision.js'), C=await import('../core/camlight.js');
  const diff=[], miss=s=>diff.push(s), notes=[]; let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id);
  const head=k=>t(k,{}).split('{')[0].replace(/^[\s—·]+/,'').trim().slice(0,16);
  const calls=[], AP=MediaStreamTrack.prototype.applyConstraints;   // CAM-FIX: every applyConstraints of a press
  MediaStreamTrack.prototype.applyConstraints=async function(c){ const e={ c:JSON.parse(JSON.stringify(c||{})), ok:false }; calls.push(e); const r=await AP.call(this, c); e.ok=true; return r; };
  const press=async id=>{ calls.length=0; $(id).click(); const t0=performance.now(); await sleep(30); while($(id).disabled && performance.now()-t0<20000) await sleep(50); };
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
      feed([0], T-1500);   // a defined start: no hand, any earlier gap expired (the last real frame may still carry a scripted 2 — LAT2a)
      let t1=feed([1,1,0,1,1], T); cases++; if(L.latLostDbg().n-n0!==1) miss(`hands lost: 1·1·0·1·1 counted ${L.latLostDbg().n-n0}, expected 1`);
      t1=feed([1,...Array(40).fill(0),1,1], t1+100); cases++; if(L.latLostDbg().n-n0!==1) miss(`hands lost: a hand away 1.3 s counted as lost (${L.latLostDbg().n-n0-1})`);
      feed([0,0,0], t1+2000); }
    V.pumpDbg({ hold:false });
    /* (2) the real switches on the runner's camera */
    const caps=r.camera.caps||{}, real=[['swLow15','fps15'],['swLow24','fps24'], ...(C.exposureSupported(caps) ? [['swLowExp','exposure']] : [])];
    if(real.length<3) notes.push('«short exposure» not offered by this camera — not pressed');
    for(const [id,mode] of real){
      await press(id); const w=V.lowInfo(); cases++; const p=lowProblems(w, mode, C, caps, calls); p.forEach(miss);
      notes.push(`${mode}: ${w.mode==='off' ? 'fell back to Off — '+w.note : 'held'} (camera ${w.before} → ${w.after} fps)`);
      await detects(mode);
      await press('swLowOff'); cases++; if(V.visionOpts().low!=='off') miss(`«Off» did not take effect after ${mode}`); }
    /* (3) a simulated OverconstrainedError, (4) a simulated no-effect */
    for(const [o,id,mode,want] of [[{ fail:'OverconstrainedError' },'swLow24','fps24','OverconstrainedError'],[{ fakeFps:3 },'swLow15','fps15','noeffect']]){
      V.lowDbg(o); await press(id); V.lowDbg({ reset:true });
      const w=V.lowInfo(); cases++; if(w.mode!=='off' || !String(w.note).includes(want)) miss(`simulated ${want}: mode «${w.mode}», reason «${w.note}» — expected a fall-back to Off naming it`);
      lowProblems(w, mode, C, caps, calls).forEach(miss);
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
    MediaStreamTrack.prototype.applyConstraints=AP;
    V.lowDbg({ reset:true }); V.pumpDbg({ hold:false }); L.darkHideDbg();
    if(V.visionOpts().low!=='off') await V.setLowLight('off').catch(e=>miss('restore: '+e.message));
    L.latSwSync();
  }
  cases++; if(JSON.stringify(V.visionOpts())!==JSON.stringify(V.VISION_DEF)) miss(`the switches did not return to their defaults (${JSON.stringify(V.visionOpts())})`);
  return { cases, total:diff.length, differences:diff, notes };
}

/* ═══ /* CAM-FIX — THE WEBCAM'S OWN SETTINGS COME BACK (P.checkCamRestore, quick and all; DRAWN ≈ 6 s) ═══
   The user's webcam stayed dark (in Zoom too) after «short exposure»: a UVC webcam keeps exposure / white balance IN THE DEVICE. The
   runner's fake camera cannot show it (it always reads 'manual' and forgets everything on reopen), so a SIMULATED UVC device — the user's
   ASUS capabilities, controls that persist across opens, Chrome's refusal of an unknown key — is wrapped around the real track
   (vision.camSimDbg). Through the REAL buttons: (A) short exposure really sets manual, Off brings automatic exposure and white balance
   and every other control back and the meter says so; (B) the user's likely path short exposure → 15 fps → Off; (C) a fall-back to Off
   restores too; (D) a touched value without an automatic mode returns to its original; (H) leaving the page (pagehide) ends the test and
   restores and (0b) releases the camera; (F) 0a: a camera left in manual mode by a test of ours (its record in localStorage, the page
   «crashed» before its restore) is restored at the next open and the record cleared, the meter says so; a manual setting WITHOUT our record
   (the person's own, from another app) stays as it is; (I) the warning line under the switch. CONTROLS that must be flagged: (E) the pre-fix
   Off, (G) an open without the repair, (J) the pre-0a heal of every manual mode. */
function uvcSim(){
  const caps={ exposureMode:['continuous','manual'], exposureTime:{ min:39.063, max:1250, step:39.063 }, whiteBalanceMode:['continuous','manual'],
    colorTemperature:{ min:2800, max:6500, step:1 }, brightness:{ min:-64, max:64, step:1 } };
  const dev={ exposureMode:'continuous', exposureTime:156.25, whiteBalanceMode:'continuous', colorTemperature:4600, brightness:0 };
  const BASIC=['width','height','frameRate','aspectRatio','resizeMode','facingMode','deviceId'];
  const fits=(k,v)=>{ const c=caps[k]; return Array.isArray(c) ? c.includes(v) : !!c && typeof v==='number' && v>=c.min && v<=c.max; };
  const S={ caps, dev, cons:{}, format:null, wrap(tr){ return {
    kind:'video', label:'simulated UVC webcam', get readyState(){ return tr.readyState; },
    getCapabilities:()=>({ ...tr.getCapabilities(), ...caps }), getSettings:()=>({ ...tr.getSettings(), ...dev }), getConstraints:()=>S.cons,
    async applyConstraints(c={}){   // like Chrome: a set with a camera control applies ONLY the controls; one without changes the format
      for(const e of c.advanced||[]) for(const k in e) if(!(k in caps) && !BASIC.includes(k)){ const x=new Error('Unsupported constraint'); x.name='OverconstrainedError'; throw x; }
      if(!(c.advanced||[]).some(e=>Object.keys(e).some(k=>k in caps))){ await tr.applyConstraints(c); S.format=JSON.parse(JSON.stringify(c)); S.cons=S.format; return; }
      for(const e of c.advanced||[]){ if(!Object.entries(e).every(([k,v])=>fits(k,v))) continue;   // an advanced entry is all or nothing
        Object.assign(dev, e); if('exposureTime' in e && !('exposureMode' in e)) dev.exposureMode='manual'; if('colorTemperature' in e && !('whiteBalanceMode' in e)) dev.whiteBalanceMode='manual'; }
      S.cons=JSON.parse(JSON.stringify(c)); },
    stop(){ tr.stop(); } }; } };
  return S;
}
export async function checkCamRestore(){
  const L=await import('../latmeter.js'), V=await import('../vision.js'), ST=await import('../state.js');
  const diff=[], miss=s=>diff.push(s), notes=[]; let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id);
  const press=async id=>{ $(id).click(); const t0=performance.now(); await sleep(30); while($(id).disabled && performance.now()-t0<20000) await sleep(50); };
  const sim=uvcSim(), dev0={ ...sim.dev }, AUTO=['exposureMode','whiteBalanceMode'];
  /* restored = automatic modes and every other control at its original (a value an automatic mode drives is the camera's own) */
  const GOV={ exposureTime:'exposureMode', colorTemperature:'whiteBalanceMode' };   // under its automatic mode the camera chooses the value
  const restored=what=>{ const bad=Object.keys(dev0).filter(k=>!(GOV[k] && sim.dev[GOV[k]]==='continuous') && sim.dev[k]!==dev0[k]);
    cases++; if(bad.length){ miss(`${what}: the camera kept ${bad.map(k=>`${k} ${sim.dev[k]} (was ${dev0[k]})`).join(', ')}`); return false; } return true; };
  const control=(what, name)=>{ const n=diff.length, ok=restored(what); diff.length=n; if(ok) miss(`CONTROL: ${name} left the camera automatic — the check cannot fail`); };
  const what=keys=>keys.map(k=>t('diag.ctl.'+k)).join(t('diag.ctl.and'));
  const reopen=async ()=>{ await V.switchCamera(ST.camFacing); await sleep(200); };
  const darken=()=>Object.assign(sim.dev, { exposureMode:'manual', exposureTime:39.063, whiteBalanceMode:'manual', colorTemperature:2800 });
  const C=await import('../core/camlight.js'), recGet=()=>{ try{ return localStorage.getItem(C.TEST_REC_KEY); }catch(e){ return null; } };
  const recPut=v=>{ try{ if(v==null) localStorage.removeItem(C.TEST_REC_KEY); else localStorage.setItem(C.TEST_REC_KEY, v); }catch(e){} };
  const rec0=recGet(); recPut(null);
  const noRec=what=>{ cases++; if(recGet()!=null) miss(`${what}: our test record is still stored (${recGet()})`); };
  cases++; if(V.visionOpts().low!=='off') miss(`low light not Off at the start («${V.visionOpts().low}»)`);
  V.camSimDbg(sim); L.latSwSync();
  try{
    /* (I) the warning, the exposure button */
    cases++; { const w=$('swLowWarn'); if(!w || w.hidden || w.textContent.trim()!==t('diag.sw.lowWarn')) miss(`the warning under «Low light (test)» is missing («${w&&w.textContent}»)`); }
    cases++; if($('swLowExp').hidden) miss('«short exposure» hidden on a camera with manual exposure');
    /* (A) short exposure → Off */
    V.lowDbg({ fakeFps:30 }); await press('swLowExp');
    cases++; if(V.lowInfo().mode!=='exposure' || sim.dev.exposureMode!=='manual' || sim.dev.exposureTime!==234.378) miss(`short exposure did not reach the camera (mode «${V.lowInfo().mode}», ${JSON.stringify(sim.dev)})`);
    { let r=null; try{ r=JSON.parse(recGet()); }catch(e){} cases++;   // 0a: the test is on record while it holds a device control
      if(!r || !(r.touched||[]).includes('exposureMode') || !r.orig || r.orig.exposureMode!=='continuous') miss(`short exposure: no test record with the originals (${recGet()})`); }
    await press('swLowOff');
    restored('short exposure → Off'); noRec('short exposure → Off');
    { const D=V.lowInfo().dev; cases++; if(!D || D.kind!=='restore' || !D.ok || JSON.stringify(D.what)!==JSON.stringify(AUTO)) miss(`the restore is not recorded for the meter (${JSON.stringify(D)})`);
      cases++; const want=t('diag.dev.restore', { what:what(AUTO) }); if(!L.latText().includes(want)) miss(`the meter does not say «${want}»`); }
    /* (B) short exposure → 15 fps → Off (the user's likely path: the pre-fix Off forgot the exposure after another test) */
    await press('swLowExp'); await press('swLow15');
    cases++; if(V.lowInfo().mode!=='fps15') miss(`15 fps did not hold after short exposure («${V.lowInfo().mode}» — ${V.lowInfo().note})`);
    restored('short exposure → 15 fps (each test starts from the camera\'s own settings)');
    cases++; if(!(sim.format && sim.format.frameRate && sim.format.frameRate.min===15)) miss(`15 fps did not reach the video format (${JSON.stringify(sim.format)})`);
    await press('swLowOff'); restored('short exposure → 15 fps → Off');
    cases++; if(!sim.format || (sim.format.frameRate && sim.format.frameRate.min!=null)) miss(`Off left the video format at ${JSON.stringify(sim.format)}`);
    /* (C) a fall-back restores too */
    V.lowDbg({ fakeFps:3 }); await press('swLowExp');
    cases++; if(V.lowInfo().mode!=='off' || V.lowInfo().note!=='noeffect') miss(`simulated no effect: mode «${V.lowInfo().mode}», note «${V.lowInfo().note}»`);
    restored('short exposure → fall-back to Off');
    /* (D) a touched value without an automatic mode */
    V.lowDbg({ fakeFps:30, extra:{ brightness:40 } }); await press('swLowExp');
    cases++; if(sim.dev.brightness!==40) miss(`the extra control did not reach the camera (brightness ${sim.dev.brightness})`);
    await press('swLowOff'); restored('short exposure + brightness → Off');
    /* (H) leaving the page */
    V.lowDbg({ reset:true }); V.lowDbg({ fakeFps:30 }); await press('swLowExp');
    window.dispatchEvent(new Event('pagehide'));
    { const t0=performance.now(); while(V.camStats().unstopped && performance.now()-t0<3000) await sleep(50); }
    cases++; if(V.visionOpts().low!=='off' || V.lowInfo().note!=='left') miss(`pagehide: mode «${V.visionOpts().low}», note «${V.lowInfo().note}»`);
    restored('short exposure → the page left'); noRec('short exposure → the page left');
    { const cs=V.camStats(); cases++; if(cs.open || cs.unstopped) miss(`pagehide: the camera was not released (open ${cs.open}, live tracks ${cs.unstopped})`); }   // 0b
    await reopen();
    /* (E) CONTROL: the pre-fix Off must be flagged */
    V.lowDbg({ reset:true }); V.lowDbg({ fakeFps:30, noRestore:true }); await press('swLowExp'); await press('swLowOff');
    control('pre-fix Off', 'the pre-fix Off');
    V.lowDbg({ reset:true });
    /* (F) 0a: our test left the camera dark (the page forgot it without restoring) → the next open restores it and clears the record */
    const crash=async ()=>{ V.lowDbg({ fakeFps:30 }); await press('swLowExp'); V.lowDbg({ reset:true }); V.lowDbg({ crash:true, devClear:true }); };
    Object.assign(sim.dev, dev0); recPut(null);   // the pre-fix control above left the simulated camera dark
    await crash();
    cases++; if(sim.dev.exposureMode!=='manual' || recGet()==null) miss(`the simulated crash did not leave the camera dark with our record (${JSON.stringify(sim.dev)}, ${recGet()})`);
    await reopen();
    restored('our test left the camera dark → reopened (repair)'); noRec('repair at open');
    { const D=V.lowInfo().dev; cases++; if(!D || D.kind!=='heal' || !D.ok || JSON.stringify(D.what)!==JSON.stringify(AUTO)) miss(`the repair is not recorded for the meter (${JSON.stringify(D)})`);
      cases++; const want=t('diag.dev.heal', { what:what(AUTO) }); if(!L.latText().includes(want)) miss(`the meter does not say «${want}»`); }
    /* (F2) 0a: the person's own manual exposure, no record of ours → left alone */
    const own=()=>{ darken(); recPut(null); V.lowDbg({ devClear:true }); return JSON.stringify(sim.dev); };
    { const want=own(); await reopen(); cases++; if(JSON.stringify(sim.dev)!==want) miss(`a manual setting without our record was changed at open (${want} → ${JSON.stringify(sim.dev)})`);
      cases++; if(V.lowInfo().dev) miss(`the meter reports a repair although nothing of ours was there (${JSON.stringify(V.lowInfo().dev)})`); }
    /* (J) CONTROL: the pre-0a heal changes the person's own setting — the same check must notice */
    { const want=own(); V.lowDbg({ healAll:true }); await reopen(); V.lowDbg({ reset:true });
      cases++; if(JSON.stringify(sim.dev)===want) miss('CONTROL: the pre-0a heal left the person’s own manual setting alone — the check cannot fail'); }
    Object.assign(sim.dev, dev0);
    /* (G) CONTROL: with our record but without the repair the camera stays dark */
    await crash(); V.lowDbg({ noHeal:true }); await reopen();
    control('open without repair', 'an open without the repair');
    V.lowDbg({ reset:true }); await reopen(); restored('repaired after the control'); noRec('repaired after the control');
    notes.push(`simulated webcam after the row: ${JSON.stringify(sim.dev)}`);
  } finally {
    V.lowDbg({ reset:true });
    if(V.visionOpts().low!=='off') await V.setLowLight('off').catch(e=>miss('restore: '+e.message));
    V.camSimDbg(null); V.lowDbg({ devClear:true }); L.latSwSync(); recPut(rec0);
  }
  cases++; if(JSON.stringify(V.visionOpts())!==JSON.stringify(V.VISION_DEF)) miss(`the switches did not return to their defaults (${JSON.stringify(V.visionOpts())})`);
  return { cases, total:diff.length, differences:diff, notes };
}

/* ═══ 0b — A ROBUST CAMERA START (P.checkCamStart, quick and all; DRAWN ≈ 12 s) ═══
   The user's laptop webcam failed twice («Timeout starting video source», then «Requested device not found») and the app did not open
   after the next press. (1) The real start made exactly ONE getUserMedia and never two at once. (2) Two opens at once are serialised
   (never two requests in flight). (3) Through a getUserMedia stand-in: not found, not allowed, a camera that gives no picture (busy) and
   a request that never answers in time — each fails after exactly one retry ~1 s later, releases every track it obtained (late streams
   too), and the start card shows the right message with «Try again». CONTROLS that must be flagged: opens not serialised, tracks of a
   failure not stopped, no retry. Then the real camera is opened again and detection runs. */
export async function checkCamStart(){
  const L=await import('../latmeter.js'), V=await import('../vision.js'), ST=await import('../state.js'), M=await import('../main.js');
  const diff=[], miss=s=>diff.push(s), notes=[]; let cases=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id);
  const made=[];   // every stand-in stream (real MediaStreams from a canvas)
  const mkStream=()=>{ const c=document.createElement('canvas'); c.width=c.height=16; c.getContext('2d').fillRect(0,0,16,16); const s=c.captureStream(10); made.push(s); return s; };
  const live=()=>made.reduce((n,s)=>n+s.getTracks().filter(tr=>tr.readyState!=='ended').length, 0);
  const stopMade=()=>{ for(const s of made) for(const tr of s.getTracks()) tr.stop(); };
  const err=(msg,name)=>new DOMException(msg, name);
  const card={ msg:$('loadmsg').textContent, retry:$('camRetry').hidden, b:$('startBtn').disabled, l:$('learnBtn')&&$('learnBtn').disabled };
  { const cs=V.camStats(); cases++; if(cs.startCalls!==1) miss(`the start made ${cs.startCalls} getUserMedia calls, expected 1`);
    cases++; if(cs.max!==1) miss(`getUserMedia ran ${cs.max} at once during the session, expected never more than 1`); }
  /* one failing start through the stand-in: calls, retry gap, release, kind, message */
  const fail=async (name, o, kind, msgKey, wait=0)=>{
    const c0=V.camStats().calls, at=[]; let e=null;
    V.camOpenDbg({ reset:true }); V.camOpenDbg({ ...o, gum:c=>{ at.push(performance.now()); return o.gum(c); } });
    try{ await V.startCamera(ST.camFacing); }catch(x){ e=x; }
    if(wait) await sleep(wait);
    const n=V.camStats().calls-c0, cs=V.camStats(), P=[];
    if(!e) P.push(`${name}: the start did not fail`);
    if(n!==2) P.push(`${name}: ${n} getUserMedia calls, expected 2 (one retry)`);
    if(at.length===2 && !(at[1]-at[0]>=900)) P.push(`${name}: the retry came after ${Math.round(at[1]-at[0])} ms, expected ≈ 1 s`);
    if(live() || cs.unstopped || cs.open) P.push(`${name}: not released — ${live()} live stand-in tracks, ${cs.unstopped} unstopped, camera open ${cs.open}`);
    if(e && e.camKind!==kind) P.push(`${name}: kind «${e.camKind}», expected «${kind}» (${e.name}: ${e.message})`);
    if(cs.max!==1) P.push(`${name}: ${cs.max} getUserMedia at once`);
    if(e){ M.startFail(e); const tx=$('loadmsg').textContent;
      if(tx!==t(msgKey)) P.push(`${name}: the start card says «${tx}», expected «${t(msgKey)}»`);
      if($('camRetry').hidden) P.push(`${name}: no «Try again» button`); }
    return P;
  };
  try{
    /* (2) serialised; CONTROL: not serialised */
    const conc=async noSerial=>{
      V.camOpenDbg({ reset:true }); V.camOpenDbg({ noSerial, playFail:'NotReadableError', gum:()=>new Promise(r=>setTimeout(()=>r(mkStream()),300)) });
      await Promise.allSettled([V.switchCamera(ST.camFacing), V.switchCamera(ST.camFacing)]);
      return V.camStats().max; };
    { const m=await conc(false); cases++; if(m!==1) miss(`two opens at once ran ${m} getUserMedia together`); }
    { const m=await conc(true); cases++; if(m<2) miss('CONTROL: opens not serialised still never overlapped — the check cannot fail'); }
    stopMade(); V.camOpenDbg({ reset:true }); V.camStatsDbg();   // the control's overlap must not count against the cases below
    /* (3) the four failures */
    for(const [name,o,kind,key,wait] of [
      ['not found', { gum:()=>Promise.reject(err('Requested device not found','NotFoundError')) }, 'notfound', 'cam.notfound'],
      ['not allowed', { gum:()=>Promise.reject(err('Permission denied','NotAllowedError')) }, 'denied', 'cam.denied'],
      ['no picture (busy)', { gum:()=>Promise.resolve(mkStream()), playFail:'NotReadableError' }, 'busy', 'cam.busy'],
      ['no answer in time', { gum:()=>new Promise(r=>setTimeout(()=>r(mkStream()),1200)), timeoutMs:300 }, 'busy', 'cam.busy', 1500],
    ]){ cases++; const P=await fail(name, o, kind, key, wait); P.forEach(miss); if(!P.length) notes.push(`${name}: one retry, released, «${t(key).slice(0,40)}…»`); }
    { const cs=V.camStats(); cases++; if(cs.late<2) miss(`the abandoned requests' late streams: ${cs.late} stopped, expected 2`); }
    /* CONTROLS: no release, no retry */
    { const P=await fail('CONTROL no release', { gum:()=>Promise.resolve(mkStream()), playFail:'NotReadableError', noRelease:true }, 'busy', 'cam.busy');
      cases++; if(!P.some(x=>/not released/.test(x))) miss('CONTROL: tracks of a failure left running were not noticed — the check cannot fail'); }
    stopMade();
    { const P=await fail('CONTROL no retry', { gum:()=>Promise.reject(err('Requested device not found','NotFoundError')), noRetry:true }, 'notfound', 'cam.notfound');
      cases++; if(!P.some(x=>/getUserMedia calls/.test(x))) miss('CONTROL: a start without the retry was not noticed — the check cannot fail'); }
  } finally {
    V.camOpenDbg({ reset:true }); stopMade(); V.camStatsDbg();
    $('loadmsg').textContent=card.msg; $('camRetry').hidden=card.retry; $('startBtn').disabled=card.b; if($('learnBtn')) $('learnBtn').disabled=card.l;
    await V.switchCamera(ST.camFacing).catch(e=>miss('the real camera did not reopen: '+e.message));
  }
  { const a=L.latCount('detect'); await sleep(900); cases++; if(!(L.latCount('detect')>a)) miss('after the row the real camera gives no detections'); }
  return { cases, total:diff.length, differences:diff, notes };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:580, name:'LAT1 latency meter', run:()=>checkLatency(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:581, name:'LAT1b test switches', run:()=>checkLatSwitches(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:585, name:'LAT3 low light', run:()=>checkLowLight(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:586, name:'CAM-FIX camera settings restored', run:()=>checkCamRestore(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:587, name:'CAM-START robust camera start', run:()=>checkCamStart(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
