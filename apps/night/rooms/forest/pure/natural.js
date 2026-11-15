/* FOREST-2 — THE FOREST'S OBJECTS MADE NATURAL, as numbers (pure, rule #36; data row «FOREST natural (app)», browser row «FOREST plants clear of
   solids»). Only with the address word ?forest=new (forest.js NEW); without it nothing here is called and the forest is today's.
   - rootsOrganic(trunks, per, R): the near trees' roots — the same count per tree as today's law — each growing out of one of its trunk's flare
     lobes (turned with the trunk: layout.js forestTrunkYaws) as a tall fin whose ridge starts up the bark and falls off into a flat root along the
     ground (an elliptical section, its lower part buried), tapering, meandering, sinking at its end into the soil (or the bank); some fork
     (FOREST-1's law, kept: the founder asked for it again).
   - THE PLANTS CLEAR OF SOLIDS (the founder: no fern, grass tuft or sapling out of a rock, no flat card cutting through a rock, log, stump, root or
     trunk): solidsOf(...) lists every solid's footprint on the ground (a disc or a capsule); clearSpot(x, z, reach, solids, o) keeps a plant
     whose reach touches none, else moves it to the nearest clear place on a fixed spiral starting away from the solid it touched — no random
     draw (everything else stays seeded as today), never into the water, never under the eye. What really grows on things stays on them
     (GROWERS). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, bankGround } from './forestlife.js';
import { forestTrunkYaws } from './layout.js';
import { ROOTS as BULGE } from './relief.js';
import { WOOD, trunkRadius, trunkOuter } from './wood.js';

const F=Object.freeze, TAU=2*Math.PI;
export const NATURAL=F({
  /* the organic roots (FOREST-1's numbers): length, fin height hf (× (0.55 + hfR·r)), its fall-off lam, the fin's extra width, the end's dive, the
     root's radius rho + rhoK·r, the section's flatness, sinking, burial, meander, rings; forks (share, where along it, length, angle) */
  organic:F({ len:F([1.1, 2.4]), hf:F([0.22, 0.5]), hfR:1.0, lam:F([0.26, 0.44]), wide:1.5, dive:0.04, rho:0.05, rhoK:0.17, flat:0.55, sink:0.9, bury:0.05, wig:F([0.3, 0.12]),
    rings:15, fork:F([0.5, 0.4, 0.66]), forkLen:F([0.45, 0.8]), forkAng:F([0.45, 0.85]) }),
  /* the clearance: a rock's footprint is its largest horizontal half-axis × rockK (its shape's lobes and the room's ±15 % jitter); the spiral's step and
     rings; a plant moves at most step × rings; margin added to every footprint */
  clear:F({ rockK:1.05, margin:0.02, step:0.08, rings:22, eye:F([0, 5.5]) }),   // at most 22 × 8 cm = 1.76 m: «FOREST nothing lost» allows a plant 1.8 m
  /* each plant's reach on the ground (m): how far its cards spread from the point it stands on (× its own size) */
  reach:F({ fern:0.45, fernLow:0.22, herb:0.5, grass:0.06, sapling:0.25, shrub:0.4, young:0.3 }), tall:F({ sapling:0.45, shrub:1.4, young:1.0 }),   // tall: the sprays' spread against trunks
  /* what grows on things, per level (added: today's counts all stay) */
  growers:F({ reduced:F({ shrooms:12, sprouts:10 }), full:F({ shrooms:34, sprouts:24 }) }) });
/* what may grow ON a solid (listed in the row): never moved off it */
export const GROWERS=F(['mushrooms on logs, stumps and at root bases', 'moss cushions on roots, rocks and at the feet', 'ivy up the trunks', 'bracket fungi on stumps and snags',
  'moss and lichen on bark, roots, logs and rocks', 'small sprouts on the rotting log', 'dew and webs']);

/* the ground a root lies on — the carved floor plus the soil's swell round every foot (pure/relief.js groundRoots, the same law) */
export function rootGround(x, z, trunks){ let g=bankGround(x, z); if(streamNear(x, z).d<BULGE.water) return g;
  for(const [tx, tz, r] of trunks){ const dx=x-tx, dz=z-tz, re=r*BULGE.reach; if(Math.abs(dx)>re*3 || Math.abs(dz)>re*3) continue; const q=(dx*dx+dz*dz)/(re*re); if(q<9) g+=r*BULGE.k*Math.exp(-q); } return g; }
/* the flare's lobe peaks round a trunk, in its own angles (flareAt's lobes), highest first */
const LOBES=(()=>{ const L=WOOD.flare.lob, f=a=>L[0]*Math.sin(a*L[1]+L[2])+L[3]*Math.sin(a*L[4]+L[5]), pk=[]; const N=720;
  for(let i=0;i<N;i++){ const a=i/N*TAU, p=f(a-TAU/N), q=f(a), r=f(a+TAU/N); if(q>p && q>=r) pk.push([a, q]); } return F(pk.sort((x,y)=>y[1]-x[1]).map(([a])=>a)); })();
