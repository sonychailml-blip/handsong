/* REC1 (stage 3) — THE TRACK TABLES, moved verbatim from recorder.js (which re-exports these names — a facade). A track's identity is its
   lane id (rule #27); here are the tables keyed by it (mute, solo, level, pan, name, place, material length, edit version), the arm, the
   pending row delete, their pure readers and the table-only writers. No DOM, no Web Audio. What a track change does to the SOUND
   (release, freeze, drone, history) stays in recorder.js for now (REC2–REC5); the five things this module asks of the recorder come in
   through `laneWire` once, so nothing here imports recorder.js (no import cycle). */
import { events, evGen, evRole, isNoteStart } from './store.js';
import { volAmp } from '../config.js';

/* recording now? · the take's layers · is this layer being recorded? · is the audio engine up? · delete a track (recorder) */
const W={ recording:()=>false, recLayers:()=>[], isRecLayer:()=>false, audioOn:()=>false, deleteLane:()=>false };
const laneWire=o=>{ Object.assign(W, o); };

/* ═══ ДОРОЖКИ: ЗАГЛУШЕНИЕ И СОЛО (слайс S1 «Редактора дорожек») ═══
   ⚠️ НАСТРОЙКА КЛЮЧУЕТСЯ НА СГЕНЕРИРОВАННОМ id ДОРОЖКИ, А НЕ НА НОМЕРЕ СЛОЯ. Номер для этого НЕ
   ГОДИТСЯ, и это не предосторожность на будущее, а три уже существующих факта:
     (1) номера ПЕРЕИСПОЛЬЗУЮТСЯ — овердаб берёт maxLayer()+1, поэтому после ⤺ отмены следующая
         запись получает ТОТ ЖЕ номер; ключуйся мы на номере, новая дорожка молча родилась бы
         заглушённой (и человек искал бы пропавший звук);
     (2) в номерах бывают ДЫРЫ — clearJam вырезает события ПО МЕТКЕ ev.jam, а не по слою, поэтому
         «слои 0 и 2 без 1» — нормальное состояние, а не сбой;
     (3) onUndo НЕ ПЕРЕНУМЕРОВЫВАЕТ — и не должен: номер слоя зашит в КЛЮЧИ ВЛАДЕЛЬЦЕВ ГОЛОСОВ
         ('loop:N' / 'bassloop:N' / 'leadloop:N:v'), перенумерация оторвала бы звучащие голоса от
         их владельцев.
   Отсюда разделение: НОМЕР СЛОЯ — адрес ЗВУКА (ключи владельцев, события), id ДОРОЖКИ — адрес
   НАСТРОЙКИ, связывает их одна таблица laneId.
   ⛔ Не сливать их и ⛔ не писать id в событие: формат события слайс S1 НЕ трогает вовсе. */
let laneSeq=0;
/* ⛳ ВООРУЖЁННАЯ ДОРОЖКА (слайс S3.5c) — id ДОРОЖКИ или null, а НЕ номер слоя. Номер переиспользуется
   (отмена освобождает его, следующая запись берёт тот же), и вооружение по номеру молча перешло бы на
   РОДИВШУЮСЯ на его месте чужую дорожку. id монотонен и не выдаётся дважды, поэтому устаревший id может
   только «никуда не указывать» — и все места, где id умирает (laneNew поверх, lanePrune, laneReset),
   снимают вооружение явно. null — ● создаёт новую дорожку, как всегда. */
let armLane=null;
/* Ожидание ПОДТВЕРЖДЕНИЯ удаления дорожки (S3.5d): {id дорожки, until — performance.now()} или null.
   Ключ — id дорожки, как у вооружения, и по той же причине: номер слоя переиспользуется. */
let delPend=null;
const laneId=new Map();      // номер слоя → СТАБИЛЬНЫЙ id дорожки
const laneMute=new Set();    // id заглушённых дорожек
const laneSolo=new Set();    // id дорожек в соло
/* ⛳ MX1: УРОВЕНЬ ДОРОЖКИ (фейдер микшера) — id дорожки → v 0…1, по ТОЙ ЖЕ кривой, что громкость ноты (config.volAmp: множитель v²); нет
   записи — 1 (единица, «как было»). Ключ — id (правило #27), как у M/S: будущий формат песни лишь запишет эту таблицу. В событие НЕ пишется,
   в подпись заморозки НЕ входит (уровень — множитель на шине замороженной, буфер он не меняет). Уровень дорожки ≠ громкость ноты. */
