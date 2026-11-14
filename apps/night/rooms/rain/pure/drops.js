/* RAIN-0b: THE DROPS ON THE PANE — a stateful simulation, so drops see each other (pure, rule #36; data row «RAIN glass law (app)»). Places are
   in VIEW-ANGLE units on the pane (x right, y up; the pane is fixed in the world, a screen is a crop of it). Every drop is an object: place, radius,
   speed. A new drop that lands on another merges with it (areas add); a resting drop grows by merging and starts to run once heavy enough; a
   running drop goes down stop-and-go on a wandering path, eats every drop its path touches (grows, speeds up), leaves small beads behind (each
   bead's area taken exactly from it) and clears the fine droplets in its lane (the LANE map, which the fine droplets grow back into slowly).
   Water is booked: the area of every drop + what ran off the pane + what evaporated under the cap = everything that fell, exactly.
   The simulation steps at a fixed 1/60 s (exact for any frame length); its randomness is seeded (the same rain on every device). */
import { seeded } from '../../../../../core/pure/dsp.js';

export const DROPS=Object.freeze({
  step:1/60,                 // the fixed simulation step (s)
  rate:2.5, rateRain:22,       // new drops a second per unit of pane area: rate + rateRain × rain
  r0:0.0022, rSpan:0.005, rSpanRain:0.006, rPow:2.3,   // a new drop's radius: r0 + u^rPow × (rSpan + rSpanRain × rain)
  slide:0.0085,              // the radius from which a drop may start to run
  start:0.004,               // a heavy drop's chance a step to start running, × (r/slide)^4
  accel:0.00006,             // a runner's speed gained a step, × r/slide (units a step)
  snag:0.035, snagKeep:0.4,  // its chance a step to snag on the glass, and the speed it keeps
  vMax:0.0095,               // its top speed (units a step)
  wander:0.0006, wanderKeep:0.86,   // its sideways drift
  bead:3.5, beadP:0.55, beadMin:0.0024, beadLo:0.15, beadHi:0.37,   // every bead×r of path it may leave a bead of beadLo…beadHi × r (only from beadMin up)
  stop:0.55,                 // below stop × slide a runner slows and comes to rest
  touch:1,                   // two drops touch when their centres are closer than touch × (ra + rb)
  margin:0.06,               // the simulated region reaches this far beyond the view
  laneCols:320, laneRows:172, laneRefill:24, laneEvery:0.1, laneW:1.15,   // the lane map over the pane (GLASS.ext), the fine droplets' return (τ s), the lane's half width × r
});
export const PANE_EXT=Object.freeze([1.4, 0.75]);   // the pane's half size (the widest view fits in it; pure/glass.js uses the same)

/* a new pane: seed, cap (the most drops it holds), region [x0, y0, x1, y1] (default: the whole pane), merge (false = the CONTROL that never merges) */
export function dropsNew(seed, o={}){
  return { R:seeded(seed>>>0), cap:o.cap||300, merge:o.merge!==false, region:o.region||[-PANE_EXT[0], -PANE_EXT[1], PANE_EXT[0], PANE_EXT[1]],
    list:[], grid:null, rMax:0, mark:0, next:1, acc:0, spawnAcc:0, t:0, fell:0, ranOff:0, evaporated:0, log:o.log ? [] : null,
    lane:new Float32Array(DROPS.laneCols*DROPS.laneRows), laneLive:false, laneBox:[DROPS.laneCols, DROPS.laneRows, -1, -1] };
}
/* the region the rain is simulated in (the view's half size tw, th and the pane's slide): drops outside it evaporate (booked) */
export function dropsRegion(S, tw, th, ox=0, oy=0){
  const m=DROPS.margin; S.region=[Math.max(-PANE_EXT[0], -tw+ox-m), Math.max(-PANE_EXT[1], -th+oy-m), Math.min(PANE_EXT[0], tw+ox+m), Math.min(PANE_EXT[1], th+oy+m)];
  const [x0, y0, x1, y1]=S.region; for(const d of S.list) if(d.x<x0-d.r || d.x>x1+d.r || d.y<y0-d.r || d.y>y1+3*d.r){ S.evaporated+=d.r*d.r; d.dead=true; }
  S.list=S.list.filter(d=>!d.dead); return S.region;
}
const area=d=>d.r*d.r;
const mk=(S, x, y, r)=>({ id:S.next++, x, y, r, v:0, vx:0, mv:false, tr:0, dead:false });
/* b merges into a: the areas add exactly; a keeps running if it ran; the place is the area-weighted mean (a runner keeps its place: its path stays
   the one it swept) */
