/* RUN 7 (C4c, Calm plan §4.6) — THE FOREST'S AMBIENCE (drone + wind + distant crickets) as an ENGINE SUBMODULE (hard rule #38): stateless —
   every engine value comes from E (first argument); the ambience OBJECT it builds (nodes, the crickets' schedule cursors) is kept by the
   engine instance in E (E.amb), never here. Numbers and the seeded schedule: core/ambience.js. Every source starts once and is gated
   (rule #3, like the backing drone); chirps are scheduled ahead at explicit times (rule #15). Its own bus → the master (live sound, never a
   track — rule #31); distance by one soft echo (a delay with a dark feedback — cheap; see core/ambience.js). */
import { AMB, windNoise, cricketStream, chirpShape } from '../../core/ambience.js';

/* build into `dest` (the master's input); `seed` shifts every seeded part (a probe's control) → the ambience object */
function buildAmbience(E, dest, seed=0){
  const ac=E.ac, now=ac.currentTime, A=AMB;
  const bus=ac.createGain(); bus.gain.value=0; bus.connect(dest);
  /* the echo: roomIn → delay → lowpass → back (fb) and out; the loop gain fb·|LP| < 1 (Butterworth Q: no peak) */
  const roomIn=ac.createGain(), dl=ac.createDelay(0.5), elp=ac.createBiquadFilter(), efb=ac.createGain();
  roomIn.gain.value=1; dl.delayTime.value=A.echo.time; elp.type='lowpass'; elp.frequency.value=A.echo.lp; elp.Q.value=-3.0103; efb.gain.value=A.echo.fb;
  roomIn.connect(dl); dl.connect(elp); elp.connect(efb); efb.connect(dl); elp.connect(bus);
  /* the drone: root and fifth, faded in by its gate */
  const dGate=ac.createGain(); dGate.gain.value=0; dGate.connect(bus);
  const dSend=ac.createGain(); dSend.gain.value=A.drone.send; dGate.connect(dSend); dSend.connect(roomIn);
  const tone=(f,g)=>{ const o=ac.createOscillator(), a=ac.createGain(); o.frequency.value=f; a.gain.value=g; o.connect(a); a.connect(dGate); o.start(now); return o; };
  const dRoot=tone(110, A.drone.root), dFifth=tone(165, A.drone.fifth);
  /* the wind: seeded noise, a slowly drifting bandpass */
  const W=A.wind, nb=ac.createBuffer(1, Math.round(ac.sampleRate*W.sec), ac.sampleRate);
  nb.copyToChannel(windNoise(ac.sampleRate, (W.seed+seed)>>>0), 0);
  const ns=ac.createBufferSource(); ns.buffer=nb; ns.loop=true;
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=W.hz; bp.Q.value=W.q; try{ bp.frequency.automationRate='k-rate'; }catch(e){}   // cost: a 0.06-Hz drift needs no per-sample update
  const lfo=ac.createOscillator(), lg=ac.createGain(); lfo.frequency.value=W.rate; lg.gain.value=W.sweep; lfo.connect(lg); lg.connect(bp.frequency);
  const wg=ac.createGain(), ws=ac.createGain(); wg.gain.value=W.gain; ws.gain.value=W.send;
  ns.connect(bp); bp.connect(wg); wg.connect(bus); wg.connect(ws); ws.connect(roomIn); ns.start(now); lfo.start(now);
  /* the crickets: one gated sine each, panned apart, soft and high in the room */
  const C=A.crickets, clp=ac.createBiquadFilter(), cg=ac.createGain(), cs=ac.createGain();
  clp.type='lowpass'; clp.frequency.value=C.lp; clp.Q.value=0.5; cg.gain.value=C.gain; cs.gain.value=C.send;
  clp.connect(cg); cg.connect(bus); cg.connect(cs); cs.connect(roomIn);
  const crickets=[];
  for(let k=0;k<C.n;k++){ const st=cricketStream((C.seed+seed)>>>0, k), o=ac.createOscillator(), g=ac.createGain(), p=ac.createStereoPanner();
    o.frequency.value=st.freq; g.gain.value=0; p.pan.value=C.pans[k%C.pans.length]; o.connect(g); g.connect(p); p.connect(clp); o.start(now);
    crickets.push({ st, g, osc:o, next:st.next() }); }
  return { bus, dGate, dRoot, dFifth, crickets, origin:now, on:false, hz:[0,0], level:0 };
}
/* the crickets' chirps up to `until` (AC time), each at its own explicit time; chirps already in the past are skipped (a stalled frame
   never bunches them) */
function ambienceSchedule(E, amb, until){
  const now=E.ac.currentTime;
  for(const c of amb.crickets){
    while(amb.origin+c.next.t < until){ const t0=amb.origin+c.next.t;
      if(t0>=now){ for(const [t,v] of chirpShape(t0, c.next.pulses, c.next.amp)){ if(v===0 && t===t0) c.g.gain.setValueAtTime(0,t); else c.g.gain.linearRampToValueAtTime(v,t); } }
      c.next=c.st.next(); } }
}
/* the drone's pitch (root, fifth in Hz — priced by the caller from the view, rule #2): glides 0.3 s like the backing drone */
function ambienceTune(E, amb, root, fifth, when){
  if(amb.hz[0]===root && amb.hz[1]===fifth) return; const t=when!=null?when:E.ac.currentTime;
  if(amb.hz[0]){ amb.dRoot.frequency.setTargetAtTime(root,t,0.3); amb.dFifth.frequency.setTargetAtTime(fifth,t,0.3); }
  else { amb.dRoot.frequency.setValueAtTime(root,t); amb.dFifth.frequency.setValueAtTime(fifth,t); }
  amb.hz=[root,fifth];
}
/* on / off and the «Forest» level (0…1, heard as level²): slow fades, nothing abrupt */
function ambienceSet(E, amb, on, level, when){
  const t=when!=null?when:E.ac.currentTime, v=Math.max(0, Math.min(1, +level||0));
  amb.on=!!on; amb.level=v;
  amb.bus.gain.setTargetAtTime(on ? AMB.master*v*v : 0, t, on ? 0.6 : 0.8);
  amb.dGate.gain.setTargetAtTime(on ? 1 : 0, t, on ? AMB.drone.tc : 0.8);
}
export { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet };
