/* SAVE1 (DAY run 2026-10-16): Save → Open of a song file, through the real ui doors (ui.songSaveText / ui.songOpenText — the same code
   the buttons run, minus the browser's download and file picker). The probe works on the seed song and leaves it as it found it (it opens
   its own save back and re-freezes the tracks that were frozen, with their old seeds). */
import { row } from './rows.js';
import { meas } from './kit.js';
import { events, freezeState, laneIdOf as laneOf, songDirty, songMark } from '../recorder.js';
import { masterLevel, setMasterLevel, timbreSnapshot } from '../audio.js';
import { SONG_VERSION, TIM1_POSITIONS, songUpgrade } from '../core/songfile.js';
import { songPrint } from './run.js';
import { fileDbg } from '../song/file.js';

const norm=r=>{ const x=JSON.parse(JSON.stringify(r)); delete x.saved; delete x.id; return JSON.stringify(x); };
function firstDiff(a,b){ const A=JSON.parse(a), B=JSON.parse(b);
  for(const k of Object.keys(A)){ const x=JSON.stringify(A[k]), y=JSON.stringify(B[k]); if(x!==y){
    if(Array.isArray(A[k])&&Array.isArray(B[k])){ for(let i=0;i<Math.max(A[k].length,B[k].length);i++) if(JSON.stringify(A[k][i])!==JSON.stringify(B[k][i])) return `${k}[${i}]: ${JSON.stringify(A[k][i]).slice(0,160)} → ${JSON.stringify(B[k][i]).slice(0,160)}`; }
    return `${k}: ${x.slice(0,160)} → ${y.slice(0,160)}`; } }
  return 'no difference'; }
function cmpBuf(a,b){ if(!a||!b||a.length!==b.length||a.numberOfChannels!==b.numberOfChannels) return { shape:false, rel:Infinity };
  let pk=0, mx=0; for(let c=0;c<a.numberOfChannels;c++){ const x=a.getChannelData(c), y=b.getChannelData(c);
    for(let i=0;i<x.length;i++){ const v=Math.abs(x[i]); if(v>pk) pk=v; const e=Math.abs(x[i]-y[i]); if(e>mx) mx=e; } }
  return { shape:true, rel: pk>0 ? mx/pk : mx, peak:pk }; }

