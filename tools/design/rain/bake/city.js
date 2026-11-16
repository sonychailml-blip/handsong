/* RAIN-1: THE WHOLE CITY's MODEL for the offline bake (dev tool; never shipped, never loaded by the app). Built by code in the VIEW LAW's own world
   (apps/night/rooms/rain/pure/city.js: x across the boulevard, y up, z along it, metres), so the bake's pixels, its depth map and its window map
   agree with the law the room reads. Tbilisi-inspired, our own design: no real building copied, no readable text, no brand.
   - THE HOUSES: every block of both rows (BLOCKS) a house of its own from one seeded kit — bay width, floor height, plaster colour, window shape
     (arched, straight with a pediment, segmental), wrought-iron or enclosed wooden balconies, cornice, a mansard with dormers or a flat roof with a
     parapet, chimneys, antennas, water tanks, a small tree on a roof terrace. Each facade is painted on its own canvas: the plaster (a CC0 texture
     tinted), peeling paint and patched plaster, damp stains under the cornices and sills, rust streaks under the balconies, soot near the top, and on
     the ground floor graffiti as abstract shapes and colour (never letters). People's things: curtains (each window its own), shutters half open,
     window boxes, pots, a climbing vine, laundry on a line, a bicycle, chairs and a lantern on balconies.
   - THE BOULEVARD (STREET): the left pavement, a narrower road (two car lanes, two tram tracks, wires), then the promenade behind a double row of plane
     trees — benches, lamps, a kiosk, café terraces with awnings, string lights and tables in front of the house opposite, small figures by the mood
     (Evening: busy, umbrellas; Late night: almost empty; After the rain: few people, umbrellas closed, puddles).
   - FAR: the roofs beyond and the hills with the old town are a backdrop (the law's own silhouettes, hillsAt), drawn on a canvas far away.
   Everything static is merged per material (few draws, a fast bake). → { group, windows, lamps, backdrop } */
import { STREET, BLOCKS, CAM, FAR, hillsAt, vanishing, rayOf, depthOf, bendX } from '../../../../apps/night/rooms/rain/pure/city.js';

const TAU=Math.PI*2;
export const KIT=Object.freeze({ seed:0x43495459, plaster:Object.freeze(['#c99f72', '#d2a48c', '#cbbf9a', '#9fae9a', '#a9b4c2', '#b88a6a', '#d8c7a8', '#c4a39a']),
  shutter:Object.freeze(['#3f5a46', '#5a4030', '#4a5664', '#6a5a3a']), trim:Object.freeze(['#d8c8a8', '#cdb08a', '#e2d6c0', '#bfae96', '#c9b9a0']),   // RAIN-2: each house its own trim stone
  sign:Object.freeze(['#1e3a2e', '#5a1e1e', '#1e2a4a', '#3a3026', '#4a3a1a', '#2a2a30']), cloth:Object.freeze(['#e8e2d4', '#c45a4a', '#5a7ab0', '#e0c060', '#7aa070', '#d890a8', '#f0f0f0']),
  umbrella:Object.freeze(['#20283a', '#7a2a2a', '#2a4a3a', '#c8a040', '#3a3a3a', '#5a3a6a', '#b04a30', '#1e4a6a']), awning:Object.freeze([['#7a2a2a', '#e8dcc0'], ['#2a4a3a', '#e8dcc0'], ['#1e3a5a', '#e0d4b8']]) });
const rngOf=seed=>{ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; };

/* ---------- merging: every static piece goes into one geometry per material (world coordinates) ---------- */
function merger(T){
  const by=new Map(), o=new T.Object3D();
  const add=(geo, mat, M)=>{ let a=by.get(mat); if(!a){ a=[]; by.set(mat, a); } const g=geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(M); { const p=g.attributes.position; for(let i=0;i<p.count;i++) p.setX(i, p.getX(i)+bendX(p.getZ(i))); } a.push(g); geo.dispose(); };
  /* a geometry placed by a parent matrix P and its own position / rotation (Euler y, x, z) / scale */
  const put=(geo, mat, P, x=0, y=0, z=0, ry=0, rx=0, rz=0, sx=1, sy=1, sz=1)=>{ o.position.set(x, y, z); o.rotation.set(rx, ry, rz, 'YXZ'); o.scale.set(sx, sy, sz); o.updateMatrix(); add(geo, mat, P ? P.clone().multiply(o.matrix) : o.matrix.clone()); };
  const build=(group, shadow=true)=>{ for(const [mat, list] of by){ let n=0; for(const g of list) n+=g.attributes.position.count;
      const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2); let k=0;
      for(const g of list){ const c=g.attributes.position.count; pos.set(g.attributes.position.array, k*3); if(g.attributes.normal) nor.set(g.attributes.normal.array, k*3);
        if(g.attributes.uv) uv.set(g.attributes.uv.array, k*2); k+=c; g.dispose(); }
      const G=new T.BufferGeometry(); G.setAttribute('position', new T.BufferAttribute(pos, 3)); G.setAttribute('normal', new T.BufferAttribute(nor, 3)); G.setAttribute('uv', new T.BufferAttribute(uv, 2)); G.setAttribute('uv2', new T.BufferAttribute(uv, 2));
      const m=new T.Mesh(G, mat); m.castShadow=shadow && !mat.userData.noShadow; m.receiveShadow=true; group.add(m); }
    by.clear(); };
  return { put, add, build };
}

