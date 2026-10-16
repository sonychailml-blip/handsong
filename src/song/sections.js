/* REC3 part 2 (stage 3) — SECTIONS (ED6): named bar markers; insert, cut or duplicate BARS in every track at once, with their history
   kinds (brace, marks, lanelen) — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web Audio; imports only
   song/, scales.js and config.js; the transport (metre, playhead, the brace, seek, pause) comes through song/env.js. Moved verbatim;
   the edited lines are marked REC3. */
import { chaseKind, layerSlotTop, layerTakeTop, songNotes } from './notes.js';
import { FX_CHAIN, takeFx, takeFxTouch } from './capture.js';
import { bendAt, bendSplit } from '../config.js';
import { BEND_EPS } from './automation.js';
import { EDIT_ROLE, bendTrim, editIsOpen, noTie, tiePartners } from './edit-notes.js';
import { evOrder, evSeq, evSeqFill, events, schedInvalidate } from './store.js';
import { laneLen, laneOf } from './lanes.js';
import { histApply as editApply, histCanRedo, histCanUndo, histKind, histPush, histRedo, histReset, histSeal, histUndo } from './history.js';
import { ENV } from './env.js';
const fxParamKeysOf=(...a)=>ENV.fxParamKeysOf(...a);   // REC3: the engine's declaration, wired

/* ═══ ED6: SECTIONS — named bar markers; insert, cut or duplicate BARS in every track at once ═══
   Everything on the timeline moves by one rule: events of every role (notes, drum hits, drone levels, orphans), theremin bend curves,
   every take's captured lane (bus points and chain-composition entries), the brace, backing lengths, the markers themselves. Track
   level / pan / name / place are tables by track id with no time — nothing to move. A track whose material moved goes stale through a
   'lanetouch' step (frozen buffers re-freeze by themselves, AF3); a track wholly before the edit point keeps its buffer.
   ⛳ EDGE NOTES (user decision ED6-1, "lengthen / shorten"): INSERT — everything from the point on moves later; a note ringing across the
   point keeps ringing through the new bars; an end exactly on the point stays (a note ending on the bar line is not lengthened). CUT
   [a,b) — everything that starts inside is removed (a note starting inside goes whole, its tail past b too); a note that began earlier is
   shortened by the cut: it rings on after it (its last change inside the cut applies from a, its bend keeps the value it had at b) or
   ends at a if it ended inside; everything after moves left. So insert-then-cut of the same bars is the identity, bit for bit (probe).
   DUPLICATE [a,b) — a copy of everything that starts inside goes right after b (fresh owner keys; the SAME take, so the take's captured
   automation, copied with it, keeps governing the copy; ties dropped); a note starting inside and ringing past b ends at b in the
   original and its copy carries the tail; everything from b on moves L later (as an insert at b). Copied lanes start from the value they
   had at a; copied drone levels too.
   ⛳ ONE HISTORY ENTRY in the SONG history (ui ↶/↷ in the arrangement window; the editor's history lives inside one track's session —
   ED7 merges the two). The entry is the editor's own step kinds (move/del/ins, lane-point steps, lanetouch) plus 'brace', 'marks',
   'lanelen'; since ED7 it is a step of the one history (histPush), guarded by the history's tripwire hash.
   ⛔ Not through editBatch: its tie pass unties an edge whose time changes, and here both halves of a pair move together. Pairs that DO
   lose a half (cut, a copy) are untied after applying, inside the same entry. */
