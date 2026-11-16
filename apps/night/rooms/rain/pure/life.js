/* RAIN-5 / RAIN-5b: LIFE ON THE STREET — who is out in the rain, as a pure seeded law of time (rule #36; data row «RAIN life law (app)»).
   RAIN-5b (the founder: «identical extras»; people popping in and out): ONE seeded population, each person with clothes from a muted rainy-evening
   palette with some colour, an umbrella of their own kind (black, coloured, transparent, a big golf one) or none (a hood, a newspaper over the
   head, a raincoat), a height and build; a child holding a hand, an older person on the slow lane, someone who stops now and then, two who talk,
   someone on a phone, people waiting at the crossing, a dog pulling on its lead. The moods take NESTED shares of it (Late night ⊂ After the rain ⊂
   Evening boulevard). When the mood changes (hist: the room's [[t, look]…]) nobody pops: a walker comes or goes at the next side street or
   doorway on their way (GATES along each lane), after their own delay (stagger ≤ 40 s), fading over 2 s; the standing ones fade over 6 s — the
   count eases over about 30–60 s.
   - Walkers keep LANES (one pace per lane, evenly spaced along a loop: nobody overtakes or meets anyone on a lane; lanes apart wider than two
     people, clear of trees, lamps, benches, the kiosk, the tables; the standing ones off every lane). The walking phase is distance over stride
     (no sliding feet); the shader draws the gait (legs, arms, a bob and a sway, the umbrella swaying with the step).
   Each item: { kind, x, y, z (m), h, w (m), ph, c (look code: clothes + 8 × umbrella kind + 64 × umbrella colour), a (0…1) }. */
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const LK=F({ walk:0, couple:1, dog:2, cycle:3, run:4, sit:5, waiter:6, pigeon:7, cat:8, leaf:9, steam:10, ring:11, splash:12, head:13, child:14, old:15, stand:16, talk:17 });
export const UMB=F({ black:0, colour:1, clear:2, golf:3, hood:4, paper:5, coat:6 });
export const LIFE=F({ seed:0x4C494645, loop:180, z0:12, r:0.35, rCouple:0.6, gate:30, stagger:40, fadeMove:2, fadeStand:6,
  lanes:F([F({ x:-2.6, dir:1, v:1.25 }), F({ x:-1.2, dir:-1, v:0.85, old:true }), F({ x:20.2, dir:1, v:1.35 }), F({ x:21.6, dir:-1, v:1.2 }), F({ x:26.4, dir:1, v:1.3 }), F({ x:27.8, dir:-1, v:1.15 }), F({ x:29.4, dir:1, v:1.05 })]),
  pause:F({ x:31.6, dir:-1, v:1.1, walk:40, stop:8 }),
  cycle:F({ x:13.5, dir:1, v:4.6 }), run:F({ x:33.6, dir:-1, v:2.9 }), waiter:F({ x:35.9, span:F([42, 64]), v:0.9 }),
  tables:F({ x:37.4, cafes:F([F([40, 66]), F([98, 138])]), every:3.2 }),
  stand:F([F({ x:-3.6, z:69, b:'wait' }), F({ x:-3.6, z:69.8, b:'wait' }), F({ x:18.7, z:70, b:'wait' }), F({ x:24.0, z:90, b:'phone' })]),
  talk:F([F({ x:23.6, z:36 }), F({ x:24.6, z:36 })]),
  wire:F({ x:11.9, y:6.25, z:F([30, 44]) }), cat:F({ x:39.2, z:50, span:6 }),
  steam:F([F([4.5, 0, 26]), F([39.6, 3.2, 47])]), puddles:F([F([20.2, 30]), F([24.8, 41]), F([18.6, 55]), F([28.8, 63]), F([22.5, 76]), F([33.0, 34])]),
  roadPuddles:F([F([2.6, 34]), F([6.2, 52]), F([2.6, 88])]),
  pop:F({ walkers:30, sit:10, stand:4, talk:1 }),
  moods:F({ late:F({ walkers:4, cycle:0, run:1, sit:2, waiter:0, stand:1, talk:0, pause:0, pigeons:0, cat:1, leaves:5 }),
    evening:F({ walkers:30, cycle:1, run:1, sit:10, waiter:1, stand:4, talk:1, pause:1, pigeons:8, cat:0, leaves:9 }),
    after:F({ walkers:15, cycle:1, run:1, sit:5, waiter:1, stand:2, talk:1, pause:1, pigeons:6, cat:0, leaves:7 }) }) });

