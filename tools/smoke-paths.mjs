/* SPLIT-2: THE PATH SMOKE TEST — a real page load, because only a browser shows a path failure in addModule or a fetch. For each target it opens the
   page (repo tree, or a built tree with --dist), presses Play / Begin and asserts: no failed request (allow-list: the Vercel counter outside Vercel), no
   console error, page error or CSP violation, worklets loaded, hand model loaded, first camera frame detected and drawn, only allowed hosts. Each page also
   runs from a sub-folder (proves «works from any folder»). CONTROL: a run with one worklet missing must fail. Exit 0 / 1, verdict line last.
     node tools/smoke-paths.mjs [--build] [--no-control]
   --build also builds production and preview trees (tools/.build/) and checks them: each from the root and a sub-folder; `?probe` must give window.P on a preview and nothing on production;
   the root redirect; Night's Measure button (on, and hidden in a release edition). */
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), CDN_DIR=path.join(ROOT,'tools','.cdn-cache');
const argv=process.argv.slice(2), out=s=>console.log(s), NO_CONTROL=argv.includes('--no-control');
/* the tree's entry pages: moved with the layout */
const PAGES={ full:'apps/full/', night:'apps/night/' };
const BEGIN={ full:'#startBtn', night:'#nightBegin' };
const BUILD=argv.includes('--build'), BUILD_DIR=path.join(ROOT,'tools','.build');
function build(app, kind){ const dir=path.join(BUILD_DIR,`${app}-${kind}`), a=['tools/build.mjs','--out',dir]; if(kind==='preview') a.push('--probes');
  const r=spawnSync(process.execPath,a,{ cwd:ROOT, encoding:'utf8', env:{ ...process.env, HANDSONG_APP:app, HANDSONG_EDITION:kind==='release'?'release':'', VERCEL_ENV:'' } }); out((r.stdout||'').trim()||(r.stderr||'').trim()); if(r.status!==0) throw new Error('build failed: '+app+' '+kind); return dir; }
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.woff2':'font/woff2' };
/* the server logs every request: a worklet's fetch is invisible to Playwright's own events. breakName = a file it refuses (the CONTROL) */
function serve(dir, prefix, log, breakName){
  const srv=http.createServer(async (q,r)=>{ const P=new URL(q.url,'http://x').pathname, no=()=>{ log.push([P,404]); r.writeHead(404); r.end(); };
    try{ let p=decodeURIComponent(P);
    if(!p.startsWith(prefix) || (breakName && p.endsWith('/'+breakName))) return no(); p=p.slice(prefix.length-1); if(p.endsWith('/')) p+='index.html';
    const f=path.join(dir,p); if(!f.startsWith(dir)){ r.writeHead(403); r.end(); return; }
    const b=await readFile(f); log.push([P,200]); r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }
    catch(e){ no(); } });
  return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res(srv)));
}
async function cdnCache(ctx){   // the runner's cached MediaPipe files: a smoke test measures paths, not the network
  await mkdir(CDN_DIR,{ recursive:true }); const keyOf=u=>Buffer.from(u).toString('base64url').slice(-120);
  await ctx.route(/^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models)\//, async route=>{
    const u=route.request().url(), f=path.join(CDN_DIR,keyOf(u));
    try{ const meta=JSON.parse(await readFile(f+'.json','utf8')); return route.fulfill({ status:200, headers:meta.headers, body:await readFile(f) }); }catch(e){}
    const r=await route.fetch({ timeout:0 }), body=await r.body(), h=r.headers(), headers={ 'content-type':h['content-type']||'application/octet-stream', 'access-control-allow-origin':'*' };
    if(r.status()===200){ await writeFile(f,body); await writeFile(f+'.json',JSON.stringify({ url:u, headers })); }
    return route.fulfill({ status:r.status(), headers, body }); });
}
const ALLOWED_404=/\/_vercel\/insights\/script\.js$/;
const HOSTS=['https://cdn.jsdelivr.net/npm/@mediapipe/','https://storage.googleapis.com/mediapipe-models/'];
async function run(app, dir, prefix, breakWorklet=false, measureOn=true){
  const label=`${app}${dir===ROOT?'':' (built)'} at ${prefix}`, bad=[], miss=s=>bad.push(s), served=[], srv=await serve(dir,prefix,served,breakWorklet?'ks-worklet.js':null), origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
  const seen=[];
  try{
    const ctx=await browser.newContext({ viewport:{ width:1280, height:800 } }); await ctx.grantPermissions(['camera','microphone'],{ origin }); await cdnCache(ctx);
    await ctx.addInitScript(()=>{ window.__csp=[]; document.addEventListener('securitypolicyviolation', e=>window.__csp.push(e.effectiveDirective+' '+e.blockedURI)); });
    ctx.on('response', q=>{ const u=q.url(), st=q.status(); if(/^(data|blob):/.test(u)) return; seen.push([u,st]);
      if(st>=400 && !ALLOWED_404.test(u.split('?')[0])) miss(`HTTP ${st} ${u.replace(origin,'')}`);
      if(!u.startsWith(origin) && !HOSTS.some(h=>u.startsWith(h))) miss('unlisted host: '+u); });
    ctx.on('requestfailed', q=>{ const u=q.url(); if(!/^(data|blob):/.test(u) && !ALLOWED_404.test(u.split('?')[0])) miss(`request failed ${u.replace(origin,'')} (${q.failure()&&q.failure().errorText})`); });
    const page=await ctx.newPage();
    page.on('pageerror', e=>miss('page error: '+(e&&e.message||e)));
    page.on('console', m=>{ if(m.type()!=='error') return; const t=m.text(), at=(m.location()||{}).url||''; if(/Failed to load resource/.test(t) && (ALLOWED_404.test(at.split('?')[0])||/\b40\d\b/.test(t))) return; /* a status is judged above */ miss('console error: '+t.slice(0,200)); });
    await page.goto(origin+prefix+(dir===ROOT ? PAGES[app] : ''));
    await page.waitForSelector(BEGIN[app], { state:'visible', timeout:60e3 });
    await page.waitForTimeout(800);
    await page.click(BEGIN[app]);
    await page.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
    const urlOf=n=>{ const r=seen.find(([u])=>u.startsWith(origin)&&u.split('?')[0].endsWith('/'+n)); return r&&r[0]; };
    for(const w of ['ks-worklet.js','frz-worklet.js','dyn-worklet.js']){ const r=served.find(([u])=>u.endsWith('/'+w)); if(!r||r[1]!==200) miss(`worklet ${w}: ${r?'HTTP '+r[1]:'never requested'}`); }
    if(!seen.some(([u,st])=>/hand_landmarker\.task/.test(u)&&st===200)) miss('the hand model was not loaded');
    if(!seen.some(([u,st])=>/vision_wasm.*\.wasm/.test(u)&&st===200)) miss('the hand model WASM was not loaded');
    const busUrl=urlOf('bus.js'), audioUrl=urlOf('audio.js');
    if(!busUrl||!audioUrl) miss('bus.js or audio.js not seen');
    else{ const fr=await page.evaluate(async ([b,a])=>{ const B=(await import(b)).BUS, A=await import(a); const t0=performance.now();
        while(performance.now()-t0<60e3){ if(BUS_OK(B)) break; await new Promise(r=>setTimeout(r,100)); }
        function BUS_OK(x){ const p=x.get('picture'); return p && typeof ImageBitmap!=='undefined' && p instanceof ImageBitmap; }
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const c=document.getElementById('canvas'), g=c.getContext('2d'), d=g.getImageData(0,0,c.width,c.height).data; let lit=0; for(let i=0;i<d.length;i+=4000) if(d[i]||d[i+1]||d[i+2]||d[i+3]) lit++;
        return { detected:BUS_OK(B), lit, ac:A.AC&&A.AC.state, csp:window.__csp.slice(), scene:!!document.getElementById('scene') }; }, [busUrl,audioUrl]);
      if(!fr.detected) miss('no camera frame was detected in 60 s');
      if(fr.ac!=='running') miss('audio is '+fr.ac);
      if(fr.csp.length) miss('CSP violation: '+fr.csp.slice(0,3).join('; '));
      if(app==='full' && !fr.lit) miss('the first frame drew nothing on the canvas');
      if(app==='night' && !fr.scene && !fr.lit) miss('neither the room nor the canvas drew anything'); }
    if(app==='full'){ if(seen.some(([u])=>/three\.min\.js|\.woff2|\/apps\/night\//.test(u))) miss('Full requested the forest library, its fonts or a Night file'); }
    if(app==='night'){ await page.waitForTimeout(1500);
      const f=await page.evaluate(async ()=>{ await document.fonts.ready; return [...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family.replace(/"/g,'')); });
      if(!f.includes('Andika')) miss('the Andika font did not load: '+f.join(','));
      if(!seen.some(([u,st])=>/three\.min\.js/.test(u)&&st===200)) miss('the forest library did not load');
      const hid=await page.evaluate(()=>document.getElementById('nightMeasure').hidden); if(hid===measureOn) miss(`«Measure this device» is ${hid?'hidden':'shown'}, expected ${measureOn?'shown':'hidden'}`); }
  }catch(e){ miss('error: '+(e&&e.message||e)); }
  finally{ await browser.close().catch(()=>{}); srv.close(); }
  for(const [u,st] of served) if(st>=400 && !ALLOWED_404.test(u) && !bad.some(x=>x.includes(u))) miss(`HTTP ${st} ${u}`);   // what Playwright's events do not see
  out(`[smoke] ${label}: ${bad.length?'NOT A PASS — '+bad.length+' problem(s), '+seen.length+' responses':'PASS — '+seen.length+' responses'}`);
  for(const b of bad.slice(0,8)) out('    '+b);
  return bad;
}
let fails=0;
/* CORE-1 CP1: the guided measuring page, which must load with no console: model and fake camera up, one real step (no hand: it must ask to repeat), a scripted run to the report, the copy.
   A production tree must not hold it. breakName = a file refused (the CONTROL). */
const STATS='tools/probes/core/handstats.html';
async function statsPage(label, dir, breakName=null){ const served=[], bad=[], srv=await serve(dir,'/',served,breakName), origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
  try{ const ctx=await browser.newContext({ viewport:{ width:390, height:800 } }); await ctx.grantPermissions(['camera','clipboard-read','clipboard-write'],{ origin }); await cdnCache(ctx);
    await ctx.addInitScript(()=>{ window.__csp=[]; document.addEventListener('securitypolicyviolation', e=>window.__csp.push(e.effectiveDirective+' '+e.blockedURI)); });
    const page=await ctx.newPage(); page.on('pageerror', e=>bad.push('page error: '+(e&&e.message||e)));
    page.on('console', m=>{ if(m.type()==='error') bad.push('console error: '+m.text().slice(0,160)); });
    await page.goto(origin+'/'+STATS); await page.click('#go');
    await page.waitForFunction(()=>window.__handstats.loaded() && window.__handstats.phase()==='step:near', null, { timeout:180e3 });
    await page.click('#go'); await page.waitForFunction(()=>document.getElementById('note').textContent.length>0, null, { timeout:30e3 });
    if((await page.evaluate(()=>window.__handstats.phase()))!=='step:near') bad.push('a step with no hand was accepted');
    const r=await page.evaluate(()=>{ const still=z=>Array.from({ length:151 },(_,i)=>({ t:i*1000/30, hand:{ size:z+(i%2?0.002:-0.002), wx:0.5, wy:0.5, pinch:1, out:false } }));
      const rep=window.__handstats.fill({ near:still(0.2), far:still(0.125), pinch:still(0.15), open:still(0.16), move:still(0.16) });
      return { format:rep.format, gain:rep.derived.gain, text:document.getElementById('out').value, phase:window.__handstats.phase(), csp:window.__csp.slice() }; });
    if(r.format!=='handsong/handstats' || !(r.gain>2) || r.phase!=='done' || JSON.parse(r.text).format!==r.format) bad.push('the report is wrong: '+JSON.stringify(r).slice(0,160));
    if(r.csp.length) bad.push('CSP violation: '+r.csp.slice(0,3).join('; '));
    await page.click('#go');
    const copied=await page.waitForFunction(async t=>(await navigator.clipboard.readText())===t, r.text, { timeout:10e3 }).then(()=>true,()=>false); if(!copied) bad.push('the clipboard does not hold the report');
    if(!served.some(([u,st])=>/handstats\.js$/.test(u)&&st===200)) bad.push('the page script was not served');
  }catch(e){ bad.push('error: '+(e&&e.message||e)); } finally{ await browser.close().catch(()=>{}); srv.close(); }
  out(`[smoke] measuring page, ${label}: ${bad.length?'NOT A PASS — '+bad.slice(0,5).join(' · '):'PASS'}`); return bad; }
async function statsAbsent(dir){ const served=[], srv=await serve(dir,'/',served,null), origin=`http://127.0.0.1:${srv.address().port}`; let st=0; try{ st=(await fetch(origin+'/'+STATS)).status; }catch(e){} srv.close(); const ok=st===404; out(`[smoke] measuring page on production: ${ok?'PASS — absent':'NOT A PASS — HTTP '+st}`); return ok?0:1; }
/* CORE-1: the development calibration panel: ?probe&calpanel shows it where probes are carried, ?probe alone doesn't, production never */
async function panelGate(label, dir, addr, want, breakName=null){ const served=[], bad=[], srv=await serve(dir,'/',served,breakName), origin=`http://127.0.0.1:${srv.address().port}`, browser=await chromium.launch({ channel:'chrome', headless:true });
  try{ const ctx=await browser.newContext({ viewport:{ width:390, height:800 } }); await cdnCache(ctx); const page=await ctx.newPage(); page.on('pageerror', e=>bad.push('page error: '+(e&&e.message||e)));
    await page.goto(origin+addr+'?probe&calpanel');
    if(want){ await page.waitForSelector('#calPill',{ timeout:90e3 }).catch(()=>bad.push('the panel did not appear'));
      if(!bad.length){ await page.click('#calPill'); await page.click('#calPanel button:has-text("1.4×") >> nth=0'); const r=await page.evaluate(()=>({ say:document.getElementById('calSay').textContent, on:document.querySelectorAll('#calPanel button.on').length, key:Object.keys(localStorage).filter(k=>k.startsWith('handsong.handCal.')) }));
        if(!/Play/.test(r.say)) bad.push('before Play it should ask for Play: '+r.say); if(r.on<2) bad.push('the slider stops show no choice'); if(r.key.length!==1 || !/\.dev-(full|night)$/.test(r.key[0])) bad.push('the panel stored under '+r.key.join()); if(/thumb|label/i.test(await page.evaluate(k=>localStorage.getItem(k),r.key[0]))) bad.push('the record holds more than numbers'); }
      await page.goto(origin+addr+'?probe'); await page.waitForFunction(()=>window.P,null,{ timeout:90e3 }).catch(()=>bad.push('window.P did not appear')); await page.waitForTimeout(500); if(await page.$('#calPill')) bad.push('?probe alone shows the panel'); }
    else { await page.waitForSelector('#startBtn',{ state:'attached', timeout:60e3 }).catch(()=>{}); await page.waitForTimeout(3000); if(await page.$('#calPill')) bad.push('the panel exists on production'); if(served.some(([u])=>/calpanel/.test(u))) bad.push('production served the panel'); }
  }catch(e){ bad.push('error: '+(e&&e.message||e)); } finally{ await browser.close().catch(()=>{}); srv.close(); }
  out(`[smoke] calibration panel, ${label}: ${bad.length?'NOT A PASS — '+bad.slice(0,4).join(' · '):'PASS'}`); return bad; }
/* ?probe on a built tree: window.P on a preview, nothing at all on production */
async function probeGate(app, dir, want){ const served=[], srv=await serve(dir,'/',served,null), origin=`http://127.0.0.1:${srv.address().port}`, browser=await chromium.launch({ channel:'chrome', headless:true }); const bad=[];
  try{ const ctx=await browser.newContext(); await cdnCache(ctx); const page=await ctx.newPage(); await page.goto(origin+'/?probe');
    if(want){ await page.waitForFunction(()=>window.P && typeof window.P.all==='function', null, { timeout:60e3 }).catch(()=>bad.push('window.P did not appear')); }
    else { await page.waitForSelector(BEGIN[app], { state:'attached', timeout:60e3 }); await page.waitForTimeout(3000); if(await page.evaluate(()=>!!window.P)) bad.push('window.P exists on production'); if(served.some(([u])=>u.startsWith('/tools/'))) bad.push('production requested a tool: '+served.find(([u])=>u.startsWith('/tools/'))[0]); if(await page.evaluate(()=>!!document.querySelector('link[rel="handsong-probes"]'))) bad.push('production keeps the probes tag'); }
    for(const [u,st] of served) if(st>=400 && !ALLOWED_404.test(u)) bad.push(`HTTP ${st} ${u}`);
  }catch(e){ bad.push('error: '+(e&&e.message||e)); } finally{ await browser.close().catch(()=>{}); srv.close(); }
  out(`[smoke] ?probe on ${app} ${want?'preview':'production'}: ${bad.length?'NOT A PASS — '+bad.join(' · '):'PASS — '+(want?'window.P ready':'nothing loaded')}`); return bad.length; }
/* the repository root leads to the Full app */
async function redirectCheck(){ const served=[], srv=await serve(ROOT,'/',served,null), origin=`http://127.0.0.1:${srv.address().port}`, browser=await chromium.launch({ channel:'chrome', headless:true }); let ok=false;
  try{ const ctx=await browser.newContext(); await cdnCache(ctx); const page=await ctx.newPage(); await page.goto(origin+'/'); await page.waitForURL(/\/apps\/full\/$/,{ timeout:20e3 }); ok=await page.waitForSelector('#startBtn',{ state:'attached', timeout:60e3 }).then(()=>true); }catch(e){ out('    '+(e&&e.message||e)); }
  finally{ await browser.close().catch(()=>{}); srv.close(); } out(`[smoke] root redirect: ${ok?'PASS — / leads to apps/full/':'NOT A PASS'}`); return ok?0:1; }
for(const app of ['full','night']) for(const prefix of ['/','/some/sub/']) if((await run(app,ROOT,prefix)).length) fails++;
if((await statsPage('repo tree',ROOT)).length) fails++;
for(const app of ['full','night']) if((await panelGate(`${app}, repo tree`,ROOT,`/apps/${app}/`,true)).length) fails++;
if(!NO_CONTROL){ const c=await panelGate('CONTROL (its file refused)',ROOT,'/apps/night/',true,'calpanel.js'); out(`[smoke] CONTROL (the panel without its file must fail): ${c.length?'caught':'NOT caught'}`); if(!c.length) fails++; }
if(!NO_CONTROL){ const c=await statsPage('CONTROL (its sums refused)',ROOT,'handstats-calc.js'); const caught=c.length>0; out(`[smoke] CONTROL (the measuring page without its sums must fail): ${caught?'caught':'NOT CAUGHT — the test cannot fail'}`); if(!caught) fails++; }
let prodFull=null;
if(BUILD){ fails+=await redirectCheck();
  for(const app of ['full','night']){ const prod=build(app,'production'), prev=build(app,'preview'); if(app==='full') prodFull=prod;
    for(const prefix of ['/','/some/sub/']) if((await run(app,prod,prefix)).length) fails++;
    if((await run(app,prev,'/')).length) fails++;
    fails+=await probeGate(app,prod,false); fails+=await probeGate(app,prev,true);
    if((await statsPage(`${app} preview`,prev)).length) fails++; fails+=await statsAbsent(prod);
    if((await panelGate(`${app} preview`,prev,'/',true)).length) fails++; if((await panelGate(`${app} production`,prod,'/',false)).length) fails++; }
  if((await run('night',build('night','release'),'/',false,false)).length) fails++; }
if(!NO_CONTROL){ const c=await run('full',prodFull||ROOT,'/',true); const caught=c.some(x=>/ks-worklet/.test(x));
  out(`[smoke] CONTROL (a missing worklet must fail): ${caught?'caught':'NOT CAUGHT — the test cannot fail'}`); if(!caught) fails++; }
out(`[smoke] ${fails?'NOT A PASS — '+fails+' target(s) failed':'PASS — every target loaded, control caught'}`);
process.exit(fails?1:0);
