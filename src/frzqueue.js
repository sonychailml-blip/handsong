/* ═══════════════ ⛳ AUTO-FREEZE — the WATCHER (AF3) and the QUEUE (AF1) ═══════════════
   Tracks freeze themselves, unnoticed. Loaded once by render.js (it sets the runner, render.freeze); main.startApp imports render.js
   right after the engine starts, so the watcher runs from the first frame. ON by default; R.autoFreeze(false) turns it off for the session.
   ⛳ THE WATCHER: one timer (QF.pollMs ≈ 250 ms) compares the cheap watch key (recorder.frzWatchKey: global key + pan version + live solo
   chain when some solo note has no map); only when it moves are the tracks' signatures looked at. A track becomes a CANDIDATE once it is
   not fresh and its signature has not changed for its SETTLE delay — the delay of the last trigger (AF_DELAY): 0.5 s after leaving the
   editor, 1.0 s after a take ends / a pan control is released / an undo / a backing / a row delete / a song load / any other change.
   Every signature change resets the clock, so an edit session of any length gives one render after it ends. HOLDS: while recording
   (all), while the editor is open (its track), while a pan control is held (all). Triggers reach the watcher as hints through
   hooks.af(kind) (recorder: take, undo, backing, rowDelete, editor, song; ui: panHold, pan).
   ⛔ Never re-rendered automatically: tracks stale ONLY by tonic, A4 or tempo while AF_REFREEZE_ON_RETUNE is off (user decision until the
   tonic freeze) — they play their events, as before; tracks without a captured chain (auto-freeze never pins the live chain; song load
   and editor inserts pin it — recorder.songPinChains / editInsPush); tracks over the memory budget (skipped, not retried until their
   signature changes or memory is freed; no eviction).
   ⛳ THE QUEUE (AF1): entries by track id (rule #27), one render at a time, priority audible-and-near-the-playhead first (qRank), gates:
   never while recording or recording a clip; at a pinch only if the track's layout fits QF.frameMs (checked at pick and again before the
   layout, render o.layoutGate). A stale result never installs (A2 ticket); 'sig' refusal re-queues the track.
   ⛳ PROBES: the watcher is paused while any P.* runs (scaleprobe.api lock → afPause) and for the whole browser runner session; a probe
   drives it by hand with its own clock (afBegin/afTick/afEnd) — deterministic, no real time. Lower layer: no DOM (rule #5). */
import { events, loop, recording, freezeState, freezeSig, laneIdOf, laneLayerOf, laneAudible, isRecLayer,
         loopPos, songBeats, cycling, laneLenOf, frzWatchKey, frzRetuneOnly, laneHasChain, frzBytesTotal, frzBytesOf,
         editIsOpen, editLayer, laneLevelOf } from './recorder.js';
import { HANDS } from './gestures.js';
import { activeKind } from './clip.js';
import { hooks } from './hooks.js';
import { AC } from './audio.js';

/* ═══ NUMBERS — all auto-freeze delays and limits live here ═══ */
const AF_DELAY={ editor:500, take:1000, pan:1000, undo:1000, backing:1000, rowDelete:1000, song:1000, change:1000, retune:1500 };   // settle, ms
/* User decision (AF3): tonic, A4 and tempo do NOT trigger re-freezing until the tonic-freeze plan; such tracks play live. */
const AF_REFREEZE_ON_RETUNE=false;
/* Memory guard until AF6: total frozen 16-bit data. Touch = primary pointer coarse. */
const AF_BUDGET_MB={ touch:300, desktop:1024 };
const AF_TOUCH= typeof matchMedia==='function' && matchMedia('(pointer: coarse)').matches;
const AF_EST={ preSec:0.5, tailSec:3, ch:2, bytes:2 };   // pre-render size estimate: lead-in + material + a typical tail, stereo 16-bit
/* Queue numbers (AF1): settleMs — console entries; pollMs — the timer; frameMs — layout budget at a pinch; gatePollMs; fails; logN. */
const QF={ settleMs:1000, pollMs:250, frameMs:8, gatePollMs:50, fails:2, logN:40 };

