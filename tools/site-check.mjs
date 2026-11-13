/* SITE-1 — THE BRAND SITE'S CHECK (CLAUDE.md «Check levels»: the site's own Level 1 check). Own static server over apps/site/ that behaves like
   the Vercel project (clean URLs with a trailing slash, 404.html with status 404, the headers of apps/site/vercel.json); a fresh headless Chrome
   (channel chrome); every request off our origin is recorded and aborted (nothing leaves). Every page in both languages at phone (390 × 844)
   and laptop (1280 × 800) width:
     - no console error, no page error, no request off our origin, <html lang> right, title / description / canonical / hreflang / og:image present,
       every image loaded, no sideways scroll; every internal link resolves (its #fragment too); external links listed, never fetched;
       text contrast ≥ 4.5 : 1 on solid backgrounds (text on a picture is counted and left to the captures);
       the home page ≤ 600 KB in total; the pages equal what tools/site-pages.mjs makes;
     - the RU/EN switch lands on the same page in the other language and saves the choice;
     - the first visit: a Russian browser on / goes to /ru/, an English one stays, a saved choice wins, storage that throws changes nothing else,
       a deep link is never moved; an unknown address answers 404 with the bilingual page.
   CONTROLS (must fail): a page with a broken link, a page that loads a picture from another host (its CSP stripped), a switch that points
   to another page. Ends with a verdict line: [site-check] PASS — … / NOT A PASS — … (exit 0 / 1).
     node tools/site-check.mjs                   the check
     node tools/site-check.mjs --shots [DIR]     also full-page captures of every page (phone, laptop, both languages) and a local page
                                                 with Russian captions (default tools/.site-shots/index.html) */
import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { stale, PAGES, pathOf } from './site-pages.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SITE=path.join(ROOT,'apps/site');
const argv=process.argv.slice(2), SHOTS=argv.includes('--shots') ? path.resolve(ROOT, (argv[argv.indexOf('--shots')+1] && !argv[argv.indexOf('--shots')+1].startsWith('--')) ? argv[argv.indexOf('--shots')+1] : 'tools/.site-shots') : null;
const HOME_BUDGET=600*1024, WAIT=20e3, T0=Date.now();
const VIEWS={ phone:{ viewport:{ width:390, height:844 }, deviceScaleFactor:2, isMobile:true, hasTouch:true }, laptop:{ viewport:{ width:1280, height:800 }, deviceScaleFactor:1 } };
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.txt':'text/plain; charset=utf-8',
  '.xml':'application/xml; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
const fails=[], notes=[], external=new Map();
const fail=s=>fails.push(s), out=s=>console.log('[site-check] '+s);
const exists=async f=>{ try{ return (await stat(f)).isFile(); }catch(e){ return false; } };

/* ---------- the server: Vercel's clean URLs + trailing slash, 404.html, vercel.json headers; OVERLAY serves control pages ---------- */
const VJ=JSON.parse(await readFile(path.join(SITE,'vercel.json'),'utf8'));
const HDR=(VJ.headers||[]).map(h=>({ re:new RegExp('^'+h.source.replace(/\(\.\*\)/g,'.*')+'$'), hs:h.headers }));
const OVERLAY=new Map();   // path → { html, noCsp }
function headersFor(p, noCsp){ const o={}; for(const h of HDR) if(h.re.test(p)) for(const { key, value } of h.hs) if(!(noCsp && key==='Content-Security-Policy')) o[key]=value; return o; }
const srv=http.createServer(async (q,r)=>{ try{
  const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname);
  if(OVERLAY.has(p)){ const o=OVERLAY.get(p); r.writeHead(200,{ 'content-type':MIME['.html'], ...headersFor(p,o.noCsp) }); r.end(o.html); return; }
  if(p.includes('..')){ r.writeHead(400); r.end(); return; }
  if(/\/index\.html$/.test(p) || /\.html$/.test(p)){ const to=p.replace(/index\.html$/,'').replace(/\.html$/,'/'); r.writeHead(308,{ location:to }); r.end(); return; }   // cleanUrls
  let f=path.join(SITE,p);
  if(p.endsWith('/')) f=path.join(f,'index.html');
  else if(!path.extname(p) && await exists(path.join(f,'index.html'))){ r.writeHead(308,{ location:p+'/' }); r.end(); return; }   // trailingSlash
  if(!await exists(f)){ r.writeHead(404,{ 'content-type':MIME['.html'], ...headersFor(p) }); r.end(await readFile(path.join(SITE,'404.html'))); return; }
  r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', ...headersFor(p) }); r.end(await readFile(f)); }
  catch(e){ r.writeHead(500); r.end(String(e)); } });
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
const BASE=`http://127.0.0.1:${srv.address().port}`;

