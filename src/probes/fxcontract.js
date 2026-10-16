/* AUD2b (RUN 3, 2026-10-16; docs/AUD1-design.md §7): GENERATED CONTRACT ROWS — one per effect of audio.FX_FACTORY (its keys, its order),
   each effect built ALONE by its own factory (`make(E)`) on the render copy in a short offline context (render.engineProbe), a fixed noise
   burst in, its output read back. The contract every effect module keeps (and the WASM effects will be held to):
   (1) PARAMETER ROUND TRIP — every declared parameter: the default lies in [min, max]; setNorm(x) → getNorm() = x for x = 0, ¼, ½, ¾, 1;
       norm → units → norm returns x (1e-9).
   (2) IDENTITY AT NEUTRAL — a signal module at its neutral setting (mix 0; tremolo depth 0; Glue threshold 0 dB, knee 0, makeup 0) passes the
       input sample for sample (Glue: within 1e-6 of peak — its gain is computed in dB). Voice modules (read by each voice) have no signal path.
   (3) OFFLINE REPEAT — the same render twice is the same (≤ 2e-4 of peak, the repeatability rule: a node with ≥ 3 inputs may sum in another
       order).
   (4) TAIL vs DECLARED — after the burst the output falls 60 dB below its peak NO LATER than the tail the render declares for it (render.js
       tailOf: reverb decay = RT60, Night forest = its room length, delay = time · ln1000 / ln(1/fb); inserts: within 50 ms) — a longer real
       tail would be cut off in a frozen track.
   Each render starts with PRE 0.4 s of silence (the parameter setters glide; the burst meets settled values).
   CONTROLS (inside the rows): identity must FAIL at mix 1; the tail check must FAIL against half the declared reverb decay; the round trip
   must FAIL for a units function off by 1 %. */
import { family } from './rows.js';
import * as LIVE from '../audio.js';
import { fxNorm, fxDenorm } from '../modules/effects/param.js';

const DB60=Math.log(1000), BURST=0.2, PRE=0.4;   // PRE: the parameters settle first (the setters glide, e.g. Glue τ 20 ms) — then the burst
const NEUTRAL={ reverb:{ mix:0 }, dly:{ mix:0 }, forest:{ mix:0 }, trmMix:{ depth:0 }, glue:{ thr:0, knee:0, makeup:0 } };
const TAIL={ reverb:p=>p.decay, forest:p=>p.room, dly:p=>p.time*DB60/Math.log(1/p.fb) };   // seconds, from the instance's own values (units)
const WET={ reverb:{ mix:1 }, dly:{ mix:1 }, forest:{ mix:1 }, trmMix:{ depth:1 }, glue:{} };

function burst(ctx, sec){ const n=Math.round(ctx.sampleRate*sec), b=ctx.createBuffer(2, n, ctx.sampleRate); let x=0x2F6E2B1;
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<n;i++){ x=(Math.imul(x,1103515245)+12345)>>>0; d[i]= i>=ctx.sampleRate*PRE && i<ctx.sampleRate*(PRE+BURST) ? ((x/4294967296)*2-1)*0.5 : 0; } }
  return b; }
/* one render of effect `id` alone with parameter values `set` (units) → { out, inp, vals } (vals: every parameter in units) */
async function renderFx(id, set, sec){
  const R=await import('../render.js');
  return R.engineProbe(async (eng, ctx)=>{
    const inst=eng.FX_FACTORY[id].make(eng.engineCtx()), src=ctx.createBufferSource(), b=burst(ctx, sec);
    src.buffer=b; src.connect(inst.in); inst.out.connect(ctx.destination);
    for(const p of inst.params){ if(set && set[p.key]!==undefined){ const x=fxNorm(p, set[p.key]); p.cur=Math.max(0,Math.min(1,x)); p.set(set[p.key], 0); } }
    const vals={}; for(const p of inst.params) vals[p.key]=fxDenorm(p, p.cur);
    src.start(0); const out=await ctx.startRendering();
    return { out, inp:b, vals };
  }, { sec, real: id==='glue' });
}
const peakOf=b=>{ let m=0; for(let c=0;c<b.numberOfChannels;c++){ const d=b.getChannelData(c); for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>m) m=v; } } return m; };
const maxDiff=(a,b)=>{ let m=0; for(let c=0;c<a.numberOfChannels;c++){ const x=a.getChannelData(c), y=b.getChannelData(c); for(let i=0;i<x.length;i++){ const v=Math.abs(x[i]-y[i]); if(v>m) m=v; } } return m; };
/* the time (s) after which every 10-ms window stays 60 dB below the output's peak */
function tail60(b){ const sr=b.sampleRate, w=Math.round(sr*0.01), pk=peakOf(b), lim=pk*1e-3; let last=0;
  for(let i=0;i<b.length;i+=w){ let m=0; for(let c=0;c<b.numberOfChannels;c++){ const d=b.getChannelData(c); for(let k=i;k<Math.min(b.length,i+w);k++){ const v=Math.abs(d[k]); if(v>m) m=v; } } if(m>lim) last=(i+w)/sr; }
  return last; }

