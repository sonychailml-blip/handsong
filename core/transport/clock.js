/* REC4 (stage 3) — THE TRANSPORT CLOCK: the transport state `loop` (tempo, metre, t0, playhead, the brace `rgn`), the song length, the
   brace math (songAt, rgnReps, braceClamp, rgnApply …), the metre map (beatLevel), the transport setters and the playhead readout —
   moved from recorder.js (which re-exports them — a facade). What a brace jump needs from the scheduler and the freeze registry
   (release, cancel pending swaps, chase) and «recording» come once through clockWire. Moved verbatim; edited lines are marked REC4. */
import { BEATS_PER_BAR } from '../config.js';
import { events, schedInvalidate } from '../song/store.js';
import { laneId, laneLen } from '../song/lanes.js';
import { AC } from '../audio.js';
/* REC4: what the clock needs from the recorder, wired once (clockWire) */
const W={ recording:()=>false, release:()=>{}, swapCancelAll:()=>{}, chasePlay:()=>{} };
const clockWire=o=>{ Object.assign(W,o); };
const releaseLoopLayersAt=(...a)=>W.release(...a), frzSwapCancelAll=()=>W.swapCancelAll(), chasePlay=(...a)=>W.chasePlay(...a);

/* ⚠️ `bars` СМЕНИЛ СМЫСЛ (S3.3): это больше НЕ длина петли (длины у песни нет — см. songBeats),
   а ДЛИНА ПОДЛОЖКИ в тактах: сколько тактов занимает добавляемая аранжировка/«только ударные».
   ⛔ `first` УДАЛЁН вместе с авто-закрытием первого круга. */
/* ⛳ ОБЛАСТЬ ПОВТОРА (слайс S3.4) — `rgn:{on,from,to}`, ОДНО поле на существующем состоянии транспорта,
   без новых сущностей и модулей. Полярность обратная прежней петле: ЛИНЕЙНОЕ воспроизведение —
   умолчание, а повтор — ПОМЕЧЕННЫЙ участок. rgn.on=false → всё ровно как оставил S3.3.
   ⚠️ ДВА РОДА ДОЛЕЙ, И ИХ НЕЛЬЗЯ ПУТАТЬ (это и есть устройство, которое было у петли):
     МОНОТОННАЯ доля m = (now−t0)·bpm/60 — время, прошедшее с запуска транспорта; растёт ВСЕГДА;
     ПЕСЕННАЯ доля p = songAt(m) — где мы в МАТЕРИАЛЕ; при включённой области сворачивается в неё.
   t0 НЕ ДВИГАЕТСЯ на завороте (в отличие от перемотки): планировщик уходит вперёд на SCHED_AHEAD и
   обязан уметь расписать события ЗА границей, а он делает это проекцией монотонной доли, для которой
   нужна неподвижная опора. Двинь t0 — и окно опережения поехало бы под ним. */
const loop={ on:false, bars:2, metre:BEATS_PER_BAR, sub:4, bpm:84, t0:0, pos:-1e-9, sched:0, layer:0, clickBeat:0, quant:true, rgn:{on:false,from:0,to:0,user:false}, lead:0, cnt:false };   // rgn.user — скобу ПОСТАВИЛ человек (иначе следует за материалом, S3.5b); lead — МОНОТОННАЯ доля, с которой транспорт реально играет (до неё — отсчёт/разгон: ни звука лида, ни записи); cnt — был ли при запуске отсчёт (для щелчков и надписи)   // metre — долей в такте; sub — ДРОБЛЕНИЕ доли для квантизации ударных (4 = 16-е, 3 = триоли); pos — сыгранная ПЕСЕННАЯ доля (лид/дрон, почти-сейчас); sched — МОНОТОННАЯ доля, до которой СЛОИ (аккорд/бас/удар) уже запланированы вперёд; t0 — время AC для монотонной доли 0
/* ⛳ ДЛИНА ПЕСНИ — ВЫВОДИМАЯ, а не заданная: это позиция последнего события. Раньше длину задавал
   человек (loop.bars, 1..8), потому что от неё зависел заворот; заворота нет, и задавать нечего —
   песня ровно такая, сколько в неё записали.
   ⚠️ КЭШИРУЕМ: насос спрашивает её каждый тик, а обход всех событий на тике — ровно та цена, которую
   снял слайс S3.2. Значение поддерживается в ДВУХ местах и только в них: push двигает максимум вверх
   по одному событию, а schedInvalidate (единственная точка сброса курсоров — её и так зовёт КАЖДЫЙ
   путь, меняющий состав событий) пересчитывает целиком. */
