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
import { t, onLangChange, store } from './i18n.js';
import { SCALES, supportsChords, typedChords } from './scales.js';
import { $, revealBar, tutorReset, tutorSetScale } from './ui.js';

/* Хроматика (12-TET) — единственный лад с ПОЛНОЙ палитрой типов аккордов (typedChords:'chrom12'),
   при этом с привычными аккордами. Урок «Аккорды» стартует на ней, иначе шаг палитры молча выпал бы
   на дефолтной минорной пентатонике. МАЖОР рассмотрен и ОТВЕРГНУТ: палитры у него НЕТ — его аккорды
   строятся ПО СТУПЕНИ (диатоника), не типом из набора. Ищем индекс, а не хардкодим (append-only массив). */
const CHROMATIC_IDX=SCALES.findIndex(s=>s.typedChords==='chrom12');

const TIMEOUT=15000;    // мс до подробной подсказки
const HOLD=900;         // мс «услышать сделанное» перед автопереходом
const SEEN_FRESH=1500;  // мс: heartbeat свежее этого = рука в кадре
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

/* СПИСОК УРОКОВ. steps:null → «Скоро» (виден, но не запускается). Наполняем по одному в следующих
   заходах. Порядок = порядок в меню. titleKey/descKey — ключи словаря (en+ru). Поле `next` — id
   следующего урока в ЦЕПОЧКЕ (финал предлагает «Дальше: <урок>», не прыгает сам): это ДАННЫЕ, не
   логика, поэтому переупорядочивание уроков цепочку не трогает. Последний в цепочке — без `next` (одна
   кнопка «Готово — играть»). next на «Скоро»-урок (steps:null) игнорируется как отсутствующий. */
const LESSONS=[
  {id:'basics',  titleKey:'lesson.basics.title',  descKey:'lesson.basics.desc',  steps:BASICS_STEPS, next:'chords'},
  {id:'chords',  titleKey:'lesson.chords.title',  descKey:'lesson.chords.desc',  steps:CHORDS_STEPS,
   setup:()=>{ if(CHROMATIC_IDX>=0) tutorSetScale(CHROMATIC_IDX); }},   // старт на Хроматике — шаг палитры появляется у всех (объявлено в chSwitch.prompt)
  {id:'tunings', titleKey:'lesson.tunings.title', descKey:'lesson.tunings.desc', steps:null},
  {id:'looper',  titleKey:'lesson.looper.title',  descKey:'lesson.looper.desc',  steps:null},
  {id:'handfn',  titleKey:'lesson.handfn.title',  descKey:'lesson.handfn.desc',  steps:null},
  {id:'split',   titleKey:'lesson.split.title',   descKey:'lesson.split.desc',   steps:null},
];
const lessonKey=id=>'handsong.lesson.'+id;
const lessonDone=id=>store.get(lessonKey(id))==='1';

let active=false, steps=[], idx=0, acc=null, detailShown=false, completing=false, lastSeenAt=0;
let detailTimer=0, advTimer=0, curLesson=null;
/* starter() — «поднять приложение» (main.js передаёт startApp через wireStarter). Возвращает Promise<bool>.
   Так tutor не зависит от main напрямую (без цикла) и правило #1 цело: старт зовётся в клике выбора. */
let starter=async()=>false;
export function wireStarter(fn){ starter=fn; }

const bar=$('tutorBar'), textEl=$('tutorText'), dotsEl=$('tutorDots'),
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
  chordLatched:false, chDeg0:null, chChanged:false, typePicked:false}; }   // поля урока «Аккорды» (BASICS их не читает — безвредны)
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
  else if(kind==='role'){ acc.role=p.role; }
}
/* Единая точка приёма (hooks.tutor). 'seen' — heartbeat (не действие шага). Прочее — обновить накопитель
   и проверить done текущего шага. Готово → complete() (услышать → перейти). */
function onEvent(kind,p){
  if(!active) return;
  if(kind==='seen'){ lastSeenAt=performance.now(); return; }
  apply(kind,p);
  const st=steps[idx];
  if(!st.final && !completing && st.done && st.done(acc)) complete();
}

const recentlySeen=()=>performance.now()-lastSeenAt<SEEN_FRESH;
/* Текст полосы: промпт; после таймаута — деталь, а если руки в кадре нет — про камеру. */
function curText(){
  const st=steps[idx];
  if(st.final) return t('tutor.'+st.key+'.prompt');   // финал — по ключу шага (Основы: key='final' → 'tutor.final.prompt', как было; Аккорды: 'chHold')
  if(detailShown) return recentlySeen() ? t('tutor.'+st.key+'.detail') : t('tutor.noHand');
  return t('tutor.'+st.key+'.prompt');
}
function paint(){
  if(active){
    textEl.textContent=curText();
    dotsEl.textContent=steps.map((_,i)=>i<=idx?'●':'○').join(' ');
    /* Финал — карточка ВЫБОРА (не автопрыжок): главная кнопка «Дальше: <урок>» (если в цепочке есть
       следующий запускаемый урок), иначе «Готово — играть»; тихая — «Готово — играть» (скрыта, когда
       следующего нет — тогда «Готово — играть» и есть главная). Обычный шаг — «Дальше →» / «Пропустить». */
    const fin=steps[idx].final, nx=fin?nextLessonOf(curLesson):null;
    nextBtn.textContent = fin ? (nx ? t('tutor.nextLesson',{title:t(nx.titleKey)}) : t('tutor.donePlay')) : t('tutor.next');
    skipBtn.textContent = fin ? t('tutor.donePlay') : t('tutor.skip');
    skipBtn.style.display = (fin && !nx) ? 'none' : '';
  }
  if(lessonOv.classList.contains('on')) renderLessons();   // список открыт (напр. смена языка) — перерисовать
}
function showDetail(){ detailShown=true; paint(); }
function enterStep(){
  const st=steps[idx];
  if(st.enter) st.enter(acc);
  detailShown=false; completing=false;
  clearTimeout(detailTimer); clearTimeout(advTimer);
  if(!st.final) detailTimer=setTimeout(showDetail, TIMEOUT);
  if(st.final){ revealBar(); if(scaleBtn) scaleBtn.classList.add('tutorPoint'); }   // финал: показать бар и подсветить кнопку лада (ничего не открываем)
  else if(st.reveal) revealBar();                                                  // шаг с кнопкой в баре (Аккорды chSwitch — «нажми роль») — бар должен быть виден
  paint();
}
function complete(){ completing=true; clearTimeout(detailTimer); advTimer=setTimeout(advance, HOLD); }
function advance(){
  clearTimeout(detailTimer); clearTimeout(advTimer);
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
  enterStep();
}
/* Разбор урока: снять подписку/таймеры/подсветку, спрятать полосу, поставить тихую галочку (если пройден).
   Камеру/звук/игру НЕ трогаем. КУДА дальше — решают вызыватели ниже (список / оставить играть / следующий
   урок), поэтому сам teardown никуда не ведёт. */
function teardown(completed){
  active=false; hooks.tutor=null;
  clearTimeout(detailTimer); clearTimeout(advTimer);
  bar.classList.remove('on');
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
