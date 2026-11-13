/* RAIN-0: DEPTH IS FOCUS — the law (pure, rule #36; data row «RAIN focus law (app)»). The playing hand's depth d (0 near … 1 far, the hands view's
   own number: the calibration's near and far points land on 0 and 1 as in the forest) is the camera's focus f: 0 = on the glass, 1 = in the city.
   The target has a dead zone at each end (exactly 0 and 1 there, so near and far each have a steady place), the focus glides to it (one time
   constant, exact for any frame length) and never faster than maxRate (a tracking jump cannot make it jump). With no hand it drifts slowly back to
   the rest focus (the glass sharp, the city in soft discs). The two blurs are opposite: the city's falls as the glass's rises. */
export const FOCUS=Object.freeze({ near:0.18, far:0.82, tc:0.3, maxRate:1.8, rest:0.2, restTc:2.4, gamma:1.35 });
const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
/* the focus a hand at depth d asks for: 0 up to `near`, 1 from `far`, a smooth step between */
export function focusTarget(d){ const x=clamp(((+d||0)-FOCUS.near)/(FOCUS.far-FOCUS.near), 0, 1); return x*x*(3-2*x); }
/* one step of dt seconds from focus f towards `target`; hand: false = no playing hand (the slow drift to rest) */
export function focusStep(f, target, dt, hand=true){
  if(!(dt>0)) return f;
  const tc=hand ? FOCUS.tc : FOCUS.restTc, m=FOCUS.maxRate*dt;
  return clamp(clamp(f+(target-f)*(1-Math.exp(-dt/tc)), f-m, f+m), 0, 1);
}
/* the blurs at focus f, each 0…1: city (1 with the focus on the glass), glass (1 with the focus in the city) */
export const focusBlur=f=>{ const x=clamp(+f||0, 0, 1); return { city:Math.pow(1-x, FOCUS.gamma), glass:Math.pow(x, FOCUS.gamma) }; };
