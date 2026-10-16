# ENG2 — engine readouts, cost classes, a start-up power class (PLAN ONLY, RUN 3, 2026-10-16)

Written for: the strategist (review), then Claude Code (implementation). No app code was changed for this document; the numbers below were
measured today on the user's desktop through the browser runner (headless Chrome, 4 logical cores, 48 kHz). Plan source: stage-3 plan slice
23 (a ☆ socket kept BEFORE Calm — user answer Q2); user decision 2026-10-16: plan first.

## 1. What exists today
- The latency meter (LAT1/LAT1b, `latmeter.js`): camera fps, detection, gestures, drawing, long tasks, audio base/output latency, «hand →
  sound». It MEASURES; nothing acts on it.
- The mixer's master meter (`masterMeter`, limiter reduction `limRed`) and `poolSizes()` (render report only).
- The node census (AUD1a) — nodes by kind of the engine's start graph and one note of every timbre.
- The engine contract (ENG1) — the place where `levels()`, `load()`, `voices()` of plan §4.4 belong.

## 2. Readouts (`audio.js`, part of the contract)
- `voices()` → `{ ld:{ built, sounding }, ch:{ built, sounding, strikes }, bs:{ built, sounding }, drums:{ hitsLastSec } }` — read from the pools
  (`lv`, `cv`, `bv`, `ffLive`) and a hit counter; no new nodes.
- `levels()` → `{ master:{ peakDb, rmsDb, reductionDb }, roles:{ ld, ch, bs, dr } }` — the master from today's meter; per role ONLY when asked
  (an AnalyserNode per role bus is built lazily on the first call, never by default — cost).
- `load()` → `{ glitches, renderCapacity?, offlineFactor }` — Chrome's `AudioContext.playoutStats` (fallback frames — a dropout counter)
  where present, `renderCapacity` where present (feature-detected; absent = `undefined`, never guessed), and the start-up `offlineFactor`
  (§4). Shown by the latency meter's box (one line) and `R.engine()` in the console; nothing else changes.

## 3. A cost class in every passport
- Every effect declaration (`FX_FACTORY`) and every timbre engine type gets `cost:{ class:'S'|'M'|'L', nodes, perVoice? }`, generated ONCE by a
  probe tool from the census (nodes) and an offline timing (seconds of CPU per second of audio for one instance / one voice) and written into
  the declaration; a probe row checks the declared class still matches the measurement (± one class).
- Classes (proposal; per instance / per voice, offline, this desktop): S < 2 % of a core, M < 10 %, L ≥ 10 %. Today's known L: Night forest
  Long (≈ 27 %, SND-F1b); M: Night forest Short / Medium (≈ 14–15 %… border), the FDN reverb; S: delay, tremolo-mix, Glue, voice modules.

## 4. The start-up power class
- **Benchmark:** after ▶ Play has started the engine (never inside the click; in an idle moment, `requestIdleCallback`, ≤ 1 s of work), render
  0.5 s of a REFERENCE scene in an OfflineAudioContext with the worklets stubbed (no context pinned — RENDER-LEAK): the engine's start graph +
  4 solo SuperSaw voices + 4 chord voices + one bass + three drum hits per half second (`render.engineProbe`, as measured below).
  `offlineFactor` = render time / audio time. Cached per device (localStorage, with the user agent) — re-run only when the agent changes.
- **Measured today (4 s scenes, 3 runs each, seconds of render for 4 s of audio):**

  | scene | run under outside load (slow factor 3.8) | run at low load (CPU 26 %) | factor (low load) |
  |---|---|---|---|
  | the bare start graph (no notes) | — | 3.26 | 0.81 |
  | light: 4 solo + 4 chord + bass + 3 drums / 0.5 s | 9.15 · 8.78 · 8.91 | 8.54 · 8.77 · 8.40 | ≈ 2.1 |
  | heavy: 8 solo + 4 chord + bass + 3 drums / 0.5 s | 12.26 · 12.36 · 11.83 | 11.02 · 11.26 · 10.75 | ≈ 2.8 |

  ⚠️ **Finding:** even with no notes the start graph costs ≈ 0.8 of a core OFFLINE (the 24 always-on chord-pool voices — rule #3 keeps their
  48 oscillators running, gated by gains — plus the FDN reverbs and LFOs). Offline rendering on one thread is not the same as the live audio
  thread (live play works on this desktop), so the factor must be CALIBRATED against live dropouts (`playoutStats`) before it decides
  anything. This also names the first low-power lever: a lazy / smaller chord pool.
- **Graphics / detection** (the user's measurements, BACKLOG §3.32 «Dual-GPU laptops», LAT1b/LAT2): Intel HD 4000 — detection ≈ 53 ms one hand
  (track 42, search 75), two hands 69–80 ms; NVIDIA GT 635M — two hands 52.9 ms (track 41.5, search 77.9), hand → sound 119.6 vs 133 ms. The
  meter already reads the renderer's name («hardware» / «software»).
- **Classes (proposal; thresholds from today's desktop, to be re-measured idle and on phones):**

  | class | audio offlineFactor (light scene) | detection two hands | meaning |
  |---|---|---|---|
  | `high` | < 1.0 | < 35 ms | everything on |
  | `mid` (this desktop) | 1.0 – 3.5 | 35 – 90 ms | today's app |
  | `low` | > 3.5 | > 90 ms or a software renderer | Calm's low-power path |
  | phones | placeholder — measure (budget phone, mid phone, iPhone) before setting | | |

## 5. What Calm's low-power path switches (when `low`, or by the person's switch)
- Hand detection: policy `'2s'` stays (two hands tracked); camera request 24 fps; the worker path only if the phone numbers favour it.
- Audio: a smaller chord pool built lazily (needs its own probe — rule #3 holds: built voices still never stop); Night forest Short only, or
  ONE shared room (§7.14 sends); the expression stage's shimmer off; solo pool cap 4.
- Picture: canvas at devicePixelRatio ≤ 1, scene effects at their lowest level (§7.16 «levels»), no camera picture drawn (Calm draws the scene).
- Freeze: the memory budget of touch devices (`AF_BUDGET_MB` 300) and auto-freeze earlier (fewer live voices).
- Every switch is reversible and shown («Low power: on — why»); nothing recorded changes.

## 6. Proof
- Readouts: a probe row reads `voices()` / `levels()` / `load()` during a seeded play (counts equal the pools, levels finite, missing APIs
  `undefined`); the benchmark's result is within ±20 % across three runs on the runner; the class decision is a pure function in `core/`
  (node row with fixed inputs; CONTROL: a factor above the threshold must give `low`).
- No sound change: GOLD, census, HAND1, LAT rows (the benchmark must not land inside the start card's long tasks — checked by LAT1b's
  startup long-task line).

## 7. Questions for the strategist
1. Calibrate against live dropouts first (needs `playoutStats` on the user's Chrome) — or accept offline factors as a relative measure?
2. Is a lazy / smaller chord pool acceptable as the first low-power lever (it changes how many voices are built, not how one sounds)?
3. Phones: which devices to measure, and should `low` be automatic or only offered?
