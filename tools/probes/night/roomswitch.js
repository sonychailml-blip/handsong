/* NIGHT-3 stage 5 part 2: row «NIGHT room switch» (P.night, drawn) — the switching machinery, on the test room (./testroom.js), judged on
   EXACT controls (the user, 2026-11-09):
   (1) hand detection takes NO camera frame while a room opens: the pump's «snapped» count read at the opening's begin and end (the host's
       hook) is the same — CONTROL: the old way (no pause) takes frames in the same opening;
   (2) NO AUDIO NODE is made during a whole switch (every create… of every audio context and every AudioWorkletNode counted while it runs,
       with the music bed playing v2 and the nature sound on) — CONTROL: one node the row makes inside the window is counted;
   (2b) THE FOREST'S SOUND REALLY GOES (step 133): 2.5 s into a switch to the test room (its nature silent) the live graph's sounding slot holds
       the test room's recipe with every gain 0, the forest's slot has faded under 0.15 and, after its fade, is parked (out of the graph);
   (3) NO CLICK in an offline render of the nature crossfade (the forest's nature → the test room's at 2 s): the curvature at the swap no
       higher than twice its own neighbourhood's (10–60 ms either side; a step is a spike there) and the house measure ≤ 0.5 over the whole
       render; the first 2 s equal to no switch; the new nature sounding after — CONTROL: an instant swap breaks the same bound (more than 2×);
       THE FOREST GONE: 10 s after the swap the output is 60 dB under the same moment without a switch — CONTROL: a swap to a copy of the
       forest's recipe (another object, the same numbers — the swap runs, the forest plays on) fails that bound. (The house
       measure alone, curvature over the local peak, could not tell an instant swap between two noise-like natures: 0.32, under 0.5.)
   (4) after 20 switches forest ↔ test room, the renderer's programs, geometries and textures and the contexts made and alive are back at
       their baseline — CONTROL: the leaking test room is caught (a texture above the baseline).
   Lighter cases: a failed opening shows the room's 2D stand-in (no renderer, detection free); an opening past its deadline shows the stand-in
   and lets detection run; Dark → Room opens veiled and paused, then unveils; a switch moves the nature to the new recipe and the bed to the
   new room's recipes, playing again; the Room button shows with two rooms, switches, and hides with one; only a real room is remembered.
   PRINTED, not judged: the browser's dropouts during switches, during as many quiet windows, and during the old way's switches. */
import { row } from '../core/rows.js';
import { clickOf } from './night.js';

