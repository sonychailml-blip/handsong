# NAME INDEX — code names by module (GENERATED — do not edit by hand)

_Generated from `src/` by `node tools/name-index.mjs --write`; checked by the data runner (row «NAME-INDEX current»). Consult by grep.
Kinds: fn, const, let, class, «→ ./x.js» a re-export. Meaning of a name: the code and `archive/CLAUDE-history.md`. The hand-written index
before this tool: `archive/NAME-INDEX-before-RUN5.md`. Removed names: the end of this file (kept by hand in `docs/STALE-NAMES.md`)._

## src/arrange.js
Размер такта (metre) приходит через ctx.metre из loop.metre — модуль остаётся чистым (без импорта состояния).
- const (8): `PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `subOf`, `gridOk`, `rhythmFits`, `rhythmsForMetre`, `BASS_MODES`
- fn (1): `buildArrangement`

## src/audio.js
(no head comment)
- const (49): `bendTapSet`, `leadHold`, `chordHold`, `bassHold`, `droneHz`, `sympBase`, `LEAD_INSTR`, `CHORD_INSTR`, `BASS_INSTR`, `DRUM_NAMES`, `DRUM_ROWS`, `DRUM_KITS`, `hitOwner`, `masterLevel`, `renderStateOf`, `timbresOf`, `timbreIdOf`, `timbreById`, `timbreReg`, `timbreKey`, `timbreIdx`, `timbreSnapshot`, `timbreRecord`, `timbreForgetDbg`, `FX_FACTORY`, `fxPerm`, `fxHandRange`, `fxIsPerNote`, `fxNoteField`, `fxNoteFollows`, `fxVoiceIdsFor`, `fxAddableIds`, `FX_AMT`, `fxBriOf`, `FX_GLIDE_KEY`, `fxDipLog`, `frzStoreDel`, `frzStoreDbg`, `poolDbg`, `poolSizes`, `setTrackRouteOf`, `routeOfOwner`, `LEAD_KS_FROM`, `leadIsKs`, `masterDyn`, `ffInfo`, `masterDelayMs`, `masterProbeNodes`, `engineCtx`
- fn (81): `initAudio`, `setLeadInstr`, `applyFx`, `applyExpr`, `scheduleBend`, `leadCancel`, `metroClick`, `leadOn`, `leadSet`, `leadOff`, `leadAllOff`, `chordOn`, `chordGlide`, `chordOff`, `setBassInstr`, `bassOn`, `bassSet`, `bassOff`, `drumHit`, `setDrumKit`, `droneOn`, `droneOff`, `droneRetune`, `droneUse`, `createRecordingTap`, `setTrackGainOf`, `ownerGain`, `trackGainRetune`, `setMasterLevel`, `masterMeter`, `setTrackPanOf`, `ownerPan`, `trackPanRetune`, `dronePan`, `renderReset`, `timbreInstall`, `fxInstance`, `fxSetActive`, `fxChainResplice`, `fxSnapshot`, `fxChordBri`, `fxCaptureChain`, `fxCaptureWalk`, `fxPlaySet`, `fxPlayPath`, `fxParamKeysOf`, `fxRestoreAim`, `fxParamMetaOf`, `fxDefaultsOf`, `fxAimSet`, `fxAimGet`, `makeFrozenBus`, `fxRenderPath`, `fxGateAt`, `setDbg`, `dbgExprBypass`, `fxGlideOf`, `probeCapture`, `probeCaptureReady`, `xfRamp`, `voicesCut`, `frzStorePut`, `frzReader`, `frzStoreCount`, `fxDenormOf`, `offlineTapMaster`, `engVoices`, `engLevels`, `engLoad`, `setOffline`, `setRnd`, `chainStateOf`, `masterDynSet`, `offlineMasterDyn`, `forestData`, `noteOn`, `noteSet`, `noteOff`, `bend`, `hit`, `drone`
- let (4): `AC`, `frzReady`, `ksReady`, `dynReady`
- → ./modules/timbres/stages.js (1): `panGains`

## src/autosave.js
AUTOSAVE1 (RUN 3, 2026-10-16) — THE CURRENT SONG KEPT ON THIS DEVICE BY ITSELF.
- const (7): `AS`, `AS_KEEP`, `asWire`, `asInfo`, `asEnabled`, `asPause`, `asDbgState`
- fn (12): `asPut`, `asStart`, `asTick`, `asWrite`, `asAdopt`, `asFresh`, `asFlush`, `asList`, `asGet`, `asSetEnabled`, `asDbg`, `asDrop`

## src/clip.js
================= ЗАПИСЬ КЛИПА / АУДИО ================= ОДИН движок на два вида записи (не два модуля): • 'video' — кадр ХОЛСТА (canvas.captureStream) + звук → один файл С картинкой И звуком; • 'a…
- const (2): `activeKind`, `onClipChange`
- fn (3): `captureFrame`, `startClip`, `stopClip`

## src/config.js
================= КОНФИГ: зоны, метаданные, пороги =================
- const (55): `FINGER_TIPS`, `FX_META`, `CAM_MARGIN`, `remapAxis`, `coverView`, `PINCH_ON`, `PINCH_HOLD`, `PINCH_OFF`, `REV_NEAR`, `CLEAR_HOLD_MS`, `LOOPER_MSG_MS`, `ROW_HYST`, `WATCHDOG_MS`, `SCHED_AHEAD`, `SCHED_TICK_MS`, `FX_BAR_W`, `FX_BAR_GAP`, `FX_BAR_MAX`, `CH_PAL_W`, `CH_PAL_PAD`, `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `PAL_HYST_X`, `PAL_HYST_Y`, `palColX`, `palRowY`, `palSplitX`, `rectBandY`, `volAmp`, `volFromOld`, `volVel`, `BEATS_PER_BAR`, `REC_VOL_EPS`, `REC_REV_EPS`, `REC_FX_EPS`, `REC_FINE_EPS`, `REC_AVG_S`, `REC_JUMP_EPS`, `REC_HIST_S`, `REC_PAUSE_S`, `REC_KNEE_F`, `AUT_RAMP_BEAT`, `AUT_RAMP_EPS`, `BEND_EPS_CENTS`, `CURVE_A`, `curveU`, `curveK`, `bendSeg`, `BEND_GLIDE_STEP_S`, `CHORD_POOL_N`, `CHORD_POOL_FIRST`, `BASS_POOL_N`, `LEAD_POOL_N`, `LEAD_POOL_KS`, `FX_VOL`
- fn (3): `bendAt`, `bendSplit`, `bendPlan`

## src/core/bus.js
VIS1a (RUN 6, docs/VIS1-design.md §3) — THE EVENT BUS for visuals.
- const (2): `RING_N`, `BUS`
- fn (1): `createBus`

## src/core/camlight.js
LAT3 — low light.
- const (16): `LOW_MODES`, `LOW_TARGET`, `LOW_EXPOSURE_S`, `LOW_SETTLE_MS`, `exposureSupported`, `HEAL_MODES`, `AUTO_OF`, `DEV_KEYS`, `devSnap`, `healList`, `autoLeft`, `DARK_FPS`, `darkNew`, `LOST_MS`, `lostNew`, `TEST_REC_KEY`
- fn (11): `exposureUnits`, `lowConstraints`, `restoreAdvanced`, `restoreConstraints`, `lowVerdict`, `darkStep`, `lostStep`, `capsText`, `testRecNext`, `testRecRepair`, `camErrKind`

