/* RELEASE-1 (B): THE VEHICLES IN 3D — low-poly bodies as plain arrays (rule #36: pure, no Web Audio, no DOM, no WebGL): a car of each type (pure/vehicles.js
   VEH.types: sedan, hatchback, estate, small car, taxi, small van, bus) and a two-section tram. The room (rain.js) draws them with the camera's own law
   (rain-glass.js VEH_V: every corner through project()'s arithmetic), so the perspective, the foreshortening, the angle to the road and the vanishing
   point are right by construction (RAIN-6b … RAIN-10 drew screen-facing sprites: on a road that runs slanted across the screen they looked sideways).
   Local frame: x across (0 the middle), y up (0 the road), s along the vehicle from its rear (0) to its front (len). Every face is flat (its own normal).
   part (the shader's material): 0 paint, 1 the cabin (glass, pillars and the roof told apart by the shader), 2 tyre, 5 dark trim / bogie, 6 the taxi's
   roof sign, 9 the soft shadow under the body, 10 the tram's body, 11 its bellows, 12 the pantograph, 13 roof equipment. */
import { VEH } from './vehicles.js';
const F=Object.freeze;
/* each car type's side profile (fractions of its length; heights in m from VEH.types h): ws the windscreen's base, rf / rr the roof's front and rear, rb the
   rear window's base, belt the beltline (fraction of h), wheel radius r, axles from the ends (m) */
export const VEH3=F({ shape:F([
  F({ ws:0.66, rf:0.52, rr:0.3, rb:0.19, belt:0.62, r:0.31, ax:F([0.85, 0.8]) }),   // sedan
  F({ ws:0.72, rf:0.58, rr:0.11, rb:0.02, belt:0.6, r:0.31, ax:F([0.7, 0.75]) }),    // hatchback
  F({ ws:0.71, rf:0.57, rr:0.05, rb:0.01, belt:0.6, r:0.31, ax:F([0.85, 0.8]) }),    // estate
  F({ ws:0.74, rf:0.62, rr:0.1, rb:0.02, belt:0.58, r:0.29, ax:F([0.6, 0.65]) }),    // small car
  F({ ws:0.66, rf:0.52, rr:0.3, rb:0.19, belt:0.62, r:0.31, ax:F([0.85, 0.8]), sign:true }),   // taxi: the sedan + its lit roof sign
  F({ ws:0.86, rf:0.79, rr:0.015, rb:0.0, belt:0.5, r:0.34, ax:F([0.95, 0.7]) }),    // small van
  F({ ws:0.985, rf:0.975, rr:0.012, rb:0.0, belt:0.36, r:0.5, ax:F([2.6, 2.4]), bus:true }) ]),   // bus
  tram:F({ len:28, w:2.4, h:3.36, sec:F([0, 13.6]), gap:0.8, bottom:0.36, belt:1.0, win:F([1.18, 2.55]), panto:18.5, wire:6.2 }) });
/* a mesh being built: positions, normals, parts (flat triangles) */
function mk(){ const P=[], N=[], Q=[]; return { P, N, Q, tri(a, b, c, part, out){   /* out: a point inside the solid — the normal points away from it */
  const u=[b[0]-a[0], b[1]-a[1], b[2]-a[2]], v=[c[0]-a[0], c[1]-a[1], c[2]-a[2]]; let n=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; const l=Math.hypot(...n); if(l<1e-9) return;
  n=n.map(x=>x/l); const m=[(a[0]+b[0]+c[0])/3-out[0], (a[1]+b[1]+c[1])/3-out[1], (a[2]+b[2]+c[2])/3-out[2]]; if(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]<0){ n=n.map(x=>-x); [b, c]=[c, b]; }
  for(const p of [a, b, c]){ P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); Q.push(part); } }, quad(a, b, c, d, part, out){ this.tri(a, b, c, part, out); this.tri(a, c, d, part, out); } }; }
