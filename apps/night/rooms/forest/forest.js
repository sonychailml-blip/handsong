/* VIS1c (RUN 6, Night plan §3) — THE NIGHT FOREST ROOM's picture: a scene module built with three.js r128 (vendored, loaded by the scene host
   apps/night/scene/host.js). NIGHT-3: the room's record (levels, mood looks, nature) is ./pure/room.js; its 2D stand-in ./standin.js. Re-laid from
   the «Rooms of light» prototype (docs/night/prototypes/, the strategist's own code — our starting source, user RUN 5) WITHOUT the animals:
   procedural ground (moss, soil, leaves), bark, instanced trunks and branches, ferns, mossy rocks, four mist sheets, the moon, fog; the hand's
   firefly light (core + halo + trail; a real shadow from the playing hand's light where the level allows) and a dimmer light for the effects
   hand; the wild fireflies from ./pure/fireflies.js (numbers — the shader only draws them); a slow parallax towards the light.
   Rules: every colour is a token (--cv-forest-*, read through the passed C = palette.cv; textures add numeric jitter around them); the light
   sits where the hand's REMAPPED play point is (the hit-tests' point, rule #12) at the depth from the hand's size (depthDistance) — placed
   through THIS camera, so it projects onto its note row exactly; only the light's world position saturates at the room's bounds (never the
   coordinates). Seeded (one seed per room): the same forest on every device. No sound, no song, no network here (VIS1 contract). */
import { seeded } from '../../../../core/pure/dsp.js';
import { fliesInit, fliesStep, forestGround, depthDistance, FOREST_FLIES, holdK, rateK, fliesDart } from './pure/fireflies.js';
import { CLOUD_PASSES, NIGHT, nightAt, nightDeep, MOOD_TC } from '../../pure/cycle.js';   // RUN 9: the night's cycle, sleep, the moods' easing
import { FOREST_ROOM } from './pure/room.js';   // NIGHT-3: the record — levels and the moods' looks
import { roomFov } from '../../pure/room.js';   // NIGHT-13: the lens law (the start still is placed by it too)
import { roomLook } from '../../pure/room.js';
import { buildLife, patchGroundWaves, patchSway, patchSoftEdges, patchWetGround } from './forest-life.js';   // RUN 9 (slice 2): the forest answers the playing
import { buildDetail } from './forest-detail.js';   // RUN 9 (slice 3): grass, leaves, moths, moonbeams, silhouettes
import { buildRare } from './forest-rare.js';
import { buildMirror } from './forest-mirror.js';   // NIGHT-9: the water's mirror   // RUN 9 (slice 4): the falling star, the flower, the emblem
import { buildAnswers } from './forest-answers.js';   // NIGHT-6 slice 1: dew and webs
import { buildFloor } from './forest-floor.js';
import { fernInSpruces, LEFT_PAIR } from './pure/spacing.js';   // FOREST-2e: plants apart
import { cullTargets, cullApply } from './forest-cull.js';
import { FOREST_CULL } from './pure/cull.js';   // FOREST-2e: the cull   // NIGHT-6 slice 3: the herb layer and the fine fern
import { buildStream } from './forest-stream.js';   // NIGHT-6 slice 4: rocks, pebbles, drifting leaves, the mist over the water
import { STREAM, STREAM_LINE, streamNear, bankGround, lifePlaces } from './pure/forestlife.js';
import { outOfWater } from './pure/stream.js';
import { ANSWERS, swellAt } from './pure/answers.js';
import { FOREST_SEED, ROCKS_TODAY, forestTrunks } from './pure/layout.js';   // NIGHT-6 slice 5: the seed and today's rocks, shared with the bake tool
import { woodPlaces, WOOD } from './pure/wood.js';
import { buildWood, patchBark, patchShade, trunkGeo, woodUniforms, barkAttrs } from './forest-wood.js';
import { barkMoss, barkUv } from './pure/wood.js';
import { seenTrunks, trunkBase } from './pure/trunkbase.js';   // FOREST-2c «roots»: a seen trunk and its roots as one surface   // NIGHT-8b: every trunk its own moss; NIGHT-8c: its own bark mapping
import { groundRoots, groundOcclusion } from './pure/relief.js';   // NIGHT-9: the ground's root bulges and occlusion
import { buildGust } from './forest-gust.js';   // NIGHT-6 slice 6: the effects hand moves the forest
import { buildCanopy, patchDapple } from './forest-canopy.js';   // NIGHT-6 slice 7: the canopy, the stars, the dappled moonlight
import { buildPaint } from './forest-paint.js';   // NIGHT-6 slice 8: the painted distance and the film
import { buildHidden, foxUniforms } from './forest-hidden.js';   // NIGHT-6 slice 9: hidden things the light finds
import { breathAt } from './pure/paint.js';   // NIGHT-6 slice 5: moss, roots, fallen wood, contact shadows
import { handLightK, HANDLIGHT_GLOW_OLD } from '../../pure/handlight.js';   // NIGHT-13: the hand's light brighter as its finger closes
import { patchGroundMacro, patchGroundNight } from './forest-ground.js';   // NIGHT-8: the bare ground's large scale
import { litterPlaces } from './pure/ground.js';   // NIGHT-8: leaves, pebbles and twigs on the ground
import { naturalAssets, naturalHas, naturalTextures, NAT_UNI } from './forest-natural.js';   // FOREST-2: the objects made natural (?forest=new only)
import { NATURAL, rootsOrganic, solidsOf, clearSpot, growersOn, keepSize, solids3Of, fernSpot, frondPoints, inSolid3, withCones, cardSpot, spraysClear, shroomsFree, rootTopAt, sightBlock, solidHit } from './pure/natural.js';
import { streamRocks } from './pure/stream.js';
import { SPRUCES } from './pure/spruce.js';   // FOREST-2b

export { FOREST_SEED };
export const FOREST_LEVELS=FOREST_ROOM.levels;   // NIGHT-3: what each level draws lives in the record
export const FOREST_BOUNDS=Object.freeze([-6, 6, 0.3, 4.2, -15, 3.8]);   // x, y, z ranges the light may reach (it saturates there)

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* NIGHT-6: the forest's prepared FILES (the user's rule: what never changes during play is prepared ahead and shipped — drawn by
   tools/forest-bake.mjs, registered in tools/licences.json), fetched once per session from our own origin; the room's load awaits them, so a
   build finds them ready. A missing file leaves its part dark, never the room. */
/* NIGHT-6 (the user, 2026-11-09): each texture's MASTER serves high, a smaller copy medium (the low copies wait for a WebGL low level); a
   level fetches only its own files */
const TEX=Object.freeze({ 'web-1024':new URL('./tex/web-1024.png', import.meta.url), 'web-512':new URL('./tex/web-512.png', import.meta.url),
  'floor-2048':new URL('./tex/floor-2048.png', import.meta.url), 'floor-1024':new URL('./tex/floor-1024.png', import.meta.url),
  'shade-2048':new URL('./tex/shade-2048.png', import.meta.url), 'shade-1024':new URL('./tex/shade-1024.png', import.meta.url),
  'crown-1024':new URL('./tex/crown-1024.png', import.meta.url), 'crown-512':new URL('./tex/crown-512.png', import.meta.url),
  'dapple-1024':new URL('./tex/dapple-1024.png', import.meta.url), 'dapple-512':new URL('./tex/dapple-512.png', import.meta.url),
  'moon-512':new URL('./tex/moon-512.png', import.meta.url), 'moon-256':new URL('./tex/moon-256.png', import.meta.url),
  'ground-2048':new URL('./tex/ground-2048.png', import.meta.url), 'ground-1024':new URL('./tex/ground-1024.png', import.meta.url),
  'groundn-2048':new URL('./tex/groundn-2048.png', import.meta.url), 'groundn-1024':new URL('./tex/groundn-1024.png', import.meta.url),
  'groundm-1024':new URL('./tex/groundm-1024.png', import.meta.url), 'groundm-512':new URL('./tex/groundm-512.png', import.meta.url),   // NIGHT-8: the ground's large scale
  /* NIGHT-9: the photo-scanned forest floor (CC0, Poly Haven «Leaves Forest Ground»; register entry forest-floor-scan): colour, normal, AO + roughness */
  'litter-col-2048':new URL('./scan/litter-col-2048.jpg', import.meta.url), 'litter-col-1024':new URL('./scan/litter-col-1024.jpg', import.meta.url),
  'litter-nor-2048':new URL('./scan/litter-nor-2048.jpg', import.meta.url), 'litter-nor-1024':new URL('./scan/litter-nor-1024.jpg', import.meta.url),
  'litter-arm-1024':new URL('./scan/litter-arm-1024.jpg', import.meta.url), 'litter-arm-512':new URL('./scan/litter-arm-512.jpg', import.meta.url) });
const GROUND_TILE=6;   // NIGHT-7: metres of floor one copy of the ground's files covers (tools/forest-bake.mjs GROUND.tile)
export const GROUND_ALBEDO=Object.freeze({ scan:0.27, baked:3.0 });   // NIGHT-9: the floors' colour scale, the same mean brightness at night
const SCAN_TILE=2.2;   // NIGHT-9: metres one copy of the scanned floor covers (photographed ≈ 1.26 m; a little larger reads at night and repeats less)
export const FOREST_TEX=Object.freeze({ full:Object.freeze({ web:'web-1024', floor:'floor-2048', shade:'shade-2048', crown:'crown-1024', dapple:'dapple-1024', moon:'moon-512', ground:'ground-2048', groundN:'groundn-2048', groundM:'groundm-1024', litter:'litter-col-1024', litterN:'litter-nor-1024', litterA:'litter-arm-1024' }),   // NIGHT-11 part 5: the scan at 1024 (2048 showed no visible change in the close view, f-close-foot)
  reduced:Object.freeze({ web:'web-512', floor:'floor-1024', shade:'shade-1024', crown:'crown-512', dapple:'dapple-512', moon:'moon-256', ground:'ground-1024', groundN:'groundn-1024', groundM:'groundm-512', litter:'litter-col-1024', litterN:'litter-nor-1024', litterA:'litter-arm-512' }) });
/* NIGHT-9: which bare floor a level draws — the photo-scanned one (levels' groundScan) or our baked one; a level fetches only that set's files.
   forestGroundDbg('scan' | 'baked' | null): captures and probes only (the comparison the user asked for); null = the level's own choice */
const SCAN_KEYS=['litter','litterN','litterA'], BAKED_KEYS=['ground','groundN'];
let groundOver=null; try{ if(typeof window!=='undefined' && (window.__groundSet==='scan' || window.__groundSet==='baked')) groundOver=window.__groundSet; }catch(e){}   // captures only (tools/ui-snap.mjs --ground)
export const forestGroundDbg=v=>{ groundOver= v==='scan' || v==='baked' ? v : null; return groundOver; };
const scanOf=level=> groundOver ? groundOver==='scan' : !!(FOREST_LEVELS[level]||FOREST_LEVELS.full).groundScan;
/* FOREST-2: THE SWITCHES — the address word ?forest=<words> (development and release editions alike), one word per change, combinable (?forest=rocks,bark
   or ?forest=rocks&forest=bark): rocks, roots, bark, moss (the cushions and the sprouts on the logs), stumps (stumps and snags), clear (the plants clear of
   solids); ?forest=new = all of them. Without any the forest is today's, to the bit (browser row «FOREST switch off = today»). forestNewDbg(v): probes and
   captures only — true / 'new' all, false none, a list or 'a,b' those; no argument reads it (false, or the list) */
export const FOREST_PARTS=Object.freeze(['rocks', 'roots', 'bark', 'moss', 'stumps', 'clear', 'spruce', 'grass']);
/* FOREST-2b (the founder's verdict): rocks and clear are the DEFAULT — every player's forest; the other words add to them; «old» = the approved
   forest before FOREST-2 (no part: equal to the pins, row «FOREST switch off = today»); «new» = every part. A list without «old» = the default + it */
