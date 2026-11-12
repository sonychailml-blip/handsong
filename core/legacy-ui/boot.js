import { initAudio, AC } from '../audio.js';
import { video, initDetector, startCamera, setHandsSink, pollFrame } from '../vision.js';
import { processHands, handsView } from '../gestures.js';
import { syncViewRect, drawOverlays, stackFrame } from './draw.js';   // VIS1a: the play screen = the stack of visual modules
import { BUS } from '../pure/bus.js';   // VIS1a: the visuals' bus (hands, picture)
import { captureFrame } from '../clip.js';         // фиксация кадра в видеозапись — в КОНЦЕ цикла, после отрисовки (no-op, пока не идёт видеозапись)
import { $, revealBar, songResumeOffer } from './ui.js';          // side-effect: строит меню, вешает обработчики, регистрирует hooks; revealBar — показать панель на старте
import { t } from '../i18n.js';
import { loadReport } from '../scales.js';   // F5: итог загрузки файлов данных ладов — известие на стартовой карточке
import { rollOpen, arrOpen } from '../state.js';   // S5.0: редактор дорожки открыт — камеру не читаем, игровое поле не рисуем. AR1: и окно аранжировки — та же ветка
import { latStart, latFrame, latHands, latIdle } from './latmeter.js';   // LAT1: latency per stage (Sound panel → «Latency meter», R.latency())
import { asStart } from '../autosave.js';   // AUTOSAVE1: the song kept on this device by itself
import { profileApply, profileOf } from '../profile.js';

/* =====================================================================
   HANDSONG — жестовый синтезатор + интерактивный учебник ладов
   ---------------------------------------------------------------------
   ЭТОТ ФАЙЛ — КОРЕНЬ КОМПОЗИЦИИ, и только он. Здесь нет ни музыки, ни
   геометрии экрана, ни состояния: он лишь СОБИРАЕТ модули и крутит цикл.
   Всё остальное живёт там, где ему место (см. CLAUDE.md, «Module map»).

   ДВЕ ВЕЩИ, за которые отвечает main:

   1) FRAME (LAT2, rule #8). Each new camera frame is detected once (vision.js,
      a worker when possible) and its hands go to processHands at once (onHands);
      every screen frame (loop) draws THAT frame's snapshot, then the overlays,
      then the clip capture — picture and hands are one camera frame.

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
/* LAT2: two clocks instead of one tick. HANDS — each new camera frame, once, when its detection is done (vision.js's pump → onHands):
   the crop, processHands (sound now, not at the next screen frame), the meter. PICTURE — every screen frame (loop): the snapshot of the
   frame whose hands are current, then the overlays over it (rule #8: picture and hands are one camera frame — the only picture since
   LAT3; the live video only until the first frame is detected). */
let latest=null, shown=null, OPT={};   // SPLIT-2: OPT = what the app's entry gave boot()

/* ⛳ КАДР ДОРИСОВЫВАЕТСЯ ВСЕГДА — ОШИБКА В ОБРАБОТКЕ РУК НЕ СТИРАЕТ ЭКРАН. processHands ведёт жесты, звук и ЗАПИСЬ (W* → rec*), и
   исключение там обрывало весь кадр ДО отрисовки: сетка и точки пальцев пропадали, пока держится нота (так и случилось — запись
   читала пропавшее поле состояния на каждом кадре удержанной ноты). Ошибка записи не вправе отнять у инструмента его глаза.
   ⛔ И НЕ ПРЯЧЕМ ЕЁ: каждая РАЗНАЯ ошибка (сообщение + первая строка стека) печатается в консоль ОДИН раз, целиком, со стеком, — без
   потока на каждом кадре, который утопил бы всё прочее. Звук и запись этого кадра при ошибке могли остаться недоделанными — так было
   и до стража (кадр обрывался весь); страж лишь спасает картинку. */
