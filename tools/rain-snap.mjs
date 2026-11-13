/* RAIN-0 — THE RAIN ROOM'S CAPTURES AND COST (dev tool; never runs in the app). Its own server and a fresh headless Chrome (a fake camera),
   Night with «?probe&room=rain» (the development door), Begin, the room's picture, two synthetic hands through the real gesture path.
     node tools/rain-snap.mjs                 captures → tools/.ui-snap/rain0/ + index.html (Russian captions): a phone upright and a laptop,
                                              Standard — the focus near, the focus far, after a short phrase played far, a note wiped near
     node tools/rain-snap.mjs --level full    the same at Detailed (files named …-full)
     node tools/rain-snap.mjs --cost          no captures: per level, the room against Dark (hand detections a second, the forest budget's
                                              method), its frame time, draws, programs, texture memory and opening time, printed as JSON */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const LEVEL=val('--level')==='full' ? 'full' : 'reduced', COST=argv.includes('--cost'), FOREST=argv.includes('--forest'), OUT=path.join(ROOT, 'tools/.ui-snap/rain0'), SUF=LEVEL==='full' ? '-full' : '';
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
/* a page with the rain room open at `level`: Begin tapped, the cards closed, the music held off */
async function open(vp, level, dpr=1){
  const ctx=await browser.newContext({ viewport:vp, deviceScaleFactor:dpr, locale:'en-US' });
  await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', l); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} }, level);
  const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('response', r=>{ if(r.status()===404) errs.push('404 '+new URL(r.url()).pathname); });
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe${FOREST ? '' : '&room=rain'}`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  await p.click('#nightBegin');
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
  await p.evaluate(async want=>{ window.__H=await import('/apps/night/scene/host.js'); window.__G=await import('/core/gestures.js'); window.__PO=await import('/core/gestures/pose.js'); window.__V=await import('/core/vision.js');
    window.__want=want; const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const SH=await import('/apps/night/shell.js'); SH.nightMusicHoldDbg(true); }, FOREST ? 'forest' : 'rain');
  await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && I.id.endsWith(window.__want) && !I.opening && I.rendered>2; }, null, { timeout:60e3 });
  await p.waitForTimeout(4200);   // the start still's reveal is over
  return { ctx, p, errs };
}
/* the playing hand at (x, y) of the picture with size s (large = near), pinched or open, for k frames; the effects hand stays out */
const hand=(p, x, y, s, pinch, k=6)=>p.evaluate(([x, y, s, pinch, k])=>{ const G=window.__G, V=window.__V; if(!window.__clk){ window.__clk={ t:6e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(window.__clk, ()=>true); }
  const c=window.__clk; c.W=V.canvas.width; c.H=V.canvas.height;
  for(let i=0;i<k;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x, y, s, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); } }, [x, y, s, pinch, k]);
const note=async (p, x, y, s)=>{ await hand(p, x, y, s, false, 4); await p.waitForTimeout(160); await hand(p, x, y, s, true, 4); await p.waitForTimeout(260); };
const stateOf=p=>p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), S=R && R.state ? R.state() : null, I=window.__H.sceneInfo();
  return { focus:S && +S.focus.toFixed(3), lit:S && S.litNow, picks:S && S.picks, wipes:S && S.wipes, light:S && S.light, buffer:S && S.buffer, frameMs:I.frameMs, fps:I.fps, calls:I.calls, programs:I.programs, openMs:I.openMs, texMB:+(I.texBytes/1048576).toFixed(2), level:I.level, errors:I.errors }; });
try{
  if(argv.includes('--row')){   // the browser row «RAIN room» alone (a quick look while working; the judged run is the Night suite's)
    const { ctx, p, errs }=await open({ width:1280, height:800 }, LEVEL);
    console.log(JSON.stringify(await p.evaluate(async ()=>(await import('/tools/probes/night/rainroom.js')).checkRainRoom()), null, 1), errs.slice(0, 5)); await ctx.close();
  } else if(COST){
    const out={};
    for(const lv of (FOREST ? ['reduced'] : ['reduced', 'full'])){   /* --forest: the same measurement on the forest at Standard, for comparison */ const { ctx, p, errs }=await open({ width:1536, height:730 }, lv);
      out[lv]=await p.evaluate(async ()=>{ const H=window.__H, G=window.__G, PO=window.__PO, V=window.__V, M=await import('/core/legacy-ui/latmeter.js'), wait=ms=>new Promise(r=>setTimeout(r, ms));
        const clk={ t:9e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true); let run=true; const t0=performance.now();
        (async ()=>{ while(run){ const now=performance.now()-t0; clk.t=9e6+now; const pinch=(Math.floor(now/500)%2)===0, far=(Math.floor(now/4000)%2)===0;   // a note every half second, near and far by turns
          G.processHandsProbe({ landmarks:[PO.pose({ x:0.5+0.3*Math.sin(now/2300), y:0.5+0.15*Math.sin(now/1700), s:far ? 0.12 : 0.3, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] });
          await new Promise(r=>requestAnimationFrame(r)); } })();
        const rows=[], step=async (name, rain)=>{ await H.setBackground(rain ? 'forest' : 'dark'); await wait(3000); const r0=M.latReport(), d0=r0.camera.framesDetected, s0=performance.now(); await wait(10000);
          const r=M.latReport(), I=H.sceneInfo(); rows.push({ step:name, det:+((r.camera.framesDetected-d0)/((performance.now()-s0)/1000)).toFixed(2), detMs:r.stages.detect.mean, fps:I.webgl ? I.fps : null, frameMs:I.webgl ? I.frameMs : null,
            calls:I.calls, programs:I.programs, texMB:+(I.texBytes/1048576).toFixed(2), buffer:I.guard && I.guard.buffer, openMs:I.openMs }); };
        try{ await step('dark', false); await step('rain', true); await step('dark', false); await step('rain', true); await step('dark', false); } finally { run=false; await wait(60); G.handsProbe(null); }
        const cmp=[1, 3].map(i=>{ const ref=(rows[i-1].det+rows[i+1].det)/2; return +(100*(rows[i].det/ref-1)).toFixed(1); });
        return { gpu:(M.latReport().gpu||{}).renderer||null, rows, vsDarkPercent:cmp, openings:H.sceneInfo().openings }; });
      out[lv].errors=errs.slice(0, 5); await ctx.close(); }
    console.log(JSON.stringify(out, null, 1));
  } else {
    await mkdir(OUT, { recursive:true }); const made=[], log={};
    for(const [tag, vp, dpr] of [['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1280, height:800 }, 1]]){
      const { ctx, p, errs }=await open(vp, LEVEL, dpr), shot=async (name, ru)=>{ const f=`${tag}-${name}${SUF}.png`; await p.screenshot({ path:path.join(OUT, f) }); log[f]=await stateOf(p); made.push([f, ru]); };
      await hand(p, 0.6, 0.5, 0.3, false, 8); await p.waitForTimeout(2200);
      await shot('near', 'Рука близко: фокус на стекле, капли резкие, город в мягких кругах света');
      await note(p, 0.62, 0.45, 0.3); await note(p, 0.5, 0.52, 0.3); await p.waitForTimeout(500);
      await shot('near-wiped', 'Рука близко, две ноты: запотевшее стекло протёрто там, где был свет');
      await hand(p, 0.5, 0.45, 0.12, false, 8); await p.waitForTimeout(2600);
      await shot('far', 'Рука далеко: фокус уехал в город, капли размыты, окна резкие');
      for(const [x, y] of [[0.35, 0.42], [0.5, 0.5], [0.62, 0.38], [0.7, 0.56], [0.44, 0.6]]) await note(p, x, y, 0.12);
      await p.waitForTimeout(700);
      await shot('far-phrase', 'Рука далеко, сыграна короткая фраза: ноты зажгли окна там, куда показывал свет');
      await p.evaluate(()=>window.__G.handsProbe(null)); await p.waitForTimeout(3500);
      await shot('rest', 'Рук нет: фокус медленно вернулся к стеклу; зажжённые окна остаются и гаснут медленно');
      if(errs.length) log[tag+'-errors']=errs.slice(0, 8); await ctx.close(); }
    await writeFile(path.join(OUT, `rain0${SUF}.json`), JSON.stringify(log, null, 1));
    const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RAIN-0 — комната «Дождь», основа</title>
<style>body{background:#101014;color:#e8e4dc;font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:1500px} h1{font-weight:500} figure{margin:0 0 36px} img{max-width:100%;height:auto;border-radius:8px;display:block} img.phone{max-height:80vh} figcaption{margin-top:8px;color:#c9c2b6} .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.6fr);gap:24px;align-items:start} p.note{color:#a59e92}</style>
<h1>RAIN-0 — комната «Дождь»: основа (${LEVEL==='full' ? 'Детальная' : 'Стандартная'} картинка)</h1>
<p class="note">Город здесь — условная заглушка в цветах концепции: два простых дома, линия холмов с огнями, небо. Настоящие слои (дом напротив, подоконник, бульвар, крыши, холмы, небо) и жизнь в окнах — следующие шаги плана. Слева телефон (390 × 844), справа ноутбук (1280 × 800).</p>
${['near', 'near-wiped', 'far', 'far-phrase', 'rest'].map(n=>{ const a=made.find(m=>m[0]===`phone-${n}${SUF}.png`), b=made.find(m=>m[0]===`laptop-${n}${SUF}.png`);
  return `<div class="row"><figure><img class="phone" src="${a[0]}" alt=""><figcaption>${a[1]} (телефон)</figcaption></figure><figure><img src="${b[0]}" alt=""><figcaption>${b[1]} (ноутбук)</figcaption></figure></div>`; }).join('\n')}
</html>`;
    await writeFile(path.join(OUT, `index${SUF}.html`), html);
    console.log(JSON.stringify(log, null, 1)); console.log(`[rain-snap] ${made.length} captures → ${path.relative(ROOT, OUT).replace(/\\/g, '/')}/index${SUF}.html`);
  }
} finally { await browser.close().catch(()=>{}); srv.close(); }
