/* SONG1 (RUN 3, 2026-10-16): a song carries copies of the person's own tunings / modes it uses (rule #37) — so it opens on any device.
   Material: the user-file example (userfiles.example: an own tuning + a mode on it) under the probe's ids, installed for the session (no
   store); a REAL take in that mode (recorder.seedTake). Save → the file holds both copies, equal to the originals; the records removed (as
   on another device) → Open plays from the copies: the same prices note for note (evHz / chordNotesAt), the scale back in the registry,
   «Keep in my scales» stores them. Refusals leave the song AND the registry untouched. CONTROL: a save without copies must not open there.
   The song is left as found (its own save opened back, frozen tracks re-frozen with their old seeds). */
import { row } from './rows.js';
import { events, freezeState, laneIdOf as laneOf, seedTake, evHz, songMark } from '../recorder.js';
import { scaleData, scaleById, registerRecord, unregisterRecord, chordNotesAt, CUR } from '../scales.js';
import { scaleId, setScaleId } from '../state.js';
import { userAll, userDel } from '../userstore.js';
import { example as userExample } from '../userfiles.js';
import { fileDbg } from '../song/file.js';
import { songPrint } from './run.js';

const S1_T='u.5013a000-0000-4000-8000-00000000001a', S1_M='u.5013a000-0000-4000-8000-00000000001b';
const roleOf=fn=> fn.startsWith('lead') ? 'ld' : fn.startsWith('bass') ? 'bs' : fn.startsWith('ch') ? 'ch' : null;
const priceOf=evs=>JSON.stringify(evs.filter(e=>roleOf(e.fn) && e.a && e.a.ti!=null).map(e=>{ const r=roleOf(e.fn);
  return [e.fn, e.t, r==='ch' ? chordNotesAt(e.a.ti,e.a.oct,e.sc,e.sev,e.a.ty).map(n=>n.f) : evHz(e.a,e,r)]; }));
const $=id=>document.getElementById(id);

