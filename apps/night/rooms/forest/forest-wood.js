/* NIGHT-6 slice 5 — MOSS, ROOTS AND FALLEN WOOD (parts of the night forest room; forest.js builds them; the places are ./pure/wood.js):
   - THE WOOD: roots of the near trees, a log on the bank, a log across the stream as a bridge, stumps with cut tops (end-grain rings and
     cracks), standing dead trees with broken tops, fallen branches, bracket fungi — ONE merged geometry, ONE material over today's bark
     texture: moss low on the north side and on the tops of lying wood, lichen higher up, dead wood greyer, darker where wood meets the ground.
   - THE BARK of today's trunks and branches takes the same moss, lichen and darkening (patchBark); the trunks' foot flares (trunkGeo).
   - MOSS CUSHIONS: one instanced draw with the stream rocks' material (their moss, all over).
   - IVY: cards of the plant sheet's ivy cell climbing the nearest trunks (the floor's material: one draw).
   - CONTACT SHADOWS: the ground darkened under what stands, from a prepared map (tex/shade-*.png, painted by tools/forest-bake.mjs from
     the same laws) — patchShade.
   Colours: tokens (--cv-forest-moss, -lichen, -grain, -grain-dark, -fungus, -fungus-rim, -deadwood). */
import { WOOD, flareAt, twigShape, trunkRadius } from './pure/wood.js';
import { bankGround } from './pure/forestlife.js';
import { cellUv, FLOOR_ATLAS } from './pure/floor.js';
import { seeded } from '../../../../core/pure/dsp.js';
import { RELIEF } from './pure/fireflies.js';   // NIGHT-9: the ground's relief (gnd7 copies forestGround)
const f=v=>Number(v).toFixed(4);

const TAU=2*Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
/* the shader's own small noise and the floor's height (pure/fireflies.js forestGround, the same numbers) */
const GLSL=`float h27(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn7(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h27(i),h27(i+vec2(1.0,0.0)),f.x), mix(h27(i+vec2(0.0,1.0)),h27(i+vec2(1.0,1.0)),f.x), f.y); }
float gnd7(vec2 p){ float b=0.28*sin(p.x*0.3)*cos(p.y*0.27)+0.14*sin(p.x*0.9+p.y*0.6), r=${f(RELIEF.a)}*sin(0.83*p.x+0.41*p.y+1.3)*sin(0.57*p.y-0.29*p.x+0.4)+${f(RELIEF.b)}*sin(1.9*p.x-1.3*p.y+2.1)*cos(1.6*p.y+0.7*p.x);
  float m=smoothstep(${f(-RELIEF.edge)}, ${f(RELIEF.edge)}, 6.0-abs(p.x))*smoothstep(${f(-RELIEF.edge)}, ${f(RELIEF.edge)}, p.y+14.0)*smoothstep(${f(-RELIEF.edge)}, ${f(RELIEF.edge)}, 5.0-p.y); return b*(1.0-0.65*m)+r*(1.0-${f(1-RELIEF.aisle)}*m); }   // NIGHT-9: pure/fireflies.js forestGround, the same law
uniform vec3 uMossW, uLichen, uGrain, uGrainDark, uFungus, uFungusRim, uDead;`;
/* NIGHT-9 probes: the shader's copy of the ground law (data row «FOREST relief (app)» reads its constants) */
export const gnd7Src=()=>{ const L=GLSL.split('\n'), i=L.findIndex(l=>l.startsWith('float gnd7')); return i<0 ? '' : L[i]+L[i+1]; };
/* the wood's look (fragment, after the map): w = (dead 0…1, kind 0 bark | 1 end grain | 2 fungus, moss on top 0…1), cap = the disc's or
   shelf's own coordinates */
