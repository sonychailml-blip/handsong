/* NIGHT-6 — THE FOREST'S PREPARED FILES (the user's rules for the run, 2026-11-09: what never changes during play is prepared in advance and
   shipped as files; every texture is drawn as ONE MASTER at the highest quality, the smaller versions for the lower levels are derived from it,
   and a master is never lowered to save size). This tool draws them from seeded code — our own work, registered in tools/licences.json (entry
   forest-files) — so they can be regenerated:
     node tools/forest-bake.mjs            writes every file into apps/night/rooms/forest/tex/
     node tools/forest-bake.mjs --check    compares the shipped files with what the tool draws now (exit 1 if one is stale)
   Node only: our own rasteriser (polygons, strokes, ellipses on a supersampled premultiplied canvas, box-filtered down), PNG writer and reader
   (8-bit grey or RGBA). Comparison by PIXELS (zlib's bytes may differ between versions). The data row «NIGHT forest files (app)» runs check().
   Files (master → derived, the levels: high = the master, medium the next, low the smallest):
   - web-1024 → 512, 256: a spider web, radial threads, a sagging spiral and dew beads (slice 1);
   - floor-2048 → 1024, 512: the floor's plant sheet (slice 3, cells: apps/night/rooms/forest/pure/floor.js FLOOR_ATLAS) — the fine fern
     (an iterated-function fern), nettle, sedge, wood sorrel, a broad-leaved herb, bilberry with berries, wood anemone. Colours are the
     sketch «Живой лес»'s, each leaf jittered. Transparent pixels carry their neighbours' colour (no dark fringes when filtered).
     Slice 4 added four fallen leaves, slice 5 an ivy sprig (each drawn after the others, so every earlier cell stays as it was).
   - crown-1024 → 512, 256 (slice 7): four LEAF SPRAYS for the crowns and the understorey (layout: pure/canopy.js CROWN_ATLAS);
   - dapple-1024 → 512, 256 (slice 7): a tileable pattern of the moonlight's spots through the leaves (the ground moves two copies of it);
   - moon-512 → 256, 128 (slice 7): the moon's face — darker seas, soft craters, a slightly darker limb — inside today's soft glow edge;
   - shade-2048 → 1024, 512 (slice 5): the CONTACT SHADOWS, the darkness on the ground under the trunks, roots, rocks, logs, stumps and dead
     trees, painted from the same laws the room places them by (apps/night/rooms/forest/pure/wood.js shadeBlobs; the area WOOD.shade). */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seeded } from '../core/pure/dsp.js';
import { FLOOR_ATLAS } from '../apps/night/rooms/forest/pure/floor.js';
import { WOOD, woodPlaces, shadeBlobs, blobDark } from '../apps/night/rooms/forest/pure/wood.js';
import { forestTrunks } from '../apps/night/rooms/forest/pure/layout.js';
import { streamRocks } from '../apps/night/rooms/forest/pure/stream.js';
import { FOREST_ROOM } from '../apps/night/rooms/forest/pure/room.js';
import { CROWN_ATLAS } from '../apps/night/rooms/forest/pure/canopy.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FOREST_DIR='apps/night/rooms/forest', TEX_DIR=FOREST_DIR+'/tex';
/* the user's size budget for the forest's files, every level together (2026-11-09: warn before 30 MB) */
export const FOREST_BUDGET=30*1048576;
/* which file each level loads (high = the masters); the room's own table is forest.js FILES */
export const LEVEL_FILES=Object.freeze({ high:['web-1024.png','floor-2048.png','shade-2048.png','crown-1024.png','dapple-1024.png','moon-512.png'], medium:['web-512.png','floor-1024.png','shade-1024.png','crown-512.png','dapple-512.png','moon-256.png'],
  low:['web-256.png','floor-512.png','shade-512.png','crown-256.png','dapple-256.png','moon-128.png'] });

/* ---------------- grey drawing (the web): coverage 0…1, lines blend by max ---------------- */
function line(img, S, x0, y0, x1, y1, w, v){
  const h=w/2+0.5, dx=x1-x0, dy=y1-y0, L2=dx*dx+dy*dy||1e-9;
  const ax=Math.max(0, Math.floor(Math.min(x0,x1)-h)), bx=Math.min(S-1, Math.ceil(Math.max(x0,x1)+h)), ay=Math.max(0, Math.floor(Math.min(y0,y1)-h)), by=Math.min(S-1, Math.ceil(Math.max(y0,y1)+h));
  for(let y=ay;y<=by;y++) for(let x=ax;x<=bx;x++){ const px=x+0.5, py=y+0.5; let u=((px-x0)*dx+(py-y0)*dy)/L2; u=u<0?0:u>1?1:u;
    const ex=x0+u*dx-px, ey=y0+u*dy-py, c=h-Math.sqrt(ex*ex+ey*ey); if(c<=0) continue; const a=(c>1?1:c)*v, i=y*S+x; if(a>img[i]) img[i]=a; }
}
function dot(img, S, cx, cy, r, v){ for(let y=Math.max(0,Math.floor(cy-r-1));y<=Math.min(S-1,Math.ceil(cy+r+1));y++) for(let x=Math.max(0,Math.floor(cx-r-1));x<=Math.min(S-1,Math.ceil(cx+r+1));x++){
  const c=r+0.5-Math.hypot(x+0.5-cx, y+0.5-cy); if(c<=0) continue; const a=(c>1?1:c)*v*(1-0.35*Math.min(1, Math.hypot(x+0.5-cx-r*0.3, y+0.5-cy+r*0.3)/Math.max(r,1e-9))), i=y*S+x; if(a>img[i]) img[i]=a; } }
function quadG(img, S, x0, y0, cx, cy, x1, y1, w, v, n=10){ let px=x0, py=y0, pts=[];
  for(let k=1;k<=n;k++){ const t=k/n, u=1-t, x=u*u*x0+2*u*t*cx+t*t*x1, y=u*u*y0+2*u*t*cy+t*t*y1; line(img, S, px, py, x, y, w, v); pts.push([x,y]); px=x; py=y; } return pts; }
