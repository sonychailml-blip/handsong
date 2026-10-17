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
let P, loadReport, LIC, NIX, LAT, DSP, HS, CL, FMT, IDR, GF, CFG, SONGF;
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
   counter, the low-light constraint sets and verdicts, the capabilities line; CAM-FIX: the restore set, heal list and verification of the
   webcam's own settings. CONTROLS: a hint without its 3-s wait, a counter without its 1-s limit, and the pre-fix Off (which leaves a camera
   in manual exposure), must each differ from the expectation. */
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
  /* CAM-FIX: restoring the webcam's own settings — capabilities and originals of the user's ASUS webcam (from his meter) */
  const cA={ exposureMode:['continuous','manual'], exposureTime:{ min:39.063, max:1250, step:39.063 }, whiteBalanceMode:['continuous','manual'],
    colorTemperature:{ min:2800, max:6500 }, brightness:{ min:-64, max:64 } };
  const oA={ exposureMode:'continuous', exposureTime:156.25, whiteBalanceMode:'continuous', colorTemperature:4600, brightness:0, contrast:16 };
  const autoBoth=[{ exposureMode:'continuous' },{ whiteBalanceMode:'continuous' }];
  n++; eq('short exposure on the ASUS webcam = 23.44 ms (1/40 s snapped to its step)', CL.lowConstraints('exposure', cA, base).advanced, [{ exposureMode:'manual', exposureTime:234.378 }]);
  n++; eq('restore after short exposure: both automatic modes, no exposure time', CL.restoreConstraints(cA, base, oA, ['exposureMode','exposureTime']), { ...base, advanced:autoBoth });
  n++; eq('restore with nothing touched (an fps test): both automatic modes', CL.restoreConstraints(cA, base, oA, []), { ...base, advanced:autoBoth });
  n++; eq('restore of a touched value without an automatic mode: its original', CL.restoreAdvanced(cA, oA, ['exposureMode','brightness']), [...autoBoth, { brightness:0 }]);
  n++; eq('a camera without automatic exposure: originals back', CL.restoreAdvanced({ exposureMode:['manual'], exposureTime:{ min:1, max:100 } }, { exposureMode:'manual', exposureTime:50 }, ['exposureMode','exposureTime']),
    [{ exposureMode:'manual' },{ exposureTime:50 }]);
  n++; eq("the runner's camera (no white balance): exposure only", CL.restoreAdvanced({ exposureMode:['manual','continuous'] }, {}, ['exposureMode']), [{ exposureMode:'continuous' }]);
  n++; eq('originals = device controls only', CL.devSnap({ width:640, frameRate:30, ...oA, deviceId:'x' }), oA);
  n++; eq('heal at open', [CL.healList(cA, { exposureMode:'manual', whiteBalanceMode:'manual' }), CL.healList(cA, oA), CL.healList({ exposureMode:['manual'] }, { exposureMode:'manual' })],
    [['exposureMode','whiteBalanceMode'], [], []]);
  n++; eq('still manual after asking automatic', [CL.autoLeft(autoBoth, { exposureMode:'manual', whiteBalanceMode:'continuous' }), CL.autoLeft([...autoBoth, { brightness:0 }], oA)], [['exposureMode'], []]);
  /* the user's path: short exposure, then a frame-rate test, then Off — through a minimal UVC device whose controls persist */
  const uvc=()=>({ ...oA }), put=(dev, set)=>{ for(const e of set.advanced||[]){ if(!Object.keys(e).every(k=>k in cA)) continue; Object.assign(dev, e); if('exposureTime' in e && !('exposureMode' in e)) dev.exposureMode='manual'; } return dev; };
  const path=offSet=>{ const dev=uvc(); put(dev, CL.lowConstraints('exposure', cA, base)); put(dev, CL.lowConstraints('fps15', cA, base)); put(dev, offSet); return dev.exposureMode; };
  n++; eq('short exposure → 15 fps → Off: automatic again', path(CL.restoreConstraints(cA, base, oA, ['exposureMode','exposureTime'])), 'continuous');
  n++; { const dn=d.length; eq('CONTROL (must differ)', path(CL.lowConstraints('off', cA, base, 'fps15')), 'continuous');
    if(d.length===dn) d.push('CONTROL: the pre-fix Off brought the simulated camera back to automatic — the check cannot fail'); else d.length=dn; }
  /* 0a: our own test record — originals of the first change kept, touched keys united; repair only for this camera's record */
  const r1=CL.testRecNext(null, { label:'ASUS', dev:'d1', orig:oA, touched:['exposureMode','exposureTime'] }), r2=CL.testRecNext(r1, { label:'x', dev:'d2', orig:{ exposureMode:'manual' }, touched:['brightness'] });
  n++; eq('test record: first originals kept, touched united', [r2.label, r2.dev, r2.orig, r2.touched], ['ASUS', 'd1', oA, ['exposureMode','exposureTime','brightness']]);
  n++; eq('repair from our record = the restore set', CL.testRecRepair(cA, r1, { deviceId:'d1' }), autoBoth);
  n++; eq('no record / a broken one / another camera: nothing', [CL.testRecRepair(cA, null, {}), CL.testRecRepair(cA, { v:1 }, {}), CL.testRecRepair(cA, r1, { deviceId:'d9' })], [null, null, null]);
  n++; { const dn=d.length; eq('CONTROL (must differ)', CL.testRecRepair(cA, r1, { deviceId:'d9' }), autoBoth);
    if(d.length===dn) d.push('CONTROL: a record of another camera was applied — the device check cannot fail'); else d.length=dn; }
  /* 0b: why a camera did not start */
  const ek=(name,message='')=>CL.camErrKind({ name, message });
  n++; eq('camera error kinds', [ek('NotReadableError'), ek('AbortError','Timeout starting video source'), ek('TimeoutError'), ek('TrackStartError'),
    ek('NotFoundError','Requested device not found'), ek('DevicesNotFoundError'), ek('OverconstrainedError'), ek('NotAllowedError'), ek('PermissionDeniedError'),
    ek('SecurityError'), ek('TypeError'), ek('Error','Could not start video source'), CL.camErrKind(null)],
    ['busy','busy','busy','busy','notfound','notfound','notfound','denied','denied','denied','other','busy','other']);
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
/* FMT1: the file-format core (envelope versions, migrations) and the permanent-id registry (src/core/format.js, src/core/registry.js),
   exactly. CONTROLS: a registry that destroys a built-in, and a version check that lets a newer file through, must be caught. */
