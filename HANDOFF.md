# HANDOFF — Handsong, current state (read at the start of every session)

Concise English. Full reasoning and every past slice record: `archive/HANDOFF-history.md` (Russian, verbatim; part A = the
Russian Part I before DOCS-EN, part B = all history). Search it by slice name with `grep`. Where the archive disagrees with
this file or `CLAUDE.md`, this file and `CLAUDE.md` win. Code model, rules (33 hard rules), 92 verification steps: `CLAUDE.md`
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
  ✅ **PROBE1** rows registry, **GOLD1** golden renders, **HAND1** gesture fingerprint (2026-10-15; nets only, nothing to hear).

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
answered 2026-10-14) → NOW: **FOUNDATION = stage 3** (✅ LIC1, ✅ PRIV1, ✅ LAT1, ✅ PROBE1, ✅ GOLD1, ✅ HAND1; next REC1 — or LAT2 first, open question 2026-10-15) → **4 «Calm»** = FIRST
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
- **34 slices (7 S, 25 M, 2 L).** Nets and policy: LIC1, PRIV1, LAT1 (latency meter — the first real numbers), PROBE1 (probe rows
  registry), GOLD1 (golden renders of all 51 sounds + effects), HAND1 (synthetic hands → gesture fingerprint). Splits along existing seams,
  old paths kept as facades: REC1–REC5 (recorder → song/, transport/, live/, freeze/), AUD1–AUD2 (stateless timbre and effect modules that
  receive the engine's `E`, so the `audio.js?render` copy keeps working), GES1, DRAW1, UI1 (+ THEMABLE: design tokens in one place and
  one icon component / SVG sprite replacing emoji and glyphs — §7.19), FMT1 (core/format + registry), TIM1 (permanent timbre ids) → THE
  FORK: line A ENG1 contract, TIM2 ids in events, TIM3 timbres as data files, ENG2 costs and power class; line B IDS1, CMD1 serialisable
  commands, SONG1 song format v1, SONG2 demo song as a file, SONG3 save/open, LAT2 frame callback + 60 fps, VIS1 visual modules, PACK1
  pack keys; DOC1. **Moved after Calm (Q2): ROUTE1, IN1, GES2.**
- **User answers Q1–Q19 (2026-10-14; archive B plan §13b):** stage order as in «Work order»; Q3 two lines after slice 18 — Claude Code
  prepares and PERFORMS the merges and reports them, the user confirms and commits; Q4–Q12 and Q15–Q19 as recommended (Rust; compiler from
  stage 5, `.wasm` committed; effects first; A/B ear acceptance; permanent sound names; song files carry copies; values not movements; local
  diagnostics; offline keys, data-only packs; model bundled in stage 4; pinch prediction off by default); Q13 material licences + icon audit
  (all marked «to be replaced by the user's own authored design»); Q14 keep the Vercel counter, named in the privacy notice.

## Decided, not scheduled
Register as a setting (bass/solo differ only by timbre) · timbres on fingers (source = finger's
timbre; `recorder.noteSource`) · merging bass/solo code and voice mode as timbre data (wait for the timbre format) · 7-note
Pythagorean mode (P5, postponed; appended at the end) · voice-leading lines between chords · triad/seventh switch for untyped modes
· retrigger in lead mode (legato everywhere today) · study Arabic, Indian and other traditions with musicians (mode anchor,
intonation, central tone, what a chord means) · team ideas: two UI faces, hand on a rest, mode lessons, spoken menu, light theme ·
small: settings in localStorage, polyrhythm (§3.24), swing as a ratio (§3.30), gesture builder (§3.29),
cultural gate for "Drums only" (§3.33 item 1 — a defect) · OWN3 cents per row in the editor (deferred, user answer 6).

## Known limits and debts (reasoning: `CLAUDE.md` "Known limits", archive)
- Nothing can be saved (song lives in the session; timbres have no ids; an event's mode is a view reference). Since TF2 the key is
  frozen in each note's view (+ cents for 1/1 tunings; the knob moves the hands and the backing; Transpose moves recordings, keys −12..23). The app does not work offline (SW caches nothing; MediaPipe from a CDN). Hand tracking on
  the main thread; hand→sound latency MEASURED by LAT1 (headless only so far; the user's device numbers pending — step 92). The loop
  detects at the display rate, so a camera frame can be detected twice (LAT2).
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
### PROBE1 + GOLD1 + HAND1 (2026-10-15) — stage 3 slices 4–6, safety nets (full: archive B «PROBE1 + GOLD1 + HAND1»)
- PROBE1: `scaleprobe.js` → facade over `src/probes/<area>.js` (moved verbatim, checked line by line); rows register themselves
  (`probes/rows.js`: `row`/`family`, flags slow/drawn/realtime/song/node, order `at`); registry problems fail P.all and the data runner
  (control: a duplicate name). Same 47 rows, results and order; the data runner reads its rows from the registry (F4 now after the sweeps).
- GOLD1: 70 golden renders (51 timbres incl. 5 kits × 6 rows, drone, 6 effects × 3) at 48 kHz → `tools/gold.print.json`; row «GOLD timbres
  and effects» (P.all, slow, 50–64 s); tol 0.01 dB (measured spread ≤ 0.0011); control: Warm pad filter +1 % caught. Runner P.all limit 8 min.
- HAND1: synthetic hands on a probe clock through the real `processHands` → `tools/gesture.print.json` (523 lines: W* calls, looper commands,
  tutor hooks, voices, hands, aims, expression); row «HAND1 gesture fingerprint» (quick, 0.3 s); control: PINCH_ON + 0.03 caught. Probe-only
  hooks: `gestures.handsProbe/processHandsProbe/pinchDbg`, `recorder.wTapSet` (no-ops when unset). Recording is not in the print (audio clock).
- Probes: static PASS; data PASS 10 checks (35.4 s); `--quick --all --cdn-cache` PASS — P.quick 48 checks 86.4 s, P.all 63 checks 350.7 s, UI and
  CSP PASS; frozen seed bass L4 0.08686 / 0.055319 / 650886. Fix rounds: PROBE1 2 (split tool: template braces, spread imports; registry
  family check order), GOLD1 1 (P.all over the 5-min limit → windows shortened, limit 8), HAND1 2 (state leaking between runs: display,
  message, palette; message language). Vercel production URL recorded: https://handsong.vercel.app.