/* the web master (S = 1024): 17 radial threads, rings sagging between them, the hub, small dew beads along the spiral */
function drawWeb(S=1024, seed=0x57454233){
  const R=seeded(seed), img=new Float32Array(S*S), cx=S/2+(R()-0.5)*S*0.02, cy=S/2+(R()-0.5)*S*0.02, N=17, ang=[], rad=[], k=S/256;
  for(let i=0;i<N;i++){ ang.push(i/N*2*Math.PI+(R()-0.5)*0.22); rad.push(S*0.45*(0.76+R()*0.24)); }
  for(let i=0;i<N;i++){ line(img, S, cx, cy, cx+Math.cos(ang[i])*rad[i], cy+Math.sin(ang[i])*rad[i], 0.9*k, 0.95); line(img, S, cx+Math.cos(ang[i])*rad[i], cy+Math.sin(ang[i])*rad[i], cx+Math.cos(ang[(i+1)%N])*rad[(i+1)%N], cy+Math.sin(ang[(i+1)%N])*rad[(i+1)%N], 0.8*k, 0.75); }
  for(let r=S*0.012;r<S*0.045;r+=S*0.006) for(let i=0;i<N;i++){ const a=ang[i], b=ang[(i+1)%N]+(i===N-1?2*Math.PI:0); line(img, S, cx+Math.cos(a)*r, cy+Math.sin(a)*r, cx+Math.cos(b)*r, cy+Math.sin(b)*r, 0.6*k, 0.8); }   // the hub
  for(let r=S*0.06; r<S*0.43; r+=S*0.0125+r*0.022){
    for(let i=1;i<=N;i++){ const kk=i%N, pk=i-1, a=ang[kk]+(i===N?2*Math.PI:0), pa=ang[pk], rr=Math.min(r, rad[kk]), pr=Math.min(r, rad[pk]), ma=(a+pa)/2, mr=(rr+pr)/2*0.94;
      const pts=quadG(img, S, cx+Math.cos(pa)*pr, cy+Math.sin(pa)*pr, cx+Math.cos(ma)*mr, cy+Math.sin(ma)*mr, cx+Math.cos(a)*rr, cy+Math.sin(a)*rr, 0.6*k, 0.8);
      if(R()<0.35){ const p=pts[Math.floor(R()*pts.length)]; dot(img, S, p[0], p[1], (0.6+R()*1.1)*k, 1); } } }
  return img;
}
const toGrey=img=>{ const g=new Uint8Array(img.length); for(let i=0;i<img.length;i++) g[i]=Math.round(255*Math.max(0, Math.min(1, img[i]))); return g; };
function greyDown(px, S, f){ const T=S/f, o=new Uint8Array(T*T); for(let y=0;y<T;y++) for(let x=0;x<T;x++){ let s=0; for(let j=0;j<f;j++) for(let i=0;i<f;i++) s+=px[(y*f+j)*S+x*f+i]; o[y*T+x]=Math.round(s/(f*f)); } return o; }

/* ---------------- colour drawing (the plant sheet): a premultiplied RGBA canvas, drawn SS× larger, boxed down ---------------- */
function hsl(h, s, l, a=1){ h=((h%360)+360)%360/360; const k=n=>(n+h*12)%12, q=s*Math.min(l,1-l), f=n=>l-q*Math.max(-1, Math.min(k(n)-3, 9-k(n), 1)); return [f(0), f(8), f(4), a]; }
class Ras{
  constructor(w, h, ss){ this.W=w*ss; this.H=h*ss; this.ss=ss; this.p=new Float32Array(this.W*this.H*4); }
  /* even-odd fill of a polygon (master pixels), colour [r, g, b, a] straight */
  fill(pts, c){ const s=this.ss, P=pts.map(([x,y])=>[x*s, y*s]), W=this.W, H=this.H, p=this.p, a=c[3], r=c[0]*a, g=c[1]*a, b=c[2]*a;
    let y0=Infinity, y1=-Infinity; for(const q of P){ if(q[1]<y0) y0=q[1]; if(q[1]>y1) y1=q[1]; }
    const ya=Math.max(0, Math.floor(y0)), yb=Math.min(H-1, Math.ceil(y1)), xs=[];
    for(let y=ya;y<=yb;y++){ const cy=y+0.5; xs.length=0;
      for(let i=0,j=P.length-1;i<P.length;j=i++){ const [xi,yi]=P[i], [xj,yj]=P[j]; if((yi>cy)!==(yj>cy)) xs.push(xi+(cy-yi)/(yj-yi)*(xj-xi)); }
      xs.sort((u,v)=>u-v);
      for(let k=0;k+1<xs.length;k+=2){ const xa=Math.max(0, Math.ceil(xs[k]-0.5)), xb=Math.min(W-1, Math.floor(xs[k+1]-0.5));
        for(let x=xa;x<=xb;x++){ const o=(y*W+x)*4, t=1-a; p[o]=r+p[o]*t; p[o+1]=g+p[o+1]*t; p[o+2]=b+p[o+2]*t; p[o+3]=a+p[o+3]*t; } } } }
  ellipse(cx, cy, rx, ry, rot, c, n=24){ const pts=[]; for(let i=0;i<n;i++){ const t=i/n*2*Math.PI, x=Math.cos(t)*rx, y=Math.sin(t)*ry; pts.push([cx+x*Math.cos(rot)-y*Math.sin(rot), cy+x*Math.sin(rot)+y*Math.cos(rot)]); } this.fill(pts, c); }
  /* a stroke along a polyline, width w (master px), tapering from w to w1 */
  stroke(pts, w, c, w1=w){ for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1], [x1,y1]=pts[i], dx=x1-x0, dy=y1-y0, l=Math.hypot(dx,dy)||1e-9, t0=w+(w1-w)*(i-1)/(pts.length-1), t1=w+(w1-w)*i/(pts.length-1), nx=-dy/l, ny=dx/l;
      this.fill([[x0+nx*t0/2, y0+ny*t0/2], [x1+nx*t1/2, y1+ny*t1/2], [x1-nx*t1/2, y1-ny*t1/2], [x0-nx*t0/2, y0-ny*t0/2]], c); if(i<pts.length-1) this.ellipse(x1, y1, t1/2, t1/2, 0, c, 10); } }
  /* box-filtered down by ss → premultiplied floats at master size */
  down(){ const s=this.ss, w=this.W/s, h=this.H/s, o=new Float32Array(w*h*4), q=1/(s*s);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) for(let c=0;c<4;c++){ let a=0; for(let j=0;j<s;j++) for(let i=0;i<s;i++) a+=this.p[((y*s+j)*this.W+x*s+i)*4+c]; o[(y*w+x)*4+c]=a*q; }
    return { w, h, p:o }; }
}
const bez=(x0,y0,x1,y1,x2,y2,x3,y3,n=12)=>Array.from({ length:n+1 }, (_,k)=>{ const t=k/n, u=1-t; return [u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3, u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3]; });
const quad=(x0,y0,cx,cy,x1,y1,n=12)=>Array.from({ length:n+1 }, (_,k)=>{ const t=k/n, u=1-t; return [u*u*x0+2*u*t*cx+t*t*x1, u*u*y0+2*u*t*cy+t*t*y1]; });
const xf=(pts, x, y, a, sx=1, sy=sx)=>pts.map(([px,py])=>[x+px*sx*Math.cos(a)-py*sy*Math.sin(a), y+px*sx*Math.sin(a)+py*sy*Math.cos(a)]);
/* a leaf from its base (0, 0) to its tip (len, 0), half-width wid; rib → its midrib and side veins */
function leaf(r, x, y, len, wid, a, col, rib, serr=0){
  const N=serr ? 40 : 16; let top=bez(0,0, len*0.25,-wid, len*0.7,-wid*0.85, len,0, N), bot=bez(len,0, len*0.7,wid*0.85, len*0.25,wid, 0,0, N);
  if(serr){ const tooth=(p,i,s)=>i%2 ? p : [p[0]+len*0.012, p[1]+s*serr*wid*0.16*Math.sin(Math.PI*i/N)]; top=top.map((p,i)=>tooth(p,i,-1)); bot=bot.map((p,i)=>tooth(p,N-i,1)); }   // small forward teeth
  r.fill(xf([...top, ...bot], x, y, a), col);
  if(rib){ r.stroke(xf([[0,0],[len*0.92,0]], x, y, a), Math.max(0.8, wid*0.09), rib, Math.max(0.5, wid*0.03));
    for(let k=1;k<=4;k++){ const u=k/5; for(const s of [-1,1]) r.stroke(xf([[len*u,0],[len*(u+0.12), s*wid*0.62*Math.sin(Math.PI*u)]], x, y, a), Math.max(0.5, wid*0.035), rib); } }
}
const shade=(c, k, da=0)=>[Math.min(1,c[0]*k), Math.min(1,c[1]*k), Math.min(1,c[2]*k), Math.max(0, Math.min(1, c[3]+da))];

