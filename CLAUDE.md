# CLAUDE.md

Guidance for Claude Code in this repository. SHORT by design (DOC1, 2026-10-17; DOC2, 2026-11-09): the standing working rules,
conventions and hard rules. Reference opened on demand: the module map `docs/core/MODULE-MAP.md`, the runners and the static check
`docs/core/TOOLS.md`, the verification-step index and the archive's titles `docs/core/STEPS.md`. Everything else — the full module map,
the architecture sections, known limits, the full text of every verification step — moved WORD FOR WORD to `archive/CLAUDE-history.md`
(grep it by section title). The long reasoning behind each section: `archive/CLAUDE-full.md`. State, open decisions, work order: `HANDOFF.md` (the index), then `docs/<track>/HANDOFF.md`.

## What this is
**Two apps, one engine.** **Handsong** (`apps/full/`; repo folder `air-synth-3`; old name only in doc titles): a gesture-controlled synthesizer and interactive
scales/tunings tutorial, entirely in the browser. **Handsong Night** (`apps/night/`, code id `night`): the first public release, a night forest played with the
hands. Both share `core/` (section «Two apps, one core»). Webcam + MediaPipe hand tracking; pinches play notes/chords/bass/drums/effects;
all sound is Web Audio. Handsong adds: a **linear multitrack recorder** (events in ABSOLUTE song beats on tracks; a take creates a track
or merges into an armed one; undo removes the last take; an optional bar-quantised repeat brace; many names still say `loop`),
**arrangements** (harmony/rhythm/bass as backing tracks), a **track editor** (piano roll + automation lane, own undo/redo), an
**expression hand**, a **looper hand**, and a **six-lesson tutorial** inside the live app.
- ES modules, loaded by `<script type="module" src="main.js">` in each `apps/<app>/index.html`. No build for development, no app dependencies, no unit tests.
  A page holds markup only; `core/legacy-ui/style.css` + `core/tokens.css` (+ `apps/night/night.css`) all CSS; the only external dependency is `@mediapipe/tasks-vision` from a CDN
  (`core/vision.js`). Each app has its own `manifest.json` + `sw.js` (PWA pair) and declares its profile and probes (`<link rel="handsong-profile">`, `<link rel="handsong-probes">`); root `index.html` is a redirect.
  Dev tools only: `tools/` (`package.json` with `playwright-core`, `tools/node_modules/` git-ignored).
- **One control model.** One role fills the screen (`phoneInstr`, role button). In **landscape** an optional **split**
  (`splitOn`) shows two roles side by side. Role is decided by ZONE (which half a hand pinches in); work inside a half is by
  POSITION. No hand-keyed role binding anywhere (`handRole` deleted); "effects on the left hand in the solo half" is derived
  from the default `handFn.ld.L='fx'` (hard rule #18). PC mode, `uiMode`, `drawPC` are gone.
- **Language:** code comments were Russian; new/edited comments are short English (standing rule). User-facing strings are
  English-first with Russian alongside (see "Language").

## Running / developing
- Serve over HTTPS or `localhost` (camera + wakeLock need a secure context; `file://` fails). Team default: VS Code Live Server at the repo root:
  `http://127.0.0.1:5500/apps/full/`, `http://127.0.0.1:5500/apps/night/`. Phone: a Vercel preview, or `npx cloudflared tunnel --url http://localhost:5500`, cache bust `?v=N`.
- Scale data are JSON files in `core/data/`, fetched at start. MediaPipe model/WASM/library come from CDNs — internet required. ⚠️ The apps
  do not work offline at all (SW caches nothing on purpose). Needs a webcam + WebGL. Audio starts only on the "▶ Play" click.
- `?probe` in the address loads the app's probes (`window.P`, guarded) and the render/ear tools (`window.R`) and user files (`window.U`). `P.all`/`P.quick` on Full, `P.night` on Night.
- ⛳ **Build and deploy** (SPLIT-2): `HANDSONG_APP=full|night node tools/build.mjs` writes one app into `dist/` (no other app, no tools). Previews (`VERCEL_ENV=preview` or `--probes`) keep `?probe`; production has no probes. `HANDSONG_EDITION=release` hides the development items. `vercel.json` is shared by two Vercel projects (`HANDSONG_APP=full`, `=night`); previews from `dev`. ⛳ Production branches differ (user, 2026-11-02): Full's project builds `main` (handsong.vercel.app); `handsong-night` builds `night-release`, a stopper branch that is a copy of the old `main`. So merging `dev` into `main` updates only Full's production. Neither new app goes public yet: `main` stays the old public version until the new Full is ready, and Night's public home (Vercel or another host) is not decided. Whenever a page, path or build changes: `node tools/smoke-paths.mjs` (`--build`: also the built trees).

## Standing working rules (apply to every slice; prompts don't repeat them)
- **What a new session reads:** this file, the index `HANDOFF.md` and the track's `docs/<track>/HANDOFF.md`. Open the archives, `docs/<track>/BACKLOG.md`, `docs/core/NAME-INDEX.md` (every code name by
  module, stale names) or long code files only for what the slice needs, by `grep`, not top to bottom.
