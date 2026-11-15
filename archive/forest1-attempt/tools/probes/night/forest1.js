/* FOREST-1 — row «FOREST objects»: the room builds what the laws give (apps/night/rooms/forest/pure/wood.js organic roots, pure/foliage.js lower
   branches, young spruces, saplings; the CC0 foliage sheet and rock detail), at both levels:
   (1) every trunk's turn in the room = forestTrunkYaws() (the roots grow from the lobes of THESE turns) — CONTROL the replay one draw late differs;
   (2) the canopy's cards = the law's list (the understorey's sprays, the saplings' twigs, the living lower branches, the spruces' needles), on the
       foliage sheet, sharing the floor plants' program (they sway); the lower branches and the spruces in the limbs' geometry; the crowns keep their sheet;
   (3) the rocks read the CC0 detail (their program '.detail'), the ferns' fronds the sheet's frond cell, the wood the weathered end grain;
   (4) with every FOREST-1 switch off the room builds exactly the old parts (no cards, the rocks' old program, the ferns' painted frond, no weather);
   (5) drawn, Standard: the cards, the limbs and the rocks each change the picture — CONTROL one frame rendered twice is identical. */
import { row } from '../core/rows.js';
import { cv } from '../../../core/palette.js';
import { loadThree, setBackground, sceneInfo, setSceneLevel, sceneLevel, sceneRoomDbg, sceneSnapDbg, sceneClockDbg } from '../../../apps/night/scene/host.js';
import { buildForest, forestAssets, FOREST_LEVELS } from '../../../apps/night/rooms/forest/forest.js';
import { forestTrunks, forestTrunkYaws, FOREST_SEED, PAINT_DRAWS } from '../../../apps/night/rooms/forest/pure/layout.js';
import { lowerBranches, youngSpruces, saplingShape, cardOf, foliageCellUv } from '../../../apps/night/rooms/forest/pure/foliage.js';
import { canopyPlaces } from '../../../apps/night/rooms/forest/pure/canopy.js';
import { seeded } from '../../../core/pure/dsp.js';
import { profileApply, profileCurrent } from '../../../core/profile.js';
import { frame } from '../core/kit.js';

