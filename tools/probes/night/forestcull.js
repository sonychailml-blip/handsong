/* FOREST-2e — THE CULL'S MAP AND PROOF (a probe module; the tool tools/forest-cull.mjs runs it through forest-snap --eval, the row below a light part).
   THE MAP: the forest built at a level (the default parts, no cull, dt 0, t 100 s), every static instanced mesh the cull may touch (forest-cull.js
   cullTargets) given an ID program (its mesh number in alpha, the instance number in RGB); per view the whole scene drawn once (its depth), then the
   targets alone over that depth (equal depth only: where each is the nearest surface) — and the same through the water's mirror camera (its layer).
   Views: four screen shapes (a phone upright and on its side at 1.5 × its CSS pixels, a laptop, a wide screen) × seven camera poses — at rest, the
   lean's four corners and its top and bottom with the breath added outwards — all WIDENED by MARGIN (the lean and the breath × 1.25, the lens × 1.04):
   an instance seen by no pixel of any of them is never seen. Shadow casters within the playing light's reach of its bounds (FOREST_BOUNDS, 7.5 m)
   are always kept (their shadow may fall where the eye looks). Glowing, moving, transparent and merged things are never targets.
   THE PROOF: the real frames (the room's own render: the mirror, the glow pass) with and without the cull on the same views at the real extremes
   (no widening), compared pixel by pixel. */
import { row } from '../core/rows.js';

export const CULL_SHAPES=Object.freeze([['phone-up', 390, 844, 1.5], ['phone-land', 844, 390, 1.5], ['laptop', 1536, 730, 1], ['wide', 2560, 1080, 1]]);
const CAM=Object.freeze({ pos:[0, 1.55, 5.5], look:[0, 1.35, -6] }), LEAN=Object.freeze({ x:0.64, y:[-0.17, 0.33] }), BREATH=Object.freeze({ x:0.05, y:0.025 });   // forest.js camPos, camLook, goalOf; paint.js breath (0.035 + 0.015) and the bob
export const MARGIN=Object.freeze({ pose:1.25, fov:1.04, reach:7.5, pad:0.3 });   // my guesses (said in the report)
export function cullPoses(k=1){ const out=[{ name:'rest', o:[0, (CAM.look[1]-1.7)*0.1], b:[0, 0] }];
  for(const sx of [-1, 1]) for(const yy of [0, 1]) out.push({ name:(sx<0 ? 'left' : 'right')+(yy ? '-up' : '-down'), o:[sx*LEAN.x*k, LEAN.y[yy]*k], b:[sx*BREATH.x*k, (yy ? 1 : -1)*BREATH.y*k] });
  out.push({ name:'down', o:[0, LEAN.y[0]*k], b:[0, -BREATH.y*k] }, { name:'up', o:[0, LEAN.y[1]*k], b:[0, BREATH.y*k] }); return out; }
const viewOf=p=>({ pos:[CAM.pos[0]+p.o[0]+p.b[0], CAM.pos[1]+p.o[1]+p.b[1], CAM.pos[2]], look:[CAM.look[0]-1.2*p.o[0], CAM.look[1]-1.2*p.o[1], CAM.look[2]] });

let K=null;
async function kit(){ if(!K){ const H=await import('../../../apps/night/scene/host.js'); K={ T:await H.loadThree(), CV:(await import('../../../core/palette.js')).cv, F:await import('../../../apps/night/rooms/forest/forest.js'),
  L:await import('../../../apps/night/rooms/forest/pure/forestlife.js'), M:await import('../../../apps/night/rooms/forest/forest-mirror.js') }; } return K; }
const within=(p, ms)=>Promise.race([p, new Promise((_, no)=>setTimeout(()=>no(new Error('no answer in '+ms/1000+' s')), ms))]);
async function forest(level, cull, w, h, extra){ const { T, CV, F }=K; F.forestNewDbg('default'); F.forestCullDbg(cull); if(extra) F.forestCullListDbg(extra);
  await within(F.forestAssets(level), 60000); await within(F.forestNewAssets(level), 60000);
  const canvas=document.createElement('canvas'), r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true }); r.setPixelRatio(1);
  r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=1.0; r.shadowMap.enabled=false; r.info.autoReset=false;
  const room=F.buildForest(T, { C:CV, level, w, h, reduce:false, mood:null, shadow:false, gl2:r.capabilities.isWebGL2 }); return { r, room }; }
