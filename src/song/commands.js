/* CMD1c (RUN 5) — EVERY HISTORY STEP A COMMAND, SERIALISED BY IDS (plan docs/CMD1-design.md §3.4). Pure song layer (folder rule REC1).
   histToJSON() writes the one history (past + redo branch) as plain JSON; histFromJSON(json) parses it back and installs it in place of the
   live one. A step is written by DECLARATION: its kind's `fields` (histKind's 4th argument) — a field not declared, or a kind without a
   declaration, refuses by name (no silent hole). Live objects are written by their permanent ids and resolved back to THE live object:
   events in the song by `e.id` (IDS1), lane points by `p.id`, capture records by take number, their lanes / chains / chain entries by
   (take, key, place), views by the song file's descriptor (`viewOfRec`: memoised, so the same object — rule #7). Every other object
   (an event that left the song, its payload, a removed record, a Map) is written once and referenced after (identity kept inside one
   history: two steps naming the same deleted event share one object again). An event copy carries its birth number (same-beat order).
   Unknown ids → the parse refuses in words and installs nothing. Not saved in song files (user answer, RUN 5). */
import { events, evSeq, evSeqPut } from './store.js';
import { takeFx } from './capture.js';
import { histLists, histInstall, histKindFields } from './history.js';
import { viewRec, viewOfRec } from './file.js';

const HIST_FORMAT='handsong/history', HIST_VERSION=1;
const COMMON=new Set(['kind','label','h','hb']);
/* probe CONTROLS only: drop one field path while writing ('autmove.from.v'); treat one kind as undeclared */
let DBG={}; const cmdDbg=o=>{ DBG=o||{}; };
const isView=x=> !!x && typeof x.mode==='object' && x.mode!==null && 'tuningRec' in x && 'anchor' in x;
const isPlain=x=>{ const p=Object.getPrototypeOf(x); return p===Object.prototype || p===null; };

