/* LIGHT-6b row «LIGHT each hand its own reverb»: with both hands playing notes, (1) the left hand's voices go to the second solo head and the right
   hand's to the live one (the engine's router at each attack); (2) each hand's depth drives ITS chain's reverb mix — the left hand near and the right
   far gives the live mix high and the second chain's low, and swapping the hands swaps them; (3) the effects hand's values reach the second chain
   (the delay's mix mirrored); (4) off (as core): both hands' voices live. CONTROL: off, the left hand's depth moves the live chain again. */
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { routeOfOwner, leadAllOff } from '../../../core/audio.js';
import { pose } from '../../../core/gestures/pose.js';
import { fxParamsOf } from '../../../core/gestures/fxhand.js';
import { lightHandsProbe, lightProcessHandsProbe, lightTrackKey, lightMirrorFx, setLightPerHandReverb } from '../../../apps/light/gestures.js';

const W=1000, H=600, FPS=30;
export async function checkLightPerHand(){
  const diffs=[], miss=s=>diffs.push(s), notes=[], live=ST.chainKeyOf('ld'), T=lightTrackKey();
  const hand={ ...ST.handFn.ld }, vr=ST.viewRect, mix=k=>{ const p=fxParamsOf(k,'reverb')[2]; return p ? p.get() : NaN; }, m0=[mix(live), mix(T)];
  const d0=(fxParamsOf(live,'dly')[0]||{ get:()=>0 }).get();
  ST.setViewRect({ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN }); ST.setHandFn('ld','L','note'); ST.setHandFn('ld','R','note');
  const play=(sL,sR)=>{ const clk={ t:9000, W, H }; lightHandsProbe(clk); try{ for(let i=0;i<40;i++){ clk.t+=1000/FPS;
        const L=[pose({ x:0.3, y:0.5, s:sL, gaps:[1,1,1,1] })], N=[[{ categoryName:'Left' }]]; if(sR!=null){ L.push(pose({ x:0.7, y:0.5, s:sR, gaps:[1,1,1,1] })); N.push([{ categoryName:'Right' }]); }
        lightProcessHandsProbe({ landmarks:L, handednesses:N }); } }
      finally { lightHandsProbe(null); leadAllOff(); } return [mix(live), mix(T)]; };
  try{
    setLightPerHandReverb(true);
    if(routeOfOwner('lead:L')!=='track' || routeOfOwner('lead:L:2')!=='track' || routeOfOwner('lead:R')!=='live') miss(`the router: L ${routeOfOwner('lead:L')}, R ${routeOfOwner('lead:R')}`);
    const a=play(0.3,0.12), b=play(0.12,0.3);
    notes.push(`left near / right far: live ${a[0].toFixed(2)}, second ${a[1].toFixed(2)} · swapped: live ${b[0].toFixed(2)}, second ${b[1].toFixed(2)}`);
    if(!(a[0]>a[1]+0.3)) miss('left near, right far: the live (right) mix is not the larger');
    if(!(b[1]>b[0]+0.3)) miss('swapped: the second (left) mix is not the larger');
    { const p=fxParamsOf(live,'dly')[0]; if(p){ p.set(0.7); lightMirrorFx(); const q=fxParamsOf(T,'dly')[0]; if(!q || Math.abs(q.get()-0.7)>1e-9) miss('the delay\'s mix did not reach the second chain'); p.set(d0); lightMirrorFx(); } else miss('no delay on the live chain'); }
    setLightPerHandReverb(false);
    if(routeOfOwner('lead:L')!=='live') miss('off: the left hand still goes to the second head');
    const c=play(0.12,null); notes.push(`off, the left hand alone far: live ${c[0].toFixed(2)}`);   // off: one reverb — the only playing hand drives it
    if(!(c[0]>0.3)) miss('CONTROL: off, the far left hand did not move the live mix');
  } finally {
    setLightPerHandReverb(true); ST.setHandFn('ld','L',hand.L); ST.setHandFn('ld','R',hand.R); ST.setViewRect(vr);
    { const p=fxParamsOf(live,'reverb')[2], q=fxParamsOf(T,'reverb')[2]; if(p) p.set(m0[0]); if(q && !Number.isNaN(m0[1])) q.set(m0[1]); }
  }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
