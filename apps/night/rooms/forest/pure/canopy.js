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
/* FOREST-2e: a NATURAL young broad-leaved tree (the founder: the one in the middle of the frame read as leaf clumps on sticks) — one leader almost to
   the top, a clean lower stem (shade prunes it), 9–13 branches in a spiral (137.5°) from a third of the height, rising, longest a little below the
   middle of the crown (an egg-shaped crown), each with a side twig; sprays of ONE leaf kind (one species) along their outer parts and round the
   leader's top. Its own seeded draws (R). → { limbs, sprays } like crownOf */
export function youngLeaf(x, z, H, r, R){ const gy=bankGround(x, z), limbs=[], sprays=[], k=Math.floor(R()*4), lean=R()*TAU, lk=0.04+R()*0.05, n=9+Math.floor(R()*5), a0=R()*TAU;
  const lx=Math.cos(lean)*lk, lz=Math.sin(lean)*lk, axis=h=>[x+lx*h/H*h*0.6, gy+h, z+lz*h/H*h*0.6];   // the leader bends gently towards its light
  let p=axis(-0.1); for(let j=1;j<=5;j++){ const h=H*0.97*j/5, q=axis(h); limbs.push([p[0], p[1], p[2], q[0], q[1], q[2], r*(1-0.8*(j-1)/5), r*(1-0.8*j/5)]); p=q; }
  const spray=(px, py, pz, s, tilt)=>sprays.push({ x:px+(R()-0.5)*0.18, y:py+(R()-0.5)*0.16, z:pz+(R()-0.5)*0.18, s, yaw:R()*TAU, tilt, k, first:true });
  for(let i=0;i<n;i++){ const u=i/(n-1), h=H*(0.34+0.58*u), b=axis(h), a=a0+i*2.39996+(R()-0.5)*0.3, len=H*0.3*Math.pow(Math.sin(Math.PI*(0.18+0.74*u)), 0.8)*(0.8+R()*0.4)+0.25,
      up=0.55+0.5*u+(R()-0.5)*0.2, c=Math.cos(a), s=Math.sin(a), l1=Math.hypot(1, up), rb=r*0.32*(1-0.5*u);
    const m=[b[0]+c*len*0.55/l1, b[1]+up*len*0.55/l1, b[2]+s*len*0.55/l1], e=[m[0]+c*len*0.45, m[1]+len*0.45*(up*0.5-0.12), m[2]+s*len*0.45];   // rises, then levels out at the tip
    limbs.push([b[0], b[1], b[2], m[0], m[1], m[2], rb, rb*0.6], [m[0], m[1], m[2], e[0], e[1], e[2], rb*0.6, rb*0.25]);
    const sa=a+(R()<0.5 ? -1 : 1)*(0.6+R()*0.4), sl=len*(0.3+R()*0.2), se=[m[0]+Math.cos(sa)*sl, m[1]+sl*0.25, m[2]+Math.sin(sa)*sl]; limbs.push([m[0], m[1], m[2], se[0], se[1], se[2], rb*0.4, rb*0.15]);
    for(let t=0.3;t<=1.001;t+=0.17) spray(b[0]+(e[0]-b[0])*t, b[1]+(e[1]-b[1])*t+0.08, b[2]+(e[2]-b[2])*t, (0.62+R()*0.22)*(1-0.25*u), (R()-0.5)*0.5);
    spray(se[0], se[1]+0.06, se[2], 0.55+R()*0.2, (R()-0.5)*0.5); }
  const top=axis(H*0.97); for(let j=0;j<4;j++) spray(top[0], top[1]-0.25-j*0.35, top[2], 0.55+R()*0.15, (R()-0.5)*0.4);   // the leader's top in leaf
  return { limbs, sprays }; }
/* FOREST-2e: a young broad-leaved tree whose crown stands in the gap (the moon's window and the view down the stream: no leaf grows there) steps
   sideways, the nearer side first, up to 12 m, until at most LEAF_GAP of its crown (an egg of 0.32 H round its upper part) is in the gap, on free floor
   (no trunk, no water, no other young tree, off every mushroom's line of sight); else the place with the least → [x, z] (unchanged when clear) */
