/* NIGHT-11 part 2 — THE START'S OWN WORDS (audit W4, W9). The hand model's progress on the start card (boot's startSay); a failed start in Night's
   words, phone or computer wording, naming Night's own button (boot's failText); a link opened inside a messenger's browser → «Open this page in
   Chrome or Safari» with a copy-link button, shown at once when the browser is recognisably an app's own, and when the camera is refused faster
   than a person could answer a prompt while the browser does not report the camera as blocked (a blocked camera keeps the site-settings words). */
import { t, onLangChange } from '../../core/i18n.js';
import { inAppOf, quickDeny } from './pure/inapp.js';
import { fsStandalone } from './fullscreen.js';

const $=id=>document.getElementById(id);
/* NIGHT-11 part 3: ?probe&oldstart = the old staged start (the start-timeline row's CONTROL): no model before the tap, the camera after it, the forest after the face */
export const START_OLD=(()=>{ try{ const q=new URLSearchParams(location.search); return q.has('probe') && q.has('oldstart'); }catch(e){ return false; } })();
/* NIGHT-11 part 4: ?probe&oldflow = the old first-run order (the calibration offer, then the cards; no coaching line) — the order row's CONTROL */
export const FLOW_OLD=(()=>{ try{ const q=new URLSearchParams(location.search); return q.has('probe') && q.has('oldflow'); }catch(e){ return false; } })();
let env=null, boxOn=false, copied=false, camPerm='unknown';
try{ const q=navigator.permissions && navigator.permissions.query({ name:'camera' }); if(q) q.then(p=>{ camPerm=p.state; p.addEventListener('change', ()=>{ camPerm=p.state; }); }, ()=>{}); }catch(e){}
const envNow=()=>env || { ua:navigator.userAgent, platform:navigator.platform, touch:navigator.maxTouchPoints||0, standalone:fsStandalone() };
export const startEnv=()=>inAppOf(envNow());
function boxRender(){
  const b=$('nightInApp'); if(!b) return; b.hidden=!boxOn; if(!boxOn) return; const E=startEnv();
  $('nightInAppText').textContent=t(E.os==='ios' ? 'night.inapp.ios' : E.os==='android' ? 'night.inapp.android' : 'night.inapp.other');
  $('nightInAppUrl').value=location.href; $('nightInAppCopy').textContent=t(copied ? 'night.inapp.copied' : 'night.inapp.copy');
}
export function inAppShow(v=true){ boxOn=!!v; copied=false; boxRender(); }
/* the clipboard where the browser allows it; else the link selected in its field (the person copies it by hand) */
async function copyLink(){
  const i=$('nightInAppUrl'); let ok=false;
  try{ await navigator.clipboard.writeText(location.href); ok=true; }catch(e){}
  if(!ok){ try{ i.focus(); i.select(); ok=!!(document.execCommand && document.execCommand('copy')); }catch(e){} }
  copied=ok; boxRender(); if(!ok){ try{ i.focus(); i.select(); }catch(e){} }
}
export function startWire(){ const c=$('nightInAppCopy'); if(c) c.onclick=()=>{ copyLink(); }; onLangChange(()=>boxRender()); inAppShow(startEnv().inApp); }
/* boot's failText: Night's words for a failed start (null: core's own) */
export function startFailText(err){
  if(err && err.modelKind) return t('night.load.modelFail', { again:t('start.retry') });
  const k=err && err.camKind, E=startEnv(), w={ begin:t('night.begin') };
  if(k==='denied'){ if(E.inApp || (quickDeny(err.name, err.gumMs) && camPerm!=='denied')){ inAppShow(true); return t('night.cam.inapp'); }
    return t(E.phone ? 'night.cam.denied.phone' : 'night.cam.denied.pc', w); }
  if(k==='busy') return t(E.phone ? 'night.cam.busy.phone' : 'night.cam.busy.pc', w);
  if(k==='notfound') return t(E.phone ? 'night.cam.notfound.phone' : 'night.cam.notfound.pc', w);
  return null;
}
/* boot's startSay: the start card's line while it loads — the model's percent where the size is known */
export function startSay(key, frac){
  if(key==='load.model') return Number.isFinite(frac) ? t('night.load.modelP', { p:Math.round(frac*100) }) : t('night.load.model');
  if(key==='load.warm') return t('night.load.warm');
  if(key==='load.camera') return t('night.load.camera');
  return null;
}
/* probe only: a made-up device (null = this one); the box's state */
export const startEnvDbg=e=>{ env=e||null; inAppShow(startEnv().inApp); return startEnv(); };
export const startDbg=()=>({ box:boxOn, copied, perm:camPerm, env:startEnv() });
