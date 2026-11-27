/* LIGHT-4 — THE HAND SETUP, as in Night (the founder): the playing hand held at the nearest point it reaches while playing, the whole hand in the
   frame; depth then counts from that point (0 near … 1 at the far end, within arm's reach). Built on core's PURE laws (core/pure/handcal.js: the
   routine createCalRun with farHold, calDepth, calFilter, calHold, calBand, calFarBase, calCameraKey) — not on core/handcal.js, which imports the
   recorder (Light holds none of Full's code). Kept per camera on this device (namespaced «light»), numbers only (rule #33): the near size and the
   hold's noise. Offered once after the first start; «Set up again» in the sensitivity sheet. While it runs the hands play nothing. */
import { CAL, createCalRun, calDepth, calFilter, calHold, calBand, calFarBase, calSize, calCameraKey } from '../../core/pure/handcal.js';
import { camLabel } from '../../core/vision.js';
import { camFacing } from '../../core/state.js';
import { nsKey } from '../../core/storens.js';
import { t } from '../../core/i18n.js';
import { setLightDepthLaw } from './gestures.js';

const STORE=nsKey('handsong.lightHand'), OFFERED=nsKey('handsong.lightHandOffered');
const $=id=>document.getElementById(id);
let rec=null, run=null, onChange=null, travel=1, clock=null;
const camKey=()=>calCameraKey(camLabel(), camFacing);
const load=()=>{ try{ const s=localStorage.getItem(STORE); const r=s ? JSON.parse(s) : null; return r && typeof r==='object' ? r : {}; }catch(e){ return {}; } };
const save=()=>{ try{ localStorage.setItem(STORE, JSON.stringify(rec)); }catch(e){} };
const cam=()=>{ const c=(rec||{})[camKey()]; return c && c.near>0 ? c : null; };
export const lightCalOn=()=>!!cam();
/* the travel slider on the calibrated law: s > 1 shortens the travel, s < 1 lengthens it; never below CAL.depthMin (the far end within reach) */
export const setLightCalTravel=v=>{ travel=Math.max(CAL.depthMin, Math.pow(2, -(+v||0))); };
/* the calibrated depth of a hand this frame: one filter step on the hand's own state (S.cal), the hold band, then the law */
function depthOf(S, lm){ const c=cam(); if(!c) return null;
  let st=S.cal; if(!st || st.near!==c.near || S.seen-st.t>CAL.blinkMs) st=S.cal={ near:c.near };
  const r=calHold(st, calFilter(st, calSize(lm), S.seen)/c.near, calBand(c.noise));
  return calDepth(r, c.noise, travel, calFarBase(c.near)); }
function apply(){ setLightDepthLaw(cam() ? depthOf : null); if(onChange) onChange(); }

/* ── the routine: a frame's hands go here while it runs (boot.js), and the hands play nothing ── */
export const lightCalBusy=()=>!!run && ['waitHand','holdNear'].includes(run.state().phase);
let PRB=false;   // probe only: while set, the app loop's frames are ignored and the probe drives the routine with its own clock
export const lightCalProbeSet=v=>{ PRB=!!v; };
export function lightCalFrameProbe(res, t){ const p=PRB; PRB=false; try{ lightCalFrame(res, t); } finally { PRB=p; } }
export function lightCalFrame(res, now){
  if(!run || PRB) return;
  const hands=(res&&res.landmarks)||[], heads=(res&&(res.handednesses||res.handedness))||[];
  const st=run.frame({ t:now, hands, labels:heads.map(h=>h&&h[0]&&h[0].categoryName) });
  if(st.phase==='review'){ const r=run.accept(); rec={ ...(rec||{}), [camKey()]:{ near:+r.near.toFixed(5), noise:+r.noise.toFixed(5) } }; save(); apply(); show('done'); run=null; return; }
  if(st.phase==='failed'){ show('failed', st.reason); run=null; return; }
  show('measure', null, st);
}
export function lightCalStart(now=performance.now()){ run=createCalRun({ t:now, hand:null, farHold:true }); show('measure', null, run.state(now)); }
export function lightCalCancel(){ if(run) run.cancel(); run=null; show(null); }
export function lightCalOffer(){ let seen=false; try{ seen=localStorage.getItem(OFFERED)==='1'; }catch(e){} if(seen || lightCalOn()) return false;
  try{ localStorage.setItem(OFFERED,'1'); }catch(e){} show('offer'); return true; }