const LOOK=`{ vec3 wp=vWP7, wn=normalize(vWN7); float dead=vW7.x, kind=vW7.y, topM=vW7.z;
  float above=wp.y-gnd7(wp.xz), ang=atan(wn.z, wn.x); vec3 c=diffuseColor.rgb;
  c=mix(c, uDead*clamp(dot(c, vec3(0.3333))/0.16, 0.35, 2.0), dead*0.7);   // dead wood: greyer, paler
#ifdef WOOD7_KINDS
  if(kind>0.5 && kind<1.5){ float rho=length(vCap7), rg=fract(rho*9.0+0.6*vn7(vCap7*3.0)), crack=smoothstep(0.9, 0.97, vn7(vec2(atan(vCap7.y, vCap7.x)*3.0, rho*2.0)))*smoothstep(0.15, 0.5, rho);
    vec3 g=mix(uGrain, uGrainDark, smoothstep(0.72, 0.95, rg)+0.35*(1.0-smoothstep(0.0, 0.25, rho)));
    g=mix(g, uGrainDark*0.45, crack); g=mix(g, uDead*0.9, dead*0.45); c=mix(g, c, smoothstep(0.88, 0.97, rho)); }   // rings and cracks, the bark at the rim
  else if(kind>1.5){ float rho=vCap7.y, b=0.5+0.5*sin(rho*30.0+vn7(vec2(vCap7.x*8.0, rho*3.0))*3.0);
    c=mix(uFungus*0.55, uFungus, b*0.5+rho*0.5); c=mix(c, uFungusRim, smoothstep(0.86, 0.97, rho)); if(wn.y<-0.2) c=uFungusRim*0.8; }   // growth zones, a pale rim, pale pores below
#endif
  if(kind<1.5){
#ifdef WOOD7_KINDS
    float mh=1.0-smoothstep(0.12, 1.3+1.2*vn7(wp.xz*2.0), above), side=0.4+0.6*smoothstep(-0.3, 0.6, dot(wn, vec3(0.37, 0.0, -0.93)));
    float mm=clamp(mh*side*(0.45+0.9*vn7(vec2(ang*2.0, wp.y*3.0))), 0.0, 1.0); vec3 mt7=vec3(1.0);
#else
    /* NIGHT-8b: each trunk its own moss (pure/wood.js barkMoss, per instance): reach, the face it favours, cover, patchiness, tint; the noise
       runs on the normal's x and z (no seam round the trunk) from the trunk's own offset */
    float pf=1.5+4.0*vBk7.w, of=vBk7b.x;
    float mh=1.0-smoothstep(0.12, max(0.2, vBk7.x*(0.8+0.4*vn7(wp.xz*2.0+of))), above), side=0.25+0.75*smoothstep(-0.4, 0.6, dot(wn, vec3(cos(vBk7.y), 0.0, sin(vBk7.y))));
    float nz=0.5*(vn7(vec2(wn.x*pf+of, wp.y*pf*1.6))+vn7(vec2(wn.z*pf-of, wp.y*pf*1.6+7.0)));
    float mm=clamp(mh*side*(0.2+1.1*vBk7.z)*mix(1.0, 0.1+1.8*nz, 0.4+0.6*vBk7.w), 0.0, 1.0); vec3 mt7=vec3(1.0+0.16*vBk7b.y, 1.0+0.03*vBk7b.y, 1.0-0.28*vBk7b.y);
#endif
#ifdef WOOD7_KINDS
    float top=smoothstep(0.15, 0.7, wn.y)*topM*(0.65+0.5*vn7(wp.xz*3.0+wp.y));
    if(kind>0.5) top*=smoothstep(0.82, 0.98, length(vCap7));   // a cut top: moss only at its rim
    mm=max(mm, top)*(1.0-0.5*dead);
#endif
    float lic=smoothstep(0.64, 0.76, vn7(vec2(ang*4.0+wp.x*0.5, wp.y*3.2+wp.z*0.5)))*smoothstep(0.8, 2.0, above)*(1.0-smoothstep(3.5, 5.5, above))*(0.5+0.8*dead);   // small spots, 0.8–5 m up
    c=mix(c, uLichen*(0.8+0.4*vn7(wp.xy*40.0)), clamp(lic, 0.0, 1.0)*0.6);
    c=mix(c, uMossW*mt7*(0.6+0.6*vn7(wp.xy*30.0+wp.z*7.0)), smoothstep(0.25, 0.6, mm)); }
  c*=mix(0.35, 1.0, smoothstep(-0.15, 0.9, above));   // darker where it meets the ground
  diffuseColor.rgb=c; }`;
