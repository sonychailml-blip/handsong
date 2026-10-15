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
let P, loadReport, LIC, LAT, DSP;
/* LAT1: the latency core's arithmetic, exactly — statistics, the ring window, the hand → sound sum, the Bluetooth heuristic */
function latCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  const s=LAT.statsOf(Array.from({ length:100 },(_,i)=>i+1));
  eq('statsOf 1..100', [s.n,s.mean,s.p5,s.p50,s.p95,s.jitter,s.max], [100,50.5,5,50,95,90,100]);
  eq('statsOf []', Number.isNaN(LAT.statsOf([]).mean), true);
  const M=LAT.makeMeter(4); for(const x of [1,2,3,4,5,6]) M.add('a',x); M.add('a',NaN);
  const m=M.stats('a'); eq('ring of 4 after 6 (+ one NaN ignored)', [m.n,m.kept,m.mean,m.max,M.count('a')], [6,4,4.5,6,6]);
  eq('unknown stage', [M.count('b'), M.stats('b').kept], [0,0]);
  eq('hand → sound, all parts', LAT.handToSound({ camera:40, detect:12, gestures:1, quantumWait:1.5, base:10, output:20 }), { ms:84.5, missing:[] });
  eq('hand → sound, camera unknown', LAT.handToSound({ camera:NaN, detect:12, gestures:1, quantumWait:1.5, base:10, output:20 }), { ms:44.5, missing:['camera'] });
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
  return { cases:17+bt.length, total:d.length, differences:d };
}
/* SND-F1: the Night forest IR of the pure core — the same twice and pinned per rate (44.1 / 48 kHz), its length, its envelope sample by
   sample against an independent writing of the recipe, the spec's normalisation arithmetic. CONTROLS: exponent 2.5 and another seed differ. */
const FOREST_HASH={ 44100:'e3971e11', 48000:'68fc1b7c' };
function forestCore(){
  const d=[], eq=(name,got,want)=>{ if(JSON.stringify(got)!==JSON.stringify(want)) d.push(`${name}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`); }; let n=0;
  const recipe=(rate,pow,seeds)=>{ const len=Math.round(rate*3.4); return seeds.map(sd=>{ const r=DSP.seeded(sd), a=new Float32Array(len); for(let i=0;i<len;i++) a[i]=(r()*2-1)*Math.pow(1-i/len,pow); return a; }); };
  for(const rate of [44100,48000]){
    const a=DSP.forestIR(rate), b=DSP.forestIR(rate);
    n++; eq(`${rate}: generated twice`, DSP.f32Hash(a), DSP.f32Hash(b));
    n++; eq(`${rate}: pinned hash`, DSP.f32Hash(a), FOREST_HASH[rate]);
    n++; eq(`${rate}: stereo, 3.4 s`, [a.length, a[0].length, a[1].length], [2, Math.round(rate*3.4), Math.round(rate*3.4)]);
    n++; eq(`${rate}: envelope (1 − i/len)^2.6 sample by sample`, DSP.f32Hash(recipe(rate,2.6,DSP.FOREST.seeds)), DSP.f32Hash(a));
    n++; eq(`${rate}: channels independent`, DSP.f32Hash([a[0]])!==DSP.f32Hash([a[1]]), true);
    n++; if(DSP.f32Hash(recipe(rate,2.5,DSP.FOREST.seeds))===DSP.f32Hash(a)) d.push(`CONTROL ${rate}: exponent 2.5 gave the same IR — the envelope check cannot fail`);
    n++; if(DSP.f32Hash(recipe(rate,2.6,DSP.FOREST.seeds.map(x=>x+1)))===DSP.f32Hash(a)) d.push(`CONTROL ${rate}: another seed gave the same IR — the hash cannot fail`);
  }
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
  DSP=await import(new URL('../src/core/dsp.js', import.meta.url).href);   // SND-F1: the pure DSP core (Night forest IR, dynamics curve)   // LAT1: the pure core (no DOM, no Web Audio — runs in node)
}catch(e){ out('[probe-data] ERROR loading the data modules: '+String(e&&e.stack||e)); verdict(false,'the data modules did not load'); process.exit(1); }
const loadMs=Math.round(performance.now()-T00);

// PROBE1: the browser's data rows come from the registry (same names, runs and reads as P.all, in its order); then the node-only rows
const ROWS=[
  ...REG.rows({ node:true }).map(r=>[r.name, r.run, r.read]),
  ['LIC1 licence register',     ()=>LIC.run(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT1 latency stats (core)', ()=>latCore(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['SND-F1 Night forest IR (core)', ()=>forestCore(),   r=>({ cases:r.cases, diff:r.total, list:r.differences })],
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
