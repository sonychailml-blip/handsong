/* SPEED-1 step 6 — THE FOREST'S PLACES REMEMBERED FOR THE SESSION. Each opening of the forest searched again, for every blade, herb, fern
   and root, the same free places (about 10 s of a Standard opening on the founder's laptop); the answers depend only on the build's world
   (its level table and parts), so the first build of a world records each pure search's answers in call order and the next builds of that
   world replay them. Every call is checked against the recorded one by its plain arguments (numbers, short number lists, the numbers of an
   options table); a call unlike its record stops the replay of that search for this build (it searches afresh). A build that fails records
   nothing. Answers are copied both ways (a caller may change what it gets). memoOff (probes, ?speedoff) = always search. */
const STORE=new Map(), STATS={ worlds:0, replays:0, hits:0, misses:0 };
let memoOff=false;
export const WORLDS_KEPT=3;   // Standard (Light shares it), Detailed and one more (the probes build many worlds: the oldest goes)
export const forestMemoDbg=o=>{ if(o && 'off' in o) memoOff=!!o.off; if(o && o.clear) STORE.clear();
  if(o && o.poke) for(const rec of STORE.values()){ const e=(rec.calls.get(o.poke)||[])[0]; if(e && Array.isArray(e.v)) e.v[0]+=0.5; }   // probes' CONTROL: the first recorded answer of a search moved by 0.5
  return { off:memoOff, worlds:STORE.size, ...STATS }; };
const plain=v=>typeof v==='number' || typeof v==='string' || typeof v==='boolean' || v==null;
const sigOf=a=>a.map(v=>plain(v) ? String(v) : typeof v==='function' ? 'f'
  : Array.isArray(v) ? (v.length<=16 && v.every(x=>typeof x==='number') ? v.join(',') : 'a'+v.length)
  : ArrayBuffer.isView(v) ? 'b'+v.length : Object.entries(v).filter(([, x])=>typeof x==='number' || typeof x==='boolean').map(([k, x])=>k+':'+x).join(';')).join('|');
const copy=v=>Array.isArray(v) ? v.map(copy) : ArrayBuffer.isView(v) ? v.slice() : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).map(([k, x])=>[k, copy(x)])) : v;
/* one build: key — its world; off — search always (the undo) → { wrap(name, fn), end(), state() } */
export function placeMemo(key, off=false){
  const was=off || memoOff ? null : STORE.get(key), rec= was || { calls:new Map() }, seq=new Map(), broken=new Set(); let hits=0, misses=0;
  if(was) STATS.replays++;
  function wrap(name, fn){ if(off || memoOff) return fn;
    return (...a)=>{ const i=seq.get(name)||0; seq.set(name, i+1); const s=sigOf(a);
      if(was){ const e=!broken.has(name) && (rec.calls.get(name)||[])[i]; if(e && e.s===s){ hits++; return copy(e.v); } broken.add(name); misses++; return fn(...a); }
      const v=fn(...a); let L=rec.calls.get(name); if(!L) rec.calls.set(name, L=[]); L.push({ s, v:copy(v) }); return v; }; }
  function end(){ if(off || memoOff) return; if(was){ STATS.hits+=hits; STATS.misses+=misses; return; } STORE.set(key, rec); while(STORE.size>WORLDS_KEPT) STORE.delete(STORE.keys().next().value); STATS.worlds=STORE.size; }
  const state=()=>({ key:key.length, replay:!!was, hits, misses, broken:[...broken], calls:Object.fromEntries([...rec.calls].map(([k, L])=>[k, L.length])) });
  return { wrap, end, state };
}
