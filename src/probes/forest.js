/* VIS1c (RUN 6, Calm plan §10, review 2026-10-17): two rows (quick and all).
   «VIS1c forest room» — NUMBERS, never WebGL pixels (GPU-dependent): three.js r128 loads from our own origin; the room is built without a
   renderer at a PORTRAIT (390×844) and a LANDSCAPE (844×390) viewport and fed a hand for 4 s of frames: the playing light projects back onto
   the hand's play point within 0.75 px (it stays on its note row) and does not saturate; a hand at the corner saturates (the light stays
   inside the room, the coordinates are not clamped); depth 0 vs 1 moves the light ≥ 10 units deeper; the effects hand lights the second,
   dimmer light; one shadow-casting light, its map 512² on a phone-sized view, 1024² on a desktop one; portrait gets the wider view (fov 68);
   the reduced level halves the fireflies; the wild fireflies are exactly the core's step (core/fireflies.js) fed the room's own lights —
   CONTROL: the same step with one frame's lights dropped differs.
   «VIS1c backgrounds» — Calm on Dark → Camera → Forest → Dark → Forest → Camera: only the picture changes — the sound state (chains and their values, timbre,
   scale, key, voice mode, hands, master) and the note mapping (crop, canvas, view) stay EXACTLY the same; Dark and Camera keep no WebGL
   context (Dark makes none); the camera module is on only for Camera, where it draws the detected frame (the snapshot whose hands are
   shown — rule #8), not the live video; Forest opens the room (WebGL when the browser has it, else the minimal 2D stand-in — reported),
   the second time exactly as the first (closing the room is not a lost context). */
import { row } from './rows.js';
import { cv } from '../palette.js';
import { loadThree, setBackground, sceneInfo, setSceneLevel, sceneLevel, sceneRoomDbg, sceneSnapDbg } from '../views/scene/host.js';   // RUN 8: + the quality levels and the room (CALM forest picture)
import { buildForest } from '../views/scene/forest.js';
import { fliesInit, fliesStep, FOREST_FLIES } from '../core/fireflies.js';
import { stackList } from '../draw.js';
import { BUS } from '../core/bus.js';
import { profileApply, profileCurrent } from '../profile.js';
import { fxChains, chainOwners, leadIdx, scaleId, tonic, tonicCents, voiceMode, handFn, viewRect } from '../state.js';
import { fxSnapshot, masterLevel } from '../audio.js';
import { CUR, viewKeyIdOf } from '../scales.js';
import { canvas } from '../vision.js';
import { meas, frame } from './kit.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const frames=async n=>{ for(let i=0;i<n;i++) await frame(); };   // rAF, or 1 s in a hidden tab (kit.frame)