export async function checkSongFile(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))]));
  const pitched=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&/^(chOn|bassOn)$/.test(e.fn)))[0];
  const SEED=0x5A11E, rt=ly=>R.renderTrack(ly,{ quiet:true, short:1.0, seed:SEED }).then(r=>r.buf);
  const print0=songPrint();
  let A=null; if(pitched!=null) A=await rt(pitched); else miss('no unfrozen chord or bass track to render');
  /* (1) save, then open that very text: nothing to ask (just saved), the song comes back identical — a second save equals the first */
  const s=UI.songSaveText(); n++; if(!s.ok){ miss(`save refused: ${s.why}`); return { cases:n, total:d.length, differences:d }; }
  const D0=norm(s.rec); meas('song file size (kB)', Math.round(s.text.length/1024));
  let asked=0; const r=UI.songOpenText(s.text, ()=>{ asked++; return true; }); n++;
  try{
    if(!r.ok){ miss(`open of its own save refused: ${r.why} ${JSON.stringify(r.problems||r.missing||'').slice(0,200)}`); return { cases:n, total:d.length, differences:d }; }
    n++; if(asked) miss('Open asked to replace a song that was just saved (it is not unsaved)');
    const s2=UI.songSaveText(); n++; if(norm(s2.rec)!==D0) miss(`save → open → save differs: ${firstDiff(D0,norm(s2.rec))}`);
    n++; if(songPrint()!==print0) miss(`the song's events differ after the round trip (${print0} → ${songPrint()})`);
    n++; if(songDirty()) miss('a song just opened reads as unsaved');
    /* (2) the same audio: one short render of the same track with the same seed before and after */
    if(A){ n++; const B=await rt(pitched), C=cmpBuf(A,B); meas('round trip render difference (of peak)', C.rel, 2e-4, 'max');
      if(!C.shape || !(C.rel<=2e-4)) miss(`L${pitched+1}: the render after Save → Open differs by ${C.rel} of peak (limit 2e-4 — render repeatability)`); }
    /* (3) an OLD file (version 1 — timbre positions) upgrades to the current one and opens to the same song; the upgrade is idempotent */
    const v1=JSON.parse(s.text); v1.version=1; delete v1.timbres;
    for(const e of v1.events){ const role={ leadOn:'ld', leadSet:'ld', chOn:'ch', bassOn:'bs', drum:'dr' }[e.fn], f= role==='dr'?'kit':'inst';
      if(role && typeof e.a[f]==='string'){ const i=TIM1_POSITIONS[role].indexOf(e.a[f]); if(i>=0) e.a[f]=i; } }
    const t1=JSON.stringify(v1), u1=songUpgrade(JSON.parse(t1)), u2=songUpgrade(JSON.parse(JSON.stringify(u1))); n+=2;
    if(u1.version!==SONG_VERSION || JSON.stringify(u1)!==JSON.stringify(u2)) miss('the version-1 upgrade is not idempotent or not at the current version');
    if(JSON.stringify(v1)!==t1) miss('the upgrade changed its input (the opened file must stay as it is)');
    { const o=UI.songOpenText(t1, ()=>true); n++; if(!o.ok || o.upgraded!==1) miss(`a version-1 file did not open as upgraded: ${JSON.stringify(o).slice(0,200)}`);
      else { const s3=UI.songSaveText(); n++; const a=JSON.parse(norm(s3.rec)), b=JSON.parse(D0); delete a.name; delete b.name;
        if(JSON.stringify(a)!==JSON.stringify(b)) miss(`version-1 file opens to a different song: ${firstDiff(JSON.stringify(b),JSON.stringify(a))}`); } }
    /* (4) refusals — each must leave the song untouched */
    const before=songPrint();
    const bad=[['newer', JSON.stringify({ ...JSON.parse(s.text), version:SONG_VERSION+1 })], ['notJson', s.text.slice(0,-40)],
      ['tooBig', ' '.repeat(8*1024*1024+1)], ['badKey', s.text.replace('"settings":{', '"settings":{"__proto__":{"polluted":1},')],
      ['notSong', JSON.stringify({ format:'handsong/tuning', version:1 })],
      ['check', JSON.stringify({ ...JSON.parse(s.text), events:[...JSON.parse(s.text).events, { t:1, layer:999, fn:'chOn', a:{}, v:0, sev:false, tk:1 }] })],
      ['check', s.text.replace(/"inst":"(chord\.[a-z0-9.-]+)"/, '"inst":3')],
      ['modes', s.text.replace(/"mode":"([^"]+)"/, '"mode":"u.no-such-mode"')]];
    for(const [why,text] of bad){ n++; const o=UI.songOpenText(text, ()=>true);
      if(o.ok || o.why!==why) miss(`a ${why} file: expected refusal «${why}», got ${JSON.stringify(o).slice(0,160)}`); }
    n++; if(songPrint()!==before) miss('a refused file changed the song');
    n++; if(({}).polluted!==undefined) miss('a «__proto__» key reached an object prototype');
    /* (5) a timbre this app does not have: with the settings of one it has → mapped to it; with other settings → kept by id, named, copied on */
    { const R0=JSON.parse(s.text), ids=Object.keys(R0.timbres), ch=ids.find(x=>/^chord\./.test(x)) || ids[0];
      const remap=JSON.parse(s.text); remap.timbres['chord.renamed-x']=remap.timbres[ch];
      for(const e of remap.events) if(e.a.inst===ch) e.a.inst='chord.renamed-x';
      const o=UI.songOpenText(JSON.stringify(remap), ()=>true); n++;
      if(!o.ok || o.missing.timbres.length || events.some(e=>e.a&&e.a.inst==='chord.renamed-x')) miss('a renamed timbre with equal settings was not mapped to the app\'s own');
      const other=JSON.parse(JSON.stringify(remap)); other.timbres['chord.renamed-x'].def.lp=12345;
      const o2=UI.songOpenText(JSON.stringify(other), ()=>true); n++;
      if(!o2.ok || o2.missing.timbres.length!==1 || !events.some(e=>e.a&&e.a.inst==='chord.renamed-x')) miss(`an unknown timbre was not kept by its id and named: ${JSON.stringify(o2.missing||o2).slice(0,160)}`);
      else { const s4=UI.songSaveText(); n++; if(!(s4.rec.timbres['chord.renamed-x'] && s4.rec.timbres['chord.renamed-x'].def.lp===12345)) miss('re-saving dropped the copy of a timbre this app does not have'); }
      n++; if(!timbreSnapshot(ch)) miss('no snapshot for a used timbre'); }
    /* (6) unsaved work: Open asks, and «no» leaves the song */
    { const o=UI.songOpenText(s.text, ()=>true); n++; if(!o.ok) miss('reopen failed');
      const m0=masterLevel(); setMasterLevel(m0*0.5); let q=0; const o2=UI.songOpenText(s.text, ()=>{ q++; return false; }); setMasterLevel(m0); n+=2;
      if(q!==1) miss('Open did not ask before replacing unsaved work'); if(o2.ok || o2.why!=='cancelled') miss('«no» to the question still opened the file'); }
    /* CONTROLS: a lossy save (volumes dropped / every take number 1) must break the identity  */
    for(const c of ['noVol','noTk']){ n++; fileDbg({ [c]:true });
      try{ const sx=UI.songSaveText(), ox=UI.songOpenText(sx.text, ()=>true), sy=UI.songSaveText(); fileDbg({});
        const ok2=UI.songOpenText(s.text, ()=>true);   // back to the real song before judging
        if(!ok2.ok) miss('could not reopen the song after a control');
        if(ox.ok && norm(sy.rec)===D0) miss(`CONTROL ${c}: a lossy save round-tripped identical — the check cannot fail`); }
      finally{ fileDbg({}); } }
  } finally {
    /* leave the seed song as it was: open the first save, re-freeze what was frozen with the old seeds */
    const back=UI.songOpenText(s.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark();
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:995, name:'SAVE1 song file save → open', run:()=>checkSongFile(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
