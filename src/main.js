import { initAudio, AC } from './audio.js';
import { video, landmarker, initVision } from './vision.js';
import { processHands } from './gestures.js';
import { drawVideoBackground, drawOverlays } from './draw.js';
import { $ } from './ui.js';                     // side-effect: строит меню, вешает обработчики, регистрирует hooks
import './demo.js';                              // side-effect: кнопка «Послушать строи» на старте (демо строёв, без камеры)

/* =====================================================================
   AIR SYNTH 3 — жестовый синтезатор + интерактивный учебник ладов
   ---------------------------------------------------------------------
   Зоны экрана (по X, во всю высоту):
     [ ЭФФЕКТЫ 20% ] [ АККОРДЫ ~40% ] [ СОЛО ~40% ]
   Обе руки независимы: каждая играет ту зону, где начался её щипок.
   Эффекты и Z-реверб действуют ТОЛЬКО на соло-канал.
   Движок звука — чистый Web Audio (без библиотек): лид-банки из версии 2
   сохранены, добавлен пул аккордовых голосов и генеративная подложка.
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
}

/* ================= СТАРТ =================
   AudioContext создаётся строго по клику пользователя —
   иначе браузеры блокируют автовоспроизведение. */
$('startBtn').onclick=async()=>{
  const btn=$('startBtn'), msgEl=$('loadmsg'), msg=t=>msgEl.textContent=t;
  btn.disabled=true;
  try{
    initAudio();
    await AC.resume();
    await initVision(msg);
    try{await navigator.wakeLock.request('screen');}catch(e){}
    $('start').classList.remove('on');
    $('bar').classList.add('on');
    loop();
  }catch(err){
    btn.disabled=false;
    msg('Не получилось: '+(err&&err.message?err.message:err)+
        '. Проверьте доступ к камере и что страница открыта по https.');
  }
};
