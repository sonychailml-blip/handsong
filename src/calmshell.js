/* RUN 7 (C6 + C11, Calm plan §5; docs/CALM-QUALITY.md points 4, 5, 6, 9, 10) — THE CALM SHELL (DOM side; the logic is core/calmui.js).
   Shown only in the Calm face (calmShellFace from the profile's face door). Hands in view → only the scene; no hand for 1.5 s → the controls
   fade in: Sound · Mood · Play with · Notes (follow / stay put) · Background · Sleep (+ Forest volume once the ambience exists), and ⓘ
   (privacy, headphones, Lantern, «Show the full note field», the first steps again; in the dev edition the way back to Full). Each round
   button cycles its values; a tap glints (micro-feedback). Every value is written through the DOORS ui.js wires (the same setters the Full
   panels use) — this module holds no musical state. The sleep timer fades the output (audio.outputFade, session only) and dims the scene
   with a black veil together; a tap on the veil wakes. Lantern and the note-field choice are remembered on this device (localStorage). */
import { BUS } from './core/bus.js';
import { CALM_UI, showStep, nextOf, sleepLevel } from './core/calmui.js';
import { outputFade, ambienceOn, ambienceRetune, ambienceTick, fxInstance } from './audio.js';
import { fxDenorm } from './modules/effects/param.js';
import { CALM_FX } from './modules/effects/calm.js';
import { AMB } from './core/ambience.js';
import { t, onLangChange } from './i18n.js';
import { svgIcon } from './icons.js';
import { calmView, setCalmView, chainKeyOf } from './state.js';
import { EDITION } from './edition.js';
import { ghostArm } from './ghost.js';   // C7: the ghost light

const $=id=>document.getElementById(id), READ=BUS.reader();
const KEY={ lantern:'handsong.calmLantern', field:'handsong.calmField', forest:'handsong.calmForest', seen:'handsong.calmSeen' };
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const save=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
let D=null, on=false, st=null, raf=0, info=false, sleep={ mins:0, t0:0 }, asleep=false, lastFade=1, amb=false;
/* the «Forest» volume (the ambience's level, C4c) — remembered on this device */
const forestLevel=()=>{ const v=parseFloat(load(KEY.forest)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : AMB.level; };

/* the doors (ui.js): timbres() / timbre() / setTimbre(id) / timbreName(id); moods() / mood() / setMood(id); hand() 'right'|'left' /
   setHand(v); noteMode() 'note'|'hold' / setNoteMode(v); backgrounds() / bg() / setBg(m); plain() (no glass blur); toFull() (dev);
   firstRun() (C7; absent → the line stays hidden). The ambience (C4c) is driven here: on in a face that has one (profile.ambience), off
   otherwise; its Forest volume is the slider. */
export function calmShellWire(doors){ D=doors; wire(); }
export function calmShellFace(p){
  on=p && p.shell==='calm'; $('calmShell').hidden=!on;
  setCalmView(on ? { glow:p.noteField==='glow', plain:p.labels==='plain', fieldAll:load(KEY.field)==='1' } : null);
  document.body.classList.toggle('calm-plain', on && !!(D && D.plain()));
  amb=on && !!p.ambience; ambienceOn(amb, forestLevel());
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
  $('calmFirstRun').hidden=false; $('calmToFull').hidden= EDITION!=='dev'; $('calmToSound').hidden= EDITION!=='dev';
  $('calmForestRow').hidden= !amb; $('calmForest').value=String(forestLevel());
  document.body.classList.toggle('calm-plain', !!D.plain());
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
  $('calmForest').oninput=e=>{ const v=+e.target.value; save(KEY.forest, String(v)); if(amb) ambienceOn(true, v); };
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
  BUS.set('calmFx', calmFxNow());   // C5: the effects hand's values for the forest's visuals (rings, colour, tremble)
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
/* C5: the three Calm effects as the forest reads them — Echo (amount, its time in seconds, feedback), Warmth / Brightness (tilt, ½ flat), Wave */
function calmFxNow(){ const key=chainKeyOf('ld'), E=fxInstance(key,'cecho'), T=fxInstance(key,'ctone'), W=fxInstance(key,'cwave'), a=E ? E.params[0].cur : 0;
  return { echo:a, time: E ? fxDenorm(E.params[1], E.params[1].cur) : CALM_FX.echo.time, fb:CALM_FX.echo.fbK*a, tone: T ? T.params[1].cur : 0.5, wave: W ? W.params[1].cur : 0 }; }
/* probe only: the shell's state */
export const calmShellDbg=()=>({ on, shown:!!(st && st.shown), info, sleep:{ ...sleep }, asleep, fade:lastFade });
/* probe only: a sleep timer of `mins` minutes started `ago` ms ago (the fade without waiting minutes) */
export const calmSleepDbg=(mins, ago)=>{ sleepSet(mins); sleep.t0=performance.now()-ago; };
