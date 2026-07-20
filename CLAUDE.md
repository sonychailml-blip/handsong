# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Air Synth 3 is a gesture-controlled synthesizer and interactive scales/tunings tutorial that runs entirely in the browser. It uses the webcam + MediaPipe hand tracking to play notes/chords/bass/drums/effects with pinch gestures, synthesizing all sound with the Web Audio API. On top of live play it has a **beat-clock looper** (record intent, overdub layers, undo per layer) and an **arrangement** system (harmony/rhythm/bass dropped in as frozen layers). The UI text and code comments are in **Russian** — keep new user-facing strings and comments in Russian to match.

**The app is split into ES modules under `src/`, loaded via `<script type="module" src="src/main.js">`.** There is no build system, no package.json, no dependencies to install, and no tests — the modules load directly in the browser. `index.html` holds only markup; `style.css` holds all CSS; the only external dependency is `@mediapipe/tasks-vision`, loaded from a CDN via an ES module `import` in `vision.js`.

**Two control modes.** `phone` (the lead mode, vertical phone) binds a role to a hand by handedness and shows one role on screen at a time; `pc` (frozen, kept working) splits the screen into three X-columns any hand can play. New work targets the phone branch; the PC branch must stay intact but isn't extended.

### Module map

- `index.html` — markup only: start screen, top bar, two settings panels (`#panelScale` overlay, `#panelLoop` working), help overlay, loop transport strip, `<video>`/`<canvas>`.
- `style.css` — all CSS.
- `src/config.js` — zone boundaries, gesture thresholds, scheduler timings, voice-pool sizes, FX-bar geometry, and the chord-palette geometry (`CH_PAL_W`, `CH_PAL_PAD`, `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `PAL_HYST_X`, `PAL_HYST_Y`, `palColX`/`palRowY`). Leaf: imports nothing.
- `src/state.js` — cross-cutting musical + mode state (`scaleIdx, tonic, seventh, leadIdx, chIdx, bassIdx, drumKitIdx, fx, revDisp, latchDeg, latchTy, chordFam, chordVar, uiMode, phoneInstr, swapHands`) and its setters. `chordFam`/`chordVar` = palette column/row, selected by position.
- `src/hooks.js` — the `hooks` object: nullable callbacks (`leadInstr, bassInstr, drumKit, rec, loop`) lower layers use to reach the DOM.
- `src/scales.js` — the teaching layer: `TRADITIONS`, `SCALES` (~49 entries, indices 0..48), `scalesOfTrad`/`tradOfScale`, `baseF`, `leadFreq`/`bassFreq`/`chordFreqs`, `chordSteps`, chord/row labels, `centsOf`, and the typed-chord tables (`CHORD_FAM_SETS`, `chordFams`, `rootName`). Predicates that gate behaviour off scale **properties**: `supportsProgressions`, `supportsChords` (`noChords`), `typedChords`. The source of truth for pitch.
- `src/audio.js` — the Web Audio engine (see "Audio engine").
- `src/arrange.js` — arrangement data + pure generation (`PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `BASS_MODES`, `buildArrangement`). No side effects.
- `src/recorder.js` — record + looper (`events[]`, `loop`, the `W*`/`ENG` indirection, beat-clock scheduler, transport, `softAllOff`, `loadArrangement`). Freezes per-event `sc`/`sev`; chord type rides as `a.ty`.
- `src/vision.js` — camera + MediaPipe (CDN import, `video`/`canvas`/`ctx`, `roundRect` polyfill, `resize`, `landmarker`, `initVision`).
- `src/gestures.js` — the gesture state machine: `HANDS`, `leadOwner`/`chOwner`/`bassOwner`, `processHands`, `handRole`, `degHyst`, and the palette hit-test (`axHyst` + `cellHyst`) used by the `chFam` zone.
- `src/draw.js` — canvas rendering: `drawVideoBackground`, `drawOverlays`, grid/tag/looper helpers, `drawChordPalette`, the FX bars, `#status`, the loop-transport strip position.
- `src/ui.js` — menu/buttons: `$`, `buildUI`, `fillScales` (groups the scale dropdown **by `grp` key**, not by array order), every handler, the two-panel show/hide, the `hooks` registrations. Side-effect module; exports only `$`.
- `src/main.js` — composition root: `loop()`, `lastTs`/`latest`, the `#startBtn` handler; imports `./ui.js` for side effects.

> There is **no `backing.js`**, and typed chords no longer use per-row sectors. Stale names to ignore if seen: `backing.js`, `playRec`, `toggleRec`, `stopRec`, `recStart`, `drawChordSectors`, `sectHyst`, `S.sect`, `TYPED_CH_VOL`.

## Running / developing

