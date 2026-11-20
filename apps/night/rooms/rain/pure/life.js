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
import { farEventAt, FAR_LIFE } from './far.js';   // RAIN-5d
import { sleepPerson } from './sleep.js';   // RAIN-6b (8): people go home as the city falls asleep
export const LK=F({ walk:0, couple:1, dog:2, cycle:3, run:4, sit:5, waiter:6, pigeon:7, cat:8, leaf:9, steam:10, ring:11, splash:12, head:13, child:14, old:15, stand:16, talk:17, group:18, flag:19, sign:20, signal:21, walksig:22, scooter:23, sillcat:29, stream:30 });   // RELEASE-1 (C): 29 the cat on a windowsill, 30 a glint of the kerb's stream
/* RAIN-5c: what a walker carries or wears (the look code's 256s): none, a shoulder bag, a backpack, a hat, a scarf, a bag and a scarf, a knitted cap, a tote */
export const ACC=F({ none:0, bag:1, backpack:2, hat:3, scarf:4, bagScarf:5, cap:6, tote:7 });
export const SIGNS=F(['cup', 'cross', 'scissors', 'key', 'croissant']);
export const UMB=F({ black:0, colour:1, clear:2, golf:3, hood:4, paper:5, coat:6 });
/* RELEASE-1 (A): WHAT EACH PERSON WEARS — every part its own colour (RAIN-5b's one body colour read as a single blot): believable rainy-night
   palettes (sRGB hex, the ALBEDO — the shader lights it by the near lamps and the look's glow; one source, rain-glass.js builds its tables from here).
   coat: charcoal, navy, camel, olive, burgundy, black, slate, tobacco · rain (a raincoat, UMB.coat): yellow, red, teal, navy, green, orange, black, plum ·
   legs: dark denim, black, charcoal, grey, khaki, brown, navy, blue jeans · shoes: black, dark brown, tan, pale trainers · acc (hat, scarf, hood, cap):
   wine, mustard, cream, grey, teal, rust, navy, forest · bag: black, brown leather, tan, canvas · hair · skin · umb (the coloured umbrellas: uc) */
export const WEAR=F({ coat:F(['2e2f34', '1f2a48', '86684a', '4a4e30', '5e2229', '19191c', '41505c', '664c2c']), rain:F(['a88a34', '922828', '1f6464', '28385f', '3c5e2c', '9a5028', '1d1f24', '4e2c4e']),
  legs:F(['1e2638', '121214', '2c2c31', '56565c', '625a42', '402e22', '1c2238', '36486e']), shoes:F(['0f0f11', '36231a', '74502e', 'a8a8a4']),
  acc:F(['6e2232', 'a07e2a', 'b8ac90', '606066', '2c5e5e', '8e4224', '28324f', '30503a']), bag:F(['141416', '4c2e1c', '80583a', '6c6858']),
  hair:F(['141210', '2c1d14', '4c3222', '5c2c18', '7e6844', '7c7c7a', 'aaaaa6', '231b18']), skin:F(['bc9882', 'aa7c5e', '80563a', '503426']),
  umb:F(['7a2026', '94732a', '1a2652', '1a532d']) });
export const WEAR_MIN=F({ legs:0.1, shoes:0.08, acc:0.14, bag:0.07 });   // the least RGB distance (0…1) from the coat (the shoes: from the trousers)
const rgb=h=>[0, 2, 4].map(i=>parseInt(h.slice(i, i+2), 16)/255), cdist=(a, b)=>Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
/* the wear code (aWear.x): trousers + 8 shoes + 32 hat/scarf + 256 bag + 1024 hair + 8192 skin + 32768 style (0 jacket, 1 coat, 2 skirt, 3 long coat) + 131072 hair style (0 short, 1 medium, 2 long, 3 a bun) */
export const wearCode=o=>o.legs+8*o.shoes+32*o.acc+256*o.bag+1024*o.hair+8192*o.skin+32768*o.style+131072*o.hs;
export const wearParts=w=>({ legs:w%8, shoes:Math.floor(w/8)%4, acc:Math.floor(w/32)%8, bag:Math.floor(w/256)%4, hair:Math.floor(w/1024)%8, skin:Math.floor(w/8192)%4, style:Math.floor(w/32768)%4, hs:Math.floor(w/131072)%4 });
const YOUNG_HAIR=F([0, 1, 2, 3, 4, 7, 1, 0]);
/* a person's clothes from their seed, coat colour and umbrella kind: each part steps along its palette until it stands apart from the coat (WEAR_MIN) */
const WEARS=new Map();   // a person's wear is fixed: worked out once
export function wearFor(seed, ci, umb, o={}){ const key=seed+':'+ci+':'+umb+':'+(o.old ? 1 : 0)+(o.sport ? 1 : 0); let w=WEARS.get(key); if(w==null){ w=wearOf(seed, ci, umb, o); WEARS.set(key, w); } return w; }
function wearOf(seed, ci, umb, o){ const r=k=>hash(seed+0.73, 60+k), coat=rgb((umb===UMB.coat ? WEAR.rain : WEAR.coat)[ci%8]), step=(i, n, s, far)=>{ for(let j=0;j<n && !far(i);j++) i=(i+s)%n; return i; };
  const legs=step(Math.floor(r(1)*8), 8, 3, i=>cdist(rgb(WEAR.legs[i]), coat)>=WEAR_MIN.legs), shoes=step(Math.floor(r(2)*4), 4, 1, i=>cdist(rgb(WEAR.shoes[i]), rgb(WEAR.legs[legs]))>=WEAR_MIN.shoes);
  const acc=step(Math.floor(r(3)*8), 8, 3, i=>cdist(rgb(WEAR.acc[i]), coat)>=WEAR_MIN.acc), bag=step(Math.floor(r(4)*4), 4, 1, i=>cdist(rgb(WEAR.bag[i]), coat)>=WEAR_MIN.bag), s7=r(7);
  return wearCode({ legs, shoes, acc, bag, hair:o.old ? 5+Math.floor(r(5)*2) : YOUNG_HAIR[Math.floor(r(5)*8)], skin:Math.floor(r(6)*4), style:o.old ? 3 : o.sport ? 0 : s7<0.45 ? 0 : s7<0.7 ? 1 : s7<0.86 ? 2 : 3, hs:Math.floor(r(8)*4) }); }
