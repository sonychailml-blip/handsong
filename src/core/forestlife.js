/* RUN 9 — THE FOREST'S LIFE, as numbers. CORE: pure (rule #36), node-tested (data row «FOREST life (core)»): the room only draws what
   these give, so a probe can compare places and amounts exactly on any device.
   - The STREAM (slice 2, for Echo's rings; its moon reflection slice 3): a seeded-free fixed path across the forest floor, from near left to
     far right, through the place where the moon's reflection falls; `streamAt(u)` (u 0…1 along it) and `streamNear(x, z)` (the nearest
     point, its distance, its u).
   - GLOWING MUSHROOMS and FLOWERS (slice 2): seeded places near the playing aisle (never in the water); each pulses with the notes by its
     distance to the playing light (`pulseOf`).
   - GROUND WAVES (each note: a ring of light runs across the moss from the light's ground point) and WATER RINGS (each echo of a note: a ring
     on the stream) — small fixed-size lists, the oldest replaced (`ringAdd`). */
import { seeded } from './dsp.js';
import { forestGround } from './fireflies.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* the stream's control points (x, z) and its half-width; a Catmull–Rom curve through them */
export const STREAM=Object.freeze({ pts:Object.freeze([[-11,3.2],[-6,2.2],[-2.2,1.1],[0.6,-0.6],[2.6,-3.2],[4.4,-6.4],[7,-9.8],[11,-13.5]]), half:0.42, lift:0.05, seg:96 });
function cr(p0,p1,p2,p3,t){ const t2=t*t, t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
/* the point at u (0…1) → { x, z, tx, tz (unit tangent), y (the ground there + the water's lift) } */
export function streamAt(u){
  const P=STREAM.pts, n=P.length-1, f=clamp(u,0,1)*n, i=Math.min(n-1, Math.floor(f)), t=f-i, q=k=>P[clamp(k,0,n)];
  const a=q(i-1), b=q(i), c=q(i+1), d=q(i+2), x=cr(a[0],b[0],c[0],d[0],t), z=cr(a[1],b[1],c[1],d[1],t);
  const e=1e-3, x2=cr(a[0],b[0],c[0],d[0],Math.min(1,t+e)), z2=cr(a[1],b[1],c[1],d[1],Math.min(1,t+e)), x1=cr(a[0],b[0],c[0],d[0],Math.max(0,t-e)), z1=cr(a[1],b[1],c[1],d[1],Math.max(0,t-e));
  const l=Math.hypot(x2-x1, z2-z1)||1; return { x, z, tx:(x2-x1)/l, tz:(z2-z1)/l, y:forestGround(x,z)+STREAM.lift };
}
/* the stream's polyline (seg + 1 points), computed once */
export const STREAM_LINE=Object.freeze(Array.from({ length:STREAM.seg+1 }, (_,i)=>Object.freeze(streamAt(i/STREAM.seg))));
/* the nearest point of the stream to (x, z) → { x, z, d (distance to the centre line), u } */
export function streamNear(x, z){
  let best=null, bd=Infinity; const L=STREAM_LINE;
  for(let i=0;i<L.length-1;i++){ const A=L[i], B=L[i+1], vx=B.x-A.x, vz=B.z-A.z, w=((x-A.x)*vx+(z-A.z)*vz)/(vx*vx+vz*vz||1), k=clamp(w,0,1), px=A.x+vx*k, pz=A.z+vz*k, d=Math.hypot(x-px, z-pz);
    if(d<bd){ bd=d; best={ x:px, z:pz, d, u:(i+k)/(L.length-1) }; } }
  return best;
}
/* MUSHROOMS and FLOWERS: n of each kind, seeded, in the aisle (|x| ≤ 6, z 0.5 … −12.5 — not under the camera), kept off the water */
export const LIFE=Object.freeze({ seed:0x4D555348, shrooms:28, blooms:10, reach:2.6, tau:0.7, base:0.22, breathe:0.12 });
export function lifePlaces(nShroom=LIFE.shrooms, nBloom=LIFE.blooms, seed=LIFE.seed){
  const R=seeded(seed), out=[];
  const put=(kind, n, clusterOf)=>{ let guard=0;
    while(out.filter(o=>o.kind===kind).length<n && guard++<4000){
      const cx=(R()*2-1)*6, cz=0.5-R()*13, k=clusterOf(), ph=R()*6.283;
      for(let j=0;j<k && out.filter(o=>o.kind===kind).length<n;j++){ const x=cx+(R()-0.5)*0.7, z=cz+(R()-0.5)*0.7;
        if(streamNear(x,z).d<STREAM.half+0.25 || Math.hypot(x, z-5.5)<2.4) continue;
        out.push({ kind, x, z, y:forestGround(x,z), s: kind==='shroom' ? 0.07+R()*0.09 : 0.09+R()*0.06, ph:ph+j*0.9, rot:R()*6.283 }); } } };
  put('shroom', nShroom, ()=>2+Math.floor(R()*4)); put('bloom', nBloom, ()=>1+Math.floor(R()*2));
  return out;
}
/* a note of velocity vel struck with the playing light at (lx, lz): how much a thing at (x, z) pulses (0…1 per note; Gaussian in distance) */
export const pulseOf=(x, z, lx, lz, vel)=>Math.max(0, Math.min(1, +vel||0))*Math.exp(-((x-lx)**2+(z-lz)**2)/(2*LIFE.reach*LIFE.reach));
/* RINGS (ground waves, water rings): a fixed list of n slots { x, z, t0, amp } (t0 −1 = free); a new ring takes a free slot or the OLDEST */
export const RINGS=Object.freeze({ ground:Object.freeze({ n:6, life:3, speed:2.2, width:0.5 }), water:Object.freeze({ n:8, life:2.2, speed:0.85, width:0.07 }) });
export const ringsNew=n=>Array.from({ length:n }, ()=>({ x:0, z:0, t0:-1, amp:0 }));
export function ringAdd(list, x, z, t0, amp){ let s=list.find(r=>r.t0<0); if(!s) s=list.reduce((a,b)=>a.t0<=b.t0?a:b); s.x=x; s.z=z; s.t0=t0; s.amp=amp; return s; }
/* frees the rings older than life at time t → how many are active */
export function ringsAge(list, t, life){ let n=0; for(const r of list){ if(r.t0>=0 && t-r.t0>=life) r.t0=-1; if(r.t0>=0) n++; } return n; }
