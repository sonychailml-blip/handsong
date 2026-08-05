/* ================= ОБУЧЕНИЕ (список уроков + интерактивные шаги) =================
   «Обучение» открывает СПИСОК коротких уроков (меню возможностей инструмента). Выбор урока запускает
   приложение (тем же кликом — правило #1) и ведёт этот урок. Урок идёт ВНУТРИ реального приложения:
   живая камера, звук, сетка — человек учится, ДЕЛАЯ. Каждый шаг ждёт, пока действие реально произойдёт
   (события gestures/ui через hooks.tutor — событие ⇔ действие), затем сам продвигается. Next всегда
   доступен; Skip (по ходу шагов) возвращает К СПИСКУ. ФИНАЛ — карточка ВЫБОРА: «Дальше: <урок>» ведёт
   ПРЯМО в следующий урок цепочки (поле next, без списка/перезапуска), «Готово — играть» оставляет
   играть (список не открываем). Список уроков остаётся доступен из «Обучение» на старте — цепочка лишь
   удобство, не замена меню. Через ~15 с подсказка подробнее — а если руки нет (heartbeat 'seen'), про камеру/свет.

   УРОКИ и ШАГИ — ДАННЫЕ. Урок: {id, titleKey, descKey, steps}. Шаг: {key, gate, enter, done}. Добавить
   урок = добавить запись (steps:null → «Скоро»), логику НЕ трогаем. Выполненные — тихая ГАЛОЧКА (не
   гейт): каждый урок доступен в любом порядке (per-lesson прогресс в localStorage через store).
   ⚠️ Уроки учат ТЕКУЩЕЙ жест-модели. Зацепки в gestures.js помечены «ЗАЦЕПКА ОБУЧЕНИЯ» и правятся
   вместе с жестами. draw.js НЕ трогаем: подсказка — DOM-полоса (кнопки должны тапаться), сетка видна. */
import { hooks } from './hooks.js';
import { t, onLangChange, store, DICTS } from './i18n.js';   // DICTS — базовый en-словарь: по нему проверяем, ЕСТЬ ли у шага деталь (иначе t() вернул бы сам ключ)
import { SCALES, supportsChords, typedChords } from './scales.js';
import { $, revealBar, tutorReset, tutorSetScale, tutorResetHandFn, tutorClearLoop, canSplit, tutorSplitInit, tutorSyncBar } from './ui.js';

/* Хроматика (12-TET) — единственный лад с ПОЛНОЙ палитрой типов аккордов (typedChords:'chrom12'),
   при этом с привычными аккордами. Урок «Аккорды» стартует на ней, иначе шаг палитры молча выпал бы
   на дефолтной минорной пентатонике. МАЖОР рассмотрен и ОТВЕРГНУТ: палитры у него НЕТ — его аккорды
   строятся ПО СТУПЕНИ (диатоника), не типом из набора. Ищем индекс, а не хардкодим (append-only массив). */
const CHROMATIC_IDX=SCALES.findIndex(s=>s.typedChords==='chrom12');
/* Мажор (ионийский) — «нормальный» лад С АККОРДАМИ. Урок «Лупер» стартует на нём, иначе после «Строёв»
   (которые нарочно оставляют человека на Пелоге — бесаккордовом) шаг наложения аккордов молчал бы. Ищем
   по определяющим интервалам (edo:12, iv=[0,2,4,5,7,9,11]) — уникальны (у мод/миноров iv другой), append-
   only массив не сломает. МАЖОР, а не Хроматика: «Лупер» про запись/наслаивание, и обычный мажор звучит
   музыкой (мелодия+аккорды), тогда как все 12 нот хроматики — «возврат к нормальному» после экзотики Пелога. */
const MAJOR_IDX=SCALES.findIndex(s=>s.edo===12 && String(s.iv)==='0,2,4,5,7,9,11');

const TIMEOUT=15000;    // мс до подробной подсказки
const SEEN_FRESH=1500;  // мс: heartbeat свежее этого = рука в кадре
/* HOLD (авто-переход через 0.9с после выполнения) УДАЛЁН: шаг больше не прыгает сам — выполнение лишь
   подсвечивает Next + ставит тик, человек жмёт Дальше, когда дочитал. Единственное, что делал HOLD, был
   этот автопрыжок, поэтому таймер (advTimer) убран целиком. */
const MOVE_SPAN=3;      // ступеней размаха для шага «двигайте руку»

/* ШАГИ УРОКА «Основы» — данные. Ключ → строки 'tutor.<key>.prompt' / '.detail'. enter(acc) — обнулить
   ИМЕННО измеряемое шагом поле (чтобы не «засчитаться» действием прошлого шага). done(acc) — чистый
   предикат по накопителю. АККОРД-ШАГИ УБРАНЫ (были step5 «переключись на Аккорды» / step6 «сыграй
   аккорд») — их теперь ведёт урок «Аккорды», не дублируем. Остаётся: нота → высота → октава → эффекты,
   затем финал (карточка предлагает «Дальше: Аккорды» / «Готово — играть»). */
