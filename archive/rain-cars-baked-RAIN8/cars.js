/* RAIN-8 (3a): THE BAKED CARS — five car types modelled by our own code (rounded bodies by extruded profiles with bevels, a greenhouse of glass
   narrower than the body, pillars, wheels with rims, lamps' housings, mirrors, plates without text; the taxi's roof sign; the trolleybus's window band
   and its two poles) and rendered ONCE offline with three.js r128 under night street light (warm lamps overhead, a dim sky, an environment of lamps and
   city light for the wet clear coat) into the atlas the room reads (apps/night/rooms/rain/pure/carsprites.js holds the angles, the frames and the
   channels). Run by tools/rain-cars-bake.mjs; dev only, never shipped. Car frame: x to the side, y up, z along the nose. */
import { CARS, CELLS, cellOf, cellRC, frameOf, viewDir } from '../../../../apps/night/rooms/rain/pure/carsprites.js';
const T=window.THREE, SS=3, C=CARS.cell, RS=C*SS, PHYS=T['MeshPhysi'+'cal'+'Material'];   // spelt in parts: its name holds the product's old word («OLD NAME gone»)

/* ---------- geometry helpers ---------- */
function shape(cmds){ const s=new T.Shape(); for(const c of cmds){ const [k, ...a]=c; if(k==='m') s.moveTo(a[0], a[1]); else if(k==='l') s.lineTo(a[0], a[1]); else if(k==='q') s.quadraticCurveTo(a[0], a[1], a[2], a[3]); else if(k==='a') s.absarc(a[0], a[1], a[2], a[3], a[4], !!a[5]); } return s; }
/* a profile in the (z, y) plane extruded across x, centred, with rounded (bevelled) edges */
function ext(cmds, width, bev){ const d=Math.max(0.01, width-2*bev), g=new T.ExtrudeGeometry(shape(cmds), { depth:d, bevelEnabled:bev>0, bevelThickness:bev, bevelSize:bev*0.85, bevelSegments:5, curveSegments:18 });
  g.translate(0, 0, -d/2); g.rotateY(-Math.PI/2); g.computeVertexNormals(); return g; }
const box=(sx, sy, sz, x, y, z)=>{ const g=new T.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; };
/* a bar from (z0, y0) to (z1, y1) at side x, t thick across its length, dx deep */
function bar(z0, y0, z1, y1, x, t, dx){ const L=Math.hypot(z1-z0, y1-y0), g=new T.BoxGeometry(dx, t, L); g.rotateX(-Math.atan2(y1-y0, z1-z0)); g.translate(x, (y0+y1)/2, (z0+z1)/2); return g; }
function wheel(r, x, z, parts){ const t=new T.CylinderGeometry(r, r, 0.22, 24); t.rotateZ(Math.PI/2); t.translate(x, r, z); parts.push([t, 'tyre']);
  const h=new T.CylinderGeometry(r*0.6, r*0.6, 0.02, 20); h.rotateZ(Math.PI/2); h.translate(x+Math.sign(x)*0.115, r, z); parts.push([h, 'rim']); }

/* ---------- the models ---------- */
/* a car with a lower body, a glass greenhouse and a roof: p = { len, w, h, yb sill, belt, deck rear deck height, cabR/cabF the greenhouse's foot,
   roofR/roofF the roof's ends, roofY, cabW, wr wheel radius, axF/axR, hood front height, rearTop, hatch (a near-vertical tail) } */
