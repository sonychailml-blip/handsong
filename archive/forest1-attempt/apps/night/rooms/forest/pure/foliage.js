/* FOREST-1 — LOWER BRANCHES, YOUNG SPRUCES AND THE SAPLINGS' SHAPE, as numbers. Pure (rule #36), node-tested (data row «FOREST lower branches
   (app)»): the room (../forest-canopy.js) only builds what these give. The founder (FOREST-1): the objects natural, like a film frame — dead lower
   branches and broken stubs as on real spruce and pine, a few living lower branches, young spruces among the trunks, saplings with a real branch
   structure and foliage cards with CC0 alpha textures; never covering the middle of the frame where play happens.
   - FOLIAGE_ATLAS: the CC0 sheet (tools/forest-foliage.mjs composes it from Poly Haven leaf atlases): every card's BASE at its cell's bottom middle.
   - lowerBranches(trunks): per trunk nearer than LOWER.zMin, from its own seeded stream — dead branches (drooping, thinning, a few side twigs, dry
     needles near the tip on some), broken stubs (short, a cut end), and on some near trunks one or two living branches carrying cards. A branch or
     card that would cross the middle of the frame (inMiddle, from the eye) or pierce another trunk is grown elsewhere or not at all.
   - youngSpruces(n, trunks, avoid): cones of whorled branches carrying needle cards, the lowest whorls partly dead — outside the light's reach,
     in the light, clear of trunks, the stream and the understorey (avoid: [x, z, r] already taken).
   - saplingShape(sap, seed): a sapling's stem with alternate side shoots, a broadleaf twig card on each and on the leader.
   - cardOf(sprayFromCanopy): a canopy spray (centred card, yaw / tilt) of the understorey as a card of this sheet.
   Cards: { x, y, z (the base), b: [ax,ay,az, gx,gy,gz, nx,ny,nz] (side, growth, normal: unit, orthogonal), s (metres, the card's height), cell, tone }.
   Limbs: { pts: [[x, y, z, r]…], dead (0…1), cap (a cut end) } — the room's wood builder takes them with the bark's material. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, bankGround } from './forestlife.js';
import { forestGround } from './fireflies.js';
import { lightAt } from './floor.js';
import { trunkRadius, WOOD } from './wood.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), TAU=2*Math.PI, D=180/Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
/* the sheet: master 2048², 1024² cells on top, tall 512×1024 and 512² cells below; world: each cell's card size (w, h in metres at scale 1) */
export const FOLIAGE_ATLAS=F({ size:2048, derived:F([1024, 512]),
  cells:F({ spruceA:F([0,0,1024,1024]), spruceB:F([1024,0,1024,1024]), twig:F([0,1024,512,1024]), fernA:F([512,1024,512,1024]), fernB:F([1024,1024,512,1024]),
    rosette:F([1536,1024,512,512]), dead:F([1536,1536,512,512]) }),
  aspect:F({ spruceA:1, spruceB:1, twig:0.5, fernA:0.5, fernB:0.5, rosette:1, dead:1 }) });
export function foliageCellUv(k){ const [x,y,w,h]=FOLIAGE_ATLAS.cells[k], S=FOLIAGE_ATLAS.size; return [x/S, 1-(y+h)/S, w/S, h/S]; }
export const FOLIAGE_CELLS=F(Object.keys(FOLIAGE_ATLAS.cells));
/* the eye (pure/canopy.js CANOPY.eye — the data row checks they agree) and THE MIDDLE OF THE FRAME: the band where the light plays, seen from the
   eye — azimuth within ±az°, elevation between el[0] and el[1]. On a phone upright (68° tall, ±17° wide) it is the middle half; on a laptop the
   aisle and the stream */
