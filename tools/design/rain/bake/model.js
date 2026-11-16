/* RAIN-0b: THE BAKED CITY's MODEL — procedural Art Nouveau architecture built by code (our own design; Tbilisi-inspired, no real building copied,
   no text, no brands), for the offline bake (tools/rain-bake.mjs → bake.html). Dev tool: never shipped, never loaded by the app.
   The FACADE FRAME: X along the facade (the bays), Y up, Z out of the wall towards the street (the wall's outer face at Z = 0; the street at Z > 0).
   This run builds THE LOOK TEST's piece: a facade of `bays` bays — a rusticated ground floor with arched shop openings, three floors of tall arched
   windows with surrounds and keystones, pilasters with capitals, string courses, a main cornice on brackets, wrought-iron balconies with
   whiplash curls, stucco panels — and a piece of street (pavement, kerb, asphalt, tram rails, a lamp). PLAN.md slice 1 grows this into the whole
   boulevard (neighbours, roofs with mansards, chimneys, the old town on the hills). Materials are CC0 PBR textures (tools/design/rain/tex/). */
export const FACADE=Object.freeze({ bay:4.2, ground:4.8, floor:3.9, floors:3, wall:0.55, winW:1.5, winH:2.55, sill:0.75, cornice:1.1, pavement:4.2, road:11, rails:Object.freeze([7.0, 8.45, 10.3, 11.75]) });

/* T the THREE namespace; M the materials ({ plaster, stone, trim, iron, glass, frame, asphalt, pave, kerb, rail, lampHead, interior(i) }); lives: per window
   (index) an interior material or null (dark). → { group, windows: [{ i, bay, floor, corners (world, after the group's placement) }], lamps: [world positions] } */