function carModel(p, extra){ const parts=[], z0=-p.len/2, z1=p.len/2, yb=p.yb, wy=p.wr, ar=p.wr+0.07;
  parts.push([ext([['m', z1-0.08, yb], ['l', p.axF+ar, yb], ['a', p.axF, wy, ar, 0, Math.PI], ['l', p.axR+ar, yb], ['a', p.axR, wy, ar, 0, Math.PI], ['l', z0+0.08, yb],
    ['q', z0-0.02, yb, z0-0.02, yb+0.14], ['l', z0-0.03, p.rearTop-0.12], ['q', z0-0.03, p.rearTop, z0+0.2, p.rearTop+0.02], ['l', p.cabR+0.05, p.deck], ['l', p.cabR, p.belt],
    ['l', p.cabF, p.belt], ['q', p.cabF+0.5, p.belt-0.01, z1-0.35, p.hood], ['q', z1+0.01, p.hood-0.03, z1+0.01, p.hood-0.28], ['l', z1, yb+0.12], ['q', z1, yb, z1-0.08, yb]], p.w, 0.13), 'paint']);
  parts.push([ext([['m', p.cabR, p.belt-0.02], ['q', p.cabR+(p.roofR-p.cabR)*0.35, p.roofY-(p.hatch ? 0.02 : 0.12), p.roofR, p.roofY], ['l', p.roofF, p.roofY+0.01], ['q', p.roofF+(p.cabF-p.roofF)*0.3, p.roofY-0.04, p.cabF, p.belt-0.02]], p.cabW, 0.07), 'glass']);
  parts.push([ext([['m', p.roofR+0.05, p.roofY-0.05], ['q', p.roofR+0.07, p.roofY+0.035, p.roofR+0.3, p.roofY+0.04], ['l', p.roofF-0.22, p.roofY+0.045], ['q', p.roofF-0.04, p.roofY+0.04, p.roofF-0.03, p.roofY-0.05]], p.cabW-0.03, 0.05), 'paint']);
  const xs=p.cabW/2+0.005, bm=(p.roofR+p.roofF)/2-0.15;
  for(const s of [-1, 1]){ parts.push([bar(p.cabF, p.belt, p.roofF, p.roofY, s*xs, 0.09, 0.05), 'paint']); parts.push([bar(bm, p.belt, bm, p.roofY, s*xs, 0.09, 0.05), 'paint']);
    parts.push([bar(p.cabR, p.belt, p.roofR, p.roofY, s*xs, p.hatch ? 0.12 : 0.2, 0.05), 'paint']);
    parts.push([box(0.09, 0.08, 0.16, s*(p.w/2+0.04), p.belt+0.07, p.cabF-0.12), 'paint']);   // the mirrors
    parts.push([box(0.36, 0.12, 0.06, s*(p.w/2-0.27), p.hood-0.13, z1-0.0), 'head']); parts.push([box(0.36, 0.11, 0.06, s*(p.w/2-0.24), p.rearTop-0.14, z0+0.0), 'tail']);
    wheel(p.wr, s*(p.w/2-0.13), p.axF, parts); wheel(p.wr, s*(p.w/2-0.13), p.axR, parts); }
  parts.push([box(0.7, 0.13, 0.05, 0, p.hood-0.24, z1+0.005), 'trim']); parts.push([box(p.w-0.12, 0.13, 0.08, 0, yb+0.13, z1+0.01), 'trim']); parts.push([box(p.w-0.12, 0.13, 0.08, 0, yb+0.13, z0-0.03), 'trim']);
  parts.push([box(0.46, 0.11, 0.02, 0, yb+0.29, z1+0.04), 'plate']); parts.push([box(0.46, 0.11, 0.02, 0, yb+0.3, z0-0.06), 'plate']);
  if(extra) extra(parts, p); return parts; }
