/* RAIN-0b: THE VIEW LAW — the eye on the 8th floor, looking slightly down and diagonally along the boulevard (concept §3), as ONE pure
   projection used by the painting, the depth map, the lights, the windows and the note's pick (pure, rule #36; data row «RAIN view law (app)»).
   World in metres: x across the boulevard, y up, z along it (+z away). Our house stands at the head of the boulevard (a crossing in front of it),
   the window left of the boulevard's axis, turned a little towards the right-hand row — THE HOUSE OPPOSITE, the main canvas, seen diagonally as it
   recedes; the left-hand row recedes on the other side. A pinhole camera: a world point → view-angle units (tangents: x right, y up), the units the
   pane and the screen crop use. The vanishing point sits a little left of the middle, so an upright phone (the narrowest crop) looks ALONG the
   boulevard, and every screen shape sees the street in its lower part (the crop is centred: the world is fixed).
   DEPTH: a place's distance → its focus depth 0 (the glass) … 1 (the sky), by anchors (street near ≈ 0.35, far ≈ 0.65, the facade opposite
   ≈ 0.72, roofs ≈ 0.82, hills ≈ 0.95). This is the stand-in's city (PLAN.md: the baked 3D city replaces the painting, not this law). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { passTraffic } from '../../../pure/passes.js';   // RAIN-1: the vehicles' law, shared by the picture and the sound

const F=Object.freeze, D2R=Math.PI/180;
export const CAM=F({ x:8, y:25, z:0, yaw:14, pitch:-13 });   // 8th floor (25 m), over the boulevard's near road; yaw from +z towards +x, pitch down (degrees)
/* the boulevard across (x, metres). RAIN-1 (the founder: «a real boulevard»): the left row's facades and pavement, ONE road (two car lanes and two tram
   tracks, the wires over them), then the PROMENADE — a double row of plane trees along the road, benches, lamps, a kiosk, and the café terraces in
   front of the house opposite (the right row). kerbA / kerbB the road's kerbs; alleyA / alleyB the promenade's edges (the stand-in paints it as the
   alley); treeRows the two rows of plane trees; zFrom: the vehicles drive on past our house (under the window) to here. Rows begin at `rows`. */
export const STREET=F({ left:-4, rows:12, kerbA:0, kerbB:13, alleyA:13, alleyB:40, opp:40, tracks:F([8.9, 10.4, 11.4, 12.9]), wire:6.2,
  lanes:F([F({ x:2.6, dir:-1 }), F({ x:6.2, dir:1 })]),   // dir −1 comes towards us (headlights), +1 goes away (tail lights): driving on the right
  treeRows:F([14.6, 17.6]), terrace:F([34, 40]), len:1600, zFrom:-80, lampEvery:24, treeEvery:11 });   // RAIN-5: the boulevard goes on to 1.6 km (it was 520 m: the founder saw it end)
/* RAIN-5: THE BEND — beyond z0 the boulevard curves gently to the right (x grows ∝ (z − z0)², then straight on at that angle from z1), so the houses of
   the row opposite close the view and its end is never seen. One law for every consumer: project() bends any world point, the bake bends its
   geometry by it; nothing nearer than z0 moves (the street seen today is unchanged) */
export const BEND=F({ z0:600, z1:1700, k:2.2e-4 });
export const bendX=z=> z<=BEND.z0 ? 0 : z<=BEND.z1 ? BEND.k*(z-BEND.z0)**2 : BEND.k*(BEND.z1-BEND.z0)*(BEND.z1-BEND.z0+2*(z-BEND.z1));
/* RAIN-1: the prepared city's picture covers every screen shape the room's lens law allows: x −BAKE_EXT[0]…BAKE_EXT[0], y −BAKE_EXT[1]…BAKE_EXT[1]
   (view-angle units: a 2.4 : 1 screen at 55°, an upright phone at 68° — tan 34°) */
export const BAKE_EXT=F([1.25, 0.6745]);
/* the houses: blocks along both rows (z from, z to, eaves height, mansard height) */
export const BLOCKS=F({
  opp:F([F([12, 40, 21, 4]), F([40, 66, 23, 3.5]), F([66, 98, 18, 3.5]), F([98, 138, 23, 4]), F([138, 180, 20, 3]), F([180, 236, 22, 4]), F([236, 320, 19, 3]), F([320, 520, 21, 3]),
    F([520, 610, 22, 3.5]), F([610, 720, 19, 3]), F([720, 850, 23, 4]), F([850, 990, 20, 3]), F([990, 1130, 22, 3.5]), F([1130, 1260, 21, 3])]),   // RAIN-5: appended beyond 520 m (those before untouched)
  left:F([F([16, 42, 22, 3.5]), F([42, 70, 20, 3]), F([70, 112, 23, 3.5]), F([112, 160, 19, 3]), F([160, 230, 21, 3]), F([230, 520, 20, 3]),
    F([520, 640, 21, 3]), F([640, 780, 23, 3.5]), F([780, 920, 19, 3]), F([920, 1060, 22, 3]), F([1060, 1200, 20, 3.5])]) });
