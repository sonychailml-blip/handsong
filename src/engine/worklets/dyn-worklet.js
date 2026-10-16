/* SND-F1 — DYNAMICS on the audio thread: one processor 'dyn', two modes (processorOptions.mode).
   'comp'  — feed-forward compressor, stereo-linked (the louder channel drives both), soft knee, attack/release on the gain reduction in dB
             (branching peak detector), makeup gain. Parameters thr, ratio, knee (dB), att, rel (s), makeup (dB).
   'limit' — safety peak limiter: instant attack, the peak held for `hold` (s; one bass period keeps the gain from rippling inside a
             waveform — far less distortion, still no delay), then release `rel`, ceiling `ceil` (dBFS); the output never exceeds the ceiling.
   ⛳ ZERO LOOKAHEAD: output sample n depends only on input samples ≤ n — no delay line, no added latency (an impulse comes out on the same
   sample). ⛳ DETERMINISTIC: plain arithmetic per sample, no randomness, no timers — the same input gives the same output in a live
   AudioContext and in an OfflineAudioContext (frozen = live). `on` (0/1) crossfades to an exact bypass over 10 ms (at 0 the output IS the
   input, sample for sample). Our own code from published methods (core/dsp.js names them); every parameter is k-rate.
   processorOptions.keep: true for the engine's permanent nodes (master, chain modules); probes create nodes that may end.
   processorOptions.report (limit): posts { red } — the deepest gain reduction (dB, ≤ 0) of the last ≈ 50 ms — for the mixer's master strip. */
import { compCurveDb, dynCoef, DYN_GLUE, DYN_LIMIT } from '../../core/dsp.js';

const dB=x=>20*Math.log10(x), lin=d=>Math.pow(10, d/20);
class Dyn extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    const k=(name, def, min, max)=>({ name, defaultValue:def, minValue:min, maxValue:max, automationRate:'k-rate' });
    return [ k('thr',DYN_GLUE.thr,-80,0), k('ratio',DYN_GLUE.ratio,1,40), k('knee',DYN_GLUE.knee,0,48), k('att',DYN_GLUE.att,0.0001,1),
             k('rel',DYN_GLUE.rel,0.005,5), k('makeup',DYN_GLUE.makeup,-24,36), k('ceil',DYN_LIMIT.ceil,-24,0), k('hold',DYN_LIMIT.hold,0,0.2), k('on',1,0,1) ];
  }
  constructor(o){
    super();
    const p=o&&o.processorOptions||{};
    this.mode= p.mode==='limit' ? 'limit' : 'comp';
    this.keep=!!p.keep;
    this.report=!!p.report; this.gMin=1; this.blocks=0;
    this.y=0;     // comp: smoothed gain reduction (dB, ≥ 0)
    this.env=0;   // limit: peak envelope (linear)
    this.hc=0;    // limit: samples left in the hold
    this.m=null;  // bypass crossfade position 0..1 (null until the first block: starts where `on` is, no ramp at birth)
  }
  process(inputs, outputs, P){
    const inp=inputs[0], out=outputs[0];
    if(!inp || !inp.length){ for(const c of out) c.fill(0); this.y=0; this.env=0; this.hc=0; return this.keep; }
    const L=inp[0], R=inp[1]||inp[0], oL=out[0], oR=out[1]||out[0], n=oL.length, sr=sampleRate;
    const on=P.on[0]>=0.5 ? 1 : 0;
    if(this.m===null) this.m=on;
    if(this.m===0 && on===0){ oL.set(L); if(oR!==oL) oR.set(R); this.y=0; this.env=0; this.hc=0; return true; }   // exact bypass
    const step=1/(0.010*sr);
    if(this.mode==='limit'){
      const c=lin(P.ceil[0]), aR=dynCoef(P.rel[0], sr), H=Math.round(P.hold[0]*sr);
      let env=this.env, hc=this.hc, m=this.m;
      for(let i=0;i<n;i++){
        const l=L[i], r=R[i], pk=Math.max(Math.abs(l), Math.abs(r));
        if(pk>=env){ env=pk; hc=H; }                  // instant attack; a new peak restarts the hold
        else if(hc>0) hc--;                           // hold the peak…
        else env= Math.max(pk, env*aR);               // …then release exponentially
        const g= env>c ? c/env : 1; if(g<this.gMin) this.gMin=g;
        let wl=l*g, wr=r*g;
        wl= wl>c ? c : wl<-c ? -c : wl; wr= wr>c ? c : wr<-c ? -c : wr;   // rounding guard: never above the ceiling
        if(m!==on){ m+= on>m ? step : -step; if(m>1) m=1; if(m<0) m=0; }
        oL[i]= m===1 ? wl : l+(wl-l)*m; if(oR!==oL) oR[i]= m===1 ? wr : r+(wr-r)*m;
      }
      this.env=env; this.hc=hc; this.m=m;
      if(this.report && ++this.blocks*n>=0.05*sr){ this.port.postMessage({ red:dB(this.gMin) }); this.gMin=1; this.blocks=0; }
      return true;
    }
    const T=P.thr[0], Ra=P.ratio[0], W=P.knee[0], mk=P.makeup[0], aA=dynCoef(P.att[0], sr), aR=dynCoef(P.rel[0], sr);
    let y=this.y, m=this.m;
    for(let i=0;i<n;i++){
      const l=L[i], r=R[i], pk=Math.max(Math.abs(l), Math.abs(r));
      const x= pk>1e-9 ? dB(pk) : -180;
      const red=x-compCurveDb(x, T, Ra, W);           // the static reduction wanted now (dB)
      y= red>y ? aA*y+(1-aA)*red : aR*y+(1-aR)*red;   // attack while it grows, release while it falls
      const g=lin(mk-y);
      if(m!==on){ m+= on>m ? step : -step; if(m>1) m=1; if(m<0) m=0; }
      const wl=l*g, wr=r*g;
      oL[i]= m===1 ? wl : l+(wl-l)*m; if(oR!==oL) oR[i]= m===1 ? wr : r+(wr-r)*m;
    }
    this.y=y; this.m=m;
    return true;
  }
}
registerProcessor('dyn', Dyn);