/* ---------- a facade's canvas: plaster, weathering, graffiti (u along the facade 0…W, v up 0…H, px per metre PPM) ---------- */
const PPM=36;
function facadeCanvas(T, plasterImg, H, W, L, R){
  const c=document.createElement('canvas'); c.width=Math.min(4096, Math.ceil(W*PPM)); c.height=Math.min(2048, Math.ceil(H*PPM)); const x=c.getContext('2d'), sx=c.width/W, sy=c.height/H;
  const Y=v=>c.height-v*sy, X=u=>u*sx;
  /* the plaster: the CC0 texture tiled at its own scale (about 2.5 m a tile), tinted by the house's colour */
  if(plasterImg && plasterImg.complete && plasterImg.width){ const p=x.createPattern(plasterImg, 'repeat'), s=(L.base==="brick" ? 1.6 : 2.5)*PPM/plasterImg.width;   /* RAIN-2: brick at its real scale */ x.save(); x.scale(s*sx/PPM, s*sy/PPM); x.fillStyle=p; x.fillRect(0, 0, c.width/(s*sx/PPM), c.height/(s*sy/PPM)); x.restore(); }
  else { x.fillStyle='#888'; x.fillRect(0, 0, c.width, c.height); }
  x.globalCompositeOperation='multiply'; x.fillStyle=L.tint; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation='source-over';
  /* the street's light from below: the plaster brighter near the ground, darker up under the eaves (the lamps light it from below) */
  { const g=x.createLinearGradient(0, Y(0), 0, Y(H)); g.addColorStop(0, 'rgba(255,190,120,0.06)'); g.addColorStop(0.3, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(10,8,14,0.55)'); x.fillStyle=g; x.fillRect(0, 0, c.width, c.height); }
  const blob=(u, v, rw, rh, col, n=9)=>{ x.fillStyle=col; x.beginPath(); for(let k=0;k<=n;k++){ const a=k/n*TAU, r=0.7+0.3*R(); const px=X(u+Math.cos(a)*rw*r), py=Y(v+Math.sin(a)*rh*r); k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.fill(); };
  /* patched plaster: rectangles of a slightly other tone */
  for(let k=0;k<Math.round(W*0.25*L.wear);k++){ const u=R()*W, v=L.ground+R()*(H-L.ground), w=0.6+R()*2.4, h=0.4+R()*1.6; x.fillStyle= R()<0.5 ? 'rgba(255,240,215,0.10)' : 'rgba(60,40,30,0.10)'; x.fillRect(X(u), Y(v+h), w*sx, h*sy); }
  /* peeling paint: irregular patches showing a lighter or darker layer, with a thin dark rim */
  for(let k=0;k<Math.round(W*0.35*L.wear);k++){ const u=R()*W, v=1+R()*(H-1.5), rw=0.15+R()*0.7, rh=0.1+R()*0.5, under= R()<0.6 ? 'rgba(225,210,185,0.7)' : 'rgba(80,60,48,0.65)';
    x.strokeStyle='rgba(30,22,18,0.35)'; x.lineWidth=1; blob(u, v, rw, rh, under); x.stroke(); }
  /* damp stains under every cornice and sill line: dark vertical washes fading downwards */
  const stain=(u, v, w, len, a)=>{ const g=x.createLinearGradient(0, Y(v), 0, Y(v-len)); g.addColorStop(0, `rgba(25,22,24,${a})`); g.addColorStop(1, 'rgba(25,22,24,0)'); x.fillStyle=g;
    x.beginPath(); x.moveTo(X(u-w/2), Y(v)); for(let s=0;s<=6;s++){ const t=s/6; x.lineTo(X(u-w/2+w*t+(R()-0.5)*0.2), Y(v-len*(0.6+0.4*R()))); } x.lineTo(X(u+w/2), Y(v)); x.closePath(); x.fill(); };
  for(const v of L.lines) for(let u=0.5;u<W;u+=1.2+R()*2.5) if(R()<0.6*L.wear+0.2) stain(u, v, 0.6+R()*1.8, 1+R()*3, 0.38+0.4*R());   // RAIN-2: stronger, read at the bake's scale
  /* rust streaks under the balconies: thin orange-brown lines */
  for(const b of L.balconies) for(let k=0;k<5;k++){ const u=b[0]-b[2]/2+R()*b[2], len=0.6+R()*2.2, g=x.createLinearGradient(0, Y(b[1]), 0, Y(b[1]-len)); g.addColorStop(0, 'rgba(120,58,24,0.55)'); g.addColorStop(1, 'rgba(120,58,24,0)');
    x.fillStyle=g; x.fillRect(X(u), Y(b[1]), Math.max(1, 0.05*sx), len*sy); }
  /* RAIN-2: drips under the AC units and the drainpipes (dark), the splash band at the foot (the rain thrown up from the pavement) */
  for(const [u, v, w, len] of (L.stains||[])) stain(u, v, w, len, 0.45);
  { const g=x.createLinearGradient(0, Y(0), 0, Y(1.1)); g.addColorStop(0, 'rgba(20,16,14,0.55)'); g.addColorStop(1, 'rgba(20,16,14,0)'); x.fillStyle=g; x.fillRect(0, Y(1.1), c.width, 1.1*sy); }
  /* soot near the top */
  { const g=x.createLinearGradient(0, Y(H), 0, Y(H-3)); g.addColorStop(0, 'rgba(15,12,14,0.35)'); g.addColorStop(1, 'rgba(15,12,14,0)'); x.fillStyle=g; x.fillRect(0, Y(H), c.width, 3*sy); }
  /* graffiti on the ground floor: abstract shapes and colour only (soft sprayed blobs, arcs, a zigzag) — never a letter */
  if(L.graffiti) for(let k=0;k<L.graffiti;k++){ const u=1+R()*(W-2), v=0.5+R()*1.6, hue=Math.floor(R()*360), col=`hsla(${hue},70%,55%,0.55)`;
    x.save(); x.filter='blur(1.5px)'; x.lineCap='round';
    const kind=Math.floor(R()*3); x.strokeStyle=col; x.fillStyle=col; x.lineWidth=(0.08+R()*0.12)*sx;
    if(kind===0){ blob(u, v, 0.4+R()*0.6, 0.25+R()*0.4, col, 12); x.fillStyle=`hsla(${(hue+150)%360},70%,60%,0.5)`; blob(u+0.2, v+0.1, 0.25, 0.18, x.fillStyle, 8); }
    else if(kind===1){ x.beginPath(); x.arc(X(u), Y(v), (0.4+R()*0.5)*sx, Math.PI*(0.1+R()*0.3), Math.PI*(1.1+R()*0.6)); x.stroke(); }
    else { x.beginPath(); x.moveTo(X(u-0.8), Y(v)); for(let s=1;s<=5;s++) x.lineTo(X(u-0.8+s*0.32), Y(v+(s%2 ? 0.35 : -0.05))); x.stroke(); }
    x.restore(); }
  const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=8; return t;
}

/* ---------- small things ---------- */
const greens=['#24361e', '#2e4424', '#3a5230', '#1f3020'];
function plantAt(m, T, P, mats, R, x, y, z, s=1){ for(let k=0;k<4+Math.floor(R()*4);k++) m.put(new T.IcosahedronGeometry(0.16*s*(0.7+0.6*R()), 0), mats.leaf[Math.floor(R()*4)], P, x+(R()-0.5)*0.5*s, y+R()*0.3*s, z+(R()-0.5)*0.25*s); }
function personAt(m, T, mats, R, x, z, o={}){
  const h=1.62+R()*0.2, coat=mats.coat[Math.floor(R()*mats.coat.length)], P=null, sit=o.sit;
  const y0= sit ? 0.45 : 0, bodyH= sit ? 0.75 : h*0.62;
  m.put(new T.CylinderGeometry(0.17, 0.22, bodyH, 8), coat, P, x, y0+bodyH/2+(sit ? 0 : h*0.24), z);
  if(!sit) for(const s of [-1, 1]) m.put(new T.CylinderGeometry(0.06, 0.06, h*0.46, 6), mats.dark, P, x+s*0.08, h*0.23, z);
  m.put(new T.SphereGeometry(0.11, 10, 8), mats.skin, P, x, y0+bodyH+(sit ? 0.12 : h*0.24+0.1), z);
  if(o.umbrella){ const c=mats.umb[Math.floor(R()*mats.umb.length)], top=(sit ? 1.7 : h)+0.42; m.put(new T.ConeGeometry(0.55, 0.28, 10, 1, true), c, P, x+0.05, top, z);
    m.put(new T.CylinderGeometry(0.012, 0.012, 0.8, 4), mats.dark, P, x+0.05, top-0.4, z); }
  if(o.closed) m.put(new T.CylinderGeometry(0.03, 0.01, 0.85, 5), mats.umb[Math.floor(R()*mats.umb.length)], P, x+0.22, 0.45, z, 0, 0, 0.25);
}
function dogAt(m, T, mats, x, z){ m.put(new T.BoxGeometry(0.22, 0.24, 0.62), mats.dark, null, x, 0.42, z); m.put(new T.SphereGeometry(0.13, 8, 6), mats.dark, null, x, 0.6, z+0.36);
  for(const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.put(new T.CylinderGeometry(0.035, 0.035, 0.32, 5), mats.dark, null, x+a*0.08, 0.16, z+b*0.24); }

/* ---------- RAIN-2: geometry helpers (facade frame: u along the facade, v up, w out of the wall towards the street) ---------- */
/* triangles [[u,v,w]×3…] with per-triangle uv from a planar map → a non-indexed geometry (flat normals) */
function triGeo(T, tris, uvOf){ const pos=[], uv=[]; for(const t of tris){ for(const p of t){ pos.push(p[0], p[1], p[2]); const q=uvOf(p, t); uv.push(q[0], q[1]); } }
  const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
/* a plane of a roof: the quad / triangle's own slope coordinates (metres along the eave, metres up the slope) / tile → uv: tiles at real scale, rows along the eave */
function slopeUv(tile){ return (p, t)=>{ const a=t[0], b=t[1], c=t[2], e=[b[0]-a[0], b[1]-a[1], b[2]-a[2]], n=[(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])];
  let ex=[n[2], 0, -n[0]]; const l=Math.hypot(...ex); if(l<1e-6) ex=[1, 0, 0]; else ex=ex.map(v=>v/l); const ln=Math.hypot(...n)||1, nn=n.map(v=>v/ln), ey=[nn[1]*ex[2]-nn[2]*ex[1], nn[2]*ex[0]-nn[0]*ex[2], nn[0]*ex[1]-nn[1]*ex[0]];
  void e; return [(p[0]*ex[0]+p[1]*ex[1]+p[2]*ex[2])/tile, (p[0]*ey[0]+p[1]*ey[1]+p[2]*ey[2])/tile]; }; }
const quad=(a, b, c, d)=>[[a, b, c], [a, c, d]];
/* the roofs over the house's box (u 0…W, w −D…0, from v=top), overhang o; every face closes on the others (no gap, no crooked plane) */
function hipRoof(W, D, top, H, o){ const A=[-o, top, o], B=[W+o, top, o], C=[W+o, top, -D-o], Dd=[-o, top, -D-o];
  if(W>=D){ const r0=[D/2, top+H, -D/2], r1=[W-D/2, top+H, -D/2]; return [...quad(A, B, r1, r0), ...quad(C, Dd, r0, r1), [B, C, r1], [Dd, A, r0]]; }
  const r0=[W/2, top+H, -W/2], r1=[W/2, top+H, -D+W/2]; return [...quad(B, C, r1, r0), ...quad(Dd, A, r0, r1), [A, B, r0], [C, Dd, r1]]; }
function gableRoof(W, D, top, H, o){ const A=[-o, top, o], B=[W+o, top, o], C=[W+o, top, -D-o], Dd=[-o, top, -D-o], r0=[-o, top+H, -D/2], r1=[W+o, top+H, -D/2];
  return { slopes:[...quad(A, B, r1, r0), ...quad(C, Dd, r0, r1)], ends:[[[0, top, 0], [0, top+H*(D/2)/(D/2+o), -D/2], [0, top, -D]], [[W, top, -D], [W, top+H*(D/2)/(D/2+o), -D/2], [W, top, 0]]] }; }
function mansardRoof(W, D, top, h1, i1, H2, o){ const A=[-o, top, o], B=[W+o, top, o], C=[W+o, top, -D-o], Dd=[-o, top, -D-o], t=top+h1;
  const a=[i1, t, -i1], b=[W-i1, t, -i1], c=[W-i1, t, -D+i1], d=[i1, t, -D+i1];
  return [...quad(A, B, b, a), ...quad(B, C, c, b), ...quad(C, Dd, d, c), ...quad(Dd, A, a, d), ...hipRoof(W-2*i1, D-2*i1, t, H2, 0).map(tr=>tr.map(p=>[p[0]+i1, p[1], p[2]-i1]))]; }
/* a profiled strip (a cornice, a string course) along u from 0 to W: profile [[w, v]…] from the wall out and up; ends capped by fans */
function profileGeo(T, W, prof){ const pos=[], uv=[]; let acc=0; const L=[0]; for(let i=1;i<prof.length;i++){ acc+=Math.hypot(prof[i][0]-prof[i-1][0], prof[i][1]-prof[i-1][1]); L.push(acc); }
  for(let i=0;i<prof.length-1;i++){ const [w0, v0]=prof[i], [w1, v1]=prof[i+1]; for(const [u, w, v, s] of [[0, w0, v0, L[i]], [W, w0, v0, L[i]], [W, w1, v1, L[i+1]], [0, w0, v0, L[i]], [W, w1, v1, L[i+1]], [0, w1, v1, L[i+1]]]){ pos.push(u, v, w); uv.push(u/2, s/2); } }
  for(const u of [0, W]) for(let i=1;i<prof.length-1;i++){ const P=[prof[0], prof[i], prof[i+1]]; const ord= u===0 ? [0, 2, 1] : [0, 1, 2]; for(const k of ord){ pos.push(u, P[k][1], P[k][0]); uv.push(P[k][0], P[k][1]); } }
  const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
const CORNICE=Object.freeze({ classical:[[0, 0], [0.1, 0], [0.1, 0.12], [0.22, 0.16], [0.3, 0.3], [0.5, 0.36], [0.62, 0.46], [0.62, 0.6], [0, 0.6]],
  nouveau:[[0, 0], [0.08, 0], [0.16, 0.08], [0.24, 0.1], [0.42, 0.26], [0.56, 0.3], [0.56, 0.42], [0, 0.42]], brick:[[0, 0], [0.12, 0], [0.12, 0.08], [0.24, 0.08], [0.24, 0.16], [0.36, 0.16], [0.36, 0.26], [0, 0.26]],
  wooden:[[0, 0], [0.08, 0], [0.08, 0.1], [0.3, 0.14], [0.3, 0.24], [0, 0.24]], course:[[0, 0], [0.12, 0], [0.16, 0.06], [0.16, 0.14], [0.06, 0.18], [0, 0.18]] });
/* a pipe along a polyline (a drainpipe, a wire): cylinders between its points, merged */
function pipe(T, m, mat, P, pts, r){ const a=new T.Vector3(), b=new T.Vector3(), mid=new T.Vector3(), dir=new T.Vector3(), q=new T.Quaternion(), up=new T.Vector3(0, 1, 0), M=new T.Matrix4();
  for(let i=1;i<pts.length;i++){ a.fromArray(pts[i-1]); b.fromArray(pts[i]); dir.subVectors(b, a); const L=dir.length(); if(L<1e-4) continue; mid.addVectors(a, b).multiplyScalar(0.5); q.setFromUnitVectors(up, dir.normalize());
    M.compose(mid, q, new T.Vector3(1, 1, 1)); m.add(new T.CylinderGeometry(r, r, L, 5, 1, true), mat, P ? P.clone().multiply(M) : M.clone()); } }

/* ---------- RAIN-2: the houses of a block — each its own width, height (3 to 7 floors), setback, style and roof ---------- */
export const STYLES=Object.freeze(['nouveau', 'classical', 'brick', 'wooden']);
export function blockHouses(side, bi, b, prev=null){ const R=rngOf(KIT.seed^(side==='opp' ? 0x3100 : 0x3200)^(bi*104729)), [z0, z1]=b, out=[]; let z=z0;   // prev: the house before (never its twin)
  while(z<z1-4){ let W=9+R()*13; if(z1-(z+W)<8) W=z1-z; const style=STYLES[Math.floor(R()*4)], fr=R(), floors=fr<0.12 ? 3 : fr<0.42 ? 4 : fr<0.72 ? 5 : fr<0.9 ? 6 : 7;
    const roofs={ nouveau:['mansard', 'mansard', 'hip'], classical:['hip', 'hip', 'mansard', 'gable'], brick:['gable', 'hip', 'gable'], wooden:['gable', 'hip', 'hip'] }[style];
    const last=out.length ? out[out.length-1] : prev, roof=roofs[Math.floor(R()*roofs.length)]; let fl=floors; if(last && last.style===style && last.floors===fl && last.roof===roof) fl= fl<7 ? fl+1 : fl-1;   // a neighbour is never its twin
    out.push({ z0:z, z1:z+W, floors:fl, style, roof, setback: R()<0.3 ? 0.5+R()*1.4 : 0, ground:4.1+R()*0.6, floorH:3.2+R()*0.5, bay:3.0+R()*1.1, seed:Math.floor(R()*1e9) }); z+=W; }
  return out; }

function house(T, m, mats, img, side, h, o, out){
  const R=rngOf(h.seed), X=STREET[side]+(side==='opp' ? h.setback : -h.setback), W=h.z1-h.z0, D=13+R()*3;
  /* opp faces −x: u → +z; left faces +x: u → −z (the frame is turned, never mirrored) */
  const P=new T.Matrix4().makeRotationY(side==='opp' ? -Math.PI/2 : Math.PI/2).premultiply(new T.Matrix4().makeTranslation(X, 0, side==='opp' ? h.z0 : h.z1));
  const { style, floors, ground, floorH }=h, n=Math.max(2, Math.floor(W/h.bay)), bw=W/n, top=ground+floors*floorH;
  const winW=Math.min(style==='brick' ? 1.25 : 1.45, bw*0.42), winH=Math.min(style==='classical' ? 2.4 : 2.2, floorH*0.66), sill=0.85;
  const shape= style==='nouveau' ? 0 : style==='brick' ? 2 : style==='classical' ? 1 : (R()<0.5 ? 1 : 2);   // 0 arched, 1 straight, 2 segmental
  const wear=0.5+R()*0.9, tint=KIT.plaster[Math.floor(R()*KIT.plaster.length)], trimTint=KIT.trim[Math.floor(R()*KIT.trim.length)];
  const lines=[ground-0.05, top], balconies=[], stains=[]; for(let f=1;f<floors;f++) lines.push(ground+f*floorH-0.2);
  const archP=(p, x0, y0, w, hh)=>{ if(shape===0){ const r=w/2, yc=y0+hh-r; p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, yc); p.absarc(x0+r, yc, r, 0, Math.PI, false); p.lineTo(x0, y0); }
    else if(shape===2){ p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, y0+hh-0.22); p.quadraticCurveTo(x0+w/2, y0+hh+0.1, x0, y0+hh-0.22); p.lineTo(x0, y0); }
    else { p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, y0+hh); p.lineTo(x0, y0+hh); p.lineTo(x0, y0); } return p; };
  /* the wall with its windows cut through (a 0.45 m reveal: every window recessed) */
  const s=new T.Shape(); s.moveTo(0, ground); s.lineTo(W, ground); s.lineTo(W, top); s.lineTo(0, top); s.lineTo(0, ground);
  const wins=[]; for(let k=0;k<n;k++) for(let f=0;f<floors;f++){ const xc=(k+0.5)*bw, y0=ground+f*floorH+sill; s.holes.push(archP(new T.Path(), xc-winW/2, y0, winW, winH)); wins.push({ k, f, xc, y0 }); }
  /* balconies: iron ones (nouveau, classical), Tbilisi's enclosed carved wooden ones (wooden) spanning bays */
  const balc=new Set(); for(const w of wins){ if(w.f===floors-1) continue; const hb=((Math.sin(w.xc*12.9898+w.y0*78.233+h.z0*37.719)*43758.5453)%1+1)%1, on= style==='nouveau' ? (w.f%2===0 || w.k%2===0) && w.f<floors-1 : style==='classical' ? (w.f===0 || (w.f===2 && hb<0.6)) && w.k%2===1 : style==='brick' ? w.f>=1 && hb<0.3 : style==='wooden' ? w.f>=2 && hb<0.25 : false; if(on){ balc.add(w); balconies.push([w.xc, w.y0-0.15, winW+0.9]); } }   // RAIN-5: a good share of RAIN-1's balconies back, varied per house (a hash per window: no other draw moves)
  const wood=[]; if(style==='wooden'){ const span=Math.min(n, 2+Math.floor(R()*2)), k0=Math.floor(R()*(n-span+1)); for(let f=0;f<Math.min(floors-1, 1+Math.floor(R()*2));f++){ wood.push({ k0, span, f }); balconies.push([(k0+span/2)*bw, ground+f*floorH+sill-0.15, span*bw]); } }
  /* AC units (their drips go into the canvas) */
  const acs=[]; for(const w of wins) if(w.f>=0 && !balc.has(w) && R()<(style==='nouveau' ? 0.06 : 0.14)){ acs.push(w); stains.push([w.xc+winW/2+0.55, w.y0-0.05, 0.25, 1.2+R()*1.6]); }
  const brick= style==='brick';
  const L={ tint: brick ? '#b8a090' : tint, ground, lines, balconies, stains, wear, base: brick ? 'brick' : 'plaster', graffiti: R()<0.6 ? 2+Math.floor(R()*4) : 0 };
  const facade=new T.MeshStandardMaterial({ map:facadeCanvas(T, brick ? img.brick : img.plaster, top+1, W, L, R), roughness:0.92, metalness:0 });
  { const g=new T.ExtrudeGeometry(s, { depth:0.45, bevelEnabled:false, curveSegments:10 }); const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i, p.getX(i)/W, p.getY(i)/(top+1)); m.put(g, facade, P, 0, 0, -0.45); }
  /* the house's box behind the facade: its side walls (firewalls, seen where a neighbour is lower or set back) */
  { const side2=new T.MeshStandardMaterial({ map:mats.wallTex, color:new T.Color(tint).multiplyScalar(0.75), roughness:0.95 });
    for(const u of [0.02, W-0.02]){ const g=new T.PlaneGeometry(D, top), uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*D/2.2, uv.getY(i)*top/2.2); m.put(g, side2, P, u, top/2, -D/2, u<1 ? -Math.PI/2 : Math.PI/2); }
    const g=new T.PlaneGeometry(W, top); m.put(g, side2, P, W/2, top/2, -D, Math.PI); }
  /* the ground floor: stone or plaster, shop fronts (a framed glass front, the lit interior or a rolled-down rusty shutter, a sign band without text, some an awning) and the house door */
  { const gs=new T.Shape(); gs.moveTo(0, 0); gs.lineTo(W, 0); gs.lineTo(W, ground); gs.lineTo(0, ground); gs.lineTo(0, 0); const shops=[], door=Math.floor(R()*n);
    for(let k=0;k<n;k++){ if(k===door){ const w=1.3, x0=(k+0.5)*bw-w/2; gs.holes.push(archP(new T.Path(), x0, 0.15, w, Math.min(3.1, ground-0.9))); shops.push([x0, w, 'door']); continue; }
      const w=bw*0.72, x0=(k+0.5)*bw-w/2; gs.holes.push((new T.Path()).moveTo(x0, 0.35).lineTo(x0+w, 0.35).lineTo(x0+w, ground-1.1).lineTo(x0, ground-1.1).lineTo(x0, 0.35)); shops.push([x0, w, 'shop']); }
    const g=new T.ExtrudeGeometry(gs, { depth:0.55, bevelEnabled:false, curveSegments:10 }); const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i, p.getX(i)/W, p.getY(i)/(top+1)); m.put(g, brick ? facade : mats.stone, P, 0, 0, -0.45);
    for(const [x0, w, kind] of shops){ const hh= kind==='door' ? Math.min(3.1, ground-0.9) : ground-1.45, yc=(kind==='door' ? 0.15 : 0.35)+hh/2;
      if(kind==='door'){ m.put(new T.BoxGeometry(w, hh, 0.08), mats.door, P, x0+w/2, yc, -0.35); m.put(new T.BoxGeometry(0.06, hh, 0.1), mats.frame, P, x0+w/2, yc, -0.3); continue; }
      const open=o.shopOpen(R), shutter=!open && R()<0.7;
      m.put(new T.PlaneGeometry(w, hh), open ? mats.shopLit : mats.shopDark, P, x0+w/2, yc, -0.42);
      for(let j=0;j<=Math.max(1, Math.round(w/1.1));j++) m.put(new T.BoxGeometry(0.06, hh, 0.08), mats.frame, P, x0+j*w/Math.max(1, Math.round(w/1.1)), yc, -0.22);
      m.put(new T.BoxGeometry(w, 0.08, 0.1), mats.frame, P, x0+w/2, 0.35+hh*0.78, -0.22); m.put(new T.PlaneGeometry(w, hh), mats.glass, P, x0+w/2, yc, -0.2);
      if(shutter){ const down=0.55+R()*0.45, sh=hh*down, g2=new T.PlaneGeometry(w+0.1, sh), uv=g2.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*(w+0.1)/1.6, uv.getY(i)*sh/1.6); m.put(g2, mats.shutterM, P, x0+w/2, 0.35+hh-sh/2, -0.12); }
      const sc=KIT.sign[Math.floor(R()*KIT.sign.length)]; m.put(new T.BoxGeometry(w+0.3, 0.55, 0.12), open && R()<0.6 ? mats.signLit[Math.floor(R()*mats.signLit.length)] : mats.trimOf(sc), P, x0+w/2, ground-0.78, 0.06);   // the sign band: colour, no text
      if(R()<0.3){ const aw=KIT.awning[Math.floor(R()*KIT.awning.length)], st=[mats.stripeOf(aw[0]), mats.stripeOf(aw[1])]; for(let j=0;j<Math.round(w/0.5);j++) m.put(new T.BoxGeometry(w/Math.round(w/0.5), 0.03, 1.3), st[j%2], P, x0+(j+0.5)*w/Math.round(w/0.5), ground-1.25, 0.6, 0, -0.35, 0); } } }
  /* the cornice and string courses with real profiles, pilasters (classical), the base band */
  m.put(profileGeo(T, W+0.4, CORNICE[style].map(([w, v])=>[w*(0.9+0.3*R()), v])), mats.trimOf(trimTint), P, -0.2, top-0.05, 0);
  if(style!=='brick') for(let f=1;f<floors;f++) m.put(profileGeo(T, W, CORNICE.course), mats.trimOf(trimTint), P, 0, ground+f*floorH-0.3, 0);
  else for(let f=1;f<floors;f++) m.put(new T.BoxGeometry(W, 0.14, 0.06), mats.brickBand, P, W/2, ground+f*floorH-0.25, 0.03);
  m.put(profileGeo(T, W, CORNICE.course.map(([w, v])=>[w*1.4, v*1.3])), mats.trimOf(trimTint), P, 0, ground-0.15, 0);
  if(style==='classical') for(let k=0;k<=n;k++) m.put(new T.BoxGeometry(0.42, top-ground-0.3, 0.12), mats.trimOf(trimTint), P, k*bw, (top+ground)/2-0.1, 0.06);
  /* the roof (closed on the box), its tiles or slates at real scale; dormers on a mansard; chimneys */
  { const o2=0.35, tiles= h.roof==='mansard' || style==='nouveau' ? mats.slate : mats.tiles, UV=slopeUv(tiles===mats.slate ? 0.9 : 1.2);
    if(h.roof==='hip') m.put(triGeo(T, hipRoof(W, D, top+0.5, Math.min(W, D)*0.32, o2), UV), tiles, P);
    else if(h.roof==='gable'){ const G=gableRoof(W, D, top+0.5, D*0.3, o2); m.put(triGeo(T, G.slopes, UV), tiles, P); m.put(triGeo(T, G.ends, (p)=>[p[2]/2.2, p[1]/2.2]), new T.MeshStandardMaterial({ map:mats.wallTex, color:new T.Color(tint).multiplyScalar(0.8), roughness:0.95 }), P); }
    else { m.put(triGeo(T, mansardRoof(W, D, top+0.5, 2.6, 0.95, 1.1, o2), UV), tiles, P);
      for(let k=0;k<n;k+=1+(R()<0.5 ? 1 : 0)){ const xc=(k+0.5)*bw; m.put(new T.BoxGeometry(1.1, 1.4, 1.1), mats.zinc, P, xc, top+1.6, -0.55); m.put(triGeo(T, [[[xc-0.6, top+2.3, 0.05], [xc+0.6, top+2.3, 0.05], [xc, top+2.75, 0.05]]], p=>[p[0], p[1]]), mats.zinc, P);
        m.put(new T.PlaneGeometry(0.62, 0.8), R()<0.3*o.litShare ? mats.dormerLit : mats.shopDark, P, xc, top+1.55, 0.02); } }
    m.put(new T.BoxGeometry(W+2*o2, 0.18, 0.12), mats.zinc, P, W/2, top+0.5, o2);   // the eaves' gutter
    for(let k=0;k<Math.max(1, Math.round(W/8));k++){ const u=1+R()*(W-2), d=-2-R()*(D-4); m.put(new T.BoxGeometry(0.6, 1.6, 0.6), brick ? mats.brickBand : mats.chimney, P, u, top+0.5+Math.min(W, D)*0.25+0.4, d);
      if(R()<0.35) m.put(new T.CylinderGeometry(0.012, 0.012, 2.2, 4), mats.dark, P, u+0.5, top+2.4, d); } }
  /* RAIN-5b: each house its own character, on its own draws (nothing placed above moves): rooftop clutter — antennas (a mast, cross-bars), a water
     tank, a dish; a stairwell — a column of small windows on the half-landings between two bays, most of them dimly lit */
  { const Rh=rngOf((KIT.seed^0x434841)+h.id*101), rt=top+0.5+Math.min(W, D)*0.2;
    for(let k=0, na=Math.floor(Rh()*3);k<na;k++){ const u=1+Rh()*(W-2), d=-1.5-Rh()*(D-3); m.put(new T.CylinderGeometry(0.02, 0.025, 2.4, 4), mats.dark, P, u, rt+1.2, d); for(let j=0;j<3;j++) m.put(new T.BoxGeometry(0.9-j*0.2, 0.02, 0.02), mats.dark, P, u, rt+1.6+j*0.35, d); }
    if(Rh()<0.4){ const u=1.5+Rh()*(W-3), d=-2-Rh()*(D-5); m.put(new T.CylinderGeometry(0.6, 0.6, 1.1, 10), mats.tank, P, u, rt+0.55, d); }
    if(Rh()<0.3){ const u=1+Rh()*(W-2); m.put(new T.SphereGeometry(0.35, 10, 6, 0, Math.PI*2, 0, Math.PI/2), mats.tank, P, u, top+0.3, -0.4, 0, -1.2, 0); }
    if(n>=2 && Rh()<0.75){ const sx=bw*(1+Math.floor(Rh()*(n-1))), lit=Rh()<0.8; for(let f=0;f<floors-1;f++) m.put(new T.PlaneGeometry(0.42, 0.8), lit ? mats.stairLit : mats.shopDark, P, sx, ground+f*floorH+floorH*0.78, 0.02); } }
  /* drainpipes down the facade's edges, a funnel under the gutter; rust where their brackets hold */
  for(const u of R()<0.85 ? [0.3, W-0.3] : [W-0.3]){ pipe(T, m, mats.zinc, P, [[u, top+0.45, 0.25], [u, top-0.4, 0.25], [u, top-0.7, 0.12], [u, 0.35, 0.12], [u, 0.1, 0.25]], 0.055); m.put(new T.CylinderGeometry(0.16, 0.06, 0.3, 6), mats.zinc, P, u, top+0.35, 0.25); stains.push([u, top-0.8, 0.12, 2.5]); }
  /* AC units under some windows (a box, a grille, brackets) */
  for(const w of acs){ const ux=w.xc+winW/2+0.55, vy=w.y0+0.15; m.put(new T.BoxGeometry(0.82, 0.56, 0.3), mats.ac, P, ux, vy, 0.18); m.put(new T.CircleGeometry(0.19, 14), mats.grille, P, ux+0.12, vy, 0.335); for(const sd of [-0.3, 0.3]) m.put(new T.BoxGeometry(0.04, 0.04, 0.34), mats.iron, P, ux+sd, vy-0.3, 0.17); }
  /* a climbing vine on some houses */
  if(R()<0.22){ let u=W*(0.1+0.8*R()), v=0.4; for(let k=0;k<70 && v<top-1;k++){ m.put(new T.IcosahedronGeometry(0.18+0.12*R(), 0), mats.leaf[Math.floor(R()*4)], P, u, v, 0.1); u+=(R()-0.5)*0.5; v+=0.1+R()*0.15; } }
  /* the windows: the surround (architrave), sill, frame with its mullion and transom, glass, the room behind (lives atlas), pediment / keystone / lintel by style, shutters */
  for(const w of wins){ const { xc, y0 }=w, T2=mats.trimOf(trimTint);
    m.put(new T.BoxGeometry(winW+0.34, 0.09, 0.3), brick ? mats.stone : T2, P, xc, y0-0.045, 0.1);
    if(!brick){ for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.13, winH, 0.05), T2, P, xc+sd*(winW/2+0.065), y0+winH/2, 0.02); if(shape!==0) m.put(new T.BoxGeometry(winW+0.26, 0.13, 0.05), T2, P, xc, y0+winH+0.065, 0.02); }
    if(style==='classical') m.put(triGeo(T, [[[xc-winW/2-0.3, y0+winH+0.18, 0.12], [xc+winW/2+0.3, y0+winH+0.18, 0.12], [xc, y0+winH+0.55, 0.12]], [[xc-winW/2-0.3, y0+winH+0.14, 0.0], [xc+winW/2+0.3, y0+winH+0.14, 0.0], [xc+winW/2+0.3, y0+winH+0.18, 0.12]], [[xc-winW/2-0.3, y0+winH+0.14, 0.0], [xc+winW/2+0.3, y0+winH+0.18, 0.12], [xc-winW/2-0.3, y0+winH+0.18, 0.12]]], p=>[p[0], p[1]]), T2, P);
    if(shape===0) m.put(new T.BoxGeometry(0.2, 0.3, 0.08), T2, P, xc, y0+winH+0.05, 0.03);   // the keystone
    if(brick) m.put(new T.BoxGeometry(winW+0.3, 0.24, 0.05), mats.brickBand, P, xc, y0+winH+0.02, 0.02);   // the segmental arch's lintel band
    const fd=-0.3; for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.07, winH-0.1, 0.07), mats.frame, P, xc+sd*(winW/2-0.035), y0+winH/2-0.05, fd);
    m.put(new T.BoxGeometry(winW, 0.07, 0.07), mats.frame, P, xc, y0+0.035, fd); m.put(new T.BoxGeometry(winW, 0.07, 0.07), mats.frame, P, xc, y0+winH*0.7, fd); m.put(new T.BoxGeometry(0.05, winH*0.7, 0.06), mats.frame, P, xc, y0+winH*0.35, fd);
    m.put(new T.PlaneGeometry(winW, winH), mats.glass, P, xc, y0+winH/2, fd-0.02);
    const id=out.windows.length, life=Math.floor(R()*16), amb=R(), warm=R();   // RAIN-5b: 16 rooms (the same one draw)
    { const g=new T.PlaneGeometry(winW*1.05, winH*1.05), uv=g.attributes.uv, cu=(life%4)/4, cv=Math.floor(life/4)/4; for(let i=0;i<uv.count;i++) uv.setXY(i, cu+uv.getX(i)/4, cv+uv.getY(i)/4); m.put(g, mats.life, P, xc, y0+winH/2, -0.6); }
    if((style==='classical' || style==='wooden') && R()<0.35*wear){ const open=0.4+R()*0.9, c=mats.shut[Math.floor(R()*mats.shut.length)]; for(const sd of [-1, 1]) m.put(new T.BoxGeometry(winW/2, winH, 0.04), c, P, xc+sd*(winW/2+Math.cos(open)*winW/4), y0+winH/2, Math.sin(open)*winW/4, sd*open); }
    if(!balc.has(w) && R()<0.14){ m.put(new T.BoxGeometry(winW+0.2, 0.25, 0.3), mats.pot, P, xc, y0+0.06, 0.32); plantAt(m, T, P, mats, R, xc, y0+0.3, 0.32, 1.2); }
    const C=[[xc-winW/2, y0], [xc+winW/2, y0], [xc+winW/2, y0+winH], [xc-winW/2, y0+winH]].map(([u, v])=>new T.Vector3(u, v, fd).applyMatrix4(P));
    out.windows.push({ id, side, block:h.block, house:h.id, bay:w.k, floor:w.f, corners:C.map(p=>[p.x, p.y, p.z]), centre:new T.Vector3(xc, y0+winH/2, fd).applyMatrix4(P).toArray(), life, amb, warm }); }
  /* iron balconies: a profiled slab on brackets, a railing with balusters and curls; people's things on some */
  for(const w of balc){ const { xc, y0 }=w, bwid=winW+0.9, d=0.95, y=y0-0.12;
    m.put(new T.BoxGeometry(bwid+0.2, 0.14, d), mats.trimOf(trimTint), P, xc, y-0.07, d/2); for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.12, 0.35, d*0.8), mats.trimOf(trimTint), P, xc+sd*(bwid/2-0.1), y-0.3, d*0.4);
    m.put(new T.BoxGeometry(bwid, 0.05, 0.05), mats.iron, P, xc, y+1.0, d); for(let k=0;k<=Math.round(bwid/0.13);k++) m.put(new T.BoxGeometry(0.018, 0.9, 0.018), mats.iron, P, xc-bwid/2+k*bwid/Math.round(bwid/0.13), y+0.55, d);
    for(let k=0;k<3;k++) m.put(new T.TorusGeometry(0.14, 0.012, 4, 12), mats.iron, P, xc-bwid/3+k*bwid/3, y+0.5, d);
    for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.04, 0.04, d), mats.iron, P, xc+sd*bwid/2, y+1.0, d/2);
    const r=R(); if(r<0.22) for(let k=0;k<3;k++){ m.put(new T.CylinderGeometry(0.14, 0.1, 0.3, 8), mats.pot, P, xc-0.6+k*0.6, y+0.15, d-0.25); plantAt(m, T, P, mats, R, xc-0.6+k*0.6, y+0.45, d-0.25, 0.8); }
    else if(r<0.3){ for(const sd of [-1, 1]) m.put(new T.TorusGeometry(0.3, 0.025, 6, 16), mats.dark, P, xc+sd*0.5, y+0.33, d-0.3); m.put(new T.BoxGeometry(1.0, 0.04, 0.04), mats.bike, P, xc, y+0.5, d-0.3, 0, 0, 0.3); }
    else if(r<0.42){ for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.42, 0.04, 0.42), mats.wood, P, xc+sd*0.45, y+0.45, d-0.35), m.put(new T.BoxGeometry(0.42, 0.45, 0.04), mats.wood, P, xc+sd*0.45, y+0.68, d-0.15); }
    if(R()<0.22){ const ly=y+1.9; m.put(new T.CylinderGeometry(0.006, 0.006, bwid, 3), mats.dark, P, xc, ly, d-0.05, 0, 0, Math.PI/2); for(let k=0;k<4;k++) m.put(new T.PlaneGeometry(0.32+R()*0.2, 0.45+R()*0.3), mats.cloth[Math.floor(R()*mats.cloth.length)], P, xc-bwid/2+0.3+k*(bwid-0.6)/3, ly-0.3, d-0.05); } }
  /* Tbilisi's enclosed wooden balconies: on brackets, posts, a carved lattice band, balusters below, small-paned glazing above (some lit), a fringed roof board */
  for(const B of wood){ const x0=B.k0*bw+0.2, x1=(B.k0+B.span)*bw-0.2, bwid=x1-x0, xc=(x0+x1)/2, y=ground+B.f*floorH+0.2, d=1.25, Hh=floorH-0.3;
    m.put(new T.BoxGeometry(bwid+0.3, 0.16, d+0.1), mats.woodBal, P, xc, y, d/2); for(let k=0;k<=B.span*2;k++) m.put(new T.BoxGeometry(0.08, 0.5, 0.08), mats.woodBal, P, x0+k*bwid/(B.span*2), y-0.3, d*0.7, 0, 0.6, 0);
    for(let k=0;k<=B.span*2;k++) m.put(new T.BoxGeometry(0.1, Hh, 0.1), mats.woodBal, P, x0+k*bwid/(B.span*2), y+Hh/2, d);
    for(const sd of [0, 1]) m.put(new T.BoxGeometry(0.1, Hh, d), mats.woodBal, P, sd ? x1 : x0, y+Hh/2, d/2);
    for(let k=0;k<Math.round(bwid/0.12);k++) m.put(new T.BoxGeometry(0.035, 0.8, 0.035), mats.woodBal, P, x0+(k+0.5)*bwid/Math.round(bwid/0.12), y+0.5, d);
    m.put(new T.PlaneGeometry(bwid, 0.28), mats.lattice, P, xc, y+1.05, d+0.06);
    const panes=Math.round(bwid/0.45); for(let k=0;k<panes;k++){ const px=x0+(k+0.5)*bwid/panes; m.put(new T.PlaneGeometry(bwid/panes-0.06, Hh-1.4), R()<o.litShare ? mats.paneLit : mats.glass, P, px, y+1.2+(Hh-1.4)/2, d+0.02);
      m.put(new T.BoxGeometry(0.03, Hh-1.4, 0.04), mats.woodBal, P, px+bwid/panes/2, y+1.2+(Hh-1.4)/2, d+0.03); m.put(new T.BoxGeometry(bwid/panes, 0.03, 0.04), mats.woodBal, P, px, y+1.2+(Hh-1.4)*0.5, d+0.03); }
    m.put(new T.BoxGeometry(bwid+0.4, 0.1, d+0.3), mats.woodBal, P, xc, y+Hh+0.05, d/2); m.put(new T.PlaneGeometry(bwid+0.4, 0.22), mats.fringe, P, xc, y+Hh-0.08, d+0.16); }
  return { top, z0:h.z0, z1:h.z1, X };
}