/* the seeded population of walkers, given to lanes; order — the order the moods take them in (a mood with M walkers takes orders 0 … M−1) */
export function lifePeople(seed=LIFE.seed, L=LIFE){ const N=L.pop.walkers, per=L.lanes.map(()=>[]);
  for(let i=0;i<N;i++){ const r=k=>hash(i+seed%997, k), kind= i%9===2 ? LK.couple : i%9===5 ? LK.dog : i%9===7 ? LK.child : LK.walk, u=r(2);
    const umb= kind===LK.child || kind===LK.couple ? (u<0.5 ? UMB.golf : UMB.black) : u<0.3 ? UMB.black : u<0.5 ? UMB.colour : u<0.6 ? UMB.clear : u<0.68 ? UMB.golf : u<0.8 ? UMB.hood : u<0.88 ? UMB.paper : UMB.coat;
    per[i%L.lanes.length].push({ i, kind, umb, clothes:Math.floor(r(3)*8), uc:Math.floor(r(4)*4), h:1.6+0.32*r(5), build:0.85+0.35*r(6), rank:r(7), stagger:r(8)*L.stagger }); }
  const out=[]; per.forEach((ps, lane)=>{ const ln=L.lanes[lane]; ps.forEach((p, slot)=>{ if(ln.old && slot===0){ p.kind=LK.old; p.umb=UMB.black; p.h=1.62; } out.push({ ...p, lane, slot, n:ps.length }); }); });
  const ranks=out.map(p=>p.rank).sort((a, b)=>a-b); out.forEach(p=>{ p.order=ranks.indexOf(p.rank); }); return out; }
const POP=new Map(), peopleOf=(seed, L)=>{ const k=seed+':'+JSON.stringify(L.lanes)+':'+L.pop.walkers; if(!POP.has(k)) POP.set(k, lifePeople(seed, L)); return POP.get(k); };
const inLook=(L, look, grp, o)=>o<((L.moods[look]||L.moods.late)[grp]||0);
/* membership over the mood history → { on (in now), since (the time it last changed; −1e9: never) } */
function member(L, hist, grp, o, t){ let on=null, since=-1e9; for(const [tc, lk] of hist){ if(tc>t) break; const v=inLook(L, lk, grp, o); if(on!==null && v!==on) since=tc; on=v; } return { on:!!on, since }; }
/* a walker's distance along their loop at time t (m) and their z */
const walked=(ln, t, off, L)=>off*L.loop+ln.v*t, zOf=(ln, s, L)=>L.z0+frac((ln.dir>0 ? s : -s)/L.loop)*L.loop;
/* the time of the first gate (a side street, a doorway) a walker passes after T: gates every L.gate metres along the loop */
const gateAfter=(ln, T, off, L)=>{ const s=walked(ln, T, off, L), g=L.gate, d=g-frac(s/g)*g; return T+(d<1e-6 ? g : d)/ln.v; };
function moverAlpha(L, hist, grp, o, stagger, ln, off, t){ const m=member(L, hist, grp, o, t); if(m.since<-1e8) return m.on ? 1 : 0;
  const tg= L.instant ? m.since : gateAfter(ln, m.since+stagger, off, L), f= L.instant ? 1 : Math.max(0, Math.min(1, (t-tg)/L.fadeMove)); if(t<tg) return m.on ? 0 : 1; return m.on ? f : 1-f; }