/* the species, each in its cell (w × h master px; ground at the cell's bottom) */
function drawSorrel(r, w, h, R){
  for(let i=0;i<40;i++){ const bx=w/2+(R()-0.5)*w*0.8, top=h*(0.18+R()*0.5), tx=bx+(R()-0.5)*w*0.12, ty=h-top, sz=w*(0.026+R()*0.022), rot=R()*6.283, sq=0.5+R()*0.25, hu=94+R()*18, li=0.2+R()*0.13;
    r.stroke(quad(bx,h, bx,ty+h*0.07, tx,ty), w*0.006, hsl(84,0.4,0.24));
    for(let k=0;k<3;k++){ const a=rot+k*2.094, col=hsl(hu+(R()-0.5)*6, 0.5+R()*0.12, li+(k===1?0.03:0)), heart=[];
      for(let j=0;j<=24;j++){ const t=j/24*2*Math.PI, hx=16*Math.pow(Math.sin(t),3), hy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)); heart.push([-hy/17+0.8, hx/17*0.9]); }   // a heart: its point at the stem, the notch outwards
      r.fill(xf(heart, tx, ty, a, sz, sz*sq/0.62), col); r.stroke(xf([[0,0],[sz*1.5,0]], tx, ty, a), Math.max(0.6, sz*0.045), shade(col, 0.62)); r.stroke(xf([[sz*0.2,0],[sz*1.62,0]], tx, ty, a), Math.max(0.4, sz*0.02), shade(col, 1.25, -0.4)); } }
}
function drawForb(r, w, h, R){
  for(let i=0;i<16;i++){ const bx=w/2+(R()-0.5)*w*0.5, hh=h*(0.2+R()*0.6), lx=bx+(R()-0.5)*w*0.35, ly=h-hh, hu=88+R()*20, li=0.15+R()*0.12;
    r.stroke(quad(bx,h, bx,ly+h*0.12, lx,ly), w*0.008, hsl(88,0.35,0.18), w*0.005);
    const L=w*(0.11+R()*0.12), a=(lx<bx?Math.PI:0)+(R()-0.5)*1.2-0.3; leaf(r, lx, ly, L, L*0.4, a, hsl(hu,0.4+R()*0.16,li), hsl(hu,0.3,li*1.55,0.7)); }
}
function drawBilberry(r, w, h, R){
  const twig=(x,y,a,len,d)=>{ const x2=x+Math.cos(a)*len, y2=y+Math.sin(a)*len; r.stroke([[x,y],[x2,y2]], Math.max(1.2, w*(0.012-d*0.003)), hsl(78,0.32,0.17));
    for(let k=0;k<7;k++){ const u=0.25+k*0.11, px=x+(x2-x)*u, py=y+(y2-y)*u, la=a+(k%2?1:-1)*(0.7+R()*0.5), hu=92+R()*24, li=0.16+R()*0.14;
      leaf(r, px, py, w*(0.045+R()*0.03), w*(0.02+R()*0.01), la, hsl(hu,0.42+R()*0.18,li), hsl(hu,0.3,li*1.5,0.55));
      if(R()<0.07){ const bx=px+w*0.012, by=py+w*0.016, br=w*(0.012+R()*0.004); r.ellipse(bx, by, br, br, 0, hsl(228,0.45,0.16)); r.ellipse(bx-br*0.35, by-br*0.35, br*0.3, br*0.25, 0, hsl(215,0.35,0.5,0.6)); r.ellipse(bx, by+br*0.6, br*0.25, br*0.18, 0, hsl(230,0.3,0.08,0.8)); } }
    if(d<3) for(let k=0;k<2;k++) twig(x2, y2, a+(R()-0.5)*1.1, len*0.7, d+1); };
  for(let i=0;i<6;i++) twig(w/2+(R()-0.5)*w*0.14, h, -Math.PI/2+(R()-0.5)*1.1, h*(0.17+R()*0.12), 0);
}
function drawAnemone(r, w, h, R){
  for(let i=0;i<14;i++) leaf(r, w/2+(R()-0.5)*w*0.7, h-h*0.02-R()*h*0.14, w*(0.09+R()*0.06), w*(0.03+R()*0.015), -Math.PI/2+(R()-0.5)*2.4, hsl(100+R()*20,0.3+R()*0.15,0.15+R()*0.09), hsl(105,0.3,0.28,0.5));
  for(let i=0;i<13;i++){ const bx=w/2+(R()-0.5)*w*0.72, hh=h*(0.3+R()*0.5), tx=bx+(R()-0.5)*w*0.12, ty=h-hh;
    r.stroke(quad(bx,h, bx,ty+h*0.12, tx,ty), w*0.0055, hsl(92,0.3,0.2));
    if(R()<0.2){ r.ellipse(tx, ty, w*0.014, w*0.022, 0, hsl(300,0.08,0.78)); r.ellipse(tx, ty+w*0.012, w*0.01, w*0.008, 0, hsl(90,0.3,0.3)); continue; }   // a bud
    const rr=w*(0.045+R()*0.025), sq=0.5+R()*0.35, rot=R()*6.283, tn=R(), pc= tn<0.2 ? [0.94,0.9,0.94] : tn<0.35 ? [0.9,0.93,0.97] : [0.95,0.96,0.94];
    for(let k=0;k<6;k++){ const a=rot+k*1.047; r.ellipse(tx+Math.cos(a)*rr*0.6, ty+Math.sin(a)*rr*0.6*sq, rr*0.55, rr*0.3*Math.max(0.5,sq), a, [...pc.map(v=>v*(0.92+R()*0.08)), 1]); }
    r.ellipse(tx, ty, rr*0.26, rr*0.26*Math.max(0.6,sq), 0, hsl(50,0.7,0.62)); for(let k=0;k<7;k++){ const a=k*0.9+R(); r.ellipse(tx+Math.cos(a)*rr*0.2, ty+Math.sin(a)*rr*0.2*sq, rr*0.05, rr*0.05, 0, hsl(46,0.8,0.5)); } }
}
function drawNettle(r, w, h, R){
  for(let s=0;s<5;s++){ const x0=w/2+(R()-0.5)*w*0.45, hh=h*(0.6+R()*0.36), bend=(R()-0.5)*w*0.16, st=quad(x0,h, x0+bend*0.5,h-hh*0.5, x0+bend,h-hh, 16);
    r.stroke(st, w*0.01, hsl(96,0.3,0.15), w*0.005); const pairs=Math.floor(hh/(h*0.09));
    for(let k=1;k<=pairs;k++){ const u=k/(pairs+0.4), px=x0+bend*u*u, py=h-hh*u, L=w*(0.12-u*0.06)*(0.8+R()*0.4), li=0.15+R()*0.09;
      for(const sd of [-1,1]) leaf(r, px, py, L, L*0.42, sd<0 ? Math.PI+(0.35+R()*0.3) : -(0.35+R()*0.3), hsl(96+R()*16,0.32+R()*0.15,li), hsl(95,0.25,li*1.6,0.55), 1); } }
}
function drawSedge(r, w, h, R){
  for(let i=0;i<90;i++){ const x0=w/2+(R()-0.5)*w*0.5, hh=h*(0.45+R()*0.53), bend=(R()-0.5)*(w*0.3+hh*0.45), bw=w*(0.006+R()*0.008), dry=R()<0.12, n=10, pts=[];
    for(let k=0;k<=n;k++){ const t=k/n; pts.push([x0+bend*t*t, h-hh*t]); }
    for(let k=1;k<=n;k++){ const t=(k-0.5)/n, c= dry ? hsl(44,0.3,0.15+t*0.3) : hsl(82+R()*16, 0.36+R()*0.16, 0.08+t*0.2+R()*0.04); r.stroke([pts[k-1], pts[k]], bw*(1-(k-1)/n)+0.4, c, bw*(1-k/n)+0.4); } }
}
/* a fallen leaf (NIGHT-6 slice 4: they drift on the stream): an ovate leaf, finely toothed, its stalk, veins, a darker rim and a few blotches;
   k picks its autumn colour */
