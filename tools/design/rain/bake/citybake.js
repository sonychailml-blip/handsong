/* RAIN-1: THE CITY's OFFLINE BAKE (dev tool; run by tools/rain-bake.mjs --city in a headless Chrome; never shipped). Renders the whole city (city.js)
   ONCE with three.js r128 (MIT, the copy vendored for the app) into the room's prepared layers, in VIEW-ANGLE units: one picture covers every screen
   shape the room's lens law allows (x −EXT[0]…EXT[0], y −EXT[1]…EXT[1]: an upright phone at 68° to a 2.4 : 1 screen at 55°), so a screen is a crop.
   Per mood: the colour with every window dark (its street life, terraces, shops and puddles); once: the colour with every window lit by its life (the
   room samples it inside a lit window), the DEPTH MAP by the room's law (pure/city.js depthOf; the sky 1), and the exact WINDOW MAP (each window's
   rectangle projected by the law's own project(), its depth, side, floor, life; a window hidden behind something nearer is left out).
   three.js is right-handed and the law's world is not (x right when looking along +z with y up): every render is mirrored left ↔ right when it is
   laid on the backdrop, so a pixel's place is exactly the law's view direction. window.cityBake(o) → { images, windows, ms, counts } */
import { buildCity, backdropCanvas } from './city.js';
import { lifeCanvas } from './model.js';
import { CAM, camBasis, project, depthOf, DEPTH, cityLamps, cityTrees, BAKE_EXT } from '../../../../apps/night/rooms/rain/pure/city.js';

const T=window.THREE, EXT=BAKE_EXT;
const loader=new T.TextureLoader(), cache=new Map();
const tex=(name, srgb, rep=1)=>{ const k=name+srgb+rep; if(cache.has(k)) return cache.get(k); const t=loader.load(new URL('../tex/'+name, import.meta.url).href); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; t.repeat.set(rep, rep); cache.set(k, t); return t; };
const pbr=(id, o={})=>new T.MeshStandardMaterial({ map:tex(id+'_diff_1k.jpg', true), normalMap:tex(id+'_nor_gl_1k.jpg'), roughnessMap:tex(id+'_arm_1k.jpg'), ...o });
const std=(c, o={})=>new T.MeshStandardMaterial({ color:new T.Color(c), roughness:0.8, ...o });
const glow=(r, g, b)=>new T.MeshBasicMaterial({ color:new T.Color(r, g, b) });
const LOOKS={ late:{ sky:'#1b1a2b', cloud:'#5a3a4a', glow:'#8a5a44', hills:'#1a1722', roofs:'#211c22', town:'#2c2630', wall:'#a8743a' },
  evening:{ sky:'#23203a', cloud:'#6a4456', glow:'#a06a48', hills:'#1f1a26', roofs:'#271f25', town:'#342b33', wall:'#c08240' },
  after:{ sky:'#171a2c', cloud:'#453848', glow:'#6f5560', hills:'#191a24', roofs:'#1f1d24', town:'#2a2832', wall:'#98703e' } };
/* the lives' atlas: 4 × 2 rooms behind curtains (a lamp, a reader, someone cooking, a cat, a plant, a TV, two more lamps), each 256 × 384 */
function livesAtlas(){ const c=document.createElement('canvas'); c.width=1024; c.height=1536; const x=c.getContext('2d');   // RAIN-5b: 4 × 4 rooms, each its light and its window dressing
  const TEMP=['warm', 'white', 'warm', 'dim'], CUR=['side', 'blind', 'sheer', 'side', 'none', 'blind', 'side', 'drape'];
  for(let k=0;k<16;k++){ const cell=lifeCanvas(k%6, k*17+5, { temp:TEMP[k%4], cur:CUR[(k*3)%8], col:k%6 }); x.drawImage(cell, (k%4)*256, (3-Math.floor(k/4))*384); }   // rows: the atlas's v grows upwards (texture space)
  const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; }
function pool(){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), g=x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,190,110,0.55)'); g.addColorStop(0.5, 'rgba(255,170,90,0.16)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle=g; x.fillRect(0, 0, 128, 128); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; }
/* RAIN-2: our own drawn textures — the carved lattice band of a wooden balcony (diamonds and drilled holes), its roof board's fringe (a zigzag edge) */
function latticeTex(){ const c=document.createElement('canvas'); c.width=512; c.height=96; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0, 0, 512, 96); x.globalCompositeOperation='destination-out';
  for(let i=0;i<16;i++){ const cx=16+i*32; x.beginPath(); x.moveTo(cx, 18); x.lineTo(cx+11, 48); x.lineTo(cx, 78); x.lineTo(cx-11, 48); x.closePath(); x.fill(); x.beginPath(); x.arc(cx+16, 20, 4, 0, 6.3); x.arc(cx+16, 76, 4, 0, 6.3); x.fill(); }
  const t=new T.CanvasTexture(c); t.wrapS=T.RepeatWrapping; t.repeat.set(3, 1); return t; }
