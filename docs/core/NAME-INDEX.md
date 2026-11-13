# NAME INDEX — code names by module (GENERATED — do not edit by hand)

_Generated from `core/`, `apps/`, `tools/probes/` by `node tools/name-index.mjs --write`; checked by the data runner (row «NAME-INDEX current»). Consult by grep.
Kinds: fn, const, let, class, «→ ./x.js» a re-export. Meaning of a name: the code and `archive/CLAUDE-history.md`. The hand-written index
before this tool: `archive/NAME-INDEX-before-RUN5.md`. Removed names: the end of this file (kept by hand in `docs/core/STALE-NAMES.md`)._

## apps/full/demo.js
===================================================================== ДЕМО «ПУТЕШЕСТВИЕ ПО СТРОЯМ» (прототип, side-experiment) --------------------------------------------------------------------- …
- exports: none

## apps/full/main.js
SPLIT-2: the Full app's entry.
- exports: none

## apps/full/songs.js
⛳ ДЕМО-ПЕСНИ — КОНСОЛЬНЫЙ ЗАГРУЗЧИК, НЕ ЧАСТЬ ИГРЫ.
- const (1): `songNames`
- fn (2): `loadSong`, `songBuild`

## apps/full/tutor.js
================= ОБУЧЕНИЕ (список уроков + интерактивные шаги) ================= «Обучение» открывает СПИСОК коротких уроков (меню возможностей инструмента).
- fn (2): `wireStarter`, `openLessons`

## apps/night/bed.js
NIGHT-3 stage 4: THE MUSIC BED's DOOR AND ITS v1 DRIVER (live) — the state the Music button and the settings set (off / still / drift / glimmer, the volume, the response switch, all remembered by t…
- const (11): `BED_SEED`, `BED_ENGINES`, `bedEngineReady`, `bedTakesDrone`, `bedModeOf`, `bedVolumeOf`, `bedAnswerOf`, `bedEngineOf`, `bedPaletteOf`, `bedLightOf`, `bedDbg`
- fn (11): `bedViewOver`, `bedSetMode`, `bedSetVolume`, `bedSetAnswer`, `bedSetEngine`, `bedSetPalette`, `bedSetLight`, `bedHold`, `bedResume`, `bedTick`, `bedPlan`

## apps/night/bed2.js
NIGHT-4: THE MUSIC BED v2's DRIVER (live and offline).
- const (7): `BED2_AHEAD`, `bed2ViewOver`, `bed2Failed`, `bed2Dbg`, `bed2StatsLive`, `bed2NodeDbg`, `bed2ViewDbg`
- fn (6): `bed2Load`, `bed2On`, `bed2Off`, `bed2Volume`, `bed2Tick`, `bed2Plan`
- → ./sound/bed2.js (1): `bed2Stats`

## apps/night/calib.js
NIGHT-2 stage 2: the hand's calibration screens over CORE-1's engine (core/handcal.js; design docs/night/design/NIGHT-2-calibration/DESIGN.md).
- const (8): `CAL_KEY`, `CAL_OPEN`, `travelS`, `travelPos`, `fxV`, `fxPos`, `calActive`, `calDbg`
- fn (11): `calWire`, `calOfferIfNew`, `calDueNow`, `calOffered`, `calStep`, `calSideApply`, `calSideSet`, `calResetAll`, `calAbort`, `calSettingsRender`, `calTick`

## apps/night/camera.js
NIGHT-10 — CHOOSING THE CAMERA (Settings → Camera).
- const (3): `CAM_KEY`, `camEnvDbg`, `camDbg`
- fn (3): `camRestore`, `camWire`, `camRender`

