/* NIGHT-3: THE ROOMS — the order a player meets them (ids, rule #37) and each room's parts: its record (data), its 2D stand-in, and its scene
   code, loaded only when the room is first opened. main.js registers them with the scene host. NIGHT-3 stage 5 part 2: a development room
   (the probes' test room) may join the list and leave it again; the real rooms (ROOMS, pinned ids) never leave. */
import { FOREST_ROOM } from './forest/pure/room.js';
import { standInForest } from './forest/standin.js';
import { ROOM_IDS } from '../pure/room.js';

export const ROOMS=Object.freeze([
  Object.freeze({ record:FOREST_ROOM, standIn:standInForest, load:(o={})=>import('./forest/forest.js').then(m=>m.forestAssets(o.level).then(()=>m.buildForest)) }),   // NIGHT-6: the level's prepared files first
]);
const LIST=[...ROOMS];
export const roomsAll=()=>LIST.slice();
export const roomById=id=>LIST.find(r=>r.record.id===id)||null;
/* a development room in (→ true) or out again; a real room is never removed */
export const roomAdd=R=>{ if(roomById(R.record.id)) return false; LIST.push(R); return true; };
export const roomRemove=id=>{ const i=LIST.findIndex(r=>r.record.id===id); if(i<0 || ROOM_IDS.includes(id)) return false; LIST.splice(i, 1); return true; };
