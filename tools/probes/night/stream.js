/* NIGHT-8: row «NIGHT stream, water and ground» —
   (1) BUILT without a renderer, at each level: today's seven aisle rocks are instances of the stream's stones (no rock mesh of their own), every
       stone has a shape of its own (aRock.w > 0, the seeds all different) and the moss cushions none (0); the litter at the level's counts joins
       the drifting leaves, the pebbles and the branches (their instance counts grow by exactly that); the ground's macro patch is on; the water
       knows the rocks standing in it (each within the water, at most WATER_RK) and, after a few frames, reflects glowing things (the mushrooms
       nearest the stream first, each within 2.2 m of it);
   (2) DRAWN (the opened forest at medium, one frame drawn twice): the litter, the ground's large scale and the white water each change the
       picture — CONTROL the same frame twice differs by 0;
   (3) THE SOUND, live: the stream's worklet joins the nature sound (its node in every slot's stream gain, the forest's gain); with the room's
       sound at 0 it sleeps (the worklet says so, and makes no bubble while asleep); back up, it wakes and bubbles; the person's level restored;
   (4) THE SOUND, offline (the worklet loaded into an offline context, the forest's nature at its default level, the drone out as when the music
       plays): the stream alone sits at least 4 dB under the rest of the nature sound (K-like) — so under the music, which sits near the nature
       sound (row «NIGHT music bed») — and lifts the whole by at most 2 dB; it is spread in stereo (L/R correlation under 0.9) — CONTROL the
       stream 12 dB louder breaks the 4-dB judgement;
   NIGHT-8b: live, the shipped recording takes over (fetched, decoded, handed over: its frames advance awake and stand still asleep); offline,
       it decodes in this browser (about 67.9 s), the stream with it sits within ±0.75 dB of the synthesis's place under the wind and crickets
       (the same K-like loudness by the recipe's level factor) and stays spread in stereo; a missing file is refused (the synthesis stays);
   (5) THE ROOM'S ICON: the Room-sounds slider shows the current room's own icon (the forest's leaf). */