- **Reference files, opened on demand (DOC2):** `docs/core/MODULE-MAP.md` (every module, one line), `docs/core/TOOLS.md` (the runners and
  the static check in full), `docs/core/STEPS.md` (the verification step index and the archive's section titles).
- ⛳ **`docs/core/NAME-INDEX.md` is GENERATED** (RUN 5): after adding, removing or renaming an export run `node tools/name-index.mjs --write`
  (the data row «NAME-INDEX current» fails otherwise); removed names are kept by hand in `docs/core/STALE-NAMES.md`.
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
- ⛳ **Slice records in the track's `docs/<track>/HANDOFF.md`** (user's rule, DOCS-EN): English, at most about 15 lines; details go to
  `archive/HANDOFF-history.md` (appended).
- **Docs:** the index `HANDOFF.md` stays under 3 KB, each `docs/<track>/HANDOFF.md` under ~20 KB; this file stays concise — keep every rule, put long reasoning in the archive.
  ⛳ DOC1 (user, 2026-10-17) and DOC2 (user, 2026-11-09): this file stays under ≈ 60 KB — rules and conventions; reference material lives in
  files opened on demand: `docs/core/MODULE-MAP.md` (a new module gets one line THERE), `docs/core/TOOLS.md` (the runners' flags, the
  static check's list), `docs/core/STEPS.md` (the step index, the archive's titles). New architecture / module / probe-row / known-limit
  detail and a new step's full text go to `archive/CLAUDE-history.md` under the matching section (moved word for word at DOC1; later
  slices update a stale line there in place AND copy the old line verbatim to its section «Superseded at DOC1»). Both splits are proved:
  `node tools/doc-split-check.mjs archive/CLAUDE-before-DOC1.md CLAUDE.md archive/CLAUDE-history.md docs/core/MODULE-MAP.md docs/core/TOOLS.md docs/core/STEPS.md archive/CLAUDE-DOC2-superseded.md`
  and `node tools/doc-split-check.mjs archive/CLAUDE-before-DOC2.md CLAUDE.md docs/core/MODULE-MAP.md docs/core/TOOLS.md docs/core/STEPS.md archive/CLAUDE-DOC2-superseded.md`
  — a line of this file rewritten in place keeps its old wording in `archive/CLAUDE-DOC2-superseded.md`.
  The `docs/<track>/BACKLOG.md` files and `docs/full/UI-MAP.md` stay Russian; any section you edit is rewritten in English. `archive/` keeps the old paths and product name.
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts), not routine slices (AF, ED, AR, MX, records). Planned uses: foundation plan
  (before stage 3), hearing the room (before 5), synthesis core (before 7), latency and hands, a periodic deep review + type-checking prep.
- **The data runner `tools/probe-data.mjs`** — the one exception to «never execute application code in node»: the data modules and the pure core
  rows only, against `core/data/`; it always ends in a verdict line (`[probe-data] PASS — …` / `NOT A PASS — …`; no verdict = failure) — quote
  it. Its rows and timings: `docs/core/TOOLS.md`.
