/* SPLIT-2 (plan §6): assembles a deployable tree for ONE app. Node builtins only; no bundling: the tree mirrors the repo, so no import is rewritten and only the page moves up to the root.
     HANDSONG_APP=full|night node tools/build.mjs [--out DIR] [--probes]
   No HANDSONG_APP = failure, never a silent Full (a Vercel project without the variable keeps its old deployment).
   A PREVIEW (VERCEL_ENV=preview, or --probes) keeps `?probe`: the page's probes tag, this app's probe suites, the prints. Production has none of it.
   HANDSONG_EDITION=release writes EDITION='release' into the built copy, which hides the development items of Night's ⓘ card (plan Q3). */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), posix=path.posix;
const die=s=>{ console.error('[build] FAILED — '+s); process.exit(1); };
const app=process.env.HANDSONG_APP; if(!['full','night'].includes(app)) die('HANDSONG_APP must be full or night (Vercel: Settings → Environment Variables)');
const other=app==='full' ? 'night' : 'full', i=argv.indexOf('--out'), OUT=path.resolve(ROOT, i>=0 ? argv[i+1] : 'dist');
const PREVIEW=argv.includes('--probes') || process.env.VERCEL_ENV==='preview', RELEASE=process.env.HANDSONG_EDITION==='release';
const PAGE_LEVEL=['manifest.json','sw.js','icons'], BASE=`apps/${app}`;
const noDocs=f=>!f.toLowerCase().endsWith('.md');
const copyTree=(from,to,keep=noDocs)=>cpSync(path.join(ROOT,from),path.join(OUT,to),{ recursive:true, filter:s=>statSync(s).isDirectory() || keep(s) });

rmSync(OUT,{ recursive:true, force:true }); mkdirSync(OUT,{ recursive:true });
copyTree('core','core');
copyTree(BASE,BASE,f=>{ const r=path.relative(path.join(ROOT,BASE),f).replace(/\\/g,'/'); return noDocs(f) && r!=='index.html' && !PAGE_LEVEL.some(p=>r===p||r.startsWith(p+'/')); });
for(const f of PAGE_LEVEL){ copyTree(`${BASE}/${f}`,f); rmSync(path.join(OUT,BASE,f),{ recursive:true, force:true }); }
copyFileSync(path.join(ROOT,'THIRD-PARTY-LICENSES.md'),path.join(OUT,'THIRD-PARTY-LICENSES.md'));
if(RELEASE) writeFileSync(path.join(OUT,'core/edition.js'),"export const EDITION='release';\n");

/* the page: its references gain the app's folder; page-level ones and addresses stay. Production loses the probes tag */
function rebasePage(html){
  let h=html;
  if(!PREVIEW) h=h.replace(/<!-- SPLIT-2: read only under \?probe[^\n]*-->\r?\n/,'').replace(/<link rel="handsong-probes"[^>]*>\r?\n/,'');
  return h.replace(/\b(src|href)="([^"]+)"/g,(all,k,u)=>{ if(/^([a-z]+:|\/|#)/i.test(u) || PAGE_LEVEL.some(p=>u===p||u.startsWith(p+'/'))) return all; return `${k}="${posix.normalize(posix.join(BASE,u))}"`; });
}
writeFileSync(path.join(OUT,'index.html'),rebasePage(readFileSync(path.join(ROOT,BASE,'index.html'),'utf8')));

if(PREVIEW){
  for(const d of ['core',app]) copyTree(`tools/probes/${d}`,`tools/probes/${d}`);
  copyFileSync(path.join(ROOT,`tools/probes/${app}.js`),(mkdirSync(path.join(OUT,'tools/probes'),{ recursive:true }),path.join(OUT,`tools/probes/${app}.js`)));
  copyTree('tools/prints','tools/prints');
  copyFileSync(path.join(ROOT,'tools/pack-test-licence.json'),path.join(OUT,'tools/pack-test-licence.json'));
  /* row «FULL untouched»: its control reads Night's caps from Night's record */
  if(app==='full'){ mkdirSync(path.join(OUT,'apps/night/data'),{ recursive:true }); copyFileSync(path.join(ROOT,'apps/night/data/night.json'),path.join(OUT,'apps/night/data/night.json')); }
}

