/* LATENCY LAB — the pure part (runs in node: tools/lab/latency/check.mjs). The microphone hears the real clap and then the lab's click; the time
   between their onsets is the whole way from the gesture to the sound (the microphone's own delay is the same for both and cancels).
   The click is a short chirp, found by normalised correlation; the clap is the loudest burst before it, timed at its first strong sample. */

/* the click: a 20 ms up-chirp 1 → 5 kHz (where laptop speakers are loud) under a sine² window. LIGHT-12b: it was 4 ms — too little energy on
   the founder's laptop (most clicks not found) and too close to a clap for the correlation to tell them apart */
export function makeClick(sr, ms=20, f0=1000, f1=5000){
  const n=Math.round(sr*ms/1000), T=n/sr, b=new Float32Array(n);
  for(let i=0;i<n;i++){ const t=i/sr, w=Math.sin(Math.PI*i/(n-1))**2; b[i]=0.95*w*Math.sin(2*Math.PI*(f0*t+(f1-f0)*t*t/(2*T))); }
  return b;
}
/* the best |normalised correlation| of the click k in x over lags [a, b): where the click starts and how alike (0…1) */
export function findClick(x, k, a, b){
  const n=k.length; let kk=0; for(let i=0;i<n;i++) kk+=k[i]*k[i]; kk=Math.sqrt(kk);
  a=Math.max(0, a|0); b=Math.min(b|0, x.length-n+1);
  let e=0; for(let i=a;i<a+n && i<x.length;i++) e+=x[i]*x[i];
  let best=0, at=-1;
  for(let l=a;l<b;l++){
    let s=0; for(let i=0;i<n;i++) s+=x[l+i]*k[i];
    const c=Math.abs(s)/(Math.sqrt(Math.max(e,0))*kk+1e-12); if(c>best){ best=c; at=l; }
    e+=(l+n<x.length ? x[l+n]*x[l+n] : 0)-x[l]*x[l];
  }
  return { at, score:best };
}
/* median of |x| over [a, b) (every 4th sample: the noise floor) */
export function medianAbs(x, a, b){ const v=[]; for(let i=Math.max(0,a);i<Math.min(b,x.length);i+=4) v.push(Math.abs(x[i])); v.sort((p,q)=>p-q); return v.length ? v[v.length>>1] : 0; }
/* the clap: the loudest sample in [a, b); its onset = the earliest sample within 20 ms before that peak at or above max(0.3·peak, 8·noise) */
export function findClap(x, a, b, sr){
  a=Math.max(0,a|0); b=Math.min(x.length,b|0);
  let p=0, pi=-1; for(let i=a;i<b;i++){ const v=Math.abs(x[i]); if(v>p){ p=v; pi=i; } }
  const noise=medianAbs(x, a, b);
  if(pi<0 || p<10*noise) return { at:-1, peak:p, noise, why:'clap' };
  const th=Math.max(0.3*p, 8*noise), lim=Math.max(a, pi-Math.round(0.02*sr)); let on=pi;
  for(let i=pi;i>=lim;i--) if(Math.abs(x[i])>=th) on=i;
  if(on-a<Math.round(0.005*sr)) return { at:-1, peak:p, noise, why:'edge' };   // the loudest sound is cut by the window's start: not this clap
  return { at:on, peak:p, noise };
}
/* one measurement: x = microphone samples, play = the index in x where the click was started.
   The click is searched in [play, play+600 ms) (heard after it was played; the microphone's own delay may put the CLAP in that span too — the
   long chirp tells them apart); the clap in the 800 ms before the click (both carry the same microphone delay). */
