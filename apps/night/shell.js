/* RUN 7 (C6 + C11, Night plan §5; docs/night/QUALITY.md points 4, 5, 6, 9, 10) — THE NIGHT SHELL (DOM side; the logic is core/nightui.js).
   Shown only in the Night face (nightShellFace from the profile's face door). Hands in view → only the scene; no hand for 1.5 s → the controls
   fade in: (Room, only with two rooms or more —) Music · Sound / Mood · Notes (follow / stay put) · Sleep, and the settings card (NIGHT-2, was ⓘ:
   Hand — calibration, playing hand, two sliders, the hand's points; Music — volume, the room's sounds, response; View — what is on screen, the
   note field, the Lightweight mode;
   the first steps again). Each round button cycles its values; a tap glints (micro-feedback). Every value is written through the DOORS ui.js
   wires (the same setters the Full panels use) — this module holds no musical state. The sleep timer fades the output (audio.outputFade,
   session only) and dims the scene with a black veil together; a tap on the veil wakes. The choices are remembered on this device (localStorage). */
import { BUS } from '../../core/pure/bus.js';
import { NIGHT_UI, showStep, nextOf, sleepLevel } from '../../core/pure/nightui.js';
import { sleepProgress } from './pure/cycle.js';   // RUN 9: the sleep timer deepens the night
import { outputFade, ambienceOn, ambienceRetune, ambienceTick, fxInstance, setTimbreTrim, setLowPower, setNightStrikes, setLeanPath, leadParkTick, AC, leadOn, leadOff, timbreIdx, ambienceInfo } from '../../core/audio.js';
import { fxDenorm } from '../../core/modules/effects/param.js';
import { NIGHT_FX } from '../../core/modules/effects/night-fx.js';
import { ROOMS, roomById } from './rooms/index.js';   // NIGHT-3: the current room's nature recipe (its default level, its wind)
import { bedNext } from './pure/bed.js';
import { bedSetMode, bedModeOf, bedSetVolume, bedVolumeOf, bedSetAnswer, bedAnswerOf, bedTick, bedSetLight } from './bed.js';   // NIGHT-3 stage 4: the music bed (NIGHT-4: v2, Lighter)
import { t, L, onLangChange } from '../../core/i18n.js';
import { svgIcon } from '../../core/icons.js';
import { nightView, setNightView, chainKeyOf, setVolFloor } from '../../core/state.js';
import { EDITION } from '../../core/edition.js';
import { ghostArm } from './ghost.js';   // C7: the ghost light
import { calWire, calOfferIfNew, calActive, calSideApply, calSideSet, calSettingsRender, calAbort } from './calib.js';   // NIGHT-2: the hand's calibration (its picture is drawn by the loop: main.js afterDraw)
import { setSceneLevel, sceneLevel, setBackground, backgroundOf, sceneInfo, sceneRoom, sceneRooms, sceneOptDbg } from './scene/host.js';   // RUN 8 (slice 4): the scene's quality (development switch); C8 the measurement
import { roomSwitch, roomNext } from './roomswitch.js';   // NIGHT-3 stage 5 part 2: the Room button
import { latReport } from '../../core/legacy-ui/latmeter.js';   // C8: the device measurement reads the latency meter
import { cardsWire, cardsShow, cardsOpen } from './cards.js';   // NIGHT-7: the first cards

