/* RAIN-0: row «RAIN room» (P.night, drawn) — the rain room (apps/night/rooms/rain/, a development room: the row adds it and takes it out again).
   (1) IN: a switch from the forest opens it (WebGL, its own id, at most 12 shader programs, frames drawn, no error); the interface takes its amber
       tint; it is NOT remembered on the device. RAIN-0b: the pane opens fully misted (nothing wiped, the mist ≥ 0.6) and wet (the simulated drops
       booked exactly, under their cap); the depth the city's painting holds equals the view law's at sample places (street, house opposite, hills,
       sky — the shader is the law's port).
   (2) DEPTH IS FOCUS: a synthetic playing hand through the real gesture path — near (a large hand): the focus settles on the glass (< 0.05), the glass
       sharp and the house opposite fully soft; far (a small hand): the focus settles far (> 0.95), the hills the sharpest and the glass fully soft;
       RAIN-0b, the MIDDLE (a hand whose focus target is the street's depth): the street sharper than the glass and the hills; CONTROL a two-plane
       focus at the same moment fails it. It GLIDES (two frames after the hand jumped far → near it has not arrived); THE SOUND'S CLOSENESS FOLLOWS:
       the shared acoustic's depth («Forest depth», the same hand) is higher far than near.
   (3) A FAR NOTE LIGHTS THE WINDOW UNDER THE LIGHT: the window the pure law names for the light's place (pure/windows.js windowPick) comes on
       (≥ 0.9 within a second), no other pick; two minutes later (the room's clock moved; RAIN-0b: read once the room's own clock shows the jump —
       an event wait with a limit, never a frame count) it glows at the trace law's level. CONTROLS: a far note on the sky lights nothing; a near note
       lights nothing and clears the mist under the light instead.
   RAIN-3: the room's layered sound follows the same focus (the live node near < 0.1, far > 0.9) and both recordings play.
   NIGHT-15: on Dark (no picture) the sound's focus still follows the hand's depth by the same law; CONTROL the heard step off: frozen.
   (4) RAIN-0b, A FINGER ON THE GLASS: near, a held pinch moved across the pane draws one continuous clear stroke (every point of its path clear).
   (5) OUT: after six switches rain ↔ forest the renderer's programs, geometries and textures and the contexts made and alive are the forest's
       baseline — nothing is left after dispose. CONTROL: inside the rain room the same count differs (the measure sees the room).
   Every wait has a limit and fails when it is reached. */
import { row } from '../core/rows.js';

