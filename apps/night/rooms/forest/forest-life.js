/* RUN 9 (slice 2) — THE FOREST ANSWERS THE PLAYING, softly (never busy). Parts of the night forest room (forest.js builds them):
   - GROUND WAVES: each note sends a ring of light across the moss from the playing light's ground point (a patch on the ground's own
     material — no extra geometry, no overdraw; the rings' places and times from ./pure/forestlife.js, the colour = the light's colour, so
     Warmth / Brightness tint them);
   - GLOWING MUSHROOMS and FLOWERS near the aisle: a slow breath of their own, and a pulse with each note by their distance to the light
     (unlit instanced caps / petals + one glow point each — fake glow, no bloom);
   - THE STREAM: a ribbon of water across the floor (its own small shader: the sky, the moon's and the playing light's reflections, a slow
     flow); Echo shows as RINGS ON THE WATER at the stream's nearest point, one per echo, fainter by the feedback;
   - THE LEAVES' SWAY: the ferns sway gently (a vertex patch); Wave makes them SHIMMER at the effect's own 4.5 Hz.
   - NIGHT-6 slice 1: each note also RINGS THE STREAM at its nearest point (fainter with the distance); the MUSIC BED's chords swell every
     mushroom softly and each of its loop voices glows in its own distant cluster (the swells stay under a note's pulse: ANSWERS.bed.max).
   Colours: tokens through the room's palette (the moods' looks). Everything numeric is from the core (probe rows compare it). */
import { STREAM, STREAM_LINE, streamNear, LIFE, lifePlaces, pulseOf, RINGS, ringsNew, ringAdd, ringsAge } from './pure/forestlife.js';
import { ANSWERS, noteRingAmp, swellAt, bedClusters } from './pure/answers.js';   // NIGHT-6 slice 1: a note rings the stream; the music bed's swells
import { GUST } from './pure/gust.js';   // NIGHT-6 slice 6: the gust's numbers (the sway's shader)

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
   height squared bends it; amp scales the bend (and is part of the program's key). NIGHT-6 slice 6: + the effects hand's GUST (U.uGust:
   x, z, radius, strength; U.uGustDir) in world space after the instance — ./pure/gust.js gustBend, the same formula; 0 when the strength is 0 */
const GUST_GLSL=`#ifdef USE_INSTANCING
  { vec2 gq=mvPosition.xz-uGust.xy; float gh=max(mvPosition.y-instanceMatrix[3].y, 0.0), gl=length(gq);
    float gf=uGust.w*exp(-dot(gq,gq)/(uGust.z*uGust.z))*(1.0-smoothstep(1.5*uGust.z, 2.0*uGust.z, gl))*(1.0-smoothstep(2.5, 4.5, instanceMatrix[3].y))*${f(GUST.bend)}*gh*(gh/(gh+${f(GUST.h0)}));
    mvPosition.xz+=(uGustDir+${f(GUST.away)}*gq/(gl+0.3))*gf; }
  #endif`;
export function patchSway(mat, U, amp=1){
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms, U);
    sh.vertexShader='uniform float uNow, uSway, uShimmer;\nuniform vec4 uGust;\nuniform vec2 uGustDir;\n'+sh.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition=vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    mvPosition=instanceMatrix*mvPosition;
  #endif
  ${GUST_GLSL}
  mvPosition=modelViewMatrix*mvPosition;
  gl_Position=projectionMatrix*mvPosition;`).replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec2 ip=vec2(0.0);
  #ifdef USE_INSTANCING
    ip=instanceMatrix[3].xz;
  #endif
    float h=max(position.y,0.0), ph=ip.x*1.7+ip.y*1.3, h2=h*h*${f(amp)};
    transformed.x+=h2*(uSway*0.07*sin(uNow*1.3+ph)+uShimmer*0.035*sin(uNow*28.274+ph*3.0));
    transformed.z+=h2*(uSway*0.05*sin(uNow*0.9+ph*1.4)+uShimmer*0.02*cos(uNow*28.274+ph*2.0)); }`); };
  mat.customProgramCacheKey=()=>'handsong.sway'+amp+'.gust';
}
/* NIGHT-6 slice 4: WET BANKS — the ground's material gains a per-vertex wetness (aWet: 1 at the water, 0 0.7 m beyond the bank): darker
   (mud), and a little glossier, so the moon and the light glint on it. Chained after the ground waves' patch */
