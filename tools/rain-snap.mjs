/* RAIN-0 — THE RAIN ROOM'S CAPTURES AND COST (dev tool; never runs in the app). Its own server and a fresh headless Chrome (a fake camera),
   Night with «?probe&room=rain» (the development door), Begin, the room's picture, two synthetic hands through the real gesture path.
     node tools/rain-snap.mjs                 captures → tools/.ui-snap/rain0b/ + index.html (Russian captions): a phone upright and a laptop,
                                              Standard — RAIN-0b: the misted start, a finger's stroke, the focus near / middle / far, a phrase far,
                                              drops merging (a short sequence of crops). (RAIN-0's captures stay in tools/.ui-snap/rain0/.)
     node tools/rain-snap.mjs --level full    the same at Detailed (files named …-full)
     node tools/rain-snap.mjs --rain1         RAIN-1: the baked city → tools/.ui-snap/rain1/ (each mood, the focus near / middle / far, a phrase, before / after)
     node tools/rain-snap.mjs --rain9         RAIN-9: the musician with an arrow, the crowns' sway as frame sequences → tools/.ui-snap/rain9/
     node tools/rain-snap.mjs --cost          no captures: per level, the room against Dark (hand detections a second, the forest budget's
                                              method), its frame time, draws, programs, texture memory and opening time, printed as JSON */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const LEVEL=val('--level')==='full' ? 'full' : 'reduced', COST=argv.includes('--cost'), FOREST=argv.includes('--forest'), OUT=path.join(ROOT, 'tools/.ui-snap/rain0b'), SUF=LEVEL==='full' ? '-full' : '';
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
/* a page with the rain room open at `level`: Begin tapped, the cards closed, the music held off */
let QS='';   // RAIN-6b: extra query words for a page (the «before» captures)
async function open(vp, level, dpr=1, ctxOpt={}){
  const ctx=await browser.newContext({ viewport:vp, deviceScaleFactor:dpr, locale:'en-US', ...ctxOpt });   // RAIN-9: ctxOpt — e.g. a video of the page
  await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', l==='light' ? 'reduced' : l); localStorage.setItem('handsong.nightLight', l==='light' ? '1' : '0'); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} }, level);   // RAIN-10: 'light' = Standard + Light
  const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('console', m=>{ if(m.type()==='error' || /THREE\.WebGLProgram|shader/i.test(m.text())) errs.push(m.text().slice(0, 600)); }); p.on('response', r=>{ if(r.status()===404) errs.push('404 '+new URL(r.url()).pathname); });
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe${FOREST ? '' : '&room=rain'}${QS}`);
  try{ await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 }); }catch(e){ console.log('[rain-snap] the page did not boot:', errs.slice(0, 6)); throw e; }
  await p.click('#nightBegin');
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
  await p.evaluate(async want=>{ window.__H=await import('/apps/night/scene/host.js'); window.__G=await import('/core/gestures.js'); window.__PO=await import('/core/gestures/pose.js'); window.__V=await import('/core/vision.js');
    window.__want=want; const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const SH=await import('/apps/night/shell.js'); SH.nightMusicHoldDbg(true); }, FOREST ? 'forest' : 'rain');
  try{ await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && I.id.endsWith(window.__want) && !I.opening && I.rendered>2; }, null, { timeout:60e3 }); }catch(e){ console.log('[rain-snap] the room did not open:', errs.slice(0, 6), await p.evaluate(()=>{ const I=window.__H.sceneInfo(); return JSON.stringify({ id:I.id, opening:I.opening, rendered:I.rendered, errors:I.errors, level:I.level, room:window.__H.sceneRoom() }); }).catch(x=>String(x))); throw e; }
  await p.waitForTimeout(4200);   // the start still's reveal is over
  return { ctx, p, errs };
}
/* the playing hand at (x, y) of the picture with size s (large = near), pinched or open, for k frames; the effects hand stays out */
const hand=(p, x, y, s, pinch, k=6)=>p.evaluate(([x, y, s, pinch, k])=>{ const G=window.__G, V=window.__V; if(!window.__clk){ window.__clk={ t:6e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(window.__clk, ()=>true); }
  const c=window.__clk; c.W=V.canvas.width; c.H=V.canvas.height;
  for(let i=0;i<k;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x, y, s, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); } }, [x, y, s, pinch, k]);
const note=async (p, x, y, s)=>{ await hand(p, x, y, s, false, 4); await p.waitForTimeout(160); await hand(p, x, y, s, true, 4); await p.waitForTimeout(260); };
const stateOf=p=>p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), S=R && R.state ? R.state() : null, I=window.__H.sceneInfo();
  return { focus:S && +S.focus.toFixed(3), lit:S && S.litNow, picks:S && S.picks, wipes:S && S.wipes, light:S && S.light, buffer:S && S.buffer, frameMs:I.frameMs, fps:I.fps, calls:I.calls, programs:I.programs, openMs:I.openMs, texMB:+(I.texBytes/1048576).toFixed(2), level:I.level, errors:I.errors }; });
try{
  if(argv.includes('--eval')){   // a quick look while working: the room open, a near hand, then the given module's default export run in the page (its JSON printed)
    const { ctx, p, errs }=await open({ width:1280, height:800 }, LEVEL); await hand(p, 0.5, 0.45, 0.32, false, 40); await p.waitForTimeout(2000);
    console.log(JSON.stringify(await p.evaluate(async f=>(await import(f)).default(), '/'+val('--eval')), null, 1), errs.slice(0, 5)); await ctx.close();
  } else if(argv.includes('--row')){   // the browser row «RAIN room» alone (a quick look while working; the judged run is the Night suite's)
    const { ctx, p, errs }=await open({ width:1280, height:800 }, LEVEL);
    console.log(JSON.stringify(await p.evaluate(async ()=>(await import('/tools/probes/night/rainroom.js')).checkRainRoom()), null, 1), errs.slice(0, 5)); await ctx.close();
  } else if(argv.includes('--wear')){   // RELEASE-1 (A): the people's clothes, part by part — Evening's walkers (the law's own codes and wear) large, middle and street-sized, dark and under a lamp → tools/.ui-snap/release1/<tag>-people.png
    const O=path.join(ROOT, 'tools/.ui-snap/release1'), TAG=val('--tag')||'after'; await mkdir(O, { recursive:true });
    const ctx=await browser.newContext({ viewport:{ width:800, height:600 } }), p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe&room=rain`);
    await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
    const PH=+(val('--ph')||0), url=await p.evaluate(async PH=>{ const S=await import('/tools/probes/night/rainsheet.js'), L=await import('/apps/night/rooms/rain/pure/life.js'), C=await import('/apps/night/rooms/rain/pure/city.js'), it=[], W=1600, H=900, tan=[1.6, 0.9];
      const P=L.lifeAt(10, 'evening').filter(q=>L.PEOPLE.includes(q.kind) && q.kind!==L.LK.cycle && q.kind!==L.LK.scooter && q.kind!==L.LK.sit);
      /* RELEASE-1 (A): each person as the room sees them at their own place — their proportions and view (the room's viewOf) */
      const tall=k=>k<=2 || (k>=14 && k<=18), seen=q=>{ const b=C.project([q.x, 0, q.z]), hw=q.w/2/b.z, tp=C.project([q.x, q.h*(tall(q.kind) ? 1.15 : 1), q.z]), hh=(tp.y-b.y)/2, sE=Math.min(0.98, (C.CAM.y-q.h*0.6)/b.dist), p1=q.dir ? C.project([q.x, 0, q.z+q.dir]) : null;
        return { r:hw/hh, view: p1 && q.kind!==L.LK.stand && q.kind!==L.LK.talk ? [(p1.x-b.x)/hw, (p1.y-b.y)/(2*hh/(tall(q.kind) ? 1.15 : 1)), sE, (q.step||0.7)/2] : [0, 0, sE, 0] }; };
      const row=(y, list, hh, lit, n)=>list.slice(0, n).forEach((q, i)=>{ const v=seen(q); it.push({ x:-1.48+i*(2.96/Math.max(1, n-1)), y, hh, hw:hh*v.r, k:q.kind, ph:((q.ph+PH)%1)+(q.face==='front' ? 1 : 0), c:q.c, wear:q.wear, lit, dep:0.5, view:v.view }); });
      row(0.25, P, 0.3, 0.15, 10); row(-0.35, P.slice(10), 0.16, 0.9, 16); row(-0.85, P.slice(4), 0.07, 0.5, 30);
      return (await S.lifeSheet(it, { W, H, tan, foc:[0.5, 4, 0, 0], url:true, bg:0x2a2622, done:true })).url; }, PH);
    await writeFile(path.join(O, `${TAG}-people.png`), Buffer.from(url.split(',')[1], 'base64')); await ctx.close(); console.log(`[rain-snap] --wear → tools/.ui-snap/release1/${TAG}-people.png`);
  } else if(argv.includes('--sheet')){   // RAIN-10: the life sheet (tools/probes/night/rainsheet.js) — people, colours, cars, the tram drawn large, sharp and blurred → tools/.ui-snap/rain10/<tag>-sheet.png
    const O=path.join(ROOT, 'tools/.ui-snap/rain10'), TAG=val('--tag')||'after'; await mkdir(O, { recursive:true });
    const ctx=await browser.newContext({ viewport:{ width:800, height:600 } }), p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe&room=rain`);
    await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
    const GAIT=argv.includes('--gaitsheet'), url=await p.evaluate(async GAIT=>{ const S=await import('/tools/probes/night/rainsheet.js'), it=[], W=1600, H=900, tan=[1.6, 0.9];
      if(GAIT){ [0, 1/6, 2/6, 3/6, 4/6, 5/6].forEach((ph, i)=>it.push({ x:-1.33+i*0.53, y:-0.8, hh:0.75, hw:0.3, k:0, ph, c:3+8*4, dep:0.5 })); return (await S.lifeSheet(it, { W, H, tan, foc:[0.5, 4, 0, 0], url:true, bg:0x2a2622, done:true })).url; }
      const row=(y, list, hh)=>list.forEach((q, i)=>it.push({ x:-1.45+i*(2.9/Math.max(1, list.length-1)), y, hh, hw:hh*(q.w||0.42), dep:q.dep==null ? 0.5 : q.dep, ...q }));
      row(0.5, [0, 1, 2, 3, 4, 5, 6, 7].map(ci=>({ k:0, ph:0.15, c:ci+8*4 }))
        .concat([0, 1, 2, 3].map(u=>({ k:0, ph:0.4, c:(u*2)%8+8*(u===3 ? 3 : u)+64*u, w:0.6 }))), 0.16);
      row(0.1, [0, 1/6, 2/6, 3/6, 4/6, 5/6].map(ph=>({ k:0, ph, c:3+8*4 }))
        .concat([0, 0.25, 0.5].map(ph=>({ k:0, ph:ph+1, c:5+8*1+64*2 }))).concat([{ k:14, ph:0.2, c:1+8*3, w:0.8 }, { k:1, ph:0.3, c:2+8*0, w:0.8 }, { k:18, ph:0.3, c:4+8*3+64, w:1.1 }]), 0.16);
      row(-0.5, [0, 1, 2, 3, 4, 5, 6].map(ty=>({ k:24, ph:3+0.4, c:ty+8*((ty*3)%8), w:0.62 })).concat([{ k:24, ph:6+0.25, c:2+8*3+64, w:0.62 }, { k:25, ph:5+0.3, c:1, w:0.7 }, { k:25, ph:5+0.3, c:0, w:0.7 }, { k:26, ph:0, c:0, w:0.6 }]), 0.22);
      row(-0.85, [0, 1, 2, 3, 4, 5, 6].map(ty=>({ k:24, ph:3+0.4, c:ty+8*((ty*3)%8), w:0.62, dep:0.9 })).concat([0, 1, 2].map(ci=>({ k:0, ph:0.2, c:ci*3+8*4, dep:0.9 }))), 0.12);
      return (await S.lifeSheet(it, { W, H, tan, foc:[0.5, 4, 0.03, 0], url:true, bg:0x2a2622, done:true })).url; }, GAIT);
    await writeFile(path.join(O, `${TAG}-${GAIT ? 'gaitsheet' : 'sheet'}.png`), Buffer.from(url.split(',')[1], 'base64')); await ctx.close(); console.log(`[rain-snap] --sheet → tools/.ui-snap/rain10/${TAG}-sheet.png`);
  } else if(argv.includes('--rain10')){   // RAIN-10: the street's people, cars and tram at the three qualities → tools/.ui-snap/rain10/<tag>-<level>-*.png (--tag before|after)
    const O=path.join(ROOT, 'tools/.ui-snap/rain10'), TAG=val('--tag')||'after', LVS=(val('--levels')||'full,reduced,light').split(','); await mkdir(O, { recursive:true }); const made=[];
    const DPR=+(val('--dpr')||1); for(const lv of LVS){ const vp={ width:1280, height:800 }, { ctx, p, errs }=await open(vp, lv, DPR);
      await p.evaluate(old=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.06); R.lookDbg('evening'); if(old){ R.winDbg(2); R.occlDbg(false); } }, argv.includes('--old'));   // --old: RAIN-9's window and no depth test (the regressions reproduced)
      await hand(p, 0.5, 0.45, 0.2, false, 10);
      const mid=await p.evaluate(async ()=>{ const FO=await import('/apps/night/rooms/rain/pure/focus.js'), R=window.__H.sceneRoomDbg(); let lo=0.08, hi=0.34, best=0.17;
        for(let it=0;it<8;it++){ const s=(lo+hi)/2; best=s; const G=window.__G, c=window.__clk; for(let i=0;i<40;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x:0.5, y:0.45, s, gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); }
          await new Promise(r=>setTimeout(r, 250)); if(FO.focusDepth(R.state().target)>FO.LAYER_DEPTH.street) lo=s; else hi=s; } return best; });
      await hand(p, 0.5, 0.45, mid, false, 12); await p.waitForTimeout(2500);
      const tb=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), b=R.busiestDbg(600, 900); R.trafficHoldDbg(b.t); return b; });
      const shot=async (name, ru, clip, scale)=>{ const f=`${TAG}-${lv}-${name}.png`; await hand(p, 0.5, 0.45, mid, false, 2); await p.screenshot({ path:path.join(O, f), clip }); made.push({ f, ru, lv }); };
      await p.waitForTimeout(1500); await shot('street', 'Улица целиком, фокус на улице');
      if(argv.includes('--occl')){ await p.evaluate(()=>window.__H.sceneRoomDbg().occlDbg(false)); await shot('street-noocl', 'Без проверки глубины (как было): люди поверх стволов и крон'); await p.evaluate(()=>window.__H.sceneRoomDbg().occlDbg(true)); }
      const crops=JSON.parse(val('--crops')||'{"left":[0.02,0.42,0.42,0.42],"mid":[0.3,0.38,0.4,0.42],"right":[0.55,0.4,0.43,0.45]}');
      for(const [nm, c] of Object.entries(crops)) await shot('crop-'+nm, 'Крупно: '+nm, { x:Math.round(c[0]*vp.width), y:Math.round(c[1]*vp.height), width:Math.round(c[2]*vp.width), height:Math.round(c[3]*vp.height) });
      for(const [z0, z1, nm] of [[30, 55, 'near'], [60, 110, 'mid']]){ const tr=await p.evaluate(([a, b])=>{ const R=window.__H.sceneRoomDbg(), q=R.tramAtDbg(400, 3000, a, b); if(q) R.trafficHoldDbg(q.t); return q; }, [z0, z1]);
        if(tr){ await p.waitForTimeout(900); await shot('tram-'+nm, 'Трамвай '+(nm==='near' ? 'близко' : 'дальше')+(tr.dir<0 ? ', едет к нам' : ', уезжает')); await shot('tram-'+nm+'-crop', 'Трамвай крупно', { x:Math.round(vp.width*0.28), y:Math.round(vp.height*0.45), width:Math.round(vp.width*0.36), height:Math.round(vp.height*0.55) }); } }
      await p.evaluate(()=>window.__H.sceneRoomDbg().trafficHoldDbg(null));
      const g=JSON.parse(val('--gait')||'[0.55,0.78,0.2,0.2]'), gc={ x:Math.round(g[0]*vp.width), y:Math.round(g[1]*vp.height), width:Math.round(g[2]*vp.width), height:Math.round(g[3]*vp.height) };
      for(let k=0;k<6;k++){ await shot('gait-'+k, 'Походка: кадр '+(k+1)+' (через 0,15 с)', gc); await p.waitForTimeout(150); }
      if(errs.length) console.log('[rain-snap] '+lv+' errors:', errs.slice(0, 5)); await ctx.close(); }
    console.log('[rain-snap] --rain10: '+made.length+' captures ('+TAG+') → tools/.ui-snap/rain10/');
  } else if(argv.includes('--rain9')){   // RAIN-9: the musician (an arrow at him) at the focus near / on the boulevard / far, close-ups; the crowns' sway as frame sequences
    const O=path.join(ROOT, 'tools/.ui-snap/rain9'); await mkdir(O, { recursive:true }); const made=[];
    for(const [tag, vp, dpr] of [['laptop', { width:1280, height:800 }, 1], ['phone', { width:390, height:844 }, 2.75]]){
      const { ctx, p }=await open(vp, LEVEL, dpr); await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.1); R.lookDbg('evening'); });
      await hand(p, 0.5, 0.45, 0.2, false, 10);
      const mid=await p.evaluate(async ()=>{ const FO=await import('/apps/night/rooms/rain/pure/focus.js'), R=window.__H.sceneRoomDbg(); let lo=0.08, hi=0.34, best=0.17;
        for(let it=0;it<8;it++){ const s=(lo+hi)/2; best=s; const G=window.__G, c=window.__clk; for(let i=0;i<40;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x:0.5, y:0.45, s, gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); }
          await new Promise(r=>setTimeout(r, 250)); if(FO.focusDepth(R.state().target)>FO.LAYER_DEPTH.street) lo=s; else hi=s; } return best; });
      /* RAIN-9: the musician was captured here with an arrow, found hidden under the near crowns and removed; those captures stay in tools/.ui-snap/rain9/ */
      const shot=async (name, ru, clip)=>{ const f=`${tag}-${name}.png`; await p.screenshot({ path:path.join(O, f), clip }); made.push({ f, ru, tag }); };
      /* the sway: the right-hand crowns, 8 frames 0.4 s apart, Wave at rest and full */
      await hand(p, 0.5, 0.45, mid, false, 12); await p.waitForTimeout(1500);
      const W=vp.width, H=vp.height, cc={ x:Math.round(W*0.35), y:Math.round(H*0.45), width:Math.round(W*0.4), height:Math.round(H*0.3) };
      for(const [wv, ru] of [[0, 'Волна в покое'], [1, 'Волна до конца']]){ await p.evaluate(async w=>{ const A=await import('/core/audio.js'), ST=await import('/core/state.js'); A.fxInstance(ST.chainKeyOf('ld'), 'cwave').params[1].setNorm(w); }, wv); await p.waitForTimeout(3000);
        for(let k=0;k<8;k++){ await hand(p, 0.5, 0.45, mid, false, 2); await shot(`sway-w${wv}-${k}`, `${ru}, кадр ${k+1} (через 0,4 с)`, cc); await p.waitForTimeout(400); } }
      await ctx.close();
      /* the crowns in motion: a 7 s video each, Wave at rest and full (the stills cannot show a sway) */
      if(tag==='laptop') for(const wv of [0, 1]){ const V=await open(vp, LEVEL, dpr, { recordVideo:{ dir:O, size:vp } }); await V.p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.1); R.lookDbg('evening'); });
        await hand(V.p, 0.5, 0.45, mid, false, 12); await V.p.evaluate(async w=>{ const A=await import('/core/audio.js'), ST=await import('/core/state.js'); A.fxInstance(ST.chainKeyOf('ld'), 'cwave').params[1].setNorm(w); }, wv);
        await V.p.waitForTimeout(3000); for(let k=0;k<14;k++){ await hand(V.p, 0.5, 0.45, mid, false, 2); await V.p.waitForTimeout(500); } const vid=V.p.video(); await V.ctx.close(); const src=await vid.path(), dst=path.join(O, `sway-wave${wv}.webm`);
        const { rename }=await import('node:fs/promises'); await rename(src, dst).catch(()=>{}); made.push({ f:`sway-wave${wv}.webm`, ru:`Видео: кроны, ${wv ? 'Волна до конца' : 'Волна в покое'} (последние 7 с)`, tag, video:true }); } }
    const fig=m=>m.video ? `<figure><video src="${m.f}" controls loop muted style="max-width:100%"></video><figcaption>${m.ru}</figcaption></figure>` : `<figure><a href="${m.f}"><img src="${m.f}" alt="" loading="lazy"></a><figcaption>${m.ru}</figcaption></figure>`;
    let body=''; for(const tag of ['laptop', 'phone']){ body+=`<h2>${tag==='laptop' ? 'Ноутбук 1280 × 800' : 'Телефон вертикально 390 × 844'}</h2><p>Музыкант: снимки со стрелкой (сделаны до удаления) — он под низкими кронами ближних деревьев, его не видно; убран.</p><div class="row">${['mid', 'near', 'far'].flatMap(fn=>[`${tag}-busker-${fn}.png`, `${tag}-busker-${fn}-close.png`]).map(f=>fig({ f, ru:f.includes('close') ? 'Крупно' : 'Стрелка — где он стоял' })).join('')}</div><div class="row">${made.filter(m=>m.tag===tag && m.video).map(fig).join('')}</div>`;
      for(const w of [0, 1]) body+=`<h3>Кроны, ${w ? 'Волна до конца' : 'Волна в покое'} — 8 кадров через 0,4 с (каждое дерево в своём ритме, порыв идёт от ближних к дальним)</h3><div class="row">${made.filter(m=>m.tag===tag && m.f.includes(`sway-w${w}-`)).map(fig).join('')}</div>`; }
    await writeFile(path.join(O, 'index.html'), `<!doctype html><meta charset="utf-8"><title>RAIN-9 — музыкант и кроны</title><style>body{ font:15px/1.45 system-ui; background:#111; color:#ddd; margin:16px; } .row{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; } figure{ margin:0; max-width:420px; } img{ max-width:100%; border:1px solid #333; } h3{ font-weight:500; color:#bbb; }</style><h1>RAIN-9: музыкант ближе, кроны качаются по-деревьям</h1><p>Машины — только кинематографичные. Клик — полный размер.</p>${body}`);
    console.log('[rain-snap] --rain9: '+made.length+' captures → tools/.ui-snap/rain9/index.html');
  } else if(argv.includes('--rain7')){   // RAIN-7: the starred details → tools/.ui-snap/rain7/ — before (?rain=noframe,nocones,nosway) and after
    const O=path.join(ROOT, 'tools/.ui-snap/rain7'); await mkdir(O, { recursive:true }); const made=[];
    const fx=(p, e, t, w=0)=>p.evaluate(async ([e, t, w])=>{ const A=await import('/core/audio.js'), ST=await import('/core/state.js'), k=ST.chainKeyOf('ld'); A.fxInstance(k, 'cecho').params[0].setNorm(e); A.fxInstance(k, 'ctone').params[1].setNorm(t); A.fxInstance(k, 'cwave').params[1].setNorm(w); }, [e, t, w]);
    for(const [tag, vp, dpr] of [['laptop', { width:1280, height:800 }, 1], ['phone', { width:390, height:844 }, 2.75]]){
      for(const before of [true, false]){ QS= before ? '&rain=noframe,nocones,nosway' : ''; const { ctx, p }=await open(vp, LEVEL, dpr);
        await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.1); R.lookDbg('evening'); });
        const shot=async (name, ru, s=0.12)=>{ await hand(p, 0.5, 0.45, s, false, 30); await p.waitForTimeout(2500); await hand(p, 0.5, 0.45, s, false, 6); const f=`${tag}-${before ? 'before' : 'after'}-${name}.png`; await p.screenshot({ path:path.join(O, f) }); made.push([f, ru]); };
        await shot('far', 'Фокус на городе: окно комнаты мягкое', 0.08);
        await shot('near', 'Фокус на стекле: окно комнаты резкое (рама, защёлка, чашка с паром, цветок)', 0.42);
        await fx(p, 1, 0.5, 0); await p.waitForTimeout(3000); await shot('rain', 'Эхо до конца: дождь виден в конусах света фонарей', 0.08); await fx(p, 0, 0.5, 0);
        await ctx.close(); } }
    QS='';
    const fig=([f, ru])=>`<figure><img src="${f}" alt=""><figcaption>${ru}</figcaption></figure>`;
    await writeFile(path.join(O, 'index.html'), `<!doctype html><meta charset="utf-8"><title>RAIN-7 — детали улицы</title><style>body{ font:15px/1.45 system-ui; background:#111; color:#ddd; margin:16px; } figure{ display:inline-block; vertical-align:top; margin:0 12px 18px 0; max-width:640px; } img{ max-width:100%; max-height:560px; border:1px solid #333; } h2{ margin-top:28px; }</style><h1>RAIN-7: детали улицы — было / стало</h1><p>«Было» = <code>?rain=noframe,nocones,nosway</code>. Движение (кроны, крест аптеки, музыкант, фары на фасаде) на снимке не видно — его проверяют глазами.</p>`
      +['laptop', 'phone'].map(tg=>`<h2>${tg==='laptop' ? 'Ноутбук' : 'Телефон'}</h2>`+made.filter(m=>m[0].startsWith(tg)).map(fig).join('')).join(''));
    console.log('[rain-snap] --rain7: '+made.length+' captures → tools/.ui-snap/rain7/index.html');
  } else if(argv.includes('--rain6b')){   // RAIN-6b: the street → tools/.ui-snap/rain6b/ — before (?rain=nocull,nobodies) and after, the wind, the sleep, Late night
    const O=path.join(ROOT, 'tools/.ui-snap/rain6b'); await mkdir(O, { recursive:true }); const made=[];
    const fx=(p, e, t, w=0)=>p.evaluate(async ([e, t, w])=>{ const A=await import('/core/audio.js'), ST=await import('/core/state.js'), k=ST.chainKeyOf('ld'); A.fxInstance(k, 'cecho').params[0].setNorm(e); A.fxInstance(k, 'ctone').params[1].setNorm(t); A.fxInstance(k, 'cwave').params[1].setNorm(w); }, [e, t, w]);
    for(const [tag, vp, dpr] of [['laptop', { width:1280, height:800 }, 1], ['phone', { width:390, height:844 }, 2.75]]){
      for(const before of [true, false]){ QS= before ? '&rain=nocull,nobodies,noframe,nocones,nosway' : '&rain=noframe,nocones,nosway'; const { ctx, p }=await open(vp, LEVEL, dpr);
        await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.1); R.lookDbg('evening'); }); await hand(p, 0.5, 0.45, 0.12, false, 10); await p.waitForTimeout(3000);
        const shot=async (name, ru)=>{ await hand(p, 0.5, 0.45, 0.12, false, 6); await p.waitForTimeout(600); const f=`${tag}-${before ? 'before' : 'after'}-${name}.png`; await p.screenshot({ path:path.join(O, f) }); made.push([f, ru, before]); };
        await shot('evening', 'Вечерний бульвар, рука эффектов в покое');
        if(!before){ await fx(p, 0, 0.5, 1); await p.waitForTimeout(5000); await shot('wind', 'Волна до конца: ветер — зонты наклоняются, бахрома маркиз и флажки трепещут, косой дождь, больше машин');
          await fx(p, 0, 0.5, 0); await p.evaluate(()=>window.__H.sceneRoomDbg().sleepDbg(0.55)); await p.waitForTimeout(2500); await shot('sleep-half', 'Таймер сна на середине: окна гаснут по одному, машин и людей меньше');
          await p.evaluate(()=>window.__H.sceneRoomDbg().sleepDbg(0.97)); await p.waitForTimeout(2500); await shot('sleep-end', 'Таймер сна в конце: город уснул');
          await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.sleepDbg(null); R.lookDbg('late'); }); await p.waitForTimeout(9000); await shot('late', 'Поздняя ночь: роллета магазина опущена до конца'); }
        await ctx.close(); } }
    QS='';
    const fig=([f, ru])=>`<figure><img src="${f}" alt=""><figcaption>${ru}</figcaption></figure>`;
    await writeFile(path.join(O, 'index.html'), `<!doctype html><meta charset="utf-8"><title>RAIN-6b — улица</title><style>body{ font:15px/1.45 system-ui; background:#111; color:#ddd; margin:16px; } figure{ display:inline-block; vertical-align:top; margin:0 12px 18px 0; max-width:640px; } img{ max-width:100%; max-height:560px; border:1px solid #333; } h2{ margin-top:28px; }</style><h1>RAIN-6b: улица — было / стало</h1><p>«Было» = <code>?rain=nocull,nobodies</code> (огни холмов сквозь дома, машины — только огни). Машины и трамваи едут по своему расписанию: в кадре те, что проезжали в этот момент.</p>`
      +['laptop', 'phone'].map(tg=>`<h2>${tg==='laptop' ? 'Ноутбук' : 'Телефон'}</h2>`+made.filter(m=>m[0].startsWith(tg)).map(fig).join('')).join(''));
    console.log('[rain-snap] --rain6b: '+made.length+' captures → tools/.ui-snap/rain6b/index.html');
  } else if(argv.includes('--rain6')){   // RAIN-6: the effects hand in the rain → tools/.ui-snap/rain6/ (at rest = today; Echo full; warm; bright), phone and laptop
    const O6=path.join(ROOT, 'tools/.ui-snap/rain6'); await mkdir(O6, { recursive:true }); const made6=[];
    for(const [tag, vp, dpr] of [['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1280, height:800 }, 1]]){
      const { ctx, p }=await open(vp, LEVEL, dpr);
      await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.12); R.lookDbg('evening'); });
      await hand(p, 0.5, 0.45, 0.16, false, 10); await p.waitForTimeout(2500);
      const fx=(e, t, w=0)=>p.evaluate(async ([e, t, w])=>{ const A=await import('/core/audio.js'), ST=await import('/core/state.js'), k=ST.chainKeyOf('ld'); A.fxInstance(k, 'cecho').params[0].setNorm(e); A.fxInstance(k, 'ctone').params[1].setNorm(t); A.fxInstance(k, 'cwave').params[1].setNorm(w); }, [e, t, w]);
      for(const [name, e, t, w, ru] of [['rest', 0, 0.5, 0, 'Рука эффектов в покое — как было'], ['echo', 1, 0.5, 0, 'Эхо до конца: дождь сильнее — капли на стекле и струи дождя в свете огней'],
        ['warm', 0, 0, 0, 'Тепло: фонари, огни и окна — янтарные лампы накаливания, мягче и чуть тусклее, вывески приглушены (общий тон города тот же)'], ['bright', 0, 1, 0, 'Ярко: фонари — белые светодиоды, ярче, вывески горят, больше окон с холодным светом телевизоров'],
        ['wave', 0, 0.5, 1, 'Волна до конца: больше машин и трамваев, ветер — дождь идёт косыми струями']]){
        await fx(e, t, w); await hand(p, 0.5, 0.45, 0.16, false, 10); await p.waitForTimeout(4200); const f=`${tag}-${name}.png`; await p.screenshot({ path:path.join(O6, f) }); made6.push([f, ru]); }
      await fx(0, 0.5, 0); await ctx.close(); }
    await writeFile(path.join(O6, 'index.html'), `<!doctype html><meta charset="utf-8"><title>RAIN-6 — рука эффектов в дожде</title><style>body{ font:15px/1.45 system-ui; background:#111; color:#ddd; margin:16px; } figure{ display:inline-block; vertical-align:top; margin:0 12px 18px 0; max-width:640px; } img{ max-width:100%; max-height:560px; border:1px solid #333; }</style><h1>RAIN-6 / RAIN-6c: рука эффектов в дожде (Вечерний бульвар)</h1><p>«В покое» = как раньше (законы точно нейтральны в покое). Тепло ↔ Ярко меняет только источники света, не весь экран.</p>`+made6.map(([f, ru])=>`<figure><img src="${f}"><figcaption><b>${f.replace('.png', '')}</b> — ${ru}</figcaption></figure>`).join(String.fromCharCode(10)));
    console.log('[rain-snap] --rain6: '+made6.length+' captures → tools/.ui-snap/rain6/index.html');
  } else if(argv.includes('--rain1') || argv.includes('--rain2') || argv.includes('--rain5') || argv.includes('--rain5b') || argv.includes('--rain5c') || argv.includes('--rain5d')){   // RAIN-2: --rain2 the same captures into tools/.ui-snap/rain2/ (its comparison page: --rain2page)   /* RAIN-1: the baked city — each mood, the focus near / middle / far, a phrase lighting windows; a before / after page */
    const O1=path.join(ROOT, argv.includes('--rain5d') ? 'tools/.ui-snap/rain5d' : argv.includes('--rain5c') ? 'tools/.ui-snap/rain5c' : argv.includes('--rain5b') ? 'tools/.ui-snap/rain5b' : argv.includes('--rain5') ? 'tools/.ui-snap/rain5' : argv.includes('--rain2') ? 'tools/.ui-snap/rain2' : 'tools/.ui-snap/rain1'); await mkdir(O1, { recursive:true }); const made1=[], log1={};
    const RU={ late:'Поздняя ночь', evening:'Вечерний бульвар', after:'После дождя' };
    for(const [tag, vp, dpr] of [['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1280, height:800 }, 1]]){
      const { ctx, p, errs }=await open(vp, LEVEL, dpr), shot=async (name, ru)=>{ const f=`${tag}-${name}${SUF}.png`; await p.screenshot({ path:path.join(O1, f) }); log1[f]=await stateOf(p); made1.push([f, ru]); };
      const R=()=>p.evaluate(()=>window.__H.sceneRoomDbg());
      await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); R.mistDbg(0.12); });   // the pane wiped for the city's captures (the mist is the room's first touch; judged in motion)
      await hand(p, 0.5, 0.45, 0.2, false, 10);
      const mid=await p.evaluate(async ()=>{ const FO=await import('/apps/night/rooms/rain/pure/focus.js'), R=window.__H.sceneRoomDbg(); let lo=0.08, hi=0.34, best=0.17;
        for(let it=0;it<8;it++){ const s=(lo+hi)/2; best=s; const G=window.__G, c=window.__clk; for(let i=0;i<40;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x:0.5, y:0.45, s, gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); }
          await new Promise(r=>setTimeout(r, 250)); if(FO.focusDepth(R.state().target)>FO.LAYER_DEPTH.street) lo=s; else hi=s; } return best; });
      for(const mood of ['late', 'evening', 'after']){ await p.evaluate(m=>window.__H.sceneRoomDbg().lookDbg(m), mood); await hand(p, 0.5, 0.45, mid, false, 10); await p.waitForTimeout(3200);
        await shot(`mood-${mood}`, `${RU[mood]}: фокус на бульваре`); }
      if(argv.includes('--rain5d')){   /* RAIN-5d: the far life's rare events, each at a moment inside it (the scene's clock moved there) */
        const at=await p.evaluate(async ()=>{ const F=await import('/apps/night/rooms/rain/pure/far.js'), E=F.farEvents(4000), o={}; for(const k of ['scooter', 'smoker', 'attic', 'bridge']){ const e=E.find(x=>x.kind===k); o[k]=e.t+e.dur*(k==='scooter' ? 0.55 : 0.5); } return o; });
        for(const [k, mood, ru] of [['scooter', 'evening', 'Курьер на скутере с маленькой фарой (у бордюра, едет к нам)'], ['smoker', 'late', 'Сосед курит на балконе: огонёк сигареты (дом напротив)'], ['attic', 'evening', 'В освещённой мансарде кто-то ходит'], ['bridge', 'after', 'Огни машины на мосту на холмах']]){
          await p.evaluate(([m, t])=>{ const R=window.__H.sceneRoomDbg(); R.lookDbg(m); window.__H.sceneClockDbg(t); }, [mood, at[k]]); await hand(p, 0.5, 0.45, k==='bridge' ? 0.08 : mid, false, 10); await p.waitForTimeout(2500); await shot('far-'+k, ru); }
        await p.evaluate(()=>window.__H.sceneClockDbg(null)); }
      if(argv.includes('--rain5c') || argv.includes('--rain5d')){   /* RAIN-5c: the sky's rare events, held at a moment of each (the room's sky clock) */
        const at=await p.evaluate(async ()=>{ const S=await import('/apps/night/rooms/rain/pure/sky.js'), E=S.skyEvents(4000); const b=E.find(e=>e.kind==='beam'), q=E.find(e=>e.kind==='plane'); return { beam:b.t+b.dur*0.45, plane:q.t+q.dur*0.3 }; });
        for(const [k, mood, ru] of [['beam', 'late', 'Прожектор с крепости на холме скользит по облакам (поздняя ночь, полумесяц)'], ['plane', 'after', 'Огни далёкого самолёта над горизонтом (после дождя, луна в разрыве)']]){
          await p.evaluate(([m, t])=>{ const R=window.__H.sceneRoomDbg(); R.lookDbg(m); R.skyDbg(t); }, [mood, at[k]]); await hand(p, 0.5, 0.45, 0.08, false, 10); await p.waitForTimeout(3000); await shot('sky-'+k, ru); }
        await p.evaluate(()=>window.__H.sceneRoomDbg().skyDbg(null)); }
      await p.evaluate(()=>window.__H.sceneRoomDbg().lookDbg('evening'));
      await hand(p, 0.5, 0.45, 0.32, false, 10); await p.waitForTimeout(2600); await shot('focus-near', 'Фокус близко: капли резкие, город в мягком боке');

      await hand(p, 0.5, 0.45, mid, false, 8); await p.waitForTimeout(2600); await shot('focus-mid', 'Фокус посередине: бульвар резкий, стекло и холмы мягкие');
      await hand(p, 0.5, 0.45, 0.08, false, 8); await p.waitForTimeout(2600); await shot('focus-far', 'Фокус далеко: дом напротив и холмы резкие');
      /* a phrase: notes where the light points at windows of the house opposite (the window map's nearest windows on screen) */
      const pts=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), S=R.state(), out=[]; for(let i=0;i<S.windows && out.length<6;i+=7){ const q=R.windowAt(i); if(q && q.inView && q.r>2) out.push([q.x/innerWidth, q.y/innerHeight]); } return out; });
      for(const [x, y] of pts) await note(p, x, y, mid);   // the middle focus: the street sharp, the windows readable (a note lights a window from focus 0.45 on)
      await p.waitForTimeout(900); await shot('phrase', `Фраза: ${pts.length} нот зажгли окна под светом — в каждом своя жизнь`);
      if(errs.length) log1[tag+'-errors']=errs.slice(0, 8); await ctx.close(); }
    await writeFile(path.join(O1, `rain1${SUF}.json`), JSON.stringify(log1, null, 1));
    const fig=(f, cap, ph)=>`<figure><img class="${ph ? 'phone' : ''}" src="${f}" alt=""><figcaption>${cap}</figcaption></figure>`, pair=n=>{ const a=made1.find(m=>m[0]===`phone-${n}${SUF}.png`), b=made1.find(m=>m[0]===`laptop-${n}${SUF}.png`); return `<div class="row">${fig(a[0], a[1]+' (телефон)', 1)}${fig(b[0], b[1]+' (ноутбук)')}</div>`; };
    const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RAIN-1 — запечённый город</title>
