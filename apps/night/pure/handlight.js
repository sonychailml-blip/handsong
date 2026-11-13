/* NIGHT-13 — THE HAND'S LIGHT: WHERE IT SITS AND HOW BRIGHT (pure, rule #36; data row «NIGHT hand light anchor (app)»). Visual only: the gesture
   detection, which note sounds and when, and every musical value never read this. The light sits between the thumb and whichever finger is nearest to
   the thumb right now (distances over the palm — wrist to the index base —, as the pinch itself measures them). It moves to another pair only when that
   finger is clearly nearer (a relative and an absolute margin: two fingers about equally near never make it flicker), and it glides there over moveMs
   (the anchor kept relative to the thumb, so it follows the hand while gliding). While a note is held the light sits on the pair that sounds. It grows
   brighter as its finger closes on the thumb: glow 0 with the finger open (ratio ≥ far), 1 at the pinch (ratio ≤ near = the pinch's own threshold). */
export const HANDLIGHT=Object.freeze({ hyst:0.15, margin:0.03, moveMs:160, near:0.2, far:1.0, bright:Object.freeze([0.65, 0.55]) });
/* the light's strength for a glow: bright[0] + bright[1] × glow (0.65 open … 1.2 at the pinch); a view without fingertips keeps today's strength (1) */
export const handLightK=g=>HANDLIGHT.bright[0]+HANDLIGHT.bright[1]*g;
export const HANDLIGHT_GLOW_OLD=(1-HANDLIGHT.bright[0])/HANDLIGHT.bright[1];
const clamp=x=>Math.max(0, Math.min(1, x)), ease=x=>{ x=clamp(x); return x*x*(3-2*x); };
/* the glow for a thumb-to-finger ratio (distance over the palm) */
export function handLightGlow(r){ const H=HANDLIGHT; return 1-ease((r-H.near)/(H.far-H.near)); }
/* the four ratios (index … little) from the five tips [[x, y] × 5, the thumb first] and the palm (px) */
export function handLightRatios(tips, palm){ const s=palm>1e-6 ? palm : 1e-6, [tx, ty]=tips[0]; return [1, 2, 3, 4].map(j=>Math.hypot(tips[j][0]-tx, tips[j][1]-ty)/s); }
export const handLightNew=()=>({ f:1, k:1, off0:null, g0:0, off:null, glow:0 });
/* one frame: st (handLightNew() or the last state), tips, palm (px), finger (the sounding pair: 0 index … 3 little, −1 none), dt (ms), o.hyst / o.margin
   (probes: the CONTROL without hysteresis) → { st, x, y, glow, f } — f the pair's finger (1 index … 4 little) */
export function handLightStep(st, tips, palm, finger, dt, o={}){
  const H=HANDLIGHT, hy= o.hyst!=null ? o.hyst : H.hyst, mg= o.margin!=null ? o.margin : H.margin, r=handLightRatios(tips, palm), s={ ...st };
  const [tx, ty]=tips[0], offOf=j=>[(tips[j][0]-tx)/2, (tips[j][1]-ty)/2];
  let want=s.f;
  if(finger>=0 && finger<=3) want=finger+1;
  else { let j=1; for(let q=2;q<=4;q++) if(r[q-1]<r[j-1]) j=q; if(j!==s.f && r[j-1]<r[s.f-1]*(1-hy)-mg) want=j; }
  if(want!==s.f || !s.off){ s.off0= s.off ? s.off.slice() : offOf(want); s.g0= s.off ? s.glow : handLightGlow(r[want-1]); s.f=want; s.k= s.off ? 0 : 1; }
  s.k=Math.min(1, s.k+Math.max(0, dt)/H.moveMs);
  const e=ease(s.k), to=offOf(s.f), gt=handLightGlow(r[s.f-1]);
  s.off=[s.off0[0]+(to[0]-s.off0[0])*e, s.off0[1]+(to[1]-s.off0[1])*e]; s.glow=s.g0+(gt-s.g0)*e;
  return { st:s, x:tx+s.off[0], y:ty+s.off[1], glow:s.glow, f:s.f };
}
