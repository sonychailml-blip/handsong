/* NIGHT-9 — THE WATER'S MIRROR (a part of the night forest room; forest.js builds it after the paint pass). The water reflects what stands
   against the sky: the trunks, the branches, the crowns, the moon, its halo and the clouds, the stars — put on their own layer (MIRROR_LAYER;
   the lights join it, so no shader is compiled again). A camera mirrored in the water's plane draws that layer into a small picture; the
   water's shader projects each of its points with the same matrices (uMirM), bends it by the ripples and mixes it in by its Fresnel.
   Detailed: every frame (mirrorMs 0); Standard: a smaller picture redrawn every mirrorMs (the view hardly moves, so a picture a second old is
   still right — the cost of one small draw every 1.5 s). The glowing things that move (fireflies, the light) keep their own reflections in the
   water's shader (uGl). Nothing below the water draws into it (the ground and the stones are not on the layer). */
export const MIRROR_LAYER=4;
/* ctx: { T, s (scene), camera, lv (the level: waterMirror, mirrorMs, mirrorPx), y (the water's plane), WU (the water's uniforms), paint, silhouettes
   (objects that join the layer), own } */
export const MIRROR_LOOK=Object.freeze({ sky:0.85, fog:0.5 });   // the mirror's sky: the palette's sky colour × sky (brighter than the fog the eye sees), the fog × fog
export function buildMirror({ T, s, camera, lv, y, WU, paint, silhouettes, own, skyCol }){
  if(!lv.waterMirror){ WU.uMirK.value=0; return { render:()=>{}, state:()=>({ on:false, draws:0 }), sameRedrawDbg:()=>false, dispose:()=>{} }; }
  for(const o of silhouettes) if(o) o.traverse(c=>c.layers.enable(MIRROR_LAYER));
  s.traverse(o=>{ if(o.isLight) o.layers.enable(MIRROR_LAYER); });
  const px=lv.mirrorPx||256, rt=new T.WebGLRenderTarget(px, Math.max(16, px>>1), { depthBuffer:true, encoding:T.sRGBEncoding });
  rt.texture.generateMipmaps=false; rt.texture.minFilter=T.LinearFilter; own.push({ dispose:()=>rt.dispose() });
  const cam=new T.PerspectiveCamera(), bias=new T.Matrix4().set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1), look=new T.Vector3(), dir=new T.Vector3();
  cam.layers.set(MIRROR_LAYER);
  let last=-Infinity, draws=0, sized=0, sameRedraw=false; const sky=new T.Color();
  /* r: the renderer; now: ms of the room's clock — draws when due; force: always. CORE-20: one room frame, one mirror picture — a frame drawn twice
     (the probes' pairs) keeps it: a redraw would read the shadow map the frame's own draw just renewed, not the one it saw (exact under any load) */
  function render(r, now=performance.now(), force=false){
    if(!force && ((now===last && !sameRedraw) || (lv.mirrorMs>0 && now-last<lv.mirrorMs))) return false;
    last=now; draws++;
    const asp=camera.aspect; if(sized!==asp){ sized=asp; rt.setSize(px, Math.max(16, Math.round(px/Math.max(0.5, asp)))); }
    camera.updateMatrixWorld(); camera.getWorldDirection(dir);
    cam.fov=camera.fov; cam.aspect=asp; cam.near=camera.near; cam.far=camera.far; cam.updateProjectionMatrix();
    cam.position.set(camera.position.x, 2*y-camera.position.y, camera.position.z);
    look.copy(camera.position).add(dir); look.y=2*y-look.y; cam.up.set(0,1,0); cam.lookAt(look); cam.updateMatrixWorld();
    WU.uMirM.value.copy(bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    if(paint && paint.glowDepthOff) paint.glowDepthOff();
    const keepRT=r.getRenderTarget(), su=r.shadowMap.autoUpdate, ac=r.autoClear, bg=s.background, fd=s.fog ? s.fog.density : 0; r.shadowMap.autoUpdate=false; r.autoClear=true;
    if(skyCol){ sky.copy(skyCol).multiplyScalar(MIRROR_LOOK.sky); s.background=sky; } if(s.fog) s.fog.density=fd*MIRROR_LOOK.fog;   // the silhouettes against a brighter sky
    try{ r.setRenderTarget(rt); r.render(s, cam); } finally { r.setRenderTarget(keepRT); r.shadowMap.autoUpdate=su; r.autoClear=ac; s.background=bg; if(s.fog) s.fog.density=fd; }
    WU.tMir.value=rt.texture; WU.uMirK.value=1;
    return true;
  }
  const state=()=>({ on:true, draws, px:[rt.width, rt.height], every:lv.mirrorMs||0, y, sameRedraw });
  /* probe only: true = the old way (a frame drawn twice redraws its mirror) — the forest picture row's CONTROL */
  const sameRedrawDbg=v=>{ sameRedraw=!!v; return sameRedraw; };
  return { render, state, sameRedrawDbg, dispose:()=>{} };
}
