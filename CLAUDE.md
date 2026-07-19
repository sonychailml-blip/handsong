# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Air Synth 3 is a gesture-controlled synthesizer and interactive scales/tunings tutorial that runs entirely in the browser. It uses the webcam + MediaPipe hand tracking to play notes/chords/bass/drums/effects with pinch gestures, synthesizing all sound with the Web Audio API. On top of live play it has a **beat-clock looper** (record intent, overdub layers, undo per layer) and an **arrangement** system (harmony/rhythm/bass dropped in as frozen layers). The UI text and code comments are in **Russian** — keep new user-facing strings and comments in Russian to match.

**The app is split into ES modules under `src/`, loaded via `<script type="module" src="src/main.js">`.** There is no build system, no package.json, no dependencies to install, and no tests — the modules load directly in the browser. `index.html` holds only markup; `style.css` holds all CSS; the only external dependency is `@mediapipe/tasks-vision`, loaded from a CDN via an ES module `import` in `vision.js`.

**Two control modes.** `phone` (the lead mode, vertical phone) binds a role to a hand by handedness and shows one role on screen at a time; `pc` (frozen, kept working) splits the screen into three X-columns any hand can play. New work targets the phone branch; the PC branch must stay intact but isn't extended. See "Screen model" below.

### Module map

- `index.html` — markup only: start screen, top bar, two settings panels (`#panelScale` overlay, `#panelLoop` working), help overlay, loop transport strip, `<video>`/`<canvas>`; links `style.css` and `src/main.js`.
- `style.css` — all CSS.
- `src/config.js` — zone boundaries, gesture thresholds, scheduler timings, voice-pool sizes, FX-bar geometry, typed-chord constants (`SECT_HYST`, `TYPED_CH_VOL`). Leaf: imports nothing.
- `src/state.js` — cross-cutting musical + mode state (`scaleIdx, tonic, seventh, leadIdx, chIdx, bassIdx, drumKitIdx, fx, revDisp, latchDeg, latchTy, chordFam, uiMode, phoneInstr, swapHands`) and its setters.
- `src/hooks.js` — the `hooks` object: nullable callbacks (`leadInstr, bassInstr, drumKit, rec, loop`) lower layers use to reach the DOM.
- `src/scales.js` — the teaching layer: `TRADITIONS`, `SCALES`, `scalesOfTrad`/`tradOfScale`, `baseF`, `chordSteps`, chord/row labels, cents, and the typed-chord tables (`CHORD_FAM_SETS`, `chordFams`, `rootName`). Predicates that gate behaviour off scale **properties**: `supportsProgressions`, `supportsChords` (`noChords`), `typedChords`. The source of truth for pitch.
- `src/audio.js` — the Web Audio engine: `AC` + all nodes, `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/`DRUM_KITS`, `initAudio`, `buildLeadBanks`, `buildChordPool`, the bass pool, the drone nodes and `droneOn`/`droneOff`, `drumHit` (+ darbuka kit), `metroClick`, `setLeadInstr`/`setBassInstr`/`setDrumKit`/`applyParams`/`noteOn`/`noteOff`, chord voice pool (`chordOn`/`chordGlide`/`chordOff`/`chordHold`), bass voice pool (`bassOn`/`bassSet`/`bassOff`/`bassHold`). The drone and darbuka voices were rescued here when `backing.js` was deleted.
- `src/arrange.js` — arrangement **data + pure generation**: `PROGRESSIONS`, `HARMONIES` (drone + progressions), `RHYTHMS`, `BASS_MODES`, and `buildArrangement(sel, ctx) → {bars, layers}`. No side effects (no `AC`, no `loop`); freezing and insertion happen in `recorder.loadArrangement`.
- `src/recorder.js` — record + **looper**: `events[]`, the `loop` object, the `W*`/`ENG` indirection, the beat-clock scheduler (`tick`/`schedClicks`/`fireWindow`), transport (`onRec`/`onLoop`/`onUndo`/`clearRec`/`panic`), `softAllOff`, `loadArrangement`, `setLoopBars`/`setLoopQuant`/`setLoopBpm`, `loopPos`/`loopChordDeg`. Freezes per-event scale context (`sc`/`sev`); the chord **type** rides in the event payload as `a.ty`.
- `src/vision.js` — camera + MediaPipe: the CDN import, `video`/`canvas`/`ctx`, the `roundRect` polyfill, `resize`, `landmarker`, `initVision`.
- `src/gestures.js` — the gesture state machine: `HANDS`, `leadOwner`/`chOwner`/`bassOwner`, `processHands`, `handRole` (phone role-by-handedness), and the zone/degree/sector helpers (`degHyst`, `sectHyst`, the `chFam` family-select zone).
- `src/draw.js` — canvas rendering: `drawVideoBackground`, `drawOverlays`, the grid/tag/looper/chord-sector/FX-bar helpers, the `#status` line, and the loop-transport strip position.
- `src/ui.js` — menu/buttons: `$`, element lookups, `buildUI`, every handler, the two-panel show/hide, and the `hooks` registrations. Side-effect module; exports only `$`.
- `src/main.js` — composition root: `loop()`, `lastTs`/`latest`, the `#startBtn` handler; imports `./ui.js` for its side effects.

