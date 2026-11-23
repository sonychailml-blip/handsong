# Handsong Night — product roadmap (the founder's decision, 2026-11-18)
Goal: a high-quality, commercially successful Night. Order matters; new rooms come after stage 2.

## ✅ Released (RELEASE-1, 2026-11)
Handsong Night — the forest and the rain — is public at https://night.handsong.app; the brand site https://handsong.app is live.

## After release — what to do next (CLEAN-1, 2026-11-23; most important first, the founder picks)
1. **Speed on weak phones.** The cold first opening (~7 s, shaders), the ~26 MB start set before a second visit works offline, the rare audio dropout right after the forest opens; measure on the Poco with «Measure this device» first. A slow start loses players before they play. (`docs/night/BACKLOG.md`.) ▶ Chosen (2026-11-23): the plan `docs/night/SPEED-PLAN.md` — gesture → sound first, then smoothness everywhere; runs `SPEED-n`.
2. **Share a video.** The last ~15 s of play as a short clip — scene and music, never the camera image (#33); vertical and landscape, a quiet handsong.app mark. The main growth lever (Stage 2, item 1).
3. **Events — a reason to come back.** Rare moments in both rooms (the forest's night, the rain's city), the evening ritual, the world remembering the last visit, discoveries without lessons (Stage 2, item 3).
4. **City life in the rain.** From `docs/night/design/RAIN/PLAN.md` §5d: trembling wet reflections as cars pass, water off awnings and balconies, chimney smoke, children in puddles, a couple under one umbrella, shops closing one by one, brake lights and wipers, people crossing on green.
5. **Small details.** A link to Handsong from Night's info card; the lantern offer inside the low-light message; a cat a phone can see; delete `apps/night/migrate.js` (after the first public release, with its row); the founder's open checks in the track handoff.
6. **A new room.** After items 1–3 hold (new rooms come after Stage 2).
7. **Full (Handsong).** Stage 5: saving, export, audio take, the mixer; the calibration screen (`docs/full/HANDOFF.md`). `main` stays the old public version until then.

## Stage 1 — the rain room for testers (done: released)
- Works for everyone: smooth on weak devices; the target is the LIGHT level with no stutter and no audio dropouts on the founder's laptop (Intel HD 4000) and his Poco M5 — that defines the minimum requirements. Detailed is never degraded; Standard gets only invisible optimisations; Light may simplify visibly. iPhone/Safari tested. The bed's electric piano is not changed unless the measurements force it.
- Then a full check, then the rain goes to night-release. No publish before that.

## Stage 2 — before the public launch
1. Share a video: the last ~15 s of play rendered as a short clip (scene and music, NEVER the camera image — privacy #33), vertical and landscape, a quiet handsong.app mark. The main growth lever.
2. Know whether people come back: Vercel Web Analytics now (visits, sources); at launch, with Vercel Pro, custom events (reached play, played 5 min, room, quality) and an anonymous "returned on day 2 / day 7" event computed on the device (no identifier).
3. A reason to come back: a ritual (ten minutes in the evening), the world's memory between visits, progress without lessons, discoveries.
4. The site handsong.app updated for two rooms, with the same languages.
## Stage 3 — who pays (decided by the numbers)
Relaxation and sleep through playing (most promising), a creative toy, children and learning, venues (Handsong Space). Then payments (a merchant of record accepting sellers from Georgia), Vercel Pro (Hobby forbids commercial use), privacy/terms/refunds, an individual entrepreneur with small-business status, the Handsong trademark.
## After that
New rooms, polish, app stores, Handsong Space pilots, the promo video.
