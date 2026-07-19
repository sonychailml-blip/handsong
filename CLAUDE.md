# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Air Synth 3 is a gesture-controlled synthesizer and interactive scales/tunings tutorial that runs entirely in the browser. It uses the webcam + MediaPipe hand tracking to play notes/chords/bass/drums/effects with pinch gestures, synthesizing all sound with the Web Audio API. On top of live play it has a **beat-clock looper** (record intent, overdub layers, undo per layer) and an **arrangement** system (harmony/rhythm/bass dropped in as frozen layers). The UI text and code comments are in **Russian** — keep new user-facing strings and comments in Russian to match.

**The app is split into ES modules under `src/`, loaded via `<script type="module" src="src/main.js">`.** There is no build system, no package.json, no dependencies to install, and no tests — the modules load directly in the browser. `index.html` holds only markup; `style.css` holds all CSS; the only external dependency is `@mediapipe/tasks-vision`, loaded from a CDN via an ES module `import` in `vision.js`.

**Two control modes.** `phone` (the lead mode, vertical phone) binds a role to a hand by handedness and shows one role on screen at a time; `pc` (frozen, kept working) splits the screen into three X-columns any hand can play. New work targets the phone branch; the PC branch must stay intact but isn't extended. See "Screen model" below.

### Module map

