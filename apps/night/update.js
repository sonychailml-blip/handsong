/* NIGHT-14 — «A NEW VERSION IS READY». A build's service worker (sw.js, its precache) installs a new version beside the running one and waits: the
   open page keeps the files it started with, so old and new never mix. A tap on the line lets the new version take over and reloads; not tapped, the
   new version opens the next time Night is opened. NIGHT-14b: at each visit the running worker is asked to top up its cache.
   NIGHT-14d (the founder saw no line on the Poco; smoke «the "new version" line» proved it): the play's notice line lives in #nightShell, which is
   hidden on the start screen and below the start card — so the start screen has its own line (#nightUpdateStart, at the top, clear of the card),
   shown as long as the start screen shows and a newer version waits; during play the notice line shows for SHOW_MS (the coaching line steps aside
   meanwhile, so not longer). It is offered whenever a newer version waits: at the page's start, when an install finishes (one already running when
   this module starts is followed too — it used to be missed), and each time the page comes back into view (which also asks the browser to look for
   a newer version, at most once per CHECK_MS). */
import { noticeShow, noticeHide } from './notice.js';
import { t, onLangChange } from '../../core/i18n.js';

const SHOW_MS=20000, CHECK_MS=60e3, SETTLE_MS=1500;
const S={ found:0, taps:0, shownStart:0, shownPlay:0 };
const $=id=>document.getElementById(id);
let REG=null, lastCheck=0, playTimer=0;
const onStart=()=>{ const s=$('start'); return !!(s && s.classList.contains('on')); };
const muted=()=>{ try{ return !!window.__updateMute; }catch(e){ return false; } };   // the probes' CONTROL only
const isWaiting=()=>!!(REG && REG.waiting && navigator.serviceWorker.controller);   // the first precache takes over by itself: nothing waits then
function hideAll(){ clearTimeout(playTimer); playTimer=0; const b=$('nightUpdateStart'); if(b) b.hidden=true; noticeHide('update'); }
function take(){ const w=REG && REG.waiting; if(!w) return; S.taps++; hideAll();
  navigator.serviceWorker.addEventListener('controllerchange', ()=>location.reload(), { once:true }); w.postMessage({ type:'handsong-night-update' }); }
/* the line for the screen in view: the start screen's own (it stays while the start screen shows), or in play the notice line for SHOW_MS */
function show(){
  if(!isWaiting() || muted()) return;
  const b=$('nightUpdateStart');
  if(onStart() && b){ b.hidden=false; S.shownStart++; return; }
  if(b) b.hidden=true;
  noticeShow('update', 'night.update.ready', take); S.shownPlay++;
  clearTimeout(playTimer); playTimer=setTimeout(()=>{ playTimer=0; noticeHide('update'); }, SHOW_MS);
}
const offer=()=>setTimeout(()=>{ if(isWaiting()){ S.found++; show(); } }, SETTLE_MS);
const follow=w=>{ if(!w) return; if(w.state==='installed') offer(); else w.addEventListener('statechange', ()=>{ if(w.state==='installed') offer(); }); };
/* Night registers its own worker: core/legacy-ui/ui.js registers on the load event, but its module finishes evaluating after core/scales.js's top-level
   await — on a built page (modules preloaded) the load event has usually fired by then and its registration never happens. Registering the same script
   twice is harmless. */
export function updateWire(){
  if(!('serviceWorker' in navigator)) return;
  const register=()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); };
  if(document.readyState==='complete') register(); else addEventListener('load', register, { once:true });
  /* NIGHT-14c: the worker's word that every listed file is in → the page's event (scene/host.js brings a held Detailed back) */
  navigator.serviceWorker.addEventListener('message', e=>{ if(e.data && e.data.type==='handsong-night-files-in') window.dispatchEvent(new Event('night-files-in')); });
  navigator.serviceWorker.startMessages();
  const b=$('nightUpdateStart'); if(b){ b.onclick=take; const say=()=>{ b.textContent=t('night.update.ready'); }; say(); onLangChange(say); }
  navigator.serviceWorker.ready.then(reg=>{ REG=reg;
    if(reg.active) reg.active.postMessage({ type:'handsong-night-topup' });
    follow(reg.installing); if(reg.waiting) offer();
    reg.addEventListener('updatefound', ()=>follow(reg.installing));
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState!=='visible') return; if(isWaiting()) show();
      if(Date.now()-lastCheck>CHECK_MS){ lastCheck=Date.now(); reg.update().catch(()=>{}); } });
  }).catch(()=>{});
}
/* probe only: how often a waiting version was found, shown on each screen, and taken */
export const updateDbg=()=>({ ...S, waiting:isWaiting() });
