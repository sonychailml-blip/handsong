/* REC2 (stage 3) — THE ONE HISTORY (ED7), moved from recorder.js (which re-exports these names — a facade). Pure: no DOM, no Web Audio;
   imports only song/. Owns the step lists (histPush — the single writer), the tripwire hash, ↶/↷, group edits (ED1) and the table steps
   (level / pan / name / order / master). ⛳ STEP KINDS REGISTER THEMSELVES (histKind): how a step applies both ways and which tracks it
   touches. The song's own kinds (move, del, ins, timbre, lanetouch, batch, ranks) are registered here; the kinds that touch capture
   records, sections, the brace, sound or the key knob are registered by the module that owns them (today recorder.js). What the history
   needs from the layers above comes once through histWire: ready / pause / commit for ↶/↷, the capture records, markers and master level
   for the hash. An unknown kind throws (a step nobody registered can never be half-applied). */
import { events, evSeq, evSeqFill, evIdFill, compactEvents } from './store.js';
import { canonJSON, fnv } from '../core/canon.js';
import { laneId, laneLevel, lanePan, laneName, laneRank, laneLen, laneOf, laneLevelOf, lanePanOf, laneNameOf, setLaneName, moveLane, laneVerBump } from './lanes.js';

const W={ ready:()=>false, pause:()=>{}, commit:()=>{}, takes:()=>new Map(), marks:()=>[], master:()=>0 };
const histWire=o=>{ Object.assign(W,o); };

/* ⛳ ИСТОРИЯ ДВУНАПРАВЛЕННАЯ (S5.3). ⚠️ РЕДО — НЕ ЗЕРКАЛО ОТМЕНЫ, и запись не симметрична: отмене хватало
   ОБРАТНОГО хода, а возврату нужен ПРЯМОЙ. Поэтому запись переноса несёт ОБА состояния (from/to), а
   удаление и вставка симметричны сами по себе — там хватает ССЫЛКИ НА СОБЫТИЕ, и в обе стороны едет ОДИН
   И ТОТ ЖЕ объект (это несущее: и спаривание нот, и выделение держатся за сам объект, а не за копию).
   ⛔ ОБРЫВ БУДУЩЕГО. Отменил три правки, сделал НОВУЮ — отменённое больше недостижимо: оно описывает песню,
   которой уже нет. Не выбрось мы его здесь, ↷ применил бы старый ход к изменившемуся материалу, и это НЕ
   упало бы с ошибкой — просто удар появился бы там, куда его никто не ставил. Поэтому ЕДИНСТВЕННЫЙ писатель
   истории — editPush, и он же чистит будущее: забыть про обрыв невозможно, потому что мимо него не пройти.
   Будущее живёт ровно столько же, сколько история (открытие/закрытие/смена дорожки) — по той же причине:
   ссылка на событие, пережившая сессию, однажды указала бы в пустоту. */
/* ═══ ED7: ONE HISTORY FOR EVERYTHING (plan decision 6) ═══
   One list of steps, newest last; ↶ walks it back, ↷ forward; a new step drops the redo branch (histPush is the single writer). It holds:
   the editor's own steps (move/del/ins/timbre/automation… — unchanged, now kept across editor sessions and tracks), section edits and
   markers (ED6), mixer level / pan / master, track names and order ('tab', 'ranks', 'master'), and DIFF SNAPSHOT steps ('snap') for the
   coarse operations — a take, ⤺, a row delete, a backing load or removal, ✕ clear: the events removed / added / changed (objects with their
   beats and payloads), the takes' capture records, the track ids with their table rows, the markers. Applied backwards or forwards they
   restore exactly, object for object. An operation inside a running take (⤺, backing, a row delete while recording) folds into the take's
   step (one pending snapshot at a time). NOT in the history: mute / solo / arming (listening switches), the brace, tempo, tonic.
   ⛳ The old "the song changed since" guard is not needed for any user path — every path that changes the song is a step. It stays as a
   cheap TRIPWIRE: each step keeps a content hash of the state it left (histHash, order-free, O(events)); ↶/↷ refuse ('changed') and drop
   the history when the state differs — a missed path (a console or probe tool writing directly) can never be undone into a corrupt song.
   Size: the newest HIST_MAX steps are kept (older ones dropped). Memory: an editor step ≈ 1.4 KB (measured: a volume edit — it holds the
   old and new payloads); a snapshot step ≈ 50 bytes per event it removed, added or changed, and it keeps the REMOVED events alive (≈ 0.5 KB
   each) — a take of 500 events ≈ 25 KB, ✕ of a 3000-event song ≈ 1.5–2 MB while that step is in the history. The hash ≈ 0.25 ms per 200
   events. Tracks touched by ↶/↷ get
   their edit version bumped: frozen ones go stale and re-freeze by themselves (hint 'undo'). */
