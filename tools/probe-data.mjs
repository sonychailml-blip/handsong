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
let P, loadReport;
try{
  P=await import(new URL('../src/probedata.js', import.meta.url).href);
  ({ loadReport }=await import(new URL('../src/scaleload.js', import.meta.url).href));
}catch(e){ out('[probe-data] ERROR loading the data modules: '+String(e&&e.stack||e)); verdict(false,'the data modules did not load'); process.exit(1); }
const loadMs=Math.round(performance.now()-T00);

// те же чтения итога, что в ALL_RUNS у scaleprobe.js (имена строк — те же)
const ROWS=[
  ['T0 data',                   ()=>P.checkData(),      r=>({ cases:r.checks, diff:r.mismatches.length, list:r.mismatches })],
  ['T1 pitch',                  ()=>P.checkPitch(),     r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['T2 view',                   ()=>P.checkView(),      r=>({ cases:r.checks+r.cases, diff:r.total, list:r.mismatches })],
  ['T6b untyped chords (sweep)',()=>P.checkUntyped(),   r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['stacked chords',            ()=>P.checkStack(),     r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['F4 behaviour as data',      ()=>P.checkBehaviour(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['ED4 degrees (sweep)',       ()=>P.checkDegrees(),   r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['OWN1 modes by degrees (sweep)', ()=>P.checkModeMap(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
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
const nDiff=rows.reduce((n,r)=>n+(typeof r.differences==='number'?r.differences:1),0);
const pass=nDiff===0 && !problems.length && !loadReport.emergency;
verdict(pass, `${rows.length} checks, ${nDiff} differences, data files ${loadReport.files} (${problems.length} problems) · load ${loadMs} ms · total ${((performance.now()-T00)/1000).toFixed(1)} s`);
