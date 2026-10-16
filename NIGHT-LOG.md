# NIGHT-LOG — unattended run 2026-10-15/16

Plain-language log of the night run. One «STARTED» line before each slice, a short block after it.

STARTED 0 runner --limit-quick 2026-10-15 23:52

## Slice 0 — runner: P.quick time limit that scales with the machine (done)
- New flag `--limit-quick M` (minutes) in `tools/probe-browser.mjs`; without it the limit is 3 min × a SLOW FACTOR measured from
  P.quick's own rows: 12 CPU-bound rows have reference times from an idle run (2026-10-15 16:48, P.quick 112.9 s); once 3 of them
  have finished, factor = their observed time / reference time (1 below 1.2, at most 6), and the deadline moves with it. Printed as
  «machine speed: … slow factor …». Camera/latency rows are time-based and do not count.
- Why the first idea changed: a fixed CPU benchmark before the run needs an idle reference I could not measure tonight — the
  user's own Chrome WAS open (started 21:39, ≈ 1.3 cores busy all night, I did not touch it), and rows ran 3–4× slower than idle.
- Proof: without the flag P.quick hit the old fixed 3 min at row 33 with 0 differences; with the change it measured 3.63× and
  finished (308.6 s, limit 10.9 min). Its 4 differences were the two live camera-timing rows (LAT2a search schedule, LAT3 low
  light) — both PASS when re-run alone once (7 / 0 and 34 / 0).
- Also seen: one run's app start hung on the hand-model download from the CDN (180 s); later runs use `--cdn-cache`.
- Files: tools/probe-browser.mjs, CLAUDE.md (runner line). Data runner PASS 13 / 0. Nothing for the player changes.
STARTED 1 REC3 part 2 (2a capture records → song/capture.js) 2026-10-16 00:12

### Order chosen for the recording line (and why)
Measured with a dependency script over recorder.js: the ≈1460 lines of REC3 part 2 use only ~25 recorder internals. Most are the
CAPTURE RECORDS (takeFx, its version, the take counter, the lane-shape law) — song data that the plan files under REC5 «effect
recording»; the transport parts are only a few READS (metre, subdivision, tempo, playhead, brace) and three actions (pause, set the
brace, seek). song/ may not import the transport anyway (folder rule), so moving REC4 first would not remove those wires. Order:
- 2a: capture records → `song/capture.js` (the part of REC5 that REC3 needs) + `song/env.js` (one wire for what song/ needs from above:
  the engine's effect declarations, live choices, transport reads/actions — the interface REC4's clock will answer).
- 2b: automation lane + per-note lanes + bends + volume bars + track chain edits → `song/automation.js` (+ `song/pernote.js` if large).
- 2c: inserts, timbre, clipboard, quantise, degrees/mode/transpose → `song/edit-insert.js`, `song/clipboard.js`, `song/transpose.js`.
- 2d: sections → `song/sections.js`.
- then REC4 (transport/clock.js, transport/scheduler.js), then REC5 (live/, freeze/), each in parts.
- 2a done: `song/capture.js` (135 lines: capture records, their version, take counter `takeNext`, lane-shape law, track role/chain
  key, capture summary) + `song/env.js` (the wire). recorder.js 4897 → 4799. Static PASS · data PASS 13/0 · browser --quick PASS
  57/0 (121.5 s; frozen seed bass 0.08686 / 0.055319 / 650886; state guard clean; UI, CSP, network PASS). Fix rounds 0.
STARTED 2b automation → song/automation.js 00:15
- 2b done: `song/automation.js` (786 lines: bus lane read/edit, per-note lanes, bend points and shapes, volume bars, track chain
  edits, their history kinds). recorder.js 4799 → 4011. Static PASS · browser --quick PASS 57/0 (120.1 s; frozen seed bass exact;
  UI, CSP, network PASS). Fix rounds 1 (a line with two declarations — `bendDbg` — missed by my move script; caught by the static check).
