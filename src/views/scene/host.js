/* VIS1b (RUN 6, docs/VIS1-design.md §4–§6, Calm plan §3) — THE SCENE HOST and Calm's BACKGROUNDS.
   The scene: a WebGL canvas #scene UNDER the 2D canvas, made only while a room is shown and destroyed when it is not (its context is
   released — «room off» frees the GPU for the hand model, review R2); three.js r128 loaded LAZILY from our own origin (a dynamic import of
   the vendored UMD file, which sets globalThis.THREE — never in Full); levels full / reduced / minimal (minimal = no WebGL: a 2D stand-in,
   also the fallback when WebGL is missing or the context is lost); the room draws at its own rate (60 / 30 fps caps); it reads the bus only.
   The BACKGROUNDS (user, review 2026-10-17): «camera» — today's picture (the camera module); «dark» — plain black, no WebGL at all; «forest» —
   the room. The background changes only the picture: the sound, the note layout and the crop are untouched (the crop is synced per camera
   frame by main.onHands, not by the picture). Stats for the latency meter's «Scene» line (fps, frame time, level). */
import { stackAdd, stackSet } from '../stack.js';
import { cv } from '../../palette.js';
import { ctx, canvas as cv2d } from '../../vision.js';
import { buildForest } from './forest.js';

export const BACKGROUNDS=Object.freeze(['forest','dark','camera']);
const LV={ full:{ dpr:1.5, fps:60 }, reduced:{ dpr:0.75, fps:30 }, minimal:{ dpr:0, fps:0 } };
const ROOMS={ forest:buildForest };
const REDUCE=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/* RUN 8 (slice 4): the scene's QUALITY is a choice remembered on this device (the development switch in Calm's ⓘ: high / medium / low =
   full / reduced / minimal); nothing switches by itself yet (C8 decides from measurements) */
const LEVEL_KEY='handsong.sceneLevel';
const storedLevel=()=>{ try{ const v=localStorage.getItem(LEVEL_KEY); return v && LV[v] ? v : null; }catch(e){ return null; } };
export const SCENE_LEVEL_DEFAULT='full';
let THREE=null, loading=null, renderer=null, glCanvas=null, onLost=null, room=null, want=null, level=storedLevel()||SCENE_LEVEL_DEFAULT, made=0, live=0, last=0, notesSeq=0, bg='camera';
const errors=[], info={ fps:0, ms:0, frames:0, t0:0 };

/* three.js r128, once (own origin; CSP script-src 'self') */
export function loadThree(){
  return loading || (loading=import('../../../vendor/three-r128/three.min.js').then(()=>{ const T=globalThis.THREE;
    if(!T || T.REVISION!=='128') throw new Error('three.js r128 did not load'); THREE=T; return T; }).catch(e=>{ loading=null; throw e; }));
}
function makeRenderer(){
  try{
    const c=document.createElement('canvas'); c.id='scene'; c.setAttribute('aria-hidden','true');
    const r=new THREE.WebGLRenderer({ canvas:c, antialias:level==='full', powerPreference:'high-performance' });
    made++; live++;
    r.outputEncoding=THREE.sRGBEncoding; r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=1.0;
    r.shadowMap.enabled=true; r.shadowMap.type= level==='full' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
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
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, LV[level].dpr)); renderer.setSize(innerWidth, innerHeight, false);
  const v=new THREE.Vector2(); renderer.getDrawingBufferSize(v); room.resize(innerWidth, innerHeight, v.y);
}
addEventListener('resize', ()=>{ if(renderer) resize(); });
/* open a room (id 'forest'); opt.level 'full' | 'reduced' | 'minimal' → sceneInfo() */
export async function sceneOpen(id='forest', opt={}){
  want=id; if(opt.level && LV[opt.level]) level=opt.level;
  await loadThree(); if(want!==id) return sceneInfo();
  if(room && room.id==='room.'+id && (renderer || level==='minimal')) return sceneInfo();
  if(room){ room.dispose(); room=null; }
  if(level!=='minimal' && !renderer) renderer=makeRenderer();
  if(!renderer) level='minimal';
  if(renderer){ room=ROOMS[id](THREE, { C:cv, level, w:innerWidth, h:innerHeight, reduce:REDUCE }); resize(); last=0; info.t0=0; info.frames=0; }
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
  const t0=performance.now();
  room.update(dt, t/1000, bus.get('handsView')||[], bus.get('calmFx'));   // RUN 7 (C5): the Calm effects' values for the forest's visuals
  renderer.render(room.scene, room.camera);
  if(snapWant){ const f=snapWant; snapWant=null; f(); }   // RUN 8 probe: copy the frame JUST rendered (the drawing buffer is cleared once presented)
  const ms=performance.now()-t0; info.ms= info.ms ? info.ms*0.9+ms*0.1 : ms;
  info.frames++; if(!info.t0) info.t0=t; if(t-info.t0>=1000){ info.fps=Math.round(info.frames*1000/(t-info.t0)); info.frames=0; info.t0=t; }
}
stackAdd({ kind:'visual', id:'scene', layer:'scene', cost:{ cls:'heavy', gpu:true }, frame:sceneFrame }); stackSet('scene', false);

