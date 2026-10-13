/* ⛳ ПРОБЫ В БРАУЗЕРЕ ОДНОЙ КОМАНДОЙ — раннер для Claude Code и человека (слайс AUTO-PROBE).
   Открывает приложение с ?probe в браузере, которым управляет сам (Playwright, установленный в системе Chrome — без скачивания
   браузера), жмёт «▶ Играть», ждёт ОКОНЧАНИЯ P.seed({replace:true}), затем P.quick() и/или P.all() — и печатает то, что видно в
   консоли: строку на каждую пробу по её завершении, сводные строки (замороженный бас посева, страж состояния, итог) и каждый блок
   «first differences». Код выхода 0 — только если КАЖДЫЙ прогон PASS.
     node tools/probe-browser.mjs --quick            P.quick (по умолчанию, если режим не назван)
     node tools/probe-browser.mjs --all              P.all
     node tools/probe-browser.mjs --quick --all      оба на одной странице, после одного посева (как делает человек)
     node tools/probe-browser.mjs --repeat 3         P.all три раза, каждый раз — СВЕЖИЙ браузер и свой посев; затем таблица мер
                                                     строк реального времени по прогонам и запас до допуска
   Ключи: --headed (обычное окно, вынесенное за экран, вместо безголового), --browser chrome|msedge, --limit-min M (потолок на один
   P.all, умолчание 5; P.quick — 3; посев — 3), --verbose (вся консоль страницы на экран).
   ⛳ УСТРОЙСТВО (почему так):
   • Свой статический сервер на свободном порту 127.0.0.1 (не Live Server, не 5500) — поднимается и гасится скриптом; файлы с диска
     как есть, без кэша (Cache-Control: no-store), запрос (?render…) отбрасывается — так же, как его видит любой статический сервер.
   • Свежий временный профиль на каждый браузер (chromium.launch — свой профиль во временной папке, удаляется при закрытии): данные и
     песни человека в его браузере не трогаются никогда.
   • Камера — поддельное устройство Chrome (--use-fake-device-for-media-stream; рук в кадре нет — пробы этого и ждут), разрешения без
     окна (--use-fake-ui-for-media-stream + grantPermissions), автозапуск звука без жеста (--autoplay-policy=no-user-gesture-required),
     фоновые таймеры и отрисовка не душатся (--disable-background-timer-throttling и др.).
   • Полная консоль страницы — в файл tools/.probe-logs/<время>-<режим>.log (в .gitignore); на экран — только строки проб.
   ⚠️ Нужен интернет: MediaPipe грузится с CDN (как у приложения). */
import http from 'node:http';
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGDIR=path.join(ROOT,'tools','.probe-logs');
const argv=process.argv.slice(2), has=f=>argv.includes(f), val=(f,d)=>{ const i=argv.indexOf(f); return i>=0&&argv[i+1]!=null ? argv[i+1] : d; };
const REPEAT=+val('--repeat',0)||0;
let QUICK=has('--quick'), ALL=has('--all');
if(!QUICK && !ALL && !REPEAT) QUICK=true;
const EVAL=val('--eval',null);
const LEAK=has('--leak');
if((EVAL||LEAK) && !has('--quick') && !has('--all')) QUICK=false;
const HEADED=has('--headed'), VERBOSE=has('--verbose'), BROWSER=val('--browser','chrome');
const LIMIT_ALL=(+val('--limit-min',5)||5)*60e3, LIMIT_QUICK=3*60e3, LIMIT_SEED=3*60e3, LIMIT_START=3*60e3;
/* Строки реального времени и съёма — для таблицы --repeat (их меры печатаются по прогонам). Имена — строки P.all. */
const RT_ROWS=['LR1 live and frozen reverb agree','AF2 freeze swap inaudible','AF6b 16-bit frozen playback','MX1 track level and master','MX2 track pan','render repeatability','renders serialized','S4 solo editing'];

const out=s=>process.stdout.write(s+'\n');
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
let LOG=null;
const log=async s=>{ if(LOG) await appendFile(LOG, s+'\n'); };

/* ---------- статический сервер ---------- */
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.md':'text/plain; charset=utf-8' };
function serve(){
  const srv=http.createServer(async (q,r)=>{
    try{
      const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
      const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
      const b=await readFile(f);
      r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b);
    }catch(e){ r.writeHead(404); r.end(); }
  });
  return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res(srv)));
}

