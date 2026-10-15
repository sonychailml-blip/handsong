/* PROBE1: the ROW REGISTRY — every probe row registers itself next to its probe; P.all / P.quick (probes/run.js) and the node data runner
   (tools/probe-data.mjs, rows flagged node) list them from here. Pure: imports nothing, so node can load it.
   A row: { at, name, run, read, slow?, drawn?, realtime?, song?, node? }
     at       — its place in the run (rows are listed by «at»; the pre-PROBE1 order is kept: the old list position × 10)
     run      — () → result (or a promise of one); read(result) → { cases, song?, diff, list, status? } (the summary line)
     slow     — left out of P.quick (sweeps, real-time captures)        drawn — reads the drawn window (needs frames; «tab hidden» otherwise)
     realtime — a real-time capture (the runner's --repeat table)       song  — counts song material
     node     — also run by tools/probe-data.mjs (data only; its module imports nothing that needs a browser)
   A FAMILY is a block of generated rows (module contracts, GOLD timbres…): family({ at, name, rows:()=>[{ name, run, read, …flags }] }) —
   expanded when listed, its rows at at+i/1000 in the order given. */
const ROWS=[], FAMS=[], FLAGS=['slow','drawn','realtime','song','node'], KEYS=new Set(['at','name','run','read',...FLAGS]);
const problems=[];
function shape(r, where){
  for(const k of Object.keys(r)) if(!KEYS.has(k)) problems.push(`${where}: unknown field «${k}»`);
  if(typeof r.name!=='string' || !r.name) problems.push(`${where}: no name`);
  if(typeof r.run!=='function' || typeof r.read!=='function') problems.push(`${where}: run and read must be functions`);
}
export function row(r){
  shape(r, `row «${r&&r.name}»`);
  if(!Number.isFinite(r.at)) problems.push(`row «${r.name}»: no number «at»`);
  ROWS.push(r);
}
export function family(f){
  if(!f || typeof f.rows!=='function' || !Number.isFinite(f.at) || !f.name) problems.push(`family «${f&&f.name}»: needs at, name and rows()`);
  FAMS.push(f);
}
/* Every row, ordered by «at»; a family's rows expand in place. filter: { quick:true } drops slow rows, { node:true } keeps node rows. */
export function rows(filter={}){
  const all=[...ROWS];
  for(const f of FAMS){ let list=[]; try{ list=f.rows()||[]; }catch(e){ problems.push(`family «${f.name}»: rows() threw ${e&&e.message}`); }
    list.forEach((r,i)=>{ shape(r, `family «${f.name}» row ${i}`); all.push({ ...r, at:f.at+(i+1)/1000, family:f.name }); }); }
  all.sort((a,b)=>a.at-b.at);
  return all.filter(r=>!(filter.quick && r.slow) && !(filter.node && !r.node));
}
/* Registry problems: bad shapes, duplicate names, two rows on one «at» — P.all prints them and does not pass. */
export function rowProblems(){ const list=rows(), dup=rowCheck(list); return [...new Set(problems), ...dup]; }   // rows() first: it shapes the families
export function rowCheck(list){
  const out=[], seen=new Map(), at=new Map();
  for(const r of list){
    if(seen.has(r.name)) out.push(`two rows named «${r.name}»`); seen.set(r.name,1);
    if(at.has(r.at)) out.push(`rows «${at.get(r.at)}» and «${r.name}» share at=${r.at}`); at.set(r.at,r.name);
  }
  return out;
}
