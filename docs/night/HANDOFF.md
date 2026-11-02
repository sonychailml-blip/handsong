# HANDOFF — NIGHT track (`apps/night/`, Handsong Night, code id `night`)

Index: `/HANDOFF.md`. Rules: `CLAUDE.md`. Open items: `docs/night/BACKLOG.md`. Plan: `docs/night/STAGE4-NIGHT-plan.md` (its paths are as written; `docs/core/STALE-NAMES.md` maps them). Quality bar: `docs/night/QUALITY.md`. The old handoff, word for word: `archive/HANDOFF-history.md`, «Moved from HANDOFF.md at SPLIT-2». What in `core/` still belongs here: `core/DEBT.md`.

## Strategy (BACKLOG §7.12, §7.16)
⛳ The first public release is **Handsong Night**, right after stage 3 (user, Q1, 2026-10-14); the visual design is the user's chosen C · Hush emblem in Moonglass colours (§7.19). Proposed still: free → "Plus" → packs → "Pro". Vercel Hobby forbids selling (paid plan or other hosting first, §7.12 item 6). After it: the installation (kiosk) mode §7.18 = stage 4b.

## Deploy (user, 2026-11-02)
`handsong-night`'s Production branch is `night-release`, a stopper branch that is a copy of the old `main`. Merging `dev` into `main` does not touch Night's production. The new Night does not go public yet, and its public home (Vercel or another host) is not decided. `dev` pushes give previews, which keep `?probe`: use those for phone checks.

## Where it stands
Stage 4: RUN 6 ✅ C0, VIS1a–c, listening page, design proposals · RUN 7 ✅ sound pass, C11, C6, C4b, C4c, C7, C5 · RUN 8 ✅ the user's fixes, the forest picture, C8 part (Lighter forest) · RUN 9 ✅ the living forest · SPLIT-2 ✅ its own app and name. **Next:** the user's checks below, then C8 rest (phone numbers, auto-proposal), C9 offline, C10 release, C12 release candidate. Plus the new items in the backlog. The first new run is `NIGHT-1`.

## The user's open checks, with today's addresses
Old step texts use the old address and `src/…`; these are the current forms. Live Server, headphones, a lamp beside you.
- **Page:** `http://127.0.0.1:5500/apps/night/`. With the console tools: `http://127.0.0.1:5500/apps/night/?probe`. On a phone: a Vercel preview of `handsong-night`.
- **Step 120, the night.** Begin → Background until «Forest»: a moon, a cloud over it in about 5 minutes, mist. Mood: Dusk, Mist, Glow. Sleep → 15 min: it darkens and stills. Quick look, console: `(await import('/core/legacy-ui/views/scene/host.js')).sceneClockDbg(630)` = cloud; `…sceneClockDbg(60)` = clear moon.
- **Step 121, the answer to playing.** A ring per note; mushrooms and flowers pulse; fireflies gather after 10 s and drift off. Stream: Echo = rings, Wave = ferns tremble, Warm ↔ Bright = the light's colour.
- **Step 122, detail.** The Forest slider moves grass and ferns with the wind you hear; leaves, moths, moonbeams, dark corner leaves. Landscape: nothing covers the middle.
- **Step 123, rare moments.** About 10 minutes: a falling star or the five-dot emblem; hold a note 3 s: a flower. At once: `(await import('/core/legacy-ui/views/scene/host.js')).sceneRoomDbg().rareDbg('star')` (or `'emblem'`, `'bloom'` with a hand up).
- **Step 125, hand calibration** (CORE-1; Night doesn't open it yet, so this runs on the test panel). `http://127.0.0.1:5500/apps/night/?probe&calpanel`, on the Poco a preview + `/?probe&calpanel`. Press Play, then the green button at the bottom left. Full text: `archive/CLAUDE-history.md`.
- **Step 124, quality and cost.** ⓘ → «Forest picture»: medium, high, low. Then ⓘ → «Measure this device» with the forest on, on the laptop and **on the Poco M5**; send the text.
- **Eye check from the split:** `tools/split-baseline/side-by-side-E/`, the four structure-only screens.
- **Not done by a machine:** ears, hands, phones. Old setting names do not carry over to the new `handsong-night` address, so first-run steps may appear again there.

## Questions for the user from RUN 9
1. Medium is the default because high costs about a third of the hand tracking. Good enough, or make high cheaper?
2. The night repeats every 24 minutes, a cloud about every 3 minutes. Right?
3. Rare moments every 2.5–5 minutes. Right, or rarer?
4. Opening the forest takes 1–3 s. Acceptable, or a gentle «waking» moment?
5. The falling star passes in front of the trees. Natural?

## Records (English, at most about 15 lines each; older ones go to `archive/HANDOFF-history.md`)
### RUN 9 (2026-10-19/20): the living forest. Log and plain summary: `archive/WORK-LOG-before-split.md` «RUN 9» (old name)
- NIGHT (`apps/night/pure/cycle.js`): a 24-min seamless cycle: the moon drifts, 7 cloud passes dim it, four mist layers; the sleep timer deepens and stills the night; moods Glow / Dusk / Mist recolour the forest (token sets). Bus `nightSky` { mood, sleep, wind } from the shell.
- RESPONSE (`apps/night/pure/forestlife.js`, `apps/night/scene/forest-life.js`): a ring of light per note; mushrooms / flowers pulse; fireflies gather while you play; a stream with the moon's reflection: Echo = rings on the water, Wave = the leaves shimmer, Warmth = the light's colour.
- DETAIL (`apps/night/scene/forest-detail.js`): instanced grass + ferns sway with the ambience's wind (its level and audible gust); falling leaves (shader); moths at the light; moonbeams; foreground silhouettes. RARE (`apps/night/scene/forest-rare.js`): a falling star or the five-dot emblem every few minutes, a flower on a note held ~3 s; never the same twice in a row.
- BUDGET (Intel HD 4000, two synthetic hands, vs Dark): medium −6 % hand detections (in budget), high −34…−36 % (breaks it; cost follows resolution and frame rate, not content) → DEFAULT = MEDIUM (high stays a dev choice); 0 dropouts. Opening the forest compiles ~20 shaders (2–3 s first time, then ~0.4 s), now inside the opening; the hand lights never change the light count (no recompile on the first hand).
- Rows: core «NIGHT cycle», «FOREST life», «NIGHT rare events»; browser «FOREST night cycle / response / detail / rare events / levels». Captures: `ui-snap --forest`.
