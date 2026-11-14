/* RAIN-0: THE WINDOWS — their places, which one a note lights, and how a lit window fades (pure, rule #36; data rows «RAIN window pick (app)»,
   «RAIN window fade (app)»). Places are in VIEW-ANGLE units (the tangent of the angle from the view's axis, x right, y up): the world is fixed and a
   screen is a crop of it, so the same window is under the same direction on every screen.
   RAIN-0b: the windows are the stand-in city's, projected by the view law (pure/city.js cityWindows: both rows of the boulevard, each window with
   its depth); the far lights lie where the law sees the hills and the far roofs. PLAN.md's baked city brings its own exact window map; the pick
   and the fade stay. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { cityWindows, sceneAt, vanishing } from './city.js';

export const RAIN_SEED=0x5241494E;
/* every window: { x, y (its centre), hw, hh, depth, side, floor, z, amb (0…1: lit by the city itself when under the mood's share), warm } */
export const windowsLayout=()=>cityWindows();
/* the far lights: n of them on the hills and the far roofs → { x, y, k (brightness 0…1), warm, depth }; seeded, each where the law sees hills or roofs */
export function farLights(n){
  const R=seeded(RAIN_SEED^0x48494C4C), out=[], hor=vanishing().horizon;
  for(let g=0;out.length<n && g<n*40;g++){ const x=-1.45+2.9*R(), u=R(), y=hor-0.03+0.11*u*u, s=sceneAt(x, y);
    if(s.kind==='hills' || (s.kind==='roofs' && s.dist>300)) out.push({ x, y, k:0.35+0.65*R(), warm:R(), depth:s.depth }); }
  return out;
}
/* WHICH WINDOW A NOTE LIGHTS: the light points at (x, y). The window it is inside (the nearest centre if two could claim it); else the nearest
   window whose edge is within `reach`; else none (−1). Distances are to a window's rectangle, so a point just beside a window picks it. */
export const PICK_REACH=0.04;
export function windowPick(W, x, y, reach=PICK_REACH){
  let best=-1, bd=Infinity, bc=Infinity;
  for(let i=0;i<W.length;i++){ const w=W[i], dx=Math.max(0, Math.abs(x-w.x)-w.hw), dy=Math.max(0, Math.abs(y-w.y)-w.hh), d=Math.hypot(dx, dy), c=Math.hypot(x-w.x, y-w.y);
    if(d<bd-1e-12 || (Math.abs(d-bd)<=1e-12 && c<bc)){ best=i; bd=d; bc=c; } }
  return bd<=reach ? best : -1;
}
/* THE TRACE: a lit window's light `age` seconds after its note. On in a moment (a lamp warming up), full while `hold`, then down slowly: most
   of it over about a minute, the rest (the pattern the city keeps) over many minutes. Never up, never a jump. Before the note: 0. */
export const TRACE=Object.freeze({ rise:0.09, hold:14, keep:0.32, fall:50, keepFall:840 });
export function traceLevel(age){
  if(!(age>=0)) return 0;
  const up=1-Math.exp(-age/TRACE.rise); if(age<=TRACE.hold) return up;
  const a=age-TRACE.hold; return up*(TRACE.keep*Math.exp(-a/TRACE.keepFall)+(1-TRACE.keep)*Math.exp(-a/TRACE.fall));
}
/* a window's light now: the city's own (its amb under the mood's share → a steady glow) or the trace of the last note on it, whichever is brighter */
export const AMB_LEVEL=0.72;
export const windowLight=(w, share, age)=>Math.max(w.amb<share ? AMB_LEVEL*(0.75+0.25*w.warm) : 0, traceLevel(age));
