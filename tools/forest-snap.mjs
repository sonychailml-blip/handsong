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
const MODES=[['today', 'Старый лес (до FOREST-2, ?forest=old)'], ['default', 'Теперь по умолчанию: камни, кора, мох, пни, трава, растения не сквозь твёрдое'], ['roots', '?forest=roots — ствол и корни одной поверхностью'], ['spruce', '?forest=spruce — молодые ели на местах деревцев'], ['new', '?forest=new — всё вместе']];   // FOREST-2c
const CLOSE_OF={ today:['rock', 'cushion', 'trunk', 'stump', 'base-r', 'base-l', 'grass', 'spruce'], default:['rock', 'cushion', 'trunk', 'stump', 'root', 'base-r', 'base-l', 'grass', 'spruce'], roots:['base-r', 'base-l', 'root'], spruce:['spruce'], new:[] };
/* FOREST-2b: what is captured — [level, mode, device, close views?]: Detailed on the laptop for every switch (the founder compares at Detailed), Standard on the laptop for today, the default and the spruces */
const PLAN=[...MODES.map(([m])=>['full', m, 'laptop', true]), ['reduced', 'today', 'laptop', false], ['reduced', 'default', 'laptop', false], ['reduced', 'spruce', 'laptop', false]];
const URL_OF=m=>m==='today' ? 'old' : m==='default' ? null : m;   // the address word of a mode
/* close views [name, Russian caption, camera pos, look] — through the room's capture door viewDbg */
const CLOSE=[['rock', 'Камень у прохода', [0.9, 0.75, 2.2], [1.9, 0.1, -0.6]], ['foot-l', 'Комель ближнего ствола слева: корни, мох, кора', [-0.6, 0.9, 1.4], [-2.1, 0.35, -2.2]],
  ['foot-r', 'Комель ствола справа: корни, мох, кора', [1.2, 0.9, -1.0], [2.5, 0.4, -4.6]], ['trunk', 'Кора ствола на уровне глаз', [-0.4, 1.5, 0.6], [-2.1, 1.4, -2.2]],
  ['stump', 'Пень', null, null], ['snag', 'Сухостой', null, null], ['log', 'Бревно-мостик над ручьём', [0.6, 1.0, -3.6], [0.0, 0.3, -6.6]],
  ['cushion', 'Подушки мха (те же самые)', null, null], ['root', 'Корень у комля, сверху-сбоку (тот же самый)', null, null], ['base-r', 'Комель ближнего ствола справа (на линии взгляда игрока, ближе)', [2.16, 0.8, 2.44], [3.6, 0.3, 0.4]], ['base-l', 'Комель ближнего ствола слева (на линии взгляда игрока, ближе)', [-1.26, 0.8, 0.88], [-2.1, 0.3, -2.2]], ['spruce', 'Молодая ель сбоку', null, null], ['grass', 'Трава у ног', [0.4, 0.55, 3.4], [1.6, 0.0, 0.4]]];

