/* NIGHT-8: THE STREAM'S MURMUR — the law and the synthesis, pure (rule #36; data row «NIGHT stream sound (app)»), run unchanged by the nature
   worklet (apps/night/worklets/nature-worklet.js) and by the listening render (tools/brook-render.mjs). No file: synthesized, endless.
   Written from published methods: a liquid sound as a stochastic sum of bubble resonances — each an exponentially decaying sinusoid whose
   pitch rises as it nears the surface (Minnaert's bubble resonance; van den Doel, «Physically based models for liquid sounds», ACM TAP 2005),
   bubbles arriving in clusters (a Poisson cluster process), over a soft broadband rush of filtered noise.
   - VOICES: a room gives a few points along its water, each { pan, w (stereo spread), gain, lp (Hz, the distance's darkening), rate (clusters
     per second), f [lo, hi] (bubble pitches), rush (the noise's share) } — the near water wide, bright and close, the far water narrow and dark.
   - FLOW: each voice's own slow random drift (an Ornstein–Uhlenbeck walk, τ a few seconds) moves its bubble rate and rush, so nothing repeats:
     there is no loop anywhere, every bubble is a new draw.
   - Seeded: the same seed and voices give the same sound (a probe compares two renders exactly). */
export const BROOK=Object.freeze({ seed:0x42524F4B, pool:40, block:64, div:2,
  flow:Object.freeze({ tau:2.6, depth:0.42, lo:0.35, hi:1.6 }),   // the flow's drift: time constant (s), its spread, its bounds
  burst:Object.freeze({ lo:1, hi:6, gap:0.014 }),                   // bubbles per cluster, mean gap inside a cluster (s)
  bubble:Object.freeze({ tau:0.016, ref:420, slope:0.9, min:0.002, max:0.032, rise:Object.freeze([0.06, 0.55]), atk:0.0007, amp:0.11, big:0.3 }),
  rush:Object.freeze({ hp:320, lp:2600, amp:0.03 }),
  light:Object.freeze({ rate:0.55, voices:3 }) });   // the Lighter mode: fewer bubbles, the nearest voices only

const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* a small seeded generator of its own (the worklet imports this file alone): xorshift32 → [0, 1) */
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const onePole=(fc, fs)=>1-Math.exp(-2*Math.PI*fc/fs);

/* null = valid voices, else one line naming the field */
export function checkBrookVoices(V){
  if(!Array.isArray(V) || !V.length || V.length>8) return 'voices: 1…8';
  for(let i=0;i<V.length;i++){ const v=V[i], at=`voices[${i}]`;
    if(!v || typeof v!=='object') return at+': an object';
    for(const k of ['pan','w','gain','lp','rate','rush']) if(typeof v[k]!=='number' || !Number.isFinite(v[k])) return `${at}.${k}: a number`;
    if(v.pan<-1 || v.pan>1) return at+'.pan: −1…1'; if(v.w<0 || v.w>1) return at+'.w: 0…1'; if(v.gain<0 || v.gain>1) return at+'.gain: 0…1';
    if(v.lp<200 || v.lp>20000) return at+'.lp: 200…20000 Hz'; if(v.rate<0 || v.rate>80) return at+'.rate: 0…80 clusters a second'; if(v.rush<0 || v.rush>1) return at+'.rush: 0…1';
    if(!Array.isArray(v.f) || v.f.length!==2 || !(v.f[0]>=80) || !(v.f[1]<=6000) || !(v.f[0]<v.f[1])) return at+'.f: [lo, hi] Hz, 80…6000'; }
  return null;
}
/* a new stream for output rate rate → its state (everything the render changes lives here). It SYNTHESISES AT rate / div (div 2: the water
   holds nothing above ≈ 4 kHz worth making; it halves the cost) and brookOut interpolates up once */
