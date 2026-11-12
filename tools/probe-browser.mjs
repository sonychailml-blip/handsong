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
   P.all, default 15 since LAT2 (8 since GOLD1); посев — 3), --verbose (вся консоль страницы на экран).
   --limit-quick M: P.quick's limit in minutes; without it 3 min × the slow factor measured from P.quick's own rows (see SLOW_REF).
   --cdn-cache: serve the pinned MediaPipe files from tools/.cdn-cache/ (fetched once; for a slow network).
   --limit-start M: the app start limit in minutes (default 3; the hand model comes from the CDN — raise it on a slow network).
   Hygiene: at start it lists browsers left by earlier runner sessions (found by Playwright's temporary profile path) and orphaned
   profile folders; --kill-stale kills / removes them (--clean-only: only that, then exit). Every exit path (end, failure, time limit,
   Ctrl+C, SIGTERM, uncaught error) closes the browser with a bounded wait, then kills its process tree, then closes the server;
   --selftest-exit sigint|error fires one of those paths 3 s after ▶ (a cleanup test; the run fails by design).
   UI checks with trusted input after the seed (section rename by double click / double tap / §✎, with its control; a bend point dragged
   with the mouse); --no-ui skips them.
   PRIV1: every Content-Security-Policy violation of the session fails the run; CONTROL — a fetch to https://example.com must be refused
   by connect-src (every session). LAT2: every request of the session — the page's and its workers' (a worker has no page CSP of its own)
   — must go to the own origin or the MediaPipe paths of the register; anything else fails the run.
   CORE-11: the storage census — every localStorage key and IndexedDB name the page touches; Night only its own names and two device facts,
   Full its names as before (each with a control); anything else fails the run.
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
import { readFile, mkdir, writeFile, appendFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';   // CORE-20: --measure-start's ETags

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* --cdn-cache: the pinned MediaPipe files (library, WASM, hand model — versioned URLs) are fetched once into tools/.cdn-cache/ and served
   from there on later runs (a slow network made the app start miss its limit). Off by default: a normal run loads them from the CDN. */
const CDN_CACHE=process.argv.includes('--cdn-cache'), CDN_DIR=path.join(ROOT,'tools','.cdn-cache');
async function cdnCache(ctx){
  await mkdir(CDN_DIR,{ recursive:true });
  const keyOf=u=>Buffer.from(u).toString('base64url').slice(-120);
  const serve=async route=>{ const u=route.request().url(), f=path.join(CDN_DIR,keyOf(u));
    try{ const meta=JSON.parse(await readFile(f+'.json','utf8')); return route.fulfill({ status:200, headers:meta.headers, body:await readFile(f) }); }catch(e){ /* not cached yet */ }
    const r=await route.fetch({ timeout:0 }), body=await r.body(), h=r.headers();
    const headers={ 'content-type':h['content-type']||'application/octet-stream', 'access-control-allow-origin':'*' };
    if(r.status()===200){ await writeFile(f,body); await writeFile(f+'.json',JSON.stringify({ url:u, headers })); }
    return route.fulfill({ status:r.status(), headers, body }); };
  await ctx.route(/^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models)\//, serve);
}
const LOGDIR=path.join(ROOT,'tools','.probe-logs');
const argv=process.argv.slice(2), has=f=>argv.includes(f), val=(f,d)=>{ const i=argv.indexOf(f); return i>=0&&argv[i+1]!=null ? argv[i+1] : d; };
const REPEAT=+val('--repeat',0)||0;
let QUICK=has('--quick'), ALL=has('--all');
if(!QUICK && !ALL && !REPEAT && !has('--night')) QUICK=true;   // RUN 7: --night alone runs only P.night
/* SPLIT-2: --app full|night picks the page (night: no seed, no UI song checks, P.night by default); --json FILE writes the results for tools/split-compare.mjs;
   --dump NAME FILE writes the JSON of P[NAME]() (a baseline made on unchanged code). */
const APP=val('--app','full'), JSON_OUT=val('--json',null), DUMP=(()=>{ const i=argv.indexOf('--dump'); return i>=0 ? [argv[i+1], argv[i+2]] : null; })();
const NIGHT_PAGE=APP==='night';
/* --root DIR: serve a built preview (tools/build.mjs --probes): the page is at its root */
const SERVE_ROOT=val('--root',null) ? path.resolve(val('--root',null)) : ROOT, ENTRY=SERVE_ROOT!==ROOT ? '/index.html?probe' : NIGHT_PAGE ? '/apps/night/index.html?probe' : '/apps/full/index.html?probe';
if(NIGHT_PAGE && !has('--quick') && !has('--all')) QUICK=false;
if(DUMP && !has('--quick') && !has('--all') && !has('--night')) QUICK=false;
const EVAL=val('--eval',null);
const LEAK=has('--leak');
if((EVAL||LEAK) && !has('--quick') && !has('--all')) QUICK=false;
const HEADED=has('--headed'), VERBOSE=has('--verbose'), BROWSER=val('--browser','chrome');
const LIMIT_ALL=(+val('--limit-min',15)||15)*60e3, LIMIT_SEED=3*60e3, LIMIT_START=(+val('--limit-start',3)||3)*60e3;   // --limit-start M: the app start (model from the CDN) — longer on a slow network
/* --limit-quick M: P.quick's limit in minutes. Given → used as is. Not given → 3 min × the machine's SLOW FACTOR, measured while P.quick
   runs (a busy computer ran rows 3–4× slower and P.quick missed a fixed 3 min with 0 differences): every finished row that has a
   reference time below (CPU-bound rows of an idle dev-desktop run, 2026-10-15 16:48, P.quick 112.9 s; time-based rows — LAT*, CAM* —
   are left out) adds its time to the measure; factor = observed sum / reference sum once SLOW_ROWS rows are in, 1 below SLOW_MIN, at
   most SLOW_MAX; the deadline moves with it. A row renamed or new simply does not count. */
const LIMIT_QUICK_ARG=val('--limit-quick',null), LIMIT_QUICK_BASE=3*60e3;
const SLOW_REF={ 'render repeatability':7482, 'renders serialized':7147, 'ED7 one history':6141, 'ED7-fix2 undo after clear':5965,
  'MX2 track pan':5560, 'BEND-CURVE glides and shapes':5143, 'AF5 track and live isolated':4795, 'MX1 track level and master':3021,
  'SND-F1 dynamics: curve, latency, ceiling':2801, 'S4 solo editing':2543, 'F7 Just intonation merge':2337, 'T4b4-1 row fixes':2017 };
const SLOW_ROWS=3, SLOW_MIN=1.2, SLOW_MAX=6;
function slowMeter(){ let obs=0, ref=0, n=0;
  return { row(name, ms){ if(SLOW_REF[name]>0 && ms>0){ obs+=ms; ref+=SLOW_REF[name]; n++; } },
    get n(){ return n; }, get raw(){ return ref ? obs/ref : 1; },
    get f(){ const r=ref?obs/ref:1; return n<SLOW_ROWS||r<SLOW_MIN ? 1 : Math.min(SLOW_MAX, r); } }; }
/* within() with a deadline that may move (P.quick's slow factor): checked every second */
function withinDyn(p, deadline, what){ let t; return Promise.race([ p.finally(()=>clearInterval(t)), new Promise((_,rej)=>{ t=setInterval(()=>{ const d=deadline();
  if(Date.now()>d.at){ clearInterval(t); rej(new Error(`TIME LIMIT — ${what} did not finish within ${Math.round(d.ms/1000)} s${d.note||''}`)); } }, 1000); }) ]); }
/* Строки реального времени и съёма — для таблицы --repeat (их меры печатаются по прогонам). Имена — строки P.all. */
const RT_ROWS=['LR1 live and frozen reverb agree','AF2 freeze swap inaudible','AF6b 16-bit frozen playback','MX1 track level and master','MX2 track pan','render repeatability','renders serialized','S4 solo editing'];

const out=s=>process.stdout.write(s+'\n');
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
let LOG=null;
const log=async s=>{ if(LOG) await appendFile(LOG, s+'\n'); };

/* ---------- hygiene: browsers and profiles left by earlier runner sessions ----------
   Playwright launches every browser with a fresh profile under os.tmpdir() named PROFILE_TAG-xxxxxx; that path in a command line is
   the runner's fingerprint. A hard kill of node (a tool timeout) runs no handler, so the next start looks for what was left. */
const PROFILE_TAG='playwright_chromiumdev_profile';
const KILL_STALE=has('--kill-stale')||has('--clean-only'), CLEAN_ONLY=has('--clean-only');
function procList(){
  try{
    if(process.platform==='win32'){
      const q=`Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe' OR Name='chromium.exe' OR Name='node.exe'" | Select-Object ProcessId,ParentProcessId,Name,CommandLine,@{n='Started';e={$_.CreationDate.ToString('s')}} | ConvertTo-Json -Compress`;
      const r=execFileSync('powershell',['-NoProfile','-Command',q],{ encoding:'utf8', maxBuffer:64<<20, windowsHide:true });
      const j=r.trim()?JSON.parse(r):[]; return (Array.isArray(j)?j:[j]).map(p=>({ pid:p.ProcessId, ppid:p.ParentProcessId, name:p.Name, cmd:p.CommandLine||'', started:p.Started }));
    }
    const r=execFileSync('ps',['-eo','pid=,ppid=,lstart=,args='],{ encoding:'utf8', maxBuffer:64<<20 });
    return r.trim().split('\n').map(l=>{ const m=l.trim().match(/^(\d+)\s+(\d+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d+)\s+(.*)$/); return m&&{ pid:+m[1], ppid:+m[2], started:m[3], cmd:m[4], name:m[4].split(/\s/)[0] }; }).filter(Boolean);
  }catch(e){ return null; }
}
const profOf=c=>{ const m=c.match(new RegExp(PROFILE_TAG+'-[A-Za-z0-9]+')); return m&&m[0]; };
/* runner browsers grouped by profile; a group is LEFTOVER unless its main process's parent is a live node (a runner running now) */
function runnerBrowsers(){
  const L=procList(); if(!L) return null;
  const alive=new Map(L.map(p=>[p.pid,p])), groups=new Map();
  for(const p of L){ const pr=profOf(p.cmd); if(!pr) continue; if(!groups.has(pr)) groups.set(pr,{ profile:pr, procs:[], main:null }); const g=groups.get(pr); g.procs.push(p); if(!/--type=/.test(p.cmd)) g.main=p; }
  for(const g of groups.values()){ const par=g.main&&alive.get(g.main.ppid); g.owner= par&&/node/i.test(par.name||par.cmd) ? par.pid : null; g.mine= g.owner===process.pid; }
  return [...groups.values()];
}
function killTree(pid){ try{ if(process.platform==='win32') execFileSync('taskkill',['/PID',String(pid),'/T','/F'],{ stdio:'ignore', windowsHide:true }); else process.kill(pid,'SIGKILL'); return true; }catch(e){ return false; } }
async function rmProfile(dir){ for(let i=0;i<5;i++){ try{ await rm(dir,{ recursive:true, force:true }); return true; }catch(e){ await new Promise(r=>setTimeout(r,400)); } } return false; }
async function staleScan(){
  const G=runnerBrowsers();
  if(!G){ out('[probe-browser] hygiene: could not list processes (skipped)'); return; }
  const left=G.filter(g=>!g.owner), other=G.filter(g=>g.owner&&!g.mine);
  const used=new Set(G.map(g=>g.profile));
  let dirs=[]; try{ dirs=(await readdir(os.tmpdir())).filter(n=>n.startsWith(PROFILE_TAG)&&!used.has(n)); }catch(e){}
  for(const g of other) out(`[probe-browser] hygiene: a runner session is running now (node pid ${g.owner}, ${g.procs.length} browser processes, ${g.profile}) — left alone`);
  if(!left.length && !dirs.length){ out('[probe-browser] hygiene: no leftover runner browsers, no orphaned profiles'); return; }
  for(const g of left) out(`[probe-browser] hygiene: LEFTOVER runner browser — ${g.procs.length} processes, main pid ${g.main?g.main.pid:'?'} started ${g.main?g.main.started:'?'}, ${g.profile}${KILL_STALE?'':' (run with --kill-stale to kill it)'}`);
  if(dirs.length) out(`[probe-browser] hygiene: ${dirs.length} orphaned profile folder(s) in ${os.tmpdir()}${KILL_STALE?'':' (--kill-stale removes them)'}`);
  if(!KILL_STALE) return;
  for(const g of left){ const ok=g.main?killTree(g.main.pid):g.procs.map(p=>killTree(p.pid)).some(Boolean); out(`[probe-browser] hygiene: killed ${g.profile} → ${ok?'done':'FAILED'}`); dirs.push(g.profile); }
  let n=0; for(const d of dirs) if(await rmProfile(path.join(os.tmpdir(),d))) n++;
  out(`[probe-browser] hygiene: removed ${n} of ${dirs.length} profile folder(s)`);
}

/* every browser this process launched is closed on every exit path (bounded wait, then its process tree), then the server */
const LIVE={ browsers:new Set(), srv:null, closing:null };
const timeout=(ms,v)=>new Promise(r=>setTimeout(()=>r(v),ms));
async function closeBrowser(b){
  if(!LIVE.browsers.has(b)) return; LIVE.browsers.delete(b);
  const ok=await Promise.race([ b.close().then(()=>true,()=>false), timeout(10e3,false) ]);
  const mine=(runnerBrowsers()||[]).filter(g=>g.mine);   // whatever is still ours after close
  for(const g of mine){ if(g.main) killTree(g.main.pid); else g.procs.forEach(p=>killTree(p.pid)); await rmProfile(path.join(os.tmpdir(),g.profile)); }
  if(!ok || mine.length) out(`[probe-browser] browser close ${ok?'returned':'TIMED OUT'}; ${mine.length} process group(s) killed by tree`);
}
function closeAll(){ return LIVE.closing||(LIVE.closing=(async()=>{ for(const b of [...LIVE.browsers]) await closeBrowser(b); if(LIVE.srv){ if(LIVE.srv.closeAllConnections) LIVE.srv.closeAllConnections(); LIVE.srv.close(); LIVE.srv=null; } })()); }
let EXITING=false;
async function bail(code, why){
  if(EXITING) return; EXITING=true; out(`\n[probe-browser] ${why} — closing the browser and the server`);
  await Promise.race([ closeAll(), timeout(20e3) ]);
  const left=(runnerBrowsers()||[]).filter(g=>g.mine); out(`[probe-browser] cleanup done — ${left.length?left.length+' process group(s) STILL ALIVE':'no runner browser left'}`);
  process.exit(code);
}
process.on('SIGINT', ()=>bail(130,'interrupted (Ctrl+C)'));
process.on('SIGTERM', ()=>bail(143,'terminated (SIGTERM)'));
process.on('SIGHUP', ()=>bail(129,'hang-up (SIGHUP)'));
process.on('uncaughtException', e=>bail(1,'uncaught error: '+(e&&e.stack||e)));
process.on('unhandledRejection', e=>bail(1,'unhandled rejection: '+(e&&e.stack||e)));

/* ---------- статический сервер ---------- */
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.md':'text/plain; charset=utf-8', '.mp3':'audio/mpeg' };
function serve(){
  const srv=http.createServer(async (q,r)=>{
    try{
      const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
      const base=p.startsWith('/tools/.probe-logs/') ? ROOT : SERVE_ROOT, f=path.join(base, p); if(!f.startsWith(base)){ r.writeHead(403); r.end(); return; }
      let b=await readFile(f);
      /* the measured page: its probes tag out (only what a visitor loads is counted); &nomp also takes out the build's modulepreload links (no routes: they turn the HTTP cache off) */
      if(MEASURE && /\/index\.html$/.test(p) && !p.startsWith('/tools/')){ let h=b.toString('utf8').replace(/<link rel="handsong-probes"[^>]*>\r?\n?/, ''); if(u.searchParams.has('nomp')) h=h.replace(/<link rel="modulepreload"[^>]*>\r?\n?/g, ''); b=Buffer.from(h, 'utf8'); }
      if(MEASURE){ const tag='"'+createHash('sha1').update(b).digest('hex').slice(0,16)+'"';   // CORE-20 --measure-start: revalidated like a static host (Vercel: max-age=0, must-revalidate, ETag)
        if(q.headers['if-none-match']===tag){ r.writeHead(304,{ etag:tag, 'cache-control':'public, max-age=0, must-revalidate' }); r.end(); return; }
        r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'public, max-age=0, must-revalidate', etag:tag }); r.end(b); return; }
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
  const R=await import('/core/render.js'), REC=await import('/core/recorder.js'), A=await import('/core/audio.js');
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

/* ---------- UI check with REAL input (ED6 rename fix): a double click / double tap on a section marker opens its name field and keeps it ----------
   Synthetic DOM events carry no default actions (the focus move of a press), so this runs from here with trusted input: Playwright's mouse
   and CDP touch. The page part puts one marker in the window and reports its screen point; after the gesture the field must be visible and
   focused 400 ms later; typing a name + Enter must rename the marker. CONTROL (when the app has the switch): the old behaviour — the field
   opened inside the second press, no blur guard — must fail. Everything is undone: the window closed, the marker removed, the history reset. */
async function uiSecRename(page, cdp, label){
  const lines=[], bad=[];
  const prep=await page.evaluate(async ()=>{
    const UI=await import('/core/legacy-ui/ui.js'), REC=await import('/core/recorder.js'), D=await import('/core/legacy-ui/draw.js');
    UI.arrApi.open();
    const M=REC.loop.metre; let m=REC.sections()[0];
    if(!m){ m=REC.secAdd(M,'Probe'); }
    for(let i=0;i<4;i++) await new Promise(r=>requestAnimationFrame(()=>r()));
    const g=D.arrGeom(), r=document.getElementById('canvas').getBoundingClientRect();
    const mk=g&&g.sec&&g.sec.marks.find(x=>x.id===m.id);
    if(!mk) return { ok:false, why:'the marker is not drawn in the window' };
    return { ok:true, id:m.id, x:r.left+(mk.x0+mk.x1)/2, y:r.top+(g.sec.y0+g.sec.y1)/2, ctl:!!(UI.arrApi.secRenameDbg) };
  });
  if(!prep.ok) return { pass:false, lines:[`${label}: ${prep.why}`] };
  const state=()=>page.evaluate(()=>{ const el=document.getElementById('secNameIn'); return { open:!!el&&!el.hidden, focused:document.activeElement===el }; });
  const nameOf=id=>page.evaluate(async id=>{ const REC=await import('/core/recorder.js'); const m=REC.sections().find(x=>x.id===id); return m&&m.name; }, prep.id);
  const touchTap=async(x,y)=>{ const p=[{ x, y, radiusX:6, radiusY:6, force:1, id:1 }];
    await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart', touchPoints:p }); await page.waitForTimeout(40);
    await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd', touchPoints:[] }); };
  const tryOne=async(how, name)=>{
    if(how==='mouse') await page.mouse.dblclick(prep.x, prep.y, { delay:30 });
    else { await touchTap(prep.x,prep.y); await page.waitForTimeout(120); await touchTap(prep.x,prep.y); }
    await page.waitForTimeout(400);
    const s=await state();
    if(!s.open||!s.focused) return `${how}: after the double ${how==='mouse'?'click':'tap'} the name field is ${s.open?'open but not focused':'closed'}`;
    await page.keyboard.press('Control+A'); await page.keyboard.type(name); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const n=await nameOf(); if(n!==name) return `${how}: typed «${name}» + Enter, the marker is named «${n}»`;
    return null; };
  for(const [how,name] of [['mouse','Bridge'],['touch','Coda']]){ const d=await tryOne(how,name); if(d) bad.push(d); else lines.push(`${how}: double ${how==='mouse'?'click':'tap'} opened the field, «${name}» kept`); }
  { await page.mouse.click(prep.x, prep.y); await page.waitForTimeout(450);   // the second way: select the marker, then §✎
    await page.click('#secRen'); await page.waitForTimeout(300);
    const st=await state();
    if(!st.open||!st.focused) bad.push(`button: §✎ after selecting the marker left the field ${st.open?'unfocused':'closed'}`);
    else { await page.keyboard.press('Control+A'); await page.keyboard.type('Outro'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
      const n=await nameOf(); if(n!=='Outro') bad.push(`button: typed «Outro» + Enter, the marker is named «${n}»`); else lines.push('button: §✎ on the selected marker opened the field, «Outro» kept'); } }
  if(prep.ctl){
    await page.evaluate(async ()=>{ const UI=await import('/core/legacy-ui/ui.js'); UI.arrApi.secRenameDbg('down'); });
    const d=await tryOne('mouse','Ctrl');
    await page.evaluate(async ()=>{ const UI=await import('/core/legacy-ui/ui.js'); UI.arrApi.secRenameDbg(null); const el=document.getElementById('secNameIn'); if(el&&!el.hidden){ el.dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape' })); } });
    if(!d) bad.push('CONTROL: with the field opened inside the second press (the old code) the double click still worked — the check cannot fail');
    else lines.push(`control (old behaviour) fails as it must — ${d}`);
  } else lines.push('no control switch in this build (arrApi.secRenameDbg) — control not run');
  await page.evaluate(async id=>{ const UI=await import('/core/legacy-ui/ui.js'), REC=await import('/core/recorder.js');
    if(REC.secDelete) REC.secDelete(id); if(REC.histReset) REC.histReset(); else if(REC.songHistReset) REC.songHistReset(); UI.arrApi.close(); }, prep.id);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* ---------- UI check with REAL input (OWN2): drag a bend point of the selected theremin note upward → higher cents, one history step ---------- */
async function uiBendDrag(page, label){
  const prep=await page.evaluate(async ()=>{
    const UI=await import('/core/legacy-ui/ui.js'), REC=await import('/core/recorder.js'), D=await import('/core/legacy-ui/draw.js'), ST=await import('/core/state.js');
    const n=REC.songNotes().notes.find(x=>x.role==='ld' && x.head.a && x.head.a.bend && x.head.a.bend.length>=3 && REC.freezeState(x.layer)==='none');
    if(!n) return { ok:false, why:'no theremin note with three points' };
    UI.arrApi.open(); UI.arrApi.openTrack(n.layer);
    UI.arrApi.setWin(Math.max(0,n.start-1), (n.end-n.start)+2);
    ST.setRollSel(n.head); REC.histReset();
    for(let i=0;i<4;i++) await new Promise(r=>requestAnimationFrame(()=>r()));
    const P=D.rollBendProbe(), r=document.getElementById('canvas').getBoundingClientRect();
    if(!P||P.length<3) return { ok:false, why:'the handles are not drawn on the selected theremin note' };
    window.__bendEv=n.head;
    return { ok:true, x:r.left+P[1].x, y:r.top+P[1].y, c0:P[1].c };
  });
  if(!prep.ok) return { pass:false, lines:[`${label}: ${prep.why}`] };
  await page.mouse.move(prep.x, prep.y); await page.mouse.down();
  for(let k=1;k<=6;k++){ await page.mouse.move(prep.x, prep.y-k*6); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(150);
  const after=await page.evaluate(async ()=>{ const REC=await import('/core/recorder.js'); const e=window.__bendEv; return { c:e.a.bend[1].c, n:REC.histLen() }; });
  const lines=[], bad=[];
  if(!(after.c>prep.c0)) bad.push(`dragging point 2 up 36 px left its cents at ${after.c} (was ${prep.c0})`);
  else if(after.n!==1) bad.push(`the drag left ${after.n} history steps, one intended`);
  else lines.push(`dragging point 2 up: ${prep.c0} → ${after.c} cents, one history step`);
  await page.evaluate(async ()=>{ const UI=await import('/core/legacy-ui/ui.js'), REC=await import('/core/recorder.js'); while(REC.histLen()) if(!REC.histUndo()) break; REC.histReset(); UI.arrApi.closeTrack(); UI.arrApi.close(); delete window.__bendEv; });
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* SAVE1: the song file through REAL input — the Save button's actual download is caught and read back through the real file input
   (Playwright setInputFiles; the person's file picker is the only part not exercised). The song must come back identical with no
   question asked (it was just saved); a newer-version file must be refused in words and leave the song untouched. The tracks that were
   frozen are frozen again with their old seeds, so the probes after this see the seed song exactly as before. */
async function uiSongFile(page, label){
  const lines=[], bad=[];
  const prep=await page.evaluate(async ()=>{ const REC=await import('/core/recorder.js'), R=await import('/core/render.js'), RUN=await import('/tools/probes/core/run.js');
    const L=[...new Set(REC.events.map(e=>e.layer))]; window.__songFz=L.filter(ly=>REC.freezeState(ly)==='fresh').map(ly=>[ly,R.seedOfLane(REC.laneIdOf(ly))]);
    return { print:RUN.songPrint(), fz:window.__songFz.length }; });
  const [dl]=await Promise.all([ page.waitForEvent('download',{ timeout:15000 }), page.evaluate(()=>document.getElementById('songSave').click()) ]);
  const file=path.join(LOGDIR,'ui-song.handsong'), newer=path.join(LOGDIR,'ui-song-newer.handsong'); await dl.saveAs(file);
  const name=dl.suggestedFilename(), text=await readFile(file,'utf8'); let rec=null; try{ rec=JSON.parse(text); }catch(e){}
  if(!rec || rec.format!=='handsong/song') bad.push(`the Save button's download is not a song file (${name}, ${text.length} bytes)`);
  else lines.push(`Save downloaded «${name}» (${Math.round(text.length/1024)} kB, version ${rec.version}, ${rec.events.length} events)`);
  let dialogs=0; const onDlg=d=>{ dialogs++; d.accept().catch(()=>{}); }; page.on('dialog',onDlg);
  try{
    await page.setInputFiles('#songFile', file); await page.waitForTimeout(1500);
    const a=await page.evaluate(async ()=>{ const RUN=await import('/tools/probes/core/run.js'), REC=await import('/core/recorder.js'); return { print:RUN.songPrint(), msg:document.getElementById('camMsg').dataset.msg||'', dirty:REC.songDirty() }; });
    if(a.print!==prep.print) bad.push(`after Open of the downloaded file the song differs (${prep.print} → ${a.print})`);
    else if(dialogs) bad.push(`Open asked ${dialogs} question(s) right after a save`);
    else if(!/Song opened|Песня открыта/.test(a.msg)) bad.push(`no «Song opened» message (got «${a.msg}»)`);
    else lines.push(`Open of that file through the file input: the same song (${a.print}), no question, message «${a.msg}»`);
    if(rec){ await writeFile(newer, JSON.stringify({ ...rec, version:rec.version+1 }));
      await page.setInputFiles('#songFile', newer); await page.waitForTimeout(800);
      const b=await page.evaluate(async ()=>{ const RUN=await import('/tools/probes/core/run.js'); return { print:RUN.songPrint(), msg:document.getElementById('camMsg').dataset.msg||'' }; });
      if(b.print!==prep.print || !/newer Handsong|более новым/.test(b.msg)) bad.push(`a newer-version file: song ${b.print===prep.print?'kept':'CHANGED'}, message «${b.msg}»`);
      else lines.push(`a newer-version file: refused («${b.msg}»), the song kept`); }
  } finally {
    page.off('dialog',onDlg);
    await page.evaluate(async ()=>{ const R=await import('/core/render.js'); for(const [ly,seed] of window.__songFz||[]) await R.freeze(ly,{ quiet:true, seed }); delete window.__songFz; });
    await rm(file,{ force:true }); await rm(newer,{ force:true });
  }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-7b — «stale saved values → the start card still fully labelled» (Night page, the END of a session: it reloads the page). The page's
   store is filled with what old runs and the old handsong-night site leave behind (an unknown language, the old «seen» flags, broken numbers,
   an unreadable calibration record), the page is RELOADED and the REAL start card judged: every visible text has words (none blank, none its
   own key), the title reads «hand·song night» on two lines, the language is English or Russian. CONTROL: a blanked Begin label is caught.
   Then a trusted click on Begin: the first cards must come (the old «seen» flag must not stop them; the calibration offer, if any, is
   skipped first), every card labelled; the last «Play» hides them (by computed style, not the attribute) and no synthetic hand plays. */
const NIGHT_STALE=[['handsong.night.lang','xx'], ['handsong.lang','de'], ['handsong.nightSeen','1'], ['handsong.ca'+'lmSeen','1'], ['handsong.nightCards','old'],
  ['handsong.nightMusic','loud'], ['handsong.nightMusicVol','NaN'], ['handsong.nightForest','abc'], ['handsong.nightJoints','x'], ['handsong.nightLight','maybe'],
  ['handsong.nightField','2'], ['handsong.nightCalSide','middle'], ['handsong.nightCalOffered','{not json'], ['handsong.handCal.night','{not json'],
  ['handsong.nightRoom','cave'], ['handsong.sceneLevel','ultra'], ['handsong.nightFxHint','?'], ['handsong.nightBg','dark'],
  ['handsong.nightMusic','off'], ['handsong.nightMusicVol','0'], ['handsong.nightMusicMode','loud'], ['handsong.nightMusicLevel','NaN'], ['handsong.nightHints','{not json']];   // NIGHT-11: a broken coaching list reads as nothing seen   // NIGHT-7c: an old «off» and volume 0 must not silence the music   // Dark: no software WebGL here (the background's fallback is a list check)
/* in the page: every visible text element under the given roots — blank, or showing its own key */
function nightLabels(sels){
  const bad=[], vis=el=>{ const r=el.getBoundingClientRect(), s=getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && +s.opacity>0; };
  let n=0;
  for(const root of sels.map(s=>document.querySelector(s)).filter(Boolean)) for(const el of root.querySelectorAll('[data-i18n], button, p, li, h1, h2, summary, label, select')){
    if(!vis(el) || el.matches('#loadmsg, #learnMsg, [role=status], [aria-live]')) continue; n++;   // status lines are empty until there is news
    const tx=(el.tagName==='SELECT' ? ((el.selectedOptions[0]||{}).textContent||'') : (el.textContent||'')).replace(/\s+/g,' ').trim(), name=el.id||(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]);
    const icon=!!el.querySelector('svg') && !!(el.title||el.getAttribute('aria-label'));
    if(!tx && !icon) bad.push(name+' blank'); else if(/^[a-z]+(\.[\w-]+)+$/.test(tx)) bad.push(`${name} shows its key «${tx}»`); }
  return { n, bad };
}
/* NIGHT-7c — after a click on Begin (trusted: a real tap), in the page and in the background: the music bed's OWN output (an analyser on its node)
   every 100 ms for 10 s → when it first rose above −60 dBFS (ms after the click), its level at 4 s and at the end; then whether it plays in the
   live view and how often it (re)started (the face must not restart it); the full-screen counters. `stub`: the browser refuses full screen once. */
async function nightBeginHear(page, stub=false){
  await page.evaluate(st=>{ window.__t0=performance.now(); if(st){ const el=document.documentElement, real=el.requestFullscreen; el.requestFullscreen=function(){ el.requestFullscreen=real; return Promise.reject(new Error('refused (control)')); }; } }, stub);
  await page.click('#nightBegin');
  await page.evaluate(()=>{ window.__hearP=(async ()=>{ const B2=await import('/apps/night/bed2.js'), A=await import('/core/audio.js'), F=await import('/apps/night/fullscreen.js');
    let an=null, first=null, last=-200, at4=null, fsTap=null, faceAt=null; const buf=new Float32Array(2048);
    for(let k=0;k<100;k++){ const n=B2.bed2NodeDbg(); if(n && !an && A.AC){ an=A.AC.createAnalyser(); an.fftSize=2048; n.connect(an); }
      if(an){ an.getFloatTimeDomainData(buf); let s=0; for(const x of buf) s+=x*x; last=10*Math.log10(s/buf.length+1e-20); if(first==null && last>-60) first=Math.round(performance.now()-window.__t0); }
      if(k===40) at4=last; if(k===5) fsTap=F.fsDbg(); if(faceAt==null && !B2.bed2ViewDbg().over && B2.bed2ViewDbg().ticked) faceAt=Math.round(performance.now()-window.__t0);   // NIGHT-8b: when the profile took over (the camera ran)   // full screen 0.5 s after the tap: before any later tap of the flow could ask again
      await new Promise(r=>setTimeout(r, 100)); }
    if(an) try{ B2.bed2NodeDbg().disconnect(an); }catch(e){}
    return { first, last:+last.toFixed(1), at4:at4==null ? null : +at4.toFixed(1), ac:A.AC && A.AC.state, view:B2.bed2ViewDbg(), fs:fsTap||F.fsDbg(), faceAt }; })(); });
}
/* CORE-20: the live view is judged once the START has ended (the start card gone, bounded by LIMIT_START) and the face has had 3 s to take over — not
   at a fixed 10 s after the tap (a lottery: a start on this machine takes 8–14 s, the old way too; measured by --measure-start) */
async function nightHeard(page){
  const h=await within(page.evaluate(()=>window.__hearP), 30e3, 'the music measure');
  const ended=await page.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:LIMIT_START }).then(()=>true, ()=>false);
  if(ended) await page.waitForFunction(async ()=>{ const v=(await import('/apps/night/bed2.js')).bed2ViewDbg(); return v.ticked && !v.over; }, null, { timeout:3000, polling:100 }).catch(()=>{});
  h.view=await page.evaluate(async ()=>(await import('/apps/night/bed2.js')).bed2ViewDbg()); h.startEnded=ended;
  return h;
}
async function uiNightStale(page, label){
  const lines=[], bad=[];
  await page.evaluate(L=>{ for(const [k,v] of L) localStorage.setItem(k,v); }, NIGHT_STALE);
  await page.reload();
  await within(page.waitForFunction(()=>window.P && document.getElementById('start').classList.contains('on') && getComputedStyle(document.getElementById('nightBegin')).display!=='none', null, { timeout:0 }), 60e3, 'reloading the app');
  await page.waitForTimeout(300);
  const st=await page.evaluate(nightLabels, ['#start']);
  const head=await page.evaluate(()=>{ const h=document.querySelector('.night-start-head'), w=h.querySelector('.night-word'), s=h.querySelector('.night-sub');
    return { text:h.textContent.replace(/\s+/g,' ').trim(), below:s.getBoundingClientRect().top>=w.getBoundingClientRect().bottom-1, lang:document.documentElement.lang }; });
  if(st.bad.length || st.n<5) bad.push(`the start card after stale values: ${st.n} texts, ${st.bad.length} not labelled (${st.bad.join(', ')})`);
  else lines.push(`the start card after ${NIGHT_STALE.length} stale values: ${st.n} texts, all labelled, language «${head.lang}»`);
  if(!/hand·song night/.test(head.text) || !head.below) bad.push(`the title reads «${head.text}»${head.below?'':', «night» not on its own line'}`);
  if(!['en','ru'].includes(head.lang)) bad.push(`the language fell to «${head.lang}»`);
  { await page.evaluate(()=>{ const b=document.getElementById('nightBegin'); window.__nlKeep=b.textContent; b.textContent=''; });
    const c=await page.evaluate(nightLabels, ['#start']);
    await page.evaluate(()=>{ document.getElementById('nightBegin').textContent=window.__nlKeep; delete window.__nlKeep; });
    if(!c.bad.some(x=>/nightBegin/.test(x))) bad.push('CONTROL: a blanked Begin label was not caught'); else lines.push('CONTROL: a blanked Begin label is caught'); }
  await nightBeginHear(page);
  await within(page.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:0 }), LIMIT_START, 'the start after Begin');
  const shownNow=()=>page.evaluate(()=>{ const vis=id=>{ const e=document.getElementById(id); return !!e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().height>0; };
    return { cal:vis('nightCalCard') && !document.getElementById('nightCal').hidden, cards:vis('nightCards'), coach:vis('nightCoach') ? document.getElementById('nightCoachText').textContent : '' }; });
  /* NIGHT-11 part 4: play first — after Begin no calibration offer and no card; the coaching line «Raise a hand», labelled; the cards from Settings → How to play */
  let s=null, early=false; for(let i=0;i<16;i++){ s=await shownNow(); if(s.cal || s.cards) early=true; if(s.coach) break; await page.waitForTimeout(250); }
  if(early) bad.push('a calibration offer or a card came after Begin, before any note');
  if(!s.coach) bad.push('no coaching line after Begin'); else lines.push(`after Begin: no offer, no card, the coaching line «${s.coach}»`);
  await page.evaluate(()=>{ document.getElementById('nightInfoBtn').click(); document.getElementById('nightHowTo').click(); }); await page.waitForTimeout(300); s=await shownNow();
  if(!s.cards) bad.push('Settings → How to play did not open the cards (the stale «seen» flags stopped them, or they are hidden)');
  else {
    const titles=[]; let unl=[];
    for(let k=0;k<4;k++){ const r=await page.evaluate(nightLabels, ['#nightCards']); unl=unl.concat(r.bad.map(x=>`card ${k+1}: ${x}`));
      titles.push(await page.evaluate(()=>document.getElementById('nightCardTitle').textContent)); await page.click('#nightCardNext'); await page.waitForTimeout(150); }
    if(unl.length) bad.push('cards not labelled: '+unl.join(', ')); else lines.push(`How to play opens the cards and every one is labelled: ${titles.join(' · ')}`);
    await page.waitForTimeout(1500);
    const after=await page.evaluate(async ()=>{ const B=await import('/core/pure/bus.js'), C=await import('/apps/night/cards.js'), e=document.getElementById('nightCards');
      const hv=B.BUS.get('handsView'); return { open:C.cardsOpen(), display:getComputedStyle(e).display, hands:Array.isArray(hv) ? hv.length : 0 }; });
    if(after.open || after.display!=='none') bad.push(`the last «Play» left the cards on screen (open ${after.open}, display ${after.display})`);
    else lines.push('the last «Play» closed them (display none)');
    if(after.hands) bad.push(`a hand plays after the cards with no hand in front of the camera (${after.hands})`); else lines.push('no hand plays after them (no demo hand)');
  }
  /* NIGHT-7c: the music under all this, and full screen on the Begin tap */
  { const h=await nightHeard(page); musicJudge(h, true, 'with stale values', lines, bad);
    if(h.fs.asked>=1 && h.fs.granted>=1 && !h.fs.deferred && !h.fs.undecided) lines.push(`camera already granted («${h.fs.cam}»): full screen asked on the Begin tap and granted (asked ${h.fs.asked}, granted ${h.fs.granted}, now ${h.fs.on ? 'on' : 'off'})`);
    else bad.push(`full screen on the Begin tap with the camera granted: asked ${h.fs.asked}, granted ${h.fs.granted}, refused ${h.fs.refused}, deferred ${h.fs.deferred}, camera «${h.fs.cam}» (api ${h.fs.api})`); }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}
/* the music measure judged: on = audible within 6 s of the tap, playing in the live view, started once (no restart when the face came) */
function musicJudge(h, on, what, lines, bad){
  if(on){ if(h.first!=null && h.first<=6000 && h.view.same && h.view.starts===1) lines.push(`music ${what}: audible ${h.first} ms after Begin, ${h.at4} dBFS at 4 s, ${h.last} at 10 s; in the live view, started once`);
    else bad.push(`music ${what}: first audible ${h.first==null ? 'never' : h.first+' ms'} (6000 at most), live view ${h.view.same} ${JSON.stringify(h.view)}, started ${h.view.starts} times (once wanted), audio ${h.ac}, the start ${h.startEnded ? 'ended' : 'did not end'}, the profile took over ${h.faceAt==null ? 'after the first 10 s' : 'at '+h.faceAt+' ms'}`); }
  else { if(h.first==null && h.ac==='running') lines.push(`music ${what}: silent for 10 s with the audio running`); else bad.push(`music ${what}: audible ${h.first} ms after Begin (audio ${h.ac})`); }
}
/* NIGHT-7c — the music on a FRESH profile (everything cleared), and the CONTROLS: a stored «off» (the person's own choice) must fail the
   «music on» judgement — the measure can say «not playing»; a browser that refuses full screen once must fail the Begin-tap judgement, and
   the next tap in the flow (a card) must ask again and get it */
async function uiNightMusic(page, label){
  const lines=[], bad=[];
  const skipFlow=async ()=>{ for(let i=0;i<8;i++){ const s=await page.evaluate(()=>({ cal:!document.getElementById('nightCal').hidden, cards:getComputedStyle(document.getElementById('nightCards')).display!=='none' }));
      if(s.cards) return true; if(s.cal) await page.click('#nightCalNo'); await page.waitForTimeout(250); } return false; };
  const reloadWith=async kv=>{ await page.evaluate(L=>{ localStorage.clear(); for(const [k,v] of L) localStorage.setItem(k,v); }, kv); await page.reload();
    await within(page.waitForFunction(()=>window.P && document.getElementById('start').classList.contains('on') && getComputedStyle(document.getElementById('nightBegin')).display!=='none', null, { timeout:0 }), 60e3, 'reloading the app'); };
  const started=()=>within(page.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:0 }), LIMIT_START, 'the start after Begin');
  /* fresh */
  await reloadWith([['handsong.nightBg','dark']]); await nightBeginHear(page); await started();
  if(await skipFlow()) await page.click('#nightCardSkip');
  musicJudge(await nightHeard(page), true, 'on a fresh profile', lines, bad);
  /* the controls */
  await reloadWith([['handsong.nightBg','dark'], ['handsong.nightMusicMode','off']]); await nightBeginHear(page, true); await started();
  const cards=await skipFlow(), h=await nightHeard(page);
  { const l=[], b=[]; musicJudge(h, true, 'with off stored', l, b); if(b.length) lines.push('CONTROL: a stored «off» fails the «music on» judgement'); else bad.push('CONTROL: the «music on» judgement passed with «off» stored — it cannot fail'); }
  musicJudge(h, false, 'with «off» stored (the person’s choice)', lines, bad);
  if(h.fs.refused>=1) lines.push('CONTROL: a browser that refuses full screen fails the Begin-tap judgement'); else bad.push(`CONTROL: the refusal was not seen (granted ${h.fs.granted}, refused ${h.fs.refused})`);
  { const fsNow=()=>page.evaluate(async ()=>(await import('/apps/night/fullscreen.js')).fsDbg());   // NIGHT-11: the second chance is the camera's moment (the Begin tap still counting) or the next tap
    let f=await fsNow(); if(!f.on){ if(cards) await page.click('#nightCardNext'); else await page.mouse.click(640, 400); await page.waitForTimeout(400); f=await fsNow(); }
    if(f.granted===1 && f.atCamera+f.retried===1) lines.push(`after the refusal full screen was asked again ${f.atCamera ? 'when the camera ran (the Begin tap still counting)' : 'on the next tap'} and granted (asked ${f.asked})`); else bad.push(`after the refusal no second ask: ${JSON.stringify(f)}`);
    if(cards && await page.evaluate(()=>getComputedStyle(document.getElementById('nightCards')).display!=='none')) await page.click('#nightCardSkip'); }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-8b — THE FIRST FRAMES OF THE NIGHT PAGE (the user saw Full's start card for about a second). A new page of this session loads the app
   with a recorder run before any of the page's own code: at every animation frame (each one is about to be painted) it notes which of Full's
   start items and which of Night's are visible, for 4 s. The app's main.js is held back 1.2 s, so many frames come before any of the page's
   scripts run (as on a slow phone). PASS: from the very first frame Night's title and Begin show and nothing of Full's start card; CONTROL the
   same page with Night's body class taken out of its markup (the NIGHT-8 page) must show Full's items in its early frames. */
const FP_REC=()=>{ const fr=[]; window.__fp=fr; const t0=performance.now();
  const vis=sel=>{ const e=document.querySelector(sel); if(!e) return false; const s=getComputedStyle(e), r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && +s.opacity>0 && r.width>0 && r.height>0; };
  const FULL=['#start .startCard > h1', '#start .startTag', '#startBtn', '#learnBtn', '#fsBtnStart', '#startSupport'], NIGHT=['.night-start-head', '#nightBegin'];
  const tick=()=>{ if(document.body && document.getElementById('start')) fr.push({ t:Math.round(performance.now()-t0), full:FULL.filter(vis), night:NIGHT.filter(vis), js:!!document.querySelector('.night-start-head svg') });
    if(performance.now()-t0<4000) requestAnimationFrame(tick); else fr.done=true; };
  requestAnimationFrame(tick); };
async function nightFirstFrames(page, control){
  const ctx=page.context(), p=await ctx.newPage(), url=page.url();
  try{
    await p.addInitScript(FP_REC);
    await p.route(u=>/\/apps\/night\/main\.js$/.test(u.pathname), async r=>{ await new Promise(z=>setTimeout(z, 1200)); await r.continue(); });
    if(control) await p.route(u=>/\/apps\/night\/(index\.html)?$/.test(u.pathname), async r=>{ const resp=await r.fetch(); const body=(await resp.text()).replace(/<body class="night-boot[^"]*">/, '<body>'); await r.fulfill({ response:resp, body }); });
    await p.goto(url, { waitUntil:'commit' });
    await within(p.waitForFunction(()=>window.__fp && window.__fp.done, null, { timeout:0, polling:200 }), 30e3, 'the first frames');
    return await p.evaluate(()=>window.__fp.slice());
  } finally { await p.close().catch(()=>{}); }
}
async function uiNightFirstFrames(page, label){
  const lines=[], bad=[], judge=F=>{ const early=F.filter(f=>!f.js), wrong=F.filter(f=>f.full.length || f.night.length<2);
    return { n:F.length, early:early.length, wrong, first:F[0] }; };
  const ok=judge(await nightFirstFrames(page, false)), ctl=judge(await nightFirstFrames(page, true));
  if(!ok.n || !ok.early) bad.push(`no frame was captured before the page's scripts ran (${ok.n} frames, ${ok.early} early) — the check saw nothing`);
  else if(ok.wrong.length) bad.push(`${ok.wrong.length} of ${ok.n} frames show Full's start items or miss Night's (first at ${ok.wrong[0].t} ms: Full ${ok.wrong[0].full.join(', ')||'none'}, Night ${ok.wrong[0].night.join(', ')||'none'})`);
  else lines.push(`the first frames: ${ok.n} frames in 4 s (${ok.early} before the page's scripts, the first at ${ok.first.t} ms) — every one shows Night's title and Begin, none of Full's start card`);
  if(!(ctl.early && ctl.wrong.some(f=>!f.js && f.full.length))) bad.push(`CONTROL: the page without Night's body class showed no Full item in its early frames (${ctl.n} frames, ${ctl.early} early) — the check cannot fail`);
  else lines.push(`CONTROL: the NIGHT-8 page (no body class) shows Full's start items in ${ctl.wrong.filter(f=>!f.js).length} of its ${ctl.early} early frames`);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}
/* NIGHT-8b — FULL SCREEN WITH THE CAMERA UNDECIDED (the user's Poco: full screen ended at the camera prompt and never came back). The camera
   permission is taken away (the browser then answers «prompt»), and the Android behaviour is played: the camera request ends full screen
   (CAM_PROMPT: the query answers «prompt»; getUserMedia ends full screen, a 0.6-s prompt, then the real camera). Begin must NOT ask (deferred, never asked while undecided); the
   camera runs; the next tap (the calibration offer's «No», or a card) asks and gets it — the real browser's full screen, no stub. CONTROL the
   old way (fsAskAlwaysDbg: Begin asks anyway) is caught: asked while undecided, and the prompt ends it. */
/* the browser's side of an undecided camera, played before the page's own code (only while this tab's flag is set): the permission query answers
   «prompt» (the runner's fake-media flag keeps the real one «granted») and turns «granted», with its change event, once the camera opens; the
   camera request ends full screen first and keeps the «prompt» up 0.6 s (Android Chrome) */
const CAM_PROMPT=()=>{ try{ if(sessionStorage.getItem('__camPrompt')!=='1') return; }catch(e){ return; }
  const P=navigator.permissions, q=P.query.bind(P), st=new EventTarget(); st.state='prompt'; st.name='camera'; st.onchange=null;
  P.query=dsc=>dsc && dsc.name==='camera' ? Promise.resolve(st) : q(dsc);
  const md=navigator.mediaDevices, g=md.getUserMedia.bind(md); window.__prompts=0;
  md.getUserMedia=async c=>{ window.__prompts++; if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{}); await new Promise(r=>setTimeout(r, 600));
    if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{});   // NIGHT-11: a full screen that came while the prompt was up ends too (the camera is now asked at once in the tap)
    const s=await g(c); if(st.state!=='granted'){ st.state='granted'; st.dispatchEvent(new Event('change')); } return s; }; };
const camPromptPages=new WeakSet();
async function nightFsUndecided(page, oldWay){
  if(!camPromptPages.has(page)){ await page.addInitScript(CAM_PROMPT); camPromptPages.add(page); }
  try{
    await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('handsong.nightBg', 'dark'); sessionStorage.setItem('__camPrompt', '1'); }); await page.reload();
    await within(page.waitForFunction(()=>window.P && document.getElementById('start').classList.contains('on') && getComputedStyle(document.getElementById('nightBegin')).display!=='none', null, { timeout:0 }), 60e3, 'reloading the app');
    const cam=await page.evaluate(async old=>{ (await import('/apps/night/fullscreen.js')).fsAskAlwaysDbg(old);
      try{ return (await navigator.permissions.query({ name:'camera' })).state; }catch(e){ return 'no query'; } }, oldWay);
    await page.click('#nightBegin'); await page.waitForTimeout(300);
    const atBegin=await page.evaluate(async ()=>(await import('/apps/night/fullscreen.js')).fsDbg());
    await within(page.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:0 }), LIMIT_START, 'the start after Begin');
    let tapped=null; await page.waitForTimeout(600);   // NIGHT-11: no offer, no card — when the camera ran (the Begin tap still counting) full screen may be on already; else a tap on the page
    if(!(await page.evaluate(async ()=>(await import('/apps/night/fullscreen.js')).fsDbg().on))){ await page.mouse.click(640, 400); tapped='the page'; } else tapped='none needed (asked when the camera ran)';
    await page.waitForTimeout(500);
    const after=await page.evaluate(async ()=>({ fs:(await import('/apps/night/fullscreen.js')).fsDbg(), prompts:window.__prompts }));
    await page.evaluate(async ()=>{ (await import('/apps/night/fullscreen.js')).fsAskAlwaysDbg(false); if(document.fullscreenElement) await document.exitFullscreen().catch(()=>{}); });
    return { cam, atBegin, after, tapped };
  } finally { await page.evaluate(()=>sessionStorage.removeItem('__camPrompt')).catch(()=>{}); }
}
async function uiNightFsUndecided(page, label){
  const lines=[], bad=[], r=await nightFsUndecided(page, false), B=r.atBegin, A=r.after.fs;
  if(r.cam!=='prompt') bad.push(`the camera permission read «${r.cam}», not «prompt» — the undecided case was not reached`);
  if(B.undecided!==0 || B.deferred!==1) bad.push(`Begin asked for full screen with the camera undecided (asked ${B.asked}, while undecided ${B.undecided}, deferred ${B.deferred}, permission «${r.cam}»)`);   // NIGHT-11: an ask once the camera runs is allowed (the camera's moment)
  else lines.push(`camera permission «${r.cam}»: Begin asked for the camera only (full screen deferred, never asked while undecided)`);
  if(!r.tapped) bad.push('no calibration offer or card came to tap after the camera ran');
  else if(!(A.on && A.granted>=1 && A.undecided===0 && r.after.prompts>=1)) bad.push(`after the camera ran, a tap on ${r.tapped} did not bring full screen: ${JSON.stringify({ on:A.on, asked:A.asked, granted:A.granted, refused:A.refused, undecided:A.undecided, prompts:r.after.prompts, cam:A.cam })}`);
  else lines.push(`the camera prompt came (${r.after.prompts}), then ${/^none/.test(r.tapped) ? 'full screen was asked when the camera ran (the Begin tap still counting)' : 'the tap on '+r.tapped+' asked'} and full screen is on (asked ${A.asked}, granted ${A.granted}, never while undecided) — the browser's real full screen`);
  const c=await nightFsUndecided(page, true), CA=c.after.fs;
  if(c.atBegin.asked>=1 && (c.atBegin.undecided>=1 || CA.undecided>=1) && CA.exits>=1) lines.push(`CONTROL: the old way (Begin asks anyway) is caught — asked while undecided ${CA.undecided}, the prompt ended it (exits ${CA.exits})`);
  else bad.push(`CONTROL: the old way was not caught: ${JSON.stringify({ begin:c.atBegin, after:CA })}`);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-10 — THE CAMERA CHOICE with two made-up cameras (TWO_CAMS, played before the page's own code while this tab's flag is set): the list
   names a front camera (mirrored) and a back one (not mirrored); every open is the runner's real fake camera, its settings telling the chosen
   device and facing; a device the list no longer has refuses with OverconstrainedError. Checks: Settings → Camera shows both, named «Front» /
   «Back» on a made-up phone, the open one marked, nothing technical; a tap on Back switches LIVE — the start card never comes back, the music
   goes on (started once), the hand model keeps detecting — and the back camera is NOT mirrored (camFacing, mirrored(), flipX) while the hands keep
   their roles (the playing hand unchanged) and the calibration reads this camera's own record; the choice is kept and the next start opens it;
   a kept camera that is gone opens the default quietly (no message). CONTROLS: the back camera forced mirrored fails the mirroring judgement;
   a gone camera with core's fallback switched off fails the quiet-start judgement. */
const TWO_CAMS=()=>{ try{ if(sessionStorage.getItem('__twoCams')!=='1') return; }catch(e){ return; }
  const CAMS=[{ deviceId:'cam-front', label:'Front camera', facing:'user' }, { deviceId:'cam-back', label:'Back camera', facing:'environment' }];
  const md=navigator.mediaDevices, g=md.getUserMedia.bind(md); window.__camOpened=[];
  md.enumerateDevices=async ()=>CAMS.map(c=>({ deviceId:c.deviceId, label:c.label, kind:'videoinput', groupId:'g-'+c.deviceId, toJSON(){ return this; } }));
  md.getUserMedia=async c=>{ const v=(c && c.video)||{}, want=v.deviceId && (v.deviceId.exact||v.deviceId); let cam;
    if(want){ cam=CAMS.find(x=>x.deviceId===want); if(!cam) throw new DOMException('the camera is gone', 'OverconstrainedError'); }
    else cam= v.facingMode==='environment' ? CAMS[1] : CAMS[0];
    const s=await g({ video:{ width:{ ideal:640 }, height:{ ideal:480 } }, audio:false }), tr=s.getVideoTracks()[0], gs=tr.getSettings.bind(tr);
    tr.getSettings=()=>({ ...gs(), deviceId:cam.deviceId, facingMode:cam.facing }); Object.defineProperty(tr, 'label', { value:cam.label, configurable:true });
    window.__camOpened.push(cam.deviceId); return s; }; };
const twoCamPages=new WeakSet();
async function camStart(page, kept, noFallback=false){
  if(!twoCamPages.has(page)){ await page.addInitScript(TWO_CAMS); twoCamPages.add(page); }
  await page.evaluate(k=>{ localStorage.clear(); localStorage.setItem('handsong.nightBg', 'dark'); localStorage.setItem('handsong.nightCards', '2'); localStorage.setItem('handsong.nightCalOffered', '["*"]'); if(k) localStorage.setItem('handsong.nightCam', JSON.stringify({ deviceId:k })); sessionStorage.setItem('__twoCams', '1'); }, kept);
  await page.reload();
  await within(page.waitForFunction(()=>window.P && document.getElementById('start').classList.contains('on') && getComputedStyle(document.getElementById('nightBegin')).display!=='none', null, { timeout:0 }), 60e3, 'reloading the app');
  if(noFallback) await page.evaluate(async ()=>{ (await import('/core/vision.js')).camOpenDbg({ noFallback:true, noRetry:true }); });
  await page.click('#nightBegin');
  const ok=await page.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:LIMIT_START }).then(()=>true, ()=>false);
  for(let i=0;ok && i<16;i++){ const c=await page.evaluate(()=>{ const e=document.getElementById('nightCal'); return !!e && !e.hidden && getComputedStyle(document.getElementById('nightCalCard')).display!=='none'; });   // the calibration offer for this camera: «No»
    if(c){ await page.click('#nightCalNo'); break; } await page.waitForTimeout(250); }
  await page.waitForTimeout(500);
  const st=await page.evaluate(async ()=>{ const V=await import('/core/vision.js'), S=await import('/core/state.js'); return { opened:window.__camOpened.slice(), pick:V.cameraPickInfo(), facing:S.camFacing, mirrored:S.mirrored(),
    msg:(document.getElementById('loadmsg')||{}).textContent||'', retry:!(document.getElementById('camRetry')||{ hidden:true }).hidden, start:document.getElementById('start').classList.contains('on') }; });
  if(noFallback) await page.evaluate(async ()=>{ (await import('/core/vision.js')).camOpenDbg({ reset:true }); });
  return { ok, ...st };
}
async function uiNightCamera(page, label){
  const lines=[], bad=[];
  try{
    const a=await camStart(page, null);
    if(!a.ok || a.facing!=='user' || !a.mirrored) bad.push(`the default start: ${JSON.stringify(a)}`);
    await page.evaluate(async ()=>{ const C=await import('/apps/night/camera.js'); C.camEnvDbg({ ua:'Mozilla/5.0 (Linux; Android 13) Mobile', platform:'Linux armv8l', touch:5 }); document.getElementById('nightInfoBtn').click(); });
    await page.waitForTimeout(700);
    const list=await page.evaluate(async ()=>{ const I=await import('/core/i18n.js'), sec=document.getElementById('nightCamSec'), b=[...document.querySelectorAll('#nightCamSeg button')];
      return { shown:!sec.hidden && getComputedStyle(sec).display!=='none', names:b.map(x=>x.textContent), want:[I.t('night.cam.front'), I.t('night.cam.back')], on:b.map(x=>x.classList.contains('on')) }; });   // the page's own language
    if(!list.shown || list.names.join()!==list.want.join() || list.on.join()!=='true,false' || list.names.some(x=>/cam-/.test(x))) bad.push('Settings → Camera: '+JSON.stringify(list));
    else lines.push(`Settings → Camera on a made-up phone: «${list.names[0]}» (open, marked) · «${list.names[1]}»; no ids shown`);
    const before=await page.evaluate(async ()=>{ const B2=await import('/apps/night/bed2.js'), V=await import('/core/vision.js'), S=await import('/core/state.js'), HC=await import('/core/handcal.js');
      return { starts:B2.bed2ViewDbg().starts, det:V.pumpStats().detected, hand:JSON.stringify(S.handFn.ld), cal:HC.handCalRead().camera }; });
    await page.click('#nightCamSeg button:nth-child(2)'); await page.waitForTimeout(2500);
    const after=await page.evaluate(async ()=>{ const B2=await import('/apps/night/bed2.js'), V=await import('/core/vision.js'), S=await import('/core/state.js'), HC=await import('/core/handcal.js'), A=await import('/core/audio.js'), C=await import('/apps/night/camera.js');
      return { starts:B2.bed2ViewDbg().starts, playing:B2.bed2ViewDbg().on, ac:A.AC && A.AC.state, det:V.pumpStats().detected, hand:JSON.stringify(S.handFn.ld), cal:HC.handCalRead().camera, facing:S.camFacing, mirrored:S.mirrored(),
        fx:S.flipX(0.2), start:document.getElementById('start').classList.contains('on'), kept:C.camDbg().saved, opened:window.__camOpened.slice(), on:[...document.querySelectorAll('#nightCamSeg button')].map(x=>x.classList.contains('on')) }; });
    const mirrorOK=s=>s.facing==='environment' && s.mirrored===false && s.fx===0.2;
    if(after.start || after.starts!==before.starts || after.ac!=='running') bad.push(`the switch was not live: ${JSON.stringify({ start:after.start, starts:[before.starts, after.starts], ac:after.ac })}`);
    else if(!(after.det>before.det)) bad.push(`the hand model stopped detecting after the switch (${before.det} → ${after.det})`);
    else lines.push(`a tap on Back switched live: no start card, the music started once and plays on (audio ${after.ac}), detections ${before.det} → ${after.det}`);
    if(!mirrorOK(after)) bad.push(`the back camera: ${JSON.stringify({ facing:after.facing, mirrored:after.mirrored, flipX:after.fx })}`); else lines.push('the back camera is not mirrored (camFacing environment, flipX(0.2) = 0.2: the picture and the hands together)');
    if(after.hand!==before.hand) bad.push(`the hands' roles changed with the camera: ${before.hand} → ${after.hand}`); else lines.push('the hands keep their roles (the playing hand unchanged)');
    if(after.cal===before.cal) bad.push('the calibration reads the same record for both cameras'); else lines.push(`the calibration is this camera's own (${before.cal.slice(0,10)}… → ${after.cal.slice(0,10)}…)`);
    if(!after.kept || after.kept.deviceId!=='cam-back' || after.on.join()!=='false,true') bad.push(`the choice: kept ${JSON.stringify(after.kept)}, marked ${after.on}`);
    { await page.evaluate(async ()=>{ (await import('/core/state.js')).setCamFacing('user'); }); const c=await page.evaluate(async ()=>{ const S=await import('/core/state.js'); return { facing:S.camFacing, mirrored:S.mirrored(), fx:S.flipX(0.2) }; });
      await page.evaluate(async ()=>{ (await import('/core/state.js')).setCamFacing('environment'); });
      if(mirrorOK(c)) bad.push('CONTROL: the back camera forced mirrored passed the mirroring judgement'); else lines.push('CONTROL: the back camera forced mirrored fails the mirroring judgement'); }
    const b=await camStart(page, 'cam-back');
    if(!b.ok || b.opened[0]!=='cam-back' || !mirrorOK({ facing:b.facing, mirrored:b.mirrored, fx:b.mirrored ? 0.8 : 0.2 })) bad.push(`the kept camera at the next start: ${JSON.stringify(b)}`); else lines.push('the next start opened the kept back camera (not mirrored)');
    const g=await camStart(page, 'cam-gone');
    if(!g.ok || g.start || g.retry || g.opened.slice(-1)[0]!=='cam-front' || !g.pick.missed) bad.push(`a kept camera that is gone: ${JSON.stringify(g)}`); else lines.push('a kept camera that is gone: the default opened quietly (the start card closed, no retry, no error), the miss noted');
    const x=await camStart(page, 'cam-gone', true);
    if(x.ok && !x.start && !x.retry) bad.push('CONTROL: a gone camera without the fallback still started quietly — the judgement cannot fail'); else lines.push('CONTROL: without core\'s fallback a gone camera fails the start (the judgement catches it)');
  } finally { await page.evaluate(()=>{ try{ sessionStorage.removeItem('__twoCams'); localStorage.removeItem('handsong.nightCam'); }catch(e){} }).catch(()=>{}); }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-11 part 2 — AN HONEST START, each case in a FRESH context of this browser (no cache, no storage):
   (A) main.js held back 3 s, «Still loading» after 1.5 s (?probe&bootslow): from the first paint Begin reads as loading (dimmed, no taps, busy) and a
       real tap does nothing visible; the line «Still loading» comes; once the app is ready the look goes and a tap starts it. <html lang> is the
       page's language. CONTROL: the page without its loading class shows Begin live while nothing works.
   (B) main.js refused: a plain message with Reload, never a dead page. CONTROL: without the guard script nothing says so.
   (C) a messenger's browser (Instagram's user agent on Android): «Open this page in Chrome» with a copy-link button on the start card, in English and
       Russian; the copy button copies (or selects the link).
   (D) a camera refused at once (no prompt): the same box, and Night's words. CONTROL: a refusal after 1.2 s (a person said no) gets the denied
       words naming Night's button, no box.
   (E) the hand model's progress on the start card (a percent), no failure message after a good start; (F) the model held back with a 2.5-s stall
       limit: «did not finish loading» and Try again; released, Try again starts the app. CONTROL: with the default 20-s limit nothing is said in 6 s. */
const AWV_IG='Mozilla/5.0 (Linux; Android 14; 22111317PG; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0 Android';
const MODEL_RE=/storage\.googleapis\.com\/mediapipe-models\//;
async function freshPage(page, o={}){
  const ctx=await page.context().browser().newContext({ viewport:{ width:1280, height:800 }, ...(o.ua ? { userAgent:o.ua } : {}), ...(o.locale ? { locale:o.locale } : {}) }), origin=new URL(page.url()).origin;
  await ctx.grantPermissions(['camera','microphone','clipboard-read','clipboard-write'], { origin }); if(CDN_CACHE) await cdnCache(ctx);
  await ctx.addInitScript(()=>{ try{ if(!localStorage.getItem('handsong.nightBg')) localStorage.setItem('handsong.nightBg','dark'); }catch(e){} });
  if(o.init) await ctx.addInitScript(o.init[0], o.init[1]);
  const p=await ctx.newPage(); return { ctx, p, url:origin+'/apps/night/index.html?probe'+(o.q||'') };
}
const bootState=p=>p.evaluate(()=>{ const b=document.getElementById('nightBegin'), s=getComputedStyle(b), m=document.getElementById('nightBootMsg');
  return { loading:document.body.classList.contains('night-loading'), op:+s.opacity, pe:s.pointerEvents, busy:b.getAttribute('aria-busy'), msg:!!m && !m.hidden && getComputedStyle(m).display!=='none', kind:m && m.dataset.kind || '',
    text:(document.getElementById('nightBootText')||{}).textContent||'', reload:(document.getElementById('nightBootReload')||{}).textContent||'', start:document.getElementById('start').classList.contains('on'),
    starting:document.getElementById('start').classList.contains('busy'), loadmsg:(document.getElementById('loadmsg')||{}).textContent||'', lang:document.documentElement.lang, ready:!!(window.__nightBoot && window.__nightBoot.state().done) }; });
const tapAt=async (p, sel)=>{ const r=await p.evaluate(s=>{ const b=document.querySelector(s).getBoundingClientRect(); return [b.x+b.width/2, b.y+b.height/2]; }, sel); await p.mouse.click(r[0], r[1]); };
async function uiNightStart(page, label){
  const lines=[], bad=[], close=async c=>{ await c.ctx.close().catch(()=>{}); };
  const startOk=p=>p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:LIMIT_START }).then(()=>true, ()=>false);
  /* (A) and its CONTROL */
  for(const control of [false, true]){ const c=await freshPage(page, { q:'&bootslow=1500' });
    try{
      await c.p.route(u=>/\/apps\/night\/main\.js$/.test(u.pathname), async r=>{ await new Promise(z=>setTimeout(z, 3000)); await r.continue(); });
      if(control) await c.p.route(u=>/\/apps\/night\/(index\.html)?$/.test(u.pathname), async r=>{ const resp=await r.fetch(); await r.fulfill({ response:resp, body:(await resp.text()).replace('night-boot night-loading', 'night-boot') }); });
      await c.p.goto(c.url, { waitUntil:'commit' }); await c.p.waitForSelector('#nightBegin', { state:'attached' }); await c.p.waitForTimeout(500);   // not «domcontentloaded»: it waits for the modules
      const a=await bootState(c.p); await tapAt(c.p, '#nightBegin'); await c.p.waitForTimeout(400); const a2=await bootState(c.p);
      const look=a.loading && a.op<0.8 && a.pe==='none' && a.busy==='true' && !a.ready;
      if(control){ if(look) bad.push('CONTROL: the page without its loading class still read as loading — the check cannot fail'); else lines.push(`CONTROL: without the loading class Begin looks live while nothing works (opacity ${a.op}, taps ${a.pe})`); continue; }
      if(!look) bad.push('Begin does not read as loading before the app works: '+JSON.stringify(a));
      else if(!a2.start || a2.starting || a2.loadmsg) bad.push('a tap during loading did something: '+JSON.stringify(a2));
      else lines.push(`from the first paint Begin reads as loading (opacity ${a.op}, no taps, busy) and a real tap does nothing visible`);
      await c.p.waitForTimeout(800); const sl=await bootState(c.p);
      if(!(sl.msg && sl.kind==='slow' && sl.text.length>20 && sl.reload)) bad.push('«Still loading» did not come: '+JSON.stringify(sl)); else lines.push(`after 1.5 s: «${sl.text}» with «${sl.reload}»`);
      await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 }); await c.p.waitForTimeout(300);
      const r=await bootState(c.p), L=await c.p.evaluate(async ()=>(await import('/core/i18n.js')).lang);
      if(r.loading || r.op<0.99 || r.pe==='none' || r.busy || r.msg) bad.push('ready, but Begin still reads as loading or the line stays: '+JSON.stringify(r)); else lines.push('ready: the loading look and the line are gone');
      if(r.lang!==L || !['en','ru'].includes(L)) bad.push(`<html lang> «${r.lang}», the page's language «${L}»`); else lines.push(`<html lang> follows the language («${r.lang}»)`);
      await tapAt(c.p, '#nightBegin'); const go=await c.p.waitForFunction(()=>{ const s=document.getElementById('start'); return s.classList.contains('busy') || !s.classList.contains('on'); }, null, { timeout:5000 }).then(()=>true, ()=>false);
      if(!go) bad.push('after ready a tap on Begin did not start the app'); else lines.push('after ready a tap on Begin starts the app');
    } finally { await close(c); } }
  /* (B) and its CONTROL */
  for(const control of [false, true]){ const c=await freshPage(page);
    try{
      await c.p.route(u=>/\/apps\/night\/main\.js$/.test(u.pathname), r=>r.abort());
      if(control) await c.p.route(u=>/\/apps\/night\/guard\.js$/.test(u.pathname), r=>r.abort());
      await c.p.goto(c.url, { waitUntil:'commit' }); await c.p.waitForSelector('#nightBegin', { state:'attached' }); await c.p.waitForTimeout(1500); const b=await bootState(c.p);
      if(control){ if(b.msg) bad.push('CONTROL: without the guard a message still showed'); else lines.push('CONTROL: without the guard script a refused module leaves the page silent'); continue; }
      if(!(b.msg && b.kind==='fail' && b.text.length>20 && b.reload)) bad.push('a refused module left no message: '+JSON.stringify(b)); else lines.push(`a refused module: «${b.text}» with «${b.reload}»`);
    } finally { await close(c); } }
  /* (C) a messenger's browser */
  { const c=await freshPage(page, { ua:AWV_IG, locale:'en-US' });
    try{
      await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 }); await c.p.waitForTimeout(300);
      const box=()=>c.p.evaluate(()=>{ const b=document.getElementById('nightInApp'); return { on:!b.hidden && getComputedStyle(b).display!=='none', text:document.getElementById('nightInAppText').textContent, copy:document.getElementById('nightInAppCopy').textContent, url:document.getElementById('nightInAppUrl').value }; });
      const e=await box(), T=await c.p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); return { copy:I.t('night.inapp.copy'), copied:I.t('night.inapp.copied') }; });
      if(!(e.on && /Chrome/.test(e.text) && !/[а-яё]/i.test(e.text) && e.copy===T.copy && /apps\/night/.test(e.url))) bad.push('a messenger\'s browser: '+JSON.stringify(e)); else lines.push(`a messenger's browser: «${e.text.slice(0,60)}…» with «${e.copy}»`);
      await c.p.click('#nightInAppCopy'); await c.p.waitForTimeout(300);
      const k=await c.p.evaluate(()=>({ btn:document.getElementById('nightInAppCopy').textContent, sel:document.activeElement && document.activeElement.id }));
      if(!(k.btn===T.copied || k.sel==='nightInAppUrl')) bad.push('the copy button did nothing: '+JSON.stringify(k)); else lines.push(k.btn===T.copied ? 'the copy button copied the link' : 'the copy button selected the link');
      await c.p.evaluate(()=>localStorage.setItem('handsong.night.lang','ru')); await c.p.reload(); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 }); await c.p.waitForTimeout(300);
      const r=await box(); if(!(r.on && /[а-яё]/i.test(r.text) && /Chrome/.test(r.text) && /[а-яё]/i.test(r.copy))) bad.push('in Russian: '+JSON.stringify(r)); else lines.push(`in Russian: «${r.text.slice(0,50)}…» with «${r.copy}»`);
    } finally { await close(c); } }
  /* (D) a refusal at once, and its CONTROL (after 1.2 s) */
  for(const ms of [0, 1200]){ const c=await freshPage(page, { init:[d=>{ const md=navigator.mediaDevices; md.getUserMedia=()=>new Promise((_,rej)=>setTimeout(()=>rej(new DOMException('refused', 'NotAllowedError')), d));
      const P=navigator.permissions, q=P.query.bind(P); P.query=x=>x && x.name==='camera' ? Promise.resolve({ state:'prompt', addEventListener(){} }) : q(x); }, ms] });
    try{
      await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 });
      await c.p.click('#nightBegin');
      await c.p.waitForFunction(()=>!document.getElementById('camRetry').hidden, null, { timeout:LIMIT_START });
      const s=await c.p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); const b=document.getElementById('nightInApp');
        return { msg:document.getElementById('loadmsg').textContent, box:!b.hidden && getComputedStyle(b).display!=='none', inapp:I.t('night.cam.inapp'), begin:I.t('night.begin'), start:I.t('start.play') }; });
      if(!ms){ if(!(s.box && s.msg===s.inapp)) bad.push('a camera refused at once: '+JSON.stringify(s)); else lines.push(`a camera refused at once: «${s.msg}» and the open-in-browser box`); }
      else { if(s.box || s.msg===s.inapp) bad.push('CONTROL: a refusal after 1.2 s was taken for «without asking»'); else if(!s.msg.includes(s.begin) || s.msg.includes('«'+s.start+'»') || /press Start/.test(s.msg)) bad.push('the denied words do not name Night\'s button: '+s.msg);
        else lines.push(`CONTROL: a refusal after 1.2 s gets the denied words naming «${s.begin}», no box`); }
    } finally { await close(c); } }
  /* (E) the progress; (F) the stall and Try again; its CONTROL */
  { const c=await freshPage(page, { init:[()=>{ window.__msgs=[]; document.addEventListener('DOMContentLoaded', ()=>{ const m=document.getElementById('loadmsg'); new MutationObserver(()=>{ const x=m.textContent; if(x && window.__msgs[window.__msgs.length-1]!==x) window.__msgs.push(x); }).observe(m, { childList:true, characterData:true, subtree:true }); }); }, null] });
    try{
      await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 });
      await c.p.click('#nightBegin'); const ok=await startOk(c.p); const m=await c.p.evaluate(()=>window.__msgs.slice()), b=await bootState(c.p);
      const pc=m.filter(x=>/\d+ %/.test(x));
      if(!ok || pc.length<1 || b.msg) bad.push(`the model's progress: started ${ok}, ${m.length} lines (${m.slice(0,4).join(' | ')}), boot message ${b.msg}`);
      else lines.push(`the model's progress on the start card: ${pc.length} percent lines (${pc[0]} … ${pc[pc.length-1]}), then the camera; no failure message after the start`);
    } finally { await close(c); } }
  for(const control of [false, true]){ const c=await freshPage(page, { q:control ? '' : '&modelstall=2500' });
    try{
      const held=[]; const hold=r=>{ held.push(r); }; await c.ctx.route(MODEL_RE, hold);
      await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 });
      await c.p.click('#nightBegin');
      const said=await c.p.waitForFunction(()=>!document.getElementById('camRetry').hidden, null, { timeout:control ? 6000 : 30000 }).then(()=>true, ()=>false);
      const s=await c.p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); return { msg:document.getElementById('loadmsg').textContent, want:I.t('night.load.modelFail', { again:I.t('start.retry') }) }; });
      if(control){ if(said) bad.push('CONTROL: with the default limit the stall was reported within 6 s'); else lines.push('CONTROL: with the default 20-s limit nothing is said in 6 s (still loading)'); continue; }
      if(!said || s.msg!==s.want) bad.push('a stalled model: '+JSON.stringify({ said, ...s })); else lines.push(`a stalled model (2.5 s): «${s.msg}» and Try again`);
      await c.ctx.unroute(MODEL_RE, hold); for(const r of held) r.abort().catch(()=>{});
      await c.p.click('#camRetry'); const ok=await startOk(c.p);
      if(!ok) bad.push('Try again after the stall did not start the app'); else lines.push('released, Try again started the app');
    } finally { await close(c); } }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-12 — «HOW TO PLAY» ON THE START SCREEN, real taps on a fresh profile: the link under Begin (labelled in English, then in Russian after a reload)
   opens the same cards OVER the start card (the topmost element at the card's Next button belongs to the cards), the start card stays; Next through
   every card, then Skip on a second opening: the cards close and the start card is back as it was (still shown, the lift class gone, Begin live).
   CONTROL: the lift taken away as it is set (a mutation observer strips the class) — the cards must be found NOT on top. */
async function howToState(p){ return p.evaluate(()=>{ const c=document.getElementById('nightCards'), n=document.getElementById('nightCardNext'), r=n.getBoundingClientRect(), top=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
  return { open:!c.hidden, onTop:!!top && !!top.closest('#nightCards') && getComputedStyle(c).display!=='none', start:document.getElementById('start').classList.contains('on'), lift:document.body.classList.contains('night-cards-start'),
    title:document.getElementById('nightCardTitle').textContent, link:document.getElementById('nightStartHowTo').textContent, focus:document.activeElement && document.activeElement.id, begin:getComputedStyle(document.getElementById('nightBegin')).pointerEvents }; }); }
async function uiNightHowTo(page, label){
  const lines=[], bad=[];
  for(const control of [false, true]){ const c=await freshPage(page, control ? { init:[()=>{ document.addEventListener('DOMContentLoaded', ()=>{ new MutationObserver(()=>{ if(document.body.classList.contains('night-cards-start')) document.body.classList.remove('night-cards-start'); }).observe(document.body, { attributes:true, attributeFilter:['class'] }); }); }, null] } : {});
    try{
      await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 }); await c.p.waitForTimeout(200);
      const T=await c.p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); return { how:I.t('night.howTo') }; });
      await tapAt(c.p, '#nightStartHowTo'); await c.p.waitForTimeout(200); const a=await howToState(c.p);
      if(control){ if(a.onTop) bad.push('CONTROL: with the lift taken away the cards were still on top — the check cannot fail'); else lines.push('CONTROL: with the lift taken away the cards are under the start card'); continue; }
      if(a.link!==T.how) bad.push(`the link reads «${a.link}», wanted «${T.how}»`);
      if(!(a.open && a.onTop && a.start && a.lift && a.title)) bad.push('the link did not open the cards over the start card: '+JSON.stringify(a));
      else lines.push(`«${a.link}» under Begin opens the cards over the start card («${a.title}»)`);
      let k=0; for(;k<8;k++){ const s=await howToState(c.p); if(!s.open) break; await tapAt(c.p, '#nightCardNext'); await c.p.waitForTimeout(80); }
      const b=await howToState(c.p);
      if(b.open || !b.start || b.lift || b.focus!=='nightStartHowTo' || b.begin==='none') bad.push('after the last card the start card did not come back as it was: '+JSON.stringify(b)); else lines.push(`Next through ${k} cards closes them; the start card is back (focus on the link, Begin live)`);
      await tapAt(c.p, '#nightStartHowTo'); await c.p.waitForTimeout(150); await tapAt(c.p, '#nightCardSkip'); await c.p.waitForTimeout(150); const s2=await howToState(c.p);
      if(s2.open || !s2.start || s2.lift) bad.push('Skip did not return to the start card: '+JSON.stringify(s2)); else lines.push('Skip returns to the start card');
      await c.p.evaluate(()=>localStorage.setItem('handsong.night.lang','ru')); await c.p.reload(); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 }); await c.p.waitForTimeout(200);
      await tapAt(c.p, '#nightStartHowTo'); await c.p.waitForTimeout(200); const r=await howToState(c.p), CYR=/[а-яё]/i;
      if(!(CYR.test(r.link) && r.open && r.onTop && CYR.test(r.title))) bad.push('in Russian: '+JSON.stringify(r)); else lines.push(`in Russian: «${r.link}» opens «${r.title}»`);
      await tapAt(c.p, '#nightCardSkip'); await c.p.waitForTimeout(100);
      await tapAt(c.p, '#nightBegin'); const go=await c.p.waitForFunction(()=>{ const s=document.getElementById('start'); return s.classList.contains('busy') || !s.classList.contains('on'); }, null, { timeout:5000 }).then(()=>true, ()=>false);
      if(!go) bad.push('after the cards a tap on Begin did not start the app'); else lines.push('then Begin starts the app');
    } finally { await c.ctx.close().catch(()=>{}); } }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-11 part 3 — THE START TIMELINE on a fresh profile (a new context: no cache, no storage; the forest chosen). The page loads, the start card
   is read for 3 s, then a real tap on Begin; times from the tap: the audio context made, the camera requested, the hand model ready, the first
   processed camera frame, the forest's opening begun and its first frame, the start card gone. Judged with the options on: the context made inside
   the tap; the camera requested within 0.5 s of the tap; the model's download begun before the tap; the forest's opening begun within 0.5 s of the
   tap; the start finished. CONTROL: the old staged start (?probe&oldstart) must fail each of the three order judgements.
   --throttle: the same in contexts slowed by Chrome's own protocol (network 10 Mbit/s down, 150 ms; processor 4×), with the real CDN. */
