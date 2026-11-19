/* RAIN-10 — «RAIN-10 people, cars and the tram» (drawn): the founder saw people float, look alike, a dark square fly along the street, cars as boxes,
   people through the trunks and crowns. At each quality — Detailed, Standard, Light — the rain room is opened and its own pixel scale read; then:
   - the room's life shader (rooms/rain/rain-glass.js) on a sheet at that scale (tools/probes/night/rainsheet.js), people at 20 m and 45 m:
     (1) THE FEET are drawn (alpha ≥ 128 in the lowest 5 % of a walker, 20 m and 32 m) — CONTROL RAIN-9's quad and window (uWin 2) erases them;
     (2) THE GAIT shows: the legs at phase 0.25 and 0.75 differ in ≥ 12 px — CONTROL the same phase twice (only the facing bit) differs in fewer;
     (3) THE UMBRELLA'S DOME is drawn whole (its upper half opaque, alpha > 200: ≥ 20 px at 20 m, 8 at 32 m) — CONTROL RAIN-9's window leaves less than half of it opaque;
     (4) THE CLOTHES on screen: Evening's walkers (the law's own codes) come out as ≥ 6 distinct colours — CONTROL everyone in one colour: 1;
     (5) NO QUAD SHOWS: every kind of item at three focus blurs, the quad's last pixel all round at most 2 / 255 alpha — CONTROL the
         alpha forced to 1 (an opaque quad) is caught;
     (6) A CAR IS NOT A BOX: its outline narrows with distance and rounds at its far end — its width at 85 % of its height under 92 % of its width at 25 % —
         CONTROL RAIN-9's box (code + 4096) keeps ≥ 95 %;
     (7) THE HEADLIGHTS' POOL reaches 0 inside its quad (ring ≤ 2 / 255) — CONTROL RAIN-8's cut pool (uWin 2) shows its box;
   - in the room itself: (8) A PERSON BEHIND A TREE is hidden — planted where the baked depth says a trunk or crown covers the whole figure, every 10 cm of it (the CPU cull off, so the shader's own test is judged), the
     view's picture there is the picture without them (pixels changed by > 24 / 255: at most 2 more than between two frames without them) — CONTROL the depth test off: > 10 more;
     (9) a tram on the street is drawn as a lit box (its faces counted). */
import { row } from '../core/rows.js';
import { lifeSheet, sheetRenderer, sheetDone } from './rainsheet.js';

