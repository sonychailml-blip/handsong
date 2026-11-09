/* NIGHT-4: THE MUSIC BED v2's LAW — what plays and when, as numbers (pure, rule #36; data row «NIGHT music bed v2 law (app)»). Design:
   docs/night/design/NIGHT-3-rooms/PLAN.md §4b. The sound is one worklet (apps/night/worklets/bed-worklet.js), the driver apps/night/bed2.js.
   - Steps as in v1: an integer s = degree (s mod n) in octave floor(s / n) of the chord register (0 = the tonic an octave under the playing).
     Phrases and chords are kept in steps, so after a Mood change the same melodies go on in the new scale (rule #2: Hz only in the driver).
   - LOOPS: each voice repeats its own phrase of 2–4 long notes on its own loop length; at each loop's end it sometimes varies one note or
     takes a new phrase. The lengths differ, so the combination never repeats. A voice joins or leaves only at its loop's start, with the arc.
   - PAD: chords of the scale's own degrees (stacked every other degree), the root low and the rest spread in open voicing over 2–3 octaves.
   - GLASS (soft, high, mostly reverb; now and then 2–3 together), AIR (its level), BREATH (a swell about 6 a minute), COLOUR (each layer's
     brightness drifting over tens of seconds), the ARC (density sparse → full → sparse over 5–10 minutes, seeded, sparse at the start).
   - RESPONSE (a switch, off by default): your recent notes lean which notes a new phrase or chord takes. Every pick takes exactly one draw
     whatever the weights, so no time ever moves (row: times identical with it on).
   Seeded: the same seed, scale size, preset and played notes give the same bed. */
import { seeded } from '../../../core/pure/dsp.js';
import { BED_ANSWER, chordPcs, rootWeights } from './bed.js';

export const BED2_SEED=0x42454432;
const pick=(r, a)=>a[0]+r()*(a[1]-a[0]);
const mod=(s, n)=>((s%n)+n)%n;
const clamp=(x, a, b)=>Math.max(a, Math.min(b, x));
/* a register in octaves above step 0 → steps [lo, hi] for a scale of n degrees */
export const bed2Reg=(oct, n)=>({ lo:Math.ceil(oct[0]*n-1e-9), hi:Math.floor(oct[1]*n+1e-9) });
/* a step folded into [lo, hi] by whole periods (a range narrower than a period clamps) */
export function bed2Fold(s, lo, hi, n){ let x=s; while(x>hi) x-=n; while(x<lo) x+=n; return Math.min(x, hi); }
/* one weighted pick with exactly ONE draw (the response changes weights, never the number of draws) */
function wpick(r, items, w){ const sum=w.reduce((a,b)=>a+b, 0), u=r()*sum; let acc=0; for(let i=0;i<items.length;i++){ acc+=w[i]; if(u<acc) return items[i]; } return items[items.length-1]; }
const lean=(pc, played, answer)=> answer && played.length ? 1+BED_ANSWER.weight*played.filter(p=>p===pc).length/played.length : 1;

