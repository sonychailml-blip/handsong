/* SPLIT-2: every check of a checkpoint, in one run, on both apps. A failure is printed and the run goes on, so the report shows everything.
     node tools/split-check.mjs --baseline         record tools/split-baseline/ (on unchanged code)
     node tools/split-check.mjs --tag A            compare with the baseline; a summary → tools/split-baseline/result-<tag>.txt */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), T='tools/split-baseline', argv=process.argv.slice(2);
const BASELINE=argv.includes('--baseline'), TAG=BASELINE ? 'base' : (argv[argv.indexOf('--tag')+1]||'x'), ONLY=(()=>{ const i=argv.indexOf('--only'); return i>=0 ? argv[i+1].split(',') : null; })();
const res=[];
function run(name, args, cwd=ROOT){ if(ONLY && !ONLY.includes(name)) return Promise.resolve(true);
  return new Promise(ok=>{ const t0=Date.now(); console.log(`\n=== ${name}: node ${args.join(' ')}`); const p=spawn(process.execPath,args,{ cwd }); let last='';
    const eat=d=>{ const s=String(d); process.stdout.write(s); const L=s.split('\n').map(x=>x.trim()).filter(Boolean); if(L.length) last=L[L.length-1]; };
    p.stdout.on('data',eat); p.stderr.on('data',eat);
    p.on('close',c=>{ res.push(`${c===0?'PASS':'FAIL'}  ${name}  (${Math.round((Date.now()-t0)/1000)} s)  ${last.slice(0,240)}`); ok(c===0); }); }); }
await mkdir(path.join(ROOT,T),{ recursive:true });
const j=n=>`${T}/${TAG}-${n}.json`;
await run('static',['tools/check-static.mjs']);
await run('data',['tools/probe-data.mjs']);
await run('licences',['tools/check-licences.mjs']);
if(BASELINE) await run('hash-save',['tools/split-compare.mjs','--hash-save']); else await run('hash',['tools/split-compare.mjs','--hash']);
await run('full',['tools/probe-browser.mjs','--app','full','--all','--leak','--cdn-cache','--stress-not-judged','--limit-min','25','--json',j('full')]);
await run('night',['tools/probe-browser.mjs','--app','night','--cdn-cache','--stress-not-judged','--limit-min','25','--json',j('night')]);
if(!BASELINE){ await run('compare-full',['tools/split-compare.mjs',`${T}/base-full.json`,j('full')]); await run('compare-night',['tools/split-compare.mjs',`${T}/base-night.json`,j('night')]); }
await run('smoke',['tools/smoke-paths.mjs']);
const snap=n=>`split-${TAG}-${n}`;
const cmp=n=>BASELINE ? [] : ['--compare',`split-base-${n}`];
const DECL=n=>BASELINE ? [] : ['--declared',n], NOISY_NIGHT='calm-ghost,calm-dark,calm-forest,calm-forest-land', SIDE_BY_SIDE=new Set(['C','E']);
await run('ui-full',['tools/ui-snap.mjs','--save',snap('full'),...cmp('full'),...DECL('full')]);
/* measured at CP A: these four differ between two captures of identical code (the ghost's animation, the WebGL forest); the other screens stay exact */
await run('ui-night',['tools/ui-snap.mjs','--calm','--save',snap('night'),...cmp('night'),...DECL('night'),'--noisy',NOISY_NIGHT]);
/* the user's eye check at C and E: before and after in one PNG */
if(!BASELINE && SIDE_BY_SIDE.has(TAG)) await run('side-by-side',['tools/ui-snap.mjs','--side-by-side','split-base-night',snap('night'),NOISY_NIGHT,`${T}/side-by-side-${TAG}`]);
const fail=res.filter(x=>x.startsWith('FAIL')).length, text=res.join('\n')+`\n\n[split-check] ${TAG}: ${fail?'NOT A PASS — '+fail+' failed':'PASS — all '+res.length+' checks'}\n`;
await writeFile(path.join(ROOT,T,`result-${TAG}.txt`), text); console.log('\n=== SUMMARY\n'+text); process.exit(fail?1:0);