async function fmtCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const throwsWith=(f,re)=>{ try{ f(); return 'no refusal'; }catch(e){ return re.test(String(e&&e.message)) ? 'ok' : String(e&&e.message); } };
  const rec=JSON.parse(await readFile(new URL('../data/tunings/edo12.json', import.meta.url),'utf8'));
  eq('a v1 tuning passes', throwsWith(()=>FMT.checkTuning(rec,'edo12'),/./), 'no refusal');
  eq('a NEWER version is refused in words', throwsWith(()=>FMT.checkTuning({...rec, version:2},'edo12'),/newer Handsong \(file version 2; this one reads up to 1\)/), 'ok');
  eq('version 0 keeps the old words', throwsWith(()=>FMT.checkTuning({...rec, version:0},'edo12'),/^version must be 1$/), 'ok');
  eq('upgrade of a current record is the same object', FMT.upgrade(rec)===rec, true);
  eq('upgrade of a newer record leaves it', FMT.upgrade({...rec, version:5}).version, 5);
  { const keepV=FMT.FORMAT_VERSION.tuning, keepM=FMT.MIGRATIONS.tuning;   // the migration mechanism, with a test step (restored)
    try{ FMT.FORMAT_VERSION.tuning=2; FMT.MIGRATIONS.tuning=[r=>({ ...r, migrated:true })];
      const u=FMT.upgrade(rec); eq('a v1 → v2 step runs on a copy', [u.version, u.migrated, rec.version, rec.migrated], [2, true, 1, undefined]);
      FMT.MIGRATIONS.tuning=[]; eq('a missing step leaves the record (the validator words it)', FMT.upgrade(rec)===rec, true);
      eq('CONTROL: with v2 current, a v1 file without a step is refused', throwsWith(()=>FMT.checkTuning(rec,'edo12'),/version must be 2/), 'ok');
    } finally { FMT.FORMAT_VERSION.tuning=keepV; FMT.MIGRATIONS.tuning=keepM; } }
  eq('id spaces', ['firefly','solo.supersaw','u.1b4e28ba-2fa1-41d2-883f-0016d3cca427','mypack/warm-pad','Firefly','u.x',''].map(IDR.idSpace),
     ['builtin','builtin','user','pack',null,null,null]);
  { let k=0; const id=IDR.newUserId(()=>Uint8Array.from({length:16},()=>(k+=37)&255)); eq('a generated user id is in the user space', IDR.idSpace(id), 'user'); }
  eq('crypto user ids differ', IDR.newUserId()!==IDR.newUserId(), true);
  /* the ID model as assertions over any registry (run on the real one, then on a defective one that must fail) */
  const suite=R=>{ const f=[]; const ok=(c,w)=>{ if(!c) f.push(w); };
    ok(R.add({id:'firefly', name:'Firefly'},{builtin:true})===null,'add a built-in');
    ok(R.add({id:'warm-pad', name:'Warm pad'},{builtin:true})===null,'add a second built-in');
    ok(R.add({id:'u.1b4e28ba-2fa1-41d2-883f-0016d3cca427', name:'Mine'})===null,'add a user record');
    ok(R.add({id:'firefly'},{builtin:true})!==null,'a duplicate id is refused');
    ok(R.add({id:'u.1b4e28ba-2fa1-41d2-883f-0016d3cca427'},{builtin:true})!==null,'a built-in with a user id is refused');
    ok(R.add({id:'my-own'})!==null,'a user record with a built-in id is refused');
    ok(R.remove('firefly')!==null && R.has('firefly'),'a built-in is never removed');
    ok(R.hide('firefly')===null && R.has('firefly') && R.get('firefly').name==='Firefly' && !R.order().includes('firefly'),'a hidden built-in stays readable');
    ok(R.rename('warm-pad','Pad')===null && R.get('warm-pad').name==='Pad' && R.order()[0]==='warm-pad','rename keeps id and place');
    ok(R.setOrder(['u.1b4e28ba-2fa1-41d2-883f-0016d3cca427','nope'])===null && JSON.stringify(R.order())===JSON.stringify(['u.1b4e28ba-2fa1-41d2-883f-0016d3cca427','warm-pad']),'the order is the person\'s list (unknown ids dropped)');
    ok(R.remove('u.1b4e28ba-2fa1-41d2-883f-0016d3cca427')===null && !R.has('u.1b4e28ba-2fa1-41d2-883f-0016d3cca427'),'a user record can be removed');
    ok(R.show('firefly')===null && R.order().includes('firefly'),'show brings a hidden one back');
    return f; };
  const real=suite(IDR.createRegistry('timbre')); n+=12; for(const w of real) d.push('registry: '+w);
  { const B=IDR.createRegistry('timbre'), base=B.remove.bind(B); B.remove=id=>B.isBuiltin(id) ? (B.hide(id), null) : base(id);   // CONTROL: «removing» a built-in silently (reports done)
    n++; if(!suite(B).length) d.push('CONTROL: a registry that answers «removed» for a built-in passed — the suite cannot fail'); }
  return { cases:n, total:d.length, differences:d };
}
/* GES1: the pure gesture math (src/gestures/features.js), exactly, against the config thresholds. CONTROLS: the hysteresis switched off
   (an empty previous set) must drop a held finger; the HAND1 pinch control (+0.03) must let a value between PINCH_ON and +0.03 in. */
function gesCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const { PINCH_ON, PINCH_OFF, FINGER_TIPS, ROW_HYST, PAL_HYST_X, PAL_HYST_Y }=CFG;
  /* a hand of 21 points: wrist (0) at the origin, index base (5) at distance 0.1 — the palm size; thumb tip (4) at (0.5, 0.5);
     finger tips placed so that their ratio to the palm size is exactly r[i] */
  const hand=r=>{ const lm=Array.from({length:21},()=>({x:0.9,y:0.9})); lm[0]={x:0,y:0}; lm[5]={x:0.1,y:0}; lm[4]={x:0.5,y:0.5};
    FINGER_TIPS.forEach((f,i)=>{ lm[f]={ x:0.5+r[i]*0.1, y:0.5 }; }); return lm; };
  const R=[PINCH_ON*0.25, PINCH_ON-0.01, (PINCH_ON+PINCH_OFF)/2, PINCH_OFF+0.05], pr=GF.pinchRatios(hand(R));
  eq('pinch ratios = tip distance / palm size', FINGER_TIPS.map(f=>+pr[f].toFixed(9)), R.map(x=>+x.toFixed(9)));
  eq('nearest finger', GF.minFinger(pr), [FINGER_TIPS[0], pr[FINGER_TIPS[0]]]);
  eq('touched from nothing: below PINCH_ON only', [...GF.touchedFingers(pr,new Set())].sort(), [0,1]);
  eq('held between ON and OFF stays (hysteresis)', [...GF.touchedFingers(pr,new Set([0,1,2,3]))].sort(), [0,1,2]);
  { const held=GF.touchedFingers(pr,new Set([2])), none=GF.touchedFingers(pr,new Set());
    n++; if(held.has(2)===none.has(2)) d.push('CONTROL: without the previous set the held finger 2 should drop — the hysteresis check cannot fail'); }
  GF.pinchDbg(0.03); try{ const R2=[PINCH_ON+0.02,1,1,1]; eq('CONTROL: the pinch control lets ON+0.02 in', [...GF.touchedFingers(GF.pinchRatios(hand(R2)),new Set())], [0]); }
  finally{ GF.pinchDbg(0); }
  eq('…and without it the same value stays out', [...GF.touchedFingers(GF.pinchRatios(hand([PINCH_ON+0.02,1,1,1])),new Set())], []);
  eq('smoothstep dead zones (exactly 0 / 1) and middle', [GF.smoothstep(0.2,0.6,0.1), GF.smoothstep(0.2,0.6,0.2), +GF.smoothstep(0.2,0.6,0.4).toFixed(12), GF.smoothstep(0.2,0.6,0.7), GF.smoothstep(0.5,0.5,0.5)], [0,0,0.5,1,1]);
  { const S={ sm:{} }; eq('one-step smoothing', [GF.emaS(S,'k',1), GF.emaS(S,'k',0), GF.emaS(S,'k',0,0.5)], [1, 1-0.35, (1-0.35)*0.5]); }
  const H=700, rows=7, seg=H/rows;
  eq('degree rows: top is the highest degree', [GF.degRaw(0,rows,H), GF.degRaw(H-1,rows,H), GF.degRaw(-5,rows,H), GF.degRaw(H+5,rows,H)], [6,0,6,0]);
  { const b=4*seg, inside=b+seg*ROW_HYST*0.5, outside=b+seg*ROW_HYST*1.5;   // the border between degree 2 (below) and 3 (above)
    eq('degree hysteresis near a border keeps the previous degree', [GF.degHyst(inside,rows,H,3), GF.degHyst(outside,rows,H,3)], [3,2]); }
  { const fams=[{types:[1,2,3]},{types:[1]}], W=200, Hh=300;
    eq('palette cell: column then its own rows', GF.cellHyst(150,250,0,W,0,Hh,fams,-1,-1), [1,0]);
    eq('palette cell hysteresis', GF.cellHyst(100+100*PAL_HYST_X*0.5, 10, 0,W,0,Hh,fams,0,0), [0,0]);
    eq('palette row hysteresis', GF.cellHyst(10, 100+100*PAL_HYST_Y*0.5, 0,W,0,Hh,fams,0,0), [0,0]); }
  eq('clamps and distance', [GF.clamp01(-1), GF.clamp01(2), GF.clamp(5,0,3), GF.dist({x:0,y:0},{x:3,y:4})], [0,1,3,5]);
  return { cases:n, total:d.length, differences:d };
}
/* UI1b: the icon component — every «{i:name}» token in the dictionaries and every data-icon of the markup names a known icon; no
   «icon» glyph is written directly in a dictionary; t() leaves no token behind. CONTROL: an unknown name must be caught. */
async function iconCore(){
  const d=[]; let n=0; const IC=await import(new URL('../src/icons.js', import.meta.url).href), I18=await import(new URL('../src/i18n.js', import.meta.url).href);
  const fs=await import('node:fs'), reg=JSON.parse(fs.readFileSync(new URL('./licences.json', import.meta.url),'utf8'));
  const iconGlyphs=new Set(reg.glyphs.filter(g=>g.kind==='icon').map(g=>g.ch));
  const tokErr=(where,s)=>{ for(const m of String(s).matchAll(/\{i:([\w-]+)\}/g)){ n++; if(!(m[1] in IC.ICONS)) d.push(`${where}: unknown icon «${m[1]}»`); } };
  for(const L of I18.LANGS) for(const [k,v] of Object.entries(I18.DICTS[L])){ tokErr(`${L} ${k}`, v); n++;
    if([...String(v)].some(c=>iconGlyphs.has(c))) d.push(`${L} ${k}: an icon glyph written directly — use {i:name}`);
    const out=I18.withLang(L,()=>I18.t(k)); if(String(out).includes('{i:')) d.push(`${L} ${k}: t() left a token: ${out}`); }
  for(const [name,g] of Object.entries(IC.ICONS)){ n++; if(![...g].every(c=>iconGlyphs.has(c))) d.push(`icon ${name} «${g}»: not an «icon» glyph of the register`); }
  const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
  for(const m of html.matchAll(/data-icon="([^"]*)"/g)){ n++; const v=m[1]; if(v.includes('{i:')) tokErr('index.html data-icon', v); else if(!(v in IC.ICONS)) d.push(`index.html data-icon «${v}»: unknown icon`); }
  { const before=d.length; tokErr('CONTROL', '{i:no-such-icon}'); if(d.length===before) d.push('CONTROL: an unknown icon name was not caught'); else d.pop(); }
  return { cases:n, total:d.length, differences:d };
}
/* SAVE1: the song file's pure core (src/core/songfile.js) — reading a text (size cap, JSON only, forbidden keys, nesting, version
   rules), the v1 → v2 migration (timbre positions → ids; idempotent; the input untouched) and the strict check (a minimal valid record
   passes; each damage is caught). CONTROLS: the minimal record must pass (an over-strict check cannot pass it) and each damage must fail. */
