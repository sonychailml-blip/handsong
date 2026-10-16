/* SAVE1 (DAY run 2026-10-16) — THE SONG ↔ ITS FILE RECORD (song layer: no DOM, no Web Audio; folder rule). songData() reads the song as
   it is (events with their views, track tables, capture records, markers; settings, timbre copies and live chain snapshots through ENV) into
   one plain record of the current version (core/songfile.js); songPlan(rec) turns a checked record back into what the recorder installs.
   ⛳ What the file stores: NOTES and VALUES, never sound — frozen audio is a cache, re-rendered after opening (auto-freeze). A track with no
   captured chain gets the live chain's snapshot in the FILE (what song load pins anyway), a solo note without an effect map the live solo
   snapshot (AF5) — the song never changes by being saved. Timbres: the permanent id in every event + a full copy of each timbre used. */
import { events, evOrder, evSeqFill } from './store.js';
import { laneId, laneRow } from './lanes.js';
import { takeFx } from './capture.js';
import { secMarks } from './sections.js';
import { autTakesOf, autEarliest } from './automation.js';
import { ENV } from './env.js';
import { scaleView, scaleById } from '../scales.js';
import { SONG_FORMAT, SONG_VERSION } from '../core/songfile.js';
import { newUserId } from '../core/registry.js';

const ROLE={ leadOn:'ld', leadSet:'ld', chOn:'ch', bassOn:'bs', drum:'dr' };
const copy=x=>JSON.parse(JSON.stringify(x));
/* timbres this app does not have, kept from the last opened file so a re-save carries their copies on (rule #37: the copy is the truth) */
const foreign=new Map();
/* probe CONTROLS only: a lossy save (volumes dropped / every take number 1) must break the probe's round trip */
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
  evSeqFill(); const evs=events.slice().sort(evOrder);
  const views=[], vIdx=new Map(), used=new Set(); let soloSnap=null;
  const vOf=sc=>{ if(!sc) return -1; let i=vIdx.get(sc); if(i==null){ i=views.length; views.push(viewRec(sc)); vIdx.set(sc,i); } return i; };
  const out=evs.map(e=>{ let a=e.a||{};
    if((e.fn==='leadOn'||e.fn==='leadSet') && a.fx==null){ if(!soloSnap) soloSnap=ENV.soloSnap(); a={ ...a, fx:{ ...soloSnap } }; }   // AF5
    const r=ROLE[e.fn], f= r==='dr' ? 'kit' : 'inst';
    if(r && a[f]!=null){ const id=ENV.timKey(r,a[f]); if(id!==a[f]) a={ ...a, [f]:id }; used.add(id); }   // TIM2: a position left in memory → its id
    const o={ t:e.t, layer:e.layer, fn:e.fn, a:copy(a), v:vOf(e.sc), sev:!!e.sev, tk:e.tk||0 }; if(e.jam) o.jam=true;
    if(DBG.noVol) delete o.a.vol; if(DBG.noTk) o.tk=1;
    return o; });
  const tracks=[...laneId].sort((p,q)=>p[0]-q[0]).map(([layer,id])=>{ const R=laneRow(id), t={ layer };
    if(R.mute) t.mute=true; if(R.solo) t.solo=true;
    for(const k of ['level','pan','name','rank','len']) if(R[k]!=null) t[k]=R[k];
    return t; });
  for(const e of out) if(!tracks.some(t=>t.layer===e.layer)) tracks.push({ layer:e.layer });
  const takes=[...takeFx].map(([tk,rec])=>({ tk, kinds:copy(rec.kinds||{}), chains:copy(rec.chains||{}), lane:copy(rec.lane||[]) }));
  /* a track with no captured chain in any take sounds with the live chains: the file carries their snapshot on its earliest take */
  for(const ly of [...new Set(out.map(e=>e.layer))].sort((p,q)=>p-q)){ const Ts=autTakesOf(ly);
    if(!Ts.length || Ts.some(T=>takeFx.has(T.tk))) continue;
    const E=autEarliest(Ts); if(E && !takes.some(k=>k.tk===E.tk)){ const rec=ENV.capNow(); takes.push({ tk:E.tk, kinds:rec.kinds, chains:rec.chains, lane:[] }); } }
  takes.sort((p,q)=>p.tk-q.tk);
  const timbres={};
  for(const id of [...used].sort()){ const s=ENV.timSnap(id) || foreign.get(id); if(s) timbres[id]={ role:s.role, name:s.name, def:s.def }; }
  const rec={ format:SONG_FORMAT, version:SONG_VERSION, id:meta.id||newUserId(), name:meta.name||'', app:'Handsong', saved:meta.saved||new Date().toISOString(),
    settings:ENV.songEnv(), views, timbres, tracks, takes, marks:secMarks.map(m=>({ id:m.id, beat:m.beat, name:m.name })), events:out };
  return rec;
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
    const s=rec.timbres[id], same= s && s.role===r ? ENV.timByDef(r,s.def) : null;   // the same settings under another id → that timbre
    if(same) stand.set(id,same); else { stand.set(id,null); missing.timbres.push({ id, role:r, name:s ? s.name : id, copy:!!s }); } }
  foreign.clear();
  for(const t of missing.timbres){ const s=rec.timbres[t.id]; if(s) foreign.set(t.id,{ role:s.role, name:s.name, def:copy(s.def) }); }
  const evs=rec.events.map(e=>{ const r=ROLE[e.fn], f= r==='dr' ? 'kit' : 'inst';
    let a=copy(e.a); if(r && a[f]!=null && stand.get(a[f])) a[f]=stand.get(a[f]);   // remapped by equal settings; a missing one keeps its id
    const ev={ t:e.t, layer:e.layer, fn:e.fn, a, sc: e.v>=0 ? views[e.v] : null, sev:e.sev, tk:e.tk }; if(e.jam) ev.jam=true; return ev; });
  const takes=new Map(rec.takes.map(k=>[k.tk,{ kinds:copy(k.kinds), chains:copy(k.chains), lane:copy(k.lane) }]));
  return { ok:true, name:rec.name||'', id:rec.id, settings:copy(rec.settings), tracks:copy(rec.tracks), takes, marks:rec.marks.map(m=>({ ...m })), events:evs, missing };
}
export { songData, songPlan, fileDbg };