const BASICS_STEPS=[
  {key:'step1', done:a=>a.noteFired},
  {key:'step2', enter:a=>{a.sMin=a.sMax=null;}, done:a=>a.sMax!=null && (a.sMax-a.sMin)>=MOVE_SPAN},
  {key:'step3', enter:a=>{a.fingerChanged=false;}, done:a=>a.fingerChanged},
  {key:'step4', enter:a=>{a.fxMoved=false;}, done:a=>a.fxMoved},
  {key:'final', final:true},
];

/* ШАГИ УРОКА «Аккорды» — мост от «Основ» к аккордовой роли. Формат тот же (см. BASICS_STEPS). События
   аккордов уже шлёт gestures («ЗАЦЕПКА ОБУЧЕНИЯ»): 'role' (смена роли из UI), 'chord' (свежая атака),
   'chordLatch' (защёлкнутый аккорд отпущен, но звучит), 'chordType' (выбран тип в палитре).
   Гейты: аккорд-шаги — только там, где аккорды звучат (supportsChords); шаг палитры — только на ладах
   с типизированными аккордами (typedChords), иначе палитры нет и шаг тихо выпадает (как аккорд-шаги
   «Основ» в бесаккордовом ладу). Финал — про удержание (chHold): рассказываем, НЕ заставляя перенастраивать. */
const CHORDS_STEPS=[
  {key:'chSwitch',  reveal:true, gate:supportsChords, done:a=>a.role==='ch' && a.chordPlayed},              // переключиться на «Аккорды» и сыграть аккорд
  {key:'chLatch',   gate:supportsChords, enter:a=>{a.chordLatched=false;}, done:a=>a.chordLatched},         // защёлка: отпустил пальцы — аккорд звучит
  {key:'chRow',     gate:supportsChords, enter:a=>{a.chDeg0=null; a.chChanged=false;}, done:a=>a.chChanged},// другой аккорд с другой высоты (корень идёт за рукой)
  {key:'chPalette', gate:typedChords, enter:a=>{a.typePicked=false;}, done:a=>a.typePicked},                // палитра типов — только на ладах с typedChords
  {key:'chHold',    final:true},                                                                            // удержание существует и где выбирается (без перенастройки)
];

/* ШАГИ УРОКА «Строи и тембры» — идея, ради которой существует проект: та же рука — 75 музыкальных
   миров. Приходят из «Аккордов» на Хроматике. События из UI-слоя (ЗАЦЕПКА ОБУЧЕНИЯ в ui.js): 'panel'
   (открыли меню лада), 'scale' {trad} (выбрали лад/строй), 'timbre' {slot} (сменили тембр); 'note' — как
   в «Основах». Ведём: открыть меню → знакомый лад + игра → КОНТРАСТНЫЙ лад (Пелог, гамелан: неравные
   шаги слышны за пару нот) + игра → что такое центы → смена соло-тембра → финал (в нём же — одна фраза
   про эталон A). Гейтов нет: шаги про НАВИГАЦИЮ по меню, работают на любом ладу. */
const TUNINGS_STEPS=[
  {key:'tunOpen',     enter:a=>{a.panelOpened=false;}, done:a=>a.panelOpened},                                          // открыть меню лада
  {key:'tunFamiliar', enter:a=>{a.lastScaleTrad=null; a.noteFired=false;}, done:a=>a.lastScaleTrad==='common' && a.noteFired},   // знакомый лад из «Привычного» + игра
  {key:'tunJump',     enter:a=>{a.lastScaleTrad=null; a.noteFired=false;}, done:a=>a.lastScaleTrad!=null && a.lastScaleTrad!=='common' && a.noteFired},   // КОНТРАСТНЫЙ лад (вне «Привычного») + та же рука
  {key:'tunCents'},                                                                                                     // что такое центы — читаем (действия нет, кнопка «Дальше»)
  {key:'tunTimbre',   enter:a=>{a.timbreChanged=false; a.noteFired=false;}, done:a=>a.timbreChanged && a.noteFired},    // сменить соло-тембр И сыграть (услышать новый звук)
  {key:'tunFinal',    final:true},                                                                                      // финал: та же рука — 75 миров; + одна фраза про эталон A
];

