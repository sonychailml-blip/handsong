# BACKLOG — CORE track (`core/`, used by both apps)

> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.

_The old `BACKLOG.md` was cut by section at SPLIT-2 (nothing lost, `tools/split-docs.mjs --check`). §0, §1, §7.3, §7.4, §7.8, §7.12 → `docs/core/BACKLOG.md`. §2–§6 and the numbers 3.x → `docs/full/BACKLOG.md`, with §7.1, §7.2, §7.5–§7.7, §7.9–§7.11, §7.13–§7.15, §7.20. §7.16–§7.19 → `docs/night/BACKLOG.md`._
_Paths in older text: `src/core/` → `core/pure/`; `src/ui.js`, `draw.js`, `latmeter.js`, `views/` → `core/legacy-ui/`; other `src/` → `core/`; `data/` → `core/data/`; Night-only and Full-only files → `apps/night/`, `apps/full/`; probes → `tools/probes/`; prints → `tools/prints/`. Map: `tools/split-move.mjs`._

## Open now (written at SPLIT-2, 2026-11-02, English)
- ⬜ **App texts into app dictionaries** (user, NIGHT-2, 2026-11-03): Night's `night.*` keys (and the NIGHT-2 calibration texts) live in `core/i18n.js` for now, against core rules 2 and 8. A CORE run gives `core/i18n.js` a door for an app's own dictionary (`apps/<app>/i18n.js`, en + ru), moves the keys there, and the data row that checks keys in both languages follows them.
- ✅ **CORE-1: hand calibration and sensitivity in the engine** (2026-11-02). Opt-in; Night opens it since NIGHT-2 stage 2 (scope `night`), Full not yet. Design: `docs/core/CORE-1-DESIGN.md`. The screens and the rest of step 125 are app work: `docs/full/BACKLOG.md`, `docs/night/BACKLOG.md`.
- ⬜ **The per-control sensitivity override has no screen** (found at CORE-1 CP5). By the user's UI decision the apps show two global sliders, so `handCalSetSens(v, id)` and the record's `sens` field have no caller outside the rows. When both calibration screens exist: remove it if neither uses it (core rule 1).
- ⬜ **`NIGHT stress`, a possible flaky check; look into it if it recurs, and tell the user when it does** (user, 2026-11-02). Seen once at CORE-1 CP2, unchanged audio: `live solo.handpan`, 48 dropouts in 6 s against 0 for the reference. The next two runs passed. Log: `tools/.probe-logs/2026-11-02T09-46-52-.log` (git-ignored). **It recurred at CORE-1 CP5, three sessions in a row on a tree that passed at 12:17** (core 7ef60d72285fb980; CP5 changed docs only): `solo.singing-bowl` 7, then 5, then 44 dropouts, `solo.handpan` 16 in the last, the reference 0 each time. Today: 1 failure in 6 sessions before CP4's tree, 3 in 4 on it. Not settled: the row plays through `processHands`, so CP4's doors are on its path (one boolean read each, calibration closed), and other rows ran 13–20% slower than at 12:17 with the user's Chrome open. **Rerun on the same core, laptop cooled and on power: two PASS in a row** (log stamps 18-12-41, 18-18-38), so CP4's code doesn't cause it by itself; heat, power or other load make the difference, and which one wasn't separated (Chrome was still running, one window, idle at 0% when sampled after the runs; Telegram was running at the start of the first run). Keep watching: Full's sound stays at 0 under the same playing, so Night's struck sounds have less margin on this laptop. Don't pass it with `--stress-not-judged`. NIGHT-1 stage 1 (`docs/night/NIGHT-1-HEADROOM.md` §5): cool and idle, 0–2 dropouts in 39 stress passes; the row's order leaves SuperSaw and flute banks computing under the handpan and bowl (offline +28–31% after the flute), though the reference's second pass carries them too.
- ⬜ **`LAT3 low light`, real-time, fails now and then:** 2 of 12 Full sessions on 2026-11-02 (10:33, 15:11, «after fps15 hand detection stopped»), passing on rerun. Same family as `LAT1b`.
- ⬜ **`P.quick`'s 3-minute limit no longer fits.** At CORE-1 CP3 it stopped three of seven Full sessions that day, 5–8 rows short of the end at 180 s, with no row failing. Passing runs that day took 135–167 s; rows ran about 30% slower across the suite in the failing runs. The slow factor stays 1.00 because `SLOW_REF` (idle 112.9 s) predates many time-based rows, so its reference rows still read below idle (0.53–0.75×). Refresh `SLOW_REF` or raise the default; meanwhile `--limit-quick 5`, named in the report.
- ⬜ **ui-snap recheck on the GeForce.** RUN 9's Full screens were captured on the Intel HD 4000 and differ at rendering level from RUN 7's on the GeForce GT 635M (gradients ±1–2, glyph edges). A capture on the GeForce settles it.
- ⬜ **Remove the embedded `profile.full` from Night's page** once Night has its own stress reference (`core/DEBT.md`).
- ⬜ **Keep shrinking `core/legacy-ui/`** and the rest of `core/DEBT.md`. Next large piece: split the `recorder.js` facade so Night plays without the recording path.
- ⬜ **Slim `CLAUDE.md` back under ~60 KB** (68.9 KB at SPLIT-2): it is loaded into every session, so move long reference sections into `docs/` files that sessions open on demand, keeping every rule findable. Prove nothing is lost: `tools/doc-split-check.mjs` with the new files added to its list.
- ⬜ Remove `tools/split-*` and `tools/split-baseline/` when the user no longer needs the split's proof; the row «OLD NAME gone» then loses its exemption for them.
- ⬜ Replace the temporary row exemptions as they fall away: `apps/night/migrate.js` (NIGHT backlog), and the known overlap in `tools/ui-snap.mjs` (`MSG_KNOWN`).

