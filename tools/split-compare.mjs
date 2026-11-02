/* SPLIT-2: the proof of «no behaviour change» — compares a probe run (runner --json) with tools/split-baseline/, and the baseline prints by SHA-256.
     node tools/split-compare.mjs --hash-save                 record the prints' hashes (once, at the baseline)
     node tools/split-compare.mjs --hash                      prints byte-identical?
     node tools/split-compare.mjs <base.json> <now.json>      rows: same names, statuses and case counts, 0 differences; requests: the same files
   Row rules: every baseline row present, same status, differences as in the baseline; case counts equal except real-time rows (verdict only: measured
   values and «not judged» paths vary with the machine's heat). DECLARED = what may differ, named one by one; old names through tools/split-names.mjs. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toNew } from './split-names.mjs';   // the baseline was recorded under the old names

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE=path.join(ROOT,'tools','split-baseline');
const PRINTS=['gold.print.json','census.print.json','gesture.print.json','song.print.json','scales.before.json','timbres.before.json','night.print.json'];
const PRINT_DIRS=['tools','tools/prints'];
const REALTIME=new Set(['LR1 live and frozen reverb agree','AF2 freeze swap inaudible','AF6b 16-bit frozen playback','SND-F1b master path (live)','SND-F1 dynamics live = offline','SND-F1 freeze parity (Firefly, Night forest, Glue)','CALM stress']);
/* SPLIT-2: everything that may differ since the baseline, per page, named one by one. moved: rows that left the Full page and must run on Night's (checked below). cases: a row whose case count changed on
   purpose. newRows: rows added. gone / added: files by base name (a page no longer loads the other app's code or the probes it has no row for). */
const NIGHT_ROWS_MOVED=['VIS1c forest room','VIS1c backgrounds','CALM forest picture','FOREST night cycle','FOREST response','FOREST detail','FOREST rare events','FOREST levels','C4a solo Firefly','CALM timbres','CALM timbre set','CALM depth → forest','CALM depth loudness','CALM ambience','CALM shell','CALM ghost light','CALM effects hand','CALM effects × timbres','CALM bars and fireflies','CALM low power','CALM volume curve','CALM stress','NIGHT untouched'];
const DECLARED={
  full:{ moved:NIGHT_ROWS_MOVED, cases:{ 'C0 profile round trip':13 }, newRows:[],
    gone:['ghost.js','calmshell.js','edition.js','night.js','fireflies.js','forest-life.js','forest-detail.js','forest-rare.js','forestlife.js','calm.json','scaleprobe.js','nightguard.js','Andika-Regular.woff2','three.min.js','night.print.json'], added:['boot.js','fixture.profile.json','full.js','night.json'] },
  night:{ moved:[], cases:{}, newRows:['NIGHT profile round trip','TIM3 timbres = before','NIGHT migrate'],
    gone:['demo.js','tutor.js','songs.js','calmshell.js','full.json','calm.json','scaleprobe.js','userfiles.js','seed.js','data.js','song1.js','pack.js','pool.js','cmd.js','ids.js','tim3d.js','eng2.js','song2.js','fxcontract.js','edit.js','window.js','files.js','freeze.js','key.js','lat.js','detect.js','sound.js','tuning.js','commands.js','triphop.json','pack-test-licence.json','scales.before.json','song.print.json'],
    added:['night.css','boot.js','shell.js','cycle.js','night.json','nightprofile.js','timbres.before.json','migrate.js','nightmigrate.js'] },
};
const out=s=>console.log(s), argv=process.argv.slice(2);
async function findPrint(n){ for(const d of PRINT_DIRS){ try{ return await readFile(path.join(ROOT,d,n)); }catch(e){} } throw new Error('print not found: '+n); }
const sha=b=>createHash('sha256').update(b).digest('hex');
if(argv[0]==='--hash-save'){ const h={}; for(const n of PRINTS) h[n]=sha(await findPrint(n)); await mkdir(BASE,{ recursive:true }); await writeFile(path.join(BASE,'prints.sha256.json'), JSON.stringify(h,null,1)); out('[split-compare] hashes saved'); process.exit(0); }
if(argv[0]==='--hash'){ const h=JSON.parse(await readFile(path.join(BASE,'prints.sha256.json'),'utf8')); let bad=0; for(const n of PRINTS){ const s=sha(await findPrint(n)); if(s!==h[n]){ bad++; out(`[split-compare] ${n}: CHANGED ${h[n].slice(0,12)} → ${s.slice(0,12)}`); } }
  out(`[split-compare] prints: ${bad?'NOT A PASS — '+bad+' changed':'PASS — '+PRINTS.length+' files byte-identical (SHA-256)'}`); process.exit(bad?1:0); }
