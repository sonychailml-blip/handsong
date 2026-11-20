/* RAIN-10 — «RAIN-10 people, cars and the tram» (drawn): the founder saw people float, look alike, a dark square fly along the street, cars as boxes,
   people through the trunks and crowns. At each quality — Detailed, Standard, Light — the rain room is opened and its own pixel scale read; then:
   - the room's life shader (rooms/rain/rain-glass.js) on a sheet at that scale (tools/probes/night/rainsheet.js), people at 20 m and 45 m:
     (1) THE FEET are drawn (alpha ≥ 128 in the lowest 5 % of a walker, 20 m and 32 m) — CONTROL RAIN-9's quad and window (uWin 2) erases them;
     (2) THE GAIT shows: the legs at phase 0.25 and 0.75 differ in ≥ 12 px — CONTROL the same phase twice (only the facing bit) differs in fewer;
     (3) THE UMBRELLA'S DOME is drawn whole (its upper half opaque, alpha > 200: ≥ 20 px at 20 m, 8 at 32 m) — CONTROL RAIN-9's window leaves less than half of it opaque;
     (4) THE CLOTHES on screen: Evening's walkers (the law's own codes) come out as ≥ 6 distinct colours — CONTROL everyone in one colour: 1;
     (4b) RELEASE-1: within one figure the coat and the trousers differ on screen — CONTROL one colour per figure;
     (4c) RELEASE-1: seen from above — the feet step along the street, the dog walks ahead, the umbrella an oval from above — CONTROLS the flat views;
     (5) NO QUAD SHOWS: every kind of item at three focus blurs, the quad's last pixel all round at most 2 / 255 alpha — CONTROL the
         alpha forced to 1 (an opaque quad) is caught;
     (6) A CAR IS NOT A BOX: its outline narrows with distance and rounds at its far end — its width at 85 % of its height under 92 % of its width at 25 % —
         CONTROL RAIN-9's box (code + 4096) keeps ≥ 95 %;
     (7) THE HEADLIGHTS' POOL reaches 0 inside its quad (ring ≤ 2 / 255) — CONTROL RAIN-8's cut pool (uWin 2) shows its box;
   - in the room itself: (8) RELEASE-1: A PERSON UNDER THE CROWNS shows through the gaps and not through the leaves (see the block). RAIN-10's version: planted where the baked depth says a trunk or crown covers the whole figure, every 10 cm of it (the CPU cull off, so the shader's own test is judged), the
     view's picture there is the picture without them (pixels changed by > 24 / 255: at most 2 more than between two frames without them) — CONTROL the depth test off: > 10 more;
     (9) a tram on the street is drawn as a 3D body (RELEASE-1 (B); it was RAIN-10's lit box). */
import { row } from '../core/rows.js';
import { lifeSheet, sheetRenderer, sheetDone } from './rainsheet.js';

