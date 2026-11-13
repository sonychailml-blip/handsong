/* NIGHT-7c — FULL SCREEN on computers and Android (Chrome, Edge, Firefox; iPadOS Safari through its prefixed door). NIGHT-8b (the user's Poco):
   full screen is NEVER asked while the camera permission is undecided — Android Chrome ends full screen when the camera prompt appears. So the
   tap on Begin asks for it only when the camera is already granted (the browser says so: Permissions API, kept current by its change event);
   otherwise Begin asks for the camera alone and the wish is kept: the next tap after the camera runs — the calibration offer, the first card,
   or any tap later — asks for full screen (navigation hidden where allowed; Android: a landscape lock tried, refusals quiet). The wish ends once
   full screen is on with the camera running, or when the person leaves it afterwards (Esc, the back gesture, the corner button). A refused ask
   is tried again on the next tap, at most twice (no nagging). A browser without the camera permission query (Firefox) counts as undecided until
   the camera runs. iPhone Safari has no door: nothing is asked there (the home-screen card instead). */
const D=document, EL=D.documentElement;
export const fsApi=()=>!!(D.fullscreenEnabled || D.webkitFullscreenEnabled);
export const fsOn=()=>!!(D.fullscreenElement || D.webkitFullscreenElement);
/* opened from the home screen (an installed app): already without the browser's bars */
export const fsStandalone=()=>{ try{ return navigator.standalone===true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches; }catch(e){ return false; } };
export const FS_RETRIES=2;   // asks after the Begin tap's own, per Begin
let want=false, started=false, camRan=false, retries=0, asking=null, onChange=null, cam='unknown', askAlways=false;
const S={ asked:0, granted:0, refused:0, exits:0, retried:0, deferred:0, undecided:0, locked:null, atCamera:0 };
/* the camera permission as the browser reports it: 'granted' | 'prompt' | 'denied' | 'unknown' (no query for the camera) */
try{ const q=navigator.permissions && navigator.permissions.query({ name:'camera' });
  if(q) q.then(p=>{ cam=p.state; p.addEventListener('change', ()=>{ cam=p.state; }); }, ()=>{}); }catch(e){}
const camOk=()=>camRan || cam==='granted';
function lockLandscape(){
  if(!/Android/i.test(navigator.userAgent)) return;
  try{ const o=screen.orientation; if(o && o.lock) o.lock('landscape').then(()=>{ S.locked=true; }, ()=>{ S.locked=false; }); }catch(e){ S.locked=false; }
}
/* inside a tap (it uses the tap's activation) → a promise of true (full) / false; one request at a time (a second ask in the same tap joins it) */
function ask(){
  if(!fsApi() || fsOn() || fsStandalone()) return Promise.resolve(fsOn());
  if(asking) return asking;
  S.asked++; if(!camOk()) S.undecided++;   // the rows want this 0: never while the camera prompt may come
  let p;
  try{ p= EL.requestFullscreen ? EL.requestFullscreen({ navigationUI:'hide' }) : EL.webkitRequestFullscreen ? EL.webkitRequestFullscreen() : Promise.reject(new Error('no door')); }
  catch(e){ p=Promise.reject(e); }
  const a=asking=Promise.resolve(p).then(()=>{ S.granted++; lockLandscape(); if(started) want=false; return true; }, ()=>{ S.refused++; return false; });
  a.finally(()=>{ if(asking===a) asking=null; });
  return a;
}
function changed(){ if(!fsOn()){ S.exits++; if(started) want=false; } if(onChange) onChange(fsOn()); }   // an exit once the camera runs is the person's
D.addEventListener('fullscreenchange', changed); D.addEventListener('webkitfullscreenchange', changed);
/* the next tap after the camera runs asks while the wish stands (capture phase: before the tapped button's own handler) */
function tapped(){ if(want && started && !fsOn() && !asking && retries<FS_RETRIES){ retries++; S.retried++; ask(); } }
D.addEventListener('click', tapped, true);
/* the doors the shell uses */
export function fsBegin(){ want=true; started=false; retries=0; if(camOk() || askAlways) return ask(); S.deferred++; return Promise.resolve(false); }   // the tap on Begin
/* NIGHT-11 part 3: the camera runs (core's onCamera) — its permission is decided now; while the Begin tap still counts (the browser's user activation)
   full screen is asked at once instead of waiting for the next tap */
export function fsCamera(){ camRan=true; if(want && !fsOn() && !asking && navigator.userActivation && navigator.userActivation.isActive){ S.atCamera++; ask(); } }
export const fsStarted=()=>{ started=true; camRan=true; if(fsOn()) want=false; };   // the camera runs: a full screen now on is done; an exit from here is the person's
export function fsToggle(){ if(!fsOn()){ want=false; return ask(); } want=false; try{ const p=D.exitFullscreen ? D.exitFullscreen() : D.webkitExitFullscreen && D.webkitExitFullscreen(); if(p && p.catch) p.catch(()=>{}); }catch(e){} return Promise.resolve(false); }
export const fsOnChange=f=>{ onChange=f; };
/* NIGHT-13b: a full-screen request in flight (the Begin tap's own, or the camera's) — the start's dot waits for the layout to settle */
export const fsAsking=()=>!!asking;
/* the toggle is shown where full screen can be had and is not already given by the home-screen app */
export const fsCanToggle=()=>fsApi() && !fsStandalone();
/* probe only: the counters (asked, granted, refused, exits, asked again, deferred at Begin, asked while undecided, landscape lock), the camera
   permission as read, and the wish */
export const fsDbg=()=>({ ...S, on:fsOn(), api:fsApi(), standalone:fsStandalone(), cam, camRan, want, started, retries });
/* probe CONTROL only: true = the old way (NIGHT-7c), Begin asks whatever the camera permission says */
export const fsAskAlwaysDbg=v=>{ askAlways=!!v; };
