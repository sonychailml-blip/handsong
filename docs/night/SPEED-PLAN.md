# SPEED — the speed and latency plan (the founder's decision, 2026-11-23)

Goal, in order: (1) the shortest time from a gesture to its sound; (2) a smooth app everywhere (no stutter, no audio dropouts, a quick start).
Quality is kept. Runs are named `SPEED-n` (NIGHT track; a core part is its own small `CORE-n`, opt-in, default = today, both apps' checks).

## Rules
- Measure → change → the same measurement. An invisible change is proved byte-exact (picture) or sample-exact (sound); a visible one ships
  behind an old/new switch and the founder decides. Detailed is never simplified without the founder's «yes».
- ⛳ **Detailed stays exactly as it is** (the founder, 2026-11-25): a picture change is made only at Standard and Light.
- ⛳ **No automatic quality change** (the founder, 2026-11-25): SPEED-1 step 8 built one and it was removed the same day; only the PERF-4 name list (a known weak GPU starts at Light on its first visit) stays. The person chooses.
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
2. ~~Camera 60 fps where offered~~ — struck (the founder, 2026-11-25: the camera adapts by itself).
3. A smaller detection input (e.g. 480×360) — kept only if a far hand is still found.
4. A rarer second-hand search while one hand is tracked (steadier rhythm; the second hand found a little later).
5. Hands before picture: when detection slows under the room's load, the picture eases its resolution for a moment and comes back smoothly.
6. A steady 30 fps picture on weak devices (frees the GPU for the hands).
7. A one-time hint to switch the browser to the high-performance GPU when an integrated one is in use.

## Stage 2 — faster sound — ⏸ POSTPONED, every item (the founder, 2026-11-25: no sound work for now; to come back to later)
1. ~~A smaller audio buffer~~ — skipped (the founder, 2026-11-25: the gain unclear and small; we already ask for 'interactive', Windows adds its own part).
2. A lighter engine: voices built when needed, cached and gated after (rule #3), not 24 up front — the same sound (sample-exact proof).
3. ~~A faster audible onset for slow-attack timbres~~ — struck (the founder, 2026-11-25).
4. ~~Adaptive smoothing of volume and depth~~ — struck (the founder, 2026-11-25).
5. Experiment, behind a switch: the pinch predicted one frame early from fingertip speed — kept only with no extra notes.

## Stage 3 — smoothness of the whole app
1. A stutter recorder: each late frame logged with its cause (picture, hands, sound, garbage collection).
2. No per-frame garbage: reuse objects in the hot paths.
3. ~~The Detailed forest made cheaper~~ — struck (the founder, 2026-11-25: Detailed stays exactly as it is).
4. The interface: menus, cards and transitions without effects too costly for weak GPUs.
5. Largest step, last: the room's picture in its own thread (OffscreenCanvas), so the interface and gestures never wait for the picture.

## Stage 4 — size for speed («baking»)
Ready-made forest geometry instead of building it at start; baked light and shadow for the still parts (the hand's light stays live);
GPU-compressed textures; precomputed tables for sound and picture; a small start set, the rest downloaded in the background, and after the
first visit the whole app kept on the device. (A bigger hand model is SLOWER — there the gain is the smaller one.)

## Stage 5 — start
Shader setup in parallel with the hand model's load (the founder: may be tried); the long pre-publish check shortened. ~~The quality picked by the device's strength~~ — struck (no automatic quality change).

## The founder's order after step 8 (2026-11-25)
Stage 2 postponed whole (the sound: the buffer, the lighter engine, the predicted pinch — later); stage 3 (the stutter recorder; less garbage — the rain's 7–10 MB/s): go; stage 4 (baking): try, kept only if faster AND the picture loses nothing; stage 5's parallel shader setup: try. Every picture change at Standard and Light only.

## Expected (to be proved by measurement)
Gesture → sound on the laptop by day ≈ 120–125 → 70–90 ms (more inside a room); the Detailed and Standard forest clearly smoother; a repeat
start almost instant. The evening dark is a camera limit: only light on the hands helps there.

## Lessons — what worked, what did not (SPEED-0 … SPEED-1 step 7; the founder, 2026-11-25: keep them so a later speed run does not repeat a mistake)
Details and numbers per step: `docs/night/WORK-LOG.md`. Machine: Intel HD 4000, 1920×1080, Chrome (never switched to the NVIDIA).
**Worked**
- Measure before choosing: a CPU profile (`Profiler` via CDP) or a leave-one-out GPU split (`perf1 --meshes`, `--passes`, `--exp`) found the real cost every time; guesses were wrong (below).
- The paint's first picture at 0.75 (step 1): the largest single GPU gain (Standard 54 → 36 ms), the strokes keep their screen size.
- Dark point lights skipped per fragment (step 2): exact pixels, −5 ms at Detailed. Lights at intensity 0 then cost almost nothing — so hold a light dark rather than hiding it (step 6).
- Far trunks in a plain material (step 4): −6.4 / −3.6 ms; the founder judged the look.
- Light's own picture changed IN PLACE, no rebuild (steps 5–6): every other leaf card, per-vertex plants, the wild lights dark — the switch 12–19 s → 0.1 s.
- Session memo + files for the forest's pure place searches (steps 6–7): ~11 s of JS per opening was the same answer each time; replayed with each call's arguments checked; the first opening 27–33 → 16 s, repeat Detailed 32 → 5 s.
- The second hand searched every 5th frame while one plays (step 3, CORE-29).
- Show what is chosen live before deciding (a temporary `?try=` switch, then built in properly).
**Did not work / traps**
- Hiding lights (`visible=false`) changes the light count → EVERY lit program recompiles (a 5-s freeze at the first switch). Keep the count; use intensity 0.
- «Mist, beams, halos at half size» — planned, measured at ~1.5 ms: dropped. The undergrowth's soft edges cost ~0.
- Detection off the main thread (worker), on the CPU, or the room drawn after detection: all measured slower or starving the picture on 2 cores / 4 threads (step 3). A smaller detection input and a «hand matters more» switch: refused by the founder.
- The 2D overlay canvas hidden: no gain (its cost is compositing).
- Background loading of files does not shorten pauses — they were already cached; the pauses were JS building and shader compiling.
- Preparing a room's GPU programs in the background: not needed — Chrome keeps compiled programs on disk between visits (the first rain 35 s happens once per browser); doing it while playing would stutter.
- Instant Detailed ↔ Standard: Detailed's context is antialiased (a context attribute → a new context); holding both forests doubles GPU memory. Kept as a 4–5 s rebuild behind a fade.
- A session memo shared by a module that has its OWN memo shifts the record (the canopy, step 7): wrap only searches that run on every build, or record the once-a-session ones apart (`PLACES_ONCE`).
- Storing whole meshes in the places file: 7 MB for 1 s — keep files to places, not geometry.
- Single timing runs mislead (Light's gain read 3.6 ms once, 1.6 ms over three runs): repeat a timing at least three times; calls / triangles a frame vary (the mirror every 1.5 s).
- A frame (`room.update`) inside an exact check moves the room: do exact comparisons before any update.
- The automatic quality (step 8: the forest timed on the GPU at the first visit, Light when slow, Detailed when strong): the founder did not want the app to change quality by itself — removed. A browser without a GPU timer (phones, Safari, Firefox) caps Standard at 30 fps, so its frame rate cannot show room for Detailed; only trying Detailed itself could.