const sleep=ms=>new Promise(r=>setTimeout(r, ms));
const frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
export async function checkRainRoom(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), RI=await import('../../../apps/night/rooms/index.js'), INS=await import('../../../apps/night/rooms/rain/install.js');
  const RV=await import('../../../apps/night/pure/room.js'), TN=await import('../../../apps/night/tint.js'), Wn=await import('../../../apps/night/rooms/rain/pure/windows.js'), FO=await import('../../../apps/night/rooms/rain/pure/focus.js');
  const CT=await import('../../../apps/night/rooms/rain/pure/city.js');
  const PR=await import('../../../core/profile.js'), G=await import('../../../core/gestures.js'), PO=await import('../../../core/gestures/pose.js'), V=await import('../../../core/vision.js'), A=await import('../../../core/audio.js'), ST=await import('../../../core/state.js'), REC=await import('../../../core/recorder.js');
  const RAIN=INS.RAIN.record.id, had=!!RI.roomById(RAIN), was=PR.profileCurrent();
  const keep={ bg:H.backgroundOf(), room:H.sceneRoom(), key:(()=>{ try{ return localStorage.getItem(RS.ROOM_KEY); }catch(e){ return null; } })() };
  const FOREST=RV.ROOM_IDS[0], clk={ t:8e6, W:V.canvas.width, H:V.canvas.height };
  const opened=async(ms=20000)=>{ const t=performance.now(); while(H.sceneInfo().opening && performance.now()-t<ms) await sleep(50); await frames(2); return !H.sceneInfo().opening; };
  const snap=()=>{ const I=H.sceneInfo(); return { programs:I.programs, geometries:I.memory ? I.memory.geometries : NaN, textures:I.memory ? I.memory.textures : NaN, made:I.contextsMade, live:I.contextsLive }; };
  const go=async id=>{ const ok=await RS.roomSwitch(id, { fast:true }); await opened(); await frames(3); return ok; };
  const room=()=>H.sceneRoomDbg(), st=()=>room().state();
  const NEAR=0.34, FAR=0.08;   // the hand's size in the picture: large = near, small = far (its smoothed size settles over about a second of frames)
  const hand=(x, y, s, pinch, k=4)=>{ clk.W=V.canvas.width; clk.H=V.canvas.height; for(let i=0;i<k;i++){ clk.t+=1000/30; G.processHandsProbe({ landmarks:[PO.pose({ x, y, s, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); } };
  const until=async(f, ms)=>{ const t=performance.now(); while(performance.now()-t<ms){ if(f()) return true; await frames(1); } return !!f(); };
  /* the room's own frames: wait until it has stepped k more times (a frame count of the ROOM, with a limit — not of the page) */
  const stepped=async(k, ms=5000)=>{ const f0=st().frames; return until(()=>st().frames>=f0+k, ms); };
  const depth=()=>{ const I=A.fxInstance(ST.chainKeyOf('ld'), 'fdepth'); return I ? I.params[1].cur : NaN; };
  try{
    { const why=PR.profileApply('profile.night'); n++; if(why){ miss('Night did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; } }
    { const why=RV.checkRoom(INS.RAIN.record, { ids:[RAIN] }); n++; if(why){ miss('the rain room\'s record was refused: '+why); return { cases:n, total:d.length, differences:d, notes }; } }
    if(!had && RI.roomAdd(INS.RAIN)) H.sceneRoomAdd(RAIN, { load:INS.RAIN.load, standIn:INS.RAIN.standIn, heard:INS.RAIN.heard, three:()=>import('../../../apps/night/vendor/three-r128/three.min.js') });
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    await H.setBackground('forest'); await opened(); await frames(4);
    n++; if(!H.sceneInfo().webgl || H.sceneInfo().id!==FOREST){ miss('the forest did not open (the row needs the room\'s picture): '+JSON.stringify(H.sceneInfo().errors)); return { cases:n, total:d.length, differences:d, notes }; }
    const base=snap();
    /* (1) in */
    await go(RAIN); const I=H.sceneInfo(), r0=I.rendered; await frames(6); n+=5;
    if(I.id!==RAIN || !I.webgl) miss('the rain room did not open: '+JSON.stringify({ id:I.id, webgl:I.webgl, errors:I.errors }));
    else {
      if(!(I.programs>0 && I.programs<=12)) miss(`the rain room has ${I.programs} shader programs (1…12)`);
      if(!(H.sceneInfo().rendered>r0)) miss('the rain room draws no frames');
      { const bad=(H.sceneProgramsDbg()||[]).filter(p=>!p.ok); if(bad.length) miss('a shader did not compile: '+bad.map(p=>p.name).join(', ')); }
      { const h=getComputedStyle(document.documentElement).getPropertyValue('--cv-'+INS.RAIN.record.tint).trim(), want=`rgb(${parseInt(h.slice(1,3),16)}, ${parseInt(h.slice(3,5),16)}, ${parseInt(h.slice(5,7),16)})`;
        if(TN.tintNow()!==want) miss(`in the rain room the interface's tint is ${TN.tintNow()}, not its amber ${want}`); }
      n++; if(RS.roomSwitchDbg().stored===RAIN) miss('the rain room was remembered on the device (a development room never is)');
      const inRain=snap(); notes.push(`the rain room: ${I.programs} programs, ${I.calls} draws, opened in ${I.openMs} ms, textures ${(I.texBytes/1048576).toFixed(1)} MB; counts ${JSON.stringify(inRain)} (the forest's ${JSON.stringify(base)})`);
      n++; if(JSON.stringify(inRain)===JSON.stringify(base)) miss('CONTROL: inside the rain room the counts equal the forest\'s — the «nothing left» check cannot see the room');
      /* (1c) RAIN-1: the car passes' recording is in the live node, and the sound's traffic density is the picture's own number */
      { const t0=performance.now(); let L=null; while(performance.now()-t0<15000){ L=await RS.natureLayersDbg(); if(L && L.rec && (L.rec.cars==='on' || L.rec.cars==='failed' || L.rec.cars==='refused')) break; await sleep(200); }
        await frames(3); const dS=st().density; L=await RS.natureLayersDbg(); n+=2;
        if(!L || !L.rec || L.rec.cars!=='on' || !L.cars) miss('the recording of the car passes is not in the live node: '+JSON.stringify(L && L.rec)); else notes.push(`the car passes' recording is in the live node (${L.passes} passes scheduled so far)`);
        if(!(L && Math.abs(L.density-dS)<1e-9)) miss(`the sound's traffic density ${L && L.density} is not the picture's ${dS}`); else notes.push(`the sound's traffic density is the picture's: ${dS}`); }
      /* (1b) the misted, wet pane; the painted depth against the law */
      { const S=st(); n+=2; if(S.wipe.wiped || S.wipe.max>0 || !(S.mist>=0.6)) miss(`the pane does not open misted: ${JSON.stringify(S.wipe)}, mist ${S.mist}`);
        if(!(S.drops.n>20 && S.drops.n<=S.drops.cap && Math.abs(S.drops.ledger)<1e-9)) miss('the pane\'s drops: '+JSON.stringify(S.drops));
        notes.push(`opened misted (${S.mist.toFixed(2)}) and wet: ${S.drops.n} drops (${S.drops.running} running) of ${S.drops.cap}`);
        /* RAIN-1: the baked city — the painted depth is the baked map's (the street, the house opposite) and the law's where the bake cast the law (the hills, the sky) */
        n++; if(!S.baked) miss('the baked city did not load (the stand-in paints the city)');
        const [tw, th]=S.tan, at=[[0, -th*0.85], [tw*0.5, -th*0.05], [CT.vanishing().x+0.3, CT.vanishing().horizon+0.02], [0, th*0.9]], got=(room().rtReadDbg('base', at)||[]).map(c=>c[3]), law=at.map(([x, y], i)=>S.baked && i<2 ? room().bakedDepthDbg(x, y) : room().lawDepthDbg(x, y)); n++;
        const off=at.map((p, i)=>Math.abs((got[i]==null ? -1 : got[i])-law[i])); if(!(got.length===at.length && off.every(e=>e<=3/255+1e-6))) miss(`the painted depth is not the law's: painted ${JSON.stringify(got.map(v=>+(+v).toFixed(3)))}, law ${JSON.stringify(law.map(v=>+v.toFixed(3)))}`);
        else notes.push((S.baked ? 'the painted depth equals the baked map at the street and the house opposite and the law at the hills and the sky: ' : 'the painted depth equals the law at the street, the house opposite, the hills and the sky: ')+law.map(v=>v.toFixed(2)).join(', ')); }
      /* (2) depth is focus, and the sound's closeness */
      G.handsProbe(clk, ()=>true);
      hand(0.5, 0.5, NEAR, false, 45); n+=2; const nearOk=await until(()=>st().focus<0.05, 5000), sn=st(), dn=depth();
      if(!nearOk) miss(`a near hand: the focus stays at ${sn.focus.toFixed(3)} (below 0.05 within 5 s expected)`);
      if(!(sn.blur.facade>0.95 && sn.blur.glass<=FO.blurAt(FO.LAYER_DEPTH.glass, 0.05)+1e-9))   /* the glass at most as soft as the law makes it at the near threshold's focus */ miss('a near hand: the glass is not sharp and the house opposite soft: '+JSON.stringify(sn.blur));
      hand(0.5, 0.5, FAR, false, 45); n+=3; const farOk=await until(()=>st().focus>0.95, 5000), sf=st(), df=depth();
      if(!farOk) miss(`a far hand: the focus stays at ${sf.focus.toFixed(3)} (above 0.95 within 5 s expected)`);
      if(!(sf.blur.glass>0.95 && sf.blur.hills<0.15 && sf.blur.hills<sf.blur.facade)) miss('a far hand: the glass is not the soft one and the hills the sharpest: '+JSON.stringify(sf.blur));
      notes.push(`the focus: near ${sn.focus.toFixed(3)}, far ${sf.focus.toFixed(3)}; the sound's depth («Forest depth»): near ${dn.toFixed(3)}, far ${df.toFixed(3)}`);
      if(!(df>dn+0.3)) miss(`the sound's closeness does not follow the hand's depth: «Forest depth» near ${dn}, far ${df}`);
      /* RAIN-3: the room's own sound takes the same number — the live layers' node (built when the room plays) follows the picture's focus */
      { hand(0.5, 0.5, NEAR, false, 45); await until(()=>st().focus<0.05, 5000); await sleep(400); const Ln=await RS.natureLayersDbg();
        hand(0.5, 0.5, FAR, false, 45); await until(()=>st().focus>0.95, 5000); await sleep(400); const Lf=await RS.natureLayersDbg(); n+=2;
        if(!Ln || !Lf) miss('the rain room plays without its layered sound (no node)');
        else { if(!(Ln.focus<0.1 && Lf.focus>0.9)) miss(`the room's sound does not follow the focus: near ${Ln.focus}, far ${Lf.focus}`);
          if(!(Lf.rec.near==='on' && Lf.rec.far==='on')) miss('the recordings are not playing: '+JSON.stringify(Lf.rec));
          notes.push(`the room's sound follows the focus: ${Ln.focus.toFixed(3)} near, ${Lf.focus.toFixed(3)} far (recordings ${Lf.rec.near} / ${Lf.rec.far}, ${Lf.grains} grains)`); } }
      /* the middle: the hand size whose focus target is nearest the street's depth, then the blurs once the focus has settled there */
      { let best=null, lo=FAR, hi=NEAR; for(let it=0;it<8;it++){ const s=(lo+hi)/2; hand(0.5, 0.5, s, false, 45); for(let k=0;k<3;k++){ hand(0.5, 0.5, s, false, 2); await stepped(1); } const t=st().target,   /* NIGHT/RAIN-1: the hand fed while the room steps (a hand left alone goes stale on a busy machine and the room reads its rest) */ fd=FO.focusDepth(t), e=Math.abs(fd-FO.LAYER_DEPTH.street);   /* bisection on the hand's size: larger = nearer */
          if(!best || e<best.e) best={ s, e, t }; if(fd>FO.LAYER_DEPTH.street) lo=s; else hi=s; }
        hand(0.5, 0.5, best.s, false, 45); const settled=await until(()=>{ hand(0.5, 0.5, best.s, false, 1); return Math.abs(st().focus-st().target)<0.01; }, 5000), B=st().blur, f=st().focus; n+=2;
        if(!settled || best.e>0.08) miss(`the middle: no hand reached the street's focus (best size ${best.s}, focus depth ${FO.focusDepth(best.t).toFixed(2)})`);
        const midOk=b=>b.street<b.glass-0.2 && b.street<b.hills-0.2 && b.streetNear<b.glass && b.streetFar<b.hills;
        if(settled && best.e<=0.08){ if(!midOk(B)) miss('a hand in the middle: the street is not sharper than the glass and the hills: '+JSON.stringify(B));
          else notes.push(`a hand in the middle (focus ${f.toFixed(2)}): street ${B.street.toFixed(2)}, glass ${B.glass.toFixed(2)}, hills ${B.hills.toFixed(2)}`); }
        const g2=Math.pow(f, FO.FOCUS.gamma), c2=Math.pow(1-f, FO.FOCUS.gamma), two={ glass:g2, streetNear:c2, street:c2, streetFar:c2, hills:c2 }; n++;   /* RAIN-0's two planes: one blur for the whole city */
        if(midOk(two)) miss('CONTROL: a two-plane focus at the same moment passed the middle — the check cannot fail'); else notes.push(`CONTROL: a two-plane focus at the same moment gives the street and the hills one blur (${c2.toFixed(2)}) — caught`); }
      hand(0.5, 0.5, FAR, false, 45); await until(()=>st().focus>0.95, 5000);
      hand(0.5, 0.5, NEAR, false, 45); await stepped(2); n++; { const f2=st().focus; if(!(f2>0.5)) miss(`the focus jumped: ${f2.toFixed(3)} two room frames after the hand went near (it should glide; limit ${FO.FOCUS.maxRate} a second)`); }
      /* (3) a far note lights the window under the light; CONTROLS: the sky, a near note */
      const W=room().windowsDbg(); let k=-1, at=null;   // RAIN-1: the room's own window map (the bake's)
      for(const [x, y] of [[0.75, 0.55], [0.25, 0.55], [0.7, 0.62], [0.3, 0.62], [0.82, 0.5], [0.18, 0.5], [0.6, 0.55], [0.4, 0.55], [0.5, 0.6]]){ hand(x, y, FAR, false, 45); await until(()=>st().focus>0.95, 5000); await sleep(500); const L=st().light, q=Wn.windowPick(W, L.x, L.y);
        if(q>=0 && st().lit[q]<0.05){ k=q; at=[x, y]; break; } }
      n++; if(k<0) miss('no place of the hand points at a dark window (the row cannot play its note)');
      else { const p0=st().picks; hand(at[0], at[1], FAR, true, 4); n+=3; const on=await until(()=>st().lit[k]>=0.9, 2000), S=st();
        if(!on) miss(`a far note on window ${k}: its light is ${S.lit[k].toFixed(3)} after 2 s (≥ 0.9 expected), last pick ${S.lastPick}`);
        if(!(S.picks>p0) || S.pickLog.slice(p0-S.picks).some(q=>q!==k)) miss(`a far note picked ${JSON.stringify(S.pickLog.slice(p0-S.picks))}, the law names only ${k}`);
        hand(at[0], at[1], FAR, false, 4); await frames(2);
        /* the clock jump: read once the room's own clock shows it and it has stepped once more there (an event, with a 5-s limit) */
        const T=performance.now()/1000+120; H.sceneClockDbg(T); const seen=await until(()=>st().now>=T-1, 5000), more=seen && await stepped(2), later=st().lit[k], law=Wn.traceLevel(st().now-(T-120)); H.sceneClockDbg(null); await frames(2);
        notes.push(`window ${k} lit by a far note; two minutes later ${later.toFixed(3)} (the law: ${law.toFixed(3)})`);
        if(!seen || !more) miss('the room did not step after its clock was moved (5 s)');
        else if(!(Math.abs(later-law)<=0.03 && later>0.1 && later<0.9)) miss(`two minutes after its note the window glows at ${later.toFixed(3)}, the trace law says ${law.toFixed(3)}`); }
      { hand(0.5, 0.06, FAR, false, 12); await sleep(500); const L=st().light, q=Wn.windowPick(W, L.x, L.y), p0=st().picks, l0=st().litNow; n++;
        if(q>=0) notes.push('the sky CONTROL could not run: the top of the picture points at window '+q);
        else { hand(0.5, 0.06, FAR, true, 4); await sleep(400); hand(0.5, 0.06, FAR, false, 4); const S=st(); if(S.picks!==p0 || S.litNow>l0) miss(`CONTROL: a far note on the sky lit a window (${S.picks-p0} picks, ${S.litNow-l0} more lit)`); else notes.push('CONTROL: a far note on the sky lights nothing'); } }
      { hand(0.5, 0.5, NEAR, false, 45); n+=2; const nearAgain=await until(()=>st().focus<0.05, 5000), p0=st().picks; hand(0.5, 0.5, NEAR, true, 4); await sleep(300); const S=st(), L=S.light, clear=room().wipeCellDbg(L.x+S.off.x, L.y+S.off.y);
        hand(0.5, 0.5, NEAR, false, 4);
        if(!nearAgain || S.picks!==p0) miss(`CONTROL: a near note lit a window (${S.picks-p0} picks; the focus ${S.focus.toFixed(3)})`);
        if(!(clear>0.3)) miss(`a near note did not clear the mist under the light (${clear.toFixed(3)})`); else notes.push(`a near note clears the mist under the light (${clear.toFixed(2)}) and lights no window`); }
      /* (4) a finger on the glass: the pinch held near, moved across in big steps — one continuous stroke */
      { const path=[]; hand(0.3, 0.6, NEAR, false, 30); await until(()=>st().focus<0.05, 5000); const s0=st().strokes;
        for(let i=0;i<=8;i++){ const x=0.3+0.05*i, y=0.6-0.02*i; hand(x, y, NEAR, true, 3); await stepped(1); const S=st(); path.push([S.light.x+S.off.x, S.light.y+S.off.y]); }
        hand(0.7, 0.44, NEAR, false, 4); let m=1; for(let i=1;i<path.length;i++) for(let s=0;s<=10;s++){ const t=s/10; m=Math.min(m, room().wipeCellDbg(path[i-1][0]+(path[i][0]-path[i-1][0])*t, path[i-1][1]+(path[i][1]-path[i-1][1])*t)); }
        n+=2; if(!(st().strokes>s0)) miss('a held pinch near drew no stroke');
        if(!(m>=0.5)) miss(`the finger's stroke is broken: ${m.toFixed(2)} at its least clear point`); else notes.push(`a finger on the glass: ${st().strokes-s0} stroke steps, its least clear point ${m.toFixed(2)}`); }
      G.handsProbe(null);
    }
    /* (5) out: nothing left */
    for(let i=0;i<6;i++) await go(i%2 ? RAIN : FOREST);
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    await frames(4); const after=snap(); n+=5; notes.push('after six switches rain ↔ forest: '+JSON.stringify(after));
    for(const q of ['programs', 'geometries', 'textures', 'made', 'live']) if(after[q]!==base[q]) miss(`after the rain room left, ${q} is ${after[q]}, the forest's baseline ${base[q]}`);
    /* (6) NIGHT-15 (after (5): leaving the picture makes a new WebGL context when it comes back, which (5)'s count must not see): HEARD WITHOUT THE PICTURE — on Dark the room's update stops, so the sound's focus comes from the hand's depth by the same law
         (rooms/rain/heard.js): near → the live layers' focus < 0.1, far → > 0.9; CONTROL the heard step off: a near hand leaves it far (frozen) */
    if(H.sceneRoom()!==RAIN) await go(RAIN);
    G.handsProbe(clk, ()=>true);   // the synthetic hands again (section 4 handed the hands back to the camera)
    { const LZ=async ()=>(await RS.natureLayersDbg()||{}).focus, untilA=async(f, ms)=>{ const t=performance.now(); while(performance.now()-t<ms){ if(f(await LZ())) return true; await sleep(100); } return f(await LZ()); };
        await H.setBackground('dark'); await frames(3); n+=4;
        hand(0.5, 0.5, FAR, false, 45); const darkFar=await untilA(v=>v>0.9, 8000), vf=await LZ();
        hand(0.5, 0.5, NEAR, false, 45); const darkNear=await untilA(v=>v<0.1, 8000), vn=await LZ();
        if(!darkFar || !darkNear) miss(`on Dark the room's sound does not follow the hand: far ${vf}, near ${vn}`); else notes.push(`on Dark (no picture) the sound's focus follows the hand: far ${(+vf).toFixed(3)}, near ${(+vn).toFixed(3)}`);
        hand(0.5, 0.5, FAR, false, 45); await untilA(v=>v>0.9, 8000); H.sceneHeardDbg({ off:true });
        hand(0.5, 0.5, NEAR, false, 45); await sleep(1500); const vc=await LZ(); H.sceneHeardDbg({ off:false });
        if(!(vc>0.9)) miss(`CONTROL: with the heard step off the sound still followed the hand (${vc}) — the check cannot fail`); else notes.push(`CONTROL: the heard step off → the focus stays ${(+vc).toFixed(3)} after a near hand (the old frozen balance)`);
        if(H.sceneInfo().webgl) miss('on Dark the room is still drawn (the case needs no picture)');
        await H.setBackground('forest'); await opened(); await frames(4); G.handsProbe(null); }
    if(H.sceneRoom()!==FOREST) await go(FOREST);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{
    try{ G.handsProbe(null); }catch(e){} try{ REC.liveAllOff(); }catch(e){} H.sceneClockDbg(null); H.sceneHeardDbg({ off:false });
    try{ if(H.sceneRoom()!==keep.room && RI.roomById(keep.room)) await RS.roomSwitch(keep.room, { fast:true }); }catch(e){}
    if(!had){ RI.roomRemove(RAIN); H.sceneRoomRemove(RAIN); }
    try{ TN.tintApply(RS.roomCurrent(), { now:true }); }catch(e){}
    try{ await H.setBackground(keep.bg); }catch(e){}
    try{ if(keep.key==null) localStorage.removeItem(RS.ROOM_KEY); else localStorage.setItem(RS.ROOM_KEY, keep.key); }catch(e){}
    PR.profileApply(was||'profile.night');
  }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.983, night:true, name:'RAIN room', drawn:true, run:()=>checkRainRoom(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
