/* SPLIT-2 (plan §7.3): a report's cheap evidence without git. One SHA-256 per folder, over its files' relative paths and bytes in sorted order; a run shows what it did not touch.
     node tools/tree-hash.mjs core apps/full apps/night */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=d=>readdirSync(path.join(ROOT,d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? walk(d+'/'+e.name) : [d+'/'+e.name]);
export function treeHash(dir){ const h=createHash('sha256'), files=walk(dir).sort(); for(const f of files){ h.update(f+'\0'); h.update(readFileSync(path.join(ROOT,f))); h.update('\0'); } return { hash:h.digest('hex').slice(0,16), files:files.length }; }

const dirs=process.argv.slice(2); if(!dirs.length){ console.log('usage: node tools/tree-hash.mjs <folder> [<folder> …]'); process.exit(2); }
for(const d of dirs){ const r=treeHash(d); console.log(`[tree-hash] ${d.padEnd(12)} ${r.hash}  ${r.files} files`); }
