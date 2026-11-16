/* RAIN-4 — THE RAIN ROOM's MUSIC, TO JUDGE BY EAR (dev tool; never runs in the app). Its own server and a fresh headless Chrome, Night with «?probe»
   (no Begin: everything renders offline). (1) Each candidate timbre for the playing hand alone — a short phrase in Late night's notes, near (strong)
   then far (soft) — through the render copy of the engine (core/render.js engineProbe) with the room's own level and strike cap; (2) each mood's
   bed for two minutes (apps/night/bed2.js bed2Plan: the jazz law, the worklet for real) with a simple seeded melody over it in that mood's safe
   notes, played by a candidate timbre through the same engine copy, mixed; Evening once more with the brushes on (the switch the founder decides).
   No timing measured. Needs ffmpeg (outside the repository) to write MP3.
     node tools/rain-music.mjs        → tools/design/rain/music/ (MP3s, music.json, index.html) */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT, 'tools/design/rain/music'), RATE=32000;
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.task':'application/octet-stream', '.ktx2':'application/octet-stream' };
const TIMBRES=[['e-piano', 'Электропиано (мягкое, как Rhodes)'], ['vibraphone', 'Вибрафон'], ['nylon', 'Нейлоновая гитара (кандидат)'], ['celesta', 'Челеста (кандидат)']];
const PIECES=[['lydian-penta', 'Поздняя ночь — баллада, лидийский, ровные восьмые, 64', 'e-piano'], ['dorian-hexa', 'Вечерний бульвар — свинг, дорийский, шагающий бас, 72', 'vibraphone'], ['mixolydian-hexa', 'После дождя — лёгкий свинг, миксолидийский, 66', 'nylon']];   // RAIN-4b: the composed pieces

const srv=await new Promise(res=>{ const s=http.createServer(async (q, r)=>{ try{ let p=decodeURIComponent(new URL(q.url, 'http://x').pathname); if(p.endsWith('/')) p+='index.html';
  const f=path.join(ROOT, p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; }
  const b=await readFile(f); r.writeHead(200, { 'content-type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream', 'cache-control':'no-store' }); r.end(b); }catch(e){ r.writeHead(404); r.end(); } });
  s.listen(0, '127.0.0.1', ()=>res(s)); });