const HIST_MAX=300, HIST_MERGE_MS=800;
let hist=[], histFut=[], histOff=0, histGroupDepth=0;   // histGroupDepth: no trimming inside a group edit (it counts from an index)
/* probe CONTROLS only: a step kind left out of the history; a redo branch a new step does not drop; ✕ that forgets the brace (read by the recorder's snapshot) */
const histDbgO={ skip:null, keepFut:false, noBrace:false, noOpenSt:false, objHash:false };
const histDbg=o=>{ histDbgO.skip=(o&&o.skip)||null; histDbgO.keepFut=!!(o&&o.keepFuture); histDbgO.noBrace=!!(o&&o.noBrace); histDbgO.noOpenSt=!!(o&&o.noOpenSt); histDbgO.objHash=!!(o&&o.objHash); };   // noOpenSt: SONG3 CONTROL (an Open step without the settings)
/* ⛳ CMD1d (RUN 5): THE JOURNAL — listeners told, in order, of every step that ENTERS the history ('do'; a group edit once, as its merged
   step), every merge into the newest step ('merge': a level drag), every ↶ ('undo') and ↷ ('redo'), every drop of the history ('reset'),
   and the commands that are NOT steps ('set': mute, solo, arm, ⟳, brace, tempo, key knob, A4 — histNote). Pure: no DOM. First users later:
   co-play, MIDI learn (autosave keeps its 1-s poll — the journal is not measured cheaper on the phone). A listener that throws is skipped. */
const APPLIED=[];
const onApplied=fn=>{ APPLIED.push(fn); return ()=>{ const i=APPLIED.indexOf(fn); if(i>=0) APPLIED.splice(i,1); }; };
function applied(step,dir){ for(const f of APPLIED.slice()) try{ f({ step, dir }); }catch(e){ console.warn('[history] a journal listener threw', e); } }
const histNote=(kind,value)=>applied({ kind, value, undo:false }, 'set');
const histCanUndo=()=>hist.length>0, histCanRedo=()=>histFut.length>0, histLen=()=>hist.length;
const histReset=()=>{ const had=hist.length||histFut.length; hist=[]; histFut=[]; if(had) applied(null,'reset'); };
const histLabelOf=u=> u.label || u.f || u.kind;
function histPush(u){
  if(histOff) return false;
  if(histDbgO.skip && histLabelOf(u)===histDbgO.skip) return false;
  hist.push(u); if(!histDbgO.keepFut) histFut.length=0;
  if(hist.length>HIST_MAX && !histGroupDepth) hist.splice(0, hist.length-HIST_MAX);
  if(!histGroupDepth) applied(u,'do');   // inside a group edit only the merged step is reported (histGroup)
  return true;
}
/* ⛳ CMD1a (RUN 5): THE TRIPWIRE COMPARES VALUES, NOT OBJECTS. Order-free sum of per-item FNV hashes: events by their permanent id, beat,
   layer and the canonical JSON of the payload (core/canon.js); capture records by take number, chains and point VALUES; track tables by the
   permanent track id; markers; master. A state rebuilt from JSON (a parsed history, an opened file) hashes the same as the live one. The view
   `sc` is left out on purpose: the key knob re-keys the backing's views outside the history (TF2, Q3) — hashing it would refuse ↶ after every
   knob turn. A payload's hash is memoised per OBJECT (payloads are replaced, never written in place); deep:true skips the memo (P.all's
   guard, the ED7 / CMD1 rows) and so also sees an in-place write. histDbg({ objHash:true }) = the pre-CMD1 object-identity hash (CONTROL). */
