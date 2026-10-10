import { scaleId, tonic, seventh, aRef, rectPref, tunedFrom, chordModeSel, setScaleId, setTunedFrom, setChordMode } from './state.js';   // F7: setTunedFrom/setChordMode — предустановка псевдонима (applyScaleId)   // tunedFrom — P3 «строй от»: читает ТОЛЬКО scaleView (CUR); chordModeSel — T7b, выбранный режим аккордов лада (тоже только scaleView/chordModeOf)
import { t, L } from './i18n.js';   // t — для regWord (слово-регистр); L — для имён списка строя (listName, F3) и слова периода строя пользователя (имена ладов/групп резолвят L() на стороне рисующих)
import { loadScaleData, loadReport } from './scaleload.js';
import { hooks } from './hooks.js';   // F6: hooks.scales — реестр ладов изменился (установка/удаление файла пользователя) → ui перестраивает меню   // F5: данные ладов — ФАЙЛЫ data/ (форма v1), загрузчик с проверкой; сборщик ниже
export { loadReport };   // F5: итог загрузки (пропущенные файлы, аварийная пара) — известие на стартовой карточке (main)

export const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ROMAN=['I','II','III','IV','V','VI','VII'];
export const OCT_ROMAN=['I','II','III','IV'];
export const range=n=>Array.from({length:n},(_,i)=>i);
/* ═══ ⛳ СБОРЩИК (слайс F2 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) — ДАННЫЕ ФОРМЫ v1 (файлы data/, F5) → СЕГОДНЯШНИЕ ОБЪЕКТЫ ПРИЛОЖЕНИЯ ═══
   Все строи, лады, палитры, режимы аккордов, традиции и группы живут в ФАЙЛАХ data/ В ФОРМЕ v1 (до F5 — модуль scaledata.js); здесь из них строятся РОВНО те
   объекты, что до F2 стояли литералами (TRADITIONS, GRP, TUNINGS, CHORD_FAM_SETS, SCALES) — читатели не тронуты ни одной строкой.
   Доказательство — снимок F0 (P.checkFiles: ноль), который сравнивает каждое поле каждого лада, строя и палитры и все производные.
   ⛳ ЧТО ВЫВОДИТСЯ У ЛАДА (m — запись лада, T — его строй):
     sel   = m.degrees (индексы строя — ДАННЫЕ; до F2 их выводил modeDerive из центов, теперь наоборот);   root = m.root;
     edo   — РАВНЫЙ строй: число шагов строя (T.equal);  ТАБЛИЦА: число ступеней лада (номинальная структура, как было);
     iv    — РАВНЫЙ: те же индексы (ступени в шагах строя);  ТАБЛИЦА: 0..n−1;
     cents — только ТАБЛИЦА: C[k mod N] + 1200·⌊k/N⌋ − C[root] — центы ступени над тоникой лада (у Баранга root = 1: −120¢); у ладов,
             которые ЕСТЬ свой строй целиком, это сама таблица, у раг и патетов — их прежние числа (проверено на всех 75: ноль отличий);
     period — период строя, только когда он не октава (у октавного лада поля нет, как было);
     noChords — правило аккордов 'none';   typedChords / gridChords / chordBuild — из chords.palette / grid / build;
     fixedKey — якорь не «от тоники» ('fixed' или 'choice');   tunable — якорь 'choice' (выбор «строй от» — только Пифагор);
     rectGrid — layout.rect;   swaraNames — ступени лада называет СПИСОК строя (naming.scheme 'list' строя, лад его не переопределил);
     swaraFull — лад показывает и вторую часть имени (naming.detail); ⚠️ с F3 оба флага — ТОЛЬКО совместимость формы (снимок F0):
     подписи их не читают, они читают схему (namingOf ниже);
     chordModes — набор режимов по id (один объект режима на весь набор: «Пауэр» — один объект правила на все 14 ладов, виды стабильны);
     grp / grpKey — подпись группы (тот же объект, что GRP[ключ]) и её ключ; у лада без группы grp = '' и grpKey нет;
     trad, name, id, tuning, chordRule — как в записи.
   ⛳ В ДАННЫХ ЯВНО: degrees и root — сама выборка; (compat.tag — семейство лада по-старому — снят в F5b: его читали только замороженные
   опоры пробы, и таблица тегов теперь живёт там, TAG_OF); меню (традиция, группа) и порядок (manifest = порядок меню и индекс i снимка F0).
   ⛳ ДРОБИ СТРОКАМИ: ratioNum('5/4') — то же деление двух целых, что делал литерал JS 5/4, — тот же double; целое без дроби — Number.
   У строя ratios (пары [числитель, знаменатель]) собираются ТОЛЬКО при chordFit:'ratios' (сегодня — Партч): у прочих таблиц отношения —
   теория в данных, приложение их пока не читает (снимок F0 записан без них).
   ⛳ F3 — ИМЕНА ДАННЫМИ. Схема имён (naming) и слово периода (periodWord) — в записи СТРОЯ, переопределение схемы ступеней — в записи
   ЛАДА; в объекты приложения они НЕ кладутся (их форма — та, что записана снимком F0), а читаются через SRC: объект приложения (запись
   TUNINGS, лад SCALES) → его запись формы v1. Ключ — сам ОБЪЕКТ, не id: вид держит свой tuningRec, и имена приходят оттуда же, откуда
   цена (правило F1 «строй — через вид»). */
/* ⛳ F5: ВЕРХНЕУРОВНЕВЫЙ await — модуль ДОЖИДАЕТСЯ файлов (scaleload.js: манифест, затем все файлы параллельно, проверка каждого)
   прежде, чем кто-либо прочтёт лады: каждый импортирующий scales.js модуль (draw, ui, gestures, recorder, audio — и копия движка рендера,
   'audio.js?render', которая импортирует этот же scales.js без строки запроса, — проба, демо, обучение) ждёт вместе с ним, и все
   синхронные читатели ниже остаются как были. Ни одного сбоя загрузки, который не дал бы данных: в худшем случае — аварийная пара. */
const D=await loadScaleData();
const SRC=new WeakMap();   // F3: объект приложения → его запись v1 (строй → D.tunings[id], лад → D.modes[id])
const ratioNum=r=> typeof r==='number' ? r : (([a,b])=> b===undefined ? Number(a) : Number(a)/Number(b))(String(r).split('/'));
export const TRADITIONS=D.menu.traditions.map(x=>({id:x.id, name:x.name}));
export const GRP={...D.menu.groups};
/* F6: сборка — по функции на вид записи (buildTuning/buildPalette/buildChordModeSet/buildMode): ТЕ ЖЕ строки, что были циклами, —
   их зовёт и старт, и установка файла пользователя на ходу (registerRecord ниже). */
const buildTuning=x=>{ const r={id:x.id, period:ratioNum(x.period)}; if(x.name!==undefined) r.name=x.name;   // F6b: имя строя (L())
  if(x.pitches.equal!=null) r.equal=x.pitches.equal;
  else { r.cents=x.pitches.list.map(p=>p.cents); if(x.chordFit==='ratios') r.ratios=x.pitches.list.map(p=>p.ratio.split('/').map(Number)); }
  SRC.set(r,x); return r; };
export const TUNINGS={};
for(const id of D.manifest.tunings) TUNINGS[id]=buildTuning(D.tunings[id]);
const buildPalette=x=>{ const cv= x.kind==='ratios' ? ratioNum : (v=>v);
  return x.families.map(f=>({...f, types:f.types.map(ty=>({...ty, iv:ty.iv.map(cv)}))})); };
export const CHORD_FAM_SETS={};
for(const id of D.manifest.palettes) CHORD_FAM_SETS[id]=buildPalette(D.palettes[id]);
const ruleOf=r=>{ const o={}; for(const k in r) o[k]= (k==='triad'||k==='seventh') ? r[k].map(ratioNum) : r[k]; return o; };
const CM_FIELD={build:'chordBuild', palette:'typedChords', rule:'chordRule', grid:'gridChords', naming:'degNaming'};   // поле режима в файле → поле вида; F7: grid — аккорды из сетки, naming — схема имён ступеней (namingOf)
const buildChordModeSet=x=>x.modes.map(m=>{ const over={};
  for(const k in m.set) over[CM_FIELD[k]]= k==='rule' ? ruleOf(m.set[k]) : m.set[k];
  const o={id:m.id};   // F6b: имя и подсказка — ключ словаря (встроенные: nameKey/hintKey, форма как была) или своё имя (name/hint, {en, ru})
  if(m.nameKey!==undefined) o.nameKey=m.nameKey; else o.name=m.name;
  if(m.hintKey!==undefined) o.hintKey=m.hintKey; else o.hint=m.hint;
  o.over=over; return o; });
/* ⛳ F6b: ИМЯ И ПОДСКАЗКА РЕЖИМА АККОРДОВ — одно чтение на панель, кнопку лада и снимок: свои имена ({en, ru}) — L(), ключ словаря — t(). */
export const chordModeName=m=> m.name!==undefined ? L(m.name) : t(m.nameKey);
export const chordModeHint=m=> m.hint!==undefined ? L(m.hint) : t(m.hintKey);
const CHORD_MODE_SETS={};
for(const id of D.manifest.chordModeSets) CHORD_MODE_SETS[id]=buildChordModeSet(D.chordModeSets[id]);
/* ⛳ F6: строй лада ЗАКРЕПЛЁН ЗА ОБЪЕКТОМ ЛАДА при сборке (а не ищется в реестре по id): вид, рождённый когда угодно — даже после
   удаления строя из реестра, — берёт тот же объект строя (scaleView, tuningOf). Так удаление файла не ломает записанное. */
const TUNING_OF_MODE=new WeakMap();
function buildMode(m){ const T=TUNINGS[m.tuning], ch=m.chords, sel=m.degrees.slice(), n=sel.length;
  const s={id:m.id, tuning:m.tuning, chordRule:ruleOf(ch.rule), name:m.name, trad:m.menu.tradition};
  if(ch.modes) s.chordModes=CHORD_MODE_SETS[ch.modes];
  if(m.menu.group==='') s.grp=''; else { s.grp=GRP[m.menu.group]; s.grpKey=m.menu.group; }
  if(T.equal!=null){ s.edo=T.equal; s.iv=sel.slice(); }
  else { const C=T.cents, N=C.length; s.edo=n; s.iv=range(n); s.cents=sel.map(k=>C[k%N]+1200*Math.floor(k/N)-C[m.root]); }
  if(T.period!==2) s.period=T.period;
  if(ch.rule.kind==='none') s.noChords=true;
  if(ch.palette) s.typedChords=ch.palette;
  if(ch.grid) s.gridChords=true;
  if(ch.build) s.chordBuild=ch.build;
  if(m.anchor.policy!=='tonic') s.fixedKey=true;
  if(m.anchor.policy==='choice') s.tunable=true;
  if(m.layout && m.layout.rect) s.rectGrid=true;
  if(((m.naming && m.naming.scheme) || D.tunings[m.tuning].naming.scheme)==='list') s.swaraNames=true;   // F3: совместимость формы — см. выше
  if(m.naming && m.naming.detail) s.swaraFull=true;
  s.sel=sel; s.root=m.root;
  SRC.set(s,m); TUNING_OF_MODE.set(s,T);
  return s; }
export const SCALES=D.manifest.modes.map(id=>buildMode(D.modes[id]));
/* ⛳ F1: ЛАД ПО id — единственный способ найти лад (state.scaleId, меню, уроки, демо). Неизвестный id — null; CUR() тогда берёт первый лад. */
const SCALE_BY_ID=new Map(SCALES.map(s=>[s.id,s]));
export const scaleById=id=>SCALE_BY_ID.get(id) || (ALIAS.has(id) ? SCALE_BY_ID.get(ALIAS.get(id).id) : null) || null;   // F7: и по псевдониму (ALIAS — ниже; читается при вызове)
/* ⛳ F7 — ПСЕВДОНИМЫ ЛАДОВ: прежний id ведёт на лад с ПРЕДУСТАНОВКОЙ («строй от», режим аккордов). Живут в файле лада (поле aliases:
   [{id, tunedFrom?, chordMode?}], проверка формы — scaleload); здесь — карта id → {id лада, предустановка}. 'ji-adaptive' и 'ji-fixed'
   (до F7 — два лада) ведут на 'just-intonation' с «следует за тоникой + Свободно» и «от C + Как на инструменте». Занятый id (лад или
   другой псевдоним) — не принимается (строка в консоли). scaleById(псевдоним) → лад; viewOfId(псевдоним) → ВИД предустановки (то, во
   что откроется сохранённое событие со старым id); applyScaleId(псевдоним) — живой лад с его предустановкой. */
const ALIAS=new Map();
function addAliases(m){ for(const a of (m.aliases||[])){
  if(SCALE_BY_ID.has(a.id) || ALIAS.has(a.id)){ console.warn(`[scales] alias "${a.id}" of mode "${m.id}" is already taken — ignored`); continue; }
  ALIAS.set(a.id, { id:m.id, tunedFrom:a.tunedFrom, chordMode:a.chordMode }); } }
function dropAliases(id){ for(const [k,a] of [...ALIAS]) if(a.id===id) ALIAS.delete(k); }
for(const id of D.manifest.modes) addAliases(D.modes[id]);
export const resolveScaleId=id=> SCALE_BY_ID.has(id) ? { id } : ALIAS.has(id) ? { ...ALIAS.get(id) } : null;
export function viewOfId(id){ const r=resolveScaleId(id); if(!r) return null; const m=SCALE_BY_ID.get(r.id);
  return scaleView(m, r.tunedFrom!==undefined ? r.tunedFrom : tunedFrom, r.chordMode!==undefined ? r.chordMode : chordModeOf(m)); }
