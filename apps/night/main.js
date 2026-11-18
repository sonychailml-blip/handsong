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
import { roomDoors, roomMusicApply } from './roomdoors.js';   // RAIN-4: a room with its own music offers its moods and timbres
import { calTick } from './calib.js';
import { ROOMS } from './rooms/index.js';
import { soundModAdd } from '../../core/soundmods.js';
import { natureModule, roomRestore, roomSwitch } from './roomswitch.js';
import { contactWire } from './contact.js';   // STATS-1
import { camRestore } from './camera.js';   // NIGHT-10: the camera kept on this device
import { startWire, startFailText, startSay, START_OLD } from './start.js';
import { stillWire, stillRoomSet } from './still.js';   // DESIGN-1 part D: the start still waits for the live room
import { updateWire } from './update.js';   // NIGHT-14: «A new version is ready» (a build's precache)
import { QUICK_DENY_MS } from './pure/inapp.js';   // CORE-23: the model's build holds while a camera request is younger than this
import { persistSoon } from './persist.js';   // NIGHT-15: ask once to keep the files, after the first successful start
import { forestLabelWire } from './forestlabel.js';   // FOREST-2: «level · forest» in the corner, only with ?forest=…
import { fsCamera } from './fullscreen.js';   // NIGHT-11 part 3: full screen when the camera runs, while the Begin tap still counts   // NIGHT-11 part 2: the start's own words

for(const R of ROOMS) sceneRoomAdd(R.record.id, { load:R.load, has:R.has, standIn:R.standIn, heard:R.heard, three:()=>import('./vendor/three-r128/three.min.js') });   // NIGHT-3: the rooms, by id (RAIN-R1: the rain's heard)
roomRestore();   // RAIN-R1: the visit's start room (guard.js chose it: random, or the address's), before the first picture
forestLabelWire();   // FOREST-2: only with ?forest=… in the address (otherwise it does nothing)
camRestore();   // NIGHT-10: before the start — the start opens the kept camera (the default when it is gone)
/* NIGHT-6 (the user): the current room's code and the files of its level are fetched while the start card shows, so the first opening finds them ready */
setTimeout(()=>{ const R=ROOMS.find(r=>r.record.id===sceneRoom()); if(R && R.prefetch && sceneLevel()!=='minimal') R.prefetch({ level:sceneLevel() }).catch(()=>{}); }, 0);
hooks.scene={ set:setBackground, of:backgroundOf, info:sceneInfo };   // CORE-8: the shared UI (backgrounds, the latency meter's scene line) reaches the host through this door
/* CORE-7: the ambience enters the engine through the core door (both engine instances find it); NIGHT-3: built from the room's nature recipe.
   NIGHT-3 stage 5 part 2: two nature slots (the second parked); each set plays the CURRENT room's recipe — after a switch the slots crossfade */
{ const N=ROOMS[0].record.nature;
  const why=soundModAdd('ambience', N.id, natureModule(N));   // NIGHT-3 stage 4: the live drone steps aside while the music bed plays (a render copy keeps it)
  if(why) console.warn('[night] the ambience was not registered:', why); }   // eslint-disable-line no-console
nightShellWire(roomDoors(shellDoors())); setFaceHook(p=>{ nightShellFace(p); roomMusicApply(true); });
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
  parallel:!START_OLD, earlyModel:!START_OLD, onCamera:()=>{ fsCamera(); persistSoon(); }, freshRetry:true, handFiles:'own', camHold:QUICK_DENY_MS });   // CORE-22: MediaPipe's files from our own origin (the CSP names only 'self')   // CORE-20: a retry never takes a failed preload of early.js   // CORE-19: the camera beside the model, the model before the tap   // CORE-18: Night's start words; ?probe&modelstall=MS the runner's short stall
startWire();
updateWire();   // NIGHT-14
contactWire();   // STATS-1: Write to us
/* RAIN-R1: THE START ROOM READY BEFORE BEGIN — a room whose files are not here yet (the rain on a first visit: its files come on demand, then stay
   cached) loads while the start screen shows, and Begin keeps its loading look until they are in, START_ROOM_MS at most. They fail (offline, an error)
   or the time runs out: the forest instead (its still, tint and music) — Begin is never held for ever. The forest's files are the start set's: Begin
   never waits for them. */
export const START_ROOM_MS=25000;
async function startRoomReady(){
  const R=ROOMS.find(r=>r.record.id===sceneRoom()), lv=sceneLevel(); if(!R || R===ROOMS[0] || lv==='minimal' || !R.prefetch) return 'first';
  const got=(async ()=>{ if(R.has && await R.has({ level:lv })){ R.prefetch({ level:lv }).catch(()=>{}); return 'cached'; } return (await R.prefetch({ level:lv }))!=null ? 'loaded' : 'failed'; })().catch(()=>'failed');
  const how=await Promise.race([got, new Promise(r=>setTimeout(()=>r('late'), START_ROOM_MS))]);
  if(how==='failed' || how==='late'){ console.warn('[night] the start room '+R.record.id+' did not load ('+how+') — the forest instead');   // eslint-disable-line no-console
    await roomSwitch(ROOMS[0].record.id, { fast:true }); stillRoomSet(ROOMS[0].record.id); }
  return how; }
let startRoomHow=null;
export const startRoomDbg=()=>({ room:sceneRoom(), how:startRoomHow, limitMs:START_ROOM_MS });
/* NIGHT-11 part 2: Begin works from here — the loading look goes (apps/night/guard.js); RAIN-R1: once the start room is ready */
startRoomReady().catch(()=>'failed').then(how=>{ startRoomHow=how; if(window.__nightBoot) window.__nightBoot.ready(); });
