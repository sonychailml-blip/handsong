/* FOREST-2 — the forest's objects made natural behind the address word ?forest=new. Rows:
   «FOREST switch off = today» (drawn): the forest built WITHOUT the switch equals the forest pinned before FOREST-2 began
     (tools/prints/forest-today.json): every geometry, instance matrix, colour and material key (machine-independent), and — when the renderer
     is the one the pins were made on — every shader program's source and two fixed frames pixel for pixel. CONTROL: the same build WITH the
     switch must differ in the geometry and in both frames (a check that cannot see the switch cannot pass).
   «FOREST looks as full» (drawn): fixed views (a phone upright, a laptop; Standard and Detailed; the same camera at rest, seed, time — the
     fireflies and the wind frozen by dt 0 at t 100 s): with the switch the vegetation's screen coverage and visibility mass (the frame with every
     plant against the same frame with every plant hidden) and the ground's detail (the lower 40 % of the plant-free frame, its mean local
     contrast) must not drop below today's. CONTROL: FOREST-1's fern cards from the archive (its CC0 frond sheet, the frond 0.575 wide, dimmed to
     0.62 — archive/forest1-attempt) must fail it.
   The frames are rendered by the probe's OWN renderer and forest instance (the host's loop keeps running untouched): nothing here waits on the
   live frame. Every wait has an upper limit. */
import { row } from '../core/rows.js';

export const FOREST2_VIEWS=Object.freeze([['phone', 300, 650], ['laptop', 640, 304]]);   // a phone upright (390 × 844) and a laptop (1536 × 730), scaled down, the same aspects
const PIN_URL='/tools/prints/forest-today.json';
/* tolerances of «looks as full» (FOREST-2's guesses, said in the report): a plant counts as seen where hiding it changes the pixel's luminance by
   at least LUM_MIN of 255; «not below today's» allows nothing below today's but this measuring noise floor (EPS, relative) */
export const FULL_RULE=Object.freeze({ lumMin:8, eps:0.002, groundTop:0.6 });

const fnv=(h, b)=>{ h^=b; return Math.imul(h, 16777619)>>>0; };
function hashBytes(u8, h=2166136261){ for(let i=0;i<u8.length;i++) h=fnv(h, u8[i]); return h>>>0; }
const hashArr=(a, h)=>hashBytes(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), h);
const hashStr=(s, h=2166136261)=>{ for(let i=0;i<s.length;i++) h=fnv(h, s.charCodeAt(i)&255); return h>>>0; };
const hex=h=>(h>>>0).toString(16).padStart(8, '0');

/* the scene's content, machine-independent: every drawn object's geometry (attributes, index), instance matrices and colours, count,
   visibility, and its material's type, key and colour — in scene order */
export function geoPrint(scene){ let h=2166136261, n=0; const kinds={};
  scene.traverse(o=>{ if(!o.geometry && !o.material) return; n++; h=hashStr(o.type+'|'+(o.visible?1:0)+'|'+(o.count==null?'':o.count)+'|'+(o.renderOrder||0), h);
    const g=o.geometry; if(g){ for(const k of Object.keys(g.attributes).sort()){ h=hashStr(k, h); h=hashArr(g.attributes[k].array, h); } if(g.index) h=hashArr(g.index.array, h); }
    if(o.instanceMatrix) h=hashArr(o.instanceMatrix.array, h); if(o.instanceColor) h=hashArr(o.instanceColor.array, h);
    h=hashArr(new Float32Array(o.matrixWorld.elements), h);
    const ms=Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for(const m of ms){ const key=m.customProgramCacheKey ? String(m.customProgramCacheKey.call(m)) : ''; h=hashStr(m.type+'|'+key+'|'+(m.color ? m.color.getHexString() : '')+'|'+(m.map && m.map.image ? (m.map.image.width+'x'+m.map.image.height) : '')+'|'+(m.alphaTest||0)+'|'+(m.transparent?1:0), h);
      kinds[m.type]=(kinds[m.type]||0)+1; } });
  return { hash:hex(h), objects:n, kinds }; }
/* every linked program's final GLSL (as the driver got it), sorted → one hash (depends on the renderer: precision, extensions) */
export function progPrint(r){ const gl=r.getContext(), out=[];
  for(const p of r.info.programs||[]){ const sh=gl.getAttachedShaders(p.program)||[]; out.push(sh.map(s=>gl.getShaderSource(s)||'').join('\n----\n')); }
  out.sort(); let h=2166136261; for(const s of out) h=hashStr(s, h); return { hash:hex(h), programs:out.length }; }
const lumOf=(px, i)=>0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2];
/* A (every plant) vs B (no plant): coverage = the share of pixels whose luminance moves by ≥ lumMin; mass = the mean luminance move */
export function vegCover(A, B, rule=FULL_RULE){ let k=0, m=0; const N=A.length/4; for(let i=0;i<A.length;i+=4){ const d=Math.abs(lumOf(A,i)-lumOf(B,i)); if(d>=rule.lumMin) k++; m+=d; } return { cover:k/N, mass:m/N }; }
/* the ground's detail: the mean local contrast (|∂x| + |∂y| of the luminance) over the frame's lower part (readPixels rows run bottom-up) */
export function groundDetail(px, w, h, rule=FULL_RULE){ const rows=Math.floor(h*(1-rule.groundTop)); let s=0, n=0;
  for(let y=0;y<rows-1;y++) for(let x=0;x<w-1;x++){ const i=(y*w+x)*4, l=lumOf(px,i); s+=Math.abs(l-lumOf(px,i+4))+Math.abs(l-lumOf(px,i+w*4)); n++; } return n ? s/n : 0; }

/* the plants: today's ferns, the grass, the herb layer and fine ferns, the crowns' and understorey's leaf cards, the gust's leaves; with the switch
   also whatever the room lists as its own (vegDbg) */
export function vegMeshes(room, noGrass=false){ const S=room.state(), out=new Set(), add=m=>{ if(m && m.isObject3D) out.add(m); };   // noGrass: FOREST-2b — the grass judged apart (today's blades stand in one tuft at the origin: the grass switch spreads them)
  add(room.fernsDbg && room.fernsDbg.fronds); const F=room.floorDbg && room.floorDbg.parts; if(F){ add(F.herbs); add(F.fronds); }
  const C=room.canopyDbg && room.canopyDbg.parts; if(C){ add(C.leaves); add(C.cards); } const G=room.gustDbg && room.gustDbg.parts; if(G) add(G.leaves);   // FOREST-2b: the spruces' needles (C.cards) are plants too
  if(!noGrass) room.scene.traverse(o=>{ if(o.isInstancedMesh && S.detail && o.count===S.detail.grass && !out.has(o) && o.geometry && o.geometry.attributes.position.count<=12) out.add(o); });   // the grass: the detail's one blade draw
  if(room.vegDbg) for(const m of room.vegDbg()) add(m);
  return [...out]; }

