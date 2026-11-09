/* NIGHT-6 slice 3 — THE FOREST FLOOR (parts of the night forest room; forest.js builds them; the places are ./pure/floor.js): the herb layer —
   wood sorrel, broad-leaved herbs, bilberry, wood anemones, nettles, sedges — as crossed cards in ONE instanced draw, and the fine fern's
   fronds in rosettes in a second; both share ONE material reading each plant's cell of the plant sheet (a FILE, tex/floor-*.png, drawn by
   tools/forest-bake.mjs: the master at high, a smaller copy at medium) and swaying with the forest's wind (the shared sway of forest-life.js).
   No shadows cast; per plant a small brightness jitter. Without the sheet nothing is added (the counts stay for the probes). */
import { HERBS, FLOOR_ATLAS, cellUv, floorPlaces } from './pure/floor.js';
import { forestGround } from './pure/fireflies.js';
import { patchSway } from './forest-life.js';
import { seeded } from '../../../../core/pure/dsp.js';

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
/* ctx: { T, s, own, lv (the level's counts), trunks [[x, z, r]], ferns (today's [[x, z, s]]), tex (the sheet's texture or null), U (the sway
   uniforms) } → { state() } */
export function buildFloor(ctx){
  const { T, s, own, lv, trunks, ferns, tex, U }=ctx, counts={};
  for(const k of [...HERBS, 'fern2']) counts[k]=Math.max(0, lv[k]|0);
  const key=JSON.stringify(counts); if(!MEMO.has(key)) MEMO.set(key, floorPlaces(counts, trunks, ferns)); const P=MEMO.get(key);
  const herbs=P.filter(p=>p.sp!=='fern2'), fern2=P.filter(p=>p.sp==='fern2'), R=seeded(0x464C5232), d=new T.Object3D(), c=new T.Color();
  const mat=new T.MeshStandardMaterial({ map:tex||null, alphaTest:0.45, side:T.DoubleSide, roughness:0.85 }); patchSway(mat, U, 1);
  const sway=mat.onBeforeCompile;
  mat.onBeforeCompile=sh=>{ sway(sh); sh.vertexShader='attribute vec4 aCell;\n'+sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vUv=vUv*aCell.zw+aCell.xy;'); };
  mat.customProgramCacheKey=()=>'handsong.sway1.cell'; own.push(mat);
  const cells=(n, sp)=>{ const a=new Float32Array(Math.max(1,n)*4); for(let i=0;i<n;i++) a.set(cellUv(typeof sp==='function' ? sp(i) : sp), i*4); return new T.InstancedBufferAttribute(a, 4); };
  /* the herbs */
  const hg=crossGeo(T); hg.setAttribute('aCell', cells(herbs.length, i=>herbs[i].sp)); own.push(hg);
  const hm=new T.InstancedMesh(hg, mat, Math.max(1, herbs.length));
  herbs.forEach((p,i)=>{ const W=FLOOR_ATLAS.world[p.sp], j=0.85+R()*0.3; d.position.set(p.x, forestGround(p.x,p.z)-0.02, p.z); d.rotation.set((R()-0.5)*0.15, p.rot, (R()-0.5)*0.15);
    d.scale.set(W.w*p.s, W.h*p.s*j, W.w*p.s); d.updateMatrix(); hm.setMatrixAt(i, d.matrix); hm.setColorAt(i, c.setScalar(0.78+R()*0.32)); });
  hm.count=herbs.length; hm.receiveShadow=true; hm.frustumCulled=false;
  /* the fine fern: 5–7 fronds a rosette */
  const fronds=[]; for(const p of fern2){ const n=5+Math.floor(R()*3), a0=R()*6.283; for(let k=0;k<n;k++) fronds.push({ x:p.x, z:p.z, a:a0+k*(6.283/n)+R()*0.3, tilt:0.95+R()*0.4, s:p.s*(0.75+R()*0.4) }); }
  const W2=FLOOR_ATLAS.world.fern2, fg=frondGeo(T, W2.w, W2.h); fg.setAttribute('aCell', cells(fronds.length, 'fern2')); own.push(fg);
  const fm=new T.InstancedMesh(fg, mat, Math.max(1, fronds.length));
  fronds.forEach((f,i)=>{ d.position.set(f.x, forestGround(f.x,f.z)-0.03, f.z); d.rotation.set(f.tilt, f.a, 0, 'YXZ'); d.scale.set(f.s, f.s, f.s); d.updateMatrix(); fm.setMatrixAt(i, d.matrix); fm.setColorAt(i, c.setScalar(0.8+R()*0.3)); });
  fm.count=fronds.length; fm.receiveShadow=true; fm.frustumCulled=false;
  if(tex){ if(herbs.length) s.add(hm); if(fronds.length) s.add(fm); }
  const by={}; for(const p of P) by[p.sp]=(by[p.sp]||0)+1;
  const state=()=>({ counts:by, herbs:herbs.length, rosettes:fern2.length, fronds:fronds.length, tex:!!tex, places:P });
  return { state, parts:{ herbs:hm, fronds:fm } };   // parts: probes only
}