const Q=new Map();        // track id → { id, sig, since, settle, kind, state:'wait'|'run'|'skip', runs, again, fails, pinned, skip, gate, added }
const COST=new Map();     // track id → its last layout, ms (pinch gate)
let costMax=null;
let ON=true, RUN=null, RUNP=null, TIMER=null, RUNNER=null, HOOK=null;
const PAUSE=new Map();    // pause token → count (probe lock, runner)
let WKEY=null, WLAST=-Infinity, CTX=null, PANHOLD=false;   // watcher: last key, last scan time, last hint {kind,t}, pan held
const LVL=new Map();      // probe control only (dbg.level): last level seen per track id
const LOG=[];

const nowMs=()=> HOOK&&HOOK.now ? HOOK.now() : performance.now();
const setRunner=fn=>{ RUNNER=fn; };
const dbg=k=> !!(HOOK&&HOOK.dbg&&HOOK.dbg[k]);
const retuneOn=()=> AF_REFREEZE_ON_RETUNE || dbg('retune');
const budgetBytes=()=> (HOOK&&HOOK.budgetMB!=null ? HOOK.budgetMB : (AF_TOUCH?AF_BUDGET_MB.touch:AF_BUDGET_MB.desktop))*1048576;
const paused=()=>{ for(const n of PAUSE.values()) if(n>0) return true; return false; };

/* ═══ GATES (a probe may replace each) ═══ */
const anyPinch=()=>{ for(const k in HANDS) if(HANDS[k]&&HANDS[k].pinch) return true; return false; };
const G={
  recording:()=> HOOK&&HOOK.gates&&HOOK.gates.recording ? HOOK.gates.recording() : recording,
  clip:     ()=> HOOK&&HOOK.gates&&HOOK.gates.clip      ? HOOK.gates.clip()      : activeKind()!=null,
  pinch:    ()=> HOOK&&HOOK.gates&&HOOK.gates.pinch     ? HOOK.gates.pinch()     : anyPinch(),
};
const costOf=id=> COST.has(id) ? COST.get(id) : (costMax!=null ? costMax : Infinity);
function gateBlock(id){
  if(G.recording()) return 'recording';
  if(G.clip()) return 'clip';
  if(G.pinch() && !(costOf(id)<=QF.frameMs)) return 'pinch';
  return null;
}
function gateWait(e){
  return new Promise(res=>{
    const step=()=>{ const b=gateBlock(e.id); e.gate=b; if(!b) return res(); setTimeout(step, QF.gatePollMs); };
    step(); });
}
/* Held now: the editor's track while it is open; everything while a pan control is held. (Recording is a queue gate; its end is a hint.) */
function heldLayer(ly){ return PANHOLD || (editIsOpen() && editLayer()===ly); }

