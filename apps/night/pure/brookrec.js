/* NIGHT-8b: THE STREAM FROM A RECORDING — the law, pure (rule #36; data row «NIGHT stream recording (app)»), run unchanged by the nature worklet
   (apps/night/worklets/nature-worklet.js) and by the listening render (tools/brook-render.mjs). The user chose the CC0 recording
   «stream-river-water-up-close» (jackthemurray, Freesound #433589; register entry «stream-recording») over the synthesis (apps/night/pure/brook.js,
   kept as the fallback when the file fails to load).
   - GRAINS, never a loop: each of the room's stream voices plays one mono grain after another, each grain a stretch of BROOK_REC.grain seconds
     taken whole from a random place inside the recording (never across its ends, so the file's own seam is never heard); consecutive grains
     overlap by BROOK_REC.fade seconds with an equal-power crossfade (cos / sin: two unrelated stretches keep the level through the join).
     Each voice starts part-way into its first grain, so the joins of the six voices never line up.
   - PLACED as the synthesis: each voice's pan, spread, gain and darkening low-pass (its distance) from the room's stream voices — two
     independent grain streams per voice at pan ± spread·w (equal power, each −3 dB), as the synthesis spreads its bubbles over ±w.
   - LEVEL: `norm` (the room's recipe, measured once by tools/brook-render.mjs) brings the grains to the synthesis's K-like loudness, so the
     stream keeps its place under the wind and the crickets; checked in the browser with the shipped file (row «NIGHT stream, water and ground»).
   - Seeded: the same seed, voices and recording give the same sound (the data row compares two renders exactly). */
export const BROOK_REC=Object.freeze({ seed:0x52454331, grain:Object.freeze([4.5, 8]), fade:1.6, edge:0.25, light:3, swap:2, spread:0.6 });   // swap: s, synthesis → recording when it arrives; spread: × w

const rng=seed=>{ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; };   // the worklet imports this file alone
const onePole=(fc, fs)=>1-Math.exp(-2*Math.PI*fc/fs);

/* the shortest recording the law accepts at `rate` (frames): one longest grain and both edges, with room to choose a place */
export const recMinLen=rate=>Math.ceil((BROOK_REC.grain[1]+2*BROOK_REC.edge+1)*rate);
/* a stretch for voice v: { s start, n length, i read position } — whole inside [edge, len − edge) */
function grainOf(st, v){ const B=BROOK_REC, R=v.R, n=Math.round((B.grain[0]+R()*(B.grain[1]-B.grain[0]))*st.rate), e=Math.round(B.edge*st.rate);
  st.grains++; return { s:e+Math.floor(R()*(st.len-n-2*e)), n, i:0 }; }
/* a new recording state for output rate `rate`, the room's voices, a recording of `len` frames (at `rate`), its level `norm` → the state, or
   null when the recording is too short. The light voices: the BROOK_REC.light loudest (the nearest) */
export function recNew(rate, voices, len, norm=1, seed=BROOK_REC.seed){
  if(!(len>=recMinLen(rate)) || !Array.isArray(voices) || !voices.length) return null;
  const X=Math.round(BROOK_REC.fade*rate), st={ rate, len, norm, X, cd:Math.cos(Math.PI/2/X), sd:Math.sin(Math.PI/2/X), grains:0, frames:0, sleep:false, light:false, vs:null, near:null };
  st.vs=voices.flatMap((v, i)=>[-1, 1].map((sd, j)=>{ const p=Math.max(-1, Math.min(1, v.pan+sd*BROOK_REC.spread*v.w));   // two streams per voice: its spread
    const o={ k:i, R:rng((seed+(2*i+j)*7919+1)>>>0), gain:v.gain*Math.SQRT1_2, kl:onePole(Math.min(v.lp, rate*0.45), rate), z:0,
      pl:Math.cos((p+1)*Math.PI/4), pr:Math.sin((p+1)*Math.PI/4), a:null, b:null, c:1, s:0 };
    o.a=grainOf(st, o); o.a.i=Math.floor(o.R()*(o.a.n-st.X)); return o; }));
  st.near=voices.map((v, i)=>[v.gain, i]).sort((p, q)=>q[0]-p[0] || p[1]-q[1]).slice(0, BROOK_REC.light).map(x=>x[1]).sort((p, q)=>p-q);
  return st;
}
/* n frames into L and R (Float32Array, written from index o; ADDED to what is there when `add`), reading the mono recording `pcm` */
export function recOut(st, pcm, L, R, o=0, n=L.length-o, add=false){
  if(!add) for(let i=0;i<n;i++){ L[o+i]=0; R[o+i]=0; }
  if(st.sleep) return;
  const X=st.X, g=st.norm, cd=st.cd, sd=st.sd;
  for(let k=0;k<st.vs.length;k++){ const v=st.vs[k]; if(st.light && !st.near.includes(v.k)) continue;
    const gl=v.gain*g*v.pl, gr=v.gain*g*v.pr, kl=v.kl; let z=v.z, i=0;
    while(i<n){ const a=v.a, x0=a.n-X;
      if(a.i<x0){ const m=Math.min(n-i, x0-a.i), q=a.s+a.i, w=o+i;   // a plain stretch of the grain
        for(let j=0;j<m;j++){ z+=(pcm[q+j]-z)*kl; L[w+j]+=z*gl; R[w+j]+=z*gr; }
        a.i+=m; i+=m; continue; }
      if(!v.b){ v.b=grainOf(st, v); v.c=1; v.s=0; }   // the join: the next grain fades in, equal power (cos, sin of a ramp, by a rotating phasor)
      const b=v.b, m=Math.min(n-i, a.n-a.i), qa=a.s+a.i, qb=b.s+b.i, w=o+i; let c=v.c, s=v.s;
      for(let j=0;j<m;j++){ const x=pcm[qa+j]*c+pcm[qb+j]*s, c2=c*cd-s*sd; s=s*cd+c*sd; c=c2; z+=(x-z)*kl; L[w+j]+=z*gl; R[w+j]+=z*gr; }
      v.c=c; v.s=s; a.i+=m; b.i+=m; i+=m;
      if(a.i>=a.n){ v.a=b; v.b=null; } }
    v.z=z; }
  st.frames+=n;
}
/* the worklet's and the probes' counters */
export const recStats=st=>({ grains:st.grains, frames:st.frames, sleep:st.sleep, light:st.light, voices:st.light ? st.near.length : st.vs.length/2 });
