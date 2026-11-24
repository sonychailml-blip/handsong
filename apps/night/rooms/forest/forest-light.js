/* SPEED-1 step 5 — THE LIGHT QUALITY'S FOREST (the founder chose all three after looking live, 2026-11-24). Over Standard's picture, while
   Light is on (the room's record `light`, over Standard's level):
   - leafEvery 2: every other card of each dense plant set (crown sprays, spruce cards, herbs, fine ferns; a set of ≤ THIN_MIN cards stays whole);
   - plantsPerVertex: the plants lit per vertex (Lambert; the same sway, cells and soft edges — their patches touch only the vertex and alpha stages);
   - wildLights false: the wild fireflies keep their glow but lose their own two point lights (held at intensity 0 — the dark-light skip passes them by;
     hiding them would change every lit program: SPEED-1 step 6 measured a 5-s first switch).
   Applied and undone in place, without a rebuild (the host calls the room's `light(on)` at the opening and when Light turns on or off):
   Standard's arrays, counts and materials come back exactly. Neutral values (Standard, ?speedoff) change nothing. */
export const THIN_MIN=20;
/* ctx: { T, plants (the meshes drawn with the plants' material), wild (the wild fireflies' lights), own } → { set(L), state() } */
export function buildLightParts(ctx){
  const { T, plants, wild, own }=ctx, thinable=plants.filter(o=>o.isInstancedMesh && o.count>THIN_MIN);
  /* each plant material's per-vertex copy, made now: from the plants' own hooks, before the host patches anything */
  const pv=new Map(); for(const o of plants){ const m=o.material; if(pv.has(m)) continue;
    const n=new T.MeshLambertMaterial({ map:m.map, alphaTest:m.alphaTest, side:m.side, transparent:m.transparent, depthWrite:m.depthWrite, color:m.color, emissive:m.emissive });
    n.onBeforeCompile=m.onBeforeCompile; const k=m.customProgramCacheKey.call(m); n.customProgramCacheKey=()=>k+'.pv'; own.push(n); pv.set(m, n); }
  const orig=new Map(plants.map(o=>[o, o.material]));
  let every=1, perVertex=false, wildOn=true, undoThin=null;
  const attrsOf=o=>[o.instanceMatrix, o.instanceColor, ...Object.values(o.geometry.attributes).filter(a=>a.isInstancedBufferAttribute)].filter(Boolean);
  /* every `k`-th card kept, packed to the front (the order kept); the undo restores the arrays and the count */
  function thin(k){ const U=thinable.map(o=>{ const A=attrsOf(o), keep=A.map(a=>a.array.slice()), n=o.count; let j=0;
      for(let i=0;i<n;i+=k, j++) for(const a of A){ const s=a.itemSize; a.array.copyWithin(j*s, i*s, i*s+s); }
      for(const a of A) a.needsUpdate=true; o.count=j;
      return ()=>{ A.forEach((a, q)=>{ a.array.set(keep[q]); a.needsUpdate=true; }); o.count=n; }; });
    return ()=>U.forEach(f=>f()); }
  /* L: a level table (leafEvery, plantsPerVertex, wildLights; absent = Standard's) */
  function set(L={}){
    const e=Math.max(1, Math.floor(L.leafEvery)||1), p=!!L.plantsPerVertex, w=L.wildLights!==false;
    if(e!==every){ if(undoThin){ undoThin(); undoThin=null; } if(e>1) undoThin=thin(e); every=e; }
    if(p!==perVertex){ for(const o of plants) o.material= p ? pv.get(orig.get(o)) : orig.get(o); perVertex=p; }
    wildOn=w;   // the room's frame holds them at 0 (wildOff)
    return state(); }
  const state=()=>({ every, perVertex, wildLights:wildOn, sets:thinable.map(o=>o.count), plants:plants.length, materials:pv.size });
  return { set, state, wildOff:()=>!wildOn, parts:{ plants, thinable, wild, pv } };   // parts: probes
}