export function applyScaleId(id){ const r=resolveScaleId(id); if(!r) return null;
  setScaleId(r.id); if(r.tunedFrom!==undefined) setTunedFrom(r.tunedFrom); if(r.chordMode!==undefined) setChordMode(r.id, r.chordMode);
  return r.id; }
/* ⛳ F7: ПОДСКАЗКА ВЫБОРА «СТРОЙ ОТ» — ключи словаря из данных лада (anchor.followHint/fixedHint), иначе общие (Пифагор — как было). */
export const anchorHints=s=>{ const a=(modeRecOf(s)||{}).anchor||{}; return { follow:a.followHint||'panel.scale.tunedFollowHint', fixed:a.fixedHint||'panel.scale.tunedFixedHint' }; };
setScaleId(D.manifest.start);   // F5: стартовый лад — из манифеста (загрузчик уже заменил незагрузившийся первым годным)
/* ═══ ⛳ F6 — РЕЕСТР МЕНЯЕТСЯ НА ХОДУ: УСТАНОВКА И УДАЛЕНИЕ ФАЙЛА ПОЛЬЗОВАТЕЛЯ ═══
   Задний конец консоли userfiles.js (и будущего конструктора). Запись ПРОВЕРЯЕТ вызывающий (scaleload.checkRecord против scaleData());
   здесь — только сборка тем же кодом, что на старте, и учёт в наборе D и реестрах (TUNINGS, CHORD_FAM_SETS, наборы режимов, SCALES и
   SCALE_BY_ID — объекты те же, что держат все модули: SCALES меняется НА МЕСТЕ). Лад пользователя встаёт в КОНЕЦ SCALES — в меню он
   в своей традиции и группе после встроенных (menuOf — порядок массива). Удаление снимает запись из реестров и набора — ⛔ НО НЕ ИЗ
   ВИДОВ: каждое записанное событие держит свой вид, вид — свой лад (.mode) и свой строй (tuningRec), запись v1 — в SRC (WeakMap по
   объекту): записанное звучит и показывается как прежде (проба P.checkUserDelete). Удаляемое, от которого зависят другие записи
   (строй — лады; палитра — лады и наборы; набор — лады), не удаляется: dependentsOf называет их. Удалили ЖИВОЙ лад — живым становится
   стартовый. notify — позвать hooks.scales (ui перестраивает меню); проба зовёт без него. */
export const scaleData=()=>D;
const SECT_OF={ tuning:'tunings', palette:'palettes', chordmodes:'chordModeSets', mode:'modes' };
export function dependentsOf(kind,id){
  const out=[];
  for(const mid of D.manifest.modes){ const m=D.modes[mid], ch=m.chords||{};
    if(kind==='tuning' && m.tuning===id) out.push('mode '+mid);
    if(kind==='palette' && ch.palette===id) out.push('mode '+mid);
    if(kind==='chordmodes' && ch.modes===id) out.push('mode '+mid); }
  if(kind==='palette') for(const cid of D.manifest.chordModeSets) if(D.chordModeSets[cid].modes.some(x=>x.set && x.set.palette===id)) out.push('chord modes '+cid);
  return out;
}
export function unregisterRecord(kind,id,notify=true){
  const sect=SECT_OF[kind]; if(!sect || !D[sect][id]) return { ok:false, why:'not installed' };
  const dep=dependentsOf(kind,id); if(dep.length) return { ok:false, why:'still used by '+dep.join(', ') };
  delete D[sect][id]; const L0=D.manifest[sect], at=L0.indexOf(id); if(at>=0) L0.splice(at,1);
  let index=-1, switched=false;
  if(kind==='tuning') delete TUNINGS[id];
  else if(kind==='palette') delete CHORD_FAM_SETS[id];
  else if(kind==='chordmodes') delete CHORD_MODE_SETS[id];
  else { const s=SCALE_BY_ID.get(id); index=SCALES.indexOf(s); if(index>=0) SCALES.splice(index,1); SCALE_BY_ID.delete(id); dropAliases(id);
    if(scaleId===id){ setScaleId(SCALE_BY_ID.has(D.manifest.start) ? D.manifest.start : SCALES[0].id); switched=true; } }
  if(notify && hooks.scales) hooks.scales({ op:'remove', kind, id, switched });
  return { ok:true, index, switched };
}
export function registerRecord(kind,rec,notify=true){
  const sect=SECT_OF[kind], id=rec.id, wasLive= kind==='mode' && scaleId===id; let index=-1;
  if(D[sect][id]){ const r=unregisterRecord(kind,id,false); if(!r.ok) return r; index=r.index; }   // замена — на прежнее место
  D[sect][id]=rec; D.manifest[sect].push(id);
  if(kind==='tuning') TUNINGS[id]=buildTuning(rec);
  else if(kind==='palette') CHORD_FAM_SETS[id]=buildPalette(rec);
  else if(kind==='chordmodes') CHORD_MODE_SETS[id]=buildChordModeSet(rec);
  else { const s=buildMode(rec); if(index>=0) SCALES.splice(index,0,s); else SCALES.push(s); SCALE_BY_ID.set(id,s); addAliases(rec); if(wasLive) setScaleId(id); }   // заменённый живой лад остаётся живым (новая сборка)
  if(notify && hooks.scales) hooks.scales({ op:'add', kind, id, switched:wasLive });
  return { ok:true };
}

/* Лады традиции — в порядке массива; отдаём вместе с АБСОЛЮТНЫМ индексом,
   (F1: value у <option> — id лада; i — позиция, её читает только снимок F0.) */
export const scalesOfTrad=id=>SCALES.map((s,i)=>({i,s})).filter(x=>x.s.trad===id);
/* ⛳ F0 «строи файлами»: МЕНЮ ЛАДОВ ТРАДИЦИИ — ЧИСТАЯ функция (без DOM): её рисует ui.fillScales, её же снимает проба P.dumpScales —
   «меню, как его строит приложение». Перенесено из ui.fillScales слово в слово (поведение прежнее):
   КЛЮЧ КОРЗИНЫ (grpKey) — СТАБИЛЬНЫЙ идентификатор подгруппы, отдельный от показываемой подписи (L(grp)); у лада без grpKey ключ —
   подпись (у сегодняшних — пустая строка или строка без перевода). Порядок корзин — по первому появлению, внутри корзины — по массиву.
   Пустой ключ — не корзина: такие лады идут прямо в список. → [{ key, label, items:[{i, s}] }]. */
const grpKeyOf   = s => s.grpKey != null ? s.grpKey : (s.grp != null ? L(s.grp) : '');
const grpLabelOf = s => s.grp != null ? L(s.grp) : '';
export function menuOf(tradId){
  const order=[], buckets=new Map(), labels=new Map();   // order — ключ в порядке первого появления
  scalesOfTrad(tradId).forEach(({i,s})=>{
    const k=grpKeyOf(s);
    if(!buckets.has(k)){ buckets.set(k,[]); order.push(k); labels.set(k, grpLabelOf(s)); }
    buckets.get(k).push({i,s});                 // внутри корзины — порядок массива
  });
  return order.map(k=>({ key:k, label:labels.get(k), items:buckets.get(k) }));
}
export const tradOfScale=id=>{ const s=scaleById(id); return s ? s.trad : null; };   // F1: по id лада (было — по позиции)

/* ⛳ T2: живой лад — ВИД (строй, лад, якорь; scaleView ниже) на текущий лад и якорь — у КАЖДОГО лада (P3 делал вариант только у
   tunable). Событие морозит sc:CUR() — значит морозит вид целиком: строй, лад и якорь (правило #7). */
export const CUR=()=>scaleView(scaleById(scaleId)||SCALES[0]);   // F1: по id (живой лад — state.scaleId)
/* ⛳ s — ЗАМОРОЖЕННЫЙ ЛАД СОБЫТИЯ (слайс S5.4). Тот же приём, что у leadFreq/chordSteps: параметр
   с умолчанием из живого состояния. Без аргумента — ровно прежнее поведение, байт-в-байт.
   ⚠️ ВНУТРИ подписей звать голый IVX() НЕЛЬЗЯ: параметр стал бы враньём, которое всплывает только на
   необычных строях (у 19/31-TET и Партча длина ivx другая — подпись молча съехала бы на чужую ступень). */
export const IVX=(s=CUR())=>s.iv.concat([s.edo]);           // + верхняя тоника
/* ЕДИНСТВЕННЫЙ источник опорной частоты — ЖИВАЯ настройка aRef (эталон A4, Гц; 380–480, по умолч. 440,
   лежит в state рядом с тоникой). База тоники baseF() И высота ЯКОРЯ фиксированных строёв cFix() (нота «строй от»: C у пяти
   исторических темпераций, у Пифагора — выбор, P3) читают ЕЁ
   ЖЕ через одну деривацию a3()=aRef/2 (A3). Копий 440/220 в коде высоты быть НЕ должно: сменил эталон
   — уехало ВСЁ, подвижные и фиксированные строи вместе (иначе гамелан уехал бы на 415, а Веркмайстер
   остался на 440 — «расстроенный инструмент»). aRef — импорт-биндинг, обе функции пересчитываются сами. */
const a3=()=>aRef/2;                                        // A3 из живого эталона A4 — единственная деривация опоры
export const baseF=()=>a3()*Math.pow(2,(tonic-9)/12);       // частота тоники (C=130.81 Гц при A4=440)
/* ═══ «СТРОЙ ОТ» — ЯКОРЬ ФИКСИРОВАННОЙ СЕТКИ (слайс P1 дуги «СТРОЙ ОТ», HANDOFF) ═══
   Фиксированный строй (fixedKey) — это инструмент, который НАСТРОЙЩИК настроил от одной ноты (якоря), а МУЗЫКАНТ играет
   в любой тональности (тоника). Две независимые вещи — и в арифметике высоты они теперь названы порознь:
     anchorOf(s) — нота, ОТ КОТОРОЙ настроена сетка (класс высоты 0..11, 0 = C);
     cFix(s)     — ВЫСОТА якоря: его равномерная высота от единого эталона A4 (a3 ← aRef, правило #17) — обобщение прежнего
                   «C3 = 130.81 Гц при A4=440»; если якорь ВЫШЕ тоники, он берётся октавой ниже, чтобы тоника звучала в том же
                   регистре, что и у подвижных ладов (около baseF), а не прыгала на октаву;
     keyOf(s)    — СДВИГ КЛЮЧА: тоника минус якорь (0..11) — место тоники в сетке. Его читают fixedSlot и прочие ветки fixedKey.
   ⛳ P1 был НЕВИДИМ: anchorOf всегда отдавал C (0) — так настроены все шесть исторических строёв, и так было в коде. Тогда
   cFix = a3·2^((0−9−0)/12) — ТО ЖЕ выражение, что прежнее a3·2^((0−9)/12) (−9−0 и 0−9 — одно и то же целое −9, деление на 12 —
   то же число с плавающей точкой), а keyOf = tonic−0+0 = tonic (целое, точно). Значит каждая формула ниже — побайтно прежняя.
   P3 (сделан): выбор якоря у Пифагора; якорь = тоника даёт keyOf=0 и cFix = a3·2^((tonic−9−0)/12) — то же выражение, что baseF():
   ровно подвижный путь. Прочие пять фиксированных строёв — от C, как прежде.
   ⚠️ Сетка fixedKey — 12 нот (cents.length===12 у всех шести): якорь и ключ — индексы в ЭТИ 12 полутонов. */
/* P3: якорь берётся из ЛАДА (поле варианта tunedFrom), а НЕ из живого state — поэтому записанное событие, чей sc — вариант со своим
   якорем, звучит со СВОИМ якорем, как бы ни двигали выбор. 'T' — следует за тоникой (якорь = тоника: keyOf=0, cFix=baseF — подвижный
   путь); число — закреплённая нота; поля нет (пять прочих фиксированных строёв и голый объект лада; демо с F1 — вид от C) — C, историческая практика. */
const anchorOf=s=> s.tunedFrom==='T' ? tonic : (s.tunedFrom==null ? 0 : s.tunedFrom);
/* ⛳ ВИД — (СТРОЙ, ЛАД, ЯКОРЬ) ОДНИМ ОБЪЕКТОМ (слайс T2 универсальной модели строя; обобщает вариант лада на якорь из P3).
   CUR() отдаёт ВИД, и каждое событие, которое и так хранит sc: CUR(), морозит теперь ВИД целиком (правило #7) — без нового поля события.
   ФОРМА: копия полей лада (все прежние читатели — iv, edo, cents, period, fixedKey, sel, root, tunedFrom… — работают как прежде) и сверху:
     mode      — сам объект лада из SCALES (запись ЛАДА; у вида он и есть «какой лад»);
     tuningRec — запись его СТРОЯ (TUNINGS[tuning]);
     anchor    — { policy, from }: policy 'tonic' — подвижный (строй строится от тоники), 'C' — фиксированный от C (пять исторических
                 темпераций), 'choice' — «строй от» на выбор (tunable, Пифагор); from — нота «строй от»: 'T' — тоника, 0..11 — класс высоты.
     tunedFrom — ТОЛЬКО у tunable (как в P3: его читает anchorOf); у прочих поля нет — значит и цена у них прежняя.
   ⛳ ПАМЯТЬ — НА (ЛАД, ЯКОРЬ), И ЭТО НЕСУЩЕЕ: один и тот же лад с одним и тем же якорем ВСЕГДА даёт ОДИН И ТОТ ЖЕ объект. У лада без выбора
   якорь один — вид один; у Пифагора — не больше 13 ('T' + 12 нот). На тождестве держатся: группировка дорожки по ладу в редакторе
   (draw.rollGroups/rollHit — по ССЫЛКЕ sc), кэши рядов и подписей редактора (draw chRowCache/rollTopCache/lblCache — ключ sc), мемо
   раскладки (rectLayout, одна запись на ссылку) и тип аккорда для вставки (recorder: sel.sc===sc / e.sc!==sc). Все они получают лад только
   через CUR() или из sc события — значит видят виды, и тождество держится так же, как держалось у голых объектов.
   ⚠️ Две дорожки, записанные с разными «строй от», — РАЗНЫЕ виды для редактора (две группы, чип #rollScale): честно, это разные
   настройки инструмента. ⛔ Голые объекты SCALES в sc не попадают: события рождаются из CUR() или копируют sc другого события.
   Голый объект годится в цену сам (у него те же поля): на нём строит сцены демо стартового экрана и сверяет проба.
   Ничего не мутирует ни лады, ни виды; вид от вида — тот же вид (берём его mode). */