export const FOREST_DEFAULT=Object.freeze(['rocks', 'clear', 'bark', 'moss', 'stumps', 'grass', 'roots', 'spruce']);   // FOREST-2c: + bark, moss, stumps, grass (the founder approved them)
const partsOf=v=>{ const S=new Set(); if(v===true) v='new'; if(v===false || v==null) return S; const W=(Array.isArray(v) ? v : String(v).split(',')).map(w=>String(w).trim()).filter(Boolean);
  if(!W.length) FOREST_DEFAULT.forEach(k=>S.add(k)); else if(!W.includes('old')) FOREST_DEFAULT.forEach(k=>S.add(k));
  for(const x of W){ if(x==='new') FOREST_PARTS.forEach(k=>S.add(k)); else if(x==='default') FOREST_DEFAULT.forEach(k=>S.add(k)); else if(FOREST_PARTS.includes(x)) S.add(x); } return S; };
let PARTS=partsOf(''); try{ if(typeof location!=='undefined') PARTS=partsOf(new URLSearchParams(location.search).getAll('forest').join(',')); }catch(e){}
export const forestNewDbg=v=>{ if(v!==undefined && v!==null) PARTS=partsOf(v); return PARTS.size ? FOREST_PARTS.filter(k=>PARTS.has(k)) : false; };   // false = the old forest; 'default'; a word = the default + it; true / 'new' = all
export const forestNewAssets=level=>naturalAssets(level, PARTS);
let CULL=true; try{ if(typeof location!=='undefined') CULL=!new URLSearchParams(location.search).getAll('forest').join(',').split(',').map(w=>w.trim()).includes('nocull'); }catch(e){}
export const forestCullDbg=v=>{ if(v!=null) CULL=!!v; return CULL; };   // FOREST-2e: the cull — leave out what no view ever shows; FOREST-2f: the DEFAULT (the founder), ?forest=nocull without it
let CULL_EXTRA=null; export const forestCullListDbg=v=>{ CULL_EXTRA=v||null; return CULL_EXTRA; };   // probes only: more instances to drop with the list ({ name:[indices] }: the row's CONTROL)
let APART=true; export const forestApartDbg=v=>{ if(v!=null) APART=!!v; return APART; };   // FOREST-2e: plants apart (the default); false — the probes' CONTROL only (the forest as at FOREST-2d)
const WOOD_MEMO=new Map(), LITTER_MEMO=new Map();   // NIGHT-8: + the litter's places per counts   // NIGHT-6 slice 5: the wood's places per counts (pure, seeded): worked out once per session
const IMG={}, LOADING={}, assetErr=[];
async function fileImage(url){ const r=await fetch(url); if(!r.ok) throw new Error(r.status+' '+url.pathname);
  const u=URL.createObjectURL(await r.blob()), img=new Image(); try{ img.src=u; await img.decode(); } finally { URL.revokeObjectURL(u); } return img; }
const levelFiles=level=>{ const all=FOREST_TEX[level]||FOREST_TEX.full, skip=scanOf(level) ? BAKED_KEYS : SCAN_KEYS; return Object.entries(all).filter(([k])=>!skip.includes(k)).map(([, n])=>n); };
/* the files of `level` ('full' | 'reduced'), once per session → a promise of the loaded images by name. NIGHT-14c: a failed file is forgotten, so a
   later call fetches it again (it may be in the precache by then) */
export function forestAssets(level='full'){
  const all=Promise.all(levelFiles(level).map(n=>LOADING[n] || (LOADING[n]=fileImage(TEX[n]).then(img=>{ IMG[n]=img; }, e=>{ delete LOADING[n]; assetErr.push(n+': '+String(e&&e.message||e)); })))).then(()=>IMG);
  return PARTS.has('rocks') || PARTS.has('bark') || PARTS.has('spruce') ? all.then(()=>naturalAssets(level, PARTS)).then(()=>IMG) : all; }   // FOREST-2: the new files only with the switch
/* NIGHT-14c: are `level`'s files here without asking the network? Under a precache (a worker in control) each must be in its cache; with no worker
   (the repository, Live Server) the network serves them as before → true. FOREST-2 (the founder's Detailed shown as Standard on Live Server): the
   repository's worker controls the page too but keeps NO precache (sw.js PRECACHE null) — no precache of this app at all means the network serves
   every file → true (a build's worker always has one) */
export const NIGHT_PRECACHE_PREFIX='handsong-night-precache-';   // sw.js PREFIX
export async function forestHas(level='full'){
  if(typeof navigator==='undefined' || !navigator.serviceWorker || !navigator.serviceWorker.controller || typeof caches==='undefined') return true;
  if(!(await caches.keys()).some(k=>k.startsWith(NIGHT_PRECACHE_PREFIX))) return true;
  for(const n of levelFiles(level)) if(!IMG[n] && !(await caches.match(TEX[n].href))) return false;
  return PARTS.has('rocks') || PARTS.has('bark') || PARTS.has('spruce') ? naturalHas(level, PARTS) : true; }
