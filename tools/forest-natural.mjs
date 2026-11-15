/* FOREST-2 — THE NEW FOREST'S CC0 DETAIL FILES (dev tool; never runs in the app). From the Poly Haven sources kept unchanged in
   tools/design/forest/cc0/ (register entry «forest-natural-sources», their SHA-1s below) it composes what ships for ?forest=new only
   (apps/night/rooms/forest/new/, register entry «forest-natural»; never in a player's start set — tools/precache.mjs NIGHT_SKIP):
     rock-col-512.jpg, rock-nor-512.jpg   the rocks' colour and normal detail (lichen_rock, as FOREST-1 made them)
     bark-1024x512.jpg                    two barks side by side (pine_bark | bark_brown_02), each 512²: R the bark's relief read from its
                                          colour (luminance, its mean moved to 0.5, its spread to a fixed width), G/B its normal's x/y
     node tools/forest-natural.mjs           compose the files
     node tools/forest-natural.mjs --check   the sources' SHA-1s are the registered ones and every file is there (exit 1 otherwise) */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC='tools/design/forest/cc0', OUT_DIR='apps/night/rooms/forest/new';
export const NATURAL_SOURCES=Object.freeze({ 'lichen_rock_diff_1k.jpg':'9646bf5e4168b70afbd5ae419f8a42dfc8880687', 'lichen_rock_nor_gl_1k.jpg':'6411cd091ed3bd38e1c5745ed8298a6d9dcb6c93',
  'pine_bark_diff_1k.jpg':'067cffd1e73ca9ae025d08724dc494efb1db2c1f', 'pine_bark_nor_gl_1k.jpg':'734efab3daa5e48457ee9396d11de1179c610a0d',
  'bark_brown_02_diff_1k.jpg':'faf104e8dc4f71875c15a9a035b0dae36454d5a5', 'bark_brown_02_nor_gl_1k.jpg':'3c233391ee5d446a7aebd6a203643d8cb4920c78' });
export const NATURAL_FILES=Object.freeze(['rock-col-512.jpg', 'rock-nor-512.jpg', 'bark-1024x512.jpg']);
const sha1=f=>createHash('sha1').update(readFileSync(f)).digest('hex');
export function naturalCheck(){ const d=[]; let n=0;
  for(const [f, h] of Object.entries(NATURAL_SOURCES)){ n++; const p=path.join(ROOT, SRC, f); if(!existsSync(p)){ d.push(`${SRC}/${f} is missing (the registered source)`); continue; } const g=sha1(p); if(g!==h) d.push(`${f}: SHA-1 ${g}, registered ${h}`); }
  for(const f of NATURAL_FILES){ n++; if(!existsSync(path.join(ROOT, OUT_DIR, f))) d.push(`${OUT_DIR}/${f} is missing`); }
  return { cases:n, differences:d }; }
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--check')){ const r=naturalCheck(); console.log(r.differences.length ? '[forest-natural] NOT A PASS — '+r.differences.join('; ') : `[forest-natural] PASS — ${r.cases} checks`); process.exit(r.differences.length ? 1 : 0); }
  for(const [f, h] of Object.entries(NATURAL_SOURCES)) if(sha1(path.join(ROOT, SRC, f))!==h) throw new Error(f+': not the registered source');
  const { chromium }=await import('playwright-core'), browser=await chromium.launch({ channel:'chrome', headless:true }), page=await browser.newPage();
  const b64=f=>'data:image/jpeg;base64,'+readFileSync(path.join(ROOT, SRC, f)).toString('base64');
  const res=await page.evaluate(async src=>{ const I={}; for(const [k, u] of Object.entries(src)){ const im=new Image(); im.src=u; await im.decode(); I[k]=im; }
    const px=(im, s)=>{ const c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(im, 0, 0, s, s); return g.getImageData(0, 0, s, s).data; };
    const jpg=(c, q)=>c.toDataURL('image/jpeg', q).split(',')[1];
    const rk=n=>{ const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(I[n], 0, 0, 512, 512); return jpg(c, 0.86); };
    /* the bark atlas: R relief (luminance standardised: mean 0.5, ± 2.2 standard deviations over 0…1), G/B the normal's x/y */
    const c=document.createElement('canvas'); c.width=1024; c.height=512; const g=c.getContext('2d'), out=g.createImageData(1024, 512);
    ['pine_bark', 'bark_brown_02'].forEach((b, k)=>{ const D=px(I[b+'_diff_1k'], 512), N=px(I[b+'_nor_gl_1k'], 512), L=new Float32Array(512*512); let m=0, v=0;
      for(let i=0;i<L.length;i++){ L[i]=0.2126*D[i*4]+0.7152*D[i*4+1]+0.0722*D[i*4+2]; m+=L[i]; } m/=L.length; for(let i=0;i<L.length;i++) v+=(L[i]-m)**2; const sd=Math.sqrt(v/L.length)||1;
      for(let y=0;y<512;y++) for(let x=0;x<512;x++){ const i=y*512+x, o=(y*1024+x+k*512)*4; out.data[o]=Math.max(0, Math.min(255, Math.round(127.5+(L[i]-m)/sd*127.5/2.2))); out.data[o+1]=N[i*4]; out.data[o+2]=N[i*4+1]; out.data[o+3]=255; } });
    g.putImageData(out, 0, 0);
    return { col:rk('lichen_rock_diff_1k'), nor:rk('lichen_rock_nor_gl_1k'), bark:jpg(c, 0.88) }; }, Object.fromEntries(Object.keys(NATURAL_SOURCES).map(f=>[f.replace('.jpg', ''), b64(f)])));
  await browser.close(); mkdirSync(path.join(ROOT, OUT_DIR), { recursive:true });
  for(const [n, b] of [['rock-col-512.jpg', res.col], ['rock-nor-512.jpg', res.nor], ['bark-1024x512.jpg', res.bark]]){ const buf=Buffer.from(b, 'base64'); writeFileSync(path.join(ROOT, OUT_DIR, n), buf); console.log(`[forest-natural] ${OUT_DIR}/${n} ${(buf.length/1024).toFixed(1)} KB`); }
}
