/* FOREST-2c «roots» — A TRUNK AND ITS ROOTS AS ONE SURFACE (pure, rule #36). The founder: separate root tubes stuck into a trunk always show a seam.
   For the trunks whose feet a player sees, one grid replaces the trunk and its roots: the trunk's own rows (forest-wood.js trunkGeo's formula: the
   same radius, flare and lobes, the same uv — so the bark's mapping, drawn by the trunks' own instanced material with this trunk's instance matrix and
   bark numbers, is the trunk's to the vertex), down to JOIN m above its foot; below, a skirt: the smooth maximum of the flare running out and sinking
   into the soil, and round ridges that ride today's roots (their paths, their tops: never higher nor wider than today's tubes, so every mushroom stays
   seen) and sink at their tips. The uv runs on by arc length down the trunk and along each root (the bark's furrows follow the root), widened across a
   root by its distance (the bark keeps its scale). Positions are in the trunk's LOCAL frame (its instance matrix maps them to the world). */
import { WOOD, flareAt } from './wood.js';

const TAU=2*Math.PI, lerp=(a, b, t)=>a+(b-a)*t, clamp=(x, a, b)=>Math.max(a, Math.min(b, x));
export const TRUNK_BASE=Object.freeze({ join:0.75, lambda:0.1, sink:0.45, k:0.03, rows:28, skirt:26, wide:1.05, sides:Object.freeze({ full:224, reduced:128 }), near:10.6, view:1.35, eye:Object.freeze([0, 5.5]) });

/* the trunks to rebuild: rooted, near the eye and in its view (the visibility map: their roots are what a player sees) */
export function seenTrunks(spots, rooted){ const B=TRUNK_BASE, E=B.eye, out=[];
  spots.forEach(([x, z, r], i)=>{ if(!rooted.has(i)) return; const d=Math.hypot(x-E[0], z-E[1]); if(d<B.near && z<E[1]-0.5 && (Math.abs(x-E[0])-r*2)/(E[1]-z)<B.view) out.push(i); }); return out; }

/* 4×4 column-major helpers */
const mul=(M, x, y, z)=>[M[0]*x+M[4]*y+M[8]*z+M[12], M[1]*x+M[5]*y+M[9]*z+M[13], M[2]*x+M[6]*y+M[10]*z+M[14]];
export function inv4(m){ const [a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33]=m;
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10, b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12, b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30, b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  const det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06, k=1/det;
  return [(a11*b11-a12*b10+a13*b09)*k, (a02*b10-a01*b11-a03*b09)*k, (a31*b05-a32*b04+a33*b03)*k, (a22*b04-a21*b05-a23*b03)*k, (a12*b08-a10*b11-a13*b07)*k, (a00*b11-a02*b08+a03*b07)*k, (a32*b02-a30*b05-a33*b01)*k, (a20*b05-a22*b02+a23*b01)*k,
    (a10*b10-a11*b08+a13*b06)*k, (a01*b08-a00*b10-a03*b06)*k, (a30*b04-a31*b02+a33*b00)*k, (a21*b02-a20*b04-a23*b00)*k, (a11*b07-a10*b09-a12*b06)*k, (a00*b09-a01*b07+a02*b06)*k, (a31*b01-a30*b03-a32*b00)*k, (a20*b03-a21*b01+a22*b00)*k]; }
const smax=(a, b, k)=>{ const m=Math.max(a, b); return m+k*Math.log(1+Math.exp(-Math.abs(a-b)/k)); };
const angd=(a, b)=>((a-b)%TAU+TAU*1.5)%TAU-TAU/2;

/* the trunk's local vertex at height hb round angle th (trunkGeo: x = R sin th, z = R cos th, the lobes' angle atan2(z, x)) */
export function trunkLocal(hb, th){ const L=WOOD.trunk.len, s=Math.sin(th), c=Math.cos(th), R=lerp(1, WOOD.trunk.top, hb/L)*flareAt(hb, Math.atan2(c, s)); return [s*R, hb-L/2, c*R]; }

/* M: the trunk's instance matrix (16, column-major), roots: its roots' pts [[x, y, z, r]…] (world), ground(x, z), level → { pos, uv, index, join (the first
   skirt row's index), rows, cols } — pos local (Float32Array), uv as the trunk's (u round 0…1, v = metres along / 16) */
