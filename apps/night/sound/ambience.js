/* THE ROOMS' AMBIENCE (RUN 7, C4c; Night's own since CORE-7): drone + wind + distant crickets + one soft echo (NIGHT-8: + the stream), built from a room's NATURE
   recipe (the forest's: apps/night/rooms/forest/pure/room.js). Registered by main.js through core/soundmods.js, so both engine instances use it —
   hence stateless (rule #38, static check 13): every engine value comes from E, the ambience object it builds (nodes, the recipe, the crickets'
   cursors) is kept by the engine instance. Every source starts once and is gated (rule #3); chirps are scheduled ahead at explicit times
   (rule #15); its own bus → the master (live sound, never a track — rule #31). The seeded schedule's laws: apps/night/pure/ambience.js. */
import { windNoise, cricketStream, chirpShape, NATURE_CRICKETS } from '../pure/ambience.js';

/* NIGHT-3 stage 5 part 2: TWO NATURE SLOTS for a room switch, built once. Slot 0 is today's graph from the recipe A (its parts sum in a
   `mix` gain of exactly 1, then the bus). Slot 1 is the same graph, PARKED: built and started (rule #3) but its mix not connected, so nothing
   in it is computed; it shares slot 0's wind noise. A switch retunes the idle slot to the new room's recipe while it is silent, connects it
   and crossfades (ambienceRoom) — no node is made. The object keeps today's fields for the active slot (A, dGate, dRoot, dFifth, crickets,
   origin), so the engine and the probes read it as before. */
function buildSlot(E, bus, seed, A, now, ns){
  const ac=E.ac, mix=ac.createGain(); mix.gain.value=1;
  /* the echo: roomIn → delay → lowpass → back (fb) and out; the loop gain fb·|LP| < 1 (Butterworth Q: no peak) */
  const roomIn=ac.createGain(), dl=ac.createDelay(0.5), elp=ac.createBiquadFilter(), efb=ac.createGain();
  roomIn.gain.value=1; dl.delayTime.value=A.echo.time; elp.type='lowpass'; elp.frequency.value=A.echo.lp; elp.Q.value=-3.0103; efb.gain.value=A.echo.fb;
  roomIn.connect(dl); dl.connect(elp); elp.connect(efb); efb.connect(dl); elp.connect(mix);
  /* the drone: root and fifth, faded in by its gate */
  const dGate=ac.createGain(); dGate.gain.value=0; dGate.connect(mix);
  const dSend=ac.createGain(); dSend.gain.value=A.drone.send; dGate.connect(dSend); dSend.connect(roomIn);
  const tone=(f,g)=>{ const o=ac.createOscillator(), a=ac.createGain(); o.frequency.value=f; a.gain.value=g; o.connect(a); a.connect(dGate); o.start(now); return [o, a]; };
  const [dRoot, dRootA]=tone(110, A.drone.root), [dFifth, dFifthA]=tone(165, A.drone.fifth);
  /* the wind: seeded noise (slot 1 shares slot 0's), a slowly drifting bandpass */
  const W=A.wind;
  if(!ns){ const nb=ac.createBuffer(1, Math.round(ac.sampleRate*W.sec), ac.sampleRate);
    nb.copyToChannel(windNoise(ac.sampleRate, (W.seed+seed)>>>0, W.sec), 0);
    ns=ac.createBufferSource(); ns.buffer=nb; ns.loop=true; ns.start(now); }
  const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=W.hz; bp.Q.value=W.q; try{ bp.frequency.automationRate='k-rate'; }catch(e){}   // cost: a 0.06-Hz drift needs no per-sample update
  const lfo=ac.createOscillator(), lg=ac.createGain(); lfo.frequency.value=W.rate; lg.gain.value=W.sweep; lfo.connect(lg); lg.connect(bp.frequency);
  const wg=ac.createGain(), ws=ac.createGain(); wg.gain.value=W.gain; ws.gain.value=W.send;
  ns.connect(bp); bp.connect(wg); wg.connect(mix); wg.connect(ws); ws.connect(roomIn); lfo.start(now);
  /* the crickets: one gated sine each, panned apart, soft and high in the room; every slot holds NATURE_CRICKETS (a recipe with fewer leaves the rest silent) */
  const C=A.crickets, clp=ac.createBiquadFilter(), cg=ac.createGain(), cs=ac.createGain();
  clp.type='lowpass'; clp.frequency.value=C.lp; clp.Q.value=0.5; cg.gain.value=C.gain; cs.gain.value=C.send;
  clp.connect(cg); cg.connect(mix); cg.connect(cs); cs.connect(roomIn);
  const crickets=[];
  for(let k=0;k<Math.max(C.n, NATURE_CRICKETS);k++){ const st=cricketStream(C, (C.seed+seed)>>>0, k), o=ac.createOscillator(), g=ac.createGain(), p=ac.createStereoPanner();
    o.frequency.value=st.freq; g.gain.value=0; p.pan.value=C.pans[k%C.pans.length]; o.connect(g); g.connect(p); p.connect(clp); o.start(now);
    crickets.push({ st, g, osc:o, p, next:st.next(), on:k<C.n }); }
  /* NIGHT-8: the stream — its gain in this slot's mix and a little into the echo; the nature worklet's output joins it once loaded (ambienceBrook) */
  const S=A.stream, sg=ac.createGain(), ss=ac.createGain(); sg.gain.value= S ? S.gain : 0; ss.gain.value= S ? S.send : 0; sg.connect(mix); sg.connect(ss); ss.connect(roomIn);
  return { A, mix, ns, dl, elp, efb, dGate, dSend, dRoot, dRootA, dFifth, dFifthA, bp, lfo, lg, wg, ws, clp, cg, cs, sg, ss, crickets, origin:now, corigin:now, parked:false, parkAt:0 };
}
/* build into `dest` (the master's input) from the recipe A; `seed` shifts every seeded part (a probe's control) → the ambience object.
   slots 2 (NIGHT-3 stage 5 part 2): a second, parked slot for room switches; 1 = the first slot alone */
