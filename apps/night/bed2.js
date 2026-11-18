/* NIGHT-4: THE MUSIC BED v2's DRIVER (live and offline). The door (apps/night/bed.js) keeps the person's state — mode, volume, response,
   lighter, which engine — and calls in here when v2 plays. Here: the worklet module loaded once per context (an AudioWorklet missing → v2
   fails and the door plays v1), the law (pure/bed2.js) run ahead on the audio clock, every step priced from the LIVE view (rule #2:
   chordRowFreq of the scale, its tonic and A4), and the pad tones' slots mirrored here (a tone whose PITCH stays keeps its slot; after a
   Mood change the same step is another pitch, so it changes). bed2Plan lays a whole timeline into any context (the probes' and the cost
   measurement's offline renders) through the same message path (msgsOf) the live tick uses. */
import { CUR, chordRowFreq, droneSecondHz, viewKeyIdOf, scaleById, scaleView, viewKey, viewKeyC } from '../../core/scales.js';
import { jazzInit, jazzStep, JAZZ_N } from './pure/bedjazz.js';
import { lofiInit, lofiStep, lofiLevel, lofiStop, lofiFadeIn, LOFI_LEVELS } from './pure/lofi.js';   // RAIN-4c: the lo-fi bed (a recipe with `lofi`)
import { scoreInit, scoreStep } from './pure/bedscore.js';   // RAIN-4b: a composed piece per mood (a recipe with `scores`)   // RAIN-4: the jazz bed (a recipe with `jazz`)
import { seeded } from '../../core/pure/dsp.js';
import { BUS } from '../../core/pure/bus.js';   // NIGHT-6 slice 1: the bed's events for the room (bus «bed»)
import { BED2_SEED, bed2Init, bed2Step, bed2Soon, bed2Tables, bed2Density } from './pure/bed2.js';
import { BED2_WORKLET, BED2_POOLS, BED2_DIV, buildBed2, bed2Post, bed2Park, bed2Stats } from './sound/bed2.js';

export const BED2_AHEAD=0.6, BED2_PARK_S=14;
/* AUDIO-2: the lo-fi bed's notes are built on the main thread (its nodes cannot be made elsewhere), a whole bar at a time once the bar comes within
   the look-ahead. At 0.6 s a main-thread stall longer than that just before a bar line (a real hand's first detections on the GPU, a busy picture)
   made the downbeat late, and every late note then fired at once — the stutter. 2 s ahead covers such stalls; a beat that is still late by more
   than LOFI_LATE_S is skipped instead of bunched (sustained notes still play). lofiAheadDbg(s): the probe's CONTROL (0.6 = the old way). */
export const LOFI_AHEAD=2, LOFI_LATE_S=0.08;
let lofiAhead=LOFI_AHEAD;
export const bed2LofiEngine=()=>LF.eng;   // AUDIO-3: the lab's bypass switches reach the bed's engine
export const lofiAheadDbg=s=>{ lofiAhead= s==null ? LOFI_AHEAD : +s; return lofiAhead; };
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
/* RAIN-4: THE JAZZ BED — a recipe with `jazz` (the rain room's): the mood's recipe by the live mode id, every step priced in the mood's PARENT
   mode at the live key (rule #2); the brushes behind the address word ?brush=on (the founder decides by ear). Without `jazz` nothing here runs */
