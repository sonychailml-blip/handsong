/* DOC1 leftover (RUN 5) — docs/NAME-INDEX.md GENERATED FROM THE CODE. Dev tool; reads files as TEXT (never runs app code).
     node tools/name-index.mjs           check: the file equals the generated text (exit 0 / 1)
     node tools/name-index.mjs --write   regenerate docs/NAME-INDEX.md
   Also run by tools/probe-data.mjs as the row «NAME-INDEX current» (with a CONTROL: one added export must change the text).
   Per module under src/ (path order): the first sentence of its head comment and every exported name with its kind (fn, const, let, class,
   re-export «→ from»). The hand-kept list of removed names lives in docs/STALE-NAMES.md and is copied in at the end. The hand-written index
   as it stood before this tool: archive/NAME-INDEX-before-RUN5.md (moved word for word). */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lex } from './lex.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT='docs/NAME-INDEX.md', STALE='docs/STALE-NAMES.md';
const listJs=(d)=>readdirSync(join(ROOT,d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? listJs(d+'/'+e.name) : e.name.endsWith('.js') ? [d+'/'+e.name] : []);
export function gather(){
  const texts={}; for(const f of listJs('src').sort()) texts[f]=readFileSync(join(ROOT,f),'utf8');
  return { texts, stale: existsSync(join(ROOT,STALE)) ? readFileSync(join(ROOT,STALE),'utf8') : '' };
}
/* the first sentence of the file's head comment (block or line comments before the first code), one line, at most 200 characters */
function headLine(src){
  const m=/^\s*(?:\/\*([\s\S]*?)\*\/|((?:\s*\/\/[^\n]*\n?)+))/.exec(src); if(!m) return '';
  const t=(m[1]!=null ? m[1] : m[2].replace(/^\s*\/\/ ?/gm,'')).replace(/\s+/g,' ').trim();
  const s=(/^(.*?[.!?])(\s|$)/.exec(t)||[null,t])[1];
  return s.length>200 ? s.slice(0,197)+'…' : s;
}
/* every exported name of one module with its kind */
function exportsOf(src){
  const code=lex(src).code, out=[], imp=new Map();
  for(const m of code.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/g))
    for(const part of m[1].split(',').map(s=>s.trim()).filter(Boolean)){ const [a,b]=part.split(/\s+as\s+/); imp.set((b||a).trim(), m[3]); }
  const kindOf=name=>{
    const q=name.replace(/\$/g,'\\$'), re=n=>new RegExp(`(?:^|[\\s;}])(?:async\\s+)?${n}\\s+${q}\\b`,'m');
    if(re('function\\*?').test(code)) return 'fn'; if(re('class').test(code)) return 'class';
    if(re('let').test(code)||re('var').test(code)) return 'let'; if(re('const').test(code)) return 'const';
    if(imp.has(name)) return '→ '+imp.get(name);   // an imported name exported again (a facade)
    /* declared in a comma list («const a=1, name=2»): the nearest declaration keyword before it, if no «;» lies between */
    const m=new RegExp(`[,]\\s*${q}\\s*=(?!=)`).exec(code); if(m){ const before=code.slice(0,m.index);
      const k=Math.max(before.lastIndexOf('const '), before.lastIndexOf('let '), before.lastIndexOf('var ')), sc=before.lastIndexOf(';');
      if(k>sc) return before.startsWith('const ',k) ? 'const' : 'let'; }
    return '?'; };
  for(const m of code.matchAll(/\bexport\s+(?:async\s+)?(function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g))
    out.push({ name:m[2], kind: m[1].startsWith('function') ? 'fn' : m[1]==='var' ? 'let' : m[1] });
  for(const m of code.matchAll(/\bexport\s*\{([^}]*)\}\s*(?:from\s*(['"])([^'"]+)\2)?/g)){
    for(const part of m[1].split(',').map(s=>s.trim()).filter(Boolean)){ const [a,b]=part.split(/\s+as\s+/); const name=(b||a).trim();
      out.push({ name, kind: m[3] ? '→ '+m[3] : kindOf(a.trim()) }); } }
  if(/\bexport\s+default\b/.test(code)) out.push({ name:'default', kind:'default' });
  return out;
}
export function build(inp){
  const L=['# NAME INDEX — code names by module (GENERATED — do not edit by hand)','',
    '_Generated from `src/` by `node tools/name-index.mjs --write`; checked by the data runner (row «NAME-INDEX current»). Consult by grep.',
    'Kinds: fn, const, let, class, «→ ./x.js» a re-export. Meaning of a name: the code and `archive/CLAUDE-history.md`. The hand-written index',
    'before this tool: `archive/NAME-INDEX-before-RUN5.md`. Removed names: the end of this file (kept by hand in `docs/STALE-NAMES.md`)._',''];
  let nMod=0, nName=0;
  for(const [f,src] of Object.entries(inp.texts)){ nMod++;
    const ex=exportsOf(src), h=headLine(src); nName+=ex.length;
    L.push(`## ${f}`, h ? `${h}` : '(no head comment)');
    if(!ex.length){ L.push('- exports: none',''); continue; }
    const byKind=new Map(); for(const x of ex){ if(!byKind.has(x.kind)) byKind.set(x.kind,[]); byKind.get(x.kind).push(x.name); }
    for(const [k,names] of [...byKind].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)) L.push(`- ${k} (${names.length}): ${names.map(n=>'`'+n+'`').join(', ')}`);
    L.push(''); }
  L.push(`_${nMod} modules, ${nName} exported names._`,'');
  if(inp.stale) L.push(inp.stale.trimEnd(),'');
  return L.join('\n');
}
export function run(){
  const inp=gather(), want=build(inp), have=existsSync(join(ROOT,OUT)) ? readFileSync(join(ROOT,OUT),'utf8') : null, d=[];
  if(have!==want) d.push(`${OUT} is out of date — run: node tools/name-index.mjs --write`);
  /* CONTROL: one added export in a copy of a module must change the text */
  const f=Object.keys(inp.texts)[0], ctl={ ...inp, texts:{ ...inp.texts, [f]:inp.texts[f]+'\nexport const __nameIndexProbe=1;\n' } };
  if(build(ctl)===want) d.push('CONTROL: an added export did not change the generated index — the check cannot fail');
  return { cases:2, total:d.length, differences:d };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  if(process.argv.includes('--write')){ writeFileSync(join(ROOT,OUT), build(gather())); console.log(`[name-index] wrote ${OUT}`); }
  const r=run(); for(const x of r.differences) console.log('  ✗ '+x);
  console.log(`[name-index] ${r.total?'NOT A PASS':'PASS'} — ${r.cases} cases, ${r.total} differences`);
  process.exitCode=r.total?1:0;
}
