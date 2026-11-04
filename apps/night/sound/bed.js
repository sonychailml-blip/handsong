/* NIGHT-3 stage 4: THE MUSIC BED's SOUND — built once on the first On into the master's input (the sleep fade and the limiter cover it; live
   sound, never a track — rule #31), from a room's bed recipe B. Stateless (rule #38, static check 13): the bed object lives with its driver
   (apps/night/bed.js). Every oscillator starts once and is gated (rule #3); a chord change crossfades: a voice whose note changes fades out
   while a quiet voice of the pool fades in at the new note (never a glide). Times are explicit (rule #15); pitches come priced by the caller.
   - Every param the bed moves is k-RATE (per 128-sample block, not per sample): its pitches change only while a voice is silent and its slowest
     envelope moves 0.1 % per block, so nothing is heard of it — and per-sample automation was most of its cost (NIGHT-1: «sines + per-sample gains»).
   - Pad voice: two oscillators of the recipe's soft wave detuned apart, a gain; the voices share TWO lowpass filters, one on each side of a slightly
     panned pair (k-rate: their slow drift needs no per-sample update) — the cost gate (<= 3 % of a quantum): a filter and a pan per voice cost 4 %.
   - Ground: the tonic and the drone's second string, a slow beat between two sines on the tonic. Glimmer: one sine, a slow swell.
   - One soft echo for all (a delay with a dark feedback), glimmer sent deeper. Parked = the bus disconnected: nothing of it is computed. A quiet
     VOICE parks too (its gain leaves its side: its two oscillators stop being computed) and comes back just before its next attack — a voice
     starts parked; the driver parks it once its release has fallen below −70 dB of its level. */
