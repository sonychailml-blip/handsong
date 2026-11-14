# BACKLOG — NIGHT track (`apps/night/`, Handsong Night)

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

_The old `BACKLOG.md` was cut by section at SPLIT-2 (nothing lost, `tools/split-docs.mjs --check`). §0, §1, §7.3, §7.4, §7.8, §7.12 → `docs/core/BACKLOG.md`. §2–§6 and the numbers 3.x → `docs/full/BACKLOG.md`, with §7.1, §7.2, §7.5–§7.7, §7.9–§7.11, §7.13–§7.15, §7.20. §7.16–§7.19 → `docs/night/BACKLOG.md`._
_Paths in older text: `src/core/` → `core/pure/`; `src/ui.js`, `draw.js`, `latmeter.js`, `views/` → `core/legacy-ui/`; other `src/` → `core/`; `data/` → `core/data/`; Night-only and Full-only files → `apps/night/`, `apps/full/`; probes → `tools/probes/`; prints → `tools/prints/`. Map: `tools/split-move.mjs`._

## Open now (written at SPLIT-2, 2026-11-02, English)
- ⬜ **NIGHT-1: sound headroom.** Stages 1–2 done on the laptop (`docs/night/NIGHT-1-HEADROOM.md`): Night's work about halved, same sound. Open: the Poco page `<preview>/?probe&headroom` (user, 2026-11-03: later); step 127, the user's ear check of the quiet floor (option 3, off for players; a small saving, 2–11%); whether the Poco needs more.
- ✅ **Landscape: the low-light hint overlapped the control panel** (its OK sat over the «Звук» label). Fixed at NIGHT-2 stage 2: in landscape it sits in the free area left of the capsule; the known line in `MSG_KNOWN` is gone.
- ⬜ **The cold first opening (NIGHT-7):** about 7 s at medium on the laptop in a fresh browser (shader compile; the bark's and the wood's shaders 1.3 + 1.2 s, the rest 0.1–0.5 s each); sliced, so the start card stays responsive, and Chrome keeps compiled shaders for later visits. Options, later: fewer shader variants (one program for the bark and the wood), a simpler first look that sharpens after, or the per-device levels the user planned.
- ⬜ **A cross-link to the full app, later:** from Night's info card, as a plain web link to the Handsong site or store page. Never a code import.
- ⬜ **Delete `apps/night/migrate.js` after the first public release,** with the row «NIGHT migrate» and the file's exemption in the row «OLD NAME gone».
- ⬜ **The user's eye and ear checks of RUN 9: steps 120–124,** and **the Poco measurement** (ⓘ → «Measure this device», 2 minutes with the forest on). Current addresses: `docs/night/HANDOFF.md`.
- ⬜ **Background music themes** (ex-RUN 10).
- ⬜ **Port the forest demo with CC0 textures** (ex-RUN 11). Every texture goes in the licence register first (rule #32).
- ⬜ **Rooms as modules:** room contract, catalogue, loader. In progress: NIGHT-3 (`docs/night/design/NIGHT-3-rooms/PLAN.md`): stages 2–4 and stage 5 part 1 (settings) done; next stage 5 part 2, the switching machinery (where we stopped and the user's notes: PLAN.md, top). The forest stays the only room for now.
- ⬜ **The lantern, back as an offer in the low-light message** (user, 2026-11-09): not a menu switch again (removed at NIGHT-3 stage 5 part 1), but a button inside the low-light message, e.g. «Подсветить руки», since it exists to light the hands in a dark room. What it was: a warm radial glow over the bottom 24 % of the screen, remembered per device (`handsong.nightLantern`; the markup, rule and token are in the NIGHT-3 stage 5 part 1 commit's parent). The low-light message is core's (`core/legacy-ui/latmeter.js` `#darkHint`), so an app's button there needs a door (a CORE run).
- ⬜ **NIGHT-4, the music bed v2, after the user's step 131** (2026-11-09; `docs/night/design/NIGHT-3-rooms/PLAN.md` §4b):
  - The A/B choice: v2 or v1, voices or horns. Once v2 stays, delete v1's driver, law and sound, keeping only what the AudioWorklet fallback needs (it plays v1 when AudioWorklet is missing), and decide the palette.
  - The Poco: the bed's cost on the phone (`?probe&headroom`; its `bedCost` measures v1 and v2 alone) and a listen.
  - Lighter keeps the node and its room (24 µs on the laptop): a 4-line room for weak devices only if the Poco needs it.
  - The «Лёгкий лес» text does not mention the music (a CORE text run).
  - Not built (plan §4): the sleep timer thinning the bed; the bed's own notes on the bus for a room's visuals.
- ⬜ **The bed's notes shown in the room** (user, NIGHT-3 stage 4, 2026-11-04; for the forest polish run, not before): e.g. fireflies lighting up with the music bed's chords, driven by the bed's own events (never by audio analysis), never brighter than the player's light. Built at NIGHT-6 slice 1 (the bed's events on the bus «bed», shown when heard: chords swell the mushrooms, each loop voice glows in its own cluster, glass notes make a far firefly twinkle); waiting for the user's look (step 134).
- ⬜ **The forest polish, then a second room** (user, 2026-11-03): after NIGHT-3, a run merges today's forest with the sketch «Живой лес» (`tools/design/room-demos/rooms/2026-10-20_zhivoy-les.html`). In progress: NIGHT-6 (`docs/night/design/NIGHT-6-forest/PLAN.md`): the plan approved with the user's decisions and the files rule (2026-11-09); slices 0 + 1 built, waiting for the user's look and the Poco measurement (step 134). Only then a second room is chosen and ported. Candidates and estimated costs: PLAN.md §5. Lake first (cheapest, safest), then Aurora, Sea, Window (the «Тихие комнаты» sketch), Monastery («Комнаты света»), Cosmos; «Песня в темноте» later as its own mode. The Room button shows once there are two real rooms.
- ⬜ **Calibration and sensitivity screen (NIGHT-2):** stage 1 design approved with the user's answers (2026-11-03, `docs/night/design/NIGHT-2-calibration/DESIGN.md` «Decisions»); stage 2 built (`apps/night/calib.js`, the settings card); stage 3 after the user's laptop try (hand choice in settings, the flicker, far hands), waiting for the five checks of step 129. On top of CORE-1 (`docs/core/BACKLOG.md`, `docs/core/CORE-1-DESIGN.md` §6). User's decisions, 2026-11-02: the person sees only the one-step near calibration, offered once on first launch (skippable; stop the ghost first) and afterwards in the settings menu, next to two sliders, «Hand travel» (playing-hand depth; more travel = a lower value, so the long end is 0.7×) and «Effects sensitivity». No numbers, no direction choice, no calibration icon on the main screen. The test panel stays development-only.
- ⬜ **Step 125 for Night:** now covered by step 128 on the real screens (laptop and Poco). Done so far: Full on the desktop (the panel).
- ✅ **Main screen: at most 6 icons** (user, 2026-11-02): four round buttons + settings since NIGHT-2 stage 3; the view switch, the Forest slider and «Play with» are in settings.
- ⬜ **Graphics quality in settings: low · medium · high** (user, 2026-11-03; room left in the View section). What it takes: (1) one setting over what exists: the scene level (`setSceneLevel` full / reduced / minimal, today a development switch) and, at low, what «Lighter forest» does (the delay-network room, strike caps at 60 %, no glass blur) — decide whether «Lighter forest» merges into low; (2) a device default chosen once: the engine class (ENG2, provisional), the GPU name, then the first 20–30 s of the forest measured (scene fps, hand detections per second, audio dropouts, the numbers «Measure this device» prints) → a proposal, never a silent switch while playing (user answer E1); (3) remembered on this device, the person's choice wins; (4) rows: the choice maps to the level and persists; the Poco numbers decide the thresholds (C8 rest).
- ⬜ **Audio dropouts right after the forest opens** (seen at NIGHT-1 stage 2, laptop, 2026-11-03): the first real-time pass of Firefly's fast passage right after the forest opened read free share 0 with 5 dropouts; the two other runs of the same case 63–75 and 50–63 with none, and every other case none. Likely the forest's opening (about 20 shaders compiled, the room built, 2–3 s the first time) competing with the audio thread. Not tiny to fix (delay the opening's heavy part, warm the shaders while silent, or open with the sound faded); watch it on the Poco with «Measure this device» first.
- ✅ **Question for the user (NIGHT-2 stage 2):** a «Play with» tap after calibrating changed the hands for this session only. Answered (2026-11-03): «Play with» moves into settings and is saved; the last choice wins. Built at stage 3.
- ⬜ **Playing far from the camera: TV or projector, 1–2 m** (user, 2026-11-03). Stage 3 accepts a steady hand down to a palm size of 0.075 (≈1.5 m on a 640×480 webcam with a 45° view) and keeps the far end at 0.06 (≈1.9 m) — both ESTIMATES; the smallest size measured with no dropout is 0.109 (≈1 m). Past that the limit is the palm detector, which sees the whole frame shrunk to 192 px, so a higher camera resolution won't help it. What would: (1) measure first: the user calibrates at 1, 1.5 and 2 m (step 129, item 2) and the measuring page's far step at those distances; (2) a crop around the player once found (a narrower view for the detector, the picture unchanged; core vision, CORE run); (3) a camera with a narrower lens. Depth there has less travel and more shake.
- 💡 **Idea (user, 2026-11-02):** when no hand is found for a while, show a small camera thumbnail in a corner.
- ⬜ **A scales library with key choice.**
- ⬜ **Start times, measured again** (NIGHT-12, 2026-11-12): the start times of CORE-20 are NOT proven — the laptop was busy (a call, video) during every measurement, and `early.js` changed to the safe rule (after the load event and Begin) after the last one. Repeat on an idle laptop and on the Poco: `node tools/probe-browser.mjs --measure-start` and `--measure-start --throttle` (a warm-up visit, two alternating repetitions; «old» = `?probe&oldload`), and once on a built tree (`--root tools/.build/night-preview`, which adds «now without modulepreload»). Record: requests and bytes before Begin works, the time to a working Begin, tap → first camera frame, fresh and second visit.
- ✅ **P9 first — the hand model on our own origin, cached** — built at CORE-22 (2026-11-13): the four files (+ the no-SIMD pair) under `core/vendor/mediapipe/0.10.35/`, both apps opt in, the CSP of both pages `'self'` only, a year-long immutable cache header (`vercel.json`); waits for step 157. (NIGHT-12 finding): every visit downloads the hand model again, about 7.6 MB (Google's storage response is not reused from the browser's cache; the WebAssembly and library are), so a second visit is not much cheaper than the first on a slow link. Hosting the four MediaPipe files ourselves with long-lived caching (and later a precache, C9 below) is the biggest remaining start win.
- ✅ **C9 offline** — built at CORE-22 + NIGHT-14 (2026-11-13), waits for step 157: vendored MediaPipe, CSP `'self'`, Night's precache with a versioned list written by `tools/build.mjs`, the quiet «A new version is ready» line. Left: `storage.persist` (not asked: the cache simply falls back to the network if the browser evicts it). The original item: vendored MediaPipe + model, CSP to `'self'`, SW precache + update toast, `storage.persist` (plan §9.1; the old cache item: `docs/core/BACKLOG.md` §1). CORE-20 estimate (2026-11-12): two runs — (1) a CORE run: the four files (library 137 KB, loader 322 KB, SIMD binary 11.15 MB, model 7.82 MB; the no-SIMD pair too, about 11 MB more, for old browsers) under `core/vendor/mediapipe/0.10.35/`, `handdet.js` through `new URL(…, import.meta.url)`, both pages' CSP to `'self'` + `'wasm-unsafe-eval'`, the register's entries from CDN to shipped, the runner's host list shrinks, `early.js` points home; about 19 MB more in git history. (2) a NIGHT run: a versioned precache list written by `tools/build.mjs` (page, static closure, data, Standard's forest files, three.js, the stream, MediaPipe ≈ 27 MB; Detailed +5 MB), cache-first with a build-hash cache name, an update notice, `storage.persist`; probes for the update path and an offline second start. Cost: our host serves the 19 MB a first visit (Vercel Hobby ≈ 100 GB/month ≈ 4,000 first visits; the binary compresses on the wire, the model hardly); second visits need no network at all (today: about 150 revalidations, 30 KB, the library and binary from the browser's cache, and the 7.6-MB model downloaded again every visit).
- ⬜ **C10 release:** the release edition exists (`tools/build.mjs`, `HANDSONG_EDITION=release`); left are the dist checks, privacy wording, hosting. **C12 release candidate:** both suites on the runner, the user's phone round, fixes, then publish.
- ⬜ **MediaPipe versions — look every 2–3 months, update only on purpose** (CORE-22, 2026-11-13; next look about 2027-01/02): check npm `@mediapipe/tasks-vision` and the hand model page for a new version; read its notes; never update as a side effect. An update is its own CORE run: a NEW folder `core/vendor/mediapipe/<version>/` (the year-long immutable cache header relies on a file never changing under its address), `core/handdet.js` `MP_VER` and `MP_SOURCES.own`, `apps/night/early.js`, the README's hashes, the register; then the hand rows compared before and after (the runner's hand and gesture rows, `P.night`'s hand rows, the hand-depth prints, «LAT2 worker = main thread») and the start measured (`--measure-start`); the old folder removed in the same run. The steps: `core/vendor/mediapipe/0.10.35/README.md`.
- ⬜ **An instant camera refusal can be misread while the hand model builds** (found at NIGHT-14, 2026-11-13; runner «NIGHT honest start» (D) failed 1 time in 3). Night tells «refused without asking» (an in-app browser) from «a person said no» by how fast the refusal comes back (`pure/inapp.js QUICK_DENY_MS` 450 ms, `core/vision.js` `gumMs`). That time is measured on the main thread, where both apps build the hand model (path 'main'); since CORE-22 the model arrives locally at once (and from the precache on a second visit), so its build — the two models and the two warm-ups, 0.5–1.6 s each — often overlaps the Begin tap, and the refusal's callback waits behind it. Proposed fix, its own small CORE run (opt-in, Night only): while a camera request is under `QUICK_DENY_MS` old, the detector holds its next heavy step (`createDetector` option `hold`, awaited before each build and warm-up; at most 450 ms of delay, only when the build is still running at the tap). The row is not loosened.
  - NIGHT-14c (2026-11-14): it failed in each of the last three full Night suites (NIGHT-14, 14b, 14c) and passed in each `--ui-only` run (3 of 3): it needs the machine busy. The proposed opt-in hold is the fix; until then a full-suite failure of this row alone is this race.
- ⬜ **«RAIN room» in `P.night`: one failure in the full suite under load** (NIGHT-14, 2026-11-13): «two minutes after its note the window glows at 0.964, the trace law says 0.364» — the row jumps the scene clock and reads after 3 frames; alone (`--eval`) it passes (0.363 vs 0.364). RAIN-0's row, the room untouched by NIGHT-14: watch it; if it recurs, give the clock jump its own settle wait (a frame count is a lottery under load).
- ⬜ **Store packaging, later** (Capacitor: `webDir: dist`; the network list in `archive/SPLIT-PLAN.md` §4.4 must change first).

## Open from the old HANDOFF (kept word for word in `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2»)
- ⬜ C8 rest: phone numbers, the auto-proposal of a level.
- ⬜ RUN 9's questions to the user: is medium good enough or should high get cheaper · the night's 24 minutes and a cloud every 3 minutes · rare moments every 2.5–5 minutes · 1–3 s to open the forest, or a gentle «waking» moment · the falling star in front of the trees.
- ⬜ User checks without a closing record in the old HANDOFF: steps 101–105 and 114–119 (the user's checks of 106–113 led to RUN 8).
- ⬜ Before the first release: detection in a worker if phone numbers ask for it, the user's own visual design and icon set (§7.19; Night's look is chosen, the audit marks of the rest remain).
- ⬜ After the first release: installation (kiosk) mode §7.18 = stage 4b · «Listen» §7.17 · the plan's later list (§12): more rooms, the forest band, rhythmic backings, more timbres and effects, the expression hand, saved moments, packs, «Plus».
- ⬜ Selling: Vercel Hobby forbids it; a paid plan or other hosting first (§7.12 item 6, `docs/core/BACKLOG.md`).

## 7. Product direction (the parts that belong to Night)
_The heading and intro of §7 are in `docs/core/BACKLOG.md`._

---
_Below: the old backlog's text as it stood, renamed._

### ⬜ 7.16. ⛳ «NIGHT» MODE — ROOMS OF LIGHT AND SOUND (user's idea, recorded 2026-10-14; candidate for the FIRST RELEASE — after stage 3, before the big constructors)
- **What:** a mode/preset of the SAME app (§7.15), not a separate codebase; can be sold as a pack. Only solo, a few effects and the
  expression hand. Gentle, not a game.
- **A room** = a quiet backing with its own mood + an auto-chosen, replaceable instrument + a mode with no wrong notes + a visual scene.
  Start with 3–4 rooms, grow to ~10. Backings preferably generated by our engine (pads, drones, slow chords, wind/water textures);
  optionally licensed / CC0 field recordings.
- **Picture:** the camera image is NOT shown; the hand points are drawn as part of the scene. Core idea: darkness + light — the points are
  light sources revealing a dark pre-made scene. User's rooms: an old stone monastery (the points are candle flames lighting parts of the
  room); a night forest (the points are fireflies with trails; wild fireflies are drawn to the hands). Other candidates: underwater
  plankton / jellyfish, starry sky (notes light stars), aurora, rainy window, ink in water.
- **Depth:** a depth/normal map per scene gives relief lighting; the hand's distance to the camera (rough, 3–4 layers) moves the light
  closer / farther. The picture follows the MUSIC too: louder → brighter flame, pitch → warmer / colder light, onset → a glint, expression
  vibrato → flicker.
- **Levels:** (1) light mask + particles, one shared system — days; (2) animated objects per scene (branches, fish flocking) — 1–2 weeks per
  scene; (3) relief lighting / depth layers. Needs a low-power visual setting for phones.
- **Value:** the clearest demo of Handsong, best for short videos, fits installations.
- **Plan:** 3–4 rooms at level 1 + one showcase room at level 2 → show to 3–5 people → then expand.
- **Next ideas (user, 2026-10-14):** playing along with outside music — §7.17 (after the first Night release); installation (kiosk) mode and
  B2B sales — §7.18 (after Night).
- **Sounds from the Night prototype (SND-F1, 2026-10-15).** Built in the app: the chord timbre «Firefly» (struck tine, one-shot), the effect
  «Night forest» (seeded 3.4-s convolution room), the dynamics «Glue» and «Limiter» (§7.14). Recorded here, NOT built yet:
  - **The «Forest» drone (prototype recipe, verbatim):** sine 110 Hz @0.09 + sine 164.81 Hz @0.05 + looped white noise → bandpass 520 Hz
    Q 0.6, centre swept ±260 Hz by a 0.06 Hz LFO, @0.05; fade-in time constant 1.2 s; send 0.7 to the reverb. (In the app the pitches must
    come from the scale and A4 — rule #2 — and the noise from a seeded generator.)
  - **Per-note «distance colour» for 3D rooms (prototype):** lowpass 900 + 8000·(1−depth)^1.5 Hz, dry 1 − 0.55·depth, reverb send
    0.5 + 0.8·depth (depth 0 near … 1 far).
  - The prototype's rooms are 3D (Three.js, MIT licence — allowed by rule #32; a register entry when it is added).
  - ✅ **Room** (SND-F1b): Short 0.85 / Medium 1.7 (default for now; the user chooses by ear) / Long 3.4 s — same recipe and seeds, the
    envelope recomputed per length.
  - ⚠️ CPU (SND-F1b, desktop, offline proxy, % of one core): Short ≈ 14, Medium ≈ 15, Long ≈ 27; three Medium at once ≈ 48, three Long ≈ 122;
    a phone ≈ 4× → too heavy on a phone with several roles. ⬜ PROPOSAL (not built): a SHARED reverb send — one room per network (live, track)
    fed by per-role sends, so the cost stays one convolver per network whatever the number of roles; or the FDN shaped like the forest.
  - ⬜ **A light «forest-like» reverb for phones and Night** (user, LAT2 record, 2026-10-15): shape the existing cheap FDN reverb (§3.9b) to
    the Night forest character (its decay shape, brightness, density) at ≈ 1 % CPU, as the phone / low-power choice of the same effect.
  - ⬜ **In the Rust → WASM engine** (stage 5 / 7): an ALGORITHMIC reverb that sounds like Night forest at a fraction of the convolution
    cost — measured against the convolution by ear (A/B) and by the GOLD features.

- ⬜ **Musicians in the scene** (user's idea, added 2026-10-15). In Night worlds the backing parts are «played» by characters of the world:
  forest — a frog whose throat swells on the bass, a woodpecker on the ticks with a real drum-roll, an owl on a short melody, a firefly swarm
  pulsing with the pads; monastery — monks with bells; and so on per world.
  - **Sync from our own note events, never from audio analysis:** each motion is driven by the exact note events of our own backing sequence,
    scheduled with the audio output latency, so the picture lands on the sound. A visible wind-up before each hit lets the player anticipate
    the beat.
  - **Night first:** small, in the depth of the scene, soft motion, never brighter than the player's light; a «Musicians: on/off» setting.
  - The backing gets softer while the player plays (visible ducking); owl and frog turn towards the player's light.
  - Later: the backing builds as musicians arrive; touching a musician with the light mutes / unmutes its part.
  - A working prototype exists outside the repo (the strategist's «Rooms of light» demo). Strong for installations (§7.18), children and
    short shareable videos.

### ⬜ 7.17. ⛳ NIGHT — PLAYING ALONG WITH OUTSIDE MUSIC (user's idea, recorded 2026-10-14; NOT in the first Night release — after it, as part of «hearing the room», §7.11; Night itself: §7.16)
- **One-shot «Listen» button:** the app mutes itself for 5–10 s, listens through the microphone, detects the tonic and a rough mode, then
  resumes in that key. Muted while listening → no self-capture problem.
- **In Night it sets the PENTATONIC of the detected key:** safe over both the major and its relative minor, and forgiving of detection errors.
- **Continuous listening is harder** — the mic hears our own sound: headphones solve it; browser echo cancellation helps partly; subtracting
  our known output is complex. Key changes are rare in quiet music, so continuous mode belongs mainly to a **Jam** mode (§7.15), with
  headphones or as experimental.
- **After stage 2** (done): the detected key moves only live playing (the knob), never recordings.
- **Key detection with our own code** (chroma + key profiles), not Essentia (AGPL; commercial use needs a paid licence) — §7.12 item 4.

### ⬜ 7.18. ⛳ INSTALLATION MODE + B2B SALES PLAN (user's idea, recorded 2026-10-14; after Night, §7.16)
- **Kiosk mode:** runs all day unattended; auto-restarts; no buttons or menus; an «attract» idle state; works OFFLINE (today it does not —
  MediaPipe from a CDN, SW caches nothing: BACKLOG §1 «Service Worker: model cache»); defined behaviour with several people in front of the
  camera; the camera image is never shown (as in Night).
- **Price ladder (estimates):** self-install licence $300–1,500 one-time per location or $30–150/month; turnkey (hardware spec + remote setup +
  branded room) $2,000–8,000; custom room for an exhibition theme $5,000–20,000+; event rental $200–1,000/day.
- **Reference prices:** museum interactive studios quote ~$20–50K per single station, $40–150K+ per zone, 8–24 weeks; packaged interactive
  projection systems start around $5.8K.
- **Markets:** museums, galleries, children's centres, sensory/therapy rooms, clinics, spas, yoga studios, hotel lobbies, cafés/bars,
  festivals, corporate events.
- **Sales path:** 1–2 near-free pilots in Tbilisi in exchange for filming visitors and a testimonial; a 1–2 minute video in a real dark room
  (§3.31 promo video); a one-page PDF and a 3-tier price sheet; direct outreach; AV integrators and rental firms as resellers (20–30%); event
  agencies; art/tech open calls and grants. Sales cycle 2–6 months.
- **Prerequisite:** a business entity for contracts (pending the user's legal consultation in Georgia). Related: §7.12 item 2 (licences to
  schools and installations).
- **Light on the hands — plan the hardware (LAT3, 2026-10-15):** venues are often dim, and a webcam in low light lengthens its exposure and
  delivers fewer frames, so every hand answer comes later. Measured on the same webcam (the user's desktop): 6.3 fps in the evening vs
  14–30 fps by day; at 6.3 fps the wait for the next frame alone is ≈ 79 ms and hand → sound grows from ≈ 125 to ≈ 205 ms. No web API can
  force a webcam's frame rate in the dark (LAT3's test switch: a minimum frame rate may be refused or ignored; a short manual exposure exists
  only on some cameras and gives a darker, noisier picture). So every installation spec includes ONE of: (a) soft, even light on the hands'
  zone — a diffuse lamp aimed at the play area (not at the camera, not into the visitors' eyes; warm/dim light for the room can stay), or
  (b) an infrared camera with its own IR illuminator (invisible light, works in a dark room; check that the hand model tracks IR images
  before buying). The turnkey price includes it; the self-install licence names it as a requirement. Before a pilot: measure the room with
  the latency meter (camera fps and «Hands lost» line).

### ⬜ 7.19. ⛳ OWN AUTHORED VISUAL DESIGN AND A COMPLETE OWN ICON SET (user's goal, recorded at LIC1, 2026-10-14; BEFORE the Night release)
- **Goal:** an original, authored visual design for the whole app and a complete icon set of our own — replacing every icon, glyph, image
  and font in use today. Today's set (audited in LIC1, `THIRD-PARTY-LICENSES.md`): three code-drawn PNG app icons («H» of rectangles, made by
  Claude Code; whether anything was copied is unknown), ≈ 72 Unicode symbols and emoji drawn by each device's own fonts (they look different
  on every phone and may carry the font owner's terms in marketing images), and the system font stack. All of it is marked «to be replaced by
  the user's own authored design».
- **Who designs — user decision (DAY run, 2026-10-16):** ALL design work — visual identity, interface, colours, fonts, icons and every design
  system — is done by Claude Code itself as our own authored work. Fonts only under OFL or a similar allowed licence (rule #32); icons drawn
  by us, no icon libraries. The new design comes through the user's CHOICE among proposals; until then UI1b keeps today's look.
- **When — user decision (DAY run, 2026-10-16):** the full redesign of layout, sections and visual style comes LATER, once the missing parts
  exist (effects constructor with its three placements, expression lab and hand map, Night, Save/Open, MIDI in/out, audio in); the effects
  constructor is redesigned once it is built. Inventory and principles for it: `docs/full/UX-INVENTORY.md`.
- **Done in code (UI1b, DAY run 2026-10-16):** `tokens.css` holds every colour, type size / weight / line height, spacing, radius, shadow and
  z-index of the DOM interface (built from today's values; style.css and JS styles use only tokens — static check 11); `src/icons.js` is
  the ONE icon component (names by meaning; DOM `data-icon`, dictionary `{i:name}`, `icon()` in ui/draw/tutor); LIC1 fails on an interface
  glyph outside it. Proof: tools/ui-snap.mjs — 10 screens pixel-identical. DRAW1b (RUN 3, 2026-10-16) did the CANVAS palette:
  tokens.css «canvas» (`--cv-*`), read by src/palette.js; the play field, strip, window, mixer and editor are pixel-identical.
- **Preparation in code (slice UI1 of stage 3; UI1b done — see above):** the interface becomes THEMABLE — design tokens in one place (colours, fonts, sizes,
  spacing; today partly in `style.css :root`) and ONE icon component / SVG sprite replacing emoji and Unicode glyphs in the UI (DOM and
  canvas), so the authored design drops in later WITHOUT code changes. LIC1's glyph audit lists every symbol to replace.
- **Licences:** our own work, CC0, CC-BY 4.0 (attribution), SIL OFL for fonts, AI-generated with the tool recorded; never SA, NC, ND (Q13).
- **Night's design — user decision (RUN 7, 2026-10-17):** a combination of the RUN 6 proposals (`docs/night/design/`): the EMBLEM / app icon
  from C · Hush (five dots in an arc, the centre one glowing — also the brand mark above the «handsong» wordmark), its glowing dot in
  Moonglass's firefly lime `#c8f56a`; EVERYTHING ELSE from B · Moonglass (palette as `--night-*` tokens, icons, round buttons in a glass
  capsule, first-run card, ⓘ panel, portrait and landscape). Fonts: OFL, self-hosted woff2, WITH Cyrillic (Fraunces has none — an OFL title
  serif in its soft spirit; the sans checked for Cyrillic). Glass blur has a plain dark fallback (Dark level, weak devices, low power). Full
  keeps today's look. Applied in RUN 7 slice C11 (`docs/night/STAGE4-NIGHT-plan.md` «Review RUN 7»; quality bar `docs/night/QUALITY.md`).

## DESIGN-1 findings (2026-11-13, English; outside that run)
- Cached MediaPipe files and the Begin tap: in runner runs with `--cdn-cache` (the files arrive at once) the music was first audible 3.1–8.1 s after Begin (1.1–1.5 s without), and an instant camera refusal was timed past `QUICK_DENY_MS` (450 ms). Probably the runner's routing; still, measure a real second visit (HTTP cache) on the Poco: does the model's start-up delay the music?
- Phone landscape while playing: the coaching line touches the effect bars (`ui-snap`: play 844×390, nightCoach × nightFxBars) — seen before DESIGN-1 too.
- `tools/ui-snap.mjs`: two waits use an `async` predicate (night-cards, night-cal-fail) — Playwright does not await it, so they never wait.
- core/i18n.js keeps Night's old long settings texts (`night.light`, `night.musicAnswer`, the section headings) that Night no longer shows: a CORE run may drop them (core debt).
- Settings in tabs: the card is centred, so its height and place change from tab to tab (the founder's eye decides; a fixed top would hold it).

- NIGHT-14b leftovers (2026-11-14): (a) a first visit shorter than the start set's download (about 26 MB of files, ≈ 17 MB over Vercel's compression) still cannot start offline next time — it only resumes on the next online visit; a smaller start set (the model and the binary are 19 MB of it) would need the start card to work without hands offline — a design question. (b) `navigator.storage.persist()` is not asked: a browser short of space may drop the cache (Night then simply loads from the network). (c) The Poco keeps the caches of every preview address it opened (each its own origin): clear them in Chrome's site settings once in a while; test on the dev alias https://handsong-night-git-dev-mihail-bridge.vercel.app. (d) Run `node tools/smoke-paths.mjs --precache-url https://handsong-night-git-dev-mihail-bridge.vercel.app --phone` after each push that touches `sw.js`, `update.js` or the build.