function songCore(){
  const d=[]; let n=0; const SF=SONGF, eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const ok={ format:SF.SONG_FORMAT, version:SF.SONG_VERSION, name:'t', settings:{ aRef:440, bpm:90, metre:4, bars:2, sub:4, quant:true, master:0.8,
      brace:{ user:false, from:0, to:4, on:false }, live:{ scaleId:'major', tonic:0, tonicCents:0, tunedFrom:'T' } },
    views:[{ mode:'major', key:0 }], timbres:{ 'chord.firefly':{ role:'ch', name:'Firefly', def:{ id:'chord.firefly' } } },
    records:{ tuning:{ 'u.5013a000-0000-4000-8000-0000000000aa':{ format:'handsong/tuning', version:1, id:'u.5013a000-0000-4000-8000-0000000000aa' } } },
    tracks:[{ layer:0 }], takes:[{ tk:1, kinds:{}, chains:{}, lane:[] }], marks:[{ id:1, beat:0, name:'A' }],
    events:[{ t:0, layer:0, fn:'chOn', a:{ ti:0, oct:1, vol:0.5, inst:'chord.firefly' }, v:0, sev:false, tk:1 }, { t:1, layer:0, fn:'chOff', a:{}, v:0, sev:false, tk:1 }] };
  const txt=JSON.stringify(ok);
  eq('a valid record parses', SF.songParse(txt).ok, true);
  eq('a valid record passes the check (CONTROL: not over-strict)', SF.songCheck(SF.songParse(txt).rec), []);
  eq('not text', SF.songParse(42).why, 'notText');
  eq('too big', SF.songParse(' '.repeat(SF.SONG_MAX_BYTES+1)).why, 'tooBig');
  eq('not JSON', SF.songParse(txt.slice(0,-3)).why, 'notJson');
  eq('a «__proto__» key', SF.songParse(txt.replace('"settings":{','"settings":{"__proto__":{"x":1},')).why, 'badKey');
  eq('a «constructor» key', SF.songParse(txt.replace('"name":"t"','"constructor":1,"name":"t"')).why, 'badKey');
  { let deep='0'; for(let i=0;i<40;i++) deep='['+deep+']'; eq('nested too deep', SF.songParse(txt.replace('"name":"t"','"name":"t","x":'+deep)).why, 'tooDeep'); }
  eq('not a song', SF.songParse(JSON.stringify({ format:'handsong/tuning', version:1 })).why, 'notSong');
  eq('no version', SF.songParse(JSON.stringify({ ...ok, version:undefined })).why, 'noVersion');
  { const r=SF.songParse(JSON.stringify({ ...ok, version:SF.SONG_VERSION+1 })); eq('a newer version is refused with its number', [r.why, r.version], ['newer', SF.SONG_VERSION+1]); }
  { const v1=JSON.parse(txt); v1.version=1; delete v1.timbres; v1.events[0].a.inst=16; v1.events.push({ t:2, layer:0, fn:'drum', a:{ row:0, vol:0.5, kit:2 }, v:-1, sev:false, tk:1 });
    const keep=JSON.stringify(v1), u=SF.songUpgrade(v1), u2=SF.songUpgrade(JSON.parse(JSON.stringify(u)));
    eq('v1 → v2: positions → ids (frozen TIM1 table)', [u.version, u.events[0].a.inst, u.events[2].a.kit], [SF.SONG_VERSION, 'chord.firefly', 'kit.tabla']);
    { const v3={ ...JSON.parse(txt), version:3 }, u3=SF.songUpgrade(v3); eq('v3 → v4 → v5 (IDS1): nothing rewritten, the version raised', [u3.version, JSON.stringify(u3.events), JSON.stringify(u3.takes)], [SF.SONG_VERSION, JSON.stringify(v3.events), JSON.stringify(v3.takes)]); }
    { const w=JSON.parse(txt); w.takes[0].lane=[{ t:0, key:'role:ch', fx:'reverb', p:'mix', v:0.2, id:1 }, { t:1, key:'role:ch', fx:'reverb', p:'mix', v:0.4, id:2 }]; eq('IDS1 part 2: lane points with fresh ids pass the check', SF.songCheck(w), []); }
    { const w=JSON.parse(txt); w.events[0].id=1; w.events[1].id=2; eq('IDS1: events with fresh ids pass the check (CONTROL: not over-strict)', SF.songCheck(w), []); }
    { const w=JSON.parse(txt); w.tracks=[{ layer:0, id:9 }]; eq('CMD1b: a track with a fresh id passes the check (CONTROL: not over-strict)', SF.songCheck(w), []); }
    { const v6={ ...JSON.parse(txt), version:6 }, keep6=JSON.stringify(v6), u6=SF.songUpgrade(v6), u6b=SF.songUpgrade(JSON.parse(JSON.stringify(u6)));
      eq('v6 → v7 (CMD1b): nothing rewritten, the version raised', [u6.version, JSON.stringify(u6.tracks), JSON.stringify(u6.events)], [7, JSON.stringify(v6.tracks), JSON.stringify(v6.events)]);
      eq('v6 → v7: idempotent, the opened record untouched', [JSON.stringify(u6b), JSON.stringify(v6)], [JSON.stringify(u6), keep6]); }
    eq('v2 → v3 (SONG1): records kept, or an empty set where an older file had none', [JSON.stringify(u.records), JSON.stringify(SF.songUpgrade({ ...JSON.parse(txt), version:2, records:undefined }).records)], [JSON.stringify(v1.records), '{}']);
    eq('the upgrade is idempotent', JSON.stringify(u2), JSON.stringify(u));
    eq('the upgrade leaves its input untouched', JSON.stringify(v1), keep);
    eq('an upgraded record passes the check', SF.songCheck(u), []);
    eq('a current record goes through unchanged (the same object)', SF.songUpgrade(ok)===ok, true); }
  eq('the frozen table holds the positions of TIM1 (chord 16 = Firefly, solo 0 = SuperSaw, kit 4 = Taiko)', [SF.TIM1_POSITIONS.ch[16], SF.TIM1_POSITIONS.ld[0], SF.TIM1_POSITIONS.dr[4]], ['chord.firefly','solo.supersaw','kit.taiko']);
  const dmg=[['an event on a missing track', r=>{ r.events[0].layer=7; }], ['a timbre stored as a number', r=>{ r.events[0].a.inst=3; }],
    ['a volume above 1', r=>{ r.events[0].a.vol=2; }], ['a view index out of range', r=>{ r.events[0].v=5; }], ['tempo 0', r=>{ r.settings.bpm=0; }],
    ['a brace that ends before it starts', r=>{ r.settings.brace.from=8; }], ['an unknown event kind', r=>{ r.events[0].fn='eval'; }],
    ['a take number 0', r=>{ r.takes[0].tk=0; }], ['A4 of 1000 Hz', r=>{ r.settings.aRef=1000; }], ['a track twice', r=>{ r.tracks.push({ layer:0 }); }],
    ['SONG1: no records set', r=>{ delete r.records; }], ['SONG1: a record kind that does not exist', r=>{ r.records.script={}; }],
    ['SONG1: a copy under a built-in id', r=>{ r.records.tuning={ edo12:{ format:'handsong/tuning', version:1, id:'edo12' } }; }],
    ['SONG1: a copy whose id differs from its key', r=>{ r.records.tuning['u.5013a000-0000-4000-8000-0000000000aa'].id='u.5013a000-0000-4000-8000-0000000000ab'; }],
    ['SONG1: a copy of the wrong kind', r=>{ r.records.tuning['u.5013a000-0000-4000-8000-0000000000aa'].format='handsong/mode'; }],
    ['IDS1: two events with one id', r=>{ r.events[0].id=7; r.events[1].id=7; }], ['IDS1: an event id that is not a positive integer', r=>{ r.events[0].id=-1; }],
    ['IDS1 part 2: two lane points with one id', r=>{ r.takes[0].lane=[{ t:0, key:'role:ch', fx:'reverb', p:'mix', v:0.2, id:3 }, { t:1, key:'role:ch', fx:'reverb', p:'mix', v:0.4, id:3 }]; }],
    ['IDS1 part 2: a lane point id that is not an integer', r=>{ r.takes[0].lane=[{ t:0, key:'role:ch', fx:'reverb', p:'mix', v:0.2, id:1.5 }]; }],
    ['CMD1b: two tracks with one id', r=>{ r.tracks=[{ layer:0, id:4 }, { layer:1, id:4 }]; }], ['CMD1b: a track id that is not a positive integer', r=>{ r.tracks[0].id=0; }]];
  for(const [what,mut] of dmg){ n++; const r=JSON.parse(txt); mut(r); if(!SF.songCheck(r).length) d.push(`damage not caught: ${what}`); }
  return { cases:n, total:d.length, differences:d };
}
/* CMD1a: canonical JSON (src/core/canon.js) — equal values give equal text whatever the key order or object identity; −0 = 0; a number
   is written exactly; arrays keep their order; undefined is dropped. CONTROLS: a changed number, a changed array order and a changed key
   must each give another hash. */
