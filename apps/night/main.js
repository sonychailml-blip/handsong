/* SPLIT-2: the Night app's entry: its shell, its ghost light, its forest, its profile. */
import './migrate.js';   // first: the shell reads its settings while it loads
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd, setBackground, backgroundOf, sceneInfo } from './scene/host.js';
import { hooks } from '../../core/hooks.js';
import { handFn } from '../../core/state.js';
import { nightShellWire, nightShellFace } from './shell.js';
import { ghostFrame } from './ghost.js';
import { calTick } from './calib.js';
import { buildForest } from './rooms/forest/forest.js';
import { soundModAdd } from '../../core/soundmods.js';
import { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet } from './sound/ambience.js';
import { AMB } from './pure/ambience.js';

sceneRoomAdd('forest', { build:buildForest, three:()=>import('./vendor/three-r128/three.min.js') });
hooks.scene={ set:setBackground, of:backgroundOf, info:sceneInfo };   // CORE-8: the shared UI (backgrounds, the latency meter's scene line) reaches the host through this door
/* CORE-7: the forest's ambience enters the engine through the core door (both engine instances find it) */
{ const why=soundModAdd('ambience', 'ambience.forest', { build:buildAmbience, schedule:ambienceSchedule, tune:ambienceTune, set:ambienceSet, level:AMB.level, ahead:AMB.ahead });
  if(why) console.warn('[night] the ambience was not registered:', why); }   // eslint-disable-line no-console
nightShellWire(shellDoors()); setFaceHook(nightShellFace);
/* afterDraw: the calibration's picture is drawn in the loop, while the camera snapshot is still open (NIGHT-2 stage 3) */
boot({ profile:'profile.night', frameFilter:(res, t)=>ghostFrame(res, t, handFn.ld.R==='fx' ? 'Left' : 'Right'), afterDraw:()=>calTick() });
