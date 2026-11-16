/* RAIN-4: THE JAZZ BED's LAW — late-night jazz in the rain, as numbers (pure, rule #36; data row «RAIN jazz bed (app)»). A room's bed2 recipe may
   carry `jazz` (rooms/rain/pure/room.js); the bed's driver (apps/night/bed2.js) then runs this law instead of the bed v2 law and prices every
   step from the mood's PARENT mode (its view at the live key: rule #2 — no note table here, only degrees).
   - Steps: s = degree (s mod 7) of the parent mode in octave floor(s / 7), 0 = the tonic an octave under the playing (the bed v2 law's steps).
   - Chords are SETS OF THE PARENT MODE'S OWN DEGREES (maj7, m9, dom9 colours), so the harmony never leaves the mode; a progression of bars per
     chord, slow (60–76 bpm). Voicings rootless and close, in the comping register.
   - The bass: soft, plucked; the root on beat 1 (and the fifth on 3 at the slow moods); WALKING quarters at Evening (root, a chord tone, a
     scale step, the step leading into the next root — the approach always from the mode); always below the playing register.
   - The electric piano comps the chord in the mood's rhythm (swung eighths at Evening); the vibraphone glints now and then (a chord tone, high);
     the brushes (a switch, off by default) keep time very softly.
   - The ARC: the comping thins and fills over minutes (seeded); presets (the Music button's still / drift / glimmer) choose how much plays.
   Seeded: the same seed, mood, preset and switch give the same bed, event for event. */
import { seeded } from '../../../core/pure/dsp.js';

export const JAZZ_SEED=0x4A415A5A;
export const JAZZ_N=7;   // the parent modes are heptatonic (Lydian, Dorian, Mixolydian)
/* registers in steps: the comping, the bass, the glints; the playing begins at step 7 (the tonic of the playing hand) */
export const JAZZ_REG=Object.freeze({ comp:Object.freeze([1, 11]), bass:Object.freeze([-12, -3]), vib:Object.freeze([10, 18]), play:7 });
const mod=(s, n)=>((s%n)+n)%n;
/* a chord's tones (degrees) → a close voicing in [lo, hi]: each tone at its lowest octave ≥ the previous, starting from the lowest that fits */
export function jazzVoicing(tones, lo, hi){ const out=[]; let prev=lo-1;
  for(const d of tones){ let s=lo+mod(d-lo, JAZZ_N); while(s<=prev) s+=JAZZ_N;
    if(s<=hi){ out.push(s); prev=s; } else { let x=s-JAZZ_N; while(x>=lo && out.includes(x)) x-=JAZZ_N; if(x>=lo) out.push(x); } }
  return [...new Set(out)].sort((a, b)=>a-b); }
/* the bass step of degree d nearest to `near` inside the bass register */
export function jazzBassStep(d, near, reg=JAZZ_REG.bass){ let best=null; for(let s=reg[0]; s<=reg[1]; s++) if(mod(s, JAZZ_N)===mod(d, JAZZ_N) && (best==null || Math.abs(s-near)<Math.abs(best-near))) best=s; return best; }
/* a new state: M the mood's recipe ({ bpm, chords:[{ root, tones }], prog:[[chord, bars]…], comp:[[beat, vel]…], swing, bass:'root'|'walk'|'roomy',
   vib:{ every:[bars, bars] } }), P the preset ({ comp 0…1, vib bool, bass bool }), brush the switch */