/* the colour uniforms (tokens) */
export function woodUniforms(T, C){ const k=n=>({ value:new T.Color(C('forest-'+n)) });
  return { uMossW:k('moss'), uLichen:k('lichen'), uGrain:k('grain'), uGrainDark:k('grain-dark'), uFungus:k('fungus'), uFungusRim:k('fungus-rim'), uDead:k('deadwood') }; }
/* NIGHT-6 slice 9: FOXFIRE (pure/hidden.js foxAt, the same formula): veins glowing on the dead wood (aW7.x dead > 0.25) and on the feet of some
   old trunks (the bark: patches of a slow noise, below 3 m), near the light's trail (uFox: x, y, z, its time; time < 0 empty), each patch holding
   8–12 s, then fading. With no trail point it adds exactly nothing */
const FOX=(n, L)=>`{ vec3 wp=vWP7; float above=wp.y-gnd7(wp.xz);
  float where= vW7.x>0.25 ? 1.0 : (vW7.z<0.01 && vW7.y<0.5 ? smoothstep(0.55, 0.75, vn7(wp.xz*0.45+3.1))*(1.0-smoothstep(1.2, 3.0, above)) : 0.0);
  if(where>0.0 && uFoxK>0.0){ float act=0.0, hold=${L.hold[0].toFixed(3)}+${(L.hold[1]-L.hold[0]).toFixed(3)}*vn7(wp.xz*1.7);   // the patch's own hold, once (a noise inside the loop made the shader slow to compile)
    for(int i=0;i<${n};i++){ vec4 p=uFox[i]; float age=uFoxT-p.w, f= p.w<0.0 ? 0.0 : (age<hold ? 1.0 : max(0.0, 1.0-(age-hold)/${L.fade.toFixed(3)})); vec3 dd=wp-p.xyz; act=max(act, f*exp(-dot(dd,dd)/${(L.r*L.r).toFixed(4)})); }
    if(act>0.0){ vec2 q=vec2(wp.x*7.0+wp.z*4.3, wp.y*8.0-wp.z*3.1); float vein=(1.0-smoothstep(0.015, 0.05, abs(vn7(q)-0.5)))*smoothstep(0.3, 0.6, vn7(q*0.37+3.0));   // connected thin lines, some stretches faded
      totalEmissiveRadiance+=uFoxCol*(uFoxK*where*act*(vein*0.6+0.02)*(0.75+0.25*sin(uFoxT*1.3+wp.x*3.0+wp.z*2.0))); } } }`;   // the veins and a faint glow round them
/* mat → the wood's look (NIGHT-7: the bark's shader leaves out what only the merged wood uses — end grain, fungi, moss on top — so it compiles faster). attrs: true = per-vertex (aW7, aCap7: the merged wood), false = today's bark (instanced, no moss on top). WU.uFox
   present: + foxfire (WU.foxLaw: { hold, fade, r }) */
