/* RAIN-10 — THE LIFE SHEET (dev tool and the rows' drawing): the room's own life shader (rooms/rain/rain-glass.js LIFE_V / LIFE_F) draws chosen items
   on a transparent canvas, with the room's uniforms. Used by the rows (tools/probes/night/rain10.js) and by the captures (tools/rain-snap.mjs --sheet).
   items: [{ x, y (the foot, view units), hw, hh (half width, half height), k (kind), ph, c (code), a, dep }]; o: { W, H, tan (view half size [x, y]),
   foc ([depth, K, widest radius, plateau]), win (the border window 0/1), time, wind, depth ({ tex, ext } a depth map and its extent: the depth test),
   occl (0: the depth test off — the CONTROL), alphaOff (every pixel opaque — the CONTROL of an opaque quad), done (the renderer released after this sheet) } → { px (RGBA, rows bottom-up), W, H, url? (o.url: a PNG data URL), dispose() } */
/* ONE renderer for every sheet of a row (a WebGL context per sheet made the browser take the room's own context away): sheetRenderer(T, W, H), sheetDone() */
let RR=null;
export function sheetRenderer(T, W, H){ if(!RR){ const canvas=document.createElement('canvas'); RR={ canvas, r:new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true, alpha:true, premultipliedAlpha:true }) }; RR.r.setPixelRatio(1); }
  RR.r.setSize(W, H, false); return RR; }
export function sheetDone(){ if(RR){ RR.r.dispose(); RR.r.forceContextLoss(); RR=null; } }
export async function lifeSheet(items, o={}){
  const H=await import('../../../apps/night/scene/host.js'), T=await H.loadThree(), G=await import('../../../apps/night/rooms/rain/rain-glass.js'), { cv }=await import('../../../core/palette.js');
  const W=o.W||512, Hh=o.H||256, { canvas, r }=sheetRenderer(T, W, Hh); r.setClearColor(o.bg==null ? 0x000000 : o.bg, o.bg==null ? 0 : 1);
  const N=items.length, g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]);
  const R4=new Float32Array(N*4), K4=new Float32Array(N*4), D1=new Float32Array(N);
  items.forEach((q, i)=>{ R4.set([q.x, q.y, q.hw, q.hh], i*4); K4.set([q.k, q.ph||0, q.c||0, q.a==null ? 1 : q.a], i*4); D1[i]=q.dep==null ? 0.5 : q.dep; });
  g.setAttribute('aRect', new T.InstancedBufferAttribute(R4, 4)); g.setAttribute('aK', new T.InstancedBufferAttribute(K4, 4)); g.setAttribute('aDep', new T.InstancedBufferAttribute(D1, 1)); g.instanceCount=N;
  const pal=cv, C=n=>new T.Color(pal('rain-'+n)), tan=o.tan||[1, Hh/W], f=o.foc||[0.5, 4, 0, 0], dm=o.depth||null;
  const blank=new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, T.RGBAFormat); blank.needsUpdate=true;
  const u={ uTan:{ value:new T.Vector2(tan[0], tan[1]) }, uFoc:{ value:new T.Vector4(f[0], f[1], f[2], f[3]) }, uPx:{ value:Hh/2/tan[1] }, uWin:{ value:o.win==null ? 1 : o.win },
    uGarA:{ value:C('garland-a') }, uGarB:{ value:C('garland-b') }, uGarC:{ value:C('garland-c') }, uGarD:{ value:C('garland-d') }, uWind:{ value:o.wind||0 }, uTime:{ value:o.time||0 },
    uSign:{ value:C('sign') }, uSignWarm:{ value:C('sign-warm') }, uCross:{ value:C('cross') }, uWalkR:{ value:C('walk-red') }, uWalkG:{ value:C('walk-green') }, uNavR:{ value:C('tail') }, uHead:{ value:C('head') },
    uDepthMap:{ value:dm ? dm.tex : blank }, uExt:{ value:new T.Vector2(dm ? dm.ext[0] : 1, dm ? dm.ext[1] : 1) }, uOccl:{ value:dm ? (o.occl==null ? 1 : o.occl) : 0 } };
  const m=new T.ShaderMaterial({ uniforms:u, vertexShader:G.LIFE_V, fragmentShader: o.alphaOff ? G.LIFE_F.replace('void main(){ main0();', 'void main(){ main0(); gl_FragColor.a=1.;') : G.LIFE_F, transparent:true, depthTest:false, depthWrite:false, toneMapped:false,
    blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const mesh=new T.Mesh(g, m); mesh.frustumCulled=false; const scene=new T.Scene(), cam=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); scene.add(mesh);
  r.clear(); r.render(scene, cam); const gl=r.getContext(), px=new Uint8Array(W*Hh*4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const url= o.url ? canvas.toDataURL('image/png') : null;
  g.dispose(); m.dispose(); blank.dispose(); if(o.done) sheetDone();
  return { px, W, H:Hh, url, tan, pxPerUnit:Hh/2/tan[1] }; }
