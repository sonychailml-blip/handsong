# CLAUDE.md

Guidance for Claude Code in this repository. SHORT by design (DOC1, 2026-10-17): the standing working rules, conventions, hard
rules, a short module map and the verification-step index. Everything else — the full module map, the architecture sections, known
limits, the full text of every verification step — moved WORD FOR WORD to `archive/CLAUDE-history.md` (index below; grep it by
section title). The long reasoning behind each section: `archive/CLAUDE-full.md`. State, open decisions, work order: `HANDOFF.md`.

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
- ⛳ **`docs/NAME-INDEX.md` is GENERATED** (RUN 5): after adding, removing or renaming an export run `node tools/name-index.mjs --write`
  (the data row «NAME-INDEX current» fails otherwise); removed names are kept by hand in `docs/STALE-NAMES.md`.
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
  ⛳ DOC1 (user, 2026-10-17): this file stays ≈ 60 KB — rules, conventions, the SHORT module map, the step index. A new module gets one
  line in the short map; new architecture / module / probe-row / known-limit detail and a new step's full text go to
  `archive/CLAUDE-history.md` under the matching section (moved word for word at DOC1 — `tools/doc-split-check.mjs` proved it; later
  slices update a stale line there in place AND copy the old line verbatim to its section «Superseded at DOC1», so the check
  `node tools/doc-split-check.mjs archive/CLAUDE-before-DOC1.md CLAUDE.md archive/CLAUDE-history.md` keeps passing exactly).
  BACKLOG.md / UI-MAP.md stay Russian; any section you edit is rewritten in English.
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts), not routine slices (AF, ED, AR, MX, records). Planned uses: foundation plan
  (before stage 3), hearing the room (before 5), synthesis core (before 7), latency and hands, a periodic deep review + type-checking prep.
- **The data runner `tools/probe-data.mjs`** is the one exception to "never execute application code in node": it runs only the
  data modules (`probedata.js` → scales/state/i18n and their imports) against `data/`, prints a line per check and ALWAYS a final
  verdict (`[probe-data] PASS — …` / `NOT A PASS — …`, exit 0/1; no verdict = failure). 40 s – 2 min. Quote its verdict. Its last row
  «LIC1 licence register» runs `tools/check-licences.mjs` (text only; alone: `node tools/check-licences.mjs`, ≈ 2 s); the row «LAT1
  latency stats (core)» runs `src/core/latency.js` (also «LAT2 search schedule (core)» `core/handsched.js`, «LAT3 low light (core)»
  `core/camlight.js`) — the CORE is pure by design (no DOM, Web Audio, camera, network) and may run in node.
