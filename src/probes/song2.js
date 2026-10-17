/* SONG2 (RUN 3, 2026-10-16): the demo song is a FILE (data/songs/triphop.json) and P.song opens it; the code generator stays a probe tool.
   Row «SONG2 demo song file = its generator»: the generator's song and the file's song, each saved through the real song-file writer,
   are the same record (event / point / track ids and take numbers aside — both are session counters; takes compared by their order). CONTROL: a file with one
   volume changed must differ. The seed song is left as found (its own save opened back, frozen tracks re-frozen with their old seeds).
   P.dumpSong(name) — the generator's file text (to write into data/songs/ on unchanged code).
   ⚠️ The generator's take snapshots read the LIVE chains: any row that leaves a live value changed shows here (RUN 3 found one — the
   AF5 row restored the live chord reverb mix rounded to 6 digits; fixed). */
import { row } from './rows.js';
import { events, freezeState, laneIdOf as laneOf, songSaveRec, songMark } from '../recorder.js';
import { songPrint } from './run.js';

const norm=rec=>{ const r=JSON.parse(JSON.stringify(rec)); delete r.saved; delete r.id; delete r.name;
  const tks=[...new Set([...r.takes.map(k=>k.tk), ...r.events.map(e=>e.tk)])].sort((a,b)=>a-b), M=new Map(tks.map((t,i)=>[t,i+1]));
  for(const e of r.events){ delete e.id; e.tk=M.get(e.tk); } for(const t of r.tracks) delete t.id; for(const k of r.takes){ k.tk=M.get(k.tk); for(const p of k.lane) delete p.id; }
  return JSON.stringify(r); };
const firstDiff=(a,b)=>{ for(let i=0;i<Math.max(a.length,b.length);i++) if(a[i]!==b[i]) return `${a.slice(Math.max(0,i-80),i+80)} <> ${b.slice(Math.max(0,i-80),i+80)}`; return ''; };

export async function dumpSong(name='triphop'){
  const S=await import('../songs.js'); const r=await S.songBuild(name,{ replace:true }); if(!r) return null;
  const s=songSaveRec({ id:'demo.'+name, name:r.name||name }); return s.ok ? JSON.stringify(s.rec) : null;
}
export async function checkSongFile2(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const UI=await import('../ui.js'), R=await import('../render.js'), S=await import('../songs.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))])), print0=songPrint();
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:0, total:1, differences:[`save refused: ${orig.why}`] };
  try{
    const g=await S.songBuild('triphop',{ replace:true }); n++; if(!g){ miss('the generator refused'); return { cases:n, total:d.length, differences:d }; }
    const A=norm(songSaveRec({}).rec);
    const f=await S.loadSong('triphop',{ replace:true }); n++; if(!f){ miss('P.song could not open data/songs/triphop.json'); return { cases:n, total:d.length, differences:d }; }
    const B=norm(songSaveRec({}).rec); n++;
    if(A!==B) miss(`the demo file differs from its generator: ${firstDiff(A,B).slice(0,300)}`);
    /* CONTROL: one volume changed in the file must show */
    { const t=await (await fetch('data/songs/triphop.json',{ cache:'no-store' })).text(), x=JSON.parse(t); const e=x.events.find(q=>q.a&&typeof q.a.vol==='number'); e.a.vol=+(e.a.vol*0.5).toFixed(4);
      const o=UI.songOpenText(JSON.stringify(x), ()=>true); n++; if(!o.ok || norm(songSaveRec({}).rec)===A) miss('CONTROL: a file with one volume changed matched the generator — the comparison cannot fail'); }
  } finally {
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark(); n++; if(songPrint()!==print0) miss('the song is not as it was after the probe');
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1004, name:'SONG2 demo song file = its generator', run:()=>checkSongFile2(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true, slow:true });