/* a prism along x from a side profile [[s, y], …] (convex): half width wb at y0, wt at y1 (a cabin's tumblehome) */
function prism(M, prof, wb, wt, y0, y1, part){ const hw=y=>wb+(wt-wb)*Math.max(0, Math.min(1, (y-y0)/Math.max(1e-6, y1-y0))), n=prof.length, c=prof.reduce((a, p)=>[a[0]+p[0]/n, a[1]+p[1]/n], [0, 0]), out=[0, c[1], c[0]];
  const R=prof.map(([s, y])=>[hw(y), y, s]), L=prof.map(([s, y])=>[-hw(y), y, s]);
  for(let i=1;i<n-1;i++){ M.tri(R[0], R[i], R[i+1], part, out); M.tri(L[0], L[i+1], L[i], part, out); }
  for(let i=0;i<n;i++){ const j=(i+1)%n; M.quad(R[i], R[j], L[j], L[i], part, out); } }
/* a box (x0…x1, y0…y1, s0…s1) */
function box(M, x0, x1, y0, y1, s0, s1, part){ const o=[(x0+x1)/2, (y0+y1)/2, (s0+s1)/2], p=(x, y, s)=>[x, y, s];
  M.quad(p(x0, y0, s0), p(x1, y0, s0), p(x1, y1, s0), p(x0, y1, s0), part, o); M.quad(p(x0, y0, s1), p(x1, y0, s1), p(x1, y1, s1), p(x0, y1, s1), part, o);
  M.quad(p(x0, y0, s0), p(x0, y0, s1), p(x0, y1, s1), p(x0, y1, s0), part, o); M.quad(p(x1, y0, s0), p(x1, y0, s1), p(x1, y1, s1), p(x1, y1, s0), part, o);
  M.quad(p(x0, y1, s0), p(x1, y1, s0), p(x1, y1, s1), p(x0, y1, s1), part, o); M.quad(p(x0, y0, s0), p(x1, y0, s0), p(x1, y0, s1), p(x0, y0, s1), part, o); }
/* a wheel: a hexagonal drum across x at (s, r) */
function wheel(M, xc, wd, s, r){ const K=6, ring=[...Array(K).keys()].map(k=>{ const a=k/K*Math.PI*2+Math.PI/K; return [r+Math.sin(a)*r, s+Math.cos(a)*r]; }), o=[xc, r, s];
  for(let k=0;k<K;k++){ const [y0, s0]=ring[k], [y1, s1]=ring[(k+1)%K]; M.quad([xc-wd, y0, s0], [xc+wd, y0, s0], [xc+wd, y1, s1], [xc-wd, y1, s1], 2, o); if(k>0 && k<K-1){ for(const x of [xc-wd, xc+wd]) M.tri([x, ring[0][0], ring[0][1]], [x, y0, s0], [x, y1, s1], 2, o); } } }
/* the soft shadow under a body: one flat quad just over the road (the shader fades it to nothing at its rim) */
const shadow=(M, hx, s0, s1)=>M.quad([-hx, 0.015, s0], [hx, 0.015, s0], [hx, 0.015, s1], [-hx, 0.015, s1], 9, [0, -1, (s0+s1)/2]);
const done=M=>F({ pos:new Float32Array(M.P), nrm:new Float32Array(M.N), part:new Float32Array(M.Q), n:M.Q.length });
/* RELEASE-1 (C): A CAR as ONE SMOOTH SHELL (the founder: «too angular») — cross-sections along it (rounded corners, the lower body full width, the cabin
   narrower: tumblehome) through the side profile (a crowned bonnet, the raked windscreen, the roof, the rear window, the boot; rounded bumpers, the ends
   tapered in plan), smooth normals (the clear coat's highlights glide over it); ten-sided wheels with light rims; the taxi's sign, the bus's roof units */
