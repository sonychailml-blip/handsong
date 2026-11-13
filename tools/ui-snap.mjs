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
import { toNew, toOldScreen } from './split-names.mjs';   // SPLIT-2: the baseline was recorded under the old names
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT,'tools','.ui-snap'), CDN_DIR=path.join(ROOT,'tools','.cdn-cache');
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const SAVE=val('--save'), CMP=val('--compare'), CMP2=argv[argv.indexOf('--compare')+2]&&!argv[argv.indexOf('--compare')+2].startsWith('--') ? argv[argv.indexOf('--compare')+2] : null;
const NOISY=new Set((val('--noisy')||'').split(',').filter(Boolean));   // SPLIT-2: screens that differ between two captures of identical code (animation, WebGL): compared by structure only
const ONLY=val('--only');   // comma list of screens
const FOREST=argv.includes('--forest');   // RUN 9: the forest's own screens (GPU capture, the Night face)
const TINT_DEMO=argv.includes('--tint-demo');   // DESIGN-1: the interface's tint in the forest and in the dev test room (warm amber), the same screens
const REVEAL=argv.includes('--reveal');   // DESIGN-1 part D: the start still and the reveal held at fixed moments (apps/night/still.js stillDbg pin)
const N13=val('--n13'), N13_OLD=argv.includes('--n13-old');   // NIGHT-13: 'all' | 'match' — the polish's screens; --n13-old: today's way where the app can still show it (DESIGN-1's still fit, the coaching line's old width, the light on thumb and index)
const VIEWPORT=val('--viewport');   // NIGHT-13: the first viewport, «WxH»
const NIGHT=argv.includes('--night') || FOREST || TINT_DEMO || REVEAL || !!N13;   // RUN 7 (C6/C11): the Night face's screens instead (a phone viewport, the page apps/night/)
const DPR=+val('--dpr')||0;   // NIGHT-11: the device pixel ratio of the capture (a mid phone is about 2.75; default 2 on the Night screens, 1 elsewhere)
const LEVEL=val('--level');   // NIGHT-8: the forest's picture level for the capture (full = Detailed, reduced = Standard; stored before the page loads)
const TINT=val('--tint');   // NIGHT-8c: diagnosis — canvas tokens replaced before the page reads them ('forest-lichen=#ff00ff,forest-moss=#00ffff')
const LAPTOP=argv.includes('--laptop');   // DESIGN-1: the Night screens at laptop sizes — the phone portrait 390×844 becomes 1280×800, the phone landscape 844×390 becomes 1024×600 (DPR 1)
const VP_LAPTOP={ '390x844':{ width:1280, height:800 }, '844x390':{ width:1024, height:600 } };
const GROUND=val('--ground');   // NIGHT-9: 'baked' | 'scan' — which bare floor the forest draws (the user's comparison; forest.js forestGroundDbg, set before the room opens)
const out=s=>console.log(s);
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.mp3':'audio/mpeg' };
const SERVE=val('--root') ? path.resolve(val('--root')) : ROOT;   // DESIGN-1: serve a frozen copy of the tree (a second capture of unchanged code while the tree is edited)
function serve(){
  const srv=http.createServer(async (q,r)=>{ try{ const u=new URL(q.url,'http://x'); let p=decodeURIComponent(u.pathname); if(p.endsWith('/')) p+='index.html';
    const f=path.join(SERVE,p); if(!f.startsWith(SERVE)){ r.writeHead(403); r.end(); return; }
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
/* RUN 8: the top bar hides itself 3.5 s after the last move — on a slow machine a long step (the song's seed) outlasts it; the CAPTURE waits until
   the bar is really open (never the app) */
const BAR_KEEP=new Set(['play-bar','strip','arr']);   // the screens whose top bar must be open (as captured at RUN 7)
const barOpen=async p=>{ for(let k=0;k<5;k++){ await reveal(p); if(await p.evaluate(()=>!document.getElementById('bar').classList.contains('min'))) break; } await p.mouse.move(660,420); await p.waitForTimeout(300); };   // ends where the steps always left the mouse (hover)
const SCREENS=[
  ['start',     async p=>{}],
  ['play-min',  async p=>{ await p.click('#startBtn'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
                   await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); }); await p.mouse.move(5,790); await p.waitForTimeout(5000); }],
  ['play-bar',  async p=>{ await p.mouse.move(640,400); await p.mouse.move(660,420); await p.waitForTimeout(400); }],
  ['scale',     async p=>{ await reveal(p); await p.click('#scaleBtn'); await p.waitForTimeout(400); }],
  ['sound',     async p=>{ await p.click('#panelClose'); await reveal(p); await p.click('#soundBtn'); await p.waitForTimeout(400); }],
  ['loop',      async p=>{ await p.click('#panelCloseSound'); await reveal(p); await p.click('#loopPanelBtn'); await p.waitForTimeout(400); }],
  ['strip',     async p=>{ await p.click('#panelCloseLoop'); await p.evaluate(async ()=>{ await P.seed({ replace:true }); });
                   await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); }); await p.mouse.move(640,400); await p.mouse.move(660,420); await p.waitForTimeout(600);  await barOpen(p); }],
  ['arr',       async p=>{ await barOpen(p); await p.evaluate(async ()=>{ const UI=await import('/core/legacy-ui/ui.js'); UI.arrApi.open(); }); await p.waitForTimeout(600); }],
  ['mix',       async p=>{ await p.click('#arrFace'); await p.waitForTimeout(600); }],
  ['roll',      async p=>{ await p.click('#arrFace'); await p.evaluate(async ()=>{ const UI=await import('/core/legacy-ui/ui.js'); UI.arrApi.openTrack(0); }); await p.waitForTimeout(800); }],
];
/* RUN 7: the NIGHT screens — a phone in portrait (390 × 844), then landscape (844 × 390); Dark background (no WebGL: deterministic pixels),
   then the Camera background (the glass over a picture); the ⓘ card; the same in Russian. The shell shows
   its controls with no hand in view (the fake camera has none) after 1.5 s. */
const nightWait=async p=>{ await p.waitForTimeout(2200); };
/* NIGHT-3 stage 5: the settings card scrolled to a share of its height (0 top, 1 end), so every section is seen */
const cardTo=async (p, f)=>{ await p.evaluate(f=>{ const c=document.getElementById('nightInfo'); c.scrollTop=Math.round(f*(c.scrollHeight-c.clientHeight)); }, f); await p.waitForTimeout(150); };
/* DESIGN-1 part C: the settings' tabs — a tab shown (an older capture with «More»: it is opened); a page without tabs does nothing here */
const tabTo=async (p, name, more=true)=>{ await p.evaluate(([n,m])=>{ const b=document.querySelector(`#nightSetTabs [data-tab="${n}"]`); if(!b) return; b.click();
  for(const x of document.querySelectorAll('#nightInfo .night-more')){ const open=x.getAttribute('aria-expanded')==='true', want=m && !!x.closest(`[data-pane="${n}"]`); if(open!==want) x.click(); }
  const c=document.getElementById('nightInfo'); c.scrollTop=0; }, [name, more]); await p.waitForTimeout(250); };
