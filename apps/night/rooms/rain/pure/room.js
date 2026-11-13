/* RAIN-0: THE RAIN ROOM'S RECORD (docs/night/design/RAIN/CONCEPT.md, PLAN.md) — what the room is, as data (pure, rule #36; checked by
   apps/night/pure/room.js). A DEVELOPMENT room until the founder approves it: its id is not pinned (never remembered on a device), it is
   registered only by apps/night/rooms/dev.js. What is a placeholder here and which slice of PLAN.md replaces it:
   - moods: the three Night modes stand in for the room's own modes (slice 7); the looks are already the room's three moods;
   - nature: the shared wind voice tuned high and wide as a soft rain hiss, no crickets (slice 3: CC0 recordings, near and far);
   - bed, bed2: a quiet recipe of the room's own numbers on today's machinery (slice 7: the three moods' recipes, the new voices);
   - still: the names of the start stills (slice 2 makes the files; until then the start screen shows the first room's);
   - icon: the shared «depth» icon (slice 2 draws the room's own).
   A look's own amounts: mist (how misted the pane is), rain (0 drizzle … 1 downpour), lit (the share of windows the city lights by itself);
   fog and flies are the shared shape's fields, unused here (0). */
const F=Object.freeze;
const LOOK=(pre, mist, rain, lit)=>F({ pre, fog:0, mist, flies:0, rain, lit,
  tokens:F({ sky:pre+'sky', glow:pre+'glow', cloud:pre+'cloud', haze:pre+'haze', stone:pre+'stone', plaster:pre+'plaster', asphalt:pre+'asphalt', mist:pre+'mist' }) });
export const RAIN_ROOM=F({
  format:'handsong/room', version:1, id:'room.rain', name:F({ en:'Rain', ru:'Дождь' }), icon:'depth', tint:'rain-tint', tokens:'rain-',
  still:F({ full:'still/still-full.webp', reduced:'still/still-reduced.webp', fov:68, aspect:1.85 }),
  view:F({ fov:55, tallFov:68, tall:0.8 }),
  /* what each picture level draws: the glass's drop layers and rivulet layers, the far lights */
  levels:F({ full:F({ drops:4, rivulets:2, farLights:260, lean:true }), reduced:F({ drops:3, rivulets:1, farLights:120, lean:true }) }),
  looks:F({
    late:LOOK('rain-', 0.95, 0.4, 0.1),            // Late night: drizzle, a few windows
    evening:LOOK('rain-eve-', 0.7, 0.65, 0.42),    // Evening boulevard: steady rain, many windows
    after:LOOK('rain-after-', 1.15, 0.14, 0.2),    // After the rain: heavy mist, a few slow drops
  }),
  moods:F({ 'major-penta':'late', 'minor-penta':'evening', 'egyptian':'after' }), look:'late',
  nature:F({ id:'ambience.rain',
    drone:F({ root:0.07, fifth:0.035, tc:1.4, send:0.2 }),
    wind:F({ hz:2600, q:0.35, sweep:500, rate:0.045, gain:0.03, send:0.1, sec:2, seed:0x5241494E }),
    crickets:F({ n:1, fLo:4300, fHi:4900, pulsesLo:3, pulsesHi:5, pulse:0.012, gap:0.016, every:F([0.6, 1.8]), lp:7000, gain:0, send:0, pans:F([0]), seed:0x52414E43 }),
    echo:F({ time:0.21, fb:0.3, lp:2200 }),
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
    presets:F({
      still:F({ loops:2, loopLen:F([31, 41]), loopReg:F([0.4, 1.4]), notes:F([2, 3]), padTones:F([2, 3]), padReg:F([0, 2.4]), every:F([32, 50]),
        glass:null, air:false, breath:1.3, bright:0.18, arcDepth:0.7, rt60:5.5, damp:2000, loopDb:5 }),
      drift:F({ loops:4, loopLen:F([19, 23, 29, 37]), loopReg:F([0.9, 2.1]), notes:F([2, 4]), padTones:F([3, 3]), padReg:F([0, 2.6]), every:F([22, 36]),
        glass:F({ every:F([20, 38]) }), air:false, breath:1.1, bright:0.35, arcDepth:0.8, rt60:4.6, damp:2800, loopDb:0 }),
      glimmer:F({ loops:4, loopLen:F([19, 23, 29, 37]), loopReg:F([1.1, 2.5]), notes:F([2, 4]), padTones:F([3, 4]), padReg:F([0.4, 2.8]), every:F([22, 36]),
        glass:F({ every:F([6, 14]) }), air:true, breath:1, bright:0.6, arcDepth:0.8, rt60:4.2, damp:4000, loopDb:0 }),
    }) }),
});
