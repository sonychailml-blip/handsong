/* LIGHT-2/3: the probe entry of the Light page (?probe): its own rows behind its own small lock (core's console guard imports the auto-freeze and
   autosave, Full's code — Light's page must load none, row «LIGHT on its own»). P.light = P.all = P.quick on this page. */
import { checkLightAlone } from './light/alone.js';
import { checkLightStart } from './light/start.js';
import { checkLightBars } from './light/bars.js';
import { checkLightHands } from './light/hands.js';
import { checkLightControls } from './light/controls.js';   // LIGHT-3b
import { checkLightCalib } from './light/calib.js';   // LIGHT-4
import { checkLightClip } from './light/clip.js';   // LIGHT-5
import { checkLightCards } from './light/cards.js';   // LIGHT-5b
import { checkLightTexts } from './light/texts.js';   // LIGHT-6
import { checkLightPerHand } from './light/perhand.js';   // LIGHT-6b

export { checkLightAlone, checkLightStart, checkLightBars, checkLightHands, checkLightControls, checkLightCalib, checkLightClip, checkLightCards, checkLightTexts, checkLightPerHand };
/* every Light row, one verdict line (the runner reads «[probe] …» lines); «on its own» runs first (the hands row imports core's gestures) */
export async function light(){
  const rows=[['LIGHT on its own', checkLightAlone], ['LIGHT start and profile', checkLightStart], ['LIGHT bars and one axis', checkLightBars], ['LIGHT hands = core hands', checkLightHands], ['LIGHT controls and menus', checkLightControls], ['LIGHT hand setup', checkLightCalib], ['LIGHT clip', checkLightClip], ['LIGHT cards, flare, bars in the clip', checkLightCards], ['LIGHT eight languages', checkLightTexts], ['LIGHT each hand its own reverb and volume', checkLightPerHand]], out=[]; let bad=0;
  for(const [name, f] of rows){ const t0=performance.now(); let r;
    try{ r=await f(); }catch(e){ r={ pass:false, diffs:['threw: '+(e&&e.stack||e)] }; }
    if(!r.pass) bad++; out.push({ check:name, status:r.pass?'pass':'NOT A PASS', differences:(r.diffs||[]).length, ms:Math.round(performance.now()-t0), diffs:r.diffs||[] });   // the runner's summary reads check / status / differences / ms
    console.log(`[probe] ${name}: ${r.pass?'pass':'NOT A PASS — '+(r.diffs||[]).join(' · ')}${r.note?' · '+r.note:''} · ${Math.round(performance.now()-t0)} ms`); }   // eslint-disable-line no-console
  console.log(`[probe] P.light: ${bad ? 'NOT A PASS' : 'PASS'} — ${rows.length} rows, ${bad} failed`);   // eslint-disable-line no-console
  return { pass:!bad, rows:out, seconds:+(out.reduce((s,x)=>s+x.ms,0)/1000).toFixed(1) };
}
export const all=light, quick=light;
/* one probe at a time: a call while another runs refuses in words */
let LOCK=null; const API={};
for(const [n,v] of Object.entries({ light, all, quick, checkLightAlone, checkLightStart, checkLightBars, checkLightHands, checkLightControls, checkLightCalib, checkLightClip, checkLightCards, checkLightTexts, checkLightPerHand }))
  API[n]=(...a)=>{ if(LOCK){ const why=`P.${LOCK} is still running — wait for its result before P.${n}()`; console.warn('[probe] '+why); return { pass:false, refused:true, why }; }   // eslint-disable-line no-console
    LOCK=n; let r; try{ r=v(...a); }catch(e){ LOCK=null; throw e; } if(r && typeof r.then==='function') return r.finally(()=>{ LOCK=null; }); LOCK=null; return r; };
export const api=()=>API;
export function install(){ window.P=API; console.log('[probe] window.P ready — await P.light()'); }   // eslint-disable-line no-console
