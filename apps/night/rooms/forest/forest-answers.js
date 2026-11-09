/* NIGHT-6 slice 1 — THE FOREST ANSWERS (parts of the night forest room; forest.js builds them; the numbers are ./pure/answers.js):
   - DEW: points on the low leaves in view, one draw; each twinkles on its own and shines near the playing light in the light's colour (a note
     makes it glint); now and then one catches the moon. The shader mirrors dewLight.
   - WEBS: a few webs beside the near trunks, off the aisle, one instanced draw; dark until a light comes near, then they catch it (the playing
     light, the effects hand's dimmer one) and glint on a note; a faint moon sheen always. Their texture is a FILE (tex/web.png, drawn by
     tools/forest-bake.mjs — the user's rule: what never changes is prepared ahead), handed in by forest.js; without it they stay dark.
   Colours: the room's light, the effects light, the mood's moon (no new token). Counts per level: the record's levels (dew, webs). */
import { ANSWERS, dewPlaces, webPlaces, webLight } from './pure/answers.js';

const f=v=>Number(v).toFixed(4), A=ANSWERS.dew;
const DV=`uniform vec3 uL;uniform float uOn,uGlint,uNow,uScale,uMoonK,uFog;attribute float aSeed;varying float vA,vM;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float z=max(0.1,-mv.z);
  float tw=pow(max(0.0,sin(uNow*(2.0+aSeed*3.0)+aSeed*40.0)),6.0); vec3 dl=position-uL;
  float L=exp(-dot(dl,dl)/${f(A.reach)})*uOn*(1.0+${f(A.glint)}*uGlint)*(${f(A.base)}+${f(1-A.base)}*tw);
  float fog=exp(-z*uFog); vA=L*fog; vM=0.5*pow(max(0.0,sin(uNow*0.7+aSeed*90.0)),40.0)*uMoonK*fog;
  gl_PointSize=clamp(${f(A.size)}*uScale/z,1.0,4.0); }`;
const DF=`uniform vec3 uLCol,uMCol;varying float vA,vM;void main(){ vec2 c=gl_PointCoord-0.5; float r2=dot(c,c)*4.0; if(r2>1.0) discard; gl_FragColor=vec4((uLCol*vA+uMCol*vM)*(1.0-r2)*1.2,1.0); }`;

/* ctx: { T, s, own, lv ({ dew, webs }), trunks ([[x, z, r]]), webTex (a T.Texture or null), cam (the camera's rest place) }
   → { update(dt, t, F), glint(vel), resize(scale), state() } */
export function buildAnswers(ctx){
  const { T, s, own, lv, trunks, webTex, cam }=ctx, nDew=Math.max(0, lv.dew|0), nWeb=Math.max(0, lv.webs|0);
  let glint=0;
  /* dew */
  const D=dewPlaces(nDew), dg=new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(D.pos.subarray(0, D.n*3), 3)); dg.setAttribute('aSeed', new T.BufferAttribute(D.seed.subarray(0, D.n), 1));
  const dm=new T.ShaderMaterial({ uniforms:{ uL:{ value:new T.Vector3(0,-50,0) }, uOn:{ value:0 }, uGlint:{ value:0 }, uNow:{ value:0 }, uScale:{ value:500 }, uMoonK:{ value:1 }, uFog:{ value:0.035 },
    uLCol:{ value:new T.Color() }, uMCol:{ value:new T.Color() } }, vertexShader:DV, fragmentShader:DF, transparent:true, depthWrite:false, blending:T.AdditiveBlending });
  const dew=new T.Points(dg, dm); dew.frustumCulled=false; if(D.n) s.add(dew); own.push(dg, dm);   // none: not in the scene (compile() walks every object — the «before NIGHT-6» measurement compiles nothing of it)
  /* webs */
  const W=webPlaces(nWeb, trunks), wg=new T.PlaneGeometry(1,1); own.push(wg);
  const wm=new T.MeshBasicMaterial({ map:webTex||null, color:0xffffff, transparent:true, depthWrite:false, blending:T.AdditiveBlending, side:T.DoubleSide, fog:false }); own.push(wm);
  const webs=new T.InstancedMesh(wg, wm, Math.max(1, W.length)), d=new T.Object3D(), camV=new T.Vector3(cam[0], cam[1], cam[2]), zero=new T.Color(0,0,0);
  W.forEach((w,i)=>{ d.position.set(w.x, w.y, w.z); d.lookAt(camV); d.rotateY(w.yaw); d.rotateZ(w.roll); d.scale.set(w.s, w.s, w.s); d.updateMatrix(); webs.setMatrixAt(i, d.matrix); webs.setColorAt(i, zero); });
  webs.count=W.length; webs.frustumCulled=false; if(W.length && webTex) s.add(webs);
  const bright=new Float32Array(W.length), c=new T.Color(), tmp=new T.Vector3();
  /* one frame. F: { light (V3), on, light1 (V3), on1, lightCol, fxCol, moonCol, moonK, dim (sleep), fogD } */
  function update(dt, t, F){
    glint*=Math.exp(-dt/0.35);
    const U=dm.uniforms; U.uNow.value=t; U.uL.value.copy(F.light); U.uOn.value=F.on*F.dim; U.uGlint.value=glint; U.uMoonK.value=F.moonK; U.uLCol.value.copy(F.lightCol); U.uMCol.value.copy(F.moonCol);
    W.forEach((w,i)=>{ tmp.set(w.x, w.y, w.z); const breath=0.85+0.15*Math.sin(t*1.3+w.ph), fog=Math.exp(-Math.pow(F.fogD*tmp.distanceTo(F.cam), 2));
      const l0=webLight(tmp.distanceTo(F.light), F.on, glint), l1=0.45*webLight(tmp.distanceTo(F.light1), F.on1, 0), base=ANSWERS.webs.base+0.03*F.moonK;
      bright[i]=(base+l0+l1)*breath*fog*F.dim;
      const M=F.moonCol, L=F.lightCol, X=F.fxCol, k=breath*fog*F.dim;   // the moon's sheen + the two lights' colours (r128's Color has no addScaledVector)
      c.setRGB((M.r*base+L.r*l0+X.r*l1)*k, (M.g*base+L.g*l0+X.g*l1)*k, (M.b*base+L.b*l0+X.b*l1)*k); webs.setColorAt(i, c); });
    if(webs.instanceColor) webs.instanceColor.needsUpdate=true;
  }
  const state=()=>({ dew:D.n, webs:W.map((w,i)=>({ x:w.x, y:w.y, z:w.z, s:w.s, b:bright[i] })), webTex:!!webTex, glint });
  return { update, glint:vel=>{ glint=Math.max(glint, Math.max(0.18, Math.min(1, vel==null?0.6:vel))); }, resize:scale=>{ dm.uniforms.uScale.value=scale; }, state, parts:{ dew, webs } };   // parts: probes only
}