let H=null, T=null, CV=null, FM=null;
async function kit(){ if(!H){ H=await import('../../../apps/night/scene/host.js'); T=await H.loadThree(); CV=(await import('../../../core/palette.js')).cv; FM=await import('../../../apps/night/rooms/forest/forest.js'); } return { H, T, CV, F:FM }; }
/* the forest at `level`, the switch `on` (null: leave it), mutate(room, T) before the frames → per view { hash, cover, mass, ground } + geo, prog;
   speedOff: built as before SPEED-1 (forest.js SPEED_BEFORE — the pins of today's forest were made before it) */
export async function forestFrames({ level='reduced', on=false, mutate=null, veg=true, vis=false, speedOff=false }={}){
  const { T, CV, F }=await kit(), was=F.forestNewDbg ? F.forestNewDbg() : false, wasC=F.forestCullDbg ? F.forestCullDbg() : false;
  if(F.forestNewDbg && on!=null) F.forestNewDbg(on); if(F.forestCullDbg) F.forestCullDbg(false);   // FOREST-2f: the content judged without the cull (it re-packs the instance lists; its own row proves the frames the same)
  const canvas=document.createElement('canvas'); let r=null, room=null;
  try{
    await Promise.race([F.forestAssets(level), new Promise((_, no)=>setTimeout(()=>no(new Error('the forest files did not arrive in 60 s')), 60000))]);
    if(F.forestNewAssets && F.forestNewDbg && F.forestNewDbg()) await Promise.race([F.forestNewAssets(level), new Promise((_, no)=>setTimeout(()=>no(new Error('the new forest files did not arrive in 60 s')), 60000))]);
    r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true }); r.setPixelRatio(1);
    r.outputEncoding=T.sRGBEncoding; r.toneMapping=T.ACESFilmicToneMapping; r.toneMappingExposure=1.0; r.info.autoReset=false; r.shadowMap.enabled=false;
    const [, w0, h0]=FOREST2_VIEWS[0];
    room=F.buildForest(T, { C:CV, level, w:w0, h:h0, reduce:false, mood:null, shadow:false, gl2:r.capabilities.isWebGL2, speedOff });
    if(mutate) await mutate(room, T);
    const gl=r.getContext(), out={ level, on:!!(F.forestNewDbg && F.forestNewDbg()), views:{} };
    for(const [name, w, h] of FOREST2_VIEWS){ r.setSize(w, h, false); room.viewDbg(null); room.resize(w, h, h); room.viewDbg({ rest:true });
      const shot=()=>{ room.update(0, 100, [], null, { mood:null }); r.info.reset(); if(room.render) room.render(r); else r.render(room.scene, room.camera); const px=new Uint8Array(w*h*4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
      shot(); const A=shot(), v={ hash:hex(hashBytes(A)), calls:r.info.render.calls, tris:r.info.render.triangles };
      if(veg){ const V=vegMeshes(room), keep=V.map(m=>m.visible); V.forEach(m=>{ m.visible=false; }); const B=shot(); V.forEach((m,i)=>{ m.visible=keep[i]; });
        Object.assign(v, vegCover(A, B), { ground:groundDetail(B, w, h), plants:V.length }); }
      if(vis) v.shrooms=shroomVis(room, T, r, w, h);
      out.views[name]=v; }
    out.geo=geoPrint(room.scene); out.prog=progPrint(r); out.renderer=(()=>{ const x=gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)); })();
    out.tex=room.texBytes ? room.texBytes() : null;
    return out;
  } finally {
    try{ if(room) room.dispose(); }catch(e){} try{ if(r){ r.dispose(); r.forceContextLoss(); } }catch(e){}
    if(F.forestNewDbg) F.forestNewDbg(was); if(F.forestCullDbg) F.forestCullDbg(wasC);
  }
}
/* the three rows share their builds: per level today (off), new (on) and FOREST-1's ferns (c1, frames only) — six forests in all, made once per run
   of the rows (a row asked again within 10 minutes reads the same builds) */
let SHARED=null, SHARED_AT=0;
export function forestShared(){ if(SHARED && performance.now()-SHARED_AT<600000) return SHARED; SHARED_AT=performance.now();
  SHARED=(async()=>{ const out={};
    for(const lv of ['reduced', 'full']){ let cutOff=null, cutOn=null;
      let cenOff=null, cenOn=null;
      const off=await forestFrames({ level:lv, on:false, vis:true, mutate:async (room, T)=>{ cutOff=await plantCuts(room); cenOff=await todayCensus(room, T); } });
      const on=await forestFrames({ level:lv, on:'new', vis:true, mutate:async (room, T)=>{ cutOn=await plantCuts(room); cenOn=await variantCensus(room, T, 'new', cenOff); } });
      const c1=await forestFrames({ level:lv, on:false, mutate:forest1Ferns });
      out[lv]={ off, on, c1, cutOff, cutOn, cenOff, cenOn }; }
    return out; })();
  SHARED.catch(()=>{ SHARED=null; }); return SHARED; }
/* every mushroom's VISIBLE area on this view, by depth (what stands in front of it, not what is behind it): the scene drawn whole (its depth), then only
   the caps and stems again, flat white, depth-tested against it — each white pixel goes to the mushroom whose cap projects nearest (within its projected
   size ×3, at least 6 px) → pixels per mushroom (index = the caps' own order) */
