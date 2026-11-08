# HANDOFF — Handsong, the index (read at the start of every session, then your track's handoff)

Two apps, one engine. Rules: `CLAUDE.md`. Every run belongs to one track: `CORE-n`, `FULL-n` or `NIGHT-n`, counted separately (`NIGHT-0` is history, so Night starts at `NIGHT-1`).

| Track | Folder | Read | Where it stands |
|---|---|---|---|
| **CORE** | `core/` | `docs/core/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md` | Stage 3 foundation, `CORE-1` (hand calibration), `CORE-3` (lean path), `CORE-4` (quiet floor), `CORE-5` (Night texts, icon), `CORE-6` (far hands, draw hook), `CORE-7` (sound module door), `CORE-8` (scene host out of core), `CORE-9` (Music texts), `CORE-10` (room settings texts) done, all opt-in. Step 125 open on Night and the Poco. |
| **FULL** | `apps/full/` | `docs/full/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md`, `UI-MAP.md`, `UX-INVENTORY.md` | Waits for the first release. Next: stage 5 (saving, export, audio take, mixer) and the calibration screen. |
| **NIGHT** | `apps/night/` | `docs/night/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md`, `STAGE4-NIGHT-plan.md`, `QUALITY.md` | The first public release. RUN 9 done. `NIGHT-1` stages 1–3 done (Poco page later). `NIGHT-2` calibration screens built (stage 3), waiting for step 129 (five checks, laptop + Poco). `NIGHT-3` (rooms, music bed, switching): stages 2–4 done (room module, music bed; step 130 checked); stage 5 part 1 (settings) done, part 2 (switching) waits for approval. Then steps 120–124, C8 rest, C9, C10, C12. |

**Handsong** is a gesture synthesizer and tuning tutorial in the browser: camera → MediaPipe → pinches → Web Audio, with a multitrack recorder, piano roll and lessons. **Handsong Night** (code id `night`) is the quiet one: a night forest played with the hands, free, nothing leaves the device.

**Who does what:** the user commits; Claude Code never runs git, not even read-only. A strategist writes the prompts and explains in Russian. Terminal replies are in English.

**Deploy:** two Vercel projects, `HANDSONG_APP=full` and `HANDSONG_APP=night`. `dev` pushes give previews, which keep `?probe` for on-device measurement. Full's production builds `main`; `handsong-night`'s builds `night-release`, a stopper copy of the old `main`. Merging `dev` into `main` updates only Full's production, and neither new app goes public yet (`CLAUDE.md`, Build and deploy). Build: `tools/build.mjs`.

**Local addresses (Live Server):** `http://127.0.0.1:5500/apps/full/`, `http://127.0.0.1:5500/apps/night/`; add `?probe` for `window.P`.

**History:**
- `archive/HANDOFF-history.md` — every past record; the whole old handoff is its last section.
- `archive/WORK-LOG-before-split.md` and `archive/NIGHT-RUN-LOG-2026-10.md` — the frozen logs, under the old name.
- `archive/SPLIT-PLAN.md` and `archive/SPLIT-PROGRESS.md` — how the two apps were split.
- `archive/CLAUDE-history.md` — the full module map, architecture, known limits and verification steps.

Those archive files keep the old paths and the old product name. `docs/core/STALE-NAMES.md` maps them.