export async function checkRain10(o={}){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), LF=await import('../../../apps/night/rooms/rain/pure/life.js'), CT=await import('../../../apps/night/rooms/rain/pure/city.js'), GL=await import('../../../apps/night/rooms/rain/rain-glass.js');
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
      const S0=st(), uPx=S0.buffer[1]/(2*S0.tan[1]), Wp=1024, Hp=512, tan=[Wp/2/uPx, Hp/2/uPx], sheet=(items, x={})=>lifeSheet(items, { W:Wp, H:Hp, tan, foc:x.foc||[0.5, 4, 0.012, 0.02], win:x.win, alphaOff:x.alphaOff, oneCol:x.oneCol });
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
      /* (4b) RELEASE-1 (A): WITHIN ONE FIGURE the parts differ on screen — Evening's walkers (their own look and wear codes; jacket, coat or skirt, so the
         legs show below the hem) drawn large in the look's glow alone: each figure's coat (its torso) and its trousers or tights differ by ≥ 0.02 —
         CONTROL every part in the coat's colour (uOneCol, RAIN-10's one colour per figure) leaves them under 0.007 */
      { const W=LF.lifeAt(10, 'evening').filter(q=>q.kind===LF.LK.walk && q.wear!=null && LF.wearParts(q.wear).style<3).slice(0, 8), z=9, hh=1.75*1.15/(2*z), hw=0.75/(2*z), hp=hh*2/1.15;
        const parts=async one=>{ const items=W.map((q, i)=>({ x:-tan[0]*0.88+i*(tan[0]*1.76/Math.max(1, W.length-1)), y:-tan[1]*0.9, hh, hw, k:0, ph:0.0, c:q.c, wear:q.wear, lit:0, dep:0.5 })), S=await sheet(items, { oneCol:one }), out=[];
          const mean=(it, x0, x1, y0, y1)=>{ let r=0, g=0, b=0, m=0; region(S, it.x+x0*hw, it.x+x1*hw, it.y+y0*hp, it.y+y1*hp, (a, x, y)=>{ if(a<200) return; const X=Math.round((x/tan[0]+1)/2*Wp), Y=Math.round((y/tan[1]+1)/2*Hp), k=(Y*Wp+X)*4; r+=S.px[k]/a; g+=S.px[k+1]/a; b+=S.px[k+2]/a; m++; }); return m ? [r/m, g/m, b/m] : null; };
          for(const it of items){ const t=mean(it, -0.18, 0.18, 0.45, 0.62), l=mean(it, -0.2, 0.2, 0.04, 0.12); out.push(t && l ? Math.hypot(t[0]-l[0], t[1]-l[1], t[2]-l[2]) : -1); } return out; };
        const G=await parts(false), C=await parts(true), gmin=Math.min(...G), cmax=Math.max(...C);
        ok(`${tag}: a figure's coat and trousers look alike on screen (least difference ${gmin.toFixed(3)} of ${G.length} figures)`, G.length>=6 && gmin>=0.02); ok(`${tag}: CONTROL one colour per figure differs (${cmax.toFixed(3)})`, cmax>=0 && cmax<0.007);
        notes.push(`${tag}: coat vs trousers on screen differ by ${gmin.toFixed(3)}…${Math.max(...G).toFixed(3)} over ${G.length} figures (CONTROL one colour: ≤ ${cmax.toFixed(4)})`); }
      /* (4c) RELEASE-1 (A): SEEN FROM ABOVE, ON THE GROUND — a walker going away (the walking direction's screen step 0.45 of its height per metre, looked
         down at 37°, half stride 0.32 m), phase 0: its two feet's lowest points sit at different heights (≥ 0.08 of its height apart) — CONTROL RAIN-5's flat
         front-view gait (no direction): under 0.02; THE DOG walks ahead along that direction: its middle ≥ 0.4 of the walker's height higher going away than
         coming towards us — CONTROL RAIN-5's dog side-on (no direction either way): the same place; THE UMBRELLA from above reaches below its rim beside the head (alpha > 200 at 0.6 of its
         half width, 0.85 of the height) — CONTROL a side view (looked at level) leaves it empty */
      { const z=10, hp=1.75/z, hh=hp*1.15/2, hw=0.36/z, xs=[-0.6, 0, 0.6].map(f=>f*tan[0]), y0=-tan[1]*0.3, away=[0, 0.45, 0.6, 0.32], level=[0, 0, 0, 0.32], toward=[0, -0.45, 0.6, 0.32];
        const cen=(S, it, x0, x1, y1, y2)=>{ let m=0, sy=0; region(S, it.x+x0*it.hw, it.x+x1*it.hw, it.y+y1*hp, it.y+y2*hp, (a, x, y)=>{ if(a>=128){ m++; sy+=y; } }); return m ? (sy/m-it.y)/hp : NaN; };
        const low=(S, it, x0, x1)=>{ let lo=1e9; region(S, it.x+x0*it.hw, it.x+x1*it.hw, it.y-0.35*hp, it.y+0.3*hp, (a, x, y)=>{ if(a>=128 && y<lo) lo=y; }); return (lo-it.y)/hp; };
        const feet=async v=>{ const it={ x:xs[0], y:y0, hh, hw, k:0, ph:0, c:3+8*4, wear:0, dep:0.5, view:v }, S=await sheet([it]); return Math.abs(low(S, it, -0.3, -0.02)-low(S, it, 0.02, 0.3)); };
        const Fa=await feet(away), Fl=await feet(level);
        ok(`${tag}: the feet do not step along the street (${Fa.toFixed(3)} of the height apart)`, Fa>=0.08); ok(`${tag}: CONTROL the flat gait's feet apart (${Fl.toFixed(3)})`, Fl<0.02);
        const dog=async v=>{ const hw2=hw*1.73, it={ x:xs[1], y:y0, hh, hw:hw2, k:2, ph:0.3, c:1+8*4, wear:0, dep:0.5, view:v }, S=await sheet([it]); return cen(S, it, 0.12, 1.4, -0.8, 1.0); };
        const Da=await dog(away), Dt=await dog(toward), Dl=await dog(level), Dl2=await dog([0, 0, 0.6, 0.32]);
        ok(`${tag}: the dog does not walk ahead along the street (its middle ${Da.toFixed(2)} going away, ${Dt.toFixed(2)} towards us)`, Da-Dt>=0.4); ok(`${tag}: CONTROL the side-on dog moves (${Dl.toFixed(2)} vs ${Dl2.toFixed(2)})`, Math.abs(Dl-Dl2)<0.4);
        const canopy=async v=>{ const it={ x:xs[2], y:y0, hh, hw, k:0, ph:0.2, c:2+8*1+64, wear:0, dep:0.5, view:v }, S=await sheet([it]); let n=0; region(S, it.x+0.55*hw, it.x+0.65*hw, it.y+0.84*hp, it.y+0.86*hp, a=>{ if(a>200) n++; }); return n; };
        const Ca=await canopy(away), Cl=await canopy(level);
        ok(`${tag}: the umbrella seen from above does not reach below its rim (${Ca} px)`, Ca>=4); ok(`${tag}: CONTROL the level view fills below the rim (${Cl} px)`, Cl===0);
        notes.push(`${tag}: feet ${Fa.toFixed(3)} of the height apart going away (flat gait ${Fl.toFixed(3)}); the dog at ${Da.toFixed(2)} going away, ${Dt.toFixed(2)} towards us (side-on ${Dl.toFixed(2)}); the canopy below its rim ${Ca} px (level ${Cl})`); }
      /* (5) no quad shows: every kind, three blurs */
      { const items=[], quads=[], cols=12; let i=0; for(let k=0;k<=30;k++){ if(k===25 || k===13) continue;   /* RELEASE-1 (C): + 29 the cat, 30 the stream's glint */   /* 13 (the tram's heads) and 25 (its carriages) retired at RAIN-10 */ for(const dep of [0.5, 0.7, 0.95]){ const hh=0.03*tan[1]*(k===24 ? 1.4 : 1), hw=hh*(k===24 ? 0.7 : k===9 || k===7 || k===20 ? 1 : k>=26 ? 1.2 : 0.45);   /* a sign as the room draws it: as wide as high */
          const cx=-tan[0]*0.94+(i%cols)*(tan[0]*1.88/(cols-1)), cy=-tan[1]*0.94+Math.floor(i/cols)*(tan[1]*0.27); items.push({ view:GL.LIFE_DN(k)>0 ? [0.12, -0.5, 0.75, 0.4] : undefined, x:cx, y:cy, hh, hw, k:k===27 ? 27.9 : k, ph:0.4+(k===24 ? 3 : k>=27 ? 8 : 0), c:k===24 ? 2+8*3 : 3+8*(k%4)+64+256*(k%8), dep });
          const R2=0.012*Math.min(1, Math.max(0, Math.abs(dep-0.5)-0.02)*4), soft=Math.max(R2+0.8/uPx, 0.04*hh), pad=soft+2.2/uPx, padX=Math.max(soft, soft*hw/(2*hh))+2.2/uPx, ex= (k<=2 || (k>=14 && k<=18)) ? [1.45, 1.3] : k===20 ? [1.3, 1] : [1, 1];
          quads.push([cx-(hw*ex[0]+padX), cx+(hw*ex[0]+padX), cy-pad-GL.LIFE_DN(k)*2*hh, cy+2*hh*ex[1]+pad]); i++; } }   /* RELEASE-1 (A): people's quads reach down (LIFE_DN) */
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
      /* (8) a person UNDER THE CROWNS, in the room (RELEASE-1 (A): the bake's depth map keeps the gaps between the leaves, so a crown no longer hides a whole
         person): planted where the depth map covers 30–85 % of the figure (every 10 cm), the CPU cull off — the person shows THROUGH THE GAPS (≥ 10 pixels
         changed where nothing is nearer) and NOT THROUGH the leaves and trunks (pixels changed where the depth map is nearer all round: at most 2 more than
         between two frames without them) — CONTROL the depth test off: > 10 more pixels over the leaves (at the pixel's centre) than with it on */
      { const Rm=R(), tw=S0.tan[0]*0.85, th=S0.tan[1]*0.85; let best=null; for(let x=13.8;x<=18.6;x+=0.4) for(let z=24;z<=90;z+=1){ const f=CT.project([x, 0.25, z]), h=CT.project([x, 1.7, z]); if(f.z<=1 || Math.abs(f.x)>tw || f.y<-th || h.y>th) continue;   /* on the screen */ const dp=CT.depthOf(f.dist);
          let cov=0, all=0; for(let gx=-0.3;gx<=0.3;gx+=0.1) for(let gy=0.1;gy<=1.8;gy+=0.1){ const q=CT.project([x+gx, gy, z]); all++; if(Rm.bakedAtDbg(q.x, q.y)<dp-0.06) cov++; }
          const share=cov/all; const sc=Math.min(share, 1-share)*(h.y-f.y); if(share>=0.3 && share<=0.85 && (!best || sc>best.sc)) best={ x, z, f, h, hgt:h.y-f.y, dp, share, sc }; }   /* leaves and gaps both, over the largest figure */
        if(ok(`${tag}: no place found under the crowns (the bake?)`, !!best)){
          const hw=0.75/best.f.z, reg=[best.f.x-hw*1.6, best.f.y-0.002, best.f.x+hw*1.6, best.h.y+(best.h.y-best.f.y)*0.3];
          Rm.trafficHoldDbg(700); Rm.lifeHoldDbg(700); Rm.lifeExtraDbg(null); Rm.occlDbg(true); await frames(3);
          const T2=st().tan, peek=()=>Rm.peekDbg(...reg), F0=Rm.focusDbg(), foc=async()=>{ Rm.focusDbg(0.61); await frames(2); };
          const near=(x, y)=>Rm.bakedAtDbg(x, y)<best.dp-0.06, ch=(a, b, k)=>Math.max(Math.abs(a.px[k]-b.px[k]), Math.abs(a.px[k+1]-b.px[k+1]), Math.abs(a.px[k+2]-b.px[k+2]))>10;   /* changed by more than 10 / 255 (the noise: two frames without them) */
          const split=(a, b)=>{ const W=a.w, Hh=a.h, x0=Math.round((reg[0]/T2[0]*0.5+0.5)*(a.pxPerUnit*2*T2[0])), y0=Math.round((reg[1]/T2[1]*0.5+0.5)*(a.pxPerUnit*2*T2[1])), e=1.5/a.pxPerUnit; let leaves=0, gaps=0, any=0, over=0;
            for(let j=0;j<Hh;j++) for(let i=0;i<W;i++){ const k=(j*W+i)*4; if(!ch(a, b, k)) continue; any++; const x=((x0+i+0.5)/(a.pxPerUnit*2*T2[0])*2-1)*T2[0], y=((y0+j+0.5)/(a.pxPerUnit*2*T2[1])*2-1)*T2[1];
              const nc=near(x, y); if(nc) over++; if(nc && near(x+e, y) && near(x-e, y) && near(x, y+e) && near(x, y-e)) leaves++; else if(!nc) gaps++; } return { leaves, gaps, any, over }; };
          await foc(); const A1=peek(); await foc(); const A2=peek(); const P={ kind:0, x:best.x, y:0, z:best.z, h:1.75, w:0.75, ph:0.25, c:0+8*6, wear:0, a:1, lane:'probe' };   /* a yellow raincoat, no umbrella: the figure alone, plain to see */
          Rm.cullDbg(false); Rm.lifeExtraDbg([P]); await frames(1); await foc(); const B=peek(); Rm.occlDbg(false); await frames(1); await foc(); const C=peek(); Rm.focusDbg(F0); Rm.occlDbg(true); Rm.lifeExtraDbg(null); Rm.cullDbg(true);
          const N=split(A1, A2), Bs=split(A1, B), Cs=split(A1, C);
          ok(`${tag}: a person under the crowns shows through the leaves (${Bs.leaves} px vs ${N.leaves} between two frames without them)`, Bs.leaves<=N.leaves+2); ok(`${tag}: a person under the crowns is not seen through the gaps (${Bs.gaps} px)`, Bs.gaps>=10);
          ok(`${tag}: CONTROL the depth test off still hides them behind the leaves (${Cs.over} px over the leaves vs ${Bs.over} with it on)`, Cs.over>Bs.over+10);
          notes.push(`${tag}: a person under the crowns at x ${best.x.toFixed(1)}, z ${best.z} (${Math.round(best.share*100)} % covered): ${Bs.gaps} px seen through the gaps, ${Bs.leaves} through the leaves (two frames without them: ${N.leaves}); with the depth test off ${Cs.over} over the leaves (on: ${Bs.over})`); } }
      /* (9) the tram as a lit box */
      { const Rm=R(), q=Rm.tramAtDbg(400, 3000, 30, 110); if(ok(`${tag}: no tram found on the street`, !!q)){ Rm.trafficHoldDbg(q.t); await frames(3); const T=Rm.tramDbg(); ok(`${tag}: the tram is not drawn in 3D (${T.mesh} bodies; RAIN-10's box ${T.quads} faces)`, T.mesh>=1 && T.quads===0); } }   /* RELEASE-1 (B): the tram a 3D body (its RAIN-10 box only with the sprites) */
      R().trafficHoldDbg(null); R().lifeHoldDbg(null); }
  } finally { sheetDone(); try{ const Rm=R(); if(Rm){ Rm.lifeExtraDbg(null); Rm.lifeHoldDbg(null); Rm.trafficHoldDbg(null); Rm.occlDbg(true); Rm.cullDbg(true); } }catch(e){} H.setSceneLight(light0); await H.setSceneLevel(lvl0);
    try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98712, night:true, name:'RAIN-10 people, cars and the tram', drawn:true, run:()=>checkRain10(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