function fringeTex(){ const c=document.createElement('canvas'); c.width=512; c.height=64; const x=c.getContext('2d'); x.fillStyle='#fff'; x.beginPath(); x.moveTo(0, 0); x.lineTo(512, 0);
  for(let i=32;i>=0;i--){ x.lineTo(i*16, i%2 ? 40 : 64); } x.closePath(); x.fill(); x.globalCompositeOperation='destination-out'; for(let i=0;i<32;i++){ x.beginPath(); x.arc(8+i*16, 18, 3.5, 0, 6.3); x.fill(); }
  const t=new T.CanvasTexture(c); t.wrapS=T.RepeatWrapping; t.repeat.set(4, 1); return t; }
/* RAIN-2: the plane trees' autumn leaf clusters — our composition of single CC0 leaves (Poly Haven «Tree Small 02», register entry rain-bake-textures,
   kept in tools/design/rain/tex/), each cut out by its alpha map and its blade's ellipse, tinted yellow, ochre, rust, brown or still green, on a thin twig:
   four 512² clusters in a 1024² sheet; two sheets (two seeds) */
const LEAVES=[[127,111,256,175],[66,382,290,196],[125,652,290,191],[127,943,212,148],[93,1219,294,196],[498,578,204,152],[498,848,318,175],[541,1092,302,185]];
const TINTS=['sepia(0.9) saturate(2.2) hue-rotate(-12deg) brightness(1.05)', 'sepia(1) saturate(2.6) hue-rotate(-28deg) brightness(0.9)', 'sepia(0.85) saturate(1.8) hue-rotate(-40deg) brightness(0.75)', 'sepia(1) saturate(1.2) brightness(0.62)', 'saturate(0.9) brightness(0.85)'];
async function leafSheets(n){
  const img=src=>new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=new URL('../tex/'+src, import.meta.url).href; });   /* RAIN-2: the CC0 leaves kept in the rain bake's own sources */
  const D=await img('tree_small_02_leaves_diff_2k.jpg'), A=await img('tree_small_02_leaves_alpha_2k.jpg');
  /* each leaf a sprite with its own alpha (the blade's ellipse × the alpha map) */
  const sprites=LEAVES.map(([sx, sy, sw, sh])=>{ const c=document.createElement('canvas'); c.width=sw; c.height=sh; const x=c.getContext('2d'); x.drawImage(D, sx, sy, sw, sh, 0, 0, sw, sh); const d=x.getImageData(0, 0, sw, sh);
    const a=document.createElement('canvas'); a.width=sw; a.height=sh; const y=a.getContext('2d'); y.drawImage(A, sx, sy, sw, sh, 0, 0, sw, sh); const ad=y.getImageData(0, 0, sw, sh).data;
    for(let j=0;j<sh;j++) for(let i=0;i<sw;i++){ const k=(j*sw+i)*4, e=((i-sw/2)/(sw*0.5))**2+((j-sh/2)/(sh*0.42))**2; d.data[k+3]= e<1 ? ad[k] : 0; } x.putImageData(d, 0, 0); return c; });
  const out=[]; let seed=7;
  const R=()=>{ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; };
  for(let s=0;s<n;s++){ const c=document.createElement('canvas'); c.width=c.height=1024; const x=c.getContext('2d');
    for(let cell=0;cell<4;cell++){ const ox=(cell%2)*512, oy=(1-Math.floor(cell/2))*512, cx=ox+256, cy=oy+300;
      x.save(); x.beginPath(); x.rect(ox, oy, 512, 512); x.clip(); x.strokeStyle='#3a2a1c'; x.lineCap='round';
      const arms=[]; for(let k=0;k<5;k++){ const a=-Math.PI/2+(k-2)*0.6+(R()-0.5)*0.3, L=140+R()*90; arms.push([a, L]); x.lineWidth=5; x.beginPath(); x.moveTo(cx, cy+150); x.quadraticCurveTo(cx+Math.cos(a)*L*0.4, cy+150+Math.sin(a)*L*0.6, cx+Math.cos(a)*L, cy+60+Math.sin(a)*L); x.stroke(); }
      const tint=TINTS[Math.floor(R()*TINTS.length)];
      for(let k=0;k<16;k++){ const [a, L]=arms[k%5], t=0.45+R()*0.6, px=cx+Math.cos(a)*L*t+(R()-0.5)*50, py=cy+60+Math.sin(a)*L*t+(R()-0.5)*50, sp=sprites[Math.floor(R()*8)], sc=(0.42+R()*0.25)*(150/sp.width);
        x.save(); x.translate(px, py); x.rotate(a+(R()-0.5)*1.6+Math.PI); x.scale(sc*(R()<0.5 ? 1 : -1), sc); x.filter= R()<0.75 ? tint : TINTS[Math.floor(R()*TINTS.length)]; x.drawImage(sp, -sp.width, -sp.height/2); x.restore(); }
      x.restore(); }
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=8; out.push(t); }
  return out; }
