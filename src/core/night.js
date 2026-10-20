/* RUN 9 — THE NIGHT over the forest, as numbers. CORE: pure (rule #36), node-tested (data row «NIGHT cycle (core)»): the room only draws
   what these functions give, so a probe can compare any moment exactly on any device.
   - The night's slow CYCLE (NIGHT.period = 24 min, a seamless loop — every term repeats exactly at the period): the moon drifts on a small
     closed path; clouds pass over it now and then (the moon's light dims and returns); four mist layers roll in and out, each at its own
     whole number of cycles per period (never all together). The first NIGHT.clouds.clear seconds are clear (the first look is the moon).
   - SLEEP: with the sleep timer on, the night deepens and calms towards its end (darker, stiller, fewer firefly lights, more mist).
   - MOODS: each Calm mood (a mode id) has its own look — the colour tokens' set and the fog / mist amounts. */
import { seeded } from './dsp.js';

const TAU=2*Math.PI;
export const NIGHT=Object.freeze({
  period:1440, seed:0x4E494748,
  moon:Object.freeze({ x:-14, y:23, z:-55, ax:5, ay:1.6 }),       // the drift path (world units), above most trunk tops so it shows between them
  clouds:Object.freeze({ n:7, clear:150, wLo:35, wHi:95, dLo:0.5, dHi:0.95, span:13 }),   // passes per period; half-widths (s); densities; drift span
  dim:0.72,                                                         // the moon's light under a full cloud: × (1 − dim·cover)
  mist:Object.freeze({ cycles:Object.freeze([1,2,3,2]), lo:0.3, hi:1, rise:0.22 }),
});
const clamp01=v=>Math.max(0, Math.min(1, v));
const smooth=u=>u*u*(3-2*u);
/* the cloud passes of one period (seeded once): { at (s), w (half-width, s), dens, y (offset above / below the moon) }. Their spans stay inside
   (clear, period) — no pass crosses the loop's seam, so the cycle is seamless by construction */
export const CLOUD_PASSES=(()=>{ const C=NIGHT.clouds, R=seeded(NIGHT.seed), out=[], slot=(NIGHT.period-C.clear-C.wHi)/C.n;
  for(let i=0;i<C.n;i++){ const w=C.wLo+R()*(C.wHi-C.wLo), at=C.clear+w+i*slot+R()*Math.max(0, slot-w); out.push(Object.freeze({ at, w, dens:C.dLo+R()*(C.dHi-C.dLo), y:(R()-0.5)*3 })); }
  return Object.freeze(out); })();
const MIST_PH=(()=>{ const R=seeded(NIGHT.seed^0x9E3779B9); return Object.freeze(NIGHT.mist.cycles.map(()=>R()*TAU)); })();
/* the night at time t (seconds) → { phase 0…1, moon:[x,y,z], cover 0…1, moonLight 0…1, clouds:[{ u −1…1 (its drift across the moon; |u|≥1 =
   away), dens, y }], mist:[0…1 per layer], rise:[world units per layer] } */
export function nightAt(t){
  const P=NIGHT.period, tp=((t%P)+P)%P, th=TAU*tp/P, M=NIGHT.moon, C=NIGHT.clouds, Mi=NIGHT.mist;
  const moon=[M.x+M.ax*Math.sin(th), M.y+M.ay*Math.sin(2*th+0.7), M.z];
  let clear=1; const clouds=CLOUD_PASSES.map(p=>{ const u=(tp-p.at)/p.w, k= Math.abs(u)<1 ? 0.5+0.5*Math.cos(Math.PI*u) : 0; clear*=1-p.dens*k; return { u:Math.max(-1.5, Math.min(1.5, u)), dens:p.dens, y:p.y }; });
  const cover=1-clear, mist=[], rise=[];
  Mi.cycles.forEach((c,i)=>{ const a=c*th+MIST_PH[i]; mist.push(Mi.lo+(Mi.hi-Mi.lo)*(0.5-0.5*Math.cos(a))); rise.push(Mi.rise*Math.sin(a+1.1)); });
  return { phase:tp/P, moon, cover, moonLight:1-NIGHT.dim*cover, clouds, mist, rise };
}
/* the sleep timer's progress s (0 = just set … 1 = its end; null / 0 = no timer) → the night's DEPTH multipliers. Gentle at first, deepest at
   the end (smoothstep of s^1.3): light ×0.45, firefly lights ×0.4, motion ×0.5, mist ×1.5, the leaves' sway ×0.3 */
