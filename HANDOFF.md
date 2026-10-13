# HANDOFF — Handsong, current state (read at the start of every session)

Concise English. Full reasoning and every past slice record: `archive/HANDOFF-history.md` (Russian, verbatim; part A = the
Russian Part I before DOCS-EN, part B = all history). Search it by slice name with `grep`. Where the archive disagrees with
this file or `CLAUDE.md`, this file and `CLAUDE.md` win. Code model, rules (31 hard rules), 72 verification steps: `CLAUDE.md`
(its long reasoning: `archive/CLAUDE-full.md`). Also: `UI-MAP.md` (screen map), `BACKLOG.md` (all tasks; §1 foundation,
§7 product direction; English index on top), `archive/` (finished plans). Stale names: list at the head of archive B,
«ПРЕЖНЯЯ ЧАСТЬ I».

## How we work
- The user drives Claude Code in VS Code; a strategist assistant writes English prompts, checks plan and diff against REAL code,
  and explains everything to the user in Russian. The user does not read code comments or these files.
- After a plan is approved, the prompt says "implement now, don't stop at plan" — otherwise only a plan comes back.
- One step = one change = one check = one commit (docs need no browser). Only the user commits; Claude Code never runs git.
  Claude Code runs the app ONLY through the probe runners.
- Always read current `src/` before editing; memory and old line numbers lie.
- Prompts English, chat with the user Russian, terminal replies English (Cyrillic breaks there). Phone:
  `npx cloudflared tunnel --url http://localhost:5500`, cache bust `?v=N`.
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts; user's rule, AF2), not for AF/ED/AR/MX or record slices. Planned: the
  foundation plan (before stage 3: song format, draft/project, folder/file/server, versions, migration); hearing the room (before
  stage 5); the synthesis core (before stage 7 or earlier: one AudioWorklet, band-limited, live = freeze = export); latency and hands
  (smoothing, frame wait, output buffer); a deep code review + type-checking prep every few months.
