/* VIS1a (RUN 6, docs/VIS1-design.md §4) — THE COMPOSITOR: visual modules drawn in LAYER order, bottom to top — scene (the WebGL room,
   VIS1b) · background (the camera picture) · instrument (the play surface) · overlay (hand points, the looper strip, the status). A module:
   { kind:'visual', id, layer, cost:{ cls, gpu }, frame(t, bus) } (+ mount / resize / unmount when it owns a surface). It reads the bus only
   (a reader — writing throws) and never touches sound, the song or the network. main.loop calls stackFrame once per screen frame on the
   play screen; the editor and the arrangement window draw outside the stack (draw.drawOverlays). Today's three modules (camera, surface,
   hands) draw exactly what drawVideoBackground + drawOverlays drew, in the same order (ui-snap identical). */
import { BUS } from '../core/bus.js';

export const LAYERS=Object.freeze(['scene','background','instrument','overlay']);
const MODS=[], READER=BUS.reader();
let ADDED=0;
/* add a module (a second module with the same id replaces the first); the order: by layer, then by the order added */
export function stackAdd(m){
  const i=MODS.findIndex(x=>x.id===m.id); if(i>=0) MODS.splice(i,1);
  if(!LAYERS.includes(m.layer)) throw new Error('visual «'+m.id+'»: unknown layer «'+m.layer+'»');
  MODS.push({ ...m, off:false, seq:ADDED++ });
  MODS.sort((a,b)=>LAYERS.indexOf(a.layer)-LAYERS.indexOf(b.layer) || a.seq-b.seq);
}
/* a module on / off (Calm's backgrounds turn the camera off; a room turns the scene on) → false if there is no such module */
export function stackSet(id, on){ const m=MODS.find(x=>x.id===id); if(!m) return false; m.off=!on; return true; }
export function stackFrame(t){ for(const m of MODS) if(!m.off) m.frame(t, READER); }
export const stackList=()=>MODS.map(m=>({ id:m.id, layer:m.layer, on:!m.off }));
