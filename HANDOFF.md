# HANDOFF — Handsong, current state (read at the start of every session)

Concise English. Full reasoning and every past slice record: `archive/HANDOFF-history.md` (Russian, verbatim; part A = the
Russian Part I before DOCS-EN, part B = all history). Search it by slice name with `grep`. Where the archive disagrees with
this file or `CLAUDE.md`, this file and `CLAUDE.md` win. Code model, rules (31 hard rules), 74 verification steps: `CLAUDE.md`
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
  (runner PASS; step 69 CLOSED 2026-10-13 — the user had moved the MASTER fader, not the track's: no bug; the stronger probe and
  `R.liveCheck()` stay; step 70 open).
- ✅ unverified: **ED1 several notes at once**, **ED2 copy / paste / duplicate** and **ED3 quantise**, **ED4 by degrees** (runner PASS; eye
  steps 71–74) · **ED5 volume bars**, **ED6 sections** (runner PASS; eye/ear steps 75, 76; the rename bug the user found is fixed — step 77)
  · **ED7 one history** and **OWN2 bend curve** (runner PASS; steps 78, 79) · **ED7-fix brace after ✕**, **BEND-CURVE glides and shapes**,
  **OWN1 track into another mode** (runner PASS; steps 80–82).
  ✅ Volume VOL-0…VOL-6 (VOL-5 and VOL-6 CLOSED 2026-10-14 by the user's test — they already work); VOL-7 deferred until after stage 3.
  ✅ unverified: **ED7-fix2 undo after ✕** (runner PASS; step 83).
  ✅ unverified: **TF2 recordings keep their key** and **TF3 Transpose ±1 semitone** (runner PASS; ear steps 84–87).
  ✅ unverified: **TF3b song Transpose moves the knob**, **TF4 A4/tempo re-freeze**, **TF5 «1/1 = G» + cents + historical 1/1** — STAGE 2
  CLOSED (runner PASS; ear steps 88–90).

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
since TF4 A4/tempo re-freeze too (1.5 s settle after the last move; Q5); since TF2 the tonic stales nothing; a track
created in the editor gets the live chain pinned at birth, inserts into an existing track inherit its chain, auto-freeze never pins (song
load pins old chain-less tracks; seed: 0); memory guard until AF6 `AF_BUDGET_MB` 300 touch / 1024 desktop, over it = skipped, no
eviction; ON by default, `R.autoFreeze(false)` off for the session; paused while any probe runs. AF1 user decisions (frozen sound = a CACHE; 16-bit;
never MP3; tonic freeze before any tonic/A4/tempo trigger; …): archive B, «Moved … AF1 user decisions».

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

**Volume** (archive B, «ПЛАН „ГРОМКОСТЬ КАК ПАРАМЕТР“»): VOL-5 and VOL-6 CLOSED (user's test 2026-10-14: the playing hand's axes already
carry assigned parameters and follow its position like volume; a ringing latched chord already follows the hand after release —
left–right volume, near–far timbre). VOL-7 — PER-NOTE pan (own plan; stereo stage in each voice; ≠ track pan) — after stage 3.
**«Calm» mode** (BACKLOG §7.16; user's idea 2026-10-14): candidate for the FIRST RELEASE, after stage 3, before the big constructors.

**Closed arcs** (live reverb LR1, solo editing S0–S7, editor essentials and the editor answers): archive B, «Moved from HANDOFF.md at
TF2/TF3» (decisions kept there verbatim).

**Saving — user decision** (AF1; with the FOUNDATION; full: BACKLOG §3.35): the song is the person's work, frozen audio a cache.
"Draft" vs "Project — saved in …" (project folder via File System Access, project file, later an account); autosave + versions,
write-then-replace, one editing tab, `storage.persist()`, honest warnings.

**Tuning — rest of the model** (archive B, «ПЛАН „УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ“»): **DON'T NARROW MUSICAL POSSIBILITIES** (T7b) —
offer a theory restriction as a MODE, not a rule · **chord-building property** for the builder: ADAPTIVE (pure ratios, a choir) or
FROM THE TUNING (an instrument); only mobile Natural is adaptive; `chordBuild` / `scales.chordBuildOf` (absent ⇒ from the tuning)
· **scale-panel principle** (F6b): every panel switch comes from the MODE'S DATA (declared field, validated in `scaleload.js`),
never from code · **tunings as files**: a song will store a COPY of each tuning it uses; files from others are untrusted ·
**Scala readiness**: exact ratios as data (started), names as data (✅ F3), import normalisation, a round-trip probe (equal → generator
form) · a mode may need a "central tone" (Lima/Nem patets) — study with musicians.
**Tonic — stage 2 ✅ CLOSED 2026-10-14** (plan, answers Q1–Q6 and the three later answers: archive B «TONIC FREEZE — PLAN» and the TF
records): the key (and, for 1/1 tunings, its cents) lives in each note's VIEW; the knob moves only the hands and the backing; Transpose moves
recordings (a song Transpose moves the knob too); A4/tempo re-freeze by themselves; «1/1 = G» with a historical 1/1 one tap away (Q6). Still open from the anchor
idea: 1/1 typed as any frequency in Hz (Sa to the singer) and Scala `.kbm` export (with SCALA readiness).

## Work order (user decision: "editor before the timbre builder")
✅ U5 → ✅ T7 → ✅ T7b → ✅ TUNINGS AS FILES F0–F8 (decided: before solo editing) → ✅ S4–S7 → ✅ **EDITOR ESSENTIALS** → ✅ **EDITOR-OWN** (OWN1, OWN2, BEND-CURVE) → ✅ **TONIC FREEZE = stage 2** (TF0–TF6, TF3b; closed 2026-10-14) → ✅ VOL-5, VOL-6 (closed) → NEXT: the **FOUNDATION PLAN** ("PLAN ONLY",
maximum effort: song format, draft/project, folder/file/server, versions, migration) → **FOUNDATION = stage 3** (stable timbre ids (and user-mode ids), song format and timbre
format — voice mode and Glide default are the first "timbre policies" —, songs as files: export/import) → candidate FIRST RELEASE:
**«Calm» mode** (§7.16) → VOL-7 → **SAVING** (on the device + file export/import;
does not wait for the server — same format and ids) → **AUTO-FREEZE A3–A6 (A7 if measured), MIXER per-track effects and meters,
AUDIO EXPORT** (with the tuning attached as Scala) and **AUDIO TAKE** (after auto-freeze) → **MIDI CONTROLLER** → **TIMBRE BUILDER
and USER MODES with Scala** → **SERVER** (accounts, sync, sharing timbres and modes, subscription, marketplace; a managed cloud
service makes it cheaper). Off-line, when there is a window: hand tracking off the main thread (after latency is measured, §3.32)
· promo video (§3.31) · Spanish/German (await terminology check, §3.18) · Turkish maqams (§3.25).
**Last stage, after everything else is built: LESSONS / TUTORIAL update** (user answer 2) — no lesson or tutorial edits before it.

## Decided, not scheduled
Hand tracking off the main thread · register as a setting (bass/solo differ only by timbre) · timbres on fingers (source = finger's
timbre; `recorder.noteSource`) · merging bass/solo code and voice mode as timbre data (wait for the timbre format) · 7-note
Pythagorean mode (P5, postponed; appended at the end) · voice-leading lines between chords · triad/seventh switch for untyped modes
· retrigger in lead mode (legato everywhere today) · study Arabic, Indian and other traditions with musicians (mode anchor,
intonation, central tone, what a chord means) · team ideas: two UI faces, hand on a rest, mode lessons, spoken menu, light theme ·
small: settings in localStorage, SW cache for offline, polyrhythm (§3.24), swing as a ratio (§3.30), gesture builder (§3.29),
cultural gate for "Drums only" (§3.33 item 1 — a defect) · OWN3 cents per row in the editor (deferred, user answer 6).

## Known limits and debts (reasoning: `CLAUDE.md` "Known limits", archive)
- Nothing can be saved (song lives in the session; timbres have no ids; an event's mode is a view reference). Since TF2 the key is
  frozen in each note's view (+ cents for 1/1 tunings; the knob moves the hands and the backing; Transpose moves recordings, keys −12..23). The app does not work offline (SW caches nothing; MediaPipe from a CDN). Hand tracking on
  the main thread; hand→sound latency not measured.
- Roll: per-note automation lanes (Volume, brightness, glide…) have no curvature yet (BEND-CURVE did bends and bus lanes); OWN1 offers
  only modes with as many degrees as the track's; unison/theremin tie pairs untie all candidates of that beat (S6); dissolve
  and lead-segment detach re-articulate edges; overlapping polyphonic notes on one row — the hit takes the first.
- One effect network per role: live play goes through the network the recording drives (bus params only). Reorder mid-take: render
  keeps the earlier order (`reordered`). Effects added mid-take: ▲▼⊘ don't act. A ringing latched chord follows the hand (user-tested, VOL-6 closed).
- One history (ED7): 300 steps; NOT steps — mute, solo, arm, the brace, tempo, tonic (✕'s step carries the brace and ⟳).
  The ED2 clipboard lives for the app session; captured bus automation is not copied.
- Captured expression channels are written but NOT replayed (`fxPlaySet` drops `'expr'`) — BACKLOG §4.
- After an A4 or tempo change frozen tracks play through the live pools (stealing above the ceiling) until they re-freeze (TF4: 1.5 s + render).
- Paste goes only into a track of the same view, KEY (and TF5 cents) included; an armed track in another key takes nothing (§3.40 later).
- A render of a KS (plucked solo) track still pins its offline context, ≈ 6 MB per render (Chrome; no workaround found) — BACKLOG §1 AF6 7.
- Unfrozen tracks of one role share the role's TRACK chain (last writer wins among them); per-track chains not built (BACKLOG §1).
- Lanes: a note edit doesn't rebuild its ramp; an anchor only where no event; Glide over bass theremin smooths its steps. Bass
  theremin records the nearest step only. `tmix` timbre fold correct until ids.
- Frozen-memory figures, AF2 crossfade tails, AF5 node cost, re-render repeatability: `CLAUDE.md` "Known limits" / archive B.
- Sections (ED6): a note starting inside a cut loses its tail;
  a note closed by the next note's start exactly on an insert point is lengthened; insert-then-cut beats equal to ~1e-15, not bitwise.
- Opening the editor silences a ringing latch. "Drums only" backing lacks a cultural gate (§3.33 item 1).

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
### TF3b + TF4 + TF5 + TF6 (2026-10-14) — stage 2 CLOSED (full: archive B)
- User answers (2026-10-14): 1 song Transpose also moves the key knob (track Transpose does not); 2 the backing's re-key on a knob change is
  not a ↶ step; 3 paste/arming respecting the key is OK for now — «paste transposed» later (BACKLOG §3.40). TF2/TF3 decisions accepted.
- TF3b: the song Transpose step carries `{kind:'key'}` (knob ±n mod 12, `hooks.key` → ui); ↶/↷ set the knob absolutely. The knob's backing
  re-key now skips drum hits (no pitch), so ↶ restores knob and backing together.
- TF4: `AF_REFREEZE_ON_RETUNE` true — a track stale only by A4/tempo re-renders 1.5 s after the last move (each move resets it).
- TF5: `v.keyC` cents in the view only for 1/1 tunings (`keyByOneOne`, from the tuning's naming scheme); `state.tonicCents`; one door
  `viewKeyC` → `baseF` only; Scale panel: «1/1 =» label, ¢ field, «Historical 1/1: G» from `anchor.historical` (Partch file; Q6: one tap,
  not default). 0 ¢ views are the same objects; F0 snapshot and TF0 base half unchanged.
- Probes: TF3 row + knob cases (control `noKnob`), AF3 (4) rewritten (control `noRetune`), AR1 stale-by-A4 dot = hollow then re-render, new
  row «TF5 tuning anchor 1/1» (controls `keyCDbg('ungated'|'off')`). Fix rounds: TF3b 1 (backing drum views), TF4 0, TF5 1 (probe read
  chord notes as numbers).
- Final: data PASS 31.3 s; `--quick --all` PASS — P.quick 104.9 s (46), P.all 279.7 s (60), UI PASS. Docs: BACKLOG §7.11 (English), §7.17, §7.18, §3.40.