- **Probes before every report — Claude Code runs them itself** (user's rule, AUTO-PROBE; probe budget DOCS-EN): see
  `CLAUDE.md` "Standing working rules". The user does only ear, camera/hand and phone steps, plus a manual `await P.all()`
  about weekly as a cross-check. In the console `P` is locked: while a probe (or `P.seed`) runs, other `P.*` calls refuse.

## The project
Browser gesture synthesizer and tuning/scale tutorial: camera → MediaPipe → pinches play solo/chords/bass/drums and drive
effects; sound = Web Audio. On top: linear multitrack recorder, piano roll with automation lane, track freezing, six lessons,
English + Russian UI; GitHub Pages, PWA. 22 ES modules in `src/`, no build (+ probe `scaleprobe.js`, demo `songs.js`);
74 modes, 18 tunings. Target: phone, portrait. Branch `dev`, main `main`. User's philosophy: "clear base, clear foundation,
then grow"; teach how music works; don't chase quantity.

## Current state (✅ done · 🔵 in progress · 🟡 partial; "unverified" = not yet checked by the user in a browser)
Details of every arc: archive B by name; code model: `CLAUDE.md`.
- ✅ Base instrument (tunings, palettes, rectangles, split, hand functions, expression, 3 synthesis paths, FDN reverb, backing,
  lessons, i18n, PWA) · Recorder S1–S3.5e · Piano roll S4.0–S5.6, E0–E2 · Chord as notes U1–U6 · Solo/chord editing S0–S7 (S4–S6
  unverified) · Effect ownership O-0…O-4 · Freeze F0–F5 · One role/timbre per track T0–T5 · Voice modes P1, P2, V1–V5 · Frozen
  sound = live · Smooth automation + fine recording · Brightness on every role · "Tuned from" P0–P4 (P5 postponed) · Universal
  tuning model T0–T6, T4a–T4c (note stores `a.ti`) · T5 dimmed rows · T7/T7b chord modes (T7 unverified) · U5 insert · Tunings as
  files F0–F8 (106 data files; F1, F3–F7 unverified; F7 snapshot to renew, change f7) · Demo piece `P.song('triphop')`.
- ✅ unverified: Track strip larger than screen (`P.checkTracks`) · AR1 arrangement window (`P.checkArrange`) · MX1 track level +
  master (`P.checkMixer`) · MX2 track pan (`P.checkPan`) · AR2 names, colours, order (`P.checkTrackLook`).
- ✅ AF1 freeze queue, console only (verified on desktop) · LR1 live reverb = render wiring (accepted by ear) · AF2 events→buffer
  swap and AF6b 16-bit frozen tracks (verified by the runner; ear steps 64, 65) · AUTO-PROBE runner and fixes (ear step 66).
- ✅ unverified: **AF3 auto-freeze watcher + triggers (ON by default)** and **AF4 no ❄ anywhere** (runner PASS; ear/eye steps 67, 68) ·
  **RENDER-LEAK** (non-KS renders no longer pin memory) · **AF5 + hard rule #31: a track and the live hands never share sound state**
  (runner PASS; ear step 69 REPORTED FAILING by the user — mixer track level lowers live chords — not reproduced in the runner; open
  questions: transport playing? the MASTER strip? deployed or local build? `R.liveCheck()` output — archive B, «AF5-mixer»; step 70 open).
- ✅ unverified: **ED1 several notes at once** and **ED2 copy / paste / duplicate** (runner PASS; eye steps 71, 72).
  🔵 Volume VOL-0…VOL-4: **next VOL-5…VOL-7**.

**What a track holds today:** notes (tuning index + register, volume, type, frozen tuning VIEW), exactly one role, one timbre
(index in `a.inst`/`a.kit`), one view; per-note values inside notes; chain capture per take; may be frozen to a buffer.

## Open decisions and user directions (decided, not built)
**Tracks** (archive B, «Принятое по дорожкам»): a track stores NOTES and TIMBRE, not sound (MIDI principle); each sound source is
its own track; next, source = the timbre assigned to a FINGER (only `recorder.noteSource` changes). After recording the chain
belongs to the TRACK; live, effects will belong to the TIMBRE (chains move from role to timbre; a track has ONE chain at a time).
⛔ No new SOLO timbre, not even appended, until stable timbre ids exist (KS block is the tail of `LEAD_INSTR`).

**Auto-freeze** (plan AF1–AF6: archive B, «ПЛАН „АВТОЗАМОРОЗКА“ (пересмотр при LR1)»; AF6 detail: «AF1»): a track freezes itself
once it settles (all but the track being recorded), unnoticed. Done AF1–AF4, AF6b (AF1: worst layout 6.3 ms drums L16, typical 0.8 ms,
under the 8 ms pinch budget; phone not measured). Done AF5 (tracks play through their role's TRACK chain, rule #31). Next: AF6 memory.
**AF3 decisions (user, do not reopen):**
tonic/A4/tempo do NOT re-freeze until the tonic freeze (`frzqueue.AF_REFREEZE_ON_RETUNE = false`; such tracks play live); a track
created in the editor gets the live chain pinned at birth, inserts into an existing track inherit its chain, auto-freeze never pins (song
load pins old chain-less tracks; seed: 0); memory guard until AF6 `AF_BUDGET_MB` 300 touch / 1024 desktop, over it = skipped, no
eviction; ON by default, `R.autoFreeze(false)` off for the session; paused while any probe runs. User decisions (AF1): no mono (pan baked); frozen sound is a CACHE recomputable from notes;
(a) store only notes + tail, a track repeating under the brace — ONE cycle; (b) 16-bit in memory, sample-exact chunks (✅ AF6b);
(c) later, after saving — on the device in chunks, survives reload (project folder, else browser cache); (d) Opus only as an
optional low-memory mode, never default, never MP3 (encoder padding breaks joins); memory budget only as a safety net · freeze the
TONIC before any tonic/A4/tempo trigger (until then AF3 doesn't re-render on them) · swap: first rest within 2 bars, else bar line
+ 20 ms crossfade (✅) · AF4: a pale dot by the row ONLY in the arrangement window (hollow = waiting, pulsing = rendering) ·
re-render order: audible and near the playhead first (✅ `qRank`) · a track with no captured chain gets the LIVE chain's snapshot AT
BIRTH and never follows live knobs again (inserted notes follow the track's chain; solo notes copy the neighbour's map; plan in AF3)
· settle delays 0.5 / 1.0 / 1.5 s.

**Mixer**: second face of the arrangement window + MASTER strip (master = what AUDIO EXPORT renders); fader ≠ note volume;
per-track effects and meters after auto-freeze. **Audio take** comes AFTER auto-freeze (the role network must carry only live sound).

**Hearing the room** (MX2; release candidate; BACKLOG §7.11): the mic follows the room's KEY or each CHORD and its TUNING (sets A4).
Traps: freeze the tonic first; follow chords in a CHROMATIC view; echo cancellation. Key detection written OURSELVES.

**Product direction** (full: BACKLOG §7): timbres then songs on a SERVER (device = cache); paid = what goes through the server; our open
versioned TIMBRE FORMAT is the truth (export: samples, Scala), planned before the builder; user MODES via Scala; app as a MIDI controller;
main tech debt: hand tracking off the main thread (§3.32). **Songs as FILES** (BACKLOG §1): need stable timbre ids, the tonic in the song,
a versioned format; `src/songs.js` becomes the first song file.

**Strategy — proposed, awaiting the user** (BACKLOG §7.12): first public release after stage 5; free → "Plus" → packs → "Pro".
**Timbre builder** (stage 7; BACKLOG §7.13): 48 gesture addresses, one-AudioWorklet engine for play/freeze/export, multisample export.

**Bass and solo are one instrument**: they differ by voice builder and register; other differences are policies that belong in
the TIMBRE FORMAT as data. Code MIRRORS, not merges, until the timbre format. Chords and drums are their own families.

**Volume — remaining plan** (archive B, «ПЛАН „ГРОМКОСТЬ КАК ПАРАМЕТР“»): VOL-5 — the playing hand's horizontal always active
(not only under a pinch); per-hand values of other per-note parameters on axes. VOL-6 — latch follower: volume and brightness
reach a ringing latched chord AND are recorded as `chSet` (new event writer: quantise, order guard `chLastT`, count-in refusal,
seam closing; rule #30 — `a.vol` always). VOL-7 — PER-NOTE pan (own plan; stereo stage in each voice); note pan ≠ track pan.

**Live reverb (LR1)**: accepted by ear; old wiring removed in AF1. More space only as an honest reverb PARAMETER (width/decorrelation,
size, diffusion), the same live and frozen; never the old wiring back (BACKLOG §3.9b).

**Saving — user decision** (AF1; with the FOUNDATION; full: BACKLOG §3.35): the song is the person's work, frozen audio a cache.
"Draft" vs "Project — saved in …" (project folder via File System Access, project file, later an account); autosave + versions,
write-then-replace, one editing tab, `storage.persist()`, honest warnings.

**Solo editing — arc closed** (S0–S7). Leftover bass/solo differences are timbre-format policies (BACKLOG §7.4). Postponed: a
triad/seventh switch for untyped modes.

**Editor essentials** (archive B, «ПЛАН „НЕОБХОДИМОЕ РЕДАКТОРУ“»; 7 user decisions as recommended): ✅ AR1 → ✅ MX1 → ✅ MX2 → ✅ AR2 →
✅ ED1 selection → ✅ ED2 copy → **ED3 quantise (NEXT)** → ED4 by degrees → ED5 volume bars → ED6 sections → ED7 one undo; then OWN1 mode
by degrees, OWN2 bend curve. Decisions: quantise inside a line moves the boundary (glissando intact); by degrees — an out-of-mode
note keeps its offset; ONE undo for everything (mixer, names, row delete; ⤺ is an ordinary step).

**Tuning — rest of the model** (archive B, «ПЛАН „УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ“»): **DON'T NARROW MUSICAL POSSIBILITIES** (T7b) —
offer a theory restriction as a MODE, not a rule · **chord-building property** for the builder: ADAPTIVE (pure ratios, a choir) or
FROM THE TUNING (an instrument); only mobile Natural is adaptive; `chordBuild` / `scales.chordBuildOf` (absent ⇒ from the tuning)
· **scale-panel principle** (F6b): every panel switch comes from the MODE'S DATA (declared field, validated in `scaleload.js`),
never from code · **tunings as files**: a song will store a COPY of each tuning it uses; files from others are untrusted ·
**Scala readiness**: exact ratios as data (started), names as data (✅ F3), import normalisation, a round-trip probe (equal → generator
form) · a mode may need a "central tone" (Lima/Nem patets) — study with musicians.
**Tonic** (user decision): THE TONIC IS FROZEN IN THE EVENT (own plan): the drone follows the event's view; fixed tunings' key goes
into the index (or view); transposing a song = an editor "by degrees" edit with undo. **Tuning anchor** (MX1; with that plan;
serves Scala `.kbm`): for non-12 tunings the tonic means "where 1/1 is" — any frequency (Partch 1/1 = G 392 Hz; Sa to the singer);
12 notes stay the main choice plus a cent offset or Hz; a tuning may declare its historical anchor (data field); the control then
reads "1/1 = G".

## Work order (user decision: "editor before the timbre builder")
✅ U5 → ✅ T7 → ✅ T7b → ✅ TUNINGS AS FILES F0–F8 (decided: before solo editing) → ✅ S4–S7 → **EDITOR ESSENTIALS** (window and mixer
first; ED3 next) → **EDITOR-OWN** (mode by degrees; cent offset per row; theremin bend curve) → **TONIC FREEZE plan** →
**VOL-5 → VOL-6 → VOL-7** → **FOUNDATION** (stable timbre ids (and user-mode ids), song format and timbre format — voice mode and
Glide default are the first "timbre policies" —, songs as files: export/import) → **SAVING** (on the device + file export/import;
does not wait for the server — same format and ids) → **AUTO-FREEZE A3–A6 (A7 if measured), MIXER per-track effects and meters,
AUDIO EXPORT** (with the tuning attached as Scala) and **AUDIO TAKE** (after auto-freeze) → **MIDI CONTROLLER** → **TIMBRE BUILDER
and USER MODES with Scala** → **SERVER** (accounts, sync, sharing timbres and modes, subscription, marketplace; a managed cloud
service makes it cheaper). Off-line, when there is a window: hand tracking off the main thread (after latency is measured, §3.32)
· promo video (§3.31) · Spanish/German (await terminology check, §3.18) · Turkish maqams (§3.25).

## Decided, not scheduled
Hand tracking off the main thread · register as a setting (bass/solo differ only by timbre) · timbres on fingers (source = finger's
timbre; `recorder.noteSource`) · merging bass/solo code and voice mode as timbre data (wait for the timbre format) · 7-note
Pythagorean mode (P5, postponed; appended at the end) · voice-leading lines between chords · triad/seventh switch for untyped modes
· retrigger in lead mode (legato everywhere today) · study Arabic, Indian and other traditions with musicians (mode anchor,
intonation, central tone, what a chord means) · team ideas: two UI faces, hand on a rest, mode lessons, spoken menu, light theme ·
small: settings in localStorage, SW cache for offline, polyrhythm (§3.24), swing as a ratio (§3.30), gesture builder (§3.29),
cultural gate for "Drums only" (§3.33 item 1 — a defect).

## Known limits and debts (reasoning: `CLAUDE.md` "Known limits", archive)
- Nothing can be saved (song lives in the session; timbres have no ids; an event's mode is a view reference). The tonic is live
  (changing it transposes recordings). The app does not work offline (SW caches nothing; MediaPipe from a CDN). Hand tracking on
  the main thread; hand→sound latency not measured.
- Roll: theremin bend only shown/trimmed (EDITOR-OWN); unison/theremin tie pairs untie all candidates of that beat (S6); dissolve
  and lead-segment detach re-articulate edges; overlapping polyphonic notes on one row — the hit takes the first.
- One effect network per role: live play goes through the network the recording drives (bus params only). Reorder mid-take: render
  keeps the earlier order (`reordered`). Effects added mid-take: ▲▼⊘ don't act. Latched chord with open fingers gets no updates (VOL-6).
- Not undoable: row delete ✕ (and its S6 untie), track name/place, level, pan (one history — ED7). The editor's history and the
  ED2 clipboard: history dies with the editor session, the clipboard lives for the app session; captured bus automation is not copied.
- Captured expression channels are written but NOT replayed (`fxPlaySet` drops `'expr'`) — BACKLOG §4.
- Play-strip name column: timeline 261 → 203 px at 380 px; ≈ 33 px for the name, then ellipsis.
- Frozen memory: 16 bit (192 KB/s stereo at 48 kHz); seed 99.4 MB → ≈ 49.4–49.7 MB (`P.freezeCost`, "today MB"); notes+tail would
  save ≈ 3 MB; demo piece ≈ 280 → ≈ 140 MB; rest of AF6 (disk, paging, Opus fallback) open. No worklet → Float32 (2× memory).
- AF2 bar-line crossfade: pre-scheduled drum tails and the role's live reverb tail play over the buffer's tails (hundreds of ms).
- After tonic/A4/tempo change frozen tracks go stale and play through the live pools (stealing above the ceiling).
- A render of a KS (plucked solo) track still pins its offline context, ≈ 6 MB per render (Chrome; no workaround found) — BACKLOG §1 AF6 7.
- Unfrozen tracks of one role share the role's TRACK chain (last writer wins among them); per-track chains not built (BACKLOG §1).
- AF5 adds ≈ 100 GainNodes to the live graph (≈ +4 % real time on the slow dev desktop, synthetic; phone not measured).
- Re-render repeatability: dry ≤ 1e-4, wet ≤ 2e-4 of peak; dry drift up to 1.54e-5 (≈ −96 dB) after many renders, node unknown.
- Lanes: a note edit doesn't rebuild its ramp; an anchor only where no event; Glide over bass theremin smooths its steps. Bass
  theremin records the nearest step only. `tmix` timbre fold correct until ids.
- Opening the editor silences a ringing latch. "Drums only" backing lacks a cultural gate (§3.33 item 1).
- "step N MENU-PLAN" comments point into `archive/`. Barang patet (root ≠ 0): T5 probe compares in cents (1e-6).
- AF6b residual margin 1.2 dB is deterministic (two overlapping readers at a seam ≤ 1 LSB = −90.3 dB re peak).

## Key lessons (expanded: archive, «КЛЮЧЕВЫЕ УРОКИ»)
Check REAL code first; diagnose before building · the ear beats the maths — listen first (`R.aud`/`R.live`) · behaviour keys off
mode PROPERTIES; a display name is not an identifier · start small; "can" ≠ "should" · liveness lives in the MIDDLE LAYER, distinct
channels → distinct perceptual axes, rest = exactly zero, stability by sub-stepping · one class decides visibility (CSS specificity)
· lesson state leaks are the main lesson bug · a short field's default can be silently wrong (filter `Q` in dB; compute loop
gain) · a render is a re-performance on a fresh engine · lazily loaded modules break silently; export-list comments on own lines
· changed a field/signature → find EVERY reader incl. the probe; new arguments before the time · probes must cover derived paths
· real-time probes compare only exactly-matching frames with phase-independent measures; a control that may contain no defect is
not a control · run a "random" failure many times and print WHERE and HOW MUCH · keep this file short.

## Slice records (English, ≤ ~15 lines each; full text in the archive)
### ED2 (2026-10-13) — copy, paste, duplicate (full: archive B, «ED1 + ED2»)
- ⧉ copy · 📋 paste at the playhead · ⧉⁺ duplicate after the selection (Ctrl/⌘+C/V/D); clipboard lives for the app session; paste only
  into a track of the same role and view (refusal says why); pasted notes become the selection.
- Third birth place: session take, fresh k/v per note, ties dropped, volume always, the TARGET track's timbre/kit (one source per track);
  theremin `hold` kept (removing it would erase the bend — the plan said "removed"); bus automation not copied; adjacent selected segments
  of a glide paste as ONE note. Duplicate offset: span to the snap step, past half a bar to whole bars.
- Row «ED2 copy, paste, duplicate» (16 cases): evHz = source, fresh take/keys, timbre (forced to differ), role refusal, undo/redo in order.
### ED1 (2026-10-13) — several notes at once (full: archive B, «ED1 + ED2»)
- ⬚ pick mode (or Shift): tap adds/removes, drag on empty space = box; Ctrl/⌘+A, Esc. A group drags (time + rows) and deletes as ONE
  history entry (`recorder.editGroup` merges the single edits; a refusal rolls back). Fully selected glides move whole; parts detach.
- ⛳ Fixed an old editor bug the row found: undo did not restore the ORDER of events at one beat (a note-off could fall after the next
  note-on and orphan it). Birth numbers in `editGuard`, sort by (beat, birth).
- Row «ED1 several notes at once» (18 cases). Fix rounds 2. Runner: `--quick` PASS 44.8 s, `--all` PASS 141.4 s, data PASS. ⚠️ `--quick
  --all` in ONE session fails «seed notes as intended»: the AF5 row leaves `sh` on a seed chord (pre-existing; not fixed).
