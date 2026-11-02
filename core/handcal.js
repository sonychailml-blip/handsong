/* CORE-1: the live calibration service, thin over core/pure/handcal.js: the record and store, the camera's key, the running routine and withholding hands while it
   runs. Inert until an app calls handCalOpen. Reason codes only, no strings or UI (the apps word them). Numbers only, never an image or a camera name (rule #33). */
import { CAL, calCameraKey, calEmpty, calLoad, calSave, calWipe, calReset, createCalRun, calSize, calBand, calDepth, calFilter, calHold, calInverted, calSensOf } from './pure/handcal.js';
import { fxParamKeysOf } from './audio.js';
import { BUS } from './pure/bus.js';
import { arrOpen, rollOpen, camFacing } from './state.js';
import { camLabel } from './vision.js';
import { recording, liveAllOff, editIsOpen } from './recorder.js';
import { activeKind } from './clip.js';

/* localStorage with the same memory fallback as i18n.store: a blocked store lasts the session and nothing throws */
const MEM=new Map();
const memoryStore={
  getItem(k){ try{ const v=localStorage.getItem(k); return v===null ? (MEM.has(k) ? MEM.get(k) : null) : v; }catch(e){ return MEM.has(k) ? MEM.get(k) : null; } },
  setItem(k,v){ try{ localStorage.setItem(k,v); }catch(e){ MEM.set(k,v); } },
  removeItem(k){ MEM.delete(k); try{ localStorage.removeItem(k); }catch(e){} },
};
const liveCamera=()=>({ label:camLabel(), facing:camFacing });

let OPEN=null;        // { scope, store, camera, rec, status } once an app has opened it
let RUN=null, runCam=null, proposal=null, last=null, probeOn=false;
const listeners=new Set();
const keyMemo=new Map();
const cameraKey=()=>{ const c=OPEN.camera(), m=c.label+'|'+c.facing; let k=keyMemo.get(m); if(!k){ k=calCameraKey(c.label,c.facing); keyMemo.set(m,k); } return k; };   // read on every frame
const running=()=>{ const p=RUN&&RUN.state().phase; return p==='waitHand'||p==='holdNear'; };
const inReview=()=>!!RUN && RUN.state().phase==='review';
const studioBusy=()=> recording || !!activeKind() || arrOpen || rollOpen || editIsOpen();
const save=()=>calSave(OPEN.store,OPEN.rec);
function tell(){ if(!listeners.size) return; const s=handCalState(); for(const f of listeners) try{ f(s); }catch(e){ console.warn('[handcal] listener failed:',e); } }

function handCalOpen({ scope, store=memoryStore, camera=liveCamera }){
  const L=calLoad(store,scope); OPEN={ scope, store, camera, rec:L.rec, status:L.status }; RUN=null; runCam=null; proposal=null; last=null; tell();
  return L.status;
}
function handCalRead(){
  if(!OPEN) return { calibrated:false, status:'closed' };
  const camera=cameraKey(), cam=OPEN.rec.cameras[camera], near=proposal&&camera===runCam ? proposal.near : cam ? cam.near : null;
  return { camera, calibrated:near!=null, near, proposed:!!proposal, global:{ ...OPEN.rec.global }, controls:JSON.parse(JSON.stringify(OPEN.rec.controls)), status:OPEN.status };
}
/* false when closed or out of range, or when a newer version holds the store */
function setChecked(fn){ if(!OPEN) return false; fn(OPEN.rec); const ok=save(); tell(); return ok; }
const handCalSetDepthSens=v=> typeof v==='number' && v>=CAL.depthMin && v<=CAL.sensMax && setChecked(r=>{ r.global.depth=v; });
function handCalSetSens(v,id){
  if(v===null) return id!=null && setChecked(r=>{ const c=r.controls[id]; if(c){ delete c.sens; if(!Object.keys(c).length) delete r.controls[id]; } });
  if(!(typeof v==='number' && v>=CAL.sensMin && v<=CAL.sensMax)) return false;
  return setChecked(r=>{ if(id==null) r.global.fx=v; else (r.controls[id]||(r.controls[id]={})).sens=v; });
}
function handCalSetDir(id,dir){
  if(dir===null) return setChecked(r=>{ const c=r.controls[id]; if(c){ delete c.dir; if(!Object.keys(c).length) delete r.controls[id]; } });
  if(dir!=='near0'&&dir!=='near100') return false;
  return setChecked(r=>{ (r.controls[id]||(r.controls[id]={})).dir=dir; });
}
/* { control } | { camera } | { all:true }; all also frees a store held by a newer version */
function handCalReset(what={}){
  if(!OPEN) return false;
  if(what.all){ const wiped=calWipe(OPEN.store,OPEN.scope); OPEN.rec=calEmpty(OPEN.scope); OPEN.status='empty'; tell(); return wiped; }
  OPEN.rec=calReset(OPEN.rec,what); const ok=save(); tell(); return ok;
}