let leafCards=[];
function materials(lives){
  const life=new T.MeshBasicMaterial({ map:lives, color:new T.Color(0.035, 0.032, 0.03) }), stripe=[std('#7a2a2a', { roughness:0.9, side:T.DoubleSide }), std('#e3d7bb', { roughness:0.9, side:T.DoubleSide })];
  const M={ trim:std('#cdb08a', { roughness:0.92 }), roof:std('#4a4c55', { roughness:0.55, metalness:0.15 }), chimney:std('#5a4a40'), tank:std('#6a6e74', { metalness:0.5, roughness:0.5 }),
    pot:std('#7a4a30'), bark:std('#6a6250'), leaf:['#24361e', '#2e4424', '#3a5230', '#1f3020'].map(c=>std(c, { roughness:0.9 })), crown:['#1e2a18', '#24321c', '#2a3a20'].map(c=>std(c, { roughness:0.95 })),
    dark:std('#141214'), skin:std('#6a4c3c'), coat:['#2a2a32', '#3a2a24', '#1c2430', '#4a3a2a', '#2c2c2c', '#5a2a2a'].map(c=>std(c)), umb:['#20283a', '#7a2a2a', '#2a4a3a', '#c8a040', '#3a3a3a', '#5a3a6a', '#b04a30', '#1e4a6a'].map(c=>std(c, { roughness:0.5, side:T.DoubleSide })),
    iron:std('#15120f', { metalness:0.55, roughness:0.45 }), frame:std('#3a291c', { roughness:0.6 }), wood:std('#5a3e28', { roughness:0.85 }), bike:std('#7a2a24', { metalness:0.4 }),
    glass:new T.MeshStandardMaterial({ color:'#0a0d14', metalness:0.2, roughness:0.05, transparent:true, opacity:0.3, depthWrite:false }),
    life, shut:['#2f4236', '#4a3426', '#3a4450', '#544830'].map(c=>std(c, { roughness:0.85 })), cloth:['#e8e2d4', '#c45a4a', '#5a7ab0', '#e0c060', '#7aa070', '#d890a8', '#f0f0f0'].map(c=>std(c, { side:T.DoubleSide })),
    paneLit:glow(5, 2.8, 1.2), lantern:glow(6, 3.6, 1.5), shopLit:glow(5.5, 3.2, 1.5), stairLit:glow(2.6, 1.9, 1.1), shopDark:new T.MeshBasicMaterial({ color:'#06070a' }), dormerLit:glow(4.5, 2.6, 1.1),
    pave:pbr('red_sandstone_pavement', { color:new T.Color('#8a6c58'), roughness:0.5 }), prom:pbr('red_sandstone_pavement', { color:new T.Color('#9a806a'), roughness:0.45 }),
    asphalt:pbr('asphalt_02', { color:new T.Color('#55555f'), roughness:0.4 }), kerb:pbr('large_sandstone_blocks', { color:new T.Color('#8a7a6e') }), rail:std('#9a9aa0', { metalness:0.9, roughness:0.22 }),
    lampHead:glow(4, 3.1, 2.0), pool:new T.MeshBasicMaterial({ map:pool(), color:new T.Color(0.22, 0.22, 0.22), transparent:true, blending:T.AdditiveBlending, depthWrite:false })   /* RAIN-2: a hint only — the lamps' own light lights the ground */, kiosk:std('#3a4a3e'), stripe, table:std('#d8d0c0'), bulb:glow(6, 4.6, 2.6) };
  /* RAIN-2: the new kit's materials — CC0 textures at real scale (uv in metres / tile in city.js), our own drawn lattice and fringe, the autumn leaf cards */
  const wallTex=tex('worn_cracked_plaster_diff_1k.jpg', true); M.wallTex=wallTex;
  M.stone=pbr('large_sandstone_blocks', { color:new T.Color('#9a8a7a'), roughness:0.85 }); M.door=std('#3a2a1e', { roughness:0.7 }); M.zinc=std('#5a5e62', { metalness:0.55, roughness:0.45 });
  M.shutterM=pbr('rusty_metal_shutter', { color:new T.Color('#9a9a9a'), roughness:0.6, metalness:0.3 }); M.brickBand=pbr('red_brick', { color:new T.Color('#7a5a4a') });
  M.slate=pbr('roof_slates_02', { color:new T.Color('#8a8c94'), roughness:0.45, metalness:0.1, side:T.DoubleSide }); M.tiles=pbr('clay_roof_tiles', { color:new T.Color('#b0806a'), roughness:0.7, side:T.DoubleSide });
  M.ac=std('#b8b8b0', { roughness:0.6, metalness:0.2 }); M.grille=std('#26282a', { roughness:0.8 }); M.woodBal=pbr('wood_peeling_paint_weathered', { color:new T.Color('#c8c0b0'), roughness:0.85 });
  M.signLit=[glow(1.6, 0.6, 0.35), glow(0.4, 1.0, 0.7), glow(1.5, 1.2, 0.5), glow(0.5, 0.7, 1.6)];
  { const cache=new Map(); M.trimOf=c=>{ if(!cache.has(c)) cache.set(c, std(new T.Color(c).multiplyScalar(0.72).getStyle(), { roughness:0.92 })); return cache.get(c); };   /* stone trims, weathered darker */ }
  { const cache=new Map(); M.stripeOf=c=>{ if(!cache.has(c)) cache.set(c, std(c, { roughness:0.9, side:T.DoubleSide })); return cache.get(c); }; }
  M.lattice=new T.MeshStandardMaterial({ map:latticeTex(), color:new T.Color('#c8c0b0'), alphaTest:0.5, side:T.DoubleSide, roughness:0.85 });
  M.fringe=new T.MeshStandardMaterial({ map:fringeTex(), color:new T.Color('#c8c0b0'), alphaTest:0.5, side:T.DoubleSide, roughness:0.85 });
  M.planeBark=pbr('bark_platanus', { roughness:0.85 });
  M.leafCard=leafCards.map(t=>new T.MeshStandardMaterial({ map:t, alphaTest:0.45, side:T.DoubleSide, roughness:0.75 }));
  for(const k of ['lattice', 'fringe']) M[k].userData.noShadow=false;
  M.pool.userData.noShadow=true; M.glass.userData.noShadow=true; M.life.userData.noShadow=true;
  return M;
}
const DEPTH_V=`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position, 1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DEPTH_F=`precision highp float; varying vec3 vW; uniform vec2 uDA[${DEPTH.anchors.length}];
float depthOf(float d){ if(d<=uDA[0].x) return uDA[0].y*d/uDA[0].x; for(int i=1;i<${DEPTH.anchors.length};i++){ if(d<=uDA[i].x) return mix(uDA[i-1].y, uDA[i].y, log(d/uDA[i-1].x)/log(uDA[i].x/uDA[i-1].x)); }
  return min(0.99, uDA[${DEPTH.anchors.length-1}].y+0.03*log(d/uDA[${DEPTH.anchors.length-1}].x)); }
