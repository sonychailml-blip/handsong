/* RAIN-0: THE WINDOWS — their places on the placeholder city, which one a note lights, and how a lit window fades (pure, rule #36; data rows
   «RAIN window pick (app)», «RAIN window fade (app)»). Places are in VIEW-ANGLE units (the tangent of the angle from the view's axis, x right,
   y up): the world is fixed and a screen is a crop of it, so the same window is under the same direction on every screen.
   The placeholder: two plain houses (a near one with larger windows, a farther one) and far lights on a hill line. PLAN.md slice 1 replaces the
   layout with the real facade seen from the 8th floor; the pick and the fade stay. */
import { seeded } from '../../../../../core/pure/dsp.js';

export const RAIN_SEED=0x5241494E;
/* the placeholder houses: x0…x1, the ground line y0 and the roof line y1; the window grid (pitch px, py; a window's half size hw, hh) */
export const HOUSES=Object.freeze([
  Object.freeze({ x0:-1.34, x1:0.5, y0:-0.9, y1:0.115, px:0.108, py:0.142, hw:0.027, hh:0.045, top:0.02 }),
  Object.freeze({ x0:0.6, x1:1.34, y0:-0.9, y1:0.03, px:0.071, py:0.096, hw:0.017, hh:0.029, top:-0.035 }),
]);
export const HILL=Object.freeze({ y:0.2, amp:0.05 });   // the far hill line's height and its swell
/* the hill line's height at x (painted and used for the far lights alike) */
export const hillAt=x=> HILL.y+HILL.amp*(0.6*Math.sin(x*2.1+0.7)+0.4*Math.sin(x*5.3+2.1));
/* every window: { x, y (its centre), hw, hh, house, amb (0…1: lit by the city itself when under the mood's share), warm (0…1: honey … amber) } */
export function windowsLayout(){
  const R=seeded(RAIN_SEED), out=[];
  HOUSES.forEach((H, hi)=>{ const cols=Math.floor((H.x1-H.x0-H.px*0.4)/H.px), x00=(H.x0+H.x1)/2-(cols-1)*H.px/2;
    for(let y=H.top-H.hh; y-H.hh>H.y0+0.02; y-=H.py) for(let c=0;c<cols;c++) out.push({ x:x00+c*H.px, y, hw:H.hw, hh:H.hh, house:hi, amb:R(), warm:R() }); });
  return out;
}
/* the far lights on the hill: n of them → { x, y, k (brightness 0…1), warm } */
export function farLights(n){ const R=seeded(RAIN_SEED^0x48494C4C), out=[];
  for(let i=0;i<n;i++){ const x=-1.4+2.8*R(), u=R(); out.push({ x, y:hillAt(x)-0.004-0.07*u*u, k:0.35+0.65*R(), warm:R() }); }
  return out; }
/* WHICH WINDOW A NOTE LIGHTS: the light points at (x, y). The window it is inside (the nearest centre if two could claim it); else the nearest
   window whose edge is within `reach`; else none (−1). Distances are to a window's rectangle, so a point just beside a window picks it. */
export const PICK_REACH=0.06;
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