const loopErrSeen=new Set();
function handsGuarded(res){
  try{ processHands(res); }
  catch(e){
    const k=String((e&&e.stack)||e).split('\n').slice(0,2).join(' | ');
    if(!loopErrSeen.has(k)){ loopErrSeen.add(k); console.error('[кадр] ошибка в обработке рук (жесты/звук/запись) — кадр дорисован; одна и та же ошибка печатается один раз:', e); }   // eslint-disable-line no-console
  }
}
const studio=()=>rollOpen||arrOpen;   // the editor or the arrangement window: the camera stays open but is not read
/* one processed camera frame (vision.js): its hands drive gestures and sound at once; its picture becomes the shown one */
function onHands(f){
  if(studio()){ if(f.frame) f.frame.close(); return; }
  const tA=performance.now();
  if(f.frame) syncViewRect(f.frame.width, f.frame.height);   // the crop of this frame before its hands are remapped (rule #12)
  latest=OPT.frameFilter ? OPT.frameFilter(f.res, tA) : f.res; BUS.set('hands', latest);   // an app's filter (Night's ghost) sees the hands first   // VIS1a: the hands of this processed frame, for the visual modules
  handsGuarded(latest);                      // страж кадра: ошибка в жестах/звуке/записи печатается один раз и НЕ обрывает отрисовку
  BUS.set('handsView', handsView());          // VIS1c: each hand's play point, depth and role for the scene (read-only)
  const tB=performance.now();
  if(f.frame){ if(shown) shown.close(); shown=f.frame; }
  latHands(f, tA, tB);                       // LAT1/LAT2: the latency meter (latmeter.js)
}
function loop(){
  requestAnimationFrame(loop);
  /* ⛳ РЕДАКТОР ДОРОЖКИ (S5.0): камеру НЕ читаем и НЕ рисуем — экран занят сеткой, а распознавание стоит дороже всего остального вместе
     взятого (см. «Планировщик» в CLAUDE.md). Поток камеры при этом ОСТАЁТСЯ открытым: возврат в игру мгновенный и без повторного запроса
     прав. ⚠️ latest СБРАСЫВАЕМ: processHands на выходе из редактора иначе получил бы ПОСЛЕДНИЙ ДОКАДРОВЫЙ результат камеры и сыграл бы
     щипок, которого никто не делал. ⚠️ processHands(null) зовём каждый кадр НАМЕРЕННО: «рук в кадре нет» закрывает удержанные щипки
     штатным watchdog'ом (120 мс) и уводит выразительность к нейтрали. LAT2: насос кадров в это время кадров не берёт (studio). */
  if(studio()){   // AR1: окно аранжировки — тот же «экран студии»
    latest=null; if(shown){ shown.close(); shown=null; }
    if(BUS.get('hands')!=null){ BUS.set('hands', null); BUS.set('handsView', []); }
    handsGuarded(null);                      // страж кадра (см. handsGuarded): ошибка в руках не обрывает отрисовку редактора
    drawOverlays(null);
    captureFrame();
    latIdle();                               // LAT1: no camera here — no frame interval measured across this branch
    return;
  }
  /* CORE-12: an app's detection pause (Night: a room building): no frame is taken; the hands read as gone, so held notes close by their
     watchdog as in the editor; the screen keeps drawing (the room renders its first frames meanwhile) */
  if(OPT.detectPause && OPT.detectPause()){ latest=null; if(BUS.get('hands')!=null){ BUS.set('hands', null); BUS.set('handsView', []); } handsGuarded(null); }
  else pollFrame();                          // LAT2: only without requestVideoFrameCallback — a new camera frame found by its time
  const t0=performance.now();
  BUS.set('picture', shown || video);        // the frame whose hands are shown (rule #8)
  stackFrame(t0);                            // VIS1a: camera (background) → surface (instrument) → hands (overlay), as drawVideoBackground + drawOverlays drew
  if(OPT.afterDraw) OPT.afterDraw(t0);       // CORE-6: an app's own drawing while this frame's picture is still open (a later callback may find it closed)
  captureFrame();                           // если идёт видеозапись — фиксируем ИМЕННО этот отрисованный кадр; иначе no-op
  latFrame(t0, performance.now());           // LAT1: drawing time and the screen-frame interval
}

/* ================= СТАРТ =================
   AudioContext создаётся строго по клику пользователя — иначе браузеры блокируют автовоспроизведение.
   ОДИН путь старта startApp() у «Играть» И «Обучение»: оба зовут его ВНУТРИ клика (правило жеста цело —
   initAudio создаёт AC в синхронной части клика ещё до первого await). «Обучение» = тот же старт + тур. */
