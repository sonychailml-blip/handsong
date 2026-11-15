/* FOREST-1 — THE FOREST'S CAPTURES AND COST (dev tool; never runs in the app). Its own server and a fresh headless Chrome (a fake camera),
   Night with «?probe», Begin, the forest's picture, a synthetic hand through the real gesture path, the scene's clock pinned (a clear moon).
     node tools/forest-snap.mjs --tag before     captures → tools/.ui-snap/forest1/before-*.png: a phone upright (390 × 844 at 2.75) and a laptop
                                                 (1536 × 730), Standard and Detailed — the moon view (no hand), the hand's light low beside the near
                                                 trunks (roots, lower branches), and close crops of the near feet and of the objects in front
     node tools/forest-snap.mjs --tag after      the same → after-*.png
     node tools/forest-snap.mjs --page           tools/.ui-snap/forest1/index.html: before | after side by side (Russian captions)
     node tools/forest-snap.mjs --cost           no captures: per level, the forest against Dark (hand detections a second — the forest budget's
                                                 method), its frame time, draws, triangles, programs, texture memory and opening time, as JSON.
                                                 Timing: only on an idle machine (CLAUDE.md «Check levels»). */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const OUT=path.join(ROOT, 'tools/.ui-snap/forest1'), TAG=val('--tag');
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm' };
const DEVICES=[['phone', { width:390, height:844 }, 2.75], ['laptop', { width:1536, height:730 }, 1]], LEVELS=[['reduced', 'Standard'], ['full', 'Detailed']];
/* the views: [name, Russian caption, hand (null = none) [x, y, size], crops (fractions of the screen: [name, x, y, w, h])] */
const VIEWS=[['moon', 'Лес, луна, без рук', null, [['feet', 0.0, 0.5, 0.5, 0.5], ['front', 0.3, 0.62, 0.7, 0.38]]],
  ['light', 'Свет руки низко слева — корни и нижние ветки ближних стволов', [0.24, 0.72, 0.3], [['feet', 0.0, 0.45, 0.55, 0.55]]],
  ['right', 'Свет руки справа на высоте пояса — ствол справа, его ветки', [0.78, 0.55, 0.26], [['feet', 0.45, 0.35, 0.55, 0.65]]]];

