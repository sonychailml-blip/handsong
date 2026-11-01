/* RUN 7 (Calm sound pass) — the BREATH engine type: sustained, breathing sounds (a breathy flute, a soft vocal / bowed pad).
   An ENGINE SUBMODULE (hard rule #38): stateless — every engine value comes from E (first argument); the bank object lives on its voice.
   Built once per voice and gated (rule #3: every source here starts once and never stops): harmonic oscillators (mkOsc — the voice's
   vibrato / humanisation taps) → optional formant bandpasses → mix; breath noise from one looping noise source in three paths — a bandpass
   that TRACKS the pitch (the jet's breath), a broad «air» band, and the attack CHIFF (a burst at a multiple of the pitch); mix → amplitude
   stage (own amplitude vibrato + slow breathing) → body resonance → lowpass (brighter when played harder; slow breathing of the cut-off) →
   gate. Own pitch movement on every harmonic: a vibrato that fades in after a delay at each attack (rate varied a little per note), a slow
   drift, an onset scoop. Pure sine harmonics share one PeriodicWave oscillator (cost). setFreq glides (a wind instrument slurs); strike(t, vel) = the attack's shape. */
import { mkOsc } from './voice.js';
import { LEAD_GLIDE_TC } from './stages.js';
const LN1000=6.907755;