const sleep=ms=>new Promise(r=>setTimeout(r, ms)), frames=async n=>{ for(let i=0;i<n;i++) await frame(); };
const OFF={ rootsOrganic:false, lower:false, spruces:0, foliage:false, rockDetail:false, fernCards:false, logEnds:false };
export async function checkForestObjects(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), was=profileCurrent(), keepLevel=sceneLevel();
  try{
    const T=await loadThree(); await forestAssets('full'); await forestAssets('reduced'); const rooms=[], mk=(lv, o={})=>{ const r=buildForest(T, { C:cv, level:lv, w:844, h:390, ...o }); rooms.push(r); return r; };
    const stub=m=>{ const sh={ uniforms:{}, vertexShader:'#include <begin_vertex>\n#include <uv_vertex>\n#include <project_vertex>\n#include <beginnormal_vertex>', fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>' }; if(m.onBeforeCompile) m.onBeforeCompile(sh, null); return sh.vertexShader+sh.fragmentShader; };
    try{
      const pureT=forestTrunks(), Y=forestTrunkYaws(), m=new T.Matrix4();
      for(const lv of ['full', 'reduced']){ const r=mk(lv), L=FOREST_LEVELS[lv], tm=r.scene.children.find(o=>o.isInstancedMesh && o.count===pureT.length && o.geometry.attributes.aBark7);
        /* (1) the trunks' turns */
        n++; if(!tm) miss(lv+': no trunks'); else { let worst=0; for(let i=0;i<pureT.length;i++){ tm.getMatrixAt(i, m); const el=m.elements, yaw=-Math.atan2(el[2], el[0]); worst=Math.max(worst, Math.abs(Math.atan2(Math.sin(yaw-Y[i]), Math.cos(yaw-Y[i])))); }   // the local x axis turned: -yaw (its ±0.03 rad tilts move it at most 0.0009 rad)
          if(!(worst<0.002)) miss(`${lv}: a trunk's turn differs from forestTrunkYaws() by ${worst.toFixed(5)} rad`); else if(lv==='full') notes.push(`every trunk's turn = forestTrunkYaws() (largest gap ${worst.toExponential(1)} rad)`); }
        /* (2) the cards and the limbs */
        const C=r.canopyDbg, st=C.state(), P=canopyPlaces(L, pureT), LB=lowerBranches(pureT), SP=youngSpruces(L.spruces, pureT, [...P.young, ...P.shrubs, ...P.saplings].map(s=>[s.x, s.z, 1.5]));
        const want=P.sprays.filter(s=>s.of!=='crown' && s.of!=='sapling').length+P.saplings.map((s,i)=>saplingShape(s, 0x53415031+i).cards.length).reduce((a,b)=>a+b, 0)+LB.cards.length+SP.cards.length; n+=5;
        if(st.cards!==want) miss(`${lv}: ${st.cards} cards, the laws give ${want}`);
        if(st.spruces!==L.spruces || st.lower.live<3 || st.lower.dead<50) miss(`${lv}: ${JSON.stringify({ spruces:st.spruces, lower:st.lower })}`);
        const cm=C.parts.cardMat, fm=r.floorDbg.parts.material; if(!cm || cm.customProgramCacheKey()!==fm.customProgramCacheKey() || cm.map===C.parts.material.map) miss(lv+': the cards do not share the plants\' program, or wear the crowns\' sheet');
        { const a=C.parts.cards.geometry.attributes.aCell, k=C.extra.cards, f=Math.fround; if(!a || k.some((c,i)=>foliageCellUv(c.cell).some((v,j)=>a.array[i*4+j]!==f(v)))) miss(lv+': a card\'s cell is not its law\'s'); }
        if(!(C.parts.wood.geometry.userData.pieces>=P.limbs.length+LB.limbs.length+SP.limbs.length)) miss(`${lv}: the limbs' geometry has ${C.parts.wood.geometry.userData.pieces} pieces`);
        void cardOf;
        /* (3) rocks, ferns, the wood's weather */
        n+=3; if(!/detail$/.test(r.streamDbg.parts.rockMat.customProgramCacheKey()) || !/uRkC/.test(stub(r.streamDbg.parts.rockMat))) miss(lv+': the rocks do not read the CC0 detail');
        if(r.fernsDbg.frondM.map!==cm.map) miss(lv+': the ferns do not wear the sheet\'s frond');
        if(!/weather/.test(r.woodDbg.parts.material.customProgramCacheKey()) || !/WOOD7_WEATHER/.test(stub(r.woodDbg.parts.material))) miss(lv+': the wood has no weathered end grain');
        notes.push(`${lv}: ${st.cards} cards (${Object.entries(st.cardsBy).map(([k,v])=>k+' '+v).join(', ')}), lower branches ${JSON.stringify(st.lower)}, ${st.spruces} young spruces, ${st.sprays-(st.by.crown||0)} understorey sprays as cards`); }
      { const R=seeded(FOREST_SEED); for(let i=0;i<=PAINT_DRAWS;i++) R(); const late=R()*6.28; n++; if(Math.abs(late-Y[0])<1e-9) miss('CONTROL: a replay one draw late gives the same turn'); }
      /* (4) the switches off: the old parts */
      { const r=mk('reduced', { lv:OFF }), st=r.canopyDbg.state(); n+=4;
        if(st.cards || st.spruces || st.lower.limbs) miss('the switches off still build cards, spruces or lower branches: '+JSON.stringify({ cards:st.cards, spruces:st.spruces, lower:st.lower }));
        if(/detail/.test(r.streamDbg.parts.rockMat.customProgramCacheKey())) miss('the switches off still give the rocks the CC0 detail');
        if(r.fernsDbg.frondM.map && r.fernsDbg.frondM.map.isCanvasTexture!==true) miss('the switches off still give the ferns the sheet');
        if(/weather/.test(r.woodDbg.parts.material.customProgramCacheKey())) miss('the switches off still weather the end grain'); }
    } finally { for(const r of rooms) r.dispose(); }
    /* (5) drawn */
    const why=profileApply('profile.night'); n++; if(why){ miss('Night refused: '+why); return { cases:n, total:d.length, differences:d, notes }; }
    await setSceneLevel('reduced'); await setBackground('forest'); sceneClockDbg(60); await frames(6);
    const room=sceneRoomDbg(); if(!room || !sceneInfo().webgl){ notes.push('no WebGL room — the drawn checks do not apply'); return { cases:n, total:d.length, differences:d, notes }; }
    const Cp=room.canopyDbg.parts, Sp=room.streamDbg.parts;
    for(const [name, fn] of [['the cards', on=>{ Cp.cards.visible=!on; }], ['the limbs and branches', on=>{ Cp.wood.visible=!on; }], ['the rocks', on=>{ Sp.rocks.visible=!on; }]]){
      const ab=await sceneSnapDbg(fn, true), cc=await sceneSnapDbg(()=>{}, true); n+=2;
      if(!ab || !cc){ notes.push(name+': no frame rendered'); continue; }
      notes.push(`${name} change the mean RGB sum of one frame by ${(ab[0]-ab[1]).toFixed(4)} (CONTROL ${(cc[0]-cc[1]).toFixed(4)})`);
      if(!(Math.abs(ab[0]-ab[1])>0)) miss(name+' do not show in the picture'); if(cc[0]!==cc[1]) miss('CONTROL: one frame rendered twice differs by '+(cc[0]-cc[1])); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ sceneClockDbg(null); try{ await setSceneLevel(keepLevel); }catch(e){} if(profileCurrent()!==was) profileApply(was); await setBackground('camera'); await sleep(30); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ night:true, at:1008.63982, name:'FOREST objects', drawn:true, run:()=>checkForestObjects(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
