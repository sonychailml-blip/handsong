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
import { WOOD, flareAt, twigShape, trunkRadius, woodPieces } from './pure/wood.js';
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
uniform vec3 uMossW, uLichen, uGrain, uGrainDark, uFungus, uFungusRim, uDead;
uniform float uBarkL;
float h28(vec2 p){ p=25.0*fract(p*0.3183099+vec2(0.71, 0.113)); return fract(p.x*p.y*(p.x+p.y)); }   // amplified and mixed: cells far apart never hash alike (data row «FOREST bark layouts»)
float vp8(vec2 p, float N){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); float i0=i.x, i1=i.x+1.0; if(N>0.5){ i0=mod(i0, N); i1=mod(i1, N); }
  return mix(mix(h28(vec2(i0, i.y)), h28(vec2(i1, i.y)), f.x), mix(h28(vec2(i0, i.y+1.0)), h28(vec2(i1, i.y+1.0)), f.x), f.y); }   // NIGHT-8c: value noise, period N cells in x (0: none)`;
/* NIGHT-9 probes: the shader's copy of the ground law (data row «FOREST relief (app)» reads its constants) */
export const gnd7Src=()=>{ const L=GLSL.split('\n'), i=L.findIndex(l=>l.startsWith('float gnd7')); return i<0 ? '' : L[i]+L[i+1]; };
/* the wood's look (fragment, after the map): w = (dead 0…1, kind 0 bark | 1 end grain | 2 fungus, moss on top 0…1), cap = the disc's or
   shelf's own coordinates. NIGHT-8c: the moss and the lichen of the trunks, branches AND the merged wood come from one law — each piece's own
   numbers (vBk7: reach, damp side, cover, patchiness; vBk7b: offset, tint — pure/wood.js barkMoss) over the piece's own surface coordinates
   (vMU7: metres round, metres along, the round period — seamless round a trunk), a warped two-octave field stretched along the grain, more in the
   bark's furrows (the map's own dark lines), denser low and on the damp face; the lichen a finer field, pale crust islands mid-trunk, more on the
   dry side and on dead wood, each trunk its own amount. vp8 hashes both cell coordinates together (h28, no near-repeat however far the pieces' offsets reach) and wraps round the trunk */
