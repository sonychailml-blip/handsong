/* NIGHT-6 slice 4 — THE STREAM'S LIFE, as numbers. Pure (rule #36), node-tested (data row «FOREST stream (app)»): the room only draws what
   these give. The stream itself (its path, the carved bed) is ./forestlife.js.
   - outOfWater: a thing that would stand in the water moves straight out sideways to its clearance — no random draw, so everything placed
     after it stays as it was (today's trunks, ferns and rocks keep their places unless the new stream runs through them).
   - streamRocks: wet mossy rocks in and beside the water, and pebbles along the shore, seeded, never under the eye; each knows the water's
     level where it lies (a rock is darker and glossier below it).
   - The drifting leaves: each rides the stream downstream (towards the viewer) at its own speed and offset, turning slowly, and starts again
     upstream when it has passed (floatAt).
   - mistStrips: the brighter mist low over the water, a few strips facing the eye. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, STREAM_LINE, streamNear, streamAt, bankGround } from './forestlife.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const STREAM_LIFE=F({ eye:F([0, 5.5]), eyeR:2.5, uFrom:0.3, uTo:0.97,
  rocks:F({ seed:0x524F434B, inWater:0.4, size:F([0.08, 0.32]) }), pebbles:F({ seed:0x5045424C, size:F([0.03, 0.12]) }),
  float:F({ seed:0x464C4F41, speed:F([0.12, 0.22]), across:0.6, spin:0.4, lift:0.006 }),
  mist:F({ uFrom:0.3, uTo:0.68, w:F([3.5, 5]), h:0.9, y:0.32 }) });   // over the middle distance (a strip near the eye fogs the view)
const LEN=STREAM_LINE.reduce((a,p,i,A)=>i ? a+Math.hypot(p.x-A[i-1].x, p.z-A[i-1].z) : 0, 0);
export const streamLength=()=>LEN;

/* (x, z) moved out of the water to `clear` from the centre line (unchanged when already clear) → [x, z]; repeated, since inside a bend a point
   pushed out from one stretch can land nearer another */
export function outOfWater(x, z, clear){
  for(let k=0;k<8;k++){ const q=streamNear(x, z); if(q.d>=clear-1e-9) break;
    let dx=x-q.x, dz=z-q.z, l=Math.hypot(dx, dz); if(l<1e-6){ const t=streamAt(q.u); dx=-t.tz; dz=t.tx; l=1; }
    x=q.x+dx/l*clear; z=q.z+dz/l*clear; }
  return [x, z];
}
/* a point beside or in the water: u along the stream, o across (in half-widths; |o| < 1 in the water) → { x, z, d } */
function across(u, o){ const p=streamAt(u), x=p.x-p.tz*o*STREAM.half, z=p.z+p.tx*o*STREAM.half; return { x, z, d:Math.abs(o)*STREAM.half }; }
/* n rocks → [{ x, z, y (their base), s, rot, water (the water's level there), wet (in the water) }] */
export function streamRocks(n, seed=STREAM_LIFE.rocks.seed){
  const L=STREAM_LIFE, R=seeded(seed), out=[]; let guard=0;
  while(out.length<n && guard++<n*20){ const u=L.uFrom+R()*(L.uTo-L.uFrom), inW=R()<L.rocks.inWater, side=R()<0.5 ? -1 : 1, o= inW ? (R()-0.5)*1.2 : side*(1.05+R()*1.3);
    const s=L.rocks.size[0]+Math.pow(R(),1.5)*(L.rocks.size[1]-L.rocks.size[0]), rot=R()*6.283, P=across(u, o); if(Math.hypot(P.x-L.eye[0], P.z-L.eye[1])<L.eyeR) continue;
    const w=streamAt(u).y; out.push({ x:P.x, z:P.z, y:Math.max(bankGround(P.x, P.z), w-s*0.3), s, rot, water:w, wet:inW }); }
  return out;
}
/* n pebbles along both shores → the same shape as streamRocks */
export function streamPebbles(n, seed=STREAM_LIFE.pebbles.seed){
  const L=STREAM_LIFE, R=seeded(seed), out=[]; let guard=0;
  while(out.length<n && guard++<n*20){ const u=L.uFrom+R()*(L.uTo-L.uFrom), o=(R()<0.5 ? -1 : 1)*(0.75+R()*0.5), s=L.pebbles.size[0]+Math.pow(R(),2)*(L.pebbles.size[1]-L.pebbles.size[0]), rot=R()*6.283, P=across(u, o);
    if(Math.hypot(P.x-L.eye[0], P.z-L.eye[1])<L.eyeR-0.5) continue; const w=streamAt(u).y; out.push({ x:P.x, z:P.z, y:Math.max(bankGround(P.x, P.z), w-s*0.15), s, rot, water:w, wet:Math.abs(o)<1 }); }
  return out;
}
/* n drifting leaves: each { u0, o (across, half-widths), sp (m/s), r0, spin } — seeded */
export function floatersInit(n, seed=STREAM_LIFE.float.seed){ const L=STREAM_LIFE, R=seeded(seed);
  return Array.from({ length:n }, ()=>({ u0:R(), o:(R()-0.5)*2*L.float.across, sp:L.float.speed[0]+R()*(L.float.speed[1]-L.float.speed[0]), r0:R()*6.283, spin:(R()-0.5)*2*L.float.spin })); }
