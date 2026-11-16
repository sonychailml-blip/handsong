/* RAIN-0: THE RAIN ROOM'S RECORD (docs/night/design/RAIN/CONCEPT.md, PLAN.md) — what the room is, as data (pure, rule #36; checked by
   apps/night/pure/room.js). A DEVELOPMENT room until the founder approves it: its id is not pinned (never remembered on a device), it is
   registered only by apps/night/rooms/dev.js. What is a placeholder here and which slice of PLAN.md replaces it:
   - moods: the three Night modes stand in for the room's own modes (slice 7); the looks are already the room's three moods;
   - nature: RAIN-3's layered CC0 recordings (the pane near, the street far, crossfaded by the focus) with drips and a tick; the shared wind voice is only a breath of air (no crickets);
   - bed, bed2: a quiet recipe of the room's own numbers on today's machinery (slice 7: the three moods' recipes, the new voices);
   - still: the names of the start stills (slice 2 makes the files; until then the start screen shows the first room's);
   - icon: the shared «depth» icon (slice 2 draws the room's own).
   A look's own amounts: mist (how misted the pane is), rain (0 drizzle … 1 downpour), lit (the share of windows the city lights by itself), traffic
   (RAIN-1: the cars' density — Evening busy, Late night almost empty, After the rain few);
   fog and flies are the shared shape's fields, unused here (0). */
import { RAIN_TRAFFIC, EAR } from './city.js';   // RAIN-1: the vehicles' law and the listener (the passes' sound reads the picture's own)
const F=Object.freeze;
const LOOK=(pre, mist, rain, lit, traffic)=>F({ pre, fog:0, mist, flies:0, rain, lit, traffic,
  tokens:F({ sky:pre+'sky', glow:pre+'glow', cloud:pre+'cloud', haze:pre+'haze', stone:pre+'stone', plaster:pre+'plaster', asphalt:pre+'asphalt', mist:pre+'mist' }) });
