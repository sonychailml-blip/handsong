# WORK-LOG — NIGHT track

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`). History: `archive/WORK-LOG-before-split.md`, `archive/NIGHT-RUN-LOG-2026-10.md`. New runs start at `NIGHT-1`.

# NIGHT-1 — stage 1 (2026-11-02/03): Night's sound headroom, measured
Tree hashes before: core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core e327f42db4c183c7 (one listing line, CORE-2 in `docs/core/WORK-LOG.md`) · apps/full and apps/night unchanged.
- Measurement only; nothing players hear or see changed. Numbers, conditions and limits: `docs/night/NIGHT-1-HEADROOM.md`.
- New, dev only: `tools/probes/night/headroom.js` + `headroom-calc.js` + `headroom-worklet.js` (the phone page, `<preview>/?probe&headroom`), `tools/night-headroom.eval.js` (the laptop's run). `tools/probes/night.js` mounts the page. Data row «NIGHT-1 headroom sums»; smoke test of the page, with a control; `NET_LISTED` entry in `tools/check-static.mjs`.
- Method fixes along the way: a passage created up front left every finished note in the graph and read 54–100% of budget, so each note is now created just before its time (33–39%). What-if savings use the better of two baselines. Real-time repeated three times after the first run looked disturbed.
- Final set, same conditions (00:03–00:29, 2026-11-03): static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, FULL untouched 0) · `P.night: PASS — 34 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0) · `[smoke] PASS` with builds, its controls caught. No print renewed, no tolerance changed, `--stress-not-judged` not used.
- Waiting: the user's decision, the Poco numbers, step 125. No fixes in this stage.