const SCALE_VIEWS=new WeakMap();
const anchorPolicy=s=> s.tunable ? 'choice' : s.fixedKey ? 'C' : 'tonic';
/* ⛳ T7b: РЕЖИМ АККОРДОВ ЛАДА — выбранный (state.chordModeSel по id лада) или умолчание (первый в списке); undefined — у лада режимов нет. */
export function chordModeOf(s){
  const b=s&&(s.mode||s), ms=b&&b.chordModes; if(!ms) return undefined;
  const m=chordModeSel[b.id]; return ms.some(x=>x.id===m) ? m : ms[0].id;
}
export function scaleView(s, tf=tunedFrom, cm=chordModeOf(s)){
  if(!s) return s;
  const base=s.mode||s, ms=base.chordModes;
  const cmv= ms ? (ms.some(x=>x.id===cm) ? cm : ms[0].id) : undefined;   // T7b: режим аккордов — второй ключ вида (как якорь); неизвестный — умолчание
  const key=(base.tunable ? tf : '')+'|'+(cmv||'');           // у лада без выбора якорь один, без режимов — режим один: ключ один
  let m=SCALE_VIEWS.get(base); if(!m){ m=new Map(); SCALE_VIEWS.set(base,m); }
  let v=m.get(key);
  if(!v){
    const policy=anchorPolicy(base);
    v= base.tunable ? {...base, tunedFrom:tf} : {...base};    // tunedFrom — только у tunable: anchorOf у прочих читает «поля нет» (C), как прежде
    if(ms){ Object.assign(v, ms.find(x=>x.id===cmv).over); v.chordMode=cmv; }   // ⛳ T7b: поля режима ПОВЕРХ полей лада — читатели видят обычные поля (chordBuild/typedChords/chordRule)
    v.mode=base; v.tuningRec=TUNING_OF_MODE.get(base) || TUNINGS[base.tuning];   // F6: строй, закреплённый за ладом при сборке
    v.anchor={ policy, from: policy==='choice' ? tf : policy==='C' ? 0 : 'T' };
    m.set(key,v);
  }
  return v;
}
/* ⛳ ТОЖДЕСТВО ВИДА СТРОКОЙ (маршрут по строю): «id лада» + у лада с выбором якоря «@строй от». Это РОВНО ключ памяти scaleView
   (лад base + tf у tunable, '' у прочих), а id ладов уникальны (T0, проба checkData) — значит строки равны ⇔ это ОДИН И ТОТ ЖЕ объект
   вида. Тоники в строке нет: тональность — не источник звука (смена тоники посреди песни нормальна). Голый лад без вида (демо
   стартового экрана; в события не попадает) у tunable даёт «@bare» — отдельно от любого вида. */
export function viewIdOf(v){
  if(!v) return '-';
  const b=v.mode||v;
  return b.id + (b.tunable ? '@'+(v.tunedFrom===undefined ? 'bare' : v.tunedFrom) : '')
              + (b.chordModes ? '#'+(v.chordMode===undefined ? 'bare' : v.chordMode) : '');   // ⛳ T7b: и режим аккордов — второй ключ вида
}
export const keyOf=s=>{ const A=anchorOf(s); return tonic-A+(A>tonic?12:0); };
export const cFix=(s=CUR())=>{ const A=anchorOf(s); return a3()*Math.pow(2,(A-9-(A>tonic?12:0))/12); };   // C3 = 130.81 Гц при A4=440 (та же опора, что baseF)
/* Частота ТОНИКИ/КЛЮЧА для дрона и родственного: у fixedKey — ФИКСИРОВАННАЯ высота ключа
   (cFix·2^(cents[ключ]/1200)), иначе дрон бился бы с приколоченной сеткой; у прочих — baseF()
   (подвижная тоника). Опора та же (cFix←a3←aRef) — не разъедется. P1: ключ — keyOf (при якоре C это tonic). */
/* T1: высота ТОНИКИ — та же функция высоты (pitchHz ниже), индекс строя — корень лада (+ ключ у фиксированных). Подвижные: A·P^0·ρ(z)
   = A·1·1 — ровно baseF(); фиксированные: cFix·2^0·2^(c[ключ]/1200) — ровно прежнее. Прежнее тело — legacyTonicFreq (с T4c-2 — в пробе; только для пробы). */
export const tonicFreq=(s=CUR())=>{ const T=tuningOf(s), a=modeAnchor(s); return pitchHz(T,a.A,a.z,a.key+s.sel[0],0); };
/* ПЕРИОД лада (интервал эквивалентности) — по умолчанию ОКТАВА (2). Неоктавный строй задаёт
   своё (Болен–Пирс period:3 — тритава). Заменяет зашитую двойку в формуле высоты: и регистр
   P^oct, и равный шаг P^(шаг/edo). Дефолт 2 ⇒ ВСЕ прежние лады байт-в-байт. */
export const periodOf=(s=CUR())=>s.period||2;
/* ═══ ⛳ F3 — ИМЕНА СТУПЕНЕЙ ДАННЫМИ: СХЕМА ИМЁН (план «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   У СТРОЯ — схема имён его высот (naming.scheme) и слово периода (periodWord); у ЛАДА — необязательное переопределение схемы, которой
   называются ЕГО СТУПЕНИ (naming.scheme), и показ второй части имени списка (naming.detail). Схемы:
     notes12 — имена 12 нот от живой тоники (NOTE_NAMES; шаг лада = полутон: 12-равный и 12-нотные таблицы);
     notes24 — имена четвертитонов от живой тоники (name24);
     ordinal — номера: ступень — «Т» на тонике, иначе её номер с 1; шаг — «ст»+шаг (ноты аккорда, корень); приглушённый ряд — «(k)»;
     list    — имя у каждой высоты строя (names[k] = {name, detail}; полное — «name · detail»): сетка 22 шрути (свара · шрути).
   ДВЕ СХЕМЫ У ВИДА: pitch — схема СТРОЯ, ею называются высоты и шаги (ноты аккорда, корень палитры, подпись аккорда, приглушённые ряды
   редактора); deg — схема СТУПЕНЕЙ (сетка, ярлыки руки, ряды-ступени редактора): переопределение лада, иначе — схема строя. Сегодня
   они расходятся у одного лада — подвижного Натурального (строй ji12 — notes12, ступени — ordinal: его высоты сдвигаются под аккорд,
   имя ноты соврало бы), а ноты его аккордов и корни палитры называются именами нот, как и до F3.
   ⛔ Подписи НЕ ветвятся по edo, периоду, центам, swaraNames, fixedKey — только по схеме. Таблица качеств 12-тоновых аккордов (qual, SEV,
   STACK_Q*) — теория музыки, а не данные лада: остаётся кодом и включается схемой notes12.
   Лад вида — его .mode (у копии лада без .mode, как в пробе, — лад по id); строй — tuningOf (вид, правило F1). Записи нет — порядковая
   схема без слова периода (запасной «рег.»). */
const NAMING_NONE={ T:null, pitch:'ordinal', deg:'ordinal', names:null, detail:false, word:null };
const NM_MEMO=new WeakMap();
/* Лад вида (F3/F4): у вида — .mode, у копии лада без .mode (проба) — лад по id, иначе сам объект. Записи v1: лада — SRC лада,
   строй — SRC записи tuningOf (вид). Одно разрешение на имена (F3) и поведение (F4). */
const modeObjOf=s=>(s && s.mode) || (s && SCALE_BY_ID.get(s.id)) || s;
const modeRecOf=s=>SRC.get(modeObjOf(s));
const tuningRecOf=s=>SRC.get(tuningOf(s));
export function namingOf(s=CUR()){
  const m=modeObjOf(s), T=tuningOf(s);
  let r=NM_MEMO.get(m); if(r && r.T===T) return withDeg(r,s);
  const tf=SRC.get(T), mf=SRC.get(m); if(!tf || !tf.naming) return NAMING_NONE;
  const tn=tf.naming, mn=(mf && mf.naming) || {};
  r={ T, pitch:tn.scheme, deg:mn.scheme||tn.scheme, names:tn.names||null, detail:!!mn.detail, word:tf.periodWord||null };
  NM_MEMO.set(m,r); return withDeg(r,s);
}
/* ⛳ F7: СХЕМА СТУПЕНЕЙ ОТ РЕЖИМА АККОРДОВ — поле вида degNaming (переопределение naming режима, scaleView кладёт его поверх полей лада)
   важнее схемы лада и строя: у Натурального «Свободно» (аккорды адаптивно — высоты сдвигаются, имя ноты соврало бы) ступени —
   порядковые, «Как на инструменте» — имена нот строя. Вариант памяти — на (лад, схема). */
function withDeg(r,s){ const dn=s && s.degNaming; if(!dn || dn===r.deg) return r;
  const k='deg:'+dn; return r[k] || (r[k]={...r, deg:dn}); }
/* Слово ПЕРИОДА для ярлыков (F3: данные строя — periodWord): short — «окт» / «тритава» / «рег.», full — полное («ОКТАВА»); нет full —
   short заглавными. Строка — ключ словаря интерфейса (встроенные строи), объект — имя L() (строй пользователя, en/ru). Римская цифра
   регистра OCT_ROMAN[oct] — общая. */
const wordOf=w=> typeof w==='string' ? t(w) : L(w);
export const regWord=(s=CUR())=>{ const w=namingOf(s).word; return w ? wordOf(w.short) : t('reg.reg'); };
export const regWordFull=(s=CUR())=>{ const w=namingOf(s).word; return w && w.full ? wordOf(w.full) : regWord(s).toUpperCase(); };
/* Совместимость ладов для §3.7 (перенос фразы в другой строй возможен лишь при равном
   числе ступеней: 7→7 да, 7→5 нет). UI-уровень — принимает индексы, не хранимые данные. */
/* Прогрессии (II–V–I и т.п.) — римские ступени, осмысленны лишь в 7-ступенчатом ладу;
   в пентатонике(5)/блюзе(6)/хроматике(12)/range(19|31) «V» не к чему привязать.
   ⛳ F4: ПОЛЕ ЛАДА progressions (true|false) — его слово, если задано; нет поля — прежнее правило «семь ступеней» (ни один встроенный
   лад поля не несёт, так что всё как было). Лад пользователя с семью ступенями, где II–V–I не к месту, скажет false; иной — true. */
export const supportsProgressions=(s=CUR())=>{ const mf=modeRecOf(s);
  return mf && typeof mf.progressions==='boolean' ? mf.progressions : s.iv.length===7; };
/* ⛳ F4: РИТМ ДЖЕМА у лада без аккордов — поле лада backing.rhythm (id ритма; сегодня 'maqsum' у десяти макамов). Нет поля — null
   (джем без ударных). До F4 решало «24 шага» (ui.jamVariants: CUR().edo===24). */
export const backingRhythmOf=(s=CUR())=>{ const mf=modeRecOf(s); return (mf && mf.backing && mf.backing.rhythm) || null; };
/* ⛳ F4: СТРОКА СТАТУСА — описание строя из его записи (describe): kind 'equal' — «N-TET · ступени: …» (N — шагов в периоде строя,
   ступени — шаги лада), step — и шаг в центах периода (целыми); kind 'table' — «центовый строй · n ступеней» (n — ступеней лада):
   у таблицы нет равного шага, печатать «N-TET» было бы враньём. До F4 решали s.cents и s.edo!==12 (draw.drawStatus). Нет записи —
   как таблица. Префиксы записи/лупера ставит draw. */
export function tuningStatus(s=CUR()){
  const T=tuningOf(s), tf=tuningRecOf(s), d=(tf && tf.describe) || {kind:'table'};
  if(d.kind!=='equal') return t('status.centsScale',{name:L(s.name), n:s.iv.length});
  const st=t('status.edoScale',{name:L(s.name), edo:T.equal, steps:s.iv.join('-')});
  return d.step ? st+t('status.step',{c:Math.round(1200*Math.log2(T.period)/T.equal)}) : st;
}
/* Лестницы аккордов нет (арабская традиция: музыка монофонична, трезвучий не строит,
   часть ступеней даёт двойной четвертьтон — муть). Свойство лада, а не строковый tag:
   переживёт перегруппировку ладов по традициям. Гейт ТОЛЬКО живого ввода — переигровка
   слоёв идёт по замороженному sc и обязана звучать как записана (полимодальность). */