function drawLeaf(r, w, h, R, k){
  const base=[[38,0.55,0.36],[16,0.55,0.3],[28,0.42,0.22],[62,0.42,0.34]][k], col=hsl(base[0]+(R()-0.5)*8, base[1], base[2]), a=-0.65+(R()-0.5)*0.3, L=w*0.74, x0=w/2-Math.cos(a)*L/2, y0=h/2-Math.sin(a)*L/2;
  r.stroke([[x0-Math.cos(a)*w*0.09, y0-Math.sin(a)*w*0.09], [x0, y0]], w*0.012, shade(col, 0.55), w*0.009);   // the stalk
  leaf(r, x0, y0, L*1.02, L*0.4, a, shade(col, 0.6), null, 0.5); leaf(r, x0+Math.cos(a)*L*0.01, y0+Math.sin(a)*L*0.01, L, L*0.37, a, col, shade(col, 1.25, -0.35), 0.5);
  for(let i=0;i<5;i++){ const u=0.2+R()*0.6, o=(R()-0.5)*L*0.25, bx=x0+Math.cos(a)*L*u-Math.sin(a)*o, by=y0+Math.sin(a)*L*u+Math.cos(a)*o, br=w*(0.015+R()*0.03); r.ellipse(bx, by, br, br*(0.6+R()*0.4), R()*3, shade(col, 0.65, -0.7)); }
}
/* the fine fern from an iterated-function system (the «mutant» fern), coloured by height and density, directly at master size */
/* ivy: a wandering stem with lobed, dark, glossy leaves on short stalks, alternating, larger low down */
function ivyLeaf(r, x, y, sz, a, col){
  const lobes=[[0, 1], [0.95, 0.74], [-0.95, 0.74], [1.9, 0.48], [-1.9, 0.48]], dark=shade(col, 0.55);
  for(const [k, c, g] of [[1.06, dark, 0], [1, col, 1]]) { r.ellipse(x, y, sz*0.36*k, sz*0.3*k, a, c);
    for(const [da, l] of lobes){ const b=a+da, L=sz*l; r.ellipse(x+Math.cos(b)*L*0.48, y+Math.sin(b)*L*0.48, L*0.56*k, L*0.3*k, b, c); } void g; }
  for(const [da, l] of lobes){ const b=a+da, L=sz*l*0.88; r.stroke([[x, y], [x+Math.cos(b)*L, y+Math.sin(b)*L]], Math.max(0.8, sz*0.028), hsl(78, 0.2, 0.26, 0.85), Math.max(0.5, sz*0.01)); }
  r.ellipse(x+Math.cos(a-0.5)*sz*0.35, y+Math.sin(a-0.5)*sz*0.35, sz*0.22, sz*0.09, a, hsl(118, 0.22, 0.24, 0.4));   // the gloss
}
function drawIvy(r, w, h, R){
  const st=bez(w/2, h, w*0.28, h*0.7, w*0.74, h*0.36, w*0.5+(R()-0.5)*w*0.1, h*0.02, 40);
  r.stroke(st, w*0.016, hsl(28, 0.3, 0.12), w*0.007);
  for(let i=0;i<11;i++){ const t=(i+0.6)/11.6, p=st[Math.min(st.length-1, Math.round(t*(st.length-1)))], s=i%2 ? 1 : -1, sz=w*(0.1+R()*0.045)*(1.15-0.4*t);
    const bx=p[0]+s*w*(0.07+R()*0.04), by=p[1]-h*(0.005+R()*0.02); r.stroke([p, [bx, by]], w*0.007, hsl(30, 0.3, 0.14), w*0.005);
    ivyLeaf(r, bx, by, sz, (s>0 ? -0.55 : Math.PI+0.55)+(R()-0.5)*0.5, hsl(116+R()*18, 0.3+R()*0.14, 0.085+R()*0.06)); }
}
/* the contact shadows: every blob multiplies the ground's light by 1 − a·blobDark(q), one sample per pixel at its centre (the map is smooth);
   rows run from the area's far edge (z0) towards the viewer */
