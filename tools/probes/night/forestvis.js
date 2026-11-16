/* FOREST-2c — THE FOREST'S VISIBILITY MAP (a probe tool, no row): what a player actually sees from the fixed camera, per object, in pixels.
   The room built at a level (FOREST-2's fixed views: dt 0, t 100 s, the camera at rest), every mesh's material patched to write an ID; the whole
   scene drawn once (its depth), then each mesh alone over that depth (equal depth passes: only where it is the nearest surface). An instanced
   mesh writes its instance number (each mushroom, fern, rock, trunk on its own); a merged one (the wood) its world position, classified to the
   nearest stump, snag, log or root. → per view { kind: { n, seen, px, items:[[label, px]…] } }, px on the probe's scaled views (FOREST2_VIEWS). */
import { FOREST2_VIEWS } from './forest2.js';

const VIS_MIN=20;   // an item counts as seen from 20 px on the scaled view (≈ 0.01 % of the laptop frame): my guess
let K=null;
async function kit(){ if(!K){ const H=await import('../../../apps/night/scene/host.js'); K={ T:await H.loadThree(), CV:(await import('../../../core/palette.js')).cv, F:await import('../../../apps/night/rooms/forest/forest.js') }; } return K; }

/* the ID program: after everything, the fragment writes the instance number + 1 (instanced) or the world (x, z) packed in 12 + 12 bits */
function patchId(mat){ const ob=mat.onBeforeCompile, key=mat.customProgramCacheKey, keep={ ob, key, blending:mat.blending };
  mat.onBeforeCompile=function(sh, r){ if(ob) ob.call(mat, sh, r);
    sh.vertexShader=sh.vertexShader.replace('void main() {', 'flat out float vVisI;\nout vec3 vVisW;\nvoid main() {')
      .replace(/}\s*$/, '  { vec4 vw=vec4(position, 1.0);\n#ifdef USE_INSTANCING\n  vw=instanceMatrix*vw; vVisI=float(gl_InstanceID);\n#else\n  vVisI=-1.0;\n#endif\n  vVisW=(modelMatrix*vw).xyz; }\n}');
    sh.fragmentShader=sh.fragmentShader.replace('void main() {', 'flat in float vVisI;\nin vec3 vVisW;\nvoid main() {')
      .replace(/}\s*$/, '  if(vVisI>=0.0){ float n=vVisI+1.0; gl_FragColor=vec4(mod(n, 256.0), mod(floor(n/256.0), 256.0), floor(n/65536.0), 255.0)/255.0; }\n  else { float ix=clamp(floor((vVisW.x+25.6)/0.0125), 0.0, 4095.0), iz=clamp(floor((vVisW.z+40.0)/0.0125), 0.0, 4095.0);\n    gl_FragColor=vec4(mod(ix, 256.0), floor(ix/256.0)+mod(iz, 16.0)*16.0, floor(iz/16.0), 255.0)/255.0; }\n}'); };
  mat.customProgramCacheKey=()=>(key ? key.call(mat) : '')+'.visid'; mat.blending=0; mat.needsUpdate=true; return ()=>{ mat.onBeforeCompile=ob; mat.customProgramCacheKey=key; mat.blending=keep.blending; mat.needsUpdate=true; }; }

/* the named parts of the room → [mesh, kind, label(i) or null (the merged wood: by place)] */
function named(room){ const out=[], add=(m, kind, lab)=>{ if(m && m.isMesh) out.push([m, kind, lab||null]); };
  const L=room.lifeDbg.parts; add(L.caps, 'mushroom', i=>'mushroom #'+i); add(L.stems, 'mushroom stem', i=>'mushroom #'+i); add(L.petals, 'flower', i=>'flower #'+i);
  add(room.fernsDbg.fronds, 'fern', i=>'fern #'+i); const Fl=room.floorDbg.parts; add(Fl.herbs, 'herb', i=>'herb #'+i); add(Fl.fronds, 'fine fern', i=>'fine fern #'+i);
  const C=room.canopyDbg, sp=C.places.sprays; add(C.parts.leaves, 'leaf spray', i=>'leaves of '+(sp[i] ? sp[i].of : '?')); add(C.parts.wood, 'understorey wood', null); add(C.parts.cards, 'spruce needles', i=>'spruce card');
  const W=room.woodDbg.parts; add(W.wood, 'wood', null); add(W.moss, 'moss cushion', i=>'cushion #'+i); add(W.ivy, 'ivy', i=>'ivy #'+i);
  const S=room.streamDbg.parts; add(S.rocks, 'rock', i=>'rock #'+i); add(S.pebbles, 'pebble', i=>'pebble');
  const Tk=room.trunksDbg; if(Tk){ add(Tk.trunks, 'trunk', i=>'trunk #'+i); add(Tk.branches, 'branch', i=>'branch'); }
  for(const m of (room.vegDbg ? room.vegDbg() : [])) if(!out.some(o=>o[0]===m)) add(m, 'other plant', i=>'#'+i);
  if(room.trunkBasesDbg) for(const b of room.trunkBasesDbg()) add(b.mesh, 'trunk with roots', ()=>'trunk #'+b.tree);
  return out; }
