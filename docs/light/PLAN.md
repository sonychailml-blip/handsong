# Handsong (code id `light`) — the plan (LIGHT-0, 2026-11-27)

The founder's idea (2026-11-27): the simplest possible Handsong, released soon, while Full and Night keep growing. Code id `light`, folder
`apps/light/`, track `LIGHT-n`, address later https://play.handsong.app plus a card on handsong.app. Shown name: **Handsong** (see «Decided after LIGHT-0»).

## What Light is (the founder's decisions)
- **Camera picture + the note field, solo only.** No bass, chords, drums, recorder, editor, lessons or split.
- **Only 12-note equal temperament** (tuning `edo12`): no microtones, no historical temperaments.
- **The playing hand's depth sets the reverb** of the notes that hand plays (fixed, not a setting).
- **The effects hand has fixed fingers, moved only up and down:** index = delay, middle = vibrato, ring = tremolo, little = brightness
  (filter). A sensitivity setting (1–100, as in Night) says how sharply depth and effects change.
- **No settings button.** Hands in view: only the note field. Hands out of view: the controls appear, as in Night:
  1. scale (pop-up menu);
  2. timbre (one at first; 10–15 good ones later);
  3. key, with the A4 reference (440 or other) in the same pop-up;
  4. hands: ONE button, ONE menu for both hands — each hand's function (effects / notes held / notes not held / theremin, as Full offers),
     each hand's octaves (four in a row, one per finger, moved by arrows: A1–A4 → A2–A5 …) and the field's view (1 or 4 notes a cell);
  5. camera switch (front / back);
  6. depth and effects sensitivity;
  plus the **clip button** apart, in a corner.
