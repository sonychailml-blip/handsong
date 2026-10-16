/* REC3 part 2 (stage 3) — COPY, PASTE, DUPLICATE (ED2) — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web Audio;
   imports only song/, scales.js and config.js; the live choices, the transport and the engine's declarations come through song/env.js.
   Moved verbatim; the edited lines are marked REC3. */
import { EDIT_ROLE, editCommit, editGuard, editLayer, noTie, segEvs } from './edit-notes.js';
import { chaseKind, layerSlotTop, layerTakeTop, songSegs } from './notes.js';
import { selGroups } from './edit-group.js';
import { laneRoleOf } from './capture.js';
import { editDefVol, editInsPush, editTake, editTakeNow, laneTimbreOf } from './edit-insert.js';
import { events, isNoteStart } from './store.js';
import { ENV } from './env.js';

/* ═══ ED2: COPY, PASTE, DUPLICATE — the third birth place of events (after push and loadArrangement), obeying the same law ═══
   The clipboard holds COPIES of the selected notes (start-relative beats are taken at paste), kept for the whole session: it outlives a
   track switch and closing the editor, so notes can go into another track. A note is copied as a standalone note: a fully selected
   note as it is (its glide intact); adjacent selected segments of a line as ONE note (the first becomes a note-on with the line's timbre,
   the end gets its own note-off — the detach recipe, E2); drum hits one by one.
   Paste (rule #7, #27, #30; plan ED2): into a track of the SAME role and the same tuning view (a track holds one view); every pasted note
   gets a fresh identity (bass/chords their own k above the track's, solo its own v above the track's — layerTakeTop/layerSlotTop), the
   session take (editTake: ⤺ outside the editor removes the session's inserts and pastes together), ties are dropped (a pasted note is
   never a continuation of another track's note); volume is always present. The track keeps its ONE timbre: pasted notes take the target
   track's timbre (or kit) — notes are what is copied, the sound belongs to the track. ⚠️ `hold` on a theremin note's changes is KEPT:
   it is part of the note (without it the changes would re-pitch and erase the bend). Captured effect lanes (bus automation) are not
   copied — they belong to takes, not notes; per-note values ride in the notes and are copied. One paste = one history entry ('ins',
   pinning the live chain first when the track has no captured chain, as an insert does). */
let editClip=null;
function runNote(run){   // adjacent segments of one note → that part as a standalone note (copies of its events, beats absolute)
  const n=run[0].note, R=EDIT_ROLE[n.role], last=run[run.length-1], X=last.endEv, E=run[0].ev;
  if(!R||last.end==null) return null;
  const inst=((n.head&&n.head.a)||{}).inst, withInst=inst!==undefined?{inst}:null, out=[];
  for(const s of run) for(const e of segEvs(s)){ const on=e===E;
    out.push({ t:e.t, fn:on?R.on:e.fn, a:on&&e.fn!==R.on?{...e.a, ...withInst}:e.a, sc:e.sc, sev:e.sev }); }
  if(X && chaseKind(X.fn)==='f') out.push({ t:X.t, fn:X.fn, a:X.a, sc:X.sc, sev:X.sev });
  else out.push({ t:last.end, fn:R.off, a:{...R.keep(E.a)}, sc:E.sc, sev:E.sev });
  return out;
}
/* The selection → a clip { role, sc, notes:[[event copies]], t0 (first beat), t1 (last note end / last hit) } or null. */
function clipOf(evs){
  const ly=editLayer(); if(ly==null||!evs||!evs.length) return null;
  const G=selGroups(evs,ly); if(!G) return null;
  const notes=G.drums.map(e=>[{ t:e.t, fn:e.fn, a:e.a, sc:e.sc, sev:e.sev }]), runs=G.whole.map(w=>w.L), byNote=new Map();
  for(const s of G.parts){ const L=byNote.get(s.note)||[]; L.push(s); byNote.set(s.note,L); }
  for(const L of byNote.values()){ let run=[L[0]];
    for(let i=1;i<L.length;i++){ if(L[i-1].endEv===L[i].ev) run.push(L[i]); else { runs.push(run); run=[L[i]]; } }
    runs.push(run); }
  for(const run of runs){ const n=runNote(run); if(!n) return null; notes.push(n); }
  if(!notes.length) return null;
  notes.sort((x,y)=>x[0].t-y[0].t);
  const ts=notes.flat().map(e=>e.t), pitched=notes.find(n=>n[0].fn!=='drum');
  return { role:laneRoleOf(ly), sc: pitched ? pitched[0].sc : null, notes, t0:Math.min(...ts), t1:Math.max(...ts) };
}
function editCopySel(evs){ const C=clipOf(evs); if(!C) return false; editClip=C; return C.notes.length; }
const editClipInfo=()=> editClip ? { role:editClip.role, notes:editClip.notes.length } : null;
/* Why a paste of clip C into track ly refuses: 'empty' (nothing copied), 'role' (another role, or a track without notes), 'view'
   (another tuning view — a track holds one), or null. One predicate for the paste and for ui's words. */