const WAITER=wearCode({ legs:1, shoes:1, acc:2, bag:0, hair:1, skin:1, style:0, hs:0 });   // black trousers, brown shoes, a cream apron's colour for the cap and scarf slots
/* every part's colour (albedo 0…1) of a figure: c its look code, w its wear code, who the figure's place in a couple or group (each their own clothes) —
   the shader's outfit() is the same arithmetic */
export function outfitOf(c, w, who=0){ const uk=Math.floor(c/8)%8, P=wearParts(w), m=(i, n, s)=>(i+s*who)%n;
  return { coat:rgb((uk===UMB.coat ? WEAR.rain : WEAR.coat)[m(c%8, 8, 3)]), legs:rgb(WEAR.legs[m(P.legs, 8, 5)]), shoes:rgb(WEAR.shoes[m(P.shoes, 4, 1)]), acc:rgb(WEAR.acc[m(P.acc, 8, 3)]),
    bag:rgb(WEAR.bag[m(P.bag, 4, 1)]), hair:rgb(WEAR.hair[m(P.hair, 8, 3)]), skin:rgb(WEAR.skin[m(P.skin, 4, 1)]), umb:rgb(WEAR.umb[Math.floor(c/64)%4]), style:P.style, hs:P.hs }; }
export const LIFE=F({ seed:0x4C494645, loop:180, z0:12, r:0.35, rCouple:0.6, gate:30, stagger:40, fadeMove:2, fadeStand:6,
  lanes:F([F({ x:-2.6, dir:1, v:1.25 }), F({ x:-1.2, dir:-1, v:0.85, old:true }), F({ x:20.2, dir:1, v:1.35 }), F({ x:21.6, dir:-1, v:1.2 }), F({ x:26.4, dir:1, v:1.3 }), F({ x:27.8, dir:-1, v:1.15 }), F({ x:29.4, dir:1, v:1.05 })]),
  pause:F({ x:31.6, dir:-1, v:1.1, walk:40, stop:8 }),
  cycle:F({ x:13.5, dir:1, v:4.6 }), run:F({ x:33.6, dir:-1, v:2.9 }), waiter:F({ x:35.9, span:F([42, 64]), v:0.9 }),
  tables:F({ x:37.4, cafes:F([F([40, 66]), F([98, 138])]), every:3.2 }),
  stand:F([F({ x:-3.6, z:69, b:'wait', dir:1, g:0 }), F({ x:-3.6, z:69.8, b:'wait', dir:1, g:0 }), F({ x:18.35, z:70, b:'wait', dir:-1, g:1 }), F({ x:24.0, z:90, b:'phone', dir:1, g:2 })]),
  talk:F([F({ x:23.6, z:36 }), F({ x:24.6, z:36 })]),
  /* RELEASE-1 (A): nobody stands for ever — each waiting group (g) walks up (walk s at v m/s), stays (stay s), walks on and is gone for a while (gap s), its own seeded rhythm; the talking pair likewise (g 3) */
  stay:F({ walk:9, v:1.15, stay:F([25, 60]), gap:F([20, 50]), fade:1.5 }),
  wire:F({ x:12.0, y:6.25, z:F([30, 44]) }),   // RELEASE-1: over the moved track
  stride:F([0.15, 0.17]), group:13, natural:F({ along:1.6, across:0.06, cadence:0, p:F([38, 15, 23]) }),   // RAIN-5c: a step = h × (0.15 + 0.17 × speed) (longer when faster: 1.65–2 steps a second); every 13th walker a small group of three
  bunting:F({ x:38.9, y:3.5, sag:0.35, every:0.75, posts:6 }),   // RAIN-5c: little flags over the café terraces (the string lights: rain.js), sagging between posts
  signs:F([F({ x:39.3, y:3.4, z:30, g:'key' }), F({ x:39.3, y:3.5, z:53, g:'cup' }), F({ x:39.3, y:3.5, z:78, g:'cross' }), F({ x:39.3, y:3.4, z:104, g:'croissant' }), F({ x:39.3, y:3.5, z:124, g:'scissors' }),
    F({ x:-3.3, y:3.4, z:58, g:'cross' }), F({ x:-3.3, y:3.5, z:92, g:'cup' })]),   // lit pictograms, no text, never a brand: blade signs facing along the street
  signals:F([F({ x:-0.9, z:70 }), F({ x:13.9, z:72 })]), walk:F([F({ x:-0.5, z:69.2 }), F({ x:13.5, z:71.2 })]), cat:F({ x:39.2, z:50, span:6 }),   // the crossing's lights (the vehicles') and its pedestrian signals
  steam:F([F([4.5, 0, 26]), F([39.6, 3.2, 47])]), puddles:F([F([20.2, 30]), F([24.8, 41]), F([18.6, 55]), F([28.8, 63]), F([22.5, 76]), F([33.0, 34])]),
  roadPuddles:F([F([3.75, 34]), F([6.2, 52]), F([3.75, 88])]),   // RELEASE-1 (C): on the lanes (the near one moved)
  pop:F({ walkers:30, sit:10, stand:4, talk:1 }),
  moods:F({ late:F({ walkers:4, cycle:0, run:1, sit:2, waiter:0, stand:1, talk:0, pause:0, pigeons:0, cat:1, leaves:5 }),
    evening:F({ walkers:30, cycle:1, run:1, sit:10, waiter:1, stand:4, talk:1, pause:1, pigeons:8, cat:0, leaves:9 }),
    after:F({ walkers:15, cycle:1, run:1, sit:5, waiter:1, stand:2, talk:1, pause:1, pigeons:6, cat:0, leaves:7 }) }) });