const laneLevel=new Map();
/* ⛳ MX2: ПАНОРАМА ДОРОЖКИ — id дорожки → p −1 (лево) … 0 (центр) … +1 (право), шаг 0.01 (ручка −100…+100); нет записи — центр. Ключ — id
   (правило #27), как у уровня. В событие НЕ пишется. ⚠️ В ОТЛИЧИЕ ОТ УРОВНЯ — ВХОДИТ В ПОДПИСЬ ЗАМОРОЗКИ (freezeSig): ступень стоит в голосе
   ДО цепи эффектов, рендер её вплавляет (render.renderTrack), значит смена панорамы старит буфер — решение пользователя «панорама до
   эффектов» (см. audio, «MX2»). */
const lanePan=new Map();
/* ⛳ AR2: ИМЯ ДОРОЖКИ — id дорожки → строка, данная человеком; нет записи — имя ПО УМОЛЧАНИЮ «роль · тембр» (его собирает показ —
   draw.laneTitle — из событий дорожки на языке интерфейса, поэтому оно само идёт за заменой тембра и сменой языка). Ключ — id (правило #27):
   новая дорожка с номером удалённой имени покойника не наследует. В событие НЕ пишется, звук не трогает. Формат песни лишь запишет таблицу. */
const laneName=new Map();
const LANE_NAME_MAX=40;   // символов; длиннее — обрезаем (колонка заголовка всё равно режет многоточием)
/* ⛳ AR2: ПОРЯДОК ПОКАЗА — id дорожки → место (целое, 0…). ТОЛЬКО ПОКАЗ: номер слоя — адрес ЗВУКА (ключи владельцев), его порядок не
   трогает. Нет записи — дорожка идёт ПОСЛЕ всех поставленных, между такими — по номеру слоя. Умолчание поэтому прежнее: по номеру слоя,
   а это и есть порядок РОЖДЕНИЯ (новая дорожка берёт nextFreeLayer — выше всех живых номеров). Первая перестановка ставит место ВСЕМ
   дорожкам, значит всё, что родится позже, — без места и встаёт В КОНЕЦ. Ключ — id (правило #27): новая дорожка с номером удалённой не
   наследует её место. Один порядок на все три вида — окно аранжировки, лицо микшера, полоса игры (и круг чипа редактора): его отдаёт
   ОДНА функция laneOrder. */
const laneRank=new Map();
/* ⛳ ДЛИНА МАТЕРИАЛА СЛОЯ ПОДЛОЖКИ (починка «подложка сама крутится», при слайсе «дрон и центы»): id дорожки → доля КОНЦА её материала
   (такты подложки × размер). Длина песни — позиция последнего СОБЫТИЯ (songLenRecalc), а у событий подложки нет выключений: дрон и
   бас-педаль лежат одним событием на доле 0, аккорд — одним «вкл» на такт. Без этой карты песня из одной подложки «Дрон» имела длину 0
   и вставала на первом же тике, а у прогрессии последний такт обрезался на его первой доле. Ключ — id (правило #27), не номер слоя:
   номер переиспользуется, и чужая длина не должна достаться новой дорожке. В событие ничего не пишется. */
const laneLen=new Map();
const laneLenOf=layer=>laneLen.get(laneId.get(layer))||0;   // доля конца материала слоя подложки (0 — не подложка); читает render.renderTrack
/* ⛳ THE LAW OF THIS BLOCK: laneNew is the ONLY writer of laneId and always gives an id no other layer holds, overwriting the layer's old
   entry — correctness comes from the BIRTH of a track, never from cleaning up after a dead one (layer numbers are reused: a missed cleanup
   would hand a new track the old one's mute, solo, name …). A new place where a track is born must call laneNew.
   CMD1b (RUN 5; song file v7, rule #37): `id` — the track's permanent id from a song file, passed ONLY by Open (songOpenApply, right after
   the tables were cleared); taken when it is a positive integer no layer holds, and the counter floors above it (as evIdFloor); otherwise a
   fresh one. History snapshot steps restore lanes drop-first, so an id the previous song also used cannot leak between them. */