/* ШАГИ УРОКА «Функции рук» — целый слой, который находят случайно: каждой руке даётся РАБОТА (ноты,
   удержание, непрерывная высота, эффекты, лупер, выразительность), и работы РАЗНЫЕ по ролям. Setup ставит
   известную базу (левая=эффекты, правая=ноты), чтобы каждый «поставь руку на …» был реальной сменой.
   События (ЗАЦЕПКА ОБУЧЕНИЯ в ui.js/gestures.js): 'handfn' {role,hand,fn} (сменили функцию руки),
   'exprMove' (рука-выразительность задвигалась), 'note' (нота зазвучала — как в «Основах»). Ведём: где это
   → УДЕРЖАНИЕ → ТЕРМЕНВОКС (не клавиатура!) → ВЫРАЗИТЕЛЬНОСТЬ (звук дышит) → рука-ЛУПЕР (одна фраза вперёд,
   к уроку «Лупер») → финал. Функции соло берутся с role==='ld'; гейтов нет. */
/* ШАГИ УРОКА «Лупер» — фича, что превращает игрушку в инструмент для целых пьес. Ведём в порядке реальной
   работы: записать круг → наложить слой → отмена → джем → темп/длина (правило пустой петли) → рука-лупер
   (одна фраза вперёд) → финал. События (ЗАЦЕПКА ОБУЧЕНИЯ в recorder.js — ловят И кнопки, И руку-лупер, т.к.
   обе идут через onRec/onUndo/loadJam): 'loop' {ev:'recStart'|'loopClosed'|'overdubStart'|'overdubStop'|
   'undo'|'jam'}; 'panel' {which:'loop'} (открыта панель лупера); 'note' — как в «Основах». Чистый старт даёт
   tutorReset (clearRec). Кнопки ●/🎵/⚙ — в ВЕРХНЕМ баре (reveal:true), ⤺ отмена — в нижней полосе транспорта
   (видна при играющей петле). */
const LOOPER_STEPS=[
  {key:'lpRec',    reveal:true, enter:a=>{a.loopClosed=false; a.noteFired=false;}, done:a=>a.loopClosed && a.noteFired},   // ● запись: отсчёт → играть → круг «вернулся»
  /* СЛОЙ ПО РОЛЯМ, не поверх соло: соло — ОДИН моно-голос (audio: banks/envGain делят живую игру И
     переигровку), поэтому второй соло-слой дерётся с первым и побеждает последний — известное ОГРАНИЧЕНИЕ
     (см. recorder.js: «соло-поверх-соло делит голос»), не баг здесь. Поэтому: соло → переключить роль на
     Аккорды/Бас (пул, ключ-владелец 'loop:N'/'bassloop:N') → они звучат ВМЕСТЕ. done: сменил роль на
     ch/bs, завершил овердаб (● стоп) И реально сыграл в этой роли (chordPlayed/bassPlayed сбрасываются на
     старте овердаба — засчитываем игру ВО ВРЕМЯ слоя). НИКОГДА не возвращать соло-овердаб (мёртвый по сути). */
  {key:'lpLayer',  reveal:true, enter:a=>{a.overdubbed=false; a.chordPlayed=false; a.bassPlayed=false;},
                   done:a=>(a.role==='ch'||a.role==='bs') && a.overdubbed && (a.chordPlayed||a.bassPlayed)},   // сменить роль (Аккорды/Бас) + ● слой + сыграть → две роли звучат вместе
  {key:'lpUndo',   enter:a=>{a.undone=false;}, done:a=>a.undone},                                                          // ⤺ снять верхний слой
  {key:'lpJam',    reveal:true, enter:a=>{ tutorClearLoop(); a.jammed=false; a.noteFired=false; a.chordPlayed=false; a.bassPlayed=false; },
                   done:a=>a.jammed && (a.noteFired||a.chordPlayed||a.bassPlayed)},   // enter чистит петлю → джем встаёт на пустую (любой размер/лад); 🎵 + игра поверх В ЛЮБОЙ роли (после lpLayer роль ch/bs, не только соло)
  {key:'lpTempo',  reveal:true, enter:a=>{a.loopPanelOpened=false;}, done:a=>a.loopPanelOpened},                           // ⚙ панель: темп/длина/размер; длину и размер меняют только на ПУСТОЙ петле
  {key:'lpHand'},                                                                                                          // рука-лупер: одна фраза назад к «Функциям рук» (действия нет)
  {key:'lpFinal',  final:true},
];

const HANDFN_STEPS=[
  {key:'hfWhere',  reveal:true, enter:a=>{a.panelOpened=false;}, done:a=>a.panelOpened},                              // открыть меню, найти «Функции рук»
  {key:'hfHold',   enter:a=>{a.hfHold=false;  a.noteFired=false;}, done:a=>a.hfHold  && a.noteFired},                 // рука на «Ноты (с удержанием)» + сыграть (нота стоит, рука двигается)
  {key:'hfTherm',  enter:a=>{a.hfTherm=false; a.noteFired=false;}, done:a=>a.hfTherm && a.noteFired},                 // та же рука на «Терменвокс» + сыграть (высота скользит, без ступеней)
  {key:'hfExpr',   enter:a=>{a.hfExpr=false; a.exprMoved=false; a.noteFired=false;}, done:a=>a.hfExpr && a.exprMoved && a.noteFired},   // ДРУГУЮ руку на «Выразительность» + играть + двигать (звук дышит)
  {key:'hfLooper'},                                                                                                   // рука-лупер существует — одна фраза вперёд (действия нет, кнопка «Дальше»)
  {key:'hfFinal',  final:true},                                                                                      // финал: здесь ты ВЫБИРАЕШЬ работу каждой руке
];

