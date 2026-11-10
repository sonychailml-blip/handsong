/* VIS1c (RUN 6, Night plan §10, review 2026-10-17): two rows (quick and all).
   «VIS1c forest room» — NUMBERS, never WebGL pixels (GPU-dependent): three.js r128 loads from our own origin; the room is built without a
   renderer at a PORTRAIT (390×844) and a LANDSCAPE (844×390) viewport and fed a hand for 4 s of frames: the playing light projects back onto
   the hand's play point within 0.75 px (it stays on its note row) and does not saturate; a hand at the corner saturates (the light stays
   inside the room, the coordinates are not clamped); depth 0 vs 1 moves the light ≥ 10 units deeper; the effects hand lights the second,
   dimmer light; one shadow-casting light, its map 512² on a phone-sized view, 1024² on a desktop one; portrait gets the wider view (fov 68);
   the reduced level halves the fireflies; the wild fireflies are exactly the core's step (core/fireflies.js) fed the room's own lights —
   CONTROL: the same step with one frame's lights dropped differs.
   «VIS1c backgrounds» — Night on Dark → Camera → Forest → Dark → Forest → Camera: only the picture changes — the sound state (chains and their values, timbre,
   scale, key, voice mode, hands, master) and the note mapping (crop, canvas, view) stay EXACTLY the same; Dark and Camera keep no WebGL
   context (Dark makes none); the camera module is on only for Camera, where it draws the detected frame (the snapshot whose hands are
   shown — rule #8), not the live video; Forest opens the room (WebGL when the browser has it, else the minimal 2D stand-in — reported),
   the second time exactly as the first (closing the room is not a lost context). */
