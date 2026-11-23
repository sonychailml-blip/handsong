# SPEED — the speed and latency plan (the founder's decision, 2026-11-23)

Goal, in order: (1) the shortest time from a gesture to its sound; (2) a smooth app everywhere (no stutter, no audio dropouts, a quick start).
Quality is kept. Runs are named `SPEED-n` (NIGHT track; a core part is its own small `CORE-n`, opt-in, default = today, both apps' checks).

## Rules
- Measure → change → the same measurement. An invisible change is proved byte-exact (picture) or sample-exact (sound); a visible one ships
  behind an old/new switch and the founder decides. Detailed is never simplified without the founder's «yes».
- ⛔ No pre-recorded instrument notes in place of synthesis (the founder, 2026-11-23). Everything else that beats the stutter may be tried.
- Never widen a tolerance or weaken a control. Full untouched; core changes opt-in (core rules 4–6).
- **Checks are automatic and short** (the founder): each step runs only the rows it touched (seconds, at most 1–2 min); the fast speed set
  `node tools/speed.mjs` stays under ~3 min; the long full suite only before a publish to `night-release`. Timing only on an idle laptop;
  a timing number on a busy machine is reported as noise, never «fixed». Phones: «Measure this device» (one tap, numbers sent by the founder).

## Where the time goes today (the founder's laptop, Intel HD 4000; LAT1–LAT3, PERF-1)
- Gesture → sound ≈ 120–125 ms by day: camera frame wait 0–33 (≈ 17), detection 42–53 one hand / 69–80 two / search ≈ 75, gestures a few,
  audio quantum + output ≈ 10 + 42. Evening ≈ 205 ms (the camera gives ~6 fps in the dark).
- In a room it is worse: the hand model runs on the main thread and the same GPU as the room; with the GPU saturated it blocks the main thread
  400–550 ms/s. Picture: Light 52–53 fps; Standard forest 41 / rain 52; Detailed forest 15 / rain 34–39. Audio graph ≈ 0.8 core idle (24 chord
  voices). Cold start ≈ 7 s of shader setup (9 s first ever on a new GPU, 1.4 s after — the browser caches programs); start set ≈ 26 MB.
- Chrome on the laptop's NVIDIA GT 635M instead of Intel: detection 69 → 53 ms, hand → sound 133 → 120 ms (BACKLOG «Dual-GPU laptops»).

## Stage 0 — the fast automatic speed checks (first)
1. `tools/speed.mjs`: one Chrome on this machine's GPU, both rooms × three qualities. COST part (deterministic, judged): draw calls,
   triangles, shader programs, texture and geometry memory, audio nodes built, start-set bytes — against `tools/prints/night-speed-cost.json`;
   a rise fails; a fall is reported (renewed only by a declared `--renew`). TIME part (reported, never judged): fps, frame p95, long tasks
   ms/s, detection ms, hand → sound estimate, garbage MB/s, audio underruns — side by side with the previous run.
2. «Measure this device» gains the hand → sound line and detection track / search, so a phone run answers the same questions.
3. Invisible-change proofs reuse P.night «PERF invisible» (the host's exact A/B) and the offline sound rows; each step adds its own case.
4. Later in stage 1: a recorded hand (the founder's own short clip, our own material) as the fake camera, for tracking-time numbers.

## Stage 1 — faster hands (the biggest lever)
1. Detection off the contested main thread / GPU: main vs worker × GPU vs CPU (XNNPACK) in both rooms at each quality; the best per device
   class (the worker's picture matched the main thread's exactly at LAT2b).
2. Camera 60 fps where offered (frame wait ≈ 17 → 8 ms); 30 elsewhere.
3. A smaller detection input (e.g. 480×360) — kept only if a far hand is still found.
4. A rarer second-hand search while one hand is tracked (steadier rhythm; the second hand found a little later).
5. Hands before picture: when detection slows under the room's load, the picture eases its resolution for a moment and comes back smoothly.
6. A steady 30 fps picture on weak devices (frees the GPU for the hands).
7. A one-time hint to switch the browser to the high-performance GPU when an integrated one is in use.

## Stage 2 — faster sound
1. A smaller audio buffer where the device holds it with zero underruns.
2. A lighter engine: voices built when needed, cached and gated after (rule #3), not 24 up front — the same sound (sample-exact proof).
3. A faster audible onset for slow-attack timbres (a faint transient, the body unchanged) — the founder decides by ear.
4. Adaptive smoothing of volume and depth: steady at rest, no lag in motion.
5. Experiment, behind a switch: the pinch predicted one frame early from fingertip speed — kept only with no extra notes.

## Stage 3 — smoothness of the whole app
1. A stutter recorder: each late frame logged with its cause (picture, hands, sound, garbage collection).
2. No per-frame garbage: reuse objects in the hot paths.
3. The Detailed forest (15 fps): its costliest parts made cheaper invisibly (trunks, the hand light's cube shadow, undergrowth, ground).
4. The interface: menus, cards and transitions without effects too costly for weak GPUs.
5. Largest step, last: the room's picture in its own thread (OffscreenCanvas), so the interface and gestures never wait for the picture.

## Stage 4 — size for speed («baking»)
Ready-made forest geometry instead of building it at start; baked light and shadow for the still parts (the hand's light stays live);
GPU-compressed textures; precomputed tables for sound and picture; a small start set, the rest downloaded in the background, and after the
first visit the whole app kept on the device. (A bigger hand model is SLOWER — there the gain is the smaller one.)

## Stage 5 — start and automatic quality
Shader setup in parallel with the hand model's load; the quality picked by the device's strength at the first start; the long pre-publish check shortened.

## Expected (to be proved by measurement)
Gesture → sound on the laptop by day ≈ 120–125 → 70–90 ms (more inside a room); the Detailed and Standard forest clearly smoother; a repeat
start almost instant. The evening dark is a camera limit: only light on the hands helps there.
