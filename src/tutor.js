/* ================= ОБУЧЕНИЕ (список уроков + интерактивные шаги) =================
   «Обучение» открывает СПИСОК коротких уроков (меню возможностей инструмента). Выбор урока запускает
   приложение (тем же кликом — правило #1) и ведёт этот урок. Урок идёт ВНУТРИ реального приложения:
   живая камера, звук, сетка — человек учится, ДЕЛАЯ. Каждый шаг ждёт, пока действие реально произойдёт
   (события gestures/ui через hooks.tutor — событие ⇔ действие), затем сам продвигается. Next всегда
   доступен; Skip и завершение возвращают К СПИСКУ (не на старт); из списка есть «Свободная игра».
   Через ~15 с подсказка подробнее — а если руки в кадре не было (heartbeat 'seen'), про камеру/свет.

   УРОКИ и ШАГИ — ДАННЫЕ. Урок: {id, titleKey, descKey, steps}. Шаг: {key, gate, enter, done}. Добавить
   урок = добавить запись (steps:null → «Скоро»), логику НЕ трогаем. Выполненные — тихая ГАЛОЧКА (не
   гейт): каждый урок доступен в любом порядке (per-lesson прогресс в localStorage через store).
   ⚠️ Уроки учат ТЕКУЩЕЙ жест-модели. Зацепки в gestures.js помечены «ЗАЦЕПКА ОБУЧЕНИЯ» и правятся
   вместе с жестами. draw.js НЕ трогаем: подсказка — DOM-полоса (кнопки должны тапаться), сетка видна. */
import { hooks } from './hooks.js';
import { t, onLangChange, store } from './i18n.js';
import { supportsChords } from './scales.js';
import { $, revealBar, tutorReset } from './ui.js';

const TIMEOUT=15000;    // мс до подробной подсказки
const HOLD=900;         // мс «услышать сделанное» перед автопереходом
const SEEN_FRESH=1500;  // мс: heartbeat свежее этого = рука в кадре
const MOVE_SPAN=3;      // ступеней размаха для шага «двигайте руку»

/* ШАГИ УРОКА «Основы» — данные. Ключ → строки 'tutor.<key>.prompt' / '.detail'. gate() — применим ли
   шаг (аккорды только там, где supportsChords). enter(acc) — обнулить ИМЕННО измеряемое шагом поле
   (чтобы не «засчитаться» действием прошлого шага). done(acc) — чистый предикат по накопителю.
   ⚠️ ЛОГИКА И ПРЕДИКАТЫ ЭТИХ ШЕСТИ ШАГОВ НЕ МЕНЯЮТСЯ (только шаг1 в словаре назвал правую руку). */
const BASICS_STEPS=[
  {key:'step1', done:a=>a.noteFired},
  {key:'step2', enter:a=>{a.sMin=a.sMax=null;}, done:a=>a.sMax!=null && (a.sMax-a.sMin)>=MOVE_SPAN},
  {key:'step3', enter:a=>{a.fingerChanged=false;}, done:a=>a.fingerChanged},
  {key:'step4', enter:a=>{a.fxMoved=false;}, done:a=>a.fxMoved},
  {key:'step5', gate:supportsChords, done:a=>a.role==='ch'},
  {key:'step6', gate:supportsChords, enter:a=>{a.chordPlayed=false;}, done:a=>a.chordPlayed},
  {key:'final', final:true},
];

/* СПИСОК УРОКОВ. steps:null → «Скоро» (виден, но не запускается). Наполняем по одному в следующих
   заходах. Порядок = порядок в меню. titleKey/descKey — ключи словаря (en+ru). */
const LESSONS=[
  {id:'basics',  titleKey:'lesson.basics.title',  descKey:'lesson.basics.desc',  steps:BASICS_STEPS},
  {id:'chords',  titleKey:'lesson.chords.title',  descKey:'lesson.chords.desc',  steps:null},
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
  fingerChanged:false, fxMoved:false, role:'ld', chordPlayed:false}; }
/* Накопитель обновляем ГЕНЕРИЧНО по каждому событию — предикаты done остаются ЧИСТЫМИ (только читают). */
function apply(kind,p){
  if(kind==='pinch'){ if(p.zone==='ld'){ if(acc.lastLdFinger!=null && p.finger!==acc.lastLdFinger) acc.fingerChanged=true; acc.lastLdFinger=p.finger; } }
  else if(kind==='note'){ acc.noteFired=true; const d=p.deg;
    if(acc.sMin==null){ acc.sMin=acc.sMax=d; } else { if(d<acc.sMin)acc.sMin=d; if(d>acc.sMax)acc.sMax=d; } }
  else if(kind==='fx'){ acc.fxMoved=true; }
  else if(kind==='chord'){ acc.chordPlayed=true; }
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
  if(st.final) return t('tutor.final.prompt');
  if(detailShown) return recentlySeen() ? t('tutor.'+st.key+'.detail') : t('tutor.noHand');
  return t('tutor.'+st.key+'.prompt');
}
function paint(){
  if(active){
    textEl.textContent=curText();
    dotsEl.textContent=steps.map((_,i)=>i<=idx?'●':'○').join(' ');
    nextBtn.textContent = steps[idx].final ? t('tutor.done') : t('tutor.next');
    skipBtn.textContent = t('tutor.skip');
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
  else if(st.key==='step5') revealBar();                                            // шаг «нажми роль» — бар должен быть виден
  paint();
}
function complete(){ completing=true; clearTimeout(detailTimer); advTimer=setTimeout(advance, HOLD); }
function advance(){
  clearTimeout(detailTimer); clearTimeout(advTimer);
  idx++;
  if(idx>=steps.length){ exit(true); return; }   // прошли все шаги (не должно случаться — final без done) → как выполнено
  enterStep();
}

/* Запуск конкретного урока (после того, как приложение поднято). */
function startLesson(L){
  if(active) return;
  tutorReset();                                   // single-role соло — модель совпадает с экраном (сплит гасим)
  steps=L.steps.filter(s=>!s.gate || s.gate());   // аккорд-шаги выпадают в бесаккордовом ладу
  idx=0; acc=freshAcc(); lastSeenAt=0; active=true; curLesson=L.id;
  hooks.tutor=onEvent;                            // подписка ПОСЛЕ tutorReset (его role='ld' не влетит в шаг)
  bar.classList.add('on');
  enterStep();
}
/* Выход из урока: снимаем подписку/таймеры/подсветку, прячем полосу. completed → тихая галочка урока.
   Камеру/звук/игру НЕ трогаем — ВОЗВРАЩАЕМСЯ К СПИСКУ (из него — «Свободная игра» в игру). */
function exit(completed){
  active=false; hooks.tutor=null;
  clearTimeout(detailTimer); clearTimeout(advTimer);
  bar.classList.remove('on');
  if(scaleBtn) scaleBtn.classList.remove('tutorPoint');
  if(completed && curLesson) store.set(lessonKey(curLesson),'1');
  curLesson=null;
  openLessons();
}

nextBtn.onclick=()=>{ if(!active) return; if(steps[idx].final) exit(true); else advance(); };   // Next: финал=Готово(урок пройден), иначе шаг вперёд
skipBtn.onclick=()=>{ if(active) exit(false); };                                                 // Skip: к списку, без отметки
lessonClose.onclick=()=>closeLessons();                                                          // ✕: за списком стартовая карточка (до старта) или игра (во время)
lessonFree.onclick=()=>freePlay();
onLangChange(paint);                              // смена языка — перерисовать полосу шага и/или список
