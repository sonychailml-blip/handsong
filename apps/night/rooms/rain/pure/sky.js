/* RAIN-5c: THE SKY OVER THE CITY — a pure seeded law of time (rule #36; data row «RAIN sky law (app)»). The founder: «the sky is empty». Two cloud
   layers drift slowly (lit from below by the city's glow: the view shader draws them over the sky's pixels); the moon or a crescent shows through a
   gap by mood (Late night a crescent, After the rain a fuller moon low over the roofs, Evening boulevard overcast — none); and RARE EVENTS: a
   searchlight beam from the fortress on the hill sweeps across the clouds, far aircraft lights cross over the horizon (blinking red / white / green,
   no aircraft drawn). Events come from one seeded schedule: gaps of 2–6 minutes, never the same kind twice in a row.
   Places are in VIEW-ANGLE units (x right, y up from the view's axis), like the windows (pure/windows.js). */
const F=Object.freeze, frac=x=>x-Math.floor(x), hash=(a, b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
export const SKY=F({ seed:0x534B59, drift:F([0.0016, 0.0027]), cover:F({ late:0.55, evening:0.86, after:0.42 }),
  moon:F({ late:F({ x:-0.19, y:0.47, r:0.02, phase:0.24, k:0.85 }), after:F({ x:0.2, y:0.43, r:0.024, phase:0.85, k:1 }), evening:null }),   // inside an upright phone's crop too, clear of the coaching line
  gap:F([120, 360]), kinds:F(['beam', 'plane']), beam:F({ dur:34, x0:-0.75, y0:0.265, swing:F([-0.75, 0.55]), width:0.03 }),
  plane:F({ dur:46, y:F([0.33, 0.46]), span:F([-1.6, 1.6]), blink:F([1.1, 0.12]) }), fortress:F({ x:-0.75, y:0.265 }) });   // the fortress wall on the hill (tools/design/rain/bake/city.js: u −0.95…−0.55)
/* the schedule from 0 to t1 (seconds of the room's clock): [{ kind, t, dur, k (a seeded number for its path) }] — each gap 2–6 min, the kind
   alternating by a seeded choice that never repeats the one before */
export function skyEvents(t1, seed=SKY.seed, S=SKY){ const out=[]; let t=S.gap[0]*0.35+hash(seed, 1)*S.gap[0], prev=null, i=0;
  while(t<t1){ const opts=S.kinds.filter(k=>k!==prev), kind=opts[Math.floor(hash(seed+i, 2)*opts.length)], dur=S[kind].dur;
    out.push({ kind, t, dur, k:hash(seed+i, 3) }); prev=kind; i++; t+=dur+S.gap[0]+hash(seed+i, 4)*(S.gap[1]-S.gap[0]); }
  return out; }
const SCHED=new Map(), schedOf=(seed, t)=>{ let s=SCHED.get(seed); if(!s || s.until<t){ const until=Math.max(t+3600, s ? s.until*2 : 3600); s={ until, list:skyEvents(until, seed) }; SCHED.set(seed, s); } return s.list; };
/* the sky at time t for the mood `mood` ('late' | 'evening' | 'after') → { drift:[a, b], cover, moon (null or { x, y, r, phase, k }), beam (null or
   { x0, y0, ang, k, w }), plane (null or { x, y, red, white, green, k }), ev (the event now, or null) } */
export function skyAt(t, mood, seed=SKY.seed, S=SKY){ const cover=S.cover[mood]==null ? S.cover.late : S.cover[mood], M=S.moon[mood]||null;
  const out={ drift:[S.drift[0]*t, S.drift[1]*t], cover, moon:M ? { ...M } : null, beam:null, plane:null, ev:null };
  for(const e of schedOf(seed, t)){ if(e.t>t) break; const u=(t-e.t)/e.dur; if(u<0 || u>1) continue; out.ev=e; const env=Math.min(1, u*6, (1-u)*6);
    if(e.kind==='beam'){ const B=S.beam, a=B.swing[0]+(B.swing[1]-B.swing[0])*(0.5-0.5*Math.cos(u*Math.PI*(1.2+0.6*e.k))); out.beam={ x0:B.x0, y0:B.y0, ang:a, k:env, w:B.width }; }
    else { const P=S.plane, dir=e.k<0.5 ? 1 : -1, x=dir>0 ? P.span[0]+(P.span[1]-P.span[0])*u : P.span[1]-(P.span[1]-P.span[0])*u, y=P.y[0]+(P.y[1]-P.y[0])*e.k+0.02*u;
      const ph=(t-e.t)%P.blink[0]; out.plane={ x, y, red:ph<P.blink[1] ? 1 : 0, white:((t-e.t+P.blink[0]*0.5)%P.blink[0])<P.blink[1] ? 1 : 0, green:0.6, dir, k:env }; } }
  return out; }
