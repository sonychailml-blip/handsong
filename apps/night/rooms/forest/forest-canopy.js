/* NIGHT-6 slice 7 — THE CANOPY AND THE MOON'S WINDOW (a part of the night forest room; forest.js builds it; the numbers are ./pure/canopy.js):
   - CROWNS on the trees and the UNDERSTOREY (young trees, hazel-like shrubs, saplings): their limbs and stems as ONE merged geometry in the
     wood's material (forest-wood.js), their leaf sprays as ONE instanced draw in the plants' material over the crown sheet (tex/crown-*.png:
     the same shader program as the floor's plants — they sway in the wind; the gust stays low). No leaf in the moon's window or down the
     stream's far reach.
   - STARS in the gaps (points on the sky dome; trunks and leaves hide those behind them), twinkling, dimmed by the clouds and the mist.
   - DAPPLED MOONLIGHT on the ground: two drifting copies of the prepared dapple pattern (tex/dapple-*.png) add the moon's light in patches,
     dimmed by the clouds (patchDapple). The moon's face itself is a prepared file too (tex/moon-*.png; forest.js puts it on the disc).
   Colours: tokens (--cv-forest-star; the moon's colour for the dapple). */
import { canopyPlaces, crownCellUv } from './pure/canopy.js';
import { plantMaterial } from './forest-floor.js';
import { limbGeo } from './forest-wood.js';
import { seeded } from '../../../../core/pure/dsp.js';

const SV=`attribute vec2 aStar; uniform float uNow, uK, uScale; varying float vA;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float tw=0.6+0.4*sin(uNow*(1.1+aStar.y*0.37)+aStar.y*7.0);
  vA=uK*tw*min(1.0, 0.35+aStar.x*0.4); gl_PointSize=max(1.0, aStar.x*uScale); }`;
const SF=`uniform vec3 uCol; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float r=dot(c,c)*4.0; if(r>1.0) discard; gl_FragColor=vec4(uCol, vA*(1.0-r*r)); }`;
const MEMO=new Map();
/* ctx: { T, s, C, own, lv (crowns, crownShare, young, shrubs, saplings, stars), trunks, U (the sway uniforms), crownTex (or null), woodMat (the
   wood's material), soft } → { update(dt, t, F), resize(scale), state(), parts } */
export function buildCanopy(ctx){
  const { T, s, C, own, lv, trunks, U }=ctx, counts={ crowns:lv.crowns ? 1 : 0, crownShare:lv.crownShare==null ? 1 : lv.crownShare, young:lv.young|0, shrubs:lv.shrubs|0, saplings:lv.saplings|0, stars:lv.stars|0 };
  const key=JSON.stringify(counts); if(!MEMO.has(key)) MEMO.set(key, canopyPlaces(counts, trunks)); const P=MEMO.get(key), d=new T.Object3D(), c=new T.Color(), R=seeded(0x43414E31);
  /* limbs and stems: the wood's material, no shadow */
  const wg=limbGeo(T, P.limbs.concat(P.stems), [0, 0, 0.3]), wood= wg ? new T.Mesh(wg, ctx.woodMat) : null; if(wood){ own.push(wg); wood.receiveShadow=true; s.add(wood); }
  /* the leaf sprays */
  const n=P.sprays.length, mat=ctx.crownTex ? plantMaterial(T, ctx.crownTex, U, ctx.soft) : null; if(mat) mat.emissive=new T.Color(C('forest-leafglow'));   // a faint moonlit glow: the leaves against the sky never go black (a value, not a new program)
  const pg=new T.PlaneGeometry(1, 1), cells=new Float32Array(Math.max(1,n)*4);
  P.sprays.forEach((p,i)=>cells.set(crownCellUv(p.k), i*4)); pg.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 4)); own.push(pg); if(mat) own.push(mat);
  const leaves=new T.InstancedMesh(pg, mat || new T.MeshBasicMaterial({ visible:false }), Math.max(1, n));
  P.sprays.forEach((p,i)=>{ d.position.set(p.x, p.y, p.z); d.rotation.set(p.tilt, p.yaw, 0, 'YXZ'); d.scale.set(p.s, p.s, p.s); d.updateMatrix(); leaves.setMatrixAt(i, d.matrix);
    leaves.setColorAt(i, c.setScalar((p.of==='crown' ? 1.25 : 1.05)+R()*0.45)); });   // lighter than the floor's plants: seen from below against the sky
  leaves.count=n; leaves.frustumCulled=false; leaves.receiveShadow=true; if(ctx.soft) leaves.renderOrder=-0.5; if(mat && n) s.add(leaves);
  /* the stars */
  const ns=P.stars.length, sp=new Float32Array(Math.max(1,ns)*3), sa=new Float32Array(Math.max(1,ns)*2); P.stars.forEach((q,i)=>{ sp.set(q.slice(0,3), i*3); sa.set([q[3], q[4]], i*2); });
  const sg=new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('aStar', new T.BufferAttribute(sa, 2));
  const sm=new T.ShaderMaterial({ uniforms:{ uNow:{ value:0 }, uK:{ value:1 }, uScale:{ value:1 }, uCol:{ value:new T.Color(C('forest-star')) } }, vertexShader:SV, fragmentShader:SF, transparent:true, depthWrite:false, blending:T.AdditiveBlending });
  const stars=new T.Points(sg, sm); stars.frustumCulled=false; stars.renderOrder=-2; if(ns) s.add(stars); own.push(sg, sm);
  /* one frame. F: { cover (the clouds over the moon 0…1), mist (0…1), light (the sleep's dimming) } */
  function update(dt, t, F){ const u=sm.uniforms; u.uNow.value=t; u.uK.value=(1-0.85*(F.cover||0))*(1-0.55*(F.mist||0))*(F.light==null ? 1 : F.light); }
  function resize(scale){ sm.uniforms.uScale.value=Math.max(0.8, scale/420); }   // the points' scale (pixels at 1 m) → a star's pixels
  const by={}; for(const p of P.sprays) by[p.of]=(by[p.of]||0)+1;
  const state=()=>({ sprays:n, shown: mat ? n : 0, by, limbs:P.limbs.length, stems:P.stems.length, young:P.young.length, shrubs:P.shrubs.length, saplings:P.saplings.length, stars:ns, starK:sm.uniforms.uK.value });
  return { update, resize, state, places:P, parts:{ wood, leaves, stars, material:mat } };   // places, parts: probes only
}
/* the ground gains the DAPPLED MOONLIGHT: two drifting copies of the dapple pattern add uDapCol × the ground's colour × uDapK in patches —
   chained after the ground's other patches. U: { uDap (the texture), uDapK, uDapT (the drift's clock), uDapCol } */
export function patchDapple(mat, U){ const prev=mat.onBeforeCompile, k=mat.customProgramCacheKey.call(mat);
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r); Object.assign(sh.uniforms, U);
    sh.vertexShader='varying vec2 vDpXZ;\n'+sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDpXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    sh.fragmentShader='varying vec2 vDpXZ;\nuniform sampler2D uDap;\nuniform float uDapK, uDapT;\nuniform vec3 uDapCol;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float d1=texture2D(uDap, vDpXZ*0.09+vec2(uDapT*0.011, uDapT*0.004)).r, d2=texture2D(uDap, vDpXZ*0.053+vec2(0.37-uDapT*0.006, 0.21+uDapT*0.009)).r;
    totalEmissiveRadiance+=uDapCol*diffuseColor.rgb*(uDapK*d1*(0.35+0.65*d2)); }`); };
  mat.customProgramCacheKey=()=>k+'.dapple'; return mat; }
