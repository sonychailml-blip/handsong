/* SPLIT-2: the table-driven mover of a pure-move checkpoint. Each file moves by a prefix table; every relative module specifier (from, import, import(),
   new URL(literal, import.meta.url)) is resolved in the OLD tree and re-relativised in the NEW one; path mentions in text (`core/x`) follow the same table.
     node tools/split-move.mjs <step> --dry     print what would change, touch nothing
     node tools/split-move.mjs <step>           do it */
import { readdirSync, readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), DRY=argv.includes('--dry'), STEP=argv.find(a=>!a.startsWith('--'));
const each=(names,from,to)=>names.split(' ').map(n=>[from+n+'.js',to+n+'.js']);
/* first matching prefix wins; a file name or a folder with its slash */
const STEPS={
  B:{ table:[['src/core/','core/pure/'], ['src/views/','core/legacy-ui/views/'], ['src/ui.js','core/legacy-ui/ui.js'], ['src/draw.js','core/legacy-ui/draw.js'],
             ['src/latmeter.js','core/legacy-ui/latmeter.js'], ['src/','core/'], ['data/','core/data/']],
      roots:['src','data'], mustNotExist:['core'],
      /* text mentions: only src/ — a `data/x` in app code still reads correctly relative to core/, and the bundle's generated note must not change */
      token:/(?<![\w-])src\/[\w.*<>\/-]*/g,
      text:['index.html','style.css','tokens.css','tools/*.mjs','tools/*.js','tools/licences.json','tools/listen/*'] },
  C:{ table:[['core/main.js','core/legacy-ui/boot.js'], ['core/calmshell.js','apps/night/shell.js'], ['core/ghost.js','apps/night/ghost.js'],
             ...each('tutor demo songs','core/','apps/full/'), ['core/userfiles.js','tools/probes/core/userfiles.js'], ['core/scaleprobe.js','tools/probes/full.js'],
             ['core/probedata.js','tools/probes/core/probedata.js'], ['core/pure/night.js','apps/night/pure/cycle.js'], ...each('forestlife fireflies','core/pure/','apps/night/pure/'),
             ...each('forest forest-life forest-detail forest-rare','core/legacy-ui/views/scene/','apps/night/scene/'),
             ['core/data/profiles/full.json','apps/full/data/full.json'], ['core/data/profiles/calm.json','apps/night/data/night.json'], ['core/data/songs/','apps/full/data/songs/'],
             ['fonts/','apps/night/fonts/'], ['vendor/','apps/night/vendor/'], ['icons/','apps/full/icons/'],
             ...each('calm forest nightguard','core/probes/','tools/probes/night/'),
             ...each('autosave cmd edit freeze history ids key seed song1 song2 songfile tim3d tuning window kit-none','core/probes/','tools/probes/full/').filter(([a])=>!a.includes('kit-none')),
             ['core/probes/','tools/probes/core/'],
             ...['gold.print.json','census.print.json','gesture.print.json','song.print.json','night.print.json','scales.before.json','timbres.before.json'].map(n=>['tools/'+n,'tools/prints/'+n]),
             ['index.html','apps/full/index.html'], ['manifest.json','apps/full/manifest.json'], ['sw.js','apps/full/sw.js'], ['style.css','core/legacy-ui/style.css'], ['tokens.css','core/tokens.css']],
      files:['index.html','manifest.json','sw.js','style.css','tokens.css','tools/gold.print.json','tools/census.print.json','tools/gesture.print.json','tools/song.print.json','tools/night.print.json','tools/scales.before.json','tools/timbres.before.json'],
      roots:['core','fonts','vendor','icons'], mustNotExist:['apps','tools/probes','tools/prints'],
      token:/(?<![\w-])(?:core|fonts|vendor|icons|tools)\/[\w.*<>\/-]*/g,
      rewrite:['core','tools/listen'],   // modules that stay in place still import the moved ones
      text:['core/**','tools/*.mjs','tools/*.js','tools/licences.json','tools/listen/*'] },
};
const S=STEPS[STEP]; if(!S){ console.error('usage: split-move.mjs <'+Object.keys(STEPS).join('|')+'> [--dry]'); process.exit(2); }
const SKIP=new Set(['split-move.mjs']);   // the table itself names the old paths
const mapPath=p=>{ for(const [a,b] of S.table) if(a.endsWith('/') ? p.startsWith(a) : p===a) return b+p.slice(a.length); return p; };
const walk=d=>readdirSync(path.join(ROOT,d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? walk(d+'/'+e.name) : [d+'/'+e.name]);
const posix=s=>s.replace(/\\/g,'/');
const isJs=f=>/\.(js|mjs)$/.test(f) && !/three\.min\.js$/.test(f);

for(const m of S.mustNotExist) if(existsSync(path.join(ROOT,m))){ console.error(`[split-move] ${m} already exists — this step ran already?`); process.exit(1); }
const moved=[...S.roots.flatMap(walk), ...(S.files||[])], plan=moved.map(f=>[f,mapPath(f)]).filter(([a,b])=>a!==b), whereNow=new Map(plan);
const specRes=[ /(\bfrom\s+['"])(\.\.?\/[^'"\n]+)(['"])/g, /(\bimport\s+['"])(\.\.?\/[^'"\n]+)(['"])/g, /(\bimport\s*\(\s*['"])(\.\.?\/[^'"\n]+)(['"])/g,
  /(new URL\(\s*['"])(\.\.?\/[^'"\n]+)(['"]\s*,\s*import\.meta\.url)/g ];
/* a specifier: resolve from the file's old folder, map, relativise from its new folder; the query (audio.js?render) stays */
function respec(spec, oldF, newF){ const q=spec.indexOf('?'), bare=q<0 ? spec : spec.slice(0,q), tail=q<0 ? '' : spec.slice(q), dir=bare.endsWith('/');
  const abs=posix(path.posix.normalize(path.posix.join(path.posix.dirname(oldF),bare)));
  const now=mapPath(abs); let r=posix(path.posix.relative(path.posix.dirname(newF), now)); if(!r.startsWith('.')) r='./'+r; if(dir && !r.endsWith('/')) r+='/'; return r+tail; }
const tokens=new Map(), specs=[], changes=new Map();
/* a sentence's final dot is not part of the path */
const mapTokens=t=>t.replace(S.token, all=>{ const m=all.replace(/\.+$/,''), n=mapPath(m); if(n!==m) tokens.set(m,n); return n+all.slice(m.length); });
const rewriteSet=new Set([...plan.map(([a])=>a).filter(isJs), ...(S.rewrite||[]).flatMap(walk).filter(isJs)]);
for(const o of rewriteSet){ const n=whereNow.get(o)||o; let t=readFileSync(path.join(ROOT,o),'utf8');
  for(const re of specRes) t=t.replace(re,(all,a,sp,b)=>{ const r=respec(sp,o,n); if(r!==sp) specs.push(`${n}: ${sp} -> ${r}`); return a+r+b; });
  changes.set(o,t); }
const expand=g=>{ if(g.endsWith('/**')) return walk(g.slice(0,-3)).filter(f=>isJs(f)); if(!g.includes('*')) return [g]; const [d,pat]=g.split('/*'); return readdirSync(path.join(ROOT,d),{ withFileTypes:true }).filter(e=>e.isFile() && (!pat||e.name.endsWith(pat))).map(e=>d+'/'+e.name); };
const textFiles=[...new Set([...S.text.flatMap(expand), ...plan.map(([a])=>a).filter(isJs)])].filter(f=>!SKIP.has(path.basename(f)));
for(const f of textFiles){ const was=changes.has(f) ? changes.get(f) : readFileSync(path.join(ROOT,f),'utf8'), now=mapTokens(was); if(now!==was || changes.has(f)) changes.set(f,now); }

console.log(`[split-move] step ${STEP}: ${plan.length} files move, ${specs.length} specifiers change, ${tokens.size} distinct path mentions change`);
if(DRY){ for(const [a,b] of [...tokens].sort()) console.log(`  token ${a} -> ${b}`); for(const s of specs) console.log('  spec '+s); process.exit(0); }
for(const [o,n] of plan){ mkdirSync(path.dirname(path.join(ROOT,n)),{ recursive:true }); renameSync(path.join(ROOT,o),path.join(ROOT,n)); }
for(const [f,t] of changes){ const p=path.join(ROOT,whereNow.get(f)||f); if(readFileSync(p,'utf8')!==t) writeFileSync(p,t); }
const prune=d=>{ for(const e of readdirSync(path.join(ROOT,d),{ withFileTypes:true })) if(e.isDirectory()) prune(d+'/'+e.name); if(!readdirSync(path.join(ROOT,d)).length) rmSync(path.join(ROOT,d),{ recursive:true }); };
for(const r of S.roots) if(existsSync(path.join(ROOT,r))) prune(r);
console.log('[split-move] done');