/* REC4 ⛳ BEAT ↔ TIME — every conversion of the transport goes through these (one tempo segment today; a tempo map answers here later).
   Each keeps the exact arithmetic of the sites it replaced, so every number is the same to the last bit. */
const secPerBeat=()=>60/loop.bpm;                              // seconds per beat
const beatNow=()=>(AC.currentTime-loop.t0)*loop.bpm/60;        // the MONOTONIC beat now (m)
const timeAt=b=>loop.t0+b*(60/loop.bpm);                       // context time of monotonic beat b
const secOf=b=>b*60/loop.bpm, beatsOf=s=>s*loop.bpm/60;        // a length: beats → seconds, seconds → beats
let songLen=0;
const songBeats=()=>songLen;
const songLenGrow=t=>{ if(t>songLen){ songLen=t; braceFollowGrow(); } };   // REC4: push grows the length by one event (a full recount is songLenRecalc)
function songLenRecalc(){ let m=0; const ly=new Set();
  for(const e of events){ if(e.t>m) m=e.t; ly.add(e.layer); }
  for(const l of ly){ const L=laneLen.get(laneId.get(l)); if(L>m) m=L; }   // слой подложки длится ВСЕ свои такты (laneLen), а не до последнего события
  songLen=m; }
/* ⛔ Помощника «длина подложки в долях» здесь НЕТ намеренно: loadArrangement передаёт в
   buildArrangement именно ТАКТЫ (loop.bars), доли считает уже он сам, и второй счёт того же завёл бы
   два источника одной величины. */

/* ═══ ОБЛАСТЬ ПОВТОРА: МОНОТОННАЯ ДОЛЯ → ПЕСЕННАЯ (слайс S3.4) ═══
   ⛳ ЭТО ВОСКРЕШЕНИЕ, А НЕ ИЗОБРЕТЕНИЕ. У петли ровно эту работу делал `% loopBeats`, просто область
   была прибита к [0, длина петли). Здесь та же свёртка, переанкеренная на [from, to).
   rgnReps(m) — сколько ПОЛНЫХ проходов области уже сделано к монотонной доле m. Ноль, пока не дошли до
   её конца (значит и ДО начала области, и ВНУТРИ первого прохода счёт нулевой — воспроизведение туда
   просто въезжает линейно, см. отчёт по пункту 2). */
const rgnLen=()=>loop.rgn.to-loop.rgn.from;
const cycling=()=>loop.rgn.on && rgnLen()>1e-9;
const rgnReps=m=>{ const R=loop.rgn, L=R.to-R.from; return m<R.to ? 0 : Math.floor((m-R.from)/L); };
/* Монотонная доля → доля ПЕСНИ. Без области — тождество (и это гарантия, что при rgn.on=false всё
   идёт ровно как в S3.3: ни одного лишнего вычисления в пути). */