const SCREENS_NIGHT=[
  ['night-start',     async p=>{}],
  ['night-offer',     async p=>{ await p.click('#nightBegin'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 }); await p.waitForTimeout(1500); }],   // NIGHT-11: Begin → the coaching line «Raise a hand» (no offer, no card first)
  ['night-cards',     async p=>{   // NIGHT-11: the cards from Settings → How to play (a first run shows none)
                       await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); document.querySelector('#nightBgSeg [data-bg="dark"]').click(); document.getElementById('nightInfoBtn').click(); document.getElementById('nightHowTo').click(); });
                       await p.evaluate(async ()=>{ window.__cards=await import('/apps/night/cards.js'); }); await p.waitForFunction(()=>window.__cards.cardsOpen(), null, { timeout:30e3, polling:250 }); await p.waitForTimeout(600); }],   // NIGHT-13: a synchronous predicate (Playwright does not await a predicate's promise: the async one was truthy at once)
  ['night-dark',      async p=>{ for(let k=0;k<4;k++) await p.click('#nightCardNext'); await p.waitForTimeout(1800); }],   // the last «Play» closes them
  ['night-info',      async p=>{ await p.click('#nightInfoBtn'); await p.waitForTimeout(500); }],
  ['night-info-mid',  async p=>{ await cardTo(p, 0.5); }],
  ['night-info-end',  async p=>{ await cardTo(p, 1); }],
  ['night-info-picture', async p=>{ await tabTo(p, 'picture'); }],
  ['night-info-hands', async p=>{ await tabTo(p, 'hands'); }],
  ['night-info-hands-end', async p=>{ await cardTo(p, 1); await tabTo(p, 'sound', false); }],
  ['night-land',      async p=>{ await p.click('#nightInfoClose'); await p.setViewportSize({ width:844, height:390 }); await nightWait(p); }],
  ['night-land-info', async p=>{ await p.click('#nightInfoBtn'); await p.waitForTimeout(500); await cardTo(p, 0); }],
  ['night-land-info-mid', async p=>{ await cardTo(p, 0.5); }],
  ['night-land-info-end', async p=>{ await cardTo(p, 1); }],
  ['night-land-info-picture', async p=>{ await tabTo(p, 'picture'); }],
  ['night-land-info-hands', async p=>{ await tabTo(p, 'hands'); }],
  ['night-land-info-hands-end', async p=>{ await cardTo(p, 1); await tabTo(p, 'sound', false); }],
  ['night-camera',    async p=>{ await p.click('#nightInfoClose'); await p.setViewportSize({ width:390, height:844 });   // the glass over a picture (headless screenshots do not show the WebGL forest)
                       await p.evaluate(()=>{ document.querySelector('#nightBgSeg [data-bg="camera"]').click(); }); await nightWait(p); }],
  ['night-ru',        async p=>{ await p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); I.setLang('ru'); document.querySelector('#nightBgSeg [data-bg="dark"]').click(); }); await nightWait(p); }],
  ['night-ru-info',   async p=>{ await p.click('#nightInfoBtn'); await p.waitForTimeout(500); await cardTo(p, 0); }],
  ['night-ru-info-mid', async p=>{ await cardTo(p, 0.5); }],
  ['night-ru-info-end', async p=>{ await cardTo(p, 1); }],
  ['night-ru-info-picture', async p=>{ await tabTo(p, 'picture'); }],
  ['night-ru-info-hands', async p=>{ await tabTo(p, 'hands'); await tabTo(p, 'sound', false); await tabTo(p, 'hands'); }],
  ['night-ru-land-info', async p=>{ await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(600); await cardTo(p, 0); }],
  ['night-ru-land-info-mid', async p=>{ await cardTo(p, 0.5); }],
  ['night-ru-land-info-end', async p=>{ await cardTo(p, 1); }],
  ['night-ru-land-info-picture', async p=>{ await tabTo(p, 'picture'); }],
  ['night-ru-land-info-hands', async p=>{ await tabTo(p, 'hands'); }],
  ['night-ru-land-info-hands-end', async p=>{ await cardTo(p, 1); await tabTo(p, 'sound', false); }],
  /* RUN 8 (addendum 3): the low-light message with «Raise a hand» (Russian: the longer lines) — portrait and landscape; every visible message
     at the top must stand clear of the others (printed; a touch counts in the run's result) */
  ['night-msg-ru',    async p=>{ await p.click('#nightInfoClose'); await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(400); await p.evaluate(async ()=>{ const M=await import('/core/legacy-ui/latmeter.js'); M.darkDbg(Array.from({ length:80 }, (_,i)=>i*100), 30); }); await nightWait(p); await msgCheck(p,'night-msg-ru'); }],
  ['night-msg-land',  async p=>{ await p.setViewportSize({ width:844, height:390 }); await nightWait(p); await p.evaluate(async ()=>{ const M=await import('/core/legacy-ui/latmeter.js'); M.darkDbg(Array.from({ length:80 }, (_,i)=>i*100), 30); });  /* SPLIT-2: a fresh HINT_MS (9 s): the capture itself takes about that long */ await msgCheck(p,'night-msg-land'); }],
  /* RUN 8 (slice 3, addendum 1 and 5): playing — two synthetic hands through the probe's door (the playing right hand pinching its index, the
     effects hand its middle finger): the fingertip fireflies, the quiet glow on the row, the depth bar and the three effect bars */
  ['night-play-land', async p=>{ await p.evaluate(async ()=>{ const M=await import('/core/legacy-ui/latmeter.js'); M.darkHideDbg(); }); await playHands(p); }],
  ['night-play',      async p=>{ await p.setViewportSize({ width:390, height:844 }); await p.waitForFunction(w=>innerWidth===w && (document.getElementById('canvas')||document.querySelector('canvas')).width===w, p.viewportSize().width, { timeout:30e3 });   /* DESIGN-1: the 2D canvas by id (the forest's #scene canvas comes first in the page once a room opened) */ await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); await playHands(p); }],  /* SPLIT-2: the hands read the canvas size and the per-frame cover rect: wait for the resize */
  /* RUN 8 (slice 4): the forest picture behind the playing hands (WebGL with screen-blended lights; the room renders at its own rate) */
  ['night-forest',    async p=>{ await p.evaluate(()=>{ document.querySelector('#nightBgSeg [data-bg="forest"]').click(); }); await p.waitForTimeout(2500); await playHands(p); await p.waitForTimeout(800); }],
  ['night-forest-land', async p=>{ await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1500); await playHands(p); await p.waitForTimeout(800); }],
  ['night-cal-land',  async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); const C=await import('/apps/night/calib.js'); C.calStep(); }); await p.waitForTimeout(1200); }],   // NIGHT-2
  ['night-cal',       async p=>{ await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(1200); }],
  ['night-cal-fail',  async p=>{ await p.evaluate(async ()=>{ window.__calib=await import('/apps/night/calib.js'); }); await p.waitForFunction(()=>window.__calib.calDbg.state().mode==='fail', null, { timeout:30e3, polling:250 }); await p.waitForTimeout(400); }],   // NIGHT-13: synchronous, as above
  ['night-cal-fail-land', async p=>{ await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(800); }],
];
/* DESIGN-1: --tint-demo — the same interface in two rooms: the forest (lime) and the dev test room (?probe&testroom, its record's warm amber);
   Dark background (the interface alone), settings top and middle, the cards' first picture, the playing bars */
