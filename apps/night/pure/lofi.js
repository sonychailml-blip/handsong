/* RAIN-4c / RAIN-4d: THE ROOM'S MUSIC AS LO-FI (pure, rule #36; data row «RAIN lo-fi bed (app)»). Lo-fi — the «rain at night in the city» genre: jazz
   chords on a warm electric piano, a laid-back beat, vinyl and tape. RAIN-4d (the founder: «an endless lo-fi radio, not a 90-second loop»): a PIECE
   (apps/night/rooms/rain/pure/lofi/*.js, readable, editable) gives the material and the rules; every bar is DRAWN from them by seeded chance — the
   harmony stays recognisable, the playing never repeats:
   - 2–4 alternative PROGRESSIONS (4 or 8 bars, all of the piece's safe chords) that follow each other by its `flow`;
   - SECTIONS of 8 bars: main, thin (an instrument rests), or a break (drums and bass out, back with a fill);
   - the DRUMS vary bar to bar (kick variants, ghost snares, hat ghosts, an open hat) with generated fills at a section's end;
   - the BASS takes a line from its pool and varies it within rules (approach notes into the next root, an octave pop, a note left out);
   - the ELECTRIC PIANO varies its comping rhythm (two bars each) and its voicing (smooth leading, sometimes spread), with anticipations;
   - now and then the VIBRAPHONE or the GUITAR plays a short generated PHRASE inside the mode, every note safe over the bar's chord.
   Swung 16ths, snare and hats behind the beat, small timing and velocity variation — all from a hash of (seed, bar, step).
   THE LEVELS (the Music button): quiet — the piano; groove — + bass and beat; full — + vinyl crackle, vibraphone, guitar. A level change and a piece
   change wait for the next BAR LINE; each layer's gain then ramps over one bar.
   Steps: s = degree (s mod 7) of the parent mode in octave floor(s / 7); 7 = the playing hand's tonic (bedjazz.js). */
import { jazzBassStep, JAZZ_N } from './bedjazz.js';

export const LOFI_FORMAT='handsong/lofi', LOFI_VERSION=2;
export const LOFI_DRUMS=Object.freeze(['kick', 'snare', 'rim', 'hat', 'ohat', 'shaker', 'ghost']);
export const LOFI_LAYERS=Object.freeze(['ep', 'bass', 'beat', 'crackle', 'vib', 'gtr']);
export const LOFI_LEVELS=Object.freeze({ quiet:Object.freeze(['ep']), groove:Object.freeze(['ep', 'bass', 'beat']), full:Object.freeze(['ep', 'bass', 'beat', 'crackle', 'vib', 'gtr']) });
export const LOFI_REG=Object.freeze({ ep:Object.freeze([2, 12]), bass:Object.freeze([-12, -3]), vib:Object.freeze([11, 19]), gtr:Object.freeze([6, 15]) });
/* the arrangement's chances (my choices): a section main / thin / break; the phrase chance per 4 bars (full level) */
export const LOFI_GEN=Object.freeze({ section:Object.freeze({ main:0.62, thin:0.26, brk:0.12 }), phrase:0.5, kickAlt:0.35, kickDrop:0.12, ghost:0.6, hatGhost:0.45, open:0.22, fillMid:0.3,
  bassApp:0.4, bassOct:0.2, bassRest:0.12, push:0.28, spread:0.22 });
