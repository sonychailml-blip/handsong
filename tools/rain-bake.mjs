/* RAIN-0b — THE BAKED CITY's TOOL (dev only; never runs in the app). Its own server and a fresh headless Chrome open tools/design/rain/bake/bake.html,
   which builds the model by code (model.js) and renders it ONCE at high quality with three.js r128 (MIT, the vendored copy): CC0 PBR textures from
   tools/design/rain/tex/, night lights, wet reflections, 2× supersampling. No network beyond its own server.
     node tools/rain-bake.mjs --look   THE LOOK TEST: one section of the facade opposite (3 bays in the middle of the frame, 3 floors over the ground
                                       floor, cornice, balconies, a piece of street), at a laptop (1280 × 800) and a phone (390 × 844 at 2.75) size,
                                       windows dark and lit → tools/design/rain/looktest/ (WebP colour, PNG depth, windows.json, bake.json with the
                                       times and sizes) and its page index.html (sharp and two blur levels by the room's own depth blur, next to the
                                       stand-ins). PLAN.md slice 1 adds --city (the whole boulevard into the room's prepared layers). */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT, 'tools/design/rain/looktest'), argv=process.argv.slice(2);
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' };
if(!argv.includes('--look')){ console.log('usage: node tools/rain-bake.mjs --look'); process.exit(1); }
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ const p=decodeURIComponent(new URL(q.url, 'http://x').pathname), f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } }); s.listen(0, '127.0.0.1', ()=>res(s)); });
/* the look test's page (Russian captions, for the founder): the bake sharp and at two blur levels, dark and lit, phone and laptop, next to the stand-ins */
function page(info){
  const ms=Object.values(info.views).map(v=>v.ms), mb=Object.values(info.views).reduce((a, v)=>a+Object.values(v.files).reduce((x, y)=>x+y, 0), 0)/1048576;
  const fig=(src, cap, cls='')=>`<figure><img class="${cls}" src="${src}" alt=""><figcaption>${cap}</figcaption></figure>`;
  const set=(dev, cls)=>['dark', 'lit'].map(l=>`<div class="g">${fig(`${dev}-${l}.webp`, (l==='dark' ? 'Окна тёмные' : 'Окна горят')+', резко', cls)}${fig(`${dev}-${l}-street.webp`, 'Фокус на улице внизу: фасад чуть мягче', cls)}${fig(`${dev}-${l}-glass.webp`, 'Фокус на стекле: фасад в мягком боке', cls)}</div>`).join('');
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Проба запечённого города</title>
<style>body{background:#0e0d12;color:#ece6dc;font:16px/1.55 system-ui,sans-serif;margin:0;padding:24px;max-width:1600px} h1,h2{font-weight:500} h2{margin-top:40px} figure{margin:0} img{width:100%;height:auto;border-radius:8px;display:block} img.ph{max-height:78vh;width:auto;max-width:100%} figcaption{margin:6px 0 18px;color:#c4bcae;font-size:14px} .g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px} .p{color:#a8a092} table{border-collapse:collapse} td{padding:4px 14px 4px 0;vertical-align:top}</style>
<h1>Проба: город как запечённая 3D-модель (кусок фасада напротив)</h1>
<p class="p">Модель построена кодом (tools/design/rain/bake/model.js): фасад в духе модерна — руст первого этажа с арками витрин, три этажа высоких арочных окон с наличниками и замковыми камнями, пилястры с капителями, тяги между этажами, карниз на кронштейнах, кованые балконы с завитками, лепные вставки под окнами; внизу тротуар, бордюр, мокрый асфальт, трамвайные рельсы и провода, фонарь. Материалы — CC0-текстуры Poly Haven (штукатурка, песчаник, асфальт, плитка). Освещение ночное: фонари подсвечивают штукатурку снизу и отбрасывают тени балконов вверх, тёплое свечение города, горящие комнаты; мокрые отражения на улице. Рендер — three.js r128 (MIT), один раз, с двукратным сглаживанием. В середине кадра — три пролёта на три этажа, модуль повторяется по сторонам. Размытие — тем же способом, что в комнате (глубина каждой точки → своя резкость).</p>
<table><tr><td>Время запекания</td><td>${ms.map(v=>(v/1000).toFixed(1)+' с').join(' · ')} (ноутбук и телефон, тёмные и горящие окна)</td></tr>
<tr><td>Файлы пробы</td><td>${mb.toFixed(1)} МБ (WebP цвета, PNG глубины)</td></tr>
<tr><td>Весь город (оценка)</td><td>≈ 5–6 МБ: на каждую из трёх форм экрана цвет + глубина + атлас горящих окон (Детальная ≈ 1,1 МБ, Стандартная ≈ 0,3 МБ), плюс дальние слои ≈ 1 МБ — в бюджете 15 МБ; запекание всего бульвара ≈ 10–20 минут на ноутбуке</td></tr></table>
<h2>Ноутбук (1280 × 800)</h2>${set('laptop', '')}
<h2>Телефон (390 × 844)</h2>${set('phone', 'ph')}
<h2>Для сравнения: условные города</h2><div class="g">${fig('../../../.ui-snap/rain0/laptop-far.png', 'RAIN-0: заглушка (ноутбук, фокус далеко)')}${fig('../../../.ui-snap/rain0b/laptop-mid.png', 'RAIN-0b: вид вдоль бульвара, заглушка (ноутбук, фокус посередине)')}${fig('laptop-lit.webp', 'Проба запечённого фасада (ноутбук)')}</div>
<div class="g">${fig('../../../.ui-snap/rain0/phone-far.png', 'RAIN-0: телефон', 'ph')}${fig('../../../.ui-snap/rain0b/phone-mid.png', 'RAIN-0b: телефон', 'ph')}${fig('phone-lit.webp', 'Проба: телефон', 'ph')}</div>
</html>`;
}
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--enable-webgl', '--ignore-gpu-blocklist'] });
try{
  await mkdir(OUT, { recursive:true });
  const p=await (await browser.newContext({ viewport:{ width:800, height:600 } })).newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e).slice(0, 160))); p.on('console', m=>{ if(m.type()==='error' && !/favicon|status of 404/.test(m.text())) errs.push(m.text().split(String.fromCharCode(10))[0].slice(0, 160)); });   // the first line only (a shader log would dump its source)
  await p.goto(`http://127.0.0.1:${srv.address().port}/tools/design/rain/bake/bake.html`); await p.waitForFunction(()=>window.bakeReady, null, { timeout:60e3 });
  /* the views: the camera across the boulevard on the 8th floor (25 m), diagonal to the facade, as the room's eye sees the house opposite */
  const VIEWS={ laptop:{ w:1280, h:800, fov:21, cam:[-4, 25, 44], at:[23.1, 7.4, 3] }, phone:{ w:1073, h:2321, fov:38, cam:[-4, 25, 44], at:[23.1, 6.0, 4] } };
  const info={ renderer:'three.js r128 (MIT), vendored at apps/night/vendor/three-r128/', ss:2, views:{} };
  for(const [name, V] of Object.entries(VIEWS)) for(const lives of ['dark', 'lit']){
    const res=await p.evaluate(o=>window.bake(o), { ...V, bays:11, ss:2, lives });
    const files={}; for(const [k, url] of Object.entries(res.images)){ if(k==='depth' && lives==='lit') continue; const ext=url.startsWith('data:image/webp') ? 'webp' : 'png', f=`${name}-${k==='colour' ? lives : 'depth'}.${ext}`, buf=Buffer.from(url.split(',')[1], 'base64'); await writeFile(path.join(OUT, f), buf); files[f]=buf.length; }
    if(lives==='dark') await writeFile(path.join(OUT, `${name}-windows.json`), JSON.stringify(res.windows));
    info.views[name+'-'+lives]={ ms:res.ms, px:[V.w, V.h], files, windows:res.windows.length };
    console.log(`[rain-bake] ${name} ${lives}: ${res.ms} ms, ${JSON.stringify(files)}`); }
  /* two blur levels by the room's own depth blur (K and the widest radius as the room's: 1.8 and 0.06 of the view's half height): the focus on the
     street below (the facade a little soft) and on the glass (the facade fully soft) */
  const rd=f=>readFile(path.join(OUT, f)).then(b=>`data:image/${f.endsWith('png') ? 'png' : 'webp'};base64,`+b.toString('base64'));
  for(const [name, V] of Object.entries(VIEWS)) for(const lives of ['dark', 'lit']) for(const [tag, fd] of [['street', 0.45], ['glass', 0]]){
    const half=V.h/2, url=await p.evaluate(([c, d, fd, R])=>window.depthBlur(c, d, fd, 1.8, R), [await rd(`${name}-${lives}.webp`), await rd(`${name}-depth.png`), fd, 0.06/(name==='phone' ? Math.tan(34*Math.PI/180) : Math.tan(27.5*Math.PI/180))*half]);   // the room's widest radius at that screen (its lens: 68° upright, 55° wide)
    await writeFile(path.join(OUT, `${name}-${lives}-${tag}.webp`), Buffer.from(url.split(',')[1], 'base64')); }
  info.errors=errs.slice(0, 8); await writeFile(path.join(OUT, 'bake.json'), JSON.stringify(info, null, 1));
  await writeFile(path.join(OUT, 'index.html'), page(info));
  if(errs.length) console.log('[rain-bake] page errors:', errs.slice(0, 8));
} finally { await browser.close().catch(()=>{}); srv.close(); }
