/* NIGHT-3 stage 4: THE MUSIC BED's DRIVER (live) — the state the Music button and the settings set (off / still / drift / glimmer, the volume,
   the response switch, all remembered by the shell), the law (pure/bed.js) run ahead on the audio clock each frame, every step priced from the
   LIVE view (rule #2: chordRowFreq of the scale, its tonic and A4), the sound (sound/bed.js) built on the first On and parked a while after Off.
   With the bed on it takes over the forest's low drone (main.js asks bedTakesDrone). A Mood change: the next chord comes from the new scale at
   once, the ground glides. bedPlan() lays a whole timeline into any engine context (the probes' and the cost measurement's offline renders): the
   live tick and it share one event path (applyEv). */
import { AC, engineCtx } from '../../core/audio.js';
import { CUR, chordRowFreq, droneSecondHz } from '../../core/scales.js';
import { BUS } from '../../core/pure/bus.js';
import { seeded } from '../../core/pure/dsp.js';
import { BED_OFF, BED_PRESETS, BED_ANSWER, bedInit, bedStep, bedSoon } from './pure/bed.js';
import { BED_POOL, buildBed, bedVoice, bedVoicePark, bedFilter, bedGround, bedGlim, bedLevel, bedPark } from './sound/bed.js';

export const BED_SEED=0x42454431, BED_AHEAD=0.5, BED_PARK_S=9, BED_QUIET_TC=8;   // a released voice parks after 8 time constants (−70 dB)
let mode=BED_OFF, vol=null, answer=false, recipe=null, bed=null, st=null, origin=0, view=null, parkAt=0, ons=0, notesSeq=0;
const played=[];   // { pc, t } of your recent notes (AC time) — read only with the response on
const READ=BUS.reader();
/* a bed object with its seeded per-voice detunes and its two sides' filter positions (× the chord's middle pitch) */
function makeBed(E, dest, B, seed){ const r=seeded((seed^0x5EED)>>>0), detunes=[], cutBase=[];
  for(let i=0;i<BED_POOL;i++) detunes.push(B.detune[0]+r()*(B.detune[1]-B.detune[0]));
  for(let k=0;k<2;k++) cutBase.push(B.cut[0]+r()*(B.cut[1]-B.cut[0]));
  const b=buildBed(E, dest, B, detunes); b.cutBase=cutBase; b.slots=[]; b.ref=0; return b; }
const sizeOf=v=>v.iv.length;
const hzOf=(s, n, v)=>chordRowFreq(((s%n)+n)%n, Math.floor(s/n), v);
const groundOf=v=>[chordRowFreq(0, -1, v), droneSecondHz(v)/2];
/* one law event into the bed at AC time `when` */
function applyEv(E, b, ev, when, P, v){
  const B=b.B, n=sizeOf(v);
  if(ev.kind==='chord'){
    /* a voice stays only if its PITCH stays (after a Mood change the same step is another pitch) */
    const HZ=ev.steps.map(s=>hzOf(s, n, v)), keep=new Set(), next=[];
    ev.steps.forEach((s,slot)=>{ const i=b.slots[slot]; if(i!=null && b.voices[i].hz===HZ[slot]) keep.add(i); });
    ev.steps.forEach((s,slot)=>{ const i=b.slots[slot]; if(i!=null && keep.has(i) && b.voices[i].hz===HZ[slot]){ next[slot]=i; return; }
      const free=b.voices.map((x,k)=>k).filter(k=>!keep.has(k) && !next.includes(k) && !b.slots.includes(k)).sort((x,y)=>b.voices[x].quietAt-b.voices[y].quietAt);
      const k= free.length ? free[0] : b.voices.map((x,j)=>j).find(j=>!keep.has(j) && !next.includes(j));
      bedVoicePark(E, b, b.voices[k], false); bedVoice(E, b, k, HZ[slot], B.pad.amp, when, B.pad.attack); b.voices[k].step=s; next[slot]=k; });
    for(const i of b.slots) if(i!=null && !next.includes(i)){ bedVoice(E, b, i, 0, 0, when, B.pad.release); b.voices[i].step=null; b.voices[i].quietAt=when; }
    b.slots=next; b.ref=Math.exp(HZ.reduce((x,f)=>x+Math.log(f),0)/HZ.length);   // the chord's middle pitch (geometric mean)
    for(let k=0;k<2;k++) bedFilter(E, b, k, b.ref*b.cutBase[k], when, 2);
  } else if(ev.kind==='drift'){ if(b.ref>0){ const k=ev.v%2; bedFilter(E, b, k, b.ref*b.cutBase[k]*ev.k, when, 4); } }
  else if(ev.kind==='glim') bedGlim(E, b, chordRowFreq(ev.pc, B.glim.oct, v), ev.amp, ev.pan, when);
}
/* the voices whose release has fallen below −70 dB (and the glimmer voices past their fall) park: they stop being computed */
function parkQuiet(E, b, now){ const tq=BED_QUIET_TC*b.B.pad.release;
  for(const v of b.voices) if(v.step==null && !v.parked && now>=v.quietAt+tq) bedVoicePark(E, b, v, true);
  for(const v of b.glim) if(!v.parked && now>=v.until) bedVoicePark(E, b, v, true); }
