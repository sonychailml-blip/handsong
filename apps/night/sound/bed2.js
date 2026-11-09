/* NIGHT-4: THE MUSIC BED v2's NODE — one AudioWorkletNode («night-bed», apps/night/worklets/bed-worklet.js) into the master's input (the
   sleep fade and the limiter cover it; live sound, never a track — rule #31). Stateless (rule #38, static check 13): the bed object lives
   with its driver (apps/night/bed2.js), which loads the module into a context once (bed2Load) before building. Parked = disconnected and
   asleep: nothing of it is computed (rule #3 — built once, never torn down). */
export const BED2_WORKLET=new URL('../worklets/bed-worklet.js', import.meta.url).href;
export const BED2_POOLS=Object.freeze({ pad:8, loop:12, glass:6 });
export const BED2_DIV=2;   // the worklet synthesises at rate / 2 (the bed needs nothing above ≈ 10 kHz; it halves the cost) — the tables are made for that rate
/* build into `dest`; o: { tables (bed2Tables at rate / BED2_DIV), seed, recipe (the room's bed2 numbers the worklet reads), events (an offline render: the whole
   timeline up front) } → the bed object */
function buildBed2(E, dest, o){
  const node=new AudioWorkletNode(E.ac, 'night-bed', { numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[2],
    processorOptions:{ tables:o.tables, seed:o.seed>>>0, recipe:o.recipe, pools:BED2_POOLS, div:BED2_DIV, events:o.events||null } });
  node.connect(dest);
  return { node, dest, parked:false };
}
/* a batch of events (each with its explicit AudioContext time) */
function bed2Post(E, b, list){ if(list && list.length) b.node.port.postMessage(list); }
/* parked: out of the graph and asleep; back: awake and in */
function bed2Park(E, b, park){
  if(park===b.parked) return;
  if(park){ b.node.disconnect(); b.node.port.postMessage([{ k:'sleep', v:true }]); }
  else { b.node.port.postMessage([{ k:'sleep', v:false }]); b.node.connect(b.dest); }
  b.parked=park;
}
/* the worklet's counters (voices per layer, dropped notes, late events) → a promise (null after `ms`) */
function bed2Stats(E, b, ms=2000){
  return new Promise(res=>{ const p=b.node.port, f=e=>{ if(e.data && e.data.stats){ p.removeEventListener('message', f); res(e.data.stats); } };
    p.addEventListener('message', f); p.start(); p.postMessage([{ k:'stats' }]); setTimeout(()=>{ p.removeEventListener('message', f); res(null); }, ms); });
}
export { buildBed2, bed2Post, bed2Park, bed2Stats };
