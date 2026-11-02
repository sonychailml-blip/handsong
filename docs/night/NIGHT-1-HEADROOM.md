# NIGHT-1, stage 1: Night's sound headroom (measured 2026-11-02, laptop only)

Goal of the run: Night plays without crackle on the Poco M5 with camera, hand tracking and a room running, and sounds the same as now. Stage 1 measures and changes nothing players hear or see. The Poco numbers are still to come.

**Conditions of every number here:** Intel i5-3210M, 2 cores / 4 threads, Windows 10, Intel HD 4000, headless Chrome 156 from the runner, 48 kHz. On mains (no battery in the machine), clock 2501 of 2501 MHz, Telegram closed, the user's Chrome open but idle with no app tabs and no camera (13–15 processes, its CPU time grew 91 s over 50 minutes), overall load 0–26% between runs, one sample of 100% as a Chrome window opened. Fake camera with no hand in it, so detection stays in search mode: about 6.6 detections/s, 40–45 ms each, on the main thread. Three real-time runs (23:07, 23:32, 23:44) and one offline run; samples logged around each.

**How to read «budget»:** at 48 kHz one audio quantum is 128 samples = 2,667 µs. Sound must be computed inside it, on average and in the worst case.

## 1. Headroom now
Real time, the «NIGHT stress» playing (8 attacks/s, four fingers overlapping, effects on), with a calibrated ballast on the audio thread stepped until dropouts start (more than 2 in 6 s). The range is the free share of a quantum. One step is 12.5%, and runs differ by about one step.

| Sound | Sound alone, three runs | Camera + detection + forest medium, three runs |
|---|---|---|
| Firefly | 25–37 / 25–37 / 37–50 | 0–12 / 12–25 / 25–37 |
| Handpan | 0–12 / 25–37 / 25–37 | 0–12 / 12–25 / 12–25 |
| Singing bowl | 25–37 / 12–25 / 25–37 | 12–25 / 0–12 / 25–37 |
| Breath flute | 37–50 / 37–50 / 50–62 | 37–50 / 25–37 / 37–50 |
| Reference: Full's SuperSaw | 12–25 / 50–62 / 37–50 | 25–37 / 37–50 / 37–50 |
| Nothing playing (idle) | 37–50, all three | 12–25 / 25–37 / 37–50 |

With no ballast: 0–2 dropouts in all 39 stress passes and 0–1 in all 39 gentle passes. So on this laptop, cool and idle, Night doesn't crackle, with little to spare under stress: a typical free share of a quarter to a third, less with camera and forest. A hot or busy laptop eats that, which is what CP5 saw.

**Night against Full:** about one step less, about 12%, in these runs. Night's margin is real but smaller than the failing row suggested (§5).

## 2. Where the time goes
Offline: render time of a fixed passage on the engine's render copy, best of 3–4 runs. Drift between the first and last run of a block: 4% or less, except one gentle block at 20%. Empty-context overhead: 1 µs.

**A stress passage on the bowl, 906 µs per quantum (34% of budget):**

| Part | µs | Note |
|---|---|---|
| Engine start graph, silent | 181 | LFOs, delay networks, buses |
| Night's effects chain, silent | ≈ 240 | the forest room alone, on signal: 177 |
| Three ringing notes with their voices | ≈ 480 | the rest of the passage |

Live-only parts on top, which the render copy doesn't have: six idle chord voices ≈ 189 µs (Night never plays a chord), the ambience ≈ 60, the limiter 18, the idle backing drone 29 (already inside the start graph).

**One ringing note:**

| Sound | First note | Each further note | Cap | Stress, % of budget | Gentle, % of budget |
|---|---|---|---|---|---|
| Firefly | 197 | 50 | 8 | 32 | 22 |
| Breath flute | 386 | see below | none | 33 | 25 |
| Handpan | 173 | 74 | 4 | 39 | 25 |
| Singing bowl | 193 | 75 | 3 | 33 | 25 |
| SuperSaw (reference) | 163 | 73 | none | 21 | 12 |

The flute's «1 µs per further note» isn't trustworthy: four flute notes measured the same as one. Use its built-bank figure below instead.

**Struck partials are cheap. The stages around them aren't.** A bowl's 8 partials × 3 strikes cost 66 µs in a bare graph, 2.5% of budget. A further note costs 75 µs, of which about 22 µs is partials and the rest its strike's gains, noise burst and filters.

**Notes ringing at once:** at the cap nearly all the time, and in gentle playing too (one note every 0.75 s, the tails being long).

| Sound | Stress: mean / most | Gentle: mean / most |
|---|---|---|
| Firefly | 7.7 / 8 | 2.3–2.6 / 4 |
| Handpan | 3.9 / 4 | 3.9–4.0 / 4 |
| Singing bowl | 3.0 / 3 | 3.0 / 3 |