const songAt=m=>{ if(!cycling()) return m; return m-rgnReps(m)*rgnLen(); };
/* ═══ СКОБА ПОВТОРА (слайс S3.5b) — ОДИН орган на ДВЕ работы, как loop brace в DAW ═══
   ГРАНИЦЫ скобы — ЧТО повторяется (когда ⟳ включён); НАЧАЛО скобы — ОТКУДА начинается запись.
   ⛔ Отдельной «линейки точки записи» нет и не заводить: это решение, а не упрощение.
   Кнопка ⟳ теперь ТОЛЬКО включает/выключает повтор скобы и границ НЕ переопределяет (прежде она на
   каждом включении помечала всю песню заново).
   ⛳ ДВА СОСТОЯНИЯ (rgn.user):
     false — СКОБА СЛЕДУЕТ ЗА МАТЕРИАЛОМ: [0, конец материала вверх до такта]. Так её видит нетронутая
             песня, и так она растёт при записи.
     true  — человек её ПОСТАВИЛ: стоит, где поставили; запись за её конец её НЕ двигает. Трогает её лишь
             одно — песня стала КОРОЧЕ её конца (отмена, снятие подложки): поджимаем к концу материала,
             чтобы скоба не указывала в пустоту. ✕ (clearRec) возвращает в «следует».
   ⛳ КВАНТ — ТАКТ, И ЭТО НЕ НЕДОДЕЛКА. На полосе в ~300px такт пятиминутной песни — пара пикселей: любая
     точность мельче такта была бы ЛОЖЬЮ о том, куда попал палец. ⛔ Не «улучшать» до долей без зума
     таймлайна. Побочная выгода — несущая: длина скобы кратна размеру, поэтому монотонная доля и песенная
     различаются на ЦЕЛОЕ число тактов — акценты метронома при повторе не съезжают, а перепривязка
     опоры (rgnApply) точна без округлений.
   ⛳ МИНИМУМ — ОДИН ТАКТ. Нулевая скоба не повторяет ничего (cycling() и так не считал её повтором) и
     на экране неотличима от отсутствия; повтор ОДНОГО такта — законная музыка (такт барабанов, остинато).
     Поэтому ноль запрещён клампом, такт разрешён. */
const braceCapBars=()=>Math.max(1,Math.ceil(songLen/loop.metre-1e-9));   // тактов материала (не меньше одного); −1e-9 — чтобы 8.0000000001 долей не дали лишний пустой такт
function braceClamp(from,to){                // ЕДИНЫЙ кламп границ: [0, конец материала], длина ≥ такт
  const M=loop.metre, cap=braceCapBars()*M;
  to=Math.min(to,cap); from=Math.max(0,Math.min(from,to-M)); to=Math.max(to,from+M);
  return [from,to];
}
/* ⛳ ЕДИНСТВЕННЫЙ ПИСАТЕЛЬ ГРАНИЦ И ВКЛЮЧЕНИЯ rgn (как laneNew у дорожек). Одно исключение — рост
   «следующей» скобы в push (braceFollowGrow), и оно безопасно ровно потому, что там повтор выключен.
   ⚠️ ГЛАВНАЯ РАБОТА — ПЕРЕПРИВЯЗКА ОПОРЫ, если транспорт идёт. Песенная доля — это songAt(m) по
   ГРАНИЦАМ; смени границы при неподвижной t0 — и песенная доля ПРЫГНЕТ. Именно так было до этого
   слайса: выключи ⟳ после нескольких проходов — m уже далеко за концом песни, songAt стал тождеством,
   и транспорт тут же вставал «в конце». Теперь: берём песенную долю p по СТАРОЙ карте, пишем границы и
   сдвигаем опору (t0, sched, lead, clickBeat) на целое число тактов так, чтобы по НОВОЙ карте сейчас было
   ровно p. Звук не рвётся, уже запланированное не дублируется, щелчки не съезжают.
   ⚠️ ИСКЛЮЧЕНИЕ — БЕГУНОК ОКАЗАЛСЯ ЗА КОНЦОМ ВКЛЮЧЁННОЙ СКОБЫ (край подвинули левее него): прыгаем на её
   НАЧАЛО — ровно то, что сделал бы шов. Это перемотка, и цена у неё та же, что у seekTo: голоса дорожек
   гасим, а удары/щелчки, уже поставленные в окно SCHED_AHEAD (~300мс), доиграют.
   Бегунок ПЕРЕД началом скобы остаётся где был и въезжает в неё линейно — решение S3.4 (rgnReps=0 до
   первого достижения конца), здесь не пересматривается. */
