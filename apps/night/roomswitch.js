/* NIGHT-3 stage 5 part 2: THE ROOM SWITCH — one door for everything a room change touches, in this order: the music bed fades out and holds
   (it takes the new room's recipes while silent); the picture switches (the scene host: fades, hand detection paused while the room builds,
   the WebGL context kept; with Dark or Camera only the current room changes); the nature sound crossfades on its second slot (main.js's
   ambience module plays roomNature()); the room's name shows softly; after the fades the bed plays again, its first chord soon after. The
   choice is remembered on this device — real rooms only (a development room never is). Nothing here makes an audio node. */
import { ambienceOn, ambienceInfo } from '../../core/audio.js';
import { L } from '../../core/i18n.js';
import { sceneSwitch, sceneRoom, sceneRoomSet, sceneRooms, backgroundOf } from './scene/host.js';
import { ROOMS, roomById } from './rooms/index.js';
import { ROOM_IDS } from './pure/room.js';
import { bedHold, bedResume, bedTakesDrone } from './bed.js';
import { tintApply, tintNow } from './tint.js';   // DESIGN-1: the interface takes the room's tint
import { setGlowTint, glowTint } from '../../core/state.js';   // CORE-25: the hands' lit firefly and the note field's glow take it too
import { roomMusicApply } from './roomdoors.js';   // RAIN-4
import { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet, ambienceRoom, ambienceBrook, ambienceBrookLight, ambienceBrookRec, ambienceLayers, ambienceLayersRec, ambienceLayersFocus, ambienceLayersDensity, ambienceLayersStats, NATURE_WORKLET, ambienceLayersRain } from './sound/ambience.js';

export const ROOM_KEY='handsong.nightRoom';
export const ROOM_NAME_MS=1500, ROOM_QUIET_MS=2500;   // the name's time on screen; without the room's picture, the bed waits out the nature crossfade
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const wait=ms=>new Promise(r=>setTimeout(r, ms));
let seq=0, nameT=0, last=null, liveAmb=null, brookLight=false;
/* the current room's record (the host's current room; the first room before any is set) */
export const roomCurrent=()=>(roomById(sceneRoom())||ROOMS[0]).record;
/* the nature recipe the ambience should play now (main.js's ambience module asks at build and at every set) */
export const roomNature=()=>roomCurrent().nature;
/* THE NATURE MODULE main.js registers through core/soundmods.js (both engine instances): two nature slots (the second parked); every set
   plays the CURRENT room's recipe, so after a switch the slots crossfade. The live drone steps aside while the music bed plays (a render copy
   keeps it). N0 — the first room's recipe: the module's default level and look-ahead */
export const natureModule=N0=>({ level:N0.level, ahead:N0.ahead, schedule:ambienceSchedule, tune:ambienceTune,
  build:(E, dest, seed)=>{ const a=buildAmbience(E, dest, seed, roomNature(), 2); if(!E.offline){ liveAmb=a; natureBrook(E, a, seed); natureLayers(E, a, seed); } return a; },
  set:(E, amb, on, level, when)=>{ if(!E.offline) natureLayers(E, amb, amb.seed); ambienceRoom(E, amb, roomNature(), when); ambienceSet(E, amb, on, level, when, E.offline || !bedTakesDrone()); } });   // RAIN-3: a room with layered recordings builds their node when it first plays
/* NIGHT-8: THE STREAM'S WORKLET — its module into a context once (→ a promise of true; false: no AudioWorklet or it failed — the nature plays
   without the stream), then the node joins the live ambience (the first room with a stream gives the voices; built once, rule #3) */
const loads=new WeakMap();
export function natureLoad(ac){
  let p=loads.get(ac);
  if(!p){ p= ac && ac.audioWorklet ? ac.audioWorklet.addModule(NATURE_WORKLET).then(()=>true, e=>{ console.warn('[night] the stream sound could not load:', e); return false; }) : Promise.resolve(false); loads.set(ac, p); }   // eslint-disable-line no-console
  return p;
}
const brookVoices=()=>{ const R=[roomCurrent(), ...ROOMS.map(r=>r.record)].find(r=>r.nature.stream); return R ? R.nature.stream.voices : null; };
function natureBrook(E, a, seed){ const v=brookVoices(); if(!v) return;
  natureLoad(E.ac).then(ok=>{ if(ok && ambienceBrook(E, a, v, seed)){ ambienceBrookLight(E, a, brookLight); natureRec(E, a); } }); }
/* NIGHT-8b: THE STREAM'S RECORDING — the room's file (its recipe's stream.rec, in its folder) fetched once a session from our own origin, decoded
   into each context that plays it (the browser resamples to the context's rate), its channels averaged to one, handed to the stream's node with
   the recipe's level. Any failure leaves the synthesis playing (amb.brook.rec 'failed'). */
