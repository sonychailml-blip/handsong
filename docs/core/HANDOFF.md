# HANDOFF — CORE track (`core/`, used by both apps)

Index: `/HANDOFF.md`. Rules, short module map, step index: `CLAUDE.md`. Open items: `docs/core/BACKLOG.md`. The old handoff, word for word: `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2». Debt: `core/DEBT.md`.

## How we work
- The user drives Claude Code in VS Code; a strategist assistant writes English prompts, checks plan and diff against REAL code, and explains everything to the user in Russian. The user does not read code comments or these files.
- After a plan is approved, the prompt says "implement now, don't stop at plan"; otherwise only a plan comes back.
- One step = one change = one check = one commit (docs need no browser). Only the user commits; Claude Code never runs git. Claude Code runs the app ONLY through the probe runners.
- Always read the current code before editing; memory and old line numbers lie.
- Prompts English, chat with the user Russian, terminal replies English (Cyrillic breaks there). Phone: `npx cloudflared tunnel --url http://localhost:5500`, cache bust `?v=N`, or a Vercel preview.
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts; user's rule, AF2), not routine slices. Done: the foundation plan (2026-10-14), the split plan (2026-11-01). Planned: latency and hands; hearing the room (before stage 5); the synthesis core (before stage 7 or earlier); a deep code review + type-checking prep every few months.
- **Probes before every report: Claude Code runs them itself** (`CLAUDE.md`, "Standing working rules"). The user does only ear, camera/hand and phone steps, plus a manual `await P.all()` about weekly. In the console `P` is locked: while a probe (or `P.seed`) runs, other `P.*` calls refuse.
- User's philosophy: "clear base, clear foundation, then grow"; teach how music works; don't chase quantity.

## Current state
- ✅ **Stage 3 foundation:** LIC1, PRIV1, LAT1, PROBE1, GOLD1, HAND1, LAT1b, SND-F1/F1b, LAT2, LAT3, CAM-FIX, REC1–REC5, FMT1, TIM1, GES1, UI1b, TIM2, SAVE1, DRAW1, AUTOSAVE1, DRAW1b, SONG1, AUD1a–c, AUD2a–c, ENG1, IDS1, SONG2, SONG3, PACK1, DOC1, POOL1, ENG2, TIM3a–d, CMD1a–d. Mostly unverified by the user (steps 91–100). UI1a after the redesign. Moved after the first release: ROUTE1, IN1, GES2.
- ✅ **SPLIT-2** (2026-11-01/02): two apps, one core. Log: `docs/core/WORK-LOG.md`.
- ✅ **CORE-1** (2026-11-02): hand calibration and sensitivity, engine only, opt-in; no app opens it yet. Step 125 open on Night and the Poco.
- 74 modes, 18 tunings. Target: phone, portrait. Branch `dev`, main `main`.

## The foundation (full plan and contracts: `archive/HANDOFF-history.md`, «STAGE 3 — FOUNDATION PLAN»)
- **Target:** a pure core (pitch truth, song + commands, clock, registry, file formats, event bus; no DOM or Web Audio; tested in node) + modules through short contracts (effects, timbre engine types, hand sources, inputs, outputs, track types, visuals, gestures) + an engine contract (explicit commands and data; the same code live and offline).
- **Engine direction:** Web Audio inside now; Rust → WebAssembly in an AudioWorklet module by module from stage 5, effects first, voices in stage 7; offline renders of WASM tracks in a Worker, which also avoids Chrome's worklet-context leak. Bass and solo are mirrored, not merged, until the timbre format.
- **A recording keeps what was heard** (notes + resulting values), never gestures; mappings are setup data. Latency compensation from the input's own timestamp (stage 5; tap-along test, switchable off). Privacy: rule #33. Licences: rule #32.
- **User answers Q1–Q19 (2026-10-14):** Rust, compiler from stage 5, effects first, A/B ear acceptance, permanent sound names, song files carry copies, values not movements, local diagnostics, data-only packs, model bundled for the first release, pinch prediction off; Q13 material licences + icon audit; Q14 the Vercel counter kept and named in the privacy notice.

## Auto-freeze (decided; do not reopen)
A track freezes itself once it settles (all but the track being recorded), unnoticed. Done AF1–AF5, AF6b. Next: AF6 memory (stage 5). Since TF4 A4/tempo re-freeze too (1.5 s settle after the last move; Q5); since TF2 the tonic stales nothing; a track created in the editor gets the live chain pinned at birth, inserts into an existing track inherit its chain, auto-freeze never pins (song load pins old chain-less tracks; seed: 0); memory guard until AF6 `AF_BUDGET_MB` 300 touch / 1024 desktop, over it = skipped, no eviction; ON by default, `R.autoFreeze(false)` off for the session; paused while any probe runs. Frozen sound = a cache; 16-bit; never MP3.