/* ---------- RAIN-2: the plane trees — a trunk that forks, limbs splitting again, twigs; autumn leaf cards in clusters at the twigs ---------- */
/* a tube along points [[x, y, z, r]…] (sides round), merged; uv: metres round / along over the bark's tile */
function tube(T, m, mat, pts, sides, tile){ const pos=[], uv=[], idx=[]; const N=pts.length;
  for(let i=0;i<N;i++){ const a=pts[Math.max(0, i-1)], b=pts[Math.min(N-1, i+1)], t=new T.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]).normalize(), ref=Math.abs(t.y)>0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0), nx=new T.Vector3().crossVectors(ref, t).normalize(), by=new T.Vector3().crossVectors(t, nx);
    const along=i ? uv[uv.length-1] : 0; void along;
    for(let k=0;k<=sides;k++){ const th=k/sides*TAU, c=Math.cos(th), s=Math.sin(th), r=pts[i][3]; pos.push(pts[i][0]+(nx.x*c+by.x*s)*r, pts[i][1]+(nx.y*c+by.y*s)*r, pts[i][2]+(nx.z*c+by.z*s)*r);
      uv.push(k/sides*Math.max(0.3, TAU*r)/tile, i===0 ? 0 : 0); } }
  let acc=0; for(let i=1;i<N;i++){ acc+=Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2]); for(let k=0;k<=sides;k++) uv[(i*(sides+1)+k)*2+1]=acc/tile; }
  for(let i=0;i<N-1;i++) for(let k=0;k<sides;k++){ const a=i*(sides+1)+k, b=a+sides+1; idx.push(a, b, a+1, a+1, b, b+1); }
  const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); m.add(g, mat, new T.Matrix4()); }
