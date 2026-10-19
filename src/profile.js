/* C0 (RUN 6, Calm plan §2) — PROFILES: the faces of the one app. Records (data/profiles/, checked by core/profile.js) load ONCE when the
   module starts (top-level await, the timbreload.js pattern); a refused record is skipped with one console line; Full always exists (an
   embedded copy if its file cannot be read). ONE switch point: profileApply(id). Leaving Full saves the touched live state (scale, key,
   solo timbre, role, split, the solo hands, the solo voice mode) and a return to Full writes it back EXACTLY (the round-trip row compares).
   The DOORS (ui.js, profileWire) do the writing through today's setters — the same doors a lesson's setup uses — so this module touches
   no DOM and imports no engine. In the 'calm' edition only profile.calm can be applied. */
import { checkProfile, PROFILE_IDS } from './core/profile.js';
import { EDITION } from './edition.js';
import { scaleById } from './scales.js';
import { timbreKnownId } from './timbreload.js';

const BASE=new URL('../', import.meta.url);
const FULL={ format:'handsong/profile', version:1, id:'profile.full', name:{ en:'Full', ru:'Полный' }, roles:['ld','ch','bs','dr'], handFn:null,
  noteModes:null, key:null, moods:null, timbres:null, effects:null, scene:null, backgrounds:['camera'], shell:'full', noteField:'full',
  labels:'full', recording:true, ambience:null };
const deepFreeze=o=>{ if(o && typeof o==='object' && !Object.isFrozen(o)){ Object.freeze(o); for(const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
const report={ records:0, skipped:[], error:null };
const BYID=new Map();
/* the app's own lists (moods and timbres must exist here); effects are checked by the browser row against the engine's table */
const KNOWN={ modes:{ includes:id=>!!scaleById(id) }, timbres:{ includes:id=>timbreKnownId(id) } };
try{
  const r=await fetch(new URL('data/profiles/index.json', BASE), { cache:'no-cache' });
  if(!r.ok) throw new Error('HTTP '+r.status);
  const ix=await r.json();
  for(const name of (ix && Array.isArray(ix.order)) ? ix.order : []){
    let rec=null;
    try{ const q=await fetch(new URL('data/profiles/'+name+'.json', BASE), { cache:'no-cache' }); if(!q.ok) throw new Error('HTTP '+q.status); rec=await q.json(); }
    catch(e){ report.skipped.push(name+': '+String(e&&e.message||e)); continue; }
    const why= BYID.has(rec&&rec.id) ? 'a second record with this id' : !PROFILE_IDS.includes(rec&&rec.id) ? 'not a pinned profile id' : checkProfile(rec, KNOWN);
    if(why){ report.skipped.push((rec&&rec.id||name)+': '+why); console.warn('[profiles] skipped '+name+' — '+why); continue; }   // eslint-disable-line no-console
    BYID.set(rec.id, deepFreeze(rec));
  }
}catch(e){ report.error=String(e&&e.message||e); console.warn('[profiles] the profile list could not be read — Full only: '+report.error); }   // eslint-disable-line no-console
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
/* RUN 7 (C4b): Calm's live SOLO CHAIN — Volume on the playing hand's horizontal (as in Full) and «Forest depth»: its amount fixed full, its
   depth on the playing hand's depth (the light going deeper into the forest), the room Medium (v01 ½ of the log range = 1.7 s). The effects
   hand's three effects join it in C5. Leaving Calm restores the saved Full chain exactly. */
const CALM_CHAIN=deepFreeze([ { fxId:'vol', params:[{ mode:'drive', hand:'play', axis:'x', inv:false }] },
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
  if(p.shell==='calm'){ s.voice='poly'; s.chain=JSON.parse(JSON.stringify(CALM_CHAIN)); }
  return s;
}
/* → null (done) or a refusal in words */
export function profileApply(id){
  if(EDITION!=='dev' && id!=='profile.calm') return 'this edition offers only Calm';
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
/* the profile the app opens in: the 'calm' edition always Calm; the dev edition Calm when the address says ?calm */
export function profileBoot(search=location.search){
  if(EDITION==='calm' || new URLSearchParams(search).has('calm')) return profileApply('profile.calm');
  return null;
}
/* probe only: the saved Full state (null while Full is live) */
export const profileSavedDbg=()=> saved ? JSON.parse(JSON.stringify(saved)) : null;
/* probe only: the doors (the round-trip row writes its test states through them, as a person's panel taps would) */
export const profileDoorsDbg=()=>DOORS;
