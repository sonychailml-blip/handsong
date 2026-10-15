/* PROBE1: Song-edit probes: sections (ED6), the one history (ED7), undo after clear (ED7-fix2). Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { masterLevel, setMasterLevel } from '../audio.js';
import { hooks } from '../hooks.js';
import { t, L } from '../i18n.js';
import { KEEP_MAX, PRINT_MAX } from '../probedata.js';
import { editIsOpen, recording, loop, laneVerKeep, events, freezeState, takeFxDump, histReset, laneIdOf, laneLevelOf, lanePanOf, laneNameOf, laneOrder, laneLenOf, laneMuted, laneSoloed, sections, laneRoleOf, songNotes, editOpen, editVolSel, editClose, histUndo, histLen, songBeats, seedTake, autAddrs, autAddPoint, setLaneLevel, histTab, setLanePan, histMaster, laneNameStep, moveLaneStep, secAdd, secRename, songEdit, secDelete, laneDelTap, onUndo, clearJam, clearSong, histRedo, braceProbe, braceSet, setRegionOn, onLoop, histDbg, histCanRedo, setLaneName, evHz, freezeTicket, tiePartners, songUndo, songRedo, editHistPeek, songEditWhy, secDbg, editRevert, seekTo } from '../recorder.js';
import { arrOpen } from '../state.js';
import { undoUiDbg } from '../ui.js';
import { edKit } from './edit.js';
import { frame } from './kit.js';
import { row } from './rows.js';
/* ═══ ED7-fix2: UNDO AFTER ✕ — P.checkUndoClear ═══
   Through the REAL buttons (element clicks, the handlers people use), editor and window closed, transport stopped: ✕ (#clrBtn) empties the
   song → the toast «Song cleared — ↶ Undo» is on with its button visible, and after two frames the transport row stays (classes on + empty)
   showing ↶ enabled and nothing else (✕, ▶ hidden). The toast's Undo brings the song back exactly (events, payloads, beats, lanes) and goes
   away; ✕ again → the transport's ↶ brings it back; ✕ again → Ctrl+Z brings it back. CONTROL that must fail: the pre-fix UI
   (ui.undoUiDbg — no toast, the strip hidden with the song) leaves no undo control after ✕ (Ctrl+Z then restores the song). The frozen
   tracks ✕ dropped are re-frozen at the end. */