export function brookNew(rate, voices, seed=BROOK.seed, div=BROOK.div){
  const B=BROOK, fs=rate/div, r=rng(seed), pool=Array.from({ length:B.pool }, ()=>({ c:0, s:0, w:0, dw:0, a:0, k:0, env:0, at:0, cr:1, sr:0, n:0, v:0, gl:0, gr:0 }));
  const vs=voices.map((v, i)=>{ const R=rng((seed+i*7919+1)>>>0);
    return { ...v, R, flow:1, next:Math.round(R()*fs/Math.max(0.5, v.rate)), left:0, gap:0, bl:0, br:0, zl:0, zr:0, kl:onePole(v.lp, fs),
      pl:Math.cos((v.pan+1)*Math.PI/4), pr:Math.sin((v.pan+1)*Math.PI/4) }; });
  /* the rush is one stereo noise for the whole water (its lows and highs cut): each voice's share of it, by pan and spread, summed once */
  const rl=vs.reduce((a,v)=>a+v.gain*v.rush*v.pl, 0), rr=vs.reduce((a,v)=>a+v.gain*v.rush*v.pr, 0), sw=vs.reduce((a,v)=>a+v.gain*v.rush*v.w, 0)/Math.max(1e-9, vs.reduce((a,v)=>a+v.gain*v.rush, 0));
  return { fs, div, x:new Float32Array(2048), y:new Float32Array(2048), pl:0, pr:0, r, pool, live:[], free:pool.slice(), vs, light:false, sleep:false, dropped:0, made:0, t:0, kHp:onePole(B.rush.hp, fs), kLp:onePole(B.rush.lp, fs),
    kAtk:1-Math.exp(-1/(B.bubble.atk*fs)), rush:{ l:rl, r:rr, w:sw, h1:0, h2:0, n1:0, n2:0, flow:1 } };
}
/* the flow's drift, once per block: an OU step towards 1 (bounded) */
function flowStep(st, v){ const F=BROOK.flow, dt=BROOK.block/st.fs, a=dt/F.tau, g=(v.R()+v.R()+v.R()-1.5)*2;   // a cheap near-normal draw
  v.flow=clamp(v.flow+(1-v.flow)*a+F.depth*Math.sqrt(2*a)*g, F.lo, F.hi); }
const RE=32;   // frames between the chirp's coefficient updates (a rotating phasor in between: no sine per sample)
/* one bubble for voice v: a pitch from its range (more small, high bubbles than big ones; the big ones louder), a decay that shortens with the
   pitch, a rising chirp, a place in the voice's stereo spread */
