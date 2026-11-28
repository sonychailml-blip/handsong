/* LIGHT-10 — OFFLINE AND «A NEW VERSION IS READY» (Night's way, apps/night/update.js, Light's own copy). The worker (sw.js) is registered only AFTER
   the start on a first visit (the founder: loaded in the background once playing — the first load is never slowed); a visit that already has it
   registers at once (the browser then looks for a newer version). A build's worker installs a new version beside the running one and waits, so the
   open page keeps the files it started with: a line offers it — on the start screen its own line at the top while the start shows, in play a pill at
   the top for SHOW_MS; a tap lets the new version take over and reloads; not tapped, it opens the next time Handsong is opened. At each visit the
   running worker is asked to top up its cache; coming back into view asks the browser to look for a newer version (at most once per CHECK_MS). */
import { t, onLangChange } from '../../core/i18n.js';
import { onLightStart } from './boot.js';

export const UPDATE=Object.freeze({ showMs:20000, checkMs:60e3, settleMs:1500 });
const S={ registered:0, found:0, taps:0, shownStart:0, shownPlay:0 };
const $=id=>document.getElementById(id);
let REG=null, lastCheck=0, playTimer=0, wired=false;
const onStart=()=>{ const s=$('start'); return !!(s && s.classList.contains('on')); };
const isWaiting=()=>!!(REG && REG.waiting && navigator.serviceWorker.controller);   // the first precache takes over by itself: nothing waits then
function hideAll(){ clearTimeout(playTimer); playTimer=0; for(const id of ['lightUpdateStart','lightUpdatePlay']){ const b=$(id); if(b) b.hidden=true; } }
function take(){ const w=REG && REG.waiting; if(!w) return; S.taps++; hideAll();
  navigator.serviceWorker.addEventListener('controllerchange', ()=>location.reload(), { once:true }); w.postMessage({ type:'handsong-light-update' }); }
function show(){
  if(!isWaiting()) return;
  const a=$('lightUpdateStart'), b=$('lightUpdatePlay');
  if(onStart()){ a.hidden=false; b.hidden=true; S.shownStart++; return; }
  a.hidden=true; b.hidden=false; S.shownPlay++;
  clearTimeout(playTimer); playTimer=setTimeout(()=>{ playTimer=0; b.hidden=true; }, UPDATE.showMs);
}
const offer=()=>setTimeout(()=>{ if(isWaiting()){ S.found++; show(); } }, UPDATE.settleMs);
const follow=w=>{ if(!w) return; if(w.state==='installed') offer(); else w.addEventListener('statechange', ()=>{ if(w.state==='installed') offer(); }); };
function register(){
  if(wired) return; wired=true; S.registered++;
  navigator.serviceWorker.register('sw.js').catch(()=>{});
  navigator.serviceWorker.ready.then(reg=>{ REG=reg;
    if(reg.active) reg.active.postMessage({ type:'handsong-light-topup' });
    follow(reg.installing); if(reg.waiting) offer();
    reg.addEventListener('updatefound', ()=>follow(reg.installing));
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState!=='visible') return; if(isWaiting()) show();
      if(Date.now()-lastCheck>UPDATE.checkMs){ lastCheck=Date.now(); reg.update().catch(()=>{}); } });
  }).catch(()=>{});
}
export function lightUpdateWire(){
  for(const id of ['lightUpdateStart','lightUpdatePlay']){ const b=$(id); if(b) b.onclick=take; }
  const say=()=>{ for(const id of ['lightUpdateStart','lightUpdatePlay']){ const b=$(id); if(b) b.textContent=t('light.update.ready'); } }; say(); onLangChange(say);
  if(!('serviceWorker' in navigator)) return;
  if(navigator.serviceWorker.controller){ if(document.readyState==='complete') register(); else addEventListener('load', register, { once:true }); }   // installed already
  onLightStart(register);   // a first visit: once playing
}
/* probe only: registered, a waiting version found, shown on each screen, taken; and the worker's state */
export const lightUpdateDbg=()=>({ ...S, waiting:isWaiting(), wired, controller:!!(navigator.serviceWorker && navigator.serviceWorker.controller) });
