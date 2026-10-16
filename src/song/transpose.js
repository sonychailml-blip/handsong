/* REC3 part 2 (stage 3) — TRANSPOSE BY DEGREES (ED4), A TRACK INTO ANOTHER MODE (OWN1), TRANSPOSE BY SEMITONES (TF3, TF3b) — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web Audio;
   imports only song/, scales.js and config.js; the live choices, the transport and the engine's declarations come through song/env.js.
   Moved verbatim; the edited lines are marked REC3. */
import { editBackingOpen, editBatch, editCommit, editGuard, editIsOpen, editLayer, editPush, segEvs, segPitchPt } from './edit-notes.js';
import { selGroups } from './edit-group.js';
import { REG_N, chordTypeFits, mapDegrees, modesLikeView, scaleView, shiftDegrees, supportsChords } from '../scales.js';
import { evOrder, evSeqFill, events, schedInvalidate } from './store.js';
import { laneRoleOf, takeFxTouch } from './capture.js';
import { histApply as editApply, histPush, histSeal } from './history.js';
import { laneOf } from './lanes.js';
import { ENV } from './env.js';

/* ═══ ED4: TRANSPOSE BY DEGREES ═══
   Every selected segment moves n degrees of its own frozen mode (scales.shiftDegrees; an out-of-mode note keeps its offset from the nearest
   degree — user decision 5). A pitch-only change: every pitch-carrying event of the segment gets the new pitch, glides stay whole, nothing
   detaches. An untyped chord follows the mode's rule on the new degree; a typed chord keeps its type and refuses where it does not fit
   (T7). One history entry; drum hits are left alone. degreePlan → { list, heads } or { why: 'none' | 'reg' | 'fit' }. */
function degreePlan(evs,n){
  const ly=editLayer(); if(!evs||!evs.length||ly==null||!Number.isInteger(n)||!n) return { why:'none' };
  const G=selGroups(evs,ly); if(!G) return { why:'none' };
  const segs=[...G.whole.flatMap(w=>w.L), ...G.parts]; if(!segs.length) return { why:'none' };
  const list=[];
  for(const s of segs){
    const p=shiftDegrees(s.ti, s.oct, s.sc, n); if(!p) return { why:'none' };
    if(p.oct<0 || p.oct>=REG_N) return { why:'reg' };
    const pt=segPitchPt(s,p.ti,p.oct); if(!pt) return { why:'fit' };
    for(const e of segEvs(s)) list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t, a:{...e.a, ...pt}} });
  }
  return { list, heads:segs.map(s=>s.ev) };
}
const editDegreeWhy=(evs,n)=>{ const P=degreePlan(evs,n); return P.why||null; };
/* ═══ OWN1: A WHOLE TRACK INTO ANOTHER MODE, BY DEGREES ═══
   Every event of the open track takes the view of `mode` (same tuning, same number of degrees — scales.modesLikeView; the anchor and,
   where the new mode has it, the chord mode are kept) and every pitch moves to the same degree there (scales.mapDegrees; a pitch outside
   the old mode keeps its offset from the nearest degree — the ED4 rule, user decision). Beats, volumes, bends, effects stay. An untyped
   chord follows the new mode's rule; a typed chord keeps its type and refuses where it does not fit (T7). Rule #7: the view changes only by
   this explicit edit of the whole track, so the track keeps one view. One history step (label 'mode'); the track's freeze goes stale.
   → { list, v2 } or { why: 'none' | 'same' | 'reg' | 'fit' | 'chords' }. */
const trackViewOfLayer=layer=>{ const e=events.find(x=>x.layer===layer&&x.sc); return e ? e.sc : null; };
function trackModePlan(layer,mode){
  const v=trackViewOfLayer(layer), role=laneRoleOf(layer);
  if(!v || !mode || !role || role==='dr' || !modesLikeView(v).includes(mode)) return { why:'none' };
  const ms=mode.chordModes, cm= ms ? (ms.some(x=>x.id===v.chordMode) ? v.chordMode : ms[0].id) : undefined;
  const v2=scaleView(mode, v.tunedFrom!==undefined ? v.tunedFrom : ENV.live().tunedFrom, cm, v.key, v.keyC||0);   // TF1/TF5: the track keeps its key and its cents
  if(v2===v) return { why:'same' };
  if(role==='ch' && (!supportsChords(v2) || (v2.chordRule && v2.chordRule.kind==='none' && events.some(e=>e.layer===layer&&e.a&&e.a.ti!=null&&!e.a.ty)))) return { why:'chords' };
  const list=[];
  for(const e of events){ if(e.layer!==layer) continue;
    let a=e.a;
    if(a && typeof a.ti==='number'){
      const p=mapDegrees(a.ti, a.oct|0, e.sc, v2); if(!p) return { why:'none' };
      if(p.oct<0 || p.oct>=REG_N) return { why:'reg' };
      if(role==='ch' && a.ty && !chordTypeFits(a.ty, p.ti, v2)) return { why:'fit' };
      a={ ...a, ti:p.ti, oct:p.oct }; }
    list.push({ kind:'move', ev:e, from:{ t:e.t, a:e.a, sc:e.sc }, to:{ t:e.t, a, sc:v2 } }); }
  return list.length ? { list, v2 } : { why:'none' };
}
const editTrackModeWhy=mode=>{ const ly=editLayer(); return ly==null ? 'none' : (trackModePlan(ly,mode).why||null); };
function editTrackMode(mode){
  if(!editGuard()) return false;
  const P=trackModePlan(editLayer(),mode); if(P.why) return false;
  return editBatch([{ kind:'batch', label:'mode', list:P.list }]);
}
/* ═══ TF3: TRANSPOSE BY SEMITONES — one track (editor) or the whole song (window) ═══
   A transposition moves the KEY of each event's view (scaleView(mode, its tunedFrom, its chord mode, key ± n)); notes (ti, oct), beats,
   volumes, bends and effects stay. The key is an integer (12 = C an octave up), so ±1 is exactly a semitone, also across B → C. Every
   tuning is priced from its view's key: 12-note tunings move a semitone (a historical temperament changes key colour, as an organ would);
   Partch, 19/31-TET, gamelan, Bohlen–Pierce move their 1/1 by 100 cents. Drum hits carry no pitch (skipped). Keys stay in TR_KEY_MIN..MAX
   (two octaves around the knob). One history step (label 'transpose'); the touched tracks' freeze goes stale (edit version).
   → { list, layers } or { why: 'none' | 'range' }. trDbg (probe CONTROLS only): noTouch — no edit version bump; ti — the naive transpose
   (tuning index + n steps, the view kept); noKnob — the song step leaves the key knob (pre-TF3b). */