export const LOWER=F({ seed:0x4C4F5752, eye:F([0, 1.55, 5.5]), zMin:-24, nearEye:13, mid:F({ az:11, el:F([-28, 17]) }), reach:F({ x:6.6, z:-15.5, y:4.4 }),   // reach: the light's (forest.js FOREST_BOUNDS) with the canopy's margin — no card inside it
  h:F([1.2, 7.2]), tries:7,
  near:F({ dead:F([2, 5]), stubs:F([1, 3]) }), far:F({ dead:F([1, 3]), stubs:F([0, 2]) }),
  dead:F({ len:F([0.55, 1.9]), up:F([-0.05, 0.25]), droop:F([0.15, 0.55]), r:F([0.018, 0.034]), rk:0.05, twigs:F([2, 5]), needles:0.4 }),
  stub:F({ len:F([0.07, 0.3]), r:F([0.03, 0.055]), rk:0.06 }),
  live:F({ share:0.32, eye:22, n:F([1, 2]), len:F([1.1, 2.3]), up:F([0.05, 0.3]), droop:F([0.25, 0.6]), r:F([0.026, 0.04]), every:0.17, s:F([0.42, 0.66]) }) });
export const SPRUCE=F({ seed:0x53505255, H:F([2.3, 5.4]), light:0.33, gap:1.3, x:15, z:F([1, -26]), whorl:F([0.3, 0.42]), per:F([4, 6]), every:0.15, s:F([0.42, 0.68]), deadBelow:0.22, cross:1.15 });   // cross: the second card of each spray, rolled (a spray reads from every side)
export const SAPLING=F({ shoots:F([3, 6]), len:F([0.22, 0.45]), up:F([0.45, 0.95]), s:F([0.32, 0.52]) });
/* the direction from the eye to (x, y, z) → [azimuth, elevation] in degrees (pure/canopy.js viewAngles, the same law) */
export function viewAt(x, y, z){ const E=LOWER.eye, dx=x-E[0], dy=y-E[1], dz=z-E[2], h=Math.hypot(dx, dz); return [Math.atan2(dx, -dz)*D, Math.atan2(dy, h)*D]; }
export const inReach=(x, y, z)=>{ const Q=LOWER.reach; return Math.abs(x)<=Q.x && z>=Q.z && y<=Q.y; };
export function inMiddle(x, y, z){ const [a, e]=viewAt(x, y, z), M=LOWER.mid; return Math.abs(a)<M.az && e>M.el[0] && e<M.el[1] && z<LOWER.eye[2]; }
const norm=v=>{ const l=Math.hypot(v[0], v[1], v[2])||1; return [v[0]/l, v[1]/l, v[2]/l]; }, cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
/* a card's basis: growth g, rolled about g by `roll` from the most upward-facing normal (0: lying flat along g, ±π/2: standing on edge) */
export function cardBasis(g, roll){ g=norm(g); let side=cross(g, [0, 1, 0]); if(Math.hypot(...side)<1e-3) side=[1, 0, 0]; side=norm(side); const up=norm(cross(side, g));
  const c=Math.cos(roll), s=Math.sin(roll), n=norm([up[0]*c+side[0]*s, up[1]*c+side[1]*s, up[2]*c+side[2]*s]), a=norm(cross(g, n)); return [...a, ...g, ...n]; }
const eyeD=(x, z)=>Math.hypot(x-LOWER.eye[0], z-LOWER.eye[2]);

/* a branch's centre line from the trunk: base (on the bark at height h, angle a round it), out along a with elevation up, drooping by droop·t² */
function branchLine(tx, gy, tz, r, h, a, L, up, droop, r0, r1, k=6){ const ca=Math.cos(a), sa=Math.sin(a), rb=trunkRadius(r, h-WOOD.trunk.foot)*0.9, pts=[];
  for(let i=0;i<=k;i++){ const t=i/k, d=rb+L*t; pts.push([tx+ca*d, gy+h+L*(up*t-droop*t*t), tz+sa*d, lerp(r0, r1, Math.pow(t, 0.8))]); } return pts; }
