/* RELEASE-1 (B) — «RELEASE-1 vehicles in 3D» (drawn): the founder saw the cars and the tram drive slightly sideways — flat sprites facing the screen on a road
   that runs slanted across it. Now low-poly bodies drawn through the camera's own law (rooms/rain/pure/vehmesh.js, rain-glass.js VEH_V). At Detailed and
   at Light, in the rain room:
   (1) THE DIRECTION ON SCREEN: every type (sedan, hatchback, estate, small car, taxi, small van, bus, the tram), planted near, sharp, its front half drawn
       red and its rear half green — its FOOTPRINT on the road alone (the flat shadow quad, symmetric about its axis; the probes' colouring): the line from the rear half's middle to the front half's middle runs along the road's own
       projected direction there (within 6°) — CONTROL RAIN-10's cinematic sprite of a real car on the street (vehMode 'sprite') is off by more;
   (2) PICTURE AND SOUND READ ONE LAW: at a held moment the vehicles drawn are exactly the traffic law's (the same x and nearer end, every car and tram) —
       CONTROL the same list moved 1 m is caught;
   (3) THE TRAM in 3D on the street when the law has one there;
   (4) THE FOCUS: a planted car far from the focus goes to a blur level (the levels' counts), near the focus to the sharp one. */
import { row } from '../core/rows.js';
export async function checkRelease1B(o={}){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), VM=await import('../../../apps/night/rooms/rain/pure/vehmesh.js'), V=await import('../../../apps/night/rooms/rain/pure/vehicles.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), R=()=>H.sceneRoomDbg(), st=()=>{ const r=R(); return r && r.state ? r.state() : null; };
  const frames=async (k, lim=20000)=>{ const f0=st() ? st().frames : 0, end=performance.now()+lim; while(performance.now()<end){ const s=st(); if(s && s.frames>=f0+k) return true; await wait(60); } return false; };
  const lvl0=H.sceneLevel(), light0=(()=>{ try{ return localStorage.getItem('handsong.nightLight')==='1'; }catch(e){ return false; } })();
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest');
    for(const L of (o.levels||['full', 'light'])){
      H.setSceneLight(L==='light'); await H.setSceneLevel(L==='full' ? 'full' : 'reduced');
      { const end=performance.now()+60000; while(!(st() && st().frames>3) && performance.now()<end) await wait(200); }
      if(!ok(`${L}: the rain room did not draw`, !!st())) continue;
      const Rm=R(), tag=L, S0=st(), lenOf=ty=>ty===7 ? VM.VEH3.tram.len : V.VEH.types[ty].len, hOf=ty=>ty===7 ? VM.VEH3.tram.h : V.VEH.types[ty].h;
      const focusOn=async dep=>{ for(let k=0;k<3;k++){ Rm.focusDbg(Math.min(1, dep/0.82)); await frames(2); } };
      /* the halves' middles (view units) in a region round a vehicle → the angle (°) between rear → front and the road's direction there */
      const judge=async (x, near, dir, ty)=>{ const len=lenOf(ty), zc=near+len/2, P=[[x-1.6, 0, near], [x+1.6, 0, near], [x-1.6, 0, near+len], [x+1.6, 0, near+len], [x, hOf(ty), near], [x, hOf(ty), near+len]].map(p=>Rm.projectDbg(p));
        if(P.some(p=>p.z<=1)) return null; const xs=P.map(p=>p.x), ys=P.map(p=>p.y), m=0.25*(Math.max(...ys)-Math.min(...ys)), reg=[Math.min(...xs)-m, Math.min(...ys)-m, Math.max(...xs)+m, Math.max(...ys)+m];
        await focusOn(Rm.depthOfDbg(Rm.projectDbg([x, 1, zc]).dist)); const Q=Rm.peekDbg(...reg); if(!Q) return null; const T2=st().tan, W=Q.w, Hh=Q.h, ux=(reg[2]-reg[0])/W, uy=(reg[3]-reg[1])/Hh; let rx=0, ry=0, rn=0, gx=0, gy=0, gn=0;
        for(let j=0;j<Hh;j++) for(let i=0;i<W;i++){ const k=(j*W+i)*4, r=Q.px[k], g=Q.px[k+1], b=Q.px[k+2], vx=reg[0]+(i+0.5)*ux, vy=reg[1]+(j+0.5)*uy; if(r>190 && g<70 && b<70){ rx+=vx; ry+=vy; rn++; } else if(g>190 && r<80 && b<80){ gx+=vx; gy+=vy; gn++; } }
        if(rn<8 || gn<8) return { miss:`${rn} red, ${gn} green px` }; const a=Rm.projectDbg([x, 0.8, zc]), b=Rm.projectDbg([x, 0.8, zc+dir]), u=[b.x-a.x, b.y-a.y], v=[rx/rn-gx/gn, ry/rn-gy/gn];
        const ang=Math.acos(Math.max(-1, Math.min(1, (u[0]*v[0]+u[1]*v[1])/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI, tilt=Math.atan2(Math.abs(u[0]), Math.abs(u[1]))*180/Math.PI; return { ang, tilt, rn, gn }; };
      Rm.trafficHoldDbg(700); Rm.lifeHoldDbg(700); Rm.vehDbg({ mode:'mesh', halves:true });
      /* (1) every type planted near, off the screen's middle (the road slanted there) */
      const spot=ty=>ty===7 ? [9.65, 30, -1] : ty%2 ? [2.6, 34, 1] : [2.6, 33, -1], seen=[];   /* on the screen's lower part, the road slanted there */
      for(let ty=0;ty<8;ty++){ const [x, near, dir]=spot(ty); Rm.vehDbg({ plant:[{ ty, x, near, dir, paint:1 }] }); await frames(2); const J=await judge(x, near, dir, ty);
        if(!ok(`${tag}: type ${ty} not measured (${J ? J.miss : 'off the screen'})`, J && J.ang!=null)) continue; seen.push(`${ty}: ${J.ang.toFixed(1)}° (road ${J.tilt.toFixed(0)}° off vertical)`);
        ok(`${tag}: type ${ty} drives ${J.ang.toFixed(1)}° off the road's direction on screen`, J.ang<=6); }
      Rm.vehDbg({ plant:null });
      notes.push(`${tag}: each type's rear → front against the road on screen: ${seen.join(', ')}`);
      /* the CONTROL: a real car on the street, as RAIN-10's sprite, and the same car in 3D */
      { const c=Rm.carAtDbg(300, 4000, 32, 48); if(ok(`${tag}: no car found near the window`, !!c)){ Rm.trafficHoldDbg(c.t); Rm.lifeHoldDbg(c.t); await frames(2);
          const M=await judge(c.x, c.z, c.dir, c.ty); Rm.vehDbg({ mode:'sprite' }); await frames(3); const Sp=await judge(c.x, c.z, c.dir, c.ty); Rm.vehDbg({ mode:'mesh' }); await frames(2);
          if(ok(`${tag}: the street's car not measured (${M && M.miss}, ${Sp && Sp.miss})`, M && M.ang!=null && Sp && Sp.ang!=null)){
            ok(`${tag}: the street's car in 3D drives ${M.ang.toFixed(1)}° off the road`, M.ang<=6); ok(`${tag}: CONTROL RAIN-10's sprite of it passed (${Sp.ang.toFixed(1)}°, the road ${Sp.tilt.toFixed(0)}° off vertical)`, Sp.ang>6);
            notes.push(`${tag}: a car on the street at z ${c.z.toFixed(1)}: in 3D ${M.ang.toFixed(1)}° off the road, RAIN-10's sprite ${Sp.ang.toFixed(1)}° (the CONTROL)`); } } }
      Rm.vehDbg({ halves:false });
      /* (2) one law: what is drawn = the law's vehicles */
      { const D=Rm.vehDbg(), law=D.law, list=D.list, same=(Ls, sh)=>law.length===Ls.length && law.every(c=>Ls.some(q=>Math.abs(q.x-c.x)<1e-6 && Math.abs(q.near+sh-c.near)<1e-6 && (q.ty===7)===(c.kind==='tram')));
        ok(`${tag}: the vehicles drawn are not the law's (${list.length} drawn, ${law.length} in the law)`, law.length>0 && same(list, 0)); ok(`${tag}: CONTROL the list moved 1 m passed`, !same(list, 1)); notes.push(`${tag}: ${list.length} vehicles drawn = the law's ${law.length}`); }
      /* (3) the tram */
      { const q=Rm.tramAtDbg(400, 4000, 20, 90); if(ok(`${tag}: no tram found on the street`, !!q)){ Rm.trafficHoldDbg(q.t); Rm.lifeHoldDbg(q.t); await frames(3); ok(`${tag}: the tram is not drawn in 3D`, Rm.vehDbg().types[7]>=1); } }
      /* (4) the focus: sharp near the focus, a blur level far from it */
      { Rm.vehDbg({ plant:[{ ty:0, x:2.6, near:20, dir:-1 }] }); await focusOn(Rm.depthOfDbg(Rm.projectDbg([2.6, 1, 22]).dist)); const A=Rm.vehDbg().levels.slice(); Rm.focusDbg(0.02); await frames(2); Rm.focusDbg(0.02); await frames(2); const B=Rm.vehDbg().levels.slice(); Rm.vehDbg({ plant:null });
        ok(`${tag}: a car at the focus is not sharp (levels ${A.join(' ')})`, A[0]>=1); ok(`${tag}: a car far from the focus is not blurred (levels ${B.join(' ')})`, B[1]+B[2]+B[3]>=1 && B[0]===0); notes.push(`${tag}: levels at the focus ${A.join(' ')}, far from it ${B.join(' ')}`); }
      Rm.trafficHoldDbg(null); Rm.lifeHoldDbg(null); }
  } catch(e){ ok('the row threw: '+String(e && e.stack || e).slice(0, 300), false); }
  finally{ try{ const Rm=R(); if(Rm){ Rm.vehDbg({ mode:'mesh', halves:false, plant:null }); Rm.trafficHoldDbg(null); Rm.lifeHoldDbg(null); } }catch(e){} H.setSceneLight(light0); await H.setSceneLevel(lvl0).catch(()=>{}); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98762, night:true, name:'RELEASE-1 vehicles in 3D', drawn:true, run:()=>checkRelease1B(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