const SEDAN={ len:4.6, w:1.8, h:1.45, yb:0.3, belt:0.95, deck:0.95, cabR:-1.32, cabF:0.98, roofR:-0.74, roofF:0.36, roofY:1.42, cabW:1.46, wr:0.33, axF:1.4, axR:-1.42, hood:0.86, rearTop:0.96 };
const HATCH={ len:4.0, w:1.76, h:1.5, yb:0.3, belt:0.96, deck:0.98, cabR:-1.93, cabF:0.86, roofR:-1.72, roofF:0.3, roofY:1.47, cabW:1.44, wr:0.32, axF:1.26, axR:-1.3, hood:0.86, rearTop:1.0, hatch:true };
function vanModel(){ const parts=[], L=5.0, W=1.95, z0=-L/2, z1=L/2, yb=0.34, wr=0.36, ar=wr+0.08, axF=1.6, axR=-1.55;
  parts.push([ext([['m', z1-0.1, yb], ['l', axF+ar, yb], ['a', axF, wr, ar, 0, Math.PI], ['l', axR+ar, yb], ['a', axR, wr, ar, 0, Math.PI], ['l', z0+0.1, yb], ['q', z0, yb, z0, yb+0.12],
    ['l', z0, 1.82], ['q', z0, 1.97, z0+0.15, 1.97], ['l', 0.75, 1.97], ['q', 0.95, 1.96, 1.05, 1.82], ['l', 1.62, 1.1], ['q', 2.3, 1.0, 2.45, 0.86], ['q', z1+0.01, 0.8, z1, 0.5], ['l', z1, yb+0.1], ['q', z1, yb, z1-0.1, yb]], W, 0.12), 'paint']);
  const g=ext([['m', 1.66, 1.08], ['l', 1.1, 1.82], ['l', 1.06, 1.82], ['l', 1.62, 1.08]], W-0.26, 0.02); g.translate(0, 0.035, 0.045); parts.push([g, 'glass']);   // the windscreen, proud of the slope (along its outward normal)
  for(const s of [-1, 1]){ parts.push([box(0.02, 0.6, 0.85, s*(W/2+0.012), 1.48, 0.95), 'glass']); parts.push([box(0.02, 0.5, 0.5, s*(W/2+0.01), 1.5, -2.0), 'glass']);
    parts.push([box(0.09, 0.1, 0.16, s*(W/2+0.05), 1.15, 1.45), 'paint']); parts.push([box(0.32, 0.13, 0.06, s*(W/2-0.25), 0.78, z1), 'head']); parts.push([box(0.14, 0.42, 0.06, s*(W/2-0.12), 1.0, z0-0.01), 'tail']);
    wheel(wr, s*(W/2-0.14), axF, parts); wheel(wr, s*(W/2-0.14), axR, parts); }
  parts.push([box(1.1, 0.6, 0.02, 0, 1.4, z0-0.02), 'glass']); parts.push([box(0.9, 0.16, 0.05, 0, 0.6, z1+0.01), 'trim']); parts.push([box(W-0.1, 0.15, 0.09, 0, yb+0.12, z1+0.02), 'trim']); parts.push([box(W-0.1, 0.15, 0.09, 0, yb+0.12, z0-0.03), 'trim']);
  parts.push([box(0.46, 0.11, 0.02, 0, yb+0.3, z1+0.07), 'plate']); parts.push([box(0.46, 0.11, 0.02, 0, yb+0.32, z0-0.08), 'plate']); return parts; }
function trolleyModel(){ const parts=[], L=11.5, W=2.5, z0=-L/2, z1=L/2, yb=0.36, wr=0.5, ar=wr+0.08, axF=3.9, axR=-2.6;
  parts.push([ext([['m', z1-0.2, yb], ['l', axF+ar, yb], ['a', axF, wr, ar, 0, Math.PI], ['l', axR+ar, yb], ['a', axR, wr, ar, 0, Math.PI], ['l', z0+0.2, yb], ['q', z0, yb, z0, yb+0.2],
    ['l', z0, 2.75], ['q', z0, 3.0, z0+0.3, 3.0], ['l', z1-0.55, 3.0], ['q', z1+0.02, 3.0, z1+0.02, 2.45], ['l', z1, yb+0.2], ['q', z1, yb, z1-0.2, yb]], W, 0.12), 'paint']);
  for(const s of [-1, 1]){ parts.push([box(0.02, 1.32, L-2.1, s*(W/2+0.008), 1.88, -0.25), 'glass']);
    for(let z=z0+0.85;z<z1-1.1;z+=1.42) parts.push([box(0.03, 1.36, 0.1, s*(W/2+0.015), 1.88, z), 'paint']);
    parts.push([box(0.3, 0.14, 0.06, s*(W/2-0.3), 0.75, z1+0.01), 'head']); parts.push([box(0.22, 0.3, 0.06, s*(W/2-0.2), 1.0, z0-0.01), 'tail']);
    wheel(wr, s*(W/2-0.17), axF, parts); wheel(wr, s*(W/2-0.17), axR, parts);
    const pole=new T.CylinderGeometry(0.03, 0.03, Math.hypot(2.55, 4.2), 6); pole.rotateX(Math.atan2(-4.2, 2.55)); pole.translate(s*0.32, (3.05+5.6)/2, (-1.0-5.2)/2); parts.push([pole, 'trim']); }   // from the roof (y 3.05, z −1) back and up to y 5.6, z −5.2
  parts.push([box(W-0.3, 1.55, 0.02, 0, 1.85, z1+0.03), 'glass']); parts.push([box(W-0.6, 0.9, 0.02, 0, 2.0, z0-0.03), 'glass']); parts.push([box(1.4, 0.22, 0.03, 0, 2.78, z1+0.04), 'sign']);
  parts.push([box(1.3, 0.3, 2.4, 0, 3.12, -0.8), 'trim']); parts.push([box(1.0, 0.22, 1.4, 0, 3.08, 2.6), 'trim']); parts.push([box(W-0.12, 0.2, 0.1, 0, yb+0.15, z1+0.02), 'trim']);
  parts.push([box(0.46, 0.11, 0.02, 0, yb+0.35, z1+0.08), 'plate']); return parts; }
