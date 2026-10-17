/* SAVE1 (DAY run 2026-10-16) — THE SONG ↔ ITS FILE RECORD (song layer: no DOM, no Web Audio; folder rule). songData() reads the song as
   it is (events with their views, track tables, capture records, markers; settings, timbre copies and live chain snapshots through ENV) into
   one plain record of the current version (core/songfile.js); songPlan(rec) turns a checked record back into what the recorder installs.
   ⛳ What the file stores: NOTES and VALUES, never sound — frozen audio is a cache, re-rendered after opening (auto-freeze). A track with no
   captured chain gets the live chain's snapshot in the FILE (what song load pins anyway), a solo note without an effect map the live solo
   snapshot (AF5) — the song never changes by being saved. Timbres: the permanent id in every event + a full copy of each timbre used. */
import { events, evOrder, evSeqFill, evIdFill } from './store.js';
import { laneId, laneRow } from './lanes.js';
import { takeFx, laneIdFill } from './capture.js';
import { secMarks } from './sections.js';
import { autTakesOf, autEarliest } from './automation.js';
import { ENV } from './env.js';
import { scaleView, scaleById, scaleData, userRecordsOf } from '../scales.js';
import { SONG_FORMAT, SONG_VERSION } from '../core/songfile.js';
import { newUserId } from '../core/registry.js';
import { TIMBRE_FORMAT } from '../core/timbre.js';   // TIM3d: a song's timbre copies are full records (file v6)

const ROLE={ leadOn:'ld', leadSet:'ld', chOn:'ch', bassOn:'bs', drum:'dr' };
const copy=x=>JSON.parse(JSON.stringify(x));
/* timbres this app does not have, kept from the last opened file so a re-save carries their copies on (rule #37: the copy is the truth) */
const foreign=new Map();
/* probe CONTROLS only: a lossy save (volumes dropped / every take number 1 / no record copies / no event ids) must break the probe's round trip */
let DBG={}; const fileDbg=o=>{ DBG=o||{}; };

/* a view → its file description (the mode id and what scaleView memoises on) */
function viewRec(v){
  const b=v.mode||v, r={ mode:b.id, key: v.key!=null ? v.key : null };
  if(v.keyC) r.keyC=v.keyC;
  if(b.tunable) r.tunedFrom=v.tunedFrom;
  if(b.chordModes) r.chordMode=v.chordMode;
  return r;
}
function songData(meta={}){
  evSeqFill(); evIdFill(); laneIdFill(); const evs=events.slice().sort(evOrder);   // IDS1: every event and lane point saved with its permanent id
  const views=[], vIdx=new Map(), used=new Set(); let soloSnap=null;
  const vOf=sc=>{ if(!sc) return -1; let i=vIdx.get(sc); if(i==null){ i=views.length; views.push(viewRec(sc)); vIdx.set(sc,i); } return i; };
  const out=evs.map(e=>{ let a=e.a||{};
    if((e.fn==='leadOn'||e.fn==='leadSet') && a.fx==null){ if(!soloSnap) soloSnap=ENV.soloSnap(); a={ ...a, fx:{ ...soloSnap } }; }   // AF5
    const r=ROLE[e.fn], f= r==='dr' ? 'kit' : 'inst';
    if(r && a[f]!=null){ const id=ENV.timKey(r,a[f]); if(id!==a[f]) a={ ...a, [f]:id }; used.add(id); }   // TIM2: a position left in memory → its id
    const o={ id:e.id, t:e.t, layer:e.layer, fn:e.fn, a:copy(a), v:vOf(e.sc), sev:!!e.sev, tk:e.tk||0 }; if(e.jam) o.jam=true;
    if(DBG.noIds) delete o.id;
    if(DBG.noVol) delete o.a.vol; if(DBG.noTk) o.tk=1;
    return o; });
  const tracks=[...laneId].sort((p,q)=>p[0]-q[0]).map(([layer,id])=>{ const R=laneRow(id), t={ layer };
    if(R.mute) t.mute=true; if(R.solo) t.solo=true;
    for(const k of ['level','pan','name','rank','len']) if(R[k]!=null) t[k]=R[k];
    return t; });
  for(const e of out) if(!tracks.some(t=>t.layer===e.layer)) tracks.push({ layer:e.layer });
  const takes=[...takeFx].map(([tk,rec])=>({ tk, kinds:copy(rec.kinds||{}), chains:copy(rec.chains||{}), lane:copy(rec.lane||[]) }));
  if(DBG.noIds) for(const k of takes) for(const p of k.lane) delete p.id;
  /* a track with no captured chain in any take sounds with the live chains: the file carries their snapshot on its earliest take */
  for(const ly of [...new Set(out.map(e=>e.layer))].sort((p,q)=>p-q)){ const Ts=autTakesOf(ly);
    if(!Ts.length || Ts.some(T=>takeFx.has(T.tk))) continue;
    const E=autEarliest(Ts); if(E && !takes.some(k=>k.tk===E.tk)){ const rec=ENV.capNow(); takes.push({ tk:E.tk, kinds:rec.kinds, chains:rec.chains, lane:[] }); } }
  takes.sort((p,q)=>p.tk-q.tk);
  /* SONG1: copies of the person's own records the song's views stand on (rule #37: the song plays on any device) */
  const records={};
  if(!DBG.noRecs) for(const sc of vIdx.keys()) for(const [kind,r] of userRecordsOf(sc)){ (records[kind]||(records[kind]={}))[r.id]=copy(r); }
  const timbres={};
  for(const id of [...used].sort()){   // TIM3d (file v6): the full RECORD of every timbre that has one; kits (until TIM3c) and old copies as {role, name, def}
    const R=ENV.timRecord(id); if(R){ timbres[id]=R; continue; }
    const s=ENV.timSnap(id); if(s){ timbres[id]={ role:s.role, name:s.name, def:s.def }; continue; }
    const f=foreign.get(id); if(f) timbres[id]=copy(f); }
  const rec={ format:SONG_FORMAT, version:SONG_VERSION, id:meta.id||newUserId(), name:meta.name||'', app:'Handsong', saved:meta.saved||new Date().toISOString(),
    settings:ENV.songEnv(), views, timbres, records, tracks, takes, marks:secMarks.map(m=>({ id:m.id, beat:m.beat, name:m.name })), events:out };
  return rec;
}
/* SONG1: the records a checked file needs from its own copies — every mode this app lacks, with the tuning / palettes / chord-mode set it
   stands on that the app lacks too, dependencies first → { install:[[kind, rec]], missing:[mode ids with no copy] }. Pure (reads only). */
