/* RAIN-5d: LIFE AT EVERY DISTANCE — a pure seeded law of time (rule #36; data row «RAIN far life (app)»). The founder: «still too dead, especially far
   away». Quiet and believable, warm dominating — never a Christmas tree:
   - THE HILLS (places in view-angle units, on the backdrop the bake drew — tools/design/rain/bake/city.js — and only where the law sees the hills):
     a WINDING ROAD climbing in switchbacks, its cars crawling (headlights one way, tail lights the other; evenly spaced per lane: no overlaps);
     blinking red lights on two MASTS and the TV TOWER (u 0.95, where the bake put it); a lit CABLE CAR, its cabins gliding up and down a slope; the
     hill WINDOWS twinkling through the haze; a lit CHURCH (the dome at u 0.66) with its bell tower; a BRIDGE with its lamps.
   - RARE EVENTS from one seeded schedule (gaps 25–70 s, never the same kind twice in a row): someone moving in a lit ATTIC, a neighbour SMOKING on a
     balcony (the cigarette's glow brighter at each draw), a SCOOTER delivery rider with a small headlight, a shop SIGN flickering, a hill WINDOW
     going dark (and back), CAR LIGHTS crossing the bridge. The cars' turn signals and the rest of the street are the room's (rain.js).
   Blink rates (the row checks them against real ones): aviation red 1 Hz (60 a minute), the tower's top 0.75 Hz, turn signals 1.5 Hz. */
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const FAR_LIFE=F({ seed:0x464152,
  road:F({ pts:F([F([0.28, 0.12]), F([0.98, 0.28]), F([0.42, 0.45]), F([1.12, 0.6]), F([0.62, 0.78])]), lanes:F([F({ dir:1, n:3, v:0.0045, df:-0.012 }), F({ dir:-1, n:3, v:0.0038, df:0.012 })]), gap:0.18 }),
  masts:F([F({ u:-1.18, hz:1, duty:0.5, ph:0 }), F({ u:0.22, hz:1, duty:0.5, ph:0.37 })]), tower:F({ u:0.95, h:F([0.025, 0.05, 0.08]), hz:0.75, duty:0.3 }),
  cable:F({ a:F([-0.36, 0.12]), b:F([-0.08, 0.82]), cabins:4, period:220 }), church:F({ u:0.66, f:0.45 }), bridge:F({ u:F([-0.66, -0.5]), f:0.22, lamps:5 }),
  twinkle:F({ depth:0.35, hz:F([0.07, 0.31]) }),
  events:F({ kinds:F(['attic', 'smoker', 'scooter', 'flicker', 'hillwin', 'bridge']), gap:F([25, 70]), dur:F({ attic:26, smoker:130, scooter:16, flicker:5, hillwin:48, bridge:14 }) }),
  turn:F({ hz:1.5, share:0.12 }), smoker:F({ x:38.8, y:10.7, z:47, draw:F([10, 18]) }), scooter:F({ x:0.8, dir:-1, v:7.5, z:F([200, 12]) }) });
/* the hills' top at u (view-angle units) by bisection on the law's own scene (sceneAt) — null where near houses cover the backdrop */
export function hillTop(u, sceneAt, horizon){ let lo=horizon-0.05, hi=0.6; if(sceneAt(u, lo).kind==='sky') return null; for(let k=0;k<24;k++){ const m=(lo+hi)/2; if(sceneAt(u, m).kind==='sky') hi=m; else lo=m; } return lo; }
/* a place on the slope: u, and f (0 the hills' foot at the horizon … 1 their top) → [x, y] */
export const slope=(u, f, top, horizon)=>{ const t=top(u); return t==null ? null : [u, horizon+(t-horizon)*f]; };
/* the road's polyline length and the point at arc length s (in the polyline's own (u, f) space) */
const segs=P=>{ const out=[]; let L=0; for(let i=1;i<P.length;i++){ const d=Math.hypot(P[i][0]-P[i-1][0], (P[i][1]-P[i-1][1])*2); out.push([L, d, P[i-1], P[i]]); L+=d; } return { out, L }; };
export const roadLen=(R=FAR_LIFE.road)=>segs(R.pts).L;
export function roadAt(s, R=FAR_LIFE.road){ const { out, L }=segs(R.pts); s=((s%L)+L)%L; for(const [a, d, p, q] of out) if(s<=a+d){ const t=(s-a)/d; return [p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t, Math.sign(q[0]-p[0])]; } const z=out[out.length-1]; return [z[3][0], z[3][1], 1]; }
/* the road's cars at t → [{ lane, k, s (arc), u, f, head (true: headlights towards us) }] — each lane's cars evenly spaced with a seeded nudge
   smaller than the spacing (never closer than road.gap) */