export const supportsChords=(s=CUR())=>!s.noChords;
/* Типизированные аккорды (UI-MAP «Хроматика»): аккорд задаётся не ступенью лада, а
   ячейкой ПАЛИТРЫ — СЕМЕЙСТВО (колонка) + ВАРИАНТ (ряд), выбор ПО ПОЛОЖЕНИЮ щипка,
   ЛЮБОЙ рукой (привязки к handedness нет — см. state.chordFam).
   Тип попадает в событие данными (a.ty = массив интервалов), поэтому переигровка
   старых петель, где ty нет, идёт прежним путём (ty=undefined → шаговая ветка).
   Свойство лада — КЛЮЧ набора семейств в CHORD_FAM_SETS, а не true: строка тоже
   истинна, поэтому предикат ниже не изменился. */
export const typedChords=(s=CUR())=>!!s.typedChords;
/* ===== СЕТКА ПРЯМОУГОЛЬНИКОВ: ВСЯ АРИФМЕТИКА В ОДНОЙ ФУНКЦИИ =====
   Раскладка перестала быть «4 ноты в прямоугольнике на один период». Два обобщения:
   (1) НОТ В ПРЯМОУГОЛЬНИКЕ k — переменное: 4, иначе 3, иначе 2. Лишние пальцы (при k<4) НЕ играют
       ничего — лучше молчание, чем чужая нота (и оно ОБЪЯСНЕНО в легенде тусклой строкой, иначе
       читается как поломка);
   (2) ПОКАЗЫВАЕМ НЕСКОЛЬКО ПЕРИОДОВ СРАЗУ, сколько влезет (потолки ниже). Где влезли ВСЕ регистры —
       октавная полоса не нужна: весь диапазон уже под рукой.
   ДВЕ ФОРМЫ ПЕРИОДА (dup), разница — лежит ли на сетке ВЕРХНЯЯ ТОНИКА:
     dup=1 — тоника ПОВТОРЕНА на границе периода (нот iv.length+1). Смысл сменился: раньше это было
       «замкнуть октаву», теперь — ВЫРАВНИВАНИЕ: период занимает ЦЕЛОЕ число прямоугольников, поэтому
       рука всегда знает, где она. Верхний слот и первый слот следующего блока — ОДНА И ТА ЖЕ высота
       (leadFreq: deg=iv.length → P^1 при том же oct; deg=0 при oct+1 → то же самое), см. §дубль ниже;
     dup=0 — сетка = сами ноты лада. Верхняя тоника остаётся в IVX (центы, терменвокс), но на сетку
       не выходит: нота периодом выше приходит следующим блоком (или регистром, если блок один).
   ⚠️ ПЕРИОД-ГЕЙТ У dup СНЯТ НАМЕРЕННО. Раньше dup=1 позволялся ТОЛЬКО октавному ладу (periodOf===2).
   Теперь dup — свойство РАСКЛАДКИ (выравнивание), а не утверждение об эквивалентности, и без него
   Болен–Пирс (13, простое) и Карлос-бета (11, простое) не разложились бы НИКАК. На высоту это не
   влияет: periodOf по-прежнему правит регистром, шагом, центами и regWord.
   ЧЕСТНАЯ ОГОВОРКА (принята осознанно): подпись верхнего слота — «Т» (структурная проверка
   IVX[deg]%edo===0). Для Болена–Пирса это ПРАВДА (тритава 3:1 — его интервал эквивалентности), для
   КАРЛОСА — ПРЕУВЕЛИЧЕНИЕ: её квинта 3:2 — генератор, эквивалентности у строёв Карлос нет вовсе.
   Живём с этим; если начнёт мешать — свойству лада equiv:false и порядковая подпись в noteLbl.
   ПОРЯДОК ПЕРЕБОРА: k = 4 → 3 → 2, внутри k сперва dup=0, потом dup=1. Именно этот порядок даёт
   7-нотным ладам k=4,dup=1 (2 прямоугольника), а не k=3.
   ПОТОЛКИ: REG_N периодов (это НЕ произвольная четвёрка — столько и есть регистров, OCT_ROMAN;
   поэтому сетка на все REG_N периодов покрывает ВЕСЬ диапазон регистров, ничего не теряя) и
   RECT_MAX прямоугольников (плотность экрана).
   ПРОВЕРЕНО НА РЕАЛЬНЫХ ДАННЫХ (все 75 ладов; число ступеней → k/dup/прямоуг. на период/периодов):
     7 (мажор, лады, макамы, раги, пелог) → 4/1/2 → 4 периода, 8 полос, БЕЗ регистровой
     5 (пентатоники, слендро, патеты)     → 3/1/2 → 4 периода, 8 полос, без регистровой
     6 (блюз, целотоновая, Прометей)      → 3/0/2 → 4 периода, 8 полос, без регистровой
     8 (октатоники)                       → 4/0/2 → 4 периода, 8 полос, без регистровой
     9 (Мессиан-3, Карлос альфа)          → 3/0/3 → 4 периода, 12 полос, без регистровой
    11 (Карлос бета)                      → 4/1/3 → 4 периода, 12 полос, без регистровой
    12 (хроматика, 6 историч. строёв)     → 4/0/3 → 4 периода, 12 полос, без регистровой
    19 (19-TET)                           → 4/1/5 → 2 периода, 10+1 полос, С регистровой
    20 (Карлос гамма)                     → 4/0/5 → 2 периода, 10+1 полос, С регистровой
    31 (31-TET)                           → 4/1/8 → 1 период,  8+1 полос,  С регистровой (как сегодня)
    43 (Партч)                            → 4/1/11 → 1 период, 11+1 полос, С регистровой (как сегодня)
    22 (сетка шрути)                      → 2/0/11 → 1 период, 11+1 полос, С регистровой (НОВОЕ: была невозможна)
    13 (Болен–Пирс)                       → 2/1/7  → 1 период, 7+1 полос,  С регистровой (НОВОЕ)
   МЕМОИЗАЦИЯ на ССЫЛКУ лада: функцию зовут ~30 раз за кадр (gestures+draw), лады — статические
   объекты, поэтому кэш на одну запись точен. rectPref в кэш НЕ входит (его решает rectGrid). */
export const REG_N=OCT_ROMAN.length;     // сколько регистров существует (I..IV) — он же потолок числа показываемых периодов
const RECT_MAX=12;                       // потолок числа НОТНЫХ прямоугольников на экране (плотность)
let _rlS=null, _rl=null;                 // кэш на одну запись: ключ — ССЫЛКА на лад
export function rectLayout(s=CUR()){
  if(s===_rlS) return _rl;
  let k=4, dup=0;
  outer: for(const kk of [4,3,2]) for(const dd of [0,1]) if((s.iv.length+dd)%kk===0){ k=kk; dup=dd; break outer; }
  const block=s.iv.length+dup, perOct=block/k;
  const octaves=Math.max(1,Math.min(REG_N,Math.floor(RECT_MAX/perOct)));
  const rects=perOct*octaves, hasReg=octaves<REG_N;
  _rlS=s; _rl={k,dup,block,perOct,octaves,rects,hasReg,
               regBands:hasReg?1:0,                 // ЕДИНЫЙ источник смещения «полоса → прямоугольник» (было зашитое −1 в четырёх местах)
               bands:rects+(hasReg?1:0), notes:rects*k};
  return _rl;
}
/* Возможны ли прямоугольники. ТЕПЕРЬ ВСЕГДА ДА и это доказуемо: чётное число ступеней делится
   k=2,dup=0; нечётное — k=2,dup=1. Предикат оставлен как ЗАЩИТА разрешителя (вырожденный
   пользовательский строй в будущем), но UI-ветку «недоступно с причиной» он больше не питает —
   причины не существует, и мёртвого объяснения в панели быть не должно. */
export const rectEligible=(s=CUR())=>s.iv.length>=2;
/* РАЗРЕШИТЕЛЬ РАСКЛАДКИ — ОДНО место, где решается «прямоугольники или узкие ряды». Раскладка
   НЕ свойство лада: s.rectGrid остался в данных, но это ДЕФОЛТ («каким лад открывается»), а выбор
   человека живёт в state.rectPref ('auto'|'rect'|'rows', дефолт 'auto'). Узкие ряды возможны ВСЕГДА. */
export const rectGrid=(s=CUR())=>rectEligible(s) && (rectPref==='auto' ? !!s.rectGrid : rectPref==='rect');
export const rectDefault=(s=CUR())=>!!s.rectGrid;   // «как лад открывается» — для подписи варианта «По ладу» в UI
/* Тонкие обёртки над rectLayout — чтобы места вызова не знали про поля объекта.
   ⚠️ rectRows СМЕНИЛ СМЫСЛ: это прямоугольники ВСЕЙ сетки (всех показанных периодов), а не одного. */
export const rectRows=(s=CUR())=>rectLayout(s).rects;
export const rectNotes=(s=CUR())=>rectLayout(s).notes;      // сколько нот РЕАЛЬНО лежит на сетке
export const rectRowsFull=(s=CUR())=>rectLayout(s).bands;   // полос всего (нотные + октавная, если она есть)
/* БАЗА ОКНА (номер регистра, с которого начинается нижний блок). Пока показан не весь диапазон
   (hasReg), её задаёт липкий регистр роли, и он двигает ВСЁ ОКНО целиком; когда показаны все REG_N
   периодов — база жёстко 0 (двигать нечего, регистр не участвует). Кламп ОДИН и общий для чтения
   и для записи в октавной полосе: верх окна не должен уезжать за последний регистр. */
export const rectBase=(reg,s=CUR())=>{ const L=rectLayout(s);
  return L.hasReg ? Math.max(0,Math.min(reg,REG_N-L.octaves)) : 0; };
export const rectBaseMax=(s=CUR())=>{ const L=rectLayout(s); return L.hasReg?REG_N-L.octaves:0; };   // сколько баз выбираемо в октавной полосе (0..max)
/* СЛОТ → НОТА: единственная формула отображения сетки в (ступень, регистр). Слот g считается от
   НИЖНЕГО левого: g = прямоугольник*k + палец. Блок = один период (block нот), поэтому deg внутри
   блока, а номер блока прибавляется к базе окна. Диапазоны на выходе — РОВНО сегодняшние:
   deg ∈ [0, iv.length], oct ∈ [0, REG_N-1]; формат события не меняется ни на бит. */
export const rectNoteAt=(g,base,s=CUR())=>{ const L=rectLayout(s);
  return {deg:g%L.block, oct:base+Math.floor(g/L.block)}; };
/* НОТА → СЛОТ: обратное отображение, нужно ПОДСВЕТКЕ (какой прямоугольник зажечь). Однозначно даже
   при dup=1: храним СЫГРАННУЮ пару (deg,oct), а не высоту, поэтому «верхний слот блока» (deg=block-1)
   и «первый слот следующего» (deg=0, oct+1) — разные g. Старое событие с deg=iv.length при dup=0
   ложится на первый слот следующего блока — ТА ЖЕ высота, деградация мягкая. Вне окна → -1. */
export const rectSlotOf=(deg,oct,base,s=CUR())=>{ const L=rectLayout(s);
  const g=(oct-base)*L.block+deg;
  return (g<0||g>=L.notes) ? -1 : g; };
/* ТЕРМЕНВОКС — ОБЩИЙ раздел вертикали для звука (gestures) и рисунка (draw): не разъезжаться,
   иначе высота под пальцем ≠ высота на линии. M = число нот раскладки; нотное поле [0,spanBot]
   сверху вниз = ВЫСШАЯ..низшая нота. У rect-лада низ отдан октавной полосе (spanBot = поле без
   нижней полосы), у 12-TET — вся высота. Тонкое деление divH = spanBot/M (у rect-ладов = seg/4 →
   ровно 4 линии на прямоугольник).
   ⚠️ ПОЧИНКА СТАРОГО OFF-BY-ONE (был неверен ДО этой правки, не сломан ею): M брался как
   IVX().length ВСЕГДА. У ЗАКРЫТОЙ rect-формы rectNotes()===IVX().length, и всё сходилось
   (19/31/Партч — байт-в-байт). У ОТКРЫТОЙ формы верхней тоники на сетке НЕТ, и линий выходило на
   одну больше слотов: Карлос-гамма делила поле на 21 вместо 20 — линии уползали ~5% к верху.
   Незаметно на экзотической гамме, но хроматика (13 против 12) вынесла бы это на общий лад.
   Берём то, что РЕАЛЬНО лежит на сетке (rectNotes), у нерект-ладов — как было. */
export const thereminSpan=(playH)=>{ const M=rectGrid()?rectNotes():IVX().length;
  const reg=rectGrid()?rectLayout().regBands:0;   // низ отдан октавной полосе ТОЛЬКО когда она есть (hasReg); при показе всех регистров полос-нот — все
  const spanBot = rectGrid() ? playH*(rectRowsFull()-reg)/rectRowsFull() : playH;
  return {M, spanBot, divH:spanBot/M}; };
/* y → ДРОБНЫЙ СЛОТ p (0=низ … M-1=верх); центр деления = ТОЧНАЯ нота. Соседи floor/ceil,
   интерполяция ЛОГАРИФМИЧЕСКАЯ (линейно в центах = геометрически в Гц) через leadFreq — так
   неравные интервалы Партча/гамелана и любой EDO звучат верно.
   3-й аргумент — БАЗА ОКНА (нерект: просто регистр, как было). У многопериодной сетки слот несёт
   И ступень, И номер периода, поэтому высоту соседей берём через rectNoteAt — иначе линии и звук
   разъехались бы на целые октавы. У однопериодной сетки и узких рядов слот === ступень, регистр =
   база: байт-в-байт прежнее поведение.
   ⚠️ ПЛАТО НА ГРАНИЦЕ ПЕРИОДА при dup=1: два соседних слота — ОДНА высота, поэтому на одном делении
   глиссандо стоит на месте. Это честное следствие сетки (там и правда одна и та же нота); ломать
   ради этого совпадение линий с сеткой не станем.
   Кламп: y в [0,spanBot], p в [0,last]. Возвращаем и ступень, И регистр — вызывающий пишет в
   событие ближайшую НОТУ (deg+oct), формат события прежний. */
