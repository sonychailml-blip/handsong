/* NIGHT-6 slice 7 — THE CANOPY AND THE MOON'S WINDOW, as numbers. Pure (rule #36), node-tested (data row «FOREST canopy (app)»): the room
   (../forest-canopy.js) only builds what these give. After the sketch «Живой лес»'s ideas; our own laws.
   - THE GAP: seen from the eye, an ellipse of sky round the moon's whole path (pure/cycle.js NIGHT.moon) with its halo, and a low band down the
     stream's far reach — no leaf there (inGap), so the moon always shows and the view down the stream stays open.
   - CROWNS: from each trunk's upper part limbs grow out and up, split twice (repeated splitting), and carry leaf sprays at and along their
     twigs. A level takes a share of each crown's sprays (always the same ones: the first of each twig).
   - THE UNDERSTOREY by ecology: young trees (4–8 m) where it is light and far from the big trunks, hazel-like shrubs on the moister ground and
     the banks, saplings in the light near the viewer — never in the water, never in the view's aisle near the eye, never under the eye; and
     never in front of the playing light: young trees and shrubs grow outside its reach (forest.js FOREST_BOUNDS: beside it or behind it),
     saplings at the sides of the view (the user: the light stays clearly visible).
   - STARS on the sky dome (the depth test hides those behind trunks and leaves).
   Units: metres; angles of view in degrees from the eye (azimuth: 0 straight ahead, negative left; elevation: up). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, streamAt, bankGround } from './forestlife.js';
import { forestGround } from './fireflies.js';
import { NIGHT } from '../../../pure/cycle.js';
import { moistAt, lightAt } from './floor.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }, TAU=2*Math.PI, D=180/Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
export const CANOPY=F({ eye:F([0, 1.55, 5.5]), seed:0x43414E4F,
  gap:F({ az:9.5, el:9 }),                                        // the margin round the moon's path (degrees): its halo and a ring of sky
  view:F({ az:10, el:13, u:F([0, 0.3]) }),                         // the band down the stream's far reach (u along the stream)
  crown:F({ from:0.5, to:0.92, limbs:F([3, 5]), len:F([2.2, 4.4]), rise:F([0.45, 0.95]), split:0.62, spread:0.55, r0:0.09, sprayEvery:0.7, spray:F([0.9, 1.5]) }),
  young:F({ H:F([4, 8]), r:F([0.06, 0.12]), gap:2.6, light:0.42 }),
  shrubs:F({ stems:F([5, 8]), H:F([1.2, 2.4]), moist:F([0.14, 0.21]) }),   // the damper spots where they may grow (outside the light's reach damp spans only ~0.12–0.19)
  saplings:F({ H:F([1.4, 3]), eye:F([3.6, 9]), light:0.45 }),
  stars:F({ r:95, el:F([6, 75]), az:F([-85, 85]) }),
  aisle:2.4, reach:F({ x:6.6, z:-15.5, sapX:3.4 }) });   // the light's reach (FOREST_BOUNDS x ±6, z ≥ −15) and a margin; saplings' sides
/* the crown sheet (tools/forest-bake.mjs draws it): a 1024² master, four leaf sprays 512² each (2 × 2) — beech-like, hazel, lobed, small-leaved;
   smaller copies 512, 256. A spray never shows larger than about 200 px, so the master is 2.5× the screen's need */
export const CROWN_ATLAS=F({ size:1024, derived:F([512, 256]), cell:512 });
export function crownCellUv(k){ const A=CROWN_ATLAS, x=(k%2)*A.cell, y=Math.floor(k/2)*A.cell; return [x/A.size, 1-(y+A.cell)/A.size, A.cell/A.size, A.cell/A.size]; }
/* the direction from the eye to (x, y, z) → [azimuth, elevation] in degrees */
export function viewAngles(x, y, z){ const E=CANOPY.eye, dx=x-E[0], dy=y-E[1], dz=z-E[2], h=Math.hypot(dx, dz); return [Math.atan2(dx, -dz)*D, Math.atan2(dy, h)*D]; }
const MOON=(()=>{ const M=NIGHT.moon, A=[], E=[]; for(let k=0;k<64;k++){ const th=k/64*TAU, [a,e]=viewAngles(M.x+M.ax*Math.sin(th), M.y+M.ay*Math.sin(2*th+0.7), M.z); A.push(a); E.push(e); }
  return F({ az:F([Math.min(...A), Math.max(...A)]), el:F([Math.min(...E), Math.max(...E)]) }); })();
