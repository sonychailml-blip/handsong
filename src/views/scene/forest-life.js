/* RUN 9 (slice 2) — THE FOREST ANSWERS THE PLAYING, softly (never busy). Parts of the night forest room (forest.js builds them):
   - GROUND WAVES: each note sends a ring of light across the moss from the playing light's ground point (a patch on the ground's own
     material — no extra geometry, no overdraw; the rings' places and times from core/forestlife.js, the colour = the light's colour, so
     Warmth / Brightness tint them);
   - GLOWING MUSHROOMS and FLOWERS near the aisle: a slow breath of their own, and a pulse with each note by their distance to the light
     (unlit instanced caps / petals + one glow point each — fake glow, no bloom);
   - THE STREAM: a ribbon of water across the floor (its own small shader: the sky, the moon's and the playing light's reflections, a slow
     flow); Echo shows as RINGS ON THE WATER at the stream's nearest point, one per echo, fainter by the feedback;
   - THE LEAVES' SWAY: the ferns sway gently (a vertex patch); Wave makes them SHIMMER at the effect's own 4.5 Hz.
   Colours: tokens through the room's palette (the moods' looks). Everything numeric is from the core (probe rows compare it). */
import { STREAM, STREAM_LINE, streamNear, LIFE, lifePlaces, pulseOf, RINGS, ringsNew, ringAdd, ringsAge } from '../../core/forestlife.js';

