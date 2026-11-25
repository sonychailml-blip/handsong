/* SPEED-1 step 6 — THE FOREST'S PLACES REMEMBERED FOR THE SESSION. Each opening of the forest searched again, for every blade, herb, fern
   and root, the same free places (about 10 s of a Standard opening on the founder's laptop); the answers depend only on the build's world
   (its level table and parts), so the first build of a world records each pure search's answers in call order and the next builds of that
   world replay them. Every call is checked against the recorded one by its plain arguments (numbers, short number lists, the numbers of an
   options table); a call unlike its record stops the replay of that search for this build (it searches afresh). A build that fails records
   nothing. Answers are copied both ways (a caller may change what it gets). memoOff (probes, ?speedoff) = always search.
   SPEED-1 step 7: the PLACES FILES (rooms/forest/places/<level>.json, written by tools/forest-places.mjs) carry a world's record, named by the hash
   of its key: a build whose world has no record in memory yet starts from the file's (memoSeed), so even the first opening replays. A file of
   another world (the level table changed) is never used — the row «FOREST places remembered» says it is stale. */
const STORE=new Map(), SEED=new Map(), STATS={ worlds:0, replays:0, hits:0, misses:0, files:0 };
let memoOff=false, filesOff=false;
export const PLACES_FORMAT='handsong/forest-places';
export const PLACES_ONCE=Object.freeze(['spruceSkip']);   // searches a room's own session memo asks only on its first build (forest-canopy.js MEMO): a later build leaves them unasked
export const PLACES_SKIP=Object.freeze(['base']);   // not in the files: the trunks' root meshes are whole grids (7 of a level's 7.6 MB), ~1 s to make — a file-started build records them
export const WORLDS_KEPT=3;   // Standard (Light shares it), Detailed and one more (the probes build many worlds: the oldest goes)
export const forestMemoDbg=o=>{ if(o && 'off' in o) memoOff=!!o.off; if(o && 'files' in o) filesOff=!o.files; if(o && o.clear) STORE.clear();
  if(o && o.poke) for(const rec of STORE.values()){ const e=(rec.calls.get(o.poke)||[])[0]; if(e && Array.isArray(e.v)) e.v=[e.v[0]+0.5, ...e.v.slice(1)]; }   // probes' CONTROL: the first recorded answer of a search moved by 0.5
  return { off:memoOff, files:!filesOff, worlds:STORE.size, seeds:[...SEED.keys()], ...STATS }; };
const plain=v=>typeof v==='number' || typeof v==='string' || typeof v==='boolean' || v==null;
const sigOf=a=>a.map(v=>plain(v) ? String(v) : typeof v==='function' ? 'f'
  : Array.isArray(v) ? (v.length<=16 && v.every(x=>typeof x==='number') ? v.join(',') : 'a'+v.length)
  : ArrayBuffer.isView(v) ? 'b'+v.length : Object.entries(v).filter(([, x])=>typeof x==='number' || typeof x==='boolean').map(([k, x])=>k+':'+x).join(';')).join('|');
const copy=v=>Array.isArray(v) ? v.map(copy) : ArrayBuffer.isView(v) ? v.slice() : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).map(([k, x])=>[k, copy(x)])) : v;
/* a world key → its name in the files (two FNV-1a hashes, 16 hex digits) */
export function placesKey(key){ let a=0x811c9dc5, b=0x9747b28c; for(let i=0;i<key.length;i++){ const c=key.charCodeAt(i); a=Math.imul(a^c, 16777619); b=Math.imul(b^c, 0x01000193)^(b>>>13); }
  return (a>>>0).toString(16).padStart(8, '0')+(b>>>0).toString(16).padStart(8, '0'); }
/* JSON both ways: typed arrays and the numbers JSON cannot hold (-0, NaN, ±Infinity) kept exactly */
const enc=v=>typeof v==='number' ? (Object.is(v, -0) || !Number.isFinite(v) ? { '@n':Object.is(v, -0) ? '-0' : String(v) } : v) : ArrayBuffer.isView(v) ? { '@t':v.constructor.name, a:Array.from(v, enc) }
  : Array.isArray(v) ? v.map(enc) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).map(([k, x])=>[k, enc(x)])) : v;
