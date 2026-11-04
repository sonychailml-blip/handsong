/* NIGHT-3 stage 4: row «NIGHT music bed» (P.night). Offline, on the render copy, from the driver's own timeline (bedPlan = the live event path):
   (1) the same plan twice is the same sound; CONTROL another seed differs; (2) its LEVEL at the default volume sits near the forest's nature
   sound at its default (the user: «near where the nature sound sits today», tuned by ear later) — the measured gap is in the notes; (3) no click
   (curvature ≤ 0.5) in Drift and Glimmer; (4) every pad note is below the playing's lowest note (the tonic, solo octave 0) and above the ground,
   the ground is the tonic and the drone's second string an octave under the drone; (5) the drone HANDS OVER: the ambience built with its drone
   left out has no energy at the drone's two pitches (CONTROL: with it, it has); (6) the node census of the bed (the cost's deterministic proxy;
   the measured cost is the headroom page's «+ the music bed» rows). Live: the Music button cycles Off → Still → Drift → Glimmer → Off with its
   value, remembered; the driver builds once, takes the drone, fills its voices from the live view, follows a Mood change (the new scale's notes),
   parks a while after Off. Everything it touched is put back. */
import { row } from '../core/rows.js';

const SEC=40, RATE=48000;
const midOf=b=>{ const m=new Float32Array(b.L.length); for(let i=0;i<m.length;i++) m[i]=(b.L[i]+b.R[i])/2; return m; };
const rmsDb=(x,s0,s1)=>{ let e=0; const a=Math.round(s0*RATE), z=Math.min(x.length, Math.round(s1*RATE)); for(let i=a;i<z;i++) e+=x[i]*x[i]; return 10*Math.log10(e/Math.max(1,z-a)+1e-20); };
/* the energy at one frequency (Goertzel over [s0, s1]) */
const at=(x,f,s0,s1)=>{ const a=Math.round(s0*RATE), z=Math.min(x.length, Math.round(s1*RATE)), w=2*Math.PI*f/RATE, c=2*Math.cos(w); let p=0, q=0;
  for(let i=a;i<z;i++){ const s=x[i]+c*p-q; q=p; p=s; } return (p*p+q*q-c*p*q)/Math.pow(z-a,2); };