import { row } from '../core/rows.js';
import { frame } from '../core/kit.js';
import { cv } from '../../../core/palette.js';
import { kLoud } from './night.js';
import { loadThree, setBackground, sceneInfo, setSceneLevel, sceneLevel, sceneRoomDbg, sceneSnapDbg } from '../../../apps/night/scene/host.js';
import { buildForest, forestAssets, FOREST_LEVELS } from '../../../apps/night/rooms/forest/forest.js';
import { FOREST_ROOM } from '../../../apps/night/rooms/forest/pure/room.js';
import { streamNear, STREAM } from '../../../apps/night/rooms/forest/pure/forestlife.js';
import { WATER_RK } from '../../../apps/night/rooms/forest/forest-life.js';
import { profileCurrent, profileApply } from '../../../core/profile.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const frames=async n=>{ for(let i=0;i<n;i++) await frame(); };
export async function checkNightStream(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const was=profileCurrent(), keepLevel=sceneLevel(), NIN={ mood:'major-penta', sleep:0 };
  try{
    /* (1) built */
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const rooms=[];
    try{
      for(const lv of ['full','reduced']){ const L=FOREST_LEVELS[lv], r=buildForest(T, { C:cv, level:lv, w:844, h:390 }); rooms.push(r);
        const P=r.streamDbg.parts, st=r.state(), G=r.groundDbg, ak=P.rocks.geometry.attributes.aRock, cush=r.woodDbg.parts.moss.geometry.attributes.aRock; n+=6;
        if(st.stream.aisle!==7 || P.rocks.count!==L.rocks+7) miss(`${lv}: the stones' draw holds ${P.rocks.count} (rocks ${L.rocks} + 7 aisle rocks wanted)`);
        { let sep=0; r.scene.traverse(o=>{ if(o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.type==='IcosahedronGeometry') sep++; }); if(sep) miss(`${lv}: ${sep} rock meshes of their own remain`); }
        { const w=[], sd=new Set(); for(let i=0;i<P.rocks.count;i++){ w.push(ak.getW(i)); sd.add(ak.getX(i).toFixed(6)); } if(w.some(x=>!(x>0)) || sd.size!==P.rocks.count) miss(`${lv}: a stone without its own shape (w ${Math.min(...w).toFixed(2)}, ${sd.size} seeds of ${P.rocks.count})`);
          if(!cush || [...cush.array].some(x=>x!==0)) miss(lv+': the moss cushions take a rock\'s shape'); }
        const Lt=G.litter; if(Lt.leaves.length!==L.litterLeaves || Lt.pebbles.length!==L.litterPebbles || Lt.twigs.length!==L.litterTwigs || P.floaters.count!==L.floaters+L.litterLeaves || P.pebbles.count!==L.pebbles+L.litterPebbles || G.branches.count!==G.brs+L.litterTwigs)
          miss(`${lv}: litter ${Lt.leaves.length}/${Lt.pebbles.length}/${Lt.twigs.length}, draws ${P.floaters.count}/${P.pebbles.count}/${G.branches.count}`);
        if(!st.ground.macro || !G.U) miss(lv+': the ground\'s large scale is off');
        const RK=r.lifeDbg.WU.uRk.value.filter(v=>v.z>0); if(!RK.length || RK.length>WATER_RK || RK.some(v=>streamNear(v.x, v.y).d>=STREAM.half)) miss(`${lv}: the water's rocks ${RK.length} (${RK.map(v=>streamNear(v.x, v.y).d.toFixed(2)).join(', ')})`);
        for(let i=0;i<10;i++) r.update(1/30, 60+i/30, [], null, NIN);
        const GL=r.lifeDbg.WU.uGl.value.filter(v=>v.w>0); n++; if(!GL.length) miss(lv+': the water reflects no glowing thing');
        notes.push(`${lv}: ${P.rocks.count} stones (7 aisle), ${P.pebbles.count} pebbles (${L.litterPebbles} on the ground), ${P.floaters.count} leaves (${L.litterLeaves} on the ground), ${L.litterTwigs} twigs; water: ${RK.length} rocks, ${GL.length} reflections`); }
    } finally { for(const r of rooms) r.dispose(); }
    /* (2) drawn */
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); await frames(6);
    const room=sceneRoomDbg();
    if(!room || !sceneInfo().webgl) notes.push('no WebGL room — the drawn checks do not apply');
    else { const P=room.streamDbg.parts, G=room.groundDbg, L=FOREST_LEVELS.reduced, black=new (await loadThree()).DataTexture(new Uint8Array([0,0,0,0]), 1, 1); black.needsUpdate=true;
      const keepRk=room.lifeDbg.WU.uRk.value.map(v=>v.clone());
      const parts=[['the litter', on=>{ P.floaters.count= on ? L.floaters : L.floaters+L.litterLeaves; P.pebbles.count= on ? L.pebbles : L.pebbles+L.litterPebbles; G.branches.count= on ? G.brs : G.brs+L.litterTwigs; }],
        ['the ground\'s large scale', on=>{ G.U.uGM.value= on ? black : room.groundDbg.tex0; }],
        ['the white water', on=>{ room.lifeDbg.WU.uRk.value.forEach((v,i)=>{ if(on) v.set(0,0,0,0); else v.copy(keepRk[i]); }); }]];
      G.tex0=G.U.uGM.value;
      try{ for(const [name, alt] of parts){ const ab=await sceneSnapDbg(alt, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
          if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
          notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(3)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
          if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); } }
      finally { black.dispose(); delete G.tex0; } }
    /* (5) the room's icon on its slider */
    { const ic=document.querySelector('#nightRoomSoundRow .night-vico'); n++; if(!ic || ic.dataset.svg!==FOREST_ROOM.icon || !ic.querySelector('svg')) miss(`the Room-sounds slider's icon: ${ic && ic.dataset.svg} (the forest's «${FOREST_ROOM.icon}» wanted)`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  /* (3) the sound, live */
  try{
    const A=await import('../../../core/audio.js'), RS=await import('../../../apps/night/roomswitch.js'), AM=await import('../../../apps/night/sound/ambience.js');
    if(!A.AC) notes.push('no audio context — the live checks do not apply');
    else { const I0=A.ambienceInfo(), keep=I0 ? { on:I0.on, level:I0.level } : null;
      try{ A.ambienceOn(true, FOREST_ROOM.nature.level); let amb=null; for(let k=0;k<40 && !(amb && amb.brook);k++){ await sleep(100); amb=RS.natureAmbDbg(); }
        n+=2; if(!amb || !amb.brook){ miss('the stream\'s worklet never joined the nature sound'); }
        else { const cur=amb.slots[amb.cur]; if(Math.abs(cur.sg.gain.value-FOREST_ROOM.nature.stream.gain)>1e-6) miss(`the forest's stream gain ${cur.sg.gain.value}`);
          /* NIGHT-8b: the recording takes over from the synthesis (fetched, decoded, handed to the node); from then on it is what advances */
          for(let k=0;k<150 && !['on','failed','refused'].includes(amb.brook.rec);k++) await sleep(100); n++;
          if(amb.brook.rec!=='on') miss(`the stream recording did not take over (${amb.brook.rec})`);
          const adv=(a, b)=>!!(a && b && (b.rec ? b.rec.frames>a.rec.frames : b.made>a.made)), same=(a, b)=>!!(a && b && (b.rec ? b.rec.frames===a.rec.frames : b.made===a.made));
          await sleep(400); const s1=await AM.ambienceBrookStats(null, amb); await sleep(400); const s2=await AM.ambienceBrookStats(null, amb); n+=1;
          if(!s1 || !s2 || s1.sleep || !adv(s1, s2)) miss('awake, the stream does not play: '+JSON.stringify([s1, s2]));
          A.ambienceOn(true, 0); await sleep((AM.BROOK_SLEEP_S+0.6)*1000); const z1=await AM.ambienceBrookStats(null, amb); await sleep(300); const z2=await AM.ambienceBrookStats(null, amb); n+=2;
          if(!amb.brook.sleep || !z1 || !z1.sleep) miss('with the room\'s sound at 0 the stream does not sleep: '+JSON.stringify(z1));
          if(!same(z1, z2)) miss('asleep, the stream still computes: '+JSON.stringify([z1, z2]));
          A.ambienceOn(true, FOREST_ROOM.nature.level); await sleep(400); const w1=await AM.ambienceBrookStats(null, amb); await sleep(300); const w2=await AM.ambienceBrookStats(null, amb); n++;
          if(!w1 || w1.sleep || !adv(w1, w2)) miss('back up, the stream does not wake: '+JSON.stringify([w1, w2]));
          notes.push(s2 && s2.rec ? `live: the recording plays (${amb.brook.rec}; ${s2.rec.grains} grains, ${(s2.rec.frames/A.AC.sampleRate).toFixed(1)} s, ${s2.rec.voices} voices), asleep at 0 (frames ${z1 && z1.rec && z1.rec.frames} → ${z2 && z2.rec && z2.rec.frames}), awake again`
            : `live: ${s2 && s2.made} bubbles in ${s2 ? (s2.t/(A.AC.sampleRate/2)).toFixed(1) : '?'} s (the synthesis), asleep at 0, awake again`); } }
      finally { if(keep) A.ambienceOn(keep.on, keep.level); else A.ambienceOn(false, FOREST_ROOM.nature.level); } }
    /* (4) offline: the stream's level in the nature sound */
    { const RATE=48000, SEC=10, N=FOREST_ROOM.nature, S=await import('../../../core/scales.js'), root=S.tonicFreq()/2, fifth=S.droneSecondHz();
      /* NIGHT-8b: withRec — the shipped recording, decoded by this browser, handed to the node (14 s rendered, the first 6 left out: the 2-s hand-over) */
      const recOf=RS.natureRecOf(), render=async (rec, withStream, withRec=false)=>{ const sec=withRec ? 14 : SEC, skip=withRec ? 6 : 2, ctx=new OfflineAudioContext(2, RATE*sec, RATE); await ctx.audioWorklet.addModule(AM.NATURE_WORKLET); const E={ ac:ctx };
        const a=AM.buildAmbience(E, ctx.destination, 0, rec, 1); AM.ambienceTune(E, a, root, fifth, 0); AM.ambienceSet(E, a, true, N.level, 0, false); if(withStream) AM.ambienceBrook(E, a, N.stream.voices, 0); AM.ambienceSchedule(E, a, sec);
        let len=0; if(withRec){ const pcm=await RS.natureRecPcm(ctx, recOf.url); len=pcm.length; AM.ambienceBrookRec(E, a, pcm, recOf.norm); }
        const b=await ctx.startRendering(), Lc=b.getChannelData(0), Rc=b.getChannelData(1), m=new Float32Array(Lc.length); let xy=0, xx=0, yy=0; for(let i=RATE*skip;i<m.length;i++){ m[i]=(Lc[i]+Rc[i])/2; xy+=Lc[i]*Rc[i]; xx+=Lc[i]*Lc[i]; yy+=Rc[i]*Rc[i]; }
        return { k:kLoud(m.subarray(RATE*skip), RATE), c:xy/Math.sqrt(xx*yy||1), len, rec:withRec ? a.brook.rec : null }; };
      const without={ ...N, stream:{ ...N.stream, gain:0, send:0 } }, alone={ ...N, wind:{ ...N.wind, gain:0, send:0 }, crickets:{ ...N.crickets, gain:0, send:0 } }, loud={ ...alone, stream:{ ...N.stream, gain:Math.min(1, N.stream.gain*4) } };
      const all=await render(N, true), wo=await render(without, false), st=await render(alone, true), ctl=await render(loud, true), under=wo.k-st.k, lift=all.k-wo.k, uc=wo.k-ctl.k; n+=4;
      if(!(under>=4)) miss(`the stream sits only ${under.toFixed(1)} dB under the rest of the nature sound (at least 4 wanted)`);
      if(!(lift<=2)) miss(`the stream lifts the nature sound by ${lift.toFixed(1)} dB (at most 2)`);
      if(!(st.c<0.9)) miss(`the stream is not spread in stereo (L/R correlation ${st.c.toFixed(3)})`);
      if(!(uc<4)) miss(`CONTROL: the stream 12 dB louder still passes the 4-dB judgement (${uc.toFixed(1)} dB under)`);
      notes.push(`offline: the stream alone ${under.toFixed(1)} dB under the wind and crickets (K-like), the whole ${lift>=0?'+':''}${lift.toFixed(1)} dB with it; L/R correlation ${st.c.toFixed(3)}; CONTROL ×4 gain: ${uc.toFixed(1)} dB under`); 
      /* NIGHT-8b: the shipped recording — it decodes here, and the stream keeps its place under the wind and crickets (the synthesis's, ±0.75 dB:
         the same K-like loudness by its level factor); a missing file is refused (the node keeps the synthesis) */
      if(!recOf){ miss('the forest names no stream recording'); }
      else { const rr=await render(alone, true, true), ur=wo.k-rr.k, secs=rr.len/RATE; n+=4;
        if(!(secs>60 && secs<75)) miss(`the recording decoded to ${secs.toFixed(1)} s (about 67.9 wanted)`);
        if(rr.rec!=='on') miss('the offline node did not take the recording: '+rr.rec);
        if(!(Math.abs(ur-under)<=0.75)) miss(`with the recording the stream sits ${ur.toFixed(1)} dB under the rest, the synthesis ${under.toFixed(1)} (±0.75 dB wanted)`);
        if(!(rr.c<0.9)) miss(`the recording is not spread in stereo (L/R correlation ${rr.c.toFixed(3)})`);
        let refused=false; await RS.natureRecPcm(new OfflineAudioContext(1, 128, RATE), recOf.url.replace(/\.mp3$/, '-missing.mp3')).catch(()=>{ refused=true; }); n++;
        if(!refused) miss('a missing recording was not refused');
        notes.push(`the recording (${recOf.url.split('/').slice(-2).join('/')}, ×${recOf.norm}): decoded ${secs.toFixed(1)} s; the stream alone ${ur.toFixed(1)} dB under the wind and crickets (the synthesis ${under.toFixed(1)}), L/R correlation ${rr.c.toFixed(3)}; a missing file is refused (the synthesis stays)`); } }
  } catch(e){ miss('sound error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.645, name:'NIGHT stream, water and ground', drawn:true, slow:true, run:()=>checkNightStream(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
