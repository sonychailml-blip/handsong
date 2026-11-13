/* RAIN-0: THE GLASS's law (pure, rule #36; data row «RAIN glass law (app)») — THE WIPE MAP: a small grid over the pane (view-angle units, as the windows) holding how much of the mist is cleared at
   each place, 0…1. A note near the glass stamps a soft round patch; the mist comes back slowly by itself (one time constant, exact for any
   frame length); a held note keeps stamping, so the light draws. The shader reads the grid as a one-byte texture. */
export const GLASS=Object.freeze({ ext:Object.freeze([1.4, 0.75]), cols:64, rows:36, refog:26, radius:0.085 });
export const wipeNew=()=>({ a:new Float32Array(GLASS.cols*GLASS.rows), live:false });
/* the grid cell of a place on the pane (x, y in view-angle units) → [col, row] as fractions (cell centres at integers) */
const cellOf=(x, y)=>[(x/GLASS.ext[0]*0.5+0.5)*GLASS.cols-0.5, (y/GLASS.ext[1]*0.5+0.5)*GLASS.rows-0.5];
/* a stamp at (x, y): clears up to `amount` (0…1) at its centre, falling smoothly to nothing at `radius`; never lowers a cell → cells changed */
export function wipeStamp(g, x, y, amount=1, radius=GLASS.radius){
  const [cx, cy]=cellOf(x, y), rx=radius/(2*GLASS.ext[0])*GLASS.cols, ry=radius/(2*GLASS.ext[1])*GLASS.rows; let n=0;
  for(let j=Math.max(0, Math.floor(cy-ry));j<=Math.min(GLASS.rows-1, Math.ceil(cy+ry));j++) for(let i=Math.max(0, Math.floor(cx-rx));i<=Math.min(GLASS.cols-1, Math.ceil(cx+rx));i++){
    const d=Math.hypot((i-cx)/rx, (j-cy)/ry); if(d>=1) continue;
    const u=1-d*d, v=Math.min(1, amount)*u*u, k=j*GLASS.cols+i; if(v>g.a[k]){ g.a[k]=v; n++; } }
  if(n) g.live=true; return n;
}
/* dt seconds pass: every cell falls towards 0 (the mist returns); → true while anything is still cleared */
export function wipeStep(g, dt){
  if(!g.live || !(dt>0)) return g.live;
  const k=Math.exp(-dt/GLASS.refog); let any=false;
  for(let i=0;i<g.a.length;i++){ const v=g.a[i]*k; g.a[i]= v<0.004 ? 0 : v; if(g.a[i]>0) any=true; }
  g.live=any; return any;
}
/* how clear the pane is at (x, y): the grid read as the shader reads it (bilinear, the edge held) */
export function wipeAt(g, x, y){
  const [fx, fy]=cellOf(x, y), i0=Math.floor(fx), j0=Math.floor(fy), u=fx-i0, v=fy-j0, C=GLASS.cols, R=GLASS.rows;
  const at=(i, j)=>g.a[Math.max(0, Math.min(R-1, j))*C+Math.max(0, Math.min(C-1, i))];
  return (at(i0, j0)*(1-u)+at(i0+1, j0)*u)*(1-v)+(at(i0, j0+1)*(1-u)+at(i0+1, j0+1)*u)*v;
}
