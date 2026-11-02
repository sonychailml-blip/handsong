/* CORE-1: the playing hand's depth calibration and the sensitivity settings, pure (rule #36; rows CAL1-CAL3). Laws, record, store and the routine, with an
   explicit clock. Design and the measured numbers behind CAL: docs/core/CORE-1-DESIGN.md. Holds numbers only, never an image or a camera name (rule #33). */
import { F, FORMAT_VERSION, upgrade } from './format.js';
import { fnv } from './canon.js';

/* All times in ms of the frame's clock: nothing counts frames (the Poco tracks at about 7 fps). */
const CAL=Object.freeze({
  farRatio:0.42, tauS:0.205, band:0.009, bandK:3, bandMax:0.02, marginMax:0.03, sensMin:0.5, sensMax:2, depthMin:0.7,   // depth from 0.7x: the far end stays within arm's reach (user)
  waitMs:10000, holdLimitMs:12000, holdMs:2000, holdMaxMs:4000, minSamples:8, checkFrom:5, stillSize:0.06, stillWrist:0.05, blinkMs:800, minNear:0.25, lockJump:0.3,
  frameLm:null,   // null = all 21 landmarks must be in the frame
});
const REASONS=Object.freeze(['no-hand','not-still','out-of-frame','too-far','hand-lost','low-rate','busy','synthetic','camera-changed','cancelled']);
const clamp01=v=>Math.max(0,Math.min(1,v));

/* ---- laws ---- */
/* the far end as a share of the near size: the slider divides the real travel (1/r is distance over the near distance) */
const calFarRatio=(s=1)=>1/(1+(1/CAL.farRatio-1)/s);
/* the hold band follows the noise measured in this camera's hold: 3 sigmas, within a floor and a cap. The filter passes more noise at 7 fps; rates per width: docs/core/CORE-1-DESIGN.md §2.3 */
const calBand=noise=>Math.max(CAL.band,Math.min(CAL.bandMax,CAL.bandK*noise));
/* past the band, or a hand held at its near point would read just above 0 while the filter settles */
const calEndPull=noise=>Math.max(1.25*calBand(noise),Math.min(CAL.marginMax,4*noise));
/* r = size / near size; never below the hold band's reach, so the near end stays exactly 0 */
function calDepth(r,noise,s=1){ const r0=1-calEndPull(noise); return clamp01((r0-r)/(r0-calFarRatio(s))); }
/* the time-based one-pole on the size; `st` lives on the hand, outside its pinch-reset smoothing */
function calFilter(st,hs,t){ if(st.hs==null) st.hs=hs; else st.hs+=(1-Math.exp(-Math.max(0,t-st.t)/1000/CAL.tauS))*(hs-st.hs); st.t=t; return st.hs; }
/* backlash on the unclamped ratio, ahead of the law, so both ends stay reachable */
function calHold(st,r,band=CAL.band){ if(st.r==null) st.r=r; else if(r>st.r+band) st.r=r-band; else if(r<st.r-band) st.r=r+band; return st.r; }
/* one effective direction per control: dir when set, otherwise the parameter's own inv */
const calInverted=(dir,inv)=> dir ? dir==='near100' : !!inv;
const calDirValue=(v,dir,inv)=> calInverted(dir,inv) ? 1-v : v;
/* the effects hand: 1*x is exactly x, so sens 1 is today's expression */
const calFx=(base,d,inv,sens=1)=>clamp01(base+sens*(inv?-d:d));
/* an override replaces the global value of its address, never multiplies */
function calSensOf(rec,addr,id){ const c=id!=null&&rec.controls[id], v=c&&c.sens!=null ? c.sens : rec.global[addr]; return addr==='depth' ? Math.max(CAL.depthMin,v) : v; }   // a control can be moved to depth carrying a lower override

