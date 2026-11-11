/* NIGHT-6 slice 8 — THE PAINTED DISTANCE AND THE FILM (the night forest room's picture pass; forest.js builds it; the numbers are ./pure/paint.js).
   Each frame, when the level paints:
   1. the scene WITHOUT its glowing things (layer 0) is drawn into a picture with its depth;
   2. that picture is put on the screen through ONE pass: far pixels repainted in round brush strokes growing with depth (a generalised
      Kuwahara filter, written out tap by tap from strokeTaps), near pixels sharp with their hard edges softened a touch, a slight cool grade
      in the shadows, the vignette, the grain (high);
   3. the GLOWING THINGS (layer 1: every sprite and point cloud — the light and its trail, the fireflies, the moths, the leaves, the dew, the
      mushrooms' glow, the stars, the moon and its clouds) are drawn on top, each fragment hidden behind the picture's depth by hand (they
      stay crisp: strokes never smear a firefly).
   Without painting (the level, or no WebGL2) the room draws in one pass as before: every layer, the glowing things' depth test off. */
import { PAINT, strokeTaps } from './pure/paint.js';

const f=v=>Number(v).toFixed(5);
/* the glowing things' own depth test against the picture (uUseDepth 0: off, as before) */
const DZ=`uniform sampler2D tDepth7; uniform vec2 uRes7; uniform float uNear7, uFar7, uUseDepth7;
float dzView7(float d){ return (uNear7*uFar7)/((uFar7-uNear7)*d-uFar7); }`;
function depthAware(mat, PU){ if(mat.userData.depthAware) return; mat.userData.depthAware=true; const prev=mat.onBeforeCompile, k=mat.customProgramCacheKey ? mat.customProgramCacheKey.call(mat) : '';
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r); Object.assign(sh.uniforms, PU);
    sh.fragmentShader=sh.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*\{/, m=>DZ+'\n'+m+`
  if(uUseDepth7>0.5){ float sd7=texture2D(tDepth7, gl_FragCoord.xy/uRes7).x; if(sd7<1.0 && dzView7(gl_FragCoord.z)<dzView7(sd7)-0.03) discard; }`); };
  mat.customProgramCacheKey=()=>k+'.dz7'; }
/* the picture pass, written out for strokes up to R pixels */
function compShader(R){
  const taps=strokeTaps(R), NS=PAINT.sectors, lines=[];
  for(const t of taps){ const sw=t.w.map(([k,w])=>`m${k}+=c*(g*${f(w)}); q${k}+=cc*(g*${f(w)}); w${k}+=g*${f(w)};`).join(' ');
    lines.push(t.d2===0 ? `{ vec3 c=c0, cc=c*c; float g=1.0; ${sw} }` : `{ float g=step(${f(t.d2)}, R2)*exp(-${f(t.d2)}*iR2); if(g>0.0){ vec3 c=texture2D(tD, vUv+vec2(${f(t.i)}, ${f(t.j)})*px).rgb, cc=c*c; ${sw} } }`); }
  const decl=Array.from({ length:NS }, (_,k)=>`vec3 m${k}=vec3(0.0), q${k}=vec3(0.0); float w${k}=0.0;`).join(' ');
  const fin=Array.from({ length:NS }, (_,k)=>`{ vec3 mu=m${k}/max(w${k},1e-5), v=abs(q${k}/max(w${k},1e-5)-mu*mu); float s=sqrt(v.r+v.g+v.b)*${f(PAINT.sharp)}; float wk=1.0/(1.0+pow(s, ${f(PAINT.power)})); acc+=mu*wk; tw+=wk; }`).join('\n    ');
  const V=PAINT.vignette;
  return `uniform sampler2D tD, tDepth; uniform vec2 uRes; uniform float uR, uNear, uFar, uSoft, uVig, uGrain, uGrade, uNow; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float h7(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }   // a hash without lines across the picture
void main(){ vec2 px=1.0/uRes; vec3 c0=texture2D(tD, vUv).rgb, col=c0; float d=texture2D(tDepth, vUv).x;
  float dist=(uNear*uFar)/(uFar-d*(uFar-uNear)), r=uR*smoothstep(${f(PAINT.near)}, ${f(PAINT.far)}, dist);
  if(r<0.7){ if(uSoft>0.5){ vec3 n1=texture2D(tD, vUv+vec2(px.x,0.0)).rgb, n2=texture2D(tD, vUv-vec2(px.x,0.0)).rgb, n3=texture2D(tD, vUv+vec2(0.0,px.y)).rgb, n4=texture2D(tD, vUv-vec2(0.0,px.y)).rgb;
      float l0=lum(c0), lo=min(l0, min(min(lum(n1),lum(n2)), min(lum(n3),lum(n4)))), hi=max(l0, max(max(lum(n1),lum(n2)), max(lum(n3),lum(n4))));
      col=mix(c0, (n1+n2+n3+n4+c0*2.0)/6.0, smoothstep(0.04, 0.2, hi-lo)*0.5); } }
  else { float R2=r*r+0.5, iR2=${f(PAINT.gauss)}/R2; ${decl}
    ${lines.join('\n    ')}
    vec3 acc=vec3(0.0); float tw=0.0;
    ${fin}
    col=acc/tw; }
  if(uGrade>0.5){ float l=lum(col); col+=vec3(-0.004, 0.004, 0.012)*(1.0-smoothstep(0.0, 0.3, l)); col=mix(vec3(l), col, 1.08); col=mix(col, col*col*(3.0-2.0*col), 0.1); }
  if(uVig>0.5){ float e=length((vUv-vec2(${f(V.cx)}, ${f(1-V.cy)}))/vec2(${f(V.rx)}, ${f(V.ry)})); col*=1.0-${f(V.k)}*smoothstep(${f(V.from)}, 1.0, e); }
  if(uGrain>0.5){ float n=h7(floor(gl_FragCoord.xy)+floor(uNow*${f(PAINT.grain.rate)})*vec2(17.0, 59.0)); vec3 o=mix(2.0*col*n, 1.0-2.0*(1.0-col)*(1.0-n), step(0.5, col)); col=mix(col, o, ${f(PAINT.grain.amp)}); }
  gl_FragColor=vec4(clamp(col, 0.0, 1.0), 1.0); }`; }
