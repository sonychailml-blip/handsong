/* LANG-1 — EVERY SCREEN IN EVERY LANGUAGE (dev tool; never runs in the app). Its own server and a fresh headless Chrome (a fake camera); Night with
   «?probe», the language stored before the page loads, the background Dark (the UI only: no room drawn, light on a busy laptop).
     node tools/lang-snap.mjs [--lang es,de] [--only phone|laptop]
   For each language at a phone upright (390 × 844, DPR 2) and a laptop (1280 × 800): the start card, then after Begin the coaching line (its
   longest text with both buttons), the controls row, Settings' three tabs (Write to us open on the last), the six How-to-play cards (the forest's
   and the rain's) → tools/.ui-snap/lang1/<lang>-<size>-<screen>.png, a page with Russian captions (index.html) and lang1.json.
   THE OVERFLOW CHECK (judged): on every capture, every visible element with text inside the start card, the shell, the settings card, the cards
   and the coaching line — its text wider than its box (scrollWidth > clientWidth + 1 where the box clips or keeps one line), or its box outside
   the viewport or outside its card. CONTROL: a 60-letter word planted in a settings button must be caught. Ends in a verdict line; exit 1 on any
   overflow or a missed CONTROL. */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const ALL=['en', 'ru', 'es', 'pt', 'de', 'fr', 'it', 'ka'], LANGS=(val('--lang')||ALL.join(',')).split(',').filter(l=>ALL.includes(l)), OUT=path.join(ROOT, 'tools/.ui-snap/lang1');
const SIZES=[['phone', { width:390, height:844 }, 2], ['laptop', { width:1280, height:800 }, 1]].filter(([k])=>!val('--only') || val('--only')===k);
const LIMIT=180e3;   // every wait has an upper limit and fails when reached
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.task':'application/octet-stream' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });

/* the overflow check, run in the page: what overflows among the visible text elements under the given roots */
const OVERFLOW=roots=>{ const bad=[], W=innerWidth, H=innerHeight, vis=e=>{ const s=getComputedStyle(e); if(s.display==='none' || s.visibility==='hidden' || +s.opacity===0) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0; };
  const card=e=>e.closest('.night-card, #nightCoach, #nightCtl, .startCard, #start > div, .night-glass');
  for(const id of roots){ const root=document.getElementById(id); if(!root || !vis(root)) continue;
    for(const e of root.querySelectorAll('*')){ if(!vis(e) || e.closest('[hidden]')) continue; { const dt=e.closest('details:not([open])'); if(dt && !e.closest('summary')) continue; } if(e.closest('svg')) continue;   // a drawn picture, not text   // a closed details' body is not shown const own=[...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>1); if(!own) continue;
      const s=getComputedStyle(e), r=e.getBoundingClientRect(), name=(e.id ? '#'+e.id : e.tagName.toLowerCase()+(e.className && typeof e.className==='string' ? '.'+e.className.trim().split(/\s+/).join('.') : ''))+' «'+e.textContent.trim().slice(0, 40)+'»';
      const clips=/hidden|clip|scroll|auto/.test(s.overflowX) || s.whiteSpace==='nowrap' || s.textOverflow==='ellipsis';
      if(clips && e.scrollWidth>e.clientWidth+1) bad.push(`${name}: text ${e.scrollWidth} px in a ${e.clientWidth} px box`);
      let sc=e.parentElement; while(sc && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight>sc.clientHeight+1)) sc=sc.parentElement;   // inside a scrolling card: below the fold is not overflow
      if(r.left<-1 || r.right>W+1 || (!sc && (r.bottom>H+1 || r.top<-1))) bad.push(`${name}: outside the screen (${Math.round(r.left)}…${Math.round(r.right)} × ${Math.round(r.top)}…${Math.round(r.bottom)})`);
      const c=card(e); if(c && c!==e){ const q=c.getBoundingClientRect(); if(r.left<q.left-1 || r.right>q.right+1) bad.push(`${name}: wider than its card (${Math.round(r.left)}…${Math.round(r.right)} in ${Math.round(q.left)}…${Math.round(q.right)})`); }
      const range=document.createRange(); range.selectNodeContents(e); const tr=range.getBoundingClientRect(); if(tr.width>0 && (tr.right>r.right+2 || tr.left<r.left-2)) bad.push(`${name}: its letters run past the box (${Math.round(tr.width)} px of text, ${Math.round(r.width)} px box)`); } }
  return [...new Set(bad)]; };
