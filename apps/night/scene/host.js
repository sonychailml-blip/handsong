/* THE SCENE HOST and Night's BACKGROUNDS (VIS1b, RUN 6; Night's own since CORE-8 — the shared UI reaches it through hooks.scene).
   The scene: a WebGL canvas #scene UNDER the 2D canvas, made only while a room shows, destroyed when it does not (its context released: the GPU
   goes back to the hand model); three.js r128 loaded lazily from our own origin. Levels full / reduced / minimal (minimal = no WebGL: the room's
   2D stand-in, also the fallback when WebGL is missing or lost); the room draws at its own rate and reads the bus only.
   NIGHT-3: ROOMS are registered by id (apps/night/rooms/index.js: record, 2D stand-in, scene code loaded on first open); the current room is the
   first registered until switching exists. BACKGROUNDS: «camera» (the camera module's picture), «dark» (black, no WebGL), «forest» = the current
   room's picture (the stored value keeps its old name). The background changes only the picture: sound, note layout and crop are untouched. */
import { stackAdd, stackSet } from '../../../core/legacy-ui/views/stack.js';
import { cv } from '../../../core/palette.js';
import { ctx, canvas as cv2d } from '../../../core/vision.js';
import { BUS } from '../../../core/pure/bus.js';
const READ=BUS.reader();   // RUN 9: the mood at the room's opening, read-only (the frames read the bus they are given)

export const BACKGROUNDS=Object.freeze(['forest','dark','camera']);
/* RUN 9 (slice 5): THE QUALITY LEVELS — what each draws (the room's own counts: its record's levels). The scene renders at a REDUCED
   resolution (the forest is soft): scale × CSS pixels (never above 1 device pixel per CSS pixel); high 60 fps, medium 30 fps (the «Lighter
   forest»), low = no WebGL at all (the 2D stand-in). Only high has the playing light's shadow (a point light's shadow renders the scene 6 more
   times — measured: the largest share of the forest's cost to hand detection). */
const LV={ full:{ scale:0.85, fps:60, shadow:true }, reduced:{ scale:0.6, fps:30, shadow:false }, minimal:{ scale:0, fps:0, shadow:false } };
let shadowOver=null, optOver=null;   // probe / measurement only: force the shadow on / off at the next opening (null = the level's); optOver { scale, lv } overrides
/* an app registers its rooms (id → { load() → its build function, standIn(ctx, W, H, hands, cv), three() → the library }); a page with none never loads three.js */
const ROOMS=new Map();
let threeLoad=null, roomId=null;
export const sceneRoomAdd=(id, rec)=>{ ROOMS.set(id, rec); threeLoad=rec.three; if(!roomId) roomId=id; };
export const sceneRooms=()=>[...ROOMS.keys()];
export const sceneRoom=()=>roomId;
const REDUCE=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/* RUN 8 (slice 4): the scene's QUALITY is a choice remembered on this device (the development switch in Night's ⓘ: high / medium / low =
   full / reduced / minimal); nothing switches by itself yet (C8 decides from measurements) */
const LEVEL_KEY='handsong.sceneLevel';
const storedLevel=()=>{ try{ const v=localStorage.getItem(LEVEL_KEY); return v && LV[v] ? v : null; }catch(e){ return null; } };
export const SCENE_LEVEL_DEFAULT='reduced';   // RUN 9 (slice 5): medium — high costs 30–40 % of hand detection on the user's laptop (measured); high stays a choice
const heldAt=new Map();   // RUN 9: owner → when its note began (ms)
let THREE=null, loading=null, renderer=null, glCanvas=null, onLost=null, room=null, want=null, level=storedLevel()||SCENE_LEVEL_DEFAULT, made=0, live=0, last=0, notesSeq=0, bg='camera';
const errors=[], info={ fps:0, ms:0, frames:0, t0:0 };

