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
import { natureFocus, natureDensity, natureRain } from '../../roomswitch.js';
import { rainOf, streakOf, soundOf, lampOf, neonOf, windowsOf, easeTo } from './pure/fxlaw.js';   // RAIN-6: the effects hand in the rain
import { RAIN_FOCUS } from './heard.js';   // NIGHT-15: the last focus, for the sound while the picture is not drawn
import { layersEvents, LAYERS } from '../../pure/layers.js';
import { heardMs } from '../../pure/heard.js';
import { MOOD_TC, nightDeep } from '../../pure/cycle.js';
import { sleepWinAt, sleepWinKeep, sleepTraffic, sleepMine } from './pure/sleep.js';   // RAIN-6b (8): the city falls asleep with you
import { RAIN_ROOM } from './pure/room.js';
import { FOCUS, focusTarget, focusStep, focusBlur, focusDepth, focusPlateau, blurAt } from './pure/focus.js';
import { RAIN_SEED, windowsLayout, farLights, windowPick, windowLight, flyWindow } from './pure/windows.js';
import { GLASS, wipeNew, wipeStamp, wipeStroke, wipeStep, wipeAt, wipeCell } from './pure/glass.js';
import { DROPS, dropsNew, dropsRegion, dropAdd, dropsStep, dropStretch, dropsLedger, laneAt } from './pure/drops.js';
import { winQuad } from './pure/windows.js';   // RAIN-2: a window's projected quad
import { CAM, project, cityLamps, trafficAt, trafficDensity, sceneAt, depthOf, BAKE_EXT, DENS_MARGIN, STREET, vanishing } from './pure/city.js';
import { passBook, passBookSet } from '../../pure/passes.js';   // RAIN-2: the density book
import { lifeAt, lifeCyclists, LIFE, LK, UMB } from './pure/life.js';
import { vehicleItems, taxiAt, VK, sweepAt, SWEEP } from './pure/vehicles.js';   // RAIN-6b (1, 3): the vehicles' bodies, the taxi
import { skyAt } from './pure/sky.js';
import { FAR_LIFE, hillTop, slope, farCars, blink, twinkle, cableAt, farEventAt, smokerGlow } from './pure/far.js';   // RAIN-5d: life far away
const frac1=x=>x-Math.floor(x);
import { winGarland, winEventAt, winOnOff } from './pure/windows.js';   // RAIN-5c: life in the windows   // RAIN-5c: the sky's clouds, moon, searchlight and aircraft   // RAIN-5: the people and the street's small life
import { showDue, flashOf, breathOf, SHOWN } from './pure/shown.js';   // RAIN-5: the music shown when heard
import { QUAD_V, BLUR_F, DOWN_F, VIEW_F, WIN_V, WIN_F, LIGHT_V, LIGHT_F, DROP_V, DROP_F, LIFE_V, LIFE_F, glassShader } from './rain-glass.js';
import { CARS, BAKED_OF, seenOf, frameOf, cellOf } from './pure/carsprites.js';   // RAIN-8 (3a): the baked cars
import { cityUniforms, CITY_F, BAKED_F } from './rain-city.js';

export const RAIN_LEVELS=RAIN_ROOM.levels;
export const FINGER_GAP=0.25;   // s: a pinch counts as held this long after its last held moment or note-on
export const BOKEH=Object.freeze({ r:0.06, pad:0.02, lean:Object.freeze([0.03, 0.015]), breath:0.004 });   // the widest blur radius, the spill's reach, the pane's slide (view-angle units)
const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* RAIN-1: THE BAKED CITY's files for a level (tools/rain-bake.mjs --city): each mood's colour (windows dark), the lit windows' colour, the depth map,
   and the window map (shared by the levels) → a promise of { moods: { late, evening, after }, lit, depth, windows } (images), or null when a file
   failed (the room then paints its stand-in). Once per session and level; a failure is forgotten, so a later opening asks again. */
const CITY=new Map(), CITY_MOODS=['late', 'evening', 'after'];
async function fileImage(url){ const r=await fetch(url); if(!r.ok) throw new Error(r.status+' '+url.pathname);
  const u=URL.createObjectURL(await r.blob()), img=new Image(); try{ img.src=u; await img.decode(); } finally { URL.revokeObjectURL(u); } return img; }
export function rainAssets(level='full'){
  const lv= level==='full' ? 'full' : 'reduced'; if(CITY.has(lv)) return CITY.get(lv);
  const at=f=>new URL(`./city/${f}`, import.meta.url);
  const p=Promise.all([...CITY_MOODS.map(m=>fileImage(at(`${lv}/${m}.webp`))), fileImage(at(`${lv}/lit.webp`)), fileImage(at(`${lv}/depth.png`)), fetch(at('windows.json')).then(r=>{ if(!r.ok) throw new Error(r.status+' windows.json'); return r.json(); })])
    .then(([late, evening, after, lit, depth, windows])=>({ moods:{ late, evening, after }, lit, depth, windows }), e=>{ CITY.delete(lv); console.warn('[rain] the baked city did not load — the stand-in paints it:', e); return null; });   // eslint-disable-line no-console
  CITY.set(lv, p); return p;
}

/* RAIN-R1: the level's city files here without the network? (a build's precache lists them «on demand»: cached once fetched). No precache (the
   repository, no worker) → true: the network serves them. The start waits on this, or on the prefetch, before Begin works (main.js) */
const RAIN_PRECACHE_PREFIX='handsong-night-precache-';   // sw.js PREFIX
export async function rainHas(level='full'){
  if(typeof navigator==='undefined' || !navigator.serviceWorker || !navigator.serviceWorker.controller || typeof caches==='undefined') return true;
  if(!(await caches.keys()).some(k=>k.startsWith(RAIN_PRECACHE_PREFIX))) return true;
  const lv= level==='full' ? 'full' : 'reduced', at=f=>new URL(`./city/${f}`, import.meta.url).href;
  for(const f of [...CITY_MOODS.map(m=>`${lv}/${m}.webp`), `${lv}/lit.webp`, `${lv}/depth.png`, 'windows.json']) if(!(await caches.match(at(f)))) return false;
  return true; }
