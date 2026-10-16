/* REC5 (stage 3) — THE BACKING: loading an arrangement or a jam as backing tracks (one event funnel backingEvent, each layer its own take,
   one history step), and clearing it — moved from recorder.js (which re-exports them — a facade). The snapshot step, the capture
   snapshot, the drone, lane pruning, the soft stop and the song clear come once through backingWire. Moved verbatim. */
import { AC, droneOff } from '../audio.js';
import { buildArrangement } from '../arrange.js';
import { bassIdx, chIdx, drumKitIdx, seventh } from '../state.js';
import { cycling, loop, setRegionOn } from '../transport/clock.js';
import { nextFreeLayer, recAllOff, recording, storeTi } from './record.js';
import { laneLen, laneNew } from '../song/lanes.js';
import { takeNext } from '../song/capture.js';
import { compactEvents, events, schedInvalidate } from '../song/store.js';
import { hooks } from '../hooks.js';
import { startTransport } from '../transport/scheduler.js';
import { CUR } from '../scales.js';
/* REC5: what the backing needs from the recorder, wired once (backingWire) */
const W={ snapBegin:()=>null, snapEnd:()=>false, capStart:()=>{}, droneSync:()=>{}, lanePrune:()=>{}, softAllOff:()=>{}, droneActive:()=>false, clearRec:()=>{} };
const backingWire=o=>{ Object.assign(W,o); };
const snapBegin=(...a)=>W.snapBegin(...a), snapEnd=(...a)=>W.snapEnd(...a), takeCapStart=(...a)=>W.capStart(...a), droneSync=(...a)=>W.droneSync(...a),
  lanePrune=()=>W.lanePrune(), softAllOff=()=>W.softAllOff(), droneActive=()=>W.droneActive(), clearRec=()=>W.clearRec();

/* Загрузить аранжировку (гармония+бас+ритм) как ОТДЕЛЬНЫЕ слои, замороженные в текущем
   ладу/септаккорде (§3.4). Слои снимаются undo сверху (сначала ритм).
   ⛳ S3.3 СНЯЛ ОТСЮДА ПРОВЕРКУ ДЛИНЫ. Было: на пустой петле длина петли БРАЛАСЬ у прогрессии
   (`loop.bars=arr.bars`), а на непустой аранжировка ОТВЕРГАЛАСЬ, если её длина не совпала с длиной
   петли. Оба правила существовали лишь потому, что у петли была ОДНА длина на всех и заворот обязан
   был приходиться на общую границу. У линейной песни общей длины нет — подложке не с чем совпадать,
   поэтому она просто КЛАДЁТСЯ и играет столько, сколько в ней тактов.
   ⚠️ Подложка ложится ОТ НАЧАЛА ПЕСНИ (t событий приходят из buildArrangement уже от нуля). Класть её
   от плейхеда — осмысленное желание, но это ВЫБОР МЕСТА, а не следствие линейного времени: отдельная
   работа вместе с таймлайном редактора (см. отчёт слайса). */
