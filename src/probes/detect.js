/* LAT2 — hand detection: each camera frame once, the search schedule, the worker path. The runner's fake camera has frames but no hands,
   so what the model returns is always «no hand»; the schedule's reaction to hands is driven by a SCRIPT (handdet.js: the number of hands
   in view per model run, as the schedule sees it — L1 never sees more than one) on the real pump, the real detector and real frames.
   The pure schedule is checked exactly in node (row «LAT2 search schedule (core)» of tools/probe-data.mjs). */
import { row } from './rows.js';
import { HAND_SEARCH_EVERY, schedNew, schedPlan, schedRetry, schedAfter } from '../core/handsched.js';
import { t } from '../i18n.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* a clean start for a measured stretch: no frame taken while the one in flight finishes, then counters, log and schedule reset */
async function fresh(V, o={}){ V.pumpDbg({ hold:true }); await sleep(300); V.pumpDbg({ reset:true, ...o }); V.pumpDbg({ hold:false }); }

/* ═══ LAT2a — EACH CAMERA FRAME ONCE (P.checkFrameOnce, quick and all; DRAWN) ═══
   The model made slower than the camera (the fake camera gives ≈ 20 fps), two ways. (a) An AWAITED delay of 120 ms after each detection
   (the worker's situation: the page keeps receiving frames meanwhile): snapshots pile up, yet no frame is detected twice, each detection
   takes the NEWEST snapshot (stale ones dropped, never queued) and frames were dropped (so the choice was exercised). (b) A BLOCKING
   delay of 120 ms (the main thread's situation: no frame callback can run meanwhile): by the camera's own frame counter no frame is
   processed twice and frames were skipped (none queued). CONTROLS: fault 'dupe' (a frame goes through twice) must be caught as a repeat;
   fault 'queue' (keep the oldest waiting frame) must be caught as «not the newest». */
export async function checkFrameOnce(){
  const V=await import('../vision.js'), diff=[], miss=s=>diff.push(s); let cases=0;
  const o0=V.visionOpts();
  const run=async(o, ms)=>{ await fresh(V, o); await sleep(ms); return V.pumpStats(); };
  const problems=s=>{ const L=[];
    if(s.dup) L.push(`${s.dup} frame(s) detected again`);
    if(s.notNewest) L.push(`${s.notNewest} detection(s) took an older frame while a newer one waited`);
    for(let i=1;i<s.log.length;i++) if(!(s.log[i].id>s.log[i-1].id)){ L.push(`processed frame ids not increasing at ${i}: ${s.log[i-1].id} → ${s.log[i].id}`); break; }
    for(let i=1;i<s.log.length;i++){ const a=s.log[i-1].pf, b=s.log[i].pf; if(Number.isFinite(a)&&Number.isFinite(b)&&!(b>a)){ L.push(`the camera's frame ${b} processed after frame ${a}`); break; } }
    if(s.errors) L.push(`the pump reported ${s.errors} error(s): ${s.err}`);
    return L; };
  const gaps=s=>{ let g=0; for(let i=1;i<s.log.length;i++){ const d=s.log[i].pf-s.log[i-1].pf; if(d>1) g+=d-1; } return g; };
  try{
    await V.setHandsTracked('2');   // the model runs on every frame (no 'skip' frames that would hide a slow model)
    const a=await run({ delayMs:120 }, 2500);
    cases++; if(!(a.processed>=5)) miss(`(a) only ${a.processed} frame(s) processed in 2.5 s — is the camera running?`);
    cases++; if(!(a.dropped>0 && a.snapped>a.processed)) miss(`(a) a detector slower than the camera dropped no frame (snapped ${a.snapped}, processed ${a.processed}, dropped ${a.dropped}) — frames are queued`);
    for(const p of problems(a)){ cases++; miss('(a) '+p); } cases++;
    const b=await run({ delayMs:0, slowMs:120 }, 2500);
    cases++; if(!(b.processed>=5)) miss(`(b) only ${b.processed} frame(s) processed in 2.5 s`);
    cases++; if(!(gaps(b)>0)) miss(`(b) a blocking detector slower than the camera skipped no camera frame (${b.processed} processed) — frames are queued`);
    for(const p of problems(b)){ cases++; miss('(b) '+p); } cases++;
    const c1=await run({ slowMs:0, fault:'dupe' }, 1200);
    cases++; if(!problems(c1).some(x=>/detected again/.test(x))) miss('CONTROL: a frame sent through twice was not caught — the repeat check cannot fail');
    const c2=await run({ delayMs:120, fault:'queue' }, 2000);
    cases++; if(!problems(c2).some(x=>/older frame/.test(x))) miss('CONTROL: keeping the oldest waiting frame was not caught — the newest-frame check cannot fail');
    return { cases, total:diff.length, differences:diff, stats:{ a:{ snapped:a.snapped, processed:a.processed, dropped:a.dropped }, b:{ processed:b.processed, cameraFramesSkipped:gaps(b) } } };
  } finally { V.pumpDbg({ slowMs:0, delayMs:0, fault:null }); await fresh(V); await V.setHandsTracked(o0.hands); }
}