async function canonCore(){
  const d=[]; let n=0; const C=await import(new URL('../src/core/canon.js', import.meta.url).href);
  const eq=(what,a,b)=>{ n++; if(a!==b) d.push(`${what}: ${a} vs ${b}`); }, ne=(what,a,b)=>{ n++; if(a===b) d.push(`CONTROL: ${what} gave the same text ${a}`); };
  const A={ b:[1,2,{ y:0.1, x:-0 }], a:'s', u:undefined, n:null }, B={ n:null, a:'s', b:[1,2,{ x:0, y:0.1 }] };
  eq('key order and −0 do not matter', C.canonJSON(A), C.canonJSON(B));
  eq('the canonical text', C.canonJSON(A), '{"a":"s","b":[1,2,{"x":0,"y":0.1}],"n":null}');
  eq('a JSON round trip keeps it', C.canonJSON(JSON.parse(JSON.stringify(A))), C.canonJSON(A));
  eq('a number written exactly', C.canonJSON(0.1+0.2), '0.30000000000000004');
  eq('a non-finite number → null', C.canonJSON([NaN, Infinity]), '[null,null]');
  eq('a Map → pairs in order', C.canonJSON(new Map([[2,'b'],[1,'a']])), '[[2,"b"],[1,"a"]]');
  eq('the hash of equal values', C.canonHash(A), C.canonHash(B));
  ne('a changed number', C.canonJSON({ a:1 }), C.canonJSON({ a:1.000001 }));
  ne('a changed array order', C.canonJSON([1,2]), C.canonJSON([2,1]));
  ne('a changed key', C.canonHash({ a:1 }), C.canonHash({ b:1 }));
  return { cases:n, total:d.length, differences:d };
}
/* AUD1c + AUD2a / review R2: the timbre data and the effect declarations moved into the shared engine submodules (src/modules/, src/engine/) are PURE DATA — numbers, strings,
   booleans, plain arrays and objects (no node, buffer, port or function), deep-frozen (a write would throw in BOTH engine copies, which
   share these modules). The modules load in node: nothing at their top level touches Web Audio (rule #38). CONTROLS: a table holding a
   function and an unfrozen table must both be caught. */