/* ШАГИ УРОКА «Две роли сразу» (сплит) — ПОСЛЕДНИЙ в цепочке. Сплит живёт ТОЛЬКО в ландшафте (canSplit),
   что задаёт весь урок: шаг 0 — ориентация (ждёт поворот; на широком десктопе уже ландшафт → skipIfDone
   мгновенно пропускает). Событий-зацепок (ui/gestures): 'orient' {landscape} (поворот), 'split' {on}
   (кнопка ◨), 'splitRole' {half,role} (кнопка половины), note/chord/bass несут {half} (в какой половине).
   Setup: лад Хроматика (аккорды звучат) + пара половин СОЛО|АККОРДЫ (игра в обеих = музыка: мелодия над
   гармонией; бесаккордовый лад → правая половина бас, страховка в tutorSplitInit), сплит ВЫКЛючен (включат
   на шаге 1). ПРАВИЛО: половина решает инструмент, не рука. ПОВОРОТ В ПОРТРЕТ середины урока → сплит сам
   выключается (ui.onResize) → onEvent возвращает на шаг 0 (иначе застряли бы на шаге про исчезнувший сплит).
   Роли пары ВСЕГДА разные (cycleHalf пропускает роль другой половины) — на этом держится шаг ролей. */
const SPLIT_STEPS=[
  {key:'spOrient', skipIfDone:true, done:a=>canSplit()},                                              // ландшафт нужен: ждём поворот; уже широко (десктоп) → пропуск
  {key:'spOn',     reveal:true, enter:a=>{a.splitTurnedOn=false;}, done:a=>a.splitTurnedOn},          // ◨ включить сплит — экран делится надвое
  {key:'spHalves', enter:a=>{a.half0=false; a.half1=false;}, done:a=>a.half0 && a.half1},             // сыграть в КАЖДОЙ половине (соло-нота + аккорд); место решает инструмент, не рука
  /* Урок СТАРТУЕТ уже в соло|аккорды (шаг spHalves играет музыку), поэтому «выставить аккорды+соло» стало
     бы no-op. Действие шага — СМЕНИТЬ половину кнопкой (на Бас/Ударные): done по факту смены (cycleHalf →
     'splitRole'). Не требуем вернуть исходную пару: цикл назад к ch+ld через пропуск-роли — 3 нажатия,
     мучительно; смена роли и наблюдение «пропускает роль другой половины» уже несут суть шага. */
  {key:'spRoles',  reveal:true, enter:a=>{a.splitRoleChanged=false;}, done:a=>a.splitRoleChanged},    // кнопкой половины сменить её роль (пара не может совпасть — cycleHalf пропускает роль другой)
  {key:'spFinal',  final:true},                                                                       // финал: функции рук — по роли половины; поворот в портрет гасит сплит сам
];

/* СПИСОК УРОКОВ. steps:null → «Скоро» (виден, но не запускается). Наполняем по одному в следующих
   заходах. Порядок = порядок в меню. titleKey/descKey — ключи словаря (en+ru). Поле `next` — id
   следующего урока в ЦЕПОЧКЕ (финал предлагает «Дальше: <урок>», не прыгает сам): это ДАННЫЕ, не
   логика, поэтому переупорядочивание уроков цепочку не трогает. Последний в цепочке — без `next` (одна
   кнопка «Готово — играть»). next на «Скоро»-урок (steps:null) игнорируется как отсутствующий. */