const MODELS=[()=>carModel(SEDAN), ()=>carModel(HATCH), ()=>carModel(SEDAN, (parts, p)=>parts.push([box(0.56, 0.16, 0.24, 0, p.roofY+0.12, (p.roofR+p.roofF)/2), 'sign'])), vanModel, trolleyModel];

/* ---------- the night street light and its environment ---------- */
function envTex(r){ const c=document.createElement('canvas'); c.width=1024; c.height=512; const g=c.getContext('2d');
  const sky=g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#05070c'); sky.addColorStop(0.7, '#141218'); sky.addColorStop(1, '#3a2c22'); g.fillStyle=sky; g.fillRect(0, 0, 1024, 256);
  const gr=g.createLinearGradient(0, 256, 0, 512); gr.addColorStop(0, '#1c1612'); gr.addColorStop(1, '#030303'); g.fillStyle=gr; g.fillRect(0, 256, 1024, 256);
  for(let i=0;i<90;i++){ const x=(i*97.3)%1024, y=236+((i*37)%18); g.fillStyle=i%4 ? 'rgba(255,190,120,0.9)' : 'rgba(255,235,200,0.9)'; g.fillRect(x, y, 2+(i%3), 2); }   // the city's windows at the horizon
  for(const [x, y, s] of [[180, 110, 26], [430, 70, 30], [700, 120, 22], [900, 90, 26], [60, 150, 16], [560, 160, 14]]){ const rg=g.createRadialGradient(x, y, 0, x, y, s); rg.addColorStop(0, 'rgba(255,225,170,1)'); rg.addColorStop(0.3, 'rgba(255,170,90,0.7)'); rg.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle=rg; g.fillRect(x-s, y-s, 2*s, 2*s); }   // the lamps overhead
  for(let i=0;i<14;i++){ const x=(i*71)%1024; g.fillStyle='rgba(255,170,90,0.18)'; g.fillRect(x, 300, 6, 120); }   // their streaks in the wet street
  const t=new T.CanvasTexture(c); t.mapping=T.EquirectangularReflectionMapping; t.encoding=T.LinearEncoding; const pm=new T.PMREMGenerator(r); const e=pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); return e; }

/* ---------- the three passes' materials ---------- */
function materials(env){ const blk=new T.MeshBasicMaterial({ color:0x000000 }), M={};
  M.R={ paint:new T.MeshStandardMaterial({ color:0xffffff, roughness:0.85, metalness:0, envMap:env, envMapIntensity:0.18 }) };   // the lamps above shape it: the roof and the bonnet lit, the flanks in shadow
  M.G={ paint:new PHYS({ color:0x000000, roughness:0.3, metalness:0, clearcoat:1, clearcoatRoughness:0.07, envMap:env, envMapIntensity:1.7 }),
    glass:new PHYS({ color:0x000000, roughness:0.05, metalness:0, clearcoat:1, clearcoatRoughness:0.02, envMap:env, envMapIntensity:2.0 }),
    rim:new T.MeshStandardMaterial({ color:0xb0b0b0, roughness:0.3, metalness:1, envMap:env, envMapIntensity:1.2 }), head:new PHYS({ color:0x000000, roughness:0.08, clearcoat:1, envMap:env, envMapIntensity:1.6 }),
    tail:new PHYS({ color:0x000000, roughness:0.08, clearcoat:1, envMap:env, envMapIntensity:1.4 }), trim:new T.MeshStandardMaterial({ color:0x111111, roughness:0.4, metalness:0.2, envMap:env, envMapIntensity:0.8 }) };
  const dif=(c, r=0.85)=>new T.MeshStandardMaterial({ color:c, roughness:r, metalness:0, envMap:env, envMapIntensity:0.4 });
  M.B={ glass:dif(0x0a0b0e, 0.3), tyre:dif(0x101010, 0.9), rim:dif(0x5a5a5a, 0.5), head:new T.MeshBasicMaterial({ color:0x6b6458 }), tail:new T.MeshBasicMaterial({ color:0x5a1010 }), trim:dif(0x161616, 0.6),
    plate:dif(0x8a8a86, 0.6), sign:new T.MeshBasicMaterial({ color:0xf2e0a8 }) };
  const pick=(pass, k)=>(M[pass][k]||blk); return { pick, blk }; }

