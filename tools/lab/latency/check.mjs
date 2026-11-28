/* LATENCY LAB — its checks. Run: node tools/lab/latency/check.mjs [--pure]
   (1) the measurement in node, on made-up microphone sound with a known answer: a clap burst, then the click as a speaker would play it (filtered,
       with a reflection, in noise) — the measured time must be the true one within 0.5 ms; CONTROLS: no click, no clap → refused; the click moved
       by 10 ms → the answer moves by 10 ms; an inverted click is still found. (2) the gestures: a clap fires once when the palms meet, or when a hand
       vanishes next to the other; not again until the hands part (CONTROL: a hand vanishing far from the other does not fire); a strike fires at the
       surface and again only after a lift. (3) without --pure: the page in a fresh headless Chrome with the fake camera and microphone — it starts,
       the model recognises frames, the microphone delivers sound, a forced gesture produces a measurement row; no console error, no CSP violation,
       no request off our own server. Ends with a verdict line. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { makeClick, analyse, clapNew, clapStep, tapNew, tapStep, CLAP, TAP, pinchNew, pinchStep, PINCH_ON, PINCH_OFF } from './analyse.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bad=[], lines=[], ok=s=>lines.push('ok  '+s), no=s=>bad.push(s);

/* ---- (1) the measurement ---- */
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296*2-1; }; }
function scene({ sr=48000, clapAt=0.5, gapMs=137, rtMs=31, click=true, clap=true, invert=false, seed=7 }={}){
  const r=rng(seed), x=new Float32Array(Math.round(sr*1.6)), k=makeClick(sr);
  for(let i=0;i<x.length;i++) x[i]=0.003*r();
  const A=Math.round(clapAt*sr), B=A+Math.round(gapMs/1000*sr);
  if(clap) for(let i=0;i<Math.round(0.03*sr);i++) x[A+i]+=0.6*Math.exp(-i/(0.004*sr))*r();
  if(click){ const s=invert ? -0.25 : 0.25, refl=Math.round(0.002*sr);
    for(let i=0;i<k.length+refl+2;i++){ const at=j=>j>=0 && j<k.length ? k[j] : 0; x[B+i]+=s*(at(i)+0.5*at(i-1)+0.25*at(i-2))+0.3*s*at(i-refl); } }
  return { x, sr, k, play:B-Math.round(rtMs/1000*sr) };
}
{ const S=scene(), a=analyse(S.x, S.sr, S.k, S.play);
  if(a.ok && Math.abs(a.total-137)<=0.5 && Math.abs(a.roundtrip-31)<=0.5) ok(`measured ${a.total} ms (true 137), round trip ${a.roundtrip} ms (true 31), click likeness ${a.score}`); else no('the measurement: '+JSON.stringify(a)); }
{ const S=scene({ gapMs:147 }), a=analyse(S.x, S.sr, S.k, S.play);
  if(a.ok && Math.abs(a.total-147)<=0.5) ok(`CONTROL: the click 10 ms later → ${a.total} ms`); else no('CONTROL click +10 ms: '+JSON.stringify(a)); }
{ const S=scene({ gapMs:62, rtMs:12, seed:11 }), a=analyse(S.x, S.sr, S.k, S.play);
  if(a.ok && Math.abs(a.total-62)<=0.5) ok(`a short delay: ${a.total} ms (true 62)`); else no('62 ms: '+JSON.stringify(a)); }
{ const S=scene({ invert:true }), a=analyse(S.x, S.sr, S.k, S.play);
  if(a.ok && Math.abs(a.total-137)<=0.5) ok(`an inverted click is found: ${a.total} ms`); else no('inverted click: '+JSON.stringify(a)); }
{ const S=scene({ click:false }), a=analyse(S.x, S.sr, S.k, S.play);
  if(!a.ok && a.why==='click') ok(`CONTROL: no click → refused (the best likeness in noise ${a.score.toFixed(2)}, loudness ×${a.loud.toFixed(1)})`); else no('CONTROL no click was not refused: '+JSON.stringify(a)); }
{ const S=scene({ clap:false }), a=analyse(S.x, S.sr, S.k, S.play);
  if(!a.ok && a.why==='clap') ok('CONTROL: no clap → refused'); else no('CONTROL no clap was not refused: '+JSON.stringify(a)); }
{ const S=scene({ rtMs:250, seed:9 }), a=analyse(S.x, S.sr, S.k, S.play);   // a slow microphone: the clap is heard AFTER the click was started
  if(a.ok && Math.abs(a.total-137)<=0.5 && Math.abs(a.roundtrip-250)<=0.5) ok(`a slow microphone (round trip 250 ms, the clap inside the click's search span): ${a.total} ms`); else no('slow microphone: '+JSON.stringify(a)); }
{ const S=scene({ gapMs:810, seed:4 }), a=analyse(S.x, S.sr, S.k, S.play);   // a burst that began before the window: its tail is the loudest at the start
  if(!a.ok && a.why==='edge') ok('CONTROL: the loudest sound at the window start → refused (not a measured 800 ms)'); else no('CONTROL edge: '+JSON.stringify(a)); }
{ const S=scene({ gapMs:137, seed:12 }); const A=Math.round(0.5*S.sr)-Math.round(0.3*S.sr), r=rng(2); for(let i=0;i<Math.round(0.03*S.sr);i++) S.x[A+i]+=0.95*Math.exp(-i/(0.004*S.sr))*r();   // an earlier, louder gesture 300 ms before
  const bad=analyse(S.x, S.sr, S.k, S.play), good=analyse(S.x, S.sr, S.k, S.play, A+Math.round(0.05*S.sr));
  if(good.ok && Math.abs(good.total-137)<=0.5 && bad.ok && Math.abs(bad.total-437)<=1) ok(`an earlier, louder gesture: searched from after the previous click ${good.total} ms (CONTROL: from the window start it reads ${bad.total})`); else no('earlier gesture: '+JSON.stringify({ good, bad })); }
{ const S=scene({ seed:13 }), B=S.play+Math.round(0.031*S.sr), late=B+Math.round(0.12*S.sr);   // an echo 120 ms after the click, LOUDER than it
  for(let i=0;i<S.k.length;i++) S.x[late+i]+=0.5*S.k[i];
  const free=analyse(S.x, S.sr, S.k, S.play), held=analyse(S.x, S.sr, S.k, S.play, 0, 31);
  if(held.ok && Math.abs(held.total-137)<=0.5 && !(free.ok && Math.abs(free.total-137)<=0.5)) ok(`a louder echo: with the measured round trip ${held.total} ms (CONTROL: without it ${free.ok ? free.total+' ms' : 'refused ('+free.why+')'})`);
  else no('louder echo: '+JSON.stringify({ held, free })); }
{ const S=scene({ sr:44100 }), a=analyse(S.x, S.sr, S.k, S.play);
  if(a.ok && Math.abs(a.total-137)<=0.5) ok(`at 44.1 kHz: ${a.total} ms`); else no('44.1 kHz: '+JSON.stringify(a)); }
{ const S=scene({ click:false, seed:3 }); for(let i=0;i<S.x.length;i++) S.x[i]*=8; const a=analyse(S.x, S.sr, S.k, S.play);   // loud room noise, no click
  if(!a.ok && a.why==='click') ok('CONTROL: loud noise and no click → refused'); else no('CONTROL loud noise: '+JSON.stringify(a)); }
{ const S=scene({ seed:5 }); for(let i=0;i<S.x.length;i++) S.x[i]+=0.02*Math.sin(2*Math.PI*230*i/S.sr); const a=analyse(S.x, S.sr, S.k, S.play);   // a hum under everything
  if(a.ok && Math.abs(a.total-137)<=0.5) ok(`with a hum: ${a.total} ms`); else no('with a hum: '+JSON.stringify(a)); }