/* THE ARC: density 0…1 at law time t (depth = how sparse its low point is). Its own seeded stream, so nothing else moves it */
export function bed2Density(st, t, depth){
  const A=st.arc; while(A.ends[A.ends.length-1]<=t) A.ends.push(A.ends[A.ends.length-1]+pick(A.r, A.period));
  let i=1; while(A.ends[i]<=t) i++; const u=(t-A.ends[i-1])/(A.ends[i]-A.ends[i-1]);
  return 1-depth*(0.5+0.5*Math.cos(2*Math.PI*u));
}
const PANS=[-0.55, 0.45, -0.2, 0.65, 0];
/* a new bed state; P the preset. The loop voices' lengths, pans and first starts are fixed here; their phrases come with their first loop */
export function bed2Init(seed, R, P){
  const r=seeded(seed>>>0), st={ r, arc:{ r:seeded((seed^0xA5C1)>>>0), period:R.arc.period, ends:[0] }, pending:[],
    pad:{ next:0.4, root:null, steps:null }, glass:P.glass ? { next:pick(r, P.glass.every)*0.6 } : null, air:{ next:0.5 },
    breath:{ next:0.2, up:true }, color:{ pad:{ next:0 }, loop:{ next:0.05 } }, loops:[] };
  for(let v=0; v<P.loops; v++) st.loops.push({ v, len:P.loopLen[v%P.loopLen.length], pan:PANS[v%PANS.length], next:1.5+v*3.1+r()*4,
    thr:0.95*v/P.loops, active:false, phrase:null, cycles:0, changes:0 });
  return st;
}
/* soon a new chord (the scale changed: the next chord comes from the new scale at once) */
export function bed2Soon(st, t){ st.pad.next=Math.min(st.pad.next, t+0.3); }
/* one voice's own register (steps): its centre spread over the preset's loop register, ±0.45 octave */
export function bed2LoopReg(P, v, n){ const [a,b]=P.loopReg, c=a+(b-a)*(v+0.5)/P.loops; return bed2Reg([Math.max(a, c-0.45), Math.min(b, c+0.45)], n); }
/* the next step of a phrase: mostly a neighbour step, sometimes a leap, never the same step twice in a row; the first note near the middle */
function stepPick(r, prev, lo, hi, n, played, answer){
  const items=[], w=[], mid=(lo+hi)/2;
  for(let s=lo; s<=hi; s++){ const d= prev==null ? null : Math.abs(s-prev);
    let x= prev==null ? Math.exp(-Math.pow((s-mid)/Math.max(1, (hi-lo)/3), 2)) : d===0 ? 0 : d===1 ? 1 : d===2 ? 0.8 : d===3 ? 0.35 : d===4 ? 0.2 : 0.05;
    if(mod(s, n)===0) x*=1.3;
    items.push(s); w.push(x*lean(mod(s, n), played, answer)); }
  return wpick(r, items, w);
}
/* a new phrase for loop voice L: 2–4 notes, one per equal slot of the loop with a little jitter; long, soft notes */
function newPhrase(st, R, P, L, n, played, answer){
  const r=st.r, X=R.loops, m=Math.max(P.notes[0], Math.min(P.notes[1], Math.floor(pick(r, [P.notes[0], P.notes[1]+1])))), slot=L.len/m, { lo, hi }=bed2LoopReg(P, L.v, n), out=[];
  let prev=null;
  for(let j=0; j<m; j++){ const off=j*slot+r()*0.35*slot, a=pick(r, X.attack), h=Math.min(pick(r, X.hold), Math.max(0.5, 0.8*slot-a)), rel=pick(r, X.release);
    const step=stepPick(r, prev, lo, hi, n, played, answer);
    out.push({ off, step, a, h, r:rel, amp:0.7+0.3*r(), dp:(r()*2-1)*0.12, c0:r(), c1:r() }); prev=step; }
  return out;
}
/* vary one note of a phrase by a step or two (one draw for the note, one for its new step) */
function varyPhrase(st, P, L, n, played, answer){
  const r=st.r, ph=L.phrase, j=Math.min(ph.length-1, Math.floor(r()*ph.length)), { lo, hi }=bed2LoopReg(P, L.v, n), old=ph[j].step, items=[], w=[];
  for(let s=lo; s<=hi; s++){ const d=Math.abs(s-old); items.push(s); w.push((d===1 ? 1 : d===2 ? 0.6 : 0)*lean(mod(s, n), played, answer)); }
  if(w.some(x=>x>0)) ph[j]={ ...ph[j], step:wpick(r, items, w) }; else r();
}
/* open voicing, by a small search over every placement (each tone has a few candidates in the range): the root lowest, in the range's lowest
   octave; the tones rising; cost = each tone's distance from where it was (or, the first time, from evenly spread targets) + a penalty for
   two tones closer than two steps, for a first interval under about a fifth, and for three or more tones spanning less than an octave */