/* the schedule's rules over a processed-frame log [{action, n}] (n = hands the schedule saw): while fewer than two hands are tracked the
   full search runs on exactly every HAND_SEARCH_EVERY-th frame; with no hand the frames between are 'skip'; with one, 'track1'; a second
   hand is found only by a search, and from the next frame on both are tracked ('track2') on every frame. Returns the problems. */
function schedProblems(log){
  const P=[], E=HAND_SEARCH_EVERY; let mode=null, since=null;
  for(let i=0;i<log.length;i++){ const { action:a, n }=log[i], last=a.split('>').pop();
    if(mode==='two'){ if(a!=='track2') P.push(`frame ${i}: two hands tracked, yet «${a}» ran`); }
    else if(mode!=null){
      const want= since+1>=E ? 'search' : mode==='one' ? 'track1' : 'skip';
      if(a.split('>')[0]!==want) P.push(`frame ${i}: «${a}» ran, the schedule says «${want}» (${mode==='one'?'one hand':'no hand'}, ${since} frame(s) since the last search)`);
    }
    if(n>=2 && last!=='search' && last!=='track2') P.push(`frame ${i}: a second hand was «found» by ${a}`);
    if(last==='search') since=0; else if(since!=null) since++;
    mode= n>=2 ? 'two' : n===1 ? 'one' : 'none';
    if(since==null) mode=null;   // the log starts mid-way: wait for the first search to know the phase
    if(P.length>6) break; }
  return P;
}

/* the pump's log as the core says it must be: per frame plan → (a model run counts script[k] hands, L1 at most one; a tracking run
   that saw none retries a search on the same frame) → schedAfter — the pump's composition, built from the pure core (handsched.js) */
function expectLog(script, frames, policy='2s'){
  let s=schedNew(), k=0; const out=[];
  const cnt=a=> script ? Math.min(script[Math.min(k++, script.length-1)], a==='track1'?1:2) : 0;
  for(let i=0;i<frames;i++){ let a=schedPlan(s, policy), n=0, act=a;
    if(a!=='skip'){ n=cnt(a); const re=schedRetry(a, n, policy); if(re){ act=a+'>'+re; a=re; n=cnt(re); } }
    out.push({ action:act, n }); s=schedAfter(s, a, n); }
  return out;
}
const logTxt=L=>L.map(x=>x.action+'='+x.n).join(' ');

/* ═══ LAT2a — THE SEARCH SCHEDULE ON THE PROBE CLOCK (P.checkSchedule, quick and all; DRAWN) ═══
   RUN 4 (user answer): the real pump, the real detector and real camera pictures, but the frames are fed ONE AT A TIME and awaited
   (vision.pumpStepDbg) — a busy machine changes how long it takes, never which frames run what. Each case's log must equal, frame for
   frame, the core's own expectation (expectLog) AND obey the rules stated independently (schedProblems): (1) no hand in view (the fake
   camera), 12 frames: the full search on frames 0, 3, 6, 9 exactly, nothing in between; (2) scripted one hand, then two, 30 frames: the
   tracker (L1) between searches, the second hand found by a search, both tracked on every frame after it; (3) a hand lost by tracking is
   searched for on the SAME frame ('track1>search'). CONTROL: a schedule that never switches to two hands (schedStay) must break both the
   exact log and the rules. */