const SEC_E=1e-9;
let secMarks=[], secSeq=0;
const secMarksSet=L=>{ secMarks=L; for(const m of L) if(typeof m.id==='number' && m.id>secSeq) secSeq=m.id; };   // SAVE1: ids of opened markers are taken   // REC3: the markers' one writer outside this block (snapshot steps, ✕)
/* probe only (CONTROL of P.checkSections): a plan that forgets one kind of timeline item — 'lanes' | 'bend' | 'brace' | 'marks' | 'len' */
let secForget=null; const secDbg=k=>{ secForget=k||null; };
const secCopy=L=>L.map(m=>({ id:m.id, beat:m.beat, name:m.name }));
const sections=()=>secCopy(secMarks).sort((x,y)=>x.beat-y.beat);
/* time after inserting L at a: from a on moves; an END exactly at a stays */
const secIns=(x,a,L,end)=> (x>a+SEC_E || (!end && x>a-SEC_E)) ? x+L : x;
/* time after cutting [a,b): inside → a */
const secCut=(x,a,b)=> x<a-SEC_E ? x : x<b-SEC_E ? a : x-(b-a);
const isOffFn=fn=> fn!=='drum' && fn!=='drone' && chaseKind(fn)==='f';
/* the value of an address of take record r at beat t, from its own lane (last entry before t) or its start snapshot */
function secLaneVal(r,key,fx,p,t){
  let best=null;
  for(const q of r.lane) if(q.key===key && q.fx===fx && q.p===p && q.t<t-SEC_E && (!best||q.t>=best.t)) best=q;
  if(best) return best;
  const ch=r.chains[key]; if(!ch) return null;
  if(fx===FX_CHAIN) return { t:0, key, fx, p, ids:ch.map(e=>e.fxId) };
  const eff=ch.find(e=>e.fxId===fx), i=fxParamKeysOf(fx).indexOf(p);
  return eff && i>=0 && eff.params[i]!=null ? { t:0, key, fx, p, v:eff.params[i] } : null;
}
/* The plan of one section edit → { list (steps, not applied), news (created events) } or { why }. kind 'ins' | 'cut' | 'dup', [a,b) beats. */
function secPlan(kind,a,b){
  const L=b-a, at=new Map(), dels=new Set(), news=[], lanes=[];
  const N=songNotes(), setT=(e,t)=>{ const x=at.get(e)||{}; x.t=t; at.set(e,x); }, setA=(e,p)=>{ const x=at.get(e)||{}; x.a=p; at.set(e,x); };
  const setB=(e,p)=>{ if(secForget!=='bend') setA(e,p); };
  const shiftBend=(n,B,f)=>{ const B2=B.map(q=>{ const t2=f(n.start+q.dt); return t2===n.start+q.dt ? q : { ...q, dt:t2-n.start }; });   // BEND-CURVE: a moved point keeps its shape
    if(B2.some((q,i)=>q!==B[i])) setB(n.head,{ ...n.head.a, bend:B2 }); };
  /* BEND-CURVE: a GLIDE across the insert point p holds its value there through the new bars, then goes on (an exact split); other
     curves move as before */
  const bendIns=(n,B,p)=>{ const rel=p-n.start, i=B.findIndex(q=>q.dt>rel+SEC_E);
    if(!(i>0 && B[i].sh==='s' && B[i-1].dt<rel-SEC_E)){ shiftBend(n,B,x=>secIns(x,p,L,false)); return; }
    const S=bendSplit(B,rel), j=S.findIndex(q=>q.dt>rel+SEC_E);
    setB(n.head,{ ...n.head.a, bend:[...S.slice(0,j), { dt:rel+L, c:S[j-1].c }, ...S.slice(j).map(q=>({ ...q, dt:q.dt+L }))] }); };
  /* BEND-CURVE: a cut [a,b) through a curve with a GLIDE in it — exact: split at a and b, drop what lies between, the value at b
     applies from a (a step just after a), the rest moves left. Curves without glides keep the old rule below. */
  const bendCut=(n,B)=>{ const A=a-n.start, Bv=b-n.start;
    if(!B.some((q,i)=>i>0 && q.sh==='s' && q.dt>A+SEC_E && B[i-1].dt<Bv-SEC_E)) return false;
    const S=bendSplit(bendSplit(B,A),Bv), cA=bendAt(S,A), cB=bendAt(S,Bv);
    const B2=S.filter(q=>q.dt<=A+SEC_E);
    if(Math.abs(cB-cA)>1e-9) B2.push({ dt:A+BEND_EPS, c:cB, sh:'h' });
    setB(n.head,{ ...n.head.a, bend:[...B2, ...S.filter(q=>q.dt>Bv+SEC_E).map(q=>({ ...q, dt:q.dt-L }))] });
    return true; };
  const offAt=(n,t)=>{ const R=EDIT_ROLE[n.role], h=n.head, e={ t, layer:n.layer, fn:R.off, a:{ ...R.oldOff(h.a) }, sc:h.sc, sev:h.sev, tk:n.tk };
    if(h.jam) e.jam=true; evSeq.set(e,(evSeq.get(n.evs[n.evs.length-1])||0)+0.5); news.push(e); };   // sorts before a same-key note moved onto t (recorded later)
  const insRule=(p,skip)=>{   // the insert-at-p part: every event (offs exactly at p stay), crossing theremin bends (not of `skip` notes)
    for(const e of events) if(!dels.has(e)){ const t2=secIns(e.t,p,L,isOffFn(e.fn)); if(t2!==e.t) setT(e,t2); }
    for(const n of N.notes){ const B=n.head.a&&n.head.a.bend;
      if(B&&B.length && !(skip&&skip.has(n)) && n.start<p-SEC_E && (n.end==null||n.end>p+SEC_E)) bendIns(n,B,p); } };
  if(kind==='ins') insRule(a);
  else if(kind==='cut'){
    for(const n of N.notes){
      if(n.role==='dr'){ const e=n.head; if(e.t>=b-SEC_E) setT(e,e.t-L); else if(e.t>=a-SEC_E) dels.add(e); continue; }
      if(n.start>=b-SEC_E){ for(const e of n.evs) setT(e,e.t-L); continue; }
      if(n.start>=a-SEC_E){ for(const e of n.evs) dels.add(e); continue; }
      const cont= n.end==null || n.end>b+SEC_E; let last=null;
      for(const e of n.evs){ if(e.t<a-SEC_E) continue;
        if(e.t>=b-SEC_E) setT(e,e.t-L);
        else if(isOffFn(e.fn)) setT(e,a);
        else { dels.add(e); last=e; } }
      if(cont && last){ dels.delete(last); setT(last,a); }        // the state at b applies from the cut on
      if(n.endBy==='next' && n.end>=a-SEC_E && n.end<b-SEC_E) offAt(n,a);   // its closer starts inside and goes — it ends at a
      const B=n.head.a&&n.head.a.bend;
      if(B&&B.length){
        if(cont && bendCut(n,B)){}
        else if(cont){ const inR=B.filter(q=>{ const x=n.start+q.dt; return x>=a-SEC_E && x<b-SEC_E; }), lastIn=inR[inR.length-1];
          let B2=B.filter(q=>!inR.includes(q)).map(q=>{ const x=n.start+q.dt; return x>=b-SEC_E ? { ...q, dt:q.dt-L } : q; });
          if(lastIn) B2=[...B2.filter(q=>n.start+q.dt<a-SEC_E), { dt:a-n.start, c:lastIn.c }, ...B2.filter(q=>n.start+q.dt>=a-SEC_E)];
          if(inR.length || B2.some((q,i)=>q!==B[i])) setB(n.head,{ ...n.head.a, bend:B2 }); }
        else { const B2=bendTrim(B, a-n.start); if(B2!==B) setB(n.head,{ ...n.head.a, bend:B2 }); } }
    }
    const lastLv=new Map();                                       // drone levels: the last one inside the cut holds from a
    for(const e of N.levels){ if(e.t>=b-SEC_E) setT(e,e.t-L); else if(e.t>=a-SEC_E){ dels.add(e); lastLv.set(e.layer,e); } }
    for(const e of lastLv.values()){ dels.delete(e); setT(e,a); }
    for(const e of [...N.orphans, ...N.other]){ if(e.t>=b-SEC_E) setT(e,e.t-L); else if(e.t>=a-SEC_E) dels.add(e); }
  }else{   // 'dup'
    const src=N.notes.filter(n=>n.start>=a-SEC_E && n.start<b-SEC_E), cut=new Set();
    for(const n of src) if(n.role!=='dr' && (n.end==null || n.end>b+SEC_E)){   // the original ends at b; the copy carries the tail
      cut.add(n);
      for(const e of n.evs) if(e!==n.head && e.t>b-SEC_E) dels.add(e);
      offAt(n,b);
      const B=n.head.a&&n.head.a.bend; if(B&&B.length){ const B2=bendTrim(B,b-n.start); if(B2!==B) setB(n.head,{ ...n.head.a, bend:B2 }); } }
    insRule(b,cut);
    const kTop=new Map(), vTop=new Map();
    for(const n of src){
      const id= n.role==='ld' ? (()=>{ const v=vTop.has(n.layer)?vTop.get(n.layer):layerSlotTop(n.layer); vTop.set(n.layer,v+1); return {v}; })()
              : (n.role==='bs'||n.role==='ch') ? (()=>{ const k=kTop.has(n.layer)?kTop.get(n.layer):layerTakeTop(n.layer); kTop.set(n.layer,k+1); return {k}; })() : null;
      for(const e of n.evs){ const p={ ...noTie(e.a) };
        if(p.fx) p.fx={ ...p.fx }; if(p.bend) p.bend=p.bend.slice();
        if(id){ Object.assign(p,id); if(id.k===0) delete p.k; if(id.v===0) delete p.v; }
        const c={ t:e.t+L, layer:e.layer, fn:e.fn, a:p, sc:e.sc, sev:e.sev, tk:e.tk }; if(e.jam) c.jam=true;
        news.push(c); }
      if(n.role!=='dr' && n.endBy==='next'){   // closed by its next note in the original — the copy has its own key, so its own note-off
        const R=EDIT_ROLE[n.role], h=n.head, c={ t:n.end+L, layer:n.layer, fn:R.off, a:{ ...R.oldOff({ ...h.a, ...id }) }, sc:h.sc, sev:h.sev, tk:n.tk };
        if(id&&id.k===0) delete c.a.k; if(h.jam) c.jam=true; news.push(c); } }
    const byLy=new Map(); for(const e of N.levels){ const L2=byLy.get(e.layer)||[]; L2.push(e); byLy.set(e.layer,L2); }
    for(const [ly,Ls] of byLy){ const inR=Ls.filter(e=>e.t>=a-SEC_E && e.t<b-SEC_E); if(!inR.length) continue;
      const pre=Ls.filter(e=>e.t<a-SEC_E).pop(), cp=e=>({ t:e.t+L, layer:ly, fn:e.fn, a:{ ...e.a }, sc:e.sc, sev:e.sev, tk:e.tk, ...(e.jam?{jam:true}:null) });
      if(pre && Math.abs(inR[0].t-a)>SEC_E) news.push({ ...cp(pre), t:b });   // the copy starts at the level the original had at a
      for(const e of inR) news.push(cp(e)); }
  }
  /* captured lanes: the same rule per point; a cut keeps the LAST point per address inside the cut (moved to a); a duplicate copies the
     points inside [a,b) after b, starting from the value at a */
  const lt=new Set();
  for(const [tk,r] of (secForget==='lanes'?[]:takeFx)){ const keyOf=q=>q.key+'|'+q.fx+'|'+(q.p||'');
    if(kind==='cut'){ const lastIn=new Map();
      for(const q of r.lane){ if(q.t>=b-SEC_E) lanes.push({ kind:'autmove', pt:q, from:{t:q.t,v:q.v}, to:{t:q.t-L,v:q.v} });
        else if(q.t>=a-SEC_E){ const k=keyOf(q), o=lastIn.get(k); if(o) lanes.push({ kind:'autdel', lane:r.lane, pt:o }); lastIn.set(k,q); } }
      for(const q of lastIn.values()) if(Math.abs(q.t-a)>SEC_E) lanes.push({ kind:'autmove', pt:q, from:{t:q.t,v:q.v}, to:{t:a,v:q.v} });
    }else{ const p= kind==='ins' ? a : b, inR= kind==='dup' ? r.lane.filter(q=>q.t>=a-SEC_E && q.t<b-SEC_E) : [];
      const starts=new Map(); for(const q of inR){ const k=keyOf(q); if(!starts.has(k)) starts.set(k,q); }
      for(const q of r.lane){ const t2=secIns(q.t,p,L,false); if(t2!==q.t) lanes.push({ kind:'autmove', pt:q, from:{t:q.t,v:q.v}, to:{t:t2,v:q.v} }); }
      for(const [k,q0] of starts) if(Math.abs(q0.t-a)>SEC_E){ const s=secLaneVal(r,q0.key,q0.fx,q0.p,a);
        if(s) lanes.push({ kind:'autins', lane:r.lane, pt:{ ...s, t:b, sh:'h' } }); }
      for(const q of inR) lanes.push({ kind:'autins', lane:r.lane, pt:(({ id, ...c })=>({ ...c, t:q.t+L }))(q) }); }   // IDS1: a copy is a NEW point — never its original's id
    if(lanes.some(u=>u.lane===r.lane || r.lane.includes(u.pt))) lt.add(tk);
  }
  /* the steps: moves (one per event, final beat and payload), removed, created, lanes, brace, markers, backing lengths, touched tracks */
  const list=[], touched=new Set();
  for(const [e,x] of at){ if(dels.has(e)) continue; const t= x.t!=null ? x.t : e.t, p= x.a || e.a;
    if(t!==e.t || p!==e.a){ list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t, a:p} }); touched.add(e.layer); } }
  if(dels.size){ list.push({ kind:'del', evs:[...dels] }); for(const e of dels) touched.add(e.layer); }
  if(news.length){ list.push({ kind:'ins', evs:news }); for(const e of news) touched.add(e.layer); }
  list.push(...lanes);
  for(const e of events) if(lt.has(e.tk||0)) touched.add(e.layer);
  const R=ENV.brace(), mapB=(x,end)=> kind==='cut' ? secCut(x,a,b) : secIns(x, kind==='ins'?a:b, L, end);
  if(R.user && secForget!=='brace'){ let f=mapB(R.from,false), t=mapB(R.to,true); if(t<f+ENV.metre()) t=f+ENV.metre();
    if(f!==R.from || t!==R.to) list.push({ kind:'brace', from:{ from:R.from, to:R.to, user:true }, to:{ from:f, to:t, user:true } }); }
  const M0=secCopy(secMarks); let M1=[];
  for(const m of M0){ if(kind==='cut' && m.beat>=a-SEC_E && m.beat<b-SEC_E) continue; M1.push({ ...m, beat:mapB(m.beat,false) }); }
  if(kind==='dup') for(const m of M0) if(m.beat>=a-SEC_E && m.beat<b-SEC_E) M1.push({ id:++secSeq, beat:m.beat+L, name:m.name });
  if(secForget!=='marks' && JSON.stringify(M1)!==JSON.stringify(M0)) list.push({ kind:'marks', from:M0, to:M1 });
  const ll=[]; for(const [id,len] of laneLen){ const n= kind==='cut' ? secCut(len,a,b) : len>a+SEC_E ? len+L : len; if(n!==len) ll.push({ id, from:len, to:n }); }
  if(ll.length && secForget!=='len') list.push({ kind:'lanelen', ch:ll });
  for(const ly of touched){ const id=laneOf(ly); if(id!=null) list.push({ kind:'lanetouch', id }); }
  return { list, news };
}
/* Section edits apply their extra step kinds here (editApply calls it for kinds it does not know). */
function secApply(u,undo){
  const s= undo ? u.from : u.to;
  if(u.kind==='brace'){ ENV.braceRestore(s); return true; }   // REC3: the transport sets the brace back (user flag, range, its ⟳)
  if(u.kind==='marks'){ secMarks=secCopy(s); return true; }
  if(u.kind==='lanelen'){ for(const c of u.ch){ const v= undo ? c.from : c.to; if(v) laneLen.set(c.id,v); else laneLen.delete(c.id); } return true; }
  return false;
}
function secCommit(){ evSeqFill(); events.sort(evOrder); schedInvalidate(); takeFxTouch(); ENV.af('section'); }
/* After applying: a tie whose partner is gone or no longer at its beat is untied (same entry). */
function secUntie(list){
  const extra=[];
  for(const e of events){ if(!e.a||!e.a.tie||tiePartners(e).length) continue;
    const u={ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t, a:noTie(e.a)} }; editApply(u,false); extra.push(u);
    const id=laneOf(e.layer); if(id!=null){ const v={ kind:'lanetouch', id }; editApply(v,false); extra.push(v); } }
  list.push(...extra);
}
/* Why a section edit refuses: 'rec' (recording), 'editor' (the track editor is open), 'range' (not whole bars), 'empty' (no song), or null. */
function songEditWhy(kind,a,b){
  if(ENV.recording()) return 'rec';
  if(editIsOpen()) return 'editor';
  const M=ENV.metre(), bar=x=>Math.abs(x/M-Math.round(x/M))<1e-6;
  if(!['ins','cut','dup'].includes(kind) || !(b>a+SEC_E) || a<-SEC_E || !bar(a) || !bar(b)) return 'range';
  if(!events.length) return 'empty';
  return null;
}
/* One section edit — insert (b−a empty beats at a), cut [a,b) or duplicate [a,b) — in every track; one song-history entry. → true or false. */
function songEdit(kind,a,b){
  if(songEditWhy(kind,a,b)||!ENV.ready()) return false;
  ENV.pause();
  evSeqFill();
  const pos=Math.max(0,ENV.pos());
  const P=secPlan(kind,a,b);
  if(!P.list.some(u=>u.kind!=='lanetouch')) return false;
  for(const u of P.list) editApply(u,false);
  secUntie(P.list);
  secCommit();
  if(histPush({ kind:'batch', label:'sec:'+kind, a, b, list:P.list })) histSeal();   // ED7: one step of the one history
  const L=b-a; ENV.seek(kind==='cut' ? secCut(pos,a,b) : secIns(pos, kind==='ins'?a:b, L, false));
  return true;
}
/* Markers: add (at a bar line, a default name A, B, … when none given), rename, delete — each one song-history entry. */
function secName(){ const used=new Set(secMarks.map(m=>m.name));
  for(let i=0;;i++){ const n=String.fromCharCode(65+i%26)+(i>=26?Math.floor(i/26)+1:''); if(!used.has(n)) return n; } }
