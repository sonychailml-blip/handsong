/* CORE-1 CP3: the live calibration service through the REAL processHands on the probe clock. Injected store and camera: no real key is touched.
   Rows: CAL4 (first part): nothing changes with the module closed, opened empty or opened with neutral settings; the mapping's own case joins at CP4.
   CAL6: silent while calibrating, refusals, review, cancel, accept. Hands are unmarked copies of pose(), since the public door refuses marked ones. */
import { row } from './rows.js';
import { checkGesture, gestureEnvKeep, gestureEnvSet, GESTURE_ENV } from './hand.js';
import { handCalOpen, handCalRead, handCalSetDepthSens, handCalSetSens, handCalSetDir, handCalReset, handCalStart, handCalCancel, handCalAccept, handCalState, onHandCal, calBusy, calStartProbe, calKeep } from '../../../core/handcal.js';
import { calStoreKey } from '../../../core/pure/handcal.js';
import { BUS } from '../../../core/pure/bus.js';
import { pose } from '../../../core/gestures/pose.js';
import { handsProbe, processHandsProbe, HANDS } from '../../../core/gestures.js';
import { wTapSet, liveAllOff } from '../../../core/recorder.js';
import { setRecording } from '../../../core/live/record.js';
import { leadHold, fxInstance, fxAimGet, fxAimSet } from '../../../core/audio.js';
import { hooks } from '../../../core/hooks.js';
import { withLang } from '../../../core/i18n.js';
import * as ST from '../../../core/state.js';

const W=1000, H=600, SCOPE='probe', CAM={ label:'probe camera', facing:'user' };
const memStore=()=>{ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,v), removeItem:k=>m.delete(k), m }; };
/* a real-looking hand: the generator's landmarks without its mark; palm size = 0.95 s */
const real=p=>[...pose(p)];
const SIZE=0.334, S=SIZE/0.95, OPENH={ x:0.75, y:0.6, s:S }, PINCH={ ...OPENH, gaps:[0.05,1,1,1] };
const frame=(hands)=>({ landmarks:hands, handednesses:hands.map(()=>[{ categoryName:'Right' }]) });

