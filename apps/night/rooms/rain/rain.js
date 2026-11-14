/* RAIN-0 — THE RAIN ROOM's picture (docs/night/design/RAIN/CONCEPT.md; the plan and what is still a placeholder: PLAN.md). Built with three.js
   r128 through the scene host, as any room. RAIN-0b: a frame is
   0. (once per opening / resize / mood) THE CITY painted with its depth (rain-city.js, the view law's port), and three blurred copies of it;
   1. THE VIEW: the four copies blended per pixel by the depth map's blur (every depth its own sharpness), then the lit windows and the lights
      (lamps, far lights, cars, the tram, their reflections in the wet street), each grown by its own depth;
   2. its small SOFT COPY (what is seen through mist and inside a drop);
   3. THE DROP MAP: the simulated drops (pure/drops.js) as sprites;
   4. THE GLASS, to the screen: the drops as lenses, the fine droplets, the wet lanes, the MIST inside over all (the wipe map), the playing light.
   DEPTH IS FOCUS (pure/focus.js): the playing hand's depth pulls the focus from the glass through the street and the house opposite to the hills.
   A note with the focus far lights the window the light points at (pure/windows.js); near, a held pinch draws a clear stroke in the mist and a short
   note clears a spot (pure/glass.js). Every colour is a token (--cv-rain-*). Seeded: the same picture on every device. No sound, no network. */
import { seeded } from '../../../../core/pure/dsp.js';
import { roomFov, roomLook } from '../../pure/room.js';
import { natureFocus } from '../../roomswitch.js';
import { layersEvents, LAYERS } from '../../pure/layers.js';
import { heardMs } from '../../pure/heard.js';
import { MOOD_TC } from '../../pure/cycle.js';
import { RAIN_ROOM } from './pure/room.js';
import { FOCUS, focusTarget, focusStep, focusBlur, focusDepth, blurAt } from './pure/focus.js';
import { RAIN_SEED, windowsLayout, farLights, windowPick, windowLight } from './pure/windows.js';
import { GLASS, wipeNew, wipeStamp, wipeStroke, wipeStep, wipeAt, wipeCell } from './pure/glass.js';
import { DROPS, dropsNew, dropsRegion, dropAdd, dropsStep, dropStretch, dropsLedger, laneAt } from './pure/drops.js';
import { project, cityLamps, trafficAt, sceneAt, depthOf } from './pure/city.js';
import { QUAD_V, BLUR_F, VIEW_F, WIN_V, WIN_F, LIGHT_V, LIGHT_F, DROP_V, DROP_F, glassShader } from './rain-glass.js';
import { cityUniforms, CITY_F } from './rain-city.js';

