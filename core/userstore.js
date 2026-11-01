/* ═══ ⛳ ХРАНИЛИЩЕ ФАЙЛОВ ПОЛЬЗОВАТЕЛЯ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, — записи формы v1 (те же, что в data/), хранятся В БРАУЗЕРЕ.
   Основное хранилище — IndexedDB (база 'handsong-user', хранилище 'files', ключ «вид:id», значение {kind, id, rec, at}); нет IndexedDB
   (запрещён, ошибка открытия) — ТОТ ЖЕ store, что уже держит выбор языка (i18n: localStorage, а без него — память страницы), под ключом
   'handsong.userfiles' (JSON-карта тех же записей). Что видит человек: в обычном окне файлы живут, пока не очищены данные сайта; в
   ПРИВАТНОМ окне браузеры дают IndexedDB на время окна (Chrome, Firefox, Safari) — файлы живут, пока окно открыто, и пропадают с ним;
   если и IndexedDB, и localStorage недоступны — только память страницы: файл работает до перезагрузки.
   ⛔ Нижний слой: DOM не трогает. Импортирует только i18n.store (цикла нет: i18n ничего не импортирует). */
import { store } from './i18n.js';

const DB='handsong-user', OS='files', FB_KEY='handsong.userfiles';
export let backend='?';   // 'indexeddb' | 'store' — куда пишем (печатает консоль U.list())
let dbP=null;
function openDB(){
  if(dbP) return dbP;
  dbP=new Promise(res=>{
    try{
      if(typeof indexedDB==='undefined') return res(null);
      const rq=indexedDB.open(DB,1);
      rq.onupgradeneeded=()=>{ rq.result.createObjectStore(OS); };
      rq.onsuccess=()=>res(rq.result);
      rq.onerror=()=>res(null); rq.onblocked=()=>res(null);
    }catch(e){ res(null); }
  });
  return dbP.then(db=>{ backend = db ? 'indexeddb' : 'store'; return db; });
}
const fbAll=()=>{ try{ const j=store.get(FB_KEY); return j ? JSON.parse(j) : {}; }catch(e){ return {}; } };
const fbSave=m=>store.set(FB_KEY, JSON.stringify(m));
const keyOf=(kind,id)=>kind+':'+id;
const tx=(db,mode,fn)=>new Promise((res,rej)=>{ const t=db.transaction(OS,mode), os=t.objectStore(OS); const r=fn(os);
  t.oncomplete=()=>res(r && 'result' in r ? r.result : undefined); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); });

/* Все записи — по времени установки (порядок загрузки и меню). Ошибка чтения — пусто: файлы человека НИКОГДА не мешают встроенным. */
export async function userAll(){
  try{
    const db=await openDB();
    const list = db ? await tx(db,'readonly',os=>os.getAll()) : Object.values(fbAll());
    return (list||[]).filter(e=>e && e.kind && e.id && e.rec).sort((a,b)=>(a.at||'')<(b.at||'')?-1:(a.at||'')>(b.at||'')?1:0);
  }catch(e){ console.warn('[user files] could not read the store —', e && e.message || e); return []; }
}
export async function userPut(kind,id,rec){
  const e={ kind, id, rec, at:new Date().toISOString() }, db=await openDB();
  if(db) await tx(db,'readwrite',os=>os.put(e, keyOf(kind,id)));
  else { const m=fbAll(); m[keyOf(kind,id)]=e; fbSave(m); }
  return e;
}
export async function userDel(kind,id){
  const db=await openDB();
  if(db) await tx(db,'readwrite',os=>os.delete(keyOf(kind,id)));
  else { const m=fbAll(); delete m[keyOf(kind,id)]; fbSave(m); }
}
