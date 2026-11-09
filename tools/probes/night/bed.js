/* NIGHT-3 stage 4: row «NIGHT music bed» (P.night). Offline, on the render copy, from the driver's own timeline (bedPlan = the live event path):
   (1) the same plan twice is the same sound; CONTROL another seed differs; (2) its LEVEL at the default volume sits near the forest's nature
   sound at its default (the user: «near where the nature sound sits today», tuned by ear later) — the measured gap is in the notes; (3) no click
   (curvature ≤ 0.5) in Drift and Glimmer; (4) every pad note is below the playing's lowest note (the tonic, solo octave 0) and above the ground,
   the ground is the tonic and the drone's second string an octave under the drone; (5) the drone HANDS OVER: the ambience built with its drone
   left out has no energy at the drone's two pitches (CONTROL: with it, it has); (6) the node census of the bed (the cost's deterministic proxy;
   the measured cost is the headroom page's «+ the music bed» rows). Live: the Music button cycles Off → Still → Drift → Glimmer → Off with its
   value, remembered; the driver builds once, takes the drone, fills its voices from the live view, follows a Mood change (the new scale's notes),
   parks a while after Off. Everything it touched is put back.
   NIGHT-4 — v2 (one worklet, apps/night/bed2.js): offline, on the render copy with the worklet loaded for real, from the driver's own timeline
   (bed2Plan = the live message path): (7) the same plan twice is the same sound, CONTROL another seed differs; (8) Drift's level at the default
   volume near the nature sound (±4 dB, as v1; the K-like loudness of each preset printed); (9) no click in Still, Drift, Glimmer; (10) every Hz
   is a price of the live view (rule #2: a chord-row pitch of the scale), the ground is the tonic and the drone's second string an octave under
   the drone, the air lies above the playing's highest note, a pad chord spans an octave; (11) the worklet dropped no note and applied none late;
   (12) a context without AudioWorklet makes v2 fail cleanly (the door plays v1). Live: v2 is the default, loads, takes the drone, its pad is on
   the scale and follows a Mood change, plays no burst after a gap, parks after Off; the A/B switch hands over v2 → v1 → v2 while playing. The
   v1 cases run behind its switch (NIGHT-5: v1 too plays no burst after a gap). */