/* (1) the round trip of one instance's declarations; `bend` (CONTROL) perturbs the units function */
function roundTrip(params, bend){ const out=[];
  for(const p of params){ const def=p.def; if(!(def>=Math.min(p.min,p.max)-1e-12 && def<=Math.max(p.min,p.max)+1e-12)) out.push(`${p.key}: default ${def} outside [${p.min}, ${p.max}]`);
    for(const x of [0,0.25,0.5,0.75,1]){ const keep=p.cur; p.cur=x; const g=p.getNorm(); p.cur=keep; if(g!==x) out.push(`${p.key}: getNorm ${g} after ${x}`);
      const u=fxDenorm(p,x)*(bend?1.01:1), back=fxNorm(p,u); if(!(Math.abs(back-x)<=1e-9)) out.push(`${p.key}: norm ${x} → ${u} → ${back}`); } }
  return out; }

async function checkFx(id, part='quick'){   // part 'quick': (1) + (2) on short renders · 'tail': (3) + (4) on long ones (P.all only)
  const d=[]; let n=0; const miss=s=>d.push(s);
  const F=LIVE.FX_FACTORY[id]; if(!F) return { cases:0, total:1, differences:[`no effect «${id}»`] };
  /* (1) on a fresh instance of the copy (no render) */
  const R=await import('../render.js');
  if(part==='tail') return checkTail(id);
  const rt=await R.engineProbe((eng)=>{ const inst=eng.FX_FACTORY[id].make(eng.engineCtx()); return { kind:inst.kind, a:roundTrip(inst.params,false), c:roundTrip(inst.params,true).length }; }, { real: id==='glue' });
  n++; d.push(...rt.a.map(s=>`round trip ${s}`)); n++; if(!rt.c) miss('CONTROL: a units function off by 1 % passed the round trip — the check cannot fail');
  if(rt.kind==='voice') return { cases:n, total:d.length, differences:d, status: d.length ? undefined : 'voice module: parameters only (no signal path)' };
  const sec=PRE+BURST+0.4;   // long enough for the delay's first echo (0.35 s) — the identity control must see the wet sound
  /* (2) identity at neutral; CONTROL: wet must differ */
  const a=await renderFx(id, NEUTRAL[id], sec), pk=peakOf(a.inp); n++;
  const dn=maxDiff(a.out, a.inp)/pk, tol= id==='glue' ? 1e-6 : 0;
  if(!(dn<=tol)) miss(`identity at neutral: the output differs from the input by ${dn.toExponential(2)} of peak (limit ${tol})`);
  const w=await renderFx(id, WET[id], sec); n++;
  if(!(maxDiff(w.out, w.inp)/pk>1e-3)) miss('CONTROL: the effect fully on left the input unchanged — the identity check cannot fail');
  return { cases:n, total:d.length, differences:d };
}
async function checkTail(id){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const R=await import('../render.js'); const kind=await R.engineProbe(eng=>eng.FX_FACTORY[id].make(eng.engineCtx()).kind, { real: id==='glue' });
  if(kind==='voice') return { cases:0, total:0, differences:[], status:'voice module: no signal path' };
  const sec=PRE+( id==='forest' ? 4.2 : id==='reverb' ? 3.5 : id==='dly' ? 3.0 : 0.6 );
  const w=await renderFx(id, WET[id], sec);
  /* (3) the same render twice */
  const w2=await renderFx(id, WET[id], sec); n++; const rp=maxDiff(w.out, w2.out)/Math.max(1e-12, peakOf(w.out));
  if(!(rp<=2e-4)) miss(`offline repeat: two identical renders differ by ${rp.toExponential(2)} of peak (limit 2e-4)`);
  /* (4) the tail against the declared one */
  const real=tail60(w.out)-PRE-BURST, decl= TAIL[id] ? TAIL[id](w.vals) : 0.05; n++;
  if(!(real<=decl*1.05+0.01)) miss(`tail: the output stays above −60 dB ${real.toFixed(3)} s after the input — longer than the declared ${decl.toFixed(3)} s (a frozen track would cut it)`);
  if(id==='reverb'){ n++; if(real<=decl*0.5*1.05+0.01) miss(`CONTROL: the real tail ${real.toFixed(3)} s fits even half the declared decay — the tail check cannot fail`); }
  return { cases:n, total:d.length, differences:d };
}
family({ at:1002, name:'AUD2b effect contracts', rows:()=>Object.keys(LIVE.FX_FACTORY).map(id=>({ name:`AUD2b effect contract: ${id}`, run:()=>checkFx(id),
  read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:r.status }) })) });
family({ at:1003, name:'AUD2b effect tails', rows:()=>Object.keys(LIVE.FX_FACTORY).filter(id=>LIVE.FX_FACTORY[id].kind!=='voice').map(id=>({ name:`AUD2b effect tail and repeat: ${id}`, run:()=>checkFx(id,'tail'),
  read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:r.status }), slow:true })) });
export { checkFx };
