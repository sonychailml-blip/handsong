/* NIGHT-1: the headroom page's sums, pure (runs in node: tools/probe-data.mjs, row «NIGHT-1 headroom sums»). No DOM, no Web Audio. */
export const FORMAT='handsong/headroom', VERSION=1;
export const round=(x,d=1)=>{ const k=10**d; return Number.isFinite(x) ? Math.round(x*k)/k : null; };
export const quantumUs=rate=>128/rate*1e6;
/* render time → work per quantum (µs) and its share of the real-time budget (%) */
export const usPerQuantum=(ms,sec,rate)=>ms*1000/(sec*rate/128);
export const loadPct=(us,rate)=>100*us/quantumUs(rate);
export const minOf=a=>a.reduce((m,x)=>x<m?x:m,Infinity);
export const median=a=>{ const s=[...a].sort((x,y)=>x-y), n=s.length; return !n ? NaN : n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2; };
export const dB=x=>x>0 ? 20*Math.log10(x) : -Infinity;
export const amp=d=>Math.pow(10,d/20);

/* the ballast search: fractions of a quantum by bisection, `depth` tries at most (3: free share known to ±12.5 %, 4: ±6 %). tried = [{ f, ok }] in order; null = done */
export function nextBallast(tried, depth=3){
  if(!tried.length) return 0;
  if(!tried[0].ok || tried.length>=depth) return null;
  const { lo, hi }=freeRange(tried); return (lo+hi)/2;
}
export function freeRange(tried){ let lo=null, hi=null; for(const t of tried){ if(t.ok){ if(lo==null||t.f>lo) lo=t.f; } else if(hi==null||t.f<hi) hi=t.f; } return { lo, hi: hi==null ? 1 : hi }; }

/* the last time a level envelope (blocks of dt seconds, linear peak) is at or above each dBFS level, in seconds */
export function tailTimes(env, dt, levels=[-60,-70,-80,-90]){
  const out={}; for(const L of levels){ const a=amp(L); let last=-1; for(let i=env.length-1;i>=0;i--) if(env[i]>=a){ last=i; break; } out[L]= last<0 ? 0 : round((last+1)*dt,2); } return out;
}
export function envelope(x, rate, dt=0.05){ const n=Math.max(1,Math.round(dt*rate)), e=new Float32Array(Math.ceil(x.length/n)); for(let i=0;i<x.length;i++){ const v=Math.abs(x[i]), b=(i/n)|0; if(v>e[b]) e[b]=v; } return e; }
export function residualDb(a,b){ let p=0, q=0; const n=Math.min(a.length,b.length); for(let i=0;i<n;i++){ const d=a[i]-b[i]; q+=d*d; p+=a[i]*a[i]; } return p>0 ? (q>0 ? round(10*Math.log10(q/p),1) : -Infinity) : null; }
export const worst=(a,b)=>{ let m=0; const n=Math.min(a.length,b.length); for(let i=0;i<n;i++){ const d=Math.abs(a[i]-b[i]); if(d>m) m=d; } return m>0 ? round(dB(m),1) : -Infinity; };

/* one partial of a struck record: its own stop now, and the moment it falls below `floorDb` dBFS (no release: a note held through its tail).
   Modal: T60 decay × (220/f)^dk, stop at its own −70 dB (Night's lean path); tine: exponential ramp to 0.0001 at `decay`. k = output level of a unit partial. */
export function partials(rec, f0, vel, k, floorDb, nyq=21600){
  const R=rec.recipe, out=[], floor=amp(floorDb);
  if(rec.engine==='modal'){ const sc=Math.pow(220/f0,R.dk||0);
    for(const m of R.modes){ const f=f0*m.r; if(f>=nyq) continue; const a=m.a||R.att||0.002, d=m.d*sc, pk=m.g*Math.pow(vel,(R.vb||0)*Math.max(0,Math.log2(m.r))), lvl=pk*k;
      const stop=a+d*7/6+0.02, need= lvl>floor ? a+d*Math.log(lvl/floor)/6.907755 : 0; out.push({ r:m.r, lvl:round(dB(lvl),1), stop:round(stop,2), audible:round(Math.min(stop,need),2) }); } }
  else if(rec.engine==='tine'){ for(const [ratio,a,decay] of R.partials){ const lvl=a*vel*k, stop=decay+0.05, rate=Math.log(a/0.0001)/(decay-0.006), need= lvl>floor ? 0.006+Math.log(lvl/floor)/rate : 0; out.push({ r:ratio, lvl:round(dB(lvl),1), stop:round(stop,2), audible:round(Math.min(stop,need),2) }); } }
  return out;
}
/* oscillator-seconds a strike computes against those it needs above the floor */
export function partialSeconds(list){ const all=list.reduce((n,p)=>n+p.stop,0), need=list.reduce((n,p)=>n+p.audible,0); return { all:round(all,1), audible:round(need,1), wasted:all>0 ? round(100*(1-need/all),0) : 0 }; }

/* pre-rendering memory for one sound: 32-bit float, or 16-bit as the frozen-track store holds it (AF6b) */
export function prerender(sec, rate, pitches, velocities=3){ const samples=sec*rate; return { noteMbFloat:round(samples*4/1048576,2), noteMb16:round(samples*2/1048576,2), pitches, velocities, totalMbFloat:round(samples*4*pitches*velocities/1048576,0), totalMb16:round(samples*2*pitches*velocities/1048576,0) }; }
export function report(meta, sections){ return { format:FORMAT, version:VERSION, meta, ...sections }; }
