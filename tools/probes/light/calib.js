/* LIGHT-4 row «LIGHT hand setup»: (1) offered once — with no setup kept and never offered, the offer shows; a second call does not; (2) the routine
   on a synthetic hand held still at its nearest point (3 s at 30 fps, the probe's own clock — the app's frames are set aside) ends «done», keeps
   the near size per camera (≈ the hand's size) and turns the calibrated law on; (3) the law: the playing hand at that size drives the reverb's mix to
   ≈ 0, a hand at half the size to a clearly larger value; (4) the travel slider acts on the calibrated law (long travel → less mix at the same
   distance). CONTROL: a hand that keeps moving never ends «done» in the same time. The person's own kept setup is put back at the end. */
import { pose } from '../../../core/gestures/pose.js';
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { leadAllOff } from '../../../core/audio.js';
import { fxParamsOf } from '../../../core/gestures/fxhand.js';
import { nsKey } from '../../../core/storens.js';
import { lightCalStart, lightCalCancel, lightCalOffer, lightCalOn, lightCalDbg, lightCalForgetDbg, lightCalProbeSet, lightCalFrameProbe, setLightCalTravel, lightCalWire } from '../../../apps/light/calib.js';
import { lightHandsProbe, lightProcessHandsProbe } from '../../../apps/light/gestures.js';

const KEYS=[nsKey('handsong.lightHand'), nsKey('handsong.lightHandOffered')], FPS=30, W=1000, H=600;
/* core's pose marks its hands synthetic (the setup routine refuses them, so probes never spoil a person's setup): this row feeds a plain copy of the
   points on purpose — it drives the routine itself, with its own clock, and puts the kept setup back */
const res=p=>({ landmarks:[[...pose(p)]], handednesses:[[{ categoryName:'Right' }]] });
export async function checkLightCalib(){
  const diffs=[], miss=s=>diffs.push(s), notes=[], keep=KEYS.map(k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } });
  const vr=ST.viewRect, hand={ ...ST.handFn.ld };
  ST.setViewRect({ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN }); ST.setHandFn('ld','R','note'); ST.setHandFn('ld','L','fx');
  lightCalProbeSet(true);
  try{
    lightCalForgetDbg();
    if(!lightCalOffer()) miss('with no setup kept, the offer did not show'); if(lightCalOffer()) miss('the offer showed a second time'); lightCalCancel();
    /* CONTROL first: a moving hand (its wrist swings) */
    let t=1000; lightCalStart(t);
    for(let i=0;i<3*FPS;i++){ t+=1000/FPS; lightCalFrameProbe(res({ x:0.5+0.12*Math.sin(i*0.7), y:0.5, s:0.3, gaps:[1,1,1,1] }), t); }
    if(lightCalOn()) miss('CONTROL: a moving hand was taken as set up'); lightCalCancel();
    /* the hand held still */
    t+=1000; lightCalStart(t);
    for(let i=0;i<3*FPS && !lightCalOn();i++){ t+=1000/FPS; lightCalFrameProbe(res({ x:0.5, y:0.5, s:0.3, gaps:[1,1,1,1] }), t); }
    const D=lightCalDbg(); if(!D.on || !D.cam) miss('the still hand did not end «done»: '+JSON.stringify(D)); else notes.push(`near ${D.cam.near}, noise ${D.cam.noise}`);
    if(D.kind!=='done') miss('the done card is not shown ('+D.kind+')'); lightCalCancel();
    /* the law, through Light's hands (the playing hand drives the reverb's mix on its depth) */
    const key=ST.chainKeyOf('ld'), mix=()=>{ const p=fxParamsOf(key,'reverb')[2]; return p ? p.get() : NaN; }, m0=mix();
    const at=(s,trav)=>{ setLightCalTravel(trav); const clk={ t:5000, W, H }; lightHandsProbe(clk); try{ for(let i=0;i<40;i++){ clk.t+=1000/FPS; lightProcessHandsProbe(res({ x:0.6, y:0.5, s, gaps:[1,1,1,1] })); } return mix(); } finally { lightHandsProbe(null); leadAllOff(); } };
    const near=at(0.3,0), far=at(0.15,0), farLong=at(0.15,1); setLightCalTravel(0);
    notes.push(`mix near ${near.toFixed(3)}, at half size ${far.toFixed(3)}, long travel ${farLong.toFixed(3)}`);
    if(!(near<=0.05)) miss('at the near point the mix is '+near.toFixed(3)+', not ≈ 0');
    if(!(far>=near+0.3)) miss('at half the size the mix grew only to '+far.toFixed(3));
    if(!(farLong<far)) miss('the long travel did not lessen the mix at the same distance');
    { const p=fxParamsOf(key,'reverb')[2]; if(p) p.set(m0); }
  } finally {
    lightCalProbeSet(false); lightCalCancel();
    KEYS.forEach((k,i)=>{ try{ if(keep[i]==null) localStorage.removeItem(k); else localStorage.setItem(k, keep[i]); }catch(e){} });
    lightCalWire(()=>{});   // the kept setup read again and applied
    ST.setViewRect(vr); ST.setHandFn('ld','R',hand.R); ST.setHandFn('ld','L',hand.L);
  }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