export async function checkSchedule(){
  const V=await import('../vision.js'), diff=[], miss=s=>diff.push(s); let cases=0;
  const o0=V.visionOpts();
  const stepped=async(script, frames, extra={})=>{
    V.pumpDbg({ hold:true, reset:true, script, ...extra }); await V.pumpStepDbg(frames);
    const st=V.pumpStats(); V.pumpDbg({ script:null, ...Object.fromEntries(Object.keys(extra).map(k=>[k,false])) });
    if(st.errors) miss(`the pump reported ${st.errors} error(s): ${st.err}`);
    return st.log; };
  const exact=(what, L, E)=>{ cases++; if(logTxt(L)!==logTxt(E)) miss(`${what}: the pump ran «${logTxt(L)}», the schedule says «${logTxt(E)}»`); };
  try{
    await V.setHandsTracked('2s');
    { const L=await stepped(null, 12); exact('no hand', L, expectLog(null, 12));
      const s=L.map((x,i)=>x.action==='search'?i:-1).filter(i=>i>=0).join(','); cases++;
      if(s!=='0,3,6,9') miss(`no hand in view: searches on frames ${s||'none'}, expected 0,3,6,9`);
      for(const p of schedProblems(L)){ cases++; miss('no hand: '+p); } }
    const two=[...Array(10).fill(1), ...Array(40).fill(2)];
    { const L=await stepped(two, 30); exact('one hand then two', L, expectLog(two, 30));
      const k=L.findIndex(x=>x.n>=2); cases++;
      if(k<0) miss(`scripted second hand: never found in ${L.length} frames (${logTxt(L.slice(0,14))})`);
      else { cases++; if(L.length-k-1<5) miss(`scripted second hand: only ${L.length-k-1} frame(s) after it was found`);
        const t1=L.slice(0,k).filter(x=>x.action==='track1').length; cases++;
        if(t1<4) miss(`scripted one hand: the tracker (L1) ran only ${t1} time(s) before the second hand`); }
      for(const p of schedProblems(L)){ cases++; miss('scripted: '+p); } cases++; }
    { const lost=[1,1,0,1,1,1,1,1,1,1,1,1], L=await stepped(lost, 8); exact('a hand lost by tracking', L, expectLog(lost, 8)); cases++;   // run 3 is a track1 that loses its hand
      if(!L.slice(0,6).some(x=>x.action==='track1>search')) miss(`a hand lost by tracking was not searched for on the same frame (${logTxt(L.slice(0,6))})`); }
    { const L=await stepped(two, 30, { schedStay:true }); cases+=2;   // CONTROL
      if(logTxt(L)===logTxt(expectLog(two, 30))) miss('CONTROL: a schedule that never tracks two hands matched the exact log — the comparison cannot fail');
      if(!schedProblems(L).length) miss('CONTROL: a schedule that never tracks two hands passed the rules — the schedule check cannot fail'); }
    return { cases, total:diff.length, differences:diff };
  } finally { V.pumpDbg({ script:null, schedStay:false, reset:true, hold:false }); await V.setHandsTracked(o0.hands); }
}

/* ═══ LAT2b — THE WORKER = THE MAIN THREAD, AND THE FALLBACK (P.checkWorker, P.all only (slow); DRAWN; ≈ 20 s) ═══
   (1) The REAL switch «Detection runs in: background worker» → detection runs in the worker and keeps going; the meter says so.
   (2) The same camera frames (snapshots) through the running worker and a fresh main-thread detector, with the same actions: identical
   actions and results (the fake camera has no hands — every result is «no hand»). CONTROL: the worker made to add a hand must differ.
   (3) A worker that cannot start (workerFail) falls back to the main thread by itself: detection keeps going, the meter names the main
   thread and the reason. Everything returns to the default path. */