const TOK=Object.freeze({ R:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7, 9:8 });
const mod=(s, n)=>((s%n)+n)%n;
/* the seeded hash: (seed, bar, k) → 0…1; fixed → always 0.5 (the probes' CONTROL: a piece that never varies) */
const hsh=(a, b, c)=>{ let h=(Math.imul(a|0, 374761393)+Math.imul(b|0, 668265263)+Math.imul(c|0, 1274126177))>>>0; h=Math.imul(h^(h>>>13), 1274126177)>>>0; h=Math.imul(h^(h>>>16), 2246822519)>>>0; return ((h^(h>>>15))>>>0)/4294967296; };
/* null = a valid piece; else ONE line naming the problem */
export function lofiCheck(P){ if(!P || P.format!==LOFI_FORMAT || P.version!==LOFI_VERSION) return 'format / version';
  if(!(P.bpm>=60 && P.bpm<=96)) return 'bpm 60…96'; if(!(P.swing>=0.5 && P.swing<=0.62)) return 'swing 0.5…0.62';
  if(!P.lay || !(P.lay.snare>=0 && P.lay.snare<=0.04 && P.lay.hat>=0 && P.lay.hat<=0.04)) return 'lay: snare, hat 0…0.04 s';
  for(const [k, c] of Object.entries(P.chords||{})) if(!(Number.isInteger(c.root) && c.root>=0 && c.root<JAZZ_N && c.tones.length>=3 && c.tones.every(t=>Number.isInteger(t) && t>=0 && t<JAZZ_N))) return `chords.${k}: a root and 3+ tones, degrees 0…6`;
  const progs=Object.entries(P.progs||{}); if(progs.length<2 || progs.length>4) return 'progs: 2…4 progressions';
  for(const [k, L] of progs){ if(![4, 8].includes(L.length)) return `progs.${k}: 4 or 8 bars`; for(const c of L) if(!P.chords[c]) return `progs.${k}: no chord «${c}»`; if(!(P.flow && Array.isArray(P.flow[k]) && P.flow[k].length && P.flow[k].every(x=>P.progs[x]))) return `flow.${k}`; }
  if(!P.progs[P.first]) return 'first';
  if(!P.ep || !P.ep.length) return 'ep: rhythms'; for(const V of P.ep) for(const h of V) if(!(h[0]>=0 && h[0]<16 && h[1]>0 && h[2]>0 && h[2]<=1)) return 'ep: [step 0…15, length, velocity]';
  if(!P.bass || !P.bass.length) return 'bass: lines'; for(const V of P.bass) for(const h of V) if(!(h[0]>=0 && h[0]<16) || !(h[1] in TOK || h[1]==='app' || h[1]==='app+')) return `bass: «${h[1]}»`;
  if(!P.grooves || !P.grooves.length) return 'grooves'; for(const G of P.grooves){ if(!G.kick || !G.back || !['8', '16', 'off8'].includes(G.hats)) return 'a groove: kick, back, hats 8 | 16 | off8'; for(const h of [...G.kick, ...(G.kickAlt||[])]) if(!(h[0]>=0 && h[0]<16)) return 'a groove: a kick step'; if(!['snare', 'rim'].includes(G.back)) return 'a groove: back snare | rim'; }
  if(!P.motifs || !P.motifs.length) return 'motifs (phrase rhythms)';
  return null; }
export const lofiBarSec=P=>4*60/P.bpm;
/* every chord the piece can play (the row: each in its parent mode, each safe under the playing hand's notes) */
export const lofiChords=P=>[...new Set(Object.values(P.progs).flat())].map(k=>({ name:k, ...P.chords[k] }));
/* a rootless voicing led smoothly from the previous one: every inversion of the tones inside [lo, hi], the one moving least */
export function lofiVoice(tones, prev, lo=LOFI_REG.ep[0], hi=LOFI_REG.ep[1]){ const T=[...new Set(tones.map(t=>mod(t, JAZZ_N)))], cands=[];
  for(let r=0;r<T.length;r++) for(let base=lo-JAZZ_N;base<=hi;base++){ if(mod(base, JAZZ_N)!==T[r]) continue; const v=[base]; for(let k=1;k<T.length;k++){ const d=T[(r+k)%T.length]; let s=v[k-1]+1; while(mod(s, JAZZ_N)!==d) s++; v.push(s); }
    if(v[0]>=lo && v[v.length-1]<=hi) cands.push(v); }
  if(!cands.length) return T.map(d=>lo+mod(d-lo, JAZZ_N)).sort((a, b)=>a-b);
  const mid=(lo+hi)/2, cost=v=>prev && prev.length ? v.reduce((a, s, i)=>a+Math.abs(s-prev[Math.min(i, prev.length-1)]), 0) : Math.abs(v.reduce((a, s)=>a+s, 0)/v.length-mid);
  return cands.reduce((a, b)=>cost(b)<cost(a)-1e-9 ? b : a); }
/* the safe notes over a chord: its own tones, and the mode's others unless a semitone above one of them (pc: the parent's pitch classes) */
export function lofiSafe(ch, pc){ const own=[ch.root, ...ch.tones].map(k=>mod(k, JAZZ_N)), pcs=own.map(k=>pc[k]);
  return [0, 1, 2, 3, 4, 5, 6].filter(k=>own.includes(k) || !pcs.some(q=>mod(pc[k]-q, 12)===1)); }
/* a new player at law time `at` (a bar line): lv the level's name; o.seed (the piece's own by default), o.pc (the parent's pitch classes, for the
   phrases' safe notes: 7 numbers), o.fixed (the probes' CONTROL only: no chance at all) */
