/* RAIN-0: THE GLASS's law (pure, rule #36; data row «RAIN glass law (app)») — THE WIPE MAP: a grid over the pane (view-angle units, as the windows)
   holding how much of the MIST (inside, on the room's side of the pane) is cleared at each place, 0…1. RAIN-0b: the mist is the first touch.
   - A finger on the glass draws a STROKE: the capsule between the light's last place and this one is cleared (continuous for any speed, never
     separate stamps); a short note clears a spot (a stamp). Soft but defined edges: fully clear inside 65 % of the radius.
   - The mist returns slowly and UNEVENLY: each cell at its own rate (a seeded noise), faster where its neighbours are misted (the edges of a clear
     patch close in first); mostly back within 60–90 s. A cell never rises without a stroke and never falls below 0.
   - After the first wipe the room is warm: the MIDDLE of the pane never mists above 1 − FLOOR (the floor eases in, never a jump), so playing far
     still sees the city. The floor is not stored in the cells: wipeAt and the shader take the larger of the cell and the floor.
   The grid is about a fifth of a phone's pixels (320 × 172 over the pane); the shader reads it as a one-byte texture. Only the box that holds
   cleared cells is visited each frame. */
import { seeded } from '../../../../../core/pure/dsp.js';

export const GLASS=Object.freeze({ ext:Object.freeze([1.4, 0.75]), cols:320, rows:172,
  stroke:0.026, spot:0.04, core:0.65,                 // a finger's half width, a note's spot, the fully clear share of a radius
  refog:0.009, uneven:0.8, edge:0.028, tail:0.0012,    // the mist's return: base rate (1/s) × (1 ± uneven), + edge × misted neighbours, + a small steady tail
  floor:0.3, floorTc:6, mid:Object.freeze([0.5, 0.36]), seed:0x4D495354,   // after the first wipe: the middle stays at least this clear (ellipse half axes), eased in (τ s)
  radius:0.04 });                                     // kept for RAIN-0's callers: a stamp's default radius = the spot
const C=GLASS.cols, Rw=GLASS.rows;
/* a new pane, all mist: cells, each cell's own refog rate, the floor's share now (0 until the first wipe) */
export function wipeNew(){
  const R=seeded(GLASS.seed), n=C*Rw, rate=new Float32Array(n), a=new Float32Array(n);
  /* the unevenness: a smooth seeded noise (three octaves of value noise on coarse lattices) → each cell's base rate */
  const oct=[[10, 6, 0.55], [26, 14, 0.3], [64, 34, 0.15]].map(([gx, gy, w])=>({ gx, gy, w, v:Float32Array.from({ length:(gx+1)*(gy+1) }, R) }));
  for(let j=0;j<Rw;j++) for(let i=0;i<C;i++){ let s=0; for(const o of oct){ const fx=i/(C-1)*o.gx, fy=j/(Rw-1)*o.gy, x0=Math.min(o.gx-1, Math.floor(fx)), y0=Math.min(o.gy-1, Math.floor(fy)), u=fx-x0, v=fy-y0, W=o.gx+1;
      const s2=(t)=>t*t*(3-2*t), uu=s2(u), vv=s2(v), at=(x, y)=>o.v[y*W+x]; s+=o.w*((at(x0, y0)*(1-uu)+at(x0+1, y0)*uu)*(1-vv)+(at(x0, y0+1)*(1-uu)+at(x0+1, y0+1)*uu)*vv); }
    rate[j*C+i]=GLASS.refog*(1+GLASS.uneven*(2*s-1)); }
  return { a, rate, live:false, wiped:false, floorK:0, box:[C, Rw, -1, -1] };
}
/* the grid cell of a place on the pane → fractional [col, row] (cell centres at integers) */
const cellOf=(x, y)=>[(x/GLASS.ext[0]*0.5+0.5)*C-0.5, (y/GLASS.ext[1]*0.5+0.5)*Rw-0.5];
/* the middle's share at (x, y): 1 at the centre, falling smoothly to 0 at the ellipse */
export const midAt=(x, y)=>{ const q=Math.hypot(x/GLASS.mid[0], y/GLASS.mid[1]); return q>=1 ? 0 : 1-q*q*(3-2*q); };
/* clear a capsule from (x0, y0) to (x1, y1) of half width `radius`, up to `amount`; never lowers a cell → cells changed */
export function wipeStroke(g, x0, y0, x1, y1, amount=1, radius=GLASS.stroke){
  const [ax, ay]=cellOf(x0, y0), [bx, by]=cellOf(x1, y1), rx=radius/(2*GLASS.ext[0])*C, ry=radius/(2*GLASS.ext[1])*Rw, A=Math.min(1, Math.max(0, amount));
  const i0=Math.max(0, Math.floor(Math.min(ax, bx)-rx)), i1=Math.min(C-1, Math.ceil(Math.max(ax, bx)+rx)), j0=Math.max(0, Math.floor(Math.min(ay, by)-ry)), j1=Math.min(Rw-1, Math.ceil(Math.max(ay, by)+ry));
  if(i0>i1 || j0>j1 || !(A>0)) return 0;
  const vx=(bx-ax)/rx, vy=(by-ay)/ry, L=vx*vx+vy*vy; let n=0;
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const px=(i-ax)/rx, py=(j-ay)/ry, t= L>0 ? Math.max(0, Math.min(1, (px*vx+py*vy)/L)) : 0, dx=px-t*vx, dy=py-t*vy, d=Math.sqrt(dx*dx+dy*dy);
    if(d>=1) continue; const e=(d-GLASS.core)/(1-GLASS.core), v=A*(e<=0 ? 1 : 1-e*e*(3-2*e)), k=j*C+i; if(v>g.a[k]){ g.a[k]=v; n++; } }
  if(n){ g.live=true; g.wiped=true; const B=g.box; B[0]=Math.min(B[0], i0); B[1]=Math.min(B[1], j0); B[2]=Math.max(B[2], i1); B[3]=Math.max(B[3], j1); }
  return n;
}
/* a spot at (x, y) (a short note): a stroke of no length */
export const wipeStamp=(g, x, y, amount=1, radius=GLASS.spot)=>wipeStroke(g, x, y, x, y, amount, radius);
/* dt seconds pass: every cleared cell mists again at its own rate, faster beside misted neighbours (sub-steps of at most 0.25 s, so a long frame
   is the same as many short ones up to rounding); the floor eases in after the first wipe → true while any cell is still cleared */
