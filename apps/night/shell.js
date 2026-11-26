/* RUN 7 (C6 + C11, Night plan §5; docs/night/QUALITY.md points 4, 5, 6, 9, 10) — THE NIGHT SHELL (DOM side; the logic is core/nightui.js).
   Shown only in the Night face (nightShellFace from the profile's face door). Hands in view → only the scene; no hand for 1.5 s → the controls
   fade in: (Room, only with two rooms or more —) Music · Sound / Mood · Notes (follow / stay put) · Sleep, and the settings card (NIGHT-2, was ⓘ:
   Hand — calibration, playing hand, two sliders, the hand's points; Music — volume, the room's sounds, response; View — what is on screen, the
   note field, the Lightweight mode; How to play). Each round button cycles its values; a tap glints (micro-feedback). Every value is written through the DOORS ui.js
   wires (the same setters the Full panels use) — this module holds no musical state. The sleep timer fades the output (audio.outputFade,
   session only) and dims the scene with a black veil together; a tap on the veil wakes. The choices are remembered on this device (localStorage). */
import { BUS } from '../../core/pure/bus.js';
import { NIGHT_UI, showStep, nextOf, sleepLevel } from '../../core/pure/nightui.js';
import { sleepProgress } from './pure/cycle.js';   // RUN 9: the sleep timer deepens the night
import { outputFade, ambienceOn, ambienceRetune, ambienceTick, fxInstance, setTimbreTrim, setLowPower, setNightStrikes, setLeanPath, leadParkTick, AC, leadOn, leadOff, timbreIdx, ambienceInfo } from '../../core/audio.js';
import { fxDenorm } from '../../core/modules/effects/param.js';
import { NIGHT_FX } from '../../core/modules/effects/night-fx.js';
import { ROOMS, roomById } from './rooms/index.js';   // NIGHT-3: the current room's nature recipe (its default level, its wind)
import { bedNext, BED_PRESETS } from './pure/bed.js';
import { bedSetMode, bedModeOf, bedSetVolume, bedVolumeOf, bedSetAnswer, bedAnswerOf, bedTick, bedSetLight, bedViewOver, bedEngineReady } from './bed.js';   // NIGHT-3 stage 4: the music bed (NIGHT-4: v2, Lighter)
import { t, L, onLangChange } from '../../core/i18n.js';
import { svgIcon } from '../../core/icons.js';
import { nightView, setNightView, chainKeyOf, setVolFloor } from '../../core/state.js';
import { scaleById, scaleView } from '../../core/scales.js';   // NIGHT-7c: the profile's own view for the music before the profile applies
import { profileOf } from '../../core/profile.js';
import { fsBegin, fsStarted, fsToggle, fsOn, fsOnChange, fsCanToggle } from './fullscreen.js';   // NIGHT-7c: full screen (NIGHT-8b: never while the camera is undecided)
import { devItems } from './edition.js';   // NIGHT-7b: the release edition (a players' build, or ?release) hides the development items
import { calWire, calOfferIfNew, calActive, calSideApply, calSideSet, calSettingsRender, calAbort, calDueNow, calOffered, calStep } from './calib.js';   // NIGHT-2: the hand's calibration (its picture is drawn by the loop: main.js afterDraw)
import { setSceneLevel, setSceneLight, sceneLightInPlace, sceneFadeOut, sceneLevel, setBackground, backgroundOf, sceneInfo, sceneRoom, sceneRooms, sceneOptDbg, sceneStartNote } from './scene/host.js';   // RUN 8 (slice 4): the scene's quality (development switch); C8 the measurement
import { roomSwitch, roomNext, natureLight } from './roomswitch.js';
import { setTabsWire } from './settabs.js';   // DESIGN-1 part C: the settings in three tabs (revert: docs/night/design/DESIGN-1-settings-before.html)   // NIGHT-3 stage 5 part 2: the Room button
import { persistInfo } from './persist.js';   // NIGHT-15: whether the browser keeps Night's files
import { latReport } from '../../core/legacy-ui/latmeter.js';   // C8: the device measurement reads the latency meter
import { cardsWire, cardsShow, cardsOpen, cardsDue, cardsDone, cardsEnvNow } from './cards.js';   // NIGHT-7: the first cards
import { camWire, camRender } from './camera.js';   // NIGHT-10: Settings → Camera
import { lifeStart } from './lifecycle.js';   // NIGHT-11 part 1: the sound, the screen and the camera after the phone looks away
import { noticeWire } from './notice.js';   // NIGHT-11: the one notice line
import { START_OLD, FLOW_OLD } from './start.js';   // NIGHT-11 part 3: the start-timeline row's CONTROL; part 4: the order row's
import { coachBegin, coachTick, coachWire, coachShown } from './coach.js';   // NIGHT-11 part 4: play first, teach inside
import { homeHintFor } from './pure/homehint.js';
import { scenePausing } from './scene/host.js';
import { noticeOf, noticeShow, noticeHide } from './notice.js';
import { roomMusicNote } from './roomdoors.js';   // RAIN-4
import { QUALITIES, qualityFrom, qualityState, firstQualityOf } from './pure/quality.js';   // NIGHT-16: one quality choice
import { filmUiWire, filmUiTick, filmBusy, filmCardOpen, filmTip } from './filmui.js';   // SHARE-3: the players' clip button

const $=id=>document.getElementById(id), READ=BUS.reader();
/* NIGHT-1 stage 2: what this app never plays leaves the graph (the sound stays the same to rounding; row «NIGHT lean path»). Its chain has no drive, brightness or tremolo; its one role is solo */
export const LEAN_PATH=Object.freeze({ expr:true, voice:true, roles:true, closedFx:true, park:true });
const KEY={ field:'handsong.nightField', roomSound:'handsong.nightForest', fxHint:'handsong.nightFxHint', joints:'handsong.nightJoints', light:'handsong.nightLight',
  musicAnswer:'handsong.nightMusicAnswer' };   // NIGHT-3 stage 4: the bed's response (its mode and volume: MUSIC_KEYS)
