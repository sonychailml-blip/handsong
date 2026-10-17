/* CMD1 (RUN 5): the history's tripwire compares VALUES (CMD1a), tracks keep their ids through the song file (CMD1b, v7), every history step
   is a command serialised by ids and parsed back (CMD1c), applied steps reach the journal (CMD1d). Rows:
   «CMD1 value tripwire» — the value hash is the same after Save → Open (a fixed point: the first Open may add the live snapshots the file
   carries) and after a payload is replaced by an equal copy; CONTROL: the old object hash differs in both cases. One changed payload field
   changes it (CONTROL that it can fail). An in-place write is missed with the memo and caught in deep mode (why deep mode exists).
   The song is left as found (its own save opened back, frozen tracks re-frozen with their old seeds). */
import { row } from './rows.js';
import { events, freezeState, laneIdOf as laneOf, histHash, histDbg, histReset, songMark, editIsOpen, recording, loop,
  laneLevelOf, lanePanOf, laneNameOf, laneOrder, laneLenOf, laneMuted, laneSoloed, sections, laneRoleOf, songNotes, editOpen, editVolSel, editClose,
  histUndo, histLen, songBeats, seedTake, autAddrs, autAddPoint, autMovePoint, setLaneLevel, histTab, setLanePan, histMaster, laneNameStep, moveLaneStep,
  secAdd, secRename, songEdit, secDelete, laneDelTap, onUndo, clearJam, clearSong, histRedo, takeFxDump,
  onApplied, cmdSet, regionOn, setRegionOn, setLoopBpm, laneVerKeep, setLaneName } from '../recorder.js';
import { masterLevel, setMasterLevel } from '../audio.js';
import { histToJSON, histFromJSON, histRoundTrip, cmdDbg } from '../song/commands.js';
import { songPrint } from './run.js';

const H=o=>histHash(o), Hobj=()=>{ histDbg({ objHash:true }); try{ return histHash(); } finally{ histDbg(null); } };

export async function checkValueTripwire(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  if(editIsOpen() || recording || loop.on) return { cases:0, total:1, differences:['close the editor and stop the transport first'] };
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))])), print0=songPrint();
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:0, total:1, differences:[`save refused: ${orig.why}`] };
  try{
    /* (1) Save → Open → Save → Open: the value hash is a fixed point; the object hash is not */
    { const o1=UI.songOpenText(orig.text, ()=>true); if(!o1.ok){ miss(`open refused: ${o1.why}`); return { cases:n, total:d.length, differences:d }; }
      const v1=H(), b1=Hobj(), s2=UI.songSaveText(), o2=UI.songOpenText(s2.text, ()=>true), v2=H(), b2=Hobj(); n+=2;
      if(!o2.ok) miss(`the second open refused: ${o2.why}`);
      else { if(v1!==v2) miss(`the value hash changed across Save → Open (${v1} → ${v2})`);
        if(b1===b2) miss('CONTROL: the object hash did not change across Save → Open — the value hash is not what makes it work'); }
      n++; if(H({ deep:true })!==v2) miss('the deep hash differs from the memoised one on an untouched song'); }
    const e=events.find(x=>x.fn==='chOn' && x.a && typeof x.a.vol==='number') || events.find(x=>x.a && typeof x.a.vol==='number');
    if(!e){ miss('no event with a volume'); return { cases:n, total:d.length, differences:d }; }
    const a0=e.a, h0=H(), ob0=Hobj();
    /* (2) an equal copy of a payload: same value hash, other object hash */
    { e.a=JSON.parse(JSON.stringify(a0)); n+=2;
      if(H()!==h0) miss('a payload replaced by an EQUAL copy changed the value hash');
      if(Hobj()===ob0) miss('CONTROL: the object hash did not see the replaced payload');
      e.a=a0; }
    /* (3) one changed field: the value hash must change (CONTROL that it can fail) */
    { e.a={ ...a0, vol:Math.round((a0.vol*0.5+0.01)*1e4)/1e4 }; n++;
      if(H()===h0) miss('CONTROL: one changed volume left the value hash as it was — the tripwire cannot fail');
      e.a=a0; n++; if(H()!==h0) miss('the value hash did not come back with the payload'); }
    /* (4) an in-place write: missed with the memo, caught in deep mode */
    { const v=a0.vol; a0.vol=Math.round((v*0.5+0.02)*1e4)/1e4; n+=2;
      const memo=H(), deep=H({ deep:true });
      a0.vol=v; H({ deep:true });   // the deep pass refreshes the memo — back to the true value
      if(memo!==h0) miss('the memoised hash saw an in-place write (expected to miss it — deep mode is the guard)');
      if(deep===h0) miss('deep mode missed an in-place write');
      n++; if(H()!==h0) miss('after the in-place write was undone the hash is not back'); }
  } finally {
    histDbg(null); histReset();
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    histReset();
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark(); n++; if(songPrint()!==print0) miss('the song is not as it was after the probe');
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:998.2, name:'CMD1 value tripwire', run:()=>checkValueTripwire(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });

/* «CMD1 commands round trip» (CMD1c) — the ED7 sequence (a take, a note volume, a lane point added and moved, level, pan, master, name,
   order, markers, bars insert, row delete, ⤺, backing removed, ✕) plus an Open of the song's own file: after EVERY step the whole history
   is written (histToJSON), turned to text, parsed back and INSTALLED in place of the live one; then full ↶ to the start and full ↷ to the
   end, each state compared EXACTLY by value (event id, beat, layer, kind, take, view object, payload; lanes; tables; markers; master) with
   the snapshot taken after that step. CONTROLS: a writer that drops one field (autmove from.v) must break ↶; the object-identity tripwire
   must answer «changed» after a round trip (it cannot follow parsed copies — the value tripwire is what makes it work); a kind without a
   field declaration must refuse to serialise by name; an unknown event id must refuse to parse and install nothing. */
export async function checkCommands(){
  const d=[]; let n=0; const miss=s=>{ if(d.length<40) d.push(s); else d.length++; };
  if(editIsOpen() || recording || loop.on) return { cases:0, total:1, differences:['close the editor and stop the transport first'] };
  const UI=await import('../ui.js'), R=await import('../render.js');
  const M=loop.metre, bt=t=>Math.round(t*1000)/1000;
  const lys=()=>[...new Set(events.map(e=>e.layer))].sort((x,y)=>x-y);
  if(!lys().length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const snap=()=>({ ev:events.map(e=>[e.id,e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]), fx:takeFxDump(),
    tab:JSON.stringify(lys().map(l=>[l, laneOf(l), laneLevelOf(l), lanePanOf(l), laneNameOf(l), laneOrder().indexOf(l), laneLenOf(l), laneMuted(l), laneSoloed(l)])),
    mk:JSON.stringify(sections()), ms:masterLevel() });
  const F=['id','beat','layer','fn','take','view','seventh','jam','payload'];
  const diff=(A,B)=>{ if(A.ev.length!==B.ev.length) return `${A.ev.length} events instead of ${B.ev.length}`;
    for(let i=0;i<B.ev.length;i++){ const x=B.ev[i], y=A.ev[i]; for(let j=0;j<x.length;j++) if(x[j]!==y[j]) return `event #${i} (${x[3]} at beat ${bt(x[1])}) differs in its ${F[j]}`; }
    if(A.fx!==B.fx) return 'the captured lanes differ'; if(A.tab!==B.tab) return 'the track tables differ';
    if(A.mk!==B.mk) return 'the markers differ'; if(A.ms!==B.ms) return `the master level is ${A.ms}, not ${B.ms}`; return null; };
  const done=r=> !!r && r!=='changed';
  const frozenLy=lys().filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))])), print0=songPrint(), master0=masterLevel();
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:0, total:1, differences:[`save refused: ${orig.why}`] };
  const pick=role=>laneOrder().find(l=>laneRoleOf(l)===role && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam)) ?? null;
  const firstHead=ly=>{ const x=songNotes().notes.find(q=>q.layer===ly && q.role!=='dr'); return x&&x.head; };
  let bytes=0;
  histReset();
  try{
    const S=[snap()], labels=[];
    const step=(label,fn)=>{ n++; let ok=false; try{ ok=fn(); }catch(e){ miss(`${label}: threw ${e&&e.message}`); }
      if(ok===false||ok==null){ miss(`${label}: the step was refused`); return false; }
      if(histLen()!==S.length) miss(`${label}: the history holds ${histLen()} steps after ${S.length} steps`);
      const r=histRoundTrip(); n++;
      if(!r.ok) miss(`${label}: the round trip refused — ${r.why}`); else bytes=Math.max(bytes,r.bytes);
      if(histLen()!==S.length) miss(`${label}: after the round trip the history holds ${histLen()} steps, not ${S.length}`);
      S.push(snap()); labels.push(label); return true; };
    const ly=pick('ch'), lb=pick('bs'), T=Math.ceil(songBeats()/M+1e-9)*M+M;
    if(ly==null||lb==null){ miss('the seed lacks an unfrozen chord or bass track'); return { cases:n, total:d.length, differences:d }; }
    let tmp=null, pt=null, mid=null;
    step('take', ()=>{ const r=seedTake([{ fn:'bassOn', a:{ deg:0, oct:1, vol:0.8, inst:0 }, t:T, id:1 }, { fn:'bassOff', a:{}, t:T+2, id:1 }, { fn:'drum', a:{ row:0, vol:0.8, kit:0 }, t:T }]);
      tmp= r ? events.find(e=>e.tk===r.take)?.layer ?? null : null; return !!r; });
    step('editor: volume of a note', ()=>{ if(!editOpen(lb)) return false; const r=editVolSel([firstHead(lb)],-0.1); editClose(); return !!r; });
    step('editor: a lane point', ()=>{ if(!editOpen(ly)) return false; const A=autAddrs(ly).find(x=>x.fx==='reverb'); pt=A&&autAddPoint(ly,A.fx,A.p,9.5,0.4); editClose(); return !!pt; });
    step('editor: the lane point moved', ()=>{ if(!pt||!editOpen(ly)) return false; const r=autMovePoint(pt, pt.t+0.5, 0.6); editClose(); return !!r; });
    step('level', ()=>{ const v0=laneLevelOf(ly); setLaneLevel(ly,0.5); return histTab(ly,'level',v0); });
    step('pan', ()=>{ const v0=lanePanOf(ly); setLanePan(ly,0.3); return histTab(ly,'pan',v0); });
    step('master', ()=>{ const v0=masterLevel(); setMasterLevel(0.6); return histMaster(v0); });
    step('name', ()=>laneNameStep(ly,'Command probe'));
    step('order', ()=>{ const L=laneOrder(), i=L.indexOf(lb); moveLaneStep(lb, i===0 ? 1 : 0); return true; });
    step('marker add', ()=>{ const m=secAdd(2*M,'A'); mid=m&&m.id; return !!m; });
    step('marker rename', ()=>secRename(mid,'B'));
    step('bars insert', ()=>songEdit('ins',3*M,4*M));
    step('marker delete', ()=>secDelete(mid));
    step('row delete', ()=>{ if(tmp==null) return false; laneDelTap(tmp); return laneDelTap(tmp); });
    step('⤺ take removed', ()=>{ const k=events.length; onUndo(); return events.length<k; });
    step('backing removed', ()=>{ const k=events.length; clearJam(); return events.length<k; });
    step('Open (own file)', ()=>{ const s=UI.songSaveText(); return s.ok && UI.songOpenText(s.text, ()=>true).ok; });
    step('✕ clear', ()=>{ clearSong(); return !events.length; });
    for(let i=S.length-1;i>0;i--){ n++; const r=histUndo();
      if(!done(r)){ miss(`undo of «${labels[i-1]}» refused (${r})`); break; }
      const dd=diff(snap(),S[i-1]); if(dd){ miss(`undo of «${labels[i-1]}» does not give the state before it — ${dd}`); break; }
      if(i%4===0){ const q=histRoundTrip(); if(!q.ok){ miss(`a round trip in the middle of the undo walk refused — ${q.why}`); break; } } }
    { const dd=diff(snap(),S[0]); n++; if(dd) miss(`after the full undo the song is not as at the start — ${dd}`); }
    for(let i=1;i<S.length;i++){ n++; const r=histRedo();
      if(!done(r)){ miss(`redo of «${labels[i-1]}» refused (${r})`); break; }
      const dd=diff(snap(),S[i]); if(dd){ miss(`redo of «${labels[i-1]}» does not give the state after it — ${dd}`); break; }
      if(i%5===0){ const q=histRoundTrip(); if(!q.ok){ miss(`a round trip in the middle of the redo walk refused — ${q.why}`); break; } } }
    for(let i=S.length-1;i>0;i--) if(!done(histUndo())){ miss('the final undo to the start was refused'); break; }
    { const dd=diff(snap(),S[0]); n++; if(dd) miss(`the song is not back at the start after the sequence — ${dd}`); }
    histReset();
    /* CONTROL 1: a writer that drops autmove's from.v — ↶ of the move must then not give the state before it */
    { if(!editOpen(ly)) miss('CONTROL 1: the editor did not open');
      else { const A=autAddrs(ly).find(x=>x.fx==='reverb'), p=A&&autAddPoint(ly,A.fx,A.p,10.5,0.3); editClose();
        const before=snap(); editOpen(ly); const mv=p&&autMovePoint(p, p.t+0.25, 0.7); editClose(); n++;
        if(!p||!mv) miss('CONTROL 1: the lane point could not be added and moved');
        else { cmdDbg({ drop:'autmove.from.v' }); const r=histRoundTrip(); cmdDbg(null);
          const u=r.ok && histUndo(), same=!diff(snap(),before);
          if(!r.ok) miss(`CONTROL 1: the lossy round trip refused (${r.why}) — it should write and break ↶`);
          else if(done(u) && same) miss('CONTROL 1: with the dropped from.v, ↶ still gave the state before the move — the comparison cannot fail'); }
        histReset(); } }
    /* CONTROL 2: the object-identity tripwire cannot follow parsed copies; the value tripwire can */
    for(const objHash of [false,true]){ n++;
      const ok0=UI.songOpenText(orig.text, ()=>true); histReset(); if(!ok0.ok){ miss('CONTROL 2: the song could not be reopened'); break; }
      histDbg(objHash ? { objHash:true } : null);
      const r0=seedTake([{ fn:'bassOn', a:{ deg:1, oct:1, vol:0.7, inst:0 }, t:T, id:1 }, { fn:'bassOff', a:{}, t:T+1, id:1 }]);
      const ly2= r0 ? events.find(e=>e.tk===r0.take)?.layer : null;
      const okA= ly2!=null && laneNameStep(ly2,'tripwire');
      let okB=false; if(okA){ laneDelTap(ly2); okB=laneDelTap(ly2); }
      const rt= okB ? histRoundTrip() : null;
      const u1= rt && rt.ok ? histUndo() : null, u2= done(u1) ? histUndo() : null;
      histDbg(null);
      if(!okB || !rt || !rt.ok) miss(`CONTROL 2 (${objHash?'object':'value'} hash): the steps or the round trip failed (${rt&&rt.why})`);
      else if(!objHash && !done(u2)) miss(`the value tripwire refused ↶ after a round trip (${u1} / ${u2})`);
      else if(objHash && u2!=='changed') miss(`CONTROL 2: the object tripwire answered ${u2} after a round trip, not «changed» — the value tripwire is not what makes it work`);
      histReset(); }
    /* CONTROL 3: a kind without its field declaration refuses by name */
    { n++; laneNameStep(ly,'tab probe'); cmdDbg({ noFields:'tab' }); let why='';
      try{ histToJSON(); }catch(e){ why=String(e&&e.message); } cmdDbg(null);
      if(!/«tab»/.test(why)) miss(`CONTROL 3: a kind without fields did not refuse by name (${why||'it wrote'})`);
      histUndo(); histReset(); }
    /* CONTROL 4: an unknown event id refuses to parse and installs nothing */
    { n++; const ly3=pick('ch'); if(ly3==null || !editOpen(ly3)) miss('CONTROL 4: no chord track to edit');
      else { const r=editVolSel([firstHead(ly3)],-0.05); editClose();
        const t=JSON.stringify(histToJSON()).replace(/\{"\$e":\d+\}/, '{"$e":999999999}'), L0=histLen(), q=histFromJSON(JSON.parse(t));
        if(!r) miss('CONTROL 4: the edit was refused');
        else if(q.ok) miss('CONTROL 4: a history naming an unknown event id was installed');
        else if(!/999999999/.test(q.why)) miss(`CONTROL 4: refused, but not in words naming the id (${q.why})`);
        if(histLen()!==L0) miss('CONTROL 4: a refused parse changed the history');
        histUndo(); }
      histReset(); }
  } finally {
    cmdDbg(null); histDbg(null); if(editIsOpen()) editClose(); histReset();
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    histReset(); setMasterLevel(master0);
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark(); n++; if(songPrint()!==print0) miss('the song is not as it was after the probe');
  }
  console.log(`[scaleprobe CMD1] cases ${n} · differences ${d.length} · largest history text ${bytes} bytes`);
  return { cases:n, total:d.length, differences:d, bytes };
}
row({ at:998.3, name:'CMD1 commands round trip', run:()=>checkCommands(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });

/* «CMD1 journal» (CMD1d) — onApplied hears, in order: a step that enters the history ('do'), ↶ ('undo'), ↷ ('redo'), a group edit of two
   notes ONCE (CONTROL: its sub-steps are not reported one by one), the drop of the history ('reset'), and the commands that are not steps
   ('set' — mute, solo, ⟳, tempo through cmdSet: applied by today's setter, named by the track's permanent id, the history length unchanged).
   An unsubscribed listener hears nothing more. Everything is set back. */
export async function checkJournal(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  if(editIsOpen() || recording || loop.on) return { cases:0, total:1, differences:['close the editor and stop the transport first'] };
  const pick=role=>laneOrder().find(l=>laneRoleOf(l)===role && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam)) ?? null;
  const ly=pick('ch'), lb=pick('bs');
  if(ly==null||lb==null) return { cases:0, total:1, differences:['the seed lacks an unfrozen chord or bass track'] };
  const heads=songNotes().notes.filter(q=>q.layer===lb && q.role!=='dr').slice(0,2).map(q=>q.head);
  const got=[], off=onApplied(x=>got.push(x)), take=()=>got.splice(0).map(x=>x.dir+':'+(x.step ? (x.step.label||x.step.kind) : '-'));
  const name0=laneNameOf(ly), bpm0=loop.bpm, reg0=regionOn(), restoreVer=laneVerKeep();
  histReset(); take();
  try{
    { n++; laneNameStep(ly,'journal'); const a=take(); if(a.join()!=='do:tab') miss(`a name step was heard as ${a.join()||'nothing'}, not do:tab`); }
    { n++; histUndo(); histRedo(); const a=take(); if(a.join()!=='undo:tab,redo:tab') miss(`↶ ↷ were heard as ${a.join()||'nothing'}`); }
    { n++; const ok=heads.length===2 && editOpen(lb) && editVolSel(heads,-0.05); editClose(); const a=take();
      if(!ok) miss('the two-note volume edit was refused');
      else if(a.length!==1 || !a[0].startsWith('do:')) miss(`CONTROL: a group edit of two notes was heard ${a.length} times (${a.join()}), not once`); }
    { n++; const L0=histLen(), id=laneOf(ly), m0=laneMuted(ly);
      cmdSet('mute', ly); const x=got.slice(-1)[0];
      if(laneMuted(ly)===m0) miss('cmdSet mute did not toggle the mute');
      if(!x || x.dir!=='set' || x.step.kind!=='mute' || x.step.value.id!==id) miss(`cmdSet mute was heard as ${x ? x.dir+':'+x.step.kind+' id '+(x.step.value&&x.step.value.id) : 'nothing'} (the track id is ${id})`);
      cmdSet('mute', ly); if(laneMuted(ly)!==m0) miss('the second cmdSet mute did not set it back');
      cmdSet('solo', ly); cmdSet('solo', ly); cmdSet('region', !reg0); cmdSet('region', reg0); cmdSet('tempo', bpm0+7);
      if(loop.bpm!==bpm0+7) miss(`cmdSet tempo left ${loop.bpm} bpm, not ${bpm0+7}`); cmdSet('tempo', bpm0);
      const a=take(); if(a.length!==8 || a.some(s=>!s.startsWith('set:'))) miss(`eight commands were heard as ${a.join()}`);
      if(histLen()!==L0) miss(`the commands changed the history (${L0} → ${histLen()} steps)`); }
    { n++; while(histLen()) if(!histUndo()) break; take();   // the edits undone first (the redo branch keeps the history non-empty), then dropped
      histReset(); const a=take(); if(a.join()!=='reset:-') miss(`the history drop was heard as ${a.join()||'nothing'}`); }
    { n++; off(); laneNameStep(ly,'unheard'); if(got.length) miss('an unsubscribed listener still heard a step'); histUndo(); }
  } finally {
    off(); if(editIsOpen()) editClose();
    while(histLen()) if(!histUndo()) break;
    histReset(); setLaneName(ly, name0==null ? '' : name0); if(loop.bpm!==bpm0) setLoopBpm(bpm0); if(regionOn()!==reg0) setRegionOn(reg0);
    restoreVer();
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:998.4, name:'CMD1 journal', run:()=>checkJournal(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