function rgnApply(from,to,on){
  const R=loop.rgn;
  if(from===R.from && to===R.to && on===R.on) return;
  const live=!!AC && loop.on;
  const m=live ? beatNow() : 0;
  const p=live ? songAt(m) : 0;                              // песенная доля по СТАРОЙ карте
  R.from=from; R.to=to; R.on=on;
  if(!live || m<loop.lead) return;                           // стоим или идёт отсчёт — опору заново поставит запуск/сама не сдвинется
  const spb=secPerBeat(), d=m-p, past=cycling() && p>=R.to-1e-9;
  if(past || Math.abs(d-Math.round(d))>1e-6){                // вторая ветка — страховка: при потактовых границах d всегда целое
    const tgt=past ? R.from : p;
    releaseLoopLayersAt();
    frzSwapCancelAll();                                      // AF2: подмены, ещё не начатые, стояли по старой карте времени — отменить (спланируются заново)
    loop.t0=AC.currentTime+0.06-tgt*spb; loop.lead=tgt; loop.cnt=false;
    loop.pos=tgt-1e-9; loop.sched=tgt; loop.clickBeat=Math.floor(tgt);
    if(tgt>1e-9){ const T=timeAt(tgt); chasePlay(tgt,T,false); chasePlay(tgt,T,true); }   // S3.5c: прыжок — тоже вход не с начала (см. chaseFor). chaseAt здесь может быть от старых границ — ключ кэша ДОЛЯ, не границы, поэтому он верен
    return;
  }
  const k=Math.round(d);
  if(k){ loop.t0+=k*spb; loop.sched-=k; loop.lead-=k; loop.clickBeat-=k; }   // монотонные величины — на k долей назад; loop.pos (ПЕСЕННАЯ) не трогаем: она и есть то, что сохраняем
}
/* Привести границы к материалу: «следующая» — пересчитать, «поставленная» — только поджать. Зовётся из
   schedInvalidate — единственной точки, через которую проходит КАЖДОЕ изменение состава событий
   (отмена, подложка, очистка, остановка записи), поэтому второго списка мест не заводим. */
function rgnSync(){
  const R=loop.rgn;
  const [from,to]= R.user ? braceClamp(R.from,R.to) : braceClamp(0, braceCapBars()*loop.metre);
  rgnApply(from,to,R.on);
}
/* Рост «следующей» скобы по одному событию — O(1), из push. ⚠️ ПРЯМАЯ запись мимо rgnApply, и она
   безопасна ТОЛЬКО при выключенном повторе: тогда границы не входят во временнýю карту вовсе. При
   включённом повторе расти и нечему — push сворачивает время внутрь скобы. Полный пересчёт — rgnSync. */
function braceFollowGrow(){
  const R=loop.rgn; if(R.user || cycling()) return;
  const to=braceCapBars()*loop.metre; if(to>R.to) R.to=to;
}
const regionOn=()=>loop.rgn.on;
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkSwap): поставить скобу ровно {from, to, on, user} (через rgnApply — единственный писатель) и вернуть прежнюю. */
function braceProbe(k){ const prev={...loop.rgn}; if(k){ loop.rgn.user=!!k.user; rgnApply(k.from,k.to,!!k.on); } return prev; }
/* ⟳ — ТОЛЬКО включить/выключить повтор скобы. Границы не трогает.
   ⚠️ СОРТИРОВКА ВО ВРЕМЯ ЗАПИСИ — несущая: schedInvalidate объявляет ВЕСЬ массив отсортированным
   префиксом (cursN=length), а дописанный хвост записи не отсортирован. Прежний setRegion звал
   schedInvalidate при записи БЕЗ сортировки — курсоры бинарным поиском шли по несортированному, и
   события других дорожек могли пропускаться. Сортировка на тапе стоит O(n log n) один раз. */