export const FLOOR=F({ h:3.5, ground:4.4, bay:3.4, winW:1.3, winH:2.2, sill:0.9 });   // floor height, ground floor, bay pitch, window size, sill above the floor
export const FAR=F({ z:2000, roofs:F([14, 34]), hillsZ:3200, hillsY:F([150, 330]) });   // the roofs beyond the boulevard's end, the hills' distance and heights

/* the camera's basis (unit vectors): right, up, forward */
export const camBasis=(c=CAM)=>{ const y=c.yaw*D2R, p=c.pitch*D2R, f=[Math.sin(y)*Math.cos(p), Math.sin(p), Math.cos(y)*Math.cos(p)], r=[Math.cos(y), 0, -Math.sin(y)];
  const u=[f[1]*r[2]-f[2]*r[1], f[2]*r[0]-f[0]*r[2], f[0]*r[1]-f[1]*r[0]]; return { r, u, f }; };
const B0=camBasis();
/* a world point → { x, y (view-angle units), z (distance along the view axis, m), dist (m) } ; z ≤ 0: behind the eye */
export function project(P, c=CAM, B=B0){
  const vx=P[0]+bendX(P[2])-c.x, vy=P[1]-c.y, vz=P[2]-c.z, z=vx*B.f[0]+vy*B.f[1]+vz*B.f[2];   // RAIN-5: the bend (0 nearer than BEND.z0)
  return { x:(vx*B.r[0]+vy*B.r[1]+vz*B.r[2])/z, y:(vx*B.u[0]+vy*B.u[1]+vz*B.u[2])/z, z, dist:Math.hypot(vx, vy, vz) };
}
/* a view direction (view-angle units) → the world ray's unit direction */
export function rayOf(x, y, B=B0){ const d=[B.f[0]+x*B.r[0]+y*B.u[0], B.f[1]+x*B.r[1]+y*B.u[1], B.f[2]+x*B.r[2]+y*B.u[2]], n=Math.hypot(...d); return [d[0]/n, d[1]/n, d[2]/n]; }
/* the vanishing point of the boulevard (+z) and the horizon's height in view-angle units */
export const vanishing=(B=B0)=>({ x:B.f[2] ? B.r[2]/B.f[2] : 0, y:B.u[2]/B.f[2], horizon:-B.f[1]/Math.hypot(B.f[0], B.f[2]) });

/* DEPTH: distance (m) → focus depth, piecewise linear in log distance through the anchors; the sky is 1 */
export const DEPTH=F({ glass:0, frame:0.03, sky:1, anchors:F([F([20, 0.35]), F([60, 0.65]), F([110, 0.72]), F([450, 0.82]), F([3200, 0.95])]) });
export function depthOf(dist){
  const A=DEPTH.anchors; if(!(dist>0)) return DEPTH.glass; if(dist<=A[0][0]) return A[0][1]*Math.max(0, dist)/A[0][0];
  for(let i=1;i<A.length;i++) if(dist<=A[i][0]){ const [d0, v0]=A[i-1], [d1, v1]=A[i], t=Math.log(dist/d0)/Math.log(d1/d0); return v0+(v1-v0)*t; }
  const [d0, v0]=A[A.length-1]; return Math.min(0.99, v0+0.03*Math.log(dist/d0));
}
/* the far hills' height (m) at a view direction x (their silhouette) */
export const hillsAt=x=>{ const [lo, hi]=FAR.hillsY; return lo+(hi-lo)*(0.55+0.25*Math.sin(x*2.3+0.9)+0.13*Math.sin(x*6.1+2.4)+0.07*Math.sin(x*13.7+0.3)-0.2*Math.exp(-((x+0.55)**2)/0.02)); };
const blockAt=(side, z)=>{ for(const b of BLOCKS[side]) if(z>=b[0] && z<b[1]) return b; return null; };
/* WHAT THE EYE SEES at a view direction: { kind: 'sky' | 'hills' | 'roofs' | 'opp' | 'left' | 'street', dist (m), depth, hit (world point) } —
   a ray cast against the two rows of houses (with their roofs), the ground, the far roofs and the hills. The depth map is this, per pixel. */