let BRUSH=false; try{ if(typeof location!=='undefined') BRUSH=new URLSearchParams(location.search).get('brush')==='on'; }catch(e){}
export const bedBrushDbg=v=>{ if(v!=null) BRUSH=!!v; return BRUSH; };
const modeIdOf=v=> v ? (v.mode && v.mode.id) || v.id || null : null;
export const jazzMoodOf=(R, v)=>{ const J=R.jazz, id=modeIdOf(v), k=J.moods[id] ? id : J.first; return { id:k, M:J.moods[k], S:(J.scores && J.scores[k]) || null }; };
const jzNew=(R, J, preset, seed, brush, once=false)=> J.S ? scoreInit(J.S, R.jazz.scorePresets[preset], once) : jazzInit(seed, J.M, R.jazz.presets[preset], brush);   // RAIN-4b: the score when the mood has one
const jzStep=(st, a, b)=> st.S ? scoreStep(st, a, b) : jazzStep(st, a, b);
const parentOf=(M, v)=>{ const m=scaleById(M.parent); return m ? scaleView(m, undefined, undefined, viewKey(v), viewKeyC(v)) : null; };
function jazzMsgs(ev, when, pv, R){ const J=R.jazz, hz=s=>chordRowFreq(mod(s, JAZZ_N), Math.floor(s/JAZZ_N), pv), out=[];
  if(ev.kind==='comp'){ const n=ev.steps.length; ev.steps.forEach((s, k)=>out.push({ k:'jz', t:when+k*J.roll, kind:'ep', hz:hz(s), amp:J.ep*ev.vel/Math.sqrt(n), vel:ev.vel, dur:ev.dur, pan:ev.pan+(k-(n-1)/2)*0.14, send:J.send.ep })); }
  else if(ev.kind==='bass') out.push({ k:'jz', t:when, kind:'bass', hz:hz(ev.step), amp:J.bass*ev.vel, vel:ev.vel, dur:ev.dur, pan:ev.pan, send:J.send.bass });
  else if(ev.kind==='vib') out.push({ k:'jz', t:when, kind:'vib', hz:hz(ev.step), amp:J.vib*ev.vel, vel:ev.vel, dur:ev.dur, pan:ev.pan, send:J.send.vib });
  else if(ev.kind==='brush') out.push({ k:'jz', t:when, kind:'brush', amp:J.brush*ev.vel, dur:ev.dur, pan:ev.pan, send:J.send.brush });
  else if(ev.kind==='drum'){ const d=ev.drum, v=ev.vel, B=J.send.brush;   // RAIN-4b: the score's drums on the jazz voices
    if(d==='swish' || d==='tap') out.push({ k:'jz', t:when, kind:'brush', amp:J.brush*v*(d==='tap' ? 1.3 : 1), dur: d==='tap' ? 0.09 : ev.dur, pan:ev.pan, send:B });
    else if(d==='kick') out.push({ k:'jz', t:when, kind:'kick', hz:52, amp:J.kick*v, dur:0.4, pan:0, send:B*0.3 });
    else out.push({ k:'jz', t:when, kind:'cym', amp:J.cym*v*(d==='hat' ? 0.6 : 1), dur: d==='hat' ? 0.07 : Math.max(0.8, ev.dur), pan:0.25, send:B }); }
  return out; }
/* RAIN-4c: THE LO-FI BED — a recipe with `lofi` (the rain room's) when its room installed an engine (bed2LofiSet: (ac, dest) → a promise of the
   engine) and the address does not say ?bed=jazz (the RAIN-4b jazz, for comparison). Its own Web Audio engine, not the worklet. The Mood button picks
   the piece (a new one begins at the old one's next bar line, fading in), the Music button the level (from the next bar line, the layers ramping
   over one bar). Without `lofi` nothing here runs */
let BEDJAZZ=false; try{ if(typeof location!=='undefined') BEDJAZZ=new URLSearchParams(location.search).get('bed')==='jazz'; }catch(e){}
export const bedJazzDbg=v=>{ if(v!=null) BEDJAZZ=!!v; return BEDJAZZ; };
let LOFI=null; export const bed2LofiSet=f=>{ LOFI=f||null; };
const LF={ eng:null, loading:null, fail:false, on:false, R:null, level:'full', origin:0, view:null, players:[], tick:null, late:0, skipped:0, worst:0 };   // AUDIO-2: late — notes that came late, skipped — late beats left out, worst — the latest (s, < 0)
const lofiWanted=R=>!!(R && R.lofi && LOFI && !BEDJAZZ);
const pieceOf=(R, v)=>{ const L=R.lofi, id=modeIdOf(v); return L.pieces[id] || L.pieces[L.first]; };
const pcOf=P=>{ const m=scaleById(P.parent); return m && m.iv && m.iv.length===7 ? m.iv.slice() : undefined; };   // RAIN-4d: the parent's pitch classes (the phrases' safe notes)
const lofiLevelOf=(R, preset)=>(R.lofi.levels && R.lofi.levels[preset]) || 'full';
function lofiOn(ac, dest, R, preset, vol, now){
  if(LF.fail) return 'failed';
  if(!LF.eng){ if(!LF.loading) LF.loading=LOFI(ac, dest).then(e=>{ LF.eng=e; }, e=>{ LF.fail=true; console.warn('[night] the lo-fi bed could not load:', e); }); return 'pending'; }   // eslint-disable-line no-console
  const E=LF.eng, lv=lofiLevelOf(R, preset), law=now-LF.origin;
  if(!LF.on){ LF.on=true; LF.R=R; LF.level=lv; LF.origin=now; LF.view=VIEW(); const P=pieceOf(R, LF.view); LF.players=[{ st:lofiInit(P, lv, { at:0.1, pc:pcOf(P) }), P, pv:parentOf(P, LF.view) }]; if(E.tempo) E.tempo(P.bpm, now);
    E.layer('crackle', LOFI_LEVELS[lv].includes('crackle') ? 1 : 0, now); E.level(levelOf(R, vol), now, 1.2); return 'on'; }
  LF.R=R; if(lv!==LF.level){ LF.level=lv; const cur=LF.players[LF.players.length-1]; for(const ev of lofiLevel(cur.st, lv, law)) E.play(ev, LF.origin+ev.t, cur.pv); }
  E.level(levelOf(R, vol), now, 1.2); return 'on'; }
