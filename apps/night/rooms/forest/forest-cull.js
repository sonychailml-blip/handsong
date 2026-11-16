/* FOREST-2e — THE CULL (FOREST-2f: the default; ?forest=nocull without it): objects the player NEVER sees from the fixed view — on every screen shape, through
   the camera's breathing and its widest lean, at both levels, in the water's mirror too, and out of the playing light's shadow reach — are left out of
   their draws. The list is MADE by a tool from the visibility map (tools/forest-cull.mjs → ./pure/cull.js); the code stays, nothing is deleted.
   A list made for another forest (a count that differs) is not applied to that mesh (stale: said in the state). */
/* the room's static instanced meshes by their stable names (forest.js passes them); every other mesh is never culled */
export function cullTargets(o){ const T={ trunks:o.trunks, branches:o.branches, ferns:o.ferns, herbs:o.floor && o.floor.herbs, fineFerns:o.floor && o.floor.fronds, leaves:o.canopy && o.canopy.leaves,
    needles:o.canopy && o.canopy.cards, rocks:o.stream && o.stream.rocks, pebbles:o.stream && o.stream.pebbles, moss:o.wood && o.wood.moss, ivy:o.wood && o.wood.ivy, grass:o.grass };
  for(const b of o.bases||[]) T['base'+b.tree]=b.mesh;
  for(const k of Object.keys(T)) if(!T[k] || !T[k].isInstancedMesh || !T[k].parent) delete T[k]; return T; }
/* drop the listed instances: every per-instance array (matrix, colour, the geometry's instanced attributes) moved down over the gaps, the count
   lowered; a mesh with nothing left is hidden (one draw less). list: { name: { n (its count when made), drop:[indices] } } → the state */
export function cullApply(targets, list){ const st={ dropped:0, meshes:0, hidden:0, stale:[], tris:0 };
  for(const [k, L] of Object.entries(list||{})){ const m=targets[k]; if(!m) continue; if(m.count!==L.n){ st.stale.push(`${k} ${m.count} not ${L.n}`); continue; }
    const drop=new Set(L.drop); if(!drop.size) continue; const keep=[]; for(let i=0;i<m.count;i++) if(!drop.has(i)) keep.push(i);
    const pack=(a, n)=>{ if(!a) return; const A=a.array; keep.forEach((i, j)=>{ if(i!==j) for(let c=0;c<n;c++) A[j*n+c]=A[i*n+c]; }); a.needsUpdate=true; };
    pack(m.instanceMatrix, 16); if(m.instanceColor) pack(m.instanceColor, 3);
    for(const a of Object.values(m.geometry.attributes)) if(a.isInstancedBufferAttribute) pack(a, a.itemSize);
    const g=m.geometry, tri=(g.index ? g.index.count : g.attributes.position.count)/3; st.tris+=tri*drop.size;
    m.count=keep.length; st.dropped+=drop.size; st.meshes++; if(!keep.length){ m.visible=false; st.hidden++; } }
  return st; }
