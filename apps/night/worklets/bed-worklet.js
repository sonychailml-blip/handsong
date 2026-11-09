/* NIGHT-4: THE MUSIC BED v2 — one AudioWorklet processor «night-bed» holding every voice of the bed and its own reverb (design:
   docs/night/design/NIGHT-3-rooms/PLAN.md §4b; the law apps/night/pure/bed2.js, the driver apps/night/bed2.js). Written from published
   methods: wavetable oscillators with band-limited tables; the state-variable filter in its trapezoidal form (Zavalishin, «The Art of VA
   Filter Design»); formant resonators for vowels (Fant's source-filter model; textbook F1/F2 values); a feedback delay network reverb
   (Jot & Chaigne 1991; Stautner & Puckette 1982) with Hadamard mixing and Schroeder allpass diffusion; a 4-tap half-band interpolator.
   - HALF RATE: the bed is soft and dark (nothing it plays needs more than ≈ 10 kHz), so every voice and the room run at rate / div (div 2,
     the tables band-limited for that rate) and the output is interpolated up once, with a 4-tap half-band midpoint (−0.2 dB at 5 kHz).
     Measured: it halves the bed's cost (NIGHT-4).
   - Events come as batches of { k, t (AudioContext seconds), … } posted ahead by the driver (rule #15) — or all at once in processorOptions
     (an offline render: deterministic). Notes start at their frame (to a half-rate sample); parameters move in the block of their frame, smoothed.
   - Every Hz comes from the driver, priced from the live view (rule #2). Noise and start phases are seeded: the same events give the same sound.
   - Nothing heavy on the audio thread: the wavetables come made (processorOptions.tables). Idle (nothing sounding, the room's tail gone):
     nothing is computed. Asleep (the bed parked): nothing either. The output feeds the master's input; the hand's effects never reach it. */
const TAU=2*Math.PI, BL=128;
/* the room: eight lines (frames at 48 kHz, scaled to the synthesis rate), four input allpasses, lines 0 and 5 slowly modulated */
const LINES=[2441, 2903, 3343, 3821, 4271, 4751, 5303, 6067], DIFF=[227, 331, 497, 677], DIFF_G=0.62, MOD_MS=0.3, MOD_HZ=[0.071, 0.113];
const FREE=1e-3;   // a voice is free once its level is 60 dB under its own peak (under the mix and the room, nothing is heard of it)
const HAND=1.8;    // s: a loop voice's last note fades this fast once its next note starts
const eq=p=>[Math.cos((p+1)*Math.PI/4), Math.sin((p+1)*Math.PI/4)];
const p2=n=>{ let s=1; while(s<n) s<<=1; return s; };
/* the state-variable filter's coefficients (g = tan(π f / fs), k = 1/Q) */
function svf(c, f, q, fs){ const g=Math.tan(Math.PI*Math.min(f, 0.45*fs)/fs), k=1/q; c.k=k; c.a1=1/(1+g*(g+k)); c.a2=g*c.a1; c.a3=g*c.a2; }