const tintRoom=async (p, id)=>{ await p.evaluate(async id=>{ const RS=await import('/apps/night/roomswitch.js'); await RS.roomSwitch(id, { fast:true }); }, id); await p.waitForTimeout(300); };
const tintSet=(tag)=>[
  [tag+'-settings',  async p=>{ await p.evaluate(()=>document.getElementById('nightInfoBtn').click()); await p.waitForTimeout(400); await cardTo(p, 0); }],
  [tag+'-settings-mid', async p=>{ await cardTo(p, 0.6); }],
  [tag+'-card',      async p=>{ await p.evaluate(async ()=>{ document.getElementById('nightInfoClose').click(); const C=await import('/apps/night/cards.js'); C.cardsShow(); }); await p.waitForTimeout(400); }],
  [tag+'-play',      async p=>{ await p.evaluate(()=>document.getElementById('nightCardSkip').click()); await p.waitForTimeout(300); await playHands(p, false); }],
];
const SCREENS_TINT=[
  ['tint-begin',     async p=>{ await p.click('#nightBegin'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
                       await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); document.querySelector('#nightBgSeg [data-bg="dark"]').click(); }); await p.waitForTimeout(1500); }],
  ...tintSet('tint-forest'),
  ['tint-to-test',   async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); }); await tintRoom(p, 'room.dev-test'); await p.waitForTimeout(1600); }],
  ...tintSet('tint-amber'),
];
/* DESIGN-1 part D: --reveal — the start screen with the room's still and its lights, then after Begin the reveal held at fixed points of its progress (the still
   pinned: the dot and the mask follow; the live forest keeps moving behind), then the live forest. The forest chosen (stored before the page loads). */
const revealPin=async (p, v)=>{ await p.evaluate(async v=>{ const S=await import('/apps/night/still.js'); S.stillDbg({ pin:v }); }, v); await p.waitForTimeout(350); };
const SCREENS_REVEAL=[
  ['rv-start',  async p=>{ await p.waitForTimeout(2500); }],
  ['rv-00',     async p=>{ await p.click('#nightBegin'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
                  await p.evaluate(async ()=>{ const S=await import('/apps/night/still.js'); S.stillDbg({ pin:0 }); const G=await import('/core/gestures.js'); G.handsProbe(null); });
                  await p.evaluate(async ()=>{ window.__still=await import('/apps/night/still.js'); }); await p.waitForFunction(()=>window.__still.stillDbg().readyAt!=null, null, { timeout:120e3, polling:200 }); await p.waitForTimeout(1200); await revealPin(p, 0); }],   // a synchronous wait: Playwright does not await a predicate's promise
  ...[20, 40, 60, 80, 95].map(k=>['rv-'+k, async p=>{ await revealPin(p, k/100); }]),
  ['rv-live',   async p=>{ await p.evaluate(async ()=>{ const S=await import('/apps/night/still.js'); S.stillDbg({ pin:null }); }); await p.waitForTimeout(3500); }],
];
/* NIGHT-13: --n13 all | match — the polish's screens on one page (the forest chosen, Standard): the still alone (the start card and its lights hidden) → the
   Begin tap's pulse (its peak and its held end) → the dot's flight, the reveal pinned at 0 … 73 % (the flight 0 … 100 %) → the live forest → the live forest
   alone with the camera at rest (as at the hand-over) and an EDGE OVERLAY of the two (the still's edges red, the live room's cyan, both white) → the hand's
   light with the index, the middle, the middle close → «All points» on Dark → the settings' three tabs → the phone on its side, playing, the calibration line
   (English, Russian). match: the still / live pair and the overlay only. --n13-old: ?probe&oldstill, the coaching line's old width and the bars' words kept,
   the light on thumb and index (sceneLitDbg off). Extra files: n13-match-edges.png, n13.json (the settings card's box per tab). */
const N13_HIDE_A='#start, #canvas, #video, #nightShell, #nightStillLights, #nightStillDot, #nightStillMist{ visibility:hidden !important; } /*n13-a*/';
const N13_HIDE_B='#start, #canvas, #video, #nightShell, #nightStill, #nightStillMist, #nightStillDot{ visibility:hidden !important; } /*n13-b*/';
const N13_OLD_CSS='#nightShell .night-coach{ max-width:min(560px, calc(100vw - 4 * var(--night-edge))) !important; } body.night-coach-on .night-bar-lab{ display:block !important; } /*n13-old*/';
const n13Drop=(p, t)=>p.evaluate(t=>{ for(const x of document.querySelectorAll('style')) if(x.textContent.includes(t)) x.remove(); }, t);
const n13Shot=async (p, name)=>{ await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); return p.screenshot({ animations:'disabled', caret:'hide' }); };
const n13Edges=async (p, a, b)=>p.evaluate(async ([a,b])=>{ const load=u=>new Promise((r,j)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=j; i.src='data:image/png;base64,'+u; });
  const [ia, ib]=await Promise.all([load(a), load(b)]), W=ia.width, H=ia.height, k=Math.max(1, Math.round(W/640)), w=Math.round(W/k), h=Math.round(H/k);
  const edges=img=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.drawImage(img,0,0,w,h); const d=g.getImageData(0,0,w,h).data, L=new Float32Array(w*h), E=new Float32Array(w*h);
    for(let i=0;i<w*h;i++) L[i]=Math.log(1+d[i*4]*0.3+d[i*4+1]*0.59+d[i*4+2]*0.11);
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const q=y*w+x, gx=L[q+1]-L[q-1], gy=L[q+w]-L[q-w]; E[q]=Math.hypot(gx,gy); }
    const s=[...E].sort((x,y)=>x-y), t=s[Math.floor(s.length*0.9)]||1e-6; return E.map(v=>Math.min(1, v/(t*1.6))); };
  const A=edges(ia), B=edges(ib), c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'), o=g.createImageData(w,h);
  for(let i=0;i<w*h;i++){ o.data[i*4]=Math.round(255*A[i]); o.data[i*4+1]=Math.round(255*B[i]); o.data[i*4+2]=Math.round(255*B[i]); o.data[i*4+3]=255; }
  g.putImageData(o,0,0); return c.toDataURL('image/png').split(',')[1]; }, [a.toString('base64'), b.toString('base64')]);
