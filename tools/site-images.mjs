/* SITE-1 — THE SITE'S PICTURES (dev tool; never runs on the site). Writes into apps/site/img/:
     forest  the night forest through the room's camera AT REST (the still's lens, as tools/night-still.mjs; silhouettes and vignette off,
             NOT dimmed), rendered once into tools/.site-src/forest-raw.png (git-ignored; --fresh renders again)
     night-card.webp/.jpg   portrait 9:14 crop for the Night card and page (each ≤ 150 KB)
     forest-wall.webp/.jpg  landscape crop for the Install picture (the forest on a projected wall)
     og.jpg                 1200 × 630 sharing picture: the forest + the emblem and the hand·song wordmark (the site's own Literata)
     demo-card.webp/.jpg    the live https://handsong.vercel.app start screen at phone size (portrait 9:14)
     icon-32.png, apple-touch-icon.png (180), ../favicon.ico (PNG inside), from apps/site/favicon.svg (the five-dot emblem)
   Headless Chrome (channel chrome), own static server over the repo. Register entries «site-pictures» and «site-icons» (tools/licences.json).
     node tools/site-images.mjs                 everything (the forest from the cache when present)
     node tools/site-images.mjs --only demo     one group: forest | demo | icons */
import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const ONLY=val('--only'), FRESH=argv.includes('--fresh'), want=g=>!ONLY || ONLY===g;
const OUT=path.join(ROOT,'apps/site/img'), SRC=path.join(ROOT,'tools/.site-src'), RAW=path.join(SRC,'forest-raw.png');
const CARD_BUDGET=150*1024;
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.ktx2':'application/octet-stream' };
function serve(){
  const srv=http.createServer(async (q,r)=>{ try{ const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
    const f=path.join(ROOT,p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
    const b=await readFile(f); r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }
    catch(e){ r.writeHead(404); r.end(); } });
  return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res(srv)));
}
const exists=async f=>{ try{ await stat(f); return true; }catch(e){ return false; } };
const dataBuf=u=>Buffer.from(u.split(',')[1], 'base64');
const log=s=>console.log('[site-images] '+s);

await mkdir(OUT,{ recursive:true }); await mkdir(SRC,{ recursive:true });
const srv=await serve(), port=srv.address().port, base=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding'] });

