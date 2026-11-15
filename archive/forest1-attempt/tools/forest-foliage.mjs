/* FOREST-1 — THE FOREST'S CC0 FOLIAGE SHEET AND ROCK DETAIL (dev tool; never runs in the app). The founder (FOREST-1): «foliage cards with CC0
   alpha textures, no blobby shapes». Sources: Poly Haven models' leaf atlases with their alpha maps (CC0 1.0, register entry «forest-cc0-sources»,
   kept in tools/design/forest/cc0/ with their SHA-1s): fir_tree_01 (twig), tree_small_02 (leaves), fern_02 (fronds); and the tileable texture
   lichen_rock (colour + normal). Our own composition (crops, a rosette, a dead tint) is what ships (register entry «forest-foliage»).
     node tools/forest-foliage.mjs            decodes the sources in headless Chrome (canvas; JPEG has no decoder in node), composes, writes
                                              apps/night/rooms/forest/cc0/foliage-2048.png (the master) → foliage-1024.png, foliage-512.png (each box-
                                              filtered from the master, colour weighted by alpha), rock-col-512.jpg, rock-nor-512.jpg
     node tools/forest-foliage.mjs --check    the sources' SHA-1s are the registered ones and the derived sheets are the master boxed down
                                              (node only; the data row «FOREST foliage files (app)» runs check())
   The cells (pure/foliage.js FOLIAGE_ATLAS): every card's BASE at the bottom middle of its cell (a twig, a frond grows up from it). */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pngOf, pngRead } from './forest-bake.mjs';
import { FOLIAGE_ATLAS } from '../apps/night/rooms/forest/pure/foliage.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC='tools/design/forest/cc0', OUT_DIR='apps/night/rooms/forest/cc0';
export const FOLIAGE_SOURCES=Object.freeze({
  'fir_tree_01_twig_diff_2k.jpg':'6e27188dd52198bb42ca33ec0e5428372c8d8818', 'fir_tree_01_twig_alpha_2k.jpg':'2733fbc513cd25878f3fae26216587b38271abcf',
  'tree_small_02_leaves_diff_2k.jpg':'135e9e1e0e54c1cdc3d3b32dbaa2af6f52812b84', 'tree_small_02_leaves_alpha_2k.jpg':'b5ea131f69dd2903d1e83f8328c4a2952cd650b9',
  'fern_02_diff_2k.jpg':'6ca79d094d8c591ff811a185d51f4f42b41b3e01', 'fern_02_alpha_2k.jpg':'40bcf425c08968e8b869dda732f81787912eaefd',
  'lichen_rock_diff_1k.jpg':'9646bf5e4168b70afbd5ae419f8a42dfc8880687', 'lichen_rock_nor_gl_1k.jpg':'6411cd091ed3bd38e1c5745ed8298a6d9dcb6c93' });
/* the crops in the 2048² source atlases [file stem, x, y, w, h] → each cell (pure/foliage.js), drawn to fit, the base at the bottom middle */
/* the crops in the 2048² source atlases [file stem, x, y, w, h, keep (a polygon in the cell's fractions; null: all)] → each cell, drawn to fit,
   the base at the bottom middle; LEAVES: single leaves of tree_small_02 [x, y, w, h] (each points left, its stalk at the right), clipped to their
   blade — the broadleaf twig and the rosette are OUR composition of them on our own drawn stems (the atlas's own twig carried its neighbours) */
const CROPS=Object.freeze({ spruceA:['fir_tree_01_twig', 625, 827, 690, 790, [[0,0],[0.9,0],[0.9,1],[0,1]]], spruceB:['fir_tree_01_twig', 1300, 915, 655, 800, [[0.12,0],[1,0],[1,0.7],[0.6,0.76],[0.6,1],[0.12,1]]],
  fernA:['fern_02', 640, 40, 300, 1535, null], fernB:['fern_02', 1455, 205, 290, 1645, null] });
const LEAVES=Object.freeze([[127,111,256,175],[66,382,290,196],[125,652,290,191],[127,943,212,148],[93,1219,294,196],[498,578,204,152],[498,848,318,175],[541,1092,302,185]]);
const sha1=f=>createHash('sha1').update(readFileSync(f)).digest('hex');