/* RELEASE-1 (C): THE CAT ON A WINDOWSILL — a lit window of the left row near us (the bake's window map id), its own seeded rhythm: it sits and watches the
   street (now and then it turns its head), washes, walks along the sill and sits at the other end, lies down, and now and then goes in for a while.
   catAt(t) → null (inside) or { state 'sit' | 'wash' | 'walk' | 'lie', u (0…1 through it), at (−1 … 1: its place along the sill), look (−1 … 1), dir } */
export const CAT=F({ win:1586, seed:0x43415421, slot:30, inside:0.12, along:0.3, len:F({ sit:F([40, 110]), wash:F([10, 22]), walk:F([3.5, 5]), lie:F([50, 130]), inside:F([25, 60]) }) });
export function catAt(t, C=CAT){ const k0=Math.floor(t/600), r=(k, j)=>hash(k*7.13+(C.seed%1000), j);
  for(let k=k0-1;k<=k0;k++){ let at=-0.4+0.8*r(k, 1), tt=k*600; const plan=[];   /* each ten minutes its own plan, from the place it ends the last one */
    const ORD=['inside', 'sit', 'wash', 'walk', 'lie']; let last=null;   /* each plan begins with it inside (it comes back to a new place) and ends on the ten minutes: plans tile, nothing runs on across them */
    for(let j=0;tt<k*600+600 && j<40;j++){ const q=r(k, 10+j); let st= j===0 ? 'inside' : q<C.inside ? 'inside' : q<0.4 ? 'sit' : q<0.58 ? 'wash' : q<0.78 ? 'walk' : 'lie'; if(st===last) st=ORD[(ORD.indexOf(st)+1+Math.floor(r(k, 120+j)*3))%5]; last=st; const L=C.len[st], d=Math.min(L[0]+(L[1]-L[0])*r(k, 60+j), k*600+600-tt);   /* never the same thing twice running */
      const to= st==='walk' ? (at>0 ? -0.2-0.6*r(k, 90+j) : 0.2+0.6*r(k, 90+j)) : at; plan.push({ st, t0:tt, d, from:at, to }); at=to; tt+=d; }
    for(const P of plan){ if(t<P.t0 || t>=P.t0+P.d) continue; if(P.st==='inside') return null; const u=(t-P.t0)/P.d, ease=u*u*(3-2*u);
      const look= P.st==='sit' ? Math.max(-1, Math.min(1, 1.6*Math.sin((t-P.t0)*0.21+r(k, 5)*6)*(Math.sin((t-P.t0)*0.07)>0.3 ? 1 : 0.15))) : 0;
      return { state:P.st, u, at:P.st==='walk' ? P.from+(P.to-P.from)*ease : P.from, look, dir:P.to>=P.from ? 1 : -1 }; } }
  return null; }
