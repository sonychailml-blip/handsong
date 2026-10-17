/* VIS1c (RUN 6, Calm plan §3) — THE NIGHT FOREST ROOM: a scene module built with three.js r128 (vendored, loaded by host.js). Re-laid from
   the «Rooms of light» prototype (docs/prototypes/, the strategist's own code — our starting source, user RUN 5) WITHOUT the animals:
   procedural ground (moss, soil, leaves), bark, instanced trunks and branches, ferns, mossy rocks, four mist sheets, the moon, fog; the hand's
   firefly light (core + halo + trail; a real shadow from the playing hand's light where the level allows) and a dimmer light for the effects
   hand; the wild fireflies from core/fireflies.js (numbers — the shader only draws them); a slow parallax towards the light.
   Rules: every colour is a token (--cv-forest-*, read through the passed C = palette.cv; textures add numeric jitter around them); the light
   sits where the hand's REMAPPED play point is (the hit-tests' point, rule #12) at the depth from the hand's size (core depthDistance) — placed
   through THIS camera, so it projects onto its note row exactly; only the light's world position saturates at the room's bounds (never the
   coordinates). Seeded (one seed per room): the same forest on every device. No sound, no song, no network here (VIS1 contract). */
import { seeded } from '../../core/dsp.js';
import { fliesInit, fliesStep, forestGround, depthDistance, FOREST_FLIES } from '../../core/fireflies.js';

export const FOREST_SEED=0x464F5231;
/* the levels (Calm plan §7): full — real shadows (hand light 1024², 512² on small screens), 70 wild fireflies, 16-step trails, moving mist;
   reduced — 512² shadow, 35 fireflies, 8-step trails, still mist. «minimal» has no WebGL at all (host.js draws a 2D stand-in). */
