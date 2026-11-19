/* RAIN-6b — «RAIN street» (drawn): in the rain room, live. (6) WHAT THE EYE SEES: with the cull on, no far light shown (depth beyond the house
   opposite) stands where the baked city is nearer — none through a house; CONTROL: with the cull off (cullDbg(false)) at least one far light IS behind a
   house (the founder's «hills' lights through the left row»: the check can fail). (8) THE SLEEP: held at 0.97 the windows go almost all dark and the
   street's density falls to its last step; back to none they light again. (1) THE BODIES: with the bodies on the life layer draws more than without
   (every car and tram has its body); off → as before. (2) THE TRAMS' RECORDING loaded into the street sound (or failing, said). Every switch restored
   in finally; every wait has an upper limit. */
import { row } from '../core/rows.js';

export async function checkRainStreet(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), R=()=>H.sceneRoomDbg(), st=()=>{ const r=R(); return r && r.state ? r.state() : null; };
  const until=async (f, ms)=>{ const lim=performance.now()+ms; while(performance.now()<lim){ if(await f()) return true; await wait(200); } return false; };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest');
    ok('the rain room did not draw', await until(()=>st() && st().frames>3, 60000)); if(!st()) return { cases:n, total:d.length, differences:d, notes };
    const r=R(); ok('the room has no cull / sleep / bodies switches', !!(r.cullDbg && r.sleepDbg && r.bodiesDbg && r.liveLightsDbg && r.hiddenDbg));
    /* (6) the cull */
    const through=()=>R().liveLightsDbg().filter(L=>L.kind===0 && L.depth>0.8 && R().hiddenDbg(L.x, L.y, L.depth, 0.03));
    if(st().baked){ R().cullDbg(true); await wait(800); const a=through(); ok(`with the cull on, ${a.length} far lights shine through a house`, a.length===0);
      R().cullDbg(false); await wait(800); const b=through(); ok(`CONTROL: with the cull off no far light is behind a house (${b.length}) — the check cannot fail`, b.length>0);
      R().cullDbg(true); await wait(600); const c=R().cullDbg(); notes.push(`far lights behind houses: ${b.length} without the cull, ${a.length} with it; culled in the last frames: ${c.culled}`); }
    else notes.push('the baked city is not here (the stand-in paints the law itself: nothing to cull)');
    /* (8) the sleep */
    { R().sleepDbg(null); await wait(1500); const lit0=R().litSumDbg(), dens0=st().density; R().sleepDbg(0.97); await wait(2500); const lit1=R().litSumDbg(), dens1=st().density;
      ok(`asleep the windows are still lit (${lit1.toFixed(2)} of ${lit0.toFixed(2)})`, lit0>0.5 && lit1<lit0*0.08); ok(`asleep the street is as busy (${dens1} vs ${dens0})`, dens1<dens0*0.25);
      R().sleepDbg(null); await wait(2500); const lit2=R().litSumDbg(); ok(`awake again the windows stay dark (${lit2.toFixed(2)})`, lit2>lit0*0.8); notes.push(`sleep: windows lit ${lit0.toFixed(1)} → ${lit1.toFixed(2)} at 0.97 → ${lit2.toFixed(1)} again; density ${dens0} → ${dens1}`); }
    /* (1) the bodies */
    { const drawn=()=>R().lifeDbg().n; R().bodiesDbg(true); let on=0, off=0, k=0; for(let i=0;i<20;i++){ R().bodiesDbg(true); await wait(250); on+=drawn(); R().bodiesDbg(false); await wait(250); off+=drawn(); k++; }
      R().bodiesDbg(true); ok(`the bodies add nothing to the life layer (${(on/k).toFixed(1)} vs ${(off/k).toFixed(1)} items)`, on>off); notes.push(`life items: ${(on/k).toFixed(1)} with the bodies (vehicles, the shutter, the awnings), ${(off/k).toFixed(1)} without`); }
    /* (2) the trams' recording */
    { const ok2=await until(async ()=>{ const L=await RS.natureLayersDbg(); return L && L.rec && (L.rec.trams==='on' || L.rec.trams==='failed' || L.rec.trams==='refused'); }, 20000), L=await RS.natureLayersDbg();
      ok(`the trams' recording is not in the street sound (${L && L.rec && L.rec.trams})`, ok2 && L.rec.trams==='on'); notes.push(`the street sound: trams ${L && L.rec && L.rec.trams}, tram voices now ${L && L.tramVoices}`); }
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ try{ const r=R(); if(r){ r.cullDbg && r.cullDbg(true); r.sleepDbg && r.sleepDbg(null); r.bodiesDbg && r.bodiesDbg(true); } }catch(e){}
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98661, night:true, drawn:true, name:'RAIN street', run:()=>checkRainStreet(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkRainStreet(); }