/* RELEASE-1 (C, revised at night): THE KERBS' STREAMS — runs of water along the road's two kerbs, drawn as flat ribbons in 3D with the vehicles (rain-glass.js
   VEH_F part 14: the lamps mirrored in them, highlights flowing along): streamK(rain) their strength (none dry, fainter after the rain), streamSegs() the
   ribbon's pieces (one every `seg` m from z[0] to z[1] along each kerb, each its own depth for the focus blur) */
export const STREAMS=F({ kerbs:F([0.32, 12.68]), z:F([14, 104]), seg:3, w:0.34, v:0.6 });
export const streamK=rain=>Math.max(0, Math.min(1, ((+rain||0)-0.06)/0.55));
export function streamSegs(S=STREAMS){ const out=[]; for(const x of S.kerbs) for(let z=S.z[0];z<S.z[1];z+=S.seg) out.push({ x, z0:z, len:S.seg }); return out; }
/* RELEASE-1 (C): A GUST TURNS AN UMBRELLA INSIDE OUT — only with a strong Wave (≥ wave0): now and then one walker's umbrella (black or coloured) flips for
   `dur` s — it goes over, shakes, and the walker puts it right; gustFlip(t, wave) → null or { slot, u (0…1) }; the walker is chosen among those out */
export const GUST=F({ wave0:0.55, every:30, p:0.4, dur:4.6 }), GUST_TEST=F({ wave0:0, every:12, p:1, dur:4.6 });   // GUST_TEST: ?rain=gust — one every 12 s at any Wave (to see it)
export function gustFlip(t, wave, G=GUST){ if(!(wave>=G.wave0)) return null; const k=Math.floor(t/G.every), t0=k*G.every+hash(k, 51)*(G.every-G.dur); if(hash(k, 52)>=G.p*Math.min(1, wave)) return null;
  const u=(t-t0)/G.dur; return u>=0 && u<1 ? { slot:k, u } : null; }
/* the seeded population of walkers, given to lanes; order — the order the moods take them in (a mood with M walkers takes orders 0 … M−1) */
export function lifePeople(seed=LIFE.seed, L=LIFE){ const N=L.pop.walkers, per=L.lanes.map(()=>[]);
  for(let i=0;i<N;i++){ const r=k=>hash(i+seed%997, k), kind= i%L.group===4 ? LK.group : i%9===2 ? LK.couple : i%9===5 ? LK.dog : i%9===7 ? LK.child : LK.walk, u=r(2);
    const umb= kind===LK.child || kind===LK.couple || kind===LK.group ? (u<0.5 ? UMB.golf : UMB.black) : u<0.3 ? UMB.black : u<0.5 ? UMB.colour : u<0.6 ? UMB.clear : u<0.68 ? UMB.golf : u<0.8 ? UMB.hood : u<0.88 ? UMB.paper : UMB.coat;
    const a9=r(9), acc= a9<0.2 ? ACC.none : a9<0.36 ? ACC.bag : a9<0.5 ? ACC.backpack : a9<0.6 ? (umb>=UMB.hood ? ACC.hat : ACC.scarf) : a9<0.72 ? ACC.scarf : a9<0.8 ? ACC.bagScarf : a9<0.9 ? (umb>=UMB.hood ? ACC.cap : ACC.tote) : ACC.tote;   // a hat or a cap only without an umbrella
    per[i%L.lanes.length].push({ i, kind, umb, acc, clothes:Math.floor(r(3)*8), uc:Math.floor(r(4)*4), h:1.6+0.32*r(5), build:0.85+0.35*r(6), rank:r(7), stagger:r(8)*L.stagger }); }
  const out=[]; per.forEach((ps, lane)=>{ const ln=L.lanes[lane]; ps.forEach((p, slot)=>{ if(ln.old && slot===0){ p.kind=LK.old; p.umb=UMB.black; p.h=1.62; }
    out.push({ ...p, lane, slot, n:ps.length, wear:wearFor(p.i+seed%997, p.clothes, p.umb, { old:p.kind===LK.old }) }); }); });   // RELEASE-1 (A): their clothes, part by part
  const ranks=out.map(p=>p.rank).sort((a, b)=>a-b); out.forEach(p=>{ p.order=ranks.indexOf(p.rank); }); return out; }
const POP=new Map(), peopleOf=(seed, L)=>{ const k=seed+':'+JSON.stringify(L.lanes)+':'+L.pop.walkers; if(!POP.has(k)) POP.set(k, lifePeople(seed, L)); return POP.get(k); };
const inLook=(L, look, grp, o)=>o<((L.moods[look]||L.moods.late)[grp]||0);
/* RAIN-6b (5): WALKING LESS LIKE EXTRAS (the founder) — each walker's own way of going: a slow drift of pace (two slow waves of position along the
   lane, ±W.along m: a little faster, then slower, never more than the lane's spacing allows), a slight wander across it (±W.across m: the lanes' margins hold) and their own
   cadence (±W.cadence of the step; 0 — the law keeps faster walkers' steps longer). The feet still follow the distance walked (the phase is that distance over the step: no sliding) */
