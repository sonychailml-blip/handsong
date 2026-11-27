/* SPLIT-2 (plan §6): assembles a deployable tree for ONE app. Node builtins only; no bundling: the tree mirrors the repo, so no import is rewritten and only the page moves up to the root.
     HANDSONG_APP=full|night node tools/build.mjs [--out DIR] [--probes]
   No HANDSONG_APP = failure, never a silent Full (a Vercel project without the variable keeps its old deployment).
   A PREVIEW (VERCEL_ENV=preview, or --probes) keeps `?probe`: the page's probes tag, this app's probe suites, the prints. Production has none of it.
   HANDSONG_EDITION=release writes EDITION='release' into the built copy, which hides the development items of Night's ⓘ card (plan Q3).
   NIGHT-14: a players' Night build (release) leaves the development rooms out; every Night build writes its precache list into sw.js (tools/precache.mjs). */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { precachePaths, writePrecache, NIGHT_SKIP, NIGHT_LATER, NIGHT_INCLUDE, NIGHT_DEMAND } from './precache.mjs';   // NIGHT-14
import { renderNightLicences } from './check-licences.mjs';   // NIGHT-15: Night's «Licences» page

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), argv=process.argv.slice(2), posix=path.posix;
const die=s=>{ console.error('[build] FAILED — '+s); process.exit(1); };
const app=process.env.HANDSONG_APP; if(!['full','night','light'].includes(app)) die('HANDSONG_APP must be full, night or light (Vercel: Settings → Environment Variables)');   // LIGHT-7: + light
const others=['full','night','light'].filter(a=>a!==app), other=app==='full' ? 'night' : 'full', i=argv.indexOf('--out'), OUT=path.resolve(ROOT, i>=0 ? argv[i+1] : 'dist');
/* NIGHT-7: Night's Vercel PRODUCTION build is the release edition by itself (no development items for players), unless HANDSONG_EDITION=dev */
const PREVIEW=argv.includes('--probes') || process.env.VERCEL_ENV==='preview', RELEASE=process.env.HANDSONG_EDITION==='release' || (app==='night' && process.env.VERCEL_ENV==='production' && process.env.HANDSONG_EDITION!=='dev');
const PAGE_LEVEL=['manifest.json','sw.js','icons', ...(app==='night' ? ['licences.html'] : [])], BASE=`apps/${app}`;   // NIGHT-15: Night's «Licences» page sits beside the page
const noDocs=f=>!f.toLowerCase().endsWith('.md');
const copyTree=(from,to,keep=noDocs)=>cpSync(path.join(ROOT,from),path.join(OUT,to),{ recursive:true, filter:s=>statSync(s).isDirectory() || keep(s) });

rmSync(OUT,{ recursive:true, force:true }); mkdirSync(OUT,{ recursive:true });
copyTree('core','core');
copyTree(BASE,BASE,f=>{ const r=path.relative(path.join(ROOT,BASE),f).replace(/\\/g,'/'); return noDocs(f) && r!=='index.html' && !PAGE_LEVEL.some(p=>r===p||r.startsWith(p+'/')); });
for(const f of PAGE_LEVEL){ copyTree(`${BASE}/${f}`,f); rmSync(path.join(OUT,BASE,f),{ recursive:true, force:true }); }
copyFileSync(path.join(ROOT,'THIRD-PARTY-LICENSES.md'),path.join(OUT,'THIRD-PARTY-LICENSES.md'));
/* NIGHT-15: Night's «Licences» page lives next to the page (its link is page-relative: «licences.html»), written again from the register here —
   after the development rooms are gone (below), so a players' build lists only what it carries */
const nightLicences=()=>{ rmSync(path.join(OUT,'apps/night/licences.html'),{ force:true });
  writeFileSync(path.join(OUT,'licences.html'), renderNightLicences(JSON.parse(readFileSync(path.join(ROOT,'tools/licences.json'),'utf8')), f=>existsSync(path.join(OUT,f)))); };
