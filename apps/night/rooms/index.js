/* NIGHT-3: THE ROOMS — the order a player meets them (ids, rule #37) and each room's parts: its record (data), its 2D stand-in, and its scene
   code, loaded only when the room is first opened. main.js registers them with the scene host. */
import { FOREST_ROOM } from './forest/pure/room.js';
import { standInForest } from './forest/standin.js';

export const ROOMS=Object.freeze([
  Object.freeze({ record:FOREST_ROOM, standIn:standInForest, load:()=>import('./forest/forest.js').then(m=>m.buildForest) }),
]);
export const roomById=id=>ROOMS.find(r=>r.record.id===id)||null;
