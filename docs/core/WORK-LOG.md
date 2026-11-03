# WORK-LOG — CORE track

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`). History: `archive/WORK-LOG-before-split.md`. Checkpoints A–E of SPLIT-2 are its last sections.

# CORE-5 (2026-11-03): Night's calibration texts and the settings icon (for NIGHT-2 stage 2)
Tree hashes before: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b. After: core cd907ffe1654b50d · apps/full d6b90cf2cb4be6da · apps/night e9b6ee3f263b2e32.
- `core/i18n.js`: keys `night.settings`, `night.set.*`, `night.cal.*` (en + ru) added beside the existing `night.*` keys (user's answer 10; core backlog item to move app texts into app dictionaries); the dev-only `night.joints` removed (its switch became the settings segment). `core/icons.js`: `settings` added to the drawn icons. Additive only: no existing key, icon or behaviour changed.
- Checks: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` (Full) · `P.night: PASS — 37 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT calibration screens 0, 35 cases) · `[smoke] PASS` with builds · ui-snap Night: no overlap (0 known). No print renewed, no tolerance changed.

# CORE-4 (2026-11-03): the quiet floor, opt-in, nobody on it yet
Tree hashes before: core c91a61074394f73e. After: core fc2784fd1a6f4eba · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- `core/audio.js` `setPartialFloor(db)`; `core/modules/timbres/modal.js`, `tine.js`: partials stop at the floor, on the lean strike path only. Off by default and in every render copy. Full's strike ignores it (row «NIGHT quiet floor»). `surface.js`: listings. GOLD, census, both «untouched» rows exact: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 36 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0, NIGHT quiet floor 0) · `[smoke] PASS` with builds. No print renewed, no tolerance changed.

# CORE-3 (2026-11-03): the lean path, opt-in
Tree hashes before: core e327f42db4c183c7. After: core c91a61074394f73e · apps/full d6b90cf2cb4be6da · apps/night efe1ccf4dbbd133b.
- `core/audio.js`: `setLeanPath({ expr, voice, roles, closedFx, park })`, `leadParkTick`, `leanInfo`. Every switch off by default and in every render copy (`renderReset`); with them off no node, value or order changes (one stored field `v.shaper`). `core/engine/surface.js`: listings. No app but Night opts in. Row: «NIGHT lean path»; GOLD, census, both «untouched» rows exact: static PASS · `[probe-data] PASS — 36 checks, 0 differences` · `P.quick: PASS — 93 checks, 0 differences` · `P.all: PASS — 122 checks, 0 differences` (GOLD 0, node census 0, FULL untouched 0) · `P.night: PASS — 35 checks, 0 differences` (NIGHT stress 0, NIGHT untouched 0, NIGHT lean path 0) · `[smoke] PASS` with builds. One fix round: a word the name row forbids in a mockup, and a row order number. No print renewed, no tolerance changed.

# CORE-2 (2026-11-03): one listing line for a dev tool
Tree hashes before: core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core e327f42db4c183c7 · apps unchanged.
- `core/engine/surface.js`: the calls of NIGHT-1's headroom page (`tools/probes/night/headroom.js`) listed, as static check 12 requires. Data read only by the static check; no runtime code changed. Checks of both apps: `docs/night/WORK-LOG.md` NIGHT-1.

# CORE-1 — checkpoint 5 (2026-11-02): close
Tree hashes before and after (docs only): core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4.
- User's step 125, Full on the desktop: calibration saved (near 0.339, depth 2×), nothing felt wrong, so the 3σ band stays. Wrist sweep 0.27 at 2× against the estimated 0.64, accepted as the limit. Night on the desktop and both apps on the Poco stay open, in the Night and Full backlogs.
- User's UI decision for the app runs, in `docs/core/CORE-1-DESIGN.md` §6 and both backlogs: the one-step calibration on first launch and two sliders, «Hand travel» and «Effects sensitivity»; no numbers; no direction in Night; direction only as an advanced option in Full's effect editor; the panel stays development-only.
- `CLAUDE.md`: map lines and step index, new lines only. `archive/CLAUDE-history.md`: module detail, architecture section, Known limits, step 125.
- Found while closing: with that UI decision no screen calls the per-control sensitivity override. Left in the engine, CORE backlog item.
- Final set: static, data, smoke, licences PASS; `P.all` PASS; `P.quick` failed once on `LAT3 low light`, then PASS on rerun. **Night NOT A PASS in three sessions: `NIGHT stress`** (singing bowl 7, 5, 44 dropouts; handpan 16 in the last; reference 0). The same core passed at CP4. Cause not settled; stopped per the probe budget, no tolerance changed, `--stress-not-judged` not used. Evidence in the CORE backlog.
- Rerun, laptop cooled and on power, same core: `P.night: PASS — 34 checks, 0 differences` twice, `NIGHT stress` 0 differences both times. CORE-1 closed. The row stays on watch: which factor mattered wasn't separated, since Chrome was still running (idle) and Telegram was running at the start of the first run. The Full and Night screens and the rest of step 125 are app work.

# CORE-1 — checkpoint 4 (2026-11-02): the mapping, a depth print for each app, the development panel
Tree hashes before: core 490c9a017b28e7a5 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. Apps unchanged.
- User: give Night a real «nothing changes» check first. `tools/prints/hand-depth.night.print.json` and `.full.print.json` were made before any mapping door, on core 490c… plus one listing line in `surface.js` (core 4a66fa0e83ca6f20). New files, no print renewed. They reproduce in fresh sessions; the control (a palm 1% larger) is caught. HAND1 keeps the size constant, so it could not see depth even on Full.
- Doors: `depthN`, `noteVolOf` (volume on depth only), the two play:z sites, the effects line, `handsView`. Rows «CAL4 depth print», «CAL5/CAL7/CAL8 calibrated hand».
- CAL7 found a real problem: a still hand wrote automation at 7 fps. One pole at that rate passes far more noise. The band is now per camera, 3× the measured noise (floor 0.009, cap 0.02), the end pull past it. Zero points isn't reachable at a usable width: 3.5% of minutes in the worst corner, with a 10% dead zone on reversing at 2×. The test measures a rate over 400 seeds, not one lottery seed (design §2.3). For the user's ear.
- CAL8: renders repeat to 7.5e-9 with calibration closed, so exact equality was the wrong measure; the limit is 1e-7, with a control.
- `tools/probes/core/calpanel.js`: the panel, `?probe&calpanel`; the smoke test covers repo, previews and production's absence, with a control.
- Tree hashes after: core 7ef60d72285fb980 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4.

# CORE-1 — checkpoint 3 (2026-11-02): the live service, withholding hands, the synthetic mark
Tree hashes before: core 5009e88be68abdea · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: see the report; apps unchanged.
- User, after CP2: depth slider 0.7×–2× (far end 2.97× the near distance at 0.7×), effects sliders stay 0.5×–2×. A low override reads 0.7 once its control is on depth. `NIGHT stress` is in the CORE backlog.
- `core/handcal.js` (new): record and store, camera key, run, listeners, `calBusy`/`calFrame`. `core/gestures/hands.js`: one line at the top of `processHands`, one in `handsProbe`. `core/gestures/pose.js`: the mark. `core/vision.js`: `camLabel`, used instead of the planned `hooks.camera`. No app opens it yet.
- Row «CAL4/CAL6 calibration service» on both apps; the state guard reads the calibration state.
- Limits of the row: the CAL4 print proves only Full, because HAND1 is «not applicable» on Night (its live chains differ from the print's). Tracks staying untouched rests on the state guard's song and transport lines, not a track playing during a run.
- Runner time limit: three Full `--quick` sessions stopped at `TIME LIMIT — P.quick() did not finish within 180 s`, 5–8 rows short, none failing. Compared row by row with a passing run: slower across the suite, not one row, and this checkpoint's row costs about 0.5 s. The final Full quick used `--limit-quick 5`; the default is unchanged, backlog item added.
- `LAT1b test switches` failed once with `--limit-quick 5` («after 2, search every frame: hand detection stopped, no samples in 0.9 s»), then passed on the unchanged tree. A real-time row; its logs show failures on 2026-10-15 and 10-16, one with the same kind of message.
- Tree hashes after: core 490c9a017b28e7a5 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4.

# CORE-1 — checkpoint 2 (2026-11-02): one-step design, pure core
Tree hashes before: core a129b2831f2bae63 · apps/full d6b90cf2cb4be6da · apps/night b8b85189cac1a5b4. After: core 5009e88be68abdea · apps unchanged.
- `docs/core/CORE-1-DESIGN.md`: the user's one-step design (one near point, depth relative to it, depth slider, whole hand in the frame, time-based timings) with the measured numbers (§9.1). `noisy`, `span-small`, `no-move`, `wrong-way` gone.
- Decided, for review: the slider divides the real travel, `rFar(s)=1/(1+(1/0.42−1)/s)` (dividing `1−r` is impossible at 0.5×); hold band ±0.009 of the ratio; blink tolerance 800 ms; minimum near size 0.25; depth slider global, not per camera.
- `core/pure/handcal.js` (new; nothing imports it yet), `core/pure/format.js` (the `handcal` kind). Rows CAL1–3 are one data row, «CAL1-3 hand calibration (core)». No app behaviour changes.
- Not measured: fingertips in the frame (the page's `out` read only the palm); 2 s stillness figures are worked out from 0.5 s windows.
- Probe runner: `tools/probes/core/run.js` finishes the once-per-device benchmark before the first state-guard snapshot. Found on Night: `P.night` starts about when the benchmark does, and the guard caught the render copy mid-render (`offline:true`, row GOLD). A race older than this run, no tolerance changed.
- Seen once, not fixed: `NIGHT stress` failed with 48 dropouts in 6 s (`solo.handpan`) against 0 for the reference. The next two runs on the same core passed. The real-time row varies on this laptop, as the row's own note says; if it recurs it needs its own look.

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
