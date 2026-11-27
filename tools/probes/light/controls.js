/* LIGHT-3b row «LIGHT controls and menus»: with no hand in view the controls show (variant B) and read the live state (the key and A4, the scale,
   the sound); each sheet holds what it must (12 keys and the A4 choices; the profile's 31 moods; its timbres; both hands' four functions, their
   octaves and the field; two sliders); each change reaches the state and the labels — the key, A4 (clamped 380…480), the scale (only the profile's:
   CONTROL a maqam is refused), a hand's function, the field, a hand's octave shift (its range moves by one octave), the sensitivities. Everything is
   put back at the end (the kept choices on this device are not written by this row). */
import { scaleId, tonic, aRef, handFn, rectPref } from '../../../core/state.js';
import { profileOf } from '../../../core/profile.js';
import { CTL_IDLE_MS, setKey, setA4, setScale, setHand, setField, setOct, setSens, octRange, keyName, lightControlsDbg, lightControlsOpenDbg } from '../../../apps/light/controls.js';
import { lightOctShift } from '../../../apps/light/gestures.js';

export async function checkLightControls(){
  const diffs=[], miss=s=>diffs.push(s), p=profileOf('profile.light');
  const keep={ scaleId, tonic, aRef, hand:{ ...handFn.ld }, field:rectPref, oct:{ L:lightOctShift('L'), R:lightOctShift('R') } };
  try{
    await new Promise(r=>setTimeout(r, CTL_IDLE_MS+400));
    let D=lightControlsDbg(); if(!D.shown) miss('the controls do not show with no hand in view');
    if(D.key!==keyName(tonic) || D.hz!==String(aRef)) miss(`the key reads ${D.key} ${D.hz}, the state ${keyName(tonic)} ${aRef}`);
    if(!D.scale || !D.timbre) miss('the scale or sound label is empty');
    const B=()=>document.getElementById('lightSheetBody');
    lightControlsOpenDbg('key'); if(B().querySelectorAll('.light-keys button').length!==12) miss('the key sheet does not hold 12 keys');
    lightControlsOpenDbg('scale'); if(B().querySelectorAll('.light-item').length!==p.moods.length) miss(`the scale sheet holds ${B().querySelectorAll('.light-item').length} moods, not ${p.moods.length}`);
    lightControlsOpenDbg('timbre'); if(B().querySelectorAll('.light-item').length!==p.timbres.length) miss('the sound sheet does not list the profile\'s timbres');
    lightControlsOpenDbg('hands'); if(B().querySelectorAll('.light-hcol .light-item').length!==8 || B().querySelectorAll('.light-seg button').length!==2) miss('the hands sheet: not 2×4 functions and the field\'s 2 choices');
    lightControlsOpenDbg('sens'); if(B().querySelectorAll('input[type=range]').length!==2) miss('the sensitivity sheet does not hold 2 sliders');
    lightControlsOpenDbg(null); if(document.getElementById('lightSheet').hidden!==true) miss('the sheet did not close');
    setKey(2); if(tonic!==2) miss('the key did not change');
    if(setA4(1000)!==480 || aRef!==480) miss('A4 is not clamped to 480'); setA4(442); if(aRef!==442) miss('A4 did not change');
    if(!setScale('dorian') || scaleId!=='dorian') miss('the scale did not change'); if(setScale('maqam-rast')!==false || scaleId!=='dorian') miss('CONTROL: a scale the profile does not offer was taken');
    setHand('L','note'); if(handFn.ld.L!=='note') miss('the left hand\'s function did not change');
    setField('rows'); if(rectPref!=='rows') miss('the field did not change');
    const r0=octRange('R'); setOct('R', 1); const r1=octRange('R'); if(lightOctShift('R')!==1) miss('the octave shift did not change');
    if(r0===r1 || r0.split(' – ')[0].replace(/\d/g,'')!==r1.split(' – ')[0].replace(/\d/g,'') || +r1.split(' – ')[0].replace(/\D/g,'')!==+r0.split(' – ')[0].replace(/\D/g,'')+1) miss(`the range did not move one octave: ${r0} → ${r1}`);
    if(setSens('fx', 2)!==1 || setSens('travel', -3)!==-1) miss('the sliders are not clamped to −1…1');
  } finally {
    setSens('fx', 0); setSens('travel', 0); setOct('L', keep.oct.L); setOct('R', keep.oct.R); setField(keep.field); setHand('L', keep.hand.L); setHand('R', keep.hand.R);
    setScale(keep.scaleId); setKey(keep.tonic); setA4(keep.aRef); lightControlsOpenDbg(null);
  }
  return { pass:!diffs.length, diffs };
}
