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
export { dumpHandPrint, checkHandPrint, checkHandMap } from './core/handprint.js';   // CORE-1 CP4
export { checkProfile } from './core/profile.js';
export { checkVisStack } from './core/vis.js';
export { checkTimbresBefore, dumpTimbres } from './core/timbres.js';
export { checkForestRoom, checkBackgrounds } from './night/forest.js';
export { checkSoloFirefly } from './night/night.js';
export { checkNightUntouched, dumpNight } from './night/nightguard.js';
export { checkNightProfile } from './night/nightprofile.js';
export { checkNightMigrate } from './night/nightmigrate.js';
export { checkNightLean, checkQuietFloor } from './night/lean.js';   // NIGHT-1 stages 2, 3
export { checkNightCalib } from './night/calib.js';   // NIGHT-2 stage 2
export { checkNightBed } from './night/bed.js';   // NIGHT-3 stage 4: the music bed
export { checkNightRoomSwitch } from './night/roomswitch.js';   // NIGHT-3 stage 5 part 2: the switching machinery
export { testRoomInstall, testRoomRemove, testRoomMode } from './night/testroom.js';   // its development room
export const api=guardApi;

export function install(){
  if(new URLSearchParams(location.search).has('calpanel')) import('./core/calpanel.js').then(m=>m.mountCalPanel('night')).catch(e=>console.warn('[probe] the calibration panel failed to load', e));   // CORE-1: the development panel
  if(new URLSearchParams(location.search).has('headroom')) import('./night/headroom.js').then(m=>m.mountHeadroom()).catch(e=>console.warn('[probe] the headroom page failed to load', e));   // NIGHT-1: the sound headroom page
  if(new URLSearchParams(location.search).has('tails')) import('./night/tailsw.js').then(m=>m.mountTailSwitch()).catch(e=>console.warn('[probe] the tail switch failed to load', e));   // NIGHT-1 stage 3: ?probe&tails=on|off
  if(new URLSearchParams(location.search).has('testroom')){ const why=SELF.testRoomInstall(); console.log(why ? '[probe] the test room was refused: '+why : '[probe] the test room is in: the Room button switches'); }   // NIGHT-3 stage 5 part 2: ?probe&testroom
  if(new URLSearchParams(location.search).has('bed')) import('./night/bedsw.js').then(m=>m.mountBedSwitch()).catch(e=>console.warn('[probe] the bed switch failed to load', e));   // NIGHT-4: ?probe&bed=v1|v2&voices=a|b
  guardWire(SELF); window.P=guardApi(); console.log('[probe] window.P ready — await P.all()');
  import('../../core/render.js').then(m=>{ window.R=m; }).catch(e=>console.warn('[probe] render failed to load', e));
}
