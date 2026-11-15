/* FOREST-2 — THE FOREST'S CAPTURES (dev tool; never runs in the app). Its own server and a fresh headless Chrome (a fake camera), Night with
   «?probe» (and «&forest=new» for the new forest), Begin, the forest's picture, the scene's clock pinned (a clear moon). No timing (FOREST-2).
     node tools/forest-snap.mjs --eval FILE [--arg JSON]   the page booted (no Begin): FILE's default export(arg) run in the page, its JSON printed
     node tools/forest-snap.mjs --pins                      the pins of today's forest → tools/prints/forest-today.json (run BEFORE FOREST-2 changes)
     node tools/forest-snap.mjs --snap                      the real app's frames (the room's own frame and the whole screen) on a phone upright
                                                            (390 × 844 at 2.75) and a laptop (1536 × 730), Standard and Detailed, today and
                                                            ?forest=new, plus close views of each improved object → tools/.ui-snap/forest2/
     node tools/forest-snap.mjs --page                      tools/.ui-snap/forest2/index.html: today | new side by side (Russian captions) */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const OUT=path.join(ROOT, 'tools/.ui-snap/forest2');
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.task':'application/octet-stream' };
const DEVICES=[['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1536, height:730 }, 1]], LEVELS=[['reduced', 'Стандартная'], ['full', 'Детальная']];
/* the switches (forest.js FOREST_PARTS), each alone, and all of them; the close views each switch is judged by */
const MODES=[['today', 'Сегодня'], ['rocks', '?forest=rocks — камни'], ['roots', '?forest=roots — корни'], ['bark', '?forest=bark — кора'], ['moss', '?forest=moss — мох и ростки'], ['stumps', '?forest=stumps — пни и сухостой'], ['clear', '?forest=clear — растения не сквозь твёрдое'], ['new', '?forest=new — всё вместе']];
const CLOSE_OF={ today:['rock', 'foot-l', 'foot-r', 'trunk', 'stump', 'snag', 'log'], rocks:['rock'], roots:['foot-l', 'foot-r'], bark:['trunk', 'snag'], moss:['foot-r', 'log'], stumps:['stump', 'snag'], clear:['rock', 'foot-l'], new:['rock', 'foot-l', 'foot-r', 'trunk', 'stump', 'snag', 'log'] };
/* close views [name, Russian caption, camera pos, look] — through the room's capture door viewDbg */
const CLOSE=[['rock', 'Камень у прохода', [0.9, 0.75, 2.2], [1.9, 0.1, -0.6]], ['foot-l', 'Комель ближнего ствола слева: корни, мох, кора', [-0.6, 0.9, 1.4], [-2.1, 0.35, -2.2]],
  ['foot-r', 'Комель ствола справа: корни, мох, кора', [1.2, 0.9, -1.0], [2.5, 0.4, -4.6]], ['trunk', 'Кора ствола на уровне глаз', [-0.4, 1.5, 0.6], [-2.1, 1.4, -2.2]],
  ['stump', 'Пень', null, null], ['snag', 'Сухостой', null, null], ['log', 'Бревно-мостик над ручьём', [0.6, 1.0, -3.6], [0.0, 0.3, -6.6]]];

async function page(){
  const fig=(f, cap, ph)=>existsSync(path.join(OUT, f)) ? `<figure><img class="${ph ? 'phone' : ''}" src="${f}" alt="" loading="lazy"><figcaption>${cap}</figcaption></figure>` : `<figure><div class="none">нет снимка ${f}</div></figure>`;
  const census=existsSync(path.join(OUT, 'census.json')) ? JSON.parse(await readFile(path.join(OUT, 'census.json'), 'utf8')) : null;
  const esc=x=>String(x).replace(/[&<>]/g, c=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]);
  let body='';
  if(census){ body+='<h2>Перепись: всё ли на месте</h2><p>Перепись снята с сегодняшнего леса (без переключателей; он совпадает с отпечатком до FOREST-2). Для каждого переключателя: потеряно (должно быть 0), сдвинуто (с именами), добавлено.</p>';
    for(const [lv, lvName] of LEVELS){ const C=census[lv]; if(!C) continue; body+=`<h3>${lvName}: сегодня ${Object.entries(C.census).map(([k, n])=>esc(k)+' '+n).join(', ')}; корней ${Object.values(C.roots).reduce((a, b)=>a+b, 0)}</h3>`;
      for(const [m, name] of MODES.slice(1)){ const V=C.variants[m]; if(!V) continue; const by={}; for(const x of V.moved){ const k=x.split(' #')[0]; (by[k]=by[k]||[]).push(x); }
        body+=`<details><summary>${esc(name)}: потеряно 0, сдвинуто ${V.moved.length}${Object.keys(V.added).length ? ', добавлено '+esc(JSON.stringify(V.added)) : ''}${V.shroomMoves.length ? ', грибов отодвинуто от новых корней '+V.shroomMoves.length : ''}</summary>`+
          Object.entries(by).map(([k, L])=>`<p><b>${esc(k)}</b> (${L.length}): ${L.slice(0, 60).map(esc).join('; ')}${L.length>60 ? ' …' : ''}</p>`).join('')+'</details>'; } } }
  body+='<h2>Кадр приложения, Стандартная: каждый переключатель отдельно против сегодня (те же точки, то же время, луна)</h2>';
  for(const [mode, name] of MODES.slice(1)) for(const [dev] of DEVICES){ const ph=dev==='phone';
    body+=`<div class="pair">${fig(`app-${dev}-reduced-today.png`, `Сегодня — ${ph ? 'телефон вертикально' : 'ноутбук'}`, ph)}${fig(`app-${dev}-reduced-${mode}.png`, `${name} — ${ph ? 'телефон вертикально' : 'ноутбук'}`, ph)}</div>`; }
  body+='<h2>Детальная: сегодня и всё вместе</h2>';
  for(const [dev] of DEVICES){ const ph=dev==='phone'; body+=`<div class="pair">${fig(`app-${dev}-full-today.png`, 'Сегодня', ph)}${fig(`app-${dev}-full-new.png`, '?forest=new', ph)}</div>`; }
  body+='<h2>Крупно (ноутбук, Стандартная, свет руки рядом): каждый переключатель — свой предмет</h2>';
  for(const [mode, name] of MODES.slice(1)) for(const [v, cap] of CLOSE) if(CLOSE_OF[mode].includes(v)) body+=`<div class="pair crop">${fig(`close-reduced-${v}-today.png`, `Сегодня — ${cap}`)}${fig(`close-reduced-${v}-${mode}.png`, `${name} — ${cap}`)}</div>`;
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FOREST-2 по переключателям</title>
<style>:root{--bg:#0d1210;--fg:#dfe8e2;--mut:#93a39a}body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}h1{font-size:20px}h2{font-size:17px;margin:28px 0 10px}h3{font-size:15px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 18px}figure{margin:0}img{width:100%;height:auto;border-radius:6px;display:block}img.phone{max-height:80vh;width:auto;max-width:100%;margin:auto}
figcaption{color:var(--mut);font-size:13px;margin-top:4px}.none{color:var(--mut);padding:30px;border:1px dashed #33433a;border-radius:6px}details{margin:6px 0}summary{cursor:pointer}details p{font-size:13px;color:var(--mut)}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style></head>
<body><h1>FOREST-2: каждый переключатель отдельно</h1><p>Адреса: <code>?forest=rocks</code>, <code>roots</code>, <code>bark</code>, <code>moss</code>, <code>stumps</code>, <code>clear</code>; можно вместе через запятую (<code>?forest=rocks,bark</code>); <code>?forest=new</code> — всё сразу. Без переключателя — сегодняшний лес, бит в бит.</p>${body}</body></html>`;
  await mkdir(OUT, { recursive:true }); await writeFile(path.join(OUT, 'index.html'), html); console.log('[forest-snap] page → tools/.ui-snap/forest2/index.html');
}
if(argv.includes('--page')){ await page(); process.exit(0); }

const { chromium }=await import('playwright-core');
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
/* a page booted (begin: Begin tapped and the forest open at `level`, the music held off, the clock pinned to a clear moon) */
async function open(vp, level, dpr=1, fresh=false, begin=true){
  const ctx=await browser.newContext({ viewport:vp, deviceScaleFactor:dpr, locale:'en-US' });
  await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', l); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} }, level);
  const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0, 300)); }); p.on('response', r=>{ if(r.status()===404) errs.push('404 '+new URL(r.url()).pathname); });
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe${fresh && fresh!=='today' ? '&forest='+fresh : ''}`);
  try{ await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 }); }catch(e){ console.log('[forest-snap] the page did not boot:', errs.slice(0, 6)); throw e; }
  if(begin){ await p.click('#nightBegin'); await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
    await p.evaluate(async ()=>{ window.__H=await import('/apps/night/scene/host.js'); window.__G=await import('/core/gestures.js'); window.__PO=await import('/core/gestures/pose.js'); window.__V=await import('/core/vision.js'); const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const SH=await import('/apps/night/shell.js'); SH.nightMusicHoldDbg(true); window.__H.sceneClockDbg(60); });
    await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return I.id && I.id.endsWith('forest') && !I.opening && I.rendered>2; }, null, { timeout:90e3 });
    await p.waitForTimeout(4500); }   // the start still's reveal is over
  return { ctx, p, errs };
}
/* the playing hand at (x, y) of the picture with size s (large = near), open, for k frames (the light follows it); the effects hand stays out */
const hand=(p, x, y, s, k=6)=>p.evaluate(([x, y, s, k])=>{ const G=window.__G, V=window.__V; if(!window.__clk){ window.__clk={ t:6e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(window.__clk, ()=>true); }
  const c=window.__clk; c.W=V.canvas.width; c.H=V.canvas.height;
  for(let i=0;i<k;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x, y, s, gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); } }, [x, y, s, k]);
