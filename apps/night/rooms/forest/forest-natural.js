/* FOREST-2 — THE FOREST'S OBJECTS MADE NATURAL (parts of the night forest room, only with the address word ?forest=new; forest.js NEW). Without
   the switch nothing here is called: every builder takes today's path, every shader today's source (browser row «FOREST switch off = today»).
   - THE NEW FILES (apps/night/rooms/forest/new/, CC0, register entry «forest-natural»; never in a player's start set): the rocks' detail
     (FOREST-1's, kept: the founder liked them) and two barks' relief.
   - THE BARK: on top of each trunk's own bark (NIGHT-8c) a CC0 bark's relief at its real scale — cracks darker, plates lighter, lit by its own
     slope — one of two barks per trunk, its own tile size and strength; moss creeping into the cracks on the damp side; LICHEN SPOTS (round
     crusts with a darker rim, each trunk its own amount, more on the dry side and on dead wood). The same for the merged wood (roots, logs,
     stumps, snags) and the canopy's limbs (one material).
   - MOSS CUSHIONS: each its own lumpy shape (the rocks' per-instance lobes, no worn faces), a finer mesh, fine clumps in the colour and the light.
   - STUMPS AND SNAGS: buttressed feet with root stubs sinking into the soil, an uneven bark, cut or broken tops with splinters.
   Colours: tokens (the wood's and the rocks' — nothing new). */
import { trunkRadius } from './pure/wood.js';
import { stumpShape, stumpRadius } from './pure/natural.js';   // the stump's shape: one law for the builder and the mushrooms' check
import { seeded } from '../../../../core/pure/dsp.js';

const TAU=2*Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
/* the files: name → url; per level which ones (the same at both: 512² detail) */
const NTEX=Object.freeze({ 'rock-col-512':new URL('./new/rock-col-512.jpg', import.meta.url), 'rock-nor-512':new URL('./new/rock-nor-512.jpg', import.meta.url), 'bark-1024x512':new URL('./new/bark-1024x512.jpg', import.meta.url),
  'foliage-1024':new URL('./new/foliage-1024.png', import.meta.url), 'foliage-512':new URL('./new/foliage-512.png', import.meta.url) });   // FOREST-2b: FOREST-1's CC0 foliage sheet (the young spruces)
export const NATURAL_TEX=Object.freeze({ full:Object.freeze({ rockC:'rock-col-512', rockN:'rock-nor-512', bark:'bark-1024x512', foliage:'foliage-1024' }), reduced:Object.freeze({ rockC:'rock-col-512', rockN:'rock-nor-512', bark:'bark-1024x512', foliage:'foliage-512' }) });
export const NATURAL_NEED=Object.freeze({ rockC:'rocks', rockN:'rocks', bark:'bark', foliage:'spruce' });   // FOREST-2b: each file only for its part (rocks are the default: their two files are in the start set)
const IMG={}, LOADING={}, ERR=[];
async function fileImage(url){ const r=await fetch(url); if(!r.ok) throw new Error(r.status+' '+url.pathname);
  const u=URL.createObjectURL(await r.blob()), img=new Image(); try{ img.src=u; await img.decode(); } finally { URL.revokeObjectURL(u); } return img; }
const filesOf=(level, parts=null)=>Object.entries(NATURAL_TEX[level]||NATURAL_TEX.full).filter(([k])=>!parts || parts.has(NATURAL_NEED[k])).map(([, n])=>n);
/* the new files of `level`, once per session (a failed one is forgotten: a later call asks again) → the images by name */
export function naturalAssets(level='full', parts=null){ return Promise.all(filesOf(level, parts).map(n=>LOADING[n] || (LOADING[n]=fileImage(NTEX[n]).then(img=>{ IMG[n]=img; }, e=>{ delete LOADING[n]; ERR.push(n+': '+String(e&&e.message||e)); })))).then(()=>IMG); }
export async function naturalHas(level='full', parts=null){ if(typeof navigator==='undefined' || !navigator.serviceWorker || !navigator.serviceWorker.controller || typeof caches==='undefined') return true;
  if(!(await caches.keys()).some(k=>k.startsWith('handsong-night-precache-'))) return true;   // no precache of this app (the repository's worker): the network serves
  for(const n of filesOf(level, parts)) if(!IMG[n] && !(await caches.match(NTEX[n].href))) return false; return true; }
