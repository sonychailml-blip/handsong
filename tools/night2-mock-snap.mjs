/* NIGHT-2 stage 1: the calibration design's pictures, dev only: every screen of docs/night/design/NIGHT-2-calibration/mock.html at desktop and phone sizes into tools/design/NIGHT-2-calibration/ (tools/ isn't shipped, and the licence register doesn't scan it). Its own static server and a fresh browser, as tools/ui-snap.mjs.
     node tools/night2-mock-snap.mjs */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), DIR='docs/night/design/NIGHT-2-calibration', OUT=path.join(ROOT,'tools/design/NIGHT-2-calibration');
const TYPES={ '.html':'text/html; charset=utf-8', '.css':'text/css', '.woff2':'font/woff2', '.js':'text/javascript' };
const SIZES=[['desktop',1280,800],['phone-portrait',393,851],['phone-landscape',851,393]];
const srv=http.createServer(async(q,r)=>{ try{ const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!f.startsWith(ROOT)) throw 0; const b=await readFile(f); r.writeHead(200,{ 'content-type':TYPES[path.extname(f)]||'application/octet-stream' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
const base=`http://127.0.0.1:${srv.address().port}/${DIR}/mock.html`, browser=await chromium.launch({ channel:'chrome', headless:true }); await mkdir(OUT,{ recursive:true });
const bad=[]; let n=0;
try{
  for(const [name,width,height] of SIZES){ const page=await (await browser.newContext({ viewport:{ width,height }, deviceScaleFactor:name==='desktop'?1:2 })).newPage(); page.on('pageerror',e=>bad.push(`${name}: ${e.message}`));
    await page.goto(base); const list=await page.evaluate(()=>window.MOCK_SCREENS);
    for(const s of list){ await page.goto(`${base}?screen=${s}`); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(80);
      /* nothing runs off the screen: every visible box inside the viewport, or its card scrolls */
      const off=await page.evaluate(()=>{ const out=[]; for(const e of document.querySelectorAll('.night-card,.cal-strip,.cal-cancel,.night-ctl,button')){ const r=e.getBoundingClientRect(); if(r.width&&(r.left<-1||r.right>innerWidth+1)) out.push(e.className||e.tagName); if(e.matches('.night-card')&&e.scrollHeight>e.clientHeight+1) out.push('scrolls:'+e.className); } return out; });
      if(off.length) bad.push(`${name}/${s}: ${off.join(', ')}`);
      await page.screenshot({ path:path.join(OUT,`${s}.${name}.png`) }); n++; } }
} finally { await browser.close(); srv.close(); }
console.log(`[mock-snap] ${n} pictures → tools/design/NIGHT-2-calibration`); for(const b of bad) console.log('[mock-snap] note: '+b);
