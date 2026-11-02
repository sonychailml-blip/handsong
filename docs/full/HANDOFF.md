# HANDOFF — FULL track (`apps/full/`, Handsong)

Index: `/HANDOFF.md`. Rules: `CLAUDE.md`. Open items: `docs/full/BACKLOG.md`. Screens: `docs/full/UI-MAP.md`, `docs/full/UX-INVENTORY.md`. The old handoff, word for word: `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2». Most of Full's code is still in `core/` and `core/legacy-ui/` (`core/DEBT.md`).

## Current state (✅ done · "unverified" = not yet checked by the user in a browser)
- ✅ Base instrument (tunings, palettes, rectangles, split, hand functions, expression, 3 synthesis paths, FDN reverb, backing, lessons, i18n, PWA) · Recorder S1–S3.5e · Piano roll S4.0–S5.6, E0–E2 · Chord as notes U1–U6 · Solo/chord editing S0–S7 (S4–S6 unverified) · Effect ownership O-0…O-4 · Freeze F0–F5 · One role/timbre per track T0–T5 · Voice modes P1, P2, V1–V5 · Frozen sound = live · Smooth automation + fine recording · Brightness on every role · "Tuned from" P0–P4 (P5 postponed) · Universal tuning model T0–T6, T4a–T4c (note stores `a.ti`) · T5 dimmed rows · T7/T7b chord modes (T7 unverified) · U5 insert · Tunings as files F0–F8 (106 data files) · Demo piece `P.song('triphop')`.
- ✅ AF1 freeze queue (verified on desktop) · LR1 live reverb (accepted by ear) · AF2 swap and AF6b 16-bit (runner; ear steps 64, 65) · AUTO-PROBE runner and fixes (ear step 66) · Volume VOL-0…VOL-6 (closed by the user's test 2026-10-14; VOL-7 after stage 5).
- ✅ Unverified (runner PASS; the user's steps in brackets): track strip larger than the screen, AR1, MX1, MX2, AR2 · AF3 auto-freeze (67), AF4 no ❄ (68), RENDER-LEAK, AF5 + rule #31 (69 closed 2026-10-13; 70 open) · ED1–ED4 (71–74), ED5–ED6 (75–77), ED7 + OWN2 (78, 79), ED7-fix, BEND-CURVE, OWN1 (80–82), ED7-fix2 (83) · TF2, TF3 (84–87), TF3b, TF4, TF5 (88–90). Stage 2 closed 2026-10-14.
- The Full ↔ Night switch is gone since SPLIT-2: the agreed visible change. `FULL untouched` proves the rest.

**What a track holds today:** notes (tuning index + register, volume, type, frozen tuning view), exactly one role, one timbre (permanent id in `a.inst`/`a.kit`, TIM2), one view; per-note values inside notes; chain capture per take; may be frozen to a buffer.

## Decided, not built
**Tracks:** a track stores notes and timbre, not sound (MIDI principle); each sound source is its own track; next, source = the timbre assigned to a finger (only `recorder.noteSource` changes). After recording the chain belongs to the track; live, effects will belong to the timbre (chains move from role to timbre; a track has one chain at a time). Timbres are records (TIM3): a new timbre = a file in `core/data/timbres/` + the bundle.

**Mixer:** second face of the arrangement window + master strip (master = what audio export renders); fader ≠ note volume; per-track effects and meters after auto-freeze. **Audio take** comes after auto-freeze (the role network must carry only live sound).

**Hearing the room** (MX2; BACKLOG §7.11): the mic follows the room's key or each chord and its tuning (sets A4). Traps: freeze the tonic first; follow chords in a chromatic view; echo cancellation. Key detection written by us.

**Saving, user's decision** (AF1; BACKLOG §3.35): the song is the person's work, frozen audio a cache; draft vs project, autosave + versions, `storage.persist()`.

**Product direction** (BACKLOG §7): timbres then songs on a server (device = cache); paid = what goes through the server; our open versioned timbre format is the truth (export: samples, Scala), planned before the builder; user modes via Scala; app as a MIDI controller.

**Timbre builder** (stage 7; BACKLOG §7.13): 48 gesture addresses, one-AudioWorklet engine for play / freeze / export, multisample export.

**Bass and solo are one instrument:** they differ by voice builder and register; other differences are policies that belong in the timbre format as data. Code mirrors, not merges, until then. Chords and drums are their own families.

**VOL-7:** per-note pan (own plan; a stereo stage in each voice; ≠ track pan), after stage 5.

## Work order (user decision: "editor before the timbre builder")
Done through stage 3 (core) and stage 4 in progress (Night). For Full, after Night's first release: **5** saving (on the device + file export/import; same format and ids), export with Scala, audio tracks and audio take, mixer per-track effects and meters, AF6 rest, «Listen», WASM effects → **VOL-7** → **6** MIDI controller → **7** new-engine instruments, timbre builder, user modes with Scala, sampler → **8** server (accounts, sync, sharing, subscription, marketplace). Off-line, when there is a window: promo video (§3.31) · Spanish / German (§3.18) · Turkish maqams (§3.25).
**Last stage, after everything else is built: lessons / tutorial update** (user). No lesson or tutorial edits before it.

## Records (English, at most about 15 lines each; older ones go to `archive/HANDOFF-history.md`)
None yet under FULL-n. The first is `FULL-1`.
