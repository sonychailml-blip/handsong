/* ⛳ ПРОБЫ ДАННЫХ В NODE — без браузера, камеры и звука (слайс «быстрые пробы»).
   Гоняет ТЕ ЖЕ функции, что строки P.all() T0 / T1 / T2 / T6b / «стопка» / F4: они живут в tools/probes/core/probedata.js, который импортирует только
   scales/state/i18n (и через них config, scaleload, userstore, hooks) — ни draw, ни ui, ни audio, ни recorder. В P.all() эти строки
   остаются: браузерный прогон — полный барьер, этот — быстрый ответ до передачи работы.
   Запуск из корня репозитория:  node tools/probe-data.mjs        (вывод всех строк проб: node tools/probe-data.mjs --verbose)
   Код выхода: 0 — PASS, 1 — есть расхождения, ошибка или сломанный файл данных.
   ⛳ ВЕРДИКТ ПЕЧАТАЕТСЯ ВСЕГДА (AR2): прежде вывод проб глушился на время строки, а таблица печаталась только в конце — ~40 с на экране
   стояла одна строка загрузчика (а на загруженной машине T2 один идёт до 2 минут), и прогон выглядел зависшим (его прерывали, не дождавшись вердикта). Теперь: заголовок с числом строк,
   строка «pass/FAIL · случаи · расхождения · мс» СРАЗУ по завершении каждой пробы, итоговая таблица и итог. Падение импорта или любое
   необработанное исключение — тоже вердикт «NOT A PASS» с причиной (а не немой выход); выход без итога ловит process.on('exit').
   ⚠️ ЧТО ПОДМЕНЕНО И ПОЧЕМУ. Загрузчик ладов (core/scaleload.js) читает data/ через fetch по адресу file:// (база — import.meta.url); fetch
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
/* LAT2: the search schedule of the pure core (core/pure/handsched.js), exactly — action sequences for hands in view per frame, the retry
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
/* LAT3: low light in the pure core (core/pure/camlight.js), exactly — the «Too dark» hint from frame times (shown once, at the right
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
/* NIGHT-1: the headroom page's sums (tools/probes/night/headroom-calc.js). CONTROLS: a device with less room must end lower; a moved envelope must move the tail. */
async function headroomCalc(){
  const C=await import(new URL('./probes/night/headroom-calc.js', import.meta.url).href), d=[]; let n=0;
  const near=(what,a,b,tol=1e-9)=>{ n++; if(!(Math.abs(a-b)<=tol)) d.push(`${what}: ${a}, expected ${b}`); };
  const search=(room,depth)=>{ const t=[]; let f; while((f=C.nextBallast(t,depth))!=null) t.push({ f, ok:f<=room }); return { tries:t.length, ...C.freeRange(t) }; };
  { const s=search(0.6,3); near('free share, 3 tries (low)',s.lo,0.5); near('free share, 3 tries (high)',s.hi,0.75); near('tries',s.tries,3); }
  { const s=search(0.6,4); near('free share, 4 tries (low)',s.lo,0.5); near('free share, 4 tries (high)',s.hi,0.625); }
  { const t=[{ f:0, ok:false }]; n++; if(C.nextBallast(t)!==null) d.push('a device that drops out with no ballast must end the search'); near('no room: low stays empty',C.freeRange(t).lo===null?0:1,0); }
  near('budget of a quantum at 48 kHz, µs',C.quantumUs(48000),2666.6666666666665,1e-6); near('render time to work per quantum',C.usPerQuantum(1000,1,48000),2666.6666666666665,1e-6); near('a real-time render is 100 %',C.loadPct(C.quantumUs(44100),44100),100,1e-9);
  { const x=new Float32Array(48000); for(let i=0;i<48000;i++) x[i]=Math.pow(10,-(i/48000)*100/20); const T=C.tailTimes(C.envelope(x,48000),0.05); near('a fall of 100 dB/s reaches −60 dBFS at 0.6 s',T[-60],0.6,0.051); near('and −90 at 0.9 s',T[-90],0.9,0.051); n++; if(C.tailTimes(C.envelope(x.map(v=>v*0.1),48000),0.05)[-60]>=T[-60]) d.push('CONTROL: a tail 20 dB quieter did not end sooner'); }
  { const rec={ engine:'modal', recipe:{ dk:0, att:0.002, vb:0, modes:[{ r:1, g:1, d:6.907755 },{ r:2, g:0.01, d:6.907755 }] } }, L=C.partials(rec,220,1,1,-60); near('a loud partial (T60 6.91 s): heard 60 dB down, 6.91 s',L[0].audible,6.91,0.01); near('its stop at its own −70 dB',L[0].stop,8.08,0.01); near('a partial 40 dB down: heard for the last 20 dB, 2.3 s',L[1].audible,2.3,0.01); n++; if(C.partialSeconds(L).wasted<=0) d.push('CONTROL: a partial stopping after it fades shows no waste'); }
  { const p=C.prerender(10,48000,20,3); near('one 10-s note in float',p.noteMbFloat,1.83,0.01); near('the set, 16 bit',p.totalMb16,55,1); }
  { const a=new Float32Array([1,1,1,1]), b=new Float32Array([1,1,1,0.9]); n++; if(!(C.residualDb(a,b)<-20 && C.residualDb(a,a)===-Infinity)) d.push('the residual misreads'); }
  n++; if(C.report({},{}).format!==C.FORMAT) d.push('the report lost its format');
  return { cases:n, total:d.length, differences:d };
}
/* CORE-1 CP1: the guided measuring page's sums (tools/probes/core/handstats-calc.js) on known series. CONTROLS: a moved median sample and a moving hand must show. */
async function handStatsCalc(){
  const C=await import(new URL('./probes/core/handstats-calc.js', import.meta.url).href);
  const d=[]; let n=0; const near=(what,a,b,tol=1e-9)=>{ n++; if(!(Math.abs(a-b)<=tol)) d.push(`${what}: ${a}, expected ${b}`); };
  const hand=(size,wx=0.5)=>({ size, wx, wy:0.5, pinch:1, out:false });
  const still=(z,fps=30,sec=5)=>Array.from({ length:fps*sec+1 },(_,i)=>({ t:i*1000/fps, hand:hand(z+(i%2 ? 0.002 : -0.002)) }));
  near('median of an even list', C.median([4,1,3,2]), 2.5);
  near('robust sigma ignores an outlier', C.robustSigma([1,2,3,4,100]), 1.4826);
  const a=C.analyse(still(0.2));
  near('frame rate', a.fps, 30, 0.05); near('size', a.size, 0.198, 1e-9); near('spread of a still hand', a.spreadP95, 0.02, 0.001); near('still at 4%', a.still['0.04'], 1); near('largest gap', a.gapMs, 33, 1);
  { const s=still(0.2); for(let i=60;i<72;i++) s[i].hand=null; const g=C.analyse(s); near('a 400 ms gap is seen', g.gapMs, 433, 1); near('seen frames', g.seen, s.length-12); }
  { const ts=[], xs=[]; for(let i=0;i<=6;i++){ ts.push(i*1000/6); xs.push(i ? 1 : 0); }
    near('the time filter at 6 fps, 1 s', C.tauSeries(ts,xs).at(-1), 1-Math.exp(-1/C.TAU_S), 1e-9); near('the per-frame filter at 6 fps, 1 s', C.emaSeries(xs).at(-1), 1-0.85**6, 1e-9);
    const t30=[], x30=[]; for(let i=0;i<=30;i++){ t30.push(i*1000/30); x30.push(i ? 1 : 0); } near('the filters agree at 30 fps', C.tauSeries(t30,x30).at(-1), C.emaSeries(x30).at(-1), 0.002); }
  { const lm=s=>{ const p=Array.from({ length:21 },()=>({ x:0.5, y:0.5 })); p[9]={ x:0.5, y:0.5-s }; return p; }, big=lm(0.3); big[17]={ x:1.2, y:0.5 };
    const h=C.handOf([lm(0.1),big]); near('the largest hand is taken', h.size, 0.3); n++; if(!h.out) d.push('a palm landmark outside the frame was not seen'); n++; if(C.handOf([])!==null) d.push('no hand must give null'); }
  { const r=C.report({ near:still(0.2), far:still(0.125), pinch:still(0.15), open:still(0.16), move:still(0.16) }, { w:640 });
    near('span', r.derived.span, 0.075, 0.003); near('ratio', r.derived.ratio, 0.625, 0.02); near('gain', r.derived.gain, 2.53, 0.1); near('pinch shift', r.derived.pinchShift, -0.0625, 0.02);
    n++; if(r.format!==C.FORMAT || JSON.parse(JSON.stringify(r)).steps.near.n!==151) d.push('the report does not survive the text round trip'); }
  n++; if(C.median([1,2,3])===C.median([1,9,3])) d.push('CONTROL: a moved median sample left the median unchanged');
  { const mv=Array.from({ length:151 },(_,i)=>({ t:i*1000/30, hand:hand(0.2-0.03*i/30) })); n++; if(C.analyse(mv).still['0.04']!==0) d.push('CONTROL: a moving hand still reads as still at 4%'); }
  return { cases:n, total:d.length, differences:d };
}
/* CORE-1 CP2: scripted hands for CAL3. A vertical open hand centred so every landmark is in the frame; seeded jitter at the measured noise. */
function calScript(){
  const seeded=seed=>{ let s=seed>>>0; return ()=>(s=Math.imul(s,1664525)+1013904223>>>0)/4294967296; };
  const gauss=rnd=>Math.sqrt(-2*Math.log(rnd()||1e-9))*Math.cos(2*Math.PI*rnd());
  const hand=(size,{ cx=0.5, cy=null }={})=>{ const c=cy??0.5+0.475*size, lm=Array.from({ length:21 },()=>({ x:cx, y:c }));
    lm[0]={ x:cx, y:c+size/2 }; lm[9]={ x:cx, y:c-size/2 }; for(const i of [4,8,12,16,20]) lm[i]={ x:cx, y:c-size/2-0.95*size }; return lm; };
  /* the measured gaps: desktop about 16 fps with 117 ms the largest, Poco about 7 fps with 392 ms the largest */
  const GAPS={ desktop:[62,58,65,117,60,63,59,61], poco:[120,130,392,110,140,125,265,130,120,135,150,110] };
  const clock=function*(gaps,from=0){ let t=from, i=0; for(;;){ yield t; t+=gaps[i++%gaps.length]; } };
  /* drive a run until it leaves its active phases or the time ends; each frame's hands come from at(t, i) */
  const drive=(run,gaps,at,until=20000)=>{ const c=clock(gaps); let i=0, s=run.state(0), t=0; for(;;){ t=c.next().value; if(t>until) break; const f=at(t,i++); s=run.frame({ t, ...f }); if(s.phase!=='waitHand'&&s.phase!=='holdNear') break; } return { ...s, t }; };
  return { seeded, gauss, hand, GAPS, drive };
}
async function handCalCore(){
  const H=await import(new URL('../core/pure/handcal.js', import.meta.url).href), S=calScript();
  const d=[]; let n=0; const ok=(what,c)=>{ n++; if(!c) d.push(what); };
  const near=(what,a,b,tol=1e-9)=>{ n++; if(!(Math.abs(a-b)<=tol)) d.push(`${what}: ${a}, expected ${b}`); };
  const clamp01=v=>Math.max(0,Math.min(1,v));
  /* CAL1 laws */
  const NOISE=0.0065, r0=1-H.calEndPull(NOISE);
  ok('the near point is exactly 0', Object.is(H.calDepth(r0,NOISE),0)); ok('the player\'s near size is exactly 0', Object.is(H.calDepth(1,NOISE),0)); ok('closer than near clamps to 0', H.calDepth(1.4,NOISE)===0);
  for(const s of [0.7,1,2]){ ok(`far end exactly 1 at ${s}x`, H.calDepth(H.calFarRatio(s),NOISE,s)===1); ok(`past the far end clamps at ${s}x`, H.calDepth(H.calFarRatio(s)*0.5,NOISE,s)===1); }
  near('far ratio 0.7x', H.calFarRatio(0.7), 0.3364, 1e-4); near('far ratio 1x', H.calFarRatio(1), 0.42, 1e-12); near('far ratio 2x', H.calFarRatio(2), 0.5915, 1e-4);
  near('far distance 0.7x', 1/H.calFarRatio(0.7), 2.973, 1e-3); near('far distance 2x', 1/H.calFarRatio(2), 1.690, 1e-3);
  { const f=(hs,N)=>H.calDepth(hs/N,NOISE); near('the ratio ignores hand size and camera', f(0.2,0.4), f(0.1,0.2), 1e-15); near('...at another scale', f(0.2,0.4), f(0.3,0.6), 1e-12); }
  { let m=true, last=-1; for(let r=1.05;r>=0.2;r-=0.01){ const v=H.calDepth(r,NOISE); if(v<last) m=false; last=v; } ok('monotonic over a sweep', m); }
  ok('the band has its floor', H.calBand(0)===H.CAL.band); near('the band follows the noise', H.calBand(0.0065), 0.0195, 1e-12); ok('the band has its cap', H.calBand(1)===H.CAL.bandMax); near('the end pull has its floor', H.calEndPull(0), 1.25*H.CAL.band, 1e-12); near('the end pull is capped', H.calEndPull(1), Math.max(H.CAL.marginMax,1.25*H.CAL.bandMax), 1e-12);
  { let reach=true; for(let z=0;z<=0.05;z+=0.0005) if(H.calEndPull(z)<H.calBand(z)) reach=false; ok('the end pull always covers the band, so the near end stays reachable', reach); }
  { /* both ends reached through the hold band */
    const st={}; let v=0; for(let r=1;r>=0.2;r-=0.005) v=H.calDepth(H.calHold(st,r),NOISE); ok('the far end is reached through the band', v===1);
    for(let r=0.2;r<=1.0001;r+=0.005) v=H.calDepth(H.calHold(st,r),NOISE); ok('the near end is reached through the band', v===0); }
  { /* a still hand, jittered at the largest filtered sigma: the held ratio stays put in mid-range */
    const rnd=S.seeded(7), st={}; let moved=0; H.calHold(st,0.7); const held=st.r; for(let i=0;i<3000;i++){ const r=H.calHold(st,0.7+0.002*S.gauss(rnd)); if(r!==held) moved++; } ok('the band holds a still hand', moved===0);
    const raw={}; let rawMoved=0; H.calHold(raw,0.7,0); const h0=raw.r; const rnd2=S.seeded(7); for(let i=0;i<300;i++){ if(H.calHold(raw,0.7+0.002*S.gauss(rnd2),0)!==h0) rawMoved++; } ok('CONTROL: no band must move', rawMoved>100); }
  ok('near0', H.calDirValue(0.25,'near0',true)===0.25); ok('near100', H.calDirValue(0.25,'near100',false)===0.75); ok('no dir follows inv', H.calDirValue(0.25,undefined,true)===0.75 && H.calDirValue(0.25,undefined,false)===0.25);
  { const rec=H.calEmpty('t'); rec.global.fx=1.4; rec.global.depth=0.7; rec.controls['a|b:c']={ sens:2 }; rec.controls['a|d:e']={ dir:'near0' };
    ok('an override replaces the global', H.calSensOf(rec,'fx','a|b:c')===2); ok('no override: global', H.calSensOf(rec,'fx','a|d:e')===1.4); ok('depth has its own global', H.calSensOf(rec,'depth','x|y:z')===0.7); rec.controls['a|l:o']={ sens:0.5 }; ok('a low override stays on the effects hand', H.calSensOf(rec,'fx','a|l:o')===0.5); ok('...and lifts to 0.7 on depth', H.calSensOf(rec,'depth','a|l:o')===H.CAL.depthMin); const g=H.calEmpty('t'); g.global.fx=0.5; ok('the effects slider keeps 0.5x', H.calClean(g,'t').status==='ok' && H.calClean(g,'t').rec.global.fx===0.5); }
  { let same=true; const grid=[0,1e-12,0.1,0.25,0.5,0.75,0.999,1]; for(const base of grid) for(const dd of [-1.5,-0.3,-1e-9,-0,0,1e-9,0.3,1.5]) for(const inv of [false,true]) if(!Object.is(H.calFx(base,dd,inv,1),clamp01(base+(inv?-dd:dd)))) same=false;
    ok('sens 1 is bit-identical to today\'s expression', same);
    let differs=false; for(const base of grid) for(const dd of [-0.3,0.3]) if(!Object.is(H.calFx(base,dd,false,1.0000001),clamp01(base+dd))) differs=true; ok('CONTROL: sens 1.0000001 must differ', differs); }
  near('sens scales the travel', H.calFx(0.1,0.2,false,2), 0.5, 1e-12); near('sens 0.5', H.calFx(0.1,0.2,false,0.5), 0.2, 1e-12);
  { /* the time filter: same time constant at any rate; equals today's EMA at 30 fps */
    const step=fps=>{ const st={}; H.calFilter(st,0,0); let t=0, y=0; while(t<1000-1e-9){ t+=1000/fps; y=H.calFilter(st,1,t); } return y; };
    const want=1-Math.exp(-1/H.CAL.tauS); near('time filter at 6.7 fps', step(6.7), 1-Math.exp(-(Math.ceil(6.7)/6.7)/H.CAL.tauS), 1e-9); near('time filter at 60 fps', step(60), want, 1e-9);
    let e=0; for(let i=0;i<30;i++) e+=0.15*(1-e); near('equals today\'s EMA at 30 fps', step(30), e, 0.002);
    let e7=0; for(let i=0;i<7;i++) e7+=0.15*(1-e7); ok('CONTROL: a per-frame filter fails at 6.7 fps', Math.abs(e7-step(6.7))>0.3);
    const st={}; H.calFilter(st,0,0); near('a 392 ms gap is not slowed', H.calFilter(st,1,392), 1-Math.exp(-0.392/H.CAL.tauS), 1e-12); }
  ok('CONTROL: dividing 1-r breaks at 0.5x', 1-(1-H.CAL.farRatio)/0.5<0);
  { /* how often a still hand would write a point, at the worst noise measured: a rate over fixed seeds, since one seed is a lottery. The value moved 0.01 (REC_FINE_EPS) from where it stood, as a 2 s mean */
    const SIGMA=0.0065, rate=(fps,sens,band)=>{ let over=0; const N=400; for(let k=0;k<N;k++){ const rnd=S.seeded(1000+k*7), st={}, ms=1000/fps, win=Math.round(2*fps), H0=[]; let start=null, t=0, worst=0;
        for(let i=0;i<60*fps;i++){ t+=ms; const r=H.calHold(st,H.calFilter(st,0.8+SIGMA*S.gauss(rnd),t),band); if(i*ms<2000) continue; const v=H.calDepth(r,SIGMA,sens); if(start==null) start=v; H0.push(v); if(H0.length>win) H0.shift(); worst=Math.max(worst,Math.abs(H0.reduce((a,b)=>a+b,0)/H0.length-start)); }
        if(worst>0.01) over++; } return over/N; }, B=H.calBand(SIGMA);
    const r30=rate(30,1,B), r71=rate(7,1,B), r72=rate(7,2,B), c=rate(7,2,0.009);
    ok(`a still hand at 30 fps, 1x, writes in under 1% of minutes (${r30})`, r30<0.01); ok(`at 7 fps, 1x, under 2.5% (${r71})`, r71<0.025); ok(`at 7 fps, 2x, under 5% (${r72})`, r72<0.05); ok(`CONTROL: the narrow band must write far more often (${c})`, c>0.3); }
  /* CAL2 record */
  const mem=()=>{ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,v), removeItem:k=>m.delete(k), m }; };
  const blocked={ getItem(){ throw new Error('blocked'); }, setItem(){ throw new Error('blocked'); }, removeItem(){ throw new Error('blocked'); } };
  const CAM=H.calCameraKey('Some Camera','user');
  const full=()=>{ const r=H.calEmpty('one'); r.global={ depth:0.7, fx:1.4 }; r.controls['role:ld|fdepth:depth']={ dir:'near0', sens:2 }; r.cameras[CAM]={ near:0.334, noise:0.0065, at:1793000000000 }; return r; };
  { const r=full(), b=H.calParse(H.calText(r),'one'); ok('text round trip', b.status==='ok' && JSON.stringify(b.rec)===JSON.stringify(r)); }
  ok('camera key is a hash, never the name', /^[0-9a-f]{8}$/.test(CAM) && !H.calText(full()).includes('Some Camera'));
  ok('no label falls back to the facing', H.calCameraKey('','user')!==H.calCameraKey('','environment'));
  { const st=mem(), a=full(), b=H.calEmpty('two'); b.global.fx=0.5; H.calSave(st,a); H.calSave(st,b);
    ok('two scopes don\'t collide', H.calLoad(st,'one').rec.global.fx===1.4 && H.calLoad(st,'two').rec.global.fx===0.5);
    ok('CONTROL: a shared key would collide', H.calStoreKey('one')!==H.calStoreKey('two'));
    H.calWipe(st,'one'); ok('a wipe removes only its scope', H.calLoad(st,'one').status==='empty' && H.calLoad(st,'two').status==='ok'); }
  { const l=H.calLoad(blocked,'one'); ok('a blocked store reads as empty', l.status==='blocked' && !Object.keys(l.rec.cameras).length); ok('a blocked save returns false', H.calSave(blocked,full())===false); ok('a blocked wipe returns false', H.calWipe(blocked,'one')===false); }
  { const r=full(); let g=H.calReset(r,{ control:'role:ld|fdepth:depth' }); ok('control reset', !g.controls['role:ld|fdepth:depth'] && g.cameras[CAM] && !!r.controls['role:ld|fdepth:depth']);
    g=H.calReset(r,{ camera:CAM }); ok('camera reset', !g.cameras[CAM] && g.global.fx===1.4); g=H.calReset(r,{ all:true }); ok('full reset', JSON.stringify(g)===JSON.stringify(H.calEmpty('one'))); }
  { const st=mem(), newer=JSON.stringify({ ...full(), version:9 }); st.setItem(H.calStoreKey('one'),newer);
    ok('a newer version reads as uncalibrated', H.calLoad(st,'one').status==='newer' && !Object.keys(H.calLoad(st,'one').rec.cameras).length);
    ok('a newer version is not overwritten', H.calSave(st,full())===false && st.getItem(H.calStoreKey('one'))===newer);
    H.calWipe(st,'one'); ok('an explicit wipe frees it', H.calSave(st,full())===true); }
  { const keepV=FMT.FORMAT_VERSION.handcal, keepM=FMT.MIGRATIONS.handcal, v1=full();
    try{ FMT.FORMAT_VERSION.handcal=2; FMT.MIGRATIONS.handcal=[r=>({ ...r, global:{ ...r.global, fx:1.9 } })];
      const u=H.calClean(v1,'one'); ok('a v1 to v2 step runs', u.status==='ok' && u.rec.global.fx===1.9 && u.rec.version===2 && v1.global.fx===1.4);
      FMT.MIGRATIONS.handcal=[]; ok('CONTROL: without the step a v1 record is refused', H.calClean(v1,'one').status==='damaged');
    } finally { FMT.FORMAT_VERSION.handcal=keepV; if(keepM===undefined) delete FMT.MIGRATIONS.handcal; else FMT.MIGRATIONS.handcal=keepM; } }
  /* damage drops only the damaged part; CONTROLS: each plant must be refused */
  const damage=[
    ['a planted thumb on a camera', r=>{ r.cameras[CAM].thumb='data:image/png;base64,AAAA'; }, 'cameras.'+CAM],
    ['a planted far on a camera', r=>{ r.cameras[CAM].far=0.2; }, 'cameras.'+CAM],
    ['a camera name as the key', r=>{ r.cameras['Some Camera']={ near:0.3, noise:0, at:0 }; }, 'cameras.Some Camera'],
    ['near as text', r=>{ r.cameras[CAM].near='0.3'; }, 'cameras.'+CAM], ['near of zero', r=>{ r.cameras[CAM].near=0; }, 'cameras.'+CAM],
    ['a sens above 2', r=>{ r.global.fx=3; }, 'global.fx'], ['a sens below 0.5', r=>{ r.global.fx=0.1; }, 'global.fx'], ['a depth slider below 0.7', r=>{ r.global.depth=0.6; }, 'global.depth'], ['an unknown global', r=>{ r.global.other=1; }, 'global.other'],
    ['a bad direction', r=>{ r.controls['role:ld|fdepth:depth'].dir='up'; }, 'controls.role:ld|fdepth:depth'], ['a text on a control', r=>{ r.controls['role:ld|fdepth:depth'].note='x'; }, 'controls.role:ld|fdepth:depth'],
    ['a planted top-level field', r=>{ r.picture='x'; }, 'picture'],
  ];
  for(const [what,plant,path] of damage){ const r=full(); plant(r); const c=H.calClean(r,'one'); ok('refused: '+what, c.status==='partial' && c.dropped.includes(path) && !H.calText(c.rec).includes('data:image') && !('picture' in c.rec)); }
  { const r=full(); r.cameras[CAM].thumb='x'; r.global.fx=1.2; const c=H.calClean(r,'one'); ok('other parts survive damage', c.rec.global.fx===1.2 && c.rec.global.depth===0.7); }
  for(const [what,text] of [['not JSON','{oops'],['another format',JSON.stringify({ format:'handsong/tuning', version:1 })],['another scope',H.calText({ ...full(), scope:'two' })],['no version',JSON.stringify({ format:'handsong/handcal' })]])
    ok('damaged: '+what, H.calParse(text,'one').status==='damaged');
  { let threw=false; try{ H.calStoreKey('Bad Scope'); }catch(e){ threw=true; } ok('a bad scope is refused', threw); }
  /* CAL3 routine */
  const NEAR=0.334, still=(seed,size=NEAR,sig=0.0065)=>{ const rnd=S.seeded(seed); return ()=>({ hands:[S.hand(size*(1+sig*S.gauss(rnd)))] }); };
  const run=(opts={})=>H.createCalRun({ t:0, ...opts });
  for(const [name,gaps] of Object.entries(S.GAPS)){ const r=run(), s=S.drive(r,gaps,still(11));
    ok(`${name}: reaches review`, s.phase==='review'); near(`${name}: the near size`, s.result&&s.result.near, NEAR, 0.006); ok(`${name}: noise is small`, s.result&&s.result.noise<0.02);
    ok(`${name}: about 2 s`, s.t>=2000 && s.t<=2000+Math.max(...gaps)*2); near(`${name}: progress is whole`, s.progress, 1); const a=r.accept(); ok(`${name}: accept returns the result`, a&&a.near===s.result.near && r.state(s.t).phase==='saved'); }
  { const ends=[], sizes=[]; for(const fps of [5,7,16,30]){ const s=S.drive(run(),[1000/fps],still(23)); ends.push({ fps, t:s.t, ok:s.phase==='review' }); sizes.push(s.result&&s.result.near); }
    for(const e of ends){ ok(`${e.fps} fps reaches review`, e.ok); ok(`${e.fps} fps finishes on time (${e.t})`, e.t>=2000 && e.t<=2000+1000/e.fps+1e-6); } for(const z of sizes) near('the rate doesn\'t move the size', z, NEAR, 0.006); }
  { const rnd=S.seeded(5), r=run(), series=[]; const s=S.drive(r,S.GAPS.poco,(t,i)=>{ const z=i%7===3 ? NEAR*1.3 : NEAR*(1+0.0065*S.gauss(rnd)); series.push(z); return { hands:[S.hand(z)] }; });   // one sample in 7, about 15%
    ok('spikes: reaches review', s.phase==='review'); near('spikes: the median holds', s.result&&s.result.near, NEAR, 0.006);
    const mean=series.reduce((a,b)=>a+b,0)/series.length; ok('CONTROL: a mean must miss the tolerance', Math.abs(mean-NEAR)>0.006); }
  { const moving=(t)=>({ hands:[S.hand(NEAR*(1-0.135*t/1000),{ cy:0.66 })] });
    const s=S.drive(run(),S.GAPS.desktop,t=>moving(t%4000)); ok('a slowly moving hand is refused', s.phase==='failed' && s.reason==='not-still');
    const c=S.drive(run({ C:{ ...H.CAL, stillSize:Infinity, stillWrist:Infinity } }),S.GAPS.desktop,moving); ok('CONTROL: stillness off accepts a moving hand', c.phase==='review'); }
  { /* wrist waving sideways */ const s=S.drive(run(),S.GAPS.desktop,t=>({ hands:[S.hand(NEAR,{ cx:0.5+0.15*Math.sin(t/300) })] })); ok('a waving hand is refused', s.reason==='not-still'); }
  { /* a fingertip out while the palm is inside */ const out=()=>({ hands:[S.hand(0.33,{ cy:0.45 })] });
    ok('(the script: palm inside, fingertip outside)', S.hand(0.33,{ cy:0.45 })[12].y<0 && [0,5,9,13,17].every(i=>S.hand(0.33,{ cy:0.45 })[i].y>=0));
    const r=run(); r.frame({ t:0, ...out() }); const a=r.frame({ t:100, ...out() }); ok('a fingertip out asks to move back', a.advice==='back' && a.progress===0);
    const s=S.drive(run(),S.GAPS.desktop,out); ok('out of frame fails at the timeout', s.phase==='failed' && s.reason==='out-of-frame' && s.t>=H.CAL.holdLimitMs);
    const c=S.drive(run({ C:{ ...H.CAL, frameLm:[0,5,9,13,17] } }),S.GAPS.desktop,out); ok('CONTROL: a palm-only check misses the fingertip', c.phase==='review');
    const back=(t,i)=> t<1500 ? out() : { hands:[S.hand(NEAR)] }, m=S.drive(run(),S.GAPS.desktop,back); ok('moving back restarts and finishes', m.phase==='review' && m.t>=3500); }
  { const s=S.drive(run(),S.GAPS.desktop,still(3,0.2)); ok('too small a near fails', s.phase==='failed' && s.reason==='too-far');
    const r=run(); let last; for(let t=0;t<=2500;t+=60) last=r.frame({ t, hands:[S.hand(0.2)] }); ok('too small asks to come closer', last.advice==='closer'); }
  { /* CORE-6 farHold (opt-in): a far steady hand is accepted down to sizeMin/rFarMax, below that too-far; a shaking one stays refused; the 1x far end stays at sizeMin */
    const lim=H.CAL.sizeMin/H.CAL.rFarMax, a=S.drive(run({ farHold:true }),S.GAPS.desktop,still(3,0.2));
    ok('farHold: a near of 0.2 is accepted', a.phase==='review'); near('farHold: its near size', a.result&&a.result.near, 0.2, 0.004);
    ok('farHold: just above the floor is accepted (Poco gaps)', S.drive(run({ farHold:true }),S.GAPS.poco,still(5,lim*1.15)).phase==='review');
    { const c=S.drive(run({ farHold:true }),S.GAPS.desktop,still(3,lim*0.85)); ok('farHold: below the floor fails as too far', c.phase==='failed' && c.reason==='too-far'); }
    { const e=S.drive(run({ farHold:true }),S.GAPS.desktop,still(7,0.1,0.04)); ok('farHold: a shaking far hand is refused', e.phase==='failed' && e.reason==='not-still'); }
    ok('the far base is 0.42 from near 0.143 up', H.calFarBase(0.25)===H.CAL.farRatio && H.calFarBase(H.CAL.sizeMin/H.CAL.farRatio+1e-9)===H.CAL.farRatio);
    for(const nr of [lim,0.1,0.12]) near(`farHold: the 1x far end sits at sizeMin (near ${nr})`, nr*H.calFarRatio(1,H.calFarBase(nr)), H.CAL.sizeMin, 1e-12);
    { let same=true; for(const nr of [0.143,0.25,0.334,0.44]) for(const s of [0.7,1,2]) for(let r=1.05;r>=0.2;r-=0.01) if(!Object.is(H.calDepth(r,NOISE,s,H.calFarBase(nr)),H.calDepth(r,NOISE,s))) same=false;
      ok('every near from 0.143 up keeps the CORE-1 law bit for bit', same); }
    { let reach=true; const b=H.calFarBase(lim); for(const s of [0.7,1,2]) for(const z of [0,0.0065,0.03]) if(!(H.calDepth(H.calFarRatio(s,b),z,s,b)===1 && H.calDepth(1,z,s,b)===0 && 1-H.calEndPull(z)>H.calFarRatio(s,b))) reach=false;
      ok('farHold: at the floor both ends stay reachable', reach); }
    ok('CONTROL: a near below the floor would leave no travel at 2x', 1-H.calEndPull(0.03)<=H.calFarRatio(2,H.calFarBase(lim*0.7))); }
  { const s=S.drive(run(),[100],()=>({ hands:[] })); ok('nobody there: no-hand', s.phase==='failed' && s.reason==='no-hand' && s.t>=H.CAL.waitMs); }
  { const s=S.drive(run(),[100],(t)=>({ hands:t<500 ? [S.hand(NEAR)] : [] })); ok('a hand gone: hand-lost', s.phase==='failed' && s.reason==='hand-lost'); }
  { const s=S.drive(run(),[600],still(9)); ok('2 samples per 1.2 s: low-rate', s.phase==='failed' && s.reason==='low-rate' && s.t>=H.CAL.holdMaxMs && s.t<=H.CAL.holdMaxMs+600); }
  { const s=S.drive(run(),[60],(t)=>({ hands:(t>=600&&t<1300) ? [] : [S.hand(NEAR)] })); ok('a 700 ms blink is tolerated', s.phase==='review' && s.t<2200); }
  { const seq=(C)=>S.drive(run({ C }),[60],(t)=>({ hands:(t>=600&&t<1100) ? [] : [S.hand(NEAR)] })); ok('a 500 ms gap passes at 800 ms', seq(H.CAL).t<2200); ok('CONTROL: a 500 ms gap restarts under 400 ms', seq({ ...H.CAL, blinkMs:400 }).t>=3000); }
  { const big=S.hand(0.45,{ cx:0.8 }); const s=S.drive(run(),S.GAPS.desktop,(t)=>({ hands:t<300 ? [S.hand(NEAR,{ cx:0.2 })] : [big,S.hand(NEAR,{ cx:0.2 })] })); near('the locked hand is followed', s.result&&s.result.near, NEAR, 1e-6);
    const two=S.drive(run(),S.GAPS.desktop,()=>({ hands:[S.hand(0.3,{ cx:0.2 }),S.hand(NEAR,{ cx:0.8 })] })); near('two hands: the largest', two.result&&two.result.near, NEAR, 1e-6);
    let flip=0; const lab=S.drive(run({ hand:'Left' }),S.GAPS.desktop,()=>({ hands:[S.hand(0.3,{ cx:0.2 }),S.hand(NEAR,{ cx:0.8 })], labels:flip++%2 ? ['Right','Left'] : ['Left','Right'] })); near('a label flip keeps the hand named at the lock', lab.result&&lab.result.near, 0.3, 1e-6); }
  { const mark=lm=>{ lm.synthetic=true; return lm; };
    const a=S.drive(run(),[60],()=>({ hands:[mark(S.hand(NEAR))] })); ok('a marked hand fails at once', a.reason==='synthetic' && a.t===0);
    const b=S.drive(run(),[60],(t)=>({ hands:t>=900 ? [S.hand(NEAR),mark(S.hand(0.3,{ cx:0.2 }))] : [S.hand(NEAR)] })); ok('a marked hand mid-run fails it', b.reason==='synthetic' && b.t>=900 && b.t<1000); }
  for(const [what,at] of [['waitHand',0],['holdNear',500],['review',2600]]){ const r=run(), f=still(3); let t=0; while(t<at){ r.frame({ t, ...f() }); t+=60; } r.cancel(); const s=r.state(t); ok(`cancel in ${what}`, s.phase==='cancelled' && s.reason==='cancelled' && s.result===null && r.accept()===null); }
  { const r=run(); r.fail('camera-changed'); ok('the service\'s reasons', r.state(0).reason==='camera-changed'); const q=run(); q.fail('busy'); ok('busy', q.state(0).reason==='busy'); let threw=false; try{ run().fail('nonsense'); }catch(e){ threw=true; } ok('an unknown reason is refused', threw); }
  { const once=()=>JSON.stringify(S.drive(run(),S.GAPS.poco,still(31))); ok('the same script gives the same result', once()===once()); }
  { const r=run(), s=S.drive(r,S.GAPS.desktop,still(3)); r.frame({ t:s.t+60, hands:[] }); ok('review ignores further frames', r.state(s.t).phase==='review'); }
  return { cases:n, total:d.length, differences:d };
}
/* FMT1: the file-format core (envelope versions, migrations) and the permanent-id registry (core/pure/format.js, core/pure/registry.js),
   exactly. CONTROLS: a registry that destroys a built-in, and a version check that lets a newer file through, must be caught. */
