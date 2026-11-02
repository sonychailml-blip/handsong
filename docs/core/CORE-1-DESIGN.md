# CORE-1 design: playing-hand depth calibration and effects-hand sensitivity

Track CORE, run CORE-1. Stage 1 written 2026-11-02 from the code at tree hashes `core a129b2831f2bae63`, `apps/full d6b90cf2cb4be6da`, `apps/night b8b85189cac1a5b4`. **Approved by the user the same day with nine changes; after checkpoint 1 the user replaced the two-point calibration with one step, using the measured numbers in §9. All included below.** Stage 2 runs in the checkpoints of §8.3.

## 0. The design in brief

| Hand and axis | Setting | Zero point | Range |
|---|---|---|---|
| Playing hand, depth | **calibration** (one near point, per camera) + **depth sensitivity** + a **direction** per control | the player's near point | a palm-size ratio: at 1× the far end sits at 0.42 of the near size; the slider sets the travel |
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
| `play:z` | playing hand (solo, bass, drums: every frame; chords: only under a pinch) | size `dist(lm0,lm9)` on raw coordinates | EMA 0.15 per frame, then `clamp01((0.27−hs)/0.19)`; `inv` gives `1−v` | absolute | calibration + depth sensitivity + direction | `core/gestures/roles.js:21,24`; `hands.js:571,588,707,723` |
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

Distances here are **estimates from geometry**, assuming a 9.5 cm wrist-to-knuckle length and a 45° vertical field of view on a 4:3 camera (`hs ≈ 0.114/D`). Noise and frame-rate figures are **measured** (§9).

| Cause | Effect | In CORE-1 |
|---|---|---|
| Comfortable distance | estimated: `d=0` at about 42 cm, `d=1` at about 1.4 m | fixed by the near point |
| Hand size, camera | estimated: 8 cm palm at 60 cm: `d≈0.58`; 60° camera: `d≈0.70` (against 0.42) | fixed: the ratio to the near size cancels both |
| Frame rate | the EMA's time constant is 6 frames: 0.2 s at 30 fps, **about 0.9 s on the Poco (measured 6.7–7.8 fps)** | fixed on the calibrated path |
| Pinch restarting the filter | `S.sm={}` on every pinch (`hands.js:163`) restarts it from one raw sample | fixed on the calibrated path |
| Pinch changing the size | measured: +0.006 desktop, −0.034 phone of the size; on the phone about 3% of the range at 1× | no special handling (user) |
| Tracking noise | measured, after the time filter, as a share of the near size: at most 0.0045 | hold band (§2.3) |
| **Wrist roll, no movement** | x and y are scaled differently, so a sideways palm reads 25% smaller on a 4:3 frame: 0.45 of the range at 1×, 0.64 at 2× | **accepted limit** (user, change 1) |
| Palm pitch 30°, no movement | the size falls 13%: 0.24 of the range at 1× | **accepted limit** |

Accepted limits, stated plainly: a person hears this as the effect following the wrist. It's somewhat larger than today near the near end: today's law moves by 0.26–0.36 for the same roll inside its range (sizes 0.2–0.27). It falls with distance, to about 0.27 of the range at `r=0.6`. It goes in «Known limits» in `archive/CLAUDE-history.md`, and step 125 has the user check it by hand.

Also found, reported and left alone: `fx:z` runs the opposite way to `play:z` (nearer raises it), and its grab point takes an unsmoothed sample.

### 2.3 Calibrated depth

Used only when the active camera has a record. Same measure, four differences:

