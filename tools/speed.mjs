/* SPEED-0 (dev; its own server and one headless Chrome on THIS machine's GPU): the fast speed check, ~3–4 min. Night, both rooms × the three
   qualities, one page (the founder: automatic and short). Two parts per case:
   COST (judged, independent of the machine's load): draw calls and triangles a frame (max over 1 s), shader programs, texture bytes and
   counts, geometries, the picture's buffer, the audio sources running with the music held, plus once the start set (bytes and files
   loaded before «Begin») and the audio nodes built by then. Compared with tools/prints/night-speed-cost.json: any rise FAILS; a fall is
   reported («cheaper — renew to lock it in»); renewed only by a declared `--renew`.
   TIME (reported, never judged — it moves with the machine's load; run it on an idle laptop): fps, frame p95, long tasks ms/s, the hand
   model's detection ms, hand → sound (the latency meter's estimate with the frame wait), garbage MB/s, audio underruns; side by side with
   the previous run (tools/.out/speed-last.json → speed-prev.json). The fake camera has no hand: detection = the search path.
   Flags: --cost (no TIME part), --only forest|rain, --renew, --control (the forest's cost with one extra mesh: must fail exactly there),
   --limit-min N (default 6; the whole run fails past it). Times on the HD 4000: --cost ~3 min, the whole run ~3.5–4, --only forest about half. */
import http from 'node:http'; import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'; import { existsSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), val=k=>{ const i=argv.indexOf(k); return i>=0 ? argv[i+1] : null; };
const CONTROL=argv.includes('--control'), COST_ONLY=argv.includes('--cost')||CONTROL, ONLY=CONTROL ? 'forest' : val('--only'), RENEW=argv.includes('--renew'), LIMIT_MIN=+(val('--limit-min')||6);
const BASE=path.join(ROOT, 'tools/prints/night-speed-cost.json'), OUT=path.join(ROOT, 'tools/.out'), LAST=path.join(OUT, 'speed-last.json'), PREV=path.join(OUT, 'speed-prev.json');
const MIME={ '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wasm':'application/wasm', '.task':'application/octet-stream', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.ktx2':'image/ktx2', '.bin':'application/octet-stream', '.ogg':'audio/ogg', '.webm':'video/webm' };
const T0=Date.now(), log=s=>console.log(`[speed] ${s}`);
const killer=setTimeout(()=>{ console.log(`[speed] NOT A PASS — the run passed its upper limit of ${LIMIT_MIN} min`); process.exit(2); }, LIMIT_MIN*60e3);
const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; } const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const port=srv.address().port, ORIGIN=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });

/* in the page before any script: the stored choices (Standard, the forest, English), the audio census of the LIVE context, long tasks */
const INIT=()=>{
  try{ localStorage.setItem('handsong.nightBg', 'forest'); localStorage.setItem('handsong.sceneLevel', 'reduced'); localStorage.setItem('handsong.nightLight', '0'); localStorage.setItem('handsong.night.lang', 'en'); }catch(e){}
  const A=window.__SA={ made:{}, running:new Set() }, live=c=>typeof AudioContext!=='undefined' && c instanceof AudioContext;
  for(const name of Object.getOwnPropertyNames(BaseAudioContext.prototype)) if(/^create/.test(name)){ const f=BaseAudioContext.prototype[name]; if(typeof f!=='function') continue;
    BaseAudioContext.prototype[name]=function(...a){ const n=f.apply(this, a); if(live(this)) A.made[name.slice(6)]=(A.made[name.slice(6)]||0)+1; return n; }; }
  const W0=window.AudioWorkletNode; if(W0) window.AudioWorkletNode=class extends W0{ constructor(cx, nm, o){ super(cx, nm, o); if(live(cx)) A.made['Worklet:'+nm]=(A.made['Worklet:'+nm]||0)+1; } };
  const S=window.AudioScheduledSourceNode && AudioScheduledSourceNode.prototype; if(S){ const st=S.start, sp=S.stop;   // exact: a source started and never told to stop = a pool voice (rule #3); one-shots always get a stop()
    S.start=function(...a){ if(live(this.context)) A.running.add(this); return st.apply(this, a); };
    S.stop=function(...a){ A.running.delete(this); return sp.apply(this, a); }; }
  window.__SL={ long:0 }; try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()) window.__SL.long+=e.duration; }).observe({ type:'longtask', buffered:false }); }catch(e){}
};

