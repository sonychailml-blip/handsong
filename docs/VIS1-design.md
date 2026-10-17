# VIS1 — visual modules, the event bus and a scene layer for Calm's 3D rooms (PLAN ONLY, RUN 4, 2026-10-17)

Written for: the strategist (review), then Claude Code (implementation). No app code was changed for this document. Sources: stage-3 plan
slice 32 («visual modules and the event bus: the play surface, the camera picture and the hand points become the first three modules —
Calm can drop the camera one»), plan §4.11 (the visual-module contract), BACKLOG §7.16 (Calm — rooms of light and sound; musicians in the
scene), §7.19 (own design), §7.20 (the lesson layer). User answer (RUN 4): PLAN ONLY, aimed at Calm — a scene layer for 3D rooms (Three.js
r128 UMD, MIT, allowed by rule #32; the strategist's «Rooms of light» prototype: monastery and night forest with real shadows, depth from
hand size, camera parallax, a «forest band» of musicians animated from the exact note events with the audio output latency), the low-power
path, how hand dots / the lesson layer / the UI sit on top.

## 1. Today (what the plan starts from)
- ONE 2D canvas (`#canvas`) over a hidden `<video>`. `main.loop()` every screen frame: the shown camera snapshot (rule #8: the picture and
  the hands are ONE frame), then `draw.drawOverlays()` → `views/play.js` (play screen: rows / rectangles / palette per role, hand points,
  FX bars, status, the track strip), or the editor (`views/roll.js`) / the arrangement window (`views/strip.js`). Colours: `palette.cv()`
  over tokens (DRAW1b). DOM on top: top bar, panels, toasts, tutor strip.
- Inputs a picture could react to already exist, scattered: hands (`gestures.HANDS`, raw + remapped landmarks, depth `dist(lm0,lm9)`),
  expression channels (`gestures/expr.js` `EXPR`), live and replayed notes (`live/eng.js` makeENG → the ENGINE CONTRACT `noteOn/noteSet/
  noteOff/bend/hit/drone` with an explicit audio time, ENG1), levels (the master meter tap `outLast`), transport (`transport/clock.js`),
  effect aims (`FX_AIM`). Nothing is a published stream; each drawer reads module state directly.
- The audio output timing is measured (LAT1): `AC.outputLatency`, `AC.getOutputTimestamp()` → «what the speaker plays now, and when».

## 2. The two parts of VIS1
**A. The module layer (stage 3, the plan's slice 32 — no visible change).** A pure event bus in the core and the visual-module contract;
today's drawing wrapped as the first three modules: `camera` (the shown snapshot, layer background), `surface` (the play surface — rows,
rectangles, palette, register band, FX bars, status; layer instrument), `hands` (the hand points and their tags; layer overlay). Proof: the
10 screens of `tools/ui-snap.mjs` pixel-identical, HAND1, the drawn rows, the UI checks.
**B. The scene layer for Calm (stage 4).** A second, WebGL canvas UNDER the 2D canvas, hosting one `scene` module at a time (a «room»), built
with Three.js r128 (UMD, vendored, lazy). Calm = scene + surface (faint or hidden, per room) + hands (drawn by the scene as lights) — no
camera module.