function natural(i, t, ln, W){ const h=k=>hash(i+0.37, 40+k), w1=6.2832/(W.p[0]*(0.8+0.4*h(1))), w2=6.2832/(W.p[1]*(0.8+0.4*h(3)));
  return { ds:W.along*(Math.sin(w1*t+6.28*h(2))+0.5*Math.sin(w2*t+6.28*h(4)))/1.5, dx:W.across*Math.sin(t*6.2832/W.p[2]*(0.7+0.6*h(5))+6.28*h(6)), k:1+W.cadence*(h(7)-0.5)*2 }; }
/* membership over the mood history → { on (in now), since (the time it last changed; −1e9: never) } */
function member(L, hist, grp, o, t){ let on=null, since=-1e9; for(const [tc, lk] of hist){ if(tc>t) break; const v=inLook(L, lk, grp, o); if(on!==null && v!==on) since=tc; on=v; } return { on:!!on, since }; }
/* a walker's distance along their loop at time t (m) and their z */
const walked=(ln, t, off, L)=>off*L.loop+ln.v*t, zOf=(ln, s, L)=>L.z0+frac((ln.dir>0 ? s : -s)/L.loop)*L.loop;
/* the time of the first gate (a side street, a doorway) a walker passes after T: gates every L.gate metres along the loop */
const gateAfter=(ln, T, off, L)=>{ const s=walked(ln, T, off, L), g=L.gate, d=g-frac(s/g)*g; return T+(d<1e-6 ? g : d)/ln.v; };
function moverAlpha(L, hist, grp, o, stagger, ln, off, t){ const m=member(L, hist, grp, o, t); if(m.since<-1e8) return m.on ? 1 : 0;
  const tg= L.instant ? m.since : gateAfter(ln, m.since+stagger, off, L), f= L.instant ? 1 : Math.max(0, Math.min(1, (t-tg)/L.fadeMove)); if(t<tg) return m.on ? 0 : 1; return m.on ? f : 1-f; }
function standAlpha(L, hist, grp, o, stagger, t){ const m=member(L, hist, grp, o, t); if(m.since<-1e8 || L.instant) return m.on ? 1 : 0; const f=Math.max(0, Math.min(1, (t-m.since-stagger)/L.fadeStand)); return m.on ? f : 1-f; }
/* RELEASE-1 (A): where a waiting group is in its rhythm at t → null (away) or { walk (arriving or leaving), dz (m from its place), s (m walked, for the
   step's phase), a (its fade at the two ends) }: walk up for L.stay.walk s, stay, walk on as long, then away for its gap */
export function stayAt(L, g, dir, t){ const Y=L.stay; if(!Y) return { walk:false, dz:0, s:0, a:1 }; const stay=Y.stay[0]+(Y.stay[1]-Y.stay[0])*hash(g, 31), gap=Y.gap[0]+(Y.gap[1]-Y.gap[0])*hash(g, 32), per=2*Y.walk+stay+gap, u=frac(t/per+hash(g, 33))*per;
  if(u>=2*Y.walk+stay) return null; const fa=Math.min(1, u/Y.fade, (2*Y.walk+stay-u)/Y.fade);
  if(u<Y.walk) return { walk:true, dz:-dir*Y.v*(Y.walk-u), s:Y.v*u, a:fa }; if(u<Y.walk+stay) return { walk:false, dz:0, s:0, a:fa }; return { walk:true, dz:dir*Y.v*(u-Y.walk-stay), s:Y.v*(u-Y.walk-stay), a:fa }; }