const $=id=>document.getElementById(id), READ=BUS.reader();
/* NIGHT-1 stage 2: what this app never plays leaves the graph (the sound stays the same to rounding; row «NIGHT lean path»). Its chain has no drive, brightness or tremolo; its one role is solo */
export const LEAN_PATH=Object.freeze({ expr:true, voice:true, roles:true, closedFx:true, park:true });
const KEY={ field:'handsong.nightField', roomSound:'handsong.nightForest', seen:'handsong.nightSeen', fxHint:'handsong.nightFxHint', joints:'handsong.nightJoints', light:'handsong.nightLight', lightScene:'handsong.nightLightScene',
  music:'handsong.nightMusic', musicVol:'handsong.nightMusicVol', musicAnswer:'handsong.nightMusicAnswer' };   // NIGHT-3 stage 4: the bed's mode (off at first start), volume, response
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
let D=null, on=false, st=null, raf=0, info=false, sleep={ mins:0, t0:0 }, asleep=false, lastFade=1, amb=false;
let begun=false, firstRun=false, startDue=false, defHand='right';   // NIGHT-2: a person's Begin, its first start, the offer due on the next frame, the profile's playing hand
const GHOST_WAIT=10000;   // after the calibration the ghost waits this long for the hand to leave the frame
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
export function nightShellWire(doors){ D=doors; wire(); calWire(D, { leave:()=>infoShow(false), defHand:()=>defHand, changed:()=>render() }); }
export function nightShellFace(p){
  on=p && p.shell==='night'; $('nightShell').hidden=!on;
  setNightView(on ? { glow:p.noteField==='glow', plain:p.labels==='plain', fieldAll:load(KEY.field)==='1', tips:load(KEY.joints)!=='all' } : null);   // RUN 8: tips — fingertips only (dev switch)
  document.body.classList.toggle('night-plain', on && !!(D && D.plain()));
  /* NIGHT-3 stage 4: the music bed (its mode before the ambience: with the bed on, the drone stays out) */
  if(on){ const v=parseFloat(load(KEY.musicVol)); if(Number.isFinite(v)) bedSetVolume(v); bedSetAnswer(load(KEY.musicAnswer)==='1'); bedSetMode(load(KEY.music)||'off', room().bed, room().bed2); }
  else bedSetMode('off');
  amb=on && !!p.ambience; ambienceOn(amb, roomSound());
  setTimbreTrim(on ? p.levels : null);   // RUN 8: the face's per-timbre level trim (Full: none)
  setNightStrikes(on ? (p.voices||{}) : null);
  setLeanPath(on ? LEAN_PATH : null);
  setVolFloor(on && p.volume ? p.volume.left : null);
  defHand= p && p.handFn && p.handFn.ld && p.handFn.ld.R==='fx' ? 'left' : 'right';
  if(on){ calSideApply(); if(begun){ begun=false; startDue=true; } }   // NIGHT-2: a calibrated side sets the roles; the offer follows a person's own Begin
  else calAbort();   // RUN 8: Night's gentler left-to-right volume (Full: its own curve)   // RUN 8: Night's strike caps and cheaper strikes (Full: RUN 7's strike exactly)
  if(on){ reachSet(REACH); lightApply(load(KEY.light)==='1', true); }   // the hand's reach: the whole range (NIGHT-5); C8 the person's «Lighter forest»
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
  val('nightMusic', t('night.music.'+bedModeOf()));
  val('nightSound', D.timbreName(D.timbre()));
  val('nightMood', t('night.mood.'+D.mood()));
  const nm=D.noteMode(); val('nightNotes', t(nm==='hold' ? 'night.notesStay' : 'night.notesFollow')); setIcon('nightNotes', nm==='hold' ? 'note-stay' : 'note-follow');
  sleepLabel(performance.now());
  $('nightFieldTg').classList.toggle('on', !!(nightView && nightView.fieldAll));
  $('nightLightTg').classList.toggle('on', load(KEY.light)==='1'); $('nightMeasure').hidden= EDITION!=='dev';
  $('nightFirstRun').hidden=false; $('nightToSound').hidden= EDITION!=='dev';
  { const bgs=D.backgrounds(), bg=D.bg(); for(const b of $('nightBgSeg').children){ b.hidden=!bgs.includes(b.dataset.bg); b.classList.toggle('on', b.dataset.bg===bg); } }   // NIGHT-2: settings
  for(const b of $('nightDotsSeg').children) b.classList.toggle('on', (b.dataset.dots==='tips')===!!(nightView && nightView.tips));
  for(const b of $('nightHandSeg').children) b.classList.toggle('on', b.dataset.hand===D.hand());   // NIGHT-2 stage 3: «Play with» moved here from the main screen
  calSettingsRender();
  $('nightSceneTg').hidden= EDITION!=='dev'; $('nightSceneTg').textContent=t('night.scene', { lvl:t('night.scene.'+sceneLevel()) });
  for(const b of $('nightQualSeg').children) b.classList.toggle('on', b.dataset.q===sceneLevel());   // NIGHT-7: the players' picture choice
  $('nightRoomSoundRow').hidden= !amb; $('nightRoomSound').value=String(roomSound());
  $('nightMusicVol').value=String(bedVolumeOf()); $('nightMusicAnswerTg').classList.toggle('on', bedAnswerOf());
  document.body.classList.toggle('night-plain', !!D.plain() || load(KEY.light)==='1');   // C8: the Lighter forest has no glass blur
}
function sleepLabel(now){ const L=sleepLevel(sleep.t0, sleep.mins, now);
  val('nightSleep', sleep.mins ? t('night.sleepMin',{ n:Math.max(1, Math.ceil(L.left/60e3)) }) : t('night.sleepOff')); }
