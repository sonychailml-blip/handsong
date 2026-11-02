/* NIGHT-1: the measuring page's processors, dev only.
   hr-load: a calibrated ballast on the audio thread (work per quantum in ms of this thread's own arithmetic) + the gaps between its calls (the dropout evidence where the browser has no counter).
   hr-denorm: the CONTROL of the tail profile: the same arithmetic on ordinary numbers and on subnormal ones; if the thread does not flush them, the slowdown must show.
   hr-modal: the lab's cheaper strike: one node computing every mode as a two-pole resonator. */
class HrLoad extends AudioWorkletProcessor {
  constructor(){ super(); this.perMs=0; this.iters=0; this.sink=0.5; this.calib=0; this.stop=false; this.t=0; this.max=0; this.late=0; this.calls=0; this.limit=30;
    this.port.onmessage=e=>{ const d=e.data||{}; if(d.stop) this.stop=true; if(d.calib) this.calib=d.calib; if(Number.isFinite(d.ms)) this.iters=Math.round(d.ms*this.perMs);
      if(d.limit) this.limit=d.limit; if(d.read){ this.port.postMessage({ read:true, max:this.max, late:this.late, calls:this.calls }); this.max=0; this.late=0; this.calls=0; } }; }
  burn(n){ let x=this.sink; for(let i=0;i<n;i++) x=Math.sqrt(x+i%7+1)*0.5; this.sink=x%1; }
  process(){ if(this.stop) return false;
    const now=Date.now(); if(this.t){ const g=now-this.t; if(g>this.max) this.max=g; if(g>this.limit) this.late++; } this.t=now; this.calls++;
    if(this.calib>0){ this.calib--; let n=0; const t0=Date.now(); while(Date.now()-t0<20){ this.burn(2000); n+=2000; } this.perMs=n/20; this.port.postMessage({ perMs:this.perMs }); this.t=0; return true; }
    if(this.iters>0) this.burn(this.iters);
    return true; }
}
registerProcessor('hr-load', HrLoad);

class HrDenorm extends AudioWorkletProcessor {
  constructor(o){ super(); const p=o.processorOptions||{}; this.y=p.sub ? 1e-310 : 1e-10; this.sub=!!p.sub; this.a=0.999999; this.sent=false; }
  process(){ let y=this.y; const a=this.a, base=this.sub ? 1e-310 : 1e-10; for(let i=0;i<128*20;i++){ y=y*a; if(y<base*0.5) y=base; } this.y=y; if(!this.sent){ this.sent=true; this.port.postMessage({ y }); } return true; }
}
registerProcessor('hr-denorm', HrDenorm);

/* modes: [{ f, g, d, a, t }] → y = coupled two-pole resonators; each mode ends itself under `floor` */
class HrModal extends AudioWorkletProcessor {
  constructor(o){ super(); const p=o.processorOptions||{}, sr=sampleRate; this.m=(p.modes||[]).map(x=>{ const w=2*Math.PI*x.f/sr, r=Math.exp(-6.907755/(x.d*sr)); return { c:r*Math.cos(w), s:r*Math.sin(w), re:0, im:0, g:x.g, at:Math.round((x.t||0)*sr), done:false }; }); this.n=0; }
  process(_i, out){ const o=out[0][0], M=this.m, N=o.length, n0=this.n;
    for(let k=0;k<M.length;k++){ const m=M[k]; if(m.done) continue; let re=m.re, im=m.im; const c=m.c, s=m.s, g=m.g, at=m.at;
      for(let i=0;i<N;i++){ if(n0+i===at){ im+=g; } const a=c*re-s*im; im=s*re+c*im; re=a; o[i]+=im; }
      m.re=re; m.im=im; if(n0>at && re*re+im*im<1e-14) m.done=true; }
    this.n=n0+N; for(let c=1;c<out[0].length;c++) out[0][c].set(o); return true; }
}
registerProcessor('hr-modal', HrModal);