/* ═══ PRIORITY — pure (the AF1 probe checks it on made-up entries). it: { id, layer, audible, b0, b1 }; ctx: { p, end, rgn } ═══ */
function untilHeard(it, ctx){
  const p=ctx.p, b0=it.b0, b1=it.b1;
  if(ctx.rgn&&ctx.rgn.on){ const f=ctx.rgn.from, t=ctx.rgn.to;
    const s=Math.max(b0,f), e=Math.min(b1,t);
    if(!(e>s-1e-9)) return 2*Math.max(ctx.end,1)+b0;   // outside a cycling brace: after everything
    const q= p>=f&&p<t ? p : f;
    const lead= p<f ? f-p : 0;
    if(q>=s-1e-9 && q<=e+1e-9) return lead;
    return lead + (s>q ? s-q : (t-q)+(s-f));
  }
  if(p>=b0-1e-9 && p<=b1+1e-9) return 0;
  if(b0>p) return b0-p;
  return Math.max(0,ctx.end-p)+b0;                     // behind: next heard from the song start
}
function qRank(list, ctx){
  return list.map(it=>({it, k:[it.audible?0:1, untilHeard(it,ctx), it.b0, it.layer]}))
    .sort((x,y)=>{ for(let i=0;i<4;i++){ const d=x.k[i]-y.k[i]; if(d) return d; } return 0; })
    .map(x=>x.it);
}
function rankCtx(){
  if(HOOK&&HOOK.ctx) return HOOK.ctx();
  const lp=loopPos(), p= lp&&lp.phase==='play' ? lp.pos : Math.max(0, loop.pos||0);
  return { p, end:songBeats(), rgn: cycling() ? { on:true, from:loop.rgn.from, to:loop.rgn.to } : null };
}
function spans(){
  const m=new Map();
  for(const e of events){ const s=m.get(e.layer); if(!s) m.set(e.layer,{b0:e.t,b1:e.t}); else { if(e.t<s.b0) s.b0=e.t; if(e.t>s.b1) s.b1=e.t; } }
  for(const [ly,s] of m){ const L=laneLenOf(ly); if(L>s.b1) s.b1=L; }
  return m;
}
/* Pre-render size of a track's frozen data (bytes): lead-in + its material + a typical tail. The exact check follows the render (admit). */
function estBytes(ly, sp){
  const s=sp.get(ly)||{b0:0,b1:0}, rate=AC?AC.sampleRate:48000;
  return Math.round((AF_EST.preSec + (s.b1-s.b0)*60/loop.bpm + AF_EST.tailSec)*rate)*AF_EST.ch*AF_EST.bytes;
}
const fitsBudget=(ly, bytes)=> frzBytesTotal()-frzBytesOf(ly)+bytes <= budgetBytes();

/* ═══ ENTRIES ═══ The watched signature: freezeSig (+ the level, only in the probe's control "a watcher that reacts to level"). */
const watchSig=ly=> freezeSig(ly) + (dbg('level') ? '|lv'+laneLevelOf(ly) : '');
const delayOf=kind=> AF_DELAY[kind]!=null ? AF_DELAY[kind] : AF_DELAY.change;
function qAdd(layer, why, at){
  const id=laneIdOf(layer); if(id==null) return false;
  if(!events.some(e=>e.layer===layer)) return false;
  const e=Q.get(id), sig=watchSig(layer), t=at!=null?at:nowMs();
  if(e){ if(e.state!=='run' && e.sig!==sig){ e.sig=sig; if(!dbg('noReset')) e.since=t; if(e.state==='skip'&&e.skip&&e.skip.why!=='no chain'){ e.state='wait'; e.skip=null; } } return true; }
  Q.set(id,{ id, sig, since:t, settle: AF_DELAY[why]!=null ? AF_DELAY[why] : QF.settleMs, kind:why||'console', state:'wait', runs:0, again:false, fails:0,
             pinned:false, skip:null, gate:null, added:t });
  return true;
}
/* Is the track a candidate at all: has events, not being recorded, not fresh, not stale only by tonic/A4/tempo (switch off). */
function wants(ly){
  if(isRecLayer(ly)) return false;
  const st=freezeState(ly);
  if(st==='fresh') return dbg('level') && LVL.has(laneIdOf(ly)) && LVL.get(laneIdOf(ly))!==laneLevelOf(ly);
  if(st==='stale' && !retuneOn() && frzRetuneOnly(ly)) return false;
  return true;
}

