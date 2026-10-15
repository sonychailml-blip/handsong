/* ⛳ ПРОБЫ ДАННЫХ В NODE — без браузера, камеры и звука (слайс «быстрые пробы»).
   Гоняет ТЕ ЖЕ функции, что строки P.all() T0 / T1 / T2 / T6b / «стопка» / F4: они живут в src/probedata.js, который импортирует только
   scales/state/i18n (и через них config, scaleload, userstore, hooks) — ни draw, ни ui, ни audio, ни recorder. В P.all() эти строки
   остаются: браузерный прогон — полный барьер, этот — быстрый ответ до передачи работы.
   Запуск из корня репозитория:  node tools/probe-data.mjs        (вывод всех строк проб: node tools/probe-data.mjs --verbose)
   Код выхода: 0 — PASS, 1 — есть расхождения, ошибка или сломанный файл данных.
   ⛳ ВЕРДИКТ ПЕЧАТАЕТСЯ ВСЕГДА (AR2): прежде вывод проб глушился на время строки, а таблица печаталась только в конце — ~40 с на экране
   стояла одна строка загрузчика (а на загруженной машине T2 один идёт до 2 минут), и прогон выглядел зависшим (его прерывали, не дождавшись вердикта). Теперь: заголовок с числом строк,
   строка «pass/FAIL · случаи · расхождения · мс» СРАЗУ по завершении каждой пробы, итоговая таблица и итог. Падение импорта или любое
   необработанное исключение — тоже вердикт «NOT A PASS» с причиной (а не немой выход); выход без итога ловит process.on('exit').
   ⚠️ ЧТО ПОДМЕНЕНО И ПОЧЕМУ. Загрузчик ладов (src/scaleload.js) читает data/ через fetch по адресу file:// (база — import.meta.url); fetch
   в node file:// не знает — ниже он читает такие адреса с диска, всё прочее отдаёт настоящему fetch. Больше ничего не подменяется:
   localStorage в node нет (i18n и userstore падают на память — как в приватном окне), IndexedDB нет (файлов пользователя нет —
   пробы и так покрывают только встроенные данные), язык — по navigator node (en), как у браузера без сохранённого выбора. */
import { readFile } from 'node:fs/promises';

const out=s=>process.stdout.write(s+'\n');          // мимо console.*: его глушим на время пробы
let verdictDone=false;
function verdict(pass, line){ verdictDone=true; out(`[probe-data] ${pass?'PASS':'NOT A PASS'} — ${line}`); process.exitCode= pass ? 0 : 1; }
process.on('exit', ()=>{ if(!verdictDone){ out('[probe-data] NOT A PASS — the run ended before a verdict (see the lines above)'); process.exitCode=1; } });
process.on('uncaughtException', e=>{ out('[probe-data] ERROR '+String(e&&e.stack||e)); if(!verdictDone) verdict(false,'uncaught exception'); process.exit(1); });
process.on('unhandledRejection', e=>{ out('[probe-data] ERROR '+String(e&&e.stack||e)); if(!verdictDone) verdict(false,'unhandled rejection'); process.exit(1); });

const nativeFetch=globalThis.fetch;
globalThis.fetch=async (u,o)=>{
  const url=new URL(String(u));
  if(url.protocol!=='file:') return nativeFetch(u,o);
  try{ const txt=await readFile(url,'utf8'); return { ok:true, status:200, json:async()=>JSON.parse(txt), text:async()=>txt }; }
  catch(e){ return { ok:false, status:404, json:async()=>{ throw e; }, text:async()=>'' }; }
};