import { row } from '../core/rows.js';
import { cv } from '../../../core/palette.js';
import { loadThree, setBackground, sceneInfo, setSceneLevel, sceneLevel, sceneRoomDbg, sceneSnapDbg, sceneProgramsDbg, sceneHeldDbg, sceneBedDbg } from '../../../apps/night/scene/host.js';   // RUN 8: + the quality levels and the room (NIGHT forest picture)
import { buildForest, forestAssets } from '../../../apps/night/rooms/forest/forest.js';
import { fliesInit, fliesStep, FOREST_FLIES, depthDistance } from '../../../apps/night/rooms/forest/pure/fireflies.js';
import { ANSWERS, noteRingAmp } from '../../../apps/night/rooms/forest/pure/answers.js';   // NIGHT-6 slice 1
import { nightClockDbg } from '../../../apps/night/shell.js';
import { NIGHT, nightAt, CLOUD_PASSES } from '../../../apps/night/pure/cycle.js';   // RUN 9
import { FOREST_ROOM } from '../../../apps/night/rooms/forest/pure/room.js';   // NIGHT-3: the moods' looks are the room's
const MOOD_LOOKS=FOREST_ROOM.looks;
import { FOREST_LEVELS } from '../../../apps/night/rooms/forest/forest.js';
import { streamNear } from '../../../apps/night/rooms/forest/pure/forestlife.js';   // RUN 9 (slice 2)
import { lifePlaces } from '../../../apps/night/rooms/forest/pure/forestlife.js';   // NIGHT-6 slice 5
import { woodPlaces } from '../../../apps/night/rooms/forest/pure/wood.js';
import { forestTrunks, FOREST_SEED, PAINT_DRAWS } from '../../../apps/night/rooms/forest/pure/layout.js';
import { seeded } from '../../../core/pure/dsp.js';
import { canopyPlaces } from '../../../apps/night/rooms/forest/pure/canopy.js';   // NIGHT-6 slice 7
import { stackList } from '../../../core/legacy-ui/draw.js';
import { BUS } from '../../../core/pure/bus.js';
import { profileApply, profileCurrent } from '../../../core/profile.js';
import { fxChains, chainOwners, leadIdx, scaleId, tonic, tonicCents, voiceMode, handFn, viewRect } from '../../../core/state.js';
import { fxSnapshot, masterLevel, ambienceInfo } from '../../../core/audio.js';
import { CUR, viewKeyIdOf } from '../../../core/scales.js';
import { canvas } from '../../../core/vision.js';
import { handsProbe, processHandsProbe } from '../../../core/gestures.js';   // RUN 9: a hand in view for the drawn wave check
import { pose } from '../../../core/gestures/pose.js';
import { meas, frame } from '../core/kit.js';

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
        const red=buildForest(T,{ C:cv, level:'reduced', w, h }); rooms.push(red); n++; { const s=red.state(); if(s.flies!==35 || s.trail!==8 || s.shadowSize!==0 || s.shadows!==0) miss(`${tag}: reduced level ${JSON.stringify({ flies:s.flies, trail:s.trail, shadow:s.shadowSize, shadows:s.shadows })}`); }
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
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d }; }
    await setBackground('camera'); await frames(3);
    const s0=soundSig(), m0=mapSig(); let webgl=null;
    for(const bg of ['dark','camera','forest','dark','forest','camera']){
      /* SPLIT-2: opening a room compiles its shaders (seconds under software GL) — slow frames, not a hidden tab; this row reads state, not the drawn window */
      const made0=sceneInfo().contextsMade, info=await setBackground(bg);
      if(document.hidden) await frames(4); else for(let k=0;k<4;k++) await new Promise(res=>{ requestAnimationFrame(res); setTimeout(res,6000); });
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
row({ night:true, at:1007, name:'VIS1c forest room', run:()=>checkForestRoom(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ night:true, at:1008, name:'VIS1c backgrounds', drawn:true, run:()=>checkBackgrounds(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 8 (slice 4): row «NIGHT forest picture» (drawn). The user saw a plain black «Forest»: the room rendered under an OPAQUE 2D canvas
   (vision.js alpha:false — its «clear» is black). (1) SHOWS: on Forest the 2D canvas is composited with screen (its black lets the room
   through) — CONTROL: on Camera it is normal (and opaque) —, and the room's own canvas draws a picture (copied in the frame it renders: not
   black); (2) NO LEAK: Forest ↔ Dark five times — each Forest makes exactly one WebGL context, each Dark leaves none; the quality levels
   high → medium → low → high keep at most one, low makes none; (3) MUSIC: three notes raise the forest's energy, which fades (τ 1.8 s) —
   CONTROL: no note, no energy; (4) DEPTH: the playing light's halo far is wider than near. */
export async function checkForestPicture(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel(), c2=canvas;
  try{
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
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
    if(room){ n++; const nm=room.state().night; if(nm.mood!==scaleId) miss(`RUN 9: the room's mood is ${nm.mood}, the shell's mood ${scaleId} (the bus «nightSky» does not reach the room)`); }   // RUN 9
    if(room){ const wi=(BUS.get('nightSky')||{}).wind, A=ambienceInfo(); n++;   // RUN 9 (slice 3): the ambience's wind reaches the room
      if(!wi || (A && A.on ? Math.abs(wi.level-A.level)>1e-9 : wi.level!==0)) miss('the wind on the bus '+JSON.stringify(wi)+' vs the ambience '+JSON.stringify(A && { on:A.on, level:A.level }));
      else notes.push(`wind: level ${wi.level.toFixed(2)}, gust ${wi.gust.toFixed(2)} → the leaves' sway ${room.state().life.sway.toFixed(3)}`); }
    { const pr=sceneProgramsDbg(); n++; if(pr){ notes.push(`shader programs: ${pr.length}, failed ${pr.filter(p=>!p.ok).length}`); if(!pr.length || pr.some(p=>!p.ok)) miss('a shader program failed to compile: '+JSON.stringify(pr.filter(p=>!p.ok).map(p=>p.name))); } }   // RUN 9: the patched and new shaders compile
    if(!room) notes.push('no room object (no WebGL) — music and depth checks skipped');
    else { const hv=d01=>[{ x:c2.width*0.6, y:c2.height*0.5, d:d01, play:true }];
      for(let i=0;i<300;i++) room.update(1/60, 50+i/60, hv(0.5));
      const m0=room.state().music; for(let k=0;k<3;k++) room.glint(0, 0.8); const m1=room.state().music;
      for(let i=0;i<240;i++) room.update(1/60, 60+i/60, hv(0.5)); const m2=room.state().music; n+=3; notes.push(`music energy ${m0.toFixed(3)} → ${m1.toFixed(3)} → ${m2.toFixed(3)} after 4 s`);
      if(!(m0<0.01)) miss('CONTROL: the forest has music energy without a note ('+m0.toFixed(3)+')');
      if(!(m1>0.5)) miss('three notes did not raise the forest\'s energy ('+m1.toFixed(3)+')'); if(!(m2<m1*0.2)) miss('the energy did not fade ('+m2.toFixed(3)+')');
      for(let i=0;i<120;i++) room.update(1/60, 70+i/60, hv(0)); const hn=room.state().halo; for(let i=0;i<120;i++) room.update(1/60, 72+i/60, hv(1)); const hf=room.state().halo; n++;
      notes.push(`the light's halo near ${hn.toFixed(2)}, far ${hf.toFixed(2)}`); if(!(hf>hn*1.4)) miss(`the light's halo far (${hf.toFixed(2)}) is not wider than near (${hn.toFixed(2)})`); }
    if(room){ n++; const tp=performance.now(); BUS.push('notes',{ kind:'on', owner:'probe:held', role:'ld', vel:0.5, when:null }); await sleep(1100); const h1=sceneHeldDbg('probe:held'), hr=room.state().rare.held, el=(performance.now()-tp)/1000;   // RUN 9 (slice 4): a held note reaches the room
      BUS.push('notes',{ kind:'off', owner:'probe:held', role:'ld', when:null }); await sleep(150); const h2=sceneHeldDbg('probe:held');
      if(!(h1>=0.9 && Math.abs(h1-el)<0.25) || h2!==null || !(hr>=Math.min(h1,30)-0.25)) miss('the held note seen by the host: '+h1+' s after '+el.toFixed(3)+' s, '+h2+' after its end; the room got '+hr); }
    /* RUN 9 (slice 2): the ground wave of a note RENDERS — ONE frame rendered twice, the waves' gain 1 then 0 (exact: nothing else changes
       between the two renders); CONTROL: the same pair with nothing switched differs by exactly 0 */
    if(room && room.lifeDbg){ const clk={ t:7e6, W:c2.width, H:c2.height }, U=room.lifeDbg.U, dif=[]; handsProbe(clk, ()=>true);
      try{ for(let i=0;i<14;i++){ clk.t+=33; processHandsProbe({ landmarks:[pose({ x:0.5, y:0.75, s:0.22 })], handednesses:[[{ categoryName:'Right' }]] }); }
        await sleep(1500);
        for(let k=0;k<3;k++){ room.glint(0,1); await sleep(280); } await sleep(150);   // three rings on the ground in the measured frame
        const ab=await sceneSnapDbg(on=>{ U.uGWK.value= on ? 0 : 1; }), cc=await sceneSnapDbg(()=>{});
        if(ab && cc){ dif.push(ab[0]-ab[1], cc[0]-cc[1]); }
      } finally { U.uGWK.value=1; handsProbe(null); }
      if(dif.length===2){ n+=2; notes.push(`three notes' ground waves add ${dif[0].toFixed(2)} to the mean RGB sum of one frame (CONTROL the same frame twice: ${dif[1].toFixed(3)})`);
        if(!(dif[0]>=1)) miss('the ground wave does not show in the picture: '+dif[0].toFixed(2)); if(dif[1]!==0) miss('CONTROL: one frame rendered twice differs by '+dif[1]); }
      else notes.push('the room rendered no frame — the drawn wave check does not apply'); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.5, name:'NIGHT forest picture', drawn:true, run:()=>checkForestPicture(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 9 (slice 1): row «FOREST night cycle» — NUMBERS from the room built without a renderer (as «VIS1c forest room»): the moon sits where
   core/night.js puts it and its light is 0.3 × the moon's light under the clouds; over one whole cycle the moon drifts, clouds cover it (their
   sprites show) and its light dims and returns, every mist layer rolls in and out; the cycle is SEAMLESS (t and t + period draw the same);
   the SLEEP deepens the night (moon and sky light ≤ 0.5×, the wild lights 0.4×) — CONTROL: sleep 0 equals no sleep input; a MOOD eases the
   palette to its look's tokens (Dusk's fog colour within 2 % after 20 s) — CONTROL: Glow stays on the base fog. */
export async function checkNightCycle(){
  const d=[]; let n=0; const miss=s=>d.push(s), notes=[];
  try{
    const T=await loadThree(), w=844, h=390, P=NIGHT.period, mk=()=>buildForest(T,{ C:cv, level:'full', w, h }), rooms=[];
    try{
      const room=mk(); rooms.push(room); const hv=[{ x:0.6*w, y:0.5*h, d:0.4, play:true }];
      const at=(t, nin, r=room)=>{ r.update(1/60, t, hv, null, nin); return r.state().night; };
      for(let i=0;i<120;i++) at(i/60, { mood:'major-penta', sleep:0 });
      const s0=at(300, { mood:'major-penta', sleep:0 }), c0=nightAt(300); n+=2;
      if(Math.hypot(s0.moon[0]-c0.moon[0], s0.moon[1]-c0.moon[1], s0.moon[2]-c0.moon[2])>1e-6) miss('the moon is not where the core puts it: '+JSON.stringify(s0.moon)+' vs '+JSON.stringify(c0.moon));
      if(Math.abs(s0.moonI-0.3*c0.moonLight)>1e-6) miss(`the moon's light ${s0.moonI} is not 0.3 × ${c0.moonLight}`);
      const S=[]; for(let t=0;t<=P;t+=10) S.push(at(t, { mood:'major-penta', sleep:0 }));
      const rng=a=>Math.max(...a)-Math.min(...a), xs=S.map(s=>s.moon[0]), mi=S.map(s=>s.moonI), cl=S.map(s=>Math.max(...s.clouds)); n+=4;
      if(!(rng(xs)>=8)) miss('the moon drifts only '+rng(xs).toFixed(2)+' units in a cycle');
      if(!(Math.min(...mi)<=0.3*0.45 && Math.max(...mi)>=0.3-1e-9)) miss(`the moon's light ranges ${Math.min(...mi).toFixed(3)}…${Math.max(...mi).toFixed(3)} (≤ 0.135 and 0.3 expected)`);
      if(!(Math.max(...cl)>0.4)) miss('no cloud sprite shows over the moon in a whole cycle ('+Math.max(...cl).toFixed(2)+')');
      const mis=[0,1,2,3].map(k=>rng(S.map(s=>s.mist[k]))); if(mis.some(v=>v<0.1)) miss('a mist layer stays still: '+mis.map(v=>v.toFixed(2)).join(' / '));
      notes.push(`moon x ${Math.min(...xs).toFixed(1)}…${Math.max(...xs).toFixed(1)} · its light ${Math.min(...mi).toFixed(3)}…${Math.max(...mi).toFixed(3)} · clouds up to ${Math.max(...cl).toFixed(2)} · mist ranges ${mis.map(v=>v.toFixed(2)).join(' / ')}`);
      const a=at(200, { mood:'major-penta', sleep:0 }), b=at(200+P, { mood:'major-penta', sleep:0 }), keys=['moonI','fog'], dif=Math.max(...keys.map(k=>Math.abs(a[k]-b[k])), ...a.moon.map((v,i)=>Math.abs(v-b.moon[i])), ...a.mist.map((v,i)=>Math.abs(v-b.mist[i])), ...a.clouds.map((v,i)=>Math.abs(v-b.clouds[i]))); n++;
      if(dif>1e-6) miss('the cycle is not seamless in the room: t and t + period differ by '+dif);
      /* sleep */
      const r2=mk(), r3=mk(); rooms.push(r2, r3);
      for(let i=0;i<60;i++){ at(400+i/60, { mood:'major-penta', sleep:1 }, r2); at(400+i/60, { mood:'major-penta' }, r3); }
      const z=at(401, { mood:'major-penta', sleep:0 }), q=at(401, { mood:'major-penta', sleep:1 }, r2), u=at(401, { mood:'major-penta' }, r3), hz=room.state().hemi, hq=r2.state().hemi; n+=4;
      if(!(q.moonI<=0.5*z.moonI+1e-9)) miss(`sleep 1: the moon's light ${q.moonI.toFixed(3)} (awake ${z.moonI.toFixed(3)})`);
      if(!(hq<=0.5*hz+1e-9)) miss(`sleep 1: the sky ${hq.toFixed(3)} (awake ${hz.toFixed(3)})`);
      if(Math.abs(q.flies-0.4)>1e-9) miss('sleep 1: the wild lights × '+q.flies);
      if(Math.abs(u.moonI-z.moonI)>1e-12 || Math.abs(u.flies-z.flies)>1e-12) miss('CONTROL: no sleep input differs from sleep 0');
      /* mood */
      const r4=mk(); rooms.push(r4); for(let i=0;i<1200;i++) at(500+i/60, { mood:'minor-penta', sleep:0 }, r4);
      const dk=at(520, { mood:'minor-penta', sleep:0 }, r4), want=new T.Color(cv(MOOD_LOOKS.dusk.tokens.fog)), got=new T.Color('#'+dk.fogHex), gl=new T.Color(cv(MOOD_LOOKS.glow.tokens.fog)); n+=2;
      const cd=(x,y)=>Math.max(Math.abs(x.r-y.r), Math.abs(x.g-y.g), Math.abs(x.b-y.b));
      if(cd(got,want)>0.02) miss(`Dusk: the fog is #${dk.fogHex}, its look's token ${cv(MOOD_LOOKS.dusk.tokens.fog)}`);
      if(cd(new T.Color('#'+at(520, { mood:'major-penta', sleep:0 }).fogHex), gl)>0.004) miss('CONTROL: Glow left the base fog colour');
      notes.push(`Dusk fog #${dk.fogHex} (token ${cv(MOOD_LOOKS.dusk.tokens.fog)}), sleep 1: moon light ${q.moonI.toFixed(3)} vs ${z.moonI.toFixed(3)}`);
    } finally { for(const r of rooms) r.dispose(); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.6, name:'FOREST night cycle', run:()=>checkNightCycle(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 9 (slice 2): row «FOREST response» — NUMBERS from the room built without a renderer: a note sends ONE ground wave from the light's
   ground point (CONTROL no note, no wave) and it ends after its life; the mushroom or flower nearest the light pulses ≥ 5× one 6 units away
   and fades (CONTROL no note, every pulse 0); the wild fireflies GATHER to a light that plays (≥ 1.5× near it after 12 s vs a light that
   does not) and SCATTER when it stops; Echo puts rings ON THE STREAM (each on its line; CONTROL echo 0, none); Wave shimmers the leaves (the
   uniform = the effect; CONTROL 0); Warmth colours the ground waves (= the light's colour, warm); a mood colours the mushrooms (Dusk's token
   within 2 %). */
export async function checkForestResponse(){
  const d=[]; let n=0; const miss=s=>d.push(s), notes=[];
  try{
    const T=await loadThree(), w=844, h=390, rooms=[], mk=()=>{ const r=buildForest(T,{ C:cv, level:'full', w, h }); rooms.push(r); return r; };
    const hv=[{ x:0.5*w, y:0.62*h, d:0.25, play:true }], FX0={ echo:0, time:0.3, fb:0.5, tone:0.5, wave:0 };
    const run=(r, t0, sec, fx=FX0, nin={ mood:'major-penta', sleep:0 }, every=0, vel=0.8)=>{ let next=t0; for(let i=0;i<Math.round(sec*60);i++){ const t=t0+i/60; if(every && t>=next){ r.glint(0, vel); next+=every; } r.update(1/60, t, hv, fx, nin); } return r.state(); };
    try{
      /* waves and pulses */
      const A=mk(); let s=run(A, 0, 3); n+=2;
      if(s.life.ground.length!==0) miss('CONTROL: a ground wave without a note');
      if(s.life.places.some(p=>p.pulse!==0)) miss('CONTROL: a pulse without a note');
      const L0=s.rigs[0]; A.glint(0, 0.8); s=A.state(); const g=s.life.ground; n+=2;
      if(g.length!==1) miss(g.length+' ground waves after one note');
      else if(Math.hypot(g[0].x-L0.x, g[0].z-L0.z)>1e-9) miss(`the wave starts at (${g[0].x.toFixed(2)}, ${g[0].z.toFixed(2)}), the light is over (${L0.x.toFixed(2)}, ${L0.z.toFixed(2)})`);
      const P=s.life.places.map(p=>({ ...p, dl:Math.hypot(p.x-L0.x, p.z-L0.z) })), pn=P.reduce((a,b)=>a.dl<b.dl?a:b), pf=P.filter(p=>p.dl>6); n+=2;
      if(!(pn.pulse>=0.15 && pf.every(p=>p.pulse*5<=pn.pulse))) miss(`the nearest (${pn.dl.toFixed(2)} away) pulses ${pn.pulse.toFixed(3)}, the far ones up to ${Math.max(0,...pf.map(p=>p.pulse)).toFixed(3)}`);
      s=run(A, 3, 3.2); const pn2=s.life.places.find(p=>p.x===pn.x && p.z===pn.z); if(s.life.ground.length!==0 || !(pn2.pulse<0.1*pn.pulse)) miss(`after 3.2 s: ${s.life.ground.length} waves, the pulse ${pn2.pulse.toFixed(3)}`);
      notes.push(`the nearest mushroom / flower ${pn.dl.toFixed(2)} from the light pulses ${pn.pulse.toFixed(3)}`);
      /* gather and scatter */
      const B=mk(), Cr=mk(), near=st=>{ const r=st.rigs[0]; return st.fliesAt.filter(p=>Math.hypot(p[0]-r.x, p[1]-r.y, p[2]-r.z)<3).length; };
      const sb=run(B, 0, 12, FX0, undefined, 0.5), sc=run(Cr, 0, 12), nb=near(sb), nc=near(sc); n+=2;
      if(!(nb>=Math.max(4, 1.5*nc))) miss(`a playing light gathers ${nb} fireflies within 3 (a silent one ${nc})`);
      if(!sb.life.playing || !(sb.life.gather>0.9)) miss('playing: '+JSON.stringify({ playing:sb.life.playing, gather:sb.life.gather }));
      const sb2=run(B, 12, 10), nb2=near(sb2); n++; if(!(nb2<nb && !sb2.life.playing)) miss(`after 10 s of silence ${nb2} stay near (playing ${nb})`);
      notes.push(`fireflies within 3 of the light: playing ${nb}, silent ${nc}, 10 s after the playing stopped ${nb2}`);
      /* Echo → rings on the water; Wave → shimmer; Warmth → the waves' colour */
      const D=mk(), FXE={ echo:0.8, time:0.3, fb:0.5, tone:0, wave:0.7 }; run(D, 0, 1, FXE); D.glint(0, 0.8); let se=run(D, 1, 1.0, FXE); n+=4;
      const echoes=x=>x.life.water.filter(r=>r.kind==='echo').length;   // NIGHT-6: a note's own stream ring is kind 'note'
      if(!(echoes(se)>=2)) miss(echoes(se)+' echo rings on the water 1 s after a note with Echo 0.8 (≥ 2 expected)');
      for(const r of se.life.water){ if(streamNear(r.x, r.z).d>1e-6) miss(`a water ring off the stream (${r.x.toFixed(2)}, ${r.z.toFixed(2)})`); }
      if(se.life.shimmer!==0.7) miss('Wave 0.7: the leaves shimmer '+se.life.shimmer);
      const wc=se.life.waveCol, lc=se.fx.color; if(Math.max(...wc.map((v,i)=>Math.abs(v-lc[i])))>1e-6 || !(wc[0]>wc[2])) miss('Warmth: the colour of the waves '+JSON.stringify(wc)+' vs the light '+JSON.stringify(lc));
      const E=mk(); run(E, 0, 1); E.glint(0, 0.8); const s0=run(E, 1, 1.0); n+=2;
      if(echoes(s0)!==0) miss('CONTROL: echo rings without Echo'); if(s0.life.shimmer!==0) miss('CONTROL: the leaves shimmer without Wave');
      /* a mood colours the mushrooms */
      const G=mk(); const sg=run(G, 0, 20, FX0, { mood:'minor-penta', sleep:0 }), want=new T.Color(cv(MOOD_LOOKS.dusk.tokens.shroom)), c=sg.life.shroomCol; n++;
      if(Math.max(Math.abs(c[0]-want.r), Math.abs(c[1]-want.g), Math.abs(c[2]-want.b))>0.02) miss('Dusk: the mushrooms '+JSON.stringify(c)+' vs its token '+cv(MOOD_LOOKS.dusk.tokens.shroom));
    } finally { for(const r of rooms) r.dispose(); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.62, name:'FOREST response', run:()=>checkForestResponse(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 9 (slice 3): row «FOREST detail» — NUMBERS from the room built without a renderer: each level draws its defined counts (grass blades,
   leaves, moths, moonbeams); the leaves sway with the WIND from the bus (ambience level 1 at the gust's top → sway 1; no ambience → the still
   air 0.25 — CONTROL; the sleep stills it × 0.3); the moths gather round the playing light (all within 1.6, fully visible) and fade when it
   goes (< 0.1 after 4 s); the moonbeams follow the moon's light (a cloud dims them ≤ 0.6×; the deep sleep ≤ 0.25×); the foreground
   silhouettes stay off the middle of the screen (no box crosses the central 40 % × 40 %, portrait and landscape) — CONTROL a box at the
   centre is caught. */
export async function checkForestDetail(){
  const d=[]; let n=0; const miss=s=>d.push(s), notes=[];
  try{
    const T=await loadThree(), rooms=[], mk=(lv,w,h)=>{ const r=buildForest(T,{ C:cv, level:lv, w, h }); rooms.push(r); return r; };
    try{
      for(const lv of ['full','reduced']){ const r=mk(lv,844,390); r.update(1/60, 1, [], null, null); const s=r.state().detail, L=FOREST_LEVELS[lv]; n+=4;
        if(s.grass!==L.grass) miss(`${lv}: ${s.grass} grass blades (${L.grass} expected)`); if(s.leaves!==L.leaves) miss(`${lv}: ${s.leaves} leaves`);
        if(s.moths.length!==L.moths) miss(`${lv}: ${s.moths.length} moths`); if(s.beams.length!==L.beams) miss(`${lv}: ${s.beams.length} moonbeams`); }
      const w=844, h=390, R=mk('full', w, h), hv=[{ x:0.5*w, y:0.55*h, d:0.3, play:true }];
      const run=(t0, sec, nin, hands=hv)=>{ for(let i=0;i<Math.round(sec*60);i++) R.update(1/60, t0+i/60, hands, null, nin); return R.state(); };
      let s=run(0, 0.2, { mood:'major-penta', sleep:0, wind:{ level:1, gust:1 } }); n+=2;
      if(Math.abs(s.life.sway-1)>1e-9 || s.detail.wind!==s.life.sway) miss('wind 1 at the gust: sway '+s.life.sway+', the leaves '+s.detail.wind);
      s=run(1, 0.2, { mood:'major-penta', sleep:0 }); if(Math.abs(s.life.sway-0.25)>1e-9) miss('CONTROL: no ambience — sway '+s.life.sway+' (the still air 0.25)');
      s=run(2, 0.2, { mood:'major-penta', sleep:1, wind:{ level:1, gust:1 } }); n++; if(Math.abs(s.life.sway-0.3)>1e-9) miss('sleep 1: sway '+s.life.sway+' (0.3 expected)');
      s=run(3, 3, { mood:'major-penta', sleep:0 }); const L0=s.rigs[0], far=s.detail.moths.map(m=>Math.hypot(m.x-L0.x, m.y-L0.y, m.z-L0.z)); n+=2;
      if(far.some(x=>x>1.6)) miss('a moth is '+Math.max(...far).toFixed(2)+' from the light after 3 s'); if(s.detail.moths.some(m=>m.a<0.9)) miss('the moths are not fully visible at the light');
      s=run(6, 4, { mood:'major-penta', sleep:0 }, []); n++; if(s.detail.moths.some(m=>m.a>=0.1)) miss('the moths did not fade 4 s after the light went: '+s.detail.moths.map(m=>m.a.toFixed(2)).join(' '));
      const cl=CLOUD_PASSES.reduce((a,b)=>a.dens>b.dens?a:b), beam=(t,sl)=>{ const v=run(t, 0.05, { mood:'major-penta', sleep:sl }, []).detail.beams; return v.reduce((a,b)=>a+b,0); };
      const b0=beam(60,0), b1=beam(cl.at,0), b2=beam(60.2,1); n+=2;
      if(!(b1<=0.6*b0)) miss(`a cloud (density ${cl.dens.toFixed(2)}) dims the moonbeams only to ${(b1/b0).toFixed(2)}×`); if(!(b2<=0.25*b0)) miss(`deep sleep: the moonbeams ${(b2/b0).toFixed(2)}×`);
      notes.push(`moonbeams: clear ${b0.toFixed(3)}, under the densest cloud ${(b1/b0).toFixed(2)}×, deep sleep ${(b2/b0).toFixed(2)}× · moths within ${Math.max(...far).toFixed(2)} of the light`);
      const hit=b=>!(b.x1<=-0.4 || b.x0>=0.4 || b.y1<=-0.4 || b.y0>=0.4);
      for(const [W2,H2] of [[390,844],[844,390]]){ const r=mk('full', W2, H2); r.update(1/60, 1, [], null, null); const B=r.detailDbg.silBoxes(r.camera); n+=B.length;
        for(const b of B) if(hit(b)) miss(`${W2}×${H2}: the ${b.kind} silhouette crosses the middle: x ${b.x0.toFixed(2)}…${b.x1.toFixed(2)}, y ${b.y0.toFixed(2)}…${b.y1.toFixed(2)}`);
        notes.push(`${W2}×${H2} silhouettes: `+B.map(b=>`${b.kind} x ${b.x0.toFixed(2)}…${b.x1.toFixed(2)} y ${b.y0.toFixed(2)}…${b.y1.toFixed(2)}`).join(' · ')); }
      n++; if(!hit({ x0:-0.1, x1:0.1, y0:-0.1, y1:0.1 })) miss('CONTROL: a box at the centre was not caught');
    } finally { for(const r of rooms) r.dispose(); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.64, name:'FOREST detail', run:()=>checkForestDetail(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 9 (slice 4): row «FOREST rare events» — NUMBERS from the room built without a renderer. The FALLING STAR shows and moves down, gone
   after 1.4 s; the FLOWER opens fully in 3 s near the light's foot (never in the water) and closes and goes after ~25 s; the EMBLEM: its 15
   fireflies (3 per dot) reach their points (mean <= 0.15) while it holds — CONTROL: the same flies were far (> 1) before — and are let go
   after; the room's own schedule over 12 quiet minutes: >= 3 events, stars and emblems only, never twice in a row; a note held 3 s, a minute
   after the last event, opens a flower. */
export async function checkForestRare(){
  const d=[]; let n=0; const miss=s=>d.push(s), notes=[];
  try{
    const T=await loadThree(), w=844, h=390, rooms=[], mk=()=>{ const r=buildForest(T,{ C:cv, level:'full', w, h }); rooms.push(r); return r; };
    const hv=[{ x:0.5*w, y:0.62*h, d:0.25, play:true }], NIN={ mood:'major-penta', sleep:0 };
    const dist=(A,ids,to)=>ids.reduce((a,k,i)=>a+Math.hypot(A[k][0]-to[i][0], A[k][1]-to[i][1], A[k][2]-to[i][2]),0)/ids.length;
    try{
      const r=mk(); let t=0; const go=(sec, hands=hv, fps=60)=>{ for(let i=0;i<Math.round(sec*fps);i++){ t+=1/fps; r.update(1/fps, t, hands, null, NIN); } return r.state(); };
      go(1); r.rareDbg('star'); const y0=go(0.2).rare.star, s1=go(0.5).rare.star, s2=go(1).rare.star; n+=2;
      if(!y0 || !s1 || !(s1.on>0.3) || !(s1.y<y0.y)) miss('the falling star: '+JSON.stringify([y0, s1])); if(s2) miss('the star is still there after 1.7 s');
      const L=go(0.1).rigs[0]; r.rareDbg('bloom'); let s=go(3.2).rare.bloom; n+=3;
      if(!s || !(s.open>0.99)) miss('the flower after 3.2 s: '+JSON.stringify(s));
      else { if(streamNear(s.x, s.z).d<0.42+0.25-1e-9) miss('the flower opened in the water'); if(Math.hypot(s.x-L.x, s.z-L.z)>1.5) miss('the flower is '+Math.hypot(s.x-L.x, s.z-L.z).toFixed(2)+' from the light'); }
      s=go(22.5).rare.bloom; if(s) miss('the flower is still there after 25.7 s: '+JSON.stringify(s));
      const at=r.state().fliesAt; r.rareDbg('emblem'); const e0=r.state().rare.emblem, far=dist(at, e0.ids, e0.to);
      const e1=go(3.5).rare.emblem; n+=4;
      if(e0.ids.length!==15) miss(e0.ids.length+' fireflies in the emblem (15 expected)');
      if(!(far>1)) miss('CONTROL: the emblem flies were already near their points ('+far.toFixed(2)+')');
      if(!e1 || !(e1.err<=0.15)) miss('the emblem did not form: mean distance '+(e1 && e1.err!=null ? e1.err.toFixed(3) : 'none'));
      const gone=dist(go(6).fliesAt, e0.ids, e0.to); if(r.state().rare.emblem || !(gone>0.4)) miss('the emblem flies were not let go: '+gone.toFixed(2));
      notes.push('emblem: before '+far.toFixed(2)+', formed '+(e1?e1.err.toFixed(3):'none')+', let go '+gone.toFixed(2));
      /* the room's own schedule */
      const q=mk(); let tq=0; for(let i=0;i<7200;i++){ tq+=0.1; q.update(0.1, tq, [], null, NIN); } const H=q.state().rare.hist; n+=2;
      if(!(H.length>=3) || H.some(e=>e.kind==='bloom')) miss('12 quiet minutes: '+JSON.stringify(H));
      if(H.some((e,i)=>i && e.kind===H[i-1].kind)) miss('the same event twice in a row: '+H.map(e=>e.kind).join(' '));
      notes.push('12 quiet minutes: '+H.map(e=>e.kind+' '+e.t.toFixed(0)+' s').join(', '));
      const last=H.length ? H[H.length-1].t : 0; for(let i=0;i<20;i++){ tq+=0.1; q.update(0.1, tq, hv, null, NIN); } while(tq<last+61){ tq+=0.1; q.update(0.1, tq, hv, null, NIN); } q.held(3); tq+=0.1; q.update(0.1, tq, hv, null, NIN);
      const H2=q.state().rare.hist; n++; if(!H2.length || H2[H2.length-1].kind!=='bloom') miss('a note held 3 s a minute after the last event did not open a flower: '+H2.map(e=>e.kind).join(' '));
    } finally { for(const r of rooms) r.dispose(); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.66, name:'FOREST rare events', run:()=>checkForestRare(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* RUN 9 (slice 5): row «FOREST levels» (drawn) — each quality level draws what it should: high renders at 0.85 and medium at 0.6 of the CSS
   pixels (never above one device pixel each), 60 / 30 fps caps, the light's shadow only at high, low makes no WebGL context; the room's own
   counts per level are «FOREST detail»'s. The shaders are compiled INSIDE the opening (the programs exist before the first frame — a compile
   inside a frame stalled it 1–4 s); the first hand in view recompiles NOTHING (its light was always in the scene) — CONTROL: one more light
   in the scene does make new programs. */
export async function checkForestLevels(){
  const d=[]; let n=0; const miss=s=>d.push(s), notes=[];
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    const dp=Math.min(devicePixelRatio||1, 1), WANT={ full:{ pr:0.85*dp, fps:60, shadow:true }, reduced:{ pr:0.6*dp, fps:30, shadow:false } };
    for(const lv of ['full','reduced','minimal']){
      await setBackground('dark'); await setSceneLevel(lv); await setBackground('forest'); const I0=sceneInfo(); await frames(3); const I=sceneInfo(); n+=2;
      if(lv==='minimal'){ if(I.webgl || I.contextsLive!==0) miss('low made a WebGL context'); notes.push('low: no WebGL (the 2D stand-in)'); continue; }
      const W=WANT[lv]; if(Math.abs(I.pixelRatio-W.pr)>1e-9 || I.fpsCap!==W.fps || I.shadow!==W.shadow) miss(`${lv}: ${JSON.stringify({ pr:I.pixelRatio, fps:I.fpsCap, shadow:I.shadow })} (${JSON.stringify(W)} expected)`);
      n++; if(!(I0.programs>=10)) miss(`${lv}: ${I0.programs} shader programs right after the opening (compiled inside it expected)`);
      notes.push(`${lv}: pixel ratio ${I.pixelRatio}, ${I.fpsCap} fps cap, shadow ${I.shadow}, ${I0.programs} programs compiled in the opening (${I0.openMs} ms)`);
    }
    /* the first hand recompiles nothing; CONTROL: one more light does */
    await setBackground('dark'); await setSceneLevel('full'); await setBackground('forest'); await frames(4);
    const p0=sceneInfo().programs, room=sceneRoomDbg(), clk={ t:8e6, W:canvas.width, H:canvas.height }; handsProbe(clk, ()=>true);
    try{ for(let i=0;i<14;i++){ clk.t+=33; processHandsProbe({ landmarks:[pose({ x:0.65, y:0.6, s:0.22 }), pose({ x:0.3, y:0.55, s:0.2 })], handednesses:[[{ categoryName:'Right' }],[{ categoryName:'Left' }]] }); }
      await sleep(900); } finally { handsProbe(null); }
    const on=room ? room.state().rigs.map(r=>r.on) : [], p1=sceneInfo().programs; n+=2;
    if(!(on[0]>0.5 && on[1]>0.5)) miss('the two hands did not light the room: '+JSON.stringify(on));
    if(p1!==p0) miss(`the first hands recompiled: ${p0} → ${p1} programs`);
    const T=globalThis.THREE; if(room && T){ const extra=new T.PointLight(0xffffff, 0.5, 3); room.scene.add(extra); await frames(3); const p2=sceneInfo().programs; room.scene.remove(extra); n++;
      if(!(p2>p1)) miss(`CONTROL: one more light made no new program (${p1} → ${p2}) — the recompile check cannot fail`); notes.push(`programs: ${p0} before the hands, ${p1} with them; CONTROL one more light ${p2}`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.68, name:'FOREST levels', drawn:true, run:()=>checkForestLevels(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 1: row «FOREST answers» — NUMBERS from the room built without a renderer, then the host's delivery on the opened forest.
   (1) each level draws its dew and webs (the web FILE reached the room); the baseline override (dew 0, webs 0 — «Measure this device»'s step
   before NIGHT-6) draws none; (2) a web lit by the playing light is ≥ 5× itself unlit — CONTROL: with no hand every web is at its base glow;
   (3) a note RINGS THE STREAM at its nearest point with the law's amplitude — CONTROL: a note with no light makes none; (4) the MUSIC BED: a
   chord heard at `at` swells the mushrooms from the first frame at or after `at` (CONTROL: nothing in the frame before), never above
   ANSWERS.bed.max; a loop note lights only its own cluster; a glass note makes one far firefly twinkle; (5) DELIVERY (drawn): with a synthetic
   audio clock whose output latency is 0.15 s, the host hands a bed event to the room at the time it is heard, and the room fires it in that
   frame — CONTROL: the mapping that ignores the latency hands it 150 ms early; (6) the dew and the webs RENDER (one frame drawn twice, them
   hidden the second time; CONTROL the same frame twice differs by 0). */
export async function checkForestAnswers(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv='full', o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, ...o }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 }, run=(r, t0, sec, hands=[])=>{ for(let i=0;i<Math.round(sec*60);i++) r.update(1/60, t0+i/60, hands, null, NIN); return r.state(); };
    try{
      for(const lv of ['full','reduced']){ const s=mk(lv).state(), L=FOREST_LEVELS[lv]; n+=3;
        if(s.answers.dew!==L.dew) miss(`${lv}: ${s.answers.dew} dew points (${L.dew})`);
        if(!(s.answers.webs.length>=Math.min(4, L.webs) && s.answers.webs.length<=L.webs)) miss(`${lv}: ${s.answers.webs.length} webs (${L.webs} asked)`);
        if(!s.answers.webTex || !s.files.web) miss(`${lv}: the web file did not reach the room (${JSON.stringify(s.files)})`);
        notes.push(`${lv}: ${s.answers.dew} dew points, ${s.answers.webs.length} webs`); }
      { const s=mk('reduced', { lv:{ dew:0, webs:0 } }).state().answers; n++; if(s.dew!==0 || s.webs.length!==0) miss('the baseline override still draws '+s.dew+' dew, '+s.webs.length+' webs'); }
      /* (2) a web lit by the light: the hand on the web's screen point, at the depth nearest its distance */
      { const R=mk('full'), s0=run(R, 0, 2), Ws=s0.answers.webs, cam=R.camera, fwd=new T.Vector3(); cam.getWorldDirection(fwd);
        const k=Ws.reduce((a,b,i)=>Math.abs(b.x)+Math.abs(b.z)<Math.abs(Ws[a].x)+Math.abs(Ws[a].z) ? i : a, 0), W0=Ws[k], P=new T.Vector3(W0.x, W0.y, W0.z), dist=P.clone().sub(cam.position).dot(fwd), sp=P.clone().project(cam);
        let best=0, bd=1e9; for(let i=0;i<=200;i++){ const e=Math.abs(depthDistance(i/200)-dist); if(e<bd){ bd=e; best=i/200; } }
        const hv=[{ x:(sp.x+1)/2*w, y:(1-sp.y)/2*h, d:best, play:true }], lit=run(R, 2, 2.5, hv).answers.webs[k].b, R2=mk('full'), un=run(R2, 0, 4.5).answers.webs, base=Math.max(...un.map(x=>x.b)); n+=2;
        notes.push(`the web nearest the aisle: lit ${lit.toFixed(3)}, unlit ${un[k].b.toFixed(3)} (every web with no hand ≤ ${base.toFixed(3)})`);
        if(!(lit>=5*un[k].b)) miss(`a web by the light shines ${lit.toFixed(3)}, unlit ${un[k].b.toFixed(3)} (≥ 5× expected)`);
        if(!(base<=ANSWERS.webs.base+0.03+1e-9)) miss('CONTROL: with no hand a web shines '+base.toFixed(3)+' (its base glow at most '+(ANSWERS.webs.base+0.03).toFixed(3)+')'); }
      /* (3) a note rings the stream */
      { const R=mk('full'), hv=[{ x:0.5*w, y:0.62*h, d:0.25, play:true }]; run(R, 0, 2, hv); const L0=R.state().rigs[0]; R.glint(0, 0.8); const wr=R.state().life.water.filter(r=>r.kind==='note'), q=streamNear(L0.x, L0.z), want=noteRingAmp(q.d, 0.8); n+=2;
        if(want>0 ? !(wr.length===1 && Math.hypot(wr[0].x-q.x, wr[0].z-q.z)<1e-9 && Math.abs(wr[0].amp-want)<1e-12) : wr.length!==0) miss(`a note ${q.d.toFixed(2)} from the water: rings ${JSON.stringify(wr)} (the law: ${want.toFixed(3)} at ${q.x.toFixed(2)}, ${q.z.toFixed(2)})`);
        notes.push(`a note ${q.d.toFixed(2)} from the water rings it at ${want.toFixed(3)}`);
        const R2=mk('full'); run(R2, 0, 2); R2.glint(0, 0.8); if(R2.state().life.water.some(r=>r.kind==='note')) miss('CONTROL: a note with no light rang the stream'); }
      /* (4) the music bed in the room */
      { const R=mk('full'); let s=run(R, 0, 1); const at=1.5; R.bed({ kind:'chord' }, at); R.bed({ kind:'loop', lv:1, a:1, h:1, r:3, amp:1 }, at); R.bed({ kind:'glass' }, at);
        let pre=null, fr=null; for(let i=0;i<120;i++){ const t=1+i/60; R.update(1/60, t, [], null, NIN); const st=R.state(); if(t<at) pre=st; else if(!fr){ fr=st; } }
        const mid=R.state(), late=run(R, 3, 1.2), C=late.life.bed.clusters, shroomBed=late.life.places.filter(p=>p.kind==='shroom'), fired=fr.bed.fired; n+=6;
        if(pre.life.places.some(p=>p.bed>0) || pre.bed.fired.length) miss('CONTROL: the bed swelled before its event was heard');
        if(fired.length!==3 || fired.some(f=>f.at!==at || f.t<at || !(f.prev<at))) miss('the bed\'s events did not fire in the frame they are heard: '+JSON.stringify(fired));
        if(!shroomBed.every(p=>p.bed>0)) miss('a chord did not swell every mushroom');
        if(late.life.places.some(p=>p.bed>ANSWERS.bed.max+1e-12)) miss('a bed swell above its cap '+ANSWERS.bed.max);
        const inC=new Set(C[1]), lp=late.life.places, other=lp.map((p,i)=>i).filter(i=>lp[i].kind==='shroom' && !inC.has(i)); if(!(C[1].every(i=>lp[i].bed>lp[other[0]].bed+0.05))) miss('a loop note did not light its own cluster above the others');
        if(!(mid.bed.twinkles.length===1 && mid.bed.twinkles[0].glow>0) || late.bed.twinkles.length) miss('a glass note: '+JSON.stringify([mid.bed.twinkles, late.bed.twinkles]));
        notes.push(`the bed: chord swell ${shroomBed[0].bed.toFixed(3)} at +2.2 s, loop cluster 1 ${lp[C[1][0]].bed.toFixed(3)} vs another ${lp[other[0]].bed.toFixed(3)}, glass twinkle ${mid.bed.twinkles[0] ? mid.bed.twinkles[0].glow.toFixed(3) : '—'} at +1.5 s`); }
    } finally { for(const r of rooms) r.dispose(); }
    /* (5) delivery through the host, (6) the dew and the webs render — the opened forest */
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the delivery and drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const c0=1000, p0=performance.now(), LAT=0.15, clock=()=>{ const p=performance.now(), c=c0+(p-p0)/1000; return { ctx:c-LAT, perf:p, now:c, nowPerf:p }; };
    const deliver=async ignore=>{ nightClockDbg(clock); sceneBedDbg({ ignoreLatency:ignore });
      try{ const c=clock(), at=c.now+0.4, want=(p0+(at-c0+LAT)*1000)/1000; BUS.set('audioClock', clock()); BUS.push('bed', { kind:'chord', at, v:0 });
        for(let k=0;k<40;k++){ BUS.set('audioClock', clock()); await sleep(25); } const f=room.state().bed.fired.slice(-1)[0]; return { f, want }; }
      finally { nightClockDbg(null); sceneBedDbg({ ignoreLatency:false }); } };
    { const a=await deliver(false), b=await deliver(true); n+=2;
      const okAt=x=>x.f && Math.abs(x.f.at-x.want)<0.002 && x.f.t>=x.f.at && x.f.prev<x.f.at;   // handed over at the heard time, fired in the first frame at or after it
      if(!okAt(a)) miss(`the host handed the bed's chord to the room at ${a.f ? a.f.at.toFixed(4) : '—'} s, fired at ${a.f ? a.f.t.toFixed(4) : '—'}, heard at ${a.want.toFixed(4)}`);
      if(okAt(b)) miss('CONTROL: ignoring the output latency still landed on the heard frame — the delivery check cannot fail');
      notes.push(`delivery: heard at ${a.want.toFixed(3)} s, handed over ${a.f ? a.f.at.toFixed(3) : '—'}, fired in the frame at ${a.f ? a.f.t.toFixed(3) : '—'}; ignoring the latency: ${b.f ? ((b.want-b.f.at)*1000).toFixed(0) : '—'} ms early`); }
    { const A=room.answersDbg && room.answersDbg.parts, clk={ t:7.5e6, W:canvas.width, H:canvas.height }; handsProbe(clk, ()=>true);
      try{ for(let i=0;i<20;i++){ clk.t+=33; processHandsProbe({ landmarks:[pose({ x:0.5, y:0.78, s:0.24 })], handednesses:[[{ categoryName:'Right' }]] }); } await sleep(1500);
        if(A){ for(const [name,obj] of [['dew',A.dew],['webs',A.webs]]){ const ab=await sceneSnapDbg(on=>{ obj.visible=!on; }, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
          if(!ab || !cc){ notes.push(name+': no frame rendered — the drawn check does not apply'); continue; }
          notes.push(`${name} add ${(ab[0]-ab[1]).toFixed(4)} to the mean RGB sum of one frame (CONTROL the same frame twice ${(cc[0]-cc[1]).toFixed(4)})`);
          if(!(ab[0]-ab[1]>0)) miss(name+' do not show in the picture: '+(ab[0]-ab[1])); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); } }
        else miss('the room shows no dew / web parts to the probe'); }
      finally { handsProbe(null); } }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ nightClockDbg(null); sceneBedDbg({ ignoreLatency:false }); try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.63, name:'FOREST answers', drawn:true, run:()=>checkForestAnswers(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 2: row «FOREST melody» — NUMBERS from the room built without a renderer. (1) A LONG NOTE: one note, then held 8 s (the host's
   held seconds each frame) — the room's hold rises past 0.9, it keeps playing (the flies stay gathered), more flies within 2 of the light than
   with the same note released at once — CONTROL: released, the room stops playing (today's release); (2) FAST PLAYING: 8 notes a second for
   6 s against 2 a second — the room's rate past 0.8 vs under 0.1, notes sent flies out (darts) only when fast, the near flies further out. */
export async function checkForestMelody(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const T=await loadThree(), w=844, h=390, rooms=[], mk=()=>{ const r=buildForest(T,{ C:cv, level:'full', w, h }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 }, hv=[{ x:0.5*w, y:0.55*h, d:0.3, play:true }];
    const near=(st,r0)=>{ const L=st.rigs[0]; return st.fliesAt.filter(p=>Math.hypot(p[0]-L.x, p[1]-L.y, p[2]-L.z)<r0); }, md=st=>{ const L=st.rigs[0], a=near(st,5.5); return a.reduce((s2,p)=>s2+Math.hypot(p[0]-L.x, p[1]-L.y, p[2]-L.z),0)/Math.max(1,a.length); };
    try{
      /* (1) a long note */
      const A=mk(), B=mk(); for(const r of [A,B]) for(let i=0;i<120;i++) r.update(1/60, i/60, hv, null, NIN);
      A.glint(0, 0.8); B.glint(0, 0.8); for(let i=0;i<480;i++){ const t=2+i/60; A.held(t-2); B.held(0); A.update(1/60, t, hv, null, NIN); B.update(1/60, t, hv, null, NIN); }
      const sa=A.state(), sb=B.state(), na=near(sa,2).length, nb=near(sb,2).length; n+=4;
      if(!(sa.melody.hold>0.9)) miss('a note held 8 s: the room\'s hold is '+sa.melody.hold.toFixed(3));
      if(!sa.life.playing) miss('a note held 8 s: the room stopped playing (the flies would scatter)');
      if(sb.life.playing) miss('CONTROL: the same note released at once still counts as playing after 8 s');
      if(!(na>nb)) miss(`a note held 8 s gathers ${na} flies within 2 of the light, released ${nb}`);
      notes.push(`a held note: hold ${sa.melody.hold.toFixed(2)}, ${na} flies within 2 of the light (released: ${nb}, mean distance ${md(sa).toFixed(2)} vs ${md(sb).toFixed(2)})`);
      /* (2) fast playing against slow */
      const C=mk(), D=mk(), play=(r, every)=>{ let next=0; for(let i=0;i<480;i++){ const t=i/60; if(t>=next){ r.glint(0, 0.7); next+=every; } r.update(1/60, t, hv, null, NIN); } return r.state(); };
      const sc=play(C, 1/8), sd=play(D, 0.5); n+=4;
      if(!(sc.melody.rate>0.8)) miss('8 notes a second: the room\'s rate is '+sc.melody.rate.toFixed(3)); if(!(sd.melody.rate<0.1)) miss('2 notes a second: the room\'s rate is '+sd.melody.rate.toFixed(3));
      if(!(sc.melody.darts>0 && sd.melody.darts===0)) miss(`notes that sent flies out: fast ${sc.melody.darts}, slow ${sd.melody.darts}`);
      if(!(md(sc)>=1.15*md(sd))) miss(`fast playing: the near flies ${md(sc).toFixed(2)} from the light, slow ${md(sd).toFixed(2)} (≥ 15 % further expected)`);
      notes.push(`fast vs slow: rate ${sc.melody.rate.toFixed(2)} / ${sd.melody.rate.toFixed(2)}, darts ${sc.melody.darts} / ${sd.melody.darts}, mean distance ${md(sc).toFixed(2)} / ${md(sd).toFixed(2)}`);
    } finally { for(const r of rooms) r.dispose(); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.635, name:'FOREST melody', run:()=>checkForestMelody(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 3: row «FOREST floor» — the room built without a renderer at each level holds the floor law's plants for its counts (beside its
   own trunks and ferns), the plant sheet of its level reached it (high the 2048² master, medium the 1024² copy); the baseline override (every
   floor count 0) builds none; drawn (the opened forest at medium): the herbs and the fine ferns RENDER — one frame drawn twice, them hidden the
   second time — CONTROL the same frame twice differs by 0. */
export async function checkForestFloor(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); const IMG=await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, ...o }); rooms.push(r); return r; };
    try{
      for(const [lv, size] of [['full',2048],['reduced',1024]]){ const r=mk(lv), st=r.state().floor, L=FOREST_LEVELS[lv], parts=r.floorDbg.parts; n+=3;
        const want=['sorrel','forb','bilberry','anemone','nettle','sedge','fern2'].map(k=>[k, L[k]]), got=want.map(([k])=>(st.counts||{})[k]||0);
        if(want.some(([,v],i)=>got[i]!==v)) miss(`${lv}: the floor holds ${JSON.stringify(st.counts)} (asked ${JSON.stringify(Object.fromEntries(want))})`);
        const img=parts.herbs.material.map && parts.herbs.material.map.image; if(!st.tex || !img || img.width!==size) miss(`${lv}: the plant sheet ${img ? img.width+'²' : 'missing'} (${size}² expected)`);
        if(!parts.herbs.parent || !parts.fronds.parent) miss(lv+': the floor is not in the scene');
        notes.push(`${lv}: ${st.herbs} herbs, ${st.rosettes} fine-fern rosettes (${st.fronds} fronds), sheet ${img ? img.width : 0}²`); }
      { const st=mk('reduced', { lv:{ sorrel:0, forb:0, bilberry:0, anemone:0, nettle:0, sedge:0, fern2:0 } }).state().floor; n++; if(st.herbs || st.fronds || st.tex) miss('the baseline override still builds a floor: '+JSON.stringify(st)); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn check does not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const P=room.floorDbg.parts, ab=await sceneSnapDbg(on=>{ P.herbs.visible=!on; P.fronds.visible=!on; }, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
    if(!ab || !cc) notes.push('no frame rendered — the drawn check does not apply');
    else { notes.push(`the floor adds ${(ab[0]-ab[1]).toFixed(3)} to the mean RGB sum of one frame (CONTROL the same frame twice ${(cc[0]-cc[1]).toFixed(4)}); texture memory ${(sceneInfo().texBytes/1048576).toFixed(1)} MB at medium`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss('the floor does not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
    void IMG;
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.637, name:'FOREST floor', drawn:true, run:()=>checkForestFloor(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 4: row «FOREST stream» — the room built without a renderer: no trunk and no fern of today's forest stands in the new stream
   (each clear by its own clearance); the rocks, pebbles, drifting leaves and mist strips at each level's counts, none in the baseline; the
   leaves drift downstream over 3 s; drawn (the opened forest at medium): the water, the rocks and the mist RENDER (one frame drawn twice, each
   hidden the second time) — CONTROL the same frame twice differs by 0. */
export async function checkForestStream(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, ...o }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 }, H=0.42;
    try{
      for(const lv of ['full','reduced']){ const r=mk(lv), st=r.state(), L=FOREST_LEVELS[lv]; n+=3;
        const wet=st.trunks.filter(([x,z,rr])=>streamNear(x,z).d<H+rr+0.35-1e-6), wf=st.fernsAt.filter(([x,z,sc])=>streamNear(x,z).d<H+0.3+sc*0.25-1e-6);
        if(wet.length || wf.length) miss(`${lv}: ${wet.length} trunks and ${wf.length} ferns stand in the stream`);
        const S=st.stream; if(S.rocks!==L.rocks || S.pebbles!==L.pebbles || S.floaters.length!==0 && S.floaters.length!==L.floaters || S.mistStrips!==L.mistStrips) miss(`${lv}: ${JSON.stringify({ rocks:S.rocks, pebbles:S.pebbles, mist:S.mistStrips })}`);
        r.update(1/60, 1, [], null, NIN); const a=r.state().stream.floaters; for(let i=0;i<180;i++) r.update(1/60, 1+i/60, [], null, NIN); const b=r.state().stream.floaters;
        if(a.length!==L.floaters || a.some((p,i)=>!(b[i].u>p.u || b[i].u<p.u-0.3))) miss(`${lv}: the leaves did not drift downstream (${a.length} of ${L.floaters})`);
        notes.push(`${lv}: ${S.rocks} rocks (${S.wetRocks} in the water), ${S.pebbles} pebbles, ${a.length} leaves, ${S.mistStrips} mist strips; trunks and ferns all clear of the water`); }
      { const S=mk('reduced', { lv:{ rocks:0, pebbles:0, floaters:0, mistStrips:0 } }).state().stream; n++; if(S.rocks || S.pebbles || S.mistStrips) miss('the baseline override still builds '+JSON.stringify(S)); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const P=room.streamDbg.parts;
    for(const [name, objs] of [['the water', [room.lifeDbg.stream]], ['the rocks', [P.rocks, P.pebbles]], ['the mist', [P.mist]]]){
      const ab=await sceneSnapDbg(on=>{ for(const o of objs) o.visible=!on; }, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
      if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
      notes.push(`${name} add ${(ab[0]-ab[1]).toFixed(3)} to the mean RGB sum of one frame (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.639, name:'FOREST stream', drawn:true, run:()=>checkForestStream(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 5: row «FOREST wood» — the room built without a renderer: its 95 trunks are pure/layout.js forestTrunks() number for number
   (CONTROL the replay one draw late gives other trunks); the wood, moss and ivy at each level's counts and the baseline none (no flare, no bark
   moss, no contact shadows); today's mushrooms first and where they were, the wood's after them; today's ferns sway again (their material's
   shader has the sway — CONTROL a plain material has not); drawn (the opened forest at medium): the wood, the moss and the contact shadows
   RENDER (one frame drawn twice: each part hidden, the shadow map swapped for white) — CONTROL the same frame twice differs by 0. */
export async function checkForestWood(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, ...o }); rooms.push(r); return r; };
    const stub=m=>{ const sh={ uniforms:{}, vertexShader:'#include <begin_vertex>\n#include <uv_vertex>', fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>' }; if(m.onBeforeCompile) m.onBeforeCompile(sh, null); return sh.vertexShader; };
    try{
      const pureT=forestTrunks();
      for(const lv of ['full','reduced']){ const r=mk(lv), st=r.state(), L=FOREST_LEVELS[lv], P=woodPlaces(L, pureT), Wd=st.wood; n+=6;
        if(JSON.stringify(st.trunks)!==JSON.stringify(pureT)) miss(lv+': the room\'s trunks are not forestTrunks()');
        const want={ roots:P.roots.length, logs:2, stumps:L.stumps, snags:L.snags, twigs:L.twigs, moss:L.moss };
        for(const k of Object.keys(want)) if(Wd[k]!==want[k]) miss(`${lv}: ${k} ${Wd[k]} of ${want[k]}`);
        if(!Wd.shade || !Wd.flare || !Wd.bark || !(Wd.ivy>0) || !(Wd.verts>0)) miss(lv+': '+JSON.stringify(Wd));
        const today=lifePlaces(L.shrooms, L.blooms), pl=st.life.places, sh=pl.filter(p=>p.kind==='shroom').length;
        if(pl.slice(0, today.length).some((p,i)=>p.kind!==today[i].kind || p.x!==today[i].x || p.z!==today[i].z)) miss(lv+': today\'s mushrooms moved');
        if(sh!==L.shrooms+L.woodShrooms) miss(`${lv}: ${sh} mushrooms (${L.shrooms} + ${L.woodShrooms} expected)`);
        if(!/uSway/.test(stub(r.fernsDbg.frondM)) || !/uSway/.test(stub(r.fernsDbg.frondD))) miss(lv+': today\'s ferns do not sway');
        notes.push(`${lv}: ${Wd.roots} roots, ${Wd.logs} logs, ${Wd.stumps} stumps, ${Wd.snags} dead trees, ${Wd.twigs} branches, ${Wd.brackets} fungi, ${Wd.moss} moss, ${Wd.ivy} ivy cards, ${sh-L.shrooms} mushrooms on wood; ${Wd.verts} wood vertices`); }
      { n+=2; const R=seeded(FOREST_SEED); for(let i=0;i<=PAINT_DRAWS;i++) R(); const x=(R()*2-1)*22; if(x===pureT[8][0]) miss('CONTROL: the replay one draw late gives the same trunk');
        if(/uSway/.test(stub(new T.MeshStandardMaterial()))) miss('CONTROL: a plain material has the sway'); }
      { const S=mk('reduced', { lv:{ roots:0, logs:0, stumps:0, snags:0, twigs:0, moss:0, ivy:0, woodShrooms:0, flare:false, barkMoss:false, shade:false } }).state(); n++;
        if(S.wood.verts || S.wood.moss || S.wood.ivy || S.wood.shade || S.wood.flare || S.wood.bark) miss('the baseline still builds '+JSON.stringify(S.wood)); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const P=room.woodDbg.parts, gm=room.scene.children.find(o=>o.isMesh && o.material && o.material.userData && o.material.userData.shadeU), SU=gm && gm.material.userData.shadeU, keep=SU && SU.value;
    const white=new (await loadThree()).DataTexture(new Uint8Array([255,255,255,255]), 1, 1); white.needsUpdate=true;
    for(const [name, fn] of [['the wood', on=>{ P.wood.visible=!on; }], ['the moss', on=>{ P.moss.visible=!on; }], ['the contact shadows', on=>{ if(SU) SU.value= on ? white : keep; }]]){
      const ab=await sceneSnapDbg(fn, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
      if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
      notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(3)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
    white.dispose(); if(!SU) miss('the ground has no contact-shadow map');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.6395, name:'FOREST wood', drawn:true, run:()=>checkForestWood(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 6: row «FOREST gust» — the room built without a renderer, the effects hand driven through its update: no hand and a still
   hand leave the gust's strength (state and shader uniform) exactly 0 and shake no leaf; a sweep makes a gust along it, near the effects light,
   shakes leaves loose; a sweep across the stream makes a wake — CONTROL the still hand none; the baseline (gust off) keeps the uniform at 0
   through a sweep; the plants' materials carry the gust (today's ferns, the floor's) — CONTROL a plain material does not; drawn (medium):
   a gust bends the picture, and with strength 0 its place changes nothing (exactly) — CONTROL one frame twice differs by 0. */
export async function checkForestGust(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(o={})=>{ const r=buildForest(T,{ C:cv, level:'reduced', w, h, ...o }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 }, stub=m=>{ const sh={ uniforms:{}, vertexShader:'#include <begin_vertex>\n#include <project_vertex>', fragmentShader:'' }; if(m.onBeforeCompile) m.onBeforeCompile(sh, null); return sh.vertexShader; };
    let track=[]; const drive=(r, sec, at, t0=1)=>{ let t=t0; track=[]; for(let i=0;i<Math.round(sec*60);i++){ t+=1/60; const p=at(i/60); r.update(1/60, t, p ? [{ x:p[0], y:p[1], d:p[2], play:false }] : [], null, NIN); const L=r.state().rigs[1]; track.push([L.x, L.z]); } return t; };
    const offTrack=(x, z)=>{ let m=Infinity; for(let i=1;i<track.length;i++){ const [ax,az]=track[i-1], [bx,bz]=track[i], vx=bx-ax, vz=bz-az, u=Math.max(0, Math.min(1, ((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz||1))); m=Math.min(m, Math.hypot(x-ax-vx*u, z-az-vz*u)); } return m; };   // the gust trails the light ON its path
    try{
      { const r=mk(); let t=drive(r, 2, ()=>null); const a=r.state().gust, ua=r.lifeDbg.U.uGust.value.w; t=drive(r, 2, ()=>[420, 260, 0.5], t); const b=r.state().gust, ub=r.lifeDbg.U.uGust.value.w; n+=2;
        if(a.k!==0 || ua!==0 || b.k!==0 || ub!==0 || b.spawned) miss(`no hand ${a.k}/${ua}, a still hand ${b.k}/${ub}, leaves ${b.spawned}: not exactly 0`);
        t=drive(r, 0.8, s=>[150+600*s/0.8, 260, 0.5], t); const c=r.state().gust, uc=r.lifeDbg.U.uGust.value, L=r.state().rigs[1], off=offTrack(c.x, c.z);
        if(!(c.k>0.3) || uc.w!==c.k || !(c.dx>0.8) || !(off<0.25) || !(c.spawned>0)) miss(`a sweep: ${JSON.stringify({ k:c.k, w:uc.w, dx:c.dx, offTrack:off, leaves:c.spawned })}`);
        notes.push(`a sweep across the picture: strength ${c.k.toFixed(2)}, direction ${c.dx.toFixed(2)}, ${c.dz.toFixed(2)}; the gust ${Math.hypot(c.x-L.x, c.z-L.z).toFixed(2)} m behind the light, ${off.toFixed(3)} m off its path; ${c.spawned} leaves shaken loose`); }
      { let best=0, at=null; for(const dd of [0.3, 0.5, 0.7, 0.85]) for(const y of [220, 300]){ const r=mk(); drive(r, 0.6, ()=>[100, y, dd]); drive(r, 1.2, s=>[100+700*s/1.2, y, dd], 2); const k=r.state().gust.wakes; if(k>best){ best=k; at=[y, dd]; } }
        const rc=mk(); drive(rc, 2, ()=>[420, 300, 0.5]); n+=2; if(!best) miss('no sweep across the picture made a wake on the stream'); if(rc.state().gust.wakes) miss('CONTROL: a still hand made a wake');
        notes.push(`the wake: ${best} rings from a sweep at y ${at && at[0]}, depth ${at && at[1]}; a still hand none`); }
      { const r=mk({ lv:{ gust:false, gustLeaves:0 } }); drive(r, 0.8, s=>[150+600*s/0.8, 260, 0.5]); n++; if(r.lifeDbg.U.uGust.value.w!==0 || r.state().gust.spawned) miss('the baseline keeps a gust: '+r.lifeDbg.U.uGust.value.w); }
      { const r=mk(); n+=2; if(!/uGust/.test(stub(r.fernsDbg.frondM)) || !/uGust/.test(stub(r.floorDbg.parts.material))) miss('today\'s ferns or the floor\'s plants do not carry the gust');
        if(/uGust/.test(stub(new T.MeshStandardMaterial()))) miss('CONTROL: a plain material carries the gust'); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const G=room.lifeDbg.U.uGust.value, keep=G.toArray();
    const ab=await sceneSnapDbg(on=>{ if(on) G.set(0.3, 0.8, 1.6, 1); else G.fromArray(keep); }, true), z=await sceneSnapDbg(on=>{ if(on) G.set(0.3, 0.8, 1.6, 0); else G.fromArray(keep); }, true), cc=await sceneSnapDbg(()=>{}, true); n+=3;
    G.fromArray(keep);
    if(!ab || !z || !cc) notes.push('no frame rendered');
    else { notes.push(`a gust in front changes the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(3)}; with strength 0 by ${(z[0]-z[1]).toFixed(4)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss('a gust does not show in the picture'); if(z[0]!==z[1]) miss('a gust of strength 0 changes the picture by '+(z[0]-z[1])); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.6397, name:'FOREST gust', drawn:true, run:()=>checkForestGust(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 7: row «FOREST canopy» — the room built without a renderer: its leaves and stars are canopyPlaces' at each level, the baseline
   none (no stars, no dapple, no moon face); the crown leaves share the floor plants' shader program (the same key); drawn (medium): the leaves,
   the stars, the dappled moonlight and the moon's face RENDER (each hidden or swapped the second time) — CONTROL one frame twice differs by 0. */
export async function checkForestCanopy(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, ...o }); rooms.push(r); return r; };
    try{
      for(const lv of ['full','reduced']){ const r=mk(lv), st=r.state().canopy, P=canopyPlaces(FOREST_LEVELS[lv], forestTrunks()); n+=3;
        if(st.sprays!==P.sprays.length || st.shown!==P.sprays.length || st.stars!==FOREST_LEVELS[lv].stars) miss(`${lv}: ${JSON.stringify({ sprays:st.sprays, shown:st.shown, stars:st.stars })} vs ${P.sprays.length} leaves`);
        if(!st.dapple || !st.moonFace) miss(lv+': no dapple or moon face');
        const m=r.canopyDbg.parts.material, f=r.floorDbg.parts.material; if(!m || m.customProgramCacheKey()!==f.customProgramCacheKey()) miss(lv+': the crown leaves do not share the floor plants\' program');
        notes.push(`${lv}: ${st.sprays} leaf sprays (${Object.entries(st.by).map(([k,v])=>k+' '+v).join(', ')}), ${st.limbs+st.stems} limbs and stems, ${st.stars} stars`); }
      { const S=mk('reduced', { lv:{ crowns:false, crownShare:0, young:0, shrubs:0, saplings:0, stars:0, dapple:false, moonFace:false } }).state().canopy; n++; if(S.sprays || S.stars || S.dapple || S.moonFace) miss('the baseline still builds '+JSON.stringify(S)); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const P=room.canopyDbg.parts, D=room.dappleDbg, dk=()=>D.uDapK.value, moon=room.scene.children.find(o=>o.isSprite && o.material.map && o.material.map.image && o.material.map.image.width===256);
    const black=new (await loadThree()).DataTexture(new Uint8Array([0,0,0,255]), 1, 1); black.needsUpdate=true; let keepK=0, keepMap=null;
    for(const [name, fn] of [['the leaves', on=>{ P.leaves.visible=!on; }], ['the stars', on=>{ P.stars.visible=!on; }], ['the dappled moonlight', on=>{ if(on){ keepK=dk(); D.uDapK.value=0; } else D.uDapK.value=keepK; }],
      ['the moon\'s face', on=>{ if(!moon) return; if(on){ keepMap=moon.material.map; moon.material.map=black; } else moon.material.map=keepMap; }]]){
      const ab=await sceneSnapDbg(fn, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
      if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
      notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(4)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
    black.dispose(); n++; if(!moon) miss('no moon disc with the prepared face');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.6398, name:'FOREST canopy', drawn:true, run:()=>checkForestCanopy(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 8: row «FOREST paint» — the room built without a renderer: it paints at both levels (its stroke radius and taps), every sprite
   and point cloud is in the glow pass with its own depth test, nothing else is — CONTROL a plain mesh has no depth test of its own; the camera
   breathes sideways — CONTROL the baseline (no breath) stands still; the baseline paints nothing; drawn (medium): with the pass set to pass
   through and the glowing things hidden, the painted pipeline gives EXACTLY the one-pass picture; the strokes, the vignette change it —
   CONTROL one frame twice differs by 0. */
export async function checkForestPaint(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, gl2:true, ...o }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 };
    try{
      for(const lv of ['full','reduced']){ const r=mk(lv), st=r.state().paint, L=FOREST_LEVELS[lv]; let bad=0, glow=0, plain=0; n+=3;
        if(!st.on || st.R!==L.paintR || !(st.taps>10)) miss(`${lv}: ${JSON.stringify(st)}`);
        r.scene.traverse(o=>{ const g=o.isSprite || o.isPoints, m=o.material; if(!m || Array.isArray(m)) return; if(g){ glow++; if(o.layers.mask!==2 || (m.depthTest!==false && !m.userData.depthAware)) bad++; } else if(o.isMesh){ plain++; if(m.userData.depthAware || o.layers.mask!==1) bad++; } });
        if(bad) miss(`${lv}: ${bad} objects in the wrong pass`);
        const x=t=>{ r.update(1/60, t, [], null, NIN); return r.camera.position.x; }, a=x(10), b=x(12);
        if(!(Math.abs(a-b)>0.001)) miss(lv+': the camera does not breathe ('+(a-b).toFixed(5)+')');
        notes.push(`${lv}: strokes up to ${st.R} px (${st.taps} taps), ${glow} glowing things in their own pass, ${plain} meshes in the painted one; the breath ${((a-b)*100).toFixed(2)} cm over 2 s`); }
      { const r=mk('reduced', { lv:{ paint:false, paintR:0, vignette:false, grain:false, breath:false } }), st=r.state().paint, x=t=>{ r.update(1/60, t, [], null, NIN); return r.camera.position.x; }; n+=2;
        if(st.on || st.breath) miss('the baseline still paints or breathes: '+JSON.stringify(st)); if(x(10)!==x(12)) miss('CONTROL: the baseline camera moves sideways'); }
      { const m=new T.MeshStandardMaterial(); n++; if(m.userData.depthAware) miss('CONTROL: a plain material has a depth test of its own'); m.dispose(); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const P=room.paintDbg, glows=[]; room.scene.traverse(o=>{ if((o.isSprite || o.isPoints) && o.visible){ glows.push(o); o.visible=false; } });
    try{
      const keep=P.set({ uR:0, uSoft:0, uVig:0, uGrain:0, uGrade:0 }); await frames(3);
      const id=await sceneSnapDbg(on=>{ P.set({ direct:on }); }, true); n++;
      if(!id) notes.push('no frame rendered'); else { notes.push(`passing through: the painted pipeline ${id[0].toFixed(4)}, one pass ${id[1].toFixed(4)}`); if(id[0]!==id[1]) miss('the pipeline set to pass through is not the one-pass picture: '+(id[0]-id[1])); }
      P.set(keep); await frames(3);
      for(const [name, o] of [['the strokes', { uR:0 }], ['the vignette', { uVig:0 }]]){ let back=null; const ab=await sceneSnapDbg(on=>{ if(on) back=P.set(o); else P.set(back); }, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
        if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
        notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(4)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
        if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
    } finally { for(const o of glows) o.visible=true; P.set({ direct:false }); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.6399, name:'FOREST paint', drawn:true, run:()=>checkForestPaint(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
/* NIGHT-6 slice 9: row «FOREST hidden» — the room built without a renderer: the foxfire's trail as long as the level asks and the wood's and
   bark's shaders carry it (their program keys), the flowers counted; the baseline has neither; the playing light moved through the room's
   update leaves a trail and opens the flower it reaches — CONTROL a flower it never reaches stays closed; drawn (medium): the foxfire on the
   bank log and the opened flowers RENDER — CONTROL one frame twice differs by 0. */
export async function checkForestHidden(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const w=844, h=390, rooms=[], mk=(lv, o={})=>{ const r=buildForest(T,{ C:cv, level:lv, w, h, gl2:true, ...o }); rooms.push(r); return r; };
    const NIN={ mood:'major-penta', sleep:0 }, V=new T.Vector3();
    try{
      for(const lv of ['full','reduced']){ const r=mk(lv), st=r.state().hidden, L=FOREST_LEVELS[lv], mats=[r.woodDbg.parts.material]; n+=2;
        if(st.of!==L.foxfire || r.foxDbg.uFox.value.length!==L.foxfire || st.flowers!==L.flowers) miss(`${lv}: ${JSON.stringify({ of:st.of, flowers:st.flowers })}`);
        if(mats.some(m=>!/\.fox\d+$/.test(m.customProgramCacheKey()))) miss(lv+': the wood\'s shader has no foxfire');
        notes.push(`${lv}: a trail of ${st.of} points, ${st.flowers} night flowers`); }
      { const r=mk('reduced', { lv:{ foxfire:0, flowers:0 } }), st=r.state().hidden; n++; if(st.of || st.flowers || /fox/.test(r.woodDbg.parts.material.customProgramCacheKey())) miss('the baseline still has '+JSON.stringify(st)); }
      { const r=mk('reduced'), F=r.hiddenDbg.flowers, f=F[0], far=F.reduce((a,b)=>Math.hypot(b.x-f.x, b.z-f.z)>Math.hypot(a.x-f.x, a.z-f.z) ? b : a, F[0]);
        let best=null, bd=1e9; for(let px=0;px<=w;px+=w/48) for(let py=0;py<=h;py+=h/30) for(const dd of [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]){ r.place(px, py, dd, V); const e=Math.hypot(V.x-f.x, V.y-(f.y+0.5), V.z-f.z); if(e<bd){ bd=e; best=[px, py, dd]; } }
        let t=1; for(let i=0;i<150;i++){ t+=1/60; r.update(1/60, t, [{ x:best[0], y:best[1], d:best[2], play:true }], null, NIN); }
        const st=r.state().hidden, i0=F.indexOf(f), iF=F.indexOf(far); n+=3;
        if(!(st.trail>0)) miss('the light left no trail'); if(!(st.open[i0]>0.99)) miss(`the flower the light reached is ${st.open[i0]} open (the light ${bd.toFixed(2)} m from its place)`);
        if(st.open[iF]!==0) miss('CONTROL: a flower '+Math.hypot(far.x-f.x, far.z-f.z).toFixed(1)+' m away opened: '+st.open[iF]);
        notes.push(`the light ${bd.toFixed(2)} m from a flower for 2.5 s: it opened, ${st.open.filter(o=>o>0).length} of ${F.length} open; a trail of ${st.trail}`); }
    } finally { for(const r of rooms) r.dispose(); }
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const FU=room.foxDbg, logs=woodPlaces(FOREST_LEVELS.reduced, forestTrunks()).logs, K=logs.find(l=>!l.bridge), mid=[(K.a[0]+K.b[0])/2, (K.a[1]+K.b[1])/2+0.2, (K.a[2]+K.b[2])/2], P=room.hiddenDbg.parts;
    const open=P.petals.geometry.attributes.aOpen, keepOpen=open.array.slice();
    for(const [name, fn] of [['the foxfire', on=>{ const p=FU.uFox.value[0]; if(on){ p.set(mid[0], mid[1], mid[2], FU.uFoxT.value); } else p.w=-1; }],
      ['the opened flowers', on=>{ open.array.fill(on ? 1 : 0); if(!on) open.array.set(keepOpen); open.needsUpdate=true; }]]){
      const ab=await sceneSnapDbg(fn, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
      if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
      notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(4)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.63995, name:'FOREST hidden', drawn:true, run:()=>checkForestHidden(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
