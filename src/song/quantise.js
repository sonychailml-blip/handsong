/* REC3 part 2 (stage 3) — QUANTISE AFTER RECORDING (ED3) — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web Audio;
   imports only song/, scales.js and config.js; the live choices, the transport and the engine's declarations come through song/env.js.
   Moved verbatim; the edited lines are marked REC3. */
import { EDIT_GAP, EDIT_MIN_LEN, EDIT_ROLE, bendTrim, editBatch, editLayer, keyClash } from './edit-notes.js';
import { chaseKind, songSegs } from './notes.js';
import { editGroup, selGroups } from './edit-group.js';
import { events } from './store.js';

/* ═══ ED3: QUANTISE AFTER RECORDING ═══
   The selection's edges go toward the nearest line of a grid of `step` beats by `amt` (1 = onto the line); what: 'start' | 'end' | 'both'.
   A note's START moves the whole note (its length kept); a pitch change INSIDE a line moves by itself — the boundary moves, the neighbour
   gets longer or shorter, the glide stays one note (user decision 4: no detach); a note's END moves its own note-off. An edge that would
   leave a segment shorter than EDIT_MIN_LEN stays. Value changes inside a segment keep their beats; those a moved edge passes over are
   dropped (as a resize drops them past a new end). A note reaching into another note of its key takes a fresh identity (E1); a shortened
   theremin note trims its bend (S5). A note closed by the next note's start (no own note-off) keeps its start and end. Pitches never
   change. Drum hits quantise with starts. One history entry. → the selected events, or false (nothing moved). */
const quantTo=(t,step,amt)=> t + amt*(Math.round(t/step)*step - t);
function quantPlan(n,sel,step,amt,S,E){
  const R=EDIT_ROLE[n.role]; if(!R) return null;
  const SV=songSegs(), segs=[];
  for(const e of n.evs){ const g=SV.byEv.get(e); if(g && g.ev===e) segs.push(g); }
  const m=segs.length; if(!m) return null;
  const on=i=>sel.has(segs[i].ev), X=segs[m-1].endEv, own=!!(X && chaseKind(X.fn)==='f');
  let d= S && on(0) && own ? quantTo(n.start,step,amt)-n.start : 0; if(Math.abs(d)<=1e-9) d=0;
  const nb=segs.map(g=>g.start+d), moved=new Array(m+1).fill(false);
  for(let i=1;i<m;i++){
    if(!((S&&on(i))||(E&&on(i-1)))) continue;
    const right= i+1<m ? segs[i+1].start+d : own ? X.t+d : n.end!=null ? n.end+d : Infinity;
    const q=quantTo(nb[i],step,amt);
    if(Math.abs(q-nb[i])>1e-9 && q>=nb[i-1]+EDIT_MIN_LEN-1e-9 && q<=right-EDIT_MIN_LEN+1e-9){ nb[i]=q; moved[i]=true; }
  }
  let te= own ? X.t+d : null;
  if(own && E && on(m-1)){
    const last=nb[m-1];
    let g=Math.round(te/step)*step; if(g<last+EDIT_MIN_LEN) g=(Math.floor(last/step+1e-9)+1)*step;   // never onto its own start: the next line
    const q=te+amt*(g-te);
    if(Math.abs(q-te)>1e-9 && q>=last+EDIT_MIN_LEN-1e-9){ te=q; moved[m]=true; }
  }
  if(!d && !moved.some(Boolean)) return [];
  const s0=n.start, e0= own ? X.t : n.end, ne= own ? te : e0;
  const fr= (nb[0]<s0-1e-9 && keyClash(n,nb[0],s0)) || (ne!=null && e0!=null && ne>e0+1e-9 && keyClash(n,e0,ne)) ? R.fresh(n.layer) : null;
  const H=n.head, B=H&&H.a&&H.a.bend, nbend= own && B && B.length && te<X.t+d-1e-9 ? bendTrim(B, te-(H.t+d)) : B;
  const list=[], drop=[];
  for(const e of n.evs){
    const g=SV.byEv.get(e), i= g ? segs.indexOf(g) : -1;
    let t=e.t+d;
    if(e===X) t=te;
    else if(g && g.ev===e) t=nb[i];
    else if(i>=0){ const hi= i+1<m ? nb[i+1] : te;
      if((moved[i] && t<=nb[i]+EDIT_GAP) || (moved[i+1] && hi!=null && t>=hi-EDIT_GAP)){ drop.push(e); continue; } }
    const trim= e===H && nbend!==B;
    if(Math.abs(t-e.t)<=1e-9 && !fr && !trim) continue;
    list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t, a: fr||trim ? {...e.a, ...fr, ...(trim?{bend:nbend}:null)} : e.a} });
  }
  if(drop.length) list.push({ kind:'del', evs:drop });
  return list;
}
function editQuantSel(evs,step,what,amt){
  const ly=editLayer(); if(!evs||!evs.length||ly==null||!(step>0)) return false;
  amt=Math.max(0,Math.min(1,amt==null?1:amt)); if(!amt) return false;
  const S=what!=='end', E=what!=='start';
  return editGroup(()=>{
    const G=selGroups(evs,ly); if(!G) return false;
    if(S && G.drums.length){
      const list=[]; for(const e of G.drums){ const t=quantTo(e.t,step,amt); if(Math.abs(t-e.t)>1e-9) list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t, a:e.a} }); }
      if(list.length && !editBatch(list)) return false; }
    /* pitched: the selected defining events by note, notes in start order; each note is re-read before its own edit (an earlier note may
       have taken a fresh key) */
    const byNote=new Map();
    for(const {n,L} of G.whole) byNote.set(n, L.map(s=>s.ev));
    for(const s of G.parts){ const L=byNote.get(s.note)||[]; L.push(s.ev); byNote.set(s.note,L); }
    for(const [,L] of [...byNote].sort((a,b)=>a[0].start-b[0].start)){
      const g=songSegs().byEv.get(L[0]); if(!g) return false;
      const P=quantPlan(g.note, new Set(L), step, amt, S, E); if(P===null) return false;
      if(P.length && !editBatch(P)) return false;
    }
    return evs.filter(e=>events.includes(e));
  });
}

export { editQuantSel };