- **The browser runner `tools/probe-browser.mjs`** (AUTO-PROBE; `npm install` once in `tools/`): its own server, a fresh headless Chrome per
  run (the user's browser data never touched), a fake camera; it ends in a verdict line and fails on any CSP violation, any request off the
  register's hosts, any storage name of the other app. Rules kept here: allow once in Claude Code `node tools/probe-browser.mjs:*` (Bash);
  it pauses auto-freeze for its whole session; `--app night` for Night (`P.night`); `--leak` when a slice touches rendering or offline
  contexts. Every flag, the hygiene on exit, the UI checks with real input: `docs/core/TOOLS.md`.
- **Static checks — every slice:** `node tools/check-static.mjs` and `node --check` on changed files; report the result. A new browser API
  goes into the checker's `GLOBALS`. What it checks — (1)–(16), each with a CONTROL: `docs/core/TOOLS.md`.
- **Read `core/` before changing anything**; re-verify every line number.
- ⛔ **Never insert a comment in the middle of an export list**; re-read every export list you touch.
- **Changed a signature or a stored field's meaning → find every reader**, positional callers included (rule #15); the probe module
  `tools/probes/full.js` and `tools/probes/*` are callers too. The report LISTS every positional caller of every changed function with its arguments.
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
- ⛳ **Console guard** (AUTO-PROBE): `window.P` = `api()` of the page's probe facade (`tools/probes/full.js`, `night.js`) — every probe function behind one lock; while any probe runs
  (P.seed included) another `P.*` call refuses in words ("P.seed is still running — wait for 'Now run P.all()'") and returns
  `{refused:true, why}`. Self-test + control in row "write path (funnels)". A direct `import()` of the module has no guard.
- **A tuning is read through its VIEW (F1):** `scales.tuningOf(s)` = the view's `tuningRec`. Never `TUNINGS[s.tuning]` in a pricing
  or label path (deleting/replacing a user tuning must never change recorded material).
- **User files are not probe material:** sweeps, `P.checkFiles()` and the snapshot cover built-ins only; `P.checkUserDelete()`
  installs temporary records and removes them.
- **Scale data snapshot (F0):** `P.dumpScales()` → `tools/prints/scales.before.json`; `await P.checkFiles()` compares the live registry with
  it value by value (`===`), grouped by field path; renewed ONLY via `await P.renewSnapshot(allowed)`, which refuses unless every
  difference is the declared change. `P.checkNames()` compares labels from naming schemes with frozen pre-F3 label functions.
- ⛳ **Manual checks — at most five** (user, NIGHT-2 stage 3, 2026-11-03): a report asks the user to check at most five things by hand, and only
  what a real hand, ears or the Poco can tell; everything else is checked by the runners and screenshots first.
- **Report format:** documents changed; files changed with a one-line reason; console lines and outputs; static-check result;
  probe verdict lines and fix rounds; what was left undone; docs found stale; the user's remaining steps (ear, camera, phone; at most five).

## Conventions — where a feature goes
- Terse, compact code; match the surrounding idiom. Add a feature in the module that owns it.
- **A scale (mode)** = a file `core/data/modes/<id>.json` + its id APPENDED at the end of `modes` in `core/data/index.json` (comments go to
  `core/data/README.md`; the loader's validator must accept it, else it is skipped). v1 shape: `tuning`, `degrees` (tuning indices),
  `root`, `anchor`, `chords`, `menu`; the builder in `scales.js` derives `edo`/`iv`/`cents` and flags — never write them by hand.
  Menu position by `trad`/`grp` (bucketed by `grp` key); addressed by stable `id` (`state.scaleId`, `scales.scaleById`).
  - non-equal (cents) scale: valid `edo`/`iv` stay as nominal structure; home `easia`/`india` (world), `europe` (historical 12-note),
    `exp` (Partch); `noChords`, or a ratio family set (pure-ratio branch), or `gridChords` + integer steps (fixed-grid branch); a
    historical fixed tuning also `fixedKey` (tonic = key; C-anchored cents recipe).
  - non-octave scale: `period:<n>`, equal within the period, section `exp`; never a `2` literal (`periodOf`); `noChords`, or a set in
    the tuning's own steps, or (only `chordBuild:'adaptive'`) a ratio set priced by the period branch.
- **A typed-chord family set** = `core/data/palettes/<id>.json` (`kind:'steps'|'ratios'`, ratios as strings) + id in `palettes` of
  `core/data/index.json`; integer steps for edo/`gridChords` scales, ratios for cents/period ratio scales.
- **A rhythm pattern** = one entry APPENDED at the end of `RHYTHMS` (ui holds positional `JR_BACK=0`/`JR_MAQSUM=1`). Declare `beats`
  and `sub:3` for triplets; grid exactly `beats*sub` cells (`gridOk`); written in ROWS (0 kick/1 snare/2 clap/3 hat; row 5 unused);
  volumes in the OLD drum scale (converted by `config.volFromOld('dr',…)`).
- **A timbre or kit** (TIM3, RUN 4) = a RECORD file `core/data/timbres/<id>.json` (`handsong/timbre` v1: family, engine — chord2 / tine / bass2 /
  subtractive / fm2 / ks / drumkit —, name, recipe, env, policies with today's role values) + its id APPENDED to `core/data/timbres/index.json` `order`, then
  `node tools/timbre-bundle.mjs` (the app loads the generated bundle; data row «TIM3 timbre records (core)» fails on a stale one); a new
  permanent `id` (rule #37; add it to the probe's pinned list `TIMBRE_IDS_PINNED`); the T5 bounds of `core/pure/timbre.js` must accept it. APPEND
  only, never insert or reorder (positions are still the session handle). A solo timbre may now be appended (KS is told by the record's
  engine, `leadIsKs` — the «KS block is the tail» rule is retired). A kit's six rows name row synths of `drumkits.js` (`KIT_SYNTHS`) with
  their parameters; a new row SYNTH is code (+ its parameter list in `core/pure/timbre.js KIT_SYNTHS`, bounded).
  Events store the timbre ID (TIM2). The editor lists timbres only via `audio.timbresOf(role)`.
- **A profile** (C0) = `apps/<app>/data/<name>.json` (`handsong/profile` v1), declared by the page (`<link rel="handsong-profile">`), + its id in `core/pure/profile.js PROFILE_IDS` (pinned, rule #37); every narrowing field null in Full (Full changes nothing).
- **Night's per-timbre settings** (RUN 8; the user: Full exactly as at RUN 7) live in the PROFILE, never in a timbre record: `levels` {id: dB}
  (`audio.setTimbreTrim`), `voices` {id: strikes} (`audio.setNightStrikes` — the struck banks take Night's cheaper strike + the cap only while
  set; Full builds RUN 7's strike exactly, row «FULL untouched»), `volume` {left} (the amplitude floor of the hand's horizontal,
  `state.setVolFloor`). All set by the Night face; Full and every render copy have none.
- **The lean path** (CORE-3, `audio.setLeanPath`, Night's face): an app takes what it never plays out of the graph by disconnecting, off by default; a chain gaining drive, brightness or tremolo needs its switch off first (row «NIGHT lean path»).
- **Thresholds / palette geometry** = `config.js`. Expression numbers are split: feature→channel in `gestures.EXPR_CFG`,
  channel→depth in `audio.EXPR_A` (gestures imports audio; the reverse would be a cycle).
- **A hand function** = `state.handFn` defaults + `ui.HANDFN_OPTS` + a branch on `S.fn`/zone in `gestures.js` + a dictionary key.
- **A lesson** = a record in `tutor.LESSONS` + step records + `tutor.<key>.prompt`/`.detail` keys; its `setup` must make its own steps
  completable from any previous lesson. Don't touch the engine.
- **A user-facing string** = a key in `DICTS.en` AND `DICTS.ru` (chrome), or an inline `L()`-shaped name next to the data.
- **A stored name in shared code** (CORE-11) = through `nsKey` / `nsDb` (`core/storens.js`), so two apps on one origin never read each other's
  settings or songs; only a device fact stays shared (camera restore record, engine benchmark). The runner's storage census checks it.
- ⛳ **Design work** (user decisions, DAY run 2026-10-16; BACKLOG §7.19): ALL design — visual identity, interface, colours, fonts, icons,
  every design system — is done by Claude Code as our own authored work; fonts only under OFL or a similarly allowed licence (rule #32);
  icons drawn by us, NO icon libraries. Today's look stays (UI1b tokens + icon component); the new design comes later through the user's
  choice among proposals, AFTER the missing parts exist (effects constructor — redesigned once built —, expression lab, Night, MIDI, audio
  in); inventory and principles: `docs/full/UX-INVENTORY.md`.
- **An interface glyph / icon** = a name in `core/icons.js` `ICONS` (by meaning), rendered by `icon(name)`, `{i:name}` in a dictionary
  string or `data-icon` in the markup — never the glyph itself (UI1b). **A colour / size / spacing / radius / shadow / layer** = a token in
  `core/tokens.css` first, then `var(--token)` (a CANVAS colour: a `--cv-*` token, drawn with `palette.cv('name')` — DRAW1b).
- **A behaviour gate** = a scale property + a predicate in `scales.js`, never a `tag`/index check.
- **A path that creates or removes events** (the editor is the third such path — insert and ED2 paste) = a NEW object (never a spread copy of an
  event — it would copy its permanent `id`, IDS1), stamp `tk`, keep `t` in absolute song beats, choose
  `a.v`/`a.k` that don't collide (`layerSlotTop`/`layerTakeTop`), remove with `compactEvents`, then `schedInvalidate` exactly once
  (sort first while recording); always write `a.vol` (rule #30).

## Hard rules — do not break these (full reasoning: archive, "Hard rules")
1. **The AudioContext is created only inside the start click** (`#startBtn`; `boot.startApp`, shared by Play and Learn, creates it in
   the synchronous part of the click). An `OfflineAudioContext` is NOT covered (no speakers, no autoplay policy): `initAudio(mkCtx)`
   takes an optional context factory, passed only by `render.js` — not a loophole, don't "fix" it.
2. **Never hardcode frequencies, note tables or the octave `2`.** Pitch derives from `baseF()` and the current (or frozen) scale:
   `P^(iv/edo)` with `P=periodOf(s)`, or the cents overlay `2^(cents/1200)`.
3. **Pool oscillators start once and never stop** (solo/chord/bass gated by GainNodes; per-hit drums, metronome, drone LFO, frozen-track
   readers and — since SND-F1 — the strikes of a struck chord timbre («Firefly», `ffStrike`: a tine has no sustain to gate) are the
   one-shot exceptions; since C4a / RUN 7 also the strikes of the struck SOLO engines `tine` and `modal`, and their mallet-noise bursts).
   Lazily built solo voices and banks obey it: cached and gated, never torn down (the RUN 7 `breath` bank too). The offline
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
   once; the canvas draws the snapshot whose hands are current, overlays on top (`boot.onHands` keeps it as `shown`; the live `<video>` only
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
    the Night release through UI1's design tokens and icon component).
33. ⛳ **Privacy — images, sound and hand data never leave the device** (user, Q15, 2026-10-14; PRIV1). Frames are processed by the hand
    model inside the browser; the app sends no image, video, landmark stream, microphone sound or recording anywhere. Its own network use
    is limited to: loading itself and its assets (own origin; the pinned MediaPipe files of the register); links the person opens (feedback,
    donate); the named page-view counter of the Vercel deployment (Q14); a clip handed to the system share sheet by the person's tap; later,
    only by the person's explicit action, account sync and a numbers-only diagnostic report shown before sending (Q16). Enforcement: (a) the
    Content-Security-Policy `<meta>` first in each page (`apps/<app>/index.html`, the same line, static check 16) — `connect-src`/`script-src` list only our origin and the MediaPipe paths, no
    inline script (`core/va-stub.js`), `'wasm-unsafe-eval'` for the model, no `'unsafe-eval'`; a new host needs the user's decision, a
    register entry (LIC1 checks every CSP host lies over one) and the CSP line; (b) the static check's NETWORK GUARD (`NET_LISTED` in
    `tools/check-static.mjs`): every fetch / XHR / WebSocket / EventSource / sendBeacon / RTCPeerConnection / Worker / importScripts /
    addModule / share / window.open / SW register call and every external import is listed per module with its count and reason; (c) the
    browser runner fails on ANY CSP violation in its session and proves the policy by a fetch to an unlisted host that must be refused;
    (d) packs and other people's files are data only. The privacy notice is on the start card (`#privacyNote`, keys `privacy.*`).
34. ⛳ **A device-level camera control is never changed without restoring it** (user, CAM-FIX, 2026-10-15: «short exposure» left the user's
    UVC webcam dark — in Zoom too, after a reload). A webcam keeps exposure / white balance IN THE DEVICE. So: originals (`getSettings`) are
    saved before the first change; Off, leaving the page (pagehide / visibilitychange) and the next open RESTORE actively (automatic modes
    back to 'continuous', other touched controls to their originals — `core/pure/camlight.restoreConstraints`). ⛳ 0a (user, 2026-10-15): the
    open-time repair touches ONLY what a test of ours left — a test that applies a device control writes a record (localStorage
    `handsong.camTest`: camera name and id, originals, touched keys; cleared once a restore went through); the next open of that camera
    restores those originals and clears it (meter: «… left by an unfinished test — restored»); without our record a manual setting (the
    person's own, from another app) is left alone. Chrome applies ONLY the camera controls of a set that holds one and
    ignores its format part (width, frameRate) — measured — so format and controls always go in two calls (`vision.applySet`).
35. ⛳ **Every beat ↔ time conversion of the transport goes through the clock** (REC4; the plan's #39 — rules number on from here):
    `transport/clock.js` `secPerBeat()`, `beatNow()`, `timeAt(b)`, `secOf(b)`, `beatsOf(s)` — one tempo segment today, a tempo map answers
    there later; each keeps the exact arithmetic of the sites it replaced. ⛔ No new `60/loop.bpm` or `loop.t0 + b·spb` outside it (the
    render's pinned tempo and the probes' independent checks excepted).
36. ⛳ **The core is pure** (FMT1; the plan's #35): `core/pure/**` never touches the DOM, Web Audio, the camera, MIDI or the network and runs in
    node (the data runner's core rows); file formats (`core/pure/format.js`) and ids (`core/pure/registry.js`) live there.
37. ⛳ **Identity ≠ name ≠ position — permanent ids** (user, 2026-10-16; FMT1/TIM1; the plan's #36): every record that can outlive a session
    (timbres now; tunings, modes, effect presets, expression mappings, events, lane points next) has an id that NEVER changes — built-ins a
    readable fixed id (`chord.firefly`, kebab-case, dotted families), user records `u.<uuid>` (generated), pack records `<pack>/<name>`; the display name is editable, per language; the ORDER of a list is a separate per-user list of ids (reorder / hide / delete never touch a
    song). A built-in is HIDDEN, never destroyed (songs that use it always play); a user record may be removed. Songs will store the id AND
    a full copy of the record (SONG1): a missing id (deleted, another person's song) still plays from the copy and offers «add it back to my
    list». ⛔ Never rename or reuse an id (the TIM1 probe pins the list). One recorded exception (user, SPLIT-2): the Night profile's id became `profile.night`; no song, file or storage key stored a profile id.
38. ⛳ **An engine submodule is STATELESS** (AUD1b, RUN 3 2026-10-16; strategist's review of the AUD1 plan): a module under `core/modules/**`
   or `core/engine/**` (the worklet processors in `core/engine/worklets/` excepted) keeps no state of its own — no top-level `let`/`var`, no
   top-level table it writes; everything made from a context or changing while playing (nodes, buffers, caches, the scratch of a voice being
   built) lives in the ENGINE CONTEXT `E` it receives as its first argument (`audio.engineCtx()`: getters/setters over that instance's
   variables, never a stale copy — R1). It imports only `pure/`, `config.js`, `scales.js` and the stateless tree itself (`core/modules/**`,
   `core/engine/**`; widened at AUD2a — the effects use the timbre stages and `engine/fdn.js`). Why: such a module is imported
   ONCE and shared by the live engine and the render copy (`audio.js?render`) — only statelessness makes that safe. Pure data moves there only
   after it is proved pure (R2: no node, buffer, port or function; deep-frozen). Static check 13 (CONTROLS: a top-level let, a written table,
   a forbidden import caught; a clean module passes).

39. ⛳ **Two apps, one core** (user, SPLIT-1): the section below binds every run. Its rules are numbered there; quote them as «core rule N».

## Two apps, one core (user, SPLIT-1, 2026-11-01)
⛳ Handsong (`apps/full/`) and Handsong Night (`apps/night/`, code id `night`) share `core/`. Every run belongs to ONE track: CORE-n, FULL-n or NIGHT-n.

1. **Only code used by both apps goes in `core/`.**
2. **No UI in `core/`.** Exception: `core/legacy-ui/`, inherited from the split. It only shrinks; no new file, no new feature there beyond what
   keeps both apps working. New UI goes in the app.
3. **App-only features live in the app folder.** Apps import only their own folder and `core/`, never each other. `core/` imports nothing from
   `apps/` or `tools/` (static check 14).
4. **A new core capability is an opt-in option that defaults to the old behaviour.** With the option absent, every node, value and order stays
   exactly as before — GOLD, census and both «untouched» rows prove it.
5. **Changing existing core behaviour needs a new option or a dedicated CORE run.** Never as a side effect of a FULL or NIGHT run. If a track run
   finds it needs this, it stops that part and reports; the change becomes its own CORE-n.
6. **Every core change runs both apps' checks:** static, data, `node tools/probe-browser.mjs --quick` and `node tools/probe-browser.mjs --app night`; `--all` on Full when it touches sound,
   rendering, recording or tuning data. A report quotes both verdicts and the tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`).
7. **A core module used by only one app moves into that app** (in the run that makes it so). Existing cases are listed in `core/DEBT.md`, which
   only shrinks (static check 15).
8. **`core/` names no product.** No `night` or `full` in new core names, options or strings; an option names what it does (`strikeCaps`, not
   `nightStrikes`). Existing cases are on the debt list.
9. **Baselines are per track.** A FULL run never renews a core or night print; a NIGHT run never renews a core or full print. A renewal is declared,
   with every other case compared first. `FULL untouched` and `NIGHT untouched` must hold in every run.
10. **Every asset load works from any folder and offline-ready:** `new URL(..., import.meta.url)` in code; page-level files (`manifest.json`,
    `sw.js`, icons) relative to the page. `tools/smoke-paths.mjs` runs whenever a page, path or build changes.
11. **Rules #32 (licences) and #33 (privacy) apply to both apps,** one register, the same CSP line in both pages (static check 16).
12. **Never run git, not even read-only** (unchanged). Each pure file move is committed by the user before the moved files are edited.

Run names and logs: `CORE-n`, `FULL-n`, `NIGHT-n`, counted separately (`NIGHT-0` is history; Night starts at `NIGHT-1`). If a NIGHT or FULL run needs a core change, that part is a small `CORE-n` with its own record and both apps' checks. Each log entry in `docs/<track>/WORK-LOG.md` starts: track, number, date, tree hashes before and after.

## Module map
One line per module: `docs/core/MODULE-MAP.md` (DOC2; open it when the slice touches a module you don't know). Every name per module:
`docs/core/NAME-INDEX.md` (generated). In short: `core/` the shared engine (pure laws in `core/pure/`, stateless engine submodules in
`core/modules/` and `core/engine/`, the song layer in `core/song/`, the shrinking shared UI in `core/legacy-ui/`); `apps/full/` Handsong;
`apps/night/` Handsong Night (its rooms, music bed, shell); `tools/` the runners and checks (`docs/core/TOOLS.md`), `tools/probes/` the rows.

## The archive
`archive/CLAUDE-history.md` holds what DOC1 moved out word for word: the full module map, the architecture sections, known limits, the full
text of every verification step. Its section titles: `docs/core/STEPS.md` (grep the archive by title; read only what the slice needs).

## How to verify a change
No unit tests. Claude Code runs the static check, `node tools/probe-data.mjs` and `node tools/probe-browser.mjs` per the probe budget,
fixes failures until PASS and quotes the verdict lines. The user does the steps that need ears, a camera with hands, or a phone, plus a
manual `await P.seed({replace:true})` + `await P.all()` about weekly. Never report a change as done without naming the steps not verified.
The step index, one line per step: `docs/core/STEPS.md`; the full text of every step: `archive/CLAUDE-history.md` «How to verify a change
(full steps, moved at DOC1)». A new step: its full text appended THERE, its index line in `docs/core/STEPS.md` (DOC2).

## Language
- **Code comments:** existing ones are Russian; new and edited ones are short English (standing rule). Never translate en masse.
- **User-facing strings:** English-first, Russian alongside — interface chrome as keys in BOTH `DICTS.en` and `DICTS.ru` (`t()`,
  `data-i18n`); musical data names inline via `L()` in the three shapes. `es`/`de` prepared, deliberately not enabled (terminology unchecked).
- **Docs:** `HANDOFF.md`, the track handoffs and this file in concise English; archives Russian verbatim; backlogs and UI-MAP Russian except sections edited later.
- Chat replies to the user: English (the terminal mangles Cyrillic); the strategist explains to the user in Russian.
