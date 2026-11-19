/* RAIN-7: THE STREET MUSICIAN under the café's awning, playing along with our music — a pure seeded law (rule #36; data row «RAIN street law (app)»).
   His notes are the bed's own harmony in time: at each bar the bed's chord event (pure/lofi.js: its voicing's steps, its bar number) gives him a
   gentle picked pattern on the beats — the chord's tones, never a note outside it. He plays in SETS (about 32 bars, a seeded share of them; between
   sets he rests), and within a set most bars. The bed's engine plays his notes as soft plucks far on the street (rooms/rain/lofi.js «busk»); the room
   strums his guitar when each one is heard (rain.js). */
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const BUSK=F({ set:32, sets:0.7, bars:0.85, pattern:F([F([0, 0, 0.62]), F([1, 2, 0.45]), F([1.5, 1, 0.4]), F([2, 3, 0.5]), F([3, 2, 0.42])]), pan:0.55, dur:0.9, seed:0x4255534B });
/* is he playing in bar n? */
export const buskOn=n=>hash(Math.floor(n/BUSK.set), BUSK.seed%997)<BUSK.sets && hash(n, (BUSK.seed>>>3)%991)<BUSK.bars;
/* his notes over a chord event ev ({ t, steps, n }) at `beat` s per beat → [{ t, step, vel }] (empty when he rests) */
export function buskNotes(ev, beat){ if(!ev || !Array.isArray(ev.steps) || !ev.steps.length || !buskOn(ev.n|0)) return [];
  const S=ev.steps.slice().sort((a, b)=>a-b); return BUSK.pattern.map(([b, k, v])=>({ t:ev.t+b*beat, step:S[k%S.length], vel:v*(0.9+0.2*hash(ev.n|0, b*7)) })); }
