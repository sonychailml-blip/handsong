/* NIGHT-15: ASK ONCE TO KEEP NIGHT'S FILES (pure/persist.js decides). persistSoon() — called when the camera first runs — waits PERSIST_DELAY_MS
   (the start's busy moment is over), asks if the law says so and stores the answer on this device; persistInfo() for «Measure this device». */
import { PERSIST_KEY, persistPlan, persistLine } from './pure/persist.js';

const PERSIST_DELAY_MS=10000;
const S={ plan:null, asked:0, ok:null, err:'' };
const read=()=>{ try{ return JSON.parse(localStorage.getItem(PERSIST_KEY)||'null'); }catch(e){ return null; } };
const persisted=async ()=>{ try{ return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; }catch(e){ return null; } };
let armed=false;
export async function persistAsk(){
  const api=!!(navigator.storage && navigator.storage.persist);
  S.plan=persistPlan({ api, persisted:await persisted(), ua:navigator.userAgent, stored:read() });
  if(!S.plan.ask) return S;
  try{ S.asked++; S.ok=!!(await navigator.storage.persist()); }catch(e){ S.ok=false; S.err=String(e&&e.message||e); }
  try{ localStorage.setItem(PERSIST_KEY, JSON.stringify({ at:new Date().toISOString(), ok:S.ok })); }catch(e){}
  return S;
}
export function persistSoon(ms=PERSIST_DELAY_MS){ if(armed) return; armed=true; setTimeout(()=>{ persistAsk().catch(()=>{}); }, ms); }
export async function persistInfo(){ return persistLine(await persisted(), read()); }
export const persistDbg=()=>({ ...S, plan:S.plan && { ...S.plan }, stored:read(), armed });
