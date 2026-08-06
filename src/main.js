import { initAudio, AC } from './audio.js';
import { video, landmarker, initVision } from './vision.js';
import { processHands } from './gestures.js';
import { drawVideoBackground, drawOverlays } from './draw.js';
import { captureFrame } from './clip.js';         // фиксация кадра в видеозапись — в КОНЦЕ цикла, после отрисовки (no-op, пока не идёт видеозапись)
import { $, revealBar } from './ui.js';          // side-effect: строит меню, вешает обработчики, регистрирует hooks; revealBar — показать панель на старте
import './demo.js';                              // side-effect: демо «путешествие по строям» (без камеры). Его КНОПКИ на старте БОЛЬШЕ НЕТ — demo.js вешает обработчик защитно (if(db)), сам код жив и ждёт переезда внутрь обучения
import { openLessons, wireStarter } from './tutor.js';   // обучение: «Обучение» открывает список уроков; выбор урока сам поднимает приложение через startApp
import { t } from './i18n.js';

/* =====================================================================
   HANDSONG — жестовый синтезатор + интерактивный учебник ладов
   ---------------------------------------------------------------------
   ЭТОТ ФАЙЛ — КОРЕНЬ КОМПОЗИЦИИ, и только он. Здесь нет ни музыки, ни
   геометрии экрана, ни состояния: он лишь СОБИРАЕТ модули и крутит цикл.
   Всё остальное живёт там, где ему место (см. CLAUDE.md, «Module map»).

   ДВЕ ВЕЩИ, за которые отвечает main:

   1) КАДР (loop). Один синхронный тик, порядок ОБЯЗАТЕЛЕН (правило #8):
      видеофон → детекция MediaPipe → processHands → накладки → захват
      кадра в клип. Фон рисуется ДО детекции, накладки ПОСЛЕ, и оба берут
      ОДИН И ТОТ ЖЕ кадр видео — иначе рука разъедется с картинкой.

   2) СТАРТ (startApp). ЕДИНСТВЕННЫЙ путь подъёма приложения, общий у
      «▶ Играть» и «Обучение»: AudioContext создаётся только внутри клика
      (правило #1), поэтому обе кнопки зовут startApp В ОБРАБОТЧИКЕ, а не
      после await. wireStarter отдаёт его tutor.js, чтобы выбор урока сам
      поднимал приложение тем же кликом.

   Раскладка экрана здесь НЕ описывается: она одна (вертикальная, роль на
   весь экран, опциональный сплит на две половины в ландшафте) и живёт в
   state/draw/gestures. Прежней трёхколоночной ПК-раскладки НЕТ — режим
   удалён целиком вместе с uiMode/drawPC, искать её в коде бесполезно.
   ===================================================================== */

/* ================= ЦИКЛ ================= */
let lastTs=-1, latest=null;

function loop(){
  requestAnimationFrame(loop);
  drawVideoBackground();                     // фон — ДО детекции, тем же кадром видео
  if(video.readyState>=2&&landmarker){
    const ts=performance.now();
    if(ts>lastTs){
      try{latest=landmarker.detectForVideo(video,ts);}catch(e){}      // читает тот же кадр (тик не прерывался)
      lastTs=ts;
    }
  }
  processHands(latest);
  drawOverlays(latest);                      // накладки — ПОСЛЕ, поверх того же кадра
  captureFrame();                            // если идёт видеозапись — фиксируем ИМЕННО этот отрисованный кадр (захват в фазе с отрисовкой); иначе no-op
}

/* ================= СТАРТ =================
   AudioContext создаётся строго по клику пользователя — иначе браузеры блокируют автовоспроизведение.
   ОДИН путь старта startApp() у «Играть» И «Обучение»: оба зовут его ВНУТРИ клика (правило жеста цело —
   initAudio создаёт AC в синхронной части клика ещё до первого await). «Обучение» = тот же старт + тур. */
let started=false;
async function startApp(){
  if(started) return true;
  const btn=$('startBtn'), learn=$('learnBtn'), msgEl=$('loadmsg'), msg=s=>msgEl.textContent=s;
  btn.disabled=true; if(learn) learn.disabled=true;
  try{
    await initAudio();                       // async: ждём загрузку KS-ворклета (иначе banks[] разъедется)
    await AC.resume();
    await initVision(msg);
    try{await navigator.wakeLock.request('screen');}catch(e){}
    $('start').classList.remove('on');
    $('bar').classList.add('on');
    revealBar();                             // панель видна на старте (учит, где меню), затем сама сворачивается через BAR_HIDE_MS
    started=true;
    loop();
    return true;
  }catch(err){
    btn.disabled=false; if(learn) learn.disabled=false;
    msg(t('load.error',{msg:(err&&err.message?err.message:err)}));
    return false;
  }
}
wireStarter(startApp);                                                       // урок/«Свободная игра» поднимают приложение этим (правило #1: старт зовётся в клике выбора)
$('startBtn').onclick=()=>{ startApp(); };                                   // «Играть» — как прежде
$('learnBtn').onclick=()=>{ openLessons(); };                                // «Обучение» — открыть список уроков (приложение поднимет уже выбор урока/«Свободная игра»)
