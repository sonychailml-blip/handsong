# NAME INDEX — code names by module (consult by grep only; do not read top to bottom)

Moved out of `CLAUDE.md` (AF3 part 0) to keep it short. Rules live in `CLAUDE.md`; this file only lists names. Meaning of a name:
grep `archive/CLAUDE-full.md` and the code. Line numbers are never recorded here.

## Module map — full name lists (as in CLAUDE.md before AF3)
- `index.html` — markup only: start card (Play / Learn, `#fsBtnStart`, `#installBtn`+`#installHint`, footer `#langSel`/feedback/
  donate, `#loadmsg`), top bar, three panels (`#panelScale` scale/tonic/A4/layout/fingers/triads; `#panelSound` timbres with voice-mode
  rows `vmLdPoly`/`vmLdLead`/`vmBsPoly`/`vmBsLead`, hand functions, finger actions, effects constructor; `#panelLoop` backing length/
  metre/BPM/quantise/division/arrangement), `#backingMenu`, help overlay, `#tutorBar` + `#lessonOv`, transport `#loopTransport`
  (▶ `loopBtn` · ⟳ `rgnBtn` · ⤺ `undoBtn` · ✕ `clrBtn` · ■ `panicBtn` · ✎ `rollBtn` → arrangement window; ⏮ `rollHome` hidden in play;
  class `.roll` → only ⏮ ▶, `.arr` → ⏮ ▶ ⟳), `#arrBar` (✕, zoom −/+, ⤢, face 🎚/▤), `#rollBar`, `<video>`/`<canvas>`. Base path relative.
- `style.css` — all CSS. `manifest.json`/`sw.js` — PWA; the SW is deliberately cache-free (empty `fetch` handler, only so Chromium
  fires `beforeinstallprompt`).
