/* PERF-2 — «PERF invisible» (drawn, slow): every optimisation applied only because it changes NOTHING on the screen, proved by the host's exact A/B
   (sceneSnapDbg: one scene state rendered twice — the optimisation on, then off — at the drawing buffer's own size, the RGB bytes that differ counted:
   must be no more than the same frame rendered twice with nothing changed — the room's own repeat noise, 0 where the room is exact), in both rooms at the three quality levels (setSceneLevel / setSceneLight). Each case has a CONTROL that must differ (a visible switch
   through the same A/B). The list: the rain's own window computed only where it can show (frameAllDbg); (the forest hand light's shadow skip was measured — 264 bytes differ — and is NOT applied). Restored in finally. */
import { row } from '../core/rows.js';

const LEVELS=[['full', false], ['reduced', false], ['reduced', true]];
export async function checkPerfInvisible(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), lv0=H.sceneLevel(), R=()=>H.sceneRoomDbg();
  const ready=async id=>{ const lim=performance.now()+90000; while(performance.now()<lim){ const I=H.sceneInfo(); if(I.id && I.id.endsWith(id) && !I.opening && I.rendered>3) return true; await wait(250); } return false; };
  const ab=async alt=>{ const r=await H.sceneSnapDbg(alt, true); return r ? r[2] : null; };
  const CASES={ rain:[
    { name:'our own window only where it can show', on:()=>!!(R() && R().frameAllDbg), alt:v=>R().frameAllDbg(v), control:v=>R().frameDbg(!v) } ], forest:[] };   // the forest hand light's shadow skip: NOT applied (264 bytes differ — measured with shadowAllDbg(false)); off by default, so nothing to prove here
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    await H.setBackground('forest');
    for(const room of ['rain', 'forest']){ if(!CASES[room].length) continue;
      if(H.sceneRoom()!=='room.'+room) await RS.roomSwitch('room.'+room, { fast:true });
      for(const [lv, light] of LEVELS){ H.setSceneLight(light); await H.setSceneLevel(lv); const tag=`${room} ${light ? 'light' : lv}`;
        if(!ok(`${tag}: the room did not open`, await ready(room))) continue; await wait(room==="rain" ? 14000 : 1500);   // the rain: our window comes in after the reveal (frames 240–360)
        for(const C of CASES[room]){ if(C.opt && !C.on()){ notes.push(`${tag}: ${C.name} — not at this level (nothing to skip)`); continue; } if(!ok(`${tag}: ${C.name} — its switch is missing`, C.on())) continue;
          const noise=Math.max(await ab(()=>{}), await ab(()=>{})), diff=await ab(C.alt), ctl=await ab(C.control);   // the same frame twice with nothing changed: the room's own repeat noise
          ok(`${tag}: ${C.name} changed ${diff} bytes of the picture (the same frame twice: ${noise})`, diff<=noise); ok(`${tag}: CONTROL for «${C.name}» changed nothing beyond the noise (${ctl} vs ${noise})`, ctl>Math.max(1000, noise*20));
          notes.push(`${tag}: ${C.name} — ${diff} bytes differ (the same frame twice: ${noise}; CONTROL ${ctl})`); } } }
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ try{ const r=R(); if(r && r.frameAllDbg) r.frameAllDbg(false); if(r && r.shadowAllDbg) r.shadowAllDbg(false); }catch(e){} try{ H.setSceneLight(false); await H.setSceneLevel(lv0==='full' ? 'full' : 'reduced'); }catch(e){}
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98663, night:true, drawn:true, slow:true, name:'PERF invisible', run:()=>checkPerfInvisible(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkPerfInvisible(); }
