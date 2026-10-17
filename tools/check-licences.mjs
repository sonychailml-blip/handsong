/* ⛳ LIC1 — the licence register checker (hard rule #32). Dev tool; reads files as TEXT, never runs app code.
     node tools/check-licences.mjs           check, print every difference and a verdict line (exit 0 PASS / 1)
     node tools/check-licences.mjs --write   regenerate THIRD-PARTY-LICENSES.md from tools/licences.json, then check
   Also run by tools/probe-data.mjs as the row «LIC1 licence register».
   Checks: (1) every register entry is complete and its licence allowed for its class (code: MIT/BSD/Apache-2.0/ISC/Zlib; material:
   CC0, CC-BY 4.0, OFL, own work, AI-generated with its tool; a service needs the user's recorded decision; GPL/AGPL/LGPL/MPL/SA/NC/ND
   refused); (2) every external URL in the shipped files (comments ignored) and every root-absolute or missing local reference in
   index.html/manifest.json belongs to an entry, and every entry's URLs are still used; the CSP host sources each cover a register entry; (3) every non-code file (images, fonts,
   sounds, models, .wasm…) and everything under vendor/ belongs to an entry; (4) every package in tools/package-lock.json has an entry
   with the same version and licence; (5) the icon/glyph audit: every Unicode symbol or emoji used outside comments is listed, and
   every listed one is still used; (6) THIRD-PARTY-LICENSES.md equals the generated text. CONTROLS (must fail): an unlisted URL, an unlisted CSP host, a GPL
   licence, an unlisted glyph, an unlisted image file, a package version bump, a reference-only address in a shipped file. Reference prototypes
   (docs/prototypes/*.html, RUN 5) are scanned for addresses only: each must be a «reference» entry, never used by a shipped file. */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lex } from './lex.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REG_FILE='tools/licences.json', LOCK_FILE='tools/package-lock.json', MD_FILE='THIRD-PARTY-LICENSES.md';
const SKIP_DIRS=new Set(['.git','tools','archive','node_modules']);
const OWN_EXT=new Set(['.js','.mjs','.json','.html','.css','.md','.txt','']);   // our code, data and docs
const CLASSES=new Set(['code','model','service','link','image','font','glyph','sound','ir']);
const USES=new Set(['shipped','CDN','service','link','device','dev-only','reference']);   // reference (RUN 5): used only by a reference prototype under docs/prototypes/ — never shipped
const MATERIAL=new Set(['image','font','glyph','sound','ir']);
const REFUSED=/\b(A?GPL|LGPL|MPL)\b|\bSA\b|-SA\b|\bNC\b|-NC\b|\bND\b|-ND\b/i;
const GLYPH_KINDS=new Set(['icon','typography','notation','console']);
const ICON_EXEMPT={ 'src/scaleprobe.js':'the probe facade', 'src/songs.js':'console texts of the demo-song tool', 'src/recorder.js':'a console refusal text',
  'src/render.js':'console texts of the ear tools' };   // UI1b: «icon» glyphs allowed outside src/icons.js (not interface)
/* symbols that read as pictures: arrows, maths and technical signs, box/geometric shapes, misc symbols, dingbats, supplemental
   arrows and maths, letterlike signs, fullwidth forms, every emoji plane */
const isGlyph=cp=>(cp>=0x2100&&cp<=0x214F)||(cp>=0x2190&&cp<=0x23FF)||(cp>=0x2460&&cp<=0x24FF)||(cp>=0x2500&&cp<=0x2BFF)||(cp>=0xFF01&&cp<=0xFF5E)||cp>=0x1F000;

