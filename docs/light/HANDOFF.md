# HANDOFF — LIGHT track (shown name «Handsong», code id `light`, `apps/light/`)

The simplest Handsong: camera picture + note field, solo only, 12-note equal temperament, fixed effect fingers, controls that appear when
the hands leave, clips with the camera picture in MP4. Code id `light`; address later https://play.handsong.app. Separate from Night (no
shared UI); built on `core/` like Full and Night. ⛳ Full and Night must not change (the founder): every core need is an opt-in CORE run
with both apps' full checks.

Read: `docs/light/PLAN.md` (decisions, where each part comes from, core changes, steps, open questions), `docs/light/WORK-LOG.md`.

## State
- `LIGHT-0` (2026-11-27): the plan written; docs only, no code. Next: `LIGHT-1` — drawings of the play screen and the controls; the
  founder picks. Decided: scales = Full's «Familiar» section (31, all `edo12`); timbre = `solo.supersaw` only. Name: «Handsong» at play.handsong.app (Full
  becomes «Handsong Studio» at its release). Open: the controls' design.
- `LIGHT-1` (2026-11-27): drawings `tools/.out/light-ui/index.html` (working file); the founder chose variant B and the look; decisions in
  `PLAN.md` «Decided at LIGHT-1» (two sliders, Night's hand setup, vertical bars following the hands, 3-letter labels, the brand emblem
  with an amber centre). Next: `LIGHT-2` — the skeleton.
- `LIGHT-2` (2026-11-27): the skeleton — `apps/light/` opens in its profile (`profile.light`: the 31 «Familiar» modes, minor pentatonic first, SuperSaw,
  key A, the solo chain as data: Volume on the playing hand's horizontal, reverb on its depth, DLY / VIB / TRM / BRT on the effects hand's four
  fingers); Light's start card (emblem, wordmark, Play, privacy line; 8 languages for its own strings); the play screen is still Full's field and
  bars (Light's own controls, bars and note labels mid-band: LIGHT-3/4). Core: CORE-30 (a profile's chain as data). Tools learn `light`: the
  runner `--app light` (`P.light`), the static check, the licence register, the path check. Not yet: `tools/build.mjs` (LIGHT-7), Light's own
  icons (amber centre; it carries Full's for now), the core's start messages in the six added languages (English for now).
- `LIGHT-3a` (2026-11-27): **Light on its own** (option B): its own start, frame loop, drawing (names mid-band), hands (core's gesture
  machine cut to solo + effects hand; row «LIGHT hands = core hands»: 108 note calls equal to core's on the same synthetic hands) and note adapter (no
  recorder); the page holds only Light's elements; no shared legacy UI or its styles. Proved: static check (17) and row «LIGHT on its own» (no Full or
  Night file loaded; 67 app scripts and sheets). Bars as in Night, one per finger (DLY VIB TRM BRT, REV), shown only while used; one axis per effect
  proved. Start page: «How to play» card (privacy line inside). Next: `LIGHT-3b` — the controls when the hands leave (variant B) and their menus.
- `LIGHT-3b` (2026-11-27): the reverb fixed (the depth drove the reverb's TAIL with the mix at 25 %: now it drives the MIX 0…85 %, the tail fixed
  ≈ 1.8 s — `data/light.json`); the controls when the hands leave (variant B: key + A4 on top, the scale under it; sound, hands, camera flip,
  sensitivity) and their sheets (12 keys + A4 432/440/442 ±1 Hz; the 31 moods by group; the timbres; each hand's function and octaves «A2 – A5» with
  arrows, the field 4 / 1 notes; hand travel and effects sliders); the choices kept on this device. Next: `LIGHT-4` — Night's hand setup (the nearest
  point; the travel slider then works on the calibrated law), then `LIGHT-5` the clip.
- `LIGHT-3c` (2026-11-27): the hands as points (fingertips larger, every sounding finger lit), the names back at the left edge, the four buttons in one frame.
- `LIGHT-4` (2026-11-27): the hand setup as in Night (`apps/light/calib.js` on core's PURE laws `core/pure/handcal.js` — the routine with farHold,
  `calDepth`/`calFilter`/`calHold`; not `core/handcal.js`, which imports the recorder): offered once after the first start, «Set up again» in the
  sensitivity sheet, kept per camera on this device (numbers only); while it runs the hands play nothing; the travel slider acts on the calibrated law.
  Next: `LIGHT-5` — the clip (Full's recording made MP4 where the browser can; Night's button, countdown and card).
- `LIGHT-5` (2026-11-27): the clip (`apps/light/clip.js`): recorded the way Full records (the canvas at 0 fps with one requested frame per drawn frame,
  ≤ 30 fps; the heard sound through `createRecordingTap`) but MP4 first (H.264 + AAC; WebM only where MP4 is not offered) — Light's own module, not
  `core/clip.js` (Full's; no core change); the camera picture is in the clip (the founder); Night's interface (the button top right, 3-2-1 without
  words, the seconds and the minute ring, the card playing with its own sound while the live sound is silent, Share, saved to Downloads — iPhone:
  Save to Photos —, leaving the page stops and keeps it, the one-time hint). The bars and controls (DOM) are not in the clip. Next: `LIGHT-6` —
  the mode names in 8 languages, the core's start messages, Light's own icons; checks on the Poco and an iPhone; then `LIGHT-7` publish.
- `LIGHT-5b/6` (2026-11-27): the bars painted into the clip; the teaching cards; the emblem's flare on Play; LIGHT-6 begun: the mode and group names
  in the six added languages (`modenames.js`, kept in the app: the shared records would change Night), the start messages in all eight on Light's page
  (English and Russian now say «Play»), Light's own icons (`tools/light-icons.mjs`, amber centre). Left of LIGHT-6: the founder's checks on the Poco
  and an iPhone; a native reader for the Georgian terms. Then `LIGHT-7` — the build (`tools/build.mjs` learns light) and play.handsong.app.

## Deploy (LIGHT-7; the founder sets the project up once, as for Night)
- Vercel → Add New Project → this repository; name `handsong-light`; Framework **Other**; Root Directory: the repository root (the shared
  `vercel.json` builds with `node tools/build.mjs` into `dist/`); Environment Variable **`HANDSONG_APP=light`** (Production and Preview).
- Settings → Git → **Production Branch `light-release`** (proposed, as Night's `night-release`): the founder publishes with
  `git push origin dev:light-release`; `dev` pushes give previews (with `?probe`).
- Settings → Domains: `play.handsong.app`. Cloudflare DNS (DNS only, grey cloud): `CNAME play cname.vercel-dns.com` (or what Vercel's Domains
  page shows).
- The production tree is pruned to what Light loads (`tools/build.mjs`: the legacy UI, the recorder, songs, Night's code are not shipped).
