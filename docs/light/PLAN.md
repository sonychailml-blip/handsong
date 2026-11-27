# Handsong Light — the plan (LIGHT-0, 2026-11-27)

The founder's idea (2026-11-27): the simplest possible Handsong, released soon, while Full and Night keep growing. Code id `light`, folder
`apps/light/`, track `LIGHT-n`, address later https://light.handsong.app plus a card on handsong.app.

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
- **LIGHT-7** — publish: a Vercel project (the founder creates it), light.handsong.app, the card on handsong.app (SITE run).
- Then: more timbres (10–15), one at a time by ear.

## Open questions for the founder
1. Scales: all 38 12-note ones, or a shorter list?
2. The first timbre: which of the 2–3 candidates (by ear).
3. The controls' design (LIGHT-1).
4. The name on the start page and the site: «Handsong Light»?
