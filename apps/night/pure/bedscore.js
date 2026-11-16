/* RAIN-4b: A COMPOSED PIECE PLAYED FROM ITS SCORE (pure, rule #36; data row «RAIN jazz bed (app)»). The founder: the generated jazz «sounds bad» —
   jazz needs form. A score (apps/night/rooms/rain/pure/scores/*.js, written by hand, readable, editable) holds one piece: its parent mode and its
   chords as sets of the parent's own degrees, its sections (bars of chords, the bass pattern, the drum groove, the comping rhythm, the fill at
   the section's end), its form (intro, A, B, A, an ending) with a loop point, its tempo and its feel (straight or swung eighths). Nothing is
   random: the same score plays the same notes.
   - Steps: s = degree (s mod 7) of the parent mode in octave floor(s / 7); 7 is the playing hand's tonic (bedjazz.js's convention).
   - The bass, written per pattern as [beat, token, beats]: R the chord's root, 3 / 5 / 6 / 7 the chord's third, fifth, sixth, seventh (scale steps
     up from the root), 8 the root an octave up, app / app+ a scale step under / over the NEXT bar's root (the approach); each note at the octave
     nearest the one before, inside the bass register.
   - The drums, written per groove as [beat, drum, velocity, beats]: swish (a brush sweep), tap (a brush tap), kick, ride, hat (the foot); the
     section's last bar takes the fill instead from the fill's first beat on.
   - The comping, written per rhythm as [beat, beats, velocity]: the bar's chord in a close voicing in the comping register.
   - The vibraphone, written per section as [bar (1-based), [[beat, step, beats, velocity]…]].
   Presets (the Music button): what plays — { comp, bass, drums, vib }. */
import { jazzVoicing, jazzBassStep, JAZZ_REG, JAZZ_N } from './bedjazz.js';

export const SCORE_FORMAT='handsong/score', SCORE_VERSION=1, DRUMS=Object.freeze(['swish', 'tap', 'kick', 'ride', 'hat']);
const mod=(s, n)=>((s%n)+n)%n, frac=x=>x-Math.floor(x);
const TOK=Object.freeze({ R:0, 3:2, 5:4, 6:5, 7:6, 8:7 });
/* null = a valid score; else ONE line naming the problem */
export function scoreCheck(S){ if(!S || S.format!==SCORE_FORMAT || S.version!==SCORE_VERSION) return 'format / version';
  if(!(S.bpm>=50 && S.bpm<=90)) return 'bpm 50…90'; if(!['straight', 'swing'].includes(S.feel)) return 'feel: straight or swing'; if(!(S.swing>=0.5 && S.swing<=0.72)) return 'swing 0.5…0.72';
  for(const [k, c] of Object.entries(S.chords||{})) if(!(Number.isInteger(c.root) && c.root>=0 && c.root<JAZZ_N && c.tones.every(t=>Number.isInteger(t) && t>=0 && t<JAZZ_N))) return `chords.${k}: degrees 0…6`;
  for(const f of S.form||[]) if(!S.sections[f]) return `form: no section «${f}»`;
  for(const [k, X] of Object.entries(S.sections)){ for(const b of X.bars) if(!S.chords[b]) return `sections.${k}: no chord «${b}»`;
    for(const [field, lib] of [['bass', 'bass'], ['drums', 'drums'], ['comp', 'comp']]) if(X[field] && !S[lib][X[field]]) return `sections.${k}.${field}: no «${X[field]}»`;
    if(X.fill && !S.fills[X.fill]) return `sections.${k}.fill: no «${X.fill}»`; }
  for(const g of [...Object.values(S.drums), ...Object.values(S.fills)]) for(const h of g) if(!DRUMS.includes(h[1])) return `a drum «${h[1]}»`;
  for(const p of Object.values(S.bass)) for(const h of p) if(!(h[1] in TOK) && h[1]!=='app' && h[1]!=='app+') return `a bass token «${h[1]}»`;
  if(!(S.loop>=0 && S.loopEnd>=S.loop && S.loopEnd<S.form.length)) return 'loop / loopEnd';
  const bars=S.form.reduce((a, f)=>a+S.sections[f].bars.length, 0); if(bars<32 || bars>64) return `the form has ${bars} bars (32…64)`;
  return null; }
