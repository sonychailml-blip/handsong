# HANDOFF — NIGHT track (`apps/night/`, Handsong Night, code id `night`)

Index: `/HANDOFF.md`. Rules: `CLAUDE.md`. Open items: `docs/night/BACKLOG.md`. Plan: `docs/night/STAGE4-NIGHT-plan.md` (its paths are as written; `docs/core/STALE-NAMES.md` maps them). Quality bar: `docs/night/QUALITY.md`. The old handoff, word for word: `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2». What in `core/` still belongs here: `core/DEBT.md`.

## Strategy (BACKLOG §7.12, §7.16)
⛳ The first public release is **Handsong Night**, right after stage 3 (user, Q1, 2026-10-14); the visual design is the user's chosen C · Hush emblem in Moonglass colours (§7.19). Proposed still: free → "Plus" → packs → "Pro". Vercel Hobby forbids selling (paid plan or other hosting first, §7.12 item 6). After it: the installation (kiosk) mode §7.18 = stage 4b.

## Deploy (user, 2026-11-02)
`handsong-night`'s Production branch is `night-release`, a stopper branch that is a copy of the old `main`. Merging `dev` into `main` does not touch Night's production. The new Night does not go public yet, and its public home (Vercel or another host) is not decided. `dev` pushes give previews, which keep `?probe`: use those for phone checks.

## Where it stands
Stage 4: RUN 6 ✅ C0, VIS1a–c, listening page, design proposals · RUN 7 ✅ sound pass, C11, C6, C4b, C4c, C7, C5 · RUN 8 ✅ the user's fixes, the forest picture, C8 part (Lighter forest) · RUN 9 ✅ the living forest · SPLIT-2 ✅ its own app and name. **Next:** the user's checks below, then C8 rest (phone numbers, auto-proposal), C9 offline, C10 release, C12 release candidate. Plus the new items in the backlog. `NIGHT-1` (sound headroom) stage 1 done, waiting for the user's decision and the Poco numbers.

## The user's open checks, with today's addresses
Old step texts use the old address and `src/…`; these are the current forms. Live Server, headphones, a lamp beside you.
- **Page:** `http://127.0.0.1:5500/apps/night/`. With the console tools: `http://127.0.0.1:5500/apps/night/?probe`. On a phone: a Vercel preview of `handsong-night`.
- **Step 120, the night.** Begin → Background until «Forest»: a moon, a cloud over it in about 5 minutes, mist. Mood: Dusk, Mist, Glow. Sleep → 15 min: it darkens and stills. Quick look, console: `(await import('/apps/night/scene/host.js')).sceneClockDbg(630)` = cloud; `…sceneClockDbg(60)` = clear moon.
- **Step 121, the answer to playing.** A ring per note; mushrooms and flowers pulse; fireflies gather after 10 s and drift off. Stream: Echo = rings, Wave = ferns tremble, Warm ↔ Bright = the light's colour.
- **Step 122, detail.** The Forest slider moves grass and ferns with the wind you hear; leaves, moths, moonbeams, dark corner leaves. Landscape: nothing covers the middle.
- **Step 123, rare moments.** About 10 minutes: a falling star or the five-dot emblem; hold a note 3 s: a flower. At once: `(await import('/apps/night/scene/host.js')).sceneRoomDbg().rareDbg('star')` (or `'emblem'`, `'bloom'` with a hand up).
- **Step 129, the hand setup, five checks** (laptop + Poco; replaces 128, covers 125 for Night): `archive/CLAUDE-history.md`, step 129.
- **Step 125, hand calibration** (for Night now covered by step 128. CORE-1; Night doesn't open it yet, so this runs on the test panel). `http://127.0.0.1:5500/apps/night/?probe&calpanel`, on the Poco a preview + `/?probe&calpanel`. Press Play, then the green button at the bottom left. Full text: `archive/CLAUDE-history.md`.
- **Step 124, quality and cost.** ⓘ → «Forest picture»: medium, high, low. Then ⓘ → «Measure this device» with the forest on, on the laptop and **on the Poco M5**; send the text.
- **Eye check from the split:** `tools/split-baseline/side-by-side-E/`, the four structure-only screens.
- **Not done by a machine:** ears, hands, phones. Old setting names do not carry over to the new `handsong-night` address, so first-run steps may appear again there.

- **Step 127, the quiet floor by ear:** `http://127.0.0.1:5500/apps/night/?probe&tails=off` and `…&tails=on`; `archive/CLAUDE-history.md`.
- **The Poco headroom page, later:** `<Night preview>/?probe&headroom`, about 25 minutes (user, 2026-11-03).

## Questions for the user from RUN 9
1. Medium is the default because high costs about a third of the hand tracking. Good enough, or make high cheaper?
2. The night repeats every 24 minutes, a cloud about every 3 minutes. Right?
3. Rare moments every 2.5–5 minutes. Right, or rarer?
4. Opening the forest takes 1–3 s. Acceptable, or a gentle «waking» moment?
5. The falling star passes in front of the trees. Natural?

## Records (English, at most about 15 lines each; older ones go to `archive/HANDOFF-history.md`)
### NIGHT-5 (2026-11-09): the user's fixes from play (CORE-11). Log: `docs/night/WORK-LOG.md`
- Part A of the window that continues with stage 5 part 2 (Part B, after the user's check).
- Night never offers Full's song: a profile that records nothing runs no autosave and no offer; Night's page declares its own storage names (`<meta name="handsong-store">`, `core/storens.js`): language, autosave flag, user files, «warned once». Device facts stay shared. The runner's storage census proves it every session, with controls.
- The playing hand's depth has the whole range: reach 1 (was 0.6), the bar fills 0…100 %, no mark. Far end: ~3.4 dB more room than the old stop, darker, loudness within ±1.5 dB. Not retuned (by ear: step 132).
- The bar reads «Глубина». v1 has v2's gap rule (no burst after a hidden tab).
- ⛳ Waiting for step 132 (five checks); then Part B.
### NIGHT-4 (2026-11-09): the music bed, version 2. Log: `docs/night/WORK-LOG.md`; design and «as built»: `docs/night/design/NIGHT-3-rooms/PLAN.md` §4b
- The user put it before stage 5 part 2 (switching), which still waits.
- One AudioWorklet (`apps/night/worklets/bed-worklet.js`) holds every voice and the bed's own long stereo room, at half rate. Measured first: native convolution 66–696 µs for 0.26–6 s IRs; a native 8-line network 72 µs; per native node 1–4.4 µs.
- The law (`pure/bed2.js`, node row «NIGHT music bed v2 law (app)», 174 cases):
  - 2–4 loop voices, each repeating a phrase of 2–4 long notes on its own loop length (17 / 23 / 29 / 31 s), sometimes changed by a note; kept in steps, so a Mood change keeps the melodies;
  - an open-voiced pad over 2–2.6 octaves; a warm ground that takes the drone over; soft glass; air above the note field;
  - a breath about 6 a minute; an arc sparse → full → sparse over 5–10 min.
- Timbres: bowed-string pad, loop voices «voices» (formant vowels, the default) or «horns» (blooming low-pass).
- Presets: «Покой» dark and deep, «Течение» melodies in the middle, «Мерцание» bright with glass and air.
- Lighter (the «Лёгкий лес» switch, or ≤ 2 GB / ≤ 2 cores): two loops, a 3-tone pad, no air, half the glass.
- Cost (laptop, the bed alone): 1.9–2.7 % of a quantum at the arc's fullest (v1: 1.9–2.4 %). The census gate is 133 µs = 5 %; its peaks are 53 / 71 / 85 µs.
- Level near the nature sound (K-like −1.0 / +1.1 / +1.9 dB).
- v1 is unchanged behind the dev A/B pills `?probe&bed=v1|v2&voices=a|b`, and plays by itself if AudioWorklet is missing.
- Accepted by ear (user, 2026-11-09): v2 with the «voices» palette stays the default; v1 stays as the fallback (NIGHT-5 gave it v2's gap rule).
### NIGHT-3 stage 5 part 1 (2026-11-08): the settings card for rooms (CORE-10). Log: `docs/night/WORK-LOG.md`
- «Что на экране»: «Комната · Тёмный · Камера». «Звуки комнаты» (was «Лес» under View) sits under Music beside «Громкость музыки» and sets only the room's sound; the hand's reach is fixed at the old default 0.6, so nothing changed at the default position. «Руки на экране» moved to Hand. The Lantern switch is gone (it stays off; what it did: the work log).
- Landscape: Hand on the left, Music and View stacked on the right. Approved and committed by the user (2026-11-09).
- ⛳ **Stopped here. Next: stage 5 part 2, the switching machinery** (the user starts it in a new window). Scope, the user's notes (judge the row «NIGHT room switch» on exact controls and only print the real-time dropouts; fix the stale `shell.js` line in `CLAUDE.md`; the playing bar named after the current room) and the proposed design: `docs/night/design/NIGHT-3-rooms/PLAN.md`, top. The lantern's return as a «Подсветить руки» offer in the low-light message: `docs/night/BACKLOG.md`.
### NIGHT-3 stage 4 (2026-11-04): the music bed for the forest. Log: `docs/night/WORK-LOG.md`
- The Music button (Music · Sound / Mood · Notes · Sleep, 3 + 3 places): off → «Покой» → «Течение» → «Мерцание»; off at first start, remembered. Settings → Music: volume, «Музыка отвечает моим нотам» (off by default).
- One generator, the forest's recipe as data: chords of the scale's own degrees under the playing, two detuned oscillators per voice, slow filter drift, a ground that takes the drone over, rare glimmer; its own slow clock (no stepping back). The response leans only which chord comes next, never when.
- Cost on the laptop 2.1–2.5 % of a quantum (gate 3 %); level 0.3 dB from the nature sound. Step 130 checked by the user (2026-11-08): all works; the response stays off by default.
### NIGHT-3 stage 3 (2026-11-03): the forest is the first room module (CORE-8). Log: `docs/night/WORK-LOG.md`
- A room = `apps/night/rooms/<name>/`: its record (`pure/room.js`: levels, mood looks, nature recipe), its 2D stand-in, its scene code (loaded on first open); the list is `rooms/index.js`, the validator `pure/room.js`. The scene host is Night's (`apps/night/scene/host.js`), the forest's colours are in `night.css`.
- Nothing seen or heard changed (picture hash, GOLD ambience, NIGHT untouched). Next: the music bed (stage 4 in the user's order).
### NIGHT-3 stage 2 (2026-11-03): the ambience through the core door (CORE-7). Log: `docs/night/WORK-LOG.md`
- The plan is approved with the user's decisions (PLAN.md, top): no second room yet; next stage 3 (the forest as the first room module + CORE-8), then the music bed, then the switching machinery with a dev-only test room.
- The forest ambience now lives in `apps/night/sound/ambience.js` + `pure/ambience.js` and is registered by `main.js` through `core/soundmods.js`. Same sound: GOLD «ambience» on Night's page 0 differences against the old print.
### NIGHT-3 stage 1 (2026-11-03): rooms as modules, switching, a music bed — the plan only. `docs/night/design/NIGHT-3-rooms/PLAN.md`
- No app code; tree hashes unchanged. Rooms and their sound are not modular today (the forest is wired through core, legacy-ui and the shell); scales and timbres are data.
- Proposed: a room folder per room (record, picture, 2D stand-in, nature and bed recipes); a core door for an app's sound module (CORE-7); the host moves to the app (CORE-8); two nature slots for a crossfade; detection paused in the switch's dark moment; Dark / Camera become «Picture» in settings.
- Six buttons fit only as 3 + 3 (portrait 105 px columns, landscape 3 × 2). Bed est. ≈ 2 % of the laptop quantum. Lake first. Ten decisions wait for the user.
### NIGHT-2 stage 3 (2026-11-03): hand choice in settings, the flicker fixed, far hands accepted. Log: `docs/night/WORK-LOG.md`
- «Play with» is a saved segment in Settings → Hand (last choice wins); the main screen has four buttons + settings.
- The calibration picture is drawn by the loop (boot `afterDraw`), so it no longer flickers to black. Far but steady hands are accepted (CORE-6 `farHold`) with a short note. Waiting for step 129 (five checks; replaces 128).
### NIGHT-2 stage 2 (2026-11-03): calibration screens and settings, built. Log: `docs/night/WORK-LOG.md`; decisions: `docs/night/design/NIGHT-2-calibration/DESIGN.md`
- `apps/night/calib.js` + the settings card: the offer once per camera, then the ghost; the step on the camera picture with every point; «Играть» saves, «Ещё раз» repeats; the side of the calibrated hand sets the roles (voted over the hold) and is saved; reset clears all. Five main buttons + settings; background, Forest slider, hand points in settings. Landscape low-light hint fixed.
- Core part CORE-5 (texts, icon). Row «NIGHT calibration screens». Waiting for step 128 (laptop + Poco, covers 125 for Night).
### NIGHT-2 stage 1 (2026-11-03): calibration screens, design only. `docs/night/design/NIGHT-2-calibration/DESIGN.md`
- No app code. 12 screens at 3 sizes in `tools/design/NIGHT-2-calibration/`; 12 open questions. Stops until the user approves.
### NIGHT-1 stage 3 (2026-11-03): the quiet floor, off for players. `docs/night/NIGHT-1-HEADROOM.md` «Stage 3», step 127
- Partials and notes stop below −70 dBFS behind `?probe&tails=on`. Saving 2–11%, sound −46 to −64 dB away. Waiting for the user's ears.
### NIGHT-1 stage 2 (2026-11-03): options 1 and 2. Numbers: `docs/night/NIGHT-1-HEADROOM.md` «Stage 2»
- Night's face turns on CORE-3's lean path: unused stages, roles and closed effects out of the graph, silent flute banks parked. Same sound (−133 to −141 dB, row «NIGHT lean path»). Fast passages 32–36% → 15–19% of budget; free share with camera and forest about 13–38% → 50–63%. If Night's chain ever gains drive, brightness, tremolo or the expression hand, turn the matching switch off first; the row fails until then.
### NIGHT-1 stage 1 (2026-11-02/03): sound headroom, measured. Numbers: `docs/night/NIGHT-1-HEADROOM.md`. Log: `docs/night/WORK-LOG.md`
- Waiting for: the user's decision, the Poco numbers, step 125. No fixes yet.
- Laptop, cool and idle: no crackle (0–2 dropouts in 39 stress passes). Free share under stress: a quarter to a third with sound alone, less with camera and forest; about one 12.5% step below Full's SuperSaw.
- Heaviest: not the partials (a bowl's 24: 66 µs). The forest room, stages Night doesn't use, idle chord voices, flute and SuperSaw banks that never stop. Three unused stages save 17–20% with the sound identical (−138 dB). No slowdown near silence (control: 9–10× in JS).
### RUN 9 (2026-10-19/20): the living forest. Log and plain summary: `archive/WORK-LOG-before-split.md` «RUN 9» (old name)
- NIGHT (`apps/night/pure/cycle.js`): a 24-min seamless cycle: the moon drifts, 7 cloud passes dim it, four mist layers; the sleep timer deepens and stills the night; moods Glow / Dusk / Mist recolour the forest (token sets). Bus `nightSky` { mood, sleep, wind } from the shell.
- RESPONSE (`apps/night/pure/forestlife.js`, `apps/night/scene/forest-life.js`): a ring of light per note; mushrooms / flowers pulse; fireflies gather while you play; a stream with the moon's reflection: Echo = rings on the water, Wave = the leaves shimmer, Warmth = the light's colour.
- DETAIL (`apps/night/scene/forest-detail.js`): instanced grass + ferns sway with the ambience's wind (its level and audible gust); falling leaves (shader); moths at the light; moonbeams; foreground silhouettes. RARE (`apps/night/scene/forest-rare.js`): a falling star or the five-dot emblem every few minutes, a flower on a note held ~3 s; never the same twice in a row.
- BUDGET (Intel HD 4000, two synthetic hands, vs Dark): medium −6 % hand detections (in budget), high −34…−36 % (breaks it; cost follows resolution and frame rate, not content) → DEFAULT = MEDIUM (high stays a dev choice); 0 dropouts. Opening the forest compiles ~20 shaders (2–3 s first time, then ~0.4 s), now inside the opening; the hand lights never change the light count (no recompile on the first hand).
- Rows: core «NIGHT cycle», «FOREST life», «NIGHT rare events»; browser «FOREST night cycle / response / detail / rare events / levels». Captures: `ui-snap --forest`.