const n13Hands=async (p, gaps, dark=false)=>{ await p.evaluate(async ([gaps])=>{ const G=await import('/core/gestures.js'), PO=await import('/core/gestures/pose.js'), V=await import('/core/vision.js');
    G.handsProbe(null); const clk={ t:7e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true);
    for(let i=0;i<16;i++){ clk.t+=1000/30; G.processHandsProbe({ landmarks:[PO.pose({ x:0.66, y:0.5, s:0.3, gaps })], handednesses:[[{ categoryName:'Right' }]] }); } }, [gaps]); await p.waitForTimeout(650); };
let n13A=null; const n13Res={ card:{} };
const n13Card=async (p, tab)=>{ await p.click(`#nightSetTabs [data-tab="${tab}"]`); await p.waitForTimeout(250); n13Res.card[tab]=await p.evaluate(()=>{ const r=document.getElementById('nightInfo').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }); };
const SCREENS_N13_MATCH=[
  ['n13-match-still', async p=>{ await p.waitForTimeout(1500); await p.evaluate(async ()=>{ window.__st=await import('/apps/night/still.js'); window.__st.stillDbg({ freeze:true }); });
    await p.waitForFunction(old=>{ const d=window.__st.stillDbg(); return !!d.fit && (old || d.overDrawn>0); }, N13_OLD, { timeout:20e3 });
    await p.addStyleTag({ content:N13_HIDE_A }); n13A=await n13Shot(p); }],
  /* the tap's look on the emblem, shown before the tap (a cached start ends within a frame or two, the card gone before a shot): the very class the tap adds */
  ['n13-tap-peak', async p=>{ await n13Drop(p, 'n13-a'); await p.evaluate(()=>document.querySelector('.night-start-head .emblem-glow').classList.add('night-dot-pulse'));   // held at its peak (45 % of 520 ms)
    await p.addStyleTag({ content:'.night-start-head .emblem-glow.night-dot-pulse{ animation-play-state:paused !important; animation-delay:-234ms !important; } /*n13-peak*/' }); await p.waitForTimeout(150); }],
  ['n13-tap-held', async p=>{ await n13Drop(p, 'n13-peak'); await p.waitForTimeout(700); }],
  ['n13-fly-0', async p=>{ await p.evaluate(()=>document.querySelector('.night-start-head .emblem-glow').classList.remove('night-dot-pulse')); await p.click('#nightBegin'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 });
    await p.evaluate(async ()=>{ window.__st.stillDbg({ pin:0 }); const G=await import('/core/gestures.js'); G.handsProbe(null); });
    await p.waitForFunction(()=>window.__st.stillDbg().readyAt!=null, null, { timeout:120e3, polling:200 }); await p.waitForTimeout(1200); await revealPin(p, 0); }],
  ...[1,2,3,4,5,6].map(k=>['n13-fly-'+k, async p=>{ await revealPin(p, Math.round(k*0.73/6*1000)/1000); }]),
  ['n13-live', async p=>{ await p.evaluate(()=>window.__st.stillDbg({ pin:null })); await p.waitForFunction(()=>window.__st.stillDbg().phase==='done', null, { timeout:30e3, polling:50 });
    await p.evaluate(async old=>{ if(!old) (await import('/apps/night/scene/host.js')).sceneRest(true); }, N13_OLD); await p.waitForTimeout(300); }],
  ['n13-match-live', async p=>{ await p.addStyleTag({ content:N13_HIDE_B }); const b=await n13Shot(p); if(n13A) await writeFile(path.join(OUT, SAVE, 'n13-match-edges.png'), Buffer.from(await n13Edges(p, n13A, b), 'base64')); }],
];
const SCREENS_N13=[...SCREENS_N13_MATCH,
  ['n13-light-index', async p=>{ await n13Drop(p, 'n13-b'); await p.evaluate(async old=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRest(false); H.sceneLitDbg({ off:old }); }, N13_OLD); await n13Hands(p, [0.55, 1.1, 1.2, 1.3]); }],
  ['n13-light-middle', async p=>{ await n13Hands(p, [0.75, 0.3, 1.2, 1.3]); }],
  ['n13-light-close', async p=>{ await n13Hands(p, [0.8, 0.22, 1.2, 1.3]); }],
  ['n13-points', async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); document.querySelector('#nightBgSeg [data-bg="dark"]').click(); document.getElementById('nightInfoBtn').click(); });
    await p.waitForTimeout(300); await p.evaluate(()=>{ const b=document.querySelector('#nightSetTabs [data-tab="hands"]'); if(b) b.click(); document.querySelector('#nightDotsSeg [data-dots="all"]').click(); document.getElementById('nightInfoClose').click(); });
    await p.waitForTimeout(400); await n13Hands(p, [0.5, 0.9, 1.1, 1.25]); }],
  ['n13-set-sound', async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); document.querySelector('#nightDotsSeg [data-dots="tips"]').click(); document.getElementById('nightInfoBtn').click(); }); await p.waitForTimeout(500); await n13Card(p, 'sound'); }],
  ['n13-set-picture', async p=>{ await n13Card(p, 'picture'); }],
  ['n13-set-hands', async p=>{ await n13Card(p, 'hands'); await writeFile(path.join(OUT, SAVE, 'n13.json'), JSON.stringify(n13Res)); }],
  ['n13-coach-land', async p=>{ await p.click('#nightInfoClose'); await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(800); if(N13_OLD) await p.addStyleTag({ content:N13_OLD_CSS });
    await p.evaluate(async ()=>{ window.__co=await import('/apps/night/coach.js'); }); await playHands(p, false); await p.evaluate(()=>window.__co.coachShowDbg('calib')); await p.waitForTimeout(200); }],
  ['n13-coach-land-ru', async p=>{ await p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); I.setLang('ru'); }); await playHands(p, false); await p.evaluate(()=>window.__co.coachShowDbg('fingers')); await p.waitForTimeout(200); }],
];
/* RUN 9: THE FOREST'S SCREENS (--forest; headless Chrome renders the WebGL room) — Begin, the Forest background, the two hands playing; then
   moments of the night through the probe clock (host sceneClockDbg): the clear moon, a cloud over it, the moods, the deep-sleep night;
   portrait 390 × 844 and landscape 844 × 390. Each slice adds its screens here. */