function shroomVis(room, T, r, w, h){ const L=room.lifeDbg.parts, caps=L.caps, stems=L.stems, m=new T.Matrix4(), p=new T.Vector3(), P=[], cam=room.camera, gl=r.getContext();
  cam.updateMatrixWorld(); for(let i=0;i<caps.count;i++){ caps.getMatrixAt(i, m); p.setFromMatrixPosition(m); const s=Math.hypot(m.elements[0], m.elements[1], m.elements[2]);
    const d=p.distanceTo(cam.position), q=p.clone().project(cam), rad=Math.max(6, 3*s/(d*Math.tan(cam.fov*Math.PI/360))*h/2); P.push(q.z<1 && q.z>-1 ? [(q.x+1)/2*w, (q.y+1)/2*h, rad] : null); }
  const ac=r.autoClear, tm=r.toneMapping; r.setRenderTarget(null); r.autoClear=true; r.render(room.scene, cam);
  const keep=[]; room.scene.traverse(o=>{ if(o!==room.scene && o!==caps && o!==stems && (o.isMesh || o.isPoints || o.isSprite || o.isLine)){ keep.push([o, o.visible]); o.visible=false; } });
  const W1=new T.MeshBasicMaterial({ color:0xffffff, fog:false, toneMapped:false }), W2=W1.clone(), bg=room.scene.background, m1=caps.material, m2=stems.material;   // one white material each (a shared one mixes their instancing programs)
  caps.material=W1; stems.material=W2; room.scene.background=null; r.autoClear=false; r.toneMapping=T.NoToneMapping; r.render(room.scene, cam);
  caps.material=m1; stems.material=m2; room.scene.background=bg; r.autoClear=ac; r.toneMapping=tm; for(const [o, v] of keep) o.visible=v; W1.dispose(); W2.dispose();
  const px=new Uint8Array(w*h*4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const out=new Array(caps.count).fill(0);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4; if(px[i]<250 || px[i+1]<250 || px[i+2]<250) continue; let best=-1, bd=Infinity;
    for(let k=0;k<P.length;k++){ const q=P[k]; if(!q) continue; const dd=Math.hypot(q[0]-x, q[1]-y); if(dd<q[2] && dd<bd){ bd=dd; best=k; } } if(best>=0) out[best]++; }
  return out; }
/* the pins (run BEFORE FOREST-2 changed anything; printed for tools/prints/forest-today.json) */
export async function dumpForestToday(){ const out={ made:new Date().toISOString().slice(0, 10), what:'the forest before FOREST-2 (forest-approved-2026-11-15), no switch', levels:{} };
  for(const lv of ['reduced', 'full']){ const f=await forestFrames({ level:lv, on:null, veg:false }); out.levels[lv]={ geo:f.geo, prog:f.prog, views:Object.fromEntries(Object.entries(f.views).map(([k,v])=>[k, { hash:v.hash }])) }; out.renderer=f.renderer; }
  return out; }

/* «FOREST switch off = today» */
let TODAY=null, TODAY_AT=0;
export function checkForestToday(){ if(TODAY && performance.now()-TODAY_AT<600000) return TODAY; TODAY_AT=performance.now(); TODAY=forestTodayRun(); TODAY.catch(()=>{ TODAY=null; }); return TODAY; }
async function forestTodayRun(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const pin=await fetch(PIN_URL, { cache:'no-store' }).then(r=>r.ok ? r.json() : null).catch(()=>null);
  if(!ok('the pins tools/prints/forest-today.json are missing', !!pin)) return { cases:n, total:d.length, differences:d, notes };
  const { F }=await kit(); ok('forest.js has no switch door (forestNewDbg)', typeof F.forestNewDbg==='function');
  /* SHARE-4 full check: the pins are the forest approved 2026-11-15, made before SPEED-1 — the switch-off forest is built as then (speedOff); SPEED's own
     changes (step 4's plain far trunks at Standard) are judged by «FOREST paint» and the speed rows against SPEED_BEFORE */
  for(const lv of ['reduced', 'full']){ const P=pin.levels[lv], off=await forestFrames({ level:lv, on:false, veg:false, speedOff:true }), same=off.renderer===pin.renderer;
    ok(`${lv}: the switch-off forest's content differs from today's (geometry ${off.geo.hash} / ${P.geo.hash}, ${off.geo.objects} / ${P.geo.objects} objects)`, off.geo.hash===P.geo.hash);
    if(same){ ok(`${lv}: a shader program differs from today's (${off.prog.hash} / ${P.prog.hash}, ${off.prog.programs} / ${P.prog.programs} programs)`, off.prog.hash===P.prog.hash);
      for(const [k, v] of Object.entries(P.views)) ok(`${lv} ${k}: the frame differs from today's (${off.views[k].hash} / ${v.hash})`, off.views[k] && off.views[k].hash===v.hash); }
    else notes.push(`${lv}: another renderer than the pins' (${off.renderer} / ${pin.renderer}) — only the content compared`);
    const on=await forestFrames({ level:lv, on:true, veg:false, speedOff:true });
    ok(`CONTROL ${lv}: the switch on left the content as today's — the check cannot see the switch`, on.geo.hash!==P.geo.hash);
    if(lv==='reduced'){ const sp=await forestFrames({ level:lv, on:false, veg:false }); ok('CONTROL reduced: the SPEED build has the pre-SPEED content — the row cannot tell which forest it built', sp.geo.hash!==P.geo.hash); }
    if(same) for(const k of Object.keys(P.views)) ok(`CONTROL ${lv} ${k}: the switch on left the frame as today's`, on.views[k].hash!==P.views[k].hash);
    notes.push(`${lv}: off ${off.geo.objects} objects ${off.prog.programs} programs, frames ${Object.values(off.views).map(v=>v.hash).join(' ')}; on ${on.geo.objects} objects ${on.prog.programs} programs, calls ${Object.values(on.views).map(v=>v.calls).join('/')} (off ${Object.values(off.views).map(v=>v.calls).join('/')}), triangles ${Object.values(on.views).map(v=>v.tris).join('/')} (off ${Object.values(off.views).map(v=>v.tris).join('/')})`); }
  return { cases:n, total:d.length, differences:d, notes };
}

/* FOREST-1's fern cards (the CONTROL of «looks as full»): its CC0 frond sheet from the archive, the frond's cell, 0.575 wide, dimmed 0.62 */
export async function forest1Ferns(room, T){
  const img=new Image(); img.src='/archive/forest1-attempt/apps/night/rooms/forest/cc0/foliage-1024.png';
  await Promise.race([img.decode(), new Promise((_, no)=>setTimeout(()=>no(new Error('the archive sheet did not load in 20 s')), 20000))]);
  const tx=new T.Texture(img); tx.encoding=T.sRGBEncoding; tx.needsUpdate=true;
  const { fronds, frondM }=room.fernsDbg, g=fronds.geometry, p=g.attributes.position, uv=g.attributes.uv, [u0, v0, du, dv]=[512/2048, 1-(1024+1024)/2048, 512/2048, 1024/2048];   // the archive's FOLIAGE_ATLAS cell fernA [512, 1024, 512, 1024] of 2048 (its module's imports point outside the archive)
  for(let i=0;i<p.count;i++){ p.setX(i, p.getX(i)*0.575/0.42); uv.setXY(i, u0+uv.getX(i)*du, v0+uv.getY(i)*dv); } p.needsUpdate=uv.needsUpdate=true;
  frondM.map=tx; frondM.color.setScalar(0.62); frondM.needsUpdate=true; }
