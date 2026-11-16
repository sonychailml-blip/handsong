/* RAIN-5: LIFE ON THE STREET — who is out in the rain, as a pure seeded law of time (rule #36; data row «RAIN life law (app)»). The founder: the city
   looked «after the apocalypse». Live and animated (never baked), varied per mood: Evening boulevard busy, Late night a few night owls and a cat,
   After the rain people coming out.
   - Walkers (alone with an umbrella, a couple under one, someone with a dog) keep to LANES along the promenade and the left pavement; on a lane
     everyone goes the same way at the lane's own pace, evenly spaced along a loop of LOOP metres — nobody overtakes, nobody meets anyone on their
     lane; lanes lie apart wider than two people, clear of the plane trees, the benches, the kiosk, the lamps and the café tables (the row proves it).
   - A cyclist and a runner have lanes of their own; the café's sitters stay at their tables (small motions), its waiter walks the terrace's
     service lane; pigeons sit on the tram wire and rise when a tram passes under them (at Late night a cat walks the wall instead); leaves and
     paper blow along the promenade (more with Wave); steam rises from a manhole and the café's kitchen vent; rings open in the puddles; cars
     throw splashes where the road holds water; heads show in the tram's lit windows.
   Each item: { kind, x, y, z (world, m), h, w (m), ph (its animation phase), c (its colour index), a (0…1) }. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREET } from './city.js';

const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const LK=F({ walk:0, couple:1, dog:2, cycle:3, run:4, sit:5, waiter:6, pigeon:7, cat:8, leaf:9, steam:10, ring:11, splash:12, head:13 });
export const LIFE=F({ seed:0x4C494645, loop:180, z0:12, r:0.35, rCouple:0.6,
  lanes:F([F({ x:-2.6, dir:1, v:1.25 }), F({ x:-1.2, dir:-1, v:1.1 }), F({ x:20.2, dir:1, v:1.35 }), F({ x:21.6, dir:-1, v:1.2 }), F({ x:26.4, dir:1, v:1.3 }), F({ x:27.8, dir:-1, v:1.15 }), F({ x:29.4, dir:1, v:1.05 })]),
  cycle:F({ x:13.5, dir:1, v:4.6 }), run:F({ x:33.6, dir:-1, v:2.9 }), waiter:F({ x:35.9, span:F([42, 64]), v:0.9 }),
  tables:F({ x:37.4, cafes:F([F([40, 66]), F([98, 138])]), every:3.2 }),
  wire:F({ x:11.9, y:6.25, z:F([30, 44]) }), cat:F({ x:39.2, z:50, span:6 }),
  steam:F([F([4.5, 0, 26]), F([39.6, 3.2, 47])]), puddles:F([F([20.2, 30]), F([24.8, 41]), F([18.6, 55]), F([28.8, 63]), F([22.5, 76]), F([33.0, 34])]),
  roadPuddles:F([F([2.6, 34]), F([6.2, 52]), F([2.6, 88])]),
  moods:F({ late:F({ walk:3, couple:0, dog:1, cycle:0, run:1, sit:2, waiter:0, pigeons:0, cat:1, leaves:5 }),
    evening:F({ walk:20, couple:3, dog:2, cycle:1, run:1, sit:10, waiter:1, pigeons:8, cat:0, leaves:9 }),
    after:F({ walk:10, couple:2, dog:1, cycle:1, run:1, sit:5, waiter:1, pigeons:6, cat:0, leaves:7 }) }) });

/* the walkers of a mood, given to lanes once (seeded): [{ kind, lane, slot, n (on its lane), c }] */
export function lifeCast(look, seed=LIFE.seed, L=LIFE){ const M=L.moods[look]||L.moods.late, r=seeded(seed>>>0), kinds=[];
  for(let i=0;i<M.walk;i++) kinds.push(LK.walk); for(let i=0;i<M.couple;i++) kinds.push(LK.couple); for(let i=0;i<M.dog;i++) kinds.push(LK.dog);
  for(let i=kinds.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [kinds[i], kinds[j]]=[kinds[j], kinds[i]]; }
  const per=L.lanes.map(()=>[]); kinds.forEach((k, i)=>per[i%L.lanes.length].push(k));
  return per.flatMap((ks, lane)=>ks.map((kind, slot)=>({ kind, lane, slot, n:ks.length, c:Math.floor(r()*4), ph:r() }))); }
