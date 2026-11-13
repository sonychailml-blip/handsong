/* DESIGN-1 — THE START SCREEN'S STILL (dev tool): our own render of a room, dimmed, one small WebP per picture level, written into the room's
   folder (its record names them: `still`). Headless Chrome opens Night with the room's picture at the level, Begin, the clear-moon moment
   (sceneClockDbg 60), no hands; the room's own frame (host sceneShotDbg — no interface) is drawn into a 1280 × 800 canvas, dimmed, and encoded
   as WebP at the highest quality that stays under the budget (96 KB; the data row «NIGHT start still (app)» refuses a file over 100 KB).
     node tools/night-still.mjs                      both levels of the forest
     node tools/night-still.mjs --level reduced      one level
   Register entry «night-stills» (tools/licences.json: own work). Never runs in the app. */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const LEVELS=val('--level') ? [val('--level')] : ['reduced', 'full'];
const W=1280, H=800, BUDGET=96*1024, DIM=0.62;   // the still sits behind the start card: dim (DIM × the room's own light)
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.ktx2':'application/octet-stream' };
function serve(){
  const srv=http.createServer(async (q,r)=>{ try{ const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
    const f=path.join(ROOT,p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
    const b=await readFile(f); r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }
    catch(e){ r.writeHead(404); r.end(); } });
  return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res(srv)));
}
const srv=await serve(), port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
try{
  for(const lv of LEVELS){
    const ctx=await browser.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1, locale:'en-US' });
    await ctx.grantPermissions(['camera','microphone'], { origin:`http://127.0.0.1:${port}` });
    await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.nightBg','forest'); localStorage.setItem('handsong.sceneLevel', l); localStorage.setItem('handsong.night.lang','en'); }catch(e){} }, lv);
    const p=await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe`);
    await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
    await p.click('#nightBegin');
    await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
    const rec=await p.evaluate(async lv=>{ const H=await import('/apps/night/scene/host.js'), G=await import('/core/gestures.js'), R=await import('/apps/night/rooms/index.js');
      G.handsProbe(null); H.sceneClockDbg(60); for(let i=0;i<200 && (H.sceneInfo().opening || !H.sceneInfo().rendered);i++) await new Promise(r=>setTimeout(r, 100));
      const room=R.roomById(H.sceneRoom()); return { id:room.record.id, base:room.base, file:room.record.still && room.record.still[lv], level:H.sceneLevel() }; }, lv);
    if(!rec.file) throw new Error(`the room ${rec.id} names no still for «${lv}» (its record's still)`);
    if(rec.level!==lv) throw new Error(`the room opened at «${rec.level}», wanted «${lv}»`);
    await p.waitForTimeout(5000);   // the mist and the fireflies settled
    const out=await p.evaluate(async ([W,H,BUDGET,DIM])=>{ const S=await import('/apps/night/scene/host.js'), url=await S.sceneShotDbg(); if(!url) return null;
      const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src=url; });
      const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      const k=Math.max(W/img.width, H/img.height), w=img.width*k, h=img.height*k; g.drawImage(img, (W-w)/2, (H-h)/2, w, h);   // cover
      const d=g.getImageData(0,0,W,H), a=d.data; for(let i=0;i<a.length;i+=4){ a[i]=a[i]*DIM; a[i+1]=a[i+1]*DIM; a[i+2]=a[i+2]*DIM; } g.putImageData(d,0,0);
      const size=u=>Math.floor((u.length-u.indexOf(',')-1)*3/4);
      for(let q=0.86;q>0.2;q-=0.04){ const u=c.toDataURL('image/webp', q); if(u.startsWith('data:image/webp') && size(u)<=BUDGET) return { u, q:+q.toFixed(2), src:[img.width, img.height] }; }
      return null; }, [W, H, BUDGET, DIM]);
    if(!out) throw new Error(`no WebP of the room's frame under ${BUDGET} bytes (or no frame)`);
    const file=path.join(ROOT, decodeURIComponent(new URL(rec.file, rec.base).pathname));   // the room's folder, as the page resolves it
    await mkdir(path.dirname(file), { recursive:true });
    const buf=Buffer.from(out.u.split(',')[1], 'base64'); await writeFile(file, buf);
    console.log(`[night-still] ${rec.id} ${lv}: frame ${out.src.join('×')} → ${W}×${H}, dimmed ×${DIM}, WebP quality ${out.q}, ${buf.length} bytes → ${path.relative(ROOT, file)}`);
    await ctx.close();
  }
} finally { await browser.close().catch(()=>{}); srv.close(); }
