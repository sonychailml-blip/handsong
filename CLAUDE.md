# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Air Synth 3 is a gesture-controlled synthesizer and interactive scales/tunings tutorial that runs entirely in the browser. It uses the webcam + MediaPipe hand tracking to play notes/chords/bass/drums/effects with pinch gestures, synthesizing all sound with the Web Audio API. On top of live play it has a **beat-clock looper** (record intent, overdub layers, undo per layer) and an **arrangement** system (harmony/rhythm/bass dropped in as frozen layers). The UI text and code comments are in **Russian** — keep new user-facing strings and comments in Russian to match.

**The app is split into ES modules under `src/`, loaded via `<script type="module" src="src/main.js">`.** There is no build system, no package.json, no dependencies to install, and no tests — the modules load directly in the browser. `index.html` holds only markup; `style.css` holds all CSS; the only external dependency is `@mediapipe/tasks-vision`, loaded from a CDN via an ES module `import` in `vision.js`.

**Two control modes.** `phone` (the lead mode, vertical phone) binds a role to a hand by handedness and shows one role on screen at a time; `pc` (frozen, kept working) splits the screen into three X-columns any hand can play. New work targets the phone branch; the PC branch must stay intact but isn't extended.

### Module map

- `index.html` — markup only: start screen, top bar, two settings panels (`#panelScale` overlay, `#panelLoop` working), help overlay, loop transport strip, `<video>`/`<canvas>`.
- `style.css` — all CSS.
- `src/config.js` — zone boundaries, gesture thresholds, scheduler timings, voice-pool sizes, FX-bar geometry, the chord-palette geometry (`CH_PAL_W`, `CH_PAL_PAD`, `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `PAL_HYST_X`, `PAL_HYST_Y`, `palColX`/`palRowY`), and the rect-grid band geometry `rectBandY(i,H,nRect)` (single-source pixel band, bottom band = index 0, shared by gestures' hit-test and draw). Leaf: imports nothing. (`RECT_OCT` was retired — the octave is now a playable rectangle, register in `state.js`.)
- `src/state.js` — cross-cutting musical + mode state (`scaleIdx, tonic, seventh, leadIdx, chIdx, bassIdx, drumKitIdx, fx, revDisp, latchDeg, latchTy, chordFam, chordVar, uiMode, phoneInstr, swapHands`) and its setters. `chordFam`/`chordVar` = palette column/row, selected by position. Plus the rect-model registers `octReg`/`bassOctReg`/`chordOctReg` (per-role sticky octave, chosen in the octave rectangle) and the `theremin` toggle — all live bindings with setters. **The role→register resolver `rectOctReg()`/`setRectOctReg()` lives here** (one place, keyed on `phoneInstr`: `ch`→`chordOctReg`, `bs`→`bassOctReg`, else `octReg`); no `phoneInstr==='…'` register ternary elsewhere.
- `src/hooks.js` — the `hooks` object: nullable callbacks (`leadInstr, bassInstr, drumKit, rec, loop`) lower layers use to reach the DOM.
- `src/scales.js` — the teaching layer: `TRADITIONS`, `SCALES` (50 entries, indices 0..49), `scalesOfTrad`/`tradOfScale`, `baseF`, `leadFreq`/`bassFreq`/`chordFreqs` (the last with a **cents-aware branch** for typed chords on a cents-scale — Partch), `chordSteps`, chord/row labels, `centsOf`, and the typed-chord tables (`CHORD_FAM_SETS`, `chordFams`, `rootName`). Predicates that gate behaviour off scale **properties**: `supportsProgressions`, `supportsChords` (`noChords`), `typedChords`, `rectGrid`; plus the rect helpers `rectRows`/`rectRowsFull` and the theremin partition/pitch helpers `thereminSpan`/`thereminHz` (the shared y→note single source, log/cents interpolation). The source of truth for pitch.
- `src/audio.js` — the Web Audio engine (see "Audio engine").
- `src/arrange.js` — arrangement data + pure generation (`PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `BASS_MODES`, `buildArrangement`). No side effects.
- `src/recorder.js` — record + looper (`events[]`, `loop`, the `W*`/`ENG` indirection, beat-clock scheduler, transport, `softAllOff`, `loadArrangement`). Freezes per-event `sc`/`sev`; chord type rides as `a.ty`.
- `src/vision.js` — camera + MediaPipe (CDN import, `video`/`canvas`/`ctx`, `roundRect` polyfill, `resize`, `landmarker`, `initVision`).
- `src/gestures.js` — the gesture state machine: `HANDS`, `leadOwner`/`chOwner`/`bassOwner`, `processHands`, `handRole`, `degHyst`/`degRaw`, and the palette hit-test (`axHyst` + `cellHyst`) used by the `chFam` zone. Also the **rect model** (`rectPlay` band→note mapping via `rectRowsFull`/`degHyst`), the **`'oct'` zone** (position-captured octave rectangle → `setRectOctReg`; SPLIT-gated in chords), and the **`theremin`** solo branch (continuous Hz via `thereminHz`, passed to `WleadOn` as a live-only override).
- `src/draw.js` — canvas rendering: `drawVideoBackground`, `drawOverlays`, grid/tag/looper helpers, `drawGrid`, `drawRectGrid` (rect note rectangles, parameterized x-extent for the chord right-half), `drawRectOctBand` (the shared octave-rectangle render), `drawThereminGrid` (fine note-lines), `drawChordPalette`, the FX bars, `#status`, the loop-transport strip position.
- `src/ui.js` — menu/buttons: `$`, `buildUI`, `fillScales` (groups the scale dropdown **by `grp` key**, not by array order), every handler (incl. the `〰` theremin toggle, `applyTheremin` — phone-solo-only visibility), the two-panel show/hide, the `hooks` registrations. Side-effect module; exports only `$`.
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
- **Pinch** = thumb (4) near a fingertip (8/12/16/20), normalized by hand size. The pinched finger (`S.oct`) selects the **octave register** (index=I … pinky=IV), switchable mid-pinch to glide — **except in the rect model** (below), where it selects the note-in-rectangle and the octave comes from the octave rectangle.
- **Y** = scale degree (`degHyst`); **X** = volume (in a typed-chord chord role, over `[SPLIT, W]`); **Z** = reverb send, solo only.

