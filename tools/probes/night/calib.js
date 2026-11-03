/* NIGHT-2 stage 2: row «NIGHT calibration screens» (quick; the probe clock through the REAL processHands, an injected store and camera: no real
   key is touched). (1) the two sliders: the middle is 1, «Hand travel» right = a longer travel (0.7), left 2, «Effects sensitivity» 0.5 … 2, round
   trips; (2) settings before calibrating: «Hand travel» off with its link, the effects slider writes the global value; (3) the offer once per camera
   (CONTROL: another camera is offered again); (4) a step held with the LEFT label in most frames: the result card, the roles swapped to the left,
   «Play» saves the record and the side; (5) «Again» from a right-hand result puts the left back; Cancel keeps the record; (6) a failure words its
   reason; every reason has words in both languages (CONTROL: a made-up code has none); (7) the saved side comes back on the face; reset clears the
   record, the side and the roles; (8) the ghost armed after the calibration waits for the hand to leave (CONTROL: a plain arm ends at a hand);
   (9) the hand's points: the segment switches fingertips ↔ all points. Everything put back as it was. */
import { row } from '../core/rows.js';
import { handCalOpen, handCalRead, handCalSetSens, calStartProbe, calKeep, calBusy, handCalState } from '../../../core/handcal.js';
import { CAL, REASONS, calFarRatio } from '../../../core/pure/handcal.js';
import { BUS } from '../../../core/pure/bus.js';
import { pose } from '../../../core/gestures/pose.js';
import { handsProbe, processHandsProbe } from '../../../core/gestures.js';
import { liveAllOff } from '../../../core/recorder.js';
import { withLang, t } from '../../../core/i18n.js';
import { shellDoors } from '../../../core/legacy-ui/ui.js';
import * as ST from '../../../core/state.js';