const SECT={ tuning:'tunings', palette:'palettes', chordmodes:'chordModeSets', mode:'modes' };
function songNeeds(rec){
  const D=scaleData(), R=rec.records||{}, install=[], missing=[], have=(k,id)=>!!(D[SECT[k]][id]) || install.some(([q,x])=>q===k&&x.id===id);
  const take=(k,id)=>{ if(!id || have(k,id)) return true; const x=R[k]&&R[k][id]; if(!x) return false; install.push([k,copy(x)]); return true; };
  for(const id of [...new Set(rec.views.map(d=>d.mode))]){ if(scaleById(id) || have('mode',id)) continue;
    const m=R.mode&&R.mode[id]; if(!m){ missing.push(id); continue; }
    const ch=m.chords||{}, cms= ch.modes && (D.chordModeSets[ch.modes] || (R.chordmodes&&R.chordmodes[ch.modes]));
    const ok=take('tuning',m.tuning) && (!ch.palette || take('palette',ch.palette))
      && (!cms || (cms.modes||[]).every(x=>!x.set||!x.set.palette||take('palette',x.set.palette))) && (!ch.modes || take('chordmodes',ch.modes));
    if(!ok){ missing.push(id); continue; }
    install.push(['mode',copy(m)]); }
  return { install, missing };
}
/* TIM3d: the timbre RECORD copies a checked file brings for ids this app lacks → { install:[records], refused:[] } (pure). The ONE safety
   check (the T5 bounds) is at the install door (timbreload.timbreAddSession): a refused copy never plays, the role's stand-in does. Legacy
   copies (v5 {role, name, def}) are not records: songPlan maps them as before. */
const FAM_ROLE={ solo:'ld', chord:'ch', bass:'bs', kit:'dr' };
function songTimbreNeeds(rec){
  const install=[], refused=[];
  for(const [id,t] of Object.entries(rec.timbres||{})){ if(!t || t.format!==TIMBRE_FORMAT || ENV.timKnown(FAM_ROLE[t.family]||'ld', id)) continue;
    if(t.id!==id) refused.push({ id, name:t.name, why:'its id is not its key' }); else install.push(copy(t)); }
  return { install, refused };
}
/* a checked record of the current version → what the recorder installs; refuses when a mode (a view) is not in this app */
function songPlan(rec){
  const missing={ modes:[], timbres:[] };
  const views=rec.views.map(d=>{ const m=scaleById(d.mode); if(!m){ missing.modes.push(d.mode); return null; }
    return scaleView(m, d.tunedFrom!==undefined ? d.tunedFrom : ENV.live().tunedFrom, d.chordMode, d.key==null ? undefined : d.key, d.keyC||0); });
  if(missing.modes.length) return { ok:false, why:'modes', missing };
  const known=new Set(), stand=new Map();
  for(const e of rec.events){ const r=ROLE[e.fn], f= r==='dr' ? 'kit' : 'inst', id=e.a[f]; if(!r||id==null||known.has(id)||stand.has(id)) continue;
    if(ENV.timKnown(r,id)){ known.add(id); continue; }
    const s=rec.timbres[id], same= s && s.format!==TIMBRE_FORMAT && s.role===r ? ENV.timByDef(r,s.def) : null;   // a legacy copy with the same settings under another id → that timbre
    if(same) stand.set(id,same); else { stand.set(id,null); missing.timbres.push({ id, role:r, name:s ? s.name : id, copy:!!s }); } }
  foreign.clear();
  for(const t of missing.timbres){ const s=rec.timbres[t.id]; if(s) foreign.set(t.id, copy(s)); }   // kept as it came (a refused record or a legacy copy) — a re-save carries it on
  const evs=rec.events.map(e=>{ const r=ROLE[e.fn], f= r==='dr' ? 'kit' : 'inst';
    let a=copy(e.a); if(r && a[f]!=null && stand.get(a[f])) a[f]=stand.get(a[f]);   // remapped by equal settings; a missing one keeps its id
    const ev={ t:e.t, layer:e.layer, fn:e.fn, a, sc: e.v>=0 ? views[e.v] : null, sev:e.sev, tk:e.tk }; if(e.jam) ev.jam=true; if(e.id>0) ev.id=e.id; return ev; });
  const takes=new Map(rec.takes.map(k=>[k.tk,{ kinds:copy(k.kinds), chains:copy(k.chains), lane:copy(k.lane) }]));
  return { ok:true, name:rec.name||'', id:rec.id, settings:copy(rec.settings), tracks:copy(rec.tracks), takes, marks:rec.marks.map(m=>({ ...m })), events:evs, missing };
}
export { songData, songPlan, songNeeds, songTimbreNeeds, fileDbg };