function buildAmbience(E, dest, seed=0, A, slots=1){
  const ac=E.ac, now=ac.currentTime;
  const bus=ac.createGain(); bus.gain.value=0; bus.connect(dest);
  const s0=buildSlot(E, bus, seed, A, now, null); s0.mix.connect(bus);
  const S=[s0]; if(slots>1){ const s1=buildSlot(E, bus, seed, A, now, s0.ns); s1.mix.gain.value=0; s1.parked=true; S.push(s1); }   // parked and silent
  return { A, bus, dGate:s0.dGate, dRoot:s0.dRoot, dFifth:s0.dFifth, crickets:s0.crickets, origin:s0.origin, corigin:s0.corigin, on:false, hz:[0,0], level:0,
    slots:S, cur:0, seed, drone:true, brook:null };
}
/* NIGHT-8: THE STREAM'S NODE — the nature worklet «night-nature» (apps/night/worklets/nature-worklet.js), built ONCE per ambience when its module
   is in the context (the caller loads it: apps/night/roomswitch.js natureLoad) and never torn down (rule #3); its output feeds every slot's
   stream gain. voices: the room's stream voices; asleep while the ambience is off (ambienceSet) → amb.brook, or null (already built / no voices) */
export const NATURE_WORKLET=new URL('../worklets/nature-worklet.js', import.meta.url).href;
export const BROOK_SLEEP_S=6;   // after the ambience's fade-out (τ 0.8 s): asleep, nothing computed
function ambienceBrook(E, amb, voices, seed=0){
  if(amb.brook || !voices || !voices.length) return null;
  const node=new AudioWorkletNode(E.ac, 'night-nature', { numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[2], processorOptions:{ voices, seed:(0x42524F4B+seed)>>>0, sleep:!amb.on } });
  for(const sl of amb.slots) node.connect(sl.sg);
  amb.brook={ node, sleep:!amb.on, light:false, rec:null }; return amb.brook;
}
/* NIGHT-8b: the stream's RECORDING into its node — the mono samples (at this context's rate; moved, not copied) and the level `norm`; the node
   hands over from the synthesis and answers → a promise of true (playing the recording) / false (refused: too short, not samples). amb.brook.rec:
   'on' | 'refused' (the caller sets 'loading' / 'failed') */