function laneNew(layer,id){
  const old=laneId.get(layer);
  if(old!=null){ laneMute.delete(old); laneSolo.delete(old); laneLen.delete(old); laneName.delete(old); laneRank.delete(old); if(armLane===old) armLane=null; }   // hygiene (a new id never sees them)
  let n=++laneSeq;
  if(Number.isInteger(id) && id>0 && id<=1e9 && ![...laneId.values()].includes(id)){ laneSeq--; n=id; if(n>laneSeq) laneSeq=n; }
  laneId.set(layer,n);
  return n;
}
/* ЧТЕНИЕ id — ЧИСТОЕ: вернёт либо ДЕЙСТВУЮЩИЙ id номера (тот, что выдало последнее рождение), либо
   undefined. ⛔ ЗАВОДИТЬ id ЗДЕСЬ НЕЛЬЗЯ, и это не стиль: «страховка», заводящая id по требованию,
   была бы ВТОРЫМ писателем, а значит вторым источником правды о том, какое поколение номера сейчас
   живёт. Отсутствие записи читается как «обычная слышимая дорожка» — что и верно: id, которого
   никогда не выдавали, не может лежать ни в laneMute, ни в laneSolo. */
const laneOf=layer=>laneId.get(layer);
/* REC1: forget one track id in every table, the arm and the pending delete (lanePrune, laneDrop — recorder.js) */
const laneForget=id=>{ laneMute.delete(id); laneSolo.delete(id); laneLevel.delete(id); lanePan.delete(id); laneName.delete(id); laneRank.delete(id); laneLen.delete(id); laneEditVer.delete(id); if(armLane===id) armLane=null; if(delPend&&delPend.id===id) delPend=null; };
/* REC1: every table empty (laneReset — recorder.js); laneSeq stays monotonic (see laneReset) */
const laneTablesClear=()=>{ laneId.clear(); laneMute.clear(); laneSolo.clear(); laneLevel.clear(); lanePan.clear(); laneName.clear(); laneRank.clear(); laneLen.clear(); laneEditVer.clear(); armLane=null; delPend=null; };
/* ⛳ ВЕРСИЯ ПРАВОК ДОРОЖКИ (A2) — по ID, не по номеру (правило #27). Поднимается там же, где takeFxTouch
   (editCommit и autCommit), но ТОЛЬКО у открытой в редакторе дорожки: все правки идут через editGuard, а
   он пускает лишь её.
   ⛔ ЗАЧЕМ ОНА, А НЕ takeFxVer. Тот — ОДИН НА ВСЁ ПРИЛОЖЕНИЕ, и стоял в подписи КАЖДОЙ дорожки: любая
   правка в редакторе (а разморозить дорожку затем и нужно, чтобы править) делала УСТАРЕВШИМИ все
   замороженные разом — они откатывались к событиям и выглядели размороженными. Это и была ошибка
   «разморозил одну — разморозились все»: реестр при этом никто не трогал.
   ⚠️ Правка ЧУЖОЙ дорожки той же роли правит ту же цепь (предел №1–2) — и подпись этого НЕ ловит. Тот же
   осознанный компромисс, что уже записан про чужие СОБЫТИЯ (см. шапку подписи выше). */
const laneEditVer=new Map();                 // id дорожки → число правок
const laneVerBump=id=>{ laneEditVer.set(id,(laneEditVer.get(id)||0)+1); };   // S6: версия правок ЛЮБОЙ дорожки по id — партнёр пары связки (ход 'lanetouch', удаление строки)
const laneEditVerOf=layer=>{ const id=laneOf(layer); return id==null ? 0 : (laneEditVer.get(id)||0); };   // S6: чтение для пробы
/* Слой вооружённой дорожки или null. ЧИСТОЕ чтение (его зовёт draw каждый кадр): обход таблицы дорожек —
   O(дорожек), не событий. id, не найденный в таблице, читается как «не вооружено». */