- `index.html` — markup only: start screen, top bar, two settings panels (`#panelScale` overlay, `#panelLoop` working), help overlay, loop transport strip, `<video>`/`<canvas>`; links `style.css` and `src/main.js`.
- `style.css` — all CSS.
- `src/config.js` — zone boundaries, gesture thresholds, scheduler timings, voice-pool sizes, FX-bar geometry, and the chord-palette geometry (`CH_PAL_W`, `CH_PAL_PAD`, `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `PAL_HYST_X`, `PAL_HYST_Y`, and the `palColX`/`palRowY` cell-layout helpers shared by hit-testing and drawing). Leaf: imports nothing.
- `src/state.js` — cross-cutting musical + mode state (`scaleIdx, tonic, seventh, leadIdx, chIdx, bassIdx, drumKitIdx, fx, revDisp, latchDeg, latchTy, chordFam, chordVar, uiMode, phoneInstr, swapHands`) and its setters. `chordFam` = palette column (family), `chordVar` = palette row (variant) — both selected by **position**, not finger.
- `src/hooks.js` — the `hooks` object: nullable callbacks (`leadInstr, bassInstr, drumKit, rec, loop`) lower layers use to reach the DOM.
- `src/scales.js` — the teaching layer: `TRADITIONS`, `SCALES`, `scalesOfTrad`/`tradOfScale`, `baseF`, `chordSteps`, chord/row labels, cents, and the typed-chord tables (`CHORD_FAM_SETS`, `chordFams`, `rootName`). Predicates that gate behaviour off scale **properties**: `supportsProgressions`, `supportsChords` (`noChords`), `typedChords`. The source of truth for pitch.
- `src/audio.js` — the Web Audio engine: `AC` + all nodes, `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/`DRUM_KITS`, `initAudio`, `buildLeadBanks`, `buildChordPool`, the bass pool, the drone nodes and `droneOn`/`droneOff`, `drumHit` (+ darbuka kit), `metroClick`, `setLeadInstr`/`setBassInstr`/`setDrumKit`/`applyParams`/`noteOn`/`noteOff`, chord voice pool (`chordOn`/`chordGlide`/`chordOff`/`chordHold`), bass voice pool (`bassOn`/`bassSet`/`bassOff`/`bassHold`). The drone and darbuka voices were rescued here when `backing.js` was deleted.
- `src/arrange.js` — arrangement **data + pure generation**: `PROGRESSIONS`, `HARMONIES` (drone + progressions), `RHYTHMS`, `BASS_MODES`, and `buildArrangement(sel, ctx) → {bars, layers}`. No side effects.
- `src/recorder.js` — record + **looper**: `events[]`, the `loop` object, the `W*`/`ENG` indirection, the beat-clock scheduler, transport (`onRec`/`onLoop`/`onUndo`/`clearRec`/`panic`), `softAllOff`, `loadArrangement`, `setLoopBars`/`setLoopQuant`/`setLoopBpm`, `loopPos`/`loopChordDeg`. Freezes per-event scale context (`sc`/`sev`); the chord **type** rides in the event payload as `a.ty`.
- `src/vision.js` — camera + MediaPipe: the CDN import, `video`/`canvas`/`ctx`, the `roundRect` polyfill, `resize`, `landmarker`, `initVision`.
- `src/gestures.js` — the gesture state machine: `HANDS`, `leadOwner`/`chOwner`/`bassOwner`, `processHands`, `handRole` (phone role-by-handedness), the degree helper `degHyst`, and the palette hit-test (`axHyst` one-axis engine + `cellHyst` two-axis) used by the `chFam` zone.
- `src/draw.js` — canvas rendering: `drawVideoBackground`, `drawOverlays`, the grid/tag/looper helpers, `drawChordPalette`, the FX bars, the `#status` line, and the loop-transport strip position.
- `src/ui.js` — menu/buttons: `$`, element lookups, `buildUI`, `fillScales` (groups the scale dropdown **by `grp` key**, not by array order — see Conventions), every handler, the two-panel show/hide, and the `hooks` registrations. Side-effect module; exports only `$`.
- `src/main.js` — composition root: `loop()`, `lastTs`/`latest`, the `#startBtn` handler; imports `./ui.js` for its side effects.

> There is **no `backing.js`**, and typed chords no longer use per-row sectors. If a doc or comment still mentions `backing.js`, `playRec`, `toggleRec`, `stopRec`, `recStart`, `drawChordSectors`, `sectHyst`, `S.sect`, or `TYPED_CH_VOL`, it is stale — all of those were removed.

## Running / developing

- Serve over **HTTPS or `localhost`** — `getUserMedia` (camera) and `navigator.wakeLock` require a secure context; opening `index.html` via `file://` will fail.
- Team default is VS Code Live Server on `http://127.0.0.1:5500`. Any static server works.
- Phone testing: `npx cloudflared tunnel --url http://localhost:5500` gives a fresh short-lived HTTPS URL. Bust cache with `?v=N`.
- The MediaPipe model, WASM, and library are fetched from `cdn.jsdelivr.net` / `storage.googleapis.com` at runtime — **an internet connection is required** even when serving locally.
- Requires a webcam and a browser with WebGL/GPU delegate support. Audio starts only after the user clicks "▶ Запустить" (browsers block autoplay before a user gesture).

## Architecture

The render loop lives in `main.js`. Each animation frame (`loop()`): draw the video frame → MediaPipe detects hands → `processHands()` (`gestures.js`) updates the gesture state machine and drives audio → `drawOverlays()` (`draw.js`) renders zones, teaching overlays, hand labels, the looper strip. The recorder thins the ~60/sec engine calls into a few intent events per note (it records **intent, not frames** — see Looper).

### Screen model
- **PC (`uiMode==='pc'`, frozen):** three vertical columns split at `FXW=0.20` and `ZB=0.595` — **EFFECTS** (left) · **CHORDS** (center) · **SOLO** (right). Zone is locked at the moment of the pinch. Both hands independent, keyed by MediaPipe handedness.
- **Phone (`uiMode==='phone'`, lead):** one role fills the screen, chosen by `phoneInstr` (`'ld'`/`'ch'`/`'bs'`/`'dr'`, cycled by the role button). Role is bound to a **hand**, not a place: `handRole()` maps Right→notes, Left→fx (swapped by `swapHands`). The non-note hand only has a job where one exists — effects in the solo role, the **chord-type palette** in a typed-chord chord role; otherwise it's idle.

### Gesture model
- **Pinch** = thumb (landmark 4) close to a fingertip (8/12/16/20). Distance is normalized by hand size (`pinchRatios`, wrist→index-base) so it works near and far from the camera.
- The pinched finger selects the **octave** (index=I … pinky=IV) and can be switched mid-pinch to glide.
- **Y** = scale degree (with hysteresis in `degHyst`); **X within a column** = volume — in a typed-chord chord role the note rows sit in the right region and X maps to volume over `[SPLIT, W]` (`SPLIT = CH_PAL_W·W`); **hand depth Z** = reverb send, solo channel only.
- In the EFFECTS role/column, pinch selects an effect and dragging up/down latches its value.

### Typed chords — the palette (Chromatic 12-TET, 31-TET, 19-TET)
Scales with a `typedChords` property split the phone chord role into two regions with a divider at `SPLIT`:
- **Left = a palette of chord types.** Columns are families, rows are the variants within a family. Both counts come straight from data (`chordFams().length`; each column's own `types.length`) — the layout is ragged-safe, nothing is hardcoded to 4×6. Geometry lives in `palColX`/`palRowY` in `config.js`, so hit-testing and drawing read the **same** functions and can't drift.
- **The LEFT (non-note) hand selects a cell by POSITION.** It fires only on a thumb+**index** pinch (`S.oct===0`) that is inside the palette (`S.x < SPLIT`); a middle/ring/pinky pinch, or a left pinch that strays into the note region, changes nothing. Selection is **sticky** — it holds after release and when the hand leaves frame, until another cell is pinched. Default is the first family / first type (major triad), so the right hand plays alone. Finger identity carries **no** meaning on this hand — position does. Two-axis hysteresis (`cellHyst`, built from the one-axis `axHyst`) keeps narrow cells from jittering; its previous state lives on the hand (`S.pc`/`S.pr`) so a re-pinch starts clean.
- **The RIGHT hand plays as a normal chord role:** Y = root degree, pinched finger = octave, **X = volume** over the right region. The selected type's interval array (`ty`) is added to the root by `chordSteps`. The latch identity is the **pair (degree + type)** — `ty` is a live reference into `CHORD_FAM_SETS`, so `ty===latchTy` and the loop's `a.ty` freeze stay valid.
- **PC limitation (accepted):** the palette hand exists only in phone mode, so in PC a typed scale plays the sticky selection and its type **cannot be changed by gesture**. Volume works. Typed chords are a phone feature; this is a documented limitation, not a bug (see rule 9).

### Behaviour properties (prefer these over `tag`/index checks)
Gates hang off **scale properties**, so they survive regrouping scales by tradition:
- `noChords` → the chord role builds nothing (Arabic maqam is monophonic). `supportsChords()`.
- `typedChords: '<key>'` → palette mode; the value keys a family set in `CHORD_FAM_SETS`. Current keys: `'chrom12'`, `'edo31'`, `'edo19'`. `typedChords()`/`chordFams()`.
- `supportsProgressions()` = 7 degrees (progressions like II–V–I only make sense there; the drone works in any tuning).

### Music theory
`SCALES` is the source of truth: each has `edo`, `iv` (degrees in those steps), a `tag`, a `trad` (tradition, for the scale menu), optional `grp` (submenu), and optional behaviour properties. Core formula everywhere: `f = baseF · 2^octave · 2^(step / edo)`.
- `chordSteps()` branches: a typed chord (`ty` present) adds the interval array to the root and ignores the scale's own chord logic; 7-note diatonic/ethnic/maqam stack thirds; pentatonic/blues/chromatic use power chords; pure-EDO scales (19/31-TET, `tag:'edo'`) build **by interval ratios** given on the scale (`chord`/`chord7`) — the fallback used when no `ty` is supplied (e.g. a PC-recorded layer without a type).
- `CHORD_FAM_SETS` intervals are **in that scale's own steps** (semitones for `chrom12`; 38.7¢ steps for `edo31`; 63.2¢ steps for `edo19`). Never give a set to a scale with a different `edo`. Each tuning's set is built around what that tuning does best: `edo31` around the just 4:5:6:7 seventh and neutral thirds; `edo19` around its near-just 6/5 minor third and 5/3 sixth (its major third is the compromise).

### Audio engine (`initAudio`) — five parallel signal chains into one master
`master → limiter → destination`. One shared `ConvolverNode` reverb; only the solo send (`revLead`) is Z-controlled. Chains: (1) solo — banks → drive → envelope → volume → tremolo → delay/reverb sends; (2) chord pool (`CHORD_POOL_N` always-on 2-osc voices, gated by gain); (3) bass pool (`BASS_POOL_N` mono voices, timbre baked on attack); (4) drums (synth per hit, kit from `a.kit`); (5) drone (detuned saw pair, slow LFO-swept low-pass, follows the tonic). Plus the metronome straight into master.

### Looper (`recorder.js`) — records intent, not frames
An event is `{t, layer, fn, a, sc, sev}`: `t` in beats, pitch as degree+octave, the frozen scale `sc` and seventh flag `sev`, plus `a.ty`/`a.inst`/`a.kit`. Frequency is derived at play time, so the loop re-tunes to the live tonic while each layer keeps its frozen scale. Live input goes through `W*` (sound now + record if armed); replay calls `ENG` directly so it isn't re-recorded. Quantize grid: chords→beat, bass→eighth, drums→sixteenth, solo unquantized.

### Per-event scale freeze = polymodality (load-bearing)
Each event remembers its own scale/seventh (`sc`/`sev`) and type (`a.ty`). A layer plays in the scale it was recorded in while the live hand plays in the current scale; replay resolves pitch through the frozen `sc`, never the current one. This is how "chords from Chromatic + solo from a maqam" works. With three typed tunings now, a 19-TET layer heard against a 31-TET or 12-TET live scale is an audible check that the freeze holds.

## Conventions

- Very terse, comment-heavy style with single-letter helpers and compact multi-statement lines. Match it rather than reformatting.
- No frameworks, no bundler — add a feature by editing the module that owns it:
  - a **scale** = one entry in `SCALES` (`scales.js`), added **at the end** (index is `scaleIdx`; `state` and `sameDegrees` depend on it). Its menu position is set by `trad`/`grp`, **not** by array position — `fillScales` buckets by `grp` key, so an appended scale still lands inside its group.
  - a **typed-chord family set** = one entry in `CHORD_FAM_SETS` keyed by a scale's `typedChords` value; intervals in that scale's steps. Adding a family = adding a column; adding a variant = adding a row. Counts flow from array lengths.
  - a **lead/chord/bass timbre** = an entry in `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR` (+ a bank block for leads); a **drum kit** = a branch in `drumHit` + an entry in `DRUM_KITS`.
  - a **gesture or timing threshold** = `config.js`; palette geometry also lives there.
  - a new **behaviour gate** = a scale **property** + a predicate in `scales.js`, never a `tag`/index check.

## Hard rules — do not break these

1. **AudioContext is created only inside the `#startBtn` click handler.** Never at module load, on import, or from any other event.
2. **Never hardcode frequencies or note tables.** Every pitch derives from `baseF()` and the current (or frozen) scale's `edo`/`iv`. Typed-chord intervals are per-scale steps for the same reason.
3. **Pool oscillators start once and never stop.** Chord and bass voices are gated by GainNodes. Per-hit sources (drums, metronome, drone LFO) are the deliberate exception.
4. **The master limiter stays.** Chords + drive + bass + drums clip without it.
5. **Lower layers never touch the DOM.** `audio.js`, `arrange.js`, and `recorder.js` reach the UI only through `hooks.x && hooks.x(v)`, registered in `ui.js`. `draw.js` is exempt — it owns the `#status` line and the loop-transport strip.
6. **Live bindings — never shadow another module's variable.** Write state only through its setter (`setScaleIdx, setTonic, setSeventh, setLeadIdx, setChIdx, setBassIdx, setDrumKitIdx, setRevDisp, setLatchDeg, setLatchTy, setChordFam, setChordVar, setUiMode, setPhoneInstr, setSwapHands`). Never copy state into a module-level `const`. The looper scheduler re-reads `baseF()`/`CUR()`/`chordSteps()` every step.
7. **Per-event scale freeze is the polymodality mechanism.** `sc`/`sev`/`a.ty` are stamped on every event and resolved through the frozen `sc` on replay. Don't "simplify" replay to use the current scale.
8. **The video draw and `detectForVideo` must read the same camera frame.** `drawVideoBackground()` before detect, `drawOverlays()` after, all in one synchronous tick. This is a coherence fix, not a latency fix.
9. **Phone is the lead mode; PC is frozen but must stay intact.** New behaviour goes under the phone branch / scale properties and must not break the PC path. "Don't build for PC" ≠ "break PC" — verify the PC path still works on each change. (Consequence today: typed-chord type-select is phone-only; PC plays the sticky selection.)

## How to verify a change

There are no tests. Verification is **manual, in the browser** — do not run node, a local server, headless Chrome, or any automated test/git command; that is the user's job.

1. Serve, click "▶ Запустить", allow camera, **portrait**.
2. Solo role: pinch sounds, Y = pitch, moving the pinched finger glides; the left hand moves the FX bars.
3. Chords role, non-typed (e.g. Мажор): both hands play, X = volume full width.
4. Looper: "●" counts in, records a layer, wraps into a loop; overdub adds a layer; "⤺" undoes the top layer; "＋ Добавить слои" drops an arrangement in.
5. Typed chords in **Хроматика**, **31-TET**, **19-TET**: the left **index** pinch selects a palette cell (column = family, row = variant); a middle/ring/pinky left pinch does nothing; the selection sticks and stays highlighted with no hand present; the right hand plays it from any root, finger = octave, X = volume over the right region. 19-TET pure minor should beat noticeably less than a 12-TET minor; 31-TET `дом7` is the just 4:5:6:7. Long 31-/19-TET labels wrap to two lines, never below 10px.
6. Scale menu: Строй → Ладовая shows **one** Диатоника group with all six diatonic scales (major and minor variants together); other groups render once each; Хроматика/Арабская/Микротональная stay as bare options.
7. PC mode (`💻`): three columns still play with either hand (typed type-select is expected to be unavailable here).

Never report a change as done without stating which of these steps you could not verify.

## Language

- Code, comments, UI strings, `SCALES`/`CHORD_FAM_SETS` names: **Russian**. Never translate them, never "clean them up".
- Chat responses to the user: **English**. The Windows terminal mangles Cyrillic output.