export const naturalFilesDbg=()=>({ loaded:Object.keys(IMG).sort(), errors:ERR.slice() });
/* the level's images → { rockC, rockN, barkA, barkB } as three.js textures (the bark atlas cut into its two halves so each can repeat) */
export function naturalTextures(T, level, own, parts=null){ const P=NATURAL_TEX[level]||NATURAL_TEX.full, out={};
  const tx=(img, srgb)=>{ const t=new T.Texture(img); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; if(srgb) t.encoding=T.sRGBEncoding; t.needsUpdate=true; own.push(t); return t; };
  if(IMG[P.rockC]) out.rockC=tx(IMG[P.rockC], true); if(IMG[P.rockN]) out.rockN=tx(IMG[P.rockN], false);
  out.rockL=IMG[P.rockC] && typeof document!=='undefined' ? meanLum(IMG[P.rockC]) : 0.044;   // the stone's own mean (linear): the detail keeps today's brightness on average
  const B=IMG[P.bark]; if(B && typeof document!=='undefined'){ const half=k=>{ const c=document.createElement('canvas'); c.width=c.height=B.height; c.getContext('2d').drawImage(B, k*B.height, 0, B.height, B.height, 0, 0, B.height, B.height); return tx(c, false); }; out.barkA=half(0); out.barkB=half(1); }
  if(IMG[P.foliage]){ const t=new T.Texture(IMG[P.foliage]); t.encoding=T.sRGBEncoding; t.anisotropy=4; t.needsUpdate=true; own.push(t); out.foliage=t; }   // FOREST-2b: the spruces' sheet
  return out; }

/* an image's mean luminance in linear light (its 16 × 16 copy averaged; sRGB decoded) */
function meanLum(img){ const c=document.createElement('canvas'); c.width=c.height=16; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(img, 0, 0, 16, 16);
  const d=g.getImageData(0, 0, 16, 16).data, lin=v=>{ v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; let s=0; for(let i=0;i<d.length;i+=4) s+=0.299*lin(d[i])+0.587*lin(d[i+1])+0.114*lin(d[i+2]); return Math.max(1e-3, s/(d.length/4)); }
/* ---------- the bark (forest-wood.js patchLook takes these when WU.nat is given) ---------- */
export const NAT_UNI=(tex)=>({ uNatA:{ value:tex.barkA||null }, uNatB:{ value:tex.barkB||null } });
export const NAT_HEAD='uniform sampler2D uNatA, uNatB;\nfloat natH=0.0;\n';
/* before the look (inside main, after the map): the bark's relief — one of two barks per piece (its own offset of), a tile 0.42–0.7 m round and 1.6×
   that along, an integer count round a trunk (no seam), a strength per piece; cracks darker, plates lighter. Bark only (end grain and fungi keep theirs) */
export const NAT_PRE=`#ifdef WOOD7_NAT
  if(vW7.y<0.5){ float of7=vBk7b.x, pick=step(0.5, fract(of7*0.371+0.13)), sz=mix(0.42, 0.7, fract(of7*0.513+0.29)), kk=mix(0.6, 1.0, fract(of7*0.217+0.61));
    float P7=vMU7.z, N7= P7>0.0 ? max(1.0, floor(P7/sz+0.5)) : 0.0;
    vec2 q7=vec2(P7>0.0 ? vMU7.x*N7/P7 : vMU7.x/sz, vMU7.y/(sz*1.6)+of7*0.173);
    float r7=mix(texture2D(uNatA, q7).r, texture2D(uNatB, q7).r, pick); natH=(r7-0.5)*kk*(1.0-0.45*vW7.x);   // dead wood: a smoother, weathered relief
    diffuseColor.rgb*=clamp(1.0+natH*(natH<0.0 ? 0.28 : 0.55), 0.82, 1.3); }   // FOREST-2b: the grooves only a little darker — under the hand's light they brighten with the rest
#endif
`;
/* inside the look's bark branch, just before the moss is laid (its locals: q, fm, side, mh, mm, above, dead, of, lf, band): the moss creeps into the
   cracks on the damp side; the lichen spots — round crusts in cells of 9 cm, each trunk its own density, pale with a darker rim, on the dry side and dead
   wood, never under moss */
export const NAT_SPOTS=`#ifdef WOOD7_NAT
    mm=max(mm, smoothstep(-0.22, -0.42, natH)*side*mh*(0.3+0.7*vBk7.z)*0.45*max(0.0, 1.0-2.5*dead));   // live bark only, the deep cracks
    { vec2 g7=vec2(vMU7.x, vMU7.y)/0.07+vec2(0.0, of*3.1); vec2 gi=floor(g7), gf=fract(g7); float best=9.0, hh=1.0, rr=0.0; float N9= vMU7.z>0.0 ? max(3.0, floor(vMU7.z/0.07+0.5)) : 0.0;
      if(N9>0.0){ g7.x=vMU7.x*N9/vMU7.z; gi.x=floor(g7.x); gf.x=fract(g7.x); }
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 cc=gi+vec2(float(i), float(j)); if(N9>0.0) cc.x=mod(cc.x, N9);
        vec2 pn=vec2(float(i), float(j))+vec2(h28(cc+vec2(5.1, 9.7)), h28(cc+vec2(1.3, 2.9)))-gf; float dd=length(pn); if(dd<best){ best=dd; hh=h28(cc+vec2(17.0, 3.0)); rr=h28(cc+vec2(8.3, 8.9)); } }
      best+=0.22*(vn7(g7*2.7+of)-0.5);   // ragged, never round discs
      float dens=(0.05+0.17*fract(of*0.731+0.4))*smoothstep(0.42, 0.78, lf)*(1.0+0.9*dead)*(1.25-0.7*side)*smoothstep(0.25, 0.8, above)*(1.0-smoothstep(3.5, 5.5, above));   // in clusters where the crust grows
      float rad=0.12+0.16*rr, sp=(1.0-smoothstep(rad-0.06, rad, best))*step(hh, dens)*(1.0-mm);
      vec3 lc=mix(c, mix(uLichen, vec3(dot(uLichen, vec3(0.333))), 0.4)*(0.8+0.3*rr), 0.75);
      c=mix(c, lc, sp*0.42); }
#endif
`;
/* after the normal maps: the relief lit by its own slope (a height in metres; the screen-space derivative method — no tangents) */
export const NAT_NORMAL=`#ifdef WOOD7_NAT
  { vec3 dpx=dFdx(-vViewPosition), dpy=dFdy(-vViewPosition), R1=cross(dpy, normal), R2=cross(normal, dpx); float det=dot(dpx, R1); vec2 dH=vec2(dFdx(natH), dFdy(natH))*0.01;   // FOREST-2b: a shallow relief: no dark lines in the light
    normal=normalize(abs(det)*normal-sign(det)*(dH.x*R1+dH.y*R2)); }
#endif
`;

/* ---------- moss cushions ---------- */
/* a finer lumpy half dome (the rock shader then gives each its own lobes) */
export function cushionGeo2(T, fine=true){ const g=new T.SphereGeometry(1, fine ? 18 : 16, fine ? 7 : 6, 0, TAU, 0, Math.PI/2), p=g.attributes.position;   // FOREST-2b: today's cushion (radius 1, its lumps, its height) on a finer mesh   // Detailed 18 × 7, Standard 16 × 6
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i), k0=1+0.2*Math.sin(x*5.1+z*3.3)+0.12*Math.sin(x*11+z*9+y*4)+0.06*Math.sin(x*23+z*19+y*7), k=k0*(1-0.05*(1+Math.sin(x*41-z*37+y*11))-0.03*(1+Math.sin(x*67+z*59-y*13))); p.setXYZ(i, x*k, y*k*(0.75+0.25*y), z*k); }   // the fine clumps only cut in: never outside today's cushion (the mushrooms at the feet stay seen)
  g.computeVertexNormals(); return g; }