const LOOK=`{ vec3 wp=vWP7, wn=normalize(vWN7); float dead=vW7.x, kind=vW7.y, topM=vW7.z;
  float above=wp.y-gnd7(wp.xz); vec3 c=diffuseColor.rgb;
  float fur=0.5;
#ifdef USE_MAP
  fur=clamp(1.0-dot(texelColor.rgb, vec3(0.2126, 0.7152, 0.0722))/max(1e-4, uBarkL)*0.5, 0.0, 1.0);   // 1 in a dark furrow, 0 on a pale ridge
#endif
  c=mix(c, uDead*clamp(dot(c, vec3(0.3333))/0.16, 0.35, 2.0), dead*0.7);   // dead wood: greyer, paler
#ifdef WOOD7_KINDS
  if(kind>0.5 && kind<1.5){ float rho=length(vCap7), rg=fract(rho*9.0+0.6*vn7(vCap7*3.0)), crack=smoothstep(0.9, 0.97, vn7(vec2(atan(vCap7.y, vCap7.x)*3.0, rho*2.0)))*smoothstep(0.15, 0.5, rho);
    vec3 g=mix(uGrain, uGrainDark, smoothstep(0.72, 0.95, rg)+0.35*(1.0-smoothstep(0.0, 0.25, rho)));
    g=mix(g, uGrainDark*0.45, crack); g=mix(g, uDead*0.9, dead*0.45); c=mix(g, c, smoothstep(0.88, 0.97, rho)); }   // rings and cracks, the bark at the rim
  else if(kind>1.5){ float rho=vCap7.y, b=0.5+0.5*sin(rho*30.0+vn7(vec2(vCap7.x*8.0, rho*3.0))*3.0);
    c=mix(uFungus*0.55, uFungus, b*0.5+rho*0.5); c=mix(c, uFungusRim, smoothstep(0.86, 0.97, rho)); if(wn.y<-0.2) c=uFungusRim*0.8; }   // growth zones, a pale rim, pale pores below
#endif
  if(kind<1.5){
    float P=vMU7.z, N0= P>0.0 ? max(3.0, floor(P/0.7+0.5)) : 0.0, of=vBk7b.x;   // at least 3 cells round a thin trunk (1 left the field the same all round)
    vec2 q=vec2(P>0.0 ? vMU7.x*N0/P : vMU7.x/0.7, vMU7.y/1.1+of);   // cells ≈ 0.7 m round, 1.1 m along (an integer number round: no seam); of: this piece's own region
    vec2 wq=vec2(vp8(q*vec2(1.0, 0.5)+vec2(0.0, 5.2), N0), vp8(q*vec2(1.0, 0.5)+vec2(0.0, 11.7), N0)); q+=(wq-0.5)*vec2(0.9, 1.5);   // warped: no ovals
    float fm=0.55*vp8(q, N0)+0.3*vp8(q*2.0+vec2(0.0, 3.1), 2.0*N0)+0.15*vp8(q*4.0+vec2(0.0, 7.3), 4.0*N0);
    float side=smoothstep(-0.55, 0.75, dot(wn, vec3(cos(vBk7.y), 0.0, sin(vBk7.y))));   // the damp face
    float mh=1.0-smoothstep(0.0, max(0.2, vBk7.x*(0.8+0.7*fm)), above);   // denser low, a ragged upper edge
    float dens=clamp(mh*(0.35+0.65*side)*(0.45+0.9*vBk7.z), 0.0, 1.0), edge=mix(0.15, 0.05, vBk7.w);
    float mm=smoothstep(1.0-dens-edge, 1.0-dens+edge, fm+0.2*(fur-0.5));
#ifdef WOOD7_KINDS
    float top=smoothstep(0.15, 0.7, wn.y)*topM*(0.55+0.9*fm);
    if(kind>0.5) top*=smoothstep(0.82, 0.98, length(vCap7));   // a cut top: moss only at its rim
    mm=max(mm, smoothstep(0.3, 0.75, top))*(1.0-0.5*dead);
#endif
    vec2 lq=q*3.0+vec2(0.0, 19.0+of*0.37+1.6*(fm-0.5)+0.9*(wq.x-0.5));   // the big field bends the crust's rows: no flat edges along the lattice
    float lf=0.65*vp8(lq, 3.0*N0)+0.35*vp8(lq*2.0+vec2(0.0, 4.4), 6.0*N0);
    float lam=(0.3+0.7*fract(of*0.618+0.13))*(1.0-0.55*vBk7.z)*(1.0+0.8*dead)*(1.0-0.5*side);   // each trunk its own lichen; less on a mossy one
    float band=smoothstep(0.3, 1.2, above)*(1.0-smoothstep(3.0, 4.5+1.5*fm, above)), lt=0.8-0.24*lam;
    float lic=smoothstep(lt-0.07, lt+0.05, lf+0.12*(0.5-fur))*band*(1.0-mm);   // soft-edged crust islands on the ridges
    c=mix(c, mix(c, uLichen, 0.7)*(0.75+0.3*lf), lic*0.45);   // dim: it tints the bark rather than painting over it
    vec3 mc=uMossW*vec3(1.0+0.16*vBk7b.y, 1.0+0.03*vBk7b.y, 1.0-0.28*vBk7b.y); mc=mix(vec3(dot(mc, vec3(0.299, 0.587, 0.114))), mc, 0.62)*(0.62+0.55*fm);   // softer, less saturated, deeper in its cushions
    c=mix(c, mc, mm*0.88); }
  c*=mix(0.35, 1.0, smoothstep(-0.15, 0.9, above));   // darker where it meets the ground
  diffuseColor.rgb=c; }`;
