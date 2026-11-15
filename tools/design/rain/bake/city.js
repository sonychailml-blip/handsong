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
import { STREET, BLOCKS, CAM, FAR, hillsAt, vanishing, rayOf, depthOf } from '../../../../apps/night/rooms/rain/pure/city.js';

const TAU=Math.PI*2;
export const KIT=Object.freeze({ seed:0x43495459, plaster:Object.freeze(['#c99f72', '#d2a48c', '#cbbf9a', '#9fae9a', '#a9b4c2', '#b88a6a', '#d8c7a8', '#c4a39a']),
  shutter:Object.freeze(['#3f5a46', '#5a4030', '#4a5664', '#6a5a3a']), cloth:Object.freeze(['#e8e2d4', '#c45a4a', '#5a7ab0', '#e0c060', '#7aa070', '#d890a8', '#f0f0f0']),
  umbrella:Object.freeze(['#20283a', '#7a2a2a', '#2a4a3a', '#c8a040', '#3a3a3a', '#5a3a6a', '#b04a30', '#1e4a6a']), awning:Object.freeze([['#7a2a2a', '#e8dcc0'], ['#2a4a3a', '#e8dcc0'], ['#1e3a5a', '#e0d4b8']]) });
const rngOf=seed=>{ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; };

/* ---------- merging: every static piece goes into one geometry per material (world coordinates) ---------- */
function merger(T){
  const by=new Map(), o=new T.Object3D();
  const add=(geo, mat, M)=>{ let a=by.get(mat); if(!a){ a=[]; by.set(mat, a); } const g=geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(M); a.push(g); geo.dispose(); };
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
  if(plasterImg && plasterImg.complete && plasterImg.width){ const p=x.createPattern(plasterImg, 'repeat'), s=2.5*PPM/plasterImg.width; x.save(); x.scale(s*sx/PPM, s*sy/PPM); x.fillStyle=p; x.fillRect(0, 0, c.width/(s*sx/PPM), c.height/(s*sy/PPM)); x.restore(); }
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
  for(const v of L.lines) for(let u=0.5;u<W;u+=1.2+R()*2.5) if(R()<0.6*L.wear+0.2) stain(u, v, 0.6+R()*1.8, 1+R()*3, 0.3+0.35*R());
  /* rust streaks under the balconies: thin orange-brown lines */
  for(const b of L.balconies) for(let k=0;k<5;k++){ const u=b[0]-b[2]/2+R()*b[2], len=0.6+R()*2.2, g=x.createLinearGradient(0, Y(b[1]), 0, Y(b[1]-len)); g.addColorStop(0, 'rgba(120,58,24,0.55)'); g.addColorStop(1, 'rgba(120,58,24,0)');
    x.fillStyle=g; x.fillRect(X(u), Y(b[1]), Math.max(1, 0.05*sx), len*sy); }
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

/* ---------- one house: a block of a row, built in its facade frame (u along the facade, v up, w out of the wall towards the street) ---------- */
function house(T, m, mats, img, side, bi, b, o, out){
  const R=rngOf(KIT.seed^(side==='opp' ? 0x1000 : 0x2000)^(bi*7919)), X=STREET[side], [z0, z1, eaves, mans]=b, W=z1-z0;
  /* opp faces −x: u → +z; left faces +x: u → −z (the frame is turned, never mirrored) */
  const P=new T.Matrix4().makeRotationY(side==='opp' ? -Math.PI/2 : Math.PI/2).premultiply(new T.Matrix4().makeTranslation(X, 0, side==='opp' ? z0 : z1));
  const ground=4.4+R()*0.7, floorH=3.4+R()*0.5, bay=3.3+R()*1.0, n=Math.max(2, Math.floor(W/bay)), bw=W/n, floors=Math.max(2, Math.floor((eaves-ground-0.8)/floorH));
  const top=ground+floors*floorH, tint=KIT.plaster[Math.floor(R()*KIT.plaster.length)], shape=Math.floor(R()*3), winW=Math.min(1.5, bw*0.42), winH=Math.min(2.5, floorH*0.66), sill=0.8;
  const wear=0.4+R()*0.9, wooden=R()<0.35, iron=!wooden && R()<0.7, mansard=mans>0 && R()<0.75, cafe=side==='opp' && o.cafes.some(([a, c])=>z0<c && z1>a);
  const lines=[ground-0.05, top], balconies=[];
  for(let f=1;f<floors;f++) lines.push(ground+f*floorH-0.2);
  /* the wall with its windows cut through */
  const archP=(p, x0, y0, w, h)=>{ if(shape===0){ const r=w/2, yc=y0+h-r; p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, yc); p.absarc(x0+r, yc, r, 0, Math.PI, false); p.lineTo(x0, y0); }
    else if(shape===2){ p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, y0+h-0.25); p.quadraticCurveTo(x0+w/2, y0+h+0.12, x0, y0+h-0.25); p.lineTo(x0, y0); }
    else { p.moveTo(x0, y0); p.lineTo(x0+w, y0); p.lineTo(x0+w, y0+h); p.lineTo(x0, y0+h); p.lineTo(x0, y0); } return p; };
  const s=new T.Shape(); s.moveTo(0, ground); s.lineTo(W, ground); s.lineTo(W, top); s.lineTo(0, top); s.lineTo(0, ground);
  const wins=[]; for(let k=0;k<n;k++) for(let f=0;f<floors;f++){ const xc=(k+0.5)*bw, y0=ground+f*floorH+sill; s.holes.push(archP(new T.Path(), xc-winW/2, y0, winW, winH)); wins.push({ k, f, xc, y0 }); }
  /* balconies first (their places go into the canvas's rust streaks) */
  const balc=new Set(); for(const w of wins){ if(w.f===floors-1) continue; const on= wooden ? (w.k%3===1 && w.f<2) : iron ? (w.f===0 || (w.f===1 && w.k%2===0)) : false; if(on){ balc.add(w); balconies.push([w.xc, w.y0-0.15, winW+0.9]); } }
  const L={ tint, ground, lines, balconies, wear, graffiti: R()<0.7 ? 2+Math.floor(R()*4) : 0 };
  const facade=new T.MeshStandardMaterial({ map:facadeCanvas(T, img.plaster, top+1, W, L, R), roughness:0.95, metalness:0 });
  { const g=new T.ExtrudeGeometry(s, { depth:0.5, bevelEnabled:false, curveSegments:10 }); const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i, p.getX(i)/W, p.getY(i)/(top+1)); m.put(g, facade, P, 0, 0, -0.5); }
  /* the ground floor: stone, shop openings (warm when the shop is open), a café's terrace on the opp side */
  { const gs=new T.Shape(); gs.moveTo(0, 0); gs.lineTo(W, 0); gs.lineTo(W, ground); gs.lineTo(0, ground); gs.lineTo(0, 0); const shops=[];
    for(let k=0;k<n;k++){ const w=bw*0.62, x0=(k+0.5)*bw-w/2; gs.holes.push(archP(new T.Path(), x0, 0.3, w, ground-0.9)); shops.push([x0, w]); }
    const g=new T.ExtrudeGeometry(gs, { depth:0.62, bevelEnabled:false, curveSegments:10 }); const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i, p.getX(i)/W, p.getY(i)/(top+1)); m.put(g, facade, P, 0, 0, -0.5);
    for(const [x0, w] of shops){ const open=o.shopOpen(R); m.put(new T.PlaneGeometry(w, ground-0.9), open ? mats.shopLit : mats.shopDark, P, x0+w/2, 0.3+(ground-0.9)/2, -0.35); m.put(new T.PlaneGeometry(w, ground-0.9), mats.glass, P, x0+w/2, 0.3+(ground-0.9)/2, -0.2); } }
  /* the cornice, string courses and pilasters (trim), the roof */
  m.put(new T.BoxGeometry(W+0.4, 0.55, 0.9), mats.trim, P, W/2, top+0.28, 0.25); m.put(new T.BoxGeometry(W+0.2, 0.25, 0.4), mats.trim, P, W/2, ground-0.1, 0.1);
  for(let f=1;f<floors;f++) m.put(new T.BoxGeometry(W, 0.16, 0.18), mats.trim, P, W/2, ground+f*floorH-0.2, 0.06);
  for(let k=0;k<=n;k++) m.put(new T.BoxGeometry(0.36, top-ground, 0.1), mats.trim, P, k*bw, (top+ground)/2, 0.05);
  if(mansard){ const g=new T.CylinderGeometry(0.5, 1, 1, 4, 1); m.put(g, mats.roof, P, W/2, top+0.55+mans/2, -6, Math.PI/4, 0, 0, W*0.71, mans, 9);
    for(let k=0;k<n;k+=2) m.put(new T.BoxGeometry(1.1, 1.4, 1.2), mats.roof, P, (k+0.5)*bw, top+1.3, -0.9), m.put(new T.PlaneGeometry(0.7, 0.8), R()<0.3*o.litShare ? mats.dormerLit : mats.shopDark, P, (k+0.5)*bw, top+1.25, -0.28); }
  else { m.put(new T.BoxGeometry(W, 0.9, 0.3), mats.trim, P, W/2, top+0.95, 0.05);
    if(R()<0.5){ const tx=W*(0.2+0.6*R()); m.put(new T.CylinderGeometry(0.3, 0.25, 0.5, 8), mats.pot, P, tx, top+1.1, -2); m.put(new T.CylinderGeometry(0.06, 0.08, 1.6, 5), mats.bark, P, tx, top+2, -2);   // a small tree on a roof terrace
      for(let k=0;k<7;k++) m.put(new T.IcosahedronGeometry(0.55+0.3*R(), 0), mats.leaf[Math.floor(R()*4)], P, tx+(R()-0.5)*1.1, top+2.9+R()*0.6, -2+(R()-0.5)*1.1); } }
  for(let k=0;k<Math.round(W/9);k++){ const u=R()*W, d=-2-R()*6; m.put(new T.BoxGeometry(0.7, 1.5, 0.7), mats.chimney, P, u, top+(mansard ? mans : 0.6)+0.7, d);
    if(R()<0.4) m.put(new T.CylinderGeometry(0.015, 0.015, 2.4, 4), mats.dark, P, u+0.6, top+(mansard ? mans : 0.6)+1.4, d);
    if(R()<0.25){ m.put(new T.CylinderGeometry(0.7, 0.7, 1.4, 10), mats.tank, P, u+2, top+(mansard ? mans : 0.6)+1.2, d-1.5); } }
  /* a climbing vine on some houses: green up the wall from the ground */
  if(R()<0.3){ let u=W*(0.1+0.8*R()), v=0.4; for(let k=0;k<60 && v<top-1;k++){ m.put(new T.IcosahedronGeometry(0.22+0.15*R(), 0), mats.leaf[Math.floor(R()*4)], P, u, v, 0.12); u+=(R()-0.5)*0.6; v+=0.12+R()*0.18; } }
  /* the windows: frame, glass, the room behind (curtains, a life when lit — its place in the lives' atlas), shutters, sills, window boxes */
  for(const w of wins){ const { xc, y0 }=w;
    m.put(new T.BoxGeometry(winW+0.36, 0.12, 0.3), mats.trim, P, xc, y0-0.06, 0.12);
    if(shape===1) m.put(new T.BoxGeometry(winW+0.5, 0.18, 0.22), mats.trim, P, xc, y0+winH+0.25, 0.08);
    m.put(new T.BoxGeometry(0.06, winH, 0.06), mats.frame, P, xc, y0+winH/2, -0.3); m.put(new T.BoxGeometry(winW, 0.06, 0.06), mats.frame, P, xc, y0+winH*0.68, -0.3);
    const id=out.windows.length, life=Math.floor(R()*8), amb=R(), warm=R();
    /* the room's back: a plane with UVs into the lives' atlas (4 × 2 cells), dark or lit by the bake's pass */
    { const g=new T.PlaneGeometry(winW*1.05, winH*1.05), uv=g.attributes.uv, cu=(life%4)/4, cv=Math.floor(life/4)/2; for(let i=0;i<uv.count;i++) uv.setXY(i, cu+uv.getX(i)/4, cv+uv.getY(i)/2); m.put(g, mats.life, P, xc, y0+winH/2, -0.55); }
    if(R()<0.3*wear+0.1){ const open=0.4+R()*0.9, c=mats.shut[Math.floor(R()*mats.shut.length)];   // shutters half open
      for(const sd of [-1, 1]) m.put(new T.BoxGeometry(winW/2, winH, 0.04), c, P, xc+sd*(winW/2+Math.cos(open)*winW/4), y0+winH/2, Math.sin(open)*winW/4, sd*open); }
    if(!balc.has(w) && R()<0.18){ m.put(new T.BoxGeometry(winW+0.2, 0.25, 0.3), mats.pot, P, xc, y0+0.06, 0.32); plantAt(m, T, P, mats, R, xc, y0+0.3, 0.32, 1.2); }   // a window box
    const C=[[xc-winW/2, y0], [xc+winW/2, y0], [xc-winW/2, y0+winH], [xc+winW/2, y0+winH]].map(([u, v])=>new T.Vector3(u, v, -0.3).applyMatrix4(P));
    out.windows.push({ id, side, block:bi, bay:w.k, floor:w.f, corners:C.map(p=>[p.x, p.y, p.z]), centre:new T.Vector3(xc, y0+winH/2, -0.3).applyMatrix4(P).toArray(), life, amb, warm }); }
  /* balconies: iron (a slab, a railing with curls) or an enclosed wooden one (Tbilisi: a glazed box on brackets); people's things on some */
  for(const w of balc){ const { xc, y0 }=w, bwid=winW+0.9, d= wooden ? 1.1 : 0.95, y=y0-0.12;
    m.put(new T.BoxGeometry(bwid+0.2, 0.16, d), mats.trim, P, xc, y-0.08, d/2);
    if(wooden){ m.put(new T.BoxGeometry(bwid, 2.3, 0.06), mats.wood, P, xc, y+1.15, d); for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.06, 2.3, d), mats.wood, P, xc+sd*bwid/2, y+1.15, d/2);
      for(let k=0;k<5;k++) m.put(new T.PlaneGeometry(bwid/5-0.08, 1.0), R()<o.litShare ? mats.paneLit : mats.glass, P, xc-bwid/2+(k+0.5)*bwid/5, y+1.55, d+0.04); m.put(new T.BoxGeometry(bwid+0.2, 0.12, d+0.15), mats.wood, P, xc, y+2.35, d/2); }
    else { m.put(new T.BoxGeometry(bwid, 0.05, 0.05), mats.iron, P, xc, y+1.0, d); for(let k=0;k<=Math.round(bwid/0.25);k++) m.put(new T.BoxGeometry(0.02, 0.9, 0.02), mats.iron, P, xc-bwid/2+k*bwid/Math.round(bwid/0.25), y+0.55, d);
      for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.04, 0.04, d), mats.iron, P, xc+sd*bwid/2, y+1.0, d/2);
      const r=R();
      if(r<0.22) for(let k=0;k<3;k++){ m.put(new T.CylinderGeometry(0.14, 0.1, 0.3, 8), mats.pot, P, xc-0.6+k*0.6, y+0.15, d-0.25); plantAt(m, T, P, mats, R, xc-0.6+k*0.6, y+0.45, d-0.25, 0.8); }   // pots
      else if(r<0.32){ for(const sd of [-1, 1]) m.put(new T.TorusGeometry(0.3, 0.025, 6, 16), mats.dark, P, xc+sd*0.5, y+0.33, d-0.3); m.put(new T.BoxGeometry(1.0, 0.04, 0.04), mats.bike, P, xc, y+0.5, d-0.3, 0, 0, 0.3); }   // a bicycle
      else if(r<0.45){ for(const sd of [-1, 1]) m.put(new T.BoxGeometry(0.42, 0.04, 0.42), mats.wood, P, xc+sd*0.45, y+0.45, d-0.35), m.put(new T.BoxGeometry(0.42, 0.45, 0.04), mats.wood, P, xc+sd*0.45, y+0.68, d-0.15); }   // two chairs
      else if(r<0.52) m.put(new T.BoxGeometry(0.16, 0.24, 0.16), mats.lantern, P, xc+bwid/2-0.2, y+1.2, d-0.1);   // a lantern
      if(R()<0.22){ const ly=y+1.9; m.put(new T.CylinderGeometry(0.006, 0.006, bwid, 3), mats.dark, P, xc, ly, d-0.05, 0, 0, Math.PI/2);   // laundry on a line
        for(let k=0;k<4;k++) m.put(new T.PlaneGeometry(0.32+R()*0.2, 0.45+R()*0.3), mats.cloth[Math.floor(R()*mats.cloth.length)], P, xc-bwid/2+0.3+k*(bwid-0.6)/3, ly-0.3, d-0.05); } } }
  return { cafe, top, z0, z1 };
}

