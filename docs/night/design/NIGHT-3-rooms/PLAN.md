# NIGHT-3: rooms as modules, room switching, a music bed per room. Stage 1: the plan (2026-11-03)

## The user's decisions (2026-11-03): read these first; they override the text below
- **No second room for now.** Build everything except a room's own design: the room module, the music bed, the buttons and the switching machinery. The forest stays the only room. A later run polishes the forest, merging today's forest with the sketch «Живой лес» (`tools/design/room-demos/rooms/2026-10-20_zhivoy-les.html`); only then is a second room chosen and ported. Stage 4 (the Lake) is dropped. The Lake and the other sketches wait in `docs/night/BACKLOG.md` §7.16.
- **Stage order:** stage 2 CORE-7, the door → stage 3 the forest as the first room module (+ CORE-8) → **the music bed** (was stage 6: the pure law, three presets, the Music button, the two settings, the headroom rows) → **the switching machinery** (was stage 5, without a second room: «Picture: Room · Dark · Camera», the fades, detection paused while a room builds, the room remembered, the row «NIGHT room switch»; tested with a minimal development-only test room players never see; Dark → Room builds the forest, so that path must not crackle either).
- **The Room button shows for players only once there are two real rooms;** until then the main screen has five buttons.
- §8 answers: (1) 3 + 3. (2) Room · Music · Sound / Mood · Notes · Sleep; until the Room button: Music · Sound / Mood · Notes · Sleep. (3) Dark and Camera as «Picture» in Settings, keeping the room's sound. (4) A tap steps Off → three presets → Off, the value under the button. (5) Off at first start. (6) «Покой · Течение · Мерцание» / Still · Drift · Glimmer. (7) With the bed on, it takes over the low drone. (8) One room acoustic for every room in v1. (9) No port for now. (10) The bed first, then switching.
- Stage 2 as built: the profile validator was NOT widened (no caller would pass a room or ambience list yet); it changes in stage 3 together with the room ids.
- Stage 4 changes (user, 2026-11-03): NO stepping back while playing (the bed keeps its own slow life; the «Step back» setting dropped); the response, if any, subtle and musical — built as «the next chord leans toward the notes you played», a switch, off by default (not clearly better without ears). Sound: detune between each voice's two oscillators, a slow filter drift, pads below the playing; default level near the nature sound; the bed's notes shown in the room → backlog.
- Stage 4 as built (2026-11-04): two shared side filters instead of one per voice, quiet voices parked, every moved param k-rate — 2.1–2.5 % of a quantum (one filter and pan per voice was 3.7–4.2 %).
- **⛳ WHERE WE STOPPED (2026-11-09):** stage 5 part 1 (settings) is built, approved and committed by the user. **Next: stage 5 part 2, the switching machinery**, started by the user in a new window. Nothing of part 2 is built yet.
- **Stage 5 part 2: what it is and the user's notes (2026-11-08/09).** Scope (the user's words): the fades, hand detection paused while a room builds, the two-slot nature crossfade, the room remembered, the low-memory rules, the row «NIGHT room switch» with its control, all tested with a development-only test room players never see; Dark or Camera → Room must not crackle either; the Room button stays hidden for players until there are two real rooms. Notes:
  - **The row is judged on exact controls** (user, 2026-11-09), replacing §7's real-time control: (1) hand detection takes no frame while a room builds — the old way (no pause) takes some; (2) no audio node is created during a switch — the counter must see a node made inside its window; (3) no click in an offline render of the nature crossfade — an instant swap must show one; (4) after 20 switches programs, geometries, textures and contexts are back at their baseline — a test room that leaks a texture must be caught. The real-time dropouts (switches vs quiet windows, and the old way) are printed, not judged; so `--repeat 3` is not required.
  - **Also in part 2:** fix the stale `shell.js` line in `CLAUDE.md`'s module map (it says «four controls»); the bar shown while playing (`#nightForestBar`, today the fixed key `night.forest` «Лес») is labelled with the current room's name.
  - **The design proposed at part 1's end (not yet built):** a small CORE-11 (a boot option `detectPause`, a predicate: the pump takes no frame while it is true; absent = today's editor pause exactly; and the Room button's text key). The host pauses detection from the start of an opening until the new room has rendered two frames, and fades the picture in after every opening (Dark → Room too); a failed opening drops the renderer so the 2D stand-in shows (today a failed build can leave black), and an opening over 8 s shows the stand-in. The two nature slots live in one ambience object (slot 0 built exactly as today; slot 1 parked, sharing the wind noise; the wanted recipe passed by `main.js`'s closure, no core change); the bed is retuned to the new room's recipe while silent and starts its first chord after the fades. The test room lives in `tools/probes/night/` (record, 2D stand-in, one full-screen shader, a leaky and a failing variant), registered only by its row or by `?probe&testroom`.
