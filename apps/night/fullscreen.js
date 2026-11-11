/* NIGHT-7c — FULL SCREEN on computers and Android (Chrome, Edge, Firefox; iPadOS Safari through its prefixed door). The tap on Begin asks for
   the whole page with the navigation hidden where the browser allows; on Android a granted full screen also tries to lock landscape (refused
   quietly). If the browser refuses, or full screen ends before the camera runs (the camera prompt can end it), the next tap in the first-launch
   flow (calibration, cards) asks again — never a pop-up of ours. An exit after the camera runs is the person's (Esc, the back gesture): not
   asked again; the corner button toggles it. iPhone Safari has no door: nothing is asked there (the home-screen card instead). */
const D=document, EL=D.documentElement;
export const fsApi=()=>!!(D.fullscreenEnabled || D.webkitFullscreenEnabled);
export const fsOn=()=>!!(D.fullscreenElement || D.webkitFullscreenElement);
/* opened from the home screen (an installed app): already without the browser's bars */
export const fsStandalone=()=>{ try{ return navigator.standalone===true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches; }catch(e){ return false; } };
let flow=false, started=false, again=false, onChange=null;
const S={ asked:0, granted:0, refused:0, exits:0, retried:0, locked:null };
function lockLandscape(){
  if(!/Android/i.test(navigator.userAgent)) return;
  try{ const o=screen.orientation; if(o && o.lock) o.lock('landscape').then(()=>{ S.locked=true; }, ()=>{ S.locked=false; }); }catch(e){ S.locked=false; }
}
/* inside a tap (it uses the tap's activation) → a promise of true (full) / false */
function ask(){
  if(!fsApi() || fsOn() || fsStandalone()) return Promise.resolve(fsOn());
  S.asked++; let p;
  try{ p= EL.requestFullscreen ? EL.requestFullscreen({ navigationUI:'hide' }) : EL.webkitRequestFullscreen ? EL.webkitRequestFullscreen() : Promise.reject(new Error('no door')); }
  catch(e){ p=Promise.reject(e); }
  return Promise.resolve(p).then(()=>{ S.granted++; lockLandscape(); return true; }, ()=>{ S.refused++; if(flow) again=true; return false; });
}
function changed(){ if(!fsOn()){ S.exits++; if(flow && !started) again=true; } if(onChange) onChange(fsOn()); }
D.addEventListener('fullscreenchange', changed); D.addEventListener('webkitfullscreenchange', changed);
/* the doors the shell uses */
export function fsBegin(){ flow=true; started=false; again=false; return ask(); }   // the tap on Begin
export const fsStarted=()=>{ started=true; };   // the camera runs: from now on an exit is the person's
export function fsFlowTap(){ if(flow && again){ again=false; S.retried++; return ask(); } return Promise.resolve(fsOn()); }   // a tap in the calibration or the cards
export const fsFlowEnd=()=>{ flow=false; again=false; };
export function fsToggle(){ if(!fsOn()) return ask(); try{ const p=D.exitFullscreen ? D.exitFullscreen() : D.webkitExitFullscreen && D.webkitExitFullscreen(); if(p && p.catch) p.catch(()=>{}); }catch(e){} return Promise.resolve(false); }
export const fsOnChange=f=>{ onChange=f; };
/* the toggle is shown where full screen can be had and is not already given by the home-screen app */
export const fsCanToggle=()=>fsApi() && !fsStandalone();
/* probe only: the counters (asked, granted, refused, exits, asked again, landscape lock) and the flow */
export const fsDbg=()=>({ ...S, on:fsOn(), api:fsApi(), standalone:fsStandalone(), flow, started, again });