function done(f){ const { F }=K; try{ f.room.dispose(); }catch(e){} try{ f.r.dispose(); f.r.forceContextLoss(); }catch(e){} F.forestCullDbg(false); F.forestCullListDbg(null); F.forestNewDbg('default'); }
/* the ID program: the material's own (its displacement, alpha test) with the colour replaced at the very end */
function idMat(T, mat, k){ const m=mat.clone(), ob=mat.onBeforeCompile, key=mat.customProgramCacheKey;
  m.onBeforeCompile=function(sh, r){ if(ob) ob.call(mat, sh, r);
    sh.vertexShader=sh.vertexShader.replace(/void\s+main\s*\(\s*\)\s*\{/, 'flat out float vCullI;\nvoid main() {\n  vCullI=float(gl_InstanceID);');
    sh.fragmentShader=sh.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*\{/, 'flat in float vCullI;\nvoid main() {').replace(/}\s*$/, `  { float n=vCullI; gl_FragColor=vec4(mod(n, 256.0), mod(floor(n/256.0), 256.0), floor(n/65536.0), ${k+1}.0)/255.0; }\n}`); };
  m.customProgramCacheKey=()=>(key ? String(key.call(mat)) : '')+'.cullid'+k; m.blending=T.NoBlending; m.transparent=false; m.depthWrite=false; if(mat.transparent && m.alphaTest>0) m.alphaTest=Math.min(m.alphaTest, 0.01); m.depthFunc=T.LessEqualDepth; m.needsUpdate=true; return m; }

