/* CMD1a (RUN 5) — CANONICAL JSON and its hash (pure core, rule #36; data row «CMD1 canonical values (core)»). Two values that are EQUAL
   (same keys and numbers, any key order, any object identity) give the same text; any difference in a key, a number or an array order gives
   another. Used by the history's tripwire (song/history.js) to compare VALUES, not objects, so a step parsed back from JSON still matches.
   Rules: keys sorted at every level; undefined, functions and symbols dropped (as JSON does); a number is written by JSON's own exact text
   (round-trip exact for doubles), −0 as 0, a non-finite number as null; arrays in order; Map → [[k, v], …] in insertion order; Set → [v, …]. */
function canonJSON(x){
  if(x===null) return 'null';
  const t=typeof x;
  if(t==='number') return Number.isFinite(x) ? (Object.is(x,-0) ? '0' : JSON.stringify(x)) : 'null';
  if(t==='string') return JSON.stringify(x);
  if(t==='boolean') return x ? 'true' : 'false';
  if(t!=='object') return undefined;   // undefined / function / symbol / bigint: dropped by the caller
  if(Array.isArray(x)) return '['+x.map(v=>{ const s=canonJSON(v); return s===undefined ? 'null' : s; }).join(',')+']';
  if(x instanceof Map) return canonJSON([...x]);
  if(x instanceof Set) return canonJSON([...x]);
  const out=[];
  for(const k of Object.keys(x).sort()){ const s=canonJSON(x[k]); if(s!==undefined) out.push(JSON.stringify(k)+':'+s); }
  return '{'+out.join(',')+'}';
}
/* FNV-1a, 32 bit, over the UTF-16 code units of a string */
function fnv(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619)>>>0; return h; }
const canonHash=x=>fnv(canonJSON(x)||'');
export { canonJSON, fnv, canonHash };
