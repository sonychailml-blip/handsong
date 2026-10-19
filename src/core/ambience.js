/* RUN 7 (C4c, Calm plan §4.6; docs/CALM-QUALITY.md points 1, 5, 8) — THE FOREST'S OWN AMBIENCE: its numbers and the crickets' SEEDED
   schedule. CORE: pure (rule #36), node-tested (data row «CALM cricket schedule (core)»). The sound itself is the stateless engine module
   src/modules/ambience/forest.js. Nothing rhythmic, never recorded, its own level («Forest» in the Calm shell).
   - Drone: a sine on the ROOT of the key two registers down (the prototype's A2 = 110 Hz at A4 440) and one on its FIFTH (E3), priced by
     the view like the backing drone (rule #2); fade-in 1.2 s; a large send into the ambience's own room.
   - Wind: a looped seeded noise through a wide bandpass at 520 Hz whose centre drifts ±260 Hz at 0.06 Hz.
   - Distant crickets: two or three, each a 4.3–4.9 kHz sine gated in 3–5 short pulses, a chirp every 0.6–1.8 s, at different pans, soft and
     high in the room — so they sit far away. Their times come from cricketStream (seeded: the same seed gives the same chirps), scheduled
     ahead at explicit times (rule #15).
   - Distance: ONE soft echo (a delay with a dark feedback) — not a room: measured (RUN 7), the FDN reverb alone cost ≈ 3.6 % of a core in the
     runner (≈ 40 % of Calm's own forest room again), over the ≤ 2 % target; the echo is a fraction of it. Drone and wind need no room. */
import { seeded } from './dsp.js';

export const AMB=Object.freeze({
  drone:Object.freeze({ root:0.09, fifth:0.05, tc:1.2, send:0.25 }),
  wind:Object.freeze({ hz:520, q:0.6, sweep:260, rate:0.06, gain:0.05, send:0.15, sec:2, seed:0x57494E44 }),
  crickets:Object.freeze({ n:3, fLo:4300, fHi:4900, pulsesLo:3, pulsesHi:5, pulse:0.012, gap:0.016, every:Object.freeze([0.6, 1.8]), lp:7000,
    gain:0.014, send:0.6, pans:Object.freeze([-0.6, 0.35, 0.8]), seed:0x43524B54 }),
  echo:Object.freeze({ time:0.13, fb:0.38, lp:2800 }),
  level:0.6,          // the default «Forest» volume (0…1, the shell's slider)
  master:0.42,        // the ambience bus at level 1: at the default level it sits ≈ 12 dB under the Calm sounds (measured, RUN 7)
  ahead:0.35,         // seconds of chirps scheduled ahead
});
/* the noise of the wind loop (seeded, the same at every rate) */
export function windNoise(rate, seed=AMB.wind.seed, sec=AMB.wind.sec){ const r=seeded(seed), n=Math.round(rate*sec), d=new Float32Array(n);
  for(let i=0;i<n;i++) d[i]=r()*2-1; return d; }
/* cricket k's chirps (times from 0, seconds): { freq, next() → { t, pulses, amp } } — seeded per cricket */
export function cricketStream(seed, k){
  const C=AMB.crickets, r=seeded((seed+k*7919)>>>0), freq=C.fLo+r()*(C.fHi-C.fLo); let t=r()*C.every[1];
  return { freq, next(){ const pulses=C.pulsesLo+Math.floor(r()*(C.pulsesHi-C.pulsesLo+1)), c={ t, pulses, amp:0.55+0.45*r() };
    t+= pulses*(C.pulse+C.gap) + C.every[0] + r()*(C.every[1]-C.every[0]); return c; } };
}
/* one chirp's gain envelope: [time, value] points (a soft 3-ms rise, a 9-ms fall per pulse) — from t, scaled by amp */
export function chirpShape(t, pulses, amp){ const C=AMB.crickets, out=[];
  for(let p=0;p<pulses;p++){ const a=t+p*(C.pulse+C.gap); out.push([a,0],[a+0.003,amp],[a+C.pulse,0]); } return out; }