function setRegionOn(on){
  if(W.recording()) events.sort((x,y)=>x.t-y.t);
  rgnSync();
  rgnApply(loop.rgn.from, loop.rgn.to, !!on);
  schedInvalidate();
}
/* ⛳ ТАП ПО ПОЛОСЕ СКОБЫ: доля → БЛИЖАЙШАЯ ЛИНИЯ ТАКТА; туда едет БЛИЖНИЙ к ней край. Равное расстояние
   (скоба в два такта, тап по средней линии) решает сторона тапа от середины скобы — иначе скобу в два
   такта нельзя было бы сузить до одного ни одним тапом. Возвращает, какой край взят ('from'/'to'), —
   ui держит его при перетаскивании, чтобы край не «перескакивал» на соседний.
   ⛔ ВО ВРЕМЯ ЗАПИСИ ПРАВКА ЗАПРЕЩЕНА (как и перемотка): сдвиг времени под открытыми нотами. */
function braceTap(beat){
  if(!AC||W.recording()) return null;
  rgnSync();
  const R=loop.rgn, M=loop.metre, line=Math.max(0,Math.round(beat/M))*M;
  const d1=Math.abs(line-R.from), d2=Math.abs(line-R.to);
  const edge= d1<d2 ? 'from' : d2<d1 ? 'to' : (beat<(R.from+R.to)/2 ? 'from' : 'to');
  braceMove(edge,beat);
  return edge;
}
/* Поставить край edge на ближайшую к beat линию такта. Первое касание переводит скобу в «поставлена». */
function braceMove(edge,beat){
  if(!AC||W.recording()) return;
  const R=loop.rgn, M=loop.metre, line=Math.max(0,Math.round(beat/M))*M;
  let from=R.from, to=R.to;
  if(edge==='from') from=Math.min(line,to-M); else to=Math.max(line,from+M);
  [from,to]=braceClamp(from,to);
  if(R.user && from===R.from && to===R.to) return;         // перетаскивание внутри того же такта: ничего не трогаем (и не перепривязываем каждый кадр)
  R.user=true;
  rgnApply(from,to,R.on); schedInvalidate();
}
/* ED6: put BOTH brace edges on bar lines at once (a tapped section: the brace covers it); the brace becomes the person's. */
function braceSet(from,to){
  if(!AC||W.recording()) return false;
  const M=loop.metre, [f,t]=braceClamp(Math.round(from/M)*M, Math.round(to/M)*M);
  loop.rgn.user=true; rgnApply(f,t,loop.rgn.on); schedInvalidate(); return true;
}
/* ГРУППИРОВКА (акценты) по размеру — СТАТИЧНАЯ, по умолчанию. Массив длин групп, сумма = размер.
   Нечётные размеры чувствуются НЕ ровно: балканская 7 = 3+2+2, 9 = 2+2+2+3, 5 = 2+3; индийский
   тинтал (16) — 4 вибхага по 4. Пользовательский выбор 3+2+2 vs 2+2+3 отложен (BACKLOG §3.23) —
   один разумный вариант на размер. Дефолт нечислового/неизвестного — одна группа (акцент только сам).
   khali — индексы ГРУПП, что ОСЛАБЛЕНЫ (не акцент, а «пустая» голова, структурная черта тала). */
