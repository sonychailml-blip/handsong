/* RAIN-0: row «RAIN room» (P.night, drawn) — the rain room (apps/night/rooms/rain/, a development room: the row adds it and takes it out again).
   (1) IN: a switch from the forest opens it (WebGL, its own id, at most 12 shader programs, frames drawn, no error); the interface takes its amber
       tint; it is NOT remembered on the device.
   (2) DEPTH IS FOCUS: a synthetic playing hand through the real gesture path — near (a large hand): the focus settles on the glass (< 0.05), the
       city's blur above the glass's; far (a small hand): it settles in the city (> 0.95), the blurs the other way round; it GLIDES (two frames after
       the hand jumped far → near it has not arrived); THE SOUND'S CLOSENESS FOLLOWS: the shared acoustic's depth («Forest depth», the same hand)
       is higher far than near. The near and far readings differing is the check's own control.
   (3) A FAR NOTE LIGHTS THE WINDOW UNDER THE LIGHT: the window the pure law names for the light's place (pure/windows.js windowPick) comes on
       (≥ 0.9 within a second), no other pick; two minutes later (the room's clock moved) it glows at the trace law's level — fading slowly, not off.
       CONTROLS: a far note with the light on the sky lights nothing; a near note lights nothing and clears the mist under the light instead.
   (4) OUT: after six switches rain ↔ forest the renderer's programs, geometries and textures and the contexts made and alive are the forest's
       baseline — nothing is left after dispose. CONTROL: inside the rain room the same count differs (the measure sees the room).
   Every wait has a limit and fails when it is reached. */
import { row } from '../core/rows.js';

