/* CORE-25 — «NIGHT hands follow the room»: in the rain the hands' lit firefly and the note field's glow were still the forest's lime (core drew a cached
   token). Night now hands core its room's tint (state.setGlowTint, opt-in; Full never sets it). The forest → the rain → the forest (fast switches): after each,
   core's glow colour equals the room record's tint token. CONTROL: with the follow ignored (roomswitch.glowFollowDbg) the rain keeps the forest's colour.
   The drawing side (the fireflies and the field use the colour; none set → the token) is checked in «NIGHT bars and fireflies». */
import { row } from '../core/rows.js';

export async function checkNightGlowTint(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), ST=await import('../../../core/state.js');
  const RI=await import('../../../apps/night/rooms/index.js');
  const was=PR.profileCurrent(), room0=H.sceneRoom(), FOREST='room.forest', RAIN='room.rain', frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const tok=id=>{ const R=RI.roomById(id), t=R && R.record.tint; return t ? getComputedStyle(document.documentElement).getPropertyValue('--cv-'+t).trim().toLowerCase() : null; };
  const go=async id=>{ await RS.roomSwitch(id, { fast:true }); await frames(2); };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ miss('Night did not apply: '+why); return { cases:1, total:1, differences:d }; } }
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    const lime=getComputedStyle(document.documentElement).getPropertyValue('--cv-hn-glow').trim().toLowerCase();
    n++; if(tok(FOREST)!==lime) miss(`the forest's tint ${tok(FOREST)} is not the token lime ${lime} (the forest must look as before)`);
    n++; if(ST.glowTint!==tok(FOREST)) miss(`in the forest the hands' glow is ${ST.glowTint}, not its tint ${tok(FOREST)}`);
    n++; await go(RAIN); if(ST.glowTint!==tok(RAIN)) miss(`in the rain the hands' glow is ${ST.glowTint}, not its tint ${tok(RAIN)}`); else notes.push(`the rain: the hands' glow ${ST.glowTint}`);
    n++; await go(FOREST); if(ST.glowTint!==tok(FOREST)) miss(`back in the forest the hands' glow is ${ST.glowTint}, not ${tok(FOREST)}`); else notes.push(`the forest again: ${ST.glowTint}`);
    /* CONTROL: the follow ignored → the rain keeps the forest's lime */
    n++; RS.glowFollowDbg({ off:true }); try{ await go(RAIN); if(ST.glowTint===tok(RAIN)) miss('CONTROL: with the follow ignored the rain still has its tint — the check cannot fail'); else notes.push(`CONTROL: with the follow ignored the rain keeps ${ST.glowTint}`); }
    finally{ RS.glowFollowDbg({ off:false }); await go(FOREST); }
  } catch(e){ miss('error: '+(e && e.stack || e)); }
  finally{ try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.98709, night:true, name:'NIGHT hands follow the room', drawn:false, run:()=>checkNightGlowTint(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