void main(){ float v=depthOf(length(vW-cameraPosition)); gl_FragColor=vec4(v, v, v, 1.); }`;
/* RELEASE-1 (A): the depth map honours alpha-tested cards — the leaf clusters, the lattice, the fringe (the override material wrote each card whole, so a person
   under a crown vanished where the picture shows a gap between the leaves) */
const DEPTH_VA=`varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position, 1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DEPTH_FA=DEPTH_F.replace('varying vec3 vW;', 'varying vec3 vW; varying vec2 vUv; uniform sampler2D uMap; uniform float uCut;').replace('void main(){ float v', 'void main(){ if(texture2D(uMap, vUv).a<uCut) discard; float v');
function depthPass(T, r, scene, cam, target){ const uDA={ value:DEPTH.anchors.map(a=>new T.Vector2(a[0], a[1])) }, plain=new T.ShaderMaterial({ uniforms:{ uDA }, vertexShader:DEPTH_V, fragmentShader:DEPTH_F, side:T.DoubleSide }), cut=new Map(), keep=new Map();
  scene.traverse(q=>{ if(!q.isMesh) return; keep.set(q, q.material); const m=q.material; if(m && m.alphaTest>0 && m.map){ if(!cut.has(m)) cut.set(m, new T.ShaderMaterial({ uniforms:{ uDA, uMap:{ value:m.map }, uCut:{ value:m.alphaTest } }, vertexShader:DEPTH_VA, fragmentShader:DEPTH_FA, side:T.DoubleSide })); q.material=cut.get(m); } else q.material= m && m.side===T.DoubleSide ? plain : new T.ShaderMaterial({ uniforms:{ uDA }, vertexShader:DEPTH_V, fragmentShader:DEPTH_F, side:m ? m.side : T.FrontSide }); });
  r.setRenderTarget(target); r.render(scene, cam); for(const [q, m] of keep) q.material=m; }
