/* NIGHT-6 — THE FOREST'S PREPARED FILES (the user's rule for the run, 2026-11-09: what never changes during play is prepared in advance and
   shipped as files, not computed at every opening). This tool draws them from seeded code — our own work, registered in tools/licences.json
   (entry forest-files) — so they can be regenerated:
     node tools/forest-bake.mjs            writes every file into apps/night/rooms/forest/tex/
     node tools/forest-bake.mjs --check    compares the shipped files with what the tool draws now (exit 1 if one is stale)
   Node only: a tiny anti-aliased rasteriser and a PNG writer / reader (8-bit grey) of our own. The comparison is by PIXELS (the PNG's
   compressed bytes may differ between zlib versions). The data row «NIGHT forest files (app)» runs check() and the size budget.
   Files today: web.png (slice 1, a spider web: radial threads and a sagging spiral, after the sketch «Живой лес»). */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seeded } from '../core/pure/dsp.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FOREST_DIR='apps/night/rooms/forest', TEX_DIR=FOREST_DIR+'/tex';
/* the user's size budget for the forest's files (code and prepared files together): about 10–15 MB */
export const FOREST_BUDGET=15*1048576;

/* ---- drawing: a float coverage image S × S, 0…1; lines blend by max ---- */
function line(img, S, x0, y0, x1, y1, w, v){
  const h=w/2+0.5, dx=x1-x0, dy=y1-y0, L2=dx*dx+dy*dy||1e-9;
  const ax=Math.max(0, Math.floor(Math.min(x0,x1)-h)), bx=Math.min(S-1, Math.ceil(Math.max(x0,x1)+h)), ay=Math.max(0, Math.floor(Math.min(y0,y1)-h)), by=Math.min(S-1, Math.ceil(Math.max(y0,y1)+h));
  for(let y=ay;y<=by;y++) for(let x=ax;x<=bx;x++){ const px=x+0.5, py=y+0.5; let u=((px-x0)*dx+(py-y0)*dy)/L2; u=u<0?0:u>1?1:u;
    const ex=x0+u*dx-px, ey=y0+u*dy-py, c=h-Math.sqrt(ex*ex+ey*ey); if(c<=0) continue; const a=(c>1?1:c)*v, i=y*S+x; if(a>img[i]) img[i]=a; }
}
function quad(img, S, x0, y0, cx, cy, x1, y1, w, v, n=6){ let px=x0, py=y0;
  for(let k=1;k<=n;k++){ const t=k/n, u=1-t, x=u*u*x0+2*u*t*cx+t*t*x1, y=u*u*y0+2*u*t*cy+t*t*y1; line(img, S, px, py, x, y, w, v); px=x; py=y; } }
/* the spider web: 15 radial threads, rings that sag between them (the sketch's WEB at 256 px) */
function drawWeb(S=256, seed=0x57454232){
  const R=seeded(seed), img=new Float32Array(S*S), cx=S/2, cy=S/2, N=15, ang=[], rad=[];
  for(let i=0;i<N;i++){ ang.push(i/N*2*Math.PI+(R()-0.5)*0.25); rad.push(S*0.44*(0.78+R()*0.22)); }
  for(let i=0;i<N;i++) line(img, S, cx, cy, cx+Math.cos(ang[i])*rad[i], cy+Math.sin(ang[i])*rad[i], 1.0, 0.95);
  for(let r=S*0.031; r<S*0.42; r+=S*0.0137+r*0.025){
    for(let i=1;i<=N;i++){ const k=i%N, pk=i-1, a=ang[k]+(i===N?2*Math.PI:0), pa=ang[pk], rr=Math.min(r, rad[k]), pr=Math.min(r, rad[pk]), ma=(a+pa)/2, mr=(rr+pr)/2*0.93;
      quad(img, S, cx+Math.cos(pa)*pr, cy+Math.sin(pa)*pr, cx+Math.cos(ma)*mr, cy+Math.sin(ma)*mr, cx+Math.cos(a)*rr, cy+Math.sin(a)*rr, 0.75, 0.8); } }
  return img;
}
const toGrey=(img)=>{ const g=new Uint8Array(img.length); for(let i=0;i<img.length;i++) g[i]=Math.round(255*Math.max(0, Math.min(1, img[i]))); return g; };
/* every prepared file: { name, w, h, px (8-bit grey, row by row) } */
export function bakeAll(){ return [{ name:'web.png', w:256, h:256, px:toGrey(drawWeb(256)) }]; }

/* ---- PNG, 8-bit grey (colour type 0), our own writer and reader ---- */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c= c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
const crc32=b=>{ let c=0xFFFFFFFF; for(const x of b) c=CRC[(c^x)&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function chunk(type, data){ const len=Buffer.alloc(4), td=Buffer.concat([Buffer.from(type,'ascii'), data]), crc=Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function pngOf(f){ const ih=Buffer.alloc(13); ih.writeUInt32BE(f.w,0); ih.writeUInt32BE(f.h,4); ih[8]=8; ih[9]=0; ih[10]=0; ih[11]=0; ih[12]=0;
  const raw=Buffer.alloc((f.w+1)*f.h); for(let y=0;y<f.h;y++){ const o=y*(f.w+1); raw[o]=1;   // filter Sub: each byte minus its left neighbour
    for(let x=0;x<f.w;x++){ const v=f.px[y*f.w+x], l=x ? f.px[y*f.w+x-1] : 0; raw[o+1+x]=(v-l)&255; } }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level:9 })), chunk('IEND', Buffer.alloc(0))]); }
