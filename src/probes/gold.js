/* GOLD1: GOLDEN RENDERS — every built-in timbre (23 solo, 16 chord, 7 bass, 5 kits × 6 rows), the drone and the six effects at three
   settings, each rendered alone through the engine copy (render.goldRender: 48 kHz, one seed, offline allocator, tapped before the
   limiter) → compact features (loudness every 50 ms, side energy, 10 octave bands in three time segments, dB) compared with
   tools/gold.print.json, made by P.dumpGold() on unchanged code. The net for every engine and timbre slice (AUD1, AUD2, TIM1–TIM3,
   ENG1, and the WASM migration later). Renewed only by a slice that changes sound by decision.
   Tolerance GOLD_TOL dB per value; a value below GOLD_FLOOR (−80 dB, SND-F1b — user decision) on BOTH sides is not compared (inaudible,
   and numerically noisy: «fx reverb 3» band 11 at −92 dB flickered ±0.012 dB between fresh sessions); one side below = compared; same-seed
   renders repeat to a few ULP, so the measured spread is far below it. CONTROL: the Warm pad chord timbre with its filter +1 % (the
   copy's own CHORD_INSTR entry, restored after) must differ from its golden case. */
import { row } from './rows.js';
import { timbresOf } from '../audio.js';
import { aRef, setARef, chainKeyOf } from '../state.js';
import { scaleView, scaleById } from '../scales.js';
import { DYN_GLUE, DYN_LIMIT, DYN_MASTER } from '../core/dsp.js';   // SND-F1: the master Glue / Limiter cases

const GOLD_FILE='tools/gold.print.json', GOLD_TOL=0.01, GOLD_FLOOR=-80, WIN=0.05, NFFT=4096;
const BANDS=[0,63,125,250,500,1000,2000,4000,8000,16000,24001];
const F3=[220,277.1826,329.6276];   // a chord with three distinct partials sets
const off=undefined;   // positional empty slots before the time (rule #15)