const [a,b]=argv; if(!a||!b){ out('usage: --hash-save | --hash | <base.json> <now.json>'); process.exit(2); }
const A=JSON.parse(await readFile(path.resolve(a),'utf8')), B=JSON.parse(await readFile(path.resolve(b),'utf8')), bad=[];
const runsOf=X=>{ const m={}; for(const s of X.sessions) for(const r of s.runs) m[r.kind]=r; return m; };
const ra=runsOf(A), rb=runsOf(B), D=DECLARED[A.app]||{ moved:[], cases:{}, newRows:[], gone:[], added:[] };
/* a row may leave the Full page only if the Night baseline has it (its run is compared there) */
if(D.moved.length){ const nb=JSON.parse(await readFile(path.join(BASE,'base-night.json'),'utf8')), have=new Set(nb.sessions.flatMap(s=>s.runs.flatMap(r=>r.rows.map(x=>x.check)))); for(const m of D.moved) if(!have.has(m)) bad.push(`moved row «${m}» is not in the Night baseline`); }
let nRows=0;
for(const kind0 of Object.keys(ra)){ const kind=toNew(kind0), x=ra[kind0], y=rb[kind]; if(!y){ bad.push(`run P.${kind} is missing`); continue; }
  const my=new Map(y.rows.map(r=>[r.check,r]));
  let nMoved=0; for(const r of x.rows){ if(D.moved.includes(r.check)){ nMoved++; if(my.has(r.check)) bad.push(`P.${kind}: «${r.check}» is declared moved but still runs here`); continue; } nRows++; const n=toNew(r.check), q=my.get(n);
    if(!q){ bad.push(`P.${kind}: row «${n}» is missing`); continue; }
    if(q.status!==r.status) bad.push(`P.${kind}: «${n}» status ${r.status} → ${q.status}`);
    if(String(q.differences)!==String(r.differences)) bad.push(`P.${kind}: «${n}» differences ${r.differences} → ${q.differences}`);
    const wantCases=n in D.cases ? D.cases[n] : r.cases; if(!REALTIME.has(r.check) && String(q.cases)!==String(wantCases)) bad.push(`P.${kind}: «${n}» cases ${wantCases} → ${q.cases}`); }
  const known=new Set(x.rows.map(r=>toNew(r.check))); for(const r of y.rows) if(!known.has(r.check) && !D.newRows.includes(r.check)) bad.push(`P.${kind}: new row «${r.check}» is not declared`);
  for(const r of D.newRows){ const q=my.get(r); if(!q) bad.push(`P.${kind}: declared new row «${r}» is missing`); else if(q.status!=='pass'||+q.differences!==0) bad.push(`P.${kind}: new row «${r}»: ${q.status}, ${q.differences} differences`); } }
const files=X=>new Set(X.sessions.flatMap(s=>(s.requests||[]).filter(([u])=>u.startsWith('/')&&!/net-control/.test(u)).map(([u])=>path.posix.basename(u))));
{ const REQ={ ['ca'+'lmui.js']:'nightui.js', ['ca'+'lm.js']:'night-fx.js' }, now=f=>REQ[f]||f, fa=files(A), fb=files(B), faNew=new Set([...fa].map(now)); for(const f of fa) if(!fb.has(now(f)) && !D.gone.includes(f)) bad.push(`request: ${f} no longer loaded`); for(const f of fb) if(!faNew.has(f) && !D.added.includes(f)) bad.push(`request: ${f} newly loaded`);
  for(const f of D.gone) if(fb.has(f)) bad.push(`request: ${f} is declared gone but still loads`); }
for(const s of B.sessions){ if(s.error) bad.push('session error: '+s.error); if(s.csp===false) bad.push('CSP failed'); if(s.net===false) bad.push('network check failed'); }
for(const d of bad.slice(0,40)) out('  '+d);
out(`[split-compare] ${path.basename(a)} → ${path.basename(b)}: ${bad.length?'NOT A PASS — '+bad.length+' difference(s)':'PASS — '+nRows+' rows equal'+(D.moved.length?`, ${D.moved.length} moved to the Night page`:'')+(D.newRows.length?`, ${D.newRows.length} declared new`:'')+', files as declared'}`);
process.exit(bad.length?1:0);
