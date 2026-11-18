/* RAIN-6 — «RAIN effects hand» (drawn): in the rain, through the REAL effect parameters the other hand moves (the Night chain's Echo amount and
   Warm ↔ Bright tilt; the shell publishes them each frame, the room eases them): at rest the room is exactly today's (the rain = the mood's, no
   streaks, the light [1, 1, 1], no rain-sound message); Echo full → a stronger rain on the glass, falling streaks, the rain's sound louder (the gains
   sent to the nature worklet, and the worklet holding them); warm → the light reddens, bright → it blues; back at rest → today's again.
   CONTROL: with the hand ignored (the room's fxDbg) Echo full changes nothing. Every parameter is restored in finally. */
import { row } from '../core/rows.js';

export async function checkRainFx(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), A=await import('../../../core/audio.js'), ST=await import('../../../core/state.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf();
  const inst=id=>A.fxInstance(ST.chainKeyOf('ld'), id), E=()=>inst('cecho'), T=()=>inst('ctone');
  const keep={ e:E() && E().params[0].cur, t:T() && T().params[1].cur };
  const set=(e, t)=>{ if(E()) E().params[0].setNorm(e); if(T()) T().params[1].setNorm(t); };
  const st=()=>{ const R=H.sceneRoomDbg(); return R && R.state ? R.state() : null; };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest');
    { const lim=performance.now()+60000; while(!(st() && st().frames>3) && performance.now()<lim) await wait(200); }
    ok('the rain room did not draw', !!st()); if(!st()) return { cases:n, total:d.length, differences:d, notes };
    ok('the Night chain has no Echo or Warm/Bright effect', !!E() && !!T());
    set(0, 0.5); await wait(3500);
    { const S=st(), f=S.fx; ok(`at rest the room is not today's: rain ${S.rainEff} vs the mood's ${S.rain}, streaks ${f.streak}, lamp ${f.lamp}, neon ${f.neon}`, S.rainEff===S.rain && f.streak===0 && f.lamp===0 && f.neon===1 && f.winExtra===0 && (!f.sound || (f.sound.near===1 && f.sound.far===1))); }
    set(1, 0.5); await wait(4000);
    { const S=st(), f=S.fx; ok(`Echo full: rain ${S.rainEff.toFixed(2)} (mood ${S.rain.toFixed(2)}), streaks ${f.streak.toFixed(2)}, sound ${JSON.stringify(f.sound)}`, S.rainEff>S.rain+0.2 && f.streak>0.6 && f.sound && f.sound.near>1.6);
      const L=await RS.natureLayersDbg();
      if(L) ok(`the nature worklet does not hold the rain's gains (${JSON.stringify(L.rk)})`, L.rk && L.rk.near>1.6); notes.push(`Echo full: rain ${S.rainEff.toFixed(2)} (the mood's ${S.rain.toFixed(2)}), streaks ${f.streak.toFixed(2)}, sound ×${f.sound.near.toFixed(2)} near / ×${f.sound.far.toFixed(2)} far${L ? ', the worklet holds ×'+L.rk.near.toFixed(2) : ''}`); }
    const h0=st().fx.honey;
    set(0, 0); await wait(4000); { const f=st().fx, h=f.honey; ok(`warm does not make the lights tungsten: lamp ${f.lamp}, neon ${f.neon}, window colour ${h} (was ${h0})`, f.lamp<-0.9 && f.neon<0.7 && h[2]/h[0]<h0[2]/h0[0]); notes.push(`warm: lamp ${f.lamp.toFixed(2)}, neon ×${f.neon.toFixed(2)}, window colour ${h.map(v=>v.toFixed(2))}`); }
    set(0, 1); await wait(4000); { const f=st().fx, h=f.honey; ok(`bright does not make LED lights: lamp ${f.lamp}, neon ${f.neon}, windows +${f.winExtra}, colour ${h}`, f.lamp>0.9 && f.neon>1.3 && f.winExtra>0.1 && h[2]/h[0]>h0[2]/h0[0]); notes.push(`bright: lamp ${f.lamp.toFixed(2)}, neon ×${f.neon.toFixed(2)}, +${f.winExtra.toFixed(2)} windows lit, colour ${h.map(v=>v.toFixed(2))}`); }
    set(0, 0.5); await wait(6000); { const S=st(), f=S.fx; ok(`back at rest the room is not today's again: rain ${S.rainEff} vs ${S.rain}, streaks ${f.streak}, lamp ${f.lamp}`, Math.abs(S.rainEff-S.rain)<0.01 && f.streak<0.01 && Math.abs(f.lamp)<0.01); }
    /* CONTROL: the hand ignored */
    H.sceneRoomDbg().fxDbg({ off:true }); set(1, 0); await wait(3500);
    { const S=st(), f=S.fx; ok('CONTROL: with the hand ignored Echo and Warm still changed the room — the check cannot fail', !(S.rainEff>S.rain+0.05 || f.streak>0.05 || Math.abs(f.lamp)>0.02)); notes.push(`CONTROL: hand ignored → rain ${S.rainEff.toFixed(2)} (mood ${S.rain.toFixed(2)}), streaks ${f.streak.toFixed(2)}, lamp ${f.lamp.toFixed(2)}`); }
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ try{ H.sceneRoomDbg().fxDbg({ off:false }); }catch(e){} if(E() && keep.e!=null) E().params[0].setNorm(keep.e); if(T() && keep.t!=null) T().params[1].setNorm(keep.t);
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98711, night:true, drawn:true, name:'RAIN effects hand', run:()=>checkRainFx(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkRainFx(); }
