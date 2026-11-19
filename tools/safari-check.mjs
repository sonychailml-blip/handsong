/* SAFARI-1 — NIGHT IN SAFARI'S ENGINE (dev tool; never runs in the app). Its own static server and Playwright's WebKit (the engine of Safari on iPhone,
   iPad and Mac), at an iPhone's size (390 × 844, touch, iOS user agent) and a Mac's (1440 × 900). WebKit has no fake-camera switch, so the page gets a
   camera of our own: a canvas stream (a moving shape) behind getUserMedia / enumerateDevices. Every stage has an upper time limit and FAILS when it
   is reached. Stages: the start screen; Begin (a tap) — the audio session, the AudioContext running and its clock moving; the camera; the hand model
   on the GPU and on the CPU (frames detected); both rooms drawn; the three quality levels; languages (ru, de, a first visit's choice); an in-app
   browser's hint (Telegram, Instagram user agents on iPhone). With --root DIR (a BUILT Night, e.g. tools/.build/night-preview): the precache, a second
   visit with no network, and the «new version» line (the server serves a changed sw.js on demand).
     node tools/safari-check.mjs [--root DIR] [--only iphone|mac] [--shots]   → a verdict line; --shots: tools/.ui-snap/safari1/ */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const TREE=val('--root') ? path.resolve(ROOT, val('--root')) : ROOT, BUILT=!!val('--root'), PAGE=BUILT ? '/' : '/apps/night/', ONLY=val('--only'), SHOTS=argv.includes('--shots'), OUT=path.join(ROOT, 'tools/.ui-snap/safari1');
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8', '.webmanifest':'application/manifest+json',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.task':'application/octet-stream', '.jpg':'image/jpeg' };
let bump=0;   // --root: the sw.js served changes after /__bump (a new version)
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if(p==='/__bump'){ bump++; r.writeHead(200); r.end('ok'); return; }
  if(p.endsWith('/')) p+='index.html'; const f=path.join(TREE, p); if(!f.startsWith(TREE)){ r.writeHead(403); r.end(); return; }
  let b=await readFile(f); if(bump && p.endsWith('/sw.js')) b=Buffer.concat([b, Buffer.from(`\n// bump ${bump}\n`)]);
  r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-cache' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const BASE=`http://127.0.0.1:${srv.address().port}`;
const fails=[], lines=[], out=s=>{ lines.push(s); console.log('[safari] '+s); }, fail=s=>{ fails.push(s); console.log('[safari] FAIL — '+s); };
const UA_IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_MAC='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const DEV={ iphone:{ viewport:{ width:390, height:844 }, deviceScaleFactor:3, isMobile:true, hasTouch:true, userAgent:UA_IPHONE }, mac:{ viewport:{ width:1440, height:900 }, deviceScaleFactor:2, userAgent:UA_MAC } };
/* our camera: a canvas stream with a moving shape (no hand: the model must run on every frame, not find one) */
const CAMERA=()=>{ const mk=()=>{ const c=document.createElement('canvas'); c.width=640; c.height=480; const g=c.getContext('2d'); let t=0;
    setInterval(()=>{ g.fillStyle='#2a2c38'; g.fillRect(0, 0, 640, 480); g.fillStyle='#d4a985'; g.beginPath(); g.arc(320+120*Math.sin(t/25), 240+40*Math.cos(t/31), 70, 0, 7); g.fill(); t++; }, 33);
    return c.captureStream(30); };
  let S=null; const md=navigator.mediaDevices || {}; if(!navigator.mediaDevices) try{ Object.defineProperty(navigator, 'mediaDevices', { value:md, configurable:true }); }catch(e){}
  md.getUserMedia=async c=>{ if(c && c.audio && !c.video) throw new DOMException('no microphone', 'NotFoundError'); if(!S) S=mk(); window.__camAsked=(window.__camAsked||0)+1; return S.clone ? S.clone() : S; };
  md.enumerateDevices=async ()=>[{ kind:'videoinput', deviceId:'cam-1', groupId:'g', label: window.__camAsked ? 'Our test camera' : '' , toJSON(){ return this; } }];
  if(!md.addEventListener) md.addEventListener=()=>{}; };