/* ---------- process memory (OS): private bytes and threads of the given pids, summed ---------- */
function procMem(ids){
  const out={ privateMB:0, workingMB:0, threads:0 };
  if(!ids.length) return out;
  try{
    if(process.platform==='win32'){
      const r=execFileSync('powershell',['-NoProfile','-Command',`Get-Process -Id ${ids.join(',')} | ForEach-Object { "$($_.PrivateMemorySize64) $($_.WorkingSet64) $($_.Threads.Count)" }`],{ encoding:'utf8' });
      for(const l of r.trim().split(/\r?\n/)){ const [a,b,c]=l.trim().split(/\s+/).map(Number); out.privateMB+=a/1048576; out.workingMB+=b/1048576; out.threads+=c; }
    } else for(const id of ids){ const t=execFileSync('cat',[`/proc/${id}/status`],{ encoding:'utf8' });
      const g=k=>{ const m=t.match(new RegExp(k+':\\s+(\\d+)')); return m?+m[1]:0; }; out.privateMB+=g('RssAnon')/1024; out.workingMB+=g('VmRSS')/1024; out.threads+=g('Threads'); }
  }catch(e){ out.error=String(e&&e.message||e); }
  out.privateMB=+out.privateMB.toFixed(1); out.workingMB=+out.workingMB.toFixed(1);
  return out;
}

/* ---------- --leak (RENDER-LEAK): N consecutive track renders keep renderer memory within a margin of the start; control: the same
   N renders with the fix off (KS worklet always loaded → each offline context pinned) must exceed it. Short renders (the probe window)
   of the smallest track without a KS timbre; the watcher is paused (runner). ---------- */
const LEAK_N=30, LEAK_MARGIN_MB=20;
async function LEAK_PAGE({ N, margin }){
  const R=await import('./src/render.js'), REC=await import('./src/recorder.js'), A=await import('./src/audio.js');
  const span=l=>{ const ts=REC.events.filter(e=>e.layer===l).map(e=>e.t); return Math.max(...ts)-Math.min(...ts); };
  const isKS=l=>REC.events.some(e=>e.layer===l&&(e.fn==='leadOn'||e.fn==='leadSet')&&e.a&&e.a.inst!=null&&e.a.inst>=A.LEAD_KS_FROM);
  const ly=[...new Set(REC.events.map(e=>e.layer))].filter(l=>!isKS(l)&&!REC.events.some(e=>e.layer===l&&e.fn==='drone')).sort((a,b)=>span(a)-span(b))[0];
  if(ly==null) return { ok:false, why:'no track without a KS timbre' };
  const keep=R.renderKsLazy();
  const go=async n=>{ const ms=[]; for(let i=0;i<n;i++){ const a=performance.now(); const r=await R.renderTrack(ly,{ short:1, quiet:true }); ms.push(performance.now()-a); if(r.buf) r.buf=null; } return ms; };
  try{
    R.renderKsLazy(true); await go(2);
    const m0=await window.__procMem(); const ms=await go(N); const m1=await window.__procMem();
    R.renderKsLazy(false); await go(N); const m2=await window.__procMem();
    const fixMB=+(m1.privateMB-m0.privateMB).toFixed(1), ctrlMB=+(m2.privateMB-m1.privateMB).toFixed(1);
    return { ok:true, track:'L'+(ly+1), n:N, msPerRender:Math.round(ms.reduce((a,b)=>a+b,0)/ms.length), fixMB, ctrlMB, thr:[m0.threads,m1.threads,m2.threads],
             pass: fixMB<=margin && ctrlMB>margin };
  } finally { R.renderKsLazy(keep); }
}

/* ---------- срок ---------- */
function within(p, ms, what){ let t; return Promise.race([ p.finally(()=>clearTimeout(t)), new Promise((_,rej)=>{ t=setTimeout(()=>rej(new Error(`TIME LIMIT — ${what} did not finish within ${Math.round(ms/1000)} s`)), ms); }) ]); }

