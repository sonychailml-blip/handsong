/* RAIN-0b: THE OFFLINE BAKE (dev tool; run by tools/rain-bake.mjs in a headless Chrome; never shipped). Renders the model (model.js) ONCE at high
   quality with three.js r128 (MIT; the copy vendored for the app): physically based materials from CC0 textures, night lights (street lamps with
   soft shadows lighting the plaster from below, warm city glow, lit rooms), wet reflections in the street (a mirrored render streaked and laid on
   the wet surfaces by a mask), supersampled 2× and filtered down. Outputs per view: the colour with the windows dark and lit (each window's life),
   the DEPTH MAP by the room's depth law (pure/city.js depthOf — the same anchors), and the exact WINDOW MAP (id, rectangle, depth per window).
   window.bake(opts) → { images: { name: dataURL }, windows, ms } */
import { buildFacade, lifeCanvas, FACADE } from './model.js';
import { DEPTH } from '../../../../apps/night/rooms/rain/pure/city.js';

const T=window.THREE;
const loader=new T.TextureLoader(), texCache=new Map();
const tex=(name, srgb)=>{ const k=name+srgb; if(texCache.has(k)) return texCache.get(k); const t=loader.load(new URL('../tex/'+name, import.meta.url).href); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; texCache.set(k, t); return t; };
const pbr=(id, o={})=>new T.MeshStandardMaterial({ map:tex(id+'_diff_1k.jpg', true), normalMap:tex(id+'_nor_gl_1k.jpg'), roughnessMap:tex(id+'_arm_1k.jpg'), aoMap:tex(id+'_arm_1k.jpg'), aoMapIntensity:0.8, ...o });
function materials(){
  const M={
    plaster:pbr('painted_plaster_wall', { color:new T.Color('#c99f72'), roughness:1 }),
    trim:pbr('painted_plaster_wall', { color:new T.Color('#dcbb8e'), roughness:0.95 }),
    stone:pbr('large_sandstone_blocks', { color:new T.Color('#b9946c') }),
    stoneDark:new T.MeshStandardMaterial({ color:'#3a2c22', roughness:0.9 }),
    iron:new T.MeshStandardMaterial({ color:'#15120f', metalness:0.55, roughness:0.45 }),
    wire:new T.MeshStandardMaterial({ color:'#1c1a1a', metalness:0, roughness:0.9 }),
    glass:new T.MeshStandardMaterial({ color:'#0a0d14', metalness:0.2, roughness:0.05, transparent:true, opacity:0.28, depthWrite:false }),
    frame:new T.MeshStandardMaterial({ color:'#3a291c', roughness:0.6 }),
    asphalt:pbr('asphalt_02', { color:new T.Color('#5a5a66'), roughness:0.42 }),
    pave:pbr('red_sandstone_pavement', { color:new T.Color('#9a7c66'), roughness:0.55 }),
    kerb:pbr('large_sandstone_blocks', { color:new T.Color('#8a7a6e') }),
    rail:new T.MeshStandardMaterial({ color:'#9a9aa0', metalness:0.9, roughness:0.22 }),
    lampHead:new T.MeshBasicMaterial({ color:new T.Color(4, 3.1, 2.0) }),
    roomDark:new T.MeshBasicMaterial({ color:'#040506' }),
    roomWalls:new T.MeshStandardMaterial({ color:'#120d0a', roughness:0.9, side:T.BackSide }),
    roomLit:new T.MeshBasicMaterial({ color:new T.Color(7.5, 3.9, 1.5), side:T.BackSide }),
  };
  return M;
}
/* the sky behind: indigo high, the city's warm glow low (the style bible's colours) */
function skyTexture(){ const c=document.createElement('canvas'); c.width=4; c.height=256; const x=c.getContext('2d'), g=x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#131220'); g.addColorStop(0.45, '#1b1a2b'); g.addColorStop(0.78, '#5a3a4a'); g.addColorStop(1, '#8a5a44'); x.fillStyle=g; x.fillRect(0, 0, 4, 256); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; }
const DEPTH_V=`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position, 1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DEPTH_F=`precision highp float; varying vec3 vW; uniform vec2 uDA[${DEPTH.anchors.length}];
float depthOf(float d){ if(d<=uDA[0].x) return uDA[0].y*d/uDA[0].x; for(int i=1;i<${DEPTH.anchors.length};i++){ if(d<=uDA[i].x) return mix(uDA[i-1].y, uDA[i].y, log(d/uDA[i-1].x)/log(uDA[i].x/uDA[i-1].x)); }
  return min(0.99, uDA[${DEPTH.anchors.length-1}].y+0.03*log(d/uDA[${DEPTH.anchors.length-1}].x)); }
void main(){ float v=depthOf(length(vW-cameraPosition)); gl_FragColor=vec4(v, v, v, 1.); }`;
const COMP_F=`precision highp float; varying vec2 vUv; uniform sampler2D uMain, uMirror, uMask; uniform vec2 uPx;
void main(){ vec3 c=texture2D(uMain, vUv).rgb; float m=texture2D(uMask, vUv).r;
  if(m>0.003){ vec3 r=vec3(0.); float wsum=0.;   /* the mirror streaked downwards and a little sideways, as wet asphalt smears a reflection */
    for(int k=-14;k<=14;k++){ float t=float(k)/14., w=exp(-t*t*2.5); r+=texture2D(uMirror, vUv+vec2(sin(float(k)*1.7)*1.5*uPx.x, t*46.*uPx.y)).rgb*w; wsum+=w; }
    c+=r/wsum*m; }
  gl_FragColor=vec4(c, 1.); }`;

/* opts: { w, h (output px), ss (supersampling), fov (vertical, degrees), cam [x, y, z], at [x, y, z], bays, lives: 'dark' | 'lit' } */
window.bake=async function(opts){
  const t0=performance.now(), ss=opts.ss||2, W=opts.w*ss, H=opts.h*ss;
  const canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true });
  r.setPixelRatio(1); r.setSize(W, H, false); r.physicallyCorrectLights=true; r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=opts.exposure||0.14;
  r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap;
  const M=materials(), lifeMats=[];
  const out={}, scene=new T.Scene(); scene.background=skyTexture();
  const n=(opts.bays||11)*FACADE.floors, lives=[]; for(let i=0;i<n;i++){ if(opts.lives!=='lit'){ lives.push(null); continue; }
    const t=new T.CanvasTexture(lifeCanvas(i%6, i+3)); t.encoding=T.sRGBEncoding; const m=new T.MeshBasicMaterial({ map:t, color:new T.Color(9, 8.2, 7.4) }); lifeMats.push(m); lives.push(m); }
  const F=buildFacade(T, M, { bays:opts.bays||11, lives }); scene.add(F.group);
  F.group.traverse(o=>{ if(o.isMesh && o.geometry.attributes.uv && !o.geometry.attributes.uv2) o.geometry.setAttribute('uv2', o.geometry.attributes.uv); });
  /* the lights: the street lamps (soft shadows: the balconies' and cornices' shadows thrown up the plaster), the city's warm glow from below, the sky */
  for(const p of F.lamps){ const L=new T.PointLight('#ffc27a', 1500, 0, 2); L.position.set(...p); L.castShadow=true; L.shadow.mapSize.set(2048, 2048); L.shadow.bias=-0.0015; L.shadow.radius=3; scene.add(L); }
  scene.add(new T.HemisphereLight('#2c2c55', '#5a3a26', 0.12));
  { const d=new T.DirectionalLight('#ffb070', 0.06); d.position.set(F.width/2-10, 1, 60); d.target.position.set(F.width/2, 12, 0); scene.add(d, d.target); }
  /* (a lit room glows by its own walls and life — no light per room: dozens of point lights exceed a laptop GPU's uniforms and the programs fail to link) */
  const cam=new T.PerspectiveCamera(opts.fov, W/H, 0.5, 6000); cam.position.set(...opts.cam); cam.lookAt(new T.Vector3(...opts.at));
  await new Promise(res=>{ const check=()=>{ if([...texCache.values()].every(t=>t.image && t.image.complete)) res(); else setTimeout(check, 50); }; check(); });
  const rt=()=>new T.WebGLRenderTarget(W, H, { minFilter:T.LinearFilter, magFilter:T.LinearFilter, encoding:T.sRGBEncoding });
  const RTm=rt(), RTr=rt(), RTk=rt();
  /* the main render */
  r.setRenderTarget(RTm); r.render(scene, cam);
  /* the mirror: the world flipped under the street (the street itself hidden, every face drawn: the flip turns the winding) */
  const wet=[]; F.group.traverse(o=>{ if(o.isMesh && (o.material===M.asphalt || o.material===M.pave || o.material===M.kerb || o.material===M.rail)) wet.push(o); });
  const mats=new Set(); F.group.traverse(o=>{ if(o.isMesh) mats.add(o.material); }); for(const m of mats) m.side=T.DoubleSide;
  F.group.scale.y=-1; for(const o of wet) o.visible=false; r.setRenderTarget(RTr); r.render(scene, cam); F.group.scale.y=1; for(const o of wet) o.visible=true;
  for(const m of mats) m.side= m===M.roomWalls || m===M.roomLit ? T.BackSide : T.FrontSide;
  /* the wet mask: the asphalt wet (puddles by a seeded noise), the pavement a little, everything else dry */
  { const keep=new Map(), noise=document.createElement('canvas'); noise.width=noise.height=256; const nx=noise.getContext('2d'); nx.fillStyle='#777'; nx.fillRect(0, 0, 256, 256);
    let s=7; const R=()=>((s=(s*16807)%2147483647)/2147483647); for(let k=0;k<70;k++){ const g=nx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); nx.save(); nx.translate(R()*256, R()*256); nx.scale(10+R()*30, 4+R()*10); nx.fillStyle=g; nx.beginPath(); nx.arc(0, 0, 1, 0, 7); nx.fill(); nx.restore(); }
    const nt=new T.CanvasTexture(noise); nt.wrapS=nt.wrapT=T.RepeatWrapping; nt.repeat.set(0.05, 0.05);
    const black=new T.MeshBasicMaterial({ color:'#000' }), road=new T.MeshBasicMaterial({ map:nt, color:new T.Color(0.75, 0.75, 0.75) }), pave=new T.MeshBasicMaterial({ color:new T.Color(0.22, 0.22, 0.22) });
    F.group.traverse(o=>{ if(!o.isMesh) return; keep.set(o, o.material); o.material= o.material===M.asphalt ? road : o.material===M.pave ? pave : black; });
    const bg=scene.background; scene.background=new T.Color('#000'); const tm=r.toneMapping; r.toneMapping=T.NoToneMapping; r.setRenderTarget(RTk); r.render(scene, cam); r.toneMapping=tm; scene.background=bg;
    for(const [o, m] of keep) o.material=m; }
  /* the composite to the canvas, then filtered down to the output size */
  const quad=new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms:{ uMain:{ value:RTm.texture }, uMirror:{ value:RTr.texture }, uMask:{ value:RTk.texture }, uPx:{ value:new T.Vector2(1/W, 1/H) } },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`, fragmentShader:COMP_F, depthTest:false, toneMapped:false }));
  const qs=new T.Scene(); qs.add(quad); const oc=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const down=(name, type, q)=>{ const c=document.createElement('canvas'); c.width=opts.w; c.height=opts.h; const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(canvas, 0, 0, opts.w, opts.h); out[name]=c.toDataURL(type, q); };
  const enc=r.outputEncoding; r.outputEncoding=T.LinearEncoding; r.setRenderTarget(null); r.render(qs, oc); r.outputEncoding=enc;
  down('colour', 'image/webp', 0.9);
  /* the depth map by the room's law (the sky: 1) */
  { const dm=new T.ShaderMaterial({ uniforms:{ uDA:{ value:DEPTH.anchors.map(a=>new T.Vector2(a[0], a[1])) } }, vertexShader:DEPTH_V, fragmentShader:DEPTH_F });
    scene.overrideMaterial=dm; const bg=scene.background; scene.background=new T.Color(1, 1, 1); const tm=r.toneMapping; r.toneMapping=T.NoToneMapping; const e2=r.outputEncoding; r.outputEncoding=T.LinearEncoding;
    r.setRenderTarget(null); r.render(scene, cam); r.toneMapping=tm; r.outputEncoding=e2; scene.background=bg; scene.overrideMaterial=null; down('depth', 'image/png'); }
  /* the window map: every window's rectangle (its arch's box, projected) and its depth by the law */
  const depthOf=d=>{ const A=DEPTH.anchors; if(d<=A[0][0]) return A[0][1]*d/A[0][0]; for(let i=1;i<A.length;i++) if(d<=A[i][0]) return A[i-1][1]+(A[i][1]-A[i-1][1])*Math.log(d/A[i-1][0])/Math.log(A[i][0]/A[i-1][0]); return 0.95; };
  const windows=F.windows.map(w=>{ const pts=[[w.xc-w.w/2, w.y0], [w.xc+w.w/2, w.y0], [w.xc-w.w/2, w.y0+w.h], [w.xc+w.w/2, w.y0+w.h]].map(([x, y])=>new T.Vector3(x, y, -0.32).project(cam));
    const xs=pts.map(p=>(p.x*0.5+0.5)*opts.w), ys=pts.map(p=>(0.5-p.y*0.5)*opts.h), c=new T.Vector3(w.xc, w.y0+w.h/2, 0);
    return { id:w.i, bay:w.bay, floor:w.floor, x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys), depth:+depthOf(c.distanceTo(cam.position)).toFixed(4) }; })
    .filter(w=>w.x+w.w>0 && w.x<opts.w && w.y+w.h>0 && w.y<opts.h);
  for(const t of [RTm, RTr, RTk]) t.dispose(); r.dispose();
  return { images:out, windows, ms:Math.round(performance.now()-t0) };
};
window.bakeReady=true;
/* THE ROOM's DEPTH BLUR applied to a baked picture (the view pass's method on the CPU: four copies — sharp, and blurred to a third, two thirds and the
   whole widest radius — blended per pixel by |depth − focus depth| × K): colour and depth data URLs, the focus depth, K, the widest radius (px) →
   a WebP data URL */
window.depthBlur=async function(colour, depth, fd, K, Rpx){
  const img=u=>new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=u; }), C=await img(colour), D=await img(depth), w=C.width, h=C.height;
  const cv=()=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
  const levels=[0, Rpx/3, 2*Rpx/3, Rpx].map(r=>{ const c=cv(), x=c.getContext('2d'); if(r>0) x.filter=`blur(${(r/2).toFixed(1)}px)`; x.drawImage(C, 0, 0); return x.getImageData(0, 0, w, h).data; });
  const dc=cv(), dx=dc.getContext('2d'); dx.drawImage(D, 0, 0); const dd=dx.getImageData(0, 0, w, h).data, oc=cv(), ox=oc.getContext('2d'), od=ox.createImageData(w, h);
  for(let p=0;p<w*h;p++){ const r=Math.min(1, Math.abs(dd[p*4]/255-fd)*K)*3, i=Math.min(2, Math.floor(r)), t=r-i, a=levels[i], b=levels[i+1];
    for(let k=0;k<3;k++) od.data[p*4+k]=a[p*4+k]+(b[p*4+k]-a[p*4+k])*t; od.data[p*4+3]=255; }
  ox.putImageData(od, 0, 0); return oc.toDataURL('image/webp', 0.9);
};
