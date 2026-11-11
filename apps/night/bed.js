/* NIGHT-3 stage 4: THE MUSIC BED's DOOR AND ITS v1 DRIVER (live) — the state the Music button and the settings set (off / still / drift /
   glimmer, the volume, the response switch, all remembered by the shell), the law (pure/bed.js) run ahead on the audio clock each frame, every
   step priced from the LIVE view (rule #2: chordRowFreq of the scale, its tonic and A4), the sound (sound/bed.js) built on the first On and
   parked a while after Off. With the bed on it takes over the forest's low drone (main.js asks bedTakesDrone). A Mood change: the next chord
   comes from the new scale at once, the ground glides. bedPlan() lays a whole timeline into any engine context (the probes' and the cost
   measurement's offline renders): the live tick and it share one event path (applyEv).
   NIGHT-4: v2 (apps/night/bed2.js, one worklet) plays by default; v1 stays here (NIGHT-5: with v2's gap rule) — the A/B switch (dev, bedSetEngine) and the
   fallback when AudioWorklet is missing. The door also keeps the palette of v2's loop voices (dev switch) and Lighter (the «Lighter forest»
   setting, or a weak device: fewer loops and layers). */
import { AC, engineCtx } from '../../core/audio.js';
import { CUR, chordRowFreq, droneSecondHz } from '../../core/scales.js';
import { BUS } from '../../core/pure/bus.js';
import { seeded } from '../../core/pure/dsp.js';
import { BED_OFF, BED_PRESETS, BED_ANSWER, bedInit, bedStep, bedSoon } from './pure/bed.js';
import { BED_POOL, buildBed, bedVoice, bedVoicePark, bedFilter, bedGround, bedGlim, bedLevel, bedPark } from './sound/bed.js';
import { bed2On, bed2Off, bed2Volume, bed2Tick, bed2Failed, bed2Dbg, bed2ViewOver } from './bed2.js';

export const BED_SEED=0x42454431, BED_AHEAD=0.5, BED_PARK_S=9, BED_QUIET_TC=8;   // a released voice parks after 8 time constants (−70 dB)
export const BED_ENGINES=Object.freeze(['v2','v1']), BED_PALETTES=Object.freeze(['a','b']);
let mode=BED_OFF, vol=null, answer=false, recipe=null, bed=null, st=null, origin=0, view=null, parkAt=0, ons=0, notesSeq=0;
let engine='v2', palette='a', light=false, recipe2=null, v2want=false, v1on=false, v1tick=null;   // NIGHT-4: v1on — v1 is the one playing (chosen, or the fallback)
let over=null; const VIEW=()=>over||CUR();   // NIGHT-7c: the view before the profile's is live (bedViewOver)
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

/* v1 on (a preset) or off at AC time `now` — the stage-4 driver's own steps, unchanged (a fresh start when v1 was not playing) */
function v1Set(m, now, E){
  if(m===BED_OFF){ if(bed && v1on){ bedLevel(E, bed, 0, now); bedGround(E, bed, bed.ground.hz[0]||55, bed.ground.hz[1]||82, false, now); allOut(E, bed, now); parkAt=now+BED_PARK_S; } v1on=false; return; }
  if(!bed) bed=makeBed(E, E.master.in, recipe, BED_SEED);
  bedPark(E, bed, false); parkAt=0;
  if(!v1on){ st=bedInit((BED_SEED+(++ons)*7919)>>>0); origin=now+0.05; view=VIEW(); const [r,s2]=groundOf(view); bedGround(E, bed, r, s2, true, now); }
  else if(st) bedSoon(st, now-origin);   // another preset: its first chord soon
  bedLevel(E, bed, vol==null ? recipe.level : vol, now); v1on=true;
}
/* NIGHT-4: v2 plays when it is chosen, its recipe is known and its worklet did not fail */
const useV2=()=> engine==='v2' && !!recipe2 && !bed2Failed();
const opts=()=>({ light, palette });
let applied=false, holding=false;   // the mode has reached the audio (a mode set before the audio existed is applied by the first tick); holding: a room switch
function apply(){
  const E=engineCtx(), now=AC.currentTime; applied=true;
  if(useV2()){ if(v1on) v1Set(BED_OFF, now, E);
    if(mode===BED_OFF){ v2want=false; bed2Off(E, now); return; }
    const r=bed2On(AC, E, E.master.in, recipe2, mode, bedVolumeOf(), now, opts()); v2want= r==='pending';
    if(r==='failed') v1Set(mode, now, E);
    return; }
  v2want=false; bed2Off(E, now); v1Set(mode, now, E);
}

/* the shell's doors. B the room's v1 recipe, B2 its v2 recipe (NIGHT-4; a caller passing only B keeps the v2 recipe it had) */
/* NIGHT-7c: the music starts on Begin, before the Night profile applies — it plays in the profile's own view (the very object CUR() becomes,
   so nothing glides when the profile lands); null = the live view again */