/* NIGHT-8c probes: the look's source (data row «FOREST bark layouts (app)» reads what the moss and the lichen are made of) */
export const lookSrc=()=>LOOK;
/* the colour uniforms (tokens) */
export function woodUniforms(T, C){ const k=n=>({ value:new T.Color(C('forest-'+n)) }), bl=new T.Color(C('forest-bark')).convertSRGBToLinear();
  return { uMossW:k('moss'), uLichen:k('lichen'), uGrain:k('grain'), uGrainDark:k('grain-dark'), uFungus:k('fungus'), uFungusRim:k('fungus-rim'), uDead:k('deadwood'),
    uBarkL:{ value:0.2126*bl.r+0.7152*bl.g+0.0722*bl.b } }; }   // NIGHT-8c: the bark colour's own luminance (linear): the furrows read against it
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
    const VAR='varying vec4 vBk7;\nvarying vec2 vBk7b;\nvarying vec3 vMU7;\nvarying vec3 vWP7;\nvarying vec3 vWN7;\nvarying vec3 vW7;\nvarying vec2 vCap7;\n';
    /* NIGHT-8c: every piece's moss numbers (per instance for the bark, per vertex for the merged wood) and its surface coordinates vMU7: the bark's
       metres round (one turn = the period z, from the trunk's own turn, following its spiral) and along; the merged wood's from its uv (round, along, no period) */
    const MU= attrs ? 'vW7=aW7; vCap7=aCap7; vMU7=vec3(uv.x*2.2, uv.y*16.0, 0.0);'
      : 'vW7=vec3(0.0); vCap7=vec2(0.0);\n  #ifdef USE_INSTANCING\n    { float P7=6.2832*length(instanceMatrix[0].xyz); vMU7=vec3((uv.x+aBark7c.x+aBark7c.w*uv.y)*P7, position.y*length(instanceMatrix[1].xyz), P7); }\n  #endif\n';
    let vs=(attrs ? 'attribute vec3 aW7;\nattribute vec2 aCap7;\n' : 'attribute vec4 aBark7c;\n')+'attribute vec4 aBark7;\nattribute vec2 aBark7b;\n'+VAR+sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec4 w7=vec4(transformed,1.0); vec3 n7=objectNormal; vMU7=vec3(0.0);
  #ifdef USE_INSTANCING
    w7=instanceMatrix*w7; n7=mat3(instanceMatrix)*n7;
  #endif
    vWP7=(modelMatrix*w7).xyz; vWN7=normalize(mat3(modelMatrix)*n7); vBk7=aBark7; vBk7b=aBark7b; ${MU} }`);
    /* NIGHT-8c: the bark texture's mapping per trunk (pure/wood.js barkUv: turn, lift, scale, spiral); furrows ≈ 1.25 m apart round any trunk (an integer count: no seam) */
    if(!attrs) vs=vs.replace('#include <uv_vertex>', `#include <uv_vertex>
  #if defined(USE_UV) && defined(USE_INSTANCING)
    { float k7=clamp(floor(6.2832*length(instanceMatrix[0].xyz)/1.25+0.5), 1.0, 4.0); vUv=(uvTransform*vec3((uv.x+aBark7c.x+aBark7c.w*uv.y)*k7*0.5, uv.y*aBark7c.z+aBark7c.y*0.2, 1.0)).xy; }
  #endif`);
    sh.vertexShader=vs;
    sh.fragmentShader=(attrs ? '#define WOOD7_KINDS\n' : '')+VAR+GLSL+'\n'+sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n'+LOOK)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  if(vW7.y>1.5) roughnessFactor=0.7;');
    if(fox) sh.fragmentShader=`uniform vec4 uFox[${fox}];\nuniform vec3 uFoxCol;\nuniform float uFoxK, uFoxT;\n`+sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'+FOX(fox, law)); };
  mat.customProgramCacheKey=()=>key+(fox ? '.fox'+fox : ''); return mat; }
/* today's bark (trunks, branches): moss low on the trunk, lichen, darker at the foot. NIGHT-8b: each instance's moss from its attributes
   aBark7 (h, side, cover, patch) and aBark7b (off, tint); NIGHT-8c: + aBark7c (turn, lift, scale, spiral: its bark mapping) — barkAttrs puts
   barkMoss's and barkUv's numbers on an instanced geometry */
export const patchBark=(mat, WU)=>patchLook(mat, WU, false, 'handsong.bark9');
export function barkAttrs(T, geo, moss, uvs){ const n=Math.max(1, moss.length), a=new Float32Array(n*4), b=new Float32Array(n*2), u=new Float32Array(n*4);
  moss.forEach((m,i)=>{ a.set([m[0], m[1], m[2], m[3]], i*4); b.set([m[5], m[4]], i*2); u.set(uvs[i], i*4); });
  geo.setAttribute('aBark7', new T.InstancedBufferAttribute(a, 4)); geo.setAttribute('aBark7b', new T.InstancedBufferAttribute(b, 2)); geo.setAttribute('aBark7c', new T.InstancedBufferAttribute(u, 4)); return geo; }

