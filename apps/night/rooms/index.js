/* NIGHT-3: THE ROOMS — the order a player meets them (ids, rule #37) and each room's parts: its record (data), its 2D stand-in, and its scene
   code, loaded only when the room is first opened. main.js registers them with the scene host. NIGHT-3 stage 5 part 2: a development room
   (the probes' test room) may join the list and leave it again; the real rooms (ROOMS, pinned ids) never leave. RAIN-R1: the rain is a real room —
   its record, stand-in and small laws are here from the start; its scene, its files and its setup (rain/install.js) only when it is first met. */
import { FOREST_ROOM } from './forest/pure/room.js';
import { standInForest } from './forest/standin.js';
import { ROOM_IDS } from '../pure/room.js';
import { RAIN_ROOM } from './rain/pure/room.js';
import { standInRain } from './rain/standin.js';

const rainMod=()=>import('./rain/install.js');
let rainHeard=null;   // the rain's heard (its sound focus without its picture), once its module is here
const rainUp=()=>rainMod().then(m=>{ rainHeard=m.RAIN.heard; m.rainSetup(); return m; });

export const ROOMS=Object.freeze([
  Object.freeze({ record:FOREST_ROOM, standIn:standInForest, base:new URL('./forest/', import.meta.url).href,   // NIGHT-8b: base — the room's folder (its sound files)
    load:(o={})=>import('./forest/forest.js').then(m=>m.forestAssets(o.level).then(()=>m.buildForest)),   // NIGHT-6: the level's prepared files first
    prefetch:(o={})=>import('./forest/forest.js').then(async m=>m.forestAssets(o.level==='full' && !(await m.forestHas('full')) ? 'reduced' : o.level)),   // NIGHT-6: its code and files fetched ahead (main.js, while the start card shows); NIGHT-14c: Detailed not cached yet → Standard's
    has:(o={})=>import('./forest/forest.js').then(m=>m.forestHas(o.level)) }),   // NIGHT-14c: the level's files here without the network (the scene host holds Detailed back otherwise)
  Object.freeze({ record:RAIN_ROOM, standIn:standInRain, base:new URL('./rain/', import.meta.url).href,   // RAIN-R1
    ready:()=>rainUp().then(m=>m.rainSetup()), load:(o={})=>rainUp().then(m=>m.RAIN.load(o)), prefetch:(o={})=>rainUp().then(m=>m.RAIN.prefetch(o)),
    has:(o={})=>import('./rain/rain.js').then(m=>m.rainHas(o.level)), heard:(...a)=>rainHeard ? rainHeard(...a) : undefined }),
]);
const LIST=[...ROOMS];
export const roomsAll=()=>LIST.slice();
export const roomById=id=>LIST.find(r=>r.record.id===id)||null;
/* a development room in (→ true) or out again; a real room is never removed */
export const roomAdd=R=>{ if(roomById(R.record.id)) return false; LIST.push(R); return true; };
export const roomRemove=id=>{ const i=LIST.findIndex(r=>r.record.id===id); if(i<0 || ROOM_IDS.includes(id)) return false; LIST.splice(i, 1); return true; };