const payId=new WeakMap(); let payN=0;
const pidOf=o=>{ if(o==null||typeof o!=='object') return 0; let i=payId.get(o); if(!i){ i=++payN; payId.set(o,i); } return i; };
const strHash=s=>{ let h=2166136261>>>0; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619)>>>0; return h; };
const payV=new WeakMap();
const valOf=(o,deep)=>{ if(o==null||typeof o!=='object') return fnv(canonJSON(o)||'');
  if(!deep){ const h=payV.get(o); if(h!==undefined) return h; }
  const h=fnv(canonJSON(o)); payV.set(o,h); return h; };
const ptVal=p=>{ const { id, ...q }=p; return fnv(canonJSON(q)); };   // a lane point by value (its id is given at takeFxTouch, possibly after the seal)
function histHash(opt){
  if(histDbgO.objHash) return histHashObj();
  const deep=!!(opt&&opt.deep);
  evSeqFill(); evIdFill();
  const mix=(h,x)=>Math.imul((h^(x|0))>>>0,16777619)>>>0, num=(h,x)=>{ const v=Math.round((+x||0)*1e6); return mix(mix(h,v),Math.floor(v/4294967296)); };
  let S=events.length>>>0;
  for(const e of events){ let h=2166136261; h=mix(h,e.id); h=num(h,e.t); h=mix(h,valOf(e.a,deep)); h=mix(h,e.layer); S=(S+h)>>>0; }
  for(const [tk,r] of W.takes()){ let h=mix(2166136261,tk); h=mix(h,r.lane.length); h=mix(h,fnv(canonJSON(r.chains||{})));
    for(const p of r.lane) h=(h+ptVal(p))>>>0; S=(S+h)>>>0; }
  for(const [ly,id] of laneId){ let h=mix(mix(2166136261,ly),id); h=num(h,laneLevel.has(id)?laneLevel.get(id):1); h=num(h,lanePan.get(id)||0);
    h=mix(h,strHash(laneName.get(id)||'')); h=mix(h,laneRank.has(id)?laneRank.get(id):-1); h=num(h,laneLen.get(id)||0); S=(S+h)>>>0; }
  S=mix(S,fnv(canonJSON(W.marks()))); S=num(S,W.master());
  return S;
}
/* the pre-CMD1 hash (object identity: birth number, payload object, record object) — kept only as the CMD1 rows' CONTROL */
function histHashObj(){
  evSeqFill();
  const mix=(h,x)=>Math.imul((h^(x|0))>>>0,16777619)>>>0, num=(h,x)=>{ const v=Math.round((+x||0)*1e6); return mix(mix(h,v),Math.floor(v/4294967296)); };
  let S=events.length>>>0;
  for(const e of events){ let h=2166136261; h=mix(h,evSeq.get(e)||0); h=num(h,e.t); h=mix(h,pidOf(e.a)); h=mix(h,e.layer); S=(S+h)>>>0; }
  for(const [tk,r] of W.takes()){ let h=mix(mix(2166136261,tk),pidOf(r)); h=mix(h,r.lane.length); h=mix(h,strHash(JSON.stringify(r.chains)));
    for(const p of r.lane){ let q=mix(2166136261,pidOf(p)); q=num(q,p.t); q=num(q,typeof p.v==='number'?p.v:0); h=(h+q)>>>0; } S=(S+h)>>>0; }
  for(const [ly,id] of laneId){ let h=mix(mix(2166136261,ly),id); h=num(h,laneLevel.has(id)?laneLevel.get(id):1); h=num(h,lanePan.get(id)||0);
    h=mix(h,strHash(laneName.get(id)||'')); h=mix(h,laneRank.has(id)?laneRank.get(id):-1); h=num(h,laneLen.get(id)||0); S=(S+h)>>>0; }
  S=mix(S,strHash(JSON.stringify(W.marks()))); S=num(S,W.master());
  return S;
}
const histSeal=()=>{ if(hist.length) hist[hist.length-1].h=histHash(); };

/* ---- step kinds: the registry (REC2 — was one switch in editApply and one in histTouched) ---- */
/* CMD1c: `fields` — the step's own fields besides kind / label / h / hb, BY DECLARATION: song/commands.js serialises exactly these (live
   objects by permanent id); a step with a field not declared, or a kind declared without fields, refuses to serialise by name. */
