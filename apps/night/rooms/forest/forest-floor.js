/* NIGHT-6 slice 3 — THE FOREST FLOOR (parts of the night forest room; forest.js builds them; the places are ./pure/floor.js): the herb layer —
   wood sorrel, broad-leaved herbs, bilberry, wood anemones, nettles, sedges — as crossed cards in ONE instanced draw, and the fine fern's
   fronds in rosettes in a second; both share ONE material reading each plant's cell of the plant sheet (a FILE, tex/floor-*.png, drawn by
   tools/forest-bake.mjs: the master at high, a smaller copy at medium) and swaying with the forest's wind (the shared sway of forest-life.js).
   No shadows cast; per plant a small brightness jitter. Without the sheet nothing is added (the counts stay for the probes). */
import { HERBS, FLOOR_ATLAS, cellUv, floorPlaces } from './pure/floor.js';
import { bankGround } from './pure/forestlife.js';   // NIGHT-6 slice 4: the carved bed (the sedges stand on the bank)
import { patchSway, patchSoftEdges } from './forest-life.js';
import { seeded } from '../../../../core/pure/dsp.js';
import { cardSpot, fineFrondPoints, herbPoints, inSolid3 } from './pure/natural.js';   // FOREST-2 (?forest=new only)

const MEMO=new Map();   // the places per counts: pure and seeded, so worked out once per session
/* two crossed unit cards standing on y 0 (normals tilted up so both faces light evenly) */
function crossGeo(T){ const g=new T.BufferGeometry(), pos=[], uv=[], nor=[], idx=[];
  for(let k=0;k<2;k++){ const a=k*Math.PI/2, c=Math.cos(a), s=Math.sin(a), o=k*4;
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){ pos.push((u-0.5)*c, v, (u-0.5)*s); uv.push(u, v); nor.push(0, 0.75, 0.66); }
    idx.push(o, o+1, o+2, o, o+2, o+3); }
  g.setAttribute('position', new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv,2)); g.setAttribute('normal', new T.Float32BufferAttribute(nor,3)); g.setIndex(idx); return g; }
/* a frond: a plane bent backwards along its height */
function frondGeo(T, w, h){ const g=new T.PlaneGeometry(w, h, 1, 8); g.translate(0, h/2, 0); const p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const t=p.getY(i)/h; p.setZ(i, -t*t*0.5*h); p.setY(i, p.getY(i)*(1-t*0.1)); } g.computeVertexNormals(); return g; }
/* the plants' material over a sheet `tex`: swaying (and the gust), each instance reading its cell (aCell); soft edges where asked. NIGHT-6
   slice 7: shared by the crowns' leaf sprays (another sheet, the same shader program) */
