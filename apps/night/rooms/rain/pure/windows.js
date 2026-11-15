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
/* RAIN-2: A WINDOW'S PROJECTED QUAD (its four corners in view-angle units, in order round it): the bake's map carries them (q); a window without them
   (the stand-in) has its rectangle's corners. The room's window shader is drawn on this quad grown by the blur radius (rain-glass.js QUAD_SD) */
export const winQuad=w=>Array.isArray(w.q) && w.q.length===4 ? w.q.map(p=>[p[0], p[1]]) : [[w.x-w.hw, w.y-w.hh], [w.x+w.hw, w.y-w.hh], [w.x+w.hw, w.y+w.hh], [w.x-w.hw, w.y+w.hh]];
/* the signed distance from p to the quad q (negative inside): the polygon's exact law, the shader's sdQ edge for edge */
export function winQuadSd(p, q){ let s=1, m=Infinity; for(const [i, j] of [[0, 3], [1, 0], [2, 1], [3, 2]]){ const v0=q[i], v1=q[j], ex=v1[0]-v0[0], ey=v1[1]-v0[1], wx=p[0]-v0[0], wy=p[1]-v0[1], t=Math.max(0, Math.min(1, (wx*ex+wy*ey)/(ex*ex+ey*ey))), qx=wx-ex*t, qy=wy-ey*t;
    m=Math.min(m, qx*qx+qy*qy); if((p[1]>=v0[1] && p[1]<v1[1] && ex*wy>ey*wx) || (p[1]<v0[1] && p[1]>=v1[1] && ex*wy<=ey*wx)) s=-s; } return s*Math.sqrt(m); }
/* the defocused window's cover at p (the shader's disc: 1 inside the quad grown by 0.7·R, 0 beyond R) */
export const winCover=(p, q, R)=>{ const d=winQuadSd(p, q), a=R, b=R*0.7, t=Math.max(0, Math.min(1, (d-a)/(b-a))); return t*t*(3-2*t); };
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