class NightBed extends AudioWorkletProcessor{
  constructor(opt){
    super();
    const o=(opt && opt.processorOptions)||{}, T=o.tables, div=o.div===1 ? 1 : 2, fs=sampleRate/div;
    this.div=div; this.fs=fs; this.BH=BL/div; this.bd=BL/sampleRate;   // the synthesis rate, its block length, a block's duration
    this.N=T.size; this.sine=T.sine; this.warm=T.warm; this.saw=T.saw; this.zones=T.zones; this.R=o.recipe;
    let s=(o.seed>>>0)||1; this.rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; };
    this.q=[]; this.sleep=false; this.idle=true; this.quietBlocks=0;
    const BH=this.BH; this.dL=new Float32Array(BH); this.dR=new Float32Array(BH); this.rv=new Float32Array(BH); this.nz=new Float32Array(BH); this.nz2=new Float32Array(BH);
    this.xL=new Float32Array(BH+3); this.xR=new Float32Array(BH+3);   // the upsampler's input with its three samples of history
    const par=(v, tc)=>({ v, t:v, k:this.kb(tc) });
    this.P={ level:par(0, 1.2), breath:par(0, 2), cpad:par(0.4, 10), cloop:par(0.4, 10), air:par(0, 8), rt60:par(5.5, 0.5), damp:par(3200, 0.5), wet:par(0.6, 0.5) };
    this.lvl=0; this.bg=1;   // the gains of the last block's end (the next block ramps from them)
    const pools=o.pools||{ pad:8, loop:12, glass:6 };
    this.pad=Array.from({ length:pools.pad }, ()=>this.voice()); this.loop=Array.from({ length:pools.loop }, ()=>this.voice()); this.glass=Array.from({ length:pools.glass }, ()=>this.voice());
    this.gr={ on:false, i0:0, i1:0, i2:0, t0:0, t1:0, t2:0, p0:0, p1:0, p2:0, g:0, gPrev:0, gt:0, gk:0, set:false };
    this.air=[0, 1].map(k=>({ c:{ k:1, a1:0, a2:0, a3:0 }, ic1:0, ic2:0, ph:this.rnd()*TAU, w:TAU*(0.021+0.013*k)*this.bd, base:this.R.air.bands[k] }));
    this.rev=this.room(fs);
    this.st={ blocks:0, idle:0, max:{ pad:0, loop:0, glass:0 }, sum:{ pad:0, loop:0, glass:0 }, dropped:0, late:0 };
    this.port.onmessage=e=>this.msg(e.data);
    if(o.events) this.msg(o.events);
  }
  kb(tc){ return 1-Math.exp(-this.bd/Math.max(1e-4, tc)); }   // a per-block smoothing step for time constant tc
  ks(tc){ return 1-Math.exp(-1/(Math.max(1e-4, tc)*this.fs)); }   // a per-sample step at the synthesis rate
  /* one voice, every field made here (one shape for all: b0–b2 the base increments, a1/a2 and b1s/b2s the two filters' states) */
  voice(){ return { on:false, rel:false, hold:-1, env:0, e1:0, tgt:0, k:0, cr:0, amp:0, gl:0, gr:0, send:0, n:0, tab:null, hz:0,
    p0:0, p1:0, p2:0, i0:0, i1:0, i2:0, b0:0, b1:0, b2:0, start:0, lv:-1, l1:0, l2:0, vp:0, vw:0, vd:0, c0:0, c1:0, len:1, age:0, pal:'a',
    fa:{ k:1, a1:0, a2:0, a3:0 }, fb:{ k:1, a1:0, a2:0, a3:0 }, a1:0, a2:0, b1s:0, b2s:0, g0:0, g1:0, g2:0, d0:1, d1:1, d2:1, next:null }; }
  room(fs){
    const sc=fs/48000, L=LINES.map(x=>Math.round(x*sc)|1), md=MOD_MS*fs/1000, S=p2(Math.max(...L)+Math.ceil(md)*2+4), D=DIFF.map(x=>Math.round(x*sc)|1), AS=p2(Math.max(...D)+1);
    const preN=p2(Math.round(0.12*fs));
    return { L, S, m:S-1, buf:new Float32Array(S*8), w:0, z:new Float64Array(8), g:new Float64Array(8), gc:0, md,
      mp:[this.rnd()*TAU, this.rnd()*TAU], mw:MOD_HZ.map(h=>TAU*h*this.bd),
      D, AS, ab:new Float32Array(AS*4), aw:0, pre:new Float32Array(preN), pm:preN-1, pw:0, pd:Math.round((this.R.reverb.pre||0.04)*fs), hp:0, hc:1-Math.exp(-TAU*90/fs), peak:0 };
  }
  msg(list){
    if(!Array.isArray(list)) list=[list];
    for(const e of list){
      if(e.k==='sleep'){ this.sleep=!!e.v; continue; }
      if(e.k==='stats'){ this.port.postMessage({ stats:JSON.parse(JSON.stringify(this.st)) }); continue; }
      const f=Math.round(e.t*sampleRate), q=this.q; let i=q.length; while(i>0 && q[i-1].f>f) i--; q.splice(i, 0, { f, e });
    }
  }
  zone(hz){ const Z=this.zones; for(let z=0; z<Z.length; z++) if(Z[z]>=hz*1.03) return this.saw[z]; return this.saw[Z.length-1]; }
  /* start a pad tone, a loop note or a glass note on voice v at synthesis-rate offset off */
  start(v, e, off, layer){
    const fs=this.fs, N=this.N, c=x=>Math.pow(2, x/1200), R=this.R;
    v.on=true; v.rel=false; v.start=off; v.env=0; v.e1=0; v.amp=e.amp; v.tgt=e.amp; v.k=this.kb(e.a/4.5); v.hz=e.hz; v.next=null; v.age=0; v.lv=e.lv==null ? -1 : e.lv;
    const [gl, gr]=eq(e.pan||0); v.gl=gl; v.gr=gr; v.send=e.send||0; v.l1=0; v.l2=0;
    v.vp=this.rnd()*TAU; v.vw=TAU*(0.09+0.18*this.rnd())*this.bd; v.vd=0.0009;
    if(layer==='glass'){ const G=R.glass, inc=e.hz*N/fs; v.tab=this.sine; v.n=3;
      v.i0=inc*G.ratios[0]; v.i1=inc*G.ratios[1]; v.i2=inc*G.ratios[2]; v.p0=this.rnd()*N; v.p1=this.rnd()*N; v.p2=this.rnd()*N;
      const ok=k=>e.hz*G.ratios[k]<0.45*fs ? G.gains[k] : 0, tc=e.d/3.2; v.g0=ok(0); v.g1=ok(1); v.g2=ok(2);
      v.d0=Math.exp(-1/(tc*fs)); v.d1=Math.exp(-1/(tc/1.8*fs)); v.d2=Math.exp(-1/(tc/2.6*fs)); v.tgt=1; v.hold=-1; return; }
    v.tab=this.zone(e.hz*c(Math.abs(e.det||0)));
    if(layer==='pad'){ const d=e.det||0, n=v.n=e.osc===2 ? 2 : 3, inc=e.hz*N/fs; v.hold=-1;
      if(n===3){ v.i0=inc*c(-d); v.i1=inc; v.i2=inc*c(d); } else { v.i0=inc*c(-d/2); v.i1=inc*c(d/2); v.i2=0; }
      v.b0=v.i0; v.b1=v.i1; v.b2=v.i2; v.p0=this.rnd()*N; v.p1=this.rnd()*N; v.p2=this.rnd()*N; return; }
    /* a loop note: attack, hold, release; its vowel or bloom moves from c0 to c1 over the note */
    const d=e.det||0, inc=e.hz*N/fs; v.n=2; v.i0=inc*c(-d/2); v.i1=inc*c(d/2); v.b0=v.i0; v.b1=v.i1; v.b2=0; v.p0=this.rnd()*N; v.p1=this.rnd()*N;
    v.hold=Math.round((e.a+e.h)*fs)+off; v.cr=this.kb(e.r/4.5); v.c0=e.c0||0; v.c1=e.c1||0; v.len=Math.max(1, (e.a+e.h+e.r)*fs); v.pal=e.pal==='b' ? 'b' : 'a';
    v.a1=0; v.a2=0; v.b1s=0; v.b2s=0;
  }
  free(pool){ for(const v of pool) if(!v.on) return v; return null; }
  apply(x, off){
    const e=x.e, R=this.R;
    switch(e.k){
      case 'on': { const v=this.pad[e.slot]; if(!v) return; this.idle=false;
        if(v.on && v.env>v.amp*1e-3){ v.next={ e }; v.rel=true; v.tgt=0; v.k=this.kb(0.012); } else this.start(v, e, off, 'pad'); return; }
      case 'off': { const v=this.pad[e.slot]; if(!v || !v.on) return; v.next=null; v.rel=true; v.tgt=0; v.k=this.kb(e.r/4.5); return; }
      case 'loop': case 'glass': { const pool= e.k==='loop' ? this.loop : this.glass, v=this.free(pool); if(!v){ this.st.dropped++; return; } this.idle=false;
        /* a loop voice sings one note at a time: its last note hands over in HAND s (a legato crossfade under the new note's attack) */
        if(e.k==='loop' && e.lv!=null){ const kh=this.kb(HAND/4.5); for(const u of pool) if(u.on && u.lv===e.lv && (!u.rel || u.k<kh)){ u.rel=true; u.tgt=0; u.hold=-1; u.k=u.cr=kh; } }
        this.start(v, e, off, e.k); return; }
      case 'ground': { const G=this.gr, N=this.N, fs=this.fs, b=R.ground.beat; G.t0=e.root*N/fs; G.t1=(e.root+b)*N/fs; G.t2=e.fifth*N/fs;
        if(!G.set){ G.i0=G.t0; G.i1=G.t1; G.i2=G.t2; G.set=true; G.p0=this.rnd()*N; G.p1=this.rnd()*N; G.p2=this.rnd()*N; }
        G.gt=e.on ? 1 : 0; G.gk=this.kb(e.tc||1); if(e.on){ G.on=true; this.idle=false; } return; }
      case 'p': { const p=this.P[e.name]; if(!p) return; p.t=e.v; p.k=this.kb(e.tc||0.05); if(e.name==='air' && e.v>0) this.idle=false; return; }
      /* NIGHT-3 stage 5 part 2: another room's recipe (sent while the bed is silent, before its first chord there) */
      case 'recipe': { this.R=e.recipe; if(this.rev) this.rev.pd=Math.round((this.R.reverb.pre||0.04)*this.fs); return; }
      case 'flush': { const L=e.layers||[], f=x.f; this.q=this.q.filter(y=>!(y.f>=f && L.includes(y.e.k)));
        for(const name of L){ const pool= name==='loop' ? this.loop : name==='glass' ? this.glass : null; if(!pool) continue;
          for(const v of pool) if(v.on){ const r=e.r||2;
            if(name==='glass'){ const d=Math.exp(-1/(r/3.2*this.fs)); v.d0=Math.min(v.d0, d); v.d1=Math.min(v.d1, d); v.d2=Math.min(v.d2, d); }
            else { v.rel=true; v.tgt=0; v.hold=-1; v.k=v.cr=this.kb(r/4.5); } } } return; }
    }
  }
  process(inputs, outputs){
    const out=outputs[0], L=out[0], Rr=out[1]||out[0], div=this.div, f0=currentFrame, f1=f0+BL, BH=this.BH;
    while(this.q.length && this.q[0].f<f1){ const x=this.q.shift(); if(x.f<f0) this.st.late++; this.apply(x, Math.max(0, x.f-f0)/div|0); }
    if(this.sleep) return true;
    /* parameters, one step per block */
    const P=this.P; for(const k in P){ const p=P[k]; p.v+=(p.t-p.v)*p.k; }
    const G=this.gr; G.g+=(G.gt-G.g)*G.gk; if(G.on && G.gt===0 && G.g<1e-6){ G.on=false; G.g=0; }
    if(this.idle){ this.st.idle++; return true; }
    const dL=this.dL, dR=this.dR, rv=this.rv; dL.fill(0); dR.fill(0); rv.fill(0);
    const bg0=this.bg, bg1=Math.pow(10, P.breath.v/20); this.bg=bg1;
    /* noise for the breath of the vowels and the air (seeded) */
    const nz=this.nz, nz2=this.nz2, airOn=P.air.v>1e-6; for(let i=0;i<BH;i++) nz[i]=this.rnd()*2-1; if(airOn) for(let i=0;i<BH;i++) nz2[i]=this.rnd()*2-1;
    let any=this.gnd(dL, dR, rv, bg0, bg1);
    let n=this.pads(dL, dR, rv, bg0, bg1); this.count('pad', n); any=any||n>0;
    n=this.loops(dL, dR, rv, nz); this.count('loop', n); any=any||n>0;
    n=this.glasses(dL, dR, rv); this.count('glass', n); any=any||n>0;
    if(airOn){ this.airs(dL, dR, rv, nz, nz2, P.air.v); any=true; }
    const peak=this.reverb(rv, dL, dR, P.wet.v);
    /* the bus level, ramped across the block (no zipper), then up to the output rate */
    const lv0=this.lvl, lv1=P.level.v; this.lvl=lv1;
    if(div===1){ for(let i=0;i<BL;i++){ const g=lv0+(lv1-lv0)*(i+1)/BL; L[i]=dL[i]*g; Rr[i]=dR[i]*g; } }
    else { const xL=this.xL, xR=this.xR; xL[0]=xL[BH]; xL[1]=xL[BH+1]; xL[2]=xL[BH+2]; xR[0]=xR[BH]; xR[1]=xR[BH+1]; xR[2]=xR[BH+2];
      for(let i=0;i<BH;i++){ const g=lv0+(lv1-lv0)*(i+1)/BH; xL[i+3]=dL[i]*g; xR[i+3]=dR[i]*g; }
      for(let k=0;k<BH;k++){ L[2*k]=xL[k+1]; Rr[2*k]=xR[k+1]; L[2*k+1]=(9*(xL[k+1]+xL[k+2])-xL[k]-xL[k+3])*0.0625; Rr[2*k+1]=(9*(xR[k+1]+xR[k+2])-xR[k]-xR[k+3])*0.0625; } }
    this.st.blocks++;
    if(!any && peak<1e-7){ if(++this.quietBlocks>8){ this.idle=true; this.quietBlocks=0; } } else this.quietBlocks=0;
    return true;
  }
  count(k, n){ const s=this.st; s.sum[k]+=n; if(n>s.max[k]) s.max[k]=n; }
  /* the ground: the tonic twice (a slow beat) and the fifth, warm partials; the breath swells it */
  gnd(dL, dR, rv, bg0, bg1){
    const G=this.gr; if(!G.on && G.g<1e-7) return false;
    const T=this.warm, N=this.N, BH=this.BH, kg=this.kb(0.3), A=this.R.ground, amp=A.amp, f5=A.fifth, send=A.send;
    G.i0+=(G.t0-G.i0)*kg; G.i1+=(G.t1-G.i1)*kg; G.i2+=(G.t2-G.i2)*kg;
    let p0=G.p0, p1=G.p1, p2=G.p2; const i0=G.i0, i1=G.i1, i2=G.i2, gA=G.gPrev, gB=G.g; G.gPrev=gB;
    for(let i=0;i<BH;i++){ let j=p0|0, s=T[j]+(p0-j)*(T[j+1]-T[j]); j=p1|0; s+=T[j]+(p1-j)*(T[j+1]-T[j]); j=p2|0; s=s*0.5+f5*(T[j]+(p2-j)*(T[j+1]-T[j]));
      p0+=i0; if(p0>=N) p0-=N; p1+=i1; if(p1>=N) p1-=N; p2+=i2; if(p2>=N) p2-=N;
      const u=(i+1)/BH, y=s*amp*(gA+(gB-gA)*u)*(bg0+(bg1-bg0)*u); dL[i]+=y*0.707; dR[i]+=y*0.707; rv[i]+=y*send; }
    G.p0=p0; G.p1=p1; G.p2=p2; return true;
  }
  /* the pad: a bowed-string ensemble — 2–3 detuned band-limited saws, a two-pole low-pass whose colour drifts; the breath swells it */
  pads(dL, dR, rv, bg0, bg1){
    const N=this.N, fs=this.fs, BH=this.BH, br=this.P.cpad.v; let n=0;
    for(const v of this.pad){ if(!v.on) continue; n++;
      const m=1+v.vd*Math.sin(v.vp); v.vp+=v.vw; const i0=v.b0*m, i1=v.b1*m, i2=v.b2*m;
      const fc=Math.min(0.42*fs, v.hz*(1.6+7*Math.pow(br, 1.5))), lc=1-Math.exp(-TAU*fc/fs), T=v.tab, n3=v.n===3;
      /* the envelope moves once per block (a two-pole step), its gain with the breath ramped across the block */
      const eA=v.env; v.e1+=v.k*(v.tgt-v.e1); v.env+=v.k*(v.e1-v.env); const gA=eA*bg0, dg=(v.env*bg1-gA)/BH, gl=v.gl, gr=v.gr, sd=v.send, nrm= n3 ? 0.36 : 0.5;
      let p0=v.p0, p1=v.p1, p2=v.p2, l1=v.l1, l2=v.l2, g=gA+dg*v.start;
      for(let i=v.start;i<BH;i++){ let j=p0|0, s=T[j]+(p0-j)*(T[j+1]-T[j]); j=p1|0; s+=T[j]+(p1-j)*(T[j+1]-T[j]);
        p0+=i0; if(p0>=N) p0-=N; p1+=i1; if(p1>=N) p1-=N;
        if(n3){ j=p2|0; s+=T[j]+(p2-j)*(T[j+1]-T[j]); p2+=i2; if(p2>=N) p2-=N; }
        l1+=lc*(s*nrm-l1); l2+=lc*(l1-l2); g+=dg; const y=l2*g; dL[i]+=y*gl; dR[i]+=y*gr; rv[i]+=y*sd; }
      v.p0=p0; v.p1=p1; v.p2=p2; v.l1=l1; v.l2=l2; v.start=0; const env=v.env, e1=v.e1;
      if(v.rel && env<v.amp*FREE && e1<v.amp*FREE){ v.on=false; if(v.next){ const x=v.next; v.next=null; this.start(v, x.e, 0, 'pad'); } } }
    return n;
  }
  /* the loops: palette «voices» (two detuned saws and a breath of noise through two formant resonators that move between vowels over the
     note) or «horns» (two detuned saws, a low-pass that blooms with the note's swell) */
  loops(dL, dR, rv, nz){
    const N=this.N, fs=this.fs, BH=this.BH, V=this.R.voices, col=this.P.cloop.v-0.5; let n=0;
    for(const v of this.loop){ if(!v.on) continue; n++;
      if(!v.rel && v.hold>=0){ v.hold-=BH; if(v.hold<0){ v.rel=true; v.tgt=0; v.k=v.cr; } }
      const m=1+v.vd*Math.sin(v.vp); v.vp+=v.vw; const i0=v.b0*m, i1=v.b1*m, T=v.tab, u=Math.min(1, v.age/v.len); v.age+=BH;
      const eA=v.env; v.e1+=v.k*(v.tgt-v.e1); v.env+=v.k*(v.e1-v.env); const de=(v.env-eA)/BH, gl=v.gl, gr=v.gr, sd=v.send;
      let p0=v.p0, p1=v.p1, env=eA+de*v.start;
      if(v.pal==='a'){
        const A=V.a, pos=Math.max(0, Math.min(1, v.c0+(v.c1-v.c0)*u+0.35*col))*(A.vowels.length-1), w=Math.min(A.vowels.length-2, pos|0), fr=pos-w;
        const F1=A.vowels[w][0]+(A.vowels[w+1][0]-A.vowels[w][0])*fr, F2=A.vowels[w][1]+(A.vowels[w+1][1]-A.vowels[w][1])*fr;
        svf(v.fa, F1, A.q[0], fs); svf(v.fb, F2, A.q[1], fs);
        const ka=v.fa.k, a1=v.fa.a1, a2=v.fa.a2, a3=v.fa.a3, kb=v.fb.k, b1=v.fb.a1, b2=v.fb.a2, b3=v.fb.a3, brth=A.breath, body=A.body;
        let s1=v.a1, s2=v.a2, t1=v.b1s, t2=v.b2s;
        for(let i=v.start;i<BH;i++){ let j=p0|0, s=T[j]+(p0-j)*(T[j+1]-T[j]); j=p1|0; s+=T[j]+(p1-j)*(T[j+1]-T[j]); s=s*0.5+nz[i]*brth;
          p0+=i0; if(p0>=N) p0-=N; p1+=i1; if(p1>=N) p1-=N;
          let x3=s-s2, x1=a1*s1+a2*x3, x2=s2+a2*s1+a3*x3; s1=2*x1-s1; s2=2*x2-s2; const fA=ka*x1;
          x3=s-t2; x1=b1*t1+b2*x3; x2=t2+b2*t1+b3*x3; t1=2*x1-t1; t2=2*x2-t2; const fB=kb*x1;
          env+=de; const y=(fA*0.9+fB*0.55+s*body)*env; dL[i]+=y*gl; dR[i]+=y*gr; rv[i]+=y*sd; }
        v.a1=s1; v.a2=s2; v.b1s=t1; v.b2s=t2;
      } else {
        const B=V.b, sw=v.amp>0 ? v.env/v.amp : 0, fc=v.hz*(B.bloom[0]+(B.bloom[1]-B.bloom[0])*sw*(0.75+0.5*(col+0.5))*(0.6+0.4*(v.c0+(v.c1-v.c0)*u)));
        svf(v.fa, fc, B.q, fs); const a1=v.fa.a1, a2=v.fa.a2, a3=v.fa.a3; let s1=v.a1, s2=v.a2;
        for(let i=v.start;i<BH;i++){ let j=p0|0, s=T[j]+(p0-j)*(T[j+1]-T[j]); j=p1|0; s+=T[j]+(p1-j)*(T[j+1]-T[j]); s*=0.5;
          p0+=i0; if(p0>=N) p0-=N; p1+=i1; if(p1>=N) p1-=N;
          const x3=s-s2, x1=a1*s1+a2*x3, x2=s2+a2*s1+a3*x3; s1=2*x1-s1; s2=2*x2-s2;
          env+=de; const y=x2*env; dL[i]+=y*gl; dR[i]+=y*gr; rv[i]+=y*sd; }
        v.a1=s1; v.a2=s2;
      }
      v.p0=p0; v.p1=p1; v.start=0;
      if(v.rel && v.env<v.amp*FREE && v.e1<v.amp*FREE) v.on=false; }
    return n;
  }
  /* glass: three near-harmonic sines, a soft attack (never struck), each partial fading on its own; nearly all of it goes to the room */
  glasses(dL, dR, rv){
    const N=this.N, BH=this.BH, T=this.sine; let n=0;
    for(const v of this.glass){ if(!v.on) continue; n++;
      const eA=v.env*v.amp; v.e1+=v.k*(1-v.e1); v.env+=v.k*(v.e1-v.env); const de=(v.env*v.amp-eA)/BH;
      let p0=v.p0, p1=v.p1, p2=v.p2, g0=v.g0, g1=v.g1, g2=v.g2, env=eA+de*v.start; const i0=v.i0, i1=v.i1, i2=v.i2, d0=v.d0, d1=v.d1, d2=v.d2, gl=v.gl, gr=v.gr, sd=v.send;
      for(let i=v.start;i<BH;i++){ let j=p0|0, s=g0*(T[j]+(p0-j)*(T[j+1]-T[j])); j=p1|0; s+=g1*(T[j]+(p1-j)*(T[j+1]-T[j])); j=p2|0; s+=g2*(T[j]+(p2-j)*(T[j+1]-T[j]));
        p0+=i0; if(p0>=N) p0-=N; p1+=i1; if(p1>=N) p1-=N; p2+=i2; if(p2>=N) p2-=N; g0*=d0; g1*=d1; g2*=d2;
        env+=de; const y=s*env; dL[i]+=y*gl; dR[i]+=y*gr; rv[i]+=y*sd; }
      v.p0=p0; v.p1=p1; v.p2=p2; v.g0=g0; v.g1=g1; v.g2=g2; v.start=0;
      if(g0<FREE && g1<FREE) v.on=false; }
    return n;
  }
  /* the air: two noise bands, slowly wandering, one on each side */
  airs(dL, dR, rv, nz, nz2, lvl){
    const fs=this.fs, BH=this.BH, A=this.R.air;
    for(let side=0; side<2; side++){ const b=this.air[side]; b.ph+=b.w; svf(b.c, b.base*(1+A.sway*Math.sin(b.ph)), A.q, fs);
      const k=b.c.k, a1=b.c.a1, a2=b.c.a2, a3=b.c.a3, src= side ? nz2 : nz, D= side ? dR : dL;
      let s1=b.ic1, s2=b.ic2; for(let i=0;i<BH;i++){ const x3=src[i]-s2, x1=a1*s1+a2*x3, x2=s2+a2*s1+a3*x3; s1=2*x1-s1; s2=2*x2-s2; const y=k*x1*lvl; D[i]+=y; rv[i]+=y*0.5; }
      b.ic1=s1; b.ic2=s2; }
  }
  /* the room: high-pass, pre-delay, four allpasses, eight lines (damping and decay in the loop, Hadamard mixing); two lines slowly
     modulated against metallic ringing; the decay follows rt60 and the damping, both smoothed (no click when a preset changes them) */
  reverb(rv, dL, dR, wet){
    const Q=this.rev, fs=this.fs, P=this.P, BH=this.BH;
    if(Q.gc!==P.rt60.v){ Q.gc=P.rt60.v; for(let k=0;k<8;k++) Q.g[k]=Math.pow(10, -3*Q.L[k]/(Q.gc*fs)); }
    const dc=1-Math.exp(-TAU*P.damp.v/fs), buf=Q.buf, S=Q.S, m=Q.m, hc=Q.hc, pre=Q.pre, pm=Q.pm, pd=Q.pd, c=Math.SQRT1_2/2, inK=0.35*c*2, outK=wet*0.5;
    const L0=Q.L[0], L1=Q.L[1], L2=Q.L[2], L3=Q.L[3], L4=Q.L[4], L5=Q.L[5], L6=Q.L[6], L7=Q.L[7], G=Q.g, g0=G[0], g1=G[1], g2=G[2], g3=G[3], g4=G[4], g5=G[5], g6=G[6], g7=G[7];
    const ab=Q.ab, AS=Q.AS, am=AS-1, D0=Q.D[0], D1=Q.D[1], D2=Q.D[2], D3=Q.D[3], o1=AS, o2=2*AS, o3=3*AS, S1=S, S2=2*S, S3=3*S, S4=4*S, S5=5*S, S6=6*S, S7=7*S;
    Q.mp[0]+=Q.mw[0]; Q.mp[1]+=Q.mw[1]; const mo0=Q.md*(1+Math.sin(Q.mp[0])), mo1=Q.md*(1+Math.sin(Q.mp[1]));
    let w=Q.w, aw=Q.aw, pw=Q.pw, hp=Q.hp, peak=0, z=Q.z, z0=z[0], z1=z[1], z2=z[2], z3=z[3], z4=z[4], z5=z[5], z6=z[6], z7=z[7];
    for(let i=0;i<BH;i++){
      let x=rv[i]; hp+=hc*(x-hp); x-=hp;
      pre[pw]=x; x=pre[(pw-pd)&pm]; pw=(pw+1)&pm;
      let d=ab[(aw-D0)&am], v=x+DIFF_G*d; ab[aw]=v; x=d-DIFF_G*v;
      d=ab[o1+((aw-D1)&am)]; v=x+DIFF_G*d; ab[o1+aw]=v; x=d-DIFF_G*v;
      d=ab[o2+((aw-D2)&am)]; v=x+DIFF_G*d; ab[o2+aw]=v; x=d-DIFF_G*v;
      d=ab[o3+((aw-D3)&am)]; v=x+DIFF_G*d; ab[o3+aw]=v; x=d-DIFF_G*v; aw=(aw+1)&am;
      /* the two modulated lines read between frames */
      const r0=w+S-L0-mo0, j0=r0|0, f0=r0-j0, k0=j0&m, y0=buf[k0]+f0*(buf[(k0+1)&m]-buf[k0]);
      const r5=w+S-L5-mo1, j5=r5|0, f5=r5-j5, k5=j5&m, y5=buf[S5+k5]+f5*(buf[S5+((k5+1)&m)]-buf[S5+k5]);
      z0+=dc*(y0-z0); z1+=dc*(buf[S1+((w-L1)&m)]-z1); z2+=dc*(buf[S2+((w-L2)&m)]-z2); z3+=dc*(buf[S3+((w-L3)&m)]-z3);
      z4+=dc*(buf[S4+((w-L4)&m)]-z4); z5+=dc*(y5-z5); z6+=dc*(buf[S6+((w-L6)&m)]-z6); z7+=dc*(buf[S7+((w-L7)&m)]-z7);
      const s0=z0*g0, s1=z1*g1, s2=z2*g2, s3=z3*g3, s4=z4*g4, s5=z5*g5, s6=z6*g6, s7=z7*g7;
      const a0=s0+s1, a1=s0-s1, a2=s2+s3, a3=s2-s3, a4=s4+s5, a5=s4-s5, a6=s6+s7, a7=s6-s7;
      const b0=a0+a2, b2=a0-a2, b1=a1+a3, b3=a1-a3, b4=a4+a6, b6=a4-a6, b5=a5+a7, b7=a5-a7, xi=x*inK;
      buf[w]=(b0+b4)*c+xi; buf[S1+w]=(b1+b5)*c-xi; buf[S2+w]=(b2+b6)*c+xi; buf[S3+w]=(b3+b7)*c-xi;
      buf[S4+w]=(b0-b4)*c-xi; buf[S5+w]=(b1-b5)*c+xi; buf[S6+w]=(b2-b6)*c-xi; buf[S7+w]=(b3-b7)*c+xi;
      const oL=(s0-s2+s4-s6)*outK, oR=(s1-s3+s5-s7)*outK; dL[i]+=oL; dR[i]+=oR;
      const ab2=oL<0 ? -oL : oL; if(ab2>peak) peak=ab2;
      w=(w+1)&m; }
    z[0]=z0; z[1]=z1; z[2]=z2; z[3]=z3; z[4]=z4; z[5]=z5; z[6]=z6; z[7]=z7; Q.w=w; Q.aw=aw; Q.pw=pw; Q.hp=hp; Q.peak=peak;
    return peak;
  }
}
registerProcessor('night-bed', NightBed);