- Stage 5 part 1 as built (2026-11-08; the user split stage 5: the settings first, then the switching machinery with a dev-only test room): «Что на экране» reads «Комната · Тёмный · Камера» (the stored value keeps the name «forest»); «Звуки комнаты» moved to Music and sets the room's sound only, the hand's reach is fixed at the old slider's default 0.6 (`apps/night/shell.js` `REACH`), so nothing changed at the default; «Руки на экране» moved to Hand; the Lantern switch was removed (it stays off). Texts: CORE-10.
- Stage 3 as built (2026-11-03): the forest is `apps/night/rooms/forest/` with its record; the host is Night's (CORE-8); the background value «forest» keeps its name until the «Picture» setting (switching stage); the TWO nature slots for a crossfade move to the switching stage, where a test room can exercise them (one slot today, built from the room's recipe).

Read-only stage: no app code was changed. Tree hashes are unchanged: core 20ec0bdb5f375302 · apps/full d6b90cf2cb4be6da · apps/night 4f4fcfc3f1f0cc14.
Read for it: `apps/night/{main,shell}.js`, `apps/night/scene/*`, `apps/night/pure/cycle.js`, `apps/night/data/night.json`, `apps/night/night.css`, `core/legacy-ui/views/scene/host.js`, `core/modules/ambience/forest.js`, `core/pure/ambience.js`, `core/modules/effects/forestdepth.js`, `core/pure/profile.js`, `core/DEBT.md`, `docs/night/NIGHT-1-HEADROOM.md`, `docs/night/BACKLOG.md` §7.16, and the five sketches in `tools/design/room-demos/rooms/`.

Numbers marked «est.» are estimates from code and from NIGHT-1's measurements. Nothing was run for them. Each stage below measures them.

---

## 1. How modular things are today

