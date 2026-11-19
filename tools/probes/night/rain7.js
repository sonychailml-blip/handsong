/* RAIN-7 — «RAIN-7 street details» (drawn): in the rain room, live. The rain seen in the lamps' light: a cone under every near lamp (the light layer's
   kind 3); the crowns' mask covers part of the promenade (1–40 % of the bake) and their sway grows with Wave (CONTROL: Wave 0 → the rest sway only);
   (RAIN-8: our own window removed — no switch of it left); RAIN-9: the street musician's figure removed (his heard notes still mark their moment) (a «busk» bed event moves his strum's moment). The turning car's sweep and the musician's notes: the data row «RAIN-7 law (app)». */
import { row } from '../core/rows.js';

export async function checkRain7(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), A=await import('../../../core/audio.js'), ST=await import('../../../core/state.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), R=()=>H.sceneRoomDbg(), st=()=>{ const r=R(); return r && r.state ? r.state() : null; };
  const wave=v=>{ const i=A.fxInstance(ST.chainKeyOf('ld'), 'cwave'); if(i) i.params[1].setNorm(v); };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest');
    { const lim=performance.now()+60000; while(!(st() && st().frames>3) && performance.now()<lim) await wait(200); }
    ok('the rain room did not draw', !!st()); if(!st()) return { cases:n, total:d.length, differences:d, notes };
    R().lookDbg('evening'); wave(0); await wait(3500); const D=R().rain7Dbg();
    ok(`no lamp shows its cone of rain (${D.cones})`, D.cones>=6);
    if(st().baked){ ok(`the crowns' mask is wrong (${(D.crownShare*100).toFixed(1)} % of the bake)`, D.crownShare>0.01 && D.crownShare<0.4); wave(1); await wait(4000); const W=R().rain7Dbg(); ok(`the crowns do not sway more with Wave (${D.sway} → ${W.sway})`, W.sway>D.sway*2.5); notes.push(`crowns: ${(D.crownShare*100).toFixed(1)} % of the bake; sway ${D.sway.toFixed(4)} → ${W.sway.toFixed(4)} with Wave`); wave(0); }
    /* RAIN-8: our own window removed (the founder) — nothing of it left: no switch, no field */
    ok('our own window still has its switches', !R().frameDbg && !R().frameSoftDbg && !('frameOn' in D)); notes.push(`${D.cones} lamp cones`);
    /* RAIN-9: the musician's figure removed (no place near enough to be seen) — no figure drawn in any mood; his heard notes still keep their moment */
    for(const m of ['late', 'after', 'evening']){ R().lookDbg(m); await wait(400); ok(`the musician's figure is still drawn at ${m}`, R().rain7Dbg().busker===false); }
    { const b0=R().rain7Dbg().buskAt; R().bed({ kind:'busk', step:0, vel:0.5 }, R().rain7Dbg().t+0.05); await wait(700); const b1=R().rain7Dbg().buskAt; ok(`his strum does not follow his heard note (${b0} → ${b1})`, b1>b0); }
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ try{ wave(0); const r=R(); if(r){ r.lookDbg && r.lookDbg(null); } }catch(e){}
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98662, night:true, drawn:true, name:'RAIN-7 street details', run:()=>checkRain7(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkRain7(); }
