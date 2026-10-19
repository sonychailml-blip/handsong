/* UI SNAPSHOT — before/after proof for slices that must not change what the person sees (UI1b tokens + icons, DRAW1). Dev tool only.
     node tools/ui-snap.mjs --save <tag>                  capture → tools/.ui-snap/<tag>/ (styles.json, <screen>.png)
     node tools/ui-snap.mjs --compare <tagA> <tagB>       compare two captures (computed styles element by element, pixels)
     node tools/ui-snap.mjs --save <tag> --compare <tagA> capture, then compare tagA → tag
   Screens: start card, play (bar collapsed), play (bar shown), Scale / Sound / Looper panels, strip with the seed song, arrangement
   window, mixer face, track editor. Deterministic: a fixed camera picture (a generated one-frame .y4m Chrome loops as its fake camera),
   1280×800, animations disabled for screenshots, the auto-freeze watcher paused (as in the runner), the same clicks in the same order.
   Computed styles: every element's full computed style (custom properties `--*` excluded — they are the tokens themselves), keyed by its
   structural path. Pixels: PNG bytes equal → identical; otherwise decoded in the page and the differing pixels counted.
   Uses the runner's ideas (own static server on a free port, fresh profile, installed Chrome, fake media, --cdn-cache); never touches the
   person's browser data. Exit 0 when the compare finds zero differences (or only --save ran). */