function loadArrangement(sel, jam=false){
  if(!AC)return false;
  const tok=snapBegin('backing'); try{ return loadArrangementDo(sel, jam); } finally { snapEnd(tok); }   // ED7: a backing load is one step
}
function loadArrangementDo(sel, jam){
  /* drumKitIdx передаём ЯВНО: без него buildArrangement брал дефолт 0 и слои аранжировки всегда играли
     «Стандартом», какой бы кит ни был выбран — паттерны, писанные В РОЛЯХ ради кит-независимости, звучали
     одним китом. bars — ДЛИНА ПОДЛОЖКИ в тактах (loop.bars сменил смысл в S3.3): её берёт путь «только
     ударные», которому длину взять больше неоткуда. */
  const arr=buildArrangement(sel, {chIdx, bassIdx, drumKitIdx, metre:loop.metre, bars:loop.bars});
  if(!arr||!arr.layers.length)return false;
  const base=nextFreeLayer();   // T2: не maxLayer()+1 — посреди записи он не видит ещё пустых дорожек взятого (см. nextFreeLayer)
  /* ⛳ МЕСТО РОЖДЕНИЯ СЛОЯ №3 (и последнее): каждый слой аранжировки/подложки. Номер тем более мог
     быть занят — снятая подложка освобождает свои номера, а следующая берёт их же. */
  arr.layers.forEach((evs,li)=>{ const layer=base+li; laneLen.set(laneNew(layer), arr.bars*loop.metre); const tk=takeNext();   // длина материала слоя — все такты подложки (см. laneLen)   // S3.5d: каждый слой подложки — своё взятое → ⤺ снимает их по одному, сначала ритм (как прежде)
    takeCapStart(tk);   // O-2: у слоя подложки тоже своё взятое — значит и свой снимок цепей. Дорожки автоматизации у него не будет (его никто не играл руками), и это верно: у него нет движения, только настройки
    for(const e of evs) events.push(backingEvent(e, layer, tk, jam)); });
  events.sort((x,y)=>x.t-y.t);
  schedInvalidate();                                   // добавили слои и пересортировали → курсоры недействительны (startTransport ниже сбросит ещё раз, если транспорт стоял — это дёшево и безвредно)
  /* ⛳ ПОДЛОЖКА КРУТИТСЯ САМА — КАК ДО S3.3 (починка при слайсе «дрон и центы»). До S3.3 подложка на пустой петле задавала длину петли
     (loop.bars=arr.bars), а петля заворачивала всегда — любая подложка играла по кругу без касаний. S3.3 убрал заворот, и с тех пор
     подложка проигрывалась ОДИН раз и вставала (дрон — сразу: его длина была 0). Возвращаем ровно это поведение средствами линейной
     песни: включаем ПОВТОР (⟳); скоба, следующая за материалом, на пустой песне равна тактам подложки (laneLen) — длина прежней петли.
     Скобу, поставленную человеком, не трогаем; ⟳ уже включён — тоже. ⛔ Во время записи — НЕ включаем: повтор поменял бы смысл
     записываемого (свёртка в скобу), а такого решения человек не принимал. */
  if(!recording && !cycling()){ setRegionOn(true); hooks.loop && hooks.loop(loop.on); }   // hooks.loop — ui обновит кнопку ⟳ (и при уже идущем транспорте, где startTransport ниже не зовётся)
  if(!loop.on)startTransport(false,0);                 // подложка лежит от начала песни — и играть её начинаем оттуда же
  droneSync();                                         // AR2 (хвост MX2): уровень × уровень ДОРОЖКИ и её панорама — прежний droneOn() брал 0.18 и оставлял панораму прежней (у новой подложки — чужой, после смены панорамы на паузе — устаревшей). Включаем дрон сразу; ⚠️ именно AUDIBLE, а не ACTIVE: заглушённая дорожка дрона не должна зазвучать от добавления соседних слоёв
  if(jam) hooks.tutor && hooks.tutor('loop',{ev:'jam'});   // ЗАЦЕПКА ОБУЧЕНИЯ: джем реально встал (слои добавлены) — урок «Лупер»; только для джема, не для ручной аранжировки
  if(hooks.af) hooks.af('backing');                    // AF3: a backing loaded or swapped is a settle trigger
  return true;                                         // добавили (джем-контроллер по этому знает, что вариант встал)
}
/* Джем — та же аранжировка-shortcut, но её слои ПОМЕЧЕНЫ (e.jam). loadJam кладёт помеченные,
   clearJam снимает РОВНО их. Записи игрока (push никогда не ставит jam) неуязвимы по построению. */
const loadJam=sel=>loadArrangement(sel, true);
/* ⛳ ВОРОНКА ПОДЛОЖКИ — ОДНО СОБЫТИЕ (вынесено из loadArrangement, чтобы проба P.checkWrite кормила ту же функцию, что и приложение).
   Вид и септаккорд — живые (подложка ложится в текущем ладу), ступень → индекс в строе вида (storeTi), ступень не хранится (T4c-2);
   прочие поля нагрузки — как их дал arrange.js. jam — МЕТКА СЛОЯ ДЖЕМА: живёт В САМОМ событии → снять ровно джем, не тронув записи игрока. */
function backingEvent(e, layer, tk, jam){
  const ev={t:e.t, layer, fn:e.fn, a:e.a, sc:CUR(), sev:seventh, tk};
  ev.a=storeTi(ev.fn,ev.a,ev.sc);
  if(jam) ev.jam=true;
  return ev;
}
function clearJam(){
  if(!events.length)return;
  const tok=snapBegin('backing'); try{ clearJamDo(); } finally { snapEnd(tok); }   // ED7: removing a backing is one step (a switch = remove + load, folded when nested)
}
function clearJamDo(){
  const removed=compactEvents(e=>e.jam);               // ОДИН проход вместо splice-в-цикле (см. compactEvents)
  if(!removed)return;
  /* S3.5d-fix: при записи — ЗАКРЫТЬ удержанное ДО softAllOff: тот обнуляет состояние записи БЕЗ концов, и ноты взятого
     остались бы с «вкл» без «выкл». Рука, что держит, переатакует со следующего кадра новой нотой. Сортировка — чтобы
     schedInvalidate не объявил несортированный хвост телом (та же причина, что в undo/удалении). */
  if(recording){ recAllOff(); events.sort((x,y)=>x.t-y.t); }
  schedInvalidate();                                   // состав событий изменился → курсоры недействительны
  lanePrune();                                         // у слоёв подложки больше нет событий → снимаем их настройки, чтобы не всплыли на следующем джеме с теми же номерами
  softAllOff(); if(!droneActive())droneOff();          // бухгалтерия как в onUndo: гасим зависшее, ушёл слой-дрон → гасим дрон
  if(!events.length)clearRec(); else hooks.loop&&hooks.loop(loop.on);   // пусто → полный сброс; остались записи игрока → петля играет дальше
  if(hooks.af) hooks.af('backing');                    // AF3
}

export { backingWire, loadArrangement, loadJam, backingEvent, clearJam };