const TR_KEY_MIN=-12, TR_KEY_MAX=23;
let trDbgO={};
const trDbg=o=>{ trDbgO=o||{}; };
function transposePlan(layers,n){
  const list=[], L=new Set();
  if(!Number.isInteger(n) || !n) return { why:'none' };
  for(const e of events){
    if((layers && !layers.has(e.layer)) || !e.sc || !e.sc.mode || e.fn==='drum') continue;
    const k=(e.sc.key!=null ? e.sc.key : ENV.live().tonic)+n;
    if(k<TR_KEY_MIN || k>TR_KEY_MAX) return { why:'range' };
    const to= trDbgO.ti ? { t:e.t, a: e.a && typeof e.a.ti==='number' ? { ...e.a, ti:e.a.ti+n } : e.a, sc:e.sc }
                        : { t:e.t, a:e.a, sc:scaleView(e.sc.mode, e.sc.tunedFrom, e.sc.chordMode, k, e.sc.keyC||0) };   // TF5: the cents stay
    list.push({ kind:'move', ev:e, from:{ t:e.t, a:e.a, sc:e.sc }, to }); L.add(e.layer); }
  return list.length ? { list, layers:L } : { why:'none' };
}
/* the open track (editor): refused on drums and on a backing (its notes are read-only; it follows the key knob, Q3) */
const editTransposeWhy=n=>{ const ly=editLayer(); if(ly==null) return 'none'; if(editBackingOpen()) return 'backing'; if(laneRoleOf(ly)==='dr') return 'drums';
  return transposePlan(new Set([ly]),n).why||null; };
function editTranspose(n){
  if(editTransposeWhy(n) || !editGuard()) return false;
  const P=transposePlan(new Set([editLayer()]),n); if(P.why) return false;
  for(const u of P.list) editApply(u,false);
  editPush({ kind:'batch', label:'transpose', n, list:P.list });
  if(trDbgO.noTouch) { evSeqFill(); events.sort(evOrder); schedInvalidate(); takeFxTouch(); histSeal(); } else editCommit();
  return true;
}
/* the whole song (window): every track with pitch, the backing included (it is part of the song) */
const songTransposeWhy=n=>{ if(ENV.recording()) return 'rec'; if(editIsOpen()) return 'editor'; if(!events.length) return 'empty'; return transposePlan(null,n).why||null; };
function songTranspose(n){
  if(songTransposeWhy(n) || !ENV.ready()) return false;
  ENV.pause();
  evSeqFill();
  const P=transposePlan(null,n); if(P.why) return false;
  for(const u of P.list) editApply(u,false);
  if(!trDbgO.noTouch) for(const ly of P.layers){ const id=laneOf(ly); if(id!=null){ const u={ kind:'lanetouch', id }; editApply(u,false); P.list.push(u); } }
  if(!trDbgO.noKnob){ const u={ kind:'key', from:ENV.live().tonic, to:((ENV.live().tonic+n)%12+12)%12 }; editApply(u,false); P.list.push(u); }   // TF3b (user answer 1): the knob moves with the song
  events.sort(evOrder); schedInvalidate(); takeFxTouch();
  if(histPush({ kind:'batch', label:'transpose', n, list:P.list })) histSeal();
  ENV.af('transpose');
  return true;
}
function editDegreeSel(evs,n){
  if(!editGuard()) return false;
  const P=degreePlan(evs,n); if(P.why) return false;
  return editBatch(P.list) ? P.heads : false;
}

export { editDegreeWhy, trackViewOfLayer, editTrackModeWhy, editTrackMode, trDbg, editTransposeWhy, editTranspose, songTransposeWhy, songTranspose, editDegreeSel };