const RATE=48000;
const frames=k=>new Promise(r=>{ let i=0; const f=()=>{ if(++i>=k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
const sleep=ms=>new Promise(r=>setTimeout(r, ms));
const midOf=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
const curv=(x, i)=>Math.abs(x[i]-2*x[i-1]+x[i-2]);
/* the worst curvature within 1 ms of t over the worst of its own neighbourhood (10–60 ms either side): about 1 without a step, far above with one */
const spikeAt=(x, t)=>{ const c=Math.round(t*RATE), w=Math.round(0.001*RATE), a=Math.round(0.01*RATE), b=Math.round(0.06*RATE); let at=0, ar=0;
  for(let i=c-w;i<=c+w;i++) at=Math.max(at, curv(x, i)); for(let i=c-b;i<c-a;i++) ar=Math.max(ar, curv(x, i)); for(let i=c+a;i<c+b;i++) ar=Math.max(ar, curv(x, i)); return at/Math.max(1e-12, ar); };
const rms=(x, s0, s1)=>{ let e=0; const a=Math.round(s0*RATE), z=Math.min(x.length, Math.round(s1*RATE)); for(let i=a;i<z;i++) e+=x[i]*x[i]; return Math.sqrt(e/Math.max(1, z-a)); };
/* every audio node made while it is on: the create… methods of the audio contexts' prototypes and the AudioWorkletNode constructor */
function nodeCounter(){
  const undo=[], c={ n:0, names:[] };
  for(const P of [globalThis.BaseAudioContext && BaseAudioContext.prototype, globalThis.AudioContext && AudioContext.prototype].filter(Boolean))
    for(const k of Object.getOwnPropertyNames(P)) if(/^create/.test(k) && k!=='createBuffer' && k!=='createPeriodicWave' && typeof P[k]==='function'){
      const f=P[k]; P[k]=function(...a){ c.n++; c.names.push(k); return f.apply(this, a); }; undo.push(()=>{ P[k]=f; }); }
  const W=globalThis.AudioWorkletNode;
  if(W){ globalThis.AudioWorkletNode=class extends W{ constructor(...a){ super(...a); c.n++; c.names.push('AudioWorkletNode'); } }; undo.push(()=>{ globalThis.AudioWorkletNode=W; }); }
  c.off=()=>{ for(const u of undo.splice(0)) u(); };
  return c;
}
export async function checkNightRoomSwitch(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), TR=await import('./testroom.js');
  const V=await import('../../../core/vision.js'), A=await import('../../../core/audio.js'), BD=await import('../../../apps/night/bed.js'), I18=await import('../../../core/i18n.js');
  const TN=await import('../../../apps/night/tint.js');   // DESIGN-1: the interface's tint follows the room
  const FR=(await import('../../../apps/night/rooms/forest/pure/room.js')).FOREST_ROOM, FOREST=FR.id, TEST=TR.TEST_ROOM_ID, $=id=>document.getElementById(id);
  const keep={ bg:H.backgroundOf(), room:H.sceneRoom(), key:(()=>{ try{ return localStorage.getItem(RS.ROOM_KEY); }catch(e){ return null; } })(), mode:BD.bedModeOf(), engine:BD.bedDbg().engine };
  const opened=async(ms=20000)=>{ const t=performance.now(); while(H.sceneInfo().opening && performance.now()-t<ms) await sleep(50); await frames(2); };
  const snap=()=>{ const I=H.sceneInfo(); return { programs:I.programs, geometries:I.memory ? I.memory.geometries : NaN, textures:I.memory ? I.memory.textures : NaN, made:I.contextsMade, live:I.contextsLive }; };
  const go=async(id, o={ fast:true })=>{ const ok=await RS.roomSwitch(id, o); await frames(2); return ok; };
  const reshow=()=>{ $('nightInfoBtn').click(); $('nightInfoClose').click(); };   // the shell renders (the Room button's state) when its card opens
  const drops=()=>{ const L=A.engLoad(); return L && L.playout ? L.playout.events : NaN; };
  let counter=null;
  try{
    { const why=TR.testRoomInstall(); n++; if(why){ miss('the test room was refused: '+why); return { cases:n, total:d.length, differences:d, notes }; } }
    /* the bed on (v2, Drift), the room's picture on, the forest open */
    BD.bedSetEngine('v2'); BD.bedSetMode('drift', FR.bed, FR.bed2);
    for(let k=0;k<80 && !BD.bedDbg().v2.on;k++) await sleep(50);
    n++; if(!BD.bedDbg().v2.on) miss('the music bed v2 did not start (the switch is judged with it playing)');
    if(H.sceneRoom()!==FOREST) await go(FOREST);
    await H.setBackground('forest'); await opened(); await frames(4);
    n++; if(!H.sceneInfo().webgl || H.sceneInfo().id!==FOREST) miss('the forest did not open: '+JSON.stringify(H.sceneInfo()));
    /* the Room button: shown with two rooms, the current room's name under it */
    reshow(); n+=2; if($('nightRoom').hidden) miss('the Room button is hidden with two rooms');
    if($('nightRoom').querySelector('.night-val').textContent!==I18.L(FR.name)) miss(`the Room button reads «${$('nightRoom').querySelector('.night-val').textContent}», not the forest's name`);
    /* (4) leaks: 20 switches forest ↔ test room come back to the baseline */
    { const base=snap(), t0=performance.now();
      let first=null; for(let k=0;k<20;k++){ await go(k%2 ? FOREST : TEST); if(k===1){ await frames(2); first=snap(); } }
      await frames(4); const after=snap(); n+=5;
      notes.push(`20 switches in ${((performance.now()-t0)/1000).toFixed(1)} s: baseline ${JSON.stringify(base)} → after the first round ${JSON.stringify(first)} → after 20 ${JSON.stringify(after)}`);
      for(const k of ['programs', 'geometries', 'textures', 'made', 'live']) if(after[k]!==base[k]) miss(`after 20 switches ${k} is ${after[k]}, the baseline ${base[k]}`);
      TR.testRoomMode('leak'); await go(TEST); await go(FOREST); await frames(2); const leak=snap(); n++;
      notes.push(`CONTROL the leaking test room: textures ${base.textures} → ${leak.textures}`);
      if(!(leak.textures>base.textures)) miss(`CONTROL: the leaking test room left textures at ${leak.textures} (baseline ${base.textures}) — a leak is not caught`);
      TR.testRoomFreeLeaks(); TR.testRoomMode('plain'); await frames(2); }
    /* (1) detection pause: no frame taken inside an opening; CONTROL the old way takes some */
    { const rec=[]; H.sceneOpenDbg({ hook:(k, id)=>rec.push({ k, id, snapped:V.pumpStats().snapped }) });
      const delta=()=>{ const b=rec.find(x=>x.k==='begin' && x.id===TEST), e=rec.find(x=>x.k==='end' && x.id===TEST); return b && e ? e.snapped-b.snapped : NaN; };
      const s0=V.pumpStats().snapped; await sleep(600); const live=V.pumpStats().snapped-s0;
      TR.testRoomMode('slow', { ms:1200 }); rec.length=0; await go(TEST); const paused=delta();
      await go(FOREST); H.sceneOpenDbg({ pause:false }); rec.length=0; await go(TEST); const old=delta(); H.sceneOpenDbg({ pause:true });
      TR.testRoomMode('plain'); H.sceneOpenDbg({ hook:null }); await go(FOREST); n+=2;
      notes.push(`frames taken inside a 1.2-s opening: ${paused} (CONTROL, the old way: ${old}; ${live} in 0.6 s before)`);
      if(paused!==0) miss(`hand detection took ${paused} camera frame(s) while the room opened (0 expected)`);
      if(!(old>0)) miss(`CONTROL: the old way took ${old} frames in the same opening — the pause cannot be told (the pump took ${live} in 0.6 s before)`); }
    /* a failed opening: the room's 2D stand-in, no renderer, detection free; back to the forest */
    { TR.testRoomMode('fail'); const st0=TR.testRoomInfo().stand; await go(TEST); await frames(4); const I=H.sceneInfo(), st=TR.testRoomInfo().stand-st0; n++;
      if(I.webgl || I.opening || H.scenePausing() || !(st>0)) miss(`a failed opening: webgl ${I.webgl}, opening ${JSON.stringify(I.opening)}, paused ${H.scenePausing()}, stand-in drawn ${st}× (no renderer, no pause, the stand-in expected)`);
      TR.testRoomMode('plain'); await go(FOREST); await opened(); n++; if(!H.sceneInfo().webgl) miss('after a failed opening the forest did not come back'); }
    /* an opening past its deadline: the stand-in shows and detection runs, then the room comes */
    { H.sceneOpenDbg({ lateMs:300 }); TR.testRoomMode('slow', { ms:1500 }); const st0=TR.testRoomInfo().stand, p=RS.roomSwitch(TEST, { fast:true });
      await sleep(800); await frames(3); const I=H.sceneInfo(), st=TR.testRoomInfo().stand-st0, pz=H.scenePausing(); await p; await opened(); n+=2;
      if(!(I.opening && I.opening.late) || pz || !(st>0)) miss(`an opening past its deadline: ${JSON.stringify(I.opening)}, paused ${pz}, stand-in drawn ${st}× (late, not paused, the stand-in expected)`);
      if(H.sceneInfo().id!==TEST || !H.sceneInfo().webgl) miss('after the late opening the test room did not come: '+JSON.stringify(H.sceneInfo()));
      H.sceneOpenDbg({ lateMs:null }); TR.testRoomMode('plain'); await go(FOREST); await opened(); }
    /* Dark → Room: the opening is paused and veiled until the room has drawn, then unveiled */
    { await H.setBackground('dark'); await frames(2); let veiledAtEnd=null; H.sceneOpenDbg({ hook:(k)=>{ if(k==='end'){ const c=$('scene'); veiledAtEnd=!!(c && c.classList.contains('veil')); } } });
      const p=H.setBackground('forest'), pz=H.scenePausing(); await p; await opened(); H.sceneOpenDbg({ hook:null }); const c=$('scene'); n++;
      if(!pz || veiledAtEnd!==true || !c || c.classList.contains('veil')) miss(`Dark → Room: paused at the start ${pz}, veiled until drawn ${veiledAtEnd}, unveiled after ${!!c && !c.classList.contains('veil')}`); }
    /* (2) no audio node during whole switches (fades, nature crossfade, bed held and resumed); CONTROL one node made inside the window */
    { await sleep(300); const amb0=RS.roomSwitchDbg().nature; counter=nodeCounter(); const tint0=TN.tintNow(), ts=performance.now(), p=RS.roomSwitch(TEST); A.AC.createGain();
      await sleep(650); const tintMid=TN.tintNow(); await p; const c1=counter.n;
      /* (2c) DESIGN-1: THE TINT FOLLOWS THE ROOM — lime in the forest, eased (a colour between the two, 650 ms in), the test room's amber once in: the
         root's tint and a tint accent (a link) both; the brand (Begin) unmoved. CONTROL: the tint pinned back to lime in the test room is caught */
      { await sleep(Math.max(0, 1500-(performance.now()-ts)));
        const rgb=tok=>{ const h=getComputedStyle(document.documentElement).getPropertyValue('--cv-'+tok).trim(); return `rgb(${parseInt(h.slice(1,3),16)}, ${parseInt(h.slice(3,5),16)}, ${parseInt(h.slice(5,7),16)})`; }, lnk=()=>getComputedStyle($('nightHowTo')).color, brand=()=>getComputedStyle($('nightBegin')).backgroundColor;
        const follows=()=>TN.tintNow()===rgb(TR.TEST_ROOM.tint) && lnk()===rgb(TR.TEST_ROOM.tint) && brand()===rgb(FR.tint);
        n+=4; notes.push(`the tint: forest ${tint0} → 650 ms into the switch ${tintMid} → the test room ${TN.tintNow()} (a link ${lnk()}, Begin ${brand()})`);
        if(tint0!==rgb(FR.tint)) miss(`in the forest the tint reads ${tint0}, not the forest's ${rgb(FR.tint)}`);
        if(!(tintMid!==tint0 && tintMid!==rgb(TR.TEST_ROOM.tint))) miss(`650 ms into the switch the tint is ${tintMid} — not eased (it should lie between ${tint0} and ${rgb(TR.TEST_ROOM.tint)})`);
        if(!follows()) miss(`in the test room the tint did not follow: root ${TN.tintNow()}, a link ${lnk()}, Begin ${brand()} (wanted ${rgb(TR.TEST_ROOM.tint)}, Begin ${rgb(FR.tint)})`);
        TN.tintApply({ tint:FR.tint }, { now:true }); const ctl=follows(); TN.tintApply(TR.TEST_ROOM, { now:true });
        if(ctl) miss('CONTROL: the tint pinned to lime in the test room still read as following — the check cannot fail'); else notes.push('CONTROL: the tint pinned to lime in the test room is caught'); }
      const nat=RS.roomSwitchDbg().nature, B=BD.bedDbg(); await sleep(200); const B2=BD.bedDbg();
      /* (2b) the forest's sound really goes: the live slots 2.5 s in, then parked after the fade */
      { await sleep(Math.max(0, 2500-(performance.now()-ts))); const N=RS.roomSwitchDbg().nature, on=N && N.slots[N.cur], old=N && N.slots[1-N.cur]; n+=2;
        notes.push(`2.5 s into the switch: sounding ${on && on.id} (mix ${on && on.mix.toFixed(3)}, wind ${on && on.wind}, crickets ${on && on.crickets}, drone ${on && on.drone.join('/')}), the forest's slot ${old && old.id} at ${old && old.mix.toFixed(3)}`);
        if(!on || on.id!==TR.TEST_ROOM.nature.id || on.wind!==0 || on.crickets!==0 || on.drone.some(x=>x!==0) || !(on.mix>0.9)) miss('2.5 s into the switch the sounding nature slot is not the test room\'s silent recipe: '+JSON.stringify(on));
        if(!old || old.id!==FR.nature.id || !(old.mix<0.15)) miss('2.5 s into the switch the forest\'s nature slot has not faded: '+JSON.stringify(old));
        for(let k=0;k<80 && !RS.roomSwitchDbg().nature.slots[1-RS.roomSwitchDbg().nature.cur].parked;k++){ await sleep(100); A.ambienceTick(); }
        n++; const P=RS.roomSwitchDbg().nature; if(!P.slots[1-P.cur].parked) miss(`the forest's nature slot was not taken out of the graph after its fade (${((performance.now()-ts)/1000).toFixed(1)} s): `+JSON.stringify(P.slots)); }
      const back=RS.roomSwitch(FOREST); await back; const c2=counter.n, names=counter.names.slice(); counter.off(); counter=null; n+=5;
      { await sleep(1500); n++; const h=getComputedStyle(document.documentElement).getPropertyValue('--cv-'+FR.tint).trim(), t=TN.tintNow(), want=`rgb(${parseInt(h.slice(1,3),16)}, ${parseInt(h.slice(3,5),16)}, ${parseInt(h.slice(5,7),16)})`;
        if(t!==want) miss(`back in the forest the tint reads ${t}, not ${want}`); }   // DESIGN-1
      notes.push(`audio nodes made during two whole switches: ${c2-1} (CONTROL, the row's own node: counted ${c1>=1 ? 'yes' : 'NO'}); nature ${amb0 && amb0.id} → ${nat && nat.id}`);
      if(c1<1) miss('CONTROL: the node the row made inside the window was not counted');
      if(c2!==1) miss(`${c2-1} audio node(s) made during the switches: ${names.join(', ')}`);
      if(!nat || nat.id!==TR.TEST_ROOM.nature.id || !amb0 || nat.cur===amb0.cur) miss(`the nature did not move to the test room's recipe on its other slot: ${JSON.stringify(amb0)} → ${JSON.stringify(nat)}`);
      if(B.recipe2!==TR.TEST_ROOM.bed2 || B.recipe!==TR.TEST_ROOM.bed) miss('the music bed did not take the test room\'s recipes');
      if(B2.holding || !B2.v2.on) miss(`the music bed did not play again after the switch: holding ${B2.holding}, v2 on ${B2.v2.on}`);
      { const S=RS.roomSwitchDbg(); if(S.stored===TEST) miss('the test room was remembered (only real rooms are)');
        if(S.stored!==FOREST) miss(`back in the forest, the remembered room is ${S.stored}`); } }
    /* (3) the nature crossfade, offline: no click, the first 2 s untouched, the new nature after; CONTROL an instant swap clicks */
    { const R=await import('../../../core/render.js'), AM=await import('../../../apps/night/sound/ambience.js'), S=await import('../../../core/scales.js');
      const SEC=14, root=S.tonicFreq()/2, fifth=S.droneSecondHz(), copy={ ...FR.nature };   // copy: the forest's numbers in another object (the CONTROL of «gone»)
      const play=(swap, instant, to=TR.TEST_ROOM.nature)=>e=>{ const E=e.engineCtx(), a=AM.buildAmbience(E, E.master.in, 0, FR.nature, 2); AM.ambienceTune(E, a, root, fifth, 0); AM.ambienceSet(E, a, true, 1, 0.05, true);
        AM.ambienceSchedule(E, a, swap ? 2 : SEC); if(swap){ AM.ambienceRoom(E, a, to, 2, { instant }); AM.ambienceSchedule(E, a, SEC); } };
      const none=midOf(await R.goldRender(play(false), SEC)), sw=midOf(await R.goldRender(play(true, false), SEC)), hard=midOf(await R.goldRender(play(true, true), SEC)), same=midOf(await R.goldRender(play(true, false, copy), SEC));
      { const db=x=>20*Math.log10(Math.max(1e-12, rms(x, 12, SEC))/Math.max(1e-12, rms(none, 12, SEC))), g=db(sw), gc=db(same); n+=2;
        notes.push(`10 s after the swap: ${g.toFixed(1)} dB against no switch (CONTROL, a swap to a copy of the forest's recipe: ${gc.toFixed(1)} dB)`);
        if(!(g<=-60)) miss(`10 s after the swap to the silent test room the forest is still there: ${g.toFixed(1)} dB (≤ −60)`);
        if(!(gc>-60)) miss(`CONTROL: a swap to a copy of the forest's recipe reads ${gc.toFixed(1)} dB — the «gone» check cannot fail`); }
      let pre=0; for(let i=0;i<Math.round(1.99*RATE);i++) pre=Math.max(pre, Math.abs(sw[i]-none[i]));
      const dif=new Float32Array(sw.length); for(let i=0;i<sw.length;i++) dif[i]=sw[i]-none[i];
      const k=clickOf(sw, RATE), sp=spikeAt(sw, 2), spc=spikeAt(hard, 2), kc=clickOf(hard, RATE), moved=rms(dif, 4, SEC)/Math.max(1e-9, rms(none, 4, SEC)); n+=5;
      notes.push(`nature crossfade offline: at the swap ${sp.toFixed(2)} × its neighbourhood (CONTROL instant ${spc.toFixed(1)} ×), house measure ${k.toFixed(3)} (instant ${kc.toFixed(3)}), before the switch ${pre.toExponential(1)} from no switch, after it ${moved.toFixed(2)} × the old nature's level apart`);
      if(!(pre<=1e-6)) miss(`the first 2 s differ from no switch by ${pre.toExponential(2)} (the parked slot leaked)`);
      if(!(sp<=2)) miss(`a click at the nature crossfade: ${sp.toFixed(2)} × its neighbourhood (≤ 2)`);
      if(!(k<=0.5)) miss(`a click in the nature crossfade: ${k.toFixed(3)} (≤ 0.5)`);
      if(!(spc>2)) miss(`CONTROL: an instant swap reads ${spc.toFixed(2)} × its neighbourhood — the click check cannot fail`);
      if(!(moved>0.3)) miss(`after the crossfade the nature is still the old one (${moved.toFixed(2)})`); }
    /* the Room button switches; printed: the browser's dropouts (switches, quiet windows, the old way) */
    { const d0=drops(), t0=performance.now(); $('nightRoom').click(); const to=H.sceneRoom(); for(let k=0;k<100 && !(RS.roomSwitchDbg().last && RS.roomSwitchDbg().last.id===to);k++) await sleep(50);
      await frames(2); n+=2; if(to!==TEST) miss(`the Room button went to ${to}, not the next room`);
      if($('nightRoom').querySelector('.night-val').textContent!==I18.L(TR.TEST_ROOM.name)) miss('the Room button does not show the test room\'s name after the switch');
      for(const id of [FOREST, TEST]) await RS.roomSwitch(id);
      const sw=(performance.now()-t0)/1000, d1=drops(); await sleep(sw*1000); const d2=drops();
      H.sceneOpenDbg({ pause:false }); const t1=performance.now(); for(const id of [FOREST, TEST, FOREST]) await RS.roomSwitch(id, { fast:true }); H.sceneOpenDbg({ pause:true });
      const so=(performance.now()-t1)/1000, d3=drops();
      notes.push(Number.isFinite(d0) ? `dropouts (printed, not judged): 3 switches ${d1-d0} in ${sw.toFixed(1)} s · a quiet window ${d2-d1} in ${sw.toFixed(1)} s · 3 switches the old way ${d3-d2} in ${so.toFixed(1)} s` : 'dropouts: this browser has no dropout counter'); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{
    try{ if(counter) counter.off(); }catch(e){}
    H.sceneOpenDbg({ pause:true, lateMs:null, hook:null }); TR.testRoomMode('plain'); TR.testRoomFreeLeaks();
    try{ if(H.sceneRoom()!==keep.room) await RS.roomSwitch(keep.room, { fast:true }); }catch(e){}
    TR.testRoomRemove(); try{ reshow(); }catch(e){}
    BD.bedSetEngine(keep.engine==='v1' ? 'v1' : 'v2'); BD.bedSetMode(keep.mode, FR.bed, FR.bed2);
    try{ await H.setBackground(keep.bg); }catch(e){}
    try{ if(keep.key==null) localStorage.removeItem(RS.ROOM_KEY); else localStorage.setItem(RS.ROOM_KEY, keep.key); }catch(e){}
  }
  { n++; if(!$('nightRoom').hidden) miss('the Room button still shows after the test room left (one room)'); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.98, night:true, name:'NIGHT room switch', drawn:true, run:()=>checkNightRoomSwitch(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