STARTED 2c inserts/timbre/clipboard/quantise/transpose 00:20
- 2c done: `song/edit-insert.js` (inserts, session take, timbre), `song/clipboard.js` (ED2), `song/quantise.js` (ED3),
  `song/transpose.js` (ED4, OWN1, TF3). recorder.js 4011 → 3565. Static PASS · browser --quick PASS 57/0 (124.3 s; frozen seed bass
  exact; UI, CSP, network PASS). Fix rounds 2 (my replace rule wrote a literal back-reference — six live-timbre reads restored from the
  snapshot and checked function by function; a name used after a spread `...noTie` was missed by my move script — the static check caught it).
STARTED 2d sections → song/sections.js 00:26
- 2d done: `song/sections.js` (ED6 sections + the brace/marks/lanelen history kinds; `secMarksSet` is the markers' one writer outside).
  recorder.js 3565 → 3352. Static PASS · browser --quick PASS 57/0 (115.2 s; frozen seed bass exact; UI, CSP, network PASS). Fix rounds 1
  (again a line with two declarations — `secDbg`).
- REC3 COMPLETE. Export lists of the new modules trimmed to what is imported. Left in recorder.js on purpose: the editor SESSION
  (open/close/switch track), snapshot undo steps (take, ⤺, row delete, backing, ✕) and the history kinds snap/tab/master/key — they need
  the sound, the freeze registry and the brace, which move in REC4/REC5.
STARTED REC4a transport/clock.js 00:31
- REC4a done: `src/transport/clock.js` (264 lines): the transport state `loop`, song length (+ `songLenGrow`), brace math
  (songAt, rgnReps, rgnApply, rgnSync, braceTap/Move/Set …), metre map `beatLevel`, the setters (tempo, metre, bars, subdivision,
  quantise), `loopPos`; ⛳ every beat↔time conversion now goes through five clock functions (`secPerBeat`, `beatNow`, `timeAt`,
  `secOf`, `beatsOf`) with the exact old arithmetic (recorder 25 sites, frzqueue 1, render 5; probes left as independent checks).
  A brace jump's release / swap cancel / chase come through `clockWire`. recorder.js 3352 → 3112. Static PASS · browser --quick --all PASS:
  P.quick 57/0 (115.2 s), P.all 76/0 (540.4 s) — GOLD 84/0, HAND1 525/0, AF2 7/0, AF6b 10/0, LR1 4/0, TF0 217/0, ED7 56/0, SND-F1 parity,
  CAM-FIX 35/0, CAM-START 12/0, frozen seed bass 0.08686 / 0.055319 / 650886, UI, CSP, network PASS. Fix rounds 1 (my conversion rules
  also rewrote the new definitions themselves into self-calls — fixed before any run).
- Order decision for the rest (measured): the freeze block needs only 6 recorder internals → REC5a freeze/registry.js comes BEFORE the
  scheduler (REC4b), which needs freeze. No new import cycle is allowed, so each step uses a small wire for the calls back up.
STARTED REC5a freeze/registry.js 00:46
- REC5a done: `src/freeze/registry.js` (≈720 lines): registry by lane id, signature/state, watcher reads, install + pending readers,
  16-bit store, the AF2 swap, both seams, node life cycle; `freezeWire` brings capture snapshot, live drone, release, chase;
  `frzWatchBump` is the watcher version's one outside writer. One file, not the plan's registry + swap: the seams call the swap and back.
  recorder.js 3112 → 2421. First run NOT A PASS (15 rows ERROR «Assignment to constant variable»: the recorder still did `frzWatchVer++`
  on a variable that had moved — the static check does not see writes to imports). Fixed; a scan for writes to imported bindings now runs
  after every move. Re-run: P.quick 57/0, P.all 76/0 (588.5 s), GOLD 84/0, HAND1 525/0, AF2, AF6b, LR1, AF3 26/0, AF5 16/0, frozen seed
  bass exact, UI, CSP, network PASS. Fix rounds 1.
STARTED REC4b transport/scheduler.js 01:12
- REC4b done: `src/transport/scheduler.js` (502 lines): replay cursors and their rebase listener, look-ahead `scheduleLayers`, seam
  releases, chase, `fireNear`, metronome, heartbeat `tick`, stop at the end, `startTransport`, `seekTo`; `schedWire` brings the
  recording state, the take, ENG, per-pass closing, capture sampling, effect playback, the chord highlight; `chaseReset` is the chase
  cache's one outside reset. recorder.js 2421 → 1951. Static PASS (fix: a namespace import my script wrote wrong; no-argument wrappers for
  the argument-count check) · P.quick 57/0 (117.4 s), P.all 76/0 (601.9 s), GOLD, HAND1, AF2, AF6b, LR1, AF3, AF5, TF0, ED7, frozen seed bass
  exact, UI, CSP, network PASS. Fix rounds 1 (static only).
