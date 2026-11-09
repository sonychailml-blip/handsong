/* NIGHT-6 slice 3 — THE KTX2 / BASIS LAB (development only; nothing here ships). The user: measure GPU-compressed textures on the laptop for
   memory and opening time before deciding. Uses Basis Universal (Apache-2.0, BinomialLLC/basis_universal, the commit in tools/.ktx-lab/COMMIT),
   downloaded into the git-ignored tools/.ktx-lab/ — encoder and transcoder WebAssembly builds.
     node tools/forest-ktx-lab.mjs     encodes every prepared file of the forest (tools/forest-bake.mjs) to KTX2 twice — ETC1S at its highest
                                       quality and UASTC (zstd-supercompressed) — with mipmaps, into tools/.ktx-lab/out/; prints the sizes, the
                                       encode time and the quality: PSNR of each decoded file against the PNG's own pixels (RGBA, alpha included).
   The browser half (opening time, GPU formats): node tools/probe-browser.mjs --app night --eval tools/forest-ktx.eval.js --no-ui */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngRead, TEX_DIR } from './forest-bake.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), LAB=path.join(ROOT, 'tools/.ktx-lab'), OUT=path.join(LAB, 'out');
if(!existsSync(path.join(LAB, 'basis_encoder.wasm'))){ console.error('[ktx-lab] tools/.ktx-lab/ is empty — download the Basis Universal webgl builds first (see the plan)'); process.exit(1); }
const require=createRequire(import.meta.url);
const cjs=n=>{ const c=path.join(LAB, n+'.cjs'); if(!existsSync(c)) writeFileSync(c, readFileSync(path.join(LAB, n+'.js'))); return c; };   // tools/ is an ES-module folder: the builds load as CommonJS copies
const ENC=await require(cjs('basis_encoder'))({ wasmBinary:readFileSync(path.join(LAB, 'basis_encoder.wasm')) });
const TRN=await require(cjs('basis_transcoder'))({ wasmBinary:readFileSync(path.join(LAB, 'basis_transcoder.wasm')) });
ENC.initializeBasis(); TRN.initializeBasis();
mkdirSync(OUT, { recursive:true });
const RGBA32=13;   // transcoder_texture_format cTFRGBA32
function encode(png, mode, grey){
  const e=new ENC.BasisEncoder(); e.setCreateKTX2File(true); e.setSliceSourceImage(0, new Uint8Array(png), 0, 0, true); e.setMipGen(true); e.setPerceptual(!grey);
  if(mode==='uastc'){ e.setUASTC(true); e.setKTX2UASTCSupercompression(true); if(e.setPackUASTCFlags) e.setPackUASTCFlags(4); }   // 4: the slowest, best UASTC pack
  else { e.setUASTC(false); e.setQualityLevel(255); if(e.setCompressionLevel) e.setCompressionLevel(6); }
  const out=new Uint8Array(64<<20), t0=performance.now(), n=e.encode(out), ms=performance.now()-t0; e.delete();
  if(!n) throw new Error('encode failed: '+mode); return { buf:out.slice(0, n), ms };
}
function decodeTop(buf){ const k=new TRN.KTX2File(new Uint8Array(buf)); try{ if(!k.isValid()) throw new Error('not a KTX2'); k.startTranscoding();
  const w=k.getWidth(), h=k.getHeight(), levels=k.getLevels(), dst=new Uint8Array(k.getImageTranscodedSizeInBytes(0,0,0,RGBA32)); if(!k.transcodeImage(dst,0,0,0,RGBA32,0,-1,-1)) throw new Error('transcode failed');
  return { w, h, levels, px:dst }; } finally { k.close(); k.delete(); } }
const psnr=(a, b, ch)=>{ let e=0, n=0; for(let i=0;i<a.length/ch;i++) for(let c=0;c<ch;c++){ const x=a[i*ch+c], y= ch===1 ? b[i*4] : b[i*4+c]; e+=(x-y)**2; n++; } const m=e/n; return m ? 10*Math.log10(255*255/m) : Infinity; };
const rows=[];
for(const f of readdirSync(path.join(ROOT, TEX_DIR)).filter(f=>f.endsWith('.png')).sort()){
  const png=readFileSync(path.join(ROOT, TEX_DIR, f)), src=pngRead(png), grey=src.ch===1;
  for(const mode of ['etc1s','uastc']){ const name=f.replace('.png', `.${mode}.ktx2`), have=existsSync(path.join(OUT, name)) && !process.argv.includes('--encode'), r= have ? { buf:readFileSync(path.join(OUT, name)), ms:NaN } : encode(png, mode, grey), d=decodeTop(r.buf); if(!have) writeFileSync(path.join(OUT, name), r.buf);
    rows.push({ file:f, mode, png:png.length, ktx2:r.buf.length, levels:d.levels, psnr:+psnr(src.px, d.px, src.ch).toFixed(1), encodeS:+(r.ms/1000).toFixed(1) });
    console.log(`[ktx-lab] ${f} ${mode}: ${(r.buf.length/1024).toFixed(0)} KB (PNG ${(png.length/1024).toFixed(0)} KB), ${d.levels} levels, PSNR ${psnr(src.px, d.px, src.ch).toFixed(1)} dB, encoded in ${(r.ms/1000).toFixed(1)} s`); } }
/* the transcode, timed here (V8, as in Chrome: the transcoder's JavaScript glue uses eval, which the page's CSP refuses), its GPU blocks saved
   for the browser half to upload: BC7 (format 6) and BC3 (3) — every level, best of 3 */
for(const r of rows){ const buf=readFileSync(path.join(OUT, r.file.replace('.png', `.${r.mode}.ktx2`)));
  for(const [fmt, id] of [['bc7',6],['bc3',3]]){ let best=Infinity, lv=null;
    for(let k=0;k<3;k++){ const t0=performance.now(), K=new TRN.KTX2File(new Uint8Array(buf)); K.startTranscoding(); const L=[];
      for(let i=0;i<K.getLevels();i++){ const d=new Uint8Array(K.getImageTranscodedSizeInBytes(i,0,0,id)); K.transcodeImage(d,i,0,0,id,0,-1,-1); const ii=K.getImageLevelInfo(i,0,0); L.push({ w:ii.origWidth, h:ii.origHeight, d }); }
      K.close(); K.delete(); best=Math.min(best, performance.now()-t0); lv=L; }
    const bin=Buffer.concat(lv.map(x=>Buffer.from(x.d))); writeFileSync(path.join(OUT, r.file.replace('.png', `.${r.mode}.${fmt}.bin`)), bin);
    r[fmt]={ transcodeMs:+best.toFixed(1), gpu:bin.length, levels:lv.map(x=>[x.w, x.h, x.d.length]) }; }
  console.log(`[ktx-lab] ${r.file} ${r.mode}: transcode BC7 ${r.bc7.transcodeMs} ms (${(r.bc7.gpu/1048576).toFixed(2)} MB), BC3 ${r.bc3.transcodeMs} ms`); }
writeFileSync(path.join(OUT, 'lab.json'), JSON.stringify({ commit:readFileSync(path.join(LAB, 'COMMIT'),'utf8').trim(), rows }, null, 1));
