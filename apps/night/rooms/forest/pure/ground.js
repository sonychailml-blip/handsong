/* NIGHT-8 — THE BARE GROUND'S LARGE SCALE and its SMALL THINGS, as numbers. Pure (rule #36), node-tested (data row «FOREST ground (app)»): the
   bake tool paints the macro map from macroAt (tools/forest-bake.mjs, files groundm-*), the room places the litter from litterPlaces — the
   same law, so the leaves lie where the map shows a drift.
   - macroAt(x, z) → [damp, moss, drift, sel], each 0…1, over the whole floor (MACRO: 90 m square): DAMP dark soil in patches, near the stream and
     in its bed; MOSS round the trunks' feet, along the banks and in patches; DRIFTS of fallen leaves and needles — long streaks along the wind and
     crescents against the trunks on their lee side; SEL — where the ground's second, turned copy of its texture shows (the room blends the two
     by it, so the 6-m tile never repeats visibly).
   - litterPlaces(counts, trunks): fallen leaves (more where the drift is), pebbles (where the soil is bare or damp), twigs (under the trunks),
     never in the water, never under the eye. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { fbm } from './floor.js';
import { streamNear, bankGround, STREAM } from './forestlife.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
export const MACRO=F({ x0:-45, z0:-45, size:90, wind:F([0.6, 0.8]), files:F({ size:1024, derived:F([512, 256]) }) });
export const LITTER=F({ seed:0x4C495454, x:F([-7.5, 7.5]), z:F([-15, 4.6]), eye:F([0, 5.5]), eyeR:1.6, leafW:F([0.09, 0.16]), pebble:F([0.025, 0.07]), twig:F({ len:F([0.12, 0.5]), r:F([0.004, 0.012]), near:4 }) });
/* the nearest trunk's distance beyond its radius, and the direction from it (trunks: [[x, z, r]]) */
function trunkNear(x, z, trunks){ let best=Infinity, dx=0, dz=0;
  for(const [tx, tz, r] of trunks){ const ax=x-tx, az=z-tz, d=Math.hypot(ax, az)-r; if(d<best){ best=d; dx=ax; dz=az; } }
  const l=Math.hypot(dx, dz)||1; return { d:best, ux:dx/l, uz:dz/l }; }
/* (x, z), the trunks, the stream's distance when known → [damp, moss, drift, sel] */
export function macroAt(x, z, trunks, sd=streamNear(x, z).d){
  const n1=fbm(x/7+11, z/7+3), n2=fbm(x/4.5+31, z/4.5+17), n3=fbm(x/1.1+5, z/1.1+41), W=MACRO.wind, tn=trunkNear(x, z, trunks);
  const bank=sd-STREAM.half;
  const damp=clamp(smooth(0.52, 0.72, n1)*0.75+smooth(2.2, 0.2, bank)*0.85+(bank<0 ? 1 : 0), 0, 1);
  const moss=clamp(smooth(1.5, 0.15, tn.d)*0.85+smooth(1.4, 0.5, bank)*smooth(-0.05, 0.25, bank)*0.7+smooth(0.58, 0.76, n2)*0.6-damp*0.25, 0, 1);
  /* drifts: streaks stretched along the wind; crescents just beyond a trunk on its lee side; fewer in the damp and the moss */
  const a=x*W[0]+z*W[1], b=-x*W[1]+z*W[0], streak=smooth(0.46, 0.68, fbm(a/2.6+71, b/7.5+13))*(0.65+0.35*n3);
  const lee=Math.exp(-((tn.d-0.45)**2)/0.12)*clamp(0.3+0.7*(tn.ux*W[0]+tn.uz*W[1]), 0, 1);
  const drift=clamp((streak*0.8+lee*0.9)*(1-0.6*damp)*(1-0.5*moss), 0, 1);
  const sel=smooth(0.38, 0.62, fbm(x/3.3+77, z/3.3+29));
  return [damp, moss, drift, sel];
}
/* counts { leaves, pebbles, twigs }, trunks [[x, z, r]] → { leaves:[{ x, y, z, rot, s, cell, tilt }], pebbles:[{ x, y, z, s, rot, water, wet }],
   twigs:[{ x, y, z, len, r, rot }] } — seeded; each kind its own draws, so changing one count never moves another kind */
export function litterPlaces(counts, trunks, seed=LITTER.seed){
  const L=LITTER, out={ leaves:[], pebbles:[], twigs:[] };
  const ok=(x, z, clear)=>{ if(Math.hypot(x-L.eye[0], z-L.eye[1])<L.eyeR) return null; const sd=streamNear(x, z).d; if(sd<STREAM.half+clear) return null;
    const t=trunkNear(x, z, trunks); if(t.d<0.05) return null; return { sd, t }; };
  const pick=(kind, n, accept, make)=>{ const R=seeded((seed^kind)>>>0); let guard=0;
    while(out[make.name].length<n && guard++<n*60){ const x=L.x[0]+R()*(L.x[1]-L.x[0]), z=L.z[0]+R()*(L.z[1]-L.z[0]), q=ok(x, z, 0.08); const u=R(), v=R(), w=R();
      if(!q) continue; const m=macroAt(x, z, trunks, q.sd); if(u>accept(m, q)) continue; out[make.name].push(make.fn(x, z, v, w, m)); } };
  pick(0x1EAF, Math.max(0, counts.leaves|0), m=>0.12+0.88*m[2], { name:'leaves', fn:(x, z, v, w)=>({ x, y:bankGround(x, z)+0.006, z, rot:v*6.283, s:L.leafW[0]+w*(L.leafW[1]-L.leafW[0]), cell:Math.floor(v*997)%4, tilt:(w-0.5)*0.5 }) });
  pick(0x9EB1, Math.max(0, counts.pebbles|0), m=>0.15+0.6*m[0]+0.4*(1-m[1])*(1-m[2]), { name:'pebbles', fn:(x, z, v, w)=>{ const s=L.pebble[0]+Math.pow(w, 1.8)*(L.pebble[1]-L.pebble[0]); return { x, y:bankGround(x, z), z, s, rot:v*6.283, water:-9, wet:false }; } });
  pick(0x7146, Math.max(0, counts.twigs|0), (m, q)=>q.t.d<L.twig.near ? 0.9-0.6*q.t.d/L.twig.near : 0.08, { name:'twigs', fn:(x, z, v, w)=>({ x, y:bankGround(x, z)+0.006, z, len:L.twig.len[0]+w*(L.twig.len[1]-L.twig.len[0]), r:L.twig.r[0]+v*(L.twig.r[1]-L.twig.r[0]), rot:v*6.283 }) });
  return out;
}