const clearOf=(pts, trunks, self, noMid=false)=>{ for(const [x, y, z] of pts){ if(!noMid && inMiddle(x, y, z)) return false; for(let j=0;j<trunks.length;j++){ if(j===self) continue; const [tx, tz, r]=trunks[j]; if(Math.abs(x-tx)<1.2 && Math.abs(z-tz)<1.2 && Math.hypot(x-tx, z-tz)<r*1.15+0.08) return false; } } return true; };

/* trunks [[x, z, r]] (forestTrunks order) → { limbs, cards, per: [{ tree, dead, stubs, live }] } */
export function lowerBranches(trunks, seed=LOWER.seed, opt={}){   // opt.noMiddle, opt.noReach: the probes' CONTROLS only (the middle of the frame, the light's reach not kept clear)
  const L=LOWER, limbs=[], cards=[], per=[];
  trunks.forEach(([tx, tz, r], i)=>{ if(tz<=L.zMin) return; const R=seeded(seed+977*i), near=eyeD(tx, tz)<L.nearEye, N=near ? L.near : L.far, gy=forestGround(tx, tz);
    const nd=N.dead[0]+Math.floor(R()*(N.dead[1]-N.dead[0]+1)), ns=N.stubs[0]+Math.floor(R()*(N.stubs[1]-N.stubs[0]+1)), nl= eyeD(tx, tz)<L.live.eye && R()<L.live.share ? L.live.n[0]+Math.floor(R()*(L.live.n[1]-L.live.n[0]+1)) : 0;
    const conifer=R()<0.6, row={ tree:i, dead:0, stubs:0, live:0 }, used=[];
    const spot=(lo, hi)=>{ for(let k=0;k<L.tries;k++){ const h=lo+R()*(hi-lo), a=R()*TAU; if(used.every(([uh, ua])=>Math.abs(uh-h)>0.35 || Math.abs(Math.atan2(Math.sin(ua-a), Math.cos(ua-a)))>0.9)) return [h, a]; } return null; };
    /* living branches first (the lowest, the longest) */
    for(let b=0;b<nl;b++){ for(let k=0;k<L.tries;k++){ const s=spot(L.h[0]+0.3, 3.2); if(!s) break; const [h, a]=s, Lv=L.live, len=lerp(Lv.len[0], Lv.len[1], R())*(0.75+r), up=lerp(Lv.up[0], Lv.up[1], R()), droop=lerp(Lv.droop[0], Lv.droop[1], R()), r0=lerp(Lv.r[0], Lv.r[1], R())+r*0.04;
      const pts=branchLine(tx, gy, tz, r, h, a, len, up, droop, r0, r0*0.25, 8), cs=[];
      for(let t=0.3; t<=1.001; t+=Lv.every/len){ const j=Math.min(7, Math.floor(t*8)), p=pts[j], q=pts[j+1], g0=norm([q[0]-p[0], q[1]-p[1], q[2]-p[2]]), side=(cs.length%2 ? 1 : -1)*(0.35+R()*0.5);
        const g=norm([g0[0]*Math.cos(side)-g0[2]*Math.sin(side), g0[1]-0.15-R()*0.2, g0[0]*Math.sin(side)+g0[2]*Math.cos(side)]), x=lerp(p[0], q[0], t*8-j), y=lerp(p[1], q[1], t*8-j), z=lerp(p[2], q[2], t*8-j);
        const cell= conifer ? (R()<0.5 ? 'spruceA' : 'spruceB') : 'twig', s=lerp(Lv.s[0], Lv.s[1], R())*(conifer ? 1 : 1.1);
        cs.push({ x, y, z, b:cardBasis(g, (R()-0.5)*1.4+(conifer ? 0 : (R()<0.5 ? -1 : 1)*0.9)), s, cell, tone:0.85+R()*0.3 }); }
      const tips=cs.map(c=>[c.x+c.b[3]*c.s, c.y+c.b[4]*c.s, c.z+c.b[5]*c.s]);
      if(!opt.noReach && cs.some((c,j)=>inReach(c.x, c.y, c.z) || inReach(...tips[j]))) continue;   // a living branch's leaves never in the light's reach
      if(!clearOf(pts.concat(tips), trunks, i, opt.noMiddle)) continue;
      used.push([h, a]); limbs.push({ pts, dead:0, tree:i, kind:'live' }); cards.push(...cs.map(c=>({ ...c, tree:i, of:'lower' }))); row.live++; break; } }
    /* dead branches */
    for(let b=0;b<nd;b++){ for(let k=0;k<L.tries;k++){ const s=spot(L.h[0], L.h[1]); if(!s) break; const [h, a]=s, Dd=L.dead, len=lerp(Dd.len[0], Dd.len[1], R())*(0.7+r)*(h>4 ? 0.8 : 1), up=lerp(Dd.up[0], Dd.up[1], R()), droop=lerp(Dd.droop[0], Dd.droop[1], R()), r0=lerp(Dd.r[0], Dd.r[1], R())+r*Dd.rk;
      const pts=branchLine(tx, gy, tz, r, h, a, len, up, droop, r0, r0*0.3), tw=[];
      for(let q=0, nt=Dd.twigs[0]+Math.floor(R()*(Dd.twigs[1]-Dd.twigs[0]+1)); q<nt; q++){ const t=0.3+R()*0.6, j=Math.min(5, Math.floor(t*6)), p=pts[j], e=pts[j+1], f=t*6-j, x=lerp(p[0], e[0], f), y=lerp(p[1], e[1], f), z=lerp(p[2], e[2], f);
        const dir=norm([e[0]-p[0], e[1]-p[1], e[2]-p[2]]), sd=(R()<0.5 ? -1 : 1)*(0.55+R()*0.6), l=len*(0.12+R()*0.22), dx=dir[0]*Math.cos(sd)-dir[2]*Math.sin(sd), dz=dir[0]*Math.sin(sd)+dir[2]*Math.cos(sd), rr=lerp(p[3], e[3], f)*0.45;
        tw.push({ pts:[[x, y, z, rr], [x+dx*l*0.5, y+(R()-0.6)*l*0.25, z+dz*l*0.5, rr*0.7], [x+dx*l, y+(R()-0.7)*l*0.4, z+dz*l, rr*0.35]], dead:1, tree:i, kind:'twig' }); }
      const nc= R()<Dd.needles ? 1+Math.floor(R()*2) : 0, cs=[];
      for(let q=0;q<nc;q++){ const t=0.7+R()*0.3, j=Math.min(5, Math.floor(t*6)), p=pts[j], e=pts[j+1], g=norm([e[0]-p[0], e[1]-p[1]-0.2, e[2]-p[2]]);
        const c={ x:p[0], y:p[1], z:p[2], b:cardBasis(g, (R()-0.5)*1.2), s:0.28+R()*0.18, cell:'dead', tone:0.7+R()*0.25, tree:i, of:'lower' };
        if(opt.noReach || !(inReach(c.x, c.y, c.z) || inReach(c.x+c.b[3]*c.s, c.y+c.b[4]*c.s, c.z+c.b[5]*c.s))) cs.push(c); }   // dry needles in the light's reach left off
      const all=pts.concat(...tw.map(t=>t.pts), cs.map(c=>[c.x+c.b[3]*c.s, c.y+c.b[4]*c.s, c.z+c.b[5]*c.s]));
      if(!clearOf(all, trunks, i, opt.noMiddle)) continue;
      used.push([h, a]); limbs.push({ pts, dead:1, tree:i, kind:'dead' }, ...tw); cards.push(...cs); row.dead++; break; } }
    /* broken stubs: short, thick, a cut end */
    for(let b=0;b<ns;b++){ for(let k=0;k<L.tries;k++){ const s=spot(L.h[0]+0.4, L.h[1]+1); if(!s) break; const [h, a]=s, S=L.stub, len=lerp(S.len[0], S.len[1], R())*(0.8+r), r0=lerp(S.r[0], S.r[1], R())+r*S.rk;
      const pts=branchLine(tx, gy, tz, r, h, a, len, -0.1+R()*0.3, 0.05, r0, r0*0.7, 2);
      if(!clearOf(pts, trunks, i, opt.noMiddle)) continue; used.push([h, a]); limbs.push({ pts, dead:1, cap:true, tree:i, kind:'stub' }); row.stubs++; break; } }
    per.push(row); });
  return { limbs, cards, per }; }