export async function checkForestRoom(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  try{
    const T=await loadThree(); n++; if(!T || T.REVISION!=='128') miss('three.js r128 did not load');
    for(const [w,h] of [[390,844],[844,390],[1280,800]]){
      const tag=`${w}×${h}`, rooms=[];
      try{
        const room=buildForest(T,{ C:cv, level:'full', w, h }); rooms.push(room);
        const st0=room.state(); n+=3;
        if(st0.fov!==(w/h<0.8?68:55)) miss(`${tag}: fov ${st0.fov}`);
        if(st0.shadows!==1) miss(`${tag}: ${st0.shadows} shadow-casting lights (1 expected)`);
        if(st0.shadowSize!==(Math.min(w,h)<600?512:1024)) miss(`${tag}: shadow map ${st0.shadowSize}`);
        const hand={ x:0.55*w, y:0.42*h, d:0.33, play:true }, lights=[];
        for(let i=0;i<240;i++){ room.update(1/60, i/60, [hand]); lights.push(room.lightsOf()); }
        const p=room.project(0); n+=2; meas(`VIS1c ${tag}: the light's distance from its play point (px)`, Math.hypot(p.x-hand.x, p.y-hand.y), 0.75, 'max');
        if(Math.hypot(p.x-hand.x, p.y-hand.y)>0.75) miss(`${tag}: the light projects to (${p.x.toFixed(2)}, ${p.y.toFixed(2)}), the hand is at (${hand.x}, ${hand.y})`);
        if(p.sat) miss(`${tag}: a hand in the middle saturated`);
        /* the wild fireflies = the core's step fed the room's own lights; CONTROL: one frame without lights differs */
        const ref=fliesInit(70, FOREST_FLIES.seed), ctl=fliesInit(70, FOREST_FLIES.seed);
        lights.forEach((L,i)=>{ fliesStep(ref, L, 1/60, i/60, 1); fliesStep(ctl, i===120 ? [] : L, 1/60, i/60, 1); });
        const at=room.state().fliesAt, eq=A=>A.every((q,i)=>q.p.every((v,k)=>v===at[i][k]));
        n+=2; if(!eq(ref)) miss(`${tag}: the room's fireflies differ from the core's step`); if(eq(ctl)) miss(`${tag}: CONTROL — fireflies with one frame's lights dropped matched (the comparison cannot fail)`);
        /* depth: near vs far */
        const deep=d01=>{ for(let i=0;i<240;i++) room.update(1/60, 4+i/60, [{ ...hand, d:d01 }]); const c=room.camera.position, s=room.state().rigs[0]; return Math.hypot(s.x-c.x, s.y-c.y, s.z-c.z); };
        const dn=deep(0), df=deep(1); n++; if(!(df-dn>=10)) miss(`${tag}: depth 0 → 1 moved the light ${(df-dn).toFixed(2)} units (≥ 10 expected)`);
        /* the effects hand: the second light on; a corner hand saturates inside the room */
        for(let i=0;i<120;i++) room.update(1/60, 9+i/60, [{ x:0.01*w, y:0.01*h, d:1, play:true }, { x:0.8*w, y:0.6*h, d:0.2, play:false }]);
        const s2=room.state(); n+=3;
        if(!(s2.rigs[1].on>0.9)) miss(`${tag}: the effects hand's light is off (${s2.rigs[1].on})`);
        if(!s2.rigs[0].sat) miss(`${tag}: a corner hand far away did not saturate`);
        const B=[-6,6,0.3,4.2,-15,3.8], r0=s2.rigs[0]; if(r0.x<B[0]-1e-9||r0.x>B[1]+1e-9||r0.y>B[3]+1e-9||r0.z<B[4]-1e-9||r0.z>B[5]+1e-9) miss(`${tag}: the saturated light left the room: ${JSON.stringify(r0)}`);
        const red=buildForest(T,{ C:cv, level:'reduced', w, h }); rooms.push(red); n++; { const s=red.state(); if(s.flies!==35 || s.trail!==8 || s.shadowSize!==512) miss(`${tag}: reduced level ${JSON.stringify({ flies:s.flies, trail:s.trail, shadow:s.shadowSize })}`); }
      } finally { for(const r of rooms) r.dispose(); }
    }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}

const soundSig=()=>JSON.stringify([fxChains, chainOwners().map(o=>fxSnapshot(o.key)), leadIdx, scaleId, tonic, tonicCents, voiceMode, handFn, masterLevel()]);
const mapSig=()=>JSON.stringify([viewRect, canvas.width, canvas.height, viewKeyIdOf(CUR())]);
export async function checkBackgrounds(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent();
  try{
    const why=profileApply('profile.calm'); n++; if(why){ miss('Calm refused: '+why); return { cases:n, total:d.length, differences:d }; }
    await setBackground('camera'); await frames(3);
    const s0=soundSig(), m0=mapSig(); let webgl=null;
    for(const bg of ['dark','camera','forest','dark','forest','camera']){
      const made0=sceneInfo().contextsMade, info=await setBackground(bg); await frames(4);
      const I=sceneInfo(), cam=stackList().find(x=>x.id==='camera'); n+=4;
      if(cam.on!==(bg==='camera')) miss(`${bg}: the camera module is ${cam.on?'on':'off'}`);
      if(soundSig()!==s0) miss(`${bg}: the sound state changed`);
      if(mapSig()!==m0) miss(`${bg}: the note mapping changed: ${mapSig()} vs ${m0}`);
      if(bg!=='forest' && I.contextsLive!==0) miss(`${bg}: ${I.contextsLive} WebGL context(s) still alive`);
      if(bg==='dark'){ n++; if(I.contextsMade!==made0) miss('Dark made a WebGL context'); }
      if(bg==='camera'){ n++; const pic=BUS.get('picture'); if(!pic || pic.tagName==='VIDEO') miss('Camera: the picture is the live video, not the detected frame (rule #8)'); }
      if(bg==='forest'){ n+=2; if(I.bg!=='forest' || (I.webgl ? I.id!=='room.forest' : I.level!=='minimal')) miss('Forest: '+JSON.stringify(I));
        if(webgl!==null && I.webgl!==webgl) miss(`Forest the second time: WebGL ${I.webgl} (the first time ${webgl}) — closing the room must not count as a lost context`); webgl=I.webgl; }
      void info;
    }
    meas('VIS1c Forest drew with WebGL in this browser (1 yes, 0 the minimal stand-in)', webgl?1:0);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d };
}
row({ calm:true, at:1007, name:'VIS1c forest room', run:()=>checkForestRoom(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ calm:true, at:1008, name:'VIS1c backgrounds', drawn:true, run:()=>checkBackgrounds(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 8 (slice 4): row «CALM forest picture» (drawn). The user saw a plain black «Forest»: the room rendered under an OPAQUE 2D canvas
   (vision.js alpha:false — its «clear» is black). (1) SHOWS: on Forest the 2D canvas is composited with screen (its black lets the room
   through) — CONTROL: on Camera it is normal (and opaque) —, and the room's own canvas draws a picture (copied in the frame it renders: not
   black); (2) NO LEAK: Forest ↔ Dark five times — each Forest makes exactly one WebGL context, each Dark leaves none; the quality levels
   high → medium → low → high keep at most one, low makes none; (3) MUSIC: three notes raise the forest's energy, which fades (τ 1.8 s) —
   CONTROL: no note, no energy; (4) DEPTH: the playing light's halo far is wider than near. */
export async function checkForestPicture(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel(), c2=canvas;
  try{
    const why=profileApply('profile.calm'); n++; if(why){ miss('Calm refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('full'); await setBackground('forest'); await frames(6);
    const I=sceneInfo(); n+=2;
    if(getComputedStyle(c2).mixBlendMode!=='screen') miss('Forest: the 2D canvas is not composited with screen ('+getComputedStyle(c2).mixBlendMode+') — the room stays hidden under it');
    if(I.webgl){ const pic=await sceneSnapDbg();   // the frame the room has JUST rendered (RUN 8: a copy in an arbitrary frame read 0 once in 3 runs — a frame the room skipped)
      if(pic==null) notes.push('the room rendered no frame within 2 s (a hidden tab?) — the picture check does not apply'); else { notes.push('the room\'s picture: mean RGB sum '+pic.toFixed(1)); if(!(pic>5)) miss('Forest: the room\'s own canvas is black (mean RGB sum '+pic.toFixed(1)+')'); } }
    else notes.push('no WebGL in this browser — the minimal 2D stand-in (the picture check does not apply)');
    await setBackground('camera'); await frames(2); n++; if(getComputedStyle(c2).mixBlendMode!=='normal') miss('CONTROL: on Camera the 2D canvas is not normal ('+getComputedStyle(c2).mixBlendMode+')');
    /* no leak */
    for(let k=0;k<5;k++){ const m0=sceneInfo().contextsMade; await setBackground('forest'); await frames(2); const a=sceneInfo(); await setBackground('dark'); await frames(1); const b=sceneInfo(); n+=2;
      if(a.webgl && a.contextsMade!==m0+1) miss(`Forest #${k+1}: ${a.contextsMade-m0} WebGL contexts made (1 expected)`);
      if(b.contextsLive!==0) miss(`Dark after Forest #${k+1}: ${b.contextsLive} WebGL context(s) alive`); }
    await setBackground('forest'); await frames(2);
    for(const lv of ['reduced','minimal','full']){ const m0=sceneInfo().contextsMade, I2=await setSceneLevel(lv); await frames(2); const I3=sceneInfo(); n+=2;
      if(I3.contextsLive>1) miss(`level ${lv}: ${I3.contextsLive} WebGL contexts alive`);
      if(lv==='minimal' && (I3.contextsLive!==0 || I3.contextsMade!==m0)) miss('level low made or kept a WebGL context'); void I2; }
    /* music and depth: the room's numbers */
    const room=sceneRoomDbg(); n++;
    if(!room) notes.push('no room object (no WebGL) — music and depth checks skipped');
    else { const hv=d01=>[{ x:c2.width*0.6, y:c2.height*0.5, d:d01, play:true }];
      for(let i=0;i<300;i++) room.update(1/60, 50+i/60, hv(0.5));
      const m0=room.state().music; for(let k=0;k<3;k++) room.glint(0, 0.8); const m1=room.state().music;
      for(let i=0;i<240;i++) room.update(1/60, 60+i/60, hv(0.5)); const m2=room.state().music; n+=3; notes.push(`music energy ${m0.toFixed(3)} → ${m1.toFixed(3)} → ${m2.toFixed(3)} after 4 s`);
      if(!(m0<0.01)) miss('CONTROL: the forest has music energy without a note ('+m0.toFixed(3)+')');
      if(!(m1>0.5)) miss('three notes did not raise the forest\'s energy ('+m1.toFixed(3)+')'); if(!(m2<m1*0.2)) miss('the energy did not fade ('+m2.toFixed(3)+')');
      for(let i=0;i<120;i++) room.update(1/60, 70+i/60, hv(0)); const hn=room.state().halo; for(let i=0;i<120;i++) room.update(1/60, 72+i/60, hv(1)); const hf=room.state().halo; n++;
      notes.push(`the light's halo near ${hn.toFixed(2)}, far ${hf.toFixed(2)}`); if(!(hf>hn*1.4)) miss(`the light's halo far (${hf.toFixed(2)}) is not wider than near (${hn.toFixed(2)})`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ calm:true, at:1008.5, name:'CALM forest picture', drawn:true, run:()=>checkForestPicture(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