/* probes only: the prepared files loaded so far (the prefetch's proof) */
export const forestAssetsDbg=()=>Object.keys(IMG).sort();
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
  const NP=new Set(PARTS), nat=NP.size>0, has=k=>NP.has(k);   // FOREST-2: this build's switches (read once: a later toggle waits for the next opening)
  const C=opt.C, Lv={ ...(FOREST_LEVELS[opt.level]||FOREST_LEVELS.full), ...(opt.lv||{}) },   // RUN 9: opt.lv — measurement overrides only
    reduce=!!opt.reduce, R=seeded(FOREST_SEED), V=(x,y,z)=>new T.Vector3(x,y,z);
  const col=n=>new T.Color(C('forest-'+n));
  const own=[];   // everything to dispose
  const pick=FOREST_TEX[opt.level]||FOREST_TEX.full, files=opt.files||{ web:IMG[pick.web], floor:IMG[pick.floor], shade:IMG[pick.shade], crown:IMG[pick.crown], dapple:IMG[pick.dapple], moon:IMG[pick.moon], ground:IMG[pick.ground], groundN:IMG[pick.groundN], groundM:IMG[pick.groundM], litter:IMG[pick.litter], litterN:IMG[pick.litterN], litterA:IMG[pick.litterA] };   // NIGHT-9: + the scanned floor   // NIGHT-6: this level's prepared files (opt.files: a probe's own)
  const tex=(c,srgb,rx=1,ry=1)=>{ const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx,ry); t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; own.push(t); return t; };
  /* RUN 9: the PALETTE is the mood's look (the record's looks → tokens), eased towards a new mood's look (τ MOOD_TC s) */
  const looks=new Map(), lookCols=L=>{ let c=looks.get(L.pre); if(!c){ c={}; for(const [k,n] of Object.entries(L.tokens)) c[k]=new T.Color(C(n)); looks.set(L.pre,c); } return c; };
  let mlook=roomLook(FOREST_ROOM, opt.mood), fogK=mlook.fog, mistK=mlook.mist, fliesK=mlook.flies; const pal={}; for(const [k,v] of Object.entries(lookCols(mlook))) pal[k]=v.clone();
  const s=new T.Scene(); s.background=pal.fog; s.fog=new T.FogExp2(pal.fog.clone(), mlook.fog);
  const hemi=new T.HemisphereLight(pal.sky, pal.under, 0.26); s.add(hemi);
  const moonL=new T.DirectionalLight(pal.moon, 0.3); moonL.position.set(-10,20,-30); s.add(moonL);
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
  /* NIGHT-6 slice 4: a finer ground (160², 0.56 m) with the stream's bed carved in (bankGround) and its wetness per vertex (aWet: 1 at the water,
     0 0.7 m beyond the bank) — far from the stream exactly today's floor */
  const GS=Lv.groundSeg||160, gg=new T.PlaneGeometry(90,90,GS,GS); gg.rotateX(-Math.PI/2);   // NIGHT-9: finer at Detailed
  { const pa=gg.attributes.position, wet=new Float32Array(pa.count), bx=[Infinity,-Infinity], bz=[Infinity,-Infinity];
    for(const q of STREAM_LINE){ bx[0]=Math.min(bx[0],q.x-3); bx[1]=Math.max(bx[1],q.x+3); bz[0]=Math.min(bz[0],q.z-3); bz[1]=Math.max(bz[1],q.z+3); }
    for(let i=0;i<pa.count;i++){ const x=pa.getX(i), z=pa.getZ(i); if(x<bx[0] || x>bx[1] || z<bz[0] || z>bz[1]){ pa.setY(i, gy(x,z)); continue; }
      const dd=streamNear(x,z).d; pa.setY(i, bankGround(x, z, dd)); const u=Math.max(0, Math.min(1, (dd-STREAM.half)/0.7)); wet[i]=1-u*u*(3-2*u); }
    /* NIGHT-9: the trunks' root bulges (the mesh only — roots and moss at a foot sink into it a little) and the occlusion per vertex */
    if(Lv.groundAO){ const TR=forestTrunks(); groundRoots(pa, TR, (x,z)=>streamNear(x,z).d); pa.needsUpdate=true; gg.setAttribute('aAO7', new T.BufferAttribute(groundOcclusion(pa, GS, TR), 1)); }   // forestTrunks: the very trunks drawn below
    gg.setAttribute('aWet', new T.BufferAttribute(wet, 1)); gg.computeVertexNormals(); }
  /* NIGHT-7: the bare forest floor from its prepared files (colour + normal map, one copy every GROUND_TILE m); without them today's painted one */
  const fileTex=(img, srgb)=>{ const t=new T.Texture(img); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(90/GROUND_TILE, 90/GROUND_TILE); t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; t.needsUpdate=true; own.push(t); return t; };
  const scanOn=Lv.groundTex && scanOf(opt.level) && files.litter && files.litterN && files.litterA, nsc=Lv.groundSeg>160 ? 1.35 : 1;   // NIGHT-9: Detailed's relief stronger in the shading too
  const scanTex=(img, srgb)=>{ const t=fileTex(img, srgb); t.repeat.set(90/SCAN_TILE, 90/SCAN_TILE); return t; };
  if(scanOn) gg.setAttribute('uv2', gg.attributes.uv);
  const litterArm= scanOn ? scanTex(files.litterA, false) : null;   // NIGHT-11 part 5: ONE texture for the roughness and the occlusion (it was uploaded twice)   // the scan's occlusion map reads the second uv set (the same coordinates)
  const groundM= scanOn ? new T.MeshStandardMaterial({ map:scanTex(files.litter, true), normalMap:scanTex(files.litterN, false), normalScale:new T.Vector2(nsc, nsc), roughnessMap:litterArm, aoMap:litterArm, aoMapIntensity:0.85, roughness:1 })
    : Lv.groundTex && files.ground && files.groundN ? new T.MeshStandardMaterial({ map:fileTex(files.ground, true), normalMap:fileTex(files.groundN, false), normalScale:new T.Vector2(nsc, nsc), roughness:0.93 })
    : new T.MeshStandardMaterial({ map:tex(gc,true,24,24), bumpMap:tex(gb,false,24,24), bumpScale:0.05, roughness:0.95 });
  if(Lv.groundAO && Lv.groundTex && (scanOn || (files.ground && files.groundN))) groundM.color.setScalar(scanOn ? GROUND_ALBEDO.scan : GROUND_ALBEDO.baked);   // NIGHT-9: both floors at one night brightness (the scan's photo is ≈ 8× brighter in linear light than our baked colour)
  const ground=new T.Mesh(gg, groundM); ground.receiveShadow=true; s.add(ground); own.push(gg, groundM);
  /* bark */
  const [kc,k]=canvas2(256,512), [kb,kk]=canvas2(256,512); k.fillStyle=C('forest-bark'); k.fillRect(0,0,256,512); kk.fillStyle=grey(128); kk.fillRect(0,0,256,512);
  for(let i=0;i<260;i++){ const x=R()*256, wd=1+R()*4, dark=R()<0.65, ph=R()*6;
    for(const dx of [-256,0,256]){ k.strokeStyle=C(dark?'forest-bark-dark':'forest-bark-light'); kk.strokeStyle=dark?rgba([0,0,0],0.7):rgba([255,255,255],0.35); k.lineWidth=kk.lineWidth=wd;
      for(const c of [k,kk]){ c.beginPath(); for(let y=0;y<=512;y+=16){ const xx=x+dx+Math.sin(y*Math.PI/128+ph)*4; if(y) c.lineTo(xx,y); else c.moveTo(xx,y); } c.stroke(); } } }   // NIGHT-8c: two whole waves per tile — the tile joins itself (no ring every 3.2 m)
  const barkM=new T.MeshStandardMaterial({ map:tex(kc,true,2,5), bumpMap:tex(kb,false,2,5), bumpScale:0.035, roughness:0.95 }); own.push(barkM);
  const FU=foxUniforms(T, C, Lv.foxfire|0);   // NIGHT-6 slice 9: the foxfire's trail, shared by the bark and the wood
  const NT= has('rocks') || has('bark') || has('spruce') ? naturalTextures(T, opt.level, own, NP) : null, NU0= has('bark') && NT && NT.barkA ? NAT_UNI(NT) : null, NU= NU0 || has('moss') || has('stumps') ? { ...(NU0||{}), ...(has('moss') ? { uMossK:{ value:1.45 } } : {}), ...(has('stumps') ? { uStumpK:{ value:1 } } : {}) } : null;   // FOREST-2: the new files' textures, the bark's relief uniforms
  if(Lv.barkMoss) patchBark(barkM, NU ? { ...woodUniforms(T, C), ...FU, ...NU } : { ...woodUniforms(T, C), ...FU });   // NIGHT-6 slice 5: moss low on the trunk (NIGHT-8b: each its own), lichen higher, darker at the foot
  const spots=[[-2.1,-2.2,0.34],[2.5,-4.6,0.42],[-1.3,-8.2,0.3],[3.6,0.4,0.28],[-4.2,-5,0.5],[1.1,-11.5,0.36],[-3.3,1.2,0.22],[4.6,-9,0.46]];
  while(spots.length<95){ const x=(R()*2-1)*22, z=4-R()*44; if(Math.hypot(x,z-5.5)<3.2 || (Math.abs(x)<1.1 && z>-7)) continue; spots.push([x,z,0.14+R()*0.42]); }
  for(const sp of spots){ const [x,z]=outOfWater(sp[0], sp[1], STREAM.half+sp[2]+0.35); sp[0]=x; sp[1]=z; }   // NIGHT-6 slice 4: none stands in the new stream (no random draw changes)
  const trunkG= Lv.flare ? trunkGeo(T) : new T.CylinderGeometry(0.72,1,16,14), trunks=new T.InstancedMesh(trunkG, barkM, spots.length); own.push(trunkG);
  const brs=[], d=new T.Object3D();
  spots.forEach(([x,z,r],i)=>{ d.position.set(x,gy(x,z)+7.8,z); d.rotation.set((R()-0.5)*0.06,R()*6.28,(R()-0.5)*0.06); d.scale.set(r,1,r); d.updateMatrix(); trunks.setMatrixAt(i,d.matrix);
    if(z>-24) for(let b2=0;b2<(R()*3|0);b2++) brs.push([x,z,r,1.2+R()*4.5,R()*6.28,0.7+R()*1.8]); });
  /* NIGHT-8: THE LITTER — fallen leaves (with the drifting ones), pebbles (with the stream's stones), twigs (with the branches: no extra draw), placed by
     the ground's law (./pure/ground.js, its own seeded draws) */
  const lkey=[Lv.litterLeaves||0, Lv.litterPebbles||0, Lv.litterTwigs||0].join(); if(!LITTER_MEMO.has(lkey)) LITTER_MEMO.set(lkey, litterPlaces({ leaves:Lv.litterLeaves||0, pebbles:Lv.litterPebbles||0, twigs:Lv.litterTwigs||0 }, spots)); const litter=LITTER_MEMO.get(lkey);
  const brG=new T.CylinderGeometry(0.6,1,1,6), branches=new T.InstancedMesh(brG, barkM, brs.length+litter.twigs.length); own.push(brG);
  let BMK=null; if(Lv.barkMoss){ const nb=spots.length+brs.length+litter.twigs.length, BM=barkMoss(nb), BU=barkUv(nb); BMK={ BM, BU }; barkAttrs(T, trunkG, BM.slice(0, spots.length), BU.slice(0, spots.length)); barkAttrs(T, brG, BM.slice(spots.length), BU.slice(spots.length)); }   // NIGHT-8b: the moss per trunk (forestTrunks order), the branches' own after them; NIGHT-8c: + each one's bark mapping
  brs.forEach(([x,z,r,h,a,l],i)=>{ d.rotation.set(0,a,1.05+R()*0.35,'YXZ'); d.scale.set(0.035+r*0.06,l,0.035+r*0.06);
    const dirv=V(0,1,0).applyEuler(d.rotation); d.position.set(x,gy(x,z)+h,z).addScaledVector(dirv,l*0.5); d.updateMatrix(); branches.setMatrixAt(i,d.matrix); });
  litter.twigs.forEach((tw,i)=>{ d.rotation.set(0, tw.rot, Math.PI/2, 'YXZ'); d.scale.set(tw.r, tw.len, tw.r); d.position.set(tw.x, tw.y+tw.r*0.6, tw.z); d.updateMatrix(); branches.setMatrixAt(brs.length+i, d.matrix); });   // NIGHT-8: lying twigs
  for(const m of [trunks,branches]){ m.castShadow=m.receiveShadow=true; s.add(m); }
  /* ferns: instanced fronds with an alpha leaf texture */
  const [fc,f]=canvas2(128,512), FROND=rgbOf(C('forest-frond')); f.strokeStyle=C('forest-fern'); f.lineWidth=3; f.beginPath(); f.moveTo(64,512); f.quadraticCurveTo(70,260,62,8); f.stroke();
  for(let i=0;i<30;i++){ const t=i/30, y=505-t*495, len=Math.pow(1-t,0.7)*54+5, cx=64+Math.sin(t*3)*4; f.fillStyle=jit(FROND,(R()-0.5)*25,(R()-0.5)*12,(R()-0.5)*9);
    for(const sd of [-1,1]){ f.beginPath(); f.ellipse(cx+sd*len*0.5,y-len*0.18,len*0.5,len*0.13+2,sd*-0.35,0,6.28); f.fill(); } }
  const fernT=tex(fc,true); fernT.wrapS=fernT.wrapT=T.ClampToEdgeWrapping;
  const frondG=new T.PlaneGeometry(0.42,1.15); frondG.translate(0,0.575,0); own.push(frondG);
  const ferns=[]; while(ferns.length<80){ const x=(R()*2-1)*12, z=4-R()*26; if(Math.hypot(x,z-5.5)<2.2) continue; ferns.push([x,z,0.6+R()*0.9]); }
  for(const f of ferns){ const [x,z]=outOfWater(f[0], f[1], STREAM.half+0.3+f[2]*0.25); f[0]=x; f[1]=z; }   // NIGHT-6 slice 4: out of the water
  const fernsToday=nat ? ferns.map(f=>f.slice()) : null;   // FOREST-2: today's ferns (the herb layer is placed round them, then moved)
  /* FOREST-2: the solids every plant keeps clear of (pure/natural.js; no random draw: everything after stays as seeded) */
  const wkey0=JSON.stringify(['roots','logs','stumps','snags','twigs','moss','ivy','woodShrooms'].map(k=>Lv[k]||0)), wkeyN=wkey0+(has('roots') ? '.organic' : ''); let SOL=null, clr=null; const movedN={ ferns:0, plants:0, shrooms:[] };
  if(nat && !WOOD_MEMO.has(wkeyN)) WOOD_MEMO.set(wkeyN, has('roots') ? woodPlaces(Lv, spots, undefined, { roots:(t, p, Rr, nt, tr)=>rootsOrganic(t, p, Rr, nt, tr, lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').map(q=>[q.x, q.z]).concat((WOOD_MEMO.get(wkey0)||woodPlaces(Lv, spots)).shrooms.map(q=>[q.x, q.z]))), rootTop:rootTopAt }) : woodPlaces(Lv, spots));   // without «roots» the very places of today
  if(has('clear')){
    SOL=solidsOf({ trunks:spots, wood:WOOD_MEMO.get(wkeyN), rocks:streamRocks(Math.max(0, Lv.rocks|0)), aisle:ROCKS_TODAY });
    const blocks=sightBlock(lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').concat(WOOD_MEMO.get(wkeyN).shrooms));   // the mushrooms' lines of sight: kept free
    clr=(x, z, reach, o={})=>{ const r=clearSpot(x, z, reach, SOL, { ...o, avoid:blocks, inView:true }); if(!r[2]) return [x, z, 1]; movedN.plants++; return [r[0], r[1], keepSize(x, z, r[0], r[1], reach, SOL, o.low==null ? reach : o.low)]; };   // → [x, z, size factor]
  }
  const frondM=new T.MeshStandardMaterial({ map:fernT, alphaTest:0.45, side:T.DoubleSide, roughness:0.85 }), frondD=new T.MeshDistanceMaterial({ map:fernT, alphaTest:0.45, side:T.DoubleSide });
  const fronds=new T.InstancedMesh(frondG, frondM, ferns.length*7); fronds.customDistanceMaterial=frondD; own.push(frondM, frondD);
  const clrAvoid= has('clear') ? sightBlock(lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').concat(WOOD_MEMO.get(wkeyN).shrooms)) : null;
  const FR=[]; let S3=null; if(has('clear')){ S3=solids3Of({ trunks:spots, wood:WOOD_MEMO.get(wkeyN), rocks:streamRocks(Math.max(0, Lv.rocks|0)), aisle:ROCKS_TODAY, ground:gy });   // FOREST-2: each fern against its own fronds in 3D (the same draws as today, in the same order)
    let fi=0; for(const f of ferns){ const sc=f[2], a0=R()*6.28, fr=[]; FR.push(fr); for(let j=0;j<7;j++){ const tilt=0.75+R()*0.5, yaw=a0+j*0.9+R()*0.3; fr.push({ tilt, yaw, sx:sc, sy:sc*(0.8+R()*0.4) }); }
      { const r=fernSpot(f[0], f[1], fr, S3, gy, { eye:2.2, water:0.3+sc*0.25, box:[-12, 12, -22, 4], avoid:clrAvoid, reach:0.9*sc, height:0.85*sc });
        if(r[2]){ const E=NATURAL.clear.eye, k=Math.hypot(r[0]-E[0], r[1]-E[1])/Math.max(0.5, Math.hypot(f[0]-E[0], f[1]-E[1])), big=fr.map(q=>({ ...q, sx:q.sx*k, sy:q.sy*k }));   // a moved fern keeps its size on screen while it stays clear
          if(k>1) for(const f of [1, 0.75, 0.5, 0.25]){ const kt=1+(k-1)*f, bg=fr.map(q=>({ ...q, sx:q.sx*kt, sy:q.sy*kt })); if(!frondPoints(r[0], gy(r[0], r[1])-0.02, r[1], bg).some(p=>inSolid3(p[0], p[1], p[2], S3))){ fr.splice(0, fr.length, ...bg); break; } }   // the largest step of its size back that fits
          f[0]=r[0]; f[1]=r[1]; movedN.ferns++; } }
      for(const q of fr){ d.position.set(f[0], gy(f[0], f[1])-0.02, f[1]); d.rotation.set(q.tilt, q.yaw, 0, 'YXZ'); d.scale.set(q.sx, q.sy, q.sx); d.updateMatrix(); fronds.setMatrixAt(fi++, d.matrix); } } }
  else { let fi=0; for(const [x,z,sc] of ferns){ const a0=R()*6.28; for(let j=0;j<7;j++){ d.position.set(x,gy(x,z)-0.02,z); d.rotation.set(0.75+R()*0.5,a0+j*0.9+R()*0.3,0,'YXZ'); d.scale.set(sc,sc*(0.8+R()*0.4),sc); d.updateMatrix(); fronds.setMatrixAt(fi++,d.matrix); } } }
  fronds.castShadow=fronds.receiveShadow=true; s.add(fronds);
  /* today's aisle rocks: NIGHT-8 drawn with the stream's rounded stones (buildStream, ctx.aisle); each still takes its one draw of the seeded
     stream here, so everything drawn after keeps its look */
  const aisle=ROCKS_TODAY.map(([x,z,sz])=>({ x, y:gy(x,z)+sz*0.12, z, s:sz, sx:sz*1.3, sy:sz*0.6, sz, rot:R()*6, water:-9, wet:false }));   // NIGHT-6 slices 4–5: out of the water (pure/layout.js, shared with the bake tool)
  /* ground mist sheets at four depths */
  const [mc,mx]=canvas2(256,128);
  for(let i=0;i<70;i++){ const x=R()*256, y=40+R()*50, r=14+R()*30; for(const dx of [-256,0,256]){ const gr=mx.createRadialGradient(x+dx,y,0,x+dx,y,r); gr.addColorStop(0,C('mist-a12')); gr.addColorStop(1,C('halo-a0')); mx.fillStyle=gr; mx.fillRect(x+dx-r,y-r,r*2,r*2); } }
  const mists=[]; [-3,-8,-14,-21].forEach((z,i)=>{ const t=tex(mc,true); t.wrapT=T.ClampToEdgeWrapping; const pg=new T.PlaneGeometry(44,3.2), pm=new T.MeshBasicMaterial({ map:t, color:pal.haze.clone(), transparent:true, opacity:0.26, depthWrite:false });
    const m=new T.Mesh(pg,pm); m.position.set(0,0.9,z); s.add(m); mists.push([t,0.004+i*0.002,m,pm]); own.push(pg,pm); });
  /* the soft round glow (sprites) */
  const [hc,hx]=canvas2(128,128); { const gr=hx.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,C('halo-a100')); gr.addColorStop(0.18,C('halo-a45')); gr.addColorStop(0.5,C('halo-a10')); gr.addColorStop(1,C('halo-a0')); hx.fillStyle=gr; hx.fillRect(0,0,128,128); }
  const HALO=tex(hc,true);
  const sprite=(color,opacity=1,fog=true)=>{ const m=new T.SpriteMaterial({ map:HALO, color, opacity, transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog }); own.push(m); return new T.Sprite(m); };
  const moonS=sprite(pal.moonhalo.clone(),0.55,false); moonS.scale.set(16,16,1); moonS.position.set(-14,17,-55); s.add(moonS);
  /* RUN 9 (slice 1): THE MOON — a small bright disc inside its halo, drifting on the night's path (apps/night/pure/cycle.js); CLOUDS pass over it (soft
     dark sprites in front of it, normal blending: they hide the halo) and the moon's light dims with them and returns */
  const [dc,dx]=canvas2(64,64); { const gr=dx.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,C('halo-a100')); gr.addColorStop(0.62,C('halo-a100')); gr.addColorStop(0.8,C('halo-a10')); gr.addColorStop(1,C('halo-a0')); dx.fillStyle=gr; dx.fillRect(0,0,64,64); }
  let moonTex=null; if(files.moon && Lv.moonFace){ moonTex=new T.Texture(files.moon); moonTex.encoding=T.sRGBEncoding; moonTex.needsUpdate=true; own.push(moonTex); }   // NIGHT-6 slice 7: the moon's face (a prepared file)
  const moonD=new T.Sprite(new T.SpriteMaterial({ map:moonTex || tex(dc,true), color:pal.moonhalo.clone(), transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false })); own.push(moonD.material);
  moonD.scale.set(2.6,2.6,1); s.add(moonD);
  const [cc,cx]=canvas2(256,128); for(let i=0;i<26;i++){ const x=50+R()*156, y=40+R()*48, r=18+R()*34, gr=cx.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,C('halo-a45')); gr.addColorStop(1,C('halo-a0')); cx.fillStyle=gr; cx.fillRect(x-r,y-r,2*r,2*r); }
  const cloudT=tex(cc,true); cloudT.wrapS=cloudT.wrapT=T.ClampToEdgeWrapping;
  const clouds=CLOUD_PASSES.map(()=>{ const m=new T.SpriteMaterial({ map:cloudT, color:pal.cloud.clone(), transparent:true, opacity:0, depthWrite:false, fog:false }); own.push(m); const sp=new T.Sprite(m); sp.scale.set(15,6.5,1); sp.visible=false; s.add(sp); return sp; });
  /* the wild fireflies — positions from ./pure/fireflies.js */
  const flies=fliesInit(Lv.flies, FOREST_FLIES.seed);
  const fg=new T.BufferGeometry(); fg.setAttribute('position',new T.BufferAttribute(new Float32Array(flies.length*3),3)); fg.setAttribute('aGlow',new T.BufferAttribute(new Float32Array(flies.length),1));
  const fm=new T.ShaderMaterial({ uniforms:{ uColor:{ value:col('fly') }, uSize:{ value:0.13 }, uScale:{ value:500 }, uFog:{ value:0.035 } }, vertexShader:PV, fragmentShader:PF, transparent:true, depthWrite:false, blending:T.AdditiveBlending });
  const ff=new T.Points(fg,fm); ff.frustumCulled=false; s.add(ff); own.push(fg,fm);
  const wild=[0,1].map(()=>{ const l=new T.PointLight(col('wild'),0,3.2,2); s.add(l); return l; });
  /* the hands' lights: 0 = the playing hand (shadow-casting at full / reduced), 1 = the effects hand (dimmer, no shadow) */
  const small=Math.min(opt.w||800, opt.h||600)<600, SH= opt.shadow===false ? 0 : small ? Lv.shadowSmall : Lv.shadow;   // RUN 9: only high casts the light's shadow
  const rigs=[0,1].map(i=>{ const grp=new T.Group(), light=new T.PointLight(i ? col('fx') : col('light'), 0, i?4.5:7.5, 2);
    if(i===0 && SH){ light.castShadow=true; light.shadow.mapSize.set(SH,SH); light.shadow.bias=-0.005; light.shadow.camera.near=0.08; light.shadow.needsUpdate=true;   /* RELEASE-1: drawn once in the first frame — its shadow pass's programs compile there, not at the first hand (PERF-4's skip left them for the hand: 28 → 30, a stall) */
      own.push({ dispose:()=>{ if(light.shadow.map){ light.shadow.map.dispose(); light.shadow.map=null; } } }); }   // FULL CHECK: the renderer makes the shadow map; nothing freed it on leaving (one render target per build)
    const core=sprite(col('core')), halo=sprite(i?col('fx'):col('halo'),0.5); grp.add(core,halo); grp.visible=false; s.add(grp, light);   // RUN 9: the light stays in the scene (intensity 0 when off) — a light count that changes recompiles every lit shader
    const trail=[]; for(let j=0;j<Lv.trail;j++){ const t=sprite(col('trail'),0); t.scale.set(0.05,0.05,1); s.add(t); trail.push(t); }
    return { i, grp, light, core, halo, trail, hist:[], ht:0, cur:V(0,1.5,0), prev:V(0,1.5,0), tgt:V(0,1.5,0), on:0, glint:0, sat:false, d:0.5, gl:HANDLIGHT_GLOW_OLD }; });
  /* RUN 7 (C5): the effects hand seen in the forest (values from the bus «nightFx», published by the Night shell): Echo — soft rings of light
     leave the firefly at each echo of a note (timed from the echo's own delay and feedback, not from audio analysis); Warmth / Brightness —
     the light's colour, amber ↔ the firefly lime ↔ a cold green-white; Wave — the light trembles at the effect's own 4.5 Hz */
  let fxv={ echo:0, time:0.625, fb:0, tone:0.5, wave:0 }, now=0; const echoes=[];
  /* PERF-2: the playing hand's light casts its cube shadow (Detailed) — six renders of the forest a frame; while the light is out (intensity 0: no hand)
     it adds exactly nothing, so its shadow is not redrawn (shadow.autoUpdate; the frame it lights again redraws it first). shadowAll: always, as before */
  let shadowAll=false;   // PERF-4 (the founder approved, 2026-11-19): the skip applied (−13 ms a frame at Detailed; 264 bytes of 2.2 M differ). true = always, as before (shadowAllDbg)
  /* RUN 8 (slice 4): the forest answers the music GENTLY — each note adds to a slow energy (its velocity × 0.35, at most 1.5) that fades with
     τ 1.8 s: the wild fireflies glow up to +60 %, their two lights +50 %, the night sky +15 %. Nothing moves faster than the music. */
  let music=0;
  /* RUN 9 (slice 2): THE LIFE — ground waves, mushrooms and flowers, the stream (Echo's rings), the ferns' sway / Wave's shimmer
     (./forest-life.js); the wild fireflies GATHER to the playing light while notes come (call) and scatter slowly when they stop */
  /* NIGHT-6 slice 5: the wood's places (its mushrooms join today's in the life's draw) */
  const wkey=JSON.stringify(['roots','logs','stumps','snags','twigs','moss','ivy','woodShrooms'].map(k=>Lv[k]||0)); if(!WOOD_MEMO.has(wkey) && !nat) WOOD_MEMO.set(wkey, woodPlaces(Lv, spots)); const WP=WOOD_MEMO.get(nat ? wkeyN : wkey);   // FOREST-2: the organic roots
  const GR= has('roots') || has('moss') ? growersOn(WP, NATURAL.growers[opt.level]||NATURAL.growers.full, undefined, spots, sightBlock(lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').concat(WP.shrooms))) : null;   // FOREST-2: mushrooms at the roots' bases (roots), sprouts on the logs (moss)
  const WT= has('roots') || has('stumps') ? WOOD_MEMO.get(wkey)||woodPlaces(Lv, spots) : null;   // today's wood (a mushroom buried by a new shape is found against it)
  const fixShrooms= WT ? P0=>shroomsFree(P0, { roots:WP.roots, stumps:has('stumps') ? WP.stumps : null }, { roots:WT.roots }, gy, movedN.shrooms) : null;   // FOREST-2: every mushroom kept visible
  const nearMore= nat && opt.level==='reduced' ? (()=>{ const FL=FOREST_LEVELS.full, k=q=>q.x.toFixed(4)+','+q.z.toFixed(4), have=new Set(lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').map(k));   // FOREST-2c: Standard gets Detailed's near-right group of bright mushrooms (both stills show it)
    return lifePlaces(FL.shrooms, FL.blooms).filter(q=>q.kind==='shroom' && !have.has(k(q)) && q.x>0 && Math.hypot(q.x, q.z-5.5)<6.5); })() : [];
  const lifeFix= fixShrooms || nearMore.length ? P0=>{ const P1=fixShrooms ? fixShrooms(P0) : P0; return nearMore.length ? P1.concat(nearMore) : P1; } : null;
  const life= nat ? buildLife({ T, s, C, pal, own, canvas2, tex, lv:Lv, woodShrooms:has('roots') ? WP.shrooms.concat(GR.shrooms) : WP.shrooms, fix:lifeFix||undefined }) : buildLife({ T, s, C, pal, own, canvas2, tex, lv:Lv, woodShrooms:WP.shrooms }); patchGroundWaves(groundM, life.U); patchWetGround(groundM);   // NIGHT-6 slice 4: wet banks
  patchSway(frondM, life.U); patchSway(frondD, life.U);   // NIGHT-6 slice 5: restored (slice 4 had left these two behind a comment)
  const soft=!!Lv.softEdges && opt.gl2!==false; if(soft){ patchSoftEdges(frondM); fronds.renderOrder=-0.5; }   // NIGHT-6: soft cut-out edges (the level's switch; WebGL2)
  /* FOREST-2b «grass»: the blades at their own places at last — each kept out of every solid and out of every mushroom's line of sight (moved at most 0.6 m) */
  const grassFix= has('grass') ? (()=>{ const SG=SOL||solidsOf({ trunks:spots, wood:WP, rocks:streamRocks(Math.max(0, Lv.rocks|0)), aisle:ROCKS_TODAY }), sb=sightBlock(lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').concat(WP.shrooms));
    const bad=(px, pz, sc)=>!!solidHit(px, pz, 0.04, SG) || sb(px, pz, 0.04, sc+0.05) || streamNear(px, pz).d<STREAM.half+0.08 || Math.hypot(px, pz-5.5)<3.2;
    return (x, z, sc)=>{ if(!bad(x, z, sc)) return [x, z]; for(let k=1;k<=12;k++) for(let j=0;j<8+2*k;j++){ const a=j/(8+2*k)*6.2832, px=x+Math.cos(a)*k*0.05, pz=z+Math.sin(a)*k*0.05; if(!bad(px, pz, sc)) return [px, pz]; } return [x, z]; }; })() : null;
  const detail= grassFix ? buildDetail({ T, s, C, pal, own, canvas2, tex, lv:Lv, U:life.U, fernT, reduce, soft, grass:{ fix:grassFix } }) : buildDetail({ T, s, C, pal, own, canvas2, tex, lv:Lv, U:life.U, fernT, reduce, soft });   // RUN 9 (slice 3)
  /* NIGHT-6 slice 3: the forest floor — the herb layer and the fine fern, placed around today's trunks and ferns */
  let floorTex=null; if(files.floor && Object.keys(Lv).some(k=>['sorrel','forb','bilberry','anemone','nettle','sedge','fern2'].includes(k) && Lv[k]>0)){
    floorTex=new T.Texture(files.floor); floorTex.encoding=T.sRGBEncoding; floorTex.anisotropy=4; floorTex.needsUpdate=true; own.push(floorTex); }
  const floor= has('clear') || has('moss') ? buildFloor({ T, s, own, lv:Lv, trunks:spots, ferns, tex:floorTex, U:life.U, soft, clear:clr||undefined, avoid:clrAvoid||undefined, fernsToday:fernsToday||undefined, extra:has('moss') ? GR.sprouts : undefined, S3:S3||undefined }) : buildFloor({ T, s, own, lv:Lv, trunks:spots, ferns, tex:floorTex, U:life.U, soft });
  const stream= has('rocks') || has('moss') ? buildStream({ T, s, C, pal, own, lv:Lv, floorMat:floorTex ? floor.parts.material : null, aisle, litter, rockC:has('rocks') ? NT.rockC||null : null, rockN:has('rocks') ? NT.rockN||null : null, rockL:NT ? NT.rockL : 0.044, mossDetail:has('moss') }) : buildStream({ T, s, C, pal, own, lv:Lv, floorMat:floorTex ? floor.parts.material : null, aisle, litter });   // FOREST-2: the rocks' CC0 detail   // NIGHT-6 slice 4; NIGHT-8 today's aisle rocks join its stones, the litter's leaves and pebbles its draws
  life.waterRocks(stream.inWater);   // NIGHT-8: white water round the rocks in the stream
  const seenT= has('roots') && Lv.flare ? seenTrunks(spots, new Set(WP.roots.map(r=>r.tree))) : [];   // FOREST-2c: the trunks whose feet a player sees
  const wood= has('bark') || has('roots') || has('moss') || has('stumps') ? buildWood({ T, s, C, own, P:WP, barkMap:barkM.map, bumpMap:barkM.bumpMap, rockMat:stream.parts.rockMat, floorMat:floorTex ? floor.parts.material : null, cast:false, FU:NU ? { ...FU, ...NU } : FU, nat:{ ground:bankGround, light:!!Lv.softEdges, roots:has('roots'), stumps:has('stumps'), moss:has('moss'), shrooms:WP.shrooms, skip:new Set(seenT) } })
    : buildWood({ T, s, C, own, P:WP, barkMap:barkM.map, bumpMap:barkM.bumpMap, rockMat:stream.parts.rockMat, floorMat:floorTex ? floor.parts.material : null, cast:false, FU });   // NIGHT-6 slice 5; the wood stays out of the light's shadow pass (the user, 2026-11-10: high made cheaper)
  const bases=[]; if(seenT.length){ const m=new T.Matrix4(), z0=new T.Matrix4().makeScale(0, 0, 0);   // FOREST-2c: each seen trunk drawn as one grid with its roots, in the trunks' own material and frame
    for(const i of seenT){ trunks.getMatrixAt(i, m); const tb=trunkBase(m.elements.slice(), WP.roots.filter(r=>r.tree===i).map(r=>r.pts), bankGround, opt.level), g=new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(tb.pos, 3)); g.setAttribute('uv', new T.BufferAttribute(tb.uv, 2)); g.setIndex(tb.index); g.computeVertexNormals(); if(BMK) barkAttrs(T, g, [BMK.BM[i]], [BMK.BU[i]]);
      const mesh=new T.InstancedMesh(g, barkM, 1); mesh.setMatrixAt(0, m); mesh.castShadow=trunks.castShadow; mesh.receiveShadow=trunks.receiveShadow; s.add(mesh); own.push(g); bases.push({ tree:i, mesh, verts:tb.pos.length/3 }); trunks.setMatrixAt(i, z0); }
    trunks.instanceMatrix.needsUpdate=true; }
  /* NIGHT-6 slice 7: the canopy (crowns, the understorey, the stars) and the dappled moonlight on the ground */
  let crownTex=null; if(files.crown && Lv.crowns){ crownTex=new T.Texture(files.crown); crownTex.encoding=T.sRGBEncoding; crownTex.anisotropy=4; crownTex.needsUpdate=true; own.push(crownTex); }
  const spruce= has('spruce') && NT && NT.foliage ? { n:SPRUCES[opt.level]||SPRUCES.full, tex:NT.foliage, shrooms:lifePlaces(Lv.shrooms, Lv.blooms).filter(q=>q.kind==='shroom').concat(WP.shrooms, nearMore), apart:APART } : null;   // FOREST-2b; FOREST-2e apart (FOREST-2f: spruces no longer step aside for ferns — the ferns move)
  const canopy= has('clear') ? buildCanopy({ T, s, C, own, lv:Lv, trunks:spots, U:life.U, crownTex, woodMat:wood.parts.material, soft, clear:clr, reach:NATURAL.reach, tall:NATURAL.tall, sprays:q=>spraysClear(q, spots.map(([x, z, r])=>({ x, z, r, y0:gy(x, z)+WOOD.trunk.foot })).concat(WP.snags.map(S=>({ x:S.x, z:S.z, r:S.s, y0:S.y+WOOD.trunk.foot })))), clearKey:opt.level+(Lv.rocks|0), spruce }) : spruce ? buildCanopy({ T, s, C, own, lv:Lv, trunks:spots, U:life.U, crownTex, woodMat:wood.parts.material, soft, spruce }) : buildCanopy({ T, s, C, own, lv:Lv, trunks:spots, U:life.U, crownTex, woodMat:wood.parts.material, soft });
  /* FOREST-2e: PLANTS APART — a fern whose fronds enter a young spruce's cone moves to the nearest clear place from its place of today (the same
     search and limits as its clearing: solids, water, the eye, the mushrooms' sight, 1.76 m at most), a little smaller (×0.85, 0.7, 0.55) only where no
     place fits it whole; its seven fronds re-placed, no random draw (pure/spacing.js) */
  const apartN={ ferns:0, smaller:0, stuck:0, moved:{} }; if(APART && S3 && canopy.spruces && canopy.spruces.places.length){ const cones=canopy.spruces.places.map(p=>({ x:p.x, z:p.z, H:p.H, y0:bankGround(p.x, p.z) })), S3c=withCones(S3, cones), FR0=FR.map(fr=>fr && fr.map(q=>({ ...q })));   // FR0: the fronds before any move (the probes' test)
    ferns.forEach((f, i)=>{ const fr=FR[i]; if(!fr) return; const pts=(x, z, F)=>frondPoints(x, gy(x, z)-0.02, z, F); if(fernInSpruces(pts(f[0], f[1], fr), cones)<0) return;
      const sc=f[2], o0=fernsToday ? fernsToday[i] : f, cut=(x, z, F)=>pts(x, z, F).some(p=>inSolid3(p[0], p[1], p[2], S3c));   // from TODAY's place: «FOREST nothing lost» lets a fern move 1.8 m in all
      const pinF=LEFT_PAIR.ferns[i]; if(pinF){ const F=fr.map(q=>({ ...q, sx:q.sx*pinF.k, sy:q.sy*pinF.k })); if(!cut(pinF.x, pinF.z, F)){ fr.splice(0, fr.length, ...F); f[0]=pinF.x; f[1]=pinF.z; apartN.ferns++; if(pinF.k<1) apartN.smaller++; apartN.moved[i]=[o0[0], o0[1]]; apartN.pinned=i;
          fr.forEach((q, j)=>{ d.position.set(f[0], gy(f[0], f[1])-0.02, f[1]); d.rotation.set(q.tilt, q.yaw, 0, 'YXZ'); d.scale.set(q.sx, q.sy, q.sx); d.updateMatrix(); fronds.setMatrixAt(i*7+j, d.matrix); }); return; } }   // FOREST-2f: the left pair's fern, pinned (the same on both levels)
      let done=false; for(const [kk, rings] of [[1], [0.85], [0.7], [0.55], [1, 44], [0.85, 44], [0.7, 44], [0.55, 44], [0.85, 66], [0.7, 66]]){ const F=fr.map(q=>({ ...q, sx:q.sx*kk, sy:q.sy*kk })), r=cardSpot(o0[0], o0[1], (x, z)=>pts(x, z, F), S3c, { eye:2.2, water:0.3+sc*0.25, box:[-12, 12, -22, 4], avoid:clrAvoid, reach:0.9*sc*kk, height:0.85*sc*kk, rings });   // FOREST-2f: then up to 3.5 m, at last 5.3 m (declared: apartN.moved)
        if(cut(r[0], r[1], F) || (clrAvoid && (r[0]!==o0[0] || r[1]!==o0[1]) && clrAvoid(r[0], r[1], 0.9*sc*kk, 0.85*sc*kk, o0[0], o0[1]))) continue; fr.splice(0, fr.length, ...F); f[0]=r[0]; f[1]=r[1]; apartN.ferns++; if(kk<1) apartN.smaller++; if(rings) apartN.moved[i]=[o0[0], o0[1]]; done=true; break; }   // the nearest clear place at full size, else a little smaller; never one that hides a mushroom (the search's own fallback may)
      if(!done){ apartN.stuck++; return; }
      fr.forEach((q, j)=>{ d.position.set(f[0], gy(f[0], f[1])-0.02, f[1]); d.rotation.set(q.tilt, q.yaw, 0, 'YXZ'); d.scale.set(q.sx, q.sy, q.sx); d.updateMatrix(); fronds.setMatrixAt(i*7+j, d.matrix); }); });
    fronds.instanceMatrix.needsUpdate=true;
    apartN.why=i=>{ const f=ferns[i], fr=FR0[i], o0=fernsToday ? fernsToday[i] : f, sc=f[2], C=NATURAL.clear, R={ ok:0, cut:{}, water:0, eye:0, box:0, avoid:0 };   // probes only: why fern i finds no place (the rings to 5.3 m)
      for(let k=1;k<=66;k++){ const rr=k*C.step, na=8+4*k; for(let j=0;j<na;j++){ const a=j/na*6.2832, px=o0[0]+Math.cos(a)*rr, pz=o0[1]+Math.sin(a)*rr;
        if(px<-12 || px>12 || pz<-22 || pz>4){ R.box++; continue; } if(Math.hypot(px-C.eye[0], pz-C.eye[1])<2.2){ R.eye++; continue; } if(streamNear(px, pz).d<STREAM.half+0.3+sc*0.25){ R.water++; continue; }
        const hit=frondPoints(px, gy(px, pz)-0.02, pz, fr).map(p=>inSolid3(p[0], p[1], p[2], S3c)).find(Boolean); if(hit){ R.cut[hit]=(R.cut[hit]||0)+1; continue; }
        if(clrAvoid && clrAvoid(px, pz, 0.9*sc, 0.85*sc, o0[0], o0[1])){ R.avoid++; continue; } R.ok++; if(!R.first) R.first=[px, pz, k]; } }
      const pts=(x, z)=>frondPoints(x, gy(x, z)-0.02, z, fr), r=cardSpot(o0[0], o0[1], pts, S3c, { eye:2.2, water:0.3+sc*0.25, box:[-12, 12, -22, 4], avoid:clrAvoid, reach:0.9*sc, height:0.85*sc, rings:66 });
      R.test=(px, pz, kk=1)=>{ const F=fr.map(q=>({ ...q, sx:q.sx*kk, sy:q.sy*kk })), hit=frondPoints(px, gy(px, pz)-0.02, pz, F).map(p=>inSolid3(p[0], p[1], p[2], S3c)).find(Boolean); if(hit) return hit; if(streamNear(px, pz).d<STREAM.half+0.3+sc*0.25) return 'water'; if(clrAvoid && clrAvoid(px, pz, 0.9*sc*kk, 0.85*sc*kk, o0[0], o0[1])) return 'hides a mushroom'; return 'ok'; };
      R.search=[r[0], r[1], r[2], pts(r[0], r[1]).some(p=>inSolid3(p[0], p[1], p[2], S3c)), !!(clrAvoid && clrAvoid(r[0], r[1], 0.9*sc, 0.85*sc, o0[0], o0[1]))]; R.o0=o0.slice(0, 2); return R; }; }
  let dapTex=null; const DU={ uDap:{ value:null }, uDapK:{ value:0 }, uDapT:{ value:0 }, uDapCol:{ value:pal.moonhalo } };
  if(files.dapple && Lv.dapple){ dapTex=new T.Texture(files.dapple); dapTex.wrapS=dapTex.wrapT=T.RepeatWrapping; dapTex.format= opt.gl2!==false ? T.RedFormat : T.RGBAFormat; dapTex.needsUpdate=true; own.push(dapTex); DU.uDap.value=dapTex; patchDapple(groundM, DU); }
  const gust=buildGust({ T, s, own, lv:Lv, U:life.U, floorMat:floorTex ? floor.parts.material : null, life, reduce });   // NIGHT-6 slice 6
  let shadeTex=null; if(files.shade && Lv.shade){ shadeTex=new T.Texture(files.shade); shadeTex.format= opt.gl2!==false ? T.RedFormat : T.RGBAFormat; shadeTex.needsUpdate=true; own.push(shadeTex); patchShade(groundM, shadeTex); }   // one channel where WebGL2 allows
  /* NIGHT-8: the ground's large scale — LAST of the ground's patches (it takes the map's own line; the contact shadows' patch keeps its place after it) */
  let macroTex=null, macroU=null; if(files.groundM && Lv.groundMacro && Lv.groundTex && (files.ground || scanOn)){ macroTex=new T.Texture(files.groundM); macroTex.needsUpdate=true; own.push(macroTex); macroU=patchGroundMacro(T, groundM, macroTex, C); }
  patchGroundNight(T, groundM, C, { ao:!!(Lv.groundAO && gg.attributes.aAO7), wet:true });   // NIGHT-9: occlusion, the night grade, the wet line (last)
  const rare=buildRare({ T, s, C, pal, own, canvas2, tex, halo:HALO });   // RUN 9 (slice 4)
  let gather=0, playing=false, rel=0;
  /* NIGHT-6 slice 2: THE MELODY — the held seconds of the playing note (the host), the note-on times of the last window, and their eased
     inputs to the firefly law (hold, rate); darts — how many notes sent flies out */
  let heldNow=0, holdE=0, rateE=0, darts=0; const noteT=[];
  const LC=col('light'), WARM=col('warm'), COLD=col('cold'), HC=col('halo'), lc=new T.Color(), hlc=new T.Color();
  const rings=[]; for(let j=0;j<8;j++){ const sp=sprite(col('trail'),0); sp.visible=false; s.add(sp); rings.push({ sp, t0:-1, amp:0 }); }
  /* the camera: the prototype's place and lean; portrait gets a wider view */
  const camPos=V(0,1.55,5.5), camLook=V(0,1.35,-6), camera=new T.PerspectiveCamera(55,1,0.05,120), camOff=V(0,0,0), camGoal=V(0,0,0), look=V(0,0,0);
  /* NIGHT-6 slice 1: dew and webs (the webs hang beside the trunks above); the music bed's events wait here until they are heard */
  let webTex=null; if(files.web && (Lv.webs||0)>0){ webTex=new T.Texture(files.web); webTex.encoding=T.sRGBEncoding; webTex.needsUpdate=true; own.push(webTex); }
  const answers=buildAnswers({ T, s, own, lv:{ dew:Lv.dew||0, webs:Lv.webs||0 }, trunks:spots, webTex, cam:[camPos.x, camPos.y, camPos.z] });
  const bedQ=[], fired=[], twinkles=[], glow1=new Float32Array(flies.length); let glassN=0, tLast=-Infinity;
  const ray=new T.Raycaster(), ndc=new T.Vector2(), fwd=V(0,0,0), tmp=V(0,0,0);
  let W=opt.w||800, H=opt.h||600, pxH=H;
  let viewOver=null;   // NIGHT-8, captures only: { pos, look } — a fixed close view (viewDbg); NIGHT-13: { rest:true, fov } — the camera at rest through another lens (the start still)
  /* NIGHT-13: THE CAMERA AT REST — while the start still hands over (host sceneRest), the camera holds the pose the still was drawn from: no lean towards
     the light, no breath; let go, the lean and the breath come back gently (motionK over REST_TC seconds) */
  const REST_TC=2, goalOf=(f0, out)=>{ out.set(clamp(f0.x,-4,4)*0.16, (clamp(f0.y,0,5)-1.7)*0.1, 0); if(reduce) out.multiplyScalar(0.3); return out; };
  let restOn=false, motionK=1;
  function aimCamera(){ if(viewOver && viewOver.rest){ const o=goalOf(camLook, V(0,0,0)); camera.position.copy(camPos).add(o); look.copy(camLook).addScaledVector(o,-1.2); camera.lookAt(look); camera.updateMatrixWorld(); return; }
    if(viewOver){ camera.position.set(...viewOver.pos); camera.lookAt(...viewOver.look); camera.updateMatrixWorld(); return; } camera.position.copy(camPos).add(camOff); look.copy(camLook).addScaledVector(camOff,-1.2); camera.lookAt(look); camera.updateMatrixWorld(); }
  function resize(w,h,bufH){ W=w; H=h; pxH=bufH||h; camera.aspect=w/h; camera.fov= viewOver && viewOver.fov ? viewOver.fov : roomFov(FOREST_ROOM.view, w, h); camera.updateProjectionMatrix();   // NIGHT-13: the record's lens law (was 68 below 0.8, else 55)
    fm.uniforms.uScale.value=pxH/(2*Math.tan(camera.fov*Math.PI/360)); life.resize(fm.uniforms.uScale.value); canopy.resize(fm.uniforms.uScale.value); aimCamera();
    /* NIGHT-13: the silhouettes are pinned from the camera AT REST (not wherever it leaned at this moment) — the start still's screen layer draws them there */
    if(!viewOver || viewOver.rest){ const keep=camOff.clone(); goalOf(camLook, camOff); aimCamera(); detail.resize(w, h, camera, fm.uniforms.uScale.value); camOff.copy(keep); aimCamera(); }
    else detail.resize(w, h, camera, fm.uniforms.uScale.value); answers.resize(fm.uniforms.uScale.value); }
  /* the hand's play point (canvas pixels px, py) and depth 0…1 → the light's world place on THIS camera's ray (it projects back onto the
     point); saturates at the room's bounds and the ground → out; returns true when it saturated */
  function place(px, py, d01, out){
    ndc.set(px/W*2-1, -(py/H)*2+1); ray.setFromCamera(ndc, camera); camera.getWorldDirection(fwd);
    const D=depthDistance(d01), t=D/ray.ray.direction.dot(fwd);
    out.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
    const B=FOREST_BOUNDS, x=clamp(out.x,B[0],B[1]), y0=clamp(out.y,B[2],B[3]), z=clamp(out.z,B[4],B[5]), y=Math.max(y0, gy(x,z)+0.25);
    const sat= x!==out.x || y!==out.y || z!==out.z; out.set(x,y,z); return sat;
  }
  const lightsOf=()=>rigs.map((r,i)=>i ? { x:r.cur.x, y:r.cur.y, z:r.cur.z, on:r.on } : { x:r.cur.x, y:r.cur.y, z:r.cur.z, on:r.on, call:playing ? gather : 0, scatter:playing ? 0 : rel, hold:holdE, rate:rateE });
  /* RUN 9 (slice 1): THE NIGHT — once per frame from apps/night/pure/cycle.js: the moon's place and light under the clouds, the mist layers, the sleep
     timer's depth, the mood's look (eased) */
  let nt=null, deep=nightDeep(0), moodId=opt.mood||null, fkNow=1;
  function night(dt, t, nin){
    const N=nightAt(t); nt=N; deep=nightDeep(nin && nin.sleep);
    if(nin && nin.mood!==undefined && nin.mood!==moodId){ moodId=nin.mood; mlook=roomLook(FOREST_ROOM, moodId); }
    const a=1-Math.exp(-dt/MOOD_TC), tc=lookCols(mlook);
    for(const k in pal) pal[k].lerp(tc[k], a);
    fogK+=(mlook.fog-fogK)*a; mistK+=(mlook.mist-mistK)*a; fliesK+=(mlook.flies-fliesK)*a;
    const avg=N.mist.reduce((x,y)=>x+y,0)/N.mist.length, ml=N.moonLight;
    s.fog.color.copy(pal.fog); hemi.color.copy(pal.sky); hemi.groundColor.copy(pal.under); s.fog.density=fogK*(0.92+0.16*avg)*(1+0.25*deep.e);
    moonS.position.set(N.moon[0],N.moon[1],N.moon[2]); moonD.position.set(N.moon[0],N.moon[1],N.moon[2]+0.5);
    moonS.material.color.copy(pal.moonhalo); moonD.material.color.copy(pal.moonhalo);
    moonS.material.opacity=0.55*(0.35+0.65*ml)*deep.light; moonD.material.opacity=(0.3+0.7*ml)*deep.light;
    moonL.color.copy(pal.moon); moonL.intensity=0.3*ml*deep.light; moonL.position.set(N.moon[0]*0.72, N.moon[1]+3, -30);
    N.clouds.forEach((c,i)=>{ const sp=clouds[i], au=Math.abs(c.u), v= au<1.5 ? 0.5+0.5*Math.cos(Math.PI*au/1.5) : 0; sp.visible=v>0.003;
      sp.position.set(N.moon[0]+c.u*NIGHT.clouds.span, N.moon[1]+c.y, N.moon[2]+5); sp.material.opacity=0.92*c.dens*v; sp.material.color.copy(pal.cloud); });
    mists.forEach(([tx,sp,m,pm],i)=>{ m.position.y=0.9+N.rise[i]; pm.opacity=Math.min(0.62, 0.26*N.mist[i]*mistK*deep.mist); pm.color.copy(pal.haze).multiplyScalar(0.55+0.45*ml); });
  }
  /* one frame: hands = [{ x, y, d, play }] (canvas pixels, depth 0…1; play = the note hand); nin = the bus «nightSky» ({ mood, sleep 0…1 }) */
  function update(dt, t, hands, fx, nin){
    now=t; if(fx) fxv=fx; night(dt, t, nin);
    /* NIGHT-6 slice 1: the bed's events whose moment has come (heard at q.at, room time) — each envelope starts exactly then */
    for(let j=0;j<bedQ.length;){ const q=bedQ[j]; if(t<q.at){ j++; continue; } bedQ.splice(j,1); const it=q.it;
      fired.push({ kind:it.kind, at:q.at, t, prev:tLast }); if(fired.length>32) fired.shift();
      if(it.kind==='chord') life.bedChord(q.at);
      else if(it.kind==='loop') life.bedLoop(it.lv, q.at, it.a, it.h, it.r, it.amp);
      else if(it.kind==='glass'){ const far=flies.map((f,i)=>i).filter(i=>Math.hypot(flies[i].p[0]-camPos.x, flies[i].p[1]-camPos.y, flies[i].p[2]-camPos.z)>ANSWERS.bed.glass.near);
        if(far.length) twinkles.push({ i:far[(glassN++)%far.length], t0:q.at }); } }
    tLast=t;
    const kk=(reduce?0.4:1)*deep.motion, H2=hands||[], play=H2.find(h=>h.play), other=H2.find(h=>h!==play);
    rigs.forEach((r,i)=>{ const h= i===0 ? play : other; let on=0;
      if(h){ r.sat=place(h.x, h.y, h.d, r.tgt); on=1; if(r.on<0.02) r.cur.copy(r.tgt); r.d+=(h.d-r.d)*Math.min(1, dt*8); r.gl+=((h.glow==null ? HANDLIGHT_GLOW_OLD : h.glow)-r.gl)*Math.min(1, dt*12); }   // NIGHT-13: glow — its finger closing on the thumb
      r.on+=(on-r.on)*Math.min(1, dt*(on>r.on?6:2.5));
      r.prev.copy(r.cur); r.cur.lerp(r.tgt, 1-Math.exp(-dt*13));
      r.glint*=Math.exp(-dt*2.4);
      const pul=reduce?1:0.9+0.1*Math.sin(t*3.1), dim=i?0.45:1;
      r.grp.visible=r.on>0.01; r.grp.position.copy(r.cur);
      let wob=1; if(i===0){   // C5: the light's colour (Warmth / Brightness) and its tremble (Wave)
        const u=Math.abs(fxv.tone-0.5)*2, to= fxv.tone<0.5 ? WARM : COLD; lc.copy(LC).lerp(to,u); hlc.copy(HC).lerp(to,u); r.light.color.copy(lc); r.halo.material.color.copy(hlc);
        if(fxv.wave>0.005 && !reduce){ const ph=2*Math.PI*4.5*t; wob=1+0.3*fxv.wave*Math.sin(ph); r.grp.position.x+=0.06*fxv.wave*Math.sin(ph); r.grp.position.y+=0.04*fxv.wave*Math.cos(ph*1.3); } }
      const gk=handLightK(r.gl);   // NIGHT-13: brighter as the finger closes (1 = as before, at the glow of a view without fingertips)
      r.light.position.copy(r.grp.position); r.light.intensity= r.on>0.01 ? 1.9*dim*r.on*pul*(1+r.glint)*wob*gk : 0; if(r.light.castShadow) r.light.shadow.autoUpdate= shadowAll || r.light.intensity>0; r.core.scale.setScalar((i?0.1:0.16)*(1+r.glint*0.7)); r.core.material.opacity=r.on;
      /* RUN 8: the playing light's halo follows the depth — near: small and bright, far: wide and soft (as the 2D fingertip's halo) */
      const dk= i ? 1 : 0.7+0.9*r.d, hs=(i?0.9:1.5)*(1+r.glint*0.9)*pul*dk; r.halo.scale.set(hs,hs,1); r.halo.material.opacity=Math.min(1, 0.55*r.on*dim*(i ? 1 : 1.15-0.45*r.d)*gk);
      r.ht+=dt; if(r.ht>0.03){ r.ht=0; r.hist.unshift(r.cur.clone()); if(r.hist.length>r.trail.length) r.hist.pop(); }
      r.trail.forEach((sp,j)=>{ const p=r.hist[j]; if(!p){ sp.material.opacity=0; return; } sp.position.copy(p); sp.material.opacity=r.on*0.3*dim*(1-j/r.trail.length); sp.scale.setScalar(0.1*(1-j/r.trail.length)+0.02); });
    });
    /* C5: echoes due now become rings at the place the note was struck; each ring grows and fades in 0.9 s */
    for(let j=echoes.length-1;j>=0;j--){ const e=echoes[j]; if(t<e.at) continue; echoes.splice(j,1);
      const g=rings.find(x=>x.t0<0) || rings.reduce((a,b)=>a.t0<b.t0?a:b); g.t0=t; g.amp=e.amp; g.sp.position.copy(e.pos); g.sp.visible=true;
      life.echo(e.pos.x, e.pos.z, e.amp, t); }   // RUN 9: and a ring on the water
    for(const g of rings){ if(g.t0<0) continue; const k=(t-g.t0)/0.9; if(k>=1 || k<0){ g.t0=-1;   // RUN 9: a clock moved back (probes) ends a ring, never grows it
      g.sp.visible=false; g.sp.material.opacity=0; continue; }
      g.sp.scale.setScalar(0.25+1.3*k); g.sp.material.opacity=g.amp*(1-k)*(1-k); }
    /* RUN 9: GATHER while playing (τ 2.5 s); when the notes stop the fireflies are RELEASED and drift away slowly (τ 10 s) */
    /* NIGHT-6 slice 2: the melody's inputs, eased (a held note counts as playing: the flies stay gathered through it) */
    { const MM=FOREST_FLIES.melody, ME=MM.ease, hT=rigs[0].on>0.5 ? holdK(heldNow) : 0; while(noteT.length && noteT[0]<=t-MM.rate.window) noteT.shift();
      const rT=rateK(noteT, t); holdE+=(hT-holdE)*(1-Math.exp(-dt/(hT>holdE ? ME.holdIn : ME.holdOut))); rateE+=(rT-rateE)*(1-Math.exp(-dt/(rT>rateE ? ME.rateIn : ME.rateOut))); }
    playing= (music>0.15 || holdE>0.25) && rigs[0].on>0.5; gather+=((playing?1:0)-gather)*(1-Math.exp(-dt/(playing?2.5:7))); rel= playing ? gather : rel*Math.exp(-dt/10);
    rare.step(dt, t, { light:rigs[0].cur, flies });   // RUN 9 (slice 4): a rare event may begin (the emblem steers some flies)
    fliesStep(flies, lightsOf(), dt, t, kk, rare.form());
    const pa=fg.attributes.position.array, ga=fg.attributes.aGlow.array;
    music*=Math.exp(-dt/1.8); const mg=1+0.6*Math.min(1,music);
    const fk=fkNow=deep.flies*fliesK;   // RUN 9: the sleep and the mood dim the wild lights
    /* NIGHT-6 slice 1: a glass note of the bed makes one far firefly twinkle (its glow only — the law moves it as ever) */
    const GL=ANSWERS.bed.glass; glow1.fill(0);
    for(let j=twinkles.length-1;j>=0;j--){ const w=twinkles[j], a=t-w.t0; if(a>GL.rise+GL.hold+GL.fall || a<-60){ twinkles.splice(j,1); continue; } glow1[w.i]=Math.max(glow1[w.i], swellAt(a, GL.rise, GL.hold, GL.fall)*GL.amp); }
    /* NIGHT-13b: the firefly the start's dot became swells as it lands, then glows on as itself */
    for(let j=lands.length-1;j>=0;j--){ const w=lands[j], a=t-(w.t0==null ? (w.t0=t) : w.t0); if(a>LAND.rise+LAND.hold+LAND.fall || a<-60){ lands.splice(j,1); continue; } glow1[w.i]=Math.max(glow1[w.i], swellAt(a, LAND.rise, LAND.hold, LAND.fall)*LAND.amp); }
    flies.forEach((q,i)=>{ pa[i*3]=q.p[0]; pa[i*3+1]=q.p[1]; pa[i*3+2]=q.p[2]; ga[i]=(q.glow*mg+glow1[i])*fk; });
    fg.attributes.position.needsUpdate=fg.attributes.aGlow.needsUpdate=true;
    wild.forEach((l,i)=>{ const q=flies[Math.min(flies.length-1,i*7)]; l.position.set(q.p[0],q.p[1],q.p[2]); l.intensity=q.glow*0.7*(1+0.5*Math.min(1,music))*fk; });
    hemi.intensity=0.26*(1+0.15*Math.min(1,music))*(0.8+0.2*nt.moonLight)*deep.light;   // RUN 9: the sky follows the moon and the sleep
    if(Lv.mist) mists.forEach(([tx,sp])=>{ tx.offset.x=(t*sp*(reduce?0.4:1))%1; });
    /* RUN 9 (slice 3): the leaves sway with the ambience's WIND (its level, the gust of its sweep); a still air without it */
    const wi=(nin && nin.wind) || { level:0, gust:0 }, sway=(0.25+0.75*wi.level*(0.65+0.35*wi.gust))*deep.sway*(reduce?0.4:1);
    life.update(dt, t, { light:rigs[0].cur, lightOn:rigs[0].on, lightCol:rigs[0].light.color, moon:nt.moon, moonK:nt.moonLight*deep.light, fogD:s.fog.density,
      sway, shimmer:reduce ? 0 : fxv.wave, dim:deep.light, flies, flyK:fk*mg, flyCol:fm.uniforms.uColor.value });   // RUN 9 (slice 2); NIGHT-8 the fireflies the water reflects
    detail.update(dt, t, { light:rigs[0].cur, lightOn:rigs[0].on, moon:nt.moon, moonK:nt.moonLight*deep.light, mist:nt.mist.reduce((a,b)=>a+b,0)/nt.mist.length, wind:sway, cam:camera.position });
    gust.update(dt, t, rigs[1].on>0.05 ? rigs[1].cur : null, rigs[1].on);   // NIGHT-6 slice 6: the effects hand's gust
    hidden.update(dt, t, rigs[0].on>0.05 ? rigs[0].cur : null, rigs[0].on, deep.light);   // NIGHT-6 slice 9
    canopy.update(dt, t, { cover:nt.cover, mist:nt.mist.reduce((a,b)=>a+b,0)/nt.mist.length, light:deep.light }); DU.uDapK.value=2.2*nt.moonLight*deep.light; DU.uDapT.value=t;   // NIGHT-6 slice 7
    stream.update(dt, t, { moonK:nt.moonLight*deep.light, mist:nt.mist.reduce((a,b)=>a+b,0)/nt.mist.length, deepMist:deep.mist, motion:kk });   // NIGHT-6 slice 4
    answers.update(dt, t, { light:rigs[0].cur, on:rigs[0].on, light1:rigs[1].cur, on1:rigs[1].on, lightCol:rigs[0].light.color, fxCol:rigs[1].light.color, moonCol:pal.moonhalo,
      moonK:nt.moonLight*deep.light, dim:deep.light, fogD:s.fog.density, cam:camera.position });   // NIGHT-6 slice 1
    /* parallax: the camera leans a little towards the playing light (near and far things slide past each other) */
    const f0=rigs[0].on>0.05 && !restOn ? rigs[0].cur : camLook;   // NIGHT-13: at rest the camera does not lean
    goalOf(f0, camGoal); motionK= restOn ? 0 : motionK+(1-motionK)*(1-Math.exp(-dt/REST_TC));
    if(restOn) camOff.copy(camGoal); else camOff.lerp(camGoal, 1-Math.exp(-dt*1.6));
    aimCamera(); if(!reduce && !viewOver){ camera.position.y+=Math.sin(t*0.23)*0.025*motionK; if(Lv.breath) camera.position.x+=breathAt(t)*motionK; camera.updateMatrixWorld(); }   // NIGHT-6 slice 8: + the sideways breath; NIGHT-13: × motionK
  }
  /* a note began on this rig's hand (from the bus `notes` ring) */
  const glint=(i,vel)=>{ const r=rigs[i]; if(r) r.glint=Math.max(r.glint, clamp(vel==null?0.6:vel,0.18,1)); music=Math.min(1.5, music+0.35*clamp(vel==null?0.6:vel,0.18,1));
    if(r && i===0 && r.on>0.05){ life.glint(vel, r.cur.x, r.cur.z, now); rare.glint();   // RUN 9: a wave of light across the moss, the mushrooms nearby pulse (and an open flower)
      life.noteRing(r.cur.x, r.cur.z, vel==null?0.6:vel, now); answers.glint(vel);   // NIGHT-6 slice 1: a ring on the stream; dew and webs glint
      noteT.push(now); if(noteT.length>64) noteT.shift(); const rk=rateK(noteT, now); if(rk>=FOREST_FLIES.melody.dart.from && fliesDart(flies, r.cur, rk).length) darts++; }   // NIGHT-6 slice 2: fast playing sends the nearest out
    if(r && i===0 && fxv.echo>0.02){ const v=clamp(vel==null?0.6:vel,0.18,1); let amp=0.9*v*fxv.echo;   // C5: one ring per echo, each fainter by the feedback
      for(let k=1;k<=6 && amp>0.03;k++){ echoes.push({ at:now+k*fxv.time, amp, pos:r.cur.clone() }); amp*=Math.max(0, fxv.fb); } } };
  /* probes: numbers only (never pixels) */
  function project(i){ const r=rigs[i]; tmp.copy(r.cur).project(camera); return { x:(tmp.x+1)/2*W, y:(1-tmp.y)/2*H, sat:r.sat, on:r.on }; }
  /* NIGHT-13: a firefly on the screen — its place (the room's view px), its drawn radius (px of the view: the point's size law over the pixel ratio), its glow,
     its distance; flyPick: the one the start's dot becomes — far (≥ 8 m), glowing, nearest to the deep middle of the picture (0.56, 0.5) */
  const LAND=Object.freeze({ rise:0.15, hold:0.9, fall:1.6, amp:1.6 }), lands=[];   // NIGHT-13b
  const flyTmp=V(0,0,0), flyAt=i=>{ const q=flies[i]; if(!q) return null; flyTmp.set(q.p[0], q.p[1], q.p[2]); const z=flyTmp.clone().applyMatrix4(camera.matrixWorldInverse).z; flyTmp.project(camera);
    const px=Math.max(1.5, fm.uniforms.uSize.value*fm.uniforms.uScale.value/Math.max(0.1, -z)), k=pxH>0 ? H/pxH : 1;
    return { i, x:(flyTmp.x+1)/2*W, y:(1-flyTmp.y)/2*H, r:px*k/2, glow:q.glow*fkNow, dist:-z, front:z<0 && Math.abs(flyTmp.x)<1 && Math.abs(flyTmp.y)<1 }; };
  function flyPick(){ let best=null, bd=Infinity;
    flies.forEach((q,i)=>{ const f=flyAt(i); if(!f || !f.front || f.dist<8) return; const d=Math.hypot(f.x/W-0.56, (f.y/H-0.5)*0.8)-0.15*Math.min(1, f.glow); if(d<bd){ bd=d; best=i; } });
    return best; }
  const state=()=>({ rigs:rigs.map(r=>({ x:r.cur.x, y:r.cur.y, z:r.cur.z, on:r.on, sat:r.sat })), shadows:rigs.filter(r=>r.light.castShadow).length, shadowSize:SH,
    flies:flies.length, trail:Lv.trail, fov:camera.fov, cam:[camera.position.x, camera.position.y, camera.position.z], fliesAt:flies.map(q=>q.p.slice()),
    fx:{ ...fxv, color:[rigs[0].light.color.r, rigs[0].light.color.g, rigs[0].light.color.b], echoesDue:echoes.length, rings:rings.filter(g=>g.t0>=0).length },   // C5
    music, halo:rigs[0].halo.scale.x, hemi:hemi.intensity,   // RUN 8
    night:{ phase:nt?nt.phase:0, moon:[moonS.position.x, moonS.position.y, moonS.position.z], cover:nt?nt.cover:0, moonLight:nt?nt.moonLight:1, moonI:moonL.intensity,   // RUN 9
      clouds:clouds.map(c=>c.visible ? c.material.opacity : 0), mist:mists.map(x=>x[3].opacity), mistY:mists.map(x=>x[2].position.y), fog:s.fog.density, deep:deep.e, mood:moodId,
      fogHex:pal.fog.getHexString(), flies:fkNow }, life:{ ...life.state(), gather, playing, release:rel }, detail:detail.state(), rare:rare.state(flies),   // RUN 9 (slice 2)
    melody:{ hold:holdE, rate:rateE, held:heldNow, darts },   // NIGHT-6 slice 2
    floor:(({ places, ...x })=>x)(floor.state()), ground:{ macro:!!macroTex, scan:!!scanOn, ao:!!gg.attributes.aAO7, seg:GS, leaves:litter.leaves.length, pebbles:litter.pebbles.length, twigs:litter.twigs.length },   // NIGHT-6 slice 3; NIGHT-8 the ground
    stream:stream.state(), trunks:spots.map(x=>x.slice()), fernsAt:ferns.map(x=>x.slice()),   // NIGHT-6 slice 4
    wood:{ ...wood.state(), shade:!!shadeTex, flare:!!Lv.flare, bark:!!Lv.barkMoss },   // NIGHT-6 slice 5
    gust:gust.state(),   // NIGHT-6 slice 6
    canopy:{ ...canopy.state(), dapple:!!dapTex, moonFace:!!moonTex },   // NIGHT-6 slice 7
    paint:{ ...paint.state(), breath:!!Lv.breath && !reduce },   // NIGHT-6 slice 8
    hidden:hidden.state(),   // NIGHT-6 slice 9
    mirror:mirror.state(),   // NIGHT-9
    answers:answers.state(), bed:{ queued:bedQ.length, fired:fired.map(x=>({ ...x })), twinkles:twinkles.map(w=>({ ...w, glow:glow1[w.i] })) }, files:{ web:!!files.web, floor:!!files.floor, errors:assetErr.slice() } });   // NIGHT-6 slice 1
  function dispose(){ for(const o of own) try{ o.dispose(); }catch(e){} own.length=0; }
  /* NIGHT-6 slice 1: a music bed event `it` ({ kind 'chord' | 'loop' | 'glass', lv, a, h, r, amp }) heard at room time `at` (the host maps it) */
  function bed(it, at){ if(!it || !(at>-1e9) || at-now>30) return; bedQ.push({ it, at }); if(bedQ.length>64) bedQ.shift(); }
  /* NIGHT-6 slice 0: the room's texture memory in bytes (its own textures: pixels × 4, mipmaps × 4/3) */
  function texBytes(){ let b=0; for(const o of own){ if(!o || !o.isTexture) continue; const im=o.image||{}, w=im.width||0, h=im.height||0, pot=!(w&(w-1)) && !(h&(h-1));
    b+=w*h*(o.format===T.RedFormat ? 1 : 4)*(o.generateMipmaps!==false && pot ? 4/3 : 1); } return Math.round(b); }   // NIGHT-6 slice 5: one byte a texel for one channel
  const hidden=buildHidden({ T, s, C, own, lv:Lv, FU, herbs:floor.state().places, glowMat:life.glowMat });   // NIGHT-6 slice 9 (before the paint: its glow goes to the glow pass)
  const paint=buildPaint({ T, scene:s, camera, lv:Lv, gl2:opt.gl2, own });   // NIGHT-6 slice 8: after every object is in the scene (it sorts the glowing ones into their pass)
  /* NIGHT-9: the water's mirror — the silhouettes against the sky drawn from below the water's plane (the mean water level in view) */
  const waterY=(()=>{ const P=STREAM_LINE.filter(q=>q.z>-12 && q.z<4); return P.reduce((a,q)=>a+q.y,0)/Math.max(1, P.length); })();
  const mirror=buildMirror({ T, s, camera, lv:Lv, y:waterY, WU:life.WU, paint, silhouettes:[trunks, branches, canopy.parts.wood, canopy.parts.leaves, canopy.parts.stars, moonS, moonD, ...clouds], own, skyCol:pal.sky });
  const render=r=>{ mirror.render(r, now*1000); paint.render(r, now); };   // NIGHT-9: the mirror first, when due by the room's own clock (one frame drawn twice stays one picture)   // the room's own frame time: one frame drawn twice is the same picture (the grain too)
  /* FOREST-2e: the cull (?forest=cull, the default parts only): the instances no view ever shows left out (./forest-cull.js, the list ./pure/cull.js) */
  const cullT=cullTargets({ trunks, branches, ferns:fronds, floor:floor.parts, canopy:canopy.parts, stream:stream.parts, wood:wood.parts, grass:detail.grass, bases }), CL=FOREST_CULL[opt.level];
  const cullSt= CULL && CL && CL.list && FOREST_CULL.parts.length===NP.size && FOREST_CULL.parts.every(k=>NP.has(k)) ? cullApply(cullT, CULL_EXTRA ? Object.fromEntries([...new Set([...Object.keys(CL.list), ...Object.keys(CULL_EXTRA)])].map(k=>[k, { n:CL.list[k] ? CL.list[k].n : cullT[k] && cullT[k].count, drop:(CL.list[k] ? CL.list[k].drop : []).concat(CULL_EXTRA[k]||[]) }])) : CL.list) : null;
  resize(W,H);
  return { id:FOREST_ROOM.id, scene:s, camera, update, resize, place, glint, project, state, dispose, lightsOf, lifeDbg:life, detailDbg:detail, bed, texBytes, answersDbg:answers, floorDbg:floor, streamDbg:stream, woodDbg:wood, gustDbg:gust, canopyDbg:canopy, dappleDbg:DU, render, paintDbg:paint, mirrorDbg:mirror, hiddenDbg:hidden, foxDbg:FU, fernsDbg:{ fronds, frondM, frondD, fr:FR, apart:apartN }, cullDbg:{ targets:cullT, state:cullSt }, woodPlacesDbg:WP, trunksDbg:{ trunks, branches, spots }, trunkBasesDbg:()=>bases, vegDbg:()=>[wood.parts.moss, wood.parts.ivy, life.parts.caps, life.parts.stems, life.parts.petals].filter(m=>m && m.parent), natDbg:()=>({ on:nat, parts:[...NP], moved:{ ...movedN }, solids:SOL ? SOL.length : 0, files:!!NT && !!NT.barkA && !!NT.rockC }), groundDbg:{ U:macroU, branches, brs:brs.length, litter },   // NIGHT-8: probes   // FOREST-2: probes
    shadowAllDbg:on=>{ shadowAll=!!on; if(on && rigs[0].light.castShadow) rigs[0].light.shadow.autoUpdate=true; return { all:shadowAll, casts:rigs[0].light.castShadow, auto:rigs[0].light.castShadow ? rigs[0].light.shadow.autoUpdate : null }; },   // PERF-2: the A/B's other side
    held:sec=>{ heldNow= sec>0 ? sec : 0; rare.held(sec); }, rareDbg:kind=>rare.force(kind, now, { light:rigs[0].cur, flies }), viewDbg:o=>{ const lens=v=>!!(v && (v.fov || v.rest)), had=lens(viewOver); viewOver=o||null; if(had || lens(viewOver)) resize(W, H, pxH); else aimCamera(); return viewOver; },
    rest:on=>{ const was=restOn; restOn=!!on; if(restOn && !was){ goalOf(camLook, camGoal); camOff.copy(camGoal); motionK=0; aimCamera(); } return restOn; },   // NIGHT-13: the camera at rest (host sceneRest)
    flyAt, flyPick, flyLand:i=>{ if(flies[i]) lands.push({ i, t0:null }); return !!flies[i]; },   // NIGHT-13: the start's dot becomes one of the fireflies; 13b: its landing swell
    restDbg:()=>({ rest:restOn, motionK, off:[camOff.x, camOff.y, camOff.z], cam:[camera.position.x, camera.position.y, camera.position.z], fov:camera.fov }) };   // RUN 9 (slice 4): held — how long the playing note is held (host); rareDbg — probes / captures   // RUN 9: lifeDbg / detailDbg — probes only (uniforms, silhouette boxes)
}
