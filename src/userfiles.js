/* ═══ ⛳ ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ — КОНСОЛЬ (слайс F6 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   Строи, лады, палитры и наборы режимов аккордов, сделанные человеком, ставятся и снимаются из консоли (интерфейса — конструктора —
   пока нет; эти вызовы — его задний конец). Никто в приложении этот модуль не импортирует; ?probe в адресе кладёт его в window.U, иначе:
     const U = await import(new URL('src/userfiles.js', location.href).href);
     await U.installExample()            // пример: свой строй (7 чистых высот, имена до-ре-ми) и лад на нём — в «Эксперименты», в конце
     await U.install(jsonOrObject)       // поставить файл формы v1 (строка JSON или объект); id нет — выдаётся u.<uuid>
     await U.list()                      // таблица файлов пользователя: вид, id, имя, когда поставлен, действует ли
     await U.remove('u.…')               // снять (не снимется, пока от него зависят другие записи — их назовут)
     await U.exportFile('u.…')           // скачать файл <id>.json
     U.example() / U.brokenExample()     // примеры записей (второй — нарочно сломанный лад: ссылается на несуществующий строй)
     await U.installChordModesExample()  // F6b: свой набор из ТРЁХ режимов аккордов со своими именами и лад (мажор на 12-равном) с ним
     await U.storeUnchecked(obj)         // ТОЛЬКО ДЛЯ ПРОВЕРКИ ЗАГРУЗЧИКА: положить в хранилище БЕЗ проверки — после перезагрузки загрузчик
                                         //   его пропустит и стартовая карточка скажет об этом
   ⛳ УСТАНОВКА И УДАЛЕНИЕ ДЕЙСТВУЮТ СРАЗУ (и сохраняются для следующего старта): запись проверяется ТЕМ ЖЕ валидатором, что файлы data/,
   против ЖИВОГО набора (scaleload.checkRecord), собирается ТЕМ ЖЕ кодом, что на старте (scales.registerRecord), и меню перестраивается
   (hooks.scales). Почему сразу: конструктору нужно услышать строй, как только он сохранён; реестры — обычные таблицы, которые сборщик и
   так наполняет, а удаление не трогает записанного (каждое событие держит свой вид — строй и лад; проба P.checkUserDelete).
   ⛳ ID: свой — только «u.<uuid>»; совпал со встроенным — отказ (встроенные id так не начинаются, но проверка стоит). Тот же id того же
   вида — ЗАМЕНА (на прежнее место в меню; строй, палитру или набор, от которых зависят другие записи, заменить нельзя — назовут кого);
   тот же id у файла ДРУГОГО вида — отказ. */
import { scaleData, registerRecord, unregisterRecord, dependentsOf } from './scales.js';
import { checkRecord, kindOfRecord, idHolder, USER_ID, KINDS } from './scaleload.js';
import { userAll, userPut, userDel, backend } from './userstore.js';
import { L } from './i18n.js';