const LESSONS=[
  {id:'basics',  titleKey:'lesson.basics.title',  descKey:'lesson.basics.desc',  steps:BASICS_STEPS, next:'chords'},
  {id:'chords',  titleKey:'lesson.chords.title',  descKey:'lesson.chords.desc',  steps:CHORDS_STEPS, next:'tunings',
   setup:()=>{ if(CHROMATIC_IDX>=0) tutorSetScale(CHROMATIC_IDX); }},   // старт на Хроматике — шаг палитры появляется у всех (объявлено в chSwitch.prompt)
  {id:'tunings', titleKey:'lesson.tunings.title', descKey:'lesson.tunings.desc', steps:TUNINGS_STEPS, next:'looper'},   // цепочка: «Аккорды»→сюда→«Лупер»
  {id:'looper',  titleKey:'lesson.looper.title',  descKey:'lesson.looper.desc',  steps:LOOPER_STEPS, next:'handfn',
   setup:()=>{ if(MAJOR_IDX>=0) tutorSetScale(MAJOR_IDX); }},   // на Мажор (с аккордами): «Строи» оставляют на Пелоге, а шаг наложения просит роль «Аккорды» — объявлено в lpRec.prompt. Чистая петля/роль — из tutorReset
  {id:'handfn',  titleKey:'lesson.handfn.title',  descKey:'lesson.handfn.desc',  steps:HANDFN_STEPS, next:'split',
   setup:tutorResetHandFn},   // старт с известной базы (левая=эффекты, правая=ноты); ведёт дальше к «Двум ролям»
  {id:'split',   titleKey:'lesson.split.title',   descKey:'lesson.split.desc',   steps:SPLIT_STEPS,   // ПОСЛЕДНИЙ урок цепочки (без next → финал «Готово — играть»)
   setup:()=>{ if(CHROMATIC_IDX>=0) tutorSetScale(CHROMATIC_IDX); tutorSplitInit(); }},   // ПОРЯДОК ВАЖЕН: Хроматика СНАЧАЛА (аккорды доступны), потом пара половин соло|аккорды; сплит выключен из tutorReset
];
const lessonKey=id=>'handsong.lesson.'+id;
const lessonDone=id=>store.get(lessonKey(id))==='1';

let active=false, steps=[], idx=0, acc=null, camArmed=false, completing=false, stepDone=false, lastSeenAt=0;   // stepDone — шаг выполнен (тик+свечение Next), но НЕ перешли; camArmed — таймаут прошёл, можно показать камера-ноту (если руки нет)
let detailTimer=0, curLesson=null;
/* starter() — «поднять приложение» (main.js передаёт startApp через wireStarter). Возвращает Promise<bool>.
   Так tutor не зависит от main напрямую (без цикла) и правило #1 цело: старт зовётся в клике выбора. */
let starter=async()=>false;
export function wireStarter(fn){ starter=fn; }

const bar=$('tutorBar'), textEl=$('tutorText'), detailEl=$('tutorDetail'), asideEl=$('tutorAside'), doneEl=$('tutorDone'), dotsEl=$('tutorDots'),
      nextBtn=$('tutorNext'), skipBtn=$('tutorSkip'), scaleBtn=$('scaleBtn');
const lessonOv=$('lessonOv'), lessonTitle=$('lessonTitle'), lessonRows=$('lessonRows'),
      lessonClose=$('lessonClose'), lessonFree=$('lessonFree');

/* ---------- СПИСОК УРОКОВ ---------- */
function renderLessons(){
  lessonTitle.textContent=t('lessons.title');
  lessonClose.textContent=t('lessons.close');
  lessonFree.textContent=t('lessons.free');
  lessonRows.textContent='';
  for(const L of LESSONS){
    const soon=!L.steps, done=!soon && lessonDone(L.id);
    const row=document.createElement('button'); row.className='lessonRow'; row.disabled=soon;
    const top=document.createElement('div'); top.className='lr-top';
    const ti=document.createElement('span'); ti.className='lr-title'; ti.textContent=t(L.titleKey);
    const bg=document.createElement('span'); bg.className='lr-badge';
    bg.textContent = soon ? t('lessons.soon') : (done ? '✓' : '');
    top.appendChild(ti); top.appendChild(bg);
    const de=document.createElement('div'); de.className='lr-desc'; de.textContent=t(L.descKey);
    row.appendChild(top); row.appendChild(de);
    if(!soon) row.onclick=()=>pick(L.id);
    lessonRows.appendChild(row);
  }
}
export function openLessons(){ renderLessons(); lessonOv.classList.add('on'); }
function closeLessons(){ lessonOv.classList.remove('on'); }
/* Выбор урока: поднимаем приложение (в этом клике), закрываем список, ведём урок. Старт не удался —
   список закрыт, под ним стартовая карточка с ошибкой. Если уже играем — starter() no-op (true). */
async function pick(id){ const ok=await starter(); closeLessons(); if(ok){ const L=LESSONS.find(x=>x.id===id); if(L&&L.steps) startLesson(L); } }
async function freePlay(){ const ok=await starter(); closeLessons(); void ok; }   // «Свободная игра»: поднять приложение (или просто закрыть список, если уже играем)

/* ---------- ХОД УРОКА (шаги) ---------- */
function freshAcc(){ return {noteFired:false, sMin:null, sMax:null, lastLdFinger:null,
  fingerChanged:false, fxMoved:false, role:'ld', chordPlayed:false,
  chordLatched:false, chDeg0:null, chChanged:false, typePicked:false,
  panelOpened:false, lastScaleTrad:null, timbreChanged:false,
  hfHold:false, hfTherm:false, hfExpr:false, exprMoved:false,
  loopClosed:false, overdubbed:false, undone:false, jammed:false, loopPanelOpened:false, bassPlayed:false,
  splitTurnedOn:false, half0:false, half1:false, splitRoleChanged:false}; }   // поля уроков «Аккорды»/«Строи»/«Функции рук»/«Лупер»/«Две роли» (прочие уроки их не читают — безвредны)
