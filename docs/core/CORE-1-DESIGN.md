# CORE-1 design: playing-hand depth calibration and effects-hand sensitivity

Track CORE, run CORE-1. Stage 1 written 2026-11-02 from the code at tree hashes `core a129b2831f2bae63`, `apps/full d6b90cf2cb4be6da`, `apps/night b8b85189cac1a5b4`. **Approved by the user the same day with nine changes, all included below.** Stage 2 runs in the checkpoints of §8.3.

## 0. The design in brief

| Hand and axis | Setting | Zero point | Range |
|---|---|---|---|
| Playing hand, depth | **calibration** (near and far, per camera) + a **direction** per control | the player's near point | near to far is always the control's full range |
| Effects hand, any finger, any axis | **sensitivity** only (global + per-control override) | today's logic: the point where the pinch started | set by sensitivity |
| Playing hand, left-right | **nothing** | unchanged | unchanged |

- **Inert until an app opens it.** Stage 2 adds no caller. Until an app calls `handCalOpen`, every gesture path runs its old expression, so GOLD, HAND1, census and both «untouched» rows stay at 0 with no print renewed.
- **Same measure as today.** Depth still reads `dist(lm0,lm9)` on raw coordinates. No new palm measure (user, change 1).
- **Calibrated path only:** time-based smoothing, no restart on pinch, and the visuals read the same calibrated depth as the sound.
- **Silent while calibrating.** Hands go to the routine instead of the gesture machine.
- **Pure core, thin service.** The maths, record and routine are pure and run in node with a fake clock. One thin live module holds the state. Core has no strings and no UI.

## 1. Inventory: every continuous hand-driven control

"Hand-driven" means a value that varies continuously with a coordinate. Any parameter not marked `fixed` follows one of the five addresses below; Full's panel can re-address any parameter (`core/legacy-ui/ui.js:2638`), so **the setting belongs to the address, and the defaults are only today's occupants.**

### 1.1 The five addresses

| Address | Hand | Input | Transform today | Kind | In CORE-1 | Code |
|---|---|---|---|---|---|---|
| `play:z` | playing hand (solo, bass, drums: every frame; chords: only under a pinch) | size `dist(lm0,lm9)` on raw coordinates | EMA 0.15 per frame, then `clamp01((0.27−hs)/0.19)`; `inv` gives `1−v` | absolute | calibration + direction | `core/gestures/roles.js:21,24`; `hands.js:571,588,707,723` |
| `play:x` | playing hand, under a pinch | fingertip `sx(tip.x,W)`, remapped | EMA 0.4 per frame, then `clamp01((x−zx0)/(zx1−zx0))`; zone = the frozen half; typed chords use the right part only | absolute | **untouched** | `hands.js:287,456,466,478` |
| `fx:y` | effects hand, finger 0–3, under a pinch | raw `lm[4].y` from the grab point | no smoothing; `(p0.y−y·H)/(H·0.7)`; `clamp01(base±d)`; latches | relative | sensitivity | `hands.js:306,322` |
| `fx:x` | same | raw `flipX(lm[4].x)` from the grab point | no smoothing; `Δ/0.7`; `clamp01(base±d)` | relative | sensitivity | `hands.js:305,322` |
| `fx:z` | same | size from the grab point | today's EMA and memo; `(hs−p0.z)/0.19`; `clamp01(base±d)` | relative | sensitivity | `hands.js:303,307,322` |

### 1.2 Who sits on them by default