const CAM={ label:'probe camera', facing:'user' }, CAM2={ label:'another probe camera', facing:'user' };
const memStore=()=>{ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,v), removeItem:k=>m.delete(k), m }; };
const real=p=>[...pose(p)];   // unmarked, as a camera's hand
const S=0.334/0.95, OPENH={ x:0.75, y:0.6, s:S };
export async function checkNightCalib(){
  const d=[], notes=[]; let n=0; const ok=(what,c)=>{ n++; if(!c) d.push(what); }, $=id=>document.getElementById(id);
  const PR=await import('../../../core/profile.js'), C=await import('../../../apps/night/calib.js'), GH=await import('../../../apps/night/ghost.js');
  const was=PR.profileCurrent(), keep=calKeep(), busK=BUS.get('hands'), D=shellDoors(), KEYS=[C.CAL_KEY.side, C.CAL_KEY.offered, 'handsong.nightJoints'], kept={};
  for(const k of KEYS){ try{ kept[k]=localStorage.getItem(k); localStorage.removeItem(k); }catch(e){} }
  let hand0=null, tips0=null, cam=CAM;
  const clk={ t:1000, W:1000, H:600 };
  const step=(hands, label)=>{ clk.t+=33; const f={ landmarks:hands, handednesses:hands.map(()=>[{ categoryName:label }]) }; BUS.set('hands', f); processHandsProbe(f); };
  const holdWith=labelAt=>{ for(let i=0;i<200 && calBusy();i++) step([real(OPENH)], labelAt(i)); };
  try{
    if(was!=='profile.night') PR.profileApply('profile.night');
    hand0=D.hand(); tips0=!!(ST.nightView && ST.nightView.tips);
    handCalOpen({ scope:'night', store:memStore(), camera:()=>cam });
    handsProbe(clk, ()=>true); C.calDbg.setStart(()=>calStartProbe(clk.t));
    withLang('en', ()=>{
      /* (1) the sliders */
      ok('travel: the middle is 1', C.travelS(0)===1); ok('travel: right end 0.7', Math.abs(C.travelS(1)-CAL.depthMin)<1e-12); ok('travel: left end 2', Math.abs(C.travelS(-1)-CAL.sensMax)<1e-12);
      ok('travel: right = a farther far end', calFarRatio(C.travelS(0.5))<calFarRatio(C.travelS(0)) && calFarRatio(C.travelS(0))<calFarRatio(C.travelS(-0.5)));
      ok('effects: 0.5 · 1 · 2', C.fxV(-1)===CAL.sensMin && C.fxV(0)===1 && C.fxV(1)===CAL.sensMax);
      { let worst=0; for(const p of [-1,-0.63,-0.2,0,0.31,0.77,1]){ worst=Math.max(worst, Math.abs(C.travelPos(C.travelS(p))-p), Math.abs(C.fxPos(C.fxV(p))-p)); } ok('the sliders round-trip (worst '+worst.toExponential(1)+')', worst<1e-9); }
      /* (2) settings before calibrating */
      C.calSettingsRender(); ok('not set up: «Hand travel» off, its link shown', $('nightTravel').disabled && !$('nightTravelNeed').hidden && $('nightCalState').textContent===t('night.cal.none'));
      { const el=$('nightFxSens'); el.value='0.5'; el.dispatchEvent(new Event('input')); ok('the effects slider writes the global value', Math.abs(handCalRead().global.fx-C.fxV(0.5))<1e-9); handCalSetSens(1); }
      /* (3) the offer once per camera */
      { let ended=0; ok('a new camera is offered', C.calOfferIfNew(()=>ended++)===true && C.calDbg.state().mode==='offer' && C.calDbg.state().title===t('night.cal.offerT'));
        $('nightCalNo').click(); ok('skip closes and calls back', ended===1 && !C.calActive() && $('nightCal').hidden);
        ok('...and is not offered again', C.calOfferIfNew(()=>ended++)===false);
        cam=CAM2; ok('CONTROL: another camera is offered once', C.calOfferIfNew(null)===true); $('nightCalNo').click(); cam=CAM; }
      /* (4) the left hand, its label flipping in one frame of five */
      D.setHand('right');
      C.calStep(); ok('the step shows its instruction', C.calDbg.state().mode==='step' && C.calDbg.state().say===t('night.cal.wait'));
      holdWith(i=>i%5===4 ? 'Right' : 'Left');
      { const s=C.calDbg.state(); notes.push(`left hold: ${s.votes.L} left, ${s.votes.R} right of ${s.votes.m}`);
        ok(`result card (${s.mode}, ${handCalState().phase})`, s.mode==='done' && s.card && s.title===t('night.cal.doneT'));
        ok('the side is voted left', s.side==='left' && s.votes.L>s.votes.R && s.votes.m>=8); ok('the left hand plays in review', D.hand()==='left');
        ok('the card says which hand plays', s.note.includes(t('night.cal.doneL'))); }
      $('nightCalYes').click();
      ok('«Play» saves', handCalRead().calibrated && localStorage.getItem(C.CAL_KEY.side)==='left' && !C.calActive());
      C.calSettingsRender(); ok('set up: «Hand travel» on', !$('nightTravel').disabled && $('nightTravelNeed').hidden && $('nightCalGo').textContent===t('night.cal.again'));
      { const el=$('nightTravel'); el.value='1'; el.dispatchEvent(new Event('input')); ok('«Hand travel» right end writes 0.7', Math.abs(handCalRead().global.depth-CAL.depthMin)<1e-12); el.value='0'; el.dispatchEvent(new Event('input')); }
      /* (5) «Again» from a right-hand result, then Cancel */
      { const near=handCalRead().near; C.calStep(); holdWith(()=> 'Right');
        ok('a right-hand result swaps to the right', C.calDbg.state().side==='right' && D.hand()==='right');
        $('nightCalNo').click(); ok('«Again» puts the left back and starts again', D.hand()==='left' && C.calDbg.state().mode==='step');
        $('nightCalCancel').click(); ok('Cancel closes, the record and the side stay', !C.calActive() && Math.abs(handCalRead().near-near)<1e-9 && localStorage.getItem(C.CAL_KEY.side)==='left'); }
      /* (6) a failure and the words of every reason */
      C.calStep(); for(let i=0;i<400 && calBusy();i++) step([], 'Right');
      ok(`no hand: the failure card (${C.calDbg.state().mode} ${C.calDbg.state().reason})`, C.calDbg.state().mode==='fail' && C.calDbg.state().text===t('night.cal.r.no-hand'));
      $('nightCalNo').click(); ok('«Later» closes', !C.calActive());
    });
    for(const lang of ['en','ru']) withLang(lang, ()=>{ const miss=REASONS.filter(r=>r!=='cancelled' && t('night.cal.r.'+r)==='night.cal.r.'+r); ok(lang+': every reason has words'+(miss.length?' — missing '+miss.join(', '):''), !miss.length); });
    ok('CONTROL: a made-up reason has no words', t('night.cal.r.made-up')==='night.cal.r.made-up');
    /* (7) the side on the face, then reset */
    D.setHand('right'); C.calSideApply(); ok('the saved side comes back', D.hand()==='left');
    C.calResetAll(); ok('reset clears the record, the side and the roles', !handCalRead().calibrated && localStorage.getItem(C.CAL_KEY.side)===null && D.hand()==='right');
    /* (8) the ghost after the calibration */
    { const f=h=>({ landmarks:h, handednesses:h.map(()=>[{ categoryName:'Right' }]) }); let tg=5e6;
      GH.ghostArm({ wait:300 }); GH.ghostFrame(f([real(OPENH)]), tg); tg+=100; GH.ghostFrame(f([real(OPENH)]), tg); ok('the waiting ghost stays while the hand is there', GH.ghostOn());
      tg+=100; const r=GH.ghostFrame(f([]), tg); ok('...and plays once it leaves', GH.ghostOn() && r && r.landmarks && r.landmarks.length===1 && r.landmarks[0].synthetic);
      GH.ghostArm({ wait:300 }); for(let k=0;k<5;k++){ tg+=100; GH.ghostFrame(f([real(OPENH)]), tg); } ok('a hand that stays past the wait ends it', !GH.ghostOn());
      GH.ghostArm(); GH.ghostFrame(f([real(OPENH)]), tg+100); ok('CONTROL: a plain arm ends at a hand', !GH.ghostOn()); GH.ghostStop(); }
    /* (9) the hand's points */
    { const seg=v=>$('nightDotsSeg').querySelector(`[data-dots="${v}"]`); seg('all').click(); const a=ST.nightView && ST.nightView.tips; seg('tips').click(); const b=ST.nightView && ST.nightView.tips;
      ok('the points segment: all → tips', a===false && b===true); }
  } catch(e){ d.push('error: '+(e&&e.stack||e)); }
  finally{
    C.calDbg.setStart(null); C.calAbort(); handsProbe(null); liveAllOff(); BUS.set('hands', busK); keep();
    if(hand0 && D.hand()!==hand0) D.setHand(hand0);
    if(tips0!=null && ST.nightView && ST.nightView.tips!==tips0) ST.setNightView({ ...ST.nightView, tips:tips0 });
    for(const k of KEYS){ try{ if(kept[k]==null) localStorage.removeItem(k); else localStorage.setItem(k, kept[k]); }catch(e){} }
    if(was!=='profile.night') PR.profileApply(was||'profile.full');
    C.calSettingsRender();
  }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.97, night:true, name:'NIGHT calibration screens', run:()=>checkNightCalib(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