/* ---------- одна страница: старт, посев, прогоны ---------- */
async function session(port, plan, label){
  const args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'];
  if(HEADED) args.push('--window-position=-2600,0','--window-size=1280,800');   // обычное окно, но за экраном: вкладка видима, кадры идут
  const browser=await chromium.launch({ channel:BROWSER, headless:!HEADED, args });
  const res={ label, runs:[], seed:null, error:null };
  let page=null;
  try{
    const ctx=await browser.newContext({ viewport:{ width:1280, height:800 } });
    const origin=`http://127.0.0.1:${port}`;
    await ctx.grantPermissions(['camera','microphone'],{ origin });
    page=await ctx.newPage();
    const seen=[];   // строки проб этого прогона (для сводки)
    page.on('console', async m=>{ const tx=m.text(), ty=m.type();
      await log(`[${ty}] ${tx}`);
      const probeLine=/^\[(scaleprobe|probe)/.test(tx);
      if(probeLine) seen.push(tx);
      if(VERBOSE || probeLine){
        if(/^\[scaleprobe row\]/.test(tx)) out('  '+tx.replace(/^\[scaleprobe row\] /,'row '));
        else if(/^\[scaleprobe seed\]/.test(tx)) out('  '+tx);
        else if(/^\[scaleprobe all\]/.test(tx) || /^ {3}/.test(tx) || VERBOSE) out('  '+tx);
      } else if(/^ {3}/.test(tx)) out('  '+tx);   // строки «first differences» (с отступом)
    });
    page.on('pageerror', async e=>{ await log('[pageerror] '+(e&&e.stack||e)); out('  [pageerror] '+(e&&e.message||e)); });
    await page.goto(`${origin}/index.html?probe`);
    out(`[${label}] page open — waiting for the app and the probe module`);
    await within(page.waitForFunction(()=>window.P && window.R, null, { timeout:0 }), 60e3, 'loading the app');
    await page.click('#startBtn');
    out(`[${label}] ▶ Play pressed — waiting for the start (hand-tracking model from the CDN, fake camera)`);
    await within(page.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:0 }), LIMIT_START, 'the app start');
    const env=await page.evaluate(async ()=>{ const A=await import('./src/audio.js'); return { hidden:document.hidden, visibility:document.visibilityState, ac:A.AC&&A.AC.state, rate:A.AC&&A.AC.sampleRate, ua:navigator.userAgent }; });
    res.env=env;
    out(`[${label}] started — audio ${env.ac} at ${env.rate} Hz, tab ${env.visibility}${env.hidden?' (HIDDEN — drawn-window rows will not run)':''}`);
    /* AF3: the auto-freeze watcher is paused for the whole runner session (probes drive it with their own clock); resumed before closing */
    await page.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', true); });
    /* посев: ждём ОКОНЧАНИЯ (его итог — строка «Now run P.all()») */
    const t0=Date.now();
    /* страж консоли: P.seed пускаем, НЕ дожидаясь, и тут же «набираем» P.quick() — обязан отказать словами (как у человека, набравшего его рано) */
    await page.evaluate(()=>{ window.__seedP=P.seed({replace:true}); return true; });
    const g=await page.evaluate(()=>{ const r=P.quick(); return r&&typeof r.then!=='function' ? r : { started:true }; });
    res.guard= !!(g && g.refused && /P\.seed is still running/.test(g.why||''));
    out(`[${label}] console guard: P.quick() typed during P.seed → ${res.guard?'refused: "'+g.why+'"':'NOT REFUSED — '+JSON.stringify(g)}`);
    res.seed=await within(page.evaluate(async ()=>{ const r=await window.__seedP; return r ? { events:r.events, material:r.material&&r.material.ok, missing:r.material&&r.material.missing, built:r.built } : null; }), LIMIT_SEED, 'P.seed');
    /* итог посева — строка «Now run P.all()»; событие консоли доходит чуть позже возврата evaluate — ждём её до 3 с */
    for(let i=0;i<60 && !seen.some(l=>/Now run P\.all\(\)/.test(l));i++) await page.waitForTimeout(50);
    const seedOk=!!(res.seed && res.seed.material && seen.some(l=>/Now run P\.all\(\)/.test(l)));
    out(`[${label}] P.seed finished in ${((Date.now()-t0)/1000).toFixed(1)} s — ${res.seed?res.seed.events+' events, material '+(res.seed.material?'complete':'INCOMPLETE'):'refused'}`);
    if(!seedOk){ res.error='P.seed did not finish with complete material'; return res; }
    if(!res.guard){ res.error='the console guard did not refuse P.quick() during P.seed'; return res; }
    if(EVAL||LEAK){   // memory helpers for --eval and --leak
      /* window.__heap(): full GC, then V8 heap usage incl. ArrayBuffer backing stores (memory checks in --eval only) */
      const cdp=await ctx.newCDPSession(page);
      await page.exposeFunction('__heap', async ()=>{ await cdp.send('HeapProfiler.collectGarbage'); return await cdp.send('Runtime.getHeapUsage'); });
      /* window.__procMem(): full GC, then the renderer processes' private memory and thread count from the OS (native memory the V8
         heap does not see — offline audio contexts, their graphs and worklet threads) */
      const bcdp=await browser.newBrowserCDPSession();
      await page.exposeFunction('__procMem', async ()=>{ await cdp.send('HeapProfiler.collectGarbage'); await new Promise(r=>setTimeout(r,300)); await cdp.send('HeapProfiler.collectGarbage');
        const pi=await bcdp.send('SystemInfo.getProcessInfo'); const ids=pi.processInfo.filter(x=>x.type==='renderer').map(x=>x.id);
        return { ids, ...procMem(ids) }; });
    }
    if(LEAK){ res.leak=await within(page.evaluate(LEAK_PAGE, { N:LEAK_N, margin:LEAK_MARGIN_MB }), LIMIT_ALL, '--leak');
      const L=res.leak; res.leakPass=!!(L&&L.ok&&L.pass);
      out(`[${label}] --leak: ${L&&L.ok ? `${L.track} (no KS timbre), ${L.n} renders each, ${L.msPerRender} ms per render · with the fix ${L.fixMB>=0?'+':''}${L.fixMB} MB (margin ${LEAK_MARGIN_MB} MB), threads ${L.thr.join(' → ')} · CONTROL without the fix +${L.ctrlMB} MB (must exceed the margin) → ${L.pass?'PASS':'NOT A PASS'}` : 'ERROR — '+(L&&L.why)}`); }
    if(EVAL){   // --eval <файл>: тело async-функции, выполняется на странице после посева; печатается её JSON (отладка проб)
      const src=await readFile(path.resolve(EVAL),'utf8');
      out(`[${label}] --eval ${EVAL}`);
      const r=await within(page.evaluate(async code=>{ const f=new Function('return (async()=>{'+code+'\n})()'); try{ return { ok:true, value:await f() }; }catch(e){ return { ok:false, error:String(e&&e.stack||e) }; } }, src), LIMIT_ALL, '--eval');
      out(JSON.stringify(r, null, 1));
      res.evalResult=r;
    }
    for(const kind of plan){
      out(`[${label}] running P.${kind}() — one line per row as it finishes`);
      const ts=Date.now();
      const r=await within(page.evaluate(async k=>{ const r=await P[k]({ progress:true }); return r ? { pass:r.pass, seconds:r.seconds, hidden:r.hidden, rows:r.rows, measures:r.measures||{}, material:r.material&&r.material.ok } : null; }, kind),
                           kind==='all'?LIMIT_ALL:LIMIT_QUICK, `P.${kind}()`);
      for(let i=0;i<60 && !seen.some(l=>/P\.(all|quick): (PASS|NOT A PASS)/.test(l));i++) await page.waitForTimeout(50);   // итоговая строка — событием консоли, чуть позже
      res.runs.push({ kind, ...r, wall:(Date.now()-ts)/1000, lines:seen.filter(l=>/^\[scaleprobe all\]/.test(l)).slice(-12) });
      seen.length=0;
    }
  }catch(e){ res.error=String(e&&e.message||e); out(`[${label}] ERROR — ${res.error}`); }
  finally{ if(page) await page.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', false); }).catch(()=>{}); await browser.close().catch(()=>{}); }
  return res;
}

