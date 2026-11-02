/* SPLIT-2: THE RENAME TABLE, in one place: the rename pass applies it to the tree, the comparison tools apply it to the baseline (recorded under the old names; never re-recorded).
     node tools/split-names.mjs --dry     print what would change
     node tools/split-names.mjs           do it
   Exceptions first (plan §5.2): a blind replace would give `nightNight`, or collide with Full's --cv-night-* family. Not touched: tools/prints (byte-identity is the proof), vendor, archive,
   the docs and logs (CP F), the split tools themselves. */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RULES=[ [/calmNight/g,'nightSky'], [/--cv-calm-/g,'--cv-hn-'], [/\bcv\('calm-/g,"cv('hn-"],
  [/(?:core\/)?calmshell\.js/g,'apps/night/shell.js'], [/effects\/calm\.js/g,'effects/night-fx.js'], [/docs\/CALM-QUALITY\.md/g,'docs/night/QUALITY.md'], [/docs\/STAGE4-CALM-plan\.md/g,'docs/night/STAGE4-NIGHT-plan.md'],
  [/CALM/g,'NIGHT'], [/Calm/g,'Night'], [/calm/g,'night'] ];
export const toNew=s=>{ let t=String(s); for(const [a,b] of RULES) t=t.replace(a,b); return t; };
/* the baseline's file name of a renamed screen */
export const toOldScreen=s=>String(s).replace(/^night-/,'ca'+'lm-');

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), DRY=process.argv.includes('--dry');
  const walk=d=>statSync(path.join(ROOT,d)).isFile() ? [d] : readdirSync(path.join(ROOT,d),{ withFileTypes:true }).flatMap(e=>e.name==='vendor' ? [] : walk(d+'/'+e.name));
  const FILES=['core','apps','tools/probes','tools/listen','tools/licences.json','tools/probe-browser.mjs','tools/probe-data.mjs','tools/ui-snap.mjs','tools/smoke-paths.mjs','tools/check-static.mjs','tools/forest-budget.eval.js'].flatMap(walk).filter(f=>/\.(js|mjs|css|html|json|md)$/.test(f));
  let n=0, lines=0;
  for(const f of FILES){ const was=readFileSync(path.join(ROOT,f),'utf8'), now=toNew(was); if(now===was) continue; n++; const a=was.split('\n'), b=now.split('\n'); for(let i=0;i<a.length;i++) if(a[i]!==b[i]) lines++; if(!DRY) writeFileSync(path.join(ROOT,f),now); }
  console.log(`[split-names] ${DRY?'would change':'changed'} ${lines} lines in ${n} files of ${FILES.length}`);
}