/* everything out at time t (s); look — now; cars: the traffic law's list at t; wave 0…1; hist: [[t, look]…] (absent: always `look`) → items */
export function lifeAt(t, look, cars=[], wave=0, seed=LIFE.seed, L=LIFE, hist=null, o=null){ const H=hist && hist.length ? hist : [[-1e9, look]], cur=H[H.length-1][1], M=L.moods[cur]||L.moods.late, out=[];   // RAIN-5c: o { signal } — the crossing's light; RELEASE-1 (C): o.rain — the kerbs' streams
  const zz=o && o.sleep>0 ? o.sleep : 0, home=r=>zz ? sleepPerson(r, zz) : 1;   // RAIN-6b (8): o.sleep — each person leaves at their own moment
  for(const p of peopleOf(seed, L)){ const ln=L.lanes[p.lane], off=p.slot/p.n+hash(p.lane, 3)*0.5, a=moverAlpha(L, H, 'walkers', p.order, p.stagger, ln, off, t)*home(p.rank); if(a<=0.001) continue;
    const N=L.natural ? natural(p.i, t, ln, L.natural) : null, s=walked(ln, t, off, L)+(N ? N.ds : 0), wide=p.kind===LK.couple || p.kind===LK.child || p.kind===LK.dog || p.kind===LK.group || p.umb===UMB.golf, step=p.h*(L.stride[0]+L.stride[1]*ln.v)*(p.kind===LK.old ? 0.8 : 1)*(N ? N.k : 1);   // RAIN-5c: the step from the speed; RAIN-6b (5): each their own pace
    out.push({ kind:p.kind, x:ln.x+(N ? N.dx : 0), y:0, z:zOf(ln, s, L), h:p.h, w:(p.kind===LK.group ? 1.5 : wide ? 1.3 : 0.75)*p.build, ph:frac(s/(2*step))+(ln.dir<0 ? 1 : 0), c:p.clothes+8*p.umb+64*p.uc+256*p.acc, wear:p.wear, pi:p.i, a, lane:p.lane, dir:ln.dir, face:ln.dir<0 ? 'front' : 'back', step, v:ln.v, r:wide ? L.rCouple : L.r }); }
  { const G2=o && o.gust ? GUST_TEST : GUST, g=gustFlip(t, o && o.gust ? 1 : wave, G2); if(g){ const C=out.filter(q=>(q.kind===LK.walk || q.kind===LK.old) && q.a>0.95 && Math.floor(q.c/8)%8<=UMB.colour && q.c<2048);   // RELEASE-1 (C): the gust's umbrella (the look code's 2048s: its progress)
    if(C.length){ const t0=t-g.u*G2.dur, P=peopleOf(seed, L), zAt=q=>{ const p=P.find(r=>r.i===q.pi); if(!p) return 1e9; const ln=L.lanes[p.lane], off=p.slot/p.n+hash(p.lane, 3)*0.5, N=L.natural ? natural(p.i, t0, ln, L.natural) : null; return zOf(ln, walked(ln, t0, off, L)+(N ? N.ds : 0), L); };
      const near=C.map(q=>({ q, z:zAt(q) })).filter(e=>e.z>20 && e.z<48).sort((a, b)=>Math.abs(a.z-28)-Math.abs(b.z-28)), q= near.length ? near[0].q : C[Math.floor(hash(g.slot, 53)*C.length)];   /* RELEASE-1 (night): a walker near us, chosen where they were as the gust began (it stays theirs) */
      q.c+=2048*Math.max(1, Math.round(g.u*15)); q.flip=g.u; } } }
  { const q=L.pause, per=q.walk+q.stop, k=Math.floor(t/per), u=t-k*per, s=(k*q.walk+Math.min(u, q.walk))*q.v, a=standAlpha(L, H, 'pause', 0, 12, t)*home(0.31);   // the one who stops and looks round (a lane of their own)
    if(a>0.001) out.push({ kind:u<q.walk ? LK.walk : LK.stand, x:q.x, y:0, z:zOf(q, s, L), h:1.74, w:0.75, ph:u<q.walk ? frac(s/1.46) : 0.5+0.5*Math.sin((u-q.walk)/q.stop*6.28), c:2+8*UMB.colour+64*2, wear:wearFor(9001, 2, UMB.colour), a, lane:'pause', dir:q.dir, r:L.r }); }
  for(const c of lifeCyclists(t, cur, L)){ const h=home(0.55); if(h>0.001) out.push(h<1 ? { ...c, a:c.a*h } : c); }   // RAIN-5c: facing its way (its back as it rides away), the rear light blinking
  for(let i=0;i<(M.run||0);i++){ const q=L.run, s=q.v*t+0.67*L.loop; const h=home(0.12+0.1*i); if(h>0.001) out.push({ kind:LK.run, x:q.x, y:0, z:zOf(q, s, L), h:1.8, w:0.7, ph:frac(s/2.4), c:6+8*UMB.hood, wear:wearFor(9100+i, 6, UMB.hood, { sport:true }), a:h, lane:'run', dir:q.dir, r:L.r }); }
  { const T=L.tables, seats=[]; for(const [a, b] of T.cafes) for(let z=a+1.5;z<b-1.5;z+=T.every) seats.push(z);
    for(let i=0;i<Math.min(L.pop.sit, seats.length);i++){ const a=standAlpha(L, H, 'sit', i, hash(i, 15)*L.stagger, t)*home(hash(i, 23)); if(a<=0.001) continue; const z=seats[Math.floor(hash(i, 7)*seats.length)]+((i%2) ? 0.7 : -0.7), sx=T.x+((i%3)-1)*0.75;
      out.push({ kind:LK.sit, x:sx, y:0, z, h:1.3, w:0.7, ph:frac(t*0.13+hash(i, 9)), c:Math.floor(hash(i, 10)*8), wear:wearFor(9200+i, Math.floor(hash(i, 10)*8), UMB.black), a, lane:'sit', r:L.r }); } }
  for(let i=0;i<(M.waiter||0);i++){ const q=L.waiter, s=0.5-0.5*Math.cos(t*q.v/(q.span[1]-q.span[0])*Math.PI); out.push({ kind:LK.waiter, x:q.x, y:0, z:q.span[0]+s*(q.span[1]-q.span[0]), h:1.85, w:0.75, ph:frac(t*0.7), c:0, wear:WAITER, a:home(0.8), lane:'waiter', r:L.r }); }
  L.stand.forEach((q, i)=>{ const S=stayAt(L, q.g, q.dir||1, t); if(!S) return; const a=standAlpha(L, H, 'stand', i, hash(i, 17)*L.stagger, t)*home(hash(i, 24))*S.a; if(a<=0.001) return; const h=1.62+0.2*hash(i, 18), step=h*(L.stride[0]+L.stride[1]*(L.stay ? L.stay.v : 1.15));
    out.push({ kind:S.walk ? LK.walk : LK.stand, x:q.x, y:0, z:q.z+S.dz, h, w:0.75, ph:S.walk ? frac(S.s/(2*step))+(q.dir<0 ? 1 : 0) : q.b==='phone' ? 0.25 : 0.5+0.1*Math.sin(t*0.4+i), c:Math.floor(hash(i, 19)*8)+8*(q.b==='phone' ? UMB.hood : UMB.black), wear:wearFor(9300+i, Math.floor(hash(i, 19)*8), UMB.black), a, lane:'stand', dir:q.dir, face:q.dir<0 ? 'front' : 'back', step, v:L.stay ? L.stay.v : 1.15, r:L.r }); });
  for(let k=0;k<L.pop.talk;k++){ const S=stayAt(L, 3, -1, t); if(!S) continue; const a=standAlpha(L, H, 'talk', k, 8, t)*home(0.45)*S.a; if(a<=0.001) continue;
    L.talk.forEach((q, i)=>{ const h=1.7-0.08*i, step=h*(L.stride[0]+L.stride[1]*(L.stay ? L.stay.v : 1.15)); out.push({ kind:S.walk ? LK.walk : LK.talk, x:q.x, y:0, z:q.z+S.dz, h, w:0.75, ph:S.walk ? frac(S.s/(2*step)+i*0.31)+1 : frac(t*0.35+i*0.5)+(i ? 2 : 0), c:(3+i*4)%8+8*UMB.black, wear:wearFor(9400+i, (3+i*4)%8, UMB.black), a, lane:'talk', dir:-1, face:'front', step, v:L.stay ? L.stay.v : 1.15, r:L.r }); }); }
  if(M.pigeons){ const q=L.wire, tram=cars.find(c=>c.kind==='tram' && Math.abs(c.z-(q.z[0]+q.z[1])/2)<14+(c.len||28)/2), up= tram ? 1 : 0;   // pigeons on the wire, rising when a tram passes under them
    for(let i=0;i<M.pigeons;i++){ const z=q.z[0]+(i+0.5)/M.pigeons*(q.z[1]-q.z[0])+(hash(i, 1)-0.5)*0.6, fl=up*(0.6+0.4*hash(i, 2));
      out.push({ kind:LK.pigeon, x:q.x+fl*(hash(i, 4)-0.5)*6, y:q.y+fl*(2+3*hash(i, 5)), z:z+fl*(hash(i, 6)-0.5)*5, h:0.28, w:fl ? 0.6 : 0.32, ph:fl ? frac(t*3+hash(i, 8)) : -1, c:0, a:1, lane:'wire' }); } }
  for(let i=0;i<(M.cat||0);i++){ const q=L.cat; out.push({ kind:LK.cat, x:q.x, y:0, z:q.z+Math.sin(t*0.12)*q.span, h:0.35, w:0.7, ph:frac(t*0.5), c:0, a:1, lane:'cat', dir:Math.cos(t*0.12)>0 ? 1 : -1 }); }
  { const n=Math.round(M.leaves*(1+0.8*Math.max(0, Math.min(1, wave)))); for(let i=0;i<n;i++){ const g=0.6+1.4*Math.max(0, wave)+0.5*Math.sin(t*0.3+i), s=frac(hash(i, 11)+t*g*0.012);
    out.push({ kind:LK.leaf, x:14.5+hash(i, 12)*22+s*6, y:0.05+0.4*Math.max(0, Math.sin(t*2.1+i*1.7))*g*0.5, z:L.z0+6+frac(hash(i, 13)+s)*80, h:0.18, w:0.18, ph:frac(t*0.9+hash(i, 14)), c:i%2, a:0.9, lane:'air' }); } }
  for(let k=0;k<L.steam.length;k++) for(let j=0;j<5;j++){ const P=L.steam[k], age=frac(t/4.5+j/5); out.push({ kind:LK.steam, x:P[0]+Math.sin(t*0.4+j)*0.3*age, y:P[1]+age*3.2, z:P[2], h:0.9+age*1.4, w:0.9+age*1.6, ph:age, c:0, a:0.32*(1-age)*Math.min(1, age*6), lane:'air' }); }
  L.puddles.forEach((P, i)=>{ const ph=frac(t*0.55+hash(i, 21)); out.push({ kind:LK.ring, x:P[0], y:0.02, z:P[1], h:0.05, w:0.4+ph*1.2, ph, c:0, a:0.5*(1-ph), lane:'ground' }); });
  for(const c of cars) if(c.kind!=='tram') for(const P of L.roadPuddles) if(Math.abs(c.x-P[0])<1.2 && Math.abs(c.z-P[1])<2.2){ const ph=1-Math.abs(c.z-P[1])/2.2; out.push({ kind:LK.splash, x:P[0]+0.9, y:0, z:P[1], h:0.7*ph, w:1.4, ph, c:0, a:0.7*ph, lane:'ground' }); }
  /* RAIN-10: the tram's passengers are drawn inside its lit windows by the tram itself (rain-glass.js TRAM_F) — no heads floating over its roof */
  /* RAIN-5c: the street's furniture — bunting over the terraces (swaying with Wave), the lit pictogram signs, the crossing's lights and its pedestrian signals
     (the vehicles' green = the walkers' red; o.signal: the room's music-driven light) */
  { const B=L.bunting; for(const [a, b] of L.tables.cafes){ const n=Math.floor((b-a)/B.every); for(let j=0;j<=n;j++){ const z=a+j*B.every, u=frac((z-a)/B.posts), sag=B.sag*4*u*(1-u), sw=Math.sin(t*1.3+z*0.7)*(0.08+0.25*Math.max(0, wave));
      out.push({ kind:LK.flag, x:B.x, y:B.y-sag-0.32, z, h:0.32, w:0.26, ph:frac(0.5+sw*0.5), c:j%4, a:0.95, lane:'air' }); } } }
  const fev=farEventAt(t);   // RAIN-5d: the rare events (pure/far.js): a sign flickering, the scooter
  L.signs.forEach((q, j)=>{ const fl= fev && fev.kind==='flicker' && j===Math.floor(fev.k*L.signs.length) && frac(fev.u*FAR_LIFE.events.dur.flicker*6.7+fev.k)<0.3 ? 0.35 : 1;
    out.push({ kind:LK.sign, x:q.x, y:q.y, z:q.z, h:0.7, w:0.7, ph:0.5+0.04*Math.sin(t*0.7+q.z), c:SIGNS.indexOf(q.g), a:fl, lane:'sign' }); });
  if(fev && fev.kind==='scooter'){ const S=FAR_LIFE.scooter; out.push({ kind:LK.scooter, x:S.x, y:0, z:S.z[0]+(S.z[1]-S.z[0])*fev.u, h:1.65, w:0.8, ph:0.3+1, c:3+8*UMB.hood, wear:wearFor(9600, 3, UMB.hood, { sport:true }), a:Math.min(1, fev.u*10, (1-fev.u)*10), lane:'scooter', dir:S.dir, view:'front', r:0.5 }); }
  const go=o && o.signal ? 1 : 0;
  for(const q of L.signals) out.push({ kind:LK.signal, x:q.x, y:3.6, z:q.z, h:1.05, w:0.42, ph:go ? 0.75 : 0.25, c:0, a:1, lane:'signal' });
  for(const q of L.walk) out.push({ kind:LK.walksig, x:q.x, y:2.2, z:q.z, h:0.5, w:0.42, ph:go ? 0.25 : 0.75, c:0, a:1, lane:'signal' });
  return out; }