export function bed2Voice(prev, pcs, n, lo, hi){
  const T=pcs.length, C=pcs.map((pc, k)=>{ const out=[]; for(let s=lo; s<=(k===0 ? Math.min(hi, lo+n-1) : hi); s++) if(mod(s, n)===pc) out.push(s); return out; });
  if(C.some(c=>!c.length)) return null;
  const ref=pcs.map((_, k)=>{ const tgt= T>1 ? lo+(hi-lo)*k/(T-1) : lo; return prev && prev[k]!=null ? 0.6*prev[k]+0.4*tgt : tgt; }), first=Math.ceil(0.55*n);
  let best=null, bc=Infinity; const cur=[];
  const walk=k=>{ if(k===T){ let c=0; for(let i=0;i<T;i++){ c+=Math.abs(cur[i]-ref[i])*5/n; if(i && cur[i]-cur[i-1]<2) c+=4; }   // motion counted per fifth of an octave, so any scale size weighs the same
      if(T>1 && cur[1]-cur[0]<first) c+=5; if(T>=3 && cur[T-1]-cur[0]<n) c+=8; if(c<bc){ bc=c; best=cur.slice(); } return; }
    for(const s of C[k]) if(!k || s>cur[k-1]){ cur[k]=s; walk(k+1); } };
  walk(0);
  return best;
}
/* all events up to `until` (law seconds), in time order. P the preset, n the scale's size, played the pitch classes of your recent notes
   (used only with answer on), light the lighter variant (loops beyond R.lighter.loops leave at their next loop start, at most R.lighter.padTones
   pad tones, no air, the glass thinned by R.lighter.glass, the pad's and loops' release tails × R.lighter.release).
   → [{ kind:'loop', t, v, step, a, h, r, amp, pan, c0, c1 } | { kind:'chord', t, steps, a, r } | { kind:'glass', t, step, amp, pan, a, d }
      | { kind:'air', t, lvl, tc } | { kind:'breath', t, db, tc } | { kind:'color', t, layer, v, tc }] */