export async function checkUndoClear(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()||arrOpen){ miss('the editor or the arrangement window is open — close it'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const $=id=>document.getElementById(id), shown=el=> !!el && getComputedStyle(el).display!=='none' && el.offsetParent!==null;
  const K=edKit(miss,()=>{}), restoreVer=laneVerKeep(), fz0=new Map([...new Set(events.map(e=>e.layer))].map(l=>[l,freezeState(l)])), FX0=takeFxDump();
  const back=label=>{ const d=K.same(K.snap(),S0); if(d) miss(`${label}: the song is not back — ${d}`); if(takeFxDump()!==FX0) miss(`${label}: the captured lanes are not back`); };
  const present=()=>({ toast: $('undoToast').classList.contains('on') && shown($('undoToastBtn')),
    tp: $('loopTransport').classList.contains('on') && $('loopTransport').classList.contains('empty') && shown($('histUndo')) && !$('histUndo').disabled });
  const clear=async()=>{ $('clrBtn').click(); await frame(); await frame(); return !events.length; };
  const ctrlZ=()=>window.dispatchEvent(new KeyboardEvent('keydown',{ key:'z', code:'KeyZ', ctrlKey:true, bubbles:true }));
  histReset(); const S0=K.snap(); song=events.length;
  try{
    /* the toast */
    { cases++; if(!await clear()){ miss('✕ did not empty the song'); return out(); }
      const P=present();
      if(!P.toast) miss('after ✕ no «Song cleared — Undo» toast with a visible button');
      if(!P.tp) miss('after ✕ the transport ↶ is not shown (or is disabled) on the empty song');
      if(shown($('clrBtn')) || shown($('loopBtn'))) miss('the empty-song transport shows more than ↶ ↷');
      $('undoToastBtn').click(); await frame();
      back('the toast\'s Undo');
      if($('undoToast').classList.contains('on')) miss('the toast stays after its Undo'); }
    /* the transport ↶ */
    { cases++; if(!await clear()) miss('the second ✕ did not empty the song');
      $('histUndo').click(); await frame(); back('the transport ↶'); }
    /* Ctrl+Z */
    { cases++; if(!await clear()) miss('the third ✕ did not empty the song');
      ctrlZ(); await frame(); back('Ctrl+Z'); }
    /* CONTROL: the pre-fix UI */
    { cases++; undoUiDbg(true);
      try{ if(!await clear()) miss('CONTROL: ✕ did not empty the song');
        const P=present(); if(P.toast||P.tp) miss('CONTROL: with the pre-fix UI an undo control is still found after ✕ — the check cannot fail'); }
      finally{ undoUiDbg(false); }
      ctrlZ(); await frame(); back('CONTROL (restored by Ctrl+Z)'); }
  } finally {
    undoUiDbg(false); histReset(); restoreVer();
    for(const [l,s] of fz0) if(s==='fresh' && freezeState(l)!=='fresh'){
      try{ const R=await import('../render.js'); await R.freeze(l); }catch(e){ miss(`L${l+1}: re-freezing failed — ${e&&e.message}`); } }
    restoreVer();
    for(const [l,s] of fz0) if(freezeState(l)!==s) miss(`L${l+1}: its freeze is ${freezeState(l)} after the probe, ${s} before`);
  }
  console.log(`[scaleprobe ED7-fix2] events ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED7-fix2] '+m));
  if(!nBad) console.log('[scaleprobe ED7-fix2] after ✕ the toast offers Undo and the transport keeps ↶ on the empty song; toast, ↶ and Ctrl+Z each bring the song back exactly; CONTROL: the pre-fix UI leaves no undo control');
  return out();
}
/* ═══ ED7: ONE HISTORY — P.checkHistory ═══
   (1) FROZEN: an editor step on the seed's frozen track makes it stale; its ↶ leaves it stale (the track re-freezes by itself), the
       edit versions restored → fresh again.
   (2) A MIXED SEQUENCE of every kind of step through the paths the interface uses — a take, an editor edit (ED5 volume) and a lane point,
       track level, pan, master, name, order, a marker added / renamed, a bars insert (ED6), the marker deleted, a row delete, ⤺, removing
       the backing, ✕ clear — a full snapshot after each (every event object, beat, layer, fn, take, view, payload, in order; capture lanes;
       per track id: level, pan, name, place, length, mute, solo; markers; master). Then full ↶ to the start and full ↷ to the end, each state
       compared EXACTLY with its snapshot (undo/redo restore stored values; no tolerance needed).
   (3) CONTROLS that must fail: a step kind left out of the history (histDbg skip 'level': the full undo does not reach the start); a redo
       branch a new step does not drop (histDbg keepFuture: ↷ still offered). The TRIPWIRE: a payload written directly → ↶ answers 'changed'.
   (4) The size limit: HIST_MAX steps kept. Re-freezes the frozen track at the end (✕ dropped its buffer) and restores edit versions. */
export async function checkHistory(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const M=loop.metre, bt=t=>Math.round(t*1000)/1000;
  const lys=()=>[...new Set(events.map(e=>e.layer))].sort((x,y)=>x-y);
  const snap=()=>({ ev:events.map(e=>[e,e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]), fx:takeFxDump(),
    tab:JSON.stringify(lys().map(l=>[l, laneIdOf(l), laneLevelOf(l), lanePanOf(l), laneNameOf(l), laneOrder().indexOf(l), laneLenOf(l), laneMuted(l), laneSoloed(l)])),
    mk:JSON.stringify(sections()), ms:masterLevel() });
  const F=['object','beat','layer','fn','take','view','seventh','jam','payload'];
  const diff=(A,B)=>{ if(A.ev.length!==B.ev.length) return `${A.ev.length} events instead of ${B.ev.length}`;
    for(let i=0;i<B.ev.length;i++){ const x=B.ev[i], y=A.ev[i]; for(let j=0;j<x.length;j++) if(x[j]!==y[j]) return `event #${i} (${x[3]} at beat ${bt(x[1])}) differs in its ${F[j]}`; }
    if(A.fx!==B.fx) return 'the captured lanes differ'; if(A.tab!==B.tab) return `the track tables differ (${A.tab.slice(0,160)} … instead of ${B.tab.slice(0,160)} …)`;
    if(A.mk!==B.mk) return 'the markers differ'; if(A.ms!==B.ms) return `the master level is ${A.ms}, not ${B.ms}`; return null; };
  const done=r=> !!r && r!=='changed';
  const restoreVer=laneVerKeep(), fz0=new Map(lys().map(l=>[l,freezeState(l)])), FZ=lys().find(l=>fz0.get(l)==='fresh'), master0=masterLevel();
  const pick=role=>laneOrder().find(l=>laneRoleOf(l)===role && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam)) ?? null;
  const firstHead=ly=>{ const n=songNotes().notes.find(x=>x.layer===ly && x.role!=='dr'); return n&&n.head; };
  histReset(); const S00=snap();
  try{
    /* (1) the frozen track */
    if(FZ==null) miss('the seed has no frozen track (P.seed freezes the raga bass)');
    else { cases++;
      const h=firstHead(FZ);
      if(!h || !editOpen(FZ)) miss(`L${FZ+1}: no note to edit on the frozen track`);
      else { const r=editVolSel([h],-0.05); editClose();
        if(!r) miss(`L${FZ+1}: the volume edit on the frozen track was refused`);
        else { if(freezeState(FZ)!=='stale') miss(`L${FZ+1}: an edit left its freeze ${freezeState(FZ)}`);
          const u=histUndo(); if(!done(u)) miss(`L${FZ+1}: undo refused (${u})`);
          if(freezeState(FZ)!=='stale') miss(`L${FZ+1}: after the undo its freeze is ${freezeState(FZ)} — a track touched by ↶ must go stale and re-freeze`);
          restoreVer(); if(freezeState(FZ)!=='fresh') miss(`L${FZ+1}: not fresh again once the edit versions are back (${freezeState(FZ)})`); } }
      histReset(); }
    /* (2) the mixed sequence */
    const S=[snap()], labels=[];
    const step=(label,fn)=>{ cases++; let ok=false; try{ ok=fn(); }catch(e){ miss(`${label}: threw ${e&&e.message}`); }
      if(ok===false||ok==null){ miss(`${label}: the step was refused`); return false; }
      if(histLen()!==S.length){ miss(`${label}: the history holds ${histLen()} steps after ${S.length} steps`); S.push(snap()); labels.push(label); return false; }
      S.push(snap()); labels.push(label); return true; };
    const ly=pick('ch'), lb=pick('bs'), T=Math.ceil(songBeats()/M+1e-9)*M+M;
    if(ly==null||lb==null){ miss('the seed lacks an unfrozen chord or bass track'); return out(); }
    song=lys().length;
    let tmp=null;
    step('take', ()=>{ const R=seedTake([{ fn:'bassOn', a:{ deg:0, oct:1, vol:0.8, inst:0 }, t:T, id:1 }, { fn:'bassOff', a:{}, t:T+2, id:1 }, { fn:'drum', a:{ row:0, vol:0.8, kit:0 }, t:T }]);
      tmp= R ? events.find(e=>e.tk===R.take)?.layer ?? null : null; return !!R; });
    step('editor: volume of a note (ED5)', ()=>{ if(!editOpen(lb)) return false; const r=editVolSel([firstHead(lb)],-0.1); editClose(); return !!r; });
    step('editor: a lane point', ()=>{ if(!editOpen(ly)) return false; const A=autAddrs(ly).find(x=>x.fx==='reverb'); const r=A&&autAddPoint(ly,A.fx,A.p,9.5,0.4); editClose(); return !!r; });
    step('level', ()=>{ const v0=laneLevelOf(ly); setLaneLevel(ly,0.5); return histTab(ly,'level',v0); });
    step('pan', ()=>{ const v0=lanePanOf(ly); setLanePan(ly,0.3); return histTab(ly,'pan',v0); });
    step('master', ()=>{ const v0=masterLevel(); setMasterLevel(0.6); return histMaster(v0); });
    step('name', ()=>laneNameStep(ly,'History probe'));
    step('order', ()=>{ const L=laneOrder(), i=L.indexOf(lb); moveLaneStep(lb, i===0 ? 1 : 0); return true; });
    let mid=null;
    step('marker add', ()=>{ const m=secAdd(2*M,'A'); mid=m&&m.id; return !!m; });
    step('marker rename', ()=>secRename(mid,'B'));
    step('bars insert (ED6)', ()=>songEdit('ins',3*M,4*M));
    step('marker delete', ()=>secDelete(mid));
    step('row delete', ()=>{ if(tmp==null) return false; laneDelTap(tmp); return laneDelTap(tmp); });
    step('⤺ take removed', ()=>{ const n=events.length; onUndo(); return events.length<n; });
    step('backing removed', ()=>{ const n=events.length; clearJam(); return events.length<n; });
    step('✕ clear', ()=>{ clearSong(); return !events.length; });
    /* full undo to the start, full redo to the end — exact */
    for(let i=S.length-1;i>0;i--){ cases++; const r=histUndo();
      if(!done(r)){ miss(`undo of «${labels[i-1]}» refused (${r})`); break; }
      const d=diff(snap(),S[i-1]); if(d){ miss(`undo of «${labels[i-1]}» does not give the state before it — ${d}`); break; } }
    if(histUndo()!==false) miss('an undo past the start of the history was not refused');
    { const d=diff(snap(),S[0]); if(d) miss(`after the full undo the song is not as at the start — ${d}`); }
    for(let i=1;i<S.length;i++){ cases++; const r=histRedo();
      if(!done(r)){ miss(`redo of «${labels[i-1]}» refused (${r})`); break; }
      const d=diff(snap(),S[i]); if(d){ miss(`redo of «${labels[i-1]}» does not give the state after it — ${d}`); break; } }
    { const d=diff(snap(),S[S.length-1]); if(d) miss(`after the full redo the song is not as at the end — ${d}`); }
    for(let i=S.length-1;i>0;i--) if(!done(histUndo())){ miss('the final undo to the start was refused'); break; }
    { const d=diff(snap(),S00); if(d) miss(`the song is not back at the start after the sequence — ${d}`); }
    histReset();
    /* (2b) ✕ then ↶ brings the brace and ⟳ back exactly (user answer 2026-10-14); ↷ clears them again. CONTROL: a ✕ that forgets the
       brace (histDbg noBrace) must leave it following after ↶. */
    { const rg0=braceProbe(null), bk=()=>JSON.stringify([loop.rgn.user,loop.rgn.from,loop.rgn.to,loop.rgn.on]);
      for(const ctl of [false,true]){ cases++;
        braceSet(M,3*M); setRegionOn(true); if(loop.on) onLoop();
        const want=bk(); if(!loop.rgn.user||!loop.rgn.on){ miss('(2b): the brace could not be set for the case'); break; }
        histDbg(ctl?{ noBrace:true }:null); clearSong(); histDbg(null);
        const gone=bk(); if(loop.rgn.user||loop.rgn.on) miss(`(2b): ✕ left the brace ${gone}`);
        const u=histUndo(), got=bk();
        if(!done(u)) miss(`(2b): undo of ✕ refused (${u})`);
        else if(!ctl && got!==want) miss(`(2b): ↶ of ✕ gives the brace ${got}, it was ${want}`);
        else if(ctl && got===want) miss('(2b) CONTROL: with ✕ forgetting the brace, ↶ still brought it back — the check cannot fail');
        if(!ctl){ const r=histRedo(); if(!done(r)) miss(`(2b): redo of ✕ refused (${r})`); else if(bk()!==gone) miss(`(2b): ↷ of ✕ gives the brace ${bk()}, not ${gone}`);
          if(!done(histUndo())) miss('(2b): the second undo of ✕ was refused'); else if(bk()!==want) miss(`(2b): the second ↶ gives the brace ${bk()}, not ${want}`); }
        { const d=diff(snap(),S00); if(d) miss(`(2b): the song is not back after ↶ of ✕ — ${d}`); }
        braceProbe(rg0); histReset(); } }
    /* (3) controls and the tripwire */
    { cases++; const A=snap(), v0=laneLevelOf(ly);
      histDbg({ skip:'level' }); setLaneLevel(ly,0.42); histTab(ly,'level',v0); histDbg(null);
      editOpen(lb); editVolSel([firstHead(lb)],0.05); editClose();
      while(histLen()) if(!done(histUndo())) break;
      const d=diff(snap(),A);
      if(!d) miss('CONTROL: with the level step left out of the history the full undo still reached the start — the check cannot fail');
      setLaneLevel(ly,v0); histReset(); }
    for(const ctl of [false,true]){ cases++;
      const n0=laneNameOf(ly); histDbg(ctl?{ keepFuture:true }:null);
      laneNameStep(ly,'x1'); histUndo(); laneNameStep(ly,'x2');
      const can=histCanRedo(); histDbg(null);
      if(!ctl && can) miss('a new step did not drop the redo branch');
      if(ctl && !can) miss('CONTROL: with the redo branch kept, the check still saw no redo — it cannot fail');
      setLaneName(ly,n0); histReset(); }
    { cases++; laneNameStep(ly,'tripwire'); const e=events.find(x=>x.fn==='chOn'), a0=e.a; e.a={ ...a0, vol:0.123 };
      const r=histUndo(); e.a=a0; if(r!=='changed') miss(`a payload written outside the history: ↶ answered ${r}, not 'changed'`);
      if(histLen()) miss('the tripwire did not drop the history'); setLaneName(ly,null); histReset(); }
    /* (4) the size limit */
    { cases++; const n0=laneNameOf(ly); for(let i=0;i<305;i++) laneNameStep(ly,'n'+i);
      if(histLen()!==300) miss(`after 305 steps the history holds ${histLen()} (HIST_MAX 300)`);
      setLaneName(ly,n0); histReset(); }
  } finally {
    histDbg(null); if(editIsOpen()) editClose();
    while(histLen()) if(!done(histUndo())) break;
    histReset(); setMasterLevel(master0);
    const d=diff(snap(),S00); if(d) miss(`the song is not back as it was before the probe — ${d}`);
    restoreVer();
    for(const [l,s] of fz0) if(s==='fresh' && freezeState(l)!=='fresh'){
      try{ const R=await import('../render.js'); await R.freeze(l); }catch(e){ miss(`L${l+1}: re-freezing failed — ${e&&e.message}`); } }
    restoreVer();
    for(const [l,s] of fz0) if(freezeState(l)!==s) miss(`L${l+1}: its freeze is ${freezeState(l)} after the probe, ${s} before`);
  }
  console.log(`[scaleprobe ED7] tracks ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED7] '+m));
  if(!nBad) console.log('[scaleprobe ED7] every kind of step undoes and redoes exactly through one history; a frozen track touched by ↶ goes stale; CONTROLS: a step kind left out and a redo kept after a new step both fail; the tripwire refuses after a direct write; 300 steps kept');
  return out();
}
/* ═══ ED6: SECTIONS — P.checkSections ═══
   On the seed (plus temporary material: a theremin take crossing a bar line at the song end, two reverb-mix lane points on a chord track,
   three markers), through recorder.songEdit / songUndo / songRedo with the editor closed:
   (1) IDENTITY (the plan's check): insert k bars, then cut the same bars → every event (object, beat, layer, fn, take, view, payload) in
       the same order, every captured lane, the brace, the markers and the backing lengths are bit for bit as before — at the start, mid
       song (notes ringing across), inside the theremin note (its bend), at the song end; both steps undo and redo bit for bit.
   (2) INSERT, computed here: every event from the point on is L later (a note-off exactly on the point stays), a note ringing across is
       L longer, pitches unchanged, a crossing theremin's bend points after the point move by L, lane points / markers / brace / backing
       lengths from the point on move; tracks with material after the point change their freeze signature, tracks wholly before keep it.
   (3) CUT [a,b): notes starting inside are gone, notes after move left, a note that began earlier ends at a (ended inside) or is L shorter
       (rang past b); no orphans, every tie keeps its partner, pitches unchanged; lane points inside → at most one per address, at a.
   (4) DUPLICATE [a,b): every note starting inside has a copy L later with the same pitches and length; an original ringing past b ends at
       b; notes after move L later; lane points and markers inside are copied.
   (5) FROZEN: the seed's frozen track goes stale when the edit moves its material and stays fresh when the edit is wholly after it; the
       auto-freeze hint 'section' is sent.
   (6) Refusals: not whole bars, the editor open. CONTROLS that must fail (identity check): a cut that forgets the lanes, the bends, the
       brace, the markers, the backing lengths. Everything is undone; the song, the tracks' edit versions and the freezes are as before. */
export function checkSections(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const M=loop.metre, E=1e-9, eq=(x,y)=> x==null||y==null ? x===y : Math.abs(x-y)<1e-9, bt=t=>t==null?'open':Math.round(t*1000)/1000;
  const F=['object','beat','layer','fn','take','view','seventh','jam','payload'];
  const lys=()=>[...new Set(events.map(e=>e.layer))].sort((x,y)=>x-y);
  const snapAll=()=>({ ev:events.map(e=>[e,e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]), fx:takeFxDump(),
    br:JSON.stringify([loop.rgn.from,loop.rgn.to,loop.rgn.user]), mk:JSON.stringify(sections()), len:JSON.stringify(lys().map(l=>[l,laneLenOf(l)])) });
  /* near: shifted beats compared to 1e-9 beat — a shift and its inverse in floating point are not exact (0.9 + 4 − 4 = 0.9000000000000004);
     objects, order, every other field and payload are compared bit for bit. Undo / redo restore stored values: compared exactly. */
  const rj=x=>x.replace(/-?\d+\.\d+(e-?\d+)?/g, m=>String(Math.round(+m*1e9)/1e9));
  const diff=(A,B,near)=>{ if(A.ev.length!==B.ev.length) return `${A.ev.length} events instead of ${B.ev.length}`;
    for(let i=0;i<B.ev.length;i++){ const x=B.ev[i], y=A.ev[i]; for(let j=0;j<x.length;j++){ if(x[j]===y[j]) continue;
      if(near && j===1 && Math.abs(x[j]-y[j])<=1e-9) continue;
      if(near && j===8 && rj(x[j])===rj(y[j])) continue;
      return `event #${i} (${x[3]} at beat ${bt(x[1])}) differs in its ${F[j]}`; } }
    if(A.fx!==B.fx && !(near && rj(A.fx)===rj(B.fx))) return 'the captured lanes differ';
    if(A.br!==B.br) return `the brace differs (${A.br} instead of ${B.br})`;
    if(A.mk!==B.mk) return `the markers differ (${A.mk} instead of ${B.mk})`;
    if(A.len!==B.len) return `the backing lengths differ (${A.len} instead of ${B.len})`;
    return null; };
  const roleOfFn=f=> f[0]==='c'?'ch' : f[0]==='b'?'bs' : f[0]==='l'?'ld' : null;
  const hz=e=>{ const r=roleOfFn(e.fn); if(!r||/Off$/.test(e.fn)) return null; const f=evHz(e.a,e,r); return Array.isArray(f) ? f.map(x=>x.toFixed(6)).join(',') : (f==null?null:f.toFixed(6)); };
  const notes=()=>songNotes().notes.map(n=>({ n, head:n.head, layer:n.layer, role:n.role, start:n.start, end:n.end, endBy:n.endBy, hz:n.evs.map(hz).filter(x=>x!=null).join(';') }));
  const sigs=()=>new Map(lys().map(l=>{ const k=freezeTicket(l); return [l, k&&k.sig]; }));
  const lanePts=()=>JSON.parse(takeFxDump()).flatMap(([tk,ch,L])=>L.map(s=>({ tk, ...JSON.parse(s) })));
  const ptKey=p=>[p.tk,p.key,p.fx,p.p,JSON.stringify(p.v??p.ids)].join('|');
  const tiesOk=()=>events.filter(e=>e.a&&e.a.tie&&!tiePartners(e).length).length;
  const ok=(label,r)=>{ cases++; if(!r){ miss(`${label}: the edit was refused`); return false; } return true; };
  /* undo, redo and undo again: the song before / after / before, bit for bit */
  const done=r=> !!r && r!=='changed';   // 'changed' — refused: the song changed since (the history is dropped)
  const round=(label,SB,SA)=>{ let d;
    if(!done(songUndo())) return miss(`${label}: undo refused`);
    if((d=diff(snapAll(),SB))) return miss(`${label}: one undo does not restore the song — ${d}`);
    if(!done(songRedo())) return miss(`${label}: redo refused`);
    if((d=diff(snapAll(),SA))) return miss(`${label}: redo does not repeat the edit — ${d}`);
    if(!done(songUndo())) return miss(`${label}: the second undo refused`);
    if((d=diff(snapAll(),SB))) miss(`${label}: the second undo does not restore the song — ${d}`); };
  const restoreVer=laneVerKeep(), S0=snapAll(), pos0=Math.max(0,loop.pos), fz0=new Map(lys().map(l=>[l,freezeState(l)])), H0=histLen();
  const afSeen=[], afPrev=hooks.af; hooks.af=k=>{ afSeen.push(k); if(afPrev) afPrev(k); };
  let tmpLy=null, autLy=null, autList=null;
  try{
    /* the range for cut and duplicate, chosen from the material: notes start inside, notes ring across it from before (and, preferably,
       a note that began before ends inside) */
    let a=null, k=1;
    { const N=notes().filter(x=>x.role!=='dr'), nb=Math.floor(songBeats()/M);
      let best=-1;
      for(let j=1;j+2<nb;j++) for(const kk of [1,2]){ const A=j*M, B2=A+kk*M;
        const st=N.filter(x=>x.start>A-E&&x.start<B2-E).length, cr=N.filter(x=>x.start<A-E&&(x.end==null||x.end>B2+E)).length,
              ei=N.filter(x=>x.start<A-E&&x.end!=null&&x.end>A+E&&x.end<=B2+E).length;
        const sc= st&&cr ? 100+(ei?50:0)+Math.min(st,10) : -1; if(sc>best){ best=sc; a=A; k=kk; } } }
    if(a==null){ miss('no bar range where notes start inside and others ring across it'); return out(); }
    const b=a+k*M;
    /* set-up: a theremin note crossing a bar line after the song, lane points on a chord track, markers */
    const T0=Math.ceil(songBeats()/M-E)*M+M;
    { const R=seedTake([{ fn:'leadOn', a:{ deg:2, oct:1, vol:0.8, inst:0, bend:[{dt:0,c:0},{dt:1,c:40},{dt:3,c:-20},{dt:5,c:15}], v:0 }, t:T0+2, id:1 },
                        { fn:'leadOff', a:{ v:0 }, t:T0+8, id:1 }]);
      tmpLy= R ? events.find(e=>e.tk===R.take&&e.fn==='leadOn')?.layer ?? null : null; }
    if(tmpLy==null) miss('the temporary theremin take could not be recorded');
    autLy=laneOrder().find(l=>laneRoleOf(l)==='ch' && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam)) ?? null;
    if(autLy!=null && editOpen(autLy)){ const A=autAddrs(autLy).find(x=>x.fx==='reverb');
      if(A){ autAddPoint(autLy,A.fx,A.p,a+1.5,0.6); autAddPoint(autLy,A.fx,A.p,b-1.25,0.3); autAddPoint(autLy,A.fx,A.p,b+5,0.8); autList=editHistPeek(); }
      editClose(); }
    if(!autList||autList.length<3) miss('the lane points of the set-up could not be added (no chord track with a reverb)');
    secAdd(Math.max(0,a-M),'Intro'); secAdd(a,'Verse'); secAdd(b+M,'Chorus');
    if(sections().length!==3) miss(`${sections().length} markers after adding three`);
    song=lys().length;
    /* (1)+(2) insert then cut: identity; insert expectations */
    for(const [a,k] of [[b,1],[0,1],[T0+4,2],[T0,1]]){
      const L=k*M, b=a+L, label=`insert ${k} bar(s) at beat ${a}, then cut them`;
      const SB=snapAll(), N0=notes(), H0=new Map(events.map(e=>[e,[e.t,hz(e)]])), P0=lanePts(), MK0=sections(), R0={...loop.rgn}, LL0=new Map(lys().map(l=>[l,laneLenOf(l)])), G0=sigs();
      const th=N0.find(x=>x.head.a&&x.head.a.bend&&x.head.a.bend.length&&x.start<a-E&&(x.end==null||x.end>a+E)), B0=th&&th.head.a.bend.map(q=>({...q}));
      afSeen.length=0;
      if(!ok(label, songEdit('ins',a,b))) continue;
      const SA=snapAll();
      /* the insert, computed here */
      { const N1=new Map(notes().map(x=>[x.head,x]));
        for(const [e,[t0,h]] of H0){ const off=/Off$/.test(e.fn), want= (t0>a+E || (!off && t0>a-E)) ? t0+L : t0;
          if(!eq(e.t,want)){ miss(`${label}: the ${e.fn} at beat ${bt(t0)} sits at ${bt(e.t)}, intended ${bt(want)}`); break; }
          if(hz(e)!==h){ miss(`${label}: the ${e.fn} at beat ${bt(t0)} changed its pitch`); break; } }
        for(const x of N0){ const y=N1.get(x.head); if(!y){ miss(`${label}: the note at ${bt(x.start)} (L${x.layer+1}) is gone`); break; }
          const s1= x.start>a-E ? x.start+L : x.start, e1= x.role==='dr' ? s1 : x.end==null ? null : (x.end>a+E || (x.endBy==='next'&&Math.abs(x.end-a)<E)) ? x.end+L : x.end;
          if(!eq(y.start,s1)||!eq(y.end,e1)){ miss(`${label}: the note ${bt(x.start)}–${bt(x.end)} (L${x.layer+1}) spans ${bt(y.start)}–${bt(y.end)}, intended ${bt(s1)}–${bt(e1)}`); break; } }
        if(N1.size!==N0.length) miss(`${label}: ${N1.size} notes instead of ${N0.length}`);
        if(th){ const B1=th.head.a.bend, W=B0.map(q=>th.start+q.dt>a-E ? {dt:q.dt+L,c:q.c} : q);
          if(JSON.stringify(B1)!==JSON.stringify(W)) miss(`${label}: the crossing theremin's bend is ${JSON.stringify(B1)}, intended ${JSON.stringify(W)}`); }
        const P1=lanePts().map(ptKey).sort(), PW=P0.map(p=>ptKey({ ...p, t:p.t>a-E?p.t+L:p.t })).sort();
        if(JSON.stringify(P1)!==JSON.stringify(PW)) miss(`${label}: the lane points did not move as intended`);
        if(JSON.stringify(P0.map(p=>p.t>a-E?p.t+L:p.t).sort((x,y)=>x-y))!==JSON.stringify(lanePts().map(p=>p.t).sort((x,y)=>x-y))) miss(`${label}: the lane point beats are not the intended ones`);
        const MW=MK0.map(m=>({ ...m, beat: m.beat>a-E ? m.beat+L : m.beat })), MK1=sections();
        if(JSON.stringify(MK1)!==JSON.stringify(MW)) miss(`${label}: the markers are ${JSON.stringify(MK1)}, intended ${JSON.stringify(MW)}`);
        if(R0.user){ const f=R0.from>a-E?R0.from+L:R0.from, t=R0.to>a+E?R0.to+L:R0.to;
          if(!eq(loop.rgn.from,f)||!eq(loop.rgn.to,t)) miss(`${label}: the brace is ${loop.rgn.from}–${loop.rgn.to}, intended ${f}–${t}`); }
        for(const [l,len] of LL0){ const w= len>a+E ? len+L : len; if(!eq(laneLenOf(l),w)) miss(`${label}: L${l+1}'s backing length is ${laneLenOf(l)}, intended ${w}`); }
        const G1=sigs(); let nCh=0, nSame=0;
        const tkM=new Set(P0.filter(p=>p.t>a-E).map(p=>p.tk));
        for(const [l,s] of G0){ const moved=events.some(e=>e.layer===l && (e.t!==H0.get(e)[0] || tkM.has(e.tk||0))) || (th && th.layer===l);
          if(moved){ if(G1.get(l)===s) miss(`${label}: L${l+1}'s material moved but its freeze signature did not change`); else nCh++; }
          else { if(G1.get(l)!==s) miss(`${label}: L${l+1} lies wholly before the point but its freeze signature changed`); else nSame++; } }
        if(a>0 && a<songBeats() && (!nCh||!nSame)) miss(`${label}: ${nCh} tracks changed and ${nSame} kept their signature — a mid-song point must give both`);
        if(!afSeen.includes('section')) miss(`${label}: no auto-freeze hint 'section' was sent`);
        if(songNotes().orphans.length) miss(`${label}: ${songNotes().orphans.length} orphan events`); }
      if(!ok(label, songEdit('cut',a,b))) { songUndo(); continue; }
      { const d=diff(snapAll(),SB,true); if(d) miss(`${label}: the song is not back — ${d}`); }
      /* both steps undo / redo bit for bit */
      { let d; if(songUndo()!=='sec:cut') miss(`${label}: undo of the cut refused`); else if((d=diff(snapAll(),SA))) miss(`${label}: undoing the cut does not give the inserted song — ${d}`);
        if(songUndo()!=='sec:ins') miss(`${label}: undo of the insert refused`); else if((d=diff(snapAll(),SB))) miss(`${label}: undoing both does not restore the song — ${d}`);
        if(!done(songRedo())||!done(songRedo())) miss(`${label}: redo refused`); else if((d=diff(snapAll(),SB,true))) miss(`${label}: redoing both does not give the same song — ${d}`);
        songUndo(); songUndo(); }
    }
    /* (3) cut [20,28): computed here */
    { const L=b-a, label=`cut bars ${a/M+1}–${b/M}`;
      const SB=snapAll(), N0=notes(), P0=lanePts(), MK0=sections(), H0=new Map(events.map(e=>[e,hz(e)]));
      if(ok(label, songEdit('cut',a,b))){ const SA=snapAll(), N1=new Map(notes().map(x=>[x.head,x]));
        let gone=0, cross=0, short=0;
        for(const x of N0){ const y=N1.get(x.head);
          if(x.start>a-E && x.start<b-E){ gone++; if(y) miss(`${label}: the note starting inside at ${bt(x.start)} (L${x.layer+1}) is still there`); continue; }
          if(!y){ miss(`${label}: the note ${bt(x.start)}–${bt(x.end)} (L${x.layer+1}) is gone`); continue; }
          const s1= x.start>b-E ? x.start-L : x.start;
          const e1= x.role==='dr' ? s1 : x.end==null ? null : x.start>b-E || x.end>b+E ? x.end-L : x.end>a+E || (x.endBy==='next'&&x.end>a-E) ? a : x.end;
          if(x.start<a-E && (x.end==null||x.end>b+E)) cross++; else if(x.start<a-E && x.end!=null && x.end>a+E) short++;
          if(!eq(y.start,s1)||!eq(y.end,e1)) miss(`${label}: the note ${bt(x.start)}–${bt(x.end)} (L${x.layer+1}, ended by ${x.endBy}) spans ${bt(y.start)}–${bt(y.end)}, intended ${bt(s1)}–${bt(e1)}`); }
        if(N1.size!==N0.length-gone) miss(`${label}: ${N1.size} notes, ${N0.length-gone} intended`);
        if(!gone||!cross) miss(`${label}: the range must remove notes (${gone}) and shorten notes ringing across it (${cross})`);
        for(const [e,h] of H0) if(events.includes(e) && hz(e)!==h){ miss(`${label}: the ${e.fn} now at ${bt(e.t)} changed its pitch`); break; }
        if(songNotes().orphans.length) miss(`${label}: ${songNotes().orphans.length} orphan events`);
        if(tiesOk()) miss(`${label}: ${tiesOk()} tie halves without a partner`);
        /* lane points, computed here: before the cut as they were, after it L earlier, inside it only the LAST per address, at a */
        { const last=new Map(); for(const p of P0) if(p.t>a-E&&p.t<b-E){ const k=[p.tk,p.key,p.fx,p.p].join('|'), o=last.get(k); if(!o||p.t>=o.t) last.set(k,p); }
          const W=P0.filter(p=>!(p.t>a-E&&p.t<b-E)).map(p=>({ ...p, t:p.t>b-E?p.t-L:p.t })).concat([...last.values()].map(p=>({ ...p, t:a })));
          const got=lanePts().map(p=>rj(ptKey(p)+'@'+p.t)).sort(), want=W.map(p=>rj(ptKey(p)+'@'+p.t)).sort();
          if(JSON.stringify(got)!==JSON.stringify(want)) miss(`${label}: the lane points are ${got.join(' ')}, intended ${want.join(' ')}`);
          if(!last.size) miss(`${label}: no lane point inside the cut — the set-up points did not land there`); }
        const MW=MK0.filter(m=>!(m.beat>a-E&&m.beat<b-E)).map(m=>({ ...m, beat:m.beat>b-E?m.beat-L:m.beat }));
        if(JSON.stringify(sections())!==JSON.stringify(MW)) miss(`${label}: the markers are ${JSON.stringify(sections())}, intended ${JSON.stringify(MW)}`);
        cases+=2; round(label,SB,SA); } }
    /* (4) duplicate [20,28): computed here */
    { const L=b-a, label=`duplicate bars ${a/M+1}–${b/M}`;
      const SB=snapAll(), N0=notes(), P0=lanePts(), MK0=sections();
      if(ok(label, songEdit('dup',a,b))){ const SA=snapAll(), N1=notes(), byHead=new Map(N1.map(x=>[x.head,x])), heads=new Set(N0.map(x=>x.head));
        const copies=N1.filter(x=>!heads.has(x.head)), src=N0.filter(x=>x.start>a-E&&x.start<b-E);
        if(!src.length) miss(`${label}: no note starts inside the range`);
        if(N1.length!==N0.length+src.length) miss(`${label}: ${N1.length} notes, ${N0.length+src.length} intended`);
        for(const x of N0){ const y=byHead.get(x.head); if(!y){ miss(`${label}: the note ${bt(x.start)} (L${x.layer+1}) is gone`); continue; }
          const inside=x.start>a-E&&x.start<b-E, s1= x.start>b-E ? x.start+L : x.start;
          const e1= x.role==='dr' ? s1 : inside ? (x.end==null||x.end>b+E ? b : x.end) : x.end==null ? null : (x.start>b-E || x.end>b+E || (x.endBy==='next'&&Math.abs(x.end-b)<E)) ? x.end+L : x.end;
          if(!eq(y.start,s1)||!eq(y.end,e1)) miss(`${label}: the note ${bt(x.start)}–${bt(x.end)} (L${x.layer+1}) spans ${bt(y.start)}–${bt(y.end)}, intended ${bt(s1)}–${bt(e1)}`);
          if(!inside) continue;
          const c=copies.find(z=>z.layer===x.layer && eq(z.start,x.start+L) && z.hz===x.hz && eq(z.end, x.end==null?null:x.end+L));
          if(!c) miss(`${label}: no copy of the note ${bt(x.start)}–${bt(x.end)} (L${x.layer+1}) at ${bt(x.start+L)} with the same pitches and length`); }
        if(songNotes().orphans.length) miss(`${label}: ${songNotes().orphans.length} orphan events`);
        if(tiesOk()) miss(`${label}: ${tiesOk()} tie halves without a partner`);
        const P1=new Set(lanePts().map(ptKey));
        for(const p of P0) if(p.t>a-E&&p.t<b-E && !P1.has(ptKey({ ...p, t:p.t+L }))){ miss(`${label}: the lane point at ${bt(p.t)} has no copy at ${bt(p.t+L)}`); break; }
        for(const m of MK0) if(m.beat>a-E&&m.beat<b-E && !sections().some(z=>z.name===m.name&&eq(z.beat,m.beat+L))) miss(`${label}: the marker «${m.name}» has no copy at ${m.beat+L}`);
        cases+=2; round(label,SB,SA); } }
    /* (5) the frozen track: an edit inside its material makes it stale; an edit wholly after it keeps it fresh */
    { const fzl=lys().filter(l=>fz0.get(l)==='fresh');
      if(!fzl.length) miss('the seed has no frozen track (P.seed freezes the raga bass)');
      for(const l of fzl){ const ts=events.filter(e=>e.layer===l).map(e=>e.t), f0=Math.floor(Math.min(...ts)/M)*M, f1=Math.ceil((Math.max(...ts)+E)/M)*M;
        cases++; if(ok(`ins at the frozen L${l+1}'s start`, songEdit('ins',f0,f0+M))){ if(freezeState(l)!=='stale') miss(`L${l+1}: an insert at its start left its freeze ${freezeState(l)}`); songUndo(); }
        restoreVer(); if(freezeState(l)!=='fresh') miss(`L${l+1}: not fresh again after the round trip (${freezeState(l)})`);
        cases++; if(ok(`ins after the frozen L${l+1}`, songEdit('ins',f1+M,f1+2*M))){ if(freezeState(l)!=='fresh') miss(`L${l+1}: an insert after its material made its freeze ${freezeState(l)}`); songUndo(); }
        restoreVer(); } }
    /* (6) refusals and CONTROLS */
    cases++; if(songEditWhy('cut',1,5)!=='range') miss(`a cut of beats 1–5 is refused for '${songEditWhy('cut',1,5)}', not 'range'`);
    if(autLy!=null && editOpen(autLy)){ cases++; if(songEditWhy('cut',0,M)!=='editor') miss(`with the editor open a cut is refused for '${songEditWhy('cut',0,M)}', not 'editor'`); editClose(); }
    for(const [x,p,what] of [['lanes',a,'captured lanes'],['bend',T0+4,'payload'],['brace',4,'brace'],['marks',a,'markers'],['len',4,'backing lengths']]){
      cases++; const SB=snapAll();
      if(!songEdit('ins',p,p+M)){ miss(`CONTROL ${x}: the insert was refused`); continue; }
      secDbg(x); const r=songEdit('cut',p,p+M); secDbg(null);
      const d=r ? diff(snapAll(),SB,true) : null;
      if(!r) miss(`CONTROL ${x}: the defective cut was refused`);
      else if(!d || !d.includes(what)) miss(`CONTROL: a cut that forgets the ${x} passed the identity check${d?` (it found: ${d})`:''}`);
      if(r) songUndo(); songUndo();
      { const d2=diff(snapAll(),SB); if(d2) miss(`CONTROL ${x}: two undos do not restore the song — ${d2}`); } }
  } finally {
    secDbg(null); hooks.af=afPrev;
    if(editIsOpen()) editClose();
    /* ED7: the set-up (the temporary take, the lane points, the markers) and every edit are steps of the one history — undo back to the
       probe's start; if the history refuses, fall back to removing the set-up by hand */
    let clean=true; while(histLen()>H0){ const r=songUndo(); if(!done(r)){ clean=false; miss(`cleanup: the history refused to undo (${r}) — set-up removed by hand`); break; } }
    if(!clean){ for(const m of sections()) secDelete(m.id);
      if(autList&&autList.length){ if(editOpen(autLy)){ editRevert(autList); editClose(); } }
      if(tmpLy!=null && events.some(e=>e.layer===tmpLy)){ laneDelTap(tmpLy); laneDelTap(tmpLy); } }
    restoreVer(); seekTo(pos0);
    { const d=diff(snapAll(),S0); if(d) miss(`the song is not back as it was before the probe — ${d}`); }
    for(const [l,s] of fz0) if(freezeState(l)!==s) miss(`L${l+1}: its freeze is ${freezeState(l)} after the probe, ${s} before`);
  }
  console.log(`[scaleprobe ED6] tracks ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED6] '+m));
  if(!nBad) console.log('[scaleprobe ED6] insert then cut = the song bit for bit (events, lanes, brace, markers, backing lengths; undo/redo too); insert, cut and duplicate move every timeline item as computed here; touched tracks change their freeze signature, untouched ones keep it; CONTROLS: a cut that forgets lanes, bends, brace, markers or backing lengths fails the identity check');
  return out();
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:280, name:'ED6 sections', run:()=>checkSections(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:290, name:'ED7 one history', run:()=>checkHistory(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:300, name:'ED7-fix2 undo after clear', run:()=>checkUndoClear(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), drawn:true, song:true });
