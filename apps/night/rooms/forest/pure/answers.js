/* NIGHT-6 slice 1 — THE FOREST ANSWERS, as numbers. Pure (rule #36), node-tested (data row «FOREST answers (app)»): the room only draws what
   these give, so a probe can compare places and amounts exactly on any device.
   - DEW: seeded points on the low leaves in view (never in the stream, never right under the eye); a point shines near the playing light
     (dewLight: Gaussian in distance × the light × a note's glint × its own twinkle) — the dew's shader mirrors dewLight.
   - WEBS: seeded webs hung beside the near trunks (the trunks are the room's), off the aisle; a web catches the light the same way (webLight).
   - A NOTE RINGS THE STREAM at its nearest point, fainter with the light's distance from the water (noteRingAmp; 0 = no ring).
   - THE MUSIC BED in the room (its events reach the room when HEARD — apps/night/pure/heard.js): a chord swells every mushroom; each loop
     voice glows in its own distant cluster (bedClusters); a glass note makes a far firefly twinkle. Every swell is an envelope (swellAt) and the
     sum stays under ANSWERS.bed.max — below a note's own pulse (up to 1). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { forestGround } from './fireflies.js';
import { streamNear, STREAM } from './forestlife.js';

const F=Object.freeze;
export const ANSWERS=F({
  /* dew: x within ±x, z from zFar to zNear (in view from the eye at 0, 5.5), lo…hi above the ground; reach — the light's Gaussian (d² / reach) */
  dew:F({ seed:0x44455731, x:7, zNear:3.2, zFar:-8.5, cam:F([0, 5.5]), camR:2.2, lo:0.04, hi:0.42, reach:1.6, glint:0.6, base:0.25, size:0.035 }),
  /* webs: beside a trunk (off its bark by off), |x| from aisle to xMax, z from zFar to zNear, its centre yLo…yHi above the ground, size in metres */
  webs:F({ seed:0x57454231, aisle:1.3, xMax:5.6, zNear:3, zFar:-10.5, yLo:0.6, yHi:1.7, off:F([0.3, 0.6]), size:F([0.45, 0.85]), reach:2, base:0.035, peak:0.75, glint:1 }),
  ring:F({ amp:0.8, reach:3, min:0.05 }),
  bed:F({ chord:F({ amp:0.25, rise:1.5, hold:0, fall:4 }), loop:F({ amp:0.35, clusters:4, r:0.9 }), glass:F({ amp:0.6, rise:0.15, hold:0, fall:1.8, near:8 }), max:0.5 }),
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=u=>{ u=clamp(u,0,1); return u*u*(3-2*u); };

/* n dew points → { pos (Float32Array 3n), seed (Float32Array n, 0…1), n } */
export function dewPlaces(n, seed=ANSWERS.dew.seed){
  const D=ANSWERS.dew, R=seeded(seed), pos=new Float32Array(n*3), sd=new Float32Array(n); let k=0, guard=0;
  while(k<n && guard++<n*40){ const x=(R()*2-1)*D.x, z=D.zFar+R()*(D.zNear-D.zFar), h=D.lo+R()*(D.hi-D.lo), s=R();
    if(Math.hypot(x-D.cam[0], z-D.cam[1])<D.camR || streamNear(x, z).d<STREAM.half+0.1) continue;
    pos[k*3]=x; pos[k*3+1]=forestGround(x, z)+h; pos[k*3+2]=z; sd[k]=s; k++; }
  return { pos, seed:sd, n:k };
}
/* a dew point's light: d its distance to the light, on the light's presence 0…1, glint a note's glint 0…1, tw its twinkle 0…1 */
export const dewLight=(d, on, glint, tw)=>Math.exp(-(d*d)/ANSWERS.dew.reach)*on*(1+ANSWERS.dew.glint*glint)*(ANSWERS.dew.base+(1-ANSWERS.dew.base)*tw);

/* n webs beside the trunks [[x, z, r], …] (the room's own) → [{ x, y, z, s (size), yaw, roll, ph }] — each on the side of its trunk that keeps
   it off the aisle and inside xMax; trunks outside the near band carry none; fewer than n when too few trunks qualify */
export function webPlaces(n, trunks, seed=ANSWERS.webs.seed){
  const W=ANSWERS.webs, R=seeded(seed), out=[], used=new Set();
  const cand=trunks.map((t,i)=>i).filter(i=>{ const [x,z]=trunks[i]; return z<=W.zNear && z>=W.zFar && Math.abs(x)<=W.xMax+1 && Math.abs(x)>=W.aisle-1; });
  let guard=0;
  while(out.length<n && guard++<n*30 && used.size<cand.length){
    const i=cand[Math.floor(R()*cand.length)], [tx,tz,tr]=trunks[i], off=W.off[0]+R()*(W.off[1]-W.off[0]), s=W.size[0]+R()*(W.size[1]-W.size[0]);
    const y=W.yLo+R()*(W.yHi-W.yLo), dz=(R()-0.5)*0.5, yaw=(R()-0.5)*0.9, roll=R()*6.283, ph=R()*6.283;
    if(used.has(i)) continue;
    const sides=Math.abs(tx)<1e-9 ? [1,-1] : [-Math.sign(tx), Math.sign(tx)];   // towards the aisle first, else outwards
    let at=null; for(const sd of sides){ const x=tx+sd*(tr+off+s/2); if(Math.abs(x)>=W.aisle && Math.abs(x)<=W.xMax){ at=x; break; } }
    if(at==null){ used.add(i); continue; }
    used.add(i); const z=tz+dz; out.push({ x:at, y:forestGround(at, z)+y, z, s, yaw, roll, ph }); }
  return out;
}
/* a web's light: d its distance to the light, on 0…1, glint 0…1 (the base glow is the moon's, added by the room) */
export const webLight=(d, on, glint)=>ANSWERS.webs.peak*Math.exp(-(d*d)/ANSWERS.webs.reach)*on*(1+ANSWERS.webs.glint*glint);

/* the stream ring of a note struck d units from the water, velocity vel → its amplitude (0 = none) */
export function noteRingAmp(d, vel){ const A=ANSWERS.ring, a=clamp(+vel||0, 0, 1)*A.amp*Math.exp(-((d/A.reach)**2)); return a<A.min ? 0 : a; }

/* an envelope 0…1 at `age` seconds: rises over `rise` (smooth), holds `hold`, falls over `fall`; 0 before and after */
export function swellAt(age, rise, hold, fall){
  if(!(age>=0)) return 0; if(age<rise) return smooth(age/rise); if(age<rise+hold) return 1;
  const u=(age-rise-hold)/Math.max(1e-9, fall); return u>=1 ? 0 : 1-smooth(u);
}
/* the bed's loop voices' homes: up to n clusters of the mushroom places (kind 'shroom'), the farthest from the eye first, each the shrooms within
   r of its first → [[index into places, …], …] (disjoint; a cluster has at least one) */
export function bedClusters(places, n=ANSWERS.bed.loop.clusters, r=ANSWERS.bed.loop.r){
  const idx=places.map((p,i)=>i).filter(i=>places[i].kind==='shroom').sort((a,b)=>places[a].z-places[b].z || places[a].x-places[b].x), taken=new Set(), out=[];
  for(const i of idx){ if(out.length>=n) break; if(taken.has(i)) continue;
    const c=idx.filter(j=>!taken.has(j) && Math.hypot(places[j].x-places[i].x, places[j].z-places[i].z)<=r); for(const j of c) taken.add(j); out.push(c); }
  return out;
}
