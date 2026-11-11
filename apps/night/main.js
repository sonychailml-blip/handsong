/* SPLIT-2: the Night app's entry: its shell, its rooms, its profile (NIGHT-7b: the ghost light is gone — the first cards replace it). */
import './migrate.js';   // first: the shell reads its settings while it loads
import './texts.js';   // NIGHT-7: Night's own texts join the dictionaries before anything shows
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd, setBackground, backgroundOf, sceneInfo, scenePausing, sceneRoom, sceneLevel } from './scene/host.js';
import { hooks } from '../../core/hooks.js';
import { nightShellWire, nightShellFace } from './shell.js';
import { calTick } from './calib.js';
import { ROOMS } from './rooms/index.js';
import { soundModAdd } from '../../core/soundmods.js';
import { natureModule, roomRestore } from './roomswitch.js';

for(const R of ROOMS) sceneRoomAdd(R.record.id, { load:R.load, standIn:R.standIn, three:()=>import('./vendor/three-r128/three.min.js') });   // NIGHT-3: the rooms, by id
roomRestore();   // NIGHT-3 stage 5 part 2: the room remembered on this device, before the first picture
/* NIGHT-6 (the user): the current room's code and the files of its level are fetched while the start card shows, so the first opening finds them ready */
setTimeout(()=>{ const R=ROOMS.find(r=>r.record.id===sceneRoom()); if(R && R.prefetch && sceneLevel()!=='minimal') R.prefetch({ level:sceneLevel() }).catch(()=>{}); }, 0);
hooks.scene={ set:setBackground, of:backgroundOf, info:sceneInfo };   // CORE-8: the shared UI (backgrounds, the latency meter's scene line) reaches the host through this door
/* CORE-7: the ambience enters the engine through the core door (both engine instances find it); NIGHT-3: built from the room's nature recipe.
   NIGHT-3 stage 5 part 2: two nature slots (the second parked); each set plays the CURRENT room's recipe — after a switch the slots crossfade */
{ const N=ROOMS[0].record.nature;
  const why=soundModAdd('ambience', N.id, natureModule(N));   // NIGHT-3 stage 4: the live drone steps aside while the music bed plays (a render copy keeps it)
  if(why) console.warn('[night] the ambience was not registered:', why); }   // eslint-disable-line no-console
nightShellWire(shellDoors()); setFaceHook(nightShellFace);
/* afterDraw: the calibration's picture is drawn in the loop, while the camera snapshot is still open (NIGHT-2 stage 3) */
boot({ profile:'profile.night', afterDraw:()=>calTick(),
  detectPause:scenePausing });   // CORE-12: no camera frame is taken while a room builds (NIGHT-3 stage 5 part 2)
