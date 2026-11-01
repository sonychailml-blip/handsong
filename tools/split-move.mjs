/* SPLIT-2: the table-driven mover of a pure-move checkpoint. Each file moves by a prefix table; every relative module specifier (from, import, import(),
   new URL(literal, import.meta.url)) is resolved in the OLD tree and re-relativised in the NEW one; path mentions in text (`src/x`) follow the same table.
     node tools/split-move.mjs <step> --dry     print what would change, touch nothing
     node tools/split-move.mjs <step>           do it */
import { readdirSync, readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), DRY=argv.includes('--dry'), STEP=argv.find(a=>!a.startsWith('--'));
/* first matching prefix wins; a file name or a folder with its slash */
const STEPS={
  B:{ table:[['src/core/','core/pure/'], ['src/views/','core/legacy-ui/views/'], ['src/ui.js','core/legacy-ui/ui.js'], ['src/draw.js','core/legacy-ui/draw.js'],
             ['src/latmeter.js','core/legacy-ui/latmeter.js'], ['src/','core/'], ['data/','core/data/']],
      roots:['src','data'], mustNotExist:['core'],
      /* text mentions: only src/ — a `data/x` in app code still reads correctly relative to core/, and the bundle's generated note must not change */
      token:/(?<![\w-])src\/[\w.*<>\/-]*/g,
      text:['index.html','style.css','tokens.css','tools/*.mjs','tools/*.js','tools/licences.json','tools/listen/*'], textMoved:/\.js$/ },
};
const S=STEPS[STEP]; if(!S){ console.error('usage: split-move.mjs <'+Object.keys(STEPS).join('|')+'> [--dry]'); process.exit(2); }
const SKIP=new Set(['split-move.mjs']);   // the table itself names the old paths
const mapPath=p=>{ for(const [a,b] of S.table) if(a.endsWith('/') ? p.startsWith(a) : p===a) return b+p.slice(a.length); return p; };
const walk=d=>readdirSync(path.join(ROOT,d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? walk(d+'/'+e.name) : [d+'/'+e.name]);
const posix=s=>s.replace(/\\/g,'/');

for(const m of S.mustNotExist) if(existsSync(path.join(ROOT,m))){ console.error(`[split-move] ${m}/ already exists — this step ran already?`); process.exit(1); }
const moved=S.roots.flatMap(walk), plan=moved.map(f=>[f,mapPath(f)]), isModule=/\.(js|mjs|html)$/;
const specRes=[ /(\bfrom\s+['"])(\.\.?\/[^'"\n]+)(['"])/g, /(\bimport\s+['"])(\.\.?\/[^'"\n]+)(['"])/g, /(\bimport\s*\(\s*['"])(\.\.?\/[^'"\n]+)(['"])/g,
  /(new URL\(\s*['"])(\.\.?\/[^'"\n]+)(['"]\s*,\s*import\.meta\.url)/g ];
/* a specifier: resolve from the file's old folder, map, relativise from its new folder; the query (audio.js?render) stays */
function respec(spec, oldF, newF){ const q=spec.indexOf('?'), bare=q<0 ? spec : spec.slice(0,q), tail=q<0 ? '' : spec.slice(q), dir=bare.endsWith('/');
  const abs=posix(path.posix.normalize(path.posix.join(path.posix.dirname(oldF),bare)))+(dir && !bare.endsWith('./') ? '' : '');
  const now=mapPath(dir && !abs.endsWith('/') ? abs+'/' : abs); let r=posix(path.posix.relative(path.posix.dirname(newF), now)); if(!r.startsWith('.')) r='./'+r; if(dir && !r.endsWith('/')) r+='/'; return r+tail; }
const tokens=new Map(), specs=[]; const changes=new Map();
const edit=(file, fn)=>{ const was=readFileSync(path.join(ROOT,file),'utf8'), now=fn(was); if(now!==was) changes.set(file,now); };
/* a sentence's final dot is not part of the path */
const mapTokens=t=>t.replace(S.token, all=>{ const m=all.replace(/\.+$/,''), n=mapPath(m); if(n!==m) tokens.set(m,n); return n+all.slice(m.length); });
for(const [o,n] of plan){ const isText=isModule.test(o)||(S.textMoved && S.textMoved.test(o)); if(!isText) continue;
  const was=readFileSync(path.join(ROOT,o),'utf8'); let t=was;
  for(const re of specRes) t=t.replace(re,(all,a,sp,b)=>{ const r=respec(sp,o,n); if(r!==sp) specs.push(`${n}: ${sp} -> ${r}`); return a+r+b; });
  if(S.textMoved && S.textMoved.test(o)) t=mapTokens(t);
  changes.set(o, t); }
const globs=S.text.flatMap(g=>{ if(!g.includes('*')) return [g]; const [d,pat]=g.split('/*'); return readdirSync(path.join(ROOT,d)).filter(x=>statSync(path.join(ROOT,d,x)).isFile() && (!pat||x.endsWith(pat))).map(x=>d+'/'+x); }).filter(f=>!SKIP.has(path.basename(f)));
for(const f of globs) edit(f,t=>mapTokens(t));

console.log(`[split-move] step ${STEP}: ${plan.filter(([a,b])=>a!==b).length} files move, ${specs.length} specifiers change, ${tokens.size} distinct path mentions change, ${[...changes].filter(([f])=>globs.includes(f)).length} outside files edited`);
if(DRY){ for(const [a,b] of [...tokens].sort()) console.log(`  token ${a} -> ${b}`); for(const s of specs) console.log('  spec '+s); process.exit(0); }
for(const [o,n] of plan){ mkdirSync(path.dirname(path.join(ROOT,n)),{ recursive:true }); renameSync(path.join(ROOT,o),path.join(ROOT,n)); }
const whereNow=new Map(plan);
for(const [f,t] of changes){ const p=path.join(ROOT,whereNow.get(f)||f); const was=readFileSync(p,'utf8'); if(was!==t) writeFileSync(p,t); }
for(const r of S.roots) if(existsSync(path.join(ROOT,r)) && !walk(r).length) rmSync(path.join(ROOT,r),{ recursive:true });
console.log('[split-move] done');