function laneLayerOf(id){ if(id==null) return null; for(const [ly,i] of laneId) if(i===id) return ly; return null; }
const armedLayer=()=>laneLayerOf(armLane);
/* Тап по строке дорожки вне гнёзд M/S: вооружить её / снять вооружение повторным тапом.
   ⛔ ВО ВРЕМЯ ЗАПИСИ НЕ МЕНЯЕТСЯ: пишущаяся дорожка уже выбрана, и метка «вооружена» на ДРУГОЙ строке в
   это время врала бы, куда идёт запись. `?? laneNew` — та же самопочинка, что у toggleLaneMute. */
function toggleArm(layer){
  if(W.recording()) return;
  const id=laneOf(layer) ?? laneNew(layer);
  armLane = armLane===id ? null : id;
}
/* ═══ УДАЛЕНИЕ ЛЮБОЙ ДОРОЖКИ С ЕЁ СТРОКИ (слайс S3.5d) ═══
   ⛔ УДАЛЕНИЕ НЕ ОТМЕНЯЕТСЯ. ⤺ снимает взятые, а удалённая дорожка не взятое: её события ушли из массива, и
   вернуть их неоткуда. Поэтому ВЕСЬ вес несёт ПОДТВЕРЖДЕНИЕ: первый тап по ✕ только ВЗВОДИТ (кнопка
   заливается красным, строка краснеет, заголовок пишет «ещё раз ✕ — удалить Ln»), второй тап по ТОМУ ЖЕ ✕
   в течение DEL_CONFIRM_MS удаляет. Любой другой тап по полосе или истёкшее окно — снимают взвод.
   Почему не модальный диалог: он отнимает руку у камеры, вытаскивает DOM поверх холста и требует
   нажать в ДРУГОМ месте экрана; второй тап в то же место с видимой сменой состояния — честный минимум.
   ⛔ Удаление НЕ ПРИВЯЗАНО К ВООРУЖЕНИЮ: красная рамка значит «куда запишу», и если бы она же значила
   «что удалю», однажды человек удалил бы дорожку, думая о записи. Два смысла — две цели. */
const DEL_CONFIRM_MS=3000;
function laneDelTap(layer){
  if(!W.audioOn() || W.isRecLayer(layer)){ delPend=null; return false; }   // T1: любой слой взятого (прежде — loop.layer)   // в пишущуюся дорожку push продолжает писать — удалить её посреди взятого значило бы тут же воскресить
  const id=laneOf(layer) ?? laneNew(layer), now=performance.now();
  if(delPend && delPend.id===id && now<delPend.until){ delPend=null; return W.deleteLane(layer); }
  delPend={id, until:now+DEL_CONFIRM_MS};
  return false;
}
function laneDelCancel(){ delPend=null; }
/* Слой, чьё удаление взведено, или null (окно истекло / дорожки больше нет). ЧИСТОЕ чтение — его зовёт draw. */
function laneDelPendingLayer(){ if(!delPend || performance.now()>=delPend.until) return null; return laneLayerOf(delPend.id); }
/* ⛳ ПРЕДИКАТ СЛЫШИМОСТИ — ОДИН НА ОБА ПУТИ ПЕРЕИГРОВКИ (scheduleLayers и fireNear).
   СОЛО ПЕРЕБИВАЕТ ЗАГЛУШЕНИЕ: как только соло включено хоть где-то, слышны РОВНО соло-дорожки, а
   остальные молчат независимо от своих галочек mute (и возвращаются как были, когда соло снимут). */
/* Зовётся из планировщика (40 раз в секунду на каждое событие) и из draw — поэтому важно, что laneOf
   ЧИСТЫЙ: ни одной записи в таблицу на горячем пути. Нет id → дорожка обычная, слышимая. */
const laneAudible=layer=>{ const id=laneOf(layer);
  return laneSolo.size ? (id!=null&&laneSolo.has(id)) : !(id!=null&&laneMute.has(id)); };
