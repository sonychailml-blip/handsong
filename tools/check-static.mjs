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
        аргументов — не ошибка (умолчания). Методы (`x.имя(`), стрелочные функции и имена, объявленные в модуле дважды, не проверяются.
   Что сообщается как СВЕДЕНИЕ (не ошибка): экспорты, которых никто не импортирует статически (у модулей, грузимых динамически или
   целиком как пространство имён, не считаются), и импорты, которые модуль больше не упоминает.
   Разбор — лексический: строки, шаблоны (с вложенными ${…}), регулярные выражения и комментарии различаются; полного парсера JS здесь нет,
   и он не нужен — синтаксис уже проверил node. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC=join(ROOT,'src');
const files=readdirSync(SRC).filter(f=>f.endsWith('.js')).sort();

/* ЛЕКСЕР: вырезает комментарии (заменяя пробелами — смещения и переводы строк сохраняются); bare — то же, но и содержимое строк,
   шаблонов и регулярных выражений заменено пробелами (для поиска упоминаний имён). */
const KW=new Set(['return','typeof','case','in','of','new','delete','void','throw','instanceof','do','else','yield','await']);
function lex(src){
  const n=src.length; let code='', bare='', i=0;
  const tpl=[];   // стек глубины фигурных скобок внутри ${…} шаблонов
  let brace=0, last='';   // last — последний значимый символ/слово (для различения / как деления и как регулярки)
  const put=(c,b)=>{ code+=c; bare+=(b===undefined?c:b); };
  const blank=s=>s.replace(/[^\n]/g,' ');
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/'&&d==='/'){ let j=src.indexOf('\n',i); if(j<0) j=n; const s=src.slice(i,j); put(blank(s),blank(s)); i=j; continue; }
    if(c==='/'&&d==='*'){ let j=src.indexOf('*/',i+2); j= j<0 ? n : j+2; const s=src.slice(i,j); put(blank(s),blank(s)); i=j; continue; }
    if(c==="'"||c==='"'){ let j=i+1; while(j<n&&src[j]!==c){ if(src[j]==='\\') j++; j++; } j++; const s=src.slice(i,j); put(s, c+blank(s.slice(1,-1))+c); i=j; last='str'; continue; }
    if(c==='`'||(c==='}'&&tpl.length&&tpl[tpl.length-1]===brace)){
      if(c==='}') tpl.pop();
      let j=i+1; while(j<n){ if(src[j]==='\\'){ j+=2; continue; } if(src[j]==='`'){ j++; break; } if(src[j]==='$'&&src[j+1]==='{'){ j+=2; tpl.push(brace); break; } j++; }
      const s=src.slice(i,j); put(s, s[0]+blank(s.slice(1))); i=j; last='str'; continue;
    }
    if(c==='/'){
      const regex = last===''||/[(,=:[!&|?{};+\-*%<>~^]/.test(last)||KW.has(last);
      if(regex){ let j=i+1, cls=false; while(j<n){ const e=src[j]; if(e==='\\'){ j+=2; continue; } if(e==='[') cls=true; else if(e===']') cls=false; else if(e==='/'&&!cls) break; else if(e==='\n') break; j++; }
        j++; while(j<n&&/[a-z]/i.test(src[j])) j++; const s=src.slice(i,j); put(s, s.replace(/[^\n]/g,' ')); i=j; last='re'; continue; }
    }
    if(c==='{') brace++; else if(c==='}') brace--;
    if(/[A-Za-z_$]/.test(c)){ let j=i; while(j<n&&/[\w$]/.test(src[j])) j++; const w=src.slice(i,j); put(w); last=w; i=j; continue; }
    if(!/\s/.test(c)) last=c;
    put(c); i++;
  }
  return { code, bare };
}

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
// сведения: неиспользуемые экспорты и импорты
for(const f of files){ const m=mods[f];
  const imported=files.some(g=>mods[g].imports.some(im=>target(g,im.spec)===f));
  if(imported && !wholeNS.has(f)){ const un=[...m.exports].filter(nm=>!used[f].has(nm)); if(un.length) infos.push(`${f}: exported but not imported anywhere — ${un.join(', ')}`); }
  let rest=m.bare; for(const im of m.imports) if(im.at!=null) rest=rest.slice(0,im.at)+' '.repeat(im.len)+rest.slice(im.at+im.len);
  const unusedImp=[]; for(const im of m.imports) for(const l of (im.locals||[])) if(!new RegExp('(?<![\\w$.])'+l.replace(/\$/g,'\\$')+'(?![\\w$])').test(rest)) unusedImp.push(l);
  if(unusedImp.length) infos.push(`${f}: imported but never used — ${unusedImp.join(', ')}`);
}

console.log(`check-static: ${files.length} modules in src/ (${files.join(', ')})`);
for(const f of files){ const m=mods[f]; console.log(`  ${f.padEnd(16)} exports ${String(m.exports.size).padStart(3)} · imports ${String(m.imports.reduce((n,i)=>n+i.names.length,0)).padStart(3)} names from ${m.imports.length} statements${m.dyn.length?` · dynamic ${m.dyn.join(', ')}`:''}`); }
if(infos.length){ console.log(`\ninformation (${infos.length}):`); infos.forEach(x=>console.log('  · '+x)); }
if(fails.length){ console.log(`\nFAILED (${fails.length}):`); fails.forEach(x=>console.log('  ✗ '+x)); process.exit(1); }
console.log(`\nPASSED: syntax, static imports, export lists, dynamic import targets and argument counts (${nCalls} calls of declared functions) are consistent.`);