### Rect model — "4 notes per rectangle" (shipped: phone SOLO, BASS, CHORDS)
For scales with a **`rectGrid`** property (today: 19-TET, 31-TET, Partch), the phone note grid is not N narrow rows but **fat rectangles**: `rectRows()=(iv.length+1)/4` note rectangles + **1 octave rectangle** at the bottom = `rectRowsFull()=rectRows()+1` bands. Band pixel geometry is single-sourced in `rectBandY` (config) and the count in `rectRows`/`rectRowsFull` (scales); gestures' hit-test (`degHyst` on `rectRowsFull()`) and draw partition H the same way, so finger and screen never drift. **Y selects the rectangle** (band); the pinched **finger I–IV = 1 of 4 notes/roots** inside it (`deg = (band−1)*4 + finger`, clamped). Requires `(iv.length+1)%4===0`.
- **Octave rectangle** (band 0, bottom): pinching it — by **position**, so ANY hand captures it (`'oct'` zone, overrides role; in chords it's SPLIT-gated to the right half so the palette hand isn't captured) — sets a **per-role sticky register** via `setRectOctReg()`: solo→`octReg`, bass→`bassOctReg`, chords→`chordOctReg`. This solved the old "finger-busy-so-octave-is-lost" blocker; the register survives the hand leaving the band/frame. The `'oct'` hand is silent (no note, no owner).
- **Chords**: rect applies to the ROOT rows only, in the right half `[SPLIT,W]`; the left palette is unchanged; the type still rides the sticky palette; the latch logic (same-off/re-attack/glide) is unchanged — only the root degree + octave source changed.
- Non-`rectGrid` scales and PC keep the narrow-row model byte-for-byte.

