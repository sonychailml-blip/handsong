# CLAUDE.md lines rewritten in place at DOC2 (2026-11-09) — their old wording, verbatim

DOC2 moved reference sections of CLAUDE.md to docs/core/MODULE-MAP.md, TOOLS.md and STEPS.md (word for word) and rewrote these lines
in place to point there. Kept here so `tools/doc-split-check.mjs archive/CLAUDE-before-DOC2.md …` proves nothing was lost.

No unit tests. Claude Code runs the static check, `node tools/probe-data.mjs` and `node tools/probe-browser.mjs` per the probe budget,
fixes failures until PASS and quotes the verdict lines. The user does the steps below that need ears, a camera with hands, or a phone,
plus a manual `await P.seed({replace:true})` + `await P.all()` about weekly. Never report a change as done without naming the steps not
verified. Full text of every step: archive, "How to verify a change".
  ⛳ DOC1 (user, 2026-10-17): this file stays ≈ 60 KB — rules, conventions, the SHORT module map, the step index. A new module gets one
  line in the short map; new architecture / module / probe-row / known-limit detail and a new step's full text go to
  `archive/CLAUDE-history.md` under the matching section (moved word for word at DOC1 — `tools/doc-split-check.mjs` proved it; later
  slices update a stale line there in place AND copy the old line verbatim to its section «Superseded at DOC1», so the check
  `node tools/doc-split-check.mjs archive/CLAUDE-before-DOC1.md CLAUDE.md archive/CLAUDE-history.md` keeps passing exactly).
Guidance for Claude Code in this repository. SHORT by design (DOC1, 2026-10-17): the standing working rules, conventions, hard
rules, a short module map and the verification-step index. Everything else — the full module map, the architecture sections, known
limits, the full text of every verification step — moved WORD FOR WORD to `archive/CLAUDE-history.md` (index below; grep it by
section title). The long reasoning behind each section: `archive/CLAUDE-full.md`. State, open decisions, work order: `HANDOFF.md` (the index), then `docs/<track>/HANDOFF.md`.

NIGHT-7b (2026-11-11), `docs/core/MODULE-MAP.md` (the ghost light deleted):
  `ghost.js` the first-run ghost light; `night.css`; `data/night.json` profile; `fonts/` (OFL, register entries); `vendor/three-r128/` (lazy); `pure/cycle.js` (the 24-min night `nightAt`, sleep `nightDeep`, the moods' easing, rare events, emblem), `rooms/forest/pure/forestlife.js` (stream, mushroom / flower places, rings), `rooms/forest/pure/fireflies.js`;
  `fxParamsOf`, `looper.js`, `roles.js` stateless helpers, `hands.js` the state machine `HANDS`/`processHands`, `pose.js` the pose generator: HAND1 and the ghost).

NIGHT-12 (2026-11-12), `CLAUDE.md` «Build and deploy» (Night's test build at night.handsong.app):
- ⛳ **Build and deploy** (SPLIT-2): `HANDSONG_APP=full|night node tools/build.mjs` writes one app into `dist/` (no other app, no tools). Previews (`VERCEL_ENV=preview` or `--probes`) keep `?probe`; production has no probes. `HANDSONG_EDITION=release` hides the development items. `vercel.json` is shared by two Vercel projects (`HANDSONG_APP=full`, `=night`); previews from `dev`. ⛳ Production branches differ (user, 2026-11-02): Full's project builds `main` (handsong.vercel.app); `handsong-night` builds `night-release`, a stopper branch that is a copy of the old `main`. So merging `dev` into `main` updates only Full's production. Neither new app goes public yet: `main` stays the old public version until the new Full is ready, and Night's public home (Vercel or another host) is not decided. Whenever a page, path or build changes: `node tools/smoke-paths.mjs` (`--build`: also the built trees).

DESIGN-1 (2026-11-12), `CLAUDE.md` «Check levels», Level 1 (Night gained `--ui-only`):
    `node tools/probe-data.mjs`, that app's UI checks (Full: `node tools/probe-browser.mjs --quick`; Night: `--app night` — no lighter Night mode
    exists yet, so on Night Levels 1 and 2 run the same command). A docs-only change: the static check, the data runner and its proofs.

SITE-1 (2026-11-13), `CLAUDE.md` «Build and deploy» (the brand site added):
- ⛳ **Build and deploy** (SPLIT-2): `HANDSONG_APP=full|night node tools/build.mjs` writes one app into `dist/` (no other app, no tools). Previews (`VERCEL_ENV=preview` or `--probes`) keep `?probe`; production has no probes. `HANDSONG_EDITION=release` hides the development items. `vercel.json` is shared by two Vercel projects (`HANDSONG_APP=full`, `=night`); previews from `dev`. ⛳ Production branches differ (user, 2026-11-02): Full's project builds `main` (handsong.vercel.app); `handsong-night` builds `night-release`, which carries Night's test build for the first testers (the user pushes it; NIGHT-7). ⛳ Night's test build lives at https://night.handsong.app (user, NIGHT-12, 2026-11-12; `handsong-night.vercel.app` still works). So merging `dev` into `main` updates only Full's production; `main` stays the old public version until the new Full is ready. Whenever a page, path or build changes: `node tools/smoke-paths.mjs` (`--build`: also the built trees).

SITE-1 (2026-11-13), `CLAUDE.md` «Check levels», Level 1 (the site's check added):
  - **Level 1 — texts, styles, docs, small interface changes in one app:** `node tools/check-static.mjs` (+ `node --check` on changed files),
    `node tools/probe-data.mjs`, that app's UI checks (Full: `node tools/probe-browser.mjs --quick`; Night: `--app night --ui-only` — the start, cards,
    settings, coaching and texts checks with real input, no `P.night` renders; DESIGN-1). A docs-only change: the static check, the data runner and its proofs.

SITE-1 (2026-11-13), `CLAUDE.md` «Two apps, one core» (the SITE track added):
⛳ Handsong (`apps/full/`) and Handsong Night (`apps/night/`, code id `night`) share `core/`. Every run belongs to ONE track: CORE-n, FULL-n or NIGHT-n.
Run names and logs: `CORE-n`, `FULL-n`, `NIGHT-n`, counted separately (`NIGHT-0` is history; Night starts at `NIGHT-1`). If a NIGHT or FULL run needs a core change, that part is a small `CORE-n` with its own record and both apps' checks. Each log entry in `docs/<track>/WORK-LOG.md` starts: track, number, date, tree hashes before and after.