**Built banks never stop.** A flute or SuperSaw voice, once played, keeps computing for the session behind a closed gate (rule #3): 121 µs per built flute voice, 113 per SuperSaw voice, silent. A struck voice left idle costs about 25. On a stress passage, the same notes after the flute was tried on 4 voices cost 28–31% more (live fast playing built 2 voices, so about half that).

**Tails, computed against heard (bowl and handpan, 220/440/880 Hz, level 1, no room):**

| Sound | Computed to, s | Heard above −80 dBFS, s | Above −70 dBFS, s | Oscillator-seconds wasted, below −80 / −70 |
|---|---|---|---|---|
| Firefly | 1.65 | 1.35 | 1.2 | 17% / 30% |
| Handpan | 6.5 / 4.6 / 3.3 | 4.05 / 3.05 / 2.35 | 3.45 / 2.65 / 1.95 | 31% / 45% |
| Singing bowl | 14.2 / 10.7 / 8.1 | 9.0 / 7.2 / 5.7 | 7.3 / 5.9 / 4.75 | 32% / 47% |
| Flute, SuperSaw | never stops | about 2 / 1 | less | all of it, while gated |

**Denormals: no slowdown near silence.** A bowl's tail costs 644, 619, 606, 585, 571, 484, then 432 µs at 2-s steps, against 396 with no note: a smooth fall, no bump before it ends. A handpan's echo followed for 70 s, past the −760 dB where floats turn subnormal (about 50 s), holds 480–525 µs against 410: a small fixed remainder, not a rise. The limiter stays at 18–20 µs through 140 s, past the 106 s where its envelope would turn subnormal. **The method can see it:** the control's same arithmetic on subnormal numbers in a worklet ran 9–10× slower. ⚠️ ARM may differ: the phone page repeats this.

## 3. What-ifs, on the render copy only
Each passage rendered again with one thing changed. Residual = the difference from today's sound (lower is closer; −138 dB is rounding error). Savings below 5% are inside the noise.

| Change (stress, % of the passage saved) | Firefly | Handpan | Bowl | Flute | Sound |
|---|---|---|---|---|---|
| Expression stage off, voice waveshaper off, voice brightness stage off | 18 | 19 | 20 | 20 | same: −132…−140 dB |
| + partials stop at −70 dBFS | 22 | 20 | 21 | | −56…−68 dB |
| Partials stop at −80 / −70 / −60 dBFS alone | ≈ 0 | ≈ 0 | 1–2 | | −44…−79 dB |
| One note less on the cap | 0 | −1 | 6 | | changed: −9…−32 dB |
| Half the cap | 4 | 8 | 6 | | changed: −7…−18 dB |
| No forest room | 31 | 28 | 27 | 29 | not the same effect |
| Lighter forest (delay-network room) | 6 | 4 | 8 | 8 | changed: −12 dB |
| After the flute was tried | −30 | −31 | −28 | −1 | (cost added) |

In gentle playing: the three stages save 17–18%, partials at −70 dBFS 8–9%, stages + partials 23–24%, half the cap 2–8%.

**Bare-graph lab, a bowl's 24 partials:** sines + per-sample gains 66 µs · gains at block rate 61 µs, but **not the same sound** (a step on the attack and about −1.3 dB, Chromium, measured) · one JS worklet with resonators 21 µs · three pre-rendered buffer readers 6 µs.

**Pre-rendering (21 pitches, 3 velocity layers):**

| Sound | Note length, s | Memory, float / 16-bit | Preparation on this laptop | At one velocity |
|---|---|---|---|---|
| Firefly | 1.45 | 17 / 8 MB | 8 s | 3 s |
| Handpan | 2.7–5.4 | 46 / 23 MB | 29 s | 10 s |
| Singing bowl | 6.7–11.7 | 105 / 53 MB | 59 s | 20 s |

A larger buffer on this laptop, as the browser reports it: `interactive` and `balanced` 10 ms; `playback` and 0.02 s: 20 ms (+10); 0.04 s: 40 ms (+30); 0.08 s: 80 ms (+70). The Poco's own values come from the page.

## 4. Limits of these numbers
- The render copy has no chord pool, limiter or track heads, so offline shares read lower than live.
- The ballast is a ruler in arithmetic on the audio thread, good to about one step. Idle reads 50–60% used against about 25% added up offline, so don't subtract one from the other.
- Offline, the convolution does all its work on one thread; live, its long part moves to a background thread. So the room's 27–31% overstates the audio thread's share. The work doesn't vanish, though: on a phone that background thread competes with the camera and hand tracking.
- The laptop's camera holds no hand, so detection is in search mode. The phone page asks for a real hand.
- No savings have been checked by ear. A residual of −138 dB is the same sound by arithmetic; −56 dB and above needs ears.
- Night's lean strike path applies in all of the above; the flute reference for further notes isn't reliable (§2).

## 5. The «NIGHT stress» row measures unequal things
It plays Full's SuperSaw first, on a clean graph, then the Night sounds in the order Firefly, flute, handpan, bowl, then the SuperSaw again. So the handpan and bowl, the two that failed in CP5, run with SuperSaw and flute banks still computing. Offline, built flute banks add 28–31% to the bowl's stress passage (on 4 voices).

That's a contribution, not the whole cause: the reference's second pass carries the same banks, and in CP5 it still read 0. What it doesn't carry is Night's convolution room, the ambience and the forest picture, and the SuperSaw's passage is the lightest of all (21% against 33–39%). Real time here can't separate the banks from noise: the bowl after flute and SuperSaw read 0–12 / 25–37 / 12–25 against a fresh 25–37 / 12–25 / 25–37. Not changed in this stage.

## 6. The phone page
`tools/probes/night/headroom.js` (page), `headroom-calc.js` (sums, data row «NIGHT-1 headroom sums»), `headroom-worklet.js` (ballast, control, lab). Address: `<preview>/?probe&headroom`. Dev only: previews carry it, production doesn't (smoke test). About 3 minutes of calculation on this laptop, so about 5–15 on the Poco, then about 8 minutes of sound. Tested with the smoke test's short plan on a fake camera and the same calculation part on the laptop. **Not yet run on a real phone.**
