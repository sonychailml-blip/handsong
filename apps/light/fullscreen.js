/* LIGHT-8 — FULL SCREEN, the way Night does it (apps/night/fullscreen.js, NIGHT-7c/8b/11; apps never import each other, so Light keeps its own copy).
   The Play tap asks for full screen; but never while the camera permission is undecided — Android Chrome ends full screen when the camera prompt
   appears. Then the wish is kept: as soon as the camera runs, while the Play tap still counts (user activation) it is asked at once, else on the
   next tap (at most twice). The wish ends once full screen is on with the camera running, or when the person leaves it (Esc, back, the corner
   button). iPhone Safari has no door: nothing is asked, the corner button is not shown; an app opened from the home screen needs none either. */
const D=document, EL=D.documentElement;
export const fsApi=()=>!!(D.fullscreenEnabled || D.webkitFullscreenEnabled);
export const fsOn=()=>!!(D.fullscreenElement || D.webkitFullscreenElement);
export const fsStandalone=()=>{ try{ return navigator.standalone===true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches; }catch(e){ return false; } };
export const FS_RETRIES=2;
let want=false, started=false, camRan=false, retries=0, asking=null, cam='unknown';
const listeners=[], S={ asked:0, granted:0, refused:0, exits:0, retried:0, deferred:0, undecided:0, atCamera:0 };
try{ const q=navigator.permissions && navigator.permissions.query({ name:'camera' });
  if(q) q.then(p=>{ cam=p.state; p.addEventListener('change', ()=>{ cam=p.state; }); }, ()=>{}); }catch(e){}
const camOk=()=>camRan || cam==='granted';
function lockLandscape(){
  if(!/Android/i.test(navigator.userAgent)) return;
  try{ const o=screen.orientation; if(o && o.lock) o.lock('landscape').catch(()=>{}); }catch(e){}
}
/* inside a tap → a promise of true (full) / false; one request at a time */
function ask(){
  if(!fsApi() || fsOn() || fsStandalone()) return Promise.resolve(fsOn());
  if(asking) return asking;
  S.asked++; if(!camOk()) S.undecided++;   // the row wants this 0
  let p;
  try{ p= EL.requestFullscreen ? EL.requestFullscreen({ navigationUI:'hide' }) : EL.webkitRequestFullscreen ? EL.webkitRequestFullscreen() : Promise.reject(new Error('no door')); }
  catch(e){ p=Promise.reject(e); }
  const a=asking=Promise.resolve(p).then(()=>{ S.granted++; lockLandscape(); if(started) want=false; return true; }, ()=>{ S.refused++; return false; });
  a.finally(()=>{ if(asking===a) asking=null; });
  return a;
}
function changed(){ if(!fsOn()){ S.exits++; if(started) want=false; } for(const f of listeners){ try{ f(fsOn()); }catch(e){} } }
D.addEventListener('fullscreenchange', changed); D.addEventListener('webkitfullscreenchange', changed);
function tapped(){ if(want && started && !fsOn() && !asking && retries<FS_RETRIES){ retries++; S.retried++; ask(); } }
D.addEventListener('click', tapped, true);   // capture: before the tapped button's own handler
/* the Play tap */
export function fsBegin(){ want=true; started=false; retries=0; if(camOk()) return ask(); S.deferred++; return Promise.resolve(false); }
/* the camera runs: while the Play tap still counts, ask now */
export function fsCamera(){ camRan=true; if(want && !fsOn() && !asking && navigator.userActivation && navigator.userActivation.isActive){ S.atCamera++; ask(); } }
export const fsStarted=()=>{ started=true; camRan=true; if(fsOn()) want=false; };
export function fsToggle(){ want=false; if(!fsOn()) return ask();
  try{ const p=D.exitFullscreen ? D.exitFullscreen() : D.webkitExitFullscreen && D.webkitExitFullscreen(); if(p && p.catch) p.catch(()=>{}); }catch(e){} return Promise.resolve(false); }
export const fsOnChange=f=>{ listeners.push(f); };
export const fsCanToggle=()=>fsApi() && !fsStandalone();
/* probe only */
export const fsDbg=()=>({ ...S, on:fsOn(), api:fsApi(), standalone:fsStandalone(), cam, camRan, want, started, retries });