export function planeTree(T, m, mats, R, t){ const [x, , z]=t.p, H=t.p[1]+t.r*0.9, near=t.near, tips=[];
  const fork=2.8+R()*0.8, lean=[(R()-0.5)*0.4, (R()-0.5)*0.4], trunk=[];
  for(let i=0;i<=5;i++){ const f=i/5, y=fork*f; trunk.push([x+lean[0]*f*f, y-0.2, z+lean[1]*f*f, 0.34-0.1*f+(i===0 ? 0.06 : 0)]); } tube(T, m, mats.planeBark, trunk, 9, 1.4);
  const top=trunk[5], grow=(p, dir, L, r, depth)=>{ const pts=[[...p.slice(0, 3), r]]; let q=p.slice(0, 3), d=dir.slice();
      for(let i=1;i<=4;i++){ d=[d[0]+(R()-0.5)*0.25, d[1]+(R()-0.5)*0.15-0.03*depth, d[2]+(R()-0.5)*0.25]; const l=Math.hypot(...d); d=d.map(v=>v/l); q=[q[0]+d[0]*L/4, q[1]+d[1]*L/4, q[2]+d[2]*L/4]; pts.push([...q, r*(1-0.45*i/4)]); }
      tube(T, m, mats.planeBark, pts, depth<1 ? 7 : 5, 1.4);
      if(depth<2){ const k=depth<1 ? 3 : 2; for(let j=0;j<k;j++){ const a=R()*TAU, sp=0.45+R()*0.35; grow(pts[4], [d[0]+Math.cos(a)*sp, d[1]*0.9+0.1, d[2]+Math.sin(a)*sp], L*(0.55+R()*0.2), r*0.55, depth+1); } }
      else tips.push({ p:q, d }); };
  const nl=3+Math.floor(R()*2), a0=R()*TAU; for(let k=0;k<nl;k++){ const a=a0+k*TAU/nl+(R()-0.5)*0.6, out=0.55+R()*0.3; grow(top, [Math.cos(a)*out, 0.85, Math.sin(a)*out], (H-fork)*(0.55+R()*0.2)*(near ? 0.75 : 1), 0.16, 0); }
  /* the leaves: a cluster of cards round each twig's end (autumn: some twigs bare, the crown thinner near the lamps' warmth) */
  for(const tp of tips){ if(R()<(near ? 0.25 : 0.06)) continue; const nc=near ? 7+Math.floor(R()*5) : 12+Math.floor(R()*8);   // RAIN-2: autumn — dense crowns, the nearest thinner
    for(let k=0;k<nc;k++){ const s=(0.9+R()*0.7)*(near ? 0.85 : 1), px=tp.p[0]+(R()-0.5)*1.6, py=tp.p[1]+(R()-0.5)*1.1-0.15, pz=tp.p[2]+(R()-0.5)*1.6, g=new T.PlaneGeometry(s, s);
      const cell=Math.floor(R()*4), uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, (cell%2)*0.5+uv.getX(i)*0.5, Math.floor(cell/2)*0.5+uv.getY(i)*0.5);
      m.put(g, mats.leafCard[Math.floor(R()*mats.leafCard.length)], null, px, py, pz, R()*TAU, (R()-0.5)*1.4, (R()-0.5)*1.4); } }
  return tips.length; }