/* a mover on a loop: its z at time t */
const loopZ=(t, v, dir, off, L)=>{ const s=frac(off+dir*v*t/L.loop); return L.z0+s*L.loop; };
/* everything out at time t (s) for the look; cars: the traffic law's list at t (trams and cars), wave 0…1 → items */
export function lifeAt(t, look, cars=[], wave=0, seed=LIFE.seed, L=LIFE){ const M=L.moods[look]||L.moods.late, out=[], cast=lifeCast(look, seed, L);
  for(const p of cast){ const ln=L.lanes[p.lane], z=loopZ(t, ln.v, ln.dir, p.slot/p.n+hash(p.lane, 3)*0.5, L), w= p.kind===LK.couple ? 1.3 : p.kind===LK.dog ? 1.2 : 0.75;
    out.push({ kind:p.kind, x:ln.x, y:0, z, h:p.kind===LK.couple ? 2.1 : 2.05, w, ph:frac(t*ln.v*0.9+p.ph), c:p.c, a:1, lane:p.lane, dir:ln.dir }); }
  for(let i=0;i<M.cycle;i++){ const q=L.cycle; out.push({ kind:LK.cycle, x:q.x, y:0, z:loopZ(t, q.v, q.dir, 0.31+i*0.5, L), h:1.75, w:1.7, ph:frac(t*1.6), c:1, a:1, lane:'cycle', dir:q.dir }); }
  for(let i=0;i<M.run;i++){ const q=L.run; out.push({ kind:LK.run, x:q.x, y:0, z:loopZ(t, q.v, q.dir, 0.67+i*0.5, L), h:1.8, w:0.7, ph:frac(t*2.6), c:0, a:1, lane:'run', dir:q.dir }); }
  { const T=L.tables, seats=[]; for(const [a, b] of T.cafes) for(let z=a+1.5;z<b-1.5;z+=T.every) seats.push(z);
    for(let i=0;i<Math.min(M.sit, seats.length);i++){ const z=seats[Math.floor(hash(i, 7)*seats.length)]+((i%2) ? 0.7 : -0.7), sx=T.x+((i%3)-1)*0.75; out.push({ kind:LK.sit, x:sx, y:0, z, h:1.3, w:0.7, ph:frac(t*0.13+hash(i, 9)), c:i%4, a:1, lane:'sit' }); } }
  for(let i=0;i<M.waiter;i++){ const q=L.waiter, s=0.5-0.5*Math.cos(t*q.v/(q.span[1]-q.span[0])*Math.PI); out.push({ kind:LK.waiter, x:q.x, y:0, z:q.span[0]+s*(q.span[1]-q.span[0]), h:1.85, w:0.75, ph:frac(t*1.1), c:0, a:1, lane:'waiter' }); }
  /* pigeons on the wire; a tram under them within 14 m sends them up (they settle again ~8 s after it is gone) */
  if(M.pigeons){ const q=L.wire, tram=cars.find(c=>c.kind==='tram' && Math.abs(c.z-(q.z[0]+q.z[1])/2)<14+(c.len||28)/2), up= tram ? 1 : 0;
    for(let i=0;i<M.pigeons;i++){ const z=q.z[0]+(i+0.5)/M.pigeons*(q.z[1]-q.z[0])+(hash(i, 1)-0.5)*0.6, fl=up*(0.6+0.4*hash(i, 2));
      out.push({ kind:LK.pigeon, x:q.x+fl*(hash(i, 4)-0.5)*6, y:q.y+fl*(2+3*hash(i, 5)), z:z+fl*(hash(i, 6)-0.5)*5, h:0.28, w:fl ? 0.6 : 0.32, ph:fl ? frac(t*3+hash(i, 8)) : -1, c:0, a:1, lane:'wire' }); } }
  for(let i=0;i<M.cat;i++){ const q=L.cat; out.push({ kind:LK.cat, x:q.x, y:0, z:q.z+Math.sin(t*0.12)*q.span, h:0.35, w:0.7, ph:frac(t*0.5), c:0, a:1, lane:'cat', dir:Math.cos(t*0.12)>0 ? 1 : -1 }); }
  /* leaves and paper along the promenade, faster and more with Wave */
  { const n=Math.round(M.leaves*(1+0.8*Math.max(0, Math.min(1, wave)))); for(let i=0;i<n;i++){ const g=0.6+1.4*Math.max(0, wave)+0.5*Math.sin(t*0.3+i), s=frac(hash(i, 11)+t*g*0.012);
    out.push({ kind:LK.leaf, x:14.5+hash(i, 12)*22+s*6, y:0.05+0.4*Math.max(0, Math.sin(t*2.1+i*1.7))*g*0.5, z:L.z0+6+frac(hash(i, 13)+s)*80, h:0.18, w:0.18, ph:frac(t*0.9+hash(i, 14)), c:i%2, a:0.9, lane:'air' }); } }
  for(let k=0;k<L.steam.length;k++) for(let j=0;j<5;j++){ const P=L.steam[k], age=frac(t/4.5+j/5); out.push({ kind:LK.steam, x:P[0]+Math.sin(t*0.4+j)*0.3*age, y:P[1]+age*3.2, z:P[2], h:0.9+age*1.4, w:0.9+age*1.6, ph:age, c:0, a:0.32*(1-age)*Math.min(1, age*6), lane:'air' }); }
  L.puddles.forEach((P, i)=>{ const ph=frac(t*0.55+hash(i, 21)); out.push({ kind:LK.ring, x:P[0], y:0.02, z:P[1], h:0.05, w:0.4+ph*1.2, ph, c:0, a:0.5*(1-ph), lane:'ground' }); });
  for(const c of cars) if(c.kind!=='tram') for(const P of L.roadPuddles) if(Math.abs(c.x-P[0])<1.2 && Math.abs(c.z-P[1])<2.2){ const ph=1-Math.abs(c.z-P[1])/2.2; out.push({ kind:LK.splash, x:P[0]+0.9, y:0, z:P[1], h:0.7*ph, w:1.4, ph, c:0, a:0.7*ph, lane:'ground' }); }
  for(const c of cars) if(c.kind==='tram') for(let k=0;k<6;k++) if(hash(Math.round(c.id||c.t0||0)+k, 31)<0.62){ out.push({ kind:LK.head, x:c.x, y:1.55, z:c.z-c.dir*(2+k*4.3)+0.6, h:0.6, w:0.55, ph:0, c:0, a:1, lane:'tram' }); }
  return out; }