1. **Law (user, one-step design).** With `r = hs/near`, the ratio of the current palm size to the near size:

   ```
   rFar(s) = 1 / (1 + (1/0.42 − 1) / s)     s = depth sensitivity, 0.7–2
   r0      = 1 − pull                       pull = max(1.25·band, min(4·noise, 0.03)), noise = σ/near from the hold
   d       = clamp01((r0 − r) / (r0 − rFar(s)))
   ```

   Palm size is about 1/distance, so `1/r` is distance over the near distance, and the ratio cancels hand size and camera. The slider **divides the real travel**:

   | `s` | `rFar` | far end, as a multiple of the near distance |
   |---|---|---|
   | 0.7× | 0.336 | 2.97 |
   | 1× | **0.42** | 2.38 |
   | 2× | 0.592 | 1.69 |

   The slider stops at 0.7× so the far end stays within arm's reach (user, after CP2). Why not divide `1−r` directly: it isn't a real distance, and at 0.5× it would give a negative palm size. `d` stays linear in `r`, like today's law in `hs`, so no curve setting in v1. Closer than the near point clamps to the near end.

   **The default 0.42** sits between the measured far/near ratios, 0.472 (desktop) and 0.38 (phone): their geometric mean is 0.4235. At 1× the desktop's measured far point reads 0.91 and the phone's passes the end. Two measurements of one person.

   **At 1× tracking noise is about as today or gentler:** the denominator in size units is `0.56·near`, 0.247 on the desktop and 0.187 on the phone, against today's 0.19. The old worry about a steep mapping applies only at 2× or a small near size.
2. **Time-based filter.** A separate one-pole on `hs`, `a = 1−exp(−dt/0.205)`, matching today's EMA at 30 fps (`τ = −(1/30)/ln(0.85)`) and independent of frame rate. `dt` comes from `nowMs()`, so the probe clock drives it. No clamp on `dt`: the formula stays in 0…1 for any gap, and clamping would slow exactly the Poco, whose gaps reach 392 ms.
3. **No restart on pinch.** Its state lives on the hand beside `S.sm`, not in it (`S.calHs`, `S.calT`), so the `S.sm={}` reset at a pinch doesn't touch it. A hand gone past the watchdog starts fresh. One step per frame through its own memo `S.calF`, cleared where `S.hsF` is cleared.
4. **Hold band.** `r` moves only when the filtered ratio leaves ±band of the held one, with `band = clamp(3·noise, 0.009, 0.02)`, per camera, from the noise measured in its hold. It works on `r` before the law, so both ends stay reachable exactly: the near end because the pull exceeds the band, the far end because `r` isn't clamped.

   Why this width (CP4): CAL7 found a still hand still wrote automation at 7 fps, because one pole at that rate passes far more noise than at 30 fps. Measured at the worst noise (σ 0.0065 of near), 400 seeded minutes:

   | Band | Minutes that write, 7 fps, 2× | 7 fps, 1× | 30 fps, 1× | Dead zone on reversing, 2× | 1× |
   |---|---|---|---|---|---|
   | 2σ | 32% | 15% | 0.5% | 7% of the range | 5% |
   | **3σ (chosen)** | **3.5%** | **1.5%** | **0.3%** | **10%** | **7%** |
   | 3.5σ | 1% | 0.5% | 0% | 12% | 8% |

   So zero points isn't reachable at a usable width: in the worst corner a still hand writes one small point in about 3.5% of minutes. The dead zone is what you'd hear: on reversing direction the value waits for that share of the range. To be judged by ear on the panel.

`fx:z` is **not** on this path. It keeps today's filter, memo and `0.19` (change 3), plus its own sensitivity, so `depthOf` remains and still steps only when `fx:z` asks.

**Visuals.** With calibration on, `handsView().d` reads this same `d` at the global depth sensitivity, before any control's direction or override: this frame's value when the hand computed one, otherwise the law on the raw size, never a filter step. Without calibration its line runs as today.

## 3. Core API (no UI)

### 3.1 Modules