/* ---------- the city ---------- */
/* mats: the bake's materials; img: { plaster } (the CC0 plaster image); o: { mood: 'late' | 'evening' | 'after' } */
export function buildCity(T, mats, img, o={}){
  const mood=o.mood||'late', MOOD={ late:{ people:4, terraces:false, string:false, litShare:0.12, shops:0.15, umbrellas:0.5 }, evening:{ people:46, terraces:true, string:true, litShare:0.42, shops:0.85, umbrellas:0.85 },
    after:{ people:10, terraces:true, string:true, litShare:0.2, shops:0.4, umbrellas:0 } }[mood];
  const g=new T.Group(), m=merger(T), out={ windows:[], lamps:[] }, S=STREET, R=rngOf(KIT.seed^0x5354);
  const cafes=[[40, 66], [98, 138]];
  const oo={ cafes, litShare:MOOD.litShare, shopOpen:r=>r()<MOOD.shops };
  /* the houses of both rows */
  let hid=0; out.houses=[]; for(const side of ['opp', 'left']){ let prev=null; BLOCKS[side].forEach((b, bi)=>{ if(b[0]>S.len*0.75) return; for(const h of blockHouses(side, bi, b, prev)){ prev=h; h.block=bi; h.id=hid++; const r=house(T, m, mats, img, side, h, oo, out); out.houses.push({ side, ...h, top:r.top, X:r.X }); } }); }   // RAIN-2: each house its own
  /* RAIN-2: wires across the street between the rows (sagging), and along the facades from house to house */
  { const Rw=rngOf(KIT.seed^0x57495245); for(let z=14;z<S.len*0.45;z+=8+Rw()*22){ const y0=7+Rw()*5, y1=7+Rw()*5, sag=0.6+Rw()*1.2, z1=z+(Rw()-0.5)*6, pts=[]; for(let k=0;k<=12;k++){ const t=k/12; pts.push([S.left+(S.opp-S.left)*t, y0+(y1-y0)*t-sag*4*t*(1-t), z+(z1-z)*t]); } pipe(T, m, mats.dark, null, pts, 0.012); }
    for(const side of ['opp', 'left']){ const X=S[side]+(side==='opp' ? -0.15 : 0.15); for(let z=16;z<S.len*0.45;z+=10+Rw()*16){ const y=5.6+Rw()*2, L2=8+Rw()*14, pts=[]; for(let k=0;k<=8;k++){ const t=k/8; pts.push([X, y-0.5*4*t*(1-t), z+L2*t]); } pipe(T, m, mats.dark, null, pts, 0.01); } } }
  /* the ground: the left pavement, the road (asphalt), the promenade (paving), kerbs; the rails and the wires */
  const L=S.len, Lz=L/2;
  const SEG=Math.ceil((L+80)/10), slab=(x0, x1, mat, y=0)=>{ const geo=new T.BoxGeometry(x1-x0, 0.2, L+80, 1, 1, SEG), uv=geo.attributes.uv, p=geo.attributes.position; for(let i=0;i<uv.count;i++) uv.setXY(i, p.getX(i)/4+(x0+x1)/8, p.getZ(i)/4); m.put(geo, mat, null, (x0+x1)/2, y-0.1, Lz-40); };
  slab(S.left-16, S.kerbA, mats.pave, 0.14); slab(S.kerbA, S.kerbB, mats.asphalt, 0); slab(S.kerbB, S.opp+0.5, mats.prom, 0.14);
  for(const xk of [S.kerbA, S.kerbB]) m.put(new T.BoxGeometry(0.3, 0.22, L+80, 1, 1, SEG), mats.kerb, null, xk, 0.08, Lz-40);   // RAIN-5: segments along the street, so the bend bends them
  for(const xr of S.tracks) m.put(new T.BoxGeometry(0.08, 0.04, L+80, 1, 1, SEG), mats.rail, null, xr, 0.02, Lz-40);
  for(const xw of [(S.tracks[0]+S.tracks[1])/2, (S.tracks[2]+S.tracks[3])/2]) m.put(new T.CylinderGeometry(0.008, 0.008, L+80, 3, SEG), mats.dark, null, xw, S.wire, Lz-40, 0, Math.PI/2, 0);
  for(let z=10;z<L*0.7;z+=30) m.put(new T.CylinderGeometry(0.09, 0.11, S.wire+0.6, 6), mats.iron, null, S.kerbB-0.4, (S.wire+0.6)/2, z), m.put(new T.BoxGeometry(S.kerbB-S.tracks[0]+0.6, 0.06, 0.06), mats.iron, null, (S.kerbB+S.tracks[0])/2, S.wire+0.1, z);
  /* the plane trees: two rows between the road and the promenade (mottled trunks, crowns of leaf clusters) */
  /* RAIN-2: real plane trees (planeTree); o.oldTrees — the RAIN-1 crowns of spheres, kept only for the crown-cover CONTROL */
  if(o.oldTrees) for(const t of o.trees||[]){ const [x, , z]=t.p; m.put(new T.CylinderGeometry(0.22, 0.32, t.p[1]-1, 7), mats.bark, null, x, (t.p[1]-1)/2, z);
    for(let k=0;k<14;k++) m.put(new T.IcosahedronGeometry(t.r*(0.35+0.3*R()), 1), mats.crown[Math.floor(R()*mats.crown.length)], null, x+(R()-0.5)*t.r*1.4, t.p[1]+(R()-0.4)*t.r*0.8, z+(R()-0.5)*t.r*1.4); }
  else { const Rt=rngOf(KIT.seed^0x504C4E); for(const t of o.trees||[]) planeTree(T, m, mats, Rt, t); }
  /* the lamps (their heads glow; their light falls in warm pools on the wet ground) */
  for(const l of o.lamps||[]){ const [x, y, z]=l.p; m.put(new T.CylinderGeometry(0.07, 0.1, y, 6), mats.iron, null, x, y/2, z); m.put(new T.SphereGeometry(0.24, 12, 10), mats.lampHead, null, x, y, z);
    m.put(new T.CircleGeometry(4.2, 24), mats.pool, null, x, 0.16, z, 0, -Math.PI/2, 0); out.lamps.push([x, y, z]); }
  /* benches along the trees, the kiosk, the café terraces (awnings, tables, chairs, string lights) */
  for(let z=18;z<L*0.5;z+=19) m.put(new T.BoxGeometry(0.5, 0.08, 1.8), mats.wood, null, S.treeRows[1]+1.5, 0.45, z), m.put(new T.BoxGeometry(0.06, 0.45, 1.8), mats.wood, null, S.treeRows[1]+1.75, 0.68, z);
  { const kx=24, kz=58; m.put(new T.BoxGeometry(2.4, 2.6, 2.0), mats.kiosk, null, kx, 1.3, kz); m.put(new T.BoxGeometry(2.8, 0.15, 2.4), mats.roof, null, kx, 2.7, kz); m.put(new T.PlaneGeometry(1.8, 0.9), MOOD.shops>0.3 ? mats.shopLit : mats.shopDark, null, kx-1.21, 1.6, kz, -Math.PI/2); }
  for(const [a, c] of cafes){ const aw=KIT.awning[Math.floor(R()*KIT.awning.length)];
    for(let z=a+1.5;z<c-1.5;z+=3.2){ m.put(new T.BoxGeometry(3.8, 0.05, 3.0), mats.stripe[(Math.round(z/3.2))%2 ? 0 : 1], null, S.opp-1.9, 3.3, z, 0, 0, 0.18);   // the awning, striped by its panels
      if(!MOOD.terraces) continue;
      const tx=S.opp-2.6; m.put(new T.CylinderGeometry(0.35, 0.35, 0.04, 12), mats.table, null, tx, 0.75, z); m.put(new T.CylinderGeometry(0.03, 0.03, 0.72, 5), mats.iron, null, tx, 0.37, z);
      for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.4, 0.04, 0.4), mats.iron, null, tx+sd*0.55, 0.45, z);
      if(mood==='evening' && R()<0.75) personAt(m, T, mats, R, tx+0.55, z, { sit:true }); }
    if(MOOD.string) for(let z=a;z<c;z+=0.55){ const sag=0.25*Math.sin(Math.PI*((z-a)%6)/6); m.put(new T.SphereGeometry(0.06, 6, 4), mats.bulb, null, S.opp-3.7, 3.1-sag, z); } }
  /* the figures, by the mood: on the promenade, umbrellas open (Evening, Late night) or closed (After the rain); a couple under one umbrella, someone
     with a dog, the street musician's spot (a stool, a case and a lantern; the musician only in the Evening) */
  { const n=MOOD.people, inProm=()=>[S.treeRows[1]+2.5+R()*(S.opp-6-S.treeRows[1]-2.5), 16+Math.pow(R(), 1.4)*200];
    for(let k=0;k<n;k++){ const [x, z]=inProm(); personAt(m, T, mats, R, x, z, { umbrella:R()<MOOD.umbrellas, closed:MOOD.umbrellas===0 && R()<0.6 }); }
    if(n>3){ const [x, z]=inProm(); personAt(m, T, mats, R, x, z, { umbrella:MOOD.umbrellas>0 }); personAt(m, T, mats, R, x+0.42, z+0.1, {}); }   // a couple
    { const [x, z]=inProm(); personAt(m, T, mats, R, x, z, { umbrella:MOOD.umbrellas>0 }); dogAt(m, T, mats, x+0.6, z+0.8); }   // someone with a dog
    const mx=S.treeRows[1]+3.2, mz=44; m.put(new T.CylinderGeometry(0.2, 0.2, 0.45, 8), mats.wood, null, mx, 0.22, mz); m.put(new T.BoxGeometry(0.9, 0.12, 0.35), mats.dark, null, mx+0.7, 0.06, mz);
    m.put(new T.BoxGeometry(0.16, 0.24, 0.16), mats.lantern, null, mx-0.5, 0.12, mz);
    if(mood==='evening'){ personAt(m, T, mats, R, mx, mz, { sit:true }); m.put(new T.BoxGeometry(0.35, 0.12, 0.9), mats.wood, null, mx+0.15, 0.95, mz, 0, 0, 0.6); } }
  m.build(g);
  return { group:g, windows:out.windows, lamps:out.lamps, houses:out.houses };
}
/* THE BACKDROP: the sky (indigo high, the city's warm glow low, low clouds lit from below), the far roofs and the hills with the old town (houses,
   two domes, the fortress wall's lit line, the TV tower's red lights; no text) — every pixel cast by the law's own rays (pure/city.js rayOf, FAR,
   hillsAt), far things only, over the view-angle box x −EXT[0]…EXT[0], y −EXT[1]…EXT[1] at px pixels a unit. → { colour, depth } canvases; the depth
   is the law's (the sky 1). The bake lays them behind everything. */