/* The case list: name → { sec, play(eng), chains? } — names are the identity in the golden file. */
function goldCases(){
  const C=[], chK=chainKeyOf('ch');
  const add=(name,sec,play,chains,post)=>C.push({ name, sec, play, chains, post });
  timbresOf('ld').forEach((_,i)=>add(`ld ${i}`,1.0,e=>{ e.applyFx({}); e.leadOn('g',220,0.8,i,off,off,off,off,0.05); e.leadOff('g',off,0.5); }));
  timbresOf('ch').forEach((_,i)=>add(`ch ${i}`,1.0,e=>{ e.chordOn('g',F3,0.8,i,null,0.05); e.chordOff('g',0.5); }));
  timbresOf('bs').forEach((_,i)=>add(`bs ${i}`,1.0,e=>{ e.bassOn('g',55,0.8,i,off,off,off,off,0.05); e.bassOff('g',0.5); }));
  timbresOf('dr').forEach((_,k)=>add(`dr ${k}`,2.4,e=>{ for(let r=0;r<6;r++) e.drumHit(r,0.8,k,off,0.05+0.3*r); }));
  add('drone',2.0,e=>{ e.droneUse(scaleView(scaleById('major'),'T',undefined,0,0)); e.droneOn(0.18,0.05); e.droneOff(1.2); });
  [0.25,0.6,1].forEach(v=>add(`fx vol ${v}`,1.0,e=>{ e.applyFx({}); e.leadOn('g',220,v,0,off,off,off,off,0.05); e.leadOff('g',off,0.5); }));
  [0,0.5,0.9].forEach(b=>add(`fx bright ${b}`,1.0,e=>{ e.chordOn('g',F3,0.8,0,b,0.05); e.chordOff('g',0.5); }));
  [0.004,0.04,0.2].forEach(g=>add(`fx glide ${g}`,1.1,e=>{ e.applyFx({}); e.leadOn('g',220,0.8,0,off,off,off,off,0.05); e.leadSet('g',330,0.8,off,off,0,g,0.35); e.leadOff('g',off,0.7); }));
  const bus=(id,sets,sec,hold)=>sets.forEach((set,j)=>add(`fx ${id} ${j+1}`,sec,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',hold); }, { [chK]:{ ids:[id], set } }));
  bus('reverb',[{ 'reverb:decay':0.2, 'reverb:tone':0.8, 'reverb:mix':0.3 },{ 'reverb:decay':0.5, 'reverb:tone':0.5, 'reverb:mix':0.6 },{ 'reverb:decay':0.9, 'reverb:tone':0.2, 'reverb:mix':1 }],2.2,0.4);
  bus('dly',[{ 'dly:mix':0.3, 'dly:time':0.2, 'dly:fb':0.2 },{ 'dly:mix':0.6, 'dly:time':0.5, 'dly:fb':0.5 },{ 'dly:mix':1, 'dly:time':0.8, 'dly:fb':0.8 }],2.2,0.4);
  bus('trmMix',[{ 'trmMix:depth':0.3, 'trmMix:rate':0.2 },{ 'trmMix:depth':0.6, 'trmMix:rate':0.5 },{ 'trmMix:depth':1, 'trmMix:rate':0.9 }],1.2,0.9);
  /* SND-F1: Night forest (3 sends), Glue on the chord chain (3 settings), the master's Glue and safety Limiter (a hot master) */
  bus('forest',[{ 'forest:mix':0.3, 'forest:room':1 },{ 'forest:mix':0.8, 'forest:room':1 },{ 'forest:mix':1, 'forest:room':1 }],4.0,0.4);   // Long room (3.4 s) — the SND-F1 entries
  /* SND-F1b: the Medium (1.7 s) and Short (0.85 s) rooms at the prototype's send */
  add('fx forest medium',4.0,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.4); }, { [chK]:{ ids:['forest'], set:{ 'forest:mix':0.8, 'forest:room':0.5 } } });
  add('fx forest short',4.0,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.4); }, { [chK]:{ ids:['forest'], set:{ 'forest:mix':0.8, 'forest:room':0 } } });
  /* RUN 7 (C4b): Calm's «Forest depth» at near / middle / far (amount full, Medium room) */
  [0,0.5,1].forEach(dp=>add(`fx fdepth ${dp}`,4.0,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.4); }, { [chK]:{ ids:['fdepth'], set:{ 'fdepth:mix':1, 'fdepth:depth':dp, 'fdepth:room':0.5 } } }));
  /* RUN 7 (C5): the Calm effects hand at full (Echo; Warmth and Brightness ends; Wave) */
  add('fx cecho 1',3.0,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.4); }, { [chK]:{ ids:['cecho'], set:{ 'cecho:amount':1 } } });
  [0,1].forEach(tl=>add(`fx ctone ${tl}`,1.2,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.9); }, { [chK]:{ ids:['ctone'], set:{ 'ctone:mix':1, 'ctone:tilt':tl } } }));
  add('fx cwave 1',1.2,e=>{ e.chordOn('g',F3,0.8,2,null,0.05); e.chordOff('g',0.9); }, { [chK]:{ ids:['cwave'], set:{ 'cwave:mix':1, 'cwave:amount':1 } } });
  add('ambience',3.0,e=>{ e.ambienceOn(true,1,0.05); e.ambienceTick(3.0); });   // RUN 7 (C4c): the forest's ambience (drone, wind, crickets) at full level
  bus('glue',[{ 'glue:thr':0.5, 'glue:ratio':0.37 },{ 'glue:thr':0.25, 'glue:ratio':0.6, 'glue:att':0.2, 'glue:rel':0.3 },{ 'glue:thr':0, 'glue:ratio':1, 'glue:knee':0.5, 'glue:makeup':0.6 }],1.2,0.9);
  add('master glue',1.2,e=>{ e.chordOn('g',F3,1,2,null,0.05); e.chordOff('g',0.9); },{},{ mode:'comp', set:{ ...DYN_GLUE, on:1 }, gain:4 });
  add('master limiter',1.2,e=>{ e.chordOn('g',F3,1,2,null,0.05); e.chordOff('g',0.9); },{},{ mode:'limit', set:{ ...DYN_LIMIT, on:1 }, gain:16 });
  add('master limiter (hold)',1.2,e=>{ e.chordOn('g',F3,1,2,null,0.05); e.chordOff('g',0.9); },{},{ mode:'limit', set:{ ...DYN_MASTER, on:1 }, gain:16 });   // SND-F1b: the master's settings
  return C;
}
/* In-place radix-2 FFT (re, im of length 2^k). */
function fft(re,im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){ let b=n>>1; for(;j&b;b>>=1) j^=b; j^=b; if(i<j){ [re[i],re[j]]=[re[j],re[i]]; [im[i],im[j]]=[im[j],im[i]]; } }
  for(let len=2;len<=n;len<<=1){ const a=-2*Math.PI/len, wr=Math.cos(a), wi=Math.sin(a);
    for(let i=0;i<n;i+=len){ let cr=1, ci=0;
      for(let k=0;k<len/2;k++){ const p=i+k, q=p+len/2, tr=re[q]*cr-im[q]*ci, ti=re[q]*ci+im[q]*cr;
        re[q]=re[p]-tr; im[q]=im[p]-ti; re[p]+=tr; im[p]+=ti; const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr; } } }
}
const dB=e=>+(10*Math.log10(e+1e-12)).toFixed(4);
/* Features of one render: env (mean square of the mid signal per 50 ms), side (energy of L−R), spec (3 segments × 10 octave bands). */
function goldFeats({ L, R, rate }){
  const n=L.length, m=new Float32Array(n); let side=0;
  for(let i=0;i<n;i++){ m[i]=(L[i]+R[i])/2; const s=(L[i]-R[i])/2; side+=s*s; }
  const w=Math.round(WIN*rate), env=[];
  for(let a=0;a+w<=n;a+=w){ let e=0; for(let i=a;i<a+w;i++) e+=m[i]*m[i]; env.push(dB(e/w)); }
  const spec=[], hann=Float32Array.from({ length:NFFT },(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/NFFT)), seg=Math.floor(n/3);
  for(let s=0;s<3;s++){ const pw=new Float64Array(BANDS.length-1); let frames=0;
    for(let a=s*seg;a+NFFT<=(s+1)*seg;a+=NFFT){ frames++;
      const re=new Float64Array(NFFT), im=new Float64Array(NFFT); for(let i=0;i<NFFT;i++) re[i]=m[a+i]*hann[i];
      fft(re,im);
      for(let k=1;k<NFFT/2;k++){ const f=k*rate/NFFT, p=re[k]*re[k]+im[k]*im[k]; let b=0; while(f>=BANDS[b+1]) b++; pw[b]+=p; } }
    for(const p of pw) spec.push(dB(frames ? p/frames/NFFT : 0)); }
  return { env, side:dB(side/n), spec };
}
async function renderCase(R,c){ return goldFeats(await R.goldRender(c.play, c.sec, c.chains||{}, c.post||null)); }
/* Value-by-value comparison of two feature sets → list of differences (strings). */
function goldCmp(name,a,b){
  const out=[];
  for(const k of ['env','side','spec']){ const A=[].concat(a[k]), B=[].concat(b[k]);
    if(A.length!==B.length){ out.push(`${name}: ${k} has ${B.length} values, golden ${A.length}`); continue; }
    A.forEach((x,i)=>{ const y=B[i]; if(x<GOLD_FLOOR && y<GOLD_FLOOR) return; if(!(Math.abs(x-y)<=GOLD_TOL)) out.push(`${name}: ${k}[${i}] ${y} dB, golden ${x} (Δ ${(y-x).toFixed(4)})`); }); }
  return out;
}
const withA4=async f=>{ const keep=aRef; if(keep!==440) setARef(440); try{ return await f(); } finally { if(aRef!==keep) setARef(keep); } };   // the drone prices from A4

