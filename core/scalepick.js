/* CORE-20 (opt-in) — ONLY THE MODES A PAGE PLAYS. An app names them before core/scales.js evaluates (from its entry's first import):
   scalesOnly({ modes, profile }) — modes: mode ids; profile: true adds the moods of the profile the page declares (<link rel="handsong-profile">,
   read once here and handed on to core/profile.js). core/scaleload.js then fetches those modes and what they name (a tuning, a chord-mode set,
   palettes) and nothing else. Absent (Full): every built-in mode, exactly as before, and core/profile.js reads its profile itself. */
let ONLY=null, PROF=null;
export const scalesOnly=o=>{ ONLY=Object.freeze({ modes:Object.freeze([...((o && o.modes) || [])]), profile:!!(o && o.profile) }); return ONLY; };
export const scalesOnlyOf=()=>ONLY;
/* the page's profile, read once → Promise of { name, rec } or { name, err }; null when the page declares none */
export function pageProfileRead(){
  if(PROF) return PROF;
  const L=typeof document!=='undefined' ? document.querySelector('link[rel="handsong-profile"]') : null; if(!L) return null;
  const name=L.getAttribute('href');
  PROF=fetch(L.href, { cache:'no-cache' }).then(q=>{ if(!q.ok) throw new Error('HTTP '+q.status); return q.json(); }).then(rec=>({ name, rec }), e=>({ name, err:String(e && e.message || e) }));
  return PROF;
}
/* core/profile.js: the read already under way (null: it reads the profile itself, as before) */
export const pageProfileOf=()=>PROF;
