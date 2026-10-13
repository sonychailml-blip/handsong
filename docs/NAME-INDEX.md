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
- `src/vision.js` — camera + MediaPipe (`video`, `canvas`, `ctx`, `roundRect` polyfill, `resize`, `landmarker`, `initVision`,
  `openCamera(facing)`, `switchCamera` — the landmarker is never recreated).
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
  per-voice `dlySend`/`revSend`, `RELEASE_TAILS` as a rule, `scaledata.js`, `R.liveReverb`, `DBG.fdnLive`, `R.powerOld`, `RECT_OCT`, `ROLL_CH_EXTRA_REG`, `SWARA_OF`/`SHRUTI_OF`, `swaraLbl`/`swaraOfCents`, `gridNoteLbl`/`rectNoteLbl` pair as two functions, `rollGroups`, `#rollScale`, `rollSnapRow`, `soloEditBlock`, `tiAudit`/`tiRestamp`, `fxVolFix`/`setFxVolFix`, `chainXDriven`, `frzArmAll`, `setChBrightDisp`, `setRevDisp`, `setLiveRevWiring`, `modeDerive`/`TBL`/`RATIOS`/`CM`, `scaleIdx`, `sameDegrees`, `compat.tag`, `R.liveReverb`, the ScriptProcessor capture.
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