export const flareLobes=()=>LOBES.slice();
/* one organic root from (x0, z0) heading a, length L, fin height hf (0: a fork), base radius rho0 → { pts: [[x, yRound, z, w]…] (a round root of
   half width w whose top is the ridge — what the moss and the rows read), sec: [[w, hh, lift]…] (the elliptical section: half width, half height,
   the centre's lift), top: [ridge heights] } or null (too short) */
function organicRoot(x0, z0, a, L, hf, lam, rho0, trunks, R, startT=0){ const O=NATURAL.organic, n=O.rings, p1=R()*TAU, p2=R()*TAU, m1=(R()*2-1), m2=(R()*2-1), pts=[], sec=[], top=[];
  let x=x0, z=z0, ph=a; const step=L/(n-1);
  for(let j=0;j<n;j++){ const t=j/(n-1), tt=startT+(1-startT)*t, d=t*L;
    if(j>0){ ph=a+O.wig[0]*m1*Math.sin(2.1*Math.PI*t+p1)+O.wig[1]*m2*Math.sin(5*t+p2); x+=Math.cos(ph)*step; z+=Math.sin(ph)*step; }
    if(j>1 && streamNear(x, z).d<STREAM.half+0.15) break;
    const g=rootGround(x, z, trunks), rho=rho0*Math.pow(1-0.92*t, 1.3)+0.006, fin=hf*Math.exp(-d/lam), w=rho*(1+O.wide*Math.exp(-d/lam)), tp=g+fin+rho*(O.flat-O.sink*Math.pow(tt, 3))-O.dive*Math.pow(tt, 4), bot=g-O.bury-rho*0.6;
    const hh=Math.max(rho*0.5, (tp-bot)/2), yc=(tp+bot)/2; pts.push([x, tp-w, z, w]); sec.push([w, hh, yc-(tp-w)]); top.push(tp); }
  if(pts.length<4) return null;
  if(pts.length<n){ const k=pts.length-1, g=rootGround(pts[k][0], pts[k][2], trunks), dy=Math.max(0.05, top[k]-(g-0.3*pts[k][3])); pts[k][1]-=dy; sec[k][2]-=dy/2; sec[k][1]=Math.max(pts[k][3]*0.5, sec[k][1]-dy/2); top[k]-=dy; }   // stopped by the stream: it dives into the bank
  return { pts, sec, top }; }
/* FOREST-2 «roots»: TODAY'S roots, shaped — each follows its own path of today exactly (nothing at its place moves: the moss on it, the plants round
   it), only its section changes: a fin out of the flare at the trunk (hf, falling off over lam), elliptical and flatter along the ground, tapering,
   sinking at its end; half of them fork (an addition, flagged fork, listed after every main root). todayRoots: rootsOf's list (pure/wood.js) */
export function rootsOrganic(trunks, per, R, nearTrees, todayRoots, keepOff=[]){ const O=NATURAL.organic, out=[], forks=[];   // keepOff [[x, z]…]: the mushrooms — no fork comes within 0.6 m of one (a fork is new: it must hide nothing)
  for(const tr of todayRoots||[]){ const r=trunks[tr.tree][2], P=tr.pts, seg=[0]; for(let k=1;k<P.length;k++) seg.push(seg[k-1]+Math.hypot(P[k][0]-P[k-1][0], P[k][2]-P[k-1][2]));
    const L=seg[seg.length-1]||0.01, n=O.rings, hf=(O.hf[0]+R()*(O.hf[1]-O.hf[0]))*(0.55+O.hfR*r), lam=(O.lam[0]+R()*(O.lam[1]-O.lam[0]))*(0.7+r), rho0=P[0][3]*1.1, pts=[], sec=[], top=[];
    for(let j=0;j<n;j++){ const d=j/(n-1)*L, t=d/L; let k=1; while(k<P.length-1 && seg[k]<d) k++; const u=Math.max(0, Math.min(1, (d-seg[k-1])/((seg[k]-seg[k-1])||1)));
      const x=P[k-1][0]+(P[k][0]-P[k-1][0])*u, z=P[k-1][2]+(P[k][2]-P[k-1][2])*u, g=rootGround(x, z, trunks), rho=rho0*Math.pow(1-0.92*t, 1.3)+0.006, fin=hf*Math.exp(-d/lam), w=Math.min(P[k-1][3]+(P[k][3]-P[k-1][3])*u, rho*(1+O.wide*Math.exp(-d/lam)));   // never wider than today's root there
      const topToday=P[k-1][1]+P[k-1][3]+(P[k][1]+P[k][3]-P[k-1][1]-P[k-1][3])*u;   // never above today's root there: it hides nothing new
      const tp=Math.min(topToday+0.01, g+fin+rho*(O.flat-O.sink*Math.pow(t, 3))-O.dive*Math.pow(t, 4)), bot=g-O.bury-rho*0.6, hh=Math.max(rho*0.5, (tp-bot)/2), yc=(tp+bot)/2; pts.push([x, tp-w, z, w]); sec.push([w, hh, yc-(tp-w)]); top.push(tp); }
    const me={ tree:tr.tree, pts, sec, top }; out.push(me);
    if(R()<O.fork[0]){ const tf=O.fork[1]+R()*(O.fork[2]-O.fork[1]), j=Math.min(n-2, Math.round(tf*(n-1))), p=pts[j], side=R()<0.5 ? -1 : 1;
      const pa=Math.atan2(pts[j+1][2]-p[2], pts[j+1][0]-p[0])+side*(O.forkAng[0]+R()*(O.forkAng[1]-O.forkAng[0])), Lf=L*(1-tf)*(O.forkLen[0]+R()*(O.forkLen[1]-O.forkLen[0]));
      const fk=organicRoot(p[0], p[2], pa, Lf, 0, lam, sec[j][0]*0.75, trunks, R, tf); if(fk && !fk.pts.some(q=>keepOff.some(m=>Math.hypot(m[0]-q[0], m[1]-q[2])<0.6))) forks.push({ tree:tr.tree, fork:true, ...fk }); } else { R(); R(); R(); R(); } }
  return out.concat(forks); }