| Kind | Add one without touching the others? | What is in the way |
|---|---|---|
| **Scale (Night's «Mood»)** | Mostly. A mode is a data file plus its id appended to `core/data/index.json`. | For Night the mood also needs: its id in the profile's `moods`, a key `night.mood.<id>` in core's `i18n.js` (core debt), and a look in `apps/night/pure/cycle.js` `MOOD_OF`. That look is the **forest's** colours. With several rooms, every room needs a look for every mood, unless a room falls back to its own default look (today's `moodLook` already falls back to Glow). |
| **Instrument (timbre)** | Yes, if an existing engine plays it: one record file, `node tools/timbre-bundle.mjs`, its pinned id, the profile's `timbres` plus optional `levels`/`voices`. | A new **engine** is core code (`core/modules/timbres/`, `audio.js` wiring, the render copy, GOLD). Night's lean path and strike caps assume today's engines. |
| **Effect** | No. Every effect is core code in `FX_FACTORY`. | Night's own effects (`forestdepth`, `night-fx`) sit in core because an app can't hand the engine a module. `core/DEBT.md` names the fix: «an engine registration door … must reach both instances». |
| **Nature sound (ambience)** | No. There is exactly one, `ambience.forest`. | It is core code (`core/modules/ambience/forest.js`, `core/pure/ambience.js`), one `amb` object per engine. The profile validator accepts only `«ambience.forest»`. GOLD renders it. |
| **Room (picture)** | Half. `sceneRoomAdd(id, …)` can register several rooms. | In `host.js`, `setBackground` and `setSceneLevel` always open `'forest'`. The 2D stand-in draws with forest tokens. The CSS class is `bg-forest`. The profile accepts only `scene:'forest'`. The host lives in `core/legacy-ui/`, which may only shrink, so room switching can't be added there. The shell's «Forest» slider sets the ambience level **and** the Forest depth effect's reach. The «Lighter forest» switch, the wind the leaves sway with, the forest bar and its texts are all forest-specific. The `--cv-forest-*` tokens live in `core/tokens.css`, and static check 11 reads only that file. |

**In short:** scales and instruments are data. Rooms and their sounds are not: the forest is wired through core, the shared UI and the shell. The way out is the same in each case: rooms and their sound live in `apps/night/`, and core gets one opt-in door to let an app's sound module into the engine.

## 2. The room module

The forest becomes the first room. A room is a folder `apps/night/rooms/<name>/` with a permanent id (`room.forest`, `room.lake`; rule #37). The order of rooms is a separate list, `apps/night/rooms/index.json`.

**What a room provides:**
- **Its record** (`room.json`, data, checked by a pure validator with controls): name {en, ru}; its quality levels (counts per level, like today's `FOREST_LEVELS`); its looks per mood, plus a default look; its nature recipe; its music bed recipes (2–3 presets, §4); its acoustic (v1: the shared Night forest room, see the decisions); its token prefix (`--cv-<room>-*`).
- **Its picture** (`scene.js`, loaded only when the room is first opened, by a dynamic import from our own origin): `build(THREE, opt)` → `{ scene, camera, update, resize, glint, held, dispose, state, project }`. That is today's `buildForest` contract, written down. It also provides a **2D stand-in** (`standIn(ctx, …)`) used for the low level and when WebGL fails or is lost, so a room never goes black.
- **How it answers:** the playing hand's light sits at the hand's remapped play point and depth (rule #12) and is placed through the room's own camera, so it lands on the note row. A note-on makes a glint. A held note can open something, like the forest's flower. Echo, Warmth and Wave come from the `nightFx` bus, and the mood, sleep and wind from `nightSky`. Optional later: the bed's own notes on the bus, so a room can show «musicians» (backlog §7.16).
- **Loading and unloading:** one room is alive at a time. `dispose()` frees every texture, geometry, material and render target it made (its own list, as the forest does now). `state()` returns numbers for the probes, never pixels.
- **Seeded:** the same room on every device.

**What it gets from the engine and the app:** three.js r128 (vendored, loaded once); the palette (`cv`); the level; the size; reduced motion; the bus (hands view, the live notes ring, `nightFx`, `nightSky`); the night clock (`nightAt`, `nightDeep`) for outdoor rooms. For its sound, the door from stage 2 (below): the audio context, an input to the master under the sleep fade and the limiter, the audio clock for scheduling ahead (rule #15), and pitches only from the live view (rule #2).

## 3. Switching rooms

**A tap on the Room button goes to the next room.** The value under the button is the room's name. The choice is remembered on the device.

**How it looks and sounds (about 3 s, nothing abrupt):**
1. The picture fades to black over about 0.5 s (a veil over the scene layer only). The hands' 2D fireflies keep drawing, so the hand still answers.
2. The old room's nature sound and bed fade out (time constant about 1 s). The new room's nature sound fades in (about 2 s) on a **second, already-built slot**, so the two overlap as a real crossfade. No audio node is created during a switch: two nature slots are built once at the first start, and the idle slot is disconnected after its fade (as NIGHT-1's lean path parks silent banks). Your own notes, their tails and the room acoustic are untouched.
3. In the dark moment the old room is disposed, then the new one is built and its shaders compiled. **Hand detection pauses for this moment.** The Room button shows only when no hand is up, so nothing is lost. The room's name shows softly in the middle for about 1.5 s.
4. The picture fades in over about 0.8 s. The new bed starts its first chord after the fade.

**The crackle when the forest opens.** NIGHT-1 saw 5 dropouts in the first pass right after the forest opened, and RUN 9 measured 2–3 s to compile about 20 shader programs the first time. On a 2-core machine, building textures and compiling shaders at the same moment as hand detection (40–45 ms per detection on the main thread) and the room's background thread is too much at once. The switch avoids that four ways:
- Hand detection pauses during the dark moment.
- No audio graph change happens at the switch.
- The new rooms use few shader programs. Lake, Aurora and Sea are full-screen shaders: 2–4 programs instead of about 20.
- The WebGL context is kept across switches (the host already reuses its renderer). Making and dropping contexts on Android is slow, and the number of contexts is limited.

**Dark and Camera** move to Settings as **«Picture: Room · Dark · Camera»**. The room is still chosen with the Room button and is always one of the rooms. In Dark or Camera you hear that room's nature sound and bed without its picture. That is also the answer for a weak phone: Dark costs no GPU and keeps every room's sound.

**A phone with little memory:** one room alive at a time, the old one disposed before the new one is built, and each room's code loaded only when first opened. At Night's resolution (at most 1 device pixel per CSS pixel × 0.6 at medium, about 0.12 megapixels on the Poco) a full-size render target is about 0.5 MB, so even the Cosmos sketch's targets come to about 3.5 MB (est.). That is small next to the hand model. When `navigator.deviceMemory` reports 2 GB or less, rooms start at medium. A failed build, a lost context or a build taking over 8 s shows the room's 2D stand-in, never black.

## 4. A music bed per room

**One generator, the room's recipes as data, three layers:**
- **Ground:** root and fifth of the live view (today's drone pricing, `tonicFreq`/`droneSecondHz`). When the bed is on, it takes over today's ambience drone, so two drones don't beat.
- **Pad:** 3 slow voices, each 2 oscillators with a room-specific wave and a soft lowpass. Chords come only from the view's own degrees (`chordNotes` when the mode has chords, else stacked scale steps) and move by the smallest step, every 8–20 s, with attacks of 3–6 s. They sit below the playing register.
- **Glimmer:** rare single soft notes on scale degrees (2 pooled voices with a struck-like gain envelope), every 6–25 s.

**It follows the scale and tonic.** Every new bed event reads the live view (rule #2). On a Mood change the pads fade over 2 s and the next chord comes from the new scale. The ground glides, as the drone does today. The sleep timer thins and slows the bed and fades it with everything else.

**It breathes with your playing.** A pure law in `apps/night/pure/bed.js`, which can be tested in node: from the live notes ring and whether a hand is up, a slow «playing» level with an attack of about 1.5 s and a release of about 6 s. While you play, the bed drops about 6 dB, its filter closes by about an octave, glimmer stops, and chord changes wait until 4 s after your last note. About 8 s after you stop, it opens up again: a new chord, glimmer returns. It never answers faster than the music.

**Presets (2–3 per room, the same three names in every room, a different recipe per room).** For example Still (ground and one pad voice, very sparse), Drift (pads moving), Glimmer (pads and glimmer). In Russian, for example, «Тихо», «Плавно», «Мерцание». They must not be called «moods», because the Mood button already means the scale.

**The Music button:** I recommend that **a tap steps through Off → Still → Drift → Glimmer → Off**, the way Sleep steps through its times, with the value shown under the button. A long press would be hidden and unlike every other button.
**At first start: off.** The first steps teach that a pinch makes a note, and music the app plays by itself would blur that («was that me?»). With the bed off, Night sounds exactly as it does today, so «NIGHT untouched» keeps holding with no renewal. The choice is remembered afterwards.
**Settings:** a Music volume slider, and one «Step back while I play» amount. The «Forest» slider becomes the room's slider, labelled with the room's name (Forest / Lake): its nature volume and the hand's reach, as today.

**Rules it keeps:** its oscillators are built once on the first On, gated, and disconnected while Off (rule #3, so Off costs nothing). Events are scheduled ahead at explicit times (rule #15). It feeds the master under the sleep fade and the limiter, never a track, and never passes through the hand's effects (rule #31). It has its own small echo, like today's ambience.

**Cost, in NIGHT-1's terms** (offline µs per 128-sample quantum on the render copy, budget 2,667 µs at 48 kHz). The basis: NIGHT-1 measured a bowl's 24 sines with per-sample gains at 66 µs (about 2.75 µs each) and today's ambience at about 60 µs.

| Part | Laptop, µs (est.) | % of the quantum (est.) |
|---|---|---|
| Today's nature + drone (measured) | ≈ 60 | ≈ 2.2 |
| Bed: three pad voices | 25–30 | ≈ 1 |
| Bed: two glimmer voices | 15–20 | ≈ 0.7 |
| Bed: echo, ducking, mix | ≈ 10 | ≈ 0.4 |
| **Bed on, total** | **50–60** | **≈ 2** |
| Bed off (parked) | ≈ 0 | 0 |
| During a switch: the second nature slot, for about 3 s | +60 | +2.2 |

**On the Poco:** its audio thread runs on cores close to this laptop's in single-core speed, so about 1–1.5× (est.): the bed ≈ 2–3%, nature + bed ≈ 4–6% of the quantum. Since NIGHT-1 stage 2, the laptop has 50–63% free with camera, tracking and the forest. The bed is about a sixth of one 12.5% ballast step, below what real time can resolve. NIGHT-1's Poco numbers aren't in yet, so the Poco figure is an extrapolation until the phone page runs with the bed added.
**Gate:** the bed's offline cost must stay at or under 3% of the laptop quantum (a probe row). If the Poco's free share under stress with camera, room and bed falls below 25%, the «Lighter» setting also drops the glimmer and one pad voice.

## 5. Which sketch room to port first

At Night's resolution (about 0.12 MP on the Poco at medium) every sketch is 2–5× fewer pixels than in its own page (0.45–0.85 × up to 2 device pixels). All of them load three.js from a CDN, price notes as `440·2^((m−69)/12)` and use `Math.random`; some create a new oscillator per sound event. In each port: our vendored r128, pitches from the view, seeded randomness, pooled gates. Like the forest, they are our own work as source (rule #32).

Costs are relative to the forest at medium, which RUN 9 measured at −6% hand detections against Dark on the laptop. All est.; each port measures with RUN 9's method and then «Measure this device» on the Poco.

| Room | What it draws | Programs (first open) | GPU per frame vs forest medium | Sound | Port size | Risk |
|---|---|---|---|---|---|---|
| **Lake** («Тихие комнаты») | one full-screen pass; the cloudy sky can be baked into a texture every few seconds (clouds drift slowly); the tree and reeds are painted once; rings on the water, lanterns, the hand's light and its reflection | 2–3 (well under 1 s) | **0.5–1×** | low water noise and rare plips: at most today's forest ambience | S–M | **low** |
| Aurora | three curtains ray-marched (up to 30 steps each), mountains, snow, ice, a cabin | 2–3 | 1.5–3× (fewer steps at medium) | wind with two slow drifts, rare high glides | M | medium |
| Sea | the Milky Way and stars (bakeable), waves per pixel, a 512² plankton simulation, rings | 3–4 | 1–2× | surf whose swell follows the waves (picture and sound coupled) | M | medium |
| Window | street lights (baked), fog on the glass (two half-size targets), 40 drops and 40 trails per pixel, a 7-tap blur | 4–5 | 1.5–2.5× | rain: dense ticks, which the sketch makes as a new node every 60–320 ms and which must become a gated pool | M–L | medium |
| Monastery («Комнаты света») | a 3D hall in the forest's own technique; candles as the hands' lights | ≈ 15–20 (1–3 s) | 1–1.5× | a few tones, cheap | L | medium (known technique, big build) |
| Cosmos | the sky baked in 8 strips, then each frame: two dust trails (4 targets), particles, comets, a lens pass with ray steps, bloom | ≈ 8 | **2–4×** | a low hum and noise, cheap | L | **high** |
| Song in the dark | no picture; three creatures placed in 3D sound | 0 | none | 3D panners, unmeasured | M | it is a game (Night: «gentle, not a game»), so later, as its own mode |
| Living forest | already in the app (RUN 9): it **is** the forest module | — | — | — | — | — |

**Port the Lake first.** It is the cheapest and the safest: few programs, so it opens fast (which also helps the crackle), the quietest sound, and an outdoor night that reuses the night cycle (moon, mist, the sleep timer deepening it) and the forest stream's ring logic. Then Aurora and Sea, then Window, then the Monastery and Cosmos, each in its own run.

## 6. The main screen: six round buttons

Arithmetic from `night.css` (button 56 px, capsule padding 18 px, edges 14 px, gaps 6/12 px). Screenshots confirm it in stage 5.

| Screen | Layout | Per column | Fits? |
|---|---|---|---|
| Portrait 393 px | one row of 6 | 49.5 px | **No**: the 56-px circle doesn't fit. With 48-px circles and tighter padding the column is 53 px, but «Настроение» (≈ 70 px) and «Флейта с дыханием» would break mid-word. |
| Portrait 393 px | **3 + 3** | 105 px | **Yes**, today's circles and words. The capsule grows from ≈ 150 to ≈ 280 px tall, about a third of an 876-px screen, shown only while no hand is up. |
| Portrait 360 px | 3 + 3 | 94 px | Yes |
| Landscape 876 × 393 | today's 2 columns → 3 rows | — | **No**: ≈ 405 px tall |
| Landscape 876 × 393 | **3 columns × 2 rows** in today's 300-px side capsule | 83 px | **Yes**, ≈ 280 px tall. In a browser tab with its bar (≈ 340 px tall) it fits only just; below about 320 px the circles drop to 48 px. |

**Recommended:** 3 + 3 in both orientations. Top row Room · Music · Sound (what you see and hear), bottom row Mood · Notes · Sleep (how you play and rest). Settings stays alone in its corner.

## 7. Stages

Each stage stops for your approval. Every report: static check, `node tools/probe-data.mjs`, Full `--quick` (and `--all` where sound changes), Night `--app night`, tree hashes before and after, at most five manual checks.

**Stage 2: CORE-7, a door for an app's sound module. Nothing heard changes.**
- Changes: an opt-in core option. The app registers a stateless sound builder once, and both engine copies (live and render) find it. The registry sits outside `core/engine/`, so rule #38 holds. Today's forest ambience moves out of core to `apps/night/sound/`: first a pure file move that you commit, then the edits (core rule 12). The profile validator accepts the ambience and scene ids the app lists. `core/DEBT.md` loses `modules/ambience/forest` and `pure/ambience`. Full registers nothing, so every node and its order stay as before.
- Checks: static (checks 13, 14, 15); GOLD's ambience case moves to Night's suite with identical numbers, a declared core-print change made after every other case is compared; FULL untouched and NIGHT untouched; Full `--all`. Manual: none.

**Stage 3: NIGHT-3a + CORE-8. The forest becomes the first room module. Nothing seen or heard changes.**
- Changes: the scene host leaves `core/legacy-ui/` for `apps/night/` (pure move first; `ui.js` and `latmeter.js` reach it through doors, so legacy-ui shrinks). The forest's files move into `apps/night/rooms/forest/` with its `room.json`. The nature sound becomes the general two-slot nature graph; with the forest recipe it must sound exactly like today. The host opens the current room instead of `'forest'`, and `bg-forest` becomes `bg-room`. Static check 11 learns to read the app's stylesheet, so a room's colours stay in the app.
- Checks: every FOREST row unchanged; the picture checksum before and after equal; the nature sound's residual against today at −130 dB or lower; the room-record validator with its controls; `smoke-paths` (paths change). Manual: 1 (the forest looks and sounds the same).

**Stage 4: NIGHT-3b. The Lake, the second room, behind a development switch only.**
- Changes: the Lake module (picture, light and reflection, rings for notes and echoes, lanterns, the night cycle, mood looks, high, medium and low levels, the 2D stand-in) and its nature recipe.
- Checks: build and dispose return programs, textures and contexts to their baseline; the counts per level; the light projects onto its note row; the budget on the laptop (RUN 9 method: detections per second against Dark); the nature cost offline (NIGHT-1 method). Manual: up to 3 (eye and ear on the laptop, a look on the Poco).

**Stage 5: NIGHT-3c. Six buttons and room switching.**
- Changes: the 3 + 3 main screen; the Room button; the switch as in §3; «Picture: Room · Dark · Camera» in Settings; the low-memory rules; the room remembered; the room's slider; «Lighter forest» becomes «Lighter rooms». New texts go through a small CORE text run, because the dictionaries are still in core.
- Checks: screenshots at 393 × 876, 360 × 780, 876 × 393 and 876 × 340, no overlap. A new row «NIGHT room switch»:
  - offline, no click across a rendered nature crossfade;
  - real time, the dropouts over 10 forest ↔ lake switches against 10 quiet windows, with a CONTROL: the old way (build and compile at once, detection running) must show more. Real time is justified here because only it sees main-thread and GPU contention. Run with `--repeat 3`.
  - Leaks: after 20 switches, programs, textures and contexts are back at their baseline.
- Manual: up to 4 (switching by eye and ear on the laptop and the Poco; the six buttons on the Poco in portrait and landscape).

**Stage 6: NIGHT-3d. The music bed.** It could also come right after stage 3 if you'd rather hear it first, on the forest alone.
- Changes: the pure law, with node rows: the same seed and the same playing give the same bed; chords only from the view's degrees; the ducking timing. Also the sound module (stage 2's door), presets for the forest and the lake, the Music button, the two settings, and rows on the headroom page (offline µs per preset; real-time free share with camera, room and bed).
- Checks: with the bed off, NIGHT untouched holds exactly. With it on: its level against Night's sounds, no clicks at chord changes, it follows a Mood change, cost at or under 3%. Full `--quick`. Manual: up to 5 (ears: slow and quiet, leaves room, breathes; the Poco headroom page with the bed).

**Later, one room per run:** Aurora, Sea, Window, Monastery, Cosmos, each with stage 4's checks and its own budget. Song in the dark as a separate mode.

## 8. Decisions for you

1. Main screen: **3 + 3** (recommended), or one row with 48-px circles and no small labels.
2. Button order: Room · Music · Sound / Mood · Notes · Sleep?
3. Dark and Camera as **«Picture» in Settings**, keeping the room's sound (recommended), or as rooms in the cycle.
4. Music button: **a tap steps Off → three presets** (recommended), or on/off only, with presets in Settings.
5. Bed **off at first start** (recommended), or on at the quietest preset.
6. Names for the three presets (Still / Drift / Glimmer, «Тихо / Плавно / Мерцание»?).
7. With the bed on, it **takes over the low drone** (recommended), or both play.
8. Room acoustic: **the one forest room for every room in v1** (recommended; a change of room never swaps a reverb, so it can't click), or each room its own (Short, Medium or Long of the same room, at the switch's dark moment).
9. First port: **Lake**?
10. Stage order: rooms first (3 → 4 → 5 → 6), or the bed right after stage 3?