/* the forest frame, as tools/night-still.mjs takes it (the same camera and lens), at full light */
async function renderForest(){
  const ST=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM.still;
  const H=1400, VH=Math.round(H/0.99)+1, VW=Math.round(VH*ST.aspect);
  const ctx=await browser.newContext({ viewport:{ width:VW, height:VH }, deviceScaleFactor:1, locale:'en-US' });
  await ctx.grantPermissions(['camera','microphone'], { origin:base });
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.nightBg','forest'); localStorage.setItem('handsong.sceneLevel','full'); localStorage.setItem('handsong.night.lang','en'); }catch(e){} });
  const p=await ctx.newPage();
  await p.goto(`${base}/apps/night/index.html?probe`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  await p.click('#nightBegin');
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
  await p.evaluate(async ()=>{ const S=await import('/apps/night/scene/host.js'), G=await import('/core/gestures.js');
    G.handsProbe(null); S.sceneClockDbg(60); for(let i=0;i<200 && (S.sceneInfo().opening || !S.sceneInfo().rendered);i++) await new Promise(r=>setTimeout(r, 100)); });
  await p.evaluate(async ([fov, H0])=>{ const S=await import('/apps/night/scene/host.js'), room=S.sceneRoomDbg();
    S.sceneOptDbg({ scale:H0/innerHeight }); S.sceneGuardDbg({ reset:true });
    room.viewDbg({ rest:true, fov }); for(const m of room.detailDbg.sils) m.visible=false; room.paintDbg.set({ uVig:0 }); }, [ST.fov, H]);
  await p.waitForTimeout(6000);   // the mist and the fireflies settled
  const url=await p.evaluate(async ()=>(await import('/apps/night/scene/host.js')).sceneShotDbg());
  if(!url) throw new Error('the room gave no frame (sceneShotDbg)');
  await writeFile(RAW, dataBuf(url)); await ctx.close();
  log(`forest frame rendered → ${path.relative(ROOT,RAW)} (lens ${ST.fov}°, ${VW}×${VH} viewport)`);
}

/* crops and compositions in a page that has the raw frame and the site's own fonts */
async function compose(){
  const ctx=await browser.newContext({ viewport:{ width:1200, height:800 }, deviceScaleFactor:1 });
  const p=await ctx.newPage(); await p.goto(`${base}/apps/site/404.html`);
  await p.evaluate(async ()=>{ for(const [fam,file,w] of [['Literata','literata-latin','300 400'],['Inter','inter-latin','400 600']]){   // the site's own fonts (its CSS uses root paths)
    const f=new FontFace(fam, `url(/apps/site/fonts/${file}.woff2)`, { weight:w }); await f.load(); document.fonts.add(f); } });
  const res=await p.evaluate(async ([BUDGET])=>{
    const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='/tools/.site-src/forest-raw.png'; });
    const W0=img.width, H0=img.height, size=u=>Math.floor((u.length-u.indexOf(',')-1)*3/4);
    /* draw a crop (cx = centre as a share of the width, h = share of the height) into w × h, with a lift of the light and an even glow */
    const crop=(w,h,cx,cy,hs,lift)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
      const sh=H0*hs, sw=sh*w/h, sx=Math.max(0,Math.min(W0-sw, W0*cx-sw/2)), sy=Math.max(0,Math.min(H0-sh, H0*cy-sh/2));
      g.filter=`brightness(${lift}) contrast(1.04) saturate(1.08)`; g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); g.filter='none'; return { c, g }; };
    const enc=(c,type,budget)=>{ for(let q=0.9;q>0.3;q-=0.04){ const u=c.toDataURL(type, q); if(size(u)<=budget) return { u, q:+q.toFixed(2), n:size(u) }; } return null; };
    const out={};
    { const { c }=crop(740, 1151, 0.43, 0.5, 1, 1.5); out.card={ webp:enc(c,'image/webp',BUDGET), jpg:enc(c,'image/jpeg',BUDGET) }; }
    { const { c }=crop(720, 405, 0.45, 0.55, 0.78, 1.45); out.wall={ webp:enc(c,'image/webp',60*1024), jpg:enc(c,'image/jpeg',70*1024) }; }
    { const { c, g }=crop(1200, 630, 0.47, 0.55, 0.9, 1.35);
      const gr=g.createLinearGradient(0,0,0,630); gr.addColorStop(0,'rgba(8,10,12,0.55)'); gr.addColorStop(0.55,'rgba(8,10,12,0.15)'); gr.addColorStop(1,'rgba(8,10,12,0.55)'); g.fillStyle=gr; g.fillRect(0,0,1200,630);
      // the emblem: five notes in an arc, the centre one glowing
      const dots=[[-34,0,7,'#8a8f98'],[-17,-11,7,'#8a8f98'],[0,-19,10,'#ffffff'],[17,-11,7,'#8a8f98'],[34,0,7,'#8a8f98']], ox=600, oy=258;
      for(const [x,y,r,col] of dots){ if(col==='#ffffff'){ g.shadowColor='rgba(255,255,255,0.85)'; g.shadowBlur=26; } else g.shadowBlur=0; g.fillStyle=col; g.beginPath(); g.arc(ox+x*1.6, oy+y*1.6, r*0.8, 0, 7); g.fill(); }
      g.shadowBlur=18; g.shadowColor='rgba(0,0,0,0.6)'; g.fillStyle='#f3f4f6'; g.textAlign='center'; g.textBaseline='alphabetic';
      g.font='300 104px Literata'; g.letterSpacing='4px'; g.fillText('hand·song', 600, 380);
      g.font='400 30px Inter'; g.letterSpacing='0.5px'; g.fillStyle='#d6d8dc'; g.fillText('Music with your hands in the air', 600, 440);
      out.og={ jpg:enc(c,'image/jpeg',300*1024) }; }
    return out; }, [CARD_BUDGET]);
  const put=async (name,e)=>{ if(!e) throw new Error(`${name}: no encoding under its budget`); await writeFile(path.join(OUT,name), dataBuf(e.u)); log(`${name}: quality ${e.q}, ${e.n} bytes`); };
  await put('night-card.webp',res.card.webp); await put('night-card.jpg',res.card.jpg);
  await put('forest-wall.webp',res.wall.webp); await put('forest-wall.jpg',res.wall.jpg);
  await put('og.jpg',res.og.jpg);
  await ctx.close();
}

