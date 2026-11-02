# HANDOFF — Handsong, the index (read at the start of every session, then your track's handoff)

Two apps, one engine. Rules: `CLAUDE.md`. Every run belongs to one track: `CORE-n`, `FULL-n` or `NIGHT-n`, counted separately (`NIGHT-0` is history, so Night starts at `NIGHT-1`).

| Track | Folder | Read | Where it stands |
|---|---|---|---|
| **CORE** | `core/` | `docs/core/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md` | Stage 3 foundation done. Next: `CORE-1`, hand calibration and per-effect sensitivity in the engine. |
| **FULL** | `apps/full/` | `docs/full/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md`, `UI-MAP.md`, `UX-INVENTORY.md` | Waits for the first release. Next: stage 5 (saving, export, audio take, mixer) and the calibration screen. |
| **NIGHT** | `apps/night/` | `docs/night/HANDOFF.md`, `BACKLOG.md`, `WORK-LOG.md`, `STAGE4-NIGHT-plan.md`, `QUALITY.md` | The first public release. RUN 9 done. Next: the user's checks of steps 120–124, then C8 rest, C9, C10, C12. |

**Handsong** is a gesture synthesizer and tuning tutorial in the browser: camera → MediaPipe → pinches → Web Audio, with a multitrack recorder, piano roll and lessons. **Handsong Night** (code id `night`) is the quiet one: a night forest played with the hands, free, nothing leaves the device.

**Who does what:** the user commits; Claude Code never runs git, not even read-only. A strategist writes the prompts and explains in Russian. Terminal replies are in English.

**Deploy:** two Vercel projects, `HANDSONG_APP=full` and `HANDSONG_APP=night`. Production builds from `main`; `dev` pushes give previews, which keep `?probe` for on-device measurement. Build: `tools/build.mjs`.

**Local addresses (Live Server):** `http://127.0.0.1:5500/apps/full/`, `http://127.0.0.1:5500/apps/night/`; add `?probe` for `window.P`.

**History:**
- `archive/HANDOFF-history.md` — every past record; the whole old handoff is its last section.
- `archive/WORK-LOG-before-split.md` and `archive/NIGHT-RUN-LOG-2026-10.md` — the frozen logs, under the old name.
- `archive/SPLIT-PLAN.md` and `archive/SPLIT-PROGRESS.md` — how the two apps were split.
- `archive/CLAUDE-history.md` — the full module map, architecture, known limits and verification steps.

Those archive files keep the old paths and the old product name. `docs/core/STALE-NAMES.md` maps them.