function leafSpot(x, z, H, trunks, others=[], blocks=null){ const share=(px, pz)=>{ const gy=bankGround(px, pz); let n=0, t=0; for(let h=0.4;h<=1.001;h+=0.15) for(let j=0;j<8;j++){ const a=j*TAU/8, rr=H*0.32*Math.sin(Math.PI*Math.min(1, (h-0.3)/0.75)); t++; if(inGap(px+Math.cos(a)*rr, gy+H*h, pz+Math.sin(a)*rr)) n++; } return n/t; };
  if(share(x, z)<=LEAF_GAP) return [x, z]; const sd=x<0 ? -1 : 1; let best=[x, z], bs=share(x, z);
  for(let k=1;k<=30;k++) for(const s of [sd, -sd]){ const px=x+s*k*0.4; if(!floorFree(px, z, trunks, 1.2, [], 0.6) || others.some(o=>Math.hypot(o.x-px, o.z-z)<LEAF_APART) || (blocks && blocks(px, z, H))) continue; const v=share(px, z); if(v<=LEAF_GAP) return [px, z]; if(v<bs){ bs=v; best=[px, z]; } }
  return best; }
const LEAF_GAP=0.15, LEAF_APART=3.5;   // at most 15 % of the crown in the gap; 3.5 m from every other young tree (a spruce's reach + its own crown): my guesses
/* a free place on the floor for the understorey */
const outOfReach=(x, z)=>Math.abs(x)>CANOPY.reach.x || z<CANOPY.reach.z;
function floorFree(x, z, trunks, gap, items, water=0.4){ if(streamNear(x,z).d<STREAM.half+water) return false; const E=CANOPY.eye;
  if(Math.hypot(x-E[0], z-E[2])<3.4 || (Math.abs(x)<CANOPY.aisle && z>-8)) return false;
  for(const [tx,tz,r] of trunks) if(Math.hypot(x-tx,z-tz)<r*1.6+gap) return false;
  for(const [px,pz,pr] of items) if(Math.hypot(x-px,z-pz)<pr) return false; return true; }

/* counts: { crowns (0 | 1), crownShare (0…1: the share of each crown's sprays), young, shrubs, saplings, stars } → { limbs (every crown's and
   the understorey's wood), sprays (leaf cards: { x, y, z, s, yaw, tilt, k (variant 0…3), of: 'crown'|'young'|'shrub'|'sapling' }), stems
   (the understorey's trunks and stems as limbs), young, shrubs, saplings (their places), stars ([x, y, z, size, phase]) } — no spray in the gap */
