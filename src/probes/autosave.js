/* AUTOSAVE1 (RUN 3, 2026-10-16): the song kept on this device by itself — through the real scheduler (autosave.asTick on the probe's
   clock, written at once instead of in an idle moment), the real buttons (#asOn / #asOff, the «Continue?» box) and the real restore
   (ui.asRestoreId → ui.songOpenText, every SAVE1 check). ⛳ A separate database (`handsong-songs-probe`, deleted at the end): the person's
   own autosaves are never touched. The song is left as found (its own save opened back, frozen tracks re-frozen with their old seeds). */
import { row } from './rows.js';
import { meas } from './kit.js';
import { events, freezeState, laneIdOf as laneOf } from '../recorder.js';
import { masterLevel, setMasterLevel } from '../audio.js';
import { songData } from '../song/file.js';
import { songPrint } from './run.js';
import { t } from '../i18n.js';
import * as A from '../autosave.js';

const PDB='handsong-songs-probe';
const norm=r=>{ const x=typeof r==='string' ? JSON.parse(r) : JSON.parse(JSON.stringify(r)); delete x.saved; delete x.id; return JSON.stringify(x); };
const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

export async function checkAutosave(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const UI=await import('../ui.js'), R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, total:1, differences:['no song — run P.seed first'] };
  const frozenLy=L.filter(ly=>freezeState(ly)==='fresh'), seeds=new Map(frozenLy.map(ly=>[ly,R.seedOfLane(laneOf(ly))]));
  const en0=A.asEnabled(), m0=masterLevel(), hold0=A.asInfo().paused.includes('probe-song'), print0=songPrint();
  const orig=UI.songSaveText(); if(!orig.ok) return { cases:0, total:1, differences:[`save refused: ${orig.why}`] };
  let T=performance.now()+1e8;
  const tick=async(dt=0, o={})=>{ T+=dt; const r=A.asTick(T,{ probe:true, sync:true, ...o }); return r && r.then ? await r : r; };
  /* a change, then the scheduler: settling at once, nothing before the settle time, a write after it */
  const change=f=>setMasterLevel(m0*f);
  const writeAfter=async()=>{ const a=await tick(10), b=await tick(100), c=await tick(A.AS.settleMs+A.AS.gapMs); return [a,b,c]; };
  const newest=async()=>{ const l=await A.asList(); return l[0]||null; };
  const msgIs=k=>($('asStatus')&&$('asStatus').dataset.k===k) && ($('camMsg').dataset.msg===t(k));
  try{
    await A.asDrop(PDB); await A.asDbg({ db:PDB });
    $('asOn').click(); n++; if(!A.asEnabled() || !$('asOn').classList.contains('act')) miss('the On button did not turn autosave on');
    /* (1) change → autosave appears; its text is the song as Save writes it */
    change(0.9); { const [a,b,c]=await writeAfter(); n++;
      if(a!=='settling' || b!=='wait' || c!=='write') miss(`a change: expected settling → wait → write, got ${a} → ${b} → ${c}`); }
    const e1=await newest(); n++;
    if(!e1) miss('no autosave written after a change');
    else { const full=await A.asGet(e1.id); n++; meas('autosave write (ms)', A.asInfo().lastMs); meas('autosave size (kB)', Math.round(full.text.length/1024));
      if(norm(full.text)!==norm(songData({ id:e1.id, name:e1.name }))) miss('the autosaved text is not the song as Save writes it');
      if(e1.tracks!==L.length) miss(`the entry lists ${e1.tracks} tracks, the song has ${L.length}`); }
    n++; { const s=await tick(10); if(s!=='same') miss(`no change after the write: expected «same», got «${s}»`); }
    n++; if($('asStatus').dataset.k!=='as.status.ok') miss(`the Song file line does not say it autosaved («${$('asStatus').textContent}»)`);
    /* (2) never while a render runs */
    { change(0.85); const rp=R.renderTrack(L[0],{ quiet:true, short:0.3 }); const b=await tick(A.AS.settleMs+A.AS.gapMs); await rp; n++;
      if(b!=='busy') miss(`a change while a render runs: expected «busy», got «${b}»`);
      const [,,c]=await writeAfter(); n++; if(c!=='write') miss(`after the render the change was not written («${c}»)`); }
    /* (3) Off → nothing written (the real button); CONTROL: a scheduler that ignores the switch must be caught by the same check */
    const offCheck=async()=>{ const before=JSON.stringify(await A.asList()); change(0.7); const r=await writeAfter(); const after=JSON.stringify(await A.asList());
      return { wrote: before!==after, r }; };
    $('asOff').click(); n++; if(A.asEnabled() || $('asStatus').dataset.k!=='as.status.off') miss('the Off button did not turn autosave off (or the line does not say so)');
    { const o=await offCheck(); n++; if(o.wrote || o.r.some(x=>x!=='off')) miss(`autosave off still wrote (${o.r.join(' → ')})`); }
    await A.asDbg({ db:PDB, ignoreOff:true, keep:true }); { const o=await offCheck(); n++; if(!o.wrote) miss('CONTROL: a scheduler ignoring Off wrote nothing — the «off» check cannot fail'); }
    await A.asDbg({ db:PDB, keep:true }); $('asOn').click();
    /* (4) storage full / blocked → one clear line (Song file section + toast); the app keeps working; CONTROL: a silent failure is caught */
    for(const [fail,k] of [['quota','as.no.full'],['blocked','as.no.blocked']]){
      await A.asDbg({ db:PDB, fail, keep:true }); change(fail==='quota'?0.6:0.55); const p=songPrint(); const [,,c]=await writeAfter(); n+=2;
      if(A.asInfo().status!==k.slice(6) || !msgIs(k)) miss(`${fail}: expected status «${k.slice(6)}» and the message «${t(k)}», got «${A.asInfo().status}» / «${$('asStatus').textContent}» / «${$('camMsg').dataset.msg}» (${c})`);
      if(songPrint()!==p || !events.length) miss(`${fail}: the song changed after a failed autosave`); }
    await A.asDbg({ db:PDB, keep:true }); change(0.5); { const [,,c]=await writeAfter(); n++;
      if(c!=='write' || A.asInfo().status!=='ok' || $('asStatus').dataset.k!=='as.status.ok') miss(`after the storage came back the next change did not autosave (${c}, ${A.asInfo().status})`); }
    await A.asDbg({ db:PDB, fail:'quota', silent:true, keep:true }); change(0.45); await writeAfter(); n++;
    if(msgIs('as.no.full')) miss('CONTROL: a silent failure still showed the message — the message check cannot fail');
    await A.asDbg({ db:PDB, keep:true }); change(0.4); await writeAfter();
    /* (5) restore: the «Continue?» box (the real buttons) — «New song» leaves the song, «Continue» opens the newest autosave = identical song */
    const last=await newest(), lastFull=last && await A.asGet(last.id);
    if(!lastFull){ miss('no autosave to restore'); }
    else {
      setMasterLevel(m0*0.3);   // the song on screen now differs from the autosave
      const off=await UI.songResumeOffer({ force:true, ask:()=>true }); n++;
      if(!off || !$('resumeToast').classList.contains('on') || !$('resumeText').textContent.includes(String(last.tracks))) miss(`the «Continue where you left off?» box did not show the newest autosave («${$('resumeText').textContent}»)`);
      $('resumeNo').click(); n+=2; if($('resumeToast').classList.contains('on')) miss('«New song» did not close the box');
      if(Math.abs(masterLevel()-m0*0.3)>1e-9 || songPrint()!==print0) miss('«New song» changed the song');
      await UI.songResumeOffer({ force:true, ask:()=>true }); $('resumeYes').click();
      for(let i=0;i<40 && !/Restored|Возвращено/.test($('camMsg').dataset.msg||'');i++) await wait(50);
      n+=3; if(!/Restored|Возвращено/.test($('camMsg').dataset.msg||'')) miss(`«Continue» did not restore (message «${$('camMsg').dataset.msg}»)`);
      if(norm(songData({ id:last.id, name:last.name }))!==norm(lastFull.text)) miss('the restored song differs from its autosave (save → open → save)');
      if(songPrint()!==print0) miss(`the restored song's events differ (${print0} → ${songPrint()})`);
      n++; { const s=await tick(10); if(s!=='same' && s!=='settling') miss(`right after a restore the scheduler wants to write again («${s}»)`);
        const s2=await tick(A.AS.settleMs+A.AS.gapMs); if(s2==='write') miss('a restored song was written again without a change'); }
      n++; { const g=await UI.asRestoreId('u.no-such-autosave', ()=>true); if(g.ok || g.why!=='gone' || songPrint()!==print0) miss('a missing autosave did not refuse in words, or changed the song'); }
    }
    /* (6) the newest AS_KEEP are kept; CONTROL: without the trim the list grows past it */
    const ringPut=async(k)=>{ for(let i=0;i<k;i++) await A.asPut({ id:'u.probe-ring-'+i+'-'+k, name:'ring '+i, at:new Date(Date.UTC(2099,0,1,0,0,i+k*10)).toISOString(), tracks:1, events:1, ms:0, text:'{}' }); return A.asList(); };
    { const l=await ringPut(7); n++; if(l.length!==A.AS_KEEP || l[0].id!=='u.probe-ring-6-7' || l[A.AS_KEEP-1].id!=='u.probe-ring-2-7') miss(`the ring kept ${l.length}: ${l.map(x=>x.id).join(', ')} (expected the newest ${A.AS_KEEP})`); }
    await A.asDbg({ db:PDB, noTrim:true, keep:true }); { const l=await ringPut(3); n++; if(l.length<=A.AS_KEEP) miss('CONTROL: without the trim the list stayed within the limit — the ring check cannot fail'); }
  } finally {
    await A.asDbg({});   // the real database again (and its scheduler state reset)
    await A.asDrop(PDB);
    A.asSetEnabled(en0); setMasterLevel(m0);
    const back=UI.songOpenText(orig.text, ()=>true); if(!back.ok) miss('could not restore the song at the end');
    for(const ly of frozenLy){ await R.freeze(ly, { quiet:true, seed:seeds.get(ly) }); n++; if(freezeState(ly)!=='fresh') miss(`L${ly+1}: not frozen again after the probe`); }
    $('resumeToast').classList.remove('on');
    if(hold0) A.asPause('probe-song', true);   // a probe's test song stays held (the real store never saw the probe's writes)
    if(songPrint()!==print0) miss('the song is not as it was after the probe');
  }
  return { cases:n, total:d.length, differences:d };
}
row({ at:996, name:'AUTOSAVE1 song kept on the device', run:()=>checkAutosave(), read:r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences }), song:true });
