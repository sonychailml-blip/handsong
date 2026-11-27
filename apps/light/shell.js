/* LIGHT-3 — LIGHT'S BARS, as in Night but by the founder's rule (LIGHT-1/2): one bar per effect finger — DLY VIB TRM BRT on the effects hand's side,
   shown from the moment an effects pinch starts until BAR_FX_MS after the last change; REV on the playing hand's side while it pinches and BAR_REV_MS
   after. A set's side follows its hand (40 % / 60 % of the width, hysteresis); the effects set never shares the playing hand's side. Labels: three
   English letters. Fed once per screen frame by Light's loop (boot.js onLightFrame) with Light's own hands. */
import { chainKeyOf, fxChainOf } from '../../core/state.js';
import { fxParamsOf } from '../../core/gestures/fxhand.js';
import { canvas } from '../../core/vision.js';
import { onLightFrame } from './boot.js';

export const BAR_FX_MS=1500, BAR_REV_MS=1000, SIDE_LO=0.4, SIDE_HI=0.6;
export const FX_BARS=Object.freeze([['dly','DLY'],['vib','VIB'],['trm','TRM'],['bright','BRT']]);   // finger 0…3, as data/light.json's chain
const $=id=>document.getElementById(id), SIDE={ play:'right', fx:'left' };
let fxSeen=-Infinity, revSeen=-Infinity, lastVals='', ticks=0;

/* the side law: past 40 % / 60 % of the width the side changes; between them it stays */
export function sideOf(prev, x, W){ const f=x/Math.max(1,W); return f<SIDE_LO ? 'left' : f>SIDE_HI ? 'right' : prev; }
/* the visibility law: shown while active and for `hold` ms after the last activity */
export const shownAt=(seen, now, hold)=> now-seen<hold;

/* a bar shows its effect's DRIVEN value (the one its hand moves — for the reverb the mix, its third parameter), from the live chain */
export const drivenIndex=id=>{ const e=fxChainOf(chainKeyOf('ld')).find(x=>x.fxId===id); const i=e ? e.params.findIndex(q=>q.mode==='drive') : -1; return i<0 ? 0 : i; };
const valOf=id=>{ const p=fxParamsOf(chainKeyOf('ld'), id)[drivenIndex(id)]; return p ? Math.max(0, Math.min(1, +p.get()||0)) : 0; };
function place(el, side){ el.classList.toggle('left', side==='left'); el.classList.toggle('right', side!=='left'); }
function fill(bar, v){ bar.querySelector('.light-bar-fill').style.height=(v*100).toFixed(1)+'%'; }

function frame(now, hands){
  ticks++;
  const W=canvas.width||innerWidth, play=hands.find(h=>h.play), fx=hands.find(h=>!h.play), F=$('lightFxBars'), R=$('lightRevBar');
  const vals=FX_BARS.map(([id])=>valOf(id)), key=vals.map(v=>v.toFixed(3)).join();
  if((fx && fx.pinch) || (key!==lastVals && lastVals!=='')) fxSeen=now;
  lastVals=key;
  if(play && play.pinch) revSeen=now;
  if(play) SIDE.play=sideOf(SIDE.play, play.x, W);
  if(fx){ let s=sideOf(SIDE.fx, fx.x, W); if(play && s===SIDE.play) s= SIDE.play==='left' ? 'right' : 'left'; SIDE.fx=s; }
  place(R, SIDE.play); place(F, SIDE.fx);
  FX_BARS.forEach(([id],i)=>{ const b=F.querySelector(`[data-bar="${id}"]`); fill(b, vals[i]); b.classList.toggle('act', !!(fx && fx.pinch && fx.finger===i)); });
  const rb=R.querySelector('.light-bar'); fill(rb, valOf('reverb')); rb.classList.toggle('act', !!(play && play.pinch));
  F.classList.toggle('on', shownAt(fxSeen, now, BAR_FX_MS));
  R.classList.toggle('on', shownAt(revSeen, now, BAR_REV_MS));
}
export function lightShellWire(){ onLightFrame(frame); }
/* probe only: the bars' state */
export const lightShellDbg=()=>{ const F=$('lightFxBars'), R=$('lightRevBar'), h=b=>b.querySelector('.light-bar-fill').style.height;
  return { fx:{ on:F.classList.contains('on'), side:F.classList.contains('left')?'left':'right', bars:Object.fromEntries(FX_BARS.map(([id])=>[id, h(F.querySelector(`[data-bar="${id}"]`))])) },
    rev:{ on:R.classList.contains('on'), side:R.classList.contains('left')?'left':'right', h:h(R.querySelector('.light-bar')) }, running:ticks>0 }; };
