/* AUDIO-4 — THE BED'S ELECTRIC PIANO IN ONE NODE («rain-ep»; loaded by rooms/rain/lofi.js). The founder found the dropouts with the audio lab:
   the bed's sustaining piano (core's tine engine: per strike 3 oscillators + 4 gains, per voice an envelope and a panner, 96 voice chains always
   connected — up to 37 voices sounding) overloaded the audio thread. The SAME recipe, computed here in one node: per strike the record's partials
   (ratio, gain, decay: a 6-ms linear attack, an exponential decay to 0.0001, stopped decay + 50 ms later — tine.js's strike), the strike's level
   (lvl × velocity), each voice's envelope and pan from the very AudioParam calls lofi.js made (forwarded as messages: cancel, setValue, linear
   ramp, setTarget; pan setValue), with the browser's own arithmetic where it matters for the null test — the oscillator's phase (its table's
   rate scale in single precision, the sub-sample start) and the parameter timeline (a setTarget starts from the value of the frame before it).
   A voice without a sounding strike costs nothing; a late message (its strike already begun) starts from the right phase. */
const F=Math.fround, TAU=2*Math.PI, SR=sampleRate;
const SIZE= SR<=24000 ? 2048 : SR<=88200 ? 4096 : 16384, RS=F(SIZE/SR);   // the browser oscillator's table size and rate scale
const QUIET=1e-7;   // (a) a voice or partial whose level at this node's output stays under this over a quantum (−140 dB; the bed's output is about 20 dB lower still) is not computed
const tStart=e=>Math.ceil(e.t*SR-1e-9);   // the first frame an event applies to
/* a parameter's timeline (the subset lofi.js uses) */
class Line{
  constructor(def){ this.def=def; this.ev=[]; }
  add(e){ const ev=this.ev; let i=ev.length; while(i>0 && ev[i-1].t>e.t) i--; if(i>0 && ev[i-1].t===e.t && ev[i-1].k===e.k) ev[i-1]=e; else ev.splice(i, 0, e); this.fix(); }
  cancel(t){ const ev=this.ev; let i=0; while(i<ev.length && ev[i].t<t) i++; ev.length=i; this.fix(); }
  /* the value at frame n from the events before index upto */
  at(n, upto=this.ev.length){ const ev=this.ev, tau=n/SR; let j=-1; for(let i=0;i<upto;i++){ if(ev[i].k==='l' ? ev[i].t<=tau : ev[i].f<=n) j=i; else break; }
    const nx= j+1<upto ? ev[j+1] : null;
    if(nx && nx.k==='l'){ if(j<0) return this.def; const e=ev[j], v1= e.k==='T' ? e.s0 : e.v; return v1+(nx.v-v1)*(tau-e.t)/(nx.t-e.t); }
    if(j<0) return this.def; const e=ev[j]; return e.k==='T' ? e.v+(e.s0-e.v)*Math.exp(-(tau-e.t)/e.tau) : e.v; }
  /* each setTarget's starting value: the value of the frame before it */
  fix(){ const ev=this.ev; for(let i=0;i<ev.length;i++){ const e=ev[i]; e.f=tStart(e); if(e.k==='T') e.s0=this.at(e.f-1, i); } }
  /* drop what lies wholly behind a setValue that has begun */
  prune(n){ const ev=this.ev; let k=-1; for(let i=0;i<ev.length;i++) if(ev[i].k==='v' && ev[i].f<=n) k=i; if(k>0){ ev.splice(0, k); this.fix(); } }
}
class RainEp extends AudioWorkletProcessor{
  constructor(o){ super(); const p=o.processorOptions||{}; this.tabs=p.tabs; this.lvl=p.lvl; const D=p.dbg||{}; this.det=Math.pow(2, (D.cents||0)/1200); this.quiet= D.quiet!=null ? D.quiet : QUIET; this.V=[]; const N=p.n||0;   // dbg: the row's CONTROL (a detune) and the skip's level
    for(let v=0;v<this.tabs.length;v++) for(let i=0;i<N;i++) this.V.push({ tab:this.tabs[v], env:new Line(0), pan:new Line(0), st:[] });
    this.envB=new Float64Array(128); this.acc=new Float64Array(128); this.peak=0; this.strikes=0;
    this.port.onmessage=e=>{ const d=e.data; if(d && d.stats){ this.port.postMessage({ stats:true, peak:this.peak, strikes:this.strikes, sounding:this.V.reduce((a, x)=>a+x.st.length, 0) }); if(d.reset) this.peak=0; return; } if(d && d.sync!=null){ this.port.postMessage({ synced:d.sync }); return; } if(Array.isArray(d)) for(const op of d) this.op(op); }; }   // sync: every message before it is applied (an offline render waits for it)
  op(o){ const V=this.V[o[0]]; if(!V) return; const k=o[1];
    if(k==='c') V.env.cancel(o[2]);
    else if(k==='v') V.env.add({ k:'v', v:F(o[2]), t:o[3] });
    else if(k==='l') V.env.add({ k:'l', v:F(o[2]), t:o[3] });
    else if(k==='T') V.env.add({ k:'T', v:F(o[2]), t:o[3], tau:o[4] });
    else if(k==='p') V.pan.add({ k:'v', v:F(Math.max(-1, Math.min(1, o[2]))), t:o[3] });
    else if(k==='s') this.strike(V, o[2], o[3], o[4]); }
  /* one strike of the voice's table at time t, fundamental f0, velocity vel — tine.js's oscillators and their gains */
  strike(V, t, f0, vel){ f0*=this.det; const g=F(this.lvl*vel), parts=[], tSR=t*SR, n1=Math.ceil(tSR-1e-9); this.strikes++;
    for(const [ratio, a0, dec] of V.tab){ const fr=F(f0*ratio), incr=F(fr*RS), a=F(a0), th0=TAU*((n1-tSR)*fr*RS)/SIZE, dth=TAU*incr/SIZE;
      parts.push({ t, a, t1:t+0.006, t2:t+dec, lo:F(0.0001), n1, nE:Math.ceil((t+dec+0.05)*SR-1e-9), th0, dth, c:0, s:0, n:-1, cr:Math.cos(dth), sr:Math.sin(dth) }); }
    V.st.push({ g, parts, end:Math.max(...parts.map(p=>p.nE)) }); }
  /* the envelope over frames n0 … n0+N−1 into env (segment by segment: constant, linear ramp, setTarget by its recurrence); returns its largest value */
  envFill(Ln, n0, N, env){ const ev=Ln.ev; let i=0, mx=0;
    while(i<N){ const n=n0+i; let j=-1; for(let q=0;q<ev.length;q++){ if(ev[q].k==='l' ? ev[q].t<=n/SR : ev[q].f<=n) j=q; else break; }
      const nx= j+1<ev.length ? ev[j+1] : null, stop= nx ? Math.min(N, Math.max(i+1, (nx.k==='l' ? Math.ceil(nx.t*SR-1e-9) : nx.f)-n0)) : N;
      if(nx && nx.k==='l' && j>=0){ const e=ev[j], v1= e.k==='T' ? e.s0 : e.v, k=(nx.v-v1)/(nx.t-e.t); for(;i<stop;i++){ const v=v1+k*((n0+i)/SR-e.t); env[i]=v; if(v>mx) mx=v; } }
      else if(j>=0 && ev[j].k==='T'){ const e=ev[j], d=Math.exp(-1/(SR*e.tau)); let x=(e.s0-e.v)*Math.exp(-((n0+i)/SR-e.t)/e.tau); for(;i<stop;i++){ const v=e.v+x; env[i]=v; if(Math.abs(v)>mx) mx=Math.abs(v); x*=d; } }
      else { const v= j<0 ? Ln.def : ev[j].v; for(;i<stop;i++) env[i]=v; if(Math.abs(v)>mx) mx=Math.abs(v); } }
    return mx; }
  process(_in, outs){ const out=outs[0], L=out[0], R=out[1]||out[0], N=L.length, n0=currentFrame, env=this.envB, acc=this.acc; let sounding=0;
    for(const V of this.V){ if(!V.st.length) continue;
      for(let i=V.st.length-1;i>=0;i--) if(V.st[i].end<=n0) V.st.splice(i, 1);
      if(!V.st.length) continue; sounding+=V.st.length;
      V.env.prune(n0); V.pan.prune(n0);
      const emax=this.envFill(V.env, n0, N, env); if(emax*this.lvl*1.5<this.quiet) continue;   // (a) the whole voice far below hearing: skipped (its strikes resume in phase)
      acc.fill(0); let any=false;
      for(const S of V.st) for(const p of S.parts){ const a=Math.max(n0, p.n1), b=Math.min(n0+N, p.nE); if(b<=a) continue;
        const ta=a/SR, amax= ta<p.t1 ? p.a : ta<p.t2 ? p.a*Math.pow(p.lo/p.a, (ta-p.t1)/(p.t2-p.t1)) : p.lo;
        if(amax*S.g*emax<this.quiet) continue;   // (a) this partial far below hearing over the quantum
        any=true; if(p.n!==a){ const th=p.th0+(a-p.n1)*p.dth; p.c=Math.cos(th); p.s=Math.sin(th); }   // (re)place the phasor exactly at frame a
        let c=p.c, s=p.s, amp=amax, m=0, seg=-1; const cr=p.cr, sr=p.sr, g=S.g;
        for(let n=a;n<b;n++){ const tau=n/SR;
          if(tau<p.t1){ amp= tau<p.t ? 0 : p.a*(tau-p.t)/(p.t1-p.t); }
          else if(tau<p.t2){ if(seg!==2){ seg=2; amp=p.a*Math.pow(p.lo/p.a, (tau-p.t1)/(p.t2-p.t1)); m=Math.pow(p.lo/p.a, 1/((p.t2-p.t1)*SR)); } else amp*=m; }
          else amp=p.lo;
          acc[n-n0]+=g*amp*s; const c2=c*cr-s*sr; s=s*cr+c*sr; c=c2; }
        p.c=c; p.s=s; p.n=b; }
      if(!any) continue;
      /* no pan change inside this quantum: one pair of gains */
      const pe=V.pan.ev; if(!pe.some(e=>e.f>n0 && e.f<n0+N)){ const x=(V.pan.at(n0)*0.5+0.5)*Math.PI/2, gl=Math.cos(x), gr=Math.sin(x); for(let i=0;i<N;i++){ const y=acc[i]*env[i]; L[i]+=y*gl; if(R!==L) R[i]+=y*gr; } }
      else for(let i=0;i<N;i++){ const x=(V.pan.at(n0+i)*0.5+0.5)*Math.PI/2, y=acc[i]*env[i]; L[i]+=y*Math.cos(x); if(R!==L) R[i]+=y*Math.sin(x); } }
    if(sounding>this.peak) this.peak=sounding;
    return true; }
}
registerProcessor('rain-ep', RainEp);