export const thereminHz=(y,playH,base)=>{ const {M,spanBot,divH}=thereminSpan(playH), last=M-1;
  const noteOf = i => rectGrid() ? rectNoteAt(i,base) : {deg:i, oct:base};
  const yc=Math.max(0,Math.min(spanBot,y)), fp=yc/divH;
  let p=last-fp+0.5; p=Math.max(0,Math.min(last,p));
  const d0=Math.floor(p), d1=Math.min(d0+1,last), fr=p-d0;
  const n0=noteOf(d0), n1=noteOf(d1), near=noteOf(Math.round(p));
  const l0=Math.log2(leadFreq(n0.deg,n0.oct)), l1=Math.log2(leadFreq(n1.deg,n1.oct));
  return {hz:Math.pow(2,l0+(l1-l0)*fr), deg:near.deg, oct:near.oct, slot:Math.round(p), p}; };
/* Набор семейств текущего лада. Ключ — свойство лада; неизвестный ключ и лад без
   типизации откатываются на 12-TET, чтобы вызывающий никогда не получил undefined. */
export const chordFams=(s=CUR())=>CHORD_FAM_SETS[s.typedChords]||CHORD_FAM_SETS.chrom12;
/* Имя корня для подписи типизированного аккорда (тип дописывает вызывающий). */
/* ⚠️ ТОНИКА ОСТАЁТСЯ ЖИВОЙ, И ЭТО НЕ НЕДОСМОТР (общее правило всех подписей ниже). В событии заморожен
   ЛАД (правило #7), а тоника — глобальная и живая: высоту переигровка тоже берёт от живой тоники
   (baseF/fixedSlot). Замороженная в подписи тоника разошлась бы с тем, что звучит. */
export const rootName=(deg,s=CUR())=>{ const n=s.iv.length, d=((deg%n)+n)%n;   // F3: по схеме строя (было s.edo===12)
  return namingOf(s).pitch==='notes12' ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12] : 'ст'+s.iv[d]; };

/* ================= ТЕОРИЯ: СТУПЕНИ, АККОРДЫ, ИМЕНА =================
   ФОРМУЛЫ ВЫСОТЫ СЕГОДНЯ (их сведёт в одну функция высоты T1 универсальной модели строя):
     равный строй:   f = f_тоники · P^(регистр) · P^(n / N)   — P = periodOf (октава 2, тритава 3 у Болена–Пирса, квинта 3/2 у Карлос);
     центовый строй: f = f_тоники · 2^(регистр) · 2^(центы_ступени / 1200);
     фиксированный:  f = f_якоря · 2^(регистр+перенос) · 2^(центы[ключ+шаг] / 1200) (fixedKey, ниже).
   Для 12-TET шаг = полутон (100 центов), для 24-TET = четвертьтон (50 центов),
   для 19-TET = 63.2 цента, для 31-TET = 38.7 цента. */
/* ⛳ F4: isTert («стопка терций по tag dia/ethnic/maqam») УШЁЛ В ПРОБУ — в приложении у него не осталось читателя (цену и подписи с T6
   решает правило аккордов лада), а замороженные опоры пробы им живут. */
export const fifthStep=edo=>Math.round(edo*Math.log2(1.5)); // шаг, ближайший к чистой квинте 702c
const stepFor=(edo,ratio)=>Math.round(edo*Math.log2(ratio)); // шаг, ближайший к чистому интервалу ratio
 
/* ⛳ T6c: ШАГИ НЕТИПИЗИРОВАННОГО АККОРДА — ПО ПРАВИЛУ ЛАДА (chordRule, данные T6a), ОДНА функция для подписей (с T6c) и для цены (T6b).
   Ветви — РОВНО ветви chordSteps без типа, выбранные не по tag, а по rule.kind:
     tertian — стопка через ступень лада (i, i+2, i+4, +6 у септаккорда), перенос периода — в шаг;
     ratios  — отношения правила (triad/seventh), округлённые к шагу строя (stepFor);
     power   — корень + квинта строя (fifthStep) + период.
   ⛳ T6b: none — ЯВНО ПУСТО («аккорда нет»): цена — ноль нот, подпись — пустая строка. ⚠️ palette и none — у таких ладов нетипизированного аккорда нет (палитра всегда даёт тип; noChords аккордов не строит), подпись не
   рисуется (draw: палитра пишет корень, noChords — объяснение). Функция всё равно ТОТАЛЬНА — форма пауэр-аккорда, как у chordSteps для
   всех таких ладов, КРОМЕ макамов: у них tag 'maqam' давал стопку. Разница — только у макамов и только там, где её никто не видит и
   не слышит (noChords); проба P.checkLabels считает её отдельно как «не показывается». */
/* ⛳ СЕПТАККОРД, КОТОРЫЙ НИЧЕГО НЕ ДОБАВЛЯЕТ (видимый слайс при T4c-1). Стопка через ступень лада (правила tertian и stack) с
   септаккордом берёт четвёртый шаг i+6. В ладу из n ступеней он приходится на класс высоты, который аккорд уже держит, если i+6 ≡ i,
   i+2 или i+4 (mod n) — то есть при n ∈ {1,2,3,4,6}: круг через ступень замыкается раньше четвёртой разной ноты, и «септаккорд» лишь
   удваивает корень октавой выше. ОДИН общий тест — по самому ладу (s.iv по модулю edo), без имени и без особого случая, поэтому верен и
   для лада пользователя: true — хотя бы на одной ступени четвёртый шаг даёт НОВЫЙ класс высоты. Прочие правила (ratios — свои списки
   триады и септаккорда; palette — тип из палитры; none) этот тест не касается: true, контрол как прежде. Звук НЕ меняется — тест решает
   только, доступна ли кнопка (ui.renderSevCtl). Встроенные лады, где он ложен: блюз, мажорный блюз (stack), целотонный, прометеев
   (tertian) — все шестиступенные; пяти-, семи-, восьми- и девятиступенные его сохраняют. */
export function seventhAddsNote(s=CUR()){
  const k=s.chordRule&&s.chordRule.kind;
  if(k!=='tertian' && k!=='stack') return true;
  const n=s.iv.length, E=s.edo, pc=j=>((s.iv[j%n]%E)+E)%E;
  for(let d=0; d<n; d++){ const x=pc(d+6); if(x!==pc(d) && x!==pc(d+2) && x!==pc(d+4)) return true; }
  return false;
}
export function ruleChordSteps(deg, s=CUR(), sev=seventh){
  const n=s.iv.length, R=s.chordRule, k=R&&R.kind;
  if (k==='tertian' || k==='stack'){   // stack — та же стопка через ступень лада
    const ks=sev?[0,2,4,6]:[0,2,4];
    return ks.map(q=>{const j=deg+q; return s.iv[j%n]+s.edo*Math.floor(j/n);});
  }
  if (k==='none') return [];   // ⛳ T6b: 'none' — ЯВНО «аккорда нет» (noChords), а не тихий откат к пауэр-аккорду
  const r=s.iv[deg%n]+s.edo*Math.floor(deg/n);
  if (k==='ratios'){ const rs=sev?R.seventh:R.triad; return rs.map(ra=>r+stepFor(s.edo,ra)); }
  return [r, r+fifthStep(s.edo), r+s.edo];   // power — и palette: у лада с палитрой нетипизированного аккорда не пишет ни один путь; цена прежняя (форма пауэр-аккорда)
}
/* ═══ ОДНА ФУНКЦИЯ ВЫСОТЫ (слайс T1 универсальной модели строя, HANDOFF «ПЛАН „УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ“») ═══
   hz = A · P^R · ρ(k). T — строй (TUNINGS), A — частота высоты строя z (ЯКОРЬ), уже поделённая для роли В СЕГОДНЯШНЕМ ПОРЯДКЕ
   (baseF()/4 у баса, /2 у аккордов, cFix у фиксированных строёв), k — индекс в строе, R — регистр.
     • РАВНЫЙ строй (форма генератора): ρ(k) = P^((k−z)/E), k НЕ приводится — шаг аккорда через период, как в прежней равной ветке;
     • ТАБЛИЦА: ρ(k) = 2^((c[k mod N] − c[z])/1200) (центы — всегда двоичные), перенос ⌊k/N⌋ уходит в регистр: P^(R+перенос).
   ⛳ ПОБИТНО ПРЕЖНЕЕ: порядок умножений и вид каждого выражения взяты из прежних ветвей (их копии — legacy*, с T4c-2 — в пробе src/scaleprobe.js; читает ТОЛЬКО проба
   src/scaleprobe.js). По семействам:
     равные строи: A·P^o·P^(шаг/edo) — то же выражение (k − 0 === k);
     центовые подвижные: c[k] − c[0] = c[k] − 0 — точно; ДУБЛЬ ТОНИКИ прежде звучал ·2^(1200/1200)=·2 в регистре o, теперь — переносом:
       ·2^(o+1)·2^0 — оба точное умножение на степень двойки, результат один и тот же;
     фиксированные (fixedKey) и сетка аккордов: та же форма cFix·2^(o+перенос)·2^(c/1200), k = ключ + шаг лада;
     раги на сетке 22 шрути — те же литералы центов; Баранг (z = 1, Пелог) — вычитания целых (258−120=138 …) точны.
   ⛔ Это довод, а не доказательство. Доказательство — проба: слайс принят ТОЛЬКО при нуле несовпадений (=== по всем ладам, ролям,
   ступеням, регистрам, тоникам, эталонам A4 и якорям). Порядок операций здесь НЕЛЬЗЯ «упрощать»: (A·x)·y ≠ A·(x·y) в плавающей точке. */
export function pitchHz(T,A,z,k,R){
  if(T.equal!=null) return A*Math.pow(T.period,R)*Math.pow(T.period,(k-z)/T.equal);
  const C=T.cents, N=C.length, idx=((k%N)+N)%N, carry=Math.floor(k/N);
  return A*Math.pow(T.period,R+carry)*Math.pow(2,(C[idx]-C[z])/1200);
}
const tSize=T=>T.equal!=null ? T.equal : T.cents.length;     // сколько высот в периоде строя
/* ⛳ F1 «строи файлами»: СТРОЙ ЛАДА — ИЗ ЕГО ВИДА (tuningRec: запись строя, которую вид взял при рождении), а не поиском по id в реестре
   TUNINGS. Событие держит вид (правило #7) — значит и свой строй: удаление или замена установленного строя в реестре записанное не
   изменит. Голый объект лада (демо до F1, опоры пробы) записи не несёт — ему отвечает реестр по id. function — всплывает. */
export function tuningOf(s){ return (s && s.tuningRec) || (s && TUNING_OF_MODE.get(s)) || TUNINGS[s.tuning]; }   // F6: у голого лада — его закреплённый строй
/* ЯКОРЬ ЛАДА — две величины модели (A — частота, z — индекс строя, звучащий на ней) и КЛЮЧ (сдвиг ступеней лада внутри строя).
     фиксированный строй (fixedKey): индекс 0 строя — на ЯКОРЕ (cFix: «строй от» — C у пяти исторических, выбор у Пифагора), тоника
       выбирает КЛЮЧ (keyOf). «Строй от» = тоника (P3) даёт key 0 и cFix — то же выражение, что baseF: подвижный путь;
     подвижный: на тонике (baseF) звучит КОРЕНЬ лада (root — 0 у всех, кроме Баранга: Пелог, индекс 1), ключа нет.
   ⚠️ До T2 якорь собирается на каждый вызов из тех же cFix/keyOf/baseF, что читали прежние ветви; замороженный вид — T2. */
const modeAnchor=s=> s.fixedKey ? { A:cFix(s), z:0, key:keyOf(s) } : { A:baseF(), z:s.root, key:0 };
/* Индекс строя ступени i ∈ [0..n] (i = n — верхняя тоника, дубль: корень периодом выше — то, что IVX дописывает как edo). */
const degK=(s,i,T)=> i<s.sel.length ? s.sel[i] : s.root+tSize(T);
/* ⛳ T4a: ИНДЕКС В СТРОЕ — ОДНА ФУНКЦИЯ ПЕРЕВОДА «ступень лада → индекс строя» для записи в событие (поле a.ti). Ступень оборачивается
   ЗАКОНОМ СВОЕЙ РОЛИ, как в цене: мелодия и бас — по n+1 (длина IVX, как leadFreq/bassFreq), аккорд — по n (как chordNotes); переполнение —
   целым периодом строя в индекс (регистр остаётся в a.oct). Для ступеней 0..n оба закона дают одно и то же (дубль тоники n → root+размер
   строя). ⚠️ КЛЮЧ (сдвиг тоники у фиксированных строёв) в индекс НЕ входит: тоника живая (правило #7 морозит вид, не тонику), цена
   прибавляет ключ сама. undefined — у вида нет выборки (не должно быть — проба T0). */
