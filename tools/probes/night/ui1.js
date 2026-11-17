/* UI-1 — «NIGHT labels follow the room»: the founder entered the rain and the Sound button still read «Firefly» while another timbre played. On every room
   switch the labels of Sound, Music and Mood must read what actually plays (the room's music is applied after its timbres install: the shell redraws on
   its word). The forest → the rain → the forest: after each switch (and the room's music applied, 10 s at most) the three labels equal the doors' own
   names of the current timbre, music level (the rain: its own names) and mood. CONTROL: with that redraw ignored (the old way) the rain's Sound label is
   stale. Also: the «music follows the played chord» switch hides in the rain and shows in the forest (a room's own composed music ignores it). */
import { row } from '../core/rows.js';

export async function checkNightLabels(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), $=id=>document.getElementById(id);
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), SH=await import('../../../apps/night/shell.js');
  const BD=await import('../../../apps/night/bed.js'), music0=BD.bedModeOf();
  const was=PR.profileCurrent(), room0=H.sceneRoom(), FOREST='room.forest', RAIN='room.rain', wait=ms=>new Promise(r=>setTimeout(r, ms)), frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const applied=()=>new Promise(r=>{ let done=false; const on=()=>{ if(!done){ done=true; document.removeEventListener('night-room-music', on); r(true); } }; document.addEventListener('night-room-music', on); setTimeout(()=>{ if(!done){ done=true; document.removeEventListener('night-room-music', on); r(false); } }, 10000); });
  const go=async id=>{ const w=applied(); await RS.roomSwitch(id, { fast:true }); const ok=await w; await frames(3); return ok; };
  const judge=(L, where)=>{ const bad=[]; for(const k of ['sound', 'music', 'mood']) if(L.labels[k]!==L.want[k]) bad.push(`${k} reads «${L.labels[k]}», plays «${L.want[k]}»`); return bad.length ? `${where}: ${bad.join('; ')}` : null; };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ miss('Night did not apply: '+why); return { cases:1, total:1, differences:d }; } }
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    for(let k=0;k<4 && BD.bedModeOf()!=='drift';k++) $('nightMusic').click();   // the music on (Drift): the rain's own level names are read
    n+=3; { const ok=await go(RAIN), L=SH.nightLabelsDbg(); if(!ok) miss('entering the rain: its music was not applied within 10 s');
      const b=judge(L, 'entering the rain'); if(b) miss(b); else notes.push(`the rain: Sound «${L.labels.sound}», Music «${L.labels.music}», Mood «${L.labels.mood}» — what plays`);
      if(!/^(Drizzle|Rain|Downpour|Морось|Дождь|Ливень)$/.test(L.labels.music)) miss(`the rain's Music button reads «${L.labels.music}», not its own names`);
      if(!$('nightMusicAnswerTg').hidden) miss('the «music follows the played chord» switch shows in the rain'); }
    n+=2; { await go(FOREST); const L=SH.nightLabelsDbg(), b=judge(L, 'back in the forest'); if(b) miss(b); else notes.push(`the forest again: Sound «${L.labels.sound}», Music «${L.labels.music}», Mood «${L.labels.mood}»`);
      if($('nightMusicAnswerTg').hidden) miss('the «music follows the played chord» switch is hidden in the forest'); }
    /* CONTROL: the redraw ignored — the rain's labels stay the forest's */
    n++; { SH.nightLabelsDbg({ stale:true }); try{ await go(RAIN); const L=SH.nightLabelsDbg(); if(!judge(L, 'x')) miss('CONTROL: with the redraw ignored the labels still read what plays — the check cannot fail'); else notes.push('CONTROL: with the redraw ignored the rain\'s labels are stale ('+judge(L, 'the rain').replace(/^the rain: /, '')+')'); }
      finally{ SH.nightLabelsDbg({ stale:false }); await go(FOREST); } }
  } catch(e){ miss('error: '+(e && e.stack || e)); }
  finally{ for(let k=0;k<4 && BD.bedModeOf()!==music0;k++) $('nightMusic').click(); try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); await wait(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.98708, night:true, name:'NIGHT labels follow the room', drawn:false, run:()=>checkNightLabels(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
