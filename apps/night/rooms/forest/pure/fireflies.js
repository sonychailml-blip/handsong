/* VIS1c (RUN 6, Night plan §3.1) — the night forest's WILD FIREFLIES and its ground, as numbers. Pure (rule #36), node-tested (row
   «VIS1c fireflies (core)», named before NIGHT-3 moved it into the forest's room folder): the room only draws what this step computes, so a probe can compare positions exactly on any device.
   The motion is the «Rooms of light» prototype's (the strategist's own code, our starting source): each fly orbits the nearest light within
   reach on its own ring (pull to the ring + a tangential swirl around its own axis), otherwise drifts; damping; the ground and a ceiling
   bounce it; the room wraps around. Seeded (core/dsp seeded) — the same seed gives the same forest everywhere.
   NIGHT-6 slice 2: THE FIREFLIES FOLLOW THE MELODY — two more inputs of the playing light: `hold` 0…1 (a long note: they close in, swirl
   slower and breathe together, brighter) and `rate` 0…1 (fast playing: wider rings, a quicker swirl); fliesDart sends the nearest few out on a
   note of fast playing. holdK / rateK turn the held seconds and the notes per second into those inputs. Both 0 or absent = exactly the old step. */
import { seeded } from '../../../../../core/pure/dsp.js';

export const FOREST_FLIES={ seed:0x464C5931, n:70, reach:5.5, pull:2.2, swirl:2.6, drift:0.9, damp:1.1, floor:0.25, ceil:5.5,
  callReach:9, callPull:0.12, scatter:1.0, release:1.6,   // RUN 9: a playing light CALLS from further (a gentle drift beyond the old reach); a stopping one lets them SCATTER
  box:{ x:11, zNear:3.5, zFar:-24, zSpan:27 },
  /* NIGHT-6 slice 2: hold — rings × (1 − ring·hold), pull × (1 + pull·hold), swirl × (1 − swirl·hold), the near flies' glow drawn (sync·hold) to a
     shared breath of `breath` s; held seconds from…full → 0…1. rate — rings × (1 + ring·rate), swirl × (1 + swirl·rate); notes per second over
     `window` s from…full → 0…1. dart — the n nearest within reach get `speed` × strength outwards (the room darts from rate `from` up). ease — the room's time constants (s) */
  melody:Object.freeze({ hold:Object.freeze({ from:0.5, full:2.5, ring:0.45, pull:0.6, swirl:0.6, sync:0.8, breath:3.6 }),
    rate:Object.freeze({ from:1.5, full:5, window:2, ring:0.7, swirl:0.9 }), dart:Object.freeze({ n:3, speed:2.2, reach:4, from:0.15 }),
    ease:Object.freeze({ holdIn:0.6, holdOut:1.2, rateIn:0.4, rateOut:1.5 }) }) };
const sm01=u=>{ u=Math.max(0, Math.min(1, u)); return u*u*(3-2*u); };
/* NIGHT-6 slice 2: a note held `sec` seconds → hold 0…1; note-on times (s) and the time t → rate 0…1 (notes per second over the window) */
export const holdK=sec=>{ const H=FOREST_FLIES.melody.hold; return sm01(((+sec||0)-H.from)/(H.full-H.from)); };
export function rateK(times, t){ const R=FOREST_FLIES.melody.rate; let n=0; for(const x of times) if(x>t-R.window && x<=t) n++; return sm01((n/R.window-R.from)/(R.full-R.from)); }
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
/* one step of dt seconds at time t. lights: [{ x, y, z, on, call?, scatter? }] (on 0…1; a light draws flies when on > 0.15; RUN 9: call 0…1
   — the light is being played: its reach grows by callReach·call, the flies beyond the old reach drift in gently; scatter 0…1 — the playing
   stopped: the pull weakens (none at all from scatter 1/release up) and a soft push sends the near flies away; both 0 / absent = exactly the old step). k: motion scale
   (reduced motion 0.4, the sleep). Mutates the flies in place and returns them. */