function drawShade(S=2048){ const A=WOOD.shade, Lv=FOREST_ROOM.levels, T=forestTrunks(), P=woodPlaces(Lv.full, T), B=shadeBlobs(T, P, streamRocks(Lv.reduced.rocks)), v=new Float32Array(S*S).fill(1), px=S/A.w, pz=S/A.d;
  for(const [x,z,rx,rz,rot,a] of B){ const c=Math.cos(rot), s=Math.sin(rot), Rr=Math.max(rx,rz), i0=Math.max(0, Math.floor((x-Rr-A.x0)*px)), i1=Math.min(S-1, Math.ceil((x+Rr-A.x0)*px)), j0=Math.max(0, Math.floor((z-Rr-A.z0)*pz)), j1=Math.min(S-1, Math.ceil((z+Rr-A.z0)*pz));
    for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const dx=A.x0+(i+0.5)/px-x, dz=A.z0+(j+0.5)/pz-z, u=(dx*c+dz*s)/rx, w=(-dx*s+dz*c)/rz, q=Math.hypot(u, w); if(q<1) v[j*S+i]*=1-a*blobDark(q); } }
  return v; }
/* NIGHT-6 slice 7: a leaf spray (w × h cell) of kind k — a twig from the lower middle, its side twigs, leaves along them back to front
   (the back ones darker): 0 beech-like ovals, 1 hazel (round, toothed), 2 lobed, 3 small-leaved */
function drawSpray(r, w, h, R, k){
  const L=[[0.15, 0.075, 0.25, 105, 0.34, 0.15], [0.14, 0.095, 0.6, 96, 0.32, 0.17], [0.16, 0.07, 0, 112, 0.3, 0.13], [0.085, 0.045, 0.3, 88, 0.38, 0.19]][k];
  const main=bez(w*0.5, h*0.98, w*(0.45+R()*0.1), h*0.65, w*(0.5+(R()-0.5)*0.2), h*0.35, w*(0.5+(R()-0.5)*0.15), h*0.2, 30), twigs=[main];   // the tip low enough that the top leaves stay inside the cell
  for(let i=0;i<5;i++){ const p=main[6+Math.floor(R()*20)], sd=i%2 ? 1 : -1, l=w*(0.18+R()*0.16); twigs.push(quad(p[0], p[1], p[0]+sd*l*0.5, p[1]-l*0.25, p[0]+sd*l, Math.max(h*0.2, p[1]-l*(0.2+R()*0.4)), 10)); }
  for(const t of twigs) r.stroke(t, w*0.009, hsl(25, 0.25, 0.13), w*0.004);
  for(let pass=0;pass<2;pass++) for(const t of twigs) for(let i=2;i<t.length;i+=k===3 ? 1 : 2){ if(R()<0.15) continue;
    const [x,y]=t[i], [px,py]=t[i-1], ta=Math.atan2(y-py, x-px), sd=(i%4<2) ? 1 : -1, a=ta+sd*(0.7+R()*0.5), len=w*L[0]*(0.75+R()*0.5), wid=w*L[1]*(0.8+R()*0.4);
    const col=hsl(L[3]+(R()-0.5)*16, L[4]+(R()-0.5)*0.1, L[5]*(pass ? 1 : 0.7)+(R()-0.5)*0.04);
    if(k===2){ for(let j=-2;j<=2;j++) r.ellipse(x+Math.cos(a)*len*(0.45+0.12*Math.abs(j)), y+Math.sin(a)*len*(0.45+0.12*Math.abs(j)), len*0.38, wid*(0.6+0.15*(2-Math.abs(j))), a+j*0.42, col); }
    else leaf(r, x, y, len, wid, a, col, pass ? shade(col, 1.35, -0.4) : null, L[2]); }
}
function crownMaster(){ const A=CROWN_ATLAS, S=A.size, sheet=new Float32Array(S*S*4), R=seeded(0x43524F57), SS=3;
  for(let k=0;k<4;k++){ const r=new Ras(A.cell, A.cell, SS); drawSpray(r, A.cell, A.cell, R, k); const c=r.down(), X=(k%2)*A.cell, Y=Math.floor(k/2)*A.cell;
    for(let y=0;y<c.h;y++) sheet.set(c.p.subarray(y*c.w*4, (y+1)*c.w*4), ((Y+y)*S+X)*4); }
  return sheet; }