| File | Contents |
|---|---|
| `core/pure/handcal.js` (new, rule #36; runs in node) | tunables `CAL`, record parse / check / text, the laws, `robust`, `createCalRun` (the routine, explicit time) |
| `core/handcal.js` (new, thin) | the live state, store, camera key, listeners, withholding hands |
| `core/gestures/roles.js`, `hands.js`, `fxhand.js` | doors at the sites of §1.1; one line at the top of `processHands` |
| `core/gestures/pose.js` | marks generated hands as synthetic (§4.2) |
| `core/vision.js` | `camLabel`: the camera's name, cheap enough to read every frame (simpler than the planned hook; `hooks.js` stays untouched) |
| `core/pure/format.js` | registers `handcal` in `FORMAT_VERSION` |

Nothing is added to `core/legacy-ui/`, and no strings to `i18n.js`: the routine reports reason codes and the apps word them.

### 3.2 Data model

Per camera: `near` (the size at the near point), `noise` (σ/near from the hold), `at` (a time). No record for a camera means today's law. The far end is not stored: it comes from the default ratio and the slider.

Per control:

| Field | Applies to | Meaning | Default |
|---|---|---|---|
| `dir` | `play:z` | `near0` / `near100`: which end of the hand's range is 0 | absent = the parameter's own `pa.inv`, as today |
| `sens` | `play:z`, `fx:*` | overrides the global value of its address; replaces it, never multiplies | absent = global |

Global, default 1, both global rather than per camera: `depth`, range 0.7–2 (the slider for `play:z`; acts only on the calibrated path, since without a near point there's nothing to measure a ratio from) and `fx`, range 0.5–2 (the effects hand, works with no calibration). An override is stored in 0.5–2; a control on depth reads at least 0.7, because Full's panel can move a control between addresses.

```
play:z, calibrated:  v = d        near0
                     v = 1 − d    near100
play:z, not calibrated: today's expression; dir still mirrors when set
fx:*:                v = clamp01(base + sens · (inv ? −d : d))
play:x:              today's expression, no setting reads it
```

**Direction and `pa.inv`.** One effective answer per control: `dir` when set, otherwise `pa.inv`. With no `dir` every control behaves as today, so chord brightness stays near = 100 and Night's forest near = 0. Full's panel has an invert checkbox on the same parameter; the FULL run must route it through `handCalSetDir` for depth controls, so the two can't disagree (§6).

`1·d` is exactly `d` in floating point, and with no record open the old expression runs anyway. Rows prove both (§7).

### 3.3 Record and storage

```json
{ "format":"handsong/handcal", "version":1, "scope":"<app's word>",
  "global":{ "depth":1, "fx":1 },
  "controls":{ "role:ld|fdepth:depth":{ "dir":"near0" }, "role:ld|cecho:amount":{ "sens":1.4 } },
  "cameras":{ "c1a2b3c4":{ "near":0.334, "noise":0.0065, "at":1793000000000 } } }
```

- **Per device, per app.** Key `handsong.handCal.<scope>`. The app passes `scope` to `handCalOpen`, so core names no product (core rule 8) and the two apps can't collide on Live Server's one origin; a row proves it.
- **Per camera.** The key is the FNV hash (`core/pure/canon.js`) of the track's label, or `facing:<mode>` when the browser gives no label. The record stores only numbers, enums and that hash, never a label or an image (rule #33); `check` refuses unknown fields.
- **Store.** `localStorage` through the same memory fallback as `i18n.store`; a blocked store means the calibration lasts for the session only and nothing throws. An injected store serves the probes, so they never touch a real key.
- **Versioning.** `upgrade()` from `format.js`. A **newer** version reads as uncalibrated and is not overwritten until an explicit reset. Damage drops only the damaged part.
- **Not rule #37 material.** This is device-local, like `handsong.engBench`, and never travels with a song.

### 3.4 Functions

```js
handCalOpen({ scope, store? })            // opt-in; without this call, nothing changes
handCalRead()                             // { camera, calibrated, near, global, controls, status }
handCalSetDepthSens(value)                // the global depth slider, 0.7–2
handCalSetSens(value, controlId?)         // no id = the global effects value; with an id, an override on either address; null removes it
handCalSetDir(controlId, 'near0'|'near100'|null)
handCalReset({ control? } | { camera? } | { all:true })
handCalStart({ hand? })                   // null, or a refusal code
handCalCancel()
handCalAccept()                           // from 'review': save
handCalState()                            // the current phase + live values
onHandCal(fn)                             // every phase change and progress step
```

Internal doors, read by gestures only: `calBusy`, `calFrame`, `calProbeSet` (CP3); `calDepthN`, `calDepthView`, `calDir`, `calSens` (CP4). Probes only: `calStartProbe`, `calKeep`, `calSig`.

### 3.5 What recordings see

Nothing in songs changes. A recording keeps resulting values, never gestures, and `a.vol`, `a.bri` and the lanes are written after this mapping. A saved song plays the same on any device. Renders, freezes and track chains never run the hand path (rule #31).

## 4. The calibration routine

An engine service: `createCalRun` is pure and takes `frame({ t, hands })`, so one script of frames tests it exactly.

```
idle → waitHand → holdNear → review → saved
          any phase → failed(reason) | cancelled
```

| Phase | The player | Done when | Timeout | Fails with |
|---|---|---|---|---|
| `waitHand` | raises the playing hand | a hand is in view and locked | 10 s | `no-hand` |
| `holdNear` | holds it as close as they want to play, whole hand in the frame | still for about 2 s without a break | 12 s | `not-still`, `out-of-frame`, `too-far`, `hand-lost`, `low-rate` |
| `review` | hears it | `handCalAccept` or `handCalCancel` | none | |

### 4.1 Rules

Every timing here is in milliseconds of the frame's own clock; nothing counts frames. Numbers come from §9; they're two runs by one person, so they stay tunables in `CAL`.

- **Which hand.** The playing hand: the one `hand` names, otherwise the largest in view. It's followed by nearest wrist, because MediaPipe's left/right label can flip between frames. The result applies to both hands.
- **The hold's window** (Poco, change 6). The newest samples spanning at least 2 s and holding at least 8. At the Poco's slowest 6.7 fps, 2 s gives 13. A slower device simply waits longer, up to 4 s of samples; fewer than 8 in 4 s fails with `low-rate`.
- **Hold-still.** `2.56·robustσ/median ≤ 0.06` for the size and `2.56·robustσ ≤ 0.05` of the frame for the wrist, checked from the fifth sample on. The robust σ makes the test independent of the frame rate and of single spikes.
  - A still hand measured 0.014–0.017 on this figure, a slowly moving one about 0.26, so 0.06 sits about 4× from each. CP1 measured short windows only: these 2 s figures are worked out from them, and CAL3 checks them on scripts.
  - Moving restarts the hold.
- **Whole hand in the frame** (change 4). All 21 raw landmarks must lie in 0…1. A sample outside restarts the hold, and `advice:'back'` asks the player to move back. Raw is the right frame: a crop only shows less. The routine keeps waiting until the timeout, then fails with `out-of-frame`.
- **Too small.** A still hand with `near < 0.25` isn't accepted, `advice:'closer'`, then `too-far` at the timeout. Why: at 1× the far end is `0.42·near`, and the smallest size measured with no dropout is 0.109.
- **Robust sampling.** The near size is the median of the window. Samples beyond 3 robust σ (1.4826·MAD) are dropped; at least 8 must remain, otherwise the window grows.
- **Blinks.** A gap of up to 800 ms between seen samples is tolerated; longer restarts the hold. 2× the largest gap measured (392 ms). The first design's 400 ms left the Poco only 8 ms of margin.
- **No separate noise failure.** The stillness test already caps the noise (σ/near ≤ 0.0234), so `noisy` could never fire. The minimum-span, wrong-way and no-move failures went with the far step.
- **Other reasons:** `busy` (recording, the editor or arrangement window open, or a run active), `synthetic` (§4.2), `camera-changed`, `cancelled`.
- **Review.** The proposed mapping applies in memory and the hands play again, so the player hears it before choosing. `handCalAccept` saves; `handCalCancel` restores the previous mapping exactly. Leaving the page saves nothing.

**Live values** in `handCalState()`: `{ phase, reason, advice, progress 0…1, elapsed, hand:{x,y} raw, size, d }`, with `advice` one of `back`, `closer`, `still`, null. The hand's position stays raw, so an app remaps it with `sx`/`sy` (rule #12).

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

- **Two sliders.** `fx` for the effects hand on all three axes; `depth` for the playing hand's depth (§2.3).
- **Model.** One global value each, plus per-control overrides; an override replaces it, so the effective value is always in range: 0.5–2 for effects, 0.7–2 for depth.
- **Scale.** Logarithmic with 1× as "normal". Effects: 0.5×–2×, suggested stops 0.5, 0.7, 1, 1.4, 2; a slider position `p` in −1…1 gives `2^p`. Depth: 0.7×–2×, suggested stops 0.7, 1, 1.4, 2.
- **Meaning, effects hand.** How much finger travel takes an effect from 0 to 100. For `fx:y` and `fx:x`: 70% of the frame at 1×, 35% at 2×, 140% at 0.5× (reached by a second grab, since the value latches). Zero point unchanged: where the pinch started, continuing from the value left there. Works with no calibration record.
- **Meaning, depth.** How far the hand travels from the near point to the far end (the table in §2.3). Acts only on the calibrated path.

## 6. How the apps use it

| Need | Call | Full | Night |
|---|---|---|---|
| Turn it on | `handCalOpen({ scope })` | at start | at start |
| Run the routine | `handCalStart`, `onHandCal`, `handCalAccept`, `handCalCancel` | not during a lesson | stop the ghost first |
| Word the failures | reason codes → the app's own strings | both languages | both languages |
| Sensitivity sliders | `handCalSetDepthSens(v)`, `handCalSetSens(v)`, `handCalSetSens(v, id)` | depth, effects + per parameter | depth, effects, optionally echo, tone, wave |
| Direction | `handCalSetDir(id, …)` | per depth parameter, replacing the invert checkbox for them | the forest, if offered |
| Show the state, reset | `handCalRead`, `handCalReset` | yes | yes |

The profile record gets no new field. Where it all appears is recorded in the two backlogs: offered once on first launch (skippable), then in the settings menu next to the sensitivity sliders, with no calibration icon on the main screen.

## 7. Test plan

Probe budget: synthetic data, no new real-time row, so `--repeat` isn't needed.

### 7.1 Node rows (`tools/probe-data.mjs`)

CAL1, CAL2 and CAL3 run as one data row, «CAL1-3 hand calibration (core)».

| Row | Checks | Negative controls (must fail) |
|---|---|---|
| **CAL0 hand measuring (tool)**, CP1 | the measuring page's sums on known series: median, robust σ, frame rate, gaps, window spread, both filters | a shifted series; one sample changed in a median |
| **CAL1 laws (core)** | the near ratio gives exact 0, `rFar(s)` exact 1, clamping both ways; the far table of §2.3; the ratio doesn't change with hand size or camera scale; monotonic over a sweep; the hold band keeps both ends reachable and holds still under noise; `dir` mirrors, absent `dir` follows `inv`; `sens` on relative axes, override replaces global; **bit identity with today's expressions (`Object.is`) over a grid including the edges**; the filter equals today's EMA at 30 fps within tolerance and gives the same time constant at 6.7 and 60 fps | a dividing-`1−r` slider must break at 0.5×; a stored depth slider below 0.7 refused; `sens` 1.0000001; a per-frame filter must fail the 6.7 fps case |
| **CAL2 record (core)** | text round trip exact; resets; two scopes in one store don't collide; a blocked store doesn't throw; a newer version is refused and not overwritten; migration through an injected v0 → v1 step; schema allows only numbers, enums and the hash | one refused damage per field; a planted `thumb` string; a planted `far`; a shared key |
| **CAL3 routine (core)** | scripted frames + fake clock: the happy path at the measured desktop and Poco rates and gaps, jittered at the measured σ; 15% outlier spikes; a blink; two hands; a label flip; a fingertip out of the frame restarts the hold with `advice:'back'`, while the palm stays inside; **each reason code reached, `synthetic` included**; cancel in each phase leaves no record; the same script gives the same result; the same hold at 5, 7, 16 and 30 fps gives the same near size within noise and finishes at the same time within one frame | a mean instead of the median must miss the tolerance; stillness off must accept a moving hand; a palm-only frame check must miss the fingertip; a 500 ms gap must restart the hold under the old 400 ms blink |

### 7.2 Browser rows (`--quick`, both apps; driven by `pose()` through `processHandsProbe` with the probe clock)

| Row | Checks | Negative controls |
|---|---|---|
| **CAL4 nothing changes while uncalibrated** | HAND1's performance gives its pinned print in three states: module not opened; opened with an empty record; opened with `sens` explicitly 1 and no `dir` | `sens` 1.01 must change the print |
| **CAL5 calibrated hand** | a size sweep on `play:z` for solo, bass, drums, chord brightness and volume on depth, in both directions and at 0.7×, 1× and 2×; `handsView().d` equals the depth driving the sound; one filter step per frame; a pinch doesn't restart the filter; camera switch falls back to today's law; `fx:x/y/z` follow `sens` and keep their grab-point zero; **`fx:z` and `play:x` values are exactly today's** | old `handsView` law; a filter reset on pinch |
| **CAL6 silent while calibrating** | the `wTap` stream is empty during the routine; live notes and chord off once; aims unchanged; `busy` while recording and in the editor; **`handCalStart` refuses with `synthetic` on a marked frame and during a probe session; a marked hand mid-run fails it**; tracks unaffected; cancel restores the previous mapping exactly | hands not withheld must produce W* calls |
| **CAL7 a still hand writes next to nothing** | through the real sites and the recorder's own automaton, seeded jitter at the measured raw σ (0.0065 of the near size), the smallest near size (0.25) at 2×, 30 and 7 fps, 5 minutes on fixed seeds: at most one point. The rate over 400 seeded minutes is in the data row: under 1% at 30 fps 1×, 2.5% at 7 fps 1×, 5% at 7 fps 2× | the band at its floor must write in over 30% of minutes; a real slow drift must write |
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
| Wrist roll sweeps the mapping | accepted by the user; named in Known limits and step 125. Up to 0.45 of the range at 1×, somewhat more than today |
| A high slider or small near size makes the effect twitchy | the minimum near size, the hold band, CAL7 at the worst case |
| Thresholds wrong for other people, so the routine refuses them | two measured runs by one person; tunables in `CAL`, checked again at step 125 |
| **The whole-hand check refuses a near point the player wanted** | not measured: the page's `out` read only the palm. A whole hand is about 1.95× the palm, an estimate, so the desktop's measured near size 0.441 gives about 0.86 of the frame's height: tight. The player moves back; the routine asks. Step 125 checks it |
| A step in the sound when a mapping applies | applies only after hands are withheld, and effects already glide with `setTargetAtTime`; judged by ear |
| The player holds a different pose than when playing | measured: pinched against open shifts the size by +0.006 and −0.034; no special handling (user) |
| Another person plays | the record is per device, not per person: they recalibrate or reset. A named limit |
| A hook in `processHands`; a mark in `pose()` | one boolean read after the probe guard; a property no gesture code reads. HAND1 proves both |

### 8.2 Size

About 400 new lines in core (`pure/handcal.js` ~270, `handcal.js` ~100, about 30 edited lines at the sites), about 400 lines of probes, the measuring page about 250 lines, five checkpoints.

### 8.3 Checkpoints

Each one: run the checks, stop, give a commit message, wait for "committed". New exports run `node tools/name-index.mjs --write`.

| CP | Content | Core touched? | Checks beyond the standard | User's step |
|---|---|---|---|---|
| **CP1 measure** (done) | the guided page `tools/probes/core/handstats.html` (no console, big buttons, Russian and English; results on screen and copied), row CAL0, smoke-test coverage | no | `smoke-paths --build` | done: desktop and phone numbers in §9 |
| **CP2 pure core** | `core/pure/handcal.js`, `format.js` entry, rows CAL1–3 | a file nothing imports yet, plus the format entry | none | none |
| **CP3 service** | `core/handcal.js`, camera hook, withholding, the synthetic mark, rows CAL4 (first part), CAL6 | yes | `--all` | none |
| **CP4 mapping** | a depth-moving print per app made before the mapping (`tools/prints/hand-depth.<app>.print.json`), doors at the sites of §1.1, `handsView`, rows CAL4 (full), CAL5, CAL7, CAL8, the development panel (§9.2) | yes | `--all`, hashes, prints not renewed | none |
| **CP5 close** | CLAUDE.md map lines, `archive/CLAUDE-history.md` detail, Known limits and step 125, `docs/core/WORK-LOG.md`, `HANDOFF` records, backlog ticks | docs only | full set once more | step 125 |

Rules held throughout: opt-in with old behaviour as default (core rule 4), no product named in core (8), both apps' checks on every core change (6), no UI or strings in core (2), no git, no new third-party item or network use (#32, #33).

## 9. The measuring page (CP1)

Why real-hand numbers are still needed with today's measure kept: stillness, minimum span, the hold band and the tracking floor all depend on how much a real hand's size reading shakes at real frame rates. Synthetic hands can't show that. A wrong stillness threshold would refuse real people, and only a screen run would reveal it, much later.

- **Where it lives.** `tools/probes/core/`, which preview builds already carry and production builds don't. It's a separate page: no audio, no app state, and it never touches a setting.
- **Steps, about 10 s each.** Near and still · far and still · halfway, pinched · same place, open · slowly near to far and back.
- **Reports, numbers only.** Size median, robust σ, frame rate, gaps, spread per 0.5 s window, share of windows passing at each candidate threshold, wrist travel, value noise after each filter, span and gain.
- **Privacy.** Pictures stay on the device; the person copies the text themselves (rule #33). The copy holds the user agent and frame size, and no camera name.

### 9.2 The development panel (CP4)

`<page>?probe&calpanel` on both apps, local and preview only: it lives in `tools/probes/core/calpanel.js`, and production has neither the file nor the probes tag (smoke test, both ways). Big buttons, Russian and English: run the routine, save or cancel, both sliders, direction per depth control, reset, a 6 s wrist test that shows the range of `d`, copy the numbers. Scope `dev-full` / `dev-night`, so it never shares a record with an app's later screen.

### 9.1 What was measured (user, 2026-11-02)

One person, two devices. Desktop: Windows, Chrome 156, 640×480. Phone: Poco M5, Android 10, Chrome 154, portrait 480×640. Sizes are the palm size; σ is the robust σ.

| Step | Desktop size | Desktop σ | Desktop σ after time filter | Phone size | Phone σ | Phone σ after time filter |
|---|---|---|---|---|---|---|
| Near | 0.44129 | 0.00234 | 0.00188 | 0.33354 | 0.00217 | 0.00135 |
| Far | 0.20815 | 0.00080 | 0.00067 | 0.12685 | 0.00074 | 0.00061 |
| Pinched | 0.26489 | 0.00088 | 0.00082 | 0.17273 | 0.00233 | 0.00151 |
| Open | 0.26325 | 0.00124 | 0.00079 | 0.17887 | 0.00133 | 0.00112 |

| | Desktop | Phone |
|---|---|---|
| Frame rate | 13.9–17.8 fps | 6.7–7.8 fps |
| Largest gap | 88–117 ms | 265–392 ms |
| Far/near ratio | 0.472 | 0.38 |
| Pinch shift of the size | +0.006 | −0.034 |
| Hand seen | every frame | every frame |
| Size spread per 0.5 s, still, largest p95 | 0.0197 | 0.0177 |
| Size spread per 0.5 s, moving, median | 0.0676 | 0.1185 |
| Wrist travel per 0.5 s, still, p95 | 0.0123 | 0.0074 |

**What these numbers don't show:** `out` covered five palm landmarks, so fingertips in the frame are unmeasured; the page's windows are 0.5 s, not the routine's 2 s. The page still reports its far step; the far/near ratio remains useful if the default is ever revisited.
