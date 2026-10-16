/* PROBE1: The console guard: window.P = api() — one probe at a time; its self-test runs inside row «write path (funnels)». Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import * as SELF from '../scaleprobe.js';
import { afPause, afBusy, afIdle } from '../frzqueue.js';
import { asPause } from '../autosave.js';   // AUTOSAVE1: no autosave while a probe holds the lock

/* ═══ ⛳ СТРАЖ КОНСОЛИ — ОДНА ПРОБА ЗА РАЗ (слайс AUTO-PROBE) ═══
   window.P (адрес с ?probe — main.js) — НЕ сам модуль, а api(): каждая функция модуля обёрнута замком. Пока идёт любая проба (P.seed
   тоже), другой вызов P.* ОТКАЗЫВАЕТ словами и ничего не делает. Найдено у пользователя: P.quick, набранный до конца P.seed, прогнал
   строки на недостроенной песне (секция соло посева не прошла, замороженного баса не было) — 20 расхождений, ни одно не про код.
   Внутри модуля пробы зовут друг друга напрямую (P.all → checkSwap …) — мимо замка, как и прежде. Отказ — объект { refused:true, why }
   (у P.all/P.quick ещё pass:false), строка в консоль. ⚠️ Прямой импорт модуля (const P = await import(...)) — без стража. */
let LOCK=null;
const lockWhy=n=> LOCK==='seed' ? `P.seed is still running — wait for 'Now run P.all()' before P.${n}()`
                                : `P.${LOCK} is still running — wait for its result before P.${n}()`;
let API=null;

export function api(){
  if(API) return API;
  API={};
  for(const [n,v] of Object.entries(SELF)){
    if(typeof v!=='function' || n==='api'){ API[n]=v; continue; }
    API[n]=(...args)=>{
      if(LOCK){ const why=lockWhy(n); console.warn('[probe] '+why); return n==='all'||n==='quick' ? { pass:false, refused:true, why } : { refused:true, why }; }
      LOCK=n; afPause('probe',true); asPause('probe',true);   // AF3: the auto-freeze watcher is paused while any probe runs; a render in flight finishes first
      const done=()=>{ LOCK=null; afPause('probe',false); asPause('probe',false); };
      let r;
      try{ r= afBusy() ? afIdle().then(()=>v(...args)) : v(...args); }catch(e){ done(); throw e; }
      if(r && typeof r.then==='function') return r.finally(done);
      done(); return r;
    };
  }
  return API;
}
/* Проверка стража (строка «write path (funnels)»): пока замок взят, обёрнутый P.quick отказывает и не прогоняет ни строки; КОНТРОЛЬ — с
   отпущенным замком та же обёртка у дешёвой функции (material) работает (страж не отказывает всем подряд). Замок, взятый извне (P.all),
   возвращается как был. */
export function guardSelfTest(miss){
  const held=LOCK, A=api(); let cases=0;
  try{
    LOCK=held||'checkWrite'; cases++;
    const r=A.quick();
    if(!(r && r.refused && /still running/.test(r.why||''))) miss('console guard: P.quick() started while another probe held the lock');
    LOCK=null; cases++;
    const m=A.material();
    if(!m || m.refused || typeof m.ok!=='boolean') miss('CONTROL (console guard): with no probe running, the guarded P.material() was refused or gave nothing — the guard refuses everything');
    if(LOCK!==null) miss('console guard: a finished call did not release the lock');
  } finally { LOCK=held; }
  return cases;
}
