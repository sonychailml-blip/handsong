/* FOREST-2e — PLANTS APART (the founder: a young spruce and a big fern grew from almost the same spot, their textures merged). Pure (rule #36),
   node-tested (data row «FOREST plants apart (app)»). The law:
   - a young spruce is a CONE of branches: from deadBelow × H up its reach is r0 + k·H·(1 − y/H) (y above its foot); below it only the stem;
   - a fern's fronds may not enter any spruce's cone (their cards would cut into each other);
   - two spruces may not stand closer than share × (the sum of their lowest reaches): branch tips may touch, the trees never grow from one spot.
   Ferns among ferns are a clump (natural) and stay as they are. The numbers are my guesses (said in the report). */
const F=Object.freeze;
export const SPACING=F({ r0:0.12, k:0.36, dead:0.22, stem:F([0.035, 0.012]), share:0.75, margin:0.04 });
/* a spruce of height H: its reach at y metres above its foot (0 above the tip) */
export function spruceReach(H, y){ const S=SPACING; if(y<0 || y>H) return 0; if(y<S.dead*H) return S.stem[0]+S.stem[1]*H; return S.r0+S.k*H*(1-y/H); }
/* the reach of its lowest live whorl (its widest) */
export const spruceBase=H=>SPACING.r0+SPACING.k*H*(1-SPACING.dead);
/* is the world point (px, py, pz) inside the spruce sp { x, z, H, y0 (its foot's height) }? (with the margin) */
export function inSpruce(px, py, pz, sp){ const r=spruceReach(sp.H, py-sp.y0); return r>0 && Math.hypot(px-sp.x, pz-sp.z)<r+SPACING.margin; }
/* two spruces too close? */
export function sprucesMerge(a, b){ return Math.hypot(a.x-b.x, a.z-b.z)<SPACING.share*(spruceBase(a.H)+spruceBase(b.H)); }
/* a fern's frond points (pure/natural.js frondPoints) against the spruces → the index of the first spruce one of them enters, or -1 */
export function fernInSpruces(points, spruces){ for(let i=0;i<spruces.length;i++){ const sp=spruces[i], R=spruceBase(sp.H)+0.05, R2=R*R;
    for(const p of points){ const dx=p[0]-sp.x, dz=p[2]-sp.z; if(dx*dx+dz*dz<R2 && inSpruce(p[0], p[1], p[2], sp)) return i; } } return -1; }
/* every merged pair of a forest: ferns [{ x, z, points }], spruces [{ x, z, H, y0 }] → [{ a, b, kind }] (kind 'fern-spruce' | 'spruce-spruce') */
export function mergedPairs(ferns, spruces){ const out=[];
  ferns.forEach((f, i)=>{ spruces.forEach((sp, j)=>{ if(fernInSpruces(f.points, [sp])===0) out.push({ a:i, b:j, kind:'fern-spruce' }); }); });
  for(let i=0;i<spruces.length;i++) for(let j=i+1;j<spruces.length;j++) if(sprucesMerge(spruces[i], spruces[j])) out.push({ a:i, b:j, kind:'spruce-spruce' });
  return out; }
/* FOREST-2f (the founder: at Standard the spruce came nearer, at Detailed it vanished behind a trunk; it looked best where it stood at FOREST-2d's
   Detailed): THE LEFT PAIR's spruce is PINNED at that place on both levels — the sapling nearest it (within reach) grows there — and the big ferns
   round it move aside instead. Every other spruce keeps clear of it */
export const LEFT_PAIR=F({ spruce:F({ x:-3.32, z:-2.6, H:2.1 }), reach:2.6, ferns:F({ 76:F({ x:-7.25, z:-4.75, k:1 }) }) });   // the big fern: the nearest place clear on BOTH levels (solids, water, every mushroom's sight), found by a search on both