export function farCars(t, L=FAR_LIFE){ const R=L.road, len=roadLen(R), out=[];
  R.lanes.forEach((ln, li)=>{ const sp=len/ln.n; for(let k=0;k<ln.n;k++){ const nud=(hash(li*31+k, 5)-0.5)*Math.max(0, sp-R.gap)*0.6, s=frac((k*sp+nud+ln.dir*ln.v*t)/len)*len, p=roadAt(s, R);
      out.push({ lane:li, k, s, u:p[0], f:p[1]+ln.df, head:ln.dir*p[2]<0 }); } });
  return out; }
/* a square blink: on for `duty` of each 1/hz seconds from phase ph */
export const blink=(t, hz, duty, ph=0)=>frac(t*hz+ph)<duty ? 1 : 0;
/* a hill window's twinkle (the haze moving): 1 ± depth, slow, its own phases */
export const twinkle=(t, i, L=FAR_LIFE)=>{ const T=L.twinkle, a=T.hz[0]+(T.hz[1]-T.hz[0])*hash(i, 61), b=T.hz[0]+(T.hz[1]-T.hz[0])*hash(i, 62); return 1-T.depth*0.5*(1+0.6*Math.sin(t*a*6.283+i)+0.4*Math.sin(t*b*6.283+i*2.3)); };
/* the cable car's cabins at t → [{ u, f, up }] (a gondola loop: half going up the line, half coming down, offset beside it) */
export function cableAt(t, L=FAR_LIFE){ const C=L.cable, out=[]; for(let k=0;k<C.cabins;k++){ const p=frac(t/C.period+k/C.cabins), up=p<0.5, q=up ? p*2 : 2-p*2, off=up ? 0.004 : -0.004;
    out.push({ u:C.a[0]+(C.b[0]-C.a[0])*q+off, f:C.a[1]+(C.b[1]-C.a[1])*q, up }); } return out; }
/* the rare events' schedule to t1 → [{ kind, t, dur, k }] */
export function farEvents(t1, seed=FAR_LIFE.seed, L=FAR_LIFE){ const E=L.events, out=[]; let t=E.gap[0]*0.4, prev=null, i=0;
  while(t<t1){ const opts=E.kinds.filter(k=>k!==prev), kind=opts[Math.floor(hash(seed+i, 1)*opts.length)], dur=E.dur[kind]; out.push({ kind, t, dur, k:hash(seed+i, 2) }); prev=kind; i++; t+=dur+E.gap[0]+hash(seed+i, 3)*(E.gap[1]-E.gap[0]); }
  return out; }
const SCH=new Map();
/* the event now (or null) → { kind, u (0…1 through it), k } */
export function farEventAt(t, seed=FAR_LIFE.seed){ let s=SCH.get(seed); if(!s || s.until<t){ const until=Math.max(t+3600, s ? s.until*2 : 3600); s={ until, list:farEvents(until, seed) }; SCH.set(seed, s); }
  for(const e of s.list){ if(e.t>t) break; if(t<=e.t+e.dur) return { kind:e.kind, u:(t-e.t)/e.dur, k:e.k }; } return null; }
/* the smoker's glow through the event: in, a draw every 10–18 s (brighter for 1.5 s), out → 0…1 */
export function smokerGlow(u, dur, k, L=FAR_LIFE){ const t=u*dur, D=L.smoker.draw, per=D[0]+(D[1]-D[0])*k, ph=frac(t/per), fade=Math.min(1, u*12, (1-u)*12); return fade*(0.25+0.75*(ph<1.5/per ? Math.sin(ph*per/1.5*Math.PI) : 0)); }
