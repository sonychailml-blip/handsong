/* NIGHT-6 slice 4 — THE STREAM'S SURROUNDINGS (parts of the night forest room; forest.js builds them; the water's own shader is in
   forest-life.js; the numbers are ./pure/stream.js):
   - WET MOSSY ROCKS in and beside the water and PEBBLES along the shore: one instanced draw each, one material — moss on their tops, darker
     and glossier below the water's level (each knows it);
   - LEAVES DRIFTING downstream towards the viewer, turning slowly: one instanced draw with the floor's own material (the plant sheet's
     leaf cells);
   - THE MIST'S BREATH over the water: a few strips of drifting noise, brighter than the forest's mist, one draw, breathing slowly with the
     night (the mist layers and the sleep thicken it, the moon lights it).
   Colours: tokens (--cv-forest-rock, -moss) and the mood's haze. Counts per level: the record's levels (rocks, pebbles, floaters, mistStrips). */
import { STREAM_LIFE, streamRocks, streamPebbles, floatersInit, floatAt, mistStrips } from './pure/stream.js';
import { STREAM, streamNear } from './pure/forestlife.js';
import { cellUv, FLOOR_ATLAS } from './pure/floor.js';
import { seeded } from '../../../../core/pure/dsp.js';

const NOISE=`float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x), f.y); }`;
const MV=`attribute float aSeed; varying vec2 vUv; varying float vS, vZ; void main(){ vUv=uv; vS=aSeed; vec4 mv=modelViewMatrix*vec4(position,1.0); vZ=-mv.z; gl_Position=projectionMatrix*mv; }`;
const MF=`uniform float uNow, uO; uniform vec3 uCol; varying vec2 vUv; varying float vS, vZ; ${NOISE}
void main(){ float n=vn(vec2(vUv.x*4.0+uNow*0.05+vS, vUv.y*2.0))*0.65+vn(vec2(vUv.x*9.0-uNow*0.03+vS*2.0, vUv.y*4.0))*0.35;
  float a=smoothstep(0.32,0.8,n)*sin(vUv.y*3.14159)*smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x)*smoothstep(3.0,7.0,vZ);
  gl_FragColor=vec4(uCol, a*0.26*uO); }`;
/* NIGHT-8: a SMOOTH unit sphere (indexed: the icosahedron's vertices merged, so its normals are smooth — the old rocks were faceted because
   their unindexed faces each kept a flat normal); the rock's shape is made per instance in the shader (ROCK_V) */
function smoothSphere(T, detail){ const g=new T.IcosahedronGeometry(1, detail), p=g.attributes.position, key=new Map(), pos=[], idx=[];
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), k=Math.round(x*1e4)+','+Math.round(y*1e4)+','+Math.round(z*1e4);
    let j=key.get(k); if(j==null){ j=pos.length/3; key.set(k, j); pos.push(x, y, z); } idx.push(j); }
  g.dispose(); const o=new T.BufferGeometry(); o.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new T.Float32BufferAttribute(pos.slice(), 3)); o.setIndex(idx); return o; }
/* NIGHT-8: THE ROCK'S SHAPE, per instance (aRock: x seed, y warm tint, z lichen, w shape — 0 leaves the geometry as it is: the moss cushions):
   the radius along each direction is 1 + three smooth seeded lobes (an egg, a slab, a long stone) minus one worn flat face; the normal follows
   from the radius' gradient (a radially displaced sphere: N ∝ r·n − ∇ₜr), so the surface stays smooth; the buried underside is flattened */
const ROCK_V=`attribute vec4 aRock; varying vec4 vRock;
vec3 rkH(float s){ return fract(sin(vec3(s*127.1, s*311.7, s*74.7))*43758.5453)*2.0-1.0; }
float rkR(vec3 n, vec4 k, out vec3 g){ float r=1.0; g=vec3(0.0);
  for(int i=0;i<3;i++){ vec3 d=normalize(rkH(k.x*17.0+float(i)*3.1)+vec3(0.0,0.002,0.0)); float c=dot(n,d), a=k.w*(0.3-0.07*float(i))*(0.6+0.8*fract(k.x*7.3+float(i)*0.37)); r+=a*c*c; g+=2.0*a*c*d; }
  vec3 d=normalize(rkH(k.x*29.0+7.0)+vec3(0.0,0.002,0.0)); float c=dot(n,d)-0.5; if(c>0.0){ float a=k.w*0.85; r-=a*c*c; g-=2.0*a*c*d; }
  return r; }`;
