/* REC3 (stage 3) — GROUP EDITS (ED1: several notes moved or deleted as ONE history entry), moved from recorder.js (which re-exports these
   names — a facade). Pure: no DOM, no Web Audio;
   imports only song/, the pitch truth scales.js and config.js. Moved verbatim; the edited lines are marked REC3. */
import { events, chaseRole } from './store.js';
import { chaseKind, songSegs } from './notes.js';
import { histGroup, histSince } from './history.js';
import { EDIT_ROLE, editBatch, editCommit, editDeleteSeg, editGuard, editLayer, editMoveSeg, editRoleOf, keyClash, segPitchPt } from './edit-notes.js';

/* ═══ ED1: SEVERAL NOTES AT ONCE — ONE HISTORY ENTRY ═══
   A group edit runs the single-note edits one after another (each sees the song the previous one left: fresh keys, detaches, tie
   untying all stay theirs) and merges what they pushed into ONE entry — undo walks it back in reverse. A refusal anywhere rolls the
   applied part back and leaves history and redo as they were. run(h0) gets the history length at the start (for editRemap). */
function editGroup(run){
  if(!editGuard()) return false;
  return histGroup(run, editCommit);   // REC2: the merge / rollback lives with the history (song/history.js)
}
/* A selected event an earlier sub-edit replaced (a detach turns the next segment's pitch change into a new note-on at the same beat):
   follow del → ins pairs in the entries pushed since h0. → the live event or null. */
function editRemap(ev,h0){
  const flat=(u,o)=>{ if(u.kind==='batch') for(const s of u.list) flat(s,o); else if(u.kind==='del') o.del.push(...u.evs); else if(u.kind==='ins') o.ins.push(...u.evs); return o; };
  const H=histSince(h0);   // REC2: the entries pushed since h0
  for(let i=0; ev && i<H.length && !events.includes(ev); i++){
    const o=flat(H[i],{del:[],ins:[]});
    if(o.del.includes(ev)) ev=o.ins.find(e=>e.layer===ev.layer && Math.abs(e.t-ev.t)<1e-9 && chaseRole(e.fn)===chaseRole(ev.fn) && chaseKind(e.fn)!=='f')||null;
  }
  return ev && events.includes(ev) ? ev : null;
}
/* The selection grouped by note: drum hits, notes whose every segment is selected (they move or go WHOLE — a glide stays one note) and
   the remaining segments (parts of a line — they go through the single-segment edit and detach, as one edit would). null = not this
   track or not a defining event. */
function selGroups(evs,ly){
  const SV=songSegs(), nSegs=new Map(), byNote=new Map(), drums=[], whole=[], parts=[], live=new Set(events);
  for(const g of SV.segs) nSegs.set(g.note,(nSegs.get(g.note)||0)+1);
  for(const ev of evs){
    if(!ev||ev.layer!==ly||!live.has(ev)) return null;
    if(ev.fn==='drum'){ drums.push(ev); continue; }
    const s=SV.byEv.get(ev); if(!s||s.ev!==ev||!editRoleOf(ev.fn)) return null;
    const L=byNote.get(s.note)||[]; if(!L.includes(s)) L.push(s); byNote.set(s.note,L);
  }
  for(const [n,L] of byNote){ L.sort((a,b)=>a.start-b.start); if(L.length===nSegs.get(n)) whole.push({n,L}); else parts.push(...L); }
  parts.sort((a,b)=>a.start-b.start);
  return { drums, whole, parts };
}
/* Move a whole note by d; ptOf(seg) → its new pitch payload, null = unchanged, false = refuse. Fresh identity on a key clash (E1). */
function editMoveWhole(n,d,ptOf){
  const R=EDIT_ROLE[n.role]; if(!R||n.end==null) return false;
  const SV=songSegs(), fr= keyClash(n, n.start+d, n.end+d) ? R.fresh(n.layer) : null, memo=new Map(), list=[];
  for(const e of n.evs){
    const s= chaseKind(e.fn)!=='f' ? SV.byEv.get(e) : null;
    if(s && !memo.has(s)) memo.set(s, ptOf(s));
    const pt= s ? memo.get(s) : null; if(pt===false) return false;
    list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t+d, a:(pt||fr) ? {...e.a, ...pt, ...fr} : e.a} });
  }
  return editBatch(list);
}
/* ED1 group move. items: pitched {ev, ti, oct} (the segment's new pitch; ti undefined = unchanged), drums {ev, row}; dt — one shift for
   all, clamped so nothing goes before beat 0. → the defining events to select afterwards, or false (nothing moved). */
function editMoveSel(items,dt){
  const ly=editLayer(); if(!items||!items.length||ly==null) return false;
  const X=new Map(items.map(x=>[x.ev,x]));
  dt=Math.max(-Math.min(...items.map(x=>x.ev.t)), dt||0);
  const moved=x=> Math.abs(dt)>1e-9 || (x.ev.fn==='drum' ? x.row!=null&&x.row!==(x.ev.a.row|0) : x.ti!==undefined);
  if(!items.some(moved)) return false;
  return editGroup(h0=>{
    const G=selGroups(items.map(x=>x.ev),ly); if(!G) return false;
    const out=[];
    if(G.drums.length){
      const list=G.drums.map(e=>{ const x=X.get(e), row= x.row!=null ? x.row|0 : (e.a.row|0);
        return { kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t+dt, a: row!==(e.a.row|0) ? {...e.a, row} : e.a} }; });
      if(!editBatch(list)) return false; out.push(...G.drums); }
    const ptOf=s=>{ const x=X.get(s.ev); return !x||x.ti===undefined ? null : segPitchPt(s,x.ti,x.oct); };
    for(const {n,L} of G.whole){ if(!editMoveWhole(n,dt,ptOf)) return false; out.push(...L.map(s=>s.ev)); }
    for(const s of G.parts){
      const x=X.get(s.ev); if(!moved(x)) { out.push(s.ev); continue; }
      const e=editRemap(s.ev,h0); if(!e) return false;
      const r=editMoveSeg(e, s.start+dt, x.ti!==undefined?x.ti:s.ti, x.ti!==undefined?x.oct:s.oct);
      if(!r) return false; out.push(r===true?e:r);
    }
    return out.filter(e=>events.includes(e));
  });
}
/* ED1 group delete: drum hits and whole notes go in one 'del'; parts of a line through editDeleteSeg (silence in their place, E2). */
function editDeleteSel(evs){
  const ly=editLayer(); if(!evs||!evs.length||ly==null) return false;
  return editGroup(h0=>{
    const G=selGroups(evs,ly); if(!G) return false;
    const gone=[...G.drums]; for(const {n} of G.whole) gone.push(...n.evs);
    if(gone.length && !editBatch([{ kind:'del', evs:gone }])) return false;
    for(const s of G.parts){ const e=editRemap(s.ev,h0); if(!e||!editDeleteSeg(e)) return false; }
    return true;
  });
}

export { editDeleteSel, editGroup, editMoveSel, selGroups };