/* F5: файлы данных ладов: пропущенные — общее известие на стартовой карточке (строка #loadmsg; по строке на файл — в консоли,
   scaleload.js); ничего не загрузилось — известие об аварийной паре. Нажатие «Играть» пишет в ту же строку ход запуска. */
if(loadReport.emergency || loadReport.problems.length){ const el=$('loadmsg'), nU=loadReport.problems.filter(p=>p.user).length, nB=loadReport.problems.length-nU;
  if(el) el.textContent = loadReport.emergency ? t('data.emergency')
    : [nB ? t('data.skipped',{n:nB}) : '', nU ? t('data.userSkipped',{n:nU}) : ''].filter(Boolean).join(' '); }   // F6: файлы пользователя — отдельной фразой
/* 0b: the start is staged — sound and the hand model are built ONCE; a failed camera leaves the card usable («Try again» retries only the
   camera; a second press never builds a second AudioContext or reloads the model). */
/* CORE-11: a page whose profile records nothing keeps no song — no autosave poll, no «Continue where you left off?» (no profile: as before) */
const keepsSongs=()=>{ const p=OPT.profile ? profileOf(OPT.profile) : null; return !p || p.recording!==false; };
let started=false, starting=false;
const stage={ audio:false, det:false };
/* the start card after a failure: a message by its kind (core camErrKind: busy / notfound / denied, else the generic one) + «Try again» */
function startFail(err){
  const btn=$('startBtn'), learn=$('learnBtn'), retry=$('camRetry'), kind=err&&err.camKind;
  btn.disabled=false; if(learn) learn.disabled=false; $('start').classList.remove('busy');
  const own=OPT.failText ? OPT.failText(err) : null;   // CORE-18 (opt-in): the app's own words for a failed start
  $('loadmsg').textContent= own || (kind&&kind!=='other' ? t('cam.'+kind) : t('load.error',{msg:(err&&err.message?err.message:err)}));
  if(retry) retry.hidden=false;
}
/* CORE-19 (opt-in; NIGHT-11 part 3, audit P1) — THE START IN PARALLEL. opt.parallel: in the tap the audio context is made first (rule #1, the
   synchronous part), then the camera request and the hand model run TOGETHER (the permission prompt appears at once, while the model loads);
   opt.earlyModel: the model starts before the tap, when the page has loaded (not with Save-Data on). The first failure ends the start with its
   message as before; the other half goes on and a retry reuses it. opt.onCamera() once the camera runs (both paths). Without the options: the old
   staged order, untouched. */
