# SPLIT-PLAN — two apps, one engine (SPLIT-1, 2026-11-01)

Plan only: nothing was moved, renamed or edited in this run. Every number comes from reading the current tree (imports computed by a
throw-away script, not from memory). Re-verify line numbers before editing; they are correct for the tree as of RUN 9.

Names used below: **Full** = today's `profile.full`, keeps the name Handsong. **Night** = today's Calm, product name Handsong Night, code id
`night`. "Old name" = calm/Calm/CALM.

## 0. The five findings that shape this plan

1. **Today there is no separation between Calm and the Full UI.** `main.js` statically reaches 110 modules. Calm's shell is imported by
   `ui.js` (`ui.js:60`), and Calm runs *on top of* the Full UI: `ui.js` (3147 lines) wires 170 element ids at load, so the Calm page needs the
   Full markup present, hidden by CSS (`body.calm`). Calm's playing path also runs through `recorder.js`, which pulls in all of `song/`,
   `transport/`, `freeze/`, `live/`, and `views/play.js` imports `views/roll.js` and `views/strip.js`. **So the rule "no UI in core/" cannot
   hold on day one without rewriting behaviour, which SPLIT-2 forbids.** The plan adds one folder, `core/legacy-ui/`: temporary, shrink-only,
   checked by a tool. Later FULL-n and NIGHT-n runs empty it. This is the one real change to your target layout (Q1).