const ROOTS=['start', 'nightCoach', 'nightCtl', 'nightInfo', 'nightCards', 'nightIdle'];

async function open(lang, vp, dpr){
  const ctx=await browser.newContext({ viewport:vp, deviceScaleFactor:dpr, locale:'en-US', hasTouch:vp.width<600 });
  await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.night.lang', l); localStorage.setItem('handsong.nightBg', 'dark'); }catch(e){} }, lang);
  const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('response', r=>{ if(r.status()===404) errs.push('404 '+new URL(r.url()).pathname); });
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe`);
  await p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:LIMIT });
  await p.evaluate(()=>document.fonts && document.fonts.ready); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const made=[], report={}; let nBad=0;
const shot=async (p, lang, size, name, ru)=>{ const f=`${lang}-${size}-${name}.png`; await p.evaluate(()=>document.fonts && document.fonts.ready); await p.waitForTimeout(150); await p.screenshot({ path:path.join(OUT, f) });
  const bad=await p.evaluate(OVERFLOW, ROOTS); report[f]=bad; nBad+=bad.length; made.push([f, ru, bad]); if(bad.length) console.log(`[lang-snap] ${f}: ${bad.length} overflow(s) — ${bad.slice(0, 3).join(' | ')}`); };
let control=null;
try{
  await mkdir(OUT, { recursive:true });
  for(const lang of LANGS) for(const [size, vp, dpr] of SIZES){
    const { ctx, p, errs }=await open(lang, vp, dpr);
    const htmlLang=await p.evaluate(()=>document.documentElement.lang); if(htmlLang!==lang) { console.log(`[lang-snap] ${lang}-${size}: <html lang> is ${htmlLang}`); nBad++; }
    await shot(p, lang, size, 'start', 'Стартовый экран (Privacy раскрыт)');
    await p.evaluate(()=>{ const d=document.getElementById('privacyNote'); if(d) d.open=true; }); await shot(p, lang, size, 'start-privacy', 'Старт: «Конфиденциальность» раскрыта');
    await p.click('#nightBegin'); await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:LIMIT });
    await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const SH=await import('/apps/night/shell.js'); SH.nightMusicHoldDbg(true);
      for(const id of ['nightCards', 'nightCal']){ const e=document.getElementById(id); if(e) e.hidden=true; } });
    await p.waitForTimeout(1500);
    /* the coaching line with its longest text and both buttons; the controls row shown */
    await p.evaluate(async ()=>{ const { t }=await import('/core/i18n.js'), c=document.getElementById('nightCoach'); document.getElementById('nightCoachText').textContent=t('night.coach.calib');
      document.getElementById('nightCoachNo').textContent=t('night.coach.calibNo'); document.getElementById('nightCoachYes').textContent=t('night.coach.calibYes'); document.getElementById('nightCoachBtns').hidden=false; c.hidden=false; c.classList.add('on');
      const f=document.getElementById('nightFade'); f.style.transition='none'; f.style.visibility='visible'; f.style.opacity='1'; document.getElementById('nightRoom').hidden=false; });
    await shot(p, lang, size, 'play', 'Игра: строка-подсказка (самая длинная, с кнопками) и ряд кнопок');
    await p.evaluate(()=>{ document.getElementById('nightCoach').hidden=true; });
    /* Settings: the three tabs; Write to us open on the last */
    await p.click('#nightInfoBtn'); await p.waitForTimeout(400);
    for(const [tab, ru] of [['sound', 'Настройки → Звук'], ['picture', 'Настройки → Картинка'], ['hands', 'Настройки → Руки']]){
      await p.click(`#nightSetTabs [data-tab="${tab}"]`); await p.waitForTimeout(250);
      if(tab==='hands'){ await p.evaluate(()=>{ const b=document.getElementById('nightWrite'); if(document.getElementById('nightWriteBox').hidden) b.click(); }); await p.waitForTimeout(150); }
      await shot(p, lang, size, 'set-'+tab, ru+(tab==='hands' ? ' (и «Написать нам» раскрыто)' : '')); }
    /* the CONTROL (once): a 60-letter word planted in a settings button must be caught */
    if(control==null){ const keep=await p.evaluate(()=>{ const b=document.querySelector('#nightDotsSeg button'), k=b.textContent; b.textContent='Handeinstellungszurücksetzungsbestätigungsdialogfensterknopf'; return k; });
      control=(await p.evaluate(OVERFLOW, ['nightInfo'])).length; await p.evaluate(k=>{ document.querySelector('#nightDotsSeg button').textContent=k; }, keep); }
    await p.click('#nightInfoClose'); await p.waitForTimeout(300);
    /* How to play: every card (the forest's and the rain's texts through the cards module's own list) */
    await p.evaluate(()=>document.getElementById('nightInfoBtn').click()); await p.waitForTimeout(200); await p.click('#nightHowTo'); await p.waitForTimeout(400);
    for(let i=0;i<8;i++){ const on=await p.evaluate(()=>!document.getElementById('nightCards').hidden); if(!on) break;
      await shot(p, lang, size, 'card'+(i+1), 'Карточка «Как играть» №'+(i+1)); await p.click('#nightCardNext'); await p.waitForTimeout(350); }
    /* the rain's cards: the room's own texts, put into the card as the cards module does for the rain */
    await p.evaluate(async ()=>{ const { t }=await import('/core/i18n.js'), c=document.getElementById('nightCards'); c.hidden=false;
      document.getElementById('nightCardTitle').textContent=t('night.card.rainFx.t'); document.getElementById('nightCardText').textContent=t('night.card.rainFx.b'); });
    await shot(p, lang, size, 'card-rain', 'Карточка дождя (самая длинная: «Вторая рука»)');
    if(errs.length) console.log(`[lang-snap] ${lang}-${size}: page errors — ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  /* the first visit follows the device's language; a stored choice wins (CONTROL: a device language Night lacks opens in English) */
  const first=[];
  for(const [loc, stored, want] of [['pt-BR', null, 'pt'], ['de-AT', null, 'de'], ['ka-GE', null, 'ka'], ['de-DE', 'it', 'it'], ['nl-NL', null, 'en']]){
    const ctx=await browser.newContext({ viewport:{ width:390, height:844 }, locale:loc }); if(stored) await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.night.lang', l); }catch(e){} }, stored);
    const p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe`); await p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:LIMIT });
    const got=await p.evaluate(()=>({ lang:document.documentElement.lang, begin:(document.getElementById('nightBegin')||{}).textContent, sel:(document.getElementById('langSel')||{}).value }));
    first.push({ loc, stored, want, ...got }); if(got.lang!==want || got.sel!==want){ nBad++; console.log(`[lang-snap] first visit ${loc}${stored ? ' (stored '+stored+')' : ''}: opened in ${got.lang} / menu ${got.sel}, wanted ${want}`); }
    await ctx.close(); }
  console.log('[lang-snap] first visit: '+first.map(f=>`${f.loc}${f.stored ? '+'+f.stored : ''} → ${f.lang} «${(f.begin||'').trim()}»`).join(' · '));
  report.firstVisit=first;
  const rows=made.map(([f, ru, bad])=>`<figure><img src="${f}" loading="lazy"><figcaption><b>${f.replace('.png', '')}</b> — ${ru}${bad.length ? `<br><span class="bad">Переполнение: ${bad.map(b=>b.replace(/</g, '&lt;')).join('<br>')}</span>` : ''}</figcaption></figure>`).join('\n');
  await writeFile(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>LANG-1 — все экраны на всех языках</title><style>body{ font:15px/1.45 system-ui; background:#111; color:#ddd; margin:16px; } figure{ display:inline-block; vertical-align:top; margin:0 12px 18px 0; max-width:400px; } img{ max-width:400px; max-height:560px; border:1px solid #333; } .bad{ color:#ff8a7a; }</style>
<h1>LANG-1: экраны Night на восьми языках (телефон 390 × 844 и ноутбук 1280 × 800)</h1><p>Проверка переполнения: ${nBad ? nBad+' случаев (красным под снимком)' : 'ни одного случая'}. Контроль (длинное слово в кнопке настроек) ${control>0 ? 'пойман' : 'НЕ пойман'}. Каждый язык стоит показать носителю перед запуском.</p>
${rows}`);
  await writeFile(path.join(OUT, 'lang1.json'), JSON.stringify({ langs:LANGS, overflow:report, control }, null, 1));
  const pass=nBad===0 && control>0;
  console.log(`[lang-snap] ${pass ? 'PASS' : 'NOT A PASS'} — ${made.length} captures in ${LANGS.length} language(s), ${nBad} overflow(s), CONTROL ${control>0 ? 'caught' : 'missed'} → ${path.relative(ROOT, OUT)}/index.html`);
  process.exitCode=pass ? 0 : 1;
} catch(e){ console.log('[lang-snap] NOT A PASS — error: '+(e && e.stack || e)); process.exitCode=1; }
finally{ await browser.close().catch(()=>{}); srv.close(); }