/* the top of the shaped roots at (x, z) (the highest ridge within its half width), or null */
export function rootTopAt(x, z, roots){ let best=null; for(const rt of roots||[]) if(rt.top) for(let j=0;j<rt.pts.length;j++){ const p=rt.pts[j]; if(Math.hypot(p[0]-x, p[2]-z)<p[3]*1.2 && (best==null || rt.top[j]>best)) best=rt.top[j]; } return best; }

/* ---------- the plants clear of solids ---------- */
/* every solid's footprint: { kind, x, z, r } (a disc) or { kind, ax, az, bx, bz, r } (a capsule). trunks [[x, z, r]]; wood (woodPlaces): roots,
   logs, stumps, snags; rocks: the stream's (streamRocks: x, z, s or sx/sz) and today's aisle rocks [[x, z, size]] */
export function solidsOf({ trunks=[], wood=null, rocks=[], aisle=[] }={}){ const C=NATURAL.clear, out=[];
  for(const [x, z, r] of trunks) out.push({ kind:'trunk', x, z, r:trunkOuter(r, 0.2) });
  for(const k of rocks){ const hx=k.sx||k.s*1.25, hz=k.sz||k.s; out.push({ kind:'rock', x:k.x, z:k.z, r:Math.max(hx, hz)*C.rockK }); }
  for(const [x, z, sz] of aisle) out.push({ kind:'rock', x, z, r:sz*1.3*C.rockK });
  if(wood){
    for(const rt of wood.roots||[]) for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j]; out.push({ kind:'root', ax:A[0], az:A[2], bx:B[0], bz:B[2], r:Math.max(A[3], B[3]) }); }
    for(const L of wood.logs||[]) out.push({ kind:'log', ax:L.a[0], az:L.a[2], bx:L.b[0], bz:L.b[2], r:Math.max(L.r0, L.r1) });
    for(const S of wood.stumps||[]) out.push({ kind:'stump', x:S.x, z:S.z, r:S.r*1.3 });
    for(const S of wood.snags||[]) out.push({ kind:'snag', x:S.x, z:S.z, r:trunkOuter(S.s, 0.2) }); }
  return out; }
const capD=(x, z, s)=>{ const vx=s.bx-s.ax, vz=s.bz-s.az, t=Math.max(0, Math.min(1, ((x-s.ax)*vx+(z-s.az)*vz)/(vx*vx+vz*vz||1))); return Math.hypot(x-s.ax-vx*t, z-s.az-vz*t); };
/* the first solid a plant at (x, z) reaching `reach` touches (null: none) */
export function solidHit(x, z, reach, solids, low=reach, tall=reach){ const m=NATURAL.clear.margin;   // low: the reach against the low roots; tall: against trunks and snags (sprays high up reach them)
  for(const s of solids){ const d= s.ax==null ? Math.hypot(x-s.x, z-s.z) : capD(x, z, s); if(d<s.r+(s.kind==='root' ? low : s.kind==='trunk' || s.kind==='snag' ? tall : reach)+m) return s; } return null; }
const solidC=s=> s.ax==null ? [s.x, s.z] : [(s.ax+s.bx)/2, (s.az+s.bz)/2];
/* → [x, z, moved]: (x, z) itself when clear, else the nearest clear place on the spiral (rings of `step`, each ring's first direction away from the solid
   touched); o: { water (the least distance beyond the stream's half width, may be negative for the bank's sedges), eye (m from the eye's ground point),
   box: [x0, x1, z0, z1] (stay inside), aisle: [half width, z from] (stay out of the view's aisle: |x| < half width beyond z) }. A plant no clear place
   takes stays where it was (counted by the row) */
