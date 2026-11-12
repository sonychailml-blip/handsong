/* NIGHT-11 part 1 — WHEN THE PHONE LOOKS AWAY (audit W1, W2, W3). Started once the app runs (lifeStart, from the face).
   - Sound: Safari moves the audio context to «suspended» or «interrupted» on a call, the lock screen, Siri or a tab switch, and nothing resumed it.
     Now: resumed when the page becomes visible, when the context changes state while visible, and on the next tap; if it is still not running a
     moment later, a soft «Tap to continue» (the notice line) — the tap resumes it inside the gesture.
   - Screen: the wake lock is dropped by the browser whenever the page hides; it is asked again each time the page becomes visible.
   - Camera: core's watch (CORE-17, vision.cameraWatch) reopens a track that ended or stayed muted once; if that fails, the notice says so plainly
     and a tap tries again. */
import { AC } from '../../core/audio.js';
import { cameraWatch, cameraWatchRetry } from '../../core/vision.js';
import { noticeShow, noticeHide } from './notice.js';

const RESUME_WAIT_MS=900;   // a resume that has not got the context running by then shows «Tap to continue» (iOS may leave the promise pending)
const S={ resumes:0, resumed:0, stuck:0, taps:0, locks:0, relocks:0, lockFails:0, cam:{ reopened:0, lost:0, back:0 } };
let started=false, old=false, lock=null, checking=null;
const visible=()=>document.visibilityState==='visible';
const running=()=>!!AC && AC.state==='running';
const sleep=ms=>new Promise(r=>setTimeout(r, ms));
/* one resume attempt (bounded): running → the notice goes; still not, while visible → «Tap to continue» */
function resume(){
  if(old || !AC || AC.state==='closed') return Promise.resolve(false);
  if(running()){ noticeHide('audio'); return Promise.resolve(true); }
  if(checking) return checking;
  S.resumes++;
  let p; try{ p=AC.resume(); }catch(e){ p=Promise.resolve(); }
  const c=checking=Promise.race([Promise.resolve(p).catch(()=>{}), sleep(RESUME_WAIT_MS)]).then(()=>{
    if(running()){ S.resumed++; noticeHide('audio'); return true; }
    if(visible()){ S.stuck++; noticeShow('audio', 'night.audio.tap', ()=>{ S.taps++; resume(); }); }
    return false; });
  c.finally(()=>{ if(checking===c) checking=null; });
  return c;
}
/* the screen wake lock: asked when the app starts and again whenever the page is visible without one */
async function relock(first){
  if(old || !visible() || (lock && !lock.released)) return;
  const W=navigator.wakeLock; if(!W || typeof W.request!=='function') return;
  try{ const l=await W.request('screen'); lock=l; if(first) S.locks++; else S.relocks++; l.addEventListener('release', ()=>{ if(lock===l) lock=null; }); }
  catch(e){ S.lockFails++; }
}
function onVisible(){ if(!started || !visible()) return; resume(); relock(false); }
function onCamera(kind){
  if(kind==='reopened'){ S.cam.reopened++; noticeHide('camera'); }
  else if(kind==='lost'){ S.cam.lost++; noticeShow('camera', 'night.cam.lost', ()=>{ cameraWatchRetry().catch(()=>{}); }); }
  else if(kind==='back'){ S.cam.back++; noticeHide('camera'); }
}
export function lifeStart(){
  if(started) return; started=true;
  document.addEventListener('visibilitychange', onVisible);
  addEventListener('pageshow', onVisible);
  if(AC) AC.addEventListener('statechange', ()=>{ if(!running() && AC.state!=='closed' && visible()) resume(); else if(running()) noticeHide('audio'); });
  /* the next tap resumes (capture: before the tapped control's own handler; inside the gesture, as iOS wants) */
  const tap=()=>{ if(old) return; if(!running()) resume(); if(!lock || lock.released) relock(false); };
  document.addEventListener('pointerdown', tap, true); document.addEventListener('click', tap, true);
  cameraWatch(onCamera);
  relock(true);
}
/* probe only: the counters, the context's state, whether a lock is held, the notice */
export const lifeDbg=()=>({ ...S, cam:{ ...S.cam }, started, old, ac:AC ? AC.state : null, lock:!!lock && !lock.released });
/* probe only: the browser drops the wake lock (as on hiding the page) */
export const lifeLockDropDbg=()=>{ lock=null; };
/* probe CONTROL only: true = the old way (nothing resumes, nothing asks the lock again, no camera watch) */
export const lifeOldDbg=v=>{ old=!!v; cameraWatch(old ? null : onCamera); return old; };
