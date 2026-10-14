/* LAT1 — latency bookkeeping. CORE: pure JavaScript — no DOM, no Web Audio, no camera, no network; runs unchanged in node (the data
   runner's row «LAT1 latency stats (core)»). The browser side that feeds it lives in src/latmeter.js. */

export const LAT_N=240;   // samples kept per stage (≈ 4–8 s of frames)

/* A meter: per stage a ring of the last n samples (ms). Non-finite samples are ignored. */
export function makeMeter(n=LAT_N){
  const S=new Map();
  return {
    add(stage, ms){
      if(!Number.isFinite(ms)) return;
      let r=S.get(stage); if(!r){ r={ buf:new Float64Array(n), i:0, len:0, total:0 }; S.set(stage,r); }
      r.buf[r.i]=ms; r.i=(r.i+1)%n; if(r.len<n) r.len++; r.total++;
    },
    stats(stage){ const r=S.get(stage); return r ? statsOf(Array.from(r.buf.subarray(0,r.len)), r.total) : statsOf([]); },
    count(stage){ const r=S.get(stage); return r ? r.total : 0; },
    stages(){ return [...S.keys()]; },
    reset(){ S.clear(); },
  };
}

/* mean, nearest-rank percentiles, jitter = p95 − p5, max; n = samples ever added (the window keeps the last ones) */
export function statsOf(xs, total=xs.length){
  if(!xs.length) return { n:total, kept:0, mean:NaN, p5:NaN, p50:NaN, p95:NaN, jitter:NaN, max:NaN };
  const s=xs.slice().sort((a,b)=>a-b), q=p=>s[Math.min(s.length-1, Math.max(0, Math.ceil(p*s.length)-1))];
  const mean=s.reduce((a,b)=>a+b,0)/s.length;
  return { n:total, kept:s.length, mean, p5:q(0.05), p50:q(0.5), p95:q(0.95), jitter:q(0.95)-q(0.05), max:s[s.length-1] };
}

/* Hand → sound estimate from the stage means (ms): camera capture → our loop, detection, gestures, half an audio quantum (the mean wait
   for the audio thread), the audio buffer and the output device. A part that is unknown (NaN) is left out and named in `missing`. */
export function handToSound(parts){
  const order=['camera','detect','gestures','quantumWait','base','output'];
  let ms=0; const missing=[];
  for(const k of order){ const v=parts[k]; if(Number.isFinite(v)) ms+=v; else missing.push(k); }
  return { ms, missing };
}

/* No API names Bluetooth: an output latency of 100 ms or more, or an output device named like a wireless headset. */
export const BT_MS=100;
export const BT_LABEL=/bluetooth|airpods|\bbuds\b|hands-?free|a2dp|\bbt\b/i;
export function looksBluetooth({ outputMs, label }={}){
  return (Number.isFinite(outputMs) && outputMs>=BT_MS) || BT_LABEL.test(label||'');
}
