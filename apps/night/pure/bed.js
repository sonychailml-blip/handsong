/* NIGHT-3 stage 4: THE MUSIC BED's LAW — what plays and when, as numbers (pure, rule #36; data row «NIGHT music bed law (app)»). The sound is
   apps/night/sound/bed.js, the live driver apps/night/bed.js. The bed keeps its OWN slow clock (the user: it never steps back while you play):
   chords every `every` s, glimmer every `glim.every` s, each pad voice's filter drifting on its own — none of it is timed by your notes.
   - A chord = `voices` notes of the scale's own degrees, stacked every other degree (the scale's own colour: in a pentatonic, open sounds), placed
     in the pad range below the playing and voiced by the smallest total motion from the last chord (a voice whose note stays, stays).
   - The next chord's root: the tonic a little more often, a neighbour root more often than a far one, the same root rarely.
   - RESPONSE (a switch, off by default): the next chord LEANS toward the notes you played in the last `answer.window` s — a root whose chord holds
     more of them weighs more. Only WHICH chord comes next, never WHEN: nothing sounds at the moment you play, so the bed can't pass for your notes.
   - Steps: an integer s = a degree of the scale (s mod n) in a chord-register octave (floor(s / n)); 0 = the tonic in the drone's register.
   Seeded: the same seed, the same scale size and the same played notes give the same bed. */
import { seeded } from '../../../core/pure/dsp.js';

export const BED_OFF='off', BED_PRESETS=Object.freeze(['still','drift','glimmer']);
export const BED_ANSWER=Object.freeze({ window:20, weight:2.2 });   // the response: how far back, and how strongly a played note pulls
/* the Music button's next value: off → still → drift → glimmer → off */
export const bedNext=cur=>{ const L=[BED_OFF, ...BED_PRESETS], i=L.indexOf(cur); return L[(i+1)%L.length]; };
const pick=(r, lo, hi)=>lo+r()*(hi-lo);
/* the pad range in steps for a scale of n degrees: from `lo` of a period below the tonic up to the degree under the next tonic (the playing starts there) */
export const padRange=(B, n)=>({ lo:Math.ceil(B.pad.lo*n), hi:n-1 });
/* the chord on root r: `voices` pitch classes stacked every other degree */
export const chordPcs=(r, voices, n)=>Array.from({ length:voices }, (_,k)=>((r+2*k)%n+n)%n);
/* voice-leading: pitch classes → steps in [lo, hi], each voice as close to its last step as possible (all orders tried; no two voices on one step) */
export function voiceLead(prev, pcs, n, lo, hi){
  const cands=pc=>{ const out=[]; for(let s=lo; s<=hi; s++) if(((s%n)+n)%n===pc) out.push(s); return out; };
  const C=pcs.map(cands), V=pcs.length, mid=(lo+hi)/2;
  let best=null, bestCost=Infinity;
  const perms=a=>a.length<2 ? [a] : a.flatMap((x,i)=>perms([...a.slice(0,i), ...a.slice(i+1)]).map(p=>[x, ...p]));
  for(const order of perms([...Array(V).keys()])){
    const steps=[]; let cost=0, ok=true;
    for(let v=0; v<V; v++){ const opts=C[order[v]]; if(!opts.length){ ok=false; break; }
      const ref= prev && prev[v]!=null ? prev[v] : mid - (V-1) + 2*v;   // first chord: a close spread around the range's middle
      let b=null, bc=Infinity; for(const s of opts){ if(steps.includes(s)) continue; const c=Math.abs(s-ref); if(c<bc){ bc=c; b=s; } }
      if(b==null){ ok=false; break; } steps.push(b); cost+=bc; }
    if(ok && cost<bestCost){ bestCost=cost; best=steps; } }
  return best;
}
/* the weights of every root for the next chord (exported for the row) */
export function rootWeights(cur, n, voices, played, answer){
  const w=[];
  for(let r=0; r<n; r++){
    const d=cur==null ? 2 : Math.min((r-cur+n)%n, (cur-r+n)%n);
    let x= d===0 ? 0.15 : d===1 ? 1.5 : d===2 ? 1 : 0.7;
    if(r===0) x*=1.6;
    if(answer && played.length){ const pcs=chordPcs(r, voices, n), hit=played.filter(p=>pcs.includes(p)).length; x*=1+BED_ANSWER.weight*hit/played.length; }
    w.push(x); }
  return w;
}
/* a new bed state (the law's clock starts at 0) */
export function bedInit(seed){ return { r:seeded(seed>>>0), root:null, steps:null, nextChord:0.4, nextGlim:null, nextDrift:[], voices:0 }; }
/* soon a new chord (the scale changed: the next chord comes from the new scale at once) */
export function bedSoon(st, t){ st.nextChord=Math.min(st.nextChord, t+0.3); }
/* all events up to `until` (law seconds), in time order; P the preset, B the recipe, n the scale's size, played the pitch classes of your recent
   notes (only used with answer on) → [{ kind:'chord', t, steps } | { kind:'glim', t, pc, amp, pan } | { kind:'drift', t, v, k }] */
export function bedStep(st, B, P, n, until, played=[], answer=false){
  const out=[], { lo, hi }=padRange(B, n);
  if(st.voices!==P.voices){ st.voices=P.voices; st.steps=null; st.nextDrift=Array.from({ length:P.voices }, (_,v)=>st.nextChord+0.5+v*1.3); }
  if(P.glim && st.nextGlim==null) st.nextGlim=st.nextChord+pick(st.r, P.glim.every[0], P.glim.every[1])*0.5;
  if(!P.glim) st.nextGlim=null;
  for(;;){
    const tc=st.nextChord, tg=st.nextGlim==null ? Infinity : st.nextGlim, td=Math.min(...st.nextDrift), t=Math.min(tc, tg, td);
    if(!(t<until)) break;
    if(t===tc){
      const w=rootWeights(st.root, n, P.voices, played, answer), sum=w.reduce((a,b)=>a+b,0); let u=st.r()*sum, r=0; while(r<n-1 && u>=w[r]){ u-=w[r]; r++; }
      const steps=voiceLead(st.steps, chordPcs(r, P.voices, n), n, lo, hi);
      if(steps){ st.root=r; st.steps=steps; out.push({ kind:'chord', t, steps:steps.slice() }); }
      st.nextChord=t+pick(st.r, P.every[0], P.every[1]);
    } else if(t===tg){
      const pcs=st.steps ? st.steps.map(s=>((s%n)+n)%n) : [0];
      out.push({ kind:'glim', t, pc:pcs[Math.floor(st.r()*pcs.length)], amp:0.55+0.45*st.r(), pan:(st.r()*2-1)*0.7 });
      st.nextGlim=t+pick(st.r, P.glim.every[0], P.glim.every[1]);
    } else {
      const v=st.nextDrift.indexOf(td); out.push({ kind:'drift', t, v, k:1+(st.r()*2-1)*P.drift.depth });
      st.nextDrift[v]=t+pick(st.r, P.drift.every[0], P.drift.every[1]);
    }
  }
  return out;
}