export const FOREST_LEVELS={ full:{ flies:70, trail:16, shadow:1024, shadowSmall:512, mist:true }, reduced:{ flies:35, trail:8, shadow:512, shadowSmall:512, mist:false } };
export const FOREST_BOUNDS=Object.freeze([-6, 6, 0.3, 4.2, -15, 3.8]);   // x, y, z ranges the light may reach (it saturates there)

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* colour helpers: a token's text → [r, g, b, a]; jittered variants in HSL (texture painting only) */
function rgbOf(s){ s=String(s||'').trim(); let m=s.match(/^#([0-9a-f]{6})$/i); if(m){ const n=parseInt(m[1],16); return [n>>16&255, n>>8&255, n&255, 1]; }
  m=s.match(/^#([0-9a-f]{3})$/i); if(m){ const q=m[1]; return [0,1,2].map(i=>parseInt(q[i]+q[i],16)).concat(1); }
  m=s.match(/\(([^)]+)\)/); if(m){ const p=m[1].split(',').map(Number); return [p[0]||0, p[1]||0, p[2]||0, p[3]==null?1:p[3]]; } return [0,0,0,1]; }
const rgba=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a==null?c[3]:a})`;
function hslOf(c){ const r=c[0]/255, g=c[1]/255, b=c[2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2; let h=0, s=0;
  if(mx!==mn){ const d=mx-mn; s= l>0.5 ? d/(2-mx-mn) : d/(mx+mn); h= mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; } return [h, s*100, l*100]; }
const jit=(c,dh,ds,dl)=>{ const [h,s,l]=hslOf(c); return `hsl(${((h+dh)%360+360)%360},${clamp(s+ds,0,100)}%,${clamp(l+dl,0,100)}%)`; };
const grey=v=>`rgb(${v|0},${v|0},${v|0})`;   // bump maps: heights, not colours
function canvas2(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return [c, c.getContext('2d')]; }

/* the wild fireflies' and the trail's point shader (the prototype's mode 1: each point's own glow) */
const PV=`uniform float uSize,uScale,uFog;attribute float aGlow;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float z=max(.1,-mv.z);vA=aGlow*exp(-z*uFog);gl_PointSize=max(1.5,uSize*uScale/z);}`;
const PF=`uniform vec3 uColor;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float r2=dot(c,c)*4.;if(r2>1.)discard;
float a=exp(-r2*7.)+.4*exp(-r2*2.)*(1.-r2);gl_FragColor=vec4(uColor,a*vA);}`;

/* T — the THREE namespace; opt: { C (palette.cv), level 'full' | 'reduced', w, h (canvas CSS pixels), reduce (reduced motion) } */
export function buildForest(T, opt){
  const C=opt.C, Lv=FOREST_LEVELS[opt.level]||FOREST_LEVELS.full, reduce=!!opt.reduce, R=seeded(FOREST_SEED), V=(x,y,z)=>new T.Vector3(x,y,z);
  const col=n=>new T.Color(C('forest-'+n));
  const own=[];   // everything to dispose
  const tex=(c,srgb,rx=1,ry=1)=>{ const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx,ry); t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; own.push(t); return t; };
  const s=new T.Scene(), FOG=col('fog'); s.background=FOG; s.fog=new T.FogExp2(FOG, 0.06);
  s.add(new T.HemisphereLight(col('sky'), col('under'), 0.26));
  const moonL=new T.DirectionalLight(col('moon'), 0.3); moonL.position.set(-10,20,-30); s.add(moonL);
  const gy=forestGround;
  /* ground: moss, soil and fallen leaves (colour + bump) */
  const [gc,g]=canvas2(512,512), [gb,b]=canvas2(512,512), MOSS=rgbOf(C('forest-moss')), SOIL=rgbOf(C('forest-soil')), LEAF=rgbOf(C('forest-leaf'));
  g.fillStyle=C('forest-ground'); g.fillRect(0,0,512,512); b.fillStyle=grey(96); b.fillRect(0,0,512,512);
  const w9=fn=>{ for(const dx of [-512,0,512]) for(const dy of [-512,0,512]) fn(dx,dy); };
  for(let i=0;i<220;i++){ const x=R()*512, y=R()*512, r=10+R()*50, moss=R()<0.6, c=moss?MOSS:SOIL;
    w9((dx,dy)=>{ const gr=g.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r); gr.addColorStop(0,rgba(c,0.4)); gr.addColorStop(1,rgba(c,0)); g.fillStyle=gr; g.fillRect(x+dx-r,y+dy-r,r*2,r*2);
      const gbr=b.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r); gbr.addColorStop(0, moss?rgba([255,255,255],0.18):rgba([0,0,0],0.18)); gbr.addColorStop(1,rgba([0,0,0],0)); b.fillStyle=gbr; b.fillRect(x+dx-r,y+dy-r,r*2,r*2); }); }
  for(let i=0;i<800;i++){ const x=R()*512, y=R()*512, a=R()*6.28, l=2+R()*4, dh=(R()-0.5)*30, ds=(R()-0.5)*20, dl=(R()-0.5)*9;
    w9((dx,dy)=>{ g.fillStyle=jit(LEAF,dh,ds,dl); g.beginPath(); g.ellipse(x+dx,y+dy,l,l*0.42,a,0,6.28); g.fill();
      b.fillStyle=rgba([255,255,255],0.18); b.beginPath(); b.ellipse(x+dx,y+dy,l,l*0.42,a,0,6.28); b.fill(); }); }
  const gg=new T.PlaneGeometry(90,90,90,90); gg.rotateX(-Math.PI/2); { const pa=gg.attributes.position; for(let i=0;i<pa.count;i++) pa.setY(i,gy(pa.getX(i),pa.getZ(i))); gg.computeVertexNormals(); }
  const groundM=new T.MeshStandardMaterial({ map:tex(gc,true,24,24), bumpMap:tex(gb,false,24,24), bumpScale:0.05, roughness:0.95 });
  const ground=new T.Mesh(gg, groundM); ground.receiveShadow=true; s.add(ground); own.push(gg, groundM);
  /* bark */
  const [kc,k]=canvas2(256,512), [kb,kk]=canvas2(256,512); k.fillStyle=C('forest-bark'); k.fillRect(0,0,256,512); kk.fillStyle=grey(128); kk.fillRect(0,0,256,512);
  for(let i=0;i<260;i++){ const x=R()*256, wd=1+R()*4, dark=R()<0.65, ph=R()*6;
    for(const dx of [-256,0,256]){ k.strokeStyle=C(dark?'forest-bark-dark':'forest-bark-light'); kk.strokeStyle=dark?rgba([0,0,0],0.7):rgba([255,255,255],0.35); k.lineWidth=kk.lineWidth=wd;
      for(const c of [k,kk]){ c.beginPath(); for(let y=0;y<=512;y+=16){ const xx=x+dx+Math.sin(y*0.03+ph)*4; if(y) c.lineTo(xx,y); else c.moveTo(xx,y); } c.stroke(); } } }
  const barkM=new T.MeshStandardMaterial({ map:tex(kc,true,2,5), bumpMap:tex(kb,false,2,5), bumpScale:0.035, roughness:0.95 }); own.push(barkM);
  const spots=[[-2.1,-2.2,0.34],[2.5,-4.6,0.42],[-1.3,-8.2,0.3],[3.6,0.4,0.28],[-4.2,-5,0.5],[1.1,-11.5,0.36],[-3.3,1.2,0.22],[4.6,-9,0.46]];
  while(spots.length<95){ const x=(R()*2-1)*22, z=4-R()*44; if(Math.hypot(x,z-5.5)<3.2 || (Math.abs(x)<1.1 && z>-7)) continue; spots.push([x,z,0.14+R()*0.42]); }
  const trunkG=new T.CylinderGeometry(0.72,1,16,14), trunks=new T.InstancedMesh(trunkG, barkM, spots.length); own.push(trunkG);
  const brs=[], d=new T.Object3D();
  spots.forEach(([x,z,r],i)=>{ d.position.set(x,gy(x,z)+7.8,z); d.rotation.set((R()-0.5)*0.06,R()*6.28,(R()-0.5)*0.06); d.scale.set(r,1,r); d.updateMatrix(); trunks.setMatrixAt(i,d.matrix);
    if(z>-24) for(let b2=0;b2<(R()*3|0);b2++) brs.push([x,z,r,1.2+R()*4.5,R()*6.28,0.7+R()*1.8]); });
  const brG=new T.CylinderGeometry(0.6,1,1,6), branches=new T.InstancedMesh(brG, barkM, brs.length); own.push(brG);
  brs.forEach(([x,z,r,h,a,l],i)=>{ d.rotation.set(0,a,1.05+R()*0.35,'YXZ'); d.scale.set(0.035+r*0.06,l,0.035+r*0.06);
    const dirv=V(0,1,0).applyEuler(d.rotation); d.position.set(x,gy(x,z)+h,z).addScaledVector(dirv,l*0.5); d.updateMatrix(); branches.setMatrixAt(i,d.matrix); });
  for(const m of [trunks,branches]){ m.castShadow=m.receiveShadow=true; s.add(m); }
  /* ferns: instanced fronds with an alpha leaf texture */
  const [fc,f]=canvas2(128,512), FROND=rgbOf(C('forest-frond')); f.strokeStyle=C('forest-fern'); f.lineWidth=3; f.beginPath(); f.moveTo(64,512); f.quadraticCurveTo(70,260,62,8); f.stroke();
  for(let i=0;i<30;i++){ const t=i/30, y=505-t*495, len=Math.pow(1-t,0.7)*54+5, cx=64+Math.sin(t*3)*4; f.fillStyle=jit(FROND,(R()-0.5)*25,(R()-0.5)*12,(R()-0.5)*9);
    for(const sd of [-1,1]){ f.beginPath(); f.ellipse(cx+sd*len*0.5,y-len*0.18,len*0.5,len*0.13+2,sd*-0.35,0,6.28); f.fill(); } }
  const fernT=tex(fc,true); fernT.wrapS=fernT.wrapT=T.ClampToEdgeWrapping;
  const frondG=new T.PlaneGeometry(0.42,1.15); frondG.translate(0,0.575,0); own.push(frondG);
  const ferns=[]; while(ferns.length<80){ const x=(R()*2-1)*12, z=4-R()*26; if(Math.hypot(x,z-5.5)<2.2) continue; ferns.push([x,z,0.6+R()*0.9]); }
  const frondM=new T.MeshStandardMaterial({ map:fernT, alphaTest:0.45, side:T.DoubleSide, roughness:0.85 }), frondD=new T.MeshDistanceMaterial({ map:fernT, alphaTest:0.45, side:T.DoubleSide });
  const fronds=new T.InstancedMesh(frondG, frondM, ferns.length*7); fronds.customDistanceMaterial=frondD; own.push(frondM, frondD);
  let fi=0; for(const [x,z,sc] of ferns){ const a0=R()*6.28; for(let j=0;j<7;j++){ d.position.set(x,gy(x,z)-0.02,z); d.rotation.set(0.75+R()*0.5,a0+j*0.9+R()*0.3,0,'YXZ'); d.scale.set(sc,sc*(0.8+R()*0.4),sc); d.updateMatrix(); fronds.setMatrixAt(fi++,d.matrix); } }
  fronds.castShadow=fronds.receiveShadow=true; s.add(fronds);
  /* mossy rocks */
  const rockM=new T.MeshStandardMaterial({ color:col('rock'), roughness:0.96, bumpMap:tex(gb,false,2,2), bumpScale:0.06 }); own.push(rockM);
  for(const [x,z,sz] of [[-1.6,-1,0.5],[1.9,-2.8,0.35],[-2.8,-6.5,0.7],[2.2,-8,0.45],[0.6,-5.4,0.25],[-0.8,-12,0.6],[3.4,-12.5,0.5]]){
    const ig=new T.IcosahedronGeometry(1,2), pa=ig.attributes.position; own.push(ig);
    for(let i=0;i<pa.count;i++){ const v=V(pa.getX(i),pa.getY(i),pa.getZ(i)); v.multiplyScalar(1+0.18*Math.sin(v.x*4+v.z*3)+0.1*Math.sin(v.y*7)); pa.setXYZ(i,v.x,v.y,v.z); }
    ig.computeVertexNormals(); const m=new T.Mesh(ig,rockM); m.scale.set(sz*1.3,sz*0.6,sz); m.position.set(x,gy(x,z)+sz*0.12,z); m.rotation.y=R()*6; m.castShadow=m.receiveShadow=true; s.add(m); }
  /* ground mist sheets at four depths */
  const [mc,mx]=canvas2(256,128);
  for(let i=0;i<70;i++){ const x=R()*256, y=40+R()*50, r=14+R()*30; for(const dx of [-256,0,256]){ const gr=mx.createRadialGradient(x+dx,y,0,x+dx,y,r); gr.addColorStop(0,C('mist-a12')); gr.addColorStop(1,C('halo-a0')); mx.fillStyle=gr; mx.fillRect(x+dx-r,y-r,r*2,r*2); } }
  const mists=[]; [-3,-8,-14,-21].forEach((z,i)=>{ const t=tex(mc,true); t.wrapT=T.ClampToEdgeWrapping; const pg=new T.PlaneGeometry(44,3.2), pm=new T.MeshBasicMaterial({ map:t, color:col('mist'), transparent:true, opacity:0.26, depthWrite:false });
    const m=new T.Mesh(pg,pm); m.position.set(0,0.9,z); s.add(m); mists.push([t,0.004+i*0.002]); own.push(pg,pm); });
  /* the soft round glow (sprites) */
  const [hc,hx]=canvas2(128,128); { const gr=hx.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,C('halo-a100')); gr.addColorStop(0.18,C('halo-a45')); gr.addColorStop(0.5,C('halo-a10')); gr.addColorStop(1,C('halo-a0')); hx.fillStyle=gr; hx.fillRect(0,0,128,128); }
  const HALO=tex(hc,true);
  const sprite=(color,opacity=1,fog=true)=>{ const m=new T.SpriteMaterial({ map:HALO, color, opacity, transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog }); own.push(m); return new T.Sprite(m); };
  const moonS=sprite(col('moonhalo'),0.55,false); moonS.scale.set(16,16,1); moonS.position.set(-14,17,-55); s.add(moonS);
  /* the wild fireflies — positions from core/fireflies.js */
  const flies=fliesInit(Lv.flies, FOREST_FLIES.seed);
  const fg=new T.BufferGeometry(); fg.setAttribute('position',new T.BufferAttribute(new Float32Array(flies.length*3),3)); fg.setAttribute('aGlow',new T.BufferAttribute(new Float32Array(flies.length),1));
  const fm=new T.ShaderMaterial({ uniforms:{ uColor:{ value:col('fly') }, uSize:{ value:0.13 }, uScale:{ value:500 }, uFog:{ value:0.035 } }, vertexShader:PV, fragmentShader:PF, transparent:true, depthWrite:false, blending:T.AdditiveBlending });
  const ff=new T.Points(fg,fm); ff.frustumCulled=false; s.add(ff); own.push(fg,fm);
  const wild=[0,1].map(()=>{ const l=new T.PointLight(col('wild'),0,3.2,2); s.add(l); return l; });
  /* the hands' lights: 0 = the playing hand (shadow-casting at full / reduced), 1 = the effects hand (dimmer, no shadow) */
  const small=Math.min(opt.w||800, opt.h||600)<600, SH=small ? Lv.shadowSmall : Lv.shadow;
  const rigs=[0,1].map(i=>{ const grp=new T.Group(), light=new T.PointLight(i ? col('fx') : col('light'), 0, i?4.5:7.5, 2);
    if(i===0){ light.castShadow=true; light.shadow.mapSize.set(SH,SH); light.shadow.bias=-0.005; light.shadow.camera.near=0.08; }
    const core=sprite(col('core')), halo=sprite(i?col('fx'):col('halo'),0.5); grp.add(light,core,halo); grp.visible=false; s.add(grp);
    const trail=[]; for(let j=0;j<Lv.trail;j++){ const t=sprite(col('trail'),0); t.scale.set(0.05,0.05,1); s.add(t); trail.push(t); }
    return { i, grp, light, core, halo, trail, hist:[], ht:0, cur:V(0,1.5,0), prev:V(0,1.5,0), tgt:V(0,1.5,0), on:0, glint:0, sat:false }; });
  /* the camera: the prototype's place and lean; portrait gets a wider view */
  const camPos=V(0,1.55,5.5), camLook=V(0,1.35,-6), camera=new T.PerspectiveCamera(55,1,0.05,120), camOff=V(0,0,0), camGoal=V(0,0,0), look=V(0,0,0);
  const ray=new T.Raycaster(), ndc=new T.Vector2(), fwd=V(0,0,0), tmp=V(0,0,0);
  let W=opt.w||800, H=opt.h||600, pxH=H;
  function aimCamera(){ camera.position.copy(camPos).add(camOff); look.copy(camLook).addScaledVector(camOff,-1.2); camera.lookAt(look); camera.updateMatrixWorld(); }
  function resize(w,h,bufH){ W=w; H=h; pxH=bufH||h; camera.aspect=w/h; camera.fov= w/h<0.8 ? 68 : 55; camera.updateProjectionMatrix();
    fm.uniforms.uScale.value=pxH/(2*Math.tan(camera.fov*Math.PI/360)); aimCamera(); }
  /* the hand's play point (canvas pixels px, py) and depth 0…1 → the light's world place on THIS camera's ray (it projects back onto the
     point); saturates at the room's bounds and the ground → out; returns true when it saturated */
  function place(px, py, d01, out){
    ndc.set(px/W*2-1, -(py/H)*2+1); ray.setFromCamera(ndc, camera); camera.getWorldDirection(fwd);
    const D=depthDistance(d01), t=D/ray.ray.direction.dot(fwd);
    out.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
    const B=FOREST_BOUNDS, x=clamp(out.x,B[0],B[1]), y0=clamp(out.y,B[2],B[3]), z=clamp(out.z,B[4],B[5]), y=Math.max(y0, gy(x,z)+0.25);
    const sat= x!==out.x || y!==out.y || z!==out.z; out.set(x,y,z); return sat;
  }
  const lightsOf=()=>rigs.map(r=>({ x:r.cur.x, y:r.cur.y, z:r.cur.z, on:r.on }));
  /* one frame: hands = [{ x, y, d, play }] (canvas pixels, depth 0…1; play = the note hand) */
  function update(dt, t, hands){
    const kk=reduce?0.4:1, H2=hands||[], play=H2.find(h=>h.play), other=H2.find(h=>h!==play);
    rigs.forEach((r,i)=>{ const h= i===0 ? play : other; let on=0;
      if(h){ r.sat=place(h.x, h.y, h.d, r.tgt); on=1; if(r.on<0.02) r.cur.copy(r.tgt); }
      r.on+=(on-r.on)*Math.min(1, dt*(on>r.on?6:2.5));
      r.prev.copy(r.cur); r.cur.lerp(r.tgt, 1-Math.exp(-dt*13));
      r.glint*=Math.exp(-dt*2.4);
      const pul=reduce?1:0.9+0.1*Math.sin(t*3.1), dim=i?0.45:1;
      r.grp.visible=r.on>0.01; r.grp.position.copy(r.cur);
      r.light.intensity=1.9*dim*r.on*pul*(1+r.glint); r.core.scale.setScalar((i?0.1:0.16)*(1+r.glint*0.7)); r.core.material.opacity=r.on;
      const hs=(i?0.9:1.5)*(1+r.glint*0.9)*pul; r.halo.scale.set(hs,hs,1); r.halo.material.opacity=0.55*r.on*dim;
      r.ht+=dt; if(r.ht>0.03){ r.ht=0; r.hist.unshift(r.cur.clone()); if(r.hist.length>r.trail.length) r.hist.pop(); }
      r.trail.forEach((sp,j)=>{ const p=r.hist[j]; if(!p){ sp.material.opacity=0; return; } sp.position.copy(p); sp.material.opacity=r.on*0.3*dim*(1-j/r.trail.length); sp.scale.setScalar(0.1*(1-j/r.trail.length)+0.02); });
    });
    fliesStep(flies, lightsOf(), dt, t, kk);
    const pa=fg.attributes.position.array, ga=fg.attributes.aGlow.array;
    flies.forEach((q,i)=>{ pa[i*3]=q.p[0]; pa[i*3+1]=q.p[1]; pa[i*3+2]=q.p[2]; ga[i]=q.glow; });
    fg.attributes.position.needsUpdate=fg.attributes.aGlow.needsUpdate=true;
    wild.forEach((l,i)=>{ const q=flies[Math.min(flies.length-1,i*7)]; l.position.set(q.p[0],q.p[1],q.p[2]); l.intensity=q.glow*0.7; });
    if(Lv.mist) mists.forEach(([tx,sp])=>{ tx.offset.x=(t*sp*kk)%1; });
    /* parallax: the camera leans a little towards the playing light (near and far things slide past each other) */
    const f0=rigs[0].on>0.05 ? rigs[0].cur : camLook;
    camGoal.set(clamp(f0.x,-4,4)*0.16, (clamp(f0.y,0,5)-1.7)*0.1, 0); if(reduce) camGoal.multiplyScalar(0.3);
    camOff.lerp(camGoal, 1-Math.exp(-dt*1.6)); aimCamera(); if(!reduce){ camera.position.y+=Math.sin(t*0.23)*0.025; camera.updateMatrixWorld(); }
  }
  /* a note began on this rig's hand (from the bus `notes` ring) */
  const glint=(i,vel)=>{ const r=rigs[i]; if(r) r.glint=Math.max(r.glint, clamp(vel==null?0.6:vel,0.18,1)); };
  /* probes: numbers only (never pixels) */
  function project(i){ const r=rigs[i]; tmp.copy(r.cur).project(camera); return { x:(tmp.x+1)/2*W, y:(1-tmp.y)/2*H, sat:r.sat, on:r.on }; }
  const state=()=>({ rigs:rigs.map(r=>({ x:r.cur.x, y:r.cur.y, z:r.cur.z, on:r.on, sat:r.sat })), shadows:rigs.filter(r=>r.light.castShadow).length, shadowSize:SH,
    flies:flies.length, trail:Lv.trail, fov:camera.fov, cam:[camera.position.x, camera.position.y, camera.position.z], fliesAt:flies.map(q=>q.p.slice()) });
  function dispose(){ for(const o of own) try{ o.dispose(); }catch(e){} own.length=0; }
  resize(W,H);
  return { id:'room.forest', scene:s, camera, update, resize, place, glint, project, state, dispose, lightsOf };
}