const say=m=>console.log('%c[user files] '+m,'color:#57d9a3;font-weight:bold');
const fail=m=>{ console.warn('[user files] '+m); return { ok:false, why:m }; };
const uuid=()=> (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
const sectOf=kind=>KINDS.find(k=>k[0]===kind)[1];
const nameOf=rec=> rec && rec.name ? L(rec.name) : (rec && rec.id) || '?';
/* F6b: имя строя по id — из живого набора (встроенного или своего); нет — сам id. */
const tuningName=id=>{ const x=scaleData().tunings[id]; return x && x.name ? L(x.name) : id; };

export async function install(input){
  let rec;
  try{ rec= typeof input==='string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input)); }
  catch(e){ return fail('not valid JSON — '+(e && e.message || e)); }
  const kind=kindOfRecord(rec);
  if(!kind) return fail('unknown kind of file: "format" must be handsong/tuning, handsong/mode, handsong/palette or handsong/chordmodes');
  if(rec.id==null){ rec.id='u.'+uuid(); say(`no id given — this ${kind} gets ${rec.id}`); }
  if(!USER_ID.test(String(rec.id))) return fail(`a user file id must be u.<uuid> (got "${rec.id}") — leave id out and one is made`);
  const D=scaleData(), holder=idHolder(D,rec.id), mine=(await userAll()).find(e=>e.id===rec.id);
  if(holder && !mine) return fail(`the id "${rec.id}" belongs to a built-in ${holder}`);
  if(mine && mine.kind!==kind) return fail(`the id "${rec.id}" already belongs to your ${mine.kind} — a file of another kind needs another id`);
  if(holder===kind && kind!=='mode'){ const dep=dependentsOf(kind,rec.id);
    if(dep.length) return fail(`cannot replace ${kind} "${rec.id}": still used by ${dep.join(', ')} — remove those first, or install under a new id`); }
  const why=checkRecord(kind, rec, D);
  if(why) return fail(`REFUSED ${kind} "${nameOf(rec)}" — ${why}`);
  await userPut(kind, rec.id, rec);
  const r=registerRecord(kind, rec);
  if(!r.ok){ await userDel(kind, rec.id); return fail(`could not register ${kind} "${rec.id}": ${r.why}`); }
  const where= kind==='mode' ? ` — on the tuning "${tuningName(rec.tuning)}"; in the scale menu: ${L((D.menu.traditions.find(t=>t.id===rec.menu.tradition)||{}).name||rec.menu.tradition)} › ${rec.menu.group ? L(D.menu.groups[rec.menu.group]) : '(no group)'}, after the built-ins`
    : kind==='chordmodes' ? ` — ${rec.modes.length} chord mode(s): ${rec.modes.map(m=>m.name ? L(m.name) : m.id).join(' / ')}` : '';
  say(`${holder ? 'replaced' : 'installed'} your ${kind} "${nameOf(rec)}" (${rec.id}) — in effect now and stored (${backend})${where}`);
  return { ok:true, kind, id:rec.id, replaced:!!holder };
}
export async function list(){
  const all=await userAll(), D=scaleData();
  const rows=all.map(e=>({ kind:e.kind, name:nameOf(e.rec), tuning: e.kind==='mode' ? tuningName(e.rec.tuning) : '', id:e.id, installed:e.at, active:!!D[sectOf(e.kind)][e.id] }));   // F6b: имя строя, а не id
  if(rows.length) console.table(rows); else say('no user files');
  say(`stored in: ${backend}${backend==='store' ? ' (IndexedDB unavailable — localStorage, or page memory only)' : ''}`);
  return rows;
}
export async function remove(id){
  const e=(await userAll()).find(x=>x.id===id); if(!e) return fail(`no user file "${id}"`);
  const D=scaleData();
  if(D[sectOf(e.kind)][id]){ const r=unregisterRecord(e.kind,id); if(!r.ok) return fail(`cannot remove ${e.kind} "${id}": ${r.why}`); }
  await userDel(e.kind,id);
  say(`removed your ${e.kind} "${nameOf(e.rec)}" (${id}) — in effect now; anything already recorded in it still plays and shows as recorded`);
  return { ok:true };
}
export async function exportFile(id){
  const e=(await userAll()).find(x=>x.id===id); if(!e) return fail(`no user file "${id}"`);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(e.rec,null,2)+'\n'],{type:'application/json'})); a.download=id+'.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  say(`downloaded ${id}.json`); return { ok:true };
}
export async function storeUnchecked(obj){
  const kind=kindOfRecord(obj)||'mode', id=obj && obj.id || 'u.'+uuid();
  await userPut(kind, id, {...obj, id});
  say(`stored ${kind} "${id}" WITHOUT checking — reload: the loader checks it like any file and skips it if broken (the start card says so)`);
  return { ok:true, kind, id };
}

/* ⛳ ПРИМЕР: свой строй — семь ЧИСТЫХ высот (Чистый мажор Птолемея: 1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8), имена до-ре-ми списком, слово
   периода своё (en/ru); лад на нём — все семь ступеней, аккорды — палитра 'nat' (чистые отношения, «адаптивно»), в «Эксперименты». */
