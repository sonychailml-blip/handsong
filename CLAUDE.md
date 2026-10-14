# CLAUDE.md

Guidance for Claude Code in this repository. Concise by design: every rule, number and name is here; the long reasoning behind
each section lives verbatim in `archive/CLAUDE-full.md` (same section titles — grep them). State, open decisions and work order:
`HANDOFF.md` (history: `archive/HANDOFF-history.md`).

## What this is
**Handsong** (repo folder `air-synth-3`; old name only in doc titles): a gesture-controlled synthesizer and interactive
scales/tunings tutorial, entirely in the browser. Webcam + MediaPipe hand tracking; pinches play notes/chords/bass/drums/effects;
all sound is Web Audio. On top: a **linear multitrack recorder** (events in ABSOLUTE song beats on tracks; a take creates a track
or merges into an armed one; undo removes the last take; an optional bar-quantised repeat brace; many names still say `loop`),
**arrangements** (harmony/rhythm/bass as backing tracks), a **track editor** (piano roll + automation lane, own undo/redo), an
**expression hand**, a **looper hand**, and a **six-lesson tutorial** inside the live app.
- ES modules under `src/`, loaded by `<script type="module" src="src/main.js">`. No build, no app dependencies, no unit tests.
  `index.html` = markup only, `style.css` = all CSS; the only external dependency is `@mediapipe/tasks-vision` from a CDN
  (`vision.js`). Root also has `manifest.json` + `sw.js` (PWA pair). Dev tools only: `tools/` (`package.json` with
  `playwright-core`, `tools/node_modules/` git-ignored).