- Serve over **HTTPS or `localhost`** — camera + wakeLock need a secure context; `file://` fails. Team default: VS Code Live Server on `http://127.0.0.1:5500`.
- Phone testing: `npx cloudflared tunnel --url http://localhost:5500` (fresh short-lived HTTPS URL; bust cache with `?v=N`).
- MediaPipe model/WASM/library are fetched from CDNs at runtime — internet required even when serving locally. Needs a webcam + WebGL. Audio starts only on the "▶ Запустить" click.

## Architecture

The render loop lives in `main.js`. Each frame: draw the video → MediaPipe detects hands → `processHands()` updates the gesture state machine and drives audio → `drawOverlays()` renders. The recorder thins the ~60/sec engine calls into a few intent events per note.

### Screen model
- **PC (frozen):** three columns at `FXW=0.20`/`ZB=0.595` — EFFECTS · CHORDS · SOLO. Zone locks at pinch. Both hands independent, keyed by handedness.
- **Phone (lead):** one role fills the screen (`phoneInstr` = `'ld'/'ch'/'bs'/'dr'`, cycled by the role button). Role is bound to a hand: `handRole()` maps Right→notes, Left→fx (swapped by `swapHands`). The non-note hand only acts where a job exists — effects in solo, the chord-type palette in a typed-chord chord role.

### Gesture model
- **Pinch** = thumb (4) near a fingertip (8/12/16/20), normalized by hand size. The pinched finger selects the **octave register** (index=I … pinky=IV), switchable mid-pinch to glide.
- **Y** = scale degree (`degHyst`); **X** = volume (in a typed-chord chord role, over `[SPLIT, W]`); **Z** = reverb send, solo only.

### Typed chords — the palette (Chromatic 12-TET, 31-TET, 19-TET)
Scales with a `typedChords` property split the phone chord role: **left = a palette of chord types** (columns = families, rows = variants; counts from `chordFams()`/`types.length`, geometry in `palColX`/`palRowY`), **right = note rows**. The LEFT hand selects a cell by POSITION on a thumb+**index** pinch inside the palette (`S.oct===0 && S.x<SPLIT`); sticky, default first family/type. The RIGHT hand plays: Y=root, finger=octave, X=volume. `ty` is a live reference into `CHORD_FAM_SETS`; latch identity = (degree + type). Two-axis hysteresis `cellHyst`. **PC limitation (accepted):** the palette hand is phone-only, so PC plays the sticky selection and can't change type by gesture.

### Behaviour properties (prefer these over `tag`/index checks)
- `noChords` → chord role builds nothing (`supportsChords()` false). Maqams; also the gamelan cents-scales.
- `typedChords: '<key>'` → palette mode; keys a set in `CHORD_FAM_SETS`. Current keys: `'chrom12'`, `'edo31'`, `'edo19'`.
- `supportsProgressions()` = 7 degrees. Note: a 7-note `noChords` scale (maqams, pelog) is still gated out of progressions because `refreshProgAvail` uses `supportsProgressions() && supportsChords()`.

### Music theory & pitch
`SCALES` is the source of truth: each has `edo`, `iv` (degrees in those steps), `tag`, `trad` (tradition, for the menu), optional `grp` (submenu), optional behaviour properties. Traditions (`TRADITIONS`): Ладовая (`modal`), Арабская (`arab`, 24-TET maqamat), Микротональная (`micro`, 19/31-TET), Хроматика (`chrom`), Мировые строи (`world`, non-equal cents tunings). ~49 scales across three waves of additions plus the microtonal/world sets.

**Two ways to define pitch — equal steps OR cents:**
- **Equal (default):** within-octave ratio = `2^(iv[i]/edo)`. All EDO scales (12/19/24/31-TET etc.).
- **Cents overlay:** a scale may add an optional `cents:[...]` array (`length === iv.length`) giving each degree's exact cents above the tonic — for **non-equal** tunings (Javanese gamelan Слендро/Пелог; later Partch etc.). When `cents` is present, `leadFreq`/`bassFreq`/`centsOf` use it: within-octave ratio = `2^(cents[i]/1200)`, with the appended top = 1200¢ (octave). The scale STILL carries `edo`/`iv` as **nominal structure** (degree count, on-screen row layout, hysteresis) — cents overrides pitch only. The octave register `2^oct` is unchanged, so the period stays a true 2:1 (octave stretch/ombak is not modelled). Existing scales (no `cents`) run the old path byte-for-byte.
  - `chordSteps`/`chordFreqs` are NOT cents-aware — they still speak equal-`edo` steps. So a cents-scale must be `noChords` (gamelan is monophonic anyway). Chords on a cents-scale would need a parallel cents branch; that's future work.
- `chordSteps()` branches: a typed chord (`ty`) adds its interval array to the root; 7-note diatonic/ethnic/maqam stack thirds; pentatonic/blues/chromatic use power chords; pure-EDO (`tag:'edo'`) build by interval ratios (`chord`/`chord7`).
- `CHORD_FAM_SETS` intervals are in that scale's own steps (semitones/`chrom12`; 38.7¢/`edo31`; 63.2¢/`edo19`). Never give a set to a scale with a different `edo`.