/* T — the THREE namespace; opt: { C (palette.cv), level, w, h, reduce, mood, lv (measurement overrides) } */
export function buildRain(T, opt){
  const C=opt.C, Lv={ ...(RAIN_LEVELS[opt.level]||RAIN_LEVELS.full), ...(opt.light && RAIN_ROOM.light ? RAIN_ROOM.light : {}), ...(opt.lv||{}) }, reduce=!!opt.reduce, own=[];
  const col=n=>new T.Color(C('rain-'+n));
  /* the mood's look: its colours (tokens) and amounts, eased towards a new mood's (τ MOOD_TC); a new look repaints the city once */
  const looks=new Map(), lookCols=L=>{ let c=looks.get(L.pre); if(!c){ c={}; for(const [k, n] of Object.entries(L.tokens)) c[k]=new T.Color(C(n)); looks.set(L.pre, c); } return c; };
  let moodId=opt.mood||null, look=roomLook(RAIN_ROOM, moodId), mistK=look.mist, rainK=look.rain, litK=look.lit, painted=null;
  const PANE=col('pane'), HONEY=col('honey'), AMBER=col('amber'), WBASE=[col('honey'), col('amber')], TUNG=new T.Color(1.0, 0.56, 0.22), LEDW=new T.Color(0.86, 0.93, 1.0),   // RAIN-6c: the windows' own colours kept
    LAMP=col('lamp'), LIGHT=col('light'), TAIL=col('tail'), HEAD=col('head'), mistCol=lookCols(look).mist.clone();
  let W=opt.w, H=opt.h, tw=1, th=1, bw=0, bh=0, now=0, dirty=true, repaints=0, frames=0;

  /* ---- the passes: one scene, the pass's own meshes shown ---- */
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad=new T.PlaneGeometry(2, 2); own.push(quad);
  const flat={ depthTest:false, depthWrite:false, toneMapped:false }, add=(m, order)=>{ m.frustumCulled=false; m.renderOrder=order; scene.add(m); return m; };   // all shown outside a pass: the host compiles every program at the opening
  const mat=(o)=>{ const m=new T.ShaderMaterial({ ...flat, ...o }); own.push(m); return m; };
  const rt=(w, h)=>new T.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { minFilter:T.LinearFilter, magFilter:T.LinearFilter, format:T.RGBAFormat, depthBuffer:false, stencilBuffer:false, encoding:T.sRGBEncoding });   // the screen's encoding: one program per material (no shader here encodes or decodes)
  const RT={}; own.push({ dispose:()=>{ for(const k in RT){ RT[k].dispose(); delete RT[k]; } } });
  const FOC=new T.Vector4(0, FOCUS.K, BOKEH.r, FOCUS.plateau[0]), UT=new T.Vector2(1, 1), UTIME={ value:0 }, ULAMP={ value:0 }, UPX={ value:1 };   // the focus (depth, K, widest radius), the screen's half size, time, px per unit
  const cityU=cityUniforms(T), cityM=mat({ uniforms:cityU, vertexShader:QUAD_V, fragmentShader:CITY_F });
  /* RAIN-1: the baked city, when its files are here (the host awaited rainAssets): one texture per mood (only the current one on the GPU), the lit
     windows, the depth map; raw values (the bake wrote the screen's colours), no mipmaps */
  const BK=opt.city || null, imgTex=(img, lum)=>{ const t=new T.Texture(img); t.minFilter=t.magFilter=T.LinearFilter; t.generateMipmaps=false; t.wrapS=t.wrapT=T.ClampToEdgeWrapping; if(lum) t.format=T.LuminanceFormat; t.needsUpdate=true; own.push(t); return t; };
  const litTex= BK ? imgTex(BK.lit) : null, depTex= BK ? imgTex(BK.depth, true) : null, EXT=new T.Vector2(BAKE_EXT[0], BAKE_EXT[1]); let moodTex=null, moodKey=null;
  const bakedM= BK ? mat({ uniforms:{ uCity:{ value:null }, uDepthMap:{ value:depTex }, uTan:{ value:UT }, uExt:{ value:EXT }, uTexel:{ value:new T.Vector2(1/BK.depth.width, 1/BK.depth.height) }, uLampB:{ value:0 } }, vertexShader:QUAD_V, fragmentShader:BAKED_F }) : null;   // UI-1: uTexel — the far windows read round
  const moodOfLook=L=>Object.keys(RAIN_ROOM.looks).find(k=>RAIN_ROOM.looks[k]===L)||'late';
  const blurM=mat({ uniforms:{ uTex:{ value:null }, uDir:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:BLUR_F });
  const downM=mat({ uniforms:{ uTex:{ value:null }, uTexel:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:DOWN_F });   // small fixes: the mist's box downsample
  /* RAIN-7: THE CROWNS' MASK — where the baked city is nearer than the law's street over the promenade (the plane trees' crowns), read once on the CPU
     from the depth map, softened so a crown's edge stays put while its inside sways (VIEW_F); ?rain=nosway — still, as before */
  const swayOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nosway'));
  let crownTex=null; if(BK && swayOn) try{ const GW=200, GH=110, m=new Float32Array(GW*GH), cv=document.createElement('canvas'); cv.width=BK.depth.width; cv.height=BK.depth.height; const g=cv.getContext('2d'); g.drawImage(BK.depth, 0, 0); const D=g.getImageData(0, 0, cv.width, cv.height).data;
    for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const x=((i+0.5)/GW*2-1)*BAKE_EXT[0], y=(1-(j+0.5)/GH*2)*BAKE_EXT[1], L=sceneAt(x, y); if(L.kind!=='street' || !L.hit || L.hit[0]<STREET.alleyA-0.5 || L.hit[0]>STREET.alleyB) continue;
      const bd=D[(Math.min(cv.height-1, Math.floor((j+0.5)/GH*cv.height))*cv.width+Math.min(cv.width-1, Math.floor((i+0.5)/GW*cv.width)))*4]/255; if(bd<L.depth-0.015) m[j*GW+i]=1; }
    const b=new Uint8Array(GW*GH); for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ let a=0, w=0; for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const ii=i+di, jj=j+dj; if(ii<0 || jj<0 || ii>=GW || jj>=GH) continue; a+=m[jj*GW+ii]; w++; } b[(GH-1-j)*GW+i]=Math.round(255*Math.max(0, a/w-0.34)/0.66); }
    crownTex=new T.DataTexture(b, GW, GH, T.LuminanceFormat); crownTex.minFilter=crownTex.magFilter=T.LinearFilter; crownTex.generateMipmaps=false; crownTex.needsUpdate=true; own.push(crownTex); }catch(e){ crownTex=null; }
  const viewM=mat({ uniforms:{ uCrown:{ value:crownTex }, uCExt:{ value:new T.Vector2(BAKE_EXT[0], BAKE_EXT[1]) }, uSway:{ value:0 }, uStreak:{ value:new T.Vector2(0, 0.08) }, uTime:UTIME, uBase:{ value:null }, uL1:{ value:null }, uL2:{ value:null }, uL3:{ value:null }, uDepth:{ value:null }, uRad:{ value:new T.Vector3(0.004, 0.012, 0.04) }, uFoc:{ value:FOC },
    uTan:{ value:UT }, uLight:{ value:new T.Vector3() }, uLightCol:{ value:LIGHT },
    uSkyA:{ value:new T.Vector4() }, uMoon:{ value:new T.Vector4() }, uMoonPh:{ value:0.5 }, uBeam:{ value:new T.Vector4() }, uPlane:{ value:new T.Vector4() }, uPlaneC:{ value:new T.Vector3() },   // RAIN-5c: the sky (pure/sky.js)
    uCloudLit:{ value:new T.Color() }, uCloudDark:{ value:new T.Color() }, uMoonCol:{ value:col('moon') }, uBeamCol:{ value:col('beam') }, uRedCol:{ value:col('nav-red') }, uGreenCol:{ value:col('nav-green') }, uWhiteCol:{ value:col('nav-white') } }, vertexShader:QUAD_V, fragmentShader:VIEW_F });
  const qCity=add(new T.Mesh(quad, bakedM||cityM), 0), qBlur=add(new T.Mesh(quad, blurM), 0), qDown=add(new T.Mesh(quad, downM), 0), qView=add(new T.Mesh(quad, viewM), 0);
  const unitQuad=()=>{ const g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]); own.push(g); return g; };
  const dyn=(arr, n)=>{ const a=new T.InstancedBufferAttribute(arr, n); a.setUsage(T.DynamicDrawUsage); return a; };

  /* the windows: one instance each, each with its depth */
  const WIN= BK && Array.isArray(BK.windows) && BK.windows.length ? BK.windows : windowsLayout(), wg=unitQuad();   // RAIN-1: the bake's exact window map
  const lit=new Float32Array(WIN.length), litAt=new Float64Array(WIN.length).fill(-1e9), litAttr=dyn(lit, 1);
  wg.setAttribute('aRect', new T.InstancedBufferAttribute(new Float32Array(WIN.flatMap(w=>[w.x, w.y, w.hw, w.hh])), 4));
  { const Q=WIN.map(winQuad); wg.setAttribute('aQ0', new T.InstancedBufferAttribute(new Float32Array(Q.flatMap(q=>[q[0][0], q[0][1], q[1][0], q[1][1]])), 4)); wg.setAttribute('aQ1', new T.InstancedBufferAttribute(new Float32Array(Q.flatMap(q=>[q[2][0], q[2][1], q[3][0], q[3][1]])), 4)); }   // RAIN-2: its own projected quad
  wg.setAttribute('aWarm', new T.InstancedBufferAttribute(new Float32Array(WIN.map(w=>w.warm)), 1)); wg.setAttribute('aDepth', new T.InstancedBufferAttribute(new Float32Array(WIN.map(w=>w.depth)), 1));
  wg.setAttribute('aLit', litAttr); wg.instanceCount=WIN.length;
  const evArr=new Float32Array(WIN.length*4), evAttr=dyn(evArr, 4); for(let i=0;i<WIN.length;i++) evArr[i*4]=winGarland(i) ? 1 : 0; wg.setAttribute('aEv', evAttr);   // RAIN-5c: garland, event kind, its phase
  let winEv=null, winEvPrev=-1;
  const winM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPad:{ value:BOKEH.pad }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER }, uTime:UTIME, uGarA:{ value:col('garland-a') }, uGarB:{ value:col('garland-b') }, uGarC:{ value:col('garland-c') }, uGarD:{ value:col('garland-d') }, uLit:{ value:litTex }, uExt:{ value:EXT }, uBaked:{ value:BK ? 1 : 0 } }, vertexShader:WIN_V, fragmentShader:WIN_F,
    transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const wins=add(new T.Mesh(wg, winM), 1);

  /* THE LIGHTS: static (the far lights on the hills and roofs, the lamps and their reflections) then dynamic (cars, the tram, their reflections) */
  const FAR=farLights(Lv.farLights), LAMPS=cityLamps(), CARS_MAX=Lv.cars|0 || 24;
  /* RAIN-5c: the café terraces' string lights — warm bulbs on a sagging line, now and then a coloured one (life.js LIFE.bunting's line, a little lower) */
  const STRINGS=[], GAR=[col('garland-a'), col('garland-b'), col('garland-c'), col('garland-d')], WALK_R=col('walk-red'), WALK_G=col('walk-green');
  { const Bt=LIFE.bunting; for(const [a, b] of LIFE.tables.cafes) for(let z=a;z<=b;z+=0.6){ const u=((z-a)/Bt.posts)%1, sag=Bt.sag*4*u*(1-u), j=Math.round((z-a)/0.6); STRINGS.push({ p:[Bt.x-0.3, Bt.y-0.25-sag, z], c: j%5===2 ? GAR[1+(j%3)] : GAR[0], k:0.55 }); } }
  /* RAIN-5d: the far life (pure/far.js) — the hills' top cached on a grid once (the law's own scene), each far light shown only where the law sees the hills */
  const HOR=vanishing().horizon, TOPS=new Map(), topAt=u=>{ const k=Math.round(u*200); if(!TOPS.has(k)) TOPS.set(k, hillTop(k/200, sceneAt, HOR)); return TOPS.get(k); }, onHill=p=>p && sceneAt(p[0], p[1]).kind==='hills';
  const farDepth=sceneAt(0.6, HOR+0.03).depth||0.99, EMBER=col('ember'), TURN=col('turn'), BRIDGE=[]; { const B=FAR_LIFE.bridge; for(let k=0;k<B.lamps;k++){ const p=slope(B.u[0]+(B.u[1]-B.u[0])*k/(B.lamps-1), B.f, topAt, HOR); if(onHill(p)) BRIDGE.push(p); } }
  const NL=FAR.length+LAMPS.length*3+CARS_MAX*7+32+STRINGS.length+12+44;   // RAIN-8: + a pool per car, the musician's lamp and pool
  const lg=unitQuad(), lRect=new Float32Array(NL*4), lCol=new Float32Array(NL*4), lDK=new Float32Array(NL*2), aRect=dyn(lRect, 4), aCol=dyn(lCol, 4), aDK=dyn(lDK, 2);
  lg.setAttribute('aRect', aRect); lg.setAttribute('aCol', aCol); lg.setAttribute('aDK', aDK);
  /* RAIN-6b (6): WHAT THE EYE CAN SEE — the baked depth map, read once on the CPU, at a light's or a living thing's place: where the city there is nearer
     than the thing by more than CULL.m (far lights) or CULL.life (the street's lamps, cars and people), a house or a crown stands in front of it, so it
     is not drawn (the founder saw the hills' lights through the left row). ?rain=nocull or cullDbg(false): everything drawn as before (the forest's
     cull rule: the code stays, a switch turns it off). The stand-in (no bake) paints the law itself: nothing to cull */
  const conesOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nocones'));   // RAIN-7
  const CULL=Object.freeze({ far:0.8, m:0.03, life:0.06 }), SHOP=Object.freeze({ z:84, w:3.0, h:2.9 }), BUSKER=Object.freeze({ x:36.0, z:55 });   // RAIN-6b (4): the shop with the roller shutter; RAIN-8: the musician at the first café's awning edge, in its light, inside every screen's crop (an upright phone's too)
  let DPX=null, cullOn= !(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nocull')), culled=0;
  const bakedAt=(x, y)=>{ if(!BK) return 1; if(!DPX){ try{ const c=document.createElement('canvas'); c.width=BK.depth.width; c.height=BK.depth.height; const g=c.getContext('2d'); g.drawImage(BK.depth, 0, 0); DPX={ d:g.getImageData(0, 0, c.width, c.height).data, w:c.width, h:c.height }; }catch(e){ DPX={ d:null }; } }
    if(!DPX.d) return 1; const u=x/BAKE_EXT[0]*0.5+0.5, v=0.5-y/BAKE_EXT[1]*0.5; if(u<0 || u>1 || v<0 || v>1) return 1;
    return DPX.d[(clamp(Math.round(v*DPX.h-0.5), 0, DPX.h-1)*DPX.w+clamp(Math.round(u*DPX.w-0.5), 0, DPX.w-1))*4]/255; };
  const hidden=(x, y, dep, m)=>cullOn && !!BK && dep>0 && bakedAt(x, y)<dep-m;
  let nStatic=0, nLights=0;
  const put=(i, x, y, hw, hh, c, k, depth, kind)=>{ if(k>0 && kind===0 && hidden(x, y, depth, depth>CULL.far ? CULL.m : CULL.life)){ k=0; culled++; } lRect.set([x, y, hw, hh], i*4); lCol.set([c.r, c.g, c.b, k], i*4); lDK[i*2]=depth; lDK[i*2+1]=kind; };
  /* a light at world point P (radius rad m) and, on the wet street, its reflection: a streak below its foot */
  const lightAt=(i, P, rad, c, k, refl, footY=0)=>{ const q=project(P); if(q.z<=1){ put(i, 9, 9, 0, 0, c, 0, 1, 0); return refl ? i+2 : i+1; }
    put(i, q.x, q.y, Math.max(rad/q.z, 0.0007), 0, c, k, depthOf(q.dist), 0); if(!refl) return i+1;
    const f=project([P[0], footY, P[2]]), m=project([P[0], 2*footY-P[1], P[2]]), top=f.y, bot=m.y-(f.y-m.y)*0.6, hh=Math.max(0.0005, (top-bot)/2);
    put(i+1, f.x, (top+bot)/2, Math.max(rad*1.6/q.z, 0.0008), hh, c, k*0.22, depthOf(q.dist), 1); return i+2; };
  /* RAIN-8: a soft pool of light on the ground (the light layer's kind 4): centre (x, z), half sizes rx across, rz along (m) */
  const pool=(i, x, z, rx, rz, c, k)=>{ const q=project([x, 0.02, z]); if(q.z<=1) return i; const a=project([x+rx, 0.02, z]), f=project([x, 0.02, z+rz]), nn=project([x, 0.02, z-rz]);
    put(i, q.x, (f.y+nn.y)/2, Math.max(0.0015, Math.abs(a.x-q.x)), Math.max(0.0008, Math.abs(nn.y-f.y)/2), c, k, depthOf(q.dist), 4); return i+1; };
  const FARC=FAR.map(q=>HONEY.clone().lerp(AMBER, q.warm));   // RAIN-5d: the hill windows twinkle (put each frame in traffic())
  { let i=FAR.length;
    for(const L of LAMPS) i=lightAt(i, L.p, 0.32, LAMP, 1, true);
    /* RAIN-7: the rain seen in each lamp's light — a cone from its head to the street (the light layer's kind 3: a faint haze and the falling streaks lit) */
    if(conesOn) for(const L of LAMPS){ const hd=project([L.p[0], L.p[1]-0.3, L.p[2]]), ft=project([L.p[0], 0, L.p[2]]), ed=project([L.p[0]+3.2, 0, L.p[2]]); if(hd.z<=1 || ft.z<=1 || hd.dist>220) continue;
      put(i++, (hd.x+ft.x)/2, (hd.y+ft.y)/2, Math.max(0.002, Math.abs(ed.x-ft.x)), Math.max(0.002, (hd.y-ft.y)/2), LAMP, 0.9, depthOf(hd.dist), 3); }
    nStatic=i; }
  const EVT=RAIN_ROOM.nature.layers ? RAIN_ROOM.nature.layers.events : null, EVT_SEED=RAIN_ROOM.nature.layers ? ((RAIN_ROOM.nature.layers.seed>>>0) || LAYERS.seed)>>>0 : 0;
  let clock=null, dripsShown=0, dens=1, book=null, tAudio=null, lookOver=null, mistOver=null, depthPx=null;
  /* RAIN-1: the cars are drawn at the moment that is HEARD now (the audio clock, its output latency in it) — the sound plays each car's pass from the
     same law on that clock; without the clock (no sound yet) the room's own time */
  /* RAIN-5d: the hills' twinkling windows (one now and then dark), the winding road's cars, the masts and the tower, the cable car, the church, the
     bridge; the smoker's glow and the scooter's lamp (the rare events) */
  function farLights2(i, t){ const ev=farEventAt(t), P=(u, f)=>slope(u, f, topAt, HOR), dark= ev && ev.kind==='hillwin' && ev.u>0.15 && ev.u<0.85 ? Math.floor(ev.k*FAR.length) : -1;
    FAR.forEach((q, j)=>put(j, q.x, q.y, 0.0017+0.0012*q.k, 0, FARC[j], j===dark ? 0 : (0.66+0.7*q.k)*twinkle(t, j), q.depth, 0));   // RAIN-5e: ×1.2
    for(const c of farCars(t)){ const p=P(c.u, c.f); if(!onHill(p) || i>NL-4) continue; if(c.head) put(i++, p[0], p[1], 0.0022, 0, HEAD, 1.9, farDepth, 0); else put(i++, p[0], p[1], 0.0017, 0, TAIL, 1.35, farDepth, 0); }   // RAIN-5e: a little more visible; UI-1: the two headlights one round point (2 px apart they merged into a dash)
    for(const m of FAR_LIFE.masts){ const tp=topAt(m.u); if(tp!=null && sceneAt(m.u, tp+0.003).kind==='sky') put(i++, m.u, tp+0.003, 0.0017, 0, TAIL, 1.4*blink(t, m.hz, m.duty, m.ph), farDepth, 0); }
    { const T=FAR_LIFE.tower, tp=topAt(T.u); if(tp!=null) T.h.forEach((h, k)=>{ put(i++, T.u, tp+h, 0.0013, 0, TAIL, k===T.h.length-1 ? 1.2*blink(t, T.hz, T.duty) : 0.45, farDepth, 0); }); }
    for(const c of cableAt(t)){ const p=P(c.u, c.f); if(onHill(p)) put(i++, p[0], p[1], 0.0022, 0, HONEY, 1.25, farDepth, 0); }   // UI-1: a round point (it was a 2-px rectangle light)
    for(const e of [FAR_LIFE.cable.a, FAR_LIFE.cable.b]){ const p=P(e[0], e[1]); if(onHill(p)) put(i++, p[0], p[1], 0.0015, 0, LAMP, 0.7, farDepth, 0); }
    { const C=FAR_LIFE.church, p=P(C.u, C.f); if(onHill(p)){ put(i++, p[0], p[1], 0.006, 0, AMBER, 0.42, farDepth, 0); put(i++, p[0]+0.012, p[1]+0.006, 0.0012, 0, HONEY, 0.55, farDepth, 0); } }   // UI-1: the church window a round point too
    for(const p of BRIDGE) put(i++, p[0], p[1], 0.0011, 0, LAMP, 0.6, farDepth, 0);
    if(ev && ev.kind==='bridge' && BRIDGE.length>1){ const a=BRIDGE[0], b=BRIDGE[BRIDGE.length-1], q=ev.k<0.5 ? ev.u : 1-ev.u; put(i++, a[0]+(b[0]-a[0])*q, a[1]+(b[1]-a[1])*q+0.001, 0.0012, 0, ev.k<0.5 ? TAIL : HEAD, 0.8, farDepth, 0); }
    if(ev && ev.kind==='smoker'){ const S=FAR_LIFE.smoker; i=lightAt(i, [S.x, S.y, S.z], 0.035, EMBER, smokerGlow(ev.u, FAR_LIFE.events.dur.smoker, ev.k), false); }
    if(ev && ev.kind==='scooter'){ const S=FAR_LIFE.scooter; i=lightAt(i, [S.x, 1.0, S.z[0]+(S.z[1]-S.z[0])*ev.u], 0.06, HEAD, 0.9, true); }
    return i; }
  function traffic(t){
    tAudio= tHold!=null ? tHold : clock ? clock.ctx+(performance.now()-clock.perf)/1000 : null;   // RAIN-8: tHold — captures only (one moment of traffic for every trial version)
    let i=nStatic; const cars=trafficAt(tAudio==null ? t : tAudio, book||dens); let nc=0;   // RAIN-2: the book (every car decided before it enters)
    taxiNow= bodiesOn ? taxiAt(tAudio==null ? t : tAudio) : null;   // RAIN-6b (3): the taxi (its sounds read the same law on the audio clock)
    { const sw=bodiesOn ? sweepAt(tAudio==null ? t : tAudio) : null; if(sw && i<NL-2){ const a=project([STREET.opp-0.1, SWEEP.y, sw.z-3]), b=project([STREET.opp-0.1, SWEEP.y, sw.z+3]), c=project([STREET.opp-0.1, SWEEP.y+1.4, sw.z]);   // RAIN-7: a turning car's headlights sweep the house opposite
        if(a.z>1 && b.z>1) put(i++, (a.x+b.x)/2, (a.y+b.y)/2, Math.max(0.002, Math.abs(b.x-a.x)/2), Math.max(0.002, c.y-(a.y+b.y)/2), HEAD, 0.16*sw.k, depthOf(c.dist), 2); sweepNow=sw; } else sweepNow=null; }
    if(taxiNow){ const z=taxiNow.z, x=STREET.lanes[0].x-1.35, hz=blink(t, 1.5, 0.5);
      for(const s of [-0.78, 0.78]){ i=lightAt(i, [x+s, 0.68, z], 0.11, HEAD, 1, true); if(taxiNow.hazard && hz) i=lightAt(i, [x+(s<0 ? -0.95 : 0.95), 0.7, z], 0.08, TURN, 0.9, false); } }
    for(const c of cars){ if(c.kind==='car'){ if(nc++>=CARS_MAX) continue;
        for(const s of [-0.78, 0.78]) i=lightAt(i, [c.x+s, 0.68, c.dir<0 ? c.z : c.z], 0.11, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 1 : 0.8, true);
        if(carMode==='cine' && i<NL-2) i=pool(i, c.x, c.dir<0 ? c.z-5 : c.z-1.6, 1.3, c.dir<0 ? 4.5 : 1.8, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 0.2 : 0.12);   // RAIN-8 (3b): the headlights' pool ahead on the wet road, a red glow behind
        { const hc=frac1(Math.sin((c.id||c.t0||c.z)*91.7)*43758.5); if(hc<FAR_LIFE.turn.share && blink(t, FAR_LIFE.turn.hz, 0.5, hc*7)) i=lightAt(i, [c.x+(hc<FAR_LIFE.turn.share/2 ? -0.95 : 0.95), 0.7, c.z], 0.08, TURN, 0.9, false); } }   // RAIN-5d: now and then a car's turn signal
      else { for(let k=0;k<6;k++){ const z=c.z-c.dir*(2+k*4.3), q=project([c.x, 2.1, z]); if(q.z<=1) continue; const qw=project([c.x, 2.1, z+1.6]);
          put(i++, q.x, q.y, Math.max(0.0012, Math.abs(qw.x-q.x)+0.6/q.z), 0.55/q.z, HONEY, 0.75, depthOf(q.dist), 2); }
        i=lightAt(i, [c.x, 2.1, c.z-c.dir*12], 1.2, HONEY, 0.3, true); } }
    /* RAIN-3: the drips from the cornice, shown when heard — the same seeded schedule the room's sound plays (pure/layers.js), on the audio clock */
    if(clock && EVT){ const now=performance.now(), at=clock.ctx+(now-clock.perf)/1000;
      for(const e of layersEvents(EVT, EVT_SEED, at-0.5, at)) if(e.kind==='drip' && i<NL){ const p=(at-e.t)/0.45, pg=Math.min(1, heardMs(clock, e.t)<=now ? p : 0);
        if(pg<=0 || pg>=1) continue; put(i++, e.pan*tw*0.85, th*(1.02-1.5*pg), 0.0016, 0.012, LIGHT, 0.9*(1-pg)*e.amp/EVT.drips.gain, 0.04, 1); dripsShown++; } }
    for(const [x, z] of [[STREET.kerbA-0.9, 70], [STREET.kerbB+0.9, 72]]) i=lightAt(i, [x, signal ? 3.83 : 4.42, z], 0.2, signal ? GO : TAIL, 1.1, true);   // RAIN-5c: the crossing's lit lamp in its housing (life.js signals), larger
    for(const [x, z] of [[-0.5, 69.2], [13.5, 71.2]]) i=lightAt(i, [x, 2.45, z], 0.12, signal ? WALK_R : WALK_G, 0.8, true);   // RAIN-5c: the walkers' signal: red while the cars have green
    { const lk=moodOfLook(look); for(const c of lifeCyclists(t, lk)) i=lightAt(i, [c.x, 0.95, c.z], 0.07, c.view==='back' ? TAIL : HEAD, c.view==='back' ? 0.9*c.blink : 0.9, true); }   // RAIN-5c: the cyclist's lamp (its rear one blinking)
    for(const B of STRINGS) i=lightAt(i, B.p, 0.05, B.c, B.k*(0.85+0.15*Math.sin(t*1.7+B.p[2]*2.3)), false);   // RAIN-5c: the café's string lights
    if(bodiesOn && i<NL-4){ i=lightAt(i, [BUSKER.x+0.35, 2.5, BUSKER.z], 0.2, AMBER, 1.6, true); i=pool(i, BUSKER.x+0.1, BUSKER.z, 2.0, 2.0, AMBER, 0.6); }   // RAIN-8 (5): the musician's own lamp under the awning's edge and its pool of light round him
    i=farLights2(i, t);   // RAIN-5d: life far away
    { const tr=cars.find(c=>c.kind==='tram'), ag=now-sparkAt; if(tr && ag<SHOWN.spark) i=lightAt(i, [tr.x, STREET.wire, tr.z-tr.dir*3], 0.3, SPARK, 1.6*(1-ag/SHOWN.spark), false); }
    { const ag=now-flashAt; if(ag<SHOWN.flash){ const fl=(ag<0.08 || (ag>0.18 && ag<0.26)) ? 1 : 0.25; put(i++, -0.2, 0.32, 1.4, 0.22, FLASH, 0.18*fl*(1-ag/SHOWN.flash), 1, 2); } }
    for(let j=i;j<nLights;j++) lCol[j*4+3]=0;   // last frame's extra lights out
    nLights=Math.max(i, nStatic); lg.instanceCount=Math.max(nLights, 1); aRect.needsUpdate=aCol.needsUpdate=aDK.needsUpdate=true; return cars; }
  const lightM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX, uWin:{ value:1 }, uLamp:ULAMP, uTime:UTIME, uRainK:{ value:0 } }, vertexShader:LIGHT_V, fragmentShader:LIGHT_F, transparent:true, blending:T.AdditiveBlending });
  const lights=add(new T.Mesh(lg, lightM), 2);
  /* RAIN-5: THE PEOPLE AND THE STREET'S SMALL LIFE (pure/life.js): one draw, each item projected by the view law and sized by its distance, drawn
     over the city and under the windows and lights; and THE MUSIC SHOWN (pure/shown.js): the bed's events queued with their heard moment */
  /* RAIN-8 (3): THE CARS, two trial versions for the founder to pick (?rain=carsbaked | carscine | carsbox; carsDbg): 'baked' — the five modelled types
     rendered offline (pure/carsprites.js, cars/cars.webp, loaded only in this mode; the cinematic look stands in until it is here); 'cine' — no detailed
     body: a soft dark silhouette, the lamps' light on the wet roof and the glass, glints, the headlights' pools on the wet road, all softened as the rain
     and the glass would; 'box' — RAIN-6b's boxes (the probes' CONTROL). The trams' lit carriages are the same in all three. */
  const RAINQ=typeof location!=='undefined' ? (new URLSearchParams(location.search).get('rain')||'').split(',') : [];
  let carMode= RAINQ.includes('carsbox') ? 'box' : RAINQ.includes('carsbaked') ? 'baked' : RAINQ.includes('carscine') ? 'cine' : 'cine', carTex=null, carLoading=null;
  const carsLoad=()=>{ if(carTex || carLoading) return carLoading; carLoading=fileImage(new URL('./cars/cars.webp', import.meta.url)).then(img=>{ const t=new T.Texture(img); t.anisotropy=4; t.needsUpdate=true; own.push(t); carTex=t; lifeM.uniforms.uCars.value=t; carUni(); return true; }, e=>{ carLoading=null; console.warn('[rain] the baked cars did not load:', e); return false; }); return carLoading; };   // eslint-disable-line no-console
  const carUni=()=>{ lifeM.uniforms.uCarMode.value= carMode==='box' ? 0 : carMode==='baked' && carTex ? 1 : 2; };
  const NLIFE=480, fg=unitQuad(), fRect=new Float32Array(NLIFE*4), fK=new Float32Array(NLIFE*4), fD=new Float32Array(NLIFE), fRA=dyn(fRect, 4), fKA=dyn(fK, 4), fDA=dyn(fD, 1);
  fg.setAttribute('aRect', fRA); fg.setAttribute('aK', fKA); fg.setAttribute('aDep', fDA); fg.instanceCount=0; let lifeN=0;
  const lifeM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX, uWin:{ value:1 }, uGarA:{ value:col('garland-a') }, uGarB:{ value:col('garland-b') }, uGarC:{ value:col('garland-c') }, uGarD:{ value:col('garland-d') },
    uWind:{ value:0 }, uTime:UTIME, uSign:{ value:col('sign') }, uSignWarm:{ value:col('sign-warm') }, uCross:{ value:col('cross') }, uWalkR:{ value:col('walk-red') }, uWalkG:{ value:col('walk-green') }, uNavR:{ value:TAIL }, uHead:{ value:HEAD }, uCars:{ value:null }, uCarMode:{ value:2 } }, vertexShader:LIFE_V, fragmentShader:LIFE_F, transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });   // RAIN-5c: + the furniture's lights
  const lifeMesh=add(new T.Mesh(fg, lifeM), 0.5); carUni(); if(carMode==='baked') carsLoad();
  let lifeDropped=0;   // RAIN-8: items past the sprite cap this frame (the people must never be among them)
  const NEON=['uSign', 'uSignWarm', 'uCross'].map(u=>[u, lifeM.uniforms[u].value.clone()]);   // RAIN-6c: the signs' own colours kept (Bright lights them up, Warm subdues them)
  const lifeHist=[];
  function lifeUpload(t, cars, fx){ const lk=moodOfLook(look); if(lookOver) lifeHist.length=0; if(!lifeHist.length || lifeHist[lifeHist.length-1][1]!==lk){ lifeHist.push([lifeHist.length ? t : -1e9, lk]); if(lifeHist.length>6) lifeHist.splice(1, 1); }
    const A=lifeAt(t, lk, cars||[], fx && fx.wave, undefined, undefined, lifeHist, { signal, sleep:sleepE }); let n=0;
    if(bodiesOn){ const V=vehicleItems(cars||[], t, taxiNow); if(taxiNow && taxiNow.person) V.push({ kind:taxiNow.person.walk ? LK.walk : LK.stand, x:taxiNow.person.x, y:0, z:taxiNow.person.z, h:1.72, w:0.75, ph:taxiNow.person.walk ? frac1(t*0.9) : 0.25, c:5+8*UMB.black, a:taxiNow.person.a, lane:'taxi' }); A.unshift(...V); }   // RAIN-6b (1, 3): the bodies first (the people over them)
    if(bodiesOn){ shutK+=((look===RAIN_ROOM.looks.late ? 1 : 0.5)-shutK)*Math.min(1, 0.02); A.push({ kind:27.9, x:STREET.opp-0.05, y:0.3, z:SHOP.z, h:SHOP.h, span:SHOP.w/2, ph:Math.min(0.99, shutK), c:0, a:1, lane:'facade' });   // RAIN-6b (4): the shop's roller shutter (the band 27.9 → kind 28)
      A.push({ kind:29, x:BUSKER.x, y:0, z:BUSKER.z, h:1.72, w:1.3, ph:Math.min(0.99, Math.max(0, (t-buskAt)/0.7)), c:3, a:1, lane:'busker' });   // RAIN-7: the street musician under the awning, strumming when his note is heard
      for(const [za, zb] of LIFE.tables.cafes) for(let z=za+1.5;z<zb-1.5;z+=3.2) A.push({ kind:27, x:STREET.opp-3.75, y:2.62, z, h:0.34, span:1.5, ph:0, c:Math.round(z*7)%9, a:0.95, lane:'facade' }); }   // the awnings' fringes, at their outer edge (the bake's panels: 3.2 m apart, 3.8 m deep, tilted)
    lifeDropped=0; for(const q of A){ if(n>=NLIFE){ lifeDropped++; continue; } if(q.span){ const p1=project([q.x, q.y, q.z-q.span]), p2=project([q.x, q.y, q.z+q.span]), p3=project([q.x, q.y+q.h, q.z]); if(p1.z<=1 || p2.z<=1) continue;   // a facade thing: its width along the facade, its slope
        const cx=(p1.x+p2.x)/2, cy=(p1.y+p2.y)/2, hw=Math.abs(p2.x-p1.x)/2, hh=(p3.y-cy)/2, kk=hw>0 && hh>0 ? (p2.y-p1.y)/(p2.x-p1.x)*hw/(2*hh)*Math.sign(p2.x-p1.x) : 0, dq=depthOf(p3.dist);
        if(!(hh>0.0002) || hidden(cx, cy+hh, dq, CULL.life)) continue; fRect.set([cx, cy, hw, hh], n*4); fK.set([Math.round(q.kind), Math.round(Math.max(0, Math.min(1, kk+0.5))*16)+q.ph, q.c, q.a], n*4); fD[n]=dq; n++; continue; }
      if(q.kind===VK.car && carMode==='baked' && carTex){ const bt=BAKED_OF[q.c%8], BT=CARS.types[bt], toward=Math.floor(q.c/64)%2===1, S=seenOf(q.x, q.z, BT.len, toward ? -1 : 1, [CAM.x, CAM.y, CAM.z]), ei=Math.round(S.ei);   // RAIN-8 (3a): the baked car's cell over its own frame
        const [u0, u1, v0, v1]=frameOf(BT, CARS.elev[ei], CARS.az[S.ai], S.side), C0=project(S.centre); if(C0.z<=1) continue; const dq=depthOf(C0.dist), hw=(u1-u0)/2/C0.z, hh=(v1-v0)/2/C0.z, cx=C0.x+(u0+u1)/2/C0.z, y0=C0.y+v0/C0.z;
        if(Math.abs(cx)>2 || Math.abs(y0)>1.5 || (hidden(cx, y0+hh*0.4, dq, CULL.life) && hidden(cx, y0+2*hh*0.9, dq, CULL.life))){ culled++; continue; }
        fRect.set([cx, y0, hw, hh], n*4); fK.set([30, cellOf(bt, S.side, ei, S.ai)+Math.min(8, Math.floor(q.ph))/16, bt+8*(Math.floor(q.c/8)%8)+128*Math.floor(q.c/128), q.a], n*4); fD[n]=dq; n++; continue; }
      const b=project([q.x, q.y, q.z]); if(b.z<=1) continue; const veh=q.kind===VK.car || q.kind===VK.tram, tp=veh ? project([q.x, q.y+q.h, q.z+q.len]) : project([q.x, q.y+q.h*(q.kind<=2 || (q.kind>=14 && q.kind<=18) ? 1.15 : 1), q.z]), hh=(tp.y-b.y)/2, hw=q.w/2/b.z;
      if(veh){ const fy=project([q.x, q.y+q.h, q.z]).y; q.ph=Math.floor(q.ph)+Math.max(0.12, Math.min(0.95, (fy-b.y)/Math.max(1e-6, tp.y-b.y))); }   // the face's share of the sprite
      if(!(hh>0.00015) || Math.abs(b.x)>2 || Math.abs(b.y)>1.5) continue; const dq=depthOf(b.dist); if(hidden(b.x, b.y+hh*0.2, dq, CULL.life) && hidden(b.x, tp.y, dq, CULL.life)){ culled++; continue; }   // RAIN-6b (6): wholly behind a house or a crown
      fRect.set([b.x, b.y, hw, hh], n*4); fK.set([q.kind, q.ph, q.c, q.a], n*4); fD[n]=dq; n++; }
    lifeN=n; fg.instanceCount=n; fRA.needsUpdate=fKA.needsUpdate=fDA.needsUpdate=true; }
  const bedQ=[], shownLog=[], GO=col('go'), SPARK=col('spark'), FLASH=col('flash'); let signal=0, sparkAt=-1e9, flashAt=-1e9, breathEnd=-1e9;
  const bedIn=(ev, when)=>{ if(Number.isFinite(when)){ bedQ.push({ ...ev, when }); if(bedQ.length>256) bedQ.shift(); } };

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
  /* RAIN-8: our own window (RAIN-7's frame, latch, sill, cup and plant) REMOVED — the founder; its code: archive/rain-frame-RAIN7.js (not loaded) */
  const qGlass=add(new T.Mesh(quad, glassM), 0), ALL=[qCity, qBlur, qDown, qView, lifeMesh, wins, lights, dropsMesh, qGlass];
  const show=(...on)=>{ for(const m of ALL) m.visible=on.includes(m); };
  const pass=(r, target, ...on)=>{ show(...on); r.setRenderTarget(target); r.render(scene, camera); };
  const blur=(r, from, to, dx, dy)=>{ blurM.uniforms.uTex.value=from; blurM.uniforms.uDir.value.set(dx, dy); pass(r, to, qBlur); };
  /* small fixes (2026-11-17): THE MIST'S SOFT COPY (the city seen through the misty glass) — a true box down to a quarter, then three dense rounds (1.2, 1.55,
     1.9 quarter texels; together as wide as the old 1.2 + 2.4: √(1.2²+1.55²+1.9²) = 2.73 vs 2.68) so a point stays ROUND. The old chain (old: the probes'
     CONTROL) sampled the full picture 4.8 px apart and its second round 2.4 texels apart: a far light came out as a 5 × 5 grid of copies — a square */
  const SOFT_ROUNDS=[1.2, 1.55, 1.9];
  function soft(r, src, sw, sh, old){
    if(old){ blur(r, src, RT.s1, 1.2/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, 1.2/RT.s2.height); blur(r, RT.s2.texture, RT.s1, 2.4/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, 2.4/RT.s2.height); return; }
    downM.uniforms.uTex.value=src; downM.uniforms.uTexel.value.set(1/sw, 1/sh); pass(r, RT.s2, qDown);
    for(const k of SOFT_ROUNDS){ blur(r, RT.s2.texture, RT.s1, k/RT.s1.width, 0); blur(r, RT.s1.texture, RT.s2, 0, k/RT.s2.height); } }
  let softOld=false;   // probes only (softDbg): the old chain
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
    if(bakedM){ const k=moodOfLook(look); if(k!==moodKey){ if(moodTex) moodTex.dispose(); moodTex=imgTex(BK.moods[k]||BK.moods.late); moodKey=k; } bakedM.uniforms.uCity.value=moodTex; }   // RAIN-1: the mood's baked colour (the last one leaves the GPU)
    const P=lookCols(look), U=cityU; U.uTan.value.copy(UT);
    for(const [u, k] of [['uSky', 'sky'], ['uCloud', 'cloud'], ['uGlow', 'glow'], ['uHaze', 'haze'], ['uStone', 'stone'], ['uPlaster', 'plaster'], ['uAsph', 'asphalt']]) U[u].value.copy(P[k]);
    if(bakedM) bakedM.uniforms.uLampB.value=bakedLamp;
    U.uPane.value.copy(PANE); U.uLamp.value.copy(LAMP); pass(r, RT.base, qCity);   // the baked city or, without its files, the stand-in
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
    const PT=typeof window!=='undefined' && window.__rainPassT, T=(n, f)=>PT ? PT(n, f) : f();   // PERF-1 (dev tool only): each pass timed on the GPU
    if(dirty){ dirty=false; T('paint', ()=>paint(r)); }
    T('view', ()=>pass(r, RT.view, qView, lifeMesh, wins, lights));
    T('mist', ()=>soft(r, RT.view.texture, RT.view.width, RT.view.height, softOld));
    T('drops', ()=>{ r.getClearColor(keepClear); const ka=r.getClearAlpha(); r.setClearColor(0x000000, 0); show(dropsMesh); r.setRenderTarget(RT.drop); r.clear(true, false, false); r.render(scene, camera); r.setClearColor(keepClear, ka); });
    T('glass', ()=>pass(r, keep, qGlass)); show(...ALL); frames++;
  }

  /* ---- the room's state: the focus, the playing light, the lean, the finger on the glass ---- */
  let focus=FOCUS.rest, target=FOCUS.rest, restOn=false, heldNow=0, pressAt=-1e9, lastPick=-1, picks=0, wipes=0, strokes=0, viewOver=null, finger=null, rainOver=null, simFrozen=false, fxE=0, fxT=0.5, fxW=0, fxOff=false, sleepE=0, sleepOver=null, sleepM=null, taxiNow=null, sweepNow=null, buskAt=-1e9, bakedLamp=0, shutK=0.5, bodiesOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nobodies')), rainEff=0, soundSent=null, neonNow=1, winExtra=0; const pickLog=[];   // RAIN-6: fxE…soundSent — the effects hand's eased values
  const light={ x:0, y:0, on:0, d:0, glow:0.6 }, off={ x:0, y:0 };
  const toTan=(px, py)=>[(px/W*2-1)*tw, (1-py/H*2)*th];
  function resize(w, h, bufH){ W=w; H=h; const fov= viewOver && viewOver.fov ? viewOver.fov : roomFov(RAIN_ROOM.view, w, h); th=Math.tan(fov*Math.PI/360); tw=th*w/h; UT.set(tw, th);
    UPX.value=(bufH||bh||h)/(2*th); dropsRegion(SIM, tw, th); dirty=true; }
  /* one frame: hands = [{ x, y, d, play, glow }] (canvas pixels; d 0 near … 1 far); nin = the bus «nightSky» ({ mood }) */
  function update(dt, t, hands, fx, nin){
    now=t; UTIME.value=t;
    if(nin && nin.mood!==undefined && nin.mood!==moodId){ moodId=nin.mood; look=roomLook(RAIN_ROOM, moodId); }
    sleepE= sleepOver!=null ? sleepOver : nin && nin.sleep>0 ? nightDeep(nin.sleep).e : 0;   // RAIN-6b (8): the sleep timer's depth (the forest's curve)
    if(lookOver && RAIN_ROOM.looks[lookOver]) look=RAIN_ROOM.looks[lookOver];   // captures only: a mood held
    { const nd=sleepTraffic(trafficDensity(look.traffic, fx && fx.wave), sleepE), at=(tAudio==null ? t : tAudio)+DENS_MARGIN; if(!book){ book=passBook(nd); natureDensity(nd, -1e9); } else if(nd!==dens && passBookSet(book, at, nd)) natureDensity(nd, at); dens=nd; }   // RAIN-2: booked a margin ahead, the same time to the sound   // RAIN-1: the mood's traffic × Wave — the picture and the sound the same number
    if(look!==painted && painted) dirty=true;
    { const a=1-Math.exp(-dt/MOOD_TC); mistK+=(look.mist-mistK)*a; rainK+=(look.rain-rainK)*a; litK+=(look.lit-litK)*a; mistCol.lerp(lookCols(look).mist, a); }
    /* RAIN-6 (item 7): the effects hand — Echo the rain's strength (the drops, the falling streaks, its sound), Warm ↔ Bright the city light's colour; exactly
       neutral at rest (pure/fxlaw.js). fxOff (probe CONTROL): the hand ignored */
    { const e=fxOff ? 0 : +(fx && fx.echo)||0, tn=fxOff || !fx || fx.tone==null ? 0.5 : +fx.tone, w=fxOff ? 0 : +(fx && fx.wave)||0; fxE=easeTo(fxE, e, dt); fxT=easeTo(fxT, tn, dt); fxW=easeTo(fxW, w, dt);
      rainEff=rainOf(rainK, fxE); const S=streakOf(fxE, fxW), lp=lampOf(fxT), V=viewM.uniforms; V.uStreak.value.set(S.amount, S.slant); ULAMP.value=lp; V.uSway.value= crownTex ? 0.0011+0.0042*fxW : 0; lightM.uniforms.uRainK.value=rainEff; lifeM.uniforms.uWind.value=fxW; if(bakedM && Math.abs(lp-bakedLamp)>0.04 || (lp===0 && bakedLamp!==0)){ bakedLamp= Math.abs(lp)<0.02 ? 0 : lp; if(bakedM) dirty=true; }   // RAIN-6b: the baked shop windows follow (a repaint per step, only while the tone moves)
      /* RAIN-6c: the windows' light (warm: amber tungsten, a little dimmer; bright: a cool TV glow) and the signs' neon (subdued / up); exactly as they are at rest */
      { const to= lp<0 ? TUNG : LEDW, k=Math.abs(lp), dim= lp<0 ? 1-0.18*k : 1+0.12*k; HONEY.copy(WBASE[0]).lerp(to, k*0.75).multiplyScalar(dim); AMBER.copy(WBASE[1]).lerp(to, k*0.75).multiplyScalar(dim);
        const nf=neonOf(lp), L=lifeM.uniforms; for(const [u, b] of NEON) L[u].value.copy(b).multiplyScalar(nf); }
      neonNow=neonOf(lp); winExtra=windowsOf(lp);
      const so=soundOf(fxE); if(!soundSent || Math.abs(so.near-soundSent.near)>0.004){ soundSent=so; natureRain(so); } }
    const play=(hands||[]).find(h=>h.play);
    if(play){ const [x, y]=toTan(play.x, play.y); if(light.on<0.02){ light.x=x; light.y=y; } const k=1-Math.exp(-dt*13); light.x+=(x-light.x)*k; light.y+=(y-light.y)*k; light.d=play.d; light.glow=play.glow==null ? 0.6 : play.glow; }
    light.on+=((play ? 1 : 0)-light.on)*Math.min(1, dt*(play ? 6 : 2.5));
    target= play ? focusTarget(play.d) : FOCUS.rest; focus=focusStep(focus, target, dt, !!play);
    FOC.x=focusDepth(focus); FOC.w=focusPlateau(focus);   // RAIN-5e: the sharp plateau
    RAIN_FOCUS.f=focus; natureFocus(focus);   // RAIN-3: the room's sound takes the same number (near: the pane; far: the street)
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
    if(!simFrozen) dropsStep(SIM, dt, rainOver==null ? rainEff : rainOver); dropsUpload();
    if(wl || wipe.live || SIM.laneLive || mapDirty){ mapDirty=wipe.live || SIM.laneLive; const A=wipe.a, Ln=SIM.lane; for(let i=0;i<A.length;i++){ mapBytes[i*2]=A[i]*255; mapBytes[i*2+1]=Ln[i]*255; } mapTex.needsUpdate=true; }
    for(let i=0;i<WIN.length;i++) lit[i]=windowLight(WIN[i], litK+winExtra, t-litAt[i]);   // RAIN-6c: Bright lights more windows
    if(sleepE>0){ if(!sleepM || sleepM.at!==picks){ sleepM=sleepMine(litAt); sleepM.at=picks; }   // RAIN-6b (8): the city falls asleep — window by window, yours last
      for(let i=0;i<WIN.length;i++){ const m=sleepM.has(i) ? sleepM.get(i) : -1; lit[i]=(m>=0 ? Math.max(lit[i], 0.85) : lit[i])*sleepWinKeep(sleepWinAt(i, m, sleepM.size), sleepE); } }
    { const cand=[]; for(let i=0;i<WIN.length;i++) if(WIN[i].amb<litK && WIN[i].depth<0.9) cand.push(i); winEv=winEventAt(t, cand);   // RAIN-5c: life in a lit window (rare)
      if(winEvPrev>=0 && (!winEv || winEv.i!==winEvPrev)){ evArr[winEvPrev*4+1]=0; evArr[winEvPrev*4+2]=0; }
      { const fe=farEventAt(t); if(fe && fe.kind==='attic' && !winEv){ const top=[]; for(let j=0;j<WIN.length;j++) if((WIN[j].floor||0)>=5) top.push(j); if(top.length){ const j=top[Math.floor(fe.k*top.length)]; winEv={ i:j, kind:'walkup', u:frac1(fe.u*2), attic:true }; lit[j]=Math.max(lit[j], 0.85*Math.min(1, fe.u*8, (1-fe.u)*8)); } } }   // RAIN-5d: someone moving in a lit attic
      if(winEv){ const K={ walkup:1, curtain:2, onoff:3 }[winEv.kind]; evArr[winEv.i*4+1]=K; evArr[winEv.i*4+2]=winEv.u; if(K===3) lit[winEv.i]*=winOnOff(winEv.u); winEvPrev=winEv.i; } else winEvPrev=-1; evAttr.needsUpdate=true; }
    for(const e of showDue(bedQ, t)){ shownLog.push([e.kind, e.when, t]); if(shownLog.length>64) shownLog.shift(); if(e.kind==='chord'){ signal^=1; sparkAt=t; } if(e.kind==='busk') buskAt=t; const b=breathOf(e); if(b) breathEnd=Math.max(breathEnd, t+b); if(flashOf(e, e.when)) flashAt=t; }
    if(t<breathEnd){ const kb=0.22*Math.min(1, (breathEnd-t)*2); for(let i=0;i<lit.length;i++) if(lit[i]>0.15) lit[i]=Math.min(1, lit[i]*(1+kb)); }
    litAttr.needsUpdate=true; lifeUpload(t, traffic(t), fx);
    { const S=skyAt(skyT==null ? t : skyT, moodOfLook(look)), V=viewM.uniforms, P=lookCols(look); V.uSkyA.value.set(S.drift[0], S.drift[1], S.cover, 1);   // RAIN-5c: the sky's clouds, moon and rare events
      V.uCloudLit.value.copy(P.glow).multiplyScalar(1.45); V.uCloudDark.value.copy(P.cloud).multiplyScalar(0.62);
      if(S.moon){ V.uMoon.value.set(S.moon.x, S.moon.y, S.moon.r, S.moon.k); V.uMoonPh.value=S.moon.phase; } else V.uMoon.value.w=0;
      if(S.beam) V.uBeam.value.set(S.beam.x0, S.beam.y0, S.beam.ang, S.beam.k); else V.uBeam.value.w=0;
      if(S.plane){ V.uPlane.value.set(S.plane.x, S.plane.y, S.plane.k, 0); V.uPlaneC.value.set(S.plane.red, S.plane.white, S.plane.green); } else V.uPlane.value.z=0; skyNow=S; }
    const B=focusBlur(focus);
    viewM.uniforms.uLight.value.set(light.x, light.y, light.on*focus*(0.5+0.5*light.glow));
    const G=glassM.uniforms; UOFF.set(off.x, off.y); G.uRain.value=rainEff; G.uMist.value= mistOver==null ? mistK : mistOver; G.uG.value=B.glass; USOFT.value=B.glass; G.uFloor.value.x=GLASS.floor*wipe.floorK;
    G.uLight.value.set(light.x, light.y); G.uLightK.value=light.on*(1-focus)*(0.5+0.5*light.glow);
  }
  let mapDirty=true, skyT=null, skyNow=null, tHold=null;   // RAIN-5c: skyT — captures only (the sky at a chosen moment)
  /* a note began on the playing hand: far — the window the light points at comes on; near — the mist under the light is wiped (a spot) */
  function glint(i, vel){ if(i!==0 || light.on<0.05) return; pressAt=now;
    if(focus>=0.45){ const k=windowPick(WIN, light.x, light.y); lastPick=k; if(k>=0){ litAt[k]=now; picks++; pickLog.push(k); if(pickLog.length>32) pickLog.shift(); } }
    if(focus<0.55){ wipeStamp(wipe, light.x+off.x, light.y+off.y, clamp((vel==null ? 0.6 : vel)*1.4, 0.5, 1)*(1-0.6*focus)); wipes++; } }
  /* a window on the screen (the view's px): its centre and half size */
  const windowAt=i=>{ const w=WIN[i]; return w ? { i, x:(w.x/tw*0.5+0.5)*W, y:(0.5-w.y/th*0.5)*H, r:w.hw/(2*tw)*W, inView:Math.abs(w.x)+w.hw<tw && Math.abs(w.y)+w.hh<th } : null; };
  /* the start's dot becomes the first lit window (the host's fly doors). RAIN-R1: a window of the house opposite seen on every screen shape (flyWindow);
     without the bake's window map (the stand-in city), the old way: a dark one near the deep middle of the picture */
  function flyPick(){ const k=flyWindow(WIN, RAIN_ROOM.view, i=>lit[i]<=0.05); if(k>=0) return k; let best=null, bd=Infinity; WIN.forEach((w, i)=>{ const q=windowAt(i); if(!q.inView || lit[i]>0.05) return; const d=Math.hypot(q.x/W-0.6, q.y/H-0.5); if(d<bd){ bd=d; best=i; } }); return best; }
  const state=()=>({ now, focus, target, focusDepth:focusDepth(focus), blur:focusBlur(focus), light:{ ...light }, off:{ ...off }, windows:WIN.length, lit:Array.from(lit), litNow:lit.reduce((n, v)=>n+(v>0.05 ? 1 : 0), 0), lastPick, picks, pickLog:pickLog.slice(), wipes, strokes,
    wipe:{ live:wipe.live, wiped:wipe.wiped, floor:wipe.floorK, max:wipe.a.reduce((a, b)=>Math.max(a, b), 0) }, drops:{ n:SIM.list.length, running:SIM.list.filter(d=>d.mv).length, cap:SIM.cap, ledger:dropsLedger(SIM), t:SIM.t },
    mood:moodId, look:look.pre, mist:mistK, rain:rainK, rainEff, fx:{ echo:fxE, tone:fxT, wave:fxW, off:fxOff, streak:viewM.uniforms.uStreak.value.x, slant:viewM.uniforms.uStreak.value.y, lamp:ULAMP.value, neon:neonNow, winExtra, honey:HONEY.toArray(), sound:soundSent }, share:litK, tan:[tw, th], buffer:[bw, bh], repaints, frames, fine:Lv.fine, far:FAR.length, lights:nLights,
    baked:!!BK, cityMood:moodKey, density:dens, tAudio, carsMax:CARS_MAX });
  function texBytes(){ let b=GLASS.cols*GLASS.rows*2; for(const k in RT) b+=RT[k].width*RT[k].height*4; if(BK) b+=BK.lit.width*BK.lit.height*4+BK.depth.width*BK.depth.height+(moodTex ? BK.lit.width*BK.lit.height*4 : 0); return b; }   // RAIN-1: + the baked city's three textures
  function dispose(){ for(const o of own) try{ o.dispose(); }catch(e){} own.length=0; }
  resize(W, H);
  /* the pane starts wet: drops scattered at once (they merge as they land), the simulation goes on from there */
  { const R=seeded(RAIN_SEED^0x57455421), [x0, y0, x1, y1]=SIM.region, n=Math.round(Lv.drops*(0.35+0.4*rainK)); for(let i=0;i<n;i++) dropAdd(SIM, x0+(x1-x0)*R(), y0+(y1-y0)*R(), DROPS.r0+Math.pow(R(), DROPS.rPow)*(DROPS.rSpan+DROPS.rSpanRain*rainK)); }
  return { id:RAIN_ROOM.id, scene, camera, update, resize, render, glint, state, dispose, texBytes, held:sec=>{ heldNow= sec>0 ? sec : 0; }, project:()=>null,
    heard:ck=>{ clock=ck; }, dripsDbg:()=>dripsShown, winEvDbg:()=>winEv, skyDbg:v=>{ if(v!==undefined) skyT=v; return skyNow; }, bed:(it, when)=>bedIn(it, when), lifeDbg:()=>({ n:lifeN, shown:shownLog.slice(), queued:bedQ.length }),
    rest:on=>{ restOn=!!on; return restOn; }, restDbg:()=>({ rest:restOn, off:[off.x, off.y], fov:Math.atan(th)*360/Math.PI }),
    viewDbg:o=>{ viewOver=o||null; resize(W, H); return viewOver; },
    flyPick, flyAt:i=>{ const q=windowAt(i); return q ? { i, x:q.x, y:q.y, r:Math.max(1.5, q.r), glow:lit[i], dist:30, front:q.inView } : null; }, flyLand:i=>{ if(!WIN[i]) return false; litAt[i]=now; return true; },
    windowAt, wipeAtDbg:(x, y)=>wipeAt(wipe, x, y), wipeCellDbg:(x, y)=>wipeCell(wipe, x, y), laneAtDbg:(x, y)=>laneAt(SIM, x, y), focusDbg:v=>{ if(v!=null) focus=clamp(+v, 0, 1); return focus; },
    /* probes and captures: the drops as they are (a copy), the rain's strength held, the simulation frozen; the depth the picture holds at a view place, read back */
    dropsDbg:()=>SIM.list.map(d=>({ id:d.id, x:d.x, y:d.y, r:d.r, mv:d.mv })), fxDbg:o=>{ if(o && 'off' in o) fxOff=!!o.off; return { off:fxOff }; },
    rain7Dbg:()=>{ let cones=0; for(let j=0;j<nLights;j++) if(lDK[j*2+1]===3 && lCol[j*4+3]>0) cones++; let cs=0; if(crownTex){ const D=crownTex.image.data; for(let i=0;i<D.length;i++) if(D[i]>0) cs++; cs/=crownTex.image.data.length; }
      return { cones, crownShare:cs, sway:viewM.uniforms.uSway.value, focus, buskAt, t:now, busker:true, buskerAt:{ ...BUSKER } }; },   // RAIN-7; RAIN-8: the window gone, the musician in every mood
    litSumDbg:()=>{ let x=0; for(let i=0;i<lit.length;i++) x+=lit[i]; return x; },   // RAIN-6b (8): how lit the windows are, all together
    carsDbg:m=>{ if(m && ['box', 'baked', 'cine'].includes(m)){ carMode=m; carUni(); if(m==='baked') return carsLoad().then(()=>({ mode:carMode, baked:!!carTex })); } return { mode:carMode, baked:!!carTex, uni:lifeM.uniforms.uCarMode.value }; },   // RAIN-8 (3): the cars' trial version
    trafficHoldDbg:v=>{ tHold= v==null ? null : +v; return tHold; },   // RAIN-8, captures only: the traffic held at one moment
    busiestDbg:(t0, t1, z0=25, z1=140)=>{ let best=t0, bn=-1; for(let t=t0;t<=t1;t+=0.5){ const n=trafficAt(t, book||dens).filter(c=>c.kind==='car' && c.z>z0 && c.z<z1).length; if(n>bn){ bn=n; best=t; } } return { t:best, cars:bn }; },   // RAIN-8, captures only
    lifeCapDbg:()=>({ n:lifeN, cap:NLIFE, dropped:lifeDropped }),   // RAIN-8 (4)
    bodiesDbg:on=>{ if(on!=null) bodiesOn=!!on; return { on:bodiesOn, taxi:taxiNow, sweep:sweepNow }; },   // RAIN-6b (1): the vehicles' bodies (?rain=nobodies: only their lights, as before)
    sleepDbg:v=>{ if(v!==undefined) sleepOver= v==null ? null : clamp(+v, 0, 1); return { e:sleepE, over:sleepOver, mine:sleepM ? sleepM.size : 0 }; },   // RAIN-6b (8): the sleep's depth held (probes)
    cullDbg:on=>{ if(on!=null) cullOn=!!on; const c=culled; culled=0; return { on:cullOn, culled:c }; }, hiddenDbg:(x, y, d, m)=>BK ? bakedAt(x, y)<d-(m==null ? CULL.m : m) : false,   // RAIN-6b (6): the cull's switch and its count since the last call
    liveLightsDbg:()=>{ const out=[]; for(let j=0;j<nLights;j++) if(lCol[j*4+3]>0.003) out.push({ x:lRect[j*4], y:lRect[j*4+1], depth:lDK[j*2], kind:lDK[j*2+1], k:lCol[j*4+3] }); return out; },   // RAIN-6: the effects hand ignored (probe CONTROL)
    rainDbg:v=>{ rainOver= v==null ? null : clamp(+v, 0, 1); return rainOver; }, freezeDbg:on=>{ simFrozen=!!on; return simFrozen; },
    lawDepthDbg:(x, y)=>sceneAt(x, y).depth, blurAtDbg:d=>blurAt(d, focus),
    /* a render target's pixels at view places ([x, y] view-angle units) → [r, g, b, a] 0…1 each; 'base' holds the city with its depth in a */
    windowsDbg:()=>WIN, lookDbg:k=>{ lookOver= k||null; return lookOver; }, mistDbg:v=>{ mistOver= v==null ? null : +v; return mistOver; },   // RAIN-1, captures only: a mood held, the pane's mist held
    bakedDepthDbg:(x, y)=>{ if(!BK) return null; if(!depthPx){ const c=document.createElement('canvas'); c.width=BK.depth.width; c.height=BK.depth.height; const g=c.getContext('2d'); g.drawImage(BK.depth, 0, 0); depthPx={ d:g.getImageData(0, 0, c.width, c.height).data, w:c.width, h:c.height }; }
      const i=clamp(Math.round((x/BAKE_EXT[0]*0.5+0.5)*depthPx.w-0.5), 0, depthPx.w-1), j=clamp(Math.round((0.5-y/BAKE_EXT[1]*0.5)*depthPx.h-0.5), 0, depthPx.h-1); return depthPx.d[(j*depthPx.w+i)*4]/255; },   // the baked depth map at a view place
    rtReadDbg:(name, pts)=>{ const r=rr, T0=RT[name]; if(!T0 || !r) return null; const px=new Uint8Array(4); return pts.map(([x, y])=>{ const i=Math.round((x/tw*0.5+0.5)*T0.width-0.5), j=Math.round((y/th*0.5+0.5)*T0.height-0.5);
      r.readRenderTargetPixels(T0, clamp(i, 0, T0.width-1), clamp(j, 0, T0.height-1), 1, 1, px); return Array.from(px, v=>v/255); }); },
    radDbg:()=>({ rad:viewM.uniforms.uRad.value.toArray(), foc:FOC.toArray(), buffer:[bw, bh] }),
    /* small fixes: the mist's soft chain (new, or old: the CONTROL) on one round light (size px across) at the picture's centre → the soft
       copy's red channel around its centre ((2R+1)², row by row from the bottom) */
    /* UI-1: every light drawn this frame: [x, y, hw, hh (view-angle units), depth, kind, brightness] (lit ones only), and px per unit */
    lightsDbg:()=>({ px:UPX.value, list:Array.from({ length:nLights }, (_, j)=>[lRect[j*4], lRect[j*4+1], lRect[j*4+2], lRect[j*4+3], lDK[j*2], lDK[j*2+1], lCol[j*4+3]]).filter(q=>q[6]>0) }),
    softDbg:(o={})=>{ const r=rr; if(!r || !RT.s2 || !RT.view) return null; const w=RT.view.width, h=RT.view.height, k=o.size||3, data=new Uint8Array(w*h*4), cx=w>>1, cy=h>>1;
      for(let y=cy-k;y<=cy+k;y++) for(let x=cx-k;x<=cx+k;x++){ if(Math.hypot(x-cx, y-cy)>k/2) continue; const i=(y*w+x)*4; data[i]=data[i+1]=data[i+2]=255; data[i+3]=255; }   // a round light, size px across
      const tx=new T.DataTexture(data, w, h, T.RGBAFormat); tx.minFilter=tx.magFilter=T.LinearFilter; tx.needsUpdate=true; const keep=r.getRenderTarget();
      try{ soft(r, tx, w, h, !!o.old); } finally { r.setRenderTarget(keep); }
      const W2=RT.s2.width, H2=RT.s2.height, R=o.r||12, n=2*R+1, px=new Uint8Array(n*n*4); r.readRenderTargetPixels(RT.s2, Math.round(W2*cx/w)-R, Math.round(H2*cy/h)-R, n, n, px); tx.dispose();
      return { R, n, v:Array.from({ length:n*n }, (_, i)=>px[i*4]), quarter:[W2, H2], full:[w, h] }; } };
}