const forestAt=async (p, sec)=>{ await p.evaluate(async s=>{ const H=await import('/apps/night/scene/host.js'); H.sceneClockDbg(s); }, sec); };
const moodTo=async (p, re)=>{ await p.evaluate(src=>{ const b=document.getElementById('nightMood'), r=new RegExp(src); let k=0; while(!r.test(b.textContent) && k++<4) b.click(); }, re); };
/* slice 2: notes through the room (its glint, as the bus does) — n notes every `every` ms; fx: [[effect id, parameter index, 0…1]] set first */
const roomNotes=async (p, n, every, fx)=>{ await p.evaluate(async ([n,every,fx])=>{ const H=await import('/apps/night/scene/host.js'), A=await import('/core/audio.js'), S=await import('/core/state.js');
  if(fx) for(const [id,i,v] of fx){ const I=A.fxInstance(S.chainKeyOf('ld'), id); if(I && I.params[i]) I.params[i].setNorm(v); }
  const R=H.sceneRoomDbg(); for(let k=0;k<n;k++){ if(R) R.glint(0, 0.85); await new Promise(r=>setTimeout(r, every)); } }, [n, every, fx||null]); };
const closeView=async (p, pos, look, lv=null)=>{ await p.evaluate(async ([pos,look,lv])=>{ const H=await import('/apps/night/scene/host.js'), G=await import('/core/gestures.js'); G.handsProbe(null);
  const o=H.sceneOptDbg(), same=o && o.scale===1 && JSON.stringify(o.lv||null)===JSON.stringify(lv); if(!same){ H.sceneOptDbg({ scale:1, lv }); await H.setSceneLevel(H.sceneLevel()); } H.sceneClockDbg(60); H.sceneRoomDbg().viewDbg({ pos, look }); }, [pos, look, lv]); await p.waitForTimeout(2200); };
/* NIGHT-8c: the playing light held still in front of the view (a held note), as on the person's screen */
const trunkLight=async (p, x=0.72, sz=0.22)=>{ await p.evaluate(async ([x,sz])=>{ const G=await import('/core/gestures.js'), PO=await import('/core/gestures/pose.js'), V=await import('/core/vision.js');
    G.handsProbe(null); const clk={ t:5e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true);
    for(let i=0;i<14;i++){ clk.t+=1000/30; G.processHandsProbe({ landmarks:[PO.pose({ x, y:0.5, s:sz, gaps:[0.05,1,1,1] }), PO.pose({ x:0.26, y:0.37, s:0.2, gaps:[1,0.05,1,1] })], handednesses:[[{ categoryName:'Right' }],[{ categoryName:'Left' }]] }); } }, [x, sz]); await p.waitForTimeout(1500); };   // x 0.5: in front of the view's centre; a large hand: the nearest depth
const SCREENS_FOREST=[
  ['f-start',        async p=>{ await p.click('#nightBegin'); await p.waitForFunction(()=>{ const s=document.getElementById('start'); return s && !s.classList.contains('on'); }, null, { timeout:180e3 }); await p.waitForTimeout(800); if(await p.evaluate(()=>{ const c=document.getElementById('nightCal'); return !!c && !c.hidden; })) await p.click('#nightCalNo');   // NIGHT-11: no offer after Begin any more
                       await p.evaluate(async ()=>{ const Q=await import('/core/frzqueue.js'); Q.afPause('runner', true); const C=await import('/apps/night/cards.js'); if(C.cardsOpen()) document.getElementById('nightCardSkip').click(); document.querySelector('#nightBgSeg [data-bg="forest"]').click(); });
                       await forestAt(p, 60); await p.waitForTimeout(3000); await playHands(p, false); await p.waitForTimeout(1500); }],
  ['f-moon',         async p=>{ await forestAt(p, 60); await playHands(p); await p.waitForTimeout(900); }],
  /* NIGHT-8: the room with no hands (the water, the ground and the rocks unlit by the playing light) */
  ['f-still',        async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); }); await forestAt(p, 60); await p.waitForTimeout(2500); }],
  /* NIGHT-7: the first cards (each one, portrait) and the settings card's View section (the picture choice) */
  ['f-card1',        async p=>{ await p.evaluate(async ()=>{ const C=await import('/apps/night/cards.js'); C.cardsShow(); }); await p.waitForTimeout(400); }],
  ['f-card2',        async p=>{ await p.evaluate(()=>document.getElementById('nightCardNext').click()); await p.waitForTimeout(300); }],
  ['f-card3',        async p=>{ await p.evaluate(()=>document.getElementById('nightCardNext').click()); await p.waitForTimeout(300); }],
  ['f-card4',        async p=>{ await p.evaluate(()=>document.getElementById('nightCardNext').click()); await p.waitForTimeout(300); }],
  ['f-settings',     async p=>{ await p.evaluate(()=>{ document.getElementById('nightCardSkip').click(); document.getElementById('nightInfoBtn').click(); const c=document.getElementById('nightInfo'); c.scrollTop=c.scrollHeight; }); await p.waitForTimeout(400); }],
  ['f-settings-ru',  async p=>{ await p.evaluate(async ()=>{ const I=await import('/core/i18n.js'); I.setLang('ru'); }); await p.waitForTimeout(300); }],
  ['f-card1-ru',     async p=>{ await p.evaluate(async ()=>{ document.getElementById('nightInfoClose').click(); const C=await import('/apps/night/cards.js'); C.cardsShow(); }); await p.waitForTimeout(400); }],
  ['f-card-after',   async p=>{ await p.evaluate(async ()=>{ document.getElementById('nightCardSkip').click(); const I=await import('/core/i18n.js'); I.setLang('en'); }); await p.waitForTimeout(300); }],
  ['f-cloud',        async p=>{ await forestAt(p, 630); await p.waitForTimeout(600); await playHands(p); await p.waitForTimeout(900); }],
  ['f-dusk',         async p=>{ await forestAt(p, 60); await moodTo(p, 'Dusk|Сумер'); await p.waitForTimeout(9000); await playHands(p); await p.waitForTimeout(900); }],
  ['f-mist',         async p=>{ await moodTo(p, 'Mist|Туман'); await p.waitForTimeout(9000); await playHands(p); await p.waitForTimeout(900); }],
  ['f-sleep',        async p=>{ await moodTo(p, 'Glow|Сияние'); await p.waitForTimeout(9000); await p.evaluate(async ()=>{ const S=await import('/apps/night/shell.js'); S.nightSleepDbg(15, 800e3); }); await p.waitForTimeout(1200); await playHands(p); await p.waitForTimeout(900); }],
  ['f-notes',        async p=>{ await p.evaluate(async ()=>{ const S=await import('/apps/night/shell.js'); S.nightSleepDbg(0, 0); }); await forestAt(p, 60); await playHands(p); await roomNotes(p, 14, 450); await p.waitForTimeout(350); }],
  ['f-echo',         async p=>{ await roomNotes(p, 1, 900, [['cecho',0,0.85],['ctone',1,0.5]]); }],
  ['f-warm',         async p=>{ await roomNotes(p, 4, 500, [['cecho',0,0],['ctone',1,0.05]]); await p.waitForTimeout(200); }],
  ['f-star',         async p=>{ await forestAt(p, 60); await p.waitForTimeout(300); await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRoomDbg().rareDbg('star'); }); await p.waitForTimeout(520); }],
  ['f-bloom',        async p=>{ await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRoomDbg().rareDbg('bloom'); }); await p.waitForTimeout(3600); }],
  ['f-emblem',       async p=>{ await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRoomDbg().rareDbg('emblem'); }); await p.waitForTimeout(3800); }],
  ['f-land',         async p=>{ await p.evaluate(async ()=>{ const S=await import('/apps/night/shell.js'); S.nightSleepDbg(0, 0); }); await p.setViewportSize({ width:844, height:390 }); await forestAt(p, 60); await p.waitForTimeout(1800); await playHands(p); await p.waitForTimeout(900); }],
  ['f-land-still',   async p=>{ await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); }); await forestAt(p, 60); await p.waitForTimeout(2500); }],
  /* NIGHT-8: a laptop-sized window (the room's buffer is larger there): no hands, then a few notes with the light low over the stream */
  ['f-wide-still',   async p=>{ await p.setViewportSize({ width:1280, height:720 }); await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'); G.handsProbe(null); }); await forestAt(p, 60); await p.waitForTimeout(3000); }],
  ['f-wide-notes',   async p=>{ await forestAt(p, 60); await playHands(p, false); await roomNotes(p, 6, 450); await p.waitForTimeout(300); }],
  /* NIGHT-8: close views (the room's capture door viewDbg, full pixel ratio): the near stream and its rocks, the bare ground, the far water */
  ['f-close-water',  async p=>{ await closeView(p, [0.3,1.0,4.2], [-1.0,-0.05,1.2]); }],
  ['f-close-rocks',  async p=>{ await closeView(p, [0.6,0.8,0.8], [-1.5,0,-1.2]); }],
  ['f-close-ground', async p=>{ await closeView(p, [2.4,1.25,3.9], [1.9,0,0.4]); }],
  ['f-close-ground-off', async p=>{ await closeView(p, [2.4,1.25,3.9], [1.9,0,0.4], { groundMacro:false, litterLeaves:0, litterPebbles:0, litterTwigs:0 }); }],   // NIGHT-8 iteration: the same view without the ground's large scale and litter
  ['f-close-far',    async p=>{ await closeView(p, [0.2,1.3,-1.0], [1.5,0,-7.0]); }],
  /* NIGHT-9: where the water meets the bank, looking down; a trunk's foot with the ground round it */
  ['f-close-bank',   async p=>{ await closeView(p, [0.2,0.9,2.2], [-0.9,0.0,0.8]); }],
  ['f-close-foot',   async p=>{ await closeView(p, [-0.3,1.1,0.2], [-2.1,0.2,-2.2]); }],
  /* NIGHT-8c: the two lit trunks of the start view (forestTrunks 0 and 1) side by side with the light between them, then each close, the same angle */
  ['f-close-trunks', async p=>{ await closeView(p, [0.2,1.7,2.6], [0.2,2.7,-3.4]); await trunkLight(p); }],
  ['f-close-trunk-l', async p=>{ await closeView(p, [-1.0,1.9,1.0], [-2.1,2.6,-2.2]); await trunkLight(p, 0.5, 0.42); }],
  ['f-close-trunk-r', async p=>{ await closeView(p, [3.3,1.9,-1.4], [2.5,2.6,-4.6]); await trunkLight(p, 0.5, 0.42); }],
  ['f-close-end',    async p=>{ await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRoomDbg().viewDbg(null); H.sceneOptDbg(null); }); }],
  ['f-land-back',    async p=>{ await p.setViewportSize({ width:844, height:390 }); await p.waitForTimeout(1500); }],
  ['f-land-cloud',   async p=>{ await forestAt(p, 640); await p.waitForTimeout(600); await playHands(p); await p.waitForTimeout(900); }],
  ['f-land-emblem',  async p=>{ await forestAt(p, 60); await p.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); H.sceneRoomDbg().rareDbg('emblem'); }); await p.waitForTimeout(3800); }],
  ['f-land-notes',   async p=>{ await forestAt(p, 60); await roomNotes(p, 10, 450, [['ctone',1,0.5]]); await roomNotes(p, 1, 700, [['cecho',0,0.85]]); }],
];
/* the top messages: no two visible ones overlap, and none covers the control panel (SPLIT-2).
   MSG_KNOWN = overlaps already in the backlog: printed, not counted; a known line that no longer happens fails, so it is deleted with the fix. */
