/* SPEED-1 step 2 — DARK POINT LIGHTS SKIPPED (the host applies it to every room at its opening; `?speedoff` leaves it out).
   three.js r128 lights every lit fragment by every point light, even one that gives it nothing: a light that is out (intensity 0) or a
   fragment beyond its reach (`distance`) is computed to an exact zero colour, and the full lighting (the specular term, the cube shadow) still
   runs on it. Each lit material's point-light loop gains one test — three's own `directLight.visible` (its colour ≠ 0) — so those fragments
   skip the work that would have added exactly zero: the same pixels, byte for byte (P.night «PERF invisible», the live A/B through SKIP). */
export const SKIP={ value:1 };   // 1: the skip on; 0: the loop as before, through the same program (the probe's A/B)
export const lightSkipDbg=v=>{ if(v!=null) SKIP.value= v ? 1 : 0; return SKIP.value; };
const memo=new WeakMap();
const PT_GET='getPointDirectLightIrradiance( pointLight, geometry, directLight )'+String.fromCharCode(59);   // three r128's text (59: the statement's end)
const PT_RE='RE_Direct( directLight, geometry, material, reflectedLight )'+String.fromCharCode(59);
/* the point lights' part of lights_fragment_begin with the test around each light's work → the chunk, or null if its text is not the expected one */
function patched(T){ if(memo.has(T)) return memo.get(T);
  const ch=T.ShaderChunk.lights_fragment_begin||'', cut=ch.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )'), head=cut>0 ? ch.slice(0, cut) : '';
  const A=PT_GET, B=PT_RE;
  const once=(s, x)=>s.indexOf(x)>=0 && s.indexOf(x)===s.lastIndexOf(x);
  const out= once(head, A) && once(head, B) && head.indexOf(A)<head.indexOf(B)
    ? head.replace(A, A+'\n\t\tif( directLight.visible || uLightSkip7 < 0.5 ) {').replace(B, B+' }')+ch.slice(cut) : null;
  memo.set(T, out); return out; }
const lit=m=>!!m && (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial);
/* every lit material of the scene → how many were patched now. userData.lightSkip: 'patched' → 'compiled' (the test is in its program) or
   'missing' (its shader had no lights_fragment_begin to replace: it draws as before) */
export function skipDarkLights(T, scene){
  const chunk=patched(T); if(!chunk) return 0;
  let n=0; scene.traverse(o=>{ if(!o.material) return; for(const m of (Array.isArray(o.material) ? o.material : [o.material])){ if(!lit(m) || m.userData.lightSkip) continue;
    const prev=m.onBeforeCompile, k=m.customProgramCacheKey.call(m);   // the key first: r128's default key is the hook's own text
    m.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(m, sh, r);
      if(sh.fragmentShader.indexOf('#include <lights_fragment_begin>')<0){ m.userData.lightSkip='missing'; return; }
      sh.uniforms.uLightSkip7=SKIP; sh.fragmentShader='uniform float uLightSkip7;\n'+sh.fragmentShader.replace('#include <lights_fragment_begin>', chunk); m.userData.lightSkip='compiled'; };
    m.customProgramCacheKey=()=>k+'.ls7'; m.userData.lightSkip='patched'; n++; } });
  return n; }
/* probes: the scene's lit materials by their state */
export function lightSkipInfo(scene){ const c={ lit:0, patched:0, compiled:0, missing:0, none:0 }, seen=new Set();
  scene.traverse(o=>{ if(!o.material) return; for(const m of (Array.isArray(o.material) ? o.material : [o.material])){ if(!lit(m) || seen.has(m)) continue; seen.add(m); c.lit++; c[m.userData.lightSkip||'none']++; } });
  return c; }