/* the BACKDROP (layer «background»): Dark = black; Forest = the 2D canvas cleared so the room shows through (or, without WebGL, a 2D
   stand-in: the night's two colours and a soft glow at each hand); Camera = nothing here (the camera module draws the picture) */
function backdrop(t, bus){
  if(bg==='camera') return;
  const W=cv2d.width, H=cv2d.height;
  if(bg==='dark'){ ctx.fillStyle=cv('calm-dark'); ctx.fillRect(0,0,W,H); return; }
  if(renderer){ ctx.clearRect(0,0,W,H); return; }
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0, cv('forest-fog')); g.addColorStop(1, cv('forest-ground')); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(const h of bus.get('handsView')||[]){ const r=Math.max(12, 46*(1.3-h.d)), gr=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y,r);
    gr.addColorStop(0, cv(h.play?'forest-light':'forest-fx')); gr.addColorStop(1, cv('halo-a0')); ctx.fillStyle=gr; ctx.fillRect(h.x-r,h.y-r,2*r,2*r); }
}
stackAdd({ kind:'visual', id:'backdrop', layer:'background', cost:{ cls:'light', gpu:false }, frame:backdrop });
/* choose the background → a promise of sceneInfo() (the room opens asynchronously: three.js loads once) */
export function setBackground(mode){
  if(!BACKGROUNDS.includes(mode)) mode='camera';
  bg=mode; stackSet('camera', mode==='camera');
  /* RUN 8: the 2D canvas is OPAQUE (vision.js: alpha:false — Full's text and picture rely on it), so its «clear» was black over the room:
     the user saw a plain black forest. On the Forest background the canvas is composited with SCREEN (style.css): its black lets the room
     through, its lights (fireflies, glow, halo) add on top. Calm draws no text on the canvas. */
  document.body.classList.toggle('bg-forest', mode==='forest');
  if(mode==='forest') return sceneOpen('forest').catch(e=>{ errors.push(String(e&&e.message||e)); level='minimal'; return sceneInfo(); });
  sceneClose(); return Promise.resolve(sceneInfo());
}
export const backgroundOf=()=>bg;
/* choose the scene's quality → a promise of sceneInfo(); an open room is rebuilt at the new level (its WebGL context released first) */
export function setSceneLevel(v){
  if(!LV[v]) return Promise.resolve(sceneInfo());
  level=v; try{ localStorage.setItem(LEVEL_KEY, v); }catch(e){}
  if(bg!=='forest') return Promise.resolve(sceneInfo());
  if(room){ room.dispose(); room=null; } dropRenderer(true); stackSet('scene', false);
  return sceneOpen('forest').catch(e=>{ errors.push(String(e&&e.message||e)); level='minimal'; return sceneInfo(); });
}
export const sceneLevel=()=>level;
export const sceneInfo=()=>({ id:room?room.id:null, bg, level, webgl:!!renderer, contextsMade:made, contextsLive:live, fps:info.fps, frameMs:Math.round(info.ms*10)/10,
  errors:errors.slice(-5) });
/* probes: the room object (numbers through its state()/project()); a level for the next open */
export const sceneRoomDbg=()=>room;
/* probe only: the room's next RENDERED frame, downscaled to 64 × 36 → its mean RGB sum (null without WebGL; times out after 2 s) */
let snapWant=null;
export function sceneSnapDbg(){
  if(!renderer || !glCanvas) return Promise.resolve(null);
  return new Promise(res=>{ const to=setTimeout(()=>{ snapWant=null; res(null); }, 2000);
    snapWant=()=>{ clearTimeout(to); const t=document.createElement('canvas'); t.width=64; t.height=36; const g=t.getContext('2d'); g.drawImage(glCanvas,0,0,64,36);
      const px=g.getImageData(0,0,64,36).data; let sum=0; for(let i=0;i<px.length;i+=4) sum+=px[i]+px[i+1]+px[i+2]; res(sum/(px.length/4)); }; }); }
export const sceneLevelDbg=v=>{ if(LV[v]) level=v; return level; };