export function patchWetGround(mat){ const prev=mat.onBeforeCompile, k=mat.customProgramCacheKey.call(mat);
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r);
    sh.vertexShader='attribute float aWet;\nvarying float vWet;\n'+sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWet=aWet;');
    sh.fragmentShader='varying float vWet;\n'+sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb*=mix(vec3(1.0), vec3(0.22,0.2,0.18), smoothstep(0.0,1.0,vWet));')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor=mix(roughnessFactor, 0.36, smoothstep(0.45,1.0,vWet));'); };   // NIGHT-8: darker mud, glossier at the water
  mat.customProgramCacheKey=()=>k+'.wet'; return mat; }
/* NIGHT-6: SOFT CUT-OUT EDGES (the user's choice: the cheapest way at medium, which has no antialiasing). A cut-out's alpha is sharpened to
   a one-pixel ramp by its own screen-space rate (fwidth) and blended, instead of cut hard at 0.45 — one derivative a pixel, no extra pass.
   GLSL 3 (WebGL2) has fwidth built in. The material turns transparent but still writes depth; the caller sets its draw order (after the
   water, before the mist). Without it (absent, or no WebGL2) the cut stays hard, exactly as before. */
export function patchSoftEdges(mat){
  const prev=mat.onBeforeCompile, key=mat.customProgramCacheKey.bind(mat);
  mat.transparent=true; mat.depthWrite=true; mat.alphaTest=0.02;
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r);
    sh.fragmentShader=sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a=clamp((diffuseColor.a-0.45)/max(fwidth(diffuseColor.a),1e-4)+0.5,0.0,1.0);\n#include <alphatest_fragment>'); };
  const k=key(); mat.customProgramCacheKey=()=>k+'.soft';
  return mat;
}
/* NIGHT-6 slice 4: THE WATER (after the sketch «Живой лес», our own shader): two layers of noise flow towards the viewer along the stream
   (its own along / across coordinates, turned to the world by each vertex's tangent) and bend the surface; Echo's and the notes' rings as real
   ripples; a soft edge where it meets the carved bank.
   NIGHT-8 (the user: a night stream is mostly dark): the body near black, the sky only at grazing angles; the MOON broken into sparkles by the
   ripples (no sheet of light); the REFLECTIONS of the nearest glowing things (fireflies, mushrooms: uGl, each a small trembling image); small
   bright GLINTS that ride the flow downstream; the SHALLOWS see-through towards the banks (stones on the bed, refracted by the ripples, fading
   with depth); WHITE WATER and ripples round the rocks that stand in it (uRk: a collar on the upstream side, a wake of streaks downstream); the
   playing light's sparkle and glow as before. Quiet: everything slow and small. */
