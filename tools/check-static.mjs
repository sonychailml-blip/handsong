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
   Что сообщается как СВЕДЕНИЕ (не ошибка): экспорты, которых никто не импортирует статически (у модулей, грузимых динамически или
   целиком как пространство имён, не считаются), и импорты, которые модуль больше не упоминает.
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
  'cancelAnimationFrame innerWidth innerHeight devicePixelRatio MediaRecorder MediaStream KeyboardEvent AudioContext OfflineAudioContext webkitAudioContext '+
  'AudioWorkletNode OfflineAudioCompletionEvent DOMException addEventListener removeEventListener MessageChannel PerformanceObserver '+
  /* LAT2: frames to the detection worker */ 'Worker createImageBitmap ImageBitmap '+
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
  'probes/sound.js': { addModule:[2,'probe only (?probe): loads our own src/dyn-worklet.js into the offline contexts of the probe'] },
  'probes/hand.js':  { fetch:[1,'probe only (?probe): reads tools/gesture.print.json from the own origin'] },
  'audio.js':      { addModule:[4,'loads our own worklets (src/ks-, frz-, dyn-, probe-cap-worklet.js) from the own origin into the audio context'] },
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
// сведения: неиспользуемые экспорты и импорты
for(const f of files){ const m=mods[f];
  const imported=files.some(g=>mods[g].imports.some(im=>target(g,im.spec)===f));
  if(imported && !wholeNS.has(f)){ const un=[...m.exports].filter(nm=>!used[f].has(nm)); if(un.length) infos.push(`${f}: exported but not imported anywhere — ${un.join(', ')}`); }
  let rest=m.bare; for(const im of m.imports) if(im.at!=null) rest=rest.slice(0,im.at)+' '.repeat(im.len)+rest.slice(im.at+im.len);
  const unusedImp=[]; for(const im of m.imports) for(const l of (im.locals||[])) if(!new RegExp('(?<![\\w$.])'+l.replace(/\$/g,'\\$')+'(?![\\w$])').test(rest)) unusedImp.push(l);
  if(unusedImp.length) infos.push(`${f}: imported but never used — ${unusedImp.join(', ')}`);
}

console.log(`check-static: ${files.length} modules in src/ (${files.join(', ')})`);
for(const f of files){ const m=mods[f]; console.log(`  ${f.padEnd(18)} exports ${String(m.exports.size).padStart(3)} · imports ${String(m.imports.reduce((n,i)=>n+i.names.length,0)).padStart(3)} names from ${m.imports.length} statements${m.dyn.length?` · dynamic ${m.dyn.join(', ')}`:''}`); }
if(infos.length){ console.log(`\ninformation (${infos.length}):`); infos.forEach(x=>console.log('  · '+x)); }
if(fails.length){ console.log(`\nFAILED (${fails.length}):`); fails.forEach(x=>console.log('  ✗ '+x)); process.exit(1); }
console.log(`\nPASSED: syntax, static imports, export lists, dynamic import targets, argument counts (${nCalls} calls of declared functions), shadowed imports (${nShadow} local declarations), undeclared names (none outside the module, its imports and ${GLOBALS.size} known globals), the network guard (${NET.total} call sites, all listed with a reason; control caught) and the folder rule with import cycles (${LAY.groups.length} import cycle(s), none through a REC folder; control caught) are consistent.`);