const KINDS=new Map();
function histKind(kind,apply,touched,fields){
  if(KINDS.has(kind)) throw new Error('history: step kind registered twice: '+kind);
  KINDS.set(kind,{ apply, touched:touched||null, fields:fields||null });
}
const histKindFields=kind=>{ const k=KINDS.get(kind); return k ? k.fields : undefined; };   // undefined = no such kind, null = no fields declared
/* ОДИН ход истории в ЛЮБУЮ сторону (undo=true — назад). Every edit, ↶ and ↷ go through here (recorder's editApply is this function). */
function histApply(u,undo){
  const k=KINDS.get(u.kind);
  if(!k) throw new Error('history: unknown step kind '+u.kind);
  k.apply(u,undo);
}
/* the tracks a step touches (their freeze goes stale): events it moves, removes or adds, lane points through their take, chains, backing lengths */
function histTouched(u,S=new Set()){ const k=KINDS.get(u.kind); if(k&&k.touched) k.touched(u,S); return S; }
/* the song's own kinds. Перенос переставляет время и нагрузку на нужное состояние; удаление и вставка — зеркальны друг другу и возят
   ТОТ ЖЕ объект события (никаких копий: за объект держатся выделение и спаривание нот). */
histKind('move', (u,undo)=>{ const s= undo?u.from:u.to; u.ev.t=s.t; u.ev.a=s.a; if(s.sc) u.ev.sc=s.sc; },   // OWN1: a step may carry the event's view (a track into another mode)
  (u,S)=>{ S.add(u.ev.layer); }, ['ev','from','to']);
histKind('timbre', (u,undo)=>{ for(const c of u.ch) c.ev.a = undo?c.from:c.to; },   // T5: вся замена — одним ходом, нагрузки те же объекты
  (u,S)=>{ for(const c of u.ch) S.add(c.ev.layer); }, ['ch']);
histKind('lanetouch', u=>{ laneVerBump(u.id); }, null, ['id']);   // ⛳ S6: версия правок ДРУГОЙ дорожки (партнёра пары связки) — поднимается В ОБЕ стороны: и ↶, и ↷ меняют её события, её замороженный буфер обязан устареть снова
histKind('batch', (u,undo)=>{ const L=u.list;                                            // E1: составная правка — вперёд по порядку, назад в обратном (см. editBatch)
    if(undo) for(let i=L.length-1;i>=0;i--) histApply(L[i],true); else for(const s of L) histApply(s,false); },
  (u,S)=>{ for(const s of u.list) histTouched(s,S); }, ['list','a','b','n']);   // a, b: a section edit's range; n: a Transpose's steps
/* S5.5: удаление/вставка возят НАБОР событий (бас-нота — это «вкл»+«выкл», а то и её ведения), но
   механизм тот же и объекты ТЕ ЖЕ. Набор из одного — прежний случай удара, байт-в-байт. */
const evsApply=(u,undo)=>{ const back=new Set(u.evs);
  if((u.kind==='del')===undo) events.push(...u.evs);
  else compactEvents(e=>back.has(e)); };
const evsTouched=(u,S)=>{ for(const e of u.evs) S.add(e.layer); };
histKind('del', evsApply, evsTouched, ['evs']);
histKind('ins', evsApply, evsTouched, ['evs']);
histKind('ranks', (u,undo)=>{ const M=undo?u.from:u.to; laneRank.clear(); for(const [k,v] of M) laneRank.set(k,v); }, null, ['from','to']);