const WATER_V=`attribute vec2 aTan; varying vec3 vW; varying vec2 vUv; varying vec2 vTan;
void main(){ vUv=uv; vTan=aTan; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
export const WATER_GL=8, WATER_RK=12;   // NIGHT-8: glowing things reflected, rocks in the water
const WATER_F=W=>`uniform vec4 uGust; uniform vec2 uGustDir;
uniform float uNow, uMoonK, uLightK, uFogD, uAlpha, uLen, uHalf, uWide; uniform vec3 uDeep, uSky, uMoonCol, uMoonPos, uLightPos, uLightCol, uRingCol, uFogCol, uBed; uniform vec4 uWR[${W.n}];
uniform vec4 uGl[${WATER_GL}]; uniform vec3 uGlC[${WATER_GL}]; uniform vec4 uRk[${WATER_RK}];
varying vec3 vW; varying vec2 vUv; varying vec2 vTan;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x), f.y); }
float hgt(vec2 q, float t){ return vn(q*vec2(0.9,2.4)-vec2(t*0.55,0.0))*0.65+vn(q*vec2(2.3,4.8)-vec2(t*1.1,t*0.05))*0.35; }
/* the bed's stones: the nearest cell centre's distance (a rounded stone in each cell, darker gaps) */
float stones(vec2 p){ vec2 i=floor(p), f=fract(p); float d=1.0, id=0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)), o=vec2(h21(i+g), h21(i+g+17.3))*0.8+0.1; float e=length(g+o-f); if(e<d){ d=e; id=h21(i+g+3.1); } }
  return (1.0-smoothstep(0.25,0.48,d))*(0.55+0.45*id); }