STARTED REC5b live/eng.js 01:26
- REC5b done: `src/live/eng.js` (makeENG, the live ENG, evHz/evReg/evHzDbg). recorder.js 1951 → 1850. Static PASS · P.quick 57/0, P.all 76/0
  (595.4 s), GOLD, HAND1, AF2, AF6b, LR1, AF3, AF5, TF0, frozen seed bass exact, UI, CSP, network PASS. Fix rounds 0.
STARTED REC5c live/record.js 01:40
- REC5c done: `src/live/record.js` (755 lines): recording state, take routing by source, push, per-role recorders, per-pass closing,
  W* calls, latch opening, setRecording / recStop / onRec; setters `curTakeSet`, `recWinReset`, `liveChClear` for outside writers;
  `recWire`. recorder.js 1850 → 1127. Static PASS · P.quick 57/0, P.all 76/0 (588.9 s), write path 1762/0, GOLD, HAND1, AF2, AF6b, LR1,
  AF3, AF5, TF0, ED7, frozen seed bass exact, UI, CSP, network PASS. Fix rounds 0.
STARTED REC5d live/backing.js 01:55
- REC5d done: `src/live/backing.js` (93 lines: loadArrangement, loadJam, backingEvent, clearJam; `backingWire`). backingFollowKey stays in
  the recorder (it re-keys and resplices). recorder.js 1127 → 1058. P.quick 57/0, P.all 76/0 (582.0 s), all nets PASS. Fix rounds 0.
STARTED REC5e live/capture.js 02:08
- REC5e done: `src/live/capture.js` (351 lines: capture sampling, the fine-recording automaton, effect playback `fxLaneMerge`/`fxPlay*`,
  `fxIsDriven`, live isolation `setLiveIsolation`/`playKeyOf`; `capReset` for ✕). recorder.js 1058 → 725. P.quick 57/0, P.all 76/0
  (588.2 s), all nets PASS. Fix rounds 1 (static only: the checker does not count a name used only after a spread `...x` — I removed the
  `frozen` import it called unused; restored. Reported below, not fixed: outside the slice).
- ITEM 1 (recording line) COMPLETE in 11 checkpoints. recorder.js 4897 → 725 lines (start of tonight → now; 6085 before REC1). What still lives
  in recorder.js on purpose (it is the session glue that touches everything): the wiring, lane prune/reset/delete, mixer setters, laneHush,
  the drone sync, the editor SESSION, the snapshot undo steps + histCommit + clearSong + kinds snap/tab/master/key, softAllOff / liveAllOff /
  trackResplice, backingFollowKey, onLoop, onUndo, seedTake, clearRec, panic. Moving those = a later small slice (e.g. «live/stops.js»,
  «song/session.js») once the wires settle.
- Final item-1 checks: static PASS (cycles: only the old one inside the probe files), data PASS 13/0 (32.1 s), browser --quick --all PASS
  (above). Machine: the user's Chrome stayed open all night; from ~00:10 it was idle enough that rows ran at 0.7–1.1× the idle reference.
