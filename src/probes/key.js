/* PROBE1: Tonic-freeze probes: the song sound fingerprint (TF0), keys kept (TF2), transpose (TF3), the 1/1 anchor (TF5). Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { droneUse, droneHz } from '../audio.js';
import { rollRowsProbe as RP } from '../draw.js';
import { hooks } from '../hooks.js';
import { withLang, t } from '../i18n.js';
import { KEEP_MAX, PRINT_MAX, SCALES, keyless } from '../probedata.js';
import { events, evHz, evHzDbg, freezeState, frzSigTonicDbg, laneVerKeep, probeTake, histLen, editOpen, editTranspose, editTransposeWhy, histUndo, editIsOpen, editClose, histReset, laneRoleOf, histTopLabel, histRedo, editSetLayer, trDbg, editLayer, songTransposeWhy, songTranspose } from '../recorder.js';
import { tonicFreq, droneSecondHz, viewIdOf, range, centsOf, chordLabel, REG_N, rootName, viewKeyIdOf, keyFollowsDbg, CUR, scaleView, tuningIndexOf, leadFreqTi, bassFreqTi, chordNotesAt, keyByOneOne, keyCDbg, scaleById, NOTE_NAMES, tuningOf } from '../scales.js';
import { tonic, aRef, scaleId, tunedFrom, seventh, chordModeSel, setTonic, setARef, setScaleId, setTunedFrom, setSeventh, setChordModeSel, tonicCents, setTonicCents } from '../state.js';
import { row } from './rows.js';
import { songPrint } from './run.js';
import { SEED_REC } from './seed.js';

/* ═══ TF0 — THE WHOLE SONG'S SOUND FINGERPRINT (tonic freeze, stage 2) ═══
   Every pitched event's frequencies through the engine's own pricing (recorder.evHz — what ENG plays and renders with), the drone's two
   strings, and per track view the editor's row labels, cents, chord labels, roots and chord-row frequencies. Deterministic data, no
   render, no capture (renders repeat to 1e-4 of peak, not bit for bit — this is exact). Taken at the seed's live environment and again
   after the REAL tonic control moved the key +2. Since TF2 recordings keep their key: every recorded line after +2 equals the base line;
   only the live drone line moves (no drone event: the live view).
   Reference: tools/song.print.json, made on unchanged code (P.dumpSongPrint()); later slices must equal it line for line.
   CONTROL (must fail): one track priced one cent sharp (recorder.evHzDbg) — through the engine's real pricing path. */