> There is **no `backing.js`.** The generative backing track was removed; its drone and darbuka were folded into `audio.js`, and its role as a time source was replaced by the looper in `recorder.js`. If a doc or comment still mentions `backing.js`, `playRec`, `toggleRec`, `stopRec`, or `recStart`, it is stale.

## Running / developing

- Serve over **HTTPS or `localhost`** — `getUserMedia` (camera) and `navigator.wakeLock` require a secure context; opening `index.html` via `file://` will fail.
- Any static server works, e.g. `python -m http.server 8000` then open `http://localhost:8000`. Team default is VS Code Live Server on `http://127.0.0.1:5500`.
- Phone testing: `npx cloudflared tunnel --url http://localhost:5500` gives a fresh short-lived HTTPS URL. Bust cache with `?v=N`.
- The MediaPipe model, WASM, and library are fetched from `cdn.jsdelivr.net` / `storage.googleapis.com` at runtime — **an internet connection is required** even when serving locally.
- Requires a webcam and a browser with WebGL/GPU delegate support. Audio starts only after the user clicks "▶ Запустить" (browsers block autoplay before a user gesture).

## Architecture

The render loop lives in `main.js`. Each animation frame (`loop()`): draw the video frame → MediaPipe detects hands → `processHands()` (`gestures.js`) updates the gesture state machine and drives audio → `drawOverlays()` (`draw.js`) renders zones, teaching overlays, hand labels, the looper strip. Audio **is** driven from this loop: `processHands()` calls `WleadOn(...)` etc. ~60×/sec while a pinch is held; the recorder thins those frames into a few intent events per note (it records **intent, not frames** — see Looper).

### Screen model
- **PC (`uiMode==='pc'`, frozen):** three vertical columns split at `FXW=0.20` and `ZB=0.595` — **EFFECTS** (left) · **CHORDS** (center) · **SOLO** (right). Zone is locked at the moment of the pinch. Both hands independent, keyed by MediaPipe handedness.
- **Phone (`uiMode==='phone'`, lead):** one role fills the screen, chosen by `phoneInstr` (`'ld'`/`'ch'`/`'bs'`/`'dr'`, cycled by the role button). Role is bound to a **hand**, not a place: `handRole()` maps Right→notes, Left→fx (swapped by `swapHands`). The non-note hand only has a job where one exists — effects in the solo role, **chord-family select** (`chFam` zone) in a typed-chord chord role; otherwise it's idle.