/* ---- table steps: level / pan / name of a track (by id, rule #27), the display order, the master level ---- */
function histTab(layer,f,from,merge){
  const id=laneOf(layer); if(id==null) return false;
  const to= f==='level' ? laneLevelOf(layer) : f==='pan' ? lanePanOf(layer) : laneNameOf(layer);
  if(to===from) return false;
  const top=hist[hist.length-1], now=performance.now();
  if(merge && top && top.kind==='tab' && top.id===id && top.f===f && now-top.at<HIST_MERGE_MS && !histFut.length){ top.to=to; top.at=now; histSeal(); applied(top,'merge'); return true; }
  if(histPush({ kind:'tab', id, f, from, to, at:now })) histSeal();
  return true;
}
function histMaster(from,merge){
  const to=W.master(); if(to===from) return false;
  const top=hist[hist.length-1], now=performance.now();
  if(merge && top && top.kind==='master' && now-top.at<HIST_MERGE_MS && !histFut.length){ top.to=to; top.at=now; histSeal(); applied(top,'merge'); return true; }
  if(histPush({ kind:'master', from, to, at:now })) histSeal();
  return true;
}
function laneNameStep(layer,s){ const f=laneNameOf(layer); if(!setLaneName(layer,s)) return false; return histTab(layer,'name',f); }
function moveLaneStep(layer,to){
  const R0=new Map(laneRank), r=moveLane(layer,to), same=R0.size===laneRank.size && [...laneRank].every(([k,v])=>R0.get(k)===v);
  if(!same && histPush({ kind:'ranks', label:'order', from:R0, to:new Map(laneRank) })) histSeal();
  return r;
}
/* ↶ / ↷ — everywhere (editor, window, play screen, Ctrl+Z / Ctrl+Shift+Z). Refused while recording or before the sound starts (W.ready);
   the transport pauses (W.pause, as any edit); W.commit sorts, rebases and re-freezes what the step touched.
   → the step's label, 'changed' (the tripwire: the history is dropped), or false (nothing to do). */
function histUndo(){
  const u=hist[hist.length-1];
  if(!u||!W.ready()) return false;
  if(u.h!=null && histHash()!==u.h){ histReset(); return 'changed'; }
  W.pause();
  evSeqFill();
  hist.pop(); histApply(u,true); W.commit(u); u.hb=histHash(); histFut.push(u);
  applied(u,'undo');
  return histLabelOf(u);
}
function histRedo(){
  const u=histFut[histFut.length-1];
  if(!u||!W.ready()) return false;
  if(u.hb!=null && histHash()!==u.hb){ histReset(); return 'changed'; }
  W.pause();
  evSeqFill();
  histFut.pop(); histApply(u,false); W.commit(u); u.h=histHash(); hist.push(u);
  applied(u,'redo');
  return histLabelOf(u);
}
const histTopLabel=()=> hist.length ? histLabelOf(hist[hist.length-1]) : null;   // ED7-fix2: the newest step's label (the undo toast acts only while it is ✕)

/* ═══ ED1: SEVERAL NOTES AT ONCE — ONE HISTORY ENTRY ═══ (the history half of recorder.editGroup)
   The sub-edits run by run(h0) push their own steps; they are merged into ONE entry — undo walks it back in reverse. A refusal (run → falsy)
   walks the applied part back (commit() once when it undid something) and leaves history and redo as they were. h0 = the history length at
   the start (for editRemap, which reads histSince(h0)). */
function histGroup(run,commit){
  const h0=hist.length, fut=histFut.slice();
  let r=false, subs=[];
  histGroupDepth++;
  try{ r=run(h0); }
  finally{
    histGroupDepth--;
    subs=hist.splice(h0);
    if(!r){ for(let i=subs.length-1;i>=0;i--) histApply(subs[i],true);
      if(subs.length) commit();
      histFut.length=0; histFut.push(...fut); }
    else if(subs.length){ const u= subs.length===1 ? subs[0] : { kind:'batch', list:subs }; hist.push(u); histSeal(); if(!histGroupDepth) applied(u,'do'); }   // ED7: the merged step carries the tripwire hash too
  }
  return subs.length ? r : false;
}
/* CMD1c: the live lists (read only — song/commands.js serialises them) and installing parsed ones in their place */
const histLists=()=>({ past:hist, future:histFut });
function histInstall(past,future){ hist=past; histFut=future; }
const histSince=h0=>hist.slice(h0);
const histPeek=()=>hist.slice();
/* a sandbox take (probe) or another path that must leave no step: histOffAdd(1) … histOffAdd(-1) */
const histOffAdd=d=>{ histOff+=d; };
const histOffNow=()=>histOff>0;

export { onApplied, histNote, histWire, histKind, histKindFields, histLists, histInstall, histHashObj, histApply, histTouched, histPush, histSeal, histHash, histReset, histCanUndo, histCanRedo, histLen, histTopLabel,
  histUndo, histRedo, histTab, histMaster, laneNameStep, moveLaneStep, histGroup, histSince, histPeek, histOffAdd, histOffNow, histDbg, histDbgO };
