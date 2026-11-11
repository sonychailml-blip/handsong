# The runners and the static check — moved out of CLAUDE.md at DOC2 (2026-11-09)

Opened on demand (CLAUDE.md «Standing working rules» keeps their rules and points here). The three bullets below are CLAUDE.md's
word for word (`tools/doc-split-check.mjs` proves it); keep them current when a runner or the checker changes.

- **The data runner `tools/probe-data.mjs`** is the one exception to "never execute application code in node": it runs only the
  data modules (`probedata.js` → scales/state/i18n and their imports) against `core/data/`, prints a line per check and ALWAYS a final
  verdict (`[probe-data] PASS — …` / `NOT A PASS — …`, exit 0/1; no verdict = failure). 40 s – 2 min. Quote its verdict. Its last row
  «LIC1 licence register» runs `tools/check-licences.mjs` (text only; alone: `node tools/check-licences.mjs`, ≈ 2 s); the row «LAT1
  latency stats (core)» runs `core/pure/latency.js` (also «LAT2 search schedule (core)» `core/pure/handsched.js`, «LAT3 low light (core)»
  `core/pure/camlight.js`) — the CORE is pure by design (no DOM, Web Audio, camera, network) and may run in node.
- **The browser runner `tools/probe-browser.mjs`** (AUTO-PROBE; `npm install` once in `tools/`): own static server on a free port,
  fresh temporary profile per run (the user's browser data is never touched), headless installed Chrome (`channel:'chrome'`, no
  download), fake camera (no hands), autoplay allowed; presses ▶, starts `P.seed({replace:true})`, types `P.quick()` during it
  (must be refused — the console guard), waits for the seed's end, then `P.quick()`/`P.all()` with a line per row, the summary
  lines and every "first differences" block; exit 0 only on PASS. Flags: `--quick` (default), `--all`, `--quick --all`,
  `--repeat N` (N fresh browsers, P.all each, then a table of every measured value with its margin — `meas()` in the probe,
  `res.measures`), `--eval file.js` (script in the page after the seed, prints JSON), `--headed` (off-screen window; worse: a drawn
  row went "tab hidden"), `--browser msedge`, `--app full|night` (the page; night: no seed, no UI song checks), `--night` (`P.night`), `--root DIR` (a built preview, `tools/build.mjs --probes`), `--json FILE` and `--dump NAME FILE` (results for compares), `--stress-not-judged`, `--limit-min M` (per P.all, default 15 since LAT2; seed 3, start 3), `--limit-quick M` (P.quick; NIGHT-0, 2026-10-16: without it 3 min × the SLOW FACTOR measured from P.quick's own rows — each finished row with a reference time in `SLOW_REF` (CPU-bound rows of an idle run, P.quick 112.9 s; LAT/CAM rows are time-based and left out) adds to observed / reference; from 3 rows on, factor = that ratio (1 below 1.2, at most 6) and the deadline moves with it; printed «machine speed: … slow factor …»; a busy Chrome outside the runner made rows 3–4× slower and the fixed 3 min failed). Full console →
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
- **Static checks — every slice:** `node tools/check-static.mjs` (syntax of every module; (12) the engine surface `core/engine/surface.js`; (13) rule #38; (14) boundaries: core imports no app or tool, an app only itself and core, a probe suite only core, its own suite, the core suite and its app; (15) `core/legacy-ui/` and `core/DEBT.md` only shrink; (16) every id a module reads exists on each page that loads it, the CSP line identical on both; static import names vs exports with
  comments stripped; export lists declared; literal dynamic import targets present; no call to a declared/imported
  `function name(…)` with MORE arguments than parameters; no imported name CALLED inside a scope that shadows it; no name read or
  called that is not declared, imported or in the checker's `GLOBALS` (add new browser APIs there); REC1: the folder rule — a module under `core/song/` imports only `song/`, `pure/`, `config.js` and (REC3) the pitch truth `scales.js` — and the import cycles (printed; a
  cycle through `song/` fails; CONTROLS a fake `song/store.js → recorder.js` and `song/history.js → audio.js` import); DAY run: (10) a
  WRITE to an imported binding (`x = …`, `x += …`, `x++`, `ns.x = …`) outside a local of that name fails; an import used only after a spread
  `...x` counts as used; (11) design tokens — see `core/tokens.css`; each with a CONTROL) and `node --check` on changed files. Report the result.
- **`tools/ui-snap.mjs` for the forest** (NIGHT-8): `--forest` the forest's screens (`f-*`), `--level full|reduced` the picture level (Detailed / Standard, stored before the page loads), `--fast` only the start and the laptop-sized and close views; each forest screen also saves `<name>-room.png`, the room's own frame without the interface (the host's `sceneShotDbg`). The close views (`f-close-*`) use the room's capture door `viewDbg({ pos, look })` at full pixel ratio. NIGHT-9: `--ground baked|scan` draws the chosen bare floor (forest.js `forestGroundDbg`, read from a page global set before the room opens — captures only); close views `f-close-bank` and `f-close-foot`. Captures go to `tools/.ui-snap/<tag>/` (git-ignored).
- **`tools/brook-render.mjs`** (NIGHT-8, dev): `node tools/brook-render.mjs [--rec FILE.wav]` writes `tools/.listen/brook-a-synth.wav` (the shipped stream law, 40 s) and, with a recording, `brook-b-recording.wav` (looped with an equal-power join, the same RMS); prints RMS, peak, bubbles, cost and the envelope's longest self-similarity. NIGHT-8b: also `brook-c-shipped.wav` — the shipped recording (`apps/night/rooms/forest/sound/stream.mp3`, decoded by ffmpeg, which must be on the PATH) through the app's grain law at the recipe's level, and the level factor that matches the synthesis's K-like loudness dry.