export const RAIN_ROOM=F({
  format:'handsong/room', version:1, id:'room.rain', name:F({ en:'Rain', ru:'Дождь' }), icon:'depth', tint:'rain-tint', tokens:'rain-',
  still:F({ full:'still/still-full.webp', reduced:'still/still-reduced.webp', fov:68, aspect:1.85 }),
  view:F({ fov:55, tallFov:68, tall:0.8 }),
  /* what each picture level draws (RAIN-0b): the most simulated drops on the pane, the procedural fine-droplet layers, the far lights, the most cars */
  levels:F({ full:F({ drops:420, fine:2, farLights:260, cars:16, lean:true }), reduced:F({ drops:260, fine:1, farLights:120, cars:16, lean:true }) }),   // RAIN-1: cars ≥ the most the law can put on the road (every car in the picture is heard)
  looks:F({
    late:LOOK('rain-', 0.95, 0.4, 0.1, 0.4),       // Late night: drizzle, a few windows, almost no cars
    evening:LOOK('rain-eve-', 0.7, 0.65, 0.42, 1.15),   // Evening boulevard: steady rain, many windows, busy
    after:LOOK('rain-after-', 1.15, 0.14, 0.2, 0.7),   // After the rain: heavy mist, a few slow drops, few cars
  }),
  /* RAIN-4: the room's own moods — a safe 5–6 note set of a jazz mode each (core/data/modes: Lydian pentatonic, Dorian hexatonic, Mixolydian
     hexatonic; no note of the set clashes with any chord of its bed), its look, its own name (the Mood button reads it here) */
  moods:F({ 'lydian-penta':'late', 'dorian-hexa':'evening', 'mixolydian-hexa':'after' }), look:'late',
  /* RAIN-4: what the room plays with — its own four timbres for the playing hand (Night's session records, apps/night/rooms/rain/timbres/; never in
     Full's lists), each with its level (dB) and its strike cap (a fast phrase stays gentle on a phone), and the moods' names */
  music:F({ timbres:F([F({ id:'rain/e-piano', level:0, voices:6 }), F({ id:'rain/vibraphone', level:-11, voices:4 }), F({ id:'rain/nylon', level:0, voices:5 }), F({ id:'rain/celesta', level:-6, voices:4 })]),
    names:F({ late:F({ en:'Late night', ru:'Поздняя ночь' }), evening:F({ en:'Evening boulevard', ru:'Вечерний бульвар' }), after:F({ en:'After the rain', ru:'После дождя' }) }) }),
  nature:F({ id:'ambience.rain',
    drone:F({ root:0.07, fifth:0.035, tc:1.4, send:0.2 }),
    wind:F({ hz:2600, q:0.35, sweep:500, rate:0.045, gain:0.012, send:0.1, sec:2, seed:0x5241494E }),   // RAIN-3: only a breath of air now (the layers carry the rain; it stays if they cannot play)
    crickets:F({ n:1, fLo:4300, fHi:4900, pulsesLo:3, pulsesHi:5, pulse:0.012, gap:0.016, every:F([0.6, 1.8]), lp:7000, gain:0, send:0, pans:F([0]), seed:0x52414E43 }),
    echo:F({ time:0.21, fb:0.3, lp:2200 }),
    /* RAIN-3: the layered recordings (apps/night/pure/layers.js; CC0, register «rain-recordings»): near — rain on the pane, close and dry; far — the wet
       street from above, with more of the echo; crossfaded by the picture's focus. norm: each file levelled to the forest's stream (tools/rain-listen.mjs),
       × 1.78 (+5 dB: the rain is this room's main nature sound, as the forest's wind and crickets are). Events: drips from the cornice, a quiet tick.
       RAIN-1 (the founder's picks): near = «Rain on window» (ckjzam), far = «Light rain at night with cars passing by» (humi74) without its cars
       (tools/rain-sound.mjs); its car passes cut out as one-shots (passes: [start, length, peak] s in cars.mp3), each played when the picture's car
       passes under the window (pure/passes.js on the audio clock), panned by its side, louder the nearer its lane, its rate by its speed */
    layers:F({ near:F({ file:'sound/pane.mp3', norm:0.76, gain:1 }), far:F({ file:'sound/street.mp3', norm:0.608, gain:1, send:0.35 }),
      passes:F({ file:'sound/cars.mp3', norm:0.608, gain:1, segs:F([[0.5, 7.5, 6.9], [8.5, 3.3, 2.4], [12.3, 3, 2.1], [15.8, 2.8, 2], [19.1, 3.2, 2.3]].map(F)), vRef:12, rate:F([0.85, 1.2]), dRef:25, lead:9, traffic:RAIN_TRAFFIC, ear:EAR }),
      events:F({ drips:F({ every:3.5, gain:0.06, hz:2300 }), tick:F({ every:9, gain:0.02 }) }), seed:0x52414933 }),
    level:0.6, master:0.42, ahead:0.35 }),
  acoustic:'fdepth',
  bed:F({ master:0.2, level:0.6, wave:F([1, 0.22, 0.08]), detune:F([2, 6]), cut:F([2.6, 4]), q:0.4,
    pad:F({ lo:0, amp:0.1, attack:3, release:4 }), ground:F({ amp:0.06, second:0.035, beat:0.09 }),
    glim:F({ oct:3, amp:0.03, swell:0.3, hold:0.4, decay:2 }), echo:F({ time:0.48, fb:0.3, lp:1600, send:0.3, glimSend:0.7 }),
    presets:F({
      still:F({ voices:2, every:F([30, 46]), drift:F({ every:F([10, 18]), depth:0.15 }), glim:null }),
      drift:F({ voices:3, every:F([16, 26]), drift:F({ every:F([8, 14]), depth:0.22 }), glim:null }),
      glimmer:F({ voices:3, every:F([16, 26]), drift:F({ every:F([8, 14]), depth:0.22 }), glim:F({ every:F([9, 19]) }) }),
    }) }),
  bed2:F({ master:0.7, level:0.6,
    arc:F({ period:F([320, 640]) }), breath:F({ every:F([9, 12.5]) }), color:F({ every:F([24, 64]), tc:F([9, 18]), spread:0.45 }),
    ground:F({ amp:0.065, fifth:0.4, beat:0.08, send:0.2 }),
    pad:F({ amp:0.07, attack:F([5.5, 8.5]), release:F([5.5, 8]), detune:F([3, 8]), send:0.45 }),
    loops:F({ amp:0.12, attack:F([1.4, 2.8]), hold:F([1.8, 4.5]), release:F([3.2, 5.5]), detune:F([3, 8]), vary:0.22, renew:0.08, send:0.5 }),
    voices:F({ a:F({ vowels:F([F([325, 700]), F([450, 800]), F([650, 1080])]), q:F([6, 9]), breath:0.03, body:0.14 }), b:F({ bloom:F([1.2, 4.2]), q:0.8 }) }),
    glass:F({ amp:0.034, oct:F([2.8, 4.2]), attack:F([0.1, 0.26]), decay:F([1.8, 3.4]), send:0.85, ratios:F([1, 2, 4.02]), gains:F([1, 0.26, 0.1]) }),
    air:F({ amp:0.008, bands:F([4600, 7600]), sway:0.25, q:2, every:F([14, 32]), tc:9 }),
    reverb:F({ pre:0.03, wet:0.5 }),
    lighter:F({ loops:2, padOsc:2, padTones:3, glass:0.5, release:0.7 }),
    /* RAIN-4: THE JAZZ BED (apps/night/pure/bedjazz.js; the driver runs it instead of the v2 law): per mood its parent mode, tempo, chords as SETS
       OF THE PARENT'S OWN DEGREES (0-based: maj7 / m9 / dom9 colours, rootless voicings), the progression [chord, bars], the comping rhythm
       [beat, velocity] (x.5 = the off-beat, swung at Evening), the bass ('root' long, 'roomy' root and fifth, 'walk' quarters) and the glints;
       per preset how much plays; amps per voice, a strum's roll (s), the sends */
    jazz:F({ first:'lydian-penta', roll:0.012, ep:0.055, bass:0.2, vib:0.05, brush:0.022, send:F({ ep:0.32, bass:0.1, vib:0.55, brush:0.18 }),
      presets:F({ still:F({ comp:0.45, vib:false, bass:true }), drift:F({ comp:0.8, vib:false, bass:true }), glimmer:F({ comp:0.8, vib:true, bass:true }) }),
      moods:F({
        'lydian-penta':F({ parent:'lydian', bpm:62, swing:0.5, bass:'root', vib:F({ every:F([6, 10]) }),
          chords:F([F({ root:0, tones:F([2, 4, 6, 3]) }), F({ root:1, tones:F([3, 5, 0, 2]) })]), prog:F([F([0, 2]), F([1, 2])]), comp:F([F([0, 0.55]), F([2.5, 0.32])]) }),   // Imaj7#11 · II9 (rootless)
        'dorian-hexa':F({ parent:'dorian', bpm:72, swing:0.64, bass:'walk', vib:F({ every:F([2, 4]) }),
          chords:F([F({ root:0, tones:F([2, 4, 6, 1]) }), F({ root:3, tones:F([5, 0, 2, 4]) })]), prog:F([F([0, 2]), F([1, 2])]), comp:F([F([1, 0.5]), F([2.5, 0.38]), F([3.5, 0.3])]) }),   // i m9 · IV9
        'mixolydian-hexa':F({ parent:'mixolydian', bpm:66, swing:0.56, bass:'roomy', vib:F({ every:F([3, 6]) }),
          chords:F([F({ root:0, tones:F([2, 6, 1, 5]) }), F({ root:6, tones:F([1, 3, 5, 0]) }), F({ root:4, tones:F([6, 1, 3, 5]) })]), prog:F([F([0, 2]), F([1, 1]), F([2, 1])]), comp:F([F([0, 0.5]), F([1.5, 0.34]), F([3, 0.4])]) }),   // I9(13) · ♭VIImaj9 · v m9
      }) }),
    presets:F({
      still:F({ loops:2, loopLen:F([31, 41]), loopReg:F([0.4, 1.4]), notes:F([2, 3]), padTones:F([2, 3]), padReg:F([0, 2.4]), every:F([32, 50]),
        glass:null, air:false, breath:1.3, bright:0.18, arcDepth:0.7, rt60:5.5, damp:2000, loopDb:5 }),
      drift:F({ loops:4, loopLen:F([19, 23, 29, 37]), loopReg:F([0.9, 2.1]), notes:F([2, 4]), padTones:F([3, 3]), padReg:F([0, 2.6]), every:F([22, 36]),
        glass:F({ every:F([20, 38]) }), air:false, breath:1.1, bright:0.35, arcDepth:0.8, rt60:4.6, damp:2800, loopDb:0 }),
      glimmer:F({ loops:4, loopLen:F([19, 23, 29, 37]), loopReg:F([1.1, 2.5]), notes:F([2, 4]), padTones:F([3, 4]), padReg:F([0.4, 2.8]), every:F([22, 36]),
        glass:F({ every:F([6, 14]) }), air:true, breath:1, bright:0.6, arcDepth:0.8, rt60:4.2, damp:4000, loopDb:0 }),
    }) }),
});
