/* SPEED (the founder, 2026-11-23): every speed change can be undone at once. `?speedoff` in the address (or speedOffDbg(true) before a room
   opens) builds every room exactly as before SPEED-1 — each room keeps its own list of the values it had (forest.js SPEED_BEFORE). */
let off=(()=>{ try{ return new URLSearchParams(location.search).has('speedoff'); }catch(e){ return false; } })();
export const speedOff=()=>off;
export const speedOffDbg=v=>{ if(v!=null) off=!!v; return off; };   // probes: the A/B's «before» side (read at the next room opening)
