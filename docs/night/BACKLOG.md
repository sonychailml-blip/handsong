# BACKLOG — NIGHT track (`apps/night/`, Handsong Night)

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

_The old `BACKLOG.md` was cut by section at SPLIT-2 (nothing lost, `tools/split-docs.mjs --check`). §0, §1, §7.3, §7.4, §7.8, §7.12 → `docs/core/BACKLOG.md`. §2–§6 and the numbers 3.x → `docs/full/BACKLOG.md`, with §7.1, §7.2, §7.5–§7.7, §7.9–§7.11, §7.13–§7.15, §7.20. §7.16–§7.19 → `docs/night/BACKLOG.md`._
_Paths in older text: `src/core/` → `core/pure/`; `src/ui.js`, `draw.js`, `latmeter.js`, `views/` → `core/legacy-ui/`; other `src/` → `core/`; `data/` → `core/data/`; Night-only and Full-only files → `apps/night/`, `apps/full/`; probes → `tools/probes/`; prints → `tools/prints/`. Map: `tools/split-move.mjs`._

## Open now (written at SPLIT-2, 2026-11-02, English)
- ⬜ **NIGHT-1: sound headroom.** Stages 1–2 done on the laptop (`docs/night/NIGHT-1-HEADROOM.md`): Night's work about halved, same sound. Open: the Poco page `<preview>/?probe&headroom` (user, 2026-11-03: later); step 127, the user's ear check of the quiet floor (option 3, off for players; a small saving, 2–11%); whether the Poco needs more.
- 🐞 **Landscape: the low-light hint overlaps the control panel;** its OK button sits over the «Звук» label. In the baseline since before the split. The overlap check now compares messages with the panel (`msgCheck` in `tools/ui-snap.mjs`) and names this one as known (`MSG_KNOWN`). Fix it, then delete the known line: the check fails while a known line no longer happens.
- ⬜ **A cross-link to the full app, later:** from Night's info card, as a plain web link to the Handsong site or store page. Never a code import.
- ⬜ **Delete `apps/night/migrate.js` after the first public release,** with the row «NIGHT migrate» and the file's exemption in the row «OLD NAME gone».
- ⬜ **The user's eye and ear checks of RUN 9: steps 120–124,** and **the Poco measurement** (ⓘ → «Measure this device», 2 minutes with the forest on). Current addresses: `docs/night/HANDOFF.md`.
- ⬜ **Background music themes** (ex-RUN 10).
- ⬜ **Port the forest demo with CC0 textures** (ex-RUN 11). Every texture goes in the licence register first (rule #32).
- ⬜ **Rooms as modules:** room contract, catalogue, loader.
- ⬜ **Calibration and sensitivity screen (NIGHT-2):** stage 1, the design, waits for the user's approval and answers: `docs/night/design/NIGHT-2-calibration/DESIGN.md`. On top of CORE-1 (`docs/core/BACKLOG.md`, `docs/core/CORE-1-DESIGN.md` §6). User's decisions, 2026-11-02: the person sees only the one-step near calibration, offered once on first launch (skippable; stop the ghost first) and afterwards in the settings menu, next to two sliders, «Hand travel» (playing-hand depth; more travel = a lower value, so the long end is 0.7×) and «Effects sensitivity». No numbers, no direction choice, no calibration icon on the main screen. The test panel stays development-only.
- ⬜ **Step 125 for Night** (`archive/CLAUDE-history.md`; the panel `?probe&calpanel`): Night on the desktop and on the Poco. Done so far: Full on the desktop.
- ⬜ **Main screen: at most 6 icons** (user, 2026-11-02). The view switch (forest / dark / camera) moves into the settings menu.
- 💡 **Idea (user, 2026-11-02):** when no hand is found for a while, show a small camera thumbnail in a corner.
- ⬜ **A scales library with key choice.**
- ⬜ **C9 offline:** vendored MediaPipe + model, CSP to `'self'`, SW precache + update toast, `storage.persist` (plan §9.1; the old cache item: `docs/core/BACKLOG.md` §1). **C10 release:** the release edition exists (`tools/build.mjs`, `HANDSONG_EDITION=release`); left are the dist checks, privacy wording, hosting. **C12 release candidate:** both suites on the runner, the user's phone round, fixes, then publish.
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