/* → { w, h, px } for an 8-bit grey PNG (any of the five row filters); throws on anything else */
export function pngRead(buf){
  if(buf.readUInt32BE(0)!==0x89504E47) throw new Error('not a PNG'); let o=8, w=0, h=0; const idat=[];
  while(o<buf.length){ const n=buf.readUInt32BE(o), type=buf.toString('ascii', o+4, o+8), d=buf.subarray(o+8, o+8+n); o+=12+n;
    if(type==='IHDR'){ w=d.readUInt32BE(0); h=d.readUInt32BE(4); if(d[8]!==8 || d[9]!==0 || d[12]!==0) throw new Error('not 8-bit grey without interlace'); }
    else if(type==='IDAT') idat.push(d); else if(type==='IEND') break; }
  const raw=inflateSync(Buffer.concat(idat)), px=new Uint8Array(w*h);
  for(let y=0;y<h;y++){ const f=raw[y*(w+1)], r=raw.subarray(y*(w+1)+1, (y+1)*(w+1));
    for(let x=0;x<w;x++){ const a=x ? px[y*w+x-1] : 0, b=y ? px[(y-1)*w+x] : 0, c=x && y ? px[(y-1)*w+x-1] : 0; let p;
      if(f===0) p=0; else if(f===1) p=a; else if(f===2) p=b; else if(f===3) p=(a+b)>>1; else if(f===4){ const q=a+b-c, pa=Math.abs(q-a), pb=Math.abs(q-b), pc=Math.abs(q-c); p= pa<=pb && pa<=pc ? a : pb<=pc ? b : c; } else throw new Error('filter '+f);
      px[y*w+x]=(r[x]+p)&255; } }
  return { w, h, px };
}

/* ---- the check (data row) and the sizes ---- */
/* every shipped file against what the tool draws now → { cases, differences, notes } (by pixels) */
export function check(baked=bakeAll()){
  const d=[], notes=[]; let n=0;
  for(const f of baked){ n++; const p=path.join(ROOT, TEX_DIR, f.name);
    if(!existsSync(p)){ d.push(`${TEX_DIR}/${f.name} is missing — run node tools/forest-bake.mjs`); continue; }
    let got; try{ got=pngRead(readFileSync(p)); }catch(e){ d.push(`${f.name}: ${e.message}`); continue; }
    let diff=0; if(got.w!==f.w || got.h!==f.h) diff=-1; else for(let i=0;i<f.px.length;i++) if(got.px[i]!==f.px[i]) diff++;
    if(diff) d.push(`${f.name} is stale (${diff<0 ? `${got.w}×${got.h}, ${f.w}×${f.h} drawn` : diff+' pixels differ'}) — run node tools/forest-bake.mjs`); }
  return { cases:n, differences:d, notes };
}
/* the forest's files on disk → { code, files, total, list:[[path, bytes]] } (code = .js; files = everything else, the prepared files) */
export function forestSizes(dir=FOREST_DIR){
  const list=[], walk=d=>{ for(const e of readdirSync(path.join(ROOT, d), { withFileTypes:true })){ const r=d+'/'+e.name; if(e.isDirectory()) walk(r); else list.push([r, statSync(path.join(ROOT, r)).size]); } };
  walk(dir); const code=list.filter(([f])=>f.endsWith('.js')).reduce((a,[,b])=>a+b, 0), total=list.reduce((a,[,b])=>a+b, 0);
  return { code, files:total-code, total, list };
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv.includes('--check')){ const r=check(); for(const x of r.differences) console.error('[forest-bake] '+x);
    console.log(r.differences.length ? `[forest-bake] STALE — ${r.differences.length} of ${r.cases} files` : `[forest-bake] current — ${r.cases} files`); process.exit(r.differences.length ? 1 : 0); }
  mkdirSync(path.join(ROOT, TEX_DIR), { recursive:true });
  for(const f of bakeAll()){ const b=pngOf(f); writeFileSync(path.join(ROOT, TEX_DIR, f.name), b); console.log(`[forest-bake] ${TEX_DIR}/${f.name} ${f.w}×${f.h} ${(b.length/1024).toFixed(1)} KB`); }
  const s=forestSizes(); console.log(`[forest-bake] the forest's files: ${(s.total/1048576).toFixed(2)} MB of ${(FOREST_BUDGET/1048576).toFixed(0)} MB (code ${(s.code/1024).toFixed(0)} KB, prepared files ${(s.files/1024).toFixed(0)} KB)`);
}
