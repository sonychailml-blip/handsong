import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
import { camFacing } from './state.js';
import { t } from './i18n.js';

/* ================= КАМЕРА + MEDIAPIPE ================= */
const video=document.getElementById('video');
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){this.rect(x,y,w,h);return this;};
let landmarker=null;                             // lastTs/latest — у цикла, в main.js
let stream=null;                                 // текущий видеопоток — держим, чтобы гасить дорожки при переключении камеры
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize',resize); resize();

/* Открыть камеру facingMode на тот же <video>. Прежние дорожки СНАЧАЛА гасим: телефон обычно не
   даёт открыть вторую камеру, пока жива первая. Если новый запрос упадёт — бросаем наверх (дорожки
   уже погашены), откат на прежнюю камеру делает вызывающий (ui.js). */
async function openCamera(facing){
  if(stream){ for(const tr of stream.getTracks()) tr.stop(); stream=null; }
  stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:facing,width:{ideal:640},height:{ideal:480}},audio:false});
  video.srcObject=stream; await video.play();
}

async function initVision(msg){
  msg(t('load.model'));
  const files=await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
  landmarker=await HandLandmarker.createFromOptions(files,{
    baseOptions:{
      modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate:"GPU"
    },
    runningMode:"VIDEO", numHands:2,
    minHandDetectionConfidence:0.5, minTrackingConfidence:0.5
  });
  msg(t('load.camera'));
  await openCamera(camFacing);                   // стартовая камера — из состояния (по умолчанию фронтальная 'user')
}

/* Переключение камеры (фронт↔тыл) — уже ПОСЛЕ старта (панель #bar видна только после «▶ Запустить»,
   поэтому кнопки на странице при загрузке нет — правило AudioContext/камера соблюдено). MediaPipe
   читает ТОТ ЖЕ элемент <video>, поэтому landmarker НЕ пересоздаём. Бросает при отказе — откат в ui.js. */
async function switchCamera(facing){ await openCamera(facing); }

/* Экспорт: landmarker через export-клаузу — живая связка (null до initVision). */
export { video, canvas, ctx, landmarker, initVision, switchCamera };
