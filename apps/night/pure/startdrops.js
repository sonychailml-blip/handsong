/* RAIN-R1 — THE RAIN'S START SCREEN IS ALIVE: a few drops slide down the glass over the start still (the forest has its fireflies). The law only
   (pure, seeded, a function of time): each drop holds still, then slips down quickly, then holds again (stick-slip, as water does on a pane),
   leaving a short fading trail; it starts again above the top once it has left the screen. still.js draws them in 2D (no WebGL before Begin).
   Positions are screen fractions (0…1, y down); r in CSS px. */
export const START_DROPS=Object.freeze({ n:16, rMin:1.4, rMax:3.6, hold:Object.freeze([1.2, 3.4]), slip:0.24, step:Object.freeze([0.05, 0.16]), trail:0.07, over:0.08 });
function seeded(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const smooth=x=>x<=0 ? 0 : x>=1 ? 1 : x*x*(3-2*x);
/* the drops: each { x, y0, r, T (its hold + slip cycle, s), step (a slip's length, screen fraction), ph, sway } */
export function startDrops(seed=0x52414931){ const R=seeded(seed), D=START_DROPS, out=[];
  for(let i=0;i<D.n;i++){ const k=Math.pow(R(), 1.6); out.push(Object.freeze({ x:0.04+0.92*R(), y0:R()*(1+D.over), r:D.rMin+(D.rMax-D.rMin)*k, T:D.hold[0]+(D.hold[1]-D.hold[0])*R()+D.slip,
    step:D.step[0]+(D.step[1]-D.step[0])*(0.4+0.6*k), ph:R(), sway:(R()-0.5)*0.006 })); }
  return Object.freeze(out); }
/* one drop at time t (s) → { x, y, r, trail (the trail's length above it, screen fraction; 0 while it holds long), moving (0…1) } */
export function startDropAt(d, t){ const D=START_DROPS, u=t/d.T+d.ph, n=Math.floor(u), f=u-n, slip=D.slip/d.T, s=smooth((f-(1-slip))/slip);
  const p=(n+s)*d.step, span=1+2*D.over, y=((d.y0+p)%span+span)%span-D.over;
  const moving= s>0 && s<1 ? 1 : 0, since=(f<1-slip ? f+1-(1-slip) : f-(1-slip))*d.T;   // seconds since this slip began (the trail fades after it)
  return { x:d.x+d.sway*Math.sin(n*1.7+d.ph*6), y, r:d.r, trail:Math.max(0, D.trail*(1-since/(D.slip+1.2)))*(0.6+0.4*d.r/D.rMax), moving }; }