/* each cushion's [seed, 0, 0, −w] — negative: the rock shader's lobes without the worn faces (ROCK_DETAIL) */
export function cushionRock(n){ const a=new Float32Array(Math.max(1, n)*4), R=seeded(0x4D4F5332); for(let i=0;i<n;i++) a.set([R(), 0, 0, -(0.12+0.1*R())], i*4); return a; }

/* ---------- stumps and snags (forest-wood.js woodGeo's builder B) ---------- */
/* a stump (FOREST-2 «stumps»): a buttressed foot (5–7 lobes) that stays inside today's foot at the ground (at most 1.1 × its radius there, below it the
   lobes spread and sink: the mushrooms at its foot — today's, 1.15–1.45 × r out — stay outside), an uneven bark, today's slanted cut top a little
   ragged (the mushroom on its rim keeps its seat), 2–4 root stubs sinking into the soil, never towards one of its mushrooms (shrooms: today's wood
   mushrooms; theirs are the ones within 2 × r) */
export function natStump(B, St, ground, shrooms=[]){ const sh=stumpShape(St), R=sh.R, S=24, NR=9, tl=Math.tan(St.tilt), pts=[];
  const mine=shrooms.filter(p=>p.on==='stump' && Math.hypot(p.x-St.x, p.z-St.z)<2*St.r).map(p=>Math.atan2(p.z-St.z, p.x-St.x));
  const jag=Array.from({ length:S+1 }, ()=>0.012*R()); jag[S]=jag[0];
  for(let i=0;i<=NR;i++){ const t=i/NR, hb=-0.14+(St.h+0.14)*t; pts.push([St.x, St.y+hb, St.z, St.r]); }
  const rad=(i, th)=>stumpRadius(St, sh, -0.14+(St.h+0.14)*i/NR, th);
  const ring=(i, k, x, y, z)=>{ if(i<NR) return [x, y, z]; const top=((x-St.x)*Math.cos(St.rot)+(z-St.z)*Math.sin(St.rot))*tl; return [x, y+top-jag[k%S], z]; };
  const first=B.tube(pts, S, [0.3, 0, 0.2], { rad, ring });
  B.capOver(first+NR*(S+1), S, St.x, St.y+St.h, St.z, [0.3, 1, 0.4], 1);
  const angd=(a, b)=>Math.abs(((a-b)%TAU+TAU*1.5)%TAU-TAU/2);
  for(let k=0, n=2+Math.floor(R()*3);k<n;k++){ const a=(Math.round(R()*sh.nl)*TAU-sh.ph)/sh.nl, L=St.r*(0.9+R()*0.8), d0=St.r*0.6, P=[];   // root stubs out of the lobes, sinking (FOREST-2b: round, smooth, out of the foot)
    if(mine.some(m=>angd(m, a)<0.5)) continue;   // never over a mushroom
    for(let j=0;j<=12;j++){ const t=j/12, x=St.x+Math.cos(a)*(d0+L*t), z=St.z+Math.sin(a)*(d0+L*t); P.push([x, ground(x, z)+St.r*0.13*Math.pow(1-t, 1.5)-0.06*t*t, z, St.r*0.2*(1-0.75*Math.pow(t, 0.8))+0.012]); }
    B.tube(P, 14, [0.3, 0, 0.25]); } }   // 14 sides, 13 rings: a round stub tapering smoothly into the soil
