# SHARE — «record and share a clip» (PLAN, 2026-11-26; nothing built; ❓ = still the founder's)

ROADMAP «After release» item 2 / Stage 2 item 1: the main growth lever.

## The founder's decisions (2026-11-26)
- ⛳ **The person starts and stops the recording** (not «the last 15 s»).
- ⛳ **The mark is on the whole clip**: a small quiet «Handsong Night · handsong.app» in a corner.

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