/* every pad voice out (Off, or before a probe's plan ends) */
function allOut(E, b, when){ for(const i of b.slots) if(i!=null){ bedVoice(E, b, i, 0, 0, when, b.B.pad.release); b.voices[i].step=null; b.voices[i].quietAt=when; } b.slots=[]; }

/* the shell's doors */
export const bedTakesDrone=()=>mode!==BED_OFF;
export const bedModeOf=()=>mode;
export function bedSetMode(m, B){
  if(m!==BED_OFF && !BED_PRESETS.includes(m)) m=BED_OFF;
  const was=mode; mode=m; if(B) recipe=B;
  if(!AC || !recipe) return;
  const E=engineCtx(), now=AC.currentTime;
  if(m===BED_OFF){ if(bed && was!==BED_OFF){ bedLevel(E, bed, 0, now); bedGround(E, bed, bed.ground.hz[0]||55, bed.ground.hz[1]||82, false, now); allOut(E, bed, now); parkAt=now+BED_PARK_S; } return; }
  if(!bed) bed=makeBed(E, E.master.in, recipe, BED_SEED);
  bedPark(E, bed, false); parkAt=0;
  if(was===BED_OFF){ st=bedInit((BED_SEED+(++ons)*7919)>>>0); origin=now+0.05; view=CUR(); const [r,s2]=groundOf(view); bedGround(E, bed, r, s2, true, now); }
  else if(st) bedSoon(st, now-origin);   // another preset: its first chord soon
  bedLevel(E, bed, vol==null ? recipe.level : vol, now);
}
export function bedSetVolume(v){ vol=Math.max(0, Math.min(1, +v||0)); if(AC && bed && mode!==BED_OFF) bedLevel(engineCtx(), bed, vol, AC.currentTime); }
export const bedVolumeOf=()=> vol==null ? (recipe ? recipe.level : 0.6) : vol;
export function bedSetAnswer(on){ answer=!!on; }
export const bedAnswerOf=()=>answer;
/* once per screen frame (the shell's tick); `at` — the audio time to act at (a probe's clock; default now) */
export function bedTick(at){
  if(!AC) return;
  if(!bed){ if(mode!==BED_OFF && recipe){ const m=mode; mode=BED_OFF; bedSetMode(m); } return; }   // a remembered mode set before the audio existed
  const E=engineCtx(), now=at!=null ? at : AC.currentTime;
  if(mode===BED_OFF){ if(parkAt && now>=parkAt){ bedPark(E, bed, true); parkAt=0; } return; }
  const N=READ.since('notes', notesSeq); notesSeq=N.seq;
  const v=CUR(), n=sizeOf(v);
  for(const it of N.items) if(it.kind==='on' && it.role==='ld' && Number.isInteger(it.deg)) played.push({ pc:((it.deg%n)+n)%n, t:now });
  while(played.length && played[0].t<now-BED_ANSWER.window) played.shift();
  if(v!==view){ view=v; const [r,s2]=groundOf(v); bedGround(E, bed, r, s2, true, now); bedSoon(st, now-origin); }
  parkQuiet(E, bed, now);
  const P=recipe.presets[mode];
  for(const ev of bedStep(st, recipe, P, n, now-origin+BED_AHEAD, played.map(p=>p.pc), answer)) applyEv(E, bed, ev, Math.max(origin+ev.t, now+0.02), P, v);
}
/* a whole timeline into an engine context E (offline renders): the preset `preset` of recipe B for `sec` s from 0 → { bed, events }. o.at(t, fn)
   given (an offline context's timed callback, the cost measurement): each event is applied just before its time and the quiet voices park, as
   the live tick does; without it everything is laid at once and nothing parks (the same sound to −70 dB) */
export function bedPlan(E, dest, B, preset, sec, o={}){
  const v=o.view||CUR(), n=sizeOf(v), P=B.presets[preset], b=makeBed(E, dest, B, o.seed??BED_SEED), s=bedInit(o.seed??BED_SEED);
  const [r,s2]=groundOf(v); bedGround(E, b, r, s2, true, 0); bedLevel(E, b, o.vol??B.level, 0);
  const evs=bedStep(s, B, P, n, sec, o.played||[], !!o.answer);
  if(!o.at){ for(const ev of evs) applyEv(E, b, ev, ev.t, P, v); for(const x of [...b.voices, ...b.glim]) bedVoicePark(E, b, x, false); }
  else { const tq=BED_QUIET_TC*B.pad.release+0.05;   // one callback per event, and one per release's end (a timed callback costs: keep them few)
    for(const ev of evs){ o.at(Math.max(0, ev.t-BED_AHEAD), ()=>applyEv(E, b, ev, ev.t, P, v)); if(ev.kind!=='drift' && ev.t+tq<sec) o.at(ev.t+tq, ()=>parkQuiet(E, b, ev.t+tq)); } }
  return { bed:b, events:evs };
}
/* probe only */
export const bedDbg=()=>({ mode, vol:bedVolumeOf(), answer, built:!!bed, parked:bed ? bed.parked : null, slots:bed ? bed.slots.slice() : [], played:played.length,
  voices:bed ? bed.voices.map(x=>({ hz:x.hz, step:x.step })) : [], ground:bed ? bed.ground.hz.slice() : null, origin, view:view ? view.mode && view.mode.id : null });