/* «FOREST looks as full» */
export async function checkForestFull(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }, R=FULL_RULE, pc=x=>(x*100).toFixed(2)+' %';
  const below=(a, b)=>a<b*(1-R.eps);
  const S=await forestShared();
  for(const lv of ['reduced', 'full']){
    const { off, on, c1 }=S[lv];
    for(const [k] of FOREST2_VIEWS){ const a=off.views[k], b=on.views[k], c=c1.views[k];
      ok(`${lv} ${k}: the plants cover less with the switch (${pc(b.cover)} < ${pc(a.cover)})`, !below(b.cover, a.cover));
      ok(`${lv} ${k}: the plants show less with the switch (mass ${b.mass.toFixed(3)} < ${a.mass.toFixed(3)})`, !below(b.mass, a.mass));
      ok(`${lv} ${k}: the ground's detail dropped with the switch (${b.ground.toFixed(3)} < ${a.ground.toFixed(3)})`, !below(b.ground, a.ground));
      ok(`CONTROL ${lv} ${k}: FOREST-1's ferns did not fail «looks as full» (cover ${pc(c.cover)} / ${pc(a.cover)}, mass ${c.mass.toFixed(3)} / ${a.mass.toFixed(3)})`, below(c.cover, a.cover) || below(c.mass, a.mass));
      notes.push(`${lv} ${k}: plants cover ${pc(a.cover)} → ${pc(b.cover)} (FOREST-1 ${pc(c.cover)}), mass ${a.mass.toFixed(3)} → ${b.mass.toFixed(3)} (${c.mass.toFixed(3)}), ground ${a.ground.toFixed(3)} → ${b.ground.toFixed(3)}, plant draws ${a.plants} → ${b.plants}`); } }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.9851, night:true, name:'FOREST switch off = today', drawn:true, run:()=>checkForestToday(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
row({ at:1009.9852, night:true, name:'FOREST looks as full', drawn:true, run:()=>checkForestFull(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });

/* «FOREST plants clear of solids»: every plant card of the built forest (today's ferns, the herbs, the fine ferns, the understorey's sprays), sampled on
   the inside of its own triangles (barycentric points ≥ 0.15 from each edge, the instance's matrix applied), must not lie inside a solid: a trunk or a
   snag (its mean radius × 0.95 at that height), a rock (the instance's own sphere, radius 0.85 — «visibly»), a root (its half width × 0.9 under its
   ridge), a log (r × 0.9), a stump (r, below its top). Allowed growers (pure/natural.js GROWERS) are not cards here, the sprouts on the logs are skipped.
   CONTROL: today's forest (the old placement) must fail it. */
export async function plantCuts(room){
  const FF=await import('../../../apps/night/rooms/forest/pure/fireflies.js'), WD=await import('../../../apps/night/rooms/forest/pure/wood.js'), { T }=await kit();
  const S=room.state(), WP=room.woodPlacesDbg, G=1.0, grid=new Map(), key=(i, j)=>i+','+j, put=(x0, z0, x1, z1, s)=>{ for(let i=Math.floor(Math.min(x0,x1)/G);i<=Math.floor(Math.max(x0,x1)/G);i++) for(let j=Math.floor(Math.min(z0,z1)/G);j<=Math.floor(Math.max(z0,z1)/G);j++){ const k=key(i,j); if(!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } };
  for(const [x, z, r] of S.trunks){ const R=WD.trunkOuter(r, 0); put(x-R, z-R, x+R, z+R, { kind:'trunk', x, z, r, y0:FF.forestGround(x, z)+WD.WOOD.trunk.foot }); }
  for(const S2 of WP.snags){ const R=WD.trunkOuter(S2.s, 0); put(S2.x-R, S2.z-R, S2.x+R, S2.z+R, { kind:'snag', x:S2.x, z:S2.z, r:S2.s, y0:S2.y+WD.WOOD.trunk.foot }); }
  for(const S2 of WP.stumps) put(S2.x-S2.r, S2.z-S2.r, S2.x+S2.r, S2.z+S2.r, { kind:'stump', x:S2.x, z:S2.z, r:S2.r, top:S2.y+S2.h-0.02, bot:S2.y-0.1 });
  for(const L of WP.logs) put(L.a[0]-0.3, L.a[2]-0.3, L.b[0]+0.3, L.b[2]+0.3, { kind:'log', a:L.a, b:L.b, r:Math.max(L.r0, L.r1) });
  for(const rt of WP.roots) for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j], w=Math.max(A[3], B[3]), top=rt.top ? Math.max(rt.top[j-1], rt.top[j]) : Math.max(A[1], B[1])+w; put(A[0]-w, A[2]-w, B[0]+w, B[2]+w, { kind:'root', a:A, b:B, w, top }); }
  const rk=room.streamDbg.parts.rocks, m=new T.Matrix4(), inv=[];
  for(let i=0;i<rk.count;i++){ rk.getMatrixAt(i, m); const e=m.elements, sx=Math.hypot(e[0], e[1], e[2]), sz=Math.hypot(e[8], e[9], e[10]), R=Math.max(sx, sz)*1.3; inv.push(m.clone().invert()); put(e[12]-R, e[14]-R, e[12]+R, e[14]+R, { kind:'rock', i }); }
  const v=new T.Vector3(), w=new T.Vector3(), seg=(px, pz, a, b)=>{ const vx=b[0]-a[0], vz=b[2]-a[2], t=Math.max(0, Math.min(1, ((px-a[0])*vx+(pz-a[2])*vz)/(vx*vx+vz*vz||1))); return [Math.hypot(px-a[0]-vx*t, pz-a[2]-vz*t), t]; };
  const inside=(x, y, z)=>{ const cell=grid.get(key(Math.floor(x/G), Math.floor(z/G))); if(!cell) return null;
    for(const s of cell){
      if(s.kind==='trunk' || s.kind==='snag'){ const hb=y-s.y0; if(hb>=0 && hb<16 && Math.hypot(x-s.x, z-s.z)<WD.trunkRadius(s.r, hb)*0.95) return s.kind; }
      else if(s.kind==='stump'){ if(y<s.top && y>s.bot && Math.hypot(x-s.x, z-s.z)<s.r) return s.kind; }
      else if(s.kind==='log'){ const [d, t]=seg(x, z, s.a, s.b), yc=s.a[1]+(s.b[1]-s.a[1])*t; if(Math.hypot(d, y-yc)<s.r*0.9) return s.kind; }
      else if(s.kind==='root'){ const [d, t]=seg(x, z, s.a, s.b); if(d<s.w*0.9 && y<s.top-0.01 && y>s.a[1]-s.w-0.1) return s.kind; }
      else if(s.kind==='rock'){ w.set(x, y, z).applyMatrix4(inv[s.i]); if(w.length()<0.85) return s.kind; } }
    return null; };
  /* the cards: a mesh, which instances to skip, and its triangles' inner points (local) */
  const pts=g=>{ const p=g.attributes.position, ix=g.index ? g.index.array : null, n=ix ? ix.length : p.count, out=[], B=[[0.15,0.15,0.7],[0.7,0.15,0.15],[0.15,0.7,0.15],[0.34,0.33,0.33],[0.5,0.3,0.2],[0.2,0.5,0.3],[0.3,0.2,0.5]];
    for(let t=0;t<n;t+=3){ const a=ix ? ix[t] : t, b=ix ? ix[t+1] : t+1, c=ix ? ix[t+2] : t+2; for(const [u, w, q] of B) out.push([p.getX(a)*u+p.getX(b)*w+p.getX(c)*q, p.getY(a)*u+p.getY(b)*w+p.getY(c)*q, p.getZ(a)*u+p.getZ(b)*w+p.getZ(c)*q]); }
    return out; };
  const FP=room.floorDbg.state().places, herbs=FP.filter(p=>p.sp!=='fern2'), skipH=new Set(herbs.map((p,i)=>p.on ? i : -1).filter(i=>i>=0));
  const CP=room.canopyDbg.places, under=new Set(CP.sprays.map((p,i)=>p.of==='crown' ? -1 : i).filter(i=>i>=0));
  const cards=[['ferns', room.fernsDbg.fronds, null], ['herbs', room.floorDbg.parts.herbs, i=>skipH.has(i)], ['fine ferns', room.floorDbg.parts.fronds, null], ['understorey', room.canopyDbg.parts.leaves, i=>!under.has(i)]];
  const out={ total:0, by:{}, kinds:{}, examples:[] };
  for(const [name, mesh, skip] of cards){ if(!mesh || !mesh.parent) continue; const P=pts(mesh.geometry); let k=0;
    for(let i=0;i<mesh.count;i++){ if(skip && skip(i)) continue; mesh.getMatrixAt(i, m); let hit=null;
      for(const q of P){ v.set(q[0], q[1], q[2]).applyMatrix4(m); hit=inside(v.x, v.y, v.z); if(hit) break; }
      if(hit){ k++; out.kinds[hit]=(out.kinds[hit]||0)+1; if(out.examples.length<6) out.examples.push(`${name}${name==='understorey' && CP.sprays[i] ? ' ('+CP.sprays[i].of+')' : ''} #${i} in a ${hit} at (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}), its foot (${m.elements[12].toFixed(2)}, ${m.elements[14].toFixed(2)}) scale ${Math.hypot(m.elements[0], m.elements[1], m.elements[2]).toFixed(2)}`); } }
    out.by[name]=k; out.total+=k; }
  return out; }
export async function checkForestClear(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const N=await import('../../../apps/night/rooms/forest/pure/natural.js'); notes.push('allowed growers: '+N.GROWERS.join('; '));
  const S=await forestShared();
  for(const lv of ['reduced', 'full']){ const res={ off:S[lv].cutOff, on:S[lv].cutOn };
    ok(`${lv}: ${res.on.total} plant cards cut through solids with the switch (${JSON.stringify(res.on.by)}; ${res.on.examples.join('; ')})`, res.on.total===0);
    ok(`CONTROL ${lv}: today's placement shows no card in a solid — the check cannot fail`, res.off.total>0);
    notes.push(`${lv}: today ${res.off.total} cards in solids ${JSON.stringify(res.off.by)} ${JSON.stringify(res.off.kinds)}; with the switch ${res.on.total}`); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.9853, night:true, name:'FOREST plants clear of solids', drawn:true, run:()=>checkForestClear(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });

/* ---------- «FOREST nothing lost» (FOREST-2, the founder's census) ----------
   The census is taken from TODAY'S forest — no switch, the forest «FOREST switch off = today» proves equal to the pins made before FOREST-2 (the row
   refuses to take it otherwise) — at Standard and Detailed: every mushroom and flower, fern, fine fern, herb, grass blade, sapling, bush, young tree,
   leaf spray of the understorey, rock, pebble, log, stump, snag, bracket fungus, moss cushion, ivy leaf and fallen branch with its place, and the roots per
   tree. Every switched-on variant (each switch alone and ?forest=new) must hold every one: a move is allowed only within its kind's small distance
   (MOVE, m) and is listed by name; one not found fails the row. A mushroom or flower also must not end up inside a new solid (a root, a stump, a trunk)
   it was not inside today. CONTROL: today's census with one mushroom dropped must fail. The rooms are built WITHOUT a renderer (no frames). */
export const MOVE=Object.freeze({ mushroom:0.45, flower:0.45, fern:1.8, 'fine fern':1.8, herb:1.8, grass:0, sapling:1.8, bush:1.8, 'young tree':1.8, 'understorey spray':1.8,
  rock:0.001, pebble:0.001, log:0.001, stump:0.001, snag:0.001, 'bracket fungus':0.001, 'moss cushion':0.001, ivy:0.001, 'fallen branch':0.001 });
/* a mushroom counts as less visible when its glow loses more than px pixels AND more than rel of today's (below that the glow's edge flickers with
   the shading behind it: ±1 px with ?forest=bark, which moves no geometry) — FOREST-2's guess, said in the report */
export const VIS_RULE=Object.freeze({ px:3, rel:0.1 });
/* the shared «all» build: every switch but the grass (its fix spreads today's one tuft of blades over the forest — judged by eye; its own census and visibility run as ?forest=grass) */
export const ALL_BUT_GRASS=Object.freeze(['old', 'rocks', 'roots', 'bark', 'moss', 'stumps', 'clear', 'spruce']);   // FOREST-2c: «old» first — no default (the grass is in it now); the shared «all» build is ?forest=new
export const VARIANTS=Object.freeze(['default', 'new']);   // FOREST-2d: every part is in the default now («new» = the same, built by its own word)   // FOREST-2c: bark, moss, stumps and grass are in the default now   // FOREST-2b: the default (rocks + clear), each switch on top of it, all
async function forestRoom(level, parts, fn){ const { T, CV, F }=await kit(), was=F.forestNewDbg(); F.forestNewDbg(parts||false); let room=null;
  try{ await Promise.race([F.forestAssets(level), new Promise((_, no)=>setTimeout(()=>no(new Error('the forest files did not arrive in 60 s')), 60000))]);
    room=F.buildForest(T, { C:CV, level, w:390, h:844, reduce:false, mood:null, shadow:false, gl2:true }); return await fn(room, T); }
  finally{ try{ if(room) room.dispose(); }catch(e){} F.forestNewDbg(was); } }
/* the census of a built room → { kind: [[x, y, z]…] } and roots per tree */
export function forestCensus(room, T){ const m=new T.Matrix4(), p=new T.Vector3(), out={}, add=(k, x, y, z)=>{ (out[k]=out[k]||[]).push([x, y, z]); };
  const inst=(k, mesh, every=1, skip=null)=>{ if(!mesh) return; const seen=new Set(); for(let i=0;i<mesh.count;i+=every){ if(skip && skip(i)) continue; mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m); if(every===1 || !seen.has(p.x+','+p.z)){ seen.add(p.x+','+p.z); add(k, p.x, p.y, p.z); } } };
  const L=room.lifeDbg.parts; inst('mushroom', L.caps); inst('flower', L.petals);
  inst('fern', room.fernsDbg.fronds, 7);
  const FP=room.floorDbg.state().places, herbs=FP.filter(q=>q.sp!=='fern2'); inst('herb', room.floorDbg.parts.herbs, 1, i=>!!(herbs[i] && herbs[i].on));
  { const fm=room.floorDbg.parts.fronds, seen=new Set(); for(let i=0;i<fm.count;i++){ fm.getMatrixAt(i, m); p.setFromMatrixPosition(m); const k=p.x.toFixed(4)+','+p.z.toFixed(4); if(!seen.has(k)){ seen.add(k); add('fine fern', p.x, p.y, p.z); } } }
  const S=room.state(); room.scene.traverse(o=>{ if(o.isInstancedMesh && S.detail && o.count===S.detail.grass && o.geometry.attributes.position.count<=12) inst('grass', o); });
  const CP=room.canopyDbg.places; for(const q of CP.saplings) add('sapling', q.x, 0, q.z); for(const q of CP.shrubs) add('bush', q.x, 0, q.z); for(const q of CP.young) add('young tree', q.x, 0, q.z);
  for(const q of CP.sprays) if(q.of!=='crown') add('understorey spray', q.x, q.y, q.z);
  if(room.canopyDbg.spruces){ for(const q of room.canopyDbg.spruces.places) add('young spruce', q.x, 0, q.z); for(const q of room.canopyDbg.spruces.cards) add('understorey spray', q.x, q.y, q.z); }   // FOREST-2c: the spruces' needles are the understorey's foliage
  const SP=room.streamDbg.parts; inst('rock', SP.rocks); inst('pebble', SP.pebbles);
  const W=room.woodPlacesDbg; for(const q of W.logs) add('log', (q.a[0]+q.b[0])/2, (q.a[1]+q.b[1])/2, (q.a[2]+q.b[2])/2); for(const q of W.stumps) add('stump', q.x, q.y, q.z); for(const q of W.snags) add('snag', q.x, q.y, q.z);
  for(const q of W.brackets) add('bracket fungus', q.x, q.y, q.z); for(const q of W.twigs) add('fallen branch', q.x, q.y, q.z);
  const WD=room.woodDbg.parts; inst('moss cushion', WD.moss); if(WD.ivy && WD.ivy.parent) inst('ivy', WD.ivy);
  const roots={}; for(const r of W.roots) if(!r.fork) roots[r.tree]=(roots[r.tree]||0)+1;
  return { kinds:out, roots, shrooms:L.caps ? null : null }; }
/* a mushroom's or flower's cap inside a solid of this room? (trunks by their mean radius, stumps by today's flare or the new foot, roots round or organic) */
async function buriedOf(room, parts){ const N=await import('../../../apps/night/rooms/forest/pure/natural.js'), WD=await import('../../../apps/night/rooms/forest/pure/wood.js'), FF=await import('../../../apps/night/rooms/forest/pure/fireflies.js');
  const W=room.woodPlacesDbg, S=room.state(), newStumps=parts && (parts==='new' || String(parts).split(',').includes('stumps'));
  return (x, y, z)=>{ if(N.rootHit(x, y, z, W.roots)) return 'root';
    if(newStumps ? N.stumpHit(x, y, z, W.stumps) : W.stumps.some(St=>{ const hb=y-St.y; return hb>-0.1 && hb<St.h && Math.hypot(x-St.x, z-St.z)<St.r*(1+0.25*Math.exp(-(hb+0.1)*5)); })) return 'stump';
    for(const [tx, tz, r] of S.trunks){ const hb=y-(FF.forestGround(tx, tz)+WD.WOOD.trunk.foot); if(hb>=0 && hb<16 && Math.hypot(x-tx, z-tz)<WD.trunkRadius(r, hb)) return 'trunk'; }
    return null; }; }
const capsOf=(room, T)=>{ const m=new T.Matrix4(), p=new T.Vector3(), out=[], c=room.lifeDbg.parts.caps; for(let i=0;i<c.count;i++){ c.getMatrixAt(i, m); p.setFromMatrixPosition(m); out.push([p.x, p.y, p.z]); } return out; };
/* today's census vs a variant's → { lost: [names], moved: [names], added: {kind: n}, buried: [names] } */
export function censusCompare(A, B, declared={}){ const lost=[], moved=[], added={};   // declared: { kind: m } a switch's own declared moves (grass: every blade placed at last)
  for(const [k, list] of Object.entries(A.kinds)){ const pool=(B.kinds[k]||[]).map(q=>({ q, used:false })), lim=declared[k]!=null ? declared[k] : MOVE[k]==null ? 0.001 : MOVE[k];
    const byIndex=pool.length>=list.length;   // the same law, the same order: each one is itself at its own index (additions come after)
    list.forEach((a, i)=>{ let best=null, bd=Infinity; if(byIndex){ best=pool[i]; bd=Math.hypot(best.q[0]-a[0], best.q[2]-a[2]); } else for(const c of pool){ if(c.used) continue; const d=Math.hypot(c.q[0]-a[0], c.q[2]-a[2]); if(d<bd){ bd=d; best=c; } }
      if(best && typeof lim==='function' && byIndex && bd>(MOVE[k]||0)+1e-6 && lim(i, a)){ best.used=true; moved.push(`${k} #${i} (${a[0].toFixed(2)}, ${a[2].toFixed(2)}) moved ${bd.toFixed(2)} m (declared by the room)`); }
      else if(best && bd<=(typeof lim==='function' ? (MOVE[k]||0) : lim)+1e-6){ best.used=true; if(bd>0.005) moved.push(`${k} #${i} (${a[0].toFixed(2)}, ${a[2].toFixed(2)}) moved ${bd.toFixed(2)} m`); }
      else lost.push(`${k} #${i} at (${a[0].toFixed(2)}, ${a[2].toFixed(2)})${best ? ` — the nearest is ${bd.toFixed(2)} m away (allowed ${lim} m)` : ' — none left'}`); });
    const extra=pool.filter(c=>!c.used).length; if(extra) added[k]=extra; }
  for(const [t, n] of Object.entries(A.roots)) if((B.roots[t]||0)!==n) lost.push(`the roots of tree ${t}: ${B.roots[t]||0}, today ${n}`);
  return { lost, moved, added }; }
async function todayCensus(room, T){ const c=forestCensus(room, T), bur=await buriedOf(room, false); c.buried=capsOf(room, T).map(q=>bur(q[0], q[1], q[2])); return c; }
const declOf=(v, room)=>({ grass:Infinity, 'understorey spray':Infinity, ...(room ? { 'young tree':leafMoved(room), fern:fernMoved(room) } : {}) });
/* FOREST-2f: a fern farther than MOVE only when the room declares exactly that one moved off a spruce (fernsDbg.apart.moved: its place of today) */
const fernMoved=room=>(i, a)=>{ const m=room.fernsDbg && room.fernsDbg.apart && room.fernsDbg.apart.moved && room.fernsDbg.apart.moved[i]; return !!(m && Math.hypot(m[0]-a[0], m[1]-a[2])<0.01); };
/* FOREST-2f (the founder saw the left spruce vanish at Detailed): every sapling or young tree a spruce replaced has its spruce, within 3.2 m (the pinned
   place's reach and the step-aside rings) → the missing ones; drop: the probes' CONTROL (that spruce left out of the list) */
export function spruceCensus(room, drop=-1){ const CP=room.canopyDbg.places, SP=room.canopyDbg.spruces, P=(SP ? SP.places : []).filter((_, i)=>i!==drop), miss=[];
  for(const [kind, L] of [['sapling', CP.saplings], ['young tree', CP.young]]) L.forEach((q, i)=>{ if(q.sp && !P.some(p=>p.from && Math.abs(p.from[0]-q.x)<1e-6 && Math.abs(p.from[1]-q.z)<1e-6 && Math.hypot(p.x-q.x, p.z-q.z)<=3.2)) miss.push(`${kind} #${i} (${q.x.toFixed(2)}, ${q.z.toFixed(2)}) has no spruce of its own`); });   // its own: the spruce that grew from it
  return miss; }   // FOREST-2e: + the young broad-leaved trees the room moved out of the gap, each by its own declaration (below)
/* FOREST-2e: a young tree may be farther than MOVE only when the room declares exactly that one moved (canopy places: leaf, and its place before the
   move `was` equal to today's) — the founder asked for it to become a natural broad-leaved tree, which cannot grow its leaves in the gap */
const leafMoved=room=>(i, a)=>{ const q=room.canopyDbg && room.canopyDbg.places.young[i]; return !!(q && q.leaf && q.was && Math.hypot(q.was[0]-a[0], q.was[1]-a[2])<0.01); };   // FOREST-2c: the grass is placed in every word (the default); with the spruces the young trees' and saplings' sprays are replaced by needles (declared)
async function variantCensus(room, T, v, A){ const B=forestCensus(room, T), res=censusCompare(A, B, declOf(v, room)), bur=await buriedOf(room, v), caps=capsOf(room, T), buried=[];
  A.kinds.mushroom.forEach((a, i)=>{ let bd=Infinity, bq=null; for(const q of caps){ const dd=Math.hypot(q[0]-a[0], q[2]-a[2]); if(dd<bd){ bd=dd; bq=q; } } if(!bq || bd>MOVE.mushroom) return;
    const w=bur(bq[0], bq[1], bq[2]); if(w && !A.buried[i]) buried.push(`mushroom #${i} (${a[0].toFixed(2)}, ${a[2].toFixed(2)}) inside a ${w}`); });
  const nat=room.natDbg ? room.natDbg() : null, spr=spruceCensus(room), sprC=spruceCensus(room, room.canopyDbg.spruces ? room.canopyDbg.spruces.places.findIndex(p=>p.pin) : -1); return { ...res, buried, shroomMoves:nat && nat.moved ? nat.moved.shrooms : [], spr, sprC, spruces:room.canopyDbg.spruces ? room.canopyDbg.spruces.places.length : 0 }; }
let CENSUS=null;
export async function checkForestLost(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }, out={};
  /* the census only from today's proven forest */
  const tday=await checkForestToday(); notes.push(`«FOREST switch off = today»: ${tday.cases} cases, ${tday.total} differences`);
  if(!ok('today\'s forest does not equal the pins — no census taken (the founder: stop and tell)', tday.total===0)) return { cases:n, total:d.length, differences:d.concat(tday.differences), notes };
  for(const lv of ['reduced', 'full']){
    const SH=(await forestShared())[lv], A=SH.cenOff;   // today's census and ?forest=new's come with the shared builds
    out[lv]={ census:Object.fromEntries(Object.entries(A.kinds).map(([k, L])=>[k, L.length])), roots:A.roots, variants:{} };
    notes.push(`${lv}: today ${Object.entries(A.kinds).map(([k, L])=>k+' '+L.length).join(', ')}, roots ${Object.values(A.roots).reduce((a, b)=>a+b, 0)} on ${Object.keys(A.roots).length} trees`);
    /* CONTROL (visibility): the most visible mushroom of today put inside the nearest rock must be seen hidden */
    if(lv==='reduced'){ const a=SH.off.views.laptop.shrooms, k=a.indexOf(Math.max(...a));
      const fc=await forestFrames({ level:lv, on:false, veg:false, vis:true, mutate:async (room, T)=>{ const L=room.lifeDbg.parts, m=new T.Matrix4(), rk=room.streamDbg.parts.rocks, best=new T.Vector3(), p=new T.Vector3(), q=new T.Vector3(); L.caps.getMatrixAt(k, m); p.setFromMatrixPosition(m); let bd=Infinity;
        for(let i=0;i<rk.count;i++){ const mm=new T.Matrix4(); rk.getMatrixAt(i, mm); q.setFromMatrixPosition(mm); const dd=q.distanceTo(p); if(dd<bd){ bd=dd; best.copy(q); } }
        for(const mesh of [L.caps, L.stems]){ mesh.getMatrixAt(k, m); m.setPosition(best.x, best.y, best.z); mesh.setMatrixAt(k, m); mesh.instanceMatrix.needsUpdate=true; } } });
      ok(`CONTROL ${lv}: a mushroom put inside a rock was not seen hidden (${fc.views.laptop.shrooms[k]} px, today ${a[k]})`, fc.views.laptop.shrooms[k]<a[k]); }
    /* CONTROL: one mushroom dropped */
    { const B={ kinds:{ ...A.kinds, mushroom:A.kinds.mushroom.slice(1) }, roots:A.roots }, r=censusCompare(A, B); ok(`CONTROL ${lv}: a dropped mushroom was not seen`, r.lost.length===1 && /^mushroom/.test(r.lost[0])); }
    for(const v of VARIANTS){
      let cv=null; const fr= v==='new' ? SH.on : await forestFrames({ level:lv, on:v, veg:false, vis:true, mutate:async (room, T)=>{ cv=await variantCensus(room, T, v, A); } }), r= v==='new' ? SH.cenOn : cv;
      /* every mushroom of today as visible as today on both fixed views (its own index; an added one comes after) */
      const hid=[]; for(const [k] of FOREST2_VIEWS){ const a=SH.off.views[k].shrooms, b=fr.views[k].shrooms; a.forEach((n0, i)=>{ const n1=b[i]||0; if(n0>0 && n0-n1>VIS_RULE.px && n1<n0*(1-VIS_RULE.rel)) hid.push(`mushroom #${i} on the ${k} view: ${b[i]||0} px, today ${n0}`); }); }
      ok(`${lv} ?forest=${v}: ${hid.length} mushrooms less visible than today — ${hid.slice(0, 6).join('; ')}`, hid.length===0);
      ok(`${lv} ?forest=${v}: ${r.lost.length} lost — ${r.lost.slice(0, 6).join('; ')}`, r.lost.length===0);
      ok(`${lv} ?forest=${v}: ${r.spr.length} spruces missing — ${r.spr.slice(0, 4).join('; ')}`, r.spr.length===0);   // FOREST-2f
      ok(`CONTROL ${lv} ?forest=${v}: the left pair's spruce left out was not caught`, r.sprC.length>0);
      ok(`${lv} ?forest=${v}: ${r.buried.length} mushrooms buried in a new solid — ${r.buried.slice(0, 6).join('; ')}`, r.buried.length===0);
      out[lv].variants[v]={ moved:r.moved, added:r.added, shroomMoves:r.shroomMoves };
      notes.push(`${lv} ?forest=${v}: lost ${r.lost.length}, moved ${r.moved.length} (${[...new Set(r.moved.map(x=>x.split(' #')[0]))].join(', ')||'none'}), added ${JSON.stringify(r.added)}, mushrooms nudged ${r.shroomMoves.length}`); } }
  CENSUS=out; return { cases:n, total:d.length, differences:d, notes, census:out };
}
export const forestCensusDbg=()=>CENSUS;
/* «FOREST switch level»: through the real scene host (the path a player's tab takes — the level chosen, the files' hold, the room built by its loader),
   Detailed chosen: each switch alone and all of them open at Detailed (nothing held back), the room says the switch it was built with, and the live
   room's census equals today's live census at Detailed except the moves each switch declares (MOVE). CONTROL: a switch forced to Standard must fail both */