/* ═══ THE WATCHER — one scan when the watch key moved (or a hint asked for one) ═══ */
function wScan(force){
  const t=nowMs(), key=frzWatchKey()+(dbg('level')?'|'+[...new Set(events.map(e=>e.layer))].map(laneLevelOf).join(','):'');
  if(!force && key===WKEY) return false;
  WKEY=key;
  const at= CTX && CTX.t>WLAST ? CTX.t : t;            // a change that came with a hint dates from the hint
  const kind= CTX && CTX.t>WLAST ? CTX.kind : 'change';
  WLAST=t;
  const only= HOOK&&HOOK.layers ? new Set(HOOK.layers) : null;
  const lys=[...new Set(events.map(e=>e.layer))].filter(ly=>!only||only.has(ly));
  for(const ly of lys){ const id=laneIdOf(ly); if(id==null) continue;
    const e=Q.get(id);
    if(!wants(ly)){ if(e&&e.state!=='run') Q.delete(id); if(freezeState(ly)==='fresh') LVL.set(id, laneLevelOf(ly)); continue; }
    if(!e){ qAdd(ly, kind, at); const n=Q.get(id); if(n&&kind==='change'&&frzRetuneOnly(ly)){ n.settle=AF_DELAY.retune; n.kind='retune'; } continue; }
    if(e.state==='run') continue;
    const sig=watchSig(ly);
    if(sig!==e.sig){ e.sig=sig; if(!dbg('noReset')) e.since=at; e.settle=delayOf(kind); e.kind=kind;
      if(e.state==='skip'&&e.skip&&e.skip.why!=='no chain'){ e.state='wait'; e.skip=null; } }
  }
  for(const e of [...Q.values()]) if(e.state!=='run'){ const ly=laneLayerOf(e.id); if(ly==null||!events.some(x=>x.layer===ly)) Q.delete(e.id); }
  return true;
}
/* A trigger: its delay applies from NOW to every waiting entry (the settle clock resets) and to changes the next scan finds.
   'panHold' only holds (a pan control is pressed); 'pan' releases it. */
function afHint(kind){
  if(kind==='panHold'){ PANHOLD=true; return; }
  if(kind==='pan') PANHOLD=false;
  const t=nowMs(); CTX={ kind, t };
  for(const e of Q.values()) if(e.state==='wait'){ if(!dbg('noReset')) e.since=t; e.settle=delayOf(kind); e.kind=kind; }
  WKEY=null;                                             // the next tick scans even if the key did not move
}
hooks.af=afHint;

/* ═══ ONE QUEUE STEP ═══ Returns 'off' | 'busy' | 'idle' | 'settling' | 'held' | 'gate:…' | 'skip:L#:why' | 'start:L#'. */
function qStep(){
  if(!ON) return 'off';
  const t=nowMs();
  for(const e of [...Q.values()]){
    if(e.state==='run') continue;
    const ly=laneLayerOf(e.id);
    if(ly==null){ qLog(e,null,'gone'); Q.delete(e.id); continue; }
    if(!events.some(x=>x.layer===ly)){ qLog(e,ly,'empty'); Q.delete(e.id); continue; }
    if(freezeState(ly)==='fresh' && !dbg('level')){ Q.delete(e.id); continue; }
    const sig=watchSig(ly); if(sig!==e.sig){ e.sig=sig; if(!dbg('noReset')) e.since=t; if(e.state==='skip'&&e.skip.why!=='no chain'){ e.state='wait'; e.skip=null; } }
    if(e.state==='skip'){
      if(e.skip.why==='no chain' && laneHasChain(ly)){ e.state='wait'; e.skip=null; }
      else if(e.skip.why==='budget' && frzBytesTotal()<e.skip.total){ e.state='wait'; e.skip=null; } }
  }
  if(RUN) return 'busy';
  if(!Q.size) return 'idle';
  if(!RUNNER) return 'no runner';                    // render.js not loaded yet
  if(G.recording()) return 'gate:recording';
  if(G.clip()) return 'gate:clip';
  const sp=spans(), ready=[]; let held=false;
  for(const e of Q.values()){
    if(e.state!=='wait') continue;
    const ly=laneLayerOf(e.id); if(ly==null || isRecLayer(ly)) continue;
    if(heldLayer(ly)){ held=true; continue; }
    if(t-e.since<e.settle) continue;
    const s=sp.get(ly)||{b0:0,b1:0};
    ready.push({ id:e.id, layer:ly, audible:laneAudible(ly), b0:s.b0, b1:s.b1 });
  }
  if(!ready.length) return held ? 'held' : 'settling';
  const order=qRank(ready, rankCtx());
  for(const it of order){ const e=Q.get(it.id);
    if(!laneHasChain(it.layer)){ e.state='skip'; e.skip={ why:'no chain' }; qLog(e,it.layer,'skipped: no captured chain (auto-freeze never pins the live chain)'); return 'skip:L'+(it.layer+1)+':no chain'; }
    const est=estBytes(it.layer, sp);
    if(!fitsBudget(it.layer, est)){ e.state='skip'; e.skip={ why:'budget', total:frzBytesTotal(), est };
      qLog(e,it.layer,`skipped: over the memory budget (${mb(frzBytesTotal())} + ~${mb(est)} > ${mb(budgetBytes())} MB)`); return 'skip:L'+(it.layer+1)+':budget'; } }
  const pick=order.find(it=>Q.get(it.id).state==='wait' && !gateBlock(it.id));
  if(!pick){ for(const it of order) Q.get(it.id).gate='pinch'; return 'gate:pinch'; }
  RUNP=qRun(Q.get(pick.id), pick.layer);
  return 'start:L'+(pick.layer+1);
}
const mb=b=>(b/1048576).toFixed(1);
/* ═══ RUN ═══ render.freeze with the A2 ticket; never pins (noPin) — a chain-less track was skipped above; admit = the exact budget check
   on the packed size, before install. */
