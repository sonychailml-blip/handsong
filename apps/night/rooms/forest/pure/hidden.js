/* NIGHT-6 slice 9 — HIDDEN THINGS THE LIGHT FINDS, as numbers. Pure (rule #36), node-tested (data row «FOREST hidden (app)»): the room only
   draws what these give (picture only).
   - FOXFIRE: soft glowing veins on the fallen and dead wood and on the feet of some old trunks. The playing light leaves a TRAIL of its recent
     places (foxTrailStep: a new point when it has moved FOX.step or every FOX.every seconds while lit; FOX.n points kept, the oldest replaced);
     wood near a point glows, holds 8–12 s after the light was there (each patch its own hold), then fades in FOX.fade seconds — so the light
     leaves a fading trail of what it found (foxAt: the same formula as the wood's shader). No light ever: exactly 0.
   - NIGHT FLOWERS: tiny closed flowers among the herbs, in view and in the light's reach (flowerPlaces), opening when the light comes within FLOWERS.reach, staying open
     FLOWERS.stay seconds after it leaves, then closing (flowerStep). Never found: exactly closed. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, bankGround } from './forestlife.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FOX=F({ step:0.45, every:1.2, r:1.2, hold:F([8, 12]), fade:2.5 });
export const FLOWERS=F({ reach:1.0, lift:1.8, open:1.6, close:0.35, stay:20, eye:F([3.2, 10]), az:30, box:F({ x:5.5, z:-14 }), gap:0.8, kinds:F(['sorrel', 'forb', 'anemone']), seed:0x464C4F57 });   // az, box: in view and in the light's reach (forest.js FOREST_BOUNDS)

/* the trail of n points: { pts:[{ x, y, z, t }] (t < 0: empty), k (the next slot), last } */
export const foxTrail=n=>({ pts:Array.from({ length:n }, ()=>({ x:0, y:0, z:0, t:-1 })), k:0, last:null });
/* tr ← the light at time t: p = [x, y, z] when lit, else null */
export function foxTrailStep(tr, t, p){ if(!p || !tr.pts.length) return tr; const L=tr.last;
  if(L && Math.hypot(p[0]-L.x, p[1]-L.y, p[2]-L.z)<FOX.step && t-L.t<FOX.every) return tr;
  const s=tr.pts[tr.k]; s.x=p[0]; s.y=p[1]; s.z=p[2]; s.t=t; tr.k=(tr.k+1)%tr.pts.length; tr.last=s; return tr; }
/* how much wood at (x, y, z) glows at time t (0…1); holdK 0…1 picks the patch's hold within FOX.hold */
export function foxAt(tr, x, y, z, t, holdK=0.5){ let a=0; const hold=FOX.hold[0]+(FOX.hold[1]-FOX.hold[0])*holdK;
  for(const p of tr.pts){ if(p.t<0) continue; const age=t-p.t, f= age<hold ? 1 : Math.max(0, 1-(age-hold)/FOX.fade); if(f<=0) continue;
    const d2=(x-p.x)**2+(y-p.y)**2+(z-p.z)**2; a=Math.max(a, f*Math.exp(-d2/(FOX.r*FOX.r))); }
  return a; }

/* n flowers among the floor's herbs (places: pure/floor.js floorPlaces) → [{ x, y, z, s, rot }] — never in the water, FLOWERS.eye from the
   eye's ground point, FLOWERS.gap apart, each beside a herb */
export function flowerPlaces(n, places, seed=FLOWERS.seed){
  const R=seeded(seed), E=[0, 5.5], pool=places.filter(p=>FLOWERS.kinds.includes(p.sp)).map(p=>({ p, k:R() })).sort((a,b)=>a.k-b.k), out=[];
  for(const { p } of pool){ if(out.length>=n) break; const a=R()*6.283, x=p.x+Math.cos(a)*0.12, z=p.z+Math.sin(a)*0.12, e=Math.hypot(x-E[0], z-E[1]);
    const az=Math.abs(Math.atan2(x-E[0], E[1]-z))*180/Math.PI; if(az>FLOWERS.az || Math.abs(x)>FLOWERS.box.x || z<FLOWERS.box.z) continue;   // where the light can find it
    if(e<FLOWERS.eye[0] || e>FLOWERS.eye[1] || streamNear(x,z).d<STREAM.half+0.25 || out.some(o=>Math.hypot(o.x-x, o.z-z)<FLOWERS.gap)) continue;
    out.push({ x, y:bankGround(x,z), z, s:0.8+R()*0.5, rot:R()*6.283, by:p.sp }); }
  return out; }
/* a flower's state { open 0…1, seen (when the light last reached it; −∞ never) } ← dt at time t, the light [x, y, z] or null */
export function flowerStep(f, dt, t, light){ const L=FLOWERS;
  if(light && Math.hypot(light[0]-f.x, light[2]-f.z)<L.reach && light[1]-f.y<L.lift) f.seen=t;
  const target= f.seen!=null && t-f.seen<L.stay ? 1 : 0, open=f.open||0;
  f.open= target>open ? Math.min(1, open+dt*L.open) : Math.max(0, open-dt*L.close); return f; }