const verbose=process.argv.includes('--verbose');
const T00=performance.now();
let P, loadReport, LIC, LAT, DSP, HS, CL;
/* LAT1: the latency core's arithmetic, exactly — statistics, the ring window, the hand → sound sum, the Bluetooth heuristic */
function latCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  const s=LAT.statsOf(Array.from({ length:100 },(_,i)=>i+1));
  eq('statsOf 1..100', [s.n,s.mean,s.p5,s.p50,s.p95,s.jitter,s.max], [100,50.5,5,50,95,90,100]);
  eq('statsOf []', Number.isNaN(LAT.statsOf([]).mean), true);
  const M=LAT.makeMeter(4); for(const x of [1,2,3,4,5,6]) M.add('a',x); M.add('a',NaN);
  const m=M.stats('a'); eq('ring of 4 after 6 (+ one NaN ignored)', [m.n,m.kept,m.mean,m.max,M.count('a')], [6,4,4.5,6,6]);
  eq('unknown stage', [M.count('b'), M.stats('b').kept], [0,0]);
  eq('hand → sound, all parts', LAT.handToSound({ camera:40, detect:12, gestures:1, quantumWait:1.5, graph:6, base:10, output:20 }), { ms:90.5, missing:[] });
  eq('hand → sound, camera unknown', LAT.handToSound({ camera:NaN, detect:12, gestures:1, quantumWait:1.5, graph:0, base:10, output:20 }), { ms:44.5, missing:['camera'] });
  eq('delivered rate from frame counters', [LAT.rateOf([[0,100],[2000,160]]), Number.isNaN(LAT.rateOf([[0,1]]))], [30, true]);
  const bt=[[{ outputMs:180 },true],[{ outputMs:99.9 },false],[{ outputMs:100 },true],[{ outputMs:20, label:'Default - Headphones (AirPods Pro)' },true],
    [{ outputMs:20, label:'Headset (WH-1000XM4 Hands-Free AG Audio)' },true],[{ outputMs:20, label:'Speakers (Realtek(R) Audio)' },false],[{},false]];
  for(const [a,w] of bt) eq(`looksBluetooth ${JSON.stringify(a)}`, LAT.looksBluetooth(a), w);
  /* LAT1b: the frame wait, the second total, duplicates per minute, startup / playing long tasks, software graphics */
  eq('frame wait at 20 fps', LAT.frameWaitMs(20), 25);
  eq('frame wait unknown', [Number.isNaN(LAT.frameWaitMs(NaN)), Number.isNaN(LAT.frameWaitMs(0))], [true,true]);
  eq('total incl. frame wait', LAT.withFrameWait(84.5, 25), 109.5);
  eq('per minute', LAT.perMinute([1000, 30000, 65000, 66000, 120000, 125000, 125001], 125000), 3);
  const lt=[{ t:500, ms:880, cause:'script (main.js)' }, { t:9000, ms:120, cause:'' }, { t:12000, ms:60, cause:'' }, { t:70000, ms:300, cause:'self' }, { t:75000, ms:90, cause:'' }];
  eq('long tasks split', LAT.splitLongTasks(lt, 1000, 80000), { startup:{ n:2, maxMs:880, cause:'script (main.js)' }, playing:{ n:2, maxMs:300, cause:'self' } });
  eq('long tasks, no camera yet', LAT.splitLongTasks(lt, NaN, 80000).startup.n, 0);
  eq('software graphics', [LAT.isSoftwareGL('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'), LAT.isSoftwareGL('ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)'),
    LAT.isSoftwareGL('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', true), LAT.isSoftwareGL('llvmpipe (LLVM 15.0.7, 256 bits)')], [true,false,true,true]);
  /* CONTROL: a wrong split (startup cut at the camera start itself, no 10-s window) must be caught by the same comparison */
  const bad=LAT.splitLongTasks(lt, 1000-LAT.STARTUP_MS, 80000), dn=d.length;
  eq('CONTROL (must differ)', bad, { startup:{ n:2, maxMs:880, cause:'script (main.js)' }, playing:{ n:2, maxMs:300, cause:'self' } });
  if(d.length===dn) d.push('CONTROL: a long-task split without the 10-s startup window matched the expected one — the check cannot fail'); else d.length=dn;
  return { cases:18+bt.length, total:d.length, differences:d };
}
/* LAT2: the search schedule of the pure core (src/core/handsched.js), exactly — action sequences for hands in view per frame, the retry
   of a lost hand, the policies, and the hand → sound sum with the worker's transfer part. CONTROL: a schedule run with a second hand that
   never reaches L2 (policy '1') must differ from the two-hand expectation. */
function schedCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }; let n=0;
  const run=(c,o)=>HS.schedRun(c,o).join(' ');
  n++; eq('every', HS.HAND_SEARCH_EVERY, 3);
  n++; eq('no hand: search every 3rd frame, nothing between', run([0,0,0,0,0,0,0]), 'search skip skip search skip skip search');
  n++; eq('one hand: track between the searches', run([1,1,1,1,1,1,1]), 'search track1 track1 search track1 track1 search');
  n++; eq('both hands: tracked on every frame after the first search', run([2,2,2,2,2]), 'search track2 track2 track2 track2');
  n++; eq('second hand appears at frame 2: found by the next search, both tracked from the next frame', run([1,1,2,2,2,2,2,2]), 'search track1 track1 search track2 track2 track2 track2');
  n++; eq('second hand appears right after a search', run([1,1,1,1,2,2,2,2,2]), 'search track1 track1 search track1 track1 search track2 track2');
  n++; eq('one of two hands leaves: a search on the next frame, then every 3rd', run([2,2,2,1,1,1,1,1,1]), 'search track2 track2 track2 search track1 track1 search track1');
  n++; eq('both leave: the tracking frame that lost them searches at once, then every 3rd', run([2,2,0,0,0,0,0]), 'search track2 track2>search skip skip search skip');
  n++; eq('a hand lost by tracking (fast move) is searched for on the same frame', run([1,1,1,1,1,1,1],{ lost:[4] }), 'search track1 track1 search track1>search track1 track1');
  n++; eq('a hand that enters with nothing tracked waits for the next search (≤ 2 frames)', run([0,1,1,1,1]), 'search skip skip search track1');
  n++; eq('policy 2 (the app before LAT2): L2 on every frame', run([1,1,1,2,2],{ policy:'2' }), 'search search search search track2');
  n++; eq('policy 1: L1 on every frame, never retried', run([2,2,0,1],{ policy:'1' }), 'track1 track1 track1 track1');
  n++; eq('hand → sound with the worker trip', LAT.handToSound({ camera:20, detect:50, transfer:5, gestures:1, quantumWait:1.5, graph:0, base:10, output:20 }), { ms:107.5, missing:[] });
  n++; eq('hand → sound, the trip unknown on the worker path', LAT.handToSound({ camera:20, detect:50, transfer:NaN, gestures:1, quantumWait:1.5, graph:0, base:10, output:20 }), { ms:102.5, missing:['transfer'] });
  n++; { const dn=d.length; eq('CONTROL (must differ)', run([1,1,2,2,2,2,2,2],{ policy:'1' }), 'search track1 track1 search track2 track2 track2 track2');
    if(d.length===dn) d.push('CONTROL: a schedule that never tracks two hands matched — the check cannot fail'); else d.length=dn; }
  return { cases:n, total:d.length, differences:d };
}
/* LAT3: low light in the pure core (src/core/camlight.js), exactly — the «Too dark» hint from frame times (shown once, at the right
   frame; never for a camera granted < 24, never when the rate recovers in time, once per session, waits for «allowed»), the hands-lost
   counter, the low-light constraint sets and verdicts, the capabilities line. CONTROLS: a hint without its 3-s wait, and a counter
   without its 1-s limit, must each differ from the expectation. */
function lowCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }; let n=0;
  const frames=(segs)=>{ const ts=[]; let t=0; for(const [fps,ms] of segs){ const end=t+ms; for(;t<end;t+=1000/fps) ts.push(+t.toFixed(6)); } return ts; };
  const hint=(ts, granted, allowed=()=>true, cfg)=>{ const st=CL.darkNew(cfg), at=[]; ts.forEach((x,i)=>{ if(CL.darkStep(st, x, { granted, allowed:allowed(x) })) at.push(i); }); return at; };
  const dark=frames([[6.3,10000]]);
  /* expected frame: the first whose time is more than 3000 ms after the first frame at which the 1-s window was full (t ≥ 1000) */
  const full=dark.find(x=>x>=1000), exp=dark.findIndex(x=>x-full>3000);
  n++; eq('dark 10 s at 6.3 fps, granted 30: shown once, at the frame past 3 s', hint(dark, 30), [exp]);
  n++; eq('granted 20 fps (< 24): never', hint(dark, 20), []);
  n++; eq('granted unknown: never', hint(dark, NaN), []);
  n++; eq('bright 30 fps: never', hint(frames([[30,10000]]), 30), []);
  n++; eq('12 fps exactly is not «below 12»', hint(frames([[12.5,10000]]), 30), []);
  n++; eq('dark 2.5 s, then 30 fps: never (recovered in time)', hint(frames([[30,2000],[6,2500],[30,6000]]), 30), []);
  n++; { const ts=frames([[30,2000],[6,5000],[30,3000],[6,6000]]), at=hint(ts, 30);
    eq('dark twice: shown once per session', at.length, 1); }
  n++; { const ts=frames([[6,10000]]), at=hint(ts, 30, x=>x>6000);   // e.g. a recording until 6 s
    eq('due while not allowed: shown at the first allowed frame', at, [ts.findIndex(x=>x>6000)]); }
  n++; eq('not allowed until it recovered: never', hint(frames([[6,5000],[30,5000]]), 30, x=>x>6000), []);
  n++; { const dn=d.length; eq('CONTROL (must differ)', hint(frames([[30,2000],[6,2500],[30,6000]]), 30, undefined, { ms:0 }), []);
    if(d.length===dn) d.push('CONTROL: a hint without its 3-s wait stayed silent on a 2.5-s dip — the check cannot fail'); else d.length=dn; }
  /* hands lost — 30 fps frames, n hands per frame */
  const lost=(seq, cfg)=>{ const st=CL.lostNew(cfg); seq.forEach((k,i)=>CL.lostStep(st, i*1000/30, k)); return st.n; };
  const Z=k=>Array(k).fill(0);
  n++; eq('1·1·0·0·1: one loss', lost([1,1,0,0,1,1]), 1);
  n++; eq('a hand away 1.33 s left: none', lost([1,1,...Z(40),1,1]), 0);
  n++; eq('2·2·1·2: one', lost([2,2,1,2,2]), 1);
  n++; eq('2·1·0·2 inside one gap: one', lost([2,2,1,0,0,2]), 1);
  n++; eq('a hand that enters: none', lost([0,0,0,1,1,2,2]), 0);
  n++; eq('1·0·1·0·1: two', lost([1,0,1,0,1]), 2);
  n++; eq('two hands, one away 1.33 s and back: none', lost([2,2,...Array(40).fill(1),2]), 0);
  n++; eq('lost at 29 frames (0.97 s) still counts', lost([1,...Z(29),1]), 1);
  n++; { const dn=d.length; eq('CONTROL (must differ)', lost([1,1,...Z(40),1,1],{ ms:Infinity }), 0);
    if(d.length===dn) d.push('CONTROL: a counter without the 1-s limit counted no loss for a hand away 1.33 s — the check cannot fail'); else d.length=dn; }
  /* constraint sets and verdicts */
  const base={ width:{ ideal:640 }, height:{ ideal:480 } };
  const caps={ exposureMode:['continuous','manual'], exposureTime:{ min:1, max:10000, step:1 }, frameRate:{ min:1, max:30 } };
  n++; eq('15 fps', CL.lowConstraints('fps15', caps, base), { width:{ ideal:640 }, height:{ ideal:480 }, frameRate:{ min:15, ideal:30 } });
  n++; eq('24 fps with the 60-fps test request', CL.lowConstraints('fps24', caps, { ...base, frameRate:{ ideal:60 } }), { width:{ ideal:640 }, height:{ ideal:480 }, frameRate:{ min:24, ideal:60 } });
  n++; eq('short exposure = 1/40 s in 100-µs units', CL.lowConstraints('exposure', caps, base), { ...base, advanced:[{ exposureMode:'manual', exposureTime:250 }] });
  n++; eq('exposure clamped and snapped', [CL.exposureUnits({ exposureTime:{ min:300, max:900, step:0 } }), CL.exposureUnits({ exposureTime:{ min:1.22, max:5000, step:2.44 } })], [300, 250.1]);   // 1.22 + round(248.78 / 2.44)·2.44 = 1.22 + 102·2.44
  n++; eq('no manual exposure: not offered', [CL.exposureSupported({ exposureMode:['continuous'] }), CL.lowConstraints('exposure', { exposureMode:['continuous'] }, base), CL.exposureSupported(caps)], [false, null, true]);
  n++; eq('Off after exposure hands it back', CL.lowConstraints('off', caps, base, 'exposure'), { ...base, advanced:[{ exposureMode:'continuous' }] });
  n++; eq('Off after 15 fps = today\'s request', CL.lowConstraints('off', caps, base, 'fps15'), base);
  n++; eq('verdicts', [CL.lowVerdict({ mode:'fps15', before:6.3, after:6.5 }).why, CL.lowVerdict({ mode:'fps15', before:6.3, after:14 }).ok, CL.lowVerdict({ mode:'fps24', before:6, after:9 }).why,
    CL.lowVerdict({ mode:'exposure', before:6, after:30, settings:{ exposureMode:'continuous' } }).why, CL.lowVerdict({ mode:'exposure', before:6, after:30, settings:{ exposureMode:'manual' } }).ok,
    CL.lowVerdict({ mode:'fps24', before:20, after:NaN }).why], ['noeffect', true, 'partly', 'manual', true, 'unmeasured']);
  n++; eq('capabilities line', CL.capsText({ frameRate:{ min:1, max:30 }, width:{ min:1, max:1280, step:1 }, exposureMode:['continuous','manual'], exposureTime:{ min:1.2207, max:5000, step:1.2207 }, iso:{ min:100, max:800 } },
    { frameRate:30, exposureMode:'continuous', width:640 }),
    'frameRate 1–30 = 30 · width 1–1280 (1) = 640 · exposureMode continuous/manual = continuous · exposureTime 1.221–5000 (1.221) · iso 100–800');
  n++; eq('no capabilities', [CL.capsText(null), CL.capsText({})], ['', '']);
  return { cases:n, total:d.length, differences:d };
}
/* SND-F1: the Night forest IR of the pure core — the same twice and pinned per rate (44.1 / 48 kHz), its length, its envelope sample by
   sample against an independent writing of the recipe, the spec's normalisation arithmetic. CONTROLS: exponent 2.5 and another seed differ. */
