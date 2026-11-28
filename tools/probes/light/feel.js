/* LIGHT-13 row «LIGHT rings, pinch distances, reverb reach»: (1) the pinch distances: a right hand whose ring finger stands 0.26 and little finger
   0.28 from the thumb (in Full's palm units) sounds both — CONTROL with core's distances (setLightCoreLaws) neither sounds; (2) the rings: a ring
   and an outer ring at EVERY sounding finger — three fingers draw six rings, one finger two (CONTROL: an effects-hand pinch draws none); (3) the
   reverb reach is 0.65 of the travel and the profile's tail is 0.85 (≈ 2.7 s) and its tone 0.79. Everything is put back. */
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { leadAllOff } from '../../../core/audio.js';
import { ctx } from '../../../core/vision.js';
import { pose } from '../../../core/gestures/pose.js';
import { profileOf } from '../../../core/profile.js';
import { lightHandsProbe, lightProcessHandsProbe, lightHandsView, lightHandsReset, setLightCoreLaws, DEPTH_REACH, LIGHT_PINCH } from '../../../apps/light/gestures.js';
import { setHand } from '../../../apps/light/controls.js';
import { lightDrawFrame } from '../../../apps/light/draw.js';

const W=1000, H=600, FPS=30;
export async function checkLightFeel(){
  const diffs=[], miss=s=>diffs.push(s), notes=[], keep={ hand:{ ...ST.handFn.ld }, vr:ST.viewRect };
  const run=gaps=>{ const clk={ t:20000, W, H }; lightHandsReset(); lightHandsProbe(clk); let v=[];
    try{ for(let i=0;i<12;i++){ clk.t+=1000/FPS; lightProcessHandsProbe({ landmarks:[pose({ x:0.6, y:0.5, s:0.2, gaps })], handednesses:[[{ categoryName:'Right' }]] }); } v=lightHandsView(); }
    finally { lightHandsProbe(null); leadAllOff(); } return v; };
  const sounding=v=>{ const h=v.find(x=>x.key==='Right'); return h && h.pinch ? Object.keys(h.fing||{}).map(Number).sort() : []; };
  const ringsOf=v=>{ let n=0; const arc=ctx.arc; ctx.arc=function(x,y,r,...a){ if(r>=16) n++; return arc.call(this,x,y,r,...a); };
    try{ lightDrawFrame(null, v, x=>x*W, y=>y*H); } finally { ctx.arc=arc; } return n; };
  try{
    ST.setViewRect({ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN });
    setHand('R','note'); setHand('L','fx');
    /* (1) */
    const wide=sounding(run([1,1,0.26,0.28])); setLightCoreLaws(true); const core=sounding(run([1,1,0.26,0.28])); setLightCoreLaws(false);
    notes.push(`ring 0.26 + little 0.28: Light sounds [${wide}], core's distances [${core}] (Light's: on ${LIGHT_PINCH.on.join('/')})`);
    if(JSON.stringify(wide)!=='[2,3]') miss(`Light's distances: the ring and little fingers sound [${wide}], not [2,3]`);
    if(core.length) miss(`CONTROL: core's distances still sound [${core}]`);
    /* (2) */
    const three=run([0,0.05,0.05,1]), one=run([0,1,1,1]), r3=ringsOf(three), r1=ringsOf(one);
    notes.push(`rings: three fingers ${r3}, one finger ${r1}`);
    if(sounding(three).length!==3 || r3!==6) miss(`three sounding fingers drew ${r3} rings (sounding [${sounding(three)}]), not 6`);
    if(r1!==2) miss(`one sounding finger drew ${r1} rings, not 2`);
    setHand('R','fx'); const fxv=run([0,1,1,1]), rf=ringsOf(fxv); setHand('R','note');
    if(rf!==0) miss(`CONTROL: an effects-hand pinch drew ${rf} rings`); else notes.push('CONTROL: the effects hand draws none');
    /* (3) */
    const rv=(profileOf('profile.light').chain||[]).find(e=>e.fxId==='reverb'), pa=rv ? rv.params : [];
    if(DEPTH_REACH!==0.65 || !pa[0] || pa[0].v01!==0.85 || !pa[1] || pa[1].v01!==0.79) miss(`the reverb: reach ${DEPTH_REACH}, tail ${pa[0]&&pa[0].v01}, tone ${pa[1]&&pa[1].v01}`);
  } finally { lightHandsReset(); setLightCoreLaws(false); setHand('L', keep.hand.L); setHand('R', keep.hand.R); ST.setViewRect(keep.vr); }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