## apps/night/cards.js
NIGHT-7 — THE FIRST CARDS: after the calibration offer on a first start (and from Settings → «How to play»), four short cards with simple drawn pictures, written from the real gestures (core/gestur…
- const (7): `cardsEnvNow`, `CARDS_KEY`, `cardsDue`, `cardsDone`, `cardsOpen`, `cardsDbg`, `cardsEnvDbg`
- fn (2): `cardsShow`, `cardsWire`

## apps/night/coach.js
NIGHT-11 part 4 — PLAY FIRST, TEACH INSIDE: the DOM side of the one coaching line (the law: pure/coach.js).
- const (3): `coachShown`, `coachDbg`, `coachSpeedDbg`
- fn (5): `coachBegin`, `coachTick`, `coachWire`, `coachShowDbg`, `coachResetDbg`

## apps/night/early.js
CORE-20 (audit P1) — MEDIAPIPE'S BINARY EARLY, NEVER AGAINST THE PAGE'S OWN FILES.
- exports: none

## apps/night/edition.js
NIGHT-7b — NIGHT'S EDITION: the build's (core/edition.js: 'release' in a players' build) or, on any page, «?release» in the address — so the players' settings can be checked on Live Server without …
- const (2): `NIGHT_EDITION`, `devItems`

## apps/night/fullscreen.js
NIGHT-7c — FULL SCREEN on computers and Android (Chrome, Edge, Firefox; iPadOS Safari through its prefixed door).
- const (10): `fsApi`, `fsOn`, `fsStandalone`, `FS_RETRIES`, `fsStarted`, `fsOnChange`, `fsAsking`, `fsCanToggle`, `fsDbg`, `fsAskAlwaysDbg`
- fn (3): `fsBegin`, `fsCamera`, `fsToggle`

## apps/night/guard.js
NIGHT-11 part 2 (audit P2, W5) — AN HONEST START, before any module runs.
- exports: none

## apps/night/icons.js
NIGHT-7c — NIGHT'S OWN DRAWN ICONS (our own work, rule #32), added to the shared table through core's door (CORE-15) before the page's markup is filled (main.js imports this right after the texts).
- const (1): `NIGHT_ICONS`

## apps/night/lifecycle.js
NIGHT-11 part 1 — WHEN THE PHONE LOOKS AWAY (audit W1, W2, W3).
- const (3): `lifeDbg`, `lifeLockDropDbg`, `lifeOldDbg`
- fn (1): `lifeStart`

## apps/night/main.js
SPLIT-2: the Night app's entry: its shell, its rooms, its profile (NIGHT-7b: the ghost light is gone — the first cards replace it).
- exports: none

## apps/night/migrate.js
SPLIT-2: one-time move of this app's old setting names, on one origin only (plan §5.3).
- const (1): `OLD_PREFIX`
- fn (1): `migrateKeys`

## apps/night/notice.js
NIGHT-11 — ONE NOTICE LINE for what needs the person's tap now: the sound stopped by the phone («Tap to continue»), the camera that stopped (part 1), a start problem shown in the forest.
- const (3): `NOTICE_PRI`, `noticeOf`, `noticeDbg`
- fn (3): `noticeShow`, `noticeHide`, `noticeWire`

## apps/night/pure/ambience.js
THE AMBIENCE'S SEEDED LAWS (RUN 7, C4c; docs/night/QUALITY.md points 1, 5, 8; Night's own since CORE-7): pure (rule #36), node-tested (data row «NIGHT cricket schedule (app)»).
- const (1): `NATURE_CRICKETS`
- fn (3): `windNoise`, `cricketStream`, `chirpShape`

## apps/night/pure/bed.js
NIGHT-3 stage 4: THE MUSIC BED's LAW — what plays and when, as numbers (pure, rule #36; data row «NIGHT music bed law (app)»).
- const (5): `BED_OFF`, `BED_ANSWER`, `bedNext`, `padRange`, `chordPcs`
- fn (5): `voiceLead`, `rootWeights`, `bedInit`, `bedSoon`, `bedStep`

## apps/night/pure/bed2.js
NIGHT-4: THE MUSIC BED v2's LAW — what plays and when, as numbers (pure, rule #36; data row «NIGHT music bed v2 law (app)»).
- const (4): `BED2_SEED`, `bed2Reg`, `BED2_WORK`, `BED2_TABLE`
- fn (9): `bed2Fold`, `bed2Density`, `bed2Init`, `bed2Soon`, `bed2LoopReg`, `bed2Voice`, `bed2Step`, `bed2Work`, `bed2Tables`

## apps/night/pure/brook.js
NIGHT-8: THE STREAM'S MURMUR — the law and the synthesis, pure (rule #36; data row «NIGHT stream sound (app)»), run unchanged by the nature worklet (apps/night/worklets/nature-worklet.js) and by th…
- const (2): `BROOK`, `brookStats`
- fn (4): `checkBrookVoices`, `brookNew`, `brookRender`, `brookOut`

## apps/night/pure/brookrec.js
NIGHT-8b: THE STREAM FROM A RECORDING — the law, pure (rule #36; data row «NIGHT stream recording (app)»), run unchanged by the nature worklet (apps/night/worklets/nature-worklet.js) and by the lis…
- const (3): `BROOK_REC`, `recMinLen`, `recStats`
- fn (2): `recNew`, `recOut`

## apps/night/pure/camera.js
NIGHT-10 — THE CAMERAS AS THE PERSON READS THEM (pure, rule #36; data row «NIGHT camera names (app)»).
- const (2): `cleanCamName`, `camMobile`
- fn (1): `cameraNames`

## apps/night/pure/coach.js
NIGHT-11 part 4 — PLAY FIRST, TEACH INSIDE (REVIEW-1 wow-gap §1).
- const (4): `COACH`, `COACH_IDS`, `COACH_KEY`, `coachNew`
- fn (3): `coachSeen`, `coachStep`, `coachOrderOk`

## apps/night/pure/cycle.js
RUN 9 — THE NIGHT over the forest, as numbers.
- const (7): `NIGHT`, `CLOUD_PASSES`, `sleepProgress`, `MOOD_TC`, `RARE`, `EMBLEM_AT`, `emblemPoints`
- fn (4): `nightAt`, `nightDeep`, `rareInit`, `rareStep`

## apps/night/pure/fsicons.js
NIGHT-8b — THE FULL-SCREEN SIGN, pure data (apps/night/icons.js draws it filled): the plain standard sign, four separate corner brackets with square corners (thin round-joined strokes read as a pin…
- const (2): `FS_ENTER`, `FS_EXIT`

## apps/night/pure/handlight.js
NIGHT-13 — THE HAND'S LIGHT: WHERE IT SITS AND HOW BRIGHT (pure, rule #36; data row «NIGHT hand light anchor (app)»).
- const (4): `HANDLIGHT`, `handLightK`, `HANDLIGHT_GLOW_OLD`, `handLightNew`
- fn (3): `handLightGlow`, `handLightRatios`, `handLightStep`

## apps/night/pure/heard.js
NIGHT-6 slice 1 — WHEN A SOUND IS HEARD, on the page's clock.
- const (1): `heardMs`

## apps/night/pure/homehint.js
NIGHT-7c — WHO GETS THE «ADD TO HOME SCREEN» CARD (pure: the data row and the cards row feed it made-up devices).
- fn (1): `homeHintFor`

## apps/night/pure/inapp.js
NIGHT-11 part 2 — LINKS OPENED INSIDE A MESSENGER (audit W4).
- const (3): `IN_APPS`, `QUICK_DENY_MS`, `quickDeny`
- fn (1): `inAppOf`

## apps/night/pure/pixels.js
NIGHT-11 part 5 — THE SCENE'S PIXEL BUDGET (audit P4).
- const (6): `PIX_LEVELS`, `PIX_STEP`, `GUARD`, `ratioOld`, `bufferOf`, `guardNew`
- fn (3): `sceneRatio`, `stepsOf`, `guardNext`

## apps/night/pure/room.js
NIGHT-3: THE ROOM RECORD's shape and validator (pure, rule #36; data row «NIGHT room records» with controls).
- const (10): `ROOM_FORMAT`, `ROOM_IDS`, `ROOM_LEVELS`, `ROOM_ACOUSTICS`, `TINT_INK`, `contrastOf`, `roomLook`, `roomModes`, `roomFov`, `ROOM_DAMAGES`
- fn (1): `checkRoom`

## apps/night/pure/still.js
DESIGN-1 part D: THE START SCREEN'S STILL AND THE REVEAL — the law (pure, rule #36; data row «NIGHT start still (app)»).
- const (9): `STILL`, `STILL_PHASES`, `stillEase`, `stillDot`, `stillFile`, `stillTan`, `stillWidest`, `stillVeilMax`, `DOT`
- fn (7): `stillPhase`, `stillLook`, `stillFit`, `stillVeil`, `dotFlare`, `dotGate`, `dotFlight`

## apps/night/rooms/forest/forest-answers.js
NIGHT-6 slice 1 — THE FOREST ANSWERS (parts of the night forest room; forest.js builds them; the numbers are ./pure/answers.js): - DEW: points on the low leaves in view, one draw; each twinkles on …
- fn (1): `buildAnswers`

## apps/night/rooms/forest/forest-canopy.js
NIGHT-6 slice 7 — THE CANOPY AND THE MOON'S WINDOW (a part of the night forest room; forest.js builds it; the numbers are ./pure/canopy.js): - CROWNS on the trees and the UNDERSTOREY (young trees, …
- fn (2): `buildCanopy`, `patchDapple`

## apps/night/rooms/forest/forest-detail.js
RUN 9 (slice 3) — THE FOREST'S DETAIL.
- const (1): `DETAIL`
- fn (1): `buildDetail`

## apps/night/rooms/forest/forest-floor.js
NIGHT-6 slice 3 — THE FOREST FLOOR (parts of the night forest room; forest.js builds them; the places are ./pure/floor.js): the herb layer — wood sorrel, broad-leaved herbs, bilberry, wood anemones…
- fn (2): `plantMaterial`, `buildFloor`

## apps/night/rooms/forest/forest-ground.js
NIGHT-8 — THE BARE GROUND'S LARGE SCALE (a part of the night forest room; forest.js applies it to the ground's material, after the ground waves and the wet banks).
- const (1): `GROUND_GRADE`
- fn (2): `patchGroundMacro`, `patchGroundNight`

## apps/night/rooms/forest/forest-gust.js
NIGHT-6 slice 6 — THE EFFECTS HAND MOVES THE FOREST (a part of the night forest room; forest.js builds it; the numbers are ./pure/gust.js).
- fn (1): `buildGust`

## apps/night/rooms/forest/forest-hidden.js
NIGHT-6 slice 9 — HIDDEN THINGS THE LIGHT FINDS (a part of the night forest room; forest.js builds it; the numbers are ./pure/hidden.js).
- fn (2): `foxUniforms`, `buildHidden`

## apps/night/rooms/forest/forest-life.js
RUN 9 (slice 2) — THE FOREST ANSWERS THE PLAYING, softly (never busy).
- const (1): `WATER_GL`
- fn (5): `patchGroundWaves`, `patchSway`, `patchWetGround`, `patchSoftEdges`, `buildLife`

## apps/night/rooms/forest/forest-mirror.js
NIGHT-9 — THE WATER'S MIRROR (a part of the night forest room; forest.js builds it after the paint pass).
- const (2): `MIRROR_LAYER`, `MIRROR_LOOK`
- fn (1): `buildMirror`

## apps/night/rooms/forest/forest-paint.js
NIGHT-6 slice 8 — THE PAINTED DISTANCE AND THE FILM (the night forest room's picture pass; forest.js builds it; the numbers are ./pure/paint.js).
- fn (1): `buildPaint`

## apps/night/rooms/forest/forest-rare.js
RUN 9 (slice 4) — THE FOREST'S RARE EVENTS (every few minutes, never the same kind twice in a row; the schedule is apps/night/pure/cycle.js rareStep, seeded): a FALLING STAR streaks across the sky …
- const (1): `RARE_LOOK`
- fn (1): `buildRare`

## apps/night/rooms/forest/forest-stream.js
NIGHT-6 slice 4 — THE STREAM'S SURROUNDINGS (parts of the night forest room; forest.js builds them; the water's own shader is in forest-life.js; the numbers are ./pure/stream.js): - WET MOSSY ROCKS…
- fn (1): `buildStream`

## apps/night/rooms/forest/forest-wood.js
NIGHT-6 slice 5 — MOSS, ROOTS AND FALLEN WOOD (parts of the night forest room; forest.js builds them; the places are ./pure/wood.js): - THE WOOD: roots of the near trees, a log on the bank, a log a…
- const (3): `gnd7Src`, `lookSrc`, `patchBark`
- fn (6): `woodUniforms`, `barkAttrs`, `trunkGeo`, `limbGeo`, `buildWood`, `patchShade`

## apps/night/rooms/forest/forest.js
VIS1c (RUN 6, Night plan §3) — THE NIGHT FOREST ROOM's picture: a scene module built with three.js r128 (vendored, loaded by the scene host apps/night/scene/host.js).
- const (6): `FOREST_LEVELS`, `FOREST_BOUNDS`, `GROUND_ALBEDO`, `FOREST_TEX`, `forestGroundDbg`, `forestAssetsDbg`
- fn (2): `forestAssets`, `buildForest`
- → ./pure/layout.js (1): `FOREST_SEED`

## apps/night/rooms/forest/pure/answers.js
NIGHT-6 slice 1 — THE FOREST ANSWERS, as numbers.
- const (3): `ANSWERS`, `dewLight`, `webLight`
- fn (5): `dewPlaces`, `webPlaces`, `noteRingAmp`, `swellAt`, `bedClusters`

## apps/night/rooms/forest/pure/canopy.js
NIGHT-6 slice 7 — THE CANOPY AND THE MOON'S WINDOW, as numbers.
- const (3): `CANOPY`, `CROWN_ATLAS`, `MOON_VIEW`
- fn (4): `crownCellUv`, `viewAngles`, `inGap`, `canopyPlaces`

## apps/night/rooms/forest/pure/fireflies.js
VIS1c (RUN 6, Night plan §3.1) — the night forest's WILD FIREFLIES and its ground, as numbers.
- const (4): `FOREST_FLIES`, `holdK`, `RELIEF`, `FOREST_DEPTH`
- fn (6): `rateK`, `forestGround`, `fliesInit`, `fliesStep`, `fliesDart`, `depthDistance`

## apps/night/rooms/forest/pure/floor.js
NIGHT-6 slice 3 — THE FOREST FLOOR, as numbers.
- const (7): `FLOOR_ATLAS`, `HERBS`, `FLOOR`, `fbm`, `moistAt`, `lightAt`, `SIZE`
- fn (2): `cellUv`, `floorPlaces`

## apps/night/rooms/forest/pure/forestlife.js
RUN 9 — THE FOREST'S LIFE, as numbers.
- const (7): `STREAM`, `STREAM_LINE`, `CARVE`, `LIFE`, `pulseOf`, `RINGS`, `ringsNew`
- fn (6): `streamAt`, `streamNear`, `bankGround`, `lifePlaces`, `ringAdd`, `ringsAge`

## apps/night/rooms/forest/pure/ground.js
NIGHT-8 — THE BARE GROUND'S LARGE SCALE and its SMALL THINGS, as numbers.
- const (2): `MACRO`, `LITTER`
- fn (2): `macroAt`, `litterPlaces`

## apps/night/rooms/forest/pure/gust.js
NIGHT-6 slice 6 — THE EFFECTS HAND MOVES THE FOREST, as numbers.
- const (2): `GUST`, `gustNew`
- fn (5): `gustStep`, `gustBend`, `leafSpawn`, `leafAt`, `wakeOf`

## apps/night/rooms/forest/pure/hidden.js
NIGHT-6 slice 9 — HIDDEN THINGS THE LIGHT FINDS, as numbers.
- const (3): `FOX`, `FLOWERS`, `foxTrail`
- fn (4): `foxTrailStep`, `foxAt`, `flowerPlaces`, `flowerStep`

## apps/night/rooms/forest/pure/layout.js
NIGHT-6 slice 5 — TODAY'S FOREST'S PLACES, as numbers (pure, rule #36), for whoever needs them outside the room: the bake tool paints the contact shadows under the trunks and rocks (tools/forest-ba…
- const (3): `FOREST_SEED`, `PAINT_DRAWS`, `ROCKS_TODAY`
- fn (1): `forestTrunks`

## apps/night/rooms/forest/pure/paint.js
NIGHT-6 slice 8 — THE PAINTED DISTANCE AND THE FILM, as numbers.
- const (3): `PAINT`, `strokeR`, `breathAt`
- fn (2): `strokeTaps`, `vignetteAt`

## apps/night/rooms/forest/pure/relief.js
NIGHT-9 — THE GROUND'S ROOT BULGES AND OCCLUSION, as numbers (pure, rule #36; data row «FOREST relief (app)»).
- const (2): `ROOTS`, `AO`
- fn (2): `groundRoots`, `groundOcclusion`

## apps/night/rooms/forest/pure/room.js
NIGHT-3: THE FOREST ROOM'S RECORD — what the room is, as data (pure, rule #36; checked by apps/night/pure/room.js, data row «NIGHT room records»).
- const (1): `FOREST_ROOM`

## apps/night/rooms/forest/pure/sil.js
NIGHT-13: THE FOREGROUND SILHOUETTES — dark fronds and a branch held in the corners of the view (pure, rule #36).
- const (2): `SIL_TALL`, `FOREST_SIL`
- fn (1): `silScreen`

## apps/night/rooms/forest/pure/stream.js
NIGHT-6 slice 4 — THE STREAM'S LIFE, as numbers.
- const (3): `STREAM_LIFE`, `streamLength`, `STREAM_SOUND`
- fn (7): `outOfWater`, `streamRocks`, `streamPebbles`, `floatersInit`, `floatAt`, `mistStrips`, `streamVoices`

## apps/night/rooms/forest/pure/water.js
NIGHT-9 — THE STREAM'S FLOW, as numbers (pure, rule #36; data row «FOREST water flow (app)»).
- const (1): `WATER_FLOW`
- fn (2): `waterWidth`, `waterSpeed`

## apps/night/rooms/forest/pure/wood.js
NIGHT-6 slice 5 — MOSS, ROOTS AND FALLEN WOOD, as numbers.
- const (6): `WOOD`, `trunkRadius`, `trunkOuter`, `barkUvGap`, `barkMossUnit`, `blobDark`
- fn (8): `flareAt`, `barkMoss`, `barkUv`, `woodPieces`, `nearTrees`, `twigShape`, `woodPlaces`, `shadeBlobs`

## apps/night/rooms/forest/standin.js
NIGHT-3: the forest's 2D STAND-IN — the «low» level and the fallback without WebGL (or after a lost context): the night's two colours and a soft glow at each hand (the playing hand lime, the effect…
- fn (1): `standInForest`

## apps/night/rooms/index.js
NIGHT-3: THE ROOMS — the order a player meets them (ids, rule #37) and each room's parts: its record (data), its 2D stand-in, and its scene code, loaded only when the room is first opened.
- const (5): `ROOMS`, `roomsAll`, `roomById`, `roomAdd`, `roomRemove`

## apps/night/roomswitch.js
NIGHT-3 stage 5 part 2: THE ROOM SWITCH — one door for everything a room change touches, in this order: the music bed fades out and holds (it takes the new room's recipes while silent); the picture…
- const (8): `ROOM_KEY`, `ROOM_NAME_MS`, `roomCurrent`, `roomNature`, `natureModule`, `roomNext`, `roomSwitchDbg`, `natureAmbDbg`
- fn (6): `natureLoad`, `natureRecOf`, `natureRecPcm`, `natureLight`, `roomRestore`, `roomSwitch`

## apps/night/scalepick.js
CORE-20: Night fetches only the modes it plays — every room's moods and the page profile's moods (core/scalepick.js reads the profile) — and what they need.
- exports: none

## apps/night/scene/host.js
THE SCENE HOST and Night's BACKGROUNDS (VIS1b, RUN 6; Night's own since CORE-8 — the shared UI reaches it through hooks.scene).
- const (31): `BACKGROUNDS`, `sceneRoomAdd`, `sceneRoomRemove`, `sceneRooms`, `sceneRoom`, `sceneRoomSet`, `SCENE_LEVEL_DEFAULT`, `SCENE_FADE`, `scenePausing`, `COMPILE_LOG`, `sceneFlyPick`, `sceneFlyAt`, `sceneFlyLand`, `sceneRestDbg`, `sceneLitDbg`, `backgroundOf`, `sceneLevel`, `sceneShadowDbg`, `sceneOptDbg`, `sceneInfo`, `sceneRoomDbg`, `sceneLostDbg`, `sceneStartNote`, `sceneStartLevelDbg`, `sceneGuardDbg`, `sceneLevelDbg`, `sceneHeldDbg`, `sceneProgramsDbg`, `sceneClockDbg`, `sceneBedDbg`, `sceneOpenDbg`
- fn (10): `loadThree`, `sceneOpen`, `sceneSwitch`, `sceneClose`, `sceneRest`, `setBackground`, `setSceneLevel`, `sceneSnapDbg`, `sceneShotDbg`, `sceneLoseDbg`

## apps/night/settabs.js
DESIGN-1 part C: THE SETTINGS IN THREE SHORT TABS — Sound · Picture · Hands (the markup in index.html: #nightSetTabs, the panes [data-pane]).
- const (2): `SET_TABS`, `setTabOf`
- fn (2): `setTab`, `setTabsWire`

## apps/night/shell.js
RUN 7 (C6 + C11, Night plan §5; docs/night/QUALITY.md points 4, 5, 6, 9, 10) — THE NIGHT SHELL (DOM side; the logic is core/nightui.js).
- const (8): `LEAN_PATH`, `MUSIC_KEYS`, `musicModeOf`, `REACH`, `nightEarlyDbg`, `nightClockDbg`, `nightShellDbg`, `nightSleepDbg`
- fn (3): `nightShellWire`, `nightShellFace`, `nightMusicHoldDbg`

## apps/night/sound/ambience.js
THE ROOMS' AMBIENCE (RUN 7, C4c; Night's own since CORE-7): drone + wind + distant crickets + one soft echo (NIGHT-8: + the stream), built from a room's NATURE recipe (the forest's: apps/night/room…
- const (3): `NATURE_WORKLET`, `BROOK_SLEEP_S`, `AMB_SWAP`
- fn (9): `buildAmbience`, `ambienceSchedule`, `ambienceTune`, `ambienceSet`, `ambienceRoom`, `ambienceBrook`, `ambienceBrookLight`, `ambienceBrookStats`, `ambienceBrookRec`

## apps/night/sound/bed.js
NIGHT-3 stage 4: THE MUSIC BED's SOUND — built once on the first On into the master's input (the sleep fade and the limiter cover it; live sound, never a track — rule #31), from a room's bed recipe B.
- const (1): `BED_POOL`
- fn (8): `buildBed`, `bedVoice`, `bedVoicePark`, `bedFilter`, `bedGround`, `bedGlim`, `bedLevel`, `bedPark`

## apps/night/sound/bed2.js
NIGHT-4: THE MUSIC BED v2's NODE — one AudioWorkletNode («night-bed», apps/night/worklets/bed-worklet.js) into the master's input (the sleep fade and the limiter cover it; live sound, never a track…
- const (3): `BED2_WORKLET`, `BED2_POOLS`, `BED2_DIV`
- fn (4): `buildBed2`, `bed2Post`, `bed2Park`, `bed2Stats`

## apps/night/start.js
NIGHT-11 part 2 — THE START'S OWN WORDS (audit W4, W9).
- const (5): `START_OLD`, `FLOW_OLD`, `startEnv`, `startEnvDbg`, `startDbg`
- fn (4): `inAppShow`, `startWire`, `startFailText`, `startSay`

## apps/night/still.js
DESIGN-1 part D: THE START SCREEN'S STILL, ITS LIGHTS AND THE REVEAL (the law: pure/still.js).
- fn (2): `stillWire`, `stillDbg`

## apps/night/texts.js
NIGHT-7 — NIGHT'S OWN TEXTS, both languages.
- const (1): `NIGHT_TEXTS`

## apps/night/tint.js
DESIGN-1 part B: THE ROOM'S TINT ON THE INTERFACE — the current room's record names its `tint` token (its light colour in night.css; the data row «NIGHT room tint» checks dark ink on it and it on t…
- const (1): `tintNow`
- fn (1): `tintApply`

## apps/night/worklets/bed-worklet.js
NIGHT-4: THE MUSIC BED v2 — one AudioWorklet processor «night-bed» holding every voice of the bed and its own reverb (design: docs/night/design/NIGHT-3-rooms/PLAN.md §4b; the law apps/night/pure/be…
- exports: none

## apps/night/worklets/nature-worklet.js
NIGHT-8: THE NATURE WORKLET «night-nature» — the stream's murmur (the law and the synthesis: apps/night/pure/brook.js, imported unchanged, so the listening render tools/brook-render.mjs hears exact…
- exports: none

## apps/site/site.js
handsong.app (SITE-1): the language.
- exports: none

## core/arrange.js
Размер такта (metre) приходит через ctx.metre из loop.metre — модуль остаётся чистым (без импорта состояния).
- const (8): `PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `subOf`, `gridOk`, `rhythmFits`, `rhythmsForMetre`, `BASS_MODES`
- fn (1): `buildArrangement`

## core/audio.js
(no head comment)
- const (54): `outputFadeLevel`, `setLowPower`, `leanInfo`, `setPartialFloor`, `ambienceInfo`, `bendTapSet`, `leadHold`, `chordHold`, `bassHold`, `droneHz`, `sympBase`, `LEAD_INSTR`, `CHORD_INSTR`, `BASS_INSTR`, `DRUM_NAMES`, `DRUM_ROWS`, `DRUM_KITS`, `hitOwner`, `masterLevel`, `renderStateOf`, `timbresOf`, `timbreIdOf`, `timbreById`, `timbreReg`, `timbreKey`, `timbreIdx`, `timbreSnapshot`, `timbreRecord`, `timbreForgetDbg`, `FX_FACTORY`, `fxPerm`, `fxHandRange`, `fxIsPerNote`, `fxNoteField`, `fxNoteFollows`, `fxVoiceIdsFor`, `fxAddableIds`, `FX_AMT`, `fxBriOf`, `FX_GLIDE_KEY`, `fxDipLog`, `frzStoreDel`, `frzStoreDbg`, `poolDbg`, `poolSizes`, `setTrackRouteOf`, `routeOfOwner`, `LEAD_KS_FROM`, `leadIsKs`, `masterDyn`, `ffInfo`, `masterDelayMs`, `masterProbeNodes`, `engineCtx`
- fn (89): `outputFade`, `setTimbreTrim`, `setNightStrikes`, `setLeanPath`, `leadParkTick`, `ambienceOn`, `ambienceRetune`, `ambienceTick`, `initAudio`, `setLeadInstr`, `applyFx`, `applyExpr`, `scheduleBend`, `leadCancel`, `metroClick`, `leadOn`, `leadSet`, `leadOff`, `leadAllOff`, `chordOn`, `chordGlide`, `chordOff`, `setBassInstr`, `bassOn`, `bassSet`, `bassOff`, `drumHit`, `setDrumKit`, `droneOn`, `droneOff`, `droneRetune`, `droneUse`, `createRecordingTap`, `setTrackGainOf`, `ownerGain`, `trackGainRetune`, `setMasterLevel`, `masterMeter`, `setTrackPanOf`, `ownerPan`, `trackPanRetune`, `dronePan`, `renderReset`, `timbreInstall`, `fxInstance`, `fxSetActive`, `fxChainResplice`, `fxSnapshot`, `fxChordBri`, `fxCaptureChain`, `fxCaptureWalk`, `fxPlaySet`, `fxPlayPath`, `fxParamKeysOf`, `fxRestoreAim`, `fxParamMetaOf`, `fxDefaultsOf`, `fxAimSet`, `fxAimGet`, `makeFrozenBus`, `fxRenderPath`, `fxGateAt`, `setDbg`, `dbgExprBypass`, `fxGlideOf`, `probeCapture`, `probeCaptureReady`, `xfRamp`, `voicesCut`, `frzStorePut`, `frzReader`, `frzStoreCount`, `fxDenormOf`, `offlineTapMaster`, `engVoices`, `engLevels`, `engLoad`, `setOffline`, `setRnd`, `chainStateOf`, `masterDynSet`, `offlineMasterDyn`, `forestData`, `noteOn`, `noteSet`, `noteOff`, `bend`, `hit`, `drone`
- let (4): `AC`, `frzReady`, `ksReady`, `dynReady`
- → ./modules/timbres/stages.js (1): `panGains`

## core/autosave.js
AUTOSAVE1 (RUN 3, 2026-10-16) — THE CURRENT SONG KEPT ON THIS DEVICE BY ITSELF.
- const (7): `AS`, `AS_KEEP`, `asWire`, `asInfo`, `asEnabled`, `asPause`, `asDbgState`
- fn (12): `asPut`, `asStart`, `asTick`, `asWrite`, `asAdopt`, `asFresh`, `asFlush`, `asList`, `asGet`, `asSetEnabled`, `asDbg`, `asDrop`

## core/clip.js
================= ЗАПИСЬ КЛИПА / АУДИО ================= ОДИН движок на два вида записи (не два модуля): • 'video' — кадр ХОЛСТА (canvas.captureStream) + звук → один файл С картинкой И звуком; • 'a…
- const (2): `activeKind`, `onClipChange`
- fn (3): `captureFrame`, `startClip`, `stopClip`

## core/config.js
================= КОНФИГ: зоны, метаданные, пороги =================
- const (55): `FINGER_TIPS`, `FX_META`, `CAM_MARGIN`, `remapAxis`, `coverView`, `PINCH_ON`, `PINCH_HOLD`, `PINCH_OFF`, `REV_NEAR`, `CLEAR_HOLD_MS`, `LOOPER_MSG_MS`, `ROW_HYST`, `WATCHDOG_MS`, `SCHED_AHEAD`, `SCHED_TICK_MS`, `FX_BAR_W`, `FX_BAR_GAP`, `FX_BAR_MAX`, `CH_PAL_W`, `CH_PAL_PAD`, `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `PAL_HYST_X`, `PAL_HYST_Y`, `palColX`, `palRowY`, `palSplitX`, `rectBandY`, `volAmp`, `volFromOld`, `volVel`, `BEATS_PER_BAR`, `REC_VOL_EPS`, `REC_REV_EPS`, `REC_FX_EPS`, `REC_FINE_EPS`, `REC_AVG_S`, `REC_JUMP_EPS`, `REC_HIST_S`, `REC_PAUSE_S`, `REC_KNEE_F`, `AUT_RAMP_BEAT`, `AUT_RAMP_EPS`, `BEND_EPS_CENTS`, `CURVE_A`, `curveU`, `curveK`, `bendSeg`, `BEND_GLIDE_STEP_S`, `CHORD_POOL_N`, `CHORD_POOL_FIRST`, `BASS_POOL_N`, `LEAD_POOL_N`, `LEAD_POOL_KS`, `FX_VOL`
- fn (3): `bendAt`, `bendSplit`, `bendPlan`

## core/edition.js
The edition: 'dev' in the repository and in ordinary builds (Night's ⓘ card shows its development items).
- const (1): `EDITION`

## core/engine/fdn.js
AUD2a (RUN 3, 2026-10-16) — THE FDN REVERB: allpass diffusers, four delay lines with damping and Householder mixing, decay (RT60) and tone — the JS reference the WASM reverb (W1) is tested against.
- const (2): `REV_A`, `RENDER_QUANTUM`
- fn (4): `apStage`, `buildFDN`, `setRevDecay`, `setRevTone`

## core/engine/surface.js
AUD1a (RUN 3, 2026-10-16; docs/core/AUD1-design.md option C): THE ENGINE'S OUTWARD SURFACE — every name core/audio.js exports, listed by the module that calls it (static named imports, namespace us…
- const (2): `SURFACE`, `SURFACE_INTERNAL`

## core/engine/worklets/dyn-worklet.js
SND-F1 — DYNAMICS on the audio thread: one processor 'dyn', two modes (processorOptions.mode).
- exports: none

## core/engine/worklets/frz-worklet.js
====================================================================== ЗАМОРОЖЕННЫЕ ДОРОЖКИ В 16 БИТАХ — ХРАНИЛИЩЕ И ЧТЕЦ НА ПОТОКЕ ЗВУКА (слайс AF6b) ----------------------------------------------…
- exports: none

## core/engine/worklets/ks-worklet.js
====================================================================== Карплюс–Стронг (щипковая струна) как АУДИО-ВОРКЛЕТ — третий способ построить голос, рядом с субтрактивным и FM (не вместо них).
- exports: none

## core/engine/worklets/probe-cap-worklet.js
====================================================================== СЪЁМ МАСТЕРА ДЛЯ ПРОБ — НА ПОТОКЕ ЗВУКА, С НОМЕРАМИ КАДРОВ (только пробы; приложение его не грузит) --------------------------…
- exports: none

## core/freeze/registry.js
REC5 (stage 3) — FROZEN TRACKS: the registry by lane id, the signature and its state (F5), what the auto-freeze watcher reads (AF3), install / pending readers (AF6b-fix), the 16-bit store (AF6b), t…
- const (26): `freezeWire`, `frzWatchBump`, `frzPend`, `frozen`, `frozenOn`, `frzLayer`, `frzHas`, `frzBufNow`, `frzChaseSkip`, `frzGlobalKey`, `frzSigMemo`, `frzSigTonicDbg`, `frzBytesOf`, `frzReadersAlive`, `frzSwapDbg`, `FRZ_CHUNK`, `frzStoreMode`, `frzChunkDbg`, `frzNodesInfo`, `frzSwapCancelAll`, `frzSwapInfo`, `unfreezeLayer`, `frozenLayers`, `frozenInfo`, `frzGainAll`, `frzBusGain`
- fn (26): `freezeSig`, `freezeState`, `freezePinCaptures`, `frzWatchKey`, `frzRetuneOnly`, `laneHasChain`, `frzBytesTotal`, `songPinChains`, `freezeTicket`, `freezeSet`, `frzPendCancel`, `frzWhenReady`, `frzPackAsync`, `frzPlanSwap`, `frzSwapCut`, `frzLeadAhead`, `frzLeadRecut`, `frzSwapCancel`, `frzLeave`, `frzSkipNear`, `frzNearDone`, `freezeDrop`, `frzGain`, `frzStopOne`, `frzStopAll`, `frzArm`
- let (1): `frzWatchVer`

## core/frzqueue.js
═══════════════ ⛳ AUTO-FREEZE — the WATCHER (AF3) and the QUEUE (AF1) ═══════════════ Tracks freeze themselves, unnoticed.
- const (15): `setRunner`, `afPaused`, `afIdle`, `afBusy`, `afActive`, `AF_DELAY`, `AF_REFREEZE_ON_RETUNE`, `AF_BUDGET_MB`, `qBegin`, `qEnd`, `qRunning`, `qState`, `qCostSet`, `qCostOf`, `QF`
- fn (11): `autoFreeze`, `freezeQueue`, `afPause`, `afRowState`, `afBegin`, `afEnd`, `afTick`, `afHint`, `qStep`, `qAdd`, `qRank`

## core/gestures.js
GES1 (DAY run 2026-10-16): gestures.js is the FACADE of the gesture layer — importers (main, draw, ui, frzqueue, probes) keep their import lines.
- → ./gestures/features.js (2): `degRaw`, `pinchDbg`
- → ./gestures/fxhand.js (1): `fxParamsOf`
- → ./gestures/hands.js (6): `HANDS`, `processHands`, `voiceModeReset`, `handsProbe`, `processHandsProbe`, `handsView`
- → ./gestures/roles.js (1): `ACTIONS`

## core/gestures/expr.js
GES1 part 2 (stage 3) — THE EXPRESSION HAND (solo, function 'expr'): features off RAW landmarks, the middle layer (pump-and-decay, springs on a fixed sub-step, engage), the four axes (rules #22, #2…
- const (4): `exprWire`, `EXPR_CFG`, `EXPR`, `exprPrevSet`
- fn (2): `exprFeatures`, `tickExpr`
- let (1): `exprPrevT`

## core/gestures/features.js
GES1 part 1 (stage 3) — THE PURE GESTURE MATH: pinch ratios normalised by hand size, the touched fingers with their hysteresis, the one-step smoothing, smoothstep with a dead zone, degree / axis / …
- const (4): `pinchDbg`, `clamp01`, `clamp`, `dist`
- fn (8): `pinchRatios`, `minFinger`, `touchedFingers`, `emaS`, `smoothstep`, `degRaw`, `degHyst`, `cellHyst`

## core/gestures/fxhand.js
GES1 part 2 (stage 3) — THE EFFECTS HAND: which parameters a hand's fingers aim at (fxParamsOf — the aim's single door, rule #29) and the capture of a finger's parameter (captureFx) — moved from ge…
- const (1): `fxParamsOf`
- fn (1): `captureFx`

## core/gestures/hands.js
GES1: the GESTURE STATE MACHINE — the hands table, latch / lead owners, endPinch, the HAND1 probe clock and processHands (one camera frame → W* calls).
- const (1): `HANDS`
- fn (5): `processHands`, `voiceModeReset`, `handsProbe`, `processHandsProbe`, `handsView`

## core/gestures/looper.js
GES1 part 2 (stage 3) — THE LOOPER HAND (function 'loop'): one command per pinch edge (rule #21) — record / play-pause / undo / the 3-s clear with its countdown — and its named confirmations — move…
- const (1): `looperWire`
- fn (2): `doLooper`, `fireLooperCmd`

## core/gestures/pose.js
RUN 7 (C7): THE POSE GENERATOR (moved from probes/hand.js, HAND1 — the probe now imports it from here): a pose → the 21 landmarks of one hand in the camera's RAW coordinates (through the live crop …
- fn (1): `pose`

## core/gestures/roles.js
GES1: the hand ROLES and OWNER KEYS — stateless helpers of the gesture machine (gestures/hands.js): depth, voice-mode zones, live owner keys, sound + record by role, the finger-action registry, whi…
- const (10): `depthN`, `melodicZone`, `polyZone`, `leadZone`, `liveKey`, `monoKey`, `wOn`, `wOff`, `ACTIONS`, `paletteFinger`
- fn (4): `depthOf`, `handHalfRole`, `noteHandRole`, `noteVolOf`

## core/hand-worker.js
LAT2b — hand detection OFF the main thread (a CLASSIC worker: MediaPipe starts each model by importScripts of its loader, which a module worker cannot do; our modules come in by dynamic import).
- exports: none

## core/handcal.js
CORE-1: the live calibration service, thin over core/pure/handcal.js: the record and store, the camera's key, the running routine and withholding hands while it runs.
- const (7): `handCalSetDepthSens`, `calBusy`, `calOn`, `calDepthAt`, `calSens`, `calProbeSet`, `calSig`
- fn (16): `handCalOpen`, `handCalRead`, `handCalSetSens`, `handCalSetDir`, `handCalReset`, `handCalStart`, `handCalCancel`, `handCalAccept`, `handCalState`, `onHandCal`, `calFrame`, `calDepthN`, `calDepthView`, `calInv`, `calStartProbe`, `calKeep`

## core/handdet.js
LAT2 — the hand DETECTOR: MediaPipe's hand model, worker-safe (no DOM — it runs inside core/hand-worker.js and, as the fallback, on the main thread through vision.js).
- const (3): `MP_WASM`, `MP_MODEL`, `EMPTY_RESULT`
- fn (2): `plainResult`, `createDetector`

## core/hooks.js
tutor — обучающий слой (UI) подписывается СЮДА: нижние слои (gestures) шлют события через hooks.tutor, не трогая DOM (правило #5).
- const (1): `hooks`

## core/i18n.js
================= ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n) — ЭТАП 0: только каркас ================= English по умолчанию + Русский; форма механизма РАССЧИТАНА на четыре языка (en/ru/es/de), но словари es/de пок…
- const (5): `store`, `LANGS`, `LANG_LABEL`, `DICTS`, `onLangChange`
- fn (5): `t`, `L`, `applyI18n`, `withLang`, `setLang`
- let (1): `lang`

## core/icons.js
UI1b (DAY run 2026-10-16): THE ICON COMPONENT — every interface glyph is rendered through here, by a NAME of its meaning.
- const (4): `ICONS`, `icon`, `iconText`, `SVG_ICONS`
- fn (4): `applyIcons`, `svgIcon`, `svgEmblem`, `svgIconAdd`

## core/legacy-ui/boot.js
(no head comment)
- fn (2): `boot`, `startFail`

## core/legacy-ui/draw.js
DRAW1 (DAY run 2026-10-16): draw.js is the FACADE of the canvas — importers keep their import lines.
- → ./views/camera.js (2): `drawVideoBackground`, `syncViewRect`
- → ./views/common.js (2): `loopBarBottom`, `setEmptyTpOld`
- → ./views/play.js (1): `drawOverlays`
- → ./views/roll.js (21): `fxTitleOf`, `rollAutDrive`, `rollAutSnapV`, `rollAutValAt`, `rollAxisHasDim`, `rollAxisNow`, `rollBendAt`, `rollBendProbe`, `rollBoxHits`, `rollDefaultRow0For`, `rollDragTarget`, `rollGeom`, `rollHit`, `rollRow0Across`, `rollRowPitch`, `rollRowsProbe`, `rollSelectable`, `rollShiftPit`, `rollSnap`, `rollSnapBeat`, `rollTrackView`
- → ./views/stack.js (3): `stackFrame`, `stackSet`, `stackList`
- → ./views/strip.js (9): `arrGeom`, `laneCol`, `laneDefName`, `laneTitle`, `loopBeatAt`, `loopHit`, `loopScroll`, `loopViewProbe`, `stripProbe`

## core/legacy-ui/latmeter.js
LAT1 — the latency meter, browser side.
- const (4): `latShown`, `darkHideDbg`, `latLostDbg`, `latCount`
- fn (12): `latFrame`, `latHands`, `latIdle`, `latStart`, `latReport`, `latText`, `latConsole`, `latShow`, `latSwSync`, `latSwitch`, `darkDbg`, `latPauseDbg`

## core/legacy-ui/ui.js
(no head comment)
- ? (1): `$`
- const (5): `arrApi`, `undoUiDbg`, `canSplit`, `shellDoors`, `setFaceHook`
- fn (13): `tutorReset`, `tutorClearLoop`, `tutorSetScale`, `tutorResetHandFn`, `songSaveText`, `songOpenText`, `songKeep`, `songKeepTimbres`, `asRestoreId`, `songResumeOffer`, `tutorSplitInit`, `revealBar`, `tutorSyncBar`

## core/legacy-ui/views/camera.js
DRAW1 (DAY run 2026-10-16): the camera picture: the cover crop (syncViewRect) and the video background — moved from draw.js verbatim (draw.js is the facade).
- fn (2): `drawVideoBackground`, `syncViewRect`

## core/legacy-ui/views/common.js
DRAW1 (DAY run 2026-10-16): shared canvas helpers (FX bar layout, status and transport sync, colour mixing, the ONE note label noteLbl, the time axis and the editor row geometry, the editor bar hei…
- const (16): `setEmptyTpOld`, `FX_EDGE`, `FX_STEP`, `LOOP_EMPTY_TOP`, `ROLL_BAR_H`, `ROLL_TP_H`, `fxBarItems`, `fxBarsBox`, `fxBarsY`, `fxParamOnFinger`, `laneBeatAt`, `laneBeatX`, `noteLbl`, `rollRowAt`, `rollRowY`, `statusEl`
- fn (3): `hexA`, `mixHex`, `syncLoopTransport`
- let (2): `emptyTpOld`, `loopBarBottom`

## core/legacy-ui/views/play.js
DRAW1 (DAY run 2026-10-16): the play screen: overlays per frame (drawOverlays), roles, grids, hands, palette, effect bars, status — moved from draw.js verbatim (draw.js is the facade).
- const (2): `nightTipsDbg`, `glowJointsDbg`
- fn (2): `nightTipsDrawDbg`, `drawOverlays`

## core/legacy-ui/views/roll.js
DRAW1 (DAY run 2026-10-16): the track editor (drawRoll, rollView, the pitch axis, the automation lane, hit tests) — moved from draw.js verbatim (draw.js is the facade).
- const (5): `rollAutValAt`, `rollBendProbe`, `rollSnapBeat`, `rollAutSnapV`, `rollRowsProbe`
- fn (17): `fxTitleOf`, `rollBendAt`, `rollSnap`, `rollAutDrive`, `rollHit`, `rollShiftPit`, `rollBoxHits`, `rollSelectable`, `rollGeom`, `rollTrackView`, `rollRowPitch`, `rollAxisHasDim`, `rollDefaultRow0For`, `rollAxisNow`, `rollRow0Across`, `rollDragTarget`, `drawRoll`

## core/legacy-ui/views/stack.js
VIS1a (RUN 6, docs/core/VIS1-design.md §4) — THE COMPOSITOR: visual modules drawn in LAYER order, bottom to top — scene (the WebGL room, VIS1b) · background (the camera picture) · instrument (the p…
- const (2): `LAYERS`, `stackList`
- fn (3): `stackAdd`, `stackSet`, `stackFrame`

## core/legacy-ui/views/strip.js
DRAW1 (DAY run 2026-10-16): the play strip, the arrangement window and the mixer (drawLooper, loopView, their hit tests and probes) — moved from draw.js verbatim (draw.js is the facade).
- const (4): `laneCol`, `laneTitle`, `loopViewProbe`, `loopViewClear`
- fn (7): `laneDefName`, `loopHit`, `loopBeatAt`, `stripProbe`, `loopScroll`, `arrGeom`, `drawLooper`

## core/live/backing.js
REC5 (stage 3) — THE BACKING: loading an arrangement or a jam as backing tracks (one event funnel backingEvent, each layer its own take, one history step), and clearing it — moved from recorder.js …
- const (2): `backingWire`, `loadJam`
- fn (3): `loadArrangement`, `backingEvent`, `clearJam`

## core/live/capture.js
REC5 (stage 3) — WHAT A TAKE CAPTURES AND HOW RECORDINGS DRIVE THE CHAINS: the capture sampling (takeCapStart / takeCapSample, O-2), the fine-recording automaton (fineStep / fineKnee), the playback…
- const (6): `capReset`, `pnSnap`, `fxPlayDriving`, `fxIsDriven`, `setLiveIsolation`, `playKeyOf`
- fn (9): `takeCapStart`, `capRecordNow`, `fineNew`, `fineReset`, `fineStep`, `takeCapSample`, `fxLaneMerge`, `fxPlayDrive`, `fxPlayStop`
- let (1): `liveIso`

## core/live/eng.js
REC5 (stage 3) — THE ENGINE TABLE: makeENG (one dispatch table for live play, replay and the render copy), the live ENG, and the event pricing at play time (evHz, evTi, evReg) — moved from recorder…
- const (3): `evHzDbg`, `makeENG`, `ENG`
- fn (2): `evHz`, `evReg`

## core/live/record.js
REC5 (stage 3) — LIVE RECORDING: the recording state and the take's per-track state, routing a note to its track by SOURCE (T2/T3), push (the only writer of live events), per-note value recording, …
- ? (1): `recWinReset`
- const (21): `gridFor`, `recWire`, `recBass`, `takeSt`, `takeSrc`, `recLayers`, `isRecLayer`, `curTakeSet`, `inPB`, `noteSource`, `noInst`, `wTapSet`, `WleadOn`, `WleadOff`, `liveChClear`, `WchOn`, `WchSet`, `WchOff`, `WbassOn`, `WbassOff`, `WdrumHit`
- fn (13): `takeJoin`, `nextFreeLayer`, `storeTi`, `storeTim`, `push`, `recLeadReset`, `recFoldRoll`, `recAllOff`, `recDrop`, `recLatchOpen`, `setRecording`, `recStop`, `onRec`
- let (4): `recording`, `pushLy`, `curTake`, `latchOpenAt`

## core/modules/effects/bright.js
AUD2a (RUN 3, 2026-10-16) — the effect «Brightness» (a voice module read by each voice).
- const (1): `BRIGHT_PARAMS`
- fn (1): `makeBrightFx`

## core/modules/effects/delay.js
AUD2a (RUN 3, 2026-10-16) — the effect «Delay» (a bus insert with its own dry/wet).
- const (2): `DLY_A`, `DLY_PARAMS`
- fn (1): `makeDelayFx`

## core/modules/effects/forest.js
AUD2a (RUN 3, 2026-10-16) — the effect «Night forest» (a seeded convolution room, SND-F1).
- const (1): `FOREST_PARAMS`
- fn (2): `forestBuffer`, `makeForestFx`

## core/modules/effects/forestdepth.js
RUN 7 (C4b, Night plan §4.2; the user's choice «Night gets its own wider range, Full unchanged»; RUN 8: LOUDNESS KEPT) — the effect «Forest depth»: Night's room.
- const (2): `FDEPTH_LIGHT`, `FDEPTH_PARAMS`
- fn (1): `makeForestDepthFx`

## core/modules/effects/glide.js
AUD2a (RUN 3, 2026-10-16) — the effect «Glide» (a voice module; the pitch glide time).
- const (1): `GLIDE_PARAMS`
- fn (1): `makeGlideFx`

## core/modules/effects/glue.js
AUD2a (RUN 3, 2026-10-16) — the dynamics «Glue» (our compressor in the dyn worklet) and the dynamics node builder (also the master's Glue and Limiter).
- const (1): `GLUE_PARAMS`
- fn (2): `dynNode`, `makeGlueFx`

## core/modules/effects/night-fx.js
RUN 7 (C5, Night plan §4.3; docs/night/QUALITY.md points 1, 4, 8) — THE NIGHT EFFECTS HAND: three effects, ONE amount each (a vertical drag of its finger; it stays where it is left).
- const (4): `NIGHT_FX`, `CECHO_PARAMS`, `CTONE_PARAMS`, `CWAVE_PARAMS`
- fn (3): `makeNightEchoFx`, `makeNightToneFx`, `makeNightWaveFx`

## core/modules/effects/param.js
AUD2a (RUN 3, 2026-10-16) — an effect parameter's normalised value (0..1 ↔ its units) and the wrapper every declared parameter goes through (setNorm, cur).
- const (2): `fxNorm`, `fxDenorm`
- fn (1): `fxWrapParam`

## core/modules/effects/reverb.js
AUD2a (RUN 3, 2026-10-16) — the effect «Reverb» (a bus module on the FDN): its declaration and its instance.
- const (1): `REV_PARAMS`
- fn (1): `makeReverbFx`

## core/modules/effects/trem-mix.js
AUD2a (RUN 3, 2026-10-16) — the effect «Tremolo (mix)» (a bus insert).
- const (2): `TRMIX_A`, `TRMIX_PARAMS`
- fn (1): `makeTremMixFx`

## core/modules/effects/volume.js
AUD2a (RUN 3, 2026-10-16) — the effect «Volume» (the permanent voice module, rule #30).
- const (1): `VOL_PARAMS`
- fn (1): `makeVolFx`

## core/modules/timbres/bass-voice.js
AUD1c (RUN 3, 2026-10-16) — the bass pool voices.
- fn (1): `buildBassPool`

## core/modules/timbres/breath.js
RUN 7 (Night sound pass) — the BREATH engine type: sustained, breathing sounds (a breathy flute, a soft vocal / bowed pad).
- fn (1): `buildBreathBank`

## core/modules/timbres/chord-voice.js
AUD1c (RUN 3, 2026-10-16) — the chord pool voice (two filters, rule #19), the pool, and the Firefly strike (one-shot tine, SND-F1).
- const (2): `FIREFLY`, `FF_END`
- fn (3): `newChordVoice`, `buildChordPool`, `ffStrike`

## core/modules/timbres/drumkits.js
AUD1c (RUN 3, 2026-10-16) — the five kits' per-hit synths (Standard, Darbuka, Tabla, Gamelan, Taiko) and the hit voice.
- fn (11): `dNoise`, `dTek`, `dDum`, `tabBaya`, `tabNa`, `tabTick`, `gmlFM`, `taikoDrum`, `taikoKa`, `noiseEdge`, `drumVoice`

## core/modules/timbres/fm.js
AUD1c (RUN 3, 2026-10-16) — the FM solo bank (modulator → carrier frequency, index envelope).
- fn (1): `buildFMBank`

## core/modules/timbres/ks.js
AUD1c (RUN 3, 2026-10-16) — the Karplus–Strong solo banks (worklet `ks-string`) and the subtractive fallback plucks.
- fn (2): `buildKSBank`, `buildKSFallback`

## core/modules/timbres/modal.js
RUN 7 (Night sound pass) — the MODAL engine type: struck instruments (handpan, singing bowl, kalimba, a richer Firefly) by modal synthesis.
- fn (1): `buildModalBank`

## core/modules/timbres/stages.js
AUD1c (RUN 3, 2026-10-16) — shared voice stages: track route, pan, brightness, saturation curves, the brightness ranges, the solo glide time, the filter strike.
- const (12): `BASS_GLIDE_TC`, `CHORD_GLIDE_TC`, `freezeDeep`, `BRI_HZ`, `BRI_OPEN`, `briHzOf`, `CHORD_LP_MAX`, `CHORD_LP_MIN`, `briToHz`, `HUM_CENTS`, `LEAD_GLIDE_TC`, `fstrike`
- fn (6): `makePanStage`, `voiceRoute`, `panGains`, `makeBriStage`, `makeSatCurve`, `makeHardCurve`

## core/modules/timbres/strikes.js
RUN 8 (the Night crackle) — THE STRIKE CAP of the struck solo engines (tine, modal), NIGHT ONLY.
- const (1): `LOW_CAP`
- fn (1): `strikeAdmit`

## core/modules/timbres/subtractive.js
AUD1c (RUN 3) / TIM3b (RUN 4) — the solo bank of a voice from its timbre RECORD: the subtractive engine type here; FM and KS dispatched.
- fn (2): `buildLeadBank`, `buildSubtractive`

## core/modules/timbres/tine.js
C4a (RUN 6, Night plan §4.1) — the TINE engine type as a SOLO bank: «Firefly» for the solo hand.
- fn (1): `buildTineBank`

## core/modules/timbres/voice.js
AUD1c (RUN 3, 2026-10-16) — starting a voice's oscillators (phase scatter, the pair start) and the solo oscillator with its detune taps.
- const (1): `voiceBuild`
- fn (3): `voiceStart`, `voiceStartPair`, `mkOsc`

## core/palette.js
DRAW1b (RUN 3, 2026-10-16) — THE CANVAS PALETTE, read from the design tokens (tokens.css, section «canvas»: --cv-*).
- const (2): `ROLE_COL`, `noRoleCol`
- fn (1): `cv`

## core/profile.js
C0 (RUN 6): PROFILES.
- const (9): `profileWire`, `profileCurrent`, `profileOf`, `profileList`, `profileLoadReport`, `onProfile`, `profileDropDbg`, `profileSavedDbg`, `profileDoorsDbg`
- fn (2): `profileApply`, `profileAddDbg`

## core/pure/bus.js
VIS1a (RUN 6, docs/core/VIS1-design.md §3) — THE EVENT BUS for visuals.
- const (2): `RING_N`, `BUS`
- fn (1): `createBus`

## core/pure/camlight.js
LAT3 — low light.
- const (16): `LOW_MODES`, `LOW_TARGET`, `LOW_EXPOSURE_S`, `LOW_SETTLE_MS`, `exposureSupported`, `HEAL_MODES`, `AUTO_OF`, `DEV_KEYS`, `devSnap`, `healList`, `autoLeft`, `DARK_FPS`, `darkNew`, `LOST_MS`, `lostNew`, `TEST_REC_KEY`
- fn (11): `exposureUnits`, `lowConstraints`, `restoreAdvanced`, `restoreConstraints`, `lowVerdict`, `darkStep`, `lostStep`, `capsText`, `testRecNext`, `testRecRepair`, `camErrKind`

## core/pure/canon.js
CMD1a (RUN 5) — CANONICAL JSON and its hash (pure core, rule #36; data row «CMD1 canonical values (core)»).
- const (1): `canonHash`
- fn (2): `canonJSON`, `fnv`

## core/pure/dsp.js
SND-F1 — pure DSP formulas shared by the engine (audio.js), the dynamics worklet (dyn-worklet.js) and the probes.
- const (9): `FOREST`, `NIGHT_DEPTH`, `forestRoom`, `compGainDb`, `DYN_GLUE`, `DYN_LIMIT`, `DYN_MASTER`, `MASTER_MAKEUP_DB`, `dynCoef`
- fn (6): `seeded`, `nightDepth`, `forestIR`, `irNormScale`, `f32Hash`, `compCurveDb`

## core/pure/engclass.js
ENG2 (RUN 4) — the engine's PROVISIONAL power class and the dropout rate.
- const (4): `ENG_CLASS_PROVISIONAL`, `ENG_THRESH`, `ENG_BENCH_KEY`, `benchText`
- fn (3): `engClass`, `benchOf`, `dropRate`

## core/pure/format.js
FMT1 (stage 3) — THE FILE FORMAT CORE: the envelope every data file carries ({ format:'handsong/<kind>', version, id, … }), the current version of each kind, the migration steps (one pure function …
- class (1): `Bad`
- const (5): `F`, `FORMAT_VERSION`, `MIGRATIONS`, `kindOfFormat`, `CM_MAX`
- fn (7): `upgrade`, `checkManifest`, `checkMenu`, `checkTuning`, `checkPalette`, `checkChordModes`, `checkMode`

## core/pure/handcal.js
CORE-1: the playing hand's depth calibration and the sensitivity settings, pure (rule #36; rows CAL1-CAL3).
- const (14): `CAL`, `REASONS`, `calSize`, `calFarRatio`, `calFarBase`, `calBand`, `calEndPull`, `calInverted`, `calDirValue`, `calFx`, `calEmpty`, `calText`, `calCameraKey`, `calStoreKey`
- fn (12): `calDepth`, `calFilter`, `calHold`, `calSensOf`, `robust`, `calClean`, `calParse`, `calReset`, `calLoad`, `calSave`, `calWipe`, `createCalRun`

## core/pure/handsched.js
LAT2a — the SEARCH SCHEDULE for hand detection.
- const (4): `HAND_SEARCH_EVERY`, `HAND_POLICIES`, `schedNew`, `schedRetry`
- fn (3): `schedPlan`, `schedAfter`, `schedRun`

## core/pure/latency.js
LAT1 — latency bookkeeping.
- const (10): `LAT_N`, `BT_MS`, `BT_LABEL`, `frameWaitMs`, `withFrameWait`, `perMinute`, `STARTUP_MS`, `MP_LINE`, `SOFT_GL`, `isSoftwareGL`
- fn (6): `makeMeter`, `statsOf`, `handToSound`, `looksBluetooth`, `rateOf`, `splitLongTasks`

## core/pure/nightui.js
RUN 7 (C6, Night plan §5; docs/night/QUALITY.md points 5, 8, 9) — the Night shell's LOGIC.
- const (1): `NIGHT_UI`
- fn (4): `showStep`, `nextOf`, `sleepLevel`, `glowAlpha`

## core/pure/pack.js
PACK1 (RUN 3, 2026-10-16; stage-3 plan slice 33; user decision: build it now, no UI) — PACKS AND OFFLINE LICENCE KEYS.
- const (5): `PACK_FORMAT`, `PACK_VERSION`, `KEY_PREFIX`, `KEY_FORMAT`, `PACK_PUBKEYS`
- fn (5): `packCheck`, `keySign`, `keyVerify`, `createPackGate`, `packUnlock`

## core/pure/profile.js
C0 (RUN 6, Night plan §2) — THE PROFILE RECORD and its validator.
- const (7): `PROFILE_FORMAT`, `PROFILE_IDS`, `PROFILE_ROLES`, `BACKGROUNDS`, `LEVEL_DB`, `HAND_FNS`, `PROFILE_DAMAGES`
- fn (1): `checkProfile`

## core/pure/registry.js
FMT1 (stage 3) — PERMANENT IDS AND A REGISTRY OF RECORDS (timbres, tunings, modes, effect presets, expression mappings … as they arrive).
- const (4): `USER_ID`, `BUILTIN_ID`, `PACK_ID`, `idSpace`
- fn (2): `newUserId`, `createRegistry`

## core/pure/songfile.js
SAVE1 (DAY run 2026-10-16) — THE SONG FILE, pure part: reading a «.handsong» text safely, the version rules of the kind 'song' (FMT1: format.js takes SONG_VERSION and SONG_MIGRATIONS from here) and…
- const (5): `SONG_FORMAT`, `SONG_VERSION`, `SONG_MAX_BYTES`, `SONG_MIGRATIONS`, `TIM1_POSITIONS`
- fn (3): `songParse`, `songUpgrade`, `songCheck`

## core/pure/timbre.js
TIM3a (RUN 4) — THE TIMBRE RECORD and its validator.
- const (10): `TIMBRE_FORMAT`, `TIMBRE_FAMILIES`, `WAVES`, `TB`, `KIT_SYNTHS`, `ENGINES`, `POLICY_KEYS`, `timbreNodes`, `BUNDLE_FORMAT`, `TIMBRE_DAMAGES`
- fn (1): `checkTimbre`

## core/recorder.js
(no head comment)
- const (13): `loopChordDeg`, `loopChordOct`, `editIsOpen`, `editLayer`, `editUndo`, `editRedo`, `songMark`, `songDirty`, `cmdNote`, `droneViewNow`, `setLiveLeakDbg`, `editHistPeek`, `droneAudible`
- fn (23): `softAllOff`, `panic`, `onLoop`, `onUndo`, `clearRec`, `toggleLaneMute`, `toggleLaneSolo`, `editOpen`, `editClose`, `editSetLayer`, `setLaneLevel`, `setLanePan`, `laneVerKeep`, `clearSong`, `songSaveRec`, `songOpenApply`, `cmdSet`, `seedTake`, `probeTake`, `liveAllOff`, `backingFollowKey`, `hlOf`, `editRevert`
- → ./freeze/registry.js (28): `frzBusGain`, `frzSigTonicDbg`, `freezeSig`, `frzSwapInfo`, `frzSwapDbg`, `frzPackAsync`, `frzStoreMode`, `frzChunkDbg`, `frzNodesInfo`, `FRZ_CHUNK`, `frzWhenReady`, `frzReadersAlive`, `frzGlobalKey`, `frzWatchKey`, `frzRetuneOnly`, `laneHasChain`, `frzBytesTotal`, `frzBytesOf`, `songPinChains`, `freezeTicket`, `freezeSet`, `unfreezeLayer`, `frozenLayers`, `frozenInfo`, `freezeState`, `frzHas`, `freezePinCaptures`, `frzLayer`
- → ./live/backing.js (4): `loadArrangement`, `loadJam`, `clearJam`, `backingEvent`
- → ./live/capture.js (5): `fxIsDriven`, `fxLaneMerge`, `playKeyOf`, `setLiveIsolation`, `fxPlayDriving`
- → ./live/eng.js (4): `evHz`, `evHzDbg`, `evReg`, `makeENG`
- → ./live/record.js (14): `WleadOn`, `WleadOff`, `WchOn`, `WchSet`, `WchOff`, `WbassOn`, `WbassOff`, `WdrumHit`, `wTapSet`, `inPB`, `recording`, `onRec`, `recLayers`, `isRecLayer`
- → ./song/automation.js (18): `pnBars`, `editVolSel`, `editBendPoint`, `bendDbg`, `editBendShape`, `bendEdited`, `takeFxDump`, `autAddrs`, `autPoints`, `autMovePoint`, `autDeletePoint`, `autAddPoint`, `autShapePoint`, `autCurvePoint`, `autChainOf`, `autChainAdd`, `autChainRemove`, `autChainMove`
- → ./song/capture.js (5): `laneRoleOf`, `captureInfoOf`, `fxLaneExpand`, `FX_CHAIN`, `setAutRecSmooth`
- → ./song/clipboard.js (5): `editCopySel`, `editPaste`, `editDuplicateSel`, `editPasteWhy`, `editClipInfo`
- → ./song/edit-chords.js (3): `editDeleteChordNote`, `editMoveChordNote`, `editResizeChordNote`
- → ./song/edit-group.js (2): `editMoveSel`, `editDeleteSel`
- → ./song/edit-insert.js (6): `editInsertHit`, `editInsertBass`, `editInsertChord`, `editInsertLead`, `laneTimbreOf`, `editSetTimbre`
- → ./song/edit-notes.js (11): `editMoveHit`, `editDeleteHit`, `editCanUndo`, `editCanRedo`, `editBackingOpen`, `editMoveSeg`, `editDeleteSeg`, `editResizeSeg`, `tiePartners`, `chordMoveTy`, `segChordNotes`
- → ./song/file.js (1): `songPlan`
- → ./song/history.js (14): `histUndo`, `histRedo`, `histCanUndo`, `histCanRedo`, `histLen`, `histReset`, `histTab`, `histMaster`, `laneNameStep`, `moveLaneStep`, `histHash`, `histDbg`, `histTopLabel`, `onApplied`
- → ./song/lanes.js (22): `laneMuted`, `laneSoloed`, `laneSoloOn`, `toggleArm`, `armedLayer`, `laneDelTap`, `laneDelCancel`, `laneDelPendingLayer`, `laneAudible`, `laneLevelOf`, `laneNameOf`, `setLaneName`, `laneOrder`, `moveLane`, `laneLook`, `laneShowKeep`, `lanePanOf`, `layerOfOwner`, `laneEditVerOf`, `laneLenOf`, `laneIdOf`, `laneLayerOf`
- → ./song/notes.js (7): `songNotes`, `songSegs`, `viewAudit`, `editViewCheck`, `ldKey`, `chOwnerKey`, `bassOwnerKey`
- → ./song/quantise.js (1): `editQuantSel`
- → ./song/sections.js (12): `sections`, `secAdd`, `secRename`, `secDelete`, `songEdit`, `songEditWhy`, `songUndo`, `songRedo`, `songCanUndo`, `songCanRedo`, `secDbg`, `songHistReset`
- → ./song/store.js (2): `events`, `evRole`
- → ./song/transpose.js (10): `editDegreeSel`, `editDegreeWhy`, `editTrackMode`, `editTrackModeWhy`, `trackViewOfLayer`, `editTranspose`, `editTransposeWhy`, `songTranspose`, `songTransposeWhy`, `trDbg`
- → ./transport/clock.js (23): `secPerBeat`, `beatNow`, `timeAt`, `secOf`, `beatsOf`, `setLoopBars`, `setLoopMetre`, `METRES`, `setLoopSub`, `SUBS`, `beatLevel`, `setLoopQuant`, `setLoopBpm`, `loop`, `loopPos`, `songBeats`, `setRegionOn`, `regionOn`, `cycling`, `braceTap`, `braceMove`, `braceSet`, `braceProbe`
- → ./transport/scheduler.js (3): `seekTo`, `chaseFor`, `chaseNote`

## core/render.js
⛔ ЗАВИСИМОСТИ ЭТОГО МОДУЛЯ — ЧИТАТЬ ПЕРЕД ЛЮБЫМ ПЕРЕИМЕНОВАНИЕМ В recorder / audio / state.
- const (8): `latency`, `seedOfLane`, `unfreeze`, `frozen`, `layoutCost`, `renderKsLazy`, `capStats`, `renderQueue`
- fn (20): `engineProbe`, `probe`, `renderTrack`, `freeze`, `aud`, `live`, `stop`, `recSteps`, `droneBP`, `bendTrace`, `reuseCheck`, `goldRender`, `engBench`, `engine`, `renderPoolDbg`, `copyState`, `revAgree`, `liveCheck`, `swapCheck`, `chunkCheck`
- → ./frzqueue.js (2): `autoFreeze`, `freezeQueue`

## core/scaleload.js
═══ ⛳ ЗАГРУЗЧИК ДАННЫХ ЛАДОВ (слайс F5 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Данные ладов — ФАЙЛЫ в data/ (форма v1: index.json — манифест, menu.json, по файлу на строй, лад, палитру и набор р…
- const (3): `loadReport`, `KINDS`, `kindOfRecord`
- fn (6): `loadScaleSubset`, `builtinRest`, `loadScaleData`, `idHolder`, `checkRecord`, `checkRecordList`
- → ./pure/format.js (1): `CM_MAX`
- → ./pure/registry.js (1): `USER_ID`

## core/scalepick.js
CORE-20 (opt-in) — ONLY THE MODES A PAGE PLAYS.
- const (3): `scalesOnly`, `scalesOnlyOf`, `pageProfileOf`
- fn (1): `pageProfileRead`

## core/scales.js
(no head comment)
- const (61): `NOTE_NAMES`, `ROMAN`, `OCT_ROMAN`, `range`, `TRADITIONS`, `GRP`, `TUNINGS`, `CHORD_FAM_SETS`, `chordModeName`, `chordModeHint`, `SCALES`, `scaleById`, `resolveScaleId`, `anchorHints`, `scaleData`, `scalesOfTrad`, `tradOfScale`, `CUR`, `IVX`, `keyFollowsDbg`, `viewKey`, `keyCDbg`, `viewKeyC`, `baseF`, `keyByOneOne`, `historicalKeyOf`, `viewKeyIdOf`, `keyOf`, `cFix`, `tonicFreq`, `periodOf`, `regWord`, `regWordFull`, `supportsProgressions`, `backingRhythmOf`, `supportsChords`, `typedChords`, `REG_N`, `rectEligible`, `rectGrid`, `rectDefault`, `rectRows`, `rectNotes`, `rectRowsFull`, `rectBase`, `rectBaseMax`, `rectNoteAt`, `rectSlotOf`, `thereminSpan`, `thereminHz`, `chordFams`, `rootName`, `fifthStep`, `modesLikeView`, `centsOf`, `DRONE_TOL`, `droneNonOct`, `setDroneNonOct`, `listLbl`, `SEV`, `chordNotesStr`
- fn (47): `viewOfId`, `applyScaleId`, `userRecordsOf`, `dependentsOf`, `unregisterRecord`, `registerRecord`, `scalesLoadRest`, `menuOf`, `chordModeOf`, `scaleView`, `viewIdOf`, `namingOf`, `tuningStatus`, `rectLayout`, `seventhAddsNote`, `ruleChordSteps`, `pitchHz`, `tuningOf`, `tuningIndexOf`, `leadFreqTi`, `bassFreqTi`, `chordReadsTi`, `chordNotesAt`, `chordRowFreqAt`, `modeSlotOfTi`, `shiftDegrees`, `mapDegrees`, `chordFreqsAt`, `leadFreq`, `bassFreq`, `chordFreqs`, `chordUnit`, `chordBuildOf`, `chordAtRoot`, `chordTypeFits`, `chordRowFreq`, `chordNotes`, `name24`, `stepName`, `rowLabel`, `degCentsExact`, `droneDegree`, `droneSecondHz`, `chordPitchHz`, `listName`, `qual`, `chordLabel`
- → ./scaleload.js (1): `loadReport`

## core/song/automation.js
REC3 part 2 (stage 3) — THE AUTOMATION LANE AND THE PER-NOTE LANES (O-4, V4b, VOL-3, ED5), THE BEND CURVE (OWN2, BEND-CURVE) and the TRACK'S CHAIN edits (S1) with their history kinds — moved from r…
- const (4): `bendDbg`, `BEND_EPS`, `takeFxDump`, `autEarliest`
- fn (18): `autTakesOf`, `autAddrs`, `bendEdited`, `editBendPoint`, `editBendShape`, `pnBars`, `editVolSel`, `autPoints`, `autCaps`, `autMovePoint`, `autDeletePoint`, `autAddPoint`, `autShapePoint`, `autCurvePoint`, `autChainOf`, `autChainAdd`, `autChainRemove`, `autChainMove`

## core/song/capture.js
REC3 part 2 (stage 3) — THE CAPTURE RECORDS (what a take played on its chains: snapshot + lane, by take number), their version, the take counter, the ONE law of a lane segment's shape (autSmoothOf …
- const (9): `takeNext`, `takeSeqFloor`, `takeFx`, `takeFxTouch`, `laneIdFloor`, `FX_CHAIN`, `setAutRecSmooth`, `fxLaneSmooth`, `laneChainKey`
- fn (6): `laneIdFill`, `autSmoothOf`, `fxLaneAt`, `fxLaneExpand`, `laneRoleOf`, `captureInfoOf`
- let (1): `takeFxVer`

## core/song/clipboard.js
REC3 part 2 (stage 3) — COPY, PASTE, DUPLICATE (ED2) — moved from recorder.js (which re-exports them — a facade).
- const (3): `editClipInfo`, `editPasteWhy`, `editPaste`
- fn (2): `editCopySel`, `editDuplicateSel`

## core/song/commands.js
CMD1c (RUN 5) — EVERY HISTORY STEP A COMMAND, SERIALISED BY IDS (plan docs/core/CMD1-design.md §3.4).
- const (2): `HIST_FORMAT`, `cmdDbg`
- fn (3): `histToJSON`, `histFromJSON`, `histRoundTrip`

## core/song/edit-chords.js
REC3 (stage 3) — CHORD-NOTE EDITS (U2–U4: a chord dissolves into one-note chords when one of its notes is deleted, moved or resized), moved from recorder.js (which re-exports these names — a facade).
- fn (3): `editDeleteChordNote`, `editMoveChordNote`, `editResizeChordNote`

## core/song/edit-group.js
REC3 (stage 3) — GROUP EDITS (ED1: several notes moved or deleted as ONE history entry), moved from recorder.js (which re-exports these names — a facade).
- fn (4): `editDeleteSel`, `editGroup`, `editMoveSel`, `selGroups`

## core/song/edit-insert.js
REC3 part 2 (stage 3) — INSERTS of the track editor (bass, solo, chords, drum hits; the session take; the pinned chain of a new track) and the TIMBRE REPLACEMENT (T5) — moved from recorder.js (whic…
- ? (1): `editTakeNow`
- const (2): `editDefVol`, `editTakeReset`
- fn (7): `editInsPush`, `editInsertBass`, `editInsertLead`, `editInsertChord`, `editInsertHit`, `laneTimbreOf`, `editSetTimbre`
- let (1): `editTake`

## core/song/edit-notes.js
REC3 (stage 3) — THE EDITOR'S EDIT CORE AND NOTE EDITS (guard, commit, batch, tie pairs, key clash, detach; move / resize / delete of notes and drum hits), moved from recorder.js (which re-exports …
- const (12): `EDIT_GAP`, `EDIT_MIN_LEN`, `EDIT_ROLE`, `editBackingOpen`, `editCanRedo`, `editCanUndo`, `editIsOpen`, `editLayer`, `editPush`, `editRoleOf`, `editWire`, `noTie`
- fn (19): `bendTrim`, `chordMoveTy`, `commitDetach`, `detachPlan`, `editBatch`, `editCommit`, `editDeleteHit`, `editDeleteSeg`, `editGuard`, `editMoveHit`, `editMoveSeg`, `editResizeSeg`, `keyClash`, `segChordNotes`, `segEvs`, `segPitchPt`, `slotPt`, `tiePartners`, `untieAcross`

## core/song/env.js
REC3 part 2 (stage 3) — THE SONG LAYER'S ENVIRONMENT: what pure song/ modules need from above — the transport (REC4's clock answers these later), the engine's effect DECLARATIONS (the FX_FACTORY re…
- const (2): `ENV`, `envWire`

## core/song/file.js
SAVE1 (DAY run 2026-10-16) — THE SONG ↔ ITS FILE RECORD (song layer: no DOM, no Web Audio; folder rule).
- const (1): `fileDbg`
- fn (6): `songData`, `songPlan`, `songNeeds`, `songTimbreNeeds`, `viewRec`, `viewOfRec`

## core/song/history.js
REC2 (stage 3) — THE ONE HISTORY (ED7), moved from recorder.js (which re-exports these names — a facade).
- const (17): `onApplied`, `histNote`, `histWire`, `histKindFields`, `histLists`, `histSeal`, `histReset`, `histCanUndo`, `histCanRedo`, `histLen`, `histTopLabel`, `histSince`, `histPeek`, `histOffAdd`, `histOffNow`, `histDbg`, `histDbgO`
- fn (14): `histKind`, `histInstall`, `histHashObj`, `histApply`, `histTouched`, `histPush`, `histHash`, `histUndo`, `histRedo`, `histTab`, `histMaster`, `laneNameStep`, `moveLaneStep`, `histGroup`

## core/song/lanes.js
REC1 (stage 3) — THE TRACK TABLES, moved verbatim from recorder.js (which re-exports these names — a facade).
- const (27): `laneWire`, `laneId`, `laneMute`, `laneSolo`, `laneLevel`, `lanePan`, `laneName`, `laneRank`, `laneLen`, `laneLenOf`, `laneEditVer`, `laneVerBump`, `laneEditVerOf`, `laneOf`, `laneForget`, `laneTablesClear`, `armedLayer`, `laneAudible`, `laneGated`, `laneLevelOf`, `laneGainOf`, `lanePanOf`, `laneNameOf`, `laneMuted`, `laneSoloed`, `laneSoloOn`, `laneRow`
- fn (13): `laneNew`, `laneLayerOf`, `toggleArm`, `laneDelTap`, `laneDelCancel`, `laneDelPendingLayer`, `layerOfOwner`, `setLaneName`, `laneOrder`, `moveLane`, `laneShowKeep`, `laneLook`, `laneRowSet`

## core/song/notes.js
REC2 (stage 3) — THE SONG AS NOTES, moved from recorder.js (which re-exports these names — a facade).
- const (7): `chOwnerKey`, `bassOwnerKey`, `ldKey`, `chaseKind`, `chaseKey`, `notesReset`, `ldTherm`
- fn (7): `layerSlotTop`, `layerTakeTop`, `songNotes`, `viewAudit`, `editViewCheck`, `trackViewCheck`, `songSegs`

## core/song/quantise.js
REC3 part 2 (stage 3) — QUANTISE AFTER RECORDING (ED3) — moved from recorder.js (which re-exports them — a facade).
- fn (1): `editQuantSel`

## core/song/sections.js
REC3 part 2 (stage 3) — SECTIONS (ED6): named bar markers; insert, cut or duplicate BARS in every track at once, with their history kinds (brace, marks, lanelen) — moved from recorder.js (which re-…
- const (9): `secDbg`, `secMarksSet`, `secCopy`, `sections`, `songCanUndo`, `songCanRedo`, `songUndo`, `songRedo`, `songHistReset`
- fn (5): `songEditWhy`, `songEdit`, `secAdd`, `secRename`, `secDelete`
- let (1): `secMarks`

## core/song/store.js
REC1 (stage 3) — THE SONG'S EVENT STORE, moved verbatim from recorder.js (which re-exports these names — a facade).
- const (11): `events`, `onInvalidate`, `sortedLen`, `evSeq`, `evSeqPut`, `evOrder`, `evIdFloor`, `maxLayer`, `evRole`, `chaseRole`, `isNoteStart`
- fn (4): `schedInvalidate`, `compactEvents`, `evSeqFill`, `evIdFill`
- let (1): `evGen`

## core/song/transpose.js
REC3 part 2 (stage 3) — TRANSPOSE BY DEGREES (ED4), A TRACK INTO ANOTHER MODE (OWN1), TRANSPOSE BY SEMITONES (TF3, TF3b) — moved from recorder.js (which re-exports them — a facade).
- const (6): `editDegreeWhy`, `trackViewOfLayer`, `editTrackModeWhy`, `trDbg`, `editTransposeWhy`, `songTransposeWhy`
- fn (4): `editTrackMode`, `editTranspose`, `songTranspose`, `editDegreeSel`

## core/soundmods.js
CORE-7: THE DOOR FOR AN APP'S SOUND MODULES.
- const (1): `soundModOf`
- fn (1): `soundModAdd`

## core/state.js
(no head comment)
- const (99): `fx`, `fxIsScalar`, `CHAIN_ROLE`, `chainKeyOf`, `CHAIN_SOLO`, `CHAIN_TRACK`, `trackChainKeyOf`, `chainOwners`, `fxChainOf`, `fxVolReset`, `setFxParamAddr`, `setFxParamMode`, `setFxParamFixed`, `fxChainAdd`, `fxChainRemove`, `fxChainMove`, `setHandFn`, `handSide`, `handFnOf`, `roleHasTherm`, `roleHasFx`, `roleHasExpr`, `playsNotes`, `roleHasNotes`, `handActsOf`, `handActOf`, `setHandAct`, `setRectPref`, `setPinchFingers`, `VOICE_MODE_DEF`, `voiceMode`, `setVoiceMode`, `isLeadMode`, `setSplitRole`, `phoneHalves`, `setScaleId`, `setTonic`, `KEY_CENTS_MAX`, `setTonicCents`, `setARef`, `setTunedFrom`, `setChordMode`, `setChordModeSel`, `setSeventh`, `setLeadIdx`, `setChIdx`, `setBassIdx`, `setDrumKitIdx`, `setExprDisp`, `setChFitDeg`, `setExprBrightDisp`, `setLooperMsg`, `setLooperClear`, `setLatchDeg`, `setLatchOct`, `setChordFam`, `setChordVar`, `setLatchTy`, `setPhoneInstr`, `setCamFacing`, `setVideoRec`, `mirrored`, `flipX`, `setViewRect`, `sx`, `sy`, `setSplitOn`, `setOctReg`, `setBassOctReg`, `setChordOctReg`, `setRollOpen`, `setArrOpen`, `setArrFace`, `setRollWin`, `setRollSel`, `setRollSelNote`, `setRollSelMany`, `setRollPick`, `setRollBox`, `setRollDrag`, `setRollIns`, `setLaneRow0`, `setLaneDrag`, `ROLL_EDITABLE`, `setRollRole`, `setRollRow0`, `setRollRowsAll`, `setRollAut`, `setRollAutSel`, `setRollAutDrag`, `setRollBendSel`, `setRollBendDrag`, `setSecSel`, `setRollVolBars`, `rectOctReg`, `setRectOctReg`, `setVolFloor`, `setNightView`, `setFxChain`
- let (50): `scaleId`, `aRef`, `tunedFrom`, `chordModeSel`, `chordModeVer`, `seventh`, `fxChains`, `exprDisp`, `chFitDeg`, `exprBrightDisp`, `looperMsg`, `looperClear`, `latchDeg`, `latchOct`, `chordFam`, `latchTy`, `phoneInstr`, `handFn`, `handActs`, `rectPref`, `pinchFingers`, `camFacing`, `videoRec`, `splitOn`, `SPLIT_ROLES`, `octReg`, `bassOctReg`, `chordOctReg`, `tonicCents`, `viewRect`, `rollOpen`, `rollBeat0`, `rollSpan`, `rollSel`, `arrOpen`, `arrFace`, `rollSelNote`, `rollSelMany`, `rollPick`, `rollDrag`, `rollRole`, `laneRow0`, `laneDrag`, `rollRowsAll`, `rollAut`, `rollBendSel`, `secSel`, `rollVolBars`, `volFloor`, `nightView`
- → ./config.js (1): `FX_VOL`

## core/storens.js
CORE-11: THE PAGE'S STORAGE NAMESPACE.
- const (3): `STORE_NS`, `nsKey`, `nsDb`

## core/timbreload.js
TIM3a (RUN 4) — THE TIMBRE RECORDS, loaded ONCE when the module starts (top-level await, the scales.js pattern) from the generated bundle data/timbres.bundle.json (tools/timbre-bundle.mjs; the sour…
- const (5): `TIMBRE_RECORDS`, `timbreAll`, `timbreCheckDbg`, `timbreKnownId`, `timbreLoadReport`
- fn (1): `timbreAddSession`

## core/transport/clock.js
REC4 (stage 3) — THE TRANSPORT CLOCK: the transport state `loop` (tempo, metre, t0, playhead, the brace `rgn`), the song length, the brace math (songAt, rgnReps, braceClamp, rgnApply …), the metre …
- const (16): `clockWire`, `secPerBeat`, `beatNow`, `timeAt`, `secOf`, `beatsOf`, `songLenGrow`, `loop`, `songBeats`, `rgnLen`, `cycling`, `rgnReps`, `songAt`, `regionOn`, `METRES`, `SUBS`
- fn (15): `songLenRecalc`, `rgnApply`, `rgnSync`, `braceProbe`, `setRegionOn`, `braceTap`, `braceMove`, `braceSet`, `beatLevel`, `loopPos`, `setLoopBars`, `setLoopMetre`, `setLoopQuant`, `setLoopSub`, `setLoopBpm`
- let (1): `songLen`

## core/transport/scheduler.js
REC4 (stage 3) — THE SCHEDULER: replay cursors over the sorted prefix, the look-ahead window (scheduleLayers), releases at seams, the chase, «almost now» firing of solo and drone (fireNear), the me…
- const (2): `schedWire`, `chaseReset`
- fn (7): `clearPump`, `releaseLoopLayersAt`, `chaseFor`, `chaseNote`, `chasePlay`, `startTransport`, `seekTo`

## core/userstore.js
═══ ⛳ ХРАНИЛИЩЕ ФАЙЛОВ ПОЛЬЗОВАТЕЛЯ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, — записи формы v1 (те же, что в data/),…
- fn (3): `userAll`, `userPut`, `userDel`
- let (1): `backend`

## core/va-stub.js
Vercel Web Analytics queue stub — a classic script, not a module: calls made before the counter's script loads are queued.
- exports: none

## core/vision.js
(no head comment)
- const (12): `video`, `canvas`, `ctx`, `camLabel`, `modelInfo`, `visionOpts`, `VISION_DEF`, `lowInfo`, `pathInfo`, `pumpStats`, `camStats`, `setCameraPick`
- fn (25): `initVision`, `initDetector`, `startCamera`, `switchCamera`, `setHandsSink`, `pollFrame`, `camInfo`, `setHandsTracked`, `setModelDelegate`, `setCamFps`, `setDetectPath`, `setLowLight`, `pumpDbg`, `pumpStepDbg`, `detRunDbg`, `lowDbg`, `camSimDbg`, `camOpenDbg`, `camStatsDbg`, `cameraSwitch`, `cameraList`, `cameraPickInfo`, `cameraWatch`, `cameraWatchRetry`, `cameraWatchDbg`

## tools/probes/core/calpanel.js
CORE-1 CP4: a development panel for the calibration, no app UI and no console needed: run it, set the sliders, measure the wrist.
- fn (1): `mountCalPanel`

## tools/probes/core/data.js
PROBE1: the data rows — run by P.all in the browser AND by tools/probe-data.mjs in node (flag node).
- exports: none

## tools/probes/core/detect.js
LAT2 — hand detection: each camera frame once, the search schedule, the worker path.
- fn (3): `checkFrameOnce`, `checkSchedule`, `checkWorker`

## tools/probes/core/eng2.js
ENG2 (RUN 4): row «ENG2 engine readouts» (quick and all; reads only, ≈ 3 s).
- const (1): `engFeatures`
- fn (1): `checkEngReadouts`

## tools/probes/core/engine.js
AUD1a (RUN 3, 2026-10-16; docs/core/AUD1-design.md option C, review R1): THE ENGINE CONTEXT `E` and THE NODE CENSUS.
- fn (3): `checkEngineCtx`, `dumpCensus`, `checkCensus`

## tools/probes/core/files.js
PROBE1: Tunings-as-files probes: the F0 snapshot, naming, snapshot renewal, user files, Just intonation merge, bare modes, root alone.
- const (1): `SNAPSHOT_CHANGES`
- fn (9): `dumpScales`, `checkFiles`, `checkNames`, `renewSnapshot`, `checkUserDelete`, `checkUserChordModes`, `checkMerge`, `checkBare`, `checkRootAlone`

## tools/probes/core/fxcontract.js
AUD2b (RUN 3, 2026-10-16; docs/core/AUD1-design.md §7): GENERATED CONTRACT ROWS — one per effect of audio.FX_FACTORY (its keys, its order), each effect built ALONE by its own factory (`make(E)`) on…
- fn (1): `checkFx`

## tools/probes/core/gold.js
GOLD1: GOLDEN RENDERS — every built-in timbre (23 solo, 16 chord, 7 bass, 5 kits × 6 rows), the drone and the six effects at three settings, each rendered alone through the engine copy (render.gold…
- fn (4): `goldFeats`, `goldCmp`, `dumpGold`, `checkGold`

## tools/probes/core/guard.js
PROBE1: The console guard: window.P = api() — one probe at a time; its self-test runs inside row «write path (funnels)».
- const (1): `guardWire`
- fn (2): `api`, `guardSelfTest`

## tools/probes/core/hand.js
HAND1: SYNTHETIC HANDS → GESTURE FINGERPRINT.
- const (1): `GESTURE_ENV`
- fn (5): `dumpGesture`, `checkGesture`, `gestureEnvKeep`, `gestureEnvSet`, `gestureFxKeep`

## tools/probes/core/handcal.js
CORE-1 CP3: the live calibration service through the REAL processHands on the probe clock.
- fn (1): `checkHandCal`

## tools/probes/core/handprint.js
CORE-1 CP4: a performance that MOVES DEPTH, printed per app.
- fn (3): `dumpHandPrint`, `checkHandPrint`, `checkHandMap`

## tools/probes/core/handstats-calc.js
CORE-1 CP1: the sums of the guided measuring page (handstats.html).
- const (2): `WIN_MS`, `median`
- fn (8): `quant`, `robustSigma`, `handOf`, `emaSeries`, `tauSeries`, `windows`, `analyse`, `report`

## tools/probes/core/handstats.js
CORE-1 CP1: the guided hand measuring page.
- exports: none

## tools/probes/core/kit.js
PROBE1: Shared probe helpers: frames with a fallback timer, measures, the quick flag, the short render window, window keep/restore.
- const (7): `measReset`, `meas`, `frame`, `waitMs`, `PROBE_SHORT`, `setQuick`, `winKeep`
- fn (1): `winRestore`
- let (3): `MEAS`, `frameStalls`, `QUICK`

## tools/probes/core/lat.js
PROBE1: LAT1 latency meter probe.
- fn (5): `checkLatency`, `checkLatSwitches`, `checkLowLight`, `checkCamRestore`, `checkCamStart`

## tools/probes/core/pack.js
PACK1 (RUN 3, 2026-10-16): packs and offline licence keys IN THE PAGE (Chrome's WebCrypto — the node row «PACK1 packs and licence keys (core)» checks the same code in node): the committed TEST keys…
- fn (1): `checkPack`

## tools/probes/core/pool.js
POOL1 (RUN 4, ENG2 review E2): the chord pool grows on demand.
- fn (1): `checkPool`

## tools/probes/core/probedata.js
⛳ ПРОБЫ ДАННЫХ — ЧАСТЬ ПРОБЫ, КОТОРОЙ НЕ НУЖНЫ НИ БРАУЗЕР, НИ КАМЕРА, НИ ЗВУК (слайс «быстрые пробы»).
- const (21): `keyless`, `isUserId`, `SCALES`, `TUNINGS`, `CHORD_FAM_SETS`, `userCount`, `tagOf`, `isTert`, `legacyChordNotesStr`, `preF3RegWord`, `preF3RegWordFull`, `preF3RootName`, `preF3ChordNotesStr`, `preF3NoteLbl`, `PRE_T7_SETS`, `preT7ChordUnit`, `A4_SET`, `PRINT_MAX`, `OLD`, `allViews`, `KEEP_MAX`
- fn (25): `check`, `checkData`, `checkPitch`, `checkView`, `drone`, `checkUntyped`, `checkStack`, `checkBehaviour`, `checkDegrees`, `checkModeMap`, `legacyChordLabel`, `legacyChordNotesRef`, `preF3StepName`, `preF3RowLabel`, `preF3ChordLabel`, `preF3AxisLbl`, `preF4Status`, `preT7ChordNotesAt`, `preT7ChordNotes`, `legacyLeadFreq`, `legacyBassFreq`, `legacyChordNotes`, `sweep`, `canon`, `snapViews`

## tools/probes/core/profile.js
C0 (RUN 6): row «C0 profile round trip» (quick and all; no sound, no capture).
- fn (1): `checkProfile`

## tools/probes/core/rows.js
PROBE1: the ROW REGISTRY — every probe row registers itself next to its probe; P.all / P.quick (probes/run.js) and the node data runner (tools/probe-data.mjs, rows flagged node) list them from here.
- fn (5): `row`, `family`, `rows`, `rowProblems`, `rowCheck`

## tools/probes/core/run.js
PROBE1: P.all / P.quick / P.orderCheck — runs every registered row (probes/rows.js) in order, with the state guard between rows.
- const (1): `runWire`
- fn (6): `material`, `songPrint`, `all`, `quick`, `night`, `orderCheck`

## tools/probes/core/sound.js
SND-F1: probes of the Night prototype's sounds — the Firefly timbre, the Night forest room, our dynamics (Glue, safety Limiter).
- fn (7): `checkFirefly`, `checkForest`, `checkDynamics`, `checkMasterPath`, `checkDynLive`, `checkFreezeParity`, `checkTimbreIds`

## tools/probes/core/timbres.js
TIM3 (RUN 4): timbres as data — the proof that nothing changes.
- const (1): `PRINT_RATE`
- fn (5): `timbreSnapshotAll`, `dumpTimbres`, `checkTimbresBefore`, `checkTimbreRecords`, `checkFullUntouched`

## tools/probes/core/userfiles.js
═══ ⛳ ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ — КОНСОЛЬ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, ставятся и снимаются из консоли (интерфе…
- fn (10): `install`, `list`, `remove`, `exportFile`, `storeUnchecked`, `example`, `brokenExample`, `chordModesExample`, `installChordModesExample`, `installExample`

## tools/probes/core/vis.js
VIS1a (RUN 6, docs/core/VIS1-design.md §7): row «VIS1a stack and bus» (quick and all; no sound).
- fn (1): `checkVisStack`

## tools/probes/full.js
⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
- fn (1): `install`
- → ./core/detect.js (3): `checkFrameOnce`, `checkSchedule`, `checkWorker`
- → ./core/eng2.js (1): `checkEngReadouts`
- → ./core/engine.js (3): `checkEngineCtx`, `checkCensus`, `dumpCensus`
- → ./core/files.js (10): `dumpScales`, `checkFiles`, `checkNames`, `SNAPSHOT_CHANGES`, `renewSnapshot`, `checkUserDelete`, `checkUserChordModes`, `checkMerge`, `checkBare`, `checkRootAlone`
- → ./core/fxcontract.js (1): `checkFx`
- → ./core/gold.js (2): `dumpGold`, `checkGold`
- → ./core/guard.js (1): `api`
- → ./core/hand.js (2): `dumpGesture`, `checkGesture`
- → ./core/handcal.js (1): `checkHandCal`
- → ./core/handprint.js (3): `dumpHandPrint`, `checkHandPrint`, `checkHandMap`
- → ./core/lat.js (5): `checkLatency`, `checkLatSwitches`, `checkLowLight`, `checkCamRestore`, `checkCamStart`
- → ./core/pack.js (1): `checkPack`
- → ./core/pool.js (1): `checkPool`
- → ./core/probedata.js (10): `check`, `checkData`, `checkPitch`, `checkView`, `drone`, `checkUntyped`, `checkStack`, `checkBehaviour`, `checkDegreesData`, `checkModeMap`
- → ./core/profile.js (1): `checkProfile`
- → ./core/run.js (4): `material`, `all`, `quick`, `orderCheck`
- → ./core/sound.js (7): `checkTimbreIds`, `checkFirefly`, `checkForest`, `checkDynamics`, `checkDynLive`, `checkFreezeParity`, `checkMasterPath`
- → ./core/timbres.js (3): `checkTimbresBefore`, `dumpTimbres`, `checkTimbreRecords`
- → ./core/vis.js (1): `checkVisStack`
- → ./full/autosave.js (1): `checkAutosave`
- → ./full/cmd.js (3): `checkValueTripwire`, `checkCommands`, `checkJournal`
- → ./full/edit.js (9): `checkSoloEdit`, `checkSelect`, `checkPaste`, `checkQuant`, `checkDegrees`, `checkBend`, `checkBendCurve`, `checkTrackMode`, `checkVolBars`
- → ./full/freeze.js (9): `checkRepeat`, `checkQueue`, `checkFreezeQueue`, `checkAutoFreeze`, `checkLiveIsolation`, `freezeCost`, `checkRevAgree`, `checkChunks`, `checkSwap`
- → ./full/history.js (3): `checkUndoClear`, `checkHistory`, `checkSections`
- → ./full/ids.js (1): `checkEventIds`
- → ./full/key.js (5): `dumpSongPrint`, `checkSongPrint`, `checkKeyKeep`, `checkOneOne`, `checkTranspose`
- → ./full/seed.js (5): `checkWrite`, `checkSeed`, `checkFrozen`, `seed`, `song`
- → ./full/song1.js (1): `checkSongRecords`
- → ./full/song2.js (2): `checkSongFile2`, `dumpSong`
- → ./full/songfile.js (2): `checkSongFile`, `checkSongOpenUndo`
- → ./full/tim3d.js (1): `checkOwnTimbres`
- → ./full/tuning.js (13): `checkSound`, `checkRows`, `checkRowFix`, `checkHl`, `tracks`, `checkRules`, `checkScroll`, `checkLabels`, `checkSong`, `checkTypes`, `checkModes`, `checkPure`, `checkOut`
- → ./full/window.js (5): `checkMixer`, `checkPan`, `checkArrange`, `checkTrackLook`, `checkTracks`

## tools/probes/full/autosave.js
AUTOSAVE1 (RUN 3, 2026-10-16): the song kept on this device by itself — through the real scheduler (autosave.asTick on the probe's clock, written at once instead of in an idle moment), the real but…
- fn (1): `checkAutosave`

## tools/probes/full/cmd.js
CMD1 (RUN 5): the history's tripwire compares VALUES (CMD1a), tracks keep their ids through the song file (CMD1b, v7), every history step is a command serialised by ids and parsed back (CMD1c), app…
- fn (3): `checkValueTripwire`, `checkCommands`, `checkJournal`

## tools/probes/full/edit.js
PROBE1: Track-editor probes: solo editing, several notes, paste, quantise, degrees, bend curve and shapes, track into another mode, volume bars.
- fn (10): `checkSoloEdit`, `checkSelect`, `checkPaste`, `edKit`, `checkQuant`, `checkDegrees`, `checkBend`, `checkBendCurve`, `checkTrackMode`, `checkVolBars`

## tools/probes/full/freeze.js
PROBE1: Render and freeze probes: repeatability, the render queue, AF1, AF3, AF5, LR1, AF6b, AF2, freeze cost.
- fn (9): `checkRepeat`, `checkQueue`, `checkFreezeQueue`, `checkAutoFreeze`, `checkLiveIsolation`, `freezeCost`, `checkRevAgree`, `checkChunks`, `checkSwap`

## tools/probes/full/history.js
PROBE1: Song-edit probes: sections (ED6), the one history (ED7), undo after clear (ED7-fix2).
- fn (3): `checkUndoClear`, `checkHistory`, `checkSections`

## tools/probes/full/ids.js
IDS1 (RUN 3, 2026-10-16): every event of the song has a PERMANENT id (song/store.js evIdFill; rule #37) — unique, a positive integer, kept by edits that keep the object, by ↶ / ↷ (the same objects …
- fn (1): `checkEventIds`

## tools/probes/full/key.js
PROBE1: Tonic-freeze probes: the song sound fingerprint (TF0), keys kept (TF2), transpose (TF3), the 1/1 anchor (TF5).
- const (1): `liveEnv`
- fn (5): `dumpSongPrint`, `checkSongPrint`, `checkKeyKeep`, `checkOneOne`, `checkTranspose`

## tools/probes/full/seed.js
PROBE1: The test song (P.seed), the demo song (P.song), and the rows that check what they wrote (write path, seed notes, frozen seed bass).
- const (2): `SEED_FROZEN_EXPECT`, `seedFrozenSamples`
- fn (5): `checkWrite`, `checkSeed`, `checkFrozen`, `seed`, `song`
- let (1): `SEED_REC`

## tools/probes/full/song1.js
SONG1 (RUN 3, 2026-10-16): a song carries copies of the person's own tunings / modes it uses (rule #37) — so it opens on any device.
- fn (1): `checkSongRecords`

## tools/probes/full/song2.js
SONG2 (RUN 3, 2026-10-16): the demo song is a FILE (data/songs/triphop.json) and P.song opens it; the code generator stays a probe tool.
- fn (2): `dumpSong`, `checkSongFile2`

## tools/probes/full/songfile.js
SAVE1 (DAY run 2026-10-16): Save → Open of a song file, through the real ui doors (ui.songSaveText / ui.songOpenText — the same code the buttons run, minus the browser's download and file picker).
- fn (2): `checkSongFile`, `checkSongOpenUndo`

## tools/probes/full/tim3d.js
TIM3d (RUN 4): row «TIM3d own timbres and song copies» (quick and all).
- fn (1): `checkOwnTimbres`

## tools/probes/full/tuning.js
PROBE1: Tuning and editor-row probes: pitch from the tuning index, editor rows, highlights, chord rules and labels, out-of-mode pitches, song integrity, chord types and modes.
- fn (13): `checkSound`, `checkRows`, `checkRowFix`, `checkHl`, `tracks`, `checkRules`, `checkScroll`, `checkLabels`, `checkSong`, `checkTypes`, `checkModes`, `checkPure`, `checkOut`

## tools/probes/full/window.js
PROBE1: Arrangement-window and mixer probes: every track reachable, AR1, MX1, MX2, AR2.
- fn (5): `checkMixer`, `checkPan`, `checkArrange`, `checkTrackLook`, `checkTracks`

## tools/probes/night.js
SPLIT-2: the probe entry of the Night page: its own rows and the core rows flagged for both pages.
- const (2): `night`, `api`
- fn (1): `install`
- → ./core/engine.js (3): `checkEngineCtx`, `checkCensus`, `dumpCensus`
- → ./core/gold.js (2): `dumpGold`, `checkGold`
- → ./core/hand.js (2): `dumpGesture`, `checkGesture`
- → ./core/handcal.js (1): `checkHandCal`
- → ./core/handprint.js (3): `dumpHandPrint`, `checkHandPrint`, `checkHandMap`
- → ./core/profile.js (1): `checkProfile`
- → ./core/run.js (1): `material`
- → ./core/timbres.js (2): `checkTimbresBefore`, `dumpTimbres`
- → ./core/vis.js (1): `checkVisStack`
- → ./night/bed.js (1): `checkNightBed`
- → ./night/calib.js (1): `checkNightCalib`
- → ./night/cards.js (1): `checkNightCards`
- → ./night/forest.js (2): `checkForestRoom`, `checkBackgrounds`
- → ./night/lean.js (2): `checkNightLean`, `checkQuietFloor`
- → ./night/life.js (2): `checkNightLife`, `checkNightContextLost`
- → ./night/night.js (1): `checkSoloFirefly`
- → ./night/nightguard.js (2): `checkNightUntouched`, `dumpNight`
- → ./night/nightmigrate.js (1): `checkNightMigrate`
- → ./night/nightprofile.js (1): `checkNightProfile`
- → ./night/pixels.js (2): `checkNightPixels`, `checkNightDetailedGuard`
- → ./night/roomswitch.js (1): `checkNightRoomSwitch`
- → ./night/scales.js (1): `checkNightScales`
- → ./night/stream.js (1): `checkNightStream`
- → ./night/testroom.js (3): `testRoomInstall`, `testRoomRemove`, `testRoomMode`

## tools/probes/night/bed.js
NIGHT-3 stage 4: row «NIGHT music bed» (P.night).
- fn (1): `checkNightBed`

## tools/probes/night/bedsw.js
NIGHT-4: the music bed's A/B switch, dev only.
- fn (1): `mountBedSwitch`

## tools/probes/night/calib.js
NIGHT-2 stage 2: row «NIGHT calibration screens» (quick; the probe clock through the REAL processHands, an injected store and camera: no real key is touched).
- fn (1): `checkNightCalib`

## tools/probes/night/cards.js
NIGHT-7: row «NIGHT first cards» — the four first cards: they open, each has its title, text and drawn picture in both languages (no left-over {name}); Next walks them and the last closes them, cal…
- fn (1): `checkNightCards`

## tools/probes/night/forest.js
VIS1c (RUN 6, Night plan §10, review 2026-10-17): two rows (quick and all).
- fn (19): `checkForestRoom`, `checkBackgrounds`, `checkForestPicture`, `checkNightCycle`, `checkForestResponse`, `checkForestDetail`, `checkForestRare`, `checkForestLevels`, `checkForestAnswers`, `checkForestMelody`, `checkForestFloor`, `checkForestStream`, `checkForestWood`, `checkForestFlies`, `checkForestGust`, `checkForestCanopy`, `checkForestPaint`, `checkForestHidden`, `checkForestGroundWater`

## tools/probes/night/headroom-calc.js
NIGHT-1: the headroom page's sums, pure (runs in node: tools/probe-data.mjs, row «NIGHT-1 headroom sums»).
- const (10): `FORMAT`, `round`, `quantumUs`, `usPerQuantum`, `loadPct`, `minOf`, `median`, `dB`, `amp`, `worst`
- fn (9): `nextBallast`, `freeRange`, `tailTimes`, `envelope`, `residualDb`, `partials`, `partialSeconds`, `prerender`, `report`

## tools/probes/night/headroom-worklet.js
NIGHT-1: the measuring page's processors, dev only.
- exports: none

## tools/probes/night/headroom.js
NIGHT-1 stage 1: Night's sound headroom, dev only.
- const (7): `stopCamera`, `openCamera`, `setBase`, `CONDS`, `PLAN`, `snapshot`, `reportOf`
- fn (16): `sharedParts`, `bedCost`, `noteCost`, `passages`, `tails`, `tailProfile`, `whatIfs`, `lab`, `prerender`, `buffers`, `calibrate`, `plainPasses`, `realtime`, `phoneOffline`, `deepOffline`, `mountHeadroom`

## tools/probes/night/lean.js
NIGHT-1 stage 2: row «NIGHT lean path» (P.night; slow: offline renders).
- fn (2): `checkNightLean`, `checkQuietFloor`

## tools/probes/night/life.js
NIGHT-11 part 1 — rows «NIGHT phone lifecycle» and «NIGHT context lost» (the audit's W1, W2, W3, W6), on the running app.
- fn (2): `checkNightLife`, `checkNightContextLost`

## tools/probes/night/night.js
C4a (RUN 6, Night plan §4.1, §10): row «C4a solo Firefly» (quick and all; three short offline renders through the engine copy).
- const (2): `NIGHT_TIMBRES`, `NIGHT_SET`
- fn (15): `checkSoloFirefly`, `kLoud`, `clickOf`, `checkNightTimbres`, `checkNightShell`, `checkNightDepth`, `checkNightAmbience`, `checkNightSet`, `checkNightFx`, `checkNightFxTimbres`, `checkNightStress`, `checkNightDepthLoud`, `checkNightBars`, `checkNightLowPower`, `checkNightVolume`

## tools/probes/night/nightguard.js
SPLIT-2: row «NIGHT untouched» — the mirror of «FULL untouched»: a change elsewhere must not move this app.
- fn (2): `dumpNight`, `checkNightUntouched`

## tools/probes/night/nightmigrate.js
SPLIT-2: row «NIGHT migrate»: old setting names move to the new ones, are removed, a new value wins over an old one, a second run changes nothing.
- fn (1): `checkNightMigrate`

## tools/probes/night/nightprofile.js
SPLIT-2: row «NIGHT profile round trip» on Night's page: the checks of C0 that need Night's record, its shell and its CSS (they ran on the one page before the split, word for word).
- fn (1): `checkNightProfile`

## tools/probes/night/pixels.js
NIGHT-11 part 5 — rows «NIGHT pixel budget» and «NIGHT Detailed guard», on the running app with the forest open.
- fn (2): `checkNightPixels`, `checkNightDetailedGuard`

## tools/probes/night/roomswitch.js
NIGHT-3 stage 5 part 2: row «NIGHT room switch» (P.night, drawn) — the switching machinery, on the test room (./testroom.js), judged on EXACT controls (the user, 2026-11-09): (1) hand detection tak…
- fn (1): `checkNightRoomSwitch`

## tools/probes/night/scales.js
CORE-20 — row «NIGHT scales (only its own)»: the page loaded by itself exactly the modes Night names — the profile's moods and every room's moods — (read when this module first ran, before the prob…
- const (2): `SCALES_AT_LOAD`, `nightScalesRest`
- fn (1): `checkNightScales`

## tools/probes/night/stream.js
NIGHT-8: row «NIGHT stream, water and ground» — (1) BUILT without a renderer, at each level: today's seven aisle rocks are instances of the stream's stones (no rock mesh of their own), every stone …
- fn (1): `checkNightStream`

## tools/probes/night/tailsw.js
NIGHT-1 stage 3: the dev switch for the quiet floor.
- fn (1): `mountTailSwitch`

## tools/probes/night/testroom.js
NIGHT-3 stage 5 part 2: THE TEST ROOM — a development room players never see, registered only by the row «NIGHT room switch» or by the page address ?probe&testroom (then the Room button shows: two …
- const (5): `TEST_ROOM_ID`, `TEST_ROOM`, `testRoomMode`, `testRoomInfo`, `testRoomFreeLeaks`
- fn (2): `testRoomInstall`, `testRoomRemove`

_257 modules, 2734 exported names._

# Removed (stale) code names — kept by hand; copied into the generated docs/NAME-INDEX.md by tools/name-index.mjs

## Stale names
- Stale names to ignore (removed): `backing.js`, `playRec`, `toggleRec`, `stopRec`, `recStart`, `drawChordSectors`, `sectHyst`, `S.sect`,
  `TYPED_CH_VOL`, `uiMode`, `drawPC`, `drawBar`, `zoneAt`, `zoneX`, `FXW`/`ZB`, `modeBtn`, `applyMode`, `.phone`, `#modeHint`, `#arrHint`,
  `#helpBtn`, `swapHands`, global `theremin`, `thereminBtn`, `swapBtn`, `drawThereminGrid`, `BEATS_PER_BAR` as a constant, `handRole`,
  `jamStep`/`applyJam`/`jamTo`, `jam.*` keys, `loop.first`, `setRegion`, `takeEv`, `revDisp`, `chBrightDisp`, `drawChordBright`,
  `verb`/`verbOut`/`revLead`/`revCh`, `leadOwner`, `fxAttach`/`fxRoleBus`/`fxRoleOut`, `roleXDriven`, `bassOwner`, `soloNoteHand`,
  per-voice `dlySend`/`revSend`, `RELEASE_TAILS` as a rule, `vision.setPicture`, `VISION_DEF.picture`, `swPicMatched`/`swPicLive`,
  `diag.sw.pic*` keys, latmeter report `detection.picture` (LAT3: the live-camera picture switch removed), `scaledata.js`, `R.liveReverb`, `DBG.fdnLive`, `R.powerOld`, `RECT_OCT`, `ROLL_CH_EXTRA_REG`, `SWARA_OF`/`SHRUTI_OF`, `swaraLbl`/`swaraOfCents`, `gridNoteLbl`/`rectNoteLbl` pair as two functions, `rollGroups`, `#rollScale`, `rollSnapRow`, `soloEditBlock`, `tiAudit`/`tiRestamp`, `fxVolFix`/`setFxVolFix`, `chainXDriven`, `frzArmAll`, `setChBrightDisp`, `setRevDisp`, `setLiveRevWiring`, `modeDerive`/`TBL`/`RATIOS`/`CM`, `scaleIdx`, `sameDegrees`, `compat.tag`, `R.liveReverb`, the ScriptProcessor capture.

SPLIT-2 (2026-11; table: `tools/split-names.mjs`). The product's old name: `CALM_*`, `calm*`, `.calm-*`, `--calm-*`, `calm.*` keys, `calm-*` screens, rows `CALM x`, `P.calm`, runner `--calm` → the same with night; `calmNight` → `nightSky`; `--cv-calm-*` → `--cv-hn-*`; `calmshell.js` → `apps/night/shell.js`; `modules/effects/calm.js` → `night-fx.js`; `core/calmui.js` → `core/pure/nightui.js`; `profile.calm` → `profile.night` (the one exception of rule #37); `?calm` → the page `apps/night/`; EDITION value `calm` → `release`. The Full ↔ Night switch: `#profRow`, `#calmToFull`, `profFull`, `profCalm`, `profSep`, `profHint`, `profileBoot`. Folders: `src/` → `core/`, `src/core/` → `core/pure/`, `src/views/` → `core/legacy-ui/views/`, `data/` → `core/data/`, `src/probes/` → `tools/probes/`, `src/scaleprobe.js` → `tools/probes/full.js`, `src/main.js` → `core/legacy-ui/boot.js` + `apps/*/main.js`. Files: root `BACKLOG.md`, `WORK-LOG.md`, `NIGHT-LOG.md`, `UI-MAP.md` → `docs/<track>/` and `archive/`.

CORE-7 (2026-11-03): `core/modules/ambience/forest.js` → `apps/night/sound/ambience.js`, `core/pure/ambience.js` → `apps/night/pure/ambience.js` (the ambience is Night's, registered through `core/soundmods.js`); data row «NIGHT cricket schedule (core)» → «… (app)».

CORE-8 / NIGHT-3 stage 3 (2026-11-03; mover step `N3` in `tools/split-move.mjs`): `core/legacy-ui/views/scene/host.js` → `apps/night/scene/host.js`; `apps/night/scene/forest{,-life,-detail,-rare}.js` → `apps/night/rooms/forest/`; `apps/night/pure/{forestlife,fireflies}.js` → `apps/night/rooms/forest/pure/`. `draw.js` no longer re-exports `setBackground`, `backgroundOf`, `sceneInfo`, `BACKGROUNDS`, `setSceneLevel`, `sceneLevel`.

NIGHT-3 stage 3 (2026-11-03): `apps/night/pure/cycle.js` `MOOD_LOOKS`, `MOOD_OF`, `moodLook` → the room record's `looks` / `moods` + `apps/night/pure/room.js` `roomLook`; `apps/night/pure/ambience.js` `AMB` → the room record's `nature` (`cricketStream(C, seed, k)`, `chirpShape(C, t, pulses, amp)`, `windNoise(rate, seed, sec)` take the recipe); `--cv-forest-*` tokens moved from `core/tokens.css` to `apps/night/night.css`; body class `bg-forest` → `bg-room`; `sceneRoomAdd(id, { build, three })` → `sceneRoomAdd(id, { load, standIn, three })`; the profile's `scene` «forest» → «room.forest».

NIGHT-7b (2026-11-11): `apps/night/ghost.js` deleted (`GHOST`, `ghostArm`, `ghostStop`, `ghostOn`, `ghostAt`, `ghostFrame`; Night's `frameFilter`); row «NIGHT ghost light» removed; `#nightFirstRun`, key `night.firstRun`; keys `night.stepPhones`, `night.stepCamera`; storage `handsong.nightSeen` (no longer read; the cards' own key is `handsong.nightCards`); body class `night-seen`; ui-snap screen `night-ghost` → `night-cards`. Moved from `core/i18n.js` to `apps/night/texts.js` (reworded): `night.phones`, `night.cal.offerB`, `night.cal.doneB`.

NIGHT-7c (2026-11-11): storage `handsong.nightMusic` and `handsong.nightMusicVol` no longer read (now `handsong.nightMusicMode`, `handsong.nightMusicLevel`); the cards' version `1` → `2`; the forest icon on the Depth bar and the Lightweight switch → `depth`, `lightweight`.

NIGHT-8b (2026-11-11): `apps/night/fullscreen.js` `fsFlowTap` and `fsFlowEnd` deleted (the page's own tap listener asks for full screen once the camera runs; the flow needs no end); the full-screen icon paths moved to `apps/night/pure/fsicons.js` (`FS_ENTER`, `FS_EXIT`); the bark's program key `handsong.bark7` → `handsong.bark8`.
