/* NIGHT-6 slice 9 — HIDDEN THINGS THE LIGHT FINDS (a part of the night forest room; forest.js builds it; the numbers are ./pure/hidden.js).
   Picture only.
   - FOXFIRE: each frame the playing light's trail goes to the wood's and the bark's shaders (forest-wood.js: uFox, uFoxT) — the veins glow
     where the light has been and fade after 8–12 s.
   - NIGHT FLOWERS: tiny closed buds among the herbs; when the light finds one its petals fold open (their own small shader: one instanced
     draw) and a soft glow lights in it (the mushrooms' glow points — the same shader program); 20 s later they close again.
   Colours: tokens (--cv-forest-foxfire, -bud, -nightbloom). */
import { FOX, FLOWERS, foxTrail, foxTrailStep, flowerPlaces, flowerStep } from './pure/hidden.js';

/* the foxfire's uniforms for the wood's and the bark's shaders (n trail points; 0 = none) */
export function foxUniforms(T, C, n){ if(!(n>0)) return {}; return { uFox:{ value:Array.from({ length:n }, ()=>new T.Vector4(0, 0, 0, -1)) }, uFoxCol:{ value:new T.Color(C('forest-foxfire')) },
  uFoxK:{ value:1 }, uFoxT:{ value:0 }, foxLaw:FOX }; }
const PV=`attribute vec3 aPet; attribute float aOpen; uniform float uLen, uWid; varying float vOpen, vAlong;
#include <fog_pars_vertex>
void main(){ float a=aPet.x, tilt=mix(0.12, 1.25, aOpen), L=uLen*aPet.z; vec3 dir=vec3(cos(a)*sin(tilt), cos(tilt), sin(a)*sin(tilt)), side=vec3(-sin(a), 0.0, cos(a));
  vec3 p=dir*L+side*(uWid*aPet.y*sin(3.1416*clamp(aPet.z, 0.0, 1.0))*mix(0.55, 1.0, aOpen))+vec3(0.0, 0.03, 0.0);
  vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(p, 1.0); gl_Position=projectionMatrix*mvPosition; vOpen=aOpen; vAlong=aPet.z;
  #include <fog_vertex>
}`;
const PF=`uniform vec3 uBud, uBloom; varying float vOpen, vAlong;
#include <fog_pars_fragment>
void main(){ vec3 c=mix(uBud, uBloom*(0.45+0.4*vAlong)*(1.0+0.35*vOpen), smoothstep(0.05, 0.6, vOpen)); gl_FragColor=vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
}`;
/* six petals, each a strip from the centre (aPet: angle, across −1…1, along 0…1) */
function petalGeo(T){ const pos=[], pet=[], idx=[]; let n=0;
  for(let k=0;k<6;k++){ const a=k/6*2*Math.PI; for(let j=0;j<=4;j++) for(const u of [-1, 1]){ pos.push(0, 0, 0); pet.push(a, u, j/4); n++; }
    const b=n-10; for(let j=0;j<4;j++){ const q=b+j*2; idx.push(q, q+1, q+2, q+1, q+3, q+2); } }
  const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aPet', new T.Float32BufferAttribute(pet, 3)); g.setIndex(idx); return g; }
/* ctx: { T, s, C, own, lv (foxfire, flowers), FU (foxUniforms), herbs (the floor's places), glowMat (the mushrooms' glow points' material) }
   → { update(dt, t, light, lit, dim), state(), parts } */
export function buildHidden(ctx){
  const { T, s, C, own, lv, FU }=ctx, n=Math.max(0, lv.foxfire|0), tr=foxTrail(n);
  const fl=flowerPlaces(Math.max(0, lv.flowers|0), ctx.herbs||[]).map(f=>({ ...f, open:0, seen:null })), m=fl.length;
  const pg=petalGeo(T), open=new Float32Array(Math.max(1,m)); pg.setAttribute('aOpen', new T.InstancedBufferAttribute(open, 1)); own.push(pg);
  const pm=new T.ShaderMaterial({ uniforms:T.UniformsUtils.merge([T.UniformsLib.fog, { uLen:{ value:0.075 }, uWid:{ value:0.016 }, uBud:{ value:new T.Color(C('forest-bud')) }, uBloom:{ value:new T.Color(C('forest-nightbloom')) } }]),
    vertexShader:PV, fragmentShader:PF, fog:true, side:T.DoubleSide }); own.push(pm);
  const petals=new T.InstancedMesh(pg, pm, Math.max(1, m)), d=new T.Object3D();
  fl.forEach((f,i)=>{ d.position.set(f.x, f.y, f.z); d.rotation.set(0, f.rot, 0); d.scale.setScalar(f.s); d.updateMatrix(); petals.setMatrixAt(i, d.matrix); });
  petals.count=m; petals.frustumCulled=false; if(m) s.add(petals);
  /* their glow: points in the flowers' hearts (the mushrooms' glow shader: aGlow, aCol) */
  const gg=new T.BufferGeometry(), gp=new Float32Array(Math.max(1,m)*3), ga=new Float32Array(Math.max(1,m)), gc=new Float32Array(Math.max(1,m)*3), bc=new T.Color(C('forest-nightbloom'));
  fl.forEach((f,i)=>{ gp.set([f.x, f.y+0.06*f.s, f.z], i*3); gc.set([bc.r, bc.g, bc.b], i*3); });
  gg.setAttribute('position', new T.BufferAttribute(gp, 3)); gg.setAttribute('aGlow', new T.BufferAttribute(ga, 1)); gg.setAttribute('aCol', new T.BufferAttribute(gc, 3)); gg.setDrawRange(0, m); own.push(gg);
  const glow=ctx.glowMat ? new T.Points(gg, ctx.glowMat) : null; if(glow){ glow.frustumCulled=false; if(m) s.add(glow); }
  /* one frame: light = the playing light's world position (or null), lit 0…1, dim (the sleep's dimming) */
  function update(dt, t, light, lit, dim=1){
    const L= light && lit>0.3 ? [light.x, light.y, light.z] : null; foxTrailStep(tr, t, L);
    if(n){ tr.pts.forEach((p,i)=>FU.uFox.value[i].set(p.x, p.y, p.z, p.t)); FU.uFoxT.value=t; FU.uFoxK.value=dim; }
    /* the glow uses the mushrooms' size: kept faint, a soft light in the flower's heart */
    for(let i=0;i<m;i++){ const f=fl[i]; flowerStep(f, dt, t, L); open[i]=f.open; ga[i]=f.open*0.28*dim; }
    if(m){ pg.attributes.aOpen.needsUpdate=true; gg.attributes.aGlow.needsUpdate=true; } }
  const state=()=>({ trail:tr.pts.filter(p=>p.t>=0).length, of:n, flowers:m, open:fl.map(f=>+f.open.toFixed(4)), places:fl.map(f=>({ x:f.x, z:f.z, by:f.by })) });
  return { update, state, parts:{ petals, glow, material:pm }, flowers:fl };   // parts, flowers: probes only
}
