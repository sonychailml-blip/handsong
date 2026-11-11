/* NIGHT-3: THE FOREST ROOM'S RECORD — what the room is, as data (pure, rule #36; checked by apps/night/pure/room.js, data row «NIGHT room
   records»). levels: what each quality level draws (forest.js reads them); looks: each mood's colours (token names for palette.cv, defined in
   night.css) and its fog / mist / firefly amounts, eased by the room (τ MOOD_TC); moods: a mode id → its look; nature: the ambience recipe
   (drone, wind, distant crickets, one soft echo — RUN 7's numbers), built by apps/night/sound/ambience.js. */
const LOOK=(pre, fog, mist, flies)=>Object.freeze({ pre, fog, mist, flies,
  tokens:Object.freeze({ fog:pre+'fog', sky:pre+'sky', under:pre+'under', moon:pre+'moon', moonhalo:pre+'moonhalo', haze:pre+'haze', cloud:pre+'cloud',
    shroom:pre+'shroom', bloom:pre+'bloom' }) });
const F=Object.freeze;
export const FOREST_ROOM=F({
  format:'handsong/room', version:1, id:'room.forest', name:F({ en:'Forest', ru:'Лес' }), tokens:'forest-',
  /* full: real shadows (hand light 1024², 512² on small screens), 70 wild fireflies, 16-step trails, moving mist; reduced: no shadow, 35 fireflies,
     8-step trails, still mist; «minimal» has no WebGL (the room's 2D stand-in) */
  levels:F({ full:F({ flies:70, trail:16, shadow:1024, shadowSmall:512, mist:true, shrooms:28, blooms:10, grass:3500, leaves:60, moths:6, beams:4, dew:1100, webs:9,
      sorrel:1500, forb:600, bilberry:260, anemone:500, nettle:140, sedge:580, fern2:110, softEdges:false,
      rocks:30, pebbles:260, floaters:28, mistStrips:5,
      roots:5, logs:2, stumps:5, snags:3, twigs:56, moss:400, ivy:12, woodShrooms:30, flare:true, barkMoss:true, shade:true, gust:true, gustLeaves:12,
      crowns:true, crownShare:1, young:10, shrubs:16, saplings:10, stars:500, dapple:true, moonFace:true,
      paint:true, paintR:3, vignette:true, grain:true, breath:true, foxfire:12, flowers:14, groundTex:true }),   // NIGHT-7: the bare floor's prepared files   // NIGHT-6 slice 9: the light's trail points, the night flowers   // NIGHT-6 slice 8: the painted distance and the film   // NIGHT-6 slice 7: the canopy   // NIGHT-6 slice 5: moss, roots, fallen wood (ivy: trees)   // NIGHT-6 slice 4: the stream's surroundings   // NIGHT-6 slice 3: the floor (fern2: rosettes)
    reduced:F({ flies:35, trail:8, shadow:0, shadowSmall:0, mist:false, shrooms:14, blooms:5, grass:1400, leaves:24, moths:3, beams:2, dew:500, webs:5,
      sorrel:600, forb:240, bilberry:100, anemone:200, nettle:50, sedge:230, fern2:45, softEdges:true,
      rocks:18, pebbles:120, floaters:14, mistStrips:3,
      roots:5, logs:2, stumps:5, snags:3, twigs:0, moss:200, ivy:6, woodShrooms:16, flare:true, barkMoss:true, shade:true, gust:true, gustLeaves:6,
      crowns:true, crownShare:0.35, young:6, shrubs:10, saplings:6, stars:250, dapple:true, moonFace:true,
      paint:true, paintR:2.5, vignette:true, grain:false, breath:true, foxfire:8, flowers:8, groundTex:true }) }),   // NIGHT-6 slice 8: smaller strokes, no grain at medium   // NIGHT-6 slice 7: a third of each crown's sprays beyond the first   // NIGHT-6 slice 5: no fallen branches at medium   // NIGHT-6: soft cut-out edges at medium (no antialiasing there)   // NIGHT-6 slice 1: dew, webs
  looks:F({
    glow:LOOK('forest-', 0.06, 1, 1),            // Glow: the base tokens
    dusk:LOOK('forest-dusk-', 0.052, 0.8, 0.9),  // Dusk: violet sky, a warm low moon, less mist
    mist:LOOK('forest-misty-', 0.085, 1.7, 0.8), // Mist: pale blue-grey, thick mist, a shorter view
  }),
  moods:F({ 'major-penta':'glow', 'minor-penta':'dusk', 'egyptian':'mist' }), look:'glow',
  nature:F({ id:'ambience.forest',
    drone:F({ root:0.09, fifth:0.05, tc:1.2, send:0.25 }),
    wind:F({ hz:520, q:0.6, sweep:260, rate:0.06, gain:0.05, send:0.15, sec:2, seed:0x57494E44 }),
    crickets:F({ n:3, fLo:4300, fHi:4900, pulsesLo:3, pulsesHi:5, pulse:0.012, gap:0.016, every:F([0.6, 1.8]), lp:7000,
      gain:0.014, send:0.6, pans:F([-0.6, 0.35, 0.8]), seed:0x43524B54 }),
    echo:F({ time:0.13, fb:0.38, lp:2800 }),
    level:0.6,     // the default room volume (0…1, the shell's slider)
    master:0.42,   // the ambience bus at level 1: at the default level ≈ 12 dB under the Night sounds (measured, RUN 7)
    ahead:0.35,    // seconds of chirps scheduled ahead
  }),
  acoustic:'fdepth',   // the hand's room: Night's «Forest depth» (one acoustic for every room in v1, user 2026-11-03)
  /* NIGHT-3 stage 4: THE MUSIC BED's recipe (apps/night/pure/bed.js the law, sound/bed.js the sound). Pads: each voice two oscillators of a soft
     wave (`wave`: harmonic amplitudes) detuned apart by `detune` cents, two shared lowpass filters (one per side) at `cut` × the chord's middle pitch, each drifting by ±`drift.depth`; chords only of
     the scale's own degrees, in the octave just below the playing (from `pad.lo` of a period under the drone's tonic up to the degree under the playing's tonic). Ground: the tonic
     and the drone's second string an octave under today's drone (it takes the drone over). Glimmer: rare soft notes at `glim.oct`, a slow swell —
     nothing struck. Times in seconds; amplitudes are the voices' own, `master` the bus at volume 1 (heard as volume²). */
  bed:F({ master:0.2, level:0.6, wave:F([1, 0.3, 0.12, 0.05]), detune:F([3, 7]), cut:F([3, 4.5]), q:0.4,
    pad:F({ lo:0, amp:0.11, attack:2.4, release:3.2 }), ground:F({ amp:0.07, second:0.045, beat:0.12 }),
    glim:F({ oct:3, amp:0.035, swell:0.35, hold:0.5, decay:1.6 }), echo:F({ time:0.42, fb:0.34, lp:1800, send:0.32, glimSend:0.7 }),
    presets:F({
      still:F({ voices:2, every:F([28, 44]), drift:F({ every:F([9, 16]), depth:0.18 }), glim:null }),
      drift:F({ voices:3, every:F([13, 22]), drift:F({ every:F([7, 13]), depth:0.25 }), glim:null }),
      glimmer:F({ voices:3, every:F([13, 22]), drift:F({ every:F([7, 13]), depth:0.25 }), glim:F({ every:F([7, 17]) }) }),
    }) }),
  /* NIGHT-4: THE MUSIC BED v2's recipe (apps/night/pure/bed2.js the law, worklets/bed-worklet.js the sound; design PLAN.md §4b). Registers in
     octaves above step 0 (the tonic an octave under the playing). Amplitudes are the voices' own, `master` the bus at volume 1 (heard as
     volume²); `send` how much of a layer goes to the room; a preset's loopDb lifts its loops (Still's are low and sparse). Times in seconds. voices.a «voices» (F1/F2 of the vowels u · o · a, their Q),
     voices.b «horns» (the low-pass from bloom[0] to bloom[1] × the pitch with the note's swell). */
  bed2:F({ master:0.7, level:0.6,
    arc:F({ period:F([300, 600]) }), breath:F({ every:F([8.5, 11.5]) }), color:F({ every:F([20, 60]), tc:F([8, 16]), spread:0.5 }),
    ground:F({ amp:0.07, fifth:0.5, beat:0.11, send:0.2 }),
    pad:F({ amp:0.07, attack:F([5, 8]), release:F([5, 7.5]), detune:F([4, 9]), send:0.5 }),
    loops:F({ amp:0.13, attack:F([1.2, 2.6]), hold:F([1.5, 4]), release:F([3, 5]), detune:F([4, 9]), vary:0.25, renew:0.08, send:0.55 }),
    voices:F({ a:F({ vowels:F([F([325, 700]), F([450, 800]), F([650, 1080])]), q:F([6, 9]), breath:0.04, body:0.12 }), b:F({ bloom:F([1.3, 5]), q:0.8 }) }),
    glass:F({ amp:0.036, oct:F([3, 4.4]), attack:F([0.12, 0.3]), decay:F([1.6, 3]), send:0.9, ratios:F([1, 2.01, 3.98]), gains:F([1, 0.3, 0.12]) }),
    air:F({ amp:0.011, bands:F([4800, 8000]), sway:0.25, q:2.2, every:F([12, 30]), tc:8 }),   // above the note field's top (4 octaves of a pentatonic: 3.5 kHz) even at its lowest sway
    reverb:F({ pre:0.04, wet:0.6 }),
    lighter:F({ loops:2, padOsc:2, padTones:3, glass:0.5, release:0.7 }),
    presets:F({
      still:F({ loops:2, loopLen:F([29, 37]), loopReg:F([0.5, 1.5]), notes:F([2, 3]), padTones:F([2, 3]), padReg:F([0, 2.4]), every:F([30, 48]),
        glass:null, air:false, breath:1.4, bright:0.2, arcDepth:0.7, rt60:7, damp:2200, loopDb:5 }),
      drift:F({ loops:4, loopLen:F([17, 23, 29, 31]), loopReg:F([1, 2.2]), notes:F([2, 4]), padTones:F([3, 3]), padReg:F([0, 2.6]), every:F([20, 34]),
        glass:F({ every:F([18, 36]) }), air:false, breath:1.1, bright:0.4, arcDepth:0.8, rt60:5.5, damp:3200, loopDb:0 }),
      glimmer:F({ loops:4, loopLen:F([17, 23, 29, 31]), loopReg:F([1.2, 2.6]), notes:F([2, 4]), padTones:F([3, 4]), padReg:F([0.4, 2.8]), every:F([20, 34]),
        glass:F({ every:F([5, 13]) }), air:true, breath:1, bright:0.7, arcDepth:0.8, rt60:5, damp:4600, loopDb:0 }),
    }) }),
});