void main(){
  float t=uNow, acr=(vUv.y-0.5)*2.0*uWide, eD=abs(acr)/uHalf; vec2 q=vec2(vUv.x*uLen, acr), p=vW.xz;
  vec3 V=normalize(vW-cameraPosition); float dist=length(vW-cameraPosition);
  vec2 Tn=normalize(vTan), Bn=vec2(-Tn.y, Tn.x);
  float e=0.05, h0=hgt(q,t), hx=hgt(q+vec2(e,0.0),t), hy=hgt(q+vec2(0.0,e),t), str=(0.45+0.6*smoothstep(0.5,1.0,eD))/(1.0+dist*0.1);
  vec2 g=vec2(hx-h0, hy-h0)/e*str*0.09, gw=g.x*Tn+g.y*Bn;
  float ring=0.0;
  for(int i=0;i<${W.n};i++){ vec4 r=uWR[i]; float age=t-r.z; if(r.z>=0.0 && age>0.0 && age<${f(W.life)}){ vec2 dv=p-r.xy; float d=length(dv); float x=(d-age*${f(W.speed)})/${f(W.width)}; float k=1.0-age/${f(W.life)}; float a=r.w*exp(-x*x)*k*k; ring+=a; gw+=dv/(d+1e-4)*a*0.25; } }
  { vec2 gq=p-uGust.xy, nd=vec2(-uGustDir.y, uGustDir.x); float gf=uGust.w*exp(-dot(gq,gq)/(uGust.z*uGust.z));   // NIGHT-6 slice 6: cat's-paws under the gust (0 without it)
    gw+=(nd*sin(dot(p,uGustDir)*16.0-t*10.0)*0.6+uGustDir*sin(dot(p,nd)*11.0+t*6.0)*0.4)*gf*0.22; }
  /* NIGHT-8: the rocks in the water — a pale collar upstream, ripples round them, a wake of flowing streaks downstream */
  float foam=0.0;
  for(int i=0;i<${WATER_RK};i++){ vec4 k=uRk[i]; if(k.z<=0.0) continue; vec2 dv=p-k.xy; float d=length(dv), sd=d-k.z; if(sd>1.2) continue;
    float al=dot(dv,Tn), ac=dot(dv,Bn), up=smoothstep(0.2,-0.6,al/(d+1e-4));
    float col=exp(-sd*sd/(0.0012+0.012*k.z))*(0.15+0.85*up)*smoothstep(0.35,0.75,vn(vec2(atan(dv.y,dv.x)*4.0+t*0.7, sd*30.0-t*3.0)));
    float wl=max(al, 0.0), wake=exp(-ac*ac/((k.z*0.6+wl*0.25)*(k.z*0.6+wl*0.25)))*exp(-wl/(0.35+k.z*2.0))*step(0.0, al)*smoothstep(0.62,0.85,vn(vec2(wl*7.0-t*2.4, ac*16.0)));
    foam+=col*0.8+wake*0.6; gw+=dv/(d+1e-4)*sin(sd*38.0-t*5.0)*exp(-sd*4.0)*0.05; }
  foam=min(foam, 1.0);
  vec3 N=normalize(vec3(-gw.x,1.0,-gw.y)), R=reflect(V,N);
  float fres=0.03+0.97*pow(1.0-max(dot(-V,N),0.0),5.0);
  /* the body: near black; towards the banks the shallow bed shows through (stones, refracted, fading with depth) */
  float shallow=smoothstep(0.35,0.95,eD);
  vec2 bp=p*4.1+gw*1.8+vec2(0.37*sin(p.y*1.7), 0.37*sin(p.x*1.3));   // the cells bent a little (no grid)
  float stn=stones(bp)*(0.7+0.3*vn(bp*0.37));
  vec3 bed=uBed*(0.5+0.5*stn)*(0.04+0.11*uMoonK+0.5*uLightK/(1.0+dot(uLightPos-vW,uLightPos-vW)*0.5));   // dim: the tokens are drawn as linear (sRGB out)
  vec3 body=mix(uDeep*0.45, bed, shallow*0.5);
  vec3 sky=mix(uFogCol, uSky, clamp(R.y*2.0,0.0,1.0))*0.11;
  vec3 col=mix(body, sky, fres*(1.0-0.5*shallow));
  /* the moon: its image broken by the ripples into sparkles along its path; and small bright glints that ride the flow */
  vec3 M=normalize(uMoonPos-vW); float mk=max(dot(R,M),0.0);
  float sp=smoothstep(0.7,0.97,vn(q*vec2(5.0,12.0)-vec2(t*1.6,0.0)));
  float gn=smoothstep(0.86,0.99,vn(q*vec2(9.0,22.0)-vec2(t*2.3,t*0.07)))*smoothstep(0.75,0.98,vn(q*vec2(3.1,7.0)-vec2(t*0.9,0.0)));
  col+=uMoonCol*uMoonK*(pow(mk,700.0)*2.2*sp+pow(mk,140.0)*0.22*sp*sp+pow(mk,12.0)*0.35*gn*(1.0-shallow*0.5)+pow(mk,40.0)*0.012);
  /* NIGHT-8: the glowing things nearby, each a small trembling image on the water */
  for(int i=0;i<${WATER_GL};i++){ vec4 L=uGl[i]; if(L.w<=0.0) continue; vec3 Ld=L.xyz-vW; float ld=length(Ld), lk=max(dot(R,Ld/ld),0.0);
    col+=uGlC[i]*L.w*(pow(lk,500.0)*1.4*(0.5+sp)+pow(lk,160.0)*0.03)/(1.0+ld*ld*0.25); }
  vec3 Ld=uLightPos-vW; float ld=length(Ld); float lk=max(dot(R,Ld/ld),0.0); col+=uLightCol*uLightK*(pow(lk,90.0)*1.2+pow(lk,10.0)*0.06)/(1.0+ld*ld*0.08)+uLightCol*uLightK*0.02/(1.0+ld*ld*0.6);
  col+=uRingCol*ring*0.5;
  /* white water: pale, lit by the moon and the light (never glowing by itself); the edges' faint foam lines */
  float fe=smoothstep(0.75,1.0,eD)*(1.0-smoothstep(1.0,1.3,eD)), fn=smoothstep(0.7,0.92,vn(q*vec2(1.6,6.0)-vec2(t*0.9,0.0)));
  vec3 lit=uMoonCol*(0.04+0.16*uMoonK)+uLightCol*uLightK*0.12/(1.0+ld*ld*0.3);
  col=mix(col, lit*(0.9+0.4*vn(q*vec2(14.0,30.0)-vec2(t*3.0,0.0))), foam*0.8)+lit*fe*fn*0.35;
  float a=(1.0-smoothstep(1.05,1.45,eD))*smoothstep(0.0,0.03,vUv.x)*mix(1.0, 0.7, shallow*(1.0-foam));
  col=mix(col,uFogCol,1.0-exp(-uFogD*uFogD*dist*dist));
  gl_FragColor=vec4(col, a*uAlpha);
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
    uSway:{ value:0.35 }, uShimmer:{ value:0 }, uGust:{ value:new T.Vector4(0, 0, GUST.R, 0) }, uGustDir:{ value:new T.Vector2(1, 0) } };   // NIGHT-6 slice 6: the gust
  const ground=ringsNew(RINGS.ground.n), water=ringsNew(RINGS.water.n);
  /* mushrooms and flowers */
  /* NIGHT-6 slice 5: the mushrooms on the wood (ctx.woodShrooms) come after today's, which keep their places and the music bed's clusters */
  const today=lifePlaces(lv.shrooms, lv.blooms), places=today.concat((ctx.woodShrooms||[]).map(p=>({ kind:'shroom', x:p.x, y:p.y, z:p.z, s:p.s, ph:p.ph, rot:p.rot, wood:true }))), N=places.length, pulse=new Float32Array(N), glow=new Float32Array(N);
  const SHROOMS=places.map((p,i)=>i).filter(i=>places[i].kind==='shroom'), clusters=bedClusters(today), bedG=new Float32Array(N), bedEv=[];   // NIGHT-6 slice 1
  const NEAR=places.map((p,i)=>[i, streamNear(p.x, p.z).d]).filter(x=>x[1]<2.2).sort((a,b)=>a[1]-b[1]).map(x=>x[0]); let glFrame=0, glFirst=true, glPick=[], glD=new Float32Array(0), glNext=0;   // NIGHT-8: what the water may reflect
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
  /* NIGHT-6 slice 4: the ribbon a little wider than the water (it fades out over the carved bank), u along by length, a tangent per vertex,
     three strips across (the middle line carries the flow's detail); tapered only at its far end */
  const L=STREAM_LINE, WIDE=STREAM.half+0.2, AC=[0, 0.5, 1], pos=new Float32Array(L.length*3*3), uv=new Float32Array(L.length*3*2), tan=new Float32Array(L.length*3*2), idx=[]; let len=0;
  L.forEach((p,i)=>{ if(i) len+=Math.hypot(p.x-L[i-1].x, p.z-L[i-1].z); }); let acc=0;
  L.forEach((p,i)=>{ if(i) acc+=Math.hypot(p.x-L[i-1].x, p.z-L[i-1].z); const u=acc/len, w=WIDE*Math.min(1, u*14+0.1), nx=-p.tz, nz=p.tx;
    AC.forEach((a,k)=>{ const o=(a-0.5)*2*w, j=i*3+k; pos.set([p.x+nx*o, p.y, p.z+nz*o], j*3); uv.set([u, 0.5+(a-0.5)*w/WIDE], j*2); tan.set([p.tx, p.tz], j*2); });
    if(i) for(let k=0;k<2;k++){ const a=(i-1)*3+k, b=i*3+k; idx.push(a, a+1, b, a+1, b+1, b); } });
  const wg=new T.BufferGeometry(); wg.setAttribute('position', new T.BufferAttribute(pos,3)); wg.setAttribute('uv', new T.BufferAttribute(uv,2)); wg.setAttribute('aTan', new T.BufferAttribute(tan,2)); wg.setIndex(idx);
  const WU={ uGust:U.uGust, uGustDir:U.uGustDir, uNow:U.uNow, uMoonK:{ value:1 }, uLightK:{ value:0 }, uFogD:{ value:0.06 }, uAlpha:{ value:0.95 }, uLen:{ value:len }, uHalf:{ value:STREAM.half }, uWide:{ value:WIDE }, uDeep:{ value:new T.Color(C('forest-water')) }, uSky:{ value:pal.sky }, uMoonCol:{ value:pal.moonhalo },
    uMoonPos:{ value:V(-14,23,-55) }, uLightPos:{ value:V(0,1,0) }, uLightCol:{ value:new T.Color(C('forest-light')) }, uRingCol:{ value:new T.Color(C('forest-light')) }, uFogCol:{ value:pal.fog },
    uWR:{ value:Array.from({ length:RINGS.water.n }, ()=>new T.Vector4(0,0,-1,0)) },
    uGl:{ value:Array.from({ length:WATER_GL }, ()=>new T.Vector4(0,0,0,0)) }, uGlC:{ value:Array.from({ length:WATER_GL }, ()=>new T.Color()) }, uRk:{ value:Array.from({ length:WATER_RK }, ()=>new T.Vector4(0,0,0,0)) },
    uBed:{ value:new T.Color(C('forest-streambed')) } };   // NIGHT-8
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
    /* NIGHT-8: the glowing things the water reflects — the mushrooms nearest the stream, then the wild fireflies nearest it (every 4th frame) */
    { let j=0; for(const i of NEAR){ if(j>=WATER_GL/2) break; WU.uGl.value[j].set(places[i].x, places[i].y+places[i].s*2.2, places[i].z, glow[i]*0.6); WU.uGlC.value[j].copy(places[i].kind==='shroom' ? SH : BL); j++; }
      if(F.flies){ const nf=F.flies.length; if(glD.length!==nf){ glD=new Float32Array(nf).fill(99); glFirst=true; }   // each fly's distance to the water: a few a frame (all at the first)
        for(let k=0;k<(glFirst ? nf : 8);k++){ const i=(glNext++)%nf, q=F.flies[i]; glD[i]=streamNear(q.p[0], q.p[2]).d; }
        if(++glFrame%4===0 || glFirst){ glFirst=false; const sc=F.flies.map((q,i)=>[i, q.glow/(1+Math.max(0, glD[i]-0.5)**2)]).sort((a,b)=>b[1]-a[1]); glPick=sc.slice(0, WATER_GL-j).map(x=>x[0]); } }
      for(const i of glPick){ if(j>=WATER_GL) break; const q=F.flies[i]; WU.uGl.value[j].set(q.p[0], q.p[1], q.p[2], q.glow*(F.flyK==null ? 1 : F.flyK)); WU.uGlC.value[j].copy(F.flyCol||SH); j++; }
      for(;j<WATER_GL;j++) WU.uGl.value[j].w=0; }
    SH.copy(pal.shroom); BL.copy(pal.bloom);
    const k=Math.exp(-dt/LIFE.tau), ga=gg.attributes.aGlow.array, ca=gg.attributes.aCol.array;
    /* NIGHT-6 slice 1: the bed's swells, each an envelope from the moment it is heard; their sum capped under a note's pulse */
    bedG.fill(0);
    for(let j=bedEv.length-1;j>=0;j--){ const e=bedEv[j], a=t-e.t0; if(a>e.rise+e.hold+e.fall || a<-60){ bedEv.splice(j,1); continue; }
      const v=swellAt(a, e.rise, e.hold, e.fall)*e.amp; if(v>0) for(const i of e.set) bedG[i]+=v; }
    for(let i=0;i<N;i++) if(bedG[i]>ANSWERS.bed.max) bedG[i]=ANSWERS.bed.max;
    places.forEach((p,i)=>{ pulse[i]*=k; const g=Math.min(1.6, (LIFE.base+LIFE.breathe*(0.5+0.5*Math.sin(t*0.6+p.ph))+bedG[i])*F.dim+pulse[i]); glow[i]=g;
      const c= p.kind==='shroom' ? SH : BL; ga[i]=g*0.75; ca[i*3]=c.r; ca[i*3+1]=c.g; ca[i*3+2]=c.b;
      const m= p.kind==='shroom' ? caps : petals, j= p.kind==='shroom' ? shrooms.indexOf(p) : blooms.indexOf(p), e=0.03+0.32*g; m.instanceColor.setXYZ(j, c.r*e, c.g*e, c.b*e); });   // unlit: kept dim (sRGB output), the glow point carries the light
    gg.attributes.aGlow.needsUpdate=gg.attributes.aCol.needsUpdate=true; caps.instanceColor.needsUpdate=petals.instanceColor.needsUpdate=true;
  }
  /* a note: a ground wave from the light's ground point, the nearby mushrooms and flowers pulse */
  function glint(vel, lx, lz, t){ const v=Math.max(0.18, Math.min(1, vel==null?0.6:vel)); ringAdd(ground, lx, lz, t, 0.9*v);
    places.forEach((p,i)=>{ pulse[i]=Math.min(1.5, pulse[i]+pulseOf(p.x, p.z, lx, lz, v)); }); }
  /* an echo of a note struck at (x, z): a ring on the stream's nearest point */
  function echo(x, z, amp, t){ const q=streamNear(x, z); ringAdd(water, q.x, q.z, t, Math.min(1, amp), 'echo'); return q; }
  /* NIGHT-6 slice 1: a note struck with the light over (lx, lz) rings the stream at its nearest point → the ring's amplitude (0: too far, none) */
  function wake(x, z, amp, t){ ringAdd(water, x, z, t, Math.min(1, amp), 'wake'); }   // NIGHT-6 slice 6: the gust's wake
  function noteRing(lx, lz, vel, t){ const q=streamNear(lx, lz), a=noteRingAmp(q.d, vel); if(a>0) ringAdd(water, q.x, q.z, t, a, 'note'); return a; }
  /* the music bed, heard at t0: a chord swells every mushroom; loop voice k glows in its cluster over its note's own envelope (a, h, r) */
  const B=ANSWERS.bed;
  function bedChord(t0){ bedEv.push({ kind:'chord', t0, rise:B.chord.rise, hold:B.chord.hold, fall:B.chord.fall, amp:B.chord.amp, set:SHROOMS }); }
  function bedLoop(k, t0, a, h, r, amp){ if(!clusters.length) return; const c=clusters[((k|0)%clusters.length+clusters.length)%clusters.length];
    bedEv.push({ kind:'loop', t0, rise:Math.max(0.2, +a||1), hold:Math.max(0, +h||0), fall:Math.max(0.5, +r||3), amp:B.loop.amp*(0.6+0.4*Math.max(0, Math.min(1, amp==null?1:amp))), set:c }); }
  const state=()=>({ ground:ground.filter(r=>r.t0>=0).map(r=>({ ...r })), water:water.filter(r=>r.t0>=0).map(r=>({ ...r })), places:places.map((p,i)=>({ kind:p.kind, x:p.x, z:p.z, pulse:pulse[i], glow:glow[i], bed:bedG[i] })),
    bed:{ active:bedEv.length, clusters:clusters.map(c=>c.slice()) },   // NIGHT-6 slice 1
    sway:U.uSway.value, shimmer:U.uShimmer.value, waveCol:[U.uGWCol.value.r, U.uGWCol.value.g, U.uGWCol.value.b], shroomCol:[SH.r, SH.g, SH.b] });
  const resize=scale=>{ gm.uniforms.uScale.value=scale; };
  /* NIGHT-8: the rocks that stand in the water ([{ x, z, s }]): white water and ripples round each (at most WATER_RK, the largest first) */
  function waterRocks(list){ const L=list.slice().sort((a,b)=>b.s-a.s).slice(0, WATER_RK); WU.uRk.value.forEach((v,i)=>{ const r=L[i]; if(r) v.set(r.x, r.z, r.s*1.05, 0); else v.set(0,0,0,0); }); return L.length; }
  return { U, update, glint, echo, noteRing, wake, bedChord, bedLoop, state, resize, stream, glowMat:gm, waterRocks, WU };   // glowMat: NIGHT-6 slice 9 (the night flowers' glow shares it); WU: probes
}
