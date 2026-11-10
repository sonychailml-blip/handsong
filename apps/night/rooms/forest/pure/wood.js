/* NIGHT-6 slice 5 — MOSS, ROOTS AND FALLEN WOOD, as numbers. Pure (rule #36), node-tested (data row «FOREST wood (app)»): the room
   (../forest-wood.js) only builds what these give, and tools/forest-bake.mjs paints the contact shadows from them (shadeBlobs). After the
   sketch «Живой лес»'s ideas; our own laws.
   - flareAt / trunkRadius: the trunks' foot flares into buttresses (one shape for every trunk, scaled by its radius; forest.js bends its
     trunk geometry by it).
   - woodPlaces(counts, trunks): the roots of the near trees; two logs (one on the bank, one across the stream as a bridge); stumps with cut
     tops; standing dead trees (snags); fallen branches; moss cushions at the trees' feet, on roots, on today's rocks and along the bank; ivy
     on the nearest trunks; mushrooms on the logs and stumps; bracket fungi on stumps and snags. Seeded; never in the water (the bridge spans
     it); nothing under the eye. Each list is drawn ONCE at its maximum (WOOD.max) and a level takes its beginning — medium is a part of high,
     so one contact-shadow file serves both.
   - shadeBlobs(trunks, places, rocks): the darkness under what stands at every level (trunks, roots, rocks, logs, stumps, snags), each blob
     [x, z, rx, rz, rot, a]; blobDark(q) its falloff. The map covers WOOD.shade (world x0…x0+w, z0…z0+d). */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, STREAM_LINE, streamNear, streamAt, bankGround } from './forestlife.js';
import { forestGround } from './fireflies.js';
import { ROCKS_TODAY } from './layout.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), TAU=2*Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
export const WOOD=F({ seed:0x574F4F44, eye:F([0, 5.5]),
  trunk:F({ len:16, foot:-0.2, top:0.72 }),                     // forest.js: a 16-m cylinder, its foot 0.2 m below the ground, its top 0.72 of the foot
  flare:F({ k0:0.55, d0:2.6, k1:0.12, d1:0.8, lob:F([0.2, 5, 0, 0.08, 3, 1]), dl:1.8 }),
  near:F({ eyeMin:2.8, eyeMax:13, zMin:-14 }),                  // the near trees: roots, moss at their feet, ivy
  roots:F({ len:F([1.0, 2.2]), r:0.05, rk:0.16, rise:0.32, rings:8 }),
  bridge:F({ z:-6.6, yaw:0.3, half:1.9, r:F([0.22, 0.18]) }),
  bankLog:F({ z:-2.6, off:1.35, yaw:0.35, half:1.8, r:F([0.2, 0.14]) }),
  stumps:F({ x:8, z:F([-15, 2.5]), r:F([0.26, 0.5]), h:F([0.28, 0.75]) }),
  snags:F({ x:11, z:F([-20, -5]), s:F([0.28, 0.46]), H:F([5, 8]) }),
  twigs:F({ x:10, z:F([-16, 3]), s:F([0.6, 1.3]), variants:4 }),
  ivy:F({ H:F([1.6, 4.8]), step:0.3 }),
  max:F({ stumps:5, snags:3, twigs:56, moss:400, ivy:12, woodShrooms:30 }),
  shade:F({ x0:-17, z0:-28, w:34, d:34 }) });

/* the trunk's radius factor at hb metres above its foot (a: the angle round it, local; null = the mean, no buttress lobes) */
export function flareAt(hb, a=null){ const L=WOOD.flare, h=Math.max(0, hb); let k=1+L.k0*Math.exp(-h*L.d0)+L.k1*Math.exp(-h*L.d1);
  if(a!=null) k+=(L.lob[0]*Math.sin(a*L.lob[1]+L.lob[2])+L.lob[3]*Math.sin(a*L.lob[4]+L.lob[5]))*Math.exp(-h*L.dl); return k; }
