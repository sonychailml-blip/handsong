/* NIGHT-15: KEEP NIGHT'S FILES — whether to ask the browser for persistent storage (navigator.storage.persist), so a browser short of space does
   not drop the precache. Asked once per device, quietly, after the first successful start, and never where asking shows the person a prompt
   (Firefox asks; Chrome and Safari decide by themselves). Pure (data row «NIGHT storage persist (app)»).
   env: { api (persist exists), persisted (already), ua, stored (an earlier ask's record or null) } → { ask, why } */
export const PERSIST_KEY='handsong.nightPersist';
export const promptsFor=ua=>/\bFirefox\/|\bFxiOS\//.test(String(ua||''));
export function persistPlan(env){
  const e=env||{};
  if(!e.api) return { ask:false, why:'no storage.persist in this browser' };
  if(e.persisted) return { ask:false, why:'already kept' };
  if(e.stored) return { ask:false, why:'asked before' };
  if(promptsFor(e.ua)) return { ask:false, why:'this browser would ask the person' };
  return { ask:true, why:'' };
}
/* the line «Measure this device» prints */
export function persistLine(now, rec){
  const r=rec||null;
  return `storage kept: ${now===true ? 'yes' : now===false ? 'no' : 'unknown'}`+(r ? ` · asked ${String(r.at||'').slice(0,10)}: ${r.ok ? 'granted' : 'not granted'}` : ' · not asked');
}