export function fliesStep(F, lights, dt, t, k=1, form=null){
  const C=FOREST_FLIES, B=C.box;
  for(let fi=0;fi<F.length;fi++){ const f=F[fi];
    /* RUN 9 (slice 4): a FORMATION — the listed flies spring to their points (the emblem) with strength form.k 0…1; the rest fly as ever */
    const to=form && form.k>0 ? form.to[fi] : null;
    if(to){ const p=f.p, v=f.v, s=form.k*dt; for(let a=0;a<3;a++){ v[a]+=((to[a]-p[a])*9-v[a]*5.5)*s; p[a]+=v[a]*dt; } f.glow=0.55+0.45*form.k; continue; }
    const p=f.p, v=f.v;
    let best=null, bd=1e9;
    for(const L of lights) if(L.on>0.15){ const d=Math.hypot(L.x-p[0], L.y-p[1], L.z-p[2]); if(d<bd){ bd=d; best=L; } }
    const call=best ? +best.call||0 : 0, sc=best ? +best.scatter||0 : 0, hold=best ? +best.hold||0 : 0, rate=best ? +best.rate||0 : 0, M=C.melody;
    let hb=0;   // NIGHT-6 slice 2: how far this fly's glow joins the shared breath
    if(best && bd<C.reach+C.callReach*call && C.release*sc<1){
      const tx=best.x-p[0], ty=best.y-p[1], tz=best.z-p[2], dd=Math.max(bd,0.05);
      let cx=ty*f.ax[2]-tz*f.ax[1], cy=tz*f.ax[0]-tx*f.ax[2], cz=tx*f.ax[1]-ty*f.ax[0]; const cl=Math.hypot(cx,cy,cz)||1; cx/=cl; cy/=cl; cz/=cl;
      const ring= hold||rate ? f.ring*(1-M.hold.ring*hold)*(1+M.rate.ring*rate) : f.ring;   // no melody input: the old ring exactly
      let a=(dd-ring)/dd*C.pull*dt*k*(bd<C.reach ? 1 : C.callPull)*(1-Math.min(1, C.release*sc)), b=C.swirl*f.sp*dt*k*(1-0.5*sc);
      if(hold){ a*=1+M.hold.pull*hold; hb=M.hold.sync*hold; } if(hold||rate) b*=(1-M.hold.swirl*hold)*(1+M.rate.swirl*rate);
      v[0]+=tx*a+cx*b; v[1]+=ty*a+cy*b; v[2]+=tz*a+cz*b;
    } else {
      const s=C.drift*dt*k;
      v[0]+=Math.sin(t*0.7+f.ph)*s; v[1]+=Math.sin(t*0.43+f.ph*2)*0.6*s; v[2]+=Math.cos(t*0.53+f.ph*1.7)*s;
    }
    if(sc>0 && bd<C.reach+3){ const dd=Math.max(bd,0.05), s=C.scatter*sc*dt*k/dd; v[0]-=(best.x-p[0])*s; v[1]-=(best.y-p[1])*s*0.4; v[2]-=(best.z-p[2])*s; }   // RUN 9: scatter
    const e=Math.exp(-dt*C.damp); v[0]*=e; v[1]*=e; v[2]*=e;
    p[0]+=v[0]*dt*k; p[1]+=v[1]*dt*k; p[2]+=v[2]*dt*k;
    const fl=forestGround(p[0],p[2])+C.floor; if(p[1]<fl){ p[1]=fl; v[1]=Math.abs(v[1]); } if(p[1]>C.ceil) v[1]-=dt;
    if(p[0]<-B.x) p[0]+=2*B.x; if(p[0]>B.x) p[0]-=2*B.x; if(p[2]<B.zFar) p[2]+=B.zSpan; if(p[2]>B.zNear) p[2]-=B.zSpan;
    f.glow=0.15+0.85*Math.pow(Math.max(0, Math.sin(t*f.sp*1.9+f.ph)), 2);
    if(hb>0) f.glow=f.glow*(1-hb)+(0.35+0.65*(0.5-0.5*Math.cos(2*Math.PI*t/M.hold.breath)))*hb;   // NIGHT-6 slice 2: they breathe together
  }
  return F;
}
/* NIGHT-6 slice 2: a note of fast playing at light L ({ x, y, z }), strength s 0…1 → the n nearest flies within reach dart outwards (their
   velocity gains speed × s along the line from the light); → their indices, nearest first. s 0: nothing moves */
export function fliesDart(F, L, s){
  const D=FOREST_FLIES.melody.dart; if(!(s>0)) return [];
  const near=F.map((f,i)=>[Math.hypot(f.p[0]-L.x, f.p[1]-L.y, f.p[2]-L.z), i]).filter(([d])=>d<D.reach).sort((a,b)=>a[0]-b[0] || a[1]-b[1]).slice(0, D.n);
  for(const [d,i] of near){ const f=F[i], dd=Math.max(d, 0.05), o=[L.x, L.y, L.z]; for(let a=0;a<3;a++) f.v[a]+=(f.p[a]-o[a])/dd*D.speed*s; }
  return near.map(x=>x[1]);
}
/* the forest's DEPTH: the hand's depth 0 (near) … 1 (far) → the light's distance from the eye along the view (the prototype's depth
   range [2.2, 17] world units), eased in four soft bands so a steady hand does not shimmer between distances */
export const FOREST_DEPTH={ near:2.2, far:17, bands:4, soft:0.35 };
export function depthDistance(d01){
  const D=FOREST_DEPTH, d=Math.max(0, Math.min(1, +d01||0)), n=D.bands-1, x=d*n, i=Math.floor(Math.min(x, n-1e-9)), f=x-i;
  const s=f<D.soft ? 0 : f>1-D.soft ? 1 : (f-D.soft)/(1-2*D.soft), eased=s*s*(3-2*s);   // flat in the middle of each band, smooth between
  const u=(i+eased)/n; return D.near*(1-u)+D.far*u;   // both ends exact
}
