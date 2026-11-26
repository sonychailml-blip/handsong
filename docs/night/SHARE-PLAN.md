# SHARE — «record and share a clip» (PLAN, 2026-11-26; nothing built; ❓ = still the founder's)

ROADMAP «After release» item 2 / Stage 2 item 1: the main growth lever.

## The founder's decisions (2026-11-26)
- ⛳ **The person starts and stops the recording** (not «the last 15 s»).
- ⛳ **The mark is on the whole clip**: a small quiet «Handsong Night · handsong.app» in a corner.
- ⛳ **Way B (re-draw after stop)** — if the clip looks and sounds EXACTLY as played (stage 0 below: it can).
- ⛳ **The clip has the screen's shape; 60 s at most.**
- ⛳ **Way A — film while playing** (the founder, after stage 0: B mid-play needs each room's state saved). SHARE-1 built it for testing: `apps/night/film.js`, `apps/night/pure/mp4.js`, the development clip test (Settings → «Video clip test (development)»).

## What it gives
- **Growth.** Every shared clip is a small advert with the address on it. A room played with the hands is unusual enough to be watched.
- **A memory for the player.** «That was beautiful» can be kept.
- **A measure.** How many players share (later, with Vercel Pro custom events) is the clearest «do people love it» number.
- **The founder's own material.** The same export can render promo clips at a higher quality than live (ROADMAP «the promo video»).

## The form
- **Start:** a record button on the play screen (on a computer also a key); a 3-2-1 count so the hands are in place; a red dot and the time
  while it records. **Stop:** the same button. The last ~0.7 s (the hand going to the button) faded out. ❓ the longest clip: 60 s proposed
  (Stories take 60 s, Reels 90 s; memory and the wait stay small).
- **Shape = the screen's** (proposed): a computer held landscape gives a 16:9 clip (YouTube, Telegram, WhatsApp, X; in Reels/TikTok it shows
  with bands), a phone held upright gives 9:16 (Reels, TikTok, Shorts, Stories). What was seen is what is shared — the hands' lights stay
  where they were. ❓ later, a «vertical version» of a landscape session (the room re-framed upright; lights near the sides would fall out of
  frame — needs its own rule).
- **The sound is exactly what was heard** (the live mix), faded in and out.
- **The file:** MP4 (H.264 + AAC) — accepted everywhere (WebM, Full's old recorder, is refused by Instagram, poor on iPhones). The system share
  sheet where there is one (Android, iPhone, Windows), else a download.
- **Privacy (#33): never the camera image.** Only the room canvas is recorded (the hands appear as its light), never the 2D overlay or the
  video. Nothing is uploaded; the clip leaves the device only through the person's own share.

## Two ways to make the picture — stage 0 measures both, then the founder chooses
- **A. Film the room while playing.** Each drawn frame of the room canvas goes to the browser's encoder (WebCodecs `VideoEncoder`, hardware
  H.264 where there is one; MediaRecorder as the fallback). The clip is ready the moment you stop. Cost: a copy and an encode per frame WHILE
  playing — on a weak device it may cost frames (smoothness) during the recording.
- **B. Re-draw after stop.** While recording, only the room's inputs are logged (the host feeds each room through one door per frame:
  `scene/host.js sceneFrame` — `glint`, `held`, `bed`, `heard`, `update(dt, t, hands, fx, sky)`; numbers only) and the heard sound kept. After
  stop the live picture rests under a progress card (the music goes on) while a second instance of the room replays the log frame by frame
  and the encoder writes it. Play costs nothing extra; the wait is proportional to the clip (to measure: maybe ~1× its length on the laptop,
  2–4× on the Poco). The rooms are made for exact replay (ROOM-RULES §2; SPEED-1 steps 10/15), but state from before the start (wiped glass,
  a held flower) needs a snapshot or a short warm-up.
