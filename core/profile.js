/* C0 (RUN 6): PROFILES. The record a page declares (<link rel="handsong-profile">, checked by core/profile.js) loads once when the module starts
   (top-level await, the timbreload.js pattern); a refused record is skipped with one console line. The embedded start state always exists: a page
   starts in it and a profile applied over it can return EXACTLY (the round-trip rows compare). ONE switch point: profileApply(id). The DOORS (ui.js,
   profileWire) do the writing through today's setters, so this module touches no DOM state and imports no engine. */
import { checkProfile, PROFILE_IDS } from './pure/profile.js';
import { scaleById } from './scales.js';
import { timbreKnownId } from './timbreload.js';
import { pageProfileOf } from './scalepick.js';   // CORE-20: a page with only some modes has read its profile already

const FULL={ format:'handsong/profile', version:1, id:'profile.full', name:{ en:'Full', ru:'Полный' }, roles:['ld','ch','bs','dr'], handFn:null,
  noteModes:null, key:null, moods:null, timbres:null, effects:null, scene:null, backgrounds:['camera'], shell:'full', noteField:'full',
  labels:'full', recording:true, ambience:null };
const deepFreeze=o=>{ if(o && typeof o==='object' && !Object.isFrozen(o)){ Object.freeze(o); for(const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
const report={ records:0, skipped:[], error:null };
const BYID=new Map();
/* the app's own lists (moods and timbres must exist here); effects are checked by the browser row against the engine's table */
const KNOWN={ modes:{ includes:id=>!!scaleById(id) }, timbres:{ includes:id=>timbreKnownId(id) } };
const LINK=document.querySelector('link[rel="handsong-profile"]');
if(LINK){
  const name=LINK.getAttribute('href');
  rec:{
    let rec=null;
    const pre=pageProfileOf();   // CORE-20: read once with the page's modes (absent: read here, as before)
    try{ if(pre){ const r=await pre; if(r.err) throw new Error(r.err); rec=r.rec; } else { const q=await fetch(LINK.href, { cache:'no-cache' }); if(!q.ok) throw new Error('HTTP '+q.status); rec=await q.json(); } }
    catch(e){ report.skipped.push(name+': '+String(e&&e.message||e)); console.warn('[profiles] the page\'s profile could not be read: '+name); break rec; }
    const why= BYID.has(rec&&rec.id) ? 'a second record with this id' : !PROFILE_IDS.includes(rec&&rec.id) ? 'not a pinned profile id' : checkProfile(rec, KNOWN);
    if(why){ report.skipped.push((rec&&rec.id||name)+': '+why); console.warn('[profiles] skipped '+name+' — '+why); break rec; }   // eslint-disable-line no-console
    BYID.set(rec.id, deepFreeze(rec));
  }
}
if(!BYID.has('profile.full')) BYID.set('profile.full', deepFreeze(FULL));
report.records=BYID.size;

let current='profile.full', saved=null, DOORS=null;
const listeners=[];
export const profileWire=d=>{ DOORS=d; };
export const profileCurrent=()=>current;
export const profileOf=id=> BYID.get(id)||null;
export const profileList=()=>[...BYID.values()];
export const profileLoadReport=()=>({ ...report, skipped:report.skipped.slice() });
export const onProfile=f=>{ listeners.push(f); };
/* RUN 7 (C4b): Night's live SOLO CHAIN — Volume on the playing hand's horizontal (as in Full) and «Forest depth»: its amount fixed full, its
   depth on the playing hand's depth (the light going deeper into the forest), the room Medium (v01 ½ of the log range = 1.7 s). The effects
   hand's three effects join it in C5. Leaving Night restores the saved Full chain exactly. */
const NIGHT_CHAIN=deepFreeze([ { fxId:'vol', params:[{ mode:'drive', hand:'play', axis:'x', inv:false }] },
  /* C5: the effects hand — index Echo, middle Warmth ↔ Brightness, ring Wave (a vertical drag each); Echo's time fixed 0.625 s (v01 of its
     log range 0.05…1 s); then the forest room last */
  { fxId:'ctone', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:1, axis:'y', inv:false }] },
  { fxId:'cwave', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'fx', finger:2, axis:'y', inv:false }] },
  { fxId:'cecho', params:[{ mode:'drive', hand:'fx', finger:0, axis:'y', inv:false }, { mode:'fixed', v01:0.8431089342012043 }] },
  { fxId:'fdepth', params:[{ mode:'fixed', v01:1 }, { mode:'drive', hand:'play', axis:'z', inv:false }, { mode:'fixed', v01:0.5 }, { mode:'fixed', v01:1 }, { mode:'fixed', v01:0 }] } ]);   // RUN 8: reach (the forest at most — the shell sets it from the «Forest» slider) and light (C8: «Lighter forest», the shell sets it)
/* what a profile sets over the state it starts from: its own defaults (first mood, first timbre, its key and hands); null fields leave
   that part as it is */
function target(p, from){
  const s={ ...from, hand:{ ...from.hand } };
  s.phoneInstr=p.roles.includes(from.phoneInstr) ? from.phoneInstr : p.roles[0];
  if(p.roles.length===1) s.splitOn=false;
  if(p.moods) s.scaleId=p.moods[0];
  if(p.key){ s.tonic=p.key.tonic; s.tonicCents=p.key.cents; }
  if(p.timbres) s.lead=p.timbres[0];
  if(p.handFn && p.handFn.ld) s.hand={ ...p.handFn.ld };
  if(p.shell==='night'){ s.voice='poly'; s.chain=JSON.parse(JSON.stringify(NIGHT_CHAIN)); }
  return s;
}
/* → null (done) or a refusal in words */
export function profileApply(id){
  const p=BYID.get(id); if(!p) return `no profile «${id}»`;
  if(!DOORS) return 'the interface is not ready yet';
  const busy=DOORS.busy(); if(busy) return busy;
  if(id===current) return null;
  if(id==='profile.full'){ if(saved) DOORS.write(saved); saved=null; }
  else{ const from=DOORS.read(); if(current==='profile.full') saved=from; DOORS.write(target(p, from)); }
  current=id; DOORS.face(p);
  for(const f of listeners){ try{ f(p); }catch(e){ console.warn('[profiles] a listener failed', e); } }   // eslint-disable-line no-console
  return null;
}
/* probe only: a test record (not a pinned id, same validator) for the round-trip row */
export function profileAddDbg(rec){ const why=checkProfile(rec, KNOWN); if(why) return why; BYID.set(rec.id, deepFreeze(rec)); return null; }
/* probe only: takes the test record back */
export const profileDropDbg=id=>{ if(id!=='profile.full' && id!==current) BYID.delete(id); };
/* probe only: the saved Full state (null while Full is live) */
export const profileSavedDbg=()=> saved ? JSON.parse(JSON.stringify(saved)) : null;
/* probe only: the doors (the round-trip row writes its test states through them, as a person's panel taps would) */
export const profileDoorsDbg=()=>DOORS;
