/* PERF-1 (dev; its own server and Chrome on THIS machine's GPU): WHERE THE TIME GOES, both rooms × the three quality levels × each mood.
   Per case, after the room settles, for SEC seconds: the frame intervals (fps, mean, p95, spread), the room's main-thread time split into its
   update and its render submission, the GPU time of its render (EXT_disjoint_timer_query_webgl2 around room.render), the draw calls and
   triangles a frame (the WebGL calls counted), long tasks; the rain room's GPU time per pass (rain.js's dev hook window.__rainPassT); the forest's
   GPU time per group of meshes by leaving each group out (its name's first word) on one case per level; the hand model's share (the camera pump
   held vs running: the main thread's busy time per second). → tools/.ui-snap/perf1/perf1.json and a printed table. Timing: run on an idle machine. */
import http from 'node:http'; import { readFile, writeFile, mkdir } from 'node:fs/promises'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=k=>{ const i=argv.indexOf(k); return i>=0 ? argv[i+1] : null; };
const SEC=+(val('--sec')||6), ONLY=val('--only'), MESHES=argv.includes('--meshes'), OPT=val('--opt') ? JSON.parse(val('--opt')) : null, LEVELS=val('--levels') ? val('--levels').split(',') : ['full', 'reduced', 'light'], QUICK=argv.includes('--quick'), PASSES=argv.includes('--passes'), EXP=val('--exp'), EXP_WAIT=+(val('--exp-wait')||2.5), SHOT=val('--shot'), OUT=path.join(ROOT, 'tools/.ui-snap/perf1');
const MIME={ '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wasm':'application/wasm', '.task':'application/octet-stream', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.ktx2':'image/ktx2', '.bin':'application/octet-stream' };
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; } const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding' ] });
const VP=(s=>({ width:s[0], height:s[1] }))((val('--size')||'1280x800').split('x').map(Number));   // SPEED-1: --size 1920x1080 = the founder's screen
const instr=async p=>{
  await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); const sc=document.getElementById('scene'), gl=sc && sc.getContext('webgl2');   // the scene's own context (three made it)
    const ext=gl && gl.getExtension('EXT_disjoint_timer_query_webgl2'), M=window.__M={ gl, ext, frames:[], upd:[], ren:[], gpu:[], calls:0, tris:0, pend:[], pass:{}, passPend:[], long:0, mood:null, n:0 };
    for(const k of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']){ const o=gl[k].bind(gl); gl[k]=(...a)=>{ M.calls++; const cnt= k.startsWith('drawArrays') ? a[2] : a[1], inst= k.endsWith('Instanced') ? a[k==='drawArraysInstanced' ? 3 : 4] : 1; if(a[0]===gl.TRIANGLES) M.tris+=cnt/3*inst; return o(...a); }; }
    const q=(arr, name)=>{ if(!ext) return null; const Q=gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, Q); return ()=>{ gl.endQuery(ext.TIME_ELAPSED_EXT); arr.push([Q, name]); }; };
    const poll=()=>{ for(const L of [M.pend, M.passPend]) for(let i=L.length-1;i>=0;i--){ const [Q, name]=L[i]; if(gl.getQueryParameter(Q, gl.QUERY_RESULT_AVAILABLE)){ const ms=gl.getQueryParameter(Q, gl.QUERY_RESULT)/1e6; if(name==null) M.gpu.push(ms); else (M.pass[name]=M.pass[name]||[]).push(ms); gl.deleteQuery(Q); L.splice(i, 1); } } };
    /* SPEED-1 --passes: each renderer.render call of the forest timed alone (what it draws, into what, which layers) — the whole-frame query off */
    const wrapR=r=>{ if(r.__pw || !window.__passes) return; r.__pw=1; const o=r.render.bind(r); r.render=(sc, cam)=>{ const tg=r.getRenderTarget(), quad=sc.children.length===1 && !!sc.children[0].geometry && sc.children[0].geometry.type==='PlaneGeometry';
      const e=q(M.passPend, (quad ? 'quad' : 'scene')+(tg ? ' → target '+tg.width+'x'+tg.height : ' → screen')+' layers '+cam.layers.mask); try{ return o(sc, cam); } finally { if(e) e(); } }; };
    const U=R.update.bind(R), Rn=R.render.bind(R);
    R.update=(dt, t, h, fx, nin)=>{ const t0=performance.now(); const r=U(dt, t, h, fx, M.mood ? { ...(nin||{}), mood:M.mood } : nin); M.upd.push(performance.now()-t0); return r; };
    R.render=(r)=>{ poll(); wrapR(r); const e=(window.__want==='rain' || window.__passes) ? null : q(M.pend, null), t0=performance.now(), c0=M.calls, t1=M.tris; const out=Rn(r); M.ren.push(performance.now()-t0); if(e) e(); M.lastCalls=M.calls-c0; M.lastTris=M.tris-t1; M.callsF=(M.callsF||[]).concat([M.calls-c0]).slice(-400); M.trisF=(M.trisF||[]).concat([M.tris-t1]).slice(-400); return out; };
    window.__rainPassT=(name, f)=>{ const e=q(M.passPend, name); f(); if(e) e(); };
    try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()) M.long+=e.duration; }).observe({ type:'longtask', buffered:false }); }catch(e){}
    const loop=t=>{ M.frames.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
};
async function open(room, q){
  const ctx=await browser.newContext({ viewport:VP, deviceScaleFactor:1, locale:'en-US' }); await ctx.grantPermissions(['camera', 'microphone'], { origin:`http://127.0.0.1:${port}` });
  await ctx.addInitScript(([lv, li])=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', lv); localStorage.setItem('handsong.nightLight', li); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} }, [q==='full' ? 'full' : 'reduced', q==='light' ? '1' : '0']);
  const p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/apps/night/index.html?probe${room==='rain' ? '&room=rain' : ''}${val('--query') ? '&'+val('--query') : ''}`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 }); await p.click('#nightBegin');
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:180e3 });
  await p.evaluate(async ([want, passes])=>{ window.__passes=passes; window.__H=await import('/apps/night/scene/host.js'); window.__V=await import('/core/vision.js'); window.__L=await import('/core/legacy-ui/latmeter.js'); const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); window.__want=want; }, [room, PASSES]);
  await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && I.id.endsWith(window.__want) && !I.opening && I.rendered>2; }, null, { timeout:90e3 });
  await p.waitForTimeout(5000);
  await instr(p);
  return { ctx, p };
}
const stats=a=>{ if(!a.length) return null; const s=a.slice().sort((x, y)=>x-y), m=a.reduce((x, y)=>x+y, 0)/a.length, sd=Math.sqrt(a.reduce((x, y)=>x+(y-m)**2, 0)/a.length); return { mean:+m.toFixed(2), p50:+s[Math.floor(s.length*0.5)].toFixed(2), p95:+s[Math.floor(s.length*0.95)].toFixed(2), max:+s[s.length-1].toFixed(2), sd:+sd.toFixed(2), n:a.length }; };
async function sample(p, sec=SEC){ await p.evaluate(()=>{ const M=window.__M; M.frames=[]; M.upd=[]; M.ren=[]; M.gpu=[]; M.pass={}; M.long=0; M.calls=0; M.tris=0; M.callsF=[]; M.trisF=[]; M.t0=performance.now(); });
  await p.waitForTimeout(sec*1000); await p.waitForTimeout(300);
  return p.evaluate(()=>{ const M=window.__M, d=[]; for(let i=1;i<M.frames.length;i++) d.push(M.frames[i]-M.frames[i-1]); const el=(performance.now()-M.t0)/1000;
    return { dt:d, upd:M.upd, ren:M.ren, gpu:M.gpu, pass:M.pass, calls:M.callsF, tris:M.trisF, longPerSec:M.long/el, info:window.__H.sceneInfo(), det:(r=>({ ms:r.stages.detect.mean, perS:r.detection.detectedFps, runs:r.detection.runs, h2s:r.handToSoundWithWaitMs }))(window.__L.latReport()) }; }); }
const gsum=r=>{ const P=Object.values(r.pass); if(!P.length) return r.gpu; const n=Math.min(...P.map(a=>a.length)), out=[]; for(let i=0;i<n;i++) out.push(P.reduce((x, a)=>x+(a[a.length-n+i]||0), 0)); return out; };
const sum=r=>({ fps:+(1000/(r.dt.reduce((a, b)=>a+b, 0)/Math.max(1, r.dt.length))).toFixed(1), frame:stats(r.dt), update:stats(r.upd), render:stats(r.ren), gpu:stats(gsum(r)), calls:stats(r.calls), tris:stats(r.tris), longMsPerSec:+r.longPerSec.toFixed(1),
  pass:Object.fromEntries(Object.entries(r.pass).map(([k, v])=>[k, stats(v)])), texMB:r.info.memory ? r.info.memory.textures : null, programs:r.info.programs, buffer:r.info.guard && r.info.guard.buffer, det:r.det, pixelRatio:r.info.pixelRatio, shadow:r.info.shadow, fpsCap:r.info.fpsCap });
const MOODS={ forest:['major-penta', 'minor-penta', 'egyptian'], rain:['evening', 'after', 'late'] };
const out={ machine:null, sec:SEC, cases:[] };
try{
  await mkdir(OUT, { recursive:true });
  for(const room of ['forest', 'rain']){ if(ONLY && !room.includes(ONLY)) continue;
    for(const q of LEVELS){ const { ctx, p }=await open(room, q);
      if(OPT){ await p.evaluate(async ([o, q])=>{ window.__H.sceneOptDbg(o); window.__H.setSceneLight(q==='light'); await window.__H.setSceneLevel(q==='full' ? 'full' : 'reduced'); }, [OPT, q]); await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && !I.opening && I.rendered>3; }, null, { timeout:90e3 }); await p.waitForTimeout(3000);
        await instr(p);   // the reopened room: a new context, the wrappers again
      }
      if(!out.machine) out.machine=await p.evaluate(()=>{ const g=window.__M.gl, e=g.getExtension('WEBGL_debug_renderer_info'); return { gpu:e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?', cores:navigator.hardwareConcurrency, ua:navigator.userAgent }; });
      if(SHOT){ await p.waitForTimeout(1500); await p.screenshot({ path:path.join(OUT, `${SHOT}-${room}-${q}.png`) }); console.log(`[perf1] shot ${SHOT}-${room}-${q}.png`); await ctx.close(); continue; }
      for(const mood of (MESHES ? [] : QUICK ? MOODS[room].slice(0, 1) : MOODS[room])){ await p.evaluate(m=>{ const R=window.__H.sceneRoomDbg(); if(window.__want==='rain') R.lookDbg(m); else window.__M.mood=m; }, mood); await p.waitForTimeout(3000);
        const r=sum(await sample(p)); out.cases.push({ room, q, mood, ...r }); console.log(`[perf1] ${room} ${q} ${mood}: ${r.fps} fps, frame p95 ${r.frame && r.frame.p95} ms (sd ${r.frame && r.frame.sd}), update ${r.update && r.update.mean} ms, render ${r.render && r.render.mean} ms, GPU ${r.gpu && r.gpu.mean} ms (p95 ${r.gpu && r.gpu.p95}), calls ${r.calls && r.calls.mean}, tris ${r.tris && Math.round(r.tris.mean)}, long ${r.longMsPerSec} ms/s`+(Object.keys(r.pass).length ? ' · passes '+Object.entries(r.pass).map(([k, v])=>`${k} ${v && v.mean}`).join(', ') : '')); }
      /* SPEED-1 --exp 'R=>{…}': an experiment on the room after the cases (a page-side function of the room object; an undo function may be returned) → the same sample after it */
      if(EXP){ const before=sum(await sample(p, 4)); const exr=await p.evaluate(async src=>{ try{ window.__undo=await (0, eval)(src)(window.__H.sceneRoomDbg()); return 'ok'; }catch(e){ return 'threw: '+(e && e.message || e); } }, EXP); await p.waitForTimeout(EXP_WAIT*1000);
        console.log('[perf1] EXP '+exr+' · path '+JSON.stringify(await p.evaluate(()=>window.__V.pathInfo()))); const after=sum(await sample(p, 4));
        if(PASSES) for(const r of [before, after]) r.passSum=+Object.values(r.pass).reduce((a, v)=>a+(v ? v.mean : 0), 0).toFixed(2);
        out.cases.push({ room, q, mood:'exp', exp:EXP, before, after }); console.log(`[perf1] ${room} ${q} EXP: GPU ${before.passSum??(before.gpu && before.gpu.mean)} → ${after.passSum??(after.gpu && after.gpu.mean)} ms · fps ${before.fps} → ${after.fps} · long ${before.longMsPerSec} → ${after.longMsPerSec} ms/s · detection ${JSON.stringify(before.det)} → ${JSON.stringify(after.det)} · `+Object.entries(after.pass).map(([k, v])=>`${k} ${before.pass[k] && before.pass[k].mean} → ${v && v.mean}`).join(', ')); }
      /* the hand model's share: the camera pump held → the main thread's long tasks and the frame */
      if(!MESHES && !QUICK){ const run=sum(await sample(p, 4)); await p.evaluate(()=>window.__V.pumpDbg({ hold:true })); await p.waitForTimeout(800); const held=sum(await sample(p, 4)); await p.evaluate(()=>window.__V.pumpDbg({ hold:false }));
        out.cases.push({ room, q, mood:'hands', running:run, held }); console.log(`[perf1] ${room} ${q} hand model: long tasks ${run.longMsPerSec} → ${held.longMsPerSec} ms/s held; frame p95 ${run.frame && run.frame.p95} → ${held.frame && held.frame.p95} ms; fps ${run.fps} → ${held.fps}`); }
      /* RAIN-8: our own window removed — its «without our window» case with it */
      /* --meshes: each forest mesh left out alone (one case per level) → its GPU time, triangles, what it is */
      if(MESHES && room==='forest'){ const list=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), L=[]; R.scene.traverse(o=>{ if(o.isMesh || o.isPoints){ const g=o.geometry, ix=g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0); L.push({ k:L.length, type:o.type, inst:o.count||1, tris:Math.round(ix/3*(o.isInstancedMesh ? o.count : 1)), mat:o.material && (o.material.type+(o.material.transparent ? ' transparent' : '')+(o.material.alphaTest ? ' alphaTest' : '')), name:o.name||'', vis:o.visible, layer:o.renderOrder }); window.__all=(window.__all||[]); window.__all[L.length-1]=o; } }); return L; });
        const base=sum(await sample(p, 3)), res=[];
        for(const m of list){ if(!m.vis) continue; await p.evaluate(k=>{ window.__all[k].visible=false; }, m.k); await p.waitForTimeout(350); const r=sum(await sample(p, 1.6)); await p.evaluate(k=>{ window.__all[k].visible=true; }, m.k); res.push({ ...m, gpuSaved:+((base.gpu ? base.gpu.mean : 0)-(r.gpu ? r.gpu.mean : 0)).toFixed(2) }); }
        res.sort((a, b)=>b.gpuSaved-a.gpuSaved); out.cases.push({ room, q, mood:'meshes', base:base.gpu, meshes:res }); console.log(`[perf1] forest ${q} meshes (GPU ms saved alone, of ${base.gpu && base.gpu.mean}): `+res.slice(0, 12).map(m=>`#${m.k} ${m.type} ${m.mat} ×${m.inst} ${m.tris} tris → ${m.gpuSaved}`).join(' | ')); }
      /* the forest's groups: each left out once → its GPU time */
      if(room==='forest' && !MESHES && !QUICK){ const groups=await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(), G={}; R.scene.traverse(o=>{ if(o.isMesh || o.isPoints || o.isLine){ const k=((o.name||o.material && o.material.name||o.type).split(/[ _\-.:0-9]/)[0]||o.type).toLowerCase(); (G[k]=G[k]||0); G[k]++; } }); return G; });
        const base=sum(await sample(p, 4)); const res={};
        for(const g of Object.keys(groups)){ await p.evaluate(g=>{ const R=window.__H.sceneRoomDbg(); window.__hid=[]; R.scene.traverse(o=>{ if((o.isMesh || o.isPoints || o.isLine) && ((o.name||o.material && o.material.name||o.type).split(/[ _\-.:0-9]/)[0]||o.type).toLowerCase()===g && o.visible){ o.visible=false; window.__hid.push(o); } }); }, g);
          await p.waitForTimeout(500); const r=sum(await sample(p, 2.5)); await p.evaluate(()=>{ for(const o of window.__hid) o.visible=true; }); res[g]={ meshes:groups[g], gpuSaved:+((base.gpu ? base.gpu.mean : 0)-(r.gpu ? r.gpu.mean : 0)).toFixed(2), callsSaved:+((base.calls ? base.calls.mean : 0)-(r.calls ? r.calls.mean : 0)).toFixed(1), trisSaved:Math.round((base.tris ? base.tris.mean : 0)-(r.tris ? r.tris.mean : 0)) }; }
        out.cases.push({ room, q, mood:'groups', base:{ gpu:base.gpu, calls:base.calls, tris:base.tris }, groups:res }); console.log(`[perf1] forest ${q} groups (GPU ms saved when left out): `+Object.entries(res).sort((a, b)=>b[1].gpuSaved-a[1].gpuSaved).map(([k, v])=>`${k} ${v.gpuSaved} (${v.meshes})`).join(', ')); }
      await ctx.close(); } }
  await writeFile(path.join(OUT, MESHES ? 'perf1-meshes.json' : 'perf1.json'), JSON.stringify(out, null, 1)); console.log('[perf1] written tools/.ui-snap/perf1/'+(MESHES ? 'perf1-meshes.json' : 'perf1.json')+' · '+JSON.stringify(out.machine));
} finally { await browser.close(); srv.close(); }