const browser=await webkit.launch({ headless:true });
const wait=ms=>new Promise(r=>setTimeout(r, ms));
async function ctxOf(dev, o={}){ const ctx=await browser.newContext({ ...DEV[dev], locale:o.locale||'en-US', ...(o.ua ? { userAgent:o.ua } : {}) }); await ctx.addInitScript(CAMERA);
  if(o.init) await ctx.addInitScript(o.init); const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push('page error: '+String(e).slice(0, 300)));
  p.on('console', m=>{ if(m.type()==='error' && !/insights|Failed to load resource|^INFO: Created TensorFlow Lite XNNPACK/.test(m.text()))   /* MediaPipe prints its CPU path's info line as an error */ errs.push('console: '+m.text().slice(0, 300)); }); return { ctx, p, errs }; }
const until=async (p, fn, arg, ms, what)=>{ try{ await p.waitForFunction(fn, arg, { timeout:ms, polling:200 }); return true; }catch(e){ fail(`${what} (not within ${Math.round(ms/1000)} s)`); return false; } };
const shot=async (p, name)=>{ if(!SHOTS) return; await mkdir(OUT, { recursive:true }); await p.screenshot({ path:path.join(OUT, name+'.png') }).catch(()=>{}); };
const fresh=()=>{ try{ localStorage.setItem('handsong.night.lang', localStorage.getItem('handsong.night.lang')||''); }catch(e){} };