if(RELEASE) writeFileSync(path.join(OUT,'core/edition.js'),"export const EDITION='release';\n");
/* RAIN-R1: the rain is a real room — a players' build carries it (its media are listed on demand: tools/precache.mjs NIGHT_DEMAND). RELEASE-1: its
   recordings (rooms/rain/samples/) too — the lo-fi bed plays its bass, vibraphone and drums from them (rain/lofi.js sampledLoad); a players' build
   without them had no rain music (the founder heard it on the site) */
if(app==='night') nightLicences();

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
const listDirs=d=>readdirSync(d,{ withFileTypes:true }).filter(e=>e.isDirectory()).flatMap(e=>[...listDirs(path.join(d,e.name)), path.join(d,e.name)]);   // LIGHT-7: deepest first
const all=listAll(OUT).map(f=>path.relative(OUT,f).replace(/\\/g,'/')).sort();
if(!PREVIEW){ if(existsSync(path.join(OUT,'tools'))) bad.push('production holds tools/'); if(/handsong-probes/.test(page)) bad.push('production keeps the probes tag'); for(const o of others) if(existsSync(path.join(OUT,'apps',o))) bad.push('production holds the other app '+o); }
else if(existsSync(path.join(OUT,'apps',other)) && (other==='full' || all.some(f=>f.startsWith('apps/night/')&&f!=='apps/night/data/night.json'))) bad.push('a preview holds more of the other app than the probes need');
if(!/rel="handsong-profile"/.test(page)) bad.push('the page declares no profile');
if(RELEASE && app==='night'){ for(const f of ['apps/night/rooms/rain/rain.js', 'apps/night/rooms/rain/install.js', 'apps/night/rooms/rain/still/still-reduced.webp', 'apps/night/rooms/rain/still/still-full.webp', 'apps/night/rooms/rain/city/windows.json'])
    if(!existsSync(path.join(OUT, f))) bad.push(`a players' build lacks the rain room's ${f} (RAIN-R1: a real room)`);
  { const sm=path.join(OUT,'apps/night/rooms/rain/samples'), M=existsSync(path.join(sm,'samples.json')) ? JSON.parse(readFileSync(path.join(sm,'samples.json'),'utf8')) : null;   // RELEASE-1: the music's recordings, every one
    if(!M) bad.push("a players' build lacks the rain music's recordings (rooms/rain/samples/samples.json)"); else for(const f of Object.values(M.files)) if(!existsSync(path.join(sm,f.file))) bad.push("a players' build lacks the rain music's "+f.file); } }
if(bad.length){ for(const b of bad.slice(0,30)) console.error('  '+b); die(bad.length+' problem(s)'); }
/* LIGHT-7 (the founder: «only what it really has»): Light's tree keeps of core/ only the modules its page reaches (the walk above: static, literal
   dynamic and new URL imports) and what is fetched by name while it runs — the data (core/data/), the hand model and its library (core/vendor/), the
   audio worklets (core/engine/worklets/) and the hand worker. Every other core file (the shared legacy UI, the recorder, songs, Night's code…) goes.
   Then the tree is walked again: a load that now misses fails the build. A preview keeps everything (its probes import core's own rows). */