export function tuningIndexOf(deg, s=CUR(), chord=false){
  if(!s||!s.sel) return undefined;
  const T=tuningOf(s), n=s.iv.length, len= chord ? n : n+1;
  const i=((deg%len)+len)%len, c=Math.floor(deg/len);
  return degK(s,i,T)+tSize(T)*c;
}
/* ═══ T4b1: ЦЕНА ПО ИНДЕКСУ В СТРОЕ (a.ti) — ЗВУК ЧИТАЕТ ИНДЕКС ═══
   Индекс a.ti (T4a) — сдвиг высоты в строе вида, регистр — a.oct. Функция высоты хочет (индекс k без переноса, регистр R): из a.ti их
   получаем РАСЩЕПЛЕНИЕМ, подобранным так, чтобы аргументы pitchHz были РОВНО теми, что даёт ступень (доказательство — проба
   P.checkSound(): каждое событие песни и прогон по всем видам, ступеням 0..n, регистрам, тоникам, A4 и якорям, ===).
     • РАВНЫЙ строй: индекс НЕ приводится внутри периода (k = ti, верхняя тоника — root+E, как IVX); перенос — только сверх периода;
     • ТАБЛИЦА: pitchHz сам переносит ⌊k/N⌋ в регистр — расщепление то же, результат тот же;
     • ФИКСИРОВАННЫЙ строй: ЯКОРЬ и КЛЮЧ — живые (modeAnchor: cFix и keyOf от живой тоники), в индекс не входят — прибавляются здесь,
       как в цене по ступени.
   ⚠️ ГРАНИЦА: индекс не различает «дубль тоники в регистре r» и «корень в регистре r+1» (у ступени это n и n+1 — оба дают root+E).
   Ступень вне 0..n НЕ пишет ни один путь (жесты, прямоугольники, терменвокс, ряды редактора, подложки — все в 0..n), поэтому у мелодии
   расщепление выбирает ДУБЛЬ; у строя с периодом-степенью двойки обе записи равны побитно, у Болена–Пирса и Карлос ступень n+1 дала бы
   последний бит иначе — она недостижима. У аккорда корень лежит в [root, root+E) (тон «дубль» у аккорда — корень регистром выше),
   и расщепление однозначно при ЛЮБОЙ ступени. */
function melodySplit(ti,oct,s,T){ const E=tSize(T), top=s.root+E;
  if(ti>=s.root && ti<=top) return [ti,oct];
  const c = ti>top ? Math.ceil((ti-top)/E) : Math.floor((ti-s.root)/E);
  return [ti-E*c, oct+c]; }
export function leadFreqTi(ti,oct, s=CUR()){ const T=tuningOf(s), a=modeAnchor(s), [k,R]=melodySplit(ti,oct,s,T);
  return pitchHz(T,a.A,a.z,a.key+k,R); }
export function bassFreqTi(ti,oct, s=CUR()){ const T=tuningOf(s), a=modeAnchor(s), [k,R]=melodySplit(ti,oct,s,T);
  return pitchHz(T,a.A/4,a.z,a.key+k,R); }
/* Аккорд по индексу КОРНЯ. ⛳ ПЕРЕЕХАЛИ (цена побитно та же, что по ступени): сетка фиксированных строёв, корень чистых отношений
   (Партч, подвижный Натуральный), корень Болена–Пирса, типизированный аккорд равного строя (палитры chrom12/edo19/edo31 и однонотные
   типы распада/U4 у любого равного лада — тоны = корень + смещения в шагах строя, тот же неприведённый шаг и тот же регистр).
   ⛔ ОСТАЛИСЬ НА СТУПЕНИ (ty нет): терцовая стопка (ступени i, i+2, i+4 — их даёт ЛАД, индекс строя без лада их не знает), пауэр-аккорд и
   округлённые отношения 19/31-TET (правила chordSteps по tag) и номинально-равная цена нетипизированного аккорда центового лада —
   это «правила аккордов как данные», T6. ti===undefined — с T4c-1 ноль нот (ступени в аргументах больше нет; см. chordNotesAt). */
/* T4b3: ВОРОТА «аккорд читает индекс корня» — ОДНИ на цену (chordNotesAt) и на ряды редактора (draw: ряд корня и ноты аккорда берутся из
   индекса ровно там, где из него звучат). Ложь — путь ступени: нет индекса, нет типа (стопка терций, пауэр-аккорд — T6) или строй без ветки
   по индексу (таблица без центов лада — таких ладов нет). */
export function chordReadsTi(ti, s=CUR(), ty=null){
  if(ti===undefined) return false;
  if(!ty){ const k=s.chordRule&&s.chordRule.kind; return k==='tertian'||k==='stack'||k==='power'||k==='ratios'; }   // ⛳ T6b: нетипизированный — по правилу лада от места корня в ладу
  return !!s.cents || periodOf(s)!==2 || tuningOf(s).equal!=null;
}
/* ⛳ T6b: НЕТИПИЗИРОВАННЫЙ АККОРД — ЦЕНА ПО ПРАВИЛУ ЛАДА (ruleChordSteps) от СТУПЕНИ КОРНЯ deg в регистре oct. Шаги правила — индексы
   НОМИНАЛЬНОГО равного строя лада (s.iv + перенос периода), регистр — oct; цена — то же выражение, что прежняя равная ветка chordNotes
   (pitchHz(TE, baseF()/2, 0, шаг, oct)), поэтому побитно прежняя на каждом ладу, где правило строит аккорд (проба P.checkUntyped).
   ⚠️ НАЗВАННЫЙ СЛУЧАЙ: у лада на ТАБЛИЦЕ строя цена по-прежнему номинально-равная (TE), а не по таблице. Нетипизированного аккорда на
   таком ладу не пишет ни один путь: каждый лад с аккордами без палитры стоит на равном строе (доказательство данными — P.checkRules).
   Переход на цену по таблице — смена определения, недостижимая сегодня; решается, когда появится такой лад (лад пользователя). */
function untypedNotes(deg,oct,s,sev){
  const T=tuningOf(s), n=s.iv.length, P=periodOf(s);
  const r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
  const TE= T.equal!=null ? T : { period:P, equal:s.edo };
  return ruleChordSteps(deg,s,sev).map(st=>({ f: pitchHz(TE,baseF()/2,0,st,oct), iv: st-r0 }));
}
/* ⛳ T4c-1: ЦЕНА АККОРДА — ТОЛЬКО ИЗ ИНДЕКСА КОРНЯ (ti) И РЕГИСТРА; ступени в аргументах больше нет. Где цена прежде шла по ступени
   (аккорд без индекса, правило без ветки по индексу — palette/none у нетипизированного, строй без ветки по индексу у типизированного),
   место корня в ладу берётся ОБРАТНОЙ ВЫБОРКОЙ (modeSlotOfTi) — для ступеней 0..n это ровно записанная пара (ступень, регистр), проба
   T4b4, — и цена считается прежней функцией по ступени. Индекса нет, или его высоты нет в ладу — ноль нот: аккорда нет,
   ничего не бросает. ⛳ T5: НЕТИПИЗИРОВАННЫЙ аккорд с корнем вне лада не пишет ни один путь — редактор, перенося целый аккорд на
   приглушённый ряд, делает его типизированным с прежней формой (recorder.chordMoveTy, вариант (а)); типизированный считается из индекса. Доказательство, что ступень больше не нужна, — проба P.checkStrip (событиям клона стирают a.deg). */
export function chordNotesAt(ti,oct, s=CUR(), sev=seventh, ty=null){
  if(!chordReadsTi(ti,s,ty)){ const p=modeSlotOfTi(ti,oct,s); return p ? chordNotes(p.deg,p.oct,s,sev,ty) : []; }
  /* ⛳ T6b: НЕТИПИЗИРОВАННЫЙ — место корня в ладу из ИНДЕКСА (обратная выборка modeSlotOfTi, в виде события), правило строит от него. */
  if(!ty){ const p=modeSlotOfTi(ti,oct,s); return p ? untypedNotes(p.deg,p.oct,s,sev) : []; }
  const T=tuningOf(s), E=tSize(T), c=Math.floor((ti-s.root)/E), K=ti-E*c, R=oct+c;
  if (s.cents && s.gridChords){ const a=modeAnchor(s);
    return ty.map(off=>({ f: pitchHz(T,a.A/2,a.z,a.key+K+off,R), iv:off })); }
  if (s.cents || (periodOf(s)!==2 && chordBuildOf(s)==='adaptive')){ const a=modeAnchor(s), rootF=pitchHz(T,a.A/2,a.z,a.key+K,R);   // T7: неоктавный строй «из строя» (Болен–Пирс) — равной веткой ниже, шагами
    return ty.map(ra=>({ f:rootF*ra, iv:ra })); }
  return ty.map(iv=>({ f: pitchHz(T,baseF()/2,0,ti+iv,oct), iv }));   // равная ветка, типизированный путь chordSteps: шаг корня (= ti, неприведённый) + интервал, регистр oct
}
/* T4b3: частота РЯДА корня из индекса — chordRowFreq по индексу (та же единица корня chordUnit, та же цена chordNotesAt). Проба T4b1
   (прогон с типом chordUnit) — она побитно равна chordRowFreq по ступени. Зовёт редактор у аккорда, читающего индекс (chordReadsTi). */
export function chordRowFreqAt(ti,oct, s=CUR(), sev=seventh){   // T4c-1: без ступени; высоты нет в ладу — NaN (ряда нет)
  const N=chordNotesAt(ti,oct,s,sev, chordUnit(s)); return N.length ? N[0].f : NaN;
}
/* ⛳ T4b4: ОБРАТНАЯ ВЫБОРКА ЛАДА — индекс в строе (a.ti) и регистр → МЕСТО В ЛАДУ { deg, oct } для ПОДСВЕТКИ, или null — этой высоты
   в ладу нет. Обращает tuningIndexOf тем же законом расщепления, что ряд редактора (draw: rowOfTi) и мелодия в цене (melodySplit):
   сдвиг над корнем j = ti − root, вне [0, E] — приведение целым периодом с переносом в регистр; j = E — ДУБЛЬ тоники наверху регистра
   (ступень n того же регистра: так её пишут и мелодия, и аккорд), j = 0 — корень регистра. Для ступеней 0..n (их только и пишут пути
   записи) это ровно та же пара (ступень, регистр), что лежит в событии — проба P.checkHl. Высота вне лада (с T5 — нота, поставленная редактором на приглушённый
   ряд) — null: подсвечивать нечего, ничего не бросает. Таблица «сдвиг → ступень» — одна на вид (виды стабильны, T2), разбор — арифметика. */
const SEL_INV=new WeakMap();
export function modeSlotOfTi(ti, oct, s=CUR()){
  if(typeof ti!=='number' || !s || !s.sel) return null;
  let m=SEL_INV.get(s);
  if(!m){ const T=tuningOf(s), n=s.iv.length; m={ E:tSize(T), root:s.root, j:new Map() };
    for(let d=0; d<=n; d++) m.j.set(degK(s,d,T)-s.root, d);
    SEL_INV.set(s,m); }
  let j=ti-m.root, c=0;
  if(j<0 || j>m.E){ c = j>m.E ? Math.ceil((j-m.E)/m.E) : Math.floor(j/m.E); j-=m.E*c; }
  const d=m.j.get(j); if(d===undefined) return null;
  return { deg:d, oct: c ? oct+c : oct };
}
export function chordFreqsAt(ti,oct, s=CUR(), sev=seventh, ty=null){ return chordNotesAt(ti,oct,s,sev,ty).map(n=>n.f); }   // T4c-1: без ступени
/* Мелодия и бас: ступень → индекс строя тем же оборачиванием, что прежде (длина IVX = n+1, переполнение — в регистр). */
export function leadFreq(deg,oct, s=CUR()){ const T=tuningOf(s), len=s.iv.length+1, a=modeAnchor(s);
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return pitchHz(T,a.A,a.z,a.key+degK(s,i,T),o); }
export function bassFreq(deg,oct, s=CUR()){ const T=tuningOf(s), len=s.iv.length+1, a=modeAnchor(s);   // бас на 2 октавы ниже соло (A/4 — константа-пол, не период)
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return pitchHz(T,a.A/4,a.z,a.key+degK(s,i,T),o); }
/* ⛳ НОТЫ АККОРДА — ОДИН ИСТОЧНИК (слайс U1 «аккорд как ноты»). chordNotes отдаёт каждую звучащую ноту: f — частоту, iv — её интервал
   в той же записи, в какой его читает ветка цены (полутоновое смещение / отношение / шаг лада от корня). chordFreqs — ровно её частоты,
   и движок (ENG.chOn/chSet) играет их, а редактор показывает ноты аккорда этой же функцией: второй копии правил построения нет.
   ⚠️ АРИФМЕТИКА НЕ ТРОНУТА: в каждой ветке частота считается тем же выражением, что и прежде, — меняется лишь то, что рядом с ней
   кладётся интервал. Звук побитно прежний. */
export function chordFreqs(deg,oct, s=CUR(), sev=seventh, ty=null){ return chordNotes(deg,oct,s,sev,ty).map(n=>n.f); }
/* ⛳ ЕДИНИЦА КОРНЯ (U4 «аккорд как ноты») — однонотный тип, чья цена есть САМ КОРЕНЬ: аккорд (ступень, регистр, chordUnit(s)) звучит
   ровно высоту РЯДА (ступень, регистр). Это КАНОНИЧЕСКАЯ ФОРМА ноты на ряду: так редактор пишет ноту, перенесённую по высоте.
   ⛔ Цены здесь нет — только ответ на вопрос «в какой записи ветка chordNotes читает интервал», в ТОМ ЖЕ порядке ворот, что ниже:
     · s.cents && s.gridChords → ветка сетки: интервал — целое полутоновое смещение по сетке, корень = [0];
     · s.cents (без сетки)     → ветка чистых отношений (Партч, подвижный Натуральный): корень × отношение, корень = [1];
     · период ≠ 2              → ветка периода (Болен–Пирс): корень × отношение, корень = [1];
     · иначе                   → равная ветка (chordSteps, типизированный путь: шаг корня + интервал): корень = [0] — и у
                                  типизированных наборов (chrom12/edo19/edo31), и у нетипизированных ладов (стопка терций / пауэр-аккорд:
                                  их нота 0 — тот же шаг корня тем же выражением).
   ⚠️ Нетипизированного cents-лада с аккордами нет (все cents-лады с аккордами типизированы; гамелан, шрути, раги — noChords), поэтому
   «единица по воротам» и «нота 0 нетипизированной стопки» совпадают у всех ладов. Новый вид цены — новая строка ЗДЕСЬ, рядом с веткой. */
