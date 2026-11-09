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
import { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet, ambienceRoom } from './sound/ambience.js';

export const ROOM_KEY='handsong.nightRoom';
export const ROOM_NAME_MS=1500, ROOM_QUIET_MS=2500;   // the name's time on screen; without the room's picture, the bed waits out the nature crossfade
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const wait=ms=>new Promise(r=>setTimeout(r, ms));
let seq=0, nameT=0, last=null, liveAmb=null;
/* the current room's record (the host's current room; the first room before any is set) */
export const roomCurrent=()=>(roomById(sceneRoom())||ROOMS[0]).record;
/* the nature recipe the ambience should play now (main.js's ambience module asks at build and at every set) */
export const roomNature=()=>roomCurrent().nature;
/* THE NATURE MODULE main.js registers through core/soundmods.js (both engine instances): two nature slots (the second parked); every set
   plays the CURRENT room's recipe, so after a switch the slots crossfade. The live drone steps aside while the music bed plays (a render copy
   keeps it). N0 — the first room's recipe: the module's default level and look-ahead */
export const natureModule=N0=>({ level:N0.level, ahead:N0.ahead, schedule:ambienceSchedule, tune:ambienceTune,
  build:(E, dest, seed)=>{ const a=buildAmbience(E, dest, seed, roomNature(), 2); if(!E.offline) liveAmb=a; return a; },
  set:(E, amb, on, level, when)=>{ ambienceRoom(E, amb, roomNature(), when); ambienceSet(E, amb, on, level, when, E.offline || !bedTakesDrone()); } });
/* at the start, before the first picture: the remembered room, if it is a real one this app has */
export function roomRestore(){ const id=load(ROOM_KEY); if(id && ROOM_IDS.includes(id) && roomById(id)) sceneRoomSet(id); return sceneRoom(); }
/* the next room in order (the Room button) */
export const roomNext=()=>{ const ids=sceneRooms(); return ids.length ? ids[(ids.indexOf(sceneRoom())+1)%ids.length] : null; };
function nameShow(rec){ const el=document.getElementById('nightRoomName'); if(!el) return;
  el.textContent=L(rec.name); el.classList.add('on'); clearTimeout(nameT); nameT=setTimeout(()=>el.classList.remove('on'), ROOM_NAME_MS); }
/* switch to room `id` → a promise of true once it is in (false: no such room, or it is the current one). o.fast (probes): no fades waited,
   no name shown */
export async function roomSwitch(id, o={}){
  const R=roomById(id); if(!R || id===sceneRoom()) return false;
  const my=++seq, rec=R.record, t0=performance.now();
  if(ROOM_IDS.includes(id)) save(ROOM_KEY, id);
  bedHold(rec.bed, rec.bed2);
  const pic=sceneSwitch(id, { fast:o.fast });   // sets the host's current room at once (its synchronous part)
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
    slots:liveAmb.slots.map(x=>({ id:x.A.id, parked:x.parked, mix:x.mix.gain.value, wind:x.wg.gain.value, crickets:x.cg.gain.value, drone:[x.dRootA.gain.value, x.dFifthA.gain.value] })) } : null });