/* Накопитель обновляем ГЕНЕРИЧНО по каждому событию — предикаты done остаются ЧИСТЫМИ (только читают). */
function apply(kind,p){
  if(kind==='pinch'){ if(p.zone==='ld'){ if(acc.lastLdFinger!=null && p.finger!==acc.lastLdFinger) acc.fingerChanged=true; acc.lastLdFinger=p.finger; } }
  else if(kind==='note'){ acc.noteFired=true; const d=p.deg;
    if(acc.sMin==null){ acc.sMin=acc.sMax=d; } else { if(d<acc.sMin)acc.sMin=d; if(d>acc.sMax)acc.sMax=d; } }
  else if(kind==='fx'){ acc.fxMoved=true; }
  else if(kind==='chord'){ acc.chordPlayed=true; const d=p.deg;   // свежая атака аккорда: отмечаем факт и следим за сменой корня (шаг chRow)
    if(acc.chDeg0==null) acc.chDeg0=d; else if(d!==acc.chDeg0) acc.chChanged=true; }
  else if(kind==='chordLatch'){ acc.chordLatched=true; }   // защёлкнутый аккорд отпущен, но звучит (шаг chLatch)
  else if(kind==='chordType'){ acc.typePicked=true; }      // выбран тип в палитре (шаг chPalette)
  else if(kind==='panel'){ if(p.which==='scale') acc.panelOpened=true; else if(p.which==='loop') acc.loopPanelOpened=true; }   // открыта панель лада (tunOpen/hfWhere) / лупера (lpTempo)
  else if(kind==='bass'){ acc.bassPlayed=true; }            // басовая нота (слой-по-ролям, шаг lpLayer)
  else if(kind==='loop'){                                   // события лупера (шаги урока «Лупер»)
    if(p.ev==='recStart'||p.ev==='overdubStart'||p.ev==='jam'){ acc.noteFired=false; acc.chordPlayed=false; acc.bassPlayed=false; }   // сброс: игра ЗАСЧИТЫВАЕТСЯ только ПОСЛЕ старта записи/овердаба/джема (сыграно ВО ВРЕМЯ слоя, а не до)
    else if(p.ev==='loopClosed') acc.loopClosed=true;
    else if(p.ev==='overdubStop') acc.overdubbed=true;
    else if(p.ev==='undo') acc.undone=true;
    if(p.ev==='jam') acc.jammed=true; }
  else if(kind==='scale'){ acc.lastScaleTrad=p.trad; }     // выбран лад/строй — запоминаем традицию (шаги tunFamiliar/tunJump)
  else if(kind==='timbre'){ if(p.slot==='lead') acc.timbreChanged=true; }  // сменён соло-тембр (шаг tunTimbre)
  else if(kind==='handfn'){ if(p.role==='ld'){   // соло-руки; ПРАВАЯ — нотная (удержание→терменвокс), ЛЕВАЯ — выразительность, чтобы на шаге expr правая всё ещё играла ноту
    if(p.hand==='R' && p.fn==='hold')acc.hfHold=true;
    else if(p.hand==='R' && p.fn==='therm')acc.hfTherm=true;
    else if(p.hand==='L' && p.fn==='expr')acc.hfExpr=true; } }
  else if(kind==='split'){ if(p.on) acc.splitTurnedOn=true; }        // сплит включён кнопкой ◨ (шаг spOn)
  else if(kind==='splitRole'){ acc.splitRoleChanged=true; }          // сменилась роль половины кнопкой (шаг spRoles: done по факту смены)
  else if(kind==='exprMove'){ acc.exprMoved=true; }        // рука-выразительность задвигалась (шаг hfExpr)
  else if(kind==='role'){ acc.role=p.role; }
  // ПОЛОВИНА сплита — ОТДЕЛЬНЫМ if ПОСЛЕ всей цепочки (note/chord/bass уже отметили свой флаг выше): note/chord/bass
  // несут p.half (0 лев/1 прав) при splitOn → «сыграно в этой половине» (шаг spHalves). 'orient' в накопитель НЕ пишет —
  // его ловит onEvent (возврат на шаг ориентации), а done шага ориентации читает canSplit() напрямую.
  if((kind==='note'||kind==='chord'||kind==='bass') && p && p.half!=null){ if(p.half===0)acc.half0=true; else acc.half1=true; }
}
/* Единая точка приёма (hooks.tutor). 'seen' — heartbeat (не действие шага). Прочее — обновить накопитель
   и проверить done текущего шага. Готово → complete() (услышать → перейти). */
