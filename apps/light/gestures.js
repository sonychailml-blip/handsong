/* LIGHT-3 — LIGHT'S HANDS: core/gestures/hands.js and roles.js COPIED and cut to what Light offers (option B, the founder 2026-11-27): one role,
   the solo; each hand's function note / hold / theremin / effects (handFn.ld); the effects hand drives its finger's chain entries (core captureFx);
   the playing hand's horizontal is the note's volume, its depth drives the chain's play:z values (reverb). Removed with their branches: chords
   and their palette, bass, drums, the looper hand, the expression hand, split halves, the register band (no Light mode shows one), the
   tutorial taps, calibration (LIGHT-4). Every kept line keeps core's arithmetic and order — the probe compares this machine's note calls with
   core's on the same synthetic hands. Notes go to apps/light/engine.js (no recorder). */
import { FINGER_TIPS, PINCH_HOLD, REV_NEAR, REV_RANGE, WATCHDOG_MS, volAmp } from '../../core/config.js';
import { fxChainOf, chainKeyOf, FX_VOL, flipX, leadIdx, handFnOf, playsNotes, isLeadMode, pinchFingers, sx, sy, handSide, rectOctReg, volFloor } from '../../core/state.js';
import { IVX, rectGrid, rectLayout, rectBase, rectNoteAt, thereminHz } from '../../core/scales.js';
import { fxSnapshot, FX_GLIDE_KEY, fxInstance, fxHandRange } from '../../core/audio.js';
import { canvas } from '../../core/vision.js';
import { clamp01, clamp, dist, pinchRatios, minFinger, touchedFingers, emaS, degHyst } from '../../core/gestures/features.js';
import { fxParamsOf, captureFx } from '../../core/gestures/fxhand.js';
import { lightNoteOn, lightNoteOff } from './engine.js';

const ROLE='ld', HANDS={}, monoOwner={ ld:null };
/* the effects sensitivity (LIGHT-4 sets it; 1 = core's own law, and 1*x is exactly x) */
let fxSens=1;
export const setLightFxSens=v=>{ fxSens= v>0 ? +v : 1; };

/* ── roles.js, cut to the solo ── */
function depthOf(S,lm){ if(S.hsF==null) S.hsF=emaS(S,'hs',dist(lm[0],lm[9]),0.15); return S.hsF; }   // ONE smoothing step per hand per frame
const depthN=(S,lm)=>clamp01((REV_NEAR-depthOf(S,lm))/REV_RANGE);
const polyZone=z=> z===ROLE && !isLeadMode(z), leadZone=z=> z===ROLE && isLeadMode(z);
const liveKey=(key,finger=null)=> 'lead:'+handSide(key)+(finger==null?'':':'+finger), monoKey=()=>'lead:M';
const wOn=(own,p,live)=>lightNoteOn(own,p,live), wOff=own=>lightNoteOff(own);
const noteHand=key=> playsNotes(handFnOf(key,ROLE));
function noteVolOf(zk,xn,zOf){
  const eff=fxChainOf(zk).find(e=>e&&e.fxId===FX_VOL), pa=eff&&eff.params[0];
  if(pa && pa.mode==='fixed' && pa.v01!=null) return pa.v01;
  const [lo,hi]=fxHandRange(FX_VOL,'amt');
  if(pa && pa.mode==='drive' && pa.hand==='fx'){ const inst=fxInstance(zk,FX_VOL), c=inst ? inst.params[0].cur : null; if(c!=null) return lo+(hi-lo)*c; }
  const z = pa && pa.mode==='drive' && pa.hand==='play' && pa.axis==='z' && zOf;
  const a = z ? zOf() : xn;
  const v = (pa&&pa.inv) ? 1-a : a, r=lo+(hi-lo)*v;
  if(volFloor==null) return r;
  return Math.sqrt(volFloor+(1-volFloor)*volAmp(r));
}

