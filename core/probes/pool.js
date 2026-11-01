/* POOL1 (RUN 4, ENG2 review E2): the chord pool grows on demand. Row «POOL1 chord pool on demand» (quick and all; deterministic renders,
   no audio capture):
   (1) a scene of chords (Warm pad, Firefly, a glide, releases and re-attacks), drums (the noise buffer) and a humanised solo note rendered
       by the render copy with the lazy pool and with the old EAGER pool (`poolDbg({eager})`): equal within POOL_ULP of peak. ⚠️ Not bit for
       bit — MEASURED: the old eager pool rendered twice with the same seed already differs by up to 6e-8 in ~160 000 samples (Chrome sums a
       node's inputs in no fixed order — the summand rule, 1–3 ULP; «render repeatability»); the row prints that floor. CONTROL: a lazy pool
       WITHOUT the per-index draws (`poolDbg({naive})`) shifts the random stream and must exceed the bound by far;
   (2) a chord track of the seed song through the freeze path (`renderTrack`, short window, one seed): lazy = eager within POOL_ULP;
   (3) the live pool: a chord that fits the idle voices builds nothing while it attacks (the first note never waits); right after, at least
       CHORD_POOL_SPARE idle voices are built ahead; a burst grows the pool to its ceiling CHORD_POOL_N and never beyond; the pool never
       shrinks (rule #3: a built voice never stops). Silent chords (volume 0) on probe owners, all released at the end. */
import { row } from './rows.js';
import { events } from '../recorder.js';
import { chordOn, chordOff, poolSizes } from '../audio.js';
import { CHORD_POOL_N, CHORD_POOL_SPARE } from '../config.js';
import { meas } from './kit.js';

const POOL_ULP=2e-6;   // of peak: ≈ 30 ULP at the scene's peak — above the measured same-code floor (6e-8 / 0.12 = 5e-7), far below any real change

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bufOf=b=>Array.from({ length:b.numberOfChannels }, (_,c)=>b.getChannelData(c).slice());
function diffOf(A,B){ if(A.length!==B.length || A[0].length!==B[0].length) return { shape:false, n:Infinity, max:Infinity };
  let n=0, max=0, pk=0; for(let c=0;c<A.length;c++){ const a=A[c], b=B[c]; for(let i=0;i<a.length;i++){ const v=Math.abs(a[i]); if(v>pk) pk=v; if(a[i]!==b[i]){ n++; const e=Math.abs(a[i]-b[i]); if(e>max) max=e; } } }
  return { shape:true, n, max, rel: pk>0 ? max/pk : max }; }
const within=q=>q.shape && q.rel<=POOL_ULP;

async function sceneRender(R, pool){
  return R.engineProbe(async(eng, ctx)=>{
    const ff=Math.max(0, eng.CHORD_INSTR.findIndex(x=>x.strike)), ss=Math.max(0, eng.LEAD_INSTR.findIndex(x=>x.id==='solo.supersaw'));
    eng.chordOn('loop:1', [220, 277.18, 329.63, 415.3], 0.7, 0, null, 0.05);
    eng.chordOn('loop:2', [146.83, 220, 293.66], 0.6, 2, 0.3, 0.3);
    eng.chordGlide('loop:1', [246.94, 311.13, 369.99, 466.16], 0.7, null, 0.6);
    eng.chordOff('loop:2', 0.9);
    eng.chordOn('loop:3', [196, 246.94, 293.66, 349.23, 440], 0.8, 1, null, 1.0);
    eng.chordOn('loop:4', [261.63, 329.63, 392], 0.7, ff, null, 1.1);
    eng.chordOff('loop:1', 1.3); eng.chordOn('loop:5', [174.61, 220, 261.63], 0.5, 0, null, 1.35);
    for(let t=0.02;t<1.8;t+=0.25){ eng.drumHit(1, 0.7, 0, null, t); eng.drumHit(3, 0.5, 0, null, t+0.125); }
    eng.leadOn('lead:p', 440, 0.6, ss, 0, 1, null, false, 0.4);
    const b=await ctx.startRendering(); return { buf:bufOf(b), sizes:eng.poolSizes() }; },
  { sec:2, pre:eng=>eng.poolDbg(pool), after:(ctx,eng)=>{ if(eng) eng.poolDbg({ eager:false, naive:false }); } });
}

