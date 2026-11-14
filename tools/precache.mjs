/* NIGHT-14 — THE PRECACHE LIST of a built Night tree, written into its sw.js (the line `const PRECACHE=null;`). Used by tools/build.mjs (every Night
   build: preview and players') and by tools/smoke-paths.mjs (its update row re-hashes a changed copy of a built tree). Node builtins only.
   What is listed: every file the build's walk reached by a literal address from the page (`seen`: modules, worklets, the worker, styles and what
   they name, the room files), the page and its page-level files (manifest, icons), core/data/ (fetched by computed names) and MediaPipe's files
   (core/vendor/mediapipe/: group 'simd' / 'nosimd' for the two builds of its binary, so a browser caches only the pair it runs). Never listed: tools/
   (a preview's probes), the development rooms (apps/night/rooms/rain/), sw.js itself, docs, licence texts. Each entry: [path, SHA-256, bytes,
   group]; the version is a hash of the whole list, so any changed byte gives a new version. */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const PRECACHE_MARK='const PRECACHE=null;';
export const NEVER=[/^tools\//, /^apps\/night\/rooms\/rain\//, /^sw\.js$/, /\.md$/i, /(^|\/)LICENSE$/, /^THIRD-PARTY-LICENSES/];
/* files a build carries that no player's start fetches, so not precached (fetched from the network if ever asked): the forest's BAKED floor (ground,
   groundn — every level draws the scanned one, FOREST_LEVELS groundScan) and the scan's 2048 copies (no level's FOREST_TEX set names them); both are
   kept for the captures' comparisons. Data row «NIGHT precache list (app)» proves no level's file is skipped and every skipped file is one no level fetches. */
export const NIGHT_SKIP=Object.freeze([/^apps\/night\/rooms\/forest\/tex\/groundn?-\d+\.png$/, /^apps\/night\/rooms\/forest\/scan\/litter-(col|nor)-2048\.jpg$/]);
const listAll=d=>readdirSync(d,{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? listAll(path.join(d,e.name)) : [path.join(d,e.name)]);
const rel=(OUT,f)=>path.relative(OUT,f).replace(/\\/g,'/');
export const groupOf=p=>/^core\/vendor\/mediapipe\/[^/]+\/wasm\/vision_wasm_nosimd_internal\./.test(p) ? 'nosimd' : /^core\/vendor\/mediapipe\/[^/]+\/wasm\/vision_wasm_internal\./.test(p) ? 'simd' : '';
/* the paths to list: seen ∪ page-level ∪ core/data ∪ MediaPipe, existing files only, minus NEVER and the app's skip list */
export function precachePaths(OUT, seen, skip=[]){
  const isFile=p=>existsSync(path.join(OUT,p)) && statSync(path.join(OUT,p)).isFile(), out=new Set();
  for(const p of seen) if(isFile(p)) out.add(p);
  for(const p of ['index.html','manifest.json']) if(isFile(p)) out.add(p);
  for(const d of ['icons','core/data','core/vendor/mediapipe']) if(existsSync(path.join(OUT,d))) for(const f of listAll(path.join(OUT,d))) out.add(rel(OUT,f));
  return [...out].filter(p=>!NEVER.some(r=>r.test(p)) && !skip.some(r=>r.test(p))).sort();
}
/* hash every listed file and write the list into OUT/sw.js → { version, n, bytes, simdBytes } */
export function writePrecache(OUT, paths){
  const sw=path.join(OUT,'sw.js'), src=readFileSync(sw,'utf8');
  const files=paths.map(p=>{ const b=readFileSync(path.join(OUT,p)); return [p, createHash('sha256').update(b).digest('hex'), b.length, groupOf(p)]; });
  const version=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,16);
  const re=/^const PRECACHE=(null|\{.*\});[^\r\n]*/m;
  if((src.match(new RegExp(re.source,'gm'))||[]).length!==1) throw new Error('sw.js has no single PRECACHE line to fill');
  writeFileSync(sw, src.replace(re, ()=>`const PRECACHE=${JSON.stringify({ version, files })};   // written by tools/precache.mjs (NIGHT-14)`));
  return { version, n:files.length, bytes:files.reduce((s,f)=>s+f[2],0), simdBytes:files.filter(f=>f[3]!=='nosimd').reduce((s,f)=>s+f[2],0) };   // simdBytes: what a browser with WebAssembly SIMD caches
}
/* the list a built sw.js carries (null when none) */
export function readPrecache(OUT){
  const m=/^const PRECACHE=(\{.*\});/m.exec(readFileSync(path.join(OUT,'sw.js'),'utf8')); return m ? JSON.parse(m[1]) : null;
}
/* re-hash the listed files of a built tree after a change (the smoke test's update row) */
export function rehashPrecache(OUT){ const P=readPrecache(OUT); if(!P) throw new Error('no list in '+OUT); return writePrecache(OUT, P.files.map(f=>f[0])); }
