/* RAIN-4c — THE RAIN ROOM's LO-FI BED, TO JUDGE BY EAR (dev tool; never runs in the app). Its own server and a fresh headless Chrome, Night with
   «?probe» (no Begin: everything renders offline): the room's own lo-fi engine (apps/night/rooms/rain/lofi.js) playing the player's events
   (apps/night/pure/lofi.js) — 3 pieces × 3 levels, each about 1.5 minutes, with and without a simple seeded melody of the playing hand (its timbre
   through the render copy of the engine, core/render.js engineProbe, with the room's level and strike cap); per piece one more: the levels changing
   every 8 bars (quiet → groove → full → groove), to hear the bar-line changes; and RAIN-4b's jazz for comparison (its files on the old page).
   No timing measured. Needs ffmpeg (outside the repository) to write MP3.
     node tools/rain-lofi.mjs        → tools/design/rain/lofi/ (MP3s, lofi.json, index.html) */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT, 'tools/design/rain/lofi'), RATE=32000, SEC=180;
const MIME={ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.woff2':'font/woff2', '.wasm':'application/wasm', '.task':'application/octet-stream', '.ktx2':'application/octet-stream' };
const PIECES=[['lydian-penta', 'Поздняя ночь — мечтательно, лидийский, 70', 'vibraphone'], ['dorian-hexa', 'Вечерний бульвар — больше всего грува, дорийский, 82', 'e-piano'], ['mixolydian-hexa', 'После дождя — тепло, миксолидийский, 76', 'nylon']];
const LEVELS=[['quiet', 'Тихо: только электропиано'], ['groove', 'Грув: + бас и мягкий бит'], ['full', 'Полно: + винил, вибрафон, фразы гитары']];
const TNAME={ 'e-piano':'электропиано', vibraphone:'вибрафон', nylon:'нейлоновая гитара', celesta:'челеста' };

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
    if(r.status!==0) throw new Error('ffmpeg: '+r.stderr); console.log(`[rain-lofi] ${name}.mp3 (${(pcm.length/RATE/4).toFixed(1)} s, peak ${st.peak} dBFS, rms ${st.rms} dBFS)`); });
  await p.goto(`http://127.0.0.1:${srv.address().port}/apps/night/index.html?probe`);
  await p.waitForFunction(()=>window.P && window.__nightBoot && window.__nightBoot.state().done, null, { timeout:180e3 });
  await p.evaluate(async ([RATE, SEC, PIECES, LEVELS])=>{
    const R=await import('/core/render.js'), S=await import('/core/scales.js'), RR=(await import('/apps/night/rooms/rain/pure/room.js')).RAIN_ROOM, { seeded }=await import('/core/pure/dsp.js');
    const LF=await import('/apps/night/pure/lofi.js'), EN=await import('/apps/night/rooms/rain/lofi.js'), base=new URL('/apps/night/rooms/rain/', location.href).href;
    await S.scalesLoadRest();
    const recs={}; for(const n of ['e-piano', 'vibraphone', 'nylon', 'celesta']) recs[n]=await (await fetch('/apps/night/rooms/rain/timbres/'+n+'.json')).json();
    const viewOf=id=>S.scaleView(S.scaleById(id)), db=x=>(20*Math.log10(Math.max(1e-9, x))).toFixed(1);
    const lead=(rec, notes, sec, vol)=>R.engineProbe(async (eng, ctx)=>{ const why=eng.timbreInstall(rec); if(why) throw new Error(rec.id+': '+why); const i=eng.timbreIdx('ld', rec.id), T=RR.music.timbres.find(x=>x.id===rec.id);
      if(eng.setNightStrikes) eng.setNightStrikes({ [rec.id]:T.voices }); if(eng.setTimbreTrim) eng.setTimbreTrim({ [rec.id]:T.level });
      notes.forEach((n, k)=>{ eng.leadOn('rm'+k, n.hz, vol*n.v, i, 0, 1, undefined, undefined, n.t); eng.leadOff('rm'+k, undefined, n.t+n.d); });
      const b=await ctx.startRendering(); return [b.getChannelData(0).slice(), b.getChannelData(1).slice()]; }, { sec, real:true, rate:RATE });
    const melody=(id, sec, bpm, seed)=>{ const v=viewOf(id), N=v.iv.length, r=seeded(seed), beat=60/bpm, out=[]; let s=N+2, t=4*beat*2;
      while(t<sec-4){ if(r()<0.72){ s=Math.max(N, Math.min(2*N+2, s+[-2, -1, -1, 1, 1, 2][Math.floor(r()*6)])); const d=beat*[1, 1, 2, 1.5, 3][Math.floor(r()*5)];
          out.push({ t, d:d*0.9, hz:S.chordRowFreq(((s%N)+N)%N, Math.floor(s/N), v), v:0.75+0.25*r() }); t+=d; } else t+=beat*(r()<0.5 ? 2 : 4); }
      return out; };
    const send=async (name, L, Rr)=>{ let pk=0, e=0; for(let i=0;i<L.length;i++){ pk=Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])); e+=L[i]*L[i]+Rr[i]*Rr[i]; } const g= pk>0.98 ? 0.98/pk : 1;
      const n=L.length, pcm=new Int16Array(n*2); for(let i=0;i<n;i++){ pcm[2*i]=Math.round(Math.max(-1, Math.min(1, L[i]*g))*32767); pcm[2*i+1]=Math.round(Math.max(-1, Math.min(1, Rr[i]*g))*32767); }
      const u=new Uint8Array(pcm.buffer), C=1<<20; for(let a=0;a<u.length;a+=C){ let s=''; const part=u.subarray(a, Math.min(u.length, a+C)); for(let i=0;i<part.length;i+=0x8000) s+=String.fromCharCode.apply(null, part.subarray(i, i+0x8000)); await window.rmChunk(name, btoa(s)); }
      await window.rmDone(name, { peak:db(pk), rms:db(Math.sqrt(e/(2*n))), scaled:+g.toFixed(3) }); };
    /* one bed offline: a piece at a level (changes: [[bar, level]…] — each from that bar's line, as the room does); only: keep these event kinds; leg: the old instruments */
    const pcOf=P=>{ const m=S.scaleById(P.parent); return m && m.iv ? m.iv.slice() : undefined; };
    const bed=async (id, lv, sec, changes=[], o={})=>{ const P=RR.bed2.lofi.pieces[id], v=viewOf(id), pv=S.scaleView(S.scaleById(P.parent), undefined, undefined, S.viewKey(v), S.viewKeyC(v));
      const c=new OfflineAudioContext(2, RATE*sec, RATE), E=await EN.lofiEngine(c, c.destination, base, { legacy:o.leg||{}, ep:o.ep }), st=LF.lofiInit(P, lv, { at:0.3, pc:pcOf(P) }), B=LF.lofiBarSec(P); E.tempo(P.bpm, 0);
      E.layer('crackle', !o.only && LF.LOFI_LEVELS[lv].includes('crackle') ? 1 : 0, 0); E.level(RR.bed2.master*RR.bed2.level*RR.bed2.level, 0, 0.03);
      const put=ev=>{ if(!o.only || o.only.includes(ev.kind)) E.play(ev, ev.t, pv); };
      let t=0; const ch=changes.slice(); while(t<sec){ const nx=ch.length ? 0.3+ch[0][0]*B-0.5 : sec, evs=LF.lofiStep(st, t, Math.min(sec, nx)); if(o.arp) for(const e of evs) if(e.kind==='chord') o.arp(e).forEach(put); for(const e of evs) put(e); t=Math.min(sec, nx);
        if(ch.length && t<sec){ const [, l2]=ch.shift(); for(const ev of LF.lofiLevel(st, l2, t)) E.play(ev, ev.t, pv); } }
      return await c.startRendering(); };
    const mix=(b, m)=>{ const L=b.getChannelData(0), R2=b.getChannelData(1), oL=new Float32Array(L.length), oR=new Float32Array(L.length); for(let i=0;i<L.length;i++){ oL[i]=L[i]+(m ? m[0][i]||0 : 0); oR[i]=R2[i]+(m ? m[1][i]||0 : 0); } return [oL, oR]; };
    /* (1) the nine sounds, about three minutes each (the full level also with the hand's melody) */
    for(const [id, , tn] of PIECES){ const P=RR.bed2.lofi.pieces[id];
      for(const [lv] of LEVELS){ const b=await bed(id, lv, SEC); await send(`lofi-${id}-${lv}`, ...mix(b, null));
        if(lv==='full'){ const mel=await lead(recs[tn], melody(id, SEC-4, P.bpm, 0x10F1+id.length), SEC, 0.5); await send(`lofi-${id}-full-melody`, ...mix(b, mel)); } }
      const sec2=Math.ceil(LF.lofiBarSec(P)*32+2), b2=await bed(id, 'quiet', sec2, [[8, 'groove'], [16, 'full'], [24, 'groove']]); await send(`lofi-${id}-levels`, ...mix(b2, null)); }
    /* (2) each instrument alone, Evening boulevard, 40 s: the piano old (the FM sample) and new (the hand's tine engine); the guitar old (a plain plucked
       string) and new (the physical model) on an arpeggio of each bar's chord; the bass, the vibraphone, the drums */
    const id0='dorian-hexa', arp=e=>e.steps.concat(e.steps.slice(1).reverse()).slice(0, 6).map((s, k)=>({ t:e.t+k*60/82/2, kind:'gtr', step:Math.max(6, Math.min(15, s+(s<6 ? 7 : 0))), vel:0.55+0.15*(k===0), dur:60/82*0.6, pan:-0.2 }));
    for(const [name, o] of [['ep-old', { only:['ep'], ep:'short' }], ['ep-new', { only:['ep'] }], ['gtr-old', { only:['gtr'], leg:{ gtr:true }, arp }], ['gtr-new', { only:['gtr'], arp }], ['bass', { only:['bass'] }], ['vib', { only:['vib'] }], ['drums', { only:['drum', 'pump'] }]]){
      const b=await bed(id0, 'full', 40, [], o); await send('solo-'+name, ...mix(b, null)); }
    /* (3) the hand's timbres alone: a phrase near (strong), then far (soft) */
    const v0=viewOf('lydian-penta'), N0=v0.iv.length, ph=[0, 2, 4, 3, 1, 2, 5, 4].map((s, k)=>({ t:0.3+k*0.55, d:k===7 ? 1.6 : 0.5, hz:S.chordRowFreq(s%N0, 1+Math.floor(s/N0), v0), v:1 }));
    for(const n of ['e-piano', 'vibraphone', 'nylon', 'celesta']){ const a=await lead(recs[n], ph, 7, 0.8), b=await lead(recs[n], ph, 7, 0.3), L=new Float32Array(a[0].length*2), Rr=new Float32Array(L.length);
      L.set(a[0]); L.set(b[0], a[0].length); Rr.set(a[1]); Rr.set(b[1], a[1].length); await send('hand-'+n, L, Rr); }
  }, [RATE, SEC, PIECES, LEVELS]);
  await ctx.close();
  await writeFile(path.join(OUT, 'lofi.json'), JSON.stringify({ made:'RAIN-4c', rate:RATE, stats }, null, 1)+'\n');
  const au=(f, cap, src=f+'.mp3')=>`<figure><figcaption>${cap}</figcaption><audio controls preload="none" src="${src}"></audio><small>${stats[f] ? `пик ${stats[f].peak} dBFS, RMS ${stats[f].rms} dBFS` : ''}</small></figure>`;
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Лоу-фай дождя</title>
<style>:root{--bg:#0e1116;--fg:#e2e6ee;--mut:#97a0b0}body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:980px}h1{font-size:20px}h2{font-size:17px;margin:28px 0 8px}figure{margin:0 0 12px}figcaption{margin-bottom:4px}audio{width:100%}small{color:var(--mut)}p{color:var(--mut)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head>
<body><h1>RAIN-4e: лоу-фай комнаты «Дождь» — тянущееся электропиано, глубокая гитара, без щелчков</h1><p>Всё отрендерено офлайн тем же движком, что играет комната. Электропиано — тот же движок, что у руки (tine), гитара — физическая модель струны с корпусом; эффекты на дорожках. Музыка не повторяется: каждый такт вытягивается из правил пьесы.</p>
${PIECES.map(([id, cap, tn])=>`<h2>${cap}</h2>`+LEVELS.map(([lv, lc])=>au(`lofi-${id}-${lv}`, lc+' (около 3 минут)')).join('')+au(`lofi-${id}-full-melody`, 'Полно, с простой мелодией руки ('+TNAME[tn]+')')+au(`lofi-${id}-levels`, 'Смена уровней на тактовой черте')).join('')}
<h2>Каждый инструмент отдельно (Вечерний бульвар, 40 с)</h2><div class="grid">${au('solo-ep-old', 'Электропиано: RAIN-4d, короткое (?bedep=short)')}${au('solo-ep-new', 'Электропиано: RAIN-4e, тянется, педаль')}${au('solo-gtr-old', 'Гитара: было (простая струна, RAIN-4c)')}${au('solo-gtr-new', 'Гитара: RAIN-4e (две поляризации, глубокий корпус, комната)')}</div>
${au('solo-bass', 'Бас')}${au('solo-vib', 'Вибрафон (фразы)')}${au('solo-drums', 'Барабаны')}
<p>Сравнение с записанной нейлоновой гитарой: свободного набора CC0 / CC-BY не нашлось (найденные — NC или GPL, нам нельзя). Вопрос в отчёте.</p>
<h2>Тембры руки отдельно: близко, затем далеко</h2>${['e-piano', 'vibraphone', 'nylon', 'celesta'].map(n=>au('hand-'+n, TNAME[n])).join('')}
</body></html>`;
  await writeFile(path.join(OUT, 'index.html'), html); console.log('[rain-lofi] page → tools/design/rain/lofi/index.html');
} finally { await browser.close(); srv.close(); }