export function bed2Step(st, R, P, n, until, played=[], answer=false, light=false){
  const out=[], r=st.r, cap= light ? Math.min(P.loops, R.lighter.loops) : P.loops;
  const push=e=>{ const q=st.pending; let i=q.length; while(i>0 && q[i-1].t>e.t) i--; q.splice(i, 0, e); };
  for(;;){
    let t=Infinity, who=null;
    const see=(x, k)=>{ if(x<t){ t=x; who=k; } };
    see(st.pad.next, 'pad'); if(st.glass) see(st.glass.next, 'glass'); see(st.air.next, 'air'); see(st.breath.next, 'breath');
    see(st.color.pad.next, 'cpad'); see(st.color.loop.next, 'cloop'); for(const L of st.loops) see(L.next, L);
    if(st.pending.length && st.pending[0].t<=t){ t=st.pending[0].t; who='pending'; }
    if(!(t<until)) break;
    if(who==='pending'){ const e=st.pending.shift();   // a step is folded when it is emitted, in the scale of that moment (a Mood change keeps the phrase)
      if(e.kind==='loop'){ const { lo, hi }=bed2LoopReg(P, e.v, n); e.step=bed2Fold(e.raw, lo, hi, n); delete e.raw; }
      else if(e.kind==='glass'){ const { lo, hi }=bed2Reg(R.glass.oct, n); e.step=bed2Fold(e.pc+e.oct*n, lo, hi, n); delete e.pc; delete e.oct; }
      out.push(e); continue; }
    if(who==='pad'){
      const d=bed2Density(st, t, P.arcDepth), tones=clamp(Math.round(P.padTones[0]+(P.padTones[1]-P.padTones[0])*d), 1, light ? R.lighter.padTones : 4), { lo, hi }=bed2Reg(P.padReg, n);
      const root=wpick(r, [...Array(n).keys()], rootWeights(st.pad.root, n, tones, played, answer));
      const steps=bed2Voice(st.pad.steps, chordPcs(root, tones, n), n, lo, hi);
      const a=pick(r, R.pad.attack), rel=pick(r, R.pad.release)*(light ? R.lighter.release : 1);
      if(steps){ st.pad.root=root; st.pad.steps=steps; out.push({ kind:'chord', t, steps:steps.slice(), a, r:rel }); }
      st.pad.next=t+pick(r, P.every);
    } else if(who==='glass'){
      const d=bed2Density(st, t, P.arcDepth), G=R.glass, { lo, hi }=bed2Reg(G.oct, n), pcs=st.pad.steps ? st.pad.steps.map(s=>mod(s, n)) : [0];
      const k= r()<0.35 ? (r()<0.5 ? 2 : 3) : 1;
      for(let i=0;i<k;i++){ const pc=pcs[Math.min(pcs.length-1, Math.floor(r()*pcs.length))], oct=Math.floor(pick(r, [lo/n, (hi+1)/n]));
        push({ kind:'glass', t:t+i*pick(r, [0.25, 0.8]), step:null, pc, oct, amp:0.55+0.45*r(), pan:(r()*2-1)*0.8, a:pick(r, G.attack), d:pick(r, G.decay) }); }
      st.glass.next=t+pick(r, P.glass.every)*(1.35-0.7*d)*(light ? 1/R.lighter.glass : 1);
    } else if(who==='air'){
      const d=bed2Density(st, t, P.arcDepth);
      out.push({ kind:'air', t, lvl: P.air && !light ? 0.35+0.65*d : 0, tc:R.air.tc });
      st.air.next=t+pick(r, R.air.every);
    } else if(who==='breath'){
      const p=pick(r, R.breath.every), B=st.breath;
      out.push({ kind:'breath', t, db: B.up ? P.breath : -P.breath, tc:p/5 }); B.up=!B.up; B.next=t+p/2;
    } else if(who==='cpad' || who==='cloop'){
      const layer= who==='cpad' ? 'pad' : 'loop', C=st.color[layer], first=C.first!==false;
      out.push({ kind:'color', t, layer, v:clamp(P.bright+(r()-0.5)*R.color.spread, 0, 1), tc: first ? 0.05 : pick(r, R.color.tc) }); C.first=false;
      C.next=t+pick(r, R.color.every);
    } else {
      const L=who, d=bed2Density(st, t, P.arcDepth), on= L.v<cap && (L.active ? d>L.thr-0.05 : d>L.thr+0.05); L.active=on;
      if(on){
        if(!L.phrase) L.phrase=newPhrase(st, R, P, L, n, played, answer);
        else { const u=r(); if(u<R.loops.renew){ L.phrase=newPhrase(st, R, P, L, n, played, answer); L.changes++; } else if(u<R.loops.renew+R.loops.vary){ varyPhrase(st, P, L, n, played, answer); L.changes++; } }
        for(const N of L.phrase) push({ kind:'loop', t:t+N.off, v:L.v, step:null, raw:N.step, a:N.a, h:N.h, r:N.r*(light ? R.lighter.release : 1), amp:N.amp, pan:clamp(L.pan+N.dp, -1, 1), c0:N.c0, c1:N.c1 });
        L.cycles++; }
      L.next=t+L.len;
    }
  }
  return out;
}
/* THE WORK CENSUS (the cost's deterministic proxy; the NIGHT-4 gate): the worklet's cost along a timeline, in µs per 128-frame quantum on the
   laptop. W = the measured cost of each part (NIGHT-4: the bed alone in a bare offline context, best of 7): the node with its ground and room
   always (`fixed`), and each sounding pad tone, loop note, glass note and the air. A voice sounds from its start to the end of its release
   (the worklet frees it 60 dB under its peak: a one-pole pair with τ = r / 4.5 gets there in ≈ 2.1 r); a pad tone until the next chord's
   start plus its own release; a loop note at most `hand` s after its voice's next note starts. → { mean, p95 (its heavy moments), peak, by:
   { layer: mean } } (µs) */