/* ⛳ ГЕЙТ ЦЕЛИКОМ ВЫКЛЮЧЕН, ПОКА НИЧЕГО НЕ ЗАГЛУШЕНО И НИЧЕГО НЕ В СОЛО — и это НЕ микро-оптимизация,
   а УСЛОВИЕ ПРИЁМКИ слайса: пока человек не тронул переключатели, пер-событийная проверка не
   выполняется ВООБЩЕ (в цикле остаётся один уже вычисленный булев), и переигровка идёт байт-в-байт
   как раньше. Считается ОДИН РАЗ НА ВЫЗОВ планировщика, а не на событие. */
const laneGated=()=> laneMute.size>0 || laneSolo.size>0;
const laneLevelOf=layer=>{ const id=laneOf(layer); return (id!=null && laneLevel.has(id)) ? laneLevel.get(id) : 1; };
const laneGainOf=layer=>volAmp(laneLevelOf(layer));
/* Слой из КЛЮЧА ВЛАДЕЛЬЦА голоса переигровки ('leadloop:N:v', 'loop:N[:k]', 'bassloop:N…') или удара/дрона ('hit:N', 'drone:N'); живые ключи
   ('lead:L', 'latch', 'bass…') — null. Тот же хвост «N» или «N:…», что у releaseLoopLayersAt. */
function layerOfOwner(k){ const m=/^(?:leadloop|loop|bassloop|hit|drone):(\d+)(?::|$)/.exec(k||''); return m ? +m[1] : null; }
const lanePanOf=layer=>{ const id=laneOf(layer); return (id!=null && lanePan.has(id)) ? lanePan.get(id) : 0; };
/* ⛳ AR2: ИМЯ ДОРОЖКИ. laneNameOf — имя, данное человеком, или null (тогда показ берёт «роль · тембр»). setLaneName — пробелы сжаты, края
   обрезаны, не длиннее LANE_NAME_MAX; пустая строка — назад к имени по умолчанию. Не правка песни: истории нет (одна история — ED7). */
const laneNameOf=layer=>{ const id=laneOf(layer); return (id!=null && laneName.has(id)) ? laneName.get(id) : null; };
function setLaneName(layer,s){
  if(layer==null) return false;
  const id=laneOf(layer) ?? laneNew(layer), x=String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,LANE_NAME_MAX);
  if(!x) laneName.delete(id); else laneName.set(id,x);
  return true;
}
/* ⛳ AR2: ПОРЯДОК ПОКАЗА. laneSort — копия списка слоёв в порядке показа (место из laneRank; без места — после всех, по номеру слоя).
   laneOrder — ВСЕ дорожки песни в этом порядке; во время записи в конец — ещё пустые слои взятого (их строку полоса показывает с ●). ОДИН
   источник для окна, микшера, полосы игры и круга чипа редактора. moveLane — поставить дорожку на место `to` (0…n−1) этого же списка и
   записать места ВСЕМ дорожкам (так всё, что родится позже, без места, встаёт в конец). Отказ во время записи (окно, где двигают, тогда
   закрыто). Не правка песни: истории нет (ED7). */
function laneSort(layers){
  const rk=new Map(); for(const ly of layers){ const id=laneOf(ly); rk.set(ly, (id!=null && laneRank.has(id)) ? laneRank.get(id) : Infinity); }
  return layers.slice().sort((a,b)=>{ const x=rk.get(a), y=rk.get(b); return x===y ? a-b : (x<y ? -1 : 1); });
}
function laneOrder(){
  const s=new Set(); for(const e of events) s.add(e.layer);
  const L=laneSort([...s]);
  if(W.recording()) for(const ly of W.recLayers()) if(!s.has(ly)) L.push(ly);
  return L;
}
function moveLane(layer,to){
  if(W.recording() || layer==null) return false;
  const L=laneOrder(), from=L.indexOf(layer); if(from<0) return false;
  const k=Math.max(0, Math.min(L.length-1, Math.round(+to)||0));
  L.splice(from,1); L.splice(k,0,layer);
  L.forEach((ly,i)=>laneRank.set(laneOf(ly) ?? laneNew(ly), i));   // ?? laneNew — та же самопочинка, что у переключателей
  return k!==from;
}
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkTrackLook): снимок таблиц имён и мест показа и его возврат. Проба переименовывает и переставляет дорожки и
   обязана вернуть РОВНО как было: песня без мест до пробы — снова без мест (а не «те же места, записанные всем»). */
