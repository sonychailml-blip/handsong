# Gesture → sound latency — measured results (LIGHT-12, 2026-11-28)

The founder's question: is the delay from a hand gesture to the sound caused by Handsong, or is it the limit of the computer? Answer on the
founder's laptop: **mostly the computer.** The shortest possible path in the browser gives ≈ 114 ms from finger contact to sound; Light gives
≈ 138 ms. Light adds ≈ 25 ms (≈ 20 %) and a longer tail.

## Machine and setup
- The founder's laptop (Windows 10, Intel HD 4000 class GPU — see memory «speed target»), built-in or USB webcam (gives 30 fps at most at 320×240,
  ≈ 20–25 fps delivered), Chrome 158, laptop speakers and microphone.
- Method: the microphone hears the real gesture sound and then the app's click; the time between their onsets = the whole delay (the microphone's
  own delay is the same for both and cancels). Tools: the lab page `tools/lab/latency/` (Live Server `/tools/lab/latency/?g=pinch`) and Light's
  own panel `apps/light/?probe&lab` (the same measure on Light's note path). The measure: `tools/probes/light/lab-analyse.js`; checks:
  `node tools/lab/latency/check.mjs`.

## Results
| What | Value | How measured |
|---|---|---|
| Camera, screen change → frame in the page | **84 ms** median (67–116; 27 flashes) | «flash» mode: the screen flips black/white, a white sheet of paper in front of the camera; includes the screen's own output (≈ 20–40 ms) → the camera itself ≈ 50–65 ms |
| Frame camera → page after the browser's «captured» mark | 6–40 ms (≈ 20 median) | requestVideoFrameCallback captureTime |
| Hand recognition per frame (MediaPipe, GPU) | **35–45 ms** one hand / none; **79–114 ms** two hands | timed in the page, 320×240 |
| Sound to the speaker | **≈ 55–65 ms** real (Chrome reports base 10 + output 41–42 = 52) | «key» mode: a firm Space press → click = 76 ms median incl. the keyboard |
| Click → microphone loop | 98–106 ms (stable) | the start sound check |
| **Pinch (nail tick) → sound, the lab's shortest path** | **114 ms** median (50–149; 22 of 22) | «pinch» mode, Handsong's own pinch law, one hand, 320×240, main thread |
| **Pinch (nail tick) → sound, Light** | **138 ms** median (93–217; 19 of 20) | `apps/light/?probe&lab`, Light's real path (640×480, snapshot + worker, schedule, gestures) |
| Clap → sound (lab) | 521 ms median (341–729) | two hands meeting: MediaPipe loses/lags the overlapping hands — a bad gesture for the model, not relevant to play |

Why «contact → sound» is less than the sum of the parts: Handsong's pinch fires when thumb–finger is 0.20 of the palm (≈ 1.5–2 cm before the
nails meet); the system works while the fingers close the last centimetres. A fast pinch reads 22–50 ms, a slow one 150–170 ms. (LIGHT-13 widened
Light's pinch distances to 0.25–0.29: Light's pinch now fires a little earlier still.)

## Where Light's extra ≈ 25 ms may come from (not measured yet — the founder chose to stop here)
1. The camera at 640×480 (the lab: 320×240).
2. The frame snapshot (ImageBitmap) and the hop to the worker before recognition (the lab: the video element straight into the model).
3. The full-screen drawing on the same GPU as the model.

To continue: measure each in Light's `?probe&lab` panel one at a time (an opt-in switch each), compare with 138 ms.

## Side findings
- The click sometimes reaches the microphone twice (a second copy ≈ 120–170 ms later): perhaps a second output device (monitor speakers?).
- Setting «minimal latency» (latencyHint 0) gives the same base/output as «interactive» on this laptop.