const VIEW=(()=>{ const V=CANOPY.view, A=[]; for(let u=V.u[0];u<=V.u[1]+1e-9;u+=0.02){ const p=streamAt(u); A.push(viewAngles(p.x, 0, p.z)[0]); } return F([Math.min(...A), Math.max(...A)]); })();
export const MOON_VIEW=MOON;
/* in the gap: the moon's ellipse (its path's box widened by the margin) or the band down the stream */
export function inGap(x, y, z){ const [a, e]=viewAngles(x, y, z), G=CANOPY.gap, V=CANOPY.view;
  const ca=(MOON.az[0]+MOON.az[1])/2, ce=(MOON.el[0]+MOON.el[1])/2, ha=(MOON.az[1]-MOON.az[0])/2+G.az, he=(MOON.el[1]-MOON.el[0])/2+G.el;
  if(((a-ca)/ha)**2+((e-ce)/he)**2<1) return true;
  return e<V.el && a>VIEW[0]-V.az && a<VIEW[1]+V.az; }

/* one crown: limbs from the trunk's upper part, each split twice; sprays at and along the twigs → { limbs:[[x0,y0,z0, x1,y1,z1, r0, r1]], sprays:[{ x, y, z, s, yaw, tilt, k, first }] } */
function crownOf(tx, tz, r, H, R){ const C=CANOPY.crown, gy=forestGround(tx, tz), limbs=[], sprays=[], n=C.limbs[0]+Math.floor(R()*(C.limbs[1]-C.limbs[0]+1)), a0=R()*TAU;
  const grow=(x, y, z, dx, dy, dz, len, rad, depth)=>{ const l=Math.hypot(dx,dy,dz)||1, ux=dx/l, uy=dy/l, uz=dz/l, ex=x+ux*len, ey=y+uy*len, ez=z+uz*len, re=rad*0.62;
    limbs.push([x, y, z, ex, ey, ez, rad, re]);
    if(depth<2){ for(const sd of [-1, 1]){ const sp=C.spread*(0.7+R()*0.6)*sd, c=Math.cos(sp), s=Math.sin(sp), nx=ux*c-uz*s, nz=ux*s+uz*c, ny=uy*(0.85+R()*0.3)+0.08;
        grow(ex, ey, ez, nx, ny, nz, len*C.split*(0.8+R()*0.4), re, depth+1); } }
    else { let first=true; for(let t=1; t>0.15; t-=C.sprayEvery/len*(0.8+R()*0.4)){ sprays.push({ x:lerp(x,ex,t)+(R()-0.5)*0.3, y:lerp(y,ey,t)+(R()-0.5)*0.25, z:lerp(z,ez,t)+(R()-0.5)*0.3,
          s:C.spray[0]+R()*(C.spray[1]-C.spray[0]), yaw:R()*TAU, tilt:(R()-0.5)*0.9, k:Math.floor(R()*4), first }); first=false; } } };
  for(let k=0;k<n;k++){ const a=a0+k*TAU/n+(R()-0.5)*0.8, h=gy+H*(C.from+R()*(C.to-C.from)), rise=C.rise[0]+R()*(C.rise[1]-C.rise[0]), len=C.len[0]+R()*(C.len[1]-C.len[0]);
    grow(tx+Math.cos(a)*r*0.6, h, tz+Math.sin(a)*r*0.6, Math.cos(a), rise, Math.sin(a), len*(0.6+r), C.r0*(0.6+r), 0); }
  return { limbs, sprays }; }
/* a free place on the floor for the understorey */
const outOfReach=(x, z)=>Math.abs(x)>CANOPY.reach.x || z<CANOPY.reach.z;
function floorFree(x, z, trunks, gap, items, water=0.4){ if(streamNear(x,z).d<STREAM.half+water) return false; const E=CANOPY.eye;
  if(Math.hypot(x-E[0], z-E[2])<3.4 || (Math.abs(x)<CANOPY.aisle && z>-8)) return false;
  for(const [tx,tz,r] of trunks) if(Math.hypot(x-tx,z-tz)<r*1.6+gap) return false;
  for(const [px,pz,pr] of items) if(Math.hypot(x-px,z-pz)<pr) return false; return true; }

/* counts: { crowns (0 | 1), crownShare (0…1: the share of each crown's sprays), young, shrubs, saplings, stars } → { limbs (every crown's and
   the understorey's wood), sprays (leaf cards: { x, y, z, s, yaw, tilt, k (variant 0…3), of: 'crown'|'young'|'shrub'|'sapling' }), stems
   (the understorey's trunks and stems as limbs), young, shrubs, saplings (their places), stars ([x, y, z, size, phase]) } — no spray in the gap */
