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
import { cellUv, FLOOR_ATLAS } from './pure/floor.js';
import { seeded } from '../../../../core/pure/dsp.js';

const NOISE=`float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x), f.y); }`;
const MV=`attribute float aSeed; varying vec2 vUv; varying float vS, vZ; void main(){ vUv=uv; vS=aSeed; vec4 mv=modelViewMatrix*vec4(position,1.0); vZ=-mv.z; gl_Position=projectionMatrix*mv; }`;
const MF=`uniform float uNow, uO; uniform vec3 uCol; varying vec2 vUv; varying float vS, vZ; ${NOISE}
void main(){ float n=vn(vec2(vUv.x*4.0+uNow*0.05+vS, vUv.y*2.0))*0.65+vn(vec2(vUv.x*9.0-uNow*0.03+vS*2.0, vUv.y*4.0))*0.35;
  float a=smoothstep(0.32,0.8,n)*sin(vUv.y*3.14159)*smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x)*smoothstep(3.0,7.0,vZ);
  gl_FragColor=vec4(uCol, a*0.26*uO); }`;
function rockGeo(T, detail, seed){ const g=new T.IcosahedronGeometry(1, detail), p=g.attributes.position, R=seeded(seed), ph=[R()*6, R()*6, R()*6];
  for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i); const k=1+0.16*Math.sin(x*3.7+ph[0])*Math.cos(z*3.1+ph[1])+0.08*Math.sin(y*6.3+ph[2]); x*=k; y*=k; z*=k; if(y<0) y*=0.35; p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return g; }
/* ctx: { T, s, C, pal, own, lv, floorMat (the floor's material, or null) } → { update(dt, t, F), state() } */
export function buildStream(ctx){
  const { T, s, C, pal, own, lv, floorMat }=ctx, d=new T.Object3D(), R=seeded(0x53545231);
  /* rocks and pebbles */
  const rockM=new T.MeshStandardMaterial({ color:new T.Color(C('forest-rock')), roughness:0.92 }), moss={ value:new T.Color(C('forest-moss')) };
  rockM.onBeforeCompile=sh=>{ sh.uniforms.uMoss=moss;
    sh.vertexShader='attribute float aWater;\nattribute float aMoss;\nvarying float vWater;\nvarying float vMoss;\nvarying vec3 vWP5;\nvarying vec3 vWN5;\n'+sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w5=vec4(transformed,1.0); vec3 n5=objectNormal;
  #ifdef USE_INSTANCING
    w5=instanceMatrix*w5; n5=mat3(instanceMatrix)*n5;
  #endif
    vWP5=(modelMatrix*w5).xyz; vWN5=normalize(mat3(modelMatrix)*n5); vWater=aWater; vMoss=aMoss; }`);
    sh.fragmentShader='varying float vWater;\nvarying float vMoss;\nvarying vec3 vWP5;\nvarying vec3 vWN5;\nuniform vec3 uMoss;\n'+NOISE+'\n'+sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float wet=1.0-smoothstep(vWater, vWater+0.12, vWP5.y), mt=smoothstep(0.35,0.8,vWN5.y)*smoothstep(0.35,0.6,vn(vWP5.xz*3.0+vWP5.y))*(1.0-wet);
  mt=max(mt, vMoss);   // NIGHT-6 slice 5: a moss cushion is moss all over, finer and patchier
  vec3 mc=uMoss*(0.7+0.6*vn(vWP5.xz*20.0))*mix(1.0, (0.65+0.6*vn(vWP5.xz*5.0+vWP5.y*3.0))*(0.75+0.5*vn(vWP5.xz*55.0+vWP5.y*40.0))*0.42, vMoss);   // darker: night moss
  diffuseColor.rgb=mix(diffuseColor.rgb*(0.7+0.5*vn(vWP5.xy*6.0+vWP5.z)), mc, mt); diffuseColor.rgb*=mix(1.0, 0.45, wet);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor=mix(mix(roughnessFactor, 0.32, wet), 1.0, vMoss);'); };
  rockM.customProgramCacheKey=()=>'handsong.streamRock2'; own.push(rockM);   // 2: + aMoss (the moss cushions share it)
  const stones=(list, geo)=>{ const m=new T.InstancedMesh(geo, rockM, Math.max(1, list.length)), w=new Float32Array(Math.max(1, list.length));
    list.forEach((r,i)=>{ d.position.set(r.x, r.y, r.z); d.rotation.set((R()-0.5)*0.3, r.rot, (R()-0.5)*0.3); d.scale.set(r.s*1.3, r.s*0.72, r.s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); w[i]=r.water; });
    geo.setAttribute('aWater', new T.InstancedBufferAttribute(w, 1)); geo.setAttribute('aMoss', new T.InstancedBufferAttribute(new Float32Array(w.length), 1)); m.count=list.length; m.castShadow=m.receiveShadow=true; m.frustumCulled=false; own.push(geo); if(list.length) s.add(m); return m; };
  const rocks=streamRocks(Math.max(0, lv.rocks|0)), pebbles=streamPebbles(Math.max(0, lv.pebbles|0));
  const rockMesh=stones(rocks, rockGeo(T, 2, 7)), pebMesh=stones(pebbles, rockGeo(T, 1, 11)); pebMesh.castShadow=false;
  /* the drifting leaves (the floor's material: its cells, its soft edges) */
  const fl=floatersInit(Math.max(0, lv.floaters|0)), fg=new T.PlaneGeometry(1, 1); fg.rotateX(-Math.PI/2);
  const cells=new Float32Array(Math.max(1, fl.length)*4); fl.forEach((f,i)=>cells.set(cellUv('leaf'+(i%4)), i*4)); fg.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 4)); own.push(fg);
  const floaters=new T.InstancedMesh(fg, floorMat || new T.MeshBasicMaterial({ visible:false }), Math.max(1, fl.length)), W=FLOOR_ATLAS.world.leaf, c=new T.Color();
  fl.forEach((f,i)=>{ floaters.setColorAt(i, c.setScalar(0.75+R()*0.35)); }); floaters.count=fl.length; floaters.frustumCulled=false; floaters.renderOrder=-0.5; if(floorMat && fl.length) s.add(floaters);
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
    if(fl.length) floaters.instanceMatrix.needsUpdate=true;
    const U=mm.uniforms; U.uNow.value=t; U.uO.value=(0.7+0.3*Math.sin(t*0.09))*(0.6+0.6*(F.mist||0))*(F.deepMist||1); U.uCol.value.copy(pal.haze).multiplyScalar(0.55+0.45*(F.moonK==null ? 1 : F.moonK));
  }
  const state=()=>({ rocks:rocks.length, wetRocks:rocks.filter(r=>r.wet).length, pebbles:pebbles.length, floaters:pos.map(p=>({ x:p.x, z:p.z, u:p.u })), mistStrips:ms.length, mistO:mm.uniforms.uO.value });
  return { update, state, parts:{ rocks:rockMesh, pebbles:pebMesh, floaters, mist, rockMat:rockM } };   // parts: probes; rockMat: the moss cushions share it
}