### Theremin — continuous pitch (shipped: phone SOLO only)
A `theremin` toggle (the `〰` button next to the role, phone-solo-only) makes solo pitch a **continuous function of y** (bends/vibrato) instead of quantizing to a step. `thereminSpan`/`thereminHz` (scales) map y→a fractional note position over the **same** partition draw uses, then interpolate **linear-in-cents** (`log2` of the two neighbours' `leadFreq`) — correct for unequal Partch/gamelan spacing. Each rectangle shows 4 fine note-lines (`drawThereminGrid`). It is **live-only**: the continuous Hz rides a **live-only 3rd arg of `ENG.leadOn`** (never recorded), while the looper still stores the nearest step (`S.deg`, event format unchanged) — glide-into-loop is a later task. The octave rectangle still sets the register.

### Typed chords — the palette (Chromatic 12-TET, 31-TET, 19-TET, Partch)
Scales with a `typedChords` property split the phone chord role: **left = a palette of chord types** (columns = families, rows = variants; counts from `chordFams()`/`types.length`, geometry in `palColX`/`palRowY`), **right = note rows**. The LEFT hand selects a cell by POSITION on a thumb+**index** pinch inside the palette (`S.oct===0 && S.x<SPLIT`); sticky, default first family/type. The RIGHT hand plays: Y=root, X=volume, and the octave — **on the non-rect scale chrom12** the finger picks it, **on the rect scales (19-TET/31-TET/Partch)** the finger picks the root-in-rectangle and the octave comes from the octave rectangle (`chordOctReg`). `ty` is a live reference into `CHORD_FAM_SETS`; latch identity = (degree + type). Two-axis hysteresis `cellHyst`. **PC limitation (accepted):** the palette hand is phone-only, so PC plays the sticky selection and can't change type by gesture.

`typedChords` keys → sets in `CHORD_FAM_SETS`: `'chrom12'`, `'edo19'`, `'edo31'` (integer steps in that scale's own edo), and **`'partch'`** (11-limit **ratios** — 4 columns × 6: О otonal / У utonal / Диез 7-11 septimal-undecimal / Станд. familiar-labelled). Partch's set is priced by the cents-aware `chordFreqs` branch (see below), not by edo steps.

### Behaviour properties (prefer these over `tag`/index checks)
- `noChords` → chord role builds nothing (`supportsChords()` false). Maqams; and the **gamelan** cents-scales (Слендро/Пелог, monophonic by choice). Partch is **not** `noChords` — it has typed chords.
- `typedChords: '<key>'` → palette mode; keys a set in `CHORD_FAM_SETS`. Current keys: `'chrom12'`, `'edo19'`, `'edo31'`, `'partch'`.
- `rectGrid: true` → the "4 notes per rectangle" layout for phone solo/bass/chords. Only on scales where **`(iv.length+1)%4===0`** (19→20, 31→32, Partch 44). Drives `rectRows`/`rectRowsFull`.
- `supportsProgressions()` = 7 degrees. Note: a 7-note `noChords` scale (maqams, pelog) is still gated out of progressions because `refreshProgAvail` uses `supportsProgressions() && supportsChords()`. (Partch has 43 degrees, so progressions stay gated regardless.)

### Music theory & pitch
`SCALES` is the source of truth: each has `edo`, `iv` (degrees in those steps), `tag`, `trad` (tradition, for the menu), optional `grp` (submenu), optional behaviour properties. Traditions (`TRADITIONS`): Ладовая (`modal`), Арабская (`arab`, 24-TET maqamat), Микротональная (`micro`, 19/31-TET), Хроматика (`chrom`), Мировые строи (`world`, non-equal cents tunings: gamelan Слендро/Пелог + **Partch 43-tone JI** at index 49). 50 scales (indices 0..49).

**Two ways to define pitch — equal steps OR cents:**
- **Equal (default):** within-octave ratio = `2^(iv[i]/edo)`. All EDO scales (12/19/24/31-TET etc.).
- **Cents overlay:** a scale may add an optional `cents:[...]` array (`length === iv.length`) giving each degree's exact cents above the tonic — for **non-equal** tunings (Javanese gamelan Слендро/Пелог; later Partch etc.). When `cents` is present, `leadFreq`/`bassFreq`/`centsOf` use it: within-octave ratio = `2^(cents[i]/1200)`, with the appended top = 1200¢ (octave). The scale STILL carries `edo`/`iv` as **nominal structure** (degree count, on-screen row layout, hysteresis) — cents overrides pitch only. The octave register `2^oct` is unchanged, so the period stays a true 2:1 (octave stretch/ombak is not modelled). Existing scales (no `cents`) run the old path byte-for-byte.
  - **Cents-scale chords now exist (Partch).** `chordFreqs` has a cents-aware branch gated on **`s.cents && ty`**: it prices a typed chord as `tonic·2^(oct)·2^(rootCents/1200)·ratio` — the root from the scale's cents overlay, each chord interval a **pure ratio** multiplied directly, bypassing `2^(step/edo)`. `chordSteps` is untouched and not reached on this path. The integer-step path (chrom12/edo19/edo31 and every non-cents scale) is byte-for-byte unchanged. Gamelan stays `noChords` **by choice** (monophonic), not by limitation.
- `chordSteps()` branches: a typed chord (`ty`) adds its interval array to the root; 7-note diatonic/ethnic/maqam stack thirds; pentatonic/blues/chromatic use power chords; pure-EDO (`tag:'edo'`) build by interval ratios (`chord`/`chord7`). (Cents-scale typed chords skip `chordSteps` entirely — see the `chordFreqs` cents branch above.)
- `CHORD_FAM_SETS` intervals are in that scale's own steps (semitones/`chrom12`; 38.7¢/`edo31`; 63.2¢/`edo19`) **except `'partch'`, whose `iv` are plain-number ratios** (5/4, 7/4, 36/11…) consumed by the cents branch. Never give a step-set to a scale with a different `edo`, and never give the ratio-set to a non-cents scale.

### Audio engine (`initAudio`) — five chains into one master
`master → limiter → destination`. Shared `ConvolverNode` reverb (only the solo send is Z-controlled). Chains: (1) solo — banks → drive → envelope → volume → tremolo → delay/reverb; (2) chord pool (`CHORD_POOL_N` always-on 2-osc voices, gain-gated); (3) bass pool (`BASS_POOL_N` mono, timbre baked on attack); (4) drums (synth per hit, kit from `a.kit`); (5) drone (detuned saw pair, LFO-swept LP, follows the tonic). Plus the metronome.

### Looper & polymodality
An event is `{t, layer, fn, a, sc, sev}`: `t` in beats, pitch as degree+octave, frozen scale `sc`, `sev`, plus `a.ty`/`a.inst`/`a.kit`. Frequency is derived at play time via `leadFreq/chordFreqs/bassFreq(..., frozenSc)`, so the loop re-tunes to the live tonic while each layer keeps its frozen scale (**and its `cents` tuning**, for free). Replay via `ENG` isn't re-recorded. This is polymodality — don't "simplify" replay to the current scale.

## Conventions

- Terse, comment-heavy, single-letter helpers, compact lines. Match it.
- Add a feature in the module that owns it:
  - a **scale** = one entry in `SCALES`, **appended at the end** (index is `scaleIdx`; `state` and `sameDegrees` depend on it). Menu position is set by `trad`/`grp`, not array position — `fillScales` buckets by `grp` key.
  - a **cents (non-equal) scale** = same, plus a `cents:[...]` array (`length === iv.length`); keep a valid `edo`/`iv` as nominal structure. Home tradition: `world`. It may be `noChords` (gamelan) OR carry `typedChords` with a **ratio** family set (Partch — priced by the `chordFreqs` cents branch). If `(iv.length+1)%4===0`, add `rectGrid:true` for the rect layout.
  - a **typed-chord family set** = one entry in `CHORD_FAM_SETS` keyed by a scale's `typedChords` value; **integer steps** in that scale's edo, **or plain-number ratios** for a cents-scale (Partch's `'partch'`).
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
7. **Per-event scale freeze is the polymodality mechanism** (`sc`/`sev`/`a.ty`, and `cents` rides on the frozen `sc` — including for **chords**: a frozen Partch chord layer replays in just intonation via the `chordFreqs` cents branch on `ev.sc`).
8. **The video draw and `detectForVideo` read the same camera frame** (`drawVideoBackground()` before detect, `drawOverlays()` after, one synchronous tick).
9. **Phone is the lead mode; PC is frozen but must stay intact.** New behaviour goes under the phone branch / scale properties. Consequence today: typed-chord type-select is phone-only.
10. **Continuous-pitch overrides ride a live-only channel and are NEVER recorded.** The theremin Hz is a 3rd arg of `ENG.leadOn` passed only by the live `WleadOn`; replay derives pitch from the frozen `deg/oct`. Do not fold live Hz into the event payload.

## How to verify a change

No tests. Verification is **manual, in the browser** — do not run node, a server, headless Chrome, or any automated test/git command; that is the user's job.

1. Serve, "▶ Запустить", allow camera, **portrait**.
2. Solo/chords/bass/drums roles play; looper records/overdubs/undoes; arrangement drops in.
3. Typed chords (Хроматика, 31-TET, 19-TET): left index pinch selects a palette cell; right hand plays; 19-TET pure minor beats less than 12-TET minor; 31-TET `дом7` = 4:5:6:7.
4. Cents scales (Мировые строи → Слендро/Пелог): sound UNEVEN (gamelan), octave a clean 2:1, play-tag cents read the real values; gamelan chords show the no-chords hint.
5. Menu: each tradition's `grp` subgroups render once, in order (Ладовая has Диатоника/Лады(моды)/Этнические/Пентатоника-блюз/Симметричные/Экзотические/Мировые пентатоники/Японские; Арабская has one Макамы group). Мировые строи lists Слендро/Пелог/Партч.
6. A few existing scales unchanged; PC mode still plays three columns.
7. Rect model (19-TET/31-TET/Partch, phone solo/bass/chords): fat rectangles + a bottom «ОКТАВА» band; Y picks the rectangle, finger I–IV picks 1 of 4 notes/roots; pinching the octave band sets a **per-role** sticky register (solo/bass/chords don't share it). Chords: left palette unchanged, rect roots in the right half.
8. Partch (Мировые строи, index 49): 11-limit JI; solo/bass glide as 11 rectangles; chord role shows the О/У/Диез/Станд. palette; an О7 is a beat-free 4:5:6:7; a recorded Partch chord layer replays in JI.
9. Theremin (`〰`, phone solo only): appears next to Соло; ON glides pitch continuously across the fine note-lines; the looper still records the nearest step; OFF and other roles unchanged.

Never report a change as done without stating which steps you could not verify.

## Language

- Code, comments, UI strings, `SCALES`/`CHORD_FAM_SETS` names: **Russian**. Never translate or "clean up".
- Chat responses to the user: **English** (the Windows terminal mangles Cyrillic).
