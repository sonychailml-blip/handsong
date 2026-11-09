/* NIGHT-4: THE MUSIC BED v2's DRIVER (live and offline). The door (apps/night/bed.js) keeps the person's state — mode, volume, response,
   lighter, which engine — and calls in here when v2 plays. Here: the worklet module loaded once per context (an AudioWorklet missing → v2
   fails and the door plays v1), the law (pure/bed2.js) run ahead on the audio clock, every step priced from the LIVE view (rule #2:
   chordRowFreq of the scale, its tonic and A4), and the pad tones' slots mirrored here (a tone whose PITCH stays keeps its slot; after a
   Mood change the same step is another pitch, so it changes). bed2Plan lays a whole timeline into any context (the probes' and the cost
   measurement's offline renders) through the same message path (msgsOf) the live tick uses. */
import { CUR, chordRowFreq, droneSecondHz } from '../../core/scales.js';
import { seeded } from '../../core/pure/dsp.js';
import { BUS } from '../../core/pure/bus.js';   // NIGHT-6 slice 1: the bed's events for the room (bus «bed»)
import { BED2_SEED, bed2Init, bed2Step, bed2Soon, bed2Tables, bed2Density } from './pure/bed2.js';
import { BED2_WORKLET, BED2_POOLS, BED2_DIV, buildBed2, bed2Post, bed2Park, bed2Stats } from './sound/bed2.js';

export const BED2_AHEAD=0.6, BED2_PARK_S=14;
const mod=(s, n)=>((s%n)+n)%n;
const hzOf=(s, n, v)=>chordRowFreq(mod(s, n), Math.floor(s/n), v);
const groundOf=v=>[chordRowFreq(0, -1, v), droneSecondHz(v)/2];
const pick=(r, a)=>a[0]+r()*(a[1]-a[0]);
const PAD_PAN=[-0.35, 0.35, -0.15, 0.2];
const loads=new WeakMap(); let tabs=null;
/* the worklet module into a context, once → a promise of true (loaded) or false (no AudioWorklet, or the module failed) */
export function bed2Load(ac){
  let p=loads.get(ac);
  if(!p){ p= ac && ac.audioWorklet ? ac.audioWorklet.addModule(BED2_WORKLET).then(()=>true, e=>{ console.warn('[night] the music bed v2 could not load:', e); return false; }) : Promise.resolve(false); loads.set(ac, p); }   // eslint-disable-line no-console
  return p;
}
const tablesFor=rate=>{ if(!tabs || tabs.rate!==rate) tabs={ rate, t:bed2Tables(rate) }; return tabs.t; };
/* what the worklet reads of the recipe (plain data) */
const recipeOf=R=>({ ground:R.ground, glass:R.glass, air:R.air, voices:R.voices, reverb:R.reverb });
/* the pad's slot mirror; each slot and each loop voice has its own seeded detune */
function mirror(seed, R){ const r=seeded((seed^0xDE70)>>>0);
  return { slots:Array.from({ length:BED2_POOLS.pad }, ()=>({ hz:0, step:null, freeAt:0 })), cur:[],
    padDet:Array.from({ length:BED2_POOLS.pad }, ()=>pick(r, R.pad.detune)), loopDet:Array.from({ length:5 }, ()=>pick(r, R.loops.detune)) }; }
/* the messages that set a preset up at AC time `when`: its room, the bus level */
function presetMsgs(R, P, when, level){ return [{ k:'p', t:when, name:'rt60', v:P.rt60, tc:0.6 }, { k:'p', t:when, name:'damp', v:P.damp, tc:0.6 },
  { k:'p', t:when, name:'wet', v:R.reverb.wet, tc:0.05 }, { k:'p', t:when, name:'level', v:level, tc:1.2 }]; }