async function timbreData(){
  const d=[]; let n=0;
  const imp=f=>import(new URL('../src/modules/timbres/'+f, import.meta.url).href);
  const pure=(x,path,out)=>{ if(x===null || ['number','string','boolean'].includes(typeof x)) return;
    if(typeof x!=='object'){ out.push(`${path}: a ${typeof x}`); return; }
    const pr=Object.getPrototypeOf(x); if(pr!==Object.prototype && pr!==Array.prototype){ out.push(`${path}: a ${x.constructor && x.constructor.name}`); return; }
    if(!Object.isFrozen(x)) out.push(`${path}: not frozen`);
    for(const k of Object.keys(x)) pure(x[k], path+'.'+k, out); };
  const M={}; for(const f of ['stages.js','voice.js','fm.js','ks.js','subtractive.js','chord-voice.js','bass-voice.js','drumkits.js']){ n++;
    try{ M[f]=await imp(f); }catch(e){ d.push(`${f} does not load in node (a top-level Web Audio use?): ${e && e.message}`); } }
  for(const f of ['param.js','reverb.js','delay.js','trem-mix.js','bright.js','glide.js','volume.js','forest.js','glue.js']){ n++;   // AUD2a: the effects
    try{ M['fx/'+f]=await import(new URL('../src/modules/effects/'+f, import.meta.url).href); }catch(e){ d.push(`effects/${f} does not load in node: ${e && e.message}`); } }
  n++; try{ M['fdn']=await import(new URL('../src/engine/fdn.js', import.meta.url).href); }catch(e){ d.push(`engine/fdn.js does not load in node: ${e && e.message}`); }
  for(const [f,name] of [['chord-voice.js','FIREFLY'],['stages.js','BRI_HZ'],['fdn','REV_A'],['fx/reverb.js','REV_PARAMS'],['fx/delay.js','DLY_A'],
      ['fx/delay.js','DLY_PARAMS'],['fx/trem-mix.js','TRMIX_A'],['fx/trem-mix.js','TRMIX_PARAMS'],['fx/bright.js','BRIGHT_PARAMS'],['fx/glide.js','GLIDE_PARAMS'],
      ['fx/volume.js','VOL_PARAMS'],['fx/forest.js','FOREST_PARAMS'],['fx/glue.js','GLUE_PARAMS']]){ n++; const v=M[f] && M[f][name];
    if(!v){ d.push(`${f}: ${name} missing`); continue; } const out=[]; pure(v,name,out); d.push(...out); }
  { n++; const out=[]; pure(Object.freeze([Object.freeze({ f:()=>1 })]),'ctl',out); if(!out.length) d.push('CONTROL: a function inside a table was not caught'); }
  { n++; const out=[]; pure([{ a:1 }],'ctl2',out); if(!out.length) d.push('CONTROL: an unfrozen table was not caught'); }
  return { cases:n, total:d.length, differences:d };
}
/* PACK1: packs and offline licence keys (src/core/pack.js) — node's WebCrypto, no network. The SHIPPED test public key verifies the committed
   fixture keys (tools/pack-test-licence.json, signed by the git-ignored test private key); a fresh key pair made here signs the tamper cases:
   a changed payload, a changed signature, an unknown key id, a newer key format, an expired key, a key for another pack — each refused in
   words; malformed texts refused; the gate keeps a pack's records out of a registry's order until the pack is unlocked; a free pack opens
   without a key. CONTROLS: a valid key must PASS (a verifier refusing everything cannot pass the refusal cases); a gate that never locks
   must be caught by the «locked before unlock» case. */
/* TIM3a (RUN 4): the timbre records — every file valid; the bundle equals the files; each T5 bound refuses its damage with one line naming
   the field (CONTROLS); the tine's partial bounds; a record whose policies differ from its family's today is caught by the browser row */
async function timbreCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const T=await import(new URL('../src/core/timbre.js', import.meta.url).href), B=await import(new URL('./timbre-bundle.mjs', import.meta.url).href);
  const b=await B.buildBundle(); n++; if(b.problems.length) miss('files: '+b.problems.slice(0,3).join(' · '));
  let disk=''; try{ disk=await readFile(new URL('../data/timbres.bundle.json', import.meta.url),'utf8'); }catch(e){}
  n++; if(disk.split(String.fromCharCode(13)).join('')!==b.text) miss('data/timbres.bundle.json is not what the files give — run node tools/timbre-bundle.mjs');
  const recs=JSON.parse(b.text).records;
  for(const r of recs){ n++; const why=T.checkTimbre(r); if(why) miss(`${r.id}: ${why}`); }
  const copy=o=>JSON.parse(JSON.stringify(o));
  for(const base of [recs.find(r=>r.engine==='chord2'), recs.find(r=>r.engine==='bass2'), recs.find(r=>r.engine==='tine')].filter(Boolean))
    for(const [name, damage] of T.TIMBRE_DAMAGES){ const r=copy(base), field=damage(r)||name; n++; const why=T.checkTimbre(r);
      if(!why) miss(`CONTROL ${base.id} «${field}»: a damaged record was accepted`);
      else if(field!=='NaN' && !why.includes(field.split(':')[0])) miss(`CONTROL ${base.id} «${field}»: refused, but the line does not name it: ${why}`); }
  const tine=recs.find(r=>r.engine==='tine');
  if(tine) for(const [what, dmg] of [['partials', r=>{ r.recipe.partials=Array(9).fill([1,0.1,0.5,'sine']); }], ['gains sum', r=>{ r.recipe.partials=r.recipe.partials.map(p=>[p[0],1,p[2],p[3]]); }],
      ['decay', r=>{ r.recipe.partials[0][2]=99; }], ['mult', r=>{ r.recipe.partials[0][0]=100; }]]){ const r=copy(tine); dmg(r); n++; if(!T.checkTimbre(r)) miss(`CONTROL tine «${what}»: accepted`); }
  /* TIM3b: the solo engines' own bounds (each damage must be refused, naming its field) */
  const byE=e=>recs.find(r=>r.engine===e && (e!=='ks' || r.recipe.symp) && (e!=='subtractive' || r.recipe.filter) && (e!=='fm2' || !r.recipe.fixed) && (e!=='drumkit' || r.recipe.rows[0].f0!=null));
  const SOLO=[['subtractive','recipe.oscs', r=>{ r.recipe.oscs=Array(9).fill({ wave:'sine', mult:1, gain:0.1 }); }], ['subtractive','gains sum', r=>{ r.recipe.oscs=r.recipe.oscs.map(o=>({ ...o, gain:1 })); r.recipe.oscs.push({ wave:'sine', mult:1, gain:1 }); }],
    ['subtractive','recipe.filter.Q', r=>{ r.recipe.filter.Q=500; }], ['subtractive','recipe.oscs[0].mult', r=>{ r.recipe.oscs[0].mult=100; }], ['subtractive','recipe.oscs[0].detune', r=>{ r.recipe.oscs[0].detune=900; }],
    ['subtractive','recipe.strike', r=>{ r.recipe.filter.freq=12000; r.recipe.strike.open=4; }], ['subtractive','recipe.hum', r=>{ r.recipe.hum=2; }], ['subtractive','recipe: unknown', r=>{ r.recipe.worklet='x'; }],
    ['fm2','recipe.sus', r=>{ r.recipe.sus=500; }], ['fm2','recipe.ratio', r=>{ r.recipe.ratio=0; }], ['fm2','recipe.tau', r=>{ r.recipe.tau=0; }], ['fm2','recipe: a fixed index', r=>{ r.recipe.fixed=true; }],
    ['ks','recipe.fb', r=>{ r.recipe.fb=1.0; }], ['ks','recipe.symp.ratios', r=>{ r.recipe.symp.ratios=Array(12).fill(1); }], ['ks','recipe.symp.gain', r=>{ r.recipe.symp.gain=3; }],
    ['ks','recipe.symp.Q', r=>{ r.recipe.symp.Q=5000; }],
    ['drumkit','recipe.rows', r=>{ r.recipe.rows.pop(); }], ['drumkit','recipe.rows[0].synth', r=>{ r.recipe.rows[0].synth='sampler'; }], ['drumkit','recipe.rows[1].vm', r=>{ r.recipe.rows[1].vm=9; }],
    ['drumkit','recipe.rows[0].f0', r=>{ r.recipe.rows[0].f0=99999; }], ['drumkit','recipe.rows[0].d', r=>{ r.recipe.rows[0].d=60; }], ['drumkit','recipe.rows[0]: unknown', r=>{ r.recipe.rows[0].url='x'; }],
    ['drumkit','env: a kit', r=>{ r.env={ att:0.01, rel:0.1 }; }], ['ks','recipe.nl', r=>{ r.recipe.nl=50; }], ['ks','recipe.body', r=>{ r.recipe.body={ hz:3400, Q:1, db:60 }; }]];
  for(const [e, field, dmg] of SOLO){ const base=byE(e); if(!base){ miss('no '+e+' record to damage'); continue; } const r=copy(base); dmg(r); n++; const why=T.checkTimbre(r);
    if(!why) miss(`CONTROL ${base.id} «${field}»: a damaged record was accepted`); else if(!why.includes(field.split(' ')[0].replace(/:$/,''))) miss(`CONTROL ${base.id} «${field}»: refused, but the line does not name it: ${why}`); }
  n++; if(T.checkTimbre(recs[0])!==null) miss('the first record is refused');
  return { cases:n, total:d.length, differences:d };
}
/* ENG2 (RUN 4): the provisional power class and the dropout rate — exact values; CONTROLS: a factor over the threshold must give
   'low'; a rate from too short a window must be null (never a guess) */