export function canopyPlaces(counts, trunks, seed=CANOPY.seed, noGap=false, clear=null, skip=null, leaf=false){   // FOREST-2e: leaf ({ blocks(x, z, H) } or false) — a young broad-leaved tree that stays (not a spruce) grows as youngLeaf, off the mushrooms' sight   // noGap: probes only (the CONTROL that a leaf can block the moon); FOREST-2: clear(x, z, kind) → [x, z] — the understorey kept clear of solids (?forest=new; no random draw)   // FOREST-2c: skip(kind, x, z, H) → true: that young tree or sapling is placed (and draws its numbers) but grows nothing here (a spruce takes its place)
  const limbs=[], sprays=[], keep=s=>noGap || !inGap(s.x, s.y, s.z), share=clamp(counts.crownShare==null ? 1 : counts.crownShare, 0, 1);
  if(counts.crowns){ trunks.forEach(([x,z,r],i)=>{ const R=seeded(seed+101*i), c=crownOf(x, z, r, 16, R); limbs.push(...c.limbs);
    c.sprays.forEach((s,j)=>{ if((s.first || (j*0.618)%1<share) && keep(s)) sprays.push({ ...s, of:'crown' }); }); }); }
  const R=seeded(seed+7), items=[], young=[], shrubs=[], saplings=[], stems=[];
  { const Y=CANOPY.young; for(let g=0; young.length<(counts.young|0) && g<6000; g++){ let x=(R()*2-1)*16, z=2-R()*28; if(!outOfReach(x,z) || lightAt(x,z)<Y.light || !floorFree(x, z, trunks, Y.gap, items)) continue;
      const H=Y.H[0]+R()*(Y.H[1]-Y.H[0]), r=Y.r[0]+R()*(Y.r[1]-Y.r[0]); items.push([x, z, 1.8]); const from=[x, z]; if(clear) [x, z]=clear(x, z, 'young'); const gy=bankGround(x,z); young.push(clear ? { x, z, H, r, from } : { x, z, H, r }); const sk=!!(skip && skip('young', x, z, H)), JK=[]; if(sk) young[young.length-1].sp=true;   // FOREST-2: today's place decides the rest (items), the plant stands at its clear place
      if(leaf && !sk){ R(); R(); young[young.length-1].leaf=young.length; continue; }   // grown after every young tree has its place (it keeps clear of them); the stem's two draws kept   // the stem's two draws kept: everything after as seeded
      (sk ? JK : stems).push([x, gy-0.1, z, x+(R()-0.5)*0.2, gy+H*0.7, z+(R()-0.5)*0.2, r, r*0.45]);
      if(clear && young.length && young[young.length-1].from){ const Y0=young[young.length-1], dx=x-Y0.from[0], dz=z-Y0.from[1], dy=gy-bankGround(Y0.from[0], Y0.from[1]);   // FOREST-2: the crown grown at today's place (today's sprays kept), carried whole
        const c=crownOf(Y0.from[0], Y0.from[1], r*3, H, seeded(seed+5000+young.length)); (sk ? JK : stems).push(...c.limbs.map(l=>[l[0]+dx, l[1]+dy, l[2]+dz, l[3]+dx, l[4]+dy, l[5]+dz, l[6]*0.45, l[7]*0.45]));
        c.sprays.forEach((s,j)=>{ if((s.first || (j*0.618)%1<share) && keep(s)) (sk ? JK : sprays).push({ ...s, x:s.x+dx, y:s.y+dy, z:s.z+dz, s:s.s*0.85, of:'young' }); }); }
      else { const c=crownOf(x, z, r*3, H, seeded(seed+5000+young.length)); (sk ? JK : stems).push(...c.limbs.map(l=>[l[0], l[1], l[2], l[3], l[4], l[5], l[6]*0.45, l[7]*0.45]));
      c.sprays.forEach((s,j)=>{ if((s.first || (j*0.618)%1<share) && keep(s)) (sk ? JK : sprays).push({ ...s, s:s.s*0.85, of:'young' }); }); } }
    for(const q of young) if(q.leaf){ const n0=q.leaf; q.was=[q.x, q.z]; [q.x, q.z]=leafSpot(q.x, q.z, q.H, trunks, young.filter(o=>o!==q), leaf.blocks); q.leaf=true;   // FOREST-2e: the natural young broad-leaved trees
      const c=youngLeaf(q.x, q.z, q.H, q.r*0.75, seeded(seed+5000+n0)); stems.push(...c.limbs); c.sprays.forEach(s=>{ if(keep(s)) sprays.push({ ...s, of:'young' }); }); } }
  { const S=CANOPY.shrubs; for(let g=0; shrubs.length<(counts.shrubs|0) && g<6000; g++){ let x=(R()*2-1)*14, z=3-R()*26; const m=moistAt(x,z); if(!outOfReach(x,z) || R()>0.05+0.95*smooth(S.moist[0], S.moist[1], m) || inGap(x, 1.2, z) || !floorFree(x, z, trunks, 0.8, items, 0.6)) continue;   // damper is likelier; never in the view down the stream
      items.push([x, z, 1.6]); const x0=x, z0=z; if(clear) [x, z]=clear(x, z, 'shrub'); const gy=bankGround(x,z), dgy= clear ? gy-bankGround(x0, z0) : 0, n=S.stems[0]+Math.floor(R()*(S.stems[1]-S.stems[0]+1)), H=S.H[0]+R()*(S.H[1]-S.H[0]); shrubs.push({ x, z, H, n });
      for(let k=0;k<n;k++){ const a=R()*TAU, out=0.4+R()*0.9, ox=Math.cos(a)*out, oz=Math.sin(a)*out, h=H*(0.7+R()*0.4);
        stems.push([x, gy-0.05, z, x+ox*0.5, gy+h*0.7, z+oz*0.5, 0.025, 0.016], [x+ox*0.5, gy+h*0.7, z+oz*0.5, x+ox, gy+h, z+oz, 0.016, 0.008]);
        for(let j=0;j<3;j++){ const t=0.45+j*0.25, sx=x+ox*t, sy=gy+h*(0.5+0.5*t), sz=z+oz*t, sp={ x:sx, y:sy, z:sz, s:0.55+R()*0.35, yaw:R()*TAU, tilt:(R()-0.5)*1.2, k:Math.floor(R()*4), of:'shrub' };
          if((j===0 || (j*0.618)%1<share) && keep(clear ? { ...sp, x:sp.x-(x-x0), y:sp.y-dgy, z:sp.z-(z-z0) } : sp)) sprays.push(sp); } } } }   // FOREST-2: kept or not as at today's place
  { const S=CANOPY.saplings, E=CANOPY.eye; for(let g=0; saplings.length<(counts.saplings|0) && g<6000; g++){ const a=-Math.PI/2+(R()-0.5)*2.4, rr=S.eye[0]+R()*(S.eye[1]-S.eye[0]); let x=E[0]+Math.cos(a)*rr, z=E[2]+Math.sin(a)*rr;
      if(Math.abs(x)<CANOPY.reach.sapX || lightAt(x,z)<S.light || !floorFree(x, z, trunks, 0.9, items)) continue;
      items.push([x, z, 1.1]); const x0=x, z0=z; if(clear) [x, z]=clear(x, z, 'sapling'); const gy=bankGround(x,z), dgy= clear ? gy-bankGround(x0, z0) : 0, H=S.H[0]+R()*(S.H[1]-S.H[0]); saplings.push({ x, z, H }); const sk=!!(skip && skip('sapling', x, z, H)), JK=[]; if(sk) saplings[saplings.length-1].sp=true;   // FOREST-2f: a spruce grows in its place (the census checks it is there)
      (sk ? JK : stems).push([x, gy-0.05, z, x+(R()-0.5)*0.15, gy+H, z+(R()-0.5)*0.15, 0.02, 0.006]);
      for(let j=0;j<4+Math.floor(R()*4);j++){ const t=0.45+R()*0.55, sp={ x:x+(R()-0.5)*0.5, y:gy+H*t, z:z+(R()-0.5)*0.5, s:0.35+R()*0.25, yaw:R()*TAU, tilt:(R()-0.5)*1.0, k:Math.floor(R()*4), of:'sapling' }; if(keep(clear ? { ...sp, x:sp.x-(x-x0), y:sp.y-dgy, z:sp.z-(z-z0) } : sp)) (sk ? JK : sprays).push(sp); } } }
  const stars=[]; { const S=CANOPY.stars, Rs=seeded(seed+9), E=CANOPY.eye; for(let i=0;i<(counts.stars|0);i++){ const az=(S.az[0]+Rs()*(S.az[1]-S.az[0]))/D, el=Math.asin(lerp(Math.sin(S.el[0]/D), Math.sin(S.el[1]/D), Rs()));
      stars.push([E[0]+Math.sin(az)*Math.cos(el)*S.r, E[1]+Math.sin(el)*S.r, E[2]-Math.cos(az)*Math.cos(el)*S.r, 0.6+Math.pow(Rs(),3)*1.8, Rs()*TAU]); } }
  return { limbs, stems, sprays, young, shrubs, saplings, stars };
}