export function buildFacade(T, M, o={}){
  const F=FACADE, bays=o.bays||5, W=bays*F.bay, g=new T.Group(), wins=[], lamps=[];
  const mesh=(geo, mat, x=0, y=0, z=0)=>{ const m=new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow=true; m.receiveShadow=true; g.add(m); return m; };
  const box=(w, h, d, mat, x, y, z)=>mesh(new T.BoxGeometry(w, h, d), mat, x, y, z);
  /* a planar UV in metres (so a texture repeats by size, not by face) */
  const uvWorld=(geo, s=1)=>{ geo.computeBoundingBox(); const p=geo.attributes.position, n=geo.attributes.normal, uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)), ay=Math.abs(n.getY(i)), az=Math.abs(n.getZ(i)), x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const [u, v]= ay>ax && ay>az ? [x, z] : ax>az ? [z, y] : [x, y]; uv[i*2]=u*s; uv[i*2+1]=v*s; } geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); return geo; };
  const arch=(path, x0, y0, w, h, hole=false)=>{ const r=w/2, yc=y0+h-r; path.moveTo(x0, y0); path.lineTo(x0+w, y0); path.lineTo(x0+w, yc); path.absarc(x0+r, yc, r, 0, Math.PI, false); path.lineTo(x0, y0); return path; };
  const extrude=(shape, depth)=>uvWorld(new T.ExtrudeGeometry(shape, { depth, bevelEnabled:false, curveSegments:24 }), 0.45);

  /* THE UPPER WALL: one plaster slab with the arched windows cut through (their reveals are the slab's own sides) */
  const yUp=F.ground, Htop=F.ground+F.floors*F.floor;
  { const s=new T.Shape(); s.moveTo(0, yUp); s.lineTo(W, yUp); s.lineTo(W, Htop); s.lineTo(0, Htop); s.lineTo(0, yUp);
    for(let b=0;b<bays;b++) for(let f=0;f<F.floors;f++){ const x0=b*F.bay+(F.bay-F.winW)/2, y0=yUp+f*F.floor+F.sill; s.holes.push(arch(new T.Path(), x0, y0, F.winW, F.winH)); }
    mesh(extrude(s, F.wall), M.plaster, 0, 0, -F.wall); }
  /* THE GROUND FLOOR: rusticated stone with tall arched shop openings, set a little forward */
  { const s=new T.Shape(); s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, yUp); s.lineTo(0, yUp); s.lineTo(0, 0);
    for(let b=0;b<bays;b++){ const w=F.bay*0.62, x0=b*F.bay+(F.bay-w)/2; s.holes.push(arch(new T.Path(), x0, 0.35, w, yUp-0.9)); }
    mesh(extrude(s, F.wall+0.12), M.stone, 0, 0, -F.wall);
    for(let k=1;k<6;k++) box(W, 0.035, 0.06, M.stoneDark, W/2, k*yUp/6, 0.13);   // the rustication's grooves catch the light from below
    for(let b=0;b<bays;b++){ const w=F.bay*0.62, x0=b*F.bay+(F.bay-w)/2;   // the shopfronts: a dark glass, a frame, a keystone
      box(w, yUp-0.9, 0.05, M.glass, x0+w/2, 0.35+(yUp-0.9)/2, -0.25); box(0.5, 0.75, 0.25, M.stone, x0+w/2, yUp-0.4, 0.18); } }
  /* THE WINDOWS: frame, mullion, transom, glass, a room behind (dark, or a life), a surround with a keystone, a stucco panel below */
  for(let b=0;b<bays;b++) for(let f=0;f<F.floors;f++){
    const i=b*F.floors+f, xc=b*F.bay+F.bay/2, x0=xc-F.winW/2, y0=yUp+f*F.floor+F.sill, r=F.winW/2, yc=y0+F.winH-r, zg=-0.32;
    { const sh=arch(new T.Shape(), x0, y0, F.winW, F.winH); mesh(new T.ShapeGeometry(sh, 24), M.glass, 0, 0, zg); }
    box(0.07, F.winH, 0.08, M.frame, xc, y0+F.winH/2, zg+0.03); box(F.winW, 0.07, 0.08, M.frame, xc, yc, zg+0.03);
    { const ring=new T.Shape(); arch(ring, x0-0.06, y0-0.02, F.winW+0.12, F.winH+0.08); ring.holes.push(arch(new T.Path(), x0, y0, F.winW, F.winH)); mesh(extrude(ring, 0.08), M.frame, 0, 0, zg-0.02); }
    /* the room: a deep box behind the glass; its back wall carries the life (or stays dark) */
    { const life=o.lives && o.lives[i], back=new T.Mesh(new T.PlaneGeometry(F.winW*1.6, F.winH*1.3), life || M.roomDark); back.position.set(xc, y0+F.winH*0.55, -2.45);   // in front of the room box's back face (no z-fight) g.add(back);
      const side=new T.Mesh(new T.BoxGeometry(F.winW*1.6, F.winH*1.4, 2.2), life ? M.roomLit : M.roomWalls); side.position.set(xc, y0+F.winH*0.55, -1.5); g.add(side);   // a lit room's walls glow with its lamp
      wins.push({ i, bay:b, floor:f, xc, y0, w:F.winW, h:F.winH, lit:!!life }); }
    /* the surround: an architrave ring standing proud of the wall, a keystone, a sill with brackets */
    { const ring=new T.Shape(); arch(ring, x0-0.22, y0-0.05, F.winW+0.44, F.winH+0.27); ring.holes.push(arch(new T.Path(), x0-0.04, y0, F.winW+0.08, F.winH+0.04)); mesh(extrude(ring, 0.1), M.trim, 0, 0, 0); }
    { const k=new T.Shape(); k.moveTo(-0.17, 0); k.lineTo(0.17, 0); k.lineTo(0.24, 0.5); k.lineTo(-0.24, 0.5); k.lineTo(-0.17, 0); mesh(extrude(k, 0.2), M.trim, xc, yc+r-0.02, 0); }
    box(F.winW+0.5, 0.12, 0.28, M.trim, xc, y0-0.06, 0.12); for(const s of [-1, 1]) box(0.14, 0.3, 0.22, M.trim, xc+s*(F.winW/2+0.08), y0-0.27, 0.1);
    /* a stucco panel under the window: a whiplash curve and two buds (Art Nouveau), raised from the plaster */
    if(f>0){ const curve=new T.CatmullRomCurve3([[-0.55, -0.42], [-0.3, -0.2], [0, -0.38], [0.28, -0.18], [0.55, -0.4]].map(([u, v])=>new T.Vector3(xc+u, y0+v, 0.03)));
      mesh(new T.TubeGeometry(curve, 40, 0.035, 6, false), M.trim);
      for(const s of [-1, 1]){ const sp=new T.CatmullRomCurve3(Array.from({ length:14 }, (_, k)=>{ const a=k*0.55, rr=0.13*(1-k/16); return new T.Vector3(xc+s*(0.62-rr*Math.cos(a)), y0-0.3+rr*Math.sin(a), 0.03); }));
        mesh(new T.TubeGeometry(sp, 30, 0.026, 6, false), M.trim); } }
  }
  /* PILASTERS between the bays, with capitals under each string course */
  for(let b=0;b<=bays;b++){ const x=b*F.bay; box(0.42, Htop-yUp, 0.14, M.plaster, x, yUp+(Htop-yUp)/2, 0.07);
    for(let f=1;f<=F.floors;f++){ const y=yUp+f*F.floor-0.35; box(0.58, 0.12, 0.24, M.trim, x, y, 0.11); box(0.5, 0.18, 0.2, M.trim, x, y-0.13, 0.09); } }
  /* STRING COURSES: a moulded band between the floors (a profile swept along the facade) */
  const band=(y, deep, tall, mat)=>{ const p=new T.Shape(); p.moveTo(0, 0); p.lineTo(deep*0.35, 0); p.lineTo(deep*0.35, tall*0.25); p.quadraticCurveTo(deep, tall*0.4, deep, tall); p.lineTo(0, tall); p.lineTo(0, 0);
    const geo=new T.ExtrudeGeometry(p, { depth:W+0.6, bevelEnabled:false, curveSegments:10 }); uvWorld(geo, 0.45); const m=new T.Mesh(geo, mat); m.rotation.y=-Math.PI/2; m.position.set(W+0.3, y, 0); m.castShadow=m.receiveShadow=true; g.add(m); };
  band(yUp-0.05, 0.38, 0.42, M.trim); for(let f=1;f<F.floors;f++) band(yUp+f*F.floor-0.2, 0.2, 0.24, M.trim);
  /* THE MAIN CORNICE: a deep moulding on brackets, a parapet with balusters above */
  band(Htop, 0.85, F.cornice*0.6, M.trim); box(W+0.6, 0.12, 0.95, M.trim, W/2, Htop+F.cornice*0.6+0.06, 0.47);
  for(let x=0.35;x<W;x+=0.7){ const p=new T.Shape(); p.moveTo(0, 0); p.lineTo(0.6, 0); p.quadraticCurveTo(0.2, -0.05, 0.12, -0.42); p.lineTo(0, -0.42); p.lineTo(0, 0);
    const geo=new T.ExtrudeGeometry(p, { depth:0.16, bevelEnabled:false, curveSegments:8 }); const m=new T.Mesh(geo, M.trim); m.rotation.y=-Math.PI/2; m.position.set(x-0.08, Htop+0.02, 0); m.castShadow=m.receiveShadow=true; g.add(m); }
  box(W, 0.9, 0.3, M.plaster, W/2, Htop+F.cornice*0.6+0.57, 0.1);
  /* BALCONIES on the first and second upper floors (every bay on the first, the middle one on the second): a slab on consoles and a wrought-iron
     railing — rails, posts, and whiplash curls between them */
  const railing=(xc, y, w, d)=>{ const z=d, top=y+1.0;
    box(w, 0.05, 0.05, M.iron, xc, top, z); box(w, 0.04, 0.04, M.iron, xc, y+0.12, z); for(const s of [-1, 1]){ box(0.04, 0.04, d, M.iron, xc+s*w/2, top, d/2); box(0.04, 0.04, d, M.iron, xc+s*w/2, y+0.12, d/2); box(0.04, 1, 0.04, M.iron, xc+s*w/2, y+0.55, z); }
    const n=Math.round(w/0.42); for(let k=0;k<n;k++){ const xk=xc-w/2+(k+0.5)*w/n; box(0.025, 0.88, 0.025, M.iron, xk, y+0.56, z);
      for(const s of [-1, 1]){ const pts=Array.from({ length:16 }, (_, q)=>{ const a=q*0.62, rr=0.11*(1-q/18); return new T.Vector3(xk+s*(0.1-rr*Math.cos(a))*0.9, y+0.56+s*0.12+rr*Math.sin(a)*s, z); });
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.011, 4, false), M.iron); } } };
  for(let b=0;b<bays;b++) for(let f=0;f<2;f++){ if(f===1 && b!==Math.floor(bays/2)) continue; const xc=b*F.bay+F.bay/2, y=yUp+f*F.floor+F.sill-0.12, w=F.winW+0.9, d=0.95;
    box(w+0.2, 0.16, d+0.1, M.trim, xc, y-0.08, (d+0.1)/2); box(w+0.3, 0.06, d+0.2, M.trim, xc, y+0.0, (d+0.2)/2);
    for(const s of [-1, 1]){ const p=new T.Shape(); p.moveTo(0, 0); p.lineTo(d, 0); p.quadraticCurveTo(0.25, -0.1, 0.1, -0.55); p.lineTo(0, -0.55); p.lineTo(0, 0);
      const geo=new T.ExtrudeGeometry(p, { depth:0.18, bevelEnabled:false, curveSegments:8 }); const m=new T.Mesh(geo, M.trim); m.rotation.y=-Math.PI/2; m.position.set(xc+s*(w/2-0.15)-0.09, y-0.16, 0); m.castShadow=m.receiveShadow=true; g.add(m); }
    railing(xc, y, w, d); }
  /* THE STREET: pavement slabs, a stone kerb, wet asphalt, two tram tracks (rails), the overhead wires, a lamp on the pavement */
  { const L=W+60, x0=-30;
    const pv=new T.Mesh(uvWorld(new T.BoxGeometry(L, 0.16, F.pavement), 0.5), M.pave); pv.position.set(x0+L/2, 0.08, F.pavement/2); pv.receiveShadow=true; g.add(pv);
    box(L, 0.2, 0.25, M.kerb, x0+L/2, 0.07, F.pavement+0.12);
    const rd=new T.Mesh(uvWorld(new T.BoxGeometry(L, 0.05, F.road+30), 0.25), M.asphalt); rd.position.set(x0+L/2, -0.03, F.pavement+0.25+(F.road+30)/2); rd.receiveShadow=true; rd.userData.wet=1; g.add(rd);
    for(const z of F.rails){ const r=box(L, 0.04, 0.07, M.rail, x0+L/2, 0.012, F.pavement+0.25+z); r.castShadow=false; }
    for(const z of [7.7, 11.0]){ const c=new T.Mesh(new T.CylinderGeometry(0.006, 0.006, L, 4), M.wire||M.iron); c.rotation.z=Math.PI/2; c.position.set(x0+L/2, 6.3, F.pavement+0.25+z); g.add(c); }
    for(const xl of [W*0.3, W+8, -9]){ const z=F.pavement-0.55; box(0.12, 6.4, 0.12, M.iron, xl, 3.2, z); box(0.07, 0.07, 1.1, M.iron, xl, 6.35, z+0.5);
      const head=new T.Mesh(new T.SphereGeometry(0.2, 16, 12), M.lampHead); head.position.set(xl, 6.1, z+1.0); g.add(head); lamps.push([xl, 5.95, z+1.0]); } }
  return { group:g, windows:wins, lamps, width:W, height:Htop+F.cornice+1 };
}