export function backdropCanvas(EXT, px, look){
  const W=Math.round(2*EXT[0]*px), H=Math.round(2*EXT[1]*px), c=document.createElement('canvas'), d=document.createElement('canvas'); c.width=d.width=W; c.height=d.height=H;
  const x=c.getContext('2d'), y=d.getContext('2d'), R=rngOf(KIT.seed^0x5348), o=[CAM.x, CAM.y, CAM.z];
  const far=(u, v)=>{ const r=rayOf(u, v); if(r[2]<=0) return { kind:'sky', depth:1 };
    { const t=(FAR.z-o[2])/r[2], yy=o[1]+r[1]*t; if(yy<=FAR.roofs[0]+(FAR.roofs[1]-FAR.roofs[0])*(0.5+0.5*Math.sin(u*17+1.3)*Math.sin(u*5.1))) return { kind:'roofs', depth:depthOf(t) }; }
    { const t=(FAR.hillsZ-o[2])/r[2], yy=o[1]+r[1]*t; if(yy<=hillsAt(u)) return { kind:'hills', depth:depthOf(t), h:yy/hillsAt(u) }; }
    return { kind:'sky', depth:1 }; };
  const ci=x.createImageData(W, H), di=y.createImageData(W, H), hex=h=>[parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SKY=hex(look.sky), CL=hex(look.cloud), GL=hex(look.glow), HI=hex(look.hills), RF=hex(look.roofs), hor=vanishing().horizon;
  for(let j=0;j<H;j++){ const v=EXT[1]-(j+0.5)/px; for(let i=0;i<W;i++){ const u=-EXT[0]+(i+0.5)/px, f=far(u, v), k=(j*W+i)*4; let col;
      if(f.kind==='sky'){ const t=Math.max(0, Math.min(1, (v-hor)/0.45)), cl=0.5+0.5*Math.sin(u*3.1+v*9)*Math.sin(u*7.7-v*13), a=t<0.35 ? t/0.35 : 1, b=Math.max(0, (t-0.3)/0.7);
        col=[0, 1, 2].map(q=>{ const lo=GL[q]+(CL[q]-GL[q])*a; return lo+(SKY[q]-lo)*b+(GL[q]-lo)*0.16*cl*(1-t); }); }
      else if(f.kind==='hills'){ const sh=0.75+0.25*f.h; col=HI.map(q=>q*sh); }
      else col=RF.map(q=>q*(0.9+0.1*Math.sin(u*23+Math.sin(u*7))));
      ci.data[k]=col[0]; ci.data[k+1]=col[1]; ci.data[k+2]=col[2]; ci.data[k+3]=255; const dv=Math.round(f.depth*255); di.data[k]=di.data[k+1]=di.data[k+2]=dv; di.data[k+3]=255; } }
  x.putImageData(ci, 0, 0); y.putImageData(di, 0, 0);
  /* the old town on the slopes: small house shapes and lit specks, two domes, the fortress wall's line, the TV tower (drawn where the cast saw hills) */
  const top=u=>{ let lo=vanishing().horizon-0.05, hi=EXT[1]; for(let k=0;k<30;k++){ const m=(lo+hi)/2; if(far(u, m).kind==='sky') hi=m; else lo=m; } return lo; };
  const Xp=u=>(u+EXT[0])*px, Yp=v=>(EXT[1]-v)*px;
  x.fillStyle=look.town; for(let k=0;k<520;k++){ const u=-EXT[0]+2*EXT[0]*R(), tv=top(u), v=hor+(tv-hor)*(0.08+0.8*R()); if(far(u, v).kind!=='hills') continue; x.fillRect(Xp(u), Yp(v), (0.003+0.008*R())*px, (0.002+0.004*R())*px); }
  for(const u of [-0.42, 0.66]){ const tv=top(u), v=hor+(tv-hor)*0.45; x.beginPath(); x.arc(Xp(u), Yp(v), 0.01*px, Math.PI, 0); x.fill(); }
  { x.strokeStyle=look.wall; x.lineWidth=Math.max(1, 0.003*px); x.beginPath(); for(let u=-0.95;u<=-0.55;u+=0.01){ const v=hor+(top(u)-hor)*0.72; u<=-0.95 ? x.moveTo(Xp(u), Yp(v)) : x.lineTo(Xp(u), Yp(v)); } x.stroke(); }
  { const u=0.95, tv=top(u); x.fillStyle=look.town; x.fillRect(Xp(u), Yp(tv+0.08), Math.max(2, 0.003*px), 0.08*px); x.fillStyle='#ff3a2a'; for(const h of [0.025, 0.05, 0.08]) x.fillRect(Xp(u)-1, Yp(tv+h), Math.max(2, 0.005*px), Math.max(2, 0.003*px)); }
  return { colour:c, depth:d };
}
