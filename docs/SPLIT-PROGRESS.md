# SPLIT-PROGRESS — status of SPLIT-2 (resume here, with docs/SPLIT-PLAN.md)

The user commits; Claude Code runs no git. After each checkpoint: all checks, this file updated, STOP until the user says "committed".

## Decisions (user, SPLIT-2 prompt)
- Plan A (shared core), 17 steps, §12 rules including rule 8. Q1 yes (`core/legacy-ui/`, shrink-only). Q2 yes (switch removed). Q4 yes (rule #37 exception for
  `profile.calm` → `profile.night`). Q9: production = `main` for both projects; `dev` pushes give previews. Other §10.2 questions: the plan's recommendation.
- Addition 1: on-device measurement must work on Vercel PREVIEW builds of both apps (`?probe` kept on previews, or a measurement page).
- Addition 2: six checkpoints, below. A failed check = stop and report; never pass a check by changing behaviour.
- User, after CP A: the three limits below are accepted. Full suite at B, C, E. Light set at D and F: static, path smoke test (at D also on the built `dist/` of both apps), check-licences.
- User, after CP A: at C and at E save before/after PNGs side by side into `tools/split-baseline/` for calm-ghost, calm-dark, calm-forest, calm-forest-land (eye check).

## Checkpoints mapped to plan steps
| CP | Content | Plan steps | Status |
|---|---|---|---|
| A | baseline, guards, smoke, paths made location-independent (no moves) | 0, 12 (moved up: required at every checkpoint), 1 | ✅ committed |
| B | core moves: `src/ → core/`, `core/pure`, `core/legacy-ui` | 5, 6, 7 | ✅ checks pass — WAITING for the user's «committed» |
| C | door inversion, entries, switch removal, app moves, root redirect, probes to tools | 2, 3, 4, 8, 9, 10 | |
| D | `tools/build.mjs`, `vercel.json`, preview measurement | 11 + addition 1 | |
| E | rename Calm → Night | 13 | |
| F | docs split, CLAUDE.md rules, final | 14, 15 | |

## Log
- CP A 2026-11-01: all checks pass (`node tools/split-check.mjs --tag A`; ui-night re-compared after --noisy).
- CP B 2026-11-01: moved by `node tools/split-move.mjs B` (334 files, 185 specifiers). Full run: only ui-night failed (8 differences). Cause measured: two races in the capture (hint timer 9 s; hands before the resize), fixed in `tools/ui-snap.mjs` only; then IDENTICAL to the untouched baseline 3 of 3 (appended to `result-B.txt`). `CLAUDE.md`, `HANDOFF.md` and other docs still say `src/` until CP F: read `src/x` as the map in `tools/split-move.mjs` says.

## How to resume
- Baselines are on this disk, git-ignored: `tools/split-baseline/` (base-full.json, base-night.json, prints.sha256.json), `tools/.ui-snap/split-base-*`. Never re-record them after CP A: they are the proof.
- Run a checkpoint's checks: `node tools/split-check.mjs --tag <X>` (≈ 25 min), summary in `tools/split-baseline/result-<X>.txt`.
- Repo files are CRLF: patch with the Edit tool or line-free patterns.

## Known limits of the checks (said plainly)
- CALM stress: real-time dropouts reported, not judged (`--stress-not-judged`): on this 2-core laptop they vary run to run on unchanged code (the standard app 0–30 in 6 s). Strike caps and offline parts stay strict. Judge on a cool machine or by ear.
- Night screens calm-ghost, calm-dark, calm-forest, calm-forest-land: structure only (differ between two captures of identical code). Forest picture: the user's eye.
- HAND1 and census read «not applicable» on the Night page (live chains differ from the pin); they run on the Full page's P.all.
- P.calm on the Full page was removed from split-check: P.all already runs those rows.