const sleep=ms=>new Promise(r=>setTimeout(r, ms));
const frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
export async function checkRainRoom(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), RI=await import('../../../apps/night/rooms/index.js'), INS=await import('../../../apps/night/rooms/rain/install.js');
  const RV=await import('../../../apps/night/pure/room.js'), TN=await import('../../../apps/night/tint.js'), Wn=await import('../../../apps/night/rooms/rain/pure/windows.js'), FO=await import('../../../apps/night/rooms/rain/pure/focus.js');
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
  const depth=()=>{ const I=A.fxInstance(ST.chainKeyOf('ld'), 'fdepth'); return I ? I.params[1].cur : NaN; };
  try{
    { const why=PR.profileApply('profile.night'); n++; if(why){ miss('Night did not apply: '+why); return { cases:n, total:d.length, differences:d, notes }; } }
    { const why=RV.checkRoom(INS.RAIN.record, { ids:[RAIN] }); n++; if(why){ miss('the rain room\'s record was refused: '+why); return { cases:n, total:d.length, differences:d, notes }; } }
    if(!had && RI.roomAdd(INS.RAIN)) H.sceneRoomAdd(RAIN, { load:INS.RAIN.load, standIn:INS.RAIN.standIn, three:()=>import('../../../apps/night/vendor/three-r128/three.min.js') });
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
      /* (2) depth is focus, and the sound's closeness */
      G.handsProbe(clk, ()=>true);
      hand(0.5, 0.5, NEAR, false, 45); n+=2; const nearOk=await until(()=>st().focus<0.05, 5000), sn=st(), dn=depth();
      if(!nearOk) miss(`a near hand: the focus stays at ${sn.focus.toFixed(3)} (below 0.05 within 5 s expected)`);
      if(!(sn.blur.city>0.9 && sn.blur.glass<0.05)) miss('a near hand: the city is not the blurred one: '+JSON.stringify(sn.blur));
      hand(0.5, 0.5, FAR, false, 45); n+=3; const farOk=await until(()=>st().focus>0.95, 5000), sf=st(), df=depth();
      if(!farOk) miss(`a far hand: the focus stays at ${sf.focus.toFixed(3)} (above 0.95 within 5 s expected)`);
      if(!(sf.blur.glass>0.9 && sf.blur.city<0.05)) miss('a far hand: the glass is not the blurred one: '+JSON.stringify(sf.blur));
      notes.push(`the focus: near ${sn.focus.toFixed(3)}, far ${sf.focus.toFixed(3)}; the sound's depth («Forest depth»): near ${dn.toFixed(3)}, far ${df.toFixed(3)}`);
      if(!(df>dn+0.3)) miss(`the sound's closeness does not follow the hand's depth: «Forest depth» near ${dn}, far ${df}`);
      hand(0.5, 0.5, NEAR, false, 45); await frames(2); n++; { const f2=st().focus; if(!(f2>0.5)) miss(`the focus jumped: ${f2.toFixed(3)} two frames after the hand went near (it should glide; limit ${FO.FOCUS.maxRate} a second)`); }
      /* (3) a far note lights the window under the light; CONTROLS: the sky, a near note */
      const W=Wn.windowsLayout(); let k=-1, at=null;
      for(const [x, y] of [[0.5, 0.55], [0.4, 0.6], [0.6, 0.6], [0.5, 0.7], [0.3, 0.5], [0.7, 0.5], [0.5, 0.45]]){ hand(x, y, FAR, false, 45); await until(()=>st().focus>0.95, 5000); await sleep(500); const L=st().light, q=Wn.windowPick(W, L.x, L.y);
        if(q>=0 && st().lit[q]<0.05){ k=q; at=[x, y]; break; } }
      n++; if(k<0) miss('no place of the hand points at a dark window (the row cannot play its note)');
      else { const p0=st().picks; hand(at[0], at[1], FAR, true, 4); n+=3; const on=await until(()=>st().lit[k]>=0.9, 2000), S=st();
        if(!on) miss(`a far note on window ${k}: its light is ${S.lit[k].toFixed(3)} after 2 s (≥ 0.9 expected), last pick ${S.lastPick}`);
        if(!(S.picks>p0) || S.pickLog.slice(p0-S.picks).some(q=>q!==k)) miss(`a far note picked ${JSON.stringify(S.pickLog.slice(p0-S.picks))}, the law names only ${k}`);
        hand(at[0], at[1], FAR, false, 4); await frames(2);
        H.sceneClockDbg(performance.now()/1000+120); await frames(3); const later=st().lit[k], law=Wn.traceLevel(120); H.sceneClockDbg(null); await frames(2);
        notes.push(`window ${k} lit by a far note; two minutes later ${later.toFixed(3)} (the law: ${law.toFixed(3)})`);
        if(!(Math.abs(later-law)<=0.03 && later>0.1 && later<0.9)) miss(`two minutes after its note the window glows at ${later.toFixed(3)}, the trace law says ${law.toFixed(3)}`); }
      { hand(0.5, 0.08, FAR, false, 12); await sleep(500); const L=st().light, q=Wn.windowPick(W, L.x, L.y), p0=st().picks, l0=st().litNow; n++;
        if(q>=0) notes.push('the sky CONTROL could not run: the top of the picture points at window '+q);
        else { hand(0.5, 0.08, FAR, true, 4); await sleep(400); hand(0.5, 0.08, FAR, false, 4); const S=st(); if(S.picks!==p0 || S.litNow>l0) miss(`CONTROL: a far note on the sky lit a window (${S.picks-p0} picks, ${S.litNow-l0} more lit)`); else notes.push('CONTROL: a far note on the sky lights nothing'); } }
      { hand(0.5, 0.5, NEAR, false, 45); n+=2; const nearAgain=await until(()=>st().focus<0.05, 5000), p0=st().picks; hand(0.5, 0.5, NEAR, true, 4); await sleep(300); const S=st(), L=S.light, clear=room().wipeAtDbg(L.x+S.off.x, L.y+S.off.y);
        hand(0.5, 0.5, NEAR, false, 4);
        if(!nearAgain || S.picks!==p0) miss(`CONTROL: a near note lit a window (${S.picks-p0} picks; the focus ${S.focus.toFixed(3)})`);
        if(!(clear>0.3)) miss(`a near note did not clear the mist under the light (${clear.toFixed(3)})`); else notes.push(`a near note clears the mist under the light (${clear.toFixed(2)}) and lights no window`); }
      G.handsProbe(null);
    }
    /* (4) out: nothing left */
    for(let i=0;i<6;i++) await go(i%2 ? RAIN : FOREST);
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    await frames(4); const after=snap(); n+=5; notes.push('after six switches rain ↔ forest: '+JSON.stringify(after));
    for(const q of ['programs', 'geometries', 'textures', 'made', 'live']) if(after[q]!==base[q]) miss(`after the rain room left, ${q} is ${after[q]}, the forest's baseline ${base[q]}`);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{
    try{ G.handsProbe(null); }catch(e){} try{ REC.liveAllOff(); }catch(e){} H.sceneClockDbg(null);
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
