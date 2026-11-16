/* FOREST-2e — «FOREST plants apart» (drawn): the founder saw a young spruce and a big fern grow from almost the same spot on the left, their
   textures merged. The forest built at both levels (the default parts): no fern's fronds may enter a young spruce's cone and no two spruces may stand
   closer than the law allows (pure/spacing.js mergedPairs over the room's own fronds and spruces). CONTROL: the same forest with the law off
   (forestApartDbg(false) = FOREST-2d) must show merged pairs, the founder's left pair among them (a spruce and a fern within 0.6 m round x −3.4,
   z −2.7). Also: the young broad-leaved trees that stay grow as youngLeaf (one leaf kind each). FOREST-2f: the left pair the same on both levels (its
   spruce pinned, the ferns moved; CONTROL FOREST-2d's differed). Every wait has an upper limit. */
import { row } from '../core/rows.js';
import { forestFrames } from './forest2.js';

const LEFT=Object.freeze({ x:-3.4, z:-2.7, r:1.2, near:0.6 });   // the founder's pair (FOREST-2d's places: spruce −3.32, −2.6 · fern 76 at 0.44 m)
async function pairsOf(level, apart){ const F=await import('../../../apps/night/rooms/forest/forest.js'), S=await import('../../../apps/night/rooms/forest/pure/spacing.js'), N=await import('../../../apps/night/rooms/forest/pure/natural.js'), L=await import('../../../apps/night/rooms/forest/pure/forestlife.js');
  const was=F.forestApartDbg(); F.forestApartDbg(apart); let out=null;
  try{ await forestFrames({ level, on:'default', veg:false, mutate:async room=>{ const sp=room.canopyDbg.spruces, P=sp ? sp.places : [], cones=P.map(p=>({ x:p.x, z:p.z, H:p.H, y0:L.bankGround(p.x, p.z) }));
      const fa=room.state().fernsAt, FR=room.fernsDbg.fr||[], gy=(x, z)=>L.bankGround(x, z);
      const ferns=fa.map(([x, z], i)=>({ x, z, points:FR[i] ? N.frondPoints(x, gy(x, z)-0.02, z, FR[i]) : [] }));
      const pairs=S.mergedPairs(ferns, cones), young=room.canopyDbg.places.sprays.filter(s=>s.of==='young'), kinds=new Set(young.map(s=>s.k));
      const near=(x0, z0)=>cones.filter(c=>Math.hypot(c.x-x0, c.z-z0)<2.6).map(c=>[+c.x.toFixed(2), +c.z.toFixed(2), +c.H.toFixed(2)]).sort((a, b)=>a[0]-b[0]||a[1]-b[1]);   // FOREST-2f: the left pair's arrangement
      out={ pairs, ferns, cones, left:{ spruces:near(-3.32, -2.6), ferns:[1, 76].map(i=>fa[i].map(v=>+v.toFixed(2))) }, apart:room.fernsDbg.apart, frs:FR.length, youngKinds:kinds.size, young:young.length, broad:room.canopyDbg.places.young.length-P.filter(p=>p.of==='young').length }; } }); }
  finally{ F.forestApartDbg(was); }
  return out; }
export async function checkForestApart(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; }; const L={}, L0={};
  for(const lv of ['reduced', 'full']){ const A=await pairsOf(lv, true); L[lv]=A.left;
    ok(`${lv}: the ferns' fronds are not known (${A.frs} of ${A.ferns.length})`, A.frs===A.ferns.length && A.frs>0);
    const name=p=>p.kind==='fern-spruce' ? `fern #${p.a} (${A.ferns[p.a].x.toFixed(2)}, ${A.ferns[p.a].z.toFixed(2)}) in spruce #${p.b} (${A.cones[p.b].x.toFixed(2)}, ${A.cones[p.b].z.toFixed(2)}, H ${A.cones[p.b].H.toFixed(2)})` : `spruces #${p.a} and #${p.b} (${A.cones[p.a].x.toFixed(2)}, ${A.cones[p.a].z.toFixed(2)} / ${A.cones[p.b].x.toFixed(2)}, ${A.cones[p.b].z.toFixed(2)})`;
    ok(`${lv}: plants merge — ${A.pairs.slice(0, 6).map(name).join('; ')}${A.pairs.length>6 ? ' …' : ''}`, A.pairs.length===0);
    if(A.broad>0) ok(`${lv}: the young broad-leaved trees carry mixed leaf kinds (${A.youngKinds} kinds for ${A.broad} trees)`, A.youngKinds<=A.broad);
    notes.push(`${lv}: ${A.cones.length} spruces, ${A.ferns.length} ferns, ferns moved off a spruce ${A.apart ? A.apart.ferns : "?"} (smaller ${A.apart ? A.apart.smaller : "?"}, no place found ${A.apart ? A.apart.stuck : "?"}), young broad-leaved ${A.broad} (${A.young} sprays, ${A.youngKinds} leaf kind(s))`);
    const B=await pairsOf(lv, false); L0[lv]=B.left; const left=B.pairs.filter(p=>p.kind==='fern-spruce' && Math.hypot(B.cones[p.b].x-LEFT.x, B.cones[p.b].z-LEFT.z)<LEFT.r && Math.hypot(B.ferns[p.a].x-B.cones[p.b].x, B.ferns[p.a].z-B.cones[p.b].z)<LEFT.near);
    ok(`CONTROL ${lv}: with the law off (FOREST-2d) no pair merges — the check cannot see a merge`, B.pairs.length>0);
    if(lv==='full') ok('CONTROL full: with the law off the founder\'s left pair (a spruce and a fern within 0.6 m round x −3.4, z −2.7) is not found', left.length>0);
    notes.push(`CONTROL ${lv}: law off — ${B.pairs.length} merged pairs (${B.pairs.filter(p=>p.kind==='spruce-spruce').length} spruce-spruce)${lv==='full' ? ', the left pair: '+left.map(p=>`fern #${p.a} / spruce #${p.b}`).join(', ') : ''}`); }
  /* FOREST-2f: the left pair the same on both levels — the pinned spruce at its place (−3.32, −2.6), the spruces near it and the two big ferns where they
     stand; CONTROL: the forest as at FOREST-2d (the law off) had them differ between the levels */
  const same=(a, b)=>JSON.stringify(a)===JSON.stringify(b);
  ok(`the left pair differs between the levels: Standard ${JSON.stringify(L.reduced)} · Detailed ${JSON.stringify(L.full)}`, same(L.reduced, L.full));
  ok('the left pair spruce is not at its place (−3.32, −2.6) on both levels', [L.reduced, L.full].every(x=>x.spruces.some(q=>q[0]===-3.32 && q[1]===-2.6)));
  ok('CONTROL: as at FOREST-2d the left pairs of the two levels were found the same — the check cannot see a difference', !same(L0.reduced, L0.full));
  notes.push(`the left pair on both levels: spruces ${JSON.stringify(L.full.spruces)}, big ferns ${JSON.stringify(L.full.ferns)}`);
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.95, night:true, name:'FOREST plants apart', drawn:true, run:()=>checkForestApart(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkForestApart(); }