function sleepSet(mins){
  sleep={ mins, t0:performance.now() };
  if(!mins){ asleep=false; $('nightShell').classList.remove('asleep'); $('nightVeilMsg').hidden=true; $('nightVeil').style.opacity='0'; if(lastFade!==1){ lastFade=1; outputFade(1, 0.6); } }
}
function infoShow(v){ info=v; $('nightInfo').hidden=!v; if(v) render(); }
function wire(){
  const tap=(id,f)=>{ $(id).onclick=()=>{ if(!D) return; f(); glint($(id)); render(); }; };
  tap('nightRoom', ()=>{ const id=roomNext(); if(id) roomSwitch(id).then(()=>render()); });   // NIGHT-3 stage 5 part 2: the next room
  tap('nightMusic', ()=>{ const m=bedNext(bedModeOf()); bedSetMode(m, room().bed, room().bed2); save(KEY.music, m); if(amb) ambienceOn(true, roomSound()); });   // NIGHT-3 stage 4: off → still → drift → glimmer → off; the drone hands over
  tap('nightSound', ()=>D.setTimbre(nextOf(D.timbres(), D.timbre())));
  tap('nightMood', ()=>D.setMood(nextOf(D.moods(), D.mood())));
  tap('nightNotes', ()=>D.setNoteMode(D.noteMode()==='hold' ? 'note' : 'hold'));
  tap('nightSleep', ()=>sleepSet(nextOf(NIGHT_UI.sleepMins, sleep.mins)));
  $('nightInfoBtn').onclick=()=>infoShow(true); $('nightInfoClose').onclick=()=>infoShow(false);
  $('nightFieldTg').onclick=()=>{ const all=!(nightView && nightView.fieldAll); save(KEY.field, all ? '1' : '0'); if(nightView) setNightView({ ...nightView, fieldAll:all }); render(); };
  $('nightFirstRun').onclick=()=>{ infoShow(false); save(KEY.seen,'0'); ghostArm(); };   // C7: the steps show on the next start; the ghost plays now
  $('nightToSound').onclick=()=>{ infoShow(false); if(D.sound) D.sound(); };   // dev: the Sound panel (Diagnostics → Latency meter — step 105)
  $('nightMusicVol').oninput=e=>{ const v=+e.target.value; save(KEY.musicVol, String(v)); bedSetVolume(v); };
  $('nightMusicAnswerTg').onclick=()=>{ const v=!bedAnswerOf(); save(KEY.musicAnswer, v ? '1' : '0'); bedSetAnswer(v); render(); };
  $('nightRoomSound').oninput=e=>{ const v=+e.target.value; save(KEY.roomSound, String(v)); if(amb) ambienceOn(true, v); };   // the room's sound only (NIGHT-3 stage 5)
  $('nightSceneTg').onclick=()=>{ const L=['full','reduced','minimal'], v=L[(L.indexOf(sceneLevel())+1)%L.length]; setSceneLevel(v).then(()=>render()); };
  $('nightLightTg').onclick=()=>{ const v=load(KEY.light)!=='1'; save(KEY.light, v ? '1' : '0'); lightApply(v, false); render(); };
  $('nightMeasure').onclick=()=>{ measure(); };
  /* NIGHT-7: the picture's quality (Detailed ends the Lightweight mode, which keeps the picture standard); the first cards again */
  for(const b of $('nightQualSeg').children) b.onclick=()=>{ const q=b.dataset.q; if(q==='full' && load(KEY.light)==='1'){ save(KEY.light, '0'); lightApply(false, false); } setSceneLevel(q).then(()=>render()); render(); };
  $('nightHowTo').onclick=()=>{ infoShow(false); cardsShow(); };
  cardsWire();
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
  $('nightShell').classList.toggle('show', st.shown && !info && !asleep && !calActive() && !cardsOpen());
  if(startDue){ startDue=false; startFlow(); }
  if(amb){ ambienceRetune(); ambienceTick(); }   // the drone follows the mood; the crickets are scheduled ahead
  bedTick();   // NIGHT-3 stage 4: the music bed's next events, ahead on the audio clock
  if(AC) BUS.set('audioClock', clockNow());   // NIGHT-6 slice 1: the room shows the bed's events when they are heard
  leadParkTick();   // NIGHT-1: a silent flute's bank stops being computed
  const fxv=nightFxNow(); BUS.set('nightFx', fxv);   // C5: the effects hand's values for the forest's visuals (rings, colour, tremble)
  BUS.set('nightSky', { mood:D.mood(), sleep:sleepProgress(sleep.t0, sleep.mins, now), wind:windNow() });   // RUN 9: the forest's palette (mood), the night's depth (sleep), the wind
  bars(now, Array.isArray(hv) ? hv : [], fxv);   // RUN 8 (slice 3)
  if(sleep.mins){ const L=sleepLevel(sleep.t0, sleep.mins, now);
    if(Math.abs(L.level-lastFade)>0.002 || (L.level===0 && lastFade!==0)){ lastFade=L.level; outputFade(L.level, 0.4); }
    $('nightVeil').style.opacity=String(1-L.level);
    if(L.asleep && !asleep){ asleep=true; $('nightShell').classList.add('asleep'); $('nightVeilMsg').hidden=false; }
    if(st.shown && Math.floor(now/1000)!==Math.floor((now-17)/1000)) sleepLabel(now); }
  raf=requestAnimationFrame(tick);
}
/* RUN 7 (C7): THE NIGHT START — the start card is Night's (body.night-boot; the
   first steps only until this device has begun once — body.night-seen). «Begin» runs the very same start handler as Play, inside this click
   (rule #1); a FIRST start also arms the ghost light. Only a person's own tap arms it (never a profile switch — the probes switch). */