export function nightDeep(s){
  const e=smooth(clamp01(Math.pow(clamp01(+s||0), 1.3)));
  return { e, light:1-0.55*e, flies:1-0.6*e, motion:1-0.5*e, mist:1+0.5*e, sway:1-0.7*e };
}
/* the sleep timer → its progress 0…1 (the timer's own start and minutes, ms clock) */
export const sleepProgress=(t0, mins, now)=> mins>0 ? clamp01((now-t0)/(mins*60e3)) : 0;
/* THE MOODS' LOOKS (Calm plan §4.5): a mode id → its look; colours are token names (palette.cv), the room lerps between looks (τ MOOD_TC s) */
export const MOOD_TC=2.5;
const LOOK=(pre, fog, mist, flies)=>Object.freeze({ pre, fog, mist, flies,
  tokens:Object.freeze({ fog:pre+'fog', sky:pre+'sky', under:pre+'under', moon:pre+'moon', moonhalo:pre+'moonhalo', haze:pre+'haze', cloud:pre+'cloud',
    shroom:pre+'shroom', bloom:pre+'bloom' }) });   // slice 2: the glowing mushrooms' and flowers' colours
export const MOOD_LOOKS=Object.freeze({
  glow:LOOK('forest-', 0.06, 1, 1),            // Glow — the forest as it was (the base tokens)
  dusk:LOOK('forest-dusk-', 0.052, 0.8, 0.9),  // Dusk — violet sky, a warm low moon, less mist
  mist:LOOK('forest-misty-', 0.085, 1.7, 0.8), // Mist — pale blue-grey, thick mist, a shorter view
});
export const MOOD_OF=Object.freeze({ 'major-penta':'glow', 'minor-penta':'dusk', 'egyptian':'mist' });
export const moodLook=id=>MOOD_LOOKS[MOOD_OF[id]||id] || MOOD_LOOKS.glow;
/* RUN 9 (slice 4): RARE EVENTS — every few minutes, never the same kind twice in a row. Timed: a FALLING STAR or the fireflies forming the
   FIVE-DOT EMBLEM (the Hush mark) — due every gapLo…gapHi s after the last event, the kind drawn (star more often) among those ≠ the last.
   Played: a glowing flower OPENS when a note has been held ≥ hold s — if bloomGap s passed since the last event and the last was not a
   flower. Seeded: the same seed and the same held notes give the same night. st = rareInit(seed, t0); rareStep(st, t, held) → a kind or
   null (st advances). opt.repeat (probe CONTROL only) drops the «never twice in a row» rule. */
export const RARE=Object.freeze({ seed:0x52415245, first:Object.freeze([100, 170]), gapLo:150, gapHi:290, bloomGap:60, hold:2.5,
  timed:Object.freeze([['star',0.62],['emblem',0.38]]) });
export function rareInit(seed=RARE.seed, t0=0, opt={}){ const R=seeded(seed); return { R, next:t0+RARE.first[0]+R()*(RARE.first[1]-RARE.first[0]), last:null, lastAt:t0, n:0, repeat:!!opt.repeat }; }
export function rareStep(st, t, held=0){
  const ok=k=>st.repeat || k!==st.last, fire=k=>{ st.last=k; st.lastAt=t; st.n++; st.next=t+RARE.gapLo+st.R()*(RARE.gapHi-RARE.gapLo); return k; };
  if(held>=RARE.hold && ok('bloom') && t-st.lastAt>=RARE.bloomGap) return fire('bloom');
  if(t<st.next) return null;
  const C=RARE.timed.filter(([k])=>ok(k)), sum=C.reduce((a,[,w])=>a+w,0); let u=st.R()*sum;
  for(const [k,w] of C){ if((u-=w)<=0) return fire(k); } return fire(C[C.length-1][0]);
}
/* the emblem's five dots (icons.js EMBLEM: 150 × 30, the centre one lime) as world points of the forest: an arc above the aisle */
export const EMBLEM_AT=Object.freeze({ x:0, y:2.75, z:-1.5, w:3.2, h:0.75, per:3 });
export const emblemPoints=()=>[[15,24],[45,12],[75,6],[105,12],[135,24]].map(([cx,cy])=>[EMBLEM_AT.x+(cx-75)/150*EMBLEM_AT.w, EMBLEM_AT.y-(cy-15)/30*EMBLEM_AT.h, EMBLEM_AT.z]);
