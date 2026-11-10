/* NIGHT-6 slice 5 — TODAY'S FOREST'S PLACES, as numbers (pure, rule #36), for whoever needs them outside the room: the bake tool paints the
   contact shadows under the trunks and rocks (tools/forest-bake.mjs), the wood's laws grow roots and ivy on the trunks (./wood.js).
   - forestTrunks(): the 95 trunks [x, z, r]. forest.js draws them from its own seeded stream AFTER painting the ground and the bark
     (PAINT_DRAWS draws of that stream), then moves any that would stand in the stream out of it; this replays exactly that. The browser
     row «FOREST wood» compares it with the room's own trunks, number for number.
   - ROCKS_TODAY: today's seven aisle rocks [x, z, size], out of the water as forest.js places them. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM } from './forestlife.js';
import { outOfWater } from './stream.js';

export const FOREST_SEED=0x464F5231;
/* the ground's 220 patches × 4 draws, its 800 leaves × 7, the bark's 260 fissures × 4 (forest.js, in that order) */
export const PAINT_DRAWS=220*4+800*7+260*4;
let TRUNKS=null;
export function forestTrunks(){
  if(TRUNKS) return TRUNKS.map(t=>t.slice());
  const R=seeded(FOREST_SEED); for(let i=0;i<PAINT_DRAWS;i++) R();
  const spots=[[-2.1,-2.2,0.34],[2.5,-4.6,0.42],[-1.3,-8.2,0.3],[3.6,0.4,0.28],[-4.2,-5,0.5],[1.1,-11.5,0.36],[-3.3,1.2,0.22],[4.6,-9,0.46]];
  while(spots.length<95){ const x=(R()*2-1)*22, z=4-R()*44; if(Math.hypot(x,z-5.5)<3.2 || (Math.abs(x)<1.1 && z>-7)) continue; spots.push([x,z,0.14+R()*0.42]); }
  for(const sp of spots){ const [x,z]=outOfWater(sp[0], sp[1], STREAM.half+sp[2]+0.35); sp[0]=x; sp[1]=z; }
  TRUNKS=spots; return TRUNKS.map(t=>t.slice());
}
export const ROCKS_TODAY=Object.freeze([[-1.6,-1,0.5],[1.9,-2.8,0.35],[-2.8,-6.5,0.7],[2.2,-8,0.45],[0.6,-5.4,0.25],[-0.8,-12,0.6],[3.4,-12.5,0.5]]
  .map(([x0,z0,sz])=>{ const [x,z]=outOfWater(x0, z0, STREAM.half+sz*1.1); return Object.freeze([x, z, sz]); }));
