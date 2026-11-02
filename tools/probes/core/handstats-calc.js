/* CORE-1 CP1: the sums of the guided measuring page (handstats.html). Pure: no DOM, camera or model; runs in node (row «CAL0 hand measuring (tool)»).
   A sample is { t (ms), hand: null | { size, wx, wy, pinch, out } }. The size is today's depth reading, dist(lm0, lm9) on raw coordinates. */
import { dist } from '../../../core/gestures/features.js';

export const WIN_MS=500, TAU_S=0.205, EMA_A=0.15, CANDIDATES=Object.freeze([0.04,0.06,0.08,0.12]), FORMAT='handsong/handstats';
const num=(v,d=5)=> Number.isFinite(v) ? +v.toFixed(d) : null;
const sorted=a=>[...a].sort((x,y)=>x-y);
/* the q-quantile with linear interpolation; null on an empty list */
export function quant(a,q){ if(!a.length) return null; const s=sorted(a), p=(s.length-1)*q, i=Math.floor(p), f=p-i; return s[i]+(i+1<s.length ? f*(s[i+1]-s[i]) : 0); }
export const median=a=>quant(a,0.5);
export function robustSigma(a){ if(!a.length) return null; const m=median(a); return 1.4826*median(a.map(x=>Math.abs(x-m))); }
const sigmaOf=a=>{ if(a.length<2) return null; const m=a.reduce((x,y)=>x+y,0)/a.length; return Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1)); };

/* one camera result → a sample's hand: the largest hand in view (the playing hand held up to the camera) */
export function handOf(landmarks){
  let best=null, bs=-1;
  for(const lm of landmarks||[]){ const s=dist(lm[0],lm[9]); if(s>bs){ bs=s; best=lm; } }
  if(!best) return null;
  const palm=[0,5,9,13,17].map(i=>best[i]), pr=dist(best[4],best[8])/(dist(best[0],best[5])||1e-6);
  return { size:bs, wx:best[0].x, wy:best[0].y, pinch:pr, out:palm.some(p=>p.x<0||p.x>1||p.y<0||p.y>1) };
}
/* today's EMA per frame; the time-based filter of the calibrated path */
export function emaSeries(xs,a=EMA_A){ const o=[]; let y=null; for(const x of xs){ y= y==null ? x : y+a*(x-y); o.push(y); } return o; }
export function tauSeries(ts,xs,tau=TAU_S){ const o=[]; let y=null, t0=null; xs.forEach((x,i)=>{ if(y==null) y=x; else y+=(1-Math.exp(-Math.max(0,ts[i]-t0)/1000/tau))*(x-y); t0=ts[i]; o.push(y); }); return o; }

/* every full window of WIN_MS: the size's spread over its median and the wrist's travel */
export function windows(seen){
  const out=[]; let a=0;
  for(let b=0;b<seen.length;b++){ while(seen[b].t-seen[a].t>WIN_MS) a++;
    if(seen[b].t-seen[a].t<WIN_MS*0.8 || b-a+1<3) continue;
    const w=seen.slice(a,b+1), z=w.map(s=>s.hand.size), xs=w.map(s=>s.hand.wx), ys=w.map(s=>s.hand.wy);
    out.push({ spread:(Math.max(...z)-Math.min(...z))/median(z), travel:Math.hypot(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys)) }); }
  return out;
}
/* one measured step → its numbers */
export function analyse(samples){
  const seen=samples.filter(s=>s.hand), dur=samples.length>1 ? samples[samples.length-1].t-samples[0].t : 0;
  const gapOf=()=>{ let g=0, last=samples.length?samples[0].t:0; for(const s of samples){ if(s.hand){ g=Math.max(g,s.t-last); last=s.t; } } if(samples.length) g=Math.max(g,samples[samples.length-1].t-last); return g; };
  const z=seen.map(s=>s.hand.size), ts=seen.map(s=>s.t), W=windows(seen), still={};
  for(const c of CANDIDATES) still[c]= W.length ? num(W.filter(w=>w.spread<=c).length/W.length,3) : null;
  const skip=a=>a.slice(Math.min(15,Math.floor(a.length/3)));   // the filters' start is not noise
  return { n:samples.length, seen:seen.length, ms:Math.round(dur), fps:num(dur>0 ? (samples.length-1)/(dur/1000) : 0,1), gapMs:Math.round(gapOf()),
    size:num(median(z)), sigma:num(robustSigma(z)), p05:num(quant(z,0.05)), p95:num(quant(z,0.95)),
    spreadP50:num(quant(W.map(w=>w.spread),0.5),4), spreadP95:num(quant(W.map(w=>w.spread),0.95),4), travelP50:num(quant(W.map(w=>w.travel),0.5),4), travelP95:num(quant(W.map(w=>w.travel),0.95),4), still,
    sigmaEma:num(sigmaOf(skip(emaSeries(z)))), sigmaTau:num(sigmaOf(skip(tauSeries(ts,z)))), pinch:num(median(seen.map(s=>s.hand.pinch)),3),
    out:seen.length ? num(seen.filter(s=>s.hand.out).length/seen.length,3) : null };
}
/* the whole report: each step's numbers, then what they mean for a calibration between the near and far points */
export function report(steps, info){
  const a={}; for(const k of Object.keys(steps)) a[k]=analyse(steps[k]);
  const n=a.near, f=a.far, span= n&&f&&n.size!=null&&f.size!=null ? n.size-f.size : null;
  const noise=n&&f ? Math.max(n.sigmaTau??0, f.sigmaTau??0) : null;
  return { format:FORMAT, version:1, info, steps:a, derived:{ span:num(span), ratio: span!=null ? num(f.size/n.size,3) : null, gain: span>0 ? num(0.19/span,2) : null, valueNoise: span>0 ? num(noise/span,4) : null,
    pinchShift: a.pinch&&a.open&&a.pinch.size!=null&&a.open.size!=null ? num((a.pinch.size-a.open.size)/a.open.size,3) : null } };
}
