/* LIGHT-3b — THE CONTROLS WHEN THE HANDS LEAVE (variant B, the founder's choice at LIGHT-1) and their menus. Shown once no hand has been seen for
   CTL_IDLE_MS (a sheet that is open stays open whatever the hands do). On top: the key and A4 large (→ the key sheet: 12 keys, A4 432 / 440 /
   442 or ±1 Hz), the scale under it (→ the scale sheet: the profile's moods by their menu group). Below, four round buttons: the sound (→ the
   profile's timbres), the hands (→ each hand's function — effects / notes / notes held / theremin — and octaves, the field: 4 or 1 note a band),
   the camera (one tap: front ↔ back), the sensitivity (→ hand travel and effects, as in Night). Every change silences the live notes first
   (as the shared UI's softAllOff did for the solo). The person's choices are kept on this device (namespaced «light») and restored at the start. */
import { NOTE_NAMES, GRP, scaleById, CUR, leadFreqTi, tuningIndexOf } from '../../core/scales.js';
import { scaleId, tonic, aRef, handFn, rectPref, camFacing, leadIdx, setScaleId, setTonic, setTonicCents, setARef, setHandFn, setRectPref } from '../../core/state.js';
import { setLeadInstr, timbreIdx, timbreIdOf, timbresOf } from '../../core/audio.js';
import { switchCamera } from '../../core/vision.js';
import { profileOf } from '../../core/profile.js';
import { L, t, onLangChange } from '../../core/i18n.js';
import { nsKey } from '../../core/storens.js';
import { lightAllOff } from './engine.js';
import { lightHandsReset, setLightFxSens, setLightTravel, setLightOctShift, lightOctShift } from './gestures.js';
import { onLightFrame, onLightStart, lightStarted, PROFILE } from './boot.js';
import { lightCalOn, lightCalStart, setLightCalTravel, lightCalCamera } from './calib.js';   // LIGHT-4: the hand setup
import { modeNameOf, groupNameOf } from './modenames.js';   // LIGHT-6: the names in the six added languages
import { fsToggle, fsOn, fsOnChange, fsCanToggle } from './fullscreen.js';   // LIGHT-8: the corner toggle
import { svgIcon } from '../../core/icons.js';
export const scaleName=s=>modeNameOf(s.id) || L(s.name);

export const CTL_IDLE_MS=700, A4_MIN=380, A4_MAX=480, A4_CHIPS=Object.freeze([432,440,442]), FNS=Object.freeze(['fx','note','hold','therm']), OCT_MIN=-3, OCT_MAX=3;
const PREFS=nsKey('handsong.lightPrefs');
const $=id=>document.getElementById(id), el=(tag, cls, text)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; };
let seenHands=-Infinity, sheet=null, sens={ fx:0, travel:0 };
export const keyName=i=>NOTE_NAMES[((i%12)+12)%12].replace('#','♯');

/* ── the choices, kept on this device ── */
function prefsSave(){ try{ localStorage.setItem(PREFS, JSON.stringify({ scale:scaleId, tonic, a4:aRef, timbre:timbreIdOf('ld',leadIdx), hand:{ ...handFn.ld }, field:rectPref,
  oct:{ L:lightOctShift('L'), R:lightOctShift('R') }, sens })); }catch(e){} }
