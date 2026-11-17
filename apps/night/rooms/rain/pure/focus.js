/* RAIN-0: DEPTH IS FOCUS — the law (pure, rule #36; data row «RAIN focus law (app)»). The playing hand's depth d (0 near … 1 far, the hands view's
   own number: the calibration's near and far points land on 0 and 1 as in the forest) is the camera's focus f: 0 = on the glass, 1 = the hills.
   The target has a dead zone at each end (exactly 0 and 1 there, so near and far each have a steady place), the focus glides to it (one time
   constant, exact for any frame length) and never faster than maxRate (a tracking jump cannot make it jump). With no hand it drifts slowly back to
   the rest focus (the glass sharp, the city in soft discs).
   RAIN-0b: THE FOCUS HAS MANY DEPTHS. Every layer and light has its own depth (glass 0, frame 0.03, street 0.35 near … 0.65 far, the facade opposite
   ≈ 0.72, roofs ≈ 0.82, hills ≈ 0.95, sky 1 — pure/city.js depthOf); the focus is a depth on the same line (focusDepth); each thing's blur is
   (|its depth − the focus depth| − the plateau) × K, between 0 and 1 (RAIN-5e). A hand in the middle: the street sharp, the glass and the hills soft. */
/* RAIN-5e (the founder: «only a band of a few metres is sharp»): a PLATEAU of full sharpness round the focus depth, wider as the focus goes out
   (plateau[0] + plateau[1] × f), and a gentler fall-off K beyond it — far, the whole street, the house opposite, the roofs and the hills sharp at
   once (the glass still soft); near, the whole glass sharp. The numbers: the gentlest fall-off meeting the row's cases (a search, said in the report) */
export const FOCUS=Object.freeze({ near:0.18, far:0.82, tc:0.3, maxRate:1.8, rest:0.2, restTc:2.4, gamma:1.35, span:0.82, K:1.7, plateau:Object.freeze([0.03, 0.43]) });
export const LAYER_DEPTH=Object.freeze({ glass:0, frame:0.03, streetNear:0.35, street:0.5, streetFar:0.65, facade:0.72, roofs:0.82, hills:0.95, sky:1 });
const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* the focus a hand at depth d asks for: 0 up to `near`, 1 from `far`, a smooth step between */
export function focusTarget(d){ const x=clamp(((+d||0)-FOCUS.near)/(FOCUS.far-FOCUS.near), 0, 1); return x*x*(3-2*x); }
/* one step of dt seconds from focus f towards `target`; hand: false = no playing hand (the slow drift to rest) */
export function focusStep(f, target, dt, hand=true){
  if(!(dt>0)) return f;
  const tc=hand ? FOCUS.tc : FOCUS.restTc, m=FOCUS.maxRate*dt;
  return clamp(clamp(f+(target-f)*(1-Math.exp(-dt/tc)), f-m, f+m), 0, 1);
}
/* the focus f as a depth on the layers' line (0 the glass … 0.82: the plateau then reaches the hills) */
export const focusDepth=f=>clamp(+f||0, 0, 1)*FOCUS.span;
/* the blur (0 sharp … 1 the widest) of a thing at `depth` with the focus at f */
export const focusPlateau=f=>FOCUS.plateau[0]+FOCUS.plateau[1]*clamp(+f||0, 0, 1);   // RAIN-5e: the half-width of the sharp band
export const blurAt=(depth, f)=>Math.min(1, Math.max(0, Math.abs((+depth||0)-focusDepth(f))-focusPlateau(f))*FOCUS.K);
/* the blurs at focus f of every layer (each 0…1) */
export const focusBlur=f=>{ const o={}; for(const [k, d] of Object.entries(LAYER_DEPTH)) o[k]=blurAt(d, f); return o; };