function absorb(S, a, b){
  const A=area(a), B=area(b), T=A+B;
  if(!a.mv){ a.x=(a.x*A+b.x*B)/T; a.y=(a.y*A+b.y*B)/T; } a.r=Math.sqrt(T); a.v=a.v*A/T; b.dead=true;
  if(S.log) S.log.push({ k:'merge', into:a.id, from:b.id, A, B, after:area(a) });
}
/* THE GRID: drops binned by place (cells of GRID units), rebuilt each step and kept as drops land or run; a query visits only the cells a
   capsule can reach (the largest radius bounds the reach) */
const GRID=0.03, GW=Math.ceil(2*PANE_EXT[0]/GRID)+2, GH=Math.ceil(2*PANE_EXT[1]/GRID)+8;   // the pane's cells (a margin below for runners leaving)
const gi=x=>Math.max(0, Math.min(GW-1, Math.floor((x+PANE_EXT[0])/GRID)+1)), gj=y=>Math.max(0, Math.min(GH-1, Math.floor((y+PANE_EXT[1])/GRID)+6));
function gridPut(S, d){ const k=gj(d.y)*GW+gi(d.x), a=S.grid[k]; if(!a.length) S.used.push(k); a.push(d); if(d.r>S.rMax) S.rMax=d.r; }
function gridBuild(S){ if(!S.grid){ S.grid=Array.from({ length:GW*GH }, ()=>[]); S.used=[]; } for(const k of S.used) S.grid[k].length=0; S.used.length=0; S.rMax=0; for(const d of S.list) if(!d.dead) gridPut(S, d); }
/* the drops whose disc the capsule from (x0, y0) to (x1, y1) of d's radius touches (each once) */
function touching(S, d, x0, y0, x1, y1){
  if(!S.grid) gridBuild(S);
  const out=[], k=DROPS.touch, reach=(d.r+S.rMax)*k, vx=x1-x0, vy=y1-y0, L=vx*vx+vy*vy, mark=++S.mark;
  const i0=gi(Math.min(x0, x1)-reach), i1=gi(Math.max(x0, x1)+reach), j0=gj(Math.min(y0, y1)-reach), j1=gj(Math.max(y0, y1)+reach);
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const a=S.grid[j*GW+i];
    for(const o of a){ if(o===d || o.dead || o.seen===mark) continue; o.seen=mark;
      const t= L>0 ? Math.max(0, Math.min(1, ((o.x-x0)*vx+(o.y-y0)*vy)/L)) : 0, ex=o.x-(x0+t*vx), ey=o.y-(y0+t*vy), rr=(d.r+o.r)*k;
      if(ex*ex+ey*ey<rr*rr) out.push(o); } }
  return out;
}
/* a drop lands at (x, y) with radius r: it merges with every drop it touches (repeatedly, as it grows) → the drop that holds its water */
export function dropAdd(S, x, y, r){
  S.fell+=r*r; let d=mk(S, x, y, r), fresh=true, died=false;
  if(S.merge){ for(let guard=0;guard<8;guard++){ const t=touching(S, d, d.x, d.y, d.x, d.y); if(!t.length) break;
      for(const o of t){ if(o.dead || d.dead) continue; died=true; if(o.r>=d.r && !d.mv && fresh){ absorb(S, o, d); d=o; fresh=false; } else absorb(S, d, o); }
      if(d.r>S.rMax) S.rMax=d.r; } }
  if(fresh){ S.list.push(d); gridPut(S, d); }
  if(died) S.list=S.list.filter(q=>!q.dead);
  return d;
}
/* the lane map: the fine droplets cleared along a runner's path (a capsule of half width w) */
const LC=DROPS.laneCols, LR=DROPS.laneRows, cellX=x=>(x/PANE_EXT[0]*0.5+0.5)*LC-0.5, cellY=y=>(y/PANE_EXT[1]*0.5+0.5)*LR-0.5;
function laneClear(S, x0, y0, x1, y1, w){
  const sx=LC/(2*PANE_EXT[0]), sy=LR/(2*PANE_EXT[1]), ax=cellX(x0), ay=cellY(y0), bx=cellX(x1), by=cellY(y1), wx=w*sx, wy=w*sy;
  const i0=Math.max(0, Math.floor(Math.min(ax, bx)-wx)), i1=Math.min(LC-1, Math.ceil(Math.max(ax, bx)+wx)), j0=Math.max(0, Math.floor(Math.min(ay, by)-wy)), j1=Math.min(LR-1, Math.ceil(Math.max(ay, by)+wy));
  if(i0>i1 || j0>j1) return;
  const vx=(bx-ax)/wx, vy=(by-ay)/wy, L=vx*vx+vy*vy;
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const px=(i-ax)/wx, py=(j-ay)/wy, t= L>0 ? Math.max(0, Math.min(1, (px*vx+py*vy)/L)) : 0, dx=px-t*vx, dy=py-t*vy, q=Math.sqrt(dx*dx+dy*dy);
    if(q<1){ const v=1-q*q*q, k=j*LC+i; if(v>S.lane[k]) S.lane[k]=v; } }
  S.laneLive=true; const B=S.laneBox; B[0]=Math.min(B[0], i0); B[1]=Math.min(B[1], j0); B[2]=Math.max(B[2], i1); B[3]=Math.max(B[3], j1);
}
/* one fixed step: rain 0…1 */
function tick(S, rain){
  const C=DROPS, h=C.step, R=S.R, [x0, y0, x1, y1]=S.region; gridBuild(S);
  /* new drops, at the rain's rate over the region's area */
  S.spawnAcc+=h*(C.rate+C.rateRain*rain)*(x1-x0)*(y1-y0);
  while(S.spawnAcc>=1){ S.spawnAcc-=1; dropAdd(S, x0+(x1-x0)*R(), y0+(y1-y0)*R(), C.r0+Math.pow(R(), C.rPow)*(C.rSpan+C.rSpanRain*rain)); }
  const born=[];
  for(const d of S.list){
    if(d.dead) continue;
    if(!d.mv){ if(d.r>C.slide && R()<C.start*Math.pow(d.r/C.slide, 4)){ d.mv=true; d.v=0.15*C.accel*60; } continue; }
    d.v=Math.min(C.vMax, d.v+C.accel*(d.r/C.slide)); if(R()<C.snag) d.v*=C.snagKeep;
    d.vx=d.vx*C.wanderKeep+(R()-0.5)*C.wander;
    const ox=d.x, oy=d.y; d.x+=d.vx*0.45; d.y-=d.v; d.tr+=d.v;
    /* it eats every drop its path touched this step (the swept capsule: no drop is passed through) */
    if(S.merge) for(const o of touching(S, d, ox, oy, d.x, d.y)) if(!o.dead) absorb(S, d, o);
    laneClear(S, ox, oy, d.x, d.y, d.r*C.laneW); gridPut(S, d);   // binned again at its new place (a stale entry is skipped by the mark)
    /* it leaves a bead behind now and then: the bead's area is taken from it, exactly */
    if(d.tr>d.r*C.bead){ d.tr=0; if(d.r>C.beadMin && R()<C.beadP){ const rb=d.r*(C.beadLo+(C.beadHi-C.beadLo)*R()), before=area(d);
        const b=mk(S, d.x+(R()-0.5)*d.r*0.5, d.y+d.r*1.3+rb, rb); d.r=Math.sqrt(before-rb*rb); born.push(b);
        if(S.log) S.log.push({ k:'bead', from:d.id, before, after:area(d), bead:rb*rb }); } }
    if(d.r<C.slide*C.stop){ d.v*=0.9; if(d.v<0.05*C.accel*60) d.mv=false; }
    if(d.y+3*d.r<y0){ S.ranOff+=area(d); d.dead=true; }
  }
  S.list=S.list.filter(d=>!d.dead);
  /* a bead lands like a drop (it may touch another): no new water, so it is not booked as fallen */
  for(const b of born){ if(S.merge){ const t=touching(S, b, b.x, b.y, b.x, b.y).filter(o=>!o.mv); if(t.length){ absorb(S, t[0], b); continue; } } S.list.push(b); gridPut(S, b); }
  /* the cap: the smallest resting drops evaporate first, in a batch */
  if(S.list.length>S.cap){ const rest=S.list.filter(d=>!d.mv).sort((a, b)=>a.r-b.r); let k=S.list.length-Math.floor(S.cap*0.92);   // down to 92 % at once (the sort is rare)
    for(const d of rest){ if(k<=0) break; d.dead=true; S.evaporated+=area(d); k--; } S.list=S.list.filter(d=>!d.dead); }
  S.t+=h;
}
/* dt seconds of rain (0 drizzle … 1 downpour): fixed steps, then the lane map's fine droplets grow back */
export function dropsStep(S, dt, rain=0.5){
  if(!(dt>0)) return S;
  S.acc+=Math.min(dt, 0.25); let n=0; while(S.acc>=DROPS.step-1e-12 && n<20){ S.acc-=DROPS.step; tick(S, Math.max(0, Math.min(1, rain))); n++; }
  laneStep(S, dt); return S;
}
/* the fine droplets grow back into a lane (one time constant, exact for any frame length; only the box that holds a lane is visited) */
export function laneStep(S, dt){
  if(!S.laneLive || !(dt>0)) return S.laneLive;
  S.laneAcc=(S.laneAcc||0)+dt; if(S.laneAcc<DROPS.laneEvery) return true; dt=S.laneAcc; S.laneAcc=0;   // visited every laneEvery s (the decay composes exactly)
  const k=Math.exp(-dt/DROPS.laneRefill), B=S.laneBox; let any=false, i0=LC, j0=LR, i1=-1, j1=-1;
  for(let j=B[1];j<=B[3];j++) for(let i=B[0];i<=B[2];i++){ const q=j*LC+i, v=S.lane[q]*k; S.lane[q]= v<0.004 ? 0 : v; if(S.lane[q]>0){ any=true; if(i<i0) i0=i; if(i>i1) i1=i; if(j<j0) j0=j; if(j>j1) j1=j; } }
  S.laneLive=any; S.laneBox= any ? [i0, j0, i1, j1] : [LC, LR, -1, -1]; return any;
}
/* how clear of fine droplets the pane is at (x, y): the lane map read as the shader reads it (bilinear, the edge held) */
export function laneAt(S, x, y){
  const fx=cellX(x), fy=cellY(y), i0=Math.floor(fx), j0=Math.floor(fy), u=fx-i0, v=fy-j0, at=(i, j)=>S.lane[Math.max(0, Math.min(LR-1, j))*LC+Math.max(0, Math.min(LC-1, i))];
  return (at(i0, j0)*(1-u)+at(i0+1, j0)*u)*(1-v)+(at(i0, j0+1)*(1-u)+at(i0+1, j0+1)*u)*v;
}
/* the water booked: Σ area of the drops + ran off + evaporated − fell (0 up to rounding) */
export const dropsLedger=S=>S.list.reduce((a, d)=>a+area(d), 0)+S.ranOff+S.evaporated-S.fell;
/* a running drop's stretch (0…0.45) by its speed: drawn longer above the head */
export const dropStretch=d=> d.mv ? Math.min(0.45, d.v/DROPS.vMax*0.45) : 0;