function lofiOff(now){ if(!LF.on) return; LF.on=false; LF.players=[]; if(LF.eng) LF.eng.level(0, now, 1.2); }
function lofiTick(now){ const E=LF.eng, R=LF.R; if(!E || !LF.on) return; const law=now-LF.origin, v=VIEW();
  if(v!==LF.view){ LF.view=v; const P=pieceOf(R, v), cur=LF.players[LF.players.length-1];
    if(P!==cur.P){ const at=lofiStop(cur.st, law), st=lofiInit(P, LF.level, { at, pc:pcOf(P) }); lofiFadeIn(st); LF.players.push({ st, P, pv:parentOf(P, v) }); if(E.tempo) E.tempo(P.bpm, LF.origin+at); }
    else cur.pv=parentOf(P, v); }
  const late=law-1, T=LF.tick={ law:0, ep:0, bass:0, drum:0, vib:0, gtr:0, chord:0 };
  for(const pl of LF.players){ const evs=lofiStep(pl.st, law-1, law+lofiAhead), beat=60/pl.P.bpm; T.law+=evs.length;
    for(const ev of evs){ if(ev.t<late && ev.kind!=='chord') continue; const due=LF.origin+ev.t-(now+0.02);   // AUDIO-2: < 0 = this note is late
      if(due<0){ LF.late++; LF.worst=Math.min(LF.worst, due); if(-due>LOFI_LATE_S && (ev.kind==='drum' || ev.kind==='bass' || ev.kind==='pump')){ LF.skipped++; continue; } }
      if(T[ev.kind]!=null) T[ev.kind]++; const at=Math.max(LF.origin+ev.t, now+0.02); if(pl.pv) E.play(ev, at, pl.pv);
      if(ev.kind==='chord' || ev.kind==='ep' || ev.kind==='bass' || ev.kind==='vib' || ev.kind==='gtr') BUS.push('bed', { kind:ev.kind==='ep' ? 'comp' : ev.kind==='gtr' ? 'vib' : ev.kind, at, v:3, steps:ev.steps||null, step:ev.step??null, vel:ev.vel??null, dur:ev.dur??null, beat }); } }
  LF.players=LF.players.filter(pl=>pl.st.stopAt===Infinity || pl.st.stopAt>law-2); }
export const bed2LofiDbg=o=>{ if(o && o.reset){ LF.late=0; LF.skipped=0; LF.worst=0; } return ({ late:LF.late, skipped:LF.skipped, worst:LF.worst, ahead:lofiAhead, wanted:!!LOFI, jazz:BEDJAZZ, loaded:!!LF.eng, fail:LF.fail, on:LF.on, level:LF.level, players:LF.players.map(p=>({ id:p.P.id, at:p.st.at, stopAt:p.st.stopAt, bar:p.st.bar, g:Object.fromEntries(Object.entries(p.st.g).map(([k, G])=>[k, G.map(q=>q.slice())])) })), origin:LF.origin, tick:LF.tick, eng:LF.eng ? LF.eng.state() : null }); };
/* every pad tone out (Off, a preset change) */
function padsOut(M, when, r){ const out=[]; for(const i of M.cur){ out.push({ k:'off', t:when, slot:i, r }); M.slots[i]={ hz:0, step:null, freeAt:when+2.1*r }; } M.cur=[]; return out; }

/* ---- live ---- */
/* NIGHT-7c: the view the live bed plays in until the profile's own is live (the music starts on Begin, before the Night profile applies) */
let over=null; const VIEW=()=>over||CUR();
export const bed2ViewOver=v=>{ over=v||null; };
const S={ ready:false, fail:false, loading:false, b:null, on:false, st:null, M:null, R:null, wR:null, preset:null, origin:0, view:null, parkAt:0, ons:0, E:null, tick:null };   // wR: the recipe the worklet holds
export const bed2Failed=()=>S.fail;
/* on (or another preset) at AC time `now`: R the room's bed2 recipe, level the bus level 0…1 (volume), o { light, palette }.
   → 'on' | 'pending' (the module still loading: the door's tick calls again) | 'failed' */
