/* LIGHT-3 — Light's LIVE NOTE ADAPTER: the hands' solo notes straight into the engine contract (core/audio.js noteOn / noteOff), priced as the
   shared live path prices them (core/live/eng.js ENG.leadOn for a live call: Hz from the degree through tuningIndexOf → leadFreqTi on the live
   view; the timbre position the payload carries; the note's effect map as values; a theremin frame's own Hz, `live`) — without the recorder,
   songs or tracks (option B, the founder 2026-11-27). A tap (probe only) sees every call first, as the recorder's wTap does in Full. */
import { noteOn, noteOff, leadAllOff } from '../../core/audio.js';
import { CUR, leadFreqTi, tuningIndexOf } from '../../core/scales.js';

let tap=null;
export const lightNoteTapSet=f=>{ tap=f||null; };
const okHz=f=>typeof f==='number' && Number.isFinite(f);
/* own — the owner key ('lead:L', 'lead:R:2', 'lead:M'); p — { deg, oct, vol, fx, inst }; live — a theremin's Hz or null (never recorded: rule #11) */
export function lightNoteOn(own, p, live){
  if(tap) tap('leadOn', [own, p, live]);
  const s=CUR(), base=leadFreqTi(tuningIndexOf(p.deg, s, false), p.oct, s); if(live==null && !okHz(base)) return;   // no index — no note (as ENG)
  noteOn(own, { role:'ld', hz: live!=null ? live : base, vel:p.vol, timbre:p.inst, deg:p.deg, oct:p.oct, live: live!=null, tie:undefined, values:p.fx, symp:null, cancel:false });
}
export function lightNoteOff(own){ if(tap) tap('leadOff', [own]); noteOff(own, { role:'ld' }); }
/* every live solo voice off (a scale, key, timbre or hand change: the shared UI's softAllOff did this for the solo) */
export function lightAllOff(){ leadAllOff(); }