function prefsLoad(){ try{ const s=localStorage.getItem(PREFS); return s ? JSON.parse(s) : null; }catch(e){ return null; } }
const prof=()=>profileOf(PROFILE);
/* ── the changes (each silences the live notes first) ── */
const quiet=()=>{ lightAllOff(); lightHandsReset(); };
export function setScale(id){ if(!prof().moods.includes(id) || !scaleById(id)) return false; if(id!==scaleId){ quiet(); setScaleId(id); } return true; }
export function setKey(i){ i=((i|0)%12+12)%12; if(i!==tonic){ quiet(); setTonic(i); setTonicCents(0); } return true; }
export function setA4(hz){ const v=Math.max(A4_MIN, Math.min(A4_MAX, Math.round(+hz||440))); setARef(v); return v; }
export function setTimbre(id){ if(!prof().timbres.includes(id)) return false; const i=timbreIdx('ld',id); if(i==null) return false; if(i!==leadIdx){ quiet(); setLeadInstr(i); } return true; }
export function setHand(hand, fn){ if((hand!=='L' && hand!=='R') || !FNS.includes(fn)) return false; if(handFn.ld[hand]!==fn){ quiet(); setHandFn('ld',hand,fn); } return true; }
export function setField(v){ const m= v==='rows' ? 'rows' : 'rect'; if(rectPref!==m){ quiet(); setRectPref(m); } return true; }
export function setOct(hand, n){ quiet(); setLightOctShift(hand, Math.max(OCT_MIN, Math.min(OCT_MAX, n))); return lightOctShift(hand); }
export function setSens(kind, v){ v=Math.max(-1, Math.min(1, +v||0)); sens={ ...sens, [kind]:v }; if(kind==='fx') setLightFxSens(Math.pow(2, v)); else { setLightTravel(Math.pow(2, v)); setLightCalTravel(v); } return v; }   // the travel: the plain law and the calibrated one
const after=f=>(...a)=>{ const r=f(...a); prefsSave(); render(); if(sheet) openSheet(sheet); return r; };

/* the lowest note of a hand's four octaves («A2») and its range («A2 – A5») */
function noteOf(oct){ const s=CUR(), f=leadFreqTi(tuningIndexOf(0, s, false), oct, s); if(!(f>0)) return '—';
  const m=Math.round(69+12*Math.log2(f/aRef)); return keyName(m)+(Math.floor(m/12)-1); }
export const octRange=hand=>{ const sh=lightOctShift(hand); return noteOf(sh)+' – '+noteOf(sh+3); };

function render(){
  $('lightKeyName').textContent=keyName(tonic); $('lightKeyHz').textContent=String(aRef);
  const s=scaleById(scaleId); $('lightScaleName').textContent= s ? scaleName(s) : scaleId;
  const tm=timbresOf('ld').find(x=>x.idx===leadIdx); $('lightTimbreName').textContent= tm ? L(tm.name) : '';
  fsRender();
}
/* LIGHT-8: the full-screen toggle shows its state in its words and aria-pressed — LIGHT-9c (the founder): ONE icon both ways (the inward
   corners read as a swastika); not shown where full screen cannot be had (iPhone Safari) or is given (home-screen app) */