/* the moonlight's spots through the leaves: soft ellipses scattered on a torus (tileable), summed and shaped into bright patches on dark */
function drawDapple(S=1024){ const R=seeded(0x44415050), v=new Float32Array(S*S);
  for(let i=0;i<260;i++){ const cx=R()*S, cy=R()*S, rx=S*(0.012+Math.pow(R(),2)*0.05), ry=rx*(0.5+R()*0.7), a=R()*Math.PI, c=Math.cos(a), s=Math.sin(a), Rr=Math.max(rx, ry), w=0.5+R()*0.6;
    for(let y=Math.floor(cy-Rr);y<=Math.ceil(cy+Rr);y++) for(let x=Math.floor(cx-Rr);x<=Math.ceil(cx+Rr);x++){ const dx=x+0.5-cx, dy=y+0.5-cy, u=(dx*c+dy*s)/rx, q=(-dx*s+dy*c)/ry, d=u*u+q*q; if(d<1) v[((y%S+S)%S)*S+((x%S+S)%S)]+=w*(1-d)*(1-d); } }
  for(let i=0;i<S*S;i++){ const t=Math.max(0, Math.min(1, (v[i]-0.12)/0.7)); v[i]=t*t*(3-2*t); }
  return v; }
/* the moon's face (S²): solid to 0.62 of the radius with seas, craters and a darker limb, then today's soft edge (1 → 0.1 at 0.8 → 0 at 1) */
function drawMoon(S=512){ const R=seeded(0x4D4F4F4E), v=new Float32Array(S*S), c=S/2, seas=[], craters=[];
  for(let i=0;i<9;i++) seas.push([(R()-0.5)*1.2, (R()-0.5)*1.2, 0.14+R()*0.2, 0.1+R()*0.12]);   // spread over the face (its own unit radius)
  for(let i=0;i<26;i++) craters.push([(R()-0.5)*1.05, (R()-0.5)*1.05, 0.015+Math.pow(R(),2)*0.06]);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const u=(x+0.5-c)/c, w=(y+0.5-c)/c, r=Math.hypot(u, w); let b;
    if(r<0.62){ const q=r/0.62; b=0.86+0.14*Math.sqrt(Math.max(0, 1-q*q)); const nu=u/0.62, nw=w/0.62;
      for(const [sx,sy,sr,sk] of seas){ const d=Math.hypot(nu-sx, nw-sy)/sr; if(d<1.4) b-=sk*(d<1 ? 1-0.35*d*d : Math.max(0, 1.4-d)/0.4*0.65); }
      for(const [cx,cy,cr] of craters){ const d=Math.hypot(nu-cx, nw-cy)/cr; if(d<1.3) b+= d<0.85 ? -0.07 : 0.06*(1.3-d)/0.45; }
      b=Math.max(0.45, Math.min(1, b)); if(q>0.96) b*=1-(q-0.96)/0.04*0.08; }
    else if(r<0.8) b=0.86*(1-(r-0.62)/0.18*0.9); else b=r<1 ? 0.086*(1-(r-0.8)/0.2) : 0;   // the glow goes on from the limb's own brightness (no bright ring)
    v[y*S+x]=b; }
  return v; }