function patchLook(mat, WU, attrs, key){ const fox=WU.uFox ? WU.uFox.value.length : 0, law=WU.foxLaw, U={ ...WU }; delete U.foxLaw;
  mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms, U);
    sh.vertexShader=(attrs ? 'attribute vec3 aW7;\nattribute vec2 aCap7;\n' : 'attribute vec4 aBark7;\nattribute vec2 aBark7b;\nvarying vec4 vBk7;\nvarying vec2 vBk7b;\n')+'varying vec3 vWP7;\nvarying vec3 vWN7;\nvarying vec3 vW7;\nvarying vec2 vCap7;\n'+sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w7=vec4(transformed,1.0); vec3 n7=objectNormal;
  #ifdef USE_INSTANCING
    w7=instanceMatrix*w7; n7=mat3(instanceMatrix)*n7;
  #endif
    vWP7=(modelMatrix*w7).xyz; vWN7=normalize(mat3(modelMatrix)*n7); ${attrs ? 'vW7=aW7; vCap7=aCap7;' : 'vW7=vec3(0.0); vCap7=vec2(0.0); vBk7=aBark7; vBk7b=aBark7b;'} }`);
    sh.fragmentShader=(attrs ? '#define WOOD7_KINDS\n' : 'varying vec4 vBk7;\nvarying vec2 vBk7b;\n')+'varying vec3 vWP7;\nvarying vec3 vWN7;\nvarying vec3 vW7;\nvarying vec2 vCap7;\n'+GLSL+'\n'+sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n'+LOOK)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  if(vW7.y>1.5) roughnessFactor=0.7;');
    if(fox) sh.fragmentShader=`uniform vec4 uFox[${fox}];\nuniform vec3 uFoxCol;\nuniform float uFoxK, uFoxT;\n`+sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'+FOX(fox, law)); };
  mat.customProgramCacheKey=()=>key+(fox ? '.fox'+fox : ''); return mat; }
/* today's bark (trunks, branches): moss low on the trunk, lichen, darker at the foot. NIGHT-8b: each instance's moss from its attributes
   aBark7 (h, side, cover, patch) and aBark7b (off, tint) — barkAttrs puts barkMoss's numbers on an instanced geometry */
export const patchBark=(mat, WU)=>patchLook(mat, WU, false, 'handsong.bark8');
export function barkAttrs(T, geo, moss){ const n=Math.max(1, moss.length), a=new Float32Array(n*4), b=new Float32Array(n*2);
  moss.forEach((m,i)=>{ a.set([m[0], m[1], m[2], m[3]], i*4); b.set([m[5], m[4]], i*2); });
  geo.setAttribute('aBark7', new T.InstancedBufferAttribute(a, 4)); geo.setAttribute('aBark7b', new T.InstancedBufferAttribute(b, 2)); return geo; }

/* the trunk with its foot flared (pure/wood.js flareAt): today's 16-m cylinder, rows packed towards the foot, the bark's v kept by height */
export function trunkGeo(T){ const L=WOOD.trunk.len, g=new T.CylinderGeometry(WOOD.trunk.top, 1, L, 20, 9), p=g.attributes.position, uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), hb0=y+L/2, t=hb0/L, hb=L*Math.pow(t, 2.2), r0=lerp(1, WOOD.trunk.top, t), rr=Math.hypot(x,z);
    const k= rr>1e-6 ? lerp(1, WOOD.trunk.top, hb/L)/r0*flareAt(hb, Math.atan2(z,x)) : 1; p.setXYZ(i, x*k, hb-L/2, z*k); if(Math.abs(Math.abs(y)-L/2)>1e-6 || rr>1e-6) uv.setY(i, hb/L); }
  g.computeVertexNormals(); return g; }

/* ---------- the merged wood ---------- */
function builder(){ const pos=[], uv=[], w=[], cap=[], idx=[]; let n=0;
  const vert=(x,y,z,u,v,W,cx=0,cy=0)=>{ pos.push(x,y,z); uv.push(u,v); w.push(W[0],W[1],W[2]); cap.push(cx,cy); return n++; };
  /* a tube along pts [[x,y,z,rad]…] (rad may be a function (i, θ) → radius), `sides` round; uv: the bark's density (today's trunk: v 1 per 16 m,
     u 1 per 2.2 m round). ring(i, θ) may move a vertex (a broken top) */
  function tube(pts, sides, W, o={}){ const base=n, len=[0]; for(let i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2]));
    for(let i=0;i<pts.length;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], ty=b[1]-a[1], tz=b[2]-a[2]; const tl=Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
      let rx=0, ry=1, rz=0; if(Math.abs(ty)>0.9){ rx=1; ry=0; }
      let nx=ry*tz-rz*ty, ny=rz*tx-rx*tz, nz=rx*ty-ry*tx; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl; const bx=ty*nz-tz*ny, by=tz*nx-tx*nz, bz=tx*ny-ty*nx;
      for(let k=0;k<=sides;k++){ const th=k/sides*TAU, rad=typeof o.rad==='function' ? o.rad(i, th) : pts[i][3], c=Math.cos(th), s=Math.sin(th);
        let x=pts[i][0]+(nx*c+bx*s)*rad, y=pts[i][1]+(ny*c+by*s)*rad, z=pts[i][2]+(nz*c+bz*s)*rad; if(o.ring) [x,y,z]=o.ring(i, k, x, y, z);
        vert(x, y, z, k/sides*Math.max(0.12, TAU*rad/2.2), len[i]/16, W); } }
    for(let i=0;i<pts.length-1;i++) for(let k=0;k<sides;k++){ const a=base+i*(sides+1)+k, b=a+sides+1; idx.push(a, a+1, b, a+1, b+1, b); }   // outward (the ring turns from N to B, right-handed about the tangent)
    return base; }
  /* a cut end: a fan over ring `first` (its sides+1 vertices), facing `out` (1: the ring's forward end) */
  function capOver(first, sides, cx, cy, cz, W, out){ const c=vert(cx, cy, cz, 0, 0, W, 0, 0);
    for(let k=0;k<=sides;k++){ const j=first+k, th=k/sides*TAU; const v=vert(pos[j*3], pos[j*3+1], pos[j*3+2], 0, 0, W, Math.cos(th), Math.sin(th)); }
    for(let k=0;k<sides;k++){ const a=c+1+k; if(out>0) idx.push(c, a, a+1); else idx.push(c, a+1, a); } }
  /* a bracket fungus: a shelf (domed top, flat underside) at (x, y, z) facing angle a, size s */
  function shelf(x, y, z, a, s){ const W=[0, 2, 0], ca=Math.cos(a), sa=Math.sin(a), NT=8, NR=4, wd=1.2*s, dp=0.9*s, th=0.35*s;
    for(const top of [1, 0]){ const base=n;
      for(let j=0;j<=NR;j++) for(let i=0;i<=NT;i++){ const t=i/NT*Math.PI, rho=j/NR, lx=Math.cos(t)*rho*wd, lz=Math.sin(t)*rho*dp, ly= top ? th*Math.sqrt(Math.max(0,1-rho*rho))*0.6-0.12*rho*rho*s : -th*0.15*(1-rho*rho)-0.12*rho*rho*s;
        vert(x+lx*(-sa)+lz*ca, y+ly, z+lx*ca+lz*sa, 0, 0, W, i/NT, rho); }
      for(let j=0;j<NR;j++) for(let i=0;i<NT;i++){ const a0=base+j*(NT+1)+i, b0=a0+NT+1; if(top) idx.push(a0, b0, a0+1, a0+1, b0, b0+1); else idx.push(a0, a0+1, b0, a0+1, b0+1, b0); } } }
  function geo(T){ const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv,2));
    g.setAttribute('aW7', new T.Float32BufferAttribute(w,3)); g.setAttribute('aCap7', new T.Float32BufferAttribute(cap,2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  return { tube, capOver, shelf, geo, count:()=>n };
}
/* places (pure/wood.js woodPlaces) → the merged wood geometry */
function woodGeo(T, P){ const B=builder();
  for(const rt of P.roots) B.tube(rt.pts, 6, [0, 0, 0.6]);   // roots: live bark, moss on top
  for(const L of P.logs){ const S=16, pts=[], l=Math.hypot(L.b[0]-L.a[0], L.b[1]-L.a[1], L.b[2]-L.a[2]);
    for(let i=0;i<=14;i++){ const t=i/14; pts.push([lerp(L.a[0],L.b[0],t), lerp(L.a[1],L.b[1],t), lerp(L.a[2],L.b[2],t), lerp(L.r0,L.r1,t)*(1+0.06*Math.sin(t*l*2.1)+0.04*Math.sin(t*l*5.3))]); }
    const W=[0.3, 0, 1], first=B.tube(pts, S, W); B.capOver(first, S, ...L.a, [0.3, 1, 1], -1); B.capOver(first+14*(S+1), S, ...L.b, [0.3, 1, 1], 1); }
  for(const St of P.stumps){ const S=18, pts=[], tl=Math.tan(St.tilt);
    for(let i=0;i<=5;i++){ const t=i/5, hb=lerp(-0.1, St.h, t); pts.push([St.x, St.y+hb, St.z, St.r*(1+0.25*Math.exp(-(hb+0.1)*5))]); }
    const ring=(i, k, x, y, z)=>[x, i===5 ? y+((x-St.x)*Math.cos(St.rot)+(z-St.z)*Math.sin(St.rot))*tl : y, z], first=B.tube(pts, S, [0.3, 0, 0.4], { ring });
    B.capOver(first+5*(S+1), S, St.x, St.y+St.h, St.z, [0.3, 1, 0.4], 1); }
  for(const Sn of P.snags){ const S=16, NR=12, Rn=seeded(Sn.seed), jag=Array.from({ length:S+1 }, ()=>Rn()*0.7), pts=[];
    for(let i=0;i<=NR;i++){ const hb=lerp(0, Sn.H+0.2, i/NR); pts.push([Sn.x+Sn.lean*hb, Sn.y+hb+WOOD.trunk.foot, Sn.z, 0]); }
    const rad=(i, th)=>trunkRadius(Sn.s, lerp(0, Sn.H+0.2, i/NR), th+Sn.rot)*(1-0.25*i/NR), ring=(i, k, x, y, z)=>[x, i===NR ? y-jag[k%S] : y, z];
    const first=B.tube(pts, S, [1, 0, 0], { rad, ring }), top=pts[NR]; B.capOver(first+NR*(S+1), S, top[0], top[1]-0.45, top[2], [1, 1, 0], 1);
    for(let k=0;k<4;k++){ const a=Rn()*TAU, hy=2+Rn()*(Sn.H-3), r0=trunkRadius(Sn.s, hy)*0.9, dx=Math.cos(a), dz=Math.sin(a), up=0.2+Rn()*0.3, l=0.5+Rn()*0.8, ox=Sn.x+Sn.lean*hy+dx*r0, oy=Sn.y+hy, oz=Sn.z+dz*r0;
      B.tube([[ox, oy, oz, 0.07], [ox+dx*l*0.5, oy+up*l*0.5, oz+dz*l*0.5, 0.05], [ox+dx*l, oy+up*l, oz+dz*l, 0.025]], 6, [1, 0, 0]); } }
  const shapes=Array.from({ length:WOOD.twigs.variants }, (_,k)=>twigShape(k));
  for(const Tw of P.twigs){ const c=Math.cos(Tw.rot), s=Math.sin(Tw.rot), at=(lx, ly, lz)=>{ const x=Tw.x+(lx*c-lz*s)*Tw.s, z=Tw.z+(lx*s+lz*c)*Tw.s; return [x, bankGround(x,z)+ly*Tw.s, z]; };
    for(const [x0,y0,z0,x1,y1,z1,r0,r1] of shapes[Tw.k]) B.tube([[...at(x0,y0,z0), r0*Tw.s], [...at(x1,y1,z1), r1*Tw.s]], 5, [0.8, 0, 0.3]); }
  for(const K of P.brackets) B.shelf(K.x, K.y, K.z, K.a, K.s);
  return B.count() ? B.geo(T) : null; }

/* NIGHT-6 slice 7: limbs [[x0,y0,z0, x1,y1,z1, r0, r1]] → one merged geometry of thin tubes (5 sides) with the wood's look W (or null) */
export function limbGeo(T, limbs, W=[0, 0, 0]){ if(!limbs.length) return null; const B=builder(); for(const [x0,y0,z0,x1,y1,z1,r0,r1] of limbs) B.tube([[x0,y0,z0,r0], [x1,y1,z1,r1]], 5, W); return B.geo(T); }
/* a moss cushion: a bumpy half dome */
function cushionGeo(T){ const g=new T.SphereGeometry(1, 10, 4, 0, TAU, 0, Math.PI/2), p=g.attributes.position;   // light (the user, 2026-11-10: high made cheaper)
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), k=1+0.2*Math.sin(x*5.1+z*3.3)+0.12*Math.sin(x*11+z*9+y*4)+0.06*Math.sin(x*23+z*19+y*7); p.setXYZ(i, x*k, y*k*(0.75+0.25*y), z*k); }   // lumpy, flatter on top
  g.computeVertexNormals(); return g; }

/* ctx: { T, s, C, own, P (woodPlaces), barkMap, bumpMap, rockMat (the stream rocks' material), floorMat (or null), cast (casts the light's shadow) }
   → { state(), parts } */
export function buildWood(ctx){
  const { T, s, C, own, P, rockMat, floorMat }=ctx, WU={ ...woodUniforms(T, C), ...(ctx.FU||{}) }, d=new T.Object3D(), R=seeded(0x57444231);   // FU: the foxfire's uniforms (slice 9)
  /* the wood */
  const wg=woodGeo(T, P), woodM=patchLook(new T.MeshStandardMaterial({ map:ctx.barkMap||null, bumpMap:ctx.bumpMap||null, bumpScale:0.035, roughness:0.93 }), WU, true, 'handsong.wood7');
  const wood=wg ? new T.Mesh(wg, woodM) : null; own.push(woodM); if(wood){ own.push(wg); wood.castShadow=!!ctx.cast; wood.receiveShadow=true; s.add(wood); }
  /* moss cushions (the stream rocks' material: all moss) */
  const mg=cushionGeo(T), n=P.moss.length, mo=new T.InstancedMesh(mg, rockMat, Math.max(1, n));
  mg.setAttribute('aWater', new T.InstancedBufferAttribute(new Float32Array(Math.max(1,n)).fill(-9), 1)); mg.setAttribute('aMoss', new T.InstancedBufferAttribute(new Float32Array(Math.max(1,n)).fill(1), 1)); mg.setAttribute('aRock', new T.InstancedBufferAttribute(new Float32Array(Math.max(1,n)*4), 4)); own.push(mg);   // NIGHT-8: aRock 0 — the cushion keeps its own shape
  P.moss.forEach((m,i)=>{ d.position.set(m.x, m.y, m.z); d.rotation.set(0, m.rot, 0); d.scale.set(m.s, m.h, m.s*m.sq); d.updateMatrix(); mo.setMatrixAt(i, d.matrix); });
  mo.count=n; mo.receiveShadow=true; mo.frustumCulled=false; if(n) s.add(mo);
  /* ivy (the floor's material and its sheet's ivy cell) */
  const ig=new T.PlaneGeometry(1, 1); ig.translate(0, 0.5, 0); const m=P.ivy.length, cells=new Float32Array(Math.max(1,m)*4); for(let i=0;i<m;i++) cells.set(cellUv('ivy'), i*4);
  ig.setAttribute('aCell', new T.InstancedBufferAttribute(cells, 4)); own.push(ig);
  const iv=new T.InstancedMesh(ig, floorMat || new T.MeshBasicMaterial({ visible:false }), Math.max(1, m)), IW=FLOOR_ATLAS.world.ivy, c=new T.Color();
  P.ivy.forEach((v,i)=>{ d.position.set(v.x, v.y, v.z); d.rotation.set(0, Math.PI/2-v.a, v.roll, 'YXZ'); d.scale.set(IW.w*v.s, IW.h*v.s, 1); d.updateMatrix(); iv.setMatrixAt(i, d.matrix); iv.setColorAt(i, c.setScalar(0.95+R()*0.4)); });
  iv.count=m; iv.frustumCulled=false; iv.renderOrder=-0.5; if(floorMat && m) s.add(iv);
  const state=()=>({ roots:P.roots.length, logs:P.logs.length, bridge:P.logs.filter(l=>l.bridge).length, stumps:P.stumps.length, snags:P.snags.length, twigs:P.twigs.length, brackets:P.brackets.length,
    moss:n, ivy: floorMat ? m : 0, verts: wg ? wg.attributes.position.count : 0 });
  return { state, parts:{ wood, moss:mo, ivy:iv, material:woodM } };   // parts: probes only
}

/* the ground darkened by the prepared contact-shadow map (its red channel; WOOD.shade: the world rectangle it covers) — chained after the
   ground's other patches */
export function patchShade(mat, tex){ const prev=mat.onBeforeCompile, k=mat.customProgramCacheKey.call(mat), A=WOOD.shade;
  const U={ value:tex };
  mat.onBeforeCompile=(sh, r)=>{ if(prev) prev.call(mat, sh, r); sh.uniforms.uShade=U; sh.uniforms.uShadeA={ value:[A.x0, A.z0, A.w, A.d] };
    sh.vertexShader='varying vec2 vShXZ;\n'+sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vShXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    sh.fragmentShader='varying vec2 vShXZ;\nuniform sampler2D uShade;\nuniform vec4 uShadeA;\n'+sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { vec2 su=(vShXZ-uShadeA.xy)/uShadeA.zw; if(su.x>0.0 && su.x<1.0 && su.y>0.0 && su.y<1.0) diffuseColor.rgb*=texture2D(uShade, vec2(su.x, 1.0-su.y)).r; }`); };
  mat.userData.shadeU=U; mat.customProgramCacheKey=()=>k+'.shade'; return mat; }   // userData.shadeU: probes swap the map