const f=v=>Number(v).toFixed(4);
/* the ground's material gains the ground waves: U = { uNow, uGW (6 × vec4: x, z, t0 (−1 free), amp), uGWCol, uGWK (gain: 1; a probe's control sets 0) } */
export function patchGroundWaves(mat, U){
  const G=RINGS.ground;
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms, U);
    sh.vertexShader='varying vec3 vWPos;\n'+sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=`uniform vec4 uGW[${G.n}];\nuniform float uNow, uGWK;\nuniform vec3 uGWCol;\nvarying vec3 vWPos;\n`+sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float wv=0.0; for(int i=0;i<${G.n};i++){ vec4 w=uGW[i]; float age=uNow-w.z; if(w.z>=0.0 && age>0.0 && age<${f(G.life)}){ float x=(distance(vWPos.xz,w.xy)-age*${f(G.speed)})/${f(G.width)}; float k=1.0-age/${f(G.life)}; wv+=w.w*exp(-x*x)*k*k; } }
    float moss=clamp((diffuseColor.g-diffuseColor.r)*6.0+0.5,0.25,1.0); totalEmissiveRadiance+=uGWCol*wv*moss*uGWK; }`); };
  mat.customProgramCacheKey=()=>'handsong.groundWaves';
}
/* a fern frond material (and its shadow twin; RUN 9 slice 3: the grass, amp 2.2) gains the sway: U = { uNow, uSway, uShimmer } — the
   height squared bends it; amp scales the bend (and is part of the program's key) */
export function patchSway(mat, U, amp=1){
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms, U);
    sh.vertexShader='uniform float uNow, uSway, uShimmer;\n'+sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec2 ip=vec2(0.0);
  #ifdef USE_INSTANCING
    ip=instanceMatrix[3].xz;
  #endif
    float h=max(position.y,0.0), ph=ip.x*1.7+ip.y*1.3, h2=h*h*${f(amp)};
    transformed.x+=h2*(uSway*0.07*sin(uNow*1.3+ph)+uShimmer*0.035*sin(uNow*28.274+ph*3.0));
    transformed.z+=h2*(uSway*0.05*sin(uNow*0.9+ph*1.4)+uShimmer*0.02*cos(uNow*28.274+ph*2.0)); }`); };
  mat.customProgramCacheKey=()=>'handsong.sway'+amp;
}
const WATER_V=`varying vec3 vW; varying vec2 vUv;
void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const WATER_F=W=>`uniform float uNow, uMoonK, uLightK, uFogD, uAlpha; uniform vec3 uDeep, uSky, uMoonCol, uMoonPos, uLightPos, uLightCol, uRingCol, uFogCol; uniform vec4 uWR[${W.n}];
varying vec3 vW; varying vec2 vUv;
void main(){
  vec3 V=normalize(vW-cameraPosition); vec2 p=vW.xz; float t=uNow;
  vec2 n2=vec2(sin(vUv.x*170.0-t*1.6)*0.05+sin(p.x*3.1+p.y*2.3+t*0.7)*0.03, cos(vUv.x*120.0+vUv.y*9.0-t*1.2)*0.04);
  float ring=0.0;
  for(int i=0;i<${W.n};i++){ vec4 r=uWR[i]; float age=t-r.z; if(r.z>=0.0 && age>0.0 && age<${f(W.life)}){ vec2 dv=p-r.xy; float d=length(dv); float x=(d-age*${f(W.speed)})/${f(W.width)}; float k=1.0-age/${f(W.life)}; float g=r.w*exp(-x*x)*k*k; ring+=g; n2+=dv/(d+1e-4)*g*0.25; } }
  vec3 N=normalize(vec3(n2.x,1.0,n2.y)), R=reflect(V,N);
  float fres=0.2+0.8*pow(1.0-max(dot(-V,N),0.0),3.0);
  float rip=0.8+0.4*sin(vUv.x*230.0+p.y*6.0-t*1.9)*sin(vUv.y*7.0+p.x*4.0+t*0.8);
  vec3 col=mix(uDeep, mix(uFogCol, uSky, clamp(R.y*2.0,0.0,1.0))*0.22*rip, fres);   // dark water: the scene's output is sRGB-encoded (a linear 0.1 already reads as 0.35)
  vec3 M=normalize(uMoonPos-vW); float mk=max(dot(R,M),0.0); col+=uMoonCol*uMoonK*(pow(mk,300.0)*1.6+pow(mk,24.0)*0.07);
  vec3 Ld=uLightPos-vW; float ld=length(Ld); float lk=max(dot(R,Ld/ld),0.0); col+=uLightCol*uLightK*(pow(lk,90.0)*1.0+pow(lk,8.0)*0.05)/(1.0+ld*ld*0.08);
  col+=uRingCol*ring*0.55;
  float edge=smoothstep(0.0,0.2,vUv.y)*smoothstep(1.0,0.8,vUv.y)*smoothstep(0.0,0.03,vUv.x)*smoothstep(1.0,0.97,vUv.x);
  float fd=length(vW-cameraPosition); col=mix(col,uFogCol,1.0-exp(-uFogD*uFogD*fd*fd));
  gl_FragColor=vec4(col, edge*uAlpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
/* the glow points' shader (each point its own soft glow, as the wild fireflies) */
const GV=`uniform float uSize,uScale;attribute float aGlow;attribute vec3 aCol;varying float vA;varying vec3 vC;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float z=max(.1,-mv.z);vA=aGlow;vC=aCol;gl_PointSize=max(1.5,uSize*uScale/z);}`;
const GF=`varying float vA;varying vec3 vC;void main(){vec2 c=gl_PointCoord-.5;float r2=dot(c,c)*4.;if(r2>1.)discard;gl_FragColor=vec4(vC,(exp(-r2*5.)*.8+.2*(1.-r2))*vA);}`;

/* build the life parts into scene s. ctx: { T, s, C (palette.cv), pal (the room's eased palette), own (disposables), canvas2, tex, lv
   ({ shrooms, blooms }), fog (s.fog) } → { update(dt, t, L), glint(vel, lx, lz), echo(x, z, amp, t), state(), U (the shared uniforms) } */
export function buildLife(ctx){
  const { T, s, C, pal, own, canvas2, tex, lv }=ctx, V=(x,y,z)=>new T.Vector3(x,y,z);
  const U={ uNow:{ value:0 }, uGW:{ value:Array.from({ length:RINGS.ground.n }, ()=>new T.Vector4(0,0,-1,0)) }, uGWCol:{ value:new T.Color(C('forest-light')) }, uGWK:{ value:1 },
    uSway:{ value:0.35 }, uShimmer:{ value:0 } };
  const ground=ringsNew(RINGS.ground.n), water=ringsNew(RINGS.water.n);
  /* mushrooms and flowers */
  const places=lifePlaces(lv.shrooms, lv.blooms), N=places.length, pulse=new Float32Array(N), glow=new Float32Array(N);
  const d=new T.Object3D(), shrooms=places.filter(p=>p.kind==='shroom'), blooms=places.filter(p=>p.kind==='bloom');
  const capG=new T.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2), stemG=new T.CylinderGeometry(0.16,0.22,1,6), bloomG=new T.PlaneGeometry(1,1); bloomG.rotateX(-Math.PI/2); own.push(capG, stemG, bloomG);
  const capM=new T.MeshBasicMaterial({ color:0xffffff }); capM.onBeforeCompile=sh=>{   // a dome's shading on an unlit cap: bright top, dark rim
    sh.vertexShader=`varying float vNy;
`+sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vNy=normal.y;`);
    sh.fragmentShader=`varying float vNy;
`+sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb*=0.2+0.8*vNy*vNy;`); };
  capM.customProgramCacheKey=()=>'handsong.cap';
  const stemM=new T.MeshLambertMaterial({ color:new T.Color(C('forest-stem')) });
  const [bc,bx]=canvas2(64,64); bx.translate(32,32); for(let k=0;k<5;k++){ bx.rotate(Math.PI*2/5); const gr=bx.createRadialGradient(0,-14,0,0,-14,13); gr.addColorStop(0,C('halo-a100')); gr.addColorStop(1,C('halo-a10')); bx.fillStyle=gr; bx.beginPath(); bx.ellipse(0,-14,7,13,0,0,6.283); bx.fill(); }
  const bloomM=new T.MeshBasicMaterial({ map:tex(bc,true), alphaTest:0.3, transparent:false, side:T.DoubleSide, color:0xffffff }); own.push(capM, stemM, bloomM);
  const caps=new T.InstancedMesh(capG, capM, Math.max(1,shrooms.length)), stems=new T.InstancedMesh(stemG, stemM, Math.max(1,N)), petals=new T.InstancedMesh(bloomG, bloomM, Math.max(1,blooms.length));
  const gpos=[];
  places.forEach((p,i)=>{ const h= p.kind==='shroom' ? p.s*1.6 : p.s*2.6; d.rotation.set(0,p.rot,0); d.position.set(p.x, p.y+h/2, p.z); d.scale.set(p.s*(p.kind==='shroom'?0.9:0.25), h, p.s*(p.kind==='shroom'?0.9:0.25)); d.updateMatrix(); stems.setMatrixAt(i, d.matrix);
    if(p.kind==='shroom'){ d.position.set(p.x, p.y+h, p.z); d.scale.set(p.s*1.5, p.s*0.9, p.s*1.5); d.updateMatrix(); caps.setMatrixAt(shrooms.indexOf(p), d.matrix); gpos.push(p.x, p.y+h+p.s*0.6, p.z); }
    else { d.position.set(p.x, p.y+h+0.01, p.z); d.rotation.set(0.25,p.rot,0); d.scale.set(p.s*2.4,1,p.s*2.4); d.updateMatrix(); petals.setMatrixAt(blooms.indexOf(p), d.matrix); gpos.push(p.x, p.y+h+0.04, p.z); } });
  caps.instanceColor=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,shrooms.length)*3),3); petals.instanceColor=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,blooms.length)*3),3);
  caps.count=shrooms.length; petals.count=blooms.length; stems.count=N;
  stems.receiveShadow=true; s.add(stems, caps, petals);
  const gg=new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(new Float32Array(gpos),3)); gg.setAttribute('aGlow', new T.BufferAttribute(new Float32Array(N),1)); gg.setAttribute('aCol', new T.BufferAttribute(new Float32Array(N*3),3));
  const gm=new T.ShaderMaterial({ uniforms:{ uSize:{ value:0.5 }, uScale:{ value:500 } }, vertexShader:GV, fragmentShader:GF, transparent:true, depthWrite:false, blending:T.AdditiveBlending });
  const gp=new T.Points(gg, gm); gp.frustumCulled=false; s.add(gp); own.push(gg, gm);
  /* the stream: a ribbon over the ground along the core's line */
  const L=STREAM_LINE, pos=new Float32Array(L.length*2*3), uv=new Float32Array(L.length*2*2), idx=[];
  L.forEach((p,i)=>{ const u=i/(L.length-1), w=STREAM.half*(0.7+0.3*Math.sin(u*9.0+1.3))*Math.min(1, u*12, (1-u)*12+0.15), nx=-p.tz, nz=p.tx;
    for(const [k,sd] of [[0,-1],[1,1]]){ const x=p.x+nx*w*sd, z=p.z+nz*w*sd; pos.set([x, p.y, z], (i*2+k)*3); uv.set([u, k], (i*2+k)*2); }
    if(i) idx.push(i*2-2, i*2-1, i*2, i*2-1, i*2+1, i*2); });
  const wg=new T.BufferGeometry(); wg.setAttribute('position', new T.BufferAttribute(pos,3)); wg.setAttribute('uv', new T.BufferAttribute(uv,2)); wg.setIndex(idx);
  const WU={ uNow:U.uNow, uMoonK:{ value:1 }, uLightK:{ value:0 }, uFogD:{ value:0.06 }, uAlpha:{ value:0.92 }, uDeep:{ value:new T.Color(C('forest-water')) }, uSky:{ value:pal.sky }, uMoonCol:{ value:pal.moonhalo },
    uMoonPos:{ value:V(-14,23,-55) }, uLightPos:{ value:V(0,1,0) }, uLightCol:{ value:new T.Color(C('forest-light')) }, uRingCol:{ value:new T.Color(C('forest-light')) }, uFogCol:{ value:pal.fog },
    uWR:{ value:Array.from({ length:RINGS.water.n }, ()=>new T.Vector4(0,0,-1,0)) } };
  const wm=new T.ShaderMaterial({ uniforms:WU, vertexShader:WATER_V, fragmentShader:WATER_F(RINGS.water), transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  const stream=new T.Mesh(wg, wm); stream.renderOrder=-1; s.add(stream); own.push(wg, wm);
  const SH=new T.Color(), BL=new T.Color();
  /* one frame. L: { light (rig 0's place, V3), lightOn 0…1, lightCol (T.Color), moon ([x,y,z]), moonK, fogD, sway, shimmer } */
  function update(dt, t, F){
    U.uNow.value=t; U.uSway.value=F.sway; U.uShimmer.value=F.shimmer; U.uGWCol.value.copy(F.lightCol);
    ringsAge(ground, t, RINGS.ground.life); ringsAge(water, t, RINGS.water.life);
    ground.forEach((r,i)=>U.uGW.value[i].set(r.x, r.z, r.t0, r.amp)); water.forEach((r,i)=>WU.uWR.value[i].set(r.x, r.z, r.t0, r.amp));
    WU.uMoonPos.value.set(F.moon[0], F.moon[1], F.moon[2]); WU.uMoonK.value=F.moonK; WU.uFogD.value=F.fogD; WU.uLightPos.value.copy(F.light); WU.uLightK.value=F.lightOn;
    WU.uLightCol.value.copy(F.lightCol); WU.uRingCol.value.copy(F.lightCol);
    SH.copy(pal.shroom); BL.copy(pal.bloom);
    const k=Math.exp(-dt/LIFE.tau), ga=gg.attributes.aGlow.array, ca=gg.attributes.aCol.array;
    places.forEach((p,i)=>{ pulse[i]*=k; const g=Math.min(1.6, (LIFE.base+LIFE.breathe*(0.5+0.5*Math.sin(t*0.6+p.ph)))*F.dim+pulse[i]); glow[i]=g;
      const c= p.kind==='shroom' ? SH : BL; ga[i]=g*0.75; ca[i*3]=c.r; ca[i*3+1]=c.g; ca[i*3+2]=c.b;
      const m= p.kind==='shroom' ? caps : petals, j= p.kind==='shroom' ? shrooms.indexOf(p) : blooms.indexOf(p), e=0.03+0.32*g; m.instanceColor.setXYZ(j, c.r*e, c.g*e, c.b*e); });   // unlit: kept dim (sRGB output), the glow point carries the light
    gg.attributes.aGlow.needsUpdate=gg.attributes.aCol.needsUpdate=true; caps.instanceColor.needsUpdate=petals.instanceColor.needsUpdate=true;
  }
  /* a note: a ground wave from the light's ground point, the nearby mushrooms and flowers pulse */
  function glint(vel, lx, lz, t){ const v=Math.max(0.18, Math.min(1, vel==null?0.6:vel)); ringAdd(ground, lx, lz, t, 0.9*v);
    places.forEach((p,i)=>{ pulse[i]=Math.min(1.5, pulse[i]+pulseOf(p.x, p.z, lx, lz, v)); }); }
  /* an echo of a note struck at (x, z): a ring on the stream's nearest point */
  function echo(x, z, amp, t){ const q=streamNear(x, z); ringAdd(water, q.x, q.z, t, Math.min(1, amp)); return q; }
  const state=()=>({ ground:ground.filter(r=>r.t0>=0).map(r=>({ ...r })), water:water.filter(r=>r.t0>=0).map(r=>({ ...r })), places:places.map((p,i)=>({ kind:p.kind, x:p.x, z:p.z, pulse:pulse[i], glow:glow[i] })),
    sway:U.uSway.value, shimmer:U.uShimmer.value, waveCol:[U.uGWCol.value.r, U.uGWCol.value.g, U.uGWCol.value.b], shroomCol:[SH.r, SH.g, SH.b] });
  const resize=scale=>{ gm.uniforms.uScale.value=scale; };
  return { U, update, glint, echo, state, resize, stream };
}