### Gesture model
- **Pinch** = thumb (landmark 4) close to a fingertip (8/12/16/20). Distance is normalized by hand size (`pinchRatios`, wrist→index-base) so it works near and far from the camera.
- The pinched finger selects the **octave** (index=I … pinky=IV) and can be switched mid-pinch to glide.
- **Y** = scale degree (with hysteresis in `degHyst` so narrow micro-tonal rows don't trill at boundaries); **X within a column** = volume — **except** typed chords, where X is the type sector (`sectHyst`) and volume is fixed at `TYPED_CH_VOL`; **hand depth Z** (wrist→middle-base size) = reverb send, solo channel only.
- In the EFFECTS role/column, pinch selects an effect (delay/vibrato/drive/tremolo) and dragging up/down latches its value.

### Music theory (the "teaching" layer)
`SCALES` is the source of truth: each has `edo` (equal divisions of the octave — 12/19/24/31-TET), `iv` (degrees in those steps), a `tag` driving chord logic, a `trad` (tradition, for the scale menu), optional `grp` (submenu), and optional **behaviour properties**. Core formula everywhere: `f = baseF · 2^octave · 2^(step / edo)`.
- `chordSteps()` branches: 7-note diatonic/ethnic/maqam stack thirds (`i, i+2, i+4[, i+6]`); pentatonic/blues/chromatic use power chords (root + fifth + octave); pure-EDO scales (19/31-TET) build **by interval ratios** given on the scale (`chord`/`chord7`, e.g. 31-TET seventh = 4:5:6:7). A typed chord ignores all of that: `ty` (an interval array) is added straight to the root.
- `chordLabel` / `qual` / `SEV` derive chord names from intervals. Micro-tonal names come from `name24` (quarter-tones) or fall back to step numbers/cents.

### Behaviour properties (prefer these over `tag`/index checks)
Gates hang off **scale properties**, so they survive regrouping scales by tradition:
- `noChords` → the chord role builds nothing (Arabic maqam is monophonic; some degrees give a double quarter-tone). `supportsChords()`.
- `typedChords: '<key>'` → typed-chord mode; the value keys a family set in `CHORD_FAM_SETS` (`'chrom12'`, `'edo31'`). `typedChords()`/`chordFams()`.
- `supportsProgressions()` = 7 degrees (progressions like II–V–I only make sense there; the drone works in any tuning).

### Typed chords (Chromatic 12-TET, 31-TET)
Two dimensions instead of one. The **LEFT** hand's pinched finger picks the **family** (`chordFam`, sticky, default major — so the right hand always has something to play even if the left was never in frame); the **RIGHT** hand plays: Y = note, finger = octave, **X = sector = variant within the family**. Volume is off (X is the sector). `CHORD_FAM_SETS[key]` lists families → `types[]`; **the sector count is `types.length`** (drawing, hit-testing, hysteresis all read it — 6 is not hardcoded). The latch identity in a typed scale is the **pair (degree + type)**, not the degree alone, or C→C7 would read as "same chord" and mute instead of switching. Intervals in a set are **in that scale's own steps** — never give a set to a scale with a different `edo`.

### Audio engine (`initAudio`) — five parallel signal chains into one master
All hand-built Web Audio nodes; a `DynamicsCompressor` is a mandatory output limiter (`master → limiter → destination`). One shared `ConvolverNode` reverb; each source has its own send, but only the solo send (`revLead`) is Z-controlled.
1. **Solo chain** — `buildLeadBanks` builds 6 lead timbres (banks cross-faded by gain); signal flows preBus → saturation (drive) → envelope → volume → tremolo → `leadOut` → master, with post-`leadOut` delay and reverb sends. Only this chain is affected by the effects role and Z-reverb.
2. **Chord pool** — `buildChordPool` pre-starts `CHORD_POOL_N` always-on 2-oscillator voices, gated by gain and allocated per owner (`cvAlloc`/`chordOn`). `chordGlide` changes chords without re-attacking (voice-leading); re-attack only when the **note count** changes.
3. **Bass pool** — `BASS_POOL_N` always-on mono voices, one per owner/layer; timbre is baked on attack (so a recorded layer keeps its instrument). Level-staged like chords so bass doesn't slam the limiter.
4. **Drums** — synthesized per hit (no samples), kit chosen per hit from `a.kit` (Standard or Darbuka). Own bus into master.
5. **Drone** — a detuned saw pair through a slow LFO-swept low-pass, tuned to `baseF()/2`, follows the live tonic/scale. Gated by `dG` (`droneOn`/`droneOff`); it is a looper/arrangement layer, not a hand role.
Plus the **metronome** (`metroClick`) straight into master for count-in and overdub grid.

### Looper (`recorder.js`) — records intent, not frames
An event is `{t, layer, fn, a, sc, sev}`: `t` in **beats** inside the loop, pitch as **degree+octave** (`a.deg`/`a.oct`), plus the frozen scale (`sc`) and seventh flag (`sev`); the chord **type** rides as `a.ty`, the timbre as `a.inst`/`a.kit`. Frequency is derived at play time via `leadFreq`/`chordFreqs`/`bassFreq`, so the loop re-tunes to the live tonic while each layer keeps its frozen scale. One pump on the AudioContext clock (`tick`, `SCHED_TICK_MS`) plays a fixed-length loop (`loop.bars`); position `= ((now−t0)·bpm/60) mod loopBeats`; on wrap, hung voices are killed and events replay from the start. Live input goes through `W*` (sound now + record if armed); replay calls `ENG` **directly**, so replayed events aren't re-recorded. Overdub: the layer being recorded right now is *not* replayed (you hear it live). Voice owners are per layer — live chord `'latch'` / replayed `'loop:N'`; live bass `'bass'` / replayed `'bassloop:N'` — so a part can stack on itself. Quantize grid: chords→beat, bass→eighth, drums→sixteenth, solo unquantized.

### Per-event scale freeze = polymodality (load-bearing)
Each event remembers its own scale/seventh (`sc`/`sev`); `a.ty` remembers its own type. A layer plays in the scale it was **recorded** in, while the live hand plays in the **current** scale. Replay resolves pitch through the frozen `sc`, never the current one. This is how "chords from Chromatic + solo from a maqam" works: record one role in one scale, switch scale, play the other role live. Do not break this.

### Arrangement (`arrange.js` + `loadArrangement`)
`PROGRESSIONS` (II–V–I, I–vi–ii–V, I–IV–V, blues), `RHYTHMS` (backbeat, maqsum on a 16-step grid), `BASS_MODES` (none/roots/pedal), plus the drone as a harmony option. `buildArrangement` is pure and returns layers of `{t, fn, a}`; `loadArrangement` freezes the current scale/seventh onto each event and inserts them as fresh loop layers (undo peels from the top).

## Conventions

- Very terse, comment-heavy style with single-letter helpers (`$`, `range`, `clamp01`) and compact multi-statement lines. Match it rather than reformatting.
- No frameworks, no bundler — add a feature by editing the module that owns it:
  - a **scale** = one entry in `SCALES` (`scales.js`), added **at the end** (index is `scaleIdx`);
  - a **typed-chord family set** = one entry in `CHORD_FAM_SETS` keyed by a scale's `typedChords` value (`scales.js`);
  - a **lead timbre** = a block in `buildLeadBanks` + an entry in `LEAD_INSTR` (`audio.js`); a **chord/bass timbre** = an entry in `CHORD_INSTR`/`BASS_INSTR`; a **drum kit** = a branch in `drumHit` + an entry in `DRUM_KITS`;
  - a **gesture or timing threshold** = `config.js`;
  - a new **behaviour gate** = a scale **property** + a predicate in `scales.js`, never a `tag`/index check.

## Hard rules — do not break these

1. **AudioContext is created only inside the `#startBtn` click handler.** Never call `initAudio()` or `new AudioContext()` at module load, on import, or from any other event. Browsers block audio created outside a user gesture; the app fails silently.
2. **Never hardcode frequencies or note tables.** Every pitch derives from `baseF()`, the current (or frozen) scale's `edo` and `iv`, via `f = baseF · 2^octave · 2^(step/edo)`. Hardcoding silently breaks 19/24/31-TET.
3. **Pool oscillators start once and never stop.** Chord and bass voices are gated by GainNodes. Never create an oscillator per note — that causes clicks and leaks. (Per-hit sources — drums, metronome, drone LFO — are the deliberate exception.)
4. **The master limiter stays.** Chords + drive + bass + drums clip without it.
5. **Lower layers never touch the DOM.** `audio.js`, `arrange.js`, and `recorder.js` reach the UI only through `hooks.x && hooks.x(v)`. The implementations live only in `ui.js`, registered at its top level. `draw.js` is exempt — it is the presentational layer and owns the `#status` line and the loop-transport strip.
6. **Live bindings — never shadow another module's variable.** Write a variable only through its owner's setter (`setScaleIdx, setTonic, setSeventh, setLeadIdx, setChIdx, setBassIdx, setDrumKitIdx, setRevDisp, setLatchDeg, setLatchTy, setChordFam, setUiMode, setPhoneInstr, setSwapHands`); assigning an imported binding directly is a TypeError. Never copy state into a module-level `const` — that freezes it at load time. The looper scheduler re-reads `baseF()`/`CUR()`/`chordSteps()` every step; freeze any of them and changing scale or tonic mid-play silently stops re-tuning the pattern.
7. **Per-event scale freeze is the polymodality mechanism.** `push()` stamps `sc`/`sev` on every event and `a.ty` carries the chord type; `ENG` resolves pitch through the event's frozen `sc` on replay and the live scale for live input. Don't "simplify" replay to use the current scale — layers recorded in another tuning must sound as recorded.
8. **The video draw and `detectForVideo` must read the same camera frame.** `loop()` in `main.js` calls `drawVideoBackground()` (which does `drawImage(video)`) *before* `detectForVideo`, then `drawOverlays()` *after* — all in one synchronous tick. The video element's presented frame is frozen for the whole tick, so pixels and landmarks come from one frame and the screen shows *what will sound*. This is a coherence fix, not a latency fix — never count it as one. If frame-skipping is ever added, keep the video draw and the detect bound to the **same** frame, or the ~200ms desync returns silently on skipped frames.
9. **Phone is the lead mode; PC is frozen but must stay intact.** New behaviour goes under the phone branch / `if(uiMode==='phone')` (or scale properties) and must not break the PC path. "Don't build for PC" ≠ "break PC" — verify the PC path still works on each change.

## How to verify a change

There are no tests. Verification is manual and mandatory:

1. Serve via VS Code Live Server → `http://127.0.0.1:5500`; click "▶ Запустить", allow camera.
2. Solo role: pinch makes sound, Y = pitch, moving the pinched finger glides. Effects hand (left) moves the FX bars.
3. Chords role: pinch makes a chord; the looper strip and role button behave.
4. Looper: "●" counts in, records a layer, wraps into a loop; overdub adds a layer; "⤺" undoes the top layer; "＋ Добавить слои" drops an arrangement in.
5. Switch scale to **"31-TET — весь строй"** and **"Макам Раст"**. Micro-tonal and typed-chord paths break first and break silently.
6. Typed chords: in **"Хроматика (12 нот)"** and **31-TET**, the left hand's finger changes the family, the right hand's X changes the sector; the sector map is visible before touching; re-pinching the same degree+type turns it off.
7. Toggle to PC mode (`💻`): three columns still play with either hand.

Never report a change as done without stating which of these steps you could not verify.

## Language

- Code, comments, UI strings, `SCALES`/`CHORD_FAM_SETS` names: **Russian**. Never translate them, never "clean them up".
- Chat responses to the user: **English**. The Windows terminal mangles Cyrillic output, so Russian replies arrive unreadable.