/* ctx: { T, s, C, pal, own, lv, floorMat (the floor's material, or null), aisle (NIGHT-8: today's aisle rocks, drawn with the stream's) } → { update(dt, t, F), state() } */
export function buildStream(ctx){
  const { T, s, C, pal, own, lv, floorMat }=ctx, d=new T.Object3D(), R=seeded(0x53545231);
  /* rocks and pebbles (NIGHT-8: rounded and smooth, each its own shape and stone: grey or brownish, mottled, lichen spots, moss on top, half
     buried; darker and glossier where wet — below the water's level and in the splash band of a rock at the edge) */
  const rockM=new T.MeshStandardMaterial({ color:0xffffff, roughness:0.8 }), moss={ value:new T.Color(C('forest-moss')) },
    RU={ uMoss:moss, uRockG:{ value:new T.Color(C('forest-rock-grey')) }, uRockW:{ value:new T.Color(C('forest-rock-warm')) }, uRockL:{ value:new T.Color(C('forest-rock-lichen')) }, uRock0:{ value:new T.Color(C('forest-rock')) } };
  rockM.onBeforeCompile=sh=>{ Object.assign(sh.uniforms, RU);
    sh.vertexShader='attribute float aWater;\nattribute float aMoss;\nvarying float vWater;\nvarying float vMoss;\nvarying vec3 vWP5;\nvarying vec3 vWN5;\n'+ROCK_V+'\n'+sh.vertexShader
      .replace('#include <beginnormal_vertex>', `vec3 rkN=normalize(normal), rkG; float rkr=rkR(rkN, aRock, rkG); vec3 objectNormal=normalize(rkr*rkN-(rkG-dot(rkG,rkN)*rkN)); vRock=aRock;`)
      .replace('#include <begin_vertex>', `vec3 transformed=position*rkr; if(aRock.w>0.0 && transformed.y<0.0) transformed.y*=0.45;
  { vec4 w5=vec4(transformed,1.0); vec3 n5=objectNormal;
  #ifdef USE_INSTANCING
    w5=instanceMatrix*w5; n5=mat3(instanceMatrix)*n5;
  #endif
    vWP5=(modelMatrix*w5).xyz; vWN5=normalize(mat3(modelMatrix)*n5); vWater=aWater; vMoss=aMoss; }`);
    sh.fragmentShader='varying float vWater;\nvarying float vMoss;\nvarying vec3 vWP5;\nvarying vec3 vWN5;\nvarying vec4 vRock;\nuniform vec3 uMoss, uRockG, uRockW, uRockL, uRock0;\n'+NOISE+'\n'+sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float wet=1.0-smoothstep(vWater, vWater+0.12, vWP5.y), mt=smoothstep(0.35,0.8,vWN5.y)*smoothstep(0.35,0.6,vn(vWP5.xz*3.0+vWP5.y))*(1.0-wet)*(0.35+0.65*vRock.z);
  mt=max(mt, vMoss);   // NIGHT-6 slice 5: a moss cushion is moss all over, finer and patchier
  vec3 st=mix(mix(uRock0, uRockG, smoothstep(0.0,0.5,vRock.x)), uRockW, vRock.y)*(0.8+0.4*vn(vWP5.xz*6.0+vWP5.y*5.0+vRock.x*40.0))*(0.92+0.16*vn(vWP5.xz*45.0+vWP5.y*38.0));   // NIGHT-8: the stone, mottled
  float li=smoothstep(0.7,0.76, vn(vWP5.xz*34.0+vWP5.y*29.0+vRock.x*57.0))*smoothstep(0.4,0.6, vn(vWP5.xz*5.0+vWP5.y*4.0+vRock.x*9.0))*smoothstep(-0.25,0.35,vWN5.y)*vRock.z*(1.0-wet);   // lichen spots, dry and upward
  st=mix(st, uRockL*(0.75+0.5*vn(vWP5.xz*80.0+vWP5.y*60.0)), li*0.65);
  vec3 mc=uMoss*(0.7+0.6*vn(vWP5.xz*20.0))*mix(1.0, (0.65+0.6*vn(vWP5.xz*5.0+vWP5.y*3.0))*(0.75+0.5*vn(vWP5.xz*55.0+vWP5.y*40.0))*0.42, vMoss);   // darker: night moss
  diffuseColor.rgb=mix(st, mc, mt); diffuseColor.rgb*=mix(1.0, 0.58, wet);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor=mix(mix(roughnessFactor, 0.42, wet), 1.0, max(vMoss, mt*0.85));'); };
  rockM.customProgramCacheKey=()=>'handsong.streamRock3'; own.push(rockM);   // 3: the shape per instance, the stones' colours (NIGHT-8)
  /* list: [{ x, y, z, s (or sx, sy, sz), rot, water, wet }]; amt: how far each departs from a sphere; bury: how much deeper it may sit (of its height) */
  const stones=(list, geo, amt, bury)=>{ const N=Math.max(1, list.length), m=new T.InstancedMesh(geo, rockM, N), w=new Float32Array(N), k=new Float32Array(N*4);
    list.forEach((r,i)=>{ const sx=r.sx||r.s*1.25, sy=r.sy||r.s*0.75, sz=r.sz||r.s; d.position.set(r.x, r.y-sy*bury*R(), r.z); d.rotation.set((R()-0.5)*0.35, r.rot, (R()-0.5)*0.35);
      d.scale.set(sx*(0.85+0.3*R()), sy*(0.8+0.4*R()), sz*(0.85+0.3*R())); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      const edge=r.water>-5 && !r.wet && streamNear(r.x, r.z).d<STREAM.half+0.35+r.s; w[i]=r.water+(edge ? 0.08 : 0);   // the splash band of a rock at the edge
      k.set([R(), R()<0.4 ? 0.5+0.5*R() : 0.15*R(), r.wet ? 0.1*R() : 0.2+0.8*R(), amt*(0.6+0.4*R())], i*4); });
    geo.setAttribute('aWater', new T.InstancedBufferAttribute(w, 1)); geo.setAttribute('aMoss', new T.InstancedBufferAttribute(new Float32Array(N), 1)); geo.setAttribute('aRock', new T.InstancedBufferAttribute(k, 4));
    m.count=list.length; m.castShadow=m.receiveShadow=true; m.frustumCulled=false; own.push(geo); if(list.length) s.add(m); return m; };
  const rocks=streamRocks(Math.max(0, lv.rocks|0)), pebbles=streamPebbles(Math.max(0, lv.pebbles|0)), aisle=ctx.aisle||[], hi=!lv.softEdges, LT=ctx.litter||{ leaves:[], pebbles:[] };   // hi: the high level (finer spheres); LT: NIGHT-8 the ground's litter
  const rockMesh=stones(rocks.concat(aisle), smoothSphere(T, hi ? 3 : 2), 1, 0.35), pebMesh=stones(pebbles.concat(LT.pebbles), smoothSphere(T, 1), 0.7, 0.3); pebMesh.castShadow=false;
  /* the drifting leaves (the floor's material: its cells, its soft edges) */
  const fl=floatersInit(Math.max(0, lv.floaters|0)), fg=new T.PlaneGeometry(1, 1); fg.rotateX(-Math.PI/2);
  const NL=fl.length+LT.leaves.length, cells=new Float32Array(Math.max(1, NL)*4); fl.forEach((f,i)=>cells.set(cellUv('leaf'+(i%4)), i*4)); LT.leaves.forEach((q,i)=>cells.set(cellUv('leaf'+q.cell), (fl.length+i)*4)); fg.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 4)); own.push(fg);
  const floaters=new T.InstancedMesh(fg, floorMat || new T.MeshBasicMaterial({ visible:false }), Math.max(1, NL)), W=FLOOR_ATLAS.world.leaf, c=new T.Color();
  fl.forEach((f,i)=>{ floaters.setColorAt(i, c.setScalar(0.75+R()*0.35)); });
  LT.leaves.forEach((q,i)=>{ d.position.set(q.x, q.y, q.z); d.rotation.set(q.tilt, q.rot, 0, 'YXZ'); d.scale.set(q.s, 1, q.s); d.updateMatrix(); floaters.setMatrixAt(fl.length+i, d.matrix); floaters.setColorAt(fl.length+i, c.setScalar(0.55+0.4*((i*0.618)%1))); });   // NIGHT-8: the fallen leaves on the ground, after the drifting ones (static)
  floaters.count=NL; floaters.frustumCulled=false; floaters.renderOrder=-0.5; if(floorMat && NL) s.add(floaters);
  /* the mist's breath over the water: the strips face the eye (STREAM_LIFE.eye at the camera's height) */
  const ms=mistStrips(Math.max(0, lv.mistStrips|0)), mp=[], mu=[], msd=[], mi=[];
  ms.forEach((m,k)=>{ const yaw=Math.atan2(STREAM_LIFE.eye[0]-m.x, STREAM_LIFE.eye[1]-m.z), cx=Math.cos(yaw), sx=Math.sin(yaw), o=k*4;
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){ const a=(u-0.5)*m.w; mp.push(m.x+a*cx, m.y+(v-0.5)*m.h, m.z-a*sx); mu.push(u, v); msd.push(m.seed); }
    mi.push(o, o+1, o+2, o, o+2, o+3); });
  const mg=new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(mp, 3)); mg.setAttribute('uv', new T.Float32BufferAttribute(mu, 2)); mg.setAttribute('aSeed', new T.Float32BufferAttribute(msd, 1)); mg.setIndex(mi);
  const mm=new T.ShaderMaterial({ uniforms:{ uNow:{ value:0 }, uO:{ value:1 }, uCol:{ value:new T.Color() } }, vertexShader:MV, fragmentShader:MF, transparent:true, depthWrite:false, side:T.DoubleSide });
  const mist=new T.Mesh(mg, mm); mist.frustumCulled=false; if(ms.length) s.add(mist); own.push(mg, mm);
  /* one frame. F: { moonK, mist (the night's mean mist 0…1), deepMist (the sleep's), motion } */
  let pos=[]; function update(dt, t, F){
    pos=fl.map((f,i)=>{ const p=floatAt(f, t*(F.motion==null ? 1 : F.motion)); d.position.set(p.x, p.y, p.z); d.rotation.set(0, p.rot, 0); d.scale.set(W.w*(0.8+0.1*(i%5)), 1, W.h*(0.8+0.1*(i%5))); d.updateMatrix(); floaters.setMatrixAt(i, d.matrix); return p; });
    if(fl.length){ floaters.instanceMatrix.updateRange.offset=0; floaters.instanceMatrix.updateRange.count=fl.length*16; floaters.instanceMatrix.needsUpdate=true; }   // NIGHT-8: only the drifting leaves move (the ground's leaves after them stay)
    const U=mm.uniforms; U.uNow.value=t; U.uO.value=(0.7+0.3*Math.sin(t*0.09))*(0.6+0.6*(F.mist||0))*(F.deepMist||1); U.uCol.value.copy(pal.haze).multiplyScalar(0.55+0.45*(F.moonK==null ? 1 : F.moonK));
  }
  const state=()=>({ rocks:rocks.length, aisle:aisle.length, wetRocks:rocks.filter(r=>r.wet).length, pebbles:pebbles.length, floaters:pos.map(p=>({ x:p.x, z:p.z, u:p.u })), mistStrips:ms.length, mistO:mm.uniforms.uO.value });
  return { update, state, inWater:rocks.filter(r=>r.wet).map(({ x, z, s })=>({ x, z, s })), parts:{ rocks:rockMesh, pebbles:pebMesh, floaters, mist, rockMat:rockM } };   // inWater: NIGHT-8 (the water's white water round them)   // parts: probes; rockMat: the moss cushions share it
}