const METRE_GROUPS={ 2:[2],3:[3],4:[4],5:[2,3],6:[3,3],7:[3,2,2],8:[4,4],9:[2,2,2,3],10:[2,3,2,3],12:[3,3,3,3],16:[4,4,4,4] };
const METRE_KHALI ={ 16:[2] };   // тинтал: 3-й вибхаг (индекс 2 = доля 8) — khali (открытый баян, без баса)
/* Уровень акцента доли b∈[0,metre): 2 сам (начало такта), 1 голова группы, -1 khali-голова, 0 обычная. */
function beatLevel(metre,b){
  const g=METRE_GROUPS[metre]||[metre], kh=METRE_KHALI[metre]||[];
  let acc=0;
  for(let i=0;i<g.length;i++){ if(acc===b) return b===0?2:(kh.includes(i)?-1:1); acc+=g[i]; }
  return 0;   // не голова группы
}
/* Позиция для визуализации: фаза отсчёта / игры, ПЕСЕННАЯ доля, длина песни в долях.
   ⛳ ДВЕ ПОЗИЦИИ, И У КАЖДОГО ПОТРЕБИТЕЛЯ СВОЯ (слайс S3.5b — именно здесь их и перепутали):
     МОНОТОННАЯ m = (now−t0)·bpm/60 — это ЧАСЫ. Ею считают ТОЛЬКО арифметику времени: опору t0 (смена
       темпа, перепривязка области), окно опережения планировщика (loop.sched, горизонт), счёт проходов
       области (rgnReps), отсчёт перед записью (m<0), индекс щелчка метронома (clickBeat).
     ПЕСЕННАЯ p = songAt(m) — это МЕСТО В МАТЕРИАЛЕ. Ею пользуется ВСЁ, что указывает на события или на
       длину песни: запись (push/curBeat), переигровка лида (fireNear, loop.pos), точка возобновления,
       конец песни — и ВСЁ, ЧТО ВИДИТ ЧЕЛОВЕК: бегунок полосы и её ширина.
   ⚠️ БАГ, КОТОРЫЙ ЭТО ЧИНИТ: здесь отдавалась МОНОТОННАЯ доля. Без области они совпадают (songAt —
   тождество), поэтому S3.3 был прав; S3.4 развёл их — звук пошёл по песенной и зациклился, а полоса
   осталась на часах: бегунок уезжал за конец, а ширина (max(песня, pos, подложка)) росла вслед за ним
   и дорисовывала новые такты без конца. Правило простое: ПОКАЗЫВАЕМ МАТЕРИАЛ — значит ПЕСЕННАЯ. */
function loopPos(){
  if(!loop.on||!AC)return null;
  const e=beatNow();
  /* Отсчёт кончается на ДОЛЕ ЗАПУСКА loop.lead, а не на нуле (S3.5b, тот же довод, что в tick/push): запись
     со скобы с такта 3 отсчитывает доли 4..8 — они ≥0, и по старому `e<0` полоса показывала бы бегущий
     бегунок во втором такте вместо «ОТСЧЁТ». При старте с 0 (lead=0) — прежнее `e<0` дословно. Разгон
     без отсчёта (60мс после ▶) показывает бегунок на точке запуска, а не мигает «ОТСЧЁТ 1». */
  if(e<loop.lead && loop.cnt) return {phase:'count', countLeft:Math.ceil(loop.lead-e), pos:0, total:songLen};
  return {phase:'play', pos:songAt(Math.max(e,loop.lead)), total:songLen};   // songAt: при выключенной области тождество → байт-в-байт прежнее
}
/* ⛳ КОНТРОЛ «ТАКТЫ» ПЕРЕЖИЛ СМЕНУ МОДЕЛИ, НО СМЕНИЛ РАБОТУ (S3.3, решение по пункту 8).
   Он задавал ДЛИНУ ПЕТЛИ — величину, которой больше не существует: длина песни выводится из материала
   (songLen). Убрать контрол было можно, но тогда у пути «🎵 только ударные» не осталось бы ИСТОЧНИКА
   ДЛИНЫ: там нет прогрессии, и сколько тактов класть, знать неоткуда (см. buildArrangement).
   Поэтому он стал «ДЛИНА ПОДЛОЖКИ» — сколько тактов занимает ДОБАВЛЯЕМАЯ аранжировка. Это настоящая
   работа, видимая сразу: поставил 4 — следующая подложка легла на 4 такта.
   ⛔ И ПОЭТОМУ ЖЕ СНЯТА БЛОКИРОВКА «только на пустой петле»: она защищала времена уже записанных
   событий от переосмысления длиной петли. Длина подложки ничего записанного не трогает — она влияет
   ТОЛЬКО на следующую подложку, значит менять её можно когда угодно.
   ⚠️ Потолок 8 оставлен как есть: это не остаток петли, а разумный предел длины подложки. */