| Control id (`chain\|fx:param`) | App | Address | Notes |
|---|---|---|---|
| `role:ld\|vol:amt`, `role:ch\|`, `role:bs\|`, `role:dr\|` | Full; Night has `role:ld` only | `play:x` | the note's volume, per hand; resolver `noteVolOf` (`roles.js:137`); Night adds the amplitude floor 0.30. **Untouched in both apps** |
| `role:ch\|bright:amt` | Full | `play:z`, near = 100 | chord brightness, goes into the event as `a.bri` |
| `role:ld\|reverb:decay`, `:tone`, `:mix` | Full | `fx:y`, `fx:x`, `fx:z` on the index finger | Reverb mix is on the effects hand, not the playing hand's depth |
| `role:ld\|dly:mix` | Full | `fx:y`, middle | |
| `role:ld\|drv:*`, `role:ld\|vib:*` | Full | `fx:y`, ring, little | old scalar effects, key `FX_AMT` |
| `role:ld\|fdepth:depth` | Night | `play:z`, near = 0 | the forest's depth; the shell's «Forest» slider scales it through `reach` |
| `role:ld\|cecho:amount`, `ctone:tilt`, `cwave:amount` | Night | `fx:y`, index, middle, ring | `core/profile.js:43-49` |

Every other parameter (`trmMix`, `forest`, `glue`, `glide`, `reverb` on chords) defaults to `fixed` or isn't in a default chain, and gets the setting of whichever address it's assigned to. Volume moved to depth or to a finger in Full's panel follows that address's setting.

### 1.3 Out of this version

