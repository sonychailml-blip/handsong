/* SPLIT-2: row «NIGHT migrate»: old setting names move to the new ones, are removed, a new value wins over an old one, a second run changes nothing. Deterministic: a store made for the row, the
   person's own storage is not touched. CONTROL: with the move skipped the same judge must fail. */
import { row } from '../core/rows.js';
import { migrateKeys, OLD_PREFIX, NEW_PREFIX, SUFFIXES } from '../../../apps/night/migrate.js';

const storeOf=init=>{ const m=new Map(Object.entries(init)); return { getItem:k=>m.has(k) ? m.get(k) : null, setItem:(k,v)=>{ m.set(k,String(v)); }, removeItem:k=>{ m.delete(k); }, dump:()=>JSON.stringify([...m].sort()) }; };
const seeded=()=>{ const init={}; SUFFIXES.forEach((s,i)=>{ init[OLD_PREFIX+s]='old'+i; }); init[NEW_PREFIX+'Bg']='kept'; init['handsong.lang']='ru'; return storeOf(init); };
function judge(st){ const out=[];
  SUFFIXES.forEach((s,i)=>{ if(st.getItem(OLD_PREFIX+s)!==null) out.push(`${s}: the old name is still there`);
    const want= s==='Bg' ? 'kept' : 'old'+i; if(st.getItem(NEW_PREFIX+s)!==want) out.push(`${s}: new name holds ${st.getItem(NEW_PREFIX+s)}, expected ${want}`); });
  if(st.getItem('handsong.lang')!=='ru') out.push('another setting was touched');
  return out; }
export function checkNightMigrate(){
  const d=[]; let n=0, st=seeded(); migrateKeys(st); n+=SUFFIXES.length*2+1; d.push(...judge(st));
  const once=st.dump(); migrateKeys(st); n++; if(st.dump()!==once) d.push('a second run changed something');
  n++; if(!judge(seeded()).length) d.push('CONTROL: with the move skipped the judge found nothing — the row cannot fail');
  return { cases:n, total:d.length, differences:d };
}
row({ at:1009.96, night:true, name:'NIGHT migrate', run:()=>checkNightMigrate(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
