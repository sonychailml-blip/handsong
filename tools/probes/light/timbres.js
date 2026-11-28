/* LIGHT-11 row «LIGHT timbres»: (1) fourteen timbres to pick, Light's six own records installed for the session (pack ids «light/…», none
   refused by core's bounds); (2) every timbre and group named in the eight languages; (3) the sound sheet: one grouped list of 14 when one hand
   plays, two columns of 14 when both do; (4) a timbre per hand — with both hands playing, the left hand's notes carry the left timbre and the right
   hand's the right one (CONTROL: without the per-hand door both carry the live solo timbre); (5) a bass takes the hand an octave lower and leaving
   it gives the octave back; a hand whose octave the person moved keeps it. Everything is put back at the end. */
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { timbreIdx, leadAllOff } from '../../../core/audio.js';
import { lang, setLang } from '../../../core/i18n.js';
import { pose } from '../../../core/gestures/pose.js';
import { LIGHT_RECORDS, LIGHT_GROUPS, lightTimbresInstall, lightTimbresAvailable, timbreName, timbreGroupName } from '../../../apps/light/timbres.js';
import { setTimbre, lightTimbreOf, setHand, lightControlsOpenDbg } from '../../../apps/light/controls.js';
import { lightHandsProbe, lightProcessHandsProbe, lightOctShift, setLightOctShift, setLightInstOf } from '../../../apps/light/gestures.js';
import { lightNoteTapSet } from '../../../apps/light/engine.js';

const LANGS=['en','ru','es','pt','de','fr','it','ka'], W=1000, H=600, FPS=30;
export async function checkLightTimbres(){
  const diffs=[], miss=s=>diffs.push(s), notes=[], keep={ L:lightTimbreOf('L'), R:lightTimbreOf('R'), oL:lightOctShift('L'), oR:lightOctShift('R'), hand:{ ...ST.handFn.ld }, lang, vr:ST.viewRect };
  try{
    /* (1) */
    const refused=lightTimbresInstall(), av=lightTimbresAvailable();
    if(refused.length) miss('refused: '+refused.join('; '));
    if(av.length!==14) miss(`${av.length} timbres to pick, not 14`);
    for(const r of LIGHT_RECORDS){ if(!/^light\//.test(r.id)) miss(r.id+': not a «light/» pack id'); if(timbreIdx('ld', r.id)==null) miss(r.id+': not installed'); }
    /* (2) */
    for(const L of LANGS){ setLang(L);
      const un=av.filter(x=>timbreName(x.id)===x.id).map(x=>x.id), ug=LIGHT_GROUPS.filter(g=>timbreGroupName(g)===g); if(un.length || ug.length) miss(`${L}: unnamed ${[...un, ...ug].join(', ')}`); }
    setLang(keep.lang);
    /* (3) */
    const B=()=>document.getElementById('lightSheetBody');
    setHand('L','fx'); setHand('R','note'); lightControlsOpenDbg('timbre');
    if(B().querySelectorAll('.light-item').length!==14 || B().querySelectorAll('.light-hcol').length) miss('one hand playing: not one list of 14');
    setHand('L','note'); lightControlsOpenDbg('timbre');
    if(B().querySelectorAll('.light-hcol').length!==2 || B().querySelectorAll('.light-hcol .light-item').length!==28) miss('both hands playing: not two columns of 14');
    lightControlsOpenDbg(null);
    /* (4) both hands pinch the index finger; the tap sees each note's timbre position */
    setTimbre('light/brass','L'); setTimbre('solo.organ','R');
    ST.setViewRect({ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN });
    const play=()=>{ const seen={}; lightNoteTapSet((k,a)=>{ if(k==='leadOn') seen[a[0].split(':')[1]]=a[1].inst; }); const clk={ t:9000, W, H }; lightHandsProbe(clk);
      try{ for(let i=0;i<20;i++){ clk.t+=1000/FPS; lightProcessHandsProbe({ landmarks:[pose({ x:0.3, y:0.5, s:0.2, gaps:[0,1,1,1] }), pose({ x:0.7, y:0.5, s:0.2, gaps:[0,1,1,1] })], handednesses:[[{ categoryName:'Left' }],[{ categoryName:'Right' }]] }); } }
      finally { lightHandsProbe(null); lightNoteTapSet(null); leadAllOff(); } return seen; };
    const a=play(), iL=timbreIdx('ld','light/brass'), iR=timbreIdx('ld','solo.organ');
    notes.push(`per hand: left ${a.L} (brass ${iL}), right ${a.R} (organ ${iR})`);
    if(a.L!==iL || a.R!==iR) miss(`the hands' notes carry ${a.L} / ${a.R}, not brass ${iL} / organ ${iR}`);
    setLightInstOf(null); const c=play(); if(c.L!==c.R) miss('CONTROL: without the per-hand door the hands still differ'); else notes.push('CONTROL: without the door both carry '+c.L);
    setLightInstOf(h=>timbreIdx('ld', lightTimbreOf(h)));
    /* (5) */
    setLightOctShift('R', 0); setTimbre('light/bass-round','R'); if(lightOctShift('R')!==-1) miss('a bass did not take the hand an octave lower ('+lightOctShift('R')+')');
    setTimbre('solo.organ','R'); if(lightOctShift('R')!==0) miss('leaving the bass did not give the octave back');
    setLightOctShift('R', 1); setTimbre('light/bass-synth','R'); if(lightOctShift('R')!==1) miss('a hand the person moved lost its octave to the bass');
  } finally {
    setLang(keep.lang); setHand('L', keep.hand.L); setHand('R', keep.hand.R); setTimbre(keep.L,'L'); setTimbre(keep.R,'R');
    setLightOctShift('L', keep.oL); setLightOctShift('R', keep.oR); ST.setViewRect(keep.vr); lightControlsOpenDbg(null);
  }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
