/* SPEED (the founder, 2026-11-23): every speed change can be undone at once. `?speedoff` in the address (or speedOffDbg(true) before a room
   opens) builds every room exactly as before SPEED-1 — each room keeps its own list of the values it had (forest.js SPEED_BEFORE). */
import { setOneHandSearchEvery } from '../../core/vision.js';
let off=(()=>{ try{ return new URLSearchParams(location.search).has('speedoff'); }catch(e){ return false; } })();
export const speedOff=()=>off;
export const speedOffDbg=v=>{ if(v!=null) off=!!v; return off; };   // probes: the A/B's «before» side (read at the next room opening)
/* SPEED-1 step 3 (the founder): while one hand plays, the second hand is looked for on every 5th frame (core default 3); ?speedoff keeps 3 */
export const ONE_HAND_SEARCH=5;
setOneHandSearchEvery(off ? 3 : ONE_HAND_SEARCH);