const browser=await chromium.launch({ channel:'chrome', headless:true });
async function newCtx(view, opts={}){
  const ctx=await browser.newContext({ ...VIEWS[view], locale:opts.locale||'en-US', ...(opts.ctx||{}) });
  const off=[]; await ctx.route('**/*', rt=>{ const u=rt.request().url(); if(u.startsWith(BASE+'/') || u===BASE || u.startsWith('data:')) return rt.continue(); off.push(u); return rt.abort(); });
  if(opts.init) await ctx.addInitScript(opts.init.fn, opts.init.arg);
  return { ctx, off };
}
const pageOf=(lang,pg)=>pathOf(lang,pg);
const counterpart=p=>p.startsWith('/ru/') ? (p.slice(3)||'/') : '/ru'+p;

/* luminance contrast of every text element with a solid background (in the page) */
const CONTRAST=()=>{ const lum=c=>{ const a=c.map(v=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; };
  const rgba=s=>{ const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0],v[1],v[2],v.length>3?v[3]:1]; };
  const bad=[]; let n=0, onPic=0;
  for(const el of document.querySelectorAll('body *')){ if(![...el.childNodes].some(x=>x.nodeType===3 && x.textContent.trim())) continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden' || cs.display==='none' || el.getClientRects().length===0) continue;
    let fg=rgba(cs.color), bg=null, pic=false;
    for(let a=el; a; a=a.parentElement){ const s=getComputedStyle(a); if(s.backgroundImage!=='none' || a.matches('.app-pic,.hero-pic,.wall')){ pic=true; break; } const b=rgba(s.backgroundColor); if(b && b[3]>0){ bg=b; break; } }
    if(pic){ onPic++; continue; } if(!bg) bg=[255,255,255,1];
    const f=[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])), L1=lum(f), L2=lum(bg), r=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); n++;
    if(r<4.5) bad.push(`${el.tagName.toLowerCase()}.${el.className||''} «${el.textContent.trim().slice(0,30)}» ${r.toFixed(2)}:1`); }
  return { n, onPic, bad }; };