export function canopyPlaces(counts, trunks, seed=CANOPY.seed, noGap=false){   // noGap: probes only (the CONTROL that a leaf can block the moon)
  const limbs=[], sprays=[], keep=s=>noGap || !inGap(s.x, s.y, s.z), share=clamp(counts.crownShare==null ? 1 : counts.crownShare, 0, 1);
  if(counts.crowns){ trunks.forEach(([x,z,r],i)=>{ const R=seeded(seed+101*i), c=crownOf(x, z, r, 16, R); limbs.push(...c.limbs);
    c.sprays.forEach((s,j)=>{ if((s.first || (j*0.618)%1<share) && keep(s)) sprays.push({ ...s, of:'crown' }); }); }); }
  const R=seeded(seed+7), items=[], young=[], shrubs=[], saplings=[], stems=[];
  { const Y=CANOPY.young; for(let g=0; young.length<(counts.young|0) && g<6000; g++){ const x=(R()*2-1)*16, z=2-R()*28; if(!outOfReach(x,z) || lightAt(x,z)<Y.light || !floorFree(x, z, trunks, Y.gap, items)) continue;
      const H=Y.H[0]+R()*(Y.H[1]-Y.H[0]), r=Y.r[0]+R()*(Y.r[1]-Y.r[0]), gy=bankGround(x,z); items.push([x, z, 1.8]); young.push({ x, z, H, r });
      stems.push([x, gy-0.1, z, x+(R()-0.5)*0.2, gy+H*0.7, z+(R()-0.5)*0.2, r, r*0.45]);
      const c=crownOf(x, z, r*3, H, seeded(seed+5000+young.length)); stems.push(...c.limbs.map(l=>[l[0], l[1], l[2], l[3], l[4], l[5], l[6]*0.45, l[7]*0.45]));
      c.sprays.forEach((s,j)=>{ if((s.first || (j*0.618)%1<share) && keep(s)) sprays.push({ ...s, s:s.s*0.85, of:'young' }); }); } }
  { const S=CANOPY.shrubs; for(let g=0; shrubs.length<(counts.shrubs|0) && g<6000; g++){ const x=(R()*2-1)*14, z=3-R()*26, m=moistAt(x,z); if(!outOfReach(x,z) || R()>0.05+0.95*smooth(S.moist[0], S.moist[1], m) || inGap(x, 1.2, z) || !floorFree(x, z, trunks, 0.8, items, 0.6)) continue;   // damper is likelier; never in the view down the stream
      const gy=bankGround(x,z), n=S.stems[0]+Math.floor(R()*(S.stems[1]-S.stems[0]+1)), H=S.H[0]+R()*(S.H[1]-S.H[0]); items.push([x, z, 1.6]); shrubs.push({ x, z, H, n });
      for(let k=0;k<n;k++){ const a=R()*TAU, out=0.4+R()*0.9, ox=Math.cos(a)*out, oz=Math.sin(a)*out, h=H*(0.7+R()*0.4);
        stems.push([x, gy-0.05, z, x+ox*0.5, gy+h*0.7, z+oz*0.5, 0.025, 0.016], [x+ox*0.5, gy+h*0.7, z+oz*0.5, x+ox, gy+h, z+oz, 0.016, 0.008]);
        for(let j=0;j<3;j++){ const t=0.45+j*0.25, sx=x+ox*t, sy=gy+h*(0.5+0.5*t), sz=z+oz*t, sp={ x:sx, y:sy, z:sz, s:0.55+R()*0.35, yaw:R()*TAU, tilt:(R()-0.5)*1.2, k:Math.floor(R()*4), of:'shrub' };
          if((j===0 || (j*0.618)%1<share) && keep(sp)) sprays.push(sp); } } } }
  { const S=CANOPY.saplings, E=CANOPY.eye; for(let g=0; saplings.length<(counts.saplings|0) && g<6000; g++){ const a=-Math.PI/2+(R()-0.5)*2.4, rr=S.eye[0]+R()*(S.eye[1]-S.eye[0]), x=E[0]+Math.cos(a)*rr, z=E[2]+Math.sin(a)*rr;
      if(Math.abs(x)<CANOPY.reach.sapX || lightAt(x,z)<S.light || !floorFree(x, z, trunks, 0.9, items)) continue;
      const gy=bankGround(x,z), H=S.H[0]+R()*(S.H[1]-S.H[0]); items.push([x, z, 1.1]); saplings.push({ x, z, H });
      stems.push([x, gy-0.05, z, x+(R()-0.5)*0.15, gy+H, z+(R()-0.5)*0.15, 0.02, 0.006]);
      for(let j=0;j<4+Math.floor(R()*4);j++){ const t=0.45+R()*0.55, sp={ x:x+(R()-0.5)*0.5, y:gy+H*t, z:z+(R()-0.5)*0.5, s:0.35+R()*0.25, yaw:R()*TAU, tilt:(R()-0.5)*1.0, k:Math.floor(R()*4), of:'sapling' }; if(keep(sp)) sprays.push(sp); } } }
  const stars=[]; { const S=CANOPY.stars, Rs=seeded(seed+9), E=CANOPY.eye; for(let i=0;i<(counts.stars|0);i++){ const az=(S.az[0]+Rs()*(S.az[1]-S.az[0]))/D, el=Math.asin(lerp(Math.sin(S.el[0]/D), Math.sin(S.el[1]/D), Rs()));
      stars.push([E[0]+Math.sin(az)*Math.cos(el)*S.r, E[1]+Math.sin(el)*S.r, E[2]-Math.cos(az)*Math.cos(el)*S.r, 0.6+Math.pow(Rs(),3)*1.8, Rs()*TAU]); } }
  return { limbs, stems, sprays, young, shrubs, saplings, stars };
}