async function main(dev){ const tag=dev==='iphone' ? 'iPhone' : 'Mac';
  const { ctx, p, errs }=await ctxOf(dev, { init:()=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); }catch(e){} } });
  try{
    /* 1. the start screen */
    await p.goto(BASE+PAGE, { waitUntil:'domcontentloaded', timeout:120e3 }); if(!await until(p, ()=>window.__nightBoot && window.__nightBoot.state().done, null, 120e3, `${tag}: the start screen did not finish loading`)) return;
    const st=await p.evaluate(()=>({ begin:!!document.getElementById('nightBegin') && getComputedStyle(document.getElementById('nightBegin')).display!=='none', lang:document.documentElement.lang, room:document.documentElement.getAttribute('data-room'), inapp:!document.getElementById('nightInApp').hidden }));
    out(`${tag}: start screen — Begin ${st.begin ? 'shown' : 'MISSING'}, lang ${st.lang}, room ${st.room}, in-app hint ${st.inapp ? 'SHOWN (wrong)' : 'hidden'}`); if(!st.begin) fail(`${tag}: no Begin`); if(st.inapp) fail(`${tag}: the in-app hint in plain Safari`); await shot(p, `${dev}-1-start`);
    /* what this engine has: Playwright's WebKit on Windows has no Web Audio and no camera capture (no MediaStream); Safari on iPhone and Mac has both */
    const cap=await p.evaluate(()=>({ audio:!!(window.AudioContext||window.webkitAudioContext), stream:typeof MediaStream!=='undefined', gum:!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaStream!=='undefined'), sw:'serviceWorker' in navigator, gl2:!!document.createElement('canvas').getContext('webgl2'), session:'audioSession' in navigator }));
    out(`${tag}: this WebKit has — Web Audio ${cap.audio ? 'yes' : 'NO'}, camera capture ${cap.stream ? 'yes' : 'NO'}, service workers ${cap.sw ? 'yes' : 'no'}, WebGL2 ${cap.gl2 ? 'yes' : 'no'}, audioSession ${cap.session ? 'yes' : 'no'}`);
    /* 2. Begin */
    const raf=await p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); setTimeout(()=>r(n), 3000); })); out(`${tag}: animation frames in 1 s (headless): ${raf}`);
    try{ if(dev==='iphone') await p.tap('#nightBegin', { timeout:20e3, force:true }); else await p.click('#nightBegin', { timeout:20e3, force:true }); }catch(e){ fail(`${tag}: Begin could not be tapped: ${String(e).split(String.fromCharCode(10))[0]}`); return; }   // force: Playwright's «stable» test waits on animation frames, which headless WebKit gives sparsely; a real touch is still sent
    if(!cap.audio){ /* no Web Audio: the start must end honestly with Night's own words, not hang or show a raw error */
      if(await until(p, ()=>{ const m=document.getElementById('loadmsg'); return !!m && /sound|звук/i.test(m.textContent||''); }, null, 60e3, `${tag}: with no Web Audio the start did not say so`)){
        const ses=await p.evaluate(async ()=>{ const S=await import('/apps/night/shell.js'); return S.nightAudioSessionDbg(); }); out(`${tag}: the silent-switch door in the tap — ${ses.how||'none'} (iOS ${ses.ios ? 'yes' : 'no'}; audioSession ${ses.type||'absent'})`);
        if(dev==='iphone' && ses.how!=='silent-clip' && ses.how!=='playback') fail(`${tag}: the tap did not switch the audio session for the silent mode`);
        const m=await p.evaluate(()=>document.getElementById('loadmsg').textContent); out(`${tag}: Begin with no Web Audio — the start says «${m.slice(0, 110)}» (sound and the camera: not testable in this engine)`); await shot(p, `${dev}-2-noaudio`); } }
    else { /* a WebKit with Web Audio (a real Safari): the session, the context running, the camera asked */
      if(!await until(p, ()=>!document.getElementById('start').classList.contains('on'), null, 120e3, `${tag}: the start did not end after Begin`)) return;
      const au=await p.evaluate(async ()=>{ const S=await import('/apps/night/shell.js'), A=await import('/core/audio.js'); const a=S.nightAudioSessionDbg(), t0=A.AC ? A.AC.currentTime : null; await new Promise(r=>setTimeout(r, 1200)); return { ...a, t0, t1:A.AC ? A.AC.currentTime : null, cam:window.__camAsked||0 }; });
      out(`${tag}: sound — context ${au.ctx}, clock ${(au.t1-au.t0).toFixed(2)} s in 1.2 s, session ${au.how||'none'}; camera asked ${au.cam}×`); if(au.ctx!=='running' || !(au.t1-au.t0>0.5)) fail(`${tag}: the sound did not start`); if(dev==='iphone' && !au.how) fail(`${tag}: no audio session switch for the silent mode`); }
    /* 3. the hand model in this engine, on the GPU and the CPU path: our own files, frames of a canvas */
    const hm=await p.evaluate(async ()=>{ const HD=await import('/core/handdet.js'), c=document.createElement('canvas'); c.width=640; c.height=480; const g=c.getContext('2d'), o={};
      for(const d of ['GPU', 'CPU']){ try{ const t0=performance.now(), D=await HD.createDetector({ delegate:d, files:'own' }), built=performance.now()-t0; let ok=0, ms=0;
          for(let k=0;k<12;k++){ g.fillStyle='#2a2c38'; g.fillRect(0, 0, 640, 480); g.fillStyle='#d4a985'; g.beginPath(); g.arc(200+20*k, 240, 70, 0, 7); g.fill(); const r=D.run(c, performance.now(), 'search', undefined); ok++; ms+=r.ms; await new Promise(z=>setTimeout(z, 30)); }
          D.close(); o[d]={ built:Math.round(built), frames:ok, msPerFrame:+(ms/ok).toFixed(1) }; }catch(e){ o[d]={ err:String(e).slice(0, 200) }; } } return o; });
    for(const d of ['GPU', 'CPU']){ const r=hm[d]; if(r.err) fail(`${tag}: the hand model on the ${d} path failed — ${r.err}`); else out(`${tag}: hand model ${d} — built in ${r.built} ms, ${r.frames} frames, ${r.msPerFrame} ms a frame`); }
    /* 4. both rooms drawn, 5. the three quality levels (through the scene host: the rooms themselves, whatever the start did) */
    const openRoom=async (room, lv, light)=>{ await p.evaluate(async ([r, lv, light])=>{ const H=await import('/apps/night/scene/host.js'); H.setSceneLight(light); await H.setSceneLevel(lv); await H.setBackground('forest'); await H.sceneOpen(r).catch(()=>{}); }, [room, lv, light]);
      return until(p, async r=>{ const H=await import('/apps/night/scene/host.js'), I=H.sceneInfo(); return I.id===r && !I.opening && I.rendered>3; }, room, 120e3, `${tag}: ${room} was not drawn (${lv}${light ? ', light' : ''})`); };
    for(const room of ['room.forest', 'room.rain']) for(const [lv, light, q] of [['reduced', false, 'Standard'], ['full', false, 'Detailed'], ['reduced', true, 'Light']]){
      if(await openRoom(room, lv, light)){ const I=await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'), I=H.sceneInfo(); return { level:I.level, errors:I.errors, webgl:I.webgl, programs:I.programs }; });
        out(`${tag}: ${room} at ${q} — drawn (level ${I.level}, ${I.programs} programs)${I.errors && I.errors.length ? ', ERRORS '+JSON.stringify(I.errors).slice(0, 200) : ''}`); if(I.errors && I.errors.length) fail(`${tag}: ${room} at ${q} reports errors`); if(q==='Standard') await shot(p, `${dev}-3-${room.slice(5)}`); } }
  } catch(e){ fail(`${tag}: the check stopped — ${String(e).slice(0, 300)}`); }
  finally { for(const e of errs.slice(0, 8)) fail(`${tag}: ${e}`); await ctx.close(); } }