export function clearSpot(x, z, reach, solids, o={}){ if(o.avoid){ const r=clearSpot1(x, z, reach, solids, o); return r[2] || !solidHit(x, z, reach, solids, o.low==null ? reach : o.low, o.tall==null ? reach : o.tall) ? r : clearSpot1(x, z, reach, solids, { ...o, avoid:null }); } return clearSpot1(x, z, reach, solids, o); }
function clearSpot1(x, z, reach, solids, o={}){ const C=NATURAL.clear, low=o.low==null ? reach : o.low, tall=o.tall==null ? reach : o.tall, hit=solidHit(x, z, reach, solids, low, tall); if(!hit) return [x, z, false];
  const [cx, cz]=solidC(hit), a0=Math.atan2(z-cz, x-cx), water=o.water==null ? 0.2 : o.water, eye=o.eye==null ? 2.6 : o.eye, B=o.box;
  const view=a=>Math.abs(a[0]-C.eye[0])/Math.max(0.5, C.eye[1]-a[1]), v0=view([x, z])+0.02, eyeD=a=>Math.hypot(a[0]-C.eye[0], a[1]-C.eye[1]);   // how far off the view's middle the eye sees it (the camera looks along −z)
  const better=(a, b)=>{ const ia=view(a)<=v0, ib=view(b)<=v0; if(ia!==ib) return ia; return ia ? eyeD(a)<eyeD(b) : view(a)<view(b); };   // in view as before → the nearest the eye (as large on screen); else the least off the middle
  for(let k=1;k<=C.rings;k++){ const rr=k*C.step, na=8+4*k; let best=null;
    for(let j=0;j<na;j++){ const a=a0+(j%2 ? 1 : -1)*Math.ceil(j/2)*TAU/na, px=x+Math.cos(a)*rr, pz=z+Math.sin(a)*rr;
      if(B && (px<B[0] || px>B[1] || pz<B[2] || pz>B[3])) continue; if(o.aisle && Math.abs(px)<o.aisle[0] && pz>o.aisle[1]) continue;
      if(Math.hypot(px-C.eye[0], pz-C.eye[1])<eye) continue; if(streamNear(px, pz).d<STREAM.half+water) continue;
      if(o.avoid && o.avoid(px, pz, reach, o.height, x, z)) continue;   // never nearer a mushroom's line of sight than today
      if(!solidHit(px, pz, reach, solids, low, tall) && (!best || better([px, pz], best))) best=[px, pz]; }
    if(best) return [best[0], best[1], true]; }   // the nearest ring with a clear place; on it, the place that keeps the plant in view and as large
  return [x, z, false]; }

/* ---------- the stumps' shape (FOREST-2 «stumps»; ../forest-natural.js natStump builds it) ---------- */
const hash=(x, z)=>{ const s=Math.sin(x*127.1+z*311.7)*43758.5453; return s-Math.floor(s); };
export const stumpShape=St=>{ const R=seeded(Math.floor(hash(St.x, St.z)*1e9)); return { R, nl:5+Math.floor(R()*3), ph:R()*TAU }; };
/* the radius at hb above the ground round angle th: at most 1.1 × r at the ground (today's foot mushrooms stand at 1.15 × r and beyond) */
export const stumpRadius=(St, sh, hb, th)=>{ const e=Math.exp(-(hb+0.14)*5.5), c=Math.max(0, Math.cos(sh.nl*th+sh.ph)); return St.r*(1+e*(0.08+0.14*c*c))*(1+0.03*Math.sin(th*7+hb*9)+0.015*Math.sin(th*17)); };

/* ---------- every mushroom kept visible ---------- */
/* is (x, y, z) inside a root? today's are round tubes (pts [x, y, z, r]), the organic ones elliptical sections (sec [half width, half height, lift]) */
export function rootHit(x, y, z, roots){ for(const rt of roots||[]) for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j], vx=B[0]-A[0], vz=B[2]-A[2], L2=vx*vx+vz*vz||1, t=Math.max(0, Math.min(1, ((x-A[0])*vx+(z-A[2])*vz)/L2));
    const d=Math.hypot(x-A[0]-vx*t, z-A[2]-vz*t), py=A[1]+(B[1]-A[1])*t;
    if(rt.sec){ const S0=rt.sec[j-1], S1=rt.sec[j], w=S0[0]+(S1[0]-S0[0])*t, hh=S0[1]+(S1[1]-S0[1])*t, yc=py+S0[2]+(S1[2]-S0[2])*t; if((d/w)**2+((y-yc)/hh)**2<1) return true; }
    else { const r=A[3]+(B[3]-A[3])*t; if(d*d+(y-py)**2<r*r) return true; } }
  return false; }
/* is (x, y, z) inside a FOREST-2 stump (its foot law)? */
export function stumpHit(x, y, z, stumps){ for(const S of stumps||[]){ const hb=y-S.y; if(hb<-0.14 || hb>S.h) continue; const sh=stumpShape(S); if(Math.hypot(x-S.x, z-S.z)<stumpRadius(S, sh, hb, Math.atan2(z-S.z, x-S.x))) return true; } return false; }
/* the life's places (mushrooms and flowers) → the same list with every one the new shapes would bury moved just outside (a cap's middle inside a new
   root or stump that today's did not hold): the nearest free place on rings of 3 cm, at most 0.45 m, on the ground; moved: a list to fill
   ([i, kind, dx, dz]). solids { roots, stumps } — the new ones; today { roots } */
