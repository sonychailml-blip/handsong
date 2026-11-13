/* DESIGN-1 part D: THE START SCREEN'S STILL AND THE REVEAL — the law (pure, rule #36; data row «NIGHT start still (app)»). Behind the start card a prepared,
   dim still of the room; after Begin, once the start ends, the still gives way to the live room: never before the room is drawn AND its own fade-in is
   over (SCENE_IN_MS = the host's SCENE_FADE.in), so no frame between them is black; a late room keeps the still (it breathes) until it is ready. The
   reveal clears the still from the FAR point of the picture (its horizon) outwards to the near edges, under a mist over the whole picture that rises and clears; the emblem's glowing
   dot drifts into the picture as the first firefly. Reduced motion, or a background other than the room's picture: a plain fade. */
export const STILL=Object.freeze({ revealMs:2600, fadeMs:700, sceneInMs:800, far:Object.freeze([0.5, 0.42]), soft:0.22, mist:0.2,
  dotMs:2300, dotTo:Object.freeze([0.57, 0.6]), dotLift:0.12, dotR0:4.2, dotR1:2.2 });
export const STILL_PHASES=Object.freeze(['start', 'wait', 'reveal', 'done']);
const clamp=x=>Math.max(0, Math.min(1, x));
export const stillEase=x=>{ x=clamp(x); return x<0.5 ? 2*x*x : 1-Math.pow(-2*x+2, 2)/2; };
/* the phase at `now` (ms): s = { ended (the start's end, ms, or null), readyAt (the live room drawn and its veil lifted, or null), room (true: the room's
   picture is the background), plain (reduced motion), none (the old way: no still after the start — the probes' CONTROL) }.
   → { phase, p (0…1 in the reveal), t0 (the reveal's start, or null) } */
export function stillPhase(s, now){
  if(s.ended==null) return { phase:'start', p:0, t0:null };
  if(s.none) return { phase:'done', p:1, t0:s.ended };
  if(s.room && s.readyAt==null) return { phase:'wait', p:0, t0:null };
  const t0= s.room ? Math.max(s.ended, s.readyAt+STILL.sceneInMs) : s.ended;
  if(now<t0) return { phase:'wait', p:0, t0 };
  const dur= s.plain || !s.room ? STILL.fadeMs : STILL.revealMs, p=clamp((now-t0)/dur);
  return { phase: p>=1 ? 'done' : 'reveal', p, t0 };
}
/* the still's look at reveal progress p: clear — the mask's clear radius (a share of the far point's farthest corner; ≤ 0 covers everything, ≥ 1 + soft
   shows nothing of the still); opacity; mist — the haze over the still (0…STILL.mist), rising then cleared with it. plain: an opacity fade only */
export function stillLook(p, plain){
  if(plain) return { clear:-1, opacity:1-clamp(p), mist:0 };
  const e=stillEase(p); return { clear:e*(1+STILL.soft), opacity:1, mist:STILL.mist*Math.sin(Math.PI*Math.min(1, p*1.25)) };
}
/* the dot from the emblem (x0, y0, px) into the picture (STILL.dotTo of the w × h screen) along a lifted curve: its place, radius (px) and strength at
   dot progress q (0…1); it fades over the last quarter, where the room's fireflies take over */
export function stillDot(q, x0, y0, w, h){
  q=clamp(q); const e=stillEase(q), x1=STILL.dotTo[0]*w, y1=STILL.dotTo[1]*h, cx=(x0+x1)/2, cy=Math.min(y0, y1)-STILL.dotLift*h;
  const x=(1-e)*(1-e)*x0+2*(1-e)*e*cx+e*e*x1, y=(1-e)*(1-e)*y0+2*(1-e)*e*cy+e*e*y1;
  return { x, y, r:STILL.dotR0+(STILL.dotR1-STILL.dotR0)*e, a: q<0.75 ? 1 : 1-(q-0.75)/0.25 };
}
/* the still a room gives for a level ('full' | 'reduced'; 'minimal' — no WebGL — takes the reduced one) → its path in the room's folder, or null */
export const stillFile=(rec, level)=> rec && rec.still ? (rec.still[level==='full' ? 'full' : 'reduced'] || null) : null;
