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
import { CAM, camBasis, RAIN_TRAFFIC, project, projectXYZ, cityTrees, cityLamps, lampLitAt, trafficAt, trafficDensity, sceneAt, depthOf, BAKE_EXT, DENS_MARGIN, STREET, vanishing } from './pure/city.js';
import { passBook, passBookSet } from '../../pure/passes.js';   // RAIN-2: the density book
import { lifeAt, lifeCyclists, LIFE, LK, UMB, PEOPLE, wearFor, CAT, catAt, STREAMS, streamK, streamSegs } from './pure/life.js';
import { vehicleItems, taxiAt, VK, sweepAt, SWEEP, VEH, vehType, vehColour } from './pure/vehicles.js';   // RAIN-6b (1, 3): the vehicles' bodies, the taxi
import { skyAt } from './pure/sky.js';
import { FAR_LIFE, hillTop, slope, farCars, blink, twinkle, cableAt, farEventAt, smokerGlow, lampFlickerAt } from './pure/far.js';   // RAIN-5d: life far away
const frac1=x=>x-Math.floor(x);
import { winGarland, winEventAt, winOnOff } from './pure/windows.js';   // RAIN-5c: life in the windows   // RAIN-5c: the sky's clouds, moon, searchlight and aircraft   // RAIN-5: the people and the street's small life
import { showDue, flashOf, breathOf, SHOWN } from './pure/shown.js';   // RAIN-5: the music shown when heard
import { QUAD_V, BLUR_F, DOWN_F, VIEW_F, WIN_V, WIN_F, LIGHT_V, LIGHT_F, DROP_V, DROP_F, LIFE_V, LIFE_F, VEH_V, VEH_F, VEHCOMP_F, glassShader } from './rain-glass.js';
import { carMesh, tramMesh as tramBody, carLamps, VEH3, streamMesh } from './pure/vehmesh.js';   // RELEASE-1 (B): the vehicles in 3D
import { cityUniforms, CITY_F, BAKED_F } from './rain-city.js';
import { winVisOf } from './pure/windows.js';   // RELEASE-1: how much of each window's light is seen

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
    LAMP=col('lamp'), LIGHT=col('light'), TAIL=col('tail'), HEAD=col('head'), mistCol=lookCols(look).mist.clone(), ambCol=lookCols(look).glow.clone();   // RELEASE-1 (A): ambCol — the look's glow on the people's clothes
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
  const blankTex=new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, T.RGBAFormat); blankTex.needsUpdate=true; own.push(blankTex);   // RAIN-10: no bake → nothing hides the life
  const litTex= BK ? imgTex(BK.lit) : null, depTex= BK ? imgTex(BK.depth, true) : null, EXT=new T.Vector2(BAKE_EXT[0], BAKE_EXT[1]); let moodTex=null, moodKey=null;
  const bakedM= BK ? mat({ uniforms:{ uCity:{ value:null }, uDepthMap:{ value:depTex }, uTan:{ value:UT }, uExt:{ value:EXT }, uTexel:{ value:new T.Vector2(1/BK.depth.width, 1/BK.depth.height) }, uLampB:{ value:0 } }, vertexShader:QUAD_V, fragmentShader:BAKED_F }) : null;   // UI-1: uTexel — the far windows read round
  const moodOfLook=L=>Object.keys(RAIN_ROOM.looks).find(k=>RAIN_ROOM.looks[k]===L)||'late';
  const blurM=mat({ uniforms:{ uTex:{ value:null }, uDir:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:BLUR_F });
  const downM=mat({ uniforms:{ uTex:{ value:null }, uTexel:{ value:new T.Vector2() } }, vertexShader:QUAD_V, fragmentShader:DOWN_F });   // small fixes: the mist's box downsample
  /* RAIN-7: THE CROWNS' MASK — where the baked city is nearer than the law's street over the promenade (the plane trees' crowns), read once on the CPU
     from the depth map, softened so a crown's edge stays put while its inside sways (VIEW_F); ?rain=nosway — still, as before */
  const swayOn=!(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nosway'));
  let crownTex=null, treeTex=null; if(BK && swayOn) try{ const GW=200, GH=110, m=new Float32Array(GW*GH), cv=document.createElement('canvas'); cv.width=BK.depth.width; cv.height=BK.depth.height; const g=cv.getContext('2d'); g.drawImage(BK.depth, 0, 0); const D=g.getImageData(0, 0, cv.width, cv.height).data;
    for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const x=((i+0.5)/GW*2-1)*BAKE_EXT[0], y=(1-(j+0.5)/GH*2)*BAKE_EXT[1], L=sceneAt(x, y); if(L.kind!=='street' || !L.hit || L.hit[0]<STREET.alleyA-0.5 || L.hit[0]>STREET.alleyB) continue;
      const bd=D[(Math.min(cv.height-1, Math.floor((j+0.5)/GH*cv.height))*cv.width+Math.min(cv.width-1, Math.floor((i+0.5)/GW*cv.width)))*4]/255; if(bd<L.depth-0.015) m[j*GW+i]=1; }
    const b=new Uint8Array(GW*GH); for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ let a=0, w=0; for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const ii=i+di, jj=j+dj; if(ii<0 || jj<0 || ii>=GW || jj>=GH) continue; a+=m[jj*GW+ii]; w++; } b[(GH-1-j)*GW+i]=Math.round(255*Math.max(0, a/w-0.34)/0.66); }
    /* RAIN-9: WHICH TREE each crown cell belongs to (the nearest crown covering it, else the closest), so every tree sways in its own rhythm and strength
       and a gust reaches the near trees first: R its phase, G its distance along the boulevard (the gust's delay), B its strength, A the crowns' mask
       (softened; the shader reads it bilinearly by hand). ONE texture, as before RAIN-9 (a second one was not freed with the room). Nearest-sampled: a
       tree's own numbers, never a blend of two */
    const TR=cityTrees().map((t, k)=>{ const q=project(t.p); return q.z>1 ? { x:q.x, y:q.y, r:t.r/q.z, z:t.p[2], k } : null; }).filter(Boolean), hsh=(a, b)=>{ const v=Math.sin(a*127.1+b*311.7)*43758.5453; return v-Math.floor(v); };
    const tp=new Uint8Array(GW*GH*4);
    for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){ const o=((GH-1-j)*GW+i)*4; if(!b[(GH-1-j)*GW+i]) continue; const x=((i+0.5)/GW*2-1)*BAKE_EXT[0], y=(1-(j+0.5)/GH*2)*BAKE_EXT[1];
      let best=null, bz=Infinity, bd=Infinity, near=null; for(const t of TR){ const d=Math.hypot(x-t.x, y-t.y)/t.r; if(d<1.15 && t.z<bz){ bz=t.z; best=t; } if(d<bd){ bd=d; near=t; } } const t=best||near; if(!t) continue;
      tp[o]=Math.round(255*hsh(t.k, 1)); tp[o+1]=Math.round(255*Math.min(1, t.z/240)); tp[o+2]=Math.round(255*(0.55+0.45*hsh(t.k, 2))); }
    for(let k=0;k<GW*GH;k++) tp[k*4+3]=b[k];
    treeTex=new T.DataTexture(tp, GW, GH, T.RGBAFormat); treeTex.minFilter=treeTex.magFilter=T.NearestFilter; treeTex.generateMipmaps=false; treeTex.needsUpdate=true; own.push(treeTex); crownTex=treeTex; }catch(e){ crownTex=null; treeTex=null; }
  const RIP=[...Array(6)].map(()=>new T.Vector4()), RIPD=[0, 0, 0, 0, 0, 0];   // RELEASE-1 (night): the reflections' ripples round passing vehicles
  const viewM=mat({ uniforms:{ uRip:{ value:RIP }, uRipD:{ value:RIPD }, uTree:{ value:treeTex }, uTreeN:{ value:new T.Vector2(200, 110) }, uCExt:{ value:new T.Vector2(BAKE_EXT[0], BAKE_EXT[1]) }, uSway:{ value:0 }, uStreak:{ value:new T.Vector2(0, 0.08) }, uTime:UTIME, uBase:{ value:null }, uL1:{ value:null }, uL2:{ value:null }, uL3:{ value:null }, uDepth:{ value:null }, uRad:{ value:new T.Vector3(0.004, 0.012, 0.04) }, uFoc:{ value:FOC },
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
  const VIS=(()=>{ const dark=BK && BK.moods && BK.moods.evening; if(!BK || !BK.lit || !dark) return WIN.map(()=>1); try{ const c=document.createElement('canvas'), w=c.width=BK.lit.width, h=c.height=BK.lit.height, g=c.getContext('2d'); g.drawImage(BK.lit, 0, 0); const D=g.getImageData(0, 0, w, h).data; g.drawImage(dark, 0, 0, w, h); const E=g.getImageData(0, 0, w, h).data;   // RELEASE-1: read once — the bake's every-window-lit picture minus the same mood's dark windows (lit.webp is Evening's): the windows' own light
      const lum=(x, y)=>{ const i=Math.max(0, Math.min(w-1, Math.floor((x/BAKE_EXT[0]*0.5+0.5)*w))), j=Math.max(0, Math.min(h-1, Math.floor((0.5-y/BAKE_EXT[1]*0.5)*h))), k=(j*w+i)*4; return Math.max(0, (0.3*(D[k]-E[k])+0.5*(D[k+1]-E[k+1])+0.2*(D[k+2]-E[k+2]))/255); };
      return winVisOf(WIN, lum); }catch(e){ return WIN.map(()=>1); } })();
  wg.setAttribute('aVis', new T.InstancedBufferAttribute(new Float32Array(VIS), 1));
  const evArr=new Float32Array(WIN.length*4), evAttr=dyn(evArr, 4); for(let i=0;i<WIN.length;i++) evArr[i*4]=winGarland(i) ? 1 : 0; wg.setAttribute('aEv', evAttr);   // RAIN-5c: garland, event kind, its phase
  let winEv=null, winEvPrev=-1;
  const winM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPad:{ value:BOKEH.pad }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER }, uTime:UTIME, uGarA:{ value:col('garland-a') }, uGarB:{ value:col('garland-b') }, uGarC:{ value:col('garland-c') }, uGarD:{ value:col('garland-d') }, uLit:{ value:litTex }, uExt:{ value:EXT }, uBaked:{ value:BK ? 1 : 0 }, uVisOff:{ value:0 } }, vertexShader:WIN_V, fragmentShader:WIN_F,
    transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const wins=add(new T.Mesh(wg, winM), 0.3);   // RELEASE-1 (C): drawn before the vehicles (0.4) and the life (0.5): what stands before the facade covers its windows (it was 1: over them)

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
  const CULL=Object.freeze({ far:0.8, m:0.03, life:0.06 }), SHOP=Object.freeze({ z:84, w:3.0, h:2.9 });   // RAIN-6b (4): the shop with the roller shutter; RAIN-9: the musician as NEAR as the view allows — the promenade's middle between two walkers' lanes, the one near place no crown hides on any screen (the baked depth), inside an upright phone's crop
  let DPX=null, cullOn= !(typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('nocull')), culled=0;
  const bakedAt=(x, y)=>{ if(!BK) return 1; if(!DPX){ try{ const c=document.createElement('canvas'); c.width=BK.depth.width; c.height=BK.depth.height; const g=c.getContext('2d'); g.drawImage(BK.depth, 0, 0); DPX={ d:g.getImageData(0, 0, c.width, c.height).data, w:c.width, h:c.height }; }catch(e){ DPX={ d:null }; } }
    if(!DPX.d) return 1; const u=x/BAKE_EXT[0]*0.5+0.5, v=0.5-y/BAKE_EXT[1]*0.5; if(u<0 || u>1 || v<0 || v>1) return 1;
    return DPX.d[(clamp(Math.round(v*DPX.h-0.5), 0, DPX.h-1)*DPX.w+clamp(Math.round(u*DPX.w-0.5), 0, DPX.w-1))*4]/255; };
  const hidden=(x, y, dep, m)=>cullOn && !!BK && dep>0 && bakedAt(x, y)<dep-m;
  let nStatic=0, nLights=0;
  const put=(i, x, y, hw, hh, c, k, depth, kind)=>{ if(k>0 && kind===0 && hidden(x, y, depth, depth>CULL.far ? CULL.m : CULL.life)){ k=0; culled++; } const j=i*4; lRect[j]=x; lRect[j+1]=y; lRect[j+2]=hw; lRect[j+3]=hh; lCol[j]=c.r; lCol[j+1]=c.g; lCol[j+2]=c.b; lCol[j+3]=k; lDK[i*2]=depth; lDK[i*2+1]=kind; };   // SPEED-1 step 10: written in place (two arrays a light were garbage)
  /* a light at world point P (radius rad m) and, on the wet street, its reflection: a streak below its foot */
  const lightAt=(i, P, rad, c, k, refl, footY=0)=>{ const q=project(P); if(q.z<=1){ put(i, 9, 9, 0, 0, c, 0, 1, 0); return refl ? i+2 : i+1; }
    put(i, q.x, q.y, Math.max(rad/q.z, 0.0007), 0, c, k, depthOf(q.dist), 0); if(!refl) return i+1;
    const f=projectXYZ(P[0], footY, P[2]), m=projectXYZ(P[0], 2*footY-P[1], P[2]), top=f.y, bot=m.y-(f.y-m.y)*0.6, hh=Math.max(0.0005, (top-bot)/2);
    put(i+1, f.x, (top+bot)/2, Math.max(rad*1.6/q.z, 0.0008), hh, c, k*0.22, depthOf(q.dist), 1); return i+2; };
  /* RAIN-8: a soft pool of light on the ground (the light layer's kind 4): centre (x, z), half sizes rx across, rz along (m) */
  const pool=(i, x, z, rx, rz, c, k)=>{ const q=projectXYZ(x, 0.02, z); if(q.z<=1) return i; const a=projectXYZ(x+rx, 0.02, z), f=projectXYZ(x, 0.02, z+rz), nn=projectXYZ(x, 0.02, z-rz); if(Math.max(Math.abs(a.x-q.x), Math.abs(nn.y-f.y)/2)*2*UPX.value<4) return i;   // RAIN-10: a pool under 4 px is not seen (and would be a small rectangle)
    put(i, q.x, (f.y+nn.y)/2, Math.max(0.0015, Math.abs(a.x-q.x)), Math.max(0.0008, Math.abs(nn.y-f.y)/2), c, k, depthOf(q.dist), 4); return i+1; };
  const FARC=FAR.map(q=>HONEY.clone().lerp(AMBER, q.warm));   // RAIN-5d: the hill windows twinkle (put each frame in traffic())
  { let i=FAR.length;
    for(const L of LAMPS) i=lightAt(i, L.p, 0.32, LAMP, 1, true);
    /* RAIN-7: the rain seen in each lamp's light — a cone from its head to the street (the light layer's kind 3: a faint haze and the falling streaks lit) */
    if(conesOn) for(const L of LAMPS){ const hd=projectXYZ(L.p[0], L.p[1]-0.3, L.p[2]), ft=projectXYZ(L.p[0], 0, L.p[2]), ed=projectXYZ(L.p[0]+3.2, 0, L.p[2]); if(hd.z<=1 || ft.z<=1 || hd.dist>220) continue;
      put(i++, (hd.x+ft.x)/2, (hd.y+ft.y)/2, Math.max(0.002, Math.abs(ed.x-ft.x)), Math.max(0.002, (hd.y-ft.y)/2), LAMP, 0.9, depthOf(hd.dist), 3); }
    nStatic=i; }
  /* RAIN-10 (RAIN-7's list): now and then one near street lamp stutters (pure/far.js lampFlickerAt) — its light and its reflection; its own values kept to come back to */
  const LAMPN=LAMPS.map((L, j)=>[j, project(L.p)]).filter(([, q])=>q.z>1 && q.dist<120 && Math.abs(q.x)<1.2).map(([j])=>j), LAMPK=LAMPS.map((L, j)=>{ const s=FAR.length+2*j; return [lCol[s*4+3], lCol[(s+1)*4+3]]; }); let flickJ=-1;
  function lampFlicker(t){ if(flickJ>=0){ const s=FAR.length+2*flickJ; lCol[s*4+3]=LAMPK[flickJ][0]; lCol[(s+1)*4+3]=LAMPK[flickJ][1]; flickJ=-1; }
    const f=lampFlickerAt(t, LAMPN.length); if(f){ const j=LAMPN[f.j], s=FAR.length+2*j; if(LAMPK[j][0]>0){ lCol[s*4+3]=LAMPK[j][0]*f.k; lCol[(s+1)*4+3]=LAMPK[j][1]*f.k; flickJ=j; } } }
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
    { const sw=bodiesOn ? sweepAt(tAudio==null ? t : tAudio) : null; if(sw && i<NL-2){ const a=projectXYZ(STREET.opp-0.1, SWEEP.y, sw.z-3), b=projectXYZ(STREET.opp-0.1, SWEEP.y, sw.z+3), c=projectXYZ(STREET.opp-0.1, SWEEP.y+1.4, sw.z);   // RAIN-7: a turning car's headlights sweep the house opposite
        if(a.z>1 && b.z>1) put(i++, (a.x+b.x)/2, (a.y+b.y)/2, Math.max(0.002, Math.abs(b.x-a.x)/2), Math.max(0.002, c.y-(a.y+b.y)/2), HEAD, 0.16*sw.k, depthOf(c.dist), 2); sweepNow=sw; } else sweepNow=null; }
    if(taxiNow){ const z=taxiNow.z, x=RAIN_TRAFFIC.stop.x, hz=blink(t, 1.5, 0.5);   // RELEASE-1 (C): its own line
      for(const s of [-0.78, 0.78]){ i=lightAt(i, [x+s, 0.68, z], 0.11, HEAD, 1, true); if(taxiNow.hazard && hz) i=lightAt(i, [x+(s<0 ? -0.95 : 0.95), 0.7, z], 0.08, TURN, 0.9, false); } }
    for(const c of cars){ if(c.kind==='car'){ if(nc++>=CARS_MAX) continue;
        { const ty=vehType(c.lane, c.slot), Lm=carLamps(ty), bk=brakeOf(c); for(const s of [-1, 1]) i=lightAt(i, [c.x+s*Lm.x, Lm.y, c.z], bk ? 0.13 : 0.11, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 1 : bk ? 1.7 : 0.8, true);   // RELEASE-1 (B): on the body's own lamps
          if(bk && i<NL) i=lightAt(i, [c.x, VEH.types[ty].h-0.06, c.z+VEH3.shape[ty].rr*VEH.types[ty].len], 0.05, TAIL, 1.1, false); }   // RELEASE-1 (night): braking for the red — the tail lamps brighter, the third brake light over the rear window
        if(i<NL-2) i=pool(i, c.x, c.dir<0 ? c.z-5 : c.z-1.6, 1.3, c.dir<0 ? 4.5 : 1.8, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 0.2 : 0.12);   // RAIN-8 (3b): the headlights' pool ahead on the wet road, a red glow behind
        { const hc=frac1(Math.sin((c.id||c.t0||c.z)*91.7)*43758.5); if(hc<FAR_LIFE.turn.share && blink(t, FAR_LIFE.turn.hz, 0.5, hc*7)) i=lightAt(i, [c.x+(hc<FAR_LIFE.turn.share/2 ? -0.95 : 0.95), 0.7, c.z], 0.08, TURN, 0.9, false); } }   // RAIN-5d: now and then a car's turn signal
      else if(bodiesOn){ const W2=VEH3.tram.w/2, near= c.dir>0 ? c.z-c.len : c.z, mid=near+c.len/2;   /* RAIN-10: the tram's lamps at its near end (headlights coming, tail lights going), the lit windows' warm spill on the wet road both sides, their reflections */
        for(const s of [-0.85, 0.85]) i=lightAt(i, [c.x+s, 0.95, near-0.05], 0.13, c.dir<0 ? HEAD : TAIL, c.dir<0 ? 1.1 : 0.85, true);
        if(i<NL-3){ i=pool(i, c.x-W2-1.1, mid, 1.3, c.len*0.5, HONEY, 0.26); i=pool(i, c.x+W2+1.1, mid, 1.3, c.len*0.5, HONEY, 0.2); if(c.dir<0) i=pool(i, c.x, near-6, 1.5, 5, HEAD, 0.2); }
        for(let k=0;k<6 && i<NL;k++){ const z=near+1.5+k*(c.len-3)/5, f=projectXYZ(c.x-W2-0.25, 0, z), m=projectXYZ(c.x-W2-0.25, -1.7, z); if(f.z<=1) continue; const bot=m.y-(f.y-m.y)*0.6;
          put(i++, f.x, (f.y+bot)/2, Math.max(0.0008, 0.5/f.z), Math.max(0.0005, (f.y-bot)/2), HONEY, 0.2, depthOf(f.dist), 1); } }
      else { for(let k=0;k<6;k++){ const z=c.z-c.dir*(2+k*4.3), q=projectXYZ(c.x, 2.1, z); if(q.z<=1) continue; const qw=projectXYZ(c.x, 2.1, z+1.6);   // ?rain=nobodies: lights only, as before RAIN-6b
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
    i=farLights2(i, t);   // RAIN-5d: life far away
    { const tr=cars.find(c=>c.kind==='tram'), ag=now-sparkAt; if(tr && ag<SHOWN.spark){ const nr= tr.dir>0 ? tr.z-tr.len : tr.z, zP= tr.dir>0 ? nr+VEH3.tram.panto : nr+tr.len-VEH3.tram.panto; i=lightAt(i, [tr.x, STREET.wire, zP], 0.3, SPARK, 1.6*(1-ag/SHOWN.spark), false); } }   // RELEASE-1 (B): at the pantograph's head
    { const ag=now-flashAt; if(ag<SHOWN.flash){ const fl=(ag<0.08 || (ag>0.18 && ag<0.26)) ? 1 : 0.25; put(i++, -0.2, 0.32, 1.4, 0.22, FLASH, 0.18*fl*(1-ag/SHOWN.flash), 1, 2); } }
    lampFlicker(tAudio==null ? t : tAudio);
    for(let j=i;j<nLights;j++) lCol[j*4+3]=0;   // last frame's extra lights out
    nLights=Math.max(i, nStatic); lg.instanceCount=Math.max(nLights, 1); aRect.needsUpdate=aCol.needsUpdate=aDK.needsUpdate=true; return cars; }
  const lightM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX, uWin:{ value:1 }, uLamp:ULAMP, uTime:UTIME, uRainK:{ value:0 } }, vertexShader:LIGHT_V, fragmentShader:LIGHT_F, transparent:true, blending:T.AdditiveBlending });
  const lights=add(new T.Mesh(lg, lightM), 2);
  /* RAIN-5: THE PEOPLE AND THE STREET'S SMALL LIFE (pure/life.js): one draw, each item projected by the view law and sized by its distance, drawn
     over the city and under the windows and lights; and THE MUSIC SHOWN (pure/shown.js): the bed's events queued with their heard moment */
  /* RAIN-9: THE CARS ARE CINEMATIC (the founder's pick of RAIN-8's two trials; the baked one: archive/rain-cars-baked-RAIN8/, not loaded) — a soft dark
     silhouette, the lamps' light on the wet roof and the glass, glints, the headlights' pools on the wet road (rain-glass.js LIFE_F, the light layer's kind 4) */
  const NLIFE=480, fg=unitQuad(), fRect=new Float32Array(NLIFE*4), fK=new Float32Array(NLIFE*4), fD=new Float32Array(NLIFE), fW=new Float32Array(NLIFE*2), fV=new Float32Array(NLIFE*4), fRA=dyn(fRect, 4), fKA=dyn(fK, 4), fDA=dyn(fD, 1), fWA=dyn(fW, 2), fVA=dyn(fV, 4);
  fg.setAttribute('aRect', fRA); fg.setAttribute('aK', fKA); fg.setAttribute('aDep', fDA); fg.setAttribute('aWear', fWA); fg.setAttribute('aView', fVA); fg.instanceCount=0; let lifeN=0;   // RELEASE-1 (A): aWear = (the wear code, the near lamps' light)
  const lifeM=mat({ uniforms:{ uTan:{ value:UT }, uFoc:{ value:FOC }, uPx:UPX, uWin:{ value:1 }, uGarA:{ value:col('garland-a') }, uGarB:{ value:col('garland-b') }, uGarC:{ value:col('garland-c') }, uGarD:{ value:col('garland-d') },
    uWind:{ value:0 }, uTime:UTIME, uSign:{ value:col('sign') }, uSignWarm:{ value:col('sign-warm') }, uCross:{ value:col('cross') }, uWalkR:{ value:col('walk-red') }, uWalkG:{ value:col('walk-green') }, uNavR:{ value:TAIL }, uHead:{ value:HEAD }, uDepthMap:{ value:depTex||blankTex }, uExt:{ value:EXT }, uOccl:{ value:depTex ? 1 : 0 }, uAmb:{ value:ambCol }, uLampC:{ value:LAMP }, uLamp:ULAMP, uHalves:{ value:0 } }, vertexShader:LIFE_V, fragmentShader:LIFE_F, transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });   // RAIN-5c: + the furniture's lights
  const lifeMesh=add(new T.Mesh(fg, lifeM), 0.5);
  /* RAIN-10's tram box (TRAM_V / TRAM_F, its upload): archive/rain-tram-box-RAIN10.js — RELEASE-1 (B) draws the tram in 3D */
  /* RELEASE-1 (B): THE VEHICLES IN 3D — one instanced body per type (pure/vehmesh.js; 0–6 the cars, 7 the tram), each corner through the camera's law in
     VEH_V; drawn into RT.car Lv.veh times, each copy jittered inside its focus blur and added at 1 / copies (per copy a depth pass first, then the colour
     with depth ≤: overlapping parts never add twice), then laid over the view (qCars). vehMode 'sprite' = RAIN-10's cinematic sprites (the probes' CONTROL) */
  const VB=camBasis(), V3=(a)=>new T.Vector3(a[0], a[1], a[2]), VCOP=Math.max(1, Lv.veh|0 || 4);
  const vehU={ uTan:{ value:UT }, uJit:{ value:new T.Vector2() }, uFoc:{ value:FOC }, uCamP:{ value:V3([CAM.x, CAM.y, CAM.z]) }, uCr:{ value:V3(VB.r) }, uCu:{ value:V3(VB.u) }, uCf:{ value:V3(VB.f) }, uAA:{ value:0.001 },
    uAmb:{ value:ambCol }, uLampC:{ value:LAMP }, uHead:{ value:HEAD }, uTail:{ value:TAIL }, uHoney:{ value:HONEY }, uAmber:{ value:AMBER }, uLamp:ULAMP, uW:{ value:1 }, uOccl:{ value:depTex ? 1 : 0 }, uHalves:{ value:0 }, uTime:UTIME,
    uDepthMap:{ value:depTex||blankTex }, uExt:{ value:EXT }, uStream:{ value:0 } };
  const vehZ=new T.ShaderMaterial({ uniforms:vehU, vertexShader:VEH_V, fragmentShader:VEH_F, extensions:{ derivatives:true }, colorWrite:false, depthTest:true, depthWrite:true, transparent:true, side:T.DoubleSide, toneMapped:false, blending:T.NoBlending });   // the colour pass's own program (no colour written): no extra shader
  const vehM=new T.ShaderMaterial({ uniforms:vehU, vertexShader:VEH_V, fragmentShader:VEH_F, extensions:{ derivatives:true }, depthTest:true, depthWrite:false, depthFunc:T.LessEqualDepth, transparent:true, side:T.DoubleSide, toneMapped:false,
    blending:T.CustomBlending, blendEquation:T.AddEquation, blendSrc:T.OneFactor, blendDst:T.OneFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneFactor }); own.push(vehZ, vehM);
  const VTY=[0, 1, 2, 3, 4, 5, 6, 7, 8].map(ty=>{ const B=ty<7 ? carMesh(ty) : ty===7 ? tramBody() : streamMesh(STREAMS.seg, STREAMS.w), g=new T.InstancedBufferGeometry(), cap=ty<7 ? CARS_MAX+2 : ty===7 ? 3 : streamSegs().length+2;   // RELEASE-1: 8 a piece of a kerb's stream
    g.setAttribute('position', new T.BufferAttribute(B.pos, 3)); g.setAttribute('normal', new T.BufferAttribute(B.nrm, 3)); g.setAttribute('aPart', new T.BufferAttribute(B.part, 1));
    const P=new Float32Array(cap*4), L=new Float32Array(cap*4), M=new Float32Array(cap*4), aP=dyn(P, 4), aL=dyn(L, 4), aM=dyn(M, 4); g.setAttribute('aPlace', aP); g.setAttribute('aLook', aL); g.setAttribute('aMore', aM); g.instanceCount=0; own.push(g);
    const z=add(new T.Mesh(g, vehZ), -2), c=add(new T.Mesh(g, vehM), -1); return { ty, g, P, L, M, aP, aL, aM, cap, n:0, z, c }; });
  const VMESH=VTY.flatMap(v=>[v.z, v.c]), compM=mat({ uniforms:{ uT0:{ value:null }, uT1:{ value:null }, uT2:{ value:null }, uT3:{ value:null } }, vertexShader:QUAD_V, fragmentShader:VEHCOMP_F, transparent:true, blending:T.CustomBlending, blendSrc:T.OneFactor, blendDst:T.OneMinusSrcAlphaFactor, blendSrcAlpha:T.OneFactor, blendDstAlpha:T.OneMinusSrcAlphaFactor });
  const qCars=add(new T.Mesh(quad, compM), 0.4); let vehMode='mesh', vehN=0, vehCopiesNow=0;
  /* the jitter discs (unit radius, the golden angle; a single copy sits at the middle) */
  const JIT=n=>[...Array(n).keys()].map(k=>{ if(n===1) return [0, 0]; const r=Math.sqrt((k+0.5)/n), a=k*2.39996; return [r*Math.cos(a), r*Math.sin(a)]; });
  const JITS={}; const jits=n=>JITS[n]||(JITS[n]=JIT(n));
  let vehPlant=null;   // the probes only: these vehicles instead of the traffic ([{ ty, x, near, dir, paint }])
  const CATW=WIN.findIndex(w=>w.id===CAT.win); let catNow=null;   // RELEASE-1 (C): the cat's window in the bake's map
  /* RELEASE-1 (night): a car going away brakes on its way up to a red at the crossing (the vehicles' light: !signal), 34…68 m */
  const brakeOf=c=>c.kind==='car' && c.dir>0 && !signal && c.z>34 && c.z<68;
  let vehLaw=[], streamNow=0, litForce=null; const gustTest=typeof location!=='undefined' && (new URLSearchParams(location.search).get('rain')||'').split(',').includes('gust');   // RELEASE-1: ?rain=gust — an inside-out umbrella every 12 s (to see it)   // the probes: the traffic law's vehicles this frame (the picture and the sound read the same law)
  function vehUpload(cars, t){ VREC.length=0; vehN=0; vehLaw=cars.map(c=>({ kind:c.kind, x:c.x, near:c.kind==='tram' && c.dir>0 ? c.z-c.len : c.z, dir:c.dir })); if(vehMode!=='mesh' || !bodiesOn) return;
    const put=(ty, x, near, dir, len, paint, lx, ly, seed, lit, w2)=>{ const c=projectXYZ(x, 1, near+len*0.5); if(c.z<=1) return; VREC.push({ ty, P:[x, near, dir, len], L:[paint, ty, lx, ly], M:[seed, lit, w2], dep:depthOf(c.dist), w:null }); vehN++; };
    if(vehPlant){ for(const q of vehPlant){ if(q.ty===7) put(7, q.x, q.near, q.dir, VEH3.tram.len, 0, 0.85, 0.9, 1.7, 0, VEH3.tram.w/2); else { const T0=VEH.types[q.ty], Lm=carLamps(q.ty); put(q.ty, q.x, q.near, q.dir, T0.len, q.paint||0, Lm.x, Lm.y, 0.3, q.lit||0, T0.w/2); } } return; }
    let nc=0; for(const c of cars){ if(c.kind==='car'){ if(nc++>=CARS_MAX) continue; const ty=vehType(c.lane, c.slot), T0=VEH.types[ty], Lm=carLamps(ty); put(ty, c.x, c.z, c.dir, T0.len, vehColour(c.lane, c.slot), Lm.x, Lm.y, (c.slot||0)*0.37+c.lane, brakeOf(c) ? 2 : 0, T0.w/2); }
      else if(c.kind==='tram'){ const near= c.dir>0 ? c.z-c.len : c.z; put(7, c.x, near, c.dir, c.len, 0, 0.85, 0.9, (c.t0||0)*0.013, 0, VEH3.tram.w/2); } }
    if(taxiNow){ const T0=VEH.types[4], Lm=carLamps(4); put(4, RAIN_TRAFFIC.stop.x, taxiNow.z, -1, T0.len, 0, Lm.x, Lm.y, 4.2, taxiNow.door>0 ? 1 : 0, T0.w/2); }
    { const near=cars.filter(c=>c.kind==='car' || c.kind==='tram').map(c=>{ const nr= c.kind==='tram' && c.dir>0 ? c.z-c.len : c.z, p=projectXYZ(c.x, 0, nr+(c.len||4.4)/2); return { p, w:c.kind==='tram' ? 1.4 : 1 }; }).filter(q=>q.p.z>1 && q.p.dist<90).sort((a, b)=>a.p.dist-b.p.dist).slice(0, 6);   // RELEASE-1 (night): the nearest six vehicles stir the wet reflections
      RIP.forEach((v, k)=>{ const q=near[k]; if(!q){ v.w=0; return; } v.set(q.p.x, q.p.y, 3.2*q.w/q.p.z, 1); RIPD[k]=depthOf(q.p.dist); }); }
    { const k=streamK(rainEff); streamNow+=(k-streamNow)*0.02; vehU.uStream.value=streamNow; if(streamNow>0.01) for(const q of streamSegs()) put(8, q.x, q.z0, 1, q.len, 0, 0, 0, q.z0*0.13, 0, STREAMS.w/2); } }   // RELEASE-1 (C): the kerbs' streams with the rain (eased like the mood)
  /* each vehicle into the blur level its depth asks for (the city's own radii: 0, uRad.x, .y, .z), the two nearest levels weighted; level k drawn at
     1 / 2^k of the screen into RT.c<k> and softened by the city's rounds for that level (the sharp level: the copies only) */
  const VREC=[]; let vehLevels=[0, 0, 0, 0];
  function vehLevelsOf(){ const U=viewM.uniforms.uRad.value, rads=[0, U.x, U.y, U.z]; for(const q of VREC){ const R=FOC.z*Math.min(1, Math.max(0, Math.abs(q.dep-FOC.x)-FOC.w)*FOC.y), w=[0, 0, 0, 0];
      if(R>=rads[3]) w[3]=1; else { let k=0; while(k<2 && R>=rads[k+1]) k++; const u=(R-rads[k])/Math.max(1e-6, rads[k+1]-rads[k]); w[k]=1-u; w[k+1]=u; } q.w=w; } }
  function fillLevel(L){ let n=0; for(const v of VTY) v.n=0; for(const q of VREC){ const w=q.w[L]; if(w<0.003) continue; const v=VTY[q.ty]; if(v.n>=v.cap) continue; const k=v.n++*4; v.P.set(q.P, k); v.L.set(q.L, k); v.M[k]=q.M[0]; v.M[k+1]=q.M[1]; v.M[k+2]=q.M[2]; v.M[k+3]=w; n++; }   // SPEED-1 step 10: in place
    for(const v of VTY){ v.g.instanceCount=v.n; if(v.n){ v.aP.needsUpdate=v.aL.needsUpdate=v.aM.needsUpdate=true; } } return n; }
  function carsPass(r){ vehCopiesNow=0; for(const k of ['car', 'c1', 'c2', 'c3']) if(RT[k]) RT[k].used=false; if(!VREC.length) return; vehLevelsOf(); const ka=r.getClearAlpha(), au=r.autoClear; r.getClearColor(keepClear); r.setClearColor(0x000000, 0);
    const lv=[['car', VCOP], ['c1', 1], ['c2', 1], ['c3', 1]], tmp=[null, RT.t1, RT.t2, RT.t3], rounds=[0, 2, 2, 3];
    lv.forEach(([key, n], L)=>{ const tg=RT[key], cnt=fillLevel(L); r.setRenderTarget(tg); r.clear(true, true, false); vehLevels[L]=cnt; if(!cnt) return;
      show(...VTY.filter(v=>v.n).flatMap(v=>[v.z, v.c])); r.autoClear=false; vehU.uW.value=1/n; vehU.uAA.value= L ? 0 : 0.7/Math.max(1, UPX.value); const J=jits(n);
      for(let k=0;k<n;k++){ vehU.uJit.value.set(J[k][0], J[k][1]); r.clearDepth(); r.render(scene, camera); } r.autoClear=au;
      for(let k=1;k<=rounds[L];k++){ blur(r, tg.texture, tmp[L], k/tmp[L].width, 0); blur(r, tmp[L].texture, tg, 0, k/tg.height); } vehCopiesNow=Math.max(vehCopiesNow, 1); });
    r.setClearColor(keepClear, ka); if(vehCopiesNow) vehCopiesNow=VCOP; }
  let lifeDropped=0, lifeExtra=null, lifeHold=null;   // RAIN-8: items past the sprite cap this frame (the people must never be among them); RAIN-10: lifeExtra — the probes' planted items
  const NEON=['uSign', 'uSignWarm', 'uCross'].map(u=>[u, lifeM.uniforms[u].value.clone()]);   // RAIN-6c: the signs' own colours kept (Bright lights them up, Warm subdues them)
  const lifeHist=[];
  /* RELEASE-1 (A): how a person is seen — the walking direction's screen step per metre in the figure's own units (x: half widths; y: its height unit),
     the sine of the angle we look down at it (the camera 25 m up), the half stride (m); standing: no direction */
  const NOVIEW=[0, 0, 0, 0], tall=k=>k<=2 || (k>=14 && k<=18);
  function viewOf(q, b, hw, hh){ const sE=Math.max(0, Math.min(0.98, (CAM.y-(q.h||1.7)*0.6)/Math.max(1, b.dist))); if(!q.dir || q.kind===LK.stand || q.kind===LK.talk || q.kind===LK.sit) return [0, 0, sE, 0];
    const p1=projectXYZ(q.x, q.y, q.z+q.dir), yu=2*hh/(tall(q.kind) ? 1.15 : 1); if(p1.z<=1 || !(hw>0) || !(yu>0)) return [0, 0, sE, 0]; return [(p1.x-b.x)/hw, (p1.y-b.y)/yu, sE, (q.step||0.7)/2]; }
  function lifeUpload(t, cars, fx){ const lk=moodOfLook(look); if(lookOver) lifeHist.length=0; if(!lifeHist.length || lifeHist[lifeHist.length-1][1]!==lk){ lifeHist.push([lifeHist.length ? t : -1e9, lk]); if(lifeHist.length>6) lifeHist.splice(1, 1); }
    if(lifeHold!=null) t=lifeHold;   // RAIN-10, probes only: the street's life held at one moment
    const A=lifeAt(t, lk, cars||[], fx && fx.wave, undefined, undefined, lifeHist, { signal, sleep:sleepE, rain:rainEff, gust:gustTest }); let n=0;   // RELEASE-1 (C): rain → the kerbs' streams
    vehUpload(cars||[], t);   // RELEASE-1 (B): the vehicles in 3D
    if(bodiesOn){ const V=vehicleItems(cars||[], t, taxiNow).filter(q=>q.kind!==VK.tram && (vehMode!=='mesh' || (q.kind!==VK.car && q.kind!==VK.panto))); if(taxiNow && taxiNow.person) V.push({ kind:taxiNow.person.walk ? LK.walk : LK.stand, x:taxiNow.person.x, y:0, z:taxiNow.person.z, h:1.72, w:0.75, ph:taxiNow.person.walk ? frac1(t*0.9) : 0.25, c:5+8*UMB.black, wear:wearFor(9700, 5, UMB.black), a:taxiNow.person.a, lane:'taxi' }); A.unshift(...V); }   // RAIN-6b (1, 3): the bodies first (the people over them); RELEASE-1 (B): the cars in 3D, not sprites
    if(bodiesOn){ shutK+=((look===RAIN_ROOM.looks.late ? 1 : 0.5)-shutK)*Math.min(1, 0.02); A.push({ kind:27.9, x:STREET.opp-0.05, y:0.3, z:SHOP.z, h:SHOP.h, span:SHOP.w/2, ph:Math.min(0.99, shutK), c:0, a:1, lane:'facade' });   // RAIN-6b (4): the shop's roller shutter (the band 27.9 → kind 28)
      for(const [za, zb] of LIFE.tables.cafes) for(let z=za+1.5;z<zb-1.5;z+=3.2) A.push({ kind:27, x:STREET.opp-3.75, y:2.62, z, h:0.34, span:1.5, ph:0, c:Math.round(z*7)%9, a:0.95, lane:'facade' }); }   // the awnings' fringes, at their outer edge (the bake's panels: 3.2 m apart, 3.8 m deep, tilted)
    if(lifeExtra) A.push(...lifeExtra);   // RAIN-10: the probes' planted items
    const S=[]; lifeDropped=0; for(const q of A){ if(q.span){ const p1=projectXYZ(q.x, q.y, q.z-q.span), p2=projectXYZ(q.x, q.y, q.z+q.span), p3=projectXYZ(q.x, q.y+q.h, q.z); if(p1.z<=1 || p2.z<=1) continue;   // a facade thing: its width along the facade, its slope
        const cx=(p1.x+p2.x)/2, cy=(p1.y+p2.y)/2, hw=Math.abs(p2.x-p1.x)/2, hh=(p3.y-cy)/2, kk=hw>0 && hh>0 ? (p2.y-p1.y)/(p2.x-p1.x)*hw/(2*hh)*Math.sign(p2.x-p1.x) : 0, dq=depthOf(p3.dist);
        if(!(hh>0.0002) || hidden(cx, cy+hh, dq, CULL.life)) continue; S.push([p3.dist, cx, cy, hw, hh, Math.round(q.kind), Math.round(Math.max(0, Math.min(1, kk+0.5))*16)+q.ph, q.c, q.a, dq, 0, 0, NOVIEW]); continue; }
      const b=projectXYZ(q.x, q.y, q.z); if(b.z<=1) continue; const veh=q.kind===VK.car || q.kind===VK.tram, tp=veh ? projectXYZ(q.x, q.y+q.h, q.z+q.len) : q.kind===LK.stream ? projectXYZ(q.x, q.y, q.z+q.len) : projectXYZ(q.x, q.y+q.h*(q.kind<=2 || (q.kind>=14 && q.kind<=18) ? 1.15 : 1), q.z), hh=(tp.y-b.y)/2, hw=q.w/2/b.z;
      if(veh){ const fy=projectXYZ(q.x, q.y+q.h, q.z).y; q.ph=Math.floor(q.ph)+Math.max(0.12, Math.min(0.95, (fy-b.y)/Math.max(1e-6, tp.y-b.y))); }   // the face's share of the sprite
      if(!(hh>0.00015) || Math.abs(b.x)>2 || Math.abs(b.y)>1.5) continue; const dq=depthOf(b.dist); if(hidden(b.x, b.y+hh*0.2, dq, CULL.life) && hidden(b.x, tp.y, dq, CULL.life)){ culled++; continue; }   // RAIN-6b (6): wholly behind a house or a crown
      const who=q.wear!=null || PEOPLE.includes(q.kind); S.push([b.dist, b.x, b.y, hw, hh, q.kind, q.ph, q.c, q.a, dq, q.wear||0, who || q.kind===LK.stream ? lampLitAt(q.x, q.z) : 0, who ? viewOf(q, b, hw, hh) : NOVIEW]); }
    if(catNow){ const w=WIN[CATW], B=w.q.slice().sort((a, b)=>a[1]-b[1]).slice(0, 2).sort((a, b)=>a[0]-b[0]), m=[(B[0][0]+B[1][0])/2, (B[0][1]+B[1][1])/2], e=[(B[1][0]-B[0][0])/2, (B[1][1]-B[0][1])/2], pm=w.hh*2/2.2, f=catNow.at*CAT.along*2;   // RELEASE-1 (C): the cat on its sill (the window map's quad: its lower edge)
      S.push([w.dist-0.3, m[0]+e[0]*f, m[1]+e[1]*f-0.14*pm, 0.42*pm, 0.31*pm, LK.sillcat, Math.round((catNow.look+1)*4)+Math.min(0.999, catNow.u), ({ sit:0, wash:1, walk:2, lie:3 })[catNow.state]+(catNow.dir<0 ? 4 : 0), 1, w.depth-0.002, 0, 0, NOVIEW]); }
    /* RAIN-10: far first — a nearer person, car or flag is drawn over a farther one (they were drawn in the law's order); past the cap the farthest go */
    S.sort((a, b)=>b[0]-a[0]); if(S.length>NLIFE){ lifeDropped=S.length-NLIFE; S.splice(0, lifeDropped); }
    for(const s of S){ const j=n*4; fRect[j]=s[1]; fRect[j+1]=s[2]; fRect[j+2]=s[3]; fRect[j+3]=s[4]; fK[j]=s[5]; fK[j+1]=s[6]; fK[j+2]=s[7]; fK[j+3]=s[8]; fD[n]=s[9];   /* SPEED-1 step 10: written in place */ fW[n*2]=s[10]; fW[n*2+1]=s[11]; fV.set(s[12], n*4); n++; }
    lifeN=n; fg.instanceCount=n; fRA.needsUpdate=fKA.needsUpdate=fDA.needsUpdate=fWA.needsUpdate=fVA.needsUpdate=true; }
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
  const qGlass=add(new T.Mesh(quad, glassM), 0), ALL=[qCity, qBlur, qDown, qView, qCars, ...VMESH, lifeMesh, wins, lights, dropsMesh, qGlass];
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
    { const vr=(a, b)=>new T.WebGLRenderTarget(a, b, { minFilter:T.LinearFilter, magFilter:T.LinearFilter, format:T.RGBAFormat, depthBuffer:true, stencilBuffer:false, encoding:T.sRGBEncoding });   // RELEASE-1 (B): the vehicles' layers, sharp and three blur levels (each its own depth)
      RT.car=vr(w, h); RT.c1=vr(q(w, 2), q(h, 2)); RT.c2=vr(q(w, 4), q(h, 4)); RT.c3=vr(q(w, 8), q(h, 8)); const C=compM.uniforms; C.uT0.value=RT.car.texture; C.uT1.value=RT.c1.texture; C.uT2.value=RT.c2.texture; C.uT3.value=RT.c3.texture; }
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
    T('cars', ()=>carsPass(r));   // RELEASE-1 (B)
    T('view', ()=>vehCopiesNow ? pass(r, RT.view, qView, wins, qCars, lifeMesh, lights) : pass(r, RT.view, qView, wins, lifeMesh, lights));   // RELEASE-1 (C): the windows first — what stands before the facade (the cat on its sill, the vehicles, the people) over them
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
    now=t; UTIME.value= lifeHold!=null ? lifeHold : t;   // RAIN-10: the probes' held moment holds the shaders' time too (the crowns' sway, the cones)
    if(nin && nin.mood!==undefined && nin.mood!==moodId){ moodId=nin.mood; look=roomLook(RAIN_ROOM, moodId); }
    sleepE= sleepOver!=null ? sleepOver : nin && nin.sleep>0 ? nightDeep(nin.sleep).e : 0;   // RAIN-6b (8): the sleep timer's depth (the forest's curve)
    if(lookOver && RAIN_ROOM.looks[lookOver]) look=RAIN_ROOM.looks[lookOver];   // captures only: a mood held
    { const nd=sleepTraffic(trafficDensity(look.traffic, fx && fx.wave), sleepE), at=(tAudio==null ? t : tAudio)+DENS_MARGIN; if(!book){ book=passBook(nd); natureDensity(nd, -1e9); } else if(nd!==dens && passBookSet(book, at, nd)) natureDensity(nd, at); dens=nd; }   // RAIN-2: booked a margin ahead, the same time to the sound   // RAIN-1: the mood's traffic × Wave — the picture and the sound the same number
    if(look!==painted && painted) dirty=true;
    { const a=1-Math.exp(-dt/MOOD_TC); mistK+=(look.mist-mistK)*a; rainK+=(look.rain-rainK)*a; litK+=(look.lit-litK)*a; mistCol.lerp(lookCols(look).mist, a); ambCol.lerp(lookCols(look).glow, a); }
    /* RAIN-6 (item 7): the effects hand — Echo the rain's strength (the drops, the falling streaks, its sound), Warm ↔ Bright the city light's colour; exactly
       neutral at rest (pure/fxlaw.js). fxOff (probe CONTROL): the hand ignored */
    { const e=fxOff ? 0 : +(fx && fx.echo)||0, tn=fxOff || !fx || fx.tone==null ? 0.5 : +fx.tone, w=fxOff ? 0 : +(fx && fx.wave)||0; fxE=easeTo(fxE, e, dt); fxT=easeTo(fxT, tn, dt); fxW=easeTo(fxW, w, dt);
      rainEff=rainOf(rainK, fxE); const S=streakOf(fxE, fxW), lp=lampOf(fxT), V=viewM.uniforms; V.uStreak.value.set(S.amount, S.slant); ULAMP.value=lp; V.uSway.value= crownTex && treeTex ? 0.0011+0.0042*fxW : 0; lightM.uniforms.uRainK.value=rainEff; lifeM.uniforms.uWind.value=fxW; if(bakedM && Math.abs(lp-bakedLamp)>0.04 || (lp===0 && bakedLamp!==0)){ bakedLamp= Math.abs(lp)<0.02 ? 0 : lp; if(bakedM) dirty=true; }   // RAIN-6b: the baked shop windows follow (a repaint per step, only while the tone moves)
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
    if(litForce!=null){ if(Array.isArray(litForce)) for(let i=0;i<lit.length;i++) lit[i]=litForce[i]||0; else lit.fill(litForce); }   // RELEASE-1, probes only
    catNow= CATW>=0 && bodiesOn ? catAt(lifeHold!=null ? lifeHold : t) : null; if(catNow) lit[CATW]=Math.max(lit[CATW], 0.8);   // RELEASE-1 (C): the cat's room stays lit while it sits there
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
    rain7Dbg:()=>{ let cones=0; for(let j=0;j<nLights;j++) if(lDK[j*2+1]===3 && lCol[j*4+3]>0) cones++; let cs=0; if(crownTex){ const D=crownTex.image.data, N=D.length/4; for(let i=0;i<N;i++) if(D[i*4+3]>0) cs++; cs/=N; }   // RAIN-9: the mask rides in the tree map's alpha
      return { cones, crownShare:cs, sway:viewM.uniforms.uSway.value, focus, buskAt, t:now, busker:false }; },   // RAIN-7; RAIN-9: the musician's figure removed (no place near enough to be seen)
    litSumDbg:()=>{ let x=0; for(let i=0;i<lit.length;i++) x+=lit[i]; return x; },   // RAIN-6b (8): how lit the windows are, all together
    winsShowDbg:on=>{ if(on!=null) wins.material.visible=!!on; return wins.material.visible; },
    winVisDbg:o=>{ if(o && o.off!=null) winM.uniforms.uVisOff.value=o.off ? 1 : 0; if(o && o.lit!=null){ litForce=o.lit; } return { vis:VIS.slice(), off:winM.uniforms.uVisOff.value }; },   // RELEASE-1: the windows' seen share; o.lit — every window forced to that light (the probes)   // RELEASE-1: the lit-window layer on / off (captures)
    catDbg:()=>({ streams:VREC.filter(q=>q.ty===8).length, rain:rainEff, inst:(()=>{ for(let i=0;i<lifeN;i++) if(Math.round(fK[i*4])===LK.sillcat) return { rect:Array.from(fRect.slice(i*4, i*4+4)), k:Array.from(fK.slice(i*4, i*4+4)), d:fD[i] }; return null; })(), lifeN, win:CATW, now:catNow, lit:CATW>=0 ? lit[CATW] : null, at:CATW>=0 ? { x:WIN[CATW].x, y:WIN[CATW].y, hw:WIN[CATW].hw, hh:WIN[CATW].hh } : null }),   // RELEASE-1 (C)
    carAtDbg:(t0, t1, z0=12, z1=40)=>{ for(let t=t0;t<=t1;t+=0.5){ const c=trafficAt(t, book||dens).find(c=>c.kind==='car' && c.z>z0 && c.z<z1); if(c) return { t, x:c.x, z:c.z, dir:c.dir, ty:vehType(c.lane, c.slot) }; } return null; },   // RELEASE-1 (B)
    tramAtDbg:(t0, t1, z0=35, z1=70)=>{ for(let t=t0;t<=t1;t+=0.5){ const c=trafficAt(t, book||dens).find(c=>c.kind==='tram' && (c.dir>0 ? c.z-c.len : c.z)>z0 && (c.dir>0 ? c.z-c.len : c.z)<z1); if(c) return { t, x:c.x, dir:c.dir }; } return null; },   // RAIN-10, captures only: a moment with a tram near
    trafficHoldDbg:v=>{ tHold= v==null ? null : +v; return tHold; },   // RAIN-8, captures only: the traffic held at one moment
    busiestDbg:(t0, t1, z0=25, z1=140)=>{ let best=t0, bn=-1; for(let t=t0;t<=t1;t+=0.5){ const n=trafficAt(t, book||dens).filter(c=>c.kind==='car' && c.z>z0 && c.z<z1).length; if(n>bn){ bn=n; best=t; } } return { t:best, cars:bn }; },   // RAIN-8, captures only
    lifeCapDbg:()=>({ n:lifeN, cap:NLIFE, dropped:lifeDropped }),   // RAIN-8 (4)
    /* RAIN-10, probes only: planted life items (null: none); the depth test on / off (the CONTROL); the soft edges on / off; a region of the view's picture
       (view units) read back from the last frame; the tram's faces this frame */
    lifeHoldDbg:v=>{ lifeHold= v==null ? null : +v; return lifeHold; },
    lifeExtraDbg:list=>{ lifeExtra= list && list.length ? list : null; return !!lifeExtra; }, occlDbg:on=>{ const v= on==null ? lifeM.uniforms.uOccl.value : (on && depTex ? 1 : 0); lifeM.uniforms.uOccl.value=vehU.uOccl.value=v; return v; },
    winDbg:w=>{ if(w!=null) lifeM.uniforms.uWin.value=w; return lifeM.uniforms.uWin.value; }, tramDbg:()=>({ quads:0, mesh:VREC.filter(q=>q.ty===7).length }),   // RELEASE-1 (B): the tram a 3D body (RAIN-10's box archived)
    peekDbg:(x0, y0, x1, y1)=>{ const r=rr; if(!r || !RT.view) return null; const w=RT.view.width, h=RT.view.height, X=x=>Math.max(0, Math.min(w-1, Math.round((x/tw*0.5+0.5)*w))), Y=y=>Math.max(0, Math.min(h-1, Math.round((y/th*0.5+0.5)*h)));
      const a=X(x0), b=X(x1), c=Y(y0), d=Y(y1), W2=Math.max(1, b-a), H2=Math.max(1, d-c), px=new Uint8Array(W2*H2*4); r.readRenderTargetPixels(RT.view, a, c, W2, H2, px); return { w:W2, h:H2, px, pxPerUnit:h/(2*th) }; },
    projectDbg:P=>project(P), depthOfDbg:d=>depthOf(d), bakedAtDbg:(x, y)=>bakedAt(x, y),
    bodiesDbg:on=>{ if(on!=null) bodiesOn=!!on; return { on:bodiesOn, taxi:taxiNow, sweep:sweepNow }; },
    vehDbg:o=>{ if(o && o.mode) vehMode=o.mode; if(o && o.plant!==undefined) vehPlant=o.plant; if(o && o.halves!=null){ vehU.uHalves.value=o.halves ? 1 : 0; lifeM.uniforms.uHalves.value=vehU.uHalves.value; } if(o && o.occl!=null) vehU.uOccl.value=o.occl && depTex ? 1 : 0; return { mode:vehMode, n:vehN, copies:vehCopiesNow, types:VTY.map(v=>VREC.filter(q=>q.ty===v.ty).length), stream:streamNow, levels:vehLevels.slice(), law:vehLaw, list:VREC.filter(q=>q.ty<8).map(q=>({ ty:q.ty, x:q.P[0], near:q.P[1], dir:q.P[2], len:q.P[3], w:q.w })) }; },   // RELEASE-1 (B): 'mesh' | 'sprite' (RAIN-10's, the CONTROL); the halves' colours; the depth test   // RAIN-6b (1): the vehicles' bodies (?rain=nobodies: only their lights, as before)
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