const lerpK=(K, u)=>{ if(u<=K[0][0]) return K[0][1]; for(let i=1;i<K.length;i++) if(u<=K[i][0]){ const [a, va]=K[i-1], [b, vb]=K[i]; return b-a<1e-9 ? vb : va+(vb-va)*(u-a)/(b-a); } return K[K.length-1][1]; };
const sortK=K=>K.slice().sort((p, q)=>p[0]-q[0]).filter((p, i, A)=>i===0 || p[0]-A[i-1][0]>0.004);
/* a lofted shell: rings[i] = { s, pts:[[x, y] … half, bottom middle → top middle] } — mirrored, closed at both ends, smooth normals (each vertex the mean of its faces') */
function shell(M, rings, part){ const H=rings[0].pts.length, R=rings.map(r=>{ const half=r.pts.map(([x, y])=>[x, y, r.s]); return half.concat(half.slice(1, -1).reverse().map(([x, y, z])=>[-x, y, z])); }), K=R[0].length, nI=R.length;
  const acc=R.map(r=>r.map(()=>[0, 0, 0])), cs=rings.reduce((a, r)=>a+r.s/nI, 0), cy=rings.reduce((a, r)=>a+r.pts.reduce((b, p)=>b+p[1], 0)/H/nI, 0), out=[0, cy, cs];
  const fn=(a, b, c)=>{ const u=[b[0]-a[0], b[1]-a[1], b[2]-a[2]], v=[c[0]-a[0], c[1]-a[1], c[2]-a[2]]; return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]; };
  const faces=[]; for(let i=0;i<nI-1;i++) for(let j=0;j<K;j++){ const j2=(j+1)%K, q=[[i, j], [i+1, j], [i+1, j2], [i, j2]]; for(const tri of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]){ const P=tri.map(([a, b])=>R[a][b]); let n=fn(...P); const c=[(P[0][0]+P[1][0]+P[2][0])/3-out[0], (P[0][1]+P[1][1]+P[2][1])/3-out[1], (P[0][2]+P[1][2]+P[2][2])/3-out[2]];
      if(n[0]*c[0]+n[1]*c[1]+n[2]*c[2]<0){ n=n.map(x=>-x); tri.reverse(); } faces.push([tri, n]); for(const [a, b] of tri){ const A=acc[a][b]; A[0]+=n[0]; A[1]+=n[1]; A[2]+=n[2]; } } }
  const nn=v=>{ const l=Math.hypot(...v)||1; return v.map(x=>x/l); };
  for(const [tri] of faces) for(const [a, b] of tri){ const p=R[a][b], q=nn(acc[a][b]); M.P.push(p[0], p[1], p[2]); M.N.push(q[0], q[1], q[2]); M.Q.push(part); }
  for(const [i, sg] of [[0, -1], [nI-1, 1]]){ const ring=R[i], c=[0, ring.reduce((a, p)=>a+p[1], 0)/K, ring[0][2]];   /* the ends: a fan, its normal along the car, blended into the shell's at the rim */
    for(let j=0;j<K;j++){ const a=ring[j], b=ring[(j+1)%K], na=nn([acc[i][j][0]*0.4, acc[i][j][1]*0.4, sg]), nb=nn([acc[i][(j+1)%K][0]*0.4, acc[i][(j+1)%K][1]*0.4, sg]); const tri= sg>0 ? [[c, [0, 0, 1]], [a, na], [b, nb]] : [[c, [0, 0, -1]], [b, nb], [a, na]];
      for(const [p, q] of tri){ M.P.push(p[0], p[1], p[2]); M.N.push(q[0], q[1], q[2]); M.Q.push(part); } } } }
/* a wheel: a ten-sided drum (its tread smooth), the outer face a light rim */
function wheel10(M, xc, wd, s, r, out){ const K=10, ring=[...Array(K).keys()].map(k=>{ const a=k/K*Math.PI*2; return [Math.sin(a), Math.cos(a)]; });
  for(let k=0;k<K;k++){ const [sa, ca]=ring[k], [sb, cb]=ring[(k+1)%K], A=[r+sa*r, s+ca*r], B=[r+sb*r, s+cb*r];
    for(const [p, n] of [[[xc-wd, A[0], A[1]], [0, sa, ca]], [[xc+wd, A[0], A[1]], [0, sa, ca]], [[xc+wd, B[0], B[1]], [0, sb, cb]], [[xc-wd, A[0], A[1]], [0, sa, ca]], [[xc+wd, B[0], B[1]], [0, sb, cb]], [[xc-wd, B[0], B[1]], [0, sb, cb]]]){ M.P.push(...p); M.N.push(...n); M.Q.push(2); }
    for(const sd of [-1, 1]){ const x=xc+sd*wd, rim= sd===out ? 3 : 2; for(const p of [[x, r, s], [x, A[0], A[1]], [x, B[0], B[1]]]){ M.P.push(...p); M.N.push(sd, 0, 0); M.Q.push(rim); } } } }