export function shroomsFree(places, solids, today, ground, moved=[]){
  const capY=p=>p.y+(p.kind==='shroom' ? p.s*1.6 : p.s*2.6), hit=(x, y, z)=>rootHit(x, y, z, solids.roots) || stumpHit(x, y, z, solids.stumps), was=(x, y, z)=>rootHit(x, y, z, today.roots);
  return places.map((p, i)=>{ const cy=capY(p); if(!hit(p.x, cy, p.z) || was(p.x, cy, p.z)) return p;
    for(let k=1;k<=15;k++){ const rr=k*0.03, na=8+2*k; for(let j=0;j<na;j++){ const a=j/na*TAU, x=p.x+Math.cos(a)*rr, z=p.z+Math.sin(a)*rr, y=ground(x, z), c=y+(cy-p.y);
        if(!hit(x, c, z) && !hit(x, y+0.01, z)){ moved.push([i, p.kind, +(x-p.x).toFixed(3), +(z-p.z).toFixed(3)]); return { ...p, x, y, z }; } } }
    moved.push([i, p.kind, 'kept: no free place within 0.45 m']); return p; }); }

/* ---------- what grows ON things (the founder: welcome) ---------- */
/* wood (woodPlaces with organic roots) → { shrooms: small mushroom clusters beside the roots' low parts, on the ground and clear of every root and trunk
   (a candidate that would be buried is left out — they are additions), sprouts: small herbs on top of the logs (the floor's draw; never moved off them) };
   n: { shrooms, sprouts }; trunks [[x, z, r]] */
export function growersOn(wood, n={ shrooms:12, sprouts:10 }, seed=0x47524F57, trunks=[], sight=null){ let s=seed>>>0; const R=()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^t>>>15, t|1); t^=t+Math.imul(t^t>>>7, t|61); return ((t^t>>>14)>>>0)/4294967296; };   // sight: sightBlock of today's mushrooms — an added one never stands in their way
  const shrooms=[], sprouts=[], roots=(wood.roots||[]).filter(r=>!r.fork && r.pts.length>=8);
  const free=(x, y, z, sz)=>!rootHit(x, y+sz, z, wood.roots) && !rootHit(x, y+sz*2.2, z, wood.roots) && !trunks.some(([tx, tz, r])=>Math.hypot(x-tx, z-tz)<trunkOuter(r, 0.2)+0.05);
  for(let k=0;k<roots.length && shrooms.length<n.shrooms;k++){ if(R()<0.3) continue; const rt=roots[k], j=Math.min(rt.pts.length-2, 5+Math.floor(R()*3)), p=rt.pts[j], q=rt.pts[j+1], hx=q[0]-p[0], hz=q[2]-p[2], hl=Math.hypot(hx, hz)||1, side=R()<0.5 ? -1 : 1, w=rt.sec ? rt.sec[j][0] : p[3];
    for(let c=0, m=1+Math.floor(R()*3); c<m && shrooms.length<n.shrooms; c++){ const sz=0.03+R()*0.035, off=w+0.04+sz*1.4+R()*0.05, along=(R()-0.5)*0.14, x=p[0]+(-hz/hl)*side*off+hx/hl*along, z=p[2]+(hx/hl)*side*off+hz/hl*along, y=rootGround(x, z, []);
      const ph=R()*TAU, rot=R()*TAU; if(free(x, y, z, sz) && !(sight && sight(x, z, sz*1.5, sz*2.6))) shrooms.push({ x, y, z, s:sz, ph, rot, on:'root' }); } }
  const logs=(wood.logs||[]).filter(L=>!L.bridge).concat((wood.logs||[]).filter(L=>L.bridge)), sp=['sorrel', 'forb', 'anemone'];
  const logShrooms=(wood.shrooms||[]).filter(q=>q.on==='log');
  for(let k=0;k<n.sprouts*6 && sprouts.length<n.sprouts && logs.length;k++){ const L=logs[k%logs.length], u=0.15+R()*0.7, r=L.r0+(L.r1-L.r0)*u, th=(R()-0.5)*0.9, dx=L.b[0]-L.a[0], dz=L.b[2]-L.a[2], l=Math.hypot(dx, dz)||1;
    const sx=L.a[0]+dx*u-dz/l*Math.sin(th)*r, sz=L.a[2]+dz*u+dx/l*Math.sin(th)*r; if(logShrooms.some(q=>Math.hypot(q.x-sx, q.z-sz)<0.45)){ R(); R(); continue; }   // never over a mushroom on the log
    sprouts.push({ sp:sp[k%3], x:L.a[0]+dx*u-dz/l*Math.sin(th)*r, y:L.a[1]+(L.b[1]-L.a[1])*u+Math.cos(th)*r*0.92, z:L.a[2]+dz*u+dx/l*Math.sin(th)*r, s:0.45+R()*0.3, rot:R()*TAU, on:'log' }); }
  return { shrooms, sprouts }; }