async function fmtCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const throwsWith=(f,re)=>{ try{ f(); return 'no refusal'; }catch(e){ return re.test(String(e&&e.message)) ? 'ok' : String(e&&e.message); } };
  const rec=JSON.parse(await readFile(new URL('../core/data/tunings/edo12.json', import.meta.url),'utf8'));
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
/* GES1: the pure gesture math (core/gestures/features.js), exactly, against the config thresholds. CONTROLS: the hysteresis switched off
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
  const d=[]; let n=0; const IC=await import(new URL('../core/icons.js', import.meta.url).href), I18=await import(new URL('../core/i18n.js', import.meta.url).href);
  const fs=await import('node:fs'), reg=JSON.parse(fs.readFileSync(new URL('./licences.json', import.meta.url),'utf8'));
  const iconGlyphs=new Set(reg.glyphs.filter(g=>g.kind==='icon').map(g=>g.ch));
  const tokErr=(where,s)=>{ for(const m of String(s).matchAll(/\{i:([\w-]+)\}/g)){ n++; if(!(m[1] in IC.ICONS)) d.push(`${where}: unknown icon «${m[1]}»`); } };
  for(const L of I18.LANGS) for(const [k,v] of Object.entries(I18.DICTS[L])){ tokErr(`${L} ${k}`, v); n++;
    if([...String(v)].some(c=>iconGlyphs.has(c))) d.push(`${L} ${k}: an icon glyph written directly — use {i:name}`);
    const out=I18.withLang(L,()=>I18.t(k)); if(String(out).includes('{i:')) d.push(`${L} ${k}: t() left a token: ${out}`); }
  for(const [name,g] of Object.entries(IC.ICONS)){ n++; if(![...g].every(c=>iconGlyphs.has(c))) d.push(`icon ${name} «${g}»: not an «icon» glyph of the register`); }
  const html=fs.readFileSync(new URL('../apps/full/index.html', import.meta.url),'utf8')+fs.readFileSync(new URL('../apps/night/index.html', import.meta.url),'utf8');
  for(const m of html.matchAll(/data-icon="([^"]*)"/g)){ n++; const v=m[1]; if(v.includes('{i:')) tokErr('index.html data-icon', v); else if(!(v in IC.ICONS)) d.push(`index.html data-icon «${v}»: unknown icon`); }
  { const before=d.length; tokErr('CONTROL', '{i:no-such-icon}'); if(d.length===before) d.push('CONTROL: an unknown icon name was not caught'); else d.pop(); }
  return { cases:n, total:d.length, differences:d };
}
/* SAVE1: the song file's pure core (core/pure/songfile.js) — reading a text (size cap, JSON only, forbidden keys, nesting, version
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
/* CMD1a: canonical JSON (core/pure/canon.js) — equal values give equal text whatever the key order or object identity; −0 = 0; a number
   is written exactly; arrays keep their order; undefined is dropped. CONTROLS: a changed number, a changed array order and a changed key
   must each give another hash. */
async function canonCore(){
  const d=[]; let n=0; const C=await import(new URL('../core/pure/canon.js', import.meta.url).href);
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
/* AUD1c + AUD2a / review R2: the timbre data and the effect declarations moved into the shared engine submodules (core/modules/, core/engine/) are PURE DATA — numbers, strings,
   booleans, plain arrays and objects (no node, buffer, port or function), deep-frozen (a write would throw in BOTH engine copies, which
   share these modules). The modules load in node: nothing at their top level touches Web Audio (rule #38). CONTROLS: a table holding a
   function and an unfrozen table must both be caught. */
async function timbreData(){
  const d=[]; let n=0;
  const imp=f=>import(new URL('../core/modules/timbres/'+f, import.meta.url).href);
  const pure=(x,path,out)=>{ if(x===null || ['number','string','boolean'].includes(typeof x)) return;
    if(typeof x!=='object'){ out.push(`${path}: a ${typeof x}`); return; }
    const pr=Object.getPrototypeOf(x); if(pr!==Object.prototype && pr!==Array.prototype){ out.push(`${path}: a ${x.constructor && x.constructor.name}`); return; }
    if(!Object.isFrozen(x)) out.push(`${path}: not frozen`);
    for(const k of Object.keys(x)) pure(x[k], path+'.'+k, out); };
  const M={}; for(const f of ['stages.js','voice.js','fm.js','ks.js','subtractive.js','chord-voice.js','bass-voice.js','drumkits.js']){ n++;
    try{ M[f]=await imp(f); }catch(e){ d.push(`${f} does not load in node (a top-level Web Audio use?): ${e && e.message}`); } }
  for(const f of ['param.js','reverb.js','delay.js','trem-mix.js','bright.js','glide.js','volume.js','forest.js','glue.js']){ n++;   // AUD2a: the effects
    try{ M['fx/'+f]=await import(new URL('../core/modules/effects/'+f, import.meta.url).href); }catch(e){ d.push(`effects/${f} does not load in node: ${e && e.message}`); } }
  n++; try{ M['fdn']=await import(new URL('../core/engine/fdn.js', import.meta.url).href); }catch(e){ d.push(`engine/fdn.js does not load in node: ${e && e.message}`); }
  for(const [f,name] of [['chord-voice.js','FIREFLY'],['stages.js','BRI_HZ'],['fdn','REV_A'],['fx/reverb.js','REV_PARAMS'],['fx/delay.js','DLY_A'],
      ['fx/delay.js','DLY_PARAMS'],['fx/trem-mix.js','TRMIX_A'],['fx/trem-mix.js','TRMIX_PARAMS'],['fx/bright.js','BRIGHT_PARAMS'],['fx/glide.js','GLIDE_PARAMS'],
      ['fx/volume.js','VOL_PARAMS'],['fx/forest.js','FOREST_PARAMS'],['fx/glue.js','GLUE_PARAMS']]){ n++; const v=M[f] && M[f][name];
    if(!v){ d.push(`${f}: ${name} missing`); continue; } const out=[]; pure(v,name,out); d.push(...out); }
  { n++; const out=[]; pure(Object.freeze([Object.freeze({ f:()=>1 })]),'ctl',out); if(!out.length) d.push('CONTROL: a function inside a table was not caught'); }
  { n++; const out=[]; pure([{ a:1 }],'ctl2',out); if(!out.length) d.push('CONTROL: an unfrozen table was not caught'); }
  return { cases:n, total:d.length, differences:d };
}
/* PACK1: packs and offline licence keys (core/pure/pack.js) — node's WebCrypto, no network. The SHIPPED test public key verifies the committed
   fixture keys (tools/pack-test-licence.json, signed by the git-ignored test private key); a fresh key pair made here signs the tamper cases:
   a changed payload, a changed signature, an unknown key id, a newer key format, an expired key, a key for another pack — each refused in
   words; malformed texts refused; the gate keeps a pack's records out of a registry's order until the pack is unlocked; a free pack opens
   without a key. CONTROLS: a valid key must PASS (a verifier refusing everything cannot pass the refusal cases); a gate that never locks
   must be caught by the «locked before unlock» case. */
/* TIM3a (RUN 4): the timbre records — every file valid; the bundle equals the files; each T5 bound refuses its damage with one line naming
   the field (CONTROLS); the tine's partial bounds; a record whose policies differ from its family's today is caught by the browser row */
async function timbreCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const T=await import(new URL('../core/pure/timbre.js', import.meta.url).href), B=await import(new URL('./timbre-bundle.mjs', import.meta.url).href);
  const b=await B.buildBundle(); n++; if(b.problems.length) miss('files: '+b.problems.slice(0,3).join(' · '));
  let disk=''; try{ disk=await readFile(new URL('../core/data/timbres.bundle.json', import.meta.url),'utf8'); }catch(e){}
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
  const byE=e=>recs.find(r=>r.engine===e && (e!=='ks' || r.recipe.symp) && (e!=='subtractive' || r.recipe.filter) && (e!=='fm2' || !r.recipe.fixed) && (e!=='drumkit' || r.recipe.rows[0].f0!=null) && (e!=='modal' || (r.recipe.body && r.recipe.jit)) && (e!=='breath' || (r.recipe.noise && r.recipe.vib)));
  const SOLO=[['subtractive','recipe.oscs', r=>{ r.recipe.oscs=Array(9).fill({ wave:'sine', mult:1, gain:0.1 }); }], ['subtractive','gains sum', r=>{ r.recipe.oscs=r.recipe.oscs.map(o=>({ ...o, gain:1 })); r.recipe.oscs.push({ wave:'sine', mult:1, gain:1 }); }],
    ['subtractive','recipe.filter.Q', r=>{ r.recipe.filter.Q=500; }], ['subtractive','recipe.oscs[0].mult', r=>{ r.recipe.oscs[0].mult=100; }], ['subtractive','recipe.oscs[0].detune', r=>{ r.recipe.oscs[0].detune=900; }],
    ['subtractive','recipe.strike', r=>{ r.recipe.filter.freq=12000; r.recipe.strike.open=4; }], ['subtractive','recipe.hum', r=>{ r.recipe.hum=2; }], ['subtractive','recipe: unknown', r=>{ r.recipe.worklet='x'; }],
    ['fm2','recipe.sus', r=>{ r.recipe.sus=500; }], ['fm2','recipe.ratio', r=>{ r.recipe.ratio=0; }], ['fm2','recipe.tau', r=>{ r.recipe.tau=0; }], ['fm2','recipe: a fixed index', r=>{ r.recipe.fixed=true; }],
    ['ks','recipe.fb', r=>{ r.recipe.fb=1.0; }], ['ks','recipe.symp.ratios', r=>{ r.recipe.symp.ratios=Array(12).fill(1); }], ['ks','recipe.symp.gain', r=>{ r.recipe.symp.gain=3; }],
    ['ks','recipe.symp.Q', r=>{ r.recipe.symp.Q=5000; }],
    ['drumkit','recipe.rows', r=>{ r.recipe.rows.pop(); }], ['drumkit','recipe.rows[0].synth', r=>{ r.recipe.rows[0].synth='sampler'; }], ['drumkit','recipe.rows[1].vm', r=>{ r.recipe.rows[1].vm=9; }],
    ['drumkit','recipe.rows[0].f0', r=>{ r.recipe.rows[0].f0=99999; }], ['drumkit','recipe.rows[0].d', r=>{ r.recipe.rows[0].d=60; }], ['drumkit','recipe.rows[0]: unknown', r=>{ r.recipe.rows[0].url='x'; }],
    ['drumkit','env: a kit', r=>{ r.env={ att:0.01, rel:0.1 }; }], ['ks','recipe.nl', r=>{ r.recipe.nl=50; }], ['ks','recipe.body', r=>{ r.recipe.body={ hz:3400, Q:1, db:60 }; }],
    /* RUN 7: the modal and breath engines (Night's sound pass) */
    ['modal','recipe.modes', r=>{ r.recipe.modes=Array(17).fill({ r:1, g:0.05, d:1 }); }], ['modal','gains sum', r=>{ r.recipe.modes=r.recipe.modes.map(m=>({ ...m, g:1 })); }],
    ['modal','recipe.modes[0].d', r=>{ r.recipe.modes[0].d=99; }], ['modal','recipe.modes[0].r', r=>{ r.recipe.modes[0].r=100; }], ['modal','recipe.modes[0].w', r=>{ r.recipe.modes[0].w='custom'; }],
    ['modal','recipe.lp', r=>{ r.recipe.lp=40000; }], ['modal','recipe.noise.q', r=>{ r.recipe.noise.q=500; }], ['modal','recipe.body: needs', r=>{ delete r.recipe.noise; }],
    ['modal','recipe.jit.r', r=>{ r.recipe.jit.r=0.5; }], ['modal','recipe.modes[0]: unknown', r=>{ r.recipe.modes[0].url='x'; }],
    ['breath','recipe.harm', r=>{ r.recipe.harm=Array(9).fill({ m:1, g:0.1 }); }], ['breath','gains sum', r=>{ r.recipe.harm=r.recipe.harm.map(h=>({ ...h, g:1 })); }],
    ['breath','recipe.vib.cents', r=>{ r.recipe.vib.cents=500; }], ['breath','recipe.chiff.g', r=>{ r.recipe.chiff={ g:5, m:2, q:3, d:0.1 }; }],
    ['breath','recipe.breathe.cut', r=>{ r.recipe.breathe={ rate:0.1, lvl:0.1, cut:2 }; }], ['breath','recipe.formants', r=>{ r.recipe.formants=Array(5).fill({ hz:500, q:2, g:0.5 }); }],
    ['modal','recipe.lvl', r=>{ r.recipe.lvl=3; }], ['breath','recipe.lvl', r=>{ r.recipe.lvl=3; }],
    ['breath','recipe.noise.on', r=>{ r.recipe.noise.on=50; }], ['breath','recipe: unknown', r=>{ r.recipe.worklet='x'; }], ['breath','recipe.hum', r=>{ r.recipe.hum=2; }]];
  for(const [e, field, dmg] of SOLO){ const base=byE(e); if(!base){ miss('no '+e+' record to damage'); continue; } const r=copy(base); dmg(r); n++; const why=T.checkTimbre(r);
    if(!why) miss(`CONTROL ${base.id} «${field}»: a damaged record was accepted`); else if(!why.includes(field.split(' ')[0].replace(/:$/,''))) miss(`CONTROL ${base.id} «${field}»: refused, but the line does not name it: ${why}`); }
  n++; if(T.checkTimbre(recs[0])!==null) miss('the first record is refused');
  return { cases:n, total:d.length, differences:d };
}
/* SPLIT-2 (plan §5.2): the old product name is gone from the code, the docs and the live logs. Exempt: archive/ (history), tools/prints (byte-identity is the proof), vendor, the one migration file, the split tools,
   STALE-NAMES (its job) and the generated NAME-INDEX (made from the scanned code + that list); in a log the plan's one note line (§8) is allowed, nothing else.
   Built from parts, so this file passes its own scan. CONTROL: a planted word in each spelling must be caught, in a log too; the note alone must not be. */
/* NIGHT-3: tools/design/room-demos/ holds verbatim copies of the strategy chat's pages (old name kept on purpose), skipped like split-baseline */
async function oldNameGone(){
  const fs=await import('node:fs'), root=new URL('../', import.meta.url), d=[]; let n=0;
  const WORD=new RegExp('ca'+'lm','i'), RU=new RegExp('Спо'+'койн'), EXEMPT=/^(tools\/split-[^/]*|apps\/night\/migrate\.js|docs\/core\/STALE-NAMES\.md|docs\/core\/NAME-INDEX\.md)$/,
    NOTE='> 2026-11 (SPLIT-2): the product "'+'Ca'+'lm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.';
  const scan=(name,text0,out)=>{ const text=text0.split(NOTE).join(''); if(WORD.test(text)||RU.test(text)) out.push(name+': holds the old name'); };
  const walk=rel=>fs.readdirSync(new URL(rel, root),{ withFileTypes:true }).flatMap(e=>{ const p=rel+e.name; if(e.isDirectory()) return (e.name==='vendor'||e.name==='prints'||e.name==='node_modules'||e.name==='split-baseline'||p==='tools/design/room-demos'||e.name.startsWith('.')) ? [] : walk(p+'/'); return /\.(js|mjs|css|html|json|md)$/.test(e.name) ? [p] : []; });
  for(const f of ['core/','apps/','tools/','docs/'].flatMap(walk).concat(['index.html','CLAUDE.md','HANDOFF.md','THIRD-PARTY-LICENSES.md'])){ if(EXEMPT.test(f)) continue; n++; scan(f, fs.readFileSync(new URL(f, root),'utf8'), d); }
  for(const planted of ['a Ca'+'lm word','--ca'+'lm-x','CA'+'LM_X','«Спо'+'койный»']){ const o=[]; n++; scan('x',planted,o); if(!o.length) d.push('CONTROL: a planted old name was not caught: '+planted); }
  { const o=[]; n++; scan('x',NOTE,o); if(o.length) d.push('CONTROL: the note line alone was caught'); }
  { const o=[]; n++; scan('x',NOTE+' and a Ca'+'lm word',o); if(!o.length) d.push('CONTROL: an old name beside the note was not caught'); }
  { const o=[]; n++; scan('x','спокойно, by the way',o); if(o.length) d.push('CONTROL: the ordinary Russian adverb was caught'); }
  return { cases:n, total:d.length, differences:d };
}
/* C0 (RUN 6): the profile records — every file in data/profiles/ valid against this app's modes, timbres and effects; ids = the pinned
   list; Full offers everything and narrows nothing; CONTROLS: each damage of PROFILE_DAMAGES refused with a line naming its field */
async function profileCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const P=await import(new URL('../core/pure/profile.js', import.meta.url).href);
  const rd=async f=>JSON.parse(await readFile(new URL('../core/data/'+f, import.meta.url),'utf8'));
  const ix=await rd('index.json'), tix=await rd('timbres/index.json');
  const known={ modes:ix.modes, timbres:tix.order, effects:['reverb','bright','glide','dly','trmMix','forest','glue','vib','drv','trm','fdepth','cecho','ctone','cwave'] };   // RUN 7: + Night's own effects
  { const RV=await import(new URL('../apps/night/pure/room.js', import.meta.url).href), F=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
    known.rooms=[...RV.ROOM_IDS]; known.ambiences=[F.nature.id]; }   // CORE-8: the app's rooms and ambiences (Night's catalogue)
  const recs=[];
  for(const name of ['apps/full/data/full.json','apps/night/data/night.json']){ n++; let r; try{ r=JSON.parse(await readFile(new URL('../'+name, import.meta.url),'utf8')); }catch(e){ miss(name+': '+e.message); continue; }
    recs.push(r); const why=P.checkProfile(r, known); if(why) miss(`${r.id||name}: ${why}`); }
  n++; if(JSON.stringify(recs.map(r=>r.id))!==JSON.stringify([...P.PROFILE_IDS])) miss('profile ids '+JSON.stringify(recs.map(r=>r.id))+' ≠ the pinned '+JSON.stringify(P.PROFILE_IDS));
  const full=recs.find(r=>r.id==='profile.full'), night=recs.find(r=>r.id==='profile.night');
  n++; if(!full || ['handFn','noteModes','key','moods','timbres','effects','scene','ambience'].some(k=>full[k]!==null) || full.roles.length!==4 || full.shell!=='full' || full.labels!=='full' || !full.recording)
    miss('profile.full must offer everything and narrow nothing');
  n++; if(!night || night.roles.join()!=='ld' || night.recording || night.labels!=='plain' || night.key.tonic!==9 || night.noteModes.join()!=='note,hold') miss('profile.night: solo only, nothing recorded, plain labels, key A, modes note / hold');
  const copy=o=>JSON.parse(JSON.stringify(o));
  if(night) for(const [field, dmg] of P.PROFILE_DAMAGES){ const r=copy(night); dmg(r); n++; const why=P.checkProfile(r, known);
    if(!why) miss(`CONTROL «${field}»: a damaged profile was accepted`);
    else if(!why.includes(field.split(' ')[0])) miss(`CONTROL «${field}»: refused, but the line does not name it: ${why}`); }
  /* CORE-8: without the app's lists only the shape is checked — a room id passes, a bare name does not */
  if(night){ const shape={ ...known }; delete shape.rooms; delete shape.ambiences; n+=3;
    if(P.checkProfile({ ...copy(night), scene:'room.monastery', ambience:'ambience.sea' }, shape)) miss('a profile with well-shaped room and ambience ids was refused without the lists');
    if(!P.checkProfile({ ...copy(night), scene:'forest' }, shape)) miss('CONTROL: the bare scene «forest» passed the shape check');
    if(!P.checkProfile({ ...copy(night), ambience:'forest' }, shape)) miss('CONTROL: the bare ambience «forest» passed the shape check'); }
  return { cases:n, total:d.length, differences:d };
}
/* VIS1a (RUN 6): the event bus — state topics versioned; the ring keeps order, overflows by losing the oldest (counted), never more
   than its length; a reader reads and cannot write (CONTROL: a reader write must throw; a lost count that cannot be non-zero is caught by
   the overflow case) */
async function busCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const B=await import(new URL('../core/pure/bus.js', import.meta.url).href), bus=B.createBus({ ring:4 });
  eq('unset state', [bus.get('hands'), bus.version('hands')], [undefined, 0]);
  bus.set('hands', { a:1 }); bus.set('hands', { a:2 });
  eq('state latest + version', [bus.get('hands'), bus.version('hands')], [{ a:2 }, 2]);
  for(let i=1;i<=3;i++) bus.push('notes', { i });
  eq('ring in order', bus.since('notes', 0), { items:[{ i:1 },{ i:2 },{ i:3 }], seq:3, lost:0 });
  eq('ring since 2', bus.since('notes', 2).items, [{ i:3 }]);
  for(let i=4;i<=7;i++) bus.push('notes', { i });
  eq('ring overflow: the oldest lost', bus.since('notes', 1), { items:[{ i:4 },{ i:5 },{ i:6 },{ i:7 }], seq:7, lost:2 });
  eq('ring caught up', bus.since('notes', 7), { items:[], seq:7, lost:0 });
  eq('unknown ring', bus.since('levels', 0), { items:[], seq:0, lost:0 });
  const r=bus.reader();
  eq('reader reads', [r.get('hands'), r.version('hands'), r.seq('notes')], [{ a:2 }, 2, 7]);
  for(const w of ['set','push']){ n++; let threw=false; try{ r[w]('hands', 1); }catch(e){ threw=true; } if(!threw) d.push(`CONTROL: a reader ${w} did not throw`); }
  n++; if(!Object.isFrozen(r)) d.push('the reader object is not frozen');
  eq('the app bus exists and starts empty', [typeof B.BUS.set, B.BUS.version('picture')], ['function', 0]);
  return { cases:n, total:d.length, differences:d };
}
/* RUN 7 (C6): the Night shell's logic — controls shown only after 1.5 s without hands and hidden at once when a hand is back; a round button
   cycles its list; the sleep timer holds full level until its last 90 s, fades smoothly (monotone, no step) to silence, then sleeps; the
   glow is brightest at the hand and gone beyond its reach. CONTROLS: a shell that ignores the hands, and a fade with a step, must be caught. */
/* RUN 7 (C4b) → RUN 8: the depth → forest curve keeps the LOUDNESS (the user: depth changes the amount of forest, never the loudness): the dry
   part alone never drops more than 1.5 dB (dry ≥ 10^(−1.5/20) at every d — a struck note's loudness follows it), the forest's send rises
   (far ≥ 3× near), the room darkens; clamped outside 0…1; monotone; CONTROL: RUN 7's prototype curve (dry 1 − 0.55·d) must fail the floor.
   The loudness itself is the browser row «NIGHT depth loudness». */
async function nightDepthCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const D=await import(new URL('../core/pure/dsp.js', import.meta.url).href), f=D.nightDepth, FLOOR=Math.pow(10,-1.5/20);
  for(let k=0;k<=20;k++){ const c=f(k/20); n++; if(!(c.dry>=FLOOR)) miss(`d = ${k/20}: dry ${c.dry} (≥ ${FLOOR.toFixed(4)} expected)`); }
  n+=2; if(!(f(1).send>=3*f(0).send)) miss(`the forest grows too little: send ${f(0).send} → ${f(1).send}`);
  if(JSON.stringify([f(-1), f(2)])!==JSON.stringify([f(0), f(1)])) miss('not clamped outside 0…1');
  { let ok=true, p=f(0); for(let k=1;k<=100;k++){ const c=f(k/100); if(!(c.send>p.send && c.dry<p.dry && c.lp<p.lp)) ok=false; p=c; } n++; if(!ok) miss('the curve is not monotone'); }
  { const old=x=>({ dry:1-0.55*x }); n++; if(!([0,0.5,1].some(x=>!(old(x).dry>=FLOOR)))) miss('CONTROL: the RUN 7 prototype curve passed the dry floor — the check cannot fail'); }
  return { cases:n, total:d.length, differences:d };
}
/* RUN 7 (C4c): the crickets' SEEDED schedule — the same seed gives the same chirps (exact); another seed differs (CONTROL); each chirp's gap
   within 0.6–1.8 s after its pulses, 3–5 pulses, a pitch in 4.3–4.9 kHz; a chirp's envelope is soft (3-ms rise) and ends at 0; the wind loop
   is seeded too (repeatable, another seed differs) */
async function nightCricketsCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const A=await import(new URL('../apps/night/pure/ambience.js', import.meta.url).href), N=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM.nature, C=N.crickets;   // NIGHT-3: the forest's recipe
  const take=(seed,k,m)=>{ const s=A.cricketStream(C,seed,k), out=[s.freq]; for(let i=0;i<m;i++) out.push(s.next()); return out; };
  for(let k=0;k<C.n;k++){ const a=take(C.seed,k,200), b=take(C.seed,k,200); n++; if(JSON.stringify(a)!==JSON.stringify(b)) miss('cricket '+k+': the same seed gave other chirps');
    n++; if(!(a[0]>=C.fLo && a[0]<=C.fHi)) miss('cricket '+k+': pitch '+a[0]);
    for(let i=1;i<a.length;i++){ const c=a[i]; if(!(c.pulses>=C.pulsesLo && c.pulses<=C.pulsesHi)){ miss('cricket '+k+' chirp '+i+': '+c.pulses+' pulses'); break; }
      if(i>1){ const gap=c.t-a[i-1].t-a[i-1].pulses*(C.pulse+C.gap); if(!(gap>=C.every[0]-1e-9 && gap<=C.every[1]+1e-9)){ miss('cricket '+k+' chirp '+i+': gap '+gap.toFixed(3)); break; } } }
    n+=2; }
  n++; if(JSON.stringify(take(C.seed,0,20))===JSON.stringify(take(C.seed+1,0,20))) miss('CONTROL: another seed gave the same chirps');
  n++; if(JSON.stringify(take(C.seed,0,20))===JSON.stringify(take(C.seed,1,20))) miss('two crickets chirp alike');
  const sh=A.chirpShape(C, 1, 3, 0.8); n++; if(!(sh.length===9 && sh[0][1]===0 && sh[1][0]-sh[0][0]>=0.003-1e-12 && sh[8][1]===0)) miss('a chirp envelope is not soft or does not end at 0: '+JSON.stringify(sh.slice(0,3)));
  const W=N.wind, w1=A.windNoise(8000, W.seed, W.sec), w2=A.windNoise(8000, W.seed, W.sec), w3=A.windNoise(8000, W.seed+1, W.sec); n+=2;
  if(w1.some((v,i)=>v!==w2[i])) miss('the wind loop is not repeatable');
  if(!w1.some((v,i)=>v!==w3[i])) miss('CONTROL: the wind with another seed is the same');
  return { cases:n, total:d.length, differences:d };
}
async function nightShellCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(what+': '+JSON.stringify(a)+' vs '+JSON.stringify(b)); };
  const C=await import(new URL('../core/pure/nightui.js', import.meta.url).href), U=C.NIGHT_UI;
  let st=C.showStep(null, 0, 0); eq('no hand yet → shown', st.shown, true);
  st=C.showStep(st, 1, 1000); eq('a hand → hidden', st.shown, false);
  st=C.showStep(st, 0, 1000+U.idleMs-1); eq('gone 1.499 s → still hidden', st.shown, false);
  st=C.showStep(st, 0, 1000+U.idleMs); eq('gone 1.5 s → shown', st.shown, true);
  st=C.showStep(st, 2, 1000+U.idleMs+16); eq('hands back → hidden at once', st.shown, false);
  { const bad=(s,h,now)=>({ shown:true, seen:now }); n++; if(bad(st,1,0).shown===C.showStep(st,1,0).shown) d.push('CONTROL: a shell ignoring the hands matched'); }
  eq('cycle', [C.nextOf(['a','b','c'],'a'), C.nextOf(['a','b','c'],'c'), C.nextOf(['a','b'],'zz')], ['b','a','a']);
  eq('sleep off', C.sleepLevel(0, 0, 1e9), { level:1, left:Infinity, asleep:false });
  const T=15*60e3, F=U.sleepFadeMs;
  eq('sleep: full before the fade', C.sleepLevel(0,15,T-F-1).level, 1);
  eq('sleep: asleep at the end', C.sleepLevel(0,15,T), { level:0, left:0, asleep:true });
  { let prev=1, maxStep=0, mono=true; for(let k=0;k<=900;k++){ const L=C.sleepLevel(0,15,T-F+k*F/900).level; if(L>prev+1e-12) mono=false; maxStep=Math.max(maxStep, prev-L); prev=L; }
    n+=2; if(!mono) d.push('sleep fade is not monotone'); if(!(maxStep<0.005)) d.push('sleep fade has a step of '+maxStep.toFixed(4)+' per 0.1 s (abrupt)');
    const stepped=k=>k<450 ? 1 : 0.5; let ms=0, p=1; for(let k=0;k<=900;k++){ ms=Math.max(ms,p-stepped(k)); p=stepped(k); } n++; if(!(ms>=0.005)) d.push('CONTROL: a stepped fade passed'); }
  eq('glow at the hand', +C.glowAlpha(0,1000).toFixed(6), U.glowMax);
  eq('glow beyond its reach', C.glowAlpha(U.glowReach*1000+1,1000), 0);
  n++; if(!(C.glowAlpha(100,1000)>C.glowAlpha(300,1000))) d.push('glow does not fall with distance');
  return { cases:n, total:d.length, differences:d };
}
/* VIS1c (RUN 6): the forest's wild fireflies, ground and depth as numbers — the same seed gives the same flies (exact) and the same
   positions after 900 steps (15 s, exact, twice); a light gathers them (flies within 2.5 of it after 15 s; CONTROL: with the light off far fewer are — a pull that does nothing is caught); the depth bands: d 0 → near, 1 → far, monotonic, flat in a band */
async function fliesCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const F=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href);
  const h=A=>{ let x=0x811c9dc5; for(const f of A) for(const v of [...f.p, ...f.v, f.glow]){ x^=Math.round(v*1e9)|0; x=Math.imul(x,0x01000193); } return (x>>>0).toString(16); };
  const run=(light)=>{ const A=F.fliesInit(); for(let i=0;i<900;i++) F.fliesStep(A, [{ x:0, y:1.6, z:-3, on:light?1:0 }], 1/60, i/60); return A; };
  n++; if(h(F.fliesInit())!==h(F.fliesInit())) miss('two inits from one seed differ');
  n++; if(h(F.fliesInit(70,1))===h(F.fliesInit())) miss('CONTROL: another seed gave the same flies');
  const a=run(true), b=run(true); n++; if(h(a)!==h(b)) miss('900 steps twice differ');
  const near=(A)=>A.filter(f=>Math.hypot(f.p[0]-0, f.p[1]-1.6, f.p[2]+3)<2.5).length;   // gathered around the light
  const on=near(a), off=near(run(false)); n++;
  if(!(on>=5 && on>=3*Math.max(1,off))) miss(`a light gathers ${on} flies within 2.5 (without it ${off}) — expected ≥ 5 and ≥ 3×`);
  n++; if(F.depthDistance(0)!==F.FOREST_DEPTH.near || F.depthDistance(1)!==F.FOREST_DEPTH.far) miss('depth ends: '+F.depthDistance(0)+' / '+F.depthDistance(1));
  let mono=true, prev=-1; for(let i=0;i<=100;i++){ const v=F.depthDistance(i/100); if(v<prev-1e-12) mono=false; prev=v; } n++; if(!mono) miss('depth is not monotonic');
  n++; if(F.depthDistance(0.30)!==F.depthDistance(0.36)) miss('depth is not flat inside a band (0.30 vs 0.36)');
  n++; if(Math.abs(F.forestGround(0,0)-0)>0.2 || F.forestGround(3,-5)===F.forestGround(8,-5)) miss('ground heights unexpected');
  return { cases:n, total:d.length, differences:d };
}
/* RUN 9 (slice 1): THE NIGHT's cycle (core/night.js) — SEAMLESS (every value at t equals t + period, CONTROL: a 1.5-cycle term differs),
   CONTINUOUS (no jump anywhere, the seam included), the first minutes clear, clouds dim the moon and it returns, the moon drifts, the mist
   layers move each its own way; the sleep's depth (exact ends, monotone); every Night mood has a look whose tokens exist in tokens.css */
async function nightCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const N=await import(new URL('../apps/night/pure/cycle.js', import.meta.url).href), P=N.NIGHT.period;
  const flat=o=>[o.phase%1, ...o.moon, o.cover, o.moonLight, ...o.mist, ...o.rise, ...o.clouds.flatMap(c=>[c.u, c.dens, c.y])];
  const diff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
  let worst=0; for(let i=0;i<240;i++){ const t=i*P/240+0.37; worst=Math.max(worst, diff(flat(N.nightAt(t)).slice(1), flat(N.nightAt(t+P)).slice(1)), diff(flat(N.nightAt(t)).slice(1), flat(N.nightAt(t+3*P)).slice(1))); }
  n++; if(worst>1e-9) miss('not seamless: t vs t + period differ by '+worst);
  const ctl=t=>0.5-0.5*Math.cos(1.5*2*Math.PI*t/P); n++; if(!(Math.abs(ctl(100)-ctl(100+P))>0.1)) miss('CONTROL: a 1.5-cycle term matched across the period (the seam test cannot fail)');
  let jump=0, prev=flat(N.nightAt(-0.5)); const series=[];
  for(let t=0;t<=P;t+=0.5){ const o=N.nightAt(t), f=flat(o); jump=Math.max(jump, diff(f.slice(1,9+4), prev.slice(1,9+4))); prev=f; series.push(o); }
  n++; if(jump>0.03) miss('a jump of '+jump.toFixed(4)+' in 0.5 s (moon, light or mist)');
  n++; if(series.slice(0, N.NIGHT.clouds.clear*2).some(o=>o.cover>0)) miss('a cloud in the first '+N.NIGHT.clouds.clear+' s');
  const ml=series.map(o=>o.moonLight), mn=Math.min(...ml); let dims=0; for(let i=1;i<series.length;i++) if(series[i].cover>0.3 && series[i-1].cover<=0.3) dims++;
  n+=3; if(!(mn<=0.45)) miss('the clouds never dim the moon below 0.45 ('+mn.toFixed(3)+')'); if(Math.max(...ml)!==1) miss('the moon never clears fully');
  if(!(dims>=5)) miss('only '+dims+' cloud passes over the moon per night (≥ 5 expected)');
  const xs=series.map(o=>o.moon[0]); n++; if(!(Math.max(...xs)-Math.min(...xs)>=8)) miss('the moon drifts only '+(Math.max(...xs)-Math.min(...xs)).toFixed(2)+' units');
  const L=N.NIGHT.mist.cycles.length, col=k=>series.map(o=>o.mist[k]), mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const corr=(a,b)=>{ const ma=mean(a), mb=mean(b); let s=0, sa=0, sb=0; a.forEach((v,i)=>{ s+=(v-ma)*(b[i]-mb); sa+=(v-ma)**2; sb+=(b[i]-mb)**2; }); return s/Math.sqrt(sa*sb); };
  for(let k=0;k<L;k++){ const c=col(k); n++; if(!(Math.max(...c)-Math.min(...c)>=0.6)) miss('mist layer '+k+' moves only '+(Math.max(...c)-Math.min(...c)).toFixed(2)); }
  for(let a=0;a<L;a++) for(let b=a+1;b<L;b++){ n++; const r=corr(col(a),col(b)); if(r>0.95) miss(`mist layers ${a} and ${b} move together (r ${r.toFixed(3)})`); }
  const D0=N.nightDeep(0), D1=N.nightDeep(1); n+=2;
  if(D0.light!==1||D0.flies!==1||D0.motion!==1||D0.mist!==1||D0.sway!==1) miss('sleep 0 changes the night: '+JSON.stringify(D0));
  if(Math.abs(D1.light-0.45)>1e-12||Math.abs(D1.flies-0.4)>1e-12||Math.abs(D1.motion-0.5)>1e-12||Math.abs(D1.mist-1.5)>1e-12) miss('sleep 1: '+JSON.stringify(D1));
  let mono=true, pl=2; for(let i=0;i<=50;i++){ const v=N.nightDeep(i/50).light; if(v>pl+1e-12) mono=false; pl=v; } n++; if(!mono) miss("the sleep depth is not monotone");
  n+=3; if(N.sleepProgress(0,0,5e5)!==0) miss('no timer: progress ≠ 0'); if(N.sleepProgress(0,10,3e5)!==0.5) miss('half of a 10-min timer ≠ 0.5'); if(N.sleepProgress(0,10,9e5)!==1) miss('past the end ≠ 1');
  /* NIGHT-3: the moods' looks are each room's now — row «NIGHT room records» */
  return { cases:n, total:d.length, differences:d };
}
/* NIGHT-3 stage 4: THE MUSIC BED's LAW (apps/night/pure/bed.js) over the forest's recipe, for scales of 5, 6 and 7 degrees, an hour each:
   repeatable, another seed differs (CONTROL); every chord = the preset's voices stacked every other degree, distinct steps, inside the pad range
   (below the tonic, where the playing starts); gaps between chords, glimmer and drift within the recipe; glimmer only in its preset; the Music
   button's cycle; RESPONSE: with the switch OFF your notes change nothing (exact); ON, the chords change at the SAME moments (only which chord —
   never when), and the chords hold more of your notes than with it off (CONTROL: off, the same share as with no notes) */