/* ---------- the city ---------- */
/* mats: the bake's materials; img: { plaster } (the CC0 plaster image); o: { mood: 'late' | 'evening' | 'after' } */
export function buildCity(T, mats, img, o={}){
  const mood=o.mood||'late', MOOD={ late:{ people:4, terraces:false, string:false, litShare:0.12, shops:0.15, umbrellas:0.5 }, evening:{ people:46, terraces:true, string:true, litShare:0.42, shops:0.85, umbrellas:0.85 },
    after:{ people:10, terraces:true, string:true, litShare:0.2, shops:0.4, umbrellas:0 } }[mood];
  const g=new T.Group(), m=merger(T), out={ windows:[], lamps:[] }, S=STREET, R=rngOf(KIT.seed^0x5354);
  const cafes=[[40, 66], [98, 138]];
  const oo={ cafes, litShare:MOOD.litShare, shopOpen:r=>r()<MOOD.shops };
  /* the houses of both rows */
  for(const side of ['opp', 'left']) BLOCKS[side].forEach((b, bi)=>{ if(b[0]>S.len*0.75) return; house(T, m, mats, img, side, bi, b, oo, out); });
  /* the ground: the left pavement, the road (asphalt), the promenade (paving), kerbs; the rails and the wires */
  const L=S.len, Lz=L/2;
  const slab=(x0, x1, mat, y=0)=>{ const geo=new T.BoxGeometry(x1-x0, 0.2, L+80), uv=geo.attributes.uv, p=geo.attributes.position; for(let i=0;i<uv.count;i++) uv.setXY(i, p.getX(i)/4+(x0+x1)/8, p.getZ(i)/4); m.put(geo, mat, null, (x0+x1)/2, y-0.1, Lz-40); };
  slab(S.left-16, S.kerbA, mats.pave, 0.14); slab(S.kerbA, S.kerbB, mats.asphalt, 0); slab(S.kerbB, S.opp+0.5, mats.prom, 0.14);
  for(const xk of [S.kerbA, S.kerbB]) m.put(new T.BoxGeometry(0.3, 0.22, L+80), mats.kerb, null, xk, 0.08, Lz-40);
  for(const xr of S.tracks) m.put(new T.BoxGeometry(0.08, 0.04, L+80), mats.rail, null, xr, 0.02, Lz-40);
  for(const xw of [(S.tracks[0]+S.tracks[1])/2, (S.tracks[2]+S.tracks[3])/2]) m.put(new T.CylinderGeometry(0.008, 0.008, L+80, 3), mats.dark, null, xw, S.wire, Lz-40, 0, Math.PI/2, 0);
  for(let z=10;z<L*0.7;z+=30) m.put(new T.CylinderGeometry(0.09, 0.11, S.wire+0.6, 6), mats.iron, null, S.kerbB-0.4, (S.wire+0.6)/2, z), m.put(new T.BoxGeometry(S.kerbB-S.tracks[0]+0.6, 0.06, 0.06), mats.iron, null, (S.kerbB+S.tracks[0])/2, S.wire+0.1, z);
  /* the plane trees: two rows between the road and the promenade (mottled trunks, crowns of leaf clusters) */
  for(const t of o.trees||[]){ const [x, , z]=t.p; m.put(new T.CylinderGeometry(0.22, 0.32, t.p[1]-1, 7), mats.bark, null, x, (t.p[1]-1)/2, z);
    for(let k=0;k<14;k++) m.put(new T.IcosahedronGeometry(t.r*(0.35+0.3*R()), 1), mats.crown[Math.floor(R()*mats.crown.length)], null, x+(R()-0.5)*t.r*1.4, t.p[1]+(R()-0.4)*t.r*0.8, z+(R()-0.5)*t.r*1.4); }
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
  return { group:g, windows:out.windows, lamps:out.lamps };
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