/* THE LIVES: small interiors drawn by our own 2D code on a canvas (lamp behind a curtain, a reader, someone cooking, a cat on the sill, a plant, a
   TV's blue flicker) — the back wall of a lit room. kind 0…5 → a canvas */
export function lifeCanvas(kind, seed=1, v={}){   // RAIN-5b: v { temp warm | white | dim, cur side | blind | sheer | drape | none, col 0…5 }
  const c=document.createElement('canvas'); c.width=256; c.height=384; const x=c.getContext('2d'), W=256, H=384, R=(()=>{ let s=seed*9301+49297; return ()=>((s=(s*9301+49297)%233280)/233280); })();
  const tv=kind===5, wall=tv ? ['#20263a', '#3a4a6e'] : v.temp==='white' ? ['#3e3c38', '#e6e0cf'] : v.temp==='dim' ? ['#2a1e14', '#8a6038'] : ['#5a3a22', '#e3a45e'];
  let gr=x.createRadialGradient(W*0.55, H*0.42, 10, W*0.5, H*0.5, H*0.75); gr.addColorStop(0, wall[1]); gr.addColorStop(1, wall[0]); x.fillStyle=gr; x.fillRect(0, 0, W, H);
  x.fillStyle='rgba(40,22,12,0.55)'; x.fillRect(0, H*0.78, W, H*0.22);   // the floor and the furniture's shadow
  const lamp=(lx, ly, rr)=>{ const g2=x.createRadialGradient(lx, ly, 2, lx, ly, rr); g2.addColorStop(0, 'rgba(255,236,190,1)'); g2.addColorStop(0.25, 'rgba(255,200,120,0.6)'); g2.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle=g2; x.fillRect(lx-rr, ly-rr, 2*rr, 2*rr);
    x.fillStyle='#f6d9a4'; x.beginPath(); x.moveTo(lx-18, ly-6); x.lineTo(lx+18, ly-6); x.lineTo(lx+11, ly-30); x.lineTo(lx-11, ly-30); x.fill(); };
  x.fillStyle='#1a120c';
  if(kind===0){ lamp(W*0.5, H*0.45, 150); }
  else if(kind===1){ lamp(W*0.25, H*0.38, 120); x.beginPath(); x.ellipse(W*0.6, H*0.52, 22, 26, 0, 0, 7); x.fill(); x.fillRect(W*0.5, H*0.56, 70, 80); x.fillRect(W*0.4, H*0.66, 120, 40);   // a reader in an armchair
    x.fillStyle='#f3ead8'; x.fillRect(W*0.48, H*0.6, 30, 20); }
  else if(kind===2){ lamp(W*0.7, H*0.25, 130); x.fillStyle='#2a1a10'; x.fillRect(0, H*0.62, W, 14); x.fillStyle='#1a120c'; x.beginPath(); x.ellipse(W*0.42, H*0.4, 18, 22, 0, 0, 7); x.fill(); x.fillRect(W*0.34, H*0.45, 36, 90);   // someone at the stove
    x.fillStyle='rgba(255,255,255,0.18)'; for(let k=0;k<5;k++){ x.beginPath(); x.ellipse(W*0.6+R()*20, H*0.5-k*18, 10, 14, 0, 0, 7); x.fill(); } }
  else if(kind===3){ lamp(W*0.5, H*0.3, 140); x.beginPath(); x.ellipse(W*0.45, H*0.88, 34, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(W*0.32, H*0.8, 14, 13, 0, 0, 7); x.fill();   // a cat on the sill
    x.beginPath(); x.moveTo(W*0.25, H*0.77); x.lineTo(W*0.27, H*0.74); x.lineTo(W*0.3, H*0.77); x.moveTo(W*0.33, H*0.77); x.lineTo(W*0.36, H*0.74); x.lineTo(W*0.38, H*0.78); x.fill(); x.fillRect(W*0.56, H*0.86, 40, 6); }
  else if(kind===4){ lamp(W*0.72, H*0.35, 120); x.fillStyle='#16200e'; for(let k=0;k<14;k++){ const a=-1.2+k*0.18; x.beginPath(); x.ellipse(W*0.35+Math.cos(a)*40, H*0.66-Math.abs(Math.sin(a))*70, 9, 24, a, 0, 7); x.fill(); }   // a plant on the sill
    x.fillStyle='#3a2416'; x.fillRect(W*0.27, H*0.78, 44, 30); }
  else { const g3=x.createRadialGradient(W*0.5, H*0.55, 4, W*0.5, H*0.55, 170); g3.addColorStop(0, 'rgba(170,205,255,0.9)'); g3.addColorStop(1, 'rgba(90,130,220,0)'); x.fillStyle=g3; x.fillRect(0, 0, W, H);   // a TV's blue light
    x.fillStyle='#0c0f18'; x.beginPath(); x.ellipse(W*0.35, H*0.6, 16, 19, 0, 0, 7); x.fill(); x.fillRect(W*0.27, H*0.64, 34, 70); }
  /* RAIN-5b: the window's dressing — blinds (slats), a sheer veil, heavy drapes, curtains at the sides (the colour its own), or nothing */
  const CC=['150,80,40', '96,40,52', '44,62,96', '74,86,52', '170,150,112', '124,62,94'][(v.col||0)%6], cur=v.cur||'side';
  if(cur==='blind'){ for(let y=0;y<H;y+=14){ x.fillStyle=`rgba(${CC},0.78)`; x.fillRect(0, y, W, 9); } return c; }
  if(cur==='sheer'){ x.fillStyle=`rgba(${CC},0.28)`; x.fillRect(0, 0, W, H); return c; }
  if(cur==='none') return c;
  const side= cur==='drape' ? 0.34 : 0.22;
  for(const s of [0, 1]) if(!tv){ const g5=x.createLinearGradient(s ? W*(1-side) : 0, 0, s ? W : W*side, 0); g5.addColorStop(0, `rgba(${CC},0.9)`); g5.addColorStop(1, `rgba(${CC},0.55)`); x.fillStyle=g5; x.fillRect(s ? W*(1-side) : 0, 0, W*side, H); }
  if(!tv) return c;
  for(const s of [0, 1]){ const g4=x.createLinearGradient(s ? W*0.78 : 0, 0, s ? W : W*0.22, 0); g4.addColorStop(0, tv ? 'rgba(40,50,80,0.85)' : 'rgba(150,80,40,0.85)'); g4.addColorStop(1, tv ? 'rgba(80,100,150,0.6)' : 'rgba(240,170,90,0.55)');
    x.fillStyle=g4; x.fillRect(s ? W*0.78 : 0, 0, W*0.22, H); x.fillStyle='rgba(0,0,0,0.12)'; for(let k=0;k<4;k++) x.fillRect((s ? W*0.8 : W*0.02)+k*13, 0, 4, H); }
  return c;
}