/* the mushrooms' lines of sight from the eye (NATURAL.clear.eye, where the fixed views look from): a MOVED plant may not stand between the eye and a
   mushroom, nor at its side (its cards would hide the glow) — shrooms [{ x, z, s }] → (px, pz, reach) → true when it would */
export const EYE_Y=1.55;   // the eye's height over the ground (forest.js camPos)
export function sightBlock(shrooms){ const E=NATURAL.clear.eye;
  /* a plant of height ht at distance t along the sight to a mushroom L away crosses it where the line, falling from the eye to the cap, is lower than the
     plant: t > L·(1 − ht / EYE_Y) — only close in front of the mushroom (or just beside it) */
  const near=(m, px, pz, reach, ht)=>{ const vx=m.x-E[0], vz=m.z-E[1], L=Math.hypot(vx, vz)||1, ux=vx/L, uz=vz/L, t=(px-E[0])*ux+(pz-E[1])*uz; if(t>L+0.35 || t<L*(1-Math.min(1, ht/EYE_Y))-0.25) return Infinity;
    const pe=Math.abs((px-E[0])*uz-(pz-E[1])*ux); return pe<reach+0.12+(m.s||0.05)*1.6 ? pe : Infinity; };   // its distance from the line of sight (Infinity: out of the way)
  /* blocks when the plant would stand in a mushroom's way closer to its line of sight than it stood at (ox, oz) — a move never makes a glow less seen */
  const f=(px, pz, reach, ht=0.6, ox=null, oz=null)=>shrooms.some(m=>{ const pn=near(m, px, pz, reach, ht); if(pn===Infinity) return false; const po= ox==null ? Infinity : near(m, ox, oz, reach, ht); return pn<po-0.02; });
  /* how much nearer the mushrooms' lines of sight than today (m; 0: none) — the fallback picks the clear place with the least */
  f.penalty=(px, pz, reach, ht=0.6, ox=null, oz=null)=>shrooms.reduce((a, m)=>{ const pn=near(m, px, pz, reach, ht); if(pn===Infinity) return a; const po= ox==null ? Infinity : near(m, ox, oz, reach, ht), lim=reach+0.12+(m.s||0.05)*1.6; return a+Math.max(0, Math.min(po, lim)-pn); }, 0);
  return f; }
/* a moved plant keeps its size ON SCREEN: its scale × (new eye distance / old), kept only while its larger reach stays clear (else ×1) */
export function keepSize(x0, z0, x, z, reach, solids, low=reach){ const E=NATURAL.clear.eye, k=Math.hypot(x-E[0], z-E[1])/Math.max(0.5, Math.hypot(x0-E[0], z0-E[1]));
  return k>1 && !solidHit(x, z, reach*k, solids, low*k) ? k : 1; }

/* ---------- the ferns, exactly: their own fronds against the solids in 3D ---------- */
/* solids with heights: trunks/snags (their mean radius at each height), stumps (to their tops), logs (round), roots (under their ridges), rocks (an
   upright cylinder to their tops — conservative against the drawn stone). ground(x, z): the floor's height; grid of 1 m cells */
export function solids3Of({ trunks=[], wood=null, rocks=[], aisle=[], ground }){ const grid=new Map(), key=(i, j)=>i+','+j;
  const put=(x0, z0, x1, z1, s)=>{ for(let i=Math.floor(Math.min(x0, x1));i<=Math.floor(Math.max(x0, x1));i++) for(let j=Math.floor(Math.min(z0, z1));j<=Math.floor(Math.max(z0, z1));j++){ const k=key(i, j); if(!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } };
  for(const [x, z, r] of trunks){ const R=trunkOuter(r, 0); put(x-R, z-R, x+R, z+R, { k:'trunk', x, z, r, y0:ground(x, z)+WOOD.trunk.foot }); }
  if(wood){ for(const S of wood.snags||[]){ const R=trunkOuter(S.s, 0); put(S.x-R, S.z-R, S.x+R, S.z+R, { k:'trunk', x:S.x, z:S.z, r:S.s, y0:S.y+WOOD.trunk.foot }); }
    for(const S of wood.stumps||[]){ const R=S.r*1.3; put(S.x-R, S.z-R, S.x+R, S.z+R, { k:'stump', x:S.x, z:S.z, r:R, top:S.y+S.h+0.05 }); }
    for(const L of wood.logs||[]){ const r=Math.max(L.r0, L.r1); put(Math.min(L.a[0], L.b[0])-r, Math.min(L.a[2], L.b[2])-r, Math.max(L.a[0], L.b[0])+r, Math.max(L.a[2], L.b[2])+r, { k:'log', a:L.a, b:L.b, r:r*1.05 }); }
    for(const rt of wood.roots||[]) for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j], w=Math.max(A[3], B[3]), top=rt.top ? Math.max(rt.top[j-1], rt.top[j]) : Math.max(A[1], B[1])+w;
      put(Math.min(A[0], B[0])-w, Math.min(A[2], B[2])-w, Math.max(A[0], B[0])+w, Math.max(A[2], B[2])+w, { k:'root', a:A, b:B, w, top:top+0.02 }); } }
  for(const q of rocks){ const R=Math.max(q.sx||q.s*1.25, q.sz||q.s)*1.0, top=(q.y==null ? ground(q.x, q.z) : q.y)+(q.sy||q.s*0.75)*1.25; put(q.x-R, q.z-R, q.x+R, q.z+R, { k:'rock', x:q.x, z:q.z, r:R, top }); }
  for(const [x, z, sz] of aisle){ const R=sz*1.3, top=ground(x, z)+sz*0.12+sz*0.6*1.25; put(x-R, z-R, x+R, z+R, { k:'rock', x, z, r:R, top }); }
  return { grid, key }; }