/* ---------- сводка ---------- */
const fmt=(v,w)=>String(v).padEnd(w);
function rowsTable(r){
  out(`  ${fmt('row',44)}${fmt('status',30)}${fmt('diff',8)}ms`);
  for(const x of r.rows) out(`  ${fmt(x.check,44)}${fmt(x.status,30)}${fmt(x.differences,8)}${x.ms}`);
}
function repeatTable(sessions){
  out('\n=== --repeat: measured values of the real-time rows, per run (margin = distance to the tolerance; negative = over it) ===');
  const names=new Set();
  for(const s of sessions) for(const run of s.runs) for(const k of Object.keys(run.measures||{})) names.add(k);
  for(const row of RT_ROWS.filter(n=>names.has(n)).concat([...names].filter(n=>!RT_ROWS.includes(n)))){
    out(`\n  ${row}`);
    const keys=new Map();
    sessions.forEach((s,i)=>{ const run=s.runs.find(r=>r.kind==='all'); const M=run&&run.measures&&run.measures[row]; if(!M) return;
      for(const m of M){ if(!keys.has(m.name)) keys.set(m.name,{ m, vals:[] }); keys.get(m.name).vals[i]=m; } });
    for(const [name,{m,vals}] of keys){
      const cells=sessions.map((_,i)=>{ const v=vals[i]; if(!v) return fmt('—',22);
        const mg= v.limit==null ? '' : v.dir==='max' ? v.limit-v.value : v.dir==='min' ? v.value-v.limit : v.dir==='abs' ? v.limit-Math.abs(v.value) : null;
        return fmt(`${v.value}${v.unit||''}${mg===''||mg==null?'':` (${mg>=0?'+':''}${+mg.toFixed(3)})`}`,22); }).join('');
      const lim= m.limit==null ? 'info' : `${m.dir==='max'?'≤':m.dir==='min'?'≥':'|x|≤'} ${m.limit}${m.unit||''}`;
      out(`    ${fmt(name,46)}${fmt(lim,14)}${cells}`);
    }
  }
}