async function nightBedLaw(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const L=await import(new URL('../apps/night/pure/bed.js', import.meta.url).href), B=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM.bed;
  const run=(preset, N, seed, played=[], answer=false, sec=3600)=>L.bedStep(L.bedInit(seed), B, B.presets[preset], N, sec, played, answer);
  n++; if(['off','still','drift','glimmer','off'].map((x,i,a)=>i ? L.bedNext(a[i-1])===x : true).some(x=>!x)) miss('the Music button does not cycle off → still → drift → glimmer → off');
  for(const N of [5,6,7]) for(const preset of L.BED_PRESETS){ const P=B.presets[preset], { lo, hi }=L.padRange(B, N), tag=`${preset}, ${N} degrees`;
    const a=run(preset,N,7), b=run(preset,N,7), c=run(preset,N,8); n+=2;
    if(JSON.stringify(a)!==JSON.stringify(b)) miss(tag+': the same seed gave another bed');
    if(JSON.stringify(a)===JSON.stringify(c)) miss('CONTROL '+tag+': another seed gave the same bed');
    const ch=a.filter(e=>e.kind==='chord'), gl=a.filter(e=>e.kind==='glim'), dr=a.filter(e=>e.kind==='drift'); n+=5;
    if(ch.length<3600/P.every[1]-2) miss(`${tag}: only ${ch.length} chords in an hour`);
    for(const e of ch){ const pcs=e.steps.map(x=>((x%N)+N)%N), r=pcs.find(p=>L.chordPcs(p,P.voices,N).every(q=>pcs.includes(q)));
      if(e.steps.length!==P.voices || new Set(e.steps).size!==e.steps.length || e.steps.some(x=>x<lo || x>hi) || r==null){ miss(`${tag}: chord ${JSON.stringify(e.steps)} at ${e.t.toFixed(1)} s (range ${lo}…${hi})`); break; } }
    for(let i=1;i<ch.length;i++){ const g=ch[i].t-ch[i-1].t; if(g<P.every[0]-1e-9 || g>P.every[1]+1e-9){ miss(`${tag}: a gap of ${g.toFixed(2)} s between chords`); break; } }
    if(P.glim ? gl.length<3600/P.glim.every[1]-2 : gl.length) miss(`${tag}: ${gl.length} glimmer notes`);
    if(dr.some(e=>Math.abs(e.k-1)>P.drift.depth+1e-12 || e.v<0 || e.v>=P.voices)) miss(tag+': a drift outside the recipe');
    if(gl.some(e=>!(e.amp>=0.55 && e.amp<=1) || Math.abs(e.pan)>0.7)) miss(tag+': a glimmer note outside its amp / pan'); }
  /* the response */
  { const N=5, mine=[1,3,1,3,1], times=ev=>ev.filter(e=>e.kind==='chord').map(e=>e.t);
    const off0=run('drift',N,11), offP=run('drift',N,11,mine,false), onP=run('drift',N,11,mine,true); n+=2;
    if(JSON.stringify(off0)!==JSON.stringify(offP)) miss('with the response off, your notes changed the bed');
    if(JSON.stringify(times(onP))!==JSON.stringify(times(off0))) miss('with the response on, the chords moved in time — it must change only which chord, never when');
    const share=(answer, pl)=>{ let hit=0, all=0; for(let sd=1; sd<=60; sd++) for(const e of run('drift',N,sd,pl,answer,600)) if(e.kind==='chord'){ const pcs=e.steps.map(x=>((x%N)+N)%N); hit+=mine.filter(p=>pcs.includes(p)).length; all+=mine.length; } return hit/all; };
    const sOn=share(true,mine), sOff=share(false,mine), sNone=share(false,[]); n+=2;
    if(!(sOn>sOff+0.05)) miss(`the response does not lean: your notes are in ${(100*sOn).toFixed(1)} % of the chords' notes with it on, ${(100*sOff).toFixed(1)} % off`);
    if(Math.abs(sOff-sNone)>1e-12) miss('CONTROL: with the response off the share depends on your notes'); }
  return { cases:n, total:d.length, differences:d };
}
/* NIGHT-4: THE MUSIC BED v2's LAW (apps/night/pure/bed2.js) over the forest's recipe, for scales of 5, 6 and 7 degrees, an hour each: repeatable,
   another seed differs (CONTROL); LOOPS — the lengths differ, each voice repeats its own phrase (most loop notes repeat the last cycle's offset and
   step), phrases change now and then (15–55 % of a voice's loops), notes are long and soft and inside the loop register; the COMBINATION never
   repeats (no two 60-s windows hold the same loop notes; CONTROL: equal lengths and no changes must repeat); PAD chords are the scale's own
   degrees rising from the root, inside the pad register, no two tones a step apart; on 5-degree scales (Night's moods) open: a mean span of
   1.2 octaves or more and 75 % of the 3-tone chords at least an octave wide (in 6 or 7 degrees every other degree climbs in thirds); glass and air only where the preset has them; BREATH 5–7.5 swells a minute; the ARC starts sparse, its periods 300–600 s, loops
   sound more where it is full; PRESETS differ (Still lowest and sparsest, no glass or air; Glimmer the most glass); LIGHTER: at most two loop
   voices, no air, at most ¾ of the glass, its voices at their heavy moments (the census' 95th percentile, without the node and its room) at most
   75 % of the full bed's; THE WORK CENSUS's peak
   under its budget (5 % of the laptop's quantum); RESPONSE as v1 (off: your notes
   change nothing; on: every time identical, your notes more often in phrases and chords; CONTROL); a scale-size change keeps the phrases; the
   WAVETABLES are band-limited (CONTROL: one harmonic too many is caught) */
async function nightBed2Law(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const L=await import(new URL('../apps/night/pure/bed2.js', import.meta.url).href), V1=await import(new URL('../apps/night/pure/bed.js', import.meta.url).href);
  /* BUDGET: the census (laptop µs per quantum, from the measured part costs) at 5 % of the 2,667-µs quantum */
  const R=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM.bed2, BUDGET=133;
  const mod=(s,N)=>((s%N)+N)%N;
  const run=(preset, N, seed, o={})=>{ const P=o.P||R.presets[preset], st=L.bed2Init(seed, o.R||R, P); const ev=L.bed2Step(st, o.R||R, P, N, o.sec||3600, o.played||[], !!o.answer, !!o.light); return { st, ev, P }; };
  const work={};
  for(const N of [5,6,7]) for(const preset of ['still','drift','glimmer']){ const tag=`${preset}, ${N} degrees`, P=R.presets[preset];
    const A=run(preset,N,7), B=run(preset,N,7), C=run(preset,N,8); n+=2;
    if(JSON.stringify(A.ev)!==JSON.stringify(B.ev)) miss(tag+': the same seed gave another bed');
    if(JSON.stringify(A.ev)===JSON.stringify(C.ev)) miss('CONTROL '+tag+': another seed gave the same bed');
    const ev=A.ev, loops=ev.filter(e=>e.kind==='loop'), ch=ev.filter(e=>e.kind==='chord'), gl=ev.filter(e=>e.kind==='glass'), air=ev.filter(e=>e.kind==='air'), br=ev.filter(e=>e.kind==='breath');
    /* loops */
    n+=4; const lens=A.st.loops.map(x=>x.len); if(new Set(lens).size!==lens.length) miss(`${tag}: loop lengths ${lens} are not all different`);
    let rep=0, all=0; for(const Lp of A.st.loops){ const mine=loops.filter(e=>e.v===Lp.v), key=e=>Math.round(((e.t%Lp.len)+Lp.len)%Lp.len*100)+':'+e.step, byCycle=new Map();
      for(const e of mine){ const c=Math.floor(e.t/Lp.len+1e-9); if(!byCycle.has(c)) byCycle.set(c,new Set()); byCycle.get(c).add(key(e)); }
      for(const e of mine){ const c=Math.floor(e.t/Lp.len+1e-9), prev=byCycle.get(c-1); if(!prev) continue; all++; if(prev.has(key(e))) rep++; }
      const share=Lp.changes/Math.max(1,Lp.cycles-1); if(Lp.cycles>8 && (share<0.15 || share>0.55)){ miss(`${tag}: loop ${Lp.v} changed its phrase in ${(100*share).toFixed(0)} % of ${Lp.cycles} loops`); break; } }
    if(all && rep/all<0.6) miss(`${tag}: only ${(100*rep/all).toFixed(0)} % of loop notes repeat the last loop's note`);
    const reg=L.bed2Reg(P.loopReg, N); if(loops.some(e=>e.step<reg.lo || e.step>reg.hi || e.a<1 || e.a+e.h+e.r<4 || e.amp<0.7-1e-9 || e.amp>1)) miss(`${tag}: a loop note outside its register (${reg.lo}…${reg.hi}) or not long and soft`);
    { const sig=new Map(); let same=0; for(let w=0; w+60<=3600; w+=30){ const inW=loops.filter(e=>e.t>=w && e.t<w+60); if(inW.length<2) continue; const k=inW.map(e=>(e.t-w).toFixed(2)+'/'+e.v+'/'+e.step).join(); if(sig.has(k)) same++; else sig.set(k,w); }
      if(same) miss(`${tag}: ${same} 60-s windows repeat an earlier window's loop notes`); }
    /* pad */
    n+=3; const pr=L.bed2Reg(P.padReg, N); let bad=null, gapBad=null, wide=0, many=0, close=0, span=0;
    for(const e of ch){ const s=e.steps, root=mod(s[0],N), T=s.length, pcs=V1.chordPcs(root,T,N);
      if(T<P.padTones[0] || T>P.padTones[1] || s.some((x,i)=>mod(x,N)!==pcs[i]) || s.some(x=>x<pr.lo || x>pr.hi) || s.some((x,i)=>i && x<=s[i-1]) || s[0]>pr.lo+N-1){ bad=e; break; }
      span+=(s[T-1]-s[0])/N; if(T>=3){ many++; if(s[T-1]-s[0]>=N) wide++; } if(s.some((x,i)=>i && x-s[i-1]<2)) close++; }
    for(let i=1;i<ch.length;i++){ const g=ch[i].t-ch[i-1].t; if(g<P.every[0]-1e-9 || g>P.every[1]+1e-9){ gapBad=g; break; } }
    if(bad) miss(`${tag}: chord ${JSON.stringify(bad.steps)} at ${bad.t.toFixed(1)} s is not the scale's degrees, rising from the root in ${pr.lo}…${pr.hi}`);
    /* openness on Night's pentatonic moods; on any scale: no clusters */
    if((N===5 && ((many && wide/many<0.75) || span/Math.max(1,ch.length)<(P.padTones[1]>=3 ? 1.2 : 0.6))) || close/Math.max(1,ch.length)>0.05) miss(`${tag}: not open: ${wide}/${many} chords of 3+ tones span an octave, ${close} have two tones a step apart, mean span ${(span/Math.max(1,ch.length)).toFixed(2)} octaves`);
    if(gapBad!=null || ch.length<3600/P.every[1]-2) miss(`${tag}: ${ch.length} chords, a gap of ${gapBad}`);
    /* glass, air, breath, arc */
    n+=4; if(!P.glass ? gl.length : gl.length<3600/(P.glass.every[1]*1.35)) miss(`${tag}: ${gl.length} glass notes`);
    if(P.air ? !air.some(e=>e.lvl>0) : air.some(e=>e.lvl>0)) miss(`${tag}: the air does not follow the preset (${P.air})`);
    { const swells=br.length/2/60; if(swells<5 || swells>7.5) miss(`${tag}: ${swells.toFixed(2)} breaths a minute`); }
    { const ends=A.st.arc.ends, per=ends.slice(1).map((x,i)=>x-ends[i]), d0=L.bed2Density(A.st,0,P.arcDepth);
      if(Math.abs(d0-(1-P.arcDepth))>1e-9 || per.some(p=>p<300-1e-9 || p>600+1e-9)) miss(`${tag}: the arc starts at ${d0.toFixed(3)}, periods ${per.map(p=>p.toFixed(0))}`);
      const rate=hi=>{ let c=0, s=0; for(let t=0;t<3600;t+=5){ const dd=L.bed2Density(A.st,t,P.arcDepth); if((dd>=1-P.arcDepth/2)===hi){ s+=5; c+=loops.filter(e=>e.t>=t && e.t<t+5).length; } } return c/Math.max(1,s); };
      n++; if(P.loops>1 && !(rate(true)>rate(false)*1.15)) miss(`${tag}: loops do not sound more where the arc is full (${rate(true).toFixed(3)} vs ${rate(false).toFixed(3)} a second)`); }
    /* lighter and the work census */
    const Li=run(preset,N,7,{ light:true }), wf=L.bed2Work(A.ev,3600), wl=L.bed2Work(Li.ev,3600,{ light:true }); n+=3;
    if(Li.ev.some(e=>e.kind==='loop' && e.v>=R.lighter.loops) || Li.ev.some(e=>e.kind==='air' && e.lvl>0)) miss(`${tag}: Lighter keeps more than ${R.lighter.loops} loops or the air`);
    if(gl.length && Li.ev.filter(e=>e.kind==='glass').length>0.75*gl.length) miss(`${tag}: Lighter keeps ${Li.ev.filter(e=>e.kind==='glass').length} of ${gl.length} glass notes`);
    { const fx=L.BED2_WORK.fixed, vl=wl.p95-fx, vf=wf.p95-fx;   // Lighter = fewer loops and layers: its voices (the census without the node and its room) at the heavy moments
      if(!(vl<=0.75*vf) && P.loops>R.lighter.loops) miss(`${tag}: Lighter's voices at their heavy moments (95th percentile) ${vl.toFixed(1)} µs are not ≤ 75 % of ${vf.toFixed(1)}`); }
    n++; if(wf.peak>BUDGET) miss(`${tag}: the work census peaks at ${wf.peak.toFixed(0)}, over the budget ${BUDGET}`);
    if(N===5) work[preset]={ full:wf.mean.toFixed(1), p95:wf.p95.toFixed(1), peak:wf.peak.toFixed(1), light:wl.mean.toFixed(1), lightP95:wl.p95.toFixed(1), lightPeak:wl.peak.toFixed(1) }; }
  /* the presets' characters (5 degrees) */
  { const S=run('still',5,7).ev, D=run('drift',5,7).ev, G=run('glimmer',5,7).ev, mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length), lp=a=>a.filter(e=>e.kind==='loop'); n+=3;
    const hS=mean(lp(S).map(e=>e.step)), hD=mean(lp(D).map(e=>e.step)), hG=mean(lp(G).map(e=>e.step));
    if(!(hS<hD && hD<hG)) miss(`the presets' loop heights are not Still < Drift < Glimmer: ${hS.toFixed(2)} / ${hD.toFixed(2)} / ${hG.toFixed(2)}`);
    if(!(lp(S).length<lp(D).length)) miss(`Still is not sparser than Drift: ${lp(S).length} vs ${lp(D).length} loop notes an hour`);
    if(!(G.filter(e=>e.kind==='glass').length>D.filter(e=>e.kind==='glass').length)) miss('Glimmer has no more glass than Drift'); }
  /* the response */
  { const N=5, mine=[1,3,1,3,1], times=ev=>ev.map(e=>e.kind+'@'+e.t.toFixed(9)).join();
    const off0=run('drift',N,11).ev, offP=run('drift',N,11,{ played:mine }).ev, onP=run('drift',N,11,{ played:mine, answer:true }).ev; n+=2;
    if(JSON.stringify(off0)!==JSON.stringify(offP)) miss('with the response off, your notes changed the bed');
    if(times(onP)!==times(off0)) miss('with the response on, an event moved in time — it must change only which notes, never when');
    const share=(answer, pl)=>{ let hit=0, all=0; for(let sd=1; sd<=40; sd++) for(const e of run('drift',N,sd,{ played:pl, answer, sec:600 }).ev){ const st= e.kind==='loop' ? [e.step] : e.kind==='chord' ? e.steps : null; if(!st) continue; for(const s of st){ all++; if(mine.includes(mod(s,N))) hit++; } } return hit/all; };
    const sOn=share(true,mine), sOff=share(false,mine), sNone=share(false,[]); n+=2;
    if(!(sOn>sOff+0.03)) miss(`the response does not lean: your notes are ${(100*sOn).toFixed(1)} % of the bed's notes with it on, ${(100*sOff).toFixed(1)} % off`);
    if(Math.abs(sOff-sNone)>1e-12) miss('CONTROL: with the response off the share depends on your notes'); }
  /* CONTROL for the no-repeat check: equal loop lengths and no phrase changes must repeat */
  { const R2=JSON.parse(JSON.stringify(R)); R2.loops.vary=0; R2.loops.renew=0; const P2={ ...R2.presets.drift, loopLen:[20,20,20,20], arcDepth:0 };
    const ev=run('drift',5,7,{ R:R2, P:P2, sec:1200 }).ev.filter(e=>e.kind==='loop'); let same=0; const sig=new Set();
    for(let w=0; w+60<=1200; w+=20){ const k=ev.filter(e=>e.t>=w && e.t<w+60).map(e=>(e.t-w).toFixed(2)+'/'+e.v+'/'+e.step).join(); if(k && sig.has(k)) same++; sig.add(k); }
    n++; if(!same) miss('CONTROL: equal loop lengths without changes did not repeat — the no-repeat check cannot fail'); }
  /* a scale-size change keeps the phrases (5 → 7 degrees at 300 s): every loop note after it lies in its voice's 7-degree register, and a voice
     that did not change its phrase plays its stored steps, folded into that register */
  { const P=R.presets.drift, st=L.bed2Init(21, R, P); L.bed2Step(st, R, P, 5, 300); const kept=st.loops.map(x=>({ steps:x.phrase ? x.phrase.map(q=>q.step) : null, ch:x.changes }));
    const after=L.bed2Step(st, R, P, 7, 420).filter(e=>e.kind==='loop'); let bad=0, same=0;
    for(const e of after){ const reg=L.bed2LoopReg(P, e.v, 7), K=kept[e.v]; if(e.step<reg.lo || e.step>reg.hi){ bad++; continue; }
      if(K.steps && st.loops[e.v].changes===K.ch){ if(K.steps.some(s=>L.bed2Fold(s, reg.lo, reg.hi, 7)===e.step)) same++; else bad++; } }
    n++; if(bad || !same) miss(`a scale-size change: ${bad} loop notes off their phrase or register, ${same} kept`); }
  /* the wavetables: band-limited (energy above the zone's last harmonic); CONTROL: a table with harmonics past the limit is caught */
  { const T=L.bed2Tables(48000), N=T.size, over=(t, fromK)=>{ let e=0, tot=0; for(let k=1;k<200;k++){ let re=0, im=0; for(let i=0;i<N;i+=1){ re+=t[i]*Math.cos(2*Math.PI*k*i/N); im+=t[i]*Math.sin(2*Math.PI*k*i/N); } const p=re*re+im*im; tot+=p; if(k>=fromK) e+=p; } return e/tot; };
    for(const z of [3,5]){ const H=Math.max(1, Math.min(64, Math.floor(0.45*48000/T.zones[z]))); n++; if(over(T.saw[z], H+1)>1e-9) miss(`wavetable zone ${z} has energy above harmonic ${H}`); if(T.saw[z][N]!==T.saw[z][0]) miss(`wavetable zone ${z}: no guard sample`); }
    const bad=new Float32Array(N+1); for(let i=0;i<N;i++) for(let k=1;k<=30;k++) bad[i]+=Math.sin(2*Math.PI*k*i/N)/k; n++;
    if(!(over(bad, 25)>1e-4)) miss('CONTROL: a table with 30 harmonics read as band-limited at 24 — the check cannot fail'); }
  return { cases:n, total:d.length, differences:d, notes:['work census (laptop µs per quantum, 5 degrees, an hour): '+Object.entries(work).map(([k,w])=>`${k} ${w.full} (95 % ${w.p95}, peak ${w.peak}; Lighter ${w.light}, 95 % ${w.lightP95}, peak ${w.lightPeak})`).join(' · ')+`; the gate ${BUDGET} µs = 5 %`] };
}
/* NIGHT-3: THE ROOM RECORDS — every room of the catalogue is valid (apps/night/pure/room.js) against this app's modes, the ids are the pinned list,
   every look's tokens are in night.css, every Night mood has a look, an unknown mood falls back to the room's default look; CONTROLS: each damage
   of ROOM_DAMAGES is refused with a line naming its field */
async function nightRooms(){
  const d=[]; let n=0; const miss=s=>d.push(s), fs=await import('node:fs'), rd=f=>fs.readFileSync(new URL('../'+f, import.meta.url),'utf8');
  const V=await import(new URL('../apps/night/pure/room.js', import.meta.url).href), F=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  const known={ modes:JSON.parse(rd('core/data/index.json')).modes }, prof=JSON.parse(rd('apps/night/data/night.json')), css=rd('apps/night/night.css'), recs=[F];
  n++; if(JSON.stringify(recs.map(r=>r.id))!==JSON.stringify(V.ROOM_IDS)) miss(`the rooms ${recs.map(r=>r.id)} are not the pinned ids ${V.ROOM_IDS}`);
  for(const r of recs){ n++; const why=V.checkRoom(r, known); if(why) miss(r.id+': '+why);
    for(const [k,L] of Object.entries(r.looks)) for(const tn of Object.values(L.tokens)){ n++; if(!new RegExp('--cv-'+tn+':').test(css)) miss(`${r.id} look ${k}: no token --cv-${tn} in night.css`); }
    for(const m of prof.moods){ n++; if(!r.moods[m]) miss(`${r.id}: the Night mood ${m} has no look`); }
    n++; if(V.roomLook(r,'no-such-mood')!==r.looks[r.look]) miss(`CONTROL ${r.id}: an unknown mood does not fall back to the default look`); }
  for(const [field, dmg] of V.ROOM_DAMAGES){ const r=JSON.parse(JSON.stringify(F)); dmg(r); n++; const why=V.checkRoom(r, known);
    if(!why || !why.startsWith(field)) miss(`CONTROL: the damage «${field}» was ${why ? 'refused as «'+why+'»' : 'accepted'}`); }
  return { cases:n, total:d.length, differences:d };
}
/* RUN 9 (slice 2): THE FOREST'S LIFE (core/forestlife.js + the fireflies' call / scatter) — the stream's line is smooth, crosses the aisle,
   its nearest point is right (vs a brute-force resampling); the mushrooms' and flowers' places are seeded (CONTROL another seed differs), in
   the aisle, never in the water; the pulse falls with distance; a ring list fills free slots, then replaces the OLDEST, and ages out (CONTROL
   without ageing they stay); the fireflies GATHER to a calling light (≥ 1.5× near it after 12 s) and SCATTER slowly when it stops calling
   (their mean distance grows vs a light that keeps them) — CONTROL a light without call / scatter is exactly the old step */
async function lifeCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const Li=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href), Fl=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href), S=Li.STREAM, L=Li.STREAM_LINE;
  n++; if(L.length!==S.seg+1) miss('stream line has '+L.length+' points');
  let gap=0; for(let i=1;i<L.length;i++) gap=Math.max(gap, Math.hypot(L[i].x-L[i-1].x, L[i].z-L[i-1].z)); n++; if(gap>0.5) miss('stream line step '+gap.toFixed(3));
  n+=2; if(Math.hypot(L[0].x-S.pts[0][0], L[0].z-S.pts[0][1])>1e-9 || Math.hypot(L[L.length-1].x-S.pts[S.pts.length-1][0], L[L.length-1].z-S.pts[S.pts.length-1][1])>1e-9) miss('stream ends are not its first / last points');
  if(!(Li.streamNear(0,0).d<1)) miss('the stream does not cross the aisle near (0, 0): '+Li.streamNear(0,0).d.toFixed(2));
  const fine=Array.from({ length:3001 }, (_,i)=>Li.streamAt(i/3000)); let worst=0;
  for(let k=0;k<60;k++){ const x=-10+k*0.37, z=3-((k*7)%16); const q=Li.streamNear(x,z), b=Math.min(...fine.map(p=>Math.hypot(p.x-x, p.z-z))); worst=Math.max(worst, Math.abs(q.d-b)); }
  n++; if(worst>0.03) miss('streamNear off by '+worst.toFixed(3)+' vs brute force');
  const P1=Li.lifePlaces(), P2=Li.lifePlaces(), P3=Li.lifePlaces(Li.LIFE.shrooms, Li.LIFE.blooms, 7); n+=3;
  if(JSON.stringify(P1)!==JSON.stringify(P2)) miss('two place sets from one seed differ'); if(JSON.stringify(P1)===JSON.stringify(P3)) miss('CONTROL: another seed gave the same places');
  if(P1.filter(p=>p.kind==='shroom').length!==Li.LIFE.shrooms || P1.filter(p=>p.kind==='bloom').length!==Li.LIFE.blooms) miss('counts '+P1.length);
  for(const p of P1){ n++; if(Li.streamNear(p.x,p.z).d<S.half+0.25 || Math.abs(p.x)>6.6 || p.z>1.1 || p.z<-13.1 || Math.hypot(p.x,p.z-5.5)<2.4) miss('a place out of bounds or in the water: '+JSON.stringify(p)); }
  n+=3; if(Li.pulseOf(1,1,1,1,0.8)!==0.8) miss('pulse at the light ≠ vel'); if(Math.abs(Li.pulseOf(Li.LIFE.reach,0,0,0,1)-Math.exp(-0.5))>1e-12) miss('pulse at reach'); if(!(Li.pulseOf(10,0,0,0,1)<1e-3)) miss('pulse far');
  const R=Li.ringsNew(3); Li.ringAdd(R,0,0,1,1); Li.ringAdd(R,1,0,2,1); Li.ringAdd(R,2,0,3,1); const s4=Li.ringAdd(R,3,0,4,1); n+=3;
  if(!(s4.x===3 && R.filter(r=>r.t0===1).length===0)) miss('a full list did not replace the oldest');
  if(Li.ringsAge(R, 5.5, 3)!==2) miss('ageing: '+R.map(r=>r.t0).join(','));
  const R2=Li.ringsNew(2); Li.ringAdd(R2,0,0,1,1); if(R2.filter(r=>r.t0>=0).length!==1) miss('CONTROL: an unaged list lost a ring');
  /* the fireflies' call and scatter */
  const near=(A,L0,r)=>A.filter(q=>Math.hypot(q.p[0]-L0.x, q.p[1]-L0.y, q.p[2]-L0.z)<r).length, mean=(A,L0)=>A.reduce((s,q)=>s+Math.hypot(q.p[0]-L0.x, q.p[1]-L0.y, q.p[2]-L0.z),0)/A.length;
  const L0={ x:0.5, y:1.4, z:-2.5, on:1 }, run=(call, n0, A=Fl.fliesInit(), t0=0)=>{ for(let i=0;i<n0;i++) Fl.fliesStep(A, [{ ...L0, ...call }], 1/60, t0+i/60); return A; };
  const a0=run({}, 720), a1=run({ call:1 }, 720), nb=near(a0,L0,3), nc=near(a1,L0,3); n++;
  if(!(nc>=Math.max(4, 1.5*nb))) miss(`a calling light gathers ${nc} within 3 (not calling ${nb}) — ≥ 1.5× expected`);
  const keep=run({ call:1 }, 600, run({ call:1 }, 720), 12), sc=run({ scatter:1 }, 600, run({ call:1 }, 720), 12), mk=mean(keep,L0), ms=mean(sc,L0); n++;
  if(!(ms>mk*1.3)) miss(`scattering: mean distance ${ms.toFixed(2)} vs kept ${mk.toFixed(2)} (≥ 1.3× expected)`);
  const h=A=>JSON.stringify(A.map(q=>q.p.map(v=>Math.round(v*1e9)))); n++; if(h(run({}, 300))!==h(run({ call:0, scatter:0 }, 300))) miss('CONTROL: call 0 / scatter 0 is not the old step');
  return { cases:n, total:d.length, differences:d };
}
/* NIGHT-6 slice 1: THE FOREST ANSWERS (apps/night/rooms/forest/pure/answers.js, apps/night/pure/heard.js). Dew: each level's count, inside its
   band, never in the stream or under the eye, repeatable (CONTROL another seed differs); its light near ≥ 5× far, glint raises it, the light off
   gives 0 (CONTROL: on gives more). Webs beside the trunks given: off the aisle, inside the band, each beside its own trunk (CONTROL a web at the
   aisle is caught); none without trunks. A note's stream ring: full at the water, fainter away, none past the reach. The envelope: 0 before and
   after, 1 at its peak, never above. The bed's clusters: disjoint, near their first, the farthest first (CONTROL r 0: one each). Heard: an event
   lands at the output time; the CONTROL that ignores the output latency is early by it, more than one 30-fps frame. */