/* a snag: today's lobed trunk (trunkRadius) with an uneven, cracked bark and a higher, splintered break */
export function natSnag(B, Sn, foot){ const S=20, NR=16, Rn=seeded(Sn.seed^0x5A5A), jag=Array.from({ length:S+1 }, (_,k)=>0.15+Rn()*1.1*(0.6+0.4*Math.sin(k/S*TAU*2+Sn.rot))), pts=[]; jag[S]=jag[0];
  for(let i=0;i<=NR;i++){ const hb=lerp(0, Sn.H+0.2, i/NR); pts.push([Sn.x+Sn.lean*hb, Sn.y+hb+foot, Sn.z, 0]); }
  const rad=(i, th)=>trunkRadius(Sn.s, lerp(0, Sn.H+0.2, i/NR), th+Sn.rot)*(1-0.25*i/NR)*(1+0.04*Math.sin(th*9+i*1.7)+0.025*Math.sin(th*21+i*0.9)-0.05*Math.pow(Math.max(0, Math.sin(th*3+Sn.rot*2)), 16));   // furrows and a long crack
  const ring=(i, k, x, y, z)=>[x, i===NR ? y-jag[k%S] : y, z], first=B.tube(pts, S, [1, 0, 0], { rad, ring }), top=pts[NR];
  B.capOver(first+NR*(S+1), S, top[0], top[1]-0.7, top[2], [1, 1, 0], 1);
  return Rn; }

/* ---------- the rocks and the moss cushions (forest-stream.js's rock material; ctx.rockC/rockN given) ---------- */
/* FOREST-1's rock detail, kept (the founder liked it): worn faces and strata (a boulder, not an egg), the CC0 stone mapped three ways (no stretching),
   moss on the tops only, ragged by the grain. FOREST-2: a moss cushion (aRock.w < 0) takes the lobes without the worn faces, and fine clumps in its
   colour and its light. sh: the shader being compiled (today's strings already in it) → changed in place */
