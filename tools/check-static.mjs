/* ⛳ СТАТИЧЕСКАЯ ПРОВЕРКА src/ — инструмент разработки, НЕ часть приложения (приложение его не грузит; в браузер он не попадает).
   Запуск:  node tools/check-static.mjs
   ⛔ НИКАКОГО КОДА ПРИЛОЖЕНИЯ НЕ ИСПОЛНЯЕТ: модули читаются как ТЕКСТ. Синтаксис проверяет сам node (--check — разбор без выполнения),
   всё прочее — разбор текста здесь.
   Что проверяется (ОШИБКА — код возврата 1):
     1) СИНТАКСИС каждого модуля (node --input-type=module --check, текст подаётся на вход);
     2) СТАТИЧЕСКИЙ ИМПОРТ: каждое импортированное имя ЕСТЬ среди экспортов целевого модуля. Экспорты читаются из текста С ВЫРЕЗАННЫМИ
        КОММЕНТАРИЯМИ — ловушка, однажды потерявшая заморозку: комментарий `//` посреди многострочного списка `export { … }` молча
        выключал имена до конца строки, а лениво грузимый модуль падал на импорте без единого слова;
     3) СПИСОК ЭКСПОРТА: каждое имя в `export { … }` объявлено в модуле (переименованное поле состояния — вторая прошлая регрессия);
     4) ДИНАМИЧЕСКИЙ ИМПОРТ строкой-литералом: целевой файл существует (строка запроса `?…` отбрасывается);
     5) ЧИСЛО АРГУМЕНТОВ (добавлено после T4c-1): вызов функции, объявленной `function имя(…)` в этом модуле или импортированной из
        другого, передаёт НЕ БОЛЬШЕ аргументов, чем у неё параметров (rest `...` — без предела). Ловит ровно тот дефект, что пропустил
        T4c-1: сигнатура потеряла аргумент, а позиционный вызов (в пробе) остался прежним — лишний аргумент сдвигал все прочие. Меньше
        аргументов — не ошибка (умолчания). Методы (`x.имя(`), стрелочные функции и имена, объявленные в модуле дважды, не проверяются;
     6) ЗАТЕНЁННЫЙ ИМПОРТ, КОТОРЫЙ ВЫЗЫВАЮТ (добавлено после F6b): импортированное имя объявлено локально (const/let/var, function,
        class, параметр) и в области этого объявления вызывается — зовётся локальное, а не импорт («is not a function» на старте).
        Затенение без вызова — сведение.
     7) НЕОБЪЯВЛЕННОЕ ИМЯ (добавлено после F7, F8): имя, которое модуль ЧИТАЕТ или ЗОВЁТ, но нигде в нём не объявляет (const/let/var,
        function, class, параметр функции или стрелки, catch, импорт) и которого нет в списке известных глобальных (GLOBALS ниже —
        JavaScript и браузер, плюс область AudioWorklet). Ловит дефект, пропущенный в F7: проба звала namingOf, не импортировав её, —
        ReferenceError только в том ряду, который до неё доходит. ⚠️ Мешок имён на МОДУЛЬ, без областей: имя, объявленное где-то в
        модуле, считается объявленным везде (ловится «нигде не объявлено и не импортировано» — ровно класс F7; «объявлено в соседней
        функции» — нет). Свойства (после «.»), ключи объектных литералов и шаблонов, имена методов, метки и сами импорт/экспорт-списки
        ссылками не считаются.
     8) NETWORK GUARD (PRIV1, rule #33): every network / share call site is listed with its reason and count (NET_LISTED); a control
        (an unlisted sendBeacon, a fetch in a new module) must be caught.
     9) FOLDERS AND IMPORT CYCLES (REC1) — see block 9.
    10) WRITE TO AN IMPORT (DAY run): `x = …`, `x += …`, `x++`, `--x` on an imported name, or `ns.x = …` on a namespace import, outside
        the scope of a local of that name — fails (read-only at run time). CONTROL: five forms caught, a local / property / comparison not.
   Что сообщается как СВЕДЕНИЕ (не ошибка): экспорты, которых никто не импортирует статически (у модулей, грузимых динамически или
   целиком как пространство имён, не считаются), и импорты, которые модуль больше не упоминает.
   An import used only after a spread / rest («...x») counts as used (CONTROL).
   Разбор — лексический: строки, шаблоны (с вложенными ${…}), регулярные выражения и комментарии различаются; полного парсера JS здесь нет,
   и он не нужен — синтаксис уже проверил node. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lex } from './lex.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC=join(ROOT,'src');
// every module of src/ and its sub-folders (LAT1: src/core/), as a path relative to src/ with '/'
const listJs=(d='')=>readdirSync(join(SRC,d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? listJs(d+e.name+'/') : e.name.endsWith('.js') ? [d+e.name] : []);
const files=listJs().sort();

/* The lexer lives in tools/lex.mjs (shared with check-licences). */
const ID=/^[A-Za-z_$][\w$]*$/;
function declaratorNames(text){   // «a=…, {b,c}=…, [d]=…» на верхнем уровне → имена
  const out=[]; let depth=0, start=0, parts=[];
  for(let i=0;i<=text.length;i++){ const c=text[i];
    if(c==='('||c==='['||c==='{') depth++; else if(c===')'||c===']'||c==='}') depth--;
    if((c===','&&depth===0)||i===text.length){ parts.push(text.slice(start,i)); start=i+1; } }
  for(const p of parts){ const lhs=p.split('=')[0].trim();
    if(ID.test(lhs)) out.push(lhs);
    else if(/^[{[]/.test(lhs)) for(const m of lhs.matchAll(/(?:^|[{,[\s:])\s*([A-Za-z_$][\w$]*)\s*(?=[,}\]=]|$)/g)) out.push(m[1]); }
  return out;
}
/* Конец объявления const/let/var: «;» на нулевой глубине, или перевод строки на нулевой глубине после законченного выражения. */
function declText(code,from){
  let depth=0;
  for(let i=from;i<code.length;i++){ const c=code[i];
    if(c==='('||c==='['||c==='{') depth++; else if(c===')'||c===']'||c==='}'){ depth--; if(depth<0) return code.slice(from,i); }
    else if(c===';'&&depth===0) return code.slice(from,i);
    else if(c==='\n'&&depth===0){ const before=code.slice(from,i).trimEnd(), after=code.slice(i+1).trimStart();
      if(!/[,=+\-*/%&|?:(\[{.]$/.test(before) && !/^[,.?:+\-*/%&|)\]}]/.test(after)) return code.slice(from,i); } }
  return code.slice(from);
}

const mods={};
for(const f of files){
  const src=readFileSync(join(SRC,f),'utf8'), { code, bare }=lex(src);
  const m={ file:f, code, bare, exports:new Set(), localExports:[], declared:new Set(), imports:[], dyn:[], reexportAll:false };
  // объявления
  for(const x of code.matchAll(/\b(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/g)) m.declared.add(x[1]);
  for(const x of code.matchAll(/\b(?:const|let|var)\s+/g)) for(const nm of declaratorNames(declText(code,x.index+x[0].length))) m.declared.add(nm);
  // экспорты-объявления
  for(const x of code.matchAll(/\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) m.exports.add(x[1]);
  for(const x of code.matchAll(/\bexport\s+class\s+([A-Za-z_$][\w$]*)/g)) m.exports.add(x[1]);
  for(const x of code.matchAll(/\bexport\s+(?:const|let|var)\s+/g)) for(const nm of declaratorNames(declText(code,x.index+x[0].length))) m.exports.add(nm);
  if(/\bexport\s+default\b/.test(code)) m.exports.add('default');
  // списки экспорта (с переэкспортом и без)
  for(const x of code.matchAll(/\bexport\s*\{([^}]*)\}(\s*from\s*(['"])([^'"]+)\3)?/g)){
    for(const item of x[1].split(',').map(t=>t.trim()).filter(Boolean)){
      const [local,as]=item.split(/\s+as\s+/); const name=(as||local).trim();
      m.exports.add(name); if(!x[2]) m.localExports.push(local.trim()); else m.imports.push({ spec:x[4], names:[local.trim()], line:x[0] });
    } }
  if(/\bexport\s*\*\s*from\b/.test(code)) m.reexportAll=true;
  // статические импорты
  for(const x of code.matchAll(/\bimport\s+([^'"();]*?)\s*from\s*(['"])([^'"]+)\2/g)){
    const clause=x[1].trim(), names=[], locals=[];
    const ns=clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    const br=clause.match(/\{([^}]*)\}/);
    const def=clause.replace(/\{[^}]*\}/,'').replace(/\*\s+as\s+[A-Za-z_$][\w$]*/,'').replace(/,/g,' ').trim();
    if(def&&ID.test(def)){ names.push('default'); locals.push(def); }
    if(br) for(const item of br[1].split(',').map(t=>t.trim()).filter(Boolean)){ const [imp,as]=item.split(/\s+as\s+/); names.push(imp.trim()); locals.push((as||imp).trim()); }
    m.imports.push({ spec:x[3], names, locals, ns:ns?ns[1]:null, at:x.index, len:x[0].length });
    for(const l of locals) m.declared.add(l); if(ns) m.declared.add(ns[1]);
  }
  // динамические импорты строкой-литералом
  for(const x of code.matchAll(/\bimport\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g)) m.dyn.push(x[2]);
  mods[f]=m;
}

const fails=[], infos=[];
// 1) синтаксис
for(const f of files){
  const r=spawnSync(process.execPath,['--input-type=module','--check'],{ input:readFileSync(join(SRC,f),'utf8'), encoding:'utf8' });
  if(r.status!==0) fails.push(`${f}: SYNTAX — ${(r.stderr||'').split('\n').filter(Boolean).slice(0,4).join(' | ')}`);
}
// 2) импорты, 3) списки экспорта, 4) динамические импорты
const target=(from,spec)=>{ if(!spec.startsWith('.')) return null; const p=resolve(SRC,dirname(from),spec.split('?')[0]); return relative(SRC,p).replace(/\\/g,'/'); };
const used={}; for(const f of files) used[f]=new Set();
const wholeNS=new Set();
for(const f of files){ const m=mods[f];
  for(const im of m.imports){ const t=target(f,im.spec); if(t==null) continue;
    if(!mods[t]){ fails.push(`${f}: imports '${im.spec}' — no such module in src/`); continue; }
    if(im.ns) wholeNS.add(t);
    for(const nm of im.names){ used[t].add(nm); if(!mods[t].exports.has(nm) && !mods[t].reexportAll) fails.push(`${f}: imports '${nm}' from ${t}, which does not export it`); } }
  for(const nm of m.localExports) if(!m.declared.has(nm)) fails.push(`${f}: export list names '${nm}', which is not declared in the module`);
  for(const spec of m.dyn){ const t=target(f,spec); if(t==null) continue;
    if(!existsSync(join(SRC,t))) fails.push(`${f}: dynamic import '${spec}' — file ${t} does not exist`); else wholeNS.add(t); }
}
// 5) число аргументов: параметры каждой `function имя(…)` (по тексту без строк и комментариев), затем каждый вызов по имени
const splitTop=t=>{ const out=[]; let depth=0, start=0;
  for(let i=0;i<=t.length;i++){ const c=t[i];
    if(c==='('||c==='['||c==='{') depth++; else if(c===')'||c===']'||c==='}') depth--;
    if((c===','&&depth===0)||i===t.length){ out.push(t.slice(start,i)); start=i+1; } }
  return out.map(x=>x.trim()).filter(x=>x!==''); };   // пустой хвост после висячей запятой — не аргумент
const closeParen=(t,open)=>{ let depth=0; for(let i=open;i<t.length;i++){ const c=t[i]; if(c==='('||c==='['||c==='{') depth++; else if(c===')'||c===']'||c==='}'){ depth--; if(depth===0) return i; } } return -1; };
const arity={};   // файл → имя → число параметров (Infinity при rest); null — объявлено в модуле дважды, не проверяем
for(const f of files){ const m=mods[f], A={};
  for(const x of m.bare.matchAll(/\bfunction\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(/g)){
    const o=x.index+x[0].length-1, e=closeParen(m.bare,o); if(e<0) continue;
    const ps=splitTop(m.bare.slice(o+1,e)), n= ps.some(p=>p.startsWith('...')) ? Infinity : ps.length;
    A[x[1]] = (x[1] in A) ? null : n; }
  arity[f]=A; }
let nCalls=0;
for(const f of files){ const m=mods[f], bind={};
  for(const [nm,n] of Object.entries(arity[f])) if(n!=null) bind[nm]={ n, from:f, name:nm };
  for(const im of m.imports){ const t=target(f,im.spec); if(t==null||!mods[t]) continue;
    (im.locals||[]).forEach((l,i)=>{ const ex=im.names[i], n=arity[t][ex]; if(n!=null && !(l in arity[f])) bind[l]={ n, from:t, name:ex }; }); }
  for(const [l,b] of Object.entries(bind)){
    const re=new RegExp('(?<![\\w$.])'+l.replace(/\$/g,'\\$')+'\\s*\\(','g');
    for(const x of m.bare.matchAll(re)){
      const before=m.bare.slice(Math.max(0,x.index-12),x.index); if(/function\s*\*?\s*$/.test(before)) continue;   // само объявление
      const o=x.index+x[0].length-1, e=closeParen(m.bare,o); if(e<0) continue;
      const args=splitTop(m.bare.slice(o+1,e)).length; nCalls++;
      if(args>b.n){ const line=m.bare.slice(0,x.index).split('\n').length;
        fails.push(`${f}:${line}: calls ${l}() with ${args} arguments; ${b.from} declares ${b.name}() with ${b.n} parameters`); } } }
}
// 6) ЗАТЕНЁННЫЙ ИМПОРТ (добавлено после F6b): имя, импортированное модулем, объявлено в нём же ещё раз — const/let/var (в любой области),
//    function/class или параметр функции либо стрелки. Внутри той области имя значит ЛОКАЛЬНОЕ, и вызов «импорта» зовёт не то: F6b
//    импортировал функцию chordModeHint, а в renderChordMode жила const chordModeHint (элемент подсказки) — «is not a function» на старте.
//    Лексически: объявления — из текста без строк и комментариев; параметры стрелки — по скобкам перед «=>» (или одно имя).
//    ⚠️ ОШИБКА — только когда затенённое имя ВЫЗЫВАЕТСЯ (имя( …) в области затеняющего объявления: ровно дефект F6b. Затенение без
//    вызова — сведение (стиль кода — однобуквенные локальные t, L рядом с импортом i18n t()/L(); безвредно, пока их не зовут).
//    Область: const/let/var и function/class-имя — до конца объемлющего блока; параметр функции — её тело; параметр стрелки — тело {…}
//    или выражение до конца объявления. Приближение лексическое, без полного разбора областей.
const lineAt=(t,i)=>t.slice(0,i).split('\n').length;
const paramNames=t=>splitTop(t).map(p=>p.replace(/^\.\.\./,'').split('=')[0].trim()).filter(p=>ID.test(p));
const blockEnd=(t,i)=>{ let d=0; for(let k=i;k<t.length;k++){ if(t[k]==='{') d++; else if(t[k]==='}'){ d--; if(d<0) return k; } } return t.length; };
const bodyAfter=(t,i)=>{ let k=i; while(k<t.length&&/\s/.test(t[k])) k++; if(t[k]==='{'){ const e=blockEnd(t,k+1); return [k,e]; } return [k, k+declText(t,k).length]; };
let nShadow=0; const shadowInfo=new Map();
for(const f of files){ const m=mods[f], b=m.bare, own=[];   // [имя, начало области, конец области, строка объявления]
  for(const x of b.matchAll(/\b(?:const|let|var)\s+/g)) for(const nm of declaratorNames(declText(b,x.index+x[0].length))) own.push([nm,x.index,blockEnd(b,x.index),x.index]);
  for(const x of b.matchAll(/\b(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/g)) own.push([x[1],x.index,blockEnd(b,x.index),x.index]);
  for(const x of b.matchAll(/\bfunction\s*\*?\s*[A-Za-z_$]?[\w$]*\s*\(/g)){ const o=x.index+x[0].length-1, e=closeParen(b,o); if(e<0) continue;
    const [s0,s1]=bodyAfter(b,e+1); for(const p of paramNames(b.slice(o+1,e))) own.push([p,s0,s1,x.index]); }
  for(const x of b.matchAll(/=>/g)){ let j=x.index-1; while(j>=0&&/\s/.test(b[j])) j--; const [s0,s1]=bodyAfter(b,x.index+2);
    if(b[j]===')'){ let d=0, k=j; for(;k>=0;k--){ if(b[k]===')') d++; else if(b[k]==='('){ d--; if(d===0) break; } }
      if(k>=0) for(const p of paramNames(b.slice(k+1,j))) own.push([p,s0,s1,k]); }
    else { let k=j; while(k>=0&&/[\w$]/.test(b[k])) k--; const nm=b.slice(k+1,j+1); if(ID.test(nm)) own.push([nm,s0,s1,k+1]); } }
  const imp=new Set(); for(const im of m.imports) for(const l of (im.locals||[])) imp.add(l);
  for(const [nm,s0,s1,at] of own){ nShadow++; if(!imp.has(nm)) continue;
    const call=new RegExp('(?<![\\w$.])'+nm.replace(/\$/g,'\\$')+'\\s*\\(','g'), body=b.slice(s0,s1); let hit=null;
    for(const c of body.matchAll(call)){ const before=body.slice(Math.max(0,c.index-12),c.index); if(/function\s*\*?\s*$/.test(before)) continue; hit=c; break; }
    if(hit) fails.push(`${f}:${lineAt(b,s0+hit.index)}: calls '${nm}()' where a local '${nm}' (declared at line ${lineAt(b,at)}) hides the imported ${nm} — rename the local`);
    else shadowInfo.set(`${f}:${nm}`, (shadowInfo.get(`${f}:${nm}`)||0)+1); }
}
if(shadowInfo.size) infos.push(`imported names also declared locally, never called there (harmless; style): ${[...shadowInfo].map(([k,n])=>`${k}×${n}`).join(', ')}`);
// 7) НЕОБЪЯВЛЕННОЕ ИМЯ (добавлено после F7, F8) — см. шапку. GLOBALS: известные глобальные имена. ⛳ Список ведётся РУКАМИ здесь и только
//    здесь: новый API браузера в коде даст ошибку «… is not declared» — его добавляют сюда (это и есть проверка, что имя — не опечатка
//    и не забытый импорт). Слова языка — в RESERVED.
const RESERVED=new Set(('break case catch class const continue debugger default delete do else export extends finally for function if import in '+
  'instanceof let new return super switch this throw try typeof var void while with yield async await of get set static from as '+
  'true false null undefined NaN Infinity arguments').split(' '));
const GLOBALS=new Set((
  /* JavaScript */ 'Math JSON Object Array Number String Boolean Symbol BigInt Map Set WeakMap WeakSet WeakRef Promise Proxy Reflect Intl Date RegExp '+
  'Error TypeError RangeError SyntaxError ReferenceError AggregateError ArrayBuffer SharedArrayBuffer DataView Float32Array Float64Array Int8Array '+
  'Int16Array Int32Array Uint8Array Uint8ClampedArray Uint16Array Uint32Array parseInt parseFloat isNaN isFinite encodeURIComponent '+
  'decodeURIComponent encodeURI decodeURI globalThis queueMicrotask structuredClone console setTimeout clearTimeout setInterval clearInterval '+
  /* браузер */ 'window self document navigator location history screen performance localStorage sessionStorage indexedDB IDBKeyRange crypto '+
  'fetch URL URLSearchParams Blob File FileReader Image ImageData Path2D OffscreenCanvas TextEncoder TextDecoder AbortController Event '+
  'CustomEvent HTMLElement HTMLCanvasElement HTMLVideoElement alert confirm prompt matchMedia getComputedStyle requestAnimationFrame '+
  'cancelAnimationFrame innerWidth innerHeight devicePixelRatio MediaRecorder MediaStream KeyboardEvent AudioContext OfflineAudioContext webkitAudioContext OscillatorNode BiquadFilterNode GainNode WaveShaperNode DelayNode ConstantSourceNode '+
  'AudioWorkletNode OfflineAudioCompletionEvent DOMException addEventListener removeEventListener MessageChannel PerformanceObserver '+
  /* LAT2: frames to the detection worker */ 'Worker createImageBitmap ImageBitmap '+
  /* AUTOSAVE1: the write waits for an idle moment */ 'requestIdleCallback '+
  /* AUD1a: the engine-context probe tells Web Audio objects apart */ 'AudioNode AudioParam AudioBuffer MessagePort BaseAudioContext '+
  /* PACK1: base64 for licence keys (core/pack.js; browser and node) */ 'btoa atob '+
  /* CAM-FIX: the probe records camera constraint calls */ 'MediaStreamTrack '+
  /* the detection worker's own scope (hand-worker.js) */ 'postMessage '+
  /* область AudioWorklet (ks-worklet.js) */ 'AudioWorkletProcessor registerProcessor sampleRate currentTime currentFrame'
).split(/\s+/).filter(Boolean));
const undeclared=new Set();   // «файл:строка: имя» — одно сообщение на строку
for(const f of files){ const m=mods[f]; let b=m.bare;
  // импорт- и экспорт-списки — не ссылки (их имена проверяют 2) и 3))
  b=b.replace(/\bimport\s+[^'"();]*?\s*from\s*(['"])[^'"]*\1/g, x=>x.replace(/[^\n]/g,' ')).replace(/\bexport\s*\{[^}]*\}(\s*from\s*(['"])[^'"]*\2)?/g, x=>x.replace(/[^\n]/g,' '));
  const bag=new Set(m.declared);   // const/let/var, function, class, импорты (собраны выше)
  const idsIn=t=>{ for(const x of t.replace(/\.\.\./g,'   ').matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) bag.add(x[0]); };   // «...rest» — имя   // шаблон деструктуризации / список параметров — с запасом
  const matchClose=(t,o)=>{ let d=0; for(let k=o;k<t.length;k++){ const c=t[k]; if(c==='('||c==='['||c==='{') d++; else if(c===')'||c===']'||c==='}'){ d--; if(d===0) return k; } } return t.length; };
  for(const x of b.matchAll(/\b(?:const|let|var)\b\s*(?=[\w$[{])/g)){ const o=x.index+x[0].length;   // и «const[a,b]» без пробела
    if(b[o]==='{'||b[o]==='[') idsIn(b.slice(o,matchClose(b,o)+1)); else { const w=b.slice(o).match(/^[A-Za-z_$][\w$]*/); if(w) bag.add(w[0]); } }
  for(const x of b.matchAll(/\b(?:function\s*\*?\s*[A-Za-z_$]?[\w$]*|catch)\s*\(/g)){ const o=x.index+x[0].length-1; idsIn(b.slice(o,closeParen(b,o)+1)); }
  for(const x of b.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)){ if(RESERVED.has(x[1])) continue;   // метод класса/объекта: имя(…){ — его параметры
    const o=x.index+x[0].length-1, e=closeParen(b,o); let r=e+1; while(r<b.length&&/\s/.test(b[r])) r++; if(b[r]==='{') idsIn(b.slice(o,e+1)); }
  for(const x of b.matchAll(/=>/g)){ let j=x.index-1; while(j>=0&&/\s/.test(b[j])) j--;
    if(b[j]===')'){ let d=0, k=j; for(;k>=0;k--){ if(b[k]===')') d++; else if(b[k]==='('){ d--; if(d===0) break; } } if(k>=0) idsIn(b.slice(k,j+1)); }
    else { let k=j; while(k>=0&&/[\w$]/.test(b[k])) k--; bag.add(b.slice(k+1,j+1)); } }
  for(const x of b.matchAll(/(?<![\w$])[A-Za-z_$][\w$]*/g)){ const nm=x[0], i=x.index;
    if(bag.has(nm)||RESERVED.has(nm)||GLOBALS.has(nm)) continue;
    let p=i-1; while(p>=0&&/\s/.test(b[p])) p--; const prev=b[p];
    if(prev==='.' && b[p-1]!=='.') continue;   // свойство (но «...имя» — ссылка)
    const before=b.slice(Math.max(0,p-9),p+1); if(/\b(?:break|continue)$/.test(before)) continue;   // метка
    let q=i+nm.length; while(q<b.length&&/\s/.test(b[q])) q++;
    if(b[q]===':' && (p<0||'{,;}'.includes(prev))) continue;   // ключ объекта / метка
    if(b[q]==='('){ const e=closeParen(b,q); let r=e+1; while(r<b.length&&/\s/.test(b[r])) r++;
      if(b[r]==='{' && (p<0||'{},;'.includes(prev)||/\b(?:get|set|static|async)$/.test(before))) continue; }   // имя метода
    undeclared.add(`${f}:${lineAt(b,i)}: '${nm}' is not declared, imported or a known global — a missing import or a typo`); }
}
fails.push(...undeclared);
/* 8) NETWORK GUARD (PRIV1, hard rule #33): every call that can reach the network or hand data off the device is LISTED here with its
   reason, per module and kind, with the exact count. A new call site (or a changed count) fails until it is listed; an unlisted host is
   also refused by the browser itself (the CSP in index.html). Read from text without comments and strings. */
const NET_KINDS={ fetch:/(?<![\w$])fetch\s*\(/g, xhr:/\bXMLHttpRequest\b/g, websocket:/\bWebSocket\b/g, eventsource:/\bEventSource\b/g,
  beacon:/\bsendBeacon\s*\(/g, rtc:/\bRTCPeerConnection\b/g, worker:/\bnew\s+(?:Shared)?Worker\s*\(/g, importScripts:/\bimportScripts\s*\(/g,
  addModule:/\baddModule\s*\(/g, share:/\bnavigator\s*\.\s*share\s*\(/g, open:/\bwindow\s*\.\s*open\s*\(/g, swRegister:/\bserviceWorker\s*\.\s*register\s*\(/g };
const NET_LISTED={
  'scaleload.js':  { fetch:[1,'reads the data/ files (tunings, modes, palettes) from the app\'s own origin'] },
  'probes/files.js': { fetch:[1,'probe only (?probe): reads tools/scales.before.json from the own origin'] },
  'probes/key.js':   { fetch:[1,'probe only (?probe): reads tools/song.print.json from the own origin'] },
  'probes/gold.js':  { fetch:[1,'probe only (?probe): reads tools/gold.print.json from the own origin'] },
  'probes/engine.js':{ fetch:[1,'probe only (?probe): reads tools/census.print.json from the own origin (AUD1a node census)'] },
  'timbreload.js': { fetch:[1,'reads data/timbres.bundle.json (the timbre records, TIM3a) from the own origin'] },
  'profile.js': { fetch:[2,'reads data/profiles/index.json and each profile record (C0) from the own origin'] },
  'probes/timbres.js':{ fetch:[1,'probe only (?probe): reads tools/timbres.before.json from the own origin (TIM3 timbres = before)'] },
  'probes/calm.js':   { fetch:[1,'probe only (?probe): reads data/profiles/calm.json from the own origin (RUN 7 CALM timbres)'] },
  'probes/pack.js':  { fetch:[1,'probe only (?probe): reads tools/pack-test-licence.json (TEST keys) from the own origin (PACK1)'] },
  'probes/song2.js': { fetch:[1,'probe only (?probe): reads data/songs/triphop.json from the own origin (SONG2 control)'] },
  'songs.js':        { fetch:[1,'the demo song file data/songs/<name>.json from the own origin (SONG2; P.song only)'] },
  'probes/sound.js': { addModule:[2,'probe only (?probe): loads our own src/engine/worklets/dyn-worklet.js into the offline contexts of the probe'] },
  'probes/hand.js':  { fetch:[1,'probe only (?probe): reads tools/gesture.print.json from the own origin'] },
  'audio.js':      { addModule:[4,'loads our own worklets (src/engine/worklets/ks-, frz-, dyn-, probe-cap-worklet.js) from the own origin into the audio context'] },
  'render.js':     { addModule:[1,'track renders: lets the engine copy load only the worklets the track needs (own origin) into its offline context'] },
  'clip.js':       { share:[1,'hands the person\'s own clip to the system share sheet — only on their tap (explicit action)'] },
  'ui.js':         { swRegister:[1,'registers sw.js (own origin, cache-free) so the app is installable'] },
  'vision.js':     { worker:[1,'starts our own src/hand-worker.js (own origin, CSP worker-src self): hand detection off the main thread (LAT2b)'] },
  'handdet.js':    { external:[1,'imports MediaPipe Tasks Vision from jsDelivr (register entry mediapipe-tasks-vision; it loads its WASM — CSP script-src/connect-src); in the worker too'],
                     fetch:[1,'downloads the hand model once (register entry mediapipe-hand-landmarker, storage.googleapis.com/mediapipe-models — CSP connect-src) for both models (L1, L2)'] },
};
function netSites(m){   // kind → count for one module (external = static import from an http(s) address)
  const n={}; for(const [k,re] of Object.entries(NET_KINDS)){ const c=(m.bare.match(re)||[]).length; if(c) n[k]=c; }
  const ext=m.imports.filter(im=>/^https?:/.test(im.spec)).length+m.dyn.filter(s=>/^https?:/.test(s)).length; if(ext) n.external=ext;
  return n;
}
function netCheck(modsIn){
  const bad=[]; let total=0;
  for(const f of Object.keys(modsIn)){ const got=netSites(modsIn[f]), want=NET_LISTED[f]||{};
    for(const [k,c] of Object.entries(got)){ total+=c; const w=want[k];
      if(!w) bad.push(`${f}: ${c} network call site(s) of kind «${k}» not listed — add them to NET_LISTED in tools/check-static.mjs with the reason (rule #33)`);
      else if(w[0]!==c) bad.push(`${f}: ${c} call site(s) of kind «${k}», ${w[0]} listed — re-check each one, then update NET_LISTED`); }
    for(const k of Object.keys(want)) if(!got[k]) bad.push(`${f}: NET_LISTED names «${k}», which the module no longer has — remove it`); }
  for(const f of Object.keys(NET_LISTED)) if(!modsIn[f]) bad.push(`NET_LISTED names ${f}, which is not a module in src/`);
  return { bad, total };
}
const NET=netCheck(mods);
fails.push(...NET.bad);
{ /* CONTROL: an unlisted beacon in a listed module and a fetch in a new module must both be caught */
  const fake={ ...mods, 'ui.js':{ ...mods['ui.js'], bare:mods['ui.js'].bare+'\nnavigator.sendBeacon(u, d);' }, 'probe-net.js':{ bare:'fetch(x)', imports:[], dyn:[] } };
  const c=netCheck(fake);
  if(!(c.bad.some(x=>/ui\.js: 1 .*«beacon»/.test(x)) && c.bad.some(x=>/probe-net\.js: .*«fetch»/.test(x)))) fails.push('network guard CONTROL: an unlisted sendBeacon / fetch was not caught — the guard cannot fail');
}
/* 9) REC1 — FOLDERS AND IMPORT CYCLES. The static import graph (import … from and export … from; dynamic imports are not edges — they
   resolve after evaluation). Strongly connected groups (Tarjan) are the import cycles: today's are printed as information (each one is a
   place where evaluation order and live bindings matter); a cycle through a module of a REC folder fails. Folder rule: a module under
   src/song/ imports only src/song/, src/core/, the leaf config.js and (REC3) the pitch truth scales.js — the song never reaches up into the
   recorder, the engine or the screen (the layers above register with it instead: store.onInvalidate, lanes.laneWire, history.histWire,
   edit-notes.editWire). REC3: the edits price and move pitches through scales.js (chord notes, degrees, modes), which is node-runnable data
   (the data runner loads it). CONTROL: a fake import song/store.js → recorder.js must be caught by both checks. */
const FOLDER_RULES={ 'song/':t=>t.startsWith('song/')||t.startsWith('core/')||t==='config.js'||t==='scales.js' };
const edgesOf=ms=>{ const G={}; for(const f of Object.keys(ms)){ G[f]=new Set();
  for(const im of ms[f].imports){ const t=target(f,im.spec); if(t!=null && ms[t]) G[f].add(t); } } return G; };
function sccs(G){   // Tarjan, iterative enough for this size (recursion depth ≤ module count)
  let idx=0; const I={}, low={}, on=new Set(), st=[], out=[];
  const visit=v=>{ I[v]=low[v]=idx++; st.push(v); on.add(v);
    for(const w of G[v]){ if(I[w]==null){ visit(w); low[v]=Math.min(low[v],low[w]); } else if(on.has(w)) low[v]=Math.min(low[v],I[w]); }
    if(low[v]===I[v]){ const c=[]; let w; do{ w=st.pop(); on.delete(w); c.push(w); }while(w!==v); if(c.length>1 || G[v].has(v)) out.push(c.sort()); } };
  for(const v of Object.keys(G).sort()) if(I[v]==null) visit(v);
  return out;
}
function cyclePath(G, members){   // one concrete loop through the group, for the message
  const M=new Set(members), start=members[0], prev={ [start]:null }, q=[start];
  while(q.length){ const v=q.shift(); for(const w of G[v]) if(M.has(w)){ if(w===start){ const p=[start]; let x=v; while(x!==start&&x!=null){ p.splice(1,0,x); x=prev[x]; } return [...p,start].join(' → '); } if(!(w in prev)){ prev[w]=v; q.push(w); } } }
  return members.join(' · ');
}
function layerCheck(ms){
  const G=edgesOf(ms), bad=[], groups=sccs(G);
  for(const [dir,ok] of Object.entries(FOLDER_RULES)) for(const f of Object.keys(ms)) if(f.startsWith(dir)) for(const t of G[f]) if(!ok(t)) bad.push(`${f}: imports ${t} — a module under src/${dir} imports only its folder, core/, config.js and scales.js (REC1, REC3)`);
  for(const g of groups) if(g.some(f=>Object.keys(FOLDER_RULES).some(d=>f.startsWith(d)))) bad.push(`import cycle through a REC folder: ${cyclePath(G,g)}`);
  return { bad, groups, G };
}
const LAY=layerCheck(mods);
fails.push(...LAY.bad);
{ const dirs={}; for(const f of files){ const d=f.includes('/') ? f.slice(0,f.lastIndexOf('/')+1) : '(src)'; dirs[d]=(dirs[d]||0)+1; }
  infos.push(`folders: ${Object.entries(dirs).map(([d,n])=>`${d} ${n}`).join(' · ')}`);
  infos.push(LAY.groups.length ? `import cycles (${LAY.groups.length}; evaluation order and live bindings matter inside each): ${LAY.groups.map(g=>cyclePath(LAY.G,g)+(g.length>2?` (group of ${g.length}: ${g.join(', ')})`:'')).join(' ;  ')}` : 'import cycles: none'); }
{ /* CONTROL: song/store.js importing recorder.js must break the folder rule AND close a cycle */
  if(mods['song/store.js'] && mods['recorder.js']){
    const fake={ ...mods, 'song/store.js':{ ...mods['song/store.js'], imports:[...mods['song/store.js'].imports, { spec:'../recorder.js', names:[] }] } };
    const c=layerCheck(fake);
    if(!(c.bad.some(x=>/song\/store\.js: imports recorder\.js/.test(x)) && c.bad.some(x=>/import cycle through a REC folder: .*song\/store\.js/.test(x)))) fails.push('folder / cycle CONTROL: song/store.js → recorder.js was not caught — the check cannot fail'); }
  else fails.push('folder / cycle CONTROL: src/song/store.js or src/recorder.js missing');
  /* REC3 CONTROL: the scales.js exception must not open the engine — song/history.js importing audio.js must break the folder rule */
  if(mods['song/history.js'] && mods['audio.js']){
    const fake={ ...mods, 'song/history.js':{ ...mods['song/history.js'], imports:[...mods['song/history.js'].imports, { spec:'../audio.js', names:[] }] } };
    if(!layerCheck(fake).bad.some(x=>/song\/history\.js: imports audio\.js/.test(x))) fails.push('folder CONTROL: song/history.js → audio.js was not caught — the check cannot fail'); }
  else fails.push('folder CONTROL: src/song/history.js or src/audio.js missing');
}
/* 10) WRITE TO AN IMPORTED BINDING (DAY run, item 0): an import is read-only — `x = …`, `x += …`, `x++`, `--x` on an imported name (or
   `ns.x = …` on a namespace import) throws «Assignment to constant variable» only when that line runs (the NIGHT run hit it after a move).
   Fails unless a local declaration of the same name covers the site (the scopes of check 6). Text without strings and comments. */
const ASSIGN_OPS='(?:\\*\\*|>>>|<<|>>|&&|\\|\\||\\?\\?|[-+*/%&|^])?=(?![=>])';
function importWrites(m, b=m.bare){
  const bad=[], own=[];
  for(const x of b.matchAll(/\b(?:const|let|var)\s+/g)) for(const nm of declaratorNames(declText(b,x.index+x[0].length))) own.push([nm,x.index,blockEnd(b,x.index)]);
  for(const x of b.matchAll(/\b(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/g)) own.push([x[1],x.index,blockEnd(b,x.index)]);
  for(const x of b.matchAll(/\bfunction\s*\*?\s*[A-Za-z_$]?[\w$]*\s*\(/g)){ const o=x.index+x[0].length-1, e=closeParen(b,o); if(e<0) continue;
    const [s0,s1]=bodyAfter(b,e+1); for(const p of paramNames(b.slice(o+1,e))) own.push([p,s0,s1]); }
  for(const x of b.matchAll(/=>/g)){ let j=x.index-1; while(j>=0&&/\s/.test(b[j])) j--; const [s0,s1]=bodyAfter(b,x.index+2);
    if(b[j]===')'){ let d=0, k=j; for(;k>=0;k--){ if(b[k]===')') d++; else if(b[k]==='('){ d--; if(d===0) break; } } if(k>=0) for(const p of paramNames(b.slice(k+1,j))) own.push([p,s0,s1]); }
    else { let k=j; while(k>=0&&/[\w$]/.test(b[k])) k--; const nm=b.slice(k+1,j+1); if(ID.test(nm)) own.push([nm,s0,s1]); } }
  const covered=(nm,i)=>own.some(([n,s0,s1])=>n===nm&&i>=s0&&i<s1);
  for(const im of m.imports){ const esc=s=>s.replace(/\$/g,'\\$');
    for(const l of (im.locals||[])){
      const res=[new RegExp('(?<![\\w$.])'+esc(l)+'\\s*'+ASSIGN_OPS,'g'), new RegExp('(?<![\\w$.])'+esc(l)+'\\s*(?:\\+\\+|--)','g'), new RegExp('(?:\\+\\+|--)\\s*'+esc(l)+'(?![\\w$])','g')];
      for(const re of res) for(const x of b.matchAll(re)){ if(im.at!=null && x.index>=im.at && x.index<im.at+im.len) continue;
        const p=b.slice(0,x.index).trimEnd(); if(/(?:^|[^.])\.$/.test(p)) continue;   // a property (but «...x» stays a reference)
        if(/\b(?:const|let|var)\s*$/.test(p)) continue;
        const at=x.index+x[0].search(/[\w$]/); if(covered(l,at)) continue;
        bad.push(`${m.file}:${lineAt(b,at)}: writes to the imported binding '${l}' — imports are read-only («Assignment to constant variable» at run time); write through the owner's setter`); } }
    if(im.ns) for(const x of b.matchAll(new RegExp('(?<![\\w$.])'+esc(im.ns)+'\\s*\\.\\s*([A-Za-z_$][\\w$]*)\\s*(?:'+ASSIGN_OPS+'|\\+\\+|--)','g'))){
      if(covered(im.ns,x.index)) continue;
      bad.push(`${m.file}:${lineAt(b,x.index)}: writes to '${im.ns}.${x[1]}' of a namespace import — read-only at run time`); } }
  return bad;
}
for(const f of files) fails.push(...importWrites(mods[f]));
{ /* CONTROL: each form of a write to an import must be caught; a local of the same name, a property, a comparison and an arrow must not */
  const src=`import { a, b, c, d, e } from './x.js';\nimport * as N from './y.js';\na = 1;\nb += 2;\nc++;\n--d;\nN.k = 3;\n`+
    `function g(e){ e = 5; return e; }\nconst o={}; o.a = 1; if(a == 1){} const h = a => a; let q = a === b;\n`;
  const { bare }=lex(src), fm={ file:'ctl.js', bare, imports:[] };
  for(const x of bare.matchAll(/\bimport\s+([^'"();]*?)\s*from\s*(['"])([^'"]+)\2/g)){ const br=x[1].match(/\{([^}]*)\}/), ns=x[1].match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    fm.imports.push({ spec:x[3], names:[], locals:br?br[1].split(',').map(t=>t.trim()):[], ns:ns?ns[1]:null, at:x.index, len:x[0].length }); }
  const got=importWrites(fm), want=['a','b','c','d','N.k'];
  const ok=want.every(n=>got.some(x=>x.includes(`'${n}'`))) && got.length===want.length;
  if(!ok) fails.push(`write-to-import CONTROL: expected exactly ${want.join(', ')} to be caught, got ${got.length}: ${got.map(x=>x.split(': ')[1].slice(0,40)).join(' | ')} — the check cannot fail or flags innocent code`);
}
/* 11) DESIGN TOKENS (UI1b): the interface's colours, type sizes and weights, line heights, spacing, radii, shadows and layers live in
   tokens.css (custom properties on :root). style.css carries no such literal (only var(--…), 0, auto, inherit…); every var(--name) used
   in style.css, index.html and src/ is defined in tokens.css or is a RUNTIME variable set by JS (RUNTIME_VARS, with the reason); a JS
   inline style writes no colour or px spacing literal. CONTROL: a colour literal and an undefined token must both be caught. */
const RUNTIME_VARS={ '--role':'the role colour of a button / track chip, set by ui.js from palette.ROLE_COL (tokens --cv-role-*)' };
function tokenCheck(css, tok, others){
  const bad=[], strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
  const defs=new Set([...strip(tok).matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1])), c=strip(css);
  const PROP=/(?<![\w-])(color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|font-size|font-weight|line-height|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|row-gap|column-gap|border-radius|box-shadow|text-shadow|z-index|accent-color|caret-color|text-decoration-color)\s*:\s*([^;{}]+?)\s*(?=[;}])/g;
  for(const m of c.matchAll(PROP)){ const [_,p,v]=m, line=lineAt(c,m.index);
    if(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(v)) bad.push(`style.css:${line}: ${p} has a colour literal «${v}» — use a token from tokens.css`);
    else if(/^(font-size|padding|margin|gap|row-gap|column-gap|border-radius)/.test(p) && /(?<![\w-])\d*\.?\d+px\b/.test(v)) bad.push(`style.css:${line}: ${p} has a px literal «${v}» — use a token`);
    else if(/^(box-shadow|text-shadow)$/.test(p) && !/^(none|var\(--[\w-]+\))$/.test(v)) bad.push(`style.css:${line}: ${p} «${v}» — shadows are tokens`);
    else if(/^(z-index|font-weight|line-height)$/.test(p) && /^\d/.test(v)) bad.push(`style.css:${line}: ${p} «${v}» — use a token`); }
  for(const [f,t] of Object.entries({ 'style.css':c, 'tokens.css':strip(tok), ...others })) for(const m of t.matchAll(/var\(\s*(--[\w-]+)/g))
    if(!defs.has(m[1]) && !RUNTIME_VARS[m[1]]) bad.push(`${f}:${lineAt(t,m.index)}: var(${m[1]}) is not defined in tokens.css — a silent fallback`);
  return bad;
}
{ const css=readFileSync(join(ROOT,'style.css'),'utf8'), tok=existsSync(join(ROOT,'tokens.css')) ? readFileSync(join(ROOT,'tokens.css'),'utf8') : '';
  if(!tok) fails.push('tokens.css is missing (UI1b design tokens)');
  const others={ 'index.html':readFileSync(join(ROOT,'index.html'),'utf8') }; for(const f of files) others['src/'+f]=mods[f].bare.length ? mods[f].code : '';
  fails.push(...tokenCheck(css, tok, others));
  for(const f of files){ const b=mods[f].code;   // JS inline styles: no colour / px spacing literal
    for(const m of b.matchAll(/\.style\.(color|background\w*|borderColor|padding\w*|margin\w*|gap|fontSize|borderRadius|boxShadow|zIndex)\s*=\s*(['"`])([^'"`]*)\2/g))
      if(/#[0-9a-fA-F]{3,8}\b|rgba?\(|\d+px/.test(m[3])) fails.push(`${f}:${lineAt(b,m.index)}: .style.${m[1]} = '${m[3]}' — a design literal in JS; use var(--token)`); }
  /* DRAW1b: the CANVAS palette — no colour literal (in a string or template) in src/views/*.js or config.js; every cv('name') of src/ names
     a --cv-name defined in tokens.css. CONTROL: a literal in a view and an unknown cv() name must both be caught. */
  const defsAll=new Set([...tok.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  const canvasCheck=(texts)=>{ const out=[];
    for(const [f,t] of Object.entries(texts)){
      if(/^(views\/|config\.js$)/.test(f)) for(const m of t.matchAll(/(['"`])\s*#[0-9a-fA-F]{3,8}\s*\1|(?<![\w$])(rgba?|hsla?)\(\s*\d/g)) out.push(`${f}:${lineAt(t,m.index)}: a canvas colour literal «${m[0].slice(0,24)}» — use cv('<token>') (tokens.css «canvas»)`);
      for(const m of t.matchAll(/(?<![\w$.])cv\(\s*(['"])([\w-]+)\1/g)) if(!defsAll.has('--cv-'+m[2])) out.push(`${f}:${lineAt(t,m.index)}: cv('${m[2]}') — no token --cv-${m[2]} in tokens.css`); }
    return out; };
  const codeOf={}; for(const f of files) codeOf[f]=mods[f].code;
  fails.push(...canvasCheck(codeOf));
  { const c2=canvasCheck({ 'views/ctl.js':"ctx.fillStyle='#fff'; ctx.strokeStyle=`rgba(255,0,0,${a})`; ctx.fillStyle=cv('no-such-colour');" });
    if(c2.length!==3) fails.push(`canvas-palette CONTROL: expected a hex literal, an rgba literal and an unknown cv() name caught, got ${c2.length} — the check cannot fail`); }
  const ctl=tokenCheck(css+'\n.probeCtl{color:#fff; padding:var(--sp-unknown);}', tok, {});
  if(!(ctl.some(x=>/colour literal «#fff»/.test(x)) && ctl.some(x=>/--sp-unknown/.test(x)))) fails.push('design-token CONTROL: a colour literal / an undefined token was not caught — the check cannot fail'); }
/* 12) ENGINE SURFACE (AUD1a): src/engine/surface.js lists every name audio.js exports, by the module that calls it. Every listed name
   must be an export of audio.js; every export must be listed (or in SURFACE_INTERNAL); every module's calls into audio.js — static named
   imports, `ns.x` of a namespace import, makeENG's `A.x` (live/eng.js), the render copy's `eng.x` (render.js, probes) — must be listed under
   that module. CONTROL: an unlisted import in a fake module and a listed name that is not exported must both be caught. */
function surfaceUses(f, m){
  const names=new Set();
  for(const im of m.imports){ if(target(f,im.spec)!=='audio.js') continue;
    for(const n of im.names) if(n!=='default') names.add(n);
    if(im.ns) for(const u of m.bare.matchAll(new RegExp('(?<![\\w$.])'+im.ns+'\\.([A-Za-z_$][\\w$]*)','g'))) names.add(u[1]); }
  if(f==='render.js' || f.startsWith('probes/')) for(const u of m.bare.matchAll(/(?<![\w$.])eng\.([A-Za-z_$][\w$]*)/g)) names.add(u[1]);
  if(f==='live/eng.js') for(const u of m.bare.matchAll(/(?<![\w$.])A\.([A-Za-z_$][\w$]*)/g)) names.add(u[1]);
  return names;
}
function surfaceCheck(S, INTERNAL, exportsOf, uses){
  const bad=[], listed=new Set([...Object.values(S).flat(), ...INTERNAL]);
  for(const [caller,L] of Object.entries(S)) for(const n of L) if(!exportsOf.has(n)) bad.push(`engine surface: «${n}» (listed for ${caller}) is not exported by audio.js`);
  for(const n of exportsOf) if(!listed.has(n)) bad.push(`engine surface: audio.js exports «${n}» but src/engine/surface.js does not list it`);
  for(const [f,names] of Object.entries(uses)){ const mine=new Set(S[f]||[]);
    for(const n of names) if(exportsOf.has(n) && !mine.has(n)) bad.push(`engine surface: ${f} calls audio.js «${n}» — not listed under '${f}' in src/engine/surface.js`); }
  return bad;
}
if(mods['engine/surface.js'] && mods['audio.js']){
  /* parsed as TEXT (the checker never runs application code): «'caller':[ 'a', 'b' ]» entries and SURFACE_INTERNAL=[…] */
  const st=mods['engine/surface.js'].code, sm={ SURFACE:{}, SURFACE_INTERNAL:[] }, A=mods['audio.js'].exports, uses={};
  const body=(st.match(/const SURFACE=\{([\s\S]*?)\};/)||[])[1]||'';
  for(const x of body.matchAll(/'([^']+)':\[([^\]]*)\]/g)) sm.SURFACE[x[1]]=[...x[2].matchAll(/'([^']+)'/g)].map(q=>q[1]);
  sm.SURFACE_INTERNAL=[...((st.match(/const SURFACE_INTERNAL=\[([^\]]*)\]/)||[])[1]||'').matchAll(/'([^']+)'/g)].map(q=>q[1]);
  for(const f of files){ if(f==='audio.js') continue; const u=surfaceUses(f, mods[f]); if(u.size) uses[f]=u; }
  fails.push(...surfaceCheck(sm.SURFACE, sm.SURFACE_INTERNAL||[], A, uses));
  const ctl=surfaceCheck({ ...sm.SURFACE, 'ctl.js':['noSuchEngineName'] }, sm.SURFACE_INTERNAL||[], A, { ...uses, 'ctl2.js':new Set(['leadOn']) });
  if(!(ctl.some(x=>/noSuchEngineName/.test(x)) && ctl.some(x=>/ctl2\.js calls audio\.js «leadOn»/.test(x)))) fails.push('engine-surface CONTROL: an unlisted call / a listed non-export was not caught — the check cannot fail');
} else fails.push('src/engine/surface.js is missing (AUD1a engine surface)');
/* 13) ⛳ HARD RULE #38 — AN ENGINE SUBMODULE IS STATELESS (AUD1b): a module under src/modules/ or src/engine/ (the worklet processors in
   src/engine/worklets/ excepted — a processor's state is its job) keeps no state of its own: no top-level `let` / `var`; no top-level table
   (`const X = {}` / `[]` / `new Map|Set|WeakMap|Array|Object(…)`) that the module writes (`X.k = …`, `X[k] = …`, `X.push(…)`, `X.set(…)`,
   `delete X…`, `Object.assign(X, …)` …); it imports only `core/`, `config.js`, `scales.js` and the stateless tree itself (src/modules/**, src/engine/**). What changes while playing
   or is made from a context lives in the engine context E it receives. CONTROLS: a top-level let, a written table and a forbidden import
   must each be caught; a clean module (a frozen table, a function using E) must pass. */
const SL_SCOPE=f=>/^(modules|engine)\//.test(f) && !/^engine\/worklets\//.test(f);
const SL_IMPORT_OK=(f,t)=> t==null || /^core\//.test(t) || t==='config.js' || t==='scales.js' || (SL_SCOPE(t) && SL_SCOPE(f));   // AUD2a: the stateless tree imports itself (effects use the timbre stages and engine/fdn.js)
function statelessCheck(f, bare, imports){
  const out=[]; let depth=0, paren=0; const top=[];   // positions at brace depth 0 and paren depth 0
  for(let i=0;i<bare.length;i++){ const c=bare[i]; if(c==='{') depth++; else if(c==='}') depth--; else if(c==='(') paren++; else if(c===')') paren--;
    else if(depth===0 && paren===0 && /[A-Za-z_$]/.test(c) && (i===0 || !/[\w$.]/.test(bare[i-1]))) top.push(i); }
  const at=i=>bare.slice(0,i).split('\n').length;
  const tables=[];
  for(const i of top){ const w=bare.slice(i, i+12);
    if(/^(let|var)\s/.test(w)) out.push(`${f}:${at(i)}: a top-level «${w.split(/\s/)[0]}» — an engine submodule keeps no state (rule #38): put it in E`);
    const m=/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(\{|\[|new\s+(Map|Set|WeakMap|Array|Object)\b)/.exec(bare.slice(i, i+200)); if(m) tables.push([m[1], at(i)]); }
  for(const [X,line] of tables){ const x=X.replace(/\$/g,'\\$');
    const W=new RegExp(`(?<![\\w$.])${x}\\s*(\\.[A-Za-z_$][\\w$]*|\\[[^\\]]*\\])\\s*(=(?!=)|\\+=|-=|\\*=|/=|\\+\\+|--)|(?<![\\w$.])${x}\\s*\\.\\s*(push|pop|shift|unshift|splice|set|add|delete|clear|fill|sort|reverse|copyWithin)\\s*\\(|delete\\s+${x}\\s*[.[]|Object\\.(assign|defineProperty|defineProperties)\\(\\s*${x}\\b|(?<![\\w$.])${x}\\s*\\.\\s*length\\s*=(?!=)`);
    if(W.test(bare)) out.push(`${f}:${line}: the top-level table «${X}» is written by the module — state belongs in E (rule #38)`); }
  for(const im of imports){ const t=im.t; if(!SL_IMPORT_OK(f,t)) out.push(`${f}: imports «${im.spec}» — an engine submodule imports only core/, config.js, scales.js and its own folder (rule #38)`); }
  return out;
}
for(const f of files) if(SL_SCOPE(f)) fails.push(...statelessCheck(f, mods[f].bare, mods[f].imports.map(im=>({ spec:im.spec, t:target(f,im.spec) }))));
{ const L=s=>lex(s).bare;
  const bad=[ ['modules/timbres/ctl1.js', L('let n=0;\nexport function f(E){ return n++; }'), []],
              ['modules/timbres/ctl2.js', L('const CACHE={};\nexport function f(E,k){ CACHE[k]=E.ac.createGain(); return CACHE[k]; }'), []],
              ['modules/timbres/ctl3.js', L('export function f(E){ return 1; }'), [{ spec:'../../audio.js', t:'audio.js' }]] ];
  const good=['modules/timbres/ctl4.js', L('const T=Object.freeze([1,2]);\nconst M={ a:1 };\nexport function f(E){ for(let i=0;i<T.length;i++){ const g=E.ac.createGain(); } return M.a; }'), [{ spec:'../../core/dsp.js', t:'core/dsp.js' }, { spec:'./fm.js', t:'modules/timbres/fm.js' }]];
  const caught=bad.map(([f,b,i])=>statelessCheck(f,b,i).length>0), clean=statelessCheck(...good);
  if(caught.some(x=>!x) || clean.length) fails.push(`stateless-rule CONTROL: caught ${caught.map(x=>x?'yes':'NO').join('/')} of let / written table / forbidden import; clean module flagged ${clean.length} time(s): ${clean.join(' | ')} — the check cannot fail or flags innocent code`); }
// сведения: неиспользуемые экспорты и импорты. «...x» (spread / rest) counts as a use of x (DAY run, item 0).
const usesName=(t,l)=>new RegExp('(?<![\\w$])(?<!(?<!\\.\\.)\\.)'+l.replace(/\$/g,'\\$')+'(?![\\w$])').test(t);
{ /* CONTROL: a name used only after a spread is used; a name used only as a property is not */
  if(!usesName('f(...noTie)','noTie') || usesName('o.noTie','noTie') || !usesName('[...a, ...b]','b')) fails.push('spread-use CONTROL: «...x» not counted as a use, or «o.x» counted — the unused-import note is wrong'); }
for(const f of files){ const m=mods[f];
  const imported=files.some(g=>mods[g].imports.some(im=>target(g,im.spec)===f));
  if(imported && !wholeNS.has(f)){ const un=[...m.exports].filter(nm=>!used[f].has(nm)); if(un.length) infos.push(`${f}: exported but not imported anywhere — ${un.join(', ')}`); }
  let rest=m.bare; for(const im of m.imports) if(im.at!=null) rest=rest.slice(0,im.at)+' '.repeat(im.len)+rest.slice(im.at+im.len);
  const unusedImp=[]; for(const im of m.imports) for(const l of (im.locals||[])) if(!usesName(rest,l)) unusedImp.push(l);
  if(unusedImp.length) infos.push(`${f}: imported but never used — ${unusedImp.join(', ')}`);
}

console.log(`check-static: ${files.length} modules in src/ (${files.join(', ')})`);
for(const f of files){ const m=mods[f]; console.log(`  ${f.padEnd(18)} exports ${String(m.exports.size).padStart(3)} · imports ${String(m.imports.reduce((n,i)=>n+i.names.length,0)).padStart(3)} names from ${m.imports.length} statements${m.dyn.length?` · dynamic ${m.dyn.join(', ')}`:''}`); }
if(infos.length){ console.log(`\ninformation (${infos.length}):`); infos.forEach(x=>console.log('  · '+x)); }
if(fails.length){ console.log(`\nFAILED (${fails.length}):`); fails.forEach(x=>console.log('  ✗ '+x)); process.exit(1); }
console.log(`\nPASSED: syntax, static imports, export lists, dynamic import targets, argument counts (${nCalls} calls of declared functions), shadowed imports (${nShadow} local declarations), undeclared names (none outside the module, its imports and ${GLOBALS.size} known globals), the network guard (${NET.total} call sites, all listed with a reason; control caught) and the folder rule with import cycles (${LAY.groups.length} import cycle(s), none through a REC folder; control caught) and writes to imported bindings (none; control caught), design tokens and the canvas palette (controls caught) the engine surface (every audio.js call listed; control caught) and rule #38 stateless engine submodules (${files.filter(SL_SCOPE).length} module(s); controls caught) are consistent.`);
