/* RAIN-0: THE RAIN ROOM JOINS THE APP — loaded only by the development rooms' door (apps/night/rooms/dev.js: the development edition and
   «?room=rain» in the address). Its record is checked as a development room's (its own id, not pinned: never remembered on a device); it joins
   the rooms' list and the scene host and becomes the current room, the interface takes its amber tint at once. */
import { RAIN_ROOM } from './pure/room.js';
import { standInRain } from './standin.js';
import { checkRoom } from '../../pure/room.js';
import { roomAdd } from '../index.js';
import { sceneRoomAdd, sceneRoomSet } from '../../scene/host.js';
import { tintApply } from '../../tint.js';
import { rainHeard } from './heard.js';
import { scalesLoadRest } from '../../../../core/scales.js';
import { bed2SamplerSet, bed2LofiSet } from '../../bed2.js';   // RAIN-4b   // RAIN-4: the room's own moods (core modes Night does not load at start)   // NIGHT-15: the sound's focus while the picture is not drawn

let READY=null;   // RAIN-4: the other built-in modes, loaded once when the room joins
let SAMPLES=null, SLOAD=null;   // RAIN-4b: the recorded version (?bedrec=on: the founder compares by ear), loaded at its first note
export const RAIN=Object.freeze({ ready:()=>READY||Promise.resolve(), record:RAIN_ROOM, standIn:standInRain, base:new URL('./', import.meta.url).href,
  load:(o={})=>import('./rain.js').then(m=>m.rainAssets(o.level).then(city=>(T, opt)=>m.buildRain(T, { ...opt, city }))),   // RAIN-1: the baked city's files go with the build
  prefetch:()=>import('./rain.js').then(()=>null), heard:rainHeard });
/* → the room's id once it is in and current; throws when its record is refused */
export function rainInstall(){
  const why=checkRoom(RAIN_ROOM, { ids:[RAIN_ROOM.id] }); if(why) throw new Error('the rain room\'s record was refused: '+why);
  try{ if(new URLSearchParams(location.search).get('bedrec')==='on') import('./sampled.js').then(M=>bed2SamplerSet((ac, out, ev, when, pv)=>{ if(!SAMPLES){ if(!SLOAD) SLOAD=M.sampledLoad(ac, RAIN.base).then(b=>{ SAMPLES=b; }, ()=>{ SLOAD=null; }); return false; } if(ev.kind!=='chord') M.sampledPlay(ac, out, null, SAMPLES, ev, when, pv); return true; })); }catch(e){}
  bed2LofiSet((ac, dest)=>import('./lofi.js').then(M=>M.lofiEngine(ac, dest, RAIN.base)));   // RAIN-4c: the lo-fi bed's engine (its files fetched with its first note)
  if(!READY) READY=scalesLoadRest().catch(e=>{ console.warn('[night] the modes of the rain room did not load:', e); });   // eslint-disable-line no-console
  if(roomAdd(RAIN)) sceneRoomAdd(RAIN_ROOM.id, { load:RAIN.load, standIn:RAIN.standIn, heard:RAIN.heard, three:()=>import('../../vendor/three-r128/three.min.js') });
  sceneRoomSet(RAIN_ROOM.id); tintApply(RAIN_ROOM, { now:true }); return RAIN_ROOM.id;
}
