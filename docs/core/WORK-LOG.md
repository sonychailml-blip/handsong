# WORK-LOG — CORE track

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`). History: `archive/WORK-LOG-before-split.md`. Checkpoints A–E of SPLIT-2 are its last sections.

# CORE-1 — checkpoint 1 (2026-11-02): the design as approved, the guided measuring page
Tree hashes before and after (unchanged): core a129b2831f2bae63 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4.
- `docs/core/CORE-1-DESIGN.md`: rewritten for the user's nine changes (today's measure kept; depth calibration near and far with a direction per control; effects hand sensitivity only; `play:x` untouched; time-based smoothing without pinch restarts on the calibrated path; refusal code `synthetic`). Decided while rewriting, for the user's review: depth controls take no sensitivity, and Full's `play:x` stays untouched like Night's.
- `tools/probes/core/handstats.html`, `handstats.js`, `handstats-calc.js`: the page, no console needed. Previews carry it (`tools/build.mjs` copies the folder); production does not (smoke test).
- Row «CAL0 hand measuring (tool)» in `tools/probe-data.mjs`. `tools/smoke-paths.mjs` covers the page on the repo tree and both previews, its absence on production, and a control.
- Tested with a fake camera and scripted samples only; no real hand or phone has been through it. Thresholds in the design stay provisional until the user's numbers arrive.
- Backlogs: the first-launch offer, the settings menu, Night's 6-icon limit, the thumbnail idea.

# SPLIT-2 — checkpoint F (2026-11-02): docs split, core rules, final (status: archive/SPLIT-PROGRESS.md)
Tree hashes after: core a129b2831f2bae63 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4 (first print of the tool; no value from before it). This checkpoint changed only comment paths under `core/` and `apps/`.
- `tools/split-docs.mjs`: docs moved into `docs/{core,full,night}`; logs frozen into `archive/`; the plan and the status file into `archive/`; the backlog cut by section, each new file headed by what is open now. `--check`: 2238 old lines, 0 lost; frozen logs byte-identical (the work log plus the plan's one note); the old handoff word for word in `archive/HANDOFF-history.md`.
- Handoffs rewritten: root index, one per track, with today's addresses for Night's open steps.
- `CLAUDE.md`: new paths, the «Two apps, one core» section and rule #39, the rule #37 exception, build and deploy. 135 replaced lines copied to «Superseded at DOC1»; `doc-split-check` passes against the DOC1 copy and against today's file. Size 68.9 KB, over the ≈ 60 KB target (was 63.8 KB).
- Core rule 6 differs from the approved draft in one place: the runner has no `--app both`, so the rule names its two real commands.
- `msgCheck`: messages are also compared with the panel `#nightCtl`. It flags exactly the known overlap on `night-msg-land` (`darkHint × nightCtl`), listed in `MSG_KNOWN`, so the run stays green for that one and fails on any other. Fail-when-fixed path is one line and has not been exercised (the bug still exists).
- «OLD NAME gone» now scans `docs/`, `CLAUDE.md`, `HANDOFF.md`, `THIRD-PARTY-LICENSES.md`; it caught one word in a handoff written during this checkpoint. New controls for the note line. Old names added to `docs/core/STALE-NAMES.md`.
- New: `tools/tree-hash.mjs` (report only). Kept: `tools/split-*` and baselines (CORE backlog item to remove them).
- Light set per the user. Not rerun at F: the browser probe suites, the 12-check split suite. Reason they are enough: no code line changed at F outside comments and tools; the smoke test on the repo and built trees, and one full Night capture, ran on the final tree.

# After SPLIT-2 (2026-11-02): deploy fact, docs only
Tree hashes unchanged from checkpoint F: core a129b2831f2bae63 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4.
- Recorded: `handsong-night` builds `night-release`, `main` updates only Full, neither new app public yet, Night's home undecided. In `CLAUDE.md` Build and deploy, root `HANDOFF.md`, the Full and Night handoffs. The old `CLAUDE.md` line is in «Superseded at DOC1».
- CORE backlog: slim `CLAUDE.md` under ~60 KB.