/* RAIN-5c: the cyclists out at t in mood `look`: each faces its way — riding away (z growing) it shows its back and its red rear light, blinking
   (1.6 per second, on 40 %); coming towards us its front and its white light. view: 'back' | 'front' (the row: never 'side') */
export function lifeCyclists(t, look, L=LIFE){ const M=L.moods[look]||L.moods.late, out=[];
  for(let i=0;i<(M.cycle||0);i++){ const q=L.cycle, s=q.v*t+0.31*L.loop, away=q.dir>0, blink=frac(t*1.6)<0.4 ? 1 : 0;
    out.push({ kind:LK.cycle, x:q.x, y:0, z:zOf(q, s, L), h:1.75, w:0.9, ph:frac(s/2.1)+(away ? 0 : 1)+2*blink, c:1+8*UMB.hood, wear:wearFor(9500+i, 1, UMB.hood, { sport:true }), a:1, lane:'cycle', dir:q.dir, view:away ? 'back' : 'front', blink, r:0.5 }); }
  return out; }
/* the kinds counted as people (the row: the count eases, never jumps) */
export const PEOPLE=F([LK.walk, LK.couple, LK.dog, LK.cycle, LK.run, LK.sit, LK.waiter, LK.child, LK.old, LK.stand, LK.talk, LK.group, LK.scooter]);
