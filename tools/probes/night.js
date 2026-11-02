/* SPLIT-2: the probe entry of the Night page: its own rows and the core rows flagged for both pages. P.all on this page = those rows, needs no song. */
import * as SELF from './night.js';
import { night as runNight } from './core/run.js';
import { guardWire, api as guardApi } from './core/guard.js';

export { material, night } from './core/run.js';
export const all=(opt={})=>runNight(opt), quick=(opt={})=>runNight({ ...opt, quick:true });
export { checkEngineCtx, checkCensus, dumpCensus } from './core/engine.js';
export { dumpGold, checkGold } from './core/gold.js';
export { dumpGesture, checkGesture } from './core/hand.js';
export { checkHandCal } from './core/handcal.js';   // CORE-1
export { checkProfile } from './core/profile.js';
export { checkVisStack } from './core/vis.js';
export { checkTimbresBefore, dumpTimbres } from './core/timbres.js';
export { checkForestRoom, checkBackgrounds } from './night/forest.js';
export { checkSoloFirefly } from './night/night.js';
export { checkNightUntouched, dumpNight } from './night/nightguard.js';
export { checkNightProfile } from './night/nightprofile.js';
export { checkNightMigrate } from './night/nightmigrate.js';
export const api=guardApi;

export function install(){
  guardWire(SELF); window.P=guardApi(); console.log('[probe] window.P ready — await P.all()');
  import('../../core/render.js').then(m=>{ window.R=m; }).catch(e=>console.warn('[probe] render failed to load', e));
}
