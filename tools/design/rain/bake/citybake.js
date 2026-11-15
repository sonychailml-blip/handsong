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
function livesAtlas(){ const c=document.createElement('canvas'); c.width=1024; c.height=768; const x=c.getContext('2d');
  for(let k=0;k<8;k++){ const cell=lifeCanvas(k%6, k*17+5); x.drawImage(cell, (k%4)*256, (1-Math.floor(k/4))*384); }   // rows: the atlas's v grows upwards (texture space)
  const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; }
function pool(){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), g=x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,190,110,0.55)'); g.addColorStop(0.5, 'rgba(255,170,90,0.16)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle=g; x.fillRect(0, 0, 128, 128); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; }
function materials(lives){
  const life=new T.MeshBasicMaterial({ map:lives, color:new T.Color(0.035, 0.032, 0.03) }), stripe=[std('#7a2a2a', { roughness:0.9, side:T.DoubleSide }), std('#e3d7bb', { roughness:0.9, side:T.DoubleSide })];
  const M={ trim:std('#cdb08a', { roughness:0.92 }), roof:std('#4a4c55', { roughness:0.55, metalness:0.15 }), chimney:std('#5a4a40'), tank:std('#6a6e74', { metalness:0.5, roughness:0.5 }),
    pot:std('#7a4a30'), bark:std('#6a6250'), leaf:['#24361e', '#2e4424', '#3a5230', '#1f3020'].map(c=>std(c, { roughness:0.9 })), crown:['#1e2a18', '#24321c', '#2a3a20'].map(c=>std(c, { roughness:0.95 })),
    dark:std('#141214'), skin:std('#6a4c3c'), coat:['#2a2a32', '#3a2a24', '#1c2430', '#4a3a2a', '#2c2c2c', '#5a2a2a'].map(c=>std(c)), umb:['#20283a', '#7a2a2a', '#2a4a3a', '#c8a040', '#3a3a3a', '#5a3a6a', '#b04a30', '#1e4a6a'].map(c=>std(c, { roughness:0.5, side:T.DoubleSide })),
    iron:std('#15120f', { metalness:0.55, roughness:0.45 }), frame:std('#3a291c', { roughness:0.6 }), wood:std('#5a3e28', { roughness:0.85 }), bike:std('#7a2a24', { metalness:0.4 }),
    glass:new T.MeshStandardMaterial({ color:'#0a0d14', metalness:0.2, roughness:0.05, transparent:true, opacity:0.3, depthWrite:false }),
    life, shut:['#3f5a46', '#5a4030', '#4a5664', '#6a5a3a'].map(c=>std(c)), cloth:['#e8e2d4', '#c45a4a', '#5a7ab0', '#e0c060', '#7aa070', '#d890a8', '#f0f0f0'].map(c=>std(c, { side:T.DoubleSide })),
    paneLit:glow(5, 2.8, 1.2), lantern:glow(6, 3.6, 1.5), shopLit:glow(5.5, 3.2, 1.5), shopDark:new T.MeshBasicMaterial({ color:'#06070a' }), dormerLit:glow(4.5, 2.6, 1.1),
    pave:pbr('red_sandstone_pavement', { color:new T.Color('#8a6c58'), roughness:0.5 }), prom:pbr('red_sandstone_pavement', { color:new T.Color('#9a806a'), roughness:0.45 }),
    asphalt:pbr('asphalt_02', { color:new T.Color('#55555f'), roughness:0.4 }), kerb:pbr('large_sandstone_blocks', { color:new T.Color('#8a7a6e') }), rail:std('#9a9aa0', { metalness:0.9, roughness:0.22 }),
    lampHead:glow(4, 3.1, 2.0), pool:new T.MeshBasicMaterial({ map:pool(), transparent:true, blending:T.AdditiveBlending, depthWrite:false }), kiosk:std('#3a4a3e'), stripe, table:std('#d8d0c0'), bulb:glow(6, 4.6, 2.6) };
  M.pool.userData.noShadow=true; M.glass.userData.noShadow=true; M.life.userData.noShadow=true;
  return M;
}
const DEPTH_V=`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position, 1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const DEPTH_F=`precision highp float; varying vec3 vW; uniform vec2 uDA[${DEPTH.anchors.length}];
float depthOf(float d){ if(d<=uDA[0].x) return uDA[0].y*d/uDA[0].x; for(int i=1;i<${DEPTH.anchors.length};i++){ if(d<=uDA[i].x) return mix(uDA[i-1].y, uDA[i].y, log(d/uDA[i-1].x)/log(uDA[i].x/uDA[i-1].x)); }
  return min(0.99, uDA[${DEPTH.anchors.length-1}].y+0.03*log(d/uDA[${DEPTH.anchors.length-1}].x)); }