<style>body{background:#101014;color:#e8e4dc;font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:1500px} h1,h2{font-weight:500} figure{margin:0 0 30px} img{max-width:100%;height:auto;border-radius:8px;display:block} img.phone{max-height:80vh} figcaption{margin-top:8px;color:#c9c2b6} .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.2fr);gap:20px;align-items:start}</style>
<h1>RAIN-1 — запечённый город (${LEVEL==='full' ? 'Детальная' : 'Стандартная'} картинка)</h1>
<p>Стекло для этих снимков протёрто (в комнате оно сначала запотевшее — палец рисует по туману). Город построен кодом и запечён заранее (tools/rain-bake.mjs --city).</p>
<h2>Настроения</h2>${['mood-late', 'mood-evening', 'mood-after'].map(pair).join('')}
<h2>Фокус</h2>${['focus-near', 'focus-mid', 'focus-far'].map(pair).join('')}
<h2>Фраза зажигает окна</h2>${pair('phrase')}
<h2>До и после (RAIN-0b → RAIN-1)</h2>
<div class="row">${fig('../rain0b/phone-far.png', 'До: заглушка (телефон, фокус далеко)', 1)}${fig('../rain0b/laptop-far.png', 'До: заглушка (ноутбук, фокус далеко)')}</div>
<div class="row">${fig(`phone-focus-far${SUF}.png`, 'После: запечённый город (телефон)', 1)}${fig(`laptop-focus-far${SUF}.png`, 'После: запечённый город (ноутбук)')}</div>
</html>`;
    await writeFile(path.join(O1, `index${SUF}.html`), html); console.log(`[rain-snap] ${made1.length} captures → tools/.ui-snap/rain1/index${SUF}.html`);
  } else if(COST){
    const out={};
    for(const lv of (FOREST ? ['reduced'] : ['reduced', 'full'])){   /* --forest: the same measurement on the forest at Standard, for comparison */ const { ctx, p, errs }=await open({ width:1536, height:730 }, lv);
      out[lv]=await p.evaluate(async ()=>{ const H=window.__H, G=window.__G, PO=window.__PO, V=window.__V, M=await import('/core/legacy-ui/latmeter.js'), wait=ms=>new Promise(r=>setTimeout(r, ms));
        const clk={ t:9e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true); let run=true; const t0=performance.now();
        (async ()=>{ while(run){ const now=performance.now()-t0; clk.t=9e6+now; const pinch=(Math.floor(now/500)%2)===0, far=(Math.floor(now/4000)%2)===0;   // a note every half second, near and far by turns
          G.processHandsProbe({ landmarks:[PO.pose({ x:0.5+0.3*Math.sin(now/2300), y:0.5+0.15*Math.sin(now/1700), s:far ? 0.12 : 0.3, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] });
          await new Promise(r=>requestAnimationFrame(r)); } })();
        const rows=[], step=async (name, rain)=>{ await H.setBackground(rain ? 'forest' : 'dark'); await wait(3000); const r0=M.latReport(), d0=r0.camera.framesDetected, s0=performance.now(); await wait(10000);
          const r=M.latReport(), I=H.sceneInfo(); rows.push({ step:name, det:+((r.camera.framesDetected-d0)/((performance.now()-s0)/1000)).toFixed(2), detMs:r.stages.detect.mean, fps:I.webgl ? I.fps : null, frameMs:I.webgl ? I.frameMs : null,
            calls:I.calls, programs:I.programs, texMB:+(I.texBytes/1048576).toFixed(2), buffer:I.guard && I.guard.buffer, openMs:I.openMs }); };
        try{ await step('dark', false); await step('rain', true); await step('dark', false); await step('rain', true); await step('dark', false); } finally { run=false; await wait(60); G.handsProbe(null); }
        const cmp=[1, 3].map(i=>{ const ref=(rows[i-1].det+rows[i+1].det)/2; return +(100*(rows[i].det/ref-1)).toFixed(1); });
        return { gpu:(M.latReport().gpu||{}).renderer||null, rows, vsDarkPercent:cmp, openings:H.sceneInfo().openings }; });
      out[lv].errors=errs.slice(0, 5); await ctx.close(); }
    console.log(JSON.stringify(out, null, 1));
  } else {
    await mkdir(OUT, { recursive:true }); const made=[], log={}, seqs={};
    for(const [tag, vp, dpr] of [['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1280, height:800 }, 1]]){
      const { ctx, p, errs }=await open(vp, LEVEL, dpr), shot=async (name, ru, clip)=>{ const f=`${tag}-${name}${SUF}.png`; await p.screenshot({ path:path.join(OUT, f), clip }); log[f]=await stateOf(p); made.push([f, ru]); };
      await shot('start', 'Начало: всё стекло запотело, город читается только как мягкие огни');
      /* a finger on the glass: the pinch held near, drawn across in small steps */
      await hand(p, 0.62, 0.42, 0.3, false, 30); await p.waitForTimeout(1800);
      for(let i=0;i<=24;i++){ const u=i/24; await hand(p, 0.62-0.3*u, 0.42+0.18*Math.sin(u*3.1), 0.3, true, 2); await p.waitForTimeout(60); }
      await hand(p, 0.32, 0.45, 0.3, false, 4); await p.waitForTimeout(600);
      await shot('stroke', 'Палец на стекле: удерживаемый щипок рядом рисует непрерывную чистую полосу в тумане');
      await hand(p, 0.5, 0.45, 0.3, false, 8); await p.waitForTimeout(1800);
      await shot('near', 'Фокус близко: капли резкие, улица и дом напротив в мягком боке');
      /* the middle: the hand size whose focus lands on the street */
      const mid=await p.evaluate(async ()=>{ const FO=await import('/apps/night/rooms/rain/pure/focus.js'), R=window.__H.sceneRoomDbg(); let lo=0.08, hi=0.34, best=0.17;
        for(let it=0;it<8;it++){ const s=(lo+hi)/2; best=s; const G=window.__G, c=window.__clk; for(let i=0;i<40;i++){ c.t+=1000/30; G.processHandsProbe({ landmarks:[window.__PO.pose({ x:0.5, y:0.45, s, gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] }); }
          await new Promise(r=>setTimeout(r, 250)); if(FO.focusDepth(R.state().target)>FO.LAYER_DEPTH.street) lo=s; else hi=s; } return best; });
      await hand(p, 0.5, 0.45, mid, false, 8); await p.waitForTimeout(2200);
      await shot('mid', 'Фокус посередине: улица резкая, стекло и холмы мягкие');
      await hand(p, 0.5, 0.45, 0.08, false, 8); await p.waitForTimeout(2600);
      await shot('far', 'Фокус далеко: холмы и крыши резкие, дом напротив чуть мягче, капли размыты');
      for(const [x, y] of [[0.7, 0.5], [0.75, 0.56], [0.66, 0.45], [0.8, 0.6], [0.3, 0.55]]) await note(p, x, y, 0.1);
      await p.waitForTimeout(700);
      await shot('far-phrase', 'Фокус далеко, сыграна короткая фраза: ноты зажгли окна там, куда показывал свет');
      /* drops merging: the focus on the glass, a heavy rain, six crops of the same place a third of a second apart */
      await hand(p, 0.15, 0.85, 0.32, false, 30); await p.evaluate(()=>window.__H.sceneRoomDbg().rainDbg(0.95)); await p.waitForTimeout(2500); await hand(p, 0.15, 0.85, 0.32, false, 30);
      const W=vp.width, Hh=vp.height, side=Math.min(W, Hh)*0.3, clip={ x:Math.round(W*0.5-side/2), y:Math.round(Hh*0.42-side/2), width:Math.round(side), height:Math.round(side) }; seqs[tag]=[];
      for(let k=1;k<=6;k++){ const f=`${tag}-drops-${k}${SUF}.png`; await p.screenshot({ path:path.join(OUT, f), clip }); seqs[tag].push(f); await hand(p, 0.15, 0.85, 0.32, false, 6); await p.waitForTimeout(280); }
      log[tag+'-drops']=await p.evaluate(()=>window.__H.sceneRoomDbg().state().drops);
      await p.evaluate(()=>window.__H.sceneRoomDbg().rainDbg(null));
      if(errs.length) log[tag+'-errors']=errs.slice(0, 8); await ctx.close(); }
    await writeFile(path.join(OUT, `rain0b${SUF}.json`), JSON.stringify(log, null, 1));
    const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RAIN-0b — стекло, туман, фокус, вид</title>
<style>body{background:#101014;color:#e8e4dc;font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:1500px} h1{font-weight:500} figure{margin:0 0 36px} img{max-width:100%;height:auto;border-radius:8px;display:block} img.phone{max-height:80vh} figcaption{margin-top:8px;color:#c9c2b6} .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.6fr);gap:24px;align-items:start} .seq{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px} p.note{color:#a59e92} a{color:#f4c98a}</style>
<h1>RAIN-0b — стекло, туман, фокус, вид (${LEVEL==='full' ? 'Детальная' : 'Стандартная'} картинка)</h1>
<p class="note">Город — простая заглушка (вид с 8-го этажа вдоль бульвара; дом напротив справа). Настоящий город будет запечённой 3D-моделью: <a href="../../design/rain/looktest/index.html">проба вида фасада</a>. Слева телефон (390 × 844), справа ноутбук (1280 × 800).</p>
${['start', 'stroke', 'near', 'mid', 'far', 'far-phrase'].map(n=>{ const a=made.find(m=>m[0]===`phone-${n}${SUF}.png`), b=made.find(m=>m[0]===`laptop-${n}${SUF}.png`);
  return `<div class="row"><figure><img class="phone" src="${a[0]}" alt=""><figcaption>${a[1]} (телефон)</figcaption></figure><figure><img src="${b[0]}" alt=""><figcaption>${b[1]} (ноутбук)</figcaption></figure></div>`; }).join('\n')}
${Object.entries(seqs).map(([tag, L])=>`<figure><div class="seq">${L.map(f=>`<img src="${f}" alt="">`).join('')}</div><figcaption>Капли видят друг друга (${tag==='phone' ? 'телефон' : 'ноутбук'}): одно и то же место стекла шесть раз через треть секунды, сильный дождь — бегущая капля съедает те, что на пути, оставляет бусинки, новые капли сливаются со старыми</figcaption></figure>`).join('\n')}
</html>`;
    await writeFile(path.join(OUT, `index${SUF}.html`), html);
    console.log(JSON.stringify(log, null, 1)); console.log(`[rain-snap] ${made.length} captures → ${path.relative(ROOT, OUT).replace(/\\/g, '/')}/index${SUF}.html`);
  }
} finally { await browser.close().catch(()=>{}); srv.close(); }
