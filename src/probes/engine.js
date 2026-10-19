/* AUD1a (RUN 3, 2026-10-16; docs/AUD1-design.md option C, review R1): THE ENGINE CONTEXT `E` and THE NODE CENSUS.
   «AUD1 engine context» — E of each instance (the live engine, the render copy) is checked THREE times: right after initAudio (the copy, its
   worklets stubbed), after the worklets loaded for real, and after a track render ran. Each time: E.ac is the instance's AC; every Web Audio
   node reachable from E belongs to E.ac (a stale copy would hold a node of an earlier context); the worklet flags equal the module's own; the
   two instances share no Web Audio object (node, parameter, buffer, port). CONTROLS: a plain snapshot of E taken before a render must fail
   the «belongs to the current context» check after it; a live node slipped into the copy's set must fail the «nothing shared» check.
   «AUD1 node census» — the render copy's initAudio + one note of every timbre, every kit row and the drone, in a fresh offline context:
   the count of nodes by kind must equal tools/census.print.json (made by P.dumpCensus() on unchanged code). A moved builder that adds or
   drops a node is caught. Not applicable (named) when the live chains differ from the pinned ones (the copy builds the live chain set). */
import { row } from './rows.js';
import * as LIVE from '../audio.js';
import { fxChains } from '../state.js';
import { events } from '../recorder.js';

const CENSUS_FILE='tools/census.print.json';
const isWA=x=> x instanceof AudioNode || x instanceof AudioParam || x instanceof AudioBuffer || (typeof MessagePort!=='undefined' && x instanceof MessagePort);
/* every Web Audio object reachable from E (getters read live; plain objects, arrays, Maps walked; contexts not entered) */
function reach(E, extra){
  const seen=new Set(), wa=new Set();
  const walk=(x,d)=>{ if(!x || typeof x!=='object' || d>8 || seen.has(x)) return; seen.add(x);
    if(isWA(x)){ wa.add(x); return; }
    if(typeof BaseAudioContext!=='undefined' && x instanceof BaseAudioContext) return;
    if(x instanceof Map){ for(const v of x.values()) walk(v,d+1); return; }
    for(const k of Object.keys(x)){ let v; try{ v=x[k]; }catch(e){ continue; } walk(v,d+1); } };
  walk(E,0); if(extra) for(const x of extra) wa.add(x);
  return wa;
}
const nodesOf=S=>[...S].filter(x=>x instanceof AudioNode);
/* the E checks of one instance → problems */
function eCheck(label, E, AC, flags){
  const out=[]; if(E.ac!==AC) out.push(`${label}: E.ac is not this instance's AudioContext`);
  if(!AC) return out;
  const S=reach(E), bad=nodesOf(S).filter(n=>n.context!==AC);
  if(bad.length) out.push(`${label}: ${bad.length} node(s) reachable from E belong to another context (a stale copy) — e.g. ${bad[0].constructor.name}`);
  if(!nodesOf(S).length) out.push(`${label}: no node reachable from E (the walk found nothing — the check cannot fail)`);
  if(flags) for(const [k,v] of Object.entries(flags)) if(E.wk[k]!==v) out.push(`${label}: E.wk.${k}=${E.wk[k]} but the module says ${v}`);
  return out;
}
const shared=(A,B)=>{ const n=[]; for(const x of A) if(B.has(x)) n.push(x); return n; };

export async function checkEngineCtx(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const R=await import('../render.js'), eng=await import('../audio.js?render');
  const liveE=LIVE.engineCtx(), liveFlags=()=>({ ks:LIVE.ksReady, dyn:LIVE.dynReady, frz:LIVE.frzReady });
  if(!LIVE.AC) return { cases:0, total:1, differences:['the engine is not started — press ▶ Play first'] };
  n++; d.push(...eCheck('live (now)', liveE, LIVE.AC, liveFlags()));
  /* (1) the copy right after initAudio (worklets stubbed) — and a plain snapshot for the stale-copy CONTROL */
  let snap=null;
  await R.engineProbe((eng)=>{ const E=eng.engineCtx(); n++; d.push(...eCheck('copy right after initAudio', E, eng.AC, { ks:eng.ksReady, dyn:eng.dynReady, frz:eng.frzReady }));
    n++; if(eng.AC===LIVE.AC) miss('the copy runs on the live context');
    snap={ ac:E.ac, master:{ in:E.master.in, out:E.master.out }, bus:{ ch:E.bus.ch, bs:E.bus.bs } }; });
  /* (2) the copy with its worklets loaded for real */
  await R.engineProbe((eng)=>{ const E=eng.engineCtx(); n++; d.push(...eCheck('copy, worklets loaded', E, eng.AC, { ks:eng.ksReady, dyn:eng.dynReady, frz:eng.frzReady }));
    n++; if(!E.wk.ks) miss('copy, worklets loaded: the KS worklet did not load (E.wk.ks false)'); }, { real:true });
  /* (3) after a track render ran (the copy re-initialised against that render's context) */
  const ly=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b)[0];
  if(ly!=null){ await R.renderTrack(ly,{ quiet:true, short:0.3 }); }
  const E=eng.engineCtx(); n++; d.push(...eCheck('copy after a render', E, eng.AC, { ks:eng.ksReady, dyn:eng.dynReady, frz:eng.frzReady }));
  n++; d.push(...eCheck('live after a render', liveE, LIVE.AC, liveFlags()));
  n++; { const s=shared(reach(liveE), reach(E)); if(s.length) miss(`the live engine and the render copy share ${s.length} Web Audio object(s) — e.g. ${s[0].constructor.name}`); }
  /* CONTROLS */
  n++; { const c=eCheck('control', snap, eng.AC, null); if(!c.length) miss('CONTROL: a plain snapshot of E taken before a render passed the context check after it — a stale copy would go unseen'); }
  n++; { const c=shared(reach(liveE), reach(E, [LIVE.engineCtx().master.in])); if(!c.length) miss('CONTROL: a live node slipped into the copy\'s set was not seen as shared — the check cannot fail'); }
  return { cases:n, total:d.length, differences:d };
}

