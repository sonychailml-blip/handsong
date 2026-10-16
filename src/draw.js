/* DRAW1 (DAY run 2026-10-16): draw.js is the FACADE of the canvas — importers keep their import lines. Parts in src/views/: common.js
   (shared helpers, noteLbl), camera.js (the picture), strip.js (play strip, arrangement window, mixer), roll.js (track editor), play.js
   (drawOverlays and the play screen). */
export { loopBarBottom, setEmptyTpOld } from './views/common.js';
export { drawVideoBackground, syncViewRect } from './views/camera.js';
export { arrGeom, laneCol, laneDefName, laneTitle, loopBeatAt, loopHit, loopScroll, loopViewProbe, stripProbe } from './views/strip.js';
export { fxTitleOf, rollAutDrive, rollAutSnapV, rollAutValAt, rollAxisHasDim, rollAxisNow, rollBendAt, rollBendProbe, rollBoxHits, rollDefaultRow0For, rollDragTarget, rollGeom, rollHit, rollRow0Across, rollRowPitch, rollRowsProbe, rollSelectable, rollShiftPit, rollSnap, rollSnapBeat, rollTrackView } from './views/roll.js';
export { drawOverlays } from './views/play.js';