/* P.dumpGold() — the golden file on UNCHANGED code: save the returned object as tools/gold.print.json. */
export async function dumpGold(){
  const R=await import('../render.js'), cases={}, t0=performance.now();
  await withA4(async()=>{ for(const c of goldCases()) cases[c.name]=await renderCase(R,c); });
  console.log(`[scaleprobe gold] ${Object.keys(cases).length} cases in ${((performance.now()-t0)/1000).toFixed(1)} s — save the returned object as ${GOLD_FILE} (JSON)`);
  return { meta:{ format:'handsong/gold-print', version:1, made:new Date().toISOString(), file:GOLD_FILE, rate:48000, a4:440, win:WIN, nfft:NFFT, bands:BANDS }, cases };
}
/* P.checkGold() — row «GOLD timbres and effects» (P.all only: ≈ 70 short renders). */
export async function checkGold(){
  const diff=[], miss=s=>diff.push(s); let cases=0, file=null;
  try{ const r=await fetch(new URL(GOLD_FILE, location.href), { cache:'no-store' }); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ miss(`no golden file ${GOLD_FILE} (${e&&e.message}) — P.dumpGold() on unchanged code makes it`); return { cases, total:diff.length, differences:diff }; }
  const R=await import('../render.js'), list=goldCases(), G=file.cases||{};
  for(const n of Object.keys(G)) if(!list.some(c=>c.name===n)) miss(`golden case «${n}» is no longer rendered`);
  await withA4(async()=>{
    for(const c of list){ cases++;
      if(!G[c.name]){ miss(`«${c.name}» has no golden case (a new sound: renew the file by decision)`); continue; }
      const d=goldCmp(c.name, G[c.name], await renderCase(R,c));
      if(d.length) miss(`${d[0]}${d.length>1?` (and ${d.length-1} more values)`:''}`); }
    /* CONTROL: the Warm pad's filter +1 % in the copy must leave its golden case */
    const eng=await import('../audio.js?render'), I=eng.CHORD_INSTR[0], lp=I.lp, c=list.find(x=>x.name==='ch 0'); cases++;
    try{ I.lp=lp*1.01; const d=G['ch 0'] ? goldCmp('ch 0', G['ch 0'], await renderCase(R,c)) : [];
      if(!d.length) miss('CONTROL: the Warm pad chord with its filter +1 % still matches its golden case — the net cannot fail'); }
    finally { I.lp=lp; }
    /* CONTROL (SND-F1b floor): an audible value moved 0.02 dB must be caught; a value pair both under the floor must not; one side under
       the floor must still be compared */
    { const g=G['ch 0'], aud=g.spec.findIndex(x=>x>GOLD_FLOOR+10); cases++;
      const mv=k=>({ ...g, spec:g.spec.map((x,i)=>i===aud ? x+k : x) });
      if(aud<0 || !goldCmp('ch 0', g, mv(0.02)).length) miss('CONTROL: an audible band moved by 0.02 dB passed — audible bands are not compared');
      const lo={ env:[], side:-120, spec:[GOLD_FLOOR-12] }, lo2={ env:[], side:-120, spec:[GOLD_FLOOR-10] }, one={ env:[], side:-120, spec:[GOLD_FLOOR+1] };
      if(goldCmp('floor', lo, lo2).length) miss('CONTROL: two values under the floor were compared');
      if(!goldCmp('floor', lo, one).length) miss('CONTROL: a value under the floor against one above it was not compared'); }
  });
  return { cases, total:diff.length, differences:diff };
}

row({ calm:true, at:405, name:'GOLD timbres and effects', run:()=>checkGold(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true });