/* ---------- main ---------- */
await mkdir(LOGDIR,{ recursive:true });
const mode=REPEAT?`repeat${REPEAT}`:[QUICK&&'quick',ALL&&'all',LEAK&&'leak'].filter(Boolean).join('+');
LOG=path.join(LOGDIR, `${stamp()}-${mode}.log`);
await writeFile(LOG, `probe-browser ${argv.join(' ')}\n`);
const srv=await serve(), port=srv.address().port;
out(`[probe-browser] ${BROWSER}, ${HEADED?'headed window placed off-screen':'headless'}; static server http://127.0.0.1:${port}; full console log → ${path.relative(ROOT,LOG)}`);
const T00=Date.now();
const sessions=[];
let pass=true;
try{
  if(REPEAT){
    for(let i=1;i<=REPEAT;i++){ out(`\n[probe-browser] run ${i} of ${REPEAT} — fresh browser, fresh profile`); await log(`===== run ${i} of ${REPEAT} =====`);
      sessions.push(await session(port, QUICK?['quick','all']:['all'], `run ${i}/${REPEAT}`)); }
  } else sessions.push(await session(port, [QUICK&&'quick', ALL&&'all'].filter(Boolean), mode||'eval'));
} finally { srv.close(); }
out('\n=== summary ===');
for(const s of sessions){
  if(s.error){ pass=false; out(`[${s.label}] NOT A PASS — ${s.error}`); }
  for(const r of s.runs){
    out(`\n[${s.label}] P.${r.kind}: ${r.pass?'PASS':'NOT A PASS'} · ${r.seconds} s in the page (${r.wall.toFixed(1)} s wall)`);
    rowsTable(r);
    for(const l of r.lines) if(/frozen seed bass|state guard|P\.(all|quick):/.test(l)) out('  '+l);
    if(!r.pass) pass=false;
  }
  if(!s.runs.length && !s.error && !EVAL && !LEAK) pass=false;
  if(EVAL && !(s.evalResult&&s.evalResult.ok)) pass=false;
  if(LEAK){ if(!s.leakPass) pass=false; const L=s.leak; out(`[${s.label}] --leak: ${L&&L.ok?`${L.pass?'PASS':'NOT A PASS'} — ${L.n} renders: +${L.fixMB} MB with the fix (margin ${LEAK_MARGIN_MB} MB), control +${L.ctrlMB} MB`:'ERROR '+(L&&L.why)}`); }
}
if(REPEAT) repeatTable(sessions);
out(`\n[probe-browser] ${pass?'PASS':'NOT A PASS'} — ${sessions.length} browser session(s), ${sessions.reduce((n,s)=>n+s.runs.length,0)} probe run(s) · ${((Date.now()-T00)/1000).toFixed(1)} s total · log ${path.relative(ROOT,LOG)}`);
process.exitCode=pass?0:1;