- **The browser runner `tools/probe-browser.mjs`** (AUTO-PROBE; `npm install` once in `tools/`): own static server on a free port,
  fresh temporary profile per run (the user's browser data is never touched), headless installed Chrome (`channel:'chrome'`, no
  download), fake camera (no hands), autoplay allowed; presses ▶, starts `P.seed({replace:true})`, types `P.quick()` during it
  (must be refused — the console guard), waits for the seed's end, then `P.quick()`/`P.all()` with a line per row, the summary
  lines and every "first differences" block; exit 0 only on PASS. Flags: `--quick` (default), `--all`, `--quick --all`,
  `--repeat N` (N fresh browsers, P.all each, then a table of every measured value with its margin — `meas()` in the probe,
  `res.measures`), `--eval file.js` (script in the page after the seed, prints JSON), `--headed` (off-screen window; worse: a drawn
  row went "tab hidden"), `--browser msedge`, `--limit-min M` (per P.all, default 15 since LAT2; seed 3, start 3), `--limit-quick M` (P.quick; NIGHT-0, 2026-10-16: without it 3 min × the SLOW FACTOR measured from P.quick's own rows — each finished row with a reference time in `SLOW_REF` (CPU-bound rows of an idle run, P.quick 112.9 s; LAT/CAM rows are time-based and left out) adds to observed / reference; from 3 rows on, factor = that ratio (1 below 1.2, at most 6) and the deadline moves with it; printed «machine speed: … slow factor …»; a busy Chrome outside the runner made rows 3–4× slower and the fixed 3 min failed). Full console →
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
- **Static checks — every slice:** `node tools/check-static.mjs` (syntax of every module; (12) the engine surface `src/engine/surface.js`; (13) rule #38; static import names vs exports with
  comments stripped; export lists declared; literal dynamic import targets present; no call to a declared/imported
  `function name(…)` with MORE arguments than parameters; no imported name CALLED inside a scope that shadows it; no name read or
  called that is not declared, imported or in the checker's `GLOBALS` (add new browser APIs there); REC1: the folder rule — a module
  under `src/song/` imports only `song/`, `core/`, `config.js` and (REC3) the pitch truth `scales.js` — and the import cycles (printed; a
  cycle through `song/` fails; CONTROLS a fake `song/store.js → recorder.js` and `song/history.js → audio.js` import); DAY run: (10) a
  WRITE to an imported binding (`x = …`, `x += …`, `x++`, `ns.x = …`) outside a local of that name fails; an import used only after a spread
  `...x` counts as used; (11) design tokens — see `tokens.css`; each with a CONTROL) and `node --check` on changed files. Report the result.
- **Read `src/` before changing anything**; re-verify every line number.
- ⛔ **Never insert a comment in the middle of an export list**; re-read every export list you touch.
- **Changed a signature or a stored field's meaning → find every reader**, positional callers included (rule #15); the probe module
  `src/scaleprobe.js` and `src/probes/*` are callers too. The report LISTS every positional caller of every changed function with its arguments.
- **Stay inside the slice.** Defects outside it are reported, not fixed.
- **Probes — speed:** `await P.quick()` = `P.all()` without the rows flagged `slow` (all-view sweeps T1, T2, T4b1, T4b3, T4b4, T5, T6b, F0,
  F3; "tracks: every one reachable"; LR1; AF2; AF6b; GOLD; SND-F1 live = offline and freeze parity; LAT2b worker = main thread); in it the rendering rows (MX1, MX2, render repeatability, renders serialized) use
  only the pitched track. Every rendering probe renders a SHORT window (`renderTrack(…, {short})`, `PROBE_SHORT` 1 s of song, tail
  ≤ 0.75 s) — never `freeze`/❄/`R.aud`. On demand only: `P.checkRepeat({evidence:true})`, `P.orderCheck()`, `await P.freezeCost()`.
  Rows flagged `drawn` (LAT1, LAT1b, LAT2a/b, ED7-fix2, tracks reachable, AR1, MX1, MX2, AR2) read "not checked: tab hidden" when frames don't come.
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
- **A timbre or kit** (TIM3, RUN 4) = a RECORD file `data/timbres/<id>.json` (`handsong/timbre` v1: family, engine — chord2 / tine / bass2 /
  subtractive / fm2 / ks / drumkit —, name, recipe, env, policies with today's role values) + its id APPENDED to `data/timbres/index.json` `order`, then
  `node tools/timbre-bundle.mjs` (the app loads the generated bundle; data row «TIM3 timbre records (core)» fails on a stale one); a new
  permanent `id` (rule #37; add it to the probe's pinned list `TIMBRE_IDS_PINNED`); the T5 bounds of `core/timbre.js` must accept it. APPEND
  only, never insert or reorder (positions are still the session handle). A solo timbre may now be appended (KS is told by the record's
  engine, `leadIsKs` — the «KS block is the tail» rule is retired). A kit's six rows name row synths of `drumkits.js` (`KIT_SYNTHS`) with
  their parameters; a new row SYNTH is code (+ its parameter list in `core/timbre.js KIT_SYNTHS`, bounded).
  Events store the timbre ID (TIM2). The editor lists timbres only via `audio.timbresOf(role)`.
- **A profile** (C0) = `data/profiles/<name>.json` (`handsong/profile` v1) + its name in `data/profiles/index.json` `order` + its id in
  `core/profile.js PROFILE_IDS` (pinned, rule #37); every narrowing field null in Full (Full changes nothing).
- **Thresholds / palette geometry** = `config.js`. Expression numbers are split: feature→channel in `gestures.EXPR_CFG`,
  channel→depth in `audio.EXPR_A` (gestures imports audio; the reverse would be a cycle).
- **A hand function** = `state.handFn` defaults + `ui.HANDFN_OPTS` + a branch on `S.fn`/zone in `gestures.js` + a dictionary key.
- **A lesson** = a record in `tutor.LESSONS` + step records + `tutor.<key>.prompt`/`.detail` keys; its `setup` must make its own steps
  completable from any previous lesson. Don't touch the engine.
- **A user-facing string** = a key in `DICTS.en` AND `DICTS.ru` (chrome), or an inline `L()`-shaped name next to the data.
- ⛳ **Design work** (user decisions, DAY run 2026-10-16; BACKLOG §7.19): ALL design — visual identity, interface, colours, fonts, icons,
  every design system — is done by Claude Code as our own authored work; fonts only under OFL or a similarly allowed licence (rule #32);
  icons drawn by us, NO icon libraries. Today's look stays (UI1b tokens + icon component); the new design comes later through the user's
  choice among proposals, AFTER the missing parts exist (effects constructor — redesigned once built —, expression lab, Calm, MIDI, audio
  in); inventory and principles: `docs/UX-INVENTORY.md`.
- **An interface glyph / icon** = a name in `src/icons.js` `ICONS` (by meaning), rendered by `icon(name)`, `{i:name}` in a dictionary
  string or `data-icon` in the markup — never the glyph itself (UI1b). **A colour / size / spacing / radius / shadow / layer** = a token in
  `tokens.css` first, then `var(--token)` (a CANVAS colour: a `--cv-*` token, drawn with `palette.cv('name')` — DRAW1b).
- **A behaviour gate** = a scale property + a predicate in `scales.js`, never a `tag`/index check.
- **A path that creates or removes events** (the editor is the third such path — insert and ED2 paste) = a NEW object (never a spread copy of an
  event — it would copy its permanent `id`, IDS1), stamp `tk`, keep `t` in absolute song beats, choose
  `a.v`/`a.k` that don't collide (`layerSlotTop`/`layerTakeTop`), remove with `compactEvents`, then `schedInvalidate` exactly once
  (sort first while recording); always write `a.vol` (rule #30).

## Hard rules — do not break these (full reasoning: archive, "Hard rules")
1. **The AudioContext is created only inside the start click** (`#startBtn`; `main.startApp`, shared by Play and Learn, creates it in
   the synchronous part of the click). An `OfflineAudioContext` is NOT covered (no speakers, no autoplay policy): `initAudio(mkCtx)`
   takes an optional context factory, passed only by `render.js` — not a loophole, don't "fix" it.
2. **Never hardcode frequencies, note tables or the octave `2`.** Pitch derives from `baseF()` and the current (or frozen) scale:
   `P^(iv/edo)` with `P=periodOf(s)`, or the cents overlay `2^(cents/1200)`.
3. **Pool oscillators start once and never stop** (solo/chord/bass gated by GainNodes; per-hit drums, metronome, drone LFO, frozen-track
   readers and — since SND-F1 — the strikes of a struck chord timbre («Firefly», `ffStrike`: a tine has no sustain to gate) are the
   one-shot exceptions). Lazily built solo voices and banks obey it: cached and gated, never torn down. The offline
   engine copy is a second instance of this rule (its own oscillators live as long as its own context).
4. **The master limiter stays — and since SND-F1b it is OURS** (user decision 2026-10-15). Live master path = `master` → `mGlue` (our
   compressor, off by default) → `mMake` (+2.31 dB = the old browser limiter's own makeup, measured — nothing got quieter) → `mLim` (our
   limiter `DYN_MASTER`: ceiling −1 dBFS, instant attack, hold 40 ms, release 150 ms; always on, no UI switch; exact identity below the
   ceiling) → output; `outLast` feeds the meter, the clip tap and the probe capture; `limRed` (posted by the worklet) = the mixer's
   reduction. ZERO delay (live capture: 0 frames). The browser's DynamicsCompressorNode (288 frames = 6.0 ms lookahead, measured) is built
   only as the FALLBACK without the dynamics worklet, and in the render copy (unheard: renders tap `master` before it — frozen buffers carry
   no master processing). ⛔ Don't bring the browser limiter back into the live path.
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
8. **The picture and the hands are ONE camera frame** (LAT2): each new camera frame is snapshotted once (an ImageBitmap) and detected at most
   once; the canvas draws the snapshot whose hands are current, overlays on top (`main.onHands` keeps it as `shown`; the live `<video>` only
   until the first frame is detected). ⛳ The only picture (user decision, LAT3: the dots must match the hand exactly) — the «Picture: live
   camera» test switch is deleted; don't bring it back.
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
32. ⛳ **Licence policy — the product must stay sellable as closed-source commercial software** (user's rule, STAGE 3 plan, 2026-10-14). Our
    code is written from published methods (papers, textbooks, standards) — never copied, translated or ported from another project's
    source. Third-party code, compiled-in libraries and models only under MIT, BSD (2/3-clause), Apache-2.0, ISC or zlib. ⛔ No GPL, AGPL or
    LGPL — JUCE's free tier, GPL Faust libraries and Essentia(.js) included — and no non-commercial or share-alike terms; any other licence
    (MPL, CC-BY-SA, unclear terms) needs the user's decision first. Every third-party item — code, models (the MediaPipe hand model), impulse
    responses, samples, fonts, images (AI-generated too, with the tool and its terms) — is an entry of the REGISTER `tools/licences.json`
    (LIC1: id, name, version, licence, class, use shipped / CDN / service / link / device / dev-only, source, urls / files / npm; a hosted
    service carries the user's `decision`; icons, images, fonts and glyphs carry the audit mark `replace`); `THIRD-PARTY-LICENSES.md` is
    GENERATED from it (`node tools/check-licences.mjs --write`, never by hand). The data runner's row «LIC1 licence register»
    (`tools/check-licences.mjs`) fails on an external URL, a non-code file (or anything under `vendor/`), an npm package (lock version and
    licence) or a Unicode symbol/emoji not in the register, on a refused licence, on an entry no longer used and on a stale document; five
    CONTROLS must fail. Names are generic, never trademarks («ladder filter», «plate reverb»). Plugin SDKs (VST3, AU, CLAP) and Ableton
    Link (GPL-2.0 or a separate licence from Ableton — only the latter) are checked when that stage starts. ⛳ Non-code material (user, Q13,
    2026-10-14): CC0, CC-BY 4.0 (with attribution), SIL OFL, our own work, AI-generated pictures (tool and terms recorded); refused: SA, NC,
    ND. Every icon, glyph, image and font today is marked «to be replaced by the user's own authored design» (Q13; the design lands before
    the Calm release through UI1's design tokens and icon component).
33. ⛳ **Privacy — images, sound and hand data never leave the device** (user, Q15, 2026-10-14; PRIV1). Frames are processed by the hand
    model inside the browser; the app sends no image, video, landmark stream, microphone sound or recording anywhere. Its own network use
    is limited to: loading itself and its assets (own origin; the pinned MediaPipe files of the register); links the person opens (feedback,
    donate); the named page-view counter of the Vercel deployment (Q14); a clip handed to the system share sheet by the person's tap; later,
    only by the person's explicit action, account sync and a numbers-only diagnostic report shown before sending (Q16). Enforcement: (a) the
    Content-Security-Policy `<meta>` first in `index.html` — `connect-src`/`script-src` list only our origin and the MediaPipe paths, no
    inline script (`src/va-stub.js`), `'wasm-unsafe-eval'` for the model, no `'unsafe-eval'`; a new host needs the user's decision, a
    register entry (LIC1 checks every CSP host lies over one) and the CSP line; (b) the static check's NETWORK GUARD (`NET_LISTED` in
    `tools/check-static.mjs`): every fetch / XHR / WebSocket / EventSource / sendBeacon / RTCPeerConnection / Worker / importScripts /
    addModule / share / window.open / SW register call and every external import is listed per module with its count and reason; (c) the
    browser runner fails on ANY CSP violation in its session and proves the policy by a fetch to an unlisted host that must be refused;
    (d) packs and other people's files are data only. The privacy notice is on the start card (`#privacyNote`, keys `privacy.*`).
34. ⛳ **A device-level camera control is never changed without restoring it** (user, CAM-FIX, 2026-10-15: «short exposure» left the user's
    UVC webcam dark — in Zoom too, after a reload). A webcam keeps exposure / white balance IN THE DEVICE. So: originals (`getSettings`) are
    saved before the first change; Off, leaving the page (pagehide / visibilitychange) and the next open RESTORE actively (automatic modes
    back to 'continuous', other touched controls to their originals — `core/camlight.restoreConstraints`). ⛳ 0a (user, 2026-10-15): the
    open-time repair touches ONLY what a test of ours left — a test that applies a device control writes a record (localStorage
    `handsong.camTest`: camera name and id, originals, touched keys; cleared once a restore went through); the next open of that camera
    restores those originals and clears it (meter: «… left by an unfinished test — restored»); without our record a manual setting (the
    person's own, from another app) is left alone. Chrome applies ONLY the camera controls of a set that holds one and
    ignores its format part (width, frameRate) — measured — so format and controls always go in two calls (`vision.applySet`).
35. ⛳ **Every beat ↔ time conversion of the transport goes through the clock** (REC4; the plan's #39 — rules number on from here):
    `transport/clock.js` `secPerBeat()`, `beatNow()`, `timeAt(b)`, `secOf(b)`, `beatsOf(s)` — one tempo segment today, a tempo map answers
    there later; each keeps the exact arithmetic of the sites it replaced. ⛔ No new `60/loop.bpm` or `loop.t0 + b·spb` outside it (the
    render's pinned tempo and the probes' independent checks excepted).
36. ⛳ **The core is pure** (FMT1; the plan's #35): `src/core/**` never touches the DOM, Web Audio, the camera, MIDI or the network and runs in
    node (the data runner's core rows); file formats (`core/format.js`) and ids (`core/registry.js`) live there.
37. ⛳ **Identity ≠ name ≠ position — permanent ids** (user, 2026-10-16; FMT1/TIM1; the plan's #36): every record that can outlive a session
    (timbres now; tunings, modes, effect presets, expression mappings, events, lane points next) has an id that NEVER changes — built-ins a
    readable fixed id (`chord.firefly`, kebab-case, dotted families), user records `u.<uuid>` (generated), pack records `<pack>/<name>`; the
    display name is editable, per language; the ORDER of a list is a separate per-user list of ids (reorder / hide / delete never touch a
    song). A built-in is HIDDEN, never destroyed (songs that use it always play); a user record may be removed. Songs will store the id AND
    a full copy of the record (SONG1): a missing id (deleted, another person's song) still plays from the copy and offers «add it back to my
    list». ⛔ Never rename or reuse an id (the TIM1 probe pins the list).
38. ⛳ **An engine submodule is STATELESS** (AUD1b, RUN 3 2026-10-16; strategist's review of the AUD1 plan): a module under `src/modules/**`
   or `src/engine/**` (the worklet processors in `src/engine/worklets/` excepted) keeps no state of its own — no top-level `let`/`var`, no
   top-level table it writes; everything made from a context or changing while playing (nodes, buffers, caches, the scratch of a voice being
   built) lives in the ENGINE CONTEXT `E` it receives as its first argument (`audio.engineCtx()`: getters/setters over that instance's
   variables, never a stale copy — R1). It imports only `core/`, `config.js`, `scales.js` and the stateless tree itself (`src/modules/**`,
   `src/engine/**`; widened at AUD2a — the effects use the timbre stages and `engine/fdn.js`). Why: such a module is imported
   ONCE and shared by the live engine and the render copy (`audio.js?render`) — only statelessness makes that safe. Pure data moves there only
   after it is proved pure (R2: no node, buffer, port or function; deep-frozen). Static check 13 (CONTROLS: a top-level let, a written table,
   a forbidden import caught; a clean module passes).

## Module map (short)
One line per module. Every name per module: `docs/NAME-INDEX.md` (grep it). The FULL map as it stood at DOC1, with every slice's
detail: `archive/CLAUDE-history.md` «Module map (full, moved at DOC1)» — grep it by module or slice name.
- **Root:** `index.html` markup only (CSP `<meta>` first, rule #33; `#privacyNote`); `tokens.css` THE design tokens (DOM + canvas `--cv-*`;
  static check 11); `style.css` all CSS through tokens; `manifest.json`/`sw.js` PWA (cache-free SW); `src/va-stub.js` counter stub.
- `src/config.js` (leaf) — thresholds, scheduler timings, pool sizes (POOL1: the chord pool grows on demand to `CHORD_POOL_N`, spares ahead), palette/FX geometry (`palSplitX`, `rectBandY`, `coverView`), volume
  curve (`volAmp`, `volVel`, `volFromOld`), `FX_VOL`, curve law of bends and lanes (`curveU`/`curveK`, `bendAt`/`bendSplit`, `bendPlan`).
- `src/state.js` — cross-cutting musical/layout state + setters (scale, tonic, `tonicCents`, `aRef`, `tunedFrom`, timbres, `handFn`,
  `voiceMode`, split + `phoneHalves`, registers, camera, editor/window); chain keys `chainKeyOf`/`trackChainKeyOf` (OPAQUE), `fxChains`.
- `src/hooks.js` — nullable callbacks for lower layers (`tutor`, `cleared`, `af`, `afRow`, `key`, `renderBusy` …).
- `src/i18n.js` — `LANGS`, `DICTS`, `t()`, `L()`, `applyI18n`. `src/icons.js` — THE icon component (`ICONS` by meaning, `icon`,
  `iconText`, `applyIcons`). `src/palette.js` — canvas colours from tokens (`cv(name)`, `ROLE_COL`).
- `data/` + `src/scaleload.js` — scale data as JSON (v1; manifest order = menu order); per-file validation; user files after built-ins.
- `data/timbres/` + `src/timbreload.js` (TIM3a) — timbre records (one file per timbre = the truth; the app loads the GENERATED
  `data/timbres.bundle.json` — `node tools/timbre-bundle.mjs` after any edit), checked by `core/timbre.js` (T5 bounds).
  `src/userstore.js`/`src/userfiles.js` — user files (IndexedDB, `u.<uuid>`), `window.U`.
- `src/scales.js` — teaching layer + PITCH TRUTH: builder → `TRADITIONS`, `TUNINGS`, `CHORD_FAM_SETS`, `SCALES`; `pitchHz`; `chordNotes`;
  memoised view `scaleView`/`CUR()`; key doors `viewKey`/`viewKeyC`; predicates; rect layout; theremin; `registerRecord`.
- `src/audio.js` — the Web Audio engine instance: pools, allocation, routing, drums, drone, metronome, `FX_FACTORY`, chain wiring, track
  level/pan, master (rule #4), frozen-track store/reader, probe/render helpers; `engineCtx()` → `E` (AUD1a); THE ENGINE CONTRACT
  `noteOn/noteSet/noteOff/bend/hit/drone` (ENG1); timbre tables + `timbresOf`/`timbreIdOf`/`timbreById` (TIM1).
- `src/engine/surface.js` — every audio.js export listed by caller (static check 12). `src/engine/fdn.js` — FDN reverb. `src/engine/
  worklets/` — `ks-worklet.js` (Karplus–Strong), `frz-worklet.js` (frozen store + reader), `dyn-worklet.js` (Glue / limiter),
  `probe-cap-worklet.js` (probes). Rule #38 exempts the worklets.
- `src/modules/timbres/` — stateless timbre builders (`stages.js`, `voice.js`, `fm.js`, `ks.js`, `subtractive.js`, `chord-voice.js`,
  `bass-voice.js`, `drumkits.js`, `tine.js` — the struck tine as a solo bank, C4a); `src/modules/effects/` — stateless effects (`param.js`, `reverb.js`, `delay.js`, `trem-mix.js`,
  `bright.js`, `glide.js`, `volume.js`, `forest.js`, `glue.js`). Both: rule #38, first argument `E`.
- `src/arrange.js` — arrangement data + pure generation (`PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `BASS_MODES`, `buildArrangement`).
- `src/recorder.js` — FACADE re-exporting `song/`, `transport/`, `freeze/`, `live/` + the wiring (`envWire`, `clockWire`, `schedWire`,
  `freezeWire`, `recWire`, `backingWire`) + session glue (lane prune/reset/delete, mixer setters, `laneHush`, drone sync, editor SESSION
  `editOpen`/`editClose`, snapshot steps + `histCommit` + `clearSong`, kinds snap/tab/master/key, `softAllOff`/`liveAllOff`/
  `trackResplice`, `backingFollowKey`, `onLoop`, `onUndo`, `seedTake`, `clearRec`, `panic`, `songSaveRec`/`songOpenApply`).
- `src/transport/clock.js` — transport state `loop`, song length, brace math, metre map, setters, ⛳ beat ↔ time (rule #35).
  `src/transport/scheduler.js` — replay cursors, `scheduleLayers`, chase, `fireNear`, metronome, `tick`, `startTransport`, `seekTo`.
- `src/freeze/registry.js` — frozen tracks by lane id, `freezeSig`/`freezeState`, watcher reads, install, 16-bit store, the AF2 swap, seams.
  `src/frzqueue.js` — auto-freeze watcher (AF3) + queue (AF1), loaded by `render.js`.
- `src/live/` — `eng.js` (`makeENG`, live `ENG`, pricing `evHz`), `record.js` (recording state, `noteSource`, `takeRoute`, `push`, W*
  calls), `capture.js` (capture sampling, fine automaton, effect playback, live isolation `setLiveIsolation`), `backing.js`
  (`loadArrangement`, `loadJam`, `clearJam`).
- `src/song/` (pure; imports only `song/`, `core/`, `config.js`, `scales.js` — REC1/REC3): `store.js` (`events`, `schedInvalidate`, birth
  order, ids `evIdFill`, `compactEvents`), `lanes.js` (track tables by lane id), `notes.js` (owner keys, `songNotes`/`songSegs`, `tyEq`),
  `history.js` (THE one history, `histKind` registry with each kind's FIELDS, VALUE tripwire `histHash`, journal `onApplied` — CMD1),
  `commands.js` (CMD1c: `histToJSON`/`histFromJSON` — steps by permanent ids), `edit-notes.js`, `edit-chords.js`, `edit-group.js`,
  `edit-insert.js`, `clipboard.js`, `quantise.js`, `transpose.js`, `sections.js`, `automation.js`, `capture.js` (capture records, lane
  law, lane-point ids), `env.js` (THE song layer's environment `ENV`), `file.js` (`songData`/`songPlan`/`songNeeds`; song file v7 — track ids).
  `recorder.cmdSet`/`cmdNote` (CMD1d) — the commands that are not history steps (mute, solo, arm, ⟳, brace, tempo; key, A4) tell the journal.
- `src/core/` (PURE, rule #36; runs in node): `format.js` (file envelope, migrations), `registry.js` (id spaces, `createRegistry`),
  `songfile.js` (song file parse/upgrade/check), `pack.js` (packs + offline licence keys, PACK1), `profile.js` (profile record, C0), `bus.js` (VIS1a), `engclass.js` (provisional power class, dropout rate — ENG2), `timbre.js` (the timbre record + T5 bounds — TIM3a), `latency.js`, `handsched.js` (search
  schedule), `camlight.js` (low light, camera restore), `dsp.js` (seeded, forest IR, dynamics curves), `canon.js` (canonical JSON + FNV — CMD1a).
- `src/autosave.js` — the song kept on the device (IndexedDB, last 5, `asTick`, `asFlush`).
- `data/profiles/` + `src/profile.js` (C0, RUN 6) — PROFILES (`profile.full` = today's app, `profile.calm`), checked by `core/profile.js`;
  `profileApply(id)` the one switch (saves the touched live state, restores it EXACTLY on Full; writes through ui.js doors `profileWire`);
  `profileBoot` (`?calm`). `src/edition.js` — `EDITION` ('dev' here; the release tool writes 'calm': only Calm, no switch).
- `src/core/bus.js` (VIS1a) — the visuals' event bus `BUS` (state `hands`, `handsView`, `picture`; ring `notes` from the LIVE engine contract).
  `src/views/stack.js` — the compositor (layers scene · background · instrument · overlay; modules scene, camera, backdrop, surface, hands).
- `src/views/scene/host.js` (VIS1b) — the scene host (`#scene` WebGL canvas only while a room shows; three.js r128 vendored in
  `vendor/three-r128/`, loaded lazily; levels full / reduced / minimal) + Calm's backgrounds `setBackground('forest'|'dark'|'camera')`;
  `views/scene/forest.js` (VIS1c) — the night forest room (tokens `--cv-forest-*`); `core/fireflies.js` — wild fireflies, ground, depth bands.
- `src/vision.js` — camera + detection path + frame pump (LAT2), low-light switches, camera restore (rule #34), robust start (0b).
  `src/handdet.js` — the detector (two models, worker-safe). `src/hand-worker.js` — classic worker.
- `src/gestures.js` — FACADE over `src/gestures/` (`features.js` pure gesture math, `expr.js` expression hand, `fxhand.js` the aim
  `fxParamsOf`, `looper.js`, `roles.js` stateless helpers, `hands.js` the state machine `HANDS`/`processHands`).
- `src/draw.js` — FACADE over `src/views/` (`common.js`, `camera.js`, `strip.js` strip/window/mixer + `loopView`, `roll.js` editor +
  `rollView`, `play.js` overlays + play screen).
- `src/ui.js` — menus, buttons, handlers, panels, editor shell, window, song Save/Open (`songSaveText`/`songOpenText`), tutorial helpers.
- `src/main.js` — composition root: `onHands`, `loop()`, `startApp()` (the one start path), `?probe` loading.
- `src/clip.js` — clip/audio recorder. `src/demo.js` — start-screen demo. `src/tutor.js` — lessons + step engine. `src/latmeter.js` —
  latency meter UI (LAT1–LAT3). `src/render.js` — offline render, freeze, `renderQueued`, console `R.*`. `src/songs.js` — demo songs
  (`data/songs/<name>.json`, SONG2).
- `src/scaleprobe.js` — the browser probe FACADE over `src/probes/<area>.js`; rows register themselves (`probes/rows.js` `row()`/
  `family()`). `src/probedata.js` + `tools/probe-data.mjs` — the node part.
- `tools/` — `check-static.mjs`, `probe-browser.mjs`, `probe-data.mjs`, `check-licences.mjs` + `licences.json`, `lex.mjs`, `ui-snap.mjs`,
  `pack-keygen.mjs`, `doc-split-check.mjs` (DOC1), `name-index.mjs` (generates `docs/NAME-INDEX.md`); `docs/prototypes/` = reference
  prototypes, not app code (licence use «reference», never shipped); `tools/listen/` = the Calm listening page (dev, RUN 6); `docs/design/calm/`
  = the Calm design proposals (docs only); prints `scales.before.json`, `song.print.json`, `gold.print.json`,
  `gesture.print.json`, `census.print.json`.
- Stale (removed) names to ignore: `docs/STALE-NAMES.md` (copied to the end of the generated `docs/NAME-INDEX.md`).

## Moved to `archive/CLAUDE-history.md` at DOC1 (grep by title; read only what the slice needs)
- «Module map (full, moved at DOC1)» — every module's detailed paragraph (AUD1a … IDS1, SONG1, AUTOSAVE1, PACK1 …).
- «Architecture» — one section per title:
  - Hand detection (LAT2) — each frame once, a cheaper search, main thread or worker
  - Screen model — one layout, optional split
  - Gesture model
  - Camera frame margin — cover fit; RAW vs REMAPPED coordinates
  - Camera switching & mirroring
  - Which hand drives depth
  - Rect model — note layout (switchable: `state.rectPref` 'auto'|'rect'|'rows')
  - Hand functions (`state.handFn`, options in `ui.HANDFN_OPTS`)
  - Voice modes — solo and bass are one melodic instrument, played two ways (V1–V4b; branch closed)
  - Typed chords — the palette
  - Behaviour properties (prefer these over tags/indices)
  - Music theory & pitch
  - Reference pitch (`aRef`) — one source
  - fixedKey — the tonic is a KEY in an anchored grid
  - Scheduler — look-ahead is a hard invariant
  - Metre & accent grouping
  - Chord readout
  - Chord brightness — the two-filter invariant
  - Brightness on every role
  - Looper hand
  - Audio engine (`initAudio`) — five chains into one master
  - Time, tracks and the recorder (slices S1…S3.5e)
  - The arrangement window (AR1) and mixer (MX1/MX2), names/colours/order (AR2)
  - The track editor — piano roll over the song (S4.0…S5.6, E0–E2, S0–S7, U1–U6, T5, O-4)
  - Effect ownership, capture and playback (O-0…O-4) and automation
  - Freeze — tracks rendered offline and played as buffers (F0–F5, A0–A2c, AF1–AF4, AF6b, AUTO-PROBE)
  - Probe rows that render or capture — tolerances and controls
  - Ear-testing a render (`R.aud` / `R.live` / `R.stop`) — start HERE when a frozen track sounds wrong
  - Clip / audio recording
  - Backing (🎵) — Jam or Drums only
  - The expression hand (solo, function `'expr'`)
  - The tutorial
  - Publication & PWA
  - Localisation
  - UI shell
- «Known limits» — design around them (network-per-role, takes through one chain, randomness, KS/Glue render pinning, Firefly
  one-shot, hand detection, low light, Night forest cost, AF5 cost, one history, A4/tempo re-freeze, transpose range, paste and key).
- «How to verify a change (full steps, moved at DOC1)» — the full text of steps 1–98 (index below).
- Old header lines of this file.

## How to verify a change
No unit tests. Claude Code runs the static check, `node tools/probe-data.mjs` and `node tools/probe-browser.mjs` per the probe budget,
fixes failures until PASS and quotes the verdict lines. The user does the steps below that need ears, a camera with hands, or a phone,
plus a manual `await P.seed({replace:true})` + `await P.all()` about weekly. Never report a change as done without naming the steps not
verified. Full text of every step: archive, "How to verify a change".
Step index (full text: `archive/CLAUDE-history.md` «How to verify a change (full steps, moved at DOC1)»; a new step is appended
THERE in full and here as one index entry):
- 1 Play · 2 Roles play · 3 Typed chords (Chromatic, 31-TET, 19-TET) · 4 Cents scales (Slendro/Pelog)
  5 Six menu sections in order (Common · Middle East · India… · 6 Split (landscape ◨) · 7 Rectangles · 8 Partch
  9 Theremin (hand function, solo and bass) · 10 Bohlen–Pierce · 11 Historical (Europe) · 12 India · 13 Camera switch 🔄 · 14 Cover
  15 Clip/audio 🎥/🎙 · 16 Backing 🎵 · 17 Hand functions · 18 A4 · 19 «Tuned from C (historical practice)» only on the five…
  20 Chord readout · 21 Metre (only empty + stopped) · 22 Timbres · 23 Chord hold + brightness · 24 Looper hand · 25 Subdivision
  26 Tutorial strip · 27 Expression hand · 28 Tutorial · 29 Localisation · 30 Note layout · 31 Polyphonic solo · 32 PWA · 33 Linear time
  34 Brace · 35 Chase · 36 Tracks · 37 Undo/delete/clear · 38 Stops · 39 Track editor · 40 Serial chain · 41 Capture and playback
  42 Per-pass closing · 43 Freezing (by itself since AF3/AF4) · 44 One role and timbre per track · 45 Voice modes and glide
  46 Smooth automation · 47 Volume on depth (VOL-4) · 48 Sevenths that add no note · 49 Dimmed rows (T5) · 50 Insert (U5) · 51 T7
  52 T7b chord modes · 53 Solo in the editor (S4) · 54 Theremin length and curve (S5) · 55 Tie pairs (S6)
  56 More tracks than the screen · 57 Arrangement window (AR1) · 58 Mixer (MX1) · 59 Pan (MX2) · 60 Fast probes · 61 Names
  62 Live reverb (LR1) · 63 Freeze queue (AF1) · 64 THE SWAP (AF2) · 65 16-bit frozen tracks (AF6b)
  66 The first attack of a track (AUTO-PROBE fix) · 67 Auto-freeze (AF3) · 68 No ❄ anywhere (AF4) · 69 Track ≠ live (AF5, rule #31)
  70 The first attack of a track after ▶ is still whole (ear… · 71 Several notes (ED1) · 72 Copy/paste/duplicate (ED2)
  73 Quantise (ED3) · 74 Transpose by degrees (ED4) · 75 Volume bars (ED5) · 76 Sections (ED6) · 77 Section rename (ED6 fix)
  78 One undo (ED7) · 79 Bend curve (OWN2) · 80 Brace after ✕ (ED7-fix) · 81 Bend glides and shapes (BEND-CURVE)
  82 Track into another mode (OWN1) · 83 Undo after ✕ (ED7-fix2) · 84 The key knob (TF2) · 85 Backing follows the key (TF2, Q3)
  86 Key change while recording (TF2, Q2) · 87 Transpose (TF3) · 88 Song Transpose moves the knob (TF3b) · 89 A4 / tempo re-freeze (TF4)
  90 «1/1 = G» (TF5) · 91 Privacy (PRIV1) · 92 Latency meter (LAT1) · 93 Firefly · 94 Hand detection (LAT2) · 95 Low light (LAT3)
  96 Camera settings come back (CAM-FIX, rule #34) · 97 Camera start (0b) · 98 Autosave (AUTOSAVE1) · 99 Open is one undo step (SONG3) · 100 Engine readouts (ENG2)
  101 Full ↔ Calm (C0) · 102 Calm sounds by ear (listening page) · 103 Calm design proposals · 104 Forest and the three backgrounds (VIS1c)
  105 GPU sharing: Forest vs Dark (R2; desktop + Poco M5)

## Language
- **Code comments:** existing ones are Russian; new and edited ones are short English (standing rule). Never translate en masse.
- **User-facing strings:** English-first, Russian alongside — interface chrome as keys in BOTH `DICTS.en` and `DICTS.ru` (`t()`,
  `data-i18n`); musical data names inline via `L()` in the three shapes. `es`/`de` prepared, deliberately not enabled (terminology unchecked).
- **Docs:** `HANDOFF.md` and this file in concise English; archives Russian verbatim; BACKLOG/UI-MAP Russian except sections edited later.
- Chat replies to the user: English (the terminal mangles Cyrillic); the strategist explains to the user in Russian.
