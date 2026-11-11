/* NIGHT-9 — THE GROUND'S ROOT BULGES AND OCCLUSION, as numbers (pure, rule #36; data row «FOREST relief (app)»). forest.js applies them to the
   ground mesh it has already raised by forestGround / bankGround (pure/fireflies.js, pure/forestlife.js):
   - groundRoots: round each trunk's foot the soil swells over its roots — r·ROOTS.k high at the trunk, falling off over ROOTS.reach·r (a
     Gaussian), in the mesh only (roots and moss placed at a foot sink a few centimetres into it), never in the stream's bed.
   - groundOcclusion: how much sky a point of the ground sees, 0…1 per vertex (1 = open): hollows darker by the mesh's own curvature (a vertex
     lower than its four neighbours' mean), and a soft darkening round each trunk's foot; the ground's shader takes it into its indirect light.
   Positions: a three.js position attribute (getX/getY/getZ/setY) or anything with those four methods. */
export const ROOTS=Object.freeze({ k:0.24, reach:2.4, water:0.6 });
export const AO=Object.freeze({ curve:3.2, curveMax:0.42, trunk:0.42, trunkReach:1.1, min:0.45 });

/* trunks [[x, z, r]…] → raises the positions in place; returns per vertex the height added (Float32Array) */
export function groundRoots(pa, trunks, streamD=null){
  const n=pa.count, add=new Float32Array(n), R=ROOTS;
  for(const [tx, tz, r] of trunks){ const reach=r*R.reach, lim=reach*3, k=r*R.k;
    for(let i=0;i<n;i++){ const dx=pa.getX(i)-tx; if(dx>lim || dx<-lim) continue; const dz=pa.getZ(i)-tz; if(dz>lim || dz<-lim) continue;
      const q=(dx*dx+dz*dz)/(reach*reach); if(q>9) continue; add[i]+=k*Math.exp(-q); } }
  for(let i=0;i<n;i++){ if(!add[i]) continue; if(streamD){ const d=streamD(pa.getX(i), pa.getZ(i)); if(d<R.water) continue; } pa.setY(i, pa.getY(i)+add[i]); }
  return add;
}
/* the occlusion per vertex of a (seg+1)² grid ground (PlaneGeometry order: rows along z, columns along x) */
export function groundOcclusion(pa, seg, trunks){
  const W=seg+1, n=pa.count, h=new Float32Array(n), ao=new Float32Array(n), A=AO;
  for(let i=0;i<n;i++) h[i]=pa.getY(i);
  const step=Math.abs(pa.getX(1)-pa.getX(0))||1;
  for(let r=0;r<W;r++) for(let c=0;c<W;c++){ const i=r*W+c, l=h[r*W+Math.max(0,c-1)], rt=h[r*W+Math.min(W-1,c+1)], u=h[Math.max(0,r-1)*W+c], d=h[Math.min(W-1,r+1)*W+c];
    const lap=((l+rt+u+d)/4-h[i])/step;   // > 0: a hollow (per metre of spacing, so the finer mesh reads the same relief alike)
    ao[i]=1-Math.min(A.curveMax, Math.max(0, lap*A.curve)); }
  for(const [tx, tz, r] of trunks){ const lim=r+A.trunkReach*3;
    for(let i=0;i<n;i++){ const dx=pa.getX(i)-tx; if(dx>lim || dx<-lim) continue; const dz=pa.getZ(i)-tz; if(dz>lim || dz<-lim) continue;
      const e=Math.max(0, Math.hypot(dx, dz)-r)/A.trunkReach; ao[i]*=1-A.trunk*Math.exp(-e*e); } }
  for(let i=0;i<n;i++) ao[i]=Math.max(A.min, ao[i]);
  return ao;
}
