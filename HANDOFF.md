# HANDOFF — Handsong, current state (read at the start of every session)

Concise English. Full reasoning and every past slice record: `archive/HANDOFF-history.md` (Russian, verbatim; part A = the
Russian Part I before DOCS-EN, part B = all history). Search it by slice name with `grep`. Where the archive disagrees with
this file or `CLAUDE.md`, this file and `CLAUDE.md` win. Code model, rules (34 hard rules), 96 verification steps: `CLAUDE.md`
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
- **Max-effort mode is for PLANS** ("PLAN ONLY" prompts; user's rule, AF2), not for AF/ED/AR/MX or record slices. Done: the foundation
  plan (2026-10-14). Planned: latency and hands (before stage 4's release: detection in a worker, pinch prediction, output buffer — on
  LAT1's numbers); hearing the room (before stage 5); the synthesis core (before stage 7 or earlier: one AudioWorklet in Rust →
  WebAssembly, band-limited, live = freeze = export); a deep code review + type-checking prep every few months.
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
- ✅ AF1 freeze queue (verified on desktop) · LR1 live reverb (accepted by ear) · AF2 swap and AF6b 16-bit (runner; ear steps 64, 65) ·
  AUTO-PROBE runner and fixes (ear step 66) · Volume VOL-0…VOL-6 (VOL-5/VOL-6 closed by the user's test 2026-10-14; VOL-7 after stage 5).
- ✅ unverified (runner PASS; the user's steps in brackets): track strip larger than the screen, AR1, MX1, MX2, AR2 · AF3 auto-freeze (67),
  AF4 no ❄ (68), RENDER-LEAK, AF5 + rule #31 (69 closed 2026-10-13; 70 open) · ED1–ED4 (71–74), ED5–ED6 (75–77), ED7 + OWN2 (78, 79),
  ED7-fix, BEND-CURVE, OWN1 (80–82), ED7-fix2 (83) · TF2, TF3 (84–87), TF3b, TF4, TF5 (88–90) — STAGE 2 CLOSED 2026-10-14. Each line as it
  stood: archive B, «Moved from HANDOFF.md at the STAGE 3 plan».
- ✅ **STAGE 3 PLAN** written 2026-10-14 (archive B «STAGE 3 — FOUNDATION PLAN»; summary below); user answers Q1–Q19 given 2026-10-14
  (archive B, plan §13b). ✅ unverified: **LIC1** licence register, **PRIV1** privacy rule #33 + CSP, **LAT1** latency meter (steps 91, 92) ·
  ✅ **PROBE1** rows registry, **GOLD1** golden renders, **HAND1** gesture fingerprint (2026-10-15; nets only, nothing to hear) ·
  ✅ unverified (2026-10-15): **LAT1b** latency diagnostics + test switches (step 92; the user's numbers: archive B «LAT2 input»), **SND-F1** + **SND-F1b** Firefly,
  Night forest (Room), Glue, our master Limiter (step 93) · **LAT2** frames once, search schedule, worker option (step 94; phone check open)
  · **LAT3** low-light camera: capabilities, «Low light (test)», hands lost, player hint «Too dark»; «Picture» switch removed (step 95) · **CAM-FIX** the webcam's own settings restored (rule #34, step 96).

**What a track holds today:** notes (tuning index + register, volume, type, frozen tuning VIEW), exactly one role, one timbre
(index in `a.inst`/`a.kit`), one view; per-note values inside notes; chain capture per take; may be frozen to a buffer.

## Open decisions and user directions (decided, not built)
**Tracks** (archive B, «Принятое по дорожкам»): a track stores NOTES and TIMBRE, not sound (MIDI principle); each sound source is
its own track; next, source = the timbre assigned to a FINGER (only `recorder.noteSource` changes). After recording the chain
belongs to the TRACK; live, effects will belong to the TIMBRE (chains move from role to timbre; a track has ONE chain at a time).
⛔ No new SOLO timbre, not even appended, until stable timbre ids exist (KS block is the tail of `LEAD_INSTR`).

**Auto-freeze** (plan AF1–AF6: archive B, «ПЛАН „АВТОЗАМОРОЗКА“ (пересмотр при LR1)»; AF6 detail: «AF1»): a track freezes itself
once it settles (all but the track being recorded), unnoticed. Done AF1–AF5, AF6b (AF1 layout costs: archive B). Next: AF6 memory (stage 5).
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
main tech debt: hand tracking off the main thread (§3.32). Songs as FILES: stage 3 (SONG1–SONG3).

**Strategy** (BACKLOG §7.12): ⛳ the FIRST public release is **«Calm»** right after stage 3 (user, Q1, 2026-10-14); the user's own authored
visual design and icon set (§7.19) comes before it. Proposed still: free → "Plus" → packs → "Pro". Vercel Hobby forbids selling (paid plan
or other hosting first, §7.12 item 6).
**Timbre builder** (stage 7; BACKLOG §7.13): 48 gesture addresses, one-AudioWorklet engine for play/freeze/export, multisample export.

**Bass and solo are one instrument**: they differ by voice builder and register; other differences are policies that belong in
the TIMBRE FORMAT as data. Code MIRRORS, not merges, until the timbre format. Chords and drums are their own families.

**VOL-7** — PER-NOTE pan (own plan; a stereo stage in each voice; ≠ track pan) — after stage 5. **«Calm» mode** (BACKLOG §7.16): the
FIRST RELEASE (stage 4), then the installation (kiosk) mode §7.18 (stage 4b).

**Closed arcs** (LR1, S0–S7, editor essentials): archive B, «Moved from HANDOFF.md at TF2/TF3». **Saving — user decision** (AF1; full:
BACKLOG §3.35): the song is the person's work, frozen audio a cache; draft vs project, autosave + versions, `storage.persist()`.

**Tuning — rest of the model** (verbatim: archive B «Moved from HANDOFF.md at LIC1/PRIV1/LAT1»): DON'T NARROW MUSICAL POSSIBILITIES
(T7b — a theory restriction is a MODE) · chord build adaptive vs from the tuning · scale-panel switches from the MODE'S DATA (F6b) · songs
store a COPY of each tuning · Scala readiness · a "central tone" for patets · open: 1/1 typed in Hz, Scala `.kbm` export.

## Work order (user decision: "editor before the timbre builder")
✅ U5 → ✅ T7 → ✅ T7b → ✅ TUNINGS AS FILES F0–F8 (decided: before solo editing) → ✅ S4–S7 → ✅ **EDITOR ESSENTIALS** → ✅ **EDITOR-OWN** (OWN1, OWN2, BEND-CURVE) → ✅ **TONIC FREEZE = stage 2** (TF0–TF6, TF3b; closed 2026-10-14) → ✅ VOL-5, VOL-6 (closed) → ✅ the **FOUNDATION PLAN** (2026-10-14;
answered 2026-10-14) → NOW: **FOUNDATION = stage 3** (✅ LIC1, ✅ PRIV1, ✅ LAT1, ✅ PROBE1, ✅ GOLD1, ✅ HAND1, ✅ LAT1b, ✅ SND-F1; ✅ LAT2, ✅ LAT3, ✅ CAM-FIX (2026-10-15);
NEXT **REC1**) → **4 «Calm»** = FIRST
RELEASE (§7.16; offline, detection in a worker, low-power; the user's own visual design §7.19 before it) → **4b installation (kiosk) mode**
(§7.18) → **5** SAVING (on the device + file export/import; same format and ids), export with Scala, audio tracks and AUDIO TAKE, mixer
per-track effects and meters, AF6 rest, «Listen», WASM effects → **VOL-7** → **6 MIDI CONTROLLER** → **7** new-engine instruments,
TIMBRE BUILDER, USER MODES with Scala, sampler → **8 SERVER** (accounts, sync, sharing, subscription, marketplace). Off-line, when there is a window: promo video (§3.31) · Spanish/German (await terminology check, §3.18) · Turkish maqams (§3.25).
**Last stage, after everything else is built: LESSONS / TUTORIAL update** (user answer 2) — no lesson or tutorial edits before it.

## Stage 3 — foundation plan (summary; full plan, contracts, reasoning: archive B «STAGE 3 — FOUNDATION PLAN»)
- **Target:** a pure CORE (pitch truth, song + commands, clock, registry, file formats, event bus; no DOM or Web Audio; tested in node) +
  MODULES through short contracts (effects, timbre engine types, hand sources, inputs, outputs, track types, visuals, gestures — each a file
  with a passport, a cost class and a contract probe) + an ENGINE contract (explicit commands and data; the same code live and offline; Web
  Audio inside now; Rust → WebAssembly in an AudioWorklet module by module from stage 5 — effects first, voices in stage 7; offline renders
  of WASM tracks in a Worker, which also avoids Chrome's worklet-context leak).
- **A recording keeps what was heard** (notes + resulting values), never gestures; mappings are setup data. Latency compensation from the
  input's own timestamp (stage 5; tap-along test, switchable off). Privacy: rule #33 (PRIV1 ✅). Licences: rule #32 + register (LIC1 ✅).
- **34 slices (7 S, 25 M, 2 L)** — done: LIC1, PRIV1, LAT1, PROBE1, GOLD1, HAND1, LAT2 (+ LAT1b, SND-F1, LAT3); next REC1–REC5 (recorder → song/, transport/, live/, freeze/), AUD1–AUD2 (stateless timbre / effect
  modules receiving the engine's `E`), GES1, DRAW1, UI1 (+ THEMABLE, §7.19), FMT1, TIM1 (permanent timbre ids) → THE FORK: line A ENG1,
  TIM2, TIM3, ENG2; line B IDS1, CMD1, SONG1–SONG3, VIS1, PACK1; DOC1. Moved after Calm (Q2): ROUTE1, IN1, GES2.
- **User answers Q1–Q19 (2026-10-14; archive B plan §13b):** Q3 two lines after slice 18 — Claude Code prepares and PERFORMS the merges,
  the user confirms and commits; the rest as recommended (Rust, compiler from stage 5, effects first, A/B ear acceptance, permanent sound
  names, song files carry copies, values not movements, local diagnostics, data-only packs, model bundled in stage 4, pinch prediction off);
  Q13 material licences + icon audit; Q14 the Vercel counter kept and named in the privacy notice.

## Decided, not scheduled
Register as a setting (bass/solo differ only by timbre) · timbres on fingers (source = finger's
timbre; `recorder.noteSource`) · merging bass/solo code and voice mode as timbre data (wait for the timbre format) · 7-note
Pythagorean mode (P5, postponed; appended at the end) · voice-leading lines between chords · triad/seventh switch for untyped modes
· retrigger in lead mode (legato everywhere today) · study Arabic, Indian and other traditions with musicians (mode anchor,
intonation, central tone, what a chord means) · team ideas: two UI faces, hand on a rest, mode lessons, spoken menu, light theme ·
small: settings in localStorage, polyrhythm (§3.24), swing as a ratio (§3.30), gesture builder (§3.29),
cultural gate for "Drums only" (§3.33 item 1 — a defect) · OWN3 cents per row in the editor (deferred, user answer 6) · the user's
«EXPRESSION HAND» — a pedal-like hand, hand map, expression lab (BACKLOG §3.29 «➕», 2026-10-15; after GES1).

## Known limits and debts (reasoning: `CLAUDE.md` "Known limits", archive)
- Nothing can be saved (song lives in the session; timbres have no ids; an event's mode is a view reference). Since TF2 the key is
  frozen in each note's view (+ cents for 1/1 tunings; the knob moves the hands and the backing; Transpose moves recordings, keys −12..23). The app does not work offline (SW caches nothing; MediaPipe from a CDN). Hand tracking on
  the main thread; hand→sound latency MEASURED by LAT1 (user's desktop 2026-10-15: ≈ 126 ms daylight, ≈ 180 ms evening; detection 54 ms vs a
  real GPU's 10–20; phone runs pending). Since LAT2 each camera frame is detected once; detection stays on the main thread by default (the worker path
  is ≈ 2× slower on the user's desktop GPU); the old browser limiter's 6 ms are gone (SND-F1b). In low light the webcam itself slows
  (6.3 fps evening vs 14–30 day, LAT3): no web API forces its frame rate — light on the hands is the remedy (hint; BACKLOG §7.18).
- Editor, lanes, history, paste, sections, effect networks, frozen-track and render limits (KS / Glue renders pin ≈ 6 MB, Firefly tails
  ring out, Night forest CPU): `CLAUDE.md` "Known limits" (one list, kept there). Captured expression channels are not replayed (§4).
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
### Earlier stage-3 records — LAT1b + SND-F1, SND-F1b, «LAT2 input» (the user's desktop numbers): archive B «Moved from HANDOFF.md at LAT2».

### LAT2 (2026-10-15) — frames once, search schedule, worker option: record moved to archive B «Moved from HANDOFF.md at LAT3».
- ⬜ OPEN CHECK (postponed by the user): phone latency — A defaults and D 30 fps; on the phone also compare the worker path (decides its default).

### LAT3 (2026-10-15) — low-light camera: record moved to archive B «Moved from HANDOFF.md at CAM-FIX».
- ⬜ User step 95 (evening, one hand, each low-light setting 20 s + Copy) — do it AFTER step 96 (CAM-FIX).

### CAM-FIX (2026-10-15) — the webcam's own settings restored (full: archive B «CAM-FIX — record»)
- Incident: «short exposure» left the user's UVC webcam dark in the DEVICE (Off, reload, Zoom all dark); he healed it from the console.
  Causes: the old Off handed exposure back only right after «short exposure» (exposure → fps test → Off forgot it); nothing healed at open;
  Chrome applies ONLY the camera controls of a set that holds one and ignores its format part (measured). Only «short exposure» writes a
  camera control; the fps tests change the requested format only.
- Fix = hard rule #34: originals saved; Off / fall-back / leaving the page / reopen restore (automatic exposure + white balance, other
  controls to originals); every open heals manual modes (meter: «… was manual — restored to automatic»); format and controls in two calls;
  warning under the switch «Test: changes the camera's own settings; Off restores them».
- Also: warm-up in two steps (runner: one 9681-ms task → 9479 + 718 ms; slow headless GPU today); `main.js` probe-import `.catch` no longer
  swallowed by a comment (no other case in `src/`).
- Idea recorded: the user's «EXPRESSION HAND» (pedal-like hand, hand map, expression lab, presets) — BACKLOG §3.29 «➕» block; after GES1.
- Probes: data PASS 13 (LAT3 core 40 cases); P.quick PASS 56 (112.9 s; new row «CAM-FIX camera settings restored», simulated UVC webcam,
  controls noRestore / noHeal). Fix rounds 3.
- ⬜ User step 96 (each test then Off — the picture comes back; reload + Zoom normal), then step 95.