## 3. The event bus (`src/core/bus.js`, pure — rule #36, node-tested)
- Two kinds of topic. STATE topics hold the latest value, read by visuals once per frame (no allocation per frame — writers fill reused
  objects; a version number tells a reader whether it changed): `hands` (per processed camera frame: for each hand the remapped 21 points,
  raw depth, pinch state, the role and zone it plays, the playing note), `features` (expression channels), `levels` (master peak/RMS per
  50 ms, per-role later), `transport` (playing, song beat, bpm, metre, brace), `params` (effect aims). EVENT topics are rings with
  timestamps: `notes` — `{ kind:on|set|off|hit|bend, owner, role, layer (null = live), hz (or list), vel, deg, oct, when }` where `when` is
  the AUDIO-context time the engine was told (rule #15's explicit time).
- Writers: `main.onHands` → hands (once per processed frame, after `processHands`); `live/eng.js` makeENG → notes (one line per contract
  call, live AND replayed — the engine copy used by renders never publishes: render.js passes no bus); the meter tap → levels (on the
  existing 50-ms limiter post); the scheduler tick → transport; `fxParamsOf` → params.
- Readers: visual modules only (plus diagnostics). Rules (from §4.11): a visual reads the bus only; never touches sound, the song or the
  network; never writes the bus.
- Cost: one array write per published item; the note ring holds the last 512 events (a reader that falls behind loses the oldest, never
  blocks a writer). Rule #33: the bus never leaves the page.

## 4. The visual-module contract (§4.11, made concrete)
`{ kind:'visual', id, version, layer:'background'|'scene'|'instrument'|'overlay', cost:{ cls:'light'|'medium'|'heavy', gpu:bool },
lowPower:{ fps, scale, … }, params (passport — mappable later), subscribes:[topics], mount(surface), frame(t, dt, bus), resize(w, h, dpr),
unmount() }`. `surface` = `{ ctx2d }` for 2D layers or `{ gl canvas }` for a scene. A COMPOSITOR in `views/` (new `views/stack.js`)
owns the order and calls `frame` per screen frame for the 2D layers and at the scene's own rate for the scene (§7).
Layer order, bottom to top:
1. **scene** (WebGL canvas `#scene`, Calm only) — the room. 2. **background** (2D) — the camera picture (Play only).
3. **instrument** (2D) — the play surface. In Calm a room declares `surface:'faint'|'hidden'|'full'` (how the note field shows over the
   room; default faint — the person still needs to see where notes are). 4. **overlay** (2D) — hand points, FX bars, status, the LESSON
   LAYER (§7.20: row highlights, hints, the check indicator — an overlay module of its own, above the hands so a hint is never hidden).
5. **DOM** — bar, panels, toasts, the tutor strip, the low-power note (§6), z-order by tokens (`--z-*`).
A room may declare `ownsHands:true`: it draws the hands as part of the scene (candle flames, fireflies), and the 2D `hands` module then
draws only a faint ring at each fingertip (so pinching stays precise — the light is decoration, the ring is the instrument). Rule #12
holds: the scene places lights from the REMAPPED coordinates (`sx`, `sy`) the hit-tests use, so a light sits exactly on its note.

## 5. Rooms (scene modules) — what the prototype shows, rebuilt as modules
- **Three.js r128 UMD** (`three.min.js`, MIT): vendored under `vendor/three-r128/` with its licence file and a LIC1 register entry (shipped,
  own origin — no new CSP host, rule #33; the static network guard lists the one `<script>` injection). Loaded LAZILY when Calm opens a room
  (never in Play; ≈ 0.6 MB, measured when vendored). The prototype is a REFERENCE: rooms are re-written as our modules (rule #32 — our own
  code; geometry procedural or our own / CC0 assets, each in the register).
- **Depth from hand size:** the existing depth (`dist(lm0, lm9)`, the same smoothed value the sound uses, `S.hs`) → the light's z in the
  room (3–4 bands, eased). **Camera parallax:** the virtual camera drifts a few degrees with the smoothed centroid of the hands (and, as an
  option, the phone's tilt — off by default: iOS asks permission).
- **Real shadows:** each hand = one point light. Shadow-casting lights are budgeted per class: heavy 2 (cube shadow maps 512²), medium 1
  (256²), light 0 (baked light map + a soft 2D glow); other lights unshadowed. Monastery: candle flames with flicker from `features`
  (vibrato → flicker, loudness from `levels` → flame size). Night forest: fireflies with trails; wild fireflies drawn towards the hands.
- **The forest band (musicians):** characters play the BACKING's parts (frog = bass, woodpecker = ticks, owl = a short melody, firefly
  swarm = pads; monastery: monks with bells). Driven ONLY by `notes` events of backing tracks (`layer` of an `ev.jam` lane; never audio
  analysis). Sync with the sound: the room maps audio time to screen time through the output timestamp —
  `heardAt(when) = ts.performanceTime + (when − ts.contextTime)·1000` (ms), with `ts = AC.getOutputTimestamp()` read once per frame (it
  already includes the output latency; where it is missing: `when + baseLatency + outputLatency` against `AC.currentTime`). Each motion has
  a wind-up that starts `windup` ms BEFORE `heardAt` (the scheduler publishes notes ≈ 300 ms ahead — SCHED_AHEAD — so the wind-up is
  known in time; live hand notes have no look-ahead and get no wind-up). A setting «Musicians: on/off»; the band ducks visibly while the
  person plays (from `hands` + `notes` of live owners).
- **Calm's sound** (BACKLOG §7.16, recorded, not part of VIS1): the Forest drone recipe, per-note «distance colour» from depth, a cheap
  forest-like reverb for phones.

## 6. The low-power path (with ENG2's provisional classes — no automatic switching until measured, user answer E1/E3)
- Per room, three levels (§7.16 «levels»): **full** (WebGL, real shadows as budgeted, particles, 60 fps cap), **reduced** (render scale
  0.75, 30 fps, one shadow light, half the particles), **minimal** (no WebGL: a 2D light mask over a pre-rendered still of the room +
  particles in 2D — the §7.16 «level 1», also the fallback when WebGL is missing or the context is lost).
- The scene renders at its OWN rate (30 fps on reduced), never before hand detection: the compositor asks the scene to draw only in frames
  where the 2D layers did not exceed their budget (measured by the latency meter's `draw` stage). MediaPipe's GPU delegate and the room
  share the GPU: the plan measures detection time with and without a room (LAT1 lines) before choosing defaults.
- When «low» is decided (E3): it switches on AUTOMATICALLY but VISIBLY — a DOM note «Low power: on — why? [turn off]», always reversible;
  the choice is per device (localStorage), the reason from ENG2's readouts (dropouts per minute, frame time).
- Worker option (to measure, not assumed): Three.js r128 UMD loads in a worker by `importScripts`, drawing to an OffscreenCanvas — frees
  the main thread (hand detection, the scheduler). LAT2b showed WebGL in a worker is slower on the user's Intel HD 4000; decide on numbers.

## 7. Proof (probes) — deterministic first (probe budget)
- VIS1a: `tools/ui-snap.mjs` 10 screens pixel-identical before / after the module wrap; HAND1 unchanged; drawn rows and UI checks PASS;
  node row «VIS1 bus (core)»: state topics versioned, the note ring order and overflow, no reader can write (CONTROL: a reader write throws).
- Rooms: a probe feeds the bus from HAND1's pose generator on the probe clock and calls `frame(t, dt)` — the room's STATE (light positions,
  shadow-light count, musician phases) is compared as NUMBERS, never as WebGL pixels (GPU-dependent). Sync row: a backing note at audio time
  T with a fake output timestamp → the musician's hit pose lands at `heardAt(T)` exactly, the wind-up begins `windup` ms earlier (CONTROL:
  ignoring the output latency misses by it). Cost row: frame time of each room level in the runner (relative, like ENG2's factors).
- Eye and phone steps for the user (rooms look, low-power note, musicians land on the sound — the strategist writes them per room).

## 8. Slices
1. **VIS1a** (M, stage 3) — `core/bus.js` + writers; `views/stack.js` compositor; `camera`, `surface`, `hands` as modules; no visible change.
2. **VIS1b** (M, stage 4) — the scene host: `#scene` canvas, lazy vendored Three.js r128 (LIC1 entry, CSP unchanged), an empty room,
   the three levels, the low-power note (hidden until E3), cost row.
3. **VIS1c** (M) — «Night forest» room (fireflies, depth, parallax, shadows per class). 4. **VIS1d** (M) — «Monastery» room.
5. **VIS1e** (M) — the forest band: musicians from backing note events with output-latency sync, «Musicians: on/off», ducking.
6. **VIS1f** (S) — the lesson layer as an overlay module (no lesson content — that stays the last stage, user answer 2).

## 9. Questions
1. Calm's note field over a room: faint by default (recommended), hidden, or per room?
2. May the «Rooms of light» prototype's code be used as the starting source (who wrote it, under which terms)? Default in this plan: a
   reference only, rooms re-written.
3. Three.js r128 is from 2021 (the last line with a UMD build is older than r160): fine for Calm, or prefer the ES-module build of a newer
   release (also MIT; no worker `importScripts` then)? The plan follows the user's choice (r128 UMD).
4. VIS1a now (stage 3, invisible), or together with VIS1b at the start of stage 4?

## Review 2026-10-17 (user answers, RUN 5)
- **The note field over a room (Calm):** almost invisible — only the row under each hand glows softly near the hand and fades. No cents
  and no Hz in Calm (they stay in the full mode). A «Show the full note field» switch may exist.
- **The prototype:** «Rooms of light» (`docs/prototypes/rooms-of-light.html`, the strategist's own code, three.js r128 from cdnjs, MIT) is
  the STARTING POINT, re-laid by the project's rules. Start with ONE room only: the night forest, WITHOUT animals / musicians (fireflies
  only). The user likes both its forest sound and its forest picture. Monastery and the forest band: later / paid.
- The prototype is a reference, not app code: outside `src/` (the static checker reads only `src/`), its external addresses are licence
  register entries of use «reference» (three.js r128, Google Fonts Marcellus + Commissioner), which a shipped file may not use (LIC1 CONTROL).
- How VIS1 is laid out for Calm: `docs/STAGE4-CALM-plan.md` (RUN 5).
