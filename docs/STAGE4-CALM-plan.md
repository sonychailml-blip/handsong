# STAGE 4 — «CALM» v1, the first public release (PLAN ONLY, RUN 5, 2026-10-17)

No app code was changed for this document. It is built around THE USER'S SPECIFICATION (RUN 5 prompt, items a–j) and the reference
prototype `docs/prototypes/rooms-of-light.html` (the strategist's «Rooms of light»; the user likes both its forest SOUND and its forest
PICTURE). Other Calm ideas already recorded (BACKLOG §7.16–§7.18) appear only under «Later / paid» (§12). Sources read: VIS1-design.md
(+ its RUN 5 review), ENG2-design.md, CMD1-design.md, BACKLOG §7.12 / §7.16 / §7.19, the prototype in full, today's `src/`.

## 0. Calm v1 in one paragraph
A person opens Handsong, sees a dark night forest, lifts a hand: a firefly light appears where the hand is and wild fireflies gather around
it. A pinch plays a soft note of a pentatonic scale — no note sounds wrong; moving the hand closer to or farther from the camera sends the
light deeper into the forest and the note further into the forest's reverb. The other hand, pinching, adds ONE gentle effect («how much»).
Under everything: a quiet drone in the key, soft wind, distant crickets. No buttons while the hands are in view; when they leave, a few
calm controls fade in. Free, offline after install, nothing leaves the device.

## 1. The user's specification, item by item → what we build
| item | decision in this plan | where (§) |
|---|---|---|
| a) Calm is a MODE (profile) over the same app; Full ↔ Calm switch during development; released app = Calm only, no switch (edition setting); probes cover both | a PROFILE record + an EDITION constant written by the release tool | §2, §9 |
| b) one room: night forest, fireflies, no animals; the playing hand is a firefly light; depth (hand size) drives the REVERB and is SHOWN (the light goes deeper) | room «forest» (VIS1c) from the prototype; depth → Night forest send + distance colour; light z | §3, §4.2 |
| c) solo only, the role not named; 2–3 timbres to switch — 3 candidates | Firefly · Glass pad · Warm pad (alternates: Airy flute, Bell deep) | §4.1 |
| d) other hand = effects, ONE amount each, reverb NOT here; 3 of 4 candidates; each visible in the forest; reuse today's effects-hand mechanism | recommend Echo · Warmth↔Brightness · Wave; Sparkle the 4th candidate | §4.3 |
| e) switch which hand plays / which does effects; latch on/off; no theremin | `handFn` of the profile + two shell switches | §4.4 |
| f) a scale where no note sounds wrong: pentatonic by default; 2–3 moods | Glow (major penta) · Dusk (minor penta) · Mist (suspended / «egyptian») | §4.5 |
| g) forest ambience: soft wind, distant crickets, quiet drone in the key; own volume; not rhythmic | an «ambience» engine module (drone + wind from the prototype, crickets new), seeded | §4.6 |
| h) UI only when needed; no cents / Hz; note field almost invisible | the Calm SHELL: hands in view → only the forest; hands gone → 5 controls fade in | §5 |
| i) first run: headphones, «light your hands», camera permission, privacy line, a ghost light shows how it works | first-run card + ghost driver (the HAND1 pose path) | §6 |
| j) later / paid | recorded only | §12 |

## 2. Calm is a PROFILE over the same app (item a)
- **Profile record** `data/profiles/<id>.json` (`handsong/profile` v1, permanent ids `profile.full`, `profile.calm` — rule #37), checked by a
  pure validator `src/core/profile.js` (rule #36, node row): `roles` allowed (`['ld']` in Calm), `handFn` defaults per hand, `scene` (`null`
  | `'forest'`), `shell` (`'full'` | `'calm'`), `timbres` offered (ids), `effects` offered (ids + the one parameter each drives), `moods`
  (mode ids), `ambience` (id), `noteField` (`'full'` | `'glow'`), `labels` (`'full'` | `'plain'` — no cents, no Hz, no role names),
  `recording` (false in Calm v1). The Full profile = today's app, written out (nothing changes in Full — proof: ui-snap 10 screens
  identical, P.all, HAND1).
