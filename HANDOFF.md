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
A4/tempo do NOT re-freeze until TF4 (`frzqueue.AF_REFREEZE_ON_RETUNE = false`; such tracks play live; since TF2 the tonic stales nothing); a track
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
**Tonic** (user decision): THE TONIC IS FROZEN IN THE EVENT (stage 2, archive B «TONIC FREEZE — PLAN»): the drone follows the event's view;
the key lives in each note's VIEW for every tuning (user accepted 2026-10-14). **User answers Q1–Q6 (2026-10-14):** Q1 the key knob changes
only what the hands play; recordings keep their key; a Transpose button moves them (with ↶) · Q2 a key change while recording starts a NEW
track (as a mode change) · Q3 a backing (Jam/Drums) is re-made in the new key · Q4 ±1 semitone Transpose for a track (editor) and the
whole song (window), one ↶ each; key colour changes in historical temperaments are expected · Q5 after an A4 or tempo change frozen tracks
re-render by themselves · Q6 Partch keeps today's key; «historical G» one tap away, not the default. **Tuning anchor** (MX1; with that plan;
serves Scala `.kbm`): for non-12 tunings the tonic means "where 1/1 is" — any frequency (Partch 1/1 = G 392 Hz; Sa to the singer);
12 notes stay the main choice plus a cent offset or Hz; a tuning may declare its historical anchor (data field); the control then
reads "1/1 = G".

## Work order (user decision: "editor before the timbre builder")
✅ U5 → ✅ T7 → ✅ T7b → ✅ TUNINGS AS FILES F0–F8 (decided: before solo editing) → ✅ S4–S7 → ✅ **EDITOR ESSENTIALS** → ✅ **EDITOR-OWN** (OWN1, OWN2, BEND-CURVE) → **TONIC FREEZE = stage 2** (IN PROGRESS: ✅ TF0, ✅ TF1, ✅ TF2, ✅ TF3; NEXT TF4 auto-refreeze on A4/tempo,
then TF5 tuning anchor «1/1 = G», TF6 docs; archive B «TONIC FREEZE — PLAN», answers Q1–Q6 above) → ✅ VOL-5, VOL-6 (closed) → **FOUNDATION = stage 3** (stable timbre ids (and user-mode ids), song format and timbre
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
  frozen in each note's view (the knob moves only the hands and the backing; Transpose moves recordings, keys −12..23). The app does not work offline (SW caches nothing; MediaPipe from a CDN). Hand tracking on
  the main thread; hand→sound latency not measured.
- Roll: per-note automation lanes (Volume, brightness, glide…) have no curvature yet (BEND-CURVE did bends and bus lanes); OWN1 offers
  only modes with as many degrees as the track's; unison/theremin tie pairs untie all candidates of that beat (S6); dissolve
  and lead-segment detach re-articulate edges; overlapping polyphonic notes on one row — the hit takes the first.
- One effect network per role: live play goes through the network the recording drives (bus params only). Reorder mid-take: render
  keeps the earlier order (`reordered`). Effects added mid-take: ▲▼⊘ don't act. A ringing latched chord follows the hand (user-tested, VOL-6 closed).
- One history (ED7): 300 steps; NOT steps — mute, solo, arm, the brace, tempo, tonic (✕'s step carries the brace and ⟳).
  The ED2 clipboard lives for the app session; captured bus automation is not copied.
- Captured expression channels are written but NOT replayed (`fxPlaySet` drops `'expr'`) — BACKLOG §4.
- After an A4 or tempo change frozen tracks go stale and play through the live pools (stealing above the ceiling) — until TF4.
- Paste goes only into a track of the same view, KEY included; an armed track in another key than the knob's takes nothing (new track).
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
### TF2 + TF3 (2026-10-14) — recordings keep their key; Transpose by semitones (full: archive B)
- TF2: `scales.viewKey` answers the view's own key (the TF1 shim `keyFollow` deleted). The key knob calls `recorder.liveAllOff` (live owners
  only; a take closes what it holds → the next note lands in a NEW track, Q2) and `backingFollowKey` (Jam/Drums events re-keyed in place =
  re-made in the new key, Q3; held notes handed over, frozen backing re-freezes). Drone sounds its event's view (`audio.droneUse`); KS
  sympathetic strings tune to the note's view (`audio.sympBase`, set by ENG); freeze signature and render pins drop the tonic.
- TF3: `editTranspose(n)` (editor «−1 st / +1 st») and `songTranspose(n)` (window, backing included) re-key views (key may leave 0..11:
  B+1 = 12 = C above); one 'transpose' step; touched frozen tracks stale. Non-12 tunings (Partch, 19/31-TET, gamelan, BP): the key model
  already moves their 1/1 by 100 cents — enabled everywhere, no disabled button (decided).
- Probes: row «TF2 recordings keep their key» (replaces «TF1 key in the view»), «TF3 transpose by semitones», each with failing controls;
  `tools/song.print.json` +2 half renewed (recorded lines = base; backing +2; its new view adds 2 lines); AF3/AR1 stale cases use A4;
  12-tonic sweeps read `keyless` views. Fix rounds: TF2 1, TF3 2 (probe setup).
- Final: data PASS 41.0 s; `--quick --all` PASS — P.quick 63.3 s (45), P.all 195.7 s (59), UI PASS; frozen L4 unchanged.