function buildBreathBank(E, preBus, R){
  const ac=E.ac, now=ac.currentTime, nyq=ac.sampleRate*0.45, ig=ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=R.lp; lp.Q.value=0.5; lp.connect(ig);
  let tail=lp; if(R.body){ const pk=ac.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=R.body.hz; pk.Q.value=R.body.q; pk.gain.value=R.body.db; pk.connect(lp); tail=pk; }
  const amp=ac.createGain(); amp.gain.value=1; amp.connect(tail);
  const mix=ac.createGain(); mix.gain.value=R.lvl; mix.connect(amp);
  const tone=ac.createGain(); tone.gain.value=1;
  if(R.formants) for(const F of R.formants){ const bp=ac.createBiquadFilter(), g=ac.createGain(); bp.type='bandpass'; bp.frequency.value=F.hz; bp.Q.value=F.q; g.gain.value=F.g; tone.connect(bp); bp.connect(g); g.connect(mix); }
  else tone.connect(mix);
  const pm=ac.createGain(); pm.gain.value=1;   // the bank's own pitch movement (cents) into every harmonic's detune
  /* pure sine harmonics (integer multiple, no detune) share ONE oscillator with a PeriodicWave (their gains as its sine terms, not
     normalised) — the cost of one oscillator instead of one each; the rest (other waves, detuned, non-integer) get their own */
  const pure=h=>(h.w||'sine')==='sine' && !h.dt && Number.isInteger(h.m) && h.m<=16, P=R.harm.filter(pure), oscs=[];
  if(P.length){ const n=Math.max(...P.map(h=>h.m))+1, re=new Float32Array(n), im=new Float32Array(n); for(const h of P) im[h.m]+=h.g;
    const o=mkOsc(E, 'sine', 220, tone, 1); o.setPeriodicWave(ac.createPeriodicWave(re, im, { disableNormalization:true })); oscs.push({ o, m:1 }); }
  for(const h of R.harm) if(!pure(h)){ const o=mkOsc(E, h.w||'sine', 220*h.m, tone, h.g); if(h.dt) o.detune.value=h.dt; oscs.push({ o, m:h.m }); }
  for(const x of oscs) pm.connect(x.o.detune);
  /* cost: the slow movements (vibrato ≤ 12 Hz, drift, breathing, glides) need no per-sample update — block rate (128 frames ≈ 2.7 ms) is
     inaudible here, and a filter or oscillator automated per sample costs several times more */
  const kr=p=>{ try{ p.automationRate='k-rate'; }catch(e){} };
  for(const x of oscs){ kr(x.o.frequency); kr(x.o.detune); } kr(lp.frequency);
  const V=R.vib; let vibO=null, vibG=null, vibA=null;
  if(V){ vibO=ac.createOscillator(); vibO.frequency.value=V.rate; vibG=ac.createGain(); vibG.gain.value=0; vibO.connect(vibG); vibG.connect(pm);
    if(V.amp){ vibA=ac.createGain(); vibA.gain.value=0; vibO.connect(vibA); vibA.connect(amp.gain); }
    vibO.start(now); }
  if(R.drift){ const g=ac.createGain(), o=ac.createOscillator(); g.gain.value=R.drift.cents; g.connect(pm);   // one slow sine (each voice its own phase)
    o.frequency.value=R.drift.rate; o.connect(g); o.start(now+E.rnd()/R.drift.rate*0.5); }
  let scoop=null; if(R.scoop){ scoop=ac.createConstantSource(); scoop.offset.value=0; scoop.connect(pm); scoop.start(now); }
  if(R.breathe){ const o=ac.createOscillator(), gl=ac.createGain(), gc=ac.createGain(); o.frequency.value=R.breathe.rate; gl.gain.value=R.breathe.lvl; gc.gain.value=R.breathe.cut*R.lp;
    o.connect(gl); gl.connect(amp.gain); o.connect(gc); gc.connect(lp.frequency); o.start(now+E.rnd()/R.breathe.rate*0.5); }
  const N=R.noise, A=R.air, C=R.chiff; let nbp=null, ng=null, cbp=null, cg=null, f0=220;
  if(N||A||C){ const src=ac.createBufferSource(); src.buffer=E.buf.noise; src.loop=true; src.start(now, E.rnd()*0.9);
    if(N){ nbp=ac.createBiquadFilter(); kr(nbp.frequency); nbp.type='bandpass'; nbp.frequency.value=220*N.m; nbp.Q.value=N.q; ng=ac.createGain(); ng.gain.value=N.g; src.connect(nbp); nbp.connect(ng); ng.connect(mix); }
    if(A){ const bp=ac.createBiquadFilter(), g=ac.createGain(); bp.type='bandpass'; bp.frequency.value=A.hz; bp.Q.value=A.q; g.gain.value=A.g; src.connect(bp); bp.connect(g); g.connect(mix); }
    if(C){ cbp=ac.createBiquadFilter(); kr(cbp.frequency); cbp.type='bandpass'; cbp.frequency.value=220*C.m; cbp.Q.value=C.q; cg=ac.createGain(); cg.gain.value=0; src.connect(cbp); cbp.connect(cg); cg.connect(mix); } }
  const nf=x=>Math.min(nyq, x);
  const bank={ gain:ig, hum: R.hum===0 ? 0 : 1,
    setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{ f0=f; for(const x of oscs) x.o.frequency.setTargetAtTime(f*x.m,t,tc);
      if(nbp) nbp.frequency.setTargetAtTime(nf(f*N.m),t,tc); if(cbp) cbp.frequency.setTargetAtTime(nf(f*C.m),t,tc); },
    cancel:t=>{ for(const x of oscs) x.o.frequency.cancelScheduledValues(t); if(nbp) nbp.frequency.cancelScheduledValues(t); if(cbp) cbp.frequency.cancelScheduledValues(t); },
    /* the attack: vibrato from 0 (fades in after its delay), the chiff burst, the breath noise louder at the onset, the scoop, brightness by
       how hard (vb) — each value SET at the attack (a pooled voice must not carry the previous note's) */
    strike:(t, vel)=>{ const v=Math.max(0.05, Math.min(1, vel==null ? 0.6 : vel));
      if(V){ vibO.frequency.setValueAtTime(V.rate*(0.96+0.08*E.rnd()), t);
        for(const [g,to] of [[vibG,V.cents],[vibA,V.amp]]) if(g){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0,t); g.gain.setValueAtTime(0,t+V.delay); g.gain.linearRampToValueAtTime(to,t+V.delay+V.rise); } }
      if(cg){ cg.gain.cancelScheduledValues(t); cg.gain.setValueAtTime(0,t); cg.gain.linearRampToValueAtTime(C.g*v,t+0.006); cg.gain.setTargetAtTime(0,t+0.006,C.d/LN1000); }
      if(ng && N.on){ ng.gain.cancelScheduledValues(t); ng.gain.setValueAtTime(N.g*N.on,t); ng.gain.setTargetAtTime(N.g,t+0.02,0.12); }
      if(scoop){ scoop.offset.cancelScheduledValues(t); scoop.offset.setValueAtTime(R.scoop,t); scoop.offset.setTargetAtTime(0,t,0.035); }
      if(R.vb){ lp.frequency.cancelScheduledValues(t); lp.frequency.setTargetAtTime(R.lp*(1-R.vb+R.vb*v),t,0.03); } } };
  E.build.banks.push(bank);
}
export { buildBreathBank };