let detP=null, detShow=null, detLast='';
function detStart(){
  if(stage.det) return Promise.resolve();
  if(detP) return detP;
  const show=s=>{ detLast=s; if(detShow) detShow(s); };
  const p= OPT.startSay ? initDetector(show, { say:(k,f)=>show(OPT.startSay(k,f)||t(k)), stallMs:OPT.modelStallMs, ...(OPT.freshRetry ? { freshRetry:true } : {}) }) : initDetector(show);   // CORE-20: freshRetry
  detP=p.then(()=>{ stage.det=true; detP=null; }, e=>{ detP=null; throw e; });
  return detP;
}
function earlyDetector(){
  try{ const c=navigator.connection; if(c && c.saveData) return false; }catch(e){}
  detStart().catch(e=>console.warn('[start] the hand model failed before the tap — the tap tries again:', e));
  return true;
}
async function startParallel(msg){
  const audioP= stage.audio ? null : initAudio();   // rule #1: the context is created in this click's synchronous part
  const det=detStart(); detShow=msg; if(detLast) msg(detLast);
  let camDone=false, over=false;   // over: this start has ended (a failure's message is never overwritten by the half still running)
  const camP=startCamera().then(()=>{ camDone=true; if(OPT.onCamera) OPT.onCamera(); });
  det.catch(()=>{}); camP.catch(()=>{});
  try{
    if(audioP){ await audioP; stage.audio=true; }
    await AC.resume();
    await Promise.all([ det.then(()=>{ detShow=null; if(!camDone && !over) msg(OPT.startSay && OPT.startSay('load.camera') || t('load.camera')); }), camP ]);
  } finally { detShow=null; over=true; }
}
async function startApp(){
  if(started) return true;
  if(starting) return false;                 // a second press while starting does nothing
  starting=true;
  const btn=$('startBtn'), learn=$('learnBtn'), msgEl=$('loadmsg'), msg=s=>msgEl.textContent=s, retry=$('camRetry');
  btn.disabled=true; if(learn) learn.disabled=true; if(retry) retry.hidden=true;
  const card=$('start'); card.classList.add('busy');   // LAT2: the start card shows that it is loading (a pulse on the message line)
  try{
    if(OPT.parallel) await startParallel(msg);   // CORE-19 (opt-in): the camera beside the model
    else {
    if(!stage.audio){ await initAudio(); stage.audio=true; }   // rule #1: the context is created in this click's synchronous part (first press only)
    await AC.resume();
    const say=OPT.startSay ? (k,f)=>msg(OPT.startSay(k,f)||t(k)) : null;   // CORE-18 (opt-in): the app's own loading words, the model's progress
    if(!stage.det){ if(say) await initDetector(msg, { say, stallMs:OPT.modelStallMs, ...(OPT.freshRetry ? { freshRetry:true } : {}) }); else await initDetector(msg); stage.det=true; }
    if(say) say('load.camera'); else msg(t('load.camera'));
    await startCamera();                     // 0b: one getUserMedia, one retry after ~1 s, tracks released on failure
    if(OPT.onCamera) OPT.onCamera();
    }
    try{await navigator.wakeLock.request('screen');}catch(e){}
    card.classList.remove('busy','on');
    $('bar').classList.add('on');
    revealBar();                             // панель видна на старте (учит, где меню), затем сама сворачивается через BAR_HIDE_MS
    { const why=OPT.profile ? profileApply(OPT.profile) : null; if(why) console.warn('[profile] '+why); }   // C0: the app opens in the profile its entry names
    started=true;
    loop();
    latStart();                              // LAT1: the latency meter starts with the camera and the audio
    if(keepsSongs()) asStart();              // AUTOSAVE1: the autosave poll (writes only after a change has settled); CORE-11: not in a profile that records nothing
    if(keepsSongs()) import('../render.js').catch(e=>console.warn('[autoFreeze] render.js failed to load', e));   // AF3: auto-freeze (watcher + queue) lives behind render.js — loaded once the engine runs; CORE-20: not in a profile that records nothing (its probes load it themselves)
    return true;
  }catch(err){
    console.warn('[start] failed:', err);
    startFail(err);
    return false;
  }finally{ starting=false; }
}
/* SPLIT-2: an app's entry calls this once. CORE-19: parallel, earlyModel, onCamera (above). CORE-20: freshRetry — a retried model build skips what the page preloaded (vision.initDetector). CORE-18: failText (err) → the app's words for a failed start or null; startSay (key, frac) → its loading words or null (with the model's progress); modelStallMs. opt: profile (the id to open in), frameFilter (res, t) → res, afterDraw (t) once per play-screen frame (CORE-6), detectPause () → true while no camera frame may be taken (CORE-12). Returns startApp for the entry's own buttons (still inside their click: rule #1).
   ?probe loads what the page declares in <link rel="handsong-probes">: without the flag, or without the tag (a shipped page), nothing is loaded. */
export function boot(opt={}){
  OPT=opt; if(opt.parallel && opt.earlyModel) setTimeout(earlyDetector, 0);   // CORE-19: the model before the tap
  setHandsSink(onHands, opt.detectPause ? ()=>studio() || !!opt.detectPause() : studio);   // CORE-12: an app's pause joins the editor's (absent: the editor's alone)
  if(new URLSearchParams(location.search).has('probe')){ const l=document.querySelector('link[rel="handsong-probes"]');
    if(l) import(l.href).then(m=>m.install()).catch(e=>console.warn('[probe] the probes failed to load', e)); }
  $('startBtn').onclick=()=>{ startApp().then(ok=>{ if(ok && keepsSongs()) songResumeOffer(); }); };   // AUTOSAVE1: «Continue where you left off?» (Play only, not a lesson)
  { const r=$('camRetry'); if(r) r.onclick=()=>{ startApp().then(ok=>{ if(ok && keepsSongs()) songResumeOffer(); }); }; }   // 0b: «Try again» after a failed start
  return startApp;
}

export { startFail };   // probe only (0b): the failure message on the start card