/* ---------- input ---------- */
function walk(dir, out=[]){
  for(const n of readdirSync(join(ROOT,dir))){ const rel=dir?dir+'/'+n:n;
    if(statSync(join(ROOT,rel)).isDirectory()){ if(!SKIP_DIRS.has(n)) walk(rel,out); } else out.push(rel); }
  return out;
}
const isShippedText=f=>/^(index\.html|style\.css|sw\.js|manifest\.json)$/.test(f)||/^src\/.+\.js$/.test(f)||/^data\/.+\.json$/.test(f);
const isRefText=f=>/^docs\/prototypes\/.+\.html$/.test(f);   // RUN 5: reference prototypes — their addresses must be «reference» entries
export function gather(){
  const files=walk('').sort(), texts={};
  for(const f of files) if(isShippedText(f)||isRefText(f)) texts[f]=readFileSync(join(ROOT,f),'utf8');
  const read=f=>existsSync(join(ROOT,f)) ? readFileSync(join(ROOT,f),'utf8') : null;
  return { files, texts, reg:JSON.parse(read(REG_FILE)), lock:JSON.parse(read(LOCK_FILE)||'{}'), md:read(MD_FILE) };
}
/* comments out: JS through the shared lexer, HTML and CSS comments blanked */
const visMemo=new Map();   // the controls re-check the same texts: lex each file once
function visible(f, s){
  const m=visMemo.get(f); if(m&&m.s===s) return m.v;
  const v=visible0(f,s); visMemo.set(f,{ s, v }); return v;
}
function visible0(f, s){
  if(f.endsWith('.js')) return lex(s).code;
  if(f.endsWith('.html')) return s.replace(/<!--[\s\S]*?-->/g,' ');
  if(f.endsWith('.css')) return s.replace(/\/\*[\s\S]*?\*\//g,' ');
  return s;
}

/* ---------- the check (pure over its input, so the controls can mutate a copy) ---------- */
export function check(inp){
  const diff=[]; let cases=0;
  const { reg, files, texts, lock }=inp, items=reg.items||[], fileSet=new Set(files);
  // (1) entries
  const allowCode=new Set(reg.policy.code), allowMat=new Set(reg.policy.material);
  for(const it of items){ cases++;
    const w=`entry ${it.id||'(no id)'}`;
    for(const k of ['id','name','class','use','version','licence','source']) if(!it[k]) diff.push(`${w}: field «${k}» missing`);
    if(!CLASSES.has(it.class)) diff.push(`${w}: class «${it.class}» unknown`);
    if(!USES.has(it.use)) diff.push(`${w}: use «${it.use}» unknown`);
    if(REFUSED.test(it.licence||'')) { diff.push(`${w}: licence «${it.licence}» is refused by rule #32`); continue; }
    if(it.use==='service'){ if(!it.decision) diff.push(`${w}: a hosted service needs the user's recorded decision («decision»)`); }
    else if(it.use==='link'||it.use==='device'){ if(it.licence!=='n/a') diff.push(`${w}: a ${it.use} entry ships nothing — licence must read «n/a»`); }
    else if(MATERIAL.has(it.class)){ if(!allowMat.has(it.licence)) diff.push(`${w}: material licence «${it.licence}» not allowed (allowed: ${[...allowMat].join(', ')}) — the user decides first`);
      if(it.licence==='AI-generated'&&!it.tool) diff.push(`${w}: AI-generated material must name its tool and terms («tool»)`); }
    else if(!allowCode.has(it.licence)) diff.push(`${w}: licence «${it.licence}» not allowed for ${it.class} (allowed: ${[...allowCode].join(', ')}) — the user decides first`);
    if(['image','font','glyph'].includes(it.class)&&!it.replace) diff.push(`${w}: icons, images, glyphs and fonts carry the audit mark («replace»)`);
    for(const f of it.files||[]) if(!fileSet.has(f)) diff.push(`${w}: lists ${f}, which does not exist`);
  }
  // (2) URLs and local references
  const urlOwner=u=>items.find(it=>(it.urls||[]).some(p=>u.startsWith(p)));
  const urlUsed=new Map(), refs=[];
  for(const [f,s] of Object.entries(texts)){ let v=visible(f,s);
    if(f==='index.html'){   // the CSP's host sources are allowances, not addresses: each must have a register entry under it (PRIV1)
      const csp=v.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i);
      if(csp){ for(const tok of csp[1].split(/[\s;]+/).filter(x=>/^https?:\/\//.test(x))){ cases++;
          if(!items.some(it=>(it.urls||[]).some(u=>u.startsWith(tok)))) diff.push(`index.html: the CSP allows ${tok}, under which no register entry lies — add the entry (and the user's decision) or narrow the CSP`); }
        v=v.replace(csp[1], ' '.repeat(csp[1].length)); } }
    for(const m of v.matchAll(/https?:\/\/[^\s'"`<>)\\]+/g)) refs.push([f,m[0]]);
    if(f==='index.html') for(const m of v.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)){ const u=m[1];
      if(/^(https?:)?\/\//.test(u)) continue;   // absolute — taken above
      if(u.startsWith('/')) refs.push([f,u]);   // root-absolute: not ours under a sub-folder → must be an entry
      else if(!/^(#|mailto:|data:|blob:|javascript:)/.test(u) && !fileSet.has(u.split(/[?#]/)[0])) refs.push([f,u+' (missing local file)']); }
    if(f==='manifest.json'){ try{ for(const ic of JSON.parse(s).icons||[]) if(!fileSet.has(ic.src)) diff.push(`manifest.json: icon ${ic.src} does not exist`); }catch(e){ diff.push('manifest.json: not valid JSON'); } }
  }
  for(const [f,u] of refs){ cases++; const it=urlOwner(u);
    if(!it) diff.push(`${f}: ${u} — not in the register (${REG_FILE}); add an entry with its licence, or remove the address`);
    else if(isRefText(f) && it.use!=='reference') diff.push(`${f}: ${u} — a reference prototype may use only «reference» entries (${it.id} is ${it.use})`);
    else if(!isRefText(f) && it.use==='reference') diff.push(`${f}: ${u} — a reference-only address (${it.id}) in a shipped file`);
    else urlUsed.set(it.id,(urlUsed.get(it.id)||0)+1); }
  for(const it of items) if((it.urls||[]).length && !urlUsed.get(it.id)) diff.push(`entry ${it.id}: none of its addresses is used any more — remove the entry`);
  // (3) files that are not our code, data or docs
  const fileOwner=f=>items.find(it=>(it.files||[]).includes(f));
  for(const f of files){ if(!(f.startsWith('vendor/')||!OWN_EXT.has(extname(f).toLowerCase()))) continue; cases++;
    if(!fileOwner(f)) diff.push(`${f}: a file that is not our code — not in the register (${REG_FILE})`); }
  // (4) packages of the developer tools
  for(const [key,p] of Object.entries(lock.packages||{})){ if(!key) continue; cases++;
    const name=key.replace(/^.*node_modules\//,''), it=items.find(x=>x.npm===name);
    if(!it) diff.push(`${LOCK_FILE}: package ${name} ${p.version} (${p.license}) — not in the register`);
    else { if(it.version!==p.version) diff.push(`entry ${it.id}: version ${it.version} ≠ ${p.version} in the lock file — re-check its licence, then update the entry`);
           if(it.licence!==p.license) diff.push(`entry ${it.id}: licence ${it.licence} ≠ ${p.license} in the lock file`); } }
  for(const it of items) if(it.npm && !Object.keys(lock.packages||{}).some(k=>k.replace(/^.*node_modules\//,'')===it.npm)) diff.push(`entry ${it.id}: npm package ${it.npm} is no longer in ${LOCK_FILE}`);
  // (5) glyph audit
  const use=new Map();
  for(const [f,s] of Object.entries(texts)){ if(isRefText(f)) continue; const v=visible(f,s);
    for(const ch of v){ const cp=ch.codePointAt(0); if(!isGlyph(cp)) continue;
      if(!use.has(ch)) use.set(ch,new Set()); use.get(ch).add(f); } }
  const listed=new Map((reg.glyphs||[]).map(g=>[g.ch,g]));
  for(const g of reg.glyphs||[]){ cases++;
    if(!g.name||!GLYPH_KINDS.has(g.kind)) diff.push(`glyph ${g.ch}: needs a name and a kind (${[...GLYPH_KINDS].join('/')})`);
    if(!use.has(g.ch)) diff.push(`glyph ${g.ch} (${g.name}): listed but no longer used — remove it from ${REG_FILE}`); }
  for(const [ch,fs] of use){ cases++; if(!listed.has(ch)) diff.push(`glyph ${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()}) used in ${[...fs].join(', ')} — not in the audit list of ${REG_FILE} (add it: name, kind)`); }
  if(!items.some(it=>it.class==='glyph')) diff.push('the register has no «glyph» entry for the Unicode symbols');
  /* (5b) UI1b: an interface glyph («icon» kind) appears only in the icon component src/icons.js; the interface renders it by name
     (icon('name'), «{i:name}» in a dictionary string, data-icon in the markup). Exempt: probes (they compare what the screen shows) and
     modules whose «icon» glyphs are console texts for the developer (ICON_EXEMPT, with the reason). */
  for(const [ch,fs] of use){ const g=listed.get(ch); if(!g||g.kind!=='icon') continue;
    for(const f of fs){ if(f==='src/icons.js'||f.startsWith('src/probes/')||ICON_EXEMPT[f]) continue; cases++;
      diff.push(`glyph ${ch} (${g.name}) used in ${f} outside the icon component src/icons.js — render it by name: icon('…'), {i:…} in a dictionary string, data-icon in the markup (UI1b)`); } }
  // (6) the generated document
  const md=renderMd(reg, use); cases++;
  if(inp.md!==md) diff.push(`${MD_FILE} is out of date (or missing) — run: node tools/check-licences.mjs --write`);
  return { cases, differences:diff, total:diff.length, md, glyphs:use.size, urls:refs.length };
}

/* ---------- the human-readable register ---------- */
const cp=ch=>'U+'+ch.codePointAt(0).toString(16).toUpperCase();
export function renderMd(reg, use){
  const L=[], items=reg.items;
  const row=it=>`| ${it.name} | ${it.version} | ${it.licence} | ${it.use} | ${(it.urls||it.files||(it.npm?['npm '+it.npm]:[])).join('<br>')||'—'} | ${it.source} |`;
  L.push('# Third-party licences and the icon / glyph / image / font audit','',
    '_Generated from `tools/licences.json` by `node tools/check-licences.mjs --write` — do not edit by hand. Checked by the data runner (row «LIC1 licence register»)._','',
    '## Policy (hard rule #32)','',
    `- Code, compiled-in libraries and models: ${reg.policy.code.join(', ')}.`,
    `- Material that is not code (sounds, impulse responses, pictures, fonts): ${reg.policy.material.join(', ')} — ${reg.policy.decisions}`,
    `- Refused: ${reg.policy.refused}.`,
    '- Our own code is written from published methods, never copied, translated or ported from another project\'s source.','');
  const sect=(title, pick)=>{ const xs=items.filter(pick); if(!xs.length) return;
    L.push(`## ${title}`,'','| Item | Version | Licence | Use | Addresses / files | Source |','|---|---|---|---|---|---|', ...xs.map(row),'');
    for(const it of xs){ const extra=[it.decision&&`decision: ${it.decision}`, it.tool&&`tool: ${it.tool}`, it.notes, it.replace&&`**${it.replace}**`].filter(Boolean);
      if(extra.length) L.push(`- **${it.name}** — ${extra.join(' · ')}`); }
    L.push(''); };
  sect('Shipped or loaded at run time (code and models)', it=>['code','model'].includes(it.class)&&it.use!=='dev-only'&&it.use!=='reference');
  sect('Hosted services', it=>it.use==='service');
  sect('Links the person opens (nothing is sent by the app)', it=>it.use==='link');
  sect('Developer tools only (never shipped)', it=>it.use==='dev-only');
  sect('Reference prototypes only (docs/prototypes/, never shipped)', it=>it.use==='reference');
  sect('Icons, images and fonts (audit, Q13)', it=>['image','font','glyph','sound','ir'].includes(it.class)&&it.use!=='reference');
  const gl=items.find(it=>it.class==='glyph');
  L.push('## Unicode symbols and emoji in the interface (audit, Q13)','',
    `Origin of every entry: ${gl?gl.source:'—'}.`,'',
    `Every entry: **${gl?gl.replace:'—'}** (console-only signs are developer text, never shown in the app).`,'',
    '| Glyph | Code point | Meaning | Kind | Used in |','|---|---|---|---|---|');
  for(const g of reg.glyphs) L.push(`| ${g.ch} | ${cp(g.ch)} | ${g.name} | ${g.kind} | ${use.has(g.ch)?[...use.get(g.ch)].sort().join(', '):'(unused)'} |`);
  L.push('');
  return L.join('\n');
}

/* ---------- controls: each must make the check fail ---------- */
const clone=x=>JSON.parse(JSON.stringify(x));
export function controls(inp, base){
  const C=[
    ['an unlisted URL', i=>{ i.texts['index.html']+='\n<script src="https://cdn.example.com/x.js"></script>'; }, /cdn\.example\.com/],
    ['an unlisted CSP host', i=>{ i.texts['index.html']=i.texts['index.html'].replace("connect-src 'self'", "connect-src 'self' https://collector.example.net"); }, /CSP allows https:\/\/collector/],
    ['a GPL licence', i=>{ i.reg.items.find(x=>x.class==='code').licence='GPL-3.0'; }, /GPL-3\.0.*refused/],
    ['an unlisted glyph', i=>{ i.texts['src/ui.js']+="\nconst probeGlyph='⚡';"; }, /glyph ⚡/],
    ['an interface glyph outside the icon component', i=>{ i.texts['src/ui.js']+="\nconst probeIcon='▶';"; }, /glyph ▶ .* outside the icon component/],
    ['an unlisted image file', i=>{ i.files.push('icons/extra.svg'); }, /icons\/extra\.svg/],
    ['a reference-only address in a shipped file', i=>{ const it=i.reg.items.find(x=>x.use==='reference'&&(x.urls||[]).length); if(it) i.texts['src/ui.js']+=`
const probeRef='${it.urls[0]}';`; }, /reference-only address/],
    ['a package version bump', i=>{ const k=Object.keys(i.lock.packages||{}).find(Boolean); if(k) i.lock.packages[k].version='999.0.0'; }, /999\.0\.0/],
  ];
  const out=[];
  for(const [name,mut,mark] of C){ const i={ ...clone({ reg:inp.reg, lock:inp.lock, files:inp.files }), texts:{ ...inp.texts }, md:inp.md };
    mut(i); const r=check(i); const caught=r.total>base.total && r.differences.some(d=>mark.test(d));
    out.push({ name, caught }); }
  return out;
}
export function run(){
  const inp=gather(), r=check(inp), ctl=controls(inp, r);
  for(const c of ctl) if(!c.caught) r.differences.push(`CONTROL «${c.name}» did not fail — the check cannot catch it`);
  r.total=r.differences.length; r.cases+=ctl.length; r.controls=ctl;
  return r;
}

/* ---------- command line ---------- */
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  if(process.argv.includes('--write')){ const inp=gather(), r=check(inp); writeFileSync(join(ROOT,MD_FILE), r.md); console.log(`[check-licences] wrote ${MD_FILE}`); }
  const r=run();
  for(const d of r.differences) console.log('  ✗ '+d);
  console.log(`[check-licences] controls: ${r.controls.map(c=>`${c.name} ${c.caught?'caught':'NOT CAUGHT'}`).join(' · ')}`);
  console.log(`[check-licences] ${r.total?'NOT A PASS':'PASS'} — ${r.cases} cases, ${r.total} differences · ${r.urls} external references, ${r.glyphs} glyphs audited`);
  process.exitCode=r.total?1:0;
}
