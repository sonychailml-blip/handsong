/* NIGHT-3: THE ROOMS — the order a player meets them (ids, rule #37) and each room's parts: its record (data), its 2D stand-in, and its scene
   code, loaded only when the room is first opened. main.js registers them with the scene host. NIGHT-3 stage 5 part 2: a development room
   (the probes' test room) may join the list and leave it again; the real rooms (ROOMS, pinned ids) never leave. */
import { FOREST_ROOM } from './forest/pure/room.js';
import { standInForest } from './forest/standin.js';
import { ROOM_IDS } from '../pure/room.js';

export const ROOMS=Object.freeze([
  Object.freeze({ record:FOREST_ROOM, standIn:standInForest, base:new URL('./forest/', import.meta.url).href,   // NIGHT-8b: base — the room's folder (its sound files)
    load:(o={})=>import('./forest/forest.js').then(m=>m.forestAssets(o.level).then(()=>m.buildForest)),   // NIGHT-6: the level's prepared files first
    prefetch:(o={})=>import('./forest/forest.js').then(async m=>m.forestAssets(o.level==='full' && !(await m.forestHas('full')) ? 'reduced' : o.level)),   // NIGHT-6: its code and files fetched ahead (main.js, while the start card shows); NIGHT-14c: Detailed not cached yet → Standard's
    has:(o={})=>import('./forest/forest.js').then(m=>m.forestHas(o.level)) }),   // NIGHT-14c: the level's files here without the network (the scene host holds Detailed back otherwise)
]);
const LIST=[...ROOMS];
export const roomsAll=()=>LIST.slice();
export const roomById=id=>LIST.find(r=>r.record.id===id)||null;
/* a development room in (→ true) or out again; a real room is never removed */
export const roomAdd=R=>{ if(roomById(R.record.id)) return false; LIST.push(R); return true; };
export const roomRemove=id=>{ const i=LIST.findIndex(r=>r.record.id===id); if(i<0 || ROOM_IDS.includes(id)) return false; LIST.splice(i, 1); return true; };