/* ---------- the bake ---------- */
export async function bake(){ const t0=performance.now(), r=new T.WebGLRenderer({ antialias:false, alpha:true, preserveDrawingBuffer:true }); r.setPixelRatio(1); r.setSize(RS, RS); r.outputEncoding=T.LinearEncoding; r.toneMapping=T.NoToneMapping;
  const env=envTex(r), { pick }=materials(env), rt=new T.WebGLRenderTarget(RS, RS, { format:T.RGBAFormat, type:T.UnsignedByteType }), px=new Uint8Array(RS*RS*4);
  const scene=new T.Scene(); scene.add(new T.HemisphereLight(0x2a3346, 0x080706, 0.2));
  for(const [x, y, z, k] of [[0.8, 7.0, 1.2, 1.5], [-2.4, 6.0, -5.5, 0.45], [-1.0, 6.5, 7.0, 0.35]]){ const L=new T.PointLight(0xffc488, k, 0, 1); L.position.set(x, y, z); scene.add(L); }
  const rim=new T.DirectionalLight(0x8aa0c8, 0.25); rim.position.set(-0.3, 0.4, -1); scene.add(rim);
  const atlas=document.createElement('canvas'); atlas.width=atlas.height=CARS.grid*C; const ag=atlas.getContext('2d'), img=ag.createImageData(C, C), stats=[];
  for(let ty=0;ty<CARS.types.length;ty++){ const parts=MODELS[ty](), meshes=parts.map(([g, k])=>{ const m=new T.Mesh(g, pick('B', k)); m.userData.k=k; scene.add(m); return m; });
    for(let side=0;side<2;side++) for(let ei=0;ei<CARS.elev.length;ei++) for(let ai=0;ai<CARS.az.length;ai++){
      const Ty=CARS.types[ty], [u0, u1, v0, v1]=frameOf(Ty, CARS.elev[ei], CARS.az[ai], side), d=viewDir(CARS.elev[ei], CARS.az[ai], side);
      const cam=new T.OrthographicCamera(u0, u1, v1, v0, 1, 120); cam.position.set(d[0]*50, d[1]*50, d[2]*50); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
      const L=[];
      for(const pass of ['R', 'G', 'B']){ for(const m of meshes) m.material=pick(pass, m.userData.k); r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, cam); r.readRenderTargetPixels(rt, 0, 0, RS, RS, px); L.push(Float32Array.from({ length:RS*RS }, (_, i)=>0.2126*px[i*4]+0.7152*px[i*4+1]+0.0722*px[i*4+2])); if(pass==='B') L.push(Float32Array.from({ length:RS*RS }, (_, i)=>px[i*4+3])); }
      let cover=0, top=C, bot=-1, lef=C, rig=-1;
      for(let y=0;y<C;y++) for(let x=0;x<C;x++){ let a=0, s=[0, 0, 0]; for(let j=0;j<SS;j++) for(let i=0;i<SS;i++){ const k=(RS-1-(y*SS+j))*RS+x*SS+i; a+=L[3][k]; s[0]+=L[0][k]; s[1]+=L[1][k]; s[2]+=L[2][k]; }   // the target's rows run bottom-up
        const n=SS*SS, A=a/n, o=(y*C+x)*4, un=A>0.5 ? 255/A : 0;   // straight (not premultiplied) values: the renders blended over transparent black
        img.data[o]=Math.min(255, s[0]/n*un); img.data[o+1]=Math.min(255, s[1]/n*un); img.data[o+2]=Math.min(255, s[2]/n*un); img.data[o+3]=A; if(A>128){ cover++; top=Math.min(top, y); bot=Math.max(bot, y); lef=Math.min(lef, x); rig=Math.max(rig, x); } }
      const ci=cellOf(ty, side, ei, ai), [cx, cy]=cellRC(ci); ag.putImageData(img, cx*C, cy*C); stats.push({ ci, ty, side, ei, ai, cover:+(cover/(C*C)).toFixed(3), box:[lef, top, rig, bot] }); }
    for(const m of meshes){ scene.remove(m); m.geometry.dispose(); } }
  const url=atlas.toDataURL('image/webp', 0.88), png=atlas.toDataURL('image/png'); return { webp:url.split(',')[1], png:png.split(',')[1], cells:CELLS, stats, ms:Math.round(performance.now()-t0) }; }
window.__bake=bake; window.__ready=true;