/* --------- verify: every relative load from the page resolves inside the tree; production holds no other app and no tool --------- */
const bad=[], seen=new Set(), SPEC=[/\bfrom\s+['"](\.\.?\/[^'"\n]+)['"]/g, /\bimport\s+['"](\.\.?\/[^'"\n]+)['"]/g, /\bimport\s*\(\s*['"](\.\.?\/[^'"\n]+)['"]\s*\)/g, /new URL\(\s*['"](\.\.?\/[^'"\n]+)['"]\s*,\s*import\.meta\.url/g];
const stripComments=t=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^\s*\/\/[^\n]*$/gm,' ');
function walkModule(f){ if(seen.has(f)) return; seen.add(f); const p=path.join(OUT,f); if(!existsSync(p)){ bad.push('missing: '+f); return; }
  if(/\/vendor\//.test(f)) return;
  if(f.endsWith('.css')){ for(const m of stripComments(readFileSync(p,'utf8')).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if(!/^(data:|https?:|#)/.test(m[1])) walkModule(posix.normalize(posix.join(posix.dirname(f),m[1]))); return; }
  if(!f.endsWith('.js')) return;
  const t=stripComments(readFileSync(p,'utf8'));
  for(const re of SPEC) for(const m of t.matchAll(re)){ const u=m[1].split('?')[0], to=posix.normalize(posix.join(posix.dirname(f),u)); if(to.startsWith('..')){ bad.push(`${f}: ${m[1]} leaves the tree`); continue; } if(to.endsWith('/')){ if(!existsSync(path.join(OUT,to))) bad.push(`${f}: folder ${to} is missing`); continue; } walkModule(to); } }
const page=readFileSync(path.join(OUT,'index.html'),'utf8').replace(/<!--[\s\S]*?-->/g,' ');
for(const m of page.matchAll(/\b(?:src|href)="([^"]+)"/g)){ const u=m[1]; if(/^([a-z]+:|\/|#)/i.test(u)) continue; walkModule(u.split(/[?#]/)[0]); }
for(const f of ['core/engine/worklets/ks-worklet.js','core/engine/worklets/frz-worklet.js','core/engine/worklets/dyn-worklet.js','core/engine/worklets/probe-cap-worklet.js','core/hand-worker.js','core/data/timbres.bundle.json','core/data/index.json']) walkModule(f);
const listAll=d=>readdirSync(d,{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? listAll(path.join(d,e.name)) : [path.join(d,e.name)]);
const all=listAll(OUT).map(f=>path.relative(OUT,f).replace(/\\/g,'/')).sort();
if(!PREVIEW){ if(existsSync(path.join(OUT,'tools'))) bad.push('production holds tools/'); if(/handsong-probes/.test(page)) bad.push('production keeps the probes tag'); if(existsSync(path.join(OUT,'apps',other))) bad.push('production holds the other app'); }
else if(existsSync(path.join(OUT,'apps',other)) && (other==='full' || all.some(f=>f.startsWith('apps/night/')&&f!=='apps/night/data/night.json'))) bad.push('a preview holds more of the other app than the probes need');
if(!/rel="handsong-profile"/.test(page)) bad.push('the page declares no profile');
if(bad.length){ for(const b of bad.slice(0,30)) console.error('  '+b); die(bad.length+' problem(s)'); }
const bytes=all.reduce((n,f)=>n+statSync(path.join(OUT,f)).size,0), h=createHash('sha256'); for(const f of all){ h.update(f); h.update(readFileSync(path.join(OUT,f))); }
console.log(`[build] PASS — ${app}${PREVIEW?' · preview: ?probe kept':' · production: no probes'}${RELEASE?' · release edition':''} · ${all.length} files, ${(bytes/1048576).toFixed(1)} MB, ${seen.size} loads resolved · tree ${h.digest('hex').slice(0,16)} → ${path.relative(ROOT,OUT).replace(/\\/g,'/')}`);