/* ---- (2) the gestures ---- */
const hand=(cx, cy, s=0.1)=>Array.from({ length:21 }, (_,i)=>i===0 ? { x:cx, y:cy+s/2 } : i===9 ? { x:cx, y:cy-s/2 } : { x:cx, y:cy });
const pair=d=>[hand(0.5-d*0.1/2, 0.5), hand(0.5+d*0.1/2, 0.5)];   // d hand sizes apart (aspect 1)
{ const st=clapNew(), seq=[[pair(3)],[pair(1.5)],[pair(0.8)],[pair(0.5)],[pair(1.2)],[pair(2.5)],[pair(1.5)],[[hand(0.4,0.5)]],[pair(3)],[pair(2.2)],[pair(3)],[[hand(0.4,0.5)]]];
  const got=seq.map(([h])=>clapStep(st, h, 1, CLAP));
  const want=[null,null,'near',null,null,null,null,'lost',null,null,null,null];
  if(JSON.stringify(got)===JSON.stringify(want)) ok('clap: fires at the meeting palms and at a hand lost beside the other, once each; CONTROL: a hand lost 3 sizes away does not fire');
  else no(`clap: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
{ const st=tapNew(0.8), got=[0.5,0.78,0.79,0.72,0.6,0.8].map(y=>tapStep(st, [Array.from({ length:21 }, ()=>({ x:0.5, y }))], TAP));
  const want=[null,'strike',null,null,null,'strike'];
  if(JSON.stringify(got)===JSON.stringify(want)) ok('strike: fires at the surface, again only after a lift (CONTROL: a small lift does not re-arm)'); else no(`strike: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }

{ const fing=g=>{ const h=Array.from({ length:21 }, ()=>({ x:0.5, y:0.5 })); h[0]={ x:0.5, y:0.7 }; h[5]={ x:0.5, y:0.6 }; h[4]={ x:0.45, y:0.45 };   // scale 0.1
    for(const f of [8,12,16,20]) h[f]={ x:0.45+(f===8 ? g : 0.1), y:0.45 }; return [h]; };
  const st=pinchNew(), gaps=[0.05,0.03,0.019,0.015,0.022,0.024,0.026,0.03,0.018,0.05], got=gaps.map(g=>pinchStep(st, fing(g)));
  const want=[null,null,'pinch',null,null,null,null,null,'pinch',null];
  if(PINCH_ON===0.2 && PINCH_OFF===0.25 && JSON.stringify(got)===JSON.stringify(want)) ok(`pinch: Handsong's law (in below ${PINCH_ON}, out above ${PINCH_OFF}); fires on the in edge only (CONTROL: 0.22–0.24 holds, no new pinch)`);
  else no(`pinch: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }

/* ---- (3) the page ---- */
async function page(){
  const { chromium }=await import(new URL('../../node_modules/playwright-core/index.mjs', import.meta.url).href);
  const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json', '.wasm':'application/wasm', '.task':'application/octet-stream' };
  const srv=http.createServer(async (q,r)=>{ try{ const f=path.join(ROOT, decodeURIComponent(new URL(q.url,'http://x').pathname)); if(!f.startsWith(ROOT)) throw 0;
    const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f)]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  await new Promise(res=>srv.listen(0, '127.0.0.1', res));
  const origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'] });
  const errs=[], off=[];
  try{
    const ctx=await browser.newContext({ viewport:{ width:1100, height:900 } }); await ctx.grantPermissions(['camera','microphone'], { origin });
    await ctx.addInitScript(()=>{ document.addEventListener('securitypolicyviolation', e=>console.error('CSP violation: '+e.violatedDirective+' '+e.blockedURI)); });
    const p=await ctx.newPage();
    p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); }); p.on('pageerror', e=>errs.push(String(e)));
    p.on('response', q=>{ if(q.status()>=400) errs.push(q.status()+' '+q.url()); });
    p.on('request', q=>{ const u=q.url(); if(!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) off.push(u); });
    await p.goto(origin+'/tools/lab/latency/index.html?cam=320&fps=60&g=clap');
    await p.click('#start');
    const t0=Date.now(); let L=null;
    while(Date.now()-t0<120e3){ L=await p.evaluate(()=>window.__lab && window.__lab()); if(L && L.ready && L.frames>10 && L.mic>10 && L.loop && !L.busy) break;
      const m=await p.textContent('#msg'); if(/Не получилось/.test(m)){ no('the page: '+m); return; } await p.waitForTimeout(500); }
    if(!(L && L.ready && L.frames>10 && L.mic>10)){ no('the page did not get ready within 120 s: '+JSON.stringify(L)); return; }
    if(L.loop && !L.loop.ok) ok(`the sound check ran by itself at the start (here ${L.loop.n} of 3 heard: the fake microphone hears no speaker)`); else no('the sound check did not run at the start: '+JSON.stringify(L.loop));
    ok(`the page: ready, ${L.frames} frames in 2 s, recognition ${L.det && L.det.toFixed(1)} ms, frame camera→page ${L.cap!=null ? L.cap.toFixed(1)+' ms' : 'not reported'}, sound out ${L.out && L.out.toFixed(1)} ms, microphone ${L.mic} blocks at ${L.sr} Hz`);
    await p.evaluate(()=>window.__labFire('near')); await p.waitForTimeout(1500);
    const rows=await p.evaluate(()=>window.__lab().rows);
    if(rows===1) ok('a forced gesture produced a measurement row (unmeasured here: the fake microphone hears no clap)'); else no(`a forced gesture gave ${rows} rows`);
    const copy=await p.evaluate(()=>!document.getElementById('copy').disabled); if(!copy) no('«copy the results» stayed disabled');
    /* LIGHT-12c: the camera flash test — the screen flips, each frame's brightness is read (the fake camera cannot see the screen: no catch expected) */
    await p.goto(origin+'/tools/lab/latency/index.html?g=flash'); await p.click('#start');
    let F=null; const t1=Date.now(); while(Date.now()-t1<30e3){ F=await p.evaluate(()=>window.__lab && window.__lab()); if(F && F.ready && F.frames>5 && F.flash.last!=null) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(2500);
    const fl=await p.evaluate(()=>({ L:window.__lab(), shown:!document.getElementById('flash').hidden, white:document.getElementById('flash').classList.contains('white'), info:document.getElementById('flashInfo').textContent }));
    if(fl.L.ready && fl.shown && fl.L.flash.on && fl.L.flash.last!=null) ok(`the flash test runs: the screen flips, the frame brightness is read (${fl.L.flash.last.toFixed(0)}; caught ${fl.L.flash.got}, missed ${fl.L.flash.miss} — the fake camera cannot see the screen); «${fl.info}»`);
    else no('the flash test: '+JSON.stringify(fl));
    await p.click('#flashStop');
    /* LIGHT-12d: the key test — audio only; a key press gives a measurement row */
    await p.goto(origin+'/tools/lab/latency/index.html?g=key'); await p.click('#start');
    { const t2=Date.now(); let K=null; while(Date.now()-t2<30e3){ K=await p.evaluate(()=>window.__lab && window.__lab()); if(K && K.ready && K.mic>10 && K.loop && !K.busy) break; await p.waitForTimeout(300); }
      await p.keyboard.press('Space'); await p.waitForTimeout(1500); K=await p.evaluate(()=>window.__lab());
      if(K.ready && K.rows===1 && K.frames===0) ok(`the key test: audio only (no camera frames), a press gave a row (microphone ${K.mic} blocks)`); else no('the key test: '+JSON.stringify(K)); } if(!(await p.evaluate(()=>document.getElementById('flash').hidden))) no('«Stop» did not end the flashes');
  } finally {
    await browser.close().catch(()=>{}); srv.close();
    if(errs.length) no('console errors: '+errs.slice(0,5).join(' | ')); else lines.push('ok  no console error, no CSP violation');
    if(off.length) no('requests off our server: '+off.slice(0,5).join(', ')); else lines.push('ok  every request to our own server');
  }
}
if(!process.argv.includes('--pure')) await page().catch(e=>no('the page check failed: '+(e && e.stack || e)));
for(const l of lines) console.log(l);
for(const b of bad) console.log('BAD '+b);
console.log(bad.length ? `[lab-check] NOT A PASS — ${bad.length} of ${lines.length+bad.length}` : `[lab-check] PASS — ${lines.length} checks (${os.platform()})`);
process.exit(bad.length ? 1 : 0);