async function languages(){ for(const [loc, want] of [['ru-RU', 'ru'], ['de-DE', 'de'], ['pt-BR', 'pt'], ['nl-NL', 'en']]){ const { ctx, p, errs }=await ctxOf('iphone', { locale:loc });
    try{ await p.goto(BASE+PAGE, { waitUntil:'domcontentloaded', timeout:120e3 }); if(!await until(p, ()=>window.__nightBoot && window.__nightBoot.state().done, null, 120e3, `iPhone ${loc}: the start screen did not load`)) continue;
      const L=await p.evaluate(()=>({ lang:document.documentElement.lang, begin:document.getElementById('nightBegin').textContent.trim() })); out(`iPhone ${loc}: lang ${L.lang}, Begin «${L.begin}»`); if(L.lang!==want) fail(`iPhone ${loc}: lang ${L.lang}, wanted ${want}`); }
    catch(e){ fail(`iPhone ${loc}: ${String(e).slice(0, 200)}`); } finally { for(const e of errs.slice(0, 4)) fail(`iPhone ${loc}: ${e}`); await ctx.close(); } } }

async function inApp(){ for(const [name, ua] of [['Telegram', UA_IPHONE.replace('Safari/604.1', 'Telegram-iOS/11.0')], ['Instagram', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0 (iPhone14,5; iOS 17_5; en_US; en)']]){
    const { ctx, p, errs }=await ctxOf('iphone', { ua }); try{ await p.goto(BASE+PAGE, { waitUntil:'domcontentloaded', timeout:120e3 }); await until(p, ()=>!!document.getElementById('nightInApp'), null, 60e3, `in-app ${name}: no page`);
      await wait(2500); const v=await p.evaluate(()=>{ const b=document.getElementById('nightInApp'); return { shown:!b.hidden && getComputedStyle(b).display!=='none', text:(document.getElementById('nightInAppText')||{}).textContent||'' }; });
      out(`in-app ${name} on iPhone: the hint ${v.shown ? 'shown' : 'NOT SHOWN'} — «${v.text.slice(0, 90)}»`); if(!v.shown) fail(`in-app ${name}: the open-in-Safari hint is not shown`); await shot(p, `inapp-${name.toLowerCase()}`); }
    catch(e){ fail(`in-app ${name}: ${String(e).slice(0, 200)}`); } finally { for(const e of errs.slice(0, 3)) out(`in-app ${name}: (${e})`); await ctx.close(); } } }

async function offline(){ const { ctx, p, errs }=await ctxOf('iphone');
  try{ await p.goto(BASE+PAGE, { waitUntil:'domcontentloaded', timeout:120e3 }); if(!await until(p, ()=>window.__nightBoot && window.__nightBoot.state().done, null, 120e3, 'offline: the first visit did not load')) return;
    const sw=await p.evaluate(()=>'serviceWorker' in navigator); out(`precache: service worker ${sw ? 'available' : 'NOT AVAILABLE in this WebKit build'}`); if(!sw){ fail('precache: no service worker in WebKit here — the offline visit cannot be checked'); return; }
    if(!await until(p, ()=>navigator.serviceWorker.controller || false, null, 60e3, 'precache: the worker never took the page')){ await p.reload(); await until(p, ()=>!!navigator.serviceWorker.controller, null, 60e3, 'precache: no controller after a reload'); }
    if(!await until(p, async ()=>{ const k=await caches.keys(); if(!k.length) return false; const c=await caches.open(k[0]); return (await c.keys()).length>20; }, null, 180e3, 'precache: the start files were not cached')) return;
    const n=await p.evaluate(async ()=>{ const k=await caches.keys(); let n=0; for(const x of k) n+=(await (await caches.open(x)).keys()).length; return { keys:k, n }; }); out(`precache: ${n.n} files in ${n.keys.join(', ')}`);
    await wait(15000); await ctx.setOffline(true); await p.reload();
    if(await until(p, ()=>window.__nightBoot && window.__nightBoot.state().done, null, 120e3, 'offline: the second visit with no network did not load')) out('offline second visit: the start screen loaded with no network');
    await p.tap('#nightBegin', { force:true });
    if(await until(p, ()=>!document.getElementById('start').classList.contains('on') || /sound|звук/i.test((document.getElementById('loadmsg')||{}).textContent||''), null, 120e3, 'offline: Begin neither started nor ended honestly with no network')){
      const r=await p.evaluate(()=>({ started:!document.getElementById('start').classList.contains('on'), msg:(document.getElementById('loadmsg')||{}).textContent||'', audio:!!(window.AudioContext||window.webkitAudioContext) }));
      out(r.started ? 'offline second visit: Begin started (the model from the cache)' : `offline second visit: Begin ended with Night's no-audio words (this engine has no Web Audio) — «${r.msg.slice(0, 70)}»`); if(!r.started && r.audio) fail('offline: Begin did not start though the engine has Web Audio'); }
    await ctx.setOffline(false);
    /* the «new version» line: the server's sw.js changes, the worker updates, the line shows */
    await fetch(BASE+'/__bump'); await p.evaluate(async ()=>{ const r=await navigator.serviceWorker.ready; await r.update(); });
    if(await until(p, async ()=>{ const r=await navigator.serviceWorker.getRegistration(); return !!(r && r.waiting); }, null, 120e3, 'update: the new version never waited')){   // the worker's own state (a built page's modules carry other URLs: an import() here would be a second instance)
      await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      const seen=()=>{ const b=document.getElementById('nightUpdateStart'), n=document.getElementById('nightNotice'); return (b && !b.hidden && b.getClientRects().length) ? 'start: '+b.textContent : (n && !n.hidden && n.getClientRects().length) ? 'notice: '+n.textContent : null; };
      if(await until(p, seen, null, 30e3, 'update: a new version waits but no line shows it')) out(`update: a new version waits — the line shown («${String(await p.evaluate(seen)).slice(0, 90)}»)`); }
  } catch(e){ fail('offline: '+String(e).slice(0, 300)); } finally { for(const e of errs.slice(0, 6)) fail(`offline: ${e}`); await ctx.close(); } }

const T0=Date.now();
try{ out(`WebKit ${browser.version()} · ${BUILT ? 'the built tree '+path.relative(ROOT, TREE) : 'the repository tree'}`);
  if(!BUILT){ for(const d of ['iphone', 'mac']) if(!ONLY || ONLY===d) await main(d);
    if(!ONLY){ await languages(); await inApp(); }
    out('precache / offline / update line: only on a built tree (--root tools/.build/night-preview)'); }
  else await offline();   // a built tree: the precache, the offline second visit, the update line (the repository run covers the rest)
} finally { await browser.close(); srv.close(); }
console.log(`[safari] ${fails.length ? 'NOT A PASS — '+fails.length+' failure(s)' : 'PASS — every stage'} · ${((Date.now()-T0)/1000).toFixed(0)} s`);
