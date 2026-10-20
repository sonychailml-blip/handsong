/* RUN 7 (C6 + C11, Calm plan §5; docs/CALM-QUALITY.md points 4, 5, 6, 9, 10) — THE CALM SHELL (DOM side; the logic is core/calmui.js).
   Shown only in the Calm face (calmShellFace from the profile's face door). Hands in view → only the scene; no hand for 1.5 s → the controls
   fade in: Sound · Mood · Play with · Notes (follow / stay put) · Background · Sleep (+ Forest volume once the ambience exists), and ⓘ
   (privacy, headphones, Lantern, «Show the full note field», the first steps again; in the dev edition the way back to Full). Each round
   button cycles its values; a tap glints (micro-feedback). Every value is written through the DOORS ui.js wires (the same setters the Full
   panels use) — this module holds no musical state. The sleep timer fades the output (audio.outputFade, session only) and dims the scene
   with a black veil together; a tap on the veil wakes. Lantern and the note-field choice are remembered on this device (localStorage). */
import { BUS } from './core/bus.js';
import { CALM_UI, showStep, nextOf, sleepLevel } from './core/calmui.js';
import { sleepProgress } from './core/night.js';   // RUN 9: the sleep timer deepens the night
import { outputFade, ambienceOn, ambienceRetune, ambienceTick, fxInstance, setTimbreTrim, setLowPower, setCalmStrikes, AC, leadOn, leadOff, timbreIdx, ambienceInfo } from './audio.js';
import { fxDenorm } from './modules/effects/param.js';
import { CALM_FX } from './modules/effects/calm.js';
import { AMB } from './core/ambience.js';
import { t, onLangChange } from './i18n.js';
import { svgIcon } from './icons.js';
import { calmView, setCalmView, chainKeyOf, setVolFloor } from './state.js';
import { EDITION } from './edition.js';
import { ghostArm } from './ghost.js';   // C7: the ghost light
import { setSceneLevel, sceneLevel, setBackground, backgroundOf, sceneInfo } from './draw.js';   // RUN 8 (slice 4): the scene's quality (development switch); C8 the measurement
import { latReport } from './latmeter.js';   // C8: the device measurement reads the latency meter

const $=id=>document.getElementById(id), READ=BUS.reader();
const KEY={ lantern:'handsong.calmLantern', field:'handsong.calmField', forest:'handsong.calmForest', seen:'handsong.calmSeen', fxHint:'handsong.calmFxHint', joints:'handsong.calmJoints', light:'handsong.calmLight', lightScene:'handsong.calmLightScene' };
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
let D=null, on=false, st=null, raf=0, info=false, sleep={ mins:0, t0:0 }, asleep=false, lastFade=1, amb=false;
/* the «Forest» slider — remembered on this device. RUN 7: only the volume of the forest's own sounds (the ambience); the hand's depth always
   moved the room over its whole range. RUN 8 (the user): it is the forest AT MOST — the ambience's level AND the room's reach; the hand's depth
   moves within it (Forest depth's `reach`). */
