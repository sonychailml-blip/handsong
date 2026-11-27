/* LIGHT-6 — Light's own app icons (the founder, LIGHT-1: the brand emblem — five dots in an arc, as Night and the site — with Light's amber centre,
   on a warm dark ground). Drawn by code (circles and radial gradients, 4×4 supersampling), written as PNG with node's zlib; no font, no traced
   artwork. The emblem's geometry is core/icons.js EMBLEM_DOTS / EMBLEM_GLOW (viewBox 150 × 30).
     node tools/light-icons.mjs          → apps/light/icons/icon-192.png, icon-512.png (rounded square, transparent corners), icon-512-maskable.png (full bleed, the emblem inside the safe zone) */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOTS=[[15,24,3],[45,12,3],[105,12,3],[135,24,3]], GLOW=[75,6,4.2];
const BG0=[0x3a,0x2c,0x1c], BG1=[0x15,0x10,0x0b], INK=[246,241,232], INK_A=0.8, AMBER=[0xff,0xc4,0x6a], HALO=[0xff,0xb4,0x4a];

const crcT=new Uint32Array(256).map((_,n)=>{ let c=n; for(let k=0;k<8;k++) c= c&1 ? 0xedb88320^(c>>>1) : c>>>1; return c>>>0; });
const crc=b=>{ let c=0xffffffff; for(const x of b) c=crcT[(c^x)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const chunk=(type,data)=>{ const t=Buffer.from(type), len=Buffer.alloc(4), c=Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t,data]))); return Buffer.concat([len,t,data,c]); };
function png(w,h,rgba){ const raw=Buffer.alloc((w*4+1)*h); for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4); }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{ level:9 })), chunk('IEND',Buffer.alloc(0))]); }

/* one icon of size n: rounded (corner radius r, 0 = full bleed); the emblem spans `span` of the width, centred a little low (its arc rises) */
function icon(n, rounded, span){
  const out=Buffer.alloc(n*n*4), S=4, r=rounded ? n*0.22 : 0, k=n*span/150, ky=k*2.8, ox=(n-150*k)/2, oy=n*0.48-15*ky;   // as Night's icon: the arc steeper (y × 2.8), the dots larger
  const DR=3.4, GR=2.6;
  const over=(dst,src,a)=>[0,1,2].map(i=>dst[i]*(1-a)+src[i]*a);
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){ let acc=[0,0,0], cov=0;
    for(let sy=0;sy<S;sy++) for(let sx=0;sx<S;sx++){ const px=x+(sx+0.5)/S, py=y+(sy+0.5)/S;
      if(r){ const cx=Math.min(Math.max(px,r),n-r), cy=Math.min(Math.max(py,r),n-r); if(Math.hypot(px-cx,py-cy)>r) continue; }
      const d=Math.hypot(px-n/2, py-n*0.4)/(n*0.75); let c=over(BG1, BG0, Math.max(0,1-d));   // the warm ground, lighter above the centre
      const gx=ox+GLOW[0]*k, gy=oy+GLOW[1]*ky, gd=Math.hypot(px-gx, py-gy);
      c=over(c, HALO, 0.5*Math.exp(-Math.pow(gd/(GLOW[2]*k*GR*2.6),2)));   // the halo
      for(const [dx,dy,dr] of DOTS){ if(Math.hypot(px-(ox+dx*k), py-(oy+dy*ky))<=dr*k*DR) c=over(c, INK, INK_A); }
      if(gd<=GLOW[2]*k*GR) c=AMBER;
      acc=acc.map((v,i)=>v+c[i]); cov++; }
    const o=(y*n+x)*4; if(cov){ out[o]=Math.round(acc[0]/cov); out[o+1]=Math.round(acc[1]/cov); out[o+2]=Math.round(acc[2]/cov); } out[o+3]=Math.round(255*cov/(S*S)); }
  return png(n,n,out);
}
const DIR=path.join(ROOT,'apps/light/icons');
writeFileSync(path.join(DIR,'icon-192.png'), icon(192, true, 0.62));
writeFileSync(path.join(DIR,'icon-512.png'), icon(512, true, 0.62));
writeFileSync(path.join(DIR,'icon-512-maskable.png'), icon(512, false, 0.5));   // the safe zone: the inner 80 % circle
console.log('[light-icons] wrote apps/light/icons/icon-192.png, icon-512.png, icon-512-maskable.png');
