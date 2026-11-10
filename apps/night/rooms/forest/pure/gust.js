/* NIGHT-6 slice 6 — THE EFFECTS HAND MOVES THE FOREST, as numbers. Pure (rule #36), node-tested (data row «FOREST gust (app)»): the room only
   draws what these give (the plants' and the water's shaders read the gust as uniforms; picture only, no sound — the user, slice 6).
   - gustStep: the effects hand's light (its ground point x, z and how present it is) → a GUST that follows it: its strength k rises with the
     hand's SPEED (a still or slow hand makes none; a sweep makes one) and dies away when the sweep stops; its direction is the sweep's.
     No hand, a still hand: k exactly 0.
   - gustBend: how far a plant's point at height hgt above its foot bends at (x, z) — along the sweep and a little away from the gust's centre,
     strongest at the centre, fading to exactly nothing two radii away; exactly [0, 0] when k is 0. The plants' shader (forest-life.js patchSway) is this formula.
   - Leaves SHAKE LOOSE while the gust is strong (leafSpawn, leafAt): each flies off along the sweep, falls and settles, then is gone.
   - The stream gets a WAKE where the gust crosses it (wakeOf: where, how strong). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, bankGround } from './forestlife.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
export const GUST=F({ R:1.6, vMin:0.4, vFull:4, rise:8, fall:1.4, follow:7, turn:6, bend:0.4, h0:0.15, away:0.5,
  leaves:F({ n:12, every:0.15, kMin:0.35, life:3.2, speed:F([0.8, 1.6]), up:F([0.3, 0.7]), y:F([0.4, 1.2]), g:1.1, drag:0.9, spin:F([-4, 4]) }),
  wake:F({ reach:0.8, kMin:0.2, every:0.35 }) });

export const gustNew=()=>({ x:0, z:0, dx:1, dz:0, k:0, v:0, px:null, pz:null });
/* g ← one step of dt seconds; p: the effects light's ground point [x, z] or null; on: how present it is 0…1 */
export function gustStep(g, dt, p, on=1){ const G=GUST; let target=0;
  if(p && on>0.05 && dt>0){
    if(g.px==null){ g.px=p[0]; g.pz=p[1]; if(g.k===0){ g.x=p[0]; g.z=p[1]; } }
    const vx=(p[0]-g.px)/dt, vz=(p[1]-g.pz)/dt, sp=Math.hypot(vx, vz); g.px=p[0]; g.pz=p[1];
    g.v+=(sp-g.v)*Math.min(1, dt*8);
    if(sp>1e-6){ const a=Math.min(1, dt*G.turn); let dx=g.dx+(vx/sp-g.dx)*a, dz=g.dz+(vz/sp-g.dz)*a; const l=Math.hypot(dx,dz)||1; g.dx=dx/l; g.dz=dz/l; }
    const f=Math.min(1, dt*G.follow); g.x+=(p[0]-g.x)*f; g.z+=(p[1]-g.z)*f;
    target=clamp(on,0,1)*smooth(G.vMin, G.vFull, g.v);
  } else { g.px=g.pz=null; g.v=0; }
  g.k+=(target-g.k)*Math.min(1, dt*(target>g.k ? G.rise : G.fall)); if(target===0 && g.k<1e-3) g.k=0;
  return g; }
/* a point at (x, z), hgt metres above its plant's foot (baseY: the foot's height; a gust stays low — nothing from 4.5 m up, NIGHT-6 slice 7:
   the crowns) → its bend [dx, dz] (metres) */
export function gustBend(g, x, z, hgt, baseY=0){ if(!(g.k>0) || !(hgt>0)) return [0, 0]; const G=GUST, qx=x-g.x, qz=z-g.z, q=Math.hypot(qx, qz);
  const f=g.k*Math.exp(-(qx*qx+qz*qz)/(G.R*G.R))*(1-smooth(1.5*G.R, 2*G.R, q))*(1-smooth(2.5, 4.5, baseY))*G.bend*hgt*(hgt/(hgt+G.h0)), ax=g.dx+G.away*qx/(q+0.3), az=g.dz+G.away*qz/(q+0.3);
  return [ax*f, az*f]; }
/* a loose leaf, seeded by its number i: where it starts (round the gust's centre, among the plants) and how it flies */
export function leafSpawn(g, i, t0){ const L=GUST.leaves, R=seeded(0x4C454146+i*7919), a=R()*6.283, r=R()*GUST.R*0.6, x=g.x+Math.cos(a)*r, z=g.z+Math.sin(a)*r, sp=L.speed[0]+R()*(L.speed[1]-L.speed[0])*g.k;
  return { i, t0, x, z, y:bankGround(x,z)+L.y[0]+R()*(L.y[1]-L.y[0]), vx:g.dx*sp+(R()-0.5)*0.3, vz:g.dz*sp+(R()-0.5)*0.3, vy:L.up[0]+R()*(L.up[1]-L.up[0]), spin:L.spin[0]+R()*(L.spin[1]-L.spin[0]), cell:i%4 }; }
/* the leaf at time t → { x, y, z, rot, a (0…1, it fades at the end), done } — air drag on the sideways flight, gravity on the fall
   (a slow terminal sink), resting on the ground once it lands */
export function leafAt(l, t){ const L=GUST.leaves, s=Math.max(0, t-l.t0), e=Math.exp(-L.drag*s), side=(1-e)/L.drag;
  const x=l.x+l.vx*side, z=l.z+l.vz*side, gy=bankGround(x, z)+0.01, sink=0.35, y=Math.max(gy, l.y+l.vy*side-sink*s-0.5*L.g*Math.min(s, 0.6)**2);
  return { x, y, z, rot:l.spin*Math.min(s, 2.2), a:clamp((L.life-s)/0.6, 0, 1), done:s>=L.life }; }
/* where the gust stirs the water: the nearest point of the stream when the gust's centre is within reach of it → { x, z, k } or null */
export function wakeOf(g){ if(g.k<GUST.wake.kMin) return null; const q=streamNear(g.x, g.z); if(q.d>STREAM.half+GUST.wake.reach) return null; return { x:q.x, z:q.z, k:g.k*(1-smooth(STREAM.half, STREAM.half+GUST.wake.reach, q.d)) }; }