- The controls need not be Night's circles: a design of its own (LIGHT-1 drawings, the founder picks).
- **A start page** (camera permission, privacy).
- **Clips with the camera picture** (the founder: kept; rule #33 allows it — a clip leaves the device only by the person's tap).
  Recorded the way Full records (`core/clip.js`: the canvas + the recording tap of what is heard), **saved as MP4** where the browser can
  (the founder, 2026-11-27: WebM is refused or not shown by WhatsApp, Instagram and the iPhone). From Night only the clip INTERFACE is taken
  (countdown, ring, the card with Save and Share).
- **Separate from Night** (the founder): no shared UI folder; Light writes its own interface and copies only what fits as is.
- **Full and Night must not change** (the founder, a hard condition) — see «Core changes».

## The constructor principle (checked at LIGHT-0)
Scales, timbres and effects are blocks, not engine code; Light picks them by LIST in its profile (`apps/light/data/light.json`,
`handsong/profile` v1 — the same mechanism Night uses: `moods`, `timbres`, `effects`, `handFn`, `noteModes`, `key`):
- **Scales:** data files `core/data/modes/<id>.json`; 38 of them are `edo12` today (major … minor-penta, blues, the church modes, the
  Japanese and other 12-note sets). Which of the 38 Light offers is a founder's choice (all, or a shorter list).
- **Timbres:** data records `core/data/timbres/<id>.json` (TIM3); 30 solo timbres exist. The first one is picked by ear from 2–3 candidates
  (proposed: `solo.firefly` — tuned and proven on phones in Night —, `solo.plucked-string`, `solo.flute`).
- **Effects:** code blocks with declared parameters (`audio.js FX_FACTORY`: `dly`, `reverb`, `bright`, `trmMix`, …; the old per-voice
  scalars `vib`, `trm`); what a finger or the depth drives is a CHAIN setting (`state.fxChains`: effect id + per parameter `fixed` or
  `drive` with hand and axis), not wiring. Full's default fingers are delay / vibrato / drive / tremolo; Light's (delay / vibrato /
  tremolo / brightness) and depth → reverb are chain entries. Effects as DATA records (the «effects constructor») stay a later core stage.

## Where each part comes from
- **From `core/` (used as is):** audio engine and timbres, scales and keys (`baseF`, `aRef`), hand tracking (`vision.js`, `handdet.js`),
  gestures and hand functions (`gestures/`), the note grid (`scales.rectGrid`, `draw.noteLbl`), effect blocks, clip recording
  (`clip.js`), storage namespace (`<meta name="handsong-store" content="light">`), i18n.
- **The boot:** Full and Night both start through `core/legacy-ui/boot.js` with their own face; Light does the same. `legacy-ui` gets no
  new feature for Light; if Light needs something there, it is an opt-in option in its own CORE run.
- **From Full (behaviour, not its UI):** hand functions, octaves per finger, the 1-or-4 notes field — all already in core.
- **From Night (copied into `apps/light/`, re-styled):** the clip interface (button, countdown, card, Save, Share), the controls that
  appear when the hands leave, the start-page pattern, 8 languages (en, ru, es, pt, de, fr, it, ka).

## Core changes (each its own CORE-n, both apps' full checks)
Expected, all opt-in (core rule 4 — absent option = today's nodes, values and order):
1. `core/pure/profile.js`: `profile.light` in `PROFILE_IDS` (pinned, rule #37), shell `light` accepted.
2. `core/clip.js`: an option to prefer MP4 (`video/mp4` with H.264 + AAC where `MediaRecorder` supports it), WebM as fallback; Full keeps
   WebM-first.
3. Possibly none more: depth → reverb and the four fingers should be chain settings; verified at LIGHT-4, a core option only if not.
Each such run: tree hashes before/after (`apps/full`, `apps/night` must not change), rows «FULL untouched» and «NIGHT untouched» at zero,
GOLD, the Night suite and Full `--quick` (`--all` if sound paths change). Done together where possible: one long check (≈ 2–3 hours on
the laptop), announced in advance. Everything else lives in `apps/light/` and takes the quick checks (iteration mode).

## Tools
`tools/build.mjs` (`HANDSONG_APP=light`), `tools/smoke-paths.mjs`, `tools/probe-browser.mjs --app light` (a light row set in
`tools/probes/light.js`), the static check (the same CSP line in all pages, static check 16; app lists), `tools/licences.json` (no new
third-party item expected), the site generator for the card (SITE track).

## Steps
- **LIGHT-0** — this plan (docs only).
- **LIGHT-1** — drawings: the play screen and the controls in several designs; the founder picks.
- **LIGHT-2** — the skeleton: page, start card, camera, note field, solo with one timbre; CORE run 1 (profile); tools learn `light`.
- **LIGHT-3** — the controls: scale, key + A4, the hands menu (functions, octaves, field view), camera switch.
- **LIGHT-4** — depth → reverb, the four effect fingers, sensitivity.
- **LIGHT-5** — the clip: Full's recording with MP4 (CORE run 2), Night's interface.
- **LIGHT-6** — texts in 8 languages; checks on the Poco and an iPhone; the full check.
- **LIGHT-7** — publish: a Vercel project (the founder creates it), play.handsong.app, the card on handsong.app (SITE run).
- Then: more timbres (10–15), one at a time by ear.

## Decided after LIGHT-0 (the founder, 2026-11-27)
- **Scales:** every mode of Full's «Familiar» section (`menu.tradition: "common"`) — 31, all `edo12`: diatonic (6), modes (7), ethnic (1),
  pentatonic / blues (5), chromatic (1), symmetric (4), exotic (4), world pentatonics (3). Not the Far East 12-note sets (another
  section), nothing from «Experiments»; some may be removed later.
- **Timbre:** only Full's default solo timbre — `solo.supersaw` («SuperSaw», `state.leadIdx` 0, the first solo record). No others yet.

- **Name:** plain **Handsong** — the simplest app carries the brand; address **play.handsong.app**; Full becomes **Handsong Studio** later, at
  its own release (nothing renamed now). The code id stays `light` (folder, track, `profile.light`) and is never shown.

## Decided at LIGHT-1 (the founder, 2026-11-27; drawings `tools/.out/light-ui/index.html`)
- **Look:** Light's own — warm amber accent, dark glass, Inter; the start page as drawn.
- **Controls when the hands leave: variant B** — key and A4 large on top, the scale under it (both open their menus); four round buttons
  below: timbre, hands, camera (one tap flips front / back), sensitivity; the clip button top right.
- **Sensitivity = two sliders, as in Night:** hand travel (depth → reverb, needs the hand setup) and effects (how sharply they follow the
  hand's height); the hand-setup line in the same sheet.
- **Hand setup as in Night:** the nearest point of the playing hand is measured and depth counts from it (`core/handcal.js`, the shared
  service; Light writes its own screens with Night's flow: offer after the first start, the measure, done).
- **Bars vertical over the note field, as in Night:** the effects hand's four (DLY, VIB, TRM, BRT) on its side, REV on the playing hand's
  side; each set follows its hand (40 % / 60 % of the width); the bar of the finger in use glows. **Labels: three English letters in every
  language.** Note names sit mid-band so the bars never cover them.
- **The brand mark:** the same emblem as Night and the site (five dots), wordmark «hand·song» in Literata; Light's centre dot amber (Night's
  lime); the app icon in the same family on a warm dark ground. **Yes** (the founder, 2026-11-27).
- **Volume = the playing hand's left ↔ right** (as Full; the founder: never drawn — where the hand is shows it).
- **Note names mid-band** (tried first; back to the left edge if it reads worse). The bars stay at the screen's edges (the founder: never mid-screen).
- **When the bars show — yes** (the founder): the effects bars appear when an effects pinch starts and fade about 1.5 s after the last change
  (not whenever the hand is in view, as Night does: `apps/night/shell.js bars`); REV shows while a note sounds, fading about 1 s after.

## Decided after LIGHT-2 (the founder, 2026-11-27)
- **One axis per effect, as in Night:** each effect finger drives ONE value on the vertical (the chain already does — `data/light.json`). Full's
  drawing unfolds a pinched effect into all its parameters (the delay's mix, time and repeats: three bars) — Light's own bars (LIGHT-4) show
  one bar per finger.
- **The start page:** no privacy line under Play; a **«How to play»** button instead (a short card now; Night-like cards later). The privacy line
  moves into that card (hard rule #33 keeps a privacy notice reachable from the start).

## Open questions for the founder
- None blocking. Next: LIGHT-3 (the controls when the hands leave, the menus).

## How a new session picks this up
Read `CLAUDE.md` → `HANDOFF.md` (the LIGHT row) → `docs/light/HANDOFF.md` (state, next step) → this plan (every decision with its date) →
`docs/light/WORK-LOG.md` (what each run changed, its checks). The drawings: `tools/.out/light-ui/index.html` (a working file, git-ignored — the
decisions they led to are written here in words).

## Light on its own — measured at LIGHT-3 (2026-11-27; the founder: «only what it really has, nothing hidden, nothing unused loaded»)
- Today the skeleton boots through the shared legacy UI (`core/legacy-ui/`, Full's menus and drawing) over Full's markup kept hidden: **102
  modules, 2.1 MB of source**; 573 KB of it is that UI alone. The build copies the whole `core/` folder (`tools/build.mjs copyTree('core')`).
- The engine alone (audio, vision, gestures, scales, profile, i18n, icons): 85 modules, 1.55 MB — of which ≈ 0.6 MB is Full-only code it still
  imports at load (the recorder, songs, arrangement, track freezing, the backing: `core/recorder.js`, `arrange.js`, `clip.js`, `core/song/*`,
  `core/live/*`, `core/freeze/*`; `i18n.js` carries every app's strings) — the same debt Night has (`core/DEBT.md`).
- Proposed (awaits the founder's yes), three layers: (1) Light's own start, frame loop and drawing (its note field with names mid-band, its
  hands) — no Full markup, no legacy UI; app work only; (2) the build ships only the files Light's import graph reaches; (3) the engine stops
  importing Full-only code at load (split the recorder from the engine; dictionaries per app) — CORE runs that touch Full's and Night's engine,
  so each with both apps' full checks.
- **One axis per effect — proved** (row «LIGHT face and bars»): in the live chain each effect has at most one driven value; effects fingers only
  on y; the playing hand only Volume (x) and reverb (z). CONTROL: Full's three-axis reverb is refused.
- **Copy the core and strip it?** (the founder asked.) Measured instead: the CLEAN parts of core — the sound engine, timbres, effects, scales, the
  camera and hand model, state, the pure laws — are 49 modules, 817 KB, and import nothing of Full's recorder, songs, arrangement or menus. What
  ties Light to Full's code is the gesture layer (`core/gestures/hands.js`, `roles.js`, `looper.js` import the recorder) and the legacy UI.
  Proposed (awaits the founder's yes) — **option B**: Light imports only those clean parts, unchanged, and writes its own small start, drawing and
  solo + effects-hand gestures (reusing the clean gesture pieces: `gestures/features.js`, `gestures/fxhand.js`). No core change → no shared full
  checks; Full and Night untouched; fixes to the sound and the hand model reach Light by themselves. Option A (a copied core) would give the same
  size but two engines drifting apart, every fix made twice, and the same untangling work inside the copy.

## Decided after trying LIGHT-3b (the founder, 2026-11-27)
- **The hands:** points without connecting lines; the fingertips larger (as in Full and Night); EVERY sounding finger lights (several notes per
  hand), with the thumb — not only the first pinched.
- **The note names back at the left edge** (mid-band tried and dropped); the effects bars may lie over them.
- **The four bottom buttons in one shared frame**, as the bars share theirs.

## Decided after trying LIGHT-5 (the founder, 2026-11-27)
- **The bars in the clip too:** each recorded frame is the canvas plus the bar sets as the page shows them (`clip.js paintBars`); the live screen
  untouched; the controls and the clip button stay out of the clip.
- **The teaching cards, as in Night:** five cards (play, volume and reverb, effects, the buttons, the clip with the privacy line), from «How to play»
  and once after the first start, before the hand-setup offer.
- **The emblem's dot flares on Play** and settles back (from Night, without the flight).

## Decided after trying LIGHT-6 (the founder, 2026-11-27)
- **Theremin lines:** when either hand plays the theremin, a line through each note's place shows where the pitch is exactly that note (Full's
  system: `thereminSpan`); the line a theremin hand is on lights.
- **Each playing hand its own reverb:** the left hand's notes go through the engine's second solo head with its own reverb (and the mirrored delay);
  each hand's depth moves only its own reverb; the REV bar shows the playing hand's.
- **The sounding band outlined in both field views** (1 note a band too).
- **The cards' hand redrawn** (a clean pictogram) and **the cards opaque** (the start no longer shows through).
- **The cards' Russian texts** to be edited by the founder first, then translated.

## Decided (the founder, 2026-11-27, after LIGHT-6b)
- **Two REV bars when both hands play notes**, each at its own hand's side with its own reverb (the effects set cannot show then).
- **The theremin in the 4-notes view lights the note it is nearest**, not the band's note under the finger (the drawing only; the sound was right).
- **The volume by hand:** only the right hand plays — as before (quiet at the left edge, loud at the right); only the left — mirrored (loud at the
  left edge); both play — the right loudest at the right edge, the left at the left, both silent toward the centre.
- **The cards' texts** in the founder's Russian wording; the other seven languages translated from it.

## Decided (the founder, 2026-11-27, after LIGHT-6c)
- **A timbre for each hand — later, when there are more timbres** (10–15). The timbre sheet then shows two columns (left / right) only while both
  hands play notes; with one playing hand it stays one list. Not now: with one timbre it would add a choice that does nothing.