function ambienceBrookRec(E, amb, pcm, norm){ const b=amb.brook; if(!b) return Promise.resolve(false);
  return new Promise(res=>{ const p=b.node.port, f=e=>{ if(e.data && e.data.rec){ p.removeEventListener('message', f); b.rec= e.data.rec.ok ? 'on' : 'refused'; res(!!e.data.rec.ok); } };
    p.addEventListener('message', f); p.start(); p.postMessage([{ k:'rec', pcm, norm }], pcm && pcm.buffer ? [pcm.buffer] : []); }); }
/* the stream's sleep (from AC time t) and the Lighter mode */
function brookSleep(amb, v, t){ const b=amb.brook; if(!b || b.sleep===v) return; b.sleep=v; b.node.port.postMessage([{ k:'sleep', v, t }]); }
function ambienceBrookLight(E, amb, v){ const b=amb.brook; if(!b || b.light===!!v) return; b.light=!!v; b.node.port.postMessage([{ k:'light', v:!!v }]); }
/* the worklet's counters → a promise (null after ms) */
function ambienceBrookStats(E, amb, ms=2000){ const b=amb.brook; if(!b) return Promise.resolve(null);
  return new Promise(res=>{ const p=b.node.port, f=e=>{ if(e.data && e.data.stats){ p.removeEventListener('message', f); res(e.data.stats); } };
    p.addEventListener('message', f); p.start(); p.postMessage([{ k:'stats' }]); setTimeout(()=>{ p.removeEventListener('message', f); res(null); }, ms); }); }
/* the crossfade's time constants (s): the sounding room out, the new one in (about 2 s to full); a faded room parks after `park` × out */
export const AMB_SWAP=Object.freeze({ out:1, in:0.7, park:8 });
/* the idle slot n takes recipe B at AC time t while silent: every number is an AudioParam or a cricket stream — no node is made */
function retune(E, amb, n, B, t){
  const sp=(p,v)=>{ p.cancelScheduledValues(t); p.setValueAtTime(v, t); }, old=n.A;
  sp(n.dl.delayTime, B.echo.time); sp(n.elp.frequency, B.echo.lp); sp(n.efb.gain, B.echo.fb);
  sp(n.dRootA.gain, B.drone.root); sp(n.dFifthA.gain, B.drone.fifth); sp(n.dSend.gain, B.drone.send);
  if(amb.hz[0]){ sp(n.dRoot.frequency, amb.hz[0]); sp(n.dFifth.frequency, amb.hz[1]); }
  const W=B.wind; sp(n.bp.frequency, W.hz); sp(n.bp.Q, W.q); sp(n.lg.gain, W.sweep); sp(n.wg.gain, W.gain); sp(n.ws.gain, W.send);
  /* the wind sweep keeps its phase: the origin moves so that rate × (time − origin) runs on from where the old rate left it */
  if(W.rate!==old.wind.rate){ sp(n.lfo.frequency, W.rate); n.origin=t-old.wind.rate*(t-n.origin)/W.rate; }
  sp(n.sg.gain, B.stream ? B.stream.gain : 0); sp(n.ss.gain, B.stream ? B.stream.send : 0);   // NIGHT-8: the stream's level in the new room (none: 0)
  const C=B.crickets; sp(n.clp.frequency, C.lp); sp(n.cg.gain, C.gain); sp(n.cs.gain, C.send);
  n.crickets.forEach((c,k)=>{ if(k<C.n){ c.st=cricketStream(C, (C.seed+amb.seed)>>>0, k); c.next=c.st.next(); sp(c.osc.frequency, c.st.freq); sp(c.p.pan, C.pans[k%C.pans.length]); c.on=true; }
    else { c.on=false; sp(c.g.gain, 0); } });
  n.corigin=t; n.A=B;
}
/* NIGHT-3 stage 5 part 2: THE NATURE CROSSFADE to recipe B at AC time `when` → true if it began (false: B sounds already, or one slot only).
   The idle slot is retuned while silent, joins the bus and fades in (τ AMB_SWAP.in) while the sounding one fades out (τ AMB_SWAP.out) and parks
   once below −70 dB (ambienceSchedule). The drone's state and pitch carry over; the bus takes B's level. o.instant — probe CONTROL only: a step. */