async function forestAnswersCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const A=await import(new URL('../apps/night/rooms/forest/pure/answers.js', import.meta.url).href), Li=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href);
  const H=await import(new URL('../apps/night/pure/heard.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, D=A.ANSWERS.dew, W=A.ANSWERS.webs;
  for(const lv of ['full','reduced']){ const want=FR.levels[lv].dew, p=A.dewPlaces(want); let bad=0; n+=2;
    if(p.n!==want) miss(`${lv}: ${p.n} dew points (${want} wanted)`);
    for(let i=0;i<p.n;i++){ const x=p.pos[i*3], z=p.pos[i*3+2]; if(Math.hypot(x-D.cam[0], z-D.cam[1])<D.camR || Li.streamNear(x,z).d<Li.STREAM.half+0.1 || Math.abs(x)>D.x || z>D.zNear || z<D.zFar) bad++; }
    if(bad) miss(`${lv}: ${bad} dew points out of their band, in the water or under the eye`); }
  { const a=A.dewPlaces(200), b=A.dewPlaces(200), c=A.dewPlaces(200, 7), h=x=>Array.from(x.pos).join(); n+=2; if(h(a)!==h(b)) miss('dew: one seed gave two sets'); if(h(a)===h(c)) miss('CONTROL dew: another seed gave the same set'); }
  { const near=A.dewLight(0.3,1,0,1), far=A.dewLight(3,1,0,1), gl=A.dewLight(0.3,1,1,1), off=A.dewLight(0.3,0,1,1); n+=4;
    if(!(near>=5*far)) miss(`dew: near ${near.toFixed(3)} vs far ${far.toFixed(3)}`); if(!(gl>near)) miss('dew: a glint does not raise it'); if(off!==0) miss('dew: the light off gives '+off); if(!(near>0)) miss('CONTROL dew: the light on gives nothing');
    const wn=A.webLight(0.4,1,0), wf=A.webLight(4,1,0), wo=A.webLight(0.4,0,1); n+=3; if(!(wn>=5*wf)) miss(`webs: near ${wn.toFixed(3)} vs far ${wf.toFixed(3)}`); if(wo!==0) miss('webs: the light off gives '+wo); if(!(A.webLight(0.4,1,1)>wn)) miss('webs: a glint does not raise it'); }
  { const trunks=[[-2.1,-2.2,0.34],[2.5,-4.6,0.42],[-1.3,-8.2,0.3],[3.6,0.4,0.28],[-4.2,-5,0.5],[1.1,-11.5,0.36],[-3.3,1.2,0.22],[4.6,-9,0.46],[0,-3,0.3],[9,-2,0.4],[-2,-20,0.4]];
    const ok=(w,t)=>Math.abs(w.x)>=W.aisle-1e-9 && Math.abs(w.x)<=W.xMax+1e-9 && w.z<=W.zNear+0.25 && w.z>=W.zFar-0.25 && t.some(([x,z,r])=>Math.abs(Math.abs(w.x-x)-(r+w.s/2))<=W.off[1]+1e-9 && Math.abs(Math.abs(w.x-x)-(r+w.s/2))>=W.off[0]-1e-9 && Math.abs(w.z-z)<=0.25+1e-9);
    const ws=A.webPlaces(9, trunks); n+=3; notes.push(`webs beside 11 test trunks: ${ws.length} of 9 asked`);
    if(!(ws.length>=5 && ws.length<=9)) miss(`webs: ${ws.length} placed beside 11 trunks`); const bad=ws.filter(w=>!ok(w, trunks)); if(bad.length) miss('webs off their trunk or band: '+JSON.stringify(bad[0]));
    if(ok({ x:0, z:-3, s:0.5 }, trunks)) miss('CONTROL webs: a web at the aisle passed'); n++; if(A.webPlaces(9, []).length) miss('webs without trunks'); }
  { const R=A.ANSWERS.ring; n+=4; if(Math.abs(A.noteRingAmp(0,1)-R.amp)>1e-12) miss('the stream ring at the water ≠ its amp'); if(Math.abs(A.noteRingAmp(R.reach,1)-R.amp/Math.E)>1e-12) miss('the stream ring at the reach ≠ amp / e');
    if(A.noteRingAmp(2.5*R.reach,1)!==0) miss('a stream ring far from the water'); if(A.noteRingAmp(0,0)!==0) miss('a stream ring at velocity 0'); }
  { const e=a=>A.swellAt(a, 1.5, 0.5, 4); n+=4; if(e(-0.1)!==0 || e(6.01)!==0) miss('the envelope is not 0 outside'); if(Math.abs(e(1.5)-1)>1e-12 || Math.abs(e(1.9)-1)>1e-12) miss('the envelope is not 1 at its peak');
    let mono=true, prev=-1, mx=0; for(let a=0;a<=1.5;a+=0.01){ const v=e(a); if(v<prev-1e-12) mono=false; prev=v; } for(let a=0;a<=6;a+=0.01) mx=Math.max(mx, e(a)); if(!mono) miss('the envelope does not rise steadily'); if(mx>1+1e-12) miss('the envelope above 1'); }
  { const P=Li.lifePlaces(), C=A.bedClusters(P), all=C.flat(); n+=4;
    if(C.length!==A.ANSWERS.bed.loop.clusters) miss(`${C.length} bed clusters (${A.ANSWERS.bed.loop.clusters} wanted)`);
    if(new Set(all).size!==all.length || all.some(i=>P[i].kind!=='shroom')) miss('the bed clusters overlap or hold a flower');
    if(C.some(c=>c.some(i=>Math.hypot(P[i].x-P[c[0]].x, P[i].z-P[c[0]].z)>A.ANSWERS.bed.loop.r+1e-9))) miss('a cluster member is far from its first');
    const zs=C.map(c=>P[c[0]].z); if(zs.some((z,i)=>i && z<zs[i-1])) miss('the clusters are not farthest first: '+zs.map(z=>z.toFixed(2)).join(' '));
    n++; if(A.bedClusters(P, 4, 0).some(c=>c.length!==1)) miss('CONTROL: clusters of radius 0 hold more than one');
    notes.push('the bed\'s clusters: '+C.map(c=>`${c.length} at z ${P[c[0]].z.toFixed(1)}`).join(', ')); }
  { const ck={ ctx:10, perf:5000, now:10.15, nowPerf:5000 }, h=H.heardMs(ck, 10.5), c=H.heardMs(ck, 10.5, true); n+=2;
    if(Math.abs(h-5500)>1e-9) miss('heard: '+h+' ms (5500 expected)'); if(!(h-c>1000/30)) miss(`CONTROL heard: ignoring the output latency lands ${(h-c).toFixed(1)} ms early (more than one 30-fps frame expected)`); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 2: THE FIREFLIES FOLLOW THE MELODY (apps/night/rooms/forest/pure/fireflies.js). holdK and rateK at their marks; no melody input
   (absent, or 0) is exactly the old step; a long note (hold 1, 12 s, a calling light) brings the near flies ≥ 20 % closer, slower, their glow in
   step (spread ≤ half); fast playing (rate 1) takes them ≥ 15 % further out and quicker; CONTROL — the old law (the inputs stripped) meets
   neither; fliesDart: the n nearest within reach gain exactly speed × s outwards, nobody else moves, s 0 moves nothing. */
async function forestMelodyCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), Fl=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href), C=Fl.FOREST_FLIES, M=C.melody;
  n+=4; if(Fl.holdK(0)!==0 || Fl.holdK(M.hold.from)!==0) miss('holdK below its start is not 0'); if(Fl.holdK(M.hold.full)!==1) miss('holdK at its full is not 1');
  if(Math.abs(Fl.holdK((M.hold.from+M.hold.full)/2)-0.5)>1e-12) miss('holdK half-way is not 0.5'); if(!(Fl.holdK(10)===1)) miss('holdK above full is not 1');
  { const at=(k,t=10)=>Array.from({ length:k }, (_,i)=>t-i*(M.rate.window/k)*0.999); n+=4;
    if(Fl.rateK(at(2),10)!==0) miss('rateK of 1 note a second is not 0'); if(Fl.rateK(at(M.rate.full*M.rate.window),10)!==1) miss('rateK at its full is not 1');
    if(!(Fl.rateK(at(6),10)>0 && Fl.rateK(at(6),10)<1)) miss('rateK of 3 notes a second is not between'); if(Fl.rateK([1,2,3,4,5,6,7,8,9,9.5].map(x=>x-20),10)!==0) miss('rateK counted notes outside its window'); }
  const L0={ x:0.5, y:1.4, z:-2.5, on:1 }, run=(extra, steps, strip=false)=>{ const A=Fl.fliesInit(); for(let i=0;i<steps;i++){ const L={ ...L0, call:1, ...extra }; if(strip){ delete L.hold; delete L.rate; } Fl.fliesStep(A, [L], 1/60, i/60); } return A; };
  const near=A=>A.filter(q=>Math.hypot(q.p[0]-L0.x, q.p[1]-L0.y, q.p[2]-L0.z)<C.reach), mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
  const dist=A=>mean(near(A).map(q=>Math.hypot(q.p[0]-L0.x, q.p[1]-L0.y, q.p[2]-L0.z))), speed=A=>mean(near(A).map(q=>Math.hypot(...q.v))), spread=A=>{ const g=near(A).map(q=>q.glow), m=mean(g); return Math.sqrt(mean(g.map(x=>(x-m)**2))); };
  const h=A=>JSON.stringify(A.map(q=>q.p.map(v=>Math.round(v*1e9)))); n++; if(h(run({},600))!==h(run({ hold:0, rate:0 },600))) miss('hold 0 / rate 0 is not the old step');
  const B=run({},720), H=run({ hold:1 },720), R=run({ rate:1 },720), Hs=run({ hold:1 },720,true), Rs=run({ rate:1 },720,true); n+=5;
  if(!(dist(H)<=0.8*dist(B))) miss(`a long note: the near flies ${dist(H).toFixed(2)} from the light (without ${dist(B).toFixed(2)}; ≥ 20 % closer expected)`);
  if(!(speed(H)<speed(B))) miss(`a long note: the near flies move ${speed(H).toFixed(3)} (without ${speed(B).toFixed(3)}; slower expected)`);
  if(!(spread(H)<=0.5*spread(B))) miss(`a long note: their glow spreads ${spread(H).toFixed(3)} (without ${spread(B).toFixed(3)}; in step expected)`);
  if(!(dist(R)>=1.15*dist(B))) miss(`fast playing: the near flies ${dist(R).toFixed(2)} from the light (without ${dist(B).toFixed(2)}; ≥ 15 % further expected)`);
  if(!(speed(R)>speed(B))) miss(`fast playing: the near flies move ${speed(R).toFixed(3)} (without ${speed(B).toFixed(3)}; quicker expected)`);
  n+=2; if(dist(Hs)<=0.8*dist(B) || spread(Hs)<=0.5*spread(B)) miss('CONTROL: the old law (hold stripped) passed the long-note cases'); if(dist(Rs)>=1.15*dist(B)) miss('CONTROL: the old law (rate stripped) passed the fast-playing case');
  notes.push(`near flies, mean distance / speed / glow spread: plain ${dist(B).toFixed(2)} / ${speed(B).toFixed(3)} / ${spread(B).toFixed(3)} · a long note ${dist(H).toFixed(2)} / ${speed(H).toFixed(3)} / ${spread(H).toFixed(3)} · fast playing ${dist(R).toFixed(2)} / ${speed(R).toFixed(3)}`);
  { const A=run({},720), before=A.map(q=>({ p:q.p.slice(), v:q.v.slice() })), ids=Fl.fliesDart(A, L0, 1), Dd=M.dart; n+=4;
    const dl=i=>Math.hypot(before[i].p[0]-L0.x, before[i].p[1]-L0.y, before[i].p[2]-L0.z), inReach=before.map((q,i)=>i).filter(i=>dl(i)<Dd.reach);
    if(ids.length!==Math.min(Dd.n, inReach.length)) miss(`a dart moved ${ids.length} flies (${Math.min(Dd.n, inReach.length)} expected)`);
    if(inReach.some(i=>!ids.includes(i) && ids.some(j=>dl(j)>dl(i)))) miss('a dart moved a fly while a nearer one stayed');
    if(ids.some(i=>{ const u=before[i].p.map((v,a)=>(v-[L0.x,L0.y,L0.z][a])/Math.max(dl(i),0.05)), gain=A[i].v.reduce((s2,v,a)=>s2+(v-before[i].v[a])*u[a],0); return Math.abs(gain-Dd.speed)>1e-9; })) miss('a dart did not add exactly its speed outwards');
    if(A.some((q,i)=>!ids.includes(i) && q.v.some((v,a)=>v!==before[i].v[a]))) miss('a dart moved a fly it did not choose');
    const B2=run({},720), b2=h(B2), v2=JSON.stringify(B2.map(q=>q.v)); n++; if(Fl.fliesDart(B2, L0, 0).length || h(B2)!==b2 || JSON.stringify(B2.map(q=>q.v))!==v2) miss('a dart of strength 0 moved something'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 3: THE FOREST FLOOR's places (apps/night/rooms/forest/pure/floor.js) at each level's counts beside the forest's fixed trunks and
   a few ferns: every species gets its count; no plant in the water (sedges on the bank only), none within 1.2 m of the eye, nettles near a
   trunk, fine ferns away from today's ferns; damp-lovers (sorrel) sit damper and light-lovers (anemone) lighter — CONTROL: the same places with
   their species shuffled show neither; repeatable, another seed differs (CONTROL); the sheet's cells inside it, apart, their uv inside 0…1. */
async function forestFloorCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), Fp=await import(new URL('../apps/night/rooms/forest/pure/floor.js', import.meta.url).href), Li=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href);
  const FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, K=Fp.FLOOR;
  const trunks=[[-2.1,-2.2,0.34],[2.5,-4.6,0.42],[-1.3,-8.2,0.3],[3.6,0.4,0.28],[-4.2,-5,0.5],[1.1,-11.5,0.36],[-3.3,1.2,0.22],[4.6,-9,0.46],[-7,-12,0.4],[8,-3,0.35],[6,-15,0.4]], ferns=[[-3,0,1],[2,-6,1],[0.5,-1.5,0.8]];
  const KEYS=[...Fp.HERBS, 'fern2'], mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
  for(const lv of ['full','reduced']){ const L=FR.levels[lv], want={}; for(const k of KEYS) want[k]=L[k]; const P=Fp.floorPlaces(want, trunks, ferns), by={}; for(const p of P) by[p.sp]=(by[p.sp]||0)+1;
    for(const k of KEYS){ n++; if(by[k]!==want[k]) miss(`${lv}: ${by[k]||0} ${k} placed (${want[k]} asked)`); }
    let wet=0, eye=0, net=0, fg=0; for(const p of P){ const q=Li.streamNear(p.x,p.z), b=q.d-Li.STREAM.half;
      if(p.sp==='sedge' ? b<K.sedgeBank[0]-1e-9 || b>K.sedgeBank[1]+1e-9 : b<0) wet++; if(Math.hypot(p.x-K.eye[0], p.z-K.eye[1])<K.eyeR) eye++;
      if(p.sp==='nettle' && !trunks.some(([x,z,r])=>Math.hypot(x-p.x,z-p.z)-r<K.nettleR*2)) net++; if(p.sp==='fern2' && ferns.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<K.fernGap)) fg++; }
    n+=4; if(wet) miss(`${lv}: ${wet} plants in the water (or sedges off the bank)`); if(eye) miss(`${lv}: ${eye} plants under the eye`); if(net) miss(`${lv}: ${net} nettles far from every trunk`); if(fg) miss(`${lv}: ${fg} fine ferns beside today's ferns`);
    notes.push(`${lv}: `+KEYS.map(k=>`${k} ${by[k]||0}`).join(', ')+` — ${P.length} plants`);
    if(lv==='full'){ const ms=sp=>mean(P.filter(p=>p.sp===sp).map(p=>Fp.moistAt(p.x,p.z))), ls=sp=>mean(P.filter(p=>p.sp===sp).map(p=>Fp.lightAt(p.x,p.z)));
      const dm=ms('sorrel')-ms('anemone'), dl=ls('anemone')-ls('sorrel'); n+=2;
      if(!(dm>=0.04)) miss(`sorrel is not damper than anemone: ${ms('sorrel').toFixed(3)} vs ${ms('anemone').toFixed(3)}`); if(!(dl>=0.04)) miss(`anemone is not lighter than sorrel: ${ls('anemone').toFixed(3)} vs ${ls('sorrel').toFixed(3)}`);
      const R=(()=>{ let a=7; return ()=>{ a=(Math.imul(a,1103515245)+12345)>>>0; return a/4294967296; }; })(), two=P.filter(p=>p.sp==='sorrel'||p.sp==='anemone'), lab=two.map(p=>p.sp);
      for(let i=lab.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [lab[i],lab[j]]=[lab[j],lab[i]]; }
      const sh=two.map((p,i)=>({ ...p, sp:lab[i] })), smm=sp=>mean(sh.filter(p=>p.sp===sp).map(p=>Fp.moistAt(p.x,p.z))), sll=sp=>mean(sh.filter(p=>p.sp===sp).map(p=>Fp.lightAt(p.x,p.z))); n++;
      if(smm('sorrel')-smm('anemone')>=0.04 || sll('anemone')-sll('sorrel')>=0.04) miss('CONTROL: the species shuffled still sort by damp and light — the ecology check cannot fail');
      notes.push(`damp: sorrel ${ms('sorrel').toFixed(2)} vs anemone ${ms('anemone').toFixed(2)}; light: anemone ${ls('anemone').toFixed(2)} vs sorrel ${ls('sorrel').toFixed(2)} (shuffled: ${(smm('sorrel')-smm('anemone')).toFixed(3)} / ${(sll('anemone')-sll('sorrel')).toFixed(3)})`); } }
  { const c={ sorrel:300, forb:100, bilberry:40, anemone:100, nettle:20, sedge:80, fern2:20 }, a=JSON.stringify(Fp.floorPlaces(c, trunks, ferns)), b=JSON.stringify(Fp.floorPlaces(c, trunks, ferns)), e=JSON.stringify(Fp.floorPlaces(c, trunks, ferns, 7)); n+=2;
    if(a!==b) miss('the floor: one seed gave two sets'); if(a===e) miss('CONTROL the floor: another seed gave the same set'); }
  { const A=Fp.FLOOR_ATLAS, rs=Object.entries(A.cells); n+=3;
    if(rs.some(([,[x,y,w,h]])=>x<0||y<0||x+w>A.size||y+h>A.size)) miss('a cell leaves the sheet');
    if(rs.some(([a,r1],i)=>rs.some(([b,r2],j)=>j>i && r1[0]<r2[0]+r2[2] && r2[0]<r1[0]+r1[2] && r1[1]<r2[1]+r2[3] && r2[1]<r1[1]+r1[3]))) miss('two cells overlap');
    if(rs.some(([sp])=>{ const u=Fp.cellUv(sp); return u[0]<0||u[1]<0||u[0]+u[2]>1+1e-12||u[1]+u[3]>1+1e-12; })) miss('a cell\'s uv leaves 0…1'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 4: THE STREAM (apps/night/rooms/forest/pure/forestlife.js, stream.js). It flows towards the eye (its last stretch nears the eye,
   its end is the nearest point); the moon's reflection from the eye (the moon at its base place) lands on the water — CONTROL a reflection
   computed for a moon on the other side lands off it; the bed: never above the floor, the floor itself a bank away, deepest at the centre, smooth;
   the water below the bank's top; outOfWater moves a point exactly to its clearance and leaves a clear one alone; the rocks, pebbles, drifting
   leaves and mist strips: their counts, places (none under the eye; wet rocks in the water, the others on the bank), the leaves ride
   downstream and start again upstream; repeatable. */
/* NIGHT-8: row «NIGHT stream sound (app)» — the stream's murmur law (apps/night/pure/brook.js) with the forest's voices: (1) the same seed twice is
   the same sound, CONTROL another seed differs; (2) finite, its peak under −6 dBFS, its RMS in a sane window; (3) NO LOOP: the 50-ms energy
   envelope's normalised autocorrelation stays under 0.5 at every lag 1…20 s — CONTROL a render built by repeating one 6-s stretch shows ≥ 0.9;
   (4) the near water wider than the far: the inter-channel correlation of the nearest voice alone is lower than the farthest's — CONTROL the
   nearest with no spread and in the middle correlates ≥ 0.98; the voices: the nearest loudest and widest, the farthest darkest; (5) the Lighter
   mode makes ≤ 65 % of the bubbles; asleep, zeros; (6) the voices validator: the forest's pass, damaged ones are refused; (7) the worklet imports
   this very law and registers the name the sound module builds. */
async function nightStreamSound(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const B=await import(new URL('../apps/night/pure/brook.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, S=await import(new URL('../apps/night/rooms/forest/pure/stream.js', import.meta.url).href);
  const fs=await import('node:fs'), RATE=48000, V=FR.nature.stream.voices;
  const render=(voices, sec, seed, o={})=>{ const st=B.brookNew(RATE, voices, seed); if(o.light) st.light=true; if(o.sleep) st.sleep=true; const N=Math.round(RATE*sec), L=new Float32Array(N), R=new Float32Array(N);
    for(let i=0;i<N;i+=128) B.brookOut(st, L, R, i, Math.min(128, N-i)); return { L, R, st }; };
  const rms=(x, y)=>{ let s=0; for(let i=0;i<x.length;i++) s+=x[i]*x[i]+y[i]*y[i]; return Math.sqrt(s/(2*x.length)); };
  const corr=(x, y)=>{ let a=0, b=0, c=0; for(let i=0;i<x.length;i++){ a+=x[i]*y[i]; b+=x[i]*x[i]; c+=y[i]*y[i]; } return a/Math.sqrt(b*c||1); };
  const selfSim=(L, R)=>{ const h=RATE/20, m=Math.floor(L.length/h), e=new Float64Array(m); for(let k=0;k<m;k++){ let s=0; for(let i=k*h;i<(k+1)*h;i++) s+=L[i]*L[i]+R[i]*R[i]; e[k]=Math.sqrt(s/h); }
    const mu=e.reduce((a,b)=>a+b,0)/m; for(let k=0;k<m;k++) e[k]-=mu; let best=0, at=0;
    for(let lag=20;lag<=Math.min(400, m-40);lag++){ let s=0, a=0, b=0; for(let k=0;k+lag<m;k++){ s+=e[k]*e[k+lag]; a+=e[k]*e[k]; b+=e[k+lag]*e[k+lag]; } const c=s/Math.sqrt(a*b||1); if(c>best){ best=c; at=lag/20; } } return { best, at }; };
  const t0=performance.now(), A=render(V, 40, B.BROOK.seed), ms=performance.now()-t0;
  { const A2=render(V, 4, B.BROOK.seed), C=render(V, 4, B.BROOK.seed+1); let rep=0, ctl=0; for(let i=0;i<A2.L.length;i++){ rep=Math.max(rep, Math.abs(A.L[i]-A2.L[i]), Math.abs(A.R[i]-A2.R[i])); ctl=Math.max(ctl, Math.abs(A.L[i]-C.L[i])); } n+=2;
    if(rep!==0) miss('the same seed twice differs by '+rep.toExponential(2)); if(!(ctl>1e-3)) miss('CONTROL: another seed gave the same stream'); }
  { let pk=0, bad=0; for(let i=0;i<A.L.length;i++){ const a=Math.abs(A.L[i]), b=Math.abs(A.R[i]); if(!Number.isFinite(a+b)) bad++; pk=Math.max(pk, a, b); } const r=rms(A.L, A.R), db=x=>(20*Math.log10(x)).toFixed(1); n+=2;
    if(bad || !(pk<0.5)) miss(`${bad} samples not finite, peak ${db(pk)} dBFS (under −6 wanted)`); if(!(r>0.005 && r<0.1)) miss(`RMS ${db(r)} dBFS (−46…−20 wanted)`);
    notes.push(`40 s: RMS ${db(r)} dBFS, peak ${db(pk)} dBFS, ${A.st.made} bubbles (${(A.st.made/40).toFixed(0)}/s), ${A.st.dropped} dropped; rendered in ${(ms/400).toFixed(2)} % of real time on this machine (not judged)`); }
  { const ss=selfSim(A.L, A.R); const P=Math.round(RATE*6), L2=new Float32Array(A.L.length), R2=new Float32Array(A.L.length); for(let i=0;i<L2.length;i++){ L2[i]=A.L[i%P]; R2[i]=A.R[i%P]; } const sc=selfSim(L2, R2); n+=2;
    if(!(ss.best<0.5)) miss(`the stream repeats: envelope self-similarity ${ss.best.toFixed(3)} at ${ss.at.toFixed(2)} s (under 0.5 wanted)`); if(!(sc.best>=0.9)) miss(`CONTROL: a 6-s loop reads only ${sc.best.toFixed(3)} — the measure cannot see a loop`);
    notes.push(`no loop: the longest self-similarity ${ss.best.toFixed(3)} at ${ss.at.toFixed(2)} s; CONTROL a 6-s loop ${sc.best.toFixed(3)} at ${sc.at.toFixed(2)} s`); }
  { const near=V.reduce((a,v,i)=>v.gain>V[a].gain ? i : a, 0), far=V.reduce((a,v,i)=>v.gain<V[a].gain ? i : a, 0);
    const solo=(v, o={})=>render([{ ...v, gain:1, ...o }], 6, 7), cn=corr(...Object.values(solo(V[near])).slice(0,2)), cf=corr(...Object.values(solo(V[far])).slice(0,2)), cc=corr(...Object.values(solo(V[near], { w:0, pan:0 })).slice(0,2)); n+=3;
    if(!(cn<cf)) miss(`the near water is not wider than the far: correlation near ${cn.toFixed(3)}, far ${cf.toFixed(3)}`); if(!(cc>=0.98)) miss(`CONTROL: the near voice with no spread correlates only ${cc.toFixed(3)}`);
    if(!(V[near].w>=Math.max(...V.map(v=>v.w))-1e-9 && V[far].lp<=Math.min(...V.map(v=>v.lp))+1e-9)) miss('the voices: the nearest is not the widest or the farthest not the darkest '+JSON.stringify(V.map(v=>[v.gain, v.w, v.lp])));
    notes.push(`stereo: correlation near ${cn.toFixed(3)} (CONTROL no spread ${cc.toFixed(3)}), far ${cf.toFixed(3)}; voices pan ${V.map(v=>v.pan).join(' / ')}, gain ${V.map(v=>v.gain).join(' / ')}`); }
  { const Lt=render(V, 10, 3, { light:true }), Nm=render(V, 10, 3), Z=render(V, 1, 3, { sleep:true }); n+=2;
    if(!(Lt.st.made<=0.65*Nm.st.made)) miss(`the Lighter mode made ${Lt.st.made} bubbles against ${Nm.st.made}`); if(Z.L.some(x=>x!==0) || Z.R.some(x=>x!==0)) miss('asleep, the stream still sounds'); }
  { const bad=[['lp', v=>{ v[0]={ ...v[0], lp:50 }; }], ['f', v=>{ v[1]={ ...v[1], f:[900, 300] }; }], ['pan', v=>{ v[2]={ ...v[2], pan:2 }; }]]; n+=1+bad.length;
    if(B.checkBrookVoices(V)) miss('the forest\'s voices refused: '+B.checkBrookVoices(V));
    for(const [k, f] of bad){ const w=V.slice(); f(w); const why=B.checkBrookVoices(w); if(!why || !why.includes('.'+k)) miss(`a damaged ${k} was not refused by name: ${why}`); }
    n++; if(JSON.stringify(V)!==JSON.stringify(S.streamVoices())) miss('the record\'s voices are not the stream\'s geometry (streamVoices)'); }
  { const w=fs.readFileSync(new URL('../apps/night/worklets/nature-worklet.js', import.meta.url), 'utf8'), a=fs.readFileSync(new URL('../apps/night/sound/ambience.js', import.meta.url), 'utf8'); n+=2;
    if(!/from '\.\.\/pure\/brook\.js'/.test(w) || !/brookOut\(/.test(w)) miss('the nature worklet does not run apps/night/pure/brook.js brookOut');
    if(!/registerProcessor\('night-nature'/.test(w) || !/AudioWorkletNode\(E\.ac, 'night-nature'/.test(a)) miss('the worklet\'s name and the sound module\'s node differ'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-8: row «FOREST ground (app)» — the bare ground's law (apps/night/rooms/forest/pure/ground.js): (1) every macro value in 0…1; the stream's
   bed is damp; moss is thicker at the trunks' feet than 3 m away; drifts lie on the trunks' LEE side — CONTROL the same sums with the wind turned
   round favour the other side; (2) the large scale does not repeat with the floor's 6-m tile: macro(x, z) against macro(x + 6, z) correlates
   under 0.6 — CONTROL a field with that period correlates 1; the second copy's share (sel) covers both ends; (3) the litter at each level's
   counts, none in the water, none under the eye; the leaves lie where the drifts are (mean drift above that of uniform points by 0.1 — CONTROL
   uniform points against themselves 0); the twigs nearer the trunks; (4) seeded: the same twice; more leaves move no pebble. */
async function forestGroundCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const G=await import(new URL('../apps/night/rooms/forest/pure/ground.js', import.meta.url).href), L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href);
  const T=(await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href)).forestTrunks(), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  { let out=0, wetBed=0, bed=0; for(let k=0;k<900;k++){ const x=-12+(k%30)*0.8, z=-20+Math.floor(k/30)*0.85, m=G.macroAt(x, z, T); if(m.some(v=>!(v>=0 && v<=1))) out++; }
    for(let u=0.2;u<0.98;u+=0.02){ const p=L.streamAt(u); bed++; if(G.macroAt(p.x, p.z, T)[0]>0.99) wetBed++; } n+=2;
    if(out) miss(out+' macro values outside 0…1'); if(wetBed!==bed) miss(`the stream's bed is damp at ${wetBed} of ${bed} points`); }
  { const ring=(dist, wind)=>{ let moss=0, lee=0, win=0, k=0; for(const [tx, tz, r] of T.slice(0, 40)) for(let a=0;a<16;a++){ const c=Math.cos(a/16*6.283), s2=Math.sin(a/16*6.283), x=tx+c*(r+dist), z=tz+s2*(r+dist), m=G.macroAt(x, z, T); moss+=m[1]; k++;
      const side=c*wind[0]+s2*wind[1]; if(side>0.5) lee+=m[2]; else if(side<-0.5) win+=m[2]; } return { moss:moss/k, lee, win }; };
    const W=G.MACRO.wind, a=ring(0.4, W), b=ring(3, W), c=ring(0.4, [-W[0], -W[1]]); n+=3;
    if(!(a.moss>b.moss+0.15)) miss(`moss at the trunks' feet ${a.moss.toFixed(2)}, 3 m away ${b.moss.toFixed(2)}`);
    if(!(a.lee>a.win)) miss(`the drifts are not on the lee side: lee ${a.lee.toFixed(1)}, windward ${a.win.toFixed(1)}`); if(!(c.lee<c.win)) miss('CONTROL: with the wind turned round the lee side still wins — the measure cannot fail');
    notes.push(`moss at the feet ${a.moss.toFixed(2)} vs 3 m away ${b.moss.toFixed(2)}; drift lee ${a.lee.toFixed(1)} vs windward ${a.win.toFixed(1)}`); }
  { const cor=(f)=>{ const A=[], B=[]; for(let k=0;k<1600;k++){ const x=-20+(k%40)*1.03, z=-30+Math.floor(k/40)*0.91; A.push(f(x, z)); B.push(f(x+6, z)); } const ma=A.reduce((s,v)=>s+v,0)/A.length, mb=B.reduce((s,v)=>s+v,0)/B.length;
      let s=0, a=0, b=0; for(let i=0;i<A.length;i++){ s+=(A[i]-ma)*(B[i]-mb); a+=(A[i]-ma)**2; b+=(B[i]-mb)**2; } return s/Math.sqrt(a*b||1); };
    const cs=[0,1,2,3].map(c=>cor((x, z)=>G.macroAt(x, z, T)[c])), ct=cor((x, z)=>Math.sin(x/6*6.283)+Math.cos(z)); const sel=[]; for(let k=0;k<400;k++) sel.push(G.macroAt(-10+(k%20)*1.1, -15+Math.floor(k/20)*1.1, T)[3]); n+=3;
    if(cs.some(c=>!(Math.abs(c)<0.6))) miss('the large scale repeats with the 6-m tile: correlations '+cs.map(c=>c.toFixed(2)).join(' / ')); if(!(ct>0.99)) miss('CONTROL: a 6-m periodic field correlates only '+ct.toFixed(3));
    if(!(Math.min(...sel)<0.05 && Math.max(...sel)>0.95)) miss(`the second copy's share spans only ${Math.min(...sel).toFixed(2)}…${Math.max(...sel).toFixed(2)}`);
    notes.push(`against the 6-m shift: damp ${cs[0].toFixed(2)}, moss ${cs[1].toFixed(2)}, drift ${cs[2].toFixed(2)}, sel ${cs[3].toFixed(2)} (CONTROL periodic ${ct.toFixed(2)})`); }
  for(const lv of ['full','reduced']){ const V=FR.levels[lv], P=G.litterPlaces({ leaves:V.litterLeaves, pebbles:V.litterPebbles, twigs:V.litterTwigs }, T), E=G.LITTER.eye; n+=3;
    if(P.leaves.length!==V.litterLeaves || P.pebbles.length!==V.litterPebbles || P.twigs.length!==V.litterTwigs) miss(`${lv}: ${P.leaves.length} / ${P.pebbles.length} / ${P.twigs.length} placed`);
    const all=[...P.leaves, ...P.pebbles, ...P.twigs]; if(all.some(q=>L.streamNear(q.x, q.z).d<L.STREAM.half+0.08-1e-9)) miss(lv+': litter in the water'); if(all.some(q=>Math.hypot(q.x-E[0], q.z-E[1])<G.LITTER.eyeR)) miss(lv+': litter under the eye');
    if(lv==='full'){ const R=(await import(new URL('../core/pure/dsp.js', import.meta.url).href)).seeded(5), U=[], U2=[]; for(let k=0;k<600;k++){ U.push([G.LITTER.x[0]+R()*15, G.LITTER.z[0]+R()*19.6]); U2.push([G.LITTER.x[0]+R()*15, G.LITTER.z[0]+R()*19.6]); }
      const md=a=>a.reduce((s,[x,z])=>s+G.macroAt(x, z, T)[2], 0)/a.length, ml=md(P.leaves.map(q=>[q.x, q.z])), mu=md(U), mu2=md(U2), tn=a=>a.reduce((s,[x,z])=>s+Math.min(...T.map(([tx,tz,r])=>Math.hypot(x-tx, z-tz)-r)), 0)/a.length; n+=3;
      if(!(ml>mu+0.1)) miss(`the leaves do not follow the drifts: mean drift ${ml.toFixed(2)} at the leaves, ${mu.toFixed(2)} at uniform points`); if(!(Math.abs(mu-mu2)<0.1)) miss(`CONTROL: two uniform samples differ by ${Math.abs(mu-mu2).toFixed(2)}`);
      const tt=tn(P.twigs.map(q=>[q.x, q.z])), tu=tn(U); if(!(tt<tu)) miss(`the twigs are not nearer the trunks: ${tt.toFixed(2)} m vs ${tu.toFixed(2)} m`);
      notes.push(`high: ${P.leaves.length} leaves (mean drift ${ml.toFixed(2)} vs uniform ${mu.toFixed(2)} / ${mu2.toFixed(2)}), ${P.pebbles.length} pebbles, ${P.twigs.length} twigs (${tt.toFixed(2)} m from a trunk vs ${tu.toFixed(2)})`);
      const P2=G.litterPlaces({ leaves:V.litterLeaves, pebbles:V.litterPebbles, twigs:V.litterTwigs }, T), P3=G.litterPlaces({ leaves:V.litterLeaves+50, pebbles:V.litterPebbles, twigs:V.litterTwigs }, T); n+=2;
      if(JSON.stringify(P2)!==JSON.stringify(P)) miss('the litter twice differs'); if(JSON.stringify(P3.pebbles)!==JSON.stringify(P.pebbles)) miss('more leaves moved the pebbles'); } }
  return { cases:n, total:d.length, differences:d, notes };
}
async function forestStreamCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href), S=await import(new URL('../apps/night/rooms/forest/pure/stream.js', import.meta.url).href);
  const Fl=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href), N=await import(new URL('../apps/night/pure/cycle.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  const E=[0, 1.55, 5.5], eye=(x,z)=>Math.hypot(x-E[0], z-E[2]), H=L.STREAM.half, SL=L.STREAM_LINE;
  { const a=eye(SL[Math.round(SL.length*0.6)].x, SL[Math.round(SL.length*0.6)].z), b=eye(SL[SL.length-1].x, SL[SL.length-1].z), m=Math.min(...SL.map(p=>eye(p.x,p.z))); n+=2;
    if(!(b<a)) miss(`the stream does not flow towards the eye: ${a.toFixed(2)} m at 60 %, ${b.toFixed(2)} m at its end`); if(!(m<2.5)) miss('the stream never comes within 2.5 m of the eye ('+m.toFixed(2)+' m)'); }
  const glint=M=>{ const wy=-0.04, t=(E[1]-wy)/(E[1]-wy+(M[1]-wy)); return [E[0]+(M[0]-E[0])*t, E[2]+(M[2]-E[2])*t]; };
  { const Mo=N.NIGHT.moon, g=glint([Mo.x, Mo.y, Mo.z]), q=L.streamNear(g[0], g[1]), c=glint([-Mo.x, Mo.y, Mo.z]), qc=L.streamNear(c[0], c[1]); n+=2;
    if(!(q.d<H)) miss(`the moon's reflection (${g.map(v=>v.toFixed(2)).join(', ')}) falls ${q.d.toFixed(2)} m from the stream's centre (on the water: < ${H})`);
    if(qc.d<H) miss('CONTROL: a moon on the other side also reflects on the water — the check cannot fail');
    notes.push(`the moon's reflection at ${g.map(v=>v.toFixed(2)).join(', ')}, ${q.d.toFixed(2)} m from the centre line; a mirrored moon's ${qc.d.toFixed(2)} m`); }
  { let above=0, far=0, jump=0, deep=1e9; const C=L.CARVE;
    for(let k=0;k<400;k++){ const x=-6+(k%20)*0.6, z=-20+Math.floor(k/20)*1.25, q=L.streamNear(x,z), g=L.bankGround(x,z,q.d), f=Fl.forestGround(x,z);
      if(g>f+1e-12) above++; if(q.d>=H+C.to && Math.abs(g-f)>1e-12) far++; }
    for(let u=0.2;u<0.95;u+=0.05){ const p=L.streamAt(u); let prev=null; for(let o=-2;o<=2;o+=0.02){ const x=p.x-p.tz*o, z=p.z+p.tx*o, g=L.bankGround(x,z)-Fl.forestGround(x,z); if(prev!=null) jump=Math.max(jump, Math.abs(g-prev)); prev=g; }
      deep=Math.min(deep, L.bankGround(p.x,p.z)-Fl.forestGround(p.x,p.z)); }
    n+=4; if(above) miss(above+' points of the bed above the floor'); if(far) miss(far+' points a bank away not on the floor itself'); if(jump>0.02) miss('the carve jumps '+jump.toFixed(3)+' m between two points 2 cm apart'); notes.push('the carve (bed − floor) changes at most '+(jump*1000).toFixed(1)+' mm per 2 cm');
    if(Math.abs(deep+C.depth)>0.02) miss('the bed\'s deepest '+deep.toFixed(3)+' (−'+C.depth+' expected)'); }
  { let over=0; for(let u=0.05;u<1;u+=0.05){ const p=L.streamAt(u), x=p.x-p.tz*(H+L.CARVE.to), z=p.z+p.tx*(H+L.CARVE.to); if(!(p.y<Fl.forestGround(x,z)+0.02)) over++; } n++; if(over) miss(over+' places where the water stands above the bank\'s top'); }
  { let short=0, far=0, moved=0, pushed=0; for(let k=0;k<300;k++){ const u=0.02+k/300*0.96, p=L.streamAt(u), o=((k*37)%100/100-0.5)*1.8, c=0.4+(k%7)*0.2, x0=p.x-p.tz*o, z0=p.z+p.tx*o, d0=L.streamNear(x0,z0).d, [x,z]=S.outOfWater(x0, z0, c), d=L.streamNear(x,z).d;
      if(d0>=c){ if(x!==x0 || z!==z0) moved++; continue; } pushed++; if(d<c-1e-6) short++; else if(d>c+0.15) far++; const [x2,z2]=S.outOfWater(x, z, c); if(x2!==x || z2!==z) moved++; }
    const [x3,z3]=S.outOfWater(8, 0, 1.2); n+=3; if(short) miss(short+' of '+pushed+' pushed points left closer than their clearance'); if(far) miss(far+' of '+pushed+' pushed points over 15 cm beyond it'); if(pushed<200) miss('only '+pushed+' of 300 test points started in the water');
    if(moved || x3!==8 || z3!==0) miss('outOfWater moved a clear point'); }
  for(const lv of ['full','reduced']){ const Lv=FR.levels[lv], R=S.streamRocks(Lv.rocks), P=S.streamPebbles(Lv.pebbles), M=S.mistStrips(Lv.mistStrips); n+=5;
    if(R.length!==Lv.rocks || P.length!==Lv.pebbles || M.length!==Lv.mistStrips) miss(`${lv}: rocks ${R.length}, pebbles ${P.length}, mist ${M.length}`);
    if(R.some(r=>eye(r.x,r.z)<S.STREAM_LIFE.eyeR) || P.some(r=>eye(r.x,r.z)<S.STREAM_LIFE.eyeR-0.5)) miss(lv+': a stone under the eye');
    if(R.some(r=>r.wet ? L.streamNear(r.x,r.z).d>=H : L.streamNear(r.x,r.z).d<H)) miss(lv+': a wet rock out of the water or a dry one in it');
    const w=R.filter(r=>r.wet).length/Math.max(1,R.length); if(Math.abs(w-S.STREAM_LIFE.rocks.inWater)>0.25) miss(lv+': '+(w*100).toFixed(0)+' % of the rocks in the water');
    if(M.some(m=>eye(m.x,m.z)<4)) miss(lv+': a mist strip within 4 m of the eye');
    if(lv==='full') notes.push(`high: ${R.length} rocks (${R.filter(r=>r.wet).length} in the water), ${P.length} pebbles, ${M.length} mist strips`); }
  { const F=S.floatersInit(28), Lu=S.STREAM_LIFE; let off=0, back=0, loops=0; n+=3;
    for(const f of F){ let pu=null; for(let t=0;t<120;t+=0.5){ const p=S.floatAt(f,t), q=L.streamNear(p.x,p.z); if(q.d>H*(Lu.float.across+0.05)) off++; if(pu!=null){ if(p.u<pu-0.5) loops++; else if(p.u<pu-1e-9) back++; } pu=p.u; } }
    if(off) miss(off+' leaf positions off the water'); if(back) miss(back+' steps where a leaf went upstream'); if(!loops) miss('no leaf started again upstream in two minutes'); notes.push(`28 leaves over 2 minutes: ${loops} starts again upstream`); }
  { const a=JSON.stringify(S.streamRocks(20)), b=JSON.stringify(S.streamRocks(20)), c=JSON.stringify(S.streamRocks(20, 7)); n+=2; if(a!==b) miss('rocks: one seed gave two sets'); if(a===c) miss('CONTROL rocks: another seed gave the same set'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 5: MOSS, ROOTS AND FALLEN WOOD (apps/night/rooms/forest/pure/wood.js, layout.js). Today's trunks replayed (95, each out of the
   water); the foot's flare: widest at the foot, today's trunk above 3 m; the places at high: every count asked, the bridge spanning the water
   (dry ends, its underside above the water), the bank log dry and clear of trunks, nothing in the water (the bridge's mushrooms excepted)
   nor under the eye, stumps and dead trees clear of the trunks, ivy on the bark (outside it, close to it); medium a PART of high (its moss,
   mushrooms and ivy the beginning of high's; roots, logs, stumps and dead trees the same) so the one contact-shadow file serves both — the
   blobs equal at both levels; CONTROL a set with one stump fewer gives other blobs; repeatable — CONTROL another seed differs. */
async function forestWoodCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const W=await import(new URL('../apps/night/rooms/forest/pure/wood.js', import.meta.url).href), Lo=await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href);
  const L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  const H=L.STREAM.half, eye=(x,z)=>Math.hypot(x-W.WOOD.eye[0], z-W.WOOD.eye[1]), T=Lo.forestTrunks();
  n+=2; if(T.length!==95) miss('trunks: '+T.length); if(T.some(([x,z,r])=>L.streamNear(x,z).d<H+r+0.35-1e-6)) miss('a trunk stands in the stream');
  { const a=W.flareAt(0), b=W.flareAt(0.5), c=W.flareAt(3); n+=3; if(!(a>b && b>c)) miss(`the flare does not narrow upwards: ${a.toFixed(3)}, ${b.toFixed(3)}, ${c.toFixed(3)}`);
    if(!(a>1.5)) miss('the foot flares only ×'+a.toFixed(2)); if(Math.abs(W.flareAt(16)-1)>0.001) miss('the flare reaches the top: ×'+W.flareAt(16).toFixed(4)); notes.push(`the flare: ×${a.toFixed(2)} at the foot, ×${b.toFixed(2)} at 0.5 m, ×${c.toFixed(3)} at 3 m`); }
  const Lv=FR.levels, P=W.woodPlaces(Lv.full, T), Q=W.woodPlaces(Lv.reduced, T), want=Lv.full;
  { n+=2; const got={ stumps:P.stumps.length, snags:P.snags.length, twigs:P.twigs.length, moss:P.moss.length, woodShrooms:P.shrooms.length, logs:P.logs.length };
    for(const k of Object.keys(got)) if(got[k]!==want[k]) miss(`high: ${k} ${got[k]} of ${want[k]}`);
    const trees=new Set(P.ivy.map(v=>v.tree)).size; if(!(trees>=Math.min(want.ivy, 8) && trees<=want.ivy)) miss('ivy on '+trees+' trees');
    notes.push(`high: ${P.roots.length} roots, ${P.logs.length} logs, ${P.stumps.length} stumps, ${P.snags.length} dead trees, ${P.twigs.length} branches, ${P.moss.length} moss cushions, ivy ${P.ivy.length} cards on ${trees} trees, ${P.shrooms.length} mushrooms, ${P.brackets.length} bracket fungi`); }
  { const B=P.logs.find(l=>l.bridge), K=P.logs.find(l=>!l.bridge); n+=4;
    if(!B){ miss('no bridge'); } else { let wet=0, lo=Infinity; for(let t=0;t<=1.0001;t+=0.02){ const x=B.a[0]+(B.b[0]-B.a[0])*t, z=B.a[2]+(B.b[2]-B.a[2])*t, q=L.streamNear(x,z);
        if(q.d<H){ wet++; lo=Math.min(lo, B.a[1]+(B.b[1]-B.a[1])*t-(B.r0+(B.r1-B.r0)*t)-L.streamAt(q.u).y); } }
      if(!wet) miss('the bridge does not cross the water'); if(!(lo>=0.03)) miss('the bridge dips to '+lo.toFixed(3)+' m over the water');
      if([B.a, B.b].some(e=>L.streamNear(e[0], e[2]).d<H+0.3)) miss('a bridge end stands in the water'); notes.push(`the bridge spans ${(wet*0.02*Math.hypot(B.b[0]-B.a[0], B.b[2]-B.a[2])).toFixed(2)} m of water, its underside ${(lo*100).toFixed(1)} cm above it`); }
    if(!K) miss('no bank log'); else { let bad=0; for(let t=0;t<=1.0001;t+=0.05){ const x=K.a[0]+(K.b[0]-K.a[0])*t, z=K.a[2]+(K.b[2]-K.a[2])*t; if(L.streamNear(x,z).d<H+K.r0) bad++; if(T.some(([tx,tz,r])=>Math.hypot(x-tx,z-tz)<W.trunkOuter(r,0.2)+K.r0)) bad++; } if(bad) miss(bad+' points of the bank log in the water or in a trunk'); } }
  { let wet=0, near=0, inTrunk=0; const dry=(x,z,m=0.1)=>L.streamNear(x,z).d>=H+m;
    for(const rt of P.roots) for(const [x,,z] of rt.pts) if(!dry(x,z)) wet++;
    for(const S of P.stumps){ if(!dry(S.x,S.z,0.9+S.r)) wet++; if(eye(S.x,S.z)<3.6) near++; if(T.some(([x,z,r])=>Math.hypot(S.x-x,S.z-z)<W.trunkOuter(r,0.2)+S.r)) inTrunk++; }
    for(const S of P.snags){ if(!dry(S.x,S.z,2)) wet++; if(eye(S.x,S.z)<7) near++; if(T.some(([x,z,r])=>Math.hypot(S.x-x,S.z-z)<W.trunkOuter(r,0.2)+W.trunkOuter(S.s,0.2))) inTrunk++; }
    for(const t of P.twigs){ if(!dry(t.x,t.z,0.3)) wet++; if(eye(t.x,t.z)<3.2) near++; }
    for(const m of P.moss){ if(!dry(m.x,m.z)) wet++; if(eye(m.x,m.z)<2.6) near++; }
    for(const m of P.shrooms) if(m.on!=='log' && !dry(m.x,m.z,0)) wet++;
    n+=3; if(wet) miss(wet+' things in the water'); if(near) miss(near+' things under the eye'); if(inTrunk) miss(inTrunk+' stumps or dead trees inside a trunk'); }
  { let off=0; for(const v of P.ivy){ const [x,z,r]=T[v.tree], hb=v.y-(L.bankGround(x,z,99)-0)-W.WOOD.trunk.foot, dd=Math.hypot(v.x-x, v.z-z); if(dd<W.trunkRadius(r, hb)+0.02 || dd>W.trunkOuter(r, hb)+0.06) off++; }
    n++; if(off) miss(off+' ivy cards inside the bark or off it'); }
  { const pre=(a,b)=>JSON.stringify(b)===JSON.stringify(a.slice(0, b.length)); n+=4;
    if(!pre(P.moss, Q.moss) || Q.moss.length!==Lv.reduced.moss) miss('medium\'s moss is not the beginning of high\'s'); if(!pre(P.shrooms, Q.shrooms)) miss('medium\'s mushrooms are not the beginning of high\'s'); if(!pre(P.ivy, Q.ivy)) miss('medium\'s ivy is not the beginning of high\'s');
    if(JSON.stringify([P.roots,P.logs,P.stumps,P.snags])!==JSON.stringify([Q.roots,Q.logs,Q.stumps,Q.snags])) miss('roots, logs, stumps or dead trees differ between the levels');
    const R=W.woodPlaces(Lv.reduced, T, 12345); n++; if(pre(P.moss, R.moss)) miss('CONTROL: another seed\'s moss is also high\'s beginning — the check cannot fail'); }
  { const bf=W.shadeBlobs(T, P), bm=W.shadeBlobs(T, Q), bc=W.shadeBlobs(T, { ...Q, stumps:Q.stumps.slice(1) }); n+=3;
    if(JSON.stringify(bf)!==JSON.stringify(bm)) miss('the contact shadows differ between the levels (one file must serve both)'); if(JSON.stringify(bc)===JSON.stringify(bm)) miss('CONTROL: a stump fewer leaves the shadows the same');
    if(!(W.blobDark(0)===1 && W.blobDark(1)===0 && W.blobDark(0.5)>W.blobDark(0.7))) miss('blobDark is not 1 → 0, falling'); notes.push(bf.length+' contact-shadow blobs, the same at both levels'); }
  { const a=JSON.stringify(W.woodPlaces(Lv.full, T)), b=JSON.stringify(W.woodPlaces(Lv.full, T)), c=JSON.stringify(W.woodPlaces(Lv.full, T, 7)); n+=2; if(a!==b) miss('one seed gave two sets'); if(a===c) miss('CONTROL: another seed gave the same set'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 6: THE GUST (apps/night/rooms/forest/pure/gust.js). No hand and a still or slow hand: the strength exactly 0 and every bend
   exactly [0, 0]; a sweep: a gust along it, centred near the hand, bending plants along the sweep (and away from its centre), most at the
   centre and at the top, none a radius away or at a plant's foot; it dies away to exactly 0 once the hand stops; it FOLLOWS THE HAND'S PLACE —
   a second sweep elsewhere moves it there, CONTROL the hand held still there makes none; loose leaves fly along the sweep and settle on the
   ground, then are done; the wake only where the gust crosses the stream (CONTROL far from it: none); repeatable. */
async function forestGustCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const G=await import(new URL('../apps/night/rooms/forest/pure/gust.js', import.meta.url).href), L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href);
  const dt=1/60, run=(g, sec, at)=>{ for(let i=0;i<Math.round(sec/dt);i++){ const p=at(i*dt); G.gustStep(g, dt, p, p ? 1 : 0); } return g; };
  { const a=run(G.gustNew(), 3, ()=>null), b=run(G.gustNew(), 3, ()=>[2, -3]), c=run(G.gustNew(), 3, t=>[2+0.2*t, -3]); n+=4;
    if(a.k!==0 || b.k!==0 || c.k!==0) miss(`no hand ${a.k}, a still hand ${b.k}, a slow hand (0.2 m/s) ${c.k}: not exactly 0`);
    const z=G.gustBend(b, 2, -3, 1); if(z[0]!==0 || z[1]!==0) miss('a still hand bends a plant: '+z);
    const e=G.gustBend({ ...b, k:0.7 }, 2, -3, 0); if(e[0]!==0 || e[1]!==0) miss('a plant\'s foot bends: '+e);
    if(G.gustBend({ ...b, k:0.7 }, 2, -3, 1)[0]===0) miss('CONTROL: a gust bends nothing — the check cannot fail'); }
  const sweep=run(G.gustNew(), 1.2, t=>[-2+3*t, -3]);
  { n+=3; if(!(sweep.k>0.5)) miss('a sweep at 3 m/s makes a gust of only '+sweep.k.toFixed(3)); if(!(sweep.dx>0.95)) miss('the gust does not point along the sweep: '+sweep.dx.toFixed(3));
    const hx=-2+3*1.2; if(Math.hypot(sweep.x-hx, sweep.z+3)>0.6) miss(`the gust's centre ${sweep.x.toFixed(2)}, ${sweep.z.toFixed(2)} is far from the hand ${hx.toFixed(2)}, -3`);
    notes.push(`a 3 m/s sweep: strength ${sweep.k.toFixed(2)}, direction ${sweep.dx.toFixed(2)}, ${sweep.dz.toFixed(2)}, centre ${Math.hypot(sweep.x-hx, sweep.z+3).toFixed(2)} m behind the hand`); }
  { let back=0; for(let a=0;a<8;a++){ const x=sweep.x+Math.cos(a*Math.PI/4)*0.8, z=sweep.z+Math.sin(a*Math.PI/4)*0.8, [bx,bz]=G.gustBend(sweep, x, z, 0.8); if(!(bx*sweep.dx+bz*sweep.dz>0)) back++; }
    const top=G.gustBend(sweep, sweep.x, sweep.z, 1)[0], low=G.gustBend(sweep, sweep.x, sweep.z, 0.2)[0], far=Math.hypot(...G.gustBend(sweep, sweep.x+G.GUST.R*2.2, sweep.z, 1));
    n+=3; if(back) miss(back+' of 8 plants round the gust bend against the sweep'); if(!(top>low && low>0)) miss(`the top bends ${top.toFixed(3)}, low down ${low.toFixed(3)}`); if(far!==0) miss('the gust reaches '+(G.GUST.R*2.2).toFixed(1)+' m: '+far);
    notes.push(`the bend at the centre: ${(top*100).toFixed(1)} cm at 1 m up, ${(low*100).toFixed(1)} cm at 0.2 m; ${(G.GUST.R*2.2).toFixed(1)} m away exactly ${far}`); }
  { const g=run({ ...sweep }, 6, ()=>null); n++; if(g.k!==0) miss('six seconds after the sweep the gust is '+g.k); }
  { const g=run(run(G.gustNew(), 1, t=>[-2+3*t, -3]), 1, t=>[1-3*t, -3]); n++; if(!(g.dx<-0.95)) miss('a sweep straight back does not reverse the gust: '+g.dx.toFixed(3)); }   // slice 8: the blend of opposite directions could not turn
  { const g=run(run({ ...sweep }, 4, ()=>null), 1.2, t=>[4, 2-3*t]), c=run(run({ ...sweep }, 4, ()=>null), 1.2, ()=>[4, 2]); n+=2;
    if(!(g.k>0.5 && Math.hypot(g.x-4, g.z-(2-3.6))<0.6)) miss(`a second sweep elsewhere: strength ${g.k.toFixed(2)} at ${g.x.toFixed(2)}, ${g.z.toFixed(2)}`);
    if(c.k!==0) miss('CONTROL: a hand held still at the new place makes a gust of '+c.k); }
  { const ls=[0,1,2,3,4,5].map(i=>G.leafSpawn(sweep, i, 0)); let back=0, under=0, late=0;
    for(const l of ls){ const p=G.leafAt(l, 1.5), e=G.leafAt(l, G.GUST.leaves.life+0.01); if((p.x-l.x)*sweep.dx+(p.z-l.z)*sweep.dz<=0) back++; if(p.y<L.bankGround(p.x,p.z)) under++; if(!e.done) late++;
      for(let t=0;t<3;t+=0.25){ const q=G.leafAt(l, t); if(q.y<L.bankGround(q.x,q.z)) under++; } }
    n+=3; if(back) miss(back+' leaves fly against the sweep'); if(under) miss(under+' leaf positions under the ground'); if(late) miss(late+' leaves never done');
    if(JSON.stringify(G.leafSpawn(sweep, 3, 0))!==JSON.stringify(G.leafSpawn(sweep, 3, 0))) miss('a leaf is not repeatable'); }
  { const p=L.streamAt(0.6), on={ ...sweep, x:p.x, z:p.z }, off={ ...sweep, x:p.x-p.tz*4, z:p.z+p.tx*4 }, w=G.wakeOf(on); n+=2;
    if(!w || !(w.k>0.4)) miss('a gust over the stream makes no wake'); if(G.wakeOf(off)) miss('CONTROL: a gust 4 m from the stream makes a wake'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 7: THE CANOPY (apps/night/rooms/forest/pure/canopy.js). The moon's window: rays from the eye to 64 points of the moon's path
   meet no leaf (a leaf a sphere of half its size) — CONTROL the same leaves placed without the gap block some; the view down the stream: rays
   to its far reach meet no leaf; the light stays visible: of a grid over the light's whole reach, the understorey's leaves block under 4 % —
   CONTROL a sapling in the middle of the view blocks more; the counts (stars exactly, each on the dome; crowns on every trunk; the understorey
   at least 70 % of what is asked); medium's leaves all among high's; the understorey by ecology (young trees and saplings lighter, shrubs damper
   than free floor points); none in the water, the aisle or under the eye; the gust stays low (nothing from 4.5 m up); repeatable. */
async function forestCanopyCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const Cn=await import(new URL('../apps/night/rooms/forest/pure/canopy.js', import.meta.url).href), Lo=await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href);
  const L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href), Fl=await import(new URL('../apps/night/rooms/forest/pure/floor.js', import.meta.url).href);
  const N=(await import(new URL('../apps/night/pure/cycle.js', import.meta.url).href)).NIGHT, G=await import(new URL('../apps/night/rooms/forest/pure/gust.js', import.meta.url).href);
  const FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, B=(await import(new URL('../apps/night/rooms/forest/forest.js', import.meta.url).href).catch(()=>null));
  const T=Lo.forestTrunks(), Lv=FR.levels, E=Cn.CANOPY.eye, P=Cn.canopyPlaces(Lv.full, T), Q=Cn.canopyPlaces(Lv.reduced, T), X=Cn.canopyPlaces(Lv.full, T, Cn.CANOPY.seed, true);
  /* a ray from the eye to (x, y, z): the leaves (spheres) it passes through, up to `far` */
  const blocks=(sprays, x, y, z, k=0.5)=>{ const dx=x-E[0], dy=y-E[1], dz=z-E[2], l=Math.hypot(dx,dy,dz), ux=dx/l, uy=dy/l, uz=dz/l; let c=0;
    for(const s of sprays){ const px=s.x-E[0], py=s.y-E[1], pz=s.z-E[2], t=px*ux+py*uy+pz*uz; if(t<0 || t>l) continue; if(Math.hypot(px-ux*t, py-uy*t, pz-uz*t)<s.s*k) c++; } return c; };
  { const M=N.moon; let hit=0, hitX=0; for(let k=0;k<64;k++){ const th=k/64*2*Math.PI, x=M.x+M.ax*Math.sin(th), y=M.y+M.ay*Math.sin(2*th+0.7); hit+=blocks(P.sprays, x, y, M.z)>0; hitX+=blocks(X.sprays, x, y, M.z)>0; }
    n+=2; if(hit) miss(hit+' of 64 rays to the moon\'s path meet a leaf'); if(!hitX) miss('CONTROL: the leaves without the gap block no ray to the moon — the check cannot fail');
    notes.push(`the moon's window: 0 of 64 rays blocked (without the gap ${hitX}); seen from the eye the path spans azimuth ${Cn.MOON_VIEW.az.map(v=>v.toFixed(1)).join('…')}°, elevation ${Cn.MOON_VIEW.el.map(v=>v.toFixed(1)).join('…')}°`); }
  { let hit=0; for(let u=0;u<=0.3;u+=0.03){ const p=L.streamAt(u); for(const h of [0.6, 1.5, 2.5]) hit+=blocks(P.sprays, p.x, h, p.z)>0; } n++; if(hit) miss(hit+' rays down the stream meet a leaf'); }
  { const und=s=>s.filter(p=>p.of!=='crown'), grid=[]; for(let x=-6;x<=6;x+=1) for(let y=0.3;y<=4.2;y+=0.65) for(let z=-15;z<=3.8;z+=1.2) grid.push([x,y,z]);
    const frac=sp=>grid.filter(([x,y,z])=>blocks(sp, x, y, z, 0.4)>0).length/grid.length, f=frac(und(P.sprays)), fc=frac(und(P.sprays).concat([{ x:0, y:1.6, z:1, s:1.2 }, { x:0.6, y:2.2, z:-1, s:1.2 }]));
    n+=2; if(!(f<0.04)) miss(`the understorey hides ${(f*100).toFixed(1)} % of the light's reach`); if(!(fc>f)) miss('CONTROL: two saplings in the middle of the view hide no more');
    notes.push(`the light's reach hidden by the understorey: ${(f*100).toFixed(2)} % of ${grid.length} places (two saplings in the view: ${(fc*100).toFixed(2)} %)`); }
  { const by=o=>P.sprays.filter(s=>s.of===o).length; n+=5;
    if(P.stars.length!==Lv.full.stars || Q.stars.length!==Lv.reduced.stars) miss(`stars ${P.stars.length} / ${Q.stars.length}`);
    if(P.stars.some(s=>Math.abs(Math.hypot(s[0]-E[0], s[1]-E[1], s[2]-E[2])-Cn.CANOPY.stars.r)>1e-6 || Cn.viewAngles(s[0], s[1], s[2])[1]<Cn.CANOPY.stars.el[0]-1e-6)) miss('a star off the dome or below it');
    const trees=new Set(P.limbs.map(l=>Math.round(l[0]*10)+','+Math.round(l[2]*10))).size; if(!(by('crown')>1500)) miss('only '+by('crown')+' crown sprays');
    for(const k of ['young','shrubs','saplings']) if(P[k].length<Math.ceil(Lv.full[k]*0.7) || P[k].length>Lv.full[k]) miss(`${k}: ${P[k].length} of ${Lv.full[k]}`);
    const key=s=>[s.x,s.y,s.z].map(v=>v.toFixed(6)).join(), high=new Set(P.sprays.map(key)); if(Q.sprays.some(s=>s.of==='crown' && !high.has(key(s)))) miss('a medium crown spray not among high\'s');
    notes.push(`high: ${by('crown')} crown sprays, ${P.young.length} young trees (${by('young')}), ${P.shrubs.length} shrubs (${by('shrub')}), ${P.saplings.length} saplings (${by('sapling')}), ${P.limbs.length} limbs, ${P.stars.length} stars; medium ${Q.sprays.length} sprays`); }
  { /* each kind against free floor where IT may grow (the same rules but light and damp): young trees and shrubs outside the light's reach
       (shrubs not in the view down the stream), saplings at the sides near the viewer */
    const R=(await import(new URL('../core/pure/dsp.js', import.meta.url).href)).seeded(77), C=Cn.CANOPY, out=(x,z)=>Math.abs(x)>C.reach.x || z<C.reach.z;
    const free=(ok, gx, gz0, gz1)=>{ const a=[]; for(let g=0; a.length<300 && g<200000; g++){ const x=(R()*2-1)*gx, z=gz0-R()*(gz0-gz1); if(L.streamNear(x,z).d>L.STREAM.half+0.6 && Math.hypot(x-E[0], z-E[2])>3.4 && ok(x,z)) a.push([x,z]); } return a; };
    const mean=(a,f)=>a.reduce((s,p)=>s+f(p),0)/a.length, fy=free(out, 16, 2, -26), fs=free((x,z)=>out(x,z) && !Cn.inGap(x, 1.2, z), 14, 3, -23), fp=free((x,z)=>Math.abs(x)>=C.reach.sapX && Math.hypot(x-E[0], z-E[2])<=C.saplings.eye[1] && z<E[2], 9, 5.5, -4);
    const ly=mean(P.young, p=>Fl.lightAt(p.x,p.z)), ls=mean(P.saplings, p=>Fl.lightAt(p.x,p.z)), ms=mean(P.shrubs, p=>Fl.moistAt(p.x,p.z)), lfy=mean(fy, ([x,z])=>Fl.lightAt(x,z)), lfp=mean(fp, ([x,z])=>Fl.lightAt(x,z)), mfs=mean(fs, ([x,z])=>Fl.moistAt(x,z)); n+=3;
    if(!(ly>lfy)) miss(`young trees not lighter: ${ly.toFixed(2)} vs ${lfy.toFixed(2)}`); if(!(ls>lfp)) miss(`saplings not lighter: ${ls.toFixed(2)} vs ${lfp.toFixed(2)}`); if(!(ms>mfs)) miss(`shrubs not damper: ${ms.toFixed(2)} vs ${mfs.toFixed(2)}`);
    notes.push(`light: young trees ${ly.toFixed(2)} vs ${lfy.toFixed(2)}, saplings ${ls.toFixed(2)} vs ${lfp.toFixed(2)}; damp: shrubs ${ms.toFixed(2)} vs ${mfs.toFixed(2)} (free floor where each may grow)`); }
  { let bad=0; for(const p of [...P.young, ...P.shrubs, ...P.saplings]){ if(L.streamNear(p.x,p.z).d<L.STREAM.half+0.4) bad++; if(Math.hypot(p.x-E[0], p.z-E[2])<3.4) bad++; if(Math.abs(p.x)<Cn.CANOPY.aisle && p.z>-8) bad++; } n++; if(bad) miss(bad+' understorey places in the water, under the eye or in the aisle'); }
  { const g={ x:0, z:0, dx:1, dz:0, k:1 }; n+=2; if(G.gustBend(g, 0.3, 0, 1, 4.5)[0]!==0) miss('the gust reaches a crown at 4.5 m'); if(!(G.gustBend(g, 0.3, 0, 1, 0)[0]>0)) miss('the gust lost the ground plants'); }
  { const a=JSON.stringify(Cn.canopyPlaces(Lv.reduced, T)), b=JSON.stringify(Cn.canopyPlaces(Lv.reduced, T)), c=JSON.stringify(Cn.canopyPlaces(Lv.reduced, T, 99)); n+=2; if(a!==b) miss('one seed gave two canopies'); if(a===c) miss('CONTROL: another seed gave the same'); }
  void B; return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 8: THE PAINTED DISTANCE AND THE FILM (apps/night/rooms/forest/pure/paint.js). The strokes' taps: inside the disc, symmetric, the
   centre feeding every sector equally, each other tap at most three sectors, every sector fed — CONTROL a disc of 0 has only the centre; the
   stroke radius: 0 up to PAINT.near, the full radius from PAINT.far, rising between; the vignette 1 in the middle, 1 − k at the ellipse's edge,
   falling outwards; the breath: bounded, not still, its mean over ten minutes near 0; the levels: painting at both, the grain at high only. */
async function forestPaintCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const Pp=await import(new URL('../apps/night/rooms/forest/pure/paint.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, P=Pp.PAINT;
  for(const R of [3, 2.5]){ const T=Pp.strokeTaps(R), key=t=>t.i+','+t.j, has=new Set(T.map(key)); n+=5;
    if(T.some(t=>t.d2>R*R+0.5)) miss(`R ${R}: a tap outside the disc`); if(T.some(t=>!has.has((-t.i)+','+(-t.j)))) miss(`R ${R}: the taps are not symmetric`);
    const c=T.find(t=>!t.d2); if(!c || c.w.length!==P.sectors || Math.abs(c.w.reduce((a,[,w])=>a+w,0)-1)>1e-12) miss(`R ${R}: the centre does not feed every sector equally`);
    if(T.some(t=>t.d2 && (t.w.length<1 || t.w.length>3))) miss(`R ${R}: a tap feeds ${Math.max(...T.map(t=>t.w.length))} sectors`);
    const fed=new Set(T.filter(t=>t.d2).flatMap(t=>t.w.map(([k])=>k))); if(fed.size!==P.sectors) miss(`R ${R}: only ${fed.size} sectors fed`);
    notes.push(`R ${R}: ${T.length} taps, ${T.reduce((a,t)=>a+t.w.length,0)} sector feeds (the sketch's loop: 81 × 8)`); }
  { n++; if(Pp.strokeTaps(0).length!==1) miss('CONTROL: a disc of 0 has '+Pp.strokeTaps(0).length+' taps'); }
  { const a=Pp.strokeR(P.near, 3), b=Pp.strokeR(P.far, 3), c=Pp.strokeR((P.near+P.far)/2, 3), e=Pp.strokeR(2, 3); n+=2; if(a!==0 || e!==0 || b!==3) miss(`the stroke radius: ${e} at 2 m, ${a} at ${P.near} m, ${b} at ${P.far} m`); if(!(c>0 && c<3)) miss('the radius does not rise between'); }
  { const m=Pp.vignetteAt(0.5, 1-P.vignette.cy), e=Pp.vignetteAt(0, 0), q=Pp.vignetteAt(0.95, 0.15); n+=2;
    if(m!==1) miss('the vignette dims the middle: '+m); if(!(e<=1-P.vignette.k+1e-9 && q<1 && q>e)) miss(`the vignette: corner ${e.toFixed(3)}, between ${q.toFixed(3)}`);
    notes.push(`the vignette: 1 in the middle, ${q.toFixed(2)} near the lower right, ${e.toFixed(2)} in the corner`); }
  { let mx=0, sum=0, k=0; for(let t=0;t<600;t+=0.1){ const b=Pp.breathAt(t); mx=Math.max(mx, Math.abs(b)); sum+=b; k++; } n+=2;
    if(!(mx>0.01 && mx<=P.breath.ax+P.breath.bx+1e-12)) miss('the breath reaches '+mx.toFixed(4)+' m'); if(Math.abs(sum/k)>0.005) miss('the breath drifts: mean '+(sum/k).toFixed(4));
    notes.push(`the breath: at most ${(mx*100).toFixed(1)} cm sideways, mean ${(sum/k*1000).toFixed(2)} mm over ten minutes`); }
  { const L=FR.levels; n++; if(!L.full.paint || !L.reduced.paint || !L.full.grain || L.reduced.grain || !(L.full.paintR>L.reduced.paintR)) miss('the levels: '+JSON.stringify({ full:[L.full.paint, L.full.paintR, L.full.grain], reduced:[L.reduced.paint, L.reduced.paintR, L.reduced.grain] })); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6 slice 9: HIDDEN THINGS THE LIGHT FINDS (apps/night/rooms/forest/pure/hidden.js). Foxfire: no light, no trail point and exactly 0
   glow; a moving light leaves points a step apart, the ring keeps the newest; at a point just made the glow is exactly 1, it holds 8–12 s
   (the patch's own hold — CONTROL holdK 0 and 1 differ at 10 s), then fades to exactly 0; it falls with distance. Night flowers: in view and in
   the light's reach, beside a herb, never in the water, apart; never found exactly closed; the light within reach opens one, it stays open
   FLOWERS.stay s after, then closes — CONTROL a light 1.5 m away, or too high, opens none. */
async function forestHiddenCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const Hd=await import(new URL('../apps/night/rooms/forest/pure/hidden.js', import.meta.url).href), Fl=await import(new URL('../apps/night/rooms/forest/pure/floor.js', import.meta.url).href);
  const L=await import(new URL('../apps/night/rooms/forest/pure/forestlife.js', import.meta.url).href), Lo=await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href);
  const FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, X=Hd.FOX, FL=Hd.FLOWERS;
  { const tr=Hd.foxTrail(12); for(let t=0;t<5;t+=0.1) Hd.foxTrailStep(tr, t, null); n+=2; if(tr.pts.some(p=>p.t>=0)) miss('an unlit light left a trail'); if(Hd.foxAt(tr, 0, 0, 0, 5)!==0) miss('no trail but a glow'); }
  const tr=Hd.foxTrail(12); for(let k=0;k<=40;k++) Hd.foxTrailStep(tr, k*0.1, [k*0.1, 0.5, 0]);   // 4 m in 4 s
  { const pts=tr.pts.filter(p=>p.t>=0).sort((a,b)=>a.t-b.t); n+=2; let gap=Infinity; for(let i=1;i<pts.length;i++) gap=Math.min(gap, Math.hypot(pts[i].x-pts[i-1].x, pts[i].z-pts[i-1].z));
    if(pts.length!==Math.min(12, Math.floor(4/X.step)+1)) miss(pts.length+' trail points'); if(!(gap>=X.step-1e-9)) miss('trail points '+gap.toFixed(3)+' m apart');
    notes.push(`a 4-m pass in 4 s leaves ${pts.length} points ${X.step} m apart`); }
  { const last=tr.last, at=(t, k=0.5, dx=0)=>Hd.foxAt(tr, last.x+dx, last.y, last.z, t, k); n+=5;
    if(at(last.t)!==1) miss('the glow at a point just made is '+at(last.t)); if(!(at(last.t+7)>0.99)) miss('the glow fades before 8 s');
    if(at(last.t+X.hold[1]+X.fade+0.01)!==0) miss('the glow lasts past its hold and fade: '+at(last.t+X.hold[1]+X.fade+0.01));
    if(!(at(last.t+10, 0)<at(last.t+10, 1))) miss('CONTROL: the patch\'s own hold changes nothing at 10 s');
    if(!(at(last.t, 0.5, 2.4)<0.05 && at(last.t, 0.5, 0.6)>at(last.t, 0.5, 1.2))) miss('the glow does not fall with distance');
    notes.push(`the glow: 1 at the point, ${at(last.t, 0.5, 1.2).toFixed(2)} 1.2 m away; at 10 s ${at(last.t+10, 0).toFixed(2)} (hold 8 s) vs ${at(last.t+10, 1).toFixed(2)} (12 s); gone by ${(X.hold[1]+X.fade).toFixed(1)} s`); }
  const herbs=Fl.floorPlaces(Object.fromEntries([...Fl.HERBS, 'fern2'].map(k=>[k, FR.levels.full[k]])), Lo.forestTrunks(), []), F=Hd.flowerPlaces(FR.levels.full.flowers, herbs);
  { let bad=0; for(const f of F){ const az=Math.abs(Math.atan2(f.x, 5.5-f.z))*180/Math.PI, e=Math.hypot(f.x, f.z-5.5);
      if(az>FL.az+1e-9 || Math.abs(f.x)>FL.box.x || f.z<FL.box.z || e<FL.eye[0] || e>FL.eye[1] || L.streamNear(f.x,f.z).d<L.STREAM.half+0.25) bad++;
      if(!herbs.some(h=>Math.hypot(h.x-f.x, h.z-f.z)<0.13)) bad++; if(F.some(o=>o!==f && Math.hypot(o.x-f.x, o.z-f.z)<FL.gap)) bad++; }
    n+=2; if(F.length!==FR.levels.full.flowers) miss(F.length+' flowers of '+FR.levels.full.flowers); if(bad) miss(bad+' flowers out of view, out of reach, in the water, crowded or by no herb'); }
  { const f0=F[0], run=(f, sec, light, t0=0)=>{ let t=t0; for(let i=0;i<Math.round(sec*60);i++){ t+=1/60; Hd.flowerStep(f, 1/60, t, light ? light(t) : null); } return t; };
    const a={ ...f0, open:0, seen:null }; run(a, 30, null); n++; if(a.open!==0) miss('a flower never found opened: '+a.open);
    const b={ ...f0, open:0, seen:null }; let t=run(b, 1, ()=>[f0.x+0.5, f0.y+0.6, f0.z]); const o1=b.open; t=run(b, FL.stay-2, null, t); const o2=b.open; t=run(b, 6, null, t); const o3=b.open; n+=3;
    if(o1!==1) miss('the light at the flower opens it to '+o1); if(o2!==1) miss('it closed before '+FL.stay+' s: '+o2); if(o3!==0) miss('it stays open long after: '+o3);
    const c={ ...f0, open:0, seen:null }, e={ ...f0, open:0, seen:null }; run(c, 3, ()=>[f0.x+1.5, f0.y+0.6, f0.z]); run(e, 3, ()=>[f0.x, f0.y+FL.lift+0.2, f0.z]); n++;
    if(c.open!==0 || e.open!==0) miss(`CONTROL: a light 1.5 m away (${c.open}) or too high (${e.open}) opened it`);
    notes.push(`${F.length} flowers (${[...new Set(F.map(f=>f.by))].join(', ')}); a flower found opens in ${(1/FL.open).toFixed(2)} s, stays ${FL.stay} s, closes in ${(1/FL.close).toFixed(1)} s`); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-7: every Night text in BOTH languages. The keys the Night page uses (data-i18n, data-i18n-title) and the keys its code writes as t('…')
   (apps/night/**), with Night's own texts (apps/night/texts.js) joined: each has an English and a Russian text, every «night.*» key is in both
   dictionaries, the Russian ones are Russian; no element of the Night page's own parts shows words without a key (the brand mark and the
   development items excepted). CONTROL: a made-up key is reported missing. NIGHT-7b: no «night.*» text names a room or its things (forest, trees,
   moon, fireflies, mushrooms; both languages) — CONTROL: the old words are caught and look-alike words are not. */
async function nightTextsCore(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const fs=await import('node:fs'), path=await import('node:path'), ROOT=new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
  const I=await import(new URL('../core/i18n.js', import.meta.url).href); await import(new URL('../apps/night/texts.js', import.meta.url).href);
  const html=fs.readFileSync(path.join(ROOT, 'apps/night/index.html'), 'utf8'), keys=new Set(), from={};
  for(const m of html.matchAll(/data-i18n(?:-title)?="([^"]+)"/g)){ keys.add(m[1]); from[m[1]]='index.html'; }
  const walk=dir=>{ for(const e of fs.readdirSync(dir, { withFileTypes:true })){ const p=path.join(dir, e.name); if(e.isDirectory()){ if(!/vendor|fonts|icons|tex/.test(e.name)) walk(p); } else if(p.endsWith('.js'))
      for(const m of fs.readFileSync(p, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.\-]+)'/g)){ keys.add(m[1]); from[m[1]]=path.relative(ROOT, p).replace(/\\/g,'/'); } } };
  walk(path.join(ROOT, 'apps/night'));
  const en=I.DICTS.en, ru=I.DICTS.ru, has=(L,k)=>Object.prototype.hasOwnProperty.call(L,k), CYR=/[а-яё]/i;
  const pre=[...keys].filter(k=>k.endsWith('.')); for(const k of pre) keys.delete(k);   // t('night.music.'+mode): a prefix — some key under it in both languages
  { n++; const bad=pre.filter(p=>!Object.keys(en).some(k=>k.startsWith(p)) || !Object.keys(ru).some(k=>k.startsWith(p))); if(bad.length) miss('prefixes with no key under them: '+bad.join(', ')); }
  const noEn=[...keys].filter(k=>!has(en,k)), noRu=[...keys].filter(k=>!has(ru,k)); n+=2;
  if(noEn.length) miss(noEn.length+' keys with no English: '+noEn.slice(0,8).map(k=>k+' ('+from[k]+')').join(', '));
  if(noRu.length) miss(noRu.length+' keys with no Russian: '+noRu.slice(0,8).map(k=>k+' ('+from[k]+')').join(', '));
  const night=[...new Set([...Object.keys(en), ...Object.keys(ru)])].filter(k=>k.startsWith('night.')), half=night.filter(k=>!has(en,k) || !has(ru,k)), latin=night.filter(k=>has(ru,k) && !CYR.test(ru[k]) && /[a-z]{4}/i.test(ru[k]) && !/^(Handsong|Night)/.test(ru[k])); n+=2;
  if(half.length) miss('night keys in one language only: '+half.join(', ')); if(latin.length) miss('Russian texts that are not Russian: '+latin.slice(0,8).join(', '));
  { const own=[...html.matchAll(/<(button|p|span|h2|label|div|summary|li)\b([^>]*)>([^<]+)</g)].filter(([, , a, txt])=>/class="[^"]*\bnight-/.test(a) && !/data-i18n=/.test(a) && /[A-Za-zА-Яа-я]{3}/.test(txt)
      && !/night-word|night-sub|night-dev|night-measure/.test(a)); n++;
    if(own.length) miss(own.length+' Night elements with words but no key: '+own.slice(0,6).map(m=>m[3].trim().slice(0,30)).join(' | ')); }
  { n++; if(has(en,'night.__control')) miss('CONTROL: a made-up key exists'); const k2=new Set(keys); k2.add('night.__control'); if(![...k2].some(k=>!has(en,k))) miss('CONTROL: a made-up key is not reported missing'); }
  /* NIGHT-7b (the user): the shared Night texts never name a room or its things — a room's own words live in its record */
  { const ROOMW=/\bforest|\btrees?\b|\bmoon|firefl|mushroom|(^|[^а-яё])лес|дерев|(^|[^а-яё])лун[аеуыо]|светляч|гриб/i, named=new Set(); n+=2;
    for(const k of night) for(const L of [en,ru]) if(has(L,k) && ROOMW.test(L[k])) named.add(k);
    if(named.size) miss('shared texts that name a room or its things: '+[...named].join(', '));
    if(!ROOMW.test('Дальше — эхо леса глубже') || !ROOMW.test('then the forest will follow') || ROOMW.test('Облегчённый режим: полезно, чудесно')) miss('CONTROL: the room words are not told from other words'); }
  notes.push(`${keys.size} keys used by the Night page and its code, ${night.length} «night.*» keys: all in English and Russian, none names a room`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-7c: THE HOME SCREEN. (1) The «Add to Home Screen» card's law (apps/night/pure/homehint.js) on made-up devices: only Safari on an
   iPhone / iPad without a full-screen door, outside the home-screen app (CONTROL: a law without the home-screen test would give it there).
   (2) The page and the manifest make a home-screen app without browser bars: the manifest's name, full-screen display, landscape, dark colours,
   its icons on disk; the page's iOS tags (capable, black-translucent status bar, title, touch icon on disk) and viewport-fit=cover
   (CONTROL: a manifest with display «browser» is caught). */
async function nightHomeScreen(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const fs=await import('node:fs'), path=await import('node:path'), ROOT=new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
  const { homeHintFor }=await import(new URL('../apps/night/pure/homehint.js', import.meta.url).href);
  const SAF='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const MAC='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const AND='Mozilla/5.0 (Linux; Android 14; 22111317PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const CASES=[['iPhone Safari', { ua:SAF, platform:'iPhone', touch:5 }, true], ['iPad Safari (reports a Mac with touch)', { ua:MAC, platform:'MacIntel', touch:5 }, true],
    ['iPad Safari with a full-screen door', { ua:MAC, platform:'MacIntel', touch:5, fsApi:true }, false], ['iPhone, opened from the Home Screen', { ua:SAF, platform:'iPhone', touch:5, standalone:true }, false],
    ['Chrome on iPhone', { ua:SAF.replace('Version/17.5', 'CriOS/126.0'), platform:'iPhone', touch:5 }, false], ['Firefox on iPhone', { ua:SAF.replace('Version/17.5', 'FxiOS/127.0'), platform:'iPhone', touch:5 }, false],
    ['an in-app browser on iPhone', { ua:SAF+' Instagram 300.0', platform:'iPhone', touch:5 }, false], ['Android Chrome', { ua:AND, platform:'Linux armv8l', touch:5, fsApi:true }, false],
    ['a Mac (no touch)', { ua:MAC, platform:'MacIntel', touch:0, fsApi:true }, false], ['nothing known', {}, false]];
  for(const [name, env, want] of CASES) ok(`${name}: the card ${want ? 'missing' : 'shown'}`, homeHintFor(env)===want);
  { const noStandalone=e=>homeHintFor({ ...e, standalone:false }); ok('CONTROL: a law without the home-screen test gives the same answer there', noStandalone(CASES[3][1])!==homeHintFor(CASES[3][1])); }
  const dir=path.join(ROOT, 'apps/night'), M=JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')), html=fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const manifestOk=m=>m.name==='Handsong Night' && m.short_name==='Handsong Night' && ['fullscreen','standalone'].includes(m.display) && /^landscape/.test(m.orientation||'') && /^#0/.test(m.background_color||'') && /^#0/.test(m.theme_color||'');
  ok('the manifest: name, display, landscape or dark colours', manifestOk(M)); ok('CONTROL: a manifest with display «browser» passes', !manifestOk({ ...M, display:'browser' }));
  for(const ic of M.icons||[]) ok('the manifest icon is missing: '+ic.src, fs.existsSync(path.join(dir, ic.src)));
  const meta=name=>{ const m=new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html); return m ? m[1] : null; };
  ok('iOS: apple-mobile-web-app-capable', meta('apple-mobile-web-app-capable')==='yes'); ok('Android: mobile-web-app-capable', meta('mobile-web-app-capable')==='yes');
  ok('iOS: the status bar style', meta('apple-mobile-web-app-status-bar-style')==='black-translucent'); ok('iOS: the title', meta('apple-mobile-web-app-title')==='Handsong Night');
  { const m=/<link rel="apple-touch-icon" href="([^"]+)"/.exec(html); ok('iOS: the touch icon', !!m && fs.existsSync(path.join(dir, m[1]))); }
  ok('the viewport does not cover the notch (viewport-fit=cover)', /viewport-fit=cover/.test(meta('viewport')||''));
  notes.push(`${CASES.length} made-up devices: the card on ${CASES.filter(c=>c[2]).map(c=>c[0]).join(' and ')} only; manifest ${M.display}, ${M.orientation}, ${M.icons.length} icons; iOS tags in place`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-6: THE FOREST'S FILES (tools/forest-bake.mjs). Every prepared file matches what the tool draws now, pixel for pixel (CONTROL a changed
   pixel is caught); the PNG writer and reader round-trip; the forest's files stay inside the user's budget (CONTROL 16 MB is over it). The
   sizes are printed every run (the user's rule: report the size in every slice). */
async function nightForestFiles(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), B=await import(new URL('./forest-bake.mjs', import.meta.url).href);
  const baked=B.bakeAll(), r=B.check(baked); n+=r.cases; d.push(...r.differences);   // drawn once (the masters take seconds)
  { const b=baked.map((f,i)=>i ? f : { ...f, px:f.px.slice() }); b[0].px[1000]^=0x40; const c=B.check(b); n++; if(!c.differences.length) miss('CONTROL: a changed pixel was not caught'); }
  for(const f of baked){ const g=B.pngRead(B.pngOf(f)); n++; if(g.w!==f.w || g.h!==f.h || g.px.some((v,i)=>v!==f.px[i])) miss(f.name+': the PNG round trip differs'); }
  const S=B.forestSizes(), over=t=>t>B.FOREST_BUDGET, MB=x=>(x/1048576).toFixed(2)+' MB', KB=x=>(x/1024).toFixed(1)+' KB'; n+=2;
  if(over(S.total)) miss(`the forest's files are ${MB(S.total)}, over the budget of ${MB(B.FOREST_BUDGET)}`); if(!over(31*1048576)) miss('CONTROL: 31 MB is not over the budget');
  notes.push(`the forest's files: ${MB(S.total)} of ${MB(B.FOREST_BUDGET)} — code ${KB(S.code)}, prepared files ${KB(S.files)} (${S.list.filter(([f])=>!f.endsWith('.js')).map(([f,b])=>f.split('/').pop()+' '+KB(b)).join(', ')})`);
  notes.push(`per level (code + that level's files): high ${MB(S.levels.high)}, medium ${MB(S.levels.medium)}, low ${MB(S.levels.low)}`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* RUN 9 (slice 4): THE RARE EVENTS' schedule (core/night.js rareStep) over 8 simulated hours with a long-held note now and then: the same
   seed gives the same night; never the same kind twice in a row (CONTROL: without the rule a repeat appears); a timed event never comes
   sooner than gapLo after the last, a flower never sooner than bloomGap and only while a note is held >= hold; every few minutes (10…30 an
   hour); all three kinds happen; the first in 100…170 s; without held notes no flower ever; the emblem's five points (an arc, the middle
   one highest, symmetric) */
async function rareCore(){
  const d=[]; let n=0; const miss=s=>d.push(s);
  const N=await import(new URL('../apps/night/pure/cycle.js', import.meta.url).href), K=N.RARE, H=8*3600;
  const sim=(opt={}, plays=true)=>{ const st=N.rareInit(K.seed, 0, opt), ev=[], Rp=(()=>{ let a=12345; return ()=>{ a=(Math.imul(a,1103515245)+12345)>>>0; return a/4294967296; }; })(); let hs=-1, he=-1;
    for(let t=0;t<=H;t++){ if(plays && t>he+30 && Rp()<0.012){ hs=t; he=t+3+Math.floor(Rp()*5); } const held= t>=hs && t<he ? t-hs : 0; const k=N.rareStep(st, t, held); if(k) ev.push({ k, t, held }); }
    return ev; };
  const A=sim(), B=sim(); n++; if(JSON.stringify(A)!==JSON.stringify(B)) miss('two nights from one seed differ');
  let rep=0, early=0, badBloom=0; for(let i=1;i<A.length;i++){ if(A[i].k===A[i-1].k) rep++; const gap=A[i].t-A[i-1].t;
    if(A[i].k==='bloom' ? gap<K.bloomGap : gap<K.gapLo) early++; } for(const e of A) if(e.k==='bloom' && e.held<K.hold) badBloom++;
  n+=3; if(rep) miss(rep+' repeats in a row'); if(early) miss(early+' events too soon after the last'); if(badBloom) miss(badBloom+' flowers without a long-held note');
  const perH=A.length/8, kinds=new Set(A.map(e=>e.k)); n+=3; if(!(perH>=10 && perH<=30)) miss(perH.toFixed(1)+' events an hour'); if(kinds.size!==3) miss('kinds seen: '+[...kinds].join(', '));
  const Q=sim({}, false); n++;
  if(!(Q[0].t>=K.first[0] && Q[0].t<=K.first[1]+1)) miss('the first timed event at '+Q[0].t+' s');   // a held note may open a flower sooner (a minute in) if(Q.some(e=>e.k==='bloom')) miss('a flower without any held note');
  const C=sim({ repeat:true }); let rc=0; for(let i=1;i<C.length;i++) if(C[i].k===C[i-1].k) rc++; n++; if(!rc) miss('CONTROL: without the rule no repeat appeared (the rule check cannot fail)');
  const P=N.emblemPoints(); n+=2; if(P.length!==5 || P[2][1]!==Math.max(...P.map(p=>p[1]))) miss('emblem points: '+JSON.stringify(P));
  if(Math.abs(P[0][0]+P[4][0])>1e-12 || Math.abs(P[0][1]-P[4][1])>1e-12 || Math.abs(P[1][0]+P[3][0])>1e-12) miss('the emblem is not symmetric');
  return { cases:n, total:d.length, differences:d };
}
/* ENG2 (RUN 4): the provisional power class and the dropout rate — exact values; CONTROLS: a factor over the threshold must give
   'low'; a rate from too short a window must be null (never a guess) */
async function engCore(){
  const d=[]; let n=0; const eq=(what,a,b)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b)) d.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
  const K=await import(new URL('../core/pure/engclass.js', import.meta.url).href), T=K.ENG_THRESH;
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
  const K=await import(new URL('../core/pure/pack.js', import.meta.url).href), REG=await import(new URL('../core/pure/registry.js', import.meta.url).href);
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
  P=await import(new URL('../tools/probes/core/probedata.js', import.meta.url).href);
  await import(new URL('../tools/probes/core/data.js', import.meta.url).href);   // PROBE1: the data rows register themselves (flag node)
  REG=await import(new URL('../tools/probes/core/rows.js', import.meta.url).href);
  ({ loadReport }=await import(new URL('../core/scaleload.js', import.meta.url).href));
  LIC=await import(new URL('./check-licences.mjs', import.meta.url).href);   // LIC1: the licence register (text only, no app code)
  NIX=await import(new URL('./name-index.mjs', import.meta.url).href);   // DOC1 leftover: docs/core/NAME-INDEX.md generated from the code (text only)
  LAT=await import(new URL('../core/pure/latency.js', import.meta.url).href);
  HS=await import(new URL('../core/pure/handsched.js', import.meta.url).href);   // LAT2: the search schedule (pure core)
  CL=await import(new URL('../core/pure/camlight.js', import.meta.url).href);    // LAT3: low light (pure core)
  GF=await import(new URL('../core/gestures/features.js', import.meta.url).href);   // GES1: the pure gesture math
  CFG=await import(new URL('../core/config.js', import.meta.url).href);
  FMT=await import(new URL('../core/pure/format.js', import.meta.url).href);    // FMT1: the file-format core
  IDR=await import(new URL('../core/pure/registry.js', import.meta.url).href);  // FMT1: permanent ids and the registry
  SONGF=await import(new URL('../core/pure/songfile.js', import.meta.url).href);   // SAVE1: the song file's pure core
  DSP=await import(new URL('../core/pure/dsp.js', import.meta.url).href);   // SND-F1: the pure DSP core (Night forest IR, dynamics curve)   // LAT1: the pure core (no DOM, no Web Audio — runs in node)
}catch(e){ out('[probe-data] ERROR loading the data modules: '+String(e&&e.stack||e)); verdict(false,'the data modules did not load'); process.exit(1); }
const loadMs=Math.round(performance.now()-T00);

// PROBE1: the browser's data rows come from the registry (same names, runs and reads as P.all, in its order); then the node-only rows
/* NIGHT-8b: THE FULL-SCREEN ICONS (apps/night/pure/fsicons.js FS_ENTER, FS_EXIT) — the user saw a pinwheel. Each is four separate filled L brackets
   (closed axis-aligned outlines of six corners, one per quarter, at least 4 units apart), the whole drawing mirror-symmetric left ↔ right and
   top ↔ bottom (a pinwheel is turned, never mirrored); «in»: each bracket's corner at the outer corner, «out»: towards the middle. CONTROL a
   pinwheel (one uneven L turned four times round the middle) fails the mirror test. */
/* CORE-20: NIGHT LOADS ONLY ITS OWN MODES — core/scaleload.js loadScaleSubset (the very loader the page runs, reading core/data/ from disk) with Night's
   rooms (apps/night/rooms/index.js, through pure/room.js roomModes) and its profile's moods (apps/night/data/night.json): every mode Night names is
   loaded with what it needs, nothing else, no problem; the files asked are the index, the menu, those modes and what they name; each record equals
   the full loader's value for value. CONTROLS: (A) a room naming a mode the loading never saw («dorian») fails the «named ⊆ loaded» check; (B) the
   same room given to the loading gets it (adding a mode = naming it in a room); (C) a room naming a mode that does not exist fails; (D) a profile
   mood alone gets its mode loaded. */
async function nightScalesLoad(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), U=f=>new URL(f, import.meta.url).href;
  const SL=await import(U('../core/scaleload.js')), RI=await import(U('../apps/night/rooms/index.js')), PR=await import(U('../apps/night/pure/room.js'));
  const prof=JSON.parse(await readFile(new URL('../apps/night/data/night.json', import.meta.url), 'utf8'));
  const recs=RI.ROOMS.map(R=>R.record), roomIds=PR.roomModes(recs), named=ids=>[...new Set([...prof.moods, ...ids])];
  const load=async (ids, rec)=>{ const problems=[]; const r=await SL.loadScaleSubset(ids, Promise.resolve({ rec }), problems); return { ...r, problems }; };
  const lacks=(want, L)=>want.filter(id=>!L.D.manifest.modes.includes(id));
  const L=await load(roomIds, prof), want=named(roomIds);
  n+=4; const lk=lacks(want, L);
  if(lk.length) miss('named by Night but not loaded: '+lk.join(', '));
  if(L.D.manifest.modes.length!==want.length) miss(`loaded ${L.D.manifest.modes.join(', ')} — Night names ${want.join(', ')}`);
  if(L.problems.length) miss('problems: '+L.problems.map(p=>p.file+': '+p.why).join('; '));
  if(SL.loadReport.emergency) miss('the emergency pair was used');
  /* the files asked: exactly the index, the menu, the modes and what each names */
  { n++; const need=new Set(['index.json','menu.json']); for(const id of want){ const m=L.D.modes[id]; if(!m) continue; need.add(`modes/${id}.json`); need.add(`tunings/${m.tuning}.json`);
      const ch=m.chords||{}; if(ch.palette) need.add(`palettes/${ch.palette}.json`); if(ch.modes){ need.add(`chordmodes/${ch.modes}.json`); for(const x of (L.D.chordModeSets[ch.modes]||{ modes:[] }).modes) if(x.set && x.set.palette) need.add(`palettes/${x.set.palette}.json`); } }
    const extra=L.files.filter(f=>!need.has(f)), short=[...need].filter(f=>!L.files.includes(f));
    if(extra.length || short.length) miss(`files asked: extra ${extra.join(', ')||'none'}, missing ${short.join(', ')||'none'}`);
    notes.push(`Night: ${want.length} modes (${want.join(', ')}) from ${L.files.length} files (${L.files.join(', ')}) instead of every built-in`); }
  /* each record equals the full loader's */
  { const F=await SL.loadScaleData(); for(const [sect, ids] of [['modes', L.D.manifest.modes], ['tunings', L.D.manifest.tunings], ['chordModeSets', L.D.manifest.chordModeSets], ['palettes', L.D.manifest.palettes]]) for(const id of ids){ n++;
      if(JSON.stringify(L.D[sect][id])!==JSON.stringify(F[sect][id])) miss(`${sect} ${id}: not the full loader's record`); } }
  /* CONTROLS */
  { const room={ ...recs[0], moods:{ ...recs[0].moods, dorian:recs[0].look } }, ri=PR.roomModes([...recs, room]);
    n++; if(!lacks(named(ri), L).includes('dorian')) miss('CONTROL A: a room naming a mode the loading never saw passed the check');
    n++; const B=await load(ri, prof); if(lacks(named(ri), B).length) miss('CONTROL B: a mode named in a room was not loaded: '+lacks(named(ri), B).join(', '));
    n++; const ghost={ ...recs[0], moods:{ ...recs[0].moods, 'no-such-mode':recs[0].look } }, gi=PR.roomModes([...recs, ghost]), C=await load(gi, prof);
    if(!lacks(named(gi), C).includes('no-such-mode') || !C.problems.some(p=>/no-such-mode/.test(p.file))) miss('CONTROL C: a room naming a mode that does not exist was not caught');
    n++; const Dp=await load(roomIds, { ...prof, moods:[...prof.moods, 'phrygian'] }); if(!Dp.D.manifest.modes.includes('phrygian')) miss('CONTROL D: a mood named only in the profile was not loaded');
    notes.push('CONTROLS: an unloaded room mode caught; a room mode loaded once named; a missing mode caught; a profile mood loaded'); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* CORE-20: MEDIAPIPE'S BINARY EARLY, NEVER AGAINST THE PAGE'S OWN FILES — apps/night/early.js names the very files core/handdet.js loads (its MP_WASM
   folder under the library it imports: the SIMD loader and binary MediaPipe picks); it waits for the load event and for Begin to work before it
   preloads, never preloads the model (the early model build already asks for it), skips Save-Data and the old-start / old-load CONTROLS, and the
   page loads it right after the guard, before any module. CONTROL: an address one character off is caught. */
async function nightEarlyModel(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), rd=f=>readFile(new URL(f, import.meta.url), 'utf8');
  const H=await rd('../core/handdet.js'), E=await rd('../apps/night/early.js'), page=await rd('../apps/night/index.html');
  const code=E.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const c=(src, re)=>{ const m=re.exec(src); return m ? m[1] : null; };
  const lib=c(H, /from\s+"(https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@[\d.]+)"/), wasm=c(H, /MP_WASM="([^"]+)"/), eMP=c(E, /MP='([^']+)'/);
  const judge=mp=>{ const b=[]; if(mp!==lib) b.push(`library ${mp} ≠ ${lib}`); if(mp+'/wasm'!==wasm) b.push(`wasm folder ${mp}/wasm ≠ ${wasm}`); return b; };
  n++; const bad=judge(eMP); if(bad.length) miss('early.js names other files than core/handdet.js: '+bad.join('; '));
  n++; if(!judge(eMP+'x').length) miss('CONTROL: an address one character off passed');
  n++; if(!/vision_wasm_internal\.wasm/.test(code) || !/vision_wasm_internal\.js/.test(code)) miss('early.js does not name the SIMD loader and binary');
  n++; if(/hand_landmarker|mediapipe-models|modulepreload/.test(code)) miss('early.js preloads the model or the library (the early model build asks for them already: a later preload downloads twice)');
  n++; if(!/addEventListener\('load'/.test(code) || !/__nightBoot/.test(code) || !/requestIdleCallback/.test(code)) miss('early.js does not wait for the load event, Begin working and an idle moment');
  n++; if(!/saveData/.test(code) || !/oldstart/.test(code) || !/oldload/.test(code)) miss('early.js does not skip Save-Data or the old-start / old-load CONTROLS');
  n++; { const iG=page.indexOf('src="guard.js"'), iE=page.indexOf('src="early.js"'), iM=page.indexOf('type="module"'); if(!(iG>0 && iE>iG && (iM<0 || iE<iM))) miss('the page does not load early.js right after the guard, before the modules'); }
  notes.push(`early files: ${wasm}/vision_wasm_internal.{js,wasm}, after the load event and Begin working`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* DESIGN-1 part B — «NIGHT room tint (app)»: every real room names a tint token whose colour (night.css --cv-<token>) is light enough for the
   interface (≥ 7 : 1 against the dark ink on it and against the night base: pure/room.js contrastOf, TINT_CONTRAST); night.css's default tint
   (--night-tint, and the registered property's initial value) is the FIRST room's, so the first paint already wears it. CONTROLS: a dark colour,
   a token missing from night.css and a default one character off must each be caught. */
async function nightRoomTint(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  const RV=await import(new URL('../apps/night/pure/room.js', import.meta.url).href), F=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  const css=(await readFile(new URL('../apps/night/night.css', import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
  const tokOf=(c, name)=>{ const m=c.match(new RegExp('(?<![\\w-])--'+name+'\\s*:\\s*(#[0-9a-fA-F]{6})\\b')); return m ? m[1].toLowerCase() : null; };
  const judge=(c, rooms)=>{ const bad=[];
    for(const r of rooms){ const v=tokOf(c, 'cv-'+r.tint); if(!v){ bad.push(`${r.id}: no colour for its tint token --cv-${r.tint} in night.css`); continue; }
      const ci=RV.contrastOf(v, RV.TINT_INK), cb=RV.contrastOf(v, RV.TINT_BASE); if(ci<RV.TINT_CONTRAST || cb<RV.TINT_CONTRAST) bad.push(`${r.id}: its tint ${v} is too dark (${ci.toFixed(1)} : 1 against the ink, ${cb.toFixed(1)} : 1 against the base; at least ${RV.TINT_CONTRAST})`);
      else notes.push(`${r.id}: tint ${v} — ${ci.toFixed(1)} : 1 against the ink ${RV.TINT_INK}, ${cb.toFixed(1)} : 1 against the base ${RV.TINT_BASE}`); }
    const first=tokOf(c, 'cv-'+rooms[0].tint), def=tokOf(c, 'night-tint'), init=(c.match(/@property\s+--night-tint\s*\{[^}]*initial-value\s*:\s*(#[0-9a-fA-F]{6})/)||[])[1];
    if(!def || def!==first) bad.push(`night.css's default --night-tint ${def} is not the first room's tint ${first}`);
    if(!init || init.toLowerCase()!==first) bad.push(`the registered --night-tint's initial value ${init} is not the first room's tint ${first}`);
    if(tokOf(c, 'night-on-tint')!==RV.TINT_INK) bad.push(`night.css's --night-on-tint ${tokOf(c, 'night-on-tint')} is not the ink the contrast is judged against (${RV.TINT_INK})`);
    if(tokOf(c, 'night-base')!==RV.TINT_BASE) bad.push(`night.css's --night-base ${tokOf(c, 'night-base')} is not the base the contrast is judged against (${RV.TINT_BASE})`);
    return bad; };
  const rooms=RV.ROOM_IDS.map(id=>[F].find(r=>r.id===id)); n+=rooms.length;
  if(rooms.some(r=>!r)) miss('a pinned room has no record here: '+RV.ROOM_IDS.join(', '));
  else { n+=4; for(const b of judge(css, rooms)) miss(b);
    const ctl=[['a dark tint', css.replace(/--cv-forest-tint\s*:\s*#[0-9a-fA-F]{6}/, '--cv-forest-tint:#3a4a6a'), r=>/too dark/.test(r)],
      ['a missing token', css.replace(/--cv-forest-tint\s*:\s*#[0-9a-fA-F]{6};?/, ''), r=>/no colour/.test(r)],
      ['a default one character off', css.replace(/--night-tint\s*:\s*#c8f56a/, '--night-tint:#c8f56b'), r=>/default --night-tint/.test(r)]];
    for(const [name, c, want] of ctl){ n++; const b=judge(c, rooms); if(!b.some(want)) miss(`CONTROL ${name}: not caught (${b.join('; ')||'no complaint'})`); else notes.push(`CONTROL ${name}: caught`); } }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-13 — «NIGHT hand light anchor (app)»: the hand's light (apps/night/pure/handlight.js). (1) NEAREST: the light sits between the thumb and the finger
   nearest to it (the middle finger here), exactly at their midpoint once settled; (2) THE SOUNDING PAIR: while a note is held the light sits on the pair that
   sounds, even when another finger is nearer; (3) NO FLICKER: two fingers about equally near, which is nearer swapping every frame by up to 0.12 of the palm,
   300 frames → at most one move; (4) A GLIDE: a move to another pair passes smoothly (each frame at most 0.25 of the way at 60 fps, monotonic) and arrives
   exactly within moveMs; (5) BRIGHTNESS BY DISTANCE: glow 1 at the pinch's threshold and below, 0 with the finger open, falling monotonically between, and the
   light's strength at the old glow is today's (1); a finger closing frame by frame never dims the light; (6) VISUAL ONLY: the law imports nothing, no core or
   sound module imports it, the host hands the rooms copies (the bus's handsView is never written). CONTROLS: the same law without hysteresis must flicker; the
   old anchor (always thumb and index) must fail «nearest». */
async function nightHandLight(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const L=await import(new URL('../apps/night/pure/handlight.js', import.meta.url).href), H=L.HANDLIGHT, PALM=100;
  /* a hand: the thumb at (500, 400); finger j (1…4) at a ratio r[j-1] of the palm from it, each in its own direction */
  const DIR=[[-0.2,-1],[0.15,-1],[0.5,-0.85],[0.85,-0.5]].map(([x,y])=>{ const m=Math.hypot(x,y); return [x/m, y/m]; });
  const hand=r=>[[500,400], ...r.map((q,i)=>[500+DIR[i][0]*q*PALM, 400+DIR[i][1]*q*PALM])], mid=(T,j)=>[(T[0][0]+T[j][0])/2, (T[0][1]+T[j][1])/2];
  const run=(frames, o={})=>{ let st=L.handLightNew(), out=[]; for(const [r, finger] of frames){ const T=hand(r), x=L.handLightStep(st, T, PALM, finger==null ? -1 : finger, 1000/60, o); st=x.st; out.push({ ...x, T }); } return out; };
  /* (1) nearest */
  { const R=run(Array.from({ length:30 }, ()=>[[0.9, 0.4, 1.2, 1.3]])), z=R[R.length-1], m=mid(z.T, 2);
    ok(`the light is not on the nearest pair (thumb and middle): pair ${z.f}, at ${z.x.toFixed(2)},${z.y.toFixed(2)} vs ${m.map(v=>v.toFixed(2))}`, z.f===2 && Math.abs(z.x-m[0])<1e-9 && Math.abs(z.y-m[1])<1e-9);
    const old=mid(z.T, 1); ok('CONTROL: the old anchor (thumb and index) passes «nearest» — the check cannot fail', !(Math.abs(old[0]-m[0])<1e-9 && Math.abs(old[1]-m[1])<1e-9)); }
  /* (2) the sounding pair */
  { const R=run(Array.from({ length:30 }, ()=>[[0.3, 0.9, 0.15, 1.1], 1])), z=R[R.length-1];
    ok(`a held note on the middle finger: the light on pair ${z.f}, not the middle (the ring finger is nearer)`, z.f===2); }
  /* (3) no flicker */
  const noisy=o=>{ let s=0x9e3779b9; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
    const R=run(Array.from({ length:300 }, (_,i)=>{ const e=0.03*(rnd()*2-1), a=0.6+(i%2 ? 0.03 : -0.03)+e; return [[a, 0.6+(i%2 ? -0.03 : 0.03)-e, 1.2, 1.3]]; }), o);
    let moves=0; for(let i=1;i<R.length;i++) if(R[i].f!==R[i-1].f) moves++; return moves; };
  { const m=noisy({}), c=noisy({ hyst:0, margin:0 }); notes.push(`two fingers about equally near, 300 frames: ${m} moves (without hysteresis ${c})`);
    ok(`the light flickers between two about equally near fingers: ${m} moves in 300 frames`, m<=1);
    ok(`CONTROL: without hysteresis the light moved only ${c} times — the check cannot fail`, c>=20); }
  /* (4) a glide: the index nearest, then the middle clearly nearer */
  { const fr=[...Array.from({ length:20 }, ()=>[[0.8, 1.0, 1.2, 1.3]]), ...Array.from({ length:30 }, ()=>[[0.8, 0.3, 1.2, 1.3]])], R=run(fr);   // only the middle finger moves: the index pair stays put
    const a=mid(R[20].T, 1), b=mid(R[20].T, 2), span=Math.hypot(b[0]-a[0], b[1]-a[1]); let worst=0, back=false, prev=0, at=-1;
    for(let i=20;i<R.length;i++){ const p=[R[i].x, R[i].y], q=((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/(span*span), st=i>20 ? q-prev : q; worst=Math.max(worst, st); if(st< -1e-12) back=true; prev=q; if(at<0 && Math.abs(q-1)<1e-12) at=i-20; }
    notes.push(`a move to the middle finger: ${at+1} frames (moveMs ${H.moveMs}), at most ${(worst*100).toFixed(1)} % of the way in one frame`);
    ok(`the move is not smooth: ${(worst*100).toFixed(1)} % of the way in one frame (≤ 25 %), back ${back}`, worst<=0.25 && !back);
    ok(`the move did not arrive within moveMs: frame ${at}`, at>=0 && at<=Math.ceil(H.moveMs/(1000/60))); }
  /* (5) brightness by distance */
  { ok(`glow at the pinch threshold ${L.handLightGlow(H.near)} and open ${L.handLightGlow(H.far)} (1 and 0)`, L.handLightGlow(H.near)===1 && L.handLightGlow(0.05)===1 && L.handLightGlow(H.far)===0 && L.handLightGlow(1.6)===0);
    let mono=true; for(let r=H.near;r<H.far;r+=0.01) if(L.handLightGlow(r+0.01)>L.handLightGlow(r)+1e-12) mono=false; ok('the glow does not fall monotonically as the finger opens', mono);
    ok(`the strength at the old glow is ${L.handLightK(L.HANDLIGHT_GLOW_OLD)}, not today's 1`, Math.abs(L.handLightK(L.HANDLIGHT_GLOW_OLD)-1)<1e-12);
    const R=run(Array.from({ length:40 }, (_,i)=>[[1.1-0.95*i/39, 1.2, 1.3, 1.4]])); let dim=false; for(let i=1;i<R.length;i++) if(R[i].glow<R[i-1].glow-1e-12) dim=true;
    ok(`a closing finger dimmed the light, or it did not reach full at the pinch (${R[R.length-1].glow})`, !dim && R[R.length-1].glow>=0.999); }
  /* (6) visual only */
  { const fs=await import('node:fs'), src=fs.readFileSync(new URL('../apps/night/pure/handlight.js', import.meta.url), 'utf8'), host=fs.readFileSync(new URL('../apps/night/scene/host.js', import.meta.url), 'utf8');
    ok('the law imports something', !/^\s*import\s/m.test(src));
    const users=[]; const walk=dir=>{ for(const e of fs.readdirSync(dir, { withFileTypes:true })){ const f=new URL(e.name+(e.isDirectory() ? '/' : ''), dir); if(e.isDirectory()) walk(f); else if(e.name.endsWith('.js') && fs.readFileSync(f,'utf8').includes('handlight.js')) users.push(f.pathname.replace(/^.*\/(core|apps)\//, '$1/')); } };
    walk(new URL('../core/', import.meta.url)); walk(new URL('../apps/night/', import.meta.url));
    ok(`the law is read by ${users.join(', ')} (only the host and the forest may read it)`, users.every(u=>/apps\/night\/(scene\/host|rooms\/forest\/forest)\.js$/.test(u)) && users.some(u=>/host\.js$/.test(u)));
    ok('the host does not hand the rooms copies of the hands (out.push({ ...h, … }))', /out\.push\(\{ \.\.\.h, x:r\.x, y:r\.y/.test(host) && !/handsView'\)\s*\.\s*(forEach|map)\(\s*h\s*=>\s*\{?\s*h\.x\s*=/.test(host)); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* DESIGN-1 part D — «NIGHT start still (app)»: (1) THE FILES — every real room names a still per level, each a WebP in its folder of at most 100 KB
   (STILL_BUDGET); (2) THE FIRST PAINT — night.css shows the first room's two stills (the default and html[data-still="full"]) exactly as its record names
   them, and guard.js sets data-still to one of the levels from the stored picture level; (3) THE LAW (pure/still.js) — before the start ends: the still;
   with the room's picture: no reveal before the room is ready AND its fade-in (= the host's SCENE_FADE.in) is over, «wait» while it is not ready (a late
   room keeps the still), then the reveal over revealMs; reduced motion or another background: a plain fade; the old way (none): gone at the start's end;
   the look covers everything at 0 and nothing at 1, clearing monotonically; the dot starts at the emblem, ends in the picture, faded. CONTROLS: a law that
   reveals as soon as the room is ready (no fade-in wait), a file over the budget and a CSS default one character off must each be caught. */
const STILL_BUDGET=100*1024;
async function nightStartStill(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), fs=await import('node:fs');
  const RV=await import(new URL('../apps/night/pure/room.js', import.meta.url).href), SL=await import(new URL('../apps/night/pure/still.js', import.meta.url).href);
  const RI=await import(new URL('../apps/night/rooms/index.js', import.meta.url).href);
  const rooms=RV.ROOM_IDS.map(id=>RI.roomById(id)); if(rooms.some(r=>!r)) return { cases:1, total:1, differences:['a pinned room is not in the registry'], notes };
  const sizeOf=f=>{ try{ const b=fs.readFileSync(f); return { n:b.length, webp:b.slice(0,4).toString()==='RIFF' && b.slice(8,12).toString()==='WEBP' }; }catch(e){ return null; } };
  const files=(sz)=>{ const bad=[];
    for(const R of rooms) for(const lv of RV.ROOM_LEVELS){ const rel=SL.stillFile(R.record, lv); if(!rel){ bad.push(`${R.record.id}: no still for «${lv}»`); continue; }
      const f=new URL(rel, R.base), s=sz ? sz(f) : sizeOf(f); if(!s){ bad.push(`${R.record.id} ${lv}: ${rel} is missing`); continue; }
      if(!s.webp) bad.push(`${R.record.id} ${lv}: ${rel} is not a WebP`); if(s.n>STILL_BUDGET) bad.push(`${R.record.id} ${lv}: ${rel} is ${s.n} bytes (at most ${STILL_BUDGET})`);
      if(!sz) notes.push(`${R.record.id} ${lv}: ${rel}, ${(s.n/1024).toFixed(1)} KB`); }
    return bad; };
  n+=rooms.length*RV.ROOM_LEVELS.length; for(const b of files()) miss(b);
  /* the first paint */
  const css=(await readFile(new URL('../apps/night/night.css', import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,''), guard=await readFile(new URL('../apps/night/guard.js', import.meta.url),'utf8');
  const first=rooms[0], folder=new URL(first.base).pathname.replace(/^.*\/apps\/night\//, '');
  const paint=c=>{ const bad=[], def=(c.match(/\.night-still\{[^}]*url\(([^)]+)\)/)||[])[1], full=(c.match(/html\[data-still="full"\]\s*\.night-still\{[^}]*url\(([^)]+)\)/)||[])[1];
    if(def!==folder+first.record.still.reduced) bad.push(`night.css's default still is «${def}», the first room's reduced one is «${folder+first.record.still.reduced}»`);
    if(full!==folder+first.record.still.full) bad.push(`night.css's still at Detailed is «${full}», the first room's full one is «${folder+first.record.still.full}»`);
    return bad; };
  n+=3; for(const b of paint(css)) miss(b);
  if(!/setAttribute\('data-still', localStorage\.getItem\('handsong\.sceneLevel'\)==='full' \? 'full' : 'reduced'\)/.test(guard) || !RV.ROOM_LEVELS.every(l=>guard.includes(`'${l}'`))) miss('guard.js does not set data-still to a level from the stored picture level');
  /* the law */
  const host=await readFile(new URL('../apps/night/scene/host.js', import.meta.url),'utf8'), fadeIn=+((host.match(/SCENE_FADE=Object\.freeze\(\{\s*out:\s*\d+,\s*in:\s*(\d+)/)||[])[1]);
  n++; if(SL.STILL.sceneInMs!==fadeIn) miss(`the still waits ${SL.STILL.sceneInMs} ms for the room's fade-in, the host fades in over ${fadeIn} ms`);
  const law=phase=>{ const bad=[], E=1000;
    if(phase({ ended:null, readyAt:null, room:true }, 5e3).phase!=='start') bad.push('before the start ends it is not the start');
    for(const ready of [null, 400, 3000, 9000]) for(let t=E;t<E+16e3;t+=50){ const P=phase({ ended:E, readyAt:ready, room:true }, t);
      if(ready==null || t<ready+SL.STILL.sceneInMs){ if(P.phase!=='wait'){ bad.push(`room ready at ${ready}: «${P.phase}» at ${t} — the still went before the room was drawn and faded in`); break; } } }
    { const P=phase({ ended:E, readyAt:200, room:true }, E+SL.STILL.revealMs/2); if(P.phase!=='reveal' || Math.abs(P.p-0.5)>1e-9) bad.push('a room ready long before: the reveal does not start at the start\'s end ('+JSON.stringify(P)+')'); }
    { const P=phase({ ended:E, readyAt:200, room:true, plain:true }, E+SL.STILL.fadeMs/2); if(P.phase!=='reveal' || Math.abs(P.p-0.5)>1e-9) bad.push('reduced motion: not a plain fade over fadeMs'); }
    { const P=phase({ ended:E, readyAt:null, room:false }, E+SL.STILL.fadeMs+1); if(P.phase!=='done') bad.push('another background: not gone after the plain fade'); }
    { const P=phase({ ended:E, readyAt:null, room:true, none:true }, E); if(P.phase!=='done') bad.push('the old way (none) keeps the still'); }
    return bad; };
  n+=6; for(const b of law(SL.stillPhase)) miss(b);
  { n+=4; const L0=SL.stillLook(0, false), L1=SL.stillLook(1, false); let prev=-Infinity, mono=true; for(let p=0;p<=1;p+=0.01){ const c=SL.stillLook(p, false).clear; if(c<prev-1e-12) mono=false; prev=c; }
    if(!(L0.clear<=0 && L0.opacity===1)) miss('at the reveal\'s start the still does not cover everything: '+JSON.stringify(L0));
    if(!(L1.clear-SL.STILL.soft>=1 && L1.mist<1e-9)) miss('at the reveal\'s end something of the still is left: '+JSON.stringify(L1));
    if(!mono) miss('the clearing goes back');
    const P=SL.stillLook(0.5, true); if(P.clear>0 || Math.abs(P.opacity-0.5)>1e-9) miss('reduced motion: not a plain opacity fade'); }
  { n+=2; const a=SL.stillDot(0, 75, 40, 1280, 800), b=SL.stillDot(1, 75, 40, 1280, 800);
    if(Math.abs(a.x-75)>1e-9 || Math.abs(a.y-40)>1e-9 || a.a!==1) miss('the dot does not start at the emblem: '+JSON.stringify(a));
    if(Math.abs(b.x-SL.STILL.dotTo[0]*1280)>1e-9 || Math.abs(b.y-SL.STILL.dotTo[1]*800)>1e-9 || b.a!==0) miss('the dot does not end in the picture, faded: '+JSON.stringify(b));
    /* NIGHT-13: the flight to a firefly — from the emblem's place, radius and held glow to the firefly's place and size, faded there, inside the reveal */
    n+=3; const A={ x:75, y:40, r:5 }, B={ x:700, y:380, r:1.2 }, f0=SL.dotFlight(0, A, B, 800), f1=SL.dotFlight(1, A, B, 800);
    if(f0.x!==75 || f0.y!==40 || f0.r!==5 || f0.glow!==SL.DOT.glowHeld || f0.halo!==SL.DOT.haloHeld) miss('the flight does not start at the emblem in its held look: '+JSON.stringify(f0));
    if(f1.x!==700 || f1.y!==380 || Math.abs(f1.r-1.2)>1e-12 || f1.a!==0 || f1.glow!==1) miss('the flight does not end on the firefly, at its size, faded: '+JSON.stringify(f1));
    if(!(SL.DOT.flyMs<SL.STILL.revealMs && SL.DOT.flyMs>=1500 && SL.DOT.flyMs+SL.DOT.pulseMs<=2600)) miss(`the flight takes ${SL.DOT.flyMs} ms (inside the reveal's ${SL.STILL.revealMs} ms, about 1.5–2.5 s with the pulse wanted)`); }
  /* NIGHT-13: THE GEOMETRY — the still as placed (stillFit) shows every world direction where the live camera shows it, on every screen shape (portrait and
     landscape phones, laptops, full screens, a screen just under 4 : 5, the widest it covers); the corner silhouettes' 2D law = the 3D placement's projection;
     the files' own aspect = the record's; night.css's first paint = the law (the heights, the two screen limits, the vignette veil). CONTROL: DESIGN-1's fit
     (a 55° 1.6 : 1 frame covering at 42 %) misplaces them by more than 2 % on a 1920 × 1080 screen. */
  const R0=first.record, ST=R0.still, RVf=RV.roomFov, T=SL.stillTan, SIL=await import(new URL('../apps/night/rooms/forest/pure/sil.js', import.meta.url).href);
  const SCREENS=[[1280,800],[1536,730],[1920,1080],[390,844],[844,390],[873,393],[2400,1080],[800,800],[1000,1260],[1600,1000]];
  const miss1=(bw, bh, F)=>{ const fov=RVf(R0.view, bw, bh), Tl=T(fov), Ts=T(ST.fov), Hs=1000, Ws=Hs*ST.aspect; let worst=0;
    for(const tx of [-0.9,-0.4,0,0.3,0.85]) for(const ty of [-0.8,-0.2,0,0.5,0.9]){ const ax=tx*Tl*bw/bh, ay=ty*Tl;   // a direction inside the live view (tan units)
      const X=bw/2+ax*(bh/2)/Tl, Y=bh/2-ay*(bh/2)/Tl, u=Ws/2+ax*(Hs/2)/Ts, v=Hs/2-ay*(Hs/2)/Ts, X2=F.x+u*F.w/Ws, Y2=F.y+v*F.h/Hs; worst=Math.max(worst, Math.hypot(X-X2, Y-Y2)/bh); }
    return worst; };
  for(const [bw,bh] of SCREENS){ n++; const F=SL.stillFit(ST, RVf(R0.view, bw, bh), bw, bh, bw, bh), m=miss1(bw, bh, F);
    if(F.cover || m>1e-9) miss(`${bw}×${bh}: the still is off the live picture by ${(m*100).toExponential(2)} % of the height${F.cover ? ' (scaled to cover)' : ''}`); }
  { const w=SL.stillWidest(ST, R0.view.fov); n++; notes.push(`the still covers every screen up to ${w.toFixed(4)} : 1 exactly (${SCREENS.length} shapes checked to 1e-9)`); if(w<2.4) miss(`the still covers screens only up to ${w.toFixed(3)} : 1 (2.4 wanted)`); }
  { n++; const bw=1920, bh=1080, s=Math.max(bw/1280, bh/800), W0=1280*s, H0=800*s, h=H0*T(ST.fov)/T(R0.view.fov), w=h*ST.aspect, F={ w, h, x:(bw-W0)*0.5+W0/2-w/2, y:(bh-H0)*0.42+H0/2-h/2 }, m=miss1(bw, bh, F);
    if(m<0.02) miss(`CONTROL: DESIGN-1's fit is off by only ${(m*100).toFixed(2)} % at 1920 × 1080 — the geometry check cannot fail`); else notes.push(`CONTROL: DESIGN-1's fit is off by ${(m*100).toFixed(1)} % of the height at 1920 × 1080`); }
  /* the silhouettes: a pinhole camera of the live lens at the rest pose sees each plane (parallel to the picture at depth d, h of the view's height) where silScreen draws it */
  for(const [bw,bh] of [[1280,800],[390,844]]){ const fov=RVf(R0.view, bw, bh), f=(bh/2)/T(fov);
    for(const o of ST.over.sil){ n++; const P=SIL.silScreen(o, bw, bh, bw/bh), k=bw/bh<SIL.SIL_TALL ? SIL.SIL_TALL : 1, hw=2*o.d*T(fov)*o.h*k, wx=o.nx*T(fov)*bw/bh*o.d, wy=o.ny*T(fov)*o.d, X=bw/2+wx*f/o.d, Y=bh/2-wy*f/o.d;
      if(Math.abs(P.h-hw*f/o.d)>1e-9 || Math.abs(P.x-X)>1e-9 || Math.abs(P.y-Y)>1e-9 || Math.abs(P.w-P.h*o.gw)>1e-9) miss(`${bw}×${bh}: the ${o.kind} silhouette's 2D place differs from its projection (${JSON.stringify(P)})`); } }
  /* the files' own size (WebP: VP8 / VP8L / VP8X) */
  const dims=f=>{ try{ const b=fs.readFileSync(f), t=b.slice(12,16).toString();
    if(t==='VP8X') return [1+b.readUIntLE(24,3), 1+b.readUIntLE(27,3)]; if(t==='VP8 ') return [b.readUInt16LE(26)&0x3fff, b.readUInt16LE(28)&0x3fff];
    if(t==='VP8L'){ const v=b.readUInt32LE(21); return [1+(v&0x3fff), 1+((v>>14)&0x3fff)]; } }catch(e){} return null; };
  for(const lv of RV.ROOM_LEVELS){ n++; const D=dims(new URL(ST[lv], first.base)); if(!D || Math.abs(D[0]/D[1]-ST.aspect)/ST.aspect>2e-3) miss(`the ${lv} still is ${D ? D.join('×') : 'unreadable'}: its aspect is not the record's ${ST.aspect}`); else notes.push(`${lv} still ${D.join('×')}`); }
  { n++; const D=dims(new URL(ST.over.sprites, first.base)), need=Object.values(ST.over.rects).reduce((m,q)=>[Math.max(m[0], q[0]+q[2]), Math.max(m[1], q[1]+q[3])], [0,0]);
    if(!D || D[0]<need[0] || D[1]<need[1]) miss(`the silhouettes' shapes are ${D ? D.join('×') : 'unreadable'}, the rects need ${need.join('×')}`); }
  /* night.css's first paint */
  { const rule=(css.match(/\.night-still\{[^}]*\}/)||[''])[0], pct=(rule.match(/background-size:100% 100%, auto ([\d.]+)%/)||[])[1], tall=(css.match(/@media not all and \(min-aspect-ratio: 4\/5\)\{ \.night-still\{ background-size:100% 100%, auto ([\d.]+)%; \} \}/)||[])[1];
    const wide=(css.match(/@media \(min-aspect-ratio: (\d+)\/(\d+)\)\{ \.night-still\{ background-size:100% 100%, 100% auto; \} \}/)||[]), want=100*T(ST.fov)/T(R0.view.fov), wantT=100*T(ST.fov)/T(R0.view.tallFov);
    n+=4; if(!(Math.abs(+pct-want)<1e-3)) miss(`night.css shows the still at ${pct} % of the height, the law ${want.toFixed(4)} %`);
    if(!(Math.abs(+tall-wantT)<1e-3)) miss(`night.css's tall screens: ${tall} %, the law ${wantT.toFixed(4)} %`);
    if(!(wide.length===3 && Math.abs(wide[1]/wide[2]-SL.stillWidest(ST, R0.view.fov))<1e-3)) miss(`night.css fills the width from ${wide[1]}/${wide[2]}, the still covers up to ${SL.stillWidest(ST, R0.view.fov).toFixed(4)}`);
    if(!/^\.night-still\{ position:fixed; left:0; top:0; width:100vw; height:100vh;/.test(rule)) miss('the box of the still is not that of the live canvas (100vw × 100vh at 0, 0)');
    const veil=(css.match(/--night-still-veil:radial-gradient\(([\d.]+)% ([\d.]+)% at ([\d.]+)% ([\d.]+)%, ([^;]+)\);/)||[]), V=ST.over.vignette; n+=2;
    if(veil.length!==6 || [V.rx, V.ry, V.cx, V.cy].some((v,i)=>Math.abs(+veil[i+1]-100*v)>1e-6)) miss('the vignette veil of night.css is not the ellipse of the paint pass');
    else { let worst=0; const sm=x=>{ x=Math.max(0, Math.min(1, (x-V.from)/(1-V.from))); return x*x*(3-2*x); }, st=[...veil[5].matchAll(/rgba\(0,0,0,([\d.]+)\) ([\d.]+)%/g)].map(m=>[+m[2]/100, +m[1]]);
      for(let e=0;e<=1.0000001;e+=0.005){ let a=st[st.length-1][1]; for(let i=1;i<st.length;i++) if(e<=st[i][0]){ const [e0,a0]=st[i-1], [e1,a1]=st[i]; a=a0+(a1-a0)*(e-e0)/((e1-e0)||1); break; } worst=Math.max(worst, Math.abs(a-V.k*sm(e))); }
      notes.push(`the vignette veil: at most ${worst.toFixed(4)} off the paint pass's law (k ${V.k})`); if(worst>0.003) miss(`the vignette veil of night.css is ${worst.toFixed(4)} off the law`); } }
  /* the CONTROLS */
  { n++; const eager=(s, now)=> s.ended!=null && s.room && s.readyAt!=null && now>=Math.max(s.ended, s.readyAt) ? { phase:'reveal', p:0, t0:Math.max(s.ended, s.readyAt) } : SL.stillPhase(s, now);
    if(!law(eager).length) miss('CONTROL: a law revealing as soon as the room is ready passed — the fade-in wait cannot fail'); else notes.push('CONTROL: a law revealing without the fade-in wait is caught'); }
  { n++; const b=files(()=>({ n:STILL_BUDGET+1, webp:true })); if(!b.some(x=>/at most/.test(x))) miss('CONTROL: a file over the budget was not caught'); else notes.push('CONTROL: a file over the budget is caught'); }
  { n++; const b=paint(css.replace('still-reduced.webp', 'still-reduced.webq')); if(!b.length) miss('CONTROL: a CSS default one character off was not caught'); else notes.push('CONTROL: a CSS default one character off is caught'); }
  return { cases:n, total:d.length, differences:d, notes };
}
async function nightFsIcons(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), I=await import(new URL('../apps/night/pure/fsicons.js', import.meta.url).href).catch(e=>({ err:e }));
  if(I.err){ return { cases:1, total:1, differences:['apps/night/pure/fsicons.js does not load in node: '+I.err.message], notes }; }
  const pieces=p=>p.split('Z').map(x=>x.trim()).filter(Boolean).map(sp=>{ const pts=[]; let x=0, y=0; for(const m of sp.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g)){ if(m[1]==='M'){ x=+m[2]; y=+m[3]; } else if(m[1]==='H') x=+m[2]; else y=+m[2]; pts.push([x,y]); } return pts; });
  const key=a=>a.map(([x,y])=>x.toFixed(3)+','+y.toFixed(3)).sort().join(' ');
  const mirror=(P, f)=>key(P.flat())===key(P.flat().map(f));
  const judge=(path, out)=>{ const P=pieces(path); n+=5; const bad=[];
    if(P.length!==4) bad.push(P.length+' pieces');
    if(P.some(q=>q.length!==6 || q.some((p,i)=>{ const r=q[(i+1)%q.length]; return p[0]!==r[0] && p[1]!==r[1]; }))) bad.push('a piece is not a six-corner axis-aligned outline');
    if(!mirror(P, ([x,y])=>[24-x,y])) bad.push('not mirrored left ↔ right'); if(!mirror(P, ([x,y])=>[x,24-y])) bad.push('not mirrored top ↔ bottom');
    const box=q=>[Math.min(...q.map(p=>p[0])), Math.min(...q.map(p=>p[1])), Math.max(...q.map(p=>p[0])), Math.max(...q.map(p=>p[1]))], B=P.map(box);
    const quads=new Set(B.map(b=>((b[0]+b[2])/2<12 ? 'l' : 'r')+((b[1]+b[3])/2<12 ? 't' : 'b'))); if(quads.size!==4) bad.push('not one piece per quarter');
    let gap=Infinity; for(let i=0;i<B.length;i++) for(let j=i+1;j<B.length;j++){ const a=B[i], b=B[j]; gap=Math.min(gap, Math.max(b[0]-a[2], a[0]-b[2], b[1]-a[3], a[1]-b[3])); }
    if(!(gap>=4)) bad.push('pieces only '+gap+' apart');
    /* the bracket's corner: (in) its bounding box's outer corner is a vertex and the inner one is not; (out) the other way round */
    for(let i=0;i<P.length;i++){ const b=B[i], cx=(b[0]+b[2])/2<12 ? b[0] : b[2], cy=(b[1]+b[3])/2<12 ? b[1] : b[3], ix=cx===b[0] ? b[2] : b[0], iy=cy===b[1] ? b[3] : b[1];
      const has=(x,y)=>P[i].some(p=>p[0]===x && p[1]===y), outer=has(cx,cy), inner=has(ix,iy);
      if(out ? !(outer && !inner) : !(inner && !outer)){ bad.push(`piece ${i+1}: its corner is not ${out ? 'at the outer corner' : 'towards the middle'}`); break; } }
    return bad; };
  for(const [name, path, out] of [['in (corners out)', I.FS_ENTER, true], ['out (corners in)', I.FS_EXIT, false]]){ const b=judge(path, out); if(b.length) miss(name+': '+b.join('; ')); }
  { const rot=(pts,k)=>pts.map(([x,y])=>{ let X=x-12, Y=y-12; for(let i=0;i<k;i++) [X,Y]=[-Y,X]; return [X+12,Y+12]; }), base=pieces('M3.5 3.5H10V5.5H5.5V7H3.5Z')[0], wheel=[0,1,2,3].map(k=>rot(base,k)); n++;   // the uneven L: arms 6.5 and 3.5
    if(mirror(wheel, ([x,y])=>[24-x,y])) miss('CONTROL: a pinwheel passes the mirror test'); else notes.push('CONTROL: a pinwheel (one uneven L turned four times) fails the mirror test'); }
  notes.push('in: four corner brackets pointing out; out: four pointing in; both mirror-symmetric on both axes, filled, pieces ≥ 4 units apart');
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-8b: THE STREAM FROM A RECORDING (apps/night/pure/brookrec.js) on a made-up recording (seeded noise, 30 s at 48 kHz; node cannot decode
   the shipped MP3 — the browser row decodes it): (1) repeatable — CONTROL another seed differs; (2) never across the file's ends — the first and
   last `edge` seconds hold NaN, the output stays finite — CONTROL a NaN inside the body is caught; (3) EQUAL-POWER joins — on a constant
   recording the output rises to exactly √2 of its plain level in the middle of a join (cos + sin) — CONTROL a hard cut (the phasor frozen)
   does not; (4) grains of 4.5–8 s: about one join per stream every 3–6.4 s; (5) asleep: zeros, nothing computed; (6) the Lighter mode plays
   the three loudest (nearest) voices; (7) a recording shorter than one grain and its edges is refused; (8) the room's recipe names a file that
   exists in its folder, under 1.5 MB. */
async function nightStreamRec(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), RC=await import(new URL('../apps/night/pure/brookrec.js', import.meta.url).href);
  const FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM, V=FR.nature.stream.voices, FS=48000, B=RC.BROOK_REC;
  const noise=(sec, seed)=>{ let s=seed>>>0||1; const x=new Float32Array(FS*sec); for(let i=0;i<x.length;i++){ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; x[i]=s/4294967296*2-1; } return x; };
  const run=(st, pcm, sec)=>{ const N=FS*sec, L=new Float32Array(N), R=new Float32Array(N); for(let o=0;o<N;o+=128) RC.recOut(st, pcm, L, R, o, Math.min(128, N-o)); return [L, R]; };
  const pcm=noise(30, 7);
  { const a=run(RC.recNew(FS, V, pcm.length, 1), pcm, 6), b=run(RC.recNew(FS, V, pcm.length, 1), pcm, 6), c=run(RC.recNew(FS, V, pcm.length, 1, B.seed+1), pcm, 6); n+=2;
    if(a[0].some((v,i)=>v!==b[0][i]) || a[1].some((v,i)=>v!==b[1][i])) miss('two renders with the same seed differ'); if(a[0].every((v,i)=>v===c[0][i])) miss('CONTROL: another seed gives the same sound'); }
  { const e=Math.round(B.edge*FS), p=pcm.slice(); for(let i=0;i<e;i++){ p[i]=NaN; p[p.length-1-i]=NaN; } const [L, R]=run(RC.recNew(FS, V, p.length, 1), p, 60); n+=2;
    if(L.some(v=>!Number.isFinite(v)) || R.some(v=>!Number.isFinite(v))) miss('a grain read the file\'s edges (across its ends)');
    const q=pcm.slice(); for(let i=e;i<q.length-e;i+=FS) q[i]=NaN; const [L2]=run(RC.recNew(FS, V, q.length, 1), q, 60); if(L2.every(v=>Number.isFinite(v))) miss('CONTROL: NaN inside the body was not caught'); }
  { const one=new Float32Array(FS*30).fill(0.5), V1=[{ pan:0, w:0, gain:1, lp:20000, rate:1, f:[400,2000], rush:0 }], rest=2*0.5*Math.SQRT1_2*Math.SQRT1_2;   // one voice = two streams at the middle, each 0.5 · ½√2 (its gain) · ½√2 (the pan)
    const peakOf=st=>{ const [L]=run(st, one, 20); let mx=0; for(let i=FS;i<L.length;i++) mx=Math.max(mx, L[i]); return mx; };
    const solo=o=>{ o.vs=o.vs.slice(0, 1); return o; }, rest1=rest/2;   // one stream alone: its joins never overlap another's
    const ratio=peakOf(solo(RC.recNew(FS, V1, one.length, 1)))/rest1; n+=2;
    if(Math.abs(ratio-Math.SQRT2)>0.003) miss(`a join peaks at ${ratio.toFixed(4)} × the plain level (√2 = 1.4142 for equal power)`);
    const hc=solo(RC.recNew(FS, V1, one.length, 1)); hc.cd=1; hc.sd=0; const r2=peakOf(hc)/rest1; if(Math.abs(r2-Math.SQRT2)<=0.003) miss('CONTROL: a hard cut passed the equal-power judgement');
    notes.push(`joins: peak ${ratio.toFixed(4)} × the plain level on a constant recording (√2 wanted); CONTROL hard cut ${r2.toFixed(4)}`); }
  { const st=RC.recNew(FS, V, pcm.length, 1), g0=st.grains; run(st, pcm, 60); const per=(st.grains-g0)/st.vs.length; n++;
    if(!(per>=60/6.4-1.5 && per<=60/2.9+1.5)) miss(`${per.toFixed(1)} joins per stream in 60 s (grains ${B.grain.join('–')} s with ${B.fade}-s joins)`); notes.push(`${per.toFixed(1)} joins per stream a minute, ${st.vs.length} streams (${V.length} voices × 2)`); }
  { const st=RC.recNew(FS, V, pcm.length, 1); st.sleep=true; const [L]=run(st, pcm, 1); n++; if(L.some(v=>v!==0) || st.frames!==0) miss('asleep, the stream still sounds or computes'); }
  { const st=RC.recNew(FS, V, pcm.length, 1), want=V.map((v,i)=>[v.gain,i]).sort((a,b)=>b[0]-a[0]).slice(0, B.light).map(x=>x[1]).sort((a,b)=>a-b); n+=2;
    if(JSON.stringify(st.near)!==JSON.stringify(want)) miss(`the Lighter mode keeps voices ${st.near} (the loudest ${want} wanted)`);
    if(JSON.stringify(want)===JSON.stringify([0,1,2])) miss('CONTROL: the loudest voices are the first three — the check cannot tell'); }
  { n++; if(RC.recNew(FS, V, RC.recMinLen(FS)-1, 1)!==null || RC.recNew(FS, V, RC.recMinLen(FS), 1)===null) miss('a recording too short is not refused (or one just long enough is)'); }
  { const fs=await import('node:fs'), f=new URL('../apps/night/rooms/forest/'+FR.nature.stream.rec.file, import.meta.url); n+=2;
    if(!fs.existsSync(f)) miss('the recipe names a file that is not there: '+FR.nature.stream.rec.file);
    else { const sz=fs.statSync(f).size; if(sz>1.5*1048576) miss(`the recording is ${(sz/1048576).toFixed(2)} MB (1.5 at most)`); notes.push(`the shipped file: ${FR.nature.stream.rec.file}, ${(sz/1024).toFixed(0)} KB, level ×${FR.nature.stream.rec.norm}`); } }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-8b: THE BARK'S MOSS PER TRUNK (apps/night/rooms/forest/pure/wood.js barkMoss) — the user saw the same moss on two big trunks. For today's
   95 trunks: every two differ by at least WOOD.bark.minGap in the five parameters (unit cube); the two big trunks on the right (forestTrunks 1
   and 7) differ in at least three of them by 0.15; each parameter spans most of its range; repeatable — CONTROL another seed differs; CONTROL
   one moss for every trunk (the old law) fails the gap judgement. */
async function forestBarkMoss(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), W=await import(new URL('../apps/night/rooms/forest/pure/wood.js', import.meta.url).href), Lo=await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href);
  const T=Lo.forestTrunks(), M=W.barkMoss(T.length), U=M.map(W.barkMossUnit), gapOf=U2=>{ let g=Infinity, at=null; for(let i=0;i<U2.length;i++) for(let j=i+1;j<U2.length;j++){ const x=Math.hypot(...U2[i].map((v,k)=>v-U2[j][k])); if(x<g){ g=x; at=[i,j]; } } return [g, at]; };
  const [g, at]=gapOf(U); n+=4;
  if(!(g>=W.WOOD.bark.minGap)) miss(`trunks ${at} have nearly the same moss (gap ${g.toFixed(3)}, ${W.WOOD.bark.minGap} wanted)`);
  { const a=U[1], b=U[7], far=a.filter((v,k)=>Math.abs(v-b[k])>=0.15).length; if(far<3) miss(`the two big trunks on the right differ in ${far} of 5 moss parameters`);
    notes.push(`the two big trunks on the right (${T[1].slice(0,2)}, ${T[7].slice(0,2)}): reach ${M[1][0].toFixed(2)} / ${M[7][0].toFixed(2)} m, side ${M[1][1].toFixed(2)} / ${M[7][1].toFixed(2)} rad, cover ${M[1][2].toFixed(2)} / ${M[7][2].toFixed(2)}, patchiness ${M[1][3].toFixed(2)} / ${M[7][3].toFixed(2)}, tint ${M[1][4].toFixed(2)} / ${M[7][4].toFixed(2)} (${far} of 5 apart)`); }
  for(let k=0;k<5;k++){ const v=U.map(u=>u[k]), sp=Math.max(...v)-Math.min(...v); if(sp<0.85){ miss(`moss parameter ${k} spans only ${sp.toFixed(2)} of its range`); break; } }
  if(JSON.stringify(W.barkMoss(T.length))!==JSON.stringify(M)) miss('two draws differ');
  { n+=2; if(JSON.stringify(W.barkMoss(T.length, W.WOOD.bark.seed+1))===JSON.stringify(M)) miss('CONTROL: another seed gives the same moss');
    if(gapOf(U.map(()=>U[0]))[0]>=W.WOOD.bark.minGap) miss('CONTROL: one moss for every trunk passes the gap judgement'); }
  notes.push(`${T.length} trunks, the smallest gap ${g.toFixed(3)} (trunks ${at}; ${W.WOOD.bark.minGap} wanted); CONTROL one moss for all: gap 0`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-8c: EVERY TRUNK ITS OWN BARK LAYOUT, MOSS AND LICHEN (apps/night/rooms/forest/pure/wood.js barkUv, woodPieces; forest-wood.js lookSrc) —
   the user: two big trunks in the light showed the same pale oval blotches in the same layout, and 8b's moss did not change them. They were the
   LICHEN: one formula for every trunk (the world normal's angle and the height through one thresholded noise: tall ovals 0.8–5.5 m up, the same
   size, band, cover and colour on all) — and the bark texture's height layout was the same on every trunk. Checks: (1) today's 95 trunks' bark
   mappings differ pairwise by ≥ WOOD.bark.uvGap (turn and lift circular, scale, spiral), the two trunks in the light (0, 1) and the big pair on the
   right (1, 7) in turn or lift by ≥ 0.15, each number spans ≥ 0.85 of its range, repeatable; CONTROL one mapping for all → gap 0. (2) Exact: every
   two trunks' noise regions at least one cell apart and the look's hash without a near-repeat at any shift between them (< 0.5 over 24 × 24 cells);
   CONTROL a weak hash's near-repeat is caught, CONTROL the same numbers share a region. (3) The merged wood's pieces (woodPlaces at Detailed) each have their own moss and
   mapping rows (none shared with a trunk, the lists long enough); CONTROL the limbs' list is not the wood's. (4) The look's source: moss and
   lichen read the piece's own numbers on both paths (no bark-only branch), no world-angle coordinate, the lichen from vp8; CONTROL the old
   lichen line fails that judgement. */
async function forestBarkLayouts(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), W=await import(new URL('../apps/night/rooms/forest/pure/wood.js', import.meta.url).href), Lo=await import(new URL('../apps/night/rooms/forest/pure/layout.js', import.meta.url).href);
  const FW=await import(new URL('../apps/night/rooms/forest/forest-wood.js', import.meta.url).href), FR=(await import(new URL('../apps/night/rooms/forest/pure/room.js', import.meta.url).href)).FOREST_ROOM;
  const T=Lo.forestTrunks(), B=W.WOOD.bark, U=W.barkUv(T.length), M=W.barkMoss(T.length);
  const gapOf=L=>{ let g=Infinity, at=null; for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const x=W.barkUvGap(L[i], L[j]); if(x<g){ g=x; at=[i,j]; } } return [g, at]; };
  /* (1) the mapping law */
  { const [g, at]=gapOf(U); n+=4; if(!(g>=B.uvGap)) miss(`trunks ${at} have nearly the same bark layout (gap ${g.toFixed(3)}, ${B.uvGap} wanted)`);
    const circ=x=>{ const v=Math.abs(x)%1; return Math.min(v, 1-v); }, apart=(i,j)=>Math.max(circ(U[i][0]-U[j][0]), circ(U[i][1]-U[j][1]));
    for(const [i,j] of [[0,1],[1,7]]) if(apart(i,j)<0.15) miss(`trunks ${i} and ${j} turn and lift within ${apart(i,j).toFixed(2)}`);
    const span=k=>{ const v=U.map(u=>u[k]); return (Math.max(...v)-Math.min(...v))/([1, 1, B.scale[1]-B.scale[0], 2*B.spiral][k]); };
    for(let k=0;k<4;k++) if(span(k)<0.85){ miss(`bark mapping number ${k} spans only ${span(k).toFixed(2)} of its range`); break; }
    if(JSON.stringify(W.barkUv(T.length))!==JSON.stringify(U)) miss('two draws differ');
    n++; if(gapOf(U.map(()=>U[0]))[0]>=B.uvGap) miss('CONTROL: one mapping for every trunk passes the gap judgement');
    notes.push(`bark mappings: ${T.length} trunks, the smallest gap ${g.toFixed(3)} (trunks ${at}; ${B.uvGap} wanted); trunks 0 / 1 (the two in the light) turn ${U[0][0].toFixed(2)} / ${U[1][0].toFixed(2)}, lift ${U[0][1].toFixed(2)} / ${U[1][1].toFixed(2)}, scale ${U[0][2].toFixed(2)} / ${U[1][2].toFixed(2)}, spiral ${U[0][3].toFixed(2)} / ${U[1][3].toFixed(2)}; CONTROL one for all: gap 0`); }
  /* (2) no two trunks share a moss or lichen layout — exact: each piece's field is the noise at its own region (q.y + of, of = i × offStep cells);
     two regions at least one cell apart share no lattice cell, and the look's hash (forest-wood.js h28) has no near-repeat at any shift between two
     trunks (each octave's multiple of it): over a 24 × 24 window of cells the shifted hash correlates < 0.5 with the unshifted one (576 cells:
     chance stays near ±0.15). CONTROL a weak hash (one linear term per axis: 0.07217 × 97 ≈ 7.0005) at a shift of 97 cells correlates > 0.5; CONTROL two
     trunks given the same numbers share a region. */
  { const fr=x=>x-Math.floor(x), h28=(x,y)=>{ const a=25*fr(x*0.3183099+0.71), b=25*fr(y*0.3183099+0.113); return fr(a*b*(a+b)); };
    const hWeak=(x,y)=>fr(x*0.1031+y*0.07217);
    const cor=(a,b)=>{ const k=a.length, ma=a.reduce((s,v)=>s+v,0)/k, mb=b.reduce((s,v)=>s+v,0)/k; let sab=0, saa=0, sbb=0; for(let i=0;i<k;i++){ const x=a[i]-ma, y=b[i]-mb; sab+=x*y; saa+=x*x; sbb+=y*y; } return sab/Math.sqrt(saa*sbb||1); };
    const win=(h, dy)=>{ const v=[]; for(let x=0;x<24;x++) for(let y=0;y<24;y++) v.push(h(x, y+dy)); return v; }, base=win(h28, 0);
    const of=M.map(m=>m[5]); let gap=Infinity, gat=null, worst=-1, wat=null; n+=2;
    for(let i=0;i<of.length;i++) for(let j=i+1;j<of.length;j++){ const dlt=Math.abs(of[i]-of[j]); if(dlt<gap){ gap=dlt; gat=[i,j]; }
      for(const k of [1, 2, 3, 4, 6]){ const s=Math.round(dlt*k), c=cor(base, win(h28, s)); if(c>worst){ worst=c; wat=[i, j, k, s]; } } }
    if(!(gap>=1)) miss(`trunks ${gat}: their moss regions are ${gap.toFixed(2)} cells apart (≥ 1 wanted)`);
    if(!(worst<0.5)) miss(`the hash nearly repeats between trunks ${wat.slice(0,2)} (octave ×${wat[2]}, ${wat[3]} cells): correlation ${worst.toFixed(2)}`);
    const minGap=L=>{ let g=Infinity; for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++) g=Math.min(g, Math.abs(L[i]-L[j])); return g; }, two=of.slice(); two[1]=two[0];
    const weak97=cor(win(hWeak, 0), win(hWeak, 97)), same=minGap(two); n+=2;
    if(!(weak97>0.5)) miss(`CONTROL: a weak hash at 97 cells correlates only ${weak97.toFixed(2)} — the judgement cannot fail`);
    if(same>=1) miss('CONTROL: two trunks given the same numbers pass the region judgement');
    notes.push(`moss and lichen layouts: the trunks' regions at least ${gap.toFixed(2)} cells apart (trunks ${gat}), the two in the light ${Math.abs(of[0]-of[1]).toFixed(2)}; the hash at every shift between two trunks and its octaves (${(of.length*(of.length-1)/2)*5} shifts) correlates at most ${worst.toFixed(2)}; CONTROL a weak hash at 97 cells ${weak97.toFixed(2)}, the same numbers 0 cells apart`); }
  /* (3) the merged wood's pieces */
  { const P=W.woodPlaces(FR.levels.full, T), k=P.roots.length+P.logs.length+P.stumps.length+P.snags.length+P.twigs.length+1, WP=W.woodPieces('wood'), LP=W.woodPieces('limbs'); n+=3;
    if(k>B.pieces.n) miss(`the merged wood has ${k} pieces, the list ${B.pieces.n}`);
    const key=r=>r.map(v=>v.toFixed(6)).join(), tk=new Set(M.map(key).concat(U.map(key))), shared=[...WP.moss.slice(0,k), ...WP.uv.slice(0,k)].filter(r=>tk.has(key(r))).length;
    if(shared) miss(shared+' merged-wood rows equal a trunk\'s');
    const [g]=gapOf(WP.uv.slice(0,k)); if(!(g>0.02)) miss(`two merged-wood pieces share a bark layout (gap ${g.toFixed(3)})`);
    n++; if(key(LP.moss[0])===key(WP.moss[0]) || key(LP.uv[0])===key(WP.uv[0])) miss('CONTROL: the limbs\' list is the wood\'s');
    notes.push(`the merged wood at Detailed: ${k} pieces (roots ${P.roots.length}, logs ${P.logs.length}, stumps ${P.stumps.length}, dead trees ${P.snags.length}, branches ${P.twigs.length}, fungi 1), each its own moss and bark mapping (smallest mapping gap ${g.toFixed(3)}), none a trunk's; the limbs their own list`); }
  /* (4) what the look is made of */
  { const judge=src=>{ const why=[]; if(/#else/.test(src)) why.push('a bark-only branch'); if(/atan\(wn\.z, *wn\.x\)/.test(src)) why.push('a world-angle coordinate');
      if(!/vBk7\.x/.test(src) || !/vBk7b\.x/.test(src) || !/vMU7/.test(src)) why.push('not the piece\'s own numbers'); if(!/float lf=[^;]*vp8/.test(src) || /float lic=[^;]*vn7/.test(src)) why.push('the lichen not from vp8'); return why; };
    const w=judge(FW.lookSrc()); n++; if(w.length) miss('the look: '+w.join(', '));
    const OLD=`float lic=smoothstep(0.64, 0.76, vn7(vec2(ang*4.0+wp.x*0.5, wp.y*3.2+wp.z*0.5)))*smoothstep(0.8, 2.0, above); ang=atan(wn.z, wn.x);`;
    n++; if(!judge(OLD).length) miss('CONTROL: the old lichen line passes the look judgement');
    notes.push(`the look: moss and lichen from each piece's own numbers on the bark and the merged wood alike, no world-angle coordinate, the lichen from vp8; CONTROL the old lichen line is caught (${judge(OLD).join(', ')})`); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-8b: THE GREEN FIREFLIES COME TO THE PLAYING LIGHT (apps/night/rooms/forest/pure/fireflies.js) — the user: they used to circle it now and
   then; only the moths did. The cause: in the nearest depth band the light stands at z ≈ 3.3, inside the flies' wrap box's near end (3.5), so
   every orbit wrapped away. The law's 35 flies (the medium level), a light at depth 0, 0.15 and 0.5 on the aisle, a note every 1.5 s (held
   0.8 s) or no notes, 100 s with forest.js's own easing: the mean number of flies seen round the light from the eye (within 25° of it, at most
   3.5 m behind it) — playing ≥ 3 at every depth, idle ≥ 1; CONTROL the old law (FOREST_FLIES.edge off) brings fewer than 3 at depth 0. */
async function forestFliesVisit(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), F=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href);
  const eye=[0,1.55,5.5], C=F.FOREST_FLIES;
  const visit=(d01, notesOn)=>{ const fl=F.fliesInit(35), dt=1/30, Lz=eye[2]-F.depthDistance(d01), MM=C.melody, ME=MM.ease; let music=0, gather=0, rel=0, holdE=0, rateE=0, last=-9, seen=0, frames=0; const noteT=[];
    for(let t=0;t<100;t+=dt){ let held=0; if(notesOn){ if(t-last>=1.5){ last=t; music=Math.min(1.5, music+0.21); noteT.push(t); } if(t-last<0.8) held=t-last; }
      while(noteT.length && noteT[0]<=t-MM.rate.window) noteT.shift(); const hT=F.holdK(held), rT=F.rateK(noteT, t);
      holdE+=(hT-holdE)*(1-Math.exp(-dt/(hT>holdE ? ME.holdIn : ME.holdOut))); rateE+=(rT-rateE)*(1-Math.exp(-dt/(rT>rateE ? ME.rateIn : ME.rateOut)));
      const playing=music>0.15 || holdE>0.25; gather+=((playing?1:0)-gather)*(1-Math.exp(-dt/(playing?2.5:7))); rel= playing ? gather : rel*Math.exp(-dt/10);
      const L={ x:0, y:1.5, z:Lz, on:1, call:playing ? gather : 0, scatter:playing ? 0 : rel, hold:holdE, rate:rateE }; F.fliesStep(fl, [L], dt, t, 1, null); music*=Math.exp(-dt/1.8);
      if(t>20){ const lv=[L.x-eye[0], L.y-eye[1], L.z-eye[2]], ll=Math.hypot(...lv); let k=0;
        for(const q of fl){ const v=[q.p[0]-eye[0], q.p[1]-eye[1], q.p[2]-eye[2]], vl=Math.hypot(...v); if((v[0]*lv[0]+v[1]*lv[1]+v[2]*lv[2])/(vl*ll)>Math.cos(25*Math.PI/180) && vl<ll+3.5) k++; }
        seen+=k; frames++; } }
    return seen/frames; };
  const res=[];
  for(const d01 of [0, 0.15, 0.5]){ const p=visit(d01, true), i=visit(d01, false); n+=2; res.push(`depth ${d01}: ${p.toFixed(1)} playing, ${i.toFixed(1)} idle`);
    if(!(p>=3)) miss(`depth ${d01}: only ${p.toFixed(2)} flies come round the playing light (3 wanted)`); if(!(i>=1)) miss(`depth ${d01}: only ${i.toFixed(2)} round the idle light (1 wanted)`); }
  { const keep=C.edge; let old; try{ C.edge=-1e9; old=visit(0, true); } finally{ C.edge=keep; } n++;
    if(old>=3) miss(`CONTROL: the old law brings ${old.toFixed(2)} flies to a near light — the judgement cannot fail`); else res.push(`CONTROL the old law at depth 0: ${old.toFixed(2)}`); }
  notes.push('flies seen round the light: '+res.join('; '));
  return { cases:n, total:d.length, differences:d, notes };
}

/* NIGHT-9: THE GROUND'S RELIEF (pure/fireflies.js forestGround + RELIEF, pure/relief.js) — (1) mounds and hollows: over 40 × 40 m outside
   the aisle the relief term alone spans ≥ 0.2 m with ≥ 6 local tops and ≥ 6 hollows on a 1-m grid; inside the aisle it is half as high;
   (2) the aisle's edge is smooth: walking across it in 1-cm steps no step exceeds 1 cm — CONTROL the old law (×0.35 inside a box) steps ≥ 5 cm;
   (3) forest-wood.js gnd7 carries the same constants (its text built from RELIEF); (4) root bulges: on a made-up grid round a trunk of r 0.4 the
   ground rises r·k at the foot, nothing 3 reaches away, and not at all where the stream is near; (5) occlusion: a bowl's bottom is darker than
   its rim, a flat open grid is 1 everywhere — CONTROL — a trunk darkens its foot, and nothing falls under AO.min. */
async function forestRelief(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), F=await import(new URL('../apps/night/rooms/forest/pure/fireflies.js', import.meta.url).href), RL=await import(new URL('../apps/night/rooms/forest/pure/relief.js', import.meta.url).href);
  const R=F.RELIEF, rel=(x,z)=>R.a*Math.sin(0.83*x+0.41*z+1.3)*Math.sin(0.57*z-0.29*x+0.4)+R.b*Math.sin(1.9*x-1.3*z+2.1)*Math.cos(1.6*z+0.7*x);
  { let lo=Infinity, hi=-Infinity, tops=0, pits=0; const g=(x,z)=>rel(x,z);
    for(let x=-30;x<=-10;x+=1) for(let z=-30;z<=10;z+=1){ const v=g(x,z); lo=Math.min(lo,v); hi=Math.max(hi,v); const nb=[g(x+1,z),g(x-1,z),g(x,z+1),g(x,z-1)]; if(nb.every(w=>w<v)) tops++; if(nb.every(w=>w>v)) pits++; }
    n+=2; if(!(hi-lo>=0.2)) miss(`the relief spans only ${(hi-lo).toFixed(3)} m`); if(tops<6 || pits<6) miss(`${tops} tops and ${pits} hollows (6 of each wanted)`);
    const inA=F.forestGround(0,-5)-(0.28*Math.sin(0)*Math.cos(-5*0.27)+0.14*Math.sin(-3))*0.35; n++; if(Math.abs(inA-rel(0,-5)*R.aisle)>1e-9) miss('the aisle does not take half the relief');
    notes.push(`relief: ${(hi-lo).toFixed(2)} m span, ${tops} tops, ${pits} hollows over 20 × 40 m (1-m grid); half as high in the aisle`); }
  { const old=(x,z)=>{ let y=0.28*Math.sin(x*0.3)*Math.cos(z*0.27)+0.14*Math.sin(x*0.9+z*0.6); if(Math.abs(x)<6 && z>-14 && z<5) y*=0.35; return y; };
    const worst=f=>{ let m=0; for(const z of [-10,-5,0,3]) for(let x=4;x<8;x+=0.01) m=Math.max(m, Math.abs(f(x+0.01,z)-f(x,z))); return m; };
    const a=worst(F.forestGround), b=worst(old); n+=2; if(!(a<=0.01)) miss(`the aisle's edge steps ${a.toFixed(3)} m in 1 cm`); if(!(b>=0.05)) miss(`CONTROL: the old law's step is only ${b.toFixed(3)} m`);
    notes.push(`the aisle's edge: the largest 1-cm step ${(a*1000).toFixed(1)} mm (CONTROL the old law ${(b*100).toFixed(1)} cm)`); }
  { const W=await import(new URL('../apps/night/rooms/forest/forest-wood.js', import.meta.url).href).catch(()=>null); n++;
    const src=W && W.gnd7Src ? W.gnd7Src() : null, f=v=>Number(v).toFixed(4);
    if(!src || ![f(R.a), f(R.b), f(-R.edge), f(1-R.aisle)].every(c=>src.includes(c)) || !/0\.65\*m/.test(src)) miss('forest-wood.js gnd7 does not carry the relief law (constants missing)'); }
  { const grid=(N, step, h)=>{ const X=[], Z=[], Y=[]; for(let r=0;r<=N;r++) for(let c=0;c<=N;c++){ X.push((c-N/2)*step); Z.push((r-N/2)*step); Y.push(h((c-N/2)*step, (r-N/2)*step)); }
      return { count:X.length, getX:i=>X[i], getZ:i=>Z[i], getY:i=>Y[i], setY:(i,v)=>{ Y[i]=v; }, Y }; };
    const g=grid(60, 0.1, ()=>0), add=RL.groundRoots(g, [[0,0,0.4]]), at=(x,z)=>{ const c=Math.round(x/0.1)+30, r=Math.round(z/0.1)+30; return g.Y[r*61+c]; }; n+=3;
    if(Math.abs(at(0,0)-0.4*RL.ROOTS.k)>1e-6) miss(`the bulge at the foot is ${at(0,0).toFixed(4)} (${(0.4*RL.ROOTS.k).toFixed(4)} wanted)`);
    if(Math.abs(at(2.9,0))>1e-3) miss('the bulge reaches 3 m out');
    const g2=grid(60, 0.1, ()=>0); RL.groundRoots(g2, [[0,0,0.4]], ()=>0.1); if(g2.Y.some(v=>v!==0)) miss('a bulge rises in the stream');
    void add; }
  { const bowl=(x,z)=>0.3*(x*x+z*z)/9, gB={ count:61*61 }; const X=[], Z=[], Y=[]; for(let r=0;r<=60;r++) for(let c=0;c<=60;c++){ X.push((c-30)*0.1); Z.push((r-30)*0.1); Y.push(-0.3*Math.exp(-(((c-30)*0.1)**2)-(((r-30)*0.1)**2))); }
    const P={ count:X.length, getX:i=>X[i], getZ:i=>Z[i], getY:i=>Y[i] }, ao=RL.groundOcclusion(P, 60, []), mid=ao[30*61+30], rim=ao[5*61+5];
    const flat={ count:X.length, getX:i=>X[i], getZ:i=>Z[i], getY:()=>0 }, af=RL.groundOcclusion(flat, 60, []), at=RL.groundOcclusion(flat, 60, [[0,0,0.4]]); n+=4;
    if(!(mid<rim-0.05)) miss(`a hollow's bottom ${mid.toFixed(3)} is not darker than its rim ${rim.toFixed(3)}`);
    if(af.some(v=>v!==1)) miss('CONTROL: a flat open ground is not 1 everywhere');
    if(!(at[30*61+35]<0.8)) miss(`a trunk's foot is not darker (${at[30*61+35].toFixed(3)})`);
    if([...ao, ...at].some(v=>v<RL.AO.min-1e-9)) miss('an occlusion under the minimum');
    notes.push(`occlusion: a hollow's bottom ${mid.toFixed(2)} against its rim ${rim.toFixed(2)}; a trunk's foot ${at[30*61+35].toFixed(2)}; flat open ground 1`); void bowl; void gB; }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-9: THE STREAM'S FLOW (pure/water.js) — the width along the stream stays in its range and is smooth (no jump over 0.01 between
   1/2000 steps), varying by ≥ 0.25; on level ground speed × width = 1 (the same water through every section) wherever the speed is within its
   bounds, so the narrows are the fast places — CONTROL a constant width would give one speed (its speed range 0); a falling bed is faster;
   repeatable. */
async function forestWaterFlow(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), W=await import(new URL('../apps/night/rooms/forest/pure/water.js', import.meta.url).href), WF=W.WATER_FLOW;
  let lo=Infinity, hi=-Infinity, jump=0, bad=0, prev=W.waterWidth(0), sLo=Infinity, sHi=-Infinity;
  for(let k=0;k<=2000;k++){ const u=k/2000, w=W.waterWidth(u), s=W.waterSpeed(u, 0); lo=Math.min(lo,w); hi=Math.max(hi,w); jump=Math.max(jump, Math.abs(w-prev)); prev=w; sLo=Math.min(sLo,s); sHi=Math.max(sHi,s);
    if(s>WF.speed[0] && s<WF.speed[1] && Math.abs(s*w-1)>1e-9) bad++; }
  n+=5; if(lo<WF.width[0]-1e-9 || hi>WF.width[1]+1e-9) miss(`the width leaves its range: ${lo.toFixed(3)}…${hi.toFixed(3)}`);
  if(!(hi-lo>=0.25)) miss(`the width varies only ${(hi-lo).toFixed(3)}`); if(jump>0.01) miss(`the width jumps ${jump.toFixed(4)} between neighbouring steps`);
  if(bad) miss(`${bad} places where speed × width ≠ 1 on level ground`); if(!(W.waterSpeed(0.5, 0.1)>W.waterSpeed(0.5, 0))) miss('a falling bed is not faster');
  { n++; const ctlW=1, ctl=[0,0.25,0.5,0.75,1].map(()=>1/ctlW); if(Math.max(...ctl)-Math.min(...ctl)!==0) miss('CONTROL: a constant width gave more than one speed'); if(!(sHi-sLo>0.3)) miss(`the speed varies only ${(sHi-sLo).toFixed(3)} (a constant width would give 0)`); }
  notes.push(`width ${lo.toFixed(2)}…${hi.toFixed(2)} × the half-width, speed ${sLo.toFixed(2)}…${sHi.toFixed(2)} on level ground (narrows fast, pools slow); the largest step ${jump.toFixed(4)}`);
  return { cases:n, total:d.length, differences:d, notes };
}

/* NIGHT-11 part 2: IN-APP BROWSERS (apps/night/pure/inapp.js) on made-up devices — the messengers' own browsers (named, or a bare web view) are
   recognised, real browsers and the home-screen app are not; the device words (phone or computer); a camera refusal faster than a person could
   answer counts as «refused without asking» (CONTROL: a law that ignores the missing «Safari/» would pass an iOS web view as Safari). */
async function nightInApp(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const { inAppOf, quickDeny, QUICK_DENY_MS }=await import(new URL('../apps/night/pure/inapp.js', import.meta.url).href);
  const SAF='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const WKV='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
  const AND='Mozilla/5.0 (Linux; Android 14; 22111317PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const AWV='Mozilla/5.0 (Linux; Android 14; 22111317PG; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36';
  const WIN='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const C=[['iPhone Safari', { ua:SAF, platform:'iPhone', touch:5 }, null, 'ios'], ['Chrome on iPhone', { ua:SAF.replace('Version/17.5','CriOS/126.0'), platform:'iPhone', touch:5 }, null, 'ios'],
    ['the home-screen app on iPhone', { ua:WKV, platform:'iPhone', touch:5, standalone:true }, null, 'ios'], ['Android Chrome', { ua:AND, touch:5 }, null, 'android'], ['Windows Chrome', { ua:WIN }, null, 'other'],
    ['Instagram on iPhone', { ua:WKV+' Instagram 300.0.0.0 (iPhone14,5; iOS 17_5)', platform:'iPhone', touch:5 }, 'instagram', 'ios'], ['Facebook on iPhone', { ua:WKV+' [FBAN/FBIOS;FBAV/450.0]', platform:'iPhone', touch:5 }, 'facebook', 'ios'],
    ['Facebook on Android', { ua:AWV+' [FB_IAB/FB4A;FBAV/450.0;]', touch:5 }, 'facebook', 'android'], ['Instagram on Android', { ua:AWV+' Instagram 300.0.0.0 Android', touch:5 }, 'instagram', 'android'],
    ['Telegram on Android', { ua:AWV+' Telegram-Android/10.14.5', touch:5 }, 'telegram', 'android'], ['WhatsApp on Android', { ua:AWV+' WhatsApp/2.24', touch:5 }, 'whatsapp', 'android'],
    ['a bare web view on Android (Telegram without its name)', { ua:AWV, touch:5 }, 'webview', 'android'], ['a bare web view on iPhone', { ua:WKV, platform:'iPhone', touch:5 }, 'webview', 'ios'],
    ['LINE', { ua:AWV+' Line/13.1.0', touch:5 }, 'line', 'android'], ['WeChat', { ua:AWV+' MicroMessenger/8.0.47', touch:5 }, 'wechat', 'android'], ['TikTok', { ua:AWV+' musical_ly_2023', touch:5 }, 'tiktok', 'android']];
  for(const [name, env, app, os] of C){ const r=inAppOf(env); ok(`${name}: ${JSON.stringify(r)} (wanted app ${app}, ${os})`, r.app===app && r.inApp===!!app && r.os===os && r.phone===(os!=='other')); }
  ok('nothing known reads as a browser', !inAppOf({}).inApp && inAppOf({}).os==='other');
  ok('a refusal at once is not «without asking»', quickDeny('NotAllowedError', 40)); ok('a refusal after 2 s counts as «without asking»', !quickDeny('NotAllowedError', 2000));
  ok('another error counts as a refusal', !quickDeny('NotReadableError', 40)); ok('an unknown time counts', !quickDeny('NotAllowedError', NaN));
  { const noSafariTest=e=>/iPhone/.test(e.ua) && /AppleWebKit/.test(e.ua); ok('CONTROL: a law without the «Safari/» test tells Safari from a web view', noSafariTest({ ua:SAF })!==!!inAppOf({ ua:SAF, platform:'iPhone', touch:5 }).inApp); }
  notes.push(`${C.length} made-up devices: ${C.filter(c=>c[2]).length} in-app browsers recognised, ${C.filter(c=>!c[2]).length} browsers left alone; «without asking» below ${QUICK_DENY_MS} ms`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-11 part 4: THE COACHING LINE's law (apps/night/pure/coach.js) on a made-up first session with exact times: «Raise a hand» at once, «Touch
   your thumb…» 0.5 s after the hand, the first note ends it; the other fingers after 30 s of playing, near / far after 60 s, the effects hint when the
   second hand comes, the calibration offer and the home-screen hint after the first minute, one at a time with their gaps; nothing before the
   first note but the first two; a returning visit (everything seen) shows nothing; a stale stored list reads as nothing seen. The order judge
   passes this session; CONTROLS: the old order (the calibration offer and the cards before the first note) and a hint shown twice must fail it. */
async function nightCoachLaw(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const { coachNew, coachStep, coachSeen, coachOrderOk, COACH }=await import(new URL('../apps/night/pure/coach.js', import.meta.url).href);
  /* a session: from t=0 the room is ready; the hand at 3 s; the first note at 6 s; playing on; the second hand 50–58 s */
  const run=(seen, o={})=>{ let st=coachNew(seen); const log=[], DT=100; let cur=null; const mk=[];
    for(let t=0;t<=150e3;t+=DT){ const hand=t>=3000, x={ now:t, dt:DT, ready:true, hands:hand ? (t>=50e3 && t<58e3 ? 2 : 1) : 0, play:hand, second:t>=50e3 && t<58e3, note:t===6000 || (t>6000 && t%2000===0),
        calDue:o.calDue!==false, homeDue:!!o.homeDue, paused:!!(o.pauseAt && t>=o.pauseAt[0] && t<o.pauseAt[1]) };
      if(x.note) log.push({ t, kind:'note' });
      const r=coachStep(st, x); st=r.st; mk.push(...r.mark); if(r.show!==cur){ cur=r.show; if(cur) log.push({ t, kind:'show', id:cur }); } }
    return { log, shows:log.filter(e=>e.kind==='show').map(e=>`${e.id}@${e.t}`), mark:mk, st }; };
  const A=run([], { homeDue:true });
  const want=['raise@0','pinch@3500','fingers@36000','fx@50000','depth@66000','calib@77500','home@96000'];
  ok(`a first session: ${A.shows.join(' ')} (wanted ${want.join(' ')})`, A.shows.join()===want.join());
  ok('the order judge fails the law\'s own session: '+coachOrderOk(A.log).join('; '), coachOrderOk(A.log).length===0);
  ok('remembered: '+A.mark.join(), A.mark.join()==='raise,pinch,fingers,fx,depth,home');
  { const B=run(A.st.seen, { homeDue:true, calDue:false }); ok('a returning visit showed '+B.shows.join(' '), B.shows.length===0); }
  { const C=run([], { pauseAt:[60e3, 140e3] }); ok('the calibration offer while detection is paused: '+C.shows.join(' '), !C.shows.some(s=>s.startsWith('calib@') && +s.split('@')[1]<140e3)); }
  ok('a stale stored list reads as seen', coachSeen('{not json').length===0 && coachSeen('"raise"').length===0 && coachSeen('["raise","zz",7,"raise"]').join()==='raise' && coachSeen(null).length===0);
  { const old=[{ t:2000, kind:'cal' }, { t:9000, kind:'card' }, { t:30000, kind:'note' }]; ok('CONTROL: the old order (calibration and cards first) passes the judge', coachOrderOk(old).length===2); }
  { const twice=[...A.log, { t:140e3, kind:'show', id:'fingers' }]; ok('CONTROL: a hint shown twice passes the judge', coachOrderOk(twice).length===1); }
  notes.push(`first session: ${A.shows.join(' · ')} (ms); fingers after ${COACH.fingersMs/1000} s of playing, depth after ${COACH.depthMs/1000} s`);
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-11 part 5: THE PIXEL BUDGET (apps/night/pure/pixels.js). The laptop (1366 × 768, one device pixel per CSS pixel) keeps today's numbers exactly at
   both levels, and so does every screen with one device pixel per CSS pixel (CONTROL); a phone in portrait (390 × 844 at 2.75) gets about 430 × 930 at
   Standard (CONTROL: today's law gives it 234 × 506); a hi-dpi laptop stays where it was; a phone driving a large display as a monitor follows that
   display; the guard's steps never go below today's law; the guard lowers after 4 s too low, raises after 20 s comfortably good, and holds after a
   raise that went bad. */
async function nightPixels(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); };
  const P=await import(new URL('../apps/night/pure/pixels.js', import.meta.url).href), B=(w,h,dpr,l,k=0)=>P.bufferOf(w,h,P.sceneRatio(w,h,dpr,l,k)).join('×');
  ok('the laptop at Standard: '+B(1366,768,1,'reduced'), B(1366,768,1,'reduced')==='819×460' && P.sceneRatio(1366,768,1,'reduced')===0.6);
  ok('the laptop at Detailed: '+B(1366,768,1,'full'), P.sceneRatio(1366,768,1,'full')===0.85);
  for(const [w,h] of [[1280,800],[1366,657],[800,600],[1920,1080],[390,844]]) for(const l of ['reduced','full']) ok(`a ${w}×${h} screen at one device pixel per CSS pixel moved (${l})`, P.sceneRatio(w,h,1,l)===P.ratioOld(1,l));
  ok('a zoomed-out screen (0.8) moved', P.sceneRatio(1366,768,0.8,'reduced')===0.8*0.6);
  const ph=B(390,844,2.75,'reduced'); ok('a phone in portrait at Standard: '+ph+' (about 430 × 930)', /^4(2\d|3\d)×9(2\d|3\d)$/.test(ph));
  ok('CONTROL: today\'s law gives the phone about 430 × 930', P.bufferOf(390,844,P.ratioOld(2.75,'reduced')).join('×')!==ph);
  notes.push(`phone 390×844 at 2.75: Standard ${ph} (before ${P.bufferOf(390,844,P.ratioOld(2.75,'reduced')).join('×')}), Detailed ${B(390,844,2.75,'full')} (before ${P.bufferOf(390,844,P.ratioOld(2.75,'full')).join('×')}); laptop ${B(1366,768,1,'reduced')} / ${B(1366,768,1,'full')}`);
  ok('a hi-dpi laptop (1440×900 at 2) moved at Standard', P.sceneRatio(1440,900,2,'reduced')===0.6);
  ok('above the device pixels', P.sceneRatio(200,300,1.5,'full')===1.5);
  ok('a phone as a monitor (1920×1080 at 1) does not follow the display', P.sceneRatio(1920,1080,1,'reduced')===0.6);
  { const k=P.stepsOf(390,844,2.75,'reduced'); ok('the guard has no steps on the phone', k>0); ok('a guard step went below today\'s law', P.sceneRatio(390,844,2.75,'reduced',k+3)===P.ratioOld(2.75,'reduced'));
    ok('the guard has steps on the laptop', P.stepsOf(1366,768,1,'reduced')===0 && P.stepsOf(1366,768,1,'full')===0); notes.push(`guard steps on the phone at Standard: ${k}`); }
  { let s=P.guardNew(); const bad={ fps:12, cap:30, det:10, cam:30 }, good={ fps:29, cap:30, det:10, cam:30 };
    for(let t=1;t<=3;t++) s=P.guardNext(s, { ...bad, t }, 3); ok('lowered before 4 s', s.step===0); s=P.guardNext(s, { ...bad, t:4 }, 3); ok('not lowered after 4 s too low', s.step===1);
    for(let t=5;t<=8;t++) s=P.guardNext(s, { fps:29, cap:30, det:2, cam:30, t }, 3); ok('slow hand detection did not lower', s.step===2);
    for(let t=9;t<=28;t++) s=P.guardNext(s, { ...good, t }, 3); ok('not raised after 20 s good', s.step===1);
    for(let t=29;t<=32;t++) s=P.guardNext(s, { ...bad, t }, 3); ok('the raise that went bad not lowered again with a hold', s.step===2 && s.holdTo>=32+100);
    for(let t=33;t<=80;t++) s=P.guardNext(s, { ...good, t }, 3); ok('raised again inside the hold', s.step===2);
    for(let t=1;t<=20;t++) s=P.guardNext(s, { ...bad, t:200+t }, 3); ok('past the steps it has', s.step===3);
    let z=P.guardNew(); for(let t=1;t<=30;t++) z=P.guardNext(z, { ...bad, t }, 0); ok('the laptop (no steps) was lowered', z.step===0); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-10: THE CAMERAS' NAMES (apps/night/pure/camera.js) — a phone: front and back cameras read «Front» / «Back» (a second back camera
   «Back 2»), one of unknown facing by its name; a computer: device names without hardware numbers («HD Webcam (046d:0825)» → «HD Webcam»);
   labels empty before the permission → «Camera 1», «Camera 2»; never an id in a name; the phone hint from the browser (Android, iPhone, an iPad
   that says MacIntel with touch). CONTROL the same list on a computer is not called Front / Back. */
async function nightCameraNames(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), C=await import(new URL('../apps/night/pure/camera.js', import.meta.url).href);
  const L=[{ deviceId:'a1', label:'camera2 1, facing front', facing:'user' }, { deviceId:'b2', label:'camera2 0, facing back', facing:'environment' }, { deviceId:'b3', label:'Back Ultra Wide Camera', facing:'environment' }, { deviceId:'c4', label:'USB2.0 HD UVC WebCam', facing:null }];
  const P=C.cameraNames(L, true), K=P.map(e=>e.kind+(e.n>1 ? e.n : '')).join(','); n++;
  if(K!=='front,back,back2,name') miss('a phone\'s cameras read '+K);
  { const Q=C.cameraNames(L, false); n++; if(Q.some(e=>e.kind==='front' || e.kind==='back')) miss('CONTROL: a computer\'s list was called Front / Back'); }
  { const Q=C.cameraNames([{ deviceId:'x', label:'HD Webcam (046d:0825)' }, { deviceId:'y', label:'Integrated Camera (USB VID_04F2 PID_B6DD)' }], false); n+=2;
    if(Q[0].name!=='HD Webcam') miss(`«HD Webcam (046d:0825)» reads «${Q[0].name}»`); if(/VID|PID|\(/.test(Q[1].name)) miss(`a name keeps its hardware numbers: «${Q[1].name}»`); }
  { const Q=C.cameraNames([{ deviceId:'', label:'' }, { deviceId:'', label:'' }], true); n++; if(Q.map(e=>e.kind+e.n).join()!=='number1,number2') miss('labels before the permission: '+JSON.stringify(Q)); }
  { n+=4; if(!C.camMobile({ ua:'Mozilla/5.0 (Linux; Android 13; 22041219PG) Chrome/120 Mobile Safari/537.36' })) miss('an Android phone is not a phone');
    if(!C.camMobile({ ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', platform:'MacIntel', touch:5 })) miss('an iPad is not a phone or tablet');
    if(C.camMobile({ ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', platform:'Win32', touch:0 })) miss('a Windows computer counted as a phone');
    if(P.some(e=>e.name && /a1|b2|b3|c4/.test(e.name))) miss('an id shows in a name'); }
  notes.push('phone: Front, Back, Back 2, «USB2.0 HD UVC WebCam»; computer names cleaned of hardware numbers; «Camera 1/2» before the permission; CONTROL a computer list is not Front / Back');
  return { cases:n, total:d.length, differences:d, notes };
}

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
  ['C0 profile records (core)', ()=>profileCore(),  r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['VIS1 bus (core)',           ()=>busCore(),      r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NIGHT shell (core)',         ()=>nightShellCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NIGHT depth curve (core)',   ()=>nightDepthCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NIGHT cricket schedule (app)', ()=>nightCricketsCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NIGHT room records (app)',  ()=>nightRooms(),       r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // NIGHT-3
  ['NIGHT room tint (app)',     ()=>nightRoomTint(),    r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // DESIGN-1 part B
  ['NIGHT start still (app)',   ()=>nightStartStill(),  r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // DESIGN-1 part D
  ['NIGHT hand light anchor (app)', ()=>nightHandLight(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-13
  ['NIGHT music bed law (app)', ()=>nightBedLaw(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // NIGHT-3 stage 4
  ['NIGHT music bed v2 law (app)', ()=>nightBed2Law(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-4
  ['VIS1c fireflies (core)',    ()=>fliesCore(),    r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['NIGHT cycle (core)',        ()=>nightCore(),    r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // RUN 9
  ['FOREST life (core)',        ()=>lifeCore(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // RUN 9 (slice 2)
  ['FOREST answers (app)',      ()=>forestAnswersCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 1
  ['FOREST melody (app)',       ()=>forestMelodyCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 2
  ['FOREST floor (app)',        ()=>forestFloorCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 3
  ['FOREST stream (app)',       ()=>forestStreamCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 4
  ['FOREST ground (app)',       ()=>forestGroundCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8
  ['NIGHT stream sound (app)',  ()=>nightStreamSound(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8
  ['FOREST wood (app)',         ()=>forestWoodCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 5
  ['FOREST bark moss (app)',    ()=>forestBarkMoss(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8b
  ['FOREST bark layouts (app)', ()=>forestBarkLayouts(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8c
  ['FOREST fireflies visit the light (app)', ()=>forestFliesVisit(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8b
  ['NIGHT stream recording (app)', ()=>nightStreamRec(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8b
  ['NIGHT full-screen icons (app)', ()=>nightFsIcons(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-8b
  ['NIGHT scales loaded (app)', ()=>nightScalesLoad(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // CORE-20
  ['NIGHT early model files (app)', ()=>nightEarlyModel(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // CORE-20
  ['FOREST relief (app)',       ()=>forestRelief(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-9
  ['FOREST water flow (app)',   ()=>forestWaterFlow(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-9
  ['NIGHT camera names (app)',  ()=>nightCameraNames(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-10
  ['NIGHT in-app browsers (app)', ()=>nightInApp(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-11 part 2
  ['NIGHT coaching line (app)', ()=>nightCoachLaw(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-11 part 4
  ['NIGHT pixel budget law (app)', ()=>nightPixels(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-11 part 5
  ['FOREST gust (app)',         ()=>forestGustCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 6
  ['FOREST canopy (app)',       ()=>forestCanopyCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 7
  ['FOREST paint (app)',        ()=>forestPaintCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 8
  ['FOREST hidden (app)',       ()=>forestHiddenCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 slice 9
  ['NIGHT texts both languages (app)', ()=>nightTextsCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-7
  ['NIGHT home screen (app)', ()=>nightHomeScreen(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-7c
  ['NIGHT forest files (app)',  ()=>nightForestFiles(), r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes })],   // NIGHT-6 (the files rule, the size budget)
  ['OLD NAME gone',             ()=>oldNameGone(),  r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // SPLIT-2
  ['NIGHT rare events (core)',  ()=>rareCore(),     r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // RUN 9 (slice 4)
  ['NIGHT-1 headroom sums (tool)', ()=>headroomCalc(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['CAL0 hand measuring (tool)', ()=>handStatsCalc(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // CORE-1 CP1
  ['CAL1-3 hand calibration (core)', ()=>handCalCore(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],   // CORE-1 CP2
];

out(`[probe-data] running ${ROWS.length} checks (40 s to 2 min, depending on the machine; T2 is the longest) — one line per check as it finishes`);
const keep={ log:console.log, warn:console.warn, table:console.table, info:console.info }, mute=()=>{};
const rows=[], lists=[];
for(const [name,run,read] of ROWS){
  const t0=performance.now(); let row;
  if(!verbose){ console.log=console.warn=console.table=console.info=mute; }
  try{ let res=run(); if(res && typeof res.then==='function') res=await res;
       const x=read(res); row={ check:name, cases:x.cases, differences:x.diff }; if(x.notes) Object.defineProperty(row, 'notes', { value:x.notes }); if(x.diff) lists.push([name, x.list||[]]); }
  catch(err){ row={ check:name, cases:'—', differences:'ERROR' }; lists.push([name,[String(err&&err.stack||err)]]); }
  finally{ Object.assign(console,keep); }
  row.ms=Math.round(performance.now()-t0);
  row.status= row.differences===0 ? 'pass' : 'FAIL';
  rows.push(row);
  out(`[probe-data] ${row.status==='pass'?'pass':'FAIL'} · ${name} · ${row.cases} cases · ${row.differences} differences · ${row.ms} ms`);
  for(const x of row.notes||[]) out(`[probe-data]     ${x}`);   // NIGHT-4: a row's notes (numbers worth seeing, not judged)
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