- `src/config.js` (leaf, imports nothing) — gesture thresholds, scheduler timings, pool sizes, FX-bar and palette geometry
  (`CH_PAL_*`, `PAL_HYST_X/Y`, `palColX`/`palRowY`, `palSplitX(x0,x1)` — the single palette|notes split), `rectBandY(i,H,nRect)`,
  `CAM_MARGIN=0.12`, `remapAxis`, `coverView(vw,vh,W,H,M)` (the single cover-crop computation), the volume curve `volAmp(v)=v²`,
  `volVel(role,a)`, `volFromOld(role,v)=√(floor+(1−floor)·v)` (old floors: solo 0, chords 0.25, bass/drums 0.3), `AUT_RAMP_BEAT` 1/16,
  `AUT_RAMP_EPS` 0.01, fine recording `REC_FINE_EPS` 0.01 / `REC_AVG_S` 2 / `REC_JUMP_EPS` 0.03 / `REC_HIST_S` 20 / `REC_PAUSE_S` 0.5 /
  `REC_KNEE_F` 50, `INSTR_COL` (the ONE role palette, different LIGHTNESS: bass #20946b L*54.6, chords #b18cff 66.0, solo #ffb050 77.8,
  drums #ffe680 91.4), `LANE_NOROLE_COL`, `LANE_NAME_*` (17 % of the strip, 48–100 px), `ARR_ROW_H` 40, `ARR_HANDLE_W` 28.
- `src/state.js` — cross-cutting musical/layout state + setters: `scaleId`, `tonic`, `aRef` (380–480), `tunedFrom` ('T' or 0..11),
  `seventh`, instrument indices `leadIdx/chIdx/bassIdx/drumKitIdx`, `fx` = solo-only scalars `{vib, drv, trm}`, `latchDeg/latchTy`,
  `chordFam/chordVar`, `phoneInstr`, `handFn` (defaults `ld:{fx,note}`, `bs:{note,note}`, `ch:{latch,latch}`, `dr:{hit,hit}`;
  `setHandFn`, `handFnOf`, `roleHasTherm`, `roleHasFx`, `roleHasExpr`), `handActs` (finger actions, today `chFam`), `voiceMode`
  (`{ld:'poly', bs:'lead'}`, `setVoiceMode`, `isLeadMode`), `pinchFingers` (1..4, default 4), `splitOn` + `SPLIT_ROLES` +
  `phoneHalves(W)` (the only `W/2`), per-role registers `octReg/bassOctReg/chordOctReg` via `rectOctReg(role)`/`setRectOctReg`,
  `rectPref` ('auto'|'rect'|'rows'), camera (`camFacing`, `mirrored()`, `flipX`, `sx`/`sy`, `viewRect`), `videoRec`, display mirrors
  (`exprDisp`, `exprBrightDisp`, `looperMsg`/`looperClear`), `chordModeSel`/`chordModeVer`, `laneRow0`, editor/window state (`rollOpen`,
  `arrOpen`, `arrFace`, `rollBeat0/rollSpan`, `rollRole`, `rollSel`/`rollSelNote`, `laneDrag`). **Chain-owner key:** `CHAIN_ROLE`,
  `chainKeyOf(role)` → `'role:ld'`, `CHAIN_SOLO`, `fxChains`, `fxChainOf(key)`, `FX_VOL`, `fxVolReset(key)`, `fxChainMove`,
  `chainOwners()` → `[{key, kind}]`. ⛔ The key is OPAQUE — equality and indexing only, never parsed.
- `src/hooks.js` — nullable callbacks for lower layers (`leadInstr, bassInstr, drumKit, rec, loop, tutor, scales`).
  `hooks.tutor(kind,payload)` is the tutorial's single channel.
- `src/i18n.js` — `LANGS=['en','ru']` (`es`/`de` prepared, not enabled), `DICTS`, `t(key,params)` (dict → en → `params.def` → the key),
  `L(field)` (data names), `store` (localStorage with memory fallback), `lang`, `setLang`, `onLangChange`, `applyI18n` (`data-i18n`,
  `data-i18n-title`, `<html lang>`); persisted as `handsong.lang`.
- `data/` + `src/scaleload.js` — ALL scale data are JSON files (v1): `data/index.json` (manifest; mode order = menu order = F0 index
  `i`), `data/menu.json`, `data/tunings/`, `data/modes/`, `data/palettes/`, `data/chordmodes/` (file name = id); comments in
  `data/README.md`. `loadScaleData`/`loadReport`: fetch (`no-cache`), validate per file (shapes, ranges, rising pitches, ratio/cents
  agree, degrees, palette kind vs tuning, chord-mode `set` whitelist, unique ids); a broken file is SKIPPED (one console line,
  `#loadmsg` notice); manifest/menu unreadable or nothing valid → the embedded EMERGENCY PAIR (`edo12`, `chromatic`, `chrom12`). Since
  F6, USER files (IndexedDB `handsong-user`/`files`, key `kind:id`, ids `u.<uuid>` — `scaleload.USER_ID`) load after the built-ins
  through the same validator.
- `src/userstore.js` / `src/userfiles.js` — user file storage (IndexedDB, else `store`) and the console/back-end API (`install`, `list`,
  `remove`, `exportFile`, `example`, `installExample`, `brokenExample`, `storeUnchecked`; `window.U` with `?probe`); effective
  immediately via `scales.registerRecord`/`unregisterRecord`; a record others depend on can't be removed (`scales.dependentsOf`);
  deleting never breaks recordings (views pin their tuning, `TUNING_OF_MODE`, `SRC` WeakMap; `P.checkUserDelete`).
- `src/scales.js` — the teaching layer and pitch truth. Top-level `await loadScaleData()`; builder → `TRADITIONS` (6), `GRP`,
  `TUNINGS` (18), `CHORD_FAM_SETS`, `SCALES` (74, 0..73). Pitch: `a3()=aRef/2` → `baseF()` and `cFix(s)`; `anchorOf`, `keyOf`,
  `tonicFreq(s)`, `periodOf(s)=s.period||2`; ONE pitch function `pitchHz(T,A,z,k,R)=A·P^R·ρ(k)` (⚠️ keep its multiplication order);
  `modeAnchor`, `degK`; `leadFreq`/`bassFreq`/`chordFreqs`/`centsOf` and the index versions `leadFreqTi`/`bassFreqTi`/`chordNotesAt`/
  `chordFreqsAt`/`chordRowFreqAt`; `chordNotes` (`{f, iv}` per note; `chordFreqs` = its frequencies), `chordUnit(s)` (the one-note
  root type per branch), `chordReadsTi`, `tuningIndexOf`, `modeSlotOfTi`, `chordPitchHz`, `ruleChordSteps`, `stackLabel`,
  `chordTypeFits`, `chordAtRoot` (F8), `chordBuildOf`, `chordModeOf`/`chordModeName`/`chordModeHint`, `scaleView` + `CUR()` (memoised
  view), `viewIdOf`, `scaleById`, `viewOfId`, `applyScaleId` (aliases), `tuningOf`, `namingOf`, `listLbl`/`listName`, `regWord`/
  `regWordFull`, `tuningStatus`, `droneDegree`/`droneSecondHz`, `backingRhythmOf`, `seventhAddsNote`, `menuOf`, predicates
  (`supportsProgressions`, `supportsChords`, `typedChords`, `rectGrid`, `fixedKey`), rect helpers (`rectLayout`, `REG_N`,
  `rectNoteAt`/`rectSlotOf`, `rectBase`/`rectBaseMax`, `rectEligible`, `rectDefault`, `rectRows`/`rectNotes`/`rectRowsFull`),
  theremin `thereminSpan`/`thereminHz` (M = `rectNotes()` under rectangles). `registerRecord`/`unregisterRecord`/`dependentsOf`.
- `src/audio.js` — the Web Audio engine (see "Audio engine"): pools, three synthesis paths, drums, drone, metronome, FDN reverb, effect
  modules (`FX_FACTORY`), chain wiring, capture/playback helpers, track level/pan (`setTrackGainOf`, `ownerGain`, `trackGainRetune`,
  `setTrackPanOf`, `ownerPan`, `panGains`, `trackPanRetune`, `makePanStage`), master (`setMasterLevel`, `masterLevel`, `masterMeter`,
  `MASTER_BASE` 0.8), frozen-track store/reader (`frzReady`, `frzStorePut`, `frzStoreDel`, `frzStoreDbg`, `frzReader`, `frzStoreCount`,
  `frzSink`), `voicesCut`, `xfRamp`, `timbresOf(role)`, `createRecordingTap()`, probe helpers (`probeCapture`, `probeCaptureReady`,
  `fxDipLog`), render helpers (`renderReset`, `renderStateOf`, `setRnd`, `setOffline`, `offlineTapMaster`, `setDbg`).
- `src/ks-worklet.js` — Karplus–Strong processor `ks-string` (mandatory worklet: a native delay loop is floored at 128 samples ≈ 344 Hz
  and quantised); first-order allpass fractional delay + loop-filter phase compensation (< 1 cent); a-rate `freq`/`pluck`; in track
  renders seeded via `processorOptions.seed` (own `mulberry32`); live stays on `Math.random`.
- `src/frz-worklet.js` — frozen-track STORE (`frz-store`: transferred Int16 chunks; `put`/`del`/`dbg`/`count`) and READER (`frz-reader`:
  context frame F ≥ startF plays buffer frame F + d, integer frames, × the track scale; `{play:{startF,d}}` for spares; `{stop:frame}`;
  reports `{ended, played, first, seen}`; `ready` once processor and data exist; `ALIVE` count). Frame never goes backwards
  (`max(currentFrame, prev+128)` — Chrome sometimes repeats `currentFrame`). Loaded on the LIVE context only.
- `src/probe-cap-worklet.js` — probes only: capture of the live master on the audio thread (`probe-cap`), returning `F0` (frame of the
  first sample = the most common `currentFrame − samples so far`), `gaps` (real discontinuities), `stale` (single stale readings).
- `src/arrange.js` — arrangement data + pure generation: `PROGRESSIONS`, `HARMONIES`, `RHYTHMS` (18 patterns; `beats`, optional `sub`,
  `subOf`, `gridOk`, `rhythmFits`, `rhythmsForMetre`), `BASS_MODES`, `buildArrangement` (also drums-only `sel.prog<0`). Volumes in the
  OLD per-role scale (`CHORD_VOL` 0.55, `BASS_VOL` 0.6), converted at event birth by `volFromOld`. Imports only `config.js`.
- `src/recorder.js` — the recorder (see "Time, tracks and the recorder" and "Freeze"): `events` (stable array), `loop`, `W*`/`ENG`
  (`makeENG(engine)`), scheduler, lanes, brace, chase, undo, stops, `softAllOff`, `loadArrangement`/`loadJam`/`clearJam`, capture
  (`takeFx`, `takeFxVer`/`takeFxTouch`, `takeCapStart`/`takeCapSample`, `fineStep`/`fineKnee`, `FX_CHAIN='#chain'`), playback
  (`fxPlayBuild`/`fxPlayDrive`/`fxPlayStop`/`fxPlaySignature`/`fxIsDriven`, `fxLaneMerge`, `fxLaneAt`, `fxLaneExpand`, `fxLaneSmooth`,
  `autSmoothOf`), the editor API (`songNotes`/`songSegs`, `editOpen`/`editClose`/`editGuard`/`editPush`/`editUndo`/`editRedo`/
  `editBatch`/`editCommit`, `EDIT_ROLE`, `editMoveHit`/`editDeleteHit`/`editInsertHit`, `editMoveSeg`/`editResizeSeg`/`editDeleteSeg`,
  `editInsertBass`/`editInsertChord`/`editInsertLead`, `editDeleteChordNote`/`editMoveChordNote`/`editResizeChordNote`,
  `dissolvePlan`, `detachPlan`/`commitDetach`, `chordMoveTy`, `slotPt`, `tiePartners`/`tieUntiePass`, `editSetTimbre`, `aut*` lane
  functions, `pnPlan`/`pnView`/`pnPoints`/`pnFreeze`), lane tables (`laneLevel`, `lanePan`, `laneName`, `laneRank`, `laneOrder()`,
  `moveLane`, `laneLook`, `laneRoleOf`, `laneTimbreOf`, `noteSource`), freeze (`freezeSig`, `freezeTicket`, `freezeSet`, `frzWhenReady`,
  `frzPack`/`frzPackAsync`, …), `seedTake`, `probeWithEvents`, `evHz`, `evReg`.
- `src/frzqueue.js` — the automatic-freeze QUEUE (AF1, console only): lazily loaded by `render.js` (`setRunner(render.freeze)`); by
  track id, one entry per track, one render at a time; priority `qRank` (audible first, then `untilHeard`, song order, layer); gates
  (never while recording or a clip records; while a hand pinches a track waits if its layout costs more than `QF.frameMs` 8 ms; checked
  at pick and again before layout via `layoutGate`); stale results never install (re-queued); a track is taken only after its
  signature is stable for `QF.settleMs` 1 s. Console `R.autoFreeze(true|false)`, `R.freezeQueue()`. No watcher/triggers (AF3).
- `src/vision.js` — camera + the detection path + the frame pump (`video`, `canvas`, `ctx`, `roundRect` polyfill, `resize`, `initVision`,
  `openCamera(facing)`, `switchCamera` — the detector is never recreated by a camera switch; `landmarker` is stale since LAT2, see below).
- `src/clip.js` — clip/audio recorder: `startClip('video'|'audio')`/`stopClip`, `activeKind()`, `onClipChange(fn)`, `captureFrame()`
  (called last in every frame, throttled to `REC_FPS` 30; stream via `canvas.captureStream(0)` + the audio tap; bitrate from canvas
  size ≈ 0.12 bit/px/frame, 3.5–12 Mbit/s); `recKind` is the single truth; sets `videoRec` only for video, only once recording starts.
- `src/demo.js` — start-screen tunings demo (own mini-engine, own `noiseBuf`); scenes by stable id (`SCENES[].id`), captions `demo.scene.*`.
- `src/tutor.js` — lesson list + step engine (see "The tutorial").
- `src/gestures.js` — the gesture state machine: `HANDS`, `processHands`, `chOwner`, `monoOwner[role]`, `polyZone`/`leadZone`,
  `liveKey(role,hand,finger)`/`monoKey(role)`, `wOn`/`wOff`, `voiceModeReset(role)`, `degHyst`/`degRaw`, `axHyst`/`cellHyst`,
  `noteVolOf(zk,xn,zOf)`, `depthOf(S,lm)` (depth smoothed ONCE per hand per frame, memo `S.hsF`), `noteHandRole(key,S,W)`, `handHalfRole`,
  `fxChordBri()`, `fxParamsOf` (the aim's single door), `ACTIONS`, expression (`EXPR_CFG`, `exprFeatures`, `EXPR`, `tickExpr`),
  `rectPlay`, the `'oct'` zone, looper hand (`fireLooperCmd`, `doLooper`), `tutorTap`. At pinch capture the hand's role and X-range are
  frozen on `S` (`S.role`, `S.rx0`, `S.rx1`, `S.zone`, `S.fn`).
- `src/draw.js` — canvas: `drawVideoBackground`, `drawOverlays` → `drawPhone`, `drawRole(instr,rx0,rx1,playH)`, `drawHandsPhone`, grids
  (`drawGrid`, `drawRectGrid`, `drawRectOctBand`, `drawThereminLines`, `drawDrumGrid`, `drawChordPalette`), `drawChordReadout`/
  `latchChordFreqs`, `drawFxBars(role,rx1,H)` (+ `fxBarHidden`), `drawStatus` (`scales.tuningStatus`), `noteLbl` (the one label
  function), `tunPitchLbl`, the editor (`drawRoll`, snapshot `rollView`, `rollAxis(view, all)`, `rollGroup`, `rollSegRows`/
  `rollSegNotes`/`rollSegRoot`, `chRowOfFreq`, `rollChordTotal`, `rollGutterW`, `rollDragTarget`, `rollGhostSeg`, `rollBendPts`,
  `drawAutLane`), `drawLooper(full)` (strip and arrangement window; snapshot `loopView`; `laneBeatX`/`laneBeatAt`; `loopHit`,
  `loopBeatAt`, `loopScroll`, `arrGeom`, `mixGeom`, `stripCols(W,markW)`, `stripProbe(W)`, `laneMini`, `laneTitle`, `laneDefName`,
  `laneCol`).
- `src/ui.js` — menus, buttons and handlers: `buildUI`, `fillScales`, role buttons (`instrBtn`, `instrBtnL/R`, `cycleHalf`), split
  (`splitBtn`, `applySplit`, `canSplit()`), camera, fullscreen, clip buttons, backing (`#backingMenu`, `backingStep`, `backingName`),
  canvas pointer routing (strip taps via `loopHit`), effects panel `renderFxCtl` (two zones, two add lists), voice-mode buttons
  (`pickVoiceMode`), hand functions `renderHandFn`, A4 control, layout control `renderRectCtl`, chord modes `renderChordMode`, "tuned from"
  `renderTunedFrom`, metre `refreshMetreCtl`, auto-hiding bar (`BAR_HIDE_MS` 3500, `MOUSE_EPS` 8), start card (install by capability,
  `FEEDBACK_URL`, `DONATE_URL` — empty hides the line, JS-assembled mail fallback), the editor (`openRoll`/`closeRoll`, `rollEnterTrack`,
  `ROLL_INSERT`, `renderAutCtl`, `#rollShape`, `renderTimbreCtl`, `rollDeleteSel` — 🗑 and ⌫/Delete, not in text fields), arrangement
  (`openArr`, `arrApi`, `#laneNameIn`), `onFreeze(layer)`, tutorial helpers (`tutorReset`, `tutorSetScale`, `tutorResetHandFn`,
  `tutorClearLoop`, `tutorSplitInit`, `tutorSyncBar`, `syncTutorBarPos`, `hushStrip`, `armStripReturn`).
- `src/main.js` — composition root: `loop()` (frame: video → detect → `handsGuarded(processHands)` → overlays → `captureFrame`; each
  distinct error printed once), `startApp()` (the one start path), editor/window branch (camera open but not read: `processHands(null)`
  every frame, `latest`/`lastTs` cleared), `?probe` loading (`window.P = scaleprobe.api()`, `window.R`, `window.U`).
- `src/render.js` — render context, seeding and track render behind freeze (see "Freeze"): one engine copy per session
  (`'./audio.js?render…'`, `ENG_SPEC` constant, `ENGP` memo — ⛔ never a unique specifier per render), `renderTrack(layer, opt)`,
  `freeze(layer)`, `unfreeze`, `frozen`, `renderQueued` (ONE render at a time; ⛔ no third door, never await one render inside
  another), `renderQueue()`, `probe()` (F0–F2 facts), `layoutCost`, `autoFreeze`/`freezeQueue`, ear tools (`aud`, `live`, `stop`,
  `recSteps`, `droneBP`), probe bodies (`reuseCheck`, `revAgree`, `swapCheck`, `chunkCheck`, `copyState`, `capStats`, `capAligned`).
- `src/songs.js` — demo songs loaded by `P.song(name, {replace:true})` (today `triphop`, ≈2:41, 84 BPM, 4/4, D minor, seven tracks + a
  D–A drone backing); one take per ROLE; sets tonic/A4/tempo/metre/scale through the panel's controls; refuses while recording,
  playing, with the editor open, or on a non-empty song without `replace`.
- `src/scaleprobe.js` — the browser probe (`P`): `all`, `quick`, `seed`, `song`, `api`, ~50 checks, `material`, `meas`, `orderCheck`,
  `freezeCost`, `dumpScales`, `renewSnapshot`. `src/probedata.js` + `tools/probe-data.mjs` — the node-runnable part (T0, T1, T2, T6b,
  stacked chords, F4; frozen references; imports only scales/state/i18n). ⛔ Nothing touching draw/ui/audio/recorder/userfiles goes there.
- `tools/check-static.mjs` (static checker), `tools/probe-browser.mjs` (browser runner), `tools/scales.before.json` (F0 snapshot).

## Other code names, by module
- `src/audio.js`: `REV_PARAMS`, `applyVoiceFx`, `backBus`, `bassBus`, `bassSet`, `buildChordPool`, `bvRelease`, `chordBus`, `chordGlide`, `chordOn`, `cvAlloc`, `cvRelease`, `dDum`, `dNoise`, `dTek`, `droneOff`, `droneOn`, `dronePan`, `drumBus`, `drumVoice`, `exprCur`, `exprGain`, `exprVibAmp`, `fstrike`, `fxAimGet`, `fxAimSet`, `fxBriOf`, `fxDefFor`, `fxDefaultsOf`, `fxGate`, `fxGlideOf`, `fxHandRange`, `fxParamKeysOf`, `fxParamMetaOf`, `fxPathOf`, `fxRestoreAim`, `fxSnapshot`, `fxWrapParam`, `gMax`, `hitOwner`, `leadRelease`, `leadVoiceBank`, `makeReverbFx`, `modGain`, `scheduleBend`, `setLeadInstr`, `tabNa`, `taikoDrum`, `taikoKa`
- `src/clip.js`: `fireChange`, `videoBitrate`
- `src/config.js`: `CH_PAL_GAP`, `CH_PAL_HEAD_H`, `CH_PAL_PAD`, `CH_PAL_W`, `PAL_HYST_Y`
- `src/draw.js`: `fitLeadNotes`, `handLeadNotes`, `packSegs`, `rollHit`, `rollRow0Across`, `rollRowPitch`, `rowOfTi`
- `src/frzqueue.js`: `qAdd`, `qBegin`, `qCostOf`, `qCostSet`, `qEnd`, `qRunning`, `qState`, `qStep`
- `src/gestures.js`: `depthN`, `octRight`, `pinchRatios`
- `src/i18n.js`: `LANG_LABEL`
- `src/probedata.js`: `TAG_OF`, `allViews`, `checkBehaviour`, `checkData`, `checkPitch`, `checkStack`, `checkUntyped`, `checkView`, `isTert`, `legacyBassFreq`, `legacyCentsOf`, `legacyChordNotes`, `legacyChordSteps`, `legacyLeadFreq`, `legacyTonicFreq`, `sweep`, `tagOf`
- `src/recorder.js`: `WbassOff`, `autChainMove`, `autChainRemove`, `autDeletePoint`, `autMovePoint`, `autTakesOf`, `bassOwnerKey`, `bassSlot`, `braceMove`, `braceTap`, `chOwnerKey`, `chaseNote`, `clearRec`, `curBeat`, `curChordOct`, `deleteLane`, `droneLevel`, `dronePanOf`, `droneSyncAt`, `editApply`, `editTake`, `frzEnter`, `frzKill`, `frzPinned`, `frzSkipNear`, `hlOf`, `inPB`, `isLayer`, `isTrackOwner`, `laneDelTap`, `laneLayerOf`, `laneLen`, `laneNameOf`, `laneShowKeep`, `layerOfOwner`, `ldKey`, `liveDrone`, `loopPos`, `pnAdd`, `pnDelete`, `pnMove`, `pnShape`, `pnStripMoves`, `pushLy`, `recBassEv`, `recChSet`, `recLead`, `recLeadEv`, `segChordNotes`, `setLaneName`, `setLoopBars`, `setLoopChordHl`, `setLoopSub`, `setRegionOn`, `songBeats`, `songLen`, `storeTi`, `takeJoin`, `takePrune`, `takeReset`, `takeSrc`, `toggleLaneMute`, `toggleLaneSolo`
- `src/render.js`: `maxRel`, `pinLive`, `renderOnce`
- `src/scaleload.js`: `checkRecord`, `chordModeSets`
- `src/scaleprobe.js`: `checkFrozen`, `checkHl`, `checkLabels`, `checkMerge`, `checkRevAgree`, `checkRootAlone`, `checkRowFix`, `checkRows`, `checkSeed`, `checkSong`, `checkSound`, `checkSwap`
- `src/scales.js`: `IVX`, `buildChordModeSet`, `buildMode`, `buildPalette`, `buildTuning`, `chordLabel`, `chordNotesStr`, `grpKey`, `rootName`, `rowLabel`, `scaleData`, `scalesOfTrad`, `stepName`, `tradOfScale`, `untypedNotes`
- `src/state.js`: `chFitDeg`, `fxChainAdd`, `handActsOf`, `handSide`, `latchOct`, `playsNotes`, `scaleIdx`, `setARef`, `setCamFacing`, `setChordMode`, `setHandAct`, `setLooperClear`, `setRectPref`, `setScaleId`, `setSplitRole`, `setVideoRec`, `setViewRect`
- `src/tutor.js`: `openLessons`, `wireStarter`
- `src/ui.js`: `FB_MAIL_USER`, `HAS_HANDFN`, `INSTR_SEQ`, `JR_BY_ID`, `aRefSel`, `applyBacking`, `applyRollBar`, `applyVoiceMode`, `armBarHide`, `autShapeState`, `backingMode`, `backingTo`, `buildStartLinks`, `drumVariants`, `fitRhythm`, `onResize`, `panelOpen`, `renderHandActs`, `resetJamDisplay`, `revealBar`, `rollDown`, `rollMove`, `rollUp`, `rootRow`, `showCamMsg`, `trackLayers`, `updRollBtns`

## Stale names
- Stale names to ignore (removed): `backing.js`, `playRec`, `toggleRec`, `stopRec`, `recStart`, `drawChordSectors`, `sectHyst`, `S.sect`,
  `TYPED_CH_VOL`, `uiMode`, `drawPC`, `drawBar`, `zoneAt`, `zoneX`, `FXW`/`ZB`, `modeBtn`, `applyMode`, `.phone`, `#modeHint`, `#arrHint`,
  `#helpBtn`, `swapHands`, global `theremin`, `thereminBtn`, `swapBtn`, `drawThereminGrid`, `BEATS_PER_BAR` as a constant, `handRole`,
  `jamStep`/`applyJam`/`jamTo`, `jam.*` keys, `loop.first`, `setRegion`, `takeEv`, `revDisp`, `chBrightDisp`, `drawChordBright`,
  `verb`/`verbOut`/`revLead`/`revCh`, `leadOwner`, `fxAttach`/`fxRoleBus`/`fxRoleOut`, `roleXDriven`, `bassOwner`, `soloNoteHand`,
  per-voice `dlySend`/`revSend`, `RELEASE_TAILS` as a rule, `vision.setPicture`, `VISION_DEF.picture`, `swPicMatched`/`swPicLive`,
  `diag.sw.pic*` keys, latmeter report `detection.picture` (LAT3: the live-camera picture switch removed), `scaledata.js`, `R.liveReverb`, `DBG.fdnLive`, `R.powerOld`, `RECT_OCT`, `ROLL_CH_EXTRA_REG`, `SWARA_OF`/`SHRUTI_OF`, `swaraLbl`/`swaraOfCents`, `gridNoteLbl`/`rectNoteLbl` pair as two functions, `rollGroups`, `#rollScale`, `rollSnapRow`, `soloEditBlock`, `tiAudit`/`tiRestamp`, `fxVolFix`/`setFxVolFix`, `chainXDriven`, `frzArmAll`, `setChBrightDisp`, `setRevDisp`, `setLiveRevWiring`, `modeDerive`/`TBL`/`RATIOS`/`CM`, `scaleIdx`, `sameDegrees`, `compat.tag`, `R.liveReverb`, the ScriptProcessor capture.
## Added at AF3 / AF4
- `src/frzqueue.js`: `AF_DELAY`, `AF_REFREEZE_ON_RETUNE`, `AF_BUDGET_MB`, `AF_TOUCH`, `AF_EST`, `wScan`, `wants`, `watchSig`, `afHint`, `afTick`, `afPause`, `afIdle`, `afBusy`, `afActive`, `afRowState`, `afBegin`, `afEnd`, `heldLayer`, `estBytes`, `fitsBudget`, `budgetBytes`, `PANHOLD`, `LVL`
- `src/recorder.js`: `frzWatchKey`, `frzWatchVer`, `frzRetuneOnly`, `frzSigNoRetune`, `laneHasChain`, `frzBytesTotal`, `frzBytesOf`, `songPinChains`, `editInsPush`
- `src/render.js`: `releaseBuf`; `freeze` options `admit`, `keepBuf`; refusal `'budget'`
- `src/draw.js`: `ARR_DOT_W`, `ARR_DOT_R`, `ARR_DOT_PULSE_MS`; snapshot fields `loopView.dots`, `loopView.markW`
- `src/ui.js`: `panHeld`, `panHold`, `panRelease`
- `src/hooks.js`: `hooks.af`, `hooks.afRow`
- `src/scaleprobe.js`: `checkAutoFreeze` (row «AF3 auto-freeze watcher»)
- `tools/probe-browser.mjs`: `window.__heap()` (in `--eval`)
- Removed (stale since AF4): `#rollFrz`, `#rollFrzState`, `rollFrzBtn`, `rollFrzStateEl`, `ui.onFreeze`, `frzBusy`, `frzNoticeShown`, `frz.*` i18n keys, the window hit `'frz'`, `FRZ_MARK_X`, `FRZ_STALE_DX`

## Added at RENDER-LEAK / AF5
- `src/render.js`: `renderKsLazy`, `KS_LAZY`, `usesKS`; report field `ksLoaded`
- `src/audio.js`: `LEAD_KS_FROM` (exported), `leadOutT`, `chordBusT`, `bassBusT`, `drumBusT`, `trackRouteOf`, `setTrackRouteOf`, `voiceRoute`, `routeAt`, `routeOfOwner`, `chainStateOf`, `bldShim`, voice fields `rt`, `shim`; `fxPlayPath(key, ids, hard)`
- `src/state.js`: `CHAIN_TRACK`, `trackChainKeyOf`
- `src/recorder.js`: `liveIso`, `setLiveIsolation`, `playKeyOf`, `fxPlayHard`, `frzOwnedKey`, `fxPlayDriving`; `songPinChains()` result `soloMaps`, `soloSnap`
- `src/scaleprobe.js`: `checkLiveIsolation` (row «AF5 track and live isolated»), `seedFrozenSamples`, `SEED_REC.soloSnap`
- `tools/probe-browser.mjs`: `--leak`, `LEAK_PAGE`, `LEAK_N`, `LEAK_MARGIN_MB`, `procMem`, `window.__procMem()`
- AF5-mixer: `recorder.setLiveLeakDbg`, `liveLeakLy` (probe control); `render.liveCheck` (`R.liveCheck()`); probe helpers `voiceRead`, `LIVE_KEYS` in `checkLiveIsolation`

## Added at ED1 / ED2
- `src/recorder.js`: `segPitchPt`, `editGroup`, `editRemap`, `selGroups`, `editMoveWhole`, `editMoveSel`, `editDeleteSel`, `evSeq`, `evSeqN`, `evSeqFill`, `evOrder`; ED2 `editClip`, `runNote`, `clipOf`, `editCopySel`, `editClipInfo`, `pasteBlock`, `editPasteWhy`, `pasteClip`, `editPaste`, `dupOffset`, `editDuplicateSel`
- `src/state.js`: `rollSelMany`, `setRollSelMany`, `rollPick`, `setRollPick`, `rollBox`, `setRollBox`
- `src/draw.js`: `rollShiftPit`, `rollBoxHits`, `rollSelectable`; `rollDrag.many {dt, dr}` (group ghost)
- `src/ui.js`: `selList`, `selHas`, `selMany`, `selToggle`, `groupDrive`, `groupCommit`, `rollCopy`, `rollPaste`, `rollDuplicate`, `rollPickBtn`, `rollCopyBtn`, `rollPasteBtn`, `rollDupBtn`; `rollGrab.group`, `rollPan.box`
- `index.html`: `#rollPick`, `#rollCopy`, `#rollPaste`, `#rollDup`
- `src/i18n.js`: `roll.pickTitle`, `roll.groupNo`, `roll.groupOut`, `roll.copyTitle`, `roll.pasteTitle`, `roll.dupTitle`, `roll.copied`, `roll.pasteEmpty`, `roll.pasteRole`, `roll.pasteView`
- `src/scaleprobe.js`: `checkSelect` (row «ED1 several notes at once»), `checkPaste` (row «ED2 copy, paste, duplicate»)

## Added at ED5 / ED6 (and the runner hygiene)
- `src/recorder.js`: ED5 `pnBars`, `editVolSel`; ED6 `secMarks`, `secSeq`, `songHist`, `songFuture`, `secCopy`, `sections`, `secIns`, `secCut`, `isOffFn`, `songPrint`, `printSame`, `secLaneVal`, `secPlan`, `secApply`, `secCommit`, `secUntie`, `songEditWhy`, `songEdit`, `secName`, `secPush`, `secAdd`, `secRename`, `secDelete`, `songCanUndo`, `songCanRedo`, `songUndo`, `songRedo`, `songHistReset`, `braceSet`; probe only `secDbg` / `secForget`, `laneVerKeep`, `takeFxDump`; step kinds `'brace'`, `'marks'`, `'lanelen'`; `autdel` steps remember `at`
- `src/state.js`: `rollVolBars`, `setRollVolBars`, `secSel`, `setSecSel`
- `src/draw.js`: `drawVolBars`, `ARR_SEC_H`; snapshots `rollView.aut.bars`, `loopView.sec {y0, y1, marks}`, `arrGeom().sec`; hits `'autbar'`, `'sec'`, `'secband'`; `rollAutDrive` reads `G.vOnly`
- `src/ui.js`: `volBarsOn`, `rollVolBarsBtn`, `rollGrab.bar`; `updSecBtns`, `secOp`, `songStep`, `secTapAt`, `secBandTap`, `openSecRename`, `closeSecRename`, `barNo`, `secInsBtn`, `secCutBtn`, `secDupBtn`, `secDelBtn`, `songUndoBtn`, `songRedoBtn`, `secNameIn`
- `index.html`: `#rollVolBars`, `#secIns`, `#secCut`, `#secDup`, `#secDel`, `#songUndo`, `#songRedo`, `#secNameIn`
- `src/i18n.js`: `aut.bars`, `aut.barsTitle`; `sec.insTitle`, `sec.cutTitle`, `sec.dupTitle`, `sec.delTitle`, `sec.undoTitle`, `sec.redoTitle`, `sec.didIns`, `sec.didCut`, `sec.didDup`, `sec.stepDone`, `sec.changed`, `sec.needBrace`, `sec.noRec`, `sec.noEmpty`, `sec.nothing`, `sec.added`, `sec.removed`, `sec.renameTitle`
- `src/scaleprobe.js`: `checkVolBars` (row «ED5 volume bars»), `checkSections` (row «ED6 sections»)
- `tools/probe-browser.mjs`: `PROFILE_TAG`, `procList`, `runnerBrowsers`, `killTree`, `rmProfile`, `staleScan`, `LIVE`, `closeBrowser`, `closeAll`, `bail`; flags `--kill-stale`, `--clean-only`, `--selftest-exit sigint|error`

## Added at ED6-fix / ED7 / OWN2
- `src/recorder.js`: ED7 `HIST_MAX`, `HIST_MERGE_MS`, `hist`, `histFut`, `histOff`, `snapPend`, `takeTok`, `histGroupDepth`, `histDbg`, `histCanUndo`, `histCanRedo`, `histLen`, `histReset`, `histLabelOf`, `histPush`, `payId`, `pidOf`, `strHash`, `histHash`, `takeBegin`, `histSeal`, `laneRow`, `laneRowSet`, `laneDrop`, `snapState`, `snapBegin`, `snapEnd`, `snapApply`, `histTab`, `histMaster`, `laneNameStep`, `moveLaneStep`, `histApplyX`, `histTouched`, `histCommit`, `histUndo`, `histRedo`, `clearSong`, `deleteLaneDo`, `onUndoDo`, `loadArrangementDo`, `clearJamDo`; step kinds `'snap'`, `'tab'`, `'master'`, `'ranks'`; OWN2 `BEND_C_MAX`, `BEND_EPS`, `editBendPoint`, `bendDbg`
- `src/state.js`: `rollBendSel`, `setRollBendSel`, `rollBendDrag`, `setRollBendDrag`
- `src/draw.js`: `bendRowsOf`, `hzOfRow`, `rollBendAt`, `rollBendProbe`, `rollBendHandles`; snapshot `rollView.bend`; hit `'bendpt'`
- `src/ui.js`: ED6-fix `secRenBtn`, `secRenPend`, `secRenT`, `secRenDbg`, `SEC_BLUR_MS`, `arrApi.secRenameDbg`; ED7 `levelStep`, `HIST_KEY`, `histKeyOf`, `histUndoBtn`, `histRedoBtn`, `updHistBtns`, `afterHist`, `histDo`; OWN2 `rollGrab.bend`, `rollPan.bendAdd`
- `index.html`: `#secRen`, `#histUndo`, `#histRedo`
- `src/i18n.js`: `sec.renTitle`, `sec.hint`, `hist.*` (undoTitle, redoTitle, undone, redone, noUndo, noRedo, noRec, changed, `hist.k.*`), `roll.bendAdded`, `roll.bendFirst`
- `src/scaleprobe.js`: `checkHistory` (row «ED7 one history»), `checkBend` (row «OWN2 bend curve»)
- `tools/probe-browser.mjs`: `uiSecRename`, `uiBendDrag`; flag `--no-ui`
- Stale since ED7: `songHist`, `songFuture`, `songPrint`, `printSame` (recorder; ED6's song history merged into the one history); `editHist`, `editFuture` (renamed `hist`, `histFut`)

## Added at ED7-fix / BEND-CURVE / OWN1
- `src/config.js`: `CURVE_A`, `curveU`, `curveK`, `bendSeg`, `bendAt`, `bendSplit`, `BEND_GLIDE_STEP_S`, `BEND_GLIDE_TC`, `bendPlan`; bend point fields `sh` ('s'/'h'), `k`
- `src/audio.js`: `bendTap`, `bendTapSet`; `scheduleBend(owner, points, base, spb, from, when)`
- `src/recorder.js`: ED7-fix `histNoBrace`, `braceKey`, snap step field `br`; BEND-CURVE `bendEdited`, `bendNoteOf`, `bendCommit`, `editBendShape`, `autCurvePoint`, step kind `'autcurve'`, lane point field `k`, chase field `a.bendFrom`, section helpers `bendIns`, `bendCut`; OWN1 `trackViewOfLayer`, `trackModePlan`, `editTrackModeWhy`, `editTrackMode` (label `'mode'`; a `'move'` step may carry `sc`)
- `src/scales.js`: `degFrom`, `degTo`, `modesLikeView`, `mapDegrees`
- `src/draw.js`: `BEND_DRAW_N`, `bendPathOf`, `bendStroke`, `AUT_CURVE_N`, `rollAutValAt`; snapshots `rollView.bend.mids`, `rollView.aut.mid`; hits `'bendmid'`, `'autmid'`
- `src/ui.js`: `bendShapeState`, `renderModeCtl`, `rollModeEl`; `rollGrab.bendMid`, `rollGrab.autMid`
- `src/render.js`: `bendTrace`
- `index.html`: `#rollMode`
- `src/i18n.js`: `roll.modeTitle`, `roll.modeDone`, `roll.modeNo.*`, `hist.k.mode`
- `src/scaleprobe.js`: `checkBendCurve` (row «BEND-CURVE glides and shapes»), `checkTrackMode` (row «OWN1 track into another mode»); `src/probedata.js`: `checkModeMap` (row «OWN1 modes by degrees (sweep)»)
- `tools/probe-browser.mjs`: `--limit-start M`, `--cdn-cache` (`CDN_CACHE`, `CDN_DIR`, `cdnCache`; folder `tools/.cdn-cache/`, git-ignored)

## Added at ED7-fix2 (undo after ✕)
- `src/hooks.js`: `hooks.cleared`
- `src/recorder.js`: `histTopLabel`
- `src/draw.js`: `LOOP_EMPTY_TOP`, `tpEmpty`, `emptyTpOld`, `setEmptyTpOld`; `syncLoopTransport(on, bottom, empty)`
- `src/ui.js`: `UNDO_TOAST_MS`, `undoToastT`, `hideUndoToast`, `showUndoToast`, `undoToastBtn`, `undoUiOld`, `undoUiDbg`
- `index.html`: `#undoToast`, `#undoToastBtn`; `style.css`: `#undoToast`, `#loopTransport.empty`
- `src/i18n.js`: `hist.clearedToast`, `hist.undoBtn`
- `src/scaleprobe.js`: `checkUndoClear` (row «ED7-fix2 undo after clear»); `tools/check-static.mjs`: global `KeyboardEvent`

## Added at LIC1 / PRIV1 / LAT1 (stage 3, slices 1–3)
- `tools/licences.json` (the licence register: `policy`, `items[]` {id, name, class, use, version, licence, source, urls/files/npm, decision, tool, replace}, `glyphs[]` {ch, name, kind}); `THIRD-PARTY-LICENSES.md` (generated)
- `tools/check-licences.mjs`: `gather`, `check`, `renderMd`, `controls`, `run`; `--write`; `tools/lex.mjs`: `lex` (moved out of check-static)
- `tools/probe-data.mjs`: rows «LIC1 licence register», «LAT1 latency stats (core)» (`latCore`)
- `tools/check-static.mjs`: section 8 network guard — `NET_KINDS`, `NET_LISTED`, `netSites`, `netCheck`, `NET`; `listJs` (reads sub-folders of src/); global `PerformanceObserver`
- `tools/probe-browser.mjs`: `window.__csp` (init script), `res.csp`, the CSP check + control after the probe runs; `--eval` evaluated as an expression (no `new Function`)
- `index.html`: the CSP `<meta>`, `#privacyNote`, Sound panel `#latOn`/`#latOff`, `#latDiag` (`#latDiagTx`, `#latCopy`, `#latClose`), `#latWarn` (`#latWarnTx`, `#latWarnOk`); `style.css`: `#privacyNote`, `#latDiag`, `#latWarn`
- `src/va-stub.js` (the Vercel counter's queue stub, classic script)
- `src/i18n.js`: `privacy.title`, `privacy.body`, `privacy.counter`; `diag.sep`, `diag.lat`, `diag.title`, `diag.camera`, `diag.cameraNoCap`, `diag.detect`, `diag.gestures`, `diag.draw`, `diag.audio`, `diag.long`, `diag.total`, `diag.totalPart`, `diag.bt`, `diag.copy`, `diag.copied`, `diag.close`, `lat.btWarn`, `lat.ok`
- `src/core/latency.js`: `LAT_N`, `makeMeter`, `statsOf`, `handToSound`, `BT_MS`, `BT_LABEL`, `looksBluetooth`
- `src/latmeter.js`: `latStart`, `latFrame`, `latIdle`, `latReport`, `latText`, `latConsole`, `latShow`, `latShown`, `latCount`, `latPauseDbg`
- `src/main.js`: `latStart`/`latFrame`/`latIdle` calls in `startApp`/`loop`; `src/render.js`: `latency` (console `R.latency()`)
- `src/scaleprobe.js`: `checkLatency` (row «LAT1 latency meter», DRAWN)

## Added at PROBE1 / GOLD1 / HAND1 (stage 3, slices 4–6)
- `src/scaleprobe.js` is a FACADE (explicit re-exports; every earlier `scaleprobe` name above now lives in `src/probes/<area>.js`): `run` (`all`, `quick`, `orderCheck`, `material`, `songPrint`, `stateSig`, `registryProblems`), `tuning`, `seed` (`seed`, `song`, `SEED_REC`, `checkWrite`, `checkSeed`, `checkFrozen`), `edit`, `history`, `window`, `freeze`, `files`, `key`, `lat`, `guard` (`api`, `guardSelfTest`, `LOCK`), `kit` (`frame`, `waitMs`, `meas`, `MEAS`, `measReset`, `QUICK`, `setQuick`, `PROBE_SHORT`, `frameStalls`, `winKeep`, `winRestore`), `data` (the node rows)
- `src/probes/rows.js`: `row`, `family`, `rows(filter)`, `rowProblems`, `rowCheck`; flags `slow`, `drawn`, `realtime`, `song`, `node`; stale: `ALL_RUNS`, `SLOW_ROWS`, `DRAWN_ROWS`
- `src/probes/gold.js`: `dumpGold`, `checkGold` (row «GOLD timbres and effects», slow), `goldCases`, `goldFeats`, `goldCmp`, `fft`, `GOLD_TOL`, `GOLD_FLOOR`; `tools/gold.print.json`; `src/render.js`: `goldRender`, `GOLD_RATE`, `GOLD_SEED`, `renderOnce` option `rate`
- `src/probes/hand.js`: `dumpGesture`, `checkGesture` (row «HAND1 gesture fingerprint»), `pose`, `script`, `perform`, `ENV0`, `fxKeep`; `tools/gesture.print.json`; `src/gestures.js`: `handsProbe`, `processHandsProbe`, `pinchDbg`, `nowMs`, `PRB`, `looperTap`, `pinchD`; `src/recorder.js`: `wTap`, `wTapSet`
- `tools/probe-data.mjs`: rows from `probes/rows.js` (flag node) + LIC1 + LAT1 core; `REG`, registry problems in the verdict; `tools/probe-browser.mjs`: `--limit-min` default 8; `tools/check-static.mjs` `NET_LISTED`: `probes/files.js`, `probes/key.js`, `probes/gold.js`, `probes/hand.js` (one fetch each; was `scaleprobe.js` 2)

## Added at LAT1b / SND-F1 (2026-10-15)
- `src/vision.js`: `camInfo`, `modelInfo`, `visionOpts`, `VISION_DEF`, `setHandsTracked`, `setModelDelegate`, `setCamFps`; internal `opts`, `camWant`, `camStartT`, `mpLog`, `mpTap`, `MP_LINE`, `TAP_MS`, `delegateOf`, `XNN`, `xnnBefore`, `newWindow`; `modelInfo().once`
- `src/core/latency.js`: `frameWaitMs`, `withFrameWait`, `perMinute`, `STARTUP_MS`, `splitLongTasks`, `SOFT_GL`, `isSoftwareGL`
- `src/latmeter.js`: `latSwitch`, `latSwSync`; internal `gpuInfo`, `causeOf`, `pruneLong`, `loafT`, `dupT`, `camStart0`, `playFrom`, `SW`; report fields `camera.requested/granted/duplicatesPerMinute/frameWaitMs`, `longTasks.startup/playing/causes`, `handToSoundWithWaitMs`, `gpu`, `model`, `switches`
- `index.html`: `#swHands2`/`#swHands1`, `#swModelGPU`/`#swModelCPU`, `#swFpsDef`/`#swFps30`/`#swFps60`, `#swNote`; Master section `#mGlueOn`/`#mGlueOff`, `#mLimOn`/`#mLimOff`
- `src/i18n.js`: `diag.camSet`, `diag.frameWait`, `diag.dup`, `diag.model`, `diag.gpu`, `diag.gpuHard`, `diag.gpuSoft`, `diag.unknown`, `diag.unknownOnce`, `diag.longStart`, `diag.longPlay`, `diag.cause`, `diag.totalWait`, `diag.sw.*` (hands, model, fps, fpsDef, note, busy, fail); `fx.forest`, `fx.forest.mix`, `fx.glue`, `fx.glue.*` (thr, ratio, knee, att, rel, makeup), `fx.cat.dyn`, `master.sep`, `master.glue`, `master.limiter`, `master.hint`; stale: `diag.long`
- `src/core/dsp.js` (new, pure): `seeded`, `FOREST`, `forestIR`, `irNormScale`, `f32Hash`, `compCurveDb`, `compGainDb`, `DYN_GLUE`, `DYN_LIMIT`, `dynCoef`
- `src/dyn-worklet.js` (new): processor `'dyn'` (modes `comp` / `limit`; parameters `thr`, `ratio`, `knee`, `att`, `rel`, `makeup`, `ceil`, `on`; option `keep`)
- `src/audio.js`: chord timbre «Firefly» (`CHORD_INSTR[16]`, field `strike:'firefly'`), `FIREFLY`, `FF_END`, `ffLive`, `ffStrike`, `ffCancel`, `ffInfo`; voice fields `ffHz`, `ffBri`; `FOREST_PARAMS`, `forestIRs`, `forestData`, `makeForestFx` (effect `forest`); `GLUE_PARAMS`, `dynReady`, `dynWarned`, `dynNode`, `makeGlueFx` (effect `glue`, `cat:'dyn'`); master `mGlue`, `mLim`, `outLast`, `mGlueOn`, `mLimOn`, `MASTER_GLUE_MAKEUP`, `masterDynSet`, `masterDyn`, `offlineMasterDyn`
- `src/render.js`: `stubWorklet(ctx, allow)`, report field `dynLoaded`; `goldRender(play, seconds, chains, post)`; `tailOf` reads `forest`
- `src/ui.js`: `masterDynShow`; `fxAddRow` groups by `FX_FACTORY[id].cat` (`<optgroup>`)
- `src/probes/lat.js`: `checkLatSwitches` (row «LAT1b test switches», DRAWN), `latFieldProblems`
- `src/probes/sound.js` (new): `checkFirefly`, `checkForest`, `checkDynamics`, `checkDynLive` (realtime, slow), `checkFreezeParity` (realtime, slow), `fireflyNote` (the prototype's reference), `fpMeasure`, `FF_TOL`, `DYN_TOL`, `LIVE_TOL`, `FP_TOL`
- `src/probes/gold.js`: cases `ch 16`, `fx forest 1–3`, `fx glue 1–3`, `master glue`, `master limiter`; `add(…, post)`
- SND-F1b: `core/dsp.js` `forestRoom`, `FOREST.rooms`/`FOREST.room`, `forestIR(rate, sec)`, `DYN_MASTER`, `MASTER_MAKEUP_DB`, `DYN_LIMIT.hold`; `core/latency.js` `rateOf`, `handToSound` part `graph`; `dyn-worklet.js` parameter `hold`, option `report`, fields `hc`, `gMin`; `audio.js` `mMake`, `limRed`, `DCN_DELAY_S`, `masterDelayMs`, `masterPathKinds`, `masterProbeNodes`, `forestBuffer`, `forestData(rate, sec)`, param `forest:room` (`pick`, `pickKeys`), instance `room()`; `dynNode(mode, set, keep, report)`; `vision.js` `xnnOnGpu`, `delegateOf(lines, before, asked)`; `latmeter.js` `camN`, `procT`, report `camera.processedFps`, `audio.masterPathMs`; i18n `fx.forest.room(.short/.medium/.long)`, `diag.cpuOnce`, `diag.gpuPart`; stale: `master.limiter`, `diag.unknownOnce`, `#mLimOn`/`#mLimOff`; `probes/sound.js` `checkMasterPath` (row «SND-F1b master path (live)»), `checkFreezeParity(o)`; `probes/gold.js` `GOLD_FLOOR` −80, cases `fx forest medium`, `fx forest short`, `master limiter (hold)`
- `tools/probe-data.mjs`: row «SND-F1 Night forest IR (core)» (`forestCore`, `FOREST_HASH`); LAT1 core row extended; `tools/check-static.mjs` `NET_LISTED`: `audio.js` addModule 4, `render.js` addModule 1, `probes/sound.js` addModule 2

## Added at LAT2 (2026-10-15)
- `src/core/handsched.js` (new, pure core): `HAND_SEARCH_EVERY` 3, `HAND_POLICIES` ['2s','2','1'], `schedNew`, `schedPlan(s, policy)` →
  'skip'|'track1'|'track2'|'search', `schedRetry(action, n, policy)`, `schedAfter(s, action, n)`, `schedRun(counts, {policy, lost})`.
- `src/handdet.js` (new, worker-safe): `MP_WASM`, `MP_MODEL`, `plainResult`, `EMPTY_RESULT`, `createDetector({delegate, blank, step})` →
  `{ run(src, t, action, policy) → {res, action, n, ms}, warmMs, setDelegate, dbg({slowMs, script, fake}), close }`; internal `L1`, `L2`,
  `nextTs`, `warm`.
- `src/hand-worker.js` (new, CLASSIC worker): messages in `init`/`frame`/`delegate`/`dbg`, out `ready`/`fail`/`step`/`res`/`log`/`delegated`;
  `tapConsole(MP_LINE)`.
- `src/core/latency.js`: `MP_LINE` (moved from vision.js); `handToSound` part `transfer` (optional — absent = not a part).
- `src/vision.js`: `setHandsSink(fn, paused)`, `pollFrame`, `setDetectPath('main'|'worker')`, `setPicture('matched'|'live')`, `pathInfo`,
  `pumpStats`, `pumpDbg({fault, schedStay, workerFail, hold, delayMs, slowMs, script, fake, reset})`, `detRunDbg`; `VISION_DEF` now
  `{hands:'2s', delegate, camFps, path:'main', picture:'matched'}`; internal `det`, `detGen`, `path`, `workerDet`, `mainDet`, `buildDet`,
  `setPath`, `detLost`, `W_READY_MS`, `EMPTY`, `nextPaint`, `sched`, `busy`, `pend`, `vfh`, `sink`, `isPaused`, `frameSeq`, `pumpStart`,
  `onVF`, `takeFrame`, `pump`, `PS` (`snapped`, `processed`, `detected`, `dropped`, `dup`, `notNewest`, `errors`, `log` {id, pf, action, n}),
  `mpLine`. `setHandsTracked` takes '2s'|'2'|'1'.
- `src/draw.js`: `syncViewRect(vw, vh)`; `drawVideoBackground(src=video)`.
- `src/main.js`: `onHands(f)`, `studio()`, `shown` (the drawn frame's ImageBitmap); `#start.busy` while starting.
- `src/latmeter.js`: `latHands(f, tA, tB)`, `latFrame(t0, tEnd)` (two arguments now); stages `detTrack`, `detSearch`, `transfer`; `detT`,
  `detN`, `dup0`; report `detection` {runs, asked, why, warmMs, policy, searchEvery, detectedFps, picture}, `camera.framesProcessed`; switches
  `swHands2s`, `swPathMain`, `swPathWorker`, `swPicMatched`, `swPicLive`.
- i18n: `diag.path`, `diag.pathWorker`, `diag.pathMain`, `diag.pathNone`, `diag.xfer`, `diag.hands.2s/.2/.1`, `diag.sw.hands2s`,
  `diag.sw.hands2`, `diag.sw.path`, `diag.sw.pathWorker`, `diag.sw.pathMain`, `diag.sw.pic`, `diag.sw.picMatched`, `diag.sw.picLive`,
  `load.warm`; `diag.detect` gained {tr, se, det, proc}.
- `src/probes/detect.js` (new): `checkFrameOnce` (row «LAT2a frame once»), `checkSchedule` («LAT2a search schedule (live)»), `checkWorker`
  («LAT2b worker = main thread, fallback», slow); `fresh`, `schedProblems`. `tools/probe-data.mjs`: row «LAT2 search schedule (core)»
  (`schedCore`, `HS`). `tools/probe-browser.mjs`: `--limit-min` default 15; `res.net` (`NET_OK`, the network check and its control
  `net-control-worker.js`). `tools/check-static.mjs`: GLOBALS `Worker createImageBitmap ImageBitmap postMessage`; NET_LISTED `vision.js`
  worker 1, `handdet.js` external 1 + fetch 1.
## Added at LAT3 (2026-10-15)
- `src/core/camlight.js` (new, pure core): `LOW_MODES` ['off','fps15','fps24','exposure'], `LOW_TARGET`, `LOW_EXPOSURE_S` 1/40,
  `LOW_SETTLE_MS` 1000, `LOW_MEASURE_MS` 2000, `exposureSupported(caps)`, `exposureUnits(caps, sec)`, `lowConstraints(mode, caps, base, prev)`,
  `lowVerdict({mode, before, after, settings})` → {ok, why: ''|'partly'|'unmeasured'|'noeffect'|'manual'}; hint `DARK_FPS` 12, `DARK_MS`
  3000, `DARK_GRANTED` 24, `DARK_WIN` 1000, `darkNew(cfg)`, `darkStep(st, t, {granted, allowed})` → true once; `LOST_MS` 1000, `lostNew(cfg)`,
  `lostStep(st, t, n)`; `capsText(caps, settings)`, internal `CAP_KEYS`.
- `src/vision.js`: `setLowLight(mode)`, `lowInfo()` → {mode, asked, applied, before, after, note, exposure}, `lowDbg({fail, fakeFps,
  noFallback, reset})`; `VISION_DEF.low` 'off'; `camInfo()` adds `caps`, `settings`, `label`; internal `camBase`, `vtrack`, `capsOf`,
  `vfRing`, `low`, `lowDbgO`, `fpsOver`, `lowOff`, `sleep`.
- `src/latmeter.js`: report `camera.label/caps/settings/capsText/lowLight/lostPerMinute/lostWithinMs/hint`, `longTasks.startup.maxAtMs`;
  switches `swLowOff`, `swLow15`, `swLow24`, `swLowExp`; hint `HINT_MS` 9000, `hintAllowed`, `darkShow`, `darkHide`, `dark`, `grantedFps`,
  `lost`, `lowFpsTx`, `lowNoteTx`; probe-only `darkDbg(times, granted)`, `darkHideDbg`, `latLostDbg`.
- `index.html`: row `diag.sw.low` with `#swLowOff/#swLow15/#swLow24/#swLowExp`; `#darkHint` (`#darkHintTx`, `#darkHintOk`). CSS `#darkHint`.
- i18n: `diag.sw.low`, `diag.sw.lowOff/low15/low24/lowExp`, `diag.low`, `diag.low.off/fps15/fps24/exposure`, `diag.lowFps`, `diag.lowBack`,
  `diag.lowKept`, `diag.why.noeffect/manual/partly/unmeasured/reopened`, `diag.caps`, `diag.capsNone`, `diag.lost`, `diag.longBefore`,
  `diag.longAfter`, `lat.dark` (the player hint).
- `src/probes/lat.js`: `checkLowLight` (row «LAT3 low light», at 585), `lowProblems`, `LOW_BASE`, `expUnits`. `tools/probe-data.mjs`: row
  «LAT3 low light (core)» (`lowCore`, `CL`).
- Stale since LAT2: `vision.landmarker`, `main.lastTs`, `latmeter.lastN`, `latmeter.dup` (a count; now `pumpStats().dup`), `vision.MP_LINE`
  (moved to core/latency.js), `vision.js` external import (moved to handdet.js).