/* the trunk with its foot flared (pure/wood.js flareAt): today's 16-m cylinder, rows packed towards the foot, the bark's v kept by height */
export function trunkGeo(T){ const L=WOOD.trunk.len, g=new T.CylinderGeometry(WOOD.trunk.top, 1, L, 20, 9), p=g.attributes.position, uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), hb0=y+L/2, t=hb0/L, hb=L*Math.pow(t, 2.2), r0=lerp(1, WOOD.trunk.top, t), rr=Math.hypot(x,z);
    const k= rr>1e-6 ? lerp(1, WOOD.trunk.top, hb/L)/r0*flareAt(hb, Math.atan2(z,x)) : 1; p.setXYZ(i, x*k, hb-L/2, z*k); if(Math.abs(Math.abs(y)-L/2)>1e-6 || rr>1e-6) uv.setY(i, hb/L); }
  g.computeVertexNormals(); return g; }

/* ---------- the merged wood ---------- */
/* NIGHT-8c: PM = { moss, uv } (pure/wood.js barkMoss / barkUv lists): each piece (piece() before it) its own moss numbers, written per vertex as the
   bark's are per instance (aBark7, aBark7b), and its own bark mapping, written into its uv */
function builder(PM){ const pos=[], uv=[], w=[], cap=[], idx=[], bk=[], bkb=[]; let n=0, pc=-1, cm=[0.2, 0, 0, 0, 0, 0], cu=[0, 0, 1, 0];
  const piece=()=>{ pc++; cm=PM.moss[pc%PM.moss.length]; cu=PM.uv[pc%PM.uv.length]; };
  const vert=(x,y,z,u,v,W,cx=0,cy=0)=>{ pos.push(x,y,z); uv.push(u,v); w.push(W[0],W[1],W[2]); cap.push(cx,cy); bk.push(cm[0], cm[1], cm[2], cm[3]); bkb.push(cm[5], cm[4]); return n++; };
  /* a tube along pts [[x,y,z,rad]…] (rad may be a function (i, θ) → radius), `sides` round; uv: the bark's density (today's trunk: v 1 per 16 m,
     u 1 per 2.2 m round). ring(i, θ) may move a vertex (a broken top) */
  function tube(pts, sides, W, o={}){ const base=n, len=[0]; for(let i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1], pts[i][2]-pts[i-1][2]));
    for(let i=0;i<pts.length;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], ty=b[1]-a[1], tz=b[2]-a[2]; const tl=Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
      let rx=0, ry=1, rz=0; if(Math.abs(ty)>0.9){ rx=1; ry=0; }
      let nx=ry*tz-rz*ty, ny=rz*tx-rx*tz, nz=rx*ty-ry*tx; const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl; const bx=ty*nz-tz*ny, by=tz*nx-tx*nz, bz=tx*ny-ty*nx;
      for(let k=0;k<=sides;k++){ const th=k/sides*TAU, rad=typeof o.rad==='function' ? o.rad(i, th) : pts[i][3], c=Math.cos(th), s=Math.sin(th);
        let x=pts[i][0]+(nx*c+bx*s)*rad, y=pts[i][1]+(ny*c+by*s)*rad, z=pts[i][2]+(nz*c+bz*s)*rad; if(o.ring) [x,y,z]=o.ring(i, k, x, y, z);
        const Cu=Math.max(0.12, TAU*rad/2.2), v=len[i]/16; vert(x, y, z, (k/sides+cu[0]+cu[3]*v)*Cu, v*cu[2]+cu[1]*0.2, W); } }   // NIGHT-8c: the piece's own turn, spiral, scale, lift
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
    g.setAttribute('aW7', new T.Float32BufferAttribute(w,3)); g.setAttribute('aCap7', new T.Float32BufferAttribute(cap,2));
    g.setAttribute('aBark7', new T.Float32BufferAttribute(bk,4)); g.setAttribute('aBark7b', new T.Float32BufferAttribute(bkb,2)); g.userData.pieces=pc+1; g.setIndex(idx); g.computeVertexNormals(); return g; }
  return { tube, capOver, shelf, geo, piece, count:()=>n, pieces:()=>pc+1 };
}
/* places (pure/wood.js woodPlaces) → the merged wood geometry */
function woodGeo(T, P){ const B=builder(woodPieces('wood'));
  for(const rt of P.roots){ B.piece(); B.tube(rt.pts, 6, [0, 0, 0.6]); }   // roots: live bark, moss on top
  for(const L of P.logs){ B.piece(); const S=16, pts=[], l=Math.hypot(L.b[0]-L.a[0], L.b[1]-L.a[1], L.b[2]-L.a[2]);
    for(let i=0;i<=14;i++){ const t=i/14; pts.push([lerp(L.a[0],L.b[0],t), lerp(L.a[1],L.b[1],t), lerp(L.a[2],L.b[2],t), lerp(L.r0,L.r1,t)*(1+0.06*Math.sin(t*l*2.1)+0.04*Math.sin(t*l*5.3))]); }
    const W=[0.3, 0, 1], first=B.tube(pts, S, W); B.capOver(first, S, ...L.a, [0.3, 1, 1], -1); B.capOver(first+14*(S+1), S, ...L.b, [0.3, 1, 1], 1); }
  for(const St of P.stumps){ B.piece(); const S=18, pts=[], tl=Math.tan(St.tilt);
    for(let i=0;i<=5;i++){ const t=i/5, hb=lerp(-0.1, St.h, t); pts.push([St.x, St.y+hb, St.z, St.r*(1+0.25*Math.exp(-(hb+0.1)*5))]); }
    const ring=(i, k, x, y, z)=>[x, i===5 ? y+((x-St.x)*Math.cos(St.rot)+(z-St.z)*Math.sin(St.rot))*tl : y, z], first=B.tube(pts, S, [0.3, 0, 0.4], { ring });
    B.capOver(first+5*(S+1), S, St.x, St.y+St.h, St.z, [0.3, 1, 0.4], 1); }
  for(const Sn of P.snags){ B.piece(); const S=16, NR=12, Rn=seeded(Sn.seed), jag=Array.from({ length:S+1 }, ()=>Rn()*0.7), pts=[];
    for(let i=0;i<=NR;i++){ const hb=lerp(0, Sn.H+0.2, i/NR); pts.push([Sn.x+Sn.lean*hb, Sn.y+hb+WOOD.trunk.foot, Sn.z, 0]); }
    const rad=(i, th)=>trunkRadius(Sn.s, lerp(0, Sn.H+0.2, i/NR), th+Sn.rot)*(1-0.25*i/NR), ring=(i, k, x, y, z)=>[x, i===NR ? y-jag[k%S] : y, z];
    const first=B.tube(pts, S, [1, 0, 0], { rad, ring }), top=pts[NR]; B.capOver(first+NR*(S+1), S, top[0], top[1]-0.45, top[2], [1, 1, 0], 1);
    for(let k=0;k<4;k++){ const a=Rn()*TAU, hy=2+Rn()*(Sn.H-3), r0=trunkRadius(Sn.s, hy)*0.9, dx=Math.cos(a), dz=Math.sin(a), up=0.2+Rn()*0.3, l=0.5+Rn()*0.8, ox=Sn.x+Sn.lean*hy+dx*r0, oy=Sn.y+hy, oz=Sn.z+dz*r0;
      B.tube([[ox, oy, oz, 0.07], [ox+dx*l*0.5, oy+up*l*0.5, oz+dz*l*0.5, 0.05], [ox+dx*l, oy+up*l, oz+dz*l, 0.025]], 6, [1, 0, 0]); } }
  const shapes=Array.from({ length:WOOD.twigs.variants }, (_,k)=>twigShape(k));
  for(const Tw of P.twigs){ B.piece(); const c=Math.cos(Tw.rot), s=Math.sin(Tw.rot), at=(lx, ly, lz)=>{ const x=Tw.x+(lx*c-lz*s)*Tw.s, z=Tw.z+(lx*s+lz*c)*Tw.s; return [x, bankGround(x,z)+ly*Tw.s, z]; };
    for(const [x0,y0,z0,x1,y1,z1,r0,r1] of shapes[Tw.k]) B.tube([[...at(x0,y0,z0), r0*Tw.s], [...at(x1,y1,z1), r1*Tw.s]], 5, [0.8, 0, 0.3]); }
  B.piece(); for(const K of P.brackets) B.shelf(K.x, K.y, K.z, K.a, K.s);
  return B.count() ? B.geo(T) : null; }

/* NIGHT-6 slice 7: limbs [[x0,y0,z0, x1,y1,z1, r0, r1]] → one merged geometry of thin tubes (5 sides) with the wood's look W (or null) */
export function limbGeo(T, limbs, W=[0, 0, 0]){ if(!limbs.length) return null; const B=builder(woodPieces('limbs')); for(const [x0,y0,z0,x1,y1,z1,r0,r1] of limbs){ B.piece(); B.tube([[x0,y0,z0,r0], [x1,y1,z1,r1]], 5, W); } return B.geo(T); }
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