export function lofiInit(P, lv='full', o={}){ const on=new Set(LOFI_LEVELS[lv]||LOFI_LEVELS.full), g={}; for(const L of LOFI_LAYERS) g[L]=[[0, on.has(L) ? 1 : 0]];
  return { P, at:o.at==null ? 0.3 : o.at, bar:0, prog:P.first, pi:0, pn:0, seed:(o.seed==null ? (P.seed||1) : o.seed)>>>0, pc:o.pc||[0, 2, 4, 5, 7, 9, 11], fixed:!!o.fixed,
    done:false, stopAt:Infinity, g, lv, prevV:null, bassPrev:null, sec:null, epRh:0, ph:null }; }
export function lofiBarAt(st, t){ const B=lofiBarSec(st.P); return t<=st.at ? st.at : st.at+Math.ceil((t-st.at)/B-1e-9)*B; }
export function lofiGain(st, L, t){ const G=st.g[L]; let v=G[0][1]; for(let i=0;i<G.length;i++){ const [ti, gi]=G[i]; if(t<ti){ if(i===0) return gi; const [t0, g0]=G[i-1]; return g0+(gi-g0)*(t-t0)/(ti-t0); } v=gi; } return v; }
export function lofiLevel(st, lv, t){ const at=lofiBarAt(st, t), B=lofiBarSec(st.P), on=new Set(LOFI_LEVELS[lv]||LOFI_LEVELS.full), out=[]; st.lv=lv;
  for(const L of LOFI_LAYERS){ const g0=lofiGain(st, L, at), g1=on.has(L) ? 1 : 0; st.g[L]=st.g[L].filter(p=>p[0]<at).concat([[at, g0], [at+B, g1]]); if(g0!==g1) out.push({ t:at, kind:'layer', layer:L, gain:g1, ramp:B }); }
  return out; }
export function lofiStop(st, t){ st.stopAt=lofiBarAt(st, t); return st.stopAt; }
export function lofiFadeIn(st){ const B=lofiBarSec(st.P); for(const L of LOFI_LAYERS){ const g=st.g[L][st.g[L].length-1][1]; st.g[L]=[[st.at, 0], [st.at+B, g]]; } }
const t16=(P, T, p)=>{ const s16=60/P.bpm/4, e=Math.floor(p/2)*2, odd=p-e; return T+(e+(odd ? 2*P.swing*odd : 0))*s16; };
/* the section of the bar (8 bars each): which instruments play in it → { kind, beat, bass, vib, gtr, fill (its last bar fills) } */
function sectionOf(st, bar){ const k=Math.floor(bar/8), r=st.fixed ? 0.1 : hsh(st.seed, k, 901), S=LOFI_GEN.section;
  if(bar<8 || st.fixed) return { kind:'main', beat:true, bass:true, vib:true, gtr:true };
  const kind= r<S.main ? 'main' : r<S.main+S.thin ? 'thin' : 'brk', r2=hsh(st.seed, k, 902);
  if(kind==='thin') return { kind, beat:r2>0.25, bass:r2<0.25 || r2>0.5, vib:r2<0.6, gtr:r2>0.4 };
  if(kind==='brk') return { kind, beat:false, bass:false, vib:true, gtr:true, brk:4 };   // the first 4 bars without drums and bass
  return { kind, beat:true, bass:true, vib:true, gtr:true }; }