function secPush(to,what){ const from=secCopy(secMarks), u={ kind:'marks', label:what, from, to };
  secApply(u,false); if(histPush(u)) histSeal(); return true; }
function secAdd(beat,name){
  if(ENV.recording()) return null;
  const M=ENV.metre(), b=Math.max(0,Math.round(beat/M)*M);
  if(secMarks.some(m=>Math.abs(m.beat-b)<SEC_E)) return null;
  const m={ id:++secSeq, beat:b, name:(name&&String(name).trim().slice(0,24))||secName() };
  secPush([...secCopy(secMarks), m],'mark'); return { ...m };
}
function secRename(id,name){ const nm=String(name||'').trim().slice(0,24), m=secMarks.find(x=>x.id===id);
  if(!m||!nm||nm===m.name) return false; return secPush(secCopy(secMarks).map(x=>x.id===id?{ ...x, name:nm }:x),'rename'); }
function secDelete(id){ if(!secMarks.some(m=>m.id===id)) return false; return secPush(secCopy(secMarks).filter(m=>m.id!==id),'unmark'); }
/* ED6's song history became the one history (ED7): the old names stay as aliases (ui of the window, the ED6 probe). */
const songCanUndo=()=>histCanUndo(), songCanRedo=()=>histCanRedo(), songUndo=()=>histUndo(), songRedo=()=>histRedo(), songHistReset=()=>histReset();
for(const k of ['brace','marks','lanelen']) histKind(k, secApply);   // ED6: brace, markers, backing lengths (section edits)

export { secDbg, secMarks, secMarksSet, secCopy, sections, songEditWhy, songEdit, secAdd, secRename, secDelete, songCanUndo, songCanRedo, songUndo, songRedo, songHistReset };