export async function checkNightBed(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const R=await import('../../../core/render.js'), S=await import('../../../core/scales.js'), A=await import('../../../core/audio.js');
  const BD=await import('../../../apps/night/bed.js'), SB=await import('../../../apps/night/sound/bed.js'), AM=await import('../../../apps/night/sound/ambience.js');
  const FR=(await import('../../../apps/night/rooms/forest/pure/room.js')).FOREST_ROOM, B=FR.bed, { clickOf }=await import('./night.js');
  const KEYS=['handsong.nightMusic','handsong.nightMusicVol','handsong.nightMusicAnswer'], kept=KEYS.map(k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } });
  const was={ mode:BD.bedModeOf(), vol:BD.bedVolumeOf(), answer:BD.bedAnswerOf() }, UI=await import('../../../core/legacy-ui/ui.js'), D=UI.shellDoors(), mood0=D.mood();
  try{
    /* (1)–(4) offline */
    let plan=null; const play=(preset,o={})=>e=>{ const E=e.engineCtx(); plan=BD.bedPlan(E, E.master.in, B, preset, SEC, o); };
    const a=midOf(await R.goldRender(play('drift'), SEC)), pa=plan, b=midOf(await R.goldRender(play('drift'), SEC)), c=midOf(await R.goldRender(play('drift',{ seed:99 }), SEC));
    let rep=0, ctl=0; for(let i=0;i<a.length;i++){ rep=Math.max(rep,Math.abs(a[i]-b[i])); ctl=Math.max(ctl,Math.abs(a[i]-c[i])); }
    n+=2; if(!(rep<=1e-6)) miss('the same plan twice differs by '+rep.toExponential(2)); if(!(ctl>1e-3)) miss('CONTROL: another seed gave the same bed');
    const g=midOf(await R.goldRender(play('glimmer'), SEC)), amb=midOf(await R.goldRender(e=>{ e.ambienceOn(true, FR.nature.level, 0.05); e.ambienceTick(SEC); }, SEC));
    const lb=rmsDb(a,10,SEC), lg=rmsDb(g,10,SEC), la=rmsDb(amb,10,SEC); notes.push(`level at the default volume: Drift ${(lb-la).toFixed(1)} dB, Glimmer ${(lg-la).toFixed(1)} dB against the nature sound at its default (${la.toFixed(1)} dBFS)`);
    n++; if(Math.abs(lb-la)>4) miss(`Drift sits ${(lb-la).toFixed(1)} dB from the nature sound (within ±4 dB wanted)`);
    for(const [tag,x] of [['Drift',a],['Glimmer',g]]){ const k=clickOf(x, RATE); n++; if(!(k<=0.5)) miss(`a click in ${tag}: ${k.toFixed(3)}`); }
    { const v=S.CUR(), N=v.iv.length, top=S.tonicFreq(v), hz=s=>S.chordRowFreq(((s%N)+N)%N, Math.floor(s/N), v), G=[S.chordRowFreq(0,-1,v), S.droneSecondHz(v)/2];
      const steps=pa.events.filter(e=>e.kind==='chord').flatMap(e=>e.steps), H=steps.map(hz); n+=3;
      if(!steps.length) miss('the plan has no chord');
      if(H.some(f=>!(f<top))) miss(`a pad note at ${Math.max(...H).toFixed(1)} Hz, not below the playing's lowest (${top.toFixed(1)} Hz)`);
      if(H.some(f=>!(f>G[0])) || JSON.stringify(pa.bed.ground.hz)!==JSON.stringify(G)) miss(`the ground ${JSON.stringify(pa.bed.ground.hz)} vs ${JSON.stringify(G)}, pads from ${Math.min(...H).toFixed(1)} Hz`);
      notes.push(`pads ${Math.min(...H).toFixed(0)}–${Math.max(...H).toFixed(0)} Hz under the playing's ${top.toFixed(0)} Hz; ground ${G.map(f=>f.toFixed(1)).join(' + ')} Hz`); }
    /* (5) the drone hands over: the ambience with its drone out vs in */
    { const v=S.CUR(), root=S.tonicFreq(v)/2, fifth=S.droneSecondHz(v);
      const one=drone=>e=>{ const E=e.engineCtx(), x=AM.buildAmbience(E, E.master.in, 0, FR.nature); AM.ambienceTune(E, x, root, fifth, 0); AM.ambienceSet(E, x, true, 1, 0.05, drone); AM.ambienceSchedule(E, x, 8); };
      const on=midOf(await R.goldRender(one(true), 8)), off=midOf(await R.goldRender(one(false), 8));
      const r1=at(off,root,4,8)/at(on,root,4,8), r2=at(off,fifth,4,8)/at(on,fifth,4,8); n+=2; notes.push(`drone out: its root ${(10*Math.log10(r1)).toFixed(1)} dB, its fifth ${(10*Math.log10(r2)).toFixed(1)} dB`);
      if(!(r1<0.01 && r2<0.01)) miss(`with the drone out, its pitches keep ${(100*r1).toFixed(1)} % / ${(100*r2).toFixed(1)} % of their energy`);
      if(!(at(on,root,4,8)>1e-9)) miss('CONTROL: with the drone in, no energy at its root'); }
    /* (6) the census: what the bed builds (its cost's proxy) */
    { const cnt={}; const real=new OfflineAudioContext(2, 128, RATE), fake=new Proxy(real, { get:(t,k)=>{ const v=t[k]; if(typeof v==='function' && /^create/.test(k)) return (...x)=>{ cnt[k]=(cnt[k]||0)+1; return v.apply(t,x); }; return typeof v==='function' ? v.bind(t) : v; } });
      const dest=real.createGain(); SB.buildBed({ ac:fake }, dest, B, [0,0,0,0,0]);
      const osc=cnt.createOscillator||0, bq=cnt.createBiquadFilter||0; n++; notes.push('the bed builds '+Object.entries(cnt).map(([k,v])=>`${v} ${k.slice(6)}`).join(', '));
      if(osc!==SB.BED_POOL*2+3+SB.BED_GLIM || bq!==3) miss(`the census: ${osc} oscillators, ${bq} filters`); }
    /* live: the button, the driver */
    const btn=document.getElementById('nightMusic'), val=()=>btn.querySelector('.night-val').textContent.trim(), I=await import('../../../core/i18n.js');
    BD.bedSetMode('off'); { const seen=[]; for(let k=0;k<4;k++){ btn.click(); seen.push(BD.bedModeOf()+'='+val()); }
      const want=['still','drift','glimmer','off'].map(m=>m+'='+I.t('night.music.'+m)); n++; if(seen.join()!==want.join()) miss('the Music button: '+seen.join(' · '));
      let st=null; try{ st=localStorage.getItem('handsong.nightMusic'); }catch(e){} n++; if(st!=='off') miss('the Music button did not remember its value ('+st+')'); }
    BD.bedSetMode('drift', B); BD.bedTick(); const L0=BD.bedDbg(), v0=S.CUR(), N0=v0.iv.length; n+=3;
    if(!L0.built || L0.parked || !BD.bedTakesDrone()) miss('On: '+JSON.stringify({ built:L0.built, parked:L0.parked, drone:BD.bedTakesDrone() }));
    if(L0.slots.length!==B.presets.drift.voices) miss('On: the first chord did not come ('+L0.slots.length+' voices)');
    { const set=new Set(); for(let o=-1;o<=1;o++) for(let k=0;k<N0;k++) set.add(S.chordRowFreq(k,o,v0).toFixed(6)); if(L0.slots.some(i=>!set.has(L0.voices[i].hz.toFixed(6)))) miss('On: a voice not on the scale'); }
    { const other=D.moods().find(m=>m!==mood0); D.setMood(other); const v1=S.CUR(), N1=v1.iv.length, t1=A.AC.currentTime; BD.bedTick(t1); BD.bedTick(t1+0.5);
      const L1=BD.bedDbg(), set=new Set(); for(let o=-1;o<=1;o++) for(let k=0;k<N1;k++) set.add(S.chordRowFreq(k,o,v1).toFixed(6)); n++;
      if(L1.slots.some(i=>!set.has(L1.voices[i].hz.toFixed(6)))) miss(`a Mood change (${other}): the next chord is not of the new scale`); D.setMood(mood0); }
    BD.bedSetMode('off'); n+=2; if(BD.bedTakesDrone()) miss('Off: the bed still holds the drone');
    BD.bedTick(A.AC.currentTime+BD.BED_PARK_S+1); if(!BD.bedDbg().parked) miss('Off: the bed was not parked after '+BD.BED_PARK_S+' s');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ if(D.mood()!==mood0) D.setMood(mood0); }catch(e){} BD.bedSetVolume(was.vol); BD.bedSetAnswer(was.answer); BD.bedSetMode(was.mode, B);
    KEYS.forEach((k,i)=>{ try{ if(kept[i]==null) localStorage.removeItem(k); else localStorage.setItem(k, kept[i]); }catch(e){} }); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.975, night:true, name:'NIGHT music bed', run:()=>checkNightBed(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