async function qRun(e, layer){
  RUN=e; e.state='run'; e.runs++; e.gate=null;
  const t0=nowMs(); let res='error', why=null, lay=null;
  try{
    const opt={ quiet:true, noPin:true, layoutGate:()=>gateWait(e), admit:bytes=>fitsBudget(layer, bytes), ...(HOOK&&HOOK.opt?HOOK.opt:null) };
    const r=await RUNNER(layer, opt);
    lay= r&&r.ms&&r.ms.layoutMs!=null ? r.ms.layoutMs : null;
    if(lay!=null){ COST.set(e.id, lay); costMax= costMax==null ? lay : Math.max(costMax, lay); }
    if(r&&r.installed){ res='installed'; Q.delete(e.id); LVL.set(e.id, laneLevelOf(layer)); }
    else if(r&&r.refused==='sig'){ res='stale — re-queued';
      if(!ON) Q.delete(e.id);
      else { const ly=laneLayerOf(e.id); e.state='wait'; e.again=true; e.since=nowMs(); e.sig= ly!=null ? watchSig(ly) : e.sig; } }
    else if(r&&r.refused==='budget'){ res='skipped: over the memory budget after render'; e.state='skip'; e.skip={ why:'budget', total:frzBytesTotal() }; }
    else if(r&&r.refused==='lane'){ res='gone'; Q.delete(e.id); }
    else { res='refused: '+(r&&r.refused); Q.delete(e.id); }
  }catch(err){
    why=(err&&err.message)||String(err); e.fails++;
    if(e.fails>=QF.fails || !ON){ res='error — dropped'; Q.delete(e.id); } else { res='error — re-queued'; e.state='wait'; e.since=nowMs(); }
  }finally{
    qLog(e, layer, res, { layoutMs:lay, ms:Math.round(nowMs()-t0), why });
    RUN=null;
  }
  return res;
}
function qLog(e, layer, res, x){
  LOG.push({ L: layer!=null ? 'L'+(layer+1) : '—', id:e.id, res, runs:e.runs, trigger:e.kind, ...(x||null) });
  while(LOG.length>QF.logN) LOG.shift();
}

