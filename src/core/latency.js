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
   for the audio thread), the master path's own delay inside the audio graph (SND-F1b: 0 with our limiter, 6 ms with the browser's), the
   audio buffer and the output device. A part that is unknown (NaN) is left out and named in `missing`. */
export function handToSound(parts){
  const order=['camera','detect','gestures','quantumWait','graph','base','output'];
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

/* ---------- LAT1b ---------- */
/* Waiting for the next camera frame: a hand moves at a random moment between two frames, so on average half a frame interval passes
   before the camera even takes the picture that shows it. NaN when the frame rate is unknown. */
export const frameWaitMs=fps=> Number.isFinite(fps)&&fps>0 ? 500/fps : NaN;
/* The second total: hand → sound including that wait (the first total stays as it was) */
export const withFrameWait=(ms, wait)=> Number.isFinite(ms)&&Number.isFinite(wait) ? ms+wait : NaN;
/* LAT1b fix: a rate (per second) from [time ms, counter] samples — first to last; NaN with fewer than two or no time between */
export function rateOf(samples){
  if(!samples || samples.length<2) return NaN;
  const a=samples[0], b=samples[samples.length-1], dt=(b[0]-a[0])/1000;
  return dt>0 ? (b[1]-a[1])/dt : NaN;
}
/* How many timestamps (ms) fall within the last minute before `now` */
export const perMinute=(times, now)=> times.reduce((n,t)=>n+(t>now-60e3&&t<=now?1:0), 0);
/* Long tasks [{t, ms, cause}] split at camStart + STARTUP_MS: «startup» (everything before, incl. page load) and «while playing» (only the
   last minute). Each part: count, the longest and its cause ('' when the browser gave none). */
export const STARTUP_MS=10000;
export function splitLongTasks(tasks, camStart, now){
  const cut=Number.isFinite(camStart) ? camStart+STARTUP_MS : -Infinity, part=xs=>{ let w=null; for(const x of xs) if(!w||x.ms>w.ms) w=x;
    return { n:xs.length, maxMs:w?w.ms:0, cause:w&&w.cause||'' }; };
  return { startup:part(tasks.filter(x=>x.t<cut)), playing:part(tasks.filter(x=>x.t>=cut && x.t>now-60e3)) };
}
/* WebGL renderer strings of software rasterisers (no graphics processor behind the page) */
export const SOFT_GL=/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;
export const isSoftwareGL=(renderer, caveat)=> caveat===true || SOFT_GL.test(renderer||'');