/* NIGHT-7c: THE MUSIC IS ON until the person turns it off (that choice is remembered). New names: an «off» or a volume of 0 that development runs
   left under the old names («handsong.nightMusic», «…MusicVol») never silences a new player; anything unknown reads as the default */
export const MUSIC_KEYS=Object.freeze({ mode:'handsong.nightMusicMode', vol:'handsong.nightMusicLevel' }), MUSIC_DEFAULT='still';
export const musicModeOf=v=> v==='off' || BED_PRESETS.includes(v) ? v : MUSIC_DEFAULT;
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
/* NIGHT-16: ONE quality choice, heaviest to lightest — 'full' (Detailed) · 'reduced' (Standard) · 'light' (Light = the old Lightweight mode: Standard's
   picture without the glass blur, plus the lighter sound). Light is stored under the old Lightweight key ('1'), the picture level under the scene's
   own key; the level remembered «before Lightweight» has no meaning in one choice and is dropped (migration) */
const quality=()=>qualityFrom(load(KEY.light), sceneLevel());
try{ localStorage.removeItem('handsong.nightLightScene'); }catch(e){}
/* PERF-4: a FIRST visit on a weak GPU (pure/quality.js weakGpu: the WebGL renderer's name) starts at Light, stored like the player's choice so every
   later visit reads it as now. Read once, from a throwaway context, only when nothing is stored yet. firstGpu: what was read (Measure, probes) */
export const firstGpu=(()=>{ if(load(KEY.light)!=null || load('handsong.sceneLevel')!=null) return null; let name='';
  try{ const c=document.createElement('canvas'), g=c.getContext('webgl'); if(g){ const x=g.getExtension('WEBGL_debug_renderer_info'); name=String(g.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : g.RENDERER)||''); const l=g.getExtension('WEBGL_lose_context'); if(l) l.loseContext(); } }catch(e){}
  const q=firstQualityOf(null, null, name); if(q==='light') save(KEY.light, '1'); return { name, light:q==='light' }; })();
const STORE={ getItem:load, setItem:save };   // the cards' key through the same guarded doors
let D=null, on=false, st=null, raf=0, info=false, sleep={ mins:0, t0:0 }, asleep=false, lastFade=1, amb=false;
let begun=false, firstRun=false, startDue=false, defHand='right';   // NIGHT-2: a person's Begin, the cards due on it (NIGHT-7b), the offer due on the next frame, the profile's playing hand
/* «Room sounds» (Music section; was «Forest» under View) — the room's own sounds (the ambience's level), remembered on this device under the old
   key. NIGHT-3 stage 5: it no longer sets the hand's reach (RUN 8 had coupled them). NIGHT-5: the reach is the whole range (it was the slider's
   old default 0.6, which stopped the hand at 60 % of its bar). */