/* ═══ DRIVER ═══ The timer runs while auto-freeze is on (or a render finishes); does nothing while paused or driven by a probe. */
function afTick(){ wScan(false); return qStep(); }
function pump(){
  TIMER=null;
  if(!HOOK && !paused()){ try{ afTick(); }catch(err){ console.warn('[autoFreeze] step failed: '+(err&&err.message)); } }   // eslint-disable-line no-console
  if(ON || RUN) TIMER=setTimeout(pump, QF.pollMs);
}
const pumpStart=()=>{ if(!TIMER) TIMER=setTimeout(pump, 0); };
/* Pause by token (counted; the probe lock nests). afIdle — resolves when no render runs (a probe waits for one in flight). */
function afPause(token, on){
  const n=(PAUSE.get(token)||0)+(on?1:-1);
  if(n>0) PAUSE.set(token,n); else PAUSE.delete(token);
  if(!on && !paused()){ WKEY=null; if(ON) pumpStart(); }   // on resume: a full scan
  return paused();
}
const afBusy=()=>!!RUN;
const afIdle=()=> RUNP && RUN ? RUNP.then(()=>{},()=>{}) : Promise.resolve();
/* Is auto-freeze able to start something right now (probes refuse to run beside it). */
const afActive=()=> !!RUN || (ON && !paused() && !HOOK);
/* AF4: the arrangement window's dot for a row — 'run' rendering, 'wait' waiting to freeze (settling, ready or gated), null otherwise
   (fresh, live by choice: skipped or stale only by tonic/A4/tempo). */
function afRowState(layer){
  if(!ON && !RUN) return null;
  const id=laneIdOf(layer); if(id==null) return null;
  const e=Q.get(id); if(!e) return null;
  return e.state==='run' ? 'run' : e.state==='wait' ? 'wait' : null;
}
hooks.afRow=afRowState;

/* ═══ CONSOLE ═══ R.autoFreeze(true|false) · R.freezeQueue(). */
function autoFreeze(on){
  if(on==null) return ON;
  if(HOOK){ console.warn('[autoFreeze] a probe is using the queue — try again when it finishes'); return ON; }   // eslint-disable-line no-console
  if(on){ ON=true; WKEY=null; pumpStart();
    console.log(`%c[autoFreeze] ON — tracks freeze themselves after their settle delay (editor ${AF_DELAY.editor} ms, take/pan/undo/backing/row delete/song ${AF_DELAY.take} ms). One render at a time; never while recording or recording a clip; a costly layout waits while a hand pinches. R.freezeQueue() lists it.`,'font-weight:bold'); }   // eslint-disable-line no-console
  else { ON=false; const n=[...Q.values()].filter(e=>e.state!=='run').length;
    for(const e of [...Q.values()]) if(e.state!=='run') Q.delete(e.id);
    console.log(`[autoFreeze] OFF for this session — ${n} waiting track(s) dropped${RUN?'; the render in progress cannot be cancelled: it finishes and installs if still valid':''}.`); }   // eslint-disable-line no-console
  return ON;
}
function freezeQueue(){
  const t=nowMs(), sp=spans(), list=[];
  for(const e of Q.values()){ const ly=laneLayerOf(e.id), s=ly!=null?sp.get(ly):null;
    list.push({ id:e.id, layer:ly, audible: ly!=null&&laneAudible(ly), b0:s?s.b0:0, b1:s?s.b1:0, e }); }
  const ord=qRank(list, rankCtx());
  const rows=ord.map((it,i)=>{ const e=it.e, quiet=t-e.since, held=it.layer!=null&&heldLayer(it.layer);
    return { '#':i+1, track: it.layer!=null?'L'+(it.layer+1):'—',
      state: e.state==='run' ? 'rendering' : e.state==='skip' ? 'skipped: '+e.skip.why : held ? 'held ('+(PANHOLD?'pan held':'editor open')+')'
        : quiet<e.settle ? `settling (${((e.settle-quiet)/1000).toFixed(2)} s left)` : (e.gate ? 'waiting: '+e.gate : 'ready'),
      trigger: e.kind, 'settle ms': e.settle, audible: it.audible, beats: it.b0+'–'+it.b1, 'est MB': it.layer!=null?+mb(estBytes(it.layer,sp)):'—',
      'layout ms (last)': COST.has(e.id)?COST.get(e.id):'—', renders: e.runs, again: e.again }; });
  /* tracks that play live by choice: stale only by tonic/A4/tempo (switch off) */
  const live=[...new Set(events.map(e=>e.layer))].filter(ly=>!retuneOn() && frzRetuneOnly(ly)).map(ly=>({ track:'L'+(ly+1), why:'stale only by tonic/A4/tempo — AF_REFREEZE_ON_RETUNE is off (user decision): plays its events' }));
  const used=frzBytesTotal(), lim=budgetBytes();
  /* eslint-disable no-console */
  console.log(`[freezeQueue] ${ON?'ON':'OFF'}${paused()?' · PAUSED ('+[...PAUSE.keys()].join(', ')+')':''} · ${Q.size} entr${Q.size===1?'y':'ies'} · ${RUN?'rendering now':'idle'} · memory ${mb(used)} of ${mb(lim)} MB (${AF_TOUCH?'touch':'desktop'} budget) · re-freeze on tonic/A4/tempo ${retuneOn()?'ON':'OFF'} · holds: recording ${G.recording()}, editor ${editIsOpen()}, pan ${PANHOLD} · gates: clip ${G.clip()}, pinch ${G.pinch()}`);
  if(rows.length) console.table(rows);
  if(live.length){ console.log('[freezeQueue] live by choice:'); console.table(live); }
  if(LOG.length){ console.log('[freezeQueue] last outcomes:'); console.table(LOG.slice(-10)); }
  /* eslint-enable no-console */
  return { on:ON, paused:paused(), running:!!RUN, queue:rows, live, memory:{ usedMB:+mb(used), budgetMB:+mb(lim), touch:AF_TOUCH }, delays:{...AF_DELAY}, retune:retuneOn(), log:LOG.slice() };
}