### Audio engine (`initAudio`) — five chains into one master
`master → limiter → destination`. Shared `ConvolverNode` reverb (only the solo send is Z-controlled). Chains: (1) solo — banks → drive → envelope → volume → tremolo → delay/reverb; (2) chord pool (`CHORD_POOL_N` always-on 2-osc voices, gain-gated); (3) bass pool (`BASS_POOL_N` mono, timbre baked on attack); (4) drums (synth per hit, kit from `a.kit`); (5) drone (detuned saw pair, LFO-swept LP, follows the tonic). Plus the metronome.

### Looper & polymodality
An event is `{t, layer, fn, a, sc, sev}`: `t` in beats, pitch as degree+octave, frozen scale `sc`, `sev`, plus `a.ty`/`a.inst`/`a.kit`. Frequency is derived at play time via `leadFreq/chordFreqs/bassFreq(..., frozenSc)`, so the loop re-tunes to the live tonic while each layer keeps its frozen scale (**and its `cents` tuning**, for free). Replay via `ENG` isn't re-recorded. This is polymodality — don't "simplify" replay to the current scale.

## Conventions

- Terse, comment-heavy, single-letter helpers, compact lines. Match it.
- Add a feature in the module that owns it:
  - a **scale** = one entry in `SCALES`, **appended at the end** (index is `scaleIdx`; `state` and `sameDegrees` depend on it). Menu position is set by `trad`/`grp`, not array position — `fillScales` buckets by `grp` key.
  - a **cents (non-equal) scale** = same, plus a `cents:[...]` array (`length === iv.length`) and `noChords:true`; keep a valid `edo`/`iv` as nominal structure. Home tradition: `world`.
  - a **typed-chord family set** = one entry in `CHORD_FAM_SETS` keyed by a scale's `typedChords` value; intervals in that scale's steps.
  - a **timbre/kit** = an entry in `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/`DRUM_KITS`.
  - a **gesture/timing threshold** or palette geometry = `config.js`.
  - a **behaviour gate** = a scale property + a predicate in `scales.js`, never a `tag`/index check.

## Hard rules — do not break these

1. **AudioContext is created only inside the `#startBtn` click handler.**
2. **Never hardcode frequencies or note tables.** Pitch derives from `baseF()` and the current (or frozen) scale — either `2^(iv/edo)` or the `cents` overlay `2^(cents/1200)`. Hardcoding breaks the microtonal and cents tunings.
3. **Pool oscillators start once and never stop** (chord/bass gated by GainNodes; per-hit drums/metronome/drone LFO are the exception).
4. **The master limiter stays.**
5. **Lower layers never touch the DOM** — `audio.js`, `arrange.js`, `recorder.js` reach the UI only via `hooks`. `draw.js` is exempt.
6. **Live bindings — write state only through its setter**, never a module-level `const`. The looper re-reads `baseF()`/`CUR()`/`chordSteps()` every step.
7. **Per-event scale freeze is the polymodality mechanism** (`sc`/`sev`/`a.ty`, and `cents` rides on the frozen `sc`).
8. **The video draw and `detectForVideo` read the same camera frame** (`drawVideoBackground()` before detect, `drawOverlays()` after, one synchronous tick).
9. **Phone is the lead mode; PC is frozen but must stay intact.** New behaviour goes under the phone branch / scale properties. Consequence today: typed-chord type-select is phone-only.

## How to verify a change

No tests. Verification is **manual, in the browser** — do not run node, a server, headless Chrome, or any automated test/git command; that is the user's job.

1. Serve, "▶ Запустить", allow camera, **portrait**.
2. Solo/chords/bass/drums roles play; looper records/overdubs/undoes; arrangement drops in.
3. Typed chords (Хроматика, 31-TET, 19-TET): left index pinch selects a palette cell; right hand plays; 19-TET pure minor beats less than 12-TET minor; 31-TET `дом7` = 4:5:6:7.
4. Cents scales (Мировые строи → Слендро/Пелог): sound UNEVEN (gamelan), octave a clean 2:1, play-tag cents read the real values; chords show the no-chords hint.
5. Menu: each tradition's `grp` subgroups render once, in order (Ладовая has Диатоника/Лады(моды)/Этнические/Пентатоника-блюз/Симметричные/Экзотические/Мировые пентатоники/Японские; Арабская has one Макамы group).
6. A few existing scales unchanged; PC mode still plays three columns.

Never report a change as done without stating which steps you could not verify.

## Language

- Code, comments, UI strings, `SCALES`/`CHORD_FAM_SETS` names: **Russian**. Never translate or "clean up".
- Chat responses to the user: **English** (the Windows terminal mangles Cyrillic).