/* RGBA master (straight alpha) → a d² copy: box filter, colour weighted by alpha (no dark fringes), transparent pixels keep their box's colour */
export function sheetDown(px, S, d){ const k=S/d, o=new Uint8Array(d*d*4);
  for(let y=0;y<d;y++) for(let x=0;x<d;x++){ let r=0, g=0, b=0, a=0, r0=0, g0=0, b0=0;
    for(let j=0;j<k;j++) for(let i=0;i<k;i++){ const q=((y*k+j)*S+(x*k+i))*4, w=px[q+3]; r+=px[q]*w; g+=px[q+1]*w; b+=px[q+2]*w; a+=w; r0+=px[q]; g0+=px[q+1]; b0+=px[q+2]; }
    const p=(y*d+x)*4, n=k*k; if(a>0){ o[p]=Math.round(r/a); o[p+1]=Math.round(g/a); o[p+2]=Math.round(b/a); } else { o[p]=Math.round(r0/n); o[p+1]=Math.round(g0/n); o[p+2]=Math.round(b0/n); } o[p+3]=Math.round(a/n); }
  return o; }
export function check(){
  const d=[], notes=[]; let n=0;
  for(const [f, h] of Object.entries(FOLIAGE_SOURCES)){ n++; const p=path.join(ROOT, SRC, f); if(!existsSync(p)){ d.push(`${SRC}/${f} is missing (the registered source)`); continue; } const g=sha1(p); if(g!==h) d.push(`${f}: SHA-1 ${g}, registered ${h}`); }
  const A=FOLIAGE_ATLAS, mp=path.join(ROOT, OUT_DIR, `foliage-${A.size}.png`); n++;
  if(!existsSync(mp)){ d.push(`${OUT_DIR}/foliage-${A.size}.png is missing — run node tools/forest-foliage.mjs`); return { cases:n, differences:d, notes }; }
  const m=pngRead(readFileSync(mp)); if(m.w!==A.size || m.ch!==4) d.push('the master is not '+A.size+'² RGBA');
  for(const s of A.derived){ n++; const p=path.join(ROOT, OUT_DIR, `foliage-${s}.png`); if(!existsSync(p)){ d.push(`foliage-${s}.png is missing`); continue; }
    const got=pngRead(readFileSync(p)), want=sheetDown(m.px, A.size, s); let diff=0; for(let i=0;i<want.length;i++) if(got.px[i]!==want[i]) diff++; if(got.w!==s || diff) d.push(`foliage-${s}.png is not the master boxed down (${diff} bytes differ) — run node tools/forest-foliage.mjs`); }
  /* every cell carries leaves: its opaque share (alpha ≥ 128) */
  for(const [k, [x, y, w, h]] of Object.entries(A.cells)){ n++; let on=0; for(let j=y;j<y+h;j+=4) for(let i=x;i<x+w;i+=4) if(m.px[(j*A.size+i)*4+3]>=128) on++; const share=on/((w/4)*(h/4)); notes.push(`${k} ${(share*100).toFixed(1)} % opaque`); if(!(share>0.04 && share<0.85)) d.push(`cell ${k}: ${(share*100).toFixed(1)} % opaque (a card with almost nothing or a filled square)`); }
  for(const f of ['rock-col-512.jpg', 'rock-nor-512.jpg']){ n++; if(!existsSync(path.join(ROOT, OUT_DIR, f))) d.push(`${OUT_DIR}/${f} is missing`); }
  return { cases:n, differences:d, notes }; }

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv.includes('--check')){ const r=check(); for(const x of r.differences) console.error('[forest-foliage] '+x); console.log(r.notes.join(' · '));
    console.log(r.differences.length ? `[forest-foliage] STALE — ${r.differences.length} in ${r.cases}` : `[forest-foliage] current — ${r.cases} cases`); process.exit(r.differences.length ? 1 : 0); }
  for(const [f, h] of Object.entries(FOLIAGE_SOURCES)) if(sha1(path.join(ROOT, SRC, f))!==h) throw new Error(f+': not the registered source');
  const { chromium }=await import('playwright-core'), browser=await chromium.launch({ channel:'chrome', headless:true }), page=await browser.newPage();
  const b64=f=>'data:image/jpeg;base64,'+readFileSync(path.join(ROOT, SRC, f)).toString('base64');
  const imgs=Object.fromEntries(Object.keys(FOLIAGE_SOURCES).map(f=>[f.replace(/\.jpg$/, ''), b64(f)]));
  /* the composition, in the page: a colour canvas and an alpha canvas, the same transforms (both opaque — exact read-back) */
  const res=await page.evaluate(async ({ imgs, A, CROPS, LEAVES })=>{
    const load=u=>new Promise((ok, no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=no; i.src=u; }), I={}; for(const k in imgs) I[k]=await load(imgs[k]);
    const S=A.size, mk=()=>{ const c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,S,S); g.imageSmoothingQuality='high'; return [c, g]; };
    const [cc, cg]=mk(), [ac, ag]=mk();
    /* a crop drawn into the box (x, y, w, h) of the sheet: fitted, its base at the box's bottom middle, turned by rot about the base, tint (colour only), keep (a polygon) */
    const put=(src, sx, sy, sw, sh, x, y, w, h, rot=0, scale=1, tint=null, keep=null)=>{ const k=Math.min(w/sw, h/sh)*scale, dw=sw*k, dh=sh*k, bx=x+w/2, by=y+h;
      for(const [g, im] of [[cg, I[src+'_diff_2k']], [ag, I[src+'_alpha_2k']]]){ g.save(); g.beginPath(); if(keep){ keep.forEach(([u,v],i)=>g[i ? 'lineTo' : 'moveTo'](x+u*w, y+v*h)); g.closePath(); } else g.rect(x, y, w, h); g.clip(); g.translate(bx, by); g.rotate(rot);
        if(g===cg && tint) g.filter=tint; g.globalCompositeOperation= g===ag ? 'lighten' : 'source-over'; g.drawImage(im, sx, sy, sw, sh, -dw/2, -dh, dw, dh); g.restore(); } };
    /* one leaf (LEAVES[i]) with its base at (x, y), its blade along the angle a (radians, 0 = right, screen y down), len px long; clipped to the blade's ellipse */
    let CELL=null;   // the cell being drawn: leaves and stems keep inside it
    const leaf=(i, x, y, a, len, tint=null)=>{ const [sx, sy, sw, sh]=LEAVES[i], k=len/sw;
      for(const [g, im] of [[cg, I['tree_small_02_leaves_diff_2k']], [ag, I['tree_small_02_leaves_alpha_2k']]]){ g.save(); if(CELL){ g.beginPath(); g.rect(...CELL); g.clip(); } g.translate(x, y); g.rotate(a); g.scale(-k, k);   // the source's blade points left from its stalk
        g.beginPath(); g.ellipse(sw*0.5, 0, sw*0.5, sh*0.42, 0, 0, 6.2832); g.clip(); if(g===cg && tint) g.filter=tint; g.globalCompositeOperation= g===ag ? 'lighten' : 'source-over';
        g.drawImage(im, sx, sy, sw, sh, 0, -sh/2, sw, sh); g.restore(); } };
    /* a stem: a quadratic curve, width w0 → w1, its colour and full alpha */
    const stem=(pts, w0, w1, col)=>{ for(const g of [cg, ag]){ g.save(); if(CELL){ g.beginPath(); g.rect(...CELL); g.clip(); } g.strokeStyle= g===ag ? '#fff' : col; g.lineCap='round'; const n=24; let [px, py]=pts[0];
      for(let i=1;i<=n;i++){ const t=i/n, u=1-t, x=u*u*pts[0][0]+2*u*t*pts[1][0]+t*t*pts[2][0], y=u*u*pts[0][1]+2*u*t*pts[1][1]+t*t*pts[2][1]; g.lineWidth=w0+(w1-w0)*t; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); px=x; py=y; } g.restore(); } };
    const at=(pts, t)=>{ const u=1-t; return [u*u*pts[0][0]+2*u*t*pts[1][0]+t*t*pts[2][0], u*u*pts[0][1]+2*u*t*pts[1][1]+t*t*pts[2][1]]; };
    const C=A.cells;
    for(const k of ['spruceA','spruceB','fernA','fernB']){ const [s, sx, sy, sw, sh, keep]=CROPS[k], [x, y, w, h]=C[k]; put(s, sx, sy, sw, sh, x, y, w, h, 0, 1, null, keep); }
    /* the broadleaf twig (512 × 1024): a slightly bent stem, nine alternate leaves rising from it, smaller towards the tip, one leaf at the tip */
    { const [x, y, w, h]=C.twig; CELL=C.twig; const P=[[x+w*0.5, y+h-4], [x+w*0.43, y+h*0.5], [x+w*0.53, y+h*0.08]];
      stem(P, 9, 3, '#5e5a33');
      for(let j=0;j<9;j++){ const t=0.16+j*0.088, [px, py]=at(P, t), side= j%2 ? 1 : -1, len=(178-j*9)*(0.92+0.16*((j*7)%3)/2), a=-Math.PI/2+side*(1.05-0.04*j);
        stem([[px, py], [px+Math.cos(a)*10, py+Math.sin(a)*10], [px+Math.cos(a)*18, py+Math.sin(a)*18]], 3, 2, '#5e5a33'); leaf(j%8, px+Math.cos(a)*16, py+Math.sin(a)*16, a, len); }
      const [tx, ty]=at(P, 1); leaf(5, tx, ty+8, -Math.PI/2-0.05, 130); }
    /* the rosette (512²): three short shoots fanning up from the base, four or five leaves on each */
    { const [x, y, w, h]=C.rosette; CELL=C.rosette; let q=0;
      for(const [da, L] of [[-0.75, 0.62], [0, 0.78], [0.75, 0.6]]){ const a0=-Math.PI/2+da, P=[[x+w*0.5, y+h-6], [x+w*0.5+Math.cos(a0)*h*L*0.45, y+h-6+Math.sin(a0)*h*L*0.5], [x+w*0.5+Math.cos(a0)*h*L*0.8, y+h-6+Math.sin(a0)*h*L*0.85]];
        stem(P, 5, 2, '#5e5a33');
        for(let j=0;j<5;j++){ const t=0.35+j*0.16, [px, py]=at(P, Math.min(1, t)), side= (j+q)%2 ? 1 : -1, a=a0+side*(0.85-0.08*j)+(j===4 ? -side*0.85 : 0); leaf((q+j)%8, px, py, a, 120-j*8); }
        q+=3; } CELL=null; }
    /* the dead twig: the first spruce twig in dry brown-grey (the needles of a shaded-out lower branch) */
    { const [s, sx, sy, sw, sh]=CROPS.spruceA, [x, y, w, h]=C.dead; put(s, sx, sy, sw, sh, x, y, w, h, 0, 1, 'saturate(0.25) sepia(0.7) brightness(0.72) contrast(1.1)'); }
    const cd=cg.getImageData(0,0,S,S).data, ad=ag.getImageData(0,0,S,S).data, out=new Uint8Array(S*S*4);
    for(let i=0;i<S*S;i++){ out[i*4]=cd[i*4]; out[i*4+1]=cd[i*4+1]; out[i*4+2]=cd[i*4+2]; out[i*4+3]=ad[i*4]; }
    /* the rock detail: 512² colour and normal, JPEG */
    const rk=n=>{ const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(I[n], 0, 0, 512, 512); return c.toDataURL('image/jpeg', 0.86).split(',')[1]; };
    let bin=''; for(let i=0;i<out.length;i+=32768) bin+=String.fromCharCode.apply(null, out.subarray(i, i+32768));
    return { px:btoa(bin), col:rk('lichen_rock_diff_1k'), nor:rk('lichen_rock_nor_gl_1k') };
  }, { imgs, A:FOLIAGE_ATLAS, CROPS, LEAVES });
  await browser.close();
  const S=FOLIAGE_ATLAS.size, px=new Uint8Array(Buffer.from(res.px, 'base64'));
  /* the colour under transparent pixels: the nearest opaque colour, spread outward (no dark or green fringes when filtered) */
  { const has=new Uint8Array(S*S); for(let i=0;i<S*S;i++) has[i]= px[i*4+3]>=96 ? 1 : 0;
    for(let pass=0;pass<24;pass++){ const nh=has.slice(); let any=0;
      for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x; if(has[i]) continue; let n=0, r=0, g=0, b=0;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx=x+dx, yy=y+dy; if(xx<0||yy<0||xx>=S||yy>=S) continue; const j=yy*S+xx; if(has[j]){ n++; r+=px[j*4]; g+=px[j*4+1]; b+=px[j*4+2]; } }
        if(n){ px[i*4]=r/n; px[i*4+1]=g/n; px[i*4+2]=b/n; nh[i]=1; any++; } }
      has.set(nh); if(!any) break; } }
  const dir=path.join(ROOT, OUT_DIR); mkdirSync(dir, { recursive:true });
  const put=(name, w, p)=>{ const b=pngOf({ name, w, h:w, ch:4, px:p }); writeFileSync(path.join(dir, name), b); console.log(`[forest-foliage] ${OUT_DIR}/${name} ${(b.length/1024).toFixed(1)} KB`); };
  put(`foliage-${S}.png`, S, px); for(const d of FOLIAGE_ATLAS.derived) put(`foliage-${d}.png`, d, sheetDown(px, S, d));
  for(const [n, b] of [['rock-col-512.jpg', res.col], ['rock-nor-512.jpg', res.nor]]){ const buf=Buffer.from(b, 'base64'); writeFileSync(path.join(dir, n), buf); console.log(`[forest-foliage] ${OUT_DIR}/${n} ${(buf.length/1024).toFixed(1)} KB`); }
  const r=check(); console.log(r.notes.join(' · ')); console.log(r.differences.length ? '[forest-foliage] PROBLEMS: '+r.differences.join('; ') : '[forest-foliage] done, check passes');
}
