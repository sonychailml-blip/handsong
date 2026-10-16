/* IDS1 (RUN 3, 2026-10-16): every event of the song has a PERMANENT id (song/store.js evIdFill; rule #37) — unique, a positive integer,
   kept by edits that keep the object, by ↶ / ↷ (the same objects come back) and by the song file (Save → Open → the same ids on the same
   events); a new event gets a number above every id the song has. CONTROL: a save that drops the ids must break the «same ids after Open»
   check. The song is left as found (its own save opened back, frozen tracks re-frozen with their old seeds). */
import { row } from './rows.js';
import { events, freezeState, laneIdOf as laneOf, seedTake, histUndo, histRedo, histReset, songMark, editOpen, editClose, autAddPoint, autAddrs, laneOrder, laneRoleOf } from '../recorder.js';
import { fileDbg } from '../song/file.js';
import { takeFx } from '../song/capture.js';
import { songPrint } from './run.js';
import { scaleId, setScaleId } from '../state.js';

/* IDS1 part 2: every lane point of every capture record → "take|key|fx|p|t|id" */
const lanePts=()=>[...takeFx].flatMap(([tk,r])=>(r.lane||[]).map(q=>({ q, tk })));
const laneSig=()=>lanePts().map(({q,tk})=>`${tk}|${q.key}|${q.fx}|${q.p}|${q.t}|${q.id}`).sort().join(',');
/* each event → "beat|layer|fn|id", in birth order (what the file stores) */
const idList=()=>events.map(e=>e.id);
const sig=()=>events.slice().sort((x,y)=>x.t-y.t||x.layer-y.layer||(x.fn<y.fn?-1:x.fn>y.fn?1:0)||(x.id-y.id)).map(e=>`${e.t}|${e.layer}|${e.fn}|${e.id}`).join(',');

export async function checkEventIds(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))]));
  const print0=songPrint(), keepSc=scaleId;
  const ids=()=>{ const I=idList(); return { I, ok: I.every(x=>Number.isInteger(x)&&x>0), uniq: new Set(I).size===I.length, max: Math.max(0,...I) }; };
  /* (1) the seed song: every event has a unique positive integer id */
  { const S=ids(); n++; if(!S.ok || !S.uniq) miss(`events without a valid id or with a repeated one (${S.I.filter(x=>!(x>0)).length} missing, ${S.I.length-new Set(S.I).size} repeated)`); }
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:n, total:1, differences:[`save refused: ${orig.why}`] };
  const sig0=sig(), lsig0=laneSig();
  { const P=lanePts().map(x=>x.q.id); n++; if(P.some(x=>!(Number.isInteger(x)&&x>0)) || new Set(P).size!==P.length) miss(`lane points without a valid id or with a repeated one (${P.length} points)`); }
  try{
    /* (2) Save → Open: the same ids on the same events and lane points */
    { const o=UI.songOpenText(orig.text, ()=>true); n+=2; if(!o.ok) miss(`open refused: ${o.why}`);
      else { if(sig()!==sig0) miss('after Save → Open the events carry other ids'); if(laneSig()!==lsig0) miss('after Save → Open the lane points carry other ids'); } }
    /* (2b) a hand-placed lane point gets a number above every point id; ↶ removes it, ↷ brings THE SAME id back */
    { const ly=laneOrder().find(l=>laneRoleOf(l)==='ch' && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam));
      const max0=Math.max(0,...lanePts().map(x=>x.q.id)); histReset();
      if(ly==null || !editOpen(ly)) miss('(2b): no unfrozen chord track to put a lane point on');
      else { const A=autAddrs(ly).find(x=>x.fx==='reverb'), pt=A && autAddPoint(ly,A.fx,A.p,3.25,0.3); n+=3;
        if(!pt) miss('(2b): the lane point could not be added');
        else { const id=pt.id; if(!(id>max0)) miss(`(2b): the new lane point got id ${id} — not above ${max0}`);
          histUndo(); if(lanePts().some(x=>x.q===pt)) miss('(2b): ↶ did not remove the point');
          histRedo(); if(!lanePts().some(x=>x.q.id===id)) miss(`(2b): ↷ did not bring the point back with id ${id}`); }
        editClose(); } }
    /* (3) a new take: its events get numbers above every id; ↶ removes them, ↷ brings THE SAME ids back */
    const before=ids(); histReset();
    const steps=[{ fn:'leadOn', a:{ deg:0, oct:1, vol:0.7, inst:0 }, t:200, id:1 }, { fn:'leadOff', a:{ v:0 }, t:200.5, id:1 }];
    const tk=seedTake(steps); n++;
    if(!tk) miss('seedTake refused (stop the transport first)');
    else {
      const fresh=events.filter(e=>!before.I.includes(e.id)), S=ids(); n+=2;
      if(!fresh.length || fresh.some(e=>!(e.id>before.max))) miss(`the new take's events got ids ${fresh.map(e=>e.id).join(', ')} — not above the song's ${before.max}`);
      if(!S.uniq) miss('ids repeat after a new take');
      const takeIds=fresh.map(e=>e.id).sort((a,b)=>a-b).join(',');
      histUndo(); n++; if(events.some(e=>fresh.includes(e))) miss('↶ did not remove the take');
      histRedo(); n++; { const back=events.filter(e=>!before.I.includes(e.id)).map(e=>e.id).sort((a,b)=>a-b).join(','); if(back!==takeIds) miss(`↷ brought the take back with ids ${back}, not ${takeIds}`); }
    }
    /* CONTROL: a save without ids opens to the song with NEW ids — the «same ids» check must see it */
    { fileDbg({ noIds:true }); const s2=UI.songSaveText(); fileDbg({}); const o=UI.songOpenText(orig.text, ()=>true); const sigA=sig();
      const o2=UI.songOpenText(s2.text, ()=>true); n++;
      if(o.ok && o2.ok && sig()===sigA) miss('CONTROL: a save without ids reopened with the same ids — the id check cannot fail'); }
  } finally {
    fileDbg({}); setScaleId(keepSc); histReset();
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    songMark();
    n++; if(songPrint()!==print0) miss('the song is not as it was after the probe');
    n++; if(sig()!==sig0) miss('the song\'s ids are not as they were after the probe');
    n++; if(laneSig()!==lsig0) miss('the lane point ids are not as they were after the probe');
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:998, name:'IDS1 permanent event ids', run:()=>checkEventIds(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