- **One control model.** One role fills the screen (`phoneInstr`, role button). In **landscape** an optional **split**
  (`splitOn`) shows two roles side by side. Role is decided by ZONE (which half a hand pinches in); work inside a half is by
  POSITION. No hand-keyed role binding anywhere (`handRole` deleted); "effects on the left hand in the solo half" is derived
  from the default `handFn.ld.L='fx'` (hard rule #18). PC mode, `uiMode`, `drawPC` are gone.
- **Language:** code comments were Russian; new/edited comments are short English (standing rule). User-facing strings are
  English-first with Russian alongside (see "Language").

## Running / developing
- Serve over HTTPS or `localhost` (camera + wakeLock need a secure context; `file://` fails). Team default: VS Code Live Server,
  `http://127.0.0.1:5500`. Phone: `npx cloudflared tunnel --url http://localhost:5500`, cache bust `?v=N`.
- Scale data are JSON files in `data/`, fetched at start. MediaPipe model/WASM/library come from CDNs — internet required. ⚠️ The app
  does not work offline at all (SW caches nothing on purpose). Needs a webcam + WebGL. Audio starts only on the "▶ Play" click.
- `?probe` in the address loads the probe (`window.P`, guarded) and the render/ear tools (`window.R`) and user files (`window.U`).

## Standing working rules (apply to every slice; prompts don't repeat them)
- **What a new session reads:** `HANDOFF.md` and this file. Open the archives, `BACKLOG.md`, `docs/NAME-INDEX.md` (every code name by
  module, stale names) or long code files only for what the slice needs, by `grep`, not top to bottom.
- **Never run git** (not even read-only); never commit. Never run the app, a server, a build, a browser or tests by hand — the two
  probe runners below are the exceptions (they start and stop their own server and browser).
- ⛳ **Probes before every report — Claude Code runs them and fixes failures until PASS** (user's rule, AUTO-PROBE):
  `node tools/probe-data.mjs`, then `node tools/probe-browser.mjs` (see probe budget for which flags). ⛔ Never by widening a
  tolerance or weakening a control: a control that cannot fail is replaced by one that must; a lottery measure by an exact one;
  both named in the report. The report quotes the final verdict lines and the number of fix rounds. The user then does only ear,
  camera/hand and phone steps, plus a manual `await P.all()` about weekly as a cross-check.
- ⛳ **Probe budget** (user's rule, DOCS-EN):
  - Core audio (freezing, recording, transport timing, rendering) gets strict probes; UI and simple features get light probes plus
    the user's eye.
  - Prefer deterministic checks (offline render, data) over real-time captures. Add a real-time capture probe only when nothing
    else can catch the risk, and say why in the report.
  - Every slice: `node tools/probe-data.mjs` and `node tools/probe-browser.mjs --quick`. `--all` only when the slice touches sound,
    rendering, recording or tuning data. `--repeat 3` only when a real-time row (today AF2, AF6b, LR1) was added or changed.
  - Probe work stays under about a third of a slice's effort. If a probe is still flaky after two fix rounds, stop and report the
    evidence instead of continuing.
  - When a probe row becomes redundant (covered by another), propose merging or removing it in the report.
- ⛳ **Code comments** (user's rule, DOCS-EN): English, short — one or two lines of "why". No mass translation of existing
  (Russian) comments; when you edit a function, rewrite its comment into short English. ⛔ Never touch user-facing text
  (`i18n.js`, UI strings) for this purpose — the app's languages stay as they are.
- ⛳ **Slice records in `HANDOFF.md`** (user's rule, DOCS-EN): English, at most about 15 lines; details go to
  `archive/HANDOFF-history.md` (appended).
- **Docs:** `HANDOFF.md` stays under ~20 KB; this file stays concise — keep every rule, put long reasoning in the archive.
  BACKLOG.md / UI-MAP.md stay Russian; any section you edit is rewritten in English.
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts), not routine slices (AF, ED, AR, MX, records). Planned uses: foundation plan
  (before stage 3), hearing the room (before 5), synthesis core (before 7), latency and hands, a periodic deep review + type-checking prep.
- **The data runner `tools/probe-data.mjs`** is the one exception to "never execute application code in node": it runs only the
  data modules (`probedata.js` → scales/state/i18n and their imports) against `data/`, prints a line per check and ALWAYS a final
  verdict (`[probe-data] PASS — …` / `NOT A PASS — …`, exit 0/1; no verdict = failure). 40 s – 2 min. Quote its verdict.
- **The browser runner `tools/probe-browser.mjs`** (AUTO-PROBE; `npm install` once in `tools/`): own static server on a free port,
  fresh temporary profile per run (the user's browser data is never touched), headless installed Chrome (`channel:'chrome'`, no
  download), fake camera (no hands), autoplay allowed; presses ▶, starts `P.seed({replace:true})`, types `P.quick()` during it
  (must be refused — the console guard), waits for the seed's end, then `P.quick()`/`P.all()` with a line per row, the summary
  lines and every "first differences" block; exit 0 only on PASS. Flags: `--quick` (default), `--all`, `--quick --all`,
  `--repeat N` (N fresh browsers, P.all each, then a table of every measured value with its margin — `meas()` in the probe,
  `res.measures`), `--eval file.js` (script in the page after the seed, prints JSON), `--headed` (off-screen window; worse: a drawn
  row went "tab hidden"), `--browser msedge`, `--limit-min M` (per P.all, default 5; P.quick 3, seed 3, start 3). Full console →
  `tools/.probe-logs/` (git-ignored). Headless is the default because measured: every row runs, P.quick takes the user's manual
  time. Allow once in Claude Code: `node tools/probe-browser.mjs:*` (Bash). The runner PAUSES auto-freeze for its whole session
  (`frzqueue.afPause('runner')`; AF3 is checked by its own deterministic row). In `--eval` the page has `window.__heap()` (full GC, then
  V8 heap usage incl. ArrayBuffer backing stores) and `window.__procMem()` (full GC, then the renderer processes' private MB and threads
  from the OS — native memory). `--leak` (RENDER-LEAK): 30 short renders of the smallest non-KS track must stay within 20 MB of the start;
  control: 30 more with `R.renderKsLazy(false)` must exceed it. Run it when a slice touches rendering or offline contexts.
  Hygiene (runner fix, 2026-10-14): every exit path (end, failure, time limit, Ctrl+C, SIGTERM, uncaught error) closes the browser with a
  bounded wait, then kills its process tree, then the server (Playwright's own signal handlers are off — the runner's take over); at start
  it lists browsers and profile folders left by earlier sessions (found by Playwright's temp-profile path `playwright_chromiumdev_profile-…`);
  `--kill-stale` kills / removes them, `--clean-only` does only that; `--limit-start M` (app start limit, default 3 min) and `--cdn-cache`
  (the pinned MediaPipe files served from `tools/.cdn-cache/`, fetched once — for a slow network); `--selftest-exit sigint|error` fires one exit path 3 s after ▶ (a
  cleanup test). UI checks with REAL input after the seed in every session (`--no-ui` skips): a section marker renamed by mouse double click,
  CDP touch double tap and §✎ (control: the old rename opened inside the press must fail), and a bend point dragged with the mouse (one
  step, cents up). Measured: a hard kill of node (a tool timeout) runs no handler, but Chrome exits by itself when its pipe closes — only
  the profile folder is left.
- **Static checks — every slice:** `node tools/check-static.mjs` (syntax of every module; static import names vs exports with
  comments stripped; export lists declared; literal dynamic import targets present; no call to a declared/imported
  `function name(…)` with MORE arguments than parameters; no imported name CALLED inside a scope that shadows it; no name read or
  called that is not declared, imported or in the checker's `GLOBALS` (add new browser APIs there)) and `node --check` on changed
  files. Report the result.
- **Read `src/` before changing anything**; re-verify every line number.
- ⛔ **Never insert a comment in the middle of an export list**; re-read every export list you touch.
- **Changed a signature or a stored field's meaning → find every reader**, positional callers included (rule #15); the probe module
  `src/scaleprobe.js` is a caller too. The report LISTS every positional caller of every changed function with its arguments.
- **Stay inside the slice.** Defects outside it are reported, not fixed.
- **Probes — speed:** `await P.quick()` = `P.all()` without `SLOW_ROWS` (all-view sweeps T1, T2, T4b1, T4b3, T4b4, T5, T6b, F0, F3;
  "tracks: every one reachable"; LR1; AF2; AF6b); in it the rendering rows (MX1, MX2, render repeatability, renders serialized) use
  only the pitched track. Every rendering probe renders a SHORT window (`renderTrack(…, {short})`, `PROBE_SHORT` 1 s of song, tail
  ≤ 0.75 s) — never `freeze`/❄/`R.aud`. On demand only: `P.checkRepeat({evidence:true})`, `P.orderCheck()`, `await P.freezeCost()`.
  `DRAWN_ROWS` (tracks reachable, AR1, MX1, MX2, AR2) read "not checked: tab hidden" when frames don't come.
- **Probes — discipline:** a probe that changes mixer state, windows or engine options restores ALL of it in `finally`; `P.all()`
  runs a **state guard** between rows (before/after snapshot of mixer tables, windows, live sound state, the render engine
  copy's switches and a fingerprint of the song's events — payloads, marks and order); probes work with the song loaded and WITHOUT the editor or hands open; they cover DERIVED paths (chase, ghost,
  selection, dissolve, highlights); accepted only at zero. A thin song proves nothing: `await P.seed({replace:true})` builds a
  deterministic test song; `P.all()` refuses to call a thin song a pass (`material()`). `P.all()` is async — `await` it. While any
  `P.*` runs the auto-freeze watcher is paused (lock → `afPause('probe')`; a render in flight finishes first); a probe that needs the
  watcher drives it by hand with its own clock (`afBegin`/`afTick`/`afEnd`), never real time.
- ⛳ **Commit rule** (user, AR2): `await P.quick()` PASS before every commit; `await P.all()` PASS before commits touching audio,
  rendering, recording or tuning data, and at least weekly — produced by Claude Code's runner since AUTO-PROBE.
- ⛳ **Console guard** (AUTO-PROBE): `window.P` = `scaleprobe.api()` — every probe function behind one lock; while any probe runs
  (P.seed included) another `P.*` call refuses in words ("P.seed is still running — wait for 'Now run P.all()'") and returns
  `{refused:true, why}`. Self-test + control in row "write path (funnels)". A direct `import()` of the module has no guard.
- **A tuning is read through its VIEW (F1):** `scales.tuningOf(s)` = the view's `tuningRec`. Never `TUNINGS[s.tuning]` in a pricing
  or label path (deleting/replacing a user tuning must never change recorded material).
- **User files are not probe material:** sweeps, `P.checkFiles()` and the snapshot cover built-ins only; `P.checkUserDelete()`
  installs temporary records and removes them.
- **Scale data snapshot (F0):** `P.dumpScales()` → `tools/scales.before.json`; `await P.checkFiles()` compares the live registry with
  it value by value (`===`), grouped by field path; renewed ONLY via `await P.renewSnapshot(allowed)`, which refuses unless every
  difference is the declared change. `P.checkNames()` compares labels from naming schemes with frozen pre-F3 label functions.
- **Report format:** documents changed; files changed with a one-line reason; console lines and outputs; static-check result;
  probe verdict lines and fix rounds; what was left undone; docs found stale; the user's remaining steps (ear, camera, phone).

## Conventions — where a feature goes
- Terse, compact code; match the surrounding idiom. Add a feature in the module that owns it.
- **A scale (mode)** = a file `data/modes/<id>.json` + its id APPENDED at the end of `modes` in `data/index.json` (comments go to
  `data/README.md`; the loader's validator must accept it, else it is skipped). v1 shape: `tuning`, `degrees` (tuning indices),
  `root`, `anchor`, `chords`, `menu`; the builder in `scales.js` derives `edo`/`iv`/`cents` and flags — never write them by hand.
  Menu position by `trad`/`grp` (bucketed by `grp` key); addressed by stable `id` (`state.scaleId`, `scales.scaleById`).
  - non-equal (cents) scale: valid `edo`/`iv` stay as nominal structure; home `easia`/`india` (world), `europe` (historical 12-note),
    `exp` (Partch); `noChords`, or a ratio family set (pure-ratio branch), or `gridChords` + integer steps (fixed-grid branch); a
    historical fixed tuning also `fixedKey` (tonic = key; C-anchored cents recipe).
  - non-octave scale: `period:<n>`, equal within the period, section `exp`; never a `2` literal (`periodOf`); `noChords`, or a set in
    the tuning's own steps, or (only `chordBuild:'adaptive'`) a ratio set priced by the period branch.
- **A typed-chord family set** = `data/palettes/<id>.json` (`kind:'steps'|'ratios'`, ratios as strings) + id in `palettes` of
  `data/index.json`; integer steps for edo/`gridChords` scales, ratios for cents/period ratio scales.
- **A rhythm pattern** = one entry APPENDED at the end of `RHYTHMS` (ui holds positional `JR_BACK=0`/`JR_MAQSUM=1`). Declare `beats`
  and `sub:3` for triplets; grid exactly `beats*sub` cells (`gridOk`); written in ROWS (0 kick/1 snare/2 clap/3 hat; row 5 unused);
  volumes in the OLD drum scale (converted by `config.volFromOld('dr',…)`).
- **A timbre/kit** = an entry in `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/`DRUM_KITS`. ⚠️ The index IS the identity (`a.inst`/`a.kit`):
  APPEND only, never insert or reorder. ⛔ A SOLO timbre cannot even be appended (KS banks must be the tail: `LEAD_KS_FROM =
  LEAD_INSTR.length − KS_BANKS.length`); stable timbre ids come first. Chords, bass, kits may append. The editor lists timbres only via
  `audio.timbresOf(role)`.
- **Thresholds / palette geometry** = `config.js`. Expression numbers are split: feature→channel in `gestures.EXPR_CFG`,
  channel→depth in `audio.EXPR_A` (gestures imports audio; the reverse would be a cycle).
- **A hand function** = `state.handFn` defaults + `ui.HANDFN_OPTS` + a branch on `S.fn`/zone in `gestures.js` + a dictionary key.
- **A lesson** = a record in `tutor.LESSONS` + step records + `tutor.<key>.prompt`/`.detail` keys; its `setup` must make its own steps
  completable from any previous lesson. Don't touch the engine.
- **A user-facing string** = a key in `DICTS.en` AND `DICTS.ru` (chrome), or an inline `L()`-shaped name next to the data.
- **A behaviour gate** = a scale property + a predicate in `scales.js`, never a `tag`/index check.
- **A path that creates or removes events** (the editor is the third such path — insert and ED2 paste) = stamp `tk`, keep `t` in absolute song beats, choose
  `a.v`/`a.k` that don't collide (`layerSlotTop`/`layerTakeTop`), remove with `compactEvents`, then `schedInvalidate` exactly once
  (sort first while recording); always write `a.vol` (rule #30).

## Hard rules — do not break these (full reasoning: archive, "Hard rules")
1. **The AudioContext is created only inside the start click** (`#startBtn`; `main.startApp`, shared by Play and Learn, creates it in
   the synchronous part of the click). An `OfflineAudioContext` is NOT covered (no speakers, no autoplay policy): `initAudio(mkCtx)`
   takes an optional context factory, passed only by `render.js` — not a loophole, don't "fix" it.
2. **Never hardcode frequencies, note tables or the octave `2`.** Pitch derives from `baseF()` and the current (or frozen) scale:
   `P^(iv/edo)` with `P=periodOf(s)`, or the cents overlay `2^(cents/1200)`.
3. **Pool oscillators start once and never stop** (solo/chord/bass gated by GainNodes; per-hit drums, metronome, drone LFO, frozen-track
   readers are the one-shot exceptions). Lazily built solo voices and banks obey it: cached and gated, never torn down. The offline
   engine copy is a second instance of this rule (its own oscillators live as long as its own context).
4. **The master limiter stays.**
5. **Lower layers never touch the DOM** — `audio.js`, `arrange.js`, `recorder.js` reach the UI only via `hooks`. `draw.js` is exempt.
6. **Live bindings — write state only through its setter**, never a module-level `const` copy. The recorder re-reads `baseF()`/`CUR()`
   every step.
7. **Per-event scale freeze is the polymodality mechanism** (`sc`/`sev`/`a.ty`; `cents` rides on the frozen `sc`, chords included).
   `sc:CUR()` freezes a REFERENCE to the scale's VIEW: `scales.scaleView` memoises one object per (mode, anchor, chord mode) — a copy
   of the fields + `mode`, `tuningRec`, `anchor`, `chordMode`. Same inputs ALWAYS give the same object (editor grouping, row caches,
   `rectLayout` memo, chord-insert lookup rely on it). ⛔ A bare `SCALES` object must never become an event's `sc`. `a.ty` is usually a
   reference into `CHORD_FAM_SETS` but since U2 can be a fresh one-note array: compare by value (`recorder.tyEq`), price only through
   `scales.chordNotes`. The reference can't be serialised; stable ids (`id`, `tuning`, `scales.viewIdOf`) are the serialisation
   boundary; user-tuning ids and Scala readiness remain prerequisites for saving. ⛳ **TF1/TF2: the view carries the KEY** (`v.key`: 0..11
   from the knob, any integer after a Transpose — 12 = C an octave up; `scaleView(mode, tf, cm, key)` memoised per key; default = a view's
   own key, a bare mode the live tonic). Every pitch and label path reads a key through ONE door `scales.viewKey(s)` (`baseF(s)`,
   `anchorOf`, `keyOf`, `cFix`, labels, editor row caches), and since TF2 it answers the VIEW'S OWN key: ⛳ **the key knob moves only what
   the hands play** (`CUR()` = the view at the live key); recordings keep their key; only Transpose (TF3) moves them, by re-keying views.
   Probe control `keyFollowsDbg(true)` = the old reading. `viewIdOf` stays key-free (F0 snapshot, songs, probes); `viewKeyIdOf` adds
   `~key` and is the track SOURCE (`noteSource`). A view without `key` (old/bare) reads the live tonic (the probe sweeps use `keyless`).
   ⛳ **TF5: the key's CENTS** `v.keyC` (5th `scaleView` argument, same default rule; memo key and field only when ≠ 0) exist only where
   `scales.keyByOneOne(s)` (tuning NOT named by the 12 notes — its naming scheme in data; never fixedKey): the knob reads «1/1 = G» +
   `state.tonicCents` (−50…50). Read through ONE door `viewKeyC(s)`, applied only in `baseF` (×2^(c/1200), no multiplication at 0 ¢ —
   12-note views and 0 ¢ views are the very objects and prices they were); `viewKeyIdOf` adds `+13c`. Probe control `keyCDbg('off'|'ungated')`.
8. **The video draw and `detectForVideo` read the same camera frame** (background before detect, overlays after, one synchronous tick).
9. **ONE layout; never reintroduce a mode gate.** New behaviour keys off scale properties and `splitOn`. **Hit-test and render derive
   geometry from the SAME frozen range** (`S.role`/`S.rx0`/`S.rx1` frozen at capture; `phoneHalves`, `palSplitX`, `rectBandY`/`rectRows`
   single sources; one snapshot per drawn surface — `loopView`, `rollView`).
10. **The split's two halves are always two different roles** (`SPLIT_ROLES` changed only by `cycleHalf`, which skips the other half's
    role): every per-role state is single-valued (one chain, one register, one voice mode, one latch, one lead voice).
11. **Continuous-pitch overrides ride a live-only channel and are NEVER recorded.** Theremin Hz = the named option `live` of
    `ENG.leadOn`/`ENG.bassOn` (shape `(a, ctx, {when, live, own})`), passed only by `WleadOn`/`WbassOn`; replay uses frozen `ti`/`oct`
    (+ solo `a.bend`). Never recorded either: humanisation, the note layout. The effect capture (O-2) is not an event — not a breach.
12. **RAW vs REMAPPED coordinates stay separate; the detector gets the full frame; picture and remap share ONE crop.** Gesture math
    (pinch, hand size, depth, FX drag, thresholds) uses RAW `lm.x/lm.y`; position and hit-tests use `sx`/`sy`. Cover fit via
    `config.coverView` → `state.viewRect` (written each frame by `drawVideoBackground`), used as both `drawImage` source rect and remap.
    Never clamp coordinates or rendering — only the resulting selection saturates.
13. **Mirroring has one source:** `camFacing`/`mirrored()`/`flipX`. Never scatter a `1-x`.
14. **`clearJam` deletes only `ev.jam`-flagged events** (one flag for both backing paths). Never by layer number.
15. **Track events are scheduled AHEAD at explicit times; the `when` argument stays, and the time is ALWAYS the LAST argument.**
    `scheduleLayers` fires at `loop.t0 + (ev.t + off)*spb` within `SCHED_AHEAD`. Every argument added since (`deg`/`oct`, `glide`, `tie`,
    `bri`) sits BEFORE `when` (`leadOn(owner,freq,vol,ins,deg,oct,glide,tie,when)`, `bassOn(owner,freq,vol,ins,deg,oct,glide,bri,when)`,
    `leadOff(owner,tie,when)`, `scheduleBend(owner,points,base,spb,from,when)`); every positional caller that passes a time fills new slots explicitly (`leadOff(k, undefined, at)`).
    An explicit `null` glide means "no glide of my own", never a zero time constant.
16. **`fixedKey` scales are tuned from an ANCHOR note; the tonic is a KEY within that grid, not a multiplier.** The five historical
    temperaments: always C. Pythagorean: `tunable`, its anchor = its "tuned from" choice. Every fixedKey branch reads
    `cFix`/`fixedSlot` through `anchorOf`/`keyOf`, and `anchorOf` reads the anchor from the scale OBJECT (`s.tunedFrom`), never live
    state. `fixedKey` is separate from `gridChords`.
17. **The A4 reference has exactly ONE source:** `aRef` → `a3()` → both `baseF()` and `cFix()`.
18. **In split, hand functions are consulted PER HALF by that half's role** (`handFnOf(key, h.role)`); no hardcoded fx-hand case.
19. **Chord voices keep TWO filters; never merge `f` (attack envelope, timbre) and `fb` (continuous brightness, `setTargetAtTime`).**
    Brightness stays per voice, below the summing boundary (`kind:'voice'`); isolation by owner key. Other roles' brightness
    (`makeBriStage`, per-hit filter) is no licence for a third chord path.
20. **The live chord (`'latch'`) survives the REGION BOUNDARY**; at a seam only tracks' own voices are released (`liveWrapRelease` cuts
    live solo/bass; `releaseLoopLayersAt` releases track owners). Never `chordOff('latch')` there. (The recording's `chOff`/`chOn` at a
    pass boundary are events only.)
21. **Looper-hand commands fire ONCE, from the pinch-capture block** (`false→true` edge); the pinched finger is frozen for `'loop'`/`'hold'`.
22. **Expression-hand liveness lives in the MIDDLE LAYER:** keep the fixed sub-step (`EXPR_CFG.subDt` ≈ 8 ms — without it the 2.5 Hz
    spring self-oscillates below ~13 fps; the `dtMin`/`dtMax` clamp does not replace it), dead zones that return EXACTLY 0, and FOUR
    distinct axes (energy→liveness, openness→wah, spread→distortion character, tilt→delay). Everything via `setTargetAtTime`; every node
    identity at neutral. Volume belongs to its address (Volume entry), never to the expression hand.
23. **The expression hand never writes to an event.** Its only pitch effect is the live-only `exprVibPitch` shimmer. Its five output
    scalars (`EXPR_CH`) ARE captured in the per-take lane under `EXPR_FX='expr'` (not an event). A sixth channel goes into `EXPR_CH`.
24. **`hooks.tutor` is the tutorial's only input, emitted where the action really happens** (`ЗАЦЕПКА ОБУЧЕНИЯ` sites); `done(acc)` stays
    pure; every lesson's `setup` leaves the app able to complete its steps whatever came before (scale, `handFn` of all roles, layout,
    clean song). Change a gesture → move its hook.
25. **A display name is never an identifier** (`L()` names change by language). Use stable ids/keys (`SCENES[].id`, `state.scaleId`,
    `grpKeyOf`).
26. **The note layout is a per-frame CHOICE resolved once, identical for solo/bass/chords; labels follow the SCALE, not the layout.**
    One resolver `scales.rectGrid()`; one arithmetic `rectLayout` (`k`, `dup`, `octaves`, `hasReg`, bands — no literal `4`: use `k`,
    `regBands`, `REG_N`); keep `'auto'` the default. Highlights use the (degree, register) PAIR and are a `Set` (solo from `audio.leadHold`,
    bass from `audio.bassHold`, live keys only; replayed layers don't light). The playing tag lists every sounding note (one-note tag
    unchanged). Idle fingers (k<4) drawn as a dim `—` + `tag.idleFinger`. The per-band register marker is load-bearing when
    `octaves>1` (from `rectNoteAt`). `drawRole` branches on `rectGrid()` for ld/bs/ch, NOT inside `chTyped`; palette guards gate on
    `typedChords()`. `draw.noteLbl` is the ONE label function (reads `scales.namingOf`). The register band exists iff `hasReg`. The
    layout never enters an event. Use `rectNotes()` for "notes on the grid".
27. **A track's identity is its lane id, never its layer number; `laneNew` is the only writer of `laneId`** (always a fresh id). Mute,
    solo, arm, pending delete, level, pan, name, place, freeze — all keyed by id. Never write the lane id into an event.
28. **The scheduler cursors have ONE rebase point, `schedInvalidate`, and it assumes `events` is sorted** (sort first while recording).
    Removal via `compactEvents` (one in-place pass, keeps the array reference `draw` imports); never `splice` in a loop, never
    `events = …`.
29. **Every value that shapes the sound has ONE owner at a time and is recorded BY DECLARATION.** (a) Capture walks the parameter
    declarations (`fxCaptureWalk`/`fxCaptureChain` over `inst.params` from `FX_FACTORY`); no bespoke capture path; values without a
    descriptor declared explicitly (old scalars `FX_AMT`, expression `EXPR_CH`); per-note parameters are captured but played from the
    notes. (b) Since AF5 owners are separate NETWORKS: the HAND always owns the live chain; recordings own the role's TRACK chain
    (`fxPlayDrive` → `playKeyOf(key)`, only when `!recording`) — see rule #31. (c) The AIM has one writer — the hand
    (`gestures.fxParamsOf` → `FX_AIM`); bars draw the aim; `fxIsDriven` is false while isolation is on (no recording drives a live chain).
30. **A note's volume is never unset:** every pitched or drum event carries `a.vol`. `note:{key:'vol', required:true}`; guards in
    `recorder.js`: `pnPlan` (left of the first point takes that point's value; refuses an empty point list), `pnWith` never deletes it,
    deleting the FIRST point hands over to the next, the only point can't be deleted, moving the first point later is refused; generated
    ramp events copy `a.vol`; volume can't be removed or reordered (`fxPerm`). Volume 0 is legal. Every new event writer writes `a.vol`.
31. ⛳ **A track and the live hands never share sound state** (user's rule, AF5 — do not reopen). Everything changed in a track's editor
    (volume, pan, effects, their automation) belongs to that track only and never changes what the player hears live — not while editing,
    not after leaving, not while the track plays its events (unfrozen, stale, skipped by the budget, auto-freeze off). The reverse holds
    too: what the hands turn live never changes a recorded track. Mechanism: every role has a live head and a TRACK head (`audio`:
    `leadOutT`/`chordBusT`/`bassBusT`/`drumBusT`, chain key `state.trackChainKeyOf(liveKey)`, live copy only); a pooled voice ends in a router
    (`rL`/`rT`) set at each attack by its owner (`trackRouteOf` = `recorder`: `layerOfOwner(k)!=null`), a drum hit picks its bus the same
    way; solo track voices skip the expression stage and its pitch shimmer (`v.shim`); recorded automation drives only the track chain; a
    FROZEN track drives nothing (`fxPlayBuild` filters `frzBufNow`); song load gives map-less solo notes the live solo snapshot once. The
    render copy has no track heads. Probe row «AF5 track and live isolated»; control `recorder.setLiveIsolation(false)` (old shared network).

## Module map (every exported/notable name, per module: `docs/NAME-INDEX.md` — grep it, don't read it; reasoning: archive, "Module map")
- `index.html` — markup only (start card, top bar, panels `#panelScale`/`#panelSound`/`#panelLoop`, `#backingMenu`, help overlay,
  `#tutorBar`+`#lessonOv`, transport `#loopTransport`, `#arrBar`, `#rollBar`, `<video>`/`<canvas>`); base path relative.
- `style.css` — all CSS. `manifest.json`/`sw.js` — PWA; the SW is deliberately cache-free (empty `fetch` handler, only so Chromium
  fires `beforeinstallprompt`).
- `src/config.js` (leaf, imports nothing) — thresholds, scheduler timings, pool sizes, palette/FX geometry (`palSplitX` = the single
  palette|notes split, `rectBandY`, `coverView` = the single cover crop), volume curve `volAmp(v)=v²`/`volVel`/`volFromOld`,
  fine-recording constants, `INSTR_COL` (the ONE role palette, different lightness), arrangement sizes, the ONE curve law of bends and bus
  lanes (`curveU`/`curveK`, `bendAt`/`bendSplit`, `bendPlan` — BEND-CURVE).
- `src/state.js` — cross-cutting musical/layout state + setters (scale, tonic, `tonicCents` (TF5), `aRef`, `tunedFrom`, instruments, `handFn`,
  `voiceMode`, split + `phoneHalves(W)` (the only `W/2`), registers, camera, editor/window state). Chain-owner key `chainKeyOf(role)`
  → `'role:ld'`, `fxChains`, `FX_VOL`, `chainOwners()`. ⛔ The key is OPAQUE — equality and indexing only, never parsed.
- `src/hooks.js` — nullable callbacks for lower layers; `hooks.tutor(kind,payload)` is the tutorial's single channel; `hooks.cleared()` — ✕ happened (ui: the undo toast, ED7-fix2); `hooks.af(kind)` —
  auto-freeze settle hints (recorder: take, undo, backing, rowDelete, editor, song; ui: panHold, pan); `hooks.afRow(layer)` — the window's
  freeze dot (both set by `frzqueue.js`); `hooks.key()` — a song Transpose step (or its ↶/↷) moved the key knob (ui: `#selTonic`, scale
  button, TF5 row).
- `src/i18n.js` — `LANGS=['en','ru']`, `DICTS`, `t(key,params)` (dict → en → `params.def` → the key), `L(field)`, `store`,
  `applyI18n`; persisted as `handsong.lang`.
- `data/` + `src/scaleload.js` — ALL scale data are JSON files (v1; manifest order = menu order = F0 index); per-file validation; a
  broken file is SKIPPED (one console line, `#loadmsg`); nothing valid → the embedded emergency pair. User files (IndexedDB, ids
  `u.<uuid>`) load after the built-ins through the same validator.
- `src/userstore.js` / `src/userfiles.js` — user file storage and the console API (`window.U` with `?probe`); a record others depend on
  can't be removed; deleting never breaks recordings (`P.checkUserDelete`).
- `src/scales.js` — the teaching layer and pitch truth: builder → `TRADITIONS` (6), `TUNINGS` (18), `CHORD_FAM_SETS`, `SCALES` (74).
  ONE pitch function `pitchHz(T,A,z,k,R)=A·P^R·ρ(k)` (⚠️ keep its multiplication order); chord pricing `chordNotes`; memoised view
  `scaleView`/`CUR()`; predicates (TF5: `keyByOneOne`, `historicalKeyOf`, the cents door `viewKeyC`); rect layout; theremin; `registerRecord`/`unregisterRecord`.
- `src/audio.js` — the Web Audio engine (see "Audio engine"): pools, synthesis paths, drums, drone, metronome, FDN reverb, `FX_FACTORY`,
  chain wiring, track level/pan, master, frozen-track store/reader, probe and render helpers.
- `src/ks-worklet.js` — Karplus–Strong `ks-string` (mandatory worklet: a native delay loop is floored at 128 samples); allpass
  fractional delay + loop-filter phase compensation (< 1 cent); seeded via `processorOptions.seed` only in track renders.
- `src/frz-worklet.js` — frozen-track STORE (`frz-store`, transferred Int16 chunks) and READER (`frz-reader`: context frame F ≥ startF
  plays buffer frame F + d, integer frames; reports `{ended, played, first, seen}`; `ready`; `ALIVE`). Frame never goes backwards.
  Loaded on the LIVE context only.
- `src/probe-cap-worklet.js` — probes only: audio-thread capture of the live master (`F0`, `gaps`, `stale`).
- `src/arrange.js` — arrangement data + pure generation (`PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `BASS_MODES`, `buildArrangement`);
  volumes in the OLD per-role scale, converted at event birth. Imports only `config.js`.
- `src/recorder.js` — the recorder (see "Time, tracks and the recorder", "Freeze"): `events` (stable array), `loop`, `ENG`, scheduler,
  lanes, brace, chase, undo, stops, backing, capture and playback of effects, the editor API, lane tables, freeze registry and
  signature, `seedTake`, `evHz`.
- `src/frzqueue.js` — auto-freeze: the WATCHER (AF3) and the QUEUE (AF1), lazily loaded by `render.js` (see "Freeze").
- `src/vision.js` — camera + MediaPipe (`openCamera(facing)`, `switchCamera` — the landmarker is never recreated).
- `src/clip.js` — clip/audio recorder (`startClip`/`stopClip`, `activeKind()`, `captureFrame()` last in every frame, `REC_FPS` 30);
  `recKind` is the single truth.
- `src/demo.js` — start-screen tunings demo (own mini-engine); scenes by stable id (`SCENES[].id`).
- `src/tutor.js` — lesson list + step engine (see "The tutorial").
- `src/gestures.js` — the gesture state machine (`HANDS`, `processHands`, owner keys, voice modes, hysteresis, depth, `fxParamsOf` =
  the aim's single door, expression, looper hand). At pinch capture the hand's role and X-range are frozen on `S` (`S.role`, `S.rx0`,
  `S.rx1`, `S.zone`, `S.fn`).
- `src/draw.js` — canvas: video background, overlays, roles, grids, palette, FX bars, status, `noteLbl` (the ONE label function), the
  editor (`drawRoll`, snapshot `rollView`, `rollAxis`), the strip and arrangement window (`drawLooper(full)`, snapshot `loopView`).
- `src/ui.js` — menus, buttons and handlers: panels, role buttons, split, camera, clip buttons, backing, pointer routing, effects panel,
  hand functions, the editor shell, arrangement window, tutorial helpers.
- `src/main.js` — composition root: `loop()` (video → detect → `processHands` → overlays → `captureFrame`; each distinct error printed
  once), `startApp()` (the one start path), editor/window branch, `?probe` loading (`window.P`, `window.R`, `window.U`).
- `src/render.js` — render context, seeding and track render behind freeze (see "Freeze"): one engine copy per session
  (`'./audio.js?render…'`, ⛔ never a unique specifier per render), `renderTrack`, `freeze`, `renderQueued` (ONE render at a time; ⛔ no
  third door, never await one render inside another), console `R.*`, ear tools, probe bodies.
- `src/songs.js` — demo songs (`P.song(name, {replace:true})`; today `triphop`); refuses while recording, playing, with the editor
  open, or on a non-empty song without `replace`.
- `src/scaleprobe.js` — the browser probe (`P`). `src/probedata.js` + `tools/probe-data.mjs` — the node-runnable part (imports only
  scales/state/i18n). ⛔ Nothing touching draw/ui/audio/recorder/userfiles goes there.
- `tools/check-static.mjs` (static checker), `tools/probe-browser.mjs` (browser runner), `tools/scales.before.json` (F0 snapshot),
  `tools/song.print.json` (TF0 song sound fingerprint of the seed).
- Stale (removed) names to ignore: list in `docs/NAME-INDEX.md`, "Stale names".

## Architecture (full reasoning per section: archive, same titles)
The frame loop lives in `main.js`: draw video → MediaPipe detect → `processHands()` (gestures drive audio) → `drawOverlays()`. The
recorder thins ~60 engine calls/s into a few intent events per note.

### Screen model — one layout, optional split
- Single role: `phoneInstr` ('ld'/'ch'/'bs'/'dr'), cycled by `instrBtn`; what each hand does comes from `handFn`.
- Split (`splitOn`, landscape only: `canSplit()=innerWidth>innerHeight`): left = `SPLIT_ROLES[0]`, right = `[1]` (`instrBtnL/R`);
  ZONE = instrument (either hand plays the half it pinches in); inside a half by POSITION; hand functions per half by role; each half
  its own register band (`setRectOctReg(S.role,…)`). Rotation to portrait auto-disables split (`softAllOff`), no auto re-enable.
- Frozen at capture: `S.role`/`S.rx0`/`S.rx1` from the half `px` lands in (a margin pinch clamps to the nearest edge).

### Gesture model
- Pinch = thumb (4) near a fingertip (8/12/16/20), normalised by hand size; the pinched finger (`S.oct`) picks the register I…IV
  (switchable mid-pinch = 20 ms glide) — in rectangles it picks the note in the rectangle instead.
- Multi-finger (melodic role in POLYPHONIC mode): each touching finger sounds its own note (up to 4 per hand, 8 total);
  `touchedFingers()` with the same `PINCH_ON`/`PINCH_OFF` hysteresis; `S.order` keeps the first-pressed finger primary (position,
  zone, volume, depth); per finger `S.fing[f]={deg,oct,slot}`; ceiling `state.pinchFingers` (1..4, default 4; ONE number for solo and
  bass); at ceiling 1 (and theremin) the owner key carries no finger number (keeps the mid-pinch glide). LEAD mode: one note, nearest
  finger wins. Chords and drums are single-finger; theremin is one note per hand. If ring/little fingers fire falsely, lower the
  ceiling ("Fingers per hand"). The temporary pinch diagnostic is deleted — don't reintroduce it.
- Y = degree (`degHyst`); X = volume (0 at the far left = silence, 1 = old full level; heard as v²) over the hand's frozen range
  (`[palSplitX(rx0,rx1), rx1]` in a typed-chord role, else `[rx0,rx1]`) — the chain's Volume entry, movable to a finger or Fixed; a
  parameter on `play:x` moves TOGETHER with volume. Z = depth `dist(lm[0],lm[9])` (`REV_NEAR`/`REV_RANGE`, historical names), address
  `play:z`; by default the chord chain's brightness listens; volume may too (VOL-4, per hand, nearer = quieter, `inv` flips).

### Camera frame margin — cover fit; RAW vs REMAPPED coordinates
- `config.coverView(vw,vh,W,H,M)` → the centred sub-rectangle with the canvas's aspect (cover, no stretch), inset by `CAM_MARGIN`; computed
  once per frame in `drawVideoBackground`, used as `drawImage` source AND written to `state.viewRect` for `sx`/`sy`. MediaPipe always
  gets the FULL frame. Default `viewRect` = `[M,1-M]²` (= `remapAxis`). Long axis keeps ≥ 12 %; portrait phone + landscape sensor shows
  only the central strip (inherent to cover). RAW coords drive all gesture math; REMAPPED drive position/hit-tests (rule #12).

### Camera switching & mirroring
`camFacing` + `mirrored()` + `flipX` are the single source (front mirrored, back not); `🔄` re-acquires the stream on the SAME `<video>`
(landmarker kept); failure rolls back with a toast.

### Which hand drives depth
`noteHandRole(key,S,W)` returns the hand's role when it is solo, bass or drums AND plays notes; the depth writes into that role's chain;
chords drive depth inside their own branch. Depth is smoothed exactly once per hand per frame (`depthOf` → `emaS(S,'hs',…)`, memo `S.hsF`
cleared where `processHands` begins a hand); readers: effects hand `z`, chord branch, depth block, volume on depth. Both depth loops skip
the Volume entry. With no playing hand in frame nothing is written (no snap to zero). `handHalfRole`: single-role `phoneInstr`; split —
frozen `S.role` when pinched, else the live half under `lm[8]`.

### Rect model — note layout (switchable: `state.rectPref` 'auto'|'rect'|'rows')
- `scales.rectGrid(s) = rectEligible(s) && (rectPref==='auto' ? !!s.rectGrid : rectPref==='rect')`; the scale's `rectGrid` is only its
  default; `'auto'` must stay the default. Every scale is eligible today (the "unavailable" UI branch was removed).
- `rectLayout(s)` (memoised): `k` = first of [4,3,2] that divides (dup=0 tried before dup=1); `dup` = tonic repeated at the period
  boundary (alignment, not equivalence — no `periodOf===2` gate; the duplicated slot labelled `Т` is true for BP, an overstatement for
  Carlos); `block=iv.length+dup`, `perOct=block/k`, `octaves=clamp(floor(RECT_MAX/perOct),1,REG_N)`, `rects=perOct*octaves`,
  `hasReg=octaves<REG_N`, `regBands=hasReg?1:0`, `bands`, `notes=rects*k`; `REG_N=OCT_ROMAN.length` (4), `RECT_MAX=12`. Idle fingers
  beyond `k` play nothing.
- Table (notes → k, dup, rect/oct, octaves, bands): 5 → 3,1,2,4,8 · 6 → 3,0,2,4,8 · 7 → 4,1,2,4,8 · 8 → 4,0,2,4,8 · 9 → 3,0,3,4,12 ·
  11 → 4,1,3,4,12 · 12 → 4,0,3,4,12 · 13 (BP) → 2,1,7,1,7+1 · 19 → 4,1,5,2,10+1 · 20 (gamma) → 4,0,5,2,10+1 · 22 → 2,0,11,1,11+1 ·
  31 → 4,1,8,1,8+1 · 43 (Partch) → 4,1,11,1,11+1.
- Slot ↔ note: `rectNoteAt(g,base)` → `{deg:g%block, oct:base+floor(g/block)}` with `g=rect*k+finger`; inverse `rectSlotOf` (highlight).
  Event format untouched (`deg ∈ [0,iv.length]`, `oct ∈ [0,REG_N-1]`).
- Register band (band 0, bottom) exists only when `hasReg`; it shifts a window of `octaves` periods (`rectBase`/`rectBaseMax` clamp;
  `drawRectOctBand` lists `rectBaseMax()+1` bases); pinched by position (`'oct'` zone, silent; in chords right of the palette only when
  `typedChords`). Bands are equal — don't special-case heights.
- Chords: rect applies to the ROOT grid (right of the palette for typed scales, full range otherwise); type from the palette.
- The finger legend runs LOW at the bottom (row drawn at `NF-1-n`; mapping unchanged). Labels follow the SCALE (`noteLbl`); when
  `octaves>1` the legend drops cents and gains a per-band register marker. 31-TET and Partch are byte-for-byte as before; 19-TET and
  Carlos gamma deliberately changed (2 octaves, 10+1 bands, a 2-octave window).

### Hand functions (`state.handFn`, options in `ui.HANDFN_OPTS`)
- `ld`: fx/note/hold/therm/expr/loop · `bs`: fx/note/hold/therm/loop · `ch`: fx/latch/hold/loop · `dr`: fx/hit/loop.
- `'fx'` — effects hand (all roles): fingers drive the chain parameters addressed to them; bars at the role's right edge, no gate on the
  hand. `'note'` — continuous notes. `'hold'` — note frozen at the first pinch frame (`S.deg`/`S.oct`, finger change gated off), volume
  still follows X, stops on release. `'therm'` — continuous pitch (solo AND bass; `thereminSpan`/`thereminHz`, linear in cents; bass Hz
  `/4`; additive centre-line overlay `drawThereminLines` when `roleHasTherm`); live-only `live` option; the recorder stores the nearest
  step (+ solo `a.bend` cents curve). Chords: `'latch'` (default; keeps ringing; same-degree re-pinch off, other degree glides; jam and
  split depend on it) / `'hold'` (stops on release via `WchOff('latch')`). Drums: `'hit'`. `'loop'` — looper hand (all roles). `'expr'` —
  expression hand (solo only).
- UI: «Hand functions» section (`renderHandFn`), rows per role in play (`noteRolesInPlay()`), change → `setHandFn` + `softAllOff`.

### Voice modes — solo and bass are one melodic instrument, played two ways (V1–V4b; branch closed)
- `state.voiceMode` `{ld:'poly', bs:'lead'}` (defaults = old behaviour). POLYPHONIC: each hand/finger owns a voice under
  `liveKey(role,hand,finger)` (`'lead:L[:f]'`, `'bass:L[:f]'`); `S.snd`; no hand-over. LEAD (mono, legato): one voice per role under
  `monoKey(role)` (`'bass'`, `'lead:M'`), owner `monoOwner[role]` = last pinch; `endPinch` hands back to a still-pinched hand
  (`otherPinched`); the watchdog releases when the owner left. Gestures branch on the MODE (`polyZone`/`leadZone`); sound and recording
  via `wOn`/`wOff(role, own, …)`.
- Switching (`ui.pickVoiceMode`): `softAllOff` then `gestures.voiceModeReset(role)`; a held pinch plays the new mode next frame. A mode change
  mid-take stays in the SAME track (source = role + timbre + view).
- Code MIRRORS, not merges: bass keeps its own voice builder and register (`bassFreq` two octaves below solo). Bass pool lazy up to
  `BASS_POOL_N`=12; bass recording per owner (`recBass` Map, slot `a.v` written only when non-zero).
- Glide: an engine argument (`setFreq(f,tc,t)`; `glide` before `when`); voice module `glide` (4–800 ms, log; `defBy` 20 ms solo, 12 ms
  bass; not in any default chain); a note carries `a.fx['glide:time']`. ⛔ Glide only on a legato move of a sounding voice: a fresh attack
  SETS its pitch; theremin frames and bend points never receive it (their 20 ms is tracking smoothing); theremin notes don't record it.
  Allowed in poly mode too. Retrigger in lead mode is deferred. Accepted cost: in poly bass mode live hands (up to 8) and bass tracks
  share 12 voices.

### Typed chords — the palette
`typedChords` scales split the chord role: left = palette of types (columns = families, rows = variants; `chordFams()`, `palColX`/
`palRowY`), right = note rows. Selection by POSITION on a thumb+index pinch left of `palSplitX` (`S.oct===0`), sticky, both single-role
and split (one gate). Two-axis hysteresis `cellHyst`. Latch identity = (degree + register + type). Octave: finger (non-rect typed scales)
or the octave rectangle (`chordOctReg`, rect typed scales).
Sets (`CHORD_FAM_SETS`): `'chrom12'`, `'edo19'`, `'edo31'` — integer steps in that edo; `'partch'` — 11-limit ratios (О otonal / У
utonal / Диез 7-11 / Станд.; in "As on the instrument" a type is offered on a root only if every tone lies in the 43 pitches —
`chordTypeFits`; greyed with `pal.unfit`; since F8 a pinch there sounds the ROOT ALONE via `chordAtRoot` → `chordUnit`, tag
`tag.rootOnly`/`tag.typeNotOnRoot`; never nearest-pitch substitution; only 1/1 offers all 24 types; 21/20, 11/10, 14/11, 11/7 none);
`'bp'` — BP 3.5.7 ratios (15 chords incl. three with 11; period branch; "Free", default); `'bpsteps'` — BP in its own steps (12 types,
0–13¢ off; no 11; "As on the instrument"); `'nat'` — 24 types as 5-limit ratios (mobile Natural, adaptive); `'natfix'` — 24 types as
semitone offsets for fixed-grid scales (Pythagorean since P2, Natural-fixed preset, meantone, three well temperaments). `'pyth'` is gone.

### Behaviour properties (prefer these over tags/indices)
- ⛳ **Scale-panel principle (F6b):** every scale-panel switch appears from the MODE'S DATA, never from code (today: chord modes via
  `chords.modes`; "tuned from" via `anchor.policy:'choice'` → `tunable` → `ui.renderTunedFrom`).
- `noChords`; `typedChords:'<key>'`; `cents:[…]` (non-equal); `period:<n>` (BP 3, Carlos 3/2; never hardcode `2`); `gridChords` (chords
  read from the fixed cents grid); `fixedKey` (tonic is a key within an anchored grid); `rectGrid` (layout DEFAULT only); `tunable`
  ("tuned from"); `chordModes` (T7b; data `{id, nameKey|name, hintKey|hint, over}`, first = default; `over` laid on the view; choice in
  `state.chordModeSel`, read only by `chordModeOf`/`scaleView`; row of buttons `#chordModeRow`, one per mode, 1..8 — `scaleload.CM_MAX`;
  part of the frozen VIEW; a change starts a new track (`viewIdOf` adds `#mode`); a seam like the tonic (`softAllOff`)).
  `supportsProgressions()` = the mode's `progressions` field else 7 degrees (and `refreshProgAvail` also needs `supportsChords()`).
- ⛳ **User principle (T7b): don't narrow musical possibilities** — when theory restricts, offer it as a MODE.
- **F7 — one Just intonation** (`just-intonation`, index 58): "tuned from" (`anchor:'choice'`, follows the tonic by default;
  `anchor.followHint`) + chord-mode set `justIntonation`: "Free" (`{build:'adaptive', palette:'nat', naming:'ordinal'}`) / "As on the
  instrument" (`{build:'tuning', palette:'natfix', grid:true}`, naming `notes12`). Override whitelist: build, palette, rule, grid
  (→ `gridChords`), naming (→ `degNaming`). Aliases in the mode file (`aliases:[{id, tunedFrom?, chordMode?}]`): `scaleById(oldId)`,
  `viewOfId`, `applyScaleId`; old `ji-adaptive`/`ji-fixed`. ⛳ A mode EQUALS its default chord mode (`scaleload` refuses otherwise;
  `P.checkBare()`). Snapshot comparison keyed by id for modes/views/chord modes; the menu stays positional.

### Music theory & pitch
- 74 scales (0..73). Six menu sections by SOUND (`TRADITIONS`): `common` «Привычное» (diatonic, modes, ethnic, pentatonics/blues,
  SYMMETRIC scales — whole-tone/octatonics/Messiaen are ordinary 12-TET —, exotics, world pentatonics, Japanese), `mideast` (Arabic
  maqamat, 24-TET), `india` (22-shruti grid + ragas), `easia` (gamelan Slendro/Pelog + patets, Far-Eastern pentatonics), `europe`
  (chronological: Pythagorean → Just intonation → meantone → Werckmeister III / Vallotti / Kirnberger III), `exp` (bounded by TUNING:
  19/31-TET, Partch, Bohlen–Pierce, Carlos α/β/γ). A new scale goes where its culture/sound belongs; never a generic "other" bucket.
- Indian: 22-shruti JI grid (min step 22¢) + 10 ragas picking 7 swaras; all `noChords`; labels via the tuning's naming list (`listLbl`):
  full grid «свара · шрути», ragas swaras only; the swara sits on the LAST shruti of its group (tonic «Са · Чхандовати»). A raga is more
  than a scale (not modelled); Kafi and Malhar share a scale by design.
- Tail index map: 50 BP · 51/52/53 Carlos α/β/γ · 54/55/56 Pelog patets Lima/Nem/Barang · 57 Pythagorean · 58 Just intonation · 59
  quarter-comma meantone · 60 22-shruti grid · 61..70 ragas (Bhairav, Yaman, Kafi, Bhairavi, Todi, Khamaj, Asavari, Malhar, Purvi,
  Marwa) · 71 Werckmeister III · 72 Vallotti · 73 Kirnberger III.
- Pitch three ways: equal `P^(iv/edo)` (`P=periodOf`); cents overlay `2^(cents[i]/1200)` (+ top 1200¢; `edo`/`iv` = nominal structure);
  non-octave period (`P^oct`, `P^(step/edo)`, `pc=1200·log2(P)`).
- **Chord pricing — `chordNotes`, four branches in this gate order (don't reorder):** (1) `cents && ty && gridChords` → fixed grid
  (semitone offsets read from the cents grid; pure/wolf spread); (2) `cents && ty` → pure ratios from the root (Partch, mobile Natural;
  its fixedKey sub-branch has no user); (3) `period≠2 && ty && chordBuildOf==='adaptive'` → period-equal ratios (BP "Free"); (4) fallback
  integer path (typed steps add to the root; untyped by the mode's `chordRule` via `ruleChordSteps`: tertian, `stack` — every other mode
  degree, the 14 pentatonic/blues/Japanese modes —, `ratios` (19/31-TET), `power`, `palette`, `none` = no chord). `chordUnit(s)`: `[0]` for
  branches 1 and 4, `[1]` for 2 and 3 (BP "As on the instrument" `[0]`); a new branch adds its line there. `chordBuild`: `'adaptive'` (pure
  ratios, pitches shift per chord, a choir) or `'tuning'` (the tuning's own pitches) — `chordBuildOf` (absent ⇒ 'tuning'). Step sets
  only for their own edo; ratio sets only for cents scales or adaptive builds.
- Seventh (`seventh`): "Sevenths" disabled with a one-line reason where it only doubles the root (`scales.seventhAddsNote`: blues, major
  blues, whole-tone, Prometheus); the choice is kept.

### Reference pitch (`aRef`) — one source
A4 in Hz (default 440, UI 380–480 via presets + clamped input). `a3()=aRef/2` → `baseF(s)` and `cFix(s)` (TF1: both take the view and
read its key through `viewKey`); changes retune everything live (solo, bass, chords, drone, theremin, replayed layers).

### fixedKey — the tonic is a KEY in an anchored grid
The six (Pythagorean, Just intonation preset "from C + As on the instrument", meantone, Werckmeister, Vallotti, Kirnberger): grid nailed to
an anchor (`anchorOf` — C for five; Pythagorean's "tuned from" choice), `cFix(s)` its pitch (an octave down if above the tonic), `keyOf(s)`
the tonic's offset; every fixedKey branch of `leadFreq`/`bassFreq`/`chordNotes`/`centsOf`/`tonicFreq` goes through them (`fixedSlot`).
"Tuned from" (`state.tunedFrom`, 'T' default or 0..11, `setTunedFrom` + `softAllOff` + `updScaleBtn`): only for `tunable`; `CUR()` =
memoised variant per anchor, so each event freezes its anchor; moving the selector retunes nothing recorded; enters the freeze key's
pinned fields and the render's pin list. Panel: the five C-tuned show «Tuned from C (historical practice)» (`#tunedFromNote`,
`panel.scale.tunedFromC`); Pythagorean shows the selector (`#tunedFromRow`/`#selTunedFrom`, `#tunedFromHint`, button «· from X»). Labels
are real note names. Werckmeister's major third ≈ 390¢ in C, ≈ 408¢ in F#. Pythagorean chords read from its own grid (`natfix`,
`gridChords`; user: "must sound like the Pythagorean tuning"). Mobile Natural stays mobile.

### Scheduler — look-ahead is a hard invariant
Chord/bass/drum track events are scheduled at exact times `loop.t0 + (ev.t + off)*spb` inside `SCHED_AHEAD` (≈ 300 ms), tick
`SCHED_TICK_MS` 25 ms; `off` = whole-pass offset when the brace cycles. Live `W*` calls pass no `when` (= `AC.currentTime`). Solo and drone
fire "almost now" through `fireNear` over `(loop.pos, p]` (moving them into the window would be an audible change nobody made). Cost is
bounded by the window: both loops walk a sorted prefix from cursors (`curSched`/`curNear`, `cursLowerBound`). `startTransport` schedules
the FIRST window synchronously. The window masks main-thread blocking, it doesn't remove it. Accepted: drum hits already scheduled play
after stop/panic/mute/delete/jump; surviving tracks may drop out up to one window after undo/`clearJam`.

### Metre & accent grouping
`loop.metre` (seed `BEATS_PER_BAR`, `setLoopMetre`, `METRES=[2,3,4,5,6,7,8,9,10,12,16]`), changeable only while the song is empty and
stopped (`refreshMetreCtl` disables the control). No denominator by design (7/8 vs 7/4 = tempo only). `METRE_GROUPS` (7=3+2+2,
9=2+2+2+3, 16=4×4) + `METRE_KHALI` (16→[2]) → `beatLevel(metre,b)` → accent levels 2/1/0/−1 for the metronome AND the strip ticks; khali
is a weakened head, not silence. `loop.sub` (`SUBS=[4,3]`) only sets live drum quantise and faint ticks (only when ≠4). Count-in is one
bar at any metre, counting in to the start point `loop.lead`. A pattern whose `beats ≠ metre` is skipped.

### Chord readout
While a live latched chord sounds, its root rectangle lists each note's Hz and cents above the root — read from the sounding voices
(`chordHold['latch']` → `latchChordFreqs`), never recomputed. Replayed chords keep the plain highlight.

### Chord brightness — the two-filter invariant
Hand depth → `bd` (0 near/bright … 1 far/dark) rides into `WchOn`/`WchSet` beside `ty`, recorded as `a.bri` (a `|Δbri|>REC_REV_EPS`
change alone pushes a `chSet`). Voice = `o1/o2 → f → fb → g` (`f` attack envelope, `fb` continuous brightness via `briToHz`; rule #19).
Brightness is the chain's `bright` voice module, seeded on `play:z` (removable, fixable, movable). ⚠️ An ABSENT `a.bri` means "not set"
(the filter opens at attack), not "take the live value" (backing chords never carried it). Bass and drums follow the same "absent = not
set" rule; solo alone keeps "absent MAP = live solo chain" (`applyFx` R2).

### Brightness on every role
`bright` declared for all four roles. Chords: `a.bri`. Solo, bass, drums: `a.fx['bright:amt']`. Solo/bass: a brightness stage per voice
(`audio.makeBriStage`): output = x + w·(LP(x) − x), w = 0 when unset or fully open (exact identity). Drums: a per-hit lowpass only when
set (`hitBus`). Ranges `audio.BRI_HZ`: solo 700 Hz–18 kHz, bass 100 Hz–4 kHz, drums 300 Hz–18 kHz. Solo/bass read at attack and follow
while held; drums at the hit. A newly added brightness takes a free effects-hand finger or Fixed, never the playing hand's depth by
itself. Cost: one biquad + two gains per solo and bass voice.

### Looper hand
Function `'loop'` on any role: index = record (`onRec`: into the armed track or a new one; again = stop), middle = play/pause, ring = undo
the last take, pinky = clear all after a `CLEAR_HOLD_MS` 3 s hold with a visible countdown (release cancels). Single-fire by structure
(rule #21). `doLooper` confirms by name (`setLooperMsg`) and says why when impossible («Nothing to play»/«Nothing to undo»/«Already
empty»). The transport buttons still work.

### Audio engine (`initAudio`) — five chains into one master
`master → limiter → destination`. Chains: (1) solo pool; (2) chord pool (`CHORD_POOL_N` 24 always-on 2-osc voices, gain-gated); (3) bass
pool (lazy up to `BASS_POOL_N` 12, allocation like `leadAlloc`: free, new below the ceiling, steal released-first by oldest `tOn`;
voices record `deg`/`oct`); (4) drums (per-hit synths, `DRUM_KITS`: Standard/Darbuka/Tabla/Gamelan/Taiko, same 6 rows); (5) drone
(detuned saw pair, LFO-swept LP, root `tonicFreq(view)/2`; TF2: the VIEW OF ITS DRONE EVENT (`audio.droneUse` from `ENG.drone` and
`recorder.droneSync` → `droneViewNow`; none = the live view; from silence it takes its pitch at once, `dUp`); second string —
`scales.droneDegree` of that view: nearest 3/2 within
17¢, else 4/3 (octave tunings), else a seventh 15/8·9/5·16/9, else the tonic one period up; BP: the 5:3 degree (878¢) by default
(data `drone.withoutFifth` on bp13; ear switch `R.droneBP('cons'|'period')`); `droneRetune` re-pitches, never re-levels). Plus the
metronome (`metroClick(t,level)`, 4 levels).
- **Reverb = FDN** (`buildFDN`, numbers in `REV_A`; `makeIR`/convolver gone): 80 Hz highpass → pre-delay → 3 input allpass diffusers
  (`apStage`) → 4 delay lines (delay → damping lowpass → feedback gain), Householder mixing (one Σ node + one −2/N node) → stereo taps →
  `outTrim`. ~49 nodes. Real-time params: mix (sends; chord chain starts at `CH_REV_SEND` 0.12), decay (`setRevDecay`, RT60 → per-line
  `g_i=10^(−3·d_i/RT60)`), tone (`setRevTone`). ⚠️ The in-loop lowpass MUST stay at Butterworth Q (`REV_A.toneQ = −3.0103`): Web Audio's
  `Q` is in dB for lowpass, the default 1 dB gives a +1.96 dB peak → loop gain 1.11 > 1 → whistle at ~3.9 kHz. Compute the loop gain.
  Loops are wired with ONE entry (live and render since LR1/AF1; one builder `apStage`/`buildFDN`, no wiring argument): a node pulled
  twice in a quantum returns its previous quantum, so several entries cut the loop in a build-order-dependent place. ⛔ Don't bring the
  old wiring back; more space = a reverb parameter (BACKLOG §3.9b).
- **Effect modules** (`FX_FACTORY`, six): `vol` (`kind:'voice'`, all roles, `perm`, seeded FIRST on `play:x`, raw 0..1 so `v01 === a.vol`,
  `note:{key:'vol', required:true}`, per-role default `volFromOld(role,0.8)` ≈ 0.894 solo / 0.922 chords / 0.927 bass & drums; hidden from
  add lists, `fxVoiceIdsFor`, lane addresses, `autChainOf`; `fxPerm`), `reverb` (`bus`), `bright` (`voice`, 4 roles), `glide` (`voice`,
  solo+bass, `readAt:'pitch'` → `fxNoteFollows` false), `dly` (`bus`), `trmMix` (bus tremolo, `insert`). A declaration carries `roles`,
  `attach:true` (per-note, `fxIsPerNote`), optional `note:{key,inv,roles}` (own event field, `fxNoteField`), `defBy`, `readAt`. Instances per
  chain-owner key, lazy, never torn down (`FX_INST[key][fxId]`, `fxInstance`). **The chain is SERIAL** (O-1): `fxChainIO(key, head)`;
  `fxResplice`/`fxRespliceSmooth` rebuild `head → fx₁ → … → tail → master` in chain order (connections only). A signal module carries its
  own dry/wet (mix 0 = identity sample for sample). Volume curve: amplitude = `volAmp(v)=v²` × the role's level; attack velocity via
  `volVel`; drums skip the hit at v=0. ⛔ `fxAttach`/`fxRoleBus`/`fxRoleOut` are gone. ⚠️ `fxPlayPath` (AUTO-PROBE): equal EFFECTIVE id
  lists (null = live chain) only record the path and close built effects outside it — no resplice (a needless resplice dipped the role
  40–100 ms and swallowed a track's first attack).
- **Solo is a POOL with owner keys** (`lv[]`/`leadHold`, `LEAD_POOL_N` 12 = 8 live + 4 headroom, `LEAD_POOL_KS` 8): live `'lead:L'/'lead:R'`
  (+`:finger`), `'lead:M'` in lead mode; replay `'leadloop:'+layer+':'+v`. A voice builds ONLY its own bank, lazily (`buildLeadBanks(preBus,
  ksOk, only)`); ⛔ never rebuild all banks. Per voice: bank → `satDry/satWet` (drive, before the envelope — tanh is non-linear) → `env` →
  `tg` → pan → `vol` → `trem` → `leadSum` (+ `makeBriStage`), per-voice vibrato and humanisation; values at attack from the note
  (`applyFx(a.fx)` → `pendFx`). Bus: expression stage → `leadOut` (chain head). Allocation: same owner → same voice; free voice with that
  bank built; any free; new below the cap; steal released first. Glide time `LEAD_GLIDE_TC` 0.02 s, bass `BASS_GLIDE_TC` 0.012 s (live
  and replay). An instrument change MORPHS a sounding solo note (20 ms bank crossfade); bass and chords bake the timbre at attack. A voice
  handed to a NEW owner cancels any scheduled curve (`v.handed` → banks' `cancel(t)`, S5).
- **Offline allocator (F2, `setOffline(true)`, render copy only):** voices carry `freeAt` (attack ⇒ ∞, release ⇒ the release moment
  itself — free from release, like live); no stealing offline (the pool grows; ⚠️ a frozen track may be fuller than live only where the
  live pool overflowed); no second note-pairing formula (`songNotes` is the only pairing). At `offline===false` every branch is the old
  code.
- **Synthesis paths** (a bank = `{gain, setFreq, cancel, strike?}`): (1) subtractive via `mkOsc` (vibrato + humanisation into `.detune`;
  velocity → brightness at attack only; `HUM_CENTS` 4; pads/organs `hum:0, det:0`; bass not pitch-humanised); (2) FM `buildFMBank({ratio,
  peak,sus,tau})` (modulator → carrier frequency; index envelope decays faster than amplitude; «Bell (deep)» 1.41, «Metallophone» 3.51);
  (3) Karplus–Strong `buildKSBank` (worklet `ks-string`; `KS_BANKS` params `fb`, `damp`, `exBase`/`exSpan`, `nl` jawari, `symp` tarab,
  `body`; «String», «Sitar», «Oud», «Koto», «Santur», «Guitar», «Pizzicato»; worklet failure → `buildKSFallback` plucks keep indices).
  Drums per hit `drumHit(row,vol,kit,when)` (tabla `tabBaya` pitch bend, gamelan inline FM `gmlFM`).
- **Voice starts:** `voiceBuild()`/`voiceStart(o)` scatter oscillator phases within one period (solo banks, FM modulators); chord and bass
  voices start their PAIR together (`voiceStartPair`, one delay per voice) — a scattered pair on one frequency freezes a cancelling
  offset. A fresh attack sets its pitch (time constant 0). ⛔ Don't change native waveforms to fix phase.
- **Random draws:** nine `Math.random` sites; the eight in `audio.js` go through `rnd()` (`setRnd`, only the render copy); ⛔ never patch
  `Math.random` globally (`liveRandomIntact`); the KS pluck is seeded only in track renders. None of this is recorded.
- Track level/pan stages: `tg` in every pooled voice (solo `env→tg→pan→vol`, bass `env→tg→pan→vol`, chord `g→tg→pan→bus`), set at attack
  from the owner key; drum hits a per-hit multiplier/pan only when ≠ default; drone `a.lvl ×` level, permanent pan. Pan law: L = √2·cos θ,
  R = √2·sin θ, θ = (p+1)·π/4 (centre exactly 1/1). Reverb input downmixed to mono (`hp.channelCount=1`). `recorder` installs the live
  lookups; ⛔ `renderReset()` only on the engine copy.

### Time, tracks and the recorder (slices S1…S3.5e)
Not a looper since S3.3: a linear song in absolute beats; looping = an optional brace. Names still say `loop`.
- **The event**, created in exactly two places, `push` and `loadArrangement` (the editor is a third, obeying the same law):
  `{t, layer, fn, a, sc, sev, tk}` (+ `jam:true` on backing). `t` absolute song beats ≥ 0, quantised at record time by `gridFor` (chords 1
  beat, bass ½, drums `1/loop.sub`, solo never); while the brace cycles `push` records the FOLDED song beat. `fn`: `leadOn/Set/Off`,
  `chOn/Set/Off`, `bassOn/Set/Off`, `drum`, `drone`. `a` = intent, never frequency: `ti` (TUNING INDEX in the event's frozen view, from
  `tuningIndexOf`; NO degree is stored since T4c-2) and `oct`, `vol`; solo `inst` (on `leadOn`; `leadSet` same), `tie` (a note continued
  across a timbre switch → 20 ms crossfade on replay), `v` (slot among notes open at once), `fx` (the note's effect map, COPIED), `bend`
  (theremin cents curve), `hold`; chords `inst` (on `chOn`), `ty`, `bri`, `k`; bass `inst`, `k`, `v` (non-zero only), `fx` (only when the
  bass chain holds a per-note parameter); drums `row`, `vol`, `kit`, `fx` (only when set); drone `lvl`; `k` = take/pass owner suffix
  (absent = 0); editor-only `sh`/`gen` maps per address `'fxId:pKey'`. `sc`/`sev` frozen view and seventh (rule #7); `tk` take number on
  every event (`takeSeq`, `curTake`; backing layers each their own).
- Frequency derived at play time (`recorder.evHz`; `leadFreqTi`/`bassFreqTi`/`chordNotesAt`); a replayed event without `ti` is not played
  (one warning). Replay goes through `ENG` directly and is never re-recorded (polymodality).
- **Two kinds of beat:** MONOTONIC `m = (now − loop.t0)·bpm/60` (clock: rebases, scheduler window, `rgnReps`, count-in `m < loop.lead`,
  `loop.clickBeat`) vs SONG `p = songAt(m)` (material: recording, `fireNear`, `loop.pos`, resume, end of song, everything shown).
- **Transport:** `startTransport(countIn, from)` is the ONE start path (rebases cursors, `lead=from`, count-in one bar or 60 ms lead-in,
  chases held state if `from > 0`, schedules the first window at once). `setLoopBpm` keeps the beat. `stopAtEnd` stops at the end of the
  material (never while recording or cycling). `seekTo(beat)` (refused while recording). Loading a backing turns ⟳ on (unless recording,
  or a user brace/repeat is set). `loop.bars` = BACKING length (1..8). `loop` fields: `on, bars, metre, sub, bpm, t0, pos, sched, layer,
  clickBeat, quant, rgn:{on,from,to,user}, lead, cnt`.
- **The brace** (`loop.rgn`): one control, two jobs (what cycles when ⟳ is on; where recording starts from stop). `user:false` follows the
  material (`[0, end rounded up to a bar]`, dashed, «auto»); `user:true` stays put (✕ returns to following). Quantised to the bar, ≥ 1 bar,
  clamped (`braceClamp`); bar resolution is deliberate. Tap/drag on its band (nearer edge moves). Refused while recording. `rgnApply` is the
  single writer (exception `braceFollowGrow` while not cycling); while playing it rebases by whole bars; past the new end → jump to the
  brace start. `rgnSync` from `schedInvalidate`. Region-only machinery: `songAt`/`rgnReps` fold, pass split + seam release + chord/bass
  chase in `scheduleLayers`, the wrap branch in `tick` (`liveWrapRelease`, solo chase), the quantise fold in `push`, per-pass closing in
  `recFoldRoll`, `stopAtEnd` suppression.
- **The chase:** chords/bass have one voice per track and glide; entering after an `on` needs `chaseFor(x)` (last `on` per owner + latest
  `set`, minus owners closed) and `chasePlay(x, when, lead, only)` (starts voices with the event's view, map and the REMAINING bend); called
  from `startTransport`, `rgnApply` jumps, each seam, the wrap, `frzLeave` (one track), `trackResplice`. Muted tracks skipped; a track
  whose buffer owns it skipped (`frzBufOwns`). Cached per entry beat, reset by `schedInvalidate`.
- **Tracks (lanes):** layer number (sound address) + lane id (identity, rule #27). `laneAudible` (solo overrides mute), `laneGated()` once
  per scheduler call, `laneHush()` releases newly inaudible tracks. ⛳ **A track holds exactly ONE source** (T2/T3/routing by tuning):
  `noteSource(fn,a,sc)` → `'role:inst|viewKeyId'` (drums `'dr:kit'`; the view's KEY is part of it — TF2: a key change mid-take
  starts a NEW track, user answer Q2); `takeRoute` (inside `push`, after the
  count-in refusal) sends a note START to the take's track of that source, else the unclaimed track born at ●, else a new one (`takeMint`
  → `laneNew`, number from `nextFreeLayer()`); changes/releases follow their note's `layer`. An ARMED track accepts only its own source
  (else a new track; header «L{n} takes only its own sound», `looper.armedOwn`). One ● = one take (`tk`); ⤺ removes all its tracks.
  `recChOn` closes a chord left open in another layer. `laneSourceOf` reads note starts only (`isNoteStart`). Per-take state by layer
  (`takeSt`: `{vBase, vTop, k, chLastT, bsLast}`; `recLayers()`/`isRecLayer()`), `push(…, ly)`.
- **Arming** (`toggleArm`, `armLane` = lane id): ● records into it (no `laneNew`); frozen while recording; a muted armed track allowed
  («(not heard)»); undo/delete/clear of it clears the arm.
- **Owner keys:** replay `'leadloop:N:v'`, `'loop:N[:k]'`, `'bassloop:N[:k][:v]'` (with v=0 byte-identical to before); live `'lead:L'/'R'`
  (+finger), `'lead:M'`, `'latch'`, `'bass'`, `'bass:L[:f]'`. Each ● computes `vBase = layerSlotTop(layer)`, `k = layerTakeTop(layer)`;
  both rise at every seam. `releaseLoopLayersAt(when, layer)` matches `N` or `N:…`. Replay skips only `recording && ev.tk === curTake`.
- **Undo, delete, clear:** ⤺ removes the LAST TAKE (repeatable; a backing undoes layer by layer; never resurrects a deleted row). ✕ on a row
  deletes that track after a second tap within `DEL_CONFIRM_MS` 3 s, NOT undoable, releases only its voices, the recorded track can't be
  deleted, unties surviving tie halves (`untieAcross`). Transport ✕ clears everything (brace back to following, repeat off).
- **Three stops:** pause (▶ while playing, `onLoop`) holds the position; panic (■) = `recStop()` if recording, halt, `softAllOff`, rewind to
  the brace start, keeping song/brace/mutes/arm; clear resets everything. ⛳ `softAllOff` while playing stops only LIVE owners and hands
  every event-played track over with `trackResplice` (release at the horizon + the same chase) — a held track note survives scale/A4
  changes; frozen buffers are stopped only when the transport is stopped. ⛳ TF2: the KEY knob calls `liveAllOff` instead (live owners only,
  closing what a take holds; tracks are not touched at all) and `backingFollowKey` (below, Backing).
- **Closing notes:** every stop that ends a recording closes what is held (`recAllOff`); at each seam (`recFoldRoll`) open solo notes get
  `leadOff` at the pass end, a held bass `bassOff`, a latched/held chord `chOff` at the pass end + a written `chOn` at the pass start (live
  voice untouched, rule #20). `push` refuses during the count-in; held notes are opened by their hand; a LATCHED chord with open fingers is
  opened by `recLatchOpen` (`latchOpenAt`; mirror `liveCh`; only if `chordHold['latch']` still sounds and `recCh` is empty).
- **Cursors:** both replay loops walk `events[0..cursN)`; the take being recorded is appended unsorted after it (safe: replay skips it).
  `schedInvalidate()` is the single reset (rule #28); bumps `evGen`.

### The arrangement window (AR1) and mixer (MX1/MX2), names/colours/order (AR2)
- ✎ opens the window (`ui.openArr`; refused while recording or recording a clip, or with no tracks) = the same strip full-screen
  (`drawLooper(true)`, one snapshot `loopView`, `full:true`): time window `rollBeat0/rollSpan` SHARED with the editor (first entry fits the
  whole song, `arrWinStart`), rows `ARR_ROW_H` 40, header «L# · role» + timbre, M / S / ❄ (`ui.onFreeze(layer)`), note miniatures
  (`laneMini`: segments priced by the engine's functions, placed by log frequency within the track's range; drums one tick per hit). Taps act
  on release: body → editor (`openRoll(layer)`), header → arm; drag scrolls time or rows; two fingers / Ctrl-wheel zoom. `#arrBar` ✕ returns
  to play; the editor's ✕ returns to the window. Row delete stays on the play strip.
- Mixer face (`state.arrFace==='mix'`, 🎚/▤): row body = LEVEL fader (relative drag, double-tap → 100/0 dB, wheel ±1), PAN control
  (−100…+100, centre detent ±4, double-tap → centre, «L 30»/«C»/«R 30»; `mixGeom`: `fx0/fw`, `px0/pfx0/pfw`, `mfx0/mfw`; `loopHit` →
  `'level'`/`'pan'`/`'mlevel'`), MASTER strip (level, output meter after the limiter, gain reduction). Level scale 0…100, gain v², 100 =
  0 dB (dB = 40·log10 v); master = 0.8 × v². Levels/pans are tables keyed by track id (`laneLevel`/`laneLevelOf`/`setLaneLevel`,
  `lanePan`/`lanePanOf`/`setLanePan`, step 0.01); no undo (ED7). Level is NEVER baked into a frozen buffer (bus `frzGain`; never stales);
  PAN is baked (before the chain) and folded into `freezeSig` (`|p<pan>`).
- **Sections (ED6, user decision ED6-1 "lengthen / shorten"):** markers `{id, beat, name}` in `recorder.secMarks` (bar lines; default
  names A, B, …; `secAdd/secRename/secDelete`; cleared by `clearRec`), drawn in the window's sections band (`ARR_SEC_H` 20, snapshot
  `loopView.sec`, hits `'sec'`/`'secband'`; tap a marker → `braceSet` on its section). `recorder.songEdit(kind, a, b)` — `'ins'` (b−a empty
  beats at a), `'cut'` [a,b), `'dup'` [a,b) — on the bars under a USER brace, every track: `secPlan` → steps of the editor's kinds
  (move/del/ins, `autmove/autins/autdel`, `lanetouch` per touched track) + `'brace'`, `'marks'`, `'lanelen'` (`secApply` inside
  `editApply`), applied with `editApply`, NOT `editBatch` (its tie pass would untie pairs that move together; `secUntie` unties only a half
  left alone), then `secCommit` (sort, `schedInvalidate`, `takeFxTouch`, `hooks.af('section')`). Rules: INSERT — from a on everything
  moves (an off exactly at a stays; a note ringing across lengthens; a note closed by the next note's start exactly at a lengthens too);
  CUT — what starts inside goes whole (tail included), a note from before ends at a or is L shorter (its last change inside applies from a,
  its bend keeps the value it had at b; closed by a removed note → an own note-off at a, birth number before the moved notes), lane points
  inside → the last per address at a, drone levels likewise; DUPLICATE — copies of what starts inside at +L (fresh k/v per note, the SAME
  take so its copied lane points govern them, ties dropped, own note-off when the original was closed by its next note), an original
  ringing past b ends at b (its copy carries the tail), then insert-at-b; lanes inside copied after b from the value at a; markers copied.
  Brace (user) mapped, `to` as an end; backing `laneLen` reaching past a grows/shrinks. ONE step of the one history (ED7: `{kind:'batch',
  label:'sec:'+kind, list}`; markers `{kind:'marks', label:'mark'|'rename'|'unmark'}`); `songUndo/songRedo/songCanUndo` are aliases. Refusals `songEditWhy`: 'rec', 'editor',
  'range', 'empty'; ui refuses a brace still following the song. `autdel` remembers its index so ↶ puts the point back in place.
- AR2: `laneName` (≤ 40 chars; empty → default «role · timbre», `laneDefName`), `laneRank`, `laneOrder()` (THE order everywhere; unplaced
  tracks after placed ones by layer number; the take's empty layers last), `moveLane(layer,to)`, `laneLook(layer)` → `{role, tim, drone}`
  memoised on `events.length`+`evGen`; `laneTitle`/`laneCol`; reorder handle (`ARR_HANDLE_W` 28) → `'move'`, `state.laneDrag`; a second
  tap within 350 ms on the name restores the arm and opens `#laneNameIn` (Enter/blur keeps, Esc cancels). Play strip: a name column inside
  the box (`stripCols(W, markW)`; «L#» inside it, grey/red when armed; ellipsis via `stripRowText`). `onLoop`/`loadArrangement` call
  `droneSync()`.
- The play strip scrolls when rows don't fit (`state.laneRow0`; drag defers a row tap to release; footer «Tracks a–b of n»; while recording
  the window shows the recorded track). Mark column `MARK_COL_W` 28 between label and lane when any row shows the arm dot or a ❄
  (snapshot `x0` = lane origin, `bx0` = box edge).

### The track editor — piano roll over the song (S4.0…S5.6, E0–E2, S0–S7, U1–U6, T5, O-4)
- **A note is not an event:** `songNotes()` groups events by the ENGINE's owner key (`chaseRole`/`chaseKind`/`chaseKey`); ⛔ no second
  pairing formula; an `…On` while one is open closes it (`endBy:'next'`); orphans reported; open notes have `end=null`; drums zero length;
  the drone is a level. `songSegs()` = pitch SEGMENTS (boundary = a pitch change only; each with its own `sc`/`sev`; `byEv`); a theremin
  note is ONE segment (`ldTherm`). Both memoised on `songNotes`' identity, reset by `schedInvalidate`. Orphans can no longer be produced
  (S4.1–S4.3: state follows what landed; at a seam only drum hits fold; quantise frozen on the note `q`; per-key order guard
  `chLastT`/`bsLastT`).
- **Shell:** `openRoll` swaps the bar for `#rollBar`; the transport goes `.roll`; `main.loop` takes the editor branch (camera open but not
  read; `processHands(null)` every frame; `latest`/`lastTs` cleared).
- **Refusals:** `editOpen` refuses while recording or a clip records; `onRec` refuses while the editor is open. A BACKING track is read-only
  for NOTES (`editBackingOpen`); timbre replacement is allowed (`editGuard(backingOk)`).
- **One role, no tabs (T4):** the editor's role = the track's (`laneRoleOf`, read in `ui.rollEnterTrack`, kept in `state.rollRole`);
  `rollRole===null` → «No notes in this track».
- **One machinery for four roles** (`ROLL_EDITABLE=['dr','bs','ch','ld']`): drums by hit (`editMoveHit`/`editDeleteHit`/`editInsertHit`);
  pitched roles by SEGMENT through `EDIT_ROLE`, `keyClash`, `editMoveNote`, `detachPlan`/`commitDetach`, `editMoveSeg`/`editResizeSeg`/
  `editDeleteSeg`, all via `editBatch` (one history entry). Insert per role (`ui.ROLL_INSERT` → `editInsertBass`/`editInsertChord`/
  `editInsertLead`). Solo insert: fresh slot `v`, tapped row, timbre from the nearest note-on else `leadIdx`, volume from the nearest solo
  event else `editDefVol('ld')`, the effects map copied EXACTLY from the nearest solo note (absence included); never bend/tie/hold.
- **Independent notes (E1/E2):** a one-segment note drags WHOLE (fresh `k` on clash); an edit touching a neighbour first DETACHES the
  segment (left part closed, segment to a fresh `k`, own note-off, the pitch change after it becomes a note start) — price: slides into/out
  of it re-articulate. A pitch-only change never detaches (new pitch on every pitch-carrying event of the segment). `editKeyGap` is gone.
- **Theremin (S5):** length editable — `recorder.bendTrim` (points with `dt ≤` the new length + an end point; new payload, ↶ restores);
  lengthening holds the last value; the curve is drawn on the note (`draw.rollBendPts`, steps, merged below half a pixel, none under 6 px).
- **Tie pairs (S6):** an edit that MOVES or REMOVES a shared edge (`a.tie`) unties BOTH halves in the same entry (`tieUntiePass` in
  `editBatch`; partner via `tiePartners` — same take, beat, another track, matched by (ti, oct); ambiguous → all candidates); `'lanetouch'`
  bumps the partner's `laneEditVer` both ways. Pitch-only changes keep the pair. Row delete unties too (`untieAcross`).
- **Chords as notes (U1–U5):** drawn as every note `chordNotes` gives; a note on a row when within 1 cent of the row's price
  (`chordRowFreq`), else between rows at its true pitch (lighter, role-colour outline, deviation from the nearest row `rollDevLbl` «−22»);
  root recognised by frequency. Axis sized from the track (`rollChordTotal`). Two-level selection (`state.rollSel` whole chord /
  `state.rollSelNote` one note; `setRollSel` resets the note level; toast `roll.tapAgainNote`). One note: delete (`editDeleteChordNote`),
  move in time / resize (`editMoveChordNote`/`editResizeChordNote` via `chordNoteEdit`), move to another row (U4; target = row under the
  finger once it LEFT its row, `ui.rollNoteTarget`) — each DISSOLVES the chord into one-note chords (`dissolvePlan`, fresh `k` each,
  inner events copied; a one-note copy takes the row's canonical form `chordUnit`). Released without leaving its row → no edit. Insert (U5):
  any row; never dissolves; nothing selected / one note selected → one note (`chordUnit`, timbre nearest chord start else `chIdx`, volume
  nearest else `editDefVol('ch')`, no brightness); a WHOLE chord selected → its SHAPE at the tapped root (typed: rigid; untyped on a bright
  root: by the mode's rule; untyped on a dimmed root: typed with its intervals — option (a), `recorder.chordMoveTy`; timbre, volume,
  brightness, `sev` copied). Rule `'none'` refuses a chord insert. Chord types compared by VALUE (`tyEq`).
- **Pitch axis (T3/T5):** one axis object `draw.rollAxis(view, all)` → `rollView.axis` `{rpp, ents, rowOf, pitchOf, snap, placeTi}`. «All»
  (default `state.rollRowsAll`): every TUNING pitch per register, mode pitches bright, others dimmed (named by the tuning's scheme or
  «(4)»); «Mode»: the compact degree axis; `#rollRows` toggle only when dimmed rows exist. ⛳ Dimmed rows are edit targets (T5): `pitchOf` →
  `{ti, oct}`, `recorder.slotPt`; ghost and drop share `draw.rollDragTarget(d, seg)`. In «Mode» an out-of-mode note sits between degrees
  (`placeTi`, «+100»). The duplicate tonic row (top of a register = bottom of the next) is dimmed, not a bug. A track holds ONE view
  (`draw.rollGroup`/`rollTrackView`); a segment of another view is neither drawn nor hit (`recorder.viewAudit`/`viewWarn`).
- **Labels:** `noteLbl(deg, s=CUR())` takes the scale explicitly (rows in the track's FROZEN scale). Rows fill the height up to
  `ROLL_PITCH_ROW_MAX` 30, else `ROLL_PITCH_ROW_H` 18 with scrolling; length handle only on a segment with its own ending event (`endEv`);
  gutter MEASURED (`rollGutterW`, capped at 42 %, cached on scale+tonic; enters snapshot `x0`).
- **Undo/redo:** `editGuard` (editor open, track alive, not backing, transport PAUSED — pauses itself); every edit: absolute time, `tk`,
  `compactEvents`, ONE `editCommit` (sort, `schedInvalidate`, `takeFxTouch`, `histSeal`); `editPush` → `histPush`, the single writer of the
  ONE history (ED7; a new step drops the redo branch); compound edits = `kind:'batch'` (sub-kinds move/ins/del/timbre/automation/lanetouch).
  Since ED7 the history is the song's: it survives closing the editor and switching tracks; ⤺ is one of its steps.
  Events at one beat keep their order through edits and undo: birth numbers (`evSeq`, filled in `editGuard`), the editor sorts by (beat,
  birth) — `songNotes` pairs a key's events by array order (a note-off and the next note-on often share a beat).
- **Several notes at once (ED1):** `state.rollSelMany` (2+ defining events; one note stays `rollSel`, so every single-note path is
  unchanged), ⬚ pick mode `rollPick` (or Shift: tap adds/removes, a drag on empty space draws `rollBox` → `draw.rollBoxHits`), Ctrl/⌘+A
  (`rollSelectable`), Esc. A group drags (`rollDrag.many {dt, dr}`, pitch per note through `draw.rollShiftPit` — ghost and edit) and deletes
  through `recorder.editMoveSel`/`editDeleteSel`: `editGroup` runs the single edits in sequence and merges what they pushed into ONE
  history entry (a refusal rolls everything back); a note with every segment selected moves/goes WHOLE (`editMoveWhole`, glide intact),
  parts of a line go through `editMoveSeg`/`editDeleteSeg` (detach as one edit would; `editRemap` follows replaced events).
- **Copy, paste, duplicate (ED2):** the clipboard (`recorder.editClip`, copies; lives for the app session) — whole notes as they are,
  adjacent selected segments of a line as ONE note (`runNote`), drum hits. Paste (`editPaste(at)`, at the snapped playhead) only into a
  track of the same role and view (`pasteBlock`/`editPasteWhy`: 'empty'|'role'|'view'); duplicate (`editDuplicateSel(evs, step)`, offset
  `dupOffset`: span to the snap step, past half a bar to whole bars). A paste obeys the birth law: session take, fresh k/v per note, ties
  dropped, `a.vol` always, the TARGET track's timbre/kit (one source per track), theremin `hold` kept; one `'ins'` entry via `editInsPush`.
- **Quantise after recording (ED3):** `recorder.editQuantSel(evs, step, what, amt)` (`what` 'start'|'end'|'both', `amt` 0..1; ui ⌗ +
  grid/what/strength selects, grid defaults to the snap step). A note's START moves the whole note (length kept); a boundary INSIDE a line
  moves by itself — the neighbour's length follows, no detach (user decision 4); an END moves the own note-off (a note closed by the next
  note's start keeps start and end); an edge that would leave a segment < `EDIT_MIN_LEN` stays; inner value events a moved edge passes over
  are dropped; a note reaching into another of its key takes a fresh identity (E1); a shortened theremin trims its bend; drums with starts.
  Notes one by one inside `editGroup` (one entry); pitches never change; nothing moved → false.
- **Volume bars (ED5):** the Volume lane's second face (`state.rollVolBars`, default ON; `#rollVolBars` ▮▮/•— while the lane shows
  Volume): one bar per NOTE at its start (`recorder.pnBars(layer)`, memoised on songNotes; a chord one bar, a drum hit one; a faint line
  where the volume changes inside a note), snapshot `rollView.aut.bars`, hit `'autbar'`. A drag (value axis only — `rollAutDrive` with
  `G.vOnly`; sideways = the fine zone) → `recorder.editVolSel(evs, d)`: every volume value of each whole note +d, clamped 0..1 (rule #30),
  the note's own Volume ramp marks become steps (`'r'/'s'` → `'h'`, generated-for-Volume flags dropped), one `editBatch`; a note of a
  multi-selection moves the whole selection by the same d. ⛳ Per NOTE, not per moment: two notes on one beat keep their own values (the
  line, `pnPlan`, holds one value per beat — the probe's control). No point insert or ╱/⌐ on the bars face.
- **ONE HISTORY (ED7, plan decision 6):** `recorder.hist`/`histFut`, `histPush` the single writer, newest `HIST_MAX` 300 kept (not trimmed
  inside `editGroup`). Steps: the editor's own kinds (unchanged); ED6 sections and markers; `'tab'` {id, f:'level'|'pan'|'name', from, to}
  (`histTab(layer, f, from, merge)` — ui calls it at the END of a fader / pan gesture, a double tap, a rename; wheel steps on one control
  within `HIST_MERGE_MS` 800 merge); `'master'` (`histMaster`); `'ranks'` (`moveLaneStep`); `'snap'` — diff snapshot steps for a TAKE
  (`takeBegin` before the take's lane and capture record exist: `onRec`, `seedTake`; ends in `setRecording(false)`), ⤺ (`'untake'`),
  row delete (`'rowdel'`), backing load/removal (`'backing'`), ✕ (`clearSong` → `'clear'`; also the looper hand's clear): events removed /
  added / changed (objects with beats and payloads), capture records by take, track ids with table rows (`laneRow`, `laneDrop` drops the
  freeze), markers. One pending snapshot at a time: ⤺ / backing / row delete during a take fold into the take's step; `probeTake` and
  `histOff` write none. NOT steps: mute, solo, arm, the brace, tempo, tonic (user answer: listening switches, not edits) — except that the
  ✕ step carries the brace and ⟳ (`br`, `braceKey`), so ↶ of ✕ brings them back (control `histDbg {noBrace}`), and a song Transpose step
  carries the key knob (TF3b). `histUndo`/`histRedo` (aliases `editUndo`/`editRedo`,
  `songUndo`/`songRedo`): refused while recording, pause the transport, `histCommit` bumps the edit version of every track the step
  touches (`histTouched` — events, lane points via their take, chains, snapshot events) → frozen ones go stale and re-freeze ('undo'
  hint). ⛳ TRIPWIRE: each step keeps `h` = `histHash()` (order-free FNV over events: birth number, beat, payload object id, layer; capture
  records and points; track tables; markers; master) of the state it left (`histSeal` in `editCommit`/`autCommit`/after table and snap
  steps); ↶ refuses with 'changed' and drops the history when the state differs (a path writing outside the history — console, probe).
  Song loads reset the history (`loadSong`, `P.seed`, `tutorClearLoop`); every P.all row starts with `histReset()`. ui: `histDo(±1)` behind
  every ↶/↷ (editor `#rollUndo/#rollRedo`, window `#songUndo/#songRedo`, play transport `#histUndo/#histRedo`) and Ctrl/⌘+Z,
  Ctrl/⌘+Shift+Z, Ctrl+Y (not in text fields); toast names the step (`hist.k.*`); an undo that removes the open track closes the editor.
  ED7-fix2: ✕ leaves no strip (empty song), so `recorder.clearSong` → `hooks.cleared` → ui shows `#undoToast` «Song cleared — ↶ Undo»
  (`UNDO_TOAST_MS` 6 s; acts only while ✕ is the newest step, `histTopLabel`), and `draw.drawLooper` keeps the play transport on an empty
  song whenever `histCanUndo()` — class `.empty` shows only ↶ ↷ at `LOOP_EMPTY_TOP`. Probe control `ui.undoUiDbg(true)` (the pre-fix UI).
- **Bend curve (OWN2):** with a theremin note selected, its curve points are handles (`draw.rollBendHandles`, snapshot `rollView.bend`, hit
  `'bendpt'`, `rollBendAt(px,py)` → cents from the attack pitch and beats from the note start, via `hzOfRow` — the inverse of `rowOfHz`).
  Drag: one axis per gesture (time or cents; the first point only cents), ghost dashed with «+35¢ · 1.25»; ✚ + tap inside the selected
  note's time adds a point; 🗑/⌫ deletes the selected point (not the first). `recorder.editBendPoint(ev, 'move'|'add'|'del', i, dt, c)`:
  first point at dt 0, times strictly increasing (clamped between neighbours), inside the note, whole cents ±2400, a NEW payload and array,
  one step (label 'bend'); `bendDbg` = the probe's control (in place). State `rollBendSel`, `rollBendDrag`.
- **Bend shapes (BEND-CURVE, user request):** a point's optional `sh` ('s' glide / 'h' step) and `k` (curvature −1..1) describe the segment
  INTO it; NO `sh` = a recorded point = a step exactly as before (recorded bends are dense). A point the person adds or moves glides in, and
  the next point without a shape glides on (`bendEdited`, pure — the edit and the drag ghost); a delete makes the next shapeless point
  glide. ONE ramp function `config.bendPlan(B, base, spb, t0, from)` for live replay and renders (both engine instances call it through
  `scheduleBend`): a step point = one `setFreq` with the bank's default τ (the old schedule, byte for byte); a glide = sub-steps every
  `BEND_GLIDE_STEP_S` 10 ms aimed at the curve's value at the sub-step's end with τ `BEND_GLIDE_TC` 5 ms. Shape law `curveU(u,k)` =
  exponential (`CURVE_A` 8). The chase passes `a.bendFrom` (no rewritten curve); `bendTrim`, the ED6 insert/cut (`bendIns`/`bendCut`) split
  glides EXACTLY (`bendSplit`: a curve splits into k·u and k·(1−u)); curves without glides take the old paths. UI: a hollow diamond at the
  middle of every glide of the selected note (`rollView.bend.mids`, hit `'bendmid'`) — a vertical drag sets k (`curveK`, snaps to 0 near
  straight), `recorder.editBendShape(ev, i, sh, k)`; with a bend point selected `#rollShape` ╱/⌐ toggles its incoming glide ↔ step.
- **Transpose by degrees (ED4):** `recorder.editDegreeSel(evs, n)` / `editDegreeWhy` ('none'|'reg'|'fit'); ui −1°/+1°, Alt+↓/↑. Pitch
  arithmetic is ONE function `scales.shiftDegrees(ti, oct, view, n)`: degree + n in the segment's frozen view, wrapping into the register;
  an out-of-mode pitch moves from the NEAREST degree (tuning steps, a tie takes the lower) keeping its offset (user decision 5); the root one
  register above the last is written as the top tonic. Pitch-only: every pitch-carrying event of each selected segment, glides whole, no
  detach; chords through `segPitchPt` (untyped follow the rule, typed keep the type, T7 refuses); one `editBatch`. Beats never change.
- **Transpose by semitones (TF3, user answer Q4):** `recorder.editTranspose(n)` / `editTransposeWhy` ('none'|'range'|'drums'|'backing') for
  the open track (`#rollTrDn`/`#rollTrUp` «−1 st / +1 st»), `songTranspose(n)` / `songTransposeWhy` ('rec'|'editor'|'empty'|'none'|'range')
  for every track with pitch, the backing too (`#songTrDn`/`#songTrUp` in `#arrBar`); one plan `transposePlan(layers, n)`: every non-drum
  event's view → `scaleView(mode, its tunedFrom, its chord mode, key ± n)` (`'move'` steps carrying `sc`); notes, beats, payloads untouched;
  keys within `TR_KEY_MIN..MAX` (−12..23). Every tuning prices from the key: 12-note tunings move a semitone (a historical temperament changes
  key colour — expected), Partch / 19/31-TET / gamelan / Bohlen–Pierce move their 1/1 by 100 cents (the key model expresses it — no
  disabled button). One step (label 'transpose'; the song step carries `'lanetouch'` per track), frozen tracks go stale and re-freeze.
  ⛳ **TF3b (user answer 1):** the SONG step also moves the key knob by n (mod 12; sub-step `{kind:'key', from, to}`, `recorder.keyStepSet`:
  setTonic + `liveAllOff` + drone + `hooks.key`) so live playing stays in the song's key; ↶/↷ set the knob ABSOLUTELY to from/to (a knob
  turned in between re-keyed the backing; the step's own view moves restore it, so knob and backing agree). The track step (editor) never
  moves the knob. Cents (`keyC`) ride along unchanged. Probe control `trDbg({noKnob})`.
- **Track into another mode (OWN1):** `#rollMode` lists `scales.modesLikeView(view)` — modes of the SAME tuning (user decision) with the same
  number of degrees; `recorder.editTrackMode(mode)` / `editTrackModeWhy` ('none'|'same'|'reg'|'fit'|'chords'): every event of the track takes
  the new view (`scaleView(mode, its tunedFrom, its chord mode if the new mode has it)`), every pitch-carrying event the same degree there by
  `scales.mapDegrees` (ED4's nearest-degree + offset rule: `degFrom`/`degTo`, shared with `shiftDegrees`); one step (label 'mode'; a `'move'`
  step may carry `sc`); frozen tracks go stale. Rule #7 holds: the view changes only by this explicit edit of the whole track.
- **Timbre replacement (T5):** `#rollTimbre`, entries from `audio.timbresOf(role)`, `editSetTimbre` rewrites every note start and timbre-
  carrying `leadSet` (fresh payloads), one entry `kind:'timbre'`; a frozen track goes stale; effects unchanged; no picker on a drone layer.
  ⌫/Delete = `rollDeleteSel` (not in text fields, not on key repeat or with modifiers).

### Effect ownership, capture and playback (O-0…O-4) and automation
- O-0 chain-owner key (`chainKeyOf`, opaque; `chainOwners()` names kinds). O-1 serial chain, deliberately changed the sound: solo per-note
  send amounts are GONE (`reverb:mix`/`dly:mix` lost `attach`; old events' keys ignored). ⛳ The boundary is the summing of voices: below it
  volume, pitch, theremin Hz, bend, DRIVE, vibrato, per-voice tremolo, BRIGHTNESS, GLIDE (read by each voice from its note); above it the chain.
- O-2 capture per take (`takeFx` by take): the chain snapshot at take start (`takeCapStart`), a lane of what moved (`takeCapSample` via
  `fineStep`), composition changes with times (`FX_CHAIN='#chain'`). Sampled from the recorder heartbeat (`tick`, 25 ms, song beats,
  after the count-in guard) — so a knob turned while a latched chord rings IS recorded. Capture walks declarations (rule #29). Expression
  channels captured, not events (rule #23).
- O-3 playback: `fxPlayBuild` merges takes into one list sorted by `(t, tk)`; `fxPlayDrive(x)` folds it with a forward cursor (refold on a
  backward jump) through each effect's `setNorm`; composition honoured via `fxPlayPath(key, ids)` (gates; the live chain is never
  rewritten); on stop `fxPlayStop` returns the path and pulls back to the aim. ⛔ No driving while recording. A take governs only the
  owners of roles it played (`meta.keys` via `evRole`). Per-note parameters are NOT merged (`fxLaneMerge` skips them).
- O-3.1 aim ≠ sound: `p.cur` = what sounds; `FX_AIM` = where the hand points (one writer); bars draw the aim; a driven parameter is hollow
  with a dimmed label (`fxIsDriven`); per-note parameters are never hollow.
- O-4 the automation lane (same time axis as the note grid, `rollView`): one address (owner, effect, parameter) across the whole track;
  left shelf = the take's snapshot (no handle); drawn as a STEP unless the segment is SMOOTH; drag with one axis per gesture, value snaps
  to tenths near the point and units when pulled aside; TIME IS FREE (no quantise). Part 2: add/remove/reorder effects for one track in its
  CAPTURE (never the live chain); `autChainOf(layer)`, `autChainAdd/Remove/Move(layer, fxId[, dir])`, `autAddPoint(layer,fxId,pKey,t,v)` find
  the track's one chain (`laneChainKey`); `autPoints(layer,key,…)`. The add list = the role's voice modules (`fxVoiceIdsFor`) + bus modules
  (`fxAddableIds`) minus what the track has (mid-take effects included — re-adding would make them sound from the start; ▲▼⊘ disabled on
  them). Chain edits act on EVERY captured take of the track as one entry; a new bus point goes to the latest captured take (`autCaps`);
  a take without a capture inside a captured track never gets one. ⛔ The live chain is read only for a track with no capture in ANY take:
  a chain edit or freeze then snapshots it into the earliest take and NAILS it (`'autcap'` first in the entry; freeze says `frz.pinned`).
- Part 3 per-note addresses edited IN THE NOTES (V4b): lane built from notes (`pnView`, runs of equal values, `pnCarrier`); every edit edits
  the point list and ONE rebuild `pnPlan` rewrites the address (via `editBatch`); "not set" = hollow dot at the role default; between notes
  dimmed; value field per declaration (`fxNoteField`). Removing a voice module strips its values from notes in the same entry. A point mid
  held note gets an ANCHOR change event in every note held there (not glide). ⚠️ Editing Glide over a recorded bass theremin smooths its steps.
- Part 3b Volume lane (VOL-3): listed FIRST on every track with a role (`autAddrs`), per-note, 0..100 = `a.vol`, rule #30 guards; ▲▼⊘
  disabled. A continuous swell is dense (one point per run; reshaping needs ED1/ED5 tools).
- Part 4 effects added mid-take are listed (after the snapshot's addresses; no shelf before their first point).
- Part 5 smooth automation: shape lives on the segment's END point. Bus point `sh`: `'s'` smooth, `'h'` step (hand-placed points always get
  one), absent = RECORDED point and the segment into it is SMOOTH (`autSmoothOf(prev, pt)`; one function for `fxLaneSmooth` — so
  `fxPlayDrive`, `fxLaneExpand`, freeze, `R.live` — and `autPointsCalc` → view `smooth`). Editing a point FREEZES the derived shape of the two
  segments it touches (`autFreeze`). Per-note: `pnPoints` gives `g0` (last event of the previous run), `pnEffSh` → `autSmoothOf`; draw starts
  the diagonal at `g0`; `pnFreeze` (a frozen glide after a hold gets a flat point at `g0`). Straight in the normalised 0..1 scale. ONE law
  `fxLaneAt(e,x)` (with `nx` links and `snap` marks from `fxLaneMerge`); `fxLaneExpand(list, stepBeats)` unrolls smooth bus segments at the
  25 ms tick step for the render and `R.live`; each value through the effect's setter (⛔ no native `linearRampToValueAtTime` — setters are
  the single door and are non-linear). Per-note smooth segments = change events (`pnPlan`): inside held notes `…Set` every `AUT_RAMP_BEAT`
  where the value moved ≥ `AUT_RAMP_EPS`; marks `a.sh[addr]` ('s' point entered smoothly, 'r' inside) and `a.gen[addr]=1`; a generated solo
  change carries `hold:true` only for a theremin note; glide (`readAt:'pitch'`) gets no ramps or anchors. ╱/⌐ button `#rollShape`
  (`autShapePoint`, history `'autshape'`, toast). BEND-CURVE: a bus point may carry `k` (curvature of the glide into it; `fxLaneMerge`
  copies it, `fxLaneAt` applies `curveU`); the selected point's incoming glide shows a diamond (`rollView.aut.mid`, hit `'autmid'`,
  `recorder.autCurvePoint(rec, k)`, step `'autcurve'`); per-note addresses are NOT curved (they live in note events — later). Named limits: a note edit carries its ramp events without rebuilding; anchors only where no
  event; with several takes on one bus address the lane draws a diagonal across another take's snapshot where playback steps.
- **Fine recording** (`recorder.fineStep`/`fineKnee`, one automaton for bus capture and per-note values; constants in config): records
  one-unit steps of the AVERAGE over 2 s (jitter σ ≈ 0.002–0.006 averages out), placed at the window's mean sample time, never before a raw
  sample reached it; a sample > 0.03 from the average restarts the window (fast moves not smoothed); no rest gate (a unit per 5 s still
  records as a line); a PAUSE is found by shape after a gap > 0.5 s ("flat then rising" vs a line, F > 50) → a HOLD point at the previous
  value. Per-note value-only changes carry their own beat (not quantised); pitch/chord changes are. A/B switch `R.recSteps(true|false)`.

### Freeze — tracks rendered offline and played as buffers (F0–F5, A0–A2c, AF1–AF4, AF6b, AUTO-PROBE)
- **A playback MODE** (`recorder.js`): a frozen track plays its buffer instead of its events; events are never discarded; unfreeze = instant
  and lossless. ⛔ Registry keyed by LANE ID (rule #27), never written into events (rule #28; touches neither cursors nor `schedInvalidate`).
  Both replay paths and `chasePlay` skip a fresh-frozen layer (`frzLayer` = `freezeState(layer)==='fresh'`; a stale one falls back to events).
- **Memory (AF6b):** after the render `frzPack`/`frzPackAsync` (async yields every `FRZ_PACK_SLICE` 4 chunks via MessageChannel) quantise each
  channel to Int16 chunks of `FRZ_CHUNK` 2^15 frames with a PER-TRACK scale (q = round(x·32767/peak)); NO dither (TPDF would raise the worst
  error from −96.3 to −86.8 dB re peak, beyond −90, and make refreezes differ). Chunks are TRANSFERRED to the audio-thread store
  (`audio.frzStorePut`); the main thread keeps `key, len, dur, kind, peak, bytes` + the rest map (`blk`/`thr`); Float32 only in the render
  report (`r.buf`). Playback = a reader per start (`audio.frzReader(key, startF, d)`): frame F ≥ startF plays buffer frame F + d; frames on
  the transport grid (`T0F = round(t0·sr)`, `startF = T0F + round((at − t0)·sr)`); no interpolation, no chunk joins in the sound. Without the
  worklet: Float32 `AudioBuffer` + a one-shot source.
- **Two-phase install (AF6b-fix):** `freezeSet` puts the data and builds an idle SPARE reader; the entry waits in `frzPend` (the previous
  freeze keeps playing) until the spare reports `{ready}`; `frzActivate` re-checks lane and signature (refusal words 'sig', 'lane', 'engine'
  after `FRZ_READY_MS` 3 s, 'superseded', 'dropped'). `render.freeze` and probes await `frzWhenReady(layer)`. Each start uses the ready spare
  (`{play:{startF,d}}`) and builds the next. Every reader stays connected to a silent sink (`frzSink`) until it ends (an unpulled node never
  ends — AF6b-fix2). ⛳ A stop is sent `FRZ_STOP_LEAD` 100 ms after the fade's end: `killF` = audible end (fade `FRZ_FADE` 6 ms), `stopF` =
  reader end; the reader reports `seen` (frame the stop arrived). Probe-only: `frzStoreMode('f32'|'noscale'|'i16')`, `frzChunkDbg`,
  `frzNodesInfo`, `frzReadersAlive`.
- **One-shot nodes per start/seek/pass** (rule #3's sanctioned exception). At a brace seam at most two audible nodes per track: the old one
  plays its TAIL over the new pass (overlap, never fold) when the brace reaches the material end; mid-song braces fade the old node (~6 ms).
  Mute/solo = one assignment on the track's bus gain (`makeFrozenBus` straight into `master`, from `laneHush`). Stops: `softAllOff` (only
  when stopped), `stopAtEnd`, `seekTo`, `startTransport`; buffers dropped in `lanePrune`/`laneReset`.
- **Splices by the SCHEDULER at segment start `lo` (horizon T):** LEAVING (`frzLeave`, before the segment's events) for stale-by-edit,
  stale-by-A4/tempo and unfreeze-while-playing (marks `drop`; retired by `frzNearDone` or any stop): the buffer fades with `FRZ_FADE`
  at T, `chasePlay(lo, T, lead, only)` reopens the track's held notes. Splice mark `f.mark = {kind, rep, beat, at}` compared as the PAIR
  (pass, song beat) by `fireNear` too; `FRZ_MARK_GRACE`. Drone sounded live only for audible, not-fresh-frozen layers
  (`droneAudible`/`droneSync`; 20 ms switch). `frzRetire` disconnects the bus after a delay.
- **The swap (AF2, user decision)** — when events own a fresh frozen track while playing (`f.evRun`), `frzPlanSwap` at segment start picks:
  (1) the first REST within `FRZ_SWAP_BARS` 2 bars (bar lines first, then `FRZ_REST_GRID` 0.25 beat); (2) else the next bar line with an
  equal-power crossfade `FRZ_XF` 20 ms; (3) under a cycling brace, if that bar line is the brace end — AT THE SEAM (next pass is the buffer's;
  the seam chase skips the track — `frzChaseSkip`; the pass's voices are CUT at the seam by `voicesCut`). A REST is defined on the RENDERED
  BUFFER: everything within ±`FRZ_REST_WIN` 50 ms of the beat below `FRZ_REST_DB` −60 dB of peak (map `frzBlocks`, `FRZ_BLK` 10 ms blocks).
  The buffer starts at exactly that beat (`frzStart(…, xf)`: offset `startSec + (b − first beat)·spb`, start `t0 + (b + pass offset)·spb`) and
  fades in by `audio.xfRamp` (sin). Double release fixed: `frzSwapCut` → `audio.voicesCut` fades the track's voices — held and released
  (`v.last`) — on `tg` at the swap time; solo cut set ahead by `tick` (`frzLeadAhead`, `FRZ_LEAD_AHEAD` 75 ms) and re-applied by `fireNear`
  (`frzLeadRecut`). Fades are piecewise-linear equal-power (`XF_SEG` 8) — ⛔ never `setValueCurveAtTime`. A swap not yet cut is cancelled if
  the track goes stale (`frzSwapCancel`) or on a brace jump (`frzSwapCancelAll`). Predicates `frzBufNow`, `frzChaseSkip`. Named limits: drum
  tails scheduled before a crossfaded swap and the role's live reverb tail ring over the buffer's tails. Probe-only `frzSwapDbg('old'|'hard'|null)`
  ('hard' is an ear switch only since AUTO-PROBE), `frzSwapInfo`, `braceProbe`.
- **Staleness (F5):** editing is never refused; the buffer goes STALE. `freezeSig(layer)`: event count, first/last beat, SUM of beats, the
  track's `laneEditVer` (bumped by its own edits, `'lanetouch'`), A4, tempo (TF2: NOT the tonic — views carry their keys; the live tonic only
  for an event without a view; probe control `frzSigTonicDbg`), pinned fallbacks only when an event reads them, the drone's live BP choice, the track's
  TIMBRES (`tmix` packs ids `|0`, "indices < 63" — rewrite when string ids arrive), pan, `chordModeVer`, the live solo chain snapshot for solo
  notes without a map (`soloLiveSig`). Memoised per track (`frzSigMemo`), cleared when `frzGlobalKey()` changes (event count + `evGen` +
  `takeFxVer` + pinned fields), which the watcher reads through `frzWatchKey()`. ⛔ Mute/solo and level excluded; other tracks' events
  excluded. The gate is "frozen AND fresh".
- **Auto-freeze (AF3) — tracks freeze themselves, ON by default** (`R.autoFreeze(false)` = off for the session; `src/frzqueue.js`, loaded by
  `render.js`, which `main.startApp` imports right after the engine starts). ONE watcher (timer `QF.pollMs` 250 ms) polls
  `recorder.frzWatchKey()` = `frzGlobalKey` + `frzWatchVer` (bumped by pan) + the live solo chain when a solo note has no map; only when it
  moves are signatures looked at. A track is a CANDIDATE once not fresh and its signature has not changed for the settle delay of the LAST
  trigger — `AF_DELAY` (one place): editor 0.5 s, take/pan/undo/backing/rowDelete/song/any other change 1.0 s, retune 1.5 s (unused while the
  switch is off). Every signature change (and every hint) resets the clock → an edit session of any length = one render after it. Hints
  come through `hooks.af` from the real sites (`recStop`, `onUndo`, `loadArrangement`/`clearJam`, `deleteLane`, `editClose`,
  `songPinChains`; ui pan press/release/wheel/double tap). HOLDS: recording (queue gate), the editor's open track, a held pan control.
  Candidates go through the AF1 queue (priority, gates) and swap in via AF2.
- ⛳ **TF4 (user answer Q5): A4 and tempo re-freeze too** (`AF_REFREEZE_ON_RETUNE` true): a track stale ONLY by them (`recorder.frzRetuneOnly`
  masks field 5 of the signature) waits the 'retune' settle 1.5 s after the LAST move (each move resets it) and plays its events meanwhile.
  Probe control `dbg.noRetune` (the old switch off).
- ⛔ **Not auto-frozen (live by choice):** tracks without a captured
  chain (`laneHasChain` false — auto-freeze NEVER pins the live chain: the queue passes `noPin`; skipped "no chain"); tracks over the memory
  budget `AF_BUDGET_MB` (300 MB touch = `(pointer: coarse)`, 1 GB desktop; estimate before the render, exact `admit(bytes)` in
  `render.freeze` before install, refusal `'budget'`; skipped until the signature changes or memory frees; no eviction until AF6).
- **Chains are pinned at BIRTH, never by auto-freeze:** an editor insert into a track with no captured chain pins the live chain
  (`recorder.editInsPush`: `autCaps(layer,true)`, its `'autcap'` first in the insert's history entry — ↶ removes both); song load pins every
  chain-less track (`recorder.songPinChains()`, called by `P.seed`/`P.song`; the seed: 0 tracks). Inserts into a captured track keep its chain.
- **Interface (AF4): no ❄ anywhere.** Only the arrangement window shows a faint dot at the right end of a row header (`draw`, via
  `hooks.afRow` → `frzqueue.afRowState`): hollow = waiting, pulsing = rendering, nothing = frozen or live by choice (no chain, budget); snapshot
  `loopView.dots`. The play strip shows nothing (its mark column is for the arm dot only). Console: `R.freezeQueue()` (entries, settle
  timers, trigger, skips and why, live-by-choice list, memory used/budget, holds), `R.freeze`/`R.unfreeze`/`R.frozen` (the console `freeze`
  still pins a chain-less track — explicit). No `frz.*` strings remain.
- **Memory of a render (AF3 part 0b, RENDER-LEAK):** Chrome never collects an `OfflineAudioContext` that called `audioWorklet.addModule`
  — context, graph, worklet scope and rendered buffer stay for the session (measured ≈ 6 MB per render of a small track; a hosting iframe,
  navigating it, or taking the graph apart did not free it). So a track render loads the KS worklet ONLY when the track plays a KS timbre
  (`render.usesKS`, `audio.LEAD_KS_FROM`; otherwise `stubWorklet`, the sound is identical; report field `ksLoaded`; probe switch
  `R.renderKsLazy(false)` = the old always-load). KS tracks still pin ≈ 6 MB per render (no workaround found). `render.freeze` also
  DETACHES the report's Float32 data after packing (`releaseBuf`; kept only with `keepBuf` or when the Float32 fallback IS the frozen data).
  Runner check `--leak`.
- **The render (`render.js`):** a second engine instance (`'./audio.js?render…'`, own `AC`, pools, buses, effect tables), one per session,
  re-initialised against a fresh `OfflineAudioContext` per render, sample rate pinned to the live one. Seeded (`setRnd(mulberry32(seed))`
  BEFORE `initAudio`; seed from the LANE ID `seedOfLane`); every render starts and ends with `renderReset()`; ONE render at a time
  (`renderQueued`). `renderTrack(layer)` reuses `makeENG(copy)` and `fxLaneMerge()`; does NOT skip inaudible tracks; every event gets an
  explicit time (solo and drone too); pins A4 (TF2: not the tonic), scale, seventh, the three instrument indices, "tuned from", chord modes BEFORE
  `initAudio` and restores in `finally` (`unpinLive` restores only fields still at the pinned value); tempo recorded, not substituted;
  closes everything left open; taps `master` with gain 1 (`offlineTapMaster`); tail from the captured chain (reverb decay RT60; delay
  `time · ln1000/ln(1/fb)`; longest release) via `fxDenormOf` (largest value over the track); follows chain changes made during a take by
  GATING (`mergeOrders`, `fxRenderPath` wires all effects once, `fxGateAt` opens/closes at recorded beats; a genuine reorder keeps the
  earlier order — `reordered`); every owner key gets an explicit path; the live chain is read nowhere (a capture-less track renders with an
  empty chain — hence `freezePinCaptures`). Solo notes without a map get the live solo chain's snapshot taken at render start
  (`render.patchInst`). `renderTrack(layer, {dry, short, trackGain, trackPan, seed, quiet, layoutOnly, layoutGate})` options are probe/queue
  only. `freeze` takes a ticket (`freezeTicket` — signature + lane id) BEFORE rendering; `freezeSet` refuses if either moved. `A0` times the
  synchronous LAYOUT (`layoutMs`) and pool growth.
- **Probe facts (`R.probe()`, F0–F2):** KS worklet in the offline context, effect instances in that context, buffer shape and peak, one seed
  → the same performance, an isolated noise-only seed test (≈ 70 % of `noiseBuf` covered), KS differing regardless (unseedable in that path),
  `liveRandomIntact`, per-source breakdown, timing split, mix-zero experiment (`zeroMix`, `REV_WET_SEC` 39.7 ms), worklet-cost experiment
  (`stubWorklet`), offline allocator (distinct voices, rms ratio ≈ √N). ⚠️ Its printed verdict tests exact equality and shows red: divide the
  printed max by 7.4506e-9 (1–3 = last bits, fine; millions = a real fault). ⛔ Never widen it into a pass.
- **Repeatability (measured):** same seed → 1–3 ULP (the summand rule: a node with ≥ 3 inputs may sum in a different order); different seed
  ~1.56e7 ULP. Track renders repeat: dry ≤ 1e-4, wet ≤ 2e-4 of peak (one-entry reverb loops). Compare against thresholds relative to peak,
  never `===`.

### Probe rows that render or capture — tolerances and controls
- **AF5 track and live isolated** (`P.checkLiveIsolation`, P.quick and P.all, ≈ 4 s; reads values, no audio capture): the live chord chain
  (composition, values, output), the live owner's route/level/pan and the solo scalars stay identical while a chord track gets a Volume-lane
  edit, a reverb-mix point and a pan change — editor open, after leaving, playing unfrozen, playing (fake-)frozen, stopped; the track chain
  carries the edit while playing (positive); a live reverb change never moves the track chain; a frozen track drives no address; the
  MIXER level 0.2 and pan 0.8 of the ARMED track and of a non-armed track leave every live owner's level/pan/route (all roles) and a
  sounding live chord's voices (tg, pan pair, router) unchanged. CONTROLS: `setLiveIsolation(false)` — the live chain must change;
  `recorder.setLiveLeakDbg(layer)` (a live owner takes that track's level/pan) — the voice read-out must change. Console read-out for an ear
  report: `R.liveCheck()` (live owners, sounding live voices' stages, each track's level/pan/arm, live chains).
- **frozen seed bass level**: the sample count follows the live rate (650886 at 48 kHz = 13.560125 s; ±1 sample of rounding) — the
  system output device may run at 44.1 kHz (it did from RENDER-LEAK on); peak/rms keep the ≥ 90 % floor.
- **AF3 auto-freeze watcher** (`P.checkAutoFreeze`, P.quick and P.all, ≈ 2.5 s, deterministic: probe clock, 50-ms ticks, fake 128-sample
  renders through the real ticket/`freezeSet`, watcher scope one track): every trigger renders after its delay and within two ticks, not
  before (default change, pan held then released, editor via the real `editClose`, take end after the recording gate, undo, backing, row
  delete, song); five pan moves 0.6 s apart → one render 1 s after the last; level → none; tonic → none and the track stays FRESH (TF2); TF4:
  A4 (three moves 0.6 s apart), A4 restored, tempo, tempo restored → stale at once, ONE re-render 1.5 s after the last move (+1 tick), fresh; budget → skipped, not retried; an editor-created track carries a pinned chain (↶/↷ keep it consistent). CONTROLS that must
  fail: `dbg.noReset` (clock not reset → early/extra renders), `dbg.level` (a watcher reacting to level renders), `dbg.noRetune` (the
  pre-TF4 switch: an A4 change must stay unrendered), default budget renders the skipped track.
- **TF0 song sound fingerprint** (`P.checkSongPrint`, quick and all, deterministic data, no render): every pitched event's frequencies
  through `recorder.evHz` (what ENG plays and renders with), the live drone's two strings, and per track view the editor rows, labels,
  cents, chord labels, roots and chord-row Hz (labels in English) — at the seed's environment and again after the REAL tonic control
  moved the key +2; compared line by line with `tools/song.print.json` (made by `P.dumpSongPrint()` on unchanged code; renewed only by
  a slice that changes sound by decision). TF2 renewed the +2 half: recorded lines equal the base lines, the backing L14/L15 moves +2 (Q3)
  and its view at the new key adds two lines; the live drone line moves. Applies only to the unchanged seed song in its environment. CONTROL:
  `recorder.evHzDbg(layer, 1)` (one track one cent sharp through the real pricing) must change lines.
- **TF2 recordings keep their key** (`P.checkKeyKeep`, quick and all): the REAL key control +5 — every recorded event keeps its view object,
  sound (`evHz`), view rows/labels/cents/chord rows/drone strings; the live view follows (key and ×2^(5/12)); frozen tracks stay fresh; the
  drone engine sounds the view it is given; the backing takes the new key in its mode, recordings don't; a key change mid-take (sandboxed,
  `seedTake` step `{do}`) lands in a new track; key-less views read the live key; twelve keys = twelve views. CONTROLS: the old reading
  (`keyFollowsDbg(true)`) must move recordings; the old signature (`frzSigTonicDbg(true)`) must stale the frozen track; the drone without a
  view must move; the key set without the handler leaves the backing behind; the same take without the key change keeps one track.
- **TF3 transpose by semitones** (`P.checkTranspose`, quick and all): expected pitch = what the knob n semitones away sounded before TF2
  (key-less view at that live tonic — key colour and non-12 1/1 included). Track +1 (the seed's frozen track): views re-keyed, payloads and
  beats kept, other tracks untouched, one 'transpose' step, the frozen track stale, ↶/↷/↶ exact; B → C (+3 from 9 → key 12) exactly
  ×2^(3/12) on a mobile track; song −1 (backing too, drums untouched), one step, frozen tracks stale, ↶ exact; refusals 'range', 'drums',
  'backing'; the four buttons exist. TF3b: song −1 moves the knob (value, `#selTonic`, live view key), ↶/↷/↶ set it back/again, a knob turned
  by hand between the step and its ↶ — knob and backing restored. CONTROLS: `trDbg({noTouch})` — the frozen track stays fresh, must be
  noticed; `trDbg({ti})` — the naive transpose (tuning index + 1) must miss on the non-12 tracks; `trDbg({noKnob})` — the knob left behind.
- **TF5 tuning anchor 1/1** (`P.checkOneOne`, quick and all, ≈ 17 500 cases, data + real controls): the gate = an independent list of the
  1/1 tunings' ids; every built-in view at 0 ¢ is the plain object (12 keys); 12-note tunings refuse cents; every 1/1 view at +17/−23/+50 ¢
  (keys 9, 2) prices solo/bass/chords per degree×register, tonic and drone ×2^(c/1200) (1e-12); the real Partch controls (label, cents
  field, Q6 no G by itself, recordings and frozen tracks untouched, «Historical 1/1: G» → G 0 ¢); a 12-note mode hides them; Transpose of a
  +13 ¢ seed track keeps the cents, ×2^(1/12), ↶ exact; the +13 ¢ source differs. CONTROLS: `keyCDbg('ungated')`, `keyCDbg('off')`.
  The TF0 fingerprint pins 0 ¢ (its base half proves existing songs unchanged).
- **AR1 arrangement window** also checks AF4: no ❄ hittable; the freeze dot from `loopView.dots` — rendering = filled, waiting = hollow,
  frozen rows nothing; TF4: a row stale by A4 shows a hollow (waiting) dot, then re-renders and shows nothing; CONTROL: the rendering row must not read as waiting; the play strip has no dots and, with nothing
  armed, no mark column although a track is frozen and one stale.
- **Capture** (`audio.probeCapture`, audio-thread worklet): every probe checks its marker sits EXACTLY at `Mf − F0` and `gaps` is 0
  (`render.capAligned`), else the row errors with the reason; `R.capStats()` counts captures, stale readings, gaps.
- **LR1 live and frozen reverb agree** (`render.revAgree`): an organ chord (`CHORD_INSTR[2]`) with the chord reverb mix at full, played by
  `R.live` and rendered by the freeze path; tail energy re sustain and tail balance agree within ±1.0 dB each; controls (0.4-s tail,
  400-Hz tone) must fall outside.
- **AF2 freeze swap inaudible** (`render.swapCheck`, ≈ 28 s): temporary tracks at the song end, tempo 180, marker at a whole frame; cases
  and limits as in step 64 (`SW_LEVEL` 1, `SW_GAP` −6, `SW_CLICK` 3, `SW_ONSET` 10 ms, `SW_LEFT` −6, envelope onset `SW_ENV` 20 ms at
  `SW_ON_DB` −30 dB, control shift `SW_ON_CTRL` 15 ms); controls: `frzSwapDbg('old')` must exceed the leftover limit; a hard self-splice
  of the events capture must exceed the click limit.
- **AF6b 16-bit frozen playback** (`render.chunkCheck`, ≈ 17 s): runs A Float32 / B 16-bit / C defective chunks (shift by one sample, chunk
  dropped, a reader that ignores its stop) / D no scale; B vs A ≤ −90 dB re peak (`CK_RES`), reader vs render ≤ −100 dB (`CK_EXACT`),
  chunk-join step ≤ 3× (`CK_STEP`, ≥ `CK_JOINS` 3 joins), exact sample counts per reader, no leaked readers (`ALIVE` back to base within
  1.5 s); controls C and D must exceed −90 dB; the marker sample is excluded from comparisons. The 1.2 dB margin is deterministic (two
  overlapping readers at a seam ≤ 1 LSB = −90.3 dB).
- **render repeatability** (`P.checkRepeat`): dry ≤ 1e-4, wet ≤ 2e-4 of peak (samples and energy); controls pan 0.5 (> 1e-2) and level 0.9
  (RMS ratio exactly 0.9 ± 0.001); solo notes without a map put the live solo chain into the signature.
- **ED6 sections** (`P.checkSections`, quick and all, deterministic, no render): temporary material (a theremin take crossing a bar line,
  three reverb lane points, three markers; the range chosen from the song: notes start inside and others ring across it); insert k bars
  then cut them = the song again at four points — objects, order and payloads bit for bit, shifted beats to 1e-9 beat (a float shift and
  its inverse are not exact: 0.9 + 4 − 4 = 0.9000000000000004); insert / cut / duplicate expectations computed in the probe; ↶/↷ exact;
  touched tracks change their freeze signature, untouched keep it; the seed's frozen track goes stale / stays fresh; CONTROLS: a cut that
  forgets lanes, bends, brace, markers or backing lengths (`recorder.secDbg`) must fail the identity check. Restores the tracks' edit
  versions (`laneVerKeep`) so the frozen track is fresh again.
- **ED7 one history** (`P.checkHistory`, quick and all, ≈ 5 s incl. one re-freeze): a frozen track touched by ↶ goes stale; a sequence of
  16 steps of every kind, full ↶ and full ↷ compared EXACTLY with a snapshot after each step; CONTROLS: a step kind left out (`histDbg
  {skip:'level'}`) and a redo kept after a new step (`histDbg {keepFuture}`) must fail; the tripwire answers 'changed' after a direct write;
  300 steps kept. **OWN2 bend curve** (`P.checkBend`): move / clamp / first point / add / delete exactly as computed, refusals, one step
  each, undo/redo bit for bit; CONTROL: an in-place change survives ↶. ED7 (2b): ✕ then ↶ brings the brace and ⟳ back exactly, ↷ clears
  them; CONTROL `histDbg {noBrace}` must leave the brace following. **ED7-fix2 undo after clear** (`P.checkUndoClear`, quick and all, DRAWN,
  ≈ 6 s incl. re-freezing): the REAL ✕ button → toast with a visible Undo and the ↶-only transport (✕, ▶ hidden); toast Undo, transport ↶
  and Ctrl+Z each bring the song back exactly; CONTROL `undoUiDbg(true)` (no toast, strip hidden) must leave no undo control.
- **BEND-CURVE glides and shapes** (`P.checkBendCurve`, quick and all, deterministic, one short render): recorded curves schedule exactly
  (===) as before, chase entries too; hand points glide / curve ±0.6 / step through the editor (one step each, ↶/↷ bit for bit); the
  ramps applied by Web Audio itself (ConstantSource in an OfflineAudioContext) pass the curve within one sub-step's movement; the render
  copy schedules exactly `bendPlan` of what live replay derives (`render.bendTrace`); bus lane k merges and expands by `curveU`. CONTROLS:
  hand points as old steps miss the glide midpoint; the straight glide is not "above"; the glide does not "hold"; a lane without k sits on
  the line. **OWN1** rows: «OWN1 modes by degrees (sweep)» (`checkModeMap`, data, every view × every same-tuning same-size mode × every
  index and register vs an absolute-step reference; CONTROL: out-of-mode, ties and moved pitches present) and «OWN1 track into another
  mode» (`checkTrackMode`: solo, bass, chord tracks re-mapped exactly, refusals, the frozen track goes stale).
- **renders serialized** (`P.checkQueue`): two renders requested at once each equal alone (≤ 1e-4), the queue held both, song and queue
  untouched after.
- **MX1** (`P.checkMixer`): RMS ratio at track gain 0.25 within 2 %; frozen bus target 0.25, stays fresh; owner gains; master gain 0.8·v².
  **MX2** (`P.checkPan`): dry hard-left share ≥ 0.99, centre 0.5 ± 0.01, wet hard-left ≥ 0.8; pan change stales a freeze, restoring
  refreshes it.

### Ear-testing a render (`R.aud` / `R.live` / `R.stop`) — start HERE when a frozen track sounds wrong
`R.live(n)` (the track through the LIVE engine, transport stopped — reference; follows composition changes and automation at their beats,
smooth segments via `fxLaneExpand` at 25 ms) vs `await R.aud(n)` (render exactly as a freeze would, same seed, played at once through
`makeFrozenBus`; freezes nothing); options `{noHum:true}`, `{expr:'neutral'|'bypass'}`, `{mono:true}`, `{recSteps:true}`; `R.recSteps(true)`
everywhere; `R.stop()`. `n` = LAYER index from 0 (strip L2 = 1). A new hypothesis = one more `DBG` switch (off by default) + a line in
`render.audDesc`. Found and now engine behaviour: (A) a fresh attack sets its pitch; (B) phase scatter at build (`voiceStart`; chord/bass
pairs together). ⛳ Principle: a render is a re-performance on a FRESH engine copy — a note's sound must never depend on the engine's past
(attack pitch, oscillator phase, voice reuse, effect gates; plus master gain applied once). ⛳ Method: when a render sounds wrong, EAR-TEST
before reading code.

### Clip / audio recording
`clip.js`: video = canvas frames (HTML chrome excluded) + the audio tap (`createRecordingTap`, off `limiter`) in ONE WebM; audio = tap only;
mutually exclusive (`activeKind()`); buttons driven by real transitions (`onClipChange`). WebM/Opus (Safari may give mp4) — no MP3/WAV/MP4
promise. While video records, `videoRec` hides the canvas looper box.

### Backing (🎵) — Jam or Drums only
A tap from rest opens `#backingMenu` (Jam / Drums only); the pick starts at once (2 taps); later taps switch variant in that path, the cycle
ends OFF; long-press/right-click re-opens the menu. The menu counts as open for the auto-hiding bar (`backingMenuOpen()`). The playing variant
is NAMED (button `🥁 <name> · 4/10`, CSS ellipsis `#jamBtn{max-width:44vw}`, title, a toast on every change); `backingSel` = the actually
loaded selection; `backingName(sel)` via `L()`. Jam variants keyed on scale PROPERTIES (`supportsProgressions`/`supportsChords`, the mode's
`backing.rhythm` — maqsum for maqams); drums-only = `rhythmsForMetre(loop.metre)` (metre with no pattern → item disabled with a reason). Both
paths go through `loadJam` (one flag `ev.jam`); switching paths clears the previous backing. ⚠️ Known defect: drums-only has no cultural gate
(BACKLOG §3.33 item 1; fix must be property-driven). ⛳ TF2 (user answer Q3): a backing FOLLOWS THE KEY KNOB — `recorder.backingFollowKey()`
re-keys every `ev.jam` event's view in place (arrangements are written in degrees, so this IS the backing re-made in the new key): lane ids,
levels, pans and the transport are kept, its held notes handed over (`trackResplice(only)`), the drone retuned, its frozen tracks stale
(edit version) and re-frozen; not a history step (user answer 2, 2026-10-14). Its notes stay read-only in the editor (Transpose refuses
'backing'). Drum hits keep their view (no pitch — as in Transpose, so ↶ of a song Transpose restores the whole backing, TF3b); the TF5 cents
knob re-keys it too (a 12-note backing ignores cents).

### The expression hand (solo, function `'expr'`)
Plays no notes. Four features off RAW landmarks (`exprFeatures`): energy (palm-centre speed in palm sizes/s; position EMA before
differentiating, velocity smoothed `tauV`), openness, tilt (palm normal from landmarks 0/5/17 incl. `.z`), finger spread (mean pairwise tip
distance). Middle layer (`tickExpr` → `EXPR`): pump-and-decay resonator on energy (`kPump`/`tauE`), an inertia spring per channel
(`springF0` 2.5 Hz, `springZeta`, semi-implicit Euler), `engage` crossfade (`tauEngage`). Four channels → four axes (`applyExpr`,
`EXPR_A`): liveness (pitch+amplitude shimmer `vibHz`, `vibCents`), wah (high-Q peak `wahLo..wahHi`), texture (soft↔hard shaper morph with a
lowpass after), space (delay send). Brightness is deliberately not an axis. Invariants: rule #22 (sub-step `subDt`, `dtMin`/`dtMax` guard,
dead zones `smoothstep` → exactly 0, `orDead`, `sprMin`) and rule #23. The last expression hand that moved owns the instrument (`exprMoveT`).
On screen: one «ВЫР» bar + the hand-dot hue/size.

### The tutorial
`tutor.js`: `LESSONS` as data `{id, titleKey, descKey, steps, next, setup?}` (`steps:null` → «Soon»); steps `{key, gate?, enter?, done?,
final?, reveal?, skipIfDone?}`; `enter(acc)` zeroes what the step measures; `done(acc)` pure; `gate()` drops steps that don't fit the scale.
Chain: basics → chords → tunings → looper → handfn → split. Progress = a quiet ✓ in localStorage (`handsong.lesson.<id>`), never a gate;
finals are a choice card; Skip returns without ✓. One channel `hooks.tutor`; `apply(kind,p)` folds events. `teardown(completed)` is the one
exit. Setup must work from any previous lesson: `tutorReset` (single-role solo, split off, clean loop via `tutorClearLoop`, ALL `handFn`
defaults, every role's Volume back on Horizontal via `fxVolReset`); the Looper lesson switches to `MAJOR_ID` (found by `edo:12 &&
iv==='0,2,4,5,7,9,11'`); Chords and Split start on `CHROMATIC_ID` (`typedChords==='chrom12'`); Split: scale FIRST, then `tutorSplitInit()`
(bass right half if no chords). The strip hides under a working finger by FOCUS (`focusin`/`focusout`/`change`; a native `<select>`
swallows `pointerup`): `.mini` with a panel open, `.hushed` while a finger works inside, back ~1.8 s later.
⛳ **Strip visibility: `.on` is the ONLY gate** — `#tutorBar` `display:none` by default; `.mini`/`.low`/`.hushed` never carry `display`;
the collapsed rule is `#tutorBar.on.mini`; `syncTutorBarPos`/`hushStrip` bail out without `.on`; `teardown` removes all four classes;
`startLesson` calls `tutorSyncBar()` right after adding `.on`.

### Publication & PWA
Live at https://sonychailml-blip.github.io/handsong/ (GitHub Pages; custom domain `handsong.app` intended, not attached; no file in the
app references either URL — update only these docs). Installable: `manifest.json` (name «Handsong», standalone, three icons incl. maskable)
+ cache-free `sw.js`. Install button by REAL capability: Chromium → held `beforeinstallprompt`; iOS Safari → Share-sheet instruction;
standalone → hidden. If offline is ever wanted, the cache goes in `sw.js` — and MediaPipe from the CDN would still block it.

### Localisation
`LANGS=['en','ru']`. Interface strings in `DICTS` via `t()` (fallback current → en → `params.def` → the key itself, visibly); static markup
`data-i18n`/`data-i18n-title` via `applyI18n()`; JS-built strings redrawn from `onLangChange`; canvas calls `t()`/`L()` per frame. Musical
data names inline, three shapes: bare string (international notation, e.g. `'SuperSaw'`), `{default, ru}` (proper noun, transliterated),
full `{en, ru, …}` (translatable word); `L()` resolves `lang` → `default` → `en` → `ru` → first. ⛔ Identifier hazard (rule #25): `demo.js`
matches by `SCENES[].id`; `ui.fillScales` buckets by `grpKeyOf(s)` (caption via `L(grp)`).

### UI shell
Start card: Play and Learn (both via `main.startApp`, AudioContext inside the click); below them ⛶ fullscreen then ⬇ install (either may be
absent); footer: 🌐 language, note, feedback link, donate (hidden while empty), JS-assembled e-mail. `#helpOv` unreachable from the UI (to
move into the tutorial). Top bar auto-hides (`.min`) after ~3.5 s, reveals on tap/mouse-move (8 px); collapsed keeps only role
indicator(s) + the three record buttons — the same DOM elements; never hides with a panel open or a pointer down; ⛶ in the bar (not in the
collapsed strip). Panels light and opaque, three in one place, opening one closes the others: «Scale» (`#panelScale`), «🎛 Sound»
(`#panelSound`), «Looper» (`#panelLoop`). Transport under the strip: ▶ ⟳ ⤺ ✕ ■ ✎ in play; ⏮ ▶ ⟳ in the window; ⏮ ▶ in the editor.

## Known limits (design around them; reasoning: archive, "Known limits")
- **A chain reordered during a take renders in its earlier order** (gating can't reorder; report `reordered`); live gates fade (τ 0.08) and
  live dips ~40 ms on a composition change that changes the wiring, the render switches instantly; a re-opened live effect may hold an old
  tail, the render's opens empty.
- **One TRACK network per role** (since AF5 the live network is the hands' alone, rule #31): unfrozen tracks of the SAME role share the
  role's track chain — the last writer wins among them (a frozen track has its own sound in its buffer). Per-track chains = BACKLOG.
- (VOL-6 CLOSED 2026-10-14: the user tested that a ringing latched chord follows the hand after release — left–right volume, near–far
  timbre; the old limit «a latched chord with open fingers receives no updates» was wrong.)
- **Several takes through one chain: last writer wins** (sorted `(t, tk)`; ties by higher take; a take governs only its roles' owners);
  network parameters, compositions and expression channels only.
- **Randomness:** see "Audio engine — random draws"; nothing random is recorded; "the same performance" is the requirement.
- **Same performance, never the same samples:** summand rule (1–3 ULP); thresholds relative to peak (dry ≤ 1e-4, wet ≤ 2e-4); dry drift up
  to 1.54e-5 of peak after many renders (node unknown).
- **A track's chain in the editor is the union of its captured takes' snapshots**; mid-take effects are not moved/removed by ▲▼⊘; an effect
  in one take's snapshot but added mid-take in another is removed only from snapshots.
- **Track chains belong to the ROLE, not the track** (rule #31 separates live from tracks, not track from track).
- **Nothing can be saved** (view and `a.ty` references; capture keyed by take) — BACKLOG §1.
- Captured expression channels are not replayed (`fxPlaySet` drops `'expr'`) — BACKLOG §4.
- **A render of a KS (plucked) track pins its offline context** (≈ 6 MB per render, Chrome; other tracks are collected since RENDER-LEAK).
- **AF5 cost:** ≈ 100 extra GainNodes on the live graph (24 chord routers × 2, built solo voices × 4, bass voices × 3, 4 heads + 4 outs) plus
  the track chains' effect instances when tracks play (a chord reverb ≈ 49 nodes). Synthetic bench on the (slow) dev desktop: routers ≈ +4 %
  of real time, one extra reverb network ≈ +1 %; a phone may be ≈ 4× that — not measured on a phone.
- **The one history (ED7)** keeps 300 steps; mute/solo/arm, the brace, tempo and tonic are not steps; ✕ resets a user brace to following
  (↶ of ✕ restores the song AND the brace with ⟳). A note starting inside a cut is removed with its tail; a note closed by the next note's
  start exactly on an insert point is lengthened (held through the new bars); insert-then-cut leaves beats equal to ~1e-15 beat, not bit
  for bit (float). Copies of a duplicate belong to the source take (⤺ of that take removes them too).
- **After an A4 or tempo change frozen tracks play their events** (through the live pools, with their polyphony ceilings) until they
  re-freeze — 1.5 s after the last move plus one render per track, one at a time (TF4). The key knob stales nothing (TF2).
- **Transpose keys stay within −12..23** (two octaves around the knob); a track or song already there refuses one more step ('range').
- **Paste and arming respect the key** (TF2; accepted by the user 2026-10-14): a clipboard pastes only into a track of the same view — key and
  TF5 cents included; an armed track recorded in another key than the knob's takes nothing (a new track starts, as for another mode). Later:
  «paste transposed into the track's key» (BACKLOG §3.40).
- **The cents nudge is offered only for 1/1 tunings** (TF5); a 12-note tuning in another temperament than 12-TET is moved by A4 (one
  source). Song Transpose moves the knob mod 12 (B + 1 → knob C while the song sits at key 12).

## How to verify a change
No unit tests. Claude Code runs the static check, `node tools/probe-data.mjs` and `node tools/probe-browser.mjs` per the probe budget,
fixes failures until PASS and quotes the verdict lines. The user does the steps below that need ears, a camera with hands, or a phone,
plus a manual `await P.seed({replace:true})` + `await P.all()` about weekly. Never report a change as done without naming the steps not
verified. Full text of every step: archive, "How to verify a change".
1. Play → camera; app starts single-role solo; the bar hides after ~3.5 s, reveals on tap; not with a panel open. Learn opens the lesson list.
2. Roles play; ● records a take, again stops; a second take = a new row; ⤺ removes the last take; arrangement from beat 0; three panels in
   one place, one at a time.
3. Typed chords (Chromatic, 31-TET, 19-TET): palette by left index pinch; 19-TET minor beats less than 12-TET; 31-TET dom7 = 4:5:6:7.
4. Cents scales (Slendro/Pelog): uneven, octave 2:1, real cents in the tag; gamelan shows the no-chords hint.
5. Six menu sections in order (Common · Middle East · India · Java & Far East · Historical Europe · Experiments); symmetric scales in Common;
   Europe flat and chronological; Experiments only tunings; no sound changed.
6. Split (landscape ◨): halves with their roles; either hand plays the half it pinches; a latched chord rings while the other half plays;
   own register bands; role buttons skip the other half's role; bass/drums stay in their half; FX bars vanish without a solo half; portrait
   auto-disables split.
7. Rectangles: Y picks the rectangle, finger 1 of `k`; 31-TET 8+1 and Partch 11+1 byte-for-byte; 19-TET and Carlos γ 10+1 over two octaves
   with a window band («oct I–II»…).
8. Partch: 11-limit JI; O7 beat-free 4:5:6:7; a recorded Partch chord replays in JI; "Free" every type everywhere; "As on the instrument"
   greys unfit types and a pinch there sounds the root alone with a tag reason (replays as one note).
9. Theremin (hand function, solo and bass): additive centre lines only when assigned; continuous glide; the recorder stores the nearest step;
   bass theremin lower.
10. Bohlen–Pierce: tritave registers, labels `Т,2,3…`, word «тритава»; "Free" pure ratios incl. 11-chords; "As on the instrument" steps
    (3:5:7 = 0·6·10, beats slowly), no 11. Carlos α/β/γ: fifth period, word «рег.»; γ rect; all three no chords.
11. Historical (Europe): Pythagorean alike in every key ("tuned from" = tonic); "from C" → key colours (A major third ≈ 384¢, F# 678¢ wolf);
    moving it never retunes recordings; Natural "Free" pure; fixed grids → pure and wolf; real note names on fixedKey scales.
12. India: 22-shruti uneven, «свара · шрути» (tonic «Са · Чхандовати»); ragas swaras only; no-chords hint; status «cents tuning · N steps».
13. Camera switch 🔄: front mirrored, back not; picture and hand flip together; no second camera → toast.
14. Cover: no stretch on desktop or phone; the hand runs off the edge at the outer rectangles but tracking survives; hand and cell aligned;
    the video clip unstretched.
15. Clip/audio 🎥/🎙: canvas+sound vs sound only; mutually exclusive; buttons return to rest.
16. Backing 🎵: chooser, named variant + toast, cycle ends OFF, long-press menu, drums-only by metre (7 → only «Balkan 7»; disabled at 5/10/12),
    menu keeps the bar up, never deletes the player's layers.
17. Hand functions: separate per role and persistent; hold freezes the note (volume follows X); two solo hands independent; chords
    fx/latch/hold/loop; drums fx/hit/loop.
18. A4: presets (415…444) or 380–480 input (nonsense reverts); 415 lowers everything ~a semitone, mobile and fixed together; drone follows;
    440 byte-for-byte.
19. «Tuned from C (historical practice)» only on the five C-tuned fixedKey scales (follows language); Werckmeister third ≈ 390¢ in C,
    ≈ 408¢ in F#; mobile Natural transposes without character change; cents whole numbers everywhere.
20. Chord readout: live chord lists Hz + cents above root (Partch O7 → 386/702/969); disappears on stop; replayed chords plain.
21. Metre (only empty + stopped): 7 accents 3+2+2; 16 four vibhags, weakened third; count-in one bar; patterns of other metres skipped.
22. Timbres: FM bell/metallophone inharmonic; KS in tune over the whole range; worklet failure → plucks without index shift; fullscreen
    toggles stay in sync, Esc updates them, hidden where unavailable.
23. Chord hold + brightness: hold stops on release; depth changes timbre not pitch; a recorded track keeps ITS brightness; a latched live
    chord survives brace seams.
24. Looper hand: index record (armed track if any)/stop, middle play/pause, ring undo, pinky ~3 s countdown clears (early release cancels);
    named confirmations and reasons; one command per pinch; transport buttons still work.
25. Subdivision: Shuffle limps (long-short); other 4/4 patterns distinct; the original 8 unchanged; arrangement drums use the selected kit;
    division 3 → triplet quantise + faint ticks.
26. Tutorial strip: with no lesson running, opening a panel shows nothing at the bottom (also after finish/Done/Skip/chaining).
27. Expression hand: no notes; resting hand gives exactly zero; movement pumps and decays; jerks overshoot and settle; four distinct axes;
    no 5–8 Hz wobble at low fps; off → solo chain exactly as before.
28. Tutorial: a picked lesson starts the app in the same click; lessons completable after any other (hand functions reset, nothing keeps
    playing, the Looper lesson's chords sound); finals are choice cards; Skip without ✓; strip one line with a panel open, gone while a
    finger works a `<select>`, back ~1.8 s later.
29. Localisation: 🌐 switches chrome, options and canvas labels; survives reload; the demo still plays the right scales; menu groups same.
30. Note layout: default «By mode» unchanged everywhere; never disabled; major in rectangles = 8 rects, 4 octaves, no band, real names,
    register markers, chord highlight in the right block; chromatic 12; pentatonic k=3 (idle pinky dim `—`, «finger not used»); 22-shruti
    k=2; BP 7; theremin lines k per rectangle; a recording replays identically in the other layout.
31. Polyphonic solo: one note sounds exactly as before on every synthesis path; two hands sound together; release stops only that note;
    old loops replay identically and no longer fight live play; bends bend only their voice; a replayed layer doesn't change the live
    instrument; stealing takes released tails first; highlights per rectangle and finger; «Fingers per hand» 1 keeps the glide; 2+ fingers =
    two notes, recorded as two `a.v` streams; eight at once with both tags; legend low at the bottom.
32. PWA: ⬇ only after Chromium offers it; iOS shows instructions; standalone hides both; nothing cached.
33. Linear time: 8 bars play and STOP; ▶ from the end restarts; the strip never grows past the material without repeat; pause + ▶ resumes
    with held chords sounding (chase).
34. Brace: follows («auto»), drag to 3–5 (solid, stays); ⟳ cycles exactly those bars, accents on the bar; ⟳ off/on doesn't move it; ● from
    stop counts in the bar before and records from bar 3; edits refused while recording.
35. Chase: chord/bass/theremin held into a brace sound from the first moment of every pass; muted tracks silent.
36. Tracks: M/S instant; tap a row to arm (outline, «REC → L2», «(not heard)» if muted); ● records into it for that track's source only; old
    and new material both sound.
37. Undo/delete/clear: ⤺ removes the last take (merged takes leave earlier material); row ✕ needs a second tap within 3 s, removes only that
    track, not undoable; transport ✕ clears everything.
38. Stops: pause holds; panic silences and rewinds to the brace start keeping song/brace/mutes/arm; both close held notes in a recording.
39. Track editor: open from the arrangement window (refused while recording/clip; ● refused while open); no phantom pinch on close; drums 6
    rows; pitched rows fill or scroll, named in the track's OWN scale; move/resize/insert/delete/↶/↷ (a new edit kills ↷); independent bass
    notes (E1/E2); no role selector; timbre select (one ↶/↷, frozen goes stale, effects unchanged); ⌫ deletes, not in text fields; chords
    (U2–U4: notes never leave the grid, off-row deviation marks, two-level selection, dissolve on delete/move/resize/pitch, snapping onto a
    row, no-op when released on its own row); backing refuses note edits but accepts timbre; drone has no timbre select; duplicate-tonic row
    dimmed; T3 «All»/«Mode» axes.
40. Serial chain: swapping reverb/delay order is audible; mix 0 = exactly no effect; old layers keep drive/vibrato/tremolo, reverb/delay from
    the live chain.
41. Capture and playback: a swept bus knob (also with a latched chord and open fingers) is recorded and replayed; live knob doesn't reach it;
    bars follow the hand, driven ones hollow; stop returns to the hand; later take wins at the same beat; lane points drawn as steps,
    vertical tenths/units, sideways free, ↶; adding an effect to a chain-less track keeps its sound then detaches it from live knobs;
    per-note lanes from the notes (not hollow during ▶); a mid-take reverb listed, not re-offered, frozen copy brings it in at its moment.
42. Per-pass closing: held solo/bass/latched chord across seams while recording — every pass sounds, nothing rings past its end, the live
    latch never broke.
43. Freezing (by itself since AF3/AF4): a frozen track sounds the same (reverb micro-structure may differ); an edit → it plays its events
    until it re-freezes; a frozen sustained bass survives tonic/A4 changes while playing; a track starting at bar 3 enters at bar 3; a drone
    backing not doubled; console `R.freeze`/`R.unfreeze` still work.
44. One role and timbre per track: split solo+chords in one take = two rows, one ⤺; solo timbre switch mid-note continues in a new row (20 ms
    crossfade, replayed); bass switch mid-note stays; an armed track of another timbre → a new row with the header message; a chord latched
    before ● is written from the first beat.
45. Voice modes and glide: defaults unchanged; poly bass, lead solo (one note, hand-over, glide back); switching with a held pinch; mid-take
    change stays in the track; Glide added changes nothing until moved, heard only on legato moves; backing bass ignores the hand's glide;
    frozen first note without scoop, SuperSaw without swirl.
46. Smooth automation: two points on Reverb·Mix → a diagonal and a gradual rise; ╱/⌐ toggles with toast, ↶/↷; a swell inside one held note;
    frozen glide = events (`R.live(n)` vs `await R.aud(n)`); untouched recordings unchanged; no console errors.
47. Volume on depth (VOL-4): defaults unchanged; Volume on «Playing hand → Depth» per hand (nearer quieter, Invert flips) on every role;
    brightness and volume on depth move together; recorded as played.
48. Sevenths that add no note: greyed with one line in blues, major blues, whole-tone, Prometheus; works elsewhere; the choice is kept.
49. Dimmed rows (T5): bass onto C#, one chord note onto a dimmed row, a whole untyped chord keeps its sound; seek/freeze correct; «Mode» shows
    out-of-mode notes between rows with «+100»; ✚ on a dimmed row inserts there.
50. Insert (U5): dimmed row inserts a bass note; nothing selected → one note; a whole chord selected → its shape (bright untyped follows the
    rule, typed exact); one note selected → one note; no dissolve; ↶/↷.
51. T7: Partch on 1/1 full palette, elsewhere greyed with reason, offered chords pure; BP from steps, no 11 (now the "As on the instrument" mode).
52. T7b chord modes: row only on Partch, BP and the 14 modes; Free vs As on the instrument; Stacked vs Power chord; recordings keep their
    mode; a new mode starts a new track; non-default mode on the scale button.
53. Solo in the editor (S4): move/resize/delete/insert with undo/redo; lead-line detach re-articulates; pitch-only keeps the glide; inserted
    note copies the neighbour's map; frozen goes stale; theremin moves/transposes with its bend.
54. Theremin length and curve (S5): curve drawn as steps in both views; shortening trims the bend (↶ restores); lengthening holds the last
    value; stop/pause mid-bend then plain notes — none bends.
55. Tie pairs (S6): moving/deleting a shared edge unties both (second gets its own attack); ↶ continuous again; pitch-only keeps the pair; a
    frozen partner goes stale; deleting one row unties the other.
56. More tracks than the screen: `P.seed` 18 tracks; rows scroll with a footer and bar; taps still arm/mute/solo/delete; transport visible;
    L18 opens in the editor; few tracks look as before.
57. Arrangement window (AR1): all tracks, thumb-sized rows, miniatures, scroll/zoom/⤢; row → editor at the same span and back; M/S/arm/❄ work;
    ▶ playhead; brace band; portrait fits; play strip unchanged.
58. Mixer (MX1): 🎚 faders and master strip; fader changes only its track; 0 = silent; double-tap 100 / 0 dB; frozen level changes, ❄ stays
    blue; master moves all; meter and limiter readout; ▤ back.
59. Pan (MX2): hard left/right in headphones, centre as before; «L 100»/«C»/«R 100»; double-tap centres; detent; frozen pan change → orange,
    re-freeze → blue, restoring → blue; live hands centred.
60. Fast probes: `P.quick` < ~30–40 s, `P.all` with time printed; hidden tab → «not checked: tab hidden»; `node tools/probe-data.mjs` PASS.
61. Names, colours, order (AR2): «role · timbre» in role colour (distinct in greyscale); double-tap rename shows everywhere; empty → default;
    drag handle reorders everywhere; new take last; event ticks in role colours; phone-width works without zoom.
62. Live reverb (LR1): the room sounds the same after reload and frozen (`R.live` vs `R.aud`); `R.liveReverb` gone; row «LR1 live and
    frozen reverb agree» PASS; strip labels inside the frame at 360 px.
63. Freeze queue (AF1): audible tracks near the playhead freeze first; no new render while recording; costly layouts wait while pinching;
    a track changed while waiting renders once after it settles; `R.autoFreeze(false)` drops waiting ones for the session; `P.freezeCost`.
64. THE SWAP (AF2) — ear test on a held pad (headphones): freeze a long pad while it rings → swap at a bar line with no dip, click or swell;
    rests → nothing to hear; under a brace → at the seam, no doubled attack; stopped → starts exactly like the events. Row «AF2 freeze swap
    inaudible» is run by the runner (`--all`): stopped (envelope onset ≤ 10 ms, level ±1 dB, click), held pad (jump ±1 dB, gap ≥ −6 dB,
    click ≤ 3×, leftover ≤ −6 dB), control old swap (leftover > −6 dB), control hard splice (click > 3×), rest (leftover ≤ −6 dB; jump is
    information), loop seam (jump, gap, click).
65. 16-bit frozen tracks (AF6b) — ear test: a frozen pad and drum track with ⟳ across a bar line — no click or gap at the wrap or on seeks;
    nothing sounds different; `P.freezeCost` «today MB» = real 16-bit bytes; row «AF6b 16-bit frozen playback» (runner).
66. The first attack of a track (AUTO-PROBE fix): a percussive chord track starting at bar 3, ▶ from bar 1 → the first chord at bar 3 has its
    full attack on the beat (before: its first ~40–100 ms swallowed by a needless chord-bus dip). Same for solo/bass tracks starting later.
67. Auto-freeze (AF3) — ear and eye, arrangement window open: (1) record a take, stop — about a second later the row's dot goes hollow →
    pulsing → gone and NOTHING audible changes; (2) edit a track in the editor and leave it — the same, once, ~0.5 s after leaving; (3) move
    a pan control and release — the same, ~1 s after release (moving a LEVEL fader shows no dot); (4) change the tonic — no dot, nothing
    re-freezes, the recordings keep their key (TF2); (5) change A4 — see step 89.
68. No ❄ anywhere (AF4): play strip (no ❄, no stale mark), arrangement window (M · S only; the faint dot only), editor bar (no ❄, no state
    label), no toast about freezing; row «AR1 arrangement window» checks the dot states.
69. Track ≠ live (AF5, rule #31), headphones: record a chord track, lower its volume (Volume lane) and its reverb in the editor, leave — live
    chords stay at full volume and reverb, the track plays quieter; turn a live effect with the hand (chord reverb) while the track plays —
    live chords change, the track doesn't; the same with `R.autoFreeze(false)` (`?probe`) and with the track frozen.
70. The first attack of a track after ▶ is still whole (ear step 66) — the track chain rewires without a dip at a start.
71. Several notes (ED1), eye: ⬚ on → taps add/remove notes (white), a drag on empty space draws a box and adds what it covers, Esc clears,
    Ctrl+A selects all; drag one selected note — every selected note follows (dashed ghosts), rows too; one ↶ puts all back, ↷ again;
    🗑/⌫ deletes the group (one ↶); a fully selected bass/solo glide moves as one gliding note; with ⬚ off, tapping a note selects it alone.
72. Copy/paste/duplicate (ED2), eye and ear: select notes, ⧉ (toast «Copied: n»), move the playhead, 📋 → the same notes at the playhead,
    selected, sounding the same; ⧉⁺ → a copy right after (a phrase longer than half a bar lands on the next bar line); paste into another
    track of the same role and mode → they take THAT track's timbre; into another role or mode → a toast says why; one ↶ per paste.
73. Quantise (ED3), eye and ear: select a few loose notes, ⌗ with «1/4 · Starts · 100%» → their starts sit on the grid lines, lengths kept,
    same pitches; «Ends» → only the ends move; 50% → halfway; a selected glide's middle pitch change moves onto the grid and the line stays one
    gliding note; already on the grid → toast «Nothing moved»; one ↶ puts everything back.
74. Transpose by degrees (ED4), eye and ear: select a melody, +1° → every note one degree of ITS mode higher (in major C→D, E→F), times
    unchanged, a glide stays one gliding note; a note outside the mode (C# in C major) +1° → D#; −1° back; a chord moves to the next
    degree's chord of the mode; past the top register → toast, nothing moves; Alt+↑/↓ do the same; one ↶ per press.
75. Volume bars (ED5), eye and ear: open a track, lane → Volume — bars, one per note; drag one down → that note is quieter, the number
    beside it; drag a bar of a selected group → all selected move together; on a drum track with kick and hat on one beat, lower the hat
    only — the kick keeps its volume; •— shows the line again; one ↶ per drag.
76. Sections (ED6), eye and ear, arrangement window: tap the sections band at bar 3 and bar 5 — markers A and B; double-tap A → rename
    it; tap A → the brace covers bars 3–4; ✂ → bars 3–4 are gone in every track, what followed plays right after bar 2, a held chord
    from bar 2 stops or rings on as before, frozen tracks re-freeze by themselves (dots); ↶ → all back; ⧉ → bars 3–4 play twice; ＋▯ → two
    silent bars before bar 3 (a chord ringing across keeps ringing through them); ↶/↷ after each.
77. Section rename (ED6 fix), mouse and finger: an empty sections strip says «+ section — tap here…»; tap it → marker A; double-click /
    double-tap the name → the field opens and stays (type, Enter); or tap the marker once and press §✎.
78. One undo (ED7): record a take, move a note in the editor, close it, lower a track's fader, rename a track, cut bars in the window,
    press ⤺ — then ↶ (play screen, window or editor, or Ctrl+Z) seven times: each step comes back in reverse order with a toast naming
    it, the take last; ↷ (Ctrl+Shift+Z) replays them; a new edit after ↶ greys ↷; ✕ clear then ↶ → the whole song is back; a frozen
    track touched by ↶ re-freezes by itself (its dot in the window).
79. Bend curve (OWN2), eye and ear: select a theremin note — white dots on its curve; drag one up → it bends higher (dashed ghost,
    «+35¢ · 1.25»), sideways → it moves in time but not past its neighbours; ✚ then tap inside the note → a new point; 🗑 → the selected
    point goes (the first one stays); each one ↶; play it — the replay follows the new curve.
80. Brace after ✕ (ED7-fix): set a brace on bars 3–5, ⟳ on, press ✕, then ↶ — the song AND the brace on bars 3–5 with ⟳ on are back.
81. Bend glides and shapes (BEND-CURVE), headphones: select a theremin note, ✚ and tap two new points far apart in pitch — on ▶ the pitch
    SLIDES between them (no jump); drag the diamond in the middle up → the slide arrives early, down → late; tap the end point, then ⌐ →
    hold then jump; ╱ → slide again; each one ↶; an old recorded theremin note sounds exactly as before; on a chord track's reverb lane,
    select a point → its diamond bends the reverb ramp the same way; frozen and live sound the same (`R.live(n)` vs `await R.aud(n)`).
82. Track into another mode (OWN1), ear: open a C-major solo track, Mode → Dorian — E becomes E♭ and B becomes B♭ everywhere, rhythm and
    volumes unchanged; a C# (outside the mode) stays C# — it keeps its distance from C, the nearest degree below a tie; ↶ brings major back; a frozen track re-freezes by itself (dot).
83. Undo after ✕ (ED7-fix2): with a few tracks, press ✕ — the strip disappears, a box «Song cleared — ↶ Undo» shows for ~6 s under the
    top bar and a lone ↶ ↷ stays where the transport was; tap Undo in the box → everything is back; ✕ again, wait 6 s, tap the lone ↶ →
    back; ✕ again, Ctrl+Z → back. With nothing recorded and an empty history, nothing extra is shown.
84. The key knob (TF2), headphones: play a few recorded tracks and change the tonic in «Scale» — the recordings keep sounding in their key,
    without a gap; your live playing follows the new tonic; in the arrangement window no freeze dot appears on frozen tracks.
85. Backing follows the key (TF2, Q3): start a Jam backing, change the tonic — the backing re-plays in the new key at once (a held chord
    moves), the transport keeps running; a recorded track does not move.
86. Key change while recording (TF2, Q2): record solo, change the tonic mid-take, keep playing — the notes after the change land in a NEW
    track; one ⤺ removes both.
87. Transpose (TF3): in the editor bar «−1 st / +1 st» moves the whole open track a semitone (a toast, one ↶); in the arrangement window bar
    «−1 st / +1 st» moves the whole song (backing too, drums untouched; one ↶); from B a step up goes to C ABOVE, not an octave down; in
    Werckmeister the key colour changes; in Partch / Bohlen–Pierce the 1/1 moves 100 cents; frozen tracks re-freeze (dots).
88. Song Transpose moves the knob (TF3b): note the tonic in «Scale», press «+1 st» in the arrangement window — the tonic reads one semitone
    higher and your live playing fits the song; ↶ — song and tonic back; in the editor «+1 st» leaves the tonic alone.
89. A4 / tempo re-freeze (TF4), headphones, window open: change A4 (e.g. 440 → 442) while frozen tracks play — they keep sounding (now note by
    note, at the new pitch); ~1.5 s after you stop, the dots go hollow → pulsing → gone, one track at a time, with no audible seam; the
    same with the tempo.
90. «1/1 = G» (TF5): pick Partch — the key row reads «1/1 =» with a ¢ field and a button «Historical 1/1: G»; the knob did NOT jump to G
    by itself; type 12 in ¢ → live notes a little higher, the scale button shows «+12¢», recordings unchanged; tap the button → G, ✓,
    disabled; pick a 12-note scale — the ¢ field and the button disappear and nothing is nudged; an old Partch recording sounds as before.

## Language
- **Code comments:** existing ones are Russian; new and edited ones are short English (standing rule). Never translate en masse.
- **User-facing strings:** English-first, Russian alongside — interface chrome as keys in BOTH `DICTS.en` and `DICTS.ru` (`t()`,
  `data-i18n`); musical data names inline via `L()` in the three shapes. `es`/`de` prepared, deliberately not enabled (terminology unchecked).
- **Docs:** `HANDOFF.md` and this file in concise English; archives Russian verbatim; BACKLOG/UI-MAP Russian except sections edited later.
- Chat replies to the user: English (the terminal mangles Cyrillic); the strategist explains to the user in Russian.