let pruned=0;
if(app==='light' && !PREVIEW){
  const KEEP=/^core\/(data|vendor|engine\/worklets)\/|^core\/hand-worker\.js$/;
  for(const f of listAll(path.join(OUT,'core')).map(x=>path.relative(OUT,x).replace(/\\/g,'/'))) if(!seen.has(f) && !KEEP.test(f)){ rmSync(path.join(OUT,f)); pruned++; }
  for(let k=0;k<4;k++) for(const d of listDirs(path.join(OUT,'core'))) if(existsSync(d) && !readdirSync(d).length) rmSync(d,{ recursive:true, force:true });   // empty folders, deepest first over a few passes
  const again=new Set(seen); seen.clear(); bad.length=0;
  for(const m of page.matchAll(/\b(?:src|href)="([^"]+)"/g)){ const u=m[1]; if(/^([a-z]+:|\/|#)/i.test(u)) continue; walkModule(u.split(/[?#]/)[0]); }
  for(const f of again) if(!existsSync(path.join(OUT,f))) bad.push('pruned away but loaded: '+f);   // every load of the first walk still resolves
  if(bad.length){ for(const b of bad.slice(0,30)) console.error('  '+b); die('the pruned Light tree misses a load ('+bad.length+')'); }
  if(existsSync(path.join(OUT,'core/legacy-ui')) || existsSync(path.join(OUT,'core/recorder.js'))) die('the pruned Light tree still holds Full\'s code');
  all.splice(0, all.length, ...listAll(OUT).map(f=>path.relative(OUT,f).replace(/\\/g,'/')).sort());   // the tree as shipped
}

/* CORE-20 (audit P5 item 3): the page's module script and its STATIC closure (import … from / import '…' / export … from; never import()) as
   <link rel="modulepreload"> before </head>, so the built page fetches its modules in one wave instead of one per import depth */
const STATIC=SPEC.slice(0,2), closure=[], seenS=new Set();
function walkStatic(f){ if(seenS.has(f) || !f.endsWith('.js') || !existsSync(path.join(OUT,f))) return; seenS.add(f); closure.push(f);
  const t=stripComments(readFileSync(path.join(OUT,f),'utf8')); for(const re of STATIC) for(const m of t.matchAll(re)){ if(m[1].includes('?')) continue; walkStatic(posix.normalize(posix.join(posix.dirname(f),m[1]))); } }
for(const m of page.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)) if(!/^([a-z]+:|\/|#)/i.test(m[1])) walkStatic(m[1].split(/[?#]/)[0]);
{ const html=readFileSync(path.join(OUT,'index.html'),'utf8'), tags=closure.map(f=>`<link rel="modulepreload" href="${f}">`).join('\n');
  if(!closure.length || !html.includes('</head>')) die('no module closure to preload, or the page has no </head>');
  writeFileSync(path.join(OUT,'index.html'), html.replace('</head>', `<!-- CORE-20: the static module closure, preloaded (written by tools/build.mjs) -->\n${tags}\n</head>`)); }
/* NIGHT-14: Night's precache list, written into its sw.js last (after every change to the tree, so the hashes are the shipped bytes) */
let pc=null; if(app==='night') pc=writePrecache(OUT, precachePaths(OUT, seen, NIGHT_SKIP, NIGHT_INCLUDE), NIGHT_LATER, NIGHT_DEMAND);   // RAIN-R1: the rain's media on demand
const bytes=all.reduce((n,f)=>n+statSync(path.join(OUT,f)).size,0), h=createHash('sha256'); for(const f of all){ h.update(f); h.update(readFileSync(path.join(OUT,f))); }
console.log(`[build] PASS — ${app}${pruned?' · '+pruned+' unused core files left out':''}${PREVIEW?' · preview: ?probe kept':' · production: no probes'}${RELEASE?' · release edition':''} · ${all.length} files, ${(bytes/1048576).toFixed(1)} MB, ${seen.size} loads resolved, ${closure.length} modules preloaded${pc ? ` · precache ${pc.version}: ${pc.n} files, ${(pc.simdBytes/1048576).toFixed(1)} MB cached, ${(pc.startBytes/1048576).toFixed(1)} MB of it to start, ${(pc.demandBytes/1048576).toFixed(1)} MB on demand (${(pc.bytes/1048576).toFixed(1)} MB listed with both MediaPipe builds)` : ''} · tree ${h.digest('hex').slice(0,16)} → ${path.relative(ROOT,OUT).replace(/\\/g,'/')}`);