export function natRock(sh, o={ rocks:true, moss:true }){ const RK=!!o.rocks, MS=!!o.moss;   // FOREST-2: rocks — the stone's detail; moss — the cushions' lobes and clumps
  let vs=sh.vertexShader;
  if(MS) vs=vs.replace('float rkR(vec3 n, vec4 k, out vec3 g){ float r=1.0; g=vec3(0.0);', 'float rkR(vec3 n, vec4 k0, out vec3 g){ vec4 k=vec4(k0.xyz, abs(k0.w)); bool cush=k0.w<0.0; float r=1.0; g=vec3(0.0);')
    .replace('float c=dot(n,d)-0.5; if(c>0.0){', 'float c=dot(n,d)-0.5; if(c>0.0 && !cush){');
  if(RK) vs=vs.replace('  return r; }', `  if(${MS ? '!cush' : 'true'}){ for(int i=0;i<3;i++){ vec3 e=normalize(rkH(k.x*41.0+float(i)*5.7)+vec3(0.0,0.35,0.0)); float q=dot(n,e)-0.45; if(q>0.0){ float a=k.w*0.75; r-=a*q*q; g-=2.0*a*q*e; } }   // worn faces — a boulder, not an egg
    { vec3 e=normalize(rkH(k.x*53.0+2.0)); float q=dot(n,e), a=k.w*0.06; r+=a*sin(q*9.0+k.x*20.0); g+=a*9.0*cos(q*9.0+k.x*20.0)*e; } }   // a slow ripple of strata
  return r; }`);
  sh.vertexShader='#define ROCK_DETAIL\n'+vs;
  const rockF=`  if(vMoss<0.5){ vec3 tw=pow(abs(vWN5), vec3(4.0)); tw/=tw.x+tw.y+tw.z; vec3 q=vWP5*1.6+vRock.x*7.0;   // three-way mapping (no stretching on any face)
    float lum=dot(texture2D(uRkC, q.zy).rgb*tw.x+texture2D(uRkC, q.xz).rgb*tw.y+texture2D(uRkC, q.xy).rgb*tw.z, vec3(0.299, 0.587, 0.114))/uRkL;   // 1 = the mean of the stone
    float cr=smoothstep(0.6, 0.25, lum); st*=clamp(0.5+0.5*lum, 0.4, 1.7)*(1.0-0.3*cr)/0.94;   // the grain of the stone and its dark crevices, the brightness of today on average (FOREST-1 read the raw texture: a quarter as bright)
    mt=smoothstep(0.55, 0.92, vWN5.y)*smoothstep(0.3, 0.62, vn(vWP5.xz*3.0+vWP5.y)+0.1*(lum-1.0))*(1.0-wet)*(0.35+0.65*vRock.z);   // moss on the tops only, ragged by the grain
    mc*=0.75+0.25*lum; }
`;
  const mossF=`  if(vMoss>0.5){ mossH=vn(vWP5.xz*70.0+vWP5.y*50.0)*0.55+vn(vWP5.xz*190.0-vWP5.y*140.0)*0.3+vn(vWP5.xz*18.0+vWP5.y*9.0)*0.15;   // FOREST-2: the clumps of a cushion — lighter tips, dark gaps
    mc*=0.9+0.7*mossH; mc=mix(mc, mc*vec3(1.25, 1.35, 0.75), smoothstep(0.55, 0.85, mossH)*0.75); }   // never darker than the cushion of today on average (the founder: nothing darkened)   // FOREST-2b: clumps with lit, yellow-green tips
`;
  sh.fragmentShader='#define ROCK_DETAIL\n'+(RK ? 'uniform sampler2D uRkC, uRkN;\nuniform float uRkL;\n' : '')+'float mossH=0.0;\n'+sh.fragmentShader
    .replace('  diffuseColor.rgb=mix(st, mc, mt); diffuseColor.rgb*=mix(1.0, 0.58, wet);', (RK ? rockF : '')+(MS ? mossF : '')+'  diffuseColor.rgb=mix(st, mc, mt); diffuseColor.rgb*=mix(1.0, 0.58, wet);')
    .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n'+(RK ? `  if(vMoss<0.5){ vec3 tw=pow(abs(vWN5), vec3(4.0)); tw/=tw.x+tw.y+tw.z; vec3 q=vWP5*1.6+vRock.x*7.0;
    vec3 a=texture2D(uRkN, q.zy).xyz*2.0-1.0, b=texture2D(uRkN, q.xz).xyz*2.0-1.0, c=texture2D(uRkN, q.xy).xyz*2.0-1.0;
    vec3 nw=normalize(vWN5+(vec3(0.0, a.y, a.x)*tw.x+vec3(b.x, 0.0, b.y)*tw.y+vec3(c.x, c.y, 0.0)*tw.z)*0.9); normal=normalize((viewMatrix*vec4(nw, 0.0)).xyz); }
` : '')+(MS ? `  if(vMoss>0.5){ vec3 dpx=dFdx(-vViewPosition), dpy=dFdy(-vViewPosition), R1=cross(dpy, normal), R2=cross(normal, dpx); float det=dot(dpx, R1); vec2 dH=vec2(dFdx(mossH), dFdy(mossH))*0.016;
    normal=normalize(abs(det)*normal-sign(det)*(dH.x*R1+dH.y*R2)); }
` : ''));
}
