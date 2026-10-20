/* RUN 9 (slice 3) — THE FOREST'S DETAIL. Parts of the night forest room (forest.js builds them); everything that moves on its own moves in a
   shader where it can (grass and ferns sway, leaves fall), the CPU only steers a few moths and the moonbeams' angle.
   - GRASS: many blades in ONE instanced draw; they sway with the WIND — the ambience's wind (its level and the gust of its own 0.06-Hz sweep,
     from the bus «calmNight») — and Wave makes them shimmer like the ferns (the shared uniforms of forest-life.js);
   - FALLING LEAVES: points falling slowly and turning, each on its own loop (shader-only), drifting with the wind, lit near the playing light;
   - MOTHS: a few pale moths flutter around the playing light; when it goes they drift up and fade;
   - MOONBEAMS: a few additive planes from the moon through the gaps (no volumetrics), their light following the moon's under the clouds;
   - FOREGROUND SILHOUETTES: dark fronds and a branch close to the camera at the screen's edges (placed from the camera's frustum on every
     resize — never over the middle of the screen), for depth; the camera's lean slides them against the forest.
   Colours: tokens (--cv-forest-grass*, -leaf, -moth, -sil); counts per quality level (forest.js FOREST_LEVELS). No sound, no song here. */
import { seeded } from '../../core/dsp.js';
import { forestGround } from '../../core/fireflies.js';
import { streamNear, STREAM } from '../../core/forestlife.js';
import { patchSway } from './forest-life.js';

export const DETAIL=Object.freeze({ seed:0x44455441, leafH:5.3, beamLen:17, beams:Object.freeze([[-2.6,-7.5,2.2],[1.9,-10.5,2.6],[-0.7,-15,3.2],[3.7,-5.6,1.8]]),
  sil:Object.freeze([ Object.freeze({ kind:'fern', nx:-0.86, ny:-0.82, d:1.7, h:0.5, flip:false }), Object.freeze({ kind:'fern', nx:0.9, ny:-0.86, d:2.0, h:0.42, flip:true }),
    Object.freeze({ kind:'branch', nx:0.78, ny:0.9, d:2.4, h:0.34, flip:false }) ]) });
/* the leaves' shader: each leaf falls on its own loop (uNow · speed + phase), sways and turns; seen as a small rotated ellipse */
const LV=`uniform float uNow,uWind,uScale,uSize,uH,uFog,uLightOn;uniform vec3 uLight;attribute vec4 aSeed;varying float vA,vRot,vLit;
void main(){ float fall=mod(uNow*aSeed.w+aSeed.z*uH,uH); vec3 p=vec3(aSeed.x+sin(uNow*0.9+aSeed.z*6.0)*0.45+uWind*fall*0.35, uH+0.2-fall, aSeed.y+cos(uNow*0.7+aSeed.z*4.0)*0.35);
  vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; float z=max(0.1,-mv.z);
  vA=smoothstep(0.0,0.7,fall)*smoothstep(uH,uH-0.9,fall)*exp(-z*uFog); vRot=uNow*(1.2+aSeed.z)+aSeed.z*9.0;
  vec3 dl=p-uLight; vLit=uLightOn/(1.0+dot(dl,dl)*0.6); gl_PointSize=max(1.0,uSize*uScale/z); }`;
const LF=`uniform vec3 uColor,uLitCol;varying float vA,vRot,vLit;
void main(){ vec2 c=gl_PointCoord-0.5; float s=sin(vRot), k=cos(vRot); c=vec2(c.x*k-c.y*s, c.x*s+c.y*k); float e=(c.x*c.x)/0.2+(c.y*c.y)/0.035; if(e>1.0) discard;
  gl_FragColor=vec4(uColor+uLitCol*vLit, vA*(1.0-e*0.4)); }`;
/* the moths' shader: a small pale body whose wings flicker */
const MV=`uniform float uNow,uScale,uSize;attribute float aPh,aA;varying float vA;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float z=max(0.1,-mv.z);
  vA=aA*(0.45+0.55*abs(sin(uNow*34.0+aPh))); gl_PointSize=max(1.0,uSize*uScale/z*(0.7+0.3*abs(sin(uNow*34.0+aPh)))); }`;