const save=async (f, dataUrl)=>{ if(!dataUrl) return false; await writeFile(path.join(OUT, f), Buffer.from(dataUrl.split(',')[1], 'base64')); return true; };
try{
  if(argv.includes('--eval') || argv.includes('--pins')){
    const { ctx, p, errs }=await open({ width:1536, height:730 }, val('--level')||'reduced', 1, val('--forest')||false, argv.includes('--begin'));
    const file=argv.includes('--pins') ? 'tools/probes/night/forest2.js' : val('--eval'), arg=val('--arg') ? JSON.parse(val('--arg')) : undefined;
    const res=await p.evaluate(async ([f, a, pins])=>{ const M=await import(f); return pins ? M.dumpForestToday() : M.default(a); }, ['/'+file, arg, argv.includes('--pins')]);
    if(argv.includes('--pins')){ await mkdir(path.join(ROOT, 'tools/prints'), { recursive:true }); await writeFile(path.join(ROOT, 'tools/prints/forest-today.json'), JSON.stringify(res, null, 1)+'\n'); console.log('[forest-snap] pins → tools/prints/forest-today.json'); }
    if(val('--shot')) await p.screenshot({ path:path.join(ROOT, val('--shot')) });   // a look at the page after the eval
    console.log(JSON.stringify(res, null, 1)); if(errs.length) console.log('[forest-snap] page errors:', errs.slice(0, 8)); await ctx.close();
  }
  if(argv.includes('--snap')){ await mkdir(OUT, { recursive:true });
    for(const [lv] of LEVELS) for(const [mode] of MODES){ if(val('--lv') && val('--lv')!==lv) continue; if(lv==='full' && mode!=='today' && mode!=='new') continue;   // Detailed: today and all of them
      for(const [dev, vp, dpr] of DEVICES){ if(val('--dev') && val('--dev')!==dev) continue; const { ctx, p, errs }=await open(vp, lv, dpr, mode);
        await save(`app-${dev}-${lv}-${mode}.png`, await p.evaluate(()=>window.__H.sceneShotDbg()));
        await p.screenshot({ path:path.join(OUT, `screen-${dev}-${lv}-${mode}.png`) });
        if(dev==='laptop'){ const S=await p.evaluate(()=>{ const W=window.__H.sceneRoomDbg().woodPlacesDbg||{}; return { stumps:W.stumps, snags:W.snags }; });
          for(const [v, , pos, look] of CLOSE){ if(!CLOSE_OF[mode].includes(v)) continue; let P=pos, L=look;
            if(!P && S.stumps && v==='stump' && S.stumps[0]){ const q=S.stumps[0]; P=[q.x+0.9, q.y+0.8, q.z+1.1]; L=[q.x, q.y+0.2, q.z]; }
            if(!P && S.snags && v==='snag' && S.snags[0]){ const q=S.snags[0]; P=[q.x+1.6, q.y+1.4, q.z+2.2]; L=[q.x, q.y+1.2, q.z]; }
            if(!P) continue;
            await p.evaluate(([P, L])=>{ const R=window.__H.sceneRoomDbg(); R.viewDbg({ pos:P, look:L }); }, [P, L]);
            for(let k=0;k<8;k++){ await hand(p, 0.5, 0.62, 0.3, 4); await p.waitForTimeout(90); }   // the hand's light held in front, low
            await save(`close-${lv}-${v}-${mode}.png`, await p.evaluate(()=>window.__H.sceneShotDbg())); }
          await p.evaluate(()=>window.__H.sceneRoomDbg().viewDbg(null)); }
        if(errs.length) console.log(`[forest-snap] ${dev} ${lv} ${mode}:`, errs.slice(0, 6));
        await ctx.close(); console.log(`[forest-snap] ${dev} ${lv} ${mode} done`); } }
    await page(); }
} finally { await browser.close(); srv.close(); }
