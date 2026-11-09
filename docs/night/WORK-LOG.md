# WORK-LOG — NIGHT track

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`). History: `archive/WORK-LOG-before-split.md`, `archive/NIGHT-RUN-LOG-2026-10.md`. New runs start at `NIGHT-1`.

# NIGHT-4 (2026-11-09): the music bed, version 2
Tree hashes before: core 8d60632b9df3c10c · apps/full d6b90cf2cb4be6da · apps/night d742fc9c204910f1. After: core 8d60632b9df3c10c (unchanged) · apps/full d6b90cf2cb4be6da (unchanged) · apps/night 4847cfc23a871c7a.
- The user's run (2026-11-09): v1 sounds primitive (one low octave, one plain timbre, nearly dry, a random chord every 13–22 s); v2 full, always new, restful; stage 5 part 2 waits. Design note first, then built: `docs/night/design/NIGHT-3-rooms/PLAN.md` §4b (with «as built»).
- New in `apps/night/`:
  - `worklets/bed-worklet.js` — one processor for every voice and the bed's own room (8-line delay network, Hadamard, 4 allpasses), at half rate with a 4-tap interpolator; events at explicit times, idle and asleep cost nothing;
  - `pure/bed2.js` — the law, the work census, the wavetables;
  - `sound/bed2.js` — the node;
  - `bed2.js` — the driver: the module load, pricing from the live view, the pad-slot mirror, the live tick and `bed2Plan`.
- Changed in `apps/night/`:
  - `bed.js` is the door: v2 by default, v1 unchanged behind `bedSetEngine`, and the fallback; palette; Lighter;
  - `shell.js` passes the room's `bed2` and sets Lighter (the setting, or a weak device);
  - the forest's record has `bed2`; the room validator checks it (3 more damages).
- Tools:
  - data row «NIGHT music bed v2 law (app)», 174 cases, with the work census in laptop µs;
  - the browser row «NIGHT music bed», 19 → 42 cases: v2 offline in a bare context, with a CONTROL that the bare path is level-equal to the master tap, and v2 live, a 2-minute gap included; v1's cases behind its switch;
  - the headroom page's `bedCost` measures v1 and v2 alone;
  - `tools/probes/night/bedsw.js`, the dev A/B pills (`?probe&bed`), with a smoke test;
  - `NET_LISTED`: the worklet's load;
  - the data runner prints a row's notes.
- Measured (laptop, offline, the bed alone, best of 5, % of a quantum):
  - v1: Still 1.87, Drift 2.44, Glimmer 2.22;
  - v2 from the start: 1.89 / 2.25 / 2.05;
  - v2 at the arc's fullest: 1.91 / 1.88 / 2.66;
  - Lighter there: 1.68 / 1.73 / 1.61;
  - «horns»: 1.91 / 1.68 / 2.26;
  - the NIGHT-1 way (render copy + Night's chain), v1: 2.54 / 2.47 / 3.17.
- Level at the default volume, against the nature sound: Drift −1.6 dB plain; K-like loudness Still −1.0, Drift +1.1, Glimmer +1.9 dB. No click (≤ 0.13 of 0.5). The worklet dropped and delayed no note.
- Found and fixed (v2 only): after a hidden tab the driver would have sent every missed note at once; it now skips notes more than 1 s late and plays the latest missed chord. v1 has the same burst and stays unchanged for the A/B.
- Fix rounds: 7.
  1. Too dear: 3.4–4.8 % from the first 14 s, at full rate → half rate, block-rate envelopes, a flattened room loop, monophonic loop voices with a 1.8 s handoff.
  2. 9 dB too quiet → the levels by K-like loudness.
  3. A greedy open voicing ran out of range → a small search; wider pad registers.
  4. Lighter not lighter → 3-tone pad, tails × 0.7, judged on its voices.
  5. The air under the note field's top (3.5 kHz) → 4.8–8 kHz.
  6. The first chord came after the first look-ahead → 0.4 s.
  7. A peak plan's window held no chord → the sounding chord comes along.
- Waiting for step 131 (five checks by ear) and the A/B choice.

# NIGHT-3 — stage 5 part 1 (2026-11-08): the settings card for rooms (with CORE-10)
Tree hashes before: core cdf27dd0d90bbad7 · apps/full d6b90cf2cb4be6da · apps/night 87bb83d83ea385cd. After: core 8d60632b9df3c10c · apps/full d6b90cf2cb4be6da (unchanged) · apps/night d742fc9c204910f1.
- The user split stage 5: settings first, then the switching machinery. Decisions and the reach choice: `docs/night/design/NIGHT-3-rooms/PLAN.md` «Stage 5 part 1 as built».
- `index.html`: «Что на экране» = «Комната · Тёмный · Камера» (`night.bgRoom`; the value stays «forest»); «Звуки комнаты» (`nightRoomSound`, was `nightForest` under View) beside «Громкость музыки»; «Руки на экране» at the end of Hand; the Lantern switch and its overlay removed. `shell.js`: the slider sets the ambience only (same storage key, so a person's level survives); the reach is `REACH` 0.6 (the old default), set with the face; the slider's moving mark is gone (it showed the depth, not the sound). `night.css`: the lantern and the mark rules removed; the two Music sliders aligned; in landscape Hand spans two rows, Music and View stack on the right.
- The Lantern (one line, to bring it back): a warm radial glow over the bottom 24 % of the screen, off by default, remembered per device (`handsong.nightLantern`), meant to light the hands for the camera in a dark room.
- Row «NIGHT shell»: the Lantern gone, «Hands on screen» under Hand, «Room sounds» under Music, the first picture choice reads «Room», the slider moves the ambience to 0.25 while the reach stays 0.6 (fails with the old coupling; and the reach must be set with the face). `tools/ui-snap.mjs`: the settings card scrolled (mid, end) in portrait, landscape and Russian landscape.
- Checks: in `docs/core/WORK-LOG.md` CORE-10.

# NIGHT-3 — stage 4 (2026-11-04): the music bed for the forest (with CORE-9)
Tree hashes before: core 2d7f4bf5a9dc5b38 · apps/full d6b90cf2cb4be6da · apps/night 4507f5137f7e21cd. After: core cdf27dd0d90bbad7 · apps/full d6b90cf2cb4be6da (unchanged) · apps/night 87bb83d83ea385cd.
- The user's changes (2026-11-03): no stepping back while playing; a subtle response as a switch; Music · Sound / Mood · Notes · Sleep; detune + filter drift; pads below the playing; level near the nature sound; ≤ 3 %. Plan: `docs/night/design/NIGHT-3-rooms/PLAN.md` «Stage 4».
- `apps/night/pure/bed.js` the law (seeded; chords of the scale's own degrees stacked every other degree, voiced by the least motion in the octave under the playing; glimmer; drift; the response leans only which chord, never when — row: chord times identical with it on, 66 % vs 56 % of the chords' notes are yours), `sound/bed.js` the sound (5 pad voices × 2 detuned oscillators of a soft wave, two drifting side filters, a ground that takes the drone over, 2 glimmer sines, one echo; every moved param k-rate; quiet voices parked), `bed.js` the driver (Off / Still / Drift / Glimmer, volume, response; the remembered mode starts once audio runs). The forest's record gains `bed`; the validator checks it (3 more damages).
- Shell: the Music button (3 + 3 places), Settings → Music (volume, «Музыка отвечает моим нотам», off by default); off at first start, remembered. The ambience's drone stays out while the bed plays (`ambienceSet(…, drone)`; a render copy keeps it).
- Measured (laptop, offline, best of 5, NIGHT-1 method, the headroom page's `bedCost`): Still 2.08 %, Drift 2.39 %, Glimmer 2.49 % of a quantum (the nature sound 2.33 %); a filter and a pan per voice had been 3.7–4.2 %. Level: Drift 0.3 dB from the nature sound at its default. The drone out: −62 / −70 dB at its pitches.
- Fix rounds 4: the bed 8.3 dB loud (master 0.5 → 0.2); after a Mood change a voice kept its old pitch (same step, other scale: now kept only by pitch); the cost (shared filters, parking, k-rate); a helper used before its definition.
- Checks: in `docs/core/WORK-LOG.md` CORE-9. Waiting for step 130 (five checks, the Poco optional).

# NIGHT-3 — stage 3 (2026-11-03): the forest is the first room module (with CORE-8)
Tree hashes before: core c3b25630f4ae3fbb · apps/full d6b90cf2cb4be6da · apps/night 87f6896f34c0f60b. After: core 2d7f4bf5a9dc5b38 · apps/full d6b90cf2cb4be6da · apps/night 4507f5137f7e21cd.
- `apps/night/rooms/`: `index.js` (the rooms, by id), `forest/pure/room.js` the forest's RECORD (levels, mood looks, nature recipe, acoustic), `forest/standin.js` (the 2D picture, moved from the host), the forest's scene and pure files (pure move). `apps/night/pure/room.js`: the validator (`checkRoom`, `ROOM_IDS`, `roomLook`, `ROOM_DAMAGES`).
- The host opens rooms by id and loads a room's scene code on first open; `bg-forest` → `bg-room`; the background value «forest» still means the current room's picture (renamed with «Picture» in the switching stage). The ambience is built from the room's nature recipe; `pure/cycle.js` keeps the night clock and the easing, the looks are the room's. The profile's `scene` is `room.forest` (Night print: that one value renewed, declared).
- Same picture and sound: the forest's rendered frame and its state hash equal the checkpoint's at both levels; GOLD «ambience» 0; NIGHT ambience 0; NIGHT untouched 0. New data row «NIGHT room records (app)», 47 cases, 14 damages refused.
- Checks: in `docs/core/WORK-LOG.md` CORE-8. The smoke stall: core backlog (not found, not ours, printout in place).

# NIGHT-3 — stage 2 (2026-11-03): the forest ambience enters through the core door (CORE-7)
Tree hashes before: core 20ec0bdb5f375302 · apps/full d6b90cf2cb4be6da · apps/night 4f4fcfc3f1f0cc14. After: core c3b25630f4ae3fbb · apps/full d6b90cf2cb4be6da · apps/night 87f6896f34c0f60b.
- The user approved the plan with changes (no second room yet; the bed before switching; §8 answered): `docs/night/design/NIGHT-3-rooms/PLAN.md` «The user's decisions». The Lake and the other sketches are in `BACKLOG.md`.
- `apps/night/sound/ambience.js` + `apps/night/pure/ambience.js` (moved from core, paths only); `main.js` registers the ambience; `shell.js` imports its numbers from the app. Data row «NIGHT cricket schedule (core)» → «(app)». Nothing heard changes: GOLD «ambience» 0 differences against the old print, NIGHT ambience 0, NIGHT untouched 0. Core part and checks: `docs/core/WORK-LOG.md` CORE-7.

# NIGHT-3 — stage 1 (2026-11-03): rooms as modules, room switching, a music bed per room — the plan only
Tree hashes before and after (unchanged): core 20ec0bdb5f375302 · apps/full d6b90cf2cb4be6da · apps/night 4f4fcfc3f1f0cc14.
- No app code. The plan, its estimates and ten decisions: `docs/night/design/NIGHT-3-rooms/PLAN.md`. Waiting for the user's approval.

# NIGHT-2 — stage 3 (2026-11-03): after the user's laptop try — hand choice in settings, the flicker, far hands
Tree hashes before: core cd907ffe1654b50d · apps/full d6b90cf2cb4be6da · apps/night e9b6ee3f263b2e32. After: core 20ec0bdb5f375302 · apps/full d6b90cf2cb4be6da (unchanged) · apps/night 4f4fcfc3f1f0cc14.
- «Играть: правой / левой рукой» left the main screen (four round buttons + settings) for a segment in Settings → Рука, saved (`calSideSet`; the last choice wins, a calibration's or this one).
- The flicker: `calTick` drew from the shell's own animation frame, which could find the camera snapshot already closed by the next frame (0 × 0, a dark frame; with a hand nearly every frame). Now drawn by the loop (`main.js` → boot `afterDraw`, CORE-6); a closed picture keeps the last frame. Not reproducible headless (the order differs there); the row checks the wiring and the keep, with a CONTROL.
- Far hands: the page opens the engine with `farHold` (CORE-6): refused only below palm size 0.075 or shaking; a far or noisy hold gets the note «Отсюда камера видит руку не так чётко…»; a far shaking hand «Точки дрожат…»; the instruction now names the closest point and «Ход руки».
- Row «NIGHT calibration screens» 35 → 48 cases; the shell row clicks the settings segment. Step 129 (five checks) replaces 128.
- Checks: static PASS; [probe-data] PASS — 36 checks, 0 differences (CAL1-3 153 cases); Full P.quick: PASS — 93 checks, 0 differences; Night P.night: PASS — 37 checks, 0 differences (calibration screens 48 cases); [smoke] PASS with builds; ui-snap Night: no overlap; doc-split PASS. Fix rounds 0 (one regenerated name index).

# NIGHT-2 — stage 2 (2026-11-03): calibration screens and settings, built
Tree hashes before: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b. After: core cd907ffe1654b50d · apps/full d6b90cf2cb4be6da · apps/night e9b6ee3f263b2e32.
- The user's answers to the 12 design questions and additions A, B: `docs/night/design/NIGHT-2-calibration/DESIGN.md` «Decisions».
- `apps/night/calib.js` (new): the offer once per camera, the step on the camera picture (its own canvas, the forest stays open), every point of the hands while calibrating, the result card (hands play, «Играть» saves, «Ещё раз»), failures worded by reason, the side voted over the hold sets the roles and is saved, reset clears all; the settings' Hand section and its two sliders.
- `apps/night/shell.js`: five round buttons; ⓘ → settings (Hand · View · about); background and Forest slider in settings; «Руки на экране» fingertips / all points (was a dev switch); the offer after a person's Begin, then the ghost. `ghost.js`: `ghostArm({ wait })`. `index.html`, `night.css`: the card and overlay; the landscape low-light hint left of the capsule (`MSG_KNOWN` line deleted in `tools/ui-snap.mjs`).
- Core part: CORE-5 (texts, settings icon). Row «NIGHT calibration screens» (`tools/probes/night/calib.js`, quick).
- Checks: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` (Full) · `P.night: PASS — 37 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT calibration screens 0, 35 cases) · `[smoke] PASS` with builds · ui-snap Night: no overlap (0 known). No print renewed, no tolerance changed.
- Players who never calibrate or open settings: the same sound, gestures and hand points; the main screen has five buttons and the settings icon (the design).

# NIGHT-2 — stage 1 (2026-11-03): calibration screens, design only
No app code. Design and open questions: `docs/night/design/NIGHT-2-calibration/DESIGN.md`, mock beside it, pictures `tools/design/NIGHT-2-calibration/` (`node tools/night2-mock-snap.mjs`). Waiting for the user's approval.

# NIGHT-1 — stage 3 (2026-11-03): option 3 behind a switch
Tree hashes before: core c91a61074394f73e · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b. After: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- Numbers: `docs/night/NIGHT-1-HEADROOM.md` «Stage 3»: 2–11%. Night doesn't opt in. Dev switch `tools/probes/night/tailsw.js`, row «NIGHT quiet floor», smoke test of the switch. Step 127 is the user's listening test.
- Final set: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 36 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0, NIGHT quiet floor 0) · `[smoke] PASS` with builds. No print renewed, no tolerance changed.

# NIGHT-1 — stage 2 (2026-11-03): options 1 and 2
Tree hashes before: core e327f42db4c183c7 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core c91a61074394f73e · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- Night opts in to CORE-3's lean path (`apps/night/shell.js`: face + one tick). Numbers: `docs/night/NIGHT-1-HEADROOM.md` «Stage 2». Fast passages about halve; free share with camera and forest about doubles.
- New row «NIGHT lean path» (`tools/probes/night/lean.js`). The headroom page shows new and old in the same session (`CONDS`, `PLAN`), gentle passes before ballast.
- Final set: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 35 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0) · `[smoke] PASS` with builds. One fix round: a word the name row forbids in a mockup, and a row order number. No print renewed, no tolerance changed.

# NIGHT-1 — stage 1 (2026-11-02/03): Night's sound headroom, measured
Tree hashes before: core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core e327f42db4c183c7 (one listing line, CORE-2 in `docs/core/WORK-LOG.md`) · apps/full and apps/night unchanged.
- Measurement only; nothing players hear or see changed. Numbers, conditions and limits: `docs/night/NIGHT-1-HEADROOM.md`.
- New, dev only: `tools/probes/night/headroom.js` + `headroom-calc.js` + `headroom-worklet.js` (the phone page, `<preview>/?probe&headroom`), `tools/night-headroom.eval.js` (the laptop's run). `tools/probes/night.js` mounts the page. Data row «NIGHT-1 headroom sums»; smoke test of the page, with a control; `NET_LISTED` entry in `tools/check-static.mjs`.
- Method fixes along the way: a passage created up front left every finished note in the graph and read 54–100% of budget, so each note is now created just before its time (33–39%). What-if savings use the better of two baselines. Real-time repeated three times after the first run looked disturbed.
- Final set, same conditions (00:03–00:29, 2026-11-03): static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, FULL untouched 0) · `P.night: PASS — 34 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0) · `[smoke] PASS` with builds, its controls caught. No print renewed, no tolerance changed, `--stress-not-judged` not used.
- Waiting: the user's decision, the Poco numbers, step 125. No fixes in this stage.
