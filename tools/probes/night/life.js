/* NIGHT-11 part 1 — rows «NIGHT phone lifecycle» and «NIGHT context lost» (the audit's W1, W2, W3, W6), on the running app.
   «NIGHT phone lifecycle»: (1) SOUND — the context suspended (as a call or the lock screen leaves it), the page shown again → running within
   1.5 s, no notice; a resume that does not take (the browser keeps it suspended) → the notice «Tap to continue» shows; a tap on it → running, the
   notice gone. (2) SCREEN — the wake lock dropped by the browser, the page shown again → asked again and held (the browser's request counted
   through a stand-in). (3) CAMERA — the track ends → reopened once (a new getUserMedia, detections go on, no notice); it ends again at once → the
   notice says the camera stopped; a tap → back (the notice gone, detections go on); a track that stays muted while visible → reopened.
   CONTROLS: the old way (lifeOldDbg: nothing resumes, no relock, no camera watch) fails each of the three judgements.
   «NIGHT context lost»: the forest open, its WebGL context lost (WEBGL_lose_context) → the 2D stand-in at once, then ONE reopen while the page is
   visible (a new context, the room drawn again); a second loss → the stand-in stays (never a loop). CONTROL: with the reopen switched off the first
   loss stays on the stand-in (the «reopened» judgement fails). */
import { row } from '../core/rows.js';

const wait=ms=>new Promise(r=>setTimeout(r, ms));
const until=async (f, ms, step=50)=>{ const t0=performance.now(); while(performance.now()-t0<ms){ if(await f()) return true; await wait(step); } return !!(await f()); };
const showAgain=()=>document.dispatchEvent(new Event('visibilitychange'));
export async function checkNightLife(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const A=await import('../../../core/audio.js'), LF=await import('../../../apps/night/lifecycle.js'), NO=await import('../../../apps/night/notice.js'), V=await import('../../../core/vision.js');
  const { t }=await import('../../../core/i18n.js');
  const AC=A.AC, realResume=AC.resume.bind(AC), W=navigator.wakeLock, realReq=W && W.request;
  try{
    ok('the lifecycle did not start with the app', LF.lifeDbg().started);
    /* (1) sound */
    const suspendedBack=async old=>{ LF.lifeOldDbg(old); await AC.suspend(); await until(()=>AC.state==='suspended', 1000); showAgain(); await until(()=>AC.state==='running', 1500); const st=AC.state; LF.lifeOldDbg(false); await realResume(); return st; };
    ok('the page shown again did not resume the sound (state '+await (async()=>{ const s=await suspendedBack(false); notes.push('suspended → shown again → '+s); return s; })()+')', AC.state==='running' && NO.noticeDbg().shown!=='audio');
    { const s=await suspendedBack(true); ok('CONTROL: the old way resumed the sound by itself ('+s+')', s!=='running'); notes.push('CONTROL old way: suspended → shown again → '+s); }
    AC.resume=()=>Promise.resolve(); await AC.suspend(); await until(()=>AC.state==='suspended', 1000); showAgain();
    await until(()=>NO.noticeDbg().shown==='audio', 2500);
    { const N=NO.noticeDbg(); ok(`a resume that does not take shows no «Tap to continue» (${JSON.stringify(N)})`, N.shown==='audio' && N.onScreen && N.text===t('night.audio.tap')); }
    AC.resume=realResume; document.getElementById('nightNotice').click();
    await until(()=>AC.state==='running' && NO.noticeDbg().shown!=='audio', 2500);
    ok(`the tap on «Tap to continue» did not bring the sound back (state ${AC.state}, notice ${NO.noticeDbg().shown})`, AC.state==='running' && NO.noticeDbg().shown!=='audio');
    /* (2) screen */
    if(W && realReq){ let asked=0; const fake=()=>{ const s=new EventTarget(); s.released=false; s.release=async()=>{ s.released=true; s.dispatchEvent(new Event('release')); }; return s; };
      W.request=async ()=>{ asked++; return fake(); };
      const dropBack=async old=>{ LF.lifeOldDbg(old); LF.lifeLockDropDbg(); const a0=asked; showAgain(); await wait(300); LF.lifeOldDbg(false); return asked-a0; };
      const k=await dropBack(false); ok(`the wake lock was not asked again when the page came back (${k} requests, held ${LF.lifeDbg().lock})`, k===1 && LF.lifeDbg().lock);
      const c=await dropBack(true); ok('CONTROL: the old way asked for the wake lock again', c===0); notes.push(`wake lock: shown again → ${k} request(s); the old way ${c}`);
      W.request=realReq; }
    else notes.push('no wake lock in this browser — the screen part not checked');
    /* (3) camera */
    V.cameraWatchDbg({ muteMs:300, reset:true });
    const tr=()=>V.video.srcObject && V.video.srcObject.getVideoTracks()[0];
    const det=()=>V.pumpStats().detected, calls=()=>V.camStats().calls;
    { const c0=calls(), r0=LF.lifeDbg().cam.reopened, t0=tr(); t0.dispatchEvent(new Event('ended'));
      await until(()=>LF.lifeDbg().cam.reopened>r0 && tr() && tr()!==t0, 4000); const d0=det(); await until(()=>det()>d0, 3000);
      ok(`an ended track was not reopened once (getUserMedia ${c0} → ${calls()}, reopened ${LF.lifeDbg().cam.reopened-r0}, detections go on ${det()>d0}, notice ${NO.noticeDbg().shown})`, calls()===c0+1 && tr()!==t0 && det()>d0 && NO.noticeDbg().shown!=='camera'); }
    { const l0=LF.lifeDbg().cam.lost; tr().dispatchEvent(new Event('ended')); await until(()=>NO.noticeDbg().shown==='camera', 2000);
      const N=NO.noticeDbg(); ok(`a second loss at once did not say the camera stopped (${JSON.stringify(N)})`, LF.lifeDbg().cam.lost===l0+1 && N.shown==='camera' && N.onScreen && N.text===t('night.cam.lost'));
      const t0=tr(); document.getElementById('nightNotice').click(); await until(()=>LF.lifeDbg().cam.back>0 && tr()!==t0, 4000); const d0=det(); await until(()=>det()>d0, 3000);
      ok(`the tap did not bring the camera back (back ${LF.lifeDbg().cam.back}, notice ${NO.noticeDbg().shown}, detections ${det()>d0})`, tr()!==t0 && NO.noticeDbg().shown!=='camera' && det()>d0); }
    { V.cameraWatchDbg({ reset:true }); const r0=LF.lifeDbg().cam.reopened, t0=tr(); Object.defineProperty(t0, 'muted', { value:true, configurable:true }); t0.dispatchEvent(new Event('mute'));
      await until(()=>LF.lifeDbg().cam.reopened>r0 && tr()!==t0, 4000); ok('a track muted while visible was not reopened', LF.lifeDbg().cam.reopened===r0+1 && tr()!==t0); }
    { V.cameraWatchDbg({ reset:true }); LF.lifeOldDbg(true); const c0=calls(), t0=tr(); t0.dispatchEvent(new Event('ended')); await wait(1500);
      ok('CONTROL: the old way reopened an ended track', calls()===c0 && tr()===t0 && NO.noticeDbg().shown!=='camera'); LF.lifeOldDbg(false); }
    notes.push('camera: '+JSON.stringify(V.cameraWatchDbg()));
  } finally {
    AC.resume=realResume; if(W && realReq) W.request=realReq; LF.lifeOldDbg(false); V.cameraWatchDbg({ muteMs:null, reset:true });
    NO.noticeHide('audio'); NO.noticeHide('camera'); if(AC.state!=='running') await realResume().catch(()=>{});
  }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.985, night:true, name:'NIGHT phone lifecycle', run:()=>checkNightLife(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });

