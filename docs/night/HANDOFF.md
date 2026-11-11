# HANDOFF — NIGHT track (`apps/night/`, Handsong Night, code id `night`)

Index: `/HANDOFF.md`. Rules: `CLAUDE.md`. Open items: `docs/night/BACKLOG.md`. Plan: `docs/night/STAGE4-NIGHT-plan.md` (its paths are as written; `docs/core/STALE-NAMES.md` maps them). Quality bar: `docs/night/QUALITY.md`. The old handoff, word for word: `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2». What in `core/` still belongs here: `core/DEBT.md`.

## Strategy (BACKLOG §7.12, §7.16)
⛳ The first public release is **Handsong Night**, right after stage 3 (user, Q1, 2026-10-14); the visual design is the user's chosen C · Hush emblem in Moonglass colours (§7.19). Proposed still: free → "Plus" → packs → "Pro". Vercel Hobby forbids selling (paid plan or other hosting first, §7.12 item 6). After it: the installation (kiosk) mode §7.18 = stage 4b.

## Deploy (user, 2026-11-02)
`handsong-night`'s Production branch is `night-release`, a stopper branch that is a copy of the old `main`. Merging `dev` into `main` does not touch Night's production. The new Night does not go public yet, and its public home (Vercel or another host) is not decided. `dev` pushes give previews, which keep `?probe`: use those for phone checks. NIGHT-7 (user, 2026-11-11): the test version for the first testers goes to `night-release` (the user pushes; Full's `main` untouched); a Vercel production build of Night is the release edition by itself.

## Where it stands
Stage 4: RUN 6 ✅ C0, VIS1a–c, listening page, design proposals · RUN 7 ✅ sound pass, C11, C6, C4b, C4c, C7, C5 · RUN 8 ✅ the user's fixes, the forest picture, C8 part (Lighter forest) · RUN 9 ✅ the living forest · SPLIT-2 ✅ its own app and name. **Next:** the user's checks below, then C8 rest (phone numbers, auto-proposal), C9 offline, C10 release, C12 release candidate. Plus the new items in the backlog. `NIGHT-8` (the forest closer to real) built, waiting for step 146. `NIGHT-1` (sound headroom) stage 1 done, waiting for the user's decision and the Poco numbers.

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

- **Step 145, music and full screen** (five checks; covers step 144's and 143's phone parts): `archive/CLAUDE-history.md`, step 145. Steps 143 (1), (3) and 144 (1)–(4) still stand on the laptop.
- **Step 146, the forest closer to real** (five checks: the two stream samples by ear, the stream in the app, the water, the ground and rocks, the Poco): `archive/CLAUDE-history.md`, step 146.
- **Step 127, the quiet floor by ear:** `http://127.0.0.1:5500/apps/night/?probe&tails=off` and `…&tails=on`; `archive/CLAUDE-history.md`.
- **The Poco headroom page, later:** `<Night preview>/?probe&headroom`, about 25 minutes (user, 2026-11-03).

## Questions for the user from RUN 9
1. Medium is the default because high costs about a third of the hand tracking. Good enough, or make high cheaper?
2. The night repeats every 24 minutes, a cloud about every 3 minutes. Right?
3. Rare moments every 2.5–5 minutes. Right, or rarer?
4. Opening the forest takes 1–3 s. Acceptable, or a gentle «waking» moment?
5. The falling star passes in front of the trees. Natural?