export const AN=Object.freeze({ clickAfterMs:600, clapBeforeMs:800, gapMs:4, minScore:0.25, minLoud:6, minMs:15 });
/* the click heard in [a, b): alike enough AND loud enough over the floor (white noise alone reaches a likeness ≈ 0.3 somewhere in 400 ms) */
export function clickHeard(x, k, a, b){
  const c=findClick(x, k, a, b); if(c.at<0) return { ...c, loud:0, ok:false };
  let p=0; for(let i=c.at;i<c.at+k.length && i<x.length;i++) p=Math.max(p, Math.abs(x[i]));
  const loud=p/(medianAbs(x, a, b)||1e-9);
  return { ...c, loud, ok:c.score>=AN.minScore && loud>=AN.minLoud };
}
export function analyse(x, sr, k, play){
  const ms=v=>Math.round(v/sr*10000)/10;
  const c=clickHeard(x, k, play, play+Math.round(AN.clickAfterMs/1000*sr));
  if(!c.ok) return { ok:false, why:'click', score:Math.round(c.score*100)/100, loud:Math.round(c.loud*10)/10 };
  const cl=findClap(x, c.at-Math.round(AN.clapBeforeMs/1000*sr), c.at-Math.round(AN.gapMs/1000*sr), sr);
  if(cl.at<0) return { ok:false, why:cl.why, score:Math.round(c.score*100)/100, roundtrip:ms(c.at-play) };
  const total=ms(c.at-cl.at);
  if(total<AN.minMs) return { ok:false, why:'short', score:c.score, total };
  return { ok:true, total, roundtrip:ms(c.at-play), score:Math.round(c.score*100)/100, snr:Math.round(cl.peak/(cl.noise||1e-9)) };
}

/* ---- the gestures (landmarks: MediaPipe's 21 points per hand, x and y 0…1 of the frame; aspect = width / height) ---- */
export const palm=lm=>{ let x=0, y=0; for(const i of [0,5,9,13,17]){ x+=lm[i].x; y+=lm[i].y; } return { x:x/5, y:y/5 }; };
export const handSize=(lm, aspect)=>Math.hypot((lm[9].x-lm[0].x)*aspect, lm[9].y-lm[0].y);
/* CLAP: d = the distance between the two palm centres in hand sizes. Fires when d < near (the palms meet), or when one of two hands that were
   closer than `lost` vanishes (MediaPipe often loses a hand at the moment of contact). Fires once; armed again only when d > far. */
export const CLAP=Object.freeze({ near:0.9, lost:2.5, far:2.0 });
export function clapNew(){ return { armed:true, prevN:0, prevD:Infinity, d:null }; }
export function clapStep(st, hands, aspect, cfg=CLAP){
  const n=hands.length; let fire=null;
  if(n>=2){
    const a=palm(hands[0]), b=palm(hands[1]), s=(handSize(hands[0],aspect)+handSize(hands[1],aspect))/2;
    const d=Math.hypot((a.x-b.x)*aspect, a.y-b.y)/(s||1e-9); st.d=d;
    if(st.armed && d<cfg.near) fire='near'; else if(!st.armed && d>cfg.far) st.armed=true;
    st.prevD=d;
  } else {
    st.d=null;
    if(st.armed && st.prevN>=2 && st.prevD<cfg.lost) fire='lost';
  }
  st.prevN=n; if(fire){ st.armed=false; } return fire;
}
/* STRIKE: one hand comes down onto a surface. rest = the lowest point of the hand (its largest y) while it lay on that surface (measured once).
   Fires when the hand's lowest point comes within `margin` of rest; armed again once it is lifted above rest − lift. */
export const TAP=Object.freeze({ margin:0.03, lift:0.12 });
export const lowY=lm=>{ let y=0; for(const p of lm) if(p.y>y) y=p.y; return y; };
export function tapNew(rest=null){ return { armed:true, rest, y:null }; }
export function tapStep(st, hands, cfg=TAP){
  if(!hands.length || st.rest==null){ st.y=null; return null; }
  const y=lowY(hands[0]); st.y=y;
  if(st.armed && y>=st.rest-cfg.margin){ st.armed=false; return 'strike'; }
  if(!st.armed && y<st.rest-cfg.lift) st.armed=true;
  return null;
}
export const median=v=>{ const s=[...v].filter(x=>x!=null && isFinite(x)).sort((a,b)=>a-b); if(!s.length) return null; const m=s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