const FOREST_HASH={ 44100:{ 3.4:'e3971e11', 1.7:'5f0c78e3', 0.85:'c28f730d' }, 48000:{ 3.4:'68fc1b7c', 1.7:'64c9afb0', 0.85:'19381a1c' } };   // SND-F1b: per room length
function forestCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`); }; let n=0;
  const recipe=(rate,pow,seeds,sec=3.4)=>{ const len=Math.round(rate*sec); return seeds.map(sd=>{ const r=DSP.seeded(sd), a=new Float32Array(len); for(let i=0;i<len;i++) a[i]=(r()*2-1)*Math.pow(1-i/len,pow); return a; }); };
  for(const rate of [44100,48000]){
    const a=DSP.forestIR(rate), b=DSP.forestIR(rate);
    n++; eq(`${rate}: generated twice`, DSP.f32Hash(a), DSP.f32Hash(b));
    n++; eq(`${rate}: pinned hash`, DSP.f32Hash(a), FOREST_HASH[rate][3.4]);
    n++; eq(`${rate}: stereo, 3.4 s`, [a.length, a[0].length, a[1].length], [2, Math.round(rate*3.4), Math.round(rate*3.4)]);
    n++; eq(`${rate}: envelope (1 − i/len)^2.6 sample by sample`, DSP.f32Hash(recipe(rate,2.6,DSP.FOREST.seeds)), DSP.f32Hash(a));
    n++; eq(`${rate}: channels independent`, DSP.f32Hash([a[0]])!==DSP.f32Hash([a[1]]), true);
    n++; if(DSP.f32Hash(recipe(rate,2.5,DSP.FOREST.seeds))===DSP.f32Hash(a)) d.push(`CONTROL ${rate}: exponent 2.5 gave the same IR — the envelope check cannot fail`);
    n++; if(DSP.f32Hash(recipe(rate,2.6,DSP.FOREST.seeds.map(x=>x+1)))===DSP.f32Hash(a)) d.push(`CONTROL ${rate}: another seed gave the same IR — the hash cannot fail`);
    for(const sec of DSP.FOREST.rooms){ const r=DSP.forestIR(rate,sec);   // SND-F1b: every room length — pinned, its own envelope (not a cut tail)
      n++; eq(`${rate}: ${sec}-s room pinned hash`, DSP.f32Hash(r), FOREST_HASH[rate][sec]);
      n++; eq(`${rate}: ${sec}-s room envelope over its own length`, DSP.f32Hash(recipe(rate,2.6,DSP.FOREST.seeds,sec)), DSP.f32Hash(r)); }
    n++; { const L=DSP.forestIR(rate,3.4), S=DSP.forestIR(rate,0.85); if(DSP.f32Hash([S[0]])===DSP.f32Hash([L[0].subarray(0,S[0].length)])) d.push(`CONTROL ${rate}: the Short room equals a cut of the Long one — it must be recomputed`); }
  }
  n++; eq('room snapping', [DSP.forestRoom(0.5), DSP.forestRoom(1.3), DSP.forestRoom(2.6), DSP.forestRoom(9)], [0.85, 1.7, 3.4, 3.4]);
  const k=[new Float32Array(1000).fill(0.5), new Float32Array(1000).fill(0.5)];
  n++; eq('normalisation at 44.1 kHz (power 0.5 → 0.00125 / 0.5)', +DSP.irNormScale(k,44100).toPrecision(12), +(0.00125/0.5).toPrecision(12));
  n++; eq('normalisation at 48 kHz (× 44100 / 48000)', +DSP.irNormScale(k,48000).toPrecision(12), +(0.00125/0.5*44100/48000).toPrecision(12));
  n++; eq('compressor curve below / in / above the knee', [DSP.compCurveDb(-40,-12,3,6), DSP.compCurveDb(-12,-12,3,6), DSP.compCurveDb(0,-12,3,6)], [-40, -12.5, -8]);
  return { cases:n, total:d.length, differences:d };
}
let REG;
try{
  P=await import(new URL('../src/probedata.js', import.meta.url).href);
  await import(new URL('../src/probes/data.js', import.meta.url).href);   // PROBE1: the data rows register themselves (flag node)
  REG=await import(new URL('../src/probes/rows.js', import.meta.url).href);
  ({ loadReport }=await import(new URL('../src/scaleload.js', import.meta.url).href));
  LIC=await import(new URL('./check-licences.mjs', import.meta.url).href);   // LIC1: the licence register (text only, no app code)
  LAT=await import(new URL('../src/core/latency.js', import.meta.url).href);
  HS=await import(new URL('../src/core/handsched.js', import.meta.url).href);   // LAT2: the search schedule (pure core)
  CL=await import(new URL('../src/core/camlight.js', import.meta.url).href);    // LAT3: low light (pure core)
  DSP=await import(new URL('../src/core/dsp.js', import.meta.url).href);   // SND-F1: the pure DSP core (Night forest IR, dynamics curve)   // LAT1: the pure core (no DOM, no Web Audio — runs in node)
}catch(e){ out('[probe-data] ERROR loading the data modules: '+String(e&&e.stack||e)); verdict(false,'the data modules did not load'); process.exit(1); }
const loadMs=Math.round(performance.now()-T00);

// PROBE1: the browser's data rows come from the registry (same names, runs and reads as P.all, in its order); then the node-only rows
const ROWS=[
  ...REG.rows({ node:true }).map(r=>[r.name, r.run, r.read]),
  ['LIC1 licence register',     ()=>LIC.run(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT1 latency stats (core)', ()=>latCore(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['SND-F1 Night forest IR (core)', ()=>forestCore(),   r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT2 search schedule (core)', ()=>schedCore(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT3 low light (core)',     ()=>lowCore(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
];

out(`[probe-data] running ${ROWS.length} checks (40 s to 2 min, depending on the machine; T2 is the longest) — one line per check as it finishes`);
const keep={ log:console.log, warn:console.warn, table:console.table, info:console.info }, mute=()=>{};
const rows=[], lists=[];
for(const [name,run,read] of ROWS){
  const t0=performance.now(); let row;
  if(!verbose){ console.log=console.warn=console.table=console.info=mute; }
  try{ let res=run(); if(res && typeof res.then==='function') res=await res;
       const x=read(res); row={ check:name, cases:x.cases, differences:x.diff }; if(x.diff) lists.push([name, x.list||[]]); }
  catch(err){ row={ check:name, cases:'—', differences:'ERROR' }; lists.push([name,[String(err&&err.stack||err)]]); }
  finally{ Object.assign(console,keep); }
  row.ms=Math.round(performance.now()-t0);
  row.status= row.differences===0 ? 'pass' : 'FAIL';
  rows.push(row);
  out(`[probe-data] ${row.status==='pass'?'pass':'FAIL'} · ${name} · ${row.cases} cases · ${row.differences} differences · ${row.ms} ms`);
}
console.table(rows);
for(const [name,list] of lists){ console.warn(`[probe-data] ${name}: first differences`); list.slice(0,5).forEach(m=>console.warn('   '+m)); }
const problems=loadReport.problems||[];
if(problems.length){ console.warn(`[probe-data] data files: ${problems.length} problem(s) — a broken file is skipped by the loader`); problems.slice(0,10).forEach(m=>console.warn(`   ${m.file} — ${m.why}`)); }
if(loadReport.emergency) console.warn('[probe-data] data files: the loader fell back to the EMERGENCY PAIR — data/ could not be read');
const regBad=REG.rowProblems();   // PROBE1: duplicate names, shared places, bad shapes in the registry
if(regBad.length){ console.warn(`[probe-data] probe rows registry: ${regBad.length} problem(s)`); regBad.slice(0,5).forEach(m=>console.warn('   '+m)); }
const nDiff=regBad.length+rows.reduce((n,r)=>n+(typeof r.differences==='number'?r.differences:1),0);
const pass=nDiff===0 && !problems.length && !loadReport.emergency;
verdict(pass, `${rows.length} checks, ${nDiff} differences, data files ${loadReport.files} (${problems.length} problems) · load ${loadMs} ms · total ${((performance.now()-T00)/1000).toFixed(1)} s`);
