/* TIM3d (RUN 4): row «TIM3d own timbres and song copies» (quick and all). Through the real doors (audio.timbreInstall, ui.songOpenText /
   songSaveText / songKeepTimbres):
   (1) the person's own timbre (a copy of the Organ chord record under a fresh `u.<uuid>`, another cut-off) installs: listed by timbresOf, its
       table entry is the view of its record, and the render copy plays it (synced) — audibly different from the Organ;
   (2) an out-of-bounds record is REFUSED with one line naming the field, never listed; CONTROL `timbreCheckDbg(true)` (the T5 check skipped)
       must let it in;
   (3) a song carrying a valid copy of a timbre this app lacks opens with it installed for the session (its events keep the id and play it),
       a re-save carries the identical record, «Keep in my timbres» hands exactly that record to the store (a stand-in store — the person's
       own is never written by a probe);
   (4) a song carrying an out-of-bounds copy opens with that timbre refused (named, the role's stand-in plays), not installed;
   (5) a version-5 file (copies {role, name, def}) opens upgraded (5) to the same song.
   The seed song is left as found (reopened from its own save, frozen tracks re-frozen with their seeds); probe timbres leave the pickers. */
import { row } from './rows.js';
import { events, freezeState, laneIdOf as laneOf, histReset, songMark } from '../recorder.js';
import { timbreInstall, timbreForgetDbg, timbresOf, timbreIdx, timbreSnapshot, timbreRecord, CHORD_INSTR } from '../audio.js';
import { timbreCheckDbg } from '../timbreload.js';
import { checkTimbre } from '../core/timbre.js';
import { newUserId } from '../core/registry.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const norm=r=>{ const x=copy(r); delete x.saved; delete x.id; return JSON.stringify(x); };
export async function checkOwnTimbres(){
  const d=[]; let n=0; const miss=s=>d.push(s), mine=[];
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))]));
  const organ=timbreRecord('chord.organ'); if(!organ) return { cases:1, total:1, differences:['no chord.organ record'] };
  const own=(lp, lvl)=>{ const r=copy(organ); r.id=newUserId(); r.name={ en:'Probe organ '+lp }; r.recipe.lp=lp; if(lvl!=null) r.recipe.lvl=lvl; mine.push(r.id); return r; };
  const s=UI.songSaveText(); if(!s.ok) return { cases:1, total:1, differences:['save refused: '+s.why] };
  const D0=norm(s.rec);
  try{
    /* (1) */
    const A=own(2600); n+=4;
    const w=timbreInstall(A); if(w) miss('a valid own timbre was refused: '+w);
    if(!timbresOf('ch').some(x=>x.id===A.id)) miss('the own timbre is not listed by timbresOf');
    const ia=timbreIdx('ch', A.id), e=CHORD_INSTR[ia];
    if(!(ia>=0) || !e || e.lp!==2600 || e.t1!==organ.recipe.t1 || e.att!==organ.env.att) miss(`its table entry is not the view of its record: ${JSON.stringify(e)}`);
    const play=idx=>R.engineProbe(async(eng,ctx)=>{ eng.chordOn('tb:own', [220,277.18,329.63], 0.7, idx(eng), null, 0.01); const b=await ctx.startRendering(); return b.getChannelData(0).slice(); }, { sec:0.4 });
    const pa=await play(eng=>eng.timbreIdx('ch', A.id)), po=await play(eng=>eng.timbreIdx('ch','chord.organ'));
    let pk=0, df=0; for(let i=0;i<pa.length;i++){ pk=Math.max(pk,Math.abs(pa[i])); df=Math.max(df,Math.abs(pa[i]-po[i])); }
    if(!(pk>1e-3) || !(df>1e-3)) miss(`the render copy did not play the own timbre (peak ${pk}, difference from the Organ ${df})`);
    /* (2) */
    const B=own(2600, 3); n+=2; const wb=timbreInstall(B);
    if(!wb || !/recipe\.lvl/.test(wb)) miss('an out-of-bounds record was not refused naming recipe.lvl: '+wb);
    if(timbresOf('ch').some(x=>x.id===B.id)) miss('a refused record is listed');
    timbreCheckDbg(true); try{ const C=own(2600, 3); n++; if(timbreInstall(C)) miss('CONTROL: with the T5 check skipped the bad record was still refused — the refusal comes from somewhere else'); } finally{ timbreCheckDbg(false); }
    /* (3) a song with a copy of a timbre this app lacks */
    const T=own(3100), r3=JSON.parse(s.text), chId=[...new Set(r3.events.filter(x=>x.fn==='chOn').map(x=>x.a.inst))][0];
    r3.timbres[T.id]=T; for(const x of r3.events) if(x.a && x.a.inst===chId && /^ch/.test(x.fn)) x.a.inst=T.id;
    const o3=UI.songOpenText(JSON.stringify(r3), ()=>true); n+=4;
    if(!o3.ok) miss('the song with an own timbre copy did not open: '+o3.why);
    else { if(!(o3.timbresFromSong||[]).includes(T.id)) miss('the copy was not installed from the song');
      if(!events.some(x=>x.a && x.a.inst===T.id) || !(timbreIdx('ch', T.id)>=0)) miss('the song\'s events do not play the copy');
      const s3=UI.songSaveText(); if(JSON.stringify(s3.rec.timbres[T.id])!==JSON.stringify(T)) miss('a re-save does not carry the identical record');
      const got=[]; const k=await UI.songKeepTimbres({ store:async(kind,id,rec)=>{ got.push([kind,id,rec]); } }); n++;
      if(!k.ok || got.length!==1 || got[0][0]!=='timbre' || got[0][1]!==T.id || checkTimbre(got[0][2]) || JSON.stringify(got[0][2])!==JSON.stringify(T)) miss(`«Keep in my timbres» stored ${JSON.stringify(got.map(x=>x[1]))}`); }
    /* (4) a song with an out-of-bounds copy */
    const Bad=own(3100, 3), r4=JSON.parse(s.text); r4.timbres[Bad.id]=Bad; for(const x of r4.events) if(x.a && x.a.inst===chId && /^ch/.test(x.fn)) x.a.inst=Bad.id;
    const o4=UI.songOpenText(JSON.stringify(r4), ()=>true); n+=3;
    if(!o4.ok) miss('the song with a bad copy did not open (it must, with the stand-in): '+o4.why);
    else { if(!(o4.timbresRefused||[]).some(x=>x.id===Bad.id && /recipe\.lvl/.test(x.why))) miss('the bad copy was not refused naming recipe.lvl');
      if(timbreIdx('ch', Bad.id)!==undefined) miss('the bad copy was installed');
      if(!o4.missing.timbres.some(x=>x.id===Bad.id)) miss('the bad copy is not named as missing (the stand-in plays)'); }
    /* (5) a version-5 file */
    const r5=JSON.parse(s.text); r5.version=5; for(const id of Object.keys(r5.timbres)){ const q=timbreSnapshot(id); if(q) r5.timbres[id]={ role:q.role, name:q.name, def:q.def }; }
    const o5=UI.songOpenText(JSON.stringify(r5), ()=>true); n+=2;
    if(!o5.ok || o5.upgraded!==5) miss(`a version-5 file did not open upgraded: ${JSON.stringify(o5).slice(0,160)}`);
    else { const s5=UI.songSaveText(); const a=JSON.parse(norm(s5.rec)), b=JSON.parse(D0); delete a.name; delete b.name; if(JSON.stringify(a)!==JSON.stringify(b)) miss('a version-5 file opens to a different song'); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{
    const back=UI.songOpenText(s.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    histReset();
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    for(const id of mine) timbreForgetDbg(id);
    songMark();
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:996.6, name:'TIM3d own timbres and song copies', run:()=>checkOwnTimbres(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