/* RAIN-4b: the recorded version — a room may set a sampler (ac, out, ev, when, pv) → true when it played the event (false: not ready, the synth plays it) */
let SAMPLER=null;
export const bed2SamplerSet=f=>{ SAMPLER=f||null; };
export function bed2On(ac, E, dest, R, preset, vol, now, o){
  if(lofiWanted(R)){ if(S.on && S.b) bed2Off(E, now); return lofiOn(ac, dest, R, preset, vol, now); }   // RAIN-4c: the lo-fi bed (the worklet's bed let go first)
  if(LF.on) lofiOff(now);
  if(S.fail) return 'failed';
  S.dest=dest;
  if(!S.ready){ if(!S.loading){ S.loading=true; bed2Load(ac).then(ok=>{ S.loading=false; if(ok) S.ready=true; else S.fail=true; }); } return 'pending'; }
  if(!S.b){ S.b=buildBed2(E, dest, { tables:tablesFor(ac.sampleRate/BED2_DIV), seed:BED2_SEED, recipe:recipeOf(R) }); S.M=mirror(BED2_SEED, R); S.E=E; S.wR=R; }
  bed2Park(E, S.b, false); S.parkAt=0;
  const fresh=!S.on, list=[];
  if(S.wR!==R){ list.push({ k:'recipe', t:now, recipe:recipeOf(R) }); S.wR=R; }   // NIGHT-3 stage 5 part 2: another room's bed (no node is made)
  if(!fresh){ list.push(...padsOut(S.M, now, 4), { k:'flush', t:now, layers:['loop', 'glass'], r:3 }); }
  S.R=R; S.preset=preset; S.on=true; S.origin=now+0.05; S.st=bed2Init((BED2_SEED+(++S.ons)*7919)>>>0, R, R.presets[preset]); S.view=VIEW();
  if(R.jazz){ const J=jazzMoodOf(R, S.view); S.jid=J.id; S.jz=jzNew(R, J, preset, (BED2_SEED+S.ons*7919)>>>0, BRUSH); S.pv=parentOf(J.M, S.view);   // RAIN-4: no drone under the jazz
    if(!fresh) list.push({ k:'flush', t:now, layers:['jz'], r:1 }); list.push(...presetMsgs(R, R.presets[preset], now, levelOf(R, vol)), groundMsg(S.view, false, now, 1)); bed2Post(E, S.b, list); return 'on'; }
  S.jz=null;
  list.push(...presetMsgs(R, R.presets[preset], now, levelOf(R, vol)), groundMsg(S.view, true, now, fresh ? 2.5 : 1));
  bed2Post(E, S.b, list); return 'on';
}
export function bed2Off(E, now){
  if(LF.on){ lofiOff(now); if(!S.on) return; }   // RAIN-4c
  if(!S.b || !S.on) return; S.on=false;
  if(S.jz){ bed2Post(E, S.b, [{ k:'p', t:now, name:'level', v:0, tc:1.2 }, { k:'flush', t:now, layers:['jz'], r:2 }]); S.jz=null; S.parkAt=now+BED2_PARK_S; return; }   // RAIN-4
  bed2Post(E, S.b, [{ k:'p', t:now, name:'level', v:0, tc:1.2 }, { ...groundMsg(S.view||VIEW(), false, now, 1.2) }, ...padsOut(S.M, now, 3), { k:'flush', t:now, layers:['loop', 'glass'], r:2 }]);
  S.parkAt=now+BED2_PARK_S;
}
export function bed2Volume(E, vol, now){ if(LF.on && LF.eng && LF.R){ LF.eng.level(levelOf(LF.R, vol), now, 1.2); return; } if(S.b && S.on && S.R) bed2Post(E, S.b, [{ k:'p', t:now, name:'level', v:levelOf(S.R, vol), tc:1.2 }]); }
/* once per screen frame: park a while after Off; a Mood change (the ground glides, sounding loops and glass let go, the next chord soon);
   the law's next events, ahead */