STARTED item 2: FMT1 core/format.js + core/registry.js 02:24
- FMT1 done: `src/core/format.js` (the envelope's version rules: `FORMAT_VERSION` per kind, `MIGRATIONS` (none yet), `upgrade(rec)` —
  older files migrate on a copy, a NEWER version is refused in words «made by a newer Handsong (file version N; this one reads up to 1)»;
  the scale-data validators moved verbatim from scaleload.js) + `src/core/registry.js` (⛳ the user's ID model: id spaces — built-in
  readable fixed ids, user «u.<uuid>», pack «<pack>/<name>», «u.» reserved; `newUserId`; `createRegistry(kind)`: add / hide / show /
  remove (a built-in is never removed — hidden) / rename (name only) / the person's order separate from identity). scaleload calls
  `upgrade` before checking (v1 → the same object). New node row «FMT1 format + registry (core)» 24 cases with two CONTROLS. Data PASS
  14/0 (THIRD-PARTY-LICENSES.md regenerated by its tool: two glyphs now listed under core/format.js) · browser --quick PASS 57/0.
  Only change a person could ever see: the words for a file from a NEWER app version (none exist). Fix rounds 2 (my inline comment ate a
  `catch`; «u.x» counted as a built-in id).
STARTED TIM1 timbre ids 02:32
- TIM1 done: a permanent `id` in every built-in timbre / kit (23 solo `solo.*`, 17 chord `chord.*` incl. `chord.firefly`, 7 bass `bass.*`, 5 kits
  `kit.*`), one `core/registry.js` registry per role (built-ins; hidden ones leave the picker, stay readable), `timbresOf(role)` →
  [{id, idx, name}], `timbreIdOf`, `timbreById`, `timbreReg`; the editor's timbre selector now carries ids (the track still stores the index —
  TIM2). Readers updated (draw, ui, songs, two probes). New row «TIM1 permanent timbre ids» (58 cases: the pinned id list — ids must never
  change —, round trips, hide/show, a built-in cannot be removed; CONTROL a renamed id). Rules #36 (pure core) and #37 (identity ≠ name ≠
  position — the user's model, verbatim also in archive B «USER REQUIREMENTS FOR STABLE IDS») added to CLAUDE.md.
- ITEM 2 final checks: data PASS 14/0 · browser --quick --all: P.quick PASS 58/0 (105.8 s); P.all 77 rows, 75 PASS, 2 real-time misses —
  «AF2 freeze swap inaudible» (seam click 7.92×, limit 3×) and «SND-F1 dynamics live = offline» (the live Glue capture off by the whole peak —
  the same timing miss seen on 2026-10-15). Each re-run ALONE once: AF2 7/0, live Glue 3/0. Neither path was touched tonight after their
  full PASS runs (TIM1 only added ids next to the timbre settings). GOLD 84/0, HAND1 525/0, F0 snapshot 261080/0, TF0, AF3, AF5, frozen seed
  bass exact, UI, CSP, network PASS.