function setLoopBars(n){
  loop.bars=Math.max(1,Math.min(8,n));
}
const METRES=[2,3,4,5,6,7,8,9,10,12,16];               // допустимые размеры (долей в такте) — см. UI
/* Размер такта меняется ТОЛЬКО на пустой песне, и это ОСТАЛОСЬ. Причина у него СВОЯ, не та, что была у
   длины: размер задаёт сетку тактов и акценты метронома, по которым человек играл, — сменить его под
   уже записанным значило бы переосмыслить долевую сетку под нотами, оставив ноты на месте. */
function setLoopMetre(n){
  if(events.length||loop.on)return;
  loop.metre = METRES.includes(+n) ? +n : loop.metre;
}
function setLoopQuant(v){ loop.quant=!!v; }             // общий тумблер квантизации. S4.3: НЕ запрещён во время записи — действует со СЛЕДУЮЩЕЙ ноты (открытые доигрывают по своему правилу, см. recChOn), звука не касается
const SUBS=[4,3];                                       // дробление доли для квантизации ударных: 4 = 16-е, 3 = триоли
function setLoopSub(n){                                 // МОЖНО менять когда угодно: это настройка ЗАПИСИ, а не геометрия петли (в отличие от bars/metre)
  loop.sub = SUBS.includes(+n) ? +n : loop.sub;
}
/* ⛳ СМЕНА ТЕМПА ТЕПЕРЬ ПЕРЕСЧИТЫВАЕТ НАЧАЛО ОТСЧЁТА, ЧТОБЫ ПЛЕЙХЕД ОСТАЛСЯ НА МЕСТЕ (S3.3, пункт 5).
   Доля считается как (now−t0)·bpm/60. Прежде t0 не трогали, поэтому смена bpm меняла ТЕКУЩУЮ ДОЛЮ
   разрывно: при 84→168 позиция мгновенно УДВАИВАЛАСЬ. В петле на 2 такта это было незаметно (прыжок
   внутри восьми долей, и заворот всё равно рядом), а в пятиминутной песне то же самое отшвыривает
   плейхед на минуты — «покрутил темп и потерял место». Держим долю: подбираем t0 так, чтобы при НОВОМ
   темпе она осталась прежней.
   ⚠️ ЭТО НАМЕРЕННОЕ ИЗМЕНЕНИЕ ПОВЕДЕНИЯ, а не побочный эффект: раньше прыгало, теперь нет.
   ⚠️ loop.sched и loop.pos — В ДОЛЯХ, поэтому пересчитывать их не нужно: они и есть то, что мы
   сохраняем. Перепланировать, однако, надо (уже поставленные события расписаны по СТАРОМУ spb) —
   это делает schedInvalidate вместе со сбросом курсоров. */
function setLoopBpm(v){
  const nb=Math.max(40,Math.min(240,+v||loop.bpm));
  if(AC&&loop.on){
    const b=beatNow();      // доля СЕЙЧАС, по старому темпу
    loop.t0=AC.currentTime-b*60/nb;                    // …она же по новому
    loop.sched=Math.max(loop.sched,b);                 // окно опережения расписано старым темпом — не планируем прошлое заново
  }
  loop.bpm=nb; schedInvalidate();
}

export { clockWire, secPerBeat, beatNow, timeAt, secOf, beatsOf, songLenGrow, loop, songLen, songBeats, songLenRecalc, rgnLen, cycling, rgnReps, songAt, rgnApply, rgnSync, regionOn, braceProbe, setRegionOn, braceTap, braceMove, braceSet, beatLevel, loopPos, setLoopBars, METRES, setLoopMetre, setLoopQuant, SUBS, setLoopSub, setLoopBpm };