export function bed2Tick(E, now, played, answer, o){
  if(LF.on){ lofiTick(now); return; }   // RAIN-4c
  if(!S.b) return;
  if(!S.on){ if(S.parkAt && now>=S.parkAt){ bed2Park(E, S.b, true); S.parkAt=0; } return; }
  const v=VIEW(), list=[];
  if(S.jz){ jazzTick(E, now, v, list); return; }   // RAIN-4: the jazz bed
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
/* RAIN-4: one tick of the jazz bed — a Mood change starts the new mood's recipe at the next bar (what was queued of the old one let go); the bars
   starting within BED2_AHEAD come out at their own times; each chord and bar published on the bus «bed» at its audio time (the room shows it) */
function jazzTick(E, now, v, list){
  if(v!==S.view){ S.view=v; const J=jazzMood(v); if(J.id!==S.jid){ S.jid=J.id; const law=now-S.origin+0.1; S.jz=jzNew(S.R, J, S.preset, (BED2_SEED+(++S.ons)*7919)>>>0, BRUSH); S.jz.at=law; list.push({ k:'flush', t:now, layers:['jz'], r:1.2 }); }
    S.pv=parentOf(jazzMoodOf(S.R, v).M, v); }
  const evs=jzStep(S.jz, now-S.origin-1, now-S.origin+BED2_AHEAD), late=now-1-S.origin, T=S.tick={ law:evs.length, comp:0, bass:0, vib:0, brush:0, chord:0 };
  for(const ev of evs){ if(ev.t<late && ev.kind!=='chord') continue; if(T[ev.kind]!=null) T[ev.kind]++;
    const at=Math.max(S.origin+ev.t, now+0.02); if(S.pv && !(SAMPLER && S.jz.S && SAMPLER(E.ac, S.dest, ev, at, S.pv))) list.push(...jazzMsgs(ev, at, S.pv, S.R));
    if(ev.kind==='chord' || ev.kind==='comp' || ev.kind==='bass' || ev.kind==='vib') BUS.push('bed', { kind:ev.kind, at, v:3, steps:ev.steps||null, step:ev.step??null, vel:ev.vel??null, dur:ev.dur??null, beat:S.jz.beat }); }
  bed2Post(E, S.b, list); }
const jazzMood=v=>jazzMoodOf(S.R, v);
/* probe only */
export const bed2Dbg=()=>({ ready:S.ready, fail:S.fail, built:!!S.b, on:S.on, parked:S.b ? S.b.parked : null, preset:S.preset,
  slots:S.M ? S.M.cur.slice() : [], voices:S.M ? S.M.slots.map(x=>({ hz:x.hz, step:x.step })) : [], density:S.st && S.R && S.preset ? bed2Density(S.st, Math.max(0, (S.E ? S.E.ac.currentTime : 0)-S.origin), S.R.presets[S.preset].arcDepth) : null,
  loops:S.st ? S.st.loops.map(L=>({ len:L.len, active:L.active, notes:L.phrase ? L.phrase.length : 0, cycles:L.cycles })) : [], origin:S.origin, tick:S.tick });
export const bed2StatsLive=()=> S.b ? bed2Stats(S.E, S.b) : Promise.resolve(null);
export const bed2NodeDbg=()=> S.b ? S.b.node : null;   // probe only (NIGHT-7c): the bed's own output, to hear it alone
export const bed2ViewDbg=()=>({ same:S.view===CUR(), over:!!over, starts:S.ons, playing:S.view ? viewKeyIdOf(S.view) : null, live:viewKeyIdOf(CUR()), on:S.on, ticked:S.tick ? 1 : 0 });   // probe only: whether it plays in the live view, how often it (re)started

/* ---- offline ---- */
/* a whole timeline into an engine context E (an offline render): preset `preset` of recipe R for `sec` s from 0, everything posted up front
   (deterministic) → { bed, events (the law's), list (the messages), from }. o { view, seed, played, answer, light, palette, vol, skip } —
   skip (law seconds, or 'peak' = the first arc's fullest point): the timeline starts 25 s before it (the cost measured where the bed is full) */
export async function bed2Plan(E, dest, R, preset, sec, o={}){
  if(!(await bed2Load(E.ac))) throw new Error('the music bed v2 worklet did not load into this context');
  if(R.jazz){ const v=o.view||CUR(), J=jazzMoodOf(R, v), pv=parentOf(J.M, v), seed=(o.seed??BED2_SEED)>>>0, st=jzNew(R, J, preset, seed, o.brush==null ? BRUSH : !!o.brush, !!o.once);   // RAIN-4: the jazz bed, offline
    const evs=jzStep(st, 0, sec), list=[...presetMsgs(R, R.presets[preset], 0, levelOf(R, o.vol??R.level))]; for(const ev of evs) if(pv) list.push(...jazzMsgs(ev, ev.t, pv, R));
    const b=buildBed2(E, dest, { tables:tablesFor(E.ac.sampleRate/BED2_DIV), seed, recipe:recipeOf(R), events:list }); return { bed:b, events:evs, list, from:0, mood:J.id }; }
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
