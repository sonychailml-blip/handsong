/* SPLIT-2: the Night app's entry: its shell, its ghost light, its rooms, its profile. */
import './migrate.js';   // first: the shell reads its settings while it loads
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd, setBackground, backgroundOf, sceneInfo } from './scene/host.js';
import { hooks } from '../../core/hooks.js';
import { handFn } from '../../core/state.js';
import { nightShellWire, nightShellFace } from './shell.js';
import { ghostFrame } from './ghost.js';
import { calTick } from './calib.js';
import { ROOMS } from './rooms/index.js';
import { soundModAdd } from '../../core/soundmods.js';
import { buildAmbience, ambienceSchedule, ambienceTune, ambienceSet } from './sound/ambience.js';

for(const R of ROOMS) sceneRoomAdd(R.record.id, { load:R.load, standIn:R.standIn, three:()=>import('./vendor/three-r128/three.min.js') });   // NIGHT-3: the rooms, by id
hooks.scene={ set:setBackground, of:backgroundOf, info:sceneInfo };   // CORE-8: the shared UI (backgrounds, the latency meter's scene line) reaches the host through this door
/* CORE-7: the ambience enters the engine through the core door (both engine instances find it); NIGHT-3: built from the room's nature recipe */
{ const N=ROOMS[0].record.nature;
  const why=soundModAdd('ambience', N.id, { build:(E, dest, seed)=>buildAmbience(E, dest, seed, N), schedule:ambienceSchedule, tune:ambienceTune, set:ambienceSet, level:N.level, ahead:N.ahead });
  if(why) console.warn('[night] the ambience was not registered:', why); }   // eslint-disable-line no-console
nightShellWire(shellDoors()); setFaceHook(nightShellFace);
/* afterDraw: the calibration's picture is drawn in the loop, while the camera snapshot is still open (NIGHT-2 stage 3) */
boot({ profile:'profile.night', frameFilter:(res, t)=>ghostFrame(res, t, handFn.ld.R==='fx' ? 'Left' : 'Right'), afterDraw:()=>calTick() });