/* three.js r128, once (own origin; CSP script-src 'self') */
export function loadThree(){
  return loading || (loading=threeLoad().then(()=>{ const T=globalThis.THREE;
    if(!T || T.REVISION!=='128') throw new Error('three.js r128 did not load'); THREE=T; return T; }).catch(e=>{ loading=null; throw e; }));
}
function makeRenderer(){
  try{
    const c=document.createElement('canvas'); c.id='scene'; c.setAttribute('aria-hidden','true');
    const r=new THREE.WebGLRenderer({ canvas:c, antialias:level==='full', powerPreference:'high-performance' });
    made++; live++;
    r.outputEncoding=THREE.sRGBEncoding; r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=1.0;
    r.shadowMap.enabled=shadowOn(); r.shadowMap.type=THREE.PCFSoftShadowMap;
    onLost=e=>{ e.preventDefault(); errors.push('context lost'); level='minimal'; dropRenderer(false); stackSet('scene', false); };   // a real loss (our own close removes it first)
    c.addEventListener('webglcontextlost', onLost);
    cv2d.parentNode.insertBefore(c, cv2d); glCanvas=c;
    return r;
  }catch(e){ errors.push('no WebGL: '+(e&&e.message||e)); return null; }
}
function dropRenderer(force){
  if(glCanvas && onLost){ glCanvas.removeEventListener('webglcontextlost', onLost); onLost=null; }
  if(renderer){ try{ renderer.dispose(); if(force) renderer.forceContextLoss(); }catch(e){} renderer=null; live=Math.max(0, live-1); }
  if(glCanvas){ glCanvas.remove(); glCanvas=null; }
}
function resize(){
  if(!renderer || !room) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1)*(optOver && optOver.scale || LV[level].scale)); renderer.setSize(innerWidth, innerHeight, false);
  const v=new THREE.Vector2(); renderer.getDrawingBufferSize(v); room.resize(innerWidth, innerHeight, v.y);
}
addEventListener('resize', ()=>{ if(renderer) resize(); });
/* open a room (its id, default the current room); opt.level 'full' | 'reduced' | 'minimal' → sceneInfo() */
export async function sceneOpen(id=roomId, opt={}){
  want=id; if(opt.level && LV[opt.level]) level=opt.level;
  const R=ROOMS.get(id); if(!R) throw new Error(`no room «${id}»`);
  await loadThree(); const build=await R.load(); if(want!==id) return sceneInfo();
  if(room && room.id===id && (renderer || level==='minimal')) return sceneInfo();
  if(room){ room.dispose(); room=null; }
  if(level!=='minimal' && !renderer) renderer=makeRenderer();
  if(!renderer) level='minimal';
  if(renderer){ const tb=performance.now(); room=build(THREE, { C:cv, level, w:innerWidth, h:innerHeight, reduce:REDUCE, mood:(READ.get('nightSky')||{}).mood, shadow:shadowOn(), lv:optOver && optOver.lv }); resize(); last=0; info.t0=0; info.frames=0;
    /* RUN 9 (slice 5): compile every shader NOW (inside the opening, not inside a frame later: a 1–4-s frame) */
    try{ renderer.compile(room.scene, room.camera); }catch(e){ errors.push('compile: '+(e&&e.message||e)); } info.openMs=Math.round(performance.now()-tb); }
  stackSet('scene', !!renderer);
  return sceneInfo();
}
export function sceneClose(){ want=null; stackSet('scene', false); if(room){ room.dispose(); room=null; } dropRenderer(true); info.fps=0; }
/* the scene module (layer «scene»): the room at its own rate; a new solo note-on makes the playing light glint */
function sceneFrame(t, bus){
  if(!renderer || !room) return;
  const L=LV[level]; if(last && t-last < 1000/L.fps-2) return;
  const dt=last ? Math.min(0.05, (t-last)/1000) : 1/60; last=t;
  const N=bus.since('notes', notesSeq); notesSeq=N.seq; for(const it of N.items) if(it.kind==='on' && it.role==='ld') room.glint(0, it.vel);
  /* RUN 9 (slice 4): how long the playing note has been held (the flower opens on a long one); entries older than a minute are dropped */
  for(const it of N.items) if(it.role==='ld'){ if(it.kind==='on') heldAt.set(it.owner, t); else if(it.kind==='off') heldAt.delete(it.owner); }
  let hs=0; for(const [o,t0] of heldAt){ const a=(t-t0)/1000; if(a>60) heldAt.delete(o); else if(a<30) hs=Math.max(hs, a); } if(room.held) room.held(hs);
  const t0=performance.now();
  room.update(dt, t/1000+clockOff, bus.get('handsView')||[], bus.get('nightFx'), bus.get('nightSky'));   // RUN 7 (C5): the Night effects' values; RUN 9: the mood and the sleep
  renderer.render(room.scene, room.camera);
  if(snapWant){ const f=snapWant; snapWant=null; f(); }   // RUN 8 probe: copy the frame JUST rendered (the drawing buffer is cleared once presented)
  const ms=performance.now()-t0; info.ms= info.ms ? info.ms*0.9+ms*0.1 : ms;
  info.frames++; info.total=(info.total||0)+1; if(!info.t0) info.t0=t; if(t-info.t0>=1000){ info.fps=Math.round(info.frames*1000/(t-info.t0)); info.frames=0; info.t0=t; }
}
stackAdd({ kind:'visual', id:'scene', layer:'scene', cost:{ cls:'heavy', gpu:true }, frame:sceneFrame }); stackSet('scene', false);

/* the BACKDROP (layer «background»): Dark = black; the room = the 2D canvas cleared so the room shows through (or, without WebGL, the room's
   2D stand-in); Camera = nothing here (the camera module draws the picture) */
