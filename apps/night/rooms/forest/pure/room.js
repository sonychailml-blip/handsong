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
  levels:F({ full:F({ flies:70, trail:16, shadow:1024, shadowSmall:512, mist:true, shrooms:28, blooms:10, grass:3500, leaves:60, moths:6, beams:4 }),
    reduced:F({ flies:35, trail:8, shadow:0, shadowSmall:0, mist:false, shrooms:14, blooms:5, grass:1400, leaves:24, moths:3, beams:2 }) }),
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
});