/* FOREST-2b: a short Russian word per switch on the page (what it does; for moss and stumps the proposal) */
const NOTE={ roots:'Корни (FOREST-2c): у стволов, чьи комли игрок видит (7 на Детальной: так показала карта видимости), ствол и корни — одна поверхность. Ствол расширяется книзу и переходит в корни; кора идёт без шва по стволу, расширению и корням, вдоль корня, того же масштаба; корни сужаются и уходят в землю. Корни идут по прежним путям и не выше и не шире прежних — грибы видны.',
  spruce:'Ели (FOREST-2c): видимые деревца и молодые лиственные деревья заменены молодыми елями на тех же местах — мутовки ветвей, опущенные концы, разная высота (деревца 1,4–3 м, молодые деревья 2,4–5,4 м). Не в середине кадра и не на линии взгляда к грибам — там остаётся прежнее деревце.' };
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
  const pair=(a, ca, b, cb)=>`<div class="pair">${fig(a, ca)}${fig(b, cb)}</div>`, D=MODES.find(m=>m[0]==='default')[1];
  body+='<h2>Что изменилось по умолчанию (ноутбук)</h2>';
  for(const lv of ['full', 'reduced']) body+=pair(`app-laptop-${lv}-today.png`, `Старый лес — ${lv==='full' ? 'Детальная' : 'Стандартная'}`, `app-laptop-${lv}-default.png`, `${D} — ${lv==='full' ? 'Детальная' : 'Стандартная'}`);
  body+='<h2>Каждый переключатель против нового «по умолчанию» (Детальная, ноутбук, те же точки, то же время, луна)</h2>';
  for(const [mode, name] of MODES.slice(2)) body+=pair('app-laptop-full-default.png', 'По умолчанию', `app-laptop-full-${mode}.png`, name);
  body+=pair('app-laptop-reduced-default.png', 'По умолчанию — Стандартная', 'app-laptop-reduced-spruce.png', '?forest=spruce — Стандартная (часть елей)');
  body+='<h2>Крупно (Детальная, ноутбук, свет руки рядом): тот же предмет с переключателем и без</h2>';
  for(const [mode, name] of MODES.slice(2)){ if(NOTE[mode]) body+=`<p class="note">${NOTE[mode]}</p>`;
    for(const [v, cap] of CLOSE) if(CLOSE_OF[mode].includes(v)) body+=pair(`close-full-${v}-default.png`, `По умолчанию — ${cap}`, `close-full-${v}-${mode}.png`, `${name} — ${cap}`); }
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FOREST-2 по переключателям</title>
<style>:root{--bg:#0d1210;--fg:#dfe8e2;--mut:#93a39a}body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}h1{font-size:20px}h2{font-size:17px;margin:28px 0 10px}h3{font-size:15px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 18px}figure{margin:0}img{width:100%;height:auto;border-radius:6px;display:block}img.phone{max-height:80vh;width:auto;max-width:100%;margin:auto}
figcaption{color:var(--mut);font-size:13px;margin-top:4px}.note{background:#16201b;border-left:3px solid #4f7a62;padding:8px 12px;border-radius:4px;max-width:900px}.none{color:var(--mut);padding:30px;border:1px dashed #33433a;border-radius:6px}details{margin:6px 0}summary{cursor:pointer}details p{font-size:13px;color:var(--mut)}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style></head>
<body><h1>FOREST-2b: лес по переключателям</h1><p>Без переключателя теперь: камни-валуны и растения не сквозь твёрдое. Адреса: <code>?forest=bark</code>, <code>moss</code>, <code>stumps</code>, <code>roots</code>, <code>spruce</code>, <code>grass</code>; можно вместе через запятую (<code>?forest=moss,stumps</code>); <code>?forest=new</code> — всё сразу; <code>?forest=old</code> — старый лес, бит в бит.</p>${body}</body></html>`;
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
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe${fresh && URL_OF(fresh) ? '&forest='+URL_OF(fresh) : ''}`);
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
    for(const [lv, mode, dev, closes] of PLAN){ if(val('--lv') && val('--lv')!==lv || val('--mode') && val('--mode')!==mode) continue; const [, vp, dpr]=DEVICES.find(d=>d[0]===dev);
      { const { ctx, p, errs }=await open(vp, lv, dpr, mode);
        await save(`app-${dev}-${lv}-${mode}.png`, await p.evaluate(()=>window.__H.sceneShotDbg()));
        await p.screenshot({ path:path.join(OUT, `screen-${dev}-${lv}-${mode}.png`) });
        if(closes){ const S=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), W=R.woodPlacesDbg||{}, CP=R.canopyDbg.places; return { stumps:W.stumps, snags:W.snags, moss:W.moss, spruce:CP.young.map(q=>({ x:q.x, z:q.z, H:2.4+(q.H-4)*0.75 })).concat(CP.saplings.map(q=>({ x:q.x, z:q.z, H:q.H }))), roots:(W.roots||[]).map(r=>r.pts.map(q=>q.slice(0, 3))) }; });
          for(const [v, , pos, look] of CLOSE){ if(!CLOSE_OF[mode].includes(v)) continue; let P=pos, L=look, L2=null;
            if(!P && S.stumps && v==='stump' && S.stumps[0]){ const q=S.stumps[0]; P=[q.x+0.9, q.y+0.8, q.z+1.1]; L=[q.x, q.y+0.2, q.z]; }
            if(!P && S.snags && v==='snag' && S.snags[0]){ const q=S.snags[0]; P=[q.x+1.6, q.y+1.4, q.z+2.2]; L=[q.x, q.y+1.2, q.z]; }
            if(!P && v==='cushion' && S.moss){ const q=S.moss.filter(m=>m.z<4 && m.z>-4 && Math.abs(m.x)<5).sort((a, b)=>b.s-a.s)[0]; if(q){ P=[q.x+0.7, q.y+0.75, q.z+1.0]; L=[q.x, q.y+0.05, q.z]; } }   // the largest cushion near the path: the same one in every mode
            if(!P && v==='spruce' && S.spruce && S.spruce.length){ const q=S.spruce.filter(q=>Math.abs(q.x)/Math.max(0.5, 5.5-q.z)>0.25).sort((a, b)=>Math.hypot(a.x, a.z-5.5)-Math.hypot(b.x, b.z-5.5))[0]; const k=0.55; P=[q.x*k, 1.55+(q.H*0.45-1.55)*k, 5.5+(q.z-5.5)*k]; L=[q.x, q.H*0.45, q.z]; }   // on the eye's own line of sight to it, nearer
            if(!P && v==='root' && S.roots && S.roots.length){ const E=[0, 5.5], d=r=>Math.hypot(r[0][0]-E[0], r[0][2]-E[1]), q=S.roots.filter(r=>d(r)>3 && r[0][2]<4 && Math.abs(r[0][0])<4).sort((a, b)=>d(a)-d(b))[0]; if(q){ const m=q[Math.floor(q.length/2)], a=q[0], ux=m[0]-a[0], uz=m[2]-a[2], L=Math.hypot(ux, uz)||1; P=[m[0]-uz/L*1.3+ (E[0]-m[0])*0.12, m[1]+1.1, m[2]+ux/L*1.3+(E[1]-m[2])*0.12]; L2=[m[0], m[1], m[2]]; } }   // the nearest root in front: seen from its side, above
            if(L2) L=L2;
            { const vf=path.join(OUT, 'views.json'), V=existsSync(vf) ? JSON.parse(await readFile(vf, 'utf8')) : {}; if(mode==='default' && P && !pos){ V[v]=[P, L]; await writeFile(vf, JSON.stringify(V)); } else if(V[v] && !pos){ [P, L]=V[v]; } }   // a computed view: the default's, the same in every word
            if(!P) continue;
            await p.evaluate(([P, L])=>{ const R=window.__H.sceneRoomDbg(); R.viewDbg({ pos:P, look:L }); }, [P, L]);
            for(let k=0;k<8;k++){ await hand(p, 0.5, 0.62, 0.3, 4); await p.waitForTimeout(90); }   // the hand's light held in front, low
            await save(`close-${lv}-${v}-${mode}.png`, await p.evaluate(()=>window.__H.sceneShotDbg())); }
          await p.evaluate(()=>window.__H.sceneRoomDbg().viewDbg(null)); }
        if(errs.length) console.log(`[forest-snap] ${dev} ${lv} ${mode}:`, errs.slice(0, 6));
        await ctx.close(); console.log(`[forest-snap] ${dev} ${lv} ${mode} done`); } }
    await page(); }
} finally { await browser.close(); srv.close(); }