export const RAIN_LEVELS=RAIN_ROOM.levels;
export const FINGER_GAP=0.25;   // s: a pinch counts as held this long after its last held moment or note-on
export const BOKEH=Object.freeze({ r:0.06, pad:0.02, lean:Object.freeze([0.03, 0.015]), breath:0.004 });   // the widest blur radius, the spill's reach, the pane's slide (view-angle units)
const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* nothing to fetch yet (the baked city's layers come with PLAN.md slice 1); the room's load awaits this as the forest's awaits its files */
export const rainAssets=()=>Promise.resolve({});

/* T — the THREE namespace; opt: { C (palette.cv), level, w, h, reduce, mood, lv (measurement overrides) } */
export function buildRain(T, opt){
  const C=opt.C, Lv={ ...(RAIN_LEVELS[opt.level]||RAIN_LEVELS.full), ...(opt.lv||{}) }, reduce=!!opt.reduce, own=[];
  const col=n=>new T.Color(C('rain-'+n));
  /* the mood's look: its colours (tokens) and amounts, eased towards a new mood's (τ MOOD_TC); a new look repaints the city once */
  const looks=new Map(), lookCols=L=>{ let c=looks.get(L.pre); if(!c){ c={}; for(const [k, n] of Object.entries(L.tokens)) c[k]=new T.Color(C(n)); looks.set(L.pre, c); } return c; };
  let moodId=opt.mood||null, look=roomLook(RAIN_ROOM, moodId), mistK=look.mist, rainK=look.rain, litK=look.lit, painted=null;
  const PANE=col('pane'), HONEY=col('honey'), AMBER=col('amber'), LAMP=col('lamp'), LIGHT=col('light'), TAIL=col('tail'), HEAD=col('head'), mistCol=lookCols(look).mist.clone();
  let W=opt.w, H=opt.h, tw=1, th=1, bw=0, bh=0, now=0, dirty=true, repaints=0, frames=0;

  /* ---- the passes: one scene, the pass's own meshes shown ---- */
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad=new T.PlaneGeometry(2, 2); own.push(quad);
  const flat={ depthTest:false, depthWrite:false, toneMapped:false }, add=(m, order)=>{ m.frustumCulled=false; m.renderOrder=order; scene.add(m); return m; };   // all shown outside a pass: the host compiles every program at the opening
  const mat=(o)=>{ const m=new T.ShaderMaterial({ ...flat, ...o }); own.push(m); return m; };
  const rt=(w, h)=>new T.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { minFilter:T.LinearFilter, magFilter:T.LinearFilter, format:T.RGBAFormat, depthBuffer:false, stencilBuffer:false, encoding:T.sRGBEncoding });   // the screen's encoding: one program per material (no shader here encodes or decodes)
  const RT={}; own.push({ dispose:()=>{ for(const k in RT){ RT[k].dispose(); delete RT[k]; } } });
  const FOC=new T.Vector3(0, FOCUS.K, BOKEH.r), UT=new T.Vector2(1, 1), UTIME={ value:0 }, UPX={ value:1 };   // the focus (depth, K, widest radius), the screen's half size, time, px per unit
  const cityU=cityUniforms(T), cityM=mat({ uniforms:cityU, vertexShader:QUAD_V, fragmentShader:CITY_F });
  const blurM=mat({ uniforms:{ uTex:{ value:null }, uDir:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:BLUR_F });
  const viewM=mat({ uniforms:{ uBase:{ value:null }, uL1:{ value:null }, uL2:{ value:null }, uL3:{ value:null }, uDepth:{ value:null }, uRad:{ value:new T.Vector3(0.004, 0.012, 0.04) }, uFoc:{ value:FOC },
    uTan:{ value:UT }, uLight:{ value:new T.Vector3() }, uLightCol:{ value:LIGHT } }, vertexShader:QUAD_V, fragmentShader:VIEW_F });
  const qCity=add(new T.Mesh(quad, cityM), 0), qBlur=add(new T.Mesh(quad, blurM), 0), qView=add(new T.Mesh(quad, viewM), 0);
  const unitQuad=()=>{ const g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]); own.push(g); return g; };
  const dyn=(arr, n)=>{ const a=new T.InstancedBufferAttribute(arr, n); a.setUsage(T.DynamicDrawUsage); return a; };

  /* the windows: one instance each, each with its depth */
  const WIN=windowsLayout(), wg=unitQuad();
  const lit=new Float32Array(WIN.length), litAt=new Float64Array(WIN.length).fill(-1e9), litAttr=dyn(lit, 1);
  wg.setAttribute('aRect', new T.InstancedBufferAttribute(new Float32Array(WIN.flatMap(w=>[w.x, w.y, w.hw, w.hh])), 4));
  wg.setAttribute('aWarm', new T.InstancedBufferAttribute(new Float32Array(WIN.map(w=>w.warm)), 1)); wg.setAttribute('aDepth', new T.InstancedBufferAttribute(new Float32Array(WIN.map(w=>w.depth)), 1));
  wg.setAttribute('aLit', litAttr); wg.instanceCount=WIN.length;
  const winM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPad:{ value:BOKEH.pad }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER } }, vertexShader:WIN_V, fragmentShader:WIN_F,
    transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const wins=add(new T.Mesh(wg, winM), 1);

  /* THE LIGHTS: static (the far lights on the hills and roofs, the lamps and their reflections) then dynamic (cars, the tram, their reflections) */
  const FAR=farLights(Lv.farLights), LAMPS=cityLamps(), CARS_MAX=Lv.cars|0 || 24, NL=FAR.length+LAMPS.length*2+CARS_MAX*4+24;
  const lg=unitQuad(), lRect=new Float32Array(NL*4), lCol=new Float32Array(NL*4), lDK=new Float32Array(NL*2), aRect=dyn(lRect, 4), aCol=dyn(lCol, 4), aDK=dyn(lDK, 2);
  lg.setAttribute('aRect', aRect); lg.setAttribute('aCol', aCol); lg.setAttribute('aDK', aDK);
  let nStatic=0, nLights=0;
  const put=(i, x, y, hw, hh, c, k, depth, kind)=>{ lRect.set([x, y, hw, hh], i*4); lCol.set([c.r, c.g, c.b, k], i*4); lDK[i*2]=depth; lDK[i*2+1]=kind; };
  /* a light at world point P (radius rad m) and, on the wet street, its reflection: a streak below its foot */
  const lightAt=(i, P, rad, c, k, refl, footY=0)=>{ const q=project(P); if(q.z<=1){ put(i, 9, 9, 0, 0, c, 0, 1, 0); return refl ? i+2 : i+1; }
    put(i, q.x, q.y, Math.max(rad/q.z, 0.0007), 0, c, k, depthOf(q.dist), 0); if(!refl) return i+1;
    const f=project([P[0], footY, P[2]]), m=project([P[0], 2*footY-P[1], P[2]]), top=f.y, bot=m.y-(f.y-m.y)*0.6, hh=Math.max(0.0005, (top-bot)/2);
    put(i+1, f.x, (top+bot)/2, Math.max(rad*1.6/q.z, 0.0008), hh, c, k*0.22, depthOf(q.dist), 1); return i+2; };
  { let i=0; FAR.forEach(q=>{ put(i++, q.x, q.y, 0.0017+0.0012*q.k, 0, HONEY.clone().lerp(AMBER, q.warm), 0.55+0.6*q.k, q.depth, 0); });
    for(const L of LAMPS) i=lightAt(i, L.p, 0.32, LAMP, 1, true); nStatic=i; }
  const EVT=RAIN_ROOM.nature.layers ? RAIN_ROOM.nature.layers.events : null, EVT_SEED=RAIN_ROOM.nature.layers ? ((RAIN_ROOM.nature.layers.seed>>>0) || LAYERS.seed)>>>0 : 0;
  let clock=null, dripsShown=0;
  function traffic(t){
    let i=nStatic; const cars=trafficAt(t, 1); let nc=0;
    for(const c of cars){ if(c.kind==='car'){ if(nc++>=CARS_MAX) continue;
        for(const s of [-0.78, 0.78]) i=lightAt(i, [c.x+s, 0.68, c.dir<0 ? c.z : c.z], 0.11, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 1 : 0.8, true); }
      else { for(let k=0;k<6;k++){ const z=c.z-c.dir*(2+k*4.3), q=project([c.x, 2.1, z]); if(q.z<=1) continue; const qw=project([c.x, 2.1, z+1.6]);
          put(i++, q.x, q.y, Math.max(0.0012, Math.abs(qw.x-q.x)+0.6/q.z), 0.55/q.z, HONEY, 0.75, depthOf(q.dist), 2); }
        i=lightAt(i, [c.x, 2.1, c.z-c.dir*12], 1.2, HONEY, 0.3, true); } }
    /* RAIN-3: the drips from the cornice, shown when heard — the same seeded schedule the room's sound plays (pure/layers.js), on the audio clock */
    if(clock && EVT){ const now=performance.now(), at=clock.ctx+(now-clock.perf)/1000;
      for(const e of layersEvents(EVT, EVT_SEED, at-0.5, at)) if(e.kind==='drip' && i<NL){ const p=(at-e.t)/0.45, pg=Math.min(1, heardMs(clock, e.t)<=now ? p : 0);
        if(pg<=0 || pg>=1) continue; put(i++, e.pan*tw*0.85, th*(1.02-1.5*pg), 0.0016, 0.012, LIGHT, 0.9*(1-pg)*e.amp/EVT.drips.gain, 0.04, 1); dripsShown++; } }
    for(let j=i;j<nLights;j++) lCol[j*4+3]=0;   // last frame's extra lights out
    nLights=Math.max(i, nStatic); lg.instanceCount=Math.max(nLights, 1); aRect.needsUpdate=aCol.needsUpdate=aDK.needsUpdate=true; return cars; }
  const lightM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX }, vertexShader:LIGHT_V, fragmentShader:LIGHT_F, transparent:true, blending:T.AdditiveBlending });
  const lights=add(new T.Mesh(lg, lightM), 2);

  /* THE DROPS: the simulation and its map */
  const SIM=dropsNew(RAIN_SEED^0x44524F50, { cap:Lv.drops }), DMAX=Math.ceil(Lv.drops*1.4)+64, dg=unitQuad();
  const dAt=new Float32Array(DMAX*3), dSh=new Float32Array(DMAX), dAttr=dyn(dAt, 3), sAttr=dyn(dSh, 1); dg.setAttribute('aDrop', dAttr); dg.setAttribute('aShape', sAttr); dg.instanceCount=0;
  const UOFF=new T.Vector2(), USOFT={ value:0 };
  const dropM=mat({ uniforms:{ uTan:{ value:UT }, uOff:{ value:UOFF }, uSoft:USOFT }, vertexShader:DROP_V, fragmentShader:DROP_F,
    transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const dropsMesh=add(new T.Mesh(dg, dropM), 3);
  function dropsUpload(){ const L=SIM.list, n=Math.min(L.length, DMAX); for(let i=0;i<n;i++){ const d=L[i]; dAt[i*3]=d.x; dAt[i*3+1]=d.y; dAt[i*3+2]=d.r; dSh[i]=dropStretch(d); }
    dg.instanceCount=n; dAttr.needsUpdate=sAttr.needsUpdate=true; }

  /* THE GLASS and its maps (r: the mist cleared, a: the fine droplets cleared by runners) */
  const wipe=wipeNew(), mapBytes=new Uint8Array(GLASS.cols*GLASS.rows*2), mapTex=new T.DataTexture(mapBytes, GLASS.cols, GLASS.rows, T.LuminanceAlphaFormat);
  mapTex.minFilter=mapTex.magFilter=T.LinearFilter; mapTex.generateMipmaps=false; mapTex.needsUpdate=true; own.push(mapTex);
  const glassM=mat({ uniforms:{ uView:{ value:null }, uSoft:{ value:null }, uDrop:{ value:null }, uWipe:{ value:mapTex }, uTan:{ value:UT }, uOff:{ value:UOFF }, uExt:{ value:new T.Vector2(GLASS.ext[0], GLASS.ext[1]) },
    uFloor:{ value:new T.Vector3(0, GLASS.mid[0], GLASS.mid[1]) }, uLight:{ value:new T.Vector2() }, uTime:UTIME, uRain:{ value:rainK }, uMist:{ value:mistK }, uG:{ value:0 }, uLightK:{ value:0 },
    uLightCol:{ value:LIGHT }, uMistCol:{ value:mistCol } }, vertexShader:QUAD_V, fragmentShader:glassShader(Lv.fine) });
  const qGlass=add(new T.Mesh(quad, glassM), 0), ALL=[qCity, qBlur, qView, wins, lights, dropsMesh, qGlass];
  const show=(...on)=>{ for(const m of ALL) m.visible=on.includes(m); };
  const pass=(r, target, ...on)=>{ show(...on); r.setRenderTarget(target); r.render(scene, camera); };
  const blur=(r, from, to, dx, dy)=>{ blurM.uniforms.uTex.value=from; blurM.uniforms.uDir.value.set(dx, dy); pass(r, to, qBlur); };
  const size=new T.Vector2(), keepClear=new T.Color();
  function targets(r){
    r.getDrawingBufferSize(size); const w=size.x, h=size.y; if(w===bw && h===bh) return; bw=w; bh=h;
    for(const k in RT){ RT[k].dispose(); delete RT[k]; }
    const q=(a, k)=>Math.max(2, Math.round(a/k));
    RT.base=rt(w, h); RT.l1=rt(q(w, 2), q(h, 2)); RT.t1=rt(q(w, 2), q(h, 2)); RT.l2=rt(q(w, 4), q(h, 4)); RT.t2=rt(q(w, 4), q(h, 4)); RT.l3=rt(q(w, 8), q(h, 8)); RT.t3=rt(q(w, 8), q(h, 8));
    RT.view=rt(w, h); RT.s1=rt(q(w, 4), q(h, 4)); RT.s2=rt(q(w, 4), q(h, 4)); RT.drop=rt(w, h);
    const V=viewM.uniforms; V.uBase.value=RT.base.texture; V.uL1.value=RT.l1.texture; V.uL2.value=RT.l2.texture; V.uL3.value=RT.l3.texture; V.uDepth.value=RT.base.texture;
    glassM.uniforms.uView.value=RT.view.texture; glassM.uniforms.uSoft.value=RT.s2.texture; glassM.uniforms.uDrop.value=RT.drop.texture; UPX.value=h/(2*th); dirty=true;
  }
  /* the city painted with its depth, and its three blurred copies: radii (view-angle units) from the blur rounds (σ of a 9-tap pass ≈ 1.5 steps) */
  function paint(r){
    const P=lookCols(look), U=cityU; U.uTan.value.copy(UT);
    for(const [u, k] of [['uSky', 'sky'], ['uCloud', 'cloud'], ['uGlow', 'glow'], ['uHaze', 'haze'], ['uStone', 'stone'], ['uPlaster', 'plaster'], ['uAsph', 'asphalt']]) U[u].value.copy(P[k]);
    U.uPane.value.copy(PANE); U.uLamp.value.copy(LAMP); pass(r, RT.base, qCity);
    const unit=2*th/bh, s1=1.5*2*Math.hypot(1, 2), s2=1.5*4*Math.hypot(1, 2), s3=1.5*8*Math.hypot(1, 2, 3);   // σ in full-size pixels
    blur(r, RT.base.texture, RT.t1, 1/RT.t1.width, 0); blur(r, RT.t1.texture, RT.l1, 0, 1/RT.l1.height); blur(r, RT.l1.texture, RT.t1, 2/RT.t1.width, 0); blur(r, RT.t1.texture, RT.l1, 0, 2/RT.l1.height);
    blur(r, RT.l1.texture, RT.t2, 1/RT.t2.width, 0); blur(r, RT.t2.texture, RT.l2, 0, 1/RT.l2.height); blur(r, RT.l2.texture, RT.t2, 2/RT.t2.width, 0); blur(r, RT.t2.texture, RT.l2, 0, 2/RT.l2.height);
    blur(r, RT.l2.texture, RT.t3, 1/RT.t3.width, 0); blur(r, RT.t3.texture, RT.l3, 0, 1/RT.l3.height); blur(r, RT.l3.texture, RT.t3, 2/RT.t3.width, 0); blur(r, RT.t3.texture, RT.l3, 0, 2/RT.l3.height);
    blur(r, RT.l3.texture, RT.t3, 3/RT.t3.width, 0); blur(r, RT.t3.texture, RT.l3, 0, 3/RT.l3.height);
    viewM.uniforms.uRad.value.set(2*s1*unit, 2*Math.hypot(s1, s2)*unit, 2*Math.hypot(s1, s2, s3)*unit);
    painted=look; repaints++;
  }
  /* one frame on the screen (the host calls it; a frame drawn twice is the same picture: nothing here steps the room) */
  let rr=null;   // the renderer of the last frame (the probes' read-back)
  function render(r){
    rr=r; targets(r); const keep=r.getRenderTarget();
    if(dirty){ dirty=false; paint(r); }
    pass(r, RT.view, qView, wins, lights);
    blur(r, RT.view.texture, RT.s1, 1.2/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, 1.2/RT.s2.height); blur(r, RT.s2.texture, RT.s1, 2.4/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, 2.4/RT.s2.height);
    r.getClearColor(keepClear); const ka=r.getClearAlpha(); r.setClearColor(0x000000, 0); show(dropsMesh); r.setRenderTarget(RT.drop); r.clear(true, false, false); r.render(scene, camera); r.setClearColor(keepClear, ka);
    pass(r, keep, qGlass); show(...ALL); frames++;
  }

  /* ---- the room's state: the focus, the playing light, the lean, the finger on the glass ---- */
  let focus=FOCUS.rest, target=FOCUS.rest, restOn=false, heldNow=0, pressAt=-1e9, lastPick=-1, picks=0, wipes=0, strokes=0, viewOver=null, finger=null, rainOver=null, simFrozen=false; const pickLog=[];
  const light={ x:0, y:0, on:0, d:0, glow:0.6 }, off={ x:0, y:0 };
  const toTan=(px, py)=>[(px/W*2-1)*tw, (1-py/H*2)*th];
  function resize(w, h, bufH){ W=w; H=h; const fov= viewOver && viewOver.fov ? viewOver.fov : roomFov(RAIN_ROOM.view, w, h); th=Math.tan(fov*Math.PI/360); tw=th*w/h; UT.set(tw, th);
    UPX.value=(bufH||bh||h)/(2*th); dropsRegion(SIM, tw, th); dirty=true; }
  /* one frame: hands = [{ x, y, d, play, glow }] (canvas pixels; d 0 near … 1 far); nin = the bus «nightSky» ({ mood }) */
  function update(dt, t, hands, fx, nin){
    now=t; UTIME.value=t;
    if(nin && nin.mood!==undefined && nin.mood!==moodId){ moodId=nin.mood; look=roomLook(RAIN_ROOM, moodId); }
    if(look!==painted && painted) dirty=true;
    { const a=1-Math.exp(-dt/MOOD_TC); mistK+=(look.mist-mistK)*a; rainK+=(look.rain-rainK)*a; litK+=(look.lit-litK)*a; mistCol.lerp(lookCols(look).mist, a); }
    const play=(hands||[]).find(h=>h.play);
    if(play){ const [x, y]=toTan(play.x, play.y); if(light.on<0.02){ light.x=x; light.y=y; } const k=1-Math.exp(-dt*13); light.x+=(x-light.x)*k; light.y+=(y-light.y)*k; light.d=play.d; light.glow=play.glow==null ? 0.6 : play.glow; }
    light.on+=((play ? 1 : 0)-light.on)*Math.min(1, dt*(play ? 6 : 2.5));
    target= play ? focusTarget(play.d) : FOCUS.rest; focus=focusStep(focus, target, dt, !!play);
    FOC.x=focusDepth(focus);
    natureFocus(focus);   // RAIN-3: the room's sound takes the same number (near: the pane; far: the street)
    /* the pane slides a little against the city as the camera leans towards the light and breathes (none at rest: the start still's pose) */
    { const k=(reduce ? 0.3 : 1)*(Lv.lean ? 1 : 0), gx= restOn || viewOver ? 0 : -clamp(light.x/Math.max(tw, 0.3), -1, 1)*BOKEH.lean[0]*light.on*k+(reduce ? 0 : Math.sin(t*0.19)*BOKEH.breath),
        gy= restOn || viewOver ? 0 : -clamp(light.y/Math.max(th, 0.3), -1, 1)*BOKEH.lean[1]*light.on*k+(reduce ? 0 : Math.sin(t*0.23)*BOKEH.breath), a= restOn ? 1 : 1-Math.exp(-dt*1.6);
      off.x+=(gx-off.x)*a; off.y+=(gy-off.y)*a; }
    /* A FINGER ON THE GLASS: near, with the pinch held, the light draws a continuous clear stroke from its last place to this one */
    const px=light.x+off.x, py=light.y+off.y;
    /* (the pinch counts as held through a note change: a note just begun is held for 0 s, so a short gap after the last held moment or note-on keeps the stroke whole) */
    if(heldNow>0) pressAt=t;
    if(t-pressAt<FINGER_GAP && light.on>0.5 && focus<0.5){ if(finger) { wipeStroke(wipe, finger[0], finger[1], px, py, 1-0.6*focus); strokes++; } finger=[px, py]; } else finger=null;
    const wl=wipeStep(wipe, dt);
    /* the rain on the pane */
    if(!simFrozen) dropsStep(SIM, dt, rainOver==null ? rainK : rainOver); dropsUpload();
    if(wl || wipe.live || SIM.laneLive || mapDirty){ mapDirty=wipe.live || SIM.laneLive; const A=wipe.a, Ln=SIM.lane; for(let i=0;i<A.length;i++){ mapBytes[i*2]=A[i]*255; mapBytes[i*2+1]=Ln[i]*255; } mapTex.needsUpdate=true; }
    for(let i=0;i<WIN.length;i++) lit[i]=windowLight(WIN[i], litK, t-litAt[i]);
    litAttr.needsUpdate=true; traffic(t);
    const B=focusBlur(focus);
    viewM.uniforms.uLight.value.set(light.x, light.y, light.on*focus*(0.5+0.5*light.glow));
    const G=glassM.uniforms; UOFF.set(off.x, off.y); G.uRain.value=rainK; G.uMist.value=mistK; G.uG.value=B.glass; USOFT.value=B.glass; G.uFloor.value.x=GLASS.floor*wipe.floorK;
    G.uLight.value.set(light.x, light.y); G.uLightK.value=light.on*(1-focus)*(0.5+0.5*light.glow);
  }
  let mapDirty=true;
  /* a note began on the playing hand: far — the window the light points at comes on; near — the mist under the light is wiped (a spot) */
  function glint(i, vel){ if(i!==0 || light.on<0.05) return; pressAt=now;
    if(focus>=0.45){ const k=windowPick(WIN, light.x, light.y); lastPick=k; if(k>=0){ litAt[k]=now; picks++; pickLog.push(k); if(pickLog.length>32) pickLog.shift(); } }
    if(focus<0.55){ wipeStamp(wipe, light.x+off.x, light.y+off.y, clamp((vel==null ? 0.6 : vel)*1.4, 0.5, 1)*(1-0.6*focus)); wipes++; } }
  /* a window on the screen (the view's px): its centre and half size */
  const windowAt=i=>{ const w=WIN[i]; return w ? { i, x:(w.x/tw*0.5+0.5)*W, y:(0.5-w.y/th*0.5)*H, r:w.hw/(2*tw)*W, inView:Math.abs(w.x)+w.hw<tw && Math.abs(w.y)+w.hh<th } : null; };
  /* the start's dot becomes the first lit window (the host's fly doors): a dark one near the deep middle of the picture */
  function flyPick(){ let best=null, bd=Infinity; WIN.forEach((w, i)=>{ const q=windowAt(i); if(!q.inView || lit[i]>0.05) return; const d=Math.hypot(q.x/W-0.6, q.y/H-0.5); if(d<bd){ bd=d; best=i; } }); return best; }
  const state=()=>({ now, focus, target, focusDepth:focusDepth(focus), blur:focusBlur(focus), light:{ ...light }, off:{ ...off }, windows:WIN.length, lit:Array.from(lit), litNow:lit.reduce((n, v)=>n+(v>0.05 ? 1 : 0), 0), lastPick, picks, pickLog:pickLog.slice(), wipes, strokes,
    wipe:{ live:wipe.live, wiped:wipe.wiped, floor:wipe.floorK, max:wipe.a.reduce((a, b)=>Math.max(a, b), 0) }, drops:{ n:SIM.list.length, running:SIM.list.filter(d=>d.mv).length, cap:SIM.cap, ledger:dropsLedger(SIM), t:SIM.t },
    mood:moodId, look:look.pre, mist:mistK, rain:rainK, share:litK, tan:[tw, th], buffer:[bw, bh], repaints, frames, fine:Lv.fine, far:FAR.length, lights:nLights });
  function texBytes(){ let b=GLASS.cols*GLASS.rows*2; for(const k in RT) b+=RT[k].width*RT[k].height*4; return b; }
  function dispose(){ for(const o of own) try{ o.dispose(); }catch(e){} own.length=0; }
  resize(W, H);
  /* the pane starts wet: drops scattered at once (they merge as they land), the simulation goes on from there */
  { const R=seeded(RAIN_SEED^0x57455421), [x0, y0, x1, y1]=SIM.region, n=Math.round(Lv.drops*(0.35+0.4*rainK)); for(let i=0;i<n;i++) dropAdd(SIM, x0+(x1-x0)*R(), y0+(y1-y0)*R(), DROPS.r0+Math.pow(R(), DROPS.rPow)*(DROPS.rSpan+DROPS.rSpanRain*rainK)); }
  return { id:RAIN_ROOM.id, scene, camera, update, resize, render, glint, state, dispose, texBytes, held:sec=>{ heldNow= sec>0 ? sec : 0; }, project:()=>null,
    heard:ck=>{ clock=ck; }, dripsDbg:()=>dripsShown,
    rest:on=>{ restOn=!!on; return restOn; }, restDbg:()=>({ rest:restOn, off:[off.x, off.y], fov:Math.atan(th)*360/Math.PI }),
    viewDbg:o=>{ viewOver=o||null; resize(W, H); return viewOver; },
    flyPick, flyAt:i=>{ const q=windowAt(i); return q ? { i, x:q.x, y:q.y, r:Math.max(1.5, q.r), glow:lit[i], dist:30, front:q.inView } : null; }, flyLand:i=>{ if(!WIN[i]) return false; litAt[i]=now; return true; },
    windowAt, wipeAtDbg:(x, y)=>wipeAt(wipe, x, y), wipeCellDbg:(x, y)=>wipeCell(wipe, x, y), laneAtDbg:(x, y)=>laneAt(SIM, x, y), focusDbg:v=>{ if(v!=null) focus=clamp(+v, 0, 1); return focus; },
    /* probes and captures: the drops as they are (a copy), the rain's strength held, the simulation frozen; the depth the picture holds at a view place, read back */
    dropsDbg:()=>SIM.list.map(d=>({ id:d.id, x:d.x, y:d.y, r:d.r, mv:d.mv })), rainDbg:v=>{ rainOver= v==null ? null : clamp(+v, 0, 1); return rainOver; }, freezeDbg:on=>{ simFrozen=!!on; return simFrozen; },
    lawDepthDbg:(x, y)=>sceneAt(x, y).depth, blurAtDbg:d=>blurAt(d, focus),
    /* a render target's pixels at view places ([x, y] view-angle units) → [r, g, b, a] 0…1 each; 'base' holds the city with its depth in a */
    rtReadDbg:(name, pts)=>{ const r=rr, T0=RT[name]; if(!T0 || !r) return null; const px=new Uint8Array(4); return pts.map(([x, y])=>{ const i=Math.round((x/tw*0.5+0.5)*T0.width-0.5), j=Math.round((y/th*0.5+0.5)*T0.height-0.5);
      r.readRenderTargetPixels(T0, clamp(i, 0, T0.width-1), clamp(j, 0, T0.height-1), 1, 1, px); return Array.from(px, v=>v/255); }); },
    radDbg:()=>({ rad:viewM.uniforms.uRad.value.toArray(), foc:FOC.toArray(), buffer:[bw, bh] }) };
}