import { row } from '../core/rows.js';
import { BUS } from '../../../core/pure/bus.js';   // NIGHT-6 slice 1: the bed's events for the room

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
  const B2=await import('../../../apps/night/bed2.js'), SB2=await import('../../../apps/night/sound/bed2.js');   // NIGHT-4
  const FR=(await import('../../../apps/night/rooms/forest/pure/room.js')).FOREST_ROOM, B=FR.bed, R2=FR.bed2, { clickOf, kLoud }=await import('./night.js');
  const KEYS=['handsong.nightMusic','handsong.nightMusicVol','handsong.nightMusicAnswer'], kept=KEYS.map(k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } });
  const was={ mode:BD.bedModeOf(), vol:BD.bedVolumeOf(), answer:BD.bedAnswerOf(), engine:BD.bedEngineOf(), palette:BD.bedPaletteOf(), light:BD.bedLightOf() }, UI=await import('../../../core/legacy-ui/ui.js'), D=UI.shellDoors(), mood0=D.mood();
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
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
    BD.bedSetEngine('v1'); BD.bedSetMode('drift', B); BD.bedTick(); const L0=BD.bedDbg(), v0=S.CUR(), N0=v0.iv.length; n+=3;
    if(!L0.built || L0.parked || !BD.bedTakesDrone()) miss('On: '+JSON.stringify({ built:L0.built, parked:L0.parked, drone:BD.bedTakesDrone() }));
    if(L0.slots.length!==B.presets.drift.voices) miss('On: the first chord did not come ('+L0.slots.length+' voices)');
    { const set=new Set(); for(let o=-1;o<=1;o++) for(let k=0;k<N0;k++) set.add(S.chordRowFreq(k,o,v0).toFixed(6)); if(L0.slots.some(i=>!set.has(L0.voices[i].hz.toFixed(6)))) miss('On: a voice not on the scale'); }
    { const other=D.moods().find(m=>m!==mood0); D.setMood(other); const v1=S.CUR(), N1=v1.iv.length, t1=A.AC.currentTime; BD.bedTick(t1); BD.bedTick(t1+0.5);
      const L1=BD.bedDbg(), set=new Set(); for(let o=-1;o<=1;o++) for(let k=0;k<N1;k++) set.add(S.chordRowFreq(k,o,v1).toFixed(6)); n++;
      if(L1.slots.some(i=>!set.has(L1.voices[i].hz.toFixed(6)))) miss(`a Mood change (${other}): the next chord is not of the new scale`); D.setMood(mood0); }
    /* NIGHT-5: v1 after a gap, as v2: 2 minutes on the probe clock → only the latest missed chord and the last second's events go out (the old
       way sent every one of the law's events at once) */
    { const g0=BUS.seq('bed'); BD.bedTick(A.AC.currentTime+120); const T=BD.bedDbg().tick, out=T ? T.chord+T.glim+T.drift : NaN, pub=BUS.since('bed', g0).items; n+=2;
      if(!T || pub.length!==T.chord+T.glim || pub.some(x=>x.v!==1)) miss(`v1 after a gap: ${pub.length} events published for the room, ${T ? T.chord+T.glim : '—'} chords and glimmer went out (NIGHT-6: exactly what goes out is published)`); notes.push('v1 after a 2-minute gap: '+JSON.stringify(T));
      if(!T || !(T.law>=20) || !(out<=4) || T.chord>2) miss('v1 after a 2-minute gap: '+JSON.stringify(T)+' (the law must hold 20+ events — CONTROL — of which at most 4 go out, at most 2 chords: the latest missed and one due now)'); }
    BD.bedSetMode('off'); n+=2; if(BD.bedTakesDrone()) miss('Off: the bed still holds the drone');
    BD.bedTick(A.AC.currentTime+BD.BED_PARK_S+1); if(!BD.bedDbg().parked) miss('Off: the bed was not parked after '+BD.BED_PARK_S+' s');
    /* ---- NIGHT-4: v2 offline ---- */
    /* v2 renders in a bare offline context (the bed alone, the worklet loaded for real); the path is checked level-equal to the render copy's
       master tap that the nature sound and v1 go through: v1's Drift rendered bare must match its gold render (CONTROL of the measuring path) */
    const SEC2=30, bare=async build=>{ const ctx=new OfflineAudioContext(2, Math.round(RATE*SEC2), RATE), E={ ac:ctx }, o=await build(E, ctx.destination), buf=await ctx.startRendering();
      const L=buf.getChannelData(0), Rr=buf.getChannelData(1), x=new Float32Array(L.length); for(let i=0;i<x.length;i++) x[i]=(L[i]+Rr[i])/2; return { x, E, o }; };
    const v2r=async(preset, o={})=>{ const r=await bare((E, dest)=>B2.bed2Plan(E, dest, R2, preset, SEC2, o)); return { x:r.x, plan:r.o, stats:await SB2.bed2Stats(r.E, r.o.bed, 3000) }; };
    { const v1b=await bare((E, dest)=>BD.bedPlan(E, dest, B, 'drift', SEC2)), dl=rmsDb(v1b.x,10,SEC2)-rmsDb(a,10,SEC2); n++;
      if(!(Math.abs(dl)<=0.1)) miss(`the bare measuring path is ${dl.toFixed(2)} dB off the master tap (v1 Drift bare vs gold) — v2's level cannot be compared`); }
    const d1=await v2r('drift'), d2=await v2r('drift'), d3=await v2r('drift', { seed:99 }), s2=await v2r('still'), g2=await v2r('glimmer');
    { let rep=0, ctl=0; for(let i=0;i<d1.x.length;i++){ rep=Math.max(rep, Math.abs(d1.x[i]-d2.x[i])); ctl=Math.max(ctl, Math.abs(d1.x[i]-d3.x[i])); } n+=2;
      if(!(rep<=1e-6)) miss('v2: the same plan twice differs by '+rep.toExponential(2)); if(!(ctl>1e-3)) miss('CONTROL v2: another seed gave the same bed'); }
    { const lv=rmsDb(d1.x,10,SEC2), la=rmsDb(amb,10,SEC2), k=x=>kLoud(x.subarray(10*RATE), RATE), ka=k(amb); n++;
      notes.push(`v2 level at the default volume: Drift ${(lv-la).toFixed(1)} dB against the nature sound (${la.toFixed(1)} dBFS); K-like loudness Still ${(k(s2.x)-ka).toFixed(1)} · Drift ${(k(d1.x)-ka).toFixed(1)} · Glimmer ${(k(g2.x)-ka).toFixed(1)} dB against it`);
      if(Math.abs(lv-la)>4) miss(`v2: Drift sits ${(lv-la).toFixed(1)} dB from the nature sound (within ±4 dB wanted)`); }
    for(const [tag,r] of [['Still',s2],['Drift',d1],['Glimmer',g2]]){ const k=clickOf(r.x, RATE); n+=2; if(!(k<=0.5)) miss(`v2: a click in ${tag}: ${k.toFixed(3)}`);
      if(!r.stats || r.stats.dropped || r.stats.late) miss(`v2 ${tag}: the worklet ${r.stats ? `dropped ${r.stats.dropped} notes, applied ${r.stats.late} late` : 'gave no counters'}`); }
    { const v=S.CUR(), N=v.iv.length, ok=new Set(); for(let o=-2;o<=6;o++) for(let k=0;k<N;k++) ok.add(S.chordRowFreq(k,o,v).toFixed(6));
      const G=[S.chordRowFreq(0,-1,v), S.droneSecondHz(v)/2], top=S.tonicFreq(v)*Math.pow(2, S.rectLayout(v).octaves), msgs=[...d1.plan.list, ...s2.plan.list, ...g2.plan.list];
      const priced=msgs.filter(m=>m.k==='on' || m.k==='loop' || m.k==='glass'), off=priced.filter(m=>!ok.has(m.hz.toFixed(6))), gr=msgs.filter(m=>m.k==='ground'); n+=4;
      if(!priced.length || off.length) miss(`v2: ${off.length} of ${priced.length} notes not priced from the live view (e.g. ${off.slice(0,3).map(m=>m.k+' '+m.hz.toFixed(2)).join(', ')})`);
      if(gr.some(m=>Math.abs(m.root-G[0])>1e-9 || Math.abs(m.fifth-G[1])>1e-9)) miss(`v2: the ground ${JSON.stringify(gr[0])} is not ${JSON.stringify(G)}`);
      if(!(R2.air.bands[0]*(1-R2.air.sway)>top)) miss(`v2: the air (from ${(R2.air.bands[0]*(1-R2.air.sway)).toFixed(0)} Hz at its lowest sway) is not above the playing's highest note (${top.toFixed(0)} Hz)`);
      const ch=d1.plan.events.filter(e=>e.kind==='chord'), w=ch.map(e=>e.steps[e.steps.length-1]-e.steps[0]);
      if(!ch.length || w.some(x=>x<N)) miss(`v2: a Drift chord spans less than an octave (${w.join(', ')} steps)`);
      const pads=priced.filter(m=>m.k==='on').map(m=>m.hz); notes.push(`v2 registers: ground ${G.map(f=>f.toFixed(1)).join(' + ')} Hz, pad ${Math.min(...pads).toFixed(0)}–${Math.max(...pads).toFixed(0)} Hz, loops ${Math.min(...priced.filter(m=>m.k==='loop').map(m=>m.hz)).toFixed(0)}–${Math.max(...priced.filter(m=>m.k==='loop').map(m=>m.hz)).toFixed(0)} Hz, glass from ${Math.min(...priced.filter(m=>m.k==='glass').map(m=>m.hz)).toFixed(0)} Hz, the playing ${S.tonicFreq(v).toFixed(0)}–${top.toFixed(0)} Hz, air ${R2.air.bands.join('–')} Hz`);
      notes.push(`v2 worklet voices at most: Drift ${JSON.stringify(d1.stats.max)}, Glimmer ${JSON.stringify(g2.stats.max)}`); }
    n++; if(await B2.bed2Load({})) miss('v2: a context without AudioWorklet did not refuse the worklet');
    /* ---- NIGHT-4: v2 live ---- */
    const bs0=BUS.seq('bed'); BD.bedSetEngine('v2'); BD.bedSetMode('drift', B, R2);
    for(let k=0;k<40 && !(BD.bedDbg().v2.on); k++){ await wait(100); BD.bedTick(); }
    BD.bedTick(); const V0=BD.bedDbg(), w0=S.CUR(), M0=w0.iv.length; n+=3;
    if(!V0.v2.on || V0.engine!=='v2' || !BD.bedTakesDrone() || V0.v1on) miss('v2 On: '+JSON.stringify({ on:V0.v2.on, engine:V0.engine, drone:BD.bedTakesDrone(), v1on:V0.v1on, fail:V0.v2.fail }));
    if(V0.v2.slots.length!==R2.presets.drift.padTones[0]) miss('v2 On: the first chord did not come ('+V0.v2.slots.length+' tones)');
    { const it=BUS.since('bed', bs0).items.filter(x=>x.v===2), ch=it.filter(x=>x.kind==='chord'); n++;   // NIGHT-6 slice 1
      if(!ch.length || it.some(x=>!Number.isFinite(x.at))) miss('v2 On: its first chord was not published for the room (bus «bed»): '+JSON.stringify(it.slice(0,3))); }
    { const set=new Set(); for(let o=-1;o<=4;o++) for(let k=0;k<M0;k++) set.add(S.chordRowFreq(k,o,w0).toFixed(6)); if(V0.v2.slots.some(i=>!set.has(V0.v2.voices[i].hz.toFixed(6)))) miss('v2 On: a pad tone not on the scale'); }
    { const other=D.moods().find(m=>m!==mood0); D.setMood(other); const w1=S.CUR(), M1=w1.iv.length, t1=A.AC.currentTime; BD.bedTick(t1); BD.bedTick(t1+0.5);
      const V1=BD.bedDbg(), set=new Set(); for(let o=-1;o<=4;o++) for(let k=0;k<M1;k++) set.add(S.chordRowFreq(k,o,w1).toFixed(6)); n++;
      if(!V1.v2.slots.length || V1.v2.slots.some(i=>!set.has(V1.v2.voices[i].hz.toFixed(6)))) miss(`v2: after a Mood change (${other}) the pad is not of the new scale`); D.setMood(mood0); BD.bedTick(); }
    { BD.bedSetEngine('v1'); BD.bedTick(); const a=BD.bedDbg(); BD.bedSetEngine('v2'); for(let k=0;k<10 && !BD.bedDbg().v2.on; k++){ await wait(50); BD.bedTick(); } const b=BD.bedDbg(); n++;
      if(!(a.engine==='v1' && a.v1on && !a.v2.on && b.engine==='v2' && b.v2.on && !b.v1on)) miss('the A/B switch: '+JSON.stringify({ v1:[a.engine, a.v1on, a.v2.on], v2:[b.engine, b.v1on, b.v2.on] })); }
    /* a gap (a hidden tab: frames stop, the audio clock does not): 2 minutes on the probe clock → only the last second's notes and the latest chord go out */
    { const g0=BUS.seq('bed'); BD.bedTick(A.AC.currentTime+120); const T=BD.bedDbg().v2.tick, pub=BUS.since('bed', g0).items; n+=2;
      if(!T || pub.length!==T.chord+T.loop+T.glass || pub.some(x=>x.v!==2)) miss(`v2 after a gap: ${pub.length} events published for the room, ${T ? T.chord+T.loop+T.glass : '—'} went out (NIGHT-6: exactly what goes out is published)`);
      if(!T || !(T.law>=20) || T.loop>4 || T.glass>3 || T.chord>1) miss('v2 after a 2-minute gap: '+JSON.stringify(T)+' (the law must hold 20+ events — CONTROL — of which at most 4 loop notes, 3 glass notes and 1 chord go out)'); }
    BD.bedSetMode('off'); n+=2; if(BD.bedTakesDrone()) miss('v2 Off: the bed still holds the drone');
    BD.bedTick(A.AC.currentTime+B2.BED2_PARK_S+1); if(!BD.bedDbg().v2.parked) miss('v2 Off: the bed was not parked after '+B2.BED2_PARK_S+' s');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ try{ if(D.mood()!==mood0) D.setMood(mood0); }catch(e){} BD.bedSetVolume(was.vol); BD.bedSetAnswer(was.answer); BD.bedSetPalette(was.palette); BD.bedSetLight(was.light); BD.bedSetEngine(was.engine==='v1' ? 'v1' : 'v2'); BD.bedSetMode(was.mode, B, R2);
    KEYS.forEach((k,i)=>{ try{ if(kept[i]==null) localStorage.removeItem(k); else localStorage.setItem(k, kept[i]); }catch(e){} }); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.975, night:true, name:'NIGHT music bed', run:()=>checkNightBed(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
