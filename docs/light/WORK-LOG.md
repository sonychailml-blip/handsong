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
