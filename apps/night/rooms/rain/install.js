/* RAIN-R1: THE RAIN ROOM, A REAL ROOM (the founder: the free part is the forest AND the rain). rooms/index.js lists it for everyone (its pinned id,
   its record, its stand-in) and loads this module only when the rain is first opened, prefetched or its music asked for: here its scene code and
   files (load / prefetch) and its one-time setup — the lo-fi bed's engine, the other built-in modes its moods use, the recorded A/B (?bedrec=on,
   development builds only). Nothing here runs for a player who never meets the rain. */
import { RAIN_ROOM } from './pure/room.js';
import { standInRain } from './standin.js';
import { rainHeard } from './heard.js';
import { scalesLoadRest } from '../../../../core/scales.js';
import { bed2SamplerSet, bed2LofiSet, bed2BuskSet } from '../../bed2.js';
import { buskNotes } from './pure/busker.js';   // RAIN-7: the street musician plays along   // RAIN-4b   // RAIN-4: the room's own moods (core modes Night does not load at start)   // NIGHT-15: the sound's focus while the picture is not drawn

let READY=null;   // RAIN-4: the other built-in modes, loaded once when the room joins
let SAMPLES=null, SLOAD=null;   // RAIN-4b: the recorded version (?bedrec=on: the founder compares by ear), loaded at its first note
export const RAIN=Object.freeze({ ready:()=>rainSetup(), record:RAIN_ROOM, standIn:standInRain, base:new URL('./', import.meta.url).href,
  load:(o={})=>import('./rain.js').then(m=>m.rainAssets(o.level).then(city=>(T, opt)=>m.buildRain(T, { ...opt, city }))),   // RAIN-1: the baked city's files go with the build
  prefetch:(o={})=>import('./rain.js').then(m=>m.rainAssets(o.level)), heard:rainHeard });   // RAIN-R1: the code and the level's city, fetched while the start screen shows
let SET=false;
/* the one-time setup (→ a promise: the other modes loaded) */
export function rainSetup(){ if(SET) return READY; SET=true;
  try{ if(new URLSearchParams(location.search).get('bedrec')==='on') import('./sampled.js').then(M=>bed2SamplerSet((ac, out, ev, when, pv)=>{ if(!SAMPLES){ if(!SLOAD) SLOAD=M.sampledLoad(ac, RAIN.base).then(b=>{ SAMPLES=b; }, ()=>{ SLOAD=null; }); return false; } if(ev.kind!=='chord') M.sampledPlay(ac, out, null, SAMPLES, ev, when, pv); return true; })); }catch(e){}
  bed2LofiSet((ac, dest)=>import('./lofi.js').then(M=>M.lofiEngine(ac, dest, RAIN.base, { ep:new URLSearchParams(location.search).get('bedep')==='short' ? 'short' : 'long' })));   // PERF-3: Light plays the sustaining piano too — since AUDIO-4 it costs less than the short one (1.1 vs 2.4 ms a block); RAIN-R1: (was) Light — the short piano (from the engine's first note)   // RAIN-4e: ?bedep=short — RAIN-4d's piano   // RAIN-4c: the lo-fi bed's engine (its files fetched with its first note)
  bed2BuskSet(buskNotes);   // RAIN-7
  READY=scalesLoadRest().catch(e=>{ console.warn('[night] the modes of the rain room did not load:', e); });   // eslint-disable-line no-console
  return READY;
}
