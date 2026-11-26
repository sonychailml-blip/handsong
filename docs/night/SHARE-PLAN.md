# SHARE — «share the last 15 seconds» (PLAN, 2026-11-26; the founder decides the open points before any build)

ROADMAP «After release» item 2 / Stage 2 item 1: the main growth lever. Nothing is built yet. This file is the plan; the decisions marked ❓ are
the founder's.

## What it gives
- **Growth.** Every shared clip is a small advert with the address on it (a quiet handsong.app mark). People share what moved them; a room
  played with the hands is unusual enough to be watched.
- **A memory for the player.** «That was beautiful» can be kept.
- **A measure.** How many players share (later, with Vercel Pro custom events) is the clearest «do people love it» number.
- **The founder's own material.** The same export renders promo clips at a higher quality than live (ROADMAP «the promo video»).

## The form (proposed)
- **One tap after the moment: «share the last 15 s».** Nobody has to plan ahead or remember to press «record». A small button on the play
  screen (and in the menu); the hands keep playing — the tap is the screen's.
- **Vertical 9:16 by default** (Reels, TikTok, Shorts, Stories, messengers), **landscape 16:9** as the second choice — whatever way the
  device was held, because the clip is RE-DRAWN (below), not filmed off the screen. ❓ both offered at share time, or one fixed.
- **15 s** (a Story's length). ❓ fixed, or 10 / 15 / 30.
- **The sound is exactly what was heard** (the live mix), faded in and out over 0.5 s.
- **The mark:** a quiet «Handsong Night · handsong.app» — ❓ a small corner mark throughout, a 1.5-s end card over the last frame, or both.
- **The file:** MP4 (H.264 + AAC) — the format every messenger and network accepts (WebM, what Full's old recorder writes, is refused by
  Instagram and plays badly on iPhones). Handed to the system share sheet; where there is none (most computers), downloaded.
- **Privacy (#33): never the camera image.** The hands appear only as the room's own light, as on screen. Nothing is uploaded: the clip is
  made on the device and leaves it only through the person's own share.

## How (the approach)
Filming the screen while playing (a MediaRecorder always running for the «last 15 s») would cost the weak devices exactly the GPU and CPU
SPEED-1 fought for, and would film the screen's shape only. Instead:
1. **While playing — almost free.** The host already feeds each room through ONE door per frame (`scene/host.js sceneFrame`: `glint`, `held`,
   `bed`, `heard`, `update(dt, t, hands, fx, sky)`). A small ring log keeps those calls for the last ~40 s (numbers only: the hands' lights,
   the effects' values, the mood — tens of KB). The heard sound goes into a ring buffer of PCM from the live output tap (15 s stereo ≈ 3 MB).
   No encoding, no extra drawing.
2. **On the tap — re-draw.** The live picture pauses under a card with progress (the music goes on). A second instance of the room at the
   chosen shape (720×1280 or 1280×720) replays the log: a warm-up from ~20 s before (drops, mist and fireflies settle), then 15 s × 30 fps
   drawn offline, frame by frame. The rooms are built for this: every moving thing comes from a seeded law (ROOM-RULES §2) and the same
   inputs give the same frames (SPEED-1 step 10/15 proofs).
3. **Encode** with the browser's own encoders (WebCodecs `VideoEncoder` H.264, `AudioEncoder` AAC — hardware where there is one) and write
   the MP4 container ourselves (ISO base media format, from the standard — our own code, rule #32; no codec is shipped: the browser's).
   Fallback where WebCodecs is missing: replay in real time into a canvas + MediaRecorder (MP4 on Safari) — slower (15 s), same picture.
4. **Share** through `navigator.share({ files })` (Android, iPhone, Windows), else download; then back to the room.

## What must be proved first (stage 0, measurements only, ~1 slice)
- **Replay fidelity:** the replayed frames against the live frames for the same 15 s (forest, rain; each quality) — how close after the
  warm-up; which room state (wiped glass, a flower opened by a held note) needs a snapshot instead.
- **Export time:** 15 s at 720×1280 on the laptop and on the Poco (the founder's «Measure this device» gains an export test). Target: under
  ~20 s on the laptop, under ~60 s on the Poco; else a smaller size or 24 fps.
- **Support:** VideoEncoder / AudioEncoder with H.264 / AAC on the founder's Chrome, the Poco, an iPhone (Safari) — which take the fast path.
- **The file:** it opens and plays with sound in WhatsApp, Telegram, Instagram (Story and Reel), TikTok, YouTube Shorts.
- **Memory:** two room instances at once (the rain's Detailed holds 50 MB of textures) — export at Standard's build, the live room paused.

## Stages (after the founder's decisions)
1. **Stage 0** — the measurements above (no player-visible change).
2. **Stage 1** — the log and the sound ring (opt-in core option if `core/audio.js` needs one: CORE-n), the replay renderer, the MP4 writer,
   the button, the progress card, share / download; both rooms; vertical. Checks: replay = live within the measured bound; the MP4's boxes
   parsed back by a data row (our own reader); the sound's samples = the ring's (exact).
3. **Stage 2** — landscape, the end card / corner mark, the fallback path, Russian and English texts.
4. **Stage 3** — later: share counts (with Vercel Pro), a «promo» export for the founder (Detailed, 60 fps, larger).

## Not in this plan
The camera image in any form; uploading anything; a gallery or account; editing the clip; music without the picture (Full has its own audio
take).