/* one page at one width: the checks above; returns its problems (the controls read them) */
async function checkPage(url, view, want={}){
  const probs=[], { ctx, off }=await newCtx(view), p=await ctx.newPage(); let bytes=0; const errs=[];
  p.on('console', m=>{ if(m.type()!=='error') return;   // the 404 page's own status is the one expected error (its document's address, nothing else)
    if(want.is404 && /status of 404/.test(m.text()) && (m.location()||{}).url===BASE+url) return; errs.push(m.text()); }); p.on('pageerror', e=>errs.push(String(e)));
  p.on('response', async rs=>{ try{ const b=await rs.body(); bytes+=b.length; }catch(e){} });
  try{
    const rs=await p.goto(BASE+url, { waitUntil:'load', timeout:WAIT });
    if(want.status!=null ? rs.status()!==want.status : rs.status()!==200) probs.push(`answered ${rs.status()}`);
    await p.evaluate(async ()=>{ for(let y=0; y<document.body.scrollHeight; y+=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,30)); } scrollTo(0,0); });
    await p.waitForLoadState('networkidle', { timeout:WAIT }).catch(()=>probs.push('the network did not settle within 20 s'));
    await p.evaluate(()=>document.fonts.ready);
    const info=await p.evaluate(()=>({ lang:document.documentElement.lang, title:document.title, desc:(document.querySelector('meta[name=description]')||{}).content||'',
      canon:(document.querySelector('link[rel=canonical]')||{}).href||'', og:(document.querySelector('meta[property="og:image"]')||{}).content||'',
      alt:[...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l=>l.hreflang), csp:!!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      imgs:[...document.images].filter(i=>!(i.complete && i.naturalWidth>0)).map(i=>i.currentSrc||i.src), wide:document.documentElement.scrollWidth-innerWidth,
      links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')), ids:[...document.querySelectorAll('[id]')].map(e=>e.id) }));
    if(want.lang && info.lang!==want.lang) probs.push(`<html lang="${info.lang}">, wanted ${want.lang}`);
    if(!info.title) probs.push('no title'); if(!info.csp) probs.push('no CSP meta');
    if(!want.is404){ if(!info.desc) probs.push('no description'); if(!info.canon) probs.push('no canonical'); if(!info.og) probs.push('no og:image'); if(!(info.alt.includes('en') && info.alt.includes('ru'))) probs.push('hreflang alternates missing'); }
    if(info.imgs.length) probs.push(`images not loaded: ${info.imgs.join(', ')}`);
    if(info.wide>0) probs.push(`sideways scroll: ${info.wide}px wider than the screen`);
    for(const h of info.links){ const abs=new URL(h, BASE+url);
      if(abs.origin!==BASE){ if(!external.has(abs.href)) external.set(abs.href, new Set()); external.get(abs.href).add(url); continue; }
      if(abs.pathname===new URL(BASE+url).pathname && abs.hash){ if(!info.ids.includes(abs.hash.slice(1))) probs.push(`link ${h}: no element #${abs.hash.slice(1)}`); continue; }
      const r2=await ctx.request.get(abs.origin+abs.pathname, { maxRedirects:0, timeout:WAIT }).catch(e=>null);
      if(!r2 || r2.status()!==200){ probs.push(`link ${h} → ${r2 ? r2.status() : 'no answer'}`); continue; }
      if(abs.hash && !(await r2.text()).includes(`id="${abs.hash.slice(1)}"`)) probs.push(`link ${h}: no element #${abs.hash.slice(1)} there`); }
    if(view==='laptop'){ const c=await p.evaluate(CONTRAST); for(const b of c.bad) probs.push('contrast below 4.5:1 — '+b); want.contrast=c; }
    if(want.budget && bytes>want.budget) probs.push(`${Math.round(bytes/1024)} KB in total, over ${Math.round(want.budget/1024)} KB`);
    want.bytes=bytes;
    if(want.shot){ await mkdir(path.dirname(want.shot),{ recursive:true }); await p.screenshot({ path:want.shot, fullPage:true }); }
  } catch(e){ probs.push('failed: '+String(e.message||e).split('\n')[0]); }
  await p.waitForTimeout(100);
  for(const e of errs) probs.push('console: '+e.slice(0,160));
  for(const u of off) probs.push('request off our origin: '+u);
  await ctx.close();
  return probs;
}
/* the switch: click the other language, land on the same page there, the choice saved */
async function checkSwitch(url, expect, view){
  const probs=[], { ctx }=await newCtx(view), p=await ctx.newPage();
  try{ await p.goto(BASE+url, { waitUntil:'load', timeout:WAIT });
    const to=url.startsWith('/ru/') ? 'en' : 'ru';
    await Promise.all([p.waitForNavigation({ timeout:WAIT }), p.click(`.lang a[data-lang="${to}"]`, { timeout:WAIT })]);
    const at=new URL(p.url()).pathname, saved=await p.evaluate(()=>localStorage.getItem('handsong.site.lang'));
    if(at!==expect) probs.push(`switch on ${url} landed on ${at}, wanted ${expect}`);
    if(saved!==to) probs.push(`switch on ${url} saved «${saved}», wanted «${to}»`);
    const lang=await p.evaluate(()=>document.documentElement.lang); if(lang!==to) probs.push(`after the switch <html lang="${lang}">`);
  } catch(e){ probs.push(`switch on ${url}: ${String(e.message||e).split('\n')[0]}`); }
  await ctx.close(); return probs;
}
/* the first visit to a page in a browser of one language, with or without a saved choice, storage working or throwing */
async function landing(url, locale, saved, throwing){
  const init= throwing ? { fn:()=>{ const t=()=>{ throw new Error('storage refused'); }; Storage.prototype.getItem=t; Storage.prototype.setItem=t; } }
    : saved ? { fn:v=>{ try{ localStorage.setItem('handsong.site.lang', v); }catch(e){} }, arg:saved } : null;
  const { ctx, off }=await newCtx('laptop', { locale, init }), p=await ctx.newPage(), errs=[];
  p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); }); p.on('pageerror', e=>errs.push(String(e)));
  let at=null; try{ await p.goto(BASE+url, { waitUntil:'load', timeout:WAIT }); await p.waitForTimeout(300); at=new URL(p.url()).pathname; }catch(e){ errs.push(String(e)); }
  await ctx.close(); return { at, errs:[...errs, ...off] };
}

