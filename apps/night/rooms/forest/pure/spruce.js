/* FOREST-2b «spruce» — FOREST-1's YOUNG SPRUCES, brought back (the founder liked them on captures but never saw them in the app: the level bug). Pure
   (rule #36): FOREST-1's own law, word for word (archive/forest1-attempt/apps/night/rooms/forest/pure/foliage.js), its constants and helpers with it.
   Each spruce: a stem, whorls of drooping branches, needle cards of the CC0 foliage sheet (apps/night/rooms/forest/new/foliage-*.png, register
   «forest-foliage»); never in the light's reach nor in the middle of the frame (seen from the eye), out of the water, apart from the trunks and the
   understorey. Counts: SPRUCES per level. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { STREAM, streamNear, bankGround } from './forestlife.js';
import { lightAt } from './floor.js';

const F=Object.freeze, TAU=2*Math.PI, D=180/Math.PI, lerp=(a,b,t)=>a+(b-a)*t;
export const SPRUCES=F({ full:8, reduced:3 });
export const FOLIAGE_ATLAS=F({ size:2048, derived:F([1024, 512]),
  cells:F({ spruceA:F([0,0,1024,1024]), spruceB:F([1024,0,1024,1024]), twig:F([0,1024,512,1024]), fernA:F([512,1024,512,1024]), fernB:F([1024,1024,512,1024]),
    rosette:F([1536,1024,512,512]), dead:F([1536,1536,512,512]) }),
  aspect:F({ spruceA:1, spruceB:1, twig:0.5, fernA:0.5, fernB:0.5, rosette:1, dead:1 }) });
export function foliageCellUv(k){ const [x,y,w,h]=FOLIAGE_ATLAS.cells[k], S=FOLIAGE_ATLAS.size; return [x/S, 1-(y+h)/S, w/S, h/S]; }
export const LOWER=F({ eye:F([0, 1.55, 5.5]), mid:F({ az:11, el:F([-28, 17]) }) });   // the eye and the middle of the frame (FOREST-1's LOWER, the parts the spruces read)
export const SPRUCE=F({ seed:0x53505255, H:F([2.3, 5.4]), light:0.33, gap:1.3, x:15, z:F([1, -26]), whorl:F([0.3, 0.42]), per:F([4, 6]), every:0.15, s:F([0.42, 0.68]), deadBelow:0.22, cross:1.15 });
export function viewAt(x, y, z){ const E=LOWER.eye, dx=x-E[0], dy=y-E[1], dz=z-E[2], h=Math.hypot(dx, dz); return [Math.atan2(dx, -dz)*D, Math.atan2(dy, h)*D]; }
export function inMiddle(x, y, z){ const [a, e]=viewAt(x, y, z), M=LOWER.mid; return Math.abs(a)<M.az && e>M.el[0] && e<M.el[1] && z<LOWER.eye[2]; }
const norm=v=>{ const l=Math.hypot(v[0], v[1], v[2])||1; return [v[0]/l, v[1]/l, v[2]/l]; };
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const eyeD=(x, z)=>Math.hypot(x-LOWER.eye[0], z-LOWER.eye[2]);
export function cardBasis(g, roll){ g=norm(g); let side=cross(g, [0, 1, 0]); if(Math.hypot(...side)<1e-3) side=[1, 0, 0]; side=norm(side); const up=norm(cross(side, g));
  const c=Math.cos(roll), s=Math.sin(roll), n=norm([up[0]*c+side[0]*s, up[1]*c+side[1]*s, up[2]*c+side[2]*s]), a=norm(cross(g, n)); return [...a, ...g, ...n]; }
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