const EX_T='u.5e1d1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2b', EX_M='u.5e1d1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2c';
export function example(){
  const nm=(en,ru)=>({en,ru});
  const tuning={ format:'handsong/tuning', version:1, id:EX_T, name:nm('Ptolemy\'s just major (my file)','Чистый мажор Птолемея (мой файл)'), period:'2/1',
    pitches:{ list:[ {cents:0, ratio:'1/1'}, {cents:203.91, ratio:'9/8'}, {cents:386.31, ratio:'5/4'}, {cents:498.04, ratio:'4/3'},
                     {cents:701.96, ratio:'3/2'}, {cents:884.36, ratio:'5/3'}, {cents:1088.27, ratio:'15/8'} ] },
    naming:{ scheme:'list', names:[ {name:nm('Do','До')}, {name:nm('Re','Ре')}, {name:nm('Mi','Ми')}, {name:nm('Fa','Фа')}, {name:nm('Sol','Соль')}, {name:nm('La','Ля')}, {name:nm('Ti','Си')} ] },
    periodWord:{ short:nm('oct','окт'), full:nm('OCTAVE','ОКТАВА') }, describe:{kind:'table'} };
  const mode={ format:'handsong/mode', version:1, id:EX_M, tuning:EX_T, name:nm('Just major (my file)','Чистый мажор (мой файл)'),
    menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6], root:0, anchor:{policy:'tonic'},
    chords:{ rule:{kind:'palette'}, palette:'nat', build:'adaptive' },
    progressions:false };   // F4: аккорды — только палитрой, а прогрессии джема пишут аккорды без типа — у этого лада их нет
  return { tuning, mode };
}
export function brokenExample(){
  const { mode }=example();
  return { ...mode, id:'u.0badf11e-0000-4000-8000-000000000001', tuning:'u.0badf11e-0000-4000-8000-00000000dead', name:{en:'Broken on purpose', ru:'Нарочно сломан'} };
}
/* ⛳ F6b — ПРИМЕР СВОЕГО НАБОРА РЕЖИМОВ АККОРДОВ: три режима со СВОИМИ именами и подсказками ({en, ru}), переопределения — из того же
   белого списка (build, palette, rule): «Терции» — без переопределений (правило лада, стопка терций), «Палитра» — palette 'chrom12'
   (типы аккордов из палитры хроматики), «Пауэр» — rule power (корень, квинта, октава). Лад — мажор на встроенном 12-равном строе со
   ссылкой на этот набор, в «Привычное» без группы (в конце). */
const EX_CM='u.5e1d1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2d', EX_CMM='u.5e1d1a2b-3c4d-4e5f-8a6b-7c8d9e0f1a2e';
export function chordModesExample(){
  const nm=(en,ru)=>({en,ru});
  const set={ format:'handsong/chordmodes', version:1, id:EX_CM, modes:[
    { id:'thirds',  name:nm('Thirds','Терции'),   hint:nm('Chords stacked in thirds of the mode','Аккорды — стопка терций лада'), set:{} },
    { id:'palette', name:nm('Palette','Палитра'), hint:nm('Any chord type from the chromatic palette','Любой тип аккорда из палитры хроматики'), set:{ palette:'chrom12' } },
    { id:'power',   name:nm('Power','Пауэр'),     hint:nm('Root, fifth and octave','Корень, квинта и октава'), set:{ rule:{kind:'power'} } } ] };
  const mode={ format:'handsong/mode', version:1, id:EX_CMM, tuning:'edo12', name:nm('Major with three chord modes (my file)','Мажор с тремя режимами аккордов (мой файл)'),
    menu:{tradition:'common', group:''}, degrees:[0,2,4,5,7,9,11], root:0, anchor:{policy:'tonic'},
    chords:{ rule:{kind:'tertian'}, modes:EX_CM } };
  return { set, mode };
}
export async function installChordModesExample(){ const E=chordModesExample(); const a=await install(E.set); if(!a.ok) return a; return install(E.mode); }
export async function installExample(){ const E=example(); const a=await install(E.tuning); if(!a.ok) return a; return install(E.mode); }