export async function checkPool(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const R=await import('../render.js');
  try{
    /* (1) the engine scene */
    const L=await sceneRender(R, { eager:false, naive:false }), E=await sceneRender(R, { eager:true }), E2=await sceneRender(R, { eager:true }), N=await sceneRender(R, { naive:true });
    const le=diffOf(L.buf, E.buf), ee=diffOf(E.buf, E2.buf); n+=3;
    meas('POOL1 scene lazy vs eager (of peak)', le.rel, POOL_ULP, 'max'); meas('POOL1 scene eager vs eager — the floor (of peak)', ee.rel);
    if(!within(le)) miss(`scene: the lazy pool differs from the eager pool by ${le.rel} of peak in ${le.n} sample(s) (bound ${POOL_ULP}; the eager pool against itself: ${ee.rel})`);
    if(!(L.sizes.chord<E.sizes.chord)) miss(`scene: the lazy pool built ${L.sizes.chord} chord voices, the eager ${E.sizes.chord} — nothing saved`);
    { const q=diffOf(L.buf, N.buf); if(within(q)) miss(`CONTROL: a lazy pool without the per-index draws stayed within the bound (${q.rel} of peak) — the check cannot fail`); }
    /* (2) a seed chord track through the freeze path */
    const ly=[...new Set(events.filter(e=>e.fn==='chOn').map(e=>e.layer))].sort((a,b)=>a-b)[0];
    if(ly==null) miss('no chord track in the song — run P.seed first');
    else { const rt=()=>R.renderTrack(ly, { quiet:true, short:1.0, seed:0x9001 }).then(r=>bufOf(r.buf));
      const A=await rt(); await R.renderPoolDbg({ eager:true }); let B; try{ B=await rt(); } finally{ await R.renderPoolDbg({ eager:false }); }
      const q=diffOf(A,B); n++; meas('POOL1 track lazy vs eager (of peak)', q.rel, POOL_ULP, 'max');
      if(!within(q)) miss(`L${ly+1}: the track render with the lazy pool differs from the eager pool by ${q.rel} of peak (bound ${POOL_ULP})`); }
    /* (3) the live pool */
    const sz=()=>poolSizes().chord, owners=[];
    const n0=sz(); n++; if(!(n0>=1 && n0<=CHORD_POOL_N)) miss(`live: ${n0} chord voices built (1…${CHORD_POOL_N} expected)`);
    await sleep(30);   // a top-up still pending from an earlier row lands first
    const free=()=>{ const S=poolSizes(); return S.chordFree; };
    const f0=free(), k=Math.min(3, f0), before=sz();
    if(k>0){ const o='probe:pool:a'; owners.push(o); chordOn(o, Array.from({ length:k }, (_,i)=>220*(i+2)/2), 0, 0, null);
      n++; if(sz()!==before) miss(`live: a ${k}-note chord with ${f0} idle voices built ${sz()-before} voice(s) while it attacked — the first note would wait`); }
    await sleep(30);
    n++; if(!(free()>=CHORD_POOL_SPARE || sz()===CHORD_POOL_N)) miss(`live: after a chord only ${free()} idle voice(s) built ahead (${CHORD_POOL_SPARE} expected)`);
    let last=sz(), shrank=false;
    for(let i=0;i<10;i++){ const o='probe:pool:b'+i; owners.push(o); chordOn(o, [110, 138.6, 164.8, 207.7], 0, 0, null); if(sz()<last) shrank=true; last=sz(); }
    await sleep(30);
    n+=2; if(sz()!==CHORD_POOL_N) miss(`live: a burst of 40 notes left ${sz()} chord voices (the ceiling ${CHORD_POOL_N} expected)`);
    if(shrank) miss('live: the chord pool shrank — a built voice must never stop (rule #3)');
    for(const o of owners) chordOff(o);
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1001.5, name:'POOL1 chord pool on demand', run:()=>checkPool(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
