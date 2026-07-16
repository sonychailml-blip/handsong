# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Air Synth 3 is a gesture-controlled synthesizer and interactive scales tutorial that runs entirely in the browser. It uses the webcam + MediaPipe hand tracking to play notes/chords/effects with pinch gestures, synthesizing all sound with the Web Audio API. The UI text and code comments are in **Russian** — keep new user-facing strings and comments in Russian to match.

**The entire application is a single file: `index.html`.** There is no build system, no package.json, no dependencies to install, and no tests. All CSS, HTML, and JS live inline; the only external dependency is `@mediapipe/tasks-vision` loaded from a CDN via an ES module `import`.

## Running / developing

- Serve over **HTTPS or `localhost`** — `getUserMedia` (camera) and `navigator.wakeLock` require a secure context; opening `index.html` via `file://` will fail.
- Any static server works, e.g. `python -m http.server 8000` then open `http://localhost:8000`.
- The MediaPipe model, WASM, and library are fetched from `cdn.jsdelivr.net` / `storage.googleapis.com` at runtime — **an internet connection is required** even when serving locally.
- Requires a webcam and a browser with WebGL/GPU delegate support. Audio starts only after the user clicks "▶ Запустить" (browsers block autoplay before a user gesture).

## Architecture

Everything is one `<script type="module">`. The pipeline each animation frame (`loop()`): MediaPipe detects hands → `processHands()` updates the gesture state machine → `draw()` renders the camera feed, zones, teaching overlays, and hand labels. Audio is event-driven off the gesture state, not the render loop.

### Screen zones (by X, full height)
Three vertical columns, split at fractions `FXW=0.20` and `ZB=0.595`: **EFFECTS** (left) · **CHORDS** (center) · **SOLO** (right). A pinch's zone is locked at the moment of the pinch and doesn't change while the hand moves. Both hands are independent players, each with its own pinch state machine keyed by MediaPipe handedness (`'Left'`/`'Right'`).

### Gesture model
- **Pinch** = thumb (landmark 4) close to a fingertip (8/12/16/20). Distance is normalized by hand size (`pinchRatios`, wrist→index-base) so it works near and far from the camera.
- The pinched finger selects the **octave** (index=I … pinky=IV) and can be switched mid-pinch to glide.
- **Y** = scale degree (with hysteresis in `degHyst` so narrow micro-tonal rows don't trill at boundaries); **X within a column** = volume; **hand depth Z** (wrist→middle-base size) = reverb send, solo channel only.
- In the EFFECTS column, pinch selects an effect (delay/vibrato/drive/tremolo) and dragging up/down latches its value.

### Music theory (the "teaching" layer)
`SCALES` is the source of truth: each has `edo` (equal divisions of the octave — 12/19/24/31-TET), `iv` (degrees in those steps), and a `tag` driving chord logic and auto-accompaniment. Core formula everywhere: `f = baseF · 2^octave · 2^(step / edo)`.
- `chordSteps()` branches on scale family: 7-note diatonic/ethnic/maqam stack thirds (`i, i+2, i+4[, i+6]`); pentatonic/blues/chromatic use power chords (root + fifth + octave); pure-EDO scales compute the nearest step to a just fifth (`fifthStep`).
- `chordLabel` / `qual` / `SEV` derive chord names from intervals. Micro-tonal names come from `name24` (quarter-tones) or fall back to step numbers/cents.

### Audio engine (`initAudio`) — three parallel signal chains into one master
All hand-built Web Audio nodes; a `DynamicsCompressor` acts as a mandatory output limiter. One shared `ConvolverNode` reverb; each source has its own send.
1. **Solo chain** — `buildLeadBanks` builds 6 lead timbres (banks cross-faded by gain); signal flows through vibrato → saturation (drive) → envelope → volume → tremolo → delay/reverb sends. Only this chain is affected by the effects column and Z-reverb.
2. **Chord pool** — `buildChordPool` pre-starts 8 always-on 2-oscillator voices, gated by gain and allocated per pinch (`cvAlloc`/`chordOn`). `chordGlide` changes chords without re-attacking (voice-leading).
3. **Backing track (Smart Match)** — a look-ahead scheduler (`schedTick`, 25 ms `setInterval` placing events 0.14 s ahead on the AudioContext clock) plays generative drums/bass/arp synthesized on the fly (no samples). `smartStyle()` picks lofi/synthwave/ethnic/ambient from the current scale's `tag`; the drone/pattern always follow the live `baseF()` and scale so changing scale mid-play re-tunes without stopping.

### Recording
`events[]` records timestamped engine calls (`leadOn`/`chOn`/…) wrapped by `W*`/`ENG` indirection. Playback re-fires them via `setTimeout`; `inPB()` guards prevent playback from being re-recorded.

## Conventions

- Very terse, comment-heavy style with single-letter helpers (`$`, `range`, `clamp01`) and compact multi-statement lines. Match it rather than reformatting.
- No frameworks, no bundler — add features by editing `index.html` directly. Adding a scale = one entry in `SCALES`; a lead timbre = a block in `buildLeadBanks` + entry in `LEAD_INSTR`; a chord timbre = an entry in `CHORD_INSTR`.
## Hard rules — do not break these

1. **AudioContext is created only inside the `#startBtn` click handler.** Never call
   `initAudio()` or `new AudioContext()` at module load, on import, or from any other
   event. Browsers block audio created outside a user gesture; the app fails silently.
2. **Never hardcode frequencies or note tables.** Every pitch derives from `baseF()`,
   the current scale's `edo` and `iv`, via `f = baseF · 2^octave · 2^(step/edo)`.
   Hardcoding silently breaks 19/24/31-TET.
3. **Chord pool oscillators start once and never stop.** Notes are gated by GainNodes.
   Never create an oscillator per note — that causes clicks and leaks.
4. **The master limiter stays.** Chords + drive + backing clip without it.
5. **The audio layer must not touch the DOM.** Currently violated: `setLeadInstr`
   writes `selLead.value`; `refreshStyle` writes `bpmEl.value` / `bpmV.textContent`.
   These are known debts to be removed — not patterns to copy.

## Correction to the architecture notes above

Audio **is** driven from the render loop: `loop()` calls `processHands()` every frame,
which calls `WleadOn(...)` ~60×/sec while a pinch is held. This is why `events[]` grows
to thousands of entries per minute — it logs frames, not musical intent.

## How to verify a change

There are no tests. Verification is manual and mandatory:

1. Serve via VS Code Live Server → `http://127.0.0.1:5500` (not `python -m http.server`).
2. Click "▶ Запустить", allow camera access.
3. Check: pinch in SOLO makes sound · pinch in CHORDS makes a chord · effect bars in the
   left column move on pinch+drag · "▶ фон" starts the backing track.
4. Switch scale to "31-TET" and to "Макам Раст". Micro-tonal paths break first and
   break silently.

Never report a change as done without stating which of these steps you could not verify.
## Language

- Code, comments, UI strings, `SCALES` names: **Russian**. Never translate them, never "clean them up".
- Chat responses to the user: **English**. The Windows terminal mangles Cyrillic output, so Russian replies arrive unreadable.