function backdrop(t, bus){
  if(bg==='camera') return;
  const W=cv2d.width, H=cv2d.height;
  if(bg==='dark'){ ctx.fillStyle=cv('hn-dark'); ctx.fillRect(0,0,W,H); return; }
  if(renderer){ ctx.clearRect(0,0,W,H); return; }
  const R=ROOMS.get(roomId); if(R && R.standIn) R.standIn(ctx, W, H, bus.get('handsView')||[], cv);
}
stackAdd({ kind:'visual', id:'backdrop', layer:'background', cost:{ cls:'light', gpu:false }, frame:backdrop });
/* choose the background → a promise of sceneInfo() (the room opens asynchronously: three.js loads once) */
export function setBackground(mode){
  if(!BACKGROUNDS.includes(mode)) mode='camera';
  bg=mode; stackSet('camera', mode==='camera');
  /* RUN 8: the 2D canvas is OPAQUE (vision.js: alpha:false — Full's text and picture rely on it), so its «clear» was black over the room:
     the user saw a plain black forest. On the Forest background the canvas is composited with SCREEN (style.css): its black lets the room
     through, its lights (fireflies, glow, halo) add on top. Night draws no text on the canvas. */
  document.body.classList.toggle('bg-room', mode==='forest');
  if(mode==='forest') return sceneOpen(roomId).catch(e=>{ errors.push(String(e&&e.message||e)); level='minimal'; return sceneInfo(); });
  sceneClose(); return Promise.resolve(sceneInfo());
}
export const backgroundOf=()=>bg;
/* choose the scene's quality → a promise of sceneInfo(); an open room is rebuilt at the new level (its WebGL context released first) */
export function setSceneLevel(v){
  if(!LV[v]) return Promise.resolve(sceneInfo());
  level=v; try{ localStorage.setItem(LEVEL_KEY, v); }catch(e){}
  if(bg!=='forest') return Promise.resolve(sceneInfo());
  if(room){ room.dispose(); room=null; } dropRenderer(true); stackSet('scene', false);
  return sceneOpen(roomId).catch(e=>{ errors.push(String(e&&e.message||e)); level='minimal'; return sceneInfo(); });
}
export const sceneLevel=()=>level;
const shadowOn=()=> shadowOver!=null ? shadowOver : LV[level].shadow;
export const sceneShadowDbg=v=>{ shadowOver= v==null ? null : !!v; return shadowOver; };
export const sceneOptDbg=o=>{ optOver=o||null; return optOver; };   // measurement only (slice 5's budget passes)
export const sceneInfo=()=>({ id:room?room.id:null, bg, level, webgl:!!renderer, contextsMade:made, contextsLive:live, fps:info.fps, frameMs:Math.round(info.ms*10)/10,
  pixelRatio: renderer ? renderer.getPixelRatio() : 0, fpsCap:LV[level].fps, shadow: renderer ? renderer.shadowMap.enabled : false, openMs:info.openMs||0,   // RUN 9 (slice 5)
  programs: renderer ? (renderer.info.programs||[]).length : 0, rendered:info.total||0,
  errors:errors.slice(-5) });
/* probes: the room object (numbers through its state()/project()); a level for the next open */
export const sceneRoomDbg=()=>room;
/* probe only: the room's next RENDERED frame, downscaled to 64 × 36 → its mean RGB sum (null without WebGL; times out after 2 s).
   RUN 9: alt(on) given → the SAME frame is rendered a second time with alt(true) applied (then alt(false)) → [first, second] — an exact
   A/B of one scene state (no time passes between the two renders); full — at the drawing buffer's own size (a 64 × 36 downscale samples
   only a few source pixels and misses a thin streak) */
let snapWant=null;
export function sceneSnapDbg(alt, full=false){
  if(!renderer || !glCanvas) return Promise.resolve(null);
  const gw=full ? glCanvas.width : 64, gh=full ? glCanvas.height : 36;
  const grab=()=>{ const t=document.createElement('canvas'); t.width=gw; t.height=gh; const g=t.getContext('2d'); g.drawImage(glCanvas,0,0,gw,gh);
    const px=g.getImageData(0,0,gw,gh).data; let sum=0; for(let i=0;i<px.length;i+=4) sum+=px[i]+px[i+1]+px[i+2]; return sum/(px.length/4); };
  return new Promise(res=>{ const to=setTimeout(()=>{ snapWant=null; res(null); }, 2000);
    snapWant=()=>{ clearTimeout(to); const a=grab(); if(!alt){ res(a); return; } try{ alt(true); renderer.render(room.scene, room.camera); res([a, grab()]); } finally { alt(false); } }; }); }
export const sceneLevelDbg=v=>{ if(LV[v]) level=v; return level; };
/* RUN 9 probe only: how long a playing note (by owner) has been held, as the host sees it (null: not held) */
export const sceneHeldDbg=owner=>heldAt.has(owner) ? (performance.now()-heldAt.get(owner))/1000 : null;
/* RUN 9 probe only: the compiled shader programs → [{ name, ok }] (null without WebGL) — a patched or new shader that fails is caught */
export const sceneProgramsDbg=()=>renderer ? (renderer.info.programs||[]).map(p=>({ name:p.name, ok:!p.diagnostics || p.diagnostics.runnable!==false })) : null;
/* RUN 9 probe / capture only: move the room's clock so that NOW reads `sec` seconds into the night's cycle (null = back to the real clock) */
let clockOff=0;
export const sceneClockDbg=sec=>{ clockOff= sec==null ? 0 : sec-performance.now()/1000; return clockOff; };
