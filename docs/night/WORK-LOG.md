# WORK-LOG — NIGHT track

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`). History: `archive/WORK-LOG-before-split.md`, `archive/NIGHT-RUN-LOG-2026-10.md`. New runs start at `NIGHT-1`.

# NIGHT-2 — stage 3 (2026-11-03): after the user's laptop try — hand choice in settings, the flicker, far hands
Tree hashes before: core cd907ffe1654b50d · apps/full d6b90cf2cb4be6da · apps/night e9b6ee3f263b2e32. After: core 20ec0bdb5f375302 · apps/full d6b90cf2cb4be6da (unchanged) · apps/night 4f4fcfc3f1f0cc14.
- «Играть: правой / левой рукой» left the main screen (four round buttons + settings) for a segment in Settings → Рука, saved (`calSideSet`; the last choice wins, a calibration's or this one).
- The flicker: `calTick` drew from the shell's own animation frame, which could find the camera snapshot already closed by the next frame (0 × 0, a dark frame; with a hand nearly every frame). Now drawn by the loop (`main.js` → boot `afterDraw`, CORE-6); a closed picture keeps the last frame. Not reproducible headless (the order differs there); the row checks the wiring and the keep, with a CONTROL.
- Far hands: the page opens the engine with `farHold` (CORE-6): refused only below palm size 0.075 or shaking; a far or noisy hold gets the note «Отсюда камера видит руку не так чётко…»; a far shaking hand «Точки дрожат…»; the instruction now names the closest point and «Ход руки».
- Row «NIGHT calibration screens» 35 → 48 cases; the shell row clicks the settings segment. Step 129 (five checks) replaces 128.
- Checks: static PASS; [probe-data] PASS — 36 checks, 0 differences (CAL1-3 153 cases); Full P.quick: PASS — 93 checks, 0 differences; Night P.night: PASS — 37 checks, 0 differences (calibration screens 48 cases); [smoke] PASS with builds; ui-snap Night: no overlap; doc-split PASS. Fix rounds 0 (one regenerated name index).

# NIGHT-2 — stage 2 (2026-11-03): calibration screens and settings, built
Tree hashes before: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b. After: core cd907ffe1654b50d · apps/full d6b90cf2cb4be6da · apps/night e9b6ee3f263b2e32.
- The user's answers to the 12 design questions and additions A, B: `docs/night/design/NIGHT-2-calibration/DESIGN.md` «Decisions».
- `apps/night/calib.js` (new): the offer once per camera, the step on the camera picture (its own canvas, the forest stays open), every point of the hands while calibrating, the result card (hands play, «Играть» saves, «Ещё раз»), failures worded by reason, the side voted over the hold sets the roles and is saved, reset clears all; the settings' Hand section and its two sliders.
- `apps/night/shell.js`: five round buttons; ⓘ → settings (Hand · View · about); background and Forest slider in settings; «Руки на экране» fingertips / all points (was a dev switch); the offer after a person's Begin, then the ghost. `ghost.js`: `ghostArm({ wait })`. `index.html`, `night.css`: the card and overlay; the landscape low-light hint left of the capsule (`MSG_KNOWN` line deleted in `tools/ui-snap.mjs`).
- Core part: CORE-5 (texts, settings icon). Row «NIGHT calibration screens» (`tools/probes/night/calib.js`, quick).
- Checks: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` (Full) · `P.night: PASS — 37 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT calibration screens 0, 35 cases) · `[smoke] PASS` with builds · ui-snap Night: no overlap (0 known). No print renewed, no tolerance changed.
- Players who never calibrate or open settings: the same sound, gestures and hand points; the main screen has five buttons and the settings icon (the design).

# NIGHT-2 — stage 1 (2026-11-03): calibration screens, design only
No app code. Design and open questions: `docs/night/design/NIGHT-2-calibration/DESIGN.md`, mock beside it, pictures `tools/design/NIGHT-2-calibration/` (`node tools/night2-mock-snap.mjs`). Waiting for the user's approval.

# NIGHT-1 — stage 3 (2026-11-03): option 3 behind a switch
Tree hashes before: core c91a61074394f73e · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b. After: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- Numbers: `docs/night/NIGHT-1-HEADROOM.md` «Stage 3»: 2–11%. Night doesn't opt in. Dev switch `tools/probes/night/tailsw.js`, row «NIGHT quiet floor», smoke test of the switch. Step 127 is the user's listening test.
- Final set: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 36 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0, NIGHT quiet floor 0) · `[smoke] PASS` with builds. No print renewed, no tolerance changed.

# NIGHT-1 — stage 2 (2026-11-03): options 1 and 2
Tree hashes before: core e327f42db4c183c7 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core c91a61074394f73e · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- Night opts in to CORE-3's lean path (`apps/night/shell.js`: face + one tick). Numbers: `docs/night/NIGHT-1-HEADROOM.md` «Stage 2». Fast passages about halve; free share with camera and forest about doubles.
- New row «NIGHT lean path» (`tools/probes/night/lean.js`). The headroom page shows new and old in the same session (`CONDS`, `PLAN`), gentle passes before ballast.
- Final set: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 35 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0) · `[smoke] PASS` with builds. One fix round: a word the name row forbids in a mockup, and a row order number. No print renewed, no tolerance changed.

# NIGHT-1 — stage 1 (2026-11-02/03): Night's sound headroom, measured
Tree hashes before: core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core e327f42db4c183c7 (one listing line, CORE-2 in `docs/core/WORK-LOG.md`) · apps/full and apps/night unchanged.
- Measurement only; nothing players hear or see changed. Numbers, conditions and limits: `docs/night/NIGHT-1-HEADROOM.md`.
- New, dev only: `tools/probes/night/headroom.js` + `headroom-calc.js` + `headroom-worklet.js` (the phone page, `<preview>/?probe&headroom`), `tools/night-headroom.eval.js` (the laptop's run). `tools/probes/night.js` mounts the page. Data row «NIGHT-1 headroom sums»; smoke test of the page, with a control; `NET_LISTED` entry in `tools/check-static.mjs`.
- Method fixes along the way: a passage created up front left every finished note in the graph and read 54–100% of budget, so each note is now created just before its time (33–39%). What-if savings use the better of two baselines. Real-time repeated three times after the first run looked disturbed.
- Final set, same conditions (00:03–00:29, 2026-11-03): static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, FULL untouched 0) · `P.night: PASS — 34 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0) · `[smoke] PASS` with builds, its controls caught. No print renewed, no tolerance changed, `--stress-not-judged` not used.
- Waiting: the user's decision, the Poco numbers, step 125. No fixes in this stage.