const seg3=(px, pz, a, b)=>{ const vx=b[0]-a[0], vz=b[2]-a[2], t=Math.max(0, Math.min(1, ((px-a[0])*vx+(pz-a[2])*vz)/(vx*vx+vz*vz||1))); return [Math.hypot(px-a[0]-vx*t, pz-a[2]-vz*t), t]; };
/* is (x, y, z) inside a solid? → its kind or null */
export function inSolid3(x, y, z, S3){ const cell=S3.grid.get(S3.key(Math.floor(x), Math.floor(z))); if(!cell) return null;
  for(const s of cell){
    if(s.k==='trunk'){ const hb=y-s.y0; if(hb>=0 && hb<WOOD.trunk.len && Math.hypot(x-s.x, z-s.z)<trunkRadius(s.r, hb)+0.03) return 'trunk'; }
    else if(s.k==='stump' || s.k==='rock'){ if(y<s.top && Math.hypot(x-s.x, z-s.z)<s.r) return s.k; }
    else if(s.k==='log'){ const [d, t]=seg3(x, z, s.a, s.b), yc=s.a[1]+(s.b[1]-s.a[1])*t; if(Math.hypot(d, y-yc)<s.r) return 'log'; }
    else if(s.k==='root'){ const [d]=seg3(x, z, s.a, s.b); if(d<s.w+0.02 && y<s.top) return 'root'; } }
  return null; }
/* a fern's fronds (today's card 0.42 × 1.15 standing on its foot; each { tilt, yaw, sx, sy }) at (x, y0, z) → their sample points (the card's middle
   and 0.15 m × its scale to each side — the leaflets — from 10 % to 85 % of its height) */
export function frondPoints(x, y0, z, fronds){ const out=[];
  for(const f of fronds){ const ct=Math.cos(f.tilt), st=Math.sin(f.tilt), cy=Math.cos(f.yaw), sy=Math.sin(f.yaw);
    for(const u of [-0.15, 0, 0.15]) for(const v of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]){ const lx=u*f.sx, ly=v*1.15*f.sy, py=ly*ct, pz=ly*st;   // rotate about x (tilt), then about y (yaw): three.js 'YXZ'
      out.push([x+lx*cy+pz*sy, y0+py, z-lx*sy+pz*cy]); } }
  return out; }
/* → [x, z, moved]: the fern stays where none of its fronds lies in a solid, else the nearest such place on the spiral (the same choice as clearSpot) */
export const fernSpot=(x, z, fronds, S3, ground, o={})=>cardSpot(x, z, (px, pz)=>frondPoints(px, ground(px, pz)-0.02, pz, fronds), S3, o);
/* the fine fern's fronds (forest-floor.js frondGeo: a card w × h bent back along its height, z = −t²·h/2, y = t·h·(1 − 0.1·t); each { a (yaw), tilt, s }) at
   (x, y0, z) → their sample points */
export function fineFrondPoints(x, y0, z, fronds, w, h){ const out=[];
  for(const f of fronds){ const ct=Math.cos(f.tilt), st=Math.sin(f.tilt), cy=Math.cos(f.a), sy=Math.sin(f.a);
    for(const u of [-0.42, -0.21, 0, 0.21, 0.42]) for(const t of [0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92]){ const lx=u*w*f.s, ly=t*h*(1-0.1*t)*f.s, lz=-t*t*0.5*h*f.s, py=ly*ct-lz*st, pz=ly*st+lz*ct;
      out.push([x+lx*cy+pz*sy, y0+py, z-lx*sy+pz*cy]); } }
  return out; }
/* a herb's two crossed cards (forest-floor.js crossGeo: unit cards standing on y 0, turned by rot, the second a quarter turn on; w × h its size, h at its
   tallest) at (x, y0, z) → their sample points */
export function herbPoints(x, y0, z, rot, w, h){ const out=[]; for(let k=0;k<2;k++){ const a=rot+k*Math.PI/2, c=Math.cos(a), s=Math.sin(a);
    for(let ui=-5; ui<=5; ui++) for(const v of [0, 0.08, 0.3, 0.55, 0.8, 0.95]){ const lx=ui*0.092*w; out.push([x+lx*c, y0+v*h, z-lx*s]); } } return out; }