/* the visibility map at `level` → { targets:{ name:{ n, seen, kept (shadow), drop:[…] } }, views } */
/* the map's poses: the real extremes, halfway and widened (each with its lens) — a gap one pose shows the others may not */
export const MAP_POSES=()=>[...cullPoses(1).map(p=>({ ...p, fov:1 })), ...cullPoses(0.5).slice(1).map(p=>({ ...p, fov:1 })), ...cullPoses(MARGIN.pose).map(p=>({ ...p, fov:MARGIN.fov }))];
export async function cullMap({ level='reduced', shapes=CULL_SHAPES, poses=MAP_POSES(), mirror=true }={}){ await kit(); const { T, L, M, F }=K;
  const [, w0, h0, d0]=shapes[0], f=await forest(level, false, Math.round(w0*d0), Math.round(h0*d0)); const { r, room }=f;
  try{ const tg=room.cullDbg.targets, names=Object.keys(tg), seen=names.map(k=>new Uint8Array(tg[k].count)), gl=r.getContext();
    room.update(0, 100, [], null, { mood:null });
    const ids=names.map((k, i)=>{ const m=tg[k]; return [m, m.material, idMat(T, m.material, i)]; });
    const all=[]; room.scene.traverse(o=>{ if(o.isMesh || o.isPoints || o.isLine || o.isSprite) all.push(o); }); const vis0=all.map(o=>o.visible);
    const opaque=o=>o.isMesh && ![].concat(o.material).some(x=>x.transparent || x.isRawShaderMaterial);
    const rt=new T.WebGLRenderTarget(16, 16, { depthBuffer:true }), px={ a:null }, Y=(()=>{ const P=L.STREAM_LINE.filter(q=>q.z>-12 && q.z<4); return P.reduce((a, q)=>a+q.y, 0)/Math.max(1, P.length); })();
    const mcam=new T.PerspectiveCamera(), dir=new T.Vector3(), look=new T.Vector3(), bg=room.scene.background, views=[]; let peel=0;
    /* one view: the opaque depth once, then the targets over it again and again, every instance already seen hidden (zero matrix), until no new one
       shows (PEELING: a soft-edged card shows through the fringe of the one in front of it — one picture would keep only the last one drawn) */
    const keepM=ids.map(([m])=>m.instanceMatrix.array.slice());
    const pass=(cam, w, h)=>{ rt.setSize(w, h); r.setRenderTarget(rt); r.autoClear=false; r.setClearColor(0x000000, 0); r.clear(true, true, true);
      all.forEach((o, i)=>{ o.visible=vis0[i] && opaque(o); }); r.render(room.scene, cam);   // the depth of every opaque thing (alpha-tested cards included)
      let hit=0, rounds=0;
      for(;rounds<24;rounds++){ ids.forEach(([m], i)=>{ const A=m.instanceMatrix.array, K0=keepM[i], s=seen[i]; for(let j=0;j<m.count;j++){ const z=s[j]; for(let c=0;c<16;c++) A[j*16+c]= z ? 0 : K0[j*16+c]; } m.instanceMatrix.needsUpdate=true; });
        r.clear(true, false, false); all.forEach(o=>{ o.visible=false; }); ids.forEach(([m, , im])=>{ if(m.count>0 && vis0[all.indexOf(m)]){ m.visible=true; m.material=im; let p=m.parent; while(p){ p.visible=true; p=p.parent; } } });
        r.render(room.scene, cam); ids.forEach(([m, mm])=>{ m.material=mm; });
        if(!px.a || px.a.length!==w*h*4) px.a=new Uint8Array(w*h*4); r.readRenderTargetPixels(rt, 0, 0, w, h, px.a); const A=px.a; let fresh=0;
        for(let i=0;i<A.length;i+=4){ const k=A[i+3]; if(!k) continue; const s=seen[k-1]; if(!s) continue; const n=A[i]+A[i+1]*256+A[i+2]*65536; if(n<s.length && !s[n]){ s[n]=1; fresh++; } hit++; }
        if(!fresh) break; }
      ids.forEach(([m], i)=>{ m.instanceMatrix.array.set(keepM[i]); m.instanceMatrix.needsUpdate=true; });
      all.forEach((o, i)=>{ o.visible=vis0[i]; }); r.setRenderTarget(null); r.autoClear=true; peel=Math.max(peel, rounds+1); return hit; };
    room.scene.background=null;
    try{ for(const [sn, sw, sh, dpr] of shapes){ const w=Math.round(sw*dpr), h=Math.round(sh*dpr); room.viewDbg(null); room.resize(w, h, h);
        for(const p of poses){ room.viewDbg(viewOf(p)); const cam=room.camera; cam.fov*=p.fov||1; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); const hit=pass(cam, w, h); let mh=0;
          if(mirror){ cam.getWorldDirection(dir); mcam.fov=cam.fov; mcam.aspect=cam.aspect; mcam.near=cam.near; mcam.far=cam.far; mcam.updateProjectionMatrix(); mcam.position.set(cam.position.x, 2*Y-cam.position.y, cam.position.z);
            look.copy(cam.position).add(dir); look.y=2*Y-look.y; mcam.up.set(0, 1, 0); mcam.lookAt(look); mcam.layers.set(M.MIRROR_LAYER); mcam.updateMatrixWorld(); mh=pass(mcam, Math.round(w/2), Math.round(h/2)); }
          views.push([sn, p.name, hit, mh]); room.viewDbg(null); room.resize(w, h, h); } } }
    finally { room.scene.background=bg; rt.dispose(); ids.forEach(([, , im])=>im.dispose()); }
    /* the shadow's reach: casters near the light's bounds stay */
    const B=F.FOREST_BOUNDS, mat=new T.Matrix4(), pos=new T.Vector3(), q=new T.Quaternion(), sc=new T.Vector3(), out={};
    names.forEach((k, i)=>{ const m=tg[k], g=m.geometry; if(!g.boundingSphere) g.computeBoundingSphere(); let kept=0; const drop=[];
      for(let j=0;j<m.count;j++){ if(seen[i][j]) continue; if(m.castShadow){ m.getMatrixAt(j, mat); mat.decompose(pos, q, sc); pos.add(g.boundingSphere.center.clone().multiply(sc)); const rad=g.boundingSphere.radius*Math.max(sc.x, sc.y, sc.z);
          const dx=Math.max(B[0]-pos.x, 0, pos.x-B[1]), dy=Math.max(B[2]-pos.y, 0, pos.y-B[3]), dz=Math.max(B[4]-pos.z, 0, pos.z-B[5]); if(Math.hypot(dx, dy, dz)-rad<MARGIN.reach+MARGIN.pad){ kept++; continue; } }
        drop.push(j); }
      out[k]={ n:m.count, seen:seen[i].reduce((a, b)=>a+b, 0), kept, drop }; });
    return { level, targets:out, views, peel, made:new Date().toISOString().slice(0, 10) }; }
  finally { done(f); } }