function fsRender(){
  const b=$('lightFsBtn'), full=fsOn(), name='fs-enter', tt=t(full ? 'light.fs.exit' : 'light.fs.enter'); b.hidden=!fsCanToggle();
  if(b.dataset.svg!==name || !b.firstChild){ const g=svgIcon(document, name); if(g){ b.dataset.svg=name; b.replaceChildren(g); } }
  b.title=tt; b.setAttribute('aria-label', tt); b.setAttribute('aria-pressed', full ? 'true' : 'false');
}
/* ── the sheets ── */
function closeSheet(){ sheet=null; $('lightSheet').hidden=true; $('lightSheetVeil').hidden=true; }
function seg(items, on, pick){ const g=el('div','light-seg'); for(const [v,label] of items){ const b=el('button', v===on ? 'on' : '', label); b.onclick=()=>pick(v); g.appendChild(b); } return g; }
function openSheet(kind){
  sheet=kind; const B=$('lightSheetBody'); B.replaceChildren();
  const title={ key:'light.key', scale:'light.scale', timbre:'light.timbre', hands:'light.hands', sens:'light.sens' }[kind]; $('lightSheetTitle').textContent=t(title);
  if(kind==='key'){
    const g=el('div','light-keys'); for(let i=0;i<12;i++){ const b=el('button', i===tonic ? 'on' : '', keyName(i)); b.onclick=()=>after(setKey)(i); g.appendChild(b); } B.appendChild(g);
    B.appendChild(el('p','light-lbl', t('light.a4')));
    const r=el('div','light-a4'); for(const hz of A4_CHIPS){ const b=el('button', hz===aRef ? 'on' : '', String(hz)); b.onclick=()=>after(setA4)(hz); r.appendChild(b); }
    const num=el('span','light-a4-num'), minus=el('button','light-a4-step','−'), plus=el('button','light-a4-step','+');
    minus.onclick=()=>after(setA4)(aRef-1); plus.onclick=()=>after(setA4)(aRef+1); num.append(minus, el('b', null, aRef+' Hz'), plus); r.appendChild(num); B.appendChild(r);
    B.appendChild(el('p','light-note', t('light.a4.note')));
  }else if(kind==='scale'){
    const groups=new Map(); for(const id of prof().moods){ const s=scaleById(id); if(!s) continue; const k=s.grpKey||''; if(!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    const order=[...Object.keys(GRP), ''].filter(k=>groups.has(k));
    for(const k of order){ if(k) B.appendChild(el('p','light-lbl', groupNameOf(k) || L(GRP[k])));
      for(const s of groups.get(k)){ const b=el('button', 'light-item'+(s.id===scaleId ? ' on' : ''), scaleName(s)); b.onclick=()=>after(setScale)(s.id); B.appendChild(b); } }
  }else if(kind==='timbre'){
    for(const id of prof().timbres){ const tm=timbresOf('ld').find(x=>x.id===id); const b=el('button', 'light-item'+(timbreIdOf('ld',leadIdx)===id ? ' on' : ''), tm ? L(tm.name) : id); b.onclick=()=>after(setTimbre)(id); B.appendChild(b); }
  }else if(kind==='hands'){
    const cols=el('div','light-hands');
    for(const hand of ['L','R']){ const c=el('div','light-hcol'); c.appendChild(el('h4', null, t(hand==='L' ? 'light.left' : 'light.right')));
      for(const fn of FNS){ const b=el('button', 'light-item'+(handFn.ld[hand]===fn ? ' on' : ''), t('light.fn.'+fn)); b.onclick=()=>after(setHand)(hand, fn); c.appendChild(b); }
      const plays=handFn.ld[hand]!=='fx', o=el('div','light-oct'+(plays ? '' : ' off')), dn=el('button','light-oct-a'), up=el('button','light-oct-a');
      dn.setAttribute('data-svg','chev-down'); up.setAttribute('data-svg','chev-up'); dn.disabled=!plays || lightOctShift(hand)<=OCT_MIN; up.disabled=!plays || lightOctShift(hand)>=OCT_MAX;
      dn.onclick=()=>after(setOct)(hand, lightOctShift(hand)-1); up.onclick=()=>after(setOct)(hand, lightOctShift(hand)+1);
      o.append(dn, el('b', null, plays ? octRange(hand) : '—'), up); c.appendChild(o); cols.appendChild(c); }
    B.appendChild(cols);
    B.appendChild(el('p','light-lbl', t('light.field')));
    B.appendChild(seg([['rect', t('light.field.rect')], ['rows', t('light.field.rows')]], rectPref==='rows' ? 'rows' : 'rect', v=>after(setField)(v)));
    B.appendChild(el('p','light-note', t('light.oct.note')));
    fillIcons(B);
  }else if(kind==='sens'){
    { const row=el('div','light-calrow'), on=lightCalOn(), b=el('button','light-calgo', t(on ? 'light.cal.again' : 'light.cal.set'));   // LIGHT-4: the hand setup's line
      row.append(el('span', on ? 'light-cal-ok' : 'light-cal-none', t(on ? 'light.cal.ok' : 'light.cal.none')), b); b.onclick=()=>{ closeSheet(); lightCalStart(); }; B.appendChild(row); }
    for(const [k, label, lo, hi] of [['travel','light.travel','light.short','light.long'], ['fx','light.fxsens','light.softer','light.stronger']]){
      const w=el('div','light-sl'); w.appendChild(el('p','light-lbl', t(label)));
      const r=el('input'); r.type='range'; r.min='-1'; r.max='1'; r.step='0.01'; r.value=String(sens[k]); r.oninput=()=>{ setSens(k, r.value); prefsSave(); };
      const ends=el('div','light-sl-ends'); ends.append(el('span', null, t(lo)), el('span', null, t(hi))); w.append(r, ends); B.appendChild(w); }
  }
  $('lightSheet').hidden=false; $('lightSheetVeil').hidden=false;
}
let iconFill=null;
const fillIcons=root=>{ if(iconFill) iconFill(root); };
/* the camera: one tap flips front ↔ back; a device with one camera says so (the tip fades) */
async function flipCamera(){
  const was=camFacing;
  try{ await switchCamera(was==='user' ? 'environment' : 'user'); }catch(e){ tip(t('light.camOne')); try{ await switchCamera(was); }catch(e2){} }
  lightCalCamera();   // LIGHT-4: each camera keeps its own hand setup
}
let tipT=0; function tip(s){ const p=$('lightCtlTip'); p.textContent=s; p.hidden=false; clearTimeout(tipT); tipT=setTimeout(()=>{ p.hidden=true; }, 3500); }

function frame(now, hands){
  if(hands.length) seenHands=now;
  const show=lightStarted() && (!!sheet || now-seenHands>=CTL_IDLE_MS);
  const C=$('lightCtl'); if(C.classList.contains('on')!==show){ C.classList.toggle('on', show); C.setAttribute('aria-hidden', show ? 'false' : 'true'); if(show) fsRender(); }   // LIGHT-9b: the toggle read afresh each time the controls show
}
/* the person's kept choices, after the profile is applied */
function restore(){
  const p=prefsLoad(); if(p){
    if(p.scale) setScale(p.scale); if(p.tonic!=null) setKey(p.tonic); if(p.a4) setA4(p.a4); if(p.timbre) setTimbre(p.timbre);
    if(p.hand){ setHand('L', p.hand.L); setHand('R', p.hand.R); } if(p.field) setField(p.field);
    if(p.oct){ setLightOctShift('L', p.oct.L|0); setLightOctShift('R', p.oct.R|0); }
    if(p.sens){ setSens('fx', p.sens.fx); setSens('travel', p.sens.travel); } }
  render();
}
export function lightControlsWire(fill){
  iconFill=fill;
  $('lightKeyBtn').onclick=()=>openSheet('key'); $('lightScaleBtn').onclick=()=>openSheet('scale');
  $('lightTimbreBtn').onclick=()=>openSheet('timbre'); $('lightHandsBtn').onclick=()=>openSheet('hands'); $('lightSensBtn').onclick=()=>openSheet('sens');
  $('lightCamBtn').onclick=()=>{ flipCamera(); };
  $('lightFsBtn').onclick=()=>{ fsToggle().then(fsRender); }; fsOnChange(()=>{ fsRender(); setTimeout(fsRender, 300); }); fsRender();   // the browser settles its display mode a moment after the change
  $('lightSheetClose').onclick=closeSheet; $('lightSheetVeil').onclick=closeSheet;
  addEventListener('keydown', e=>{ if(e.key==='Escape' && sheet) closeSheet(); });
  onLightFrame(frame); onLightStart(restore); onLangChange(()=>{ render(); if(sheet) openSheet(sheet); });   // LIGHT-9: the language by hand
}
/* probe only */
export const lightControlsDbg=()=>({ shown:$('lightCtl').classList.contains('on'), sheet, key:$('lightKeyName').textContent, hz:$('lightKeyHz').textContent, scale:$('lightScaleName').textContent,
  timbre:$('lightTimbreName').textContent, sens:{ ...sens }, fs:{ hidden:$('lightFsBtn').hidden, icon:$('lightFsBtn').dataset.svg, label:$('lightFsBtn').getAttribute('aria-label') } });
export const lightSheetOpen=()=>!!sheet;   // LIGHT-9: the hand-setup offer waits while a sheet is open
export const lightControlsOpenDbg=k=>{ if(k) openSheet(k); else closeSheet(); return sheet; };
