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

const F=Object.freeze, D2R=Math.PI/180;
export const CAM=F({ x:8, y:25, z:0, yaw:14, pitch:-13 });   // 8th floor (25 m), over the boulevard's near road; yaw from +z towards +x, pitch down (degrees)
/* the boulevard across (x, metres): the left row's facades, its pavement, the left road, the middle alley (plane trees, two tram tracks), the right
   road, the right pavement, the facade opposite (the right row); the rows begin at `rows` (the crossing in front of our house before it) */
export const STREET=F({ left:-4, rows:12, kerbA:0, alleyA:12, alleyB:24, kerbB:36, opp:40, tracks:F([16.6, 18.1, 19.9, 21.4]), wire:6.2,
  lanes:F([F({ x:3.2, dir:-1 }), F({ x:8.6, dir:1 }), F({ x:27.4, dir:-1 }), F({ x:32.8, dir:1 })]),   // dir −1 comes towards us (headlights), +1 goes away (tail lights)
  len:520, lampEvery:26, treeEvery:9.5 });
/* the houses: blocks along both rows (z from, z to, eaves height, mansard height) */
export const BLOCKS=F({
  opp:F([F([12, 40, 21, 4]), F([40, 66, 23, 3.5]), F([66, 98, 18, 3.5]), F([98, 138, 23, 4]), F([138, 180, 20, 3]), F([180, 236, 22, 4]), F([236, 320, 19, 3]), F([320, 520, 21, 3])]),
  left:F([F([16, 42, 22, 3.5]), F([42, 70, 20, 3]), F([70, 112, 23, 3.5]), F([112, 160, 19, 3]), F([160, 230, 21, 3]), F([230, 520, 20, 3])]) });
export const FLOOR=F({ h:3.5, ground:4.4, bay:3.4, winW:1.3, winH:2.2, sill:0.9 });   // floor height, ground floor, bay pitch, window size, sill above the floor
export const FAR=F({ z:900, roofs:F([14, 34]), hillsZ:3200, hillsY:F([150, 330]) });   // the roofs beyond the boulevard's end, the hills' distance and heights

/* the camera's basis (unit vectors): right, up, forward */
export const camBasis=(c=CAM)=>{ const y=c.yaw*D2R, p=c.pitch*D2R, f=[Math.sin(y)*Math.cos(p), Math.sin(p), Math.cos(y)*Math.cos(p)], r=[Math.cos(y), 0, -Math.sin(y)];
  const u=[f[1]*r[2]-f[2]*r[1], f[2]*r[0]-f[0]*r[2], f[0]*r[1]-f[1]*r[0]]; return { r, u, f }; };
const B0=camBasis();
/* a world point → { x, y (view-angle units), z (distance along the view axis, m), dist (m) } ; z ≤ 0: behind the eye */
export function project(P, c=CAM, B=B0){
  const vx=P[0]-c.x, vy=P[1]-c.y, vz=P[2]-c.z, z=vx*B.f[0]+vy*B.f[1]+vz*B.f[2];
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
/* THE LAMPS along both kerbs and the alley: their heads (world), for the lights and their reflections */
export function cityLamps(){
  const out=[];
  for(const [x, ph] of [[STREET.kerbA+0.6, 0], [STREET.alleyA+0.5, 0.5], [STREET.alleyB-0.5, 0], [STREET.kerbB-0.6, 0.5]])
    for(let z=8+ph*STREET.lampEvery;z<STREET.len*0.7;z+=STREET.lampEvery) out.push({ p:[x, 7.2, z], foot:[x, 0, z] });
  return out;
}
/* the plane trees of the alley (their crowns' centres and radii, world) */
export function cityTrees(){
  const R=seeded(RAIN_CITY_SEED^0x54524545), out=[];
  for(const x of [STREET.alleyA+1.6, STREET.alleyB-1.6]) for(let z=5+R()*3;z<STREET.len*0.6;z+=STREET.treeEvery*(0.85+0.3*R())) out.push({ p:[x+(R()-0.5)*0.8, 8.5+R()*2, z], r:3.2+R()*1.4 });
  return out;
}
/* THE TRAFFIC at time t (s): cars on their lanes and the tram on its track, as a seeded schedule (the picture and the sound read the same) →
   [{ kind: 'car' | 'tram', lane, dir, z (front, m), x (m), len (m) }]. Each lane: one slot every `every` s, a car in a slot with chance `p`, all
   cars of a lane at one speed (so none catches another). The tram: one slot every `tram` s. */
export const TRAFFIC=F({ every:F([7, 11, 8, 13]), p:0.62, speed:F([11, 12.5, 10, 13]), carLen:4.4, tram:84, tramP:0.75, tramSpeed:8, tramLen:28, tramTrack:F([18.85, 20.65]) });
const hash=(a, b)=>{ let h=(Math.imul(a|0, 0x27d4eb2d)^Math.imul(b|0, 0x165667b1))>>>0; h=Math.imul(h^(h>>>15), 0x85ebca77)>>>0; h=Math.imul(h^(h>>>13), 0xc2b2ae3d)>>>0; return ((h^(h>>>16))>>>0)/4294967296; };
export function trafficAt(t, density=1){
  const out=[], L=STREET.len;
  STREET.lanes.forEach((ln, li)=>{ const P=TRAFFIC.every[li], v=TRAFFIC.speed[li], span=L/v, k1=Math.floor(t/P), k0=Math.floor((t-span)/P)-1;
    for(let k=k0;k<=k1;k++){ if(hash(li+1, k)>=TRAFFIC.p*density) continue; const T=k*P+hash(li+11, k)*P*0.5, a=t-T; if(a<0 || a>span) continue;
      out.push({ kind:'car', lane:li, dir:ln.dir, x:ln.x, z: ln.dir>0 ? a*v : L-a*v, len:TRAFFIC.carLen }); } });
  { const P=TRAFFIC.tram, span=(L+TRAFFIC.tramLen)/TRAFFIC.tramSpeed, k1=Math.floor(t/P), k0=Math.floor((t-span)/P)-1;
    for(let k=k0;k<=k1;k++){ if(hash(99, k)>=TRAFFIC.tramP*Math.min(1, density)) continue; const dir= hash(98, k)<0.5 ? -1 : 1, T=k*P+hash(97, k)*P*0.4, a=t-T; if(a<0 || a>span) continue;
      out.push({ kind:'tram', lane:-1, dir, x:TRAFFIC.tramTrack[dir>0 ? 1 : 0], z: dir>0 ? a*TRAFFIC.tramSpeed : L-a*TRAFFIC.tramSpeed, len:TRAFFIC.tramLen }); } }
  return out;
}