const THROTTLE=has('--throttle');
const TL_INIT=()=>{ const T=window.__tl={}; const mark=k=>{ if(T[k]==null) T[k]=Math.round(performance.now()); };
  document.addEventListener('click', e=>{ if(e.target && e.target.closest && e.target.closest('#nightBegin')){ mark('tap'); window.__inTap=true; setTimeout(()=>{ window.__inTap=false; }, 0); } }, true);
  const AC0=window.AudioContext; if(AC0) window.AudioContext=class extends AC0{ constructor(...a){ super(...a); if(T.ac==null) T.acInTap=!!window.__inTap; mark('ac'); } };
  const md=navigator.mediaDevices, g=md.getUserMedia.bind(md); md.getUserMedia=c=>{ mark('gum'); return g(c); };
  try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()) if(/hand_landmarker\.task/.test(e.name) && T.modelFetch==null) T.modelFetch=Math.round(e.startTime); }).observe({ type:'resource', buffered:true }); }catch(e){} };
async function timeline(page, old){
  const ctx=await page.context().browser().newContext({ viewport:{ width:1280, height:800 } }), origin=new URL(page.url()).origin;
  try{
    await ctx.grantPermissions(['camera','microphone'], { origin }); if(CDN_CACHE && !THROTTLE) await cdnCache(ctx);
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.nightBg','forest'); }catch(e){} }); await ctx.addInitScript(TL_INIT);
    const p=await ctx.newPage();
    if(THROTTLE){ const cdp=await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:1.25e6, uploadThroughput:4e5 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate:4 }); }
    const t0=Date.now(); await p.goto(origin+'/apps/night/index.html?probe'+(old ? '&oldstart' : ''));
    await p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:THROTTLE ? 600e3 : 120e3 }); const readyMs=Date.now()-t0;
    await p.waitForTimeout(3000);
    await p.evaluate(()=>{ (async ()=>{ const V=await import('/core/vision.js'), H=await import('/apps/night/scene/host.js'), T=window.__tl, mark=k=>{ if(T[k]==null) T[k]=Math.round(performance.now()); };
      for(let i=0;i<6000 && (T.forestFrame==null || T.frame==null);i++){ if(V.pathInfo().runs) mark('model'); if(V.pumpStats().processed>0) mark('frame'); const I=H.sceneInfo(); if(I.opens.begun>0) mark('forestBegin'); if(I.rendered>0 && !I.opening) mark('forestFrame');
        if(!document.getElementById('start').classList.contains('on')) mark('started'); await new Promise(r=>setTimeout(r, 25)); } })(); });
    await p.click('#nightBegin');
    const lim=THROTTLE ? 600e3 : 180e3;
    await p.waitForFunction(()=>window.__tl.forestFrame!=null && window.__tl.frame!=null, null, { timeout:lim }).catch(()=>{});
    const T=await p.evaluate(()=>({ ...window.__tl })), r=k=>T[k]==null ? null : T[k]-T.tap;
    return { readyMs, acInTap:!!T.acInTap, ac:r('ac'), gum:r('gum'), modelFetch:r('modelFetch'), model:r('model'), frame:r('frame'), forestBegin:r('forestBegin'), forestFrame:r('forestFrame'), started:r('started') };
  } finally { await ctx.close().catch(()=>{}); }
}
const tlLine=x=>`page ready ${(x.readyMs/1000).toFixed(1)} s; from the tap: context ${x.ac} ms (in the tap ${x.acInTap}), camera asked ${x.gum} ms, model fetch ${x.modelFetch} ms, model ready ${x.model} ms, first camera frame ${x.frame} ms, forest opening ${x.forestBegin} ms, forest first frame ${x.forestFrame} ms, start card gone ${x.started} ms`;
const tlJudge=x=>({ ac:x.acInTap, cam:x.gum!=null && x.gum<500, early:x.modelFetch!=null && x.modelFetch<0, forest:x.forestBegin!=null && x.forestBegin<500, done:x.started!=null && x.frame!=null && x.forestFrame!=null });
async function uiNightTimeline(page, label){
  const lines=[], bad=[];
  const on=await timeline(page, false), J=tlJudge(on); lines.push((THROTTLE ? 'THROTTLED (10 Mbit/s, 150 ms, CPU 4×) — ' : '')+'options on: '+tlLine(on));
  for(const [k,why] of [['ac','the audio context was not made inside the tap'], ['cam','the camera was not asked within 0.5 s of the tap'], ['early','the model did not start downloading before the tap'], ['forest','the forest did not begin opening within 0.5 s of the tap'], ['done','the start did not finish (frame, forest, card)']]) if(!J[k]) bad.push(why);
  const off=await timeline(page, true), C=tlJudge(off); lines.push('CONTROL old start: '+tlLine(off));
  const fails=['cam','early','forest'].filter(k=>!C[k]);
  if(fails.length<3) bad.push('CONTROL: the old start passed the order judgement(s) '+['cam','early','forest'].filter(k=>C[k]).join(', ')+' — they cannot fail');
  else lines.push('CONTROL: the old staged start fails all three order judgements (camera late, model after the tap, forest after the face)');
  if(on.frame!=null && off.frame!=null) lines.push(`first camera frame ${on.frame} ms after the tap (old ${off.frame} ms), forest first frame ${on.forestFrame} ms (old ${off.forestFrame} ms)`);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* NIGHT-11 part 4 — THE FIRST CONTACT'S ORDER on a fresh profile (a new context; Dark, so the room is ready at once): a real tap on Begin, then
   synthetic hands through the real gestures (the probe clock): no hand for 2.5 s → «Raise a hand»; a hand → «Touch your thumb to your first finger»;
   the touch → the first note; then playing with the coaching clock ×40 (30 s of playing in under a second) and a second hand for a moment. The cards
   and the calibration offer are watched every 100 ms. Judged by the law's own judge (pure/coach.js coachOrderOk): no card and no calibration before
   the first note, each later hint once; and the lines came in the order raise → pinch → (fingers, effects, near and far). CONTROL: the old order
   (?probe&oldflow: the calibration offer, then the cards) must fail the judge. */
async function nightOrder(page, old){
  const c=await freshPage(page, { q:old ? '&oldflow' : '' });
  try{
    await c.p.goto(c.url); await c.p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:60e3 });
    await c.p.click('#nightBegin');
    await c.p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:LIMIT_START });
    return await c.p.evaluate(async ()=>{
      const C=await import('/apps/night/coach.js'), CA=await import('/apps/night/cards.js'), G=await import('/core/gestures.js'), PO=await import('/core/gestures/pose.js'), V=await import('/core/vision.js'), P=await import('/apps/night/pure/coach.js');
      const log=[], now=()=>Math.round(performance.now()), vis=id=>{ const e=document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display!=='none'; };
      let cardOn=false, calOn=false; const poll=setInterval(()=>{ const k=CA.cardsOpen(), q=vis('nightCal'); if(k && !cardOn) log.push({ t:now(), kind:'card' }); if(q && !calOn) log.push({ t:now(), kind:'cal' }); cardOn=k; calOn=q; }, 100);
      const wait=ms=>new Promise(r=>setTimeout(r, ms)), clk={ t:1e6, W:V.canvas.width, H:V.canvas.height };
      const frame=hands=>{ clk.t+=1000/30; G.processHandsProbe({ landmarks:hands.map(h=>PO.pose(h.p)), handednesses:hands.map(h=>[{ categoryName:h.key }]) }); };
      const R=pinch=>({ key:'Right', p:{ x:0.7, y:0.5, s:0.25, gaps:[pinch ? 0.05 : 1, 1, 1, 1] } }), Lh={ key:'Left', p:{ x:0.25, y:0.45, s:0.2, gaps:[1, 1, 1, 1] } };
      const hold=async (ms, f)=>{ const t0=performance.now(); while(performance.now()-t0<ms){ frame(f(performance.now()-t0)); await wait(33); } };
      const play=t=>[R(Math.floor(t/400)%2===0)];
      let raiseText='', overlap=null;
      try{
        await wait(2500); raiseText=vis('nightCoach') ? document.getElementById('nightCoachText').textContent : '';
        /* one message at a time: the controls' layer shown as at rest, the idle line must give way to the coaching line; CONTROL without the rule they overlap */
        { const fade=document.getElementById('nightFade'), idle=document.getElementById('nightIdle'), co=document.getElementById('nightCoach'), box=e=>e.getBoundingClientRect(), cross=(a,b)=>!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
          fade.style.transition='none'; fade.style.visibility='visible'; fade.style.opacity='1'; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const both=()=>getComputedStyle(idle).visibility!=='hidden' && vis('nightCoach') && cross(box(idle), box(co));
          overlap={ on:both() }; document.body.classList.remove('night-coach-on'); overlap.ctl=both(); document.body.classList.add('night-coach-on');
          fade.style.visibility=''; fade.style.opacity=''; fade.style.transition=''; }
        G.handsProbe(clk, ()=>true);
        await hold(1500, ()=>[R(false)]);
        await hold(600, ()=>[R(true)]); await hold(400, ()=>[R(false)]);
        C.coachSpeedDbg(40);
        await hold(2500, play); await hold(1500, t=>[...play(t), Lh]); await hold(3000, play);
      } finally { G.handsProbe(null); C.coachSpeedDbg(1); clearInterval(poll); }
      const D=C.coachDbg(), all=[...log, ...D.log].sort((a,b)=>a.t-b.t);
      return { log:all, bad:P.coachOrderOk(all), shows:D.log.filter(e=>e.kind==='show').map(e=>e.id), notes:D.log.filter(e=>e.kind==='note').length, raiseText, overlap };
    });
  } finally { await c.ctx.close().catch(()=>{}); }
}
async function uiNightOrder(page, label){
  const lines=[], bad=[];
  const a=await nightOrder(page, false), T=await page.evaluate(async ()=>(await import('/core/i18n.js')).t('night.coach.raise'));
  const want=['raise','pinch'], later=['fingers','fx','depth'];
  if(a.bad.length) bad.push('the first contact broke the order: '+a.bad.join('; '));
  else if(a.shows.slice(0,2).join()!==want.join() || later.some(k=>!a.shows.includes(k))) bad.push(`the lines came as ${a.shows.join(' → ')} (raise → pinch, then fingers, effects, near and far wanted)`);
  else if(a.raiseText!==T) bad.push(`«Raise a hand» did not show before any hand («${a.raiseText}»)`);
  else lines.push(`fresh profile: ${a.shows.join(' → ')}; ${a.notes} notes; no card and no calibration before the first note; each later hint once`);
  if(!a.overlap || a.overlap.on) bad.push('the idle line and the coaching line show together: '+JSON.stringify(a.overlap)); else if(!a.overlap.ctl) bad.push('CONTROL: without the one-message rule the idle line and the coaching line do not overlap — the check cannot fail'); else lines.push('one message at a time: the idle line gives way to the coaching line (CONTROL: without the rule they overlap)');
  const o=await nightOrder(page, true);
  if(!o.bad.length) bad.push('CONTROL: the old order passed the judge — it cannot fail'); else lines.push('CONTROL: the old order fails the judge — '+o.bad[0]);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* AUTOSAVE1 — the real thing at the END of a session: the seed song is autosaved by the app's own timer (the probe's hold released),
   the page is RELOADED, ▶ Play pressed again → the «Continue where you left off?» box must offer it; «Continue» → the same song. */