/* the form's bars once through: [{ section, chord, i (bar in its section), last }] */
export const scoreBars=S=>S.form.flatMap(f=>{ const X=S.sections[f]; return X.bars.map((c, i)=>({ section:f, chord:c, i, last:i===X.bars.length-1 })); });
/* a new player: P the preset ({ comp, bass, drums, vib }); once — the form once to its end (the listening page), else it loops loop…loopEnd */
export function scoreInit(S, P, once=false){ return { S, P, once, beat:60/S.bpm, at:0.3, fi:0, si:0, bar:0, bassPrev:null, done:false }; }
const onBeat=(S, b)=>{ const f=frac(b); return Math.floor(b)+(Math.abs(f-0.5)<1e-6 && S.feel==='swing' ? S.swing : f); };
const nextPos=st=>{ const S=st.S; let fi=st.fi, si=st.si+1; if(si>=S.sections[S.form[fi]].bars.length){ si=0; fi++; if(!st.once && fi>S.loopEnd) fi=S.loop; } return { fi, si }; };
/* the events of the bars that START in [t0, t1) (law time, s): { t, kind:'chord'|'comp'|'bass'|'vib'|'drum', steps|step|drum, vel, dur, pan } */
export function scoreStep(st, t0, t1){ const out=[], S=st.S, P=st.P, b=st.beat;
  while(!st.done && st.at<t1){ const T=st.at, X=S.sections[S.form[st.fi]], ch=S.chords[X.bars[st.si]], np=nextPos(st), nx= np.fi<S.form.length ? S.chords[S.sections[S.form[np.fi]].bars[np.si]] : ch, last=st.si===X.bars.length-1;
    if(T>=t0-1e-9){ const voicing=jazzVoicing(ch.tones, JAZZ_REG.comp[0], JAZZ_REG.comp[1]);
      out.push({ t:T, kind:'chord', steps:voicing.slice(), root:ch.root, section:S.form[st.fi], bar:st.si });
      if(P.comp && X.comp) for(const [bt, d, vel] of S.comp[X.comp]) out.push({ t:T+onBeat(S, bt)*b, kind:'comp', steps:voicing.slice(), vel, dur:d*b, pan:-0.2 });
      if(P.bass && X.bass) for(const [bt, tok, d] of S.bass[X.bass]){ const deg= tok==='app' ? nx.root-1 : tok==='app+' ? nx.root+1 : ch.root+TOK[tok], s=jazzBassStep(deg, st.bassPrev==null ? -7 : st.bassPrev); st.bassPrev=s;
        out.push({ t:T+onBeat(S, bt)*b, kind:'bass', step:s, vel:bt===0 ? 0.8 : 0.66, dur:d*b, pan:0.05 }); }
      if(P.drums && X.drums){ const fill= last && X.fill ? S.fills[X.fill] : null, from= fill ? Math.min(...fill.map(h=>h[0])) : 99;
        for(const [bt, dr, vel, d] of S.drums[X.drums]) if(bt<from) out.push({ t:T+onBeat(S, bt)*b, kind:'drum', drum:dr, vel, dur:(d||0.25)*b, pan:-0.1 });
        if(fill) for(const [bt, dr, vel, d] of fill) out.push({ t:T+onBeat(S, bt)*b, kind:'drum', drum:dr, vel, dur:(d||0.25)*b, pan:-0.1 }); }
      if(P.vib && S.vib && S.vib[S.form[st.fi]]) for(const [bar, notes] of S.vib[S.form[st.fi]]) if(bar===st.si+1) for(const [bt, step, d, vel] of notes) out.push({ t:T+onBeat(S, bt)*b, kind:'vib', step, vel, dur:d*b, pan:0.4 }); }
    st.at+=4*b; st.bar++; if(np.fi>=S.form.length){ st.done=true; break; } st.fi=np.fi; st.si=np.si; }
  return out.sort((x, y)=>x.t-y.t); }
/* every chord the score's form plays (the row: each in the parent mode, each safe under the melody) */
export const scoreChords=S=>[...new Set(S.form.flatMap(f=>S.sections[f].bars))].map(k=>({ name:k, ...S.chords[k] }));
export const scoreSeconds=S=>scoreBars(S).length*4*60/S.bpm+0.3;