export function wipeStep(g, dt){
  if(!(dt>0)) return g.live;
  if(g.wiped) g.floorK+=(1-g.floorK)*(1-Math.exp(-dt/GLASS.floorTc));
  if(!g.live) return false;
  let left=dt;
  while(left>1e-9){ const h=Math.min(0.25, left); left-=h; const B=g.box, a=g.a; let any=false, i0=C, j0=Rw, i1=-1, j1=-1;
    for(let j=B[1];j<=B[3];j++) for(let i=B[0];i<=B[2];i++){ const k=j*C+i, v=a[k]; if(v<=0) continue;
      const mist=4-(i>0 ? a[k-1] : 1)-(i<C-1 ? a[k+1] : 1)-(j>0 ? a[k-C] : 1)-(j<Rw-1 ? a[k+C] : 1);   // misted neighbours (0…4)
      const r=g.rate[k]+GLASS.edge*mist*0.25, nv=v*Math.exp(-r*h)-GLASS.tail*h; a[k]= nv<0.004 ? 0 : nv;
      if(a[k]>0){ any=true; if(i<i0) i0=i; if(i>i1) i1=i; if(j<j0) j0=j; if(j>j1) j1=j; } }
    g.live=any; g.box= any ? [i0, j0, i1, j1] : [C, Rw, -1, -1]; if(!any) break; }
  return g.live;
}
/* the cells alone at (x, y), bilinear as the shader reads them (the edge held) */
export function wipeCell(g, x, y){
  const [fx, fy]=cellOf(x, y), i0=Math.floor(fx), j0=Math.floor(fy), u=fx-i0, v=fy-j0;
  const at=(i, j)=>g.a[Math.max(0, Math.min(Rw-1, j))*C+Math.max(0, Math.min(C-1, i))];
  return (at(i0, j0)*(1-u)+at(i0+1, j0)*u)*(1-v)+(at(i0, j0+1)*(1-u)+at(i0+1, j0+1)*u)*v;
}
/* how clear the pane is at (x, y): the cells or the middle's floor, whichever is clearer (what the shader shows) */
export const wipeAt=(g, x, y)=>Math.max(wipeCell(g, x, y), GLASS.floor*g.floorK*midAt(x, y));