## Open from the old HANDOFF (kept word for word in `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2»)
- ⬜ User checks on camera and detection: phone latency (defaults; D 30 fps; the worker path, which decides its default) · step 96 (each camera test, then Off → picture back; reload + Zoom normal), then step 95 (evening, each low-light setting 20 s + Copy) · step 97 (camera busy / off / blocked → message, «Try again»).
- ⬜ User checks of the foundation, runner-passed only: steps 91–100.
- ⬜ Tunings as files: F1, F3–F7 not checked by the user; F7 snapshot to renew (change f7).
- ⬜ AF6 memory, the rest (with stage 5, §1). AF2 tails (§1).
- ⬜ Moved after the first release: ROUTE1, IN1, GES2. UI1a after the redesign.
- ⬜ Plans at max effort still to write: latency and hands (detection in a worker, pinch prediction, output buffer, on LAT1's numbers); hearing the room (before stage 5); the synthesis core (one AudioWorklet in Rust → WebAssembly, band-limited, live = freeze = export); a deep code review + type-checking prep every few months.
- ⬜ Engine direction: Rust → WebAssembly module by module from stage 5, effects first, voices in stage 7; offline renders of WASM tracks in a Worker, which also avoids Chrome's worklet-context leak.
- ⬜ Hand tracking off the main thread (§7.8): the worker path is ≈ 2× slower on the user's desktop GPU; phone numbers decide.
- ⬜ Tuning model, the rest: chord build adaptive vs from the tuning · scale-panel switches from the mode's data (F6b) · songs store a copy of each tuning · Scala readiness · a "central tone" for patets · open: 1/1 typed in Hz, Scala `.kbm` export.
- ⬜ Small, decided, unscheduled: settings in localStorage (§1) · hand identification `key+=i` (full, §4).

---
_Below: the old backlog's text as it stood, renamed. The English index and status banner cover the whole old file._

# BACKLOG — Handsong (бывш. Air Synth 3)

## English index (DOCS-EN; the sections below stay in Russian — any section edited from now on is rewritten in English)
Status marks: ✅ done · 🔵 in progress · 🟡 partial/proposed · ⬜ open · ❓ deferred, needs measurement · ℹ️ note, not a bug.
- **0. Now in progress** — the module split refactor (✅ long done; table kept as history).
- **1. Foundation** (English since RUN 5) — localStorage for settings (⬜); stable mode/tuning/timbre ids, prerequisite for saving and the scale builder (✅);
  auto-freeze AF1–AF4 ✅ (watcher ON by default, no ❄); AF6 remainder after 16-bit (⬜: disk/browser cache, chunk paging, Opus fallback;
  KS-track renders still pin ≈ 6 MB each — other tracks fixed in RENDER-LEAK; per-track chains after AF5); AF2 remainder: drum and live-reverb tails at a
  crossfaded swap (⬜); SAVING — the user's decision (⛳: draft vs project, folder/file/account, autosave and versions); AUDIO TAKE —
  after auto-freeze (⬜); SCALA readiness (.scl/.kbm) before the mode builder (⬜); Service Worker model cache (⬜).
- **2. Microtonality: chords and grid** — 2.1 chords in `tag:'edo'` (✅); 2.2 diatonic subsets are a GRID topic (⬜); 2.3 hysteresis below
  noise level (🔵, one case left); maqam: no bug (ℹ️).
- **3. Features** — 3.1 chord latch ✅ · 3.2 English UI ✅ (→3.18) · 3.3 backings rework (dropped) · 3.4 intent events ✅ · 3.5 looper ✅ ·
  3.6 music-theory lesson content ⬜ · 3.7 tuning comparison ⬜ · 3.8 cents deviation display ⬜ · 3.9 FDN reverb ✅ · 3.9b reverb space as an
  honest PARAMETER ⬜ · 3.10 rich microtonal chord palette ✅ · 3.11 video/sound recording ✅ · 3.12 more tunings and timbres ⬜ · 3.12a
  Karplus–Strong in CHORDS ❓ (phone measurement) · 3.13 per-layer mixer ⬜ (superseded by MX1/MX2) · 3.14 A/B tuning comparison in time ⬜ ·
  3.15 own tuning per role (live polymodality) ⬜ · 3.16 jam content 🔵 · 3.17 camera frame margin ✅ · 3.18 i18n 🔵 (en+ru done; es/de await
  a reviewer) · 3.19 floating menu ✅ · 3.20 tutorial mode ✅ · 3.21 start screen ✅ · 3.22 menu layout ✅ · 3.23 metres beyond 4/4 ✅ · 3.24
  polyrhythm ⬜ · 3.25 tunings still wanted (Turkish maqams etc.) ⬜ · 3.25b world catalogue of tunings (added 2026-10-15) ⬜ · 3.26 fixed tuning: tonic = KEY 🔵 (tails listed) · 3.27 language button
  ✅ · 3.28 per-group mode help "?" ⬜ · 3.29 gesture builder ⬜ (+ the user's «expression hand»: hand map, expression lab — added 2026-10-15) · 3.30 swing as a RATIO ⬜ · 3.31 promo video ⬜ · 3.32 measure hand→sound
  latency as a NUMBER 🟡 (LAT1 meter 2026-10-14; desktop numbers in, LAT2 built on them 2026-10-15; phone pending; + dual-GPU laptops and a medium-exposure experiment, added 2026-10-15) · 3.33 drum rhythms as backing — content and CULTURAL fit ⬜ (item 1 is a defect) · 3.34 user tuning builder ⬜ ·
  3.35 saving the song (loop) 🟡 (files: SAVE1 done; autosave proposed) · 3.36 playing together (direction) ⬜ · 3.37 three small visible things ⬜ · 3.38 four-note rectangles for
  ordinary tunings ✅ · 3.39 EFFECTS builder 🔵 · 3.40 paste transposed into the track's key ⬜ (later) · 3.41 hand prediction
  (latency) ⬜ (idea, a later slice).
- **4. Bugs** — mostly ✅/ℹ️ history; open: hand identification `key+=i` ⬜; captured expression-hand channels not replayed ⬜ (debt).
- **5. Decided NOT to do.**
- **6. Spec: chord latch** (✅ shipped; kept as history) — also menu rework ✅, 3.10, 3.11, 3.12/3.12a, 3.13–3.39 continue below it.
- **7. Product direction** (user decisions) — 7.1 server storage (timbres, then songs) · 7.2 free vs paid, towards a subscription · 7.3
  sharing/selling/other programs: own format + exports · 7.4 ⛳ the TIMBRE FORMAT is designed with all of this from the start · 7.5 polyphonic
  bass + independent bass notes ✅ · 7.6 user modes: create/save/share · 7.7 app as a MIDI controller with the mode · 7.8 ⛳ hand tracking off
  the main thread (main tech debt) · 7.9 team ideas (not decisions) · 7.10 strategist proposals (not decisions) · 7.11 ⛳ hearing the room ·
  7.12 release and money strategy 🟡 (item 1 decided: Night is the first release; Vercel Hobby forbids selling) · 7.13 ⛳ the timbre builder (user's vision, stage 7) · 7.14 ⛳ effect chains,
  target design (per-track chains; live chain by timbre or by finger) · 7.15 modes/presets as bundles (packs) · 7.16 ⛳ «Night» mode — rooms of
  light and sound (candidate for the FIRST RELEASE, after stage 3; + «musicians in the scene», added 2026-10-15) · 7.17 Night — playing along with outside music («Listen», after the
  first Night release, part of hearing the room) · 7.18 installation (kiosk) mode + B2B sales plan (stage 4b, right after Night) · 7.19 ⛳ own authored visual design and icon set
  (before the Night release; UI1 makes the UI themable) · 7.20 ⛳ learning — a music-theory course taught through the body (added 2026-10-16;
  lessons as data, checked with HAND1's synthetic hands; after the core).

Общий список задач. Обновляется по ходу работы.

> **Status banner (rewritten in English at AF3/AF4; the long Russian original is in git history).**
> **Done:** the TRACK EDITOR (§3.39) — linear multitrack recorder (tracks, M/S, absolute time, brace, chase, arming, row delete, undo
> by take, per-pass note closing) and the piano roll for all four roles (S4.0–S5.6, E0–E2, S0–S7, U1–U6); EFFECT OWNERSHIP O-0…O-4
> (serial chain, capture per take, playback, aim vs sound, the automation lane); FREEZE F0–F5, A0–A2c; ONE ROLE AND ONE TIMBRE per track
> (T0–T5); independent bass notes; the melodic instrument (voice modes V1–V5, Glide); brightness on every role; AR1/MX1/MX2/AR2; ED1 several notes at once, ED2 copy/paste/duplicate, ED3 quantise after recording, ED4 transpose by degrees (2026-10-13), ED5 volume bars (one bar per note) and ED6 sections (named bar markers; insert / cut / duplicate bars in every track, one song ↶) (2026-10-14).
> **AUTO-FREEZE:** ✅ AF1 queue · ✅ AF2 swap · ✅ AF6b 16-bit · ✅ **AF3 watcher and triggers** (ON by default; since TF4 A4/tempo
> re-freeze too, after a 1.5 s settle; since TF2 the tonic stales nothing) · ✅ **AF4 no ❄ anywhere** (a faint dot in the arrangement window only) · ✅ **AF5 + hard rule #31**
> (a track and the live hands never share sound state: each role has a separate TRACK chain) · ✅ RENDER-LEAK (non-KS renders collected).
> Next: AF6 rest (below, §1).
> **Order of work (user decision; full: HANDOFF "Work order"):** editor essentials (✅ ED1 selection, ✅ ED2 copy/paste/duplicate, ✅ ED3 quantise, ✅ ED4 by degrees, ✅ ED5 volume bars, ✅ ED6 sections, ✅ ED7 one undo (2026-10-14)) →
> editor-own (✅ OWN1 mode by degrees — same tuning, same number of degrees, out-of-mode notes keep their offset; ✅ OWN2 theremin bend curve
> + ✅ BEND-CURVE glides/shapes/steps on bends and bus lanes, 2026-10-14; DEFERRED by the user 2026-10-14: curvature on per-note lanes (Volume, brightness,
> glide), OWN1 into modes with a different number of degrees (maybe never); OWN3 cents per row DEFERRED — user, 2026-10-13) → tonic freeze (stage 2; plan
> archive B «TONIC FREEZE — PLAN», user answers Q1–Q6 2026-10-14; ✅ TF0 song fingerprint, ✅ TF1 key in the view (inaudible), ✅ TF2 recordings keep their key (the key knob moves only the hands and the backing; a key change mid-take starts a new track), ✅ TF3 Transpose ±1 semitone for a track (editor) and the whole song (window; since TF3b it moves the key knob too, one ↶), ✅ TF4 frozen tracks re-freeze by themselves after A4/tempo, ✅ TF5 «1/1 = G» with a cents nudge and a tuning's historical 1/1, ✅ TF6 docs — STAGE 2 CLOSED 2026-10-14; the FOUNDATION PLAN written 2026-10-14 — archive B «STAGE 3 — FOUNDATION PLAN», answered by the user 2026-10-14; LIC1, PRIV1, LAT1 done 2026-10-14) (VOL-5 and VOL-6 CLOSED by the user's test 2026-10-14 — they already work; VOL-7 per-note
> pan deferred until after stage 3) → FOUNDATION = stage 3 (stable mode and timbre ids, song and
> timbre format; §1, §7.4) → FIRST RELEASE §7.16 «Night» (decided, Q1; own visual design §7.19 before it) → §7.18 installation mode → SAVING on the device + song files (§3.35) → auto-freeze rest, mixer per-track effects and meters, audio
> export with the tuning as Scala, audio take → MIDI controller (§7.7) → timbre builder and user modes with Scala (§7.6) → server (§7).
> **Last stage, after everything else:** the LESSONS / TUTORIAL update (§3.6, §3.20) — no lesson edits before it (user, 2026-10-13).
> ⛳ Main technical debt: hand tracking off the main thread (§7.8) — LAT2 (2026-10-15) built the worker path; on the user's desktop GPU it runs
> the model ≈ 2× slower, so the main thread stays the default there (phone numbers pending). Nearby: §3.31 promo video · §3.32 input latency ·
> §3.41 hand prediction · es/de (§3.18).
> ⛔ **Prerequisite blocking saving and the builders:** stable MODE ids and TIMBRE ids (§1, §7) — an event holds a view REFERENCE and a
> timbre INDEX, neither can be serialised; a five-minute song that cannot be saved is a failed feature.
> ⚠️ **Statuses are checked against the code.** ✅ = verified in `src/`.

**Статусы:**
`🔵` — в работе · `⬜` — готово к работе, спецификация есть · `❓` — нужна спецификация · `✅` — сделано

---

## 0. Сейчас в работе

### ✅ Рефакторинг: разбиение на модули — ЗАВЕРШЁН ДАВНО (таблица ниже — история)

⚠️ **Самый устаревший пункт файла, и самый вредный: он объявлял СТОП на все остальные работы
(«ничего из списков ниже не делаем, пока идут шаги 13–14»). Этот стоп СНЯТ — все 14 шагов пройдены,
и с тех пор выпущены десятки фич.** В `src/` восемнадцать модулей, включая `ui.js` и финальный `main.js`
(шаг 13), а `CLAUDE.md` (шаг 14) с тех пор переписывался многократно и описывает текущий код.

⚠️ Строка «8 · `src/backing.js` ✅» — историческая: модуль был выделен, а ПОЗЖЕ УДАЛЁН целиком
(генеративный фон заменён аранжировкой-слоями; см. §3.3). Не искать его в коде.
Модули, появившиеся ПОСЛЕ этого плана и в таблице отсутствующие: `arrange.js`, `clip.js`, `demo.js`,
`i18n.js`, `ks-worklet.js`, `tutor.js`, `render.js`.

Полный план — `archive/PLAN.md` (АРХИВ), 14 шагов. Правило было: один шаг = одна проверка в браузере = один коммит.

| Шаг | Что | Статус |
|---|---|---|
| 1 | `style.css` | ✅ |
| 2 | Весь скрипт → `src/main.js` одним куском | ✅ |
| 3 | `src/config.js` — константы, имена магическим числам | ✅ |
| 4 | `src/state.js` + сеттеры | ✅ |
| 5 | `src/scales.js` | ✅ |
| 6 | `src/hooks.js` + разрезание DOM-записей | ✅ |
| 7 | `src/audio.js` | ✅ |
| 8 | `src/backing.js` | ✅ |
| 9 | `src/recorder.js` | ✅ |
| 10 | `src/vision.js` | ✅ |
| 11 | `src/gestures.js` | ✅ |
| 12 | `src/draw.js` | ✅ |
| 13 | `src/ui.js` + финальный `main.js` | 🔵 следующий |
| 14 | Обновить `CLAUDE.md` под новую структуру | ⬜ |

~~**Ничего из списков ниже не делаем, пока идут шаги 13–14.**~~ — снято, шаги пройдены.

---

## 1. Foundation

_Rewritten in English at RUN 5 (DOC1 leftover); the Russian text as it stood is in `archive/BACKLOG-history.md` «§1 Фундамент (moved at
RUN 5)», word for word. Here: what SUPPORTS other work — settings storage, identities, offline. Status marks updated against today's code._

### ⬜ localStorage for settings
> **The mechanism already exists:** `i18n.store` — a localStorage wrapper with try/catch and a fall-back to MEMORY (a private window and
> `file://` must not break the start). It already keeps the **language** (`handsong.lang`) and **lesson progress** (`handsong.lesson.<id>`).
> The settings below are just more keys in the same store; no new wrapper is needed.

Every start still begins from the default mode and key; the session's choices are lost. To keep: the mode (`scaleId` — by id since F0–F8),
`tonic`, `seventh`, the timbres (by permanent id since TIM1), `loop.bpm`, `aRef` (A4 — back to 440 today), `handFn` (hand functions),
`loop.metre`. Fits the release (a person comes back to their tuning, A4 and hands). Night keeps its own few choices per device (STAGE4-NIGHT
plan §5).

### ✅ Stable ids of modes, tunings and timbres — the prerequisite for saving (was 🔵; done)
- **Was (before T0):** modes had no id at all; a mode was addressed by its POSITION in `SCALES` (hence «append only»), and a recorded
  event froze `sc:CUR()` — a REFERENCE to the mode object. In memory that is right (replay survives reordering, renaming, translation —
  polymodality, hard rule #7 stands on it); on disk it is impossible (a reference cannot be serialised) — saving and the user's own tunings
  (§3.34: created, edited, DELETED) were blocked.
- **Done since:** T0 gave every mode a stable string `id` and a `tuning` id; F0–F8 moved all tunings, modes, palettes and chord modes into
  data files (v1) with id addressing everywhere a reference outlives a session (`state.scaleId`, `scales.scaleById`); P0–P4 / TF1–TF5 made
  the recorded identity the VIEW (mode + «tuned from» + chord mode + key + key cents — `scales.viewIdOf` / `viewKeyIdOf`), which the song
  file writes as a descriptor; TIM1 / TIM2 gave timbres permanent ids (`a.inst` / `a.kit` store the id); rule #37 makes identity ≠ name ≠
  position permanent for every record (timbres, tunings, modes, effect presets, events — IDS1 —, lane points, tracks — CMD1b).
- **Songs as files** (the user's direction at T5): ✅ SAVE1 (Save / Open, versioned format, today v7), SONG1 (a song carries copies of the
  person's own records — deleting a tuning never breaks a song), SONG2 (the demo song is a data file), AUTOSAVE1, SONG3, TIM3d (full timbre
  copies).
- **Tunings and modes as files** (the user's direction at T7): ✅ F0–F8 (106 data files; the loader checks each; other people's files are
  data only). Left from that direction: the Scala readiness below; the «how chords are built» property is in code since T7 (`chordBuild`:
  adaptive vs from the tuning).
- This was FOUNDATION, not a feature: it adds nothing by itself, but the linear multitrack song (minutes of material, edited in the piano
  roll) must survive a reload — so it had to come before freezing and export.

### ⬜ AF6 — the rest after AF6b (16-bit frozen data in memory is done) — rewritten in English at AF3
1. **On the device, across reloads** (decision 3(c), AFTER saving exists): Int16 chunks (`FRZ_CHUNK`, 2^15 frames) as files — in the
   PROJECT FOLDER (WAV, usable in other programs), else browser storage as a CACHE (losing it loses no work: it is recomputed from notes).
   Cache key = freeze signature (`freezeSig`) + track id; a stale cache entry is discarded.
2. **Chunk paging** (streaming): the audio-thread store keeps only chunks near the playhead (and around the brace), the rest loaded ahead;
   `frz-reader` already reads by chunks — needs a "need chunk k" protocol and look-ahead (by `SCHED_AHEAD` and the bar).
3. **Opus as an optional low-memory mode** for weak phones — by choice only, never default (WebCodecs; encoder delay → overlapping chunks
   or one stream; never MP3: encoder padding breaks joins).
4. **"Notes and tail only"** (decision 3(a)): ≈ 3 of ≈ 49 MB on the seed, ≈ 14 % on the demo — together with (1)/(2), as storage segments.
5. **Memory budget** — ✅ a guard exists since AF3 (`AF_BUDGET_MB`: 300 MB touch / 1 GB desktop; over it a track stays live, skipped, no
   eviction). AF6 may replace "skip" with "the farthest inaudible tracks stay events".
6. Without the frozen-track worklet — Float32 as before (named in `CLAUDE.md`); pack that path too if it turns out common.
7. **Offline contexts pinned by Chrome** (found AF3 part 0b; RENDER-LEAK): a context that called `audioWorklet.addModule` is never
   collected — ≈ 6 MB per render of a small track. ✅ Fixed for every track WITHOUT a KS timbre (the worklet is no longer loaded there;
   30 renders +1.2 MB, control +137.8 MB; renders got faster). ⬜ KS (plucked solo) tracks still pin ≈ 6 MB per render: tried and failed — a
   hosting iframe (removed, navigated), building everything inside it, dismantling the graph. Options: a JS (non-worklet) KS for renders
   only if it can be made sample-identical; or a render worker process if the platform ever offers one. Measure on a phone.
8. ⬜ **Per-track effect chains** (AF5 follow-up): today unfrozen tracks of one role share the role's TRACK chain (last writer wins among
   them; the live chain is separate since AF5). Per-track chains would isolate tracks from each other; cost ≈ one chain (a reverb ≈ 49 nodes)
   per unfrozen track that uses one.

### ⬜ The buffer swap (AF2) — what is left: tails of drum hits and of the role's live network at the crossfade (recorded at AF2; not urgent)
At a swap without a pause (a 20-ms crossfade on a bar line) the track's chord, bass and solo voices are cut exactly, but (1) drum hits
scheduled before the swap are one-shot nodes with no registry — their tails ring on top of the same tails in the buffer; (2) the role's
live reverb / delay carries the tail of the cut voices (≤ RT60) on top of the buffer's tail. Fix for (1): a hit registry by owner `hit:N` (the
hit's gain node, like `tg` of voices) cut by the same `voicesCut`. Fix for (2): a chain per track (auto-freeze gave the means: the role's
network carries only live sound since AF5). Until then — choosing a pause makes both cases rare.

### ⛳ Saving — the user's decision (recorded at AF1; stage 3, with the song format — partly done: SAVE1, AUTOSAVE1, SONG1–SONG3)
A song is the person's work, small (hundreds of KB) and protected; frozen sound is a recomputable cache. Two visible states «Draft» /
«Project — saved in …»; a project = a folder on disk (File System Access API, WAV of frozen tracks), a project file by hand, later an
account (songs only). Autosave + versions, write-then-replace, one editing tab, export / import as one file, `storage.persist()`, warnings
(private window, Safari outside the home screen — 7 days, no copy for a long time) and clear disk errors. In full: §3.35, the box «THE USER'S
DECISION ON SAVING». Done so far: song files by hand (SAVE1), the song kept on the device (AUTOSAVE1, last 5), copies of own records and
timbres in the file (SONG1, TIM3d), Open as one ↶ step (SONG3).

### ⬜ Recording as sound («audio take») — after auto-freeze, next to the mixer
A second way to record: a track captured as SOUND while playing, not as events; its notes are not editable (trim, move and level — maybe
later). It reuses the frozen-track playback machinery: a track whose content is a buffer. Gain: exactly what was heard, the expression hand
too; no re-performance differences; later the path to microphone recording. **The real obstacle was:** one effect network per role —
capturing the role's bus would also catch UNFROZEN tracks of that role playing from events; so it naturally comes AFTER AUTOMATIC FREEZING,
after which that network carries only live playing (✅ AF3–AF5). Place in the work order: stage 5, next to the mixer's per-track effects.
Depends on: auto-freeze (✅) and the frozen track's buffer playback (✅ F4).

### ⬜ Scala readiness (.scl / .kbm) — before the mode builder, next to the user's own tunings
The core of the model already matches Scala: `.scl` lists pitches in cents or ratios and ends with the period; `.kbm` holds the reference
note and its frequency; our tuning (`TUNINGS`), anchor (the view, «tuned from», A4) and the mode's selection (`sel` / `root`) map onto
them. For a clean round trip four things are missing:
(a) **EXACT RATIOS** as data next to the cents of just tunings (Partch, just `ji12`, Pythagorean), so export writes `7/4`, not rounded cents;
    the price still reads cents — nothing audible changes;
(b) **STEP NAMES** as optional tuning data instead of per-tuning code paths (`stepName`, `swaraOfCents`, «(4)» in Pelog) — partly done
    since F3 (naming schemes in data, `scales.namingOf`), so an imported or user tuning carries its own names;
(c) **IMPORT NORMALISATION RULES:** pitches out of order, repeats, values beyond the period, the implied 1/1 that `.scl` does not write;
(d) **A ROUND-TRIP PROBE:** export every built-in tuning to `.scl/.kbm`, import it back, compare the pitches. An equal tuning exported as
    a cents list must be RECOGNISED on import and return to the generator form (`{period, equal}`) — otherwise frequencies drift in the
    last bit (the generator form is what `pitchHz`'s bit-exactness stands on).
Depends on: stable ids of the user's tunings (✅ above) and the song file format (✅ SAVE1). Scheduled with user modes via Scala (stage 7).

### ⬜ Service worker: the model cache (→ Night, stage 4)
> **The SW is registered — and DELIBERATELY empty** (`sw.js`, an empty `fetch` handler). Its only job is installability: without a
> registered SW with a fetch handler Chromium does not send `beforeinstallprompt`, and the install button never appears. There is no cache ON
> PURPOSE: nothing can get stuck in an old version; camera, sound, worklets and relative paths under a GitHub Pages sub-folder work exactly
> as without a SW. **This item = add the cache TO IT**, not a new SW.
The model + WASM come from the CDN at every start: a bad connection = the app does not start. A cache gives offline use and a fast start.
⚠️ The price: a cached model is also a risk of a stuck version — which is why the cache was not added at first. Now planned for Night: vendored
MediaPipe + model, a versioned precache written by the release tool, an update toast (`docs/night/STAGE4-NIGHT-plan.md` §9.1).

---

## 7. НАПРАВЛЕНИЕ ПРОДУКТА (решения пользователя, записаны в проходе по документации после T5)

> ⛳ Это НАПРАВЛЕНИЕ, а не спецификация: ни один пункт ниже не спланирован по слайсам. Записано словами
> пользователя, с честной ценой. Порядок работ — в шапке этого файла и в HANDOFF (Часть I).

### ⬜ 7.3. ОБМЕН, ПРОДАЖА, ДРУГИЕ ПРОГРАММЫ — СВОЙ ФОРМАТ + ЭКСПОРТЫ
- **Универсального формата патча синтезатора НЕТ** — у каждого синтезатора свой.
- **Выбранная форма:** НАШ СОБСТВЕННЫЙ открытый, ВЕРСИОНИРОВАННЫЙ формат тембра — источник правды. Несёт
  СТАБИЛЬНУЮ идентичность, ВЕРСИЮ, АВТОРА и ЛИЦЕНЗИЮ.
- Всё остальное — ЭКСПОРТ из него:
  - **отрендеренные сэмпл-инструменты в открытом формате сэмплера** — для работы в других программах;
    ⚠️ теряют редактируемость (это снимок звука, а не тембр);
  - **строи — в формате Scala** (стандарт микротональной музыки).
- **Плагин нашего движка для других программ** — ДАЛЁКИЙ отдельный проект.

### ⬜ 7.4. ⛳ ФОРМАТ ТЕМБРА ПРОЕКТИРУЕТСЯ С УЧЁТОМ ВСЕГО ЭТОГО С САМОГО НАЧАЛА
Своим ОТДЕЛЬНЫМ планом, ДО конструктора тембров: идентичность, версия, автор, лицензия, серверное хранение с
локальным кэшем, экспорт в сэмплер и в Scala, удалённый тембр, не ломающий дорожку. Сегодняшние точки
опоры в коде: единственный вход выбора тембра дорожки — `audio.timbresOf(role)`; ⚠️ но индекс тембра
лежит В САМОМ СОБЫТИИ (`a.inst`/`a.kit`), и по индексу списки читают ещё движок, селекторы панели, рендер
и свёртка подписи заморозки (`tmix` считает id малым целым) — все они войдут в этот план.

**⛳ ВХОД ПЛАНА — «СЛУЧАЙНОСТИ ИСТОРИИ» СОЛО И БАСА (записано при S7, по выводам плана правки соло; решение пользователя «бас и соло — ОДИН
инструмент, различаются тембрами и регистром»).** Сегодня код соло и баса ЗЕРКАЛИТСЯ, а не сливается; каждое различие ниже — ПОЛИТИКА,
которая в формате тембра становится СВОЙСТВОМ ТЕМБРА (и тогда «бас» или «соло» — лишь какой тембр выбран):
- **строитель голоса** (банки соло: субтрактивный, FM, Карплюс–Стронг — `audio.buildLeadBanks`; бас — две пилы и фильтр, `buildBassPool`) —
  истинное различие, оно и есть тембр;
- **регистр по умолчанию** — цена роли: `scales.leadFreqTi` от A, `bassFreqTi` от A/4 (`scales.js`, рядом с `melodySplit`). ⛳ Регистр
  остаётся задачей ФОРМАТА ТЕМБРА: событие хранит `oct` 0..3 ОТ базы роли, поэтому база, ставшая настраиваемой, обязана быть заморожена в
  событии (или в виде) — иначе её смена молча перестроит каждую записанную ноту (тот же довод, что у тоники);
- **режим голоса по умолчанию** (соло — полифония, бас — ведущий; `state.voiceMode`) — уже выбор, станет умолчанием тембра;
- **умолчание Скольжения** 20 / 12 мс (`audio.LEAD_GLIDE_TC`/`BASS_GLIDE_TC`, `glide.defBy`);
- **квантизация при записи** (соло — без неё, бас — ½ доли; `recorder.gridFor`);
- **форма ключа владельца** (`'leadloop:N:v'` без `k` против `'bassloop:N[:k[:v]]'`) и запись номера ноты `v` (у соло всегда, у баса только
  ненулевой) — внутреннее, скрыто `recorder.EDIT_ROLE`; сольётся вместе с кодом;
- **правило отсутствующей карты эффектов** (соло — «звучать живой цепью», `audio.applyFx` R2; бас — «не задано»);
- **смена тембра посреди ноты** (соло переливается → пара связки `a.tie`, T3; бас печёт тембр на атаке);
- **кривая бенда терменвокса** (пишется только у соло; бас-терменвокс пишет ближайшую ступень) — правка кривой и обрезка её длиной уже по
  `a.bend`, не по роли (S5);
- **старые скаляры драйв / вибрато / тремоло на ноту** (только в голосе соло; «второй этаж» эффектов);
- **рука выразительности** (только соло, `state.roleHasExpr` — «первый заход»);
- **время переигровки** (соло — «почти сейчас» через `fireNear`, бас — в окне опережения `scheduleLayers`; перенос соло в окно — отдельное
  слышимое изменение) и шов повтора (соло поднимает базу `vBase`, бас — `k`).

**⛳ ТЕМБРЫ — ДАННЫЕ, А НЕ КОД (записано при S7, направление плана).** Сегодня тембр — КОД: записи в `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/
`DRUM_KITS` и ветки построения в `audio.js`, а адрес тембра — ИНДЕКС в списке (`a.inst`/`a.kit` в событии; хвост `LEAD_INSTR` занят
Карплюсом–Стронгом, поэтому новый тембр соло нельзя даже дописать). План: в коде остаются ТИПЫ ДВИЖКА (субтрактивный голос, FM-пара,
струна Карплюса–Стронга, ударный синтез) — а каждый тембр становится ФАЙЛОМ ДАННЫХ со стабильным id (как строи и лады, F0–F8: формат,
версия, проверка при загрузке, файлы пользователя). ⛳ **Формат НЕ ЗАВИСИТ от движка звука:** он описывает музыкальные величины —
осцилляторы (форма, расстройка, уровни, гармоники), фильтр и его огибающую, огибающую громкости, вибрато, скольжение и режим голоса,
регистр по умолчанию, — а НЕ узлы Web Audio. Тогда тембры переживут будущий перенос синтеза в ОДИН AudioWorklet (возможно, WebAssembly —
предложение стратега §7.10 п.6), а движок можно менять, не трогая ни одного файла тембра. ⛳ **Доказательство переезда — офлайн-рендером:**
каждый встроенный тембр рендерится ДО и ПОСЛЕ (та же нота, то же семя — `render.js` уже умеет посев и сравнение буферов) и сравнивается
сэмпл в сэмпл; где ровно нельзя (порядок суммирования — правило слагаемых, Known limits) — в последних битах с названным порогом, а не
«на слух».

### ⬜ 7.8. ⛳ РАСПОЗНАВАНИЕ РУК ВНЕ ГЛАВНОГО ПОТОКА — ГЛАВНЫЙ ТЕХНИЧЕСКИЙ ДОЛГ (записано при VOL-3)
- **Что сегодня:** ОДИН поток делает всё — ищет руки в кадре камеры (MediaPipe, синхронно), рисует, считает жесты,
  планирует звук. Поиск рук — самое долгое, и пока он идёт, всё остальное ЖДЁТ: живые ноты запаздывают, экран
  подтормаживает. Опережение планировщика (`SCHED_AHEAD` ≈ 0.3 с) и несколько предосторожностей заморозки существуют
  ТОЛЬКО чтобы это прятать.
- **Что даст перенос в свой поток:** живые ноты — быстрее и ровнее, экран — плавнее.
- ⚠️ **Честная цена:** кадры камеры надо передавать во второй поток; поддержка этого в браузерах разная.
- Связано: замер задержки входа числом (§3.32) — он покажет выигрыш до и после.

### 🟡 7.12. RELEASE AND MONEY STRATEGY (proposed at AR2, 2026-10-12; item 1 DECIDED by the user 2026-10-14; rewritten in English at LIC1)
> Items 2–5 are still PROPOSALS, not decisions.
1. ⛳ **DECIDED (user, stage-3 answer Q1, 2026-10-14): the first public release is «Night» (§7.16), right after stage 3.** Order: 3 foundation
   → 4 Night (offline, detection in a worker, low-power) → 4b installation (kiosk) mode (§7.18) → 5 saving, export, audio tracks, per-track
   effects, «Listen» → VOL-7 → 6 MIDI → 7 new-engine instruments, timbre builder, own modes with Scala, sampler → 8 server; lessons last.
   The user's own authored visual design and icon set (§7.19) is done BEFORE the Night release. (Was: «first release after stage 5».)
2. **Monetisation ladder:** free play → **«Plus»** one-time purchase (all tunings, all timbres, unlimited tracks, WAV export) → **paid packs**
   (sound worlds, tradition sets) → **«Pro» subscription** only when it has GROWING content (cloud, MIDI/MPE, builders, monthly sound worlds)
   → **licences** for schools and installations. Matches §7.2: paid = what a server checks or what grows; a one-time «Plus» locks honestly
   only with a server or a signed build.
3. **«Record a clip» button:** camera video + HAND TRAILS + sound in one file for sharing. Today `clip.js` records the CANVAS (grid, hands,
   labels — no HTML panels) with sound as one WebM; trails would be a new drawing on the canvas and land in the clip by themselves.
4. **Key detection for «hearing the room» (§7.11) is written OURSELVES** (pitch-class chroma over a few seconds against key profiles). Not
   Essentia.js: AGPLv3 for non-commercial use; a paid product needs a commercial licence (hard rule #32).
5. **A simple mode is a second SHOP WINDOW of the same code** (feature switches, its own name), not a separate app.
6. ⛳ **Hosting before selling (user, Q14, 2026-10-14):** the Vercel deployment's visitor counter (Vercel Web Analytics) stays and is named in
   the privacy notice — but **Vercel's Hobby plan forbids commercial use**: before anything is sold, move to a paid Vercel plan or other
   hosting (GitHub Pages' terms to be checked then as well).