try{
  /* the pages are what the generator makes */
  const st=stale(); if(st.length) fail(`pages out of date with tools/site-pages.mjs: ${st.join(', ')} (run: node tools/site-pages.mjs --write)`);
  /* every page, both widths */
  const shots=[]; let nPages=0, homeKB={};
  for(const lang of ['en','ru']) for(const pg of PAGES) for(const view of ['phone','laptop']){
    const url=pageOf(lang,pg), want={ lang, budget: pg==='home' ? HOME_BUDGET : null, shot: SHOTS ? path.join(SHOTS, `${lang}-${pg}-${view}.png`) : null };
    const pr=await checkPage(url, view, want); nPages++;
    for(const x of pr) fail(`${url} (${view}): ${x}`);
    if(pg==='home') homeKB[`${lang} ${view}`]=Math.round(want.bytes/1024);
    if(want.contrast) notes.push(`${url}: contrast checked on ${want.contrast.n} text elements (${want.contrast.onPic} on pictures, left to the captures)`);
    if(SHOTS) shots.push({ lang, pg, view, file:path.basename(want.shot) });
  }
  out(`pages: ${nPages} loads (${PAGES.length} pages × 2 languages × phone and laptop) · home page weight ${Object.entries(homeKB).map(([k,v])=>`${k} ${v} KB`).join(', ')} (budget ${HOME_BUDGET/1024} KB)`);
  /* the 404 */
  for(const u of ['/no-such-page/','/ru/no-such-page/']){ const pr=await checkPage(u, 'phone', { status:404, is404:true, lang:'en' }); for(const x of pr) fail(`${u} (404): ${x}`);
    if(SHOTS && u==='/no-such-page/'){ await checkPage(u,'laptop',{ status:404, is404:true, lang:'en', shot:path.join(SHOTS,'404-laptop.png') }); shots.push({ lang:'both', pg:'404', view:'laptop', file:'404-laptop.png' }); } }
  /* the switch, every page, both directions */
  let nSw=0; for(const lang of ['en','ru']) for(const pg of PAGES){ const u=pageOf(lang,pg); for(const x of await checkSwitch(u, counterpart(u), lang==='en'?'phone':'laptop')) fail(x); nSw++; }
  out(`switch: ${nSw} pages, each landed on its counterpart with the choice saved`);
  /* the first visit */
  const L=[ ['/','ru-RU',null,false,'/ru/','a Russian browser, nothing saved'], ['/','en-US',null,false,'/','an English browser, nothing saved'],
    ['/','ru-RU','en',false,'/','a Russian browser, English saved'], ['/','en-US','ru',false,'/ru/','an English browser, Russian saved'],
    ['/','ru-RU',null,true,'/ru/','a Russian browser, storage throws'], ['/','en-US',null,true,'/','an English browser, storage throws'],
    ['/night/','ru-RU',null,false,'/night/','a deep link in a Russian browser'], ['/ru/','en-US',null,false,'/ru/','the Russian home in an English browser'] ];
  for(const [u,loc,sv,th,want,what] of L){ const r=await landing(u,loc,sv,th); if(r.at!==want) fail(`first visit (${what}): ${u} → ${r.at}, wanted ${want}`); for(const e of r.errs) fail(`first visit (${what}): ${e}`); }
  out(`first visit: ${L.length} cases`);
  /* CONTROLS */
  const homeHtml=await readFile(path.join(SITE,'index.html'),'utf8'), nightHtml=await readFile(path.join(SITE,'night/index.html'),'utf8');
  OVERLAY.set('/__control/broken/', { html:homeHtml.replace('</main>','<p><a href="/no-such-page/">x</a></p></main>') });
  OVERLAY.set('/__control/offsite/', { html:homeHtml.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,'').replace('</main>','<img src="https://images.example.com/x.png" alt=""></main>'), noCsp:true });
  OVERLAY.set('/__control/switch/', { html:nightHtml.replace('href="/ru/night/" lang="ru"','href="/ru/demo/" lang="ru"') });
  const c1=(await checkPage('/__control/broken/','laptop',{ lang:'en' })).some(x=>/link \/no-such-page\/ → 404/.test(x));
  const c2=(await checkPage('/__control/offsite/','laptop',{ lang:'en' })).some(x=>/request off our origin: https:\/\/images\.example\.com/.test(x));
  const c3=(await checkSwitch('/__control/switch/','/ru/night/','laptop')).some(x=>/landed on \/ru\/demo\//.test(x));
  out(`controls: a broken link ${c1?'caught':'NOT CAUGHT'} · a picture from another host ${c2?'caught':'NOT CAUGHT'} · a switch to another page ${c3?'caught':'NOT CAUGHT'}`);
  if(!(c1&&c2&&c3)) fail('a CONTROL was not caught — the check cannot fail');
  /* external links: listed, not fetched */
  out(`external links (listed, not fetched): ${external.size}`); for(const [u,on] of [...external].sort()) console.log(`    ${u}  (${on.size} page loads)`);
  for(const n of notes) console.log('    · '+n);
  if(SHOTS) await gallery(shots);
} catch(e){ fail('the check stopped: '+String(e.stack||e)); }
finally{ await browser.close().catch(()=>{}); srv.close(); }