const recBytes=new Map();   // url → a promise of the file's bytes
export function natureRecOf(){ const R=[roomById(sceneRoom()), ...ROOMS].find(r=>r && r.base && r.record.nature.stream && r.record.nature.stream.rec);
  return R ? { url:new URL(R.record.nature.stream.rec.file, R.base).href, norm:R.record.nature.stream.rec.norm } : null; }
/* a room file's bytes, fetched once a session from our own origin (the one fetch of a room's sound) */
function natureBytes(url){ let p=recBytes.get(url);
  if(!p){ p=fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status+' '+url); return r.arrayBuffer(); }); recBytes.set(url, p); p.catch(()=>{ if(recBytes.get(url)===p) recBytes.delete(url); }); }
  return p; }
export function natureRecPcm(ac, url){
  return natureBytes(url).then(b=>ac.decodeAudioData(b.slice(0))).then(buf=>{ const n=buf.length, C=buf.numberOfChannels, m=new Float32Array(n);
    for(let c=0;c<C;c++){ const d=buf.getChannelData(c); for(let i=0;i<n;i++) m[i]+=d[i]/C; } return m; }); }
function natureRec(E, a){ const R=natureRecOf(); if(!R || !a.brook) return; a.brook.rec='loading';
  natureRecPcm(E.ac, R.url).then(pcm=>ambienceBrookRec(E, a, pcm, R.norm), e=>{ a.brook.rec='failed'; console.warn('[night] the stream recording did not load — the synthesis plays:', e); }); }   // eslint-disable-line no-console
/* RAIN-3: a room file decoded in stereo into a context (the browser resamples): → a promise of [L, R] (a mono file gives the same channel twice) */
export function natureRecStereo(ac, url){ return natureBytes(url).then(b=>ac.decodeAudioData(b.slice(0))).then(buf=>{ const L=buf.getChannelData(0).slice(); return [L, buf.numberOfChannels>1 ? buf.getChannelData(1).slice() : L]; }); }
/* RAIN-3: THE LAYERED RECORDINGS of the current room (its recipe's `nature.layers`): the node built once when such a room first plays (opt-in: a room
   without layers builds nothing), then each layer's file from the room's folder, decoded in stereo, handed to the node with its level. A failure leaves
   that layer to the node's own soft synthesis (the fallback). */
function natureLayers(E, a, seed){
  const R=roomById(sceneRoom()); if(!a || a.layers || !R || !R.base || !R.record.nature.layers) return;
  const N=R.record.nature; a.layersWant=a.layersWant||natureLoad(E.ac).then(ok=>{ if(!ok || !ambienceLayers(E, a, N, seed)) return;
    for(const which of ['near', 'far']){ const L=N.layers[which]; a.layers.rec[which]='loading';
      natureRecStereo(E.ac, new URL(L.file, R.base).href).then(([l, r])=>ambienceLayersRec(E, a, which, l, r, L.norm), e=>{ a.layers.rec[which]='failed'; console.warn('[night] a layer of the room sound did not load — its synthesis plays:', e); }); } naturePasses(E, a, R); });   // eslint-disable-line no-console
}
/* RAIN-1: the passes' one-shots (mono) of a room whose layers have `passes`, after its layers (natureLayers calls it) */
function naturePasses(E, a, R){ const P=R.record.nature.layers.passes; if(!P || !a.layers || a.layers.rec.cars) return; a.layers.rec.cars='loading';
  natureRecStereo(E.ac, new URL(P.file, R.base).href).then(([l])=>ambienceLayersRec(E, a, 'cars', l, null, P.norm), e=>{ a.layers.rec.cars='failed'; console.warn('[night] the room\'s car passes did not load — the street plays without them:', e); }); }   // eslint-disable-line no-console
/* RAIN-1: the traffic's density (the mood's amount × Wave), the picture's own number, for the passes (no layers: nothing) */
export function natureDensity(d, at=null){ if(liveAmb && liveAmb.layers) ambienceLayersDensity(null, liveAmb, d, at); }   // RAIN-2: at — the audio time it counts from (null: the audio thread's now + the margin)
/* RAIN-3: the focus (0 the glass … 1 the far city), the picture's own eased number, for the layers' near / far balance (no layers: nothing) */
export function natureFocus(f){ if(liveAmb && liveAmb.layers) ambienceLayersFocus(null, liveAmb, f); }
export const natureLayersDbg=()=> liveAmb && liveAmb.layers ? ambienceLayersStats(null, liveAmb).then(st=>st && { ...st, rec:{ ...liveAmb.layers.rec }, playing:liveAmb.layers.on }) : Promise.resolve(null);
export function natureRain(g){ if(liveAmb && liveAmb.layers) ambienceLayersRain(null, liveAmb, g); }   // RAIN-6: Echo — the rain's sound, { near, far } gains (1 at rest)
/* probe: the live layers' node — its counters, its recordings' state and whether it plays → a promise (null without the node) */
/* the Lighter mode (the shell): fewer bubbles, the nearest voices only */
export function natureLight(v){ brookLight=!!v; if(liveAmb && liveAmb.brook) ambienceBrookLight(null, liveAmb, brookLight); }
/* at the start, before the first picture: the visit's start room (guard.js: html[data-room] — random, or the address's), if it is a real one this app has.
   RAIN-R1: no room is remembered any more (a random room every visit): the old key is dropped */