const MSG_KNOWN=new Set([]);   // NIGHT-2 fixed the landscape low-light hint over the panel
const msgSeen=new Set();
async function msgCheck(p, name){
  const r=await p.evaluate(()=>{ const vis=e=>{ if(!e) return false; const c=getComputedStyle(e); if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false; for(let q=e.parentElement;q;q=q.parentElement){ const k=getComputedStyle(q); if(k.display==='none'||+k.opacity===0) return false; } return true; };
    const els=['darkHint','nightIdle','nightCoach','nightNotice','nightFxBars','nightForestBar','nightCtl'].map(id=>document.getElementById(id)).filter(vis), R=els.map(e=>[e.id, e.getBoundingClientRect()]), hits=[];
    const bar=id=>/Bar/.test(id);   // the two bar sets may sit side by side; a message may touch neither, nor the panel
    for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ if(bar(R[i][0])&&bar(R[j][0])) continue; const a=R[i][1], b=R[j][1]; if(!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)) hits.push(R[i][0]+' × '+R[j][0]); }
    return { shown:R.map(x=>x[0]), hits }; });
  out(`[ui-snap] ${name}: messages shown ${r.shown.join(', ')||'none'} — ${r.hits.length ? 'OVERLAP '+r.hits.join(', ') : 'no overlap'}`); for(const h of r.hits){ const line=name+': '+h; if(MSG_KNOWN.has(line)){ msgSeen.add(line); out('[ui-snap]   known, in the backlog: '+line); } else msgHits.push(line); }
}
const msgHits=[];
async function playHands(p, check=true){   // RUN 9: check=false — the first hands-in moment (the shell's 300-ms fade still runs)
  await p.evaluate(async ()=>{ const G=await import('/core/gestures.js'), PO=await import('/core/gestures/pose.js'), V=await import('/core/vision.js');
    G.handsProbe(null); const clk={ t:5e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true);
    for(let i=0;i<14;i++){ clk.t+=1000/30; const up=Math.min(1,i/10);
      G.processHandsProbe({ landmarks:[PO.pose({ x:0.72, y:0.52, s:0.22, gaps:[0.05,1,1,1] }), PO.pose({ x:0.26, y:0.55-0.18*up, s:0.2, gaps:[1,0.05,1,1] })], handednesses:[[{ categoryName:'Right' }],[{ categoryName:'Left' }]] }); } });
  await p.waitForTimeout(700); if(check) await msgCheck(p, 'play '+p.viewportSize().width+'×'+p.viewportSize().height);
}
async function capture(tag){
  const dir=path.join(OUT,tag); await mkdir(dir,{ recursive:true });
  const srv=await serve(), port=srv.address().port, y4m=await fakeVideo();
  const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
    `--use-file-for-fake-video-capture=${y4m}`,'--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--hide-scrollbars'] });
  const res={ tag, screens:{} };
  try{
    const ctx=await browser.newContext({ viewport: NIGHT ? (LAPTOP ? VP_LAPTOP['390x844'] : { width:390, height:844 }) : { width:1280, height:800 }, deviceScaleFactor: DPR || (NIGHT && !LAPTOP ? 2 : 1), locale:'en-US' });
    await ctx.grantPermissions(['camera','microphone'],{ origin:`http://127.0.0.1:${port}` }); await cdnCache(ctx);
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.lang','en'); }catch(e){} });
    if(LEVEL) await ctx.addInitScript(lv=>{ try{ localStorage.setItem('handsong.sceneLevel', lv); }catch(e){} }, LEVEL);
    if(REVEAL || N13) await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.nightBg', 'forest'); }catch(e){} });
    if(N13) await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.sceneLevel', 'reduced'); }catch(e){} });   // NIGHT-13: Standard (the default)
    if(GROUND) await ctx.addInitScript(g=>{ window.__groundSet=g; }, GROUND);
    if(TINT) await ctx.addInitScript(t=>{ const set=()=>{ for(const kv of t.split(',')){ const [k,v]=kv.split('='); document.documentElement.style.setProperty('--cv-'+k, v); } };
      if(document.documentElement) set(); else new MutationObserver((_,o)=>{ if(document.documentElement){ set(); o.disconnect(); } }).observe(document, { childList:true }); }, TINT);
    /* SPLIT-2: the effects hint's own 7-s timer races the capture (it hid between the style walk and the shot): it stays up through night-play; night-forest takes it down, as the timer would have */
    if(NIGHT) await ctx.addInitScript(()=>{ const st=window.setTimeout; window.setTimeout=(f,ms,...a)=>st(f, ms===7000 ? 3600e3 : ms, ...a); });
    const page=await ctx.newPage();
    if(LAPTOP){ const real=page.setViewportSize.bind(page); page.setViewportSize=v=>real(VP_LAPTOP[v.width+'x'+v.height]||v); }   // DESIGN-1: every screen's own size mapped
    const errs=[]; page.on('pageerror',e=>errs.push(String(e&&e.message||e))); page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,600)); });   // NIGHT-8c: a shader that fails to compile shows here
    if(VIEWPORT){ const [w,h]=VIEWPORT.split('x').map(Number); await page.setViewportSize({ width:w, height:h }); }   // NIGHT-13
    await page.goto(`http://127.0.0.1:${port}/apps/${NIGHT?'night':'full'}/index.html?probe${TINT_DEMO ? '&testroom' : ''}${N13 && N13_OLD ? '&oldstill' : ''}`);
    await page.waitForFunction(()=>window.P && window.R, null, { timeout:60e3 }); await page.waitForTimeout(800);
    const FAST=argv.includes('--fast') ? new Set(['f-start','f-wide-still','f-wide-notes','f-close-water','f-close-rocks','f-close-ground','f-close-ground-off','f-close-far','f-close-bank','f-close-foot','f-close-trunks','f-close-trunk-l','f-close-trunk-r','f-close-end']) : null;   // NIGHT-8: look iterations — the start and the laptop-sized views only
    for(const [name,act] of (N13 ? (N13==='match' ? SCREENS_N13_MATCH : SCREENS_N13) : REVEAL ? SCREENS_REVEAL : TINT_DEMO ? SCREENS_TINT : FOREST ? SCREENS_FOREST.filter(([n])=>!FAST || FAST.has(n)) : NIGHT ? SCREENS_NIGHT : SCREENS)){
      await act(page);
      if(ONLY && !ONLY.split(',').includes(name)) continue;
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      if(BAR_KEEP.has(name)) await barOpen(page);   // RUN 8: the capture waits for an open top bar (the app is untouched)
      const st= FOREST || REVEAL || N13 ? { els:{}, table:[], props:[] } : await page.evaluate(STYLES_FN);   // RUN 9: the forest screens are pictures only (the style walk takes seconds — a falling star is over by then)
      if(BAR_KEEP.has(name) && await page.evaluate(()=>document.getElementById('bar').classList.contains('min'))) await barOpen(page);   // the style walk outlasted the bar's timer
      const png=await page.screenshot({ animations: name==='n13-tap-peak' ? 'allow' : 'disabled', caret:'hide' });   // NIGHT-13: the tap's pulse held mid-way (a disabled animation would jump to its end)
      await writeFile(path.join(dir,name+'.png'), png); res.screens[name]=st;
      if(FOREST){ const u=await page.evaluate(async ()=>{ const H=await import('/apps/night/scene/host.js'); return H.sceneShotDbg(); });   // NIGHT-8: the room's own frame too (no interface over the water and the ground)
        if(u) await writeFile(path.join(dir,name+'-room.png'), Buffer.from(u.split(',')[1], 'base64')); }
      out(`[ui-snap] ${tag} · ${name}: ${Object.keys(st.els).length} elements, ${st.table.length} distinct styles`);
    }
    res.errors=errs; if(errs.length) out(`[ui-snap] page errors: ${errs.slice(0,5).join(' | ')}`);
    await writeFile(path.join(dir,'styles.json'), JSON.stringify(res));
  } finally { await browser.close().catch(()=>{}); srv.close(); }
}
/* SPLIT-2: the agreed changes since the baseline, per page (--declared full|night). REMOVED: elements that are gone on purpose. SHIFT: [parent, first child index, by] re-indexes the siblings
   after them, so nothing else reads as changed. PIXELS: the screens where the removal shows; their style and pixel differences are printed, not counted; each is checked by eye (side-by-side). */
