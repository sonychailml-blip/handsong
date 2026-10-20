/* VIS1a (RUN 6, docs/VIS1-design.md §3) — THE EVENT BUS for visuals. CORE: pure (rule #36), node-tested (row «VIS1 bus (core)»).
   Two kinds of topic. STATE topics hold the latest value (set → the version goes up; a reader compares versions, once per frame).
   EVENT topics are rings of timestamped items (push; a reader asks for everything after the sequence number it saw — a reader that falls
   behind loses the oldest, never blocks a writer). Writers: main.onHands (hands, picture), live/eng.js (notes — the LIVE engine only; the
   render copy never publishes), calmshell.js (calmFx — the Calm effects' values, RUN 7; calmNight — the mood and the sleep timer's progress, RUN 9). Readers: visual modules (views/stack.js) — through reader(), which cannot write (a write throws: CONTROL).
   Rule #33: the bus never leaves the page. */
export const RING_N=512;
export function createBus({ ring=RING_N }={}){
  const state=new Map(), rings=new Map();
  const ringOf=t=>{ let r=rings.get(t); if(!r){ r={ items:new Array(ring), seq:0 }; rings.set(t,r); } return r; };
  const get=t=>{ const s=state.get(t); return s ? s.value : undefined; };
  const version=t=>{ const s=state.get(t); return s ? s.ver : 0; };
  /* items pushed after sequence number `seq` (oldest first; at most the ring's length) → { items, seq, lost } */
  const since=(t, seq=0)=>{ const r=rings.get(t); if(!r) return { items:[], seq:0, lost:0 };
    const from=Math.max(seq, r.seq-ring), items=[]; for(let i=from;i<r.seq;i++) items.push(r.items[i%ring]);
    return { items, seq:r.seq, lost:from-seq }; };
  const bus={
    set:(t, v)=>{ let s=state.get(t); if(!s){ s={ value:v, ver:0 }; state.set(t,s); } s.value=v; s.ver++; return s.ver; },
    push:(t, item)=>{ const r=ringOf(t); r.items[r.seq%ring]=item; return ++r.seq; },
    get, version, since,
    seq:t=>{ const r=rings.get(t); return r ? r.seq : 0; },
    /* a reader's view: reads only — every write throws (a visual never writes the bus) */
    reader:()=>{ const no=()=>{ throw new Error('a bus reader cannot write'); };
      return Object.freeze({ get, version, since, seq:bus.seq, set:no, push:no }); },
  };
  return bus;
}
/* the app's one bus (pure: no DOM, no audio — whoever imports this module shares it) */
export const BUS=createBus();
