/* SPEED-1 step 7 (dev; its own server and one headless Chrome): THE FOREST'S PLACES FILES. Builds the forest at Standard ('reduced', Light shares
   it) and Detailed ('full') in the Night page with the places memo recording (no file read, nothing remembered before), and writes each level's
   record to apps/night/rooms/forest/places/<level>.json (forest-memo.js: the world's hash, each search's answers in call order with their plain
   arguments). Run it after any change to the forest's level tables, parts or place searches — the row «FOREST places remembered» says when a
   file is stale. `--check`: writes nothing, exits 1 when a file differs from a fresh record. Ends in a verdict line. */
import http from 'node:http'; import { readFile, writeFile, mkdir } from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), CHECK=process.argv.includes('--check'), OUT=path.join(ROOT, 'apps/night/rooms/forest/places');
const LEVELS=['reduced', 'full'], LIMIT_MS=10*60e3;
const MIME={ '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wasm':'application/wasm', '.task':'application/octet-stream', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.bin':'application/octet-stream', '.ogg':'audio/ogg' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; } const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }
  catch(e){ r.writeHead(404); r.end(); } }); s.listen(0, '127.0.0.1', ()=>res(s)); });
const ORIGIN=`http://127.0.0.1:${srv.address().port}`;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const timer=setTimeout(()=>{ console.log('[forest-places] NOT A PASS — over the time limit'); process.exit(1); }, LIMIT_MS);
let bad=0;
try{
  const p=await browser.newPage({ viewport:{ width:1280, height:800 } });
  await p.goto(`${ORIGIN}/apps/night/index.html?probe`, { timeout:60e3 });
  await p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  for(const level of LEVELS){
    const t0=Date.now();
    const J=await p.evaluate(async level=>{
      const H=await import('/apps/night/scene/host.js'), F=await import('/apps/night/rooms/forest/forest.js'), M=await import('/apps/night/rooms/forest/forest-memo.js'), { cv }=await import('/core/palette.js');
      const was=M.forestMemoDbg(); M.forestMemoDbg({ off:false, files:false, clear:true });
      try{ const T=await H.loadThree(); await F.forestAssets(level); const r=F.buildForest(T, { C:cv, level, w:1280, h:800, gl2:true }), st=r.memoDbg(); r.dispose();
        if(st.replay) return { error:'the build replayed (nothing recorded)' };
        return { file:M.memoExport(st.key), calls:st.calls }; }
      finally{ M.forestMemoDbg({ off:was.off, files:was.files, clear:true }); } }, level);
    if(!J || J.error || !J.file){ console.log(`[forest-places] ${level}: ${J && J.error || 'no record'}`); bad++; continue; }
    const text=JSON.stringify(J.file)+'\n', f=path.join(OUT, level+'.json'), n=Object.values(J.calls).reduce((a, b)=>a+b, 0);
    if(CHECK){ let old=''; try{ old=await readFile(f, 'utf8'); }catch(e){}
      const same=old===text; if(!same) bad++; console.log(`[forest-places] ${level}: ${same ? 'current' : 'STALE'} (${n} searches, world ${J.file.key}, ${Math.round(text.length/1024)} KB, ${((Date.now()-t0)/1000).toFixed(1)} s)`); }
    else { await mkdir(OUT, { recursive:true }); await writeFile(f, text); console.log(`[forest-places] ${level}: wrote ${path.relative(ROOT, f)} — ${n} searches (${Object.entries(J.calls).map(([k, v])=>k+' '+v).join(', ')}), world ${J.file.key}, ${Math.round(text.length/1024)} KB, ${((Date.now()-t0)/1000).toFixed(1)} s`); }
  }
} finally { clearTimeout(timer); await browser.close(); srv.close(); }
console.log(bad ? `[forest-places] NOT A PASS — ${bad} level(s) ${CHECK ? 'stale or' : ''} not recorded` : `[forest-places] PASS — ${LEVELS.length} level(s) ${CHECK ? 'current' : 'written'}`);
process.exit(bad ? 1 : 0);