const { chromium }=await import('playwright-core');
const browser=await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const bufs=new Map(), stats={};
try{
  await mkdir(OUT, { recursive:true });
  const ctx=await browser.newContext({ viewport:{ width:800, height:600 } }), p=await ctx.newPage();
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('handsong.night.lang', 'en'); }catch(e){} });
  await p.exposeFunction('rmChunk', (name, b64)=>{ const a=bufs.get(name)||[]; a.push(Buffer.from(b64, 'base64')); bufs.set(name, a); });
  await p.exposeFunction('rmDone', (name, st)=>{ const pcm=Buffer.concat(bufs.get(name)||[]); bufs.delete(name); stats[name]=st;
    const r=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', String(RATE), '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', path.join(OUT, name+'.mp3')], { input:pcm, maxBuffer:1<<30 });
    if(r.status!==0) throw new Error('ffmpeg: '+r.stderr); console.log(`[rain-music] ${name}.mp3 (${(pcm.length/RATE/4).toFixed(1)} s, peak ${st.peak} dBFS, rms ${st.rms} dBFS)`); });
  await p.goto(`http://127.0.0.1:${srv.address().port}/apps/night/index.html?probe`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:120e3 });
  await p.evaluate(async ([RATE, TIMBRES, PIECES])=>{
    const R=await import('/core/render.js'), S=await import('/core/scales.js'), B2=await import('/apps/night/bed2.js'), RR=(await import('/apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, { seeded }=await import('/core/pure/dsp.js');
    await S.scalesLoadRest();   // Night loads only its own modes at start; the room loads the rest when it joins
    const recs={}; for(const [n] of TIMBRES) recs[n]=await (await fetch('/apps/night/rooms/rain/timbres/'+n+'.json')).json();
    const viewOf=id=>S.scaleView(S.scaleById(id)), db=x=>(20*Math.log10(Math.max(1e-9, x))).toFixed(1);
    /* the playing hand: notes [{ t, d, hz, v }] through the engine copy with the room's level and cap */
    const lead=(rec, notes, sec, vol)=>R.engineProbe(async (eng, ctx)=>{ const why=eng.timbreInstall(rec); if(why) throw new Error(rec.id+': '+why); const i=eng.timbreIdx('ld', rec.id), T=RR.music.timbres.find(x=>x.id===rec.id);
      if(eng.setNightStrikes) eng.setNightStrikes({ [rec.id]:T.voices }); if(eng.setTimbreTrim) eng.setTimbreTrim({ [rec.id]:T.level });
      notes.forEach((n, k)=>{ eng.leadOn('rm'+k, n.hz, vol*n.v, i, 0, 1, undefined, undefined, n.t); eng.leadOff('rm'+k, undefined, n.t+n.d); });
      const b=await ctx.startRendering(); return [b.getChannelData(0).slice(), b.getChannelData(1).slice()]; }, { sec, real:true, rate:RATE });
    /* a simple seeded melody in a mode's safe notes, in the playing register (from its tonic up an octave and a bit), sparse, at the mood's tempo */
    const melody=(id, sec, bpm, seed)=>{ const v=viewOf(id), N=v.iv.length, r=seeded(seed), beat=60/bpm, out=[]; let s=N+2, t=4*beat*2;
      while(t<sec-4){ if(r()<0.72){ s=Math.max(N, Math.min(2*N+2, s+[-2, -1, -1, 1, 1, 2][Math.floor(r()*6)])); const d=beat*[1, 1, 2, 1.5, 3][Math.floor(r()*5)];
          out.push({ t, d:d*0.9, hz:S.chordRowFreq(((s%N)+N)%N, Math.floor(s/N), v), v:0.75+0.25*r() }); t+=d; } else t+=beat*(r()<0.5 ? 2 : 4); }
      return out; };
    const send=async (name, L, Rr)=>{ let pk=0, e=0; for(let i=0;i<L.length;i++){ pk=Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])); e+=L[i]*L[i]+Rr[i]*Rr[i]; } const g= pk>0.98 ? 0.98/pk : 1;
      const n=L.length, pcm=new Int16Array(n*2); for(let i=0;i<n;i++){ pcm[2*i]=Math.round(Math.max(-1, Math.min(1, L[i]*g))*32767); pcm[2*i+1]=Math.round(Math.max(-1, Math.min(1, Rr[i]*g))*32767); }
      const u=new Uint8Array(pcm.buffer), C=1<<20; for(let a=0;a<u.length;a+=C){ let s=''; const part=u.subarray(a, Math.min(u.length, a+C)); for(let i=0;i<part.length;i+=0x8000) s+=String.fromCharCode.apply(null, part.subarray(i, i+0x8000)); await window.rmChunk(name, btoa(s)); }
      await window.rmDone(name, { peak:db(pk), rms:db(Math.sqrt(e/(2*n))), scaled:+g.toFixed(3) }); };
    /* (1) each timbre alone: near, then far, in Late night's notes */
    const v0=viewOf('lydian-penta'), N0=v0.iv.length, ph=[0, 2, 4, 3, 1, 2, 5, 4].map((s, k)=>({ t:0.3+k*0.55, d:k===7 ? 1.6 : 0.5, hz:S.chordRowFreq(s%N0, 1+Math.floor(s/N0), v0), v:1 }));
    for(const [n] of TIMBRES){ const a=await lead(recs[n], ph, 7, 0.8), b=await lead(recs[n], ph, 7, 0.3), L=new Float32Array(a[0].length*2), Rr=new Float32Array(L.length);
      L.set(a[0]); L.set(b[0], a[0].length); Rr.set(a[1]); Rr.set(b[1], a[1].length); await send('timbre-'+n, L, Rr); }
    /* (2) RAIN-4b: each composed piece once through (about two minutes): the synth version (the bed's worklet) and the recorded version (the room's
       samples, rooms/rain/sampled.js, a short generated room for its reverb), each with the simple melody and with the melody muted */
    const BS=await import('/apps/night/pure/bedscore.js'), SM=await import('/apps/night/rooms/rain/sampled.js'), base=new URL('/apps/night/rooms/rain/', location.href);
    for(const [id, , tn] of PIECES){ const Sc=RR.bed2.jazz.scores[id], sec=Math.ceil(BS.scoreSeconds(Sc)+3), v=viewOf(id), pv=S.scaleView(S.scaleById(Sc.parent), undefined, undefined, S.viewKey(v), S.viewKeyC(v));
      const c1=new OfflineAudioContext(2, RATE*sec, RATE); await B2.bed2Plan({ ac:c1 }, c1.destination, RR.bed2, 'glimmer', sec, { view:v, once:true }); const syn=await c1.startRendering();
      const c2=new OfflineAudioContext(2, RATE*sec, RATE), Bf=await SM.sampledLoad(c2, base), out=c2.createGain(), wet=c2.createConvolver(), ir=c2.createBuffer(2, RATE*1.8, RATE);
      for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); let r=0x9E37+ch; for(let i=0;i<d.length;i++){ r=(r*16807)%2147483647; d[i]=(r/2147483647*2-1)*Math.exp(-i/(RATE*0.45))*0.35; } }
      wet.buffer=ir; out.connect(c2.destination); wet.connect(c2.destination);
      for(const e of BS.scoreStep(BS.scoreInit(Sc, RR.bed2.jazz.scorePresets.glimmer, true), 0, sec)) if(e.kind!=='chord') SM.sampledPlay(c2, out, wet, Bf, e, e.t, pv);
      const rec=await c2.startRendering(), mel=await lead(recs[tn], melody(id, sec-4, Sc.bpm, 0x5EED+id.length), sec, 0.55);
      const mix=(b, m)=>{ const L=b.getChannelData(0), R=b.getChannelData(1), oL=new Float32Array(L.length), oR=new Float32Array(L.length); for(let i=0;i<L.length;i++){ oL[i]=L[i]+(m ? m[0][i]||0 : 0); oR[i]=R[i]+(m ? m[1][i]||0 : 0); } return [oL, oR]; };
      for(const [tag, b] of [['synth', syn], ['rec', rec]]){ await send(`piece-${id}-${tag}`, ...mix(b, mel)); await send(`piece-${id}-${tag}-bed`, ...mix(b, null)); } }
  }, [RATE, TIMBRES, PIECES]);
  await ctx.close();
  await writeFile(path.join(OUT, 'music.json'), JSON.stringify({ made:'RAIN-4', rate:RATE, stats }, null, 1)+'\n');
  const au=(f, cap)=>`<figure><figcaption>${cap}</figcaption><audio controls preload="none" src="${f}.mp3"></audio><small>${stats[f] ? `пик ${stats[f].peak} dBFS, RMS ${stats[f].rms} dBFS` : ''}</small></figure>`;
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Музыка дождя</title>
<style>:root{--bg:#0e1116;--fg:#e2e6ee;--mut:#97a0b0}body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:900px}h1{font-size:20px}h2{font-size:17px;margin:26px 0 8px}figure{margin:0 0 14px}figcaption{margin-bottom:4px}audio{width:100%}small{color:var(--mut)}p{color:var(--mut)}</style></head>
<body><h1>RAIN-4: музыка комнаты «Дождь» — послушать без игры</h1><p>Всё отрендерено офлайн тем же путём, что играет приложение (движок, ворклет постели). Уровни — как в комнате (свой уровень и предел ударов у каждого тембра).</p>
<h2>Тембры руки — каждый отдельно: близко (сильно), затем далеко (тихо); ноты «Поздней ночи»</h2><p>Электропиано и вибрафон — заданы; из двух кандидатов (гитара, челеста) оставим тот, что звучит лучше — или оба.</p>
${TIMBRES.map(([n, cap])=>au('timbre-'+n, cap)).join('')}
<h2>RAIN-4b: три написанные пьесы — синтез и записанные инструменты рядом</h2><p>Каждая пьеса целиком (вступление, A, B, A, окончание; около двух минут): слева синтез, справа записанные инструменты (CC0: контрабас пиццикато, FM-электропиано, вибрафон, щётки, тарелка, хай-хэт, мягкая бочка). Сверху — с простой мелодией руки, снизу — без неё.</p>
${PIECES.map(([id, cap, tn])=>`<h3>${cap} — мелодия: ${TIMBRES.find(t=>t[0]===tn)[1].replace(/ \(.*\)/, '')}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${au('piece-'+id+'-synth', 'Синтез, с мелодией')}${au('piece-'+id+'-rec', 'Записанные инструменты, с мелодией')}${au('piece-'+id+'-synth-bed', 'Синтез, без мелодии')}${au('piece-'+id+'-rec-bed', 'Записанные, без мелодии')}</div>`).join('')}
</body></html>`;
  await writeFile(path.join(OUT, 'index.html'), html); console.log('[rain-music] page → tools/design/rain/music/index.html');
} finally { await browser.close(); srv.close(); }
