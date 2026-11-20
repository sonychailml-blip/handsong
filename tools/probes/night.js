/* SPLIT-2: the probe entry of the Night page: its own rows and the core rows flagged for both pages. P.all on this page = those rows, needs no song. */
import * as SELF from './night.js';
import { night as runNight } from './core/run.js';
import { guardWire, api as guardApi } from './core/guard.js';
import { nightScalesRest } from './night/scales.js';   // CORE-20

export { material } from './core/run.js';
/* NIGHT-7c: the music is on by default now — every run holds it off (the live-sound rows measure the room without it) and waits out its
   tail (about 9 s) when it was playing; afterwards it plays again as the person chose */
/* CORE-20: Night loads only its own modes; the rows (core rows among them) use others — added once, before the first rows run */
async function quiet(run){ await nightScalesRest(); const SH=await import('../../apps/night/shell.js'), was=SH.nightMusicHoldDbg(true);
  if(was){ console.log('[probe] the music is held off for the rows (its tail: 9 s)'); await new Promise(r=>setTimeout(r, 9000)); }   // eslint-disable-line no-console
  try{ return await run(); } finally{ SH.nightMusicHoldDbg(false); } }
export const night=(opt={})=>quiet(()=>runNight(opt)), all=night, quick=(opt={})=>quiet(()=>runNight({ ...opt, quick:true }));
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
export { checkNightScales } from './night/scales.js';   // CORE-20: only its own modes at start
export { checkNightMigrate } from './night/nightmigrate.js';
export { checkNightLean, checkQuietFloor } from './night/lean.js';   // NIGHT-1 stages 2, 3
export { checkNightCalib } from './night/calib.js';   // NIGHT-2 stage 2
export { checkNightCards } from './night/cards.js';   // NIGHT-7
export { checkNightBed } from './night/bed.js';   // NIGHT-3 stage 4: the music bed
export { checkNightRoomSwitch } from './night/roomswitch.js';   // NIGHT-3 stage 5 part 2: the switching machinery
export { checkRainRoom } from './night/rainroom.js';   // RAIN-0: the rain room (a development room)
export { checkRainNature } from './night/rainnature.js';   // RAIN-3: its layered recordings, rendered offline
export { checkForestToday, checkForestFull, checkForestClear, checkForestLost, checkForestLevels } from './night/forest2.js';
export { checkForestBed } from './night/rain4.js';
export { checkRainClicks } from './night/rain4e.js';   // RAIN-4e: no clicks on the bed
export { checkNightLabels } from './night/ui1.js';   // UI-1: Sound, Music and Mood read what plays after a room switch
export { checkNightGlowTint } from './night/core25.js';   // CORE-25: the hands' glow follows the room's tint
export { checkBedNull } from './night/audio1.js';   // AUDIO-1: the rain bed made cheaper by structure, proven by a null test
export { checkRainHands } from './night/audio2.js';   // AUDIO-2: hand events create nothing; the bed survives a main-thread stall
export { checkRainFx } from './night/rain6.js';   // RAIN-6: the effects hand in the rain
export { checkNightLab } from './night/audio3.js';   // AUDIO-3: the development audio lab
export { checkPianoLight } from './night/audio4.js';   // AUDIO-4: the bed's piano in one node, the same sound
export { checkRainStreet } from './night/rain6b.js';   // RAIN-6b: the street (the cull, the sleep, the bodies, the trams)
export { checkRain7 } from './night/rain7.js';   // RAIN-7: the starred street details
export { checkRain10 } from './night/rain10.js';   // RAIN-10: people walk, dressed apart, behind the trees; cars not boxes; the tram a lit box
export { checkRelease1B } from './night/release1b.js';   // RELEASE-1 (B): the vehicles in 3D, the camera's own law
export { checkRelease1W } from './night/release1w.js';   // RELEASE-1: a window's light seen alike in focus and soft
export { checkPerfInvisible } from './night/perf2.js';   // PERF-2: the invisible optimisations, each by an exact A/B
export { checkForestApart } from './night/forest2e.js';   // FOREST-2e: plants apart
export { checkForestCull } from './night/forestcull.js';   // FOREST-2e: the cull (?forest=cull) keeps the frames
export { checkRainQuads } from './night/rain5.js';   // RAIN-5b: no sprite's quad edge shows   // RAIN-4: the forest's bed bit-exact after the jazz bed   // FOREST-2: the switch ?forest=new
export { checkNightStream } from './night/stream.js';
export { checkNightLife, checkNightContextLost } from './night/life.js';   // NIGHT-11 part 1
export { checkNightPixels, checkNightDetailedGuard } from './night/pixels.js';   // NIGHT-11 part 5   // NIGHT-8: the stream's sound, the water, the rocks, the ground
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