function ambienceRoom(E, amb, B, when, o={}){
  if(!amb.slots || amb.slots.length<2 || amb.A===B) return false;
  const t=when!=null?when:E.ac.currentTime, a=amb.slots[amb.cur], n=amb.slots[1-amb.cur];
  retune(E, amb, n, B, t);
  if(n.parked){ n.mix.connect(amb.bus); n.parked=false; }
  n.parkAt=0; a.parkAt=t+AMB_SWAP.park*AMB_SWAP.out;
  const dr=amb.on && amb.drone ? 1 : 0; n.dGate.gain.cancelScheduledValues(t); n.dGate.gain.setValueAtTime(dr, t);
  n.mix.gain.cancelScheduledValues(t); a.mix.gain.cancelScheduledValues(t);
  if(o.instant){ n.mix.gain.setValueAtTime(1, t); a.mix.gain.setValueAtTime(0, t); }
  else { n.mix.gain.setValueAtTime(0, t); n.mix.gain.setTargetAtTime(1, t, AMB_SWAP.in); a.mix.gain.setValueAtTime(1, t); a.mix.gain.setTargetAtTime(0, t, AMB_SWAP.out); }
  if(amb.on) amb.bus.gain.setTargetAtTime(B.master*amb.level*amb.level, t, AMB_SWAP.in);
  if(B.stream && amb.on && amb.level>0) brookSleep(amb, false, null); else brookSleep(amb, true, t+BROOK_SLEEP_S);   // NIGHT-8: a room without a stream lets it sleep after the fade
  amb.cur=1-amb.cur; Object.assign(amb, { A:B, dGate:n.dGate, dRoot:n.dRoot, dFifth:n.dFifth, crickets:n.crickets, origin:n.origin, corigin:n.corigin });
  return true;
}
/* the crickets' chirps up to `until` (AC time), each at its own explicit time; chirps already in the past are skipped (a stalled frame
   never bunches them) */
function ambienceSchedule(E, amb, until){
  const now=E.ac.currentTime, o0=amb.corigin!=null ? amb.corigin : amb.origin;
  if(amb.slots) for(const s of amb.slots) if(!s.parked && s.parkAt && now>=s.parkAt){ s.mix.disconnect(amb.bus); s.parked=true; s.parkAt=0; }   // a faded-out room stops being computed
  for(const c of amb.crickets){
    if(c.on===false) continue;
    while(o0+c.next.t < until){ const t0=o0+c.next.t;
      if(t0>=now){ for(const [t,v] of chirpShape(amb.A.crickets, t0, c.next.pulses, c.next.amp)){ if(v===0 && t===t0) c.g.gain.setValueAtTime(0,t); else c.g.gain.linearRampToValueAtTime(v,t); } }
      c.next=c.st.next(); } }
}
/* the drone's pitch (root, fifth in Hz — priced by the caller from the view, rule #2): glides 0.3 s like the backing drone */
function ambienceTune(E, amb, root, fifth, when){
  if(amb.hz[0]===root && amb.hz[1]===fifth) return; const t=when!=null?when:E.ac.currentTime;
  if(amb.hz[0]){ amb.dRoot.frequency.setTargetAtTime(root,t,0.3); amb.dFifth.frequency.setTargetAtTime(fifth,t,0.3); }
  else { amb.dRoot.frequency.setValueAtTime(root,t); amb.dFifth.frequency.setValueAtTime(fifth,t); }
  amb.hz=[root,fifth];
}
/* on / off and the room's level (0…1, heard as level²): slow fades, nothing abrupt. drone false (NIGHT-3 stage 4): the drone stays out — the
   music bed has taken it over */
function ambienceSet(E, amb, on, level, when, drone=true){
  const t=when!=null?when:E.ac.currentTime, v=Math.max(0, Math.min(1, +level||0));
  amb.on=!!on; amb.level=v; amb.drone=!!drone;
  amb.bus.gain.setTargetAtTime(on ? amb.A.master*v*v : 0, t, on ? 0.6 : 0.8);
  amb.dGate.gain.setTargetAtTime(on && drone ? 1 : 0, t, on && drone ? amb.A.drone.tc : 0.8);
  if(on && v>0 && amb.A.stream) brookSleep(amb, false, null); else brookSleep(amb, true, t+BROOK_SLEEP_S);   // NIGHT-8: the stream sleeps once faded out (or in a room without one)
}
export { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet, ambienceRoom, ambienceBrook, ambienceBrookLight, ambienceBrookStats, ambienceBrookRec };