async function uiAutosave(page, label){
  const lines=[], bad=[];
  const pre=await page.evaluate(async ()=>{ const A=await import('/core/autosave.js'), RUN=await import('/tools/probes/core/run.js');
    A.asPause('probe-song', false); A.asSetEnabled(true); return { print:RUN.songPrint() }; });
  let I=null; const t0=Date.now();
  for(let i=0;i<60;i++){ I=await page.evaluate(async ()=>{ const A=await import('/core/autosave.js'); return A.asInfo(); }); if(I.n>0 && !I.pending) break; await page.waitForTimeout(500); }
  if(!(I && I.n>0 && !I.pending)){ bad.push(`the app's own timer did not autosave the song within 30 s (${JSON.stringify(I)})`); return { pass:false, lines:bad.map(b=>`${label}: NOT A PASS — ${b}`) }; }
  lines.push(`the app autosaved the song by itself after ${((Date.now()-t0)/1000).toFixed(1)} s (write ${I.lastMs} ms)`);
  await page.reload();
  await within(page.waitForFunction(()=>window.P && window.R, null, { timeout:0 }), 60e3, 'reloading the app');
  await page.click('#startBtn');
  await within(page.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:0 }), LIMIT_START, 'the app start after the reload');
  const shown=await page.waitForFunction(()=>document.getElementById('resumeToast').classList.contains('on'), null, { timeout:10000 }).then(()=>true, ()=>false);
  const q=await page.evaluate(()=>document.getElementById('resumeText').textContent);
  if(!shown){ bad.push('after the reload ▶ Play offered nothing'); }
  else {
    const empty=await page.evaluate(async ()=>{ const REC=await import('/core/recorder.js'); return REC.events.length; });
    if(empty) bad.push(`the song was loaded BEFORE the answer (${empty} events)`); else lines.push(`after the reload ▶ Play asks «${q}» and the song stays empty until the answer`);
    await page.click('#resumeYes'); await page.waitForTimeout(1500);
    const a=await page.evaluate(async ()=>{ const RUN=await import('/tools/probes/core/run.js'); return { print:RUN.songPrint(), msg:document.getElementById('camMsg').dataset.msg||'' }; });
    if(a.print!==pre.print) bad.push(`«Continue» gave a different song (${pre.print} → ${a.print})`);
    else lines.push(`«Continue» → the same song (${a.print}), message «${a.msg}»`);
  }
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* ---------- срок ---------- */
function within(p, ms, what){ let t; return Promise.race([ p.finally(()=>clearTimeout(t)), new Promise((_,rej)=>{ t=setTimeout(()=>rej(new Error(`TIME LIMIT — ${what} did not finish within ${Math.round(ms/1000)} s`)), ms); }) ]); }

