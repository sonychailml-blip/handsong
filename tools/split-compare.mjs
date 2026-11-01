/* SPLIT-2: the proof of «no behaviour change» — compares a probe run (runner --json) with tools/split-baseline/, and the baseline prints by SHA-256.
     node tools/split-compare.mjs --hash-save                 record the prints' hashes (once, at the baseline)
     node tools/split-compare.mjs --hash                      prints byte-identical?
     node tools/split-compare.mjs <base.json> <now.json>      rows: same names, statuses and case counts, 0 differences; requests: the same files
   Row rules: every baseline row present, same status, differences as in the baseline; case counts equal except real-time rows (verdict only: measured
   values and «not judged» paths vary with the machine's heat). RENAMES / RETIRED = the declared map, empty until a row is declared here. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE=path.join(ROOT,'tools','split-baseline');
const PRINTS=['gold.print.json','census.print.json','gesture.print.json','song.print.json','scales.before.json','timbres.before.json','night.print.json'];
const PRINT_DIRS=['tools','tools/prints'];
const REALTIME=new Set(['LR1 live and frozen reverb agree','AF2 freeze swap inaudible','AF6b 16-bit frozen playback','SND-F1b master path (live)','SND-F1 dynamics live = offline','SND-F1 freeze parity (Firefly, Night forest, Glue)','CALM stress']);
const RENAMES={}, RETIRED=new Set();
const out=s=>console.log(s), argv=process.argv.slice(2);
async function findPrint(n){ for(const d of PRINT_DIRS){ try{ return await readFile(path.join(ROOT,d,n)); }catch(e){} } throw new Error('print not found: '+n); }
const sha=b=>createHash('sha256').update(b).digest('hex');
if(argv[0]==='--hash-save'){ const h={}; for(const n of PRINTS) h[n]=sha(await findPrint(n)); await mkdir(BASE,{ recursive:true }); await writeFile(path.join(BASE,'prints.sha256.json'), JSON.stringify(h,null,1)); out('[split-compare] hashes saved'); process.exit(0); }
if(argv[0]==='--hash'){ const h=JSON.parse(await readFile(path.join(BASE,'prints.sha256.json'),'utf8')); let bad=0; for(const n of PRINTS){ const s=sha(await findPrint(n)); if(s!==h[n]){ bad++; out(`[split-compare] ${n}: CHANGED ${h[n].slice(0,12)} → ${s.slice(0,12)}`); } }
  out(`[split-compare] prints: ${bad?'NOT A PASS — '+bad+' changed':'PASS — '+PRINTS.length+' files byte-identical (SHA-256)'}`); process.exit(bad?1:0); }
const [a,b]=argv; if(!a||!b){ out('usage: --hash-save | --hash | <base.json> <now.json>'); process.exit(2); }
const A=JSON.parse(await readFile(path.resolve(a),'utf8')), B=JSON.parse(await readFile(path.resolve(b),'utf8')), bad=[];
const runsOf=X=>{ const m={}; for(const s of X.sessions) for(const r of s.runs) m[r.kind]=r; return m; };
const ra=runsOf(A), rb=runsOf(B);
let nRows=0;
for(const kind of Object.keys(ra)){ const x=ra[kind], y=rb[kind]; if(!y){ bad.push(`run P.${kind} is missing`); continue; }
  const my=new Map(y.rows.map(r=>[r.check,r]));
  for(const r of x.rows){ if(RETIRED.has(r.check)) continue; nRows++; const n=RENAMES[r.check]||r.check, q=my.get(n);
    if(!q){ bad.push(`P.${kind}: row «${n}» is missing`); continue; }
    if(q.status!==r.status) bad.push(`P.${kind}: «${n}» status ${r.status} → ${q.status}`);
    if(String(q.differences)!==String(r.differences)) bad.push(`P.${kind}: «${n}» differences ${r.differences} → ${q.differences}`);
    if(!REALTIME.has(r.check) && String(q.cases)!==String(r.cases)) bad.push(`P.${kind}: «${n}» cases ${r.cases} → ${q.cases}`); }
  const known=new Set(x.rows.map(r=>RENAMES[r.check]||r.check)); for(const r of y.rows) if(!known.has(r.check)) bad.push(`P.${kind}: new row «${r.check}» is not declared`); }
const files=X=>new Set(X.sessions.flatMap(s=>(s.requests||[]).filter(([u])=>u.startsWith('/')&&!/net-control/.test(u)).map(([u])=>path.posix.basename(u))));
{ const fa=files(A), fb=files(B); for(const f of fa) if(!fb.has(f)) bad.push(`request: ${f} no longer loaded`); for(const f of fb) if(!fa.has(f)) bad.push(`request: ${f} newly loaded`); }
for(const s of B.sessions){ if(s.error) bad.push('session error: '+s.error); if(s.csp===false) bad.push('CSP failed'); if(s.net===false) bad.push('network check failed'); }
for(const d of bad.slice(0,40)) out('  '+d);
out(`[split-compare] ${path.basename(a)} → ${path.basename(b)}: ${bad.length?'NOT A PASS — '+bad.length+' difference(s)':'PASS — '+nRows+' rows equal, same files loaded'}`);
process.exit(bad.length?1:0);