/* a world (x, z) of the merged wood → its piece */
function woodPiece(WP, x, z){ let best='other wood', bd=Infinity; const take=(lab, d)=>{ if(d<bd){ bd=d; best=lab; } };
  (WP.stumps||[]).forEach((s, i)=>{ const d=Math.hypot(x-s.x, z-s.z)-s.r*1.6; if(d<0.15) take('stump #'+i, d); });
  (WP.snags||[]).forEach((s, i)=>{ const d=Math.hypot(x-s.x, z-s.z)-(s.s||0.3)*1.6; if(d<0.15) take('snag #'+i, d); });
  (WP.logs||[]).forEach((l, i)=>{ const ax=l.b[0]-l.a[0], az=l.b[2]-l.a[2], L2=ax*ax+az*az||1, t=Math.max(0, Math.min(1, ((x-l.a[0])*ax+(z-l.a[2])*az)/L2)), d=Math.hypot(x-l.a[0]-ax*t, z-l.a[2]-az*t)-Math.max(l.r0||0.3, l.r1||0.3); if(d<0.2) take('log #'+i, d); });
  (WP.roots||[]).forEach(rt=>{ for(let j=1;j<rt.pts.length;j++){ const A=rt.pts[j-1], B=rt.pts[j], ax=B[0]-A[0], az=B[2]-A[2], L2=ax*ax+az*az||1, t=Math.max(0, Math.min(1, ((x-A[0])*ax+(z-A[2])*az)/L2)), d=Math.hypot(x-A[0]-ax*t, z-A[2]-az*t)-A[3]; if(d<0.12) take('roots of trunk #'+rt.tree, d+0.05); } });
  return best; }

export async function forestVisMap({ level='reduced', on=null, views=FOREST2_VIEWS }={}){
  const { T, CV, F }=await kit(), was=F.forestNewDbg ? F.forestNewDbg() : false; if(F.forestNewDbg && on!=null) F.forestNewDbg(on);
  const canvas=document.createElement('canvas'); let r=null, room=null; const restore=[];
  try{
    await Promise.race([F.forestAssets(level), new Promise((_, no)=>setTimeout(()=>no(new Error('the forest files did not arrive in 60 s')), 60000))]);
    if(F.forestNewAssets && F.forestNewDbg && F.forestNewDbg()) await Promise.race([F.forestNewAssets(level), new Promise((_, no)=>setTimeout(()=>no(new Error('the new forest files did not arrive in 60 s')), 60000))]);
    r=new T.WebGLRenderer({ canvas, antialias:false, preserveDrawingBuffer:true }); r.setPixelRatio(1); r.shadowMap.enabled=false;
    if(!r.capabilities.isWebGL2) throw new Error('the visibility map needs WebGL2 (gl_InstanceID)');
    const [, w0, h0]=views[0]; room=F.buildForest(T, { C:CV, level, w:w0, h:h0, reduce:false, mood:null, shadow:false, gl2:true });
    const parts=named(room), all=[]; room.scene.traverse(o=>{ if(o.isMesh || o.isPoints || o.isLine || o.isSprite) all.push(o); });
    const mats=new Set(); for(const m of all) if(m.isMesh) for(const x of [].concat(m.material)) if(!x.isRawShaderMaterial) mats.add(x); for(const x of mats) restore.push(patchId(x));
    const plain=all.filter(o=>!o.isMesh || [].concat(o.material).some(x=>x.isRawShaderMaterial)); plain.forEach(o=>{ o.visible=false; });   // points, lines and raw programs: out of the map
    const gl=r.getContext(), WP=room.woodPlacesDbg||{}, out={ level, parts:F.forestNewDbg ? F.forestNewDbg() : false, views:{} };
    for(const [name, w, h] of views){ r.setSize(w, h, false); room.viewDbg(null); room.resize(w, h, h); room.viewDbg({ rest:true }); room.update(0, 100, [], null, { mood:null });
      const vis=all.map(m=>m.visible), px=new Uint8Array(w*h*4), kinds={}, N=w*h;
      const bg=room.scene.background; room.scene.background=null;   // a colour background force-clears colour AND depth on every render
      r.autoClear=false; r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(room.scene, room.camera);   // the depth of everything
      for(const [m, kind, lab] of parts){ if(!m.visible || !m.parent) continue; all.forEach(o=>{ o.visible=false; }); m.visible=true; let p=m.parent; while(p){ p.visible=true; p=p.parent; }
        r.clear(true, false, false); r.render(room.scene, room.camera); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const by=new Map(); let tot=0;
        for(let i=0;i<px.length;i+=4){ const a=px[i], b=px[i+1], c=px[i+2]; if(!(a|b|c)) continue; tot++;
          const L= m.isInstancedMesh ? lab(a+b*256+c*65536-1) : woodPiece(WP, (a+(b&15)*256)*0.0125-25.6, ((b>>4)+c*16)*0.0125-40); by.set(L, (by.get(L)||0)+1); }
        all.forEach((o, i)=>{ o.visible=vis[i]; });
        const K0=kinds[kind]||(kinds[kind]={ n:0, seen:0, px:0, items:{} }); K0.n+= m.isInstancedMesh ? m.count : 0; K0.px+=tot;
        for(const [L, c] of by) K0.items[L]=(K0.items[L]||0)+c; }
      for(const K1 of Object.values(kinds)){ const it=Object.entries(K1.items).sort((a, b)=>b[1]-a[1]); K1.seen=it.filter(([, c])=>c>=VIS_MIN).length; K1.share=+(K1.px/N*100).toFixed(3); K1.items=it.slice(0, 12); }
      out.views[name]={ w, h, kinds }; r.autoClear=true; room.scene.background=bg; }
    return out;
  } finally {
    for(const f of restore) try{ f(); }catch(e){}
    try{ if(room) room.dispose(); }catch(e){} try{ if(r){ r.dispose(); r.forceContextLoss(); } }catch(e){}
    if(F.forestNewDbg) F.forestNewDbg(was);
  }
}