async function gallery(shots){
  const PG={ home:'Главная', night:'Night', demo:'Технодемо', install:'Install', '404':'Страница 404 (на двух языках)' }, LG={ en:'английская версия', ru:'русская версия', both:'' }, VW={ phone:'телефон, 390 px', laptop:'ноутбук, 1280 px' };
  const rows=[]; for(const pg of [...PAGES,'404']){ const s=shots.filter(x=>x.pg===pg); if(!s.length) continue;
    rows.push(`<h2>${PG[pg]}</h2><div class="row">${s.map(x=>`<figure class="${x.view}"><a href="${x.file}"><img src="${x.file}" alt="" loading="lazy"></a><figcaption>${PG[pg]}${LG[x.lang]?' — '+LG[x.lang]:''} · ${VW[x.view]}</figcaption></figure>`).join('')}</div>`); }
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>handsong.app — снимки страниц</title>
<style>:root{color-scheme:dark}body{margin:0;padding:24px 16px 64px;background:#0b0c0e;color:#ecedef;font:15px/1.5 system-ui,sans-serif}h1{font-weight:400;margin:0 0 4px}p{color:#a7abb3;margin:0 0 24px}
h2{font-weight:400;margin:40px 0 12px;border-top:1px solid #24262b;padding-top:16px}.row{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}figure{margin:0;display:flex;flex-direction:column;gap:6px}
figure.phone{width:220px}figure.laptop{width:520px}figure img{width:100%;height:auto;border:1px solid #2f3238;border-radius:8px;display:block}figcaption{color:#a7abb3;font-size:13px}a{color:inherit}</style></head>
<body><h1>handsong.app — снимки всех страниц</h1><p>Сделаны проверкой сайта (tools/site-check.mjs --shots) ${new Date().toLocaleString('ru-RU')}: каждая страница целиком, на телефоне и на ноутбуке, на английском и на русском. Нажмите на снимок, чтобы открыть его в полном размере.</p>
${rows.join('\n')}</body></html>`;
  await writeFile(path.join(SHOTS,'index.html'), html); out(`captures: ${shots.length} → ${path.join(SHOTS,'index.html')}`);
}

const secs=((Date.now()-T0)/1000).toFixed(1);
if(fails.length){ console.log(`\n[site-check] problems (${fails.length}):`); for(const f of fails) console.log('  ✗ '+f); out(`NOT A PASS — ${fails.length} problem(s) · ${secs} s`); process.exit(1); }
out(`PASS — every page in both languages at phone and laptop width: links, console, own origin only, switch, first visit, 404, contrast, weight; 3 controls caught · ${secs} s`);
