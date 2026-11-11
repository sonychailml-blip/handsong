/* NIGHT-9 — THE STREAM'S FLOW, as numbers (pure, rule #36; data row «FOREST water flow (app)»). The water shader (../forest-life.js) reads
   these per vertex of its ribbon:
   - WIDTH along the stream, a factor of its half-width (STREAM.half): pools a little wider, narrows a little narrower (a smooth seeded walk
     between WATER_FLOW.width); the carved bed is wider than the widest water, so the bank slope takes the change;
   - SPEED: what goes through a narrow goes faster — speed ∝ 1/width (the same water through every section) — and a little faster where the
     bed falls (the path's own slope), bounded by WATER_FLOW.speed.
   u: 0 at the stream's far end … 1 at its near end (the ribbon's own u). */
import { seeded } from '../../../../../core/pure/dsp.js';
export const WATER_FLOW=Object.freeze({ seed:0x464C4F57, knots:24, width:Object.freeze([0.78, 1.25]), slope:2.5, speed:Object.freeze([0.55, 1.7]) });

let KN=null;
function knots(){ if(KN) return KN; const R=seeded(WATER_FLOW.seed), W=WATER_FLOW.width; KN=Array.from({ length:WATER_FLOW.knots+3 }, ()=>W[0]+R()*(W[1]-W[0])); return KN; }
const cr=(p0, p1, p2, p3, t)=>{ const t2=t*t, t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); };
/* the water's half-width factor at u (smooth: a Catmull–Rom through seeded knots, clamped to the range) */
export function waterWidth(u){ const K=knots(), n=WATER_FLOW.knots, x=Math.max(0, Math.min(1, u))*n, i=Math.min(n-1, Math.floor(x)), t=x-i, W=WATER_FLOW.width;
  return Math.max(W[0], Math.min(W[1], cr(K[i], K[i+1], K[i+2], K[i+3], t))); }
/* the flow's speed factor at u; dy: the bed's fall per metre there (positive downhill, towards the near end) */
export function waterSpeed(u, dy=0){ const S=WATER_FLOW.speed; return Math.max(S[0], Math.min(S[1], (1/waterWidth(u))*(1+WATER_FLOW.slope*Math.max(0, dy)))); }