## Records (English, at most about 15 lines each; older ones go to `archive/HANDOFF-history.md`)
### NIGHT-8 (2026-11-11): the forest, closer to real. Log: `docs/night/WORK-LOG.md`
- The stream's murmur: synthesized, endless (`pure/brook.js`: bubble resonances in clusters over a soft rush, each voice's flow drifting; no loop), run by the nature worklet (`worklets/nature-worklet.js`) in the nature sound under the Room-sounds slider; six voices along the water from its path (near: wide, bright, close; far: narrow, dark). Measured 5.3 dB under the wind and crickets (K-like), the nature sound +0.9 dB; asleep when the room's sound is off; the Lighter mode thins it. Cost ≈ 1 % of a core (node, half rate).
- Listening samples: `tools/.listen/brook-a-synth.wav` (shipped) and `brook-b-recording.wav` (CC0, «stream-river-water-up-close» by jackthemurray, Freesound #433589 via Wikimedia Commons, looped with a 3-s equal-power join; not shipped). (a) ships until the user chooses by ear.
- The water: near black, the sky only at grazing angles, the moon broken into sparkles, the nearest fireflies and mushrooms reflected, glints riding downstream, stones in the see-through shallows, white water and wakes round the rocks in it; darker, glossier banks.
- The ground: a prepared macro map (`tex/groundm-*`, `pure/ground.js macroAt`: damp, moss, leaf drifts, the turned second copy of the floor texture) breaks the 6-m tile; litter from the same law (900 / 380 leaves, 220 / 90 pebbles, 160 / 60 twigs) inside existing draws.
- The rocks: smooth spheres shaped per instance in the shader (every stone different), grey or brownish, mottled, lichen spots, moss on top, half buried, wet and glossy at the water; today's seven aisle rocks joined the stones' draw (−7 draws, −1 program).
- A room gives its own Room-sounds icon (`icon` in the record; the forest keeps the leaf; the test room shows another).
- Laptop (HD 4000), Standard: detections = Dark (before −1.1 / +5.7 %, after −0.6 / −0.1 %), frame 3.3–3.4 ms (2.4–3.9), draws 62 (69–70), programs 28 (29), triangles 199 k (189 k), textures 24.9 MB (=). Detailed: −55.4 / −51.4 % (−59.1 / −50.7 %), draws 104–105 (117–120), programs 30 (32), triangles 622 k (533 k), textures 90.9 MB (86.9). Files 17.86 MB of 30.
- Rows: data «NIGHT stream sound (app)», «FOREST ground (app)»; browser «NIGHT stream, water and ground». Waiting for step 146.
### NIGHT-7c (2026-11-11): music from the first moment, and full screen (+ CORE-15, an icon door). Log: `docs/night/WORK-LOG.md`
- Music is on by default («Покой» / Still) and starts on the tap on Begin: once the audio engine is up (about 1 s; the camera, its prompt and the model still loading) the bed plays in the Night profile's own view, fades in (level ~3 s, ground 2.5 s), and plays on under the calibration and the cards; the face does not restart it. Turning it off is remembered. New storage names (`handsong.nightMusicMode`, `…MusicLevel`): an old «off» or volume 0 from development runs never silences a new player.
- iPhone: `navigator.audioSession.type='playback'` on Begin where it exists (Safari 16.4+); elsewhere nothing changes (on older iOS the silent switch mutes Web Audio).
- Full screen (`apps/night/fullscreen.js`): asked in the Begin tap (navigation hidden where allowed; Android: landscape lock tried, refusals quiet); asked again on the next tap of the calibration or the cards if refused or ended before the camera ran; an exit afterwards is the person's. A corner toggle (top-left in portrait, top-right in landscape) shows the state; hidden where there is no full screen and in the home-screen app.
- Home screen: manifest dark, `fullscreen` display, landscape, room-neutral description; page tags for iOS (capable, black-translucent status bar, title, icon) and Android, `viewport-fit=cover`. On iPhone / iPad Safari without full screen and outside the home-screen app a fifth card «Full screen: Share → Add to Home Screen» (`pure/homehint.js`); the cards' set is version 2 (seen again once).
- Icons (`apps/night/icons.js` through `core/icons.js svgIconAdd`): Depth (layers going away), Lightweight (a feather), full screen in / out, Share, Add to Home Screen.
- Probes: the facade holds the music off during P.night (9 s tail wait when it played). Rows: data «NIGHT home screen (app)» 22; «NIGHT first cards» + the home card; runner «NIGHT music and full screen» (fresh profile, stale values, CONTROLS stored «off» and a refused full screen). Waiting for step 145.
### NIGHT-7b (2026-11-11): fixes from the user's first look at the test version (+ CORE-14, texts). Log: `docs/night/WORK-LOG.md`
- The empty card and the card that would not close had ONE cause: `.night-card.night-cards{display:block}` beat `[hidden]`, so the cards stayed on screen whatever the attribute said. In a window that had begun before (old `handsong.nightSeen`), no first run filled them: four dots, two blank buttons. The NIGHT-7 row checked the attribute, so it could not fail. Fixed: `#nightShell [hidden]` always hides; the cards are labelled from load; the row judges the computed style (CONTROL).
- The cards are due by their own key `handsong.nightCards` (written when they close); no older flag decides. The ghost hand is deleted (`ghost.js`, its row, «first steps again»): the cards replace it.
- Shared texts are room-neutral (6 keys, both languages; the data row checks every «night.*» text). Three of them moved from core to `texts.js` (CORE-14).
- Start screen: the title with a real space («hand·song night»), two tips (always shown), Begin, the privacy line.
- `?release` shows the players' edition on Live Server (`apps/night/edition.js`); it hides Measure this device, Room picture, the Sound panel and diagnostics, the calibration's side-vote line. Smoke test checks it.
- New runner check «NIGHT stale saved values» (18 stale values, reload, the real start card and first launch). Waiting for step 144.
### NIGHT-7 (2026-11-11): the test version. Log: `docs/night/WORK-LOG.md`
- Steps 141 and 142 checked by the user: the painted middle distance is right, no grain at medium; foxfire and the night flowers look right. The forest's remaining slices (a changing night, sounds and rain, animals) wait in the backlog.
- The bare floor: soil, fallen leaves, needles, twigs, moss crumbs and seeds, with relief — `tools/forest-bake.mjs drawGround` (a 2048 master, 1024 / 512 copies; colour + normal map, tiled every 6 m). Files: high 9.99 MB, medium 4.23 MB, low 1.56 MB (15.35 MB of 30).
- The players' build: the development items (Measure this device, Room picture, the sound page) are hidden in the release edition; a Vercel PRODUCTION build of Night is the release edition by itself (`tools/build.mjs`, unless `HANDSONG_EDITION=dev`). The smoke test checks the deploy tree itself.
- First launch: after the calibration offer, four cards with our own line drawings (Play · Near and far · Your other hand · Music; `apps/night/cards.js`), Skip on each, reopened from Settings → How to play; then the ghost hint.
- Languages: every Night text in English and Russian (`apps/night/texts.js`; data row «NIGHT texts both languages (app)»); the browser's language by default; the start screen's choice kept.
- Picture: Standard (medium, the default) / Detailed (high) in Settings → View. The cold first opening at medium stays about 7 s on the laptop (shader compile; the bark's shader trimmed 1.8 → 1.3 s); it now runs in slices, so the start card stays responsive (longest block 2.5 s). Under 4 s was not reached cheaply.
- Privacy: one line under Begin. Found on the way: a level change during the sliced compile dropped the picture to minimal (row «NIGHT low power» caught it) — fixed in the host.
- Rows: data «NIGHT texts both languages (app)»; browser «NIGHT first cards» 24. Waiting for step 143 (the user's five checks, the Poco, an iPhone).

### NIGHT-6 slice 9 (2026-11-10): hidden things the light finds. Log: `docs/night/WORK-LOG.md`; as built: `docs/night/design/NIGHT-6-forest/PLAN.md` top
- Step 141: the glows stay crisp; the strokes' strength and the grain at medium were left open by the user (asked again in the report); unchanged.
- Foxfire: thin glowing veins on the dead and fallen wood and on the feet of some old trunks, near the playing light's trail (12 / 8 recent places); each patch holds 8–12 s after the light, then fades in 2.5 s (the wood's and the bark's shaders; no new program).
- Night flowers: 14 / 8 small closed buds among the herbs, in view and in the light's reach; within a metre of the light they open (0.6 s) and glow softly, stay 20 s, close (3 s). Their petals: one small shader (+1 program); their glow: the mushrooms' glow points.
- Found on the way: the probe snapshot's second drawing kept the frame's geometry uploads (three uploads attributes once per frame; since slice 8 the host counts frames itself) — the snapshot now starts a new frame.
- Laptop medium: detections = Dark (0.0 / 0.0 %), frame 2.5–2.7 ms, draws 69–70, programs 29, textures 16.9 MB; first opening 5.1 s after high. High −52.4 / −45.7 %. Files unchanged (3.29 MB of 30).
- Rows: data «FOREST hidden (app)» 16; browser «FOREST hidden» 13. Waiting for step 142 (and the two open answers of step 141).

### NIGHT-6 slice 8 (2026-11-10): the painted distance and the film. Log: `docs/night/WORK-LOG.md`; as built: `docs/night/design/NIGHT-6-forest/PLAN.md` top
- Step 140 checked by the user: the canopy, the moon's window, the stars and the dapple look right; the light stays clearly visible.
- Departure from the plan (reason measured): no far forest baked beyond 28 m — today's fog leaves ≥ 94 % fog there, so it would not show; the sketch's painted look is its per-frame stroke pass on the middle distance, so that is what was built (the plan had left it out for cost): strokes from 7 m growing to the level's radius at 26 m (high 3 px, medium 2.5), written out tap by tap (29 / 21 taps, 92 / 68 sector feeds against the sketch's 81 × 8).
- The glowing things (light, fireflies, dew, mushrooms' glow, moths, leaves, moon, clouds, stars) draw after the strokes with their own depth test, so they stay crisp. Film: vignette at both levels, a fine grain at high, a slight cool grade; the camera breathes sideways (≤ 5 cm).
- Found on the way: the gust could not reverse (its direction blended through zero) — now it turns by angle (data row case added); the glow pass first compiled a second copy of every glowing material (+9 programs) — the lights now see both passes.
- Laptop medium (a clean second run): detections = Dark (0.0 / 0.0 %), frame 2.1–2.2 ms (1.8 before NIGHT-6), programs 28, textures 16.9 MB; first opening 3.9 s after high. High −48.5 / −45.0 %, cold first opening 8.3 s. Counts of draws and triangles now include every pass.
- Files unchanged (3.29 MB of 30). Rows: data «FOREST paint (app)» 18; browser «FOREST paint» 15. Waiting for step 141.

### NIGHT-6 stage 1 (2026-11-09): the forest, polished and alive — the comparison and the plan only. `docs/night/design/NIGHT-6-forest/PLAN.md`
- No app code; tree hashes unchanged (core 14bd513ae15aa87e · apps/full d6b90cf2cb4be6da · apps/night 3279ec88c1f91059).
- Compared item by item with the sketch «Живой лес»: the forest lacks most of the sketch's plant life (no leaves anywhere, no herb layer, one fern), the fallen wood, moss, the stream's banks and life, webs, dew, the moon's gap and stars, the painted distance, film. Today is ahead on the night cycle, moods, response, rare events.
- Kept exactly: everything floating and how it moves, the mushrooms' glow per Mood (their rows stay unchanged; new inputs default to today's step). Rule: add, don't move.
- Costs by RUN 9's method (hand detections vs Dark) and NIGHT-1's (µs per quantum): medium has 3.8 points left (−6.2 → −10 %), split into allowances; the opening (textures, programs) is the main Poco risk. No Poco number exists yet: slice 0 measures it.
- New sound kinds (rain, the stream, owl, splash) need no core change: Night's nature module gains parts (native nodes for hiss, one nature worklet for events), one seeded schedule shared with the picture.
- 14 slices proposed (0 the yardstick; 1 answers to notes and the bed; 2 fireflies follow the melody; … 11 sound and rain; 12 animals) and 8 decisions. Waiting for the user's approval.