const room=()=>(roomById(sceneRoom())||ROOMS[0]).record, nature=()=>room().nature;
const roomSound=()=>{ const v=parseFloat(load(KEY.roomSound)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : nature().level; };
/* NIGHT-4: a weak device (≤ 2 GB or ≤ 2 cores, as the browser reports) gets the music bed's lighter variant whatever the setting */
const WEAK=!!((navigator.deviceMemory && navigator.deviceMemory<=2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency<=2));
export const REACH=1;   // the hand's reach in the room (Forest depth's `reach`): always the whole range, whatever the calibration and settings (user, NIGHT-5)

/* the doors (ui.js): timbres() / timbre() / setTimbre(id) / timbreName(id); moods() / mood() / setMood(id); hand() 'right'|'left' /
   setHand(v); noteMode() 'note'|'hold' / setNoteMode(v); backgrounds() / bg() / setBg(m); plain() (no glass blur);
   firstRun() (C7; absent → the line stays hidden). The ambience (C4c) is driven here: on in a face that has one (profile.ambience), off
   otherwise; its Forest volume is the slider. */
export function nightShellWire(doors){ D=doors; wire(); calWire(D, { leave:()=>infoShow(false), defHand:()=>defHand, changed:()=>render() });
  camWire({ after:()=>{ if(calOfferIfNew(()=>{})) infoShow(false); } }); }   // NIGHT-10: a camera not offered yet gets the calibration offer after a switch
export function nightShellFace(p){
  on=p && p.shell==='night'; $('nightShell').hidden=!on;
  setNightView(on ? { glow:p.noteField==='glow', plain:p.labels==='plain', fieldAll:load(KEY.field)==='1', tips:load(KEY.joints)!=='all' } : null);   // RUN 8: tips — fingertips only (dev switch)
  document.body.classList.toggle('night-plain', on && !!(D && D.plain()));
  /* NIGHT-3 stage 4: the music bed (its mode before the ambience: with the bed on, the drone stays out) */
  if(on){ musicLevel(); bedSetAnswer(load(KEY.musicAnswer)==='1'); const m=musicNow();
    if(!(early.on && bedModeOf()===m)) bedSetMode(m, room().bed, room().bed2);   // NIGHT-7c: started on Begin already — it plays on, no restart
    bedViewOver(null); early.on=false; fsStarted(); }   // the profile's view is live now (the same object: nothing glides); an exit from full screen is the person's from here
  else bedSetMode('off');
  amb=on && !!p.ambience; ambienceOn(amb, roomSound());
  setTimbreTrim(on ? p.levels : null);   // RUN 8: the face's per-timbre level trim (Full: none)
  setNightStrikes(on ? (p.voices||{}) : null);
  setLeanPath(on ? LEAN_PATH : null);
  setVolFloor(on && p.volume ? p.volume.left : null);
  defHand= p && p.handFn && p.handFn.ld && p.handFn.ld.R==='fx' ? 'left' : 'right';
  if(on){ calSideApply(); coachBegin(); if(begun){ begun=false; startDue=true; } }   // NIGHT-11 part 4: the coaching line runs once the app does   // NIGHT-2: a calibrated side sets the roles; the offer follows a person's own Begin
  else calAbort();   // RUN 8: Night's gentler left-to-right volume (Full: its own curve)   // RUN 8: Night's strike caps and cheaper strikes (Full: RUN 7's strike exactly)
  if(on){ reachSet(REACH); lightApply(load(KEY.light)==='1'); lifeStart();
    if(sceneStartNote()==='detailed-crash'){ noticeShow('info', 'night.q.crashNote', ()=>noticeHide('info')); setTimeout(()=>noticeHide('info'), 9000); } }   // NIGHT-11 part 5: said once   // NIGHT-11: once the app runs   // the hand's reach: the whole range (NIGHT-5); C8 the person's «Lighter forest»
  else setLowPower(false);
  if(on){ st=null; render(); if(!raf) raf=requestAnimationFrame(tick); }
  else { if(raf) cancelAnimationFrame(raf); raf=0; infoShow(false); sleepSet(0); }
}
const glint=el=>{ el.classList.add('glint'); setTimeout(()=>el.classList.remove('glint'), 450); };
function val(id, text){ $(id).querySelector('.night-val').textContent=text; }
function setIcon(id, name){ const c=$(id).querySelector('.night-circ'); if(c.dataset.svg===name) return; c.dataset.svg=name; const g=svgIcon(document, name); if(g) c.replaceChildren(g); }
/* every value as the person reads it — plain words, no cents / Hz / role names */
function render(){
  if(!D || !on) return;
  $('nightRoom').hidden=sceneRooms().length<2; val('nightRoom', L(room().name));   // NIGHT-3 stage 5 part 2: the Room button only with two rooms or more
  { const m=bedModeOf(), BN=room().music && room().music.bedNames; val('nightMusic', BN && BN[m] ? L(BN[m]) : t('night.music.'+m)); }   // UI-1: a room with its own music names its levels (the rain: Drizzle · Rain · Downpour)
  $('nightMusicAnswerTg').hidden=!!room().music;   // UI-1: the settings show only what works here — a room's own composed music does not follow the played chord
  val('nightSound', D.timbreName(D.timbre()));
  val('nightMood', D.moodName ? D.moodName(D.mood()) : t('night.mood.'+D.mood()));   // RAIN-4: a room with its own music names its moods
  const nm=D.noteMode(); val('nightNotes', t(nm==='hold' ? 'night.notesStay' : 'night.notesFollow')); setIcon('nightNotes', nm==='hold' ? 'note-stay' : 'note-follow');
  sleepLabel(performance.now());
  $('nightFieldTg').classList.toggle('on', !!(nightView && nightView.fieldAll));
  $('nightMeasure').hidden=!devItems(); if(!devItems()) $('nightMeasureOut').hidden=true;
  $('nightToSound').hidden=!devItems();
  { const bgs=D.backgrounds(), bg=D.bg(); for(const b of $('nightBgSeg').children){ b.hidden=!bgs.includes(b.dataset.bg); b.classList.toggle('on', b.dataset.bg===bg); } }   // NIGHT-2: settings
  for(const b of $('nightDotsSeg').children) b.classList.toggle('on', (b.dataset.dots==='tips')===!!(nightView && nightView.tips));
  for(const b of $('nightHandSeg').children) b.classList.toggle('on', b.dataset.hand===D.hand());   // NIGHT-2 stage 3: «Play with» moved here from the main screen
  calSettingsRender();
  $('nightSceneTg').hidden=!devItems(); $('nightSceneTg').textContent=t('night.scene', { lvl:t('night.scene.'+sceneLevel()) });
  { const q=quality(); for(const b of $('nightQualSeg').children) b.classList.toggle('on', b.dataset.q===q); }   // NIGHT-16: one quality choice
  { const busy=filmBusy(); for(const b of [...$('nightQualSeg').children, ...$('nightBgSeg').children]) b.disabled=busy; }   // SHARE-3: no quality or background change while a clip records
  $('nightRoomSoundRow').hidden= !amb; $('nightRoomSound').value=String(roomSound());
  { const ic=$('nightRoomSoundRow').querySelector('.night-vico'), name=room().icon||'forest';   // NIGHT-8: the room gives its own Room-sounds icon (the forest keeps the leaf)
    if(ic && ic.dataset.svg!==name){ const g=svgIcon(document, name); if(g){ ic.dataset.svg=name; ic.replaceChildren(g); } } }
  $('nightMusicVol').value=String(bedVolumeOf()); $('nightMusicAnswerTg').classList.toggle('on', bedAnswerOf());
  { const b=$('nightFsBtn'), full=fsOn(), tt=t(full ? 'night.fs.exit' : 'night.fs.enter'); b.hidden=!fsCanToggle();   // NIGHT-7c: the full-screen toggle shows its state
    if(b.dataset.svg!==(full ? 'fs-exit' : 'fs-enter')){ b.dataset.svg= full ? 'fs-exit' : 'fs-enter'; const g=svgIcon(document, b.dataset.svg); if(g) b.replaceChildren(g); }
    b.title=tt; b.setAttribute('aria-label', tt); b.setAttribute('aria-pressed', full ? 'true' : 'false'); }
  document.body.classList.toggle('night-plain', !!D.plain() || load(KEY.light)==='1');   // C8: the Lighter forest has no glass blur
}
function sleepLabel(now){ const L=sleepLevel(sleep.t0, sleep.mins, now);
  val('nightSleep', sleep.mins ? t('night.sleepMin',{ n:Math.max(1, Math.ceil(L.left/60e3)) }) : t('night.sleepOff')); }
function sleepSet(mins){
  sleep={ mins, t0:performance.now() };
  if(!mins){ asleep=false; $('nightShell').classList.remove('asleep'); $('nightVeilMsg').hidden=true; $('nightVeil').style.opacity='0'; if(lastFade!==1){ lastFade=1; outputFade(1, 0.6); } }
}
function infoShow(v){ info=v; $('nightInfo').hidden=!v; if(v){ render(); camRender(); } }   // NIGHT-10: the cameras listed when the card opens
function wire(){
  const tap=(id,f)=>{ $(id).onclick=()=>{ if(!D) return; f(); glint($(id)); render(); }; };
  tap('nightRoom', ()=>{ if(filmBusy()){ filmTip('night.clip.noRoom'); return; } const id=roomNext(); if(id){ roomSwitch(id).then(()=>render()); render(); } });   // NIGHT-8: the slider's icon follows at once   // NIGHT-3 stage 5 part 2: the next room
  tap('nightMusic', ()=>{ const m=bedNext(bedModeOf()); bedSetMode(m, room().bed, room().bed2); save(MUSIC_KEYS.mode, m); if(amb) ambienceOn(true, roomSound()); });   // NIGHT-3 stage 4: off → still → drift → glimmer → off; the drone hands over
  tap('nightSound', ()=>{ D.setTimbre(nextOf(D.timbres(), D.timbre())); roomMusicNote(); });
  tap('nightMood', ()=>{ D.setMood(nextOf(D.moods(), D.mood())); roomMusicNote(); });   // RAIN-4: remembered per room
  tap('nightNotes', ()=>D.setNoteMode(D.noteMode()==='hold' ? 'note' : 'hold'));
  tap('nightSleep', ()=>sleepSet(nextOf(NIGHT_UI.sleepMins, sleep.mins)));
  $('nightInfoBtn').onclick=()=>infoShow(true); $('nightInfoClose').onclick=()=>infoShow(false);
  $('nightFsBtn').onclick=()=>{ fsToggle().then(()=>render()); };   // NIGHT-7c: the corner toggle
  fsOnChange(()=>render());
  /* NIGHT-8b: the next tap after the camera runs asks for full screen while it is still wished — fullscreen.js listens to the whole page itself */
  $('nightFieldTg').onclick=()=>{ const all=!(nightView && nightView.fieldAll); save(KEY.field, all ? '1' : '0'); if(nightView) setNightView({ ...nightView, fieldAll:all }); render(); };
  $('nightToSound').onclick=()=>{ infoShow(false); if(D.sound) D.sound(); };   // dev: the Sound panel (Diagnostics → Latency meter — step 105)
  $('nightMusicVol').oninput=e=>{ const v=+e.target.value; save(MUSIC_KEYS.vol, String(v)); bedSetVolume(v); };
  $('nightMusicAnswerTg').onclick=()=>{ const v=!bedAnswerOf(); save(KEY.musicAnswer, v ? '1' : '0'); bedSetAnswer(v); render(); };
  $('nightRoomSound').oninput=e=>{ const v=+e.target.value; save(KEY.roomSound, String(v)); if(amb) ambienceOn(true, v); };   // the room's sound only (NIGHT-3 stage 5)
  $('nightSceneTg').onclick=()=>{ const L=['full','reduced','minimal'], v=L[(L.indexOf(sceneLevel())+1)%L.length]; setSceneLevel(v).then(()=>render()); };
  $('nightMeasure').onclick=()=>{ measure(); };
  /* NIGHT-16: one quality choice, remembered (Light = Standard's picture + the lighter sound); the first cards again */
  for(const b of $('nightQualSeg').children) b.onclick=()=>{ qualitySet(b.dataset.q).then(()=>render()); render(); };
  $('nightHowTo').onclick=()=>{ infoShow(false); cardsShow(); };
  cardsWire(); noticeWire(); coachWire(); setTabsWire();
  /* SHARE-3: the clip button — while its card plays the clip, the room and the hands are silent (the sleep timer's level comes back after); the room cannot change while it records */
  filmUiWire({ mute:v=>outputFade(v ? 0 : lastFade, v ? 0.12 : 0.4), changed:()=>render() });
  document.addEventListener('night-room-music', ()=>{ if(!labelsStale) render(); });   // UI-1: a room's music applied (a switch, the start) — Sound, Music and Mood read what plays
  /* NIGHT-2: the background and the hand's points in settings (fingertips only, the default, or all points) */
  for(const b of $('nightBgSeg').children) b.onclick=()=>{ if(!D) return; D.setBg(b.dataset.bg); render(); };
  for(const b of $('nightHandSeg').children) b.onclick=()=>{ if(!D) return; calSideSet(b.dataset.hand); render(); };   // saved: the last choice wins
  for(const b of $('nightDotsSeg').children) b.onclick=()=>{ const tips=b.dataset.dots==='tips'; save(KEY.joints, tips ? 'tips' : 'all'); if(nightView) setNightView({ ...nightView, tips }); render(); };
  $('nightVeil').onclick=()=>{ if(asleep) sleepSet(0); };
  onLangChange(render);
}
/* once per screen frame while Night shows: the controls' visibility (hands), the sleep timer */
function tick(now){
  raf=0; if(!on) return;
  const hv=READ.get('handsView'), n= Array.isArray(hv) ? hv.length : 0;
  st=showStep(st, n, now);
  $('nightShell').classList.toggle('show', st.shown && !info && !asleep && !calActive() && !cardsOpen() && !filmCardOpen());
  filmUiTick(now, { ready:!info && !asleep && !calActive() && !cardsOpen() && !noticeOf() && !scenePausing(), hands:n, coach:!!coachShown() });   // SHARE-3: the one-time hint
  if(startDue){ startDue=false; startFlow(); }
  coachNow(now);   // NIGHT-11 part 4
  if(amb){ ambienceRetune(); ambienceTick(); }   // the drone follows the mood; the crickets are scheduled ahead
  bedTick();   // NIGHT-3 stage 4: the music bed's next events, ahead on the audio clock
  if(AC) BUS.set('audioClock', clockNow());   // NIGHT-6 slice 1: the room shows the bed's events when they are heard
  leadParkTick();   // NIGHT-1: a silent flute's bank stops being computed
  const fxv=nightFxNow(); BUS.set('nightFx', fxv);   // C5: the effects hand's values for the forest's visuals (rings, colour, tremble)
  BUS.set('nightSky', { mood:D.mood(), sleep:sleepProgress(sleep.t0, sleep.mins, now), wind:windNow() });   // RUN 9: the forest's palette (mood), the night's depth (sleep), the wind
  bars(now, Array.isArray(hv) ? hv : [], fxv);   // RUN 8 (slice 3)
  if(sleep.mins){ const L=sleepLevel(sleep.t0, sleep.mins, now);
    if(Math.abs(L.level-lastFade)>0.002 || (L.level===0 && lastFade!==0)){ lastFade=L.level; if(!filmCardOpen()) outputFade(L.level, 0.4); }
    $('nightVeil').style.opacity=String(1-L.level);
    if(L.asleep && !asleep){ asleep=true; $('nightShell').classList.add('asleep'); $('nightVeilMsg').hidden=false; }
    if(st.shown && Math.floor(now/1000)!==Math.floor((now-17)/1000)) sleepLabel(now); }
  raf=requestAnimationFrame(tick);
}
/* RUN 7 (C7): THE NIGHT START — the start card is Night's (body.night-boot): the title, two setup tips (NIGHT-7b: always; no saved flag hides
   them), Begin, the privacy line. «Begin» runs the very same start handler as Play, inside this click (rule #1). Only a person's own tap leads
   to the first cards (never a profile switch — the probes switch). */
document.body.classList.add('night-boot');   // NIGHT-8b: the page's markup carries it already (the first paint is Night's); kept for a page without it
$('nightBegin').onclick=()=>{ const go=$('startBtn').onclick; begun=true; firstRun=cardsDue(STORE); audioSessionPlayback(); if(go) go(); resumeInTap(); fsBegin(); musicEarly(); if(!START_OLD) forestEarly(); };   // NIGHT-11 part 3: the forest begins opening in the tap
/* NIGHT-12: «How to play» on the start screen — the same cards over it; closing them returns to the start card (nothing else of the flow changes) */
$('nightStartHowTo').onclick=()=>{ if(!$('start').classList.contains('on') || cardsOpen()) return; document.body.classList.add('night-cards-start');
  cardsShow(()=>{ document.body.classList.remove('night-cards-start'); $('nightStartHowTo').focus({ preventScroll:true }); }); };
/* NIGHT-11 part 3: the room the face will show begins opening now, so its first (cold) shader compile overlaps the model and the camera prompt; the
   choice read as ui.js reads it (this device's, else the profile's first); the face's own call finds it opening and leaves it */
function forestEarly(){ const P=profileOf('profile.night'), B=P && P.backgrounds; if(!B) return; let st=null; try{ st=localStorage.getItem('handsong.nightBg'); }catch(e){}
  if((B.includes(st) ? st : B[0])==='forest') setBackground('forest'); }   // NIGHT-7c: the audio context first (rule #1), then full screen (only with the camera already granted — NIGHT-8b), then the music
/* NIGHT-2: once the camera runs after a Begin: the calibration offer for a camera not offered yet, then the first cards when due. NIGHT-7b: the
   cards alone — the old ghost hand is gone; they count as seen only once they close (finished or skipped) */
/* NIGHT-11 part 4: PLAY FIRST — after Begin nothing is asked and no card shows; the coaching line leads to the first note (coach.js). ?probe&oldflow keeps
   the old order (the calibration offer, then the cards) — the order row's CONTROL */
function startFlow(){ const first=firstRun; firstRun=false; if(!FLOW_OLD) return;
  const then=()=>{ if(first) cardsShow(()=>{ cardsDone(STORE); }); };   // NIGHT-8b: full screen needs no end of the flow (the next tap after the camera asks while it is wished)
  if(!calOfferIfNew(then)) then(); }
/* NIGHT-11 part 4: the coaching line's inputs once a frame — ready while the room shows and nothing else is on screen; paused while detection is;
   the calibration offer due on this camera (read at most once a second); the home-screen hint on iPhone Safari outside the home-screen app */
let calDueC={ t:-1e9, v:false }; const homeDue=homeHintFor(cardsEnvNow());
function coachNow(now){
  if(now-calDueC.t>1000) calDueC={ t:now, v:FLOW_OLD ? false : calDueNow() };
  const paused=scenePausing() || calActive();
  const ready=!info && !asleep && !paused && !cardsOpen() && !noticeOf() && !document.body.classList.contains('dark-on') && !FLOW_OLD && !filmBusy() && !filmCardOpen();   // SHARE-3: no coaching line over a recording or the clip's card
  coachTick(now, { ready, paused, calDue:calDueC.v, homeDue }, yes=>{ calOffered(); calDueC.t=-1e9; if(yes){ infoShow(false); calStep(()=>{}); } });
}
/* NIGHT-7c: THE MUSIC FROM THE TAP ON BEGIN — once the engine's master exists and the context runs (the camera, its prompt and the hand model
   still on their way), the bed starts in the Night profile's own view with its own fade-in (the level rises over about 3 s, the ground over 2.5 s);
   this little loop drives it until the face's tick takes over. */
const early={ on:false, raf:0 };
let musicHold=false;   // probe only (nightMusicHoldDbg): the rows run with the bed silent
const musicNow=()=> musicHold ? 'off' : musicModeOf(load(MUSIC_KEYS.mode));
function musicLevel(){ const v=parseFloat(load(MUSIC_KEYS.vol)); if(Number.isFinite(v)) bedSetVolume(v); }
function nightView0(){ const P=profileOf('profile.night'), s=P && P.moods ? scaleById(P.moods[0]) : null; if(!s) return null;
  return P.key ? scaleView(s, undefined, undefined, P.key.tonic, P.key.cents) : scaleView(s); }   // the very object CUR() gives once the profile has set its mood and key
function musicEarly(){
  const m=musicNow(); if(m==='off' || early.raf || on) return;
  const step=()=>{ early.raf=0; if(on) return;
    if(bedEngineReady()){
      if(!early.on){ musicLevel(); bedSetLight(load(KEY.light)==='1' || WEAK); bedViewOver(nightView0()); bedSetMode(m, room().bed, room().bed2); early.on=true; }
      bedTick(); }
    early.raf=requestAnimationFrame(step); };
  early.raf=requestAnimationFrame(step); }
/* NIGHT-7c / SAFARI-1: iPhone and iPad — sound even with the ringer switch on silent. Web Audio alone is muted there unless the page plays as a player:
   Safari 16.4+ has the door (navigator.audioSession.type = 'playback'); an older iOS switches its session to playback when the page plays a media element
   in a tap — a short silent clip of our own, made in memory (a WAV blob: media-src allows blob:, nothing fetched, no file). Called first in the Begin
   tap, before the AudioContext is made; then resumeInTap() resumes the context in the same tap. Elsewhere nothing changes. */
const IOS=typeof navigator!=='undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent||'') || (/Macintosh/.test(navigator.userAgent||'') && navigator.maxTouchPoints>1));
let silentEl=null;
function silentClip(){ const n=800, b=new ArrayBuffer(44+n), v=new DataView(b), w=(o, t)=>{ for(let i=0;i<t.length;i++) v.setUint8(o+i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36+n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true); for(let i=0;i<n;i++) v.setUint8(44+i, 128); return URL.createObjectURL(new Blob([b], { type:'audio/wav' })); }   // 0.1 s of 8-bit silence (128 = zero)
function audioSessionPlayback(){ let how=null;
  try{ const a=navigator.audioSession; if(a){ if(a.type!=='playback') a.type='playback'; how=a.type; } }catch(e){}
  if(!how && IOS) try{ if(!silentEl){ silentEl=new Audio(silentClip()); silentEl.setAttribute('playsinline', ''); silentEl.preload='auto'; } const p=silentEl.play(); if(p && p.catch) p.catch(()=>{}); how='silent-clip'; }catch(e){}
  sessionHow=how; return how; }
let sessionHow=null;
function resumeInTap(){ try{ if(AC && AC.state!=='running' && AC.resume){ const p=AC.resume(); if(p && p.catch) p.catch(()=>{}); } }catch(e){} }
export const nightAudioSessionDbg=()=>({ how:sessionHow, ios:IOS, type:(()=>{ try{ return navigator.audioSession ? navigator.audioSession.type : null; }catch(e){ return null; } })(), ctx:AC ? AC.state : null });   // SAFARI-1, probes
/* probe only: hold the music off (true) or let it play as the person chose (false) → whether it was playing */
export function nightMusicHoldDbg(v){ const was=bedModeOf()!=='off'; musicHold=!!v; if(musicHold) bedSetMode('off'); else if(on) bedSetMode(musicNow(), room().bed, room().bed2); return was; }
export const nightEarlyDbg=()=>({ ...early });
/* RUN 8 (slice 3): THE BARS while the hands play — the hand's depth («Глубина»: the room and the light; NIGHT-5 no mark) on the playing hand's side, the
   three effects (Echo · Warmth ↔ Brightness from the middle · Wave) on the effects hand's side; the bar of the finger in use glows; each set
   fades in with its hand and out when it leaves; a set's side follows where its hand is on the screen (40 / 60 % of the width, hysteresis),
   so «Play with: left hand» (settings) moves them. The effects hand's one-line hint shows the first time it appears on this device (7 s). */
const SIDE={ play:'right', fx:'left' }, FXB=['echo','tone','wave'];
let hintT=0;
function sideOf(k, x, W){ const f=x/Math.max(1,W); if(f<0.4) SIDE[k]='left'; else if(f>0.6) SIDE[k]='right'; return SIDE[k]; }
function place(el, side){ el.classList.toggle('left', side==='left'); el.classList.toggle('right', side!=='left'); }
function fill(bar, v){ const f=bar.querySelector('.night-bar-fill'), x=Math.max(0, Math.min(1, +v||0));
  if(bar.classList.contains('night-bar-two')){ const u=x-0.5; f.style.bottom=(50+Math.min(0,u)*100)+'%'; f.style.height=(Math.abs(u)*100)+'%';
    bar.classList.toggle('warm', u<-0.01); bar.classList.toggle('cold', u>0.01); }
  else f.style.height=(x*100)+'%'; }
const forestNow=()=>{ const I=fxInstance(chainKeyOf('ld'),'fdepth'); return I ? { depth:I.params[1].cur, reach:I.params[3] ? I.params[3].cur : 1 } : { depth:0, reach:1 }; };
function bars(now, hv, fxv){
  const W=($('canvas')||{}).width||innerWidth, play=hv.find(h=>h.play), fx=hv.find(h=>!h.play), F=$('nightForestBar'), X=$('nightFxBars');
  const fo=forestNow(), fb=F.querySelector('[data-bar="forest"]');
  fill(fb, fo.depth*fo.reach);   // NIGHT-5: the reach is the whole range, so the hand fills the bar 0…100 % (no mark)
  F.classList.toggle('on', !!play); if(play) place(F, sideOf('play', play.x, W));
  X.classList.toggle('on', !!fx);
  if(fx){ let sd=sideOf('fx', fx.x, W); if(play && sd===SIDE.play) sd= SIDE.play==='left' ? 'right' : 'left'; place(X, sd);
  }   // NIGHT-11 part 4: the effects hand's hint is the coaching line's now
  const vals={ echo:fxv.echo, tone:fxv.tone, wave:fxv.wave };
  for(const id of FXB){ const b=X.querySelector(`[data-bar="${id}"]`); fill(b, vals[id]); b.classList.toggle('act', !!fx && fx.finger===FXB.indexOf(id)); }
  fb.classList.toggle('act', !!play && play.pinch);
}
/* RUN 8 (C8, Night plan §7): THE LIGHTER FOREST (NIGHT-3 stage 5 part 2: «Облегчённый режим», Lightweight mode) — the person's visible choice in ⓘ, remembered on this device; nothing switches by itself
   (user answer E1). On: the room from the delay network instead of the convolution (Forest depth's `light` — the convolution was Night's
   largest fixed cost), struck sounds ring at most 60 % of their caps (audio.setLowPower), the forest picture at medium (the level chosen
   before is remembered and comes back when it is off), no glass blur. `boot` = applied with the face (the scene level only if it differs). */
function lightApply(v, level=true){   // level false: the caller sets the scene level itself (qualitySet)
  setLowPower(v); bedSetLight(v || WEAK); natureLight(v || WEAK); const I=fxInstance(chainKeyOf('ld'),'fdepth'); if(I && I.params[4]) I.params[4].setNorm(v ? 1 : 0);   // NIGHT-4: the music bed's lighter variant too (also on a weak device); NIGHT-8 the stream's
  setSceneLight(v);   // RAIN-R1: a room may draw less under Light (read at its next build)
  if(level && v && sceneLevel()==='full') setSceneLevel('reduced');   // NIGHT-16: Light draws Standard's picture
}
/* NIGHT-16: the player's quality choice → the Light flag, the sound, the picture level (a promise: the level may load its pictures) */
export function qualitySet(q){ if(!QUALITIES.includes(q)) return Promise.resolve(false);
  const S=qualityState(q), inPlace=sceneLightInPlace(S.level); save(KEY.light, S.light); lightApply(S.light==='1', false);
  return inPlace ? Promise.resolve(true) : sceneFadeOut().then(()=>setSceneLevel(S.level)).then(()=>true); }   /* step 7: the picture fades out first (a rebuild takes seconds) */   // SPEED-1 step 6: Standard ↔ Light in the forest without a rebuild (the room turns it in place)
export const qualityOf=()=>quality();
/* UI-1, probes only: the labels of Sound, Music and Mood against what plays; stale (the CONTROL): the room-music word ignored (the old way) */
let labelsStale=false;
export function nightLabelsDbg(o={}){ if('stale' in o) labelsStale=!!o.stale; if(!D) return null; const lab=id=>{ const e=$(id) && $(id).querySelector('.night-val'); return e ? e.textContent : null; };
  const m=bedModeOf(), BN=room().music && room().music.bedNames;
  return { stale:labelsStale, room:sceneRoom(), labels:{ sound:lab('nightSound'), music:lab('nightMusic'), mood:lab('nightMood') },
    want:{ sound:D.timbreName(D.timbre()), music:BN && BN[m] ? L(BN[m]) : t('night.music.'+m), mood:D.moodName ? D.moodName(D.mood()) : t('night.mood.'+D.mood()) }, timbre:D.timbre(), mood:D.mood(), musicMode:m }; }
/* NIGHT-6 slice 1: THE AUDIO CLOCK on the bus — the audio time being output and the page time it comes out at (the output timestamp: the
   output latency is in it), and the current time with the page time it was read at (apps/night/pure/heard.js). Without an output timestamp
   (a suspended context) the latency the context reports stands in. clockOver — probe only (nightClockDbg): a synthetic clock */
let clockOver=null;
function clockNow(){ if(clockOver) return clockOver();
  const now=AC.currentTime, nowPerf=performance.now(); let ts=null; try{ ts=AC.getOutputTimestamp ? AC.getOutputTimestamp() : null; }catch(e){}
  if(ts && ts.performanceTime>0) return { ctx:ts.contextTime, perf:ts.performanceTime, now, nowPerf };
  return { ctx:now-((AC.outputLatency||0)+(AC.baseLatency||0)), perf:nowPerf, now, nowPerf }; }
export const nightClockDbg=fn=>{ clockOver=typeof fn==='function' ? fn : null; return !!clockOver; };
/* RUN 8 (C8): MEASURE THIS DEVICE (development; the phone steps): about 2 minutes — Dark, Forest high, Forest medium, NIGHT-6: Forest medium
   as it was before NIGHT-6 (its additions left out: the baseline), the Lighter forest, 20 s each with a soft note every half second — then the
   numbers as text (copied): audio dropouts per minute, hand detection per second and its time, the camera's and the picture's frame rates;
   NIGHT-6 slice 0: the room's frame time, draw calls, triangles, shader programs and texture memory per step, every opening of the session
   (the first is the cold one) and the device. The person's choices come back after it. */
let measuring=false;
const BEFORE_N6=Object.freeze({ dew:0, webs:0, sorrel:0, forb:0, bilberry:0, anemone:0, nettle:0, sedge:0, fern2:0, softEdges:false, rocks:0, pebbles:0, floaters:0, mistStrips:0, roots:0, logs:0, stumps:0, snags:0, twigs:0, moss:0, ivy:0, woodShrooms:0, flare:false, barkMoss:false, shade:false, gust:false, gustLeaves:0, crowns:false, crownShare:0, young:0, shrubs:0, saplings:0, stars:0, dapple:false, moonFace:false, paint:false, paintR:0, vignette:false, grain:false, breath:false, foxfire:0, flowers:0, groundTex:false, groundMacro:false, litterLeaves:0, litterPebbles:0, litterTwigs:0 });   // NIGHT-6: the counts its slices added, left out for the baseline step
async function measure(){
  if(measuring || !AC) return; measuring=true; const out=$('nightMeasureOut'), wait=ms=>new Promise(r=>setTimeout(r,ms)), SEC=20;
  const keep={ bg:backgroundOf(), level:sceneLevel(), light:load(KEY.light)==='1' }, i=timbreIdx('ld', D.timbre()), rows=[];
  const pb=()=>{ try{ return AC.playbackStats ? AC.playbackStats.underrunEvents : NaN; }catch(e){ return NaN; } };
  let k=0; const notes=setInterval(()=>{ const own='measure:'+(k%2); leadOn(own, 330*Math.pow(2,(k%5)/5), 0.6, i); setTimeout(()=>leadOff(own), 300); k++; }, 500);
  const rn= sceneRoom()==='room.rain' ? 'rain' : 'forest';   // RELEASE-1: the room open now is the one measured (its name in the lines; the forest's NIGHT-6 baseline only in the forest)
  const steps=[['dark', async()=>{ lightApply(false); await setBackground('dark'); }], [rn+' high (Detailed)', async()=>{ await setSceneLevel('full'); await setBackground('forest'); }],
    [rn+' medium (Standard)', async()=>{ await setSceneLevel('reduced'); }], ...(rn==='forest' ? [['forest medium, before NIGHT-6', async()=>{ sceneOptDbg({ lv:BEFORE_N6 }); await setSceneLevel('reduced'); }]] : []),
    ['lighter '+rn+' (Light)', async()=>{ sceneOptDbg(null); await setSceneLevel('reduced'); lightApply(true); }]];
  try{
    out.hidden=false;
    for(let s=0;s<steps.length;s++){ out.textContent=t('night.measuring', { n:s+1, m:steps.length }); await steps[s][1](); await wait(3000);
      const r0=latReport(), u0=pb(), d0=r0.camera.framesDetected, t0=performance.now(); await wait(SEC*1000);
      const r=latReport(), sec=(performance.now()-t0)/1000, sc=sceneInfo();
      const G=sc.guard||{};
      rows.push(`${steps[s][0]}: dropouts ${Number.isFinite(u0) ? Math.round((pb()-u0)*60/sec) : '—'}/min · detection ${((r.camera.framesDetected-d0)/sec).toFixed(1)}/s, ${r.stages.detect.mean} ms (track ${r.stages.detTrack.mean}, search ${r.stages.detSearch.mean}) · hand → sound ${r.handToSoundWithWaitMs} ms · camera ${r.camera.fps} fps · picture ${sc.webgl ? sc.fps+' fps' : 'no WebGL'}`
        +(sc.webgl ? ` · frame ${sc.frameMs} ms, draws ${sc.calls}, triangles ${sc.triangles}, programs ${sc.programs}, textures ${(sc.texBytes/1048576).toFixed(1)} MB, picture ${G.buffer ? G.buffer.join('×') : '—'} (guard step ${G.step}/${G.steps})` : ''));   /* NIGHT-11 part 5: the buffer and the guard */ }
    const O=sceneInfo().openings, op=o=>`${o.level==='full' ? 'high' : 'medium'} ${o.ms} ms (${o.programs} programs)`;
    const text=['Handsong Night — device measurement', navigator.userAgent, (latReport().gpu||{}).renderer||'', ...rows,
      (G=>`resolution guard: ${G.steps} step(s) on this screen at the level now; lowered ${G.downs} time(s), raised ${G.ups}; picture ${G.buffer ? G.buffer.join('×') : '—'}`)(sceneInfo().guard||{}),   // NIGHT-11 part 5
      O.length ? `openings: first ${op(O[0])}; later ${O.slice(1).map(op).join(', ')||'none'}` : 'openings: none',
      `device: ${navigator.deviceMemory||'?'} GB, ${navigator.hardwareConcurrency||'?'} cores, ${devicePixelRatio} device px per CSS px, screen ${screen.width}×${screen.height}`, await persistInfo()].join('\n');   // NIGHT-15: the storage line
    out.textContent=t('night.measured')+'\n'+text; try{ await navigator.clipboard.writeText(text); }catch(e){}
  } finally { clearInterval(notes); for(const o of ['measure:0','measure:1']) leadOff(o); sceneOptDbg(null);
    lightApply(keep.light); await setSceneLevel(keep.level); await setBackground(keep.bg); measuring=false; render(); }
}
/* the room's reach (Forest depth, its 4th parameter) — set on the instance like a fixed value (the hand never aims at it) */
function reachSet(v){ const I=fxInstance(chainKeyOf('ld'),'fdepth'); if(I && I.params[3]) I.params[3].setNorm(Math.max(0, Math.min(1, +v||0))); }
/* RUN 9 (slice 3): the WIND the forest's leaves sway with — the ambience's level (0 when off) and the gust of its wind sweep (its own 0.06-Hz
   drift, read from the audio clock and the sweep's start: the leaves move with what is heard; reading the clock touches no sound) */
function windNow(){ const I=amb && AC ? ambienceInfo() : null; if(!I || !I.on) return { level:0, gust:0 };
  return { level:I.level, gust:Math.sin(2*Math.PI*nature().wind.rate*(AC.currentTime-I.origin)) }; }
/* C5: the three Night effects as the forest reads them — Echo (amount, its time in seconds, feedback), Warmth / Brightness (tilt, ½ flat), Wave */
function nightFxNow(){ const key=chainKeyOf('ld'), E=fxInstance(key,'cecho'), T=fxInstance(key,'ctone'), W=fxInstance(key,'cwave'), a=E ? E.params[0].cur : 0;
  return { echo:a, time: E ? fxDenorm(E.params[1], E.params[1].cur) : NIGHT_FX.echo.time, fb:NIGHT_FX.echo.fbK*a, tone: T ? T.params[1].cur : 0.5, wave: W ? W.params[1].cur : 0 }; }
/* probe only: the shell's state (RUN 8: + the bars — each set's side and visibility, the values shown, which bar glows) */
export const nightShellDbg=()=>{ const F=$('nightForestBar'), X=$('nightFxBars'), bar=b=>({ act:b.classList.contains('act'), h:b.querySelector('.night-bar-fill').style.height });
  return { on, shown:!!(st && st.shown), info, sleep:{ ...sleep }, asleep, fade:lastFade,
    bars:{ forest:{ on:F.classList.contains('on'), side:F.classList.contains('left')?'left':'right', ...bar(F.querySelector('.night-bar')) },
      fx:{ on:X.classList.contains('on'), side:X.classList.contains('left')?'left':'right', bars:Object.fromEntries(FXB.map(id=>[id, bar(X.querySelector(`[data-bar="${id}"]`))])) } },
    hint:coachShown()==='fx' }; };   // NIGHT-11: the effects hint is a coaching line
/* probe only: a sleep timer of `mins` minutes started `ago` ms ago (the fade without waiting minutes) */
export const nightSleepDbg=(mins, ago)=>{ sleepSet(mins); sleep.t0=performance.now()-ago; };