function pasteBlock(C,ly){
  if(!C) return 'empty';
  const role=laneRoleOf(ly); if(!role||role!==C.role) return 'role';
  if(role!=='dr'){ const g=songSegs().segs.find(s=>s.layer===ly&&s.role===role); if(g && g.sc!==C.sc) return 'view'; }
  return null;
}
const editPasteWhy=()=>pasteBlock(editClip, editLayer());
function pasteClip(C,at){
  if(!editGuard()) return false;
  const ly=editLayer(); if(pasteBlock(C,ly)) return false;
  const role=C.role, f= role==='dr' ? 'kit' : 'inst', tim=laneTimbreOf(ly);
  editTakeNow();
  let k= (role==='bs'||role==='ch') ? layerTakeTop(ly) : 0, v= role==='ld' ? layerSlotTop(ly) : 0;
  const d=Math.max(0,at)-C.t0, all=[], heads=[];
  for(const note of C.notes){
    const id= role==='ld' ? {v:v++} : (role==='bs'||role==='ch') ? {k:k++} : null;
    note.forEach((ce,i)=>{
      const a={...noTie(ce.a)};
      if(a.fx) a.fx={...a.fx};
      if(a.bend) a.bend=a.bend.slice();
      if(id){ Object.assign(a,id); if(id.k===0) delete a.k; }   // k absent = 0 (the payload's own convention)
      if(tim!=null && a[f]!==undefined && a[f]!==tim) a[f]=tim;
      if(isNoteStart(ce.fn) && typeof a.vol!=='number') a.vol=editDefVol(role);   // rule #30
      const ev={ t:Math.max(0,ce.t+d), layer:ly, fn:ce.fn, a, sc:ce.sc, sev:ce.sev, tk:editTake };
      all.push(ev); if(!i) heads.push(ev);
    });
  }
  events.push(...all);
  editInsPush(ly, { kind:'ins', evs:all });
  editCommit(); return heads;
}
const editPaste=at=>pasteClip(editClip, at);
/* Duplicate: the selection pasted right after itself (the clipboard untouched). Offset = the selection's span rounded up to the snap
   step (step 0 = no snapping); a selection longer than half a bar goes to whole bars, so a phrase keeps its place in the metre. A drum
   hit counts one grid cell long. → [t0, offset] for the probe and ui, through the same function. */
function dupOffset(C,step){
  const cell=step||1/(ENV.sub()||4), span=Math.max(1e-9, C.t1-C.t0 + (C.role==='dr' ? cell : 0)), M=ENV.metre();
  const g= step ? Math.ceil(span/step-1e-9)*step : span;
  return span>M/2 ? Math.ceil(span/M-1e-9)*M : g;
}
function editDuplicateSel(evs,step){ const C=clipOf(evs); return C ? pasteClip(C, C.t0+dupOffset(C,step)) : false; }

export { editCopySel, editClipInfo, editPasteWhy, editPaste, editDuplicateSel };
