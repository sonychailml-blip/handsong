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

/* LAT1b test switches (session only, never saved; defaults = the app as before): hands tracked, the model's processor, the camera
   frame rate requested. camFps null = no frame rate requested (the default constraint set, unchanged). */
const VISION_DEF={ hands:2, delegate:'GPU', camFps:null };
const opts={ ...VISION_DEF };
let camStartT=NaN;   // performance time the current camera stream started playing (LAT1b: «startup» long tasks)

/* Open camera `facing` on the same <video>. Old tracks are stopped FIRST (a phone rarely opens a second camera while the first lives);
   a failed request throws upward — the caller rolls back (ui.js). LAT1b: frameRate is requested only when the test switch asks. */
const camWant=()=>({ facingMode:camFacing, width:{ideal:640}, height:{ideal:480}, ...(opts.camFps ? { frameRate:{ideal:opts.camFps} } : {}) });
async function openCamera(facing){
  if(stream){ for(const tr of stream.getTracks()) tr.stop(); stream=null; }
  const want={ ...camWant(), facingMode:facing };
  stream=await navigator.mediaDevices.getUserMedia({ video:want, audio:false });
  video.srcObject=stream; await video.play();
  camStartT=performance.now();
}

/* LAT1b: which processor the hand model REALLY runs on. MediaPipe's task API does not report it; its WebAssembly prints its own log
   lines to the console — the CPU path announces the XNNPACK delegate, the GPU path only its WebGL context. A tap
   on the console keeps those lines (only MediaPipe-shaped ones; everything is passed through unchanged) since the last (re)start. */
/* TAP_MS: two minutes after a (re)start — long enough to see lines printed when the hand model first meets a hand */
const MP_LINE=/^[IWEF]\d{4} |TensorFlow Lite|XNNPACK|Graph successfully/, TAP_MS=120000;
let mpLog=[], tapOff=null, tapT=0, xnnBefore=false, xnnOnGpu=false;   // xnnBefore: an earlier window showed the XNNPACK line (TFLite prints it once per page); xnnOnGpu: it came while GPU was asked
function mpTap(){   // only for TAP_MS after a (re)start: outside that window the console is the browser's own (DevTools source lines stay true)
  clearTimeout(tapT); tapT=setTimeout(()=>{ if(tapOff){ tapOff(); tapOff=null; } }, TAP_MS);
  if(tapOff) return;
  const orig={};
  for(const k of ['log','info','warn','error','debug']){ const f=console[k]; if(typeof f!=='function') continue; orig[k]=f;
    console[k]=function(...a){ const s=a[0]; if(typeof s==='string' && s.length<600 && MP_LINE.test(s) && mpLog.length<40) mpLog.push(s); return f.apply(this,a); }; }
  tapOff=()=>{ for(const k in orig) console[k]=orig[k]; };
}
/* measured (runner, 2026-10-15): BOTH paths create a WebGL context (image conversion); the CPU path creates the XNNPACK delegate, and
   TensorFlow Lite announces it ONCE per page. SND-F1b fix (the user saw «unknown» on a page where he had not asked for CPU): the read-out
   starts from what was ASKED and SUCCEEDED (MediaPipe throws, it does not fall back, when a processor cannot start) and only evidence
   changes it — never «unknown» for GPU. Asked GPU: 'GPU', or 'GPU+CPU' once an XNNPACK line came while GPU was asked (a part of the model
   on the processor). Asked CPU: 'CPU' when its line came now or earlier on this page (`once`), 'unknown' only if it never came. */
const XNN=/XNNPACK/i;
function delegateOf(lines, before, asked){
  const xnn=lines.some(s=>XNN.test(s));
  if(asked==='GPU') return xnn||xnnOnGpu ? 'GPU+CPU' : 'GPU';
  return xnn||before ? 'CPU' : 'unknown';
}
const newWindow=()=>{ if(mpLog.some(s=>XNN.test(s))){ xnnBefore=true; if(opts.delegate==='GPU') xnnOnGpu=true; } mpLog=[]; mpTap(); };
const modelInfo=()=>({ requested:opts.delegate, actual:delegateOf(mpLog, xnnBefore, opts.delegate), once:opts.delegate==='CPU' && xnnBefore && !mpLog.some(s=>XNN.test(s)), hands:opts.hands,
  evidence:mpLog.filter(s=>/gl_context.*GL version|XNNPACK|delegate/i.test(s)).map(s=>s.replace(/^[IWEF]\d{4} [\d:.]+ \d+ /,'').slice(0,160)) });

/* LAT1b: the camera's request and what the browser granted (track.getSettings) */
function camInfo(){
  const tr=stream&&stream.getVideoTracks()[0], s=tr&&tr.getSettings ? tr.getSettings() : {};
  return { requested:{ width:640, height:480, frameRate:opts.camFps }, granted:{ width:s.width??null, height:s.height??null, frameRate:s.frameRate??null }, startT:camStartT };
}

async function initVision(msg){
  msg(t('load.model'));
  const files=await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
  newWindow();
  landmarker=await HandLandmarker.createFromOptions(files,{
    baseOptions:{
      modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate:opts.delegate
    },
    runningMode:"VIDEO", numHands:opts.hands,
    minHandDetectionConfidence:0.5, minTrackingConfidence:0.5
  });
  msg(t('load.camera'));
  await openCamera(camFacing);                   // стартовая камера — из состояния (по умолчанию фронтальная 'user')
}

/* Переключение камеры (фронт↔тыл) — уже ПОСЛЕ старта (панель #bar видна только после «▶ Запустить»,
   поэтому кнопки на странице при загрузке нет — правило AudioContext/камера соблюдено). MediaPipe
   читает ТОТ ЖЕ элемент <video>, поэтому landmarker НЕ пересоздаём. Бросает при отказе — откат в ui.js. */
async function switchCamera(facing){ await openCamera(facing); }

/* LAT1b test switches — each re-initialises only what it needs: hands and processor through the landmarker's own setOptions (the same
   landmarker, its graph rebuilt), the frame rate by reopening the camera on the same <video>. Values outside the offered ones refuse. */
async function setHandsTracked(n){
  if(n!==1&&n!==2) throw new Error('hands tracked: 1 or 2');
  if(n===opts.hands) return; if(!landmarker) throw new Error('the hand model is not running yet');
  await landmarker.setOptions({ numHands:n }); opts.hands=n;
}
async function setModelDelegate(d){
  if(d!=='GPU'&&d!=='CPU') throw new Error('model processor: GPU or CPU');
  if(d===opts.delegate) return; if(!landmarker) throw new Error('the hand model is not running yet');
  const keep=mpLog, kb=xnnBefore; newWindow();
  try{ await landmarker.setOptions({ baseOptions:{ delegate:d } }); opts.delegate=d; }
  catch(e){ mpLog=keep; xnnBefore=kb; throw e; }
}
async function setCamFps(f){
  if(f!==null&&f!==30&&f!==60) throw new Error('camera frame rate: default, 30 or 60');
  if(f===opts.camFps) return;
  const keep=opts.camFps; opts.camFps=f;
  try{ await openCamera(camFacing); } catch(e){ opts.camFps=keep; try{ await openCamera(camFacing); }catch(e2){} throw e; }
}
const visionOpts=()=>({ ...opts });

/* Экспорт: landmarker через export-клаузу — живая связка (null до initVision). */
export { video, canvas, ctx, landmarker, initVision, switchCamera,
  camInfo, modelInfo, visionOpts, VISION_DEF, setHandsTracked, setModelDelegate, setCamFps };   // LAT1b: diagnostics read-outs and test switches
