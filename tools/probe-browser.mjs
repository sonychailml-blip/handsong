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
   P.all, default 8 since GOLD1; P.quick — 3; посев — 3), --verbose (вся консоль страницы на экран).
   --cdn-cache: serve the pinned MediaPipe files from tools/.cdn-cache/ (fetched once; for a slow network).
   --limit-start M: the app start limit in minutes (default 3; the hand model comes from the CDN — raise it on a slow network).
   Hygiene: at start it lists browsers left by earlier runner sessions (found by Playwright's temporary profile path) and orphaned
   profile folders; --kill-stale kills / removes them (--clean-only: only that, then exit). Every exit path (end, failure, time limit,
   Ctrl+C, SIGTERM, uncaught error) closes the browser with a bounded wait, then kills its process tree, then closes the server;
   --selftest-exit sigint|error fires one of those paths 3 s after ▶ (a cleanup test; the run fails by design).
   UI checks with trusted input after the seed (section rename by double click / double tap / §✎, with its control; a bend point dragged
   with the mouse); --no-ui skips them.
   PRIV1: every Content-Security-Policy violation of the session fails the run; CONTROL — a fetch to https://example.com must be refused
   by connect-src (every session).
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
if(!QUICK && !ALL && !REPEAT) QUICK=true;
const EVAL=val('--eval',null);
const LEAK=has('--leak');
if((EVAL||LEAK) && !has('--quick') && !has('--all')) QUICK=false;
const HEADED=has('--headed'), VERBOSE=has('--verbose'), BROWSER=val('--browser','chrome');
const LIMIT_ALL=(+val('--limit-min',8)||8)*60e3, LIMIT_QUICK=3*60e3, LIMIT_SEED=3*60e3, LIMIT_START=(+val('--limit-start',3)||3)*60e3;   // --limit-start M: the app start (model from the CDN) — longer on a slow network
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

/* ---------- UI check with REAL input (ED6 rename fix): a double click / double tap on a section marker opens its name field and keeps it ----------
   Synthetic DOM events carry no default actions (the focus move of a press), so this runs from here with trusted input: Playwright's mouse
   and CDP touch. The page part puts one marker in the window and reports its screen point; after the gesture the field must be visible and
   focused 400 ms later; typing a name + Enter must rename the marker. CONTROL (when the app has the switch): the old behaviour — the field
   opened inside the second press, no blur guard — must fail. Everything is undone: the window closed, the marker removed, the history reset. */
async function uiSecRename(page, cdp, label){
  const lines=[], bad=[];
  const prep=await page.evaluate(async ()=>{
    const UI=await import('./src/ui.js'), REC=await import('./src/recorder.js'), D=await import('./src/draw.js');
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
  const nameOf=id=>page.evaluate(async id=>{ const REC=await import('./src/recorder.js'); const m=REC.sections().find(x=>x.id===id); return m&&m.name; }, prep.id);
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
    await page.evaluate(async ()=>{ const UI=await import('./src/ui.js'); UI.arrApi.secRenameDbg('down'); });
    const d=await tryOne('mouse','Ctrl');
    await page.evaluate(async ()=>{ const UI=await import('./src/ui.js'); UI.arrApi.secRenameDbg(null); const el=document.getElementById('secNameIn'); if(el&&!el.hidden){ el.dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape' })); } });
    if(!d) bad.push('CONTROL: with the field opened inside the second press (the old code) the double click still worked — the check cannot fail');
    else lines.push(`control (old behaviour) fails as it must — ${d}`);
  } else lines.push('no control switch in this build (arrApi.secRenameDbg) — control not run');
  await page.evaluate(async id=>{ const UI=await import('./src/ui.js'), REC=await import('./src/recorder.js');
    if(REC.secDelete) REC.secDelete(id); if(REC.histReset) REC.histReset(); else if(REC.songHistReset) REC.songHistReset(); UI.arrApi.close(); }, prep.id);
  return { pass:!bad.length, lines:[...lines.map(l=>`${label}: ${l}`), ...bad.map(b=>`${label}: NOT A PASS — ${b}`)] };
}

/* ---------- UI check with REAL input (OWN2): drag a bend point of the selected theremin note upward → higher cents, one history step ---------- */
async function uiBendDrag(page, label){
  const prep=await page.evaluate(async ()=>{
    const UI=await import('./src/ui.js'), REC=await import('./src/recorder.js'), D=await import('./src/draw.js'), ST=await import('./src/state.js');
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
  const after=await page.evaluate(async ()=>{ const REC=await import('./src/recorder.js'); const e=window.__bendEv; return { c:e.a.bend[1].c, n:REC.histLen() }; });
  const lines=[], bad=[];
  if(!(after.c>prep.c0)) bad.push(`dragging point 2 up 36 px left its cents at ${after.c} (was ${prep.c0})`);
  else if(after.n!==1) bad.push(`the drag left ${after.n} history steps, one intended`);
  else lines.push(`dragging point 2 up: ${prep.c0} → ${after.c} cents, one history step`);
  await page.evaluate(async ()=>{ const UI=await import('./src/ui.js'), REC=await import('./src/recorder.js'); while(REC.histLen()) if(!REC.histUndo()) break; REC.histReset(); UI.arrApi.closeTrack(); UI.arrApi.close(); delete window.__bendEv; });
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
  let page=null;
  try{
    const ctx=await browser.newContext({ viewport:{ width:1280, height:800 } });
    const origin=`http://127.0.0.1:${port}`;
    await ctx.grantPermissions(['camera','microphone'],{ origin });
    if(CDN_CACHE) await cdnCache(ctx);
    /* PRIV1: every Content-Security-Policy violation of the whole session is collected (an init script runs before the page's own) */
    await ctx.addInitScript(()=>{ window.__csp=[]; document.addEventListener('securitypolicyviolation', e=>window.__csp.push({ dir:e.effectiveDirective||e.violatedDirective, uri:e.blockedURI, src:e.sourceFile, line:e.lineNumber })); });
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
    /* --selftest-exit sigint|error: fire that exit path once the app is starting (tests the cleanup; the run fails by design) */
    const ST=val('--selftest-exit',null);
    if(ST) setTimeout(()=>{ if(ST==='sigint') process.emit('SIGINT'); else Promise.reject(new Error('selftest')); }, 3000);
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
    if(!has('--no-ui')){   // the trusted-input UI check (section rename) — every session; --no-ui skips it
      const ucdp=await ctx.newCDPSession(page);
      res.ui=await within(uiSecRename(page, ucdp, `[${label}] UI section rename`), 60e3, 'the UI check').catch(e=>({ pass:false, lines:[`[${label}] UI section rename: ERROR — ${e&&e.message||e}`] }));
      for(const l of res.ui.lines) out(l);
      const ub=await within(uiBendDrag(page, `[${label}] UI bend drag`), 60e3, 'the bend UI check').catch(e=>({ pass:false, lines:[`[${label}] UI bend drag: ERROR — ${e&&e.message||e}`] }));
      for(const l of ub.lines) out(l);
      res.ui={ pass:res.ui.pass&&ub.pass, lines:[...res.ui.lines, ...ub.lines] };
    }
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
      // evaluated as an expression through the debugger (the page's CSP forbids new Function — PRIV1)
      const expr=`(async()=>{ try{ return { ok:true, value:await (async()=>{${src}\n})() }; }catch(e){ return { ok:false, error:String(e&&e.stack||e) }; } })()`;
      const r=await within(page.evaluate(expr), LIMIT_ALL, '--eval');
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
    /* PRIV1: no CSP violation in the whole session; CONTROL — a fetch to an unlisted host must be refused by connect-src (no request leaves) */
    res.csp=await within(page.evaluate(async ()=>{
      const meta=!!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), before=window.__csp.slice();
      let blocked=false, err=''; try{ await fetch('https://example.com/handsong-csp-control'); }catch(e){ blocked=true; err=String(e&&e.message||e); }
      await new Promise(r=>setTimeout(r,300));
      const v=window.__csp.slice(before.length);
      return { meta, list:before, blocked, err, ctl:v.some(x=>/connect-src/.test(x.dir)&&/example\.com/.test(x.uri)) };
    }), 30e3, 'the CSP check');
    { const C=res.csp; C.pass=C.meta && !C.list.length && C.blocked && C.ctl;
      out(`[${label}] CSP (PRIV1): policy ${C.meta?'present':'MISSING'} · ${C.list.length} violation(s) during the run${C.list.length?' — '+C.list.slice(0,5).map(x=>`${x.dir} ${x.uri} (${x.src}:${x.line})`).join('; '):''} · control fetch to https://example.com ${C.blocked&&C.ctl?'refused by connect-src':'NOT REFUSED ('+(C.err||'it went out')+')'} → ${C.pass?'PASS':'NOT A PASS'}`); }
  }catch(e){ res.error=String(e&&e.message||e); out(`[${label}] ERROR — ${res.error}`); }
  finally{
    // resume the watcher (bounded: a page stuck past a time limit must not keep the browser alive), then close
    if(page) await Promise.race([ page.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', false); }).catch(()=>{}), timeout(5e3) ]);
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
const mode=REPEAT?`repeat${REPEAT}`:[QUICK&&'quick',ALL&&'all',LEAK&&'leak'].filter(Boolean).join('+');
LOG=path.join(LOGDIR, `${stamp()}-${mode}.log`);
await writeFile(LOG, `probe-browser ${argv.join(' ')}\n`);
const srv=await serve(), port=srv.address().port; LIVE.srv=srv;
out(`[probe-browser] ${BROWSER}, ${HEADED?'headed window placed off-screen':'headless'}; static server http://127.0.0.1:${port}; full console log → ${path.relative(ROOT,LOG)}`);
const T00=Date.now();
const sessions=[];
let pass=true;
try{
  if(REPEAT){
    for(let i=1;i<=REPEAT;i++){ out(`\n[probe-browser] run ${i} of ${REPEAT} — fresh browser, fresh profile`); await log(`===== run ${i} of ${REPEAT} =====`);
      sessions.push(await session(port, QUICK?['quick','all']:['all'], `run ${i}/${REPEAT}`)); }
  } else sessions.push(await session(port, [QUICK&&'quick', ALL&&'all'].filter(Boolean), mode||'eval'));
} finally { await closeAll(); }
if(EXITING) await new Promise(()=>{});   // a signal/error path is closing — it prints and exits itself
const stillMine=(runnerBrowsers()||[]).filter(g=>g.mine);
out(`[probe-browser] cleanup: ${stillMine.length?stillMine.length+' runner browser group(s) STILL ALIVE':'browser and server closed, no runner browser left'}`);
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
  if(s.ui){ out(`[${s.label}] UI checks (section rename, bend drag): ${s.ui.pass?'PASS':'NOT A PASS'}`); if(!s.ui.pass) pass=false; }
  if(!s.error){ out(`[${s.label}] CSP (PRIV1): ${s.csp&&s.csp.pass?'PASS — no violation, the control fetch refused':'NOT A PASS'}`); if(!(s.csp&&s.csp.pass)) pass=false; }
  if(EVAL && !(s.evalResult&&s.evalResult.ok)) pass=false;
  if(LEAK){ if(!s.leakPass) pass=false; const L=s.leak; out(`[${s.label}] --leak: ${L&&L.ok?`${L.pass?'PASS':'NOT A PASS'} — ${L.n} renders: +${L.fixMB} MB with the fix (margin ${LEAK_MARGIN_MB} MB), control +${L.ctrlMB} MB`:'ERROR '+(L&&L.why)}`); }
}
if(REPEAT) repeatTable(sessions);
out(`\n[probe-browser] ${pass?'PASS':'NOT A PASS'} — ${sessions.length} browser session(s), ${sessions.reduce((n,s)=>n+s.runs.length,0)} probe run(s) · ${((Date.now()-T00)/1000).toFixed(1)} s total · log ${path.relative(ROOT,LOG)}`);
process.exitCode=pass?0:1;