export function sceneAt(x, y, B=B0){
  const d=rayOf(x, y, B), o=[CAM.x, CAM.y, CAM.z]; let best=null;
  const take=(kind, t)=>{ if(t>0 && (!best || t<best.dist)) best={ kind, dist:t, hit:[o[0]+d[0]*t, o[1]+d[1]*t, o[2]+d[2]*t] }; };
  for(const [side, X] of [['opp', STREET.opp], ['left', STREET.left]]) if(d[0]!==0){ const t=(X-o[0])/d[0]; if(t>0){ const z=o[2]+d[2]*t, y2=o[1]+d[1]*t, b=blockAt(side, z);
      if(b && y2>=0 && y2<=b[2]+b[3]) take(side, t); } }
  /* the roofs' slope (a mansard leans back 3 m over its height): seen from above, the top of a row — a plane per block */
  for(const [side, X, s] of [['opp', STREET.opp, 1], ['left', STREET.left, -1]]) if(d[1]<0){ for(const b of BLOCKS[side]){ const t=(b[2]+b[3]-o[1])/d[1]; if(!(t>0)) continue;
      const hx=o[0]+d[0]*t, hz=o[2]+d[2]*t; if(hz>=b[0] && hz<b[1] && (s>0 ? hx>=X && hx<=X+16 : hx<=X && hx>=X-16)) take('roofs', t); } }
  if(d[1]<0) take('street', -o[1]/d[1]);
  if(!best && d[2]>0){ const t=(FAR.z-o[2])/d[2], yy=o[1]+d[1]*t; if(yy<=FAR.roofs[0]+(FAR.roofs[1]-FAR.roofs[0])*(0.5+0.5*Math.sin(x*17+1.3)*Math.sin(x*5.1))) take('roofs', t); }
  if(!best && d[2]>0){ const t=(FAR.hillsZ-o[2])/d[2], yy=o[1]+d[1]*t; if(yy<=hillsAt(x)) take('hills', t); }
  if(!best) return { kind:'sky', dist:Infinity, depth:DEPTH.sky, hit:null };
  best.depth=depthOf(best.dist); return best;
}

/* THE WINDOWS of both rows (the stand-in): every bay of every floor above the ground floor, projected; the window's rectangle in the view is the
   bounding box of its four corners; its depth by its distance. → { x, y, hw, hh, depth, side, floor, z, amb, warm }: only those in front of the eye,
   at least WIN_MIN wide, and — nearest first — never one overlapping a nearer one. Seeded: the same city everywhere. */
export const RAIN_CITY_SEED=0x43495459, WIN_MIN=0.0024;
export function cityWindows(){
  const R=seeded(RAIN_CITY_SEED), all=[];
  for(const side of ['opp', 'left']) for(const b of BLOCKS[side]){ const X=STREET[side], n=Math.floor((b[1]-b[0])/FLOOR.bay), z0=b[0]+((b[1]-b[0])-n*FLOOR.bay)/2;
    for(let f=0;;f++){ const y0=FLOOR.ground+f*FLOOR.h+FLOOR.sill; if(y0+FLOOR.winH>b[2]-0.6) break;
      for(let k=0;k<n;k++){ const zc=z0+(k+0.5)*FLOOR.bay, amb=R(), warm=R(), c=[[zc-FLOOR.winW/2, y0], [zc+FLOOR.winW/2, y0], [zc-FLOOR.winW/2, y0+FLOOR.winH], [zc+FLOOR.winW/2, y0+FLOOR.winH]].map(([z, y])=>project([X, y, z]));
        if(c.some(p=>p.z<=1)) continue;
        const xs=c.map(p=>p.x), ys=c.map(p=>p.y), x0=Math.min(...xs), x1=Math.max(...xs), yb=Math.min(...ys), yt=Math.max(...ys), dist=project([X, y0+FLOOR.winH/2, zc]).dist;
        const w={ x:(x0+x1)/2, y:(yb+yt)/2, hw:(x1-x0)/2, hh:(yt-yb)/2, depth:depthOf(dist), dist, side, floor:f, z:zc, amb, warm };
        if(w.hw>=WIN_MIN) all.push(w); } } }
  all.sort((a, b)=>a.dist-b.dist); const out=[];
  for(const w of all) if(!out.some(o=>Math.abs(o.x-w.x)<o.hw+w.hw && Math.abs(o.y-w.y)<o.hh+w.hh)) out.push(w);
  return out;
}
/* THE LAMPS (RAIN-1): along the left pavement's kerb, between the two rows of plane trees, and along the promenade before the terraces — their heads
   (world), for the lights and their reflections; the bake places its lamp heads exactly here */