function drawFern2(w, h, seed=9){
  const maps=[[0,0,0,0.25,0,-0.4,0.02],[0.95,0.005,-0.005,0.93,-0.002,0.5,0.84],[0.035,-0.2,0.16,0.04,-0.09,0.02,0.07],[-0.04,0.2,0.16,0.04,0.083,0.12,0.07]];
  const R=seeded(seed), cum=[]; let acc=0; for(const m of maps){ acc+=m[6]; cum.push(acc); }
  const iters=Math.round(w*h*8), pts=new Float32Array(iters*2); let n=0, x=0, y=0, x0=1e9, x1=-1e9, y0=1e9, y1=-1e9;
  for(let i=0;i<iters;i++){ const q=R()*acc; let k=0; while(q>cum[k]) k++; const m=maps[k], nx=m[0]*x+m[1]*y+m[4], ny=m[2]*x+m[3]*y+m[5]; x=nx; y=ny; if(i<20) continue;
    pts[n++]=x; pts[n++]=y; if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y; }
  const s=Math.min((w-16)/(x1-x0), (h-16)/(y1-y0)), ox=(w-(x1-x0)*s)/2, dens=new Float32Array(w*h);
  for(let i=0;i<n;i+=2){ const px=Math.floor(ox+(pts[i]-x0)*s), py=Math.floor(h-8-(pts[i+1]-y0)*s); if(px>=0 && px<w && py>=0 && py<h) dens[py*w+px]+=1; }
  const bl=new Float32Array(w*h); let sum=0, cnt=0; for(let yy=1;yy<h-1;yy++) for(let xx=1;xx<w-1;xx++){ let a=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) a+=dens[(yy+dy)*w+xx+dx]; a/=9; bl[yy*w+xx]=a; if(a>0){ sum+=a; cnt++; } }
  const avg=sum/Math.max(1,cnt), cn=seeded(seed+1), o=new Float32Array(w*h*4);
  for(let p=0;p<w*h;p++){ const v=bl[p]; if(v<avg*0.04) continue; const t=1-Math.floor(p/w)/h, c=hsl(98-t*14+(cn()-0.5)*10, 0.42+t*0.12, 0.075+t*0.16+Math.min(0.08, v/avg*0.02)+(cn()-0.5)*0.04), a=Math.min(1, v/avg*0.75);
    o[p*4]=c[0]*a; o[p*4+1]=c[1]*a; o[p*4+2]=c[2]*a; o[p*4+3]=a; }
  return { w, h, p:o };
}
/* the plant sheet's master: every cell drawn at 3× and boxed down into the 2048² sheet (premultiplied floats) */
function floorMaster(){
  const A=FLOOR_ATLAS, S=A.size, sheet=new Float32Array(S*S*4), R=seeded(0x464C5231), SS=3;
  const put=(c, X, Y)=>{ for(let y=0;y<c.h;y++) sheet.set(c.p.subarray(y*c.w*4, (y+1)*c.w*4), ((Y+y)*S+X)*4); };
  const draw={ sorrel:drawSorrel, forb:drawForb, bilberry:drawBilberry, anemone:drawAnemone, nettle:drawNettle, sedge:drawSedge,
    leaf0:(r,w,h,R)=>drawLeaf(r,w,h,R,0), leaf1:(r,w,h,R)=>drawLeaf(r,w,h,R,1), leaf2:(r,w,h,R)=>drawLeaf(r,w,h,R,2), leaf3:(r,w,h,R)=>drawLeaf(r,w,h,R,3), ivy:drawIvy };   // added cells last: every earlier cell stays as it was
  for(const [sp,[x,y,w,h]] of Object.entries(A.cells)){ if(sp==='fern2'){ put(drawFern2(w,h), x, y); continue; } const r=new Ras(w, h, SS); draw[sp](r, w, h, R); put(r.down(), x, y); }
  return sheet;
}
const boxDown=(p, S, f)=>{ const T=S/f, o=new Float32Array(T*T*4), q=1/(f*f); for(let y=0;y<T;y++) for(let x=0;x<T;x++) for(let c=0;c<4;c++){ let a=0; for(let j=0;j<f;j++) for(let i=0;i<f;i++) a+=p[((y*f+j)*S+x*f+i)*4+c]; o[(y*T+x)*4+c]=a*q; } return o; };
/* premultiplied floats → straight RGBA8; transparent pixels take their opaque neighbours' colour (passes), so filtering adds no dark fringe */
function toRGBA(p, S, passes=6){
  const o=new Uint8Array(S*S*4), col=new Float32Array(S*S*3), has=new Uint8Array(S*S);
  for(let i=0;i<S*S;i++){ const a=p[i*4+3]; if(a>1/512){ for(let c=0;c<3;c++) col[i*3+c]=Math.min(1, p[i*4+c]/a); has[i]=1; } }
  for(let k=0;k<passes;k++){ const nh=has.slice(), nc=col.slice();
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x; if(has[i]) continue; let n=0, r=0, g=0, b=0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx=x+dx, yy=y+dy; if(xx<0||yy<0||xx>=S||yy>=S) continue; const j=yy*S+xx; if(has[j]){ n++; r+=col[j*3]; g+=col[j*3+1]; b+=col[j*3+2]; } }
      if(n){ nc[i*3]=r/n; nc[i*3+1]=g/n; nc[i*3+2]=b/n; nh[i]=1; } }
    has.set(nh); col.set(nc); }
  for(let i=0;i<S*S;i++){ for(let c=0;c<3;c++) o[i*4+c]=Math.round(255*col[i*3+c]); o[i*4+3]=Math.round(255*Math.max(0, Math.min(1, p[i*4+3]))); }
  return o;
}
/* every prepared file: { name, w, h, ch (1 grey | 4 RGBA), px } — the masters first, each derived file from its master */
export function bakeAll(){
  const out=[], web=drawWeb(1024), wg=toGrey(web);
  out.push({ name:'web-1024.png', w:1024, h:1024, ch:1, px:wg }, { name:'web-512.png', w:512, h:512, ch:1, px:greyDown(wg,1024,2) }, { name:'web-256.png', w:256, h:256, ch:1, px:greyDown(wg,1024,4) });
  const S=FLOOR_ATLAS.size, m=floorMaster(); out.push({ name:`floor-${S}.png`, w:S, h:S, ch:4, px:toRGBA(m, S) });
  for(const d of FLOOR_ATLAS.derived) out.push({ name:`floor-${d}.png`, w:d, h:d, ch:4, px:toRGBA(boxDown(m, S, S/d), d, 3) });
  { const C=CROWN_ATLAS, m=crownMaster(); out.push({ name:`crown-${C.size}.png`, w:C.size, h:C.size, ch:4, px:toRGBA(m, C.size) });   // NIGHT-6 slice 7
    for(const d of C.derived) out.push({ name:`crown-${d}.png`, w:d, h:d, ch:4, px:toRGBA(boxDown(m, C.size, C.size/d), d, 3) }); }
  { const dg=toGrey(drawDapple(1024)); out.push({ name:'dapple-1024.png', w:1024, h:1024, ch:1, px:dg }, { name:'dapple-512.png', w:512, h:512, ch:1, px:greyDown(dg,1024,2) }, { name:'dapple-256.png', w:256, h:256, ch:1, px:greyDown(dg,1024,4) }); }
  { const mg=toGrey(drawMoon(512)); out.push({ name:'moon-512.png', w:512, h:512, ch:1, px:mg }, { name:'moon-256.png', w:256, h:256, ch:1, px:greyDown(mg,512,2) }, { name:'moon-128.png', w:128, h:128, ch:1, px:greyDown(mg,512,4) }); }
  const sg=toGrey(drawShade(2048)); out.push({ name:'shade-2048.png', w:2048, h:2048, ch:1, px:sg }, { name:'shade-1024.png', w:1024, h:1024, ch:1, px:greyDown(sg,2048,2) }, { name:'shade-512.png', w:512, h:512, ch:1, px:greyDown(sg,2048,4) });   // NIGHT-6 slice 5
  return out;
}

/* ---------------- PNG, 8-bit grey (type 0) or RGBA (type 6), our own writer and reader ---------------- */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c= c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
const crc32=b=>{ let c=0xFFFFFFFF; for(const x of b) c=CRC[(c^x)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function chunk(type, data){ const len=Buffer.alloc(4), td=Buffer.concat([Buffer.from(type,'ascii'), data]), crc=Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function pngOf(f){ const ch=f.ch||1, ih=Buffer.alloc(13); ih.writeUInt32BE(f.w,0); ih.writeUInt32BE(f.h,4); ih[8]=8; ih[9]= ch===4 ? 6 : 0; ih[10]=0; ih[11]=0; ih[12]=0;
  const row=f.w*ch, raw=Buffer.alloc((row+1)*f.h);
  for(let y=0;y<f.h;y++){ const o=y*(row+1); raw[o]=1;   // filter Sub: each byte minus the same channel of its left neighbour
    for(let x=0;x<row;x++){ const v=f.px[y*row+x], l=x>=ch ? f.px[y*row+x-ch] : 0; raw[o+1+x]=(v-l)&255; } }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level:9 })), chunk('IEND', Buffer.alloc(0))]); }
