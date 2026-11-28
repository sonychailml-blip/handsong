# WORK-LOG — LIGHT track

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`; `apps/light`
once it exists).

# LIGHT-0 (LIGHT track, 2026-11-27): the plan
Tree hashes before and after: core cfe3a3d190bef9ae · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (docs only).
- The founder's idea and decisions (chat, 2026-11-27): a separate simplest app; solo, 12-note equal temperament; depth → reverb; fixed effect
  fingers (delay, vibrato, tremolo, brightness) on the vertical; controls when the hands leave (scale, timbre, key + A4, one hands menu
  with functions, octaves and the field view, camera switch, sensitivity) + a clip button apart; no settings button; a start page; clips
  with the camera picture, recorded as Full records (`core/clip.js`) but saved as MP4; only Night's clip interface taken; no shared UI
  with Night; one timbre first; Full and Night must not change.
- Checked in the code: the profile already narrows modes, timbres and effects by list (`core/pure/profile.js`, Night's `night.json`);
  38 `edo12` modes, 30 solo timbres; effects are `FX_FACTORY` blocks driven through chain entries (`state.fxChains`); Full's clip
  recorder prefers WebM (`core/clip.js` candidates). Expected core runs: profile id + shell (pure), clip MP4 option — both opt-in.
- Written: `docs/light/PLAN.md`, `docs/light/HANDOFF.md`, this log; the index `HANDOFF.md` (the LIGHT row); `CLAUDE.md` (one line: the track);
  `docs/ROADMAP.md` (one line).
- Decided after the plan (the founder, same day): scales = Full's «Familiar» section (`menu.tradition` `common`, 31 modes, all `edo12`);
  timbre = Full's default solo timbre only (`solo.supersaw`, `leadIdx` 0). `PLAN.md` «Decided after LIGHT-0».
- Name (the founder, same day): plain «Handsong», address play.handsong.app; Full becomes «Handsong Studio» at its own release; code id stays `light`.

# LIGHT-1 (LIGHT track, 2026-11-27): the drawings
Tree hashes before and after: core cfe3a3d190bef9ae · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (a working drawing + docs only).
- `tools/.out/light-ui/index.html` (git-ignored): the play screen (phone, laptop, hands swapped, 1 note a cell), three control designs
  (A dock, B key on top + round buttons, C tiles card), the pop-ups (hands, sensitivity, key + A4, scale), the hand setup, the start page.
- The founder: variant B; the look, fonts and start page liked; two sensitivity sliders and Night's hand setup; bars vertical, over the
  field, following their hands; 3-letter English labels; asked about the app mark: the brand emblem (as Night and the site) with Light's colour proposed. Second version of
  the page drawn accordingly (A and C removed). `PLAN.md` «Decided at LIGHT-1».

# LIGHT-2 (LIGHT track, 2026-11-27): the skeleton
Tree hashes before: core cfe3a3d190bef9ae · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (apps/light did not exist). After: core 5fb17bed147d3b99
(CORE-30) · apps/full and apps/night unchanged · apps/light 8147ecbf6864a818.
- `apps/light/`: `index.html` (Full's markup — the shared UI reads its ids — with Light's head: store «light», profile, probes link, `light.css`, the
  same CSP line; Light's start card; Full's start extras kept hidden), `main.js` (`boot({ profile:'profile.light', handFiles:'own' })`), `texts.js`
  (4 strings × 8 languages), `light.css` (tokens `--light-*`; `--night-accent` defined for core/icons.js), `data/light.json`, `manifest.json`, `sw.js`
  (Full's, no cache), `fonts/` (Inter, Literata 300 — copies, register entries extended), `icons/` (Full's for now).
- Core: CORE-30 (`docs/core/WORK-LOG.md`). Tools: `probe-browser.mjs --app light` (entry, no seed, Light's storage census: its namespace, the device
  facts and the core's READ of «handsong.nightBg» — the row proves it is never written), `tools/probes/light.js` + `light/start.js` (row «LIGHT start
  and profile»: the profile, mood, key, timbre, hands, the chain exactly, Full's bar hidden, the emblem drawn, the namespace; CONTROL Full's chain),
  `check-static.mjs` (the third app in the boundaries, pages, CSP and tokens; CONTROL its CSP), `check-licences.mjs` (Light's shipped texts),
  `probe-data.mjs` (Light's record in «C0 profile records»), `smoke-paths.mjs` (Light's page from the root and a sub-folder).
- Checks (iteration mode; the founder waived the full suites): static PASSED; `--app light`: P.light PASS 1/0, CSP, network, storage PASS; smoke
  `--only light@/,light@/some/sub/` 0 of 2 failed; Full page FULL untouched 9/0 + profile round trip 13/0; Night page NIGHT untouched 9/0.

# LIGHT-3a (LIGHT track, 2026-11-27): Light on its own, the bars, «How to play»
Tree hashes before (LIGHT-2's after): core 5fb17bed147d3b99 · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e · apps/light 8147ecbf6864a818. After: core
c73730c7ab6c850a (only `core/engine/surface.js`, the static check's list, and CORE-30's comment renumbering) · apps/full and apps/night unchanged · apps/light bdfa284300e36c3f.
- The founder: Light must hold only what it has (nothing hidden, nothing unused loaded); option B chosen over copying the core (measured: the clean core
  parts are 49 modules / 817 KB with none of Full's code; the gesture layer and the legacy UI were what tied Light to Full).
- `apps/light/`: `boot.js`, `gestures.js` (a cut copy of `core/gestures/hands.js` + `roles.js`), `engine.js`, `draw.js`, `scalepick.js`; `shell.js` rewritten (fed
  by the loop); `index.html` only Light's elements; `light.css` stands alone; `main.js`. The profile is applied through Light's own doors (`profileWire`).
- One axis per effect (the founder): Light's chain always had one driven value per effect; the three bars were Full's drawing unfolding the delay.
- Tools: check-static (17) Light on its own + page ids by reach; probe-browser (Light: no renderer, no auto-freeze code loaded); smoke-paths (Light's
  own frame check, and no legacy UI / recorder / other app requested); the probe facade with its own lock; rows «LIGHT on its own», «LIGHT start and
  profile», «LIGHT bars and one axis», «LIGHT hands = core hands» (CONTROL: sensitivity 1.5 → 82 lines differ).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light`: 4 rows PASS, CSP, network (155 requests), storage PASS; smoke
  `--only light@/,light@/some/sub/` 0 of 2 failed; licences PASS; name index PASS. Full and Night untouched (their trees unchanged).