function otherPinched(key){ for(const k in HANDS){ if(k!==key){ const S=HANDS[k]; if(S.pinch&&S.zone===ROLE) return k; } } return null; }
function endPinch(key,S){
  if(S.pinch){
    if(polyZone(S.zone)){ for(const kk of (S.snd||[])) wOff(kk); }
    else if(leadZone(S.zone) && monoOwner.ld===key){ const nx=otherPinched(key); if(nx) monoOwner.ld=nx; else{ wOff(monoKey()); monoOwner.ld=null; } }
  }
  S.pinch=false; S.adj=null; S.deg=-1; S.slot=-1; S.rect=null;
  S.snd=[]; S.fing={}; S.order=[]; S.touch=new Set();
  S.fn=null;
}
/* a voice mode changed (the hands menu, LIGHT-3 later): the solo hands' state follows it, as core's voiceModeReset */
export function lightVoiceModeReset(){
  monoOwner.ld=null;
  for(const k in HANDS){ const S=HANDS[k]; if(!S.pinch||S.zone!==ROLE) continue; S.snd=[]; S.fing={}; if(isLeadMode(ROLE)) monoOwner.ld=k; }
}
/* every hand forgotten (a scale, key or hand-function change: the notes were silenced by the caller) */
export function lightHandsReset(){ for(const k of Object.keys(HANDS)) delete HANDS[k]; monoOwner.ld=null; }

/* HAND1-style probe clock: while set, the machine takes its time and play-field size from it and the app loop's calls are ignored */
let PRB=null, prbCall=false, prbKeep=null;
const nowMs=()=> PRB ? PRB.t : performance.now();
export function lightHandsProbe(clk){
  if(clk && !PRB){ prbKeep={ hands:{ ...HANDS }, mono:monoOwner.ld }; for(const k in HANDS) delete HANDS[k]; monoOwner.ld=null; }
  else if(!clk && PRB && prbKeep){ for(const k in HANDS) delete HANDS[k]; Object.assign(HANDS, prbKeep.hands); monoOwner.ld=prbKeep.mono; prbKeep=null; }
  PRB=clk||null;
}
export function lightProcessHandsProbe(res){ prbCall=true; try{ lightProcessHands(res); } finally { prbCall=false; } }