const PRINT_FILE='tools/song.print.json';
export const liveEnv=()=>({ tonic, aRef, scaleId, tunedFrom, seventh, chordModeSel:JSON.stringify(chordModeSel) });
function liveEnvSet(E){ setTonic(E.tonic); setARef(E.aRef); setScaleId(E.scaleId); setTunedFrom(E.tunedFrom); setSeventh(E.seventh); setChordModeSel(JSON.parse(E.chordModeSel)); }
function songSoundLines(){
  const out=[], S=x=>String(x), role=fn=>/^lead(On|Set)$/.test(fn)?'ld':/^bass(On|Set)$/.test(fn)?'bs':/^ch(On|Set)$/.test(fn)?'ch':null;
  for(const e of events){ const r=role(e.fn);
    if(r){ const f=evHz(e.a,e,r); out.push(`${e.t}|L${e.layer+1}|${e.fn}|${Array.isArray(f)?f.map(S).join(','):S(f)}`); }
    else if(e.fn==='drone') out.push(`${e.t}|L${e.layer+1}|drone|${S(tonicFreq(e.sc)/2)},${S(droneSecondHz(e.sc))}`); }   // TF2: the drone sounds its event's view
  const views=[]; for(const e of events) if(e.sc && e.fn!=='drum' && e.fn!=='drone' && !views.includes(e.sc)) views.push(e.sc);
  out.push(`live drone|${S(tonicFreq()/2)},${S(droneSecondHz())}`);   // the seed has no drone backing: the live drone's two strings
  RP.reset();
  withLang('en',()=>{   // labels in one language: the person's language choice must not move the fingerprint
  for(const v of views) out.push(...viewPrint(v));
  });
  RP.reset();
  return out;
}
/* A track view's editor rows, labels, cents and chord-row frequencies (caller: inside withLang, RP reset around). */
function viewPrint(v){
  const S=x=>String(x), n=v.iv.length, id=viewIdOf(v), ax=RP.axis(v,true), chords=!v.noChords && !(v.chordRule && v.chordRule.kind==='none'), out=[];
  out.push(`view ${id}|rows ${range(ax.rpp).map(r=>RP.axisLbl(ax,r)).join(',')}|notes ${range(n+1).map(d=>RP.noteLbl(d,v)).join(',')}|cents ${range(n+1).map(d=>JSON.stringify(centsOf(d,v))).join(',')}`);
  if(chords) out.push(`view ${id}|chords ${range(n+1).map(d=>chordLabel(d,v,false)).join(',')}|rowHz ${RP.rowFreqs(ax,false,ax.rpp*REG_N).map(S).join(',')}`);
  if(v.typedChords) out.push(`view ${id}|roots ${range(n+1).map(d=>rootName(d,v)).join(',')}`);
  return out;
}
/* The tonic moved by the person: the same control and handler the panel uses (ui: setTonic, softAllOff, droneRetune, label). */
function tonicByControl(k){ const el=document.getElementById('selTonic'); if(!el){ setTonic(k); return; } el.value=String(k); el.dispatchEvent(new Event('change')); }
function songPrintTake(E){
  const keep=liveEnv(), kc=tonicCents;   // TF5: the seed environment is at 0 ¢ (kept outside env: the file's env has no cents)
  try{ liveEnvSet(E); setTonicCents(0); const at=songSoundLines(); tonicByControl((E.tonic+2)%12); const up2=songSoundLines(); tonicByControl(E.tonic); return { at, up2 }; }
  finally{ liveEnvSet(keep); setTonicCents(kc); }
}
export function dumpSongPrint(){
  if(!SEED_REC || SEED_REC.kind!=='seed' || SEED_REC.print!==songPrint()){ console.warn('[scaleprobe print] run await P.seed({replace:true}) first (the fingerprint is of the unchanged seed song)'); return null; }
  const P2=songPrintTake(SEED_REC.env);
  const file={ meta:{ format:'handsong/song-print', version:1, made:new Date().toISOString(), file:PRINT_FILE, events:events.length, env:SEED_REC.env }, ...P2 };
  console.log(`[scaleprobe print] ${P2.at.length}+${P2.up2.length} lines — save the returned object as ${PRINT_FILE} (JSON)`);
  return file;
}
export async function checkSongPrint(){
  let file;
  try{ const r=await fetch(new URL(PRINT_FILE, location.href), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ return { cases:0, song:0, total:0, differences:[], status:'no fingerprint yet' }; }
  if(!SEED_REC || SEED_REC.kind!=='seed' || SEED_REC.print!==songPrint() || JSON.stringify(SEED_REC.env)!==JSON.stringify(file.meta.env))
    return { cases:0, song:0, total:0, differences:[], status:'not applicable: not the unchanged seed song' };
  const bad=[]; let nBad=0, cases=0;
  const cmp=(want,got,part)=>{ cases+=Math.max(want.length,got.length);
    if(want.length!==got.length){ nBad++; bad.push(`${part}: ${got.length} lines now, ${want.length} in ${PRINT_FILE}`); }
    for(let i=0;i<Math.min(want.length,got.length);i++) if(want[i]!==got[i]){ nBad++; if(bad.length<KEEP_MAX) bad.push(`${part} line ${i}: now «${got[i].slice(0,150)}», file «${want[i].slice(0,150)}»`); } };
  const now=songPrintTake(SEED_REC.env); cmp(file.at,now.at,'at the seed key'); cmp(file.up2,now.up2,'after the key moved +2');
  /* CONTROL: one pitched track priced one cent sharp through the engine's own pricing must differ at the seed key */
  const ly=(events.find(e=>/^(lead|bass|ch)On$/.test(e.fn))||{}).layer;
  let ctrl=0; if(ly!=null){ evHzDbg(ly,1); try{ const c=songPrintTake(SEED_REC.env); ctrl=c.at.filter((x,i)=>x!==file.at[i]).length; } finally{ evHzDbg(null); } }
  cases++; if(!ctrl){ nBad++; bad.push(`CONTROL: a one-cent shift of L${ly+1} left the fingerprint equal — the comparison cannot fail`); }
  console.log(`[scaleprobe print] ${cases} lines compared with ${PRINT_FILE} (${file.meta.made}) · differences ${nBad} · control: one cent on L${ly+1} changed ${ctrl} line(s)`);
  return { cases, song:events.length, total:nBad, differences:bad };
}

/* ═══ TF2 — RECORDINGS KEEP THEIR KEY (tonic freeze, stage 2) ═══
   The REAL key control (#selTonic) moved +5, then back:
   (1) every event keeps its view object, every pitched event sounds the same (evHz), every track view's rows, labels, cents, chord rows and
       its drone strings read the same — CONTROL: the old reading (scales.keyFollowsDbg(true): every view reads the knob) must move them;
   (2) live pricing follows the knob: CUR() carries the new key and its tonic moved by exactly that interval;
   (3) frozen tracks stay fresh — CONTROL: the old signature (recorder.frzSigTonicDbg(true)) must stale them;
   (4) the drone engine sounds the view it is given (audio.droneUse): a recorded view's drone stays when the knob moves — CONTROL: no view
       (the live view) must move;
   (5) a backing follows the knob (Q3): a track marked as backing for a moment takes the new key in the same mode, the others keep theirs,
       and back at the old key it holds its old view objects — CONTROL: the key set without the handler leaves the backing behind;
   (6) a key change while recording starts a new track (Q2): in a sandboxed take a note after the key moved lands in another track than
       the note before it, each with its own key — CONTROL: the same take without the key change keeps one track;
   (7) old views without a key read the live key; a view of a view keeps its key; twelve keys = twelve views, one viewIdOf.
   Restores the tonic, the switches, the marks and the tracks' edit versions in finally. */
export function checkKeyKeep(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const S=x=>String(x), role=fn=>/^lead(On|Set)$/.test(fn)?'ld':/^bass(On|Set)$/.test(fn)?'bs':/^ch(On|Set)$/.test(fn)?'ch':null;
  const hz=(e,ctx)=>{ const f=evHz(e.a,ctx||e,role(e.fn)); return Array.isArray(f)?f.map(S).join(','):S(f); };
  const keepT=tonic, before=events.map(e=>e.sc), at=e=>`L${e.layer+1} beat ${e.t} ${e.fn}`, up=(keepT+5)%12;
  const rec=e=>e.sc && !e.jam;   // recorded material (a backing follows the knob — check 5)
  const views=[]; for(const e of events) if(rec(e) && e.fn!=='drum' && e.fn!=='drone' && !views.includes(e.sc)) views.push(e.sc);
  const P=events.filter(e=>rec(e) && role(e.fn));
  const lbl=()=>{ RP.reset(); const o=withLang('en',()=>views.flatMap(v=>[...viewPrint(v), `drone ${viewKeyIdOf(v)}|${S(tonicFreq(v)/2)},${S(droneSecondHz(v))}`])); RP.reset(); return o; };
  let marked=[], scBack=null, verBack=null;
  try{
    const ref=P.map(e=>hz(e)), refL=lbl(), live0=tonicFreq();
    const fresh0=[...new Set(events.map(e=>e.layer))].filter(ly=>freezeState(ly)==='fresh');
    tonicByControl(up);
    /* (1) recordings stay */
    events.forEach((e,i)=>{ if(e.jam) return; cases++; song++; if(e.sc!==before[i]) miss(`${at(e)}: the key control gave it another view (${viewKeyIdOf(e.sc)}, was ${viewKeyIdOf(before[i])})`); });
    P.forEach((e,i)=>{ cases++; const g=hz(e); if(g!==ref[i]) miss(`${at(e)} sounds ${g} after the key moved, ${ref[i]} before`); });
    lbl().forEach((x,i)=>{ cases++; if(x!==refL[i]) miss(`after the key moved: «${x.slice(0,120)}», before «${(refL[i]||'').slice(0,120)}»`); });
    keyFollowsDbg(true);
    try{ cases++; const d=P.filter((e,i)=>hz(e)!==ref[i]).length, dl=lbl().filter((x,i)=>x!==refL[i]).length;
      if(!P.length || !d || !dl) miss(`CONTROL: the old reading (views follow the knob) moves ${d} event(s) and ${dl} line(s) — check (1) cannot fail`); }
    finally{ keyFollowsDbg(false); }
    /* (2) the hands follow */
    cases++; { const c=CUR(), r=tonicFreq()/live0, want=Math.pow(2,(up-keepT)/12);
      if(c.key!==up || Math.abs(r/want-1)>1e-12) miss(`live view: key ${c.key} (want ${up}), its tonic moved ×${r} (want ×${want})`); }
    /* (3) frozen tracks stay fresh */
    cases++; if(!fresh0.length) miss('no frozen fresh track in the song — check (3) proves nothing (run after P.seed)');
    for(const ly of fresh0){ cases++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: a frozen track went ${freezeState(ly)} when the key moved`); }
    frzSigTonicDbg(true);
    try{ cases++; const st=fresh0.filter(ly=>freezeState(ly)==='stale').length;
      if(fresh0.length && !st) miss('CONTROL: the old signature (tonic in it) leaves every frozen track fresh after a key change — check (3) cannot fail'); }
    finally{ frzSigTonicDbg(false); }
    /* (4) the drone engine */
    if(views.length){ const v=views[0], want=[tonicFreq(v)/2, droneSecondHz(v)].map(S).join(',');
      try{ droneUse(v); cases++; const g=droneHz().map(S).join(','); if(g!==want) miss(`drone with view ${viewKeyIdOf(v)}: ${g} at live key ${up}, ${want} at the view's key`);
        droneUse(null); cases++; if(droneHz().map(S).join(',')===want) miss('CONTROL: the drone without a view (the live view) sounds the recorded view at another key — check (4) cannot fail'); }
      finally{ droneUse(null); } }
    tonicByControl(keepT);
    /* (5) the backing follows the knob: the song's backing, or (none) one pitched track marked as backing for a moment; the real control */
    { const jam0=events.filter(e=>e.jam && e.sc && e.fn!=='drum'), ly= jam0.length ? null : (P[0]||{}).layer;
      if(jam0.length || ly!=null){ const mine= jam0.length ? jam0 : events.filter(e=>e.layer===ly && e.sc), M=new Set(mine), others=events.filter(e=>!M.has(e) && e.sc), oSc=others.map(e=>e.sc);
        verBack=laneVerKeep(); scBack=mine.map(e=>[e,e.sc]);
        if(!jam0.length) for(const e of mine){ e.jam=true; marked.push(e); }
        setTonic(up); cases++;   // CONTROL: the key without the handler (no backingFollowKey) must leave the backing behind
        if(!mine.some(e=>e.sc.key!==up)) miss('CONTROL: without the handler the backing is already at the new key — check (5) cannot fail');
        setTonic(keepT);
        tonicByControl(up);
        scBack.forEach(([e,v])=>{ cases++; if(!e.sc || e.sc.key!==up || e.sc.mode!==v.mode) miss(`backing ${at(e)}: key ${e.sc&&e.sc.key}, want ${up} in the same mode`); });
        others.forEach((e,i)=>{ cases++; if(e.sc!==oSc[i]) miss(`recorded ${at(e)} changed its view when the backing followed the knob`); });
        tonicByControl(keepT);
        scBack.forEach(([e,v])=>{ cases++; if(e.sc!==v) miss(`backing ${at(e)}: back at key ${keepT} it holds another view object`); }); } }
    /* (6) a key change while recording starts a new track (Q2) */
    { const take=k=>{ const steps=[{fn:'leadOn',a:{deg:0,oct:1,vol:0.7,inst:3,v:0},t:0},{fn:'leadOff',a:{v:0},t:0.5}];
        if(k) steps.push({do:()=>setTonic(up)});
        steps.push({fn:'leadOn',a:{deg:2,oct:1,vol:0.7,inst:3,v:0},t:1},{fn:'leadOff',a:{v:0},t:1.5});
        try{ return probeTake(steps); } finally { setTonic(keepT); } };
      const A=take(true), B=take(false), on=R=>R.events.filter(e=>e.fn==='leadOn'), lys=R=>new Set(on(R).map(e=>e.layer)).size;
      cases++;
      if(!A.ok || !B.ok) miss(`the sandboxed take was refused — ${A.why||B.why}`);
      else { if(lys(A)!==2) miss(`a key change mid-take: the notes before and after it landed in ${lys(A)} track(s), want 2`);
        cases++; const k=on(A).map(e=>e.sc.key).join(','); if(k!==keepT+','+up) miss(`a key change mid-take: the two notes carry keys ${k}, want ${keepT},${up}`);
        cases++; if(lys(B)!==1) miss(`CONTROL: the same take without a key change used ${lys(B)} track(s) — check (6) cannot fail`); } }
    /* (7) key-less views, a view of a view, twelve keys */
    const bare=v=>{ const c={...v}; delete c.key; return c; };
    setTonic(up);
    try{ P.forEach(e=>{ cases++; const g=hz(e,{...e, sc:bare(e.sc)}), w=hz(e,{...e, sc:scaleView(e.sc.mode, e.sc.tunedFrom, e.sc.chordMode, up)});
        if(g!==w) miss(`old view (no key): ${at(e)} sounds ${g}, the live key ${up} gives ${w}`); });
      for(const v of views){ cases++; if(scaleView(v, v.tunedFrom!==undefined ? v.tunedFrom : tunedFrom, v.chordMode)!==v) miss(`${viewKeyIdOf(v)}: a view of the view at another live key is another object`); } }
    finally{ setTonic(keepT); }
    for(const v of views){ const K=range(12).map(k=>scaleView(v.mode, v.tunedFrom, v.chordMode, k));
      cases++; if(new Set(K).size!==12 || new Set(K.map(viewKeyIdOf)).size!==12 || new Set(K.map(viewIdOf)).size!==1 || K.some((x,k)=>x.key!==k) || K[v.key]!==v)
        miss(`${viewIdOf(v)}: twelve keys do not give twelve views with their own keys, one viewIdOf and twelve viewKeyIdOf`); }
  } finally {
    keyFollowsDbg(false); frzSigTonicDbg(false); droneUse(null);
    for(const e of marked) delete e.jam;
    if(scBack) for(const [e,v] of scBack) e.sc=v;
    if(tonic!==keepT) tonicByControl(keepT);
    if(verBack) verBack();
    RP.reset();
  }
  console.log(`[scaleprobe TF2] ${cases} cases · ${events.length} events · ${views.length} views · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe TF2] '+m));
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ TF5 — THE TUNING ANCHOR «1/1 = G» WITH A CENTS NUDGE (P.checkOneOne, quick and all) ═══
   (1) the gate is the tuning's DATA: «1/1 = …» exactly for the tunings not named by the 12 notes (an independent list of ids); fixedKey never.
   (2) at 0 ¢ every built-in view is the very object it was (no keyC field) for 12 keys — existing songs keep their views (TF0 row: their sound).
   (3) 12-note tunings refuse cents (the view at +17 ¢ is the 0 ¢ view). CONTROL keyCDbg('ungated') must make them differ.
   (4) pricing: every 1/1 view at +17, −23, +50 ¢ (keys 9 and 2): every degree × register for solo, bass, chord, the tonic and the drone's
       second string sound exactly ×2^(c/1200) (1e-12). CONTROL keyCDbg('off') must miss.
   (5) the REAL controls on Partch: the label reads «1/1 =», the cents field shows, Q6: switching to Partch keeps the knob (no G by itself);
       the cents field → the live view carries them, recordings and frozen tracks untouched; «Historical 1/1: G» → G at 0 ¢, then disabled;
       on a 12-note mode the field and the button hide and the live view has no cents.
   (6) Transpose keeps the cents: a seed track with a 1/1 view re-viewed at +13 ¢, +1 st in the editor → key+1, cents kept, ×2^(1/12)
       exactly; the source (viewKeyIdOf) differs from the 0 ¢ one. Everything restored (views, edit versions, knob, scale, history). */
export function checkOneOne(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const ONE=new Set(['bp13','carlos-alpha','carlos-beta','carlos-gamma','edo19','edo31','partch43','pelog','slendro','shruti22']);
  const keepT=tonic, keepC=tonicCents, keepId=scaleId, sc0=new Map(events.map(e=>[e,e.sc])), restoreVer=laneVerKeep(), h0=histLen();
  const fresh0=[...new Set(events.map(e=>e.layer))].filter(l=>freezeState(l)==='fresh');
  const vOf=(m,k,c)=>scaleView(m, m.tunable?'T':undefined, m.chordModes?m.chordModes[0].id:undefined, k, c);
  const near=(a,b,R)=>{ const A=[].concat(a), B=[].concat(b); return A.length===B.length && A.every((x,i)=>Math.abs(x/(B[i]*R)-1)<=1e-12); };
  const role=fn=>/^lead(On|Set)$/.test(fn)?'ld':/^bass(On|Set)$/.test(fn)?'bs':/^ch(On|Set)$/.test(fn)?'ch':null;
  const $id=id=>document.getElementById(id), panel=()=>hooks.key && hooks.key();   // ui's panel sync (the knob, the scale button, the TF5 row)
  /* (4) one view pair → misses (ctl: counted, not reported) */
  const priced=(m,k,c,ctl)=>{ let off=0; const v0=vOf(m,k,0), vc=vOf(m,k,c), R=Math.pow(2,c/1200);
    const chk=(what,a,b)=>{ cases++; if(!near(a,b,R)){ off++; if(!ctl) miss(`${m.id} key ${k} ${c>0?'+':''}${c}¢ ${what}: ${a}, want ${[].concat(b).map(x=>x*R)}`); } };
    chk('tonic',tonicFreq(vc),tonicFreq(v0)); chk('drone 2nd',droneSecondHz(vc),droneSecondHz(v0));
    for(let d=0; d<m.iv.length; d++) for(let o=0; o<REG_N; o++){ const ti=tuningIndexOf(d,v0);
      chk(`solo deg ${d} reg ${o}`,leadFreqTi(ti,o,vc),leadFreqTi(ti,o,v0)); chk(`bass deg ${d} reg ${o}`,bassFreqTi(ti,o,vc),bassFreqTi(ti,o,v0));
      const cf=v=>(chordNotesAt(tuningIndexOf(d,v,true),o,v,false,null)||[]).map(n=>n.f), c0=cf(v0); if(c0.length) chk(`chord deg ${d} reg ${o}`,cf(vc),c0); }
    return off; };
  try{
    const mods=SCALES.filter(m=>m.iv);
    /* (1) + (2) + (3) */
    for(const m of mods){ cases++; const want=!m.fixedKey && ONE.has(m.tuning);
      if(keyByOneOne(m)!==want) miss(`${m.id} (${m.tuning}): «1/1 =» is ${keyByOneOne(m)}, want ${want}`);
      for(let k=0;k<12;k++){ cases++; const v=vOf(m,k,0); if(v!==vOf(m,k) || 'keyC' in v) miss(`${m.id} key ${k}: the 0 ¢ view is not the plain view`);
        if(!want){ cases++; if(vOf(m,k,17)!==v) miss(`${m.id} key ${k}: a 12-note tuning took a cents nudge`); } } }
    { const m=mods.find(x=>!keyByOneOne(x)); keyCDbg('ungated'); try{ cases++; if(m && vOf(m,9,17)===vOf(m,9,0)) miss('CONTROL (ungated): a 12-note mode still refuses cents — check (3) cannot fail'); } finally{ keyCDbg(null); } }
    /* (4) pricing */
    const one=mods.filter(m=>keyByOneOne(m));
    cases++; if(one.length<8) miss(`only ${one.length} «1/1» modes — expected Partch, BP, Carlos, 19/31-TET, gamelan, 22 shruti and the ragas`);
    for(const m of one) for(const k of [9,2]) for(const c of [17,-23,50]) priced(m,k,c);
    { keyCDbg('off'); let off=0; try{ off=priced(one[0],9,17,true); } finally{ keyCDbg(null); }
      cases++; if(!off) miss('CONTROL (cents ignored in pricing): every price still moved — check (4) cannot fail'); }
    /* (5) the real controls on Partch */
    const par=mods.find(m=>m.tuning==='partch43'), maj=scaleById(keepId)||mods.find(m=>!keyByOneOne(m));
    if(!par){ cases++; miss('no Partch mode'); }
    else { setScaleId(par.id); panel();
      const lbl=$id('tonicLbl'), ci=$id('tonicCents'), hb=$id('tonicHist'), hr=$id('tonicHistRow');
      cases++; if(!lbl||!ci||!hb) miss('the TF5 controls (#tonicLbl, #tonicCents, #tonicHist) are missing');
      else {
        cases++; if(tonic!==keepT || tonicCents!==keepC) miss(`Q6: switching to Partch moved the knob (${tonic}, ${tonicCents} ¢)`);
        cases++; if(lbl.textContent!==t('panel.scale.oneOne') || ci.hidden || hr.style.display==='none') miss(`Partch: label «${lbl.textContent}», cents field ${ci.hidden?'hidden':'shown'}, historical ${hr.style.display==='none'?'hidden':'shown'}`);
        cases++; if(!hb.textContent.includes(NOTE_NAMES[7]) || hb.disabled) miss(`Partch: the historical button reads «${hb.textContent}»${hb.disabled?' (disabled)':''}, want G`);
        ci.value='12'; ci.dispatchEvent(new Event('change'));
        cases++; const L0=CUR(); if(tonicCents!==12 || L0.keyC!==12 || L0.key!==keepT) miss(`cents field 12: knob ${tonicCents} ¢, live view key ${L0.key} ${L0.keyC} ¢`);
        cases++; if(Math.abs(tonicFreq(L0)/tonicFreq(vOf(par,keepT,0))/Math.pow(2,12/1200)-1)>1e-12) miss('cents field 12: the live 1/1 did not move by 12 ¢');
        for(const e of events){ if(e.jam) continue; song++; cases++; if(e.sc!==sc0.get(e)){ miss(`L${e.layer+1} beat ${e.t}: the cents knob changed a recording's view`); break; } }
        for(const l of fresh0){ cases++; if(freezeState(l)!=='fresh') miss(`L${l+1}: a frozen track went ${freezeState(l)} on the cents knob`); }
        hb.click();
        cases++; if(tonic!==7 || tonicCents!==0 || CUR().key!==7 || CUR().keyC) miss(`historical: knob ${tonic} ${tonicCents} ¢, want G at 0 ¢`);
        cases++; if(!hb.disabled) miss('historical: the button stays active at G');
        setTonicCents(12); setScaleId(maj.id); panel();
        cases++; if(lbl.textContent!==t('panel.scale.tonic') || !ci.hidden || hr.style.display!=='none' || 'keyC' in CUR()) miss(`12-note mode: label «${lbl.textContent}», cents field ${ci.hidden?'hidden':'shown'}, live view keyC ${CUR().keyC}`); } }
    setScaleId(keepId); setTonicCents(keepC); tonicByControl(keepT);
    for(const [e,v] of sc0) e.sc=v; restoreVer();
    /* (6) Transpose keeps the cents */
    { const ly=[...new Set(events.filter(e=>e.sc && role(e.fn) && !e.jam && keyByOneOne(e.sc)).map(e=>e.layer))][0];
      cases++; if(ly==null) miss('no seed track in a «1/1» tuning (run after P.seed)');
      else { const mine=events.filter(e=>e.layer===ly && e.sc);
        for(const e of mine) e.sc=scaleView(e.sc.mode, e.sc.tunedFrom, e.sc.chordMode, e.sc.key, 13);
        const v13=new Map(mine.map(e=>[e,e.sc])), f13=new Map(mine.filter(e=>role(e.fn)).map(e=>[e,evHz(e.a,e,role(e.fn))]));
        cases++; if(viewKeyIdOf(mine[0].sc)===viewKeyIdOf(sc0.get(mine[0]))) miss('the source of a +13 ¢ view equals the 0 ¢ one — a cents nudge mid-take would not start a new track');
        cases++; if(!editOpen(ly) || !editTranspose(1)) miss(`L${ly+1}: transpose +1 refused (${editTransposeWhy(1)})`);
        else { const R=Math.pow(2,1/12);
          for(const e of mine){ cases++; const v=v13.get(e); if(e.sc.key!==v.key+1 || e.sc.keyC!==13) miss(`L${ly+1} beat ${e.t}: after +1 st key ${e.sc.key} ${e.sc.keyC} ¢, want ${v.key+1} 13 ¢`);
            if(f13.has(e)){ cases++; if(!near(evHz(e.a,e,role(e.fn)),f13.get(e),R)) miss(`L${ly+1} beat ${e.t}: +1 st sounds ${evHz(e.a,e,role(e.fn))}, want ×2^(1/12)`); } }
          cases++; const r=histUndo(); if(!r || r==='changed' || mine.some(e=>e.sc!==v13.get(e))) miss(`L${ly+1}: ↶ of the transpose did not give back the +13 ¢ views (${r})`); }
        if(editIsOpen()) editClose(); } }
  }catch(err){ miss('the probe failed: '+(err&&err.stack||err)); }
  finally{
    keyCDbg(null); if(editIsOpen()) editClose();
    if(scaleId!==keepId) setScaleId(keepId); setTonicCents(keepC); if(tonic!==keepT) tonicByControl(keepT);
    for(const [e,v] of sc0) e.sc=v; restoreVer(); if(histLen()!==h0) histReset(); panel();
  }
  console.log(`[scaleprobe TF5] ${cases} cases · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe TF5] '+m));
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ TF3 — TRANSPOSE BY SEMITONES (one track in the editor, the whole song in the window) ═══
   Expected pitch: what the same note sounded with the KEY KNOB n semitones away before TF2 — the key-less view priced at that live tonic
   (row TF2 (7) proves the key-less reading); key colour of historical temperaments and the 1/1 of non-12 tunings included.
   (1) TRACK +1 (the seed's frozen track): every event keeps its beat and payload object and takes its mode's view at key+1; every pitched
       event sounds as expected; the other tracks keep their view objects; one history step 'transpose'; the frozen track goes stale; ↶ gives
       back the very same views; ↷ again, ↶.
   (2) B → C: +3 from key 9 crosses 11 → 12 and every pitch rises by exactly 2^(3/12) on a mobile track (never an octave down); ↶.
   (3) SONG −1: every track with pitch (the backing too) as expected, drum hits untouched, one step, touched frozen tracks stale; ↶ exact.
   (4) refusals: a key past the range ('range'); a drum track ('drums').
   (5) TF3b: the song step moves the key knob by n (mod 12; select and live view too); ↶/↷ set it back/again; a knob turned by hand between
       the step and its ↶ — ↶ restores knob and backing absolutely. CONTROL trDbg({noKnob}) — the old step leaves the knob: must be caught.
   CONTROLS: trDbg({noTouch}) — the frozen track stays fresh, the staleness check must notice; trDbg({ti}) — the naive transpose (tuning
   index + 1) must miss the expected pitch on the non-12 tracks of the seed. Restores views, edit versions, the editor and the history. */
export function checkTranspose(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const S=x=>String(x), role=fn=>/^lead(On|Set)$/.test(fn)?'ld':/^bass(On|Set)$/.test(fn)?'bs':/^ch(On|Set)$/.test(fn)?'ch':null;
  const hz=(e,ctx)=>{ const f=evHz(e.a,ctx||e,role(e.fn)); return Array.isArray(f)?f.map(S).join(','):S(f); };
  const keepT=tonic, at=e=>`L${e.layer+1} beat ${e.t} ${e.fn}`;
  const pitched=e=>e.sc && role(e.fn);
  const sc0=new Map(events.map(e=>[e,e.sc])), a0=new Map(events.map(e=>[e,e.a]));
  const restoreVer=laneVerKeep(), h0=histLen();
  /* the note as the knob n semitones away sounded before TF2 (key-less view at that live tonic) */
  const expect=(e,n)=>{ const v0=sc0.get(e), k=v0.key+n; if(k<0||k>11) return null; const t0=tonic; setTonic(k); try{ return hz({ ...e, a:a0.get(e) }, { ...e, a:a0.get(e), sc:keyless(v0) }); } finally { setTonic(t0); } };   // TF3b: the knob may have moved with the song
  const checkMoved=(evs,n,what,ctl)=>{ let off=0;
    for(const e of evs){ const v0=sc0.get(e); if(!v0) continue; cases++; song++;
      if(!ctl && e.a!==a0.get(e)) { miss(`${what}: ${at(e)} got another payload`); continue; }
      if(!ctl && (e.sc.mode!==v0.mode || e.sc.key!==v0.key+n || e.sc!==scaleView(v0.mode, v0.tunedFrom, v0.chordMode, v0.key+n))) miss(`${what}: ${at(e)} holds ${viewKeyIdOf(e.sc)}, want the view of its mode at key ${v0.key+n}`);
      if(role(e.fn)){ const w=expect(e,n); if(w!=null && hz(e)!==w){ off++; if(!ctl) miss(`${what}: ${at(e)} sounds ${hz(e)}, the knob ${n>0?'+':''}${n} sounded ${w}`); } } }
    return off; };
  const untouched=(skip,what)=>{ for(const e of events){ if(skip(e)) continue; cases++; if(e.sc!==sc0.get(e) || e.a!==a0.get(e)) miss(`${what}: ${at(e)} (not transposed) changed`); } };
  const back=what=>{ cases++; const r=histUndo(); if(!r || r==='changed') miss(`${what}: ↶ refused (${r})`);
    for(const e of events){ if(e.sc!==sc0.get(e) || e.a!==a0.get(e)){ miss(`${what}: after ↶ ${at(e)} does not hold its old view and payload`); break; } } };
  /* TF3b (user answer 1): a SONG transpose moves the key knob too (mod 12), shown in #selTonic and in the live view; ↶/↷ with it */
  const selT=document.getElementById('selTonic'), kDn=((keepT-1)%12+12)%12;
  const knobAt=(k,what,ctl)=>{ cases++; const ok= tonic===k && selT && selT.value===String(k) && CUR().key===k;
    if(!ok && !ctl) miss(`${what}: the key knob reads ${tonic} (select ${selT&&selT.value}, live view key ${CUR().key}), want ${k}`); return ok; };
  const layers=[...new Set(events.filter(e=>pitched(e)&&!e.jam).map(e=>e.layer))];
  const ly=layers.find(l=>freezeState(l)==='fresh') ?? layers[0];
  const drum=[...new Set(events.map(e=>e.layer))].find(l=>laneRoleOf(l)==='dr' && !events.some(e=>e.layer===l&&e.jam));   // a recorded drum track (a backing refuses as 'backing')
  try{
    if(ly==null){ miss('no pitched recorded track in the song (run after P.seed)'); return { cases, song, total:nBad, differences:bad }; }
    const wasFresh=freezeState(ly)==='fresh', mine=events.filter(e=>e.layer===ly);
    cases++; for(const id of ['rollTrDn','rollTrUp','songTrDn','songTrUp']) if(!document.getElementById(id)){ miss(`no #${id} button`); break; }
    cases++; if(!wasFresh) miss(`L${ly+1}: no frozen fresh track to watch go stale (run after P.seed)`);
    /* (1) one track +1 */
    cases++; if(!editOpen(ly)){ miss(`could not open L${ly+1} in the editor`); return { cases, song, total:nBad, differences:bad }; }
    cases++; if(editTransposeWhy(1)!==null || !editTranspose(1)) miss(`L${ly+1}: transpose +1 refused (${editTransposeWhy(1)})`);
    else {
      checkMoved(mine,1,`track L${ly+1} +1`);
      untouched(e=>e.layer===ly, `track L${ly+1} +1`);
      cases++; if(histLen()!==h0+1 || histTopLabel()!=='transpose') miss(`track +1: ${histLen()-h0} history step(s), top «${histTopLabel()}» — want one 'transpose'`);
      cases++; if(wasFresh && freezeState(ly)!=='stale') miss(`track +1: the frozen L${ly+1} is ${freezeState(ly)}, want stale`);
      back('track +1');
      cases++; if(!histRedo()) miss('track +1: ↷ refused'); else { checkMoved(mine,1,`track L${ly+1} +1 after ↷`); back('track +1 after ↷'); } }
    /* (2) B → C on a mobile track (12-TET or any tuning priced from the key): +3 from key 9 gives key 12, exactly 2^(3/12) higher */
    { const L2=layers.find(l=>{ const v=sc0.get(events.find(e=>e.layer===l&&e.sc)); return v && !v.fixedKey && v.key+3>11; });
      if(L2==null) { cases++; miss('no mobile track whose key +3 crosses B → C'); }
      else { editSetLayer(L2); const m2=events.filter(e=>e.layer===L2 && pitched(e)), f0=m2.map(e=>evHz(e.a,e,role(e.fn)));
        cases++; if(!editTranspose(3)) miss(`L${L2+1}: transpose +3 refused (${editTransposeWhy(3)})`);
        else { const R=Math.pow(2,3/12);
          m2.forEach((e,i)=>{ cases++; const f=evHz(e.a,e,role(e.fn)), A=[].concat(f), B=[].concat(f0[i]);
            if(e.sc.key!==sc0.get(e).key+3 || A.length!==B.length || A.some((x,j)=>Math.abs(x/B[j]/R-1)>1e-12)) miss(`B → C: ${at(e)} at key ${e.sc.key} sounds ${A}, want ${B.map(x=>x*R)}`); });
          back('B → C +3'); } } }
    /* (4) refusals */
    editSetLayer(ly);
    cases++; if(editTransposeWhy(40)!=='range') miss(`a key 40 semitones away: refusal ${editTransposeWhy(40)}, want 'range'`);
    { const bk=[...new Set(events.filter(e=>e.jam).map(e=>e.layer))][0];
      if(bk!=null){ editSetLayer(bk); cases++; if(editTransposeWhy(1)!=='backing') miss(`backing track L${bk+1}: refusal ${editTransposeWhy(1)}, want 'backing'`); editSetLayer(ly); } }
    if(drum!=null){ editSetLayer(drum); cases++; if(editTransposeWhy(1)!=='drums') miss(`drum track L${drum+1}: refusal ${editTransposeWhy(1)}, want 'drums'`); editSetLayer(ly); }
    /* CONTROL (a): no edit-version bump — the frozen track must stay fresh, so the staleness check above must be able to fail */
    if(wasFresh){ restoreVer(); trDbg({ noTouch:true }); try{ cases++; if(editLayer()!==ly || !editTranspose(1)) miss(`CONTROL (no edit version bump): the transpose of L${ly+1} itself was refused — the control proves nothing`); else if(freezeState(ly)!=='fresh') miss(`CONTROL (no edit version bump): L${ly+1} went ${freezeState(ly)} anyway — the staleness check cannot fail`); }
      finally{ trDbg(null); } back('control noTouch'); restoreVer(); }
    editClose();
    /* (3) the whole song −1 */
    const freshAll=[...new Set(events.map(e=>e.layer))].filter(l=>freezeState(l)==='fresh');
    cases++; if(songTransposeWhy(-1)!==null || !songTranspose(-1)) miss(`song −1 refused (${songTransposeWhy(-1)})`);
    else {
      checkMoved(events.filter(e=>e.sc && e.fn!=='drum'),-1,'song −1');
      untouched(e=>e.fn!=='drum', 'song −1 (drum hits)');
      cases++; if(histTopLabel()!=='transpose') miss(`song −1: top history step «${histTopLabel()}», want 'transpose'`);
      for(const l of freshAll) if(events.some(e=>e.layer===l && e.sc && e.fn!=='drum')){ cases++; if(freezeState(l)!=='stale') miss(`song −1: frozen L${l+1} is ${freezeState(l)}, want stale`); }
      knobAt(kDn,'song −1');
      back('song −1'); knobAt(keepT,'song −1 after ↶');
      cases++; if(!histRedo()) miss('song −1: ↷ refused'); else { knobAt(kDn,'song −1 after ↷'); back('song −1 after ↷'); knobAt(keepT,'song −1 after ↷ ↶'); }
      /* the knob turned by hand between the step and its ↶: ↶ restores the knob AND the backing (re-keyed by that turn) absolutely */
      cases++; if(!songTranspose(-1)) miss('song −1 (knob turned after): refused');
      else { const kh=(keepT+5)%12; selT.value=String(kh); selT.dispatchEvent(new Event('change'));
        cases++; if(tonic!==kh) miss(`the real knob did not move to ${kh} (${tonic})`);
        back('song −1, knob turned, ↶'); knobAt(keepT,'song −1, knob turned, ↶'); } }
    /* CONTROL (c): the song step that leaves the knob (pre-TF3b) — the knob check must fail */
    trDbg({ noKnob:true });
    try{ cases++; if(!songTranspose(-1)) miss('CONTROL (knob left behind): its own song −1 was refused — the control proves nothing');
      else { if(knobAt(kDn,'control noKnob',true)) miss('CONTROL (knob left behind): the knob check passes — it cannot fail'); back('control noKnob'); } }
    finally{ trDbg(null); }
    /* CONTROL (b): the naive transpose (tuning index + 1) must miss on the non-12 tracks */
    { const non12=events.filter(e=>pitched(e) && !e.jam && tuningOf(sc0.get(e)).equal!==12);
      cases++; if(!non12.length) miss('no non-12 track in the song — control (b) proves nothing');
      else { trDbg({ ti:true }); let off=0;
        try{ if(songTranspose(1)){ off=checkMoved(non12,1,'control ti',true); back('control ti'); } }
        finally{ trDbg(null); }
        if(!off) miss('CONTROL (naive transpose by tuning index): the non-12 tracks sound as expected — the pitch check cannot fail'); } }
  } finally {
    trDbg(null);
    if(editIsOpen()) editClose();
    for(const e of events){ if(sc0.has(e)){ e.sc=sc0.get(e); e.a=a0.get(e); } }
    if(tonic!==keepT){ setTonic(keepT); if(document.getElementById('selTonic')) document.getElementById('selTonic').value=String(keepT); }
    restoreVer(); histReset();
  }
  console.log(`[scaleprobe TF3] ${cases} cases · ${events.length} events · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe TF3] '+m));
  return { cases, song, total:nBad, differences:bad };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:540, name:'TF0 song sound fingerprint', run:()=>checkSongPrint(), read:r=>({ cases:r.cases, song:r.status?null:r.song, diff:r.total, list:r.differences, status:r.status }), song:true });
row({ at:550, name:'TF2 recordings keep their key', run:()=>checkKeyKeep(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:560, name:'TF3 transpose by semitones', run:()=>checkTranspose(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:570, name:'TF5 tuning anchor 1/1', run:()=>checkOneOne(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