document.body.classList.add('night-boot'); if(load(KEY.seen)==='1') document.body.classList.add('night-seen');
$('nightBegin').onclick=()=>{ const go=$('startBtn').onclick; begun=true; if(load(KEY.seen)!=='1'){ save(KEY.seen,'1'); firstRun=true; } if(go) go(); };
/* NIGHT-2: once the camera runs after a Begin: the calibration offer for a camera not offered yet, then (a first start) the ghost; without an offer the ghost comes at once, as before */
function startFlow(){ const first=firstRun; firstRun=false;
  const then=after=>{ if(first) cardsShow(()=>ghostArm(after ? { wait:GHOST_WAIT } : {})); };   // NIGHT-7: a first start shows the cards, then the ghost
  if(!calOfferIfNew(()=>then(true))) then(false); }
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
    if(load(KEY.fxHint)!=='1' && !hintT){ save(KEY.fxHint,'1'); $('nightFxHint').hidden=false; hintT=setTimeout(()=>{ $('nightFxHint').hidden=true; hintT=0; }, 7000); } }
  const vals={ echo:fxv.echo, tone:fxv.tone, wave:fxv.wave };
  for(const id of FXB){ const b=X.querySelector(`[data-bar="${id}"]`); fill(b, vals[id]); b.classList.toggle('act', !!fx && fx.finger===FXB.indexOf(id)); }
  fb.classList.toggle('act', !!play && play.pinch);
}
/* RUN 8 (C8, Night plan §7): THE LIGHTER FOREST (NIGHT-3 stage 5 part 2: «Облегчённый режим», Lightweight mode) — the person's visible choice in ⓘ, remembered on this device; nothing switches by itself
   (user answer E1). On: the room from the delay network instead of the convolution (Forest depth's `light` — the convolution was Night's
   largest fixed cost), struck sounds ring at most 60 % of their caps (audio.setLowPower), the forest picture at medium (the level chosen
   before is remembered and comes back when it is off), no glass blur. `boot` = applied with the face (the scene level only if it differs). */