export function carMesh(ty){ const T=VEH.types[ty], S=VEH3.shape[ty], L=T.len, h=T.h, w2=T.w/2, belt=S.belt*h, M=mk(), cl=S.r*0.62, box=!!(S.bus || ty===5), tall=S.rb<0.03;
  const yt=sortK([[0, tall ? h-0.1 : belt-0.05], [0.03, tall ? h-0.03 : belt-0.01], [Math.max(0.05, S.rb), tall ? h-0.02 : belt+0.03], [S.rb+(S.rr-S.rb)*0.5, belt+0.66*(h-belt)], [S.rr, h-0.03], [(S.rr+S.rf)/2, h], [S.rf, h-0.03],
    [S.rf+(S.ws-S.rf)*0.5, belt+0.52*(h-belt)], [S.ws, belt+0.04], [S.ws+(1-S.ws)*0.6, box ? belt+0.02 : belt-0.02], [0.97, box ? h*0.9 : belt-0.07], [1, box ? h*0.82 : belt-0.13]].map(([u, v])=>[Math.max(0, Math.min(1, u)), v]));
  const yb=[[0, cl+(box ? 0.1 : 0.2)], [0.04, cl+0.05], [0.1, cl], [0.9, cl], [0.96, cl+0.05], [1, cl+(box ? 0.1 : 0.18)]], hw=[[0, w2-(box ? 0.07 : 0.15)], [0.025, w2-0.04], [0.07, w2], [0.93, w2], [0.975, w2-0.05], [1, w2-(box ? 0.08 : 0.17)]];
  const sh=[[0, belt-0.08], [0.05, belt-0.02], [0.1, belt], [0.9, belt-0.03], [0.96, belt-0.08], [1, belt-0.14]];
  const U=[...new Set([...yt.map(k=>k[0]), 0, 0.025, 0.07, 0.1, 0.5, 0.9, 0.93, 0.975, 1].map(u=>Math.round(u*1000)/1000))].sort((a, b)=>a-b);
  const rings=U.map(u=>{ const t=lerpK(yt, u), b=lerpK(yb, u), w=lerpK(hw, u), sv=Math.min(lerpK(sh, u), t-0.02), gh=Math.max(0, t-sv), gw=w-0.1-0.04*Math.min(1, gh/0.3), gt=Math.max(0.1, w-0.3);
    return { s:u*L, pts:[[0, b], [w-0.14, b], [w-0.03, b+0.06], [w, b+0.17], [w, sv-0.12], [w-0.03, sv-0.03], [w-0.09, sv+0.005], [gw, sv+0.35*gh], [Math.max(0.1, gt+0.07), t-0.05], [Math.max(0.05, gt-0.1), t-0.008], [0, t]] }; });
  shell(M, rings, 0);
  for(const s of [S.ax[1], L-S.ax[0]]) for(const sd of [-1, 1]) wheel10(M, sd*(w2-0.15), 0.11, s, S.r, sd);
  if(S.sign) box6(M, -0.3, 0.3, h-0.01, h+0.15, S.rr*L+0.28*(S.rf-S.rr)*L, S.rr*L+0.52*(S.rf-S.rr)*L, 6);
  if(S.bus){ box6(M, -0.75, 0.75, h-0.01, h+0.28, L*0.55, L*0.75, 13); box6(M, -0.5, 0.5, h-0.01, h+0.18, L*0.15, L*0.3, 13); }   /* the bus's roof units */
  shadow(M, w2+0.35, -0.35, L+0.35); return done(M); }
const box6=(M, ...a)=>box(M, ...a);
/* THE TRAM: two sections (the rounded cross-section extruded along it, a cab at each end — the windscreen raked back), the bellows between them, four
   bogies, roof boxes, the pantograph up to the wire over the front section (its head at VEH3.tram.panto from the rear), the shadow */