/* this row's frames play only the solo chain's volume; reading every chain through fxInstance would build instances that don't exist yet (seen on Night) */
function volKeep(){ const key=ST.chainKeyOf('ld'), inst=fxInstance(key,'vol'); if(!inst) return ()=>{}; const back=inst.params.map(p=>{ const v=p.cur, a=fxAimGet(key,'vol',p.key,null); return ()=>{ if(p.cur!==v) p.setNorm(v); fxAimSet(key,'vol',p.key,a); }; }); return ()=>back.forEach(f=>f()); }
export async function checkHandCal(){
  const d=[]; let n=0; const ok=(what,c)=>{ n++; if(!c) d.push(what); };
  const keep=calKeep(), envK=gestureEnvKeep(), fxBack=volKeep(), tutK=hooks.tutor, busK=BUS.get('hands');
  const realKeys=()=>{ try{ return localStorage.getItem(calStoreKey(SCOPE)); }catch(e){ return null; } }, real0=realKeys();
  const session=fn=>withLang('en',()=>{ const clk={ t:1000, W, H }, tap=[];
    gestureEnvSet(GESTURE_ENV); hooks.tutor=null; handsProbe(clk,()=>true); wTapSet((name)=>tap.push(name));
    const step=(hands,ms=33)=>{ clk.t+=ms; processHandsProbe(frame(hands)); };
    try{ return fn({ clk, tap, step }); } finally { wTapSet(null); handsProbe(null); liveAllOff(); hooks.tutor=tutK; } });
  const open=(cam=CAM,store=memStore())=>{ handCalOpen({ scope:SCOPE, store, camera:()=>cam }); return store; };
  const holdUntilDone=(c,hand=OPENH)=>{ for(let i=0;i<120 && calBusy();i++) c.step([real(hand)]); };
  try{
    /* CAL4, first part: the print stays exact in three states */
    const same=async()=>(await checkGesture()).total===0;
    ok('CAL4: the print with the module as it stands', await same());
    { open(); ok('CAL4: the print opened with an empty record', await same()); }
    { open(); handCalSetSens(1); handCalSetDepthSens(1); ok('CAL4: the print opened with neutral settings', await same()); }
    /* the public door */
    { const c0=handCalStart(); ok('open: a start outside a session works', c0===null && calBusy()); handCalCancel(); ok('...and cancels', !calBusy() && handCalState().phase==='cancelled'); }
    session(()=>{ ok('a probe session refuses the public start', handCalStart()==='synthetic' && !calBusy()); });
    { BUS.set('hands',frame([pose(OPENH)])); ok('a marked hand on the bus refuses', handCalStart()==='synthetic' && !calBusy());
      BUS.set('hands',frame([real(OPENH)])); ok('CONTROL: an unmarked one starts', handCalStart()===null && calBusy()); handCalCancel(); BUS.set('hands',busK); }
    { ST.setArrOpen(true); ok('busy: the arrangement window', handCalStart()==='busy'); ST.setArrOpen(false);
      ST.setRollOpen(true); ok('busy: the editor', handCalStart()==='busy'); ST.setRollOpen(false);
      setRecording(true); ok('busy: recording', handCalStart()==='busy'); setRecording(false);
      handCalStart(); ok('busy: a run active', handCalStart()==='busy'); handCalCancel(); }
    /* withheld: nothing played, nothing written, hands back in review */
    session(c=>{ open(); ok('CONTROL: without a run the same frames play', (()=>{ c.step([real(PINCH)]); c.step([real(PINCH)]); return c.tap.length>0; })());
      for(let i=0;i<8;i++) c.step([]);
      liveAllOff(); c.tap.length=0;
      ok('the probe door starts', calStartProbe(c.clk.t)===null);
      const aim0=JSON.stringify(ST.fx);
      /* every withheld frame; the frame that completes the hold is already review's, and it plays */
      let leaked=0, pinched=false; for(let i=0;i<120 && calBusy();i++){ leaked=c.tap.length; pinched=pinched||Object.values(HANDS).some(s=>s.pinch); c.step([real(PINCH)]); }
      ok('withheld: no W call on any frame of the run', leaked===0); ok('withheld: no pinch in the machine', !pinched); ok('withheld: effects unchanged', JSON.stringify(ST.fx)===aim0);
      const s=handCalState(); ok(`review after about 2 s (${s.phase}, ${s.reason})`, s.phase==='review' && s.elapsed>=2000 && s.elapsed<2100);
      const read=handCalRead(); ok('the proposal applies in memory', read.proposed && Math.abs(read.near-SIZE)<1e-3); ok('...and is not in the record', Object.keys(JSON.parse(JSON.stringify(read.controls))).length===0);
      c.step([real(PINCH)]); c.step([real(PINCH)]); ok('review: the hands play again', c.tap.length>0);
    });
    /* cancel restores the mapping exactly; accept stores numbers only */
    session(c=>{ const store=open(), key=calStoreKey(SCOPE); calStartProbe(c.clk.t); holdUntilDone(c);
      const r0=handCalRead(); handCalCancel(); const r1=handCalRead(); ok('cancel in review restores', r0.proposed && !r1.proposed && !r1.calibrated && store.getItem(key)===null);
      calStartProbe(c.clk.t); holdUntilDone(c); ok('accept saves', handCalAccept()===true); const a=handCalRead(); ok('accepted', a.calibrated && !a.proposed && Math.abs(a.near-SIZE)<1e-3);
      const text=store.getItem(key); ok('the record holds no camera name', text && !text.includes(CAM.label)); const cam=JSON.parse(text).cameras[a.camera]; ok('the camera holds near, noise, at', cam && Object.keys(cam).sort().join()==='at,near,noise');
      calStartProbe(c.clk.t); holdUntilDone(c,{ ...OPENH, s:S*0.8 }); handCalCancel(); ok('cancel keeps the saved near', Math.abs(handCalRead().near-SIZE)<1e-3);
      handCalOpen({ scope:SCOPE, store, camera:()=>({ label:'another', facing:'user' }) }); ok('another camera is uncalibrated', !handCalRead().calibrated);
      handCalOpen({ scope:SCOPE, store, camera:()=>CAM }); ok('the record comes back from the store', handCalRead().calibrated);
      handCalReset({ camera:a.camera }); ok('a camera reset', !handCalRead().calibrated);
    });
    /* failures end the withholding */
    session(c=>{ open(); calStartProbe(c.clk.t); c.step([real(OPENH)]); c.step([pose(OPENH)]); const s=handCalState(); ok('a marked hand mid-run fails it', s.phase==='failed' && s.reason==='synthetic' && !calBusy());
      c.tap.length=0; c.step([real(PINCH)]); c.step([real(PINCH)]); ok('after a failure the hands play', c.tap.length>0); });
    session(c=>{ let cam=CAM; handCalOpen({ scope:SCOPE, store:memStore(), camera:()=>cam }); calStartProbe(c.clk.t); c.step([real(OPENH)]); cam={ label:'switched', facing:'user' }; c.step([real(OPENH)]); ok('a camera switch fails it', handCalState().reason==='camera-changed' && !calBusy()); });
    session(c=>{ open(); calStartProbe(c.clk.t); c.step([real(OPENH)]); ST.setArrOpen(true); c.step([]); ST.setArrOpen(false); ok('a studio window mid-run fails it', handCalState().reason==='busy' && !calBusy()); });
    /* a pinch held at the start: the voice stops at once, and the machine only closes */
    session(c=>{ open(); c.step([real(PINCH)]); c.step([real(PINCH)]); const held=Object.keys(leadHold).some(k=>!k.startsWith('leadloop')); ok('(the script holds a note)', held);
      c.tap.length=0; calStartProbe(c.clk.t); ok('start stops the live note', !Object.keys(leadHold).some(k=>!k.startsWith('leadloop')));
      for(let i=0;i<10;i++) c.step([real(PINCH)]); ok(`only closing calls in the run: ${c.tap.join()}`, c.tap.every(x=>/Off$/.test(x))); ok('the pinch closed', !Object.values(HANDS).some(s=>s.pinch)); handCalCancel(); });
    /* settings */
    { open(); ok('depth slider refuses 0.5', handCalSetDepthSens(0.5)===false); ok('depth slider takes 0.7', handCalSetDepthSens(0.7)===true && handCalRead().global.depth===0.7);
      ok('effects slider takes 0.5', handCalSetSens(0.5)===true && handCalRead().global.fx===0.5); ok('an override', handCalSetSens(1.4,'a|b:c') && handCalRead().controls['a|b:c'].sens===1.4); ok('null removes it', handCalSetSens(null,'a|b:c') && !handCalRead().controls['a|b:c']);
      ok('a direction', handCalSetDir('a|b:c','near100') && handCalRead().controls['a|b:c'].dir==='near100'); ok('a bad direction refused', handCalSetDir('a|b:c','up')===false); ok('a control reset', handCalReset({ control:'a|b:c' }) && !handCalRead().controls['a|b:c']);
      let told=0; const off=onHandCal(()=>told++); handCalSetSens(1); off(); handCalSetSens(1); ok('listeners', told===1); ok('a full reset', handCalReset({ all:true }) && handCalRead().global.fx===1); }
    ok('no real key touched', realKeys()===real0);
  } finally {
    keep(); BUS.set('hands',busK); ST.setArrOpen(false); ST.setRollOpen(false); setRecording(false); gestureEnvSet(envK); fxBack(); hooks.tutor=tutK;
  }
  return { cases:n, total:d.length, differences:d };
}
row({ night:true, at:456, name:'CAL4/CAL6 calibration service', run:()=>checkHandCal(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