export function chordUnit(s=CUR()){
  if(s.cents) return s.gridChords ? [0] : [1];
  return periodOf(s)!==2 && chordBuildOf(s)==='adaptive' ? [1] : [0];   // T7: Болен–Пирс теперь — равная ветка (шаги), единица корня [0]
}
/* ⛳ T7: КАК СТРОЯТСЯ АККОРДЫ СТРОЯ — свойство для конструктора (решение пользователя): 'adaptive' — чистыми отношениями от корня,
   высоты сдвигаются под каждый аккорд, как поёт хор (тон может лечь мимо строя); 'tuning' — ИЗ ВЫСОТ СТРОЯ, как на инструменте.
   Встроенные — по своей теории: адаптивен только подвижный Натуральный; прочие — из строя (Партч — отношениями, но ТОЛЬКО теми, что
   ложатся на его 43 высоты: chordTypeFits; Болен–Пирс — шагами). Строй пользователя выберет сам. Нет поля — 'tuning'. */
export function chordBuildOf(s){ return (s&&s.chordBuild)||'tuning'; }   // function — всплывает: её читают ворота цены, а те могут позвать при загрузке модуля
/* ⛳ T7: ЛЕЖИТ ЛИ ТИП АККОРДА ЦЕЛИКОМ В СТРОЕ на корне с индексом ti. Вопрос имеет смысл только у строя «из строя» с набором ОТНОШЕНИЙ и
   точными отношениями в данных (сегодня — Партч): каждый тон, корень × отношение, приведённый в октаву, обязан быть одной из высот
   (точное сравнение дробей). Прочим — всегда истина: шаговые наборы и сетки берут тоны из строя по построению, адаптивный строй
   сдвигает высоты намеренно. ty — массив отношений типа. Ответ запоминается на (тип, строй): таблица корней. */
const FIT_MEMO=new WeakMap();
const gcd=(a,b)=>{ while(b){ [a,b]=[b,a%b]; } return a; };
function ratioOf(x){ for(let q=1;q<=4096;q++){ const p=Math.round(x*q); if(p/q===x) return [p,q]; } return null; }   // дробь, чьё JS-значение — ровно x (наборы пишут 5/4, 36/11 …)
function octRed(n,d){ const g=gcd(n,d); n/=g; d/=g; while(n>=2*d){ if(n%2===0) n/=2; else d*=2; } while(n<d){ if(d%2===0) d/=2; else n*=2; } const h=gcd(n,d); return (n/h)+'/'+(d/h); }
export function chordTypeFits(ty, ti, s=CUR()){
  if(!ty || !s || s.gridChords || chordBuildOf(s)!=='tuning') return true;
  const T=tuningOf(s), RT=T&&T.ratios; if(!RT || !s.cents) return true;
  let m=FIT_MEMO.get(ty); if(!m){ m=new Map(); FIT_MEMO.set(ty,m); }
  let row=m.get(T);
  if(!row){
    const set=new Set(RT.map(([n,d])=>octRed(n,d))), tones=ty.map(ratioOf);
    row=RT.map(([rn,rd])=>tones.every(t=> !!t && set.has(octRed(rn*t[0], rd*t[1]))));
    m.set(T,row);
  }
  const N=RT.length, k=((ti%N)+N)%N;
  return typeof ti==='number' ? !!row[k] : true;
}
/* Частота РЯДА (ступень, регистр) в регистре аккордов — частота КОРНЯ аккорда на этом ряду, по той же цене, что у chordNotes: аккорд из
   ЕДИНИЦЫ КОРНЯ (chordUnit — у типизированного лада это первый интервал любого его типа: все типы начинаются с корня; у нетипизированного
   — нота 0 стопки). По ней редактор ставит ноты аккорда на ряд или между рядами — и по ней же (U4) звучит нота, перенесённая на ряд. */