/* frames of the real render with and without the cull (extra: more instances to drop — the CONTROL) on shapes × poses at their real extremes */
export const JITTER=0.0005;   // the noise reference: the same view with the camera 0.5 mm to the side (sub-pixel gaps open and close like this)
export async function cullProof({ level='reduced', shapes=CULL_SHAPES, poses=cullPoses(1), extra=null, scale=1, where=false, jitter=true }={}){ await kit();
  const shot=async cull=>{ const [, w0, h0, d0]=shapes[0], f=await forest(level, cull, Math.round(w0*d0*scale), Math.round(h0*d0*scale), cull ? extra : null), { r, room }=f, out=[];
    try{ if(room.mirrorDbg && room.mirrorDbg.sameRedrawDbg) room.mirrorDbg.sameRedrawDbg(true); const gl=r.getContext();
      for(const [sn, sw, sh, dpr] of shapes){ const w=Math.round(sw*dpr*scale), h=Math.round(sh*dpr*scale); r.setSize(w, h, false); room.viewDbg(null); room.resize(w, h, h);
        for(const p of poses){ room.viewDbg(viewOf(p)); room.update(0, 100, [], null, { mood:null }); r.info.reset(); if(room.render) room.render(r); else r.render(room.scene, room.camera);
          const a=new Uint8Array(w*h*4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a); const o={ sn, pose:p.name, w, h, a, calls:r.info.render.calls, tris:r.info.render.triangles };
          if(!cull && jitter){ const v=viewOf(p); v.pos[0]+=JITTER; room.viewDbg(v); room.update(0, 100, [], null, { mood:null }); if(room.render) room.render(r); else r.render(room.scene, room.camera); const b=new Uint8Array(w*h*4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); o.j=b; }
          out.push(o); } }
      return { out, st:room.cullDbg.state, tex:room.texBytes ? room.texBytes() : 0, hidden:Object.entries(room.cullDbg.targets).filter(([, m])=>!m.visible).map(([k])=>k) }; }
    finally { done(f); } };
  const A=await shot(false), Bv=await shot(true), views=[];
  A.out.forEach((x, i)=>{ const y=Bv.out[i]; let mx=0, n2=0, n0=0;
    for(let j=0;j<x.a.length;j+=4){ const d=Math.max(Math.abs(x.a[j]-y.a[j]), Math.abs(x.a[j+1]-y.a[j+1]), Math.abs(x.a[j+2]-y.a[j+2])); if(d>mx) mx=d; if(d>2) n2++; if(d>0) n0++; }
    let j2=0; if(x.j) for(let j=0;j<x.a.length;j+=4){ const d=Math.max(Math.abs(x.a[j]-x.j[j]), Math.abs(x.a[j+1]-x.j[j+1]), Math.abs(x.a[j+2]-x.j[j+2])); if(d>2) j2++; }
    const at=[]; if(where && n2) for(let j=0;j<x.a.length;j+=4){ const d=Math.max(Math.abs(x.a[j]-y.a[j]), Math.abs(x.a[j+1]-y.a[j+1]), Math.abs(x.a[j+2]-y.a[j+2])); if(d>2 && at.length<400) at.push([(j/4)%x.w, x.h-1-Math.floor(j/4/x.w), d]); }
    views.push({ view:x.sn+' '+x.pose, w:x.w, h:x.h, max:mx, over2:n2, any:n0, jitter:x.j ? j2 : null, calls:[x.calls, y.calls], tris:[x.tris, y.tris], at }); });
  return { level, views, state:Bv.st, hidden:Bv.hidden, tex:[A.tex, Bv.tex] }; }

/* «FOREST cull same frames» (drawn): the list is current (made for today's counts, not empty) and the culled forest's frames equal today's on a
   phone upright and a laptop at rest and the lean's two lower corners, both levels (scaled to half: the full proof is the tool's). CONTROL: dropping
   also the trunk nearest the eye in view must change a frame. Noise (my guesses): every pixel within 2 / 255, or pixels beyond that in at most 0.01 % of
   the frame AND at most a tenth of what a 0.5 mm camera move changes on the same view (sub-pixel gaps) */