function standAlpha(L, hist, grp, o, stagger, t){ const m=member(L, hist, grp, o, t); if(m.since<-1e8 || L.instant) return m.on ? 1 : 0; const f=Math.max(0, Math.min(1, (t-m.since-stagger)/L.fadeStand)); return m.on ? f : 1-f; }
/* everything out at time t (s); look — now; cars: the traffic law's list at t; wave 0…1; hist: [[t, look]…] (absent: always `look`) → items */
export function lifeAt(t, look, cars=[], wave=0, seed=LIFE.seed, L=LIFE, hist=null){ const H=hist && hist.length ? hist : [[-1e9, look]], cur=H[H.length-1][1], M=L.moods[cur]||L.moods.late, out=[];
  for(const p of peopleOf(seed, L)){ const ln=L.lanes[p.lane], off=p.slot/p.n+hash(p.lane, 3)*0.5, a=moverAlpha(L, H, 'walkers', p.order, p.stagger, ln, off, t); if(a<=0.001) continue;
    const s=walked(ln, t, off, L), wide=p.kind===LK.couple || p.kind===LK.child || p.kind===LK.dog || p.umb===UMB.golf, stride=0.42*p.h;
    out.push({ kind:p.kind, x:ln.x, y:0, z:zOf(ln, s, L), h:p.h, w:(wide ? 1.3 : 0.75)*p.build, ph:frac(s/(2*stride)), c:p.clothes+8*p.umb+64*p.uc, a, lane:p.lane, dir:ln.dir, r:wide ? L.rCouple : L.r }); }
  { const q=L.pause, per=q.walk+q.stop, k=Math.floor(t/per), u=t-k*per, s=(k*q.walk+Math.min(u, q.walk))*q.v, a=standAlpha(L, H, 'pause', 0, 12, t);   // the one who stops and looks round (a lane of their own)
    if(a>0.001) out.push({ kind:u<q.walk ? LK.walk : LK.stand, x:q.x, y:0, z:zOf(q, s, L), h:1.74, w:0.75, ph:u<q.walk ? frac(s/1.46) : 0.5+0.5*Math.sin((u-q.walk)/q.stop*6.28), c:2+8*UMB.colour+64*2, a, lane:'pause', dir:q.dir, r:L.r }); }
  for(let i=0;i<(M.cycle||0);i++){ const q=L.cycle, s=q.v*t+0.31*L.loop; out.push({ kind:LK.cycle, x:q.x, y:0, z:zOf(q, s, L), h:1.75, w:1.7, ph:frac(s/2.1), c:1+8*UMB.hood, a:1, lane:'cycle', dir:q.dir, r:0.5 }); }
  for(let i=0;i<(M.run||0);i++){ const q=L.run, s=q.v*t+0.67*L.loop; out.push({ kind:LK.run, x:q.x, y:0, z:zOf(q, s, L), h:1.8, w:0.7, ph:frac(s/2.4), c:6+8*UMB.hood, a:1, lane:'run', dir:q.dir, r:L.r }); }
  { const T=L.tables, seats=[]; for(const [a, b] of T.cafes) for(let z=a+1.5;z<b-1.5;z+=T.every) seats.push(z);
    for(let i=0;i<Math.min(L.pop.sit, seats.length);i++){ const a=standAlpha(L, H, 'sit', i, hash(i, 15)*L.stagger, t); if(a<=0.001) continue; const z=seats[Math.floor(hash(i, 7)*seats.length)]+((i%2) ? 0.7 : -0.7), sx=T.x+((i%3)-1)*0.75;
      out.push({ kind:LK.sit, x:sx, y:0, z, h:1.3, w:0.7, ph:frac(t*0.13+hash(i, 9)), c:Math.floor(hash(i, 10)*8), a, lane:'sit', r:L.r }); } }
  for(let i=0;i<(M.waiter||0);i++){ const q=L.waiter, s=0.5-0.5*Math.cos(t*q.v/(q.span[1]-q.span[0])*Math.PI); out.push({ kind:LK.waiter, x:q.x, y:0, z:q.span[0]+s*(q.span[1]-q.span[0]), h:1.85, w:0.75, ph:frac(t*0.7), c:0, a:1, lane:'waiter', r:L.r }); }
  L.stand.forEach((q, i)=>{ const a=standAlpha(L, H, 'stand', i, hash(i, 17)*L.stagger, t); if(a<=0.001) return;
    out.push({ kind:LK.stand, x:q.x, y:0, z:q.z, h:1.62+0.2*hash(i, 18), w:0.75, ph:q.b==='phone' ? 0.25 : 0.5+0.1*Math.sin(t*0.4+i), c:Math.floor(hash(i, 19)*8)+8*(q.b==='phone' ? UMB.hood : UMB.black), a, lane:'stand', r:L.r }); });
  for(let k=0;k<L.pop.talk;k++){ const a=standAlpha(L, H, 'talk', k, 8, t); if(a<=0.001) continue; L.talk.forEach((q, i)=>out.push({ kind:LK.talk, x:q.x, y:0, z:q.z, h:1.7-0.08*i, w:0.75, ph:frac(t*0.35+i*0.5)+(i ? 2 : 0), c:(3+i*4)%8+8*UMB.black, a, lane:'talk', r:L.r })); }
  if(M.pigeons){ const q=L.wire, tram=cars.find(c=>c.kind==='tram' && Math.abs(c.z-(q.z[0]+q.z[1])/2)<14+(c.len||28)/2), up= tram ? 1 : 0;   // pigeons on the wire, rising when a tram passes under them
    for(let i=0;i<M.pigeons;i++){ const z=q.z[0]+(i+0.5)/M.pigeons*(q.z[1]-q.z[0])+(hash(i, 1)-0.5)*0.6, fl=up*(0.6+0.4*hash(i, 2));
      out.push({ kind:LK.pigeon, x:q.x+fl*(hash(i, 4)-0.5)*6, y:q.y+fl*(2+3*hash(i, 5)), z:z+fl*(hash(i, 6)-0.5)*5, h:0.28, w:fl ? 0.6 : 0.32, ph:fl ? frac(t*3+hash(i, 8)) : -1, c:0, a:1, lane:'wire' }); } }
  for(let i=0;i<(M.cat||0);i++){ const q=L.cat; out.push({ kind:LK.cat, x:q.x, y:0, z:q.z+Math.sin(t*0.12)*q.span, h:0.35, w:0.7, ph:frac(t*0.5), c:0, a:1, lane:'cat', dir:Math.cos(t*0.12)>0 ? 1 : -1 }); }
  { const n=Math.round(M.leaves*(1+0.8*Math.max(0, Math.min(1, wave)))); for(let i=0;i<n;i++){ const g=0.6+1.4*Math.max(0, wave)+0.5*Math.sin(t*0.3+i), s=frac(hash(i, 11)+t*g*0.012);
    out.push({ kind:LK.leaf, x:14.5+hash(i, 12)*22+s*6, y:0.05+0.4*Math.max(0, Math.sin(t*2.1+i*1.7))*g*0.5, z:L.z0+6+frac(hash(i, 13)+s)*80, h:0.18, w:0.18, ph:frac(t*0.9+hash(i, 14)), c:i%2, a:0.9, lane:'air' }); } }
  for(let k=0;k<L.steam.length;k++) for(let j=0;j<5;j++){ const P=L.steam[k], age=frac(t/4.5+j/5); out.push({ kind:LK.steam, x:P[0]+Math.sin(t*0.4+j)*0.3*age, y:P[1]+age*3.2, z:P[2], h:0.9+age*1.4, w:0.9+age*1.6, ph:age, c:0, a:0.32*(1-age)*Math.min(1, age*6), lane:'air' }); }
  L.puddles.forEach((P, i)=>{ const ph=frac(t*0.55+hash(i, 21)); out.push({ kind:LK.ring, x:P[0], y:0.02, z:P[1], h:0.05, w:0.4+ph*1.2, ph, c:0, a:0.5*(1-ph), lane:'ground' }); });
  for(const c of cars) if(c.kind!=='tram') for(const P of L.roadPuddles) if(Math.abs(c.x-P[0])<1.2 && Math.abs(c.z-P[1])<2.2){ const ph=1-Math.abs(c.z-P[1])/2.2; out.push({ kind:LK.splash, x:P[0]+0.9, y:0, z:P[1], h:0.7*ph, w:1.4, ph, c:0, a:0.7*ph, lane:'ground' }); }
  for(const c of cars) if(c.kind==='tram') for(let k=0;k<6;k++) if(hash(Math.round(c.id||c.t0||0)+k, 31)<0.62) out.push({ kind:LK.head, x:c.x, y:1.55, z:c.z-c.dir*(2+k*4.3)+0.6, h:0.6, w:0.55, ph:0, c:0, a:1, lane:'tram' });
  return out; }
/* the kinds counted as people (the row: the count eases, never jumps) */
export const PEOPLE=F([LK.walk, LK.couple, LK.dog, LK.cycle, LK.run, LK.sit, LK.waiter, LK.child, LK.old, LK.stand, LK.talk]);