/* the steps' kinds and fields, checked before anything is written */
function checkStep(u,path){
  if(!u || typeof u!=='object' || typeof u.kind!=='string') throw new Error(`${path}: not a step`);
  const F= DBG.noFields===u.kind ? null : histKindFields(u.kind);
  if(F===undefined) throw new Error(`${path}: step kind «${u.kind}» is not registered`);
  if(F===null) throw new Error(`${path}: step kind «${u.kind}» declares no fields — it cannot be serialised`);
  for(const k of Object.keys(u)) if(!COMMON.has(k) && !F.includes(k) && u[k]!==undefined) throw new Error(`${path}: step kind «${u.kind}» has field «${k}», not declared`);
  if(u.kind==='batch') (u.list||[]).forEach((s,i)=>checkStep(s,`${path}.list[${i}]`));
}
/* the live song's objects that are written by id */
function liveIndex(){
  const ev=new Map(), ids=new Set();
  for(const e of events){ if(!(e.id>0)) throw new Error('an event of the song has no id'); if(ids.has(e.id)) throw new Error(`two events share the id ${e.id}`); ids.add(e.id); ev.set(e,e.id); }
  const ref=new Map(), pts=new Set();
  for(const [tk,r] of takeFx){ ref.set(r,{ $r:tk }); if(r.lane) ref.set(r.lane,{ $l:tk }); if(r.chains) ref.set(r.chains,{ $cs:tk }); if(r.kinds) ref.set(r.kinds,{ $ck:tk });
    for(const [key,ch] of Object.entries(r.chains||{})) if(Array.isArray(ch)){ ref.set(ch,{ $c:[tk,key] }); ch.forEach((x,i)=>{ if(x && typeof x==='object') ref.set(x,{ $ce:[tk,key,i] }); }); }
    for(const p of r.lane||[]){ if(!(p.id>0)) throw new Error(`a lane point of take ${tk} has no id`); if(pts.has(p.id)) throw new Error(`two lane points share the id ${p.id}`); pts.add(p.id); ref.set(p,{ $p:p.id }); } }
  return { ev, ref };
}
const NUMS={ 'NaN':NaN, 'Infinity':Infinity, '-Infinity':-Infinity, '-0':-0 };
function histToJSON(){
  const { past, future }=histLists();
  past.forEach((u,i)=>checkStep(u,`past[${i}]`)); future.forEach((u,i)=>checkStep(u,`future[${i}]`));
  const { ev, ref }=liveIndex(), seen=new Map(); let n=0;
  const enc=(x,path)=>{
    if(typeof x==='number') return Number.isFinite(x) && !Object.is(x,-0) ? x : { $n:String(Object.is(x,-0) ? '-0' : x) };
    if(x===null || typeof x==='string' || typeof x==='boolean') return x;
    if(x===undefined) return { $u:1 };
    if(typeof x!=='object') throw new Error(`${path}: a ${typeof x} cannot be serialised`);
    if(ev.has(x)) return { $e:ev.get(x) };
    if(isView(x)) return { $v:viewRec(x) };
    if(ref.has(x)) return ref.get(x);
    if(seen.has(x)) return { $o:seen.get(x) };
    const i=n++; seen.set(x,i);
    if(x instanceof Map) return { $m:i, v:[...x].map(([k,v],j)=>[enc(k,`${path}<${j}>`), enc(v,`${path}<${j}>`)]) };
    if(x instanceof Set) return { $s:i, v:[...x].map((v,j)=>enc(v,`${path}<${j}>`)) };
    if(Array.isArray(x)) return { $a:i, v:x.map((v,j)=>enc(v,`${path}[${j}]`)) };
    if(!isPlain(x)) throw new Error(`${path}: a ${x.constructor && x.constructor.name} cannot be serialised`);
    const o={}, at= typeof x.kind==='string' && histKindFields(x.kind)!==undefined ? `${path}.${x.kind}` : path;   // a step inside a batch names its kind too
    for(const k of Object.keys(x)){ if(x[k]===undefined) continue; const p=`${at}.${k}`;
      if(DBG.drop && p.endsWith(DBG.drop)) continue;
      o[k]=enc(x[k],p); }
    const q=evSeq.get(x);   // an event that left the song: its birth number rides along
    return q ? { $d:i, v:o, q } : { $d:i, v:o };
  };
  const walk=(L,name)=>L.map((u,i)=>enc(u,`${name}[${i}]`));   // the path names the kind: a dropped field is «….autmove.from.v»
  return { format:HIST_FORMAT, version:HIST_VERSION, past:walk(past,'past'), future:walk(future,'future') };
}
/* a parsed record → the history installed in place of the live one; → { ok:true, steps } or { ok:false, why } (nothing installed) */
function histFromJSON(j){
  try{
    if(!j || j.format!==HIST_FORMAT) return { ok:false, why:'not a history' };
    if(j.version!==HIST_VERSION) return { ok:false, why:`history version ${j.version} (this app reads ${HIST_VERSION})` };
    const ev=new Map(); for(const e of events) ev.set(e.id,e);
    const pt=new Map(); for(const r of takeFx.values()) for(const p of r.lane||[]) pt.set(p.id,p);
    const rec=tk=>{ const r=takeFx.get(tk); if(!r) throw new Error(`no capture record for take ${tk}`); return r; };
    const objs=[];
    const dec=x=>{
      if(x===null || typeof x!=='object') return x;
      if(Array.isArray(x)) throw new Error('a bare array in the history');
      if('$n' in x){ if(!(x.$n in NUMS)) throw new Error(`unknown number ${x.$n}`); return NUMS[x.$n]; }
      if('$u' in x) return undefined;
      if('$e' in x){ const e=ev.get(x.$e); if(!e) throw new Error(`no event with id ${x.$e} in the song`); return e; }
      if('$v' in x){ const v=viewOfRec(x.$v); if(!v) throw new Error(`the mode ${x.$v.mode} is not in this app`); return v; }
      if('$r' in x) return rec(x.$r);
      if('$l' in x) return rec(x.$l).lane;
      if('$cs' in x) return rec(x.$cs).chains;
      if('$ck' in x) return rec(x.$ck).kinds;
      if('$c' in x){ const c=rec(x.$c[0]).chains[x.$c[1]]; if(!Array.isArray(c)) throw new Error(`take ${x.$c[0]} has no chain ${x.$c[1]}`); return c; }
      if('$ce' in x){ const c=rec(x.$ce[0]).chains[x.$ce[1]], e=c && c[x.$ce[2]]; if(!e) throw new Error(`take ${x.$ce[0]}: no chain entry ${x.$ce[1]}[${x.$ce[2]}]`); return e; }
      if('$p' in x){ const p=pt.get(x.$p); if(!p) throw new Error(`no lane point with id ${x.$p}`); return p; }
      if('$o' in x){ if(!(x.$o in objs)) throw new Error(`object ${x.$o} named before it was written`); return objs[x.$o]; }
      if('$m' in x){ const m=new Map(); objs[x.$m]=m; for(const [k,v] of x.v) m.set(dec(k),dec(v)); return m; }
      if('$s' in x){ const s=new Set(); objs[x.$s]=s; for(const v of x.v) s.add(dec(v)); return s; }
      if('$a' in x){ const a=[]; objs[x.$a]=a; for(const v of x.v) a.push(dec(v)); return a; }
      if('$d' in x){ const o={}; objs[x.$d]=o; for(const k of Object.keys(x.v)) o[k]=dec(x.v[k]); if(x.q) evSeqPut(o,x.q); return o; }
      throw new Error(`unknown node ${Object.keys(x).join(',')}`);
    };
    const past=(j.past||[]).map(dec), future=(j.future||[]).map(dec);
    past.forEach((u,i)=>checkStep(u,`past[${i}]`)); future.forEach((u,i)=>checkStep(u,`future[${i}]`));
    histInstall(past,future);
    return { ok:true, steps:past.length+future.length };
  }catch(e){ return { ok:false, why:String(e && e.message || e) }; }
}
/* the round trip in one call (probe and journal tests): write → text → parse → install */
function histRoundTrip(){
  let t; try{ t=JSON.stringify(histToJSON()); }catch(e){ return { ok:false, why:'write: '+(e && e.message || e) }; }
  const r=histFromJSON(JSON.parse(t)); return r.ok ? { ...r, bytes:t.length } : r;
}
export { HIST_FORMAT, histToJSON, histFromJSON, histRoundTrip, cmdDbg };