export function trunkBase(M, roots, ground, level='full'){ const B=TRUNK_BASE, L=WOOD.trunk.len, N=B.sides[level]||B.sides.full, RT=B.rows, NS=B.skirt, Mi=inv4(M);
  const pos=[], uv=[], cols=N+1;
  /* the trunk: rows from the top down to the join, packed towards the foot as trunkGeo's */
  for(let j=0;j<=RT;j++){ const hb=B.join+(L-B.join)*Math.pow((RT-j)/RT, 2.2); for(let k=0;k<=N;k++){ const th=k/N*TAU; pos.push(...trunkLocal(hb, th)); uv.push(k/N, hb/L); } }
  /* the roots about the axis: per root its samples (distance, angle, centre height, radius) */
  const C=mul(M, 0, B.join-L/2, 0), cx=C[0], cz=C[2];
  const R=roots.map(pts=>pts.map(p=>({ d:Math.hypot(p[0]-cx, p[2]-cz), a:Math.atan2(p[2]-cz, p[0]-cx), y:p[1], r:p[3] })));
  const at=(S, d)=>{ if(d<=S[0].d) return S[0]; for(let i=1;i<S.length;i++) if(S[i].d>=d){ const A=S[i-1], Bq=S[i], t=(d-A.d)/Math.max(1e-6, Bq.d-A.d); return { d, a:A.a+angd(Bq.a, A.a)*t, y:lerp(A.y, Bq.y, t), r:lerp(A.r, Bq.r, t) }; } return null; };
  const reach=Math.max(0.6, ...R.map(S=>S[S.length-1].d))+0.12;
  /* the skirt, column by column from the join vertex outwards */
  const base=RT*cols, P0=[], v0=B.join/L;
  for(let k=0;k<=N;k++){ const J=mul(M, ...pos.slice((base+k)*3, (base+k)*3+3)); P0.push(J); }
  const phi=P0.map(J=>Math.atan2(J[2]-cz, J[0]-cx)), sgn=Math.sign(angd(phi[1], phi[0]))||1;
  const last=P0.map(J=>J.slice()), vAcc=new Array(cols).fill(v0);
  for(let i=1;i<=NS;i++){ const f=Math.pow(i/NS, 1.6);
    for(let k=0;k<=N;k++){ const J=P0[k], d0=Math.hypot(J[0]-cx, J[2]-cz), d=d0+(reach-d0)*f, a=phi[k], dx=Math.cos(a), dz=Math.sin(a), x=cx+dx*d, z=cz+dz*d, g=ground(x, z), gJ=ground(J[0], J[2]);
      let y=g+(J[1]-gJ)*Math.exp(-(d-d0)/B.lambda)-B.sink*(d-d0), wbest=0, ubest=0;
      for(const S of R){ const p=at(S, d); if(!p) continue; const w=p.r*B.wide/Math.max(0.05, d), de=angd(a, p.a);
        if(Math.abs(de)<w) y=smax(y, p.y+p.r*Math.sqrt(1-(de/w)*(de/w)), B.k);
        const wt=Math.pow(clamp(1-Math.abs(de)/(1.6*w), 0, 1), 2); if(wt>wbest){ wbest=wt; ubest=de; } }
      const W=[x, y, z], l=mul(Mi, ...W); pos.push(...l);
      vAcc[k]-=Math.hypot(W[0]-last[k][0], W[1]-last[k][1], W[2]-last[k][2])/L; last[k]=W;
      const u=k/N, uc=u-sgn*ubest/TAU, s=clamp((d-d0)/0.3, 0, 1)*wbest; uv.push(lerp(u, uc+(u-uc)*Math.max(1, d/Math.max(0.05, d0)), s), vAcc[k]); } }
  /* the faces: CylinderGeometry's order (row y top to bottom: a=(y,x), b=(y+1,x), c=(y+1,x+1), d=(y,x+1); a b d, b c d) */
  const rows=RT+1+NS, index=[]; for(let y=0;y<rows-1;y++) for(let x=0;x<N;x++){ const a=y*cols+x, b=a+cols, c=b+1, d=a+1; index.push(a, b, d, b, c, d); }
  return { pos:new Float32Array(pos), uv:new Float32Array(uv), index, join:base, rows, cols }; }
