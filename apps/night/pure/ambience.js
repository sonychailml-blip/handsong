/* THE AMBIENCE'S SEEDED LAWS (RUN 7, C4c; docs/night/QUALITY.md points 1, 5, 8; Night's own since CORE-7): pure (rule #36), node-tested (data row
   «NIGHT cricket schedule (app)»). NIGHT-3: the numbers are a room's NATURE recipe (the forest's: apps/night/rooms/forest/pure/room.js); the sound
   is apps/night/sound/ambience.js. Nothing rhythmic, never recorded, its own level (the room's slider in the Night shell).
   - Drone: a sine on the ROOT of the key two registers down and one on its FIFTH, priced by the view like the backing drone (rule #2).
   - Wind: a looped seeded noise through a wide bandpass whose centre drifts slowly.
   - Distant crickets: each a high sine gated in a few short pulses, a chirp every second or so, at different pans, high in the room — so they
     sit far away. Their times come from cricketStream (seeded: the same seed gives the same chirps), scheduled ahead (rule #15).
   - Distance: ONE soft echo (a delay with a dark feedback), not a room: the FDN reverb alone cost ≈ 3.6 % of a core (RUN 7), over the ≤ 2 % target. */
import { seeded } from '../../../core/pure/dsp.js';

/* NIGHT-3 stage 5 part 2: the cricket voices each nature slot holds (the forest's three; a room's recipe may ask for 1…NATURE_CRICKETS) */
export const NATURE_CRICKETS=3;

/* the noise of the wind loop (seeded, the same at every rate): rate (Hz), seed, sec (the loop's length) */
export function windNoise(rate, seed, sec){ const r=seeded(seed), n=Math.round(rate*sec), d=new Float32Array(n);
  for(let i=0;i<n;i++) d[i]=r()*2-1; return d; }
/* cricket k's chirps from the recipe's crickets C (times from 0, seconds): { freq, next() → { t, pulses, amp } } — seeded per cricket */
export function cricketStream(C, seed, k){
  const r=seeded((seed+k*7919)>>>0), freq=C.fLo+r()*(C.fHi-C.fLo); let t=r()*C.every[1];
  return { freq, next(){ const pulses=C.pulsesLo+Math.floor(r()*(C.pulsesHi-C.pulsesLo+1)), c={ t, pulses, amp:0.55+0.45*r() };
    t+= pulses*(C.pulse+C.gap) + C.every[0] + r()*(C.every[1]-C.every[0]); return c; } };
}
/* one chirp's gain envelope from the recipe's crickets C: [time, value] points (a soft 3-ms rise, a fall per pulse) — from t, scaled by amp */
export function chirpShape(C, t, pulses, amp){ const out=[];
  for(let p=0;p<pulses;p++){ const a=t+p*(C.pulse+C.gap); out.push([a,0],[a+0.003,amp],[a+C.pulse,0]); } return out; }