## Tuning model, the rest
Don't narrow musical possibilities (T7b: a theory restriction is a mode) · chord build adaptive vs from the tuning · scale-panel switches from the mode's data (F6b) · songs store a copy of each tuning · Scala readiness · a "central tone" for patets · open: 1/1 typed in Hz, Scala `.kbm` export.

## Known limits and debts (the list: `archive/CLAUDE-history.md`, "Known limits")
- Songs save as files by hand (SAVE1) and autosave on the device (last 5 songs, offer at ▶ Play); a song carries copies of the person's own scales; events carry timbre ids. Since TF2 the key is frozen in each note's view (+ cents for 1/1 tunings; the knob moves the hands and the backing; Transpose moves recordings, keys −12..23).
- The app does not work offline (SW caches nothing; MediaPipe from a CDN). C9 changes this for Night.
- Hand tracking on the main thread; hand→sound latency measured by LAT1 (user's desktop 2026-10-15: ≈ 126 ms daylight, ≈ 180 ms evening; detection 54 ms vs a real GPU's 10–20; phone runs pending). Since LAT2 each camera frame is detected once; the worker path is ≈ 2× slower on the user's desktop GPU, so the main thread stays the default. The old browser limiter's 6 ms are gone (SND-F1b). In low light the webcam itself slows (6.3 fps evening vs 14–30 day, LAT3); no web API forces its frame rate, so light on the hands is the remedy.
- Editor, lanes, history, paste, sections, effect networks, frozen-track and render limits (KS / Glue renders pin ≈ 6 MB, Firefly tails ring out, Night forest CPU): `archive/CLAUDE-history.md`.
- This 2-core laptop: `NIGHT stress` failed 3 sessions running, then passed twice once the laptop was cooled and on power, same core (CORE-1 CP5; CORE backlog).
- This 2-core laptop: `NIGHT stress`'s real-time part varies run to run on unchanged code (reported, judged on a cool machine or by ear). Four Night screens are structure-only in compares (`night-ghost`, `night-dark`, `night-forest`, `night-forest-land`). Never run two probe sessions at once here.

## Key lessons (expanded: `archive/HANDOFF-history.md`, «КЛЮЧЕВЫЕ УРОКИ»)
Check real code first; diagnose before building · the ear beats the maths, listen first (`R.aud`/`R.live`) · behaviour keys off mode properties; a display name is not an identifier · start small; "can" ≠ "should" · liveness lives in the middle layer, distinct channels → distinct perceptual axes, rest = exactly zero, stability by sub-stepping · one class decides visibility (CSS specificity) · lesson state leaks are the main lesson bug · a short field's default can be silently wrong (filter `Q` in dB; compute loop gain) · a render is a re-performance on a fresh engine · lazily loaded modules break silently; export-list comments on own lines · changed a field/signature → find every reader incl. the probe; new arguments before the time · probes must cover derived paths · real-time probes compare only exactly-matching frames with phase-independent measures; a control that may contain no defect is not a control · run a "random" failure many times and print where and how much · keep this file short.

## Records (English, at most about 15 lines each; older ones go to `archive/HANDOFF-history.md`)
### CORE-1 (2026-11-02): design `docs/core/CORE-1-DESIGN.md`; log `docs/core/WORK-LOG.md`
One near point per camera, depth as the ratio of palm size to it, a «Hand travel» slider (0.7×–2×) and an «Effects sensitivity» slider (0.5×–2×). `core/pure/handcal.js` holds the laws, record and routine; `core/handcal.js` the live state. Inert until an app calls `handCalOpen`: the apps' hashes didn't change, and the depth prints `tools/prints/hand-depth.<app>.print.json`, made before the mapping, stay exact uncalibrated. Hold band 3σ per camera: in the worst corner a still hand writes one small point in about 3.5% of minutes, and reversing waits about 10% of the range. Test panel: `<page>?probe&calpanel`, never on production. Screens are FULL and NIGHT work, as the user decided (design §6).
### SPLIT-2 (2026-11-01/02): log `docs/core/WORK-LOG.md`; plan and status `archive/SPLIT-PLAN.md`, `archive/SPLIT-PROGRESS.md`
Layout: `core/` (`pure/`, `legacy-ui/`, `data/`), `apps/full/`, `apps/night/`, `tools/probes/{core,full,night}`, `tools/prints/`. Each page declares its profile and probes (`<link rel="handsong-profile">`, `<link rel="handsong-probes">`) and calls `boot()` from `core/legacy-ui/boot.js`. Proof tools kept for now: `tools/split-*`, baselines in `tools/split-baseline/` (git-ignored).