export function plantMaterial(T, tex, U, soft){
  const mat=new T.MeshStandardMaterial({ map:tex||null, alphaTest:0.45, side:T.DoubleSide, roughness:0.85 }); patchSway(mat, U, 1);
  const sway=mat.onBeforeCompile;
  mat.onBeforeCompile=sh=>{ sway(sh); sh.vertexShader='attribute vec4 aCell;\n'+sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vUv=vUv*aCell.zw+aCell.xy;'); };
  mat.customProgramCacheKey=()=>'handsong.sway1.cell'; if(soft) patchSoftEdges(mat);   // NIGHT-6: soft edges at medium
  return mat; }
/* ctx: { T, s, own, lv (the level's counts), trunks [[x, z, r]], ferns (today's [[x, z, s]]), tex (the sheet's texture or null), U (the sway
   uniforms) } → { state() } */
export function buildFloor(ctx){
  const { T, s, own, lv, trunks, ferns, tex, U }=ctx, counts={};
  for(const k of [...HERBS, 'fern2']) counts[k]=Math.max(0, lv[k]|0);
  const key=JSON.stringify(counts); if(!MEMO.has(key)) MEMO.set(key, floorPlaces(counts, trunks, ctx.fernsToday||ferns)); let P=MEMO.get(key);   // FOREST-2: today's plants (placed round today's ferns), each then moved clear
  if(ctx.clear) P=P.map(p=>{ if(p.sp==='fern2' && ctx.S3) return p;   /* FOREST-2: moved plants keep out of the mushrooms' sight (ctx.avoid) */
    if(ctx.S3){ const W=FLOOR_ATLAS.world[p.sp], pts=(px, pz)=>herbPoints(px, bankGround(px, pz)-0.02, pz, p.rot, W.w*p.s, W.h*p.s*1.15), r=cardSpot(p.x, p.z, pts, ctx.S3, { water:p.sp==='sedge' ? -0.05 : 0.2, eye:3, box:[-12, 12, -18, 3.4], avoid:ctx.avoid, reach:W.w*p.s*0.5, height:W.h*p.s*1.15 });
      if(r[2]){ const E=[0, 5.5], k=Math.hypot(r[0]-E[0], r[1]-E[1])/Math.max(0.5, Math.hypot(p.x-E[0], p.z-E[1]));   // a moved herb keeps its size on screen while it stays clear
        let kk=1; if(k>1) for(const f of [1, 0.75, 0.5, 0.25]){ const kt=1+(k-1)*f; if(!herbPoints(r[0], bankGround(r[0], r[1])-0.02, r[1], p.rot, W.w*p.s*kt, W.h*p.s*1.15*kt).some(q=>inSolid3(q[0], q[1], q[2], ctx.S3))){ kk=kt; break; } }   // the largest step of its size back that still fits
        return { ...p, x:r[0], z:r[1], s:p.s*kk }; }
      if(pts(p.x, p.z).some(q=>inSolid3(q[0], q[1], q[2], ctx.S3))) for(const hs of [0.85, 0.7, 0.55]) if(!herbPoints(p.x, bankGround(p.x, p.z)-0.02, p.z, p.rot, W.w*p.s, W.h*p.s*1.15*hs).some(q=>inSolid3(q[0], q[1], q[2], ctx.S3))) return { ...p, hs };   // no free place within reach: it stays, a little shorter (under a log)
      return p; } const W=FLOOR_ATLAS.world[p.sp], f2=p.sp==='fern2', [x, z, k]=ctx.clear(p.x, p.z, f2 ? W.h*p.s*0.9 : W.w*p.s*0.5, { water:p.sp==='sedge' ? -0.05 : 0.2, eye:3, box:[-12, 12, -18, 3.4] }); return x===p.x && z===p.z ? p : { ...p, x, z, s:p.s*k }; });   // a moved plant keeps its size on screen   // FOREST-2: clear of solids (?forest=new)   // FOREST-2: a herb by its own two cards in 3D
  if(ctx.extra) P=P.concat(ctx.extra);   // FOREST-2: sprouts on the logs (their own height, never moved)
  const herbs=P.filter(p=>p.sp!=='fern2'), fern2=P.filter(p=>p.sp==='fern2'), R=seeded(0x464C5232), d=new T.Object3D(), c=new T.Color();
  const mat=plantMaterial(T, tex, U, ctx.soft); own.push(mat);
  const cells=(n, sp)=>{ const a=new Float32Array(Math.max(1,n)*4); for(let i=0;i<n;i++) a.set(cellUv(typeof sp==='function' ? sp(i) : sp), i*4); return new T.InstancedBufferAttribute(a, 4); };
  /* the herbs */
  const hg=crossGeo(T); hg.setAttribute('aCell', cells(herbs.length, i=>herbs[i].sp)); own.push(hg);
  const hm=new T.InstancedMesh(hg, mat, Math.max(1, herbs.length));
  const nB=herbs.length-(ctx.extra ? ctx.extra.length : 0), R2=seeded(0x53505254);   // FOREST-2: the sprouts draw from their own seed (every other plant's draws stay)
  const herbOf=(p, i, R)=>{ const W=FLOOR_ATLAS.world[p.sp], j=0.85+R()*0.3; if(p.y!=null) d.position.set(p.x, p.y-0.02, p.z); else d.position.set(p.x, bankGround(p.x,p.z)-0.02, p.z); d.rotation.set((R()-0.5)*0.15, p.rot, (R()-0.5)*0.15);
    d.scale.set(W.w*p.s, W.h*p.s*j*(p.hs||1), W.w*p.s); d.updateMatrix(); hm.setMatrixAt(i, d.matrix); hm.setColorAt(i, c.setScalar(0.78+R()*0.32)); };
  herbs.forEach((p,i)=>herbOf(p, i, i<nB ? R : R2));
  hm.count=herbs.length; hm.receiveShadow=true; hm.frustumCulled=false;
  /* the fine fern: 5–7 fronds a rosette */
  const fronds=[]; for(const p of fern2){ const n=5+Math.floor(R()*3), a0=R()*6.283; for(let k=0;k<n;k++) fronds.push({ x:p.x, z:p.z, a:a0+k*(6.283/n)+R()*0.3, tilt:0.95+R()*0.4, s:p.s*(0.75+R()*0.4) }); }
  const W2=FLOOR_ATLAS.world.fern2, fg=frondGeo(T, W2.w, W2.h); fg.setAttribute('aCell', cells(fronds.length, 'fern2')); own.push(fg);
  if(ctx.S3){ let k=0; for(const p of fern2){ const g=[]; while(k<fronds.length && fronds[k].x===p.x && fronds[k].z===p.z) g.push(fronds[k++]);   // FOREST-2: each fine fern against its own bent fronds in 3D (the same draws as today)
      const r=cardSpot(p.x, p.z, (px, pz)=>fineFrondPoints(px, bankGround(px, pz)-0.03, pz, g, W2.w, W2.h), ctx.S3, { water:0.25, eye:3, box:[-12, 12, -18, 3.4], avoid:ctx.avoid, reach:W2.h*p.s*0.9, height:W2.h*p.s*0.6 });
      if(r[2]){ const k=Math.hypot(r[0], r[1]-5.5)/Math.max(0.5, Math.hypot(p.x, p.z-5.5)); let kk=1; if(k>1) for(const f of [1, 0.75, 0.5, 0.25]){ const kt=1+(k-1)*f, big=g.map(q=>({ ...q, s:q.s*kt })); if(!fineFrondPoints(r[0], bankGround(r[0], r[1])-0.03, r[1], big, W2.w, W2.h).some(q=>inSolid3(q[0], q[1], q[2], ctx.S3))){ kk=kt; break; } }
        for(const f of g){ f.x=r[0]; f.z=r[1]; f.s*=kk; } } } }   // a moved fine fern keeps (as much as fits of) its size on screen
  const fm=new T.InstancedMesh(fg, mat, Math.max(1, fronds.length));
  fronds.forEach((f,i)=>{ d.position.set(f.x, bankGround(f.x,f.z)-0.03, f.z); d.rotation.set(f.tilt, f.a, 0, 'YXZ'); d.scale.set(f.s, f.s, f.s); d.updateMatrix(); fm.setMatrixAt(i, d.matrix); fm.setColorAt(i, c.setScalar(0.8+R()*0.3)); });
  fm.count=fronds.length; fm.receiveShadow=true; fm.frustumCulled=false;
  if(ctx.soft) hm.renderOrder=fm.renderOrder=-0.5;   // blended: after the stream (−1), before the mist (0)
  if(tex){ if(herbs.length) s.add(hm); if(fronds.length) s.add(fm); }
  const by={}; for(const p of P) by[p.sp]=(by[p.sp]||0)+1;
  const state=()=>({ counts:by, herbs:herbs.length, rosettes:fern2.length, fronds:fronds.length, tex:!!tex, places:P });
  return { state, parts:{ herbs:hm, fronds:fm, material:mat } };   // parts: probes (the material: the drifting leaves share it)
}