function onEvent(kind,p){
  if(!active) return;
  if(kind==='seen'){ lastSeenAt=performance.now(); return; }
  /* ПОВОРОТ В ПОРТРЕТ середины сплит-урока: сплит сам выключился (ui.onResize) — субъект шага исчез, поэтому
     возвращаемся на шаг ориентации (0), а не сидим на шаге про пропавший сплит. Только вперёд от шага 0. */
  if(kind==='orient' && curLesson==='split' && !canSplit() && idx>0){ idx=0; enterStep(); return; }
  apply(kind,p);
  const st=steps[idx];
  if(!st.final && !completing && st.done && st.done(acc)) complete();
}

const recentlySeen=()=>performance.now()-lastSeenAt<SEEN_FRESH;
/* ГЛАВНАЯ строка — ВСЕГДА инструкция (промпт), в т.ч. на финале (у него ключ = '<key>.prompt'). */
function mainText(){ return t('tutor.'+steps[idx].key+'.prompt'); }
/* ОБЪЯСНЕНИЕ шага — тихая вторая строка ТОГО ЖЕ блока, видна СРАЗУ (прежний свап промпт→деталь по таймауту
   убран: он прятал объяснение — действие успевали сделать до таймаута). Есть НЕ у всех шагов (инфо-шаги/
   финалы): проверяем по базовому en-словарю (иначе t() вернул бы сам ключ); нет детали → пусто (пустой
   строки под промптом не рисуем). */
function detailText(){ const k='tutor.'+steps[idx].key+'.detail'; return (k in DICTS.en) ? t(k) : ''; }
/* Камера-нота — ОТДЕЛЬНАЯ добавочная строка (не часть блока «инструкция+объяснение»): когда после таймаута
   руки в кадре нет и шаг не выполнен. Таймер теперь взводит ТОЛЬКО это (деталь от него не зависит). */
function asideText(){
  const st=steps[idx];
  if(st.final || stepDone) return '';
  return (camArmed && !recentlySeen()) ? t('tutor.noHand') : '';
}
function paint(){
  if(active){
    textEl.textContent=mainText();
    detailEl.textContent=detailText();
    detailEl.style.display = detailEl.textContent ? '' : 'none';   // нет детали (инфо-шаг/финал) → пустой строки не рисуем
    asideEl.textContent=asideText();
    asideEl.style.display = asideEl.textContent ? '' : 'none';
    dotsEl.textContent=steps.map((_,i)=>i<=idx?'●':'○').join(' ');
    /* Финал — карточка ВЫБОРА (не автопрыжок): главная кнопка «Дальше: <урок>» (если в цепочке есть
       следующий запускаемый урок), иначе «Готово — играть»; тихая — «Готово — играть» (скрыта, когда
       следующего нет — тогда «Готово — играть» и есть главная). Обычный шаг — «Дальше →» / «Пропустить». */
    const fin=steps[idx].final, nx=fin?nextLessonOf(curLesson):null;
    nextBtn.textContent = fin ? (nx ? t('tutor.nextLesson',{title:t(nx.titleKey)}) : t('tutor.donePlay')) : t('tutor.next');
    skipBtn.textContent = fin ? t('tutor.donePlay') : t('tutor.skip');
    skipBtn.style.display = (fin && !nx) ? 'none' : '';
    /* Шаг выполнен → подсветить Next (класс .ready — свечение) + показать тик ✓; НЕ финал. Авто-перехода нет. */
    const show = stepDone && !fin;
    nextBtn.classList.toggle('ready', show);
    doneEl.textContent = show ? '✓' : '';
    doneEl.style.display = show ? '' : 'none';
  }
  if(lessonOv.classList.contains('on')) renderLessons();   // список открыт (напр. смена языка) — перерисовать
}
function armCamNote(){ camArmed=true; paint(); }   // таймаут прошёл: разрешаем камера-ноту (покажется, только если руки в кадре нет)
function enterStep(){
  const st=steps[idx];
  if(st.enter) st.enter(acc);
  /* Шаг с skipIfDone, чьё условие УЖЕ выполнено на входе (напр. ориентация: уже ландшафт на широком
     десктопе) → мгновенно дальше, без показа. Только по флагу — прочие шаги (флаг сброшен в enter) не
     проскочат. Рекурсия на один уровень (следующий шаг skipIfDone не имеет). */
  if(!st.final && st.skipIfDone && st.done && st.done(acc)){ advance(); return; }
  camArmed=false; completing=false; stepDone=false;   // новый шаг: тик/свечение сняты, камера-нота снова взводится по таймауту
  clearTimeout(detailTimer);
  if(!st.final) detailTimer=setTimeout(armCamNote, TIMEOUT);
  if(st.final){ revealBar(); if(scaleBtn) scaleBtn.classList.add('tutorPoint'); }   // финал: показать бар и подсветить кнопку лада (ничего не открываем)
  else if(st.reveal) revealBar();                                                  // шаг с кнопкой в баре (Аккорды chSwitch — «нажми роль») — бар должен быть виден
  paint();
}
/* Шаг ВЫПОЛНЕН: НЕ переходим сами (убран autoadvance). Гасим эскалацию детали, помечаем stepDone → paint
   подсвечивает Next и ставит тик. completing=true не даёт повторно «выполнить» тот же шаг. Дальше — по нажатию. */