async function engCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const K=await import(new URL('../src/core/engclass.js', import.meta.url).href), T=K.ENG_THRESH;
  eq('no benchmark → unknown', K.engClass({}).cls, 'unknown');
  eq('fast audio, fast detection → high', K.engClass({ factor:0.5, detectMs:20 }).cls, 'high');
  eq('fast audio, no detection yet → high', K.engClass({ factor:0.5 }).cls, 'high');
  eq('between → mid', K.engClass({ factor:1.5, detectMs:50 }).cls, 'mid');
  eq('CONTROL: a factor over the low threshold → low', K.engClass({ factor:T.factor.low+0.01, detectMs:20 }).cls, 'low');
  eq('slow detection → low', K.engClass({ factor:0.5, detectMs:T.detect.low+1 }).cls, 'low');
  eq('software graphics → low', K.engClass({ factor:0.5, softwareGL:true }).cls, 'low');
  eq('the thresholds are frozen', Object.isFrozen(T) && Object.isFrozen(T.factor), true);
  eq('the class is marked provisional', K.ENG_CLASS_PROVISIONAL, true);
  const ua='UA/1', tx=K.benchText(0.42, ua, '2026-10-17T00:00:00.000Z');
  eq('the benchmark cache round trip', K.benchOf(tx, ua), { factor:0.42, at:'2026-10-17T00:00:00.000Z' });
  eq('another user agent → re-measure', K.benchOf(tx, 'UA/2'), null);
  eq('a broken cache → re-measure', K.benchOf('{', ua), null);
  eq('dropouts: 3 events in 30 s → 6 per minute', K.dropRate([[0,10],[15e3,11],[30e3,13]], 30e3), 6);
  eq('dropouts: only the last 60 s count (3 events in the window)', K.dropRate([[0,0],[30e3,100],[60e3,100],[90e3,103]], 90e3), 3);
  eq('CONTROL: a window under 10 s → null (never guessed)', K.dropRate([[0,0],[5e3,4]], 5e3), null);
  eq('no samples → null', K.dropRate([], 0), null);
  eq('a counter that restarted (new context) restarts the window', K.dropRate([[0,50],[20e3,60],[30e3,2],[45e3,5]], 45e3), 12);
  return { cases:n, total:d.length, differences:d };
}
async function packCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const K=await import(new URL('../src/core/pack.js', import.meta.url).href), REG=await import(new URL('../src/core/registry.js', import.meta.url).href);
  const F=JSON.parse(await readFile(new URL('./pack-test-licence.json', import.meta.url),'utf8')), today='2026-10-16';
  eq('the fixture pack passes the check', K.packCheck(F.pack), []);
  eq('a newer pack version is refused in words', K.packCheck({ ...F.pack, version:2 }).some(x=>/newer Handsong/.test(x)), true);
  eq('an item outside its pack is refused', K.packCheck({ ...F.pack, items:[{ kind:'timbre', id:'other/x' }] }).length>0, true);
  eq('an item named twice is refused', K.packCheck({ ...F.pack, items:[F.pack.items[0], F.pack.items[0]] }).length>0, true);
  /* the shipped TEST public key verifies the fixture keys */
  { const v=await K.keyVerify(F.key,{ today }); eq('the fixture key verifies with the shipped test key (CONTROL: a valid key passes)', [v.ok, v.pack], [true, 'test-pack']); }
  eq('the fixture key for another pack verifies — for that pack', (await K.keyVerify(F.otherPackKey,{ today })).pack, 'other-pack');
  eq('an expired fixture key is refused', (await K.keyVerify(F.expiredKey,{ today })).why, 'expired');
  /* a fresh pair for tamper cases */
  const kp=await crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify']);
  const spki=Buffer.from(await crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64'), pub={ t:spki };
  const base={ v:K.KEY_FORMAT, kid:'t', pack:'test-pack', key:'k-1', issued:'2026-10-16' };
  const good=await K.keySign(base, kp.privateKey);
  eq('a fresh key verifies with its public key', (await K.keyVerify(good,{ pubkeys:pub, today })).ok, true);
  eq('a key signed by another issuer under the test key id is refused by the shipped key', (await K.keyVerify(await K.keySign({ ...base, kid:'test' }, kp.privateKey),{ today })).why, 'signature');
  { const [h,p,s]=good.split('.'); const P=JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString()); P.pack='free-loot';
    const p2=Buffer.from(JSON.stringify(P)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    eq('a changed payload is refused (signature)', (await K.keyVerify(`${h}.${p2}.${s}`,{ pubkeys:pub, today })).why, 'signature');
    const s2=(s[0]==='A'?'B':'A')+s.slice(1);
    eq('a changed signature is refused (signature)', (await K.keyVerify(`${h}.${p}.${s2}`,{ pubkeys:pub, today })).why, 'signature'); }
  eq('an unknown key id is refused', (await K.keyVerify(await K.keySign({ ...base, kid:'nobody' }, kp.privateKey),{ pubkeys:pub, today })).why, 'unknownKey');
  eq('a newer key format is refused', (await K.keyVerify(await K.keySign({ ...base, v:2 }, kp.privateKey),{ pubkeys:pub, today })).why, 'format');
  eq('another key prefix is refused (format)', (await K.keyVerify(good.replace(/^HS1/,'HS2'),{ pubkeys:pub, today })).why, 'format');
  eq('an expired key is refused', (await K.keyVerify(await K.keySign({ ...base, until:'2026-10-15' }, kp.privateKey),{ pubkeys:pub, today })).why, 'expired');
  eq('a key valid until today passes', (await K.keyVerify(await K.keySign({ ...base, until:'2026-10-16' }, kp.privateKey),{ pubkeys:pub, today })).ok, true);
  for(const [w,t] of [['empty',''],['garbage','hello'],['two parts','HS1.abc'],['bad base64','HS1.@@@.###'],['not JSON',`HS1.${Buffer.from('nope').toString('base64')}.${good.split('.')[2]}`]])
    eq(`malformed (${w}) is refused`, (await K.keyVerify(t,{ pubkeys:pub, today })).why, 'malformed');
  /* the gate and the registry */
  const G=K.createPackGate(), R=REG.createRegistry('timbre',{ gate:G });
  R.add({ id:'solo.supersaw' },{ builtin:true }); R.add({ id:'test-pack/glass-bell' });
  eq('a pack record is out of the order while its pack is locked', [R.order(), R.isLocked('test-pack/glass-bell'), !!R.get('test-pack/glass-bell')], [['solo.supersaw'], true, true]);
  eq('a key for another pack does not unlock it', (await K.packUnlock(G, F.pack, F.otherPackKey,{ today })).why, 'wrongPack');
  eq('a tampered key does not unlock it', (await K.packUnlock(G, F.pack, F.key.slice(0,-2)+(F.key.endsWith('A')?'BB':'AA'),{ today })).ok, false);
  eq('the right key unlocks it', [(await K.packUnlock(G, F.pack, F.key,{ today })).ok, R.order(), R.isLocked('test-pack/glass-bell')], [true, ['solo.supersaw','test-pack/glass-bell'], false]);
  { const G2=K.createPackGate(); eq('a free pack opens without a key', [(await K.packUnlock(G2, { ...F.pack, licence:false }, null)).ok, G2.unlocked('test-pack')], [true, true]); }
  /* CONTROL: a gate that never locks must be caught by the locked case */
  { const R2=REG.createRegistry('timbre',{ gate:{ usable:()=>true } }); R2.add({ id:'test-pack/glass-bell' }); n++;
    if(!R2.order().includes('test-pack/glass-bell')) d.push('CONTROL: a gate that never locks hid the record — the locked check cannot tell'); }
  return { cases:n, total:d.length, differences:d };
}
let REG;
try{
  P=await import(new URL('../src/probedata.js', import.meta.url).href);
  await import(new URL('../src/probes/data.js', import.meta.url).href);   // PROBE1: the data rows register themselves (flag node)
  REG=await import(new URL('../src/probes/rows.js', import.meta.url).href);
  ({ loadReport }=await import(new URL('../src/scaleload.js', import.meta.url).href));
  LIC=await import(new URL('./check-licences.mjs', import.meta.url).href);   // LIC1: the licence register (text only, no app code)
  NIX=await import(new URL('./name-index.mjs', import.meta.url).href);   // DOC1 leftover: docs/NAME-INDEX.md generated from the code (text only)
  LAT=await import(new URL('../src/core/latency.js', import.meta.url).href);
  HS=await import(new URL('../src/core/handsched.js', import.meta.url).href);   // LAT2: the search schedule (pure core)
  CL=await import(new URL('../src/core/camlight.js', import.meta.url).href);    // LAT3: low light (pure core)
  GF=await import(new URL('../src/gestures/features.js', import.meta.url).href);   // GES1: the pure gesture math
  CFG=await import(new URL('../src/config.js', import.meta.url).href);
  FMT=await import(new URL('../src/core/format.js', import.meta.url).href);    // FMT1: the file-format core
  IDR=await import(new URL('../src/core/registry.js', import.meta.url).href);  // FMT1: permanent ids and the registry
  SONGF=await import(new URL('../src/core/songfile.js', import.meta.url).href);   // SAVE1: the song file's pure core
  DSP=await import(new URL('../src/core/dsp.js', import.meta.url).href);   // SND-F1: the pure DSP core (Night forest IR, dynamics curve)   // LAT1: the pure core (no DOM, no Web Audio — runs in node)
}catch(e){ out('[probe-data] ERROR loading the data modules: '+String(e&&e.stack||e)); verdict(false,'the data modules did not load'); process.exit(1); }
const loadMs=Math.round(performance.now()-T00);

// PROBE1: the browser's data rows come from the registry (same names, runs and reads as P.all, in its order); then the node-only rows
const ROWS=[
  ...REG.rows({ node:true }).map(r=>[r.name, r.run, r.read]),
  ['LIC1 licence register',     ()=>LIC.run(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NAME-INDEX current',        ()=>NIX.run(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT1 latency stats (core)', ()=>latCore(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['SND-F1 Night forest IR (core)', ()=>forestCore(),   r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT2 search schedule (core)', ()=>schedCore(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['LAT3 low light (core)',     ()=>lowCore(),          r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['FMT1 format + registry (core)', ()=>fmtCore(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['GES1 gesture features (core)', ()=>gesCore(),      r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['UI1b icons (core)',          ()=>iconCore(),      r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['SAVE1 song file (core)',     ()=>songCore(),      r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['CMD1 canonical values (core)', ()=>canonCore(),  r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['AUD1c/AUD2a engine data pure (core)', ()=>timbreData(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['PACK1 packs and licence keys (core)', ()=>packCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['ENG2 power class (core)',  ()=>engCore(),       r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['TIM3 timbre records (core)', ()=>timbreCore(),  r=>({ cases:r.cases, diff:r.total, list:r.differences })],
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