function laneShowKeep(){ const N=new Map(laneName), R=new Map(laneRank);
  return ()=>{ laneName.clear(); for(const [k,v] of N) laneName.set(k,v); laneRank.clear(); for(const [k,v] of R) laneRank.set(k,v); }; }
/* ⛳ AR2: РОЛЬ И ТЕМБР КАЖДОЙ ДОРОЖКИ ОДНИМ ПРОХОДОМ — для показа (цвет роли, имя по умолчанию). draw спрашивает каждый кадр на каждую
   видимую строку; laneRoleOf/laneTimbreOf — проход по событиям на вызов. Ответы ТЕ ЖЕ (первое событие с ролью; первое начало ноты с
   тембром), мемо — по числу событий и поколению состава (evGen поднимает каждый schedInvalidate — замена тембра тоже: editCommit). Во время
   записи растёт число событий — мемо перестраивается. drone — у дорожки есть слой дрона (у такой роли нет). */
let laneLookMemo={ key:null, map:null };
function laneLook(layer){
  const k=events.length+'|'+evGen;
  if(laneLookMemo.key!==k){ const m=new Map();
    for(const e of events){ let x=m.get(e.layer); if(!x){ x={ role:null, tim:null, drone:false }; m.set(e.layer,x); }
      if(x.role==null){ const r=evRole(e.fn); if(r) x.role=r; }
      if(x.tim==null && isNoteStart(e.fn) && e.a){ const v= e.fn==='drum' ? e.a.kit : e.a.inst; if(v!=null) x.tim=v; }
      if(e.fn==='drone') x.drone=true; }
    laneLookMemo={ key:k, map:m }; }
  return laneLookMemo.map.get(layer)||null;
}
/* ЧИТАТЕЛИ ДЛЯ ПОКАЗА — через тот же чистый laneOf (их зовёт draw на каждый кадр; правило #5 с
   обратной стороны: рисование не смеет менять состояние). */
const laneMuted =layer=>{ const id=laneOf(layer); return id!=null&&laneMute.has(id); };
const laneSoloed=layer=>{ const id=laneOf(layer); return id!=null&&laneSolo.has(id); };
const laneSoloOn=()=> laneSolo.size>0;
/* ED7: one track's table row — the history's snapshot steps keep and restore it */
const laneRow=id=>({ mute:laneMute.has(id), solo:laneSolo.has(id), level:laneLevel.get(id), pan:lanePan.get(id), name:laneName.get(id),
                     rank:laneRank.get(id), len:laneLen.get(id), ver:laneEditVer.get(id) });
function laneRowSet(id,r){
  if(r.mute) laneMute.add(id); else laneMute.delete(id);
  if(r.solo) laneSolo.add(id); else laneSolo.delete(id);
  for(const [M,v] of [[laneLevel,r.level],[lanePan,r.pan],[laneName,r.name],[laneRank,r.rank],[laneLen,r.len],[laneEditVer,r.ver]]) if(v==null) M.delete(id); else M.set(id,v);
}

export { laneWire, laneId, laneMute, laneSolo, laneLevel, lanePan, laneName, laneRank, laneLen, laneLenOf, laneEditVer, laneVerBump, laneEditVerOf,
  laneNew, laneOf, laneForget, laneTablesClear, laneLayerOf, armedLayer, toggleArm, laneDelTap, laneDelCancel, laneDelPendingLayer,
  laneAudible, laneGated, laneLevelOf, laneGainOf, layerOfOwner, lanePanOf, laneNameOf, setLaneName, laneOrder,
  moveLane, laneShowKeep, laneLook, laneMuted, laneSoloed, laneSoloOn, laneRow, laneRowSet };
