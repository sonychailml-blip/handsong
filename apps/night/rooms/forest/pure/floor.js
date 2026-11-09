/* NIGHT-6 slice 3 — THE FOREST FLOOR, as numbers. Pure (rule #36), node-tested (data row «FOREST floor (app)»): the room only draws what this
   gives. After the sketch «Живой лес»: the herb layer placed by DAMP and LIGHT — wood sorrel in damp patches, broad-leaved herbs, bilberry,
   wood anemones where light falls, nettles at the trunks' feet, sedges along the bank — and the FINE FERN in the lighter places (today's fern
   stays the shade species, where it is).
   - FLOOR_ATLAS: the plant sheet's cells in master pixels (tools/forest-bake.mjs draws the master, 2048², and its smaller copies), each
     species' world size, and its cell as uv (cellUv).
   - moistAt / lightAt: the floor's damp and light, 0…1 — the stream's distance and a seeded value noise.
   - floorPlaces(counts, trunks, ferns, seed): every plant { sp, x, z, s, rot } — never in the water (sedges only on the bank), never within
     3 m of the eye's ground point, nettles near a trunk, fine ferns away from today's ferns. */
import { seeded } from '../../../../../core/pure/dsp.js';
import { streamNear, STREAM } from './forestlife.js';

const F=Object.freeze, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
/* the sheet: master 2048²; tall cells 512×1024 on top, square 512² below. w, h — the plant's card size in world units (h its height) */
export const FLOOR_ATLAS=F({ size:2048, derived:F([1024, 512]),
  cells:F({ fern2:F([0,0,512,1024]), nettle:F([512,0,512,1024]), sedge:F([1024,0,512,1024]),
    sorrel:F([0,1024,512,512]), forb:F([512,1024,512,512]), bilberry:F([1024,1024,512,512]), anemone:F([1536,1024,512,512]) }),
  world:F({ fern2:F({ w:0.36, h:1.0 }), nettle:F({ w:0.42, h:0.85 }), sedge:F({ w:0.42, h:0.62 }), sorrel:F({ w:0.32, h:0.2 }), forb:F({ w:0.4, h:0.4 }),
    bilberry:F({ w:0.8, h:0.62 }), anemone:F({ w:0.34, h:0.3 }) }) });
export const HERBS=F(['sorrel','forb','bilberry','anemone','nettle','sedge']);
/* a cell → [u0, v0, du, dv] (uv with the image's top at v 1, as three.js flips an image) */
export function cellUv(sp){ const [x,y,w,h]=FLOOR_ATLAS.cells[sp], S=FLOOR_ATLAS.size; return [x/S, 1-(y+h)/S, w/S, h/S]; }

/* eyeR: 3 m from the eye, as today's grass (a cut-out card closer than that turns to jagged blocks at medium) */
export const FLOOR=F({ seed:0x464C4F52, x:12, zNear:3.4, zFar:-18, eye:F([0, 5.5]), eyeR:3, nettleR:1.6, fernGap:0.8, sedgeBank:F([-0.05, 0.6]) });
/* a seeded value noise and its fractal sum (the sketch's terrain noise, our own) */
const NOISE=(()=>{ const P=new Uint8Array(512), R=seeded(0x4E4F4953); for(let i=0;i<256;i++) P[i]=i; for(let i=255;i>0;i--){ const j=Math.floor(R()*(i+1)); const t=P[i]; P[i]=P[j]; P[j]=t; } for(let i=0;i<256;i++) P[i+256]=P[i]; return P; })();
function vn(x, y){ const X=Math.floor(x), Y=Math.floor(y), u=x-X, v=y-Y, f=t=>t*t*(3-2*t), g=(a,b)=>NOISE[(NOISE[a&255]+b)&255]/255, l=(a,b,t)=>a+(b-a)*t;
  return l(l(g(X,Y), g(X+1,Y), f(u)), l(g(X,Y+1), g(X+1,Y+1), f(u)), f(v)); }
export const fbm=(x, y)=>vn(x,y)*0.5+vn(x*2.1+5,y*2.1+3)*0.27+vn(x*4.3+9,y*4.3+1)*0.15+vn(x*8.7,y*8.7)*0.08;
const bankD=q=>q.d-STREAM.half;
/* the stream's distance on a 0.5-m grid over the floor (worked out once): far from the bank the grid answers, within NEAR of it the exact
   distance does — the bilinear error of a distance is at most half a cell's diagonal (0.36 m), and the law's last bank threshold is 1 m, so
   every decision at the bank stays exact */