const TYPED={ Float32Array, Float64Array, Int32Array, Uint32Array, Uint16Array, Int16Array, Uint8Array, Int8Array };
const dec=v=>Array.isArray(v) ? v.map(dec) : v && typeof v==='object' ? ('@n' in v ? Number(v['@n']) : '@t' in v ? new TYPED[v['@t']](v.a.map(dec)) : Object.fromEntries(Object.entries(v).map(([k, x])=>[k, dec(x)]))) : v;
/* a places file (parsed JSON) → true if taken (its world's record waits for a build of that world) */
export function memoSeed(J){ if(!J || J.format!==PLACES_FORMAT || J.version!==1 || typeof J.key!=='string' || !J.calls || typeof J.calls!=='object') return false;
  try{ const calls=new Map(Object.entries(J.calls).map(([k, L])=>[k, L.map(([s, v])=>({ s, v:dec(v) }))])); SEED.set(J.key, { calls }); return true; }catch(e){ return false; } }
/* the tool: the record of world `key` (or its hash) as a places file (null: not recorded) */
export function memoExport(key){ const k=[...STORE.keys()].find(x=>x===key || placesKey(x)===key), rec=k!=null && STORE.get(k); if(!rec) return null;   // key: the world's key or its hash
  return { format:PLACES_FORMAT, version:1, key:placesKey(k), calls:Object.fromEntries([...rec.calls].filter(([k])=>!PLACES_SKIP.includes(k)).map(([k, L])=>[k, L.map(e=>[e.s, enc(e.v)])])) }; }
/* one build: key — its world; off — search always (the undo) → { wrap(name, fn), end(), state() } */
export function placeMemo(key, off=false){
  const inMem=off || memoOff ? null : STORE.get(key), seed=!inMem && !off && !memoOff && !filesOff ? SEED.get(placesKey(key)) : null, file= seed ? { calls:new Map([...seed.calls].map(([k, L])=>[k, L.map(e=>({ ...e }))])) } : null, was=inMem || file, rec= was || { calls:new Map() },   /* a file's record copied: this session's own (the CONTROL's poke, the recorded roots never reach the seed) */ seq=new Map(), broken=new Set(); let hits=0, misses=0;
  const have=new Set(was ? rec.calls.keys() : []);   // the searches this build replays; any other (a file's skipped one) is searched and recorded
  if(was) STATS.replays++; if(file){ STATS.files++; STORE.set(key, rec); while(STORE.size>WORLDS_KEPT) STORE.delete(STORE.keys().next().value); }   // a file's record is this session's from now on
  function wrap(name, fn){ if(off || memoOff) return fn;
    return (...a)=>{ const i=seq.get(name)||0; seq.set(name, i+1); const s=sigOf(a);
      if(have.has(name)){ const e=!broken.has(name) && (rec.calls.get(name)||[])[i]; if(e && e.s===s){ hits++; return copy(e.v); } broken.add(name); misses++; return fn(...a); }
      const v=fn(...a); let L=rec.calls.get(name); if(!L) rec.calls.set(name, L=[]); L.push({ s, v:copy(v) }); return v; }; }
  function end(){ if(off || memoOff) return; if(was){ STATS.hits+=hits; STATS.misses+=misses; if(!file) return; } STORE.set(key, rec); while(STORE.size>WORLDS_KEPT) STORE.delete(STORE.keys().next().value); STATS.worlds=STORE.size; }
  const state=()=>({ key:placesKey(key), replay:!!was, from: inMem ? 'memory' : file ? 'file' : null, hits, misses, broken:[...broken], recorded:[...rec.calls.keys()].filter(k=>!have.has(k)), left:Object.fromEntries([...have].map(k=>[k, (rec.calls.get(k)||[]).length-(seq.get(k)||0)]).filter(([, v])=>v)), calls:Object.fromEntries([...rec.calls].map(([k, L])=>[k, L.length])) });
  return { wrap, end, state };
}