export async function checkNightContextLost(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const H=await import('../../../apps/night/scene/host.js'), keep={ bg:H.backgroundOf(), level:H.sceneLevel() };
  const opened=()=>until(()=>{ const I=H.sceneInfo(); return I.webgl && !I.opening && I.rendered>0; }, 60000, 200);
  try{
    H.sceneLostDbg({ reopen:true, reset:true, delayMs:300 });
    await H.setBackground('forest'); ok('the forest did not open', await opened());
    const m0=H.sceneInfo().contextsMade, lv=H.sceneLevel();
    ok('the context could not be lost (no WEBGL_lose_context)', H.sceneLoseDbg());
    await until(()=>!H.sceneInfo().webgl, 3000); ok('the stand-in did not take over at the loss', !H.sceneInfo().webgl);
    const back=await until(()=>{ const I=H.sceneInfo(); return I.webgl && I.contextsMade>m0 && !I.opening && I.rendered>0; }, 60000, 200);
    { const I=H.sceneInfo(); ok(`one loss: not reopened (webgl ${I.webgl}, contexts ${m0} → ${I.contextsMade}, level ${lv} → ${I.level}, lost ${JSON.stringify(I.lost)})`, back && I.level===lv); notes.push(`a loss at ${lv}: reopened, contexts ${m0} → ${I.contextsMade}`); }
    const m1=H.sceneInfo().contextsMade; H.sceneLoseDbg(); await wait(2500);
    { const I=H.sceneInfo(); ok(`a second loss reopened again (webgl ${I.webgl}, contexts ${m1} → ${I.contextsMade})`, !I.webgl && I.contextsMade===m1 && I.lost.final); }
    /* CONTROL: no reopen */
    H.sceneLostDbg({ reopen:false, reset:true }); await H.setSceneLevel(lv); ok('the forest did not open again for the control', await opened());
    const m2=H.sceneInfo().contextsMade; H.sceneLoseDbg(); await wait(2500);
    { const I=H.sceneInfo(); ok('CONTROL: with the reopen off the first loss was reopened anyway', !I.webgl && I.contextsMade===m2); }
  } finally {
    H.sceneLostDbg({ reopen:true, reset:true, delayMs:null });
    await H.setSceneLevel(keep.level); await H.setBackground(keep.bg);
  }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.986, night:true, drawn:true, name:'NIGHT context lost', run:()=>checkNightContextLost(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