# LIGHT-3b (LIGHT track, 2026-11-27): the reverb, the controls and the menus
Tree hashes before (LIGHT-3a's after): core c73730c7ab6c850a · apps/light bdfa284300e36c3f. After: core 4dd86761f57ed46c (only `core/engine/surface.js`: the
static check's list) · apps/full 0148bb454440c3e3 and apps/night 30d8f7b3c797de9e unchanged · apps/light 35345e9e9bd220b3.
- The reverb (the founder: «barely grows»): `REV_PARAMS` are decay, tone, mix — the profile drove params[0] (the TAIL) with the mix left at its 0.25.
  Now `{fixed v01 0.7 (≈ 1.84 s), fixed tone, drive play z → the mix 0…0.85}`; the REV bar shows the driven value (`shell.js drivenIndex`). Data row
  C0 checks it (mix on the depth, a long fixed tail).
- `apps/light/controls.js` (new): variant B and the sheets; `icons.js` (timbre, hands, camera-flip, sliders, chevrons — our drawings, through
  `svgIconAdd`); `gestures.js`: each hand's octave shift (whole periods, `periodOf` — rule #2) and the hand travel (the depth range × 2^v); `boot.js`
  `onLightStart`; texts: 26 keys × 8 languages; `light.css` the controls and sheets; the choices kept under `handsong.light.lightPrefs`.
- Row «LIGHT controls and menus» (shown with no hand; each sheet's content; each change reaches the state and the labels; A4 clamped; CONTROL a maqam
  refused; the octave range moves by one octave; everything put back). «LIGHT hands = core hands» still 108 equal calls (shift 0 and travel 1 =
  core's arithmetic).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 5 rows PASS, CSP, network, storage PASS; smoke `--only light@/` PASS;
  licences PASS; name index PASS.

# LIGHT-3c (LIGHT track, 2026-11-27): the hands' look, the names left, one frame for the buttons
- The founder after trying LIGHT-3b: no lines between the hand's points; fingertips larger; every sounding finger lit; the note names back at the
  left edge; the four bottom buttons in one frame. `apps/light/draw.js` (rewritten: `litFingers`, `LEFT`), `light.css` (`.light-rounds` framed;
  the bone colour token gone). Row «LIGHT bars and one axis» checks `litFingers` (two sounding fingers → both; the effects hand → its finger; no
  pinch → none). Checks: static PASSED; `--app light` 5 rows PASS, CSP, network, storage PASS. apps/full and apps/night unchanged.

# LIGHT-4 (LIGHT track, 2026-11-27): the hand setup
Tree hashes after: core e34f701f04d5c046 (only `core/engine/surface.js`, the static check's list) · apps/full 0148bb454440c3e3 and apps/night
30d8f7b3c797de9e unchanged · apps/light 06eafa82b559024e.
- `apps/light/calib.js` (new): the routine (`createCalRun`, farHold) fed the camera's frames while it runs (`boot.js`; the hands get none, so held notes
  close), the record `{camera key: {near, noise}}` under `handsong.light.lightHand`, the calibrated law per hand (one filter step a frame on `S.cal`,
  the hold band, `calDepth` with `calFarBase`), the travel slider (s = 2^−v, never below `CAL.depthMin`); the screens offer / measure (a dashed frame,
  one line, the progress) / done / failed; offered once (`handsong.light.lightHandOffered`). `gestures.js setLightDepthLaw` (null = the plain law:
  «hands = core hands» unchanged). `controls.js`: the setup line in the sensitivity sheet; a camera flip applies that camera's setup. Texts 18 keys × 8.
- Row «LIGHT hand setup»: offered once; a moving hand is refused (CONTROL); a still one ends «done» (near 0.285); the mix ≈ 0 at the near point,
  0.859 at half the size, 0.749 with the long travel; the person's kept setup put back. Core's pose marks its hands synthetic (the routine refuses
  them); the row feeds a plain copy of the points on purpose.
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 6 rows PASS, CSP, network, storage PASS; smoke on Light PASS;
  licences PASS; name index PASS.

# LIGHT-5 (LIGHT track, 2026-11-27): the clip
Tree hashes after: core f685c1fe10916012 (only `core/engine/surface.js`, the static check's list) · apps/full 0148bb454440c3e3 and apps/night
30d8f7b3c797de9e unchanged · apps/light 527c7b87e788512b.
- `apps/light/clip.js` (new): Full's way of recording (canvas `captureStream(0)` + `requestFrame` from Light's loop after drawing, capped at 30 fps;
  `createRecordingTap`; Full's bitrate law) with the format order MP4 → WebM; Night's interface (button, countdown ring and number, the seconds and
  the minute ring, the card with its sound — `outputFade` 0 while open, 1 after —, the speaker toggle, Share where the browser shares files, saved to
  Downloads at once, iPhone through the share sheet, hidden page → stop and keep, the hint after 2 minutes once). Markup, styles, 4 icons, 12 keys × 8.
  `core/clip.js` stays Full's (static check (17) still forbids it for Light). The network guard lists its one share call.
- Row «LIGHT clip»: MP4 ahead of WebM (CONTROL a WebM-first list fails); a real 1.5 s recording in the runner's Chrome: 85 061 bytes,
  `video/mp4; avc1 + mp4a`; the card open with the live sound at 0 and back at 1 after; the button shown with the controls.
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 7 rows PASS, CSP, network, storage PASS; smoke on Light from the root
  and a sub-folder PASS; licences PASS; name index PASS.

# LIGHT-5b + LIGHT-6 (LIGHT track, 2026-11-27): the bars in the clip, the cards, the flare; the names, messages and icons
Tree hashes after: core f685c1fe10916012 (unchanged since LIGHT-5) · apps/full 0148bb454440c3e3 and apps/night 30d8f7b3c797de9e unchanged · apps/light 16ee91e9874e6ef2.
- `clip.js`: a composing canvas per recording (the canvas + `paintBars`: each shown set's glass box, tracks, fills, the glow of the finger in use,
  the labels — read from the page, scaled; a set's fade is its opacity); `shell.js lightShellPokeDbg` (probe). `cards.js` (new) with five pictures
  (our own line drawings, the hand as Night's cards draw it), markup replaces the short card; first start: cards → hand-setup offer. `boot.js flare`
  + CSS `lightFlare` (a still version under reduced motion).
- LIGHT-6: `modenames.js` (31 modes + 8 groups × es, pt, de, fr, it, ka; Georgian awaits a native check) used by the scale label and sheet; texts:
  cards 14 keys, start messages 8 keys × 8 languages; `tools/light-icons.mjs` (new) draws `apps/light/icons/*` (rounded 192 / 512, maskable 512) —
  register entry `light-app-icons` (the Full / Night entry no longer lists Light's files).
- Rows: «LIGHT cards, flare, bars in the clip» (5 cards filled, the privacy line on the last; the flare's animation; 30 279 px painted for a shown
  set, 0 for a hidden one — CONTROL); «LIGHT eight languages» (88 keys × 8, the start messages, the page's keys, 31 modes and their groups in the six
  languages — CONTROL a maqam has none —, «Mayor (jónico)» in the Spanish sheet).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 9 rows PASS, CSP, network, storage PASS; smoke on Light PASS;
  licences PASS; name index PASS.

# LIGHT-6b (LIGHT track, 2026-11-27): theremin lines, a reverb per hand, outlines, the cards' hand
Tree hashes after: core 44ed0dd238a68bfb (only `core/engine/surface.js`) · apps/full 0148bb454440c3e3 and apps/night 30d8f7b3c797de9e unchanged · apps/light 2cb43ab8a5a170d6.
- `draw.js`: `thereminLines` (core `thereminSpan`; tonic lines amber-tinted, the theremin hand's line lit) and the sounding row outlined in the
  rows view. `gestures.js`: a reverb per hand — `setTrackRouteOf` sends the left hand's voices («lead:L…») to the engine's second solo head (its
  «track» head: Light has no tracks), each hand's depth writes its own chain (the entries read from the live chain), `lightMirrorFx` copies the other
  values (the delay) each frame; `setLightPerHandReverb(false)` = core's one reverb (the comparison row runs that way). `boot.js lightTrackChain`
  builds the second chain's bus effects with their fixed values. `shell.js`: REV shows the playing hand's chain. `cards.js`: a pictogram hand;
  `light.css`: opaque cards.
- Row «LIGHT each hand its own reverb»: the router (L → second head, R → live); left near / right far → live 0.82, second 0.00, swapped → 0.00 /
  0.82; the delay mirrored; off → the left hand live (CONTROL: alone, it moves the live mix, 0.82).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 10 rows PASS, CSP, network, storage PASS; smoke on Light PASS;
  licences PASS; name index PASS.

# LIGHT-6c (LIGHT track, 2026-11-27): two REV bars, the theremin's lit note, the volume by hand, the cards' words
Tree hashes after: core 44ed0dd238a68bfb (unchanged) · apps/full 0148bb454440c3e3 and apps/night 30d8f7b3c797de9e unchanged · apps/light bb3b5e6cbb4e1a9d.
- `index.html` + `shell.js`: `#lightRevBar2` — the second playing hand's REV at its own side (never the first's edge), its own chain's mix.
- `draw.js`: a theremin hand lights its own nearest slot (core's theremin law `slot`), not the band's finger slot (the payload stays core's).
- `gestures.js volX` + `setLightMirrorVolume` (off = core's law; the comparison row runs off): the volume by hand as decided.
- `texts.js`: the cards' 5 texts in the founder's Russian, translated to the seven other languages.
- Rows: «LIGHT bars and one axis» + two playing hands → two REV bars on opposite sides (CONTROL one playing hand → one); «LIGHT each hand its own
  reverb and volume» + the volume law (both 0.8 at their edges, 0 at the centre; the left alone mirrored; off → the plain law, CONTROL).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 10 rows PASS, CSP, network, storage PASS; smoke on Light PASS;
  licences PASS; name index PASS.

# LIGHT-7 (LIGHT track, 2026-11-27): the build
- `tools/build.mjs`: `HANDSONG_APP=light`; a Light production tree keeps of `core/` only what its page reaches (+ `core/data/`, `core/vendor/`,
  `core/engine/worklets/`, the hand worker), walks again (a missing load fails the build), refuses a tree holding the legacy UI or the recorder;
  production holds no other app. Light production: 265 files, 30.5 MB (55 unused core files left out; the hand model and its library are most of it).
  Full and Night build as before. `tools/smoke-paths.mjs --build`: Light's production (root and a sub-folder) and preview, `?probe` gate.
- Checks before the first publish (Level 4 for Light): `node tools/smoke-paths.mjs --build` PASS — every target loaded, the control caught (Full,
  Night and Light trees; Light's production from the root and a sub-folder, its preview, the `?probe` gate: production loads nothing, the preview has
  `window.P`); static PASSED; probe-data PASS 109/0; `--app light` 10 rows PASS (LIGHT-6c). Tree hashes: core 44ed0dd238a68bfb · apps/full
  0148bb454440c3e3 · apps/night 30d8f7b3c797de9e · apps/light bb3b5e6cbb4e1a9d. Vercel: project `handsong-light` created by the founder, the domain
  play.handsong.app added (its Cloudflare CNAME pending), the production branch `light-release` set once the branch exists.
- Published 2026-11-27: `light-release` created by the founder; Vercel did not build it (the same commit was built as a `dev` preview) — started
  by Deployments → Create Deployment. play.handsong.app (CNAME to the project's own Vercel target) serves Light's production.

# LIGHT-8 (LIGHT track, 2026-11-27): full screen
Tree hashes after: core 44ed0dd238a68bfb · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (all unchanged) · apps/light 81b81bfc58a0d9b3.
- `apps/light/fullscreen.js` (new; Night's law, its own copy — apps never import each other): the Play tap asks for full screen when the camera
  is already granted; otherwise once the camera runs while the tap still counts, else on the next tap (twice at most); Android tries a landscape
  lock; nothing asked on iPhone Safari or from the home screen. `boot.js` calls it in the Play / Try again taps, after the camera, at the start.
- `#lightFsBtn` in `#lightCtl` (top left, the clip button's twin; shown and hidden with the controls), drawn icons `fs-enter` / `fs-exit` (Night's
  bracket drawing), words `light.fs.enter/exit` in 8 languages; `controls.js fsRender` shows the state; hidden where full screen cannot be had.
- Row «LIGHT controls and menus» + the toggle: in the controls, hidden exactly where full screen cannot be had, icon and words follow the state.
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 10 rows PASS, CSP, network, storage PASS; smoke-paths PASS;
  name index PASS.

# LIGHT-9 (LIGHT track, 2026-11-27): the bottom band on Android, the language, the first minute, the iPhone card, the clip's mark, «Write to us»
Tree hashes after: core 44ed0dd238a68bfb · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (all unchanged) · apps/light f5dfb3c5143e4e10.
- The bottom band under Android's system buttons (the founder's phone, browser not full screen): `#canvas` was 100vh tall — on Android Chrome the
  height WITHOUT the address bar, taller than the visible page — while its buffer was innerHeight, so the drawing was stretched and its bottom cut.
  Now `height:100dvh` minus an edge-to-edge bottom inset, `boot.js lightFit` sizes the buffer from the laid-out box (after core's resize), the
  round buttons and the sheet sit above the bottom inset, the clip maps the bars by the canvas's own box.
- `lang.js` (new): the start card's language picker (the eight endonyms, core `setLang`); the controls and an open sheet redraw on a change.
- The first minute: the hand-setup offer no longer comes at the first start — after about a minute of playing, once the hands leave and no card,
  sheet or clip is open (`calib.js lightCalOfferTick`, `CAL_OFFER`); the cards stay (Skip on each).
- iPhone Safari (no full screen, not from the home screen): a sixth card «Full screen on iPhone» — Share → Add to Home Screen, with its drawing.
- The clip carries «handsong.app» bottom right (`clip.js paintMark`, white with the amber dot, sized to the frame).
- «Write to us» on the start card: the feedback form (register entry `link-feedback-form`, a link the person opens).
- Rows: «LIGHT hand setup» + the offer's timing (not before a minute, not while the hands are in view; CONTROL: not while something is open);
  «LIGHT cards, flare, bars in the clip» + the iPhone card (5 / 6 cards, the dots follow) and the mark (pixels bottom right only); «LIGHT eight
  languages» + the picker (eight languages; choosing Russian, then German, switches Play's words and the controls).
- Checks (iteration mode): static PASSED; probe-data PASS 109/0; `--app light` 10 rows PASS, CSP, network, storage PASS; smoke `--only` Light at
  `/` and `/apps/light/` ok; licences PASS; name index PASS.

# LIGHT-9b (LIGHT track, 2026-11-27): full screen turns freely, the corner button stays, the language pill
Tree hashes after: core 44ed0dd238a68bfb · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (all unchanged) · apps/light 9a5883b463733a7c.
- The founder's phone: full screen locked the phone to landscape — the lock is gone (both orientations).
- The corner button vanished while full screen and for a moment after leaving: Chrome matches «display-mode: fullscreen» while the PAGE is full
  screen through the API, and `fsStandalone` took that for a home-screen app. Now it counts only when not full through the API; the button is read
  afresh each time the controls show and once more 300 ms after a change. ⚠ Night's `apps/night/fullscreen.js` has the same test (not fixed here:
  outside the track).
- The language pill: the shown name in its own span, the native picker invisible over it — the pill fits the name (it was as wide as the longest).
- Row «LIGHT eight languages» + the pill shows the chosen name. Checks: static PASSED; probe-data PASS 109/0; `--app light` PASS; smoke Light ok.

# LIGHT-9c (LIGHT track, 2026-11-27): one full-screen icon
- The founder: the «leave full screen» icon (four corners pointing in) reads as a swastika — the toggle now shows the same outward corners both ways
  (its words and aria-pressed still tell the state); `fs-exit` removed from Light's icons. ⚠ Night's `fs-exit` is the same drawing (not changed here).
- Row «LIGHT controls and menus»: the one icon. Checks: static PASSED; `--app light` PASS; licences PASS. core, apps/full, apps/night unchanged.

# LIGHT-10 (LIGHT track, 2026-11-27): offline
Tree hashes after: core 44ed0dd238a68bfb · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (all unchanged) · apps/light 407585e5809c725a.
- Before: Light registered no service worker at all (it loads no legacy UI, which registers Full's) — neither installable nor offline.
- `apps/light/sw.js`: Night's precache law, Light's own copy (cache «handsong-light-precache-<version>»; install checked by hash, an update copies
  what did not change, a new version waits; top-up; the page and listed files from the cache). `tools/build.mjs` writes the list (263 files,
  20.1 MB cached with this browser's MediaPipe build; the icons later).
- `apps/light/update.js`: the worker is registered only AFTER Play on a first visit (the founder: in the background once playing), at once when
  already installed; «A new version is ready — tap to update» at the top of the start screen, in play a pill for 20 s (8 languages).
- Rows: smoke «Light offline (LIGHT-10)» (`--build`, and `--light-precache` alone): no worker before Play; after it every wanted file cached with its
  hash, nothing outside, the start covered; offline second visit plays to a shown frame (CONTROL: without the worker offline fails) — PASS at the
  first run. «LIGHT start and profile» + the worker registered once after the start.
- Not tested by a run: the «new version» line with a real second version (Night's tested logic, copied).
- `node tools/smoke-paths.mjs --build` PASS (every target loaded, control caught; Light offline PASS).

# LIGHT-11 (LIGHT track, 2026-11-28): fourteen timbres, one per hand
Tree hashes after: core a4dd71426b6a4c32 (only `core/engine/surface.js`, the static check's list of engine calls — data, no behaviour) · apps/full
0148bb454440c3e3 · apps/night 30d8f7b3c797de9e (unchanged) · apps/light 1cb1d4a1978611a1.
- `apps/light/timbres.js` (new): 14 timbres in six groups (lead, keys, winds, strings, bass, more), named in 8 languages. Eight are core's built-in
  solo records (the profile's list: SuperSaw, electric piano «Firefly», organ, flute, reed, guitar, kalimba, warm pad); six are LIGHT'S OWN records
  (soft lead, brass, strings — breath engine; round bass, synth bass — subtractive; plucked bass — Karplus–Strong), pack ids «light/…», installed
  for the session through core's existing door `audio.timbreInstall` (as Night's rain room) — no core change, never in Full's lists; all pass core's
  bounds (the heaviest, brass, 38 nodes of 64).
- Levels: measured in the probe browser (`--eval`, the heard output, after a warm-up note) and set by `audio.setTimbreTrim` toward SuperSaw —
  tools/.out/light11-levels.txt. Found while measuring: with formants the breath engine sends the whole sound through them (no dry path), so narrow
  weak formants silenced strings (−63 dB) and brass (−41) — widened.
- A timbre per hand: when both hands play notes the sound sheet shows two columns (left / right); with one playing hand one list. Each hand's
  notes carry its timbre (`gestures.js setLightInstOf`); the live solo timbre follows the playing hand (the right one when both). A bass takes the
  hand an octave lower (a hand whose octave the person moved keeps it). Kept per hand on this device (an older single choice: both hands).
- Row «LIGHT timbres»: 14 to pick, the six installed, every name in 8 languages, one list / two columns, per hand left brass 35 / right organ 1
  (CONTROL: without the door both carry 1), the bass octave. C0 data row: eight built-in solo timbres, Full's default first.
- Checks: static PASSED; probe-data PASS 109/0; `--app light` 11 rows PASS, CSP, network, storage PASS; smoke Light ok; licences PASS.
- To hear: every timbre on a phone (levels by ear), the first note of the guitar once in the first measuring run came out near silent (not seen again).

# LIGHT-12 (LIGHT track, 2026-11-28): the latency lab
Tree hashes before and after: core a4dd71426b6a4c32 · apps/full 0148bb454440c3e3 · apps/night 30d8f7b3c797de9e · apps/light 1cb1d4a1978611a1 (unchanged; tools only).
- The founder: a small lab, independent of the app, with the simplest, lightest sound path, to learn how far the delay from a hand gesture to
  the sound can be cut on this computer; if it comes out about as long as in Handsong, the limit is the computer, not the app.
- `tools/lab/latency/index.html` + `lab.js`: camera 320×240 at 60 fps (or 640×480 / 30, by the address), each new frame
  (requestVideoFrameCallback) straight into ONE MediaPipe hand model (our own copy, `core/handdet.js mpFilesOf('own')`) on the video element —
  no snapshot, worker or search schedule; GPU or CPU; numHands 2 (clap) or 1 (strike). A gesture starts a prepared 4 ms chirp straight into the
  speakers (no effects, no limiter); the context at latencyHint 0 or «interactive» (Handsong's).
- The measure (`analyse.js`, pure): the microphone (same audio clock, echo cancelling, noise suppression and gain control off; `tap-worklet.js`;
  the last 4 s in memory, never sent or kept) hears the real clap and then the click; the click is found by normalised correlation AND loudness over
  the floor (noise alone reaches a likeness ≈ 0.3), the clap as the loudest burst in the 800 ms before it, at its first strong sample. Shown per
  measurement: total, the frame camera → page (captureTime), recognition, sound to the speaker (baseLatency + outputLatency), the rest (half a
  frame on average, exposure and transfer inside the camera, the driver). «Sound check» plays the click alone. «Copy results» gives a text.
- Gestures: clap fires once when the palm centres come within 0.9 hand sizes, or when one of two hands closer than 2.5 vanishes (MediaPipe often
  loses a hand at contact — the founder's worry); armed again past 2.0. Strike: the hand's lowest point within 3 % of the frame of its rest place
  (measured once by «Hand at the strike place»), armed again 12 % above it.
- Check `node tools/lab/latency/check.mjs` (`--pure`: node only): 11 measurement and gesture checks with controls (no click, loud noise without a
  click, no clap → refused; the click 10 ms later → +10 ms; a lost hand far away does not fire) and the page in a fresh headless Chrome with the
  fake camera and microphone (ready, frames recognised, microphone blocks, a forced gesture gives a row; no console error, CSP violation or
  request off our server). PASS 15. Headless numbers mean nothing (fake camera, no speakers): the founder's laptop decides.
- Not done: the same measure inside Light (a clap under `?lab` played through Light's own sound path) — after the first numbers.
- LIGHT-12b (same day, after the founder's first run: 22 claps, 17 unmeasured, the others 737–800 ms): the 4 ms click was too weak on the laptop
  speakers (likeness 0.12–0.38) and the «800.0 ms» rows were the window's edge, not a clap. Now a 20 ms chirp 1–5 kHz at 0.95 (noise alone: likeness
  0.12), the click searched over 600 ms, a clap cut by the window's start refused («edge»); new checks: a slow microphone (round trip 250 ms, the
  clap inside the click's span) still reads 137 ms; CONTROL the edge refused. The page shows the camera's own frame rate beside the recognised one;
  the copied text carries the sound check and, per miss, likeness, loudness and round trip. `[lab-check] PASS — 17 checks`.
  Already seen in that run: recognition with two hands 78–114 ms per frame (35 ms with none), the camera at 320×240 gives at most 30 fps (asked 60),
  sound out 51 ms (Chrome reports base 10 + output 41).
- LIGHT-12c (the founder's second run, speakers on: 19 of 19 measured, median 521 ms; camera→page 20, recognition 79–114, sound out 52, the rest
  ≈ 350 ms that the page cannot time): a camera-only test, «flash» — the screen flips black/white at random 0.6–0.85 s, the camera looks at it
  (turned to it, through a mirror, or a white sheet of paper lit by the screen; the needed brightness difference 6 of 255), each flip's time to the first frame past the middle brightness (16×12 average) = screen → frame in the page
  (with the screen's own output, 20–50 ms), also split at the browser's captureTime; no hand model in that mode. Per measured clap the copy now
  carries the click → microphone round trip. `[lab-check] PASS — 18 checks` (+ the flash test runs: flips, brightness read; the fake camera sees
  no screen, so nothing is caught there — the real camera decides).
- LIGHT-12d (the founder's flash run with a white sheet: screen → frame in the page median 84 ms of 27, 67…116; to the browser's «captured» mark
  80 ms): the camera is NOT the missing ≈ 350 ms. Added «клавиша» — audio only: a firm Space press makes the key's own sound and plays the click
  at once (keydown); key sound → click = the real sound path (+ a little keyboard). With the clap numbers it splits the rest into sound vs the
  hand model's lag in a fast clap. `[lab-check] PASS — 19 checks`.
- LIGHT-12e (the founder's key run: 24 measured; the clean presses 71–87 ms, median ≈ 76; the click → microphone loop 98 ms; outliers 690–790 ms
  came with fast pressing — the previous press was the loudest sound in the 800 ms window, and presses during the 0.7 s analysis were dropped):
  the gesture is searched only after the previous click heard (row: an earlier, louder gesture 300 ms before reads 137, CONTROL from the window
  start 437); a gesture during the analysis now says «too often» in words. Results so far on the founder's laptop: sound ≈ 55–65 ms real (key →
  click 76 incl. the keyboard; Chrome's 52 holds), camera 84 ms screen → page (incl. the screen), recognition 35–45 ms (no / one hand) and
  79–114 (two) — a floor ≈ 200 ms; the clap's 521 ms ⇒ ≈ 300 ms is the hand model reacting late to two hands meeting (overlap), not the camera
  or the sound. `[lab-check] PASS — 20 checks`.
- LIGHT-12f (the founder: «loudly join two fingers, as in our app — the result we need»): «щипок» — one hand, numHands 1, Handsong's own pinch
  law (core/gestures/features.js: thumb tip → the nearest finger tip over wrist → index base, raw coordinates; in below `PINCH_ON` 0.20, out above
  `PINCH_OFF` 0.25, imported from core/config.js), fires on the in edge; the fingers' audible tap is the gesture's sound. Row: Handsong's law,
  in-edge only (CONTROL 0.22–0.24 holds). `[lab-check] PASS — 21 checks`.
- LIGHT-12g (the founder's pinch run: the fingers' soft touch not heard; the «loop» column read 218–252 ms against the known 98 — the click's echo
  was taken for the click and the click for the gesture): the sound check runs by itself at the start (three clicks; heard ≥ 2 of 3 within 10 ms
  ⇒ the click → microphone time R.rt), and every measurement then looks for the click only within ±15 ms of it (row: a louder echo 120 ms later —
  137 ms with the round trip, CONTROL 257 without). The pinch hint asks for a nail-on-nail tick. `[lab-check] PASS — 23 checks`.
- LIGHT-12h (the founder's pinch run, nail tick: 32 of 33 measured, median 99 ms, 22…169; the start check heard 3 of 3 but one at ≈ 232 ms — the
  click arrives twice on that laptop, a second copy ≈ 120–170 ms later): the sound check takes the earliest arrival two of three agree on within
  10 ms. Reading: Handsong's pinch fires at thumb–finger 0.20 of the palm (≈ 1.5–2 cm before the nails meet), so «contact → sound» = the path
  (camera ≈ 60, recognition ≈ 41, sound ≈ 55, a frame's wait) MINUS the time the fingers take over the last centimetres — hence 22–169 by speed,
  median ≈ 100 ms on this laptop with the shortest path. `[lab-check] PASS — 23 checks`.
- LIGHT-12i (the founder: «let's try» the same measure in Light): `?probe&lab` on Light's page loads `tools/probes/light/lab.js` (the probe facade
  imports it only with `lab`; production has no probes): a panel (start / sound check / reset / copy); each time Light's note adapter starts a note
  (`lightNoteTapSet`, the call the hands make) the lab's click starts in Light's own context (`AC`, the same render quantum and output as the note);
  the microphone hears the nail tick and the click. The pure measure and the microphone tap moved to `tools/probes/light/lab-analyse.js` and
  `lab-tap-worklet.js` (the static check's boundary: a probe suite imports only core, its app and its own folder); the lab page imports them
  from there. With the click's place known (±15 ms) a likeness 0.15 is enough (Light's own note sounds with it) and the floor is measured before
  the click (rows: a note as loud as the click → 137 ms; CONTROLS the note alone and no click → refused). Core: `core/engine/surface.js` lists
  the lab's `AC` (data for the static check only, as LIGHT-11). Checks: static PASSED; probe-data PASS 109/0; the lab check PASS 26; Light under
  the runner with the eval `tools/.out/light12/lab-in-light.eval.js`: the panel, the microphone, the start check and a row from a Light note —
  pass, CSP, network and storage PASS. Trees: core 18865efad8ade039 (surface data) · full 0148bb454440c3e3 · night 30d8f7b3c797de9e · light 1cb1d4a1978611a1 (unchanged).
- LIGHT-12 result (the founder, 2026-11-28, same laptop, nail-tick pinch, both with the start check held — click → microphone 106 ms in both):
  the lab's shortest path 114 ms median from contact to sound (22 of 22, 50…149); Light 138 ms (19 of 20, 93…217). So ≈ 114 ms is this laptop's
  floor (camera ≈ 60, recognition 41 at 320×240, sound ≈ 55, the frame wait, minus the pinch firing ≈ 1.5–2 cm early); Light adds ≈ 25 ms median and
  a longer tail. Candidates for Light's part: the camera at 640×480 (lab 320×240), the snapshot + worker hop before recognition, the full-screen
  drawing on the same GPU. The report now names Light's camera (core/vision.js `video`).