const groundMsg=(v, on, when, tc)=>{ const [root, fifth]=groundOf(v); return { k:'ground', t:when, root, fifth, on, tc }; };
const levelOf=(R, vol)=>{ const x=Math.max(0, Math.min(1, +vol||0)); return R.master*x*x; };
/* one law event → worklet messages at AC time `when`; M the slot mirror; P the preset; o { light, palette } */
function msgsOf(M, ev, when, v, R, P, o){
  const n=v.iv.length, out=[];
  if(ev.kind==='chord'){
    const HZ=ev.steps.map(s=>hzOf(s, n, v)), next=[], held=M.cur.slice(), claimed=new Set();
    ev.steps.forEach((s, k)=>{ const i=held.find(j=>!claimed.has(j) && M.slots[j].hz===HZ[k]); if(i!=null){ next[k]=i; claimed.add(i); M.slots[i].step=s; } });
    ev.steps.forEach((s, k)=>{ if(next[k]!=null) return;
      const j=M.slots.map((x, i)=>i).filter(i=>!held.includes(i) && !claimed.has(i)).sort((a, b)=>M.slots[a].freeAt-M.slots[b].freeAt)[0];
      if(j==null) return; claimed.add(j); next[k]=j; M.slots[j]={ hz:HZ[k], step:s, freeAt:Infinity };
      out.push({ k:'on', t:when, slot:j, hz:HZ[k], amp:R.pad.amp, a:ev.a, pan:PAD_PAN[k%PAD_PAN.length], osc:o.light ? R.lighter.padOsc : 3, det:M.padDet[j], send:R.pad.send }); });
    for(const i of held) if(!claimed.has(i)){ out.push({ k:'off', t:when, slot:i, r:ev.r }); M.slots[i]={ hz:0, step:null, freeAt:when+2.1*ev.r }; }
    M.cur=next.filter(x=>x!=null);
  } else if(ev.kind==='loop') out.push({ k:'loop', t:when, lv:ev.v, hz:hzOf(ev.step, n, v), amp:R.loops.amp*ev.amp*Math.pow(10, (P.loopDb||0)/20), a:ev.a, h:ev.h, r:ev.r, pan:ev.pan, c0:ev.c0, c1:ev.c1,
    pal:o.palette==='b' ? 'b' : 'a', det:M.loopDet[ev.v%M.loopDet.length], send:R.loops.send });
  else if(ev.kind==='glass') out.push({ k:'glass', t:when, hz:hzOf(ev.step, n, v), amp:R.glass.amp*ev.amp, a:ev.a, d:ev.d, pan:ev.pan, send:R.glass.send });
  else if(ev.kind==='air') out.push({ k:'p', t:when, name:'air', v:ev.lvl*R.air.amp, tc:ev.tc });
  else if(ev.kind==='breath') out.push({ k:'p', t:when, name:'breath', v:ev.db, tc:ev.tc });
  else if(ev.kind==='color') out.push({ k:'p', t:when, name:ev.layer==='pad' ? 'cpad' : 'cloop', v:ev.v, tc:ev.tc });
  return out;
}
/* every pad tone out (Off, a preset change) */
function padsOut(M, when, r){ const out=[]; for(const i of M.cur){ out.push({ k:'off', t:when, slot:i, r }); M.slots[i]={ hz:0, step:null, freeAt:when+2.1*r }; } M.cur=[]; return out; }

/* ---- live ---- */
const S={ ready:false, fail:false, loading:false, b:null, on:false, st:null, M:null, R:null, wR:null, preset:null, origin:0, view:null, parkAt:0, ons:0, E:null, tick:null };   // wR: the recipe the worklet holds
export const bed2Failed=()=>S.fail;
/* on (or another preset) at AC time `now`: R the room's bed2 recipe, level the bus level 0…1 (volume), o { light, palette }.
   → 'on' | 'pending' (the module still loading: the door's tick calls again) | 'failed' */
export function bed2On(ac, E, dest, R, preset, vol, now, o){
  if(S.fail) return 'failed';
  if(!S.ready){ if(!S.loading){ S.loading=true; bed2Load(ac).then(ok=>{ S.loading=false; if(ok) S.ready=true; else S.fail=true; }); } return 'pending'; }
  if(!S.b){ S.b=buildBed2(E, dest, { tables:tablesFor(ac.sampleRate/BED2_DIV), seed:BED2_SEED, recipe:recipeOf(R) }); S.M=mirror(BED2_SEED, R); S.E=E; S.wR=R; }
  bed2Park(E, S.b, false); S.parkAt=0;
  const fresh=!S.on, list=[];
  if(S.wR!==R){ list.push({ k:'recipe', t:now, recipe:recipeOf(R) }); S.wR=R; }   // NIGHT-3 stage 5 part 2: another room's bed (no node is made)
  if(!fresh){ list.push(...padsOut(S.M, now, 4), { k:'flush', t:now, layers:['loop', 'glass'], r:3 }); }
  S.R=R; S.preset=preset; S.on=true; S.origin=now+0.05; S.st=bed2Init((BED2_SEED+(++S.ons)*7919)>>>0, R, R.presets[preset]); S.view=CUR();
  list.push(...presetMsgs(R, R.presets[preset], now, levelOf(R, vol)), groundMsg(S.view, true, now, fresh ? 2.5 : 1));
  bed2Post(E, S.b, list); return 'on';
}
export function bed2Off(E, now){
  if(!S.b || !S.on) return; S.on=false;
  bed2Post(E, S.b, [{ k:'p', t:now, name:'level', v:0, tc:1.2 }, { ...groundMsg(S.view||CUR(), false, now, 1.2) }, ...padsOut(S.M, now, 3), { k:'flush', t:now, layers:['loop', 'glass'], r:2 }]);
  S.parkAt=now+BED2_PARK_S;
}
export function bed2Volume(E, vol, now){ if(S.b && S.on && S.R) bed2Post(E, S.b, [{ k:'p', t:now, name:'level', v:levelOf(S.R, vol), tc:1.2 }]); }
/* once per screen frame: park a while after Off; a Mood change (the ground glides, sounding loops and glass let go, the next chord soon);
   the law's next events, ahead */