const res={ machine:null, startSet:null, audioBuilt:null, boot:null, cases:[] };
let fails=[], notes=[];
try{
  const ctx=await browser.newContext({ viewport:{ width:1280, height:800 }, deviceScaleFactor:1, locale:'en-US' }); await ctx.grantPermissions(['camera', 'microphone'], { origin:ORIGIN });
  await ctx.addInitScript(INIT);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(String(e.message||e)));
  const tNav=Date.now(); await p.goto(`${ORIGIN}/apps/night/index.html?probe`, { timeout:60e3 });
  await p.waitForFunction(()=>window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  const tReady=Date.now();
  /* the start set: what is loaded before «Begin» once the network is quiet (3 s without a new file; at most 30 s) */
  { let n=-1, same=0; for(let i=0;i<60 && same<6;i++){ const k=await p.evaluate(()=>performance.getEntriesByType('resource').length); same= k===n ? same+1 : 0; n=k; await p.waitForTimeout(500); } if(same<6) fails.push('the network never went quiet before «Begin» (30 s)'); }
  /* exact: the paths loaded, their bytes read from disk (a transfer size can differ for the same file) */
  { const L=await p.evaluate(o=>[...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(e=>e.name).filter(u=>u.startsWith(o)).map(u=>new URL(u).pathname).filter(q=>!q.startsWith('/tools/')), ORIGIN);   // the probe modules (?probe) are never shipped and load in any order
    const paths=[...new Set(L)].sort(); let b=0; for(const q of paths){ try{ b+=(await readFile(path.join(ROOT, decodeURIComponent(q.endsWith('/') ? q+'index.html' : q)))).length; }catch(e){} }
    res.startSet={ files:paths.length, kb:Math.round(b/1024) }; res.startPaths=paths; }
  await p.click('#nightBegin'); const tClick=Date.now();
  await p.waitForFunction(()=>!document.getElementById('start').classList.contains('on'), null, { timeout:120e3 });
  await p.evaluate(async ()=>{ window.__H=await import('/apps/night/scene/host.js'); window.__Sh=await import('/apps/night/shell.js'); window.__RS=await import('/apps/night/roomswitch.js');
    window.__L=await import('/core/legacy-ui/latmeter.js'); window.__A=await import('/core/audio.js'); const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true);
    const g=document.createElement('canvas').getContext('webgl2'), d=g && g.getExtension('WEBGL_debug_renderer_info'); window.__gpu=g ? String(g.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : g.RENDERER)) : 'no WebGL2'; });
  await p.waitForFunction(()=>{ const I=window.__H.sceneInfo(); return !!I.id && !I.opening && I.rendered>2; }, null, { timeout:90e3 });
  res.boot={ readyS:+((tReady-tNav)/1000).toFixed(1), roomS:+((Date.now()-tClick)/1000).toFixed(1) };
  res.machine=await p.evaluate(()=>({ gpu:window.__gpu, cores:navigator.hardwareConcurrency }));
  if(/swiftshader|software|llvmpipe/i.test(res.machine.gpu)) notes.push('WebGL runs in SOFTWARE here — the TIME part means nothing on this run');
  /* the audio built at the start: the music held, the one-shots ended */
  await p.evaluate(()=>window.__Sh.nightMusicHoldDbg(true)); await p.waitForTimeout(3000);
  res.audioBuilt=await p.evaluate(()=>({ ...window.__SA.made }));

  const rooms=await p.evaluate(()=>window.__H.sceneRooms()), idOf=r=>rooms.find(x=>x.endsWith(r));
  const PLAN=[['forest', 'reduced'], ['forest', 'full'], ['forest', 'light'], ['rain', 'light'], ['rain', 'reduced'], ['rain', 'full']].filter(([r])=>!ONLY || r===ONLY);
  let cur='forest';
  for(const [room, q] of PLAN){
    await p.evaluate(()=>window.__Sh.nightMusicHoldDbg(true));
    if(room!==cur){ await p.evaluate(id=>window.__RS.roomSwitch(id), idOf(room)); cur=room; }
    await p.evaluate(q=>window.__Sh.qualitySet(q), q);
    await p.waitForFunction(r=>{ const I=window.__H.sceneInfo(); return !!I.id && I.id.endsWith(r) && !I.opening && I.webgl && I.rendered>3; }, room, { timeout:90e3 });
    await p.waitForTimeout(3000);
    if(CONTROL && q==='reduced') await p.evaluate(()=>{ const R=window.__H.sceneRoomDbg(); let m=null; R.scene.traverse(o=>{ if(!m && o.isMesh && !o.isInstancedMesh) m=o; }); R.scene.add(m.clone()); });   // CONTROL: one more mesh must fail
    const cost=await p.evaluate(()=>new Promise(done=>{ let cMax=0, tMax=0; const t0=performance.now();
      const f=()=>{ const I=window.__H.sceneInfo(); cMax=Math.max(cMax, I.calls); tMax=Math.max(tMax, I.triangles); if(performance.now()-t0<1000) requestAnimationFrame(f);
        else { const I=window.__H.sceneInfo(), run={}; for(const n of window.__SA.running) run[n.constructor.name]=(run[n.constructor.name]||0)+1;
          const R=window.__H.sceneRoomDbg(), cen={ meshes:0, materials:new Set(), trisCap:0 }; if(R && R.scene) R.scene.traverse(o=>{ if(!(o.isMesh || o.isPoints || o.isLine)) return; cen.meshes++;
            for(const m of [].concat(o.material||[])) cen.materials.add(m.uuid); const g=o.geometry, ix=g ? (g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0) : 0; cen.trisCap+=Math.round(ix/3)*(o.isInstancedMesh ? o.instanceMatrix.count : 1); });
          done({ calls:cMax, triangles:tMax, sceneMeshes:cen.meshes, sceneMaterials:cen.materials.size, sceneTrisCap:cen.trisCap, programs:I.programs, texKB:Math.round((I.texBytes||0)/1024), textures:I.memory && I.memory.textures, geometries:I.memory && I.memory.geometries, buffer:I.guard && I.guard.buffer ? I.guard.buffer.join('x') : null, audioRunning:run }); } };
      requestAnimationFrame(f); }));
    const c={ room, q, cost };
    if(!COST_ONLY){
      await p.evaluate(()=>window.__Sh.nightMusicHoldDbg(false)); await p.waitForTimeout(1500);
      c.time=await p.evaluate(()=>new Promise(done=>{ const fr=[], heap=[], A=window.__A.AC, ub=()=>{ try{ return A && A.playbackStats ? A.playbackStats.underrunEvents : NaN; }catch(e){ return NaN; } };
        const u0=ub(), l0=window.__SL.long, t0=performance.now(), mem=()=>performance.memory ? performance.memory.usedJSHeapSize : NaN;
        const hs=setInterval(()=>heap.push(mem()), 50); const f=t=>{ fr.push(t); if(performance.now()-t0<4000) requestAnimationFrame(f); else end(); };
        const end=()=>{ clearInterval(hs); const sec=(performance.now()-t0)/1000, d=[]; for(let i=1;i<fr.length;i++) d.push(fr[i]-fr[i-1]); const s=d.slice().sort((a, b)=>a-b);
          let freed=0; for(let i=1;i<heap.length;i++) if(heap[i]<heap[i-1]) freed+=heap[i-1]-heap[i];
          const r=window.__L.latReport(), r1=x=>Number.isFinite(x) ? Math.round(x*10)/10 : null;
          done({ fps:r1(1000*d.length/d.reduce((a, b)=>a+b, 0)), frameP95:r1(s[Math.floor(s.length*0.95)]), longMsPerS:r1((window.__SL.long-l0)/sec), detectMs:r.stages.detect.mean, searchMs:r.stages.detSearch.mean,
            detectedFps:r.detection.detectedFps, handToSoundMs:r.handToSoundWithWaitMs, garbageMBs:r1(freed/1048576/sec), underruns:Number.isFinite(u0) ? ub()-u0 : null }); };
        requestAnimationFrame(f); }));
    }
    res.cases.push(c);
    log(`${room} ${q}: calls ${cost.calls}, triangles ${cost.triangles}, scene ${cost.sceneMeshes} meshes / ${cost.sceneTrisCap} triangles at most, programs ${cost.programs}, textures ${cost.texKB} KB, audio pool ${JSON.stringify(cost.audioRunning)}`
      +(c.time ? ` · ${c.time.fps} fps, frame p95 ${c.time.frameP95} ms, long ${c.time.longMsPerS} ms/s, detect ${c.time.detectMs} ms, hand→sound ${c.time.handToSoundMs} ms, garbage ${c.time.garbageMBs} MB/s, underruns ${c.time.underruns}` : ''));
  }
  if(errs.length) fails.push('page errors: '+errs.slice(0, 3).join(' | '));
  await ctx.close();
} catch(e){ fails.push('the run broke: '+(e && e.message || e).toString().split('\n')[0]); }
finally { await browser.close(); srv.close(); }