/* young spruces: n, the trunks, places already taken [[x, z, r]] → { places: [{ x, z, H }], limbs, cards } */
export function youngSpruces(n, trunks, avoid=[], seed=SPRUCE.seed, opt={}){   // opt.noReach: the probes' CONTROL only (the light's reach not kept clear)
  const S=SPRUCE, R=seeded(seed), places=[], limbs=[], cards=[], taken=avoid.slice();
  for(let g=0; places.length<n && g<8000; g++){ const x=(R()*2-1)*S.x, z=S.z[0]+R()*(S.z[1]-S.z[0]);
    if((!opt.noReach && !(Math.abs(x)>6.6 || z<-15.5)) || lightAt(x, z)<S.light || streamNear(x, z).d<STREAM.half+0.7 || eyeD(x, z)<4) continue;
    if(trunks.some(([tx, tz, r])=>Math.hypot(x-tx, z-tz)<r*1.6+S.gap) || taken.some(([px, pz, pr])=>Math.hypot(x-px, z-pz)<pr+0.9)) continue;
    const H=lerp(S.H[0], S.H[1], R()), gy=bankGround(x, z), rs=0.035+H*0.012; if(!opt.noReach && inMiddle(x, gy+H*0.5, z)) continue;
    places.push({ x, z, H }); taken.push([x, z, 1.2]);
    limbs.push({ pts:[[x, gy-0.1, z, rs*1.2], [x, gy+H*0.35, z, rs*0.8], [x+(R()-0.5)*0.05, gy+H*0.75, z+(R()-0.5)*0.05, rs*0.45], [x, gy+H, z, 0.008]], dead:0, kind:'spruce' });
    for(let h=0.18+R()*0.1, w=0; h<H-0.25; h+=lerp(S.whorl[0], S.whorl[1], R()), w++){ const f=1-h/H, len=0.12+0.36*H*f*(0.85+R()*0.3), nb=S.per[0]+Math.floor(R()*(S.per[1]-S.per[0]+1)), a0=R()*TAU, dead=h<H*S.deadBelow && R()<0.7;
      for(let k=0;k<nb;k++){ const a=a0+k*TAU/nb+(R()-0.5)*0.5, up=0.35*(1-f)-0.15*f, droop=0.25*f, ca=Math.cos(a), sa=Math.sin(a), pts=[];
        for(let i=0;i<=3;i++){ const t=i/3, d=rs+len*t; pts.push([x+ca*d, gy+h+len*(up*t-droop*t*t), z+sa*d, lerp(0.016*(0.5+f), 0.004, t)]); }
        limbs.push({ pts, dead: dead ? 1 : 0, kind:'spruce' });
        for(let t=0.25; t<=1.001; t+=S.every/Math.max(0.3, len)){ const j=Math.min(2, Math.floor(t*3)), p=pts[j], q=pts[j+1], u=t*3-j, gx=q[0]-p[0], gyy=q[1]-p[1]-0.06, gz=q[2]-p[2];
          const roll=(R()-0.5)*0.9+(k%2 ? 0.25 : -0.25), cs=lerp(S.s[0], S.s[1], R())*(0.7+0.5*f), cell= dead ? 'dead' : (R()<0.5 ? 'spruceA' : 'spruceB'), tone=(dead ? 0.7 : 0.8)+R()*0.3, x1=lerp(p[0], q[0], u), y1=lerp(p[1], q[1], u), z1=lerp(p[2], q[2], u);
          cards.push({ x:x1, y:y1, z:z1, b:cardBasis([gx, gyy, gz], roll), s:cs, cell, tone, of:'spruce' }, { x:x1, y:y1, z:z1, b:cardBasis([gx, gyy-0.04, gz], roll+S.cross), s:cs*0.85, cell, tone:tone*0.92, of:'spruce' }); } } }
    for(let k=0;k<2;k++) cards.push({ x, y:gy+H-0.42, z, b:cardBasis([0.05*(k ? 1 : -1), 1, 0.02], k*1.57), s:0.5, cell:'spruceA', tone:0.95, of:'spruce' });   // the leader
  }
  return { places, limbs, cards }; }