export async function checkSongRecords(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L0=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L0.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L0.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))]));
  const keepSc=scaleId, print0=songPrint(), D=scaleData();
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:0, total:1, differences:[`save refused: ${orig.why}`] };
  const E=userExample(), t0={ ...E.tuning, id:S1_T }, m0={ ...E.mode, id:S1_M, tuning:S1_T, name:{ en:'Probe: song mode', ru:'Проба: лад песни' } };
  const drop=()=>{ if(D.modes[S1_M]) unregisterRecord('mode',S1_M,false); if(D.tunings[S1_T]) unregisterRecord('tuning',S1_T,false); };
  const unstore=async()=>{ await userDel('mode',S1_M); await userDel('tuning',S1_T); };
  try{
    drop(); await unstore();
    registerRecord('tuning',t0,false); registerRecord('mode',m0,false); setScaleId(S1_M);
    const v=CUR(); n++; if(!v || v.mode!==scaleById(S1_M)){ miss('the probe mode did not become the live view'); return { cases:n, total:d.length, differences:d }; }
    const steps=[]; let t=0; for(let deg=0;deg<=v.iv.length;deg++){ steps.push({ fn:'leadOn', a:{ deg, oct:1, vol:0.7, inst:0 }, t, id:deg+1 }); steps.push({ fn:'leadOff', a:{ v:0 }, t:t+0.5, id:deg+1 }); t+=0.5; }
    const tk=seedTake(steps); n++; if(!tk){ miss('seedTake refused (stop the transport first)'); return { cases:n, total:d.length, differences:d }; }
    const layer=tk.layers[0], evsOf=()=>events.filter(e=>e.layer===layer), before=priceOf(evsOf());
    n++; if(!evsOf().some(e=>e.sc && e.sc.mode===scaleById(S1_M))) miss('no event of the take holds the probe mode');
    setScaleId(keepSc);
    /* (1) Save: the copies are in the file, equal to the originals */
    const s=UI.songSaveText(); n+=2;
    const RC=s.ok && s.rec.records;
    if(!RC || !RC.mode || JSON.stringify(RC.mode[S1_M])!==JSON.stringify(m0)) miss(`the file does not carry the mode's copy (${JSON.stringify(RC&&Object.keys(RC.mode||{}))})`);
    if(!RC || !RC.tuning || JSON.stringify(RC.tuning[S1_T])!==JSON.stringify(t0)) miss('the file does not carry the tuning\'s copy');
    n++; if(RC && Object.keys(RC).some(k=>Object.keys(RC[k]).some(id=>!id.startsWith('u.')))) miss('a built-in record was copied into the file');
    /* (2) another device: the records are gone → Open plays from the copies */
    drop(); n++; if(scaleById(S1_M)) miss('could not remove the probe mode');
    const o=UI.songOpenText(s.text, ()=>true); n+=4;
    if(!o.ok) miss(`the song did not open from its own copies: ${o.why} ${JSON.stringify(o.problems||o.missing||'').slice(0,160)}`);
    else {
      if(!(o.fromSong||[]).includes(S1_M)) miss(`the open did not report the mode from the song (${JSON.stringify(o.fromSong)})`);
      if(!scaleById(S1_M) || !D.tunings[S1_T]) miss('the copies are not in the registry after the open');
      const after=priceOf(evsOf()); if(after!==before) miss(`the take sounds differently from the copies: ${after.slice(0,160)} vs ${before.slice(0,160)}`);
      if(!/Probe: song mode|Проба: лад песни/.test($('camMsg').dataset.msg||'') && !/Probe: song mode|Проба: лад песни/.test($('songKeepHint').textContent)) miss(`the message does not name the scale from the song («${$('camMsg').dataset.msg}»)`);
      /* (3) «Keep in my scales» stores both (the real button) */
      n+=2; if($('songKeepRow').hidden) miss('the «Keep in my scales» row is hidden after opening a song with its own scale');
      const k=await UI.songKeep(); const st=await userAll();
      if(!k.ok || !st.some(e=>e.id===S1_M && e.kind==='mode') || !st.some(e=>e.id===S1_T && e.kind==='tuning')) miss('«Keep in my scales» did not store the mode and its tuning');
      n++; if(!$('songKeepRow').hidden) miss('the row stays after keeping'); }
    /* (4) refusals: a copy without its tuning, a damaged copy — the song and the registry untouched */
    drop(); await unstore();
    for(const [what,mut,why] of [['a mode copy without its tuning', r=>{ delete r.records.tuning; }, 'modes'], ['a damaged mode copy', r=>{ r.records.mode[S1_M].degrees=[0,0,99]; }, 'records'],
                                ['a copy under a built-in id', r=>{ r.records.mode={ 'major':{ ...r.records.mode[S1_M], id:'major' } }; }, 'check']]){
      const r=JSON.parse(s.text); mut(r); const p=songPrint(); const x=UI.songOpenText(JSON.stringify(r), ()=>true); n+=2;
      if(x.ok || x.why!==why) miss(`${what}: expected refusal «${why}», got ${JSON.stringify(x).slice(0,140)}`);
      if(songPrint()!==p || scaleById(S1_M) || D.tunings[S1_T]) miss(`${what}: the song or the registry changed`); }
    /* CONTROL: a save without the copies must not open where the records are missing */
    registerRecord('tuning',t0,false); registerRecord('mode',m0,false);
    fileDbg({ noRecs:true }); const sx=UI.songSaveText(); fileDbg({}); drop();
    { const x=UI.songOpenText(sx.text, ()=>true); n++; if(x.ok) miss('CONTROL: a song saved without its copies opened where its scale is missing — the check cannot fail'); }
  } finally {
    fileDbg({}); drop(); await unstore(); setScaleId(keepSc);
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark();
    if(songPrint()!==print0) miss('the song is not as it was after the probe');
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:997, name:'SONG1 songs carry their own scales', run:()=>checkSongRecords(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