/* ---------- одна страница: старт, посев, прогоны ---------- */
async function session(port, plan, label){
  const args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'];
  if(HEADED) args.push('--window-position=-2600,0','--window-size=1280,800');   // обычное окно, но за экраном: вкладка видима, кадры идут
  const browser=await chromium.launch({ channel:BROWSER, headless:!HEADED, args, handleSIGINT:false, handleSIGTERM:false, handleSIGHUP:false });
  LIVE.browsers.add(browser);
  const res={ label, runs:[], seed:null, error:null };
  let rowHook=null;   // P.quick's slow meter reads each finished row
  let page=null;
  try{
    const ctx=await browser.newContext({ viewport:{ width:1280, height:800 } });
    const origin=`http://127.0.0.1:${port}`;
    await ctx.grantPermissions(['camera','microphone'],{ origin });
    if(CDN_CACHE) await cdnCache(ctx);
    /* LAT2 / PRIV1: every request of the session, the workers' included (Chromium reports a dedicated worker's requests too) */
    const NET_OK=[origin+'/', 'https://cdn.jsdelivr.net/npm/@mediapipe/', 'https://storage.googleapis.com/mediapipe-models/'];
    res.net={ n:0, workers:0, bad:[], workerUrls:[] };
    ctx.on('request', q=>{ const u=q.url(); if(/^(data|blob):/.test(u)) return; res.net.n++;
      if(!NET_OK.some(p=>u.startsWith(p)) && !/handsong-csp-control/.test(u)) res.net.bad.push(u); });
    /* PRIV1: every Content-Security-Policy violation of the whole session is collected (an init script runs before the page's own) */
    await ctx.addInitScript(()=>{ window.__csp=[]; document.addEventListener('securitypolicyviolation', e=>window.__csp.push({ dir:e.effectiveDirective||e.violatedDirective, uri:e.blockedURI, src:e.sourceFile, line:e.lineNumber })); });
    /* CORE-11: the storage census — every localStorage key and IndexedDB name the page touches, recorded from before its first read */
    await ctx.addInitScript(()=>{ const S=window.__store=new Set(), add=x=>{ try{ S.add(x); }catch(e){} };
      const SP=Storage.prototype; for(const m of ['getItem','setItem','removeItem']){ const f=SP[m]; SP[m]=function(k,...a){ add('ls:'+String(k)); return f.call(this,k,...a); }; }
      const IP=IDBFactory.prototype; for(const m of ['open','deleteDatabase']){ const f=IP[m]; IP[m]=function(n,...a){ add('idb:'+String(n)); return f.call(this,n,...a); }; } });
    if(has('--stress-not-judged')) await ctx.addInitScript(()=>{ globalThis.__stressNotJudged=true; });
    /* SPLIT-2: this page's session rests on the Dark background (software WebGL in headless Chrome starves a small machine between rows); the forest rows choose the forest themselves */
    if(NIGHT_PAGE) await ctx.addInitScript(()=>{ try{ if(!localStorage.getItem('handsong.nightBg')) localStorage.setItem('handsong.nightBg','dark'); }catch(e){} });
    page=await ctx.newPage();
    page.on('worker', w=>{ const u=w.url().replace(origin,''); if(/net-control/.test(u)) return; res.net.workers++; res.net.workerUrls.push(u); });   // the control's worker is not counted
    const seen=[];   // строки проб этого прогона (для сводки)
    page.on('console', async m=>{ const tx=m.text(), ty=m.type();
      await log(`[${ty}] ${tx}`);
      const probeLine=/^\[(scaleprobe|probe)/.test(tx);
      if(probeLine) seen.push(tx);
      { const m=/^\[scaleprobe row\] \d+\/\d+ (.+?) · .* (\d+) ms$/.exec(tx); if(m && rowHook) rowHook(m[1], +m[2]); }
      if(VERBOSE || probeLine){
        if(/^\[scaleprobe row\]/.test(tx)) out('  '+tx.replace(/^\[scaleprobe row\] /,'row '));
        else if(/^\[scaleprobe seed\]/.test(tx)) out('  '+tx);
        else if(/^\[scaleprobe all\]/.test(tx) || /^ {3}/.test(tx) || VERBOSE) out('  '+tx);
      } else if(/^ {3}/.test(tx)) out('  '+tx);   // строки «first differences» (с отступом)
    });
    page.on('pageerror', async e=>{ await log('[pageerror] '+(e&&e.stack||e)); out('  [pageerror] '+(e&&e.message||e)); });
    res.requests=[]; ctx.on('response', q=>{ const u=q.url(); if(/^(data|blob):/.test(u)) return; res.requests.push([u.replace(origin,'').split('?')[0], q.status()]); });
    await page.goto(origin+ENTRY);
    out(`[${label}] page open — waiting for the app and the probe module`);
    await within(page.waitForFunction(()=>window.P && window.R, null, { timeout:0 }), 60e3, 'loading the app');
    /* its own start card hides #startBtn; the same handler by script, so a first-run ghost does not play through the rows */
    if(NIGHT_PAGE) await page.evaluate(()=>document.getElementById('startBtn').click()); else await page.click('#startBtn');
    /* --selftest-exit sigint|error: fire that exit path once the app is starting (tests the cleanup; the run fails by design) */
    const ST=val('--selftest-exit',null);
    if(ST) setTimeout(()=>{ if(ST==='sigint') process.emit('SIGINT'); else Promise.reject(new Error('selftest')); }, 3000);
    out(`[${label}] ▶ Play pressed — waiting for the start (hand-tracking model from the CDN, fake camera)`);
    await within(page.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:0 }), LIMIT_START, 'the app start');
    const env=await page.evaluate(async ()=>{ const A=await import('/core/audio.js'); return { hidden:document.hidden, visibility:document.visibilityState, ac:A.AC&&A.AC.state, rate:A.AC&&A.AC.sampleRate, ua:navigator.userAgent }; });
    res.env=env;
    out(`[${label}] started — audio ${env.ac} at ${env.rate} Hz, tab ${env.visibility}${env.hidden?' (HIDDEN — drawn-window rows will not run)':''}`);
    /* AF3: the auto-freeze watcher is paused for the whole runner session (probes drive it with their own clock); resumed before closing */
    await page.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); });
    /* NIGHT-3: the ENG2 benchmark starts by itself 20 s after render.js loads on a device with none stored — every runner profile is fresh — and
       the pause above can come too late for it: it was still rendering on the engine copy when Night's first row (GOLD) took its state-guard
       snapshot. The runner runs it ONCE here and waits: one already in flight finishes first (the render queue is serial), and the stored result
       stops the timer's later one. settled() is checked, and its CONTROL (nothing stored) must read unsettled. */
    { const b=await page.evaluate(async ()=>{ const R=await import('/core/render.js'), E=await import('/core/pure/engclass.js'), t0=performance.now();
        const r=await R.engBench(); await new Promise(q=>setTimeout(q, 50));
        const settled=(stored, queued)=>!!E.benchOf(stored, navigator.userAgent) && queued===0;
        let stored=null; try{ stored=localStorage.getItem(E.ENG_BENCH_KEY); }catch(e){}
        return { ms:Math.round(performance.now()-t0), cached:!!r.cached, ok:settled(stored, R.renderQueue()), control:settled(null, 0) }; });
      out(`[${label}] engine benchmark settled before the rows: ${b.cached ? 'already stored' : 'measured'} in ${b.ms} ms · control (nothing stored) ${b.control ? 'NOT caught' : 'caught'}`);
      if(!b.ok || b.control) throw new Error(`the engine benchmark did not settle (ok ${b.ok}, control ${b.control}) — a render could run by itself during the rows`); }
    if(!NIGHT_PAGE && !DUMP){
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
    if(!has('--no-ui')){   // the trusted-input UI check (section rename) — every session; --no-ui skips it
      const ucdp=await ctx.newCDPSession(page);
      res.ui=await within(uiSecRename(page, ucdp, `[${label}] UI section rename`), 60e3, 'the UI check').catch(e=>({ pass:false, lines:[`[${label}] UI section rename: ERROR — ${e&&e.message||e}`] }));
      for(const l of res.ui.lines) out(l);
      const ub=await within(uiBendDrag(page, `[${label}] UI bend drag`), 60e3, 'the bend UI check').catch(e=>({ pass:false, lines:[`[${label}] UI bend drag: ERROR — ${e&&e.message||e}`] }));
      for(const l of ub.lines) out(l);
      const us=await within(uiSongFile(page, `[${label}] UI song file`), 90e3, 'the song file UI check').catch(e=>({ pass:false, lines:[`[${label}] UI song file: ERROR — ${e&&e.message||e}`] }));
      for(const l of us.lines) out(l);
      res.ui={ pass:res.ui.pass&&ub.pass&&us.pass, lines:[...res.ui.lines, ...ub.lines, ...us.lines] };
    }
    }
    if(DUMP){ const r=await within(page.evaluate(n=>P[n](), DUMP[0]), LIMIT_ALL, 'P.'+DUMP[0]); if(!r||r.refused) throw new Error('P.'+DUMP[0]+' returned nothing'); await writeFile(path.resolve(DUMP[1]), JSON.stringify(r)+'\n'); out(`[${label}] wrote ${DUMP[1]}`); res.dumped=true; }
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
      /* CORE-20: --throttle with --eval slows this page's processor 4× (Chrome's own protocol) — a loaded machine for a determinism check */
      if(THROTTLE){ const tc=await ctx.newCDPSession(page); await tc.send('Emulation.setCPUThrottlingRate', { rate:4 }); out(`[${label}] --throttle: the page's processor slowed 4×`); }
      out(`[${label}] --eval ${EVAL}`);
      // evaluated as an expression through the debugger (the page's CSP forbids new Function — PRIV1)
      const expr=`(async()=>{ try{ return { ok:true, value:await (async()=>{${src}\n})() }; }catch(e){ return { ok:false, error:String(e&&e.stack||e) }; } })()`;
      const r=await within(page.evaluate(expr), LIMIT_ALL, '--eval');
      out(JSON.stringify(r, null, 1));
      res.evalResult=r;
    }
    for(const kind of plan){
      out(`[${label}] running P.${kind}() — one line per row as it finishes`);
      const ts=Date.now();
      const job=page.evaluate(async k=>{ const r=await P[k]({ progress:true }); return r ? { pass:r.pass, seconds:r.seconds, hidden:r.hidden, rows:r.rows, measures:r.measures||{}, material:r.material&&r.material.ok } : null; }, kind);
      let r;
      if(kind==='all'||kind==='night') r=await within(job, LIMIT_ALL, `P.${kind}()`);
      else { const S=slowMeter(); rowHook=(name,ms)=>S.row(name,ms); res.slow=S;
        const fixed=LIMIT_QUICK_ARG!=null ? (+LIMIT_QUICK_ARG||3)*60e3 : null;
        const dl=()=>{ const ms= fixed ?? Math.round(LIMIT_QUICK_BASE*S.f); return { at:ts+ms, ms, note: fixed ? ' (--limit-quick)' : S.f>1 ? ` (3 min × slow factor ${S.f.toFixed(2)})` : '' }; };
        try{ r=await withinDyn(job, dl, `P.${kind}()`); } finally{ rowHook=null; res.limitQuick=dl().ms; }
        out(`[${label}] machine speed: ${S.n} reference row(s) ran ${S.raw.toFixed(2)}× their idle time → slow factor ${S.f.toFixed(2)} · P.quick limit ${(res.limitQuick/60e3).toFixed(1)} min${fixed?' (--limit-quick)':''}`); }
      for(let i=0;i<60 && !seen.some(l=>/P\.(all|quick|night): (PASS|NOT A PASS)/.test(l));i++) await page.waitForTimeout(50);   // итоговая строка — событием консоли, чуть позже
      res.runs.push({ kind, ...r, wall:(Date.now()-ts)/1000, lines:seen.filter(l=>/^\[scaleprobe all\]/.test(l)).slice(-12) });
      seen.length=0;
    }
    /* PRIV1: no CSP violation in the whole session; CONTROL — a fetch to an unlisted host must be refused by connect-src (no request leaves) */
    res.csp=await within(page.evaluate(async ()=>{
      const meta=!!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), before=window.__csp.slice();
      let blocked=false, err=''; try{ await fetch('https://example.com/handsong-csp-control'); }catch(e){ blocked=true; err=String(e&&e.message||e); }
      await new Promise(r=>setTimeout(r,300));
      const v=window.__csp.slice(before.length);
      return { meta, list:before, blocked, err, ctl:v.some(x=>/connect-src/.test(x.dir)&&/example\.com/.test(x.uri)) };
    }), 30e3, 'the CSP check');
    /* CORE-11: THE STORAGE CENSUS, judged — Night touches only its own names: the namespace («handsong.night.…», «….night»), its own
       «handsong.night…» keys and the old ones migrate.js moves, the scene level, its calibration scopes, and the two device facts shared on purpose
       (camera restore record, engine benchmark); never a songs database (the offer is gated off). CONTROLS: Night's census holds its namespaced
       language key and user-file database (the hook saw core's first reads at module load); Full's holds «handsong.lang», «handsong-user» and
       «handsong-songs» (its names as before; the songs = the offer at ▶ that Night skips) and nothing of the namespace. */
    { const L=await within(page.evaluate(()=>[...(window.__store||[])].sort()), 15e3, 'the storage census');
      const OK=[/^ls:handsong\.night/, new RegExp('^ls:handsong[.]ca'+'lm'), /^ls:handsong\.sceneLevel$/, /^ls:handsong\.handCal\.((dev-)?night|probe)$/, /^ls:handsong\.(camTest|engBench)$/, /^idb:handsong-user\.night$/];
      const bad= NIGHT_PAGE ? L.filter(x=>!OK.some(r=>r.test(x))) : L.filter(x=>/^ls:handsong\.night\.|\.night$/.test(x));
      const need= NIGHT_PAGE ? ['ls:handsong.night.lang','idb:handsong-user.night'] : ['ls:handsong.lang','idb:handsong-user','idb:handsong-songs'], miss=need.filter(x=>!L.includes(x));
      res.store={ list:L, bad, miss, pass:!bad.length && !miss.length };
      out(`[${label}] storage (CORE-11): ${L.length} name(s) touched — ${bad.length?bad.length+(NIGHT_PAGE?' NOT OF THIS APP: ':' IN THE NIGHT NAMESPACE: ')+bad.join(', '):(NIGHT_PAGE?'all its own or device facts':'none in the Night namespace')} · control (${need.join(', ')}) ${miss.length?'MISSING: '+miss.join(', '):'seen'} → ${res.store.pass?'PASS':'NOT A PASS'}`);
      await log('[storage census] '+L.join(' | ')); }
    /* CONTROL of the network check: a worker of ours asks an unlisted host (intercepted here and aborted — nothing leaves the machine);
       the check must see it, then that one request is set aside */
    { const CTL='https://example.com/handsong-net-control', f=path.join(LOGDIR,'net-control-worker.js');
      await writeFile(f, `fetch(${JSON.stringify(CTL)}).catch(()=>{}).finally(()=>postMessage(1));`);
      await ctx.route(CTL, r=>r.abort());
      await within(page.evaluate(()=>new Promise(r=>{ const w=new Worker('/tools/.probe-logs/net-control-worker.js'); w.onmessage=()=>{ w.terminate(); r(); }; w.onerror=()=>r(); setTimeout(r,5000); })), 15e3, 'the network control');
      const k=res.net.bad.indexOf(CTL); res.net.ctl=k>=0; if(k>=0) res.net.bad.splice(k,1);
      await rm(f,{ force:true }); }
    { const N=res.net; N.pass=!N.bad.length && N.n>0 && N.ctl;
      out(`[${label}] network (PRIV1, LAT2): ${N.n} request(s) of the page and its workers (${N.workers} worker(s) started${N.workerUrls.length?': '+[...new Set(N.workerUrls)].join(', '):''}) — ${N.bad.length?N.bad.length+' OUTSIDE the own origin and the MediaPipe paths: '+N.bad.slice(0,5).join(', '):'all to the own origin or the MediaPipe paths'} · control (a worker asking an unlisted host) ${N.ctl?'caught':'NOT CAUGHT'} → ${N.pass?'PASS':'NOT A PASS'}`); }
    { const C=res.csp; C.pass=C.meta && !C.list.length && C.blocked && C.ctl;
      out(`[${label}] CSP (PRIV1): policy ${C.meta?'present':'MISSING'} · ${C.list.length} violation(s) during the run${C.list.length?' — '+C.list.slice(0,5).map(x=>`${x.dir} ${x.uri} (${x.src}:${x.line})`).join('; '):''} · control fetch to https://example.com ${C.blocked&&C.ctl?'refused by connect-src':'NOT REFUSED ('+(C.err||'it went out')+')'} → ${C.pass?'PASS':'NOT A PASS'}`); }
    if(NIGHT_PAGE && !DUMP && !(EVAL && THROTTLE)){   // CORE-20: not after a throttled --eval (its page runs 4× slower); NIGHT-7b: stale saved values → the start card still fully labelled (last: it reloads the page)
      res.stale=await within(uiNightStale(page, `[${label}] NIGHT stale saved values`), LIMIT_START+120e3, 'the stale-values check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT stale saved values: ERROR — ${e&&e.message||e}`] }));
      for(const l of res.stale.lines) out(l);
      const mu=await within(uiNightMusic(page, `[${label}] NIGHT music and full screen`), 3*LIMIT_START, 'the music check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT music and full screen: ERROR — ${e&&e.message||e}`] }));
      for(const l of mu.lines) out(l);
      /* NIGHT-8b: full screen with the camera undecided (the Poco), and the first frames of the page */
      const fu=await within(uiNightFsUndecided(page, `[${label}] NIGHT full screen, camera undecided`), 3*LIMIT_START, 'the undecided-camera check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT full screen, camera undecided: ERROR — ${e&&e.message||e}`] }));
      for(const l of fu.lines) out(l);
      const ff=await within(uiNightFirstFrames(page, `[${label}] NIGHT first frames`), 90e3, 'the first-frames check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT first frames: ERROR — ${e&&e.message||e}`] }));
      for(const l of ff.lines) out(l);
      const cm=await within(uiNightCamera(page, `[${label}] NIGHT camera choice`), 6*LIMIT_START, 'the camera check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT camera choice: ERROR — ${e&&e.message||e}`] }));   // NIGHT-10
      for(const l of cm.lines) out(l);
      const hs=await within(uiNightStart(page, `[${label}] NIGHT honest start`), 8*LIMIT_START, 'the honest-start check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT honest start: ERROR — ${e&&e.message||e}`] }));   // NIGHT-11 part 2
      for(const l of hs.lines) out(l);
      const ht=await within(uiNightHowTo(page, `[${label}] NIGHT how to play`), 4*LIMIT_START, 'the how-to-play check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT how to play: ERROR — ${e&&e.message||e}`] }));   // NIGHT-12
      for(const l of ht.lines) out(l);
      const tl=await within(uiNightTimeline(page, `[${label}] NIGHT start timeline`), (THROTTLE ? 25 : 8)*60e3, 'the start timeline').catch(e=>({ pass:false, lines:[`[${label}] NIGHT start timeline: ERROR — ${e&&e.message||e}`] }));   // NIGHT-11 part 3
      for(const l of tl.lines) out(l);
      const od=await within(uiNightOrder(page, `[${label}] NIGHT first contact order`), 4*LIMIT_START, 'the order check').catch(e=>({ pass:false, lines:[`[${label}] NIGHT first contact order: ERROR — ${e&&e.message||e}`] }));   // NIGHT-11 part 4
      for(const l of od.lines) out(l);
      res.stale={ pass:res.stale.pass && mu.pass && fu.pass && ff.pass && cm.pass && hs.pass && ht.pass && tl.pass && od.pass, lines:[...res.stale.lines, ...mu.lines, ...fu.lines, ...ff.lines, ...cm.lines, ...hs.lines, ...ht.lines, ...tl.lines, ...od.lines] };
    }
    if(!has('--no-ui') && res.ui){   // AUTOSAVE1: reload → «Continue?» → the same song (last: it reloads the page)
      const ua=await within(uiAutosave(page, `[${label}] UI autosave`), LIMIT_START+120e3, 'the autosave UI check').catch(e=>({ pass:false, lines:[`[${label}] UI autosave: ERROR — ${e&&e.message||e}`] }));
      for(const l of ua.lines) out(l);
      res.ui={ pass:res.ui.pass&&ua.pass, lines:[...res.ui.lines, ...ua.lines] };
    }
  }catch(e){ res.error=String(e&&e.message||e); out(`[${label}] ERROR — ${res.error}`); }
  finally{
    // resume the watcher (bounded: a page stuck past a time limit must not keep the browser alive), then close
    if(page) await Promise.race([ page.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', false); }).catch(()=>{}), timeout(5e3) ]);
    await closeBrowser(browser);
  }
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
await staleScan();
if(CLEAN_ONLY) process.exit(0);
await mkdir(LOGDIR,{ recursive:true });
const mode=REPEAT?`repeat${REPEAT}`:[QUICK&&'quick',ALL&&'all',has('--night')&&'night',LEAK&&'leak'].filter(Boolean).join('+');
LOG=path.join(LOGDIR, `${stamp()}-${mode}.log`);
await writeFile(LOG, `probe-browser ${argv.join(' ')}\n`);
/* CORE-20 — --measure-start [--throttle] [--root DIR]: THE START, MEASURED (no probe rows). Night's page (the repo's, or a built tree's root page with
   --root) with its probes tag taken out in flight, so only what a visitor loads is counted; two ways on the same code: «now», and ?probe&oldload (every
   scale file, no model preload from the head — the old loading). Each on a fresh profile, then a second visit in the same profile (the server answers
   like a static host: ETag, max-age=0, must-revalidate; the MediaPipe files from the real CDN — no routes, they turn the HTTP cache off —, with --throttle at
   10 Mbit/s, 150 ms and CPU 4×); on a built tree (--root) also «now» without the build's modulepreload links (stripped in flight). Per visit: requests and bytes before Begin works (own origin and MediaPipe apart; bytes = what crossed the wire),
   the time to a working Begin, and from a real tap on Begin to the first processed camera frame. Judged: every visit finished, and each MediaPipe
   preloads add no request (each MediaPipe file asked no more often than in the old way; a preload that does not match its later request would
   download twice); CONTROL: a second, uncached model download must be counted. --measure-reps N (2): the ways alternate N times (a cold browser
   favours whoever comes second; a first warm-up visit is shown, not compared). */
const MEASURE=has('--measure-start');
const MP_RE=/^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models)\//;
async function measureVisit(ctx, p, cdp, url, origin){
  const req=new Map(), t0={ v:null };
  const onReq=e=>{ if(/^(data|blob):/.test(e.request.url)) return; if(t0.v==null && e.type==='Document') t0.v=e.timestamp; if(!req.has(e.requestId)) req.set(e.requestId, { url:e.request.url, t:e.timestamp, bytes:0, done:null, status:0 }); };
  const onResp=e=>{ const r=req.get(e.requestId); if(r) r.status=e.response.status; };
  const onFin=e=>{ const r=req.get(e.requestId); if(r){ r.bytes=e.encodedDataLength||0; r.done=e.timestamp; } };
  cdp.on('Network.requestWillBeSent', onReq); cdp.on('Network.responseReceived', onResp); cdp.on('Network.loadingFinished', onFin);
  try{
    await p.goto(url, { waitUntil:'commit' });
    await p.waitForFunction(()=>window.__readyAt!=null, null, { timeout:THROTTLE ? 600e3 : 120e3 });
    const readyMs=await p.evaluate(()=>window.__readyAt);
    await p.waitForTimeout(1000);
    await p.evaluate(()=>{ (async ()=>{ const V=await import('/core/vision.js'); for(let i=0;i<24000 && window.__frameAt==null;i++){ if(V.pumpStats().processed>0) window.__frameAt=Math.round(performance.now()); await new Promise(r=>setTimeout(r, 25)); } })(); });
    const r=await p.evaluate(()=>{ const b=document.getElementById('nightBegin').getBoundingClientRect(); return [b.x+b.width/2, b.y+b.height/2]; });
    await p.mouse.click(r[0], r[1]); const tap=await p.evaluate(()=>window.__tapAt);
    const got=await p.waitForFunction(()=>window.__frameAt!=null || (!document.getElementById('camRetry').hidden && document.getElementById('start').classList.contains('on')), null, { timeout:THROTTLE ? 600e3 : 180e3 }).then(()=>true, ()=>false);
    const frame=await p.evaluate(()=>window.__frameAt);
    if(!got || frame==null){ const why=await p.evaluate(()=>({ msg:(document.getElementById('loadmsg')||{}).textContent||'', retry:!document.getElementById('camRetry').hidden, start:document.getElementById('start').classList.contains('on') })); throw new Error('no camera frame after the tap: '+JSON.stringify(why)); }
    await p.waitForTimeout(500);
    const all=[...req.values()], ready=t0.v+readyMs/1000, before=all.filter(x=>x.t<=ready), own=x=>x.url.startsWith(origin), mp=x=>MP_RE.test(x.url);
    const sum=(L, f)=>L.filter(f).reduce((n,x)=>n+((x.done!=null && x.done<=ready) ? x.bytes : 0), 0);
    const perMp={}, kbMpFile={}; for(const x of all) if(mp(x)){ const k=x.url.replace(/^.*\//, ''); perMp[k]=(perMp[k]||0)+1; kbMpFile[k]=(kbMpFile[k]||0)+Math.round(x.bytes/1024); }
    return { readyMs:Math.round(readyMs), tapToFrame:frame-tap, nOwn:before.filter(own).length, n304:before.filter(x=>own(x) && x.status===304).length, kbOwn:Math.round(sum(before, own)/1024),
      nMp:before.filter(mp).length, kbMp:Math.round(sum(before, mp)/1024), scale:before.filter(x=>/\/core\/data\/(modes|tunings|palettes|chordmodes)\//.test(x.url)).length, perMp, kbMpFile };
  } finally { cdp.off('Network.requestWillBeSent', onReq); cdp.off('Network.responseReceived', onResp); cdp.off('Network.loadingFinished', onFin); }
}
const MEASURE_INIT=()=>{ document.addEventListener('DOMContentLoaded', ()=>{ const b=document.body, done=()=>{ if(window.__readyAt==null && !b.classList.contains('night-loading')) window.__readyAt=Math.round(performance.now()); };
  done(); new MutationObserver(done).observe(b, { attributes:true, attributeFilter:['class'] }); });
  document.addEventListener('click', e=>{ if(window.__tapAt==null && e.target && e.target.closest && e.target.closest('#nightBegin')) window.__tapAt=Math.round(performance.now()); }, true);
  try{ localStorage.setItem('handsong.nightBg', 'forest'); }catch(e){} };
async function measureStart(port){
  const args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'];
  const browser=await chromium.launch({ channel:BROWSER, headless:!HEADED, args, handleSIGINT:false, handleSIGTERM:false, handleSIGHUP:false }); LIVE.browsers.add(browser);
  const origin=`http://127.0.0.1:${port}`, page=SERVE_ROOT!==ROOT ? '/index.html' : '/apps/night/index.html', bad=[], lines=[];
  try{
    const reps=Math.max(1, +val('--measure-reps', 2)||2), seen={};
    const ways=[['warm-up', '', false, 0]]; for(let k=1;k<=reps;k++) ways.push(['now', '', false, k], ['old', '&oldload', false, k], ...(SERVE_ROOT!==ROOT ? [['now without modulepreload', '&nomp', false, k]] : []));
    ways.push(['CONTROL', '', true, 0]);
    for(const [way, q, ctl, k] of ways){
      const ctx=await browser.newContext({ viewport:{ width:1280, height:800 } }); await ctx.grantPermissions(['camera','microphone'], { origin });
      try{
        await ctx.addInitScript(MEASURE_INIT);   // no routes: Playwright turns the HTTP cache off when a context routes anything
        if(ctl) await ctx.addInitScript(()=>{ document.addEventListener('DOMContentLoaded', ()=>{ fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', { cache:'no-store' }).catch(()=>{}); }); });
        const p=await ctx.newPage(), cdp=await ctx.newCDPSession(p); await cdp.send('Network.enable'); p.on('console', m=>{ log(`[${way} #${k}] [${m.type()}] ${m.text()}`).catch(()=>{}); });
        if(THROTTLE){ await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:1.25e6, uploadThroughput:4e5 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate:4 }); }
        const url=origin+page+'?probe'+q;
        for(const v of (ctl || way==='warm-up') ? ['fresh'] : ['fresh', 'second']){
          const m=await within(measureVisit(ctx, p, cdp, url, origin), THROTTLE ? 1500e3 : 400e3, `${way} ${v}`), tag=`${way} #${k}, ${v} visit`;
          if(ctl){ const base=(seen['now fresh']||{})['hand_landmarker.task']||0, got=m.perMp['hand_landmarker.task']||0;
            if(!(got>base)) bad.push(`CONTROL: a second, uncached model download was not counted (${got} vs ${base}) — the «no extra request» check cannot fail`); else lines.push(`CONTROL: a second, uncached model download is counted (${got} model requests vs ${base}) — the check can fail`); continue; }
          if(way==='warm-up'){ lines.push(`warm-up (a cold browser, not compared): Begin works at ${(m.readyMs/1000).toFixed(2)} s; tap → first camera frame ${(m.tapToFrame/1000).toFixed(2)} s`); continue; }
          if(v==='fresh'){ const key=`${way==='now without modulepreload' ? 'now' : way} fresh`; if(!seen[key]) seen[key]=m.perMp; }
          lines.push(`${tag}: before Begin works ${m.nOwn} own requests (${m.n304} answered 304, ${m.scale} scale files), ${m.kbOwn} KB; MediaPipe ${m.nMp} requests started, ${m.kbMp} KB arrived; Begin works at ${(m.readyMs/1000).toFixed(2)} s; tap → first camera frame ${(m.tapToFrame/1000).toFixed(2)} s; MediaPipe requests ${JSON.stringify(m.perMp)}, KB over the wire ${JSON.stringify(m.kbMpFile)}`);
        }
      } finally { await ctx.close().catch(()=>{}); }
    }
    /* the head's preloads add no request: every MediaPipe file asked no more often than the old way asks it (the binary twice: one per model) */
    { const a=seen['now fresh']||{}, o=seen['old fresh']||{}, more=Object.keys(a).filter(f=>(a[f]||0)>(o[f]||0));
      if(more.length) bad.push('the preloads added requests: '+more.map(f=>`${f} ${a[f]} vs ${o[f]||0}`).join(', ')); else lines.push(`the preloads add no request (each MediaPipe file asked as often as the old way: ${JSON.stringify(o)})`); }
  } finally { await closeBrowser(browser); }
  return { pass:!bad.length, lines:[...lines, ...bad.map(b=>'NOT A PASS — '+b)] };
}
const srv=await serve(), port=srv.address().port; LIVE.srv=srv;
out(`[probe-browser] ${BROWSER}, ${HEADED?'headed window placed off-screen':'headless'}; static server http://127.0.0.1:${port}; full console log → ${path.relative(ROOT,LOG)}`);
const T00=Date.now();
const sessions=[];
let pass=true;
try{
  if(MEASURE){ const M=await measureStart(port); out(`\n=== start measured (CORE-20)${THROTTLE ? ' — THROTTLED 10 Mbit/s, 150 ms, CPU 4×, the real CDN' : ' — the machine’s own connection, the real CDN'}${SERVE_ROOT!==ROOT ? ' — tree '+path.relative(ROOT, SERVE_ROOT) : ''} ===`); for(const l of M.lines) out(l);
    await closeAll(); out(`\n[probe-browser] ${M.pass ? 'PASS' : 'NOT A PASS'} — the start measured (--measure-start) · ${((Date.now()-T00)/1000).toFixed(1)} s total`); process.exit(M.pass ? 0 : 1); }
  if(REPEAT){
    for(let i=1;i<=REPEAT;i++){ out(`\n[probe-browser] run ${i} of ${REPEAT} — fresh browser, fresh profile`); await log(`===== run ${i} of ${REPEAT} =====`);
      sessions.push(await session(port, QUICK?['quick','all']:['all'], `run ${i}/${REPEAT}`)); }
  } else sessions.push(await session(port, [QUICK&&'quick', ALL&&'all', (has('--night')||(NIGHT_PAGE&&!QUICK&&!ALL&&!EVAL&&!LEAK&&!DUMP))&&'night'].filter(Boolean), mode||'eval'));   // RUN 7: --night runs P.night; SPLIT-2: the second page's default
} finally { await closeAll(); }
if(EXITING) await new Promise(()=>{});   // a signal/error path is closing — it prints and exits itself
const stillMine=(runnerBrowsers()||[]).filter(g=>g.mine);
out(`[probe-browser] cleanup: ${stillMine.length?stillMine.length+' runner browser group(s) STILL ALIVE':'browser and server closed, no runner browser left'}`);
out('\n=== summary ===');
for(const s of sessions){
  if(s.error){ pass=false; out(`[${s.label}] NOT A PASS — ${s.error}`); }
  if(s.slow) out(`[${s.label}] machine speed: slow factor ${s.slow.f.toFixed(2)} (${s.slow.n} reference rows, ${s.slow.raw.toFixed(2)}× idle) · P.quick limit ${(s.limitQuick/60e3).toFixed(1)} min`);
  for(const r of s.runs){
    out(`\n[${s.label}] P.${r.kind}: ${r.pass?'PASS':'NOT A PASS'} · ${r.seconds} s in the page (${r.wall.toFixed(1)} s wall)`);
    rowsTable(r);
    for(const l of r.lines) if(/frozen seed bass|state guard|P\.(all|quick|night):/.test(l)) out('  '+l);
    if(!r.pass) pass=false;
  }
  if(!s.runs.length && !s.error && !EVAL && !LEAK && !s.dumped) pass=false;
  if(s.ui){ out(`[${s.label}] UI checks (section rename, bend drag, song file, autosave): ${s.ui.pass?'PASS':'NOT A PASS'}`); if(!s.ui.pass) pass=false; }
  if(s.stale){ out(`[${s.label}] NIGHT stale saved values, music from Begin, full screen, first frames, camera choice, honest start, how to play, start timeline, first contact order (NIGHT-7b, 7c, 8b, 10, 11, 12): ${s.stale.pass?'PASS':'NOT A PASS'}`); if(!s.stale.pass) pass=false; }
  if(!s.error){ out(`[${s.label}] CSP (PRIV1): ${s.csp&&s.csp.pass?'PASS — no violation, the control fetch refused':'NOT A PASS'}`); if(!(s.csp&&s.csp.pass)) pass=false;
    out(`[${s.label}] network (PRIV1, LAT2): ${s.net&&s.net.pass?`PASS — ${s.net.n} requests, all to the own origin or the MediaPipe paths`:'NOT A PASS'}`); if(!(s.net&&s.net.pass)) pass=false;
    out(`[${s.label}] storage (CORE-11): ${s.store&&s.store.pass?`PASS — ${s.store.list.length} names, ${NIGHT_PAGE?'all of this app or device facts':'the Full names as before'}, the control seen`:'NOT A PASS'}`); if(!(s.store&&s.store.pass)) pass=false; }
  if(EVAL && !(s.evalResult&&s.evalResult.ok)) pass=false;
  if(LEAK){ if(!s.leakPass) pass=false; const L=s.leak; out(`[${s.label}] --leak: ${L&&L.ok?`${L.pass?'PASS':'NOT A PASS'} — ${L.n} renders: +${L.fixMB} MB with the fix (margin ${LEAK_MARGIN_MB} MB), control +${L.ctrlMB} MB`:'ERROR '+(L&&L.why)}`); }
}
if(REPEAT) repeatTable(sessions);
if(JSON_OUT){ await mkdir(path.dirname(path.resolve(JSON_OUT)),{ recursive:true }); await writeFile(path.resolve(JSON_OUT), JSON.stringify({ app:APP, pass, sessions:sessions.map(s=>({ label:s.label, error:s.error, runs:s.runs.map(r=>({ kind:r.kind, pass:r.pass, rows:r.rows })), csp:s.csp&&s.csp.pass, net:s.net&&s.net.pass, ui:s.ui&&s.ui.pass, leak:s.leakPass, requests:s.requests })) }, null, 1)); }
out(`\n[probe-browser] ${pass?'PASS':'NOT A PASS'} — ${sessions.length} browser session(s), ${sessions.reduce((n,s)=>n+s.runs.length,0)} probe run(s) · ${((Date.now()-T00)/1000).toFixed(1)} s total · log ${path.relative(ROOT,LOG)}`);
process.exitCode=pass?0:1;