/* any card group: pointsAt(px, pz) → its sample points standing at (px, pz); → [x, z, moved] (the nearest clear place, the same choice as clearSpot) */
export function cardSpot(x, z, pointsAt, S3, o={}){ if(o.avoid){ const r=cardSpot1(x, z, pointsAt, S3, o); if(r[2] || !pointsAt(x, z).some(p=>inSolid3(p[0], p[1], p[2], S3))) return r;
    const P=o.avoid.penalty; return P ? cardSpot1(x, z, pointsAt, S3, { ...o, avoid:null, pick:(px, pz)=>P(px, pz, o.reach||0.3, o.height, x, z) }) : cardSpot1(x, z, pointsAt, S3, { ...o, avoid:null }); }   // no way round: the clear place that hides the mushrooms least
  return cardSpot1(x, z, pointsAt, S3, o); }
function cardSpot1(x, z, pointsAt, S3, o={}){ const C=NATURAL.clear, cut=(px, pz)=>pointsAt(px, pz).some(p=>inSolid3(p[0], p[1], p[2], S3));
  if(!cut(x, z)) return [x, z, false];
  const water=o.water==null ? 0.2 : o.water, eye=o.eye==null ? 2.6 : o.eye, B=o.box, view=a=>Math.abs(a[0]-C.eye[0])/Math.max(0.5, C.eye[1]-a[1]), v0=view([x, z])+0.02, eyeD=a=>Math.hypot(a[0]-C.eye[0], a[1]-C.eye[1]);
  const better=(a, b)=>{ const ia=view(a)<=v0, ib=view(b)<=v0; if(ia!==ib) return ia; return ia ? eyeD(a)<eyeD(b) : view(a)<view(b); };
  for(let k=1;k<=C.rings;k++){ const rr=k*C.step, na=8+4*k; let best=null;
    for(let j=0;j<na;j++){ const a=(j%2 ? 1 : -1)*Math.ceil(j/2)*TAU/na, px=x+Math.cos(a)*rr, pz=z+Math.sin(a)*rr;
      if(B && (px<B[0] || px>B[1] || pz<B[2] || pz>B[3])) continue; if(Math.hypot(px-C.eye[0], pz-C.eye[1])<eye) continue; if(streamNear(px, pz).d<STREAM.half+water) continue;
      if(o.avoid && o.avoid(px, pz, o.reach||0.3, o.height, x, z)) continue;   // never nearer a mushroom's line of sight than today
      if(!cut(px, pz) && (!best || better([px, pz], best))) best=[px, pz]; if(o.pick && best && best[0]===px && best[1]===pz) best.p=o.pick(px, pz); }
    if(best && !o.pick) return [best[0], best[1], true];
    if(o.pick){ /* the fallback: every clear place on every ring, the least hiding first, then the nearest */ for(let j=0;j<na;j++){ const a=(j%2 ? 1 : -1)*Math.ceil(j/2)*TAU/na, px=x+Math.cos(a)*rr, pz=z+Math.sin(a)*rr;
        if(B && (px<B[0] || px>B[1] || pz<B[2] || pz>B[3])) continue; if(Math.hypot(px-C.eye[0], pz-C.eye[1])<eye) continue; if(streamNear(px, pz).d<STREAM.half+water) continue; if(cut(px, pz)) continue;
        const pe=o.pick(px, pz); if(!o.fb || pe<o.fb.p-1e-6) o.fb={ x:px, z:pz, p:pe }; if(pe===0) return [px, pz, true]; } } }
  if(o.pick && o.fb) return [o.fb.x, o.fb.z, true];
  return [x, z, false]; }
/* the understorey's leaf sprays high up (young trees' crowns, shrubs, saplings): a spray whose card would cut a trunk or a snag is pushed straight out
   from it until clear (the card's reach 0.62 × its size + 3 cm beyond the trunk's radius at that height); the crowns of the big trees keep theirs.
   stems: [{ x, z, r, y0 }] (trunks and snags) → a new list (an untouched spray is the same object) */
export function spraysClear(sprays, stems){ return sprays.map(p=>{ if(p.of==='crown') return p; let x=p.x, z=p.z, moved=false;
  for(const t of stems){ const hb=p.y-t.y0; if(hb<0 || hb>WOOD.trunk.len) continue; const need=trunkRadius(t.r, hb)+0.62*p.s+0.03, dx=x-t.x, dz=z-t.z, d=Math.hypot(dx, dz);
    if(d<need){ const ux= d>1e-6 ? dx/d : 1, uz= d>1e-6 ? dz/d : 0; x=t.x+ux*need; z=t.z+uz*need; moved=true; } }
  if(moved){ const d=Math.hypot(x-p.x, z-p.z); if(d>1.2){ x=p.x+(x-p.x)*1.2/d; z=p.z+(z-p.z)*1.2/d; } }   // never more than 1.2 m («FOREST nothing lost»)
  return moved ? { ...p, x, z } : p; }); }