## src/core/canon.js
CMD1a (RUN 5) — CANONICAL JSON and its hash (pure core, rule #36; data row «CMD1 canonical values (core)»).
- const (1): `canonHash`
- fn (2): `canonJSON`, `fnv`

## src/core/dsp.js
SND-F1 — pure DSP formulas shared by the engine (audio.js), the dynamics worklet (dyn-worklet.js) and the probes.
- const (8): `FOREST`, `forestRoom`, `compGainDb`, `DYN_GLUE`, `DYN_LIMIT`, `DYN_MASTER`, `MASTER_MAKEUP_DB`, `dynCoef`
- fn (5): `seeded`, `forestIR`, `irNormScale`, `f32Hash`, `compCurveDb`

## src/core/engclass.js
ENG2 (RUN 4) — the engine's PROVISIONAL power class and the dropout rate.
- const (4): `ENG_CLASS_PROVISIONAL`, `ENG_THRESH`, `ENG_BENCH_KEY`, `benchText`
- fn (3): `engClass`, `benchOf`, `dropRate`

## src/core/fireflies.js
VIS1c (RUN 6, Calm plan §3.1) — the night forest's WILD FIREFLIES and its ground, as numbers.
- const (2): `FOREST_FLIES`, `FOREST_DEPTH`
- fn (4): `forestGround`, `fliesInit`, `fliesStep`, `depthDistance`

## src/core/format.js
FMT1 (stage 3) — THE FILE FORMAT CORE: the envelope every data file carries ({ format:'handsong/<kind>', version, id, … }), the current version of each kind, the migration steps (one pure function …
- class (1): `Bad`
- const (5): `F`, `FORMAT_VERSION`, `MIGRATIONS`, `kindOfFormat`, `CM_MAX`
- fn (7): `upgrade`, `checkManifest`, `checkMenu`, `checkTuning`, `checkPalette`, `checkChordModes`, `checkMode`

## src/core/handsched.js
LAT2a — the SEARCH SCHEDULE for hand detection.
- const (4): `HAND_SEARCH_EVERY`, `HAND_POLICIES`, `schedNew`, `schedRetry`
- fn (3): `schedPlan`, `schedAfter`, `schedRun`

## src/core/latency.js
LAT1 — latency bookkeeping.
- const (10): `LAT_N`, `BT_MS`, `BT_LABEL`, `frameWaitMs`, `withFrameWait`, `perMinute`, `STARTUP_MS`, `MP_LINE`, `SOFT_GL`, `isSoftwareGL`
- fn (6): `makeMeter`, `statsOf`, `handToSound`, `looksBluetooth`, `rateOf`, `splitLongTasks`

## src/core/pack.js
PACK1 (RUN 3, 2026-10-16; stage-3 plan slice 33; user decision: build it now, no UI) — PACKS AND OFFLINE LICENCE KEYS.
- const (5): `PACK_FORMAT`, `PACK_VERSION`, `KEY_PREFIX`, `KEY_FORMAT`, `PACK_PUBKEYS`
- fn (5): `packCheck`, `keySign`, `keyVerify`, `createPackGate`, `packUnlock`

## src/core/profile.js
C0 (RUN 6, Calm plan §2) — THE PROFILE RECORD and its validator.
- const (6): `PROFILE_FORMAT`, `PROFILE_IDS`, `PROFILE_ROLES`, `BACKGROUNDS`, `HAND_FNS`, `PROFILE_DAMAGES`
- fn (1): `checkProfile`

## src/core/registry.js
FMT1 (stage 3) — PERMANENT IDS AND A REGISTRY OF RECORDS (timbres, tunings, modes, effect presets, expression mappings … as they arrive).
- const (4): `USER_ID`, `BUILTIN_ID`, `PACK_ID`, `idSpace`
- fn (2): `newUserId`, `createRegistry`

## src/core/songfile.js
SAVE1 (DAY run 2026-10-16) — THE SONG FILE, pure part: reading a «.handsong» text safely, the version rules of the kind 'song' (FMT1: format.js takes SONG_VERSION and SONG_MIGRATIONS from here) and…
- const (5): `SONG_FORMAT`, `SONG_VERSION`, `SONG_MAX_BYTES`, `SONG_MIGRATIONS`, `TIM1_POSITIONS`
- fn (3): `songParse`, `songUpgrade`, `songCheck`

## src/core/timbre.js
TIM3a (RUN 4) — THE TIMBRE RECORD and its validator.
- const (10): `TIMBRE_FORMAT`, `TIMBRE_FAMILIES`, `WAVES`, `TB`, `KIT_SYNTHS`, `ENGINES`, `POLICY_KEYS`, `timbreNodes`, `BUNDLE_FORMAT`, `TIMBRE_DAMAGES`
- fn (1): `checkTimbre`

## src/demo.js
===================================================================== ДЕМО «ПУТЕШЕСТВИЕ ПО СТРОЯМ» (прототип, side-experiment) --------------------------------------------------------------------- …
- exports: none

## src/draw.js
DRAW1 (DAY run 2026-10-16): draw.js is the FACADE of the canvas — importers keep their import lines.
- → ./views/camera.js (2): `drawVideoBackground`, `syncViewRect`
- → ./views/common.js (2): `loopBarBottom`, `setEmptyTpOld`
- → ./views/play.js (1): `drawOverlays`
- → ./views/roll.js (21): `fxTitleOf`, `rollAutDrive`, `rollAutSnapV`, `rollAutValAt`, `rollAxisHasDim`, `rollAxisNow`, `rollBendAt`, `rollBendProbe`, `rollBoxHits`, `rollDefaultRow0For`, `rollDragTarget`, `rollGeom`, `rollHit`, `rollRow0Across`, `rollRowPitch`, `rollRowsProbe`, `rollSelectable`, `rollShiftPit`, `rollSnap`, `rollSnapBeat`, `rollTrackView`
- → ./views/scene/host.js (4): `setBackground`, `backgroundOf`, `sceneInfo`, `BACKGROUNDS`
- → ./views/stack.js (3): `stackFrame`, `stackSet`, `stackList`
- → ./views/strip.js (9): `arrGeom`, `laneCol`, `laneDefName`, `laneTitle`, `loopBeatAt`, `loopHit`, `loopScroll`, `loopViewProbe`, `stripProbe`

## src/edition.js
C0 (RUN 6, Calm plan §2, §9.2) — THE EDITION.
- const (1): `EDITION`

## src/engine/fdn.js
AUD2a (RUN 3, 2026-10-16) — THE FDN REVERB: allpass diffusers, four delay lines with damping and Householder mixing, decay (RT60) and tone — the JS reference the WASM reverb (W1) is tested against.
- const (2): `REV_A`, `RENDER_QUANTUM`
- fn (4): `apStage`, `buildFDN`, `setRevDecay`, `setRevTone`

## src/engine/surface.js
AUD1a (RUN 3, 2026-10-16; docs/AUD1-design.md option C): THE ENGINE'S OUTWARD SURFACE — every name src/audio.js exports, listed by the module that calls it (static named imports, namespace uses, ma…
- const (2): `SURFACE`, `SURFACE_INTERNAL`

## src/engine/worklets/dyn-worklet.js
SND-F1 — DYNAMICS on the audio thread: one processor 'dyn', two modes (processorOptions.mode).
- exports: none

## src/engine/worklets/frz-worklet.js
====================================================================== ЗАМОРОЖЕННЫЕ ДОРОЖКИ В 16 БИТАХ — ХРАНИЛИЩЕ И ЧТЕЦ НА ПОТОКЕ ЗВУКА (слайс AF6b) ----------------------------------------------…
- exports: none

## src/engine/worklets/ks-worklet.js
====================================================================== Карплюс–Стронг (щипковая струна) как АУДИО-ВОРКЛЕТ — третий способ построить голос, рядом с субтрактивным и FM (не вместо них).
- exports: none

## src/engine/worklets/probe-cap-worklet.js
====================================================================== СЪЁМ МАСТЕРА ДЛЯ ПРОБ — НА ПОТОКЕ ЗВУКА, С НОМЕРАМИ КАДРОВ (только пробы; приложение его не грузит) --------------------------…
- exports: none

## src/freeze/registry.js
REC5 (stage 3) — FROZEN TRACKS: the registry by lane id, the signature and its state (F5), what the auto-freeze watcher reads (AF3), install / pending readers (AF6b-fix), the 16-bit store (AF6b), t…
- const (26): `freezeWire`, `frzWatchBump`, `frzPend`, `frozen`, `frozenOn`, `frzLayer`, `frzHas`, `frzBufNow`, `frzChaseSkip`, `frzGlobalKey`, `frzSigMemo`, `frzSigTonicDbg`, `frzBytesOf`, `frzReadersAlive`, `frzSwapDbg`, `FRZ_CHUNK`, `frzStoreMode`, `frzChunkDbg`, `frzNodesInfo`, `frzSwapCancelAll`, `frzSwapInfo`, `unfreezeLayer`, `frozenLayers`, `frozenInfo`, `frzGainAll`, `frzBusGain`
- fn (26): `freezeSig`, `freezeState`, `freezePinCaptures`, `frzWatchKey`, `frzRetuneOnly`, `laneHasChain`, `frzBytesTotal`, `songPinChains`, `freezeTicket`, `freezeSet`, `frzPendCancel`, `frzWhenReady`, `frzPackAsync`, `frzPlanSwap`, `frzSwapCut`, `frzLeadAhead`, `frzLeadRecut`, `frzSwapCancel`, `frzLeave`, `frzSkipNear`, `frzNearDone`, `freezeDrop`, `frzGain`, `frzStopOne`, `frzStopAll`, `frzArm`
- let (1): `frzWatchVer`

## src/frzqueue.js
═══════════════ ⛳ AUTO-FREEZE — the WATCHER (AF3) and the QUEUE (AF1) ═══════════════ Tracks freeze themselves, unnoticed.
- const (15): `setRunner`, `afPaused`, `afIdle`, `afBusy`, `afActive`, `AF_DELAY`, `AF_REFREEZE_ON_RETUNE`, `AF_BUDGET_MB`, `qBegin`, `qEnd`, `qRunning`, `qState`, `qCostSet`, `qCostOf`, `QF`
- fn (11): `autoFreeze`, `freezeQueue`, `afPause`, `afRowState`, `afBegin`, `afEnd`, `afTick`, `afHint`, `qStep`, `qAdd`, `qRank`

## src/gestures.js
GES1 (DAY run 2026-10-16): gestures.js is the FACADE of the gesture layer — importers (main, draw, ui, frzqueue, probes) keep their import lines.
- → ./gestures/features.js (2): `degRaw`, `pinchDbg`
- → ./gestures/fxhand.js (1): `fxParamsOf`
- → ./gestures/hands.js (6): `HANDS`, `processHands`, `voiceModeReset`, `handsProbe`, `processHandsProbe`, `handsView`
- → ./gestures/roles.js (1): `ACTIONS`

## src/gestures/expr.js
GES1 part 2 (stage 3) — THE EXPRESSION HAND (solo, function 'expr'): features off RAW landmarks, the middle layer (pump-and-decay, springs on a fixed sub-step, engage), the four axes (rules #22, #2…
- const (4): `exprWire`, `EXPR_CFG`, `EXPR`, `exprPrevSet`
- fn (2): `exprFeatures`, `tickExpr`
- let (1): `exprPrevT`

## src/gestures/features.js
GES1 part 1 (stage 3) — THE PURE GESTURE MATH: pinch ratios normalised by hand size, the touched fingers with their hysteresis, the one-step smoothing, smoothstep with a dead zone, degree / axis / …
- const (4): `pinchDbg`, `clamp01`, `clamp`, `dist`
- fn (8): `pinchRatios`, `minFinger`, `touchedFingers`, `emaS`, `smoothstep`, `degRaw`, `degHyst`, `cellHyst`

## src/gestures/fxhand.js
GES1 part 2 (stage 3) — THE EFFECTS HAND: which parameters a hand's fingers aim at (fxParamsOf — the aim's single door, rule #29) and the capture of a finger's parameter (captureFx) — moved from ge…
- const (1): `fxParamsOf`
- fn (1): `captureFx`

## src/gestures/hands.js
GES1: the GESTURE STATE MACHINE — the hands table, latch / lead owners, endPinch, the HAND1 probe clock and processHands (one camera frame → W* calls).
- const (1): `HANDS`
- fn (5): `processHands`, `voiceModeReset`, `handsProbe`, `processHandsProbe`, `handsView`

## src/gestures/looper.js
GES1 part 2 (stage 3) — THE LOOPER HAND (function 'loop'): one command per pinch edge (rule #21) — record / play-pause / undo / the 3-s clear with its countdown — and its named confirmations — move…
- const (1): `looperWire`
- fn (2): `doLooper`, `fireLooperCmd`

## src/gestures/roles.js
GES1: the hand ROLES and OWNER KEYS — stateless helpers of the gesture machine (gestures/hands.js): depth, voice-mode zones, live owner keys, sound + record by role, the finger-action registry, whi…
- const (10): `depthN`, `melodicZone`, `polyZone`, `leadZone`, `liveKey`, `monoKey`, `wOn`, `wOff`, `ACTIONS`, `paletteFinger`
- fn (4): `depthOf`, `handHalfRole`, `noteHandRole`, `noteVolOf`

## src/hand-worker.js
LAT2b — hand detection OFF the main thread (a CLASSIC worker: MediaPipe starts each model by importScripts of its loader, which a module worker cannot do; our modules come in by dynamic import).
- exports: none

## src/handdet.js
LAT2 — the hand DETECTOR: MediaPipe's hand model, worker-safe (no DOM — it runs inside src/hand-worker.js and, as the fallback, on the main thread through vision.js).
- const (3): `MP_WASM`, `MP_MODEL`, `EMPTY_RESULT`
- fn (2): `plainResult`, `createDetector`

## src/hooks.js
tutor — обучающий слой (UI) подписывается СЮДА: нижние слои (gestures) шлют события через hooks.tutor, не трогая DOM (правило #5).
- const (1): `hooks`

## src/i18n.js
================= ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n) — ЭТАП 0: только каркас ================= English по умолчанию + Русский; форма механизма РАССЧИТАНА на четыре языка (en/ru/es/de), но словари es/de пок…
- const (5): `store`, `LANGS`, `LANG_LABEL`, `DICTS`, `onLangChange`
- fn (5): `t`, `L`, `applyI18n`, `withLang`, `setLang`
- let (1): `lang`

## src/icons.js
UI1b (DAY run 2026-10-16): THE ICON COMPONENT — every interface glyph is rendered through here, by a NAME of its meaning.
- const (3): `ICONS`, `icon`, `iconText`
- fn (1): `applyIcons`

## src/latmeter.js
LAT1 — the latency meter, browser side.
- const (4): `latShown`, `darkHideDbg`, `latLostDbg`, `latCount`
- fn (12): `latFrame`, `latHands`, `latIdle`, `latStart`, `latReport`, `latText`, `latConsole`, `latShow`, `latSwSync`, `latSwitch`, `darkDbg`, `latPauseDbg`

## src/live/backing.js
REC5 (stage 3) — THE BACKING: loading an arrangement or a jam as backing tracks (one event funnel backingEvent, each layer its own take, one history step), and clearing it — moved from recorder.js …
- const (2): `backingWire`, `loadJam`
- fn (3): `loadArrangement`, `backingEvent`, `clearJam`

## src/live/capture.js
REC5 (stage 3) — WHAT A TAKE CAPTURES AND HOW RECORDINGS DRIVE THE CHAINS: the capture sampling (takeCapStart / takeCapSample, O-2), the fine-recording automaton (fineStep / fineKnee), the playback…
- const (6): `capReset`, `pnSnap`, `fxPlayDriving`, `fxIsDriven`, `setLiveIsolation`, `playKeyOf`
- fn (9): `takeCapStart`, `capRecordNow`, `fineNew`, `fineReset`, `fineStep`, `takeCapSample`, `fxLaneMerge`, `fxPlayDrive`, `fxPlayStop`
- let (1): `liveIso`

## src/live/eng.js
REC5 (stage 3) — THE ENGINE TABLE: makeENG (one dispatch table for live play, replay and the render copy), the live ENG, and the event pricing at play time (evHz, evTi, evReg) — moved from recorder…
- const (3): `evHzDbg`, `makeENG`, `ENG`
- fn (2): `evHz`, `evReg`

## src/live/record.js
REC5 (stage 3) — LIVE RECORDING: the recording state and the take's per-track state, routing a note to its track by SOURCE (T2/T3), push (the only writer of live events), per-note value recording, …
- ? (1): `recWinReset`
- const (21): `gridFor`, `recWire`, `recBass`, `takeSt`, `takeSrc`, `recLayers`, `isRecLayer`, `curTakeSet`, `inPB`, `noteSource`, `noInst`, `wTapSet`, `WleadOn`, `WleadOff`, `liveChClear`, `WchOn`, `WchSet`, `WchOff`, `WbassOn`, `WbassOff`, `WdrumHit`
- fn (13): `takeJoin`, `nextFreeLayer`, `storeTi`, `storeTim`, `push`, `recLeadReset`, `recFoldRoll`, `recAllOff`, `recDrop`, `recLatchOpen`, `setRecording`, `recStop`, `onRec`
- let (4): `recording`, `pushLy`, `curTake`, `latchOpenAt`

## src/main.js
(no head comment)
- fn (1): `startFail`

## src/modules/effects/bright.js
AUD2a (RUN 3, 2026-10-16) — the effect «Brightness» (a voice module read by each voice).
- const (1): `BRIGHT_PARAMS`
- fn (1): `makeBrightFx`

## src/modules/effects/delay.js
AUD2a (RUN 3, 2026-10-16) — the effect «Delay» (a bus insert with its own dry/wet).
- const (2): `DLY_A`, `DLY_PARAMS`
- fn (1): `makeDelayFx`

## src/modules/effects/forest.js
AUD2a (RUN 3, 2026-10-16) — the effect «Night forest» (a seeded convolution room, SND-F1).
- const (1): `FOREST_PARAMS`
- fn (2): `forestBuffer`, `makeForestFx`

## src/modules/effects/glide.js
AUD2a (RUN 3, 2026-10-16) — the effect «Glide» (a voice module; the pitch glide time).
- const (1): `GLIDE_PARAMS`
- fn (1): `makeGlideFx`

## src/modules/effects/glue.js
AUD2a (RUN 3, 2026-10-16) — the dynamics «Glue» (our compressor in the dyn worklet) and the dynamics node builder (also the master's Glue and Limiter).
- const (1): `GLUE_PARAMS`
- fn (2): `dynNode`, `makeGlueFx`

## src/modules/effects/param.js
AUD2a (RUN 3, 2026-10-16) — an effect parameter's normalised value (0..1 ↔ its units) and the wrapper every declared parameter goes through (setNorm, cur).
- const (2): `fxNorm`, `fxDenorm`
- fn (1): `fxWrapParam`

## src/modules/effects/reverb.js
AUD2a (RUN 3, 2026-10-16) — the effect «Reverb» (a bus module on the FDN): its declaration and its instance.
- const (1): `REV_PARAMS`
- fn (1): `makeReverbFx`

## src/modules/effects/trem-mix.js
AUD2a (RUN 3, 2026-10-16) — the effect «Tremolo (mix)» (a bus insert).
- const (2): `TRMIX_A`, `TRMIX_PARAMS`
- fn (1): `makeTremMixFx`

## src/modules/effects/volume.js
AUD2a (RUN 3, 2026-10-16) — the effect «Volume» (the permanent voice module, rule #30).
- const (1): `VOL_PARAMS`
- fn (1): `makeVolFx`

## src/modules/timbres/bass-voice.js
AUD1c (RUN 3, 2026-10-16) — the bass pool voices.
- fn (1): `buildBassPool`

## src/modules/timbres/chord-voice.js
AUD1c (RUN 3, 2026-10-16) — the chord pool voice (two filters, rule #19), the pool, and the Firefly strike (one-shot tine, SND-F1).
- const (2): `FIREFLY`, `FF_END`
- fn (3): `newChordVoice`, `buildChordPool`, `ffStrike`

## src/modules/timbres/drumkits.js
AUD1c (RUN 3, 2026-10-16) — the five kits' per-hit synths (Standard, Darbuka, Tabla, Gamelan, Taiko) and the hit voice.
- fn (11): `dNoise`, `dTek`, `dDum`, `tabBaya`, `tabNa`, `tabTick`, `gmlFM`, `taikoDrum`, `taikoKa`, `noiseEdge`, `drumVoice`

## src/modules/timbres/fm.js
AUD1c (RUN 3, 2026-10-16) — the FM solo bank (modulator → carrier frequency, index envelope).
- fn (1): `buildFMBank`

## src/modules/timbres/ks.js
AUD1c (RUN 3, 2026-10-16) — the Karplus–Strong solo banks (worklet `ks-string`) and the subtractive fallback plucks.
- fn (2): `buildKSBank`, `buildKSFallback`

## src/modules/timbres/stages.js
AUD1c (RUN 3, 2026-10-16) — shared voice stages: track route, pan, brightness, saturation curves, the brightness ranges, the solo glide time, the filter strike.
- const (12): `BASS_GLIDE_TC`, `CHORD_GLIDE_TC`, `freezeDeep`, `BRI_HZ`, `BRI_OPEN`, `briHzOf`, `CHORD_LP_MAX`, `CHORD_LP_MIN`, `briToHz`, `HUM_CENTS`, `LEAD_GLIDE_TC`, `fstrike`
- fn (6): `makePanStage`, `voiceRoute`, `panGains`, `makeBriStage`, `makeSatCurve`, `makeHardCurve`

## src/modules/timbres/subtractive.js
AUD1c (RUN 3) / TIM3b (RUN 4) — the solo bank of a voice from its timbre RECORD: the subtractive engine type here; FM and KS dispatched.
- fn (2): `buildLeadBank`, `buildSubtractive`

## src/modules/timbres/tine.js
C4a (RUN 6, Calm plan §4.1) — the TINE engine type as a SOLO bank: «Firefly» for the solo hand.
- fn (1): `buildTineBank`

## src/modules/timbres/voice.js
AUD1c (RUN 3, 2026-10-16) — starting a voice's oscillators (phase scatter, the pair start) and the solo oscillator with its detune taps.
- const (1): `voiceBuild`
- fn (3): `voiceStart`, `voiceStartPair`, `mkOsc`

## src/palette.js
DRAW1b (RUN 3, 2026-10-16) — THE CANVAS PALETTE, read from the design tokens (tokens.css, section «canvas»: --cv-*).
- const (2): `ROLE_COL`, `noRoleCol`
- fn (1): `cv`

## src/probedata.js
⛳ ПРОБЫ ДАННЫХ — ЧАСТЬ ПРОБЫ, КОТОРОЙ НЕ НУЖНЫ НИ БРАУЗЕР, НИ КАМЕРА, НИ ЗВУК (слайс «быстрые пробы»).
- const (21): `keyless`, `isUserId`, `SCALES`, `TUNINGS`, `CHORD_FAM_SETS`, `userCount`, `tagOf`, `isTert`, `legacyChordNotesStr`, `preF3RegWord`, `preF3RegWordFull`, `preF3RootName`, `preF3ChordNotesStr`, `preF3NoteLbl`, `PRE_T7_SETS`, `preT7ChordUnit`, `A4_SET`, `PRINT_MAX`, `OLD`, `allViews`, `KEEP_MAX`
- fn (25): `check`, `checkData`, `checkPitch`, `checkView`, `drone`, `checkUntyped`, `checkStack`, `checkBehaviour`, `checkDegrees`, `checkModeMap`, `legacyChordLabel`, `legacyChordNotesRef`, `preF3StepName`, `preF3RowLabel`, `preF3ChordLabel`, `preF3AxisLbl`, `preF4Status`, `preT7ChordNotesAt`, `preT7ChordNotes`, `legacyLeadFreq`, `legacyBassFreq`, `legacyChordNotes`, `sweep`, `canon`, `snapViews`

## src/probes/autosave.js
AUTOSAVE1 (RUN 3, 2026-10-16): the song kept on this device by itself — through the real scheduler (autosave.asTick on the probe's clock, written at once instead of in an idle moment), the real but…
- fn (1): `checkAutosave`

## src/probes/calm.js
C4a (RUN 6, Calm plan §4.1, §10): row «C4a solo Firefly» (quick and all; three short offline renders through the engine copy).
- fn (1): `checkSoloFirefly`

## src/probes/cmd.js
CMD1 (RUN 5): the history's tripwire compares VALUES (CMD1a), tracks keep their ids through the song file (CMD1b, v7), every history step is a command serialised by ids and parsed back (CMD1c), app…
- fn (3): `checkValueTripwire`, `checkCommands`, `checkJournal`

## src/probes/data.js
PROBE1: the data rows — run by P.all in the browser AND by tools/probe-data.mjs in node (flag node).
- exports: none

## src/probes/detect.js
LAT2 — hand detection: each camera frame once, the search schedule, the worker path.
- fn (3): `checkFrameOnce`, `checkSchedule`, `checkWorker`

## src/probes/edit.js
PROBE1: Track-editor probes: solo editing, several notes, paste, quantise, degrees, bend curve and shapes, track into another mode, volume bars.
- fn (10): `checkSoloEdit`, `checkSelect`, `checkPaste`, `edKit`, `checkQuant`, `checkDegrees`, `checkBend`, `checkBendCurve`, `checkTrackMode`, `checkVolBars`

## src/probes/eng2.js
ENG2 (RUN 4): row «ENG2 engine readouts» (quick and all; reads only, ≈ 3 s).
- const (1): `engFeatures`
- fn (1): `checkEngReadouts`

## src/probes/engine.js
AUD1a (RUN 3, 2026-10-16; docs/AUD1-design.md option C, review R1): THE ENGINE CONTEXT `E` and THE NODE CENSUS.
- fn (3): `checkEngineCtx`, `dumpCensus`, `checkCensus`

## src/probes/files.js
PROBE1: Tunings-as-files probes: the F0 snapshot, naming, snapshot renewal, user files, Just intonation merge, bare modes, root alone.
- const (1): `SNAPSHOT_CHANGES`
- fn (9): `dumpScales`, `checkFiles`, `checkNames`, `renewSnapshot`, `checkUserDelete`, `checkUserChordModes`, `checkMerge`, `checkBare`, `checkRootAlone`

## src/probes/forest.js
VIS1c (RUN 6, Calm plan §10, review 2026-10-17): two rows (quick and all).
- fn (2): `checkForestRoom`, `checkBackgrounds`

## src/probes/freeze.js
PROBE1: Render and freeze probes: repeatability, the render queue, AF1, AF3, AF5, LR1, AF6b, AF2, freeze cost.
- fn (9): `checkRepeat`, `checkQueue`, `checkFreezeQueue`, `checkAutoFreeze`, `checkLiveIsolation`, `freezeCost`, `checkRevAgree`, `checkChunks`, `checkSwap`

## src/probes/fxcontract.js
AUD2b (RUN 3, 2026-10-16; docs/AUD1-design.md §7): GENERATED CONTRACT ROWS — one per effect of audio.FX_FACTORY (its keys, its order), each effect built ALONE by its own factory (`make(E)`) on the …
- fn (1): `checkFx`

## src/probes/gold.js
GOLD1: GOLDEN RENDERS — every built-in timbre (23 solo, 16 chord, 7 bass, 5 kits × 6 rows), the drone and the six effects at three settings, each rendered alone through the engine copy (render.gold…
- fn (2): `dumpGold`, `checkGold`

## src/probes/guard.js
PROBE1: The console guard: window.P = api() — one probe at a time; its self-test runs inside row «write path (funnels)».
- fn (2): `api`, `guardSelfTest`

## src/probes/hand.js
HAND1: SYNTHETIC HANDS → GESTURE FINGERPRINT.
- fn (2): `dumpGesture`, `checkGesture`

## src/probes/history.js
PROBE1: Song-edit probes: sections (ED6), the one history (ED7), undo after clear (ED7-fix2).
- fn (3): `checkUndoClear`, `checkHistory`, `checkSections`

## src/probes/ids.js
IDS1 (RUN 3, 2026-10-16): every event of the song has a PERMANENT id (song/store.js evIdFill; rule #37) — unique, a positive integer, kept by edits that keep the object, by ↶ / ↷ (the same objects …
- fn (1): `checkEventIds`

## src/probes/key.js
PROBE1: Tonic-freeze probes: the song sound fingerprint (TF0), keys kept (TF2), transpose (TF3), the 1/1 anchor (TF5).
- const (1): `liveEnv`
- fn (5): `dumpSongPrint`, `checkSongPrint`, `checkKeyKeep`, `checkOneOne`, `checkTranspose`

## src/probes/kit.js
PROBE1: Shared probe helpers: frames with a fallback timer, measures, the quick flag, the short render window, window keep/restore.
- const (7): `measReset`, `meas`, `frame`, `waitMs`, `PROBE_SHORT`, `setQuick`, `winKeep`
- fn (1): `winRestore`
- let (3): `MEAS`, `frameStalls`, `QUICK`

## src/probes/lat.js
PROBE1: LAT1 latency meter probe.
- fn (5): `checkLatency`, `checkLatSwitches`, `checkLowLight`, `checkCamRestore`, `checkCamStart`

## src/probes/pack.js
PACK1 (RUN 3, 2026-10-16): packs and offline licence keys IN THE PAGE (Chrome's WebCrypto — the node row «PACK1 packs and licence keys (core)» checks the same code in node): the committed TEST keys…
- fn (1): `checkPack`

## src/probes/pool.js
POOL1 (RUN 4, ENG2 review E2): the chord pool grows on demand.
- fn (1): `checkPool`

## src/probes/profile.js
C0 (RUN 6, Calm plan §2, §10): row «C0 profile round trip» (quick and all; no sound, no capture).
- fn (1): `checkProfile`

## src/probes/rows.js
PROBE1: the ROW REGISTRY — every probe row registers itself next to its probe; P.all / P.quick (probes/run.js) and the node data runner (tools/probe-data.mjs, rows flagged node) list them from here.
- fn (5): `row`, `family`, `rows`, `rowProblems`, `rowCheck`

## src/probes/run.js
PROBE1: P.all / P.quick / P.orderCheck — runs every registered row (probes/rows.js) in order, with the state guard between rows.
- fn (5): `material`, `songPrint`, `all`, `quick`, `orderCheck`

## src/probes/seed.js
PROBE1: The test song (P.seed), the demo song (P.song), and the rows that check what they wrote (write path, seed notes, frozen seed bass).
- const (2): `SEED_FROZEN_EXPECT`, `seedFrozenSamples`
- fn (5): `checkWrite`, `checkSeed`, `checkFrozen`, `seed`, `song`
- let (1): `SEED_REC`

## src/probes/song1.js
SONG1 (RUN 3, 2026-10-16): a song carries copies of the person's own tunings / modes it uses (rule #37) — so it opens on any device.
- fn (1): `checkSongRecords`

## src/probes/song2.js
SONG2 (RUN 3, 2026-10-16): the demo song is a FILE (data/songs/triphop.json) and P.song opens it; the code generator stays a probe tool.
- fn (2): `dumpSong`, `checkSongFile2`

## src/probes/songfile.js
SAVE1 (DAY run 2026-10-16): Save → Open of a song file, through the real ui doors (ui.songSaveText / ui.songOpenText — the same code the buttons run, minus the browser's download and file picker).
- fn (2): `checkSongFile`, `checkSongOpenUndo`

## src/probes/sound.js
SND-F1: probes of the Calm prototype's sounds — the Firefly timbre, the Night forest room, our dynamics (Glue, safety Limiter).
- fn (7): `checkFirefly`, `checkForest`, `checkDynamics`, `checkMasterPath`, `checkDynLive`, `checkFreezeParity`, `checkTimbreIds`

## src/probes/tim3d.js
TIM3d (RUN 4): row «TIM3d own timbres and song copies» (quick and all).
- fn (1): `checkOwnTimbres`

## src/probes/timbres.js
TIM3 (RUN 4): timbres as data — the proof that nothing changes.
- fn (4): `timbreSnapshotAll`, `dumpTimbres`, `checkTimbresBefore`, `checkTimbreRecords`

## src/probes/tuning.js
PROBE1: Tuning and editor-row probes: pitch from the tuning index, editor rows, highlights, chord rules and labels, out-of-mode pitches, song integrity, chord types and modes.
- fn (13): `checkSound`, `checkRows`, `checkRowFix`, `checkHl`, `tracks`, `checkRules`, `checkScroll`, `checkLabels`, `checkSong`, `checkTypes`, `checkModes`, `checkPure`, `checkOut`

## src/probes/vis.js
VIS1a (RUN 6, docs/VIS1-design.md §7): row «VIS1a stack and bus» (quick and all; no sound).
- fn (1): `checkVisStack`

## src/probes/window.js
PROBE1: Arrangement-window and mixer probes: every track reachable, AR1, MX1, MX2, AR2.
- fn (5): `checkMixer`, `checkPan`, `checkArrange`, `checkTrackLook`, `checkTracks`

## src/profile.js
C0 (RUN 6, Calm plan §2) — PROFILES: the faces of the one app.
- const (8): `profileWire`, `profileCurrent`, `profileOf`, `profileList`, `profileLoadReport`, `onProfile`, `profileSavedDbg`, `profileDoorsDbg`
- fn (2): `profileApply`, `profileBoot`

## src/recorder.js
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

## src/render.js
⛔ ЗАВИСИМОСТИ ЭТОГО МОДУЛЯ — ЧИТАТЬ ПЕРЕД ЛЮБЫМ ПЕРЕИМЕНОВАНИЕМ В recorder / audio / state.
- const (8): `latency`, `seedOfLane`, `unfreeze`, `frozen`, `layoutCost`, `renderKsLazy`, `capStats`, `renderQueue`
- fn (20): `engineProbe`, `probe`, `renderTrack`, `freeze`, `aud`, `live`, `stop`, `recSteps`, `droneBP`, `bendTrace`, `reuseCheck`, `goldRender`, `engBench`, `engine`, `renderPoolDbg`, `copyState`, `revAgree`, `liveCheck`, `swapCheck`, `chunkCheck`
- → ./frzqueue.js (2): `autoFreeze`, `freezeQueue`

## src/scaleload.js
═══ ⛳ ЗАГРУЗЧИК ДАННЫХ ЛАДОВ (слайс F5 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Данные ладов — ФАЙЛЫ в data/ (форма v1: index.json — манифест, menu.json, по файлу на строй, лад, палитру и набор р…
- const (3): `loadReport`, `KINDS`, `kindOfRecord`
- fn (4): `loadScaleData`, `idHolder`, `checkRecord`, `checkRecordList`
- → ./core/format.js (1): `CM_MAX`
- → ./core/registry.js (1): `USER_ID`

## src/scaleprobe.js
⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
- → ./probedata.js (10): `check`, `checkData`, `checkPitch`, `checkView`, `drone`, `checkUntyped`, `checkStack`, `checkBehaviour`, `checkDegreesData`, `checkModeMap`
- → ./probes/autosave.js (1): `checkAutosave`
- → ./probes/calm.js (1): `checkSoloFirefly`
- → ./probes/cmd.js (3): `checkValueTripwire`, `checkCommands`, `checkJournal`
- → ./probes/detect.js (3): `checkFrameOnce`, `checkSchedule`, `checkWorker`
- → ./probes/edit.js (9): `checkSoloEdit`, `checkSelect`, `checkPaste`, `checkQuant`, `checkDegrees`, `checkBend`, `checkBendCurve`, `checkTrackMode`, `checkVolBars`
- → ./probes/eng2.js (1): `checkEngReadouts`
- → ./probes/engine.js (3): `checkEngineCtx`, `checkCensus`, `dumpCensus`
- → ./probes/files.js (10): `dumpScales`, `checkFiles`, `checkNames`, `SNAPSHOT_CHANGES`, `renewSnapshot`, `checkUserDelete`, `checkUserChordModes`, `checkMerge`, `checkBare`, `checkRootAlone`
- → ./probes/forest.js (2): `checkForestRoom`, `checkBackgrounds`
- → ./probes/freeze.js (9): `checkRepeat`, `checkQueue`, `checkFreezeQueue`, `checkAutoFreeze`, `checkLiveIsolation`, `freezeCost`, `checkRevAgree`, `checkChunks`, `checkSwap`
- → ./probes/fxcontract.js (1): `checkFx`
- → ./probes/gold.js (2): `dumpGold`, `checkGold`
- → ./probes/guard.js (1): `api`
- → ./probes/hand.js (2): `dumpGesture`, `checkGesture`
- → ./probes/history.js (3): `checkUndoClear`, `checkHistory`, `checkSections`
- → ./probes/ids.js (1): `checkEventIds`
- → ./probes/key.js (5): `dumpSongPrint`, `checkSongPrint`, `checkKeyKeep`, `checkOneOne`, `checkTranspose`
- → ./probes/lat.js (5): `checkLatency`, `checkLatSwitches`, `checkLowLight`, `checkCamRestore`, `checkCamStart`
- → ./probes/pack.js (1): `checkPack`
- → ./probes/pool.js (1): `checkPool`
- → ./probes/profile.js (1): `checkProfile`
- → ./probes/run.js (4): `material`, `all`, `quick`, `orderCheck`
- → ./probes/seed.js (5): `checkWrite`, `checkSeed`, `checkFrozen`, `seed`, `song`
- → ./probes/song1.js (1): `checkSongRecords`
- → ./probes/song2.js (2): `checkSongFile2`, `dumpSong`
- → ./probes/songfile.js (2): `checkSongFile`, `checkSongOpenUndo`
- → ./probes/sound.js (7): `checkTimbreIds`, `checkFirefly`, `checkForest`, `checkDynamics`, `checkDynLive`, `checkFreezeParity`, `checkMasterPath`
- → ./probes/tim3d.js (1): `checkOwnTimbres`
- → ./probes/timbres.js (3): `checkTimbresBefore`, `dumpTimbres`, `checkTimbreRecords`
- → ./probes/tuning.js (13): `checkSound`, `checkRows`, `checkRowFix`, `checkHl`, `tracks`, `checkRules`, `checkScroll`, `checkLabels`, `checkSong`, `checkTypes`, `checkModes`, `checkPure`, `checkOut`
- → ./probes/vis.js (1): `checkVisStack`
- → ./probes/window.js (5): `checkMixer`, `checkPan`, `checkArrange`, `checkTrackLook`, `checkTracks`

## src/scales.js
(no head comment)
- const (61): `NOTE_NAMES`, `ROMAN`, `OCT_ROMAN`, `range`, `TRADITIONS`, `GRP`, `TUNINGS`, `CHORD_FAM_SETS`, `chordModeName`, `chordModeHint`, `SCALES`, `scaleById`, `resolveScaleId`, `anchorHints`, `scaleData`, `scalesOfTrad`, `tradOfScale`, `CUR`, `IVX`, `keyFollowsDbg`, `viewKey`, `keyCDbg`, `viewKeyC`, `baseF`, `keyByOneOne`, `historicalKeyOf`, `viewKeyIdOf`, `keyOf`, `cFix`, `tonicFreq`, `periodOf`, `regWord`, `regWordFull`, `supportsProgressions`, `backingRhythmOf`, `supportsChords`, `typedChords`, `REG_N`, `rectEligible`, `rectGrid`, `rectDefault`, `rectRows`, `rectNotes`, `rectRowsFull`, `rectBase`, `rectBaseMax`, `rectNoteAt`, `rectSlotOf`, `thereminSpan`, `thereminHz`, `chordFams`, `rootName`, `fifthStep`, `modesLikeView`, `centsOf`, `DRONE_TOL`, `droneNonOct`, `setDroneNonOct`, `listLbl`, `SEV`, `chordNotesStr`
- fn (46): `viewOfId`, `applyScaleId`, `userRecordsOf`, `dependentsOf`, `unregisterRecord`, `registerRecord`, `menuOf`, `chordModeOf`, `scaleView`, `viewIdOf`, `namingOf`, `tuningStatus`, `rectLayout`, `seventhAddsNote`, `ruleChordSteps`, `pitchHz`, `tuningOf`, `tuningIndexOf`, `leadFreqTi`, `bassFreqTi`, `chordReadsTi`, `chordNotesAt`, `chordRowFreqAt`, `modeSlotOfTi`, `shiftDegrees`, `mapDegrees`, `chordFreqsAt`, `leadFreq`, `bassFreq`, `chordFreqs`, `chordUnit`, `chordBuildOf`, `chordAtRoot`, `chordTypeFits`, `chordRowFreq`, `chordNotes`, `name24`, `stepName`, `rowLabel`, `degCentsExact`, `droneDegree`, `droneSecondHz`, `chordPitchHz`, `listName`, `qual`, `chordLabel`
- → ./scaleload.js (1): `loadReport`

## src/song/automation.js
REC3 part 2 (stage 3) — THE AUTOMATION LANE AND THE PER-NOTE LANES (O-4, V4b, VOL-3, ED5), THE BEND CURVE (OWN2, BEND-CURVE) and the TRACK'S CHAIN edits (S1) with their history kinds — moved from r…
- const (4): `bendDbg`, `BEND_EPS`, `takeFxDump`, `autEarliest`
- fn (18): `autTakesOf`, `autAddrs`, `bendEdited`, `editBendPoint`, `editBendShape`, `pnBars`, `editVolSel`, `autPoints`, `autCaps`, `autMovePoint`, `autDeletePoint`, `autAddPoint`, `autShapePoint`, `autCurvePoint`, `autChainOf`, `autChainAdd`, `autChainRemove`, `autChainMove`

## src/song/capture.js
REC3 part 2 (stage 3) — THE CAPTURE RECORDS (what a take played on its chains: snapshot + lane, by take number), their version, the take counter, the ONE law of a lane segment's shape (autSmoothOf …
- const (9): `takeNext`, `takeSeqFloor`, `takeFx`, `takeFxTouch`, `laneIdFloor`, `FX_CHAIN`, `setAutRecSmooth`, `fxLaneSmooth`, `laneChainKey`
- fn (6): `laneIdFill`, `autSmoothOf`, `fxLaneAt`, `fxLaneExpand`, `laneRoleOf`, `captureInfoOf`
- let (1): `takeFxVer`

## src/song/clipboard.js
REC3 part 2 (stage 3) — COPY, PASTE, DUPLICATE (ED2) — moved from recorder.js (which re-exports them — a facade).
- const (3): `editClipInfo`, `editPasteWhy`, `editPaste`
- fn (2): `editCopySel`, `editDuplicateSel`

## src/song/commands.js
CMD1c (RUN 5) — EVERY HISTORY STEP A COMMAND, SERIALISED BY IDS (plan docs/CMD1-design.md §3.4).
- const (2): `HIST_FORMAT`, `cmdDbg`
- fn (3): `histToJSON`, `histFromJSON`, `histRoundTrip`

## src/song/edit-chords.js
REC3 (stage 3) — CHORD-NOTE EDITS (U2–U4: a chord dissolves into one-note chords when one of its notes is deleted, moved or resized), moved from recorder.js (which re-exports these names — a facade).
- fn (3): `editDeleteChordNote`, `editMoveChordNote`, `editResizeChordNote`

## src/song/edit-group.js
REC3 (stage 3) — GROUP EDITS (ED1: several notes moved or deleted as ONE history entry), moved from recorder.js (which re-exports these names — a facade).
- fn (4): `editDeleteSel`, `editGroup`, `editMoveSel`, `selGroups`

## src/song/edit-insert.js
REC3 part 2 (stage 3) — INSERTS of the track editor (bass, solo, chords, drum hits; the session take; the pinned chain of a new track) and the TIMBRE REPLACEMENT (T5) — moved from recorder.js (whic…
- ? (1): `editTakeNow`
- const (2): `editDefVol`, `editTakeReset`
- fn (7): `editInsPush`, `editInsertBass`, `editInsertLead`, `editInsertChord`, `editInsertHit`, `laneTimbreOf`, `editSetTimbre`
- let (1): `editTake`

## src/song/edit-notes.js
REC3 (stage 3) — THE EDITOR'S EDIT CORE AND NOTE EDITS (guard, commit, batch, tie pairs, key clash, detach; move / resize / delete of notes and drum hits), moved from recorder.js (which re-exports …
- const (12): `EDIT_GAP`, `EDIT_MIN_LEN`, `EDIT_ROLE`, `editBackingOpen`, `editCanRedo`, `editCanUndo`, `editIsOpen`, `editLayer`, `editPush`, `editRoleOf`, `editWire`, `noTie`
- fn (19): `bendTrim`, `chordMoveTy`, `commitDetach`, `detachPlan`, `editBatch`, `editCommit`, `editDeleteHit`, `editDeleteSeg`, `editGuard`, `editMoveHit`, `editMoveSeg`, `editResizeSeg`, `keyClash`, `segChordNotes`, `segEvs`, `segPitchPt`, `slotPt`, `tiePartners`, `untieAcross`

## src/song/env.js
REC3 part 2 (stage 3) — THE SONG LAYER'S ENVIRONMENT: what pure song/ modules need from above — the transport (REC4's clock answers these later), the engine's effect DECLARATIONS (the FX_FACTORY re…
- const (2): `ENV`, `envWire`

## src/song/file.js
SAVE1 (DAY run 2026-10-16) — THE SONG ↔ ITS FILE RECORD (song layer: no DOM, no Web Audio; folder rule).
- const (1): `fileDbg`
- fn (6): `songData`, `songPlan`, `songNeeds`, `songTimbreNeeds`, `viewRec`, `viewOfRec`

## src/song/history.js
REC2 (stage 3) — THE ONE HISTORY (ED7), moved from recorder.js (which re-exports these names — a facade).
- const (17): `onApplied`, `histNote`, `histWire`, `histKindFields`, `histLists`, `histSeal`, `histReset`, `histCanUndo`, `histCanRedo`, `histLen`, `histTopLabel`, `histSince`, `histPeek`, `histOffAdd`, `histOffNow`, `histDbg`, `histDbgO`
- fn (14): `histKind`, `histInstall`, `histHashObj`, `histApply`, `histTouched`, `histPush`, `histHash`, `histUndo`, `histRedo`, `histTab`, `histMaster`, `laneNameStep`, `moveLaneStep`, `histGroup`

## src/song/lanes.js
REC1 (stage 3) — THE TRACK TABLES, moved verbatim from recorder.js (which re-exports these names — a facade).
- const (27): `laneWire`, `laneId`, `laneMute`, `laneSolo`, `laneLevel`, `lanePan`, `laneName`, `laneRank`, `laneLen`, `laneLenOf`, `laneEditVer`, `laneVerBump`, `laneEditVerOf`, `laneOf`, `laneForget`, `laneTablesClear`, `armedLayer`, `laneAudible`, `laneGated`, `laneLevelOf`, `laneGainOf`, `lanePanOf`, `laneNameOf`, `laneMuted`, `laneSoloed`, `laneSoloOn`, `laneRow`
- fn (13): `laneNew`, `laneLayerOf`, `toggleArm`, `laneDelTap`, `laneDelCancel`, `laneDelPendingLayer`, `layerOfOwner`, `setLaneName`, `laneOrder`, `moveLane`, `laneShowKeep`, `laneLook`, `laneRowSet`

## src/song/notes.js
REC2 (stage 3) — THE SONG AS NOTES, moved from recorder.js (which re-exports these names — a facade).
- const (7): `chOwnerKey`, `bassOwnerKey`, `ldKey`, `chaseKind`, `chaseKey`, `notesReset`, `ldTherm`
- fn (7): `layerSlotTop`, `layerTakeTop`, `songNotes`, `viewAudit`, `editViewCheck`, `trackViewCheck`, `songSegs`

## src/song/quantise.js
REC3 part 2 (stage 3) — QUANTISE AFTER RECORDING (ED3) — moved from recorder.js (which re-exports them — a facade).
- fn (1): `editQuantSel`

## src/song/sections.js
REC3 part 2 (stage 3) — SECTIONS (ED6): named bar markers; insert, cut or duplicate BARS in every track at once, with their history kinds (brace, marks, lanelen) — moved from recorder.js (which re-…
- const (9): `secDbg`, `secMarksSet`, `secCopy`, `sections`, `songCanUndo`, `songCanRedo`, `songUndo`, `songRedo`, `songHistReset`
- fn (5): `songEditWhy`, `songEdit`, `secAdd`, `secRename`, `secDelete`
- let (1): `secMarks`

## src/song/store.js
REC1 (stage 3) — THE SONG'S EVENT STORE, moved verbatim from recorder.js (which re-exports these names — a facade).
- const (11): `events`, `onInvalidate`, `sortedLen`, `evSeq`, `evSeqPut`, `evOrder`, `evIdFloor`, `maxLayer`, `evRole`, `chaseRole`, `isNoteStart`
- fn (4): `schedInvalidate`, `compactEvents`, `evSeqFill`, `evIdFill`
- let (1): `evGen`

## src/song/transpose.js
REC3 part 2 (stage 3) — TRANSPOSE BY DEGREES (ED4), A TRACK INTO ANOTHER MODE (OWN1), TRANSPOSE BY SEMITONES (TF3, TF3b) — moved from recorder.js (which re-exports them — a facade).
- const (6): `editDegreeWhy`, `trackViewOfLayer`, `editTrackModeWhy`, `trDbg`, `editTransposeWhy`, `songTransposeWhy`
- fn (4): `editTrackMode`, `editTranspose`, `songTranspose`, `editDegreeSel`

## src/songs.js
⛳ ДЕМО-ПЕСНИ — КОНСОЛЬНЫЙ ЗАГРУЗЧИК, НЕ ЧАСТЬ ИГРЫ.
- const (1): `songNames`
- fn (2): `loadSong`, `songBuild`

## src/state.js
(no head comment)
- const (96): `fx`, `fxIsScalar`, `CHAIN_ROLE`, `chainKeyOf`, `CHAIN_SOLO`, `CHAIN_TRACK`, `trackChainKeyOf`, `chainOwners`, `fxChainOf`, `fxVolReset`, `setFxParamAddr`, `setFxParamMode`, `setFxParamFixed`, `fxChainAdd`, `fxChainRemove`, `fxChainMove`, `setHandFn`, `handSide`, `handFnOf`, `roleHasTherm`, `roleHasFx`, `roleHasExpr`, `playsNotes`, `roleHasNotes`, `handActsOf`, `handActOf`, `setHandAct`, `setRectPref`, `setPinchFingers`, `VOICE_MODE_DEF`, `voiceMode`, `setVoiceMode`, `isLeadMode`, `setSplitRole`, `phoneHalves`, `setScaleId`, `setTonic`, `KEY_CENTS_MAX`, `setTonicCents`, `setARef`, `setTunedFrom`, `setChordMode`, `setChordModeSel`, `setSeventh`, `setLeadIdx`, `setChIdx`, `setBassIdx`, `setDrumKitIdx`, `setExprDisp`, `setChFitDeg`, `setExprBrightDisp`, `setLooperMsg`, `setLooperClear`, `setLatchDeg`, `setLatchOct`, `setChordFam`, `setChordVar`, `setLatchTy`, `setPhoneInstr`, `setCamFacing`, `setVideoRec`, `mirrored`, `flipX`, `setViewRect`, `sx`, `sy`, `setSplitOn`, `setOctReg`, `setBassOctReg`, `setChordOctReg`, `setRollOpen`, `setArrOpen`, `setArrFace`, `setRollWin`, `setRollSel`, `setRollSelNote`, `setRollSelMany`, `setRollPick`, `setRollBox`, `setRollDrag`, `setRollIns`, `setLaneRow0`, `setLaneDrag`, `ROLL_EDITABLE`, `setRollRole`, `setRollRow0`, `setRollRowsAll`, `setRollAut`, `setRollAutSel`, `setRollAutDrag`, `setRollBendSel`, `setRollBendDrag`, `setSecSel`, `setRollVolBars`, `rectOctReg`, `setRectOctReg`
- let (48): `scaleId`, `aRef`, `tunedFrom`, `chordModeSel`, `chordModeVer`, `seventh`, `fxChains`, `exprDisp`, `chFitDeg`, `exprBrightDisp`, `looperMsg`, `looperClear`, `latchDeg`, `latchOct`, `chordFam`, `latchTy`, `phoneInstr`, `handFn`, `handActs`, `rectPref`, `pinchFingers`, `camFacing`, `videoRec`, `splitOn`, `SPLIT_ROLES`, `octReg`, `bassOctReg`, `chordOctReg`, `tonicCents`, `viewRect`, `rollOpen`, `rollBeat0`, `rollSpan`, `rollSel`, `arrOpen`, `arrFace`, `rollSelNote`, `rollSelMany`, `rollPick`, `rollDrag`, `rollRole`, `laneRow0`, `laneDrag`, `rollRowsAll`, `rollAut`, `rollBendSel`, `secSel`, `rollVolBars`
- → ./config.js (1): `FX_VOL`

## src/timbreload.js
TIM3a (RUN 4) — THE TIMBRE RECORDS, loaded ONCE when the module starts (top-level await, the scales.js pattern) from the generated bundle data/timbres.bundle.json (tools/timbre-bundle.mjs; the sour…
- const (5): `TIMBRE_RECORDS`, `timbreAll`, `timbreCheckDbg`, `timbreKnownId`, `timbreLoadReport`
- fn (1): `timbreAddSession`

## src/transport/clock.js
REC4 (stage 3) — THE TRANSPORT CLOCK: the transport state `loop` (tempo, metre, t0, playhead, the brace `rgn`), the song length, the brace math (songAt, rgnReps, braceClamp, rgnApply …), the metre …
- const (16): `clockWire`, `secPerBeat`, `beatNow`, `timeAt`, `secOf`, `beatsOf`, `songLenGrow`, `loop`, `songBeats`, `rgnLen`, `cycling`, `rgnReps`, `songAt`, `regionOn`, `METRES`, `SUBS`
- fn (15): `songLenRecalc`, `rgnApply`, `rgnSync`, `braceProbe`, `setRegionOn`, `braceTap`, `braceMove`, `braceSet`, `beatLevel`, `loopPos`, `setLoopBars`, `setLoopMetre`, `setLoopQuant`, `setLoopSub`, `setLoopBpm`
- let (1): `songLen`

## src/transport/scheduler.js
REC4 (stage 3) — THE SCHEDULER: replay cursors over the sorted prefix, the look-ahead window (scheduleLayers), releases at seams, the chase, «almost now» firing of solo and drone (fireNear), the me…
- const (2): `schedWire`, `chaseReset`
- fn (7): `clearPump`, `releaseLoopLayersAt`, `chaseFor`, `chaseNote`, `chasePlay`, `startTransport`, `seekTo`

## src/tutor.js
================= ОБУЧЕНИЕ (список уроков + интерактивные шаги) ================= «Обучение» открывает СПИСОК коротких уроков (меню возможностей инструмента).
- fn (2): `wireStarter`, `openLessons`

## src/ui.js
(no head comment)
- ? (1): `$`
- const (3): `arrApi`, `undoUiDbg`, `canSplit`
- fn (13): `tutorReset`, `tutorClearLoop`, `tutorSetScale`, `tutorResetHandFn`, `songSaveText`, `songOpenText`, `songKeep`, `songKeepTimbres`, `asRestoreId`, `songResumeOffer`, `tutorSplitInit`, `revealBar`, `tutorSyncBar`

## src/userfiles.js
═══ ⛳ ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ — КОНСОЛЬ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, ставятся и снимаются из консоли (интерфе…
- fn (10): `install`, `list`, `remove`, `exportFile`, `storeUnchecked`, `example`, `brokenExample`, `chordModesExample`, `installChordModesExample`, `installExample`

## src/userstore.js
═══ ⛳ ХРАНИЛИЩЕ ФАЙЛОВ ПОЛЬЗОВАТЕЛЯ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══ Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, — записи формы v1 (те же, что в data/),…
- fn (3): `userAll`, `userPut`, `userDel`
- let (1): `backend`

## src/va-stub.js
Vercel Web Analytics queue stub — a classic script, not a module: calls made before the counter's script loads are queued.
- exports: none

## src/views/camera.js
DRAW1 (DAY run 2026-10-16): the camera picture: the cover crop (syncViewRect) and the video background — moved from draw.js verbatim (draw.js is the facade).
- fn (2): `drawVideoBackground`, `syncViewRect`

## src/views/common.js
DRAW1 (DAY run 2026-10-16): shared canvas helpers (FX bar layout, status and transport sync, colour mixing, the ONE note label noteLbl, the time axis and the editor row geometry, the editor bar hei…
- const (16): `setEmptyTpOld`, `FX_EDGE`, `FX_STEP`, `LOOP_EMPTY_TOP`, `ROLL_BAR_H`, `ROLL_TP_H`, `fxBarItems`, `fxBarsBox`, `fxBarsY`, `fxParamOnFinger`, `laneBeatAt`, `laneBeatX`, `noteLbl`, `rollRowAt`, `rollRowY`, `statusEl`
- fn (3): `hexA`, `mixHex`, `syncLoopTransport`
- let (2): `emptyTpOld`, `loopBarBottom`

## src/views/play.js
DRAW1 (DAY run 2026-10-16): the play screen: overlays per frame (drawOverlays), roles, grids, hands, palette, effect bars, status — moved from draw.js verbatim (draw.js is the facade).
- fn (1): `drawOverlays`

## src/views/roll.js
DRAW1 (DAY run 2026-10-16): the track editor (drawRoll, rollView, the pitch axis, the automation lane, hit tests) — moved from draw.js verbatim (draw.js is the facade).
- const (5): `rollAutValAt`, `rollBendProbe`, `rollSnapBeat`, `rollAutSnapV`, `rollRowsProbe`
- fn (17): `fxTitleOf`, `rollBendAt`, `rollSnap`, `rollAutDrive`, `rollHit`, `rollShiftPit`, `rollBoxHits`, `rollSelectable`, `rollGeom`, `rollTrackView`, `rollRowPitch`, `rollAxisHasDim`, `rollDefaultRow0For`, `rollAxisNow`, `rollRow0Across`, `rollDragTarget`, `drawRoll`

## src/views/scene/forest.js
VIS1c (RUN 6, Calm plan §3) — THE NIGHT FOREST ROOM: a scene module built with three.js r128 (vendored, loaded by host.js).
- const (3): `FOREST_SEED`, `FOREST_LEVELS`, `FOREST_BOUNDS`
- fn (1): `buildForest`

## src/views/scene/host.js
VIS1b (RUN 6, docs/VIS1-design.md §4–§6, Calm plan §3) — THE SCENE HOST and Calm's BACKGROUNDS.
- const (5): `BACKGROUNDS`, `backgroundOf`, `sceneInfo`, `sceneRoomDbg`, `sceneLevelDbg`
- fn (4): `loadThree`, `sceneOpen`, `sceneClose`, `setBackground`

## src/views/stack.js
VIS1a (RUN 6, docs/VIS1-design.md §4) — THE COMPOSITOR: visual modules drawn in LAYER order, bottom to top — scene (the WebGL room, VIS1b) · background (the camera picture) · instrument (the play s…
- const (2): `LAYERS`, `stackList`
- fn (3): `stackAdd`, `stackSet`, `stackFrame`

## src/views/strip.js
DRAW1 (DAY run 2026-10-16): the play strip, the arrangement window and the mixer (drawLooper, loopView, their hit tests and probes) — moved from draw.js verbatim (draw.js is the facade).
- const (4): `laneCol`, `laneTitle`, `loopViewProbe`, `loopViewClear`
- fn (7): `laneDefName`, `loopHit`, `loopBeatAt`, `stripProbe`, `loopScroll`, `arrGeom`, `drawLooper`

## src/vision.js
(no head comment)
- const (10): `video`, `canvas`, `ctx`, `modelInfo`, `visionOpts`, `VISION_DEF`, `lowInfo`, `pathInfo`, `pumpStats`, `camStats`
- fn (19): `initVision`, `initDetector`, `startCamera`, `switchCamera`, `setHandsSink`, `pollFrame`, `camInfo`, `setHandsTracked`, `setModelDelegate`, `setCamFps`, `setDetectPath`, `setLowLight`, `pumpDbg`, `pumpStepDbg`, `detRunDbg`, `lowDbg`, `camSimDbg`, `camOpenDbg`, `camStatsDbg`

_145 modules, 1978 exported names._

# Removed (stale) code names — kept by hand; copied into the generated docs/NAME-INDEX.md by tools/name-index.mjs

## Stale names
- Stale names to ignore (removed): `backing.js`, `playRec`, `toggleRec`, `stopRec`, `recStart`, `drawChordSectors`, `sectHyst`, `S.sect`,
  `TYPED_CH_VOL`, `uiMode`, `drawPC`, `drawBar`, `zoneAt`, `zoneX`, `FXW`/`ZB`, `modeBtn`, `applyMode`, `.phone`, `#modeHint`, `#arrHint`,
  `#helpBtn`, `swapHands`, global `theremin`, `thereminBtn`, `swapBtn`, `drawThereminGrid`, `BEATS_PER_BAR` as a constant, `handRole`,
  `jamStep`/`applyJam`/`jamTo`, `jam.*` keys, `loop.first`, `setRegion`, `takeEv`, `revDisp`, `chBrightDisp`, `drawChordBright`,
  `verb`/`verbOut`/`revLead`/`revCh`, `leadOwner`, `fxAttach`/`fxRoleBus`/`fxRoleOut`, `roleXDriven`, `bassOwner`, `soloNoteHand`,
  per-voice `dlySend`/`revSend`, `RELEASE_TAILS` as a rule, `vision.setPicture`, `VISION_DEF.picture`, `swPicMatched`/`swPicLive`,
  `diag.sw.pic*` keys, latmeter report `detection.picture` (LAT3: the live-camera picture switch removed), `scaledata.js`, `R.liveReverb`, `DBG.fdnLive`, `R.powerOld`, `RECT_OCT`, `ROLL_CH_EXTRA_REG`, `SWARA_OF`/`SHRUTI_OF`, `swaraLbl`/`swaraOfCents`, `gridNoteLbl`/`rectNoteLbl` pair as two functions, `rollGroups`, `#rollScale`, `rollSnapRow`, `soloEditBlock`, `tiAudit`/`tiRestamp`, `fxVolFix`/`setFxVolFix`, `chainXDriven`, `frzArmAll`, `setChBrightDisp`, `setRevDisp`, `setLiveRevWiring`, `modeDerive`/`TBL`/`RATIOS`/`CM`, `scaleIdx`, `sameDegrees`, `compat.tag`, `R.liveReverb`, the ScriptProcessor capture.