const DECLARED={
  full:{ REMOVED:/^(#night[\w-]*|#profSep|#profRow|#profHint|#profFull|#profNight)(>|::|$)|^#start>div:1>(div:1|ol:2|button:3)(>|::|$)/, SHIFT:[['#start>div:1',4,3], ['html>body:2',26,1]], PIXELS:new Set() },
  night:{ REMOVED:/^(#profSep|#profRow|#profHint|#profFull|#profNight|#nightToFull)(>|::|$)/, SHIFT:[], PIXELS:new Set(['night-start','night-info','night-land-info','night-ru-info']) },
};
const DECL=DECLARED[val('--declared')]||null;
function rekey(k){ if(!DECL) return k; for(const [par,from,by] of DECL.SHIFT){ if(!k.startsWith(par+'>')) continue; const rest=k.slice(par.length+1), m=rest.match(/^([a-z0-9]+):(\d+)(.*)$/); if(m && +m[2]>=from) return `${par}>${m[1]}:${+m[2]-by}${m[3]}`; } return k; }
async function compare(a,b){
  const A=JSON.parse(await readFile(path.join(OUT,a,'styles.json'),'utf8')), B=JSON.parse(await readFile(path.join(OUT,b,'styles.json'),'utf8'));
  let total=0; const browser=await chromium.launch({ channel:'chrome', headless:true }); const page=await browser.newPage();
  try{
    for(const name0 of Object.keys(A.screens)){ const name=toNew(name0), sa=A.screens[name0], sb=B.screens[name]; if(!sb){ out(`[ui-snap] ${name}: missing in ${b}`); total++; continue; }
      const diffs=[], onlyA=[], onlyB=[];
      let gone=0; const keysA=new Set();
      for(const [k00,ea] of Object.entries(sa.els)){ const k0=toNew(k00); if(k0.startsWith('html>head')) continue; if(DECL && DECL.REMOVED.test(k0)){ gone++; continue; } const k=rekey(k0); keysA.add(k); const eb=sb.els[k]; if(!eb){ onlyA.push(k0); continue; }
        const va=sa.table[ea.s], vb=sb.table[eb.s];
        sa.props.forEach((p,i)=>{ const j=sb.props.indexOf(p); const x=toNew(va[i]), y=j>=0?vb[j]:'(no property)'; if(x!==y) diffs.push(`${k} ${p}: ${x} → ${y}`); });
        const ta=ea.t==null?ea.t:toNew(ea.t); if(ta!==eb.t) diffs.push(`${k} text: ${JSON.stringify(ta)} → ${JSON.stringify(eb.t)}`); }
      for(const k of Object.keys(sb.els)) if(!keysA.has(k) && !k.startsWith('html>head')) onlyB.push(k);   // <head> is not rendered
      const pa=await readFile(path.join(OUT,a,name0+'.png')), pb=await readFile(path.join(OUT,b,name+'.png'));
      let px=0; if(!pa.equals(pb)) px=await page.evaluate(async ([x,y])=>{ const load=s=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src='data:image/png;base64,'+s; });
        const [ia,ib]=await Promise.all([load(x),load(y)]); if(ia.width!==ib.width||ia.height!==ib.height) return -1;
        const c=document.createElement('canvas'); c.width=ia.width; c.height=ia.height; const g=c.getContext('2d');
        g.drawImage(ia,0,0); const da=g.getImageData(0,0,c.width,c.height).data; g.clearRect(0,0,c.width,c.height); g.drawImage(ib,0,0); const db=g.getImageData(0,0,c.width,c.height).data;
        let n=0; for(let i=0;i<da.length;i+=4) if(da[i]!==db[i]||da[i+1]!==db[i+1]||da[i+2]!==db[i+2]||da[i+3]!==db[i+3]) n++; return n; }, [pa.toString('base64'), pb.toString('base64')]);
      const noisy=NOISY.has(name), declared=!!(DECL && DECL.PIXELS.has(name)), n=(noisy||declared?0:diffs.length+(px?1:0))+onlyA.length+onlyB.length; total+=n;
      out(`[ui-snap] ${name}: ${Object.keys(sa.els).length} elements · style differences ${diffs.length} · only in ${a} ${onlyA.length} · only in ${b} ${onlyB.length} · pixels differing ${px<0?'(size changed)':px}${noisy?' (noisy screen: structure only)':''}${declared?' (declared: checked by eye)':''}${gone?` · removed on purpose ${gone}`:''}`);
      for(const d of [...(noisy?[]:diffs.slice(0,declared?40:12)), ...onlyA.slice(0,5).map(k=>'only in '+a+': '+k), ...onlyB.slice(0,5).map(k=>'only in '+b+': '+k)]) out('    '+d);
    }
  } finally { await browser.close().catch(()=>{}); }
  out(`[ui-snap] ${total?'DIFFERENCES — '+total:'IDENTICAL'} (${a} → ${b})`);
  return total;
}
/* SPLIT-2: before and after in one PNG, for the eye: --side-by-side <tagA> <tagB> <screen,screen> <folder> */
async function sideBySide(a,b,names,dir){ await mkdir(dir,{ recursive:true }); const browser=await chromium.launch({ channel:'chrome', headless:true }); const page=await browser.newPage();
  try{ for(const name of names){ const [pa,pb]=await Promise.all([a,b].map(t=>readFile(path.join(OUT,t,name+'.png')).catch(()=>readFile(path.join(OUT,t,toOldScreen(name)+'.png')))));
      const url=await page.evaluate(async ([x,y,la,lb])=>{ const load=s=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src='data:image/png;base64,'+s; }); const [ia,ib]=await Promise.all([load(x),load(y)]);
        const G=24, H=48, c=document.createElement('canvas'); c.width=ia.width+ib.width+G; c.height=Math.max(ia.height,ib.height)+H; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height);
        g.fillStyle='#000'; g.font='28px sans-serif'; g.fillText('BEFORE: '+la,8,34); g.fillText('AFTER: '+lb,ia.width+G+8,34); g.drawImage(ia,0,H); g.drawImage(ib,ia.width+G,H); return c.toDataURL('image/png'); }, [pa.toString('base64'), pb.toString('base64'), a, b]);
      const f=path.join(dir,name+'.png'); await writeFile(f, Buffer.from(url.split(',')[1],'base64')); out('[ui-snap] side by side: '+path.relative(ROOT,f)); } }
  finally{ await browser.close().catch(()=>{}); } }
{ const i=argv.indexOf('--side-by-side'); if(i>=0){ await sideBySide(argv[i+1],argv[i+2],argv[i+3].split(','),path.resolve(argv[i+4])); process.exit(0); } }
if(SAVE) await capture(SAVE);
let code=0;
if(SAVE && NIGHT && !FOREST){ for(const k of MSG_KNOWN) if(!msgSeen.has(k)) msgHits.push('a known overlap no longer happens, delete its line: '+k); }
if(SAVE && NIGHT){ out(msgHits.length ? '[ui-snap] Night messages: OVERLAP — '+msgHits.join(' · ') : '[ui-snap] Night messages: no new overlap ('+msgSeen.size+' known, in the backlog)'); if(msgHits.length) code=1; }   // RUN 8 (addendum 3)
if(CMP){ const [a,b]= CMP2 ? [CMP,CMP2] : [CMP,SAVE]; if(!b){ out('[ui-snap] --compare needs two tags (or --save)'); process.exit(2); } code= (await compare(a,b)) ? 1 : 0; }
if(!SAVE&&!CMP){ out('usage: node tools/ui-snap.mjs --save <tag> [--compare <tagA>] | --compare <tagA> <tagB>'); const t=await readdir(OUT).catch(()=>[]); out('captures: '+t.join(', ')); }
process.exit(code);