function bubble(st, v, vi){
  const B=BROOK.bubble, b=st.free.pop(); if(!b){ st.dropped++; return; }
  const u=Math.pow(v.R(), 0.75), f0=v.f[0]*Math.pow(v.f[1]/v.f[0], 1-u), tau=clamp(B.tau*Math.pow(B.ref/f0, B.slope), B.min, B.max);
  const xi=B.rise[0]+v.R()*(B.rise[1]-B.rise[0]), p=clamp(v.pan+(v.R()-0.5)*2*v.w, -1, 1), w=2*Math.PI*f0/st.fs;
  b.c=0; b.s=0; b.w=w; b.dw=w*xi/(tau*st.fs); b.a=B.amp*Math.pow(v.f[0]/f0, B.big)*(0.3+0.7*v.R()); b.k=Math.exp(-1/(tau*st.fs)); b.env=1; b.at=0; b.n=0; b.v=vi;
  b.gl=Math.cos((p+1)*Math.PI/4); b.gr=Math.sin((p+1)*Math.PI/4); b.cr=Math.cos(w); b.sr=Math.sin(w); b.c=1; b.s=0;   // the phasor starts at angle 0 (the sine part is 0: no step)
  st.live.push(b); st.made++;
}
/* render n frames into L and R (Float32Array, written from index o) */
export function brookRender(st, L, R, o=0, n=L.length-o){
  if(st.sleep){ for(let i=0;i<n;i++){ L[o+i]=0; R[o+i]=0; } return; }
  const fs=st.fs, BK=BROOK.block, BU=BROOK.burst, RU=BROOK.rush, vs=st.vs, nv=st.light ? Math.min(BROOK.light.voices, vs.length) : vs.length, rk=st.light ? BROOK.light.rate : 1, live=st.live, U=st.rush, ka=st.kAtk;
  for(let i=0;i<n;i++){
    if((st.t+i)%BK===0){ let f=0; for(const v of vs){ flowStep(st, v); f+=v.flow; } U.flow=f/vs.length; }
    for(let k=0;k<nv;k++){ const v=vs[k];   // clusters arrive; a cluster lets out its bubbles a few ms apart
      if(--v.next<=0){ v.left=BU.lo+Math.floor(v.R()*(BU.hi-BU.lo+1)); v.gap=0; const lam=Math.max(0.05, v.rate*rk*Math.pow(v.flow, 1.5)); v.next=Math.max(1, Math.round(-Math.log(1-v.R())/lam*fs)); }
      if(v.left>0 && --v.gap<=0){ bubble(st, v, k); v.left--; v.gap=Math.max(1, Math.round(-Math.log(1-v.R())*BU.gap*fs)); } }
    for(let j=live.length-1;j>=0;j--){ const b=live[j];   // each bubble: a rising, decaying sinusoid (a rotating phasor) with a soft start
      if(b.n%RE===0 && b.n){ const w=b.w+b.dw*b.n; b.cr=Math.cos(w); b.sr=Math.sin(w); }
      const c=b.c*b.cr-b.s*b.sr, s=b.c*b.sr+b.s*b.cr; b.c=c; b.s=s; b.at+=(1-b.at)*ka; const y=b.a*b.env*b.at*s; b.env*=b.k; b.n++;
      const v=vs[b.v]; v.bl+=y*b.gl; v.br+=y*b.gr;
      if(b.env<1e-3){ live[j]=live[live.length-1]; live.pop(); st.free.push(b); } }   // −60 dB: gone
    let l=0, r=0;
    for(let k=0;k<vs.length;k++){ const v=vs[k]; v.zl+=(v.bl-v.zl)*v.kl; v.zr+=(v.br-v.zr)*v.kl; l+=v.zl*v.gain; r+=v.zr*v.gain; v.bl=0; v.br=0; }
    /* the rush: mid and side noises, band-limited, its level with the mean flow */
    const a=st.r()*2-1, c=st.r()*2-1; U.h1+=(a-U.h1)*st.kHp; U.h2+=(c-U.h2)*st.kHp; U.n1+=(a-U.h1-U.n1)*st.kLp; U.n2+=(c-U.h2-U.n2)*st.kLp;
    const ra=RU.amp*U.flow*(st.light ? 0.8 : 1); l+=ra*(U.n1+U.w*U.n2)*U.l; r+=ra*(U.n1-U.w*U.n2)*U.r;
    L[o+i]=l; R[o+i]=r;
  }
  st.t+=n;
}
/* n frames at the OUTPUT rate into L and R (from index o): rate / div synthesised, then linear interpolation (div 2: each new frame and the
   midpoint before it — images of the water's top above 20 kHz stay under −20 dB) */
export function brookOut(st, L, R, o=0, n=L.length-o){
  if(st.div===1) return brookRender(st, L, R, o, n);
  const m=Math.ceil(n/st.div); if(st.x.length<m){ st.x=new Float32Array(m); st.y=new Float32Array(m); }
  brookRender(st, st.x, st.y, 0, m); let pl=st.pl, pr=st.pr;
  for(let j=0, i=0;j<m;j++){ const xl=st.x[j], xr=st.y[j];
    for(let q=1;q<=st.div && i<n;q++, i++){ const f=q/st.div; L[o+i]=pl+(xl-pl)*f; R[o+i]=pr+(xr-pr)*f; } pl=xl; pr=xr; }
  st.pl=pl; st.pr=pr;
}
/* probes and the worklet's stats: how much it made and dropped, the flows */
export const brookStats=st=>({ made:st.made, dropped:st.dropped, active:st.live.length, flows:st.vs.map(v=>v.flow), t:st.t });