/* the live tech demo's start screen (the old public Full), phone portrait */
async function demo(){
  const ctx=await browser.newContext({ viewport:{ width:390, height:607 }, deviceScaleFactor:2, locale:'en-US', isMobile:true, hasTouch:true });
  const p=await ctx.newPage(); await p.goto('https://handsong.vercel.app/', { waitUntil:'networkidle', timeout:90e3 }); await p.waitForTimeout(2500);
  const png=await p.screenshot({ type:'png' }); await writeFile(path.join(SRC,'demo-raw.png'), png); await ctx.close();
  const c2=await browser.newContext({ viewport:{ width:800, height:800 } }), q=await c2.newPage(); await q.goto(`${base}/apps/site/404.html`);
  const r=await q.evaluate(async ([BUDGET])=>{ const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='/tools/.site-src/demo-raw.png'; });
    const c=document.createElement('canvas'); c.width=740; c.height=1151; c.getContext('2d').drawImage(img,0,0,img.width,img.height,0,0,740,1151);
    const size=u=>Math.floor((u.length-u.indexOf(',')-1)*3/4), enc=t=>{ for(let q=0.9;q>0.3;q-=0.04){ const u=c.toDataURL(t,q); if(size(u)<=BUDGET) return { u, q:+q.toFixed(2), n:size(u) }; } return null; };
    return { webp:enc('image/webp'), jpg:enc('image/jpeg') }; }, [CARD_BUDGET]);
  for(const [k,e] of Object.entries(r)){ if(!e) throw new Error('demo-card: no encoding under budget'); await writeFile(path.join(OUT,'demo-card.'+k), dataBuf(e.u)); log(`demo-card.${k}: quality ${e.q}, ${e.n} bytes`); }
  await c2.close();
}

/* the favicons from the emblem's SVG: PNG 32, the apple touch icon 180, and favicon.ico holding the 32 px PNG */
async function icons(){
  const ctx=await browser.newContext({ viewport:{ width:400, height:400 } }), p=await ctx.newPage(); await p.goto(`${base}/apps/site/404.html`);
  const r=await p.evaluate(async ()=>{ const img=await new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='/apps/site/favicon.svg'; });   // same origin (the page's CSP allows only 'self')
    const at=(n,pad)=>{ const c=document.createElement('canvas'); c.width=c.height=n; const g=c.getContext('2d'); if(pad){ g.fillStyle='#0f1012'; g.fillRect(0,0,n,n); } g.drawImage(img,pad,pad,n-2*pad,n-2*pad); return c.toDataURL('image/png'); };
    return { p32:at(32,0), p180:at(180,14) }; });
  const p32=dataBuf(r.p32); await writeFile(path.join(OUT,'icon-32.png'), p32); await writeFile(path.join(OUT,'apple-touch-icon.png'), dataBuf(r.p180));
  const head=Buffer.alloc(22); head.writeUInt16LE(0,0); head.writeUInt16LE(1,2); head.writeUInt16LE(1,4);   // ICONDIR, one image
  head.writeUInt8(32,6); head.writeUInt8(32,7); head.writeUInt8(0,8); head.writeUInt8(0,9); head.writeUInt16LE(1,10); head.writeUInt16LE(32,12); head.writeUInt32LE(p32.length,14); head.writeUInt32LE(22,18);
  await writeFile(path.join(ROOT,'apps/site/favicon.ico'), Buffer.concat([head,p32]));
  log(`icons: icon-32.png ${p32.length} bytes, apple-touch-icon.png, favicon.ico`); await ctx.close();
}

try{
  if(want('forest')){ if(FRESH || !(await exists(RAW))) await renderForest(); else log('forest frame from the cache (--fresh renders again)'); await compose(); }
  if(want('demo')) await demo();
  if(want('icons')) await icons();
} finally { await browser.close().catch(()=>{}); srv.close(); }
