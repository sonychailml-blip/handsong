/* NIGHT-8 — THE BARE GROUND'S LARGE SCALE (a part of the night forest room; forest.js applies it to the ground's material, after the ground
   waves and the wet banks). The prepared macro map (tools/forest-bake.mjs groundm-*, from ./pure/ground.js macroAt) gives per place: DAMP dark
   soil (darker, cooler, a little glossier), MOSS (its colour, the relief softened), leaf DRIFTS (the litter warmer, its relief stronger), and SEL —
   how much of the ground's texture comes from a second copy turned a quarter and scaled by 0.71, so the 6-m tile never repeats visibly (both its
   colour and its normals; the turned normals turned back). One more texture read for the map and two for the copies, in the ground's own program
   (its key gains «.macro»); no extra draw. */
import { MACRO } from './pure/ground.js';

const f=v=>Number(v).toFixed(4);
const MAP=`gMac=texture2D(uGM, (vWPos.xz-vec2(${f(MACRO.x0)},${f(MACRO.z0)}))/${f(MACRO.size)}); gUv2=vec2(-vUv.y, vUv.x)*0.71+vec2(0.37,0.61);
#ifdef USE_MAP
  { vec4 texelColor=mix(texture2D(map, vUv), texture2D(map, gUv2), gMac.a); texelColor=mapTexelToLinear(texelColor);
    vec3 gc=texelColor.rgb; float gl=dot(gc, vec3(0.3,0.59,0.11));
    gc*=mix(1.0, 0.38, gMac.r); gc*=mix(vec3(1.0), vec3(0.84,0.92,1.0), gMac.r*0.7);   // damp soil: darker, cooler
    gc=mix(gc, gc*vec3(1.9,1.35,0.8), gMac.b*0.7);   // a drift of fallen leaves and needles: warmer, livelier
    gc=mix(gc, uGMoss*(0.045+gl*1.6), gMac.g*0.9);   // moss (the token's hue at the litter's own darkness: the output is sRGB)
    diffuseColor.rgb*=gc; diffuseColor.a*=texelColor.a; }
#endif`;
/* T: three.js (its chunk text); mat: the ground's material (already patched); tex: the macro map; C: the palette */
export function patchGroundMacro(T, mat, tex, C){
  const prev=mat.onBeforeCompile, k=mat.customProgramCacheKey.call(mat), U={ uGM:{ value:tex }, uGMoss:{ value:new T.Color(C('forest-moss')) } };
  const NORMAL=T.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
    'vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0; { vec3 b2=texture2D( normalMap, gUv2 ).xyz*2.0-1.0; mapN=mix(mapN, vec3(b2.y, -b2.x, b2.z), gMac.a); mapN.xy*=(1.0-0.55*gMac.g)*(1.0+0.6*gMac.b)*(1.0-0.3*gMac.r); }');
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r); Object.assign(sh.uniforms, U);
    sh.fragmentShader='uniform sampler2D uGM;\nuniform vec3 uGMoss;\nvec4 gMac;\nvec2 gUv2;\n'+sh.fragmentShader.replace('#include <map_fragment>', MAP).replace('#include <normal_fragment_maps>', NORMAL)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor=mix(mix(roughnessFactor, 0.42, gMac.r*0.85), 1.0, gMac.g*0.8);   // damp soil glistens in the light, moss is matte'); };
  mat.customProgramCacheKey=()=>k+'.macro';
  return U;
}