/* ── the node census ── */
const chainsNow=()=>JSON.stringify(fxChains);   // as HAND1: the live chains the copy builds from
async function censusNow(){
  const R=await import('../render.js');
  return R.engineProbe((eng, ctx)=>{
    const T=0.01;
    const bi=x=>/^(solo|chord|bass|kit)[.]/.test(x.id);   // TIM3d: built-ins only (a session's own timbres are not part of the census)
    eng.LEAD_INSTR.forEach((x,i)=>{ if(bi(x)) eng.leadOn('cs:ld:'+i, 220, 0.5, i, 0, 1, undefined, undefined, T); });
    eng.CHORD_INSTR.forEach((x,i)=>{ if(bi(x)) eng.chordOn('cs:ch:'+i, [220, 277.18, 329.63], 0.5, i, undefined, T); });
    eng.BASS_INSTR.forEach((x,i)=>{ if(bi(x)) eng.bassOn('cs:bs:'+i, 55, 0.5, i, 0, 0, undefined, undefined, T); });
    eng.DRUM_KITS.forEach((_,k)=>{ for(let r=0;r<6;r++) eng.drumHit(r, 0.8, k, undefined, T); });
    eng.droneOn(0.18, T);
    return ctx.__census; },
  { real:true, wrap(ctx){
    const c={ init:{}, play:{} }; let phase='init'; ctx.__census=c; ctx.__phase=p=>{ phase=p; };
    const bump=k=>{ c[phase][k]=(c[phase][k]||0)+1; };
    for(const name of Object.getOwnPropertyNames(BaseAudioContext.prototype)) if(/^create/.test(name) && typeof ctx[name]==='function'){
      const f=ctx[name].bind(ctx); Object.defineProperty(ctx, name, { configurable:true, value:(...a)=>{ bump(name.slice(6)); return f(...a); } }); }
    const W0=window.AudioWorkletNode;
    ctx.__unwrap=()=>{ window.AudioWorkletNode=W0; };
    window.AudioWorkletNode=class extends W0{ constructor(cx,nm,o){ super(cx,nm,o); if(cx===ctx) bump('Worklet:'+nm); } };
  }, after(ctx){ if(ctx.__unwrap) ctx.__unwrap(); }, phase:(ctx)=>ctx.__phase('play') });
}
export async function dumpCensus(){
  const c=await censusNow();
  return { meta:{ format:'handsong/node-census', version:1, made:new Date().toISOString(), file:CENSUS_FILE, chains:chainsNow() }, counts:c };
}
export async function checkCensus(){
  const d=[]; let n=0, pin;
  try{ const r=await fetch(CENSUS_FILE, { cache:'no-store' }); pin=await r.json(); }
  catch(e){ return { cases:0, total:1, differences:[`no census file ${CENSUS_FILE} (${e&&e.message}) — P.dumpCensus() on unchanged code makes it`] }; }
  if(pin.meta.chains!==chainsNow()) return { cases:0, total:0, differences:[], status:'not applicable: the live effect chains differ from the pinned ones' };
  const c=await censusNow();
  for(const ph of ['init','play']){ const A=pin.counts[ph]||{}, B=c[ph]||{};
    for(const k of new Set([...Object.keys(A), ...Object.keys(B)])){ n++; if((A[k]||0)!==(B[k]||0)) d.push(`${ph}: ${k} ${A[k]||0} → ${B[k]||0}`); } }
  return { cases:n, total:d.length, differences:d };
}
row({ at:1000, name:'AUD1 engine context', run:()=>checkEngineCtx(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ calm:true, at:1001, name:'AUD1 node census', run:()=>checkCensus(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:r.status }) });
