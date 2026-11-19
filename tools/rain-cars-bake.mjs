/* RAIN-8 (3a) — THE BAKED CARS' TOOL (dev only; never runs in the app). Its own server and a fresh headless Chrome open tools/design/rain/cars/bake.html,
   which models five car types by code (cars.js) and renders each at every angle the street needs (apps/night/rooms/rain/pure/carsprites.js) with
   three.js r128 (MIT, the vendored copy) under night street light, 3× supersampled. No network beyond its own server.
     node tools/rain-cars-bake.mjs    → apps/night/rooms/rain/cars/cars.webp (the atlas the room reads), tools/design/rain/cars/cars.png (the same,
                                         lossless, for a look) and tools/design/rain/cars/cars.json (times, sizes, each cell's coverage and box) */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ const p=decodeURIComponent(new URL(q.url, 'http://x').pathname), f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } }); s.listen(0, '127.0.0.1', ()=>res(s)); });
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try{ const p=await browser.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().split('\n')[0]); });
  await p.goto(`http://127.0.0.1:${srv.address().port}/tools/design/rain/cars/bake.html`); await p.waitForFunction(()=>window.__ready, null, { timeout:60e3 });
  const R=await p.evaluate(()=>window.__bake()); if(errs.length) console.log('[rain-cars-bake] page errors:', errs.slice(0, 5));
  const out=path.join(ROOT, 'apps/night/rooms/rain/cars'); await mkdir(out, { recursive:true }); const w=Buffer.from(R.webp, 'base64'); await writeFile(path.join(out, 'cars.webp'), w);
  await writeFile(path.join(ROOT, 'tools/design/rain/cars/cars.png'), Buffer.from(R.png, 'base64'));
  const thin=R.stats.filter(s=>s.cover<0.08 || (s.box[0]>16 && s.box[2]<111) || (s.box[1]>20 && s.box[3]<107));   // a body far smaller than its frame on both sides of an axis: the frame law and the model disagree
  await writeFile(path.join(ROOT, 'tools/design/rain/cars/cars.json'), JSON.stringify({ ms:R.ms, cells:R.cells, bytes:w.length, thin:thin.length, stats:R.stats }, null, 1));
  console.log(`[rain-cars-bake] ${R.cells} cells in ${(R.ms/1000).toFixed(1)} s → cars.webp ${(w.length/1024).toFixed(0)} KB; cells not filling their frame: ${thin.length}${thin.length ? ' (e.g. '+JSON.stringify(thin.slice(0, 3))+')' : ''}`);
} finally { await browser.close(); srv.close(); }
