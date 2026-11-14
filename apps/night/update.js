/* NIGHT-14 — «A NEW VERSION IS READY». A build's service worker (sw.js, its precache) installs a new version beside the running one and waits: the
   open page keeps the files it started with, so old and new never mix. This says so quietly on the one notice line (notice.js, the lowest priority;
   gone after SHOW_MS); a tap lets the new version take over and reloads. Not tapped: the new version opens the next time Night is opened. The
   browser looks for a new version at each visit; a page left open looks again when it comes back into view, at most once an hour. NIGHT-14b: at
   each visit the running worker is asked to top up its cache (the files installed after the start set, or left by a visit cut short). */
import { noticeShow, noticeHide } from './notice.js';

const SHOW_MS=20000, CHECK_MS=3600e3, SETTLE_MS=1500;
const S={ found:0, taps:0 };
let lastCheck=Date.now();
function offer(reg){
  /* the first precache takes over by itself right after installing: offer only a version that is still waiting a moment later */
  setTimeout(()=>{
    const w=reg.waiting; if(!w || !navigator.serviceWorker.controller) return;
    S.found++;
    noticeShow('update', 'night.update.ready', ()=>{ S.taps++; noticeHide('update');
      navigator.serviceWorker.addEventListener('controllerchange', ()=>location.reload(), { once:true });
      (reg.waiting||w).postMessage({ type:'handsong-night-update' }); });
    setTimeout(()=>noticeHide('update'), SHOW_MS);
  }, SETTLE_MS);
}
/* Night registers its own worker: core/legacy-ui/ui.js registers on the load event, but its module finishes evaluating after core/scales.js's top-level
   await — on a built page (modules preloaded) the load event has usually fired by then and its registration never happens. Registering the same script
   twice is harmless. */
export function updateWire(){
  if(!('serviceWorker' in navigator)) return;
  const register=()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); };
  if(document.readyState==='complete') register(); else addEventListener('load', register, { once:true });
  navigator.serviceWorker.ready.then(reg=>{
    if(reg.active) reg.active.postMessage({ type:'handsong-night-topup' });
    if(reg.waiting) offer(reg);
    reg.addEventListener('updatefound', ()=>{ const w=reg.installing; if(w) w.addEventListener('statechange', ()=>{ if(w.state==='installed') offer(reg); }); });
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && Date.now()-lastCheck>CHECK_MS){ lastCheck=Date.now(); reg.update().catch(()=>{}); } });
  }).catch(()=>{});
}
/* probe only: how often a waiting version was offered and taken */
export const updateDbg=()=>({ ...S });