export async function checkWorker(){
  const V=await import('../vision.js'), L=await import('../latmeter.js'), H=await import('../handdet.js'), diff=[], miss=s=>diff.push(s); let cases=0;
  const o0=V.visionOpts(), $=id=>document.getElementById(id), video=document.getElementById('video');
  const detects=async what=>{ const a=L.latCount('detect'); await sleep(1500); cases++; if(!(L.latCount('detect')>a)) miss(`${what}: hand detection stopped (no samples in 1.5 s)`); };
  let D=null;
  try{
    await L.latSwitch('swPathWorker');
    { const p=V.pathInfo(); cases++; if(p.runs!=='worker') miss(`«background worker» pressed, detection runs in «${p.runs}» (${p.why})`); }
    cases++; if(!$('swPathWorker').classList.contains('act')) miss('the worker button is not lit');
    await detects('in the worker');
    cases++; if(!L.latText().includes(t('diag.pathWorker'))) miss('the meter does not say the worker runs');
    /* (2) identity on the same frames */
    V.pumpDbg({ hold:true }); await sleep(300);
    D=await H.createDetector({ blank:()=>{ const c=new OffscreenCanvas(640,480); c.getContext('2d').fillRect(0,0,640,480); return c; } });
    const acts=['search','track1','track2','search','track1','search'], cmp=async fake=>{ const bad=[];
      if(fake) V.pumpDbg({ fake:true });
      for(let i=0;i<acts.length;i++){ await new Promise(r=>video.requestVideoFrameCallback?video.requestVideoFrameCallback(()=>r()):setTimeout(r,50));
        const b1=await createImageBitmap(video), b2=await createImageBitmap(b1);
        const w=await V.detRunDbg(b1, acts[i]); if(w.bmp) w.bmp.close();
        const m=D.run(b2, performance.now(), acts[i], '2s'); b2.close();
        if(w.kind!=='worker') bad.push(`frame ${i}: the running detector is «${w.kind}», not the worker`);
        if(w.action!==m.action) bad.push(`frame ${i}: actions differ — worker «${w.action}», main thread «${m.action}»`);
        if(JSON.stringify(w.res)!==JSON.stringify(m.res)) bad.push(`frame ${i} («${acts[i]}»): results differ — worker ${w.res.landmarks.length} hand(s), main thread ${m.res.landmarks.length}`); }
      if(fake) V.pumpDbg({ fake:false });
      return bad; };
    { const bad=await cmp(false); cases+=acts.length; bad.forEach(miss); }
    { const bad=await cmp(true); cases++; if(!bad.some(x=>/results differ/.test(x))) miss('CONTROL: a worker that adds a hand matched the main thread — the comparison cannot fail'); }
    D.close(); D=null; V.pumpDbg({ hold:false, reset:true });
    /* (3) the fallback */
    await L.latSwitch('swPathMain');
    V.pumpDbg({ workerFail:true });
    await L.latSwitch('swPathWorker');
    { const p=V.pathInfo(); cases++; if(p.runs!=='main' || !/refused on purpose/.test(p.why)) miss(`a worker that cannot start: detection runs in «${p.runs}» (${p.why||'no reason'}) — the main thread with the reason expected`); }
    await detects('after the fallback');
    { const tx=L.latText(); cases++; if(!tx.includes(t('diag.pathMain')) || !/refused on purpose/.test(tx)) miss('after the fallback the meter does not name the main thread and the reason'); }
    return { cases, total:diff.length, differences:diff };
  } finally {
    if(D) D.close();
    V.pumpDbg({ hold:false, workerFail:false, fake:false, reset:true });
    if(V.visionOpts().path!==o0.path || V.pathInfo().runs!==o0.path) await L.latSwitch(o0.path==='worker'?'swPathWorker':'swPathMain').catch(e=>miss('restore: '+e.message));
    cases++; if(V.pathInfo().runs!==o0.path) miss(`the detection path did not return to «${o0.path}» (${V.pathInfo().runs})`);
  }
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:582, name:'LAT2a frame once', run:()=>checkFrameOnce(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:583, name:'LAT2a search schedule (probe clock)', run:()=>checkSchedule(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true });
row({ at:584, name:'LAT2b worker = main thread, fallback', run:()=>checkWorker(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), drawn:true, slow:true });