2. **`src/core/` collides with the new `core/`.** Moved as it is, it becomes `core/core/`. It becomes `core/pure/` (rule #36: pure code). That
   is 69 path strings in 39 files, done in its own mechanical step.
3. **Two Vercel projects means two origins.** A storage-key migration can only run inside one origin. On Vercel, Night starts on a new
   origin and cannot read settings saved under `handsong.vercel.app`. The migration in §5.3 covers same-origin cases only; since Calm has
   not been released, the only real loss is on your own test devices (Q7).
4. **"Night" is already a word in this repo, with other meanings.** Full's effect "Night forest", the colour tokens `--c-night-*` and
   `--cv-night-*`, `core/night.js`, the bus topic `calmNight` (a blind replace gives `nightNight`), `NIGHT-LOG.md`, the runner fix `NIGHT-0`,
   the pack fixture `night-mode`. The rename needs a collision table (§5.2), not a blind replace.
5. **GitHub Pages may still serve this repo from its root.** The archive names `sonychailml-blip.github.io/handsong/`. Moving `index.html`
   breaks that site unless the root keeps a small redirect. The plan keeps one (§6.3, Q6).

## 1. Current structure

```
index.html  style.css  tokens.css  manifest.json  sw.js        one page, one stylesheet set, PWA pair
src/        161 modules, 40,006 lines (shipped 30,421 lines / 2.59 MB; probes 9,585 lines / 0.92 MB)
data/       172 files: modes 74, timbres 60 + bundle, tunings 18, palettes 8, chordmodes 4, profiles 3, songs 1, index, menu, README
fonts/      Andika, Literata (woff2 + OFL)      icons/  3 PNG      vendor/  three-r128
tools/      runners, checks, prints (baselines), listen/ page, licences.json, node_modules (ignored), .ui-snap (ignored)
docs/       15 files      archive/  8 files
CLAUDE.md  HANDOFF.md  BACKLOG.md  UI-MAP.md  WORK-LOG.md  NIGHT-LOG.md  THIRD-PARTY-LICENSES.md
```

**Entry page:** one, `index.html`: CSP meta first, `tokens.css`, `style.css`, `src/va-stub.js`, `/_vercel/insights/script.js`,
`src/main.js`. There is no `vercel.json` and no build step.

**How Calm is selected today (four separate switches):**

| Switch | Where | What it does |
|---|---|---|
| `EDITION='dev'` constant | `edition.js:3` | `'dev'` = every profile reachable; a planned release tool would write `'calm'` (no such tool exists yet) |
| `?calm` in the address, read at boot | `profile.js:83 profileBoot`, called in `main.js:140` after the camera opens | applies `profile.calm` |
| `?calm` read again at module load | `calmshell.js:121 BOOT` | `body.calm-boot`, the Calm start card, `#calmBegin` |
| Dev buttons | `#profFull`/`#profCalm` (`ui.js:3129`), `#calmToFull` (`ui.js:3091`) | live round trip Full ↔ Calm; saved state restored exactly |

Records: `data/profiles/{index,full,calm}.json`, loaded by top-level await in `profile.js`. `doors` in `ui.js:3094` write state; `face` in
`ui.js:3110` sets `body.calm` and calls `calmShellFace`.

## 2. File-by-file mapping

❓ marks an uncertain placement. **D** = in core only because something blocks its move today; it goes on the debt list (§3.3).

### 2.1 Root

| Current | New | Note |
|---|---|---|
| `index.html` | `apps/full/index.html` + `apps/night/index.html` (copy) | Both keep the shared chrome ui.js needs. Full drops the shell markup (index.html:565–612) and the start-card Calm parts (43–53). Night keeps all, hidden as today. A static check keeps ids in sync |
| (new) `index.html` | tiny redirect to `apps/full/` | Keeps GitHub Pages and a bare Live Server root working. Not part of `dist/` |
| `style.css` | lines 1–552 and 557–559 → `core/legacy-ui/style.css`; lines 553–556, 560–689 → `apps/night/night.css` | The Calm block is already contiguous at the end, so cascade order holds if `night.css` loads last. `#bgRow` and `#scene` rules stay shared |
| `tokens.css` | `core/tokens.css`; the `--calm-*` block + `@font-face` (lines 251–283) → top of `apps/night/night.css` | `--cv-calm-*` and `--cv-forest-*` stay in core while legacy `views/play.js` reads them (D) |
| `manifest.json` | `apps/full/manifest.json`, `apps/night/manifest.json` | Night: new name, short_name, description |
| `sw.js` | `apps/full/sw.js`, `apps/night/sw.js` | Same no-op; the copy lands at the root of `dist/` |
| `CLAUDE.md` | stays | + core rules (§12), updated paths |
| `HANDOFF.md` | stays as a short index → `docs/{core,full,night}/HANDOFF.md` | §8 |
| `BACKLOG.md` | `docs/{core,full,night}/BACKLOG.md` | §8 |
| `UI-MAP.md` | `docs/full/UI-MAP.md` | no old name inside |
| `WORK-LOG.md`, `NIGHT-LOG.md` | `archive/WORK-LOG-before-split.md`, `archive/NIGHT-RUN-LOG-2026-10.md` | frozen word for word; the second name removes the collision |
| `THIRD-PARTY-LICENSES.md` | stays (generated); build copies it to `dist/` | one register |
| `.gitignore` | stays | + `dist/` |
| (new) `vercel.json`, `tools/build.mjs` | | §6 |

### 2.2 `src/` top level

| Current | New | Note |
|---|---|---|
| `main.js` | **split:** `core/legacy-ui/boot.js` (loop, onHands, startApp) + `apps/full/main.js` + `apps/night/main.js` | Entries keep today's import order |
| `calmshell.js` | `apps/night/shell.js` | |
| `ghost.js` | `apps/night/ghost.js` | passed to boot as a frame filter |
| `tutor.js`, `demo.js` | `apps/full/` | nothing in core imports them; `hooks.tutor` is null-safe when absent (set only at tutor.js:336) |
| `songs.js` | `apps/full/songs.js` | loaded only by probes |
| `userfiles.js` | `apps/full/userfiles.js` ❓ | console tool under `?probe`; could become a tool |
| `ui.js`, `draw.js`, `latmeter.js` | `core/legacy-ui/` | D — Night still needs them |
| `arrange.js` | `core/arrange.js` | D — `live/backing.js` imports it; Full purpose |
| `autosave.js`, `clip.js` | `core/` | D — ui and recorder import them; Night records nothing |
| `render.js`, `frzqueue.js` | `core/` | Night loads them today (engine bench, auto-freeze watcher) |
| `audio.js`, `config.js`, `state.js`, `hooks.js`, `i18n.js`, `icons.js`, `palette.js`, `scales.js`, `scaleload.js`, `timbreload.js`, `userstore.js`, `vision.js`, `handdet.js`, `hand-worker.js`, `gestures.js`, `recorder.js`, `profile.js`, `edition.js`, `va-stub.js` | `core/` same name | |
| `scaleprobe.js` | `tools/probes/api.js` + `tools/probes/full.js` + `tools/probes/night.js` | the facade splits by page |
| `probedata.js` | `tools/probes/core/probedata.js` | node + browser |

### 2.3 `src/` folders

| Current | New |
|---|---|
| `core/{bus,camlight,canon,dsp,engclass,format,handsched,latency,pack,profile,registry,songfile,timbre}.js` | `core/pure/` |
| `core/ambience.js` | `core/pure/ambience.js` (D — audio.js) |
| `core/calmui.js` | `core/pure/nightui.js` (D — views/play.js reads the glow numbers) |
| `core/night.js` | `apps/night/pure/cycle.js` |
| `core/forestlife.js`, `core/fireflies.js` | `apps/night/pure/` |
| `engine/**` (fdn, surface, 4 worklets) | `core/engine/**` |
| `freeze/registry.js`, `live/*` (4), `song/*` (17), `transport/*` (2) | `core/` same subfolders |
| `gestures/{expr,features,fxhand,hands,looper,roles,pose}.js` | `core/gestures/` (`pose.js` — ghost and core probes both use it) |
| `modules/timbres/*` (12) | `core/modules/timbres/` — Full also offers modal, breath and tine; `strikes.js` is D |
| `modules/effects/{param,reverb,delay,trem-mix,bright,glide,volume,forest,glue}.js` | `core/modules/effects/` |
| `modules/effects/forestdepth.js`, `modules/effects/calm.js` → `night-fx.js`, `modules/ambience/forest.js` | `core/modules/…` (D — `FX_FACTORY` and both engine instances import them; see §3.3) |
| `views/{common,camera,strip,roll,play,stack}.js` | `core/legacy-ui/views/` |
| `views/scene/host.js` | `core/legacy-ui/views/scene/host.js` (generic once rooms are injected) |
| `views/scene/{forest,forest-life,forest-detail,forest-rare}.js` | `apps/night/scene/` |

### 2.4 `src/probes/` → `tools/probes/`

Probes leave the shipped tree. `dist/` will not contain them (Q5).

| Suite | Files |
|---|---|
| `core/` | `data, detect, eng2, engine, files, fxcontract, gold, guard, hand, lat, pack, pool, profile, rows, run, sound, timbres, vis` |
| `full/` | `autosave, cmd, edit, freeze, history, ids, key, kit, seed, song1, song2, songfile, tim3d, tuning, window` |
| `night/` | `calm.js` → `night.js`, `forest.js` |

❓ `freeze.js` and `tuning.js` contain engine-level rows but drive the editor and song. They stay whole in `full/` for SPLIT-2. `timbres.js` stays in
core except the row «FULL untouched», which moves to `full/`.

### 2.5 Data and assets

| Current | New |
|---|---|
| `data/{index,menu}.json`, `README.md`, `modes/*` (74), `tunings/*` (18), `palettes/*` (8), `chordmodes/*` (4), `timbres/*` (60), `timbres.bundle.json` | `core/data/` same paths |
| `data/profiles/full.json` | `apps/full/data/full.json` |
| `data/profiles/calm.json` | `apps/night/data/night.json` |
| `data/profiles/index.json` | delete (a page declares its one record, §4.3) |
| `data/songs/triphop.json` | `apps/full/data/songs/` |
| `fonts/**` (6) | `apps/night/fonts/` — only Night's CSS uses them |
| `vendor/three-r128/**` (2) | `apps/night/vendor/three-r128/` — only the forest loads it |
| `icons/*` (3) | `apps/full/icons/` + a copy in `apps/night/icons/` until Night gets its own |

### 2.6 `tools/`

| Current | New | Change needed |
|---|---|---|
| `check-static.mjs` | stays | one root → roots `core`, `apps/*`, `tools/probes`; `NET_LISTED` and `FOLDER_RULES` keys; new checks 14–16 (§7.4) |
| `check-licences.mjs`, `licences.json` | stay | `isShippedText`, `ICON_EXEMPT`, two pages + two manifests; `SKIP_DIRS` keeps excluding `tools`; register paths |
| `probe-data.mjs` | stays | about 53 path references; rows gain a suite tag |
| `probe-browser.mjs` | stays | `--app`, `--json`, entry URL (`:395`), 20 `import('./src/…')` page-evals → root-absolute |
| `ui-snap.mjs` | stays | `--app`, entry URL (`:169`), 20 page-evals |
| `forest-budget.eval.js` | stays | 2 page-evals |
| `timbre-bundle.mjs`, `name-index.mjs` | stay | ROOT paths, multi-root |
| `doc-split-check.mjs` | stays | keeps passing if changed lines are copied to «Superseded at DOC1» |
| `lex.mjs`, `pack-keygen.mjs`, `pack-test-licence.json`, `.pack-test-key.json`, `package*.json` | stay | |
| `gold.print.json`, `census.print.json`, `gesture.print.json`, `song.print.json`, `scales.before.json`, `timbres.before.json` | `tools/prints/` | **byte-identical**: only the folder changes, hash-checked |
| `listen/calm-timbres.html`, `calm-listen.js`, `check-listen.js`, `measure.js` | `tools/listen/night-timbres.html`, `night-listen.js`, … | imports `../../core/…` |
| (new) `build.mjs`, `smoke-paths.mjs`, `split-compare.mjs` | | §6, §7, §9 |
| `.ui-snap/`, `.probe-logs/`, `.cdn-cache/`, `node_modules/` | stay (ignored) | |

### 2.7 `docs/` and `archive/`

| Current | New |
|---|---|
| `AUD1-design`, `CMD1-design`, `ENG2-design`, `TIM3-design`, `NAME-INDEX` (generated), `STALE-NAMES` | `docs/core/` |
| `UX-INVENTORY`, `prototypes/rooms-of-light.html` ❓ | `docs/full/`; the prototype → `docs/night/prototypes/` (it was a Night reference; licence entry updated) |
| `VIS1-design` ❓ | `docs/core/` (host and bus) |
| `STAGE4-CALM-plan`, `CALM-QUALITY`, `design/calm/*` | `docs/night/STAGE4-NIGHT-plan.md`, `QUALITY.md`, `design/*` |
| `SPLIT-PLAN.md` | stays until SPLIT-2 ends, then `archive/` |
| `archive/*` | stay untouched, plus the two frozen logs |

## 3. Calm logic inside shared modules

SPLIT-2 moves only what would otherwise make **core import an app**. Everything else keeps its branch, renamed, with a `TODO(NIGHT)` comment.

### 3.1 Branches that must move or invert in SPLIT-2

| Where | Today | SPLIT-2 |
|---|---|---|
| `ui.js:60, 3080, 3115` | imports the shell; `calmShellWire(...)`; `calmShellFace(p)` | ui exports `shellDoors()` and an `onFace` hook; `apps/night/main.js` wires them. Same setters, same call order |
| `views/scene/host.js:12, 23, 36` | imports `buildForest`; `ROOMS`; loads `vendor/three…` | `sceneRoomAdd(id, {build, three})`, called by Night's entry. Full registers nothing and never loads three, as today |
| `main.js:15, 71` | `ghostFrame(...)` always called (returns its input when unarmed) | boot takes an optional `frameFilter`; Night passes the ghost |
| `main.js:140`, `profile.js:83`, `calmshell.js:121` | `?calm` | the page declares the app. Night's entry calls `profileBoot('profile.night')`; the shell sets the boot class. Full does nothing, as today |
| `profile.js:22–27` | reads `data/profiles/index.json` | reads `<link rel="handsong-profile" href="data/…json">` from the page (§4.3) |
| `profile.js:70`, `ui.js:3112, 3129–3130`, `index.html:416–420`, `calmshell.js:91` | Full ↔ Calm switch | **removed** (one app cannot contain the other, Q2) |
| `style.css:553–689` | Calm block | §2.1 |

### 3.2 Branches that stay as they are (renamed, `TODO(NIGHT)`)

| File:line | Function / place | Branch |
|---|---|---|
| `profile.js:48, 65` | `CALM_CHAIN`, `target()` | Night's chain as code, keyed on `p.shell` (later: move into `night.json`) |
| `core/profile.js:8, 15–16` | `PROFILE_IDS`, `FIELDS` | pinned id; `levels/voices/volume` |
| `ui.js:3065` | `profChain` | writes a profile's chain |
| `ui.js:3078–3093` | `calmProf`, `calmPlay`, door object | shell doors (stay in ui until it is split) |
| `ui.js:3094–3117` | `profileWire` `read/write/face` | `body.calm`, `!p.recording && loop.on` → pause, background choice |
| `ui.js:3120–3127` | `BG_KEY`, `bgStored`, `bgPick` | Night's background |
| `state.js:783–790` | `calmView`, `setCalmView`, `volFloor` | null in Full |
| `views/play.js:166` | label drawing | `calmView.plain` → return |
| `views/play.js:376, 441–470` | `drawCalmField` | glow note field |
| `views/play.js:470–488, 562` | `drawCalmTips`, `calmTipsDbg` | fingertip fireflies |
| `views/play.js:593, 605, 627, 698, 809` | hand tags, effect bars | `!calmView` guards |
| `views/play.js:881` | stack module `surface` | reads `calmFx` from the bus |
| `gestures/hands.js:773` | `handsView` | `finger`, `tips` only when `calmView` |
| `gestures/roles.js:149` | `noteVolOf` | `volFloor` curve |
| `audio.js:23–24, 504–506` | `FX_FACTORY` | `cecho/ctone/cwave/fdepth` built in (`calm:true`) |
| `audio.js:222` | `outputFade` | sleep fade |
| `audio.js:424, 1220–1234` | `renderReset`, `setTimbreTrim`, `setLowPower`, `setCalmStrikes` | per-timbre state, null in Full |
| `audio.js:769` | `fxAddableIds` | hides Night's effects in «+ Add» |
| `audio.js:2043–2194` | `ambienceOn/Tick/Retune/Info` | Night's ambience, built on first use |
| `audio.js:2166` | `engineCtx` | `calmLean`, `strikeCaps`, `lowPower` |
| `modules/timbres/tine.js:23`, `modal.js:30–31` | strike builders | `E.calmLean` picks the second path |
| `modules/timbres/subtractive.js:36` | `buildTineBank` call | id = cap key |
| `render.js:924, 926` | render tail length | reads `fdepth`, `cecho` |
| `core/dsp.js:25` | `calmDepth`, `CALM_DEPTH` | curve for Forest depth |
| `core/bus.js` | topic comment | topics `calmFx`, `calmNight` written by the shell |
| `latmeter.js:266` | low-light hint | `body.calm` → `body.dark-on` |
| `engine/surface.js:8, 38, 43` | surface lists | rekeyed to new module paths |

No branch in §3.2 changes behaviour in SPLIT-2.

### 3.3 Debt list: code that breaks the new rules on day one

SPLIT-2 writes this list to `core/DEBT.md`. A static check fails if it grows. It only shrinks.

| Item | Rule broken | What frees it |
|---|---|---|
| `core/legacy-ui/**` (ui, draw, latmeter, views) | no UI in core | **NIGHT-n:** Night's own start, doors and drawing. **FULL-n:** then the folder moves to `apps/full/` |
| `views/roll.js`, `views/strip.js` | Full-only code in core | `play.js` stops importing them (it imports from both today) |
| `song/{automation,clipboard,commands,edit-*,quantise,sections,transpose}`, `arrange`, `live/backing`, `autosave`, `clip`, `freeze/registry` | Full-only in practice | `recorder.js` facade split: Night plays without the recording path. Largest item; a dedicated CORE run |
| `modules/effects/{forestdepth,night-fx}`, `modules/ambience/forest`, `modules/timbres/strikes`, `pure/ambience`, `pure/nightui` | Night-only in core | an engine registration door. **Trap:** the engine exists as two instances (`audio.js` and `audio.js?render`), so registration must reach both, and GOLD, render tails and the contract rows must follow |
| §3.2 branches in `state`, `audio`, `views/play`, `gestures/*` | core knows about Night | each becomes a named option (`view.glow`, `strikeCaps`, …) |
| Night's dictionary keys in `i18n.js` | app-only strings in core | dictionaries become per-app + shared |

## 4. Path-sensitive loads

"Breaks" means after the move, with the current code. The preferred fix is `new URL(..., import.meta.url)`; it is what most of the app already does.

### 4.1 Page-level (relative to the document)

| Load | Location | Breaks? | Fix |
|---|---|---|---|
| `tokens.css`, `style.css`, `src/va-stub.js`, `src/main.js` | `index.html:22–29, 617` | yes | `../../core/…`, `main.js`; the build rewrites them for the root page |
| `manifest.json`, `icons/icon-192.png` | `index.html:16, 18` | no | page-level, copied next to the page |
| manifest `start_url`, `scope`, icon paths | `manifest.json` | no | relative to the manifest |
| `navigator.serviceWorker.register('sw.js')` | `ui.js:2884` | no, **keep it document-relative on purpose** | SW sits beside its page; in `dist/` its scope covers the whole app |
| `/_vercel/insights/script.js` | `index.html:30` | no on Vercel; 404 elsewhere (as today) | keep; allow-listed in smoke; drop for Capacitor |

### 4.2 Code relative to the document: **these break**

| Load | Location | Fix |
|---|---|---|
| `addModule('src/engine/worklets/probe-cap-worklet.js')` | `audio.js:923` | `new URL('./engine/worklets/…', import.meta.url).href` |
| `addModule('…ks-worklet.js')` | `audio.js:1310` | same |
| `addModule('…frz-worklet.js')` | `audio.js:1317` | same |
| `addModule('…dyn-worklet.js')` | `audio.js:1330` | same |
| `render.js:410–411` addModule wrapper | matches by substring (`'dyn-worklet'`, `render.js:1061`) | no change: absolute URLs still contain it; `--leak` confirms |
| `SONG_FILES` `'data/songs/triphop.json'` | `songs.js:38, 84` | `new URL('./data/songs/…', import.meta.url)` |
| `fetch('data/profiles/calm.json')` | `probes/calm.js:72` | `new URL` to `apps/night/data/night.json` |
| `fetch('data/songs/triphop.json')` | `probes/song2.js:36` | `new URL` |
| `fetch('tools/pack-test-licence.json')` | `probes/pack.js:11` | `new URL` |
| `SNAP_FILE`, `CENSUS_FILE`, `GOLD_FILE`, `PRINT_FILE` (×2), `FILE` | `files.js:34, engine.js:15, gold.js:16, hand.js:21, key.js:22, timbres.js:14` | `new URL('../../prints/…', import.meta.url)`; drop `location.href` |
| `addModule('src/engine/worklets/dyn-worklet.js')` | `probes/sound.js:96, 189` | `new URL` |
| Page-evals `import('./src/…')` | `tools/ui-snap.mjs` (20), `probe-browser.mjs` (20), `forest-budget.eval.js` (2), `listen/*` (2) | root-absolute `/core/…`, or a base given by the runner |
| Doc comments `new URL('src/…', location.href)` | `render.js:80, 1303, 1396`, `userfiles.js:4`, `songs.js:3`, `scaleprobe.js:3` | comments only; update text |

### 4.3 Code relative to the module: safe by design, needs small edits

| Load | Location | After the move |
|---|---|---|
| `BASE=new URL('../data/', import.meta.url)` | `scaleload.js:26` | `./data/` |
| `BASE=new URL('../', …)` + `data/timbres.bundle.json` | `timbreload.js:11, 27` | `./` |
| `BASE=new URL('../', …)` + `data/profiles/…` | `profile.js:12, 22, 27` | **replaced:** `document.querySelector('link[rel="handsong-profile"]').href`. The page declares its own record, which keeps core ignorant of apps. Read during module evaluation, which is safe because the tag is in `<head>` |
| `new Worker(new URL('./hand-worker.js', import.meta.url))` | `vision.js:157` | none (same folder) |
| `import('./handdet.js')`, `import('./core/latency.js')` | `hand-worker.js:22` | `./pure/latency.js` |
| `import('./handdet.js')` | `vision.js:186` | none |
| `import('../../../vendor/three-r128/three.min.js')` | `views/scene/host.js:36` | injected by Night's room record: `three:()=>import('./vendor/three-r128/three.min.js')` |
| `import('./render.js')`, `audio.js?render` (`ENG_SPEC`) | `main.js:145`, `render.js:239` | relative imports only; **must stay one URL** per module, or a second engine appears |
| `import('./scaleprobe.js')`, `render.js`, `userfiles.js` | `main.js:158–160` | `<link rel="handsong-probes" href="../../tools/probes/night.js">` read under `?probe`; the build deletes that tag, so apps import no tool and `dist/` has no dangling reference |
| Relative `import` / `export … from` / `import()` | 857 lines in 133 modules (304 of them in probes) | mechanical; `check-static` proves each one resolves |
| `url(fonts/…)` | `tokens.css:277–281` | moves with `night.css`, then `url(fonts/…)` relative to `apps/night/` stays correct |
| `tools/listen/calm-timbres.html:12` `<base href="../../">` | listen page | unchanged depth; the page's import paths change |

### 4.4 Network (unchanged in SPLIT-2; must change before Capacitor)

| Load | Location | Now | For Capacitor / offline (C9, not SPLIT-2) |
|---|---|---|---|
| MediaPipe library, static external import | `handdet.js:8` | jsDelivr | vendor to `core/vendor/mediapipe/`, relative import |
| WASM folder | `handdet.js:11` | jsDelivr | `new URL('./vendor/mediapipe/wasm', import.meta.url).href` |
| Hand model | `handdet.js:12, 28` | storage.googleapis | `new URL('./vendor/…/hand_landmarker.task', import.meta.url)` |
| CSP hosts | `index.html:10`, both pages | lists both CDNs | removed once vendored; `check-licences` checks each host has an entry |

**Rule #33:** the split adds no new host, the same CSP goes on both pages, and a static check requires the line to be identical. No image, landmark or sound
path changes. **Rule #32:** no new third-party code. `build.mjs` and `smoke-paths.mjs` use only Node builtins and the already-registered `playwright-core`.

## 5. Rename list

### 5.1 Counts (lines containing the old name, all 1476)

| Area | Lines | Action |
|---|---|---|
| `src/` probes (`calm.js` 148, `profile.js` 21, `forest.js` 17, `timbres.js` 13, others 19) | 218 | rename |
| `src/calmshell.js` 80, `modules/effects/calm.js` 14, `forestdepth.js` 10 | 104 | rename + move |
| `src/i18n.js` 32, `views/play.js` 26, `ui.js` 25, `audio.js` 22 | 105 | rename |
| Other shipped `src/` (34 files, ≤ 9 lines each) | 101 | rename |
| `index.html` 51, `style.css` 124, `tokens.css` 21 | 196 | rename |
| `data/profiles/` | 4 | rename |
| `tools/` (`ui-snap` 33, `probe-data` 18, `licences` 10, `probe-browser` 6, `listen/*` 16, others 3, baseline notes 3) | 89 | rename except baseline notes |
| `CLAUDE.md` 22, `HANDOFF.md` 6, `THIRD-PARTY` 14 (generated), `BACKLOG.md` 34 | 76 | rename |
| `docs/` (`STAGE4` 102, `NAME-INDEX` 42 generated, `VIS1` 14, design 51, others 11) | 220 | rename |
| **`WORK-LOG.md` 256, `archive/*` 106** | 362 | **kept: historical log** |
| `vendor/three-r128/three.min.js` 1 | 1 | false match; never touched |

### 5.2 Mapping rules

**Default (case-preserving):** `calm→night`, `Calm→Night`, `CALM→NIGHT`. It covers about 245 distinct names: `CALM_UI→NIGHT_UI`, `CALM_FX`, `CALM_CHAIN`, `CALM_DEPTH`, `CALM_SET`,
`CALM_TIMBRES`, `calmView`, `setCalmView`, `calmLean`, `setCalmStrikes`, `calmDepth`, `calmShellWire/Face/Dbg`, `calmSleepDbg`, `calmFx`, `calmFxNow`,
`calmTipsDbg`, `drawCalmField`, `drawCalmTips`, `calmProf`, `calmPlay`, `makeCalm{Echo,Tone,Wave}Fx`, `checkCalm*` (13), `SCREENS_CALM`,
ids `calm{Shell,Veil,Sound,Mood,Hand,Notes,Bg,Sleep,Info,…}` (28), classes `.calm-*` (about 45), tokens `--calm-*` (about 50), `z-calm`,
keys `calm.*` → `night.*`, screens `calm-*` → `night-*`, `P.calm → P.night`, `--calm → --night` (runner flags), rows `CALM x → NIGHT x`.

**Exceptions (blind replace would be wrong):**

| Old | New | Why |
|---|---|---|
| `calmNight` (bus topic) | `nightSky` | else `nightNight` |
| `--cv-calm-{amber,dark,glow}` | `--cv-hn-*` | sits next to the unrelated `--cv-night-a30…a94` colour family |
| `core/night.js` | `apps/night/pure/cycle.js` | inside the app the name says nothing; its exports `nightAt`, `nightDeep`, `NIGHT` keep their names |
| `calmshell.js`, `core/calmui.js`, `modules/effects/calm.js`, `probes/calm.js` | `apps/night/shell.js`, `core/pure/nightui.js`, `core/modules/effects/night-fx.js`, `tools/probes/night/night.js` | placement |
| `EDITION` values | `'dev' \| 'release'` | no product name in the value (Q3) |
| `FX_FACTORY[…].calm:true` | `.night:true` | removed when effects move |
| row flag `calm` | `suite:'night'` / `both:true` | §7 |
| `"Спокойный"` (`calm.json:5`, `i18n.js:851–852`) | see Q8 | |
| `«calm»` wordmark (`index.html:46, 596`) | `night` | visible |
| `'Handsong Calm — device measurement'` (`calmshell.js:176`) | `'Handsong Night — …'` | visible |

**Keep; these do NOT rename:**

| Name | Why |
|---|---|
| `Night forest` (Full's effect), `fxId:'forest'`, rows `SND-F1 Night forest…` | Full's own name; unrelated to the product |
| `--c-night-*`, `--cv-night-*` | colour family used by Full |
| `cecho`, `ctone`, `cwave`, `fdepth` | permanent effect ids (rule #37), GOLD case names; no old word inside |
| `solo.*` timbre ids | permanent; no old word inside |
| `night-mode` in `pack-test-licence.json` | test fixture |
| `NIGHT-0`, "NIGHT run" in history | history. New runs start at `NIGHT-1` |
| `спокойно` in `views/roll.js:888` | ordinary Russian adverb |
| `note` fields inside `tools/prints/*.json` | **historical entries, and byte-identity is the proof.** Do not touch |

**Rule #37 conflict, needs your confirmation (Q4):** `profile.calm` is a pinned id ("never renamed"). You asked for the rename. It is safe: no song, file or
storage key stores a profile id, as checked. `PROFILE_IDS` becomes `['profile.full','profile.night']`; the rule gets one recorded exception.

**The comment `Calm plan §N` →** `Night plan §N`, since the plan document is renamed too.

**Guard after the rename:** data row «OLD NAME gone». Case-insensitive `calm` and `Спокойн` fail anywhere except `archive/**`, `tools/prints/*.json`, `vendor/**` /
`apps/night/vendor/**`, and the one migration file. CONTROL: a planted word must fail. The word `calms` in `core/night.js` gets reworded.

### 5.3 Storage keys and migration

| Old key | New key | Reader |
|---|---|---|
| `handsong.calmBg` | `handsong.nightBg` | `ui.js:3120` |
| `handsong.calmLantern` | `handsong.nightLantern` | shell |
| `handsong.calmField` | `handsong.nightField` | shell |
| `handsong.calmForest` | `handsong.nightForest` | shell |
| `handsong.calmSeen` | `handsong.nightSeen` | shell (first-run ghost) |
| `handsong.calmFxHint` | `handsong.nightFxHint` | shell |
| `handsong.calmJoints` | `handsong.nightJoints` | shell |
| `handsong.calmLight` | `handsong.nightLight` | shell |
| `handsong.calmLightScene` | `handsong.nightLightScene` | shell |

Not renamed (no old word): `handsong.lang`, `handsong.sceneLevel`, `handsong.autosave`, `handsong.engBench`, `handsong.camTest`, `handsong.lesson.*`, IndexedDB
`handsong-songs` and the user-store DB.

**Migration, `apps/night/migrate.js`, the FIRST import of `apps/night/main.js`** (the shell reads keys while its module loads, so it must run earlier):

```js
// One-time move of the old setting names (same origin only). Safe to run on every start.
const OLD='handsong.calm', NEW='handsong.night';
for(const s of ['Bg','Lantern','Field','Forest','Seen','FxHint','Joints','Light','LightScene']){
  try{ const v=localStorage.getItem(OLD+s);
    if(v!==null){ if(localStorage.getItem(NEW+s)===null) localStorage.setItem(NEW+s, v); localStorage.removeItem(OLD+s); }
  }catch(e){ /* private window: nothing to move */ }
}
```

Row «NIGHT migrate»: old keys set → moved, removed; a new key wins over an old one; second run changes nothing; CONTROL with the file skipped fails. Delete the
file after the first public release (it holds the only surviving old name).

**What it does and does not cover:**

| Case | Result |
|---|---|
| Local dev, `127.0.0.1:5500` (Full and Night share one origin) | migrates |
| The tunnel used on your phone | migrates, on the same address only |
| `handsong.vercel.app/?calm` → `handsong-night.vercel.app` | **cannot migrate; different origin.** The first-run steps and ghost return once and settings reset. Calm was never released, so only your own devices are affected (Q7) |
| Capacitor later | new install, nothing to move |

**Shared storage in dev:** on one origin Full and Night keep sharing `handsong.lang`, autosave and scene level, exactly as today. They separate naturally on two origins.

## 6. Build and deploy

### 6.1 Why the `dist/` tree mirrors the repo

Relative imports cross `apps/night/` → `../../core/`. If `dist/` keeps the same tree, **no import is rewritten**: only the page moves up. Import maps were rejected
because the CSP forbids inline script and external import maps are not widely supported. A bundler was rejected because of the no-build rule and because it would change module URLs,
which the two-engine trick (`audio.js?render`) depends on.

```
dist/index.html          generated from apps/<app>/index.html (refs rebased)
dist/manifest.json  dist/sw.js  dist/icons/*      copied from apps/<app>
dist/THIRD-PARTY-LICENSES.md
dist/apps/<app>/**       everything except the page-level files, .md
dist/core/**             everything except .md
```

This is what Capacitor wants later: `webDir: dist`, `index.html` at the root, and every load relative.

### 6.2 `tools/build.mjs` outline

```js
// Assemble dist/ for ONE app. Node builtins only. No HANDSONG_APP = failure, never a silent Full.
const app=process.env.HANDSONG_APP; if(!['full','night'].includes(app)) die('HANDSONG_APP must be full or night');
const out=argFlag('--out')||'dist';
rmSync(out,{recursive:true,force:true});
copyTree('core', join(out,'core'), skipMd);
copyTree(`apps/${app}`, join(out,`apps/${app}`), f=>!PAGE_LEVEL.has(f) && skipMd(f));
for(const f of PAGE_LEVEL) copyTree(`apps/${app}/${f}`, join(out,f));   // manifest.json, sw.js, icons/
copyFile('THIRD-PARTY-LICENSES.md', join(out,'THIRD-PARTY-LICENSES.md'));
writeFile(join(out,'index.html'), rebasePage(readFile(`apps/${app}/index.html`), `apps/${app}`));
// rebasePage: each src="" / href="": absolute, http(s), data:, # and PAGE_LEVEL refs unchanged; the rest posix.normalize(join(base, ref));
//             removes <link rel="handsong-probes">.
verify(out, app);   // fails the build: every relative import/url from the entry resolves inside out/; no other app's folder; no tools/ reference;
                    // no worklet missing; prints file count, bytes, tree hash
```

About 120 lines. `--out` lets the smoke test build into a temp folder. `dist/` goes in `.gitignore`.

### 6.3 `vercel.json` (exact)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "",
  "buildCommand": "node tools/build.mjs",
  "outputDirectory": "dist"
}
```

`installCommand: ""` skips install (Vercel documents this); nothing at the root needs packages. One file serves both projects; only the env var differs.

Root `index.html` (new, for GitHub Pages and a bare Live Server; Vercel never serves it):

```html
<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=apps/full/"><a href="apps/full/">Handsong</a>
```

### 6.4 What you do in the Vercel dashboard

**Before the SPLIT-2 merge, existing project (`handsong`):**
1. Settings → Environment Variables → add `HANDSONG_APP` = `full` for Production, Preview and Development.
2. Settings → Build and Deployment: Framework Preset **Other**; Root Directory **empty**; clear any Build, Output or Install override (`vercel.json` then rules).
3. Check the Production Branch is what you expect (Q9); Web Analytics stays on.

If step 1 is forgotten the build fails loudly and the old deployment stays live. That is the intended safety.

**After the merge, new project:**
1. Add New → Project → import this same repo; name `handsong-night` (address `handsong-night.vercel.app` if free).
2. Framework **Other**; Root Directory empty; Environment Variable `HANDSONG_APP` = `night` for all three environments; Deploy.
3. Same Production Branch as Full. Analytics: Q10.
4. Open a preview URL of each project, press Begin / Play, then promote.

**Both projects rebuild on every push.** A build takes seconds, so no ignore step at first. Later `ignoreCommand` can skip a build when only the other app changed.

**Note (already recorded, BACKLOG §7.12):** Vercel Hobby forbids selling; this split does not change that.

### 6.5 Local testing without a build

Live Server stays rooted at the repo: open `http://127.0.0.1:5500/apps/full/` or `/apps/night/`, trailing slash required. Tunnel as today. No step needs `dist/`.

## 7. Checks

### 7.1 Row suites

Rows get `suite:'core'|'full'|'night'`, replacing the flag `calm`. `both:true` marks a core row also needed on the Night page. Source count today: 122 rows and 3 families (families expand when listed); the data runner has 32 rows (24 of its own + 8 rows flagged `node`).

| Suite | Rows (by today's file) | Page |
|---|---|---|
| **core** | `data` 8; `engine` 2; `eng2`; `detect` 3; `lat` 5; `fxcontract` 2 families; `gold`; `hand`; `pack`; `pool`; `profile`; `sound` 7; `files` 7; `vis`; `timbres` TIM3a, TIM3 before | both pages for `both:true`; the rest on Full |
| **full** | `edit` 9; `window` 5; `history` 3; `freeze` 8; `key` 4; `tuning` 13; `cmd` 3; `seed` 4; `autosave`; `ids`; `song1`, `song2`, `songfile` 2; `tim3d`; FULL untouched | Full |
| **night** | `night.js` (ex-calm) 14; `forest` 8; NIGHT untouched; NIGHT migrate | Night |

`both:true`: GOLD, census, HAND1, VIS1a, C0 profile, TIM3 before, plus the smoke test. That is today's `P.calm` non-Night part, with TIM3 added.

**Row C0 profile round trip** cannot stay as it is, because Full ↔ Night no longer exists on one page. It becomes core with a **fixture profile** `tools/probes/core/fixture.profile.json`: applying and leaving it restores the state exactly, with the same CONTROL.

**Rows that assume they start in Full** (`calm.js` shell, ghost, stress, `forest.js`) gain the Night page as their start. Their "back in Full" parts become "Full has none of this", checked on the Full page in row FULL untouched. `CALM stress` compares against "the standard app"; that reference moves to a stored run or to a Full-profile fixture on the Night page ❓ (decide in the step, with evidence, since the real-time part is already "not judged" on a hot machine).

### 7.2 Commands

| Today | Tomorrow |
|---|---|
| `P.all`, `P.quick` | same names: on Full = core + full, on Night = core `both` + night |
| `P.calm` | `P.night` (kept as a name; identical to `P.all` on the Night page) |
| (none) | `P.core()`: core rows only, on either page |
| GOLD (`gold.print.json`) | one file, moved byte-identical, core suite, both pages. Case split (`fx fdepth`, `cecho`, `ctone`, `cwave`, `ambience` → night) waits until those effects leave core |
| `timbres.before.json` | one file, byte-identical; core |
| node census (`census.print.json`) | one file; core; both pages. Values must match on both, as the engine is shared |
| `scales.before`, `song.print`, `gesture.print` | core / full / core, moved byte-identical |
| `probe-data` | one runner with `--suite core\|full\|night`; default all. Node rows are already pure |
| `node tools/probe-browser.mjs` | `--app full\|night\|both` (default `full`), `--quick`, `--all`, `--night` (ex `--calm`), `--json file` |
| `ui-snap` (base), `--calm`, `--forest` | `--app full`, `--app night`, `--app night --forest` |

**Budget, per run (extends the probe budget):**

| Change touches | Must run |
|---|---|
| only `apps/full/` | static, data, `--app full --quick` |
| only `apps/night/` | static, data, `--app night --quick` |
| anything in `core/` | static, data, `--app both --quick`; `--all` on both when it touches sound, rendering, recording or tuning |
| page, path or build | + `smoke-paths` |

### 7.3 Guards

**FULL untouched (keeps its checks).** Reads Night's caps directly from `apps/night/data/night.json` for its CONTROL (tools may read both apps).

**NIGHT untouched (new, deterministic, about 30 s, core-and-night suite):**
1. **State print:** after Night's profile applies, the live state (scale, key, timbre, hands, voice mode, chain with fixed values, `nightView`, `volFloor`, trims, caps) equals `tools/prints/night.print.json`.
2. **Sound print:** each of the 4 sounds, short notes through Night's chain with Night's trims and caps, offline, by GOLD's own measure, within GOLD_TOL.
3. **Sets:** moods, backgrounds, timbres, effects as pinned.
4. **CONTROLS (must fail):** trim +1 dB on one sound; caps off (`setNightStrikes(null)`); chain with one effect removed.

The print is created at step 12 from the identical sound baseline, then renewed only by a NIGHT run that declares it.

**Tree hash (report only):** `node tools/tree-hash.mjs core apps/full apps/night` printed in every report. A FULL-n report must show the core and night hashes unchanged, and so on. It is cheap evidence, no git needed.

### 7.4 New static checks in `check-static.mjs`

| # | Check | CONTROL |
|---|---|---|
| 14 | **Boundaries:** `apps/x` imports only its own folder and `core/`; `core/` imports nothing from `apps/` or `tools/`; `tools/probes/<suite>` imports core, and its own app | fake cross-app and core→app imports must fail |
| 15 | **Debt:** `core/legacy-ui/**` file list and `core/DEBT.md` may only shrink, compared to a list in the tool | an added file must fail |
| 16 | **Pages:** every id a shared module reads exists in each page that loads it; CSP line identical in both | removed id, altered CSP must fail |
| + | Rule 36 extends to `apps/night/pure/**`; rule 38 stays on `core/modules/**`, `core/engine/**` | existing controls |

### 7.5 Path smoke test (`tools/smoke-paths.mjs`, new)

Runs **6 targets**: `apps/full/`, `apps/night/`, each from the repo server; built `dist` for full and night, each from the server root **and** from a sub-folder (`/some/sub/`), which proves "works from any folder". Headless Chrome, fake camera, fresh profile, ▶ / Begin pressed.

| Assert | How |
|---|---|
| No failed request | every response < 400 (allow-list exactly: `/_vercel/insights/script.js` outside Vercel) |
| No console error, no uncaught error, no CSP violation | listeners |
| Worklets loaded | `dynReady` / ks / frz via a guarded evaluate, **and** the 3 files seen with 200 |
| Hand model loaded | `initDetector` resolved (the start card left `on`), model and WASM responses 200 |
| First frame rendered | canvas has non-zero pixels; `BUS.get('picture')` set |
| Night only | three.js loaded after choosing Forest; `#scene` exists; fonts `Andika`, `Literata` report loaded |
| Full only | three.js **not** requested; no `apps/night` URL requested |
| Hosts | only own origin + MediaPipe paths (rule #33) |
| CONTROL | a target with one worklet renamed (temp copy) must fail |

Under a minute per target on a fair network, `--cdn-cache` available. A real page load is justified here: only a browser can show a path failure in `addModule`.

## 8. Docs

```
HANDOFF.md                  short index (under 3 KB): project, tracks, where each stands, which file to read
docs/core/  HANDOFF.md  WORK-LOG.md  BACKLOG.md  + design docs, NAME-INDEX, STALE-NAMES
docs/full/  HANDOFF.md  WORK-LOG.md  BACKLOG.md  UI-MAP.md  UX-INVENTORY.md
docs/night/ HANDOFF.md  WORK-LOG.md  BACKLOG.md  STAGE4-NIGHT-plan.md  QUALITY.md  design/  prototypes/
archive/WORK-LOG-before-split.md    today's WORK-LOG frozen word for word (old name stays: history)
archive/NIGHT-RUN-LOG-2026-10.md    today's NIGHT-LOG.md
```

**One log note**, appended to the frozen WORK-LOG and at the top of each new log:

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

**How `HANDOFF.md` divides (today 20 KB):**

| Section | Goes to |
|---|---|
| How we work, the project, known limits (engine, latency) | index + `core` |
| Stage 3 foundation, auto-freeze, tuning model, engine direction, key lessons | `core` |
| Tracks, mixer, editor, saving, timbre builder, lessons last, stages 5–8 of the work order | `full` |
| Calm strategy, stage 4, 4b kiosk, RUN 9 record, open steps 106–124, C8 rest, C9, C10, C12 | `night` |

**`BACKLOG.md` (339 KB, Russian):** cut by section, not by line: §0, §1 → core; §2–§6 → full; §7.16, §7.18, §7.19 and Night items → night; other §7 → where it applies, with a stub line left at the old place. The Russian text is not translated (standing rule); edited sections become English.

**Run names:** `CORE-n`, `FULL-n`, `NIGHT-n`, counted separately. Old `RUN 1–9`, `NIGHT`, `DAY` stay in history; `NIGHT-0` exists, so the new counter starts at `NIGHT-1`. A run has one track. If a NIGHT run needs a core change, that part is a small `CORE-n` with its own record and both apps' checks. Each log entry starts: track, number, date, tree hashes before and after. This split itself is logged as `SPLIT-2` in `docs/core/WORK-LOG.md`.

**CLAUDE.md:** the "new session reads" rule becomes: this file, the index, the track's handoff. Paths in hard rules (#33 CSP, #36, #38, REC1) update in place, with the old lines copied to «Superseded at DOC1» so `doc-split-check` keeps passing exactly.

## 9. Order of operations for SPLIT-2

**Principle:** make the code location-independent first (old layout, still testable); move files in pure-move steps; rename last. A pure move has no content change beyond paths, so git sees renames and history follows. **Commit after each step** (you commit; I never run git). In particular commit a move before anything edits the moved files.

| # | Step | Behaviour | Check beyond static + data + `--quick` |
|---|---|---|---|
| 0 | **Baseline.** Add `--json` to runner, write `split-compare.mjs`, `smoke-paths.mjs`. Record: P.all (Full), P.calm, `?calm` P.calm, `ui-snap` base and `--calm`, `--leak`, SHA-256 of all prints, list of requests per page → `tools/split-baseline/` | none | `--all`, `--calm` |
| 1 | Worklets, songs, probes: document-relative → `import.meta.url` (§4.2). Runner evals root-absolute | none | `--all --leak` |
| 2 | Door inversion: shell wired from outside `ui.js`; room and three injected into host | none | `--calm`, ui-snap both |
| 3 | `main.js` → `boot.js` + `main-full.js`; root `night.html` + `main-night.js`. **Both pages now run from the old tree.** `<link rel=handsong-profile>` replaces `?calm` and the index | Night needs no `?calm` | smoke both; `--calm` on `night.html` |
| 4 | **Remove the switch** (Q2): `#profRow`, `#calmToFull`. Round-trip row → fixture. `#profRow` is the one declared difference in `ui-snap sound` | switch gone | ui-snap: only `sound` differs |
| 5 | **Pure move:** `src/ → core/`, `data/ → core/data/`, pages still at root with new paths | none | `--all` |
| 6 | **Pure move:** `core/core/ → core/pure/` (69 refs) | none | static proves it |
| 7 | **Pure move:** `core/legacy-ui/` | none | |
| 8 | **Pure move:** pages + entries to `apps/`; root redirect; icons, manifests, sw. `style.css` / `tokens.css` split | none | ui-snap both, 0 differing pixels except step 4's |
| 9 | **Pure move:** Night-only and Full-only files + fonts, three, profiles, songs | none | `--app both --all`; smoke |
| 10 | **Pure move:** `src/probes → tools/probes/{core,full,night}`, prints → `tools/prints/` (hashes equal). Runner `--app`. Suites, static checks 14–16 | none in app | `--app both --all`, compare |
| 11 | `tools/build.mjs`, `vercel.json`, smoke on all 6 targets | none | smoke 6 |
| 12 | NIGHT untouched + its print, tree hash | none | `--app night --all` |
| 13 | **Rename** (table-driven tool, exceptions from §5.2); migration; «OLD NAME gone» | names only | `--app both --all`; compare with map; ui-snap Night: only text-bearing screens differ, listed |
| 14 | Docs split; `CLAUDE.md` rules (§12); `node tools/name-index.mjs --write`; `check-licences --write`; `doc-split-check` | none | doc checks |
| 15 | **Final:** whole table below, on both apps | | everything |
| 16 | **You:** Vercel steps (§6.4), eye + ear checks (§9.2) | | |

### 9.1 How "no behaviour change" is proved

`split-compare.mjs` compares `tools/split-baseline/` with the final run and prints every difference. PASS only if each line below holds.

| Evidence | Requirement | Page |
|---|---|---|
| Print files (`gold`, `census`, `gesture`, `song`, `scales.before`, `timbres.before`) | **SHA-256 identical** (nothing renewed) | |
| GOLD | 0 differences | Full and Night |
| TIM3 before, census, HAND1, TF0 fingerprint, F0 snapshot | 0 differences | Full (first 3 also Night) |
| FULL untouched | 0 differences, controls fail as before | Full |
| Rows | each baseline row present, same case count, 0 differences; compared by a rename map; **real-time rows by verdict only** (measured values vary with heat) | |
| Retired or changed rows | only those declared in this plan: C0 round trip → fixture; the "back in Full" parts | |
| `ui-snap` Full | 10 screens, 0 differing pixels (as `run8full5` vs `run7full2` did); style walk equal; declared: `sound` (switch row) | Full |
| `ui-snap` Night before rename | 0 differing pixels on deterministic screens (Dark); Forest by eye (headless does not show WebGL) | Night |
| `ui-snap` Night after rename | only the wordmark and Night title differ | Night |
| Requests per page | same files and same hosts as the baseline, only at their new paths (compared through the §2 mapping) | both |
| `--leak` | passes on both | both |

**Intended visible changes (complete list):** the Full ↔ Calm switch is gone; Night opens without `?calm`; "Calm" reads "Night"; `?calm` on Full does nothing; `?probe` does not work on deployed builds (Q5).

### 9.2 What only you can check

Ear: one note of each Night sound and one Full passage, on each deployed URL (they load the same engine, so this checks deployment, not sound). Phone: both URLs. Camera + hands: both. The steps still open from RUN 7–9 (106–124) stay as they are; do not mix them into this check.

## 10. Risks, questions, size

### 10.1 Risks

| Risk | Likelihood | Effect | Guard |
|---|---|---|---|
| Worklet URL change upsets RENDER-LEAK's stub (`render.js:411`; it matches by substring, so expected fine) | low | slow memory growth | `--leak` in step 1 |
| A module reached by two URLs (e.g. via a path typo or `?v`) → a second engine or state copy | low | silent split state | static check; browser row compares module instance; baseline request list |
| Top-level await order changes after splitting `main.js` | medium | undefined at load | keep exact import order; smoke; ui-snap |
| A step leaves Night's markup and `ui.js` out of sync later | high over time | crash on Night's load | check 16 |
| Blind replace damages `--cv-night-*` or Full's "Night forest" | low with table | Full change | exceptions table; GOLD; pixels |
| Prints renewed by accident during the move | low | proof void | SHA-256 |
| Real-time rows flaky on a hot machine | known | false alarm | verdict only; stop after 2 rounds per the budget |
| Git loses rename history | medium | harder blame | pure moves committed alone |
| `core/legacy-ui` becomes permanent | **medium** | core never gets clean | check 15; a NIGHT run scheduled next |
| Vercel env var forgotten | low | build fails, old site stays | fail-loud build |
| Doc paths in 8,000-line archives go stale | certain | archives say `src/…` | intended: archives are history; a line at their top says so |

### 10.2 Questions for you (each with my recommendation; "no answer" = the recommendation)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Accept the temporary `core/legacy-ui/`, as an exception to "no UI in core"? | **Yes.** The alternative rewrites `ui.js` during a "no behaviour change" step |
| Q2 | Remove the live Full ↔ Night switch? | **Yes**, it cannot survive "apps never import each other". Dev convenience is replaced by two tabs |
| Q3 | Should deployed Night show the development items in ⓘ (`calmMeasure`, `calmJointsTg`, `calmSceneTg`, `calmToSound`)? | **Yes for now** (same as today's dev edition; you still measure phones). `HANDSONG_EDITION=release` hides them when you release |
| Q4 | Confirm the one rule #37 exception for `profile.calm → profile.night`? | **Yes**; nothing stores it |
| Q5 | Keep probes out of deployed builds (`?probe` then works only locally)? | **Yes.** Smaller and cleaner. Your weekly `P.all` stays on Live Server |
| Q6 | Is GitHub Pages still used? | **Keep the small redirect** either way; retire Pages later if unused |
| Q7 | Accept that settings on your devices do not cross to the new Night address? | **Yes.** A cross-origin transfer would mean a new data path, against the spirit of rule #33, for a few of your own settings |
| Q8 | Russian name of Night (`"Спокойный"` today)? | **"Handsong Night" in Latin letters** everywhere; the profile `name.ru` = «Ночь» only if you want a translated name |
| Q9 | Which branch do production deployments use, `main` or `dev`? | Your choice; both projects the same |
| Q10 | Web Analytics on Night (the counter, named in the privacy notice, Q14 of stage 3)? | **On**, to match the notice; drop the script tag if you prefer none |
| Q11 | The Full effect is called "Night forest" and sits next to a product called Handsong Night. Rename? | **Not in SPLIT-2.** A FULL-n decision |
| Q12 | Old address `handsong.vercel.app/?calm`: redirect to Night? | **No**, nothing public uses it |

### 10.3 Rough size

| Item | Amount |
|---|---|
| Files moved | about 345 (src 161, data 172, assets 11), + 15 docs |
| Import and path lines rewritten | about 900–1,100 (857 imports + paths in tools and probes), by tool, proved by `check-static` |
| Rename | about 820 code and tool lines, about 300 doc lines; tool-driven |
| New code | about 500–700 lines (`build` 120, `smoke` 200, `compare` 120, `NIGHT untouched` 80, static checks 80, boot split + doors 60, migrate 10) |
| Hand-edited logic | under 150 lines (doors, profile link, room injection, switch removal) |
| Runs | 17 steps, about 3–4 long sessions. Probe time dominates: step 0, 5, 9, 10, 13, 15 each run P.all on 1–2 pages |
| Your time | about 15 minutes in Vercel, about 20 minutes of ear / phone checks, one commit per step |

**Size class:** large in files moved, small in logic. Risk comes mainly from load order and paths, both covered by checks that can fail.

## 11. Alternative B: two separate copies, no shared core

### 11.1 What would be duplicated (real numbers)

| | Lines | Bytes |
|---|---|---|
| All shipped code today | 30,421 | 2.59 MB |
| Night-only (shell, ghost, scene, cycle, effects, ambience, strikes) | 1,440 | 142 KB |
| Full-only by purpose (editor, strip, tutor, song editing, freeze, render, arrange…) | 9,480 | 773 KB |
| The rest, used by both today (`audio`, `scales`, `state`, `gestures`, `vision`, `live`, `ui`, `i18n`, modules…) | 19,501 | 1.67 MB |
| Probes | 9,585 | 0.92 MB |
| Data used by both (modes, tunings, palettes, timbres) | ~165 files | ~0.2 MB |

- **Day one:** a full copy, about 40,000 lines + tools. Everything duplicated.
- **After pruning Night (a big job in itself, the same untangling `core/legacy-ui` postpones):** about 13,000 lines stay duplicated for good, about 1.2 MB: `audio` 2,220, `scales` 1,017, `state` 790, `live` 1,321, `recorder` 791, `transport` 768, part of `song` ~600, `gestures` 1,320, `modules` ~1,290, `engine` 566, `vision` + detector 555, pure ~1,100, `i18n` part ~700, smaller modules. Plus probes for each.

### 11.2 Which recent fixes would have been made twice

An honest reading of WORK-LOG. **Most recent Calm work would NOT have been done twice:**

| Work | Under B | Why |
|---|---|---|
| Crackle fix (RUN 8) | **Once in Night, and still owed in Full** | The log measured Full too (Bowl 1193 underruns). You chose to keep Full at RUN 7, so Full's crackle remains. Fixing it later is a second port of caps and tails in `audio`, `tine`, `modal`, `strikes` |
| Timbre levels | Once | Night's data + a small engine door |
| Fingertip fireflies | Once, and **cleaner** | Today it adds `calmView` branches to `play.js` and `hands.js` |
| Forest work (RUN 9) | Once | Its own files |
| Crossing into Full by mistake | **Could not have happened** | RUN 8 changed Full's records and baselines; a follow-up was needed to restore them exactly. A real point for B, and the reason for §12's opt-in rule |

**What would have been done twice is the foundation**, all from the last weeks of work:

| Work | Files |
|---|---|
| LAT2 / LAT3 hand pump, one frame once, low-light | `vision`, `handdet`, `hand-worker`, `main` |
| CAM-FIX (the camera setting left dark, rule #34) and robust start 0b | `vision`, `core/camlight` |
| SND-F1b our limiter (6 ms latency gone, rule #4) | `audio`, `dyn-worklet` |
| POOL1 chord pool, TIM1–TIM3 timbre records | `audio`, `timbreload`, `data/timbres` |
| AUD1–AUD2 stateless engine, ENG1 contract | `audio`, `modules/**` |
| LIC1, PRIV1 | CSP, tools |
| RUN 7 `modal`, `breath` engines | Night first, then Full offered them |

**And what is ahead is where B hurts most**, all of it on the agreed roadmap: detection in a worker and pinch prediction; the Rust → WebAssembly engine; hearing the room; MIDI; offline packaging of MediaPipe; phone latency fixes. Each one twice, with two sets of GOLD baselines free to drift apart until the two instruments no longer sound or feel alike.

### 11.3 Recommendation: **A, shared core**, with the §12 rules

- **A pays once for the expensive, shared part.** Hand latency and sound engine are the product of both apps, and they are the part still changing most.
- **B's real advantage is isolation,** and RUN 8's slip shows that it matters. The rules and guards in §7 and §12 buy most of it: opt-in core changes, FULL untouched, NIGHT untouched, tree hashes.
- **A's costs are real:** core changes run both apps' checks (twice the probe time on those runs); `core/legacy-ui` stays until emptied; Night downloads Full's code until the debt list shrinks (2.6 MB of source, as it does today).
- **When to reconsider:** if after 3–4 NIGHT runs most of them need core edits, the boundary is wrong. Move the boundary, not to B but to a smaller core.

## 12. Draft "core rules" for `CLAUDE.md` (added by SPLIT-2)

Proposed as a section after "Hard rules", plus hard rule #39 pointing to it.

```markdown
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
6. **Every core change runs both apps' checks:** static, data, `probe-browser --app both --quick`; `--all` on both when it touches sound,
   rendering, recording or tuning data. A report quotes both verdicts and the tree hashes before and after.
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
```

Rule 8 is my addition, not in your list; it stops names like `nightStrikes` from creeping back into core. Rules 9, 10 and 11 make existing practice explicit for two apps. Drop any you do not want.