const COMP_F=`precision highp float; varying vec2 vUv; uniform sampler2D uMain, uMirror, uMask, uSky, uDep; uniform vec2 uPx; uniform float uWet, uExp, uHazeK; uniform vec3 uHaze;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
void main(){ vec4 c=texture2D(uMain, vUv); c.rgb+=texture2D(uSky, vUv).rgb; float m=texture2D(uMask, vUv).r*uWet;
  if(m>0.003){ vec3 r=vec3(0.); float wsum=0.; for(int k=-14;k<=14;k++){ float t=float(k)/14., w=exp(-t*t*2.5); r+=texture2D(uMirror, vUv+vec2(sin(float(k)*1.7)*1.5*uPx.x, t*46.*uPx.y)).rgb*w; wsum+=w; } c.rgb+=r/wsum*m; }
  float dp=texture2D(uDep, vUv).r, hz=smoothstep(0.42, 0.97, dp)*uHazeK*c.a; c.rgb=mix(c.rgb, uHaze, hz);   /* RAIN-2: the rain's haze deepens with distance */
  c.rgb=pow(aces(c.rgb*uExp), vec3(1./2.2)); gl_FragColor=c; }`;

window.cityBake=async function(o){
  const t0=performance.now(), px=o.px, ss=o.ss||2, W=Math.round(2*EXT[0]*px), H=Math.round(2*EXT[1]*px), RW=W*ss, RH=H*ss;
  const canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, alpha:true, preserveDrawingBuffer:true, premultipliedAlpha:false });
  r.setPixelRatio(1); r.setSize(RW, RH, false); r.physicallyCorrectLights=true; r.outputEncoding=T.LinearEncoding; r.toneMapping=T.NoToneMapping;   /* RAIN-2: every pass linear HDR, the filmic curve in the composite */
  r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap; r.setClearColor(0x000000, 0);
  const plaster=await new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=new URL('../tex/painted_plaster_wall_diff_1k.jpg', import.meta.url).href; });
  const brick=await new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=new URL('../tex/red_brick_diff_1k.jpg', import.meta.url).href; });   // RAIN-2: the brick houses' base
  leafCards=await leafSheets(2);
  const lives=livesAtlas(), M=materials(lives), trees=cityTrees(), lamps=cityLamps();
  const B=camBasis(), cam=new T.PerspectiveCamera(2*Math.atan(EXT[1])*180/Math.PI, EXT[0]/EXT[1], 0.5, 6000);
  cam.position.set(CAM.x, CAM.y, CAM.z); cam.up.set(B.u[0], B.u[1], B.u[2]); cam.lookAt(CAM.x+B.f[0], CAM.y+B.f[1], CAM.z+B.f[2]); cam.updateMatrixWorld();
  await new Promise(res=>{ const check=()=>{ if([...cache.values()].every(t=>t.image && t.image.complete)) res(); else setTimeout(check, 50); }; check(); });
  const rt=()=>new T.WebGLRenderTarget(RW, RH, { minFilter:T.LinearFilter, magFilter:T.LinearFilter, type:T.HalfFloatType, encoding:T.LinearEncoding });
  const RTm=rt(), RTr=rt(), RTk=rt(), RTs=rt(), RTp=rt(), RTd=rt(), images={}, counts={}, light={};
  const quad=new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms:{ uMain:{ value:RTm.texture }, uMirror:{ value:RTr.texture }, uMask:{ value:RTk.texture }, uSky:{ value:RTs.texture }, uDep:{ value:RTd.texture }, uPx:{ value:new T.Vector2(1/RW, 1/RH) }, uWet:{ value:1 }, uExp:{ value:o.exposure||0.1 }, uHazeK:{ value:0.45 }, uHaze:{ value:new T.Color() } },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`, fragmentShader:COMP_F, depthTest:false, blending:T.NoBlending, toneMapped:false }));   // written as it is (its alpha says where the city is)
  const qs=new T.Scene(); qs.add(quad); const oc=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /* lay a render (the WebGL canvas) mirrored over a backdrop canvas, at the output size → a 2D canvas */
  const lay=(back)=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
    if(back) x.drawImage(back, 0, 0, W, H); x.save(); x.translate(W, 0); x.scale(-1, 1); x.drawImage(canvas, 0, 0, W, H); x.restore(); return c; };
  const enc=(c, type, q)=>c.toDataURL(type, q);
  const small=(c, k)=>{ const d=document.createElement('canvas'); d.width=Math.round(c.width*k); d.height=Math.round(c.height*k); const x=d.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(c, 0, 0, d.width, d.height); return d; };
  let depthCanvas=null, winsOut=null, housesOut=null; const crowns={};
  for(const mood of o.moods){
    const scene=new T.Scene(), C=buildCity(T, M, { plaster, brick }, { mood, trees, lamps }); scene.add(C.group); counts[mood]={ meshes:C.group.children.length, windows:C.windows.length };
    /* lights: the nearest street lamps as real lights (the first ones with soft shadows), a cool sky fill, the city's warm glow from below */
    const near=C.lamps.map(p=>[p, Math.hypot(p[0]-CAM.x, p[2]-CAM.z)]).sort((a, b)=>a[1]-b[1]).slice(0, o.lights||10);
    near.forEach(([p], i)=>{ const L=new T.PointLight('#ffc27a', 1300, 0, 2); L.position.set(p[0], p[1]-0.3, p[2]); if(i<(o.shadows||3)){ L.castShadow=true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias=-0.002; L.shadow.radius=3; } scene.add(L); });
    const bounce=new T.HemisphereLight('#000000', '#6a4428', mood==='evening' ? 0.05 : 0.035); scene.add(bounce);   /* RAIN-2: the warm light thrown up by the lit wet street (the sky's own light comes from the sky passes, occluded) */
    const lampLights=scene.children.filter(q=>q.isLight);
    { const d=new T.DirectionalLight('#ffb070', 0.05); d.position.set(20, 2, 120); d.target.position.set(20, 15, 60); scene.add(d, d.target); }
    const back=backdropCanvas(EXT, px, LOOKS[mood]);
    if(o.depthOnly){ if(mood!==o.litMood) continue; const tm=r.toneMapping, e2=r.outputEncoding; r.toneMapping=T.NoToneMapping; r.outputEncoding=T.LinearEncoding; r.setRenderTarget(null); r.clear(); depthPass(T, r, scene, cam, null); r.toneMapping=tm; r.outputEncoding=e2;   // RELEASE-1 (A): only the depth map (the pictures untouched)
      depthCanvas=lay(back.depth); images['depth.png']=enc(depthCanvas, 'image/png'); images['depth-s.png']=enc(small(depthCanvas, o.small), 'image/png'); continue; }
    /* RAIN-2: THE SKY, OCCLUDED — the night sky's light from SKY_N directions over the upper hemisphere (cosine-weighted, the golden angle round), each a
       directional light with a soft shadow; their renders summed: every recess, eave, balcony underside and the street under the trees darker by how much
       sky it sees (ambient occlusion and soft contact shadows, from the scene's own geometry). The bake's time is free; the room only reads pictures. */
    const SKY_N=o.skyN||16, skyCol=new T.Color(LOOKS[mood].sky).multiplyScalar(1.0), dirL=new T.DirectionalLight(skyCol, 0); dirL.castShadow=true; dirL.shadow.mapSize.set(4096, 4096);
    { const sc=dirL.shadow.camera; sc.left=-170; sc.right=170; sc.top=170; sc.bottom=-170; sc.near=1; sc.far=1400; sc.updateProjectionMatrix(); } dirL.shadow.bias=-0.0008; dirL.shadow.radius=2.5;
    const tgt=new T.Object3D(); tgt.position.set(20, 0, 140); scene.add(dirL, tgt); dirL.target=tgt;
    const addQ=new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms:{ uA:{ value:RTp.texture } }, vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }', fragmentShader:'precision highp float; varying vec2 vUv; uniform sampler2D uA; void main(){ gl_FragColor=texture2D(uA, vUv); }', depthTest:false, blending:T.AdditiveBlending, transparent:true }));
    const addS=new T.Scene(); addS.add(addQ);
    const skyPass=(skyI)=>{ const keep=lampLights.map(q=>q.visible); for(const q of lampLights) q.visible=false; bounce.visible=false; dirL.intensity=skyI/SKY_N;
      r.setRenderTarget(RTs); r.setClearColor(0x000000, 0); r.clear();
      for(let k=0;k<SKY_N;k++){ const u=(k+0.5)/SKY_N, el=Math.asin(Math.sqrt(0.08+0.9*u)), az=k*2.39996+0.4; dirL.position.set(tgt.position.x+Math.cos(el)*Math.cos(az)*600, Math.sin(el)*600, tgt.position.z+Math.cos(el)*Math.sin(az)*600);
        r.setRenderTarget(RTp); r.clear(); r.render(scene, cam); r.setRenderTarget(RTs); r.autoClear=false; r.render(addS, oc); r.autoClear=true; }
      lampLights.forEach((q, i)=>{ q.visible=keep[i]; }); bounce.visible=true; dirL.intensity=0; };
    /* the depth map by the law, for the haze (each mood its own scene) */
    { const dm=new T.ShaderMaterial({ uniforms:{ uDA:{ value:DEPTH.anchors.map(a=>new T.Vector2(a[0], a[1])) } }, vertexShader:DEPTH_V, fragmentShader:DEPTH_F }); scene.overrideMaterial=dm; r.setRenderTarget(RTd); r.setClearColor(0xffffff, 1); r.clear(); r.render(scene, cam); scene.overrideMaterial=null; r.setClearColor(0x000000, 0); }
    quad.material.uniforms.uHaze.value.set(LOOKS[mood].glow).multiplyScalar(0.06);
    { const t1=performance.now(); skyPass(o.skyI||1.8); light[mood]={ skyN:SKY_N, skyMs:Math.round(performance.now()-t1) }; }
    const renderComposite=(wet)=>{ r.setRenderTarget(RTm); r.clear(); r.render(scene, cam);
      const wetObjs=[]; C.group.traverse(q=>{ if(q.isMesh && [M.asphalt, M.pave, M.prom, M.kerb, M.rail, M.pool].includes(q.material)) wetObjs.push(q); });
      const mats=new Set(); C.group.traverse(q=>{ if(q.isMesh) mats.add(q.material); }); const sides=new Map([...mats].map(m=>[m, m.side])); for(const m of mats) m.side=T.DoubleSide;
      C.group.scale.y=-1; for(const q of wetObjs) q.visible=false; r.setRenderTarget(RTr); r.clear(); r.render(scene, cam); C.group.scale.y=1; for(const q of wetObjs) q.visible=true; for(const [m, s] of sides) m.side=s;
      { const keep=new Map(), black=new T.MeshBasicMaterial({ color:'#000' }), road=new T.MeshBasicMaterial({ color:new T.Color(0.7, 0.7, 0.7) }), pv=new T.MeshBasicMaterial({ color:new T.Color(0.25, 0.25, 0.25) });
        C.group.traverse(q=>{ if(!q.isMesh) return; keep.set(q, q.material); if(q.material===M.pool){ q.visible=false; return; } q.material= q.material===M.asphalt ? road : (q.material===M.pave || q.material===M.prom) ? pv : black; });   // the light pools never hide the wet reflection
        const tm=r.toneMapping; r.toneMapping=T.NoToneMapping; r.setRenderTarget(RTk); r.clear(); r.render(scene, cam); r.toneMapping=tm; for(const [q, m] of keep){ q.material=m; q.visible=true; } }
      quad.material.uniforms.uWet.value=wet; const e=r.outputEncoding; r.outputEncoding=T.LinearEncoding; r.setRenderTarget(null); r.clear(); r.render(qs, oc); r.outputEncoding=e; };
    renderComposite(mood==='after' ? 1.6 : 1); const col=lay(back.colour); images[`${mood}.webp`]=enc(col, 'image/webp', 0.9); images[`${mood}-s.webp`]=enc(small(col, o.small), 'image/webp', 0.88);
    if(mood===o.litMood){
      M.life.color.setRGB(9, 8.2, 7.4); renderComposite(1); M.life.color.setRGB(0.035, 0.032, 0.03);
      const lit=lay(back.colour); images['lit.webp']=enc(lit, 'image/webp', 0.9); images['lit-s.webp']=enc(small(lit, o.small), 'image/webp', 0.88);
      /* the depth map: the law's depth per fragment over the backdrop's (the sky 1) */
      { const tm=r.toneMapping, e2=r.outputEncoding; r.toneMapping=T.NoToneMapping; r.outputEncoding=T.LinearEncoding; r.setRenderTarget(null); r.clear(); depthPass(T, r, scene, cam, null); r.toneMapping=tm; r.outputEncoding=e2; }   // RELEASE-1 (A): the cards' gaps kept
      depthCanvas=lay(back.depth); images['depth.png']=enc(depthCanvas, 'image/png'); images['depth-s.png']=enc(small(depthCanvas, o.small), 'image/png');
      /* THE WINDOW MAP: each window projected by the law; kept when in the picture, wide enough, not hidden (the depth map at its centre is its own),
         nearest first, never overlapping a nearer one */
      const dx=depthCanvas.getContext('2d'), dAt=(u, v)=>{ const i=Math.round((u/EXT[0]*0.5+0.5)*W-0.5), j=Math.round((0.5-v/EXT[1]*0.5)*H-0.5); if(i<0 || j<0 || i>=W || j>=H) return -1; return dx.getImageData(i, j, 1, 1).data[0]/255; };
      const all=[]; for(const w of C.windows){ const q=w.corners.map(p=>project(p)); if(q.some(p=>p.z<=1)) continue; const xs=q.map(p=>p.x), ys=q.map(p=>p.y);
        const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys), c=project(w.centre), depth=depthOf(c.dist), hw=(x1-x0)/2, hh=(y1-y0)/2;
        if(hw<0.0024 || x1<-EXT[0] || x0>EXT[0] || y1<-EXT[1] || y0>EXT[1]) continue;
        const seen=dAt((x0+x1)/2, (y0+y1)/2); if(!(Math.abs(seen-depth)<0.025)) continue;
        all.push({ q:q.map(p=>[+p.x.toFixed(5), +p.y.toFixed(5)]), id:w.id, x:+((x0+x1)/2).toFixed(5), y:+((y0+y1)/2).toFixed(5), hw:+hw.toFixed(5), hh:+hh.toFixed(5), depth:+depth.toFixed(4), dist:+c.dist.toFixed(2), side:w.side, block:w.block, bay:w.bay, floor:w.floor, life:w.life, amb:+w.amb.toFixed(4), warm:+w.warm.toFixed(4) }); }
      all.sort((a, b)=>a.dist-b.dist); winsOut=[]; for(const w of all) if(!winsOut.some(q=>Math.abs(q.x-w.x)<q.hw+w.hw && Math.abs(q.y-w.y)<q.hh+w.hh)) winsOut.push(w);
      /* RAIN-2: THE CROWNS ON AN UPRIGHT PHONE — the share of the phone crop's lower half (x within ±0.6745 × 390 / 844, y below the middle) covered by the
         plane trees (crowns and limbs white, everything else black, the city occluding); the same for RAIN-1's sphere crowns (o.oldTrees), the CONTROL */
      const crownShare=(sc, white)=>{ const mk=new T.WebGLRenderTarget(RW, RH, { type:T.UnsignedByteType }), keep=new Map(), Wm=new T.MeshBasicMaterial({ color:'#fff', side:T.DoubleSide }), Bm=new T.MeshBasicMaterial({ color:'#000', side:T.DoubleSide });
        sc.traverse(q=>{ if(q.isMesh){ keep.set(q, q.material); const w=white(q.material); q.material= w ? (q.material.alphaTest ? new T.MeshBasicMaterial({ color:'#fff', map:q.material.map, alphaTest:q.material.alphaTest, side:T.DoubleSide }) : Wm) : Bm; } });
        r.setRenderTarget(mk); r.setClearColor(0x000000, 1); r.clear(); r.render(sc, cam); const px=new Uint8Array(RW*RH*4); r.readRenderTargetPixels(mk, 0, 0, RW, RH, px); r.setClearColor(0x000000, 0);
        for(const [q, m] of keep) q.material=m; mk.dispose();
        const hw=Math.round(0.6745*390/844/EXT[0]*RW/2), x0=Math.round(RW/2)-hw, x1=Math.round(RW/2)+hw; let on=0, all=0; for(let j=0;j<RH/2;j++) for(let i=x0;i<x1;i++){ all++; if(px[(j*RW+i)*4]>127) on++; } return +(on/all).toFixed(4); };
      const treeMats=new Set([M.planeBark, ...M.leafCard]); crowns.now=crownShare(scene, m=>treeMats.has(m));
      { const S2=new T.Scene(), C2=buildCity(T, M, { plaster, brick }, { mood, trees, lamps, oldTrees:true }); S2.add(C2.group); const old=new Set([M.bark, ...M.crown]); crowns.old=crownShare(S2, m=>old.has(m)); C2.group.traverse(q=>{ if(q.isMesh) q.geometry.dispose(); }); }
      housesOut=C.houses.map(h=>({ side:h.side, z0:+h.z0.toFixed(2), z1:+h.z1.toFixed(2), floors:h.floors, style:h.style, roof:h.roof, setback:+h.setback.toFixed(2), top:+h.top.toFixed(2) }));
    }
    C.group.traverse(q=>{ if(q.isMesh){ q.geometry.dispose(); if(q.material.map && q.material.map.isCanvasTexture && q.material.map!==lives) q.material.map.dispose(); } });
  }
  for(const t of [RTm, RTr, RTk, RTs, RTp, RTd]) t.dispose(); r.dispose();
  return { images, windows:winsOut, ms:Math.round(performance.now()-t0), counts, size:[W, H], light, houses:housesOut, crowns };
};
window.cityBakeReady=true;