const forestLevel=()=>{ const v=parseFloat(load(KEY.forest)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : AMB.level; };

/* the doors (ui.js): timbres() / timbre() / setTimbre(id) / timbreName(id); moods() / mood() / setMood(id); hand() 'right'|'left' /
   setHand(v); noteMode() 'note'|'hold' / setNoteMode(v); backgrounds() / bg() / setBg(m); plain() (no glass blur); toFull() (dev);
   firstRun() (C7; absent → the line stays hidden). The ambience (C4c) is driven here: on in a face that has one (profile.ambience), off
   otherwise; its Forest volume is the slider. */
export function calmShellWire(doors){ D=doors; wire(); }
export function calmShellFace(p){
  on=p && p.shell==='calm'; $('calmShell').hidden=!on;
  setCalmView(on ? { glow:p.noteField==='glow', plain:p.labels==='plain', fieldAll:load(KEY.field)==='1', tips:load(KEY.joints)!=='all' } : null);   // RUN 8: tips — fingertips only (dev switch)
  document.body.classList.toggle('calm-plain', on && !!(D && D.plain()));
  amb=on && !!p.ambience; ambienceOn(amb, forestLevel());
  setTimbreTrim(on ? p.levels : null);   // RUN 8: the face's per-timbre level trim (Full: none)
  setCalmStrikes(on ? (p.voices||{}) : null);
  setVolFloor(on && p.volume ? p.volume.left : null);   // RUN 8: Calm's gentler left-to-right volume (Full: its own curve)   // RUN 8: Calm's strike caps and cheaper strikes (Full: RUN 7's strike exactly)
  if(on){ reachSet(forestLevel()); lightApply(load(KEY.light)==='1', true); }   // RUN 8: the room's reach = the slider; C8 the person's «Lighter forest»
  else setLowPower(false);
  if(on){ st=null; render(); if(!raf) raf=requestAnimationFrame(tick); }
  else { if(raf) cancelAnimationFrame(raf); raf=0; infoShow(false); sleepSet(0); }
}
const glint=el=>{ el.classList.add('glint'); setTimeout(()=>el.classList.remove('glint'), 450); };
function val(id, text){ $(id).querySelector('.calm-val').textContent=text; }
function setIcon(id, name){ const c=$(id).querySelector('.calm-circ'); if(c.dataset.svg===name) return; c.dataset.svg=name; const g=svgIcon(document, name); if(g) c.replaceChildren(g); }
/* every value as the person reads it — plain words, no cents / Hz / role names */
function render(){
  if(!D || !on) return;
  val('calmSound', D.timbreName(D.timbre()));
  val('calmMood', t('calm.mood.'+D.mood()));
  val('calmHand', t(D.hand()==='left' ? 'calm.handL' : 'calm.handR'));
  const nm=D.noteMode(); val('calmNotes', t(nm==='hold' ? 'calm.notesStay' : 'calm.notesFollow')); setIcon('calmNotes', nm==='hold' ? 'note-stay' : 'note-follow');
  const bg=D.bg(); val('calmBg', t('prof.bg'+bg[0].toUpperCase()+bg.slice(1)));
  sleepLabel(performance.now());
  $('calmLanternTg').classList.toggle('on', load(KEY.lantern)==='1'); $('calmLantern').hidden= load(KEY.lantern)!=='1';
  $('calmFieldTg').classList.toggle('on', !!(calmView && calmView.fieldAll));
  $('calmLightTg').classList.toggle('on', load(KEY.light)==='1'); $('calmMeasure').hidden= EDITION!=='dev';
  $('calmFirstRun').hidden=false; $('calmToFull').hidden= EDITION!=='dev'; $('calmToSound').hidden= EDITION!=='dev';
  $('calmJointsTg').hidden= EDITION!=='dev'; $('calmJointsTg').classList.toggle('on', !!(calmView && calmView.tips));
  $('calmSceneTg').hidden= EDITION!=='dev'; $('calmSceneTg').textContent=t('calm.scene', { lvl:t('calm.scene.'+sceneLevel()) });
  $('calmForestRow').hidden= !amb; $('calmForest').value=String(forestLevel());
  document.body.classList.toggle('calm-plain', !!D.plain() || load(KEY.light)==='1');   // C8: the Lighter forest has no glass blur
}
function sleepLabel(now){ const L=sleepLevel(sleep.t0, sleep.mins, now);
  val('calmSleep', sleep.mins ? t('calm.sleepMin',{ n:Math.max(1, Math.ceil(L.left/60e3)) }) : t('calm.sleepOff')); }
function sleepSet(mins){
  sleep={ mins, t0:performance.now() };
  if(!mins){ asleep=false; $('calmShell').classList.remove('asleep'); $('calmVeilMsg').hidden=true; $('calmVeil').style.opacity='0'; if(lastFade!==1){ lastFade=1; outputFade(1, 0.6); } }
}
function infoShow(v){ info=v; $('calmInfo').hidden=!v; if(v) render(); }
function wire(){
  const tap=(id,f)=>{ $(id).onclick=()=>{ if(!D) return; f(); glint($(id)); render(); }; };
  tap('calmSound', ()=>D.setTimbre(nextOf(D.timbres(), D.timbre())));
  tap('calmMood', ()=>D.setMood(nextOf(D.moods(), D.mood())));
  tap('calmHand', ()=>D.setHand(D.hand()==='left' ? 'right' : 'left'));
  tap('calmNotes', ()=>D.setNoteMode(D.noteMode()==='hold' ? 'note' : 'hold'));
  tap('calmBg', ()=>D.setBg(nextOf(D.backgrounds(), D.bg())));
  tap('calmSleep', ()=>sleepSet(nextOf(CALM_UI.sleepMins, sleep.mins)));
  $('calmInfoBtn').onclick=()=>infoShow(true); $('calmInfoClose').onclick=()=>infoShow(false);
  $('calmLanternTg').onclick=()=>{ save(KEY.lantern, load(KEY.lantern)==='1' ? '0' : '1'); render(); };
  $('calmFieldTg').onclick=()=>{ const all=!(calmView && calmView.fieldAll); save(KEY.field, all ? '1' : '0'); if(calmView) setCalmView({ ...calmView, fieldAll:all }); render(); };
  $('calmFirstRun').onclick=()=>{ infoShow(false); save(KEY.seen,'0'); ghostArm(); };   // C7: the steps show on the next start; the ghost plays now
  $('calmToFull').onclick=()=>{ infoShow(false); if(D.toFull) D.toFull(); };
  $('calmToSound').onclick=()=>{ infoShow(false); if(D.sound) D.sound(); };   // dev: the Sound panel (Diagnostics → Latency meter — step 105)
  $('calmForest').oninput=e=>{ const v=+e.target.value; save(KEY.forest, String(v)); if(amb) ambienceOn(true, v); reachSet(v); };
  $('calmSceneTg').onclick=()=>{ const L=['full','reduced','minimal'], v=L[(L.indexOf(sceneLevel())+1)%L.length]; setSceneLevel(v).then(()=>render()); };
  $('calmLightTg').onclick=()=>{ const v=load(KEY.light)!=='1'; save(KEY.light, v ? '1' : '0'); lightApply(v, false); render(); };
  $('calmMeasure').onclick=()=>{ measure(); };
  $('calmJointsTg').onclick=()=>{ const tips=!(calmView && calmView.tips); save(KEY.joints, tips ? 'tips' : 'all'); if(calmView) setCalmView({ ...calmView, tips }); render(); };
  $('calmVeil').onclick=()=>{ if(asleep) sleepSet(0); };
  onLangChange(render);
}
/* once per screen frame while Calm shows: the controls' visibility (hands), the sleep timer */
function tick(now){
  raf=0; if(!on) return;
  const hv=READ.get('handsView'), n= Array.isArray(hv) ? hv.length : 0;
  st=showStep(st, n, now);
  $('calmShell').classList.toggle('show', st.shown && !info && !asleep);
  if(amb){ ambienceRetune(); ambienceTick(); }   // the drone follows the mood; the crickets are scheduled ahead
  const fxv=calmFxNow(); BUS.set('calmFx', fxv);   // C5: the effects hand's values for the forest's visuals (rings, colour, tremble)
  BUS.set('calmNight', { mood:D.mood(), sleep:sleepProgress(sleep.t0, sleep.mins, now), wind:windNow() });   // RUN 9: the forest's palette (mood), the night's depth (sleep), the wind
  bars(now, Array.isArray(hv) ? hv : [], fxv);   // RUN 8 (slice 3)
  if(sleep.mins){ const L=sleepLevel(sleep.t0, sleep.mins, now);
    if(Math.abs(L.level-lastFade)>0.002 || (L.level===0 && lastFade!==0)){ lastFade=L.level; outputFade(L.level, 0.4); }
    $('calmVeil').style.opacity=String(1-L.level);
    if(L.asleep && !asleep){ asleep=true; $('calmShell').classList.add('asleep'); $('calmVeilMsg').hidden=false; }
    if(st.shown && Math.floor(now/1000)!==Math.floor((now-17)/1000)) sleepLabel(now); }
  raf=requestAnimationFrame(tick);
}
/* RUN 7 (C7): THE CALM START — when the app boots in Calm (the calm edition, or ?calm in dev) the start card is Calm's (body.calm-boot; the
   first steps only until this device has begun once — body.calm-seen). «Begin» runs the very same start handler as Play, inside this click
   (rule #1); a FIRST start also arms the ghost light. Only a person's own tap arms it (never a profile switch — the probes switch). */
const BOOT= EDITION==='calm' || new URLSearchParams(location.search).has('calm');
if(BOOT){ document.body.classList.add('calm-boot'); if(load(KEY.seen)==='1') document.body.classList.add('calm-seen');
  $('calmBegin').onclick=()=>{ const go=$('startBtn').onclick; if(load(KEY.seen)!=='1'){ save(KEY.seen,'1'); ghostArm(); } if(go) go(); }; }
/* RUN 8 (slice 3): THE BARS while the hands play — the forest's depth (depth × reach, the reach as a mark) on the playing hand's side, the
   three effects (Echo · Warmth ↔ Brightness from the middle · Wave) on the effects hand's side; the bar of the finger in use glows; each set
   fades in with its hand and out when it leaves; a set's side follows where its hand is on the screen (40 / 60 % of the width, hysteresis),
   so «Play with: left hand» moves them. The effects hand's one-line hint shows the first time it appears on this device (7 s). */
const SIDE={ play:'right', fx:'left' }, FXB=['echo','tone','wave'];
let hintT=0;
function sideOf(k, x, W){ const f=x/Math.max(1,W); if(f<0.4) SIDE[k]='left'; else if(f>0.6) SIDE[k]='right'; return SIDE[k]; }
function place(el, side){ el.classList.toggle('left', side==='left'); el.classList.toggle('right', side!=='left'); }
function fill(bar, v){ const f=bar.querySelector('.calm-bar-fill'), x=Math.max(0, Math.min(1, +v||0));
  if(bar.classList.contains('calm-bar-two')){ const u=x-0.5; f.style.bottom=(50+Math.min(0,u)*100)+'%'; f.style.height=(Math.abs(u)*100)+'%';
    bar.classList.toggle('warm', u<-0.01); bar.classList.toggle('cold', u>0.01); }
  else f.style.height=(x*100)+'%'; }
const forestNow=()=>{ const I=fxInstance(chainKeyOf('ld'),'fdepth'); return I ? { depth:I.params[1].cur, reach:I.params[3] ? I.params[3].cur : 1 } : { depth:0, reach:1 }; };
function bars(now, hv, fxv){
  const W=($('canvas')||{}).width||innerWidth, play=hv.find(h=>h.play), fx=hv.find(h=>!h.play), F=$('calmForestBar'), X=$('calmFxBars');
  const fo=forestNow(), fb=F.querySelector('[data-bar="forest"]');
  fill(fb, fo.depth*fo.reach); fb.querySelector('.calm-bar-max').style.bottom=(fo.reach*100)+'%';
  const mk=$('calmForestMark'); if(mk) mk.style.left=`calc(var(--calm-icon) / 2 + (100% - var(--calm-icon)) * ${(fo.depth*fo.reach).toFixed(4)})`;   // the panel's moving mark
  F.classList.toggle('on', !!play); if(play) place(F, sideOf('play', play.x, W));
  X.classList.toggle('on', !!fx);
  if(fx){ let sd=sideOf('fx', fx.x, W); if(play && sd===SIDE.play) sd= SIDE.play==='left' ? 'right' : 'left'; place(X, sd);
    if(load(KEY.fxHint)!=='1' && !hintT){ save(KEY.fxHint,'1'); $('calmFxHint').hidden=false; hintT=setTimeout(()=>{ $('calmFxHint').hidden=true; hintT=0; }, 7000); } }
  const vals={ echo:fxv.echo, tone:fxv.tone, wave:fxv.wave };
  for(const id of FXB){ const b=X.querySelector(`[data-bar="${id}"]`); fill(b, vals[id]); b.classList.toggle('act', !!fx && fx.finger===FXB.indexOf(id)); }
  fb.classList.toggle('act', !!play && play.pinch);
}
/* RUN 8 (C8, Calm plan §7): THE LIGHTER FOREST — the person's visible choice in ⓘ, remembered on this device; nothing switches by itself
   (user answer E1). On: the room from the delay network instead of the convolution (Forest depth's `light` — the convolution was Calm's
   largest fixed cost), struck sounds ring at most 60 % of their caps (audio.setLowPower), the forest picture at medium (the level chosen
   before is remembered and comes back when it is off), no glass blur. `boot` = applied with the face (the scene level only if it differs). */
function lightApply(v, boot){
  setLowPower(v); const I=fxInstance(chainKeyOf('ld'),'fdepth'); if(I && I.params[4]) I.params[4].setNorm(v ? 1 : 0);
  if(v){ const cur=sceneLevel(); if(cur==='full'){ if(!boot || load(KEY.lightScene)==null) save(KEY.lightScene, cur); setSceneLevel('reduced'); } }
  else if(!boot){ const back=load(KEY.lightScene); if(back && sceneLevel()==='reduced') setSceneLevel(back); }
}
/* RUN 8 (C8): MEASURE THIS DEVICE (development; the phone steps): about 2 minutes — Dark, Forest high, Forest medium, the Lighter forest, 25 s
   each with a soft note every half second — then the numbers as text (copied): audio dropouts per minute, hand detection per second and its
   time, the camera's and the picture's frame rates. The person's choices come back after it. */
let measuring=false;
async function measure(){
  if(measuring || !AC) return; measuring=true; const out=$('calmMeasureOut'), wait=ms=>new Promise(r=>setTimeout(r,ms)), SEC=25;
  const keep={ bg:backgroundOf(), level:sceneLevel(), light:load(KEY.light)==='1' }, i=timbreIdx('ld', D.timbre()), rows=[];
  const pb=()=>{ try{ return AC.playbackStats ? AC.playbackStats.underrunEvents : NaN; }catch(e){ return NaN; } };
  let k=0; const notes=setInterval(()=>{ const own='measure:'+(k%2); leadOn(own, 330*Math.pow(2,(k%5)/5), 0.6, i); setTimeout(()=>leadOff(own), 300); k++; }, 500);
  const steps=[['dark', async()=>{ lightApply(false,false); await setBackground('dark'); }], ['forest high', async()=>{ await setSceneLevel('full'); await setBackground('forest'); }],
    ['forest medium', async()=>{ await setSceneLevel('reduced'); }], ['lighter forest', async()=>{ lightApply(true,false); }]];
  try{
    out.hidden=false;
    for(let s=0;s<steps.length;s++){ out.textContent=t('calm.measuring', { n:s+1, m:steps.length }); await steps[s][1](); await wait(3000);
      const r0=latReport(), u0=pb(), d0=r0.camera.framesDetected, t0=performance.now(); await wait(SEC*1000);
      const r=latReport(), sec=(performance.now()-t0)/1000, sc=sceneInfo();
      rows.push(`${steps[s][0]}: dropouts ${Number.isFinite(u0) ? Math.round((pb()-u0)*60/sec) : '—'}/min · detection ${((r.camera.framesDetected-d0)/sec).toFixed(1)}/s, ${r.stages.detect.mean} ms · camera ${r.camera.fps} fps · picture ${sc.webgl ? sc.fps+' fps' : 'no WebGL'}`); }
    const text=['Handsong Calm — device measurement', navigator.userAgent, (latReport().gpu||{}).renderer||'', ...rows].join('\n');
    out.textContent=t('calm.measured')+'\n'+text; try{ await navigator.clipboard.writeText(text); }catch(e){}
  } finally { clearInterval(notes); for(const o of ['measure:0','measure:1']) leadOff(o);
    lightApply(keep.light,false); await setSceneLevel(keep.level); await setBackground(keep.bg); measuring=false; render(); }
}
/* the room's reach (Forest depth, its 4th parameter) — set on the instance like a fixed value (the hand never aims at it) */
function reachSet(v){ const I=fxInstance(chainKeyOf('ld'),'fdepth'); if(I && I.params[3]) I.params[3].setNorm(Math.max(0, Math.min(1, +v||0))); }
/* RUN 9 (slice 3): the WIND the forest's leaves sway with — the ambience's level (0 when off) and the gust of its wind sweep (its own 0.06-Hz
   drift, read from the audio clock and the sweep's start: the leaves move with what is heard; reading the clock touches no sound) */
function windNow(){ const I=amb && AC ? ambienceInfo() : null; if(!I || !I.on) return { level:0, gust:0 };
  return { level:I.level, gust:Math.sin(2*Math.PI*AMB.wind.rate*(AC.currentTime-I.origin)) }; }
/* C5: the three Calm effects as the forest reads them — Echo (amount, its time in seconds, feedback), Warmth / Brightness (tilt, ½ flat), Wave */
function calmFxNow(){ const key=chainKeyOf('ld'), E=fxInstance(key,'cecho'), T=fxInstance(key,'ctone'), W=fxInstance(key,'cwave'), a=E ? E.params[0].cur : 0;
  return { echo:a, time: E ? fxDenorm(E.params[1], E.params[1].cur) : CALM_FX.echo.time, fb:CALM_FX.echo.fbK*a, tone: T ? T.params[1].cur : 0.5, wave: W ? W.params[1].cur : 0 }; }
/* probe only: the shell's state (RUN 8: + the bars — each set's side and visibility, the values shown, which bar glows) */
export const calmShellDbg=()=>{ const F=$('calmForestBar'), X=$('calmFxBars'), bar=b=>({ act:b.classList.contains('act'), h:b.querySelector('.calm-bar-fill').style.height });
  return { on, shown:!!(st && st.shown), info, sleep:{ ...sleep }, asleep, fade:lastFade,
    bars:{ forest:{ on:F.classList.contains('on'), side:F.classList.contains('left')?'left':'right', ...bar(F.querySelector('.calm-bar')) },
      fx:{ on:X.classList.contains('on'), side:X.classList.contains('left')?'left':'right', bars:Object.fromEntries(FXB.map(id=>[id, bar(X.querySelector(`[data-bar="${id}"]`))])) } },
    hint:!$('calmFxHint').hidden }; };
/* probe only: a sleep timer of `mins` minutes started `ago` ms ago (the fade without waiting minutes) */
export const calmSleepDbg=(mins, ago)=>{ sleepSet(mins); sleep.t0=performance.now()-ago; };