export function tramMesh(){ const R=VEH3.tram, w2=R.w/2, M=mk(), B=R.bottom, sec=[[0, R.sec[1]], [R.sec[1]+R.gap, R.len]];
  const X=[[w2, B], [w2, 2.78], [w2-0.18, 3.14], [w2-0.62, 3.3], [0, R.h], [-(w2-0.62), 3.3], [-(w2-0.18), 3.14], [-w2, 2.78], [-w2, B]];
  const rake=(y, end)=>end*Math.max(0, (y-1.15)/(R.h-1.15))*0.42;   /* the cab's windscreen raked back from the waist up */
  for(const [a, b] of sec){ const rings=[[a, 1], [a+0.6, 0], [b-0.6, 0], [b, -1]].map(([s, e])=>X.map(([x, y])=>[x, y, s+(e>0 ? rake(y, 1) : e<0 ? -rake(y, 1) : 0)])), o=[0, 1.8, (a+b)/2];
    for(let r=0;r<rings.length-1;r++) for(let i=0;i<X.length;i++){ const j=(i+1)%X.length; M.quad(rings[r][i], rings[r][j], rings[r+1][j], rings[r+1][i], 10, o); }
    for(const g of [rings[0], rings[rings.length-1]]) for(let i=1;i<g.length-1;i++) M.tri(g[0], g[i], g[i+1], 10, o);
    for(const s of [a+2.2, b-2.2]) box(M, -1.05, 1.05, 0.08, B, s-1.0, s+1.0, 5);
    box(M, -0.5, 0.5, R.h-0.04, R.h+0.22, a+(b-a)*0.3, a+(b-a)*0.55, 13); }
  prism(M, [[R.sec[1], 0.5], [R.sec[1]+R.gap, 0.5], [R.sec[1]+R.gap, 3.1], [R.sec[1], 3.1]], w2-0.22, w2-0.22, 0.5, 3.1, 11);
  { const s=R.panto, y0=R.h+0.1, yk=4.55, y1=R.wire-0.06, t=0.035;   /* the pantograph: a base, the lower arm forward, the upper arm back to the head, the collector bar across */
    box(M, -0.45, 0.45, R.h-0.02, y0, s-0.5, s+0.5, 12);
    const arm=(p, q)=>{ const n=5; for(let k=0;k<n;k++){ const u0=k/n, u1=(k+1)/n, ya=p[0]+(q[0]-p[0])*u0, yb=p[0]+(q[0]-p[0])*u1, sa=p[1]+(q[1]-p[1])*u0, sb=p[1]+(q[1]-p[1])*u1; box(M, -0.35, 0.35, Math.min(ya, yb)-t, Math.max(ya, yb)+t, Math.min(sa, sb)-t, Math.max(sa, sb)+t, 12); } };
    arm([y0, s-0.3], [yk, s+0.9]); arm([yk, s+0.9], [y1, s]); box(M, -0.85, 0.85, y1-0.03, y1+0.03, s-0.06, s+0.06, 12); }
  shadow(M, w2+0.45, -0.5, R.len+0.5); return done(M); }
/* the lamps' places on a car (local; the room puts its head and tail lights there): front at s = len, rear at s = 0, ±x, at y (on the shell's rounded ends) */
export const carLamps=ty=>{ const T=VEH.types[ty], S=VEH3.shape[ty]; return F({ x:T.w/2-0.3, y:S.r*0.62+0.36, len:T.len }); };
/* the paints (sRGB albedo): black, silver, dark blue, burgundy, warm beige, graphite, pearl white, dark green — the evening's muted cars; the taxi its yellow */
export const VEH_PAINT=F(['141518', '8c9096', '1e2c4a', '5a1c22', '9a8a6e', '3a3d42', 'c4c2bc', '1f3a2e']);
export const TAXI_PAINT='c9a42c';
/* RELEASE-1 (C, night): a piece of a kerb's stream — a flat ribbon just over the road, `len` long, `w` wide (part 14: water) */
export function streamMesh(len=3, w=0.34){ const M=mk(); M.quad([-w/2, 0.012, 0], [w/2, 0.012, 0], [w/2, 0.012, len], [-w/2, 0.012, len], 14, [0, -1, len/2]); return done(M); }
