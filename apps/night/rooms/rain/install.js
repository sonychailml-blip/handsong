/* RAIN-0: THE RAIN ROOM JOINS THE APP — loaded only by the development rooms' door (apps/night/rooms/dev.js: the development edition and
   «?room=rain» in the address). Its record is checked as a development room's (its own id, not pinned: never remembered on a device); it joins
   the rooms' list and the scene host and becomes the current room, the interface takes its amber tint at once. */
import { RAIN_ROOM } from './pure/room.js';
import { standInRain } from './standin.js';
import { checkRoom } from '../../pure/room.js';
import { roomAdd } from '../index.js';
import { sceneRoomAdd, sceneRoomSet } from '../../scene/host.js';
import { tintApply } from '../../tint.js';

export const RAIN=Object.freeze({ record:RAIN_ROOM, standIn:standInRain, base:new URL('./', import.meta.url).href,
  load:(o={})=>import('./rain.js').then(m=>m.rainAssets(o.level).then(()=>m.buildRain)), prefetch:()=>import('./rain.js').then(()=>null) });
/* → the room's id once it is in and current; throws when its record is refused */
export function rainInstall(){
  const why=checkRoom(RAIN_ROOM, { ids:[RAIN_ROOM.id] }); if(why) throw new Error('the rain room\'s record was refused: '+why);
  if(roomAdd(RAIN)) sceneRoomAdd(RAIN_ROOM.id, { load:RAIN.load, standIn:RAIN.standIn, three:()=>import('../../vendor/three-r128/three.min.js') });
  sceneRoomSet(RAIN_ROOM.id); tintApply(RAIN_ROOM, { now:true }); return RAIN_ROOM.id;
}