export function chordRowFreq(deg,oct, s=CUR(), sev=seventh){
  return chordNotes(deg,oct,s,sev, chordUnit(s))[0].f;
}
export function chordNotes(deg,oct, s=CUR(), sev=seventh, ty=null){ // база аккордов на октаву ниже соло
  /* T1: ВОРОТА ВЕТВЕЙ И ИХ ПОРЯДОК — ПРЕЖНИЕ (правила аккордов станут данными в T6); меняется только то, ЧЕМ считается высота: каждая
     ветвь зовёт одну функцию высоты (pitchHz). Доводы ветвей — в legacyChordNotes (прежнее тело; с T4c-2 — в пробе, «замороженные опоры»). */
  const T=tuningOf(s), n=s.iv.length;
  if (s.cents && ty && s.gridChords){
    /* СЕТКА: ноты аккорда — высоты строя (ключ + ступень корня + целое смещение), перенос периода — в регистр. */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n), K=a.key+s.sel[d];
    return ty.map(off=>({ f: pitchHz(T,a.A/2,a.z,K+off,o), iv:off }));
  }
  if (s.cents && ty){
    /* ТОНЫ-ОТНОШЕНИЯ (Партч, подвижный Натуральный): корень — высота строя, нота — корень × отношение, как прежде. Эти тоны лежат
       ВНЕ строя; держим их явно, пока пользователь не решит каждый случай на слух (T7). */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=pitchHz(T,a.A/2,a.z,a.key+s.sel[d],o);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  const P=periodOf(s);
  if (P!==2 && ty && chordBuildOf(s)==='adaptive'){   // ⛳ T7: только АДАПТИВНЫЙ неоктавный строй строит аккорд отношениями; Болен–Пирс («из строя») — шагами, равной веткой ниже (встроенных адаптивных неоктавных нет)
    /* Болен–Пирс: корень — равный шаг в ПЕРИОДЕ (тритава), нота — корень × отношение (тоны-отношения, как выше). */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=pitchHz(T,a.A/2,a.z,a.key+s.sel[d],o);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  /* РАВНАЯ ветка: шаги chordSteps — уже индексы равного строя (неприведённые), регистр oct — прежний.
     ⚠️ Нетипизированный аккорд на ЦЕНТОВОМ ладу (ty нет) попадает сюда и прежде ценился НОМИНАЛЬНЫМИ равными шагами (edo лада), а
     не своей таблицей. Из интерфейса это недостижимо (прогрессии — только у 7-ступенных ладов с аккордами, а все такие центовые лады
     noChords; живая игра на типизированных ладах всегда несёт тип), но ради побитной верности цена та же: номинальный равный строй
     { period, equal: edo }. С T6b нетипизированный аккорд считает untypedNotes по правилу лада — той же номинально-равной ценой (случай назван у неё). */
  if(!ty) return untypedNotes(deg,oct,s,sev);   // ⛳ T6b: без типа — по правилу лада (тот же расчёт; 'none' — ноль нот)
  const r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
  const TE= T.equal!=null ? T : { period:P, equal:s.edo };
  return ty.map(iv=>{ const st=r0+iv; return { f: pitchHz(TE,baseF()/2,0,st,oct), iv: st-r0 }; }); }   // T4c-2: шаги типа от корня — то, что давала типизированная ветка chordSteps (она ушла в пробу)
 
export function name24(q){ q=((q%24)+24)%24;      // имена четвертьтонов: чётный шаг = обычная нота,
  return q%2 ? NOTE_NAMES[(((q+1)/2)|0)%12]+'½♭' : NOTE_NAMES[(q/2)%12]; } // нечётный = полубемоль
/* Имя ШАГА лада st (шаги — в единицах edo лада) по схеме строя (F3: было по s.edo 12/24). */
export function stepName(st,s=CUR()){ const p=namingOf(s).pitch;
  if (p==='notes12') return NOTE_NAMES[(((tonic+st)%12)+12)%12];
  if (p==='notes24') return name24(tonic*2+st);
  return 'ст'+(((st%s.edo)+s.edo)%s.edo);
}
/* Имя РЯДА ступени deg: у схем нот — имя шага (stepName), иначе — номер шага, «Т» на тонике (F3: было по s.edo 12/24). */
export function rowLabel(deg,s=CUR()){ const ivx=IVX(s), p=namingOf(s).pitch;
  if (p==='notes12'||p==='notes24') return stepName(ivx[deg],s);
  const st=ivx[deg]%s.edo; return st===0?'Т':String(st);
}
/* Центы для экранной подсказки. У лада с s.cents — РЕАЛЬНЫЕ центы ступени (визуальная
   правда: play-tag показывает 231, а не 240), гейт на s.cents, поэтому прочие лады
   считают по-прежнему от номинального равного шага. На высоту не влияет.
   fixedKey: интервал над КЛЮЧОМ = cents[tonic+deg] − cents[tonic] (зависит от тональности —
   у Веркмайстера терция читает 390¢ в C и 408¢ в F#, тот самый урок). При тонике C — как было. */
export const centsOf=(deg,s=CUR())=>{
  /* T1: по ЗАПИСИ строя (центы ступени — разность высот строя).
     ⛳ ОДНО ПРАВИЛО (решение пользователя, слайс «дрон и центы»): ЦЕЛЫЕ ЦЕНТЫ ВЕЗДЕ — точное значение округляется ОДИН раз. Прежде было
     три правила (десятые у фиксированных, сырые у подвижных таблиц, целые у равных); ошибка меньше полуцента далеко за пределом слуха,
     а точные значения остаются в ДАННЫХ (файлы data/ — с F5; TUNINGS) — для конструктора ладов. ⚠️ Именно ТОЧНОЕ, а не прежние десятые: двойное
     округление (десятые, потом целые) у 17 из 936 случаев фиксированных строёв дало бы на единицу больше (мезотон: тритон 579.47¢ →
     579.5 → 580 вместо 579). Свёртка в период — прежняя у каждого вида (у фиксированных верхняя тоника читает 1200, у прочих 0).
     Вызывающие передают ступень 0..n; за пределами — оборачивание по n+1 (прежде у равных было NaN, у таблиц — оборачивание). */
  const T=tuningOf(s), len=s.iv.length+1, K=degK(s,((deg%len)+len)%len,T);
  if(s.fixedKey){ const key=keyOf(s), k=key+K, C=T.cents, N=C.length, idx=((k%N)+N)%N, carry=Math.floor(k/N);
    /* ⛳ F7: ступени, названные НОМЕРОМ (схема ordinal — Натуральный в «Свободно»), читают центы в периоде, как каждая нумерованная
       таблица (верхняя тоника — 0); названные НОТОЙ — над ключом до октавы (верхняя — 1200), как прежде у фиксированных. */
    const c=C[idx]+1200*carry-C[key];
    return Math.round(namingOf(s).deg==='ordinal' ? c%1200 : c); }            // урок фиксированного строя (390 против 408) виден и в целых центах
  if(T.equal==null){ const C=T.cents, N=C.length, idx=((K%N)+N)%N, carry=Math.floor(K/N);
    return Math.round((C[idx]+1200*carry-C[s.root])%1200); }  // центы таблицы над корнем лада (раги, гамелан, Партч) — целыми
  const pc=1200*Math.log2(T.period);   // центы ПЕРИОДА: октава 1200, тритава ≈1901.955 (BP)
  return Math.round(Math.round(K*pc/T.equal)%pc); };          // у неоктавных (pc дробный) верхняя тоника давала 0.045 — теперь 0

/* ═══ ДРОН — «КАК БЫЛО БЫ В ЖИВОМ ИСПОЛНЕНИИ» (слайс «дрон и центы», решение пользователя, HANDOFF) ═══
   Настоящий дрон — тампура, волынка, колёсная лира — настраивается на слух ЧИСТЫМИ интервалами, поэтому вторая струна — СОБСТВЕННАЯ
   высота СТРОЯ, а не постоянная ×1.498, и она СЛЕДУЕТ ЗА ЛАДОМ, как тампурист строит струну под рагу: ⛔ дрон никогда не тянет высоту,
   которой в ладу нет.
   ⛳ ВЫБОР СТУПЕНИ — ОДНО общее правило по выборке лада, без частных случаев (годится и для ладов пользователя):
     центы каждой ступени над корнем лада — ТОЧНЫЕ, из строя (degCentsExact); ищется ступень, БЛИЖАЙШАЯ к цели, и берётся, если она
     в пределах DRONE_TOL (17¢). Цели по порядку:
       1) квинта 3/2 (701.955¢) — у любого строя (у Карлос ПЕРИОД и есть 3/2 — верхняя тоника ложится ровно на неё, правило находит его
          само, частного случая нет);
       2) только у ОКТАВНЫХ строёв (кварта и септима — понятия октавы): кварта 4/3 (498.045¢), затем септима — 15/8 (1088.3¢, большая
          «Ни»), 9/5 (1017.6¢), 16/9 (996.1¢) (малые);
       3) у НЕОКТАВНОГО строя без квинты — цель из ДАННЫХ СТРОЯ (F4: drone.withoutFifth; Болен–Пирс — '5/3', выбор пользователя на
          слух при T3): ступень, ближайшая к ней (у Б–П 6 шагов = 877.6¢ против 884.4¢), если ухо-переключатель DRONE_NONOCT стоит на
          'cons' (умолчание); 'period' — цель не берётся, тоника ПЕРИОДОМ выше (тритава 3:1). До F4 цель 5/3 была константой кода;
       4) не нашлось ничего — тоника периодом выше (верхняя тоника: она есть в любом ладу).
   ⛳ ДОПУСК 17¢ — ОБОСНОВАН ДАННЫМИ (проверено по таблицам всех встроенных строёв во всех ключах): он принимает КАЖДУЮ квинту, которую
     строй считает квинтой (худшие — слендро +15.0¢, 19-TET −7.2¢, хорошие темперации до −5.9¢, мезотон −5.4¢), и ОТВЕРГАЕТ волков
     (пифагоров −23.5¢, фиксированный Натуральный −21.5¢ на D и Bb и +19.6¢ на F# — «квинта на комму шире», волк мезотона +35.7¢) и
     ближайшую к квинте ступень Болена–Пирса (+29.6¢). Граница лежит между 15.0¢ (слендро) и 19.6¢ (волк Натурального) — с запасом в обе стороны. Волк — по определению не квинта; тампурист не станет тянуть волка, а
     настроит кварту — так и делает правило (Пифагор от C в ключе F#: квинта — волк, дрон берёт чистую кварту F#–B).
   ⛳ УМОЛЧАНИЕ Б–П — СТУПЕНЬ 5:3 (878¢): РЕШЕНИЕ ПОЛЬЗОВАТЕЛЯ НА СЛУХ (записано при T3), сравнившего обе кандидатуры консолью render.js
     (R.droneBP('cons'|'period')). Прежнее умолчание слайса «дрон и центы» — тритава (3:1, собственная эквивалентность строя); переключатель
     оставлен, чтобы её можно было услышать.
   ⚠️ Дрон читает ЖИВОЙ лад (CUR — как и прежде: tonicFreq() без аргумента), а не замороженный лад события дрона. Его корень —
     tonicFreq()/2, побитно прежний; вторая струна — та же функция высоты (pitchHz) в регистре корня (A/2): высота строя, та же, что
     у мелодии в этом ладу, — дрон не бьётся с нотами лада. */
export const DRONE_TOL=17;   // ¢ — см. довод выше: между слендро (+15.0, квинта) и волком Натурального (+19.6, не квинта)
const C_OF=r=>1200*Math.log2(r);
const DRONE_FIFTH=C_OF(3/2), DRONE_OCT_FALLBACK=[C_OF(4/3), C_OF(15/8), C_OF(9/5), C_OF(16/9)];
let DRONE_NONOCT='cons';   // ухо-переключатель (R.droneBP): 'cons' — цель строя из данных (F4: drone.withoutFifth; Б–П — 5:3, решение пользователя при T3); 'period' — тритава
export const droneNonOct=()=>DRONE_NONOCT;
export const setDroneNonOct=v=>{ DRONE_NONOCT = v==='period' ? 'period' : 'cons'; };   // неизвестное значение → умолчание ('cons')
/* Точные центы ступени d (0..n) над корнем лада — из строя (у фиксированного — над КЛЮЧОМ, как показ центов). */
export function degCentsExact(d, s=CUR()){
  const T=tuningOf(s), K=degK(s,d,T);
  if(T.equal!=null) return (K-s.root)*1200*Math.log2(T.period)/T.equal;
  const key=s.fixedKey?keyOf(s):0, C=T.cents, N=C.length;
  const at=k=>C[((k%N)+N)%N]+1200*Math.floor(k/N);
  return at(key+K)-at(key+s.root);
}
/* Какую ступень берёт вторая струна дрона: { deg, why: 'fifth'|'fourth'|'seventh'|'cons'|'period', cents }. */
export function droneDegree(s=CUR()){
  const n=s.iv.length, cs=[];
  for(let d=1; d<=n; d++) cs.push([d, degCentsExact(d,s)]);
  const near=c=>{ let best=null, bd=Infinity; for(const [d,x] of cs){ const e=Math.abs(x-c); if(e<bd){ bd=e; best=d; } } return bd<=DRONE_TOL ? best : null; };
  const pick=(d,why)=>({ deg:d, why, cents:degCentsExact(d,s) });
  let d=near(DRONE_FIFTH); if(d!=null) return pick(d,'fifth');
  if(tuningOf(s).period===2){
    d=near(DRONE_OCT_FALLBACK[0]); if(d!=null) return pick(d,'fourth');
    for(const c of DRONE_OCT_FALLBACK.slice(1)){ d=near(c); if(d!=null) return pick(d,'seventh'); }
  }else if(DRONE_NONOCT==='cons'){ const tf=tuningRecOf(s), w=tf && tf.drone && tf.drone.withoutFifth;   // F4: цель — данные строя
    if(w!=null){ d=near(C_OF(ratioNum(w))); if(d!=null) return pick(d,'cons'); } }
  return pick(n,'period');
}
/* Частота второй струны дрона — та же функция высоты, в регистре корня дрона (A/2, как tonicFreq()/2). */
export function droneSecondHz(s=CUR()){
  const T=tuningOf(s), a=modeAnchor(s), d=droneDegree(s).deg;
  return pitchHz(T, a.A/2, a.z, a.key+degK(s,d,T), 0);
}
/* ⛳ T3: ВЫСОТА ПРОИЗВОЛЬНОЙ ВЫСОТЫ СТРОЯ В РЕГИСТРЕ АККОРДОВ — для приглушённых рядов редактора (высоты строя вне лада). j — сдвиг в
   строе над КОРНЕМ лада (0..размер строя; = degK − root), oct — регистр. Та же функция высоты и та же доля роли, что у chordNotes (A/2):
   ряд вне лада звучал бы ровно этой высотой — по ней редактор ставит ноты аккорда на такой ряд (квинта пауэр-аккорда пентатоники).
   ⚠️ Никто этим не ИГРАЕТ (звук нот — по-прежнему chordNotes); только показ. */
export function chordPitchHz(j,oct, s=CUR()){
  const T=tuningOf(s), a=modeAnchor(s);
  return pitchHz(T, a.A/2, a.z, a.key+s.root+j, oct);
}
/* ⛳ T4c-2: ПРЕЖНИЕ ТЕЛА ФУНКЦИЙ ВЫСОТЫ И ПОДПИСЕЙ (legacy*, chordSteps по tag, fixedSlot) ПЕРЕЕХАЛИ В ПРОБУ (src/scaleprobe.js,
   раздел «ЗАМОРОЖЕННЫЕ ОПОРЫ») — слово в слово; в приложении прежнего кода нет. Им нужны keyOf/cFix — они экспортированы ниже по файлу. */


/* ⛳ F3 — СХЕМА list: имена из СПИСКА СТРОЯ (сетка 22 шрути: свара · шрути — список в data/tunings/shruti22.json, комментарий — data/README.md). До F3 —
   таблицы SWARA_OF/SHRUTI_OF по ЦЕНТАМ над тоникой лада (swaraLbl, swaraOfCents); теперь имя — у ВЫСОТЫ строя, по её номеру. Совпадают,
   потому что все лады списочного строя стоят на его высоте 0 (root 0): центы над тоникой лада = центы высоты строя.
   listName — имя высоты k (номер в строе, приводится в период); full — «name · detail» (различает комма-пары: «Ре♭ · Дайавати» и
   «Ре♭ · Ранджани»). Нет списка или записи — null (вызывающий ставит запасной ярлык). */
export function listName(s,k,full){ const A=namingOf(s).names; if(!A || !A.length) return null;
  const e=A[((k%A.length)+A.length)%A.length]; if(!e) return null;
  return full && e.detail ? `${L(e.name)} · ${L(e.detail)}` : L(e.name); }
/* Подпись СТУПЕНИ deg по списку: имя высоты, на которой стоит ступень (верхняя тоника, deg = n, — высота тоники sel[0]); полное —
   если лад просит (naming.detail: сетка 22 шрути), иначе только name (раги называют сварами: Са Ре Га Ма Па Дха Ни). Точные центы
   всегда рядом (centsOf). Запасной — номер ступени. */
export const listLbl=(deg,s=CUR())=>{ const n=s.sel.length, i=deg%(n+1), k= i<n ? s.sel[i] : s.sel[0];
  return listName(s,k,namingOf(s).detail) ?? String(deg+1); };
 
export function qual(t,f){                         // качество трезвучия по интервалам (полутона)
  if(t===4&&f===7)return''; if(t===3&&f===7)return'm';
  if(t===3&&f===6)return'°'; if(t===4&&f===8)return'+';
  if(t===4&&f===6)return'♭5'; if(t===5&&f===7)return'sus4'; if(t===2&&f===7)return'sus2';
  return null;
}
export const SEV={'|11':'maj7','|10':'7','m|10':'m7','m|11':'m(maj7)','°|9':'°7','°|10':'ø',
           '+|11':'+(maj7)','+|10':'+7','♭5|10':'7♭5','sus4|10':'7sus4','sus2|10':'7sus2'};
/* sev — СЕПТАККОРД, тоже параметром (S5.4): он заморожен в событии (ev.sev) ровно как лад, поэтому
   подпись аккорда дорожки обязана читать ЕГО, а не живой тумблер панели. */
/* ⛳ T6c: ПОДПИСЬ АККОРДА ЧИТАЕТ ПРАВИЛО ЛАДА (chordRule), а не tag: «стопка ли» — rule.kind==='tertian', ноты — ruleChordSteps (тот же
   источник, из которого в T6b будет считаться цена). Строки — побитно прежние на каждом ладу, где подпись ВИДНА (правило tertian/power:
   нетипизированные аккордовые лады) — проба P.checkLabels; прежнее тело — legacyChordLabel (с T4c-2 — в пробе). */
/* ⛳ ПОДПИСЬ СТОПКИ (правило stack): стопка через ступень пяти-/шестиступенного лада — не всегда терции, поэтому имя ищется по
   НАБОРУ ВЫСОТ: сперва от баса, потом от каждого тона по порядку — знакомое трезвучие (мажор, минор, °, +, sus2, sus4) или
   четырёхзвучие (maj7, 7, m7, ø, °7, 6, m6, add9, madd9, 7sus4); корень не в басу — через косую черту («Am/C», «C/G»). Не нашлось — НОТЫ
   через тире («C–E–A–D»). Имена нот — как у прочих подписей (живая тоника, NOTE_NAMES); схема строя не notes12 — ноты по stepName
   (F3: было по s.edo!==12). */
const STACK_Q3={'4,7':'','3,7':'m','3,6':'°','4,8':'+','2,7':'sus2','5,7':'sus4'};
const STACK_Q4={'4,7,11':'maj7','4,7,10':'7','3,7,10':'m7','3,6,10':'ø','3,6,9':'°7','4,7,9':'6','3,7,9':'m6','2,4,7':'add9','2,3,7':'madd9','5,7,10':'7sus4','4,8,11':'+(maj7)'};
function stackLabel(st, s){
  if (namingOf(s).pitch!=='notes12') return st.map(x=>stepName(x,s)).join('–');
  const pc=x=>((x%12)+12)%12, nm=x=>NOTE_NAMES[pc(tonic+x)];
  const order=[]; for(const x of st){ const p=pc(x); if(!order.includes(p)) order.push(p); }
  const Q= order.length===3 ? STACK_Q3 : order.length===4 ? STACK_Q4 : null;
  if (Q) for(const r of order){
    const rel=order.filter(p=>p!==r).map(p=>pc(p-r)).sort((a,b)=>a-b).join(','), q=Q[rel];
    if (q!==undefined) return nm(r)+q+(r!==order[0] ? '/'+nm(order[0]) : '');
  }
  return st.map(nm).join('–');
}
export function chordLabel(deg,s=CUR(),sev=seventh){
  const n=s.iv.length, d=deg%n, p12=namingOf(s).pitch==='notes12';   // F3: имена — по схеме строя (было s.edo===12, дважды)
  if (s.chordRule && s.chordRule.kind==='none') return '';
  if (s.chordRule && s.chordRule.kind==='stack') return stackLabel(ruleChordSteps(deg,s,sev), s);   // ⛳ стопка — по набору высот   // ⛳ T6b: аккорда нет — и имени нет (chordNotesStr даёт '' сам: ноль нот)
  if (!(s.chordRule && s.chordRule.kind==='tertian')){
    return p12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12]+'5' : 'ст'+s.iv[d]+'·5';
  }
  const st=ruleChordSteps(deg,s,sev), r=st[0];
  if (p12){
    const root=NOTE_NAMES[(((tonic+r)%12)+12)%12];
    let q=qual(st[1]-r, st[2]-r);
    if (q==null) return root+'?';
    if (sev){ const sv=st[3]-r; q=SEV[q+'|'+sv] ?? (q+'⁷'); }
    return root+q;
  }
  return ROMAN[d]+(sev?'⁷':'');         // макам: римская ступень
}
/* ⛔ СТРЕЛКА, А НЕ `.map(stepName)` — И ЭТО НЕ КОСМЕТИКА. Array.map передаёт колбэку (значение, ИНДЕКС,
   массив), поэтому с новым вторым параметром индекс молча приехал бы на место ЛАДА: ошибки бы не было,
   а строка нот стала бы считаться по «ладу» 0,1,2… Точечная передача функции с умолчаниями запрещена
   везде, где колбэку дают больше одного аргумента. */
export const chordNotesStr=(deg,s=CUR(),sev=seventh)=>ruleChordSteps(deg,s,sev).map(st=>stepName(st,s)).join('·');   // T6c: ноты — по правилу лада (ruleChordSteps)