export const trunkRadius=(r, hb, a=null)=>r*(1-(1-WOOD.trunk.top)*clamp(hb, 0, WOOD.trunk.len)/WOOD.trunk.len)*flareAt(hb, a);
/* the widest the foot reaches at hb (the lobes at their peak): what climbs or grows beside it keeps outside */
export const trunkOuter=(r, hb)=>trunkRadius(r, hb)+r*(WOOD.flare.lob[0]+WOOD.flare.lob[3])*Math.exp(-Math.max(0, hb)*WOOD.flare.dl);

const eyeD=(x, z)=>Math.hypot(x-WOOD.eye[0], z-WOOD.eye[1]);
function segDist(px, pz, ax, az, bx, bz){ const vx=bx-ax, vz=bz-az, t=clamp(((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz||1), 0, 1); return Math.hypot(px-ax-vx*t, pz-az-vz*t); }
/* the near trees' indices, nearest the eye first */
export function nearTrees(trunks){ const N=WOOD.near;
  return trunks.map((t,i)=>i).filter(i=>{ const [x,z,r]=trunks[i], e=eyeD(x,z); return e>N.eyeMin+r && e<N.eyeMax && z>N.zMin; }).sort((a,b)=>eyeD(trunks[a][0],trunks[a][1])-eyeD(trunks[b][0],trunks[b][1])); }
function shuffle(a, R){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* the roots of the near trees: per tree `per` or one fewer, each a centre line of WOOD.roots.rings points [x, y, z, radius] from inside the
   flare out along the ground, sinking at its end; a root that would reach the water stops before it */
function rootsOf(trunks, per, R){ const W=WOOD.roots, out=[];
  for(const i of nearTrees(trunks)){ const [tx,tz,r]=trunks[i], n=Math.max(0, per-Math.floor(R()*2)), a0=R()*TAU;
    for(let k=0;k<n;k++){ const a=a0+k*TAU/n+(R()-0.5)*0.7, L=(W.len[0]+R()*(W.len[1]-W.len[0]))*(0.7+r), wig=(R()-0.5)*0.5, r0=r*0.6, rad0=W.r+r*W.rk, ca=Math.cos(a), sa=Math.sin(a), pts=[];
      for(let j=0;j<W.rings;j++){ const t=j/(W.rings-1), dd=r0+L*t, w=wig*Math.sin(Math.PI*t)*L*0.3, x=tx+ca*dd-sa*w, z=tz+sa*dd+ca*w;
        if(j>1 && streamNear(x,z).d<STREAM.half+0.15) break;
        pts.push([x, bankGround(x,z)+W.rise*Math.pow(1-t,2.2)+0.04*(1-t)-0.06*t, z, rad0*(1-0.78*t)]); }
      if(pts.length>=3){ if(pts.length<W.rings) pts[pts.length-1][1]-=0.05; out.push({ tree:i, pts }); } } }
  return out; }
/* u along the stream nearest the depth z */
function streamU(z){ let best=0, bd=Infinity; STREAM_LINE.forEach((p,i)=>{ const d=Math.abs(p.z-z); if(d<bd){ bd=d; best=i; } }); return best/(STREAM_LINE.length-1); }
const rot2=(x, z, a)=>[x*Math.cos(a)-z*Math.sin(a), x*Math.sin(a)+z*Math.cos(a)];
/* the two logs: { a:[x,y,z], b:[x,y,z], r0, r1, bridge } — the bridge spans the stream resting on both banks; the bank log lies beside the
   water on the first side where it touches no trunk, rock or water */
function logsOf(trunks){ const B=WOOD.bridge, K=WOOD.bankLog, out=[];
  { const p=streamAt(streamU(B.z)), [nx,nz]=rot2(-p.tz, p.tx, B.yaw), e=(s,r)=>{ const x=p.x+nx*B.half*s, z=p.z+nz*B.half*s; return [x, forestGround(x,z)+r+0.05, z]; };   // resting on the bank tops (on a root or a stone)
    out.push({ a:e(1, B.r[0]), b:e(-1, B.r[1]), r0:B.r[0], r1:B.r[1], bridge:true }); }
  { let pick=null;   // the first clear place: along the bank from K.z (±0.5 m steps, farther first), the left side first
    for(const sh of [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2]) for(const side of [-1, 1]){ if(pick && pick[4]) break; const p=streamAt(streamU(K.z+sh)), cx=p.x-p.tz*side*(STREAM.half+K.off), cz=p.z+p.tx*side*(STREAM.half+K.off), [dx,dz]=rot2(p.tx, p.tz, K.yaw*side), ax=cx+dx*K.half, az=cz+dz*K.half, bx=cx-dx*K.half, bz=cz-dz*K.half;
      let ok=eyeD(cx,cz)>3.5; for(let t=0;t<=1 && ok;t+=0.1) if(streamNear(lerp(ax,bx,t), lerp(az,bz,t)).d<STREAM.half+K.r[0]+0.15) ok=false;
      if(ok) for(const [x,z,r] of trunks) if(segDist(x,z,ax,az,bx,bz)<trunkOuter(r,0.2)+K.r[0]+0.1){ ok=false; break; }
      if(ok) for(const [x,z,sz] of ROCKS_TODAY) if(segDist(x,z,ax,az,bx,bz)<sz*1.3+K.r[0]){ ok=false; break; }
      if(ok) pick=[ax,az,bx,bz,true]; else if(!pick) pick=[ax,az,bx,bz,false]; }
    const [ax,az,bx,bz]=pick; out.push({ a:[ax, bankGround(ax,az)+K.r[0]*0.62, az], b:[bx, bankGround(bx,bz)+K.r[1]*0.62, bz], r0:K.r[0], r1:K.r[1], bridge:false }); }
  return out; }
/* a free place for something of radius rad: out of the water by `water`, away from the eye, the trunks, today's rocks, the logs and the
   other things already placed ([x, z, r] each) */
function free(x, z, rad, o){ if(streamNear(x,z).d<STREAM.half+o.water+rad) return false; if(eyeD(x,z)<o.eye+rad) return false; if(o.aisle && Math.abs(x)<o.aisle && z>-8) return false;
  for(const [tx,tz,r] of o.trunks) if(Math.hypot(x-tx,z-tz)<trunkOuter(r,0.2)+rad+o.gap) return false;
  for(const [rx,rz,sz] of ROCKS_TODAY) if(Math.hypot(x-rx,z-rz)<sz*1.3+rad+0.1) return false;
  for(const L of o.logs) if(segDist(x,z,L.a[0],L.a[2],L.b[0],L.b[2])<L.r0+rad+o.gap) return false;
  for(const [px,pz,pr] of o.items) if(Math.hypot(x-px,z-pz)<pr+rad+o.gap) return false; return true; }
/* a fallen branch's shape k (local, lying along +x): segments [x0,y0,z0, x1,y1,z1, r0, r1] */
export function twigShape(k){ const R=seeded(0x54574730+k), L=1+R()*0.9, out=[], main=[];
  let px=0, pz=0; for(let i=1;i<=5;i++){ const x=L*i/5, z=pz+(R()-0.5)*0.08; out.push([px, 0.02, pz, x, 0.02+(i===5 ? 0.04 : 0), z, 0.035*(1-0.6*(i-1)/5), 0.035*(1-0.6*i/5)]); main.push([x,z]); px=x; pz=z; }
  for(let s=0;s<1+(k%2);s++){ const [bx,bz]=main[1+Math.floor(R()*3)], a=(R()<0.5 ? -1 : 1)*(0.45+R()*0.5), l=L*(0.25+R()*0.3), [dx,dz]=rot2(1, 0, a);
    out.push([bx, 0.02, bz, bx+dx*l, 0.05+R()*0.08, bz+dz*l, 0.016, 0.006]); }
  return out; }

/* counts: { roots (per near tree), logs (0 | 2), stumps, snags, twigs, moss, ivy (trees), woodShrooms } → every place (see the head) */
export function woodPlaces(counts, trunks, seed=WOOD.seed){
  const R=seeded(seed), M=WOOD.max, c=k=>clamp(Math.floor(counts[k]||0), 0, M[k]);
  const roots= counts.roots>0 ? rootsOf(trunks, Math.floor(counts.roots), seeded(seed+1)) : [];
  const logs= counts.logs>0 ? logsOf(trunks) : [], items=[];
  /* stumps and snags (drawn at their maximum, the level takes the beginning) */
  const stumpsAll=[]; { const S=WOOD.stumps; for(let g=0; stumpsAll.length<M.stumps && g<4000; g++){ const x=(R()*2-1)*S.x, z=S.z[0]+R()*(S.z[1]-S.z[0]), r=S.r[0]+R()*(S.r[1]-S.r[0]), h=S.h[0]+R()*(S.h[1]-S.h[0]), tilt=(R()-0.5)*0.3, rot=R()*TAU;
    if(!free(x, z, r, { water:0.9, eye:3.6, aisle:1.2, gap:0.5, trunks, logs, items })) continue; items.push([x,z,r*1.6]); stumpsAll.push({ x, z, y:bankGround(x,z), r, h, tilt, rot }); } }
  const snagsAll=[]; { const S=WOOD.snags; for(let g=0; snagsAll.length<M.snags && g<4000; g++){ const x=(R()*2-1)*S.x, z=S.z[0]+R()*(S.z[1]-S.z[0]), s=S.s[0]+R()*(S.s[1]-S.s[0]), H=S.H[0]+R()*(S.H[1]-S.H[0]), rot=R()*TAU, lean=(R()-0.5)*0.08;
    if(!free(x, z, trunkOuter(s,0.2), { water:2, eye:7, aisle:1.5, gap:1, trunks, logs, items })) continue; items.push([x,z,trunkOuter(s,0.2)+0.5]); snagsAll.push({ x, z, y:forestGround(x,z), s, H, rot, lean, seed:Math.floor(R()*1e9) }); } }
  const stumps=stumpsAll.slice(0, c('stumps')), snags=snagsAll.slice(0, c('snags'));
  /* fallen branches */
  const twigsAll=[]; { const W=WOOD.twigs, Rt=seeded(seed+2); for(let g=0; twigsAll.length<M.twigs && g<6000; g++){ const x=(Rt()*2-1)*W.x, z=W.z[0]+Rt()*(W.z[1]-W.z[0]), s=W.s[0]+Rt()*(W.s[1]-W.s[0]), rot=Rt()*TAU, k=twigsAll.length%W.variants;
    if(!free(x, z, 0.3*s, { water:0.35, eye:3.2, gap:0.1, trunks, logs, items:stumpsAll.concat(snagsAll).map(p=>[p.x, p.z, p.r||trunkOuter(p.s,0.2)]) })) continue; twigsAll.push({ x, z, y:bankGround(x,z), s, rot, k }); } }
  /* moss cushions: at the near trees' feet, on roots, on today's rocks, along the bank — shuffled, the level takes the beginning */
  const mossAll=[]; { const Rm=seeded(seed+3), put=(x,y,z,s,h)=>{ if(eyeD(x,z)>=2.6 && streamNear(x,z).d>=STREAM.half+0.1) mossAll.push({ x, y, z, s, h, rot:Rm()*TAU, sq:0.7+Rm()*0.5 }); };
    for(const i of nearTrees(trunks)){ const [tx,tz,r]=trunks[i]; for(let k=0;k<5;k++){ const a=Rm()*TAU, dd=trunkOuter(r,0.2)*(0.92+Rm()*0.3), s=0.16+Rm()*0.16, h=0.07+Rm()*0.07, x=tx+Math.cos(a)*dd, z=tz+Math.sin(a)*dd; put(x, bankGround(x,z)-h*0.3, z, s, h); } }
    for(const rt of roots) if(Rm()<0.5){ const p=rt.pts[2+Math.floor(Rm()*Math.min(3, rt.pts.length-2))]||rt.pts[rt.pts.length-1]; const s=0.08+Rm()*0.08, h=0.04+Rm()*0.03; put(p[0], p[1]+p[3]*0.4, p[2], s, h); }
    for(const [x,z,sz] of ROCKS_TODAY) for(let k=0;k<2;k++){ const ox=(Rm()-0.5)*sz*0.6, oz=(Rm()-0.5)*sz*0.5, h=sz*(0.12+Rm()*0.08); put(x+ox, forestGround(x,z)+sz*0.12+sz*0.6*0.95-h*0.4, z+oz, sz*(0.4+Rm()*0.3), h); }
    for(let g=0; mossAll.length<M.moss && g<8000; g++){ const u=0.3+Rm()*0.67, side=Rm()<0.5 ? -1 : 1, o=STREAM.half+0.6+Rm()*0.9, p=streamAt(u), x=p.x-p.tz*side*o, z=p.z+p.tx*side*o, s=0.12+Rm()*0.16, h=0.05+Rm()*0.06;
      if(trunks.some(([tx,tz,r])=>Math.hypot(x-tx,z-tz)<trunkOuter(r,0.2)*0.9)) continue; put(x, bankGround(x,z)-h*0.3, z, s, h); }
    shuffle(mossAll, Rm); mossAll.length=Math.min(mossAll.length, M.moss); }
  /* ivy: cards climbing the nearest trunks (thin ones skipped); a level takes the first trees */
  const ivy=[]; { const Ri=seeded(seed+4), W=WOOD.ivy, trees=nearTrees(trunks).filter(i=>trunks[i][2]>=0.2).slice(0, c('ivy'));
    for(const i of trees){ const [tx,tz,r]=trunks[i], gy=forestGround(tx,tz), strands=1+Math.floor(Ri()*2);
      for(let st=0;st<strands;st++){ const H=W.H[0]+Ri()*(W.H[1]-W.H[0]), k=(0.5+Ri()*0.9)*(Ri()<0.5 ? -1 : 1); let a=Ri()*TAU;
        for(let h=0.15;h<H;h+=W.step*(0.8+Ri()*0.4)){ a+=k*0.12+(Ri()-0.5)*0.3; const rr=trunkOuter(r, h-WOOD.trunk.foot)+0.03;
          ivy.push({ tree:i, x:tx+Math.cos(a)*rr, y:gy+h, z:tz+Math.sin(a)*rr, a, roll:(Ri()-0.5)*0.8, s:(0.8+Ri()*0.4)*(1-0.35*h/H) }); } } } }
  /* mushrooms on the wood (the logs' tops and sides, the stumps' feet and rims) — shuffled, the level takes the beginning */
  const shroomsAll=[]; { const Rs=seeded(seed+5);
    for(const L of logs){ const dx=L.b[0]-L.a[0], dz=L.b[2]-L.a[2], l=Math.hypot(dx,dz)||1, sx=-dz/l, sz=dx/l;
      for(let k=0;k<8;k++){ const u=0.12+Rs()*0.76, th=(Rs()-0.5)*2.2, r=lerp(L.r0, L.r1, u)*0.92, x=lerp(L.a[0],L.b[0],u)+sx*Math.sin(th)*r, z=lerp(L.a[2],L.b[2],u)+sz*Math.sin(th)*r;
        shroomsAll.push({ x, y:lerp(L.a[1],L.b[1],u)+Math.cos(th)*r, z, s:0.045+Rs()*0.04, on:'log' }); } }
    for(const S of stumpsAll){ for(let k=0;k<2;k++){ const a=Rs()*TAU, dd=S.r*(1.15+Rs()*0.3), x=S.x+Math.cos(a)*dd, z=S.z+Math.sin(a)*dd; shroomsAll.push({ x, y:bankGround(x,z), z, s:0.04+Rs()*0.04, on:'stump' }); }
      const a=Rs()*TAU; shroomsAll.push({ x:S.x+Math.cos(a)*S.r*0.72, y:S.y+S.h-0.02, z:S.z+Math.sin(a)*S.r*0.72, s:0.035+Rs()*0.03, on:'stump' }); }
    shuffle(shroomsAll, Rs); shroomsAll.length=Math.min(shroomsAll.length, M.woodShrooms);
    shroomsAll.forEach(p=>{ p.ph=Rs()*TAU; p.rot=Rs()*TAU; }); }
  /* bracket fungi: shelves on the stumps' and snags' sides { x, y, z, a (facing out), s } */
  const brackets=[]; { const Rb=seeded(seed+6);
    for(const S of stumps) for(let k=0, n=3+Math.floor(Rb()*3);k<n;k++){ const a=Rb()*TAU, hy=S.h*(0.25+Rb()*0.5), rr=lerp(S.r*1.12, S.r, (hy+0.1)/(S.h+0.1))*1.02; brackets.push({ x:S.x+Math.cos(a)*rr, y:S.y+hy, z:S.z+Math.sin(a)*rr, a, s:0.08+Rb()*0.08 }); }
    for(const S of snags) for(let k=0, n=2+Math.floor(Rb()*3);k<n;k++){ const a=Rb()*TAU, hy=0.6+Rb()*2.4, rr=trunkRadius(S.s, hy-WOOD.trunk.foot)*1.02; brackets.push({ x:S.x+Math.cos(a)*rr, y:S.y+hy, z:S.z+Math.sin(a)*rr, a, s:0.09+Rb()*0.09 }); } }
  return { roots, logs, stumps, snags, twigs:twigsAll.slice(0, c('twigs')), moss:mossAll.slice(0, c('moss')), ivy, shrooms:shroomsAll.slice(0, c('woodShrooms')), brackets };
}

/* the contact shadows: what stands at every level → blobs [x, z, rx, rz, rot, a] (darkness a at the centre) */
export function shadeBlobs(trunks, P, rocks=[]){ const out=[];
  for(const [x,z,r] of trunks){ out.push([x, z, r*2.6, r*2.6, 0, 0.42], [x, z, r*1.55, r*1.55, 0, 0.38]); }
  for(const rt of P.roots) for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j], n=Math.max(1, Math.ceil(Math.hypot(B[0]-A[0], B[2]-A[2])/0.1));   // along each root, every 10 cm
    for(let k=0;k<n;k++){ const t=k/n, rad=lerp(A[3], B[3], t)*2.5+0.07; out.push([lerp(A[0],B[0],t), lerp(A[2],B[2],t), rad, rad, 0, 0.12]); } }
  for(const [x,z,sz] of ROCKS_TODAY) out.push([x, z, sz*1.75, sz*1.25, 0, 0.45]);
  for(const k of rocks) if(!k.wet) out.push([k.x, k.z, k.s*2, k.s*1.6, k.rot, 0.35]);
  for(const L of P.logs){ const l=Math.hypot(L.b[0]-L.a[0], L.b[2]-L.a[2]); for(let t=0;t<=1.0001;t+=0.25/l){ const r=lerp(L.r0, L.r1, t); out.push([lerp(L.a[0],L.b[0],t), lerp(L.a[2],L.b[2],t), r*2.6, r*2.6, 0, 0.3]); } }
  for(const S of P.stumps) out.push([S.x, S.z, S.r*2.3, S.r*2.3, 0, 0.5]);
  for(const S of P.snags) out.push([S.x, S.z, S.s*2.8, S.s*2.8, 0, 0.5]);
  return out; }
/* a blob's darkness at q (the distance over its radius): 1 at the centre, 0 from q 1 on, smooth */
export const blobDark=q=>q>=1 ? 0 : (1-q*q)*(1-q*q);