| Control | App | Why |
|---|---|---|
| Expression hand: energy, openness, spread, tilt (`core/gestures/expr.js`) | Full | already independent of distance by construction; rules #22/#23 protect its dead zones |
| Theremin pitch (`scales.thereminHz`, `hands.js:417`) | Full | pitch must match the drawn lines (rule #9) |

Pinch, note rows, palette cells and looper commands are discrete, and stay out of scope.

## 2. Depth

### 2.1 Today

`hs = hypot(lm0.x−lm9.x, lm0.y−lm9.y)` on raw normalised coordinates, smoothed by `emaS(S,'hs',hs,0.15)` once per hand per frame (`depthOf`, memo `S.hsF`), then `(0.27−hs)/0.19`. Size grows as the hand nears, so 0 means near and 1 means far. `handsView().d` (`hands.js:772`) holds a third copy of the law; it's read by `apps/night/scene/forest.js:189`, `views/play.js:470` and `views/scene/host.js:106`.

### 2.2 What moves it

The distances are **estimates from geometry**, assuming a 9.5 cm wrist-to-knuckle length and a 45° vertical field of view on a 4:3 camera (`hs ≈ 0.114/D`). CP1's page replaces the noise and span figures with measurements.

| Cause | Effect (estimated) | In CORE-1 |
|---|---|---|
| Comfortable distance | `d=0` at about 42 cm, `d=1` at about 1.4 m | fixed by calibration |
| Hand size, camera | 8 cm palm at 60 cm: `d≈0.58`; 60° camera: `d≈0.70` (against 0.42) | fixed by calibration, per camera |
| Frame rate | the EMA's time constant is 6 frames: about 0.2 s at 30 fps, about 1 s at the 6.3 fps measured in the evening (LAT3) | fixed on the calibrated path |
| Pinch | `S.sm={}` on every pinch (`hands.js:163`) restarts the filter from one raw sample | fixed on the calibrated path |
| Tracking noise | raw σ ≈ 0.003, value σ ≈ 0.0045 after the EMA (`core/config.js:164-168`; an estimate in the code) | hold band, minimum span; measured in CP1 |
| **Wrist roll, no movement** | x and y are scaled differently, so a sideways palm reads 25% smaller on a 4:3 frame: `d` 0.42 → 0.67 at 60 cm | **accepted limit** (user, change 1) |
| Palm pitch 30°, no movement | `d` 0.42 → 0.55 | **accepted limit** |

Accepted limits, stated plainly: calibration steepens the mapping, about 2.5× for a 50 → 75 cm range, so these two errors grow with it: turning the wrist at that gain sweeps about 0.6 of the range. A person hears this as the effect following the wrist. It goes in «Known limits» in `archive/CLAUDE-history.md`, and step 125 has the user check it by hand.

Also found, reported and left alone: `fx:z` runs the opposite way to `play:z` (nearer raises it), and its grab point takes an unsmoothed sample.

### 2.3 Calibrated depth

Used only when the active camera has a record. Same measure, four differences:

1. **Law.** `d = clamp01((near−hs)/(near−far))`, with `near` and `far` the player's two points. Near-to-far is the whole range of `d`.
2. **Time-based filter.** A separate one-pole, `a = 1−exp(−dt/0.205)`, matching today's EMA at 30 fps (`τ = −(1/30)/ln(0.85)`) and independent of frame rate. `dt` comes from `nowMs()`, so the probe clock drives it. Clamped for a stalled frame.
3. **No restart on pinch.** Its state lives on the hand beside `S.sm`, not in it (`S.calHs`, `S.calT`), so the `S.sm={}` reset at a pinch doesn't touch it. A hand gone past the watchdog starts fresh. One step per frame through its own memo `S.calF`, cleared where `S.hsF` is cleared.
4. **Hold band.** The output moves only when the filtered value leaves ±0.006 of the held value, and the ends are pulled inward by 3σ measured in the holds, so near and far give **exactly** 0 and 1. Why it's needed: at gain 2.5 tracking noise reaches value σ ≈ 0.011, and the 3.7σ margin that keeps a still hand from writing automation (`REC_FINE_EPS`, `core/config.js:171-172`) falls to about 1.5σ. CP1 sets the band's width.

`curve` stays linear in size: at a 1.6:1 range the difference from a distance-linear law is small (0.62 against 0.50 at mid-distance). No curve setting in v1.

`fx:z` is **not** on this path. It keeps today's filter, memo and `0.19` (change 3), so `depthOf` remains and still steps only when `fx:z` asks.

**Visuals.** With calibration on, `handsView().d` reads this same `d` before any control's direction: this frame's value when the hand computed one, otherwise the law on the raw size, never a filter step. Without calibration its line runs as today.

## 3. Core API (no UI)

### 3.1 Modules

| File | Contents |
|---|---|
| `core/pure/handcal.js` (new, rule #36; runs in node) | tunables `CAL`, record parse / check / text, the laws, `robust`, `createCalRun` (the routine, explicit time) |
| `core/handcal.js` (new, thin) | the live state, store, camera key, listeners, withholding hands |
| `core/gestures/roles.js`, `hands.js`, `fxhand.js` | doors at the sites of §1.1; one line at the top of `processHands` |
| `core/gestures/pose.js` | marks generated hands as synthetic (§4.2) |
| `core/vision.js`, `core/hooks.js` | camera key via a new nullable `hooks.camera` |
| `core/pure/format.js` | registers `handcal` in `FORMAT_VERSION` |

Nothing is added to `core/legacy-ui/`, and no strings to `i18n.js`: the routine reports reason codes and the apps word them.

### 3.2 Data model

Per camera: `near`, `far` (sizes, `near > far`), `noise` (σ from the holds, for diagnostics), `at` (a time). No record for a camera means today's law.

Per control:

| Field | Applies to | Meaning | Default |
|---|---|---|---|
| `dir` | `play:z` | `near0` / `near100`: which end of the hand's range is 0 | absent = the parameter's own `pa.inv`, as today |
| `sens` | `fx:*` | overrides the global sensitivity; replaces it, never multiplies | absent = global |

Global: `sens`, range 0.5–2, default 1.

```
play:z, calibrated:  v = d        near0
                     v = 1 − d    near100
play:z, not calibrated: today's expression; dir still mirrors when set
fx:*:                v = clamp01(base + sens · (inv ? −d : d))
play:x:              today's expression, no setting reads it
```

**Direction and `pa.inv`.** One effective answer per control: `dir` when set, otherwise `pa.inv`. With no `dir` every control behaves as today, so chord brightness stays near = 100 and Night's forest near = 0. Full's panel has an invert checkbox on the same parameter; the FULL run must route it through `handCalSetDir` for depth controls, so the two can't disagree (§6).

**Why depth has no sensitivity.** Change 2 maps near-to-far onto the full range, and a depth gain would break that. To change a depth control's travel, the player recalibrates.

`1·d` is exactly `d` in floating point, and with no record open the old expression runs anyway. Rows prove both (§7).

### 3.3 Record and storage

```json
{ "format":"handsong/handcal", "version":1, "scope":"<app's word>",
  "global":{ "sens":1 },
  "controls":{ "role:ld|fdepth:depth":{ "dir":"near0" }, "role:ld|cecho:amount":{ "sens":1.4 } },
  "cameras":{ "c1a2b3c4":{ "near":0.214, "far":0.132, "noise":0.0021, "at":1793000000000 } } }
```

- **Per device, per app.** Key `handsong.handCal.<scope>`. The app passes `scope` to `handCalOpen`, so core names no product (core rule 8) and the two apps can't collide on Live Server's one origin; a row proves it.
- **Per camera.** The key is the FNV hash (`core/pure/canon.js`) of the track's label, or `facing:<mode>` when the browser gives no label. The record stores only numbers, enums and that hash, never a label or an image (rule #33); `check` refuses unknown fields.
- **Store.** `localStorage` through the same memory fallback as `i18n.store`; a blocked store means the calibration lasts for the session only and nothing throws. An injected store serves the probes, so they never touch a real key.
- **Versioning.** `upgrade()` from `format.js`. A **newer** version reads as uncalibrated and is not overwritten until an explicit reset. Damage drops only the damaged part.
- **Not rule #37 material.** This is device-local, like `handsong.engBench`, and never travels with a song.

### 3.4 Functions

```js
handCalOpen({ scope, store? })            // opt-in; without this call, nothing changes
handCalRead()                             // { camera, calibrated, near, far, global, controls, status }
handCalSetSens(value, controlId?)         // no id = global; null removes an override
handCalSetDir(controlId, 'near0'|'near100'|null)
handCalReset({ control? } | { camera? } | { all:true })
handCalStart({ hand? })                   // null, or a refusal code
handCalCancel()
handCalAccept()                           // from 'review': save
handCalState()                            // the current phase + live values
onHandCal(fn)                             // every phase change and progress step
```

Internal doors, read by gestures only: `calBusy`, `calFrame`, `calDepthN`, `calDepthView`, `calDir`, `calSens`.

### 3.5 What recordings see

Nothing in songs changes. A recording keeps resulting values, never gestures, and `a.vol`, `a.bri` and the lanes are written after this mapping. A saved song plays the same on any device. Renders, freezes and track chains never run the hand path (rule #31).

## 4. The calibration routine

An engine service: `createCalRun` is pure and takes `frame({ t, hands })`, so one script of frames tests it exactly.

```
idle → waitHand → holdNear → moveFar → holdFar → review → saved
          any phase → failed(reason) | cancelled
```

| Phase | The player | Done when | Timeout | Fails with |
|---|---|---|---|---|
| `waitHand` | raises the playing hand | a hand is in view and locked | 10 s | `no-hand` |
| `holdNear` | holds it as close as they want to play | still for 2 s without a break | 12 s | `not-still`, `out-of-frame`, `hand-lost` |
| `moveFar` | moves it away | size has fallen past the minimum travel | 10 s | `no-move`, `wrong-way` |
| `holdFar` | holds it as far as they want to play | still for 1.5 s | 8 s | `not-still`, `too-far`, `hand-lost` |
| `review` | hears it | `handCalAccept` or `handCalCancel` | none | validation comes first |

### 4.1 Rules

- **Which hand.** The playing hand: the one `hand` names, otherwise the largest in view. It's followed by nearest wrist, because MediaPipe's left/right label can flip between frames. The result applies to both hands.
- **Hold-still.** Over a sliding 0.5 s window: size spread ≤ 8% of the median and wrist travel ≤ 0.03 of the frame, at least 3 samples. Moving restarts the hold. **Provisional until CP1.**
- **Robust sampling.** The value is the median of the hold's samples. Samples beyond 3 robust σ (1.4826·MAD) are dropped. At least 8 inliers are required (2 s at 6.3 fps gives 12), otherwise `low-rate`.
- **Blinks.** A hand missing for up to 400 ms is tolerated; longer restarts the phase.
- **Validation before `review`** (provisional until CP1):
  - `span-small`: `far > 0.75·near` or `near−far < 10·noise`;
  - `noisy`: `noise > 5%` of near;
  - `too-far`: far size under the tracking floor;
  - `out-of-frame`: palm landmarks outside the frame at near.
- **Other reasons:** `busy` (recording, the editor or arrangement window open, or a run active), `synthetic` (§4.2), `camera-changed`, `cancelled`.
- **Review.** The proposed mapping applies in memory and the hands play again, so the player hears it before choosing. `handCalAccept` saves; `handCalCancel` restores the previous mapping exactly. Leaving the page saves nothing.

**Live values** in `handCalState()`: `{ phase, reason, progress 0…1, elapsed, hand:{x,y} raw, size, d }`. The hand's position stays raw, so an app remaps it with `sx`/`sy` (rule #12).

### 4.2 Synthetic input (change 7)

The routine has its own failure code, `synthetic`. All generated hands come from one door, `gestures/pose.js` (Night's ghost and the probes), so `pose()` marks its result (`lm.synthetic=true`, a property on the array that no gesture code reads).

- **At start:** refused when the last processed frame (`BUS.get('hands')`) holds a marked hand, or while a probe clock session runs (`handsProbe`).
- **During a run:** the first marked hand in a frame fails it with `synthetic`. That also catches a ghost armed but not yet drawn when the player pressed start.
- **Full's demo** plays sound directly and drives no hands (`apps/full/demo.js` imports only audio, scales and i18n), so it has no path into the routine.
- **Rows** reach the routine through a probe-only door, with unmarked copies of `pose()`; a row proves the public `handCalStart` refuses.

This doesn't change `frameFilter` or any Night file. Night's first-run flow should still stop the ghost before offering calibration, or the player gets a refusal instead of the routine (§6).

### 4.3 Sound while calibrating

- `handCalStart` calls `liveAllOff()` once. Live notes and the live chord stop, and transport tracks play on.
- At the top of `processHands`, after the probe-clock guard: `if(calBusy()) res=calFrame(res, now);`, which hands over the frame and returns no hands. The watchdog ends pinches, the expression hand fades to neutral and nothing is written, using paths that already exist.
- Effect values stay where they were. Ambience and tracks continue. The bus topic `hands` still carries the raw hands, so the picture is unaffected.
- A lesson's `setup` isn't calibration-aware, so the Full screen must not start during a lesson.

## 5. Sensitivity

- **Scope.** Effects-hand controls only, on all three axes.
- **Model.** One global value plus per-control overrides; an override replaces it, so the effective gain is always within 0.5–2.
- **Scale.** Logarithmic, 0.5×–2× with 1× as "normal"; suggested stops 0.5, 0.7, 1, 1.4, 2. A slider position `p` in −1…1 gives `2^p`.
- **Meaning.** How much finger travel takes an effect from 0 to 100. For `fx:y` and `fx:x`: 70% of the frame at 1×, 35% at 2×, 140% at 0.5× (reached by a second grab, since the value latches).
- **Zero point.** Unchanged: where the pinch started, continuing from the value left there.
- **Independent of calibration.** `sens` works with no calibration record.

## 6. How the apps use it

| Need | Call | Full | Night |
|---|---|---|---|
| Turn it on | `handCalOpen({ scope })` | at start | at start |
| Run the routine | `handCalStart`, `onHandCal`, `handCalAccept`, `handCalCancel` | not during a lesson | stop the ghost first |
| Word the failures | reason codes → the app's own strings | both languages | both languages |
| Sensitivity sliders | `handCalSetSens(v)`, `handCalSetSens(v, id)` | global + per parameter | global, optionally echo, tone, wave |
| Direction | `handCalSetDir(id, …)` | per depth parameter, replacing the invert checkbox for them | the forest, if offered |
| Show the state, reset | `handCalRead`, `handCalReset` | yes | yes |

The profile record gets no new field. Where it all appears is recorded in the two backlogs: offered once on first launch (skippable), then in the settings menu next to the sensitivity sliders, with no calibration icon on the main screen.

## 7. Test plan

Probe budget: synthetic data, no new real-time row, so `--repeat` isn't needed.

### 7.1 Node rows (`tools/probe-data.mjs`)

| Row | Checks | Negative controls (must fail) |
|---|---|---|
| **CAL0 hand measuring (tool)**, CP1 | the measuring page's sums on known series: median, robust σ, frame rate, gaps, window spread, both filters | a shifted series; one sample changed in a median |
| **CAL1 laws (core)** | near gives exact 0, far exact 1, clamping both ways; monotonic over a size sweep; `dir` mirrors, absent `dir` follows `inv`; `sens` on relative axes, override replaces global; **bit identity with today's expressions (`Object.is`) over a grid including the edges**; the filter equals today's EMA at 30 fps within tolerance and gives the same time constant at 6 and 60 fps | span nudged 1e-9; `sens` 1.0000001; a per-frame filter must fail the 6 fps case |
| **CAL2 record (core)** | text round trip exact; resets; two scopes in one store don't collide; a blocked store doesn't throw; a newer version is refused and not overwritten; migration through an injected v0 → v1 step; schema allows only numbers, enums and the hash | one refused damage per field; a planted `thumb` string; a shared key |
| **CAL3 routine (core)** | scripted frames + fake clock: the happy path; 15% outlier spikes; 6.3 fps; a blink; two hands; a label flip; **each reason code reached, `synthetic` included**; cancel in each phase leaves no record; the same script gives the same result | a mean instead of the median must miss the tolerance; stillness off must accept a moving hand |

### 7.2 Browser rows (`--quick`, both apps; driven by `pose()` through `processHandsProbe` with the probe clock)

| Row | Checks | Negative controls |
|---|---|---|
| **CAL4 nothing changes while uncalibrated** | HAND1's performance gives its pinned print in three states: module not opened; opened with an empty record; opened with `sens` explicitly 1 and no `dir` | `sens` 1.01 must change the print |
| **CAL5 calibrated hand** | a size sweep on `play:z` for solo, bass, drums, chord brightness and volume on depth, in both directions; `handsView().d` equals the depth driving the sound; one filter step per frame; a pinch doesn't restart the filter; camera switch falls back to today's law; `fx:x/y/z` follow `sens` and keep their grab-point zero; **`fx:z` and `play:x` values are exactly today's** | old `handsView` law; a filter reset on pinch |
| **CAL6 silent while calibrating** | the `wTap` stream is empty during the routine; live notes and chord off once; aims unchanged; `busy` while recording and in the editor; **`handCalStart` refuses with `synthetic` on a marked frame and during a probe session; a marked hand mid-run fails it**; tracks unaffected; cancel restores the previous mapping exactly | hands not withheld must produce W* calls |
| **CAL7 a still hand writes nothing** | seeded σ 0.003 jitter at gain ≈ 3, 30 fps, 60 s of probe clock: **zero capture points** | the hold band off must write points |
| **CAL8 songs don't care** | applying a calibration leaves the event fingerprint, `freezeSig` and track chain unchanged; one short render within GOLD tolerance | a changed event must be seen |

`P.all`'s state guard gains the calibration state. Probes use the injected store only.

### 7.3 Proof nothing changed

Every checkpoint: static, `probe-data`, `probe-browser --quick`, `--app night`, tree hashes. CP3, CP4 and CP5 add `--all`. These must stay exact, **with no print renewed** (core rule 9): GOLD 0, node census, HAND1, `FULL untouched` 0, `NIGHT untouched` 0.

### 7.4 What only the user can check

Added as step 125: calibrate through the console (`P`, until an app screen exists) and feel the forest or brightness follow; a pinch makes no step; fail each way that's reachable; turn the wrist with the hand still (the accepted limit); phone portrait and landscape.

## 8. Risks, size, plan

### 8.1 Risks

| Risk | Handling |
|---|---|
| Wrist roll sweeps a steep mapping | accepted by the user; named in Known limits and step 125. A wide near-far range lessens it, and the minimum span caps the worst case |
| A narrow span makes the effect twitchy | the minimum span, the hold band, CAL7 |
| Thresholds wrong for real hands, so the routine refuses people | CP1 measures them before they're fixed |
| A step in the sound when a mapping applies | applies only after hands are withheld, and effects already glide with `setTargetAtTime`; judged by ear |
| The player holds a different pose than when playing | CP1 compares pinched with open at the same spot; the app's text says "as when you play" |
| Another person plays | the record is per device, not per person: they recalibrate or reset. A named limit |
| A hook in `processHands`; a mark in `pose()` | one boolean read after the probe guard; a property no gesture code reads. HAND1 proves both |

### 8.2 Size

About 400 new lines in core (`pure/handcal.js` ~270, `handcal.js` ~100, about 30 edited lines at the sites), about 400 lines of probes, the measuring page about 250 lines, five checkpoints.

### 8.3 Checkpoints

Each one: run the checks, stop, give a commit message, wait for "committed". New exports run `node tools/name-index.mjs --write`.

| CP | Content | Core touched? | Checks beyond the standard | User's step |
|---|---|---|---|---|
| **CP1 measure** | the guided page `tools/probes/core/handstats.html` (no console, big buttons, Russian and English; results on screen and copied), row CAL0, smoke-test coverage | no | `smoke-paths --build` | **about a minute each on desktop and phone: send the text.** Fixes the provisional thresholds in §2.3 and §4.1 |
| **CP2 pure core** | `core/pure/handcal.js`, `format.js` entry, rows CAL1–3 | a file nothing imports yet, plus the format entry | none | none |
| **CP3 service** | `core/handcal.js`, camera hook, withholding, the synthetic mark, rows CAL4 (first part), CAL6 | yes | `--all` | none |
| **CP4 mapping** | doors at the sites of §1.1, `handsView`, rows CAL4 (full), CAL5, CAL7, CAL8 | yes | `--all`, hashes, prints not renewed | none |
| **CP5 close** | CLAUDE.md map lines, `archive/CLAUDE-history.md` detail, Known limits and step 125, `docs/core/WORK-LOG.md`, `HANDOFF` records, backlog ticks | docs only | full set once more | step 125 |

Rules held throughout: opt-in with old behaviour as default (core rule 4), no product named in core (8), both apps' checks on every core change (6), no UI or strings in core (2), no git, no new third-party item or network use (#32, #33).

## 9. The measuring page (CP1)

Why real-hand numbers are still needed with today's measure kept: stillness, minimum span, the hold band and the tracking floor all depend on how much a real hand's size reading shakes at real frame rates. Synthetic hands can't show that. A wrong stillness threshold would refuse real people, and only a screen run would reveal it, much later.

- **Where it lives.** `tools/probes/core/`, which preview builds already carry and production builds don't. It's a separate page: no audio, no app state, and it never touches a setting.
- **Steps, about 10 s each.** Near and still · far and still · halfway, pinched · same place, open · slowly near to far and back.
- **Reports, numbers only.** Size median, robust σ, frame rate, gaps, spread per 0.5 s window, share of windows passing at each candidate threshold, wrist travel, value noise after each filter, span and gain.
- **Privacy.** Pictures stay on the device; the person copies the text themselves (rule #33). The copy holds the user agent and frame size, and no camera name.