function begin(t,hand){ liveAllOff(); runCam=cameraKey(); proposal=null; last=null; RUN=createCalRun({ t, hand }); tell(); return null; }
const syntheticNow=()=>{ const r=BUS.get('hands'); return probeOn || !!(r&&r.landmarks&&r.landmarks.some(lm=>lm.synthetic)); };
const refusal=()=> !OPEN || running() || inReview() || studioBusy() ? 'busy' : null;
/* null, or a refusal code */
function handCalStart({ hand=null }={}){ const why=refusal(); if(why) return why; if(syntheticNow()) return 'synthetic'; return begin(performance.now(),hand); }
/* probes only: their hands come from pose() on the probe clock, so the public door refuses them */
function calStartProbe(t,{ hand=null }={}){ const why=refusal(); return why || begin(t,hand); }
function endRun(){ last=RUN?RUN.state():last; RUN=null; proposal=null; }
function handCalCancel(){ if(!RUN) return; RUN.cancel(); endRun(); tell(); }
/* from review: save. The record changes only here, so a page left in review saves nothing */
function handCalAccept(){
  if(!inReview()) return false;
  const r=RUN.accept(); OPEN.rec.cameras[runCam]={ near:r.near, noise:r.noise, at:Date.now() };
  const ok=save(); endRun(); tell(); return ok;
}
function handCalState(){ const s=RUN ? RUN.state(RUN.lastT) : last; return s ? { ...s } : { phase:'idle', reason:null, advice:null, progress:0, elapsed:0, hand:null, size:null, result:null }; }
function onHandCal(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

/* ---- read by gestures only ---- */
/* this camera's point: the proposal in review, otherwise the saved one */
const calCam=()=>{ const k=cameraKey(); return proposal&&k===runCam ? proposal : OPEN.rec.cameras[k]||null; };
const calOn=()=>OPEN!==null && calCam()!==null;
const ctlId=(ck,fxId,i)=>ck+'|'+fxId+':'+fxParamKeysOf(fxId)[i];
/* one step per frame on the hand, outside its pinch-reset smoothing; a long gap or a new near point starts fresh. The time is the hand's own (S.seen, this frame's clock) */
function calRatio(S,lm,c){
  if(S.calF!=null) return S.calF;
  let st=S.cal;
  if(!st || st.near!==c.near || S.seen-st.t>CAL.blinkMs) st=S.cal={ near:c.near };
  return S.calF=calHold(st,calFilter(st,calSize(lm),S.seen)/c.near,calBand(c.noise));
}
/* with no control named: the global depth slider, which the visuals read */
function calDepthN(S,lm,ck,fxId,i){ const c=calCam(); return calDepth(calRatio(S,lm,c),c.noise,calSensOf(OPEN.rec,'depth',ck!=null ? ctlId(ck,fxId,i) : null)); }
const calDepthAt=(S,lm,fallback,ck,fxId,i)=> calOn() ? calDepthN(S,lm,ck,fxId,i) : fallback;
/* never a filter step: this frame's value when the hand computed one, otherwise the law on the raw size */
function calDepthView(S,lm){ const c=calCam(); return calDepth(S.calF!=null ? S.calF : calSize(lm)/c.near,c.noise,calSensOf(OPEN.rec,'depth',null)); }
function calInv(ck,fxId,i,inv){ if(!OPEN) return inv; const c=OPEN.rec.controls[ctlId(ck,fxId,i)]; return c&&c.dir ? calInverted(c.dir,inv) : inv; }
const calSens=(ck,fxId,i)=> OPEN ? calSensOf(OPEN.rec,'fx',ctlId(ck,fxId,i)) : 1;
const calBusy=()=>RUN!==null && running();
/* a frame goes to the routine; while it runs the gesture machine sees no hands, so pinches close and nothing plays */
function calFrame(res,now){
  if(studioBusy()) RUN.fail('busy');
  else if(cameraKey()!==runCam) RUN.fail('camera-changed');
  const heads=(res&&(res.handednesses||res.handedness))||[];
  const s=RUN.frame({ t:now, hands:(res&&res.landmarks)||[], labels:heads.map(h=>h&&h[0]&&h[0].categoryName) });
  RUN.lastT=now;
  if(s.phase==='review') proposal=s.result;
  else if(s.phase==='failed') endRun();
  tell();
  return calBusy() ? null : res;
}
const calProbeSet=on=>{ probeOn=!!on; };
/* probes: everything put back as it was; the guard's reading of this module */
function calKeep(){ const k={ OPEN, RUN, runCam, proposal, last }; return ()=>{ ({ OPEN, RUN, runCam, proposal, last }=k); }; }
const calSig=()=>JSON.stringify({ scope:OPEN&&OPEN.scope, rec:OPEN&&OPEN.rec, status:OPEN&&OPEN.status, phase:handCalState().phase });

export { handCalOpen, handCalRead, handCalSetDepthSens, handCalSetSens, handCalSetDir, handCalReset, handCalStart, handCalCancel, handCalAccept, handCalState, onHandCal, calBusy, calFrame, calOn, calDepthN, calDepthAt, calDepthView, calInv, calSens, calProbeSet, calStartProbe, calKeep, calSig };
