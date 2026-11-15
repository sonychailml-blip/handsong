/* FOREST-2 (the founder: «so I can see what is drawn»): a small label in the corner, ONLY when the address carries a forest switch (?forest=…) —
   «level: Detailed · forest: roots», the level the room is DRAWN at (and the chosen one when Detailed is held back) and the switches it was built with.
   Without a switch nothing here runs: no element, no import of the forest's code. */
import { sceneInfo, sceneRoomDbg } from './scene/host.js';

const NAME={ full:'Detailed', reduced:'Standard', minimal:'Minimal' };
let words=[]; try{ words=new URLSearchParams(location.search).getAll('forest').join(',').split(',').map(w=>w.trim()).filter(Boolean); }catch(e){}
export function forestLabelWire(){
  if(!words.length || typeof document==='undefined') return null;
  const el=document.createElement('div'); el.className='forest-label'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
  const draw=()=>{ const I=sceneInfo(), R=sceneRoomDbg(), parts= R && R.natDbg ? R.natDbg().parts : null;
    const lv=NAME[I.level]||I.level||'—', held=I.held ? ` (${NAME[I.held]||I.held} held back)` : '';
    el.textContent=`level: ${lv}${held} · forest: ${parts ? (parts.length ? parts.join(', ') : 'today') : words.join(', ')}`; };
  draw(); setInterval(draw, 1000); return el; }