/* the events of the bars that START in [t0, t1) (law time, s): { t, kind:'chord'|'ep'|'bass'|'drum'|'vib'|'gtr'|'pump', layer, n (its bar), … vel, dur, pan } */
export function lofiStep(st, t0, t1){ const out=[], P=st.P, B=lofiBarSec(P), s16=B/16, G=LOFI_GEN;
  while(!st.done && st.at<t1 && st.at<st.stopAt-1e-9){ const T=st.at, bar=st.bar, L=P.progs[st.prog], ch=P.chords[L[st.pi]], last=st.pi===L.length-1;
    const next= last ? P.flow[st.prog][st.fixed ? 0 : Math.floor(hsh(st.seed, st.pn, 77)*P.flow[st.prog].length)] : st.prog, nx=P.chords[last ? P.progs[next][0] : L[st.pi+1]];
    const r=k=>st.fixed ? 0.5 : hsh(st.seed, bar, k), sec=sectionOf(st, bar), inSec=bar%8, brkNow=sec.brk && inSec<sec.brk, fill=inSec===7 || (sec.brk && inSec===sec.brk-1) || (inSec===3 && r(5)<G.fillMid);
    const hum=(k, p, ms)=>(r(1000+k*37+p)-0.5)*2*ms/1000, vh=(k, p)=>1+(r(2000+k*41+p)-0.5)*0.18, gn=(lay, t)=>lofiGain(st, lay, t);
    /* the piano's voicing: led smoothly, sometimes spread (the second from the top an octave down) */
    let voice=lofiVoice(ch.tones, st.prevV); st.prevV=voice; if(r(11)<G.spread && voice.length>=4){ const v=voice.slice(); v[v.length-2]-=JAZZ_N; if(v[v.length-2]>=LOFI_REG.ep[0]-2) voice=v.sort((a, b)=>a-b); }
    if(T>=t0-1e-9){ out.push({ t:T, kind:'chord', steps:voice.slice(), root:ch.root, prog:st.prog, bar:st.pi, n:bar, sec:sec.kind });
      /* the piano: a rhythm per two bars from the pool; the bar's last off-beat may push the next chord in */
      if(bar%2===0) st.epRh=st.fixed ? 0 : Math.floor(r(21)*P.ep.length); const rh=P.ep[st.epRh], push=!last && r(22)<G.push && !rh.some(h=>h[0]>=13);
      for(const [p, len, vel] of rh){ const t=t16(P, T, p)+hum(1, p, 7), g=gn('ep', t); if(g>0) out.push({ t, kind:'ep', layer:'ep', n:bar, steps:voice.slice(), vel:vel*vh(1, p)*g, dur:len*s16, pan:-0.12 }); }
      if(push){ const nv=lofiVoice(nx.tones, voice), t=t16(P, T, 14)+hum(1, 14, 6), g=gn('ep', t); if(g>0) out.push({ t, kind:'ep', layer:'ep', n:bar, steps:nv, vel:0.42*g, dur:4*s16, pan:-0.12, push:true }); }
      /* the bass: a line from its pool (kept two bars), varied: an approach into the next root, an octave pop, a rest */
      if(sec.bass && !brkNow){ const line=P.bass[st.fixed ? 0 : Math.floor(hsh(st.seed, bar>>1, 31)*P.bass.length)];
        for(const [p, tok, len, vel] of line){ if(p>0 && r(40+p)<G.bassRest) continue; const t=t16(P, T, p)+hum(2, p, 5), g=gn('bass', t); const deg= tok==='app' ? nx.root-1 : tok==='app+' ? nx.root+1 : ch.root+TOK[tok];
          const s=jazzBassStep(deg, st.bassPrev==null ? -7 : st.bassPrev, LOFI_REG.bass); st.bassPrev=s; if(g>0) out.push({ t, kind:'bass', layer:'bass', n:bar, step:s, vel:(vel||0.8)*vh(2, p)*g, dur:(len||2)*s16, pan:0.05 }); }
        if(r(32)<G.bassApp && !line.some(h=>h[0]>=14)){ const t=t16(P, T, 14)+hum(2, 14, 5), g=gn('bass', t), s=jazzBassStep(nx.root+(r(33)<0.5 ? -1 : 1), st.bassPrev, LOFI_REG.bass); st.bassPrev=s; if(g>0) out.push({ t, kind:'bass', layer:'bass', n:bar, step:s, vel:0.6*g, dur:2*s16, pan:0.05 }); }
        if(r(34)<G.bassOct && !line.some(h=>h[0]===10)){ const t=t16(P, T, 10)+hum(2, 10, 5), g=gn('bass', t), s=jazzBassStep(ch.root, (st.bassPrev||-7)+7, LOFI_REG.bass); if(g>0) out.push({ t, kind:'bass', layer:'bass', n:bar, step:s, vel:0.5*g, dur:2*s16, pan:0.05 }); } }
      /* the drums: the section's groove, varied bar to bar; a generated fill at the section's end */
      if(sec.beat && !brkNow){ const Gr=P.grooves[st.fixed ? 0 : Math.floor(hsh(st.seed, bar>>3, 51)*P.grooves.length)], hits=[];
        for(const [p, v] of Gr.kick) if(!(p>0 && r(60+p)<G.kickDrop)) hits.push([p, 'kick', v]);
        if(Gr.kickAlt && Gr.kickAlt.length && r(61)<G.kickAlt){ const a=Gr.kickAlt[Math.floor(r(62)*Gr.kickAlt.length)]; if(!hits.some(h=>h[0]===a[0])) hits.push([a[0], 'kick', a[1]]); }
        hits.push([4, Gr.back, Gr.backV||0.6], [12, Gr.back, (Gr.backV||0.6)*1.05]);
        const hs= Gr.hats==='16' ? [0, 2, 4, 6, 8, 10, 12, 14] : Gr.hats==='off8' ? [2, 6, 10, 14] : [0, 2, 4, 6, 8, 10, 12, 14];
        for(const p of hs) hits.push([p, 'hat', (p%4===0 ? 0.32 : 0.24)*(Gr.hatV||1)]);
        if(Gr.hats==='16') for(const p of [1, 5, 9, 13]) if(r(70+p)<G.hatGhost) hits.push([p, 'hat', 0.11]);
        if(r(80)<G.open){ const p=r(81)<0.5 ? 14 : 6; const i=hits.findIndex(h=>h[0]===p && h[1]==='hat'); if(i>=0) hits.splice(i, 1); hits.push([p, 'ohat', 0.24]); }
        if(Gr.shaker) for(const p of [1, 3, 5, 7, 9, 11, 13, 15]) hits.push([p, 'shaker', 0.1+0.03*(p%4===3)]);
        const ng=r(90)<G.ghost ? 1+Math.floor(r(91)*2) : 0; for(let k=0;k<ng;k++){ const p=[3, 7, 9, 11, 15][Math.floor(r(92+k)*5)]; if(!hits.some(h=>h[0]===p && h[1]!=='hat' && h[1]!=='shaker')) hits.push([p, 'ghost', 0.13+0.05*r(95+k)]); }
        let H=hits; if(fill){ const from=r(100)<0.5 ? 12 : 8; H=hits.filter(h=>h[0]<from || h[1]==='hat' && h[0]%4===0); for(let p=from;p<16;p++) if(r(110+p)<0.55+0.3*(p-from)/(16-from)){ const kind=r(130+p)<0.65 ? Gr.back : r(150+p)<0.5 ? 'ghost' : 'kick'; H.push([p, kind, (0.28+0.4*(p-from)/(16-from))*(kind==='ghost' ? 0.6 : 1)]); } }
        for(const [p, dr, vel] of H){ const lay= dr==='snare' || dr==='rim' || dr==='ghost' ? P.lay.snare : dr==='hat' || dr==='ohat' || dr==='shaker' ? P.lay.hat : 0, t=t16(P, T, p)+lay+hum(3, p+16*LOFI_DRUMS.indexOf(dr), dr==='kick' ? 3 : 6), g=gn('beat', t);
          if(g>0){ out.push({ t, kind:'drum', layer:'beat', n:bar, drum:dr, vel:vel*vh(3, p)*g, pan: dr==='hat' || dr==='ohat' ? 0.22 : dr==='shaker' ? -0.3 : dr==='rim' ? -0.08 : 0 }); if(dr==='kick') out.push({ t, kind:'pump', layer:'beat', n:bar, vel:vel*g }); } } }
      /* a phrase now and then (per 4 bars): the vibraphone or the guitar, 3–6 notes on one of the piece's motif rhythms, each a safe note over its bar's
         chord, mostly by step, inside the instrument's register */
      if(bar%4===0){ st.ph=null; if(r(200)<G.phrase){ const kind=r(201)<0.5 ? 'vib' : 'gtr'; if(sec[kind]) st.ph={ kind, at:bar+(r(202)<0.5 ? 1 : 2), mo:P.motifs[Math.floor(r(203)*P.motifs.length)], s:null }; } }
      if(st.ph && st.ph.at===bar){ const ph=st.ph, R=LOFI_REG[ph.kind], safe=lofiSafe(ch, st.pc); let s=ph.s==null ? Math.round((R[0]+R[1])/2) : ph.s;
        ph.mo.forEach(([p, len], k)=>{ let best=null; for(let c=R[0];c<=R[1];c++){ if(!safe.includes(mod(c, JAZZ_N))) continue; const want=k===0 ? Math.round((R[0]+R[1])/2) : s+(r(210+k)<0.5 ? -1 : 1)*(r(220+k)<0.7 ? 1 : 2); if(best==null || Math.abs(c-want)<Math.abs(best-want)) best=c; }
          s=best; const t=t16(P, T, p)+hum(4, p, 9), g=gn(ph.kind, t); if(g>0) out.push({ t, kind:ph.kind, layer:ph.kind, n:bar, step:s, vel:0.5+0.15*r(230+k), dur:(len||4)*s16, pan:ph.kind==='vib' ? 0.35 : -0.35 }); });
        st.ph=null; } }
    st.at+=B; st.bar++; st.pi++; if(st.pi>=L.length){ st.pi=0; st.prog=next; st.pn++; } }
  return out.sort((x, y)=>x.t-y.t); }