export const BED_POOL=5, BED_GLIM=2;   // pad voices (3 sounding + 2 crossfading), glimmer voices
const kRate=p=>{ try{ p.automationRate='k-rate'; }catch(e){} };
/* build into `dest`; detunes: [cents] one per pad voice (seeded by the caller) → the bed object */
function buildBed(E, dest, B, detunes){
  const ac=E.ac, now=ac.currentTime, wave=ac.createPeriodicWave(new Float32Array([0, ...B.wave.map(()=>0)]), new Float32Array([0, ...B.wave]), { disableNormalization:false });
  const osc=(f, type)=>{ const o=ac.createOscillator(); if(type) o.type=type; else o.setPeriodicWave(wave); o.frequency.value=f; kRate(o.frequency); kRate(o.detune); o.start(now); return o; };
  const gain=v=>{ const g=ac.createGain(); g.gain.value=v; kRate(g.gain); return g; };
  const bus=gain(0); bus.connect(dest);
  const eIn=ac.createGain(), dl=ac.createDelay(1), lp=ac.createBiquadFilter(), fb=ac.createGain();
  dl.delayTime.value=B.echo.time; lp.type='lowpass'; lp.frequency.value=B.echo.lp; lp.Q.value=-3.0103; fb.gain.value=B.echo.fb;
  eIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(bus);
  const padBus=ac.createGain(), padSend=ac.createGain(); padSend.gain.value=B.echo.send; padBus.connect(bus); padBus.connect(padSend); padSend.connect(eIn);
  const sides=[-0.3, 0.3].map(pan=>{ const f=ac.createBiquadFilter(), p=ac.createStereoPanner(); f.type='lowpass'; f.Q.value=B.q; f.frequency.value=500; kRate(f.frequency); p.pan.value=pan; f.connect(p); p.connect(padBus); return f; });
  const voices=[];
  for(let i=0;i<BED_POOL;i++){ const d=detunes[i]||0, a=osc(110), b=osc(110), g=gain(0);
    a.detune.value=d/2; b.detune.value=-d/2; a.connect(g); b.connect(g); voices.push({ a, b, g, out:sides[i%2], parked:true, hz:0, step:null, quietAt:0 }); }
  const gGate=gain(0); gGate.connect(bus);
  const gR=osc(55,'sine'), gB=osc(55,'sine'), gS=osc(82,'sine'), gRa=ac.createGain(), gBa=ac.createGain(), gSa=ac.createGain();
  gRa.gain.value=B.ground.amp*0.6; gBa.gain.value=B.ground.amp*0.4; gSa.gain.value=B.ground.second;
  gR.connect(gRa); gB.connect(gBa); gS.connect(gSa); gRa.connect(gGate); gBa.connect(gGate); gSa.connect(gGate);
  const glim=[], gSend=ac.createGain(); gSend.gain.value=B.echo.glimSend; gSend.connect(eIn);
  for(let i=0;i<BED_GLIM;i++){ const o=osc(880,'sine'), g=gain(0), p=ac.createStereoPanner(); kRate(p.pan);
    o.connect(g); p.connect(bus); p.connect(gSend); glim.push({ o, g, p, out:p, parked:true, until:0 }); }
  return { B, dest, bus, voices, sides, ground:{ gate:gGate, r:gR, b:gB, s:gS, hz:[0,0] }, glim, parked:false };
}
/* a pad voice to a note (hz > 0) at amp; or out (hz 0); `tc` the attack / release time constant */
function bedVoice(E, bed, i, hz, amp, when, tc){
  const v=bed.voices[i], t=when;
  if(hz>0){ for(const o of [v.a, v.b]) o.frequency.setValueAtTime(hz, t); v.g.gain.setTargetAtTime(amp, t, tc); v.hz=hz; }
  else { v.g.gain.setTargetAtTime(0, t, tc); v.hz=0; }
}
/* a pad or glimmer voice (one of bed.voices / bed.glim) parked or back: its gain leaves its output, or rejoins it */
function bedVoicePark(E, bed, v, park){ if(park===v.parked) return; if(park) v.g.disconnect(); else v.g.connect(v.out); v.parked=park; }
/* side k's filter moves towards `cutHz` with time constant tc (a chord: 2 s; a drift: slower) */
function bedFilter(E, bed, k, cutHz, when, tc){ bed.sides[k].frequency.setTargetAtTime(cutHz, when, tc); }
/* the ground's pitches (the tonic, the second string): glide like the drone; on or off */
function bedGround(E, bed, root, second, on, when){
  const G=bed.ground, t=when, beat=bed.B.ground.beat;
  if(G.hz[0]){ G.r.frequency.setTargetAtTime(root,t,0.3); G.b.frequency.setTargetAtTime(root+beat,t,0.3); G.s.frequency.setTargetAtTime(second,t,0.3); }
  else { G.r.frequency.setValueAtTime(root,t); G.b.frequency.setValueAtTime(root+beat,t); G.s.frequency.setValueAtTime(second,t); }
  G.hz=[root, second]; G.gate.gain.setTargetAtTime(on ? 1 : 0, t, on ? 2 : 1.2);
}
/* a glimmer note: the quietest glimmer voice, a slow swell, a hold, a long fall */
function bedGlim(E, bed, hz, amp, pan, when){
  const L=bed.glim.reduce((a,b)=>a.until<=b.until ? a : b), G=bed.B.glim, t=Math.max(when, L.until); bedVoicePark(E, bed, L, false);
  L.o.frequency.setValueAtTime(hz, t); L.p.pan.setValueAtTime(pan, t);
  L.g.gain.setTargetAtTime(G.amp*amp, t, G.swell); L.g.gain.setTargetAtTime(0, t+G.swell*3+G.hold, G.decay); L.until=t+G.swell*3+G.hold+G.decay*6;
}
/* the bus level (volume 0…1, heard as volume²) */
function bedLevel(E, bed, level, when){ const v=Math.max(0, Math.min(1, +level||0)); bed.bus.gain.setTargetAtTime(bed.B.master*v*v, when, 1.2); }
/* parked: the bus leaves the master (nothing computed); back: it reconnects */
function bedPark(E, bed, park){ if(park===bed.parked) return; if(park) bed.bus.disconnect(); else bed.bus.connect(bed.dest); bed.parked=park; }
export { buildBed, bedVoice, bedVoicePark, bedFilter, bedGround, bedGlim, bedLevel, bedPark };