/* a leaf at time t → { x, y, z, rot, u } — it rides downstream from uFrom to uTo and starts again upstream (a loop per leaf) */
export function floatAt(f, t){ const L=STREAM_LIFE, span=(L.uTo-L.uFrom)*LEN, k=((f.u0*span+f.sp*t)%span+span)%span, u=L.uFrom+k/LEN, P=across(u, f.o);
  return { x:P.x, y:streamAt(u).y+L.float.lift, z:P.z, rot:f.r0+f.spin*t, u }; }
/* the mist strips over the water: n of them, evenly along the stream → [{ x, y, z, w, h, seed }] (each faces the eye in the room) */
export function mistStrips(n){ const M=STREAM_LIFE.mist, R=seeded(0x4D495354); return Array.from({ length:n }, (_,i)=>{ const u=M.uFrom+(i+0.5)/n*(M.uTo-M.uFrom), p=streamAt(u);
  return { x:p.x, y:p.y+M.y, z:p.z, w:M.w[0]+R()*(M.w[1]-M.w[0]), h:M.h, seed:R()*10 }; }); }
/* NIGHT-8: THE STREAM'S SOUND PLACES — points along the water as the listener at the camera hears them (apps/night/pure/brook.js voices): pan
   from the direction (the screen's width is about ±30°, so directions are widened ×1.8 into the stereo field), loudness 1/distance (the
   nearest = 1), the far water darker (air and leaves) and narrower, the near water wide — it runs from the left in front to the right
   behind, under the eye. Pure: the room's record takes them once. */
export const STREAM_SOUND=F({ us:F([0.42, 0.58, 0.72, 0.84, 0.93, 0.99]), ear:1.55, widen:1.8, near:1.6 });
export function streamVoices(){ const S=STREAM_SOUND, E=STREAM_LIFE.eye;
  const raw=S.us.map(u=>{ const p=streamAt(u), dx=p.x-E[0], dz=E[1]-p.z, d=Math.max(S.near, Math.hypot(dx, dz, S.ear)), az=Math.atan2(dx, Math.max(0.3, Math.abs(dz))), back=dz<0,
    hd=Math.hypot(dx, dz);   // straight below the ear the direction fades to the middle
    return { d, pan:clamp(S.widen*Math.sin(az)*hd/(hd+0.8)*(back ? 0.8 : 1), -0.85, 0.85) }; });
  const dn=Math.min(...raw.map(x=>x.d)), r3=x=>Math.round(x*1000)/1000;
  return raw.map(({ d, pan })=>F({ pan:r3(pan), w:r3(clamp(1.3/d, 0.08, 0.8)), gain:r3(dn/d), lp:Math.round(clamp(11000/(1+0.3*(d-dn)), 1800, 11000)),
    rate:r3(7+10*dn/d), f:F([Math.round(clamp(300+14*d, 300, 520)), Math.round(clamp(3400-70*d, 1800, 3400))]), rush:r3(clamp(0.35+0.4*dn/d, 0, 1)) })); }