/* LIGHT-9: the offer no longer comes before the first sound — once the person has PLAYED about a minute (a hand with a note function in view)
   and then takes the hands out of view, when nothing else is open (blocked: the cards, a sheet, a clip) */
export const CAL_OFFER=Object.freeze({ afterMs:60e3, idleMs:1500, stepMs:100 });
const offerDue=()=>{ try{ if(localStorage.getItem(OFFERED)==='1') return false; }catch(e){} return !lightCalOn() && !run; };
let offerPlay=0, offerLast=null, offerHand=-Infinity;
export function lightCalOfferTick(now, hands, blocked){
  const dt= offerLast==null ? 0 : Math.max(0, Math.min(CAL_OFFER.stepMs, now-offerLast)); offerLast=now;
  if(hands.length){ offerHand=now; if(hands.some(h=>h.play)) offerPlay+=dt; }
  if(offerPlay<CAL_OFFER.afterMs || now-offerHand<CAL_OFFER.idleMs || blocked || !offerDue()) return false;
  return lightCalOffer(); }
export const lightCalOfferResetDbg=()=>{ offerPlay=0; offerLast=null; offerHand=-Infinity; };

/* ── the screens: offer, measure (the frame, one line, the progress), done, failed ── */
const ADVICE={ back:'light.cal.back', closer:'light.cal.closer', still:'light.cal.still' };
function show(kind, reason, st){
  const O=$('lightCal'); if(!O) return;
  O.hidden=!kind; O.dataset.kind=kind||'';
  if(!kind) return;
  const T=$('lightCalTitle'), P=$('lightCalText'), bar=$('lightCalProg'), go=$('lightCalGo'), no=$('lightCalNo');
  $('lightCalFrame').hidden= kind!=='measure'; bar.parentElement.hidden= kind!=='measure';
  if(kind==='offer'){ T.textContent=t('light.cal.offerT'); P.textContent=t('light.cal.offer'); go.textContent=t('light.cal.set'); no.textContent=t('light.cal.skip'); go.hidden=false; no.hidden=false; }
  else if(kind==='measure'){ T.textContent=t('light.cal.near'); P.textContent= st && st.advice ? t(ADVICE[st.advice]||'light.cal.wait') : st && st.progress>0 ? t('light.cal.hold') : t('light.cal.wait');
    bar.style.width=Math.round(100*(st ? st.progress : 0))+'%'; go.hidden=true; no.textContent=t('light.cal.cancel'); no.hidden=false; }
  else if(kind==='done'){ T.textContent=t('light.cal.doneT'); P.textContent=t('light.cal.done'); go.textContent=t('light.ok'); go.hidden=false; no.hidden=true; }
  else if(kind==='failed'){ T.textContent=t('light.cal.failT'); P.textContent=t(reason==='too-far' ? 'light.cal.closer' : reason==='not-still' ? 'light.cal.still' : 'light.cal.fail'); go.textContent=t('light.cal.again'); no.textContent=t('light.cal.cancel'); go.hidden=false; no.hidden=false; }
}
export function lightCalWire(changed, now=()=>performance.now()){
  onChange=changed; clock=now; rec=load(); apply();
  $('lightCalGo').onclick=()=>{ const k=$('lightCal').dataset.kind; if(k==='offer' || k==='failed') lightCalStart(clock()); else show(null); };
  $('lightCalNo').onclick=()=>lightCalCancel();
}
/* the camera changed (flip): its own record, or none */
export const lightCalCamera=()=>apply();
/* probe only */
export const lightCalDbg=()=>({ on:lightCalOn(), cam:cam(), busy:lightCalBusy(), kind:($('lightCal')||{}).dataset ? $('lightCal').dataset.kind : null, travel });
export function lightCalForgetDbg(){ rec={}; save(); try{ localStorage.removeItem(OFFERED); }catch(e){} apply(); }
