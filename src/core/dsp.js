/* SND-F1 — pure DSP formulas shared by the engine (audio.js), the dynamics worklet (dyn-worklet.js) and the probes. CORE: plain
   JavaScript — no DOM, no Web Audio, no network; runs unchanged in node (the data runner's row «SND-F1 Night forest IR (core)»).
   Written from published methods: the Web Audio specification (convolver normalisation), Giannoulis, Massberg & Reiss, «Digital Dynamic
   Range Compressor Design — A Tutorial and Analysis», JAES 2012 (soft-knee gain computer, branching peak detector). */

/* A small seeded generator (mulberry32, public domain): the same seed gives the same numbers in every context and at every rate. */
export function seeded(seed){
  let a=seed>>>0;
  return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}

/* ---------- «Night forest» — a convolution room from a generated noise impulse response ----------
   Stereo, independent noise per channel (one fixed seed each), envelope (1 − i/len)^2.6 over the WHOLE chosen length; the wet return 0.55
   and the note send 0.8 are the prototype's gains. Three room lengths (SND-F1b): Short 0.85 s, Medium 1.7 s, Long 3.4 s (the prototype) —
   the same recipe and seeds, the envelope recomputed for each length (a shorter room, not a cut tail). A pure function of rate and length. */
export const FOREST={ sec:3.4, rooms:[0.85, 1.7, 3.4], room:1.7, pow:2.6, wet:0.55, send:0.8, seeds:[0x4E464F31, 0x4E464F32] };
/* RUN 7 (C4b, Calm plan §4.2): DEPTH → THE FOREST — the prototype's distance colouring, d = 0 near … 1 far: the send to the room
   0.5 + 0.8·d (0.5 … 1.3), the dry level 1 − 0.55·d, a darkening lowpass 900 + 8000·(1 − d)^1.5 Hz. Calm's own effect «Forest depth»
   (modules/effects/forestdepth.js) plays it; Full's Night forest is unchanged (its send stays 0…1). Node row «CALM depth curve (core)». */
export const CALM_DEPTH=Object.freeze({ send0:0.5, sendK:0.8, dryK:0.55, lp0:900, lpK:8000, lpPow:1.5 });
export function calmDepth(d){ const x=Math.max(0, Math.min(1, +d||0)), C=CALM_DEPTH;
  return { send:C.send0+C.sendK*x, dry:1-C.dryK*x, lp:C.lp0+C.lpK*Math.pow(1-x, C.lpPow) }; }
/* the nearest offered room length (in log space: 0.85 · 1.7 · 3.4 are octave steps) */
export const forestRoom=sec=> FOREST.rooms.reduce((a,b)=> Math.abs(Math.log(b/sec))<Math.abs(Math.log(a/sec)) ? b : a);
export function forestIR(rate, sec=FOREST.sec){
  const len=Math.round(rate*sec);
  return FOREST.seeds.map(sd=>{ const r=seeded(sd), d=new Float32Array(len);
    for(let i=0;i<len;i++) d[i]=(r()*2-1)*Math.pow(1-i/len, FOREST.pow);
    return d; });
}
/* The convolver's normalisation (Web Audio spec, «normalize = true»): 1/RMS power × −58 dB × 44100/rate (× 0.5 for true stereo). Applied
   by us to the buffer (the node runs with normalize = false), so the level is the same in every browser and offline. */
export function irNormScale(chs, rate){
  let p=0; for(const d of chs) for(let i=0;i<d.length;i++) p+=d[i]*d[i];
  p=Math.sqrt(p/(chs.length*chs[0].length));
  if(!Number.isFinite(p) || p<0.000125) p=0.000125;
  let s=0.00125/p;
  if(rate) s*=44100/rate;
  if(chs.length===4) s*=0.5;
  return s;
}
/* FNV-1a over the bytes of Float32 arrays → 8 hex digits (identity of a generated buffer) */
export function f32Hash(chs){
  let h=0x811c9dc5;
  for(const d of chs){ const b=new Uint8Array(d.buffer, d.byteOffset, d.byteLength); for(let i=0;i<b.length;i++){ h^=b[i]; h=Math.imul(h,0x01000193)>>>0; } }
  return h.toString(16).padStart(8,'0');
}

/* ---------- Dynamics: the static curve of the compressor (levels in dB) ----------
   x → y: below the knee y = x; inside a knee of width W centred on the threshold T the quadratic blend; above it T + (x − T)/R. */
export function compCurveDb(x, T, R, W){
  const d=x-T;
  if(2*d < -W) return x;
  if(W>0 && 2*Math.abs(d)<=W) return x+(1/R-1)*(d+W/2)*(d+W/2)/(2*W);
  return T+d/R;
}
/* Steady gain (dB) the compressor applies to a constant level x (dB): makeup minus the reduction. */
export const compGainDb=(x, p)=> p.makeup-(x-compCurveDb(x, p.thr, p.ratio, p.knee));
/* The presets. GLUE: tuned by offline renders (SND-F1, 2026-10-15) to come close to the prototype's built-in compressor (threshold −18 dB,
   ratio 3, knee 30, attack 3 ms, release 250 ms, plus the browser's own makeup) on a Firefly + Night forest phrase: residual −34 dB re the
   signal, same loudness, worst 50-ms envelope difference ≈ 1.2 dB — with NO lookahead (the built-in delays 6 ms). The built-in knee starts
   AT its threshold and spans 30 dB, so ours sits higher with a narrow knee; the error surface is flat around it. LIMIT: the master's
   safety ceiling. */
export const DYN_GLUE={ thr:-12, ratio:3, knee:6, att:0.01, rel:0.25, makeup:0.9 };
export const DYN_LIMIT={ ceil:-1, rel:0.05, hold:0 };
/* SND-F1b: the MASTER's limiter (replaces the browser's compressor-limiter): a 40-ms hold and 150-ms release keep the gain from rippling
   inside bass waveforms (distortion 8 dB over the ceiling, measured: 30 Hz −149, 55 Hz −47, 110 Hz −66 dB; the old browser limiter
   −40 / −48 / −54; hold 0 / release 50 ms −23 / −27 / −32). MASTER_MAKEUP_DB: the old limiter's own makeup on everything below ≈ −6 dBFS
   (measured +2.31 dB) — kept as a plain gain so nothing gets quieter. */
export const DYN_MASTER={ ceil:-1, rel:0.15, hold:0.04 };
export const MASTER_MAKEUP_DB=2.31;
/* one-pole coefficient for a time constant (s) at a sample rate */
export const dynCoef=(sec, rate)=> sec>0 ? Math.exp(-1/(sec*rate)) : 0;