/* → { w, h, ch, px } for an 8-bit grey or RGBA PNG (any of the five row filters); throws on anything else */
export function pngRead(buf){
  if(buf.readUInt32BE(0)!==0x89504E47) throw new Error('not a PNG'); let o=8, w=0, h=0, ch=1; const idat=[];
  while(o<buf.length){ const n=buf.readUInt32BE(o), type=buf.toString('ascii', o+4, o+8), d=buf.subarray(o+8, o+8+n); o+=12+n;
    if(type==='IHDR'){ w=d.readUInt32BE(0); h=d.readUInt32BE(4); if(d[8]!==8 || (d[9]!==0 && d[9]!==6) || d[12]!==0) throw new Error('not 8-bit grey or RGBA without interlace'); ch= d[9]===6 ? 4 : 1; }
    else if(type==='IDAT') idat.push(d); else if(type==='IEND') break; }
  const raw=inflateSync(Buffer.concat(idat)), row=w*ch, px=new Uint8Array(row*h);
  for(let y=0;y<h;y++){ const f=raw[y*(row+1)], r=raw.subarray(y*(row+1)+1, (y+1)*(row+1));
    for(let x=0;x<row;x++){ const a=x>=ch ? px[y*row+x-ch] : 0, b=y ? px[(y-1)*row+x] : 0, c=x>=ch && y ? px[(y-1)*row+x-ch] : 0; let p;
      if(f===0) p=0; else if(f===1) p=a; else if(f===2) p=b; else if(f===3) p=(a+b)>>1; else if(f===4){ const q=a+b-c, pa=Math.abs(q-a), pb=Math.abs(q-b), pc=Math.abs(q-c); p= pa<=pb && pa<=pc ? a : pb<=pc ? b : c; } else throw new Error('filter '+f);
      px[y*row+x]=(r[x]+p)&255; } }
  return { w, h, ch, px };
}

/* ---------------- the check (data row) and the sizes ---------------- */
export function check(baked=bakeAll()){
  const d=[], notes=[]; let n=0;
  for(const f of baked){ n++; const p=path.join(ROOT, TEX_DIR, f.name);
    if(!existsSync(p)){ d.push(`${TEX_DIR}/${f.name} is missing — run node tools/forest-bake.mjs`); continue; }
    let got; try{ got=pngRead(readFileSync(p)); }catch(e){ d.push(`${f.name}: ${e.message}`); continue; }
    let diff=0; if(got.w!==f.w || got.h!==f.h || got.ch!==(f.ch||1)) diff=-1; else for(let i=0;i<f.px.length;i++) if(got.px[i]!==f.px[i]) diff++;
    if(diff) d.push(`${f.name} is stale (${diff<0 ? `${got.w}×${got.h}×${got.ch}, ${f.w}×${f.h}×${f.ch||1} drawn` : diff+' bytes differ'}) — run node tools/forest-bake.mjs`); }
  { const names=new Set(baked.map(f=>f.name)), dir=path.join(ROOT, TEX_DIR); if(existsSync(dir)) for(const f of readdirSync(dir)) if(!names.has(f)){ n++; d.push(`${TEX_DIR}/${f} is not drawn by the tool any more — remove it`); } }
  return { cases:n, differences:d, notes };
}
/* the forest's files on disk → { code, files, total, list:[[path, bytes]], levels:{ high, medium, low } (code + that level's files) } */
export function forestSizes(dir=FOREST_DIR){
  const list=[], walk=d=>{ for(const e of readdirSync(path.join(ROOT, d), { withFileTypes:true })){ const r=d+'/'+e.name; if(e.isDirectory()) walk(r); else list.push([r, statSync(path.join(ROOT, r)).size]); } };
  walk(dir); const code=list.filter(([f])=>f.endsWith('.js')).reduce((a,[,b])=>a+b, 0), total=list.reduce((a,[,b])=>a+b, 0), size=n=>(list.find(([f])=>f.endsWith('/'+n))||[0,0])[1];
  const levels=Object.fromEntries(Object.entries(LEVEL_FILES).map(([lv,fs])=>[lv, code+fs.reduce((a,f)=>a+size(f),0)]));
  return { code, files:total-code, total, list, levels };
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const t0=Date.now();
  if(process.argv.includes('--check')){ const r=check(); for(const x of r.differences) console.error('[forest-bake] '+x);
    console.log(r.differences.length ? `[forest-bake] STALE — ${r.differences.length} problem(s) in ${r.cases}` : `[forest-bake] current — ${r.cases} files (${((Date.now()-t0)/1000).toFixed(1)} s)`); process.exit(r.differences.length ? 1 : 0); }
  const dir=path.join(ROOT, TEX_DIR); mkdirSync(dir, { recursive:true }); const all=bakeAll(), names=new Set(all.map(f=>f.name));
  for(const f of readdirSync(dir)) if(!names.has(f)){ rmSync(path.join(dir, f)); console.log(`[forest-bake] removed ${TEX_DIR}/${f} (no longer drawn)`); }
  for(const f of all){ const b=pngOf(f); writeFileSync(path.join(dir, f.name), b); console.log(`[forest-bake] ${TEX_DIR}/${f.name} ${f.w}×${f.h}${f.ch===4?' RGBA':' grey'} ${(b.length/1024).toFixed(1)} KB`); }
  const s=forestSizes(), MB=x=>(x/1048576).toFixed(2)+' MB';
  console.log(`[forest-bake] the forest's files: ${MB(s.total)} of ${MB(FOREST_BUDGET)} (code ${(s.code/1024).toFixed(0)} KB) · per level: high ${MB(s.levels.high)}, medium ${MB(s.levels.medium)}, low ${MB(s.levels.low)} · ${((Date.now()-t0)/1000).toFixed(1)} s`);
}