const MF=`uniform vec3 uColor;varying float vA;void main(){ vec2 c=gl_PointCoord-0.5; float r=dot(c,c)*4.0; if(r>1.0) discard; gl_FragColor=vec4(uColor, vA*(1.0-r)); }`;

/* ctx: { T, s, C, pal, own, canvas2, tex, lv ({ grass, leaves, moths, beams }), U (forest-life's shared uniforms), fernT (the fern texture),
   reduce } → { update(dt, t, F), resize(W, H, camera, uScale), state() } */
export function buildDetail(ctx){
  const { T, s, C, pal, own, canvas2, tex, lv, U, fernT }=ctx, R=seeded(DETAIL.seed), d=new T.Object3D();
  /* grass: one instanced draw */
  const gg=new T.BufferGeometry(), seg=[0,0.3,0.62,1], gp=[], gi=[];
  seg.forEach((h,i)=>{ const w=0.02*Math.pow(1-h,0.8)+0.001; gp.push(-w,h,0, w,h,0); if(i) gi.push(i*2-2,i*2-1,i*2, i*2-1,i*2+1,i*2); });
  gg.setAttribute('position', new T.BufferAttribute(new Float32Array(gp),3)); gg.setIndex(gi); gg.computeVertexNormals(); own.push(gg);
  const gm=new T.MeshLambertMaterial({ color:0xffffff, side:T.DoubleSide }); patchSway(gm, U, 2.2); own.push(gm);
  const grass=new T.InstancedMesh(gg, gm, Math.max(1, lv.grass)), G1=new T.Color(C('forest-grass')), G2=new T.Color(C('forest-grass-dry')), gc=new T.Color();
  let gn=0, guard=0;
  while(gn<lv.grass && guard++<lv.grass*20){ const cx=(R()*2-1)*9, cz=2.2-R()*18.2, k=8+Math.floor(R()*16);
    for(let j=0;j<k && gn<lv.grass;j++){ const x=cx+(R()-0.5)*1.4, z=cz+(R()-0.5)*1.4;
      if(streamNear(x,z).d<STREAM.half+0.08 || Math.hypot(x, z-5.5)<3.2) continue;
      const sc=0.16+R()*0.26; d.position.set(x, forestGround(x,z)-0.01, z); d.rotation.set((R()-0.5)*0.35, R()*6.283, (R()-0.5)*0.35); d.scale.set(1, sc, 1); d.updateMatrix(); grass.setMatrixAt(gn, d.matrix);
      gc.copy(G1).lerp(G2, R()*0.6).multiplyScalar(0.75+R()*0.5); grass.setColorAt(gn, gc); gn++; } }
  grass.count=gn; if(grass.instanceColor) grass.instanceColor.needsUpdate=true; s.add(grass);
  /* falling leaves */
  const nL=Math.max(1, lv.leaves), la=new Float32Array(nL*4); for(let i=0;i<nL;i++) la.set([(R()*2-1)*6, 2-R()*14, R(), 0.22+R()*0.2], i*4);
  const lg=new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(nL*3),3)); lg.setAttribute('aSeed', new T.BufferAttribute(la,4)); lg.setDrawRange(0, lv.leaves);
  const lm=new T.ShaderMaterial({ uniforms:{ uNow:U.uNow, uWind:{ value:0 }, uScale:{ value:500 }, uSize:{ value:0.11 }, uH:{ value:DETAIL.leafH }, uFog:{ value:0.035 }, uLightOn:{ value:0 },
    uLight:{ value:new T.Vector3() }, uColor:{ value:new T.Color(C('forest-leaf-fall')) }, uLitCol:{ value:new T.Color(C('forest-light')) } }, vertexShader:LV, fragmentShader:LF, transparent:true, depthWrite:false });
  const leaves=new T.Points(lg, lm); leaves.frustumCulled=false; s.add(leaves); own.push(lg, lm);
  /* moths */
  const nM=Math.max(1, lv.moths), mp=new Float32Array(nM*3), mph=new Float32Array(nM), ma=new Float32Array(nM), moths=[];
  for(let i=0;i<nM;i++){ const o={ p:new T.Vector3((R()*2-1)*3, 3+R()*2, -2-R()*6), ph:R()*6.283, a:[0.7+R()*0.9, 1.1+R()*1.3, 0.6+R()*0.8], r:0.35+R()*0.6, al:0 }; mph[i]=o.ph*5; moths.push(o); }
  const mg=new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp,3)); mg.setAttribute('aPh', new T.BufferAttribute(mph,1)); mg.setAttribute('aA', new T.BufferAttribute(ma,1)); mg.setDrawRange(0, lv.moths);
  const mm=new T.ShaderMaterial({ uniforms:{ uNow:U.uNow, uScale:{ value:500 }, uSize:{ value:0.07 }, uColor:{ value:new T.Color(C('forest-moth')) } }, vertexShader:MV, fragmentShader:MF, transparent:true, depthWrite:false });
  const mothPts=new T.Points(mg, mm); mothPts.frustumCulled=false; s.add(mothPts); own.push(mg, mm);
  /* moonbeams */
  const [bc,bx]=canvas2(64,256); { const gr=bx.createLinearGradient(0,0,0,256); gr.addColorStop(0,C('halo-a45')); gr.addColorStop(0.55,C('halo-a10')); gr.addColorStop(1,C('halo-a0')); bx.fillStyle=gr; bx.fillRect(0,0,64,256);
    bx.globalCompositeOperation='destination-in'; const gx=bx.createLinearGradient(0,0,64,0); gx.addColorStop(0,C('halo-a0')); gx.addColorStop(0.5,C('halo-a100')); gx.addColorStop(1,C('halo-a0')); bx.fillStyle=gx; bx.fillRect(0,0,64,256); }
  const beamT=tex(bc,true); beamT.wrapS=beamT.wrapT=T.ClampToEdgeWrapping;
  const bgeo=new T.PlaneGeometry(1, DETAIL.beamLen); bgeo.translate(0, -DETAIL.beamLen/2, 0); own.push(bgeo);   // the plane's top at its origin (the moon's side)
  const beams=DETAIL.beams.slice(0, lv.beams).map(([x,z,w],i)=>{ const m=new T.MeshBasicMaterial({ map:beamT, color:pal.moonhalo.clone(), transparent:true, opacity:0, depthWrite:false, blending:T.AdditiveBlending, fog:false, side:T.DoubleSide });
    own.push(m); const b=new T.Mesh(bgeo, m); b.userData={ x, z, w, ph:i*1.7 }; s.add(b); return b; });
  /* foreground silhouettes */
  const [sc2,sx]=canvas2(128,256); sx.strokeStyle=C('halo-a100'); sx.fillStyle=C('halo-a100'); sx.lineWidth=4; sx.beginPath(); sx.moveTo(10,10); sx.quadraticCurveTo(70,60,118,240); sx.stroke();
  for(let i=0;i<16;i++){ const t2=i/16, x=10+t2*100+Math.sin(t2*3)*8, y=10+t2*225; sx.save(); sx.translate(x,y); sx.rotate(-0.9+R()*0.4); sx.beginPath(); sx.ellipse(10,0,13,5,0,0,6.283); sx.fill(); sx.restore(); }
  const branchT=tex(sc2,true); branchT.wrapS=branchT.wrapT=T.ClampToEdgeWrapping;
  const silC=new T.Color(C('forest-sil')), sils=DETAIL.sil.map(o=>{ const m=new T.MeshBasicMaterial({ map:o.kind==='fern' ? fernT : branchT, color:silC, alphaTest:0.45, side:T.DoubleSide, fog:false });
    const g=new T.PlaneGeometry(o.kind==='fern' ? 0.36 : 0.5, 1); own.push(m, g); const p=new T.Mesh(g, m); p.userData=o; p.renderOrder=10; s.add(p); return p; });
  const tv=new T.Vector3(), up=new T.Vector3(), zz=new T.Vector3(), xx=new T.Vector3(), mx=new T.Matrix4(), ray=new T.Raycaster(), ndc=new T.Vector2(), fwd=new T.Vector3();
  /* the silhouettes' places on the camera's frustum at rest (resize only): anchor (nx, ny) in device coordinates, d units away, h of the view's height */
  function resize(W, H, camera, scale){
    lm.uniforms.uScale.value=mm.uniforms.uScale.value=scale;
    camera.getWorldDirection(fwd);
    for(const p of sils){ const o=p.userData; ndc.set(o.nx, o.ny); ray.setFromCamera(ndc, camera); const t=o.d/ray.ray.direction.dot(fwd);
      p.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t); const vh=2*o.d*Math.tan(camera.fov*Math.PI/360), h=vh*o.h*(W/H<0.8 ? 0.8 : 1);
      p.quaternion.copy(camera.quaternion); p.scale.set((o.flip?-1:1)*h, h, 1); p.rotateZ(o.kind==='branch' ? 2.4 : (o.flip ? 0.25 : -0.25)); }
  }
  /* one frame. F: { light (V3), lightOn, moon [x,y,z], moonK (moon light × sleep), mist (0…1 mean), wind (sway), cam (camera position) } */
  function update(dt, t, F){
    lm.uniforms.uWind.value=F.wind; lm.uniforms.uLight.value.copy(F.light); lm.uniforms.uLightOn.value=F.lightOn;
    const on=F.lightOn>0.3;
    moths.forEach((o,i)=>{ if(i>=lv.moths) return;
      if(on){ tv.set(F.light.x+Math.sin(t*o.a[0]+o.ph)*o.r, F.light.y+0.15+Math.sin(t*o.a[1]+o.ph*2)*o.r*0.6, F.light.z+Math.cos(t*o.a[2]+o.ph)*o.r); o.p.lerp(tv, 1-Math.exp(-dt*2.2)); o.al+=(1-o.al)*(1-Math.exp(-dt*1.5)); }
      else { o.p.y+=dt*0.25; o.p.x+=Math.sin(t*0.5+o.ph)*dt*0.3; o.al*=Math.exp(-dt*0.8); }
      mp[i*3]=o.p.x; mp[i*3+1]=o.p.y; mp[i*3+2]=o.p.z; ma[i]=o.al; });
    mg.attributes.position.needsUpdate=mg.attributes.aA.needsUpdate=true;
    beams.forEach(b=>{ const u=b.userData, gy=forestGround(u.x,u.z); up.set(F.moon[0]-u.x, F.moon[1]-gy, F.moon[2]-u.z).normalize();
      b.position.set(u.x, gy, u.z).addScaledVector(up, DETAIL.beamLen); zz.copy(F.cam).sub(b.position); zz.addScaledVector(up, -zz.dot(up)).normalize(); xx.crossVectors(up, zz).normalize();
      mx.makeBasis(xx, up, zz); b.quaternion.setFromRotationMatrix(mx); b.scale.set(u.w, 1, 1);
      b.material.color.copy(pal.moonhalo); b.material.opacity=0.16*F.moonK*F.moonK*(0.75+0.45*F.mist)*(0.8+0.2*Math.sin(t*0.11+u.ph)); });
  }
  const state=()=>({ grass:grass.count, leaves:lv.leaves, moths:moths.slice(0, lv.moths).map(o=>({ x:o.p.x, y:o.p.y, z:o.p.z, a:o.al })), beams:beams.map(b=>b.material.opacity),
    sils:sils.map(p=>({ kind:p.userData.kind, pos:[p.position.x, p.position.y, p.position.z] })), wind:lm.uniforms.uWind.value });
  /* probes: each silhouette's on-screen box in device coordinates (its four corners projected through the camera) */
  const silBoxes=camera=>sils.map(p=>{ p.updateMatrixWorld(); const xs=[], ys=[]; for(const [a,b] of [[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]]){ tv.set(a*p.geometry.parameters.width, b, 0).applyMatrix4(p.matrixWorld).project(camera); xs.push(tv.x); ys.push(tv.y); }
    return { kind:p.userData.kind, x0:Math.min(...xs), x1:Math.max(...xs), y0:Math.min(...ys), y1:Math.max(...ys) }; });
  return { update, resize, state, silBoxes, sils };
}