const GRID=0.5, NEAR=1.4; let DIST=null;
function streamD(x, z){
  if(!DIST){ const nx=Math.ceil(2*FLOOR.x/GRID)+2, nz=Math.ceil((FLOOR.zNear-FLOOR.zFar)/GRID)+2, a=new Float32Array(nx*nz);
    for(let j=0;j<nz;j++) for(let i=0;i<nx;i++) a[j*nx+i]=streamNear(-FLOOR.x+i*GRID, FLOOR.zFar+j*GRID).d; DIST={ a, nx, nz }; }
  const fx=(x+FLOOR.x)/GRID, fz=(z-FLOOR.zFar)/GRID, i=Math.max(0, Math.min(DIST.nx-2, Math.floor(fx))), j=Math.max(0, Math.min(DIST.nz-2, Math.floor(fz))), u=fx-i, v=fz-j, A=DIST.a, W=DIST.nx;
  const d=(A[j*W+i]*(1-u)+A[j*W+i+1]*u)*(1-v)+(A[(j+1)*W+i]*(1-u)+A[(j+1)*W+i+1]*u)*v;
  return d-STREAM.half<NEAR ? streamNear(x, z) : { d }; }
/* the floor's damp (near the water, in damp patches) and light (an open band beside the bank, open patches), 0…1 */
export const moistAt=(x, z, q=streamNear(x,z))=>clamp(Math.exp(-((bankD(q)/2.2)**2))*0.8+0.3*fbm(x*0.13+2, z*0.13), 0, 1);
export const lightAt=(x, z, q=streamNear(x,z))=>clamp(0.25+0.5*Math.exp(-(((bankD(q)-2.4)/2.6)**2))+0.5*(fbm(x*0.08-3, z*0.08+7)-0.42), 0, 1);
const patch=(x, z, f, lo, hi)=>smooth(lo, hi, fbm(x*f+11.3, z*f-4.7));
/* each species' chance at (x, z): q the stream's nearest point, near the distance to the nearest trunk's bark */
const DENS={
  sorrel:(x,z,q)=>bankD(q)<0.2 ? 0 : patch(x,z,0.35,0.46,0.6)*(0.1+0.9*moistAt(x,z,q)**2)*(1-0.3*lightAt(x,z,q)),   // damp shade
  forb:(x,z,q)=>bankD(q)<0.3 ? 0 : patch(x,z,0.22,0.45,0.6)*0.8,
  bilberry:(x,z,q)=>bankD(q)<1 ? 0 : patch(x,z,0.15,0.48,0.64)*0.9,
  anemone:(x,z,q)=>bankD(q)<0.4 ? 0 : patch(x,z,0.27,0.5,0.66)*smooth(0.4,0.75,lightAt(x,z,q))*(1-0.85*moistAt(x,z,q)),   // where light falls, on drier ground
  nettle:(x,z,q,near)=>bankD(q)<0.8 ? 0 : Math.max(0, 1-near/FLOOR.nettleR)*0.7+patch(x,z,0.4,0.6,0.7)*0.3*(near<FLOOR.nettleR*2 ? 1 : 0),
  sedge:(x,z,q)=>{ const b=bankD(q); return b<FLOOR.sedgeBank[0] || b>FLOOR.sedgeBank[1] ? 0 : 0.95*Math.exp(-((b-0.15)**2)/0.08); },
};
export const SIZE=F({ sorrel:F([0.7,1.4]), forb:F([0.6,1.4]), bilberry:F([0.6,1.3]), anemone:F([0.7,1.3]), nettle:F([0.7,1.3]), sedge:F([0.6,1.3]), fern2:F([0.45,1.0]) });
/* counts { sorrel, forb, bilberry, anemone, nettle, sedge, fern2 (rosettes) }; trunks [[x, z, r]]; ferns today's [[x, z, s]] → [{ sp, x, z, s, rot }] */
export function floorPlaces(counts, trunks=[], ferns=[], seed=FLOOR.seed){
  const R=seeded(seed), out=[], L=FLOOR;
  const nearTrunk=(x,z)=>{ let b=1e9; for(const [tx,tz,r] of trunks){ const d=Math.hypot(tx-x, tz-z)-r; if(d<b) b=d; } return b; };
  const ok=(x,z)=>Math.hypot(x-L.eye[0], z-L.eye[1])>=L.eyeR && Math.abs(x)<=L.x && z<=L.zNear && z>=L.zFar;
  for(const sp of [...HERBS, 'fern2']){ const n=Math.max(0, counts[sp]|0); let k=0, tries=0;
    while(k<n && tries++<n*30){ const x=(R()*2-1)*L.x, z=L.zFar+Math.pow(R(),0.85)*(L.zNear-L.zFar), a=R(), b=R(), rot=R()*6.283;
      if(!ok(x,z)) continue; const q=streamD(x,z);
      let p; if(sp==='fern2'){ if(bankD(q)<0.25 || ferns.some(([fx,fz])=>Math.hypot(fx-x, fz-z)<L.fernGap)) continue; p=lightAt(x,z,q)*0.55*(1-0.5*moistAt(x,z,q)); }
      else p=DENS[sp](x, z, q, sp==='nettle' ? nearTrunk(x,z) : 0);
      if(!(p>0) || a>p) continue; const [s0,s1]=SIZE[sp];
      out.push({ sp, x, z, s:s0+b*(s1-s0), rot }); k++; } }
  return out;
}