try{ localStorage.removeItem(ROOM_KEY); }catch(e){}
/* CORE-25: the canvas glow follows the interface's tint — at once, or through its ease (the registered --night-tint is read each frame until it
   reaches the target; at most 6 s) */
let glowSeq=0, glowOff=false;
export const glowFollowDbg=o=>{ if(o && 'off' in o) glowOff=!!o.off; return { off:glowOff }; };   // probe only (CORE-25 CONTROL): the follow ignored
function glowFollow(target, now){
  if(glowOff) return; const my=++glowSeq; setGlowTint(tintNow()); if(now || typeof requestAnimationFrame!=='function') return;
  setGlowTint(target); const want=glowTint; setGlowTint(tintNow());
  const t0=performance.now(), step=()=>{ if(my!==glowSeq) return; setGlowTint(tintNow()); if(glowTint===want || performance.now()-t0>6000){ setGlowTint(want); return; } requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export function roomRestore(){ const id=typeof document!=='undefined' ? document.documentElement.getAttribute('data-room') : null; if(id && ROOM_IDS.includes(id) && roomById(id)) sceneRoomSet(id); glowFollow(tintApply(roomCurrent(), { now:true }), true); return sceneRoom(); }   // DESIGN-1: its tint at once
/* the next room in order (the Room button) */
export const roomNext=()=>{ const ids=sceneRooms(); return ids.length ? ids[(ids.indexOf(sceneRoom())+1)%ids.length] : null; };
function nameShow(rec){ const el=document.getElementById('nightRoomName'); if(!el) return;
  el.textContent=L(rec.name); el.classList.add('on'); clearTimeout(nameT); nameT=setTimeout(()=>el.classList.remove('on'), ROOM_NAME_MS); }
/* switch to room `id` → a promise of true once it is in (false: no such room, or it is the current one). o.fast (probes): no fades waited,
   no name shown */
export async function roomSwitch(id, o={}){
  const R=roomById(id); if(!R || id===sceneRoom()) return false;
  const my=++seq, rec=R.record, t0=performance.now();
  bedHold(rec.bed, rec.bed2);
  const pic=sceneSwitch(id, { fast:o.fast });   // sets the host's current room at once (its synchronous part)
  roomMusicApply();   // RAIN-4: the room's own mood and timbre (or the forest's back)
  glowFollow(tintApply(rec, { now:o.fast }), o.fast);   // DESIGN-1: the interface's accents ease to the new room's tint over the picture's fades; CORE-25: the hands' glow with them
  const I=ambienceInfo(); if(I && I.on) ambienceOn(true, I.level);   // the nature crossfade: the module now finds the new room's recipe
  if(!o.fast) nameShow(rec);
  await pic;
  if(!o.fast && backgroundOf()!=='forest') await wait(ROOM_QUIET_MS);
  if(my===seq) bedResume();
  last={ id, ms:Math.round(performance.now()-t0), picture:backgroundOf()==='forest' };
  return true;
}
/* probe only */
export const roomSwitchDbg=()=>({ room:sceneRoom(), rooms:sceneRooms(), stored:load(ROOM_KEY), last, seq,
  nature:liveAmb ? { id:liveAmb.A.id, cur:liveAmb.cur, parked:liveAmb.slots.map(x=>x.parked),
    /* each slot as the live graph has it now: its recipe, its fade, the gains it plays (the probes read that the old room really went) */
    slots:liveAmb.slots.map(x=>({ id:x.A.id, parked:x.parked, mix:x.mix.gain.value, wind:x.wg.gain.value, crickets:x.cg.gain.value, stream:x.sg.gain.value, drone:[x.dRootA.gain.value, x.dFifthA.gain.value] })),
    brook:liveAmb.brook ? { sleep:liveAmb.brook.sleep, light:liveAmb.brook.light, rec:liveAmb.brook.rec } : null } : null });   // NIGHT-8: the stream (NIGHT-8b: its recording)
export const natureAmbDbg=()=>liveAmb;   // probe only (the stream's node, its stats)
