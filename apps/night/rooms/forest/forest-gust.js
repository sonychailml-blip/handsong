/* NIGHT-6 slice 6 — THE EFFECTS HAND MOVES THE FOREST (a part of the night forest room; forest.js builds it; the numbers are ./pure/gust.js).
   Picture only (the user, slice 6). Each frame the effects hand's light steers a GUST: the plants' shader (patchSway — grass, today's ferns,
   the floor's herbs and fine ferns, the ivy) bends them along the sweep, the water's shader stirs cat's-paw ripples under it, and here:
   - LEAVES SHAKE LOOSE while it is strong: a small pool of leaf cards (the floor's material and its leaf cells) fly off along the sweep,
     fall and settle, then fade;
   - the stream gets a WAKE: rings where the gust crosses it (the water's rings, kind 'wake').
   No hand, a still hand: the gust is exactly 0 and every shader value is as before. */
import { GUST, gustNew, gustStep, leafSpawn, leafAt, wakeOf } from './pure/gust.js';
import { cellUv, FLOOR_ATLAS } from './pure/floor.js';

/* ctx: { T, s, own, lv (gust, gustLeaves), U (forest-life's shared uniforms: uGust, uGustDir), floorMat (or null), life (its wake()), reduce }
   → { update(dt, t, light, on), state() } */
export function buildGust(ctx){
  const { T, s, own, lv, U, floorMat, life }=ctx, on= lv.gust!==false && !!lv.gust, g=gustNew(), d=new T.Object3D(), W=FLOOR_ATLAS.world.leaf;
  const n= on && floorMat && !ctx.reduce ? Math.max(0, lv.gustLeaves|0) : 0, geo=new T.PlaneGeometry(1, 1), cells=new Float32Array(Math.max(1,n)*4);
  for(let i=0;i<n;i++) cells.set(cellUv('leaf'+(i%4)), i*4); geo.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 4)); own.push(geo);
  const mesh=new T.InstancedMesh(geo, floorMat || new T.MeshBasicMaterial({ visible:false }), Math.max(1, n)), c=new T.Color(); mesh.frustumCulled=false; mesh.renderOrder=-0.5;
  for(let i=0;i<Math.max(1,n);i++){ d.scale.setScalar(0); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); mesh.setColorAt(i, c.setScalar(0.9+0.3*((i*37)%10)/10)); }
  mesh.count=n; if(n) s.add(mesh);
  const leaves=Array(n).fill(null); let spawned=0, lastSpawn=-1e9, lastWake=-1e9, wakes=0;
  /* one frame: light = the effects light's world position (or null), lit 0…1 */
  function update(dt, t, light, lit){
    gustStep(g, dt, light && lit>0.05 ? [light.x, light.z] : null, lit);
    const k= on ? g.k*(ctx.reduce ? 0.4 : 1) : 0; U.uGust.value.set(g.x, g.z, GUST.R, k); U.uGustDir.value.set(g.dx, g.dz);
    if(n && k>=GUST.leaves.kMin && t-lastSpawn>=GUST.leaves.every){ leaves[spawned%n]=leafSpawn(g, spawned, t); spawned++; lastSpawn=t; }
    for(let i=0;i<n;i++){ const l=leaves[i]; let sc=0;
      if(l){ const p=leafAt(l, t); if(p.done) leaves[i]=null; else { sc=p.a; d.position.set(p.x, p.y, p.z); d.rotation.set(0.9*Math.sin(p.rot), p.rot, 0.5*Math.cos(p.rot*0.7)); } }
      d.scale.set(W.w*sc, W.h*sc, W.h*sc); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); }
    if(n) mesh.instanceMatrix.needsUpdate=true;
    const w= on ? wakeOf({ ...g, k }) : null; if(w && t-lastWake>=GUST.wake.every){ life.wake(w.x, w.z, w.k*0.6, t); lastWake=t; wakes++; }
  }
  const state=()=>({ x:g.x, z:g.z, dx:g.dx, dz:g.dz, k:g.k, on, leaves:leaves.filter(Boolean).length, pool:n, spawned, wakes });
  return { update, state, parts:{ leaves:mesh } };   // parts: probes only
}
