/* NIGHT-11 part 5 — THE SCENE'S PIXEL BUDGET (audit P4). Pure (the data row pins it). Before: min(devicePixelRatio, 1) × the level's scale CSS
   pixels — a 390-pixel-wide phone got a 234 × 506 picture stretched over its 1,080 physical pixels. Now each level has a budget of pixels; a
   screen with more than one device pixel per CSS pixel gets the ratio that fills the budget (never above its own device pixels, never below
   today's law). A screen with one device pixel per CSS pixel (or fewer) keeps today's law exactly: the laptop does not move (the CONTROL).
   A phone driving a large display as a monitor reports that display's size and ratio: the budget follows it.
   THE GUARD (phone GPUs are unmeasured): `step` lowers the ratio by PIX_STEP per step, down to today's law and no further; guardNext() decides the
   steps from one sample a second — the scene's frame rate against its cap and the hand detection rate — lowering after LOW_S seconds too low,
   raising one step after OK_S seconds comfortably good, and not raising again for HOLD_S after a raise that went bad. */
export const PIX_LEVELS=Object.freeze({ full:Object.freeze({ scale:0.85, budget:750e3 }), reduced:Object.freeze({ scale:0.6, budget:400e3 }) });
export const PIX_STEP=0.82;
export const GUARD=Object.freeze({ lowS:4, okS:20, holdS:120, failS:10, fpsLow:0.7, fpsOk:0.9, detLow:4, detOk:7, camMin:12 });
/* today's law: the floor */
export const ratioOld=(dpr, level)=>{ const L=PIX_LEVELS[level]; return L ? Math.min(dpr>0 ? dpr : 1, 1)*L.scale : 0; };
/* the ratio for a screen w × h CSS pixels at `dpr`, at `level`, `step` guard steps down */
export function sceneRatio(w, h, dpr, level, step=0){
  const L=PIX_LEVELS[level]; if(!L) return 0;
  const d=dpr>0 ? dpr : 1, floor=ratioOld(d, level);
  if(d<=1) return floor;
  const top=Math.min(d, Math.max(floor, Math.sqrt(L.budget/Math.max(1, w*h))));
  return Math.max(floor, top*Math.pow(PIX_STEP, Math.max(0, step|0)));
}
/* how many steps the guard has on this screen (0: the budget equals today's law — the laptop) */
export function stepsOf(w, h, dpr, level){ let k=0; while(k<12 && sceneRatio(w, h, dpr, level, k)>ratioOld(dpr, level)+1e-9) k++; return k; }
/* the drawing buffer three.js makes for a ratio (floor of CSS size × ratio) */
export const bufferOf=(w, h, r)=>[Math.floor(w*r), Math.floor(h*r)];
/* the guard: st = { step, low, ok, upAt, holdTo } (guardNew()), one sample a second { t (s), fps, cap, det, cam } → the next state */
export const guardNew=()=>({ step:0, low:0, ok:0, upAt:-Infinity, holdTo:-Infinity, downs:0, ups:0 });
export function guardNext(st, x, maxStep){
  const s={ ...st }, G=GUARD, camOk=x.cam>=G.camMin;
  const low= x.fps<x.cap*G.fpsLow || (camOk && x.det<G.detLow), ok= x.fps>=x.cap*G.fpsOk && (!camOk || x.det>=G.detOk);
  if(low){ s.low++; s.ok=0;
    if(s.low>=G.lowS && s.step<maxStep){ if(x.t-s.upAt<G.failS) s.holdTo=x.t+G.holdS; s.step++; s.downs++; s.low=0; } }
  else if(ok){ s.ok++; s.low=0;
    if(s.ok>=G.okS && s.step>0 && x.t>=s.holdTo){ s.step--; s.ups++; s.upAt=x.t; s.ok=0; } }
  else { s.low=0; s.ok=0; }
  if(s.step>maxStep) s.step=Math.max(0, maxStep);
  return s;
}
