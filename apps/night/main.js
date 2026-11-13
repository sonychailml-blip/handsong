/* SPLIT-2: the Night app's entry: its shell, its rooms, its profile (NIGHT-7b: the ghost light is gone — the first cards replace it). */
import './scalepick.js';   // CORE-20 — first of all: only the modes Night plays are fetched (before core/scales.js loads its data)
import './migrate.js';   // then: the shell reads its settings while it loads
import './texts.js';   // NIGHT-7: Night's own texts join the dictionaries before anything shows
import './icons.js';   // NIGHT-7c: Night's own drawn icons join the shared table before the markup is filled
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd, setBackground, backgroundOf, sceneInfo, scenePausing, sceneRoom, sceneLevel, sceneRest, sceneFlyPick, sceneFlyAt, sceneFlyLand } from './scene/host.js';
import { hooks } from '../../core/hooks.js';
import { nightShellWire, nightShellFace } from './shell.js';
import { calTick } from './calib.js';
import { ROOMS } from './rooms/index.js';
import { soundModAdd } from '../../core/soundmods.js';
import { natureModule, roomRestore } from './roomswitch.js';
import { camRestore } from './camera.js';   // NIGHT-10: the camera kept on this device
import { startWire, startFailText, startSay, START_OLD } from './start.js';
import { stillWire } from './still.js';   // DESIGN-1 part D: the start still waits for the live room
import { fsCamera } from './fullscreen.js';   // NIGHT-11 part 3: full screen when the camera runs, while the Begin tap still counts   // NIGHT-11 part 2: the start's own words

for(const R of ROOMS) sceneRoomAdd(R.record.id, { load:R.load, standIn:R.standIn, three:()=>import('./vendor/three-r128/three.min.js') });   // NIGHT-3: the rooms, by id
roomRestore();   // NIGHT-3 stage 5 part 2: the room remembered on this device, before the first picture
camRestore();   // NIGHT-10: before the start — the start opens the kept camera (the default when it is gone)
/* NIGHT-6 (the user): the current room's code and the files of its level are fetched while the start card shows, so the first opening finds them ready */
setTimeout(()=>{ const R=ROOMS.find(r=>r.record.id===sceneRoom()); if(R && R.prefetch && sceneLevel()!=='minimal') R.prefetch({ level:sceneLevel() }).catch(()=>{}); }, 0);
hooks.scene={ set:setBackground, of:backgroundOf, info:sceneInfo };   // CORE-8: the shared UI (backgrounds, the latency meter's scene line) reaches the host through this door
/* CORE-7: the ambience enters the engine through the core door (both engine instances find it); NIGHT-3: built from the room's nature recipe.
   NIGHT-3 stage 5 part 2: two nature slots (the second parked); each set plays the CURRENT room's recipe — after a switch the slots crossfade */
{ const N=ROOMS[0].record.nature;
  const why=soundModAdd('ambience', N.id, natureModule(N));   // NIGHT-3 stage 4: the live drone steps aside while the music bed plays (a render copy keeps it)
  if(why) console.warn('[night] the ambience was not registered:', why); }   // eslint-disable-line no-console
nightShellWire(shellDoors()); setFaceHook(nightShellFace);
/* DESIGN-1 part D: how the live room stands for the start still (NIGHT-13: and its camera held at rest, its fireflies) — drawn and its veil lifted (ready), the 2D stand-in (no WebGL: there at once),
   still opening (wait), or another background (other: a plain fade) */
stillWire(()=>{ if(backgroundOf()!=='forest') return 'other'; const I=sceneInfo(); if(!I.webgl || I.level==='minimal') return I.opening ? 'wait' : 'stand-in';
  const c=document.getElementById('scene'); return !I.opening && I.rendered>0 && c && !c.classList.contains('veil') ? 'ready' : 'wait'; },
  { rest:sceneRest, fly:{ pick:sceneFlyPick, at:sceneFlyAt, land:sceneFlyLand } });   // NIGHT-13: the room's camera held at rest through the hand-over; the firefly the dot becomes
/* afterDraw: the calibration's picture is drawn in the loop, while the camera snapshot is still open (NIGHT-2 stage 3) */
const Q=new URLSearchParams(location.search), probeQ=Q.has('probe');
boot({ profile:'profile.night', afterDraw:()=>calTick(),
  detectPause:scenePausing,   // CORE-12: no camera frame is taken while a room builds (NIGHT-3 stage 5 part 2)
  failText:startFailText, startSay, modelStallMs:probeQ && +Q.get('modelstall') || 0,
  parallel:!START_OLD, earlyModel:!START_OLD, onCamera:fsCamera, freshRetry:true });   // CORE-20: a retry never takes a failed preload of early.js   // CORE-19: the camera beside the model, the model before the tap   // CORE-18: Night's start words; ?probe&modelstall=MS the runner's short stall
startWire();
/* NIGHT-11 part 2: Begin works from here — the loading look goes (apps/night/guard.js) */
if(window.__nightBoot) window.__nightBoot.ready();