- **One switch point** `src/profile.js` `profileApply(id)`: sets the live state through today's setters (scale, tonic, timbre, `handFn`,
  `voiceMode`, split off, chains) — the same doors a lesson `setup` uses (rule #24's lesson: every setup leaves the app completable) — and
  tells the shell and the compositor. `profileApply('profile.full')` brings back exactly the state that was there before Calm (snapshot of
  the touched setters, restored — a probe compares).
- **Edition** `src/edition.js` exports one constant `EDITION` (`'dev'` in the repo). The release tool (§9) writes `'calm'` into the shipped
  copy: then the profile switch is not rendered and `profileApply` refuses anything but `profile.calm`. In `'dev'` a small «Full ↔ Calm»
  switch sits in ⚙ (and `?calm` in the address opens Calm directly) — during development we switch at any moment; nothing of today's
  functions is lost.
- **Probes in both modes** (§10): P.all stays the Full suite; rows flagged `calm` form P.calm (run by `probe-browser --profile calm`); the
  state guard gains the profile; the switch round trip Full → Calm → Full is its own row.

## 3. The night forest room (item b) — the prototype's picture, re-laid by the rules
### 3.1 Map: each piece of the prototype → where it lives, what changes
| prototype piece | in the app | what must change (rule) |
|---|---|---|
| Three.js r128 from cdnjs `<script>` | `vendor/three-r128/three.min.js` + its LICENSE, loaded LAZILY by the scene host when Calm opens the room | own origin, no new CSP host (#33); register entry «shipped» replaces today's «reference» one (#32 / LIC1); the one script injection listed in the static NETWORK GUARD |
| WebGLRenderer, tone mapping, resize, pixel ratio ≤ 1.5 | `src/views/scene/host.js` (VIS1b): canvas `#scene` UNDER the 2D canvas; levels full / reduced / minimal | pixel ratio and shadow size per level (§7); context-loss → minimal level |
| `rng(seed)` (mulberry32) for geometry | `src/core/dsp.js` `seeded(n)` (already ours) | one seeded generator, fixed seeds per object (the scene is the same on every device → probe numbers) |
| `Math.random` (firefly seeds, IR, noise) | seeded too | no unseeded randomness anywhere in the room or the sound (repeatable probes; frozen = live later) |
| buildForest: ground (moss, soil, leaves canvas textures), bark, instanced trunks + branches, ferns with alpha leaves, mossy rocks, 4 mist sheets, moon halo, fog `FogExp2(0x060e18, .06)`, hemisphere + moon light | `src/views/scene/forest.js` — a SCENE MODULE (VIS1 contract: `mount / frame / resize / unmount`, cost class, `lowPower`) | the prototype's code is OUR OWN (the strategist's) and may be the starting source (user, RUN 5); colours become tokens `--cv-forest-*` in `tokens.css` read through `palette.cv` (DRAW1b; static check 11); counts (95 trunks, 80 ferns × 7 fronds, 70 wild fireflies) become per-level parameters |
| `buildBand` (frog, woodpecker, owl, firefly choir) | NOT in v1 | later / paid (§12) |
| `buildMonastery` | NOT in v1 | later / paid |
| the hand's firefly: PointLight `0xc6ff7a` (shadow-casting for hand 0), core + halo sprites, a 16-sprite trail | `forest.js` hand rigs, fed from the BUS `hands` topic (VIS1a) | position from the REMAPPED coordinates `sx/sy` — the same ones the hit-tests use (#12) — so the light sits exactly on its note row; mirroring only through `flipX` (#13); the light appears / fades with `on` like the prototype |
| wild fireflies drawn to the nearest light (ring orbit, tangential swirl, damping, ground / wrap) | `forest.js` firefly system (points shader `glowPoints`) | pure step function `core/fireflies.js` (positions as numbers — a node row and a probe compare them; the shader only draws) |
| depth slider / mouse wheel → `D` between `depth[0..1]` | depth from HAND SIZE (`S.hs`, `dist(lm0,lm9)`, smoothed — the value VOL-4 already uses) | RAW coordinates for the size (#12); 3–4 eased bands as VIS1 §5 says; the SAME depth value drives the sound (§4.2) — one source |
| camera parallax (lean towards the light, slow breathing) | `forest.js` camera | `prefers-reduced-motion` keeps the prototype's 0.3 factor |
| `screenToWorld` clamps to the room's bounds | kept | rule #12: the coordinates are never clamped — only the LIGHT's world position saturates at the bounds |
| pointer input → hands | hands from the camera (`vision.js` → `gestures.processHands`); pointer input kept ONLY as a dev / kiosk aid behind a probe flag | the ghost (§6) and probes feed the same path through the HAND1 pose generator |
| ghost light when idle (1.5 s), a note every 3.2 s | the first-run demo and the «hands gone» idle state (§5, §6) | the ghost plays through the engine contract like a hand (no second sound path) |
| own audio graph (compressor → master, convolver with random IR, per-note oscillators) | §4 — everything through the ENGINE CONTRACT (ENG1) | no browser compressor in the live path (#4 — our limiter); the IR = our seeded Night forest (`core/dsp.forestIR`, already built in SND-F1) |
| `A major pentatonic`, `mtof` with 440 | moods = mode files (§4.5), pitch from `baseF()` and the view (#2) | no MIDI table, no `440` literal, no `2` literal (#2, #17) |
| the panel (eyebrow, title, buttons) and the hint | the Calm shell (§5) | strings in `DICTS.en` + `DICTS.ru`; glyphs by name from `icons.js`; tokens only |
| Google Fonts Marcellus + Commissioner | not loaded from Google | if the design (§8) keeps them: self-hosted woff2 under `vendor/fonts/` (OFL-1.1, register entries «shipped»); otherwise system fonts |

### 3.2 What the picture reacts to (v1)
- The playing light: hand position (row height / x), depth (z, deeper = smaller, dimmer, bluer through the fog), a glint on each note
  onset (from the bus `notes` topic, `when` mapped to screen time through the output timestamp — VIS1 §5 `heardAt`), brightness from the
  note's volume.
- The effects hand: its own small light, dimmer; each effect visible (§4.3).
- Nothing in the picture ever touches sound, the song or the network (VIS1 contract); the scene reads the bus only.

## 4. Calm's sound (items b–g)
### 4.1 Timbres — three candidates for the user's ear (item c)
All solo, poly voice mode, from today's 23 solo timbres + Firefly. Recommended three:
1. **Firefly** (`chord.firefly` today — struck tine, partials 1 / 2 / 4.2 with their own decays, release 1.6 s). It IS the prototype's forest
   note, bit for bit (the same partial table). Needs a solo record `solo.firefly` with engine `tine` (TIM3: a solo timbre may be appended;
   the solo voice builder must learn the tine engine — slice C4a). Struck: each pinch rings out by itself — the calmest, most «firefly» choice.
2. **Glass pad** (`solo.glass-pad` — triangle + sine detuned ±5–6 ¢, filter 3.2 kHz, attack 0.3 s, release 2.5 s): the soft sustained glassy
   lead the spec names; with latch it becomes a breathing chord of held notes.
3. **Warm pad** (`solo.warm-pad` — two detuned saws, filter 1.4 kHz, attack 0.35 s, release 2.5 s): the warm, bowed-like one; darker under
   the forest reverb.
Alternates if one does not please: **Airy flute** (two sines 1 + 2, attack 60 ms — breathy, very clean) and **Bell (deep)** (FM, release 1.6 s
— a glassy bell, close to Firefly). The person switches with one control (§5); the role is never named.

### 4.2 Depth → the forest reverb, shown as the light going deeper (item b)
- The live solo chain in Calm holds the **Night forest** effect (`forest`, already built, SND-F1; room Medium 1.7 s by default — the user
  chooses Short / Medium / Long by ear once).
- **Depth owns the forest send** (rule #29: one owner at a time — in Calm the depth is the AIM's writer for `forest.mix`, through the same
  aim door `gestures.fxParamsOf` → `FX_AIM`, with the parameter mode that exists today, `{ mode:'drive', hand:'play', axis:'z' }` (state.js —
  a chain parameter driven by the playing hand's depth; today's solo reverb already listens to the hand size this way); the effects hand
  never aims at it). Curve = the prototype's distance
  colour, per note at its attack: lowpass `900 + 8000·(1−d)^1.5` Hz (the solo brightness stage, two-filter rule #19 untouched — this is the
  solo's own `bright` per-note value), dry `1 − 0.55·d`, send `0.5 + 0.8·d` (d = 0 near … 1 far). The constants go to `config.js`
  (`CALM_DEPTH`), the curve to a pure function in `core/` (node row).
- Live only: Calm v1 records nothing (rule #11's spirit: a hand's continuous channel is not an event).
- **Weak devices:** the light forest-like reverb (BACKLOG §7.16 ⬜): the existing FDN reverb shaped to the Night forest's decay and
  brightness (≈ 1 % CPU vs ≈ 15 %), chosen by the low-power path (§7); A/B by ear before it ships.

### 4.3 The effects hand — ONE amount per effect (item d)
Today's effects-hand mechanism (`gestures/fxhand.js`: a finger = a chain slot, its parameter driven from the pinch's capture point on RAW
coordinates, rule #12) reduced by the profile to three fingers, one amount each (vertical drag from the pinch point; release = stays, like
today's latch of the aim). Candidates (the user picks three by ear):
| effect | what «how much» moves | built from | seen in the forest |
|---|---|---|---|
| **Echo** | mix and feedback together (one curve: mix 0…0.45, feedback 0…0.55), time tied to Calm's tempo (a dotted eighth at 72 bpm = 0.625 s, through `transport/clock.secPerBeat` — rule #35) | today's `dly` effect | fading rings of light leaving the firefly on each echo (timed from the echo's own delay, not from audio analysis) |
| **Warmth ↔ Brightness** | one axis: below the middle darker / warmer, above brighter | the solo `bright` per-note stage | the light's colour: amber ↔ cold green-white |
| **Wave** | gentle vibrato depth + a little tremolo (one curve; rate fixed ≈ 4.5 Hz) | today's `vib` / `trm` scalars (`trmMix`) | the light trembles (position jitter + intensity, same rate) |
| **Sparkle** | a quiet octave-up partial added to each note (0…−18 dB) | NEW: one extra sine per solo voice in the voice builder — started once, gated (rule #3), cost one oscillator per pooled voice | small flashes around the light on each onset |
Recommendation for v1: **Echo, Warmth↔Brightness, Wave** — all three exist today (least risk, no new sound code); Sparkle is the strongest
fourth if the ear wants it (it changes the voice builder — its own slice, GOLD rows for every Calm timbre). Reverb is NOT on this hand.

### 4.4 Hands and latch (item e)
- Calm `handFn`: playing hand `note`, other hand `fx` (solo's today: `ld:{L:'fx', R:'note'}` — the default already). Switch «Play with: right /
  left hand» swaps them (`setHandFn`; per half by role, rule #18 — Calm has no split).
- Latch: «Notes ring on» — the note keeps sounding after the pinch opens, until the next pinch (which ends it and starts the new one) or
  until the hand leaves for 2 s; off = the note ends when the pinch opens (today's solo `note`). ⚠️ Today's solo `hold` («Notes (held)»)
  is NOT a latch — it freezes the pitch while pinched; only chords have a latch (`'latch'`, owner key `'latch'`). So the solo latch is a new
  hand function `ld:'latch'` in `gestures/hands.js` (slice C5b, S), mirroring the chord latch's rules (one owner, released at a profile
  switch and by `softAllOff`). With Firefly (struck) the latch only lets the strike ring its full tail.
- No theremin, no expression hand, no looper hand in v1 (the profile does not offer them).

### 4.5 Moods — scales where no note sounds wrong (item f)
Key fixed at **A** (the prototype's; A4 from `aRef` — rule #17); the key knob hidden in Calm. Three moods, each an existing mode file:
1. **Glow** — major pentatonic (`major-penta`; the prototype's forest scale) — default.
2. **Dusk** — minor pentatonic (`minor-penta`) — the same five-note shape, darker.
3. **Mist** — the suspended pentatonic (`egyptian`: 1 2 4 5 ♭7 — no thirds, open and floating).
All three contain the drone's root and fifth (§4.6), so nothing clashes with it. (A fourth «far away» mood, Slendro, is a later idea — its
cents tuning would need the drone to follow, which works today but is not needed for v1.)

### 4.6 The forest's own ambience (item g)
A new ENGINE MODULE `src/modules/ambience/forest.js` (stateless, rule #38: first argument `E`; its nodes live in the engine context) on its
own bus `ambBus` → master, with its own level («Forest» volume, §5). Not a backing, nothing rhythmic, never recorded:
- **Drone** (the prototype's recipe, BACKLOG §7.16, verbatim): sine at the ROOT of the key @0.09 + sine at its FIFTH @0.05, both from
  `baseF()` and the mood's view (rule #2 — the prototype's 110 / 164.81 Hz are A2 / E3 at A4 = 440; it follows A4 and the mood); fade-in
  time constant 1.2 s; send 0.7 to the forest reverb. Oscillators start once and are gated (rule #3; the drone LFO is today's listed
  exception).
- **Wind**: looped SEEDED noise (2 s, `core/dsp` seeded) → bandpass 520 Hz Q 0.6, centre swept ±260 Hz by a 0.06 Hz LFO, @0.05.
- **Distant crickets** (new, not in the prototype): short chirps — a 4.3–4.9 kHz sine, amplitude-gated in 3–5 pulses of ≈ 12 ms, a chirp
  every 0.6–1.8 s, two or three crickets at different pans; lowpass 7 kHz and a high reverb send so they sit far away. Their timing is a
  pure, SEEDED schedule in `core/` (node row: the same seed gives the same chirp times; CONTROL: another seed differs), played through the
  scheduler's look-ahead (rule #15 — explicit times) so they never bunch on a busy frame.
- Cost target: ≤ 2 % of a core on the desktop (offline factor, ENG2 method); measured in the slice.

## 5. The Calm shell — UI only when needed (item h)
- **Hands in view** → only the forest. **No hands for 1.5 s** → five calm controls fade in (300 ms; tokens for timing): **Sound** (the 3
  timbres), **Mood** (Glow / Dusk / Mist), **Play with** (right / left), **Notes ring on** (latch), **Forest** (ambience volume). Plus a
  small ⓘ (privacy line, headphones tip) and, in the dev edition only, the Full ↔ Calm switch. Hands back → they fade out (no tap needed).
- **No cents, no Hz, no role names** anywhere (profile `labels:'plain'`; the latency meter and the diagnostics are not reachable in the
  Calm edition; in dev they stay behind ⚙).
- **The note field** (VIS1 review answer): almost invisible — `surface:'glow'`: only the ROW under each hand glows softly near the hand
  and fades as the hand moves away (the row boundaries are the rect layout's — rule #26, the hit-test and the glow from the SAME frozen
  range, rule #9); no labels. A switch «Show the full note field» (off by default) draws today's faint rows without numbers.
- Touch fallback: tapping the screen when no camera is allowed shows the same controls (accessibility; the forest still plays from the
  ghost or not at all — question 4).
- DOM in `index.html` (new `#calmShell`), CSS in `style.css` through tokens (`--calm-*`), strings in both dictionaries, icons by name.

## 6. First run (item i)
One card, four short lines, one button — the AudioContext is created in that click (rule #1; `main.startApp` stays the one start path):
1. «Use headphones — the forest is quiet.» 2. «Light your hands — a lamp beside you, not behind you.» (LAT3's low-light hint stays live.)
3. «Handsong will ask for your camera. Pictures never leave this device.» (+ the existing privacy notice `#privacyNote`, rule #33.)
4. **Begin** → camera permission → the forest. While no hand has appeared yet, a **ghost light** drifts in and plays four notes of the mood
   (the prototype's ghost path: a slow Lissajous over the screen, a note every 3.2 s), fading out when a real hand appears. The ghost is
   driven through the HAND1 pose generator into `processHands` — the same door the probes use — so it plays exactly as a hand would.
- Shown once per device (localStorage, try/catch); ⓘ brings it back. Camera refused / busy → today's CAM-START messages (0b), in Calm's words.

## 7. The low-power path (ENG2, item: plan must cover it)
- **Levels** (VIS1 §6): **full** (shadows: hand light 1024² → 512² on small screens as the prototype does; 70 wild fireflies; 60 fps cap),
  **reduced** (render scale 0.75, 30 fps, 512² shadow, 35 fireflies, no mist animation), **minimal** (no WebGL: a pre-rendered still of the
  forest + a 2D light mask + 2D fireflies — also the fallback without WebGL or on context loss).
- **Sound:** the light forest-like FDN reverb instead of the convolution (§4.2); solo pool cap 4; the chord pool is already lazy (POOL1 —
  Calm plays no chords, so it stays at its bare 6); crickets on, wind on (cheap).
- **Who decides:** ENG2's provisional class only PROPOSES; per user answer E1 there is NO automatic switching until calibrated. Calm v1 ships
  with a visible choice «Lighter forest (for older phones)» in the ⓘ panel and remembers it per device. Automatic + visible («Low power: on —
  why? [turn off]») comes only after the measurements below.
- **What still needs the user's phone measurements** (the latency meter's Copy text, ≈ 10 min of play each): a budget Android (the user's POCO M5 — review 2026-10-17), a mid
  Android, an iPhone — (1) «Audio dropouts per minute» with the forest Medium vs the FDN reverb; (2) detection time with and without the
  room (the GPU is shared with MediaPipe); (3) the room's frame rate at each level; (4) hand → sound latency; (5) the phone warm after 10 min
  (thermal throttling: does the frame rate fall?); (6) the start-up offline factor (ENG2 §4) on each — to set the class thresholds.
- Detection in a worker: decided per the phone numbers (LAT2b found the worker ≈ 2× slower on the desktop GPU).

## 8. Design (BACKLOG §7.19 — before the release)
Calm is the first face people see. Per the user's decision all design is Claude Code's own work, chosen by the user among proposals: the
Calm shell's look (type, colours, the five controls, the first-run card, the app icon), 2–3 proposals as pages, then built through tokens and
the icon component. The prototype's look (night `#040306`, parchment text, ember accent, Marcellus / Commissioner) is proposal 1's starting
point; fonts only OFL, self-hosted.

## 9. Offline and release
### 9.1 Offline — installable, cached, no network after install (rule #33)
- **Vendor everything:** MediaPipe tasks-vision 0.10.35 (JS + WASM) and the hand model (float16, the pinned file) under `vendor/` with their
  licence / notice files (Q «model bundled in stage 4»); three.js r128; fonts if used. Register entries change use CDN → shipped (LIC1).
- **CSP narrows to `'self'`** (`script-src`, `connect-src`): the jsDelivr and Google Storage hosts leave the policy — a privacy gain (the
  runner's CSP check and the static network guard follow).
- **Service worker** (`sw.js` gets a cache for the first time): a versioned precache of exactly the shipped files, listed by the release tool
  (§9.2) with content hashes; cache-first for them, network for nothing else; a new version installs in the background and a calm toast
  offers «New version — reload». Storage: ≈ 15–25 MB (model + WASM + three + scene textures are procedural) — `navigator.storage.persist()`
  asked after the first play (BACKLOG §3.35 already decided).
- **The counter (Q14):** the Vercel page-view counter cannot work offline and, if hosting moves (§9.3), does not exist there → question 7.
### 9.2 The release tool and the edition
- `tools/release.mjs --edition calm --out dist/` (a dev tool, node only — no build step for the app itself): copies the shipped files, writes
  `EDITION='calm'` into `dist/src/edition.js`, writes the SW precache list with hashes, leaves out `?probe` tools (`scaleprobe.js`,
  `src/probes/`, `render.js` console parts not needed — decided by a list), `docs/`, `tools/`, `archive/`; runs the licence check over
  `dist/` (only shipped entries may remain; LIC1 CONTROL: a «reference» address in dist fails).
- The data runner gains a row «release dist» (the tool on a temp folder: every precache file exists and hashes match; no probe module in
  dist; the edition is calm; CONTROL: a dev edition in dist fails).
### 9.3 What «release» needs (outside the code)
- **Domain:** the user's choice (e.g. a short `handsong.<tld>`; check trademarks first — the name «Handsong» itself has not been searched — the trademark search is the STRATEGIST's task before release, review R3).
- **Hosting:** Vercel Hobby forbids commercial use (§7.12 item 6). Calm v1 is FREE, so Hobby is allowed for v1 — but paid parts later need
  a move. Recommendation: **Cloudflare Pages** (static, global, a `_headers` file can send the CSP as an HTTP header too, custom domain, a
  free plan that permits commercial sites — to be re-confirmed in its terms when signing up), or Vercel Pro (≈ $20 / month) if the counter
  matters. GitHub Pages: its terms discourage commercial «sites primarily for transactions» — not recommended for the paid future.
- **Privacy wording:** the start card's notice (`privacy.*`) rewritten for Calm in plain words: camera pictures are processed on this device
  and never sent; no account; no sound is recorded; works offline after the first visit; the one page-view counter (if kept) named. A short
  privacy page + an imprint / contact line (needed by stores and payment providers later).
- **Store pages:** not needed — Calm installs from the browser (PWA). Optional later: Microsoft Store (packaged PWA), Google Play (Trusted Web
  Activity); iOS App Store would need a wrapper and Apple's review — not v1. A landing page with a 20-s video (BACKLOG §3.31 promo) serves as
  the «store page».
- **Payment provider** (for the later paid parts — Calm v1 needs none): both Paddle and Lemon Squeezy are MERCHANTS OF RECORD (they handle EU
  VAT / US sales tax, invoices, refunds), similar fees (≈ 5 % + $0.50). **Recommendation: Paddle** — an independent, long-running merchant of
  record for software, stable for a product we plan to grow (Plus, packs, subscription later); Lemon Squeezy is simpler to start and has
  built-in licence keys, but since its acquisition by Stripe (2024) its direction is less certain, and we already have our OWN offline
  licence keys (PACK1), so its key feature is not needed. Decide when the first paid part is ready; re-check both providers' terms then.

## 10. Probes that prove Calm works (probe budget: deterministic first)
- **Two suites:** P.all / P.quick = Full (unchanged); **P.calm** = rows flagged `calm` (+ the Full rows that make sense in Calm: GOLD of the
  Calm timbres, census, LAT, CAM, CSP, network); `probe-browser --profile calm` runs it in a fresh browser with `?calm`. Weekly: both.
- **Node rows (core):** «CALM profile records» (both profiles valid; CONTROL: a profile offering a role that does not exist fails); «CALM
  depth curve» (lowpass / dry / send at d = 0, ½, 1 exactly the prototype's numbers); «CALM cricket schedule» (seeded, repeatable, CONTROL
  another seed differs); «CALM fireflies» (the step function: N steps from a seed give fixed positions; a light pulls them into its ring).
- **Browser rows (calm):**
  - «CALM profile round trip» — Full → Calm → Full: every touched setter back exactly (the state guard's snapshot); in Calm only the solo
    role is reachable, no role name / cents / Hz in the DOM text or in the canvas label calls (a draw hook counts label calls — CONTROL:
    labels 'full' shows them).
  - «CALM synthetic hands» — the HAND1 pose generator on the probe clock plays Calm: each pinch of the playing hand → exactly one `noteOn` of a
    mood note (pitch through the view; CONTROL: a non-mood pitch is caught); a depth sweep → the forest send aim equals the curve; the effects
    hand drags → only its one parameter moves (others exact); «Play with: left» swaps; latch on keeps the note to the next pinch; hands gone
    1.5 s → the shell's controls shown; hands back → hidden.
  - «CALM ambience» — offline render 4 s: drone peaks at the key's root and fifth within 0.5 ¢ of `baseF()` (A4 moved → they follow);
    seeded wind identical twice; the Forest level scales it (CONTROL: an unseeded copy differs).
  - «CALM timbres» — GOLD entries for `solo.firefly` (new) and the three chosen timbres; `solo.firefly` = `chord.firefly`'s strike (same
    partial table, render envelope ≤ 1e-5).
  - «CALM scene state» — the room fed by the pose generator: light world positions, the light's z for each depth band, the number of
    shadow-casting lights per level, firefly positions after N frames — NUMBERS, never WebGL pixels (GPU-dependent).
  - «CALM offline» (real-time, justified: only a real browser proves it) — after the first load the runner sets the context offline
    (Playwright `setOffline(true)`), reloads: the app starts, plays a ghost note, zero requests leave; CONTROL: without the SW cache the
    reload fails.
  - «CALM edition» — the release tool's dist served by the runner: no Full switch, `profileApply('profile.full')` refused, no probe module
    reachable (CONTROL: the dev edition shows the switch).
- **Eye / ear / phone steps for the user** (written per slice): the forest looks right; depth is felt; each effect is seen; the moods and the
  three timbres by ear; the phone measurements of §7.

## 10b. Hard rules #31–#38 in Calm
- **#31 track ≠ live:** Calm v1 records nothing, so only live heads sound; when recording comes (paid), Calm's chain is copied to the track
  at birth as today. The ambience bus is live sound, never a track.
- **#32 licences:** three.js r128 (MIT) and the MediaPipe files vendored with their licence files; fonts OFL self-hosted; the forest's
  geometry and textures are procedural (our code; no image assets); the prototype is our own code (the strategist's) — re-laid, not
  third-party. Register: «reference» entries become «shipped» at C3 / C9.
- **#33 privacy:** offline after install; CSP narrows to `'self'`; nothing about hands, pictures or sound leaves the device; the counter is
  the user's decision (question 7).
- **#34 camera controls:** Calm changes no device control (no low-light test switches in the Calm shell).
- **#35 clock:** Echo's time and the cricket schedule's look-ahead use `transport/clock` (no `60/bpm` outside it).
- **#36 core is pure:** profile validation, the depth curve, the cricket schedule and the firefly step function live in `core/` and run in
  node.
- **#37 ids:** `profile.full` / `profile.calm`, `solo.firefly`, `ambience.forest`, room `room.forest`; moods are mode ids; never renamed.
- **#38 stateless engine modules:** `modules/ambience/forest.js` keeps nothing at top level; its nodes live in `E`; the render copy can play
  it (a probe renders it offline).

## 11. Slices (sizes S ≤ ½ day, M ≈ 1–2 days, L ≈ 3–5 days of Claude Code work), in order
1. **C0 profile + edition** (M) — `core/profile.js`, `data/profiles/full.json` + `calm.json`, `profile.js` apply / restore, `edition.js`, dev
   switch + `?calm`; Calm at this point = Full's solo with the profile's defaults (no scene yet). Rows: profile records, round trip.
2. **VIS1a** (M) — the bus `core/bus.js` + writers, `views/stack.js` compositor, camera / surface / hands as modules; nothing visible (ui-snap).
3. **VIS1b** (M) — scene host, vendored three r128 (lazy), the three levels, an empty room; LIC1 entry shipped.
4. **VIS1c forest room** (L) — the prototype's forest re-laid: geometry, mist, fog, moon, hand lights from the bus, trail, wild fireflies
   (`core/fireflies.js`), depth bands, parallax, shadows per level, tokens. Row: scene state.
5. **C4a solo Firefly** (M) — the tine engine in the solo voice builder, record `solo.firefly` (+ TIMBRE_IDS_PINNED, bundle, T5 bounds), GOLD.
6. **C4b depth → forest** (S) — `CALM_DEPTH`, the curve in core, depth as the `forest.mix` aim and the per-note brightness. Rows: depth curve,
   synthetic hands (depth part).
7. **C4c ambience** (M) — `modules/ambience/forest.js` (drone + wind + crickets), seeded schedule, its bus and level. Row: ambience.
8. **C5 effects hand for Calm** (M) — the three chosen effects as one-amount fingers (+ Sparkle if chosen: +M), the forest visuals of each.
   **C5b solo latch** (S) — the new `ld:'latch'` hand function (§4.4). Row: synthetic hands (latch part).
9. **C6 Calm shell** (M) — fade-in controls, plain labels, the glow note field + «Show the full note field». Rows: synthetic hands (shell).
10. **C7 first run + ghost** (S) — the card, the ghost driver through the pose generator.
11. **C8 low power** (M) — the forest-like FDN reverb (A/B by ear), the «Lighter forest» choice, levels wired; the phone measurement script.
12. **C9 offline** (M) — vendored MediaPipe + model, CSP to `'self'`, SW precache + update toast, `storage.persist`. Row: offline.
13. **C10 release tool + edition calm** (M) — `tools/release.mjs`, dist checks, privacy wording, hosting move if decided. Row: edition, dist.
14. **C11 design pass** (M, §8) — proposals → the user's choice → tokens / icons / fonts; ui-snap of the Calm screens.
15. **C12 release candidate** (S) — P.all + P.calm on the runner, the user's phone round, fixes, then publish.
Total ≈ 1 L + 11 M + 4 S ≈ 4–5 weeks of slices. VIS1d (monastery), VIS1e (forest band) are NOT in this list (§12).

## 12. Later / paid (recorded only — not in Calm v1)
More rooms (the monastery from the prototype, then underwater, starry sky, aurora, rainy window, ink in water — BACKLOG §7.16) · the forest
band (frog, woodpecker, owl, firefly choir — notes-driven, output-latency sync, VIS1e) · rhythmic backings (the 10 patterns) · more timbres
and effects (Sparkle if not in v1) · the expression hand · recording / saving moments (clips with light trails, §7.12 item 3) · playing along
with outside music («Listen», §7.17) · installation / kiosk mode (§7.18) · packs via PACK1 (rooms, sound worlds) · the «Plus» purchase.

## 13. Risks
1. **GPU sharing on phones:** MediaPipe (GPU delegate) + a WebGL room may push detection time up and the frame rate down — measured in C8
   before defaults; the minimal level is the safety net.
2. **A dark screen does not light the hands:** the forest is dark, so the screen gives no light to the hands — in an evening room detection
   slows (LAT3: 6 fps evening). The first-run line «light your hands» and the low-light hint are essential; maybe a «lantern» brightness
   (the screen's lower edge slightly lit) — question 5.
3. **iOS Safari:** camera + WebGL + Web Audio in an installed web app have their own limits (audio only after a tap, memory pressure kills
   WebGL contexts, standalone camera support differs by version) — test on a real iPhone early (after C4) if one is available; the user's phone is a Poco M5 (Android) — every phone check runs on it (review 2026-10-17).
4. **Convolution cost** (Night forest Medium ≈ 15 % of a desktop core, ≈ 4× on a phone) → the FDN «forest-like» reverb must sound close
   enough (A/B).
5. **Offline size and updates:** ≈ 20 MB first download; a broken SW can pin an old version — versioned caches, an update toast, a «reset
   the app» line in ⓘ.
6. **three.js r128 is old (2021, UMD):** fine for our use, no network, no plugins; a later move to an ES-module build is possible (MIT too).
7. **Firefly as solo** changes the solo voice builder (tine engine): risk to today's solo GOLD — every solo timbre's GOLD must stay exact.
8. **Scope creep:** the band, the monastery and backings are tempting — they stay in §12 until Calm v1 is out.

## 14. Questions for the user (plain words)
1. **Sounds:** which three should Calm offer — Firefly, Glass pad, Warm pad (our suggestion), or swap one for Airy flute or Deep bell? (We
   will prepare a short listening page.)
2. **The other hand's effects:** Echo, Warm↔Bright and Wave (our suggestion — all exist already), or do you want Sparkle (a soft «octave
   shimmer» on every note — new code) instead of one of them?
3. **Moods:** Glow (bright), Dusk (darker), Mist (floating, no thirds) — good names and choices? Always in A, or should the key be choosable?
4. **Without a camera:** if someone refuses the camera, should the forest still play by touch (finger on the screen = the light), or just
   explain that Calm needs the camera?
5. **Light on the hands:** may the bottom of the screen glow softly (like a lantern) to help the camera see hands in a dark room, or keep the
   forest fully dark?
6. **How notes start:** by a pinch (like the rest of Handsong — our suggestion), or, like the prototype, by simply moving the light (no
   pinch — easier for children, less control)?
7. **The visitor counter:** keep the one page-view counter (it needs Vercel; it does not work offline), or drop it for Calm and host on
   Cloudflare Pages (free, allows a paid future)?
8. **Name and address:** is «Handsong — Calm» the release name, and do you have a domain in mind?
9. **Payment later:** we recommend Paddle for the paid parts that come after Calm — fine to plan with it?
10. **Fonts:** keep the prototype's style (Marcellus titles) — self-hosted — or wait for the design proposals (§8)?

## Review 2026-10-17 (the user's answers + the strategist's notes; RUN 6)
**Answers (§14):**
1. Sounds — decided BY EAR on a listening page (built early, RUN 6 item 2; `tools/listen/calm-timbres.html`); until then Firefly · Glass pad
   · Warm pad.
2. Effects — Echo · Warmth↔Brightness · Wave for v1; Sparkle later (§12).
3. Moods — Glow · Dusk · Mist as proposed; the key is FIXED (A), not choosable.
4. No camera — the forest plays by TOUCH / MOUSE (finger or pointer = the light), with a gentle line that hands work best.
5. Lantern — yes: a warm, dim glow at the lower edge, OFFERED when the low-light hint fires (never forced), remembered per device.
6. How notes start — BOTH, as a dev switch: «pinch» (default) and «move the light»; the user decides by playing.
7.–9. Counter / hosting, name / domain, payment — POSTPONED until the app is built; today's setup stays.
10. Fonts — wait for the design proposals (RUN 6 item 3, `docs/design/calm/`).

**Changes to the plan:**
- **Note modes (replaces §4.4's latch):** NO new solo latch — a note sounding on after the fingers open is NOT wanted. Calm offers exactly
  the TWO solo modes that exist today: «note continuous» (solo `note`: while pinched, moving up / down changes the note by the rectangle
  under the hand) and «note held» (solo `hold`: the note of the rectangle where the pinch began sounds while the pinch is held). The shell's
  switch chooses between them; proposed wording — en «Notes: follow the hand» / «Notes: stay put», ru «Ноты: за рукой» / «Ноты: на месте».
  **Slice C5b and «Notes ring on» are dropped** (§4.4, §5 and §11 item 8 read accordingly; the shell's fourth control is «Notes»).
- **First run (§6):** a line «Stand your phone or laptop so both hands are free.» (ru «Поставьте телефон или ноутбук так, чтобы обе руки были
  свободны.»).
- **The user's phone is a Poco M5 (Android)** — §7's phone measurements and every phone check are done on it; an iPhone later if available
  (§13 risk 3 stays open until then).
- **Orientation:** Calm plays in BOTH portrait and landscape, on phone and desktop. Every background displays correctly in both and on
  rotation: no stretching, the hand light stays on its note row (one frozen range, rule #9), controls re-flow. Probes: the scene state and
  the shell are checked at a portrait AND a landscape viewport.
- **Backgrounds (new; shell control «Background», remembered per device):** (1) **Forest** — the 3D night forest; (2) **Dark** — plain black,
  the SAME sound (forest reverb, ambience), the hand lights / points visible, no room drawn — also the lightest option for weak phones (no
  WebGL; named in the low-power path §7 and in the ⓘ panel); (3) **Camera** — today's camera picture with the hand points (helps beginners).
  Sound is identical across the three. Probes: switching backgrounds changes no sound and no note mapping; Dark creates no WebGL context;
  Camera draws the video frame matched to the dots (rule #8, the exact frame).

**Strategist's notes:**
- **R1 design earlier:** the Calm design proposals come NOW (RUN 6 item 3, docs only), so the user chooses the style BEFORE the shell (C6);
  C11 then only applies the chosen style.
- **R2 GPU sharing right after the forest room:** the latency meter gains a line «Scene: N fps · frame N ms · level»; the Background switch
  doubles as «room on / off». After VIS1c the user measures hand → sound and detection with Forest vs Dark on the desktop (Intel HD 4000 /
  NVIDIA GT 635M) and on the Poco M5 (the step is written in the step index).
- **R3:** the name's trademark search before release is the strategist's task (§9.3).

## C4b design note (RUN 6, for the strategist — not built; the run stopped the sound slices after C4a)
The prototype colours each note by its depth d (0 near … 1 far) at the ATTACK: lowpass `900 + 8000·(1−d)^1.5` Hz, dry `1 − 0.55·d`, send
to the room `0.5 + 0.8·d` (so 0.5 … 1.3), wet return 0.55. Today's «Night forest» module (SND-F1) has ONE bus send «mix» 0…1 (default 0.8)
and a FIXED dry of 1 — so three choices change an existing effect's contract and need a decision first:
1. **The send above 1.** Either widen «mix» to 0…1.3 (the GOLD «fx forest» cases keep their values; the effect-contract rows change their
   range), or map d → mix = min(1, 0.5 + 0.8·d) (saturates from d ≈ 0.63 — the far third sounds the same).
2. **The dry level.** Add a second forest parameter «near» (dry, default 1 = today's identity, so every song and GOLD case is unchanged), or
   let depth also lower the solo's own level (Volume entry) — but rule #29 gives the Volume address to the hand's horizontal axis today.
3. **Per note or per hand.** The forest is a BUS module (one convolver per chain, never per note): its send follows the playing hand's depth
   continuously (the existing parameter mode `{ mode:'drive', hand:'play', axis:'z' }`), not «at each attack» like the prototype. The darkening
   lowpass CAN be per note (the solo's own `bright` per-note value, rule #19 untouched), taken at the attack from the same depth.
Recommended: (1) map with saturation for v1 (no contract change; the far band is still «far» by the darkening), (2) the new «near»
parameter with identity default, (3) bus send continuous + per-note darkening at the attack. Then: `config.CALM_DEPTH`, the pure curve in
`core/` (node row: the prototype's numbers at d = 0, ½, 1 exactly), the Calm profile's solo chain = [Volume, Night forest (send ← playing
hand z, room Medium fixed), the C5 effects], saved / restored by `profileApply` like the other touched state (the C0 round-trip row grows by
the chain). Probe «CALM synthetic hands (depth)»: a depth sweep through the pose generator → the forest send aim equals the curve; GOLD for
the forest unchanged.

**Status after RUN 6 (2026-10-17):** ✅ C0 · ✅ VIS1a · ✅ VIS1b · ✅ VIS1c (+ backgrounds, meter Scene line) · ✅ C4a (solo Firefly) · ⬜ C4b
(design note above — needs the decision) · ⬜ C4c · ⬜ C5 · ⬜ C6 (after the user's design choice, `docs/design/calm/`) · ✖ C5b (dropped).
Listening page `tools/listen/calm-timbres.html` and the design proposals are ready for the user.

## Review RUN 7 (2026-10-17) — the user's decisions after the listening page and the design proposals
- **Design = a combination:** the EMBLEM / app icon from C · Hush (five dots in an arc, the centre one glowing) — also the brand mark above the
  «handsong» wordmark; EVERYTHING ELSE from B · Moonglass (palette → `--calm-*` tokens, icons, round buttons in the glass capsule, first-run
  card, ⓘ panel, portrait and landscape layouts). The emblem's glowing dot uses Moonglass's firefly lime `#c8f56a` (one family).
  Fonts: an OFL title serif WITH Cyrillic in Fraunces' soft spirit (Fraunces has none) and Atkinson Hyperlegible (Next) checked for Cyrillic
  (or an OFL sans with Cyrillic of equal legibility); self-hosted woff2 + licence entries (LIC1). Glass blur: a plain dark fallback (no
  backdrop blur) on the Dark level, weak devices and with the low-power choice — same readability.
- **Sounds:** of the five RUN 6 candidates the user keeps ONLY Firefly and the flute idea (the others «too simple, not natural, poorly made»).
  Calm needs high-quality, organic sounds people enjoy for a long time → the RUN 7 sound pass (below); the user picks the final three by ear.
- **Note modes** approved: «Notes: follow the hand» / «Notes: stay put» — ru «Ноты: за рукой» / «Ноты: на месте».
- **C4b depth → forest:** try a CALM-PROFILE-only wider range for the forest send (Full unchanged); if not clean, accept the two-thirds limit
  for v1 and say so.
- **Phone test:** the user puts the app online for the Poco M5 later; no hosting work in RUN 7.
- **Quality bar:** `docs/CALM-QUALITY.md` (ten points) — every Calm slice names the points it touched.
- **Sleep timer** (quality bar point 9): 15 / 30 / 60 min — the forest and the playing fade out gently; one of Calm v1's controls (C6).

### RUN 7 sound pass — what was built, and an honest note on synthesis vs samples
- Two engine types: **modal** (struck bodies: Firefly rich, Handpan, Singing bowl, Kalimba) and **breath** (Breath flute, Breathing pad);
  six records, normalised to the app's normal solo level; listening page v2 with an A/B «In the forest / Dry». Record ids are permanent.
- **Where Web Audio synthesis falls short** (heard on any instrument made only of the browser's nodes): (1) no real physical model — a
  flute's breathy, slightly unstable tone comes from the air jet and the bore interacting; here it is imitated with noise filters and
  envelopes. Bowing friction and the small pitch fall of a hard strike on steel are not modelled either. A true model needs code per sample
  (an AudioWorklet — the stage-7 synthesis core, Rust → WebAssembly). (2) The solo voice is mono up to the track pan, so partials cannot spread
  in stereo inside one note (the width comes from the forest room; VOL-7 plans the per-voice stereo stage). (3) Sustained banks run all the
  time once built (rule #3): a breath voice costs ≈ 3.5× a Firefly voice. (4) A synthetic mode is a perfect sine; real modes wander
  slightly — the per-note variation covers only note-to-note differences.
- **A later SAMPLER engine type** (CC0 samples only — rule #32; a recorded note per zone and velocity layer, repitched within ± ½ semitone for
  our tunings; one-shot buffer sources per note like drum hits): worth it for the **flute** and a **voice / bowed pad** — the two hardest to
  synthesise convincingly; struck instruments (handpan, kalimba, bowl) are already close with modal synthesis. Costs: a few MB per
  instrument (offline cache — Calm is offline after install), a careful CC0 search (quality varies; the user's ear decides), one stateless
  module and its T5 bounds. Recommended only after the user's verdict on the six synthetic sounds.

### The user's timbre choice (2026-10-18, after the listening page v2)
- Item c) said «2–3 timbres»; the decision is **four**, in this order, the first the default: **Firefly** (`solo.firefly`, today's — the
  page's «Firefly · Светлячок»), **Breath flute** (`solo.breath-flute`), **Handpan** (`solo.handpan`), **Singing bowl** (`solo.singing-bowl`).
  Data: `data/profiles/calm.json`. Calm offers only these; Full keeps every timbre; nothing deleted. Probe row «CALM timbre set».
- Open: today's Firefly is 18 dB quieter than the other three in the app (measured) — a level decision is the user's (see WORK-LOG RUN 7).

## RUN 8 (2026-10-19) — the user's checks of steps 106–113, and what changed against this plan
- §4.2 depth: the prototype's distance colouring (dry 1 → 0.45, the lowpass on both) made a far note 5–9 dB quieter — the user: «depth changes
  only the amount of forest, never the loudness». A literal equal-power crossfade was measured too: it keeps the energy but not a struck note's
  loudness (4–6 dB down far). Built: the dry part ≈ level (−0.9 dB far), the room's send 0.5 → 2.5, the darkening on the send only; near →
  far within ±1 dB for the four sounds. The «Лес» slider is now the forest AT MOST (the room's reach and the ambience's level).
- §4.1 sounds: the crackle was the strikes piling up (measured). Calm caps them from its PROFILE (`voices`); the timbre records are as at
  RUN 7 and Full builds RUN 7's strike exactly (the user's decision after RUN 8: «Full must stay exactly as it was»). Calm's volume follows the
  hand's horizontal more gently: the far left = 30 % of the right (`volume.left`, data).
  Calm's levels are data (`levels` in the profile): Firefly +16.06 dB, the others −2 (matched, with headroom).
- §5 shell: the bars while playing (depth, the three effects), the effects hand's one-line hint, the fingertips as five fireflies, a quiet
  oval row glow; one message at a time. §3 picture: the room was hidden under the opaque 2D canvas — now screen-blended in Forest.
- §7 low power (C8, part): the «Lighter forest» choice is built (the FDN room matched to the forest by measurement, struck caps × 0.6, the
  picture at medium, no blur) — headroom +5…10 % on the user's laptop; NOT built: the automatic proposal (needs the phone numbers — ⓘ
  «Measure this device» collects them), disconnecting idle effect loops (the next lever, measured ≈ 15 % of the audio thread in Calm idle).

## RUN 9 (2026-10-19/20) — the living forest, and what changed against this plan
The user: «the forest creates the atmosphere but is empty — a person should want to stay in it for tens of minutes». Kept: the RUN 6 room
and three.js r128 (no new engine); no animals (moths only); no new ambience sound; Full untouched.
- §3.2 «what the picture reacts to» grew: each note sends a ring of light across the moss and pulses the glowing mushrooms / flowers nearby;
  the wild fireflies gather to the playing light and drift off after; Echo = rings on a new stream (with the moon's reflection), Wave = the
  leaves shimmer, Warmth / Brightness = the light's colour (as before) and the waves'; the moods (§4.5) now recolour the forest (Glow the old
  palette, Dusk violet / warm moon, Mist pale / thick mist — token sets).
- New: the night's slow cycle (24 min, seamless — the moon drifts, clouds pass, mist rolls), the sleep timer (§5) deepens it; detail (grass,
  falling leaves, moths, moonbeams, foreground silhouettes — the grass and ferns sway with the ambience's wind, §4.6); rare events every few
  minutes (a falling star, the five-dot emblem in fireflies, a flower opening on a long-held note — never the same twice in a row).
- §7 low power: the levels are now defined sets — high (0.85 × CSS px, 60 fps, the light's shadow), medium (0.6, 30 fps, no shadow — also
  the «Lighter forest»), low (no WebGL, the 2D stand-in). Measured on the user's laptop (Intel HD 4000, two hands, vs Dark): medium −6 %
  hand detections (in the 10 % budget), high −34…−36 % → the DEFAULT is now medium; the cost follows resolution and frame rate, not the
  added content. Opening the forest compiles its shaders (2–3 s the first time) — R2 «room off frees the GPU» still holds (Dark = no WebGL).
- Open questions for the user: in WORK-LOG «RUN 9» (the default level, the night's length, how often rare events come).