/* a sapling { x, z, H } → { limbs, cards }: the stem, alternate side shoots rising, a broadleaf twig on each and on the leader */
export function saplingShape(sp, seed){ const R=seeded(seed), S=SAPLING, gy=bankGround(sp.x, sp.z), lean=[(R()-0.5)*0.12, (R()-0.5)*0.12], limbs=[], cards=[];
  const at=h=>[sp.x+lean[0]*h, gy+h, sp.z+lean[1]*h];
  limbs.push({ pts:[[...at(-0.05), 0.022], [...at(sp.H*0.5), 0.014], [...at(sp.H), 0.005]], dead:0, kind:'sapling' });
  const ns=S.shoots[0]+Math.floor(R()*(S.shoots[1]-S.shoots[0]+1)); let a=R()*TAU;
  for(let k=0;k<ns;k++){ const h=sp.H*(0.32+0.58*k/Math.max(1, ns-1)), len=lerp(S.len[0], S.len[1], R())*(1-0.4*k/ns), up=lerp(S.up[0], S.up[1], R()); a+=2.4+(R()-0.5)*0.6;   // alternate, about the golden angle
    const b=at(h), dir=[Math.cos(a)*Math.cos(up), Math.sin(up), Math.sin(a)*Math.cos(up)], e=[b[0]+dir[0]*len, b[1]+dir[1]*len, b[2]+dir[2]*len];
    limbs.push({ pts:[[...b, 0.009], [...e, 0.004]], dead:0, kind:'sapling' });
    cards.push({ x:b[0]+dir[0]*len*0.35, y:b[1]+dir[1]*len*0.35, z:b[2]+dir[2]*len*0.35, b:cardBasis([dir[0], dir[1]+0.25, dir[2]], (R()-0.5)*1.2+(k%2 ? 0.7 : -0.7)), s:lerp(S.s[0], S.s[1], R()), cell:'twig', tone:0.85+R()*0.3, of:'sapling' }); }
  cards.push({ x:at(sp.H*0.85)[0], y:gy+sp.H*0.85, z:at(sp.H*0.85)[2], b:cardBasis([lean[0], 1, lean[1]], R()*TAU), s:lerp(S.s[0], S.s[1], R())*0.9, cell:'twig', tone:0.9+R()*0.2, of:'sapling' });
  return { limbs, cards }; }

/* a canopy spray of the understorey ({ x, y, z centre, s, yaw, tilt, k }) → a card of this sheet: the broadleaf twig or the rosette, its base
   half a card below the centre along its own up (the same place and turn the crown sheet's centred card had) */
export function cardOf(p){ const cell= p.k%2 ? 'twig' : 'rosette', cy=Math.cos(p.yaw), sy=Math.sin(p.yaw), ct=Math.cos(p.tilt), st=Math.sin(p.tilt);
  /* three.js 'YXZ' rotation (yaw about y, then tilt about x): the card's up and its normal */
  const g=[sy*st, ct, cy*st], n=[sy*ct, -st, cy*ct], a=cross(g, n), s=p.s*(cell==='twig' ? 1.15 : 1);
  return { x:p.x-g[0]*s*0.5, y:p.y-g[1]*s*0.5, z:p.z-g[2]*s*0.5, b:[...norm(a), ...g, ...n], s, cell, tone:1, of:p.of }; }