export function bedViewOver(v){ over=v||null; bed2ViewOver(v); }
export const bedEngineReady=()=>!!(AC && AC.state==='running' && engineCtx().master.in);   // the master's input exists and the context runs
export const bedTakesDrone=()=>mode!==BED_OFF;
export const bedModeOf=()=>mode;
export function bedSetMode(m, B, B2){
  if(m!==BED_OFF && !BED_PRESETS.includes(m)) m=BED_OFF;
  mode=m; holding=false; if(B) recipe=B; if(B2) recipe2=B2;
  if(!AC || !recipe) return;
  apply();
}
export function bedSetVolume(v){ vol=Math.max(0, Math.min(1, +v||0)); if(!AC || mode===BED_OFF) return; const E=engineCtx(), now=AC.currentTime;
  if(bed && v1on) bedLevel(E, bed, vol, now); else bed2Volume(E, vol, now); }
export const bedVolumeOf=()=> vol==null ? (recipe ? recipe.level : 0.6) : vol;
export function bedSetAnswer(on){ answer=!!on; }
export const bedAnswerOf=()=>answer;
/* NIGHT-4: which engine (dev A/B: 'v2' | 'v1'), the palette of v2's loop voices ('a' voices | 'b' horns), Lighter (fewer loops and layers) */
export function bedSetEngine(e){ if(!BED_ENGINES.includes(e) || e===engine) return; engine=e; holding=false; if(AC && recipe && applied) apply(); }
export const bedEngineOf=()=> v1on || !useV2() ? 'v1' : 'v2';
export function bedSetPalette(p){ if(BED_PALETTES.includes(p)) palette=p; }
export const bedPaletteOf=()=>palette;
export function bedSetLight(on){ light=!!on; }
export const bedLightOf=()=>light;
/* NIGHT-3 stage 5 part 2: A ROOM SWITCH — the bed fades out now and holds (its mode stays, so the drone stays out), takes the new room's
   recipes while silent, and plays again from bedResume() after the switch's fades, its first chord soon after. Nothing is built: v2's worklet
   takes the new recipe as a message; v1 (the fallback) keeps the waves it built and reads the new recipe's numbers. → true if it was playing */
export function bedHold(B, B2){
  if(B) recipe=B; if(B2) recipe2=B2;
  if(!AC || !applied || mode===BED_OFF || holding) return holding;
  const E=engineCtx(), now=AC.currentTime; holding=true; v2want=false;
  if(v1on) v1Set(BED_OFF, now, E); else bed2Off(E, now);
  return true;
}
export function bedResume(){ if(!holding) return false; holding=false; if(!AC || mode===BED_OFF || !recipe) return false; if(bed) bed.B=recipe; apply(); return true; }
/* once per screen frame (the shell's tick); `at` — the audio time to act at (a probe's clock; default now) */
export function bedTick(at){
  if(!AC) return;
  if(!applied){ if(mode!==BED_OFF && recipe) apply(); return; }   // a remembered mode set before the audio existed
  const E=engineCtx(), now=at!=null ? at : AC.currentTime;
  if(mode!==BED_OFF){ const N=READ.since('notes', notesSeq); notesSeq=N.seq; const n=sizeOf(VIEW());
    for(const it of N.items) if(it.kind==='on' && it.role==='ld' && Number.isInteger(it.deg)) played.push({ pc:((it.deg%n)+n)%n, t:now });
    while(played.length && played[0].t<now-BED_ANSWER.window) played.shift(); }
  if(v2want){ const r=bed2On(AC, E, E.master.in, recipe2, mode, bedVolumeOf(), now, opts()); if(r!=='pending') v2want=false; if(r==='failed') v1Set(mode, now, E); }
  bed2Tick(E, now, played.map(p=>p.pc), answer, opts());
  if(!bed) return;
  if(!v1on){ if(parkAt && now>=parkAt){ bedPark(E, bed, true); parkAt=0; } return; }
  const v=VIEW(), n=sizeOf(v);
  if(v!==view){ view=v; const [r,s2]=groundOf(v); bedGround(E, bed, r, s2, true, now); bedSoon(st, now-origin); }
  parkQuiet(E, bed, now);
  const P=recipe.presets[mode];
  /* NIGHT-5: after a gap (a hidden tab stops the frames, not the audio clock) — as v2: events more than 1 s late are skipped and only the
     latest missed chord comes, so v1 never plays a burst of everything it missed */
  const evs=bedStep(st, recipe, P, n, now-origin+BED_AHEAD, played.map(p=>p.pc), answer), late=now-1-origin;
  const last=evs.filter(e=>e.kind==='chord' && e.t<late).pop(), T=v1tick={ law:evs.length, chord:0, glim:0, drift:0 };
  for(const ev of evs){ if(ev.t<late && ev!==last) continue; T[ev.kind]=(T[ev.kind]||0)+1; const at=Math.max(origin+ev.t, now+0.02); applyEv(E, bed, ev, at, P, v);
    if(ev.kind==='chord' || ev.kind==='glim') BUS.push('bed', { kind:ev.kind==='glim' ? 'glass' : 'chord', at, v:1 }); }   // NIGHT-6 slice 1: v1's chords and glimmer for the room
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
  voices:bed ? bed.voices.map(x=>({ hz:x.hz, step:x.step })) : [], ground:bed ? bed.ground.hz.slice() : null, origin, view:view ? view.mode && view.mode.id : null,
  engine:bedEngineOf(), palette, light, v1on, v2want, v2:bed2Dbg(), tick:v1tick, holding, recipe, recipe2 });   // NIGHT-4; NIGHT-5 v1's last tick (the law's events, those that went out)