export function bed2Tick(E, now, played, answer, o){
  if(!S.b) return;
  if(!S.on){ if(S.parkAt && now>=S.parkAt){ bed2Park(E, S.b, true); S.parkAt=0; } return; }
  const v=CUR(), list=[];
  if(v!==S.view){ S.view=v; list.push(groundMsg(v, true, now, 0.3), { k:'flush', t:now+0.02, layers:['loop', 'glass'], r:2.5 }); bed2Soon(S.st, now-S.origin); }
  const P=S.R.presets[S.preset], evs=bed2Step(S.st, S.R, P, v.iv.length, now-S.origin+BED2_AHEAD, played, answer, !!o.light);
  /* after a gap (a hidden tab stops the frames, not the audio clock): notes more than 1 s late are skipped and only the latest missed chord
     comes, so the bed never plays a burst of everything it missed */
  const late=now-1-S.origin, last=evs.filter(e=>e.kind==='chord' && e.t<late).pop(), T=S.tick={ law:evs.length, loop:0, glass:0, chord:0 };
  for(const ev of evs){ if(ev.t<late && (ev.kind==='loop' || ev.kind==='glass' || (ev.kind==='chord' && ev!==last))) continue;
    if(T[ev.kind]!=null) T[ev.kind]++; const at=Math.max(S.origin+ev.t, now+0.02); list.push(...msgsOf(S.M, ev, at, v, S.R, P, o));
    /* NIGHT-6 slice 1: what goes out is published at its audio time, so a room can show it when heard */
    if(ev.kind==='chord' || ev.kind==='loop' || ev.kind==='glass') BUS.push('bed', { kind:ev.kind, at, lv:ev.v, a:ev.a, h:ev.h, r:ev.r, amp:ev.amp, v:2 }); }
  bed2Post(E, S.b, list);
}
/* probe only */
export const bed2Dbg=()=>({ ready:S.ready, fail:S.fail, built:!!S.b, on:S.on, parked:S.b ? S.b.parked : null, preset:S.preset,
  slots:S.M ? S.M.cur.slice() : [], voices:S.M ? S.M.slots.map(x=>({ hz:x.hz, step:x.step })) : [], density:S.st && S.R && S.preset ? bed2Density(S.st, Math.max(0, (S.E ? S.E.ac.currentTime : 0)-S.origin), S.R.presets[S.preset].arcDepth) : null,
  loops:S.st ? S.st.loops.map(L=>({ len:L.len, active:L.active, notes:L.phrase ? L.phrase.length : 0, cycles:L.cycles })) : [], origin:S.origin, tick:S.tick });
export const bed2StatsLive=()=> S.b ? bed2Stats(S.E, S.b) : Promise.resolve(null);

/* ---- offline ---- */
/* a whole timeline into an engine context E (an offline render): preset `preset` of recipe R for `sec` s from 0, everything posted up front
   (deterministic) → { bed, events (the law's), list (the messages), from }. o { view, seed, played, answer, light, palette, vol, skip } —
   skip (law seconds, or 'peak' = the first arc's fullest point): the timeline starts 25 s before it (the cost measured where the bed is full) */
export async function bed2Plan(E, dest, R, preset, sec, o={}){
  if(!(await bed2Load(E.ac))) throw new Error('the music bed v2 worklet did not load into this context');
  const v=o.view||CUR(), n=v.iv.length, P=R.presets[preset], seed=(o.seed??BED2_SEED)>>>0, M=mirror(seed, R), st=bed2Init(seed, R, P);
  bed2Density(st, 0, P.arcDepth); const skip= o.skip==='peak' ? st.arc.ends[1]/2 : +o.skip||0, from=Math.max(0, skip-25);
  const all=bed2Step(st, R, P, n, from+sec, o.played||[], !!o.answer, !!o.light), held=from ? all.filter(e=>e.kind==='chord' && e.t<from).pop() : null;   // the chord sounding at `from` comes along, at 0
  const evs=[...(held ? [{ ...held, t:0 }] : []), ...all.filter(e=>e.t>=from).map(e=>from ? { ...e, t:e.t-from } : e)], opt={ light:!!o.light, palette:o.palette||'a' };
  const list=[...presetMsgs(R, P, 0, levelOf(R, o.vol??R.level)), groundMsg(v, true, 0, 2.5)];
  for(const ev of evs) list.push(...msgsOf(M, ev, ev.t, v, R, P, opt));
  const b=buildBed2(E, dest, { tables:tablesFor(E.ac.sampleRate/BED2_DIV), seed, recipe:recipeOf(R), events:list });
  return { bed:b, events:evs, list, from };
}
export { bed2Stats };