void main(){ float v=depthOf(length(vW-cameraPosition)); gl_FragColor=vec4(v, v, v, 1.); }`;
const COMP_F=`precision highp float; varying vec2 vUv; uniform sampler2D uMain, uMirror, uMask; uniform vec2 uPx; uniform float uWet;
void main(){ vec4 c=texture2D(uMain, vUv); float m=texture2D(uMask, vUv).r*uWet;
  if(m>0.003){ vec3 r=vec3(0.); float wsum=0.; for(int k=-14;k<=14;k++){ float t=float(k)/14., w=exp(-t*t*2.5); r+=texture2D(uMirror, vUv+vec2(sin(float(k)*1.7)*1.5*uPx.x, t*46.*uPx.y)).rgb*w; wsum+=w; } c.rgb+=r/wsum*m; }
  gl_FragColor=c; }`;

window.cityBake=async function(o){
  const t0=performance.now(), px=o.px, ss=o.ss||2, W=Math.round(2*EXT[0]*px), H=Math.round(2*EXT[1]*px), RW=W*ss, RH=H*ss;
  const canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, alpha:true, preserveDrawingBuffer:true, premultipliedAlpha:false });
  r.setPixelRatio(1); r.setSize(RW, RH, false); r.physicallyCorrectLights=true; r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=o.exposure||0.1;
  r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap; r.setClearColor(0x000000, 0);
  const plaster=await new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=new URL('../tex/painted_plaster_wall_diff_1k.jpg', import.meta.url).href; });
  const lives=livesAtlas(), M=materials(lives), trees=cityTrees(), lamps=cityLamps();
  const B=camBasis(), cam=new T.PerspectiveCamera(2*Math.atan(EXT[1])*180/Math.PI, EXT[0]/EXT[1], 0.5, 6000);
  cam.position.set(CAM.x, CAM.y, CAM.z); cam.up.set(B.u[0], B.u[1], B.u[2]); cam.lookAt(CAM.x+B.f[0], CAM.y+B.f[1], CAM.z+B.f[2]); cam.updateMatrixWorld();
  await new Promise(res=>{ const check=()=>{ if([...cache.values()].every(t=>t.image && t.image.complete)) res(); else setTimeout(check, 50); }; check(); });
  const rt=()=>new T.WebGLRenderTarget(RW, RH, { minFilter:T.LinearFilter, magFilter:T.LinearFilter, encoding:T.sRGBEncoding });
  const RTm=rt(), RTr=rt(), RTk=rt(), images={}, counts={};
  const quad=new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({ uniforms:{ uMain:{ value:RTm.texture }, uMirror:{ value:RTr.texture }, uMask:{ value:RTk.texture }, uPx:{ value:new T.Vector2(1/RW, 1/RH) }, uWet:{ value:1 } },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0., 1.); }`, fragmentShader:COMP_F, depthTest:false, blending:T.NoBlending, toneMapped:false }));   // written as it is (its alpha says where the city is)
  const qs=new T.Scene(); qs.add(quad); const oc=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /* lay a render (the WebGL canvas) mirrored over a backdrop canvas, at the output size → a 2D canvas */
  const lay=(back)=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';
    if(back) x.drawImage(back, 0, 0, W, H); x.save(); x.translate(W, 0); x.scale(-1, 1); x.drawImage(canvas, 0, 0, W, H); x.restore(); return c; };
  const enc=(c, type, q)=>c.toDataURL(type, q);
  const small=(c, k)=>{ const d=document.createElement('canvas'); d.width=Math.round(c.width*k); d.height=Math.round(c.height*k); const x=d.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(c, 0, 0, d.width, d.height); return d; };
  let depthCanvas=null, winsOut=null;
  for(const mood of o.moods){
    const scene=new T.Scene(), C=buildCity(T, M, { plaster }, { mood, trees, lamps }); scene.add(C.group); counts[mood]={ meshes:C.group.children.length, windows:C.windows.length };
    /* lights: the nearest street lamps as real lights (the first ones with soft shadows), a cool sky fill, the city's warm glow from below */
    const near=C.lamps.map(p=>[p, Math.hypot(p[0]-CAM.x, p[2]-CAM.z)]).sort((a, b)=>a[1]-b[1]).slice(0, o.lights||10);
    near.forEach(([p], i)=>{ const L=new T.PointLight('#ffc27a', 1300, 0, 2); L.position.set(p[0], p[1]-0.3, p[2]); if(i<(o.shadows||3)){ L.castShadow=true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias=-0.002; L.shadow.radius=3; } scene.add(L); });
    scene.add(new T.HemisphereLight('#2c2c55', '#5a3a26', mood==='evening' ? 0.07 : 0.05));
    { const d=new T.DirectionalLight('#ffb070', 0.05); d.position.set(20, 2, 120); d.target.position.set(20, 15, 60); scene.add(d, d.target); }
    const back=backdropCanvas(EXT, px, LOOKS[mood]);
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
      const dm=new T.ShaderMaterial({ uniforms:{ uDA:{ value:DEPTH.anchors.map(a=>new T.Vector2(a[0], a[1])) } }, vertexShader:DEPTH_V, fragmentShader:DEPTH_F });
      scene.overrideMaterial=dm; const tm=r.toneMapping, e2=r.outputEncoding; r.toneMapping=T.NoToneMapping; r.outputEncoding=T.LinearEncoding; r.setRenderTarget(null); r.clear(); r.render(scene, cam);
      r.toneMapping=tm; r.outputEncoding=e2; scene.overrideMaterial=null; depthCanvas=lay(back.depth); images['depth.png']=enc(depthCanvas, 'image/png'); images['depth-s.png']=enc(small(depthCanvas, o.small), 'image/png');
      /* THE WINDOW MAP: each window projected by the law; kept when in the picture, wide enough, not hidden (the depth map at its centre is its own),
         nearest first, never overlapping a nearer one */
      const dx=depthCanvas.getContext('2d'), dAt=(u, v)=>{ const i=Math.round((u/EXT[0]*0.5+0.5)*W-0.5), j=Math.round((0.5-v/EXT[1]*0.5)*H-0.5); if(i<0 || j<0 || i>=W || j>=H) return -1; return dx.getImageData(i, j, 1, 1).data[0]/255; };
      const all=[]; for(const w of C.windows){ const q=w.corners.map(p=>project(p)); if(q.some(p=>p.z<=1)) continue; const xs=q.map(p=>p.x), ys=q.map(p=>p.y);
        const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys), c=project(w.centre), depth=depthOf(c.dist), hw=(x1-x0)/2, hh=(y1-y0)/2;
        if(hw<0.0024 || x1<-EXT[0] || x0>EXT[0] || y1<-EXT[1] || y0>EXT[1]) continue;
        const seen=dAt((x0+x1)/2, (y0+y1)/2); if(!(Math.abs(seen-depth)<0.025)) continue;
        all.push({ id:w.id, x:+((x0+x1)/2).toFixed(5), y:+((y0+y1)/2).toFixed(5), hw:+hw.toFixed(5), hh:+hh.toFixed(5), depth:+depth.toFixed(4), dist:+c.dist.toFixed(2), side:w.side, block:w.block, bay:w.bay, floor:w.floor, life:w.life, amb:+w.amb.toFixed(4), warm:+w.warm.toFixed(4) }); }
      all.sort((a, b)=>a.dist-b.dist); winsOut=[]; for(const w of all) if(!winsOut.some(q=>Math.abs(q.x-w.x)<q.hw+w.hw && Math.abs(q.y-w.y)<q.hh+w.hh)) winsOut.push(w);
    }
    C.group.traverse(q=>{ if(q.isMesh){ q.geometry.dispose(); if(q.material.map && q.material.map.isCanvasTexture && q.material.map!==lives) q.material.map.dispose(); } });
  }
  for(const t of [RTm, RTr, RTk]) t.dispose(); r.dispose();
  return { images, windows:winsOut, ms:Math.round(performance.now()-t0), counts, size:[W, H] };
};
window.cityBakeReady=true;
