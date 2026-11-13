/* DESIGN-1 part D: THE START SCREEN'S STILL AND THE REVEAL — the law (pure, rule #36; data row «NIGHT start still (app)»). Behind the start card a prepared,
   dim still of the room; after Begin, once the start ends, the still gives way to the live room: never before the room is drawn AND its own fade-in is
   over (SCENE_IN_MS = the host's SCENE_FADE.in), so no frame between them is black; a late room keeps the still (it breathes) until it is ready. The
   reveal clears the still from the FAR point of the picture (its horizon) outwards to the near edges, under a mist over the whole picture that rises and clears; the emblem's glowing
   dot drifts into the picture as the first firefly. Reduced motion, or a background other than the room's picture: a plain fade. */
export const STILL=Object.freeze({ revealMs:2600, fadeMs:700, sceneInMs:800, far:Object.freeze([0.5, 0.42]), soft:0.22, mist:0.2,
  dotMs:1900, dotTo:Object.freeze([0.57, 0.6]), dotLift:0.16, dotR0:4.2, dotR1:2.2 });   // NIGHT-13: dotMs = DOT.flyMs, dotLift = DOT.lift (the flight below)
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
/* the dot from the emblem (x0, y0, px) to the fixed point STILL.dotTo of a w × h screen (no firefly to follow: the 2D stand-in) — the flight's law, NIGHT-13 */
export const stillDot=(q, x0, y0, w, h)=>dotFlight(q, { x:x0, y:y0, r:STILL.dotR0 }, { x:STILL.dotTo[0]*w, y:STILL.dotTo[1]*h, r:STILL.dotR1 }, h);
/* the still a room gives for a level ('full' | 'reduced'; 'minimal' — no WebGL — takes the reduced one) → its path in the room's folder, or null */
export const stillFile=(rec, level)=> rec && rec.still ? (rec.still[level==='full' ? 'full' : 'reduced'] || null) : null;
/* NIGHT-13: THE STILL'S PLACE — the still is the room's world seen by its camera at rest through a wider lens (rec.still.fov, rec.still.aspect), so the live
   picture of any screen is a crop of it: tan(the live half-angle) of the screen's height spans tan(the still's half-angle) of the still's height. For a
   box bw × bh px showing a live view vw × vh (its camera's aspect; the box stretches it when they differ, as the canvas does) → the still's size and place
   in px; exact unless the screen is wider (or taller) than the still covers — then it is scaled up to cover (cover: true). fov: the live lens (degrees). */
export const stillTan=deg=>Math.tan(deg*Math.PI/360);
export function stillFit(st, fov, bw, bh, vw, vh){
  const sx=(bw/vw)/(bh/vh); let h=bh*stillTan(st.fov)/stillTan(fov), w=h*st.aspect*sx, cover=false;
  const k=Math.max(bw/w, bh/h); if(k>1+1e-9){ w*=k; h*=k; cover=true; }
  return { w, h, x:(bw-w)/2, y:(bh-h)/2, cover };
}
/* the widest screen (w / h at the room's normal lens) the still covers exactly */
export const stillWidest=(st, fov)=>st.aspect*stillTan(st.fov)/stillTan(fov);
/* the vignette as stops of a black veil (its alpha = the light it takes) along e, the ellipse's distance (0 centre … 1 its rim … emax the far corner):
   alpha = k · smoothstep(from, 1, e) — the paint pass's own law (forest pure/paint.js vignetteAt), in n steps (a multiply by 1 − alpha) */
export function stillVeil(V, emax, n=24){ const out=[], sm=x=>{ x=clamp((x-V.from)/(1-V.from)); return x*x*(3-2*x); };
  for(let i=0;i<=n;i++){ const e=V.from+(1-V.from)*i/n; out.push([e/emax, V.k*sm(e)]); } out.unshift([0, 0]); if(emax>1) out.push([1, V.k]); return out; }
/* the vignette's far corner in ellipse units for its centre (cx, cy — cy from the top, as night.css draws it) */
export const stillVeilMax=V=>Math.hypot(Math.max(V.cx, 1-V.cx)/V.rx, Math.max(V.cy, 1-V.cy)/V.ry);
/* NIGHT-13: THE TAP'S PULSE AND THE FIREFLY'S FLIGHT — at the Begin tap the emblem's dot brightens and grows a soft halo (night.css, pulseMs), held a
   little bright while the start card goes; then the dot, from that place and look, lifts off and flies deep into the forest along a lifted curve,
   shrinking with the distance, and becomes one of the room's fireflies (the target: that firefly's place and size on the screen, followed while it drifts);
   it fades over the last quarter, where the firefly itself is. The flight runs inside the reveal (flyMs < revealMs): it adds no wait.
   dotFlight(q, from {x, y, r}, to {x, y, r}, h) at flight progress q 0…1 on a screen of height h → { x, y, r, a, glow (brightness ×), halo (its glow's size ×) } */
export const DOT=Object.freeze({ pulseMs:520, flyMs:1900, lift:0.16, glowHeld:1.45, haloHeld:2, fadeFrom:0.75 });
export function dotFlight(q, A, B, h){
  q=clamp(q); const e=stillEase(q), cx=(A.x+B.x)/2, cy=Math.min(A.y, B.y)-DOT.lift*h;
  const x=(1-e)*(1-e)*A.x+2*(1-e)*e*cx+e*e*B.x, y=(1-e)*(1-e)*A.y+2*(1-e)*e*cy+e*e*B.y;
  return { x, y, r:A.r+(B.r-A.r)*e, a: q<DOT.fadeFrom ? 1 : 1-(q-DOT.fadeFrom)/(1-DOT.fadeFrom), glow:DOT.glowHeld+(1-DOT.glowHeld)*e, halo:DOT.haloHeld+(1-DOT.haloHeld)*e };
}