- In both: the sound from the live output tap (`core/audio.js createRecordingTap`; encoded by `AudioEncoder` AAC, or kept as PCM up to the
  cap — 60 s stereo ≈ 11 MB), the mark drawn over each frame, our own MP4 writer (ISO base media format from the standard — our code, rule
  #32; the codec is the browser's).

## Stage 0 results (2026-11-26, the laptop through the runner; `tools/.out/share0/`)
- **Exact re-draw: yes.** Each room opened through the host with its build wrapped; every call the host makes on the room from its birth logged
  (update, held, heard, bed, glint, rest, resize, light, texBytes, render; arguments cloned, the clock's value at the call); a second instance
  built with the same options and renderer settings and fed the log. Frames compared (hashes of every frame + every byte at 4 frames):
  forest Standard 120/120 and 123/123, forest Detailed 60/60, rain Standard 124/124, rain Detailed 98/98 — equal byte for byte. Two replays
  always equal each other (the rooms are deterministic).
- **One fix needed: the rain reads the clock inside its frame** (`rain.js` traffic's `tAudio` and the drip events: `performance.now()` mid-call).
  With the clock read mid-call the replay differed by 160–3700 px a frame (the cars a fraction of a pixel off); with the clock held at the
  frame's moment — exact. The fix: the room takes that moment from the host (ROOM-RULES §2 already says time comes in as an argument). The
  forest's mirror also reads the clock (`forest-mirror.js render(now=performance.now())`); exact in the runs, to be passed in too.
- **Export speed (the runner's Chrome: software H.264 only, no hardware encoder offered there):** the log replayed into `VideoEncoder`
  (avc High), ms per frame — rain Standard 53, forest Standard 56, rain Detailed 76–91, forest Detailed 163–187; the size matters little
  (768×480 vs 1152×648 the same: the update, the render and the encoder's queue dominate). A 60-s clip at the live frame rate ≈ 1.5–3× its
  length to wait on this laptop with software encoding; the founder's real Chrome may offer the hardware encoder (to measure there).
- **Support in Chrome:** VideoEncoder H.264 (Baseline, Main, High — software in the runner), AudioEncoder AAC and Opus — MP4 with AAC works.
- ⛔ **But a recording starts in the middle of play — and there B is NOT exact by itself.** Replayed from a fresh instance at the start
  (`mid.js`): rain 334k → 54k px off a frame over 4 s, forest 130k → 11k; with a 20-s warm-up (`warm.js`) still rain ~43k (the drops on the
  glass), forest ~4k (the stream's mirror). Every update from birth but no drawing before the start (`mid-norender.js`): rain exact (all its
  state is in its updates), forest ~4–5k px (the mirror, re-drawn every 1.5 s, holds a picture: a forced refresh at the start fixes it).
  So exact B mid-play needs each room to SAVE ITS STATE at the start (its own save / load, proved by this replay; every new room too) — or
  a replay from the room's birth (minutes after a long session). Estimated 2–4 slices for the two rooms.
- **Way A measured** (`film.js`: every drawn frame of the room canvas into VideoEncoder while the room runs; software H.264 in the runner, no
  hand detection there): the room's frame rate unchanged (rain Standard 21.1 → 21.4, forest 21.1 → 21.8, rain Detailed 24.6 → 24.1 — the
  runner's page runs ~21–25 fps), its frame time +0…1.4 ms (Detailed), long frames not more; at Detailed the software encoder's queue
  filled (8). Indicative only: to confirm with the hands running (`speed.mjs`) and on the Poco. A is exact by nature (it films what is shown)
  and the clip is ready at once.
- Still to measure: the founder's real Chrome (hardware encoder?), the Poco, an iPhone; a real MP4 in WhatsApp / Telegram / Instagram / TikTok
  (needs the MP4 writer — first piece of stage 1).

## Stage 0 — measurements only (no player-visible change, ~1 slice)
- A: the frame rate and the hand → sound while recording, against not recording (laptop: forest and rain, each quality; the Poco through «Measure
  this device» gaining a recording test).
- B: replay against live frames (how close), and the wait for 15 / 60 s on the laptop and the Poco.
- Support: VideoEncoder / AudioEncoder with H.264 / AAC on the founder's Chrome, the Poco, an iPhone.
- The file: opens and plays with sound in WhatsApp, Telegram, Instagram (Story, Reel), TikTok, YouTube.

## Then
1. Stage 1 — the chosen way, the record button and count, the mark, the MP4 writer, share / download; both rooms; English and Russian texts.
   Checks: the MP4's boxes parsed back by a data row (our own reader), the sound's samples = the tap's (exact), the frame rate while recording
   within the measured bound.
2. Stage 2 — the fallback path, polish (a preview before sharing), ❓ a vertical version of a landscape session.
3. Later — share counts (Vercel Pro), a «promo» export for the founder (Detailed, 60 fps, larger).

## Not in this plan
The camera image in any form; uploading anything; a gallery or account; editing the clip; sound-only takes (Full has its own).