import http from 'node:http';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT,'tools','.ui-snap'), CDN_DIR=path.join(ROOT,'tools','.cdn-cache');
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const SAVE=val('--save'), CMP=val('--compare'), CMP2=argv[argv.indexOf('--compare')+2]&&!argv[argv.indexOf('--compare')+2].startsWith('--') ? argv[argv.indexOf('--compare')+2] : null;
const ONLY=val('--only');   // comma list of screens
const CALM=argv.includes('--calm');   // RUN 7 (C6/C11): the Calm face's screens instead (a phone viewport, the page opened with ?calm)
const out=s=>console.log(s);
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
function serve(){
  const srv=http.createServer(async (q,r)=>{ try{ const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
    const f=path.join(ROOT,p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
    const b=await readFile(f); r.writeHead(200,{ 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }
    catch(e){ r.writeHead(404); r.end(); } });
  return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res(srv)));
}
async function cdnCache(ctx){   // the runner's --cdn-cache files (fetched there once); fetched here too when missing
  await mkdir(CDN_DIR,{ recursive:true }); const keyOf=u=>Buffer.from(u).toString('base64url').slice(-120);
  await ctx.route(/^https:\/\/(cdn\.jsdelivr\.net\/npm\/@mediapipe|storage\.googleapis\.com\/mediapipe-models)\//, async route=>{
    const u=route.request().url(), f=path.join(CDN_DIR,keyOf(u));
    try{ const meta=JSON.parse(await readFile(f+'.json','utf8')); return route.fulfill({ status:200, headers:meta.headers, body:await readFile(f) }); }catch(e){}
    const r=await route.fetch({ timeout:0 }), body=await r.body(), h=r.headers(), headers={ 'content-type':h['content-type']||'application/octet-stream', 'access-control-allow-origin':'*' };
    if(r.status()===200){ await writeFile(f,body); await writeFile(f+'.json',JSON.stringify({ url:u, headers })); }
    return route.fulfill({ status:r.status(), headers, body }); });
}
/* one 640×480 frame (4:2:0): a soft diagonal gradient — a fixed camera picture */
async function fakeVideo(){
  const W=640, H=480, f=path.join(OUT,'fake.y4m'), Y=Buffer.alloc(W*H), C=Buffer.alloc(W*H/4,128);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) Y[y*W+x]=40+Math.round(60*(x/W+y/H)/2);
  await mkdir(OUT,{ recursive:true });
  await writeFile(f, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`), Buffer.from('FRAME\n'), Y, C, C]));
  return f;
}
/* in the page: every element's computed style keyed by its structural path; styles deduplicated */
const STYLES_FN=()=>{
  const pathOf=el=>{ const p=[]; for(let e=el;e&&e.nodeType===1;e=e.parentElement){ if(e.id){ p.unshift('#'+e.id); break; }
    const par=e.parentElement; p.unshift(e.tagName.toLowerCase()+(par?':'+([...par.children].indexOf(e)+1):'')); } return p.join('>'); };
  const props=[...getComputedStyle(document.documentElement)].filter(n=>!n.startsWith('--')).sort();
  const table=[], idx=new Map(), els={};
  for(const el of document.querySelectorAll('*')){ if(el.closest('svg')&&el.tagName!=='svg') continue;
    for(const pseudo of ['', '::before', '::after']){ const cs=getComputedStyle(el, pseudo||null);
      if(pseudo && (cs.content==='none'||cs.content==='normal')) continue;
      const v=props.map(n=>cs.getPropertyValue(n)), k=v.join('\u0001'); let i=idx.get(k); if(i==null){ i=table.length; table.push(v); idx.set(k,i); }
      els[pathOf(el)+pseudo]={ s:i, t:el.children.length?null:(el.textContent||'').slice(0,60), cls:el.className&&el.className.baseVal==null?el.className:'' }; } }
  return { props, table, els };
};
const reveal=async p=>{ await p.mouse.move(600,380); await p.mouse.move(640,400); await p.waitForTimeout(150); };   // the top bar hides itself after ~3.5 s
const SCREENS=[
  ['start',     async p=>{}],
  ['play-min',  async p=>{ await p.click('#startBtn'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
                   await p.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', true); }); await p.mouse.move(5,790); await p.waitForTimeout(5000); }],
  ['play-bar',  async p=>{ await p.mouse.move(640,400); await p.mouse.move(660,420); await p.waitForTimeout(400); }],
  ['scale',     async p=>{ await reveal(p); await p.click('#scaleBtn'); await p.waitForTimeout(400); }],
  ['sound',     async p=>{ await p.click('#panelClose'); await reveal(p); await p.click('#soundBtn'); await p.waitForTimeout(400); }],
  ['loop',      async p=>{ await p.click('#panelCloseSound'); await reveal(p); await p.click('#loopPanelBtn'); await p.waitForTimeout(400); }],
  ['strip',     async p=>{ await p.click('#panelCloseLoop'); await p.evaluate(async ()=>{ await P.seed({ replace:true }); });
                   await p.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', true); }); await p.mouse.move(640,400); await p.mouse.move(660,420); await p.waitForTimeout(600); }],
  ['arr',       async p=>{ await p.evaluate(async ()=>{ const UI=await import('./src/ui.js'); UI.arrApi.open(); }); await p.waitForTimeout(600); }],
  ['mix',       async p=>{ await p.click('#arrFace'); await p.waitForTimeout(600); }],
  ['roll',      async p=>{ await p.click('#arrFace'); await p.evaluate(async ()=>{ const UI=await import('./src/ui.js'); UI.arrApi.openTrack(0); }); await p.waitForTimeout(800); }],
];
/* RUN 7: the CALM screens — a phone in portrait (390 × 844), then landscape (844 × 390); Dark background (no WebGL: deterministic pixels),
   then the Camera background (the glass over a picture); the ⓘ card; the same in Russian. The shell shows
   its controls with no hand in view (the fake camera has none) after 1.5 s. */
const calmWait=async p=>{ await p.waitForTimeout(2200); };
const SCREENS_CALM=[
  ['calm-start',     async p=>{}],
  ['calm-ghost',     async p=>{ await p.click('#calmBegin');   // C7: Begin (the first run: the ghost light plays four notes)
                       await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
                       await p.evaluate(async ()=>{ const Q=await import('./src/frzqueue.js'); Q.afPause('runner', true); const b=document.getElementById('calmBg'); let k=0; while(!/Dark|Тём/.test(b.textContent) && k++<4) b.click(); }); await p.waitForTimeout(5500); }],
  ['calm-dark',      async p=>{ await p.waitForFunction(async ()=>{ const G=await import('./src/ghost.js'); return !G.ghostOn(); }, null, { timeout:30e3, polling:250 }); await p.waitForTimeout(1800); }],
  ['calm-info',      async p=>{ await p.click('#calmInfoBtn'); await p.waitForTimeout(500); }],
  ['calm-land',      async p=>{ await p.click('#calmInfoClose'); await p.setViewportSize({ width:844, height:390 }); await calmWait(p); }],
  ['calm-land-info', async p=>{ await p.click('#calmInfoBtn'); await p.waitForTimeout(500); }],
  ['calm-camera',    async p=>{ await p.click('#calmInfoClose'); await p.setViewportSize({ width:390, height:844 });   // the glass over a picture (headless screenshots do not show the WebGL forest)
                       await p.evaluate(()=>{ const b=document.getElementById('calmBg'); let k=0; while(!/Camera|Камер/.test(b.textContent) && k++<4) b.click(); }); await calmWait(p); }],
  ['calm-ru',        async p=>{ await p.evaluate(async ()=>{ const I=await import('./src/i18n.js'); I.setLang('ru'); const b=document.getElementById('calmBg'); let k=0; while(!/Тём/.test(b.textContent) && k++<4) b.click(); }); await calmWait(p); }],
  ['calm-ru-info',   async p=>{ await p.click('#calmInfoBtn'); await p.waitForTimeout(500); }],
  /* RUN 8 (addendum 3): the low-light message with «Raise a hand» (Russian: the longer lines) — portrait and landscape; every visible message
     at the top must stand clear of the others (printed; a touch counts in the run's result) */
  ['calm-msg-ru',    async p=>{ await p.click('#calmInfoClose'); await p.evaluate(async ()=>{ const M=await import('./src/latmeter.js'); M.darkDbg(Array.from({ length:80 }, (_,i)=>i*100), 30); }); await calmWait(p); await msgCheck(p,'calm-msg-ru'); }],
  ['calm-msg-land',  async p=>{ await p.setViewportSize({ width:844, height:390 }); await calmWait(p); await msgCheck(p,'calm-msg-land'); }],
  /* RUN 8 (slice 3, addendum 1 and 5): playing — two synthetic hands through the probe's door (the playing right hand pinching its index, the
     effects hand its middle finger): the fingertip fireflies, the quiet glow on the row, the depth bar and the three effect bars */
  ['calm-play-land', async p=>{ await p.evaluate(async ()=>{ const M=await import('./src/latmeter.js'); M.darkHideDbg(); }); await playHands(p); }],
  ['calm-play',      async p=>{ await p.setViewportSize({ width:390, height:844 }); await playHands(p); }],
  /* RUN 8 (slice 4): the forest picture behind the playing hands (WebGL with screen-blended lights; the room renders at its own rate) */
  ['calm-forest',    async p=>{ await p.evaluate(()=>{ const b=document.getElementById('calmBg'); let k=0; while(!/Forest|Лес/.test(b.textContent) && k++<4) b.click(); }); await p.waitForTimeout(2500); await playHands(p); await p.waitForTimeout(800); }],
  ['calm-forest-land', async p=>{ await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1500); await playHands(p); await p.waitForTimeout(800); }],
];
/* the top messages: no two visible ones overlap */
async function msgCheck(p, name){
  const r=await p.evaluate(()=>{ const vis=e=>{ if(!e) return false; const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false; for(let q=e.parentElement;q;q=q.parentElement){ const k=getComputedStyle(q); if(k.display==='none'||+k.opacity===0) return false; } return true; };
    const els=['darkHint','calmIdle','calmFxHint','calmFxBars','calmForestBar'].map(id=>document.getElementById(id)).filter(vis), R=els.map(e=>[e.id, e.getBoundingClientRect()]), hits=[];
    const bar=id=>/Bar/.test(id);   // the two bar sets may sit side by side; a message may touch neither
    for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ if(bar(R[i][0])&&bar(R[j][0])) continue; const a=R[i][1], b=R[j][1]; if(!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)) hits.push(R[i][0]+' × '+R[j][0]); }
    return { shown:R.map(x=>x[0]), hits }; });
  out(`[ui-snap] ${name}: messages shown ${r.shown.join(', ')||'none'} — ${r.hits.length ? 'OVERLAP '+r.hits.join(', ') : 'no overlap'}`); if(r.hits.length) msgHits.push(name+': '+r.hits.join(', '));
}
const msgHits=[];
async function playHands(p){
  await p.evaluate(async ()=>{ const G=await import('./src/gestures.js'), PO=await import('./src/gestures/pose.js'), V=await import('./src/vision.js');
    G.handsProbe(null); const clk={ t:5e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true);
    for(let i=0;i<14;i++){ clk.t+=1000/30; const up=Math.min(1,i/10);
      G.processHandsProbe({ landmarks:[PO.pose({ x:0.72, y:0.52, s:0.22, gaps:[0.05,1,1,1] }), PO.pose({ x:0.26, y:0.55-0.18*up, s:0.2, gaps:[1,0.05,1,1] })], handednesses:[[{ categoryName:'Right' }],[{ categoryName:'Left' }]] }); } });
  await p.waitForTimeout(700); await msgCheck(p, 'play '+p.viewportSize().width+'×'+p.viewportSize().height);
}
async function capture(tag){
  const dir=path.join(OUT,tag); await mkdir(dir,{ recursive:true });
  const srv=await serve(), port=srv.address().port, y4m=await fakeVideo();
  const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
    `--use-file-for-fake-video-capture=${y4m}`,'--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--hide-scrollbars'] });
  const res={ tag, screens:{} };
  try{
    const ctx=await browser.newContext({ viewport: CALM ? { width:390, height:844 } : { width:1280, height:800 }, deviceScaleFactor: CALM ? 2 : 1, locale:'en-US' });
    await ctx.grantPermissions(['camera','microphone'],{ origin:`http://127.0.0.1:${port}` }); await cdnCache(ctx);
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.lang','en'); }catch(e){} });
    const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
    await page.goto(`http://127.0.0.1:${port}/index.html?probe${CALM?'&calm':''}`);
    await page.waitForFunction(()=>window.P && window.R, null, { timeout:60e3 }); await page.waitForTimeout(800);
    for(const [name,act] of (CALM ? SCREENS_CALM : SCREENS)){
      await act(page);
      if(ONLY && !ONLY.split(',').includes(name)) continue;
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const st=await page.evaluate(STYLES_FN), png=await page.screenshot({ animations:'disabled', caret:'hide' });
      await writeFile(path.join(dir,name+'.png'), png); res.screens[name]=st;
      out(`[ui-snap] ${tag} · ${name}: ${Object.keys(st.els).length} elements, ${st.table.length} distinct styles`);
    }
    res.errors=errs; if(errs.length) out(`[ui-snap] page errors: ${errs.slice(0,5).join(' | ')}`);
    await writeFile(path.join(dir,'styles.json'), JSON.stringify(res));
  } finally { await browser.close().catch(()=>{}); srv.close(); }
}
async function compare(a,b){
  const A=JSON.parse(await readFile(path.join(OUT,a,'styles.json'),'utf8')), B=JSON.parse(await readFile(path.join(OUT,b,'styles.json'),'utf8'));
  let total=0; const browser=await chromium.launch({ channel:'chrome', headless:true }); const page=await browser.newPage();
  try{
    for(const name of Object.keys(A.screens)){ const sa=A.screens[name], sb=B.screens[name]; if(!sb){ out(`[ui-snap] ${name}: missing in ${b}`); total++; continue; }
      const diffs=[], onlyA=[], onlyB=[];
      for(const [k,ea] of Object.entries(sa.els)){ if(k.startsWith('html>head')) continue; const eb=sb.els[k]; if(!eb){ onlyA.push(k); continue; }
        const va=sa.table[ea.s], vb=sb.table[eb.s];
        sa.props.forEach((p,i)=>{ const j=sb.props.indexOf(p); const x=va[i], y=j>=0?vb[j]:'(no property)'; if(x!==y) diffs.push(`${k} ${p}: ${x} → ${y}`); });
        if(ea.t!==eb.t) diffs.push(`${k} text: ${JSON.stringify(ea.t)} → ${JSON.stringify(eb.t)}`); }
      for(const k of Object.keys(sb.els)) if(!sa.els[k] && !k.startsWith('html>head')) onlyB.push(k);   // <head> is not rendered
      const pa=await readFile(path.join(OUT,a,name+'.png')), pb=await readFile(path.join(OUT,b,name+'.png'));
      let px=0; if(!pa.equals(pb)) px=await page.evaluate(async ([x,y])=>{ const load=s=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src='data:image/png;base64,'+s; });
        const [ia,ib]=await Promise.all([load(x),load(y)]); if(ia.width!==ib.width||ia.height!==ib.height) return -1;
        const c=document.createElement('canvas'); c.width=ia.width; c.height=ia.height; const g=c.getContext('2d');
        g.drawImage(ia,0,0); const da=g.getImageData(0,0,c.width,c.height).data; g.clearRect(0,0,c.width,c.height); g.drawImage(ib,0,0); const db=g.getImageData(0,0,c.width,c.height).data;
        let n=0; for(let i=0;i<da.length;i+=4) if(da[i]!==db[i]||da[i+1]!==db[i+1]||da[i+2]!==db[i+2]||da[i+3]!==db[i+3]) n++; return n; }, [pa.toString('base64'), pb.toString('base64')]);
      const n=diffs.length+onlyA.length+onlyB.length+(px?1:0); total+=n;
      out(`[ui-snap] ${name}: ${Object.keys(sa.els).length} elements · style differences ${diffs.length} · only in ${a} ${onlyA.length} · only in ${b} ${onlyB.length} · pixels differing ${px<0?'(size changed)':px}`);
      for(const d of [...diffs.slice(0,12), ...onlyA.slice(0,5).map(k=>'only in '+a+': '+k), ...onlyB.slice(0,5).map(k=>'only in '+b+': '+k)]) out('    '+d);
    }
  } finally { await browser.close().catch(()=>{}); }
  out(`[ui-snap] ${total?'DIFFERENCES — '+total:'IDENTICAL'} (${a} → ${b})`);
  return total;
}
if(SAVE) await capture(SAVE);
let code=0;
if(SAVE && CALM){ out(msgHits.length ? '[ui-snap] Calm messages: OVERLAP — '+msgHits.join(' · ') : '[ui-snap] Calm messages: no overlap on any screen'); if(msgHits.length) code=1; }   // RUN 8 (addendum 3)
if(CMP){ const [a,b]= CMP2 ? [CMP,CMP2] : [CMP,SAVE]; if(!b){ out('[ui-snap] --compare needs two tags (or --save)'); process.exit(2); } code= (await compare(a,b)) ? 1 : 0; }
if(!SAVE&&!CMP){ out('usage: node tools/ui-snap.mjs --save <tag> [--compare <tagA>] | --compare <tagA> <tagB>'); const t=await readdir(OUT).catch(()=>[]); out('captures: '+t.join(', ')); }
process.exit(code);