export const CULL_NOISE=Object.freeze({ lum:2, share:1e-4, jitter:0.1 });
export async function checkForestCull(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }; await kit();
  const { FOREST_CULL }=await import('../../../apps/night/rooms/forest/pure/cull.js'), shapes=[CULL_SHAPES[0], CULL_SHAPES[2]], poses=cullPoses(1).filter(p=>['rest', 'left-down', 'right-down'].includes(p.name));
  for(const lv of ['reduced', 'full']){ const C=FOREST_CULL[lv]; if(!ok(`${lv}: no cull list (tools/forest-cull.mjs)`, !!(C && C.list))) continue;
    const P=await cullProof({ level:lv, shapes, poses, scale:0.5 });
    ok(`${lv}: the list is stale for ${P.state ? P.state.stale.join(', ') : 'every mesh (not applied)'}`, !!P.state && !P.state.stale.length);
    ok(`${lv}: the list drops nothing`, !!P.state && P.state.dropped>0);
    for(const v of P.views) ok(`${lv} ${v.view}: the culled frame differs beyond noise (${v.over2} pixels over 2 of ${v.w*v.h}, max ${v.max} / 255; a 0.5 mm camera move changes ${v.jitter})`, v.max<=CULL_NOISE.lum || (v.over2/(v.w*v.h)<=CULL_NOISE.share && v.over2<=v.jitter*CULL_NOISE.jitter));
    notes.push(`${lv}: dropped ${P.state ? P.state.dropped : 0} instances in ${P.state ? P.state.meshes : 0} meshes (${P.state ? P.state.hidden : 0} hidden), triangles ${P.views[1].tris.join(' → ')} on the laptop at rest, draws ${P.views[1].calls.join(' → ')}; frames max diff ${Math.max(...P.views.map(v=>v.max))}`);
    const near=await nearTrunk(lv), Q=await cullProof({ level:lv, shapes:[CULL_SHAPES[2]], poses:[cullPoses(1)[0]], scale:0.5, extra:{ trunks:[near] } });
    ok(`CONTROL ${lv}: dropping the nearest trunk in view (#${near}) left the frame as it was — the check cannot see a cull`, Q.views[0].over2>50);
    notes.push(`CONTROL ${lv}: the nearest trunk #${near} dropped too → ${Q.views[0].over2} pixels differ`); }
  return { cases:n, total:d.length, differences:d, notes }; }
async function nearTrunk(level){ const f=await forest(level, false, 640, 304); try{ const { T }=K, m=f.room.cullDbg.targets.trunks, cam=f.room.camera, M4=new T.Matrix4(), p=new T.Vector3(); f.room.viewDbg({ rest:true }); cam.updateMatrixWorld(); let best=-1, bd=1e9;
    for(let i=0;i<m.count;i++){ m.getMatrixAt(i, M4); p.setFromMatrixPosition(M4); const s=new T.Vector3().setFromMatrixScale(M4); if(s.x<1e-3) continue; const q=p.clone(); q.y=1.5; q.project(cam); if(Math.abs(q.x)>0.8 || q.z>1) continue; const dd=p.distanceTo(cam.position); if(dd<bd){ bd=dd; best=i; } } return best; }
  finally { done(f); } }
row({ at:1009.951, night:true, name:'FOREST cull same frames', drawn:true, run:()=>checkForestCull(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(arg={}){ if(arg.mode==='map'){ const out={}; for(const lv of arg.levels||['reduced', 'full']) out[lv]=await cullMap({ level:lv }); return out; }
  if(arg.mode==='proof'){ const out={}; for(const lv of arg.levels||['reduced', 'full']){ const P=await cullProof({ level:lv, scale:arg.scale||1 }); out[lv]=P; } return out; }
  if(arg.mode==='where'){ const sh=CULL_SHAPES.filter(x=>x[0]===arg.shape), po=cullPoses(1).filter(p=>p.name===arg.pose); return cullProof({ level:arg.level, shapes:sh, poses:po, where:true }); }
  return checkForestCull(); }