export function lightProcessHands(res){
  if(PRB && !prbCall) return;
  const W=PRB?PRB.W:canvas.width, H=PRB?PRB.H:canvas.height, now=nowMs();
  const seen=new Set(), hands=(res&&res.landmarks)?res.landmarks:[], heads=(res&&(res.handednesses||res.handedness))||[];
  for(let i=0;i<hands.length;i++){
    const lm=hands[i];
    let key=(heads[i]&&heads[i][0]&&heads[i][0].categoryName)||('H'+i);
    if(seen.has(key)) key+=i;
    seen.add(key);
    const S=HANDS[key]||(HANDS[key]={ pinch:false, deg:-1, oct:0, regOct:0, slot:-1, zone:null, vol:.6, adj:null, sm:{}, fn:null, touch:new Set(), order:[], fing:{}, snd:[] });
    S.seen=now; S.lm=lm; S.hsF=null;
    const rx0=0, rx1=W;
    const r=pinchRatios(lm), [mf0,mv]=minFinger(r);
    const prevTouch=S.touch||new Set(), touch=touchedFingers(r,prevTouch);
    S.order=(S.order||[]).filter(f=>touch.has(f));
    for(let f=0;f<FINGER_TIPS.length;f++) if(touch.has(f)&&!S.order.includes(f)) S.order.push(f);
    S.touch=touch;
    const multi=pinchFingers>1;
    const pf = multi ? (S.order.length?S.order[0]:FINGER_TIPS.indexOf(mf0)) : FINGER_TIPS.indexOf(mf0);
    const mf = FINGER_TIPS[pf];

    if(!S.pinch&&touch.size){
      S.pinch=true; S.oct=pf; S.deg=-1; S.sm={}; S.fing={}; S.rect=null;
      S.role=ROLE; S.rx0=rx0; S.rx1=rx1;
      S.zone = handFnOf(key,ROLE)==='fx' ? 'fx' : noteHand(key) ? ROLE : null;   // Light offers fx / note / hold / therm only
      S.fn = S.zone===ROLE ? handFnOf(key,ROLE) : null;
      if(multi && leadZone(S.zone)) S.oct=FINGER_TIPS.indexOf(mf0);
      if(S.zone==='fx') captureFx(S,FINGER_TIPS.indexOf(mf),lm,H);
      else if(S.zone===ROLE && leadZone(S.zone)) monoOwner.ld=key;
    }else if(S.pinch){
      if(!touch.size){ endPinch(key,S); }
      else if(!(multi&&polyZone(S.zone))&&mv<PINCH_HOLD&&FINGER_TIPS.indexOf(mf0)!==S.oct&&S.fn!=='hold'){
        S.oct=FINGER_TIPS.indexOf(mf0);
        if(S.zone==='fx'&&S.adj) captureFx(S,FINGER_TIPS.indexOf(mf0),lm,H);
      }
      else if(multi&&polyZone(S.zone)&&touch.size&&S.oct!==pf) S.oct=pf;
    }

    if(S.pinch){
      const tip=lm[FINGER_TIPS[S.oct]];
      const x=emaS(S,'x',sx(tip.x,W),0.4), y=emaS(S,'y',sy(tip.y,H),0.4);
      S.x=x; S.y=y;
      if(S.zone==='fx'){
        const A=S.adj;
        if(A){
          const hs=depthOf(S,lm);
          if(A.p0.z==null) A.p0.z=hs;
          const off={ x:(flipX(lm[4].x)-flipX(A.p0.x))/0.7, y:(A.p0.y-lm[4].y*H)/(H*0.7), z:(hs-A.p0.z)/REV_RANGE };
          for(const e of A.ent){ const pa=e.pa;
            if(pa.mode!=='drive' || pa.hand!=='fx') continue;
            const d=off[pa.axis]||0;
            e.set(clamp01(e.base+fxSens*(pa.inv?-d:d))); }
        }
      }else if(S.zone===ROLE){
        const rectPlay=rectGrid(), thereminOn=S.fn==='therm', holdOn=S.fn==='hold';
        const RL = rectPlay?rectLayout():null;
        const base = rectPlay ? rectBase(rectOctReg(ROLE)) : S.oct;
        const poly=polyZone(S.zone);
        const act = !poly ? [] : thereminOn ? [S.oct] : (multi ? S.order : [S.oct]).filter(f=>!rectPlay||f<RL.k).slice(0,pinchFingers);
        const idle = poly ? act.length===0 : (rectPlay && !thereminOn && S.oct>=RL.k);
        if(idle){ S.deg=-1; S.slot=-1; }
        else if(thereminOn){ const th=thereminHz(y,H,base); S.deg=th.deg; S.regOct=th.oct; S.slot=rectPlay?th.slot:-1; S.hz=th.hz; }
        else if(holdOn && S.deg>=0){ /* the hold: degree and octave frozen from the first frame */ }
        else if(rectPlay){
          S.rect=degHyst(y,RL.bands,H,S.rect==null?-1:S.rect);
          const rr=clamp(S.rect-RL.regBands,0,RL.rects-1), g=clamp(rr*RL.k+S.oct, 0, RL.notes-1), n=rectNoteAt(g,base);
          S.deg=n.deg; S.regOct=n.oct; S.slot=g;
        }else{ S.deg=degHyst(y,IVX().length,H,S.deg); S.regOct=S.oct; S.slot=-1; }
        if(poly&&!idle){
          for(const f of act){
            if(holdOn && S.fing[f]) continue;
            if(rectPlay){ const g=clamp(Math.floor(S.slot/RL.k)*RL.k+f, 0, RL.notes-1), n=rectNoteAt(g,base); S.fing[f]={ deg:n.deg, oct:n.oct, slot:g }; }
            else if(thereminOn) S.fing[f]={ deg:S.deg, oct:S.regOct, slot:S.slot };
            else S.fing[f]={ deg:S.deg, oct:f, slot:-1 };
          }
          for(const f of Object.keys(S.fing)) if(!act.includes(+f)) delete S.fing[f];
        }
        const xn=clamp01((x-rx0)/(rx1-rx0)), zk=chainKeyOf(ROLE);
        S.vol=noteVolOf(zk,xn,()=>depthN(S,lm));
        for(const eff of fxChainOf(zk)){
          if(!eff||eff.fxId===FX_VOL) continue;
          let ps=null;
          eff.params.forEach((pa,i)=>{ if(pa.mode!=='drive' || pa.hand!=='play' || pa.axis!=='x') return; if(!ps) ps=fxParamsOf(zk,eff.fxId); const p=ps[i]; if(p) p.set(pa.inv ? 1-xn : xn); });
        }
        const noteFx=m=> thereminOn && m && m[FX_GLIDE_KEY]!=null ? (({[FX_GLIDE_KEY]:_g, ...rest})=>rest)(m) : m;
        const payload=(deg,oct,fxSnap)=>({ deg, oct, vol:S.vol, fx:fxSnap, inst:leadIdx });
        if(poly){
          const noteKey=f=> (multi&&!thereminOn) ? liveKey(key,f) : liveKey(key);
          const keys=act.map(noteKey), prevSnd=S.snd||[];
          for(const kk of prevSnd) if(!keys.includes(kk)) wOff(kk);
          S.snd=keys;
          if(!idle){ const fxSnap=noteFx(fxSnapshot(zk));
            for(const f of act){ const n=S.fing[f]; if(!n) continue; wOn(noteKey(f), payload(n.deg,n.oct,fxSnap), thereminOn?S.hz:null); } }
        }else if(idle){ if(monoOwner.ld===key) wOff(monoKey()); }
        else if(monoOwner.ld===key){ const fxSnap=noteFx(fxSnapshot(zk)); wOn(monoKey(), payload(S.deg,S.regOct,fxSnap), thereminOn?S.hz:null); }
      }
    }
    /* the playing hand's depth → the chain's play:z values (absolute: nearer 0 … farther 1); nothing written while no playing hand is seen */
    if(noteHand(key)){
      const vD=depthN(S,lm), ck=chainKeyOf(ROLE);
      for(const eff of fxChainOf(ck)){
        if(!eff||eff.fxId===FX_VOL) continue;
        let ps=null;
        eff.params.forEach((pa,i)=>{ if(pa.mode!=='drive' || pa.hand!=='play' || pa.axis!=='z') return; if(!ps) ps=fxParamsOf(ck,eff.fxId); const p=ps[i]; if(p) p.set(pa.inv ? 1-vD : vD); });
      }
    }
  }
  /* the watchdog: a hand gone mid-pinch is released after WATCHDOG_MS (forgives a tracking blink) */
  for(const k of Object.keys(HANDS)){ const S=HANDS[k]; if(!seen.has(k)&&now-S.seen>WATCHDOG_MS){ endPinch(k,S); delete HANDS[k]; } }
  if(monoOwner.ld&&!HANDS[monoOwner.ld]){ wOff(monoKey()); monoOwner.ld=null; }
}

/* what the drawing and the bars need of each hand in view (canvas px; read-only) */
export function lightHandsView(){
  const now=nowMs(), W=canvas.width, H=canvas.height, out=[];
  for(const k in HANDS){ const S=HANDS[k], lm=S.lm; if(!lm || now-S.seen>WATCHDOG_MS) continue;
    const tip=FINGER_TIPS[S.pinch && S.oct>=0 ? S.oct : 0]||8;
    out.push({ key:k, x:sx((lm[4].x+lm[tip].x)/2, W), y:sy((lm[4].y+lm[tip].y)/2, H), pinch:!!S.pinch, play:noteHand(k), finger: S.pinch && S.oct>=0 ? S.oct : -1,
      zone:S.zone, slot:S.slot, deg:S.deg, oct:S.regOct, fing:{ ...(S.fing||{}) }, lm }); }
  return out;
}
