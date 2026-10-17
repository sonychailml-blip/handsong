/* VIS1c (RUN 6, Calm plan §3.1) — the night forest's WILD FIREFLIES and its ground, as numbers. CORE: pure (rule #36), node-tested (row
   «VIS1c fireflies (core)»): the room only draws what this step computes, so a probe can compare positions exactly on any device.
   The motion is the «Rooms of light» prototype's (the strategist's own code, our starting source): each fly orbits the nearest light within
   reach on its own ring (pull to the ring + a tangential swirl around its own axis), otherwise drifts; damping; the ground and a ceiling
   bounce it; the room wraps around. Seeded (core/dsp seeded) — the same seed gives the same forest everywhere. */
import { seeded } from './dsp.js';

export const FOREST_FLIES={ seed:0x464C5931, n:70, reach:5.5, pull:2.2, swirl:2.6, drift:0.9, damp:1.1, floor:0.25, ceil:5.5,
  box:{ x:11, zNear:3.5, zFar:-24, zSpan:27 } };
/* the forest floor's height at (x, z): gentle waves, flatter along the playing aisle (the prototype's terrain) */
export function forestGround(x, z){ let y=0.28*Math.sin(x*0.3)*Math.cos(z*0.27)+0.14*Math.sin(x*0.9+z*0.6); if(Math.abs(x)<6 && z>-14 && z<5) y*=0.35; return y; }

/* n flies from a seed: { p:[x,y,z], v:[x,y,z], ph, sp, ring, ax:[x,y,z] (unit), glow } */
export function fliesInit(n=FOREST_FLIES.n, seed=FOREST_FLIES.seed){
  const R=seeded(seed), out=[];
  for(let i=0;i<n;i++){
    const p=[(R()*2-1)*9, 0.4+R()*3.2, 3-R()*24], ph=R()*6.28, sp=0.6+R()*0.8, ring=0.7+(i%3)*0.45;
    const a=[R()-0.5, 1, R()-0.5], l=Math.hypot(a[0],a[1],a[2]);
    out.push({ p, v:[0,0,0], ph, sp, ring, ax:[a[0]/l, a[1]/l, a[2]/l], glow:0 });
  }
  return out;
}
/* one step of dt seconds at time t. lights: [{ x, y, z, on }] (on 0…1; a light draws flies when on > 0.15). k: motion scale (reduced
   motion 0.4). Mutates the flies in place and returns them. */
export function fliesStep(F, lights, dt, t, k=1){
  const C=FOREST_FLIES, B=C.box;
  for(const f of F){
    const p=f.p, v=f.v;
    let best=null, bd=1e9;
    for(const L of lights) if(L.on>0.15){ const d=Math.hypot(L.x-p[0], L.y-p[1], L.z-p[2]); if(d<bd){ bd=d; best=L; } }
    if(best && bd<C.reach){
      const tx=best.x-p[0], ty=best.y-p[1], tz=best.z-p[2], dd=Math.max(bd,0.05);
      let cx=ty*f.ax[2]-tz*f.ax[1], cy=tz*f.ax[0]-tx*f.ax[2], cz=tx*f.ax[1]-ty*f.ax[0]; const cl=Math.hypot(cx,cy,cz)||1; cx/=cl; cy/=cl; cz/=cl;
      const a=(dd-f.ring)/dd*C.pull*dt*k, b=C.swirl*f.sp*dt*k;
      v[0]+=tx*a+cx*b; v[1]+=ty*a+cy*b; v[2]+=tz*a+cz*b;
    } else {
      const s=C.drift*dt*k;
      v[0]+=Math.sin(t*0.7+f.ph)*s; v[1]+=Math.sin(t*0.43+f.ph*2)*0.6*s; v[2]+=Math.cos(t*0.53+f.ph*1.7)*s;
    }
    const e=Math.exp(-dt*C.damp); v[0]*=e; v[1]*=e; v[2]*=e;
    p[0]+=v[0]*dt*k; p[1]+=v[1]*dt*k; p[2]+=v[2]*dt*k;
    const fl=forestGround(p[0],p[2])+C.floor; if(p[1]<fl){ p[1]=fl; v[1]=Math.abs(v[1]); } if(p[1]>C.ceil) v[1]-=dt;
    if(p[0]<-B.x) p[0]+=2*B.x; if(p[0]>B.x) p[0]-=2*B.x; if(p[2]<B.zFar) p[2]+=B.zSpan; if(p[2]>B.zNear) p[2]-=B.zSpan;
    f.glow=0.15+0.85*Math.pow(Math.max(0, Math.sin(t*f.sp*1.9+f.ph)), 2);
  }
  return F;
}
/* the forest's DEPTH: the hand's depth 0 (near) … 1 (far) → the light's distance from the eye along the view (the prototype's depth
   range [2.2, 17] world units), eased in four soft bands so a steady hand does not shimmer between distances */
export const FOREST_DEPTH={ near:2.2, far:17, bands:4, soft:0.35 };
export function depthDistance(d01){
  const D=FOREST_DEPTH, d=Math.max(0, Math.min(1, +d01||0)), n=D.bands-1, x=d*n, i=Math.floor(Math.min(x, n-1e-9)), f=x-i;
  const s=f<D.soft ? 0 : f>1-D.soft ? 1 : (f-D.soft)/(1-2*D.soft), eased=s*s*(3-2*s);   // flat in the middle of each band, smooth between
  const u=(i+eased)/n; return D.near*(1-u)+D.far*u;   // both ends exact
}
