/* RELEASE-1 — «RELEASE-1 windows seen sharp and soft» (drawn): the founder lit a window with a note and saw nothing in focus (its room hidden by the
   angle) yet a glow when the picture went soft. In the rain room (Detailed), windows chosen apart on the screen — six whose light the bake shows
   (vis ≥ 0.7) and six it hides (vis ≤ 0.15, pure/windows.js winVisOf) — lit alone; each window's light (the picture with the windows minus without,
   luminance summed round it) in focus and soft: a hidden window's share against the seen ones' is alike both ways — soft at most twice and at least half
   its share in focus (and under 0.4 of theirs) — CONTROL the old full glow (uVisOff) is caught. */
import { row } from '../core/rows.js';
export async function checkRelease1W(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), R=()=>H.sceneRoomDbg(), st=()=>{ const r=R(); return r && r.state ? r.state() : null; };
  const frames=async (k, lim=20000)=>{ const f0=st() ? st().frames : 0, end=performance.now()+lim; while(performance.now()<end){ const s=st(); if(s && s.frames>=f0+k) return true; await wait(60); } return false; };
  const was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), lvl0=H.sceneLevel(), light0=(()=>{ try{ return localStorage.getItem('handsong.nightLight')==='1'; }catch(e){ return false; } })();
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest'); H.setSceneLight(false); await H.setSceneLevel('full');
    { const end=performance.now()+60000; while(!(st() && st().frames>3) && performance.now()<end) await wait(200); }
    if(!ok('the rain room did not draw', !!st())) return { cases:n, total:d.length, differences:d, notes };
    const Rm=R(), T=st().tan, W=Rm.windowsDbg(), V=Rm.winVisDbg().vis, inView=w=>Math.abs(w.x)+w.hw*3<T[0]*0.95 && Math.abs(w.y)+w.hh*3<T[1]*0.95;
    const pick=(test)=>{ const out=[]; for(let i=0;i<W.length;i++){ if(!test(V[i]) || !inView(W[i])) continue; if(out.some(j=>Math.hypot(W[j].x-W[i].x, W[j].y-W[i].y)<0.12)) continue; out.push(i); if(out.length>=6) break; } return out; };
    const seen=pick(v=>v>=0.7), hid=pick(v=>v<=0.15), all=seen.concat(hid);
    if(!ok(`not enough windows to judge (${seen.length} seen, ${hid.length} hidden on this screen)`, seen.length>=3 && hid.length>=3)) return { cases:n, total:d.length, differences:d, notes };
    const litArr=W.map((_, i)=>all.includes(i) ? 1 : 0); Rm.winVisDbg({ lit:litArr }); Rm.trafficHoldDbg(600); Rm.lifeHoldDbg(600);
    const peek=()=>Rm.peekDbg(-T[0], -T[1], T[0], T[1]);
    const energies=async focus=>{ for(let k=0;k<3;k++){ Rm.focusDbg(focus); await frames(2); } Rm.winsShowDbg(true); Rm.focusDbg(focus); await frames(2); const A=peek(); Rm.winsShowDbg(false); Rm.focusDbg(focus); await frames(2); const B=peek(); Rm.winsShowDbg(true);
      const Wp=A.w, Hp=A.h, X=x=>Math.round((x/T[0]*0.5+0.5)*Wp), Y=y=>Math.round((y/T[1]*0.5+0.5)*Hp);
      return all.map(i=>{ const w=W[i], r=0.05; let e=0; for(let y=Math.max(0, Y(w.y-w.hh-r));y<Math.min(Hp, Y(w.y+w.hh+r));y++) for(let x=Math.max(0, X(w.x-w.hw-r));x<Math.min(Wp, X(w.x+w.hw+r));x++){ const k=(y*Wp+x)*4; e+=Math.max(0, (0.3*A.px[k]+0.5*A.px[k+1]+0.2*A.px[k+2])-(0.3*B.px[k]+0.5*B.px[k+1]+0.2*B.px[k+2])); } return e; }); };
    const judge=async ()=>{ const S=await energies(0.9), B=await energies(0.0), mean=(L, idx)=>idx.reduce((a, i)=>a+L[all.indexOf(i)], 0)/idx.length;
      const sharpR=mean(S, hid)/Math.max(1e-6, mean(S, seen)), softR=mean(B, hid)/Math.max(1e-6, mean(B, seen)); return { sharpR, softR }; };
    const G=await judge(); Rm.winVisDbg({ off:true }); const C=await judge(); Rm.winVisDbg({ off:false });
    ok(`a hidden window's light differs soft and in focus: ${G.softR.toFixed(2)} of a seen one's soft, ${G.sharpR.toFixed(2)} in focus`, G.softR<=0.4 && G.softR<=2*G.sharpR+0.05 && G.softR>=0.5*G.sharpR-0.05);   /* alike both ways: never a glow that focus does not show, never a lit reveal that vanishes soft */
    ok(`CONTROL: the old full glow passed (soft ${C.softR.toFixed(2)}, in focus ${C.sharpR.toFixed(2)})`, !(C.softR<=0.4 && C.softR<=2*C.sharpR+0.05));
    notes.push(`${seen.length} seen and ${hid.length} hidden windows lit alone: a hidden one's light ${G.sharpR.toFixed(2)} of a seen one's in focus, ${G.softR.toFixed(2)} soft (the old full glow: ${C.softR.toFixed(2)})`);
  } catch(e){ ok('the row threw: '+String(e && e.stack || e).slice(0, 300), false); }
  finally{ try{ const Rm=R(); if(Rm){ Rm.winVisDbg({ off:false, lit:null }); Rm.winsShowDbg(true); Rm.trafficHoldDbg(null); Rm.lifeHoldDbg(null); } }catch(e){} H.setSceneLight(light0); await H.setSceneLevel(lvl0).catch(()=>{});
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98812, night:true, name:'RELEASE-1 windows seen sharp and soft', drawn:true, run:()=>checkRelease1W(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