/* COST: judged against the baseline */
/* both rooms live (the rain's cars, tram and people; the forest's fireflies and leaves): the per-frame draws, triangles and geometries move with
   the moment — reported only; the judged size is the scene census (meshes, materials, triangle capacity), which the moment does not change. */
const FRAME_VARIES=['calls', 'triangles', 'geometries'];   // two runs: the forest's Light 68 → 75 draws too (its fireflies and leaves)
const costOf=r=>({ startSet:r.startSet, audioBuilt:r.audioBuilt, cases:Object.fromEntries(r.cases.map(c=>[`${c.room} ${c.q}`, Object.fromEntries(Object.entries(c.cost).filter(([k])=>!FRAME_VARIES.includes(k)))])) });
const now=costOf(res);
const flat=(o, pre='')=>Object.entries(o||{}).flatMap(([k, v])=>v && typeof v==='object' ? flat(v, pre+k+'.') : [[pre+k, v]]);
if(!fails.length){
  if(RENEW){ await writeFile(BASE, JSON.stringify({ made:new Date().toISOString().slice(0, 10), machine:res.machine, ...now, startPaths:res.startPaths }, null, 1)+'\n'); notes.push('baseline written (declared --renew): tools/prints/night-speed-cost.json'); }
  else if(!existsSync(BASE)) fails.push('no baseline — run with --renew on unchanged code first');
  else { const B=JSON.parse(await readFile(BASE, 'utf8')), bm=new Map(flat({ startSet:B.startSet, audioBuilt:B.audioBuilt, cases:B.cases })), nm=new Map(flat(now)), cheaper=[];
    for(const [k, v] of nm){ if(ONLY && k.startsWith('cases.') && !k.startsWith('cases.'+ONLY)) continue; const b=bm.get(k);
      if(typeof v==='number' && typeof b==='number'){ if(v>b) fails.push(`costlier: ${k} ${b} → ${v}`); else if(v<b) cheaper.push(`${k} ${b} → ${v}`); }
      else if(b===undefined) fails.push(`new cost: ${k} = ${v} (not in the baseline)`);
      else if(v!==b) fails.push(`changed: ${k} ${b} → ${v}`); }
    for(const [k] of bm) if(!nm.has(k) && !(ONLY && k.startsWith('cases.') && !k.startsWith('cases.'+ONLY))) fails.push(`gone from the measurement: ${k}`);
    if(cheaper.length) notes.push('cheaper (renew to lock it in): '+cheaper.join(', '));
    if(B.startPaths && res.startPaths){ const a=new Set(B.startPaths), b=new Set(res.startPaths), add=res.startPaths.filter(x=>!a.has(x)), gone=B.startPaths.filter(x=>!b.has(x));
      if(add.length || gone.length) notes.push(`start set: added ${add.slice(0, 8).join(' ')||'—'}${add.length>8 ? ' …' : ''}; gone ${gone.slice(0, 8).join(' ')||'—'}${gone.length>8 ? ' …' : ''}`); } }
}
/* TIME: reported beside the previous run */
if(!COST_ONLY && res.cases.length){
  await mkdir(OUT, { recursive:true }); let prev=null; if(existsSync(LAST)){ prev=JSON.parse(await readFile(LAST, 'utf8')); await rename(LAST, PREV); }
  await writeFile(LAST, JSON.stringify({ at:new Date().toISOString(), ...res }, null, 1));
  const P=prev ? Object.fromEntries((prev.cases||[]).filter(c=>c.time).map(c=>[`${c.room} ${c.q}`, c.time])) : {};
  log('TIME (not judged; previous run in brackets): boot '+res.boot.readyS+' s to the start card, '+res.boot.roomS+' s to the room'+(prev && prev.boot ? ` [${prev.boot.readyS}, ${prev.boot.roomS}]` : ''));
  for(const c of res.cases){ const t=c.time, o=P[`${c.room} ${c.q}`], w=k=>o && o[k]!=null ? ` [${o[k]}]` : '';
    log(`  ${c.room} ${c.q}: fps ${t.fps}${w('fps')} · frame p95 ${t.frameP95}${w('frameP95')} · long ${t.longMsPerS}${w('longMsPerS')} ms/s · detect ${t.detectMs}${w('detectMs')} ms · hand→sound ${t.handToSoundMs}${w('handToSoundMs')} ms · garbage ${t.garbageMBs}${w('garbageMBs')} MB/s · underruns ${t.underruns}${w('underruns')}`); }
}
log(`machine: ${res.machine ? res.machine.gpu+', '+res.machine.cores+' cores' : '?'} · start set ${res.startSet ? res.startSet.kb+' KB in '+res.startSet.files+' files' : '?'} · ${((Date.now()-T0)/1000).toFixed(0)} s`);
for(const n of notes) log(n);
clearTimeout(killer);
if(CONTROL){ const ok=fails.length===1 && /^costlier: cases\.forest reduced\.scene(Meshes|TrisCap)/.test(fails[0]) || fails.length===2 && fails.every(f=>/^costlier: cases\.forest reduced\.scene(Meshes|TrisCap)/.test(f));
  for(const f of fails) log('control saw: '+f); if(ok){ console.log('[speed] PASS — CONTROL caught: one extra mesh in the forest fails the cost check'); process.exit(0); }
  console.log('[speed] NOT A PASS — CONTROL not caught as expected'); process.exit(1); }
if(fails.length){ for(const f of fails) log('✗ '+f); console.log(`[speed] NOT A PASS — ${fails.length} problem(s)`); process.exit(1); }
console.log(`[speed] PASS — cost of ${res.cases.length} case(s) not above the baseline${COST_ONLY ? '' : '; time reported'}`);
