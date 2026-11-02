# SPLIT-PROGRESS — status of SPLIT-2 (resume here, with docs/SPLIT-PLAN.md)

The user commits; Claude Code runs no git. After each checkpoint: all checks, this file updated, STOP until the user says "committed".

## Decisions (user, SPLIT-2 prompt)
- Plan A (shared core), 17 steps, §12 rules including rule 8. Q1 yes (`core/legacy-ui/`, shrink-only). Q2 yes (switch removed). Q4 yes (rule #37 exception for
  `profile.calm` → `profile.night`). Q9: production = `main` for both projects; `dev` pushes give previews. Other §10.2 questions: the plan's recommendation.
- Addition 1: on-device measurement must work on Vercel PREVIEW builds of both apps (`?probe` kept on previews, or a measurement page).
- Addition 2: six checkpoints, below. A failed check = stop and report; never pass a check by changing behaviour.
- User, after CP A: the three limits below are accepted. Full suite at B, C, E. Light set at D and F: static, path smoke test (at D also on the built `dist/` of both apps), check-licences.
- User, after CP A: at C and at E save before/after PNGs side by side into `tools/split-baseline/` for calm-ghost, calm-dark, calm-forest, calm-forest-land (eye check).

- User, after CP B: at CP F add to the NIGHT backlog: in landscape the low-light hint overlaps the control panel (its OK button sits over the «Звук» label). Also at CP F extend the overlap check (`msgCheck` in `tools/ui-snap.mjs`) so it compares messages with the panel, not only with each other.
- User, after CP C: the embedded `profile.full` start state on the Night page is listed in `core/DEBT.md` (done; pin raised to 7 at the user's request): it goes once Night has its own stress reference.
- User, after CP C: at CP F add to the NIGHT backlog: later bring back a cross-link from Night's info card to the full app as a plain web link to the Handsong site or store page, never as a code import.

## Checkpoints mapped to plan steps
| CP | Content | Plan steps | Status |
|---|---|---|---|
| A | baseline, guards, smoke, paths made location-independent (no moves) | 0, 12 (moved up: required at every checkpoint), 1 | ✅ committed |
| B | core moves: `src/ → core/`, `core/pure`, `core/legacy-ui` | 5, 6, 7 | ✅ committed |
| C | door inversion, entries, switch removal, app moves, root redirect, probes to tools | 2, 3, 4, 8, 9, 10 | ✅ committed |
| D | `tools/build.mjs`, `vercel.json`, preview measurement | 11 + addition 1 | ✅ committed; user: both Vercel projects set up, both dev previews build and open |
| E | rename Calm → Night | 13 | ✅ committed |
| F | docs split, CLAUDE.md rules, final | 14, 15 | ✅ light set passes — WAITING for the user's «committed» |

## Log
- CP A 2026-11-01: all checks pass (`node tools/split-check.mjs --tag A`; ui-night re-compared after --noisy).
- CP B 2026-11-01: moved by `node tools/split-move.mjs B` (334 files, 185 specifiers). Full run: only ui-night failed (8 differences). Cause measured: two races in the capture (hint timer 9 s; hands before the resize), fixed in `tools/ui-snap.mjs` only; then IDENTICAL to the untouched baseline 3 of 3 (appended to `result-B.txt`). `CLAUDE.md`, `HANDOFF.md` and other docs still say `src/` until CP F: read `src/x` as the map in `tools/split-move.mjs` says.
- CP C 2026-11-01: two apps run from `apps/full/` and `apps/night/`. Full run (`--tag C`): `compare-night` and `ui-night` failed. Causes, tools only: three wrong names in the declared request list; the 7-s effects hint raced the capture. After the fixes: both compares PASS on the same run's data; ui-night IDENTICAL to the untouched baseline 3 of 3. Eye check: `tools/split-baseline/side-by-side-C/`.
- Decisions at CP C: the embedded start state `profile.full` stays on both pages, reachable only by probes (no button), so Night's rows keep their round trip and `CALM stress` keeps its reference. `userfiles.js` went to `tools/probes/core/` (console tool under `?probe`). `kit.js` is in the core probe suite (core rows use it). `run.js` gets the song side from Full's facade (`runWire`). Names stay `calm` until CP E. The new row «NIGHT profile round trip» holds C0's Night checks; C0 on Full uses `tools/probes/core/fixture.profile.json` (31 → 13 cases on Full; the other 29 run on Night).
- CP D 2026-11-01: light set (`node tools/smoke-paths.mjs --build`, static, licences) plus the real probes on built previews (`probe-browser --root tools/.build/<app>-preview`). Decision: Night's Measure button stays on production too (plan Q3) until `HANDSONG_EDITION=release`.
- Measurement on a phone, previews of both apps: `<preview URL>/` for the app, `<preview URL>/?probe` for `window.P` (Android: Chrome on the desktop, `chrome://inspect`, USB). Night: ⓘ → «Measure this device». Full has no Measure button: Sound panel → Diagnostics → Latency meter.
- CP E 2026-11-02: rename done; full suite PASS, all 12 checks (`tools/split-baseline/result-E.txt`); side-by-side PNGs in `tools/split-baseline/side-by-side-E/`.
- CP F 2026-11-02: docs split, details in `docs/core/WORK-LOG.md`. This file and the plan now live in `archive/`. Light set per the user, plus the data probes and one Night capture.

## How to resume
- Baselines are on this disk, git-ignored: `tools/split-baseline/` (base-full.json, base-night.json, prints.sha256.json), `tools/.ui-snap/split-base-*`. Never re-record them after CP A: they are the proof.
- Run a checkpoint's checks: `node tools/split-check.mjs --tag <X>` (≈ 25 min), summary in `tools/split-baseline/result-<X>.txt`.
- Repo files are CRLF: patch with the Edit tool or line-free patterns.

## Known limits of the checks (said plainly)
- CALM stress: real-time dropouts reported, not judged (`--stress-not-judged`): on this 2-core laptop they vary run to run on unchanged code (the standard app 0–30 in 6 s). Strike caps and offline parts stay strict. Judge on a cool machine or by ear.
- Night screens calm-ghost, calm-dark, calm-forest, calm-forest-land: structure only (differ between two captures of identical code). Forest picture: the user's eye.
- HAND1 and census read «not applicable» on the Night page (live chains differ from the pin); they run on the Full page's P.all.
- P.calm on the Full page was removed from split-check: P.all already runs those rows.
