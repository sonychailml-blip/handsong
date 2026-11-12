/* CORE-20 — row «NIGHT scales (only its own)»: the page loaded by itself exactly the modes Night names — the profile's moods and every room's
   moods — (read when this module first ran, before the probes add the other built-ins for their rows) and each is found by id. CONTROL: one more
   named mode must fail the equality. nightScalesRest(): the other built-ins, added once before the first rows (the facade's quiet()). */
import { row } from '../core/rows.js';
import { scaleData, scaleById, scalesLoadRest } from '../../../core/scales.js';
import { loadReport } from '../../../core/scaleload.js';
import { profileOf } from '../../../core/profile.js';
import { ROOMS } from '../../../apps/night/rooms/index.js';
import { roomModes } from '../../../apps/night/pure/room.js';

export const SCALES_AT_LOAD=(()=>{ const M=scaleData().manifest; return Object.freeze({ modes:Object.freeze(M.modes.slice()), tunings:Object.freeze(M.tunings.slice()), files:loadReport.files }); })();
let rest=null;
export const nightScalesRest=()=> rest || (rest=scalesLoadRest().then(r=>{ console.log(`[probe] the other built-in modes added for the rows: ${r.added} records${r.skipped.length ? ' — skipped '+r.skipped.join('; ') : ''}`); return r; }));   // eslint-disable-line no-console
export function checkNightScales(){
  const d=[], notes=[]; let n=0;
  const P=profileOf('profile.night'), named=[...new Set([...((P && P.moods) || []), ...roomModes(ROOMS.map(R=>R.record))])];
  const same=(a, b)=>a.length===b.length && a.every(x=>b.includes(x));
  n++; if(!same(SCALES_AT_LOAD.modes, named)) d.push(`loaded at start: ${SCALES_AT_LOAD.modes.join(', ')} — named by Night: ${named.join(', ')}`);
  n++; if(same(SCALES_AT_LOAD.modes, [...named, 'dorian'])) d.push('CONTROL: one more named mode passed the equality — it cannot fail');
  for(const id of named){ n++; if(!scaleById(id)) d.push(`${id}: not found by id`); }
  notes.push(`at start: ${SCALES_AT_LOAD.modes.length} modes (${SCALES_AT_LOAD.modes.join(', ')}), tunings ${SCALES_AT_LOAD.tunings.join(', ')}, ${SCALES_AT_LOAD.files} files`);
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1005.6, name:'NIGHT scales (only its own)', run:()=>checkNightScales(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