export const LAMP_ROWS=F([F([STREET.kerbA+0.6, 0, 7.2]), F([(STREET.treeRows[0]+STREET.treeRows[1])/2, 0.5, 5.2]), F([STREET.terrace[0]-1, 0.25, 4.6])]);   // [x, phase, head height]
export function cityLamps(){
  const out=[];
  for(const [x, ph, y] of LAMP_ROWS)
    for(let z=8+ph*STREET.lampEvery;z<STREET.len*0.7;z+=STREET.lampEvery) out.push({ p:[x, y, z], foot:[x, 0, z] });
  return out;
}
/* RELEASE-1 (A): how much the near lamps light a person standing at (x, z): 0…1, each lamp's pool a soft disc (σ = 0.75 × its height) — the same lamps */
export function lampLitAt(x, z){ let s=0;
  for(const [lx, ph, y] of LAMP_ROWS){ const z0=8+ph*STREET.lampEvery, k=Math.round((z-z0)/STREET.lampEvery), w=2*(0.75*y)**2;
    for(let j=k-1;j<=k+1;j++){ const lz=z0+j*STREET.lampEvery; if(j<0 || lz>=STREET.len*0.7) continue; s+=Math.exp(-((x-lx)**2+(z-lz)**2)/w); } }
  return Math.min(1, s); }
/* the plane trees (RAIN-1): two rows between the road and the promenade — their crowns' centres and radii (world), seeded */
export const NEAR_TREES=40;   // RAIN-2: plane trees nearer than this (z, m) are pruned: their crowns lower and smaller (the bake's planeTree thins their leaves too)
export function cityTrees(){
  const R=seeded(RAIN_CITY_SEED^0x54524545), out=[];
  for(const x of STREET.treeRows) for(let z=4+R()*4;z<STREET.len*0.6;z+=STREET.treeEvery*(0.85+0.3*R())){ const px=x+(R()-0.5)*0.5, h=7.6+R()*1.6, r=2.6+R()*0.9, near=z<NEAR_TREES; out.push({ p:[px, near ? h*0.85 : h, z], r: near ? r*0.6 : r, near }); }   // RAIN-2: the nearest pruned, lower and thinner (an upright phone's lower half stays open)
  return out;
}
/* THE TRAFFIC at time t (s): cars on their lanes and the tram on its track, as a seeded schedule — RAIN-1: the shared law (pure/passes.js), which the
   room's sound reads too, so every car in the picture is heard as it passes under the window and every pass heard has its car. → [{ kind: 'car' |
   'tram', lane, slot, dir, z (front, m), x (m), len (m), v }]. Each lane: one slot every `every` s, a car with chance p × density (Wave and the mood
   set the density), all cars of a lane at one speed (none catches another); they drive from zFrom (behind our house) to the far end, or back. */
export const TRAFFIC=F({ every:F([10, 12]), p:0.6, speed:F([11.5, 12.5]), carLen:4.4, tram:84, tramP:0.75, tramSpeed:8, tramLen:28, tramTrack:F([9.65, 12.15]) });
/* RAIN-2: a vehicle's existence is decided by the density booked COMMIT s before it enters (≥ the sound's lead 9 s + the margin); a change is booked
   DENS_MARGIN s ahead of the picture's audio time, so the audio thread has it before it counts (pure/passes.js passBook) */
export const DENS_MARGIN=0.5, DENS_COMMIT=10;
export const RAIN_TRAFFIC=F({ commit:DENS_COMMIT, len:520, zFrom:STREET.zFrom, every:TRAFFIC.every, p:TRAFFIC.p, speed:TRAFFIC.speed, carLen:TRAFFIC.carLen, lanes:STREET.lanes,
  tram:F({ every:TRAFFIC.tram, p:TRAFFIC.tramP, speed:TRAFFIC.tramSpeed, len:TRAFFIC.tramLen, track:TRAFFIC.tramTrack, bellZ:70, bellAhead:30, bellP:0.5, curveZ:470 }),
  stop:F({ every:F([150, 260]), x:1.25, z:F([420, 58]), stop:58, v:9, brake:6, wait:F([4, 7]), walk:2.5, door:1.2, go:2.6, person:F({ x:-0.4, z:58.8 }) }) });   // RAIN-6b (3): the taxi that stops by a doorway of the left row   // RAIN-6b (2): the bell before the crossing, the squeal where the line curves off
/* the listener: the eye at the window (its right vector for the pan) */
export const EAR=F({ x:CAM.x, y:CAM.y, z:CAM.z, r:F(camBasis().r) });
export const trafficAt=(t, density=1)=>passTraffic(RAIN_TRAFFIC, t, density);   // density: a number or a book (RAIN-2)
/* the density of the traffic: the mood's own amount × (1 + 0.6 × Wave), in steps of 0.05 (the picture and the sound send the same number) */
export const trafficDensity=(mood, wave)=>Math.round(Math.max(0, mood)*(1+0.6*Math.max(0, Math.min(1, +wave||0)))*20)/20;