export function jazzInit(seed, M, P, brush=false){
  const r=seeded(seed>>>0), beat=60/M.bpm;
  return { r, ar:seeded((seed^0x5EED)>>>0), M, P, brush:!!brush, beat, bar:0, at:0.3, ci:0, cBars:0, voicing:null, bassPrev:null, arc:0.5, arcNext:0, vibNext:2+Math.floor(r()*3) };
}
const chordAt=(st, k)=>{ const p=st.M.prog; return st.M.chords[p[mod(k, p.length)][0]]; };
/* the events of the bars that START in [t0, t1) (law time, s); each { t, kind:'comp'|'bass'|'vib'|'brush'|'chord', steps|step, vel, dur, pan } */
export function jazzStep(st, t0, t1){
  const out=[], M=st.M, P=st.P, b=st.beat, bar=4*b;
  while(st.at<t1){ const T=st.at;
    if(T>=t0-1e-9){
      /* the chord of this bar: the progression's entry lasts its bars */
      if(st.cBars<=0){ const p=M.prog[mod(st.ci, M.prog.length)]; st.cBars=p[1]; st.chord=M.chords[p[0]]; st.next=chordAt(st, st.ci+1);
        st.voicing=jazzVoicing(st.chord.tones, JAZZ_REG.comp[0], JAZZ_REG.comp[1]); out.push({ t:T, kind:'chord', steps:st.voicing.slice(), root:st.chord.root }); st.ci++; }
      /* the arc: every 8 bars a new density (0.35 … 1) */
      if(st.bar>=st.arcNext){ st.arc=0.35+0.65*st.ar(); st.arcNext=st.bar+8; }
      const last=st.cBars===1, sw=M.swing||0.5;
      /* the electric piano: the mood's comping rhythm; each hit kept with the preset's share × the arc (two draws per hit, always: the preset never moves a time) */
      for(const [bt, vel] of M.comp){ const u=st.r(); if(P.comp>0 && u<P.comp*st.arc){ const off=Math.floor(bt)+(bt%1 ? sw : 0);
        out.push({ t:T+off*b, kind:'comp', steps:st.voicing.slice(), vel:vel*(0.85+0.3*st.r()), dur:Math.max(0.35*b, (bt%1 ? 0.6 : 1.4)*b), pan:-0.2 }); } else st.r(); }
      /* the bass */
      if(P.bass){ const root=jazzBassStep(st.chord.root, st.bassPrev==null ? -7 : st.bassPrev);
        if(M.bass==='walk'){ const nextRoot=jazzBassStep((last ? st.next : st.chord).root, root), tones=st.chord.tones, line=[root];
          const t2=jazzBassStep(tones[1+Math.floor(st.r()*(tones.length-1))], root), t3=jazzBassStep(mod(st.chord.root+(st.r()<0.5 ? 1 : -1), JAZZ_N), t2), app=nextRoot+(st.r()<0.5 ? 1 : -1);
          line.push(t2, t3, Math.max(JAZZ_REG.bass[0], Math.min(JAZZ_REG.bass[1], app)));
          line.forEach((s, k)=>out.push({ t:T+k*b, kind:'bass', step:s, vel:k ? 0.62 : 0.78, dur:0.92*b, pan:0.05 })); st.bassPrev=line[3]; }
        else { out.push({ t:T, kind:'bass', step:root, vel:0.8, dur:(M.bass==='roomy' ? 1.9 : 3.6)*b, pan:0.05 });
          if(M.bass==='roomy' || st.r()<0.4){ const f=jazzBassStep(st.chord.root+4, root); out.push({ t:T+2*b, kind:'bass', step:f, vel:0.6, dur:1.8*b, pan:0.05 }); } else st.r();
          st.bassPrev=root; } }
      /* a vibraphone glint now and then: a chord tone, high, sometimes two in a row */
      if(P.vib && st.bar>=st.vibNext){ const tones=st.chord.tones, d=tones[Math.floor(st.r()*tones.length)], s=jazzBassStep(d, 14, JAZZ_REG.vib), at=T+(1+Math.floor(st.r()*3))*b+(st.r()<0.5 ? sw*b : 0);
        out.push({ t:at, kind:'vib', step:s, vel:0.5+0.3*st.r(), dur:3*b, pan:0.4 });
        if(st.r()<0.35){ const d2=tones[Math.floor(st.r()*tones.length)]; out.push({ t:at+b*0.5, kind:'vib', step:jazzBassStep(d2, s, JAZZ_REG.vib), vel:0.42, dur:2.5*b, pan:0.45 }); }
        const E=M.vib.every; st.vibNext=st.bar+E[0]+Math.floor(st.r()*(E[1]-E[0]+1)); }
      /* the brushes: a soft tap on every beat, a longer sweep on 2 and 4 (the switch) */
      if(st.brush) for(let k=0;k<4;k++) out.push({ t:T+k*b, kind:'brush', vel:k%2 ? 0.5 : 0.32, dur:k%2 ? 0.42*b : 0.16*b, pan:-0.1 });
    }
    st.at+=bar; st.bar++; st.cBars--; }
  return out.sort((x, y)=>x.t-y.t);
}
/* every degree a recipe's chords use (the row: all inside the parent mode, 0…6) and the melody's set inside the parent mode's degrees */
export const jazzDegrees=M=>[...new Set(M.chords.flatMap(c=>[c.root, ...c.tones]))].sort((a, b)=>a-b);