const until=async (f, ms, step=100)=>{ const t0=performance.now(); while(performance.now()-t0<ms){ if(await f()) return true; await new Promise(r=>setTimeout(r, step)); } return !!(await f()); };
export async function checkForestLevels(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }, { H, T, F }=await kit(), keep={ bg:H.backgroundOf(), level:H.sceneLevel(), parts:F.forestNewDbg(), cull:F.forestCullDbg() }; F.forestCullDbg(false);   // FOREST-2f: the census without the cull
  const tday=await checkForestToday(); if(!ok('the forest of today does not equal the pins — no census taken', tday.total===0)) return { cases:n, total:d.length, differences:d.concat(tday.differences), notes };
  const open=async (parts, lv)=>{ await H.setBackground('dark'); F.forestNewDbg(parts||false); await H.setSceneLevel(lv); await H.setBackground('forest');
    const okOpen=await until(()=>{ const I=H.sceneInfo(); return I.webgl && !I.opening && I.rendered>0 && I.id==='room.forest'; }, 120000, 200); const I=H.sceneInfo(), room=H.sceneRoomDbg();
    return { okOpen, level:I.level, held:I.held, built:room && room.natDbg ? room.natDbg().parts : null, census:room ? forestCensus(room, T) : null, room }; };
  try{
    const A=await open(false, 'full'); ok('the forest of today did not open at Detailed through the host', A.okOpen && A.level==='full' && !A.held);
    notes.push(`today at Detailed through the host: ${Object.entries(A.census.kinds).map(([k, L])=>k+' '+L.length).join(', ')}`);
    for(const v of VARIANTS){ const B=await open(v, 'full'), want=v==='new' ? F.FOREST_PARTS.slice() : F.FOREST_PARTS.filter(k=>F.FOREST_DEFAULT.includes(k) || k===v), res=censusCompare(A.census, B.census, declOf(v, B.room));
      ok(`?forest=${v}: opened at ${B.level}${B.held ? ' (Detailed held back)' : ''}, chosen Detailed`, B.okOpen && B.level==='full' && !B.held);
      ok(`?forest=${v}: the room was built with ${JSON.stringify(B.built)}, wanted ${JSON.stringify(want)}`, JSON.stringify((B.built||[]).slice().sort())===JSON.stringify(want.slice().sort()));
      { const sm=spruceCensus(B.room); ok(`?forest=${v} at Detailed: ${sm.length} spruces missing — ${sm.slice(0, 3).join('; ')}`, sm.length===0); }   // FOREST-2f: the spruces through the host too
      ok(`?forest=${v} at Detailed: ${res.lost.length} of today's lost — ${res.lost.slice(0, 4).join('; ')}`, res.lost.length===0);
      notes.push(`?forest=${v}: level ${B.level}, built ${JSON.stringify(B.built)}, moved ${res.moved.length}, added ${JSON.stringify(res.added)}`); }
    { const C=await open('roots', 'reduced'), res=censusCompare(A.census, C.census), caught=C.level!=='full' && res.lost.length>0;
      ok(`CONTROL: ?forest=roots forced to Standard was not caught (level ${C.level}, lost ${res.lost.length})`, caught); notes.push(`CONTROL Standard under roots: level ${C.level}, lost ${res.lost.length}`); }
  } finally { try{ F.forestNewDbg(keep.parts||false); F.forestCullDbg(keep.cull); await H.setSceneLevel(keep.level); await H.setBackground(keep.bg); }catch(e){} }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.9855, night:true, name:'FOREST switch level', drawn:true, run:()=>checkForestLevels(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
row({ at:1009.9854, night:true, name:'FOREST nothing lost', drawn:true, run:()=>checkForestLost(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