/* ═══ FOR PROBES ═══ afBegin(hook): the watcher and queue run with NO timer — steps by hand (afTick / qStep), with hook replacements:
   { now, gates:{recording,clip,pinch}, ctx, opt (merged into the runner's options — a fake render), settleMs, frameMs, gatePollMs,
   layers (watcher scope), budgetMB, dbg:{ noReset, level, retune } (controls) }. afEnd() puts everything back. Refuses while a render
   runs or another probe drives it. qBegin/qEnd = the AF1 names. */
let KEEP=null;
function afBegin(hook){
  if(RUN||HOOK) return false;
  KEEP={ QF:{...QF}, cost:new Map(COST), costMax, on:ON, panHold:PANHOLD };
  HOOK=hook||{}; ON=true; Q.clear(); LVL.clear(); WKEY=null; WLAST=-Infinity; CTX=null; PANHOLD=false;
  COST.clear(); costMax=null;
  for(const k of ['settleMs','frameMs','gatePollMs']) if(HOOK[k]!=null) QF[k]=HOOK[k];
  return true;
}
function afEnd(){
  Q.clear(); LVL.clear(); HOOK=null; WKEY=null; WLAST=-Infinity; CTX=null;
  if(KEEP){ Object.assign(QF,KEEP.QF); COST.clear(); for(const [k,v] of KEEP.cost) COST.set(k,v); costMax=KEEP.costMax; ON=KEEP.on; PANHOLD=KEEP.panHold; }
  KEEP=null; if(ON) pumpStart();
}
const qBegin=afBegin, qEnd=afEnd;
const qRunning=()=>RUNP;
const qState=()=>({ on:ON, running:!!RUN, size:Q.size, entries:[...Q.values()].map(e=>({...e})) });
const qCostSet=(layer,ms)=>{ const id=laneIdOf(layer); if(id==null) return; if(ms==null) COST.delete(id); else COST.set(id,ms); };
const qCostOf=layer=>{ const id=laneIdOf(layer); return id==null||!COST.has(id) ? null : COST.get(id); };

pumpStart();   // ON by default: the watcher starts with the module (loaded by render.js after the engine starts)

export { autoFreeze, freezeQueue, setRunner, afPause, afIdle, afBusy, afActive, afRowState,
  AF_DELAY, AF_REFREEZE_ON_RETUNE, AF_BUDGET_MB,
  /* probes only (P.checkFreezeQueue, P.checkAutoFreeze) */
  afBegin, afEnd, afTick, afHint, qBegin, qEnd, qStep, qAdd, qRank, qRunning, qState, qCostSet, qCostOf, QF };
