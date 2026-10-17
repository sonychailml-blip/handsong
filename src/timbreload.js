/* TIM3a (RUN 4) — THE TIMBRE RECORDS, loaded ONCE when the module starts (top-level await, the scales.js pattern) from the generated bundle
   data/timbres.bundle.json (tools/timbre-bundle.mjs; the source of truth is one file per timbre in data/timbres/ — user answer T4). Every
   record passes core/timbre.js checkTimbre (the T5 bounds): a refused one is skipped with ONE console line, never played. A family left
   with no record gets its EMERGENCY record (today's first built-in, embedded below) so the app always has a sound. Records are deep-frozen
   pure data shared by the live engine and the render copy (`audio.js?render` imports this same module — R2). TIM3a chord + bass, TIM3b solo,
   TIM3c kits, TIM3d the person's own and a song's (session) records. */
import { checkTimbre, BUNDLE_FORMAT, BUNDLE_VERSION } from './core/timbre.js';
import { idSpace } from './core/registry.js';
import { userAll } from './userstore.js';   // TIM3d: the person's own timbres (IndexedDB kind 'timbre')

const BASE=new URL('../', import.meta.url);
const POL_CH={ voiceMode:null, glide:0.035, register:'chord', quant:1 }, POL_BS={ voiceMode:'lead', glide:0.012, register:'bass', quant:0.5 };
const EMERGENCY={
  solo:{ format:'handsong/timbre', version:1, id:'solo.supersaw', family:'solo', engine:'subtractive', name:'SuperSaw',
    recipe:{ oscs:[-12,-6,0,6,12].map(detune=>({ wave:'sawtooth', mult:1, gain:0.17, detune })) }, env:{ att:0.012, rel:0.1 }, policies:{ voiceMode:'poly', glide:0.02, register:'solo', quant:0 } },
  chord:{ format:'handsong/timbre', version:1, id:'chord.warm-pad', family:'chord', engine:'chord2', name:{ en:'Warm pad', ru:'Тёплый пад' },
    recipe:{ t1:'sawtooth', t2:'sawtooth', ratio:1, det:9, m1:0.5, m2:0.5, lp:1500, lvl:0.17, fo:1.4, ft:0.3, fv:0.6, hj:0 }, env:{ att:0.22, rel:0.5 }, policies:POL_CH },
  kit:{ format:'handsong/timbre', version:1, id:'kit.standard', family:'kit', engine:'drumkit', name:{ en:'Standard', ru:'Стандарт' },
    recipe:{ rows:['kick','snare','clap','hat','tom','crash'].map(synth=>({ synth, vm:1 })) }, policies:{ voiceMode:null, glide:null, register:null, quant:'sub' } },
  bass:{ format:'handsong/timbre', version:1, id:'bass.sub-sine', family:'bass', engine:'bass2', name:{ en:'Sub sine', ru:'Саб-синус' },
    recipe:{ t1:'sine', t2:'sine', det:0, ratio:1, lp:420, lvl:0.45, fo:1, ft:0.03, fv:0.2 }, env:{ att:0.02, rel:0.2 }, policies:POL_BS },
};
const deepFreeze=o=>{ if(o && typeof o==='object' && !Object.isFrozen(o)){ Object.freeze(o); for(const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
const report={ source:'bundle', records:0, user:0, skipped:[], emergency:[], error:null };
let list=[];
try{
  const r=await fetch(new URL('data/timbres.bundle.json', BASE), { cache:'no-cache' });
  if(!r.ok) throw new Error('HTTP '+r.status);
  const B=await r.json();
  if(!B || B.format!==BUNDLE_FORMAT || B.version!==BUNDLE_VERSION || !Array.isArray(B.records)) throw new Error('not a timbre bundle of version '+BUNDLE_VERSION);
  list=B.records;
}catch(e){ report.error=String(e&&e.message||e); console.warn('[timbres] the bundle could not be read — emergency timbres only: '+report.error); }   // eslint-disable-line no-console
const recs=[], seen=new Set();
for(const rec of list){
  const why= seen.has(rec&&rec.id) ? 'a second record with this id' : checkTimbre(rec);
  if(why){ report.skipped.push((rec&&rec.id||'?')+': '+why); console.warn('[timbres] skipped '+(rec&&rec.id||'a record')+' — '+why); continue; }   // eslint-disable-line no-console
  seen.add(rec.id); recs.push(deepFreeze(rec));
}
for(const fam of ['solo','chord','bass','kit']) if(!recs.some(r=>r.family===fam)){ recs.push(deepFreeze(EMERGENCY[fam])); report.emergency.push(fam); }
/* TIM3d: the person's own timbres (rule #37: ids `u.<uuid>`), after the built-ins of their family, through the SAME validator (T5) */
let CHECK_OFF=false;   // probe CONTROL only (timbreCheckDbg): the T5 check skipped at the session door
const ownWhy=rec=> (CHECK_OFF ? null : checkTimbre(rec)) || (idSpace(rec.id)!=='user' && idSpace(rec.id)!=='pack' ? 'not a user or pack id' : null) || (seen.has(rec.id) ? 'the id is taken' : null);
try{ for(const e of await userAll()) if(e.kind==='timbre'){
  const why= e.rec && e.rec.id===e.id ? ownWhy(e.rec) : 'the stored record does not match its id';
  if(why){ report.skipped.push('user '+e.id+': '+why); console.warn('[timbres] skipped your timbre '+e.id+' — '+why); continue; }   // eslint-disable-line no-console
  seen.add(e.id); recs.push(deepFreeze(JSON.parse(JSON.stringify(e.rec)))); report.user++; } }
catch(e){ report.error=(report.error?report.error+' · ':'')+'user timbres: '+String(e&&e.message||e); }
report.records=recs.length;
export const TIMBRE_RECORDS=Object.freeze(recs);
/* TIM3d: records added during the session (a song's copy of a timbre this app lacks — it plays from the copy; «Keep in my timbres» stores
   it). Checked like any record; never removed in the session (positions are the engine's session handle). Both engine copies read this list
   (audio.timbreSync). */
const SESSION=[];
export function timbreAddSession(rec){
  const why= rec && seen.has(rec.id) ? 'exists' : ownWhy(rec||{});
  if(why) return why;
  seen.add(rec.id); SESSION.push(deepFreeze(JSON.parse(JSON.stringify(rec)))); return null;
}
export const timbreAll=()=>[...TIMBRE_RECORDS, ...SESSION];
export const timbreCheckDbg=off=>{ CHECK_OFF=!!off; };
export const timbreKnownId=id=>seen.has(id);
export const timbreLoadReport=()=>({ ...report, skipped:report.skipped.slice(), emergency:report.emergency.slice(), session:SESSION.length });
