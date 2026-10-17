// DOC1: proves a document split lost nothing — every non-blank line of the OLD file (as a multiset) is found in the NEW files
// together. Usage: node tools/doc-split-check.mjs <old> <new1> [<new2> …]   (exit 0 = nothing lost)
import { readFileSync } from 'node:fs';
const [oldF, ...newF] = process.argv.slice(2);
if (!oldF || !newF.length) { console.log('usage: node tools/doc-split-check.mjs <old> <new…>'); process.exit(2); }
const lines = f => readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
const have = new Map();
for (const f of newF) for (const l of lines(f)) have.set(l, (have.get(l) || 0) + 1);
const old = lines(oldF), lost = [];
for (const l of old) { const n = have.get(l) || 0; if (n > 0) have.set(l, n - 1); else lost.push(l); }
const added = [...have.values()].reduce((a, b) => a + b, 0);
console.log(`[doc-split] old ${old.length} non-blank lines · found ${old.length - lost.length} · lost ${lost.length} · new-only ${added}`);
for (const l of lost.slice(0, 20)) console.log('  LOST: ' + l.slice(0, 140));
console.log(lost.length ? '[doc-split] NOT A PASS — lines lost' : '[doc-split] PASS — every old line is in the new files');
process.exit(lost.length ? 1 : 0);