STARTED GES1 part 1 gestures/features.js 02:48
- GES1 part 1 done: `src/gestures/features.js` (pinch ratios, touched fingers + hysteresis, smoothing, smoothstep, degree / axis / palette-cell
  hysteresis, the HAND1 pinch control) — pure, runs in node; new data row «GES1 gesture features (core)» 15 cases, 2 CONTROLS (fix rounds 1:
  three wrong expectations in my new row's test hand, corrected — the code was untouched). gestures.js 1213 → 1135. Data PASS 15/0 ·
  browser --quick PASS 58/0, HAND1 525/0.
STARTED GES1 part 2 gestures/expr.js, looper.js, fxhand.js 02:56
- GES1 part 2a done: `src/gestures/fxhand.js` (fxParamsOf, captureFx — no dependencies) and `src/gestures/looper.js` (doLooper,
  fireLooperCmd; `looperWire` brings the probe clock and the probe's command tap). gestures.js 1135 → 1011. Static PASS · data PASS 15/0 ·
  browser --quick PASS 58/0, HAND1 525/0. Fix rounds 1 (my block end took two lines of the next function's comment — put back before any run).
- GES1 part 2b done: `src/gestures/expr.js` (the expression hand; `exprWire` brings HANDS; `exprPrevSet` for its two outside writers).
  gestures.js 1011 → 903. Static PASS · browser --quick PASS 58/0, HAND1 525/0. Fix rounds 0. `gestures/hands.js` (processHands) is left.
- Stopped adding slices here (03:20): AUD1 needs the engine-context («E») design — better done awake with the strategist.
- FINAL CHECKS (03:20): static PASS · data PASS 15/0 · licences PASS · browser --quick --all PASS — P.quick 58/0 (115.9 s), P.all 77/0
  (638.0 s): GOLD 84/0, HAND1 525/0, TIM1 58/0, AF2 7/0, AF6b 10/0, LR1 4/0, SND-F1 dynamics + live Glue + freeze parity, AF3, AF5, TF0,
  ED7, write path 1762/0, CAM-FIX 35/0, CAM-START 12/0, F0 261080/0, frozen seed bass 0.08686 / 0.055319 / 650886, UI, CSP, network.

## ☀ MORNING SUMMARY (plain language)
**What was done tonight (all checked, nothing you can hear or see changed):**
1. **The probe runner** gives its quick check more time by itself when the computer is busy (it measures how slow the rows run).
2. **The recorder was taken apart** — the biggest, most tangled file — into small files with one job each:
   editing tools → `src/song/`; clock + scheduler → `src/transport/`; frozen tracks → `src/freeze/`; live recording, the engine
   table, effect capture/playback and the backing → `src/live/`. **recorder.js: 4897 lines at the start of tonight → 725**
   (6085 before the split began yesterday). What is left in it is the "glue" between the parts.
3. **FMT1** — one place that knows the file format: versions, upgrading older files, a polite refusal of a file made by a newer app.
4. **TIM1** — every built-in sound has a permanent name-tag (e.g. «chord.firefly»), built to your rules: the tag never changes, the
   name and the list order are separate, built-in sounds are hidden, never destroyed. Your full requirements are written into the plan.
5. **GES1 (first two parts)** — the hand-gesture maths, the expression hand, the effects hand and the looper hand moved out of
   gestures.js into `src/gestures/` (1213 → 903 lines).

**Probe verdicts (final run):** everything PASS — static check, data runner 15/0, licences, P.quick 58/0, P.all 77/0 (golden sounds 84/0,
gesture fingerprint 525/0, frozen bass exact, recording/undo/editor, camera, UI clicks, privacy). On the way: one real failure (fixed the
same minute — a moved variable was still written from its old file), and two timing-sensitive rows missed once (passed alone and in the
final run).

**Decisions I took:** work order from the real code dependencies; small "wires" instead of import loops; frozen-track code in ONE file
(the plan said two — the parts call each other); new hard rules #35 (all beat↔time conversions through the clock), #36 (the core stays
pure), #37 (your ID model).

**Not done / skipped:** AUD1/AUD2 (split the sound engine — needs the engine-context design; no decision from you, just a daytime
slice), the rest of GES1 (`gestures/hands.js`), DRAW1. **UI1b (design tokens + icons) needs YOUR answer:** «should the tokens and the
icon component start from today's look, or wait for your authored design?». Later by plan: TIM2 (songs store timbre ids), SONG1 (songs
carry the id + a full copy of each sound).

**Two small findings for the strategist:** the static checker (a) does not notice code that writes to an imported variable, and (b) calls
a name «unused» when it is used only after a spread `...x`. I worked around both tonight; a fix belongs in its own small slice.

**Your Chrome was open all night** — I did not touch it.

**Morning check — nothing visible or audible changed.** Optional 1-minute sanity check: ▶ Play → ● record a few chords → ● stop →
✎ open the window → tap the track → in the editor bar change the timbre → it changes, ↶ brings it back → ✕ close. That's all.