function complete(){ completing=true; stepDone=true; clearTimeout(detailTimer); paint(); }
function advance(){
  clearTimeout(detailTimer);
  idx++;
  if(idx>=steps.length){ exitToList(true); return; }   // прошли все шаги (не должно случаться — final без done) → как выполнено, к списку
  enterStep();
}

/* Запуск конкретного урока (после того, как приложение поднято). */
function startLesson(L){
  if(active) return;
  tutorReset();                                   // single-role соло — модель совпадает с экраном (сплит гасим)
  if(L.setup) L.setup();                          // урок задаёт стартовый лад ДО фильтра гейтов (Аккорды → Хроматика, чтобы typedChords-гейт пропустил шаг палитры)
  steps=L.steps.filter(s=>!s.gate || s.gate());   // аккорд-шаги выпадают в бесаккордовом ладу; шаг палитры — на ладах без typedChords
  idx=0; acc=freshAcc(); lastSeenAt=0; active=true; curLesson=L.id;
  hooks.tutor=onEvent;                            // подписка ПОСЛЕ tutorReset (его role='ld' не влетит в шаг)
  bar.classList.add('on');
  tutorSyncBar();                                 // .on только что появился — пересчитать положение (.mini/.low) по РЕАЛЬНОМУ состоянию панелей/лупера; иначе первый кадр урока лёг бы полной полосой поверх открытого меню
  enterStep();
}
/* Разбор урока: снять подписку/таймеры/подсветку, спрятать полосу, поставить тихую галочку (если пройден).
   Камеру/звук/игру НЕ трогаем. КУДА дальше — решают вызыватели ниже (список / оставить играть / следующий
   урок), поэтому сам teardown никуда не ведёт. */
function teardown(completed){
  active=false; hooks.tutor=null;
  clearTimeout(detailTimer);
  /* Снимаем НЕ ТОЛЬКО .on, но и все классы ПОЛОЖЕНИЯ (.mini/.low/.hushed): их вешает ui.syncTutorBarPos
     по открытой панели/коробке лупера, и после урока они оставались висеть. Пока .mini нёс собственный
     display:flex, такой хвост воскрешал полосу при следующем открытии панели. Сюда приходят ВСЕ выходы из
     урока — финал, «Готово — играть», Пропустить (к списку), переход по цепочке, защитный автопроход. */
  bar.classList.remove('on','mini','low','hushed');
  if(scaleBtn) scaleBtn.classList.remove('tutorPoint');
  if(completed && curLesson) store.set(lessonKey(curLesson),'1');
  curLesson=null;
}
/* Следующий ЗАПУСКАЕМЫЙ урок по полю next (данные, не логика): нет next или он «Скоро» (steps:null) → null. */
function nextLessonOf(id){
  const L=LESSONS.find(x=>x.id===id);
  if(!L||!L.next) return null;
  const nx=LESSONS.find(x=>x.id===L.next);
  return (nx&&nx.steps) ? nx : null;
}
function exitToList(completed){ teardown(completed); openLessons(); }   // Пропустить (без галочки) / защитный автопроход — к СПИСКУ
function donePlay(){ teardown(true); }                                  // «Готово — играть»: урок пройден, полосу прячем, ОСТАВЛЯЕМ играть (список НЕ открываем)
function chainTo(nx){ teardown(true); startLesson(nx); }               // «Дальше»: текущий пройден → сразу в следующий (без списка, без перезапуска/камеры — starter не зовём)

nextBtn.onclick=()=>{ if(!active) return;
  if(!steps[idx].final){ advance(); return; }        // обычный шаг → вперёд
  const nx=nextLessonOf(curLesson);                  // финал: есть следующий урок в цепочке?
  if(nx) chainTo(nx); else donePlay();               // да → сразу в него; нет → оставить играть
};
skipBtn.onclick=()=>{ if(!active) return;
  if(steps[idx].final) donePlay();                   // финал: тихая «Готово — играть» — оставляем играть (без списка)
  else exitToList(false);                            // обычный шаг: Пропустить — к списку, без галочки
};
lessonClose.onclick=()=>closeLessons();                                                          // ✕: за списком стартовая карточка (до старта) или игра (во время)
lessonFree.onclick=()=>freePlay();
onLangChange(paint);                              // смена языка — перерисовать полосу шага и/или список