export const BED2_WORK=Object.freeze({ fixed:23.7, pad3:2.25, pad2:2.02, voices:3.9, horns:2.16, glass:2.01, air:4.46, free:2.1, hand:1.8 });
export function bed2Work(events, sec, o={}){
  const W=BED2_WORK, step=0.25, N=Math.ceil(sec/step), by={ fixed:W.fixed, pad:0, loop:0, glass:0, air:0 }, acc=new Float64Array(N);
  const add=(layer, t0, t1, w)=>{ for(let i=Math.max(0, Math.floor(t0/step)); i<Math.min(N, Math.ceil(t1/step)); i++) acc[i]+=w; by[layer]+=w*(Math.min(sec, t1)-Math.max(0, t0))/sec; };
  const padW= o.light ? W.pad2 : W.pad3, loopW= o.palette==='b' ? W.horns : W.voices;
  const chords=events.filter(e=>e.kind==='chord');
  chords.forEach((c, i)=>{ const end= i+1<chords.length ? chords[i+1].t : sec; for(const s of c.steps) add('pad', c.t, end+W.free*c.r, padW); });
  /* a loop voice sings one note at a time: its note ends at its own release's end, or `hand` s (to −60 dB) after its next note starts */
  const lp=events.filter(e=>e.kind==='loop');
  lp.forEach((e, i)=>{ const nx=lp.slice(i+1).find(x=>x.v===e.v), end=Math.min(e.t+e.a+e.h+W.free*e.r, nx ? nx.t+W.free*W.hand : Infinity); add('loop', e.t, end, loopW); });
  for(const e of events) if(e.kind==='glass') add('glass', e.t, e.t+e.a+W.free*e.d, W.glass);
  const airs=events.filter(e=>e.kind==='air'); airs.forEach((e, i)=>{ if(e.lvl>0) add('air', e.t, i+1<airs.length ? airs[i+1].t : sec, W.air); });
  let peak=0, sum=0; for(let i=0;i<N;i++){ const x=acc[i]+W.fixed; sum+=x; if(x>peak) peak=x; }
  const srt=Array.from(acc).sort((a,b)=>a-b), p95=srt[Math.min(N-1, Math.floor(0.95*N))]+W.fixed;
  return { mean:sum/N, p95, peak, by };
}
/* THE WAVETABLES (made once on the main thread and handed to the worklet, so nothing heavy runs on the audio thread): a sine; a warm tone
   (1, 0.28, 0.1); band-limited saws for octave zones — zone z serves fundamentals up to 27.5·2^(z+1) Hz, its harmonics stop below 0.45 of
   the rate (no aliasing) with a raised-cosine taper over the top 30 %; amplitudes k^−pow; each table peak-normalised, one guard sample */
export const BED2_TABLE=2048;
export function bed2Tables(rate, pow=1){
  const N=BED2_TABLE, sine=new Float32Array(N+1), warm=new Float32Array(N+1), zones=[], saw=[];
  for(let i=0;i<=N;i++){ const x=2*Math.PI*i/N; sine[i]=Math.sin(x); warm[i]=(Math.sin(x)+0.28*Math.sin(2*x)+0.1*Math.sin(3*x))/1.25; }
  for(let z=0; z<10; z++){ const fz=27.5*Math.pow(2, z+1), H=Math.max(1, Math.min(64, Math.floor(0.45*rate/fz))), t=new Float32Array(N+1);
    for(let k=1;k<=H;k++){ const top=0.7*H, g=Math.pow(k, -pow)*(H>3 && k>top ? 0.5+0.5*Math.cos(Math.PI*(k-top)/(H-top)) : 1); if(g<1e-6) continue;
      const w=2*Math.PI*k/N; for(let i=0;i<N;i++) t[i]+=g*Math.sin(w*i); }
    let p=0; for(let i=0;i<N;i++) p=Math.max(p, Math.abs(t[i])); for(let i=0;i<N;i++) t[i]/=p; t[N]=t[0]; zones.push(fz); saw.push(t); }
  return { size:N, sine, warm, saw, zones };
}
