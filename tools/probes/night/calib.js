/* NIGHT-2 stage 2: row «NIGHT calibration screens» (quick; the probe clock through the REAL processHands, an injected store and camera: no real
   key is touched). (1) the two sliders: the middle is 1, «Hand travel» right = a longer travel (0.7), left 2, «Effects sensitivity» 0.5 … 2, round
   trips; (2) settings before calibrating: «Hand travel» off with its link, the effects slider writes the global value; (3) the offer once per camera
   (CONTROL: another camera is offered again); (4) a step held with the LEFT label in most frames: the result card, the roles swapped to the left,
   «Play» saves the record and the side; (5) «Again» from a right-hand result puts the left back; Cancel keeps the record; (6) a failure words its
   reason; every reason has words in both languages (CONTROL: a made-up code has none); (7) the saved side comes back on the face; reset clears the
   record, the side and the roles; (8) gone at NIGHT-7b with the ghost light (the first cards replace it);
   (9) the hand's points: the segment switches fingertips ↔ all points; (10, stage 3) a far but steady hand is accepted (CORE-6 farHold) with the
   note when it is far or shaky (CONTROLS: a near quiet hand has no note; without farHold the far hand is refused as before); too small asks to
   come closer; a far shaking hand is worded as shaking; (11) the picture is drawn by the loop (afterDraw) on every frame, a closed picture keeps
   the last frame (CONTROL: without the keep it blanks). Everything put back as it was. */
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
  const PR=await import('../../../core/profile.js'), C=await import('../../../apps/night/calib.js');
  const was=PR.profileCurrent(), keep=calKeep(), busK=BUS.get('hands'), D=shellDoors(), KEYS=[C.CAL_KEY.side, C.CAL_KEY.offered, 'handsong.nightJoints'], kept={};
  for(const k of KEYS){ try{ kept[k]=localStorage.getItem(k); localStorage.removeItem(k); }catch(e){} }
  let hand0=null, tips0=null, cam=CAM;
  const clk={ t:1000, W:1000, H:600 };
  const step=(hands, label)=>{ clk.t+=33; const f={ landmarks:hands, handednesses:hands.map(()=>[{ categoryName:label }]) }; BUS.set('hands', f); processHandsProbe(f); };
  const holdWith=labelAt=>{ for(let i=0;i<200 && calBusy();i++) step([real(OPENH)], labelAt(i)); };
  /* a hold at a palm size, its size alternating ±jit (a deterministic noise); stops at the end of the run, or after `frames` */
  const holdAt=(size, jit=0, frames=420)=>{ const said=new Set(); for(let i=0;i<frames && calBusy();i++){ step([real({ ...OPENH, s:size/0.95*(1+(i%2 ? jit : -jit)) })], 'Right'); said.add(C.calDbg.state().say); } return said; };
  try{
    if(was!=='profile.night') PR.profileApply('profile.night');
    hand0=D.hand(); tips0=!!(ST.nightView && ST.nightView.tips);
    const store=memStore(); handCalOpen({ ...C.CAL_OPEN, store, camera:()=>cam });
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
    /* (9) the hand's points */
    { const seg=v=>$('nightDotsSeg').querySelector(`[data-dots="${v}"]`); seg('all').click(); const a=ST.nightView && ST.nightView.tips; seg('tips').click(); const b=ST.nightView && ST.nightView.tips;
      ok('the points segment: all → tips', a===false && b===true); }
    /* (10) far hands (stage 3, CORE-6 farHold) */
    withLang('en', ()=>{
      D.setHand('right'); ok('the page opens with farHold', C.CAL_OPEN.farHold===true);
      const far=0.10, note=t('night.cal.farNote');
      C.calStep(); holdAt(far); { const s=C.calDbg.state(), r=handCalState().result;
        ok(`a far steady hand (${far}) is accepted (${s.mode}, ${handCalState().phase})`, s.mode==='done' && r && Math.abs(r.near-far)<0.003);
        ok('...with the note', s.note.includes(note)); notes.push(`far hold: near ${r && r.near.toFixed(4)}, noise ${r && r.noise.toFixed(4)}`); C.calAbort(); }
      C.calStep(); holdAt(0.2); ok('CONTROL: a nearer quiet hand has no note', C.calDbg.state().mode==='done' && !C.calDbg.state().note.includes(note)); C.calAbort();
      C.calStep(); holdAt(0.2, 0.01); { const r=handCalState().result; ok(`a noisy hold gets the note (noise ${r && r.noise.toFixed(4)})`, C.calDbg.state().mode==='done' && C.calDbg.state().note.includes(note)); } C.calAbort();
      C.calStep(); { const said=holdAt(0.05); ok('too small asks to come closer', said.has(t('night.cal.closer')));
        ok(`...and fails as too far (${C.calDbg.state().mode} ${C.calDbg.state().reason})`, C.calDbg.state().mode==='fail' && C.calDbg.state().text===t('night.cal.r.too-far')); } C.calAbort();
      C.calStep(); { const said=holdAt(far, 0.04); ok('a far shaking hand: the shaking line', said.has(t('night.cal.stillFar')) && !said.has(t('night.cal.still')));
        ok(`...and the shaking failure (${C.calDbg.state().reason})`, C.calDbg.state().mode==='fail' && C.calDbg.state().text===t('night.cal.shakyFail')); } C.calAbort();
      handCalOpen({ scope:'night', store, camera:()=>cam });   // CONTROL: CORE-1's limit without farHold
      C.calStep(); holdAt(far); ok(`CONTROL: without farHold the far hand is refused (${C.calDbg.state().reason})`, C.calDbg.state().mode==='fail' && C.calDbg.state().reason==='too-far'); C.calAbort();
      handCalOpen({ ...C.CAL_OPEN, store, camera:()=>cam });
    });
    /* (11) the picture: drawn by the loop on every frame; a closed snapshot keeps the last frame */
    { const frames=k=>new Promise(r=>{ const f=()=>{ if(--k<=0) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
      C.calStep(); const p0=C.calDbg.pic(); await frames(12); const p1=C.calDbg.pic();
      ok(`the loop draws the picture each frame (${p1.drawn-p0.drawn} drawn, ${p1.kept-p0.kept} kept in 12 frames)`, p1.drawn-p0.drawn>=8 && p1.kept===p0.kept);
      const oc=new OffscreenCanvas(64,48), og=oc.getContext('2d'); og.fillStyle='#fff'; og.fillRect(0,0,64,48); const bmp=await createImageBitmap(oc);
      const px=()=>{ const v=$('nightCalPic').getContext('2d').getImageData(2,2,1,1).data; return v[0]+v[1]+v[2]; };
      BUS.set('picture', bmp); C.calTick(); const lit=px(); bmp.close(); const k0=C.calDbg.pic().kept; C.calTick(); const kept=px();
      ok(`a closed picture keeps the last frame (${lit} → ${kept})`, lit>600 && kept===lit && C.calDbg.pic().kept===k0+1);
      C.calDbg.keep(false); C.calTick(); const blank=px(); C.calDbg.keep(true);
      ok(`CONTROL: without the keep it blanks (${blank})`, blank<150);
      C.calAbort(); }
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
