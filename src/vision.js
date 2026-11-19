import { HandLandmarker, FilesetResolver } from "../vendor/mediapipe/0.10.35/vision_bundle.mjs";
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

/* MediaPipe — С НАШЕГО ДОМЕНА, а не с jsDelivr/Google storage: те же файлы той же закреплённой версии 0.10.35,
   байт в байт (хэши и источники — vendor/mediapipe/0.10.35/README.md; как Night в CORE-22). Пути — от адреса
   ЭТОГО модуля (import.meta.url), не от корня: так работает и из подпапки GitHub Pages. Папка = версия. */
const MP=new URL('../vendor/mediapipe/0.10.35/', import.meta.url);
const MP_WASM=new URL('wasm', MP).href, MP_MODEL=new URL('hand_landmarker.task', MP).href;

async function initVision(msg){
  msg(t('load.model'));
  const files=await FilesetResolver.forVisionTasks(MP_WASM);   // сам выберет пару SIMD или _nosimd (обе лежат в wasm/)
  landmarker=await HandLandmarker.createFromOptions(files,{
    baseOptions:{
      modelAssetPath:MP_MODEL,
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
