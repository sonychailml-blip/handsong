/* RUN 7 (C7): THE POSE GENERATOR (moved from probes/hand.js, HAND1 — the probe now imports it from here): a pose → the 21 landmarks of one
   hand in the camera's RAW coordinates (through the live crop and mirroring — rule #12), so a synthetic hand enters processHands exactly as
   a detected one. Used by the probes (HAND1, Calm rows) and by the Calm ghost light (src/ghost.js). */
import * as ST from '../state.js';

/* ── the pose generator: screen fractions (x, y) of the pinch point, hand size s (raw units), gaps = thumb-tip distance of each of the
   four fingers in palm sizes (< PINCH_ON pinches, ≈ 1 open), spread (free fingers fan out), tilt (palm normal via z) ── */
function rawOf(fx,fy){ const vr=ST.viewRect, x=fx*(vr.ax1-vr.ax0)+vr.ax0, y=fy*(vr.ay1-vr.ay0)+vr.ay0; return { x:ST.mirrored()?1-x:x, y }; }
const DIRS=[[-0.3,-1],[0,-1],[0.3,-1],[0.6,-1]].map(([a,b])=>{ const n=Math.hypot(a,b); return [a/n,b/n]; });
export function pose({ x, y, s=0.2, gaps=[1,1,1,1], spread=0, tilt=0 }){
  const T=rawOf(x,y), P=(dx,dy,z=0)=>({ x:T.x+dx*s, y:T.y+dy*s, z });
  const lm=new Array(21);
  lm[0]=P(0.30,0.80); lm[1]=P(0.10,0.55); lm[2]=P(0,0.35); lm[3]=P(-0.02,0.15); lm[4]=P(0,0);
  const mcp=[P(0.10,-0.05,tilt*s),P(0.30,-0.15),P(0.48,-0.08),P(0.62,0.05,-tilt*s)];
  const palm=Math.hypot(lm[0].x-mcp[0].x, lm[0].y-mcp[0].y);
  for(let f=0;f<4;f++){ const b=5+4*f, g=gaps[f], d=DIRS[f], lat=g>0.5?spread*(f-1.5)*0.25:0;
    const tip={ x:T.x+(d[0]+lat)*g*palm, y:T.y+d[1]*g*palm, z:0 };
    lm[b]=mcp[f]; lm[b+1]={ x:mcp[f].x+(tip.x-mcp[f].x)/3, y:mcp[f].y+(tip.y-mcp[f].y)/3, z:0 };
    lm[b+2]={ x:mcp[f].x+2*(tip.x-mcp[f].x)/3, y:mcp[f].y+2*(tip.y-mcp[f].y)/3, z:0 }; lm[b+3]=tip; }
  return lm;
}