async function page(){
  const fig=(f, cap, ph)=>existsSync(path.join(OUT, f)) ? `<figure><img class="${ph ? 'phone' : ''}" src="${f}" alt="" loading="lazy"><figcaption>${cap}</figcaption></figure>` : `<figure><div class="none">нет снимка ${f}</div></figure>`;
  let body='<h2>Крупно: до (FOREST-1 выключен) и после</h2>';
  const CL={ foot1:'Комель ближнего ствола слева: корни', foot2:'Комель ствола справа: корни, мох', branches:'Нижние ветки ствола слева: сухие, обломанные, живые', rock:'Камень у прохода', log:'Бревно у ручья: торец', spruce:'Молодая ель' };
  for(const [lv, lvName] of LEVELS) for(const [v, cap] of Object.entries(CL)) body+=`<div class="pair crop">${fig(`close-before-${lv}-${v}.png`, `До — ${cap} (${lvName})`)}${fig(`close-after-${lv}-${v}.png`, `После — ${cap} (${lvName})`)}</div>`;
  for(const [lv, lvName] of LEVELS) for(const [v, cap, , crops] of VIEWS){ body+=`<h2>${lvName==='Standard' ? 'Стандартная' : 'Детальная'} — ${cap}</h2>`;
    for(const [dev] of DEVICES){ const ph=dev==='phone', a=`before-${dev}-${lv}-${v}.png`, b=`after-${dev}-${lv}-${v}.png`;
      body+=`<div class="pair ${ph ? 'ph' : ''}">${fig(a, 'До — '+(ph ? 'телефон' : 'ноутбук'), ph)}${fig(b, 'После — '+(ph ? 'телефон' : 'ноутбук'), ph)}</div>`;
      for(const [c] of crops){ const ca=`before-${dev}-${lv}-${v}-${c}.png`, cb=`after-${dev}-${lv}-${v}-${c}.png`; body+=`<div class="pair crop">${fig(ca, 'До, крупно ('+c+')')}${fig(cb, 'После, крупно ('+c+')')}</div>`; } } }
  const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FOREST-1 — до и после</title>
<style>body{background:#0e1012;color:#e6e2da;font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:1700px} h1,h2{font-weight:500} h2{margin-top:40px;border-top:1px solid #2a2d30;padding-top:16px}
figure{margin:0} img{max-width:100%;height:auto;border-radius:6px;display:block} img.phone{max-height:82vh;margin:auto} figcaption{margin:6px 0 18px;color:#bdb6aa;font-size:14px}
.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start} .pair.ph{max-width:900px} .none{color:#777;padding:40px;border:1px dashed #333} p{max-width:900px;color:#cfc8bc}</style>
<h1>FOREST-1 — лес: корни, нижние ветки, ёлочки, камни (до → после)</h1>
<p>Слева — как было (NIGHT-15), справа — после FOREST-1. Телефон вертикально (390 × 844) и ноутбук (1536 × 730), Стандартная и Детальная картинка. Часы сцены закреплены (ясная луна); светлячки живые, поэтому их места отличаются.</p>
${body}</html>`;
  await writeFile(path.join(OUT, 'index.html'), html); console.log('[forest-snap] page → tools/.ui-snap/forest1/index.html');
}
if(argv.includes('--page')){ await mkdir(OUT, { recursive:true }); await page(); process.exit(0); }

const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
/* a page with the forest open at `level`: Begin tapped, the music held off, the clock pinned (a clear moon) */
async function open(vp, level, dpr=1){
  const ctx=await browser.newContext({ viewport:vp, deviceScaleFactor:dpr, locale:'en-US' });
  await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(l=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', l); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} }, level);
  const p=await ctx.newPage(), errs=[]; p.on('pageerror', e=>errs.push(String(e))); p.on('response', r=>{ if(r.status()===404) errs.push('404 '+new URL(r.url()).pathname); });
  await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  await p.click('#nightBegin');
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
  await p.evaluate(async ()=>{ window.__H=await import('/apps/night/scene/host.js'); window.__G=await import('/core/gestures.js'); window.__PO=await import('/core/gestures/pose.js'); window.__V=await import('/core/vision.js');
    const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const SH=await import('/apps/night/shell.js'); SH.nightMusicHoldDbg(true); });
  await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && I.id.endsWith('forest') && !I.opening && I.rendered>2; }, null, { timeout:90e3 });
  /* the level set explicitly: a start holds Detailed back while its files are not cached (the dev tree has no precache): the hold switched off, as the probes do */
  await p.evaluate(async l=>{ window.__H.sceneHoldDbg({ off:true }); if(window.__H.sceneInfo().level!==l) await window.__H.setSceneLevel(l); }, level);
  await p.waitForFunction(l=>{ const I=window.__H.sceneInfo(); return I.level===l && !I.opening && I.rendered>2; }, level, { timeout:90e3 });
  await p.evaluate(()=>window.__H.sceneClockDbg(60));
  await p.addStyleTag({ content:'#nightShell,#nightCoach,#nightCtl,#nightIdle,#nightForestBar,#nightFxBars,#nightNotice{visibility:hidden!important}' });   // the captures show the forest, not the interface
  await p.waitForTimeout(4200);   // the start still's reveal is over
  return { ctx, p, errs };
}
/* the playing hand at (x, y) of the picture with size s (large = near), open, for k frames; null: the hand leaves */
const hand=(p, at, k=6)=>p.evaluate(([at, k])=>{ const G=window.__G, V=window.__V; if(!window.__clk){ window.__clk={ t:6e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(window.__clk, ()=>true); }
  const c=window.__clk; c.W=V.canvas.width; c.H=V.canvas.height;
  for(let i=0;i<k;i++){ c.t+=1000/30; G.processHandsProbe(at ? { landmarks:[window.__PO.pose({ x:at[0], y:at[1], s:at[2], gaps:[1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] } : { landmarks:[], handednesses:[] }); } }, [at, k]);
const infoOf=p=>p.evaluate(()=>{ const I=window.__H.sceneInfo(); return { frameMs:I.frameMs, fps:I.fps, calls:I.calls, tris:I.triangles, programs:I.programs, openMs:I.openMs, texMB:+(I.texBytes/1048576).toFixed(2), level:I.level, errors:I.errors }; });
try{
  if(argv.includes('--row')){   /* a quick look while working: the forest's browser rows alone (the judged run is the Night suite's) */
    const { ctx, p, errs }=await open({ width:1280, height:800 }, 'reduced');
    const rows=await p.evaluate(async ()=>{ const A=await import('/tools/probes/night/forest1.js'), B=await import('/tools/probes/night/forest.js'), out={};
      for(const [k, f] of [['FOREST objects', A.checkForestObjects], ['FOREST wood', B.checkForestWood], ['FOREST canopy', B.checkForestCanopy]]){ const r=await f(); out[k]={ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }; } return out; });
    console.log(JSON.stringify(rows, null, 1), errs.slice(0, 5)); await ctx.close();
  } else if(argv.includes('--cost')){
    const out={};
    for(const [lv] of LEVELS){ const { ctx, p, errs }=await open({ width:1536, height:730 }, lv);
      if(argv.includes('--off')){ await p.evaluate(async l=>{ window.__H.sceneOptDbg({ lv:{ rootsOrganic:false, lower:false, spruces:0, foliage:false, rockDetail:false, fernCards:false, logEnds:false } }); await window.__H.setSceneLevel(l); }, lv); await p.waitForFunction(l=>{ const I=window.__H.sceneInfo(); return I.level===l && !I.opening && I.rendered>2; }, lv, { timeout:90e3 }); }   // --off: FOREST-1's switches off (the old paths): the before
      out[lv]=await p.evaluate(async ()=>{ const H=window.__H, G=window.__G, PO=window.__PO, V=window.__V, M=await import('/core/legacy-ui/latmeter.js'), wait=ms=>new Promise(r=>setTimeout(r, ms));
        const clk={ t:9e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true); let run=true; const t0=performance.now();
        (async ()=>{ while(run){ const now=performance.now()-t0; clk.t=9e6+now; const pinch=(Math.floor(now/500)%2)===0, far=(Math.floor(now/4000)%2)===0;   // a note every half second, near and far by turns
          G.processHandsProbe({ landmarks:[PO.pose({ x:0.5+0.3*Math.sin(now/2300), y:0.5+0.15*Math.sin(now/1700), s:far ? 0.12 : 0.3, gaps:[pinch ? 0.05 : 1, 1, 1, 1] })], handednesses:[[{ categoryName:'Right' }]] });
          await new Promise(r=>requestAnimationFrame(r)); } })();
        const rows=[], step=async (name, on)=>{ await H.setBackground(on ? 'forest' : 'dark'); await wait(3000); const r0=M.latReport(), d0=r0.camera.framesDetected, s0=performance.now(); await wait(10000);
          const r=M.latReport(), I=H.sceneInfo(); rows.push({ step:name, det:+((r.camera.framesDetected-d0)/((performance.now()-s0)/1000)).toFixed(2), fps:I.webgl ? I.fps : null, frameMs:I.webgl ? I.frameMs : null,
            calls:I.calls, tris:I.triangles, programs:I.programs, texMB:+(I.texBytes/1048576).toFixed(2), openMs:I.openMs }); };
        try{ await step('dark', false); await step('forest', true); await step('dark', false); await step('forest', true); await step('dark', false); } finally { run=false; await wait(60); G.handsProbe(null); }
        const cmp=[1, 3].map(i=>{ const ref=(rows[i-1].det+rows[i+1].det)/2; return +(100*(rows[i].det/ref-1)).toFixed(1); });
        return { gpu:(M.latReport().gpu||{}).renderer||null, rows, vsDarkPercent:cmp, openings:H.sceneInfo().openings }; });
      out[lv].errors=errs.slice(0, 5); await ctx.close(); }
    console.log(JSON.stringify(out, null, 1));
  } else if(argv.includes('--close')){
    /* close views (a fixed camera, the room's viewDbg), the hand's light near: FOREST-1 off (its level switches false: the old code paths, kept
       whole) → close-before-*, on → close-after-*. Only the contact shadows are FOREST-1's in both (one baked map) */
    await mkdir(OUT, { recursive:true }); const OFF={ rootsOrganic:false, lower:false, spruces:0, foliage:false, rockDetail:false, fernCards:false, logEnds:false };
    for(const [lv] of LEVELS){ const { ctx, p }=await open({ width:1280, height:800 }, lv, 1);
      for(const [tag, ov] of [['before', OFF], ['after', null]]){
        await p.evaluate(async ([ov, l])=>{ window.__H.sceneOptDbg(ov ? { lv:ov } : null); await window.__H.setSceneLevel(l); }, [ov, lv]);
        await p.waitForFunction(l=>{ const I=window.__H.sceneInfo(); return I.level===l && !I.opening && I.rendered>2; }, lv, { timeout:90e3 });
        const views=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), sp=R.canopyDbg.extra && R.canopyDbg.extra.SP.places[0], out=[
          ['foot1', [-3.5, 0.95, -0.5], [-2.1, 0.2, -2.2]], ['foot2', [3.9, 1.0, -2.7], [2.5, 0.2, -4.6]], ['branches', [-1.7, 1.7, -1.0], [-4.2, 2.6, -5.0]], ['rock', [-0.3, 0.85, 0.9], [-1.6, 0.15, -1.0]], ['log', [1.6, 0.9, -0.6], [2.2, 0.2, -2.8]]];
          const s=sp || { x:-9, z:-18, H:4 }; out.push(['spruce', [s.x*0.72, 1.6, s.z*0.72+1.2], [s.x, s.H*0.45, s.z]]); return out; });
        for(const [v, pos, look] of views){ await p.evaluate(([pos, look])=>window.__H.sceneRoomDbg().viewDbg({ pos, look }), [pos, look]);
          await hand(p, [0.42, 0.62, 0.34], 30); await p.waitForTimeout(1500); await hand(p, [0.42, 0.62, 0.34], 10);
          await p.screenshot({ path:path.join(OUT, `close-${tag}-${lv}-${v}.png`) }); }
        await p.evaluate(()=>window.__H.sceneRoomDbg().viewDbg(null)); }
      await p.evaluate(()=>window.__H.sceneOptDbg(null)); await ctx.close(); console.log('[forest-snap] close', lv, 'done'); }
    await page();
  } else {
    if(!/^(before|after)$/.test(TAG||'')) throw new Error('--tag before|after (or --page, --cost)');
    await mkdir(OUT, { recursive:true }); const log={};
    for(const [lv] of LEVELS) for(const [dev, vp, dpr] of DEVICES){
      const { ctx, p, errs }=await open(vp, lv, dpr);
      for(const [v, , at, crops] of VIEWS){
        if(at){ await hand(p, at, 30); await p.waitForTimeout(2400); await hand(p, at, 20); } else { await hand(p, null, 6); await p.waitForTimeout(1600); }
        const f=`${TAG}-${dev}-${lv}-${v}.png`; await p.screenshot({ path:path.join(OUT, f) }); log[f]=await infoOf(p);
        for(const [c, x, y, w, h] of crops){ const clip={ x:Math.round(vp.width*x), y:Math.round(vp.height*y), width:Math.round(vp.width*w), height:Math.round(vp.height*h) };
          await p.screenshot({ path:path.join(OUT, `${TAG}-${dev}-${lv}-${v}-${c}.png`), clip }); } }
      if(errs.length) log[`${dev}-${lv}-errors`]=errs.slice(0, 8); await ctx.close(); console.log('[forest-snap]', TAG, dev, lv, 'done'); }
    await writeFile(path.join(OUT, `${TAG}.json`), JSON.stringify(log, null, 1)); await page();
  }
} finally { await browser.close().catch(()=>{}); srv.close(); }