export async function checkRain10(o={}){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), LF=await import('../../../apps/night/rooms/rain/pure/life.js'), CT=await import('../../../apps/night/rooms/rain/pure/city.js');
  const wait=ms=>new Promise(r=>setTimeout(r, ms)), R=()=>H.sceneRoomDbg(), st=()=>{ const r=R(); return r && r.state ? r.state() : null; };
  const was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf(), lvl0=H.sceneLevel(), light0=(()=>{ try{ return localStorage.getItem('handsong.nightLight')==='1'; }catch(e){ return false; } })();
  const frames=async (k, lim=20000)=>{ const f0=st() ? st().frames : 0, end=performance.now()+lim; while(performance.now()<end){ const s=st(); if(s && s.frames>=f0+k) return true; await wait(60); } return false; };
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true }); await H.setBackground('forest');
    for(const L of (o.levels||['full', 'reduced', 'light'])){
      H.setSceneLight(L==='light'); await H.setSceneLevel(L==='full' ? 'full' : 'reduced');
      { const end=performance.now()+60000; while(!(st() && st().frames>3) && performance.now()<end) await wait(200); }
      if(!ok(`${L}: the rain room did not draw`, !!st())) continue;
      const S0=st(), uPx=S0.buffer[1]/(2*S0.tan[1]), Wp=1024, Hp=512, tan=[Wp/2/uPx, Hp/2/uPx], sheet=(items, x={})=>lifeSheet(items, { W:Wp, H:Hp, tan, foc:x.foc||[0.5, 4, 0.012, 0.02], win:x.win, alphaOff:x.alphaOff });
      const A=(S, x, y)=>{ const X=Math.round((x/tan[0]+1)/2*Wp), Y=Math.round((y/tan[1]+1)/2*Hp); return X<0 || Y<0 || X>=Wp || Y>=Hp ? 0 : S.px[(Y*Wp+X)*4+3]; };
      const region=(S, x0, x1, y0, y1, f)=>{ const step=0.5/uPx; for(let y=y0;y<=y1;y+=step) for(let x=x0;x<=x1;x+=step) f(A(S, x, y), x, y); };
      const tag=`${L} (${uPx.toFixed(0)} px per unit)`;
      /* (1)–(3): walkers at 20 m and 45 m; the sheet's y from −tan[1] */
      const pers=(z, ph, c, x)=>{ const hh=1.75*1.15/(2*z), hw=0.75/(2*z); return { x, y:-tan[1]*0.8, hh, hw, k:0, ph, c, dep:0.5 }; };
      for(const z of [20, 32]){ const P0=pers(z, 0.25, 3+8*4, -tan[0]*0.5), P1=pers(z, 0.75, 3+8*4, 0), P2=pers(z, 0.25+1, 3+8*4, tan[0]*0.5), U=pers(z, 0.1, 2+8*1+64*1, -tan[0]*0.5);
        const run=async win=>{ const S=await sheet([P0, P1, P2], { win }), Su=await sheet([U], { win }); let feet=0, diff=0, same=0, dome=0; const hp=P0.hh*2/1.15;
          region(S, P0.x-P0.hw, P0.x+P0.hw, P0.y+0.5/uPx, P0.y+0.05*hp, a=>{ feet=Math.max(feet, a); });
          region(S, P0.x-P0.hw, P0.x+P0.hw, P0.y, P0.y+0.35*hp, (a, x, y)=>{ const b=A(S, x-P0.x+P1.x, y), c=A(S, x-P0.x+P2.x, y); if(Math.abs(a-b)>64) diff++; if(Math.abs(a-c)>64) same++; });
          region(Su, U.x-U.hw*1.4, U.x+U.hw*1.4, U.y+1.0*U.hh*2/1.15, U.y+1.07*U.hh*2/1.15, a=>{ if(a>200) dome++; }); return { feet, diff, same, dome }; };
        const G=await run(1), C=await run(2);
        ok(`${tag}, ${z} m: the feet are not drawn (alpha ${G.feet})`, G.feet>=128); ok(`${tag}, ${z} m: CONTROL RAIN-9's window keeps the feet (alpha ${C.feet})`, C.feet<128);
        ok(`${tag}, ${z} m: the legs do not move between steps (${G.diff} px differ)`, G.diff>=12); ok(`${tag}, ${z} m: CONTROL the same phase twice differs (${G.same} px)`, G.same<12);
        ok(`${tag}, ${z} m: the umbrella's dome is missing (${G.dome} px)`, G.dome>=(z<25 ? 20 : 8)); ok(`${tag}, ${z} m: CONTROL RAIN-9's window keeps the dome (${C.dome} of ${G.dome} px)`, C.dome<G.dome/2);
        if(z===20) notes.push(`${tag}: at 20 m the feet alpha ${G.feet} (RAIN-9's window: ${C.feet}), the legs differ in ${G.diff} px between steps, the dome ${G.dome} px (RAIN-9's window: ${C.dome})`); }
      /* (4) the clothes on screen */
      { const W=LF.lifeAt(10, 'evening').filter(q=>[LF.LK.walk, LF.LK.old].includes(q.kind)).slice(0, 14), z=18, hh=1.75*1.15/(2*z), hw=0.75/(2*z);
        const colours=async one=>{ const items=W.map((q, i)=>({ x:-tan[0]*0.92+i*(tan[0]*1.84/(W.length-1)), y:-tan[1]*0.8, hh, hw, k:0, ph:0.2, c: one ? 3+8*0 : q.c, dep:0.5 })), S=await sheet(items), out=[];
          for(const it of items){ let r=0, g=0, b=0, m=0; region(S, it.x-it.hw*1.3, it.x+it.hw*1.3, it.y+0.1*hh, it.y+1.9*hh, (a, x, y)=>{ if(a<200) return; const X=Math.round((x/tan[0]+1)/2*Wp), Y=Math.round((y/tan[1]+1)/2*Hp), k=(Y*Wp+X)*4; r+=S.px[k]/a; g+=S.px[k+1]/a; b+=S.px[k+2]/a; m++; }); if(m) out.push([r/m, g/m, b/m]); }
          const cl=[]; for(const c of out) if(!cl.some(k=>Math.hypot(k[0]-c[0], k[1]-c[1], k[2]-c[2])<0.035)) cl.push(c); return { n:cl.length, of:out.length }; };
        const Cn=await colours(false), C1=await colours(true);
        ok(`${tag}: the walkers look alike on screen (${Cn.n} distinct colours of ${Cn.of})`, Cn.n>=6); ok(`${tag}: CONTROL everyone in one colour shows ${C1.n} colours`, C1.n<=2);
        notes.push(`${tag}: ${Cn.n} distinct colours among ${Cn.of} Evening walkers on screen (CONTROL one colour: ${C1.n})`); }
      /* (5) no quad shows: every kind, three blurs */
      { const items=[], quads=[], cols=12; let i=0; for(let k=0;k<=28;k++){ if(k===25 || k===13) continue;   /* 13 (the tram's heads) and 25 (its carriages) retired at RAIN-10 */ for(const dep of [0.5, 0.7, 0.95]){ const hh=0.03*tan[1]*(k===24 ? 1.4 : 1), hw=hh*(k===24 ? 0.7 : k===9 || k===7 || k===20 ? 1 : k>=26 ? 1.2 : 0.45);   /* a sign as the room draws it: as wide as high */
          const cx=-tan[0]*0.94+(i%cols)*(tan[0]*1.88/(cols-1)), cy=-tan[1]*0.94+Math.floor(i/cols)*(tan[1]*0.27); items.push({ x:cx, y:cy, hh, hw, k:k===27 ? 27.9 : k, ph:0.4+(k===24 ? 3 : k>=27 ? 8 : 0), c:k===24 ? 2+8*3 : 3+8*(k%4)+64+256*(k%8), dep });
          const R2=0.012*Math.min(1, Math.max(0, Math.abs(dep-0.5)-0.02)*4), soft=Math.max(R2+0.8/uPx, 0.04*hh), pad=soft+2.2/uPx, padX=Math.max(soft, soft*hw/(2*hh))+2.2/uPx, ex= (k<=2 || (k>=14 && k<=18)) ? [1.45, 1.3] : k===20 ? [1.3, 1] : [1, 1];
          quads.push([cx-(hw*ex[0]+padX), cx+(hw*ex[0]+padX), cy-pad, cy+2*hh*ex[1]+pad]); i++; } }
        const ring=S=>{ let worst=0, at=-1; quads.forEach(([x0, x1, y0, y1], j)=>{ const X=x=>Math.round((x/tan[0]+1)/2*Wp), Y=y=>Math.round((y/tan[1]+1)/2*Hp), a=X(x0)+1, b=X(x1)-2, c=Y(y0)+1, e=Y(y1)-2; if(b-a<3 || e-c<3) return;   /* the quad's own last pixel: where a cut would show */
          const look=(x, y)=>{ if(x<0 || y<0 || x>=Wp || y>=Hp) return; const v=S.px[(y*Wp+x)*4+3]; if(v>worst){ worst=v; at=j; } }; for(let x=a;x<=b;x++){ look(x, c); look(x, e); } for(let y=c;y<=e;y++){ look(a, y); look(b, y); } }); return { worst, at }; };
        const G=ring(await sheet(items)), C=ring(await sheet(items, { alphaOff:true }));
        ok(`${tag}: a quad edge shows (alpha ${G.worst} on kind ${G.at>=0 ? items[G.at].k : '-'})`, G.worst<=2); ok(`${tag}: CONTROL an opaque quad passed (${C.worst})`, C.worst>8);
        notes.push(`${tag}: the border ring of ${items.length} items at most ${G.worst} / 255 (CONTROL opaque: ${C.worst})`); }
      /* (6) a car is not a box */
      { const hh=0.06*tan[1], hw=hh*0.62, car=c=>({ x:0, y:-tan[1]*0.5, hh, hw, k:24, ph:3.4, c, dep:0.5 }), box=async c=>{ const S=await sheet([car(c)]), wAt=py=>{ let w=0; for(let x=-hw*1.3;x<=hw*1.3;x+=0.5/uPx) if(A(S, x, -tan[1]*0.5+py*2*hh)>128) w+=0.5/uPx; return w; }; return wAt(0.85)/Math.max(1e-9, wAt(0.25)); };
        let worst=0; for(const ty of [0, 1, 2, 3, 4, 5]) worst=Math.max(worst, await box(ty+8*3)); const C=await box(4096+0+8*3);
        ok(`${tag}: a car is drawn as a box (far width ${(worst*100).toFixed(0)} % of near)`, worst<0.92); ok(`${tag}: CONTROL RAIN-9's box passed (${(C*100).toFixed(0)} %)`, C>=0.95);
        notes.push(`${tag}: a car's far width at most ${(worst*100).toFixed(0)} % of its near width (RAIN-9's box: ${(C*100).toFixed(0)} %)`); }
      /* (7) the headlights' pool */
      { const T=await H.loadThree(), G2=await import('../../../apps/night/rooms/rain/rain-glass.js'), { r }=sheetRenderer(T, Wp, Hp);
        try{ const P=[[0.02, 0.01, 0.5], [0.03, 0.012, 0.8], [0.05, 0.02, 0.95]], g=new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3)); g.setIndex([0,1,2, 0,2,3]);
          const RA=new Float32Array(12), CA=new Float32Array(12), DK=new Float32Array(6), box=[]; P.forEach(([hx, hy, dep], j)=>{ const cx=-tan[0]*0.6+j*tan[0]*0.6; RA.set([cx, 0, hx*tan[1]*4, hy*tan[1]*4], j*4); CA.set([1, 0.95, 0.85, 1.6], j*4); DK.set([dep, 4], j*2);
            const R2=0.04*Math.min(1, Math.max(0, Math.abs(dep-0.5)-0.02)*4), rad=R2+0.35/uPx; box.push([cx-(hx*tan[1]*4+rad), cx+(hx*tan[1]*4+rad), -(hy*tan[1]*4+rad), hy*tan[1]*4+rad]); });
          g.setAttribute('aRect', new T.InstancedBufferAttribute(RA, 4)); g.setAttribute('aCol', new T.InstancedBufferAttribute(CA, 4)); g.setAttribute('aDK', new T.InstancedBufferAttribute(DK, 2)); g.instanceCount=3;
          const m=new T.ShaderMaterial({ uniforms:{ uTan:{ value:new T.Vector2(tan[0], tan[1]) }, uFoc:{ value:new T.Vector4(0.5, 4, 0.04, 0.02) }, uPx:{ value:uPx }, uWin:{ value:1 }, uLamp:{ value:0 }, uTime:{ value:0 }, uRainK:{ value:0 } }, vertexShader:G2.LIGHT_V, fragmentShader:G2.LIGHT_F, transparent:true, depthTest:false, depthWrite:false, blending:T.AdditiveBlending });
          const mesh=new T.Mesh(g, m); mesh.frustumCulled=false; const sc=new T.Scene(); sc.add(mesh); const cam=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          const ringL=w=>{ m.uniforms.uWin.value=w; r.setClearColor(0, 1); r.clear(); r.render(sc, cam); const gl=r.getContext(), px=new Uint8Array(Wp*Hp*4); gl.readPixels(0, 0, Wp, Hp, gl.RGBA, gl.UNSIGNED_BYTE, px); let worst=0;
            box.forEach(([x0, x1, y0, y1])=>{ const X=x=>Math.round((x/tan[0]+1)/2*Wp), Y=y=>Math.round((y/tan[1]+1)/2*Hp), a=X(x0)+1, b=X(x1)-2, c=Y(y0)+1, e=Y(y1)-2; if(b-a<3 || e-c<3) return;
              const look=(x, y)=>{ if(x<0 || y<0 || x>=Wp || y>=Hp) return; const k=(y*Wp+x)*4; worst=Math.max(worst, px[k], px[k+1], px[k+2]); }; for(let x=a;x<=b;x++){ look(x, c); look(x, e); } for(let y=c;y<=e;y++){ look(a, y); look(b, y); } }); return worst; };
          const Gp=ringL(1), Cp=ringL(2); ok(`${tag}: the headlights' pool shows its box (${Gp} / 255)`, Gp<=2); ok(`${tag}: CONTROL RAIN-8's cut pool passed (${Cp})`, Cp>2); notes.push(`${tag}: the headlights' pool border at most ${Gp} / 255 (RAIN-8's: ${Cp})`);
          g.dispose(); m.dispose(); } finally { r.setClearColor(0, 0); sheetDone(); } }
      /* (8) a person behind a tree, in the room */
      { const Rm=R(), tw=S0.tan[0]*0.85, th=S0.tan[1]*0.85; let best=null; for(let x=13.8;x<=18.6;x+=0.4) for(let z=24;z<=90;z+=1){ const f=CT.project([x, 0.25, z]), m=CT.project([x, 1.0, z]), h=CT.project([x, 1.7, z]); if(f.z<=1 || Math.abs(f.x)>tw || f.y<-th || h.y>th) continue;   /* on the screen */ const dp=CT.depthOf(f.dist);
          const G=[]; for(let gx=-0.5;gx<=0.5;gx+=0.1) for(let gy=0;gy<=2.0;gy+=0.1) G.push(CT.project([x+gx, gy, z]));   /* every 10 cm of the figure: no gap in the leaves */
          if(G.every(q=>Rm.bakedAtDbg(q.x, q.y)<dp-0.06) && (!best || h.y-f.y>best.hgt)) best={ x, z, f, h, hgt:h.y-f.y }; }
        if(ok(`${tag}: no place found where a tree covers a whole person (the bake?)`, !!best)){
          const hw=0.75/best.f.z, reg=[best.f.x-hw*1.6, best.f.y-0.002, best.f.x+hw*1.6, best.h.y+(best.h.y-best.f.y)*0.3];
          Rm.trafficHoldDbg(700); Rm.lifeHoldDbg(700); Rm.lifeExtraDbg(null); Rm.occlDbg(true); await frames(3);
          const peek=()=>Rm.peekDbg(...reg), F0=Rm.focusDbg(), foc=async()=>{ Rm.focusDbg(0.61); await frames(2); }, diff=(a, b)=>{ let c=0; for(let k=0;k<a.px.length;k+=4) if(Math.max(Math.abs(a.px[k]-b.px[k]), Math.abs(a.px[k+1]-b.px[k+1]), Math.abs(a.px[k+2]-b.px[k+2]))>24) c++; return c; };   /* pixels changed by more than 24 / 255 (the crowns sway: their edges change a few) */
          await foc(); const A1=peek(); await foc(); const A2=peek(); const P={ kind:0, x:best.x, y:0, z:best.z, h:1.75, w:0.75, ph:0.25, c:1+8*4, a:1, lane:'probe' };   /* a hood: the figure alone, wholly behind */
          Rm.cullDbg(false); Rm.lifeExtraDbg([P]); await frames(1); await foc(); const B=peek(); Rm.occlDbg(false); await frames(1); await foc(); const C=peek(); Rm.focusDbg(F0); Rm.occlDbg(true); Rm.lifeExtraDbg(null); Rm.cullDbg(true);
          const noise=diff(A1, A2), hid=diff(A1, B), shown=diff(A1, C);
          ok(`${tag}: a person behind a tree shows through it (${hid} px changed vs ${noise} between two frames without them)`, hid<=noise+2); ok(`${tag}: CONTROL the depth test off still hides them (${shown} px vs ${noise})`, shown>noise+10);
          notes.push(`${tag}: a person behind the tree at x ${best.x.toFixed(1)}, z ${best.z}: ${hid} px changed (two frames without them: ${noise}); with the depth test off ${shown} px`); } }
      /* (9) the tram as a lit box */
      { const Rm=R(), q=Rm.tramAtDbg(400, 3000, 30, 110); if(ok(`${tag}: no tram found on the street`, !!q)){ Rm.trafficHoldDbg(q.t); await frames(3); const T=Rm.tramDbg(); ok(`${tag}: the tram is not drawn as a box (${T.quads} faces)`, T.quads>=6); } }
      R().trafficHoldDbg(null); R().lifeHoldDbg(null); }
  } finally { sheetDone(); try{ const Rm=R(); if(Rm){ Rm.lifeExtraDbg(null); Rm.lifeHoldDbg(null); Rm.trafficHoldDbg(null); Rm.occlDbg(true); Rm.cullDbg(true); } }catch(e){} H.setSceneLight(light0); await H.setSceneLevel(lvl0);
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98712, night:true, name:'RAIN-10 people, cars and the tram', drawn:true, run:()=>checkRain10(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