function lightApply(v, boot){
  setLowPower(v); bedSetLight(v || WEAK); const I=fxInstance(chainKeyOf('ld'),'fdepth'); if(I && I.params[4]) I.params[4].setNorm(v ? 1 : 0);   // NIGHT-4: the music bed's lighter variant too (also on a weak device)
  if(v){ const cur=sceneLevel(); if(cur==='full'){ if(!boot || load(KEY.lightScene)==null) save(KEY.lightScene, cur); setSceneLevel('reduced'); } }
  else if(!boot){ const back=load(KEY.lightScene); if(back && sceneLevel()==='reduced') setSceneLevel(back); }
}
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
const BEFORE_N6=Object.freeze({ dew:0, webs:0, sorrel:0, forb:0, bilberry:0, anemone:0, nettle:0, sedge:0, fern2:0, softEdges:false, rocks:0, pebbles:0, floaters:0, mistStrips:0, roots:0, logs:0, stumps:0, snags:0, twigs:0, moss:0, ivy:0, woodShrooms:0, flare:false, barkMoss:false, shade:false, gust:false, gustLeaves:0, crowns:false, crownShare:0, young:0, shrubs:0, saplings:0, stars:0, dapple:false, moonFace:false, paint:false, paintR:0, vignette:false, grain:false, breath:false, foxfire:0, flowers:0, groundTex:false });   // NIGHT-6: the counts its slices added, left out for the baseline step
async function measure(){
  if(measuring || !AC) return; measuring=true; const out=$('nightMeasureOut'), wait=ms=>new Promise(r=>setTimeout(r,ms)), SEC=20;
  const keep={ bg:backgroundOf(), level:sceneLevel(), light:load(KEY.light)==='1' }, i=timbreIdx('ld', D.timbre()), rows=[];
  const pb=()=>{ try{ return AC.playbackStats ? AC.playbackStats.underrunEvents : NaN; }catch(e){ return NaN; } };
  let k=0; const notes=setInterval(()=>{ const own='measure:'+(k%2); leadOn(own, 330*Math.pow(2,(k%5)/5), 0.6, i); setTimeout(()=>leadOff(own), 300); k++; }, 500);
  const steps=[['dark', async()=>{ lightApply(false,false); await setBackground('dark'); }], ['forest high', async()=>{ await setSceneLevel('full'); await setBackground('forest'); }],
    ['forest medium', async()=>{ await setSceneLevel('reduced'); }], ['forest medium, before NIGHT-6', async()=>{ sceneOptDbg({ lv:BEFORE_N6 }); await setSceneLevel('reduced'); }],
    ['lighter forest', async()=>{ sceneOptDbg(null); await setSceneLevel('reduced'); lightApply(true,false); }]];
  try{
    out.hidden=false;
    for(let s=0;s<steps.length;s++){ out.textContent=t('night.measuring', { n:s+1, m:steps.length }); await steps[s][1](); await wait(3000);
      const r0=latReport(), u0=pb(), d0=r0.camera.framesDetected, t0=performance.now(); await wait(SEC*1000);
      const r=latReport(), sec=(performance.now()-t0)/1000, sc=sceneInfo();
      rows.push(`${steps[s][0]}: dropouts ${Number.isFinite(u0) ? Math.round((pb()-u0)*60/sec) : '—'}/min · detection ${((r.camera.framesDetected-d0)/sec).toFixed(1)}/s, ${r.stages.detect.mean} ms · camera ${r.camera.fps} fps · picture ${sc.webgl ? sc.fps+' fps' : 'no WebGL'}`
        +(sc.webgl ? ` · frame ${sc.frameMs} ms, draws ${sc.calls}, triangles ${sc.triangles}, programs ${sc.programs}, textures ${(sc.texBytes/1048576).toFixed(1)} MB` : '')); }
    const O=sceneInfo().openings, op=o=>`${o.level==='full' ? 'high' : 'medium'} ${o.ms} ms (${o.programs} programs)`;
    const text=['Handsong Night — device measurement', navigator.userAgent, (latReport().gpu||{}).renderer||'', ...rows,
      O.length ? `openings: first ${op(O[0])}; later ${O.slice(1).map(op).join(', ')||'none'}` : 'openings: none',
      `device: ${navigator.deviceMemory||'?'} GB, ${navigator.hardwareConcurrency||'?'} cores, ${devicePixelRatio} device px per CSS px, screen ${screen.width}×${screen.height}`].join('\n');
    out.textContent=t('night.measured')+'\n'+text; try{ await navigator.clipboard.writeText(text); }catch(e){}
  } finally { clearInterval(notes); for(const o of ['measure:0','measure:1']) leadOff(o); sceneOptDbg(null);
    lightApply(keep.light,false); await setSceneLevel(keep.level); await setBackground(keep.bg); measuring=false; render(); }
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
    hint:!$('nightFxHint').hidden }; };
/* probe only: a sleep timer of `mins` minutes started `ago` ms ago (the fade without waiting minutes) */
export const nightSleepDbg=(mins, ago)=>{ sleepSet(mins); sleep.t0=performance.now()-ago; };