/* ---- robust numbers ---- */
const medianOf=a=>{ const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const robustSigma=a=>{ const m=medianOf(a); return 1.4826*medianOf(a.map(x=>Math.abs(x-m))); };
/* median and sigma of the samples within 3 robust sigmas */
function robust(a){ const m=medianOf(a), s=robustSigma(a), kept=a.filter(x=>Math.abs(x-m)<=3*s); const med=medianOf(kept); return { median:med, sigma:robustSigma(kept), kept:kept.length }; }

/* ---- record ---- */
const CAM_KEY=/^[0-9a-f]{8}$/, CONTROL_ID=/^[\w:.-]{1,40}\|[\w:.-]{1,40}$/, SCOPE=/^[a-z0-9-]{1,24}$/, DIRS=['near0','near100'];
const sensOk=v=>typeof v==='number' && v>=CAL.sensMin && v<=CAL.sensMax;
const isObj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const onlyKeys=(o,keys)=>Object.keys(o).every(k=>keys.includes(k));
const camOk=c=>isObj(c) && onlyKeys(c,['near','noise','at']) && typeof c.near==='number' && c.near>0 && c.near<=2 && typeof c.noise==='number' && c.noise>=0 && c.noise<=1 && Number.isFinite(c.at) && c.at>=0;
const ctlOk=c=>isObj(c) && onlyKeys(c,['dir','sens']) && (c.dir===undefined||DIRS.includes(c.dir)) && (c.sens===undefined||sensOk(c.sens));
const calEmpty=scope=>({ format:F.handcal, version:FORMAT_VERSION.handcal, scope, global:{ depth:1, fx:1 }, controls:{}, cameras:{} });
/* a parsed value to a clean record: damage drops only the damaged part. status ok | empty | partial | damaged | newer */
function calClean(x,scope){
  const empty=calEmpty(scope);
  if(!isObj(x) || x.format!==F.handcal || !Number.isInteger(x.version)) return { rec:empty, status:'damaged', dropped:['record'] };
  if(x.version>FORMAT_VERSION.handcal) return { rec:empty, status:'newer', dropped:[] };
  const u=upgrade(x);
  if(u.version!==FORMAT_VERSION.handcal || u.scope!==scope) return { rec:empty, status:'damaged', dropped:['record'] };
  const dropped=[], rec=empty;
  for(const k of Object.keys(u)) if(!['format','version','scope','global','controls','cameras'].includes(k)) dropped.push(k);
  const part=k=>{ if(u[k]===undefined) return {}; if(isObj(u[k])) return u[k]; dropped.push(k); return {}; };
  const G=part('global'), C=part('controls'), M=part('cameras');
  for(const k of Object.keys(G)) if(k in rec.global && sensOk(G[k]) && (k!=='depth'||G[k]>=CAL.depthMin)) rec.global[k]=G[k]; else dropped.push('global.'+k);
  for(const k of Object.keys(C)) if(CONTROL_ID.test(k) && ctlOk(C[k])) rec.controls[k]={ ...C[k] }; else dropped.push('controls.'+k);
  for(const k of Object.keys(M)) if(CAM_KEY.test(k) && camOk(M[k])) rec.cameras[k]={ ...M[k] }; else dropped.push('cameras.'+k);
  return { rec, status:dropped.length ? 'partial' : 'ok', dropped };
}
function calParse(text,scope){ if(text==null) return { rec:calEmpty(scope), status:'empty', dropped:[] };
  let x; try{ x=JSON.parse(text); }catch(e){ return { rec:calEmpty(scope), status:'damaged', dropped:['record'] }; }
  return calClean(x,scope); }
const calText=rec=>JSON.stringify(rec);
/* the camera's name is hashed here and never stored */
const calCameraKey=(label,facing)=>fnv(label ? label : 'facing:'+facing).toString(16).padStart(8,'0');
function calReset(rec,what){
  if(what.all) return calEmpty(rec.scope);
  const r=JSON.parse(calText(rec));
  if(what.control!=null) delete r.controls[what.control];
  if(what.camera!=null) delete r.cameras[what.camera];
  return r;
}

/* ---- store: injected, per device and app; a blocked store never throws ---- */
const calStoreKey=scope=>{ if(!SCOPE.test(String(scope))) throw new Error('handcal: bad scope'); return 'handsong.handCal.'+scope; };
function calLoad(store,scope){ let text; try{ text=store.getItem(calStoreKey(scope)); }catch(e){ if(e.message==='handcal: bad scope') throw e; return { rec:calEmpty(scope), status:'blocked', dropped:[] }; }
  return calParse(text,scope); }
/* false when blocked, or when a newer version is stored: that stays until an explicit calWipe */
function calSave(store,rec){ const key=calStoreKey(rec.scope);
  try{ if(calParse(store.getItem(key),rec.scope).status==='newer') return false; store.setItem(key,calText(rec)); return true; }catch(e){ return false; } }
function calWipe(store,scope){ const key=calStoreKey(scope); try{ store.removeItem(key); return true; }catch(e){ return false; } }

/* ---- the routine: frame({ t, hands:[landmarks], labels? }) in, phases out ---- */
const sizeOf=lm=>Math.hypot(lm[0].x-lm[9].x, lm[0].y-lm[9].y);
const calSize=sizeOf;
const inFrame=(lm,idx)=>(idx ? idx.map(i=>lm[i]) : lm).every(p=>p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1);
/* 2.56 robust sigmas spans the middle 80% of a normal spread; a single spike can't move it */
const spreadOf=a=>2.56*robustSigma(a);
function createCalRun({ t:t0, hand=null, C=CAL }){
  let phase='waitHand', reason=null, advice=null, startT=t0, holdT=null, lock=null, seenT=null, win=[], runT=null, cause=null, result=null, cur=null;
  const end=(p,why)=>{ phase=p; reason=why; advice=null; };
  const active=()=>phase==='waitHand'||phase==='holdNear';
  const clear=()=>{ win=[]; runT=null; };
  /* the lock is by wrist, since the left/right label can flip between frames */
  function pick(hands,labels){
    if(lock){ let best=null, bd=C.lockJump; for(const lm of hands){ const d=Math.hypot(lm[0].x-lock.x, lm[0].y-lock.y); if(d<=bd){ bd=d; best=lm; } } return best; }
    if(hand && labels){ const i=labels.indexOf(hand); return i>=0 ? hands[i] : null; }
    let best=null, bs=-1; for(const lm of hands){ const s=sizeOf(lm); if(s>bs){ bs=s; best=lm; } } return best;
  }
  const stillAt=w=>spreadOf(w.map(s=>s.size))/medianOf(w.map(s=>s.size))<=C.stillSize && Math.hypot(spreadOf(w.map(s=>s.x)),spreadOf(w.map(s=>s.y)))<=C.stillWrist;
  /* the newest samples spanning holdMs and holding minSamples, or null while the window is short */
  function windowAt(t){ if(win.length<C.minSamples || t-win[0].t<C.holdMs) return null;
    let i=win.length-C.minSamples; while(i>0 && t-win[i].t<C.holdMs) i--; return win.slice(i); }
  function holdFrame(t,lm){
    if(!lm){ if(seenT!=null && t-seenT>C.blinkMs){ clear(); lock=null; cur=null; cause='hand-lost'; } return; }
    const size=sizeOf(lm), x=lm[0].x, y=lm[0].y;
    if(seenT!=null && t-seenT>C.blinkMs){ clear(); cause='hand-lost'; }
    seenT=t; lock={ x, y }; cur={ x, y, size }; advice=null;
    if(!inFrame(lm,C.frameLm)){ clear(); advice='back'; cause='out-of-frame'; return; }
    if(runT==null) runT=t;
    win.push({ t, size, x, y }); while(t-win[0].t>C.holdMaxMs) win.shift();
    if(win.length>=C.checkFrom && !stillAt(win.slice(-Math.max(C.minSamples,win.filter(s=>t-s.t<=C.holdMs).length)))){ win=[win[win.length-1]]; runT=t; advice='still'; cause='not-still'; return; }
    const w=windowAt(t);
    if(w){ const R=robust(w.map(s=>s.size));
      if(R.kept>=C.minSamples){
        if(R.median<C.minNear){ advice='closer'; cause='too-far'; return; }
        result={ near:R.median, noise:R.sigma/R.median }; end('review',null); return; } }
    if(t-runT>=C.holdMaxMs) end('failed','low-rate');
  }
  function frame({ t, hands=[], labels=null }){
    if(!active()) return state(t);
    if(hands.some(lm=>lm.synthetic)){ end('failed','synthetic'); return state(t); }
    const lm=pick(hands,labels);
    if(phase==='waitHand'){
      if(lm){ phase='holdNear'; holdT=t; }
      else if(t-startT>=C.waitMs) end('failed','no-hand');
    }
    if(phase==='holdNear'){ holdFrame(t,lm);
      if(phase==='holdNear' && t-holdT>=C.holdLimitMs) end('failed', cause || (win.length ? 'not-still' : 'hand-lost')); }
    return state(t);
  }
  function state(t){ const span=win.length ? win[win.length-1].t-win[0].t : 0;
    return { phase, reason, advice, progress: phase==='review'||phase==='saved' ? 1 : phase==='holdNear' ? Math.min(1,span/C.holdMs) : 0, elapsed:(t??startT)-startT,
      hand:cur?{ x:cur.x, y:cur.y }:null, size:cur?cur.size:null, result }; }
  return { frame, state,
    accept(){ if(phase!=='review') return null; phase='saved'; return result; },
    cancel(){ if(active()||phase==='review'){ result=null; end('cancelled','cancelled'); } },
    fail(code){ if(!REASONS.includes(code)) throw new Error('handcal: unknown reason '+code); if(active()||phase==='review'){ result=null; end('failed',code); } } };
}

export { CAL, REASONS, calSize, calFarRatio, calBand, calEndPull, calDepth, calFilter, calHold, calInverted, calDirValue, calFx, calSensOf, robust, calEmpty, calClean, calParse, calText, calCameraKey, calReset, calStoreKey, calLoad, calSave, calWipe, createCalRun };