const QV=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy, 0.0, 1.0); }`;

/* ctx: { T, scene, camera, lv (paint, paintR, grain, vignette), gl2, own } → { render(renderer), state(), set(opts) — probes } */
export function buildPaint(ctx){
  const { T, scene, camera, lv, own }=ctx, R=Math.max(0, +lv.paintR||0), on=!!lv.paint && ctx.gl2!==false && R>0;
  const PU={ tDepth7:{ value:null }, uRes7:{ value:new T.Vector2(1, 1) }, uNear7:{ value:camera.near }, uFar7:{ value:camera.far }, uUseDepth7:{ value:0 } };
  /* the lights see both passes: three keys every program by the light count, so a glow pass without them would compile a second copy of
     every glowing material (measured: +9 programs) */
  let glow=0; scene.traverse(o=>{ if(o.isLight) o.layers.enable(1); if(o.isSprite || o.isPoints){ o.layers.set(1); glow++; const ms=Array.isArray(o.material) ? o.material : [o.material]; for(const m of ms) if(m && m.depthTest!==false) depthAware(m, PU); } });
  camera.layers.enableAll();
  const comp= on ? new T.ShaderMaterial({ uniforms:{ tD:{ value:null }, tDepth:{ value:null }, uRes:{ value:new T.Vector2(1, 1) }, uR:{ value:R }, uNear:{ value:camera.near }, uFar:{ value:camera.far },
      uSoft:{ value:1 }, uVig:{ value: lv.vignette ? 1 : 0 }, uGrain:{ value: lv.grain ? 1 : 0 }, uGrade:{ value:1 }, uNow:{ value:0 } }, vertexShader:QV, fragmentShader:compShader(R), depthTest:false, depthWrite:false, toneMapped:false }) : null;
  const quadS=new T.Scene(), quadC=new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), qg=new T.PlaneGeometry(2, 2), quad=new T.Mesh(qg, comp || new T.MeshBasicMaterial()); quad.frustumCulled=false; quadS.add(quad);
  if(comp) own.push(comp); own.push(qg);
  let rt=null, frames=0, rebuilt=0, direct=false; const size=new T.Vector2(); own.push({ dispose:()=>{ if(rt){ rt.depthTexture.dispose(); rt.dispose(); } } });
  function ensure(r){ r.getDrawingBufferSize(size); if(rt && rt.width===size.x && rt.height===size.y) return;
    if(rt){ rt.depthTexture.dispose(); rt.dispose(); }
    rt=new T.WebGLRenderTarget(size.x, size.y, { depthBuffer:true, encoding:T.sRGBEncoding }); rt.depthTexture=new T.DepthTexture(size.x, size.y); rt.depthTexture.type=T.UnsignedIntType; rebuilt++;
    comp.uniforms.uRes.value.set(size.x, size.y); PU.uRes7.value.set(size.x, size.y); }
  /* one frame on the screen */
  function render(r, t=0){
    if(!on || direct){ PU.uUseDepth7.value=0; camera.layers.enableAll(); r.render(scene, camera); return; }
    ensure(r); frames++;
    camera.layers.set(0); r.setRenderTarget(rt); r.render(scene, camera); r.setRenderTarget(null);
    const U=comp.uniforms; U.tD.value=rt.texture; U.tDepth.value=rt.depthTexture; U.uNear.value=camera.near; U.uFar.value=camera.far; U.uNow.value=t; r.render(quadS, quadC);
    PU.tDepth7.value=rt.depthTexture; PU.uNear7.value=camera.near; PU.uFar7.value=camera.far; PU.uUseDepth7.value=1;
    camera.layers.set(1); const ac=r.autoClear, bg=scene.background, su=r.shadowMap.autoUpdate; r.autoClear=false; scene.background=null; r.shadowMap.autoUpdate=false;   // the shadow map was drawn in the first pass
    try{ r.render(scene, camera); } finally { r.autoClear=ac; scene.background=bg; r.shadowMap.autoUpdate=su; camera.layers.enableAll(); } }
  /* probes: the pass's switches (uR, uSoft, uVig, uGrain, uGrade; direct: draw in one pass as without painting) → the previous values */
  function set(o){ if(!comp) return null; const U=comp.uniforms, was={}; for(const [k,v] of Object.entries(o||{})){ if(k==='direct'){ was.direct=direct; direct=!!v; } else if(U[k]){ was[k]=U[k].value; U[k].value=v; } } return was; }
  const state=()=>({ on, R, glow, taps: on ? strokeTaps(R).length : 0, frames, rebuilt, vignette:!!(comp && comp.uniforms.uVig.value), grain:!!(comp && comp.uniforms.uGrain.value), size:rt ? [rt.width, rt.height] : null });
  /* NIGHT-9: the glowing things' own depth test off (another pass draws — the water's mirror — whose depth is not the picture's) */
  const glowDepthOff=()=>{ PU.uUseDepth7.value=0; };
  return { render, state, set, glowDepthOff };
}
