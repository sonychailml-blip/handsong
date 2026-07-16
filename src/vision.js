import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
 
/* ================= КАМЕРА + MEDIAPIPE ================= */
const video=document.getElementById('video');
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){this.rect(x,y,w,h);return this;};
let landmarker=null;                             // lastTs/latest — у цикла, в main.js
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize',resize); resize();
 
async function initVision(msg){
  msg('Загружаю модель распознавания рук…');
  const files=await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  landmarker=await HandLandmarker.createFromOptions(files,{
    baseOptions:{
      modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate:"GPU"
    },
    runningMode:"VIDEO", numHands:2,
    minHandDetectionConfidence:0.5, minTrackingConfidence:0.5
  });
  msg('Включаю камеру…');
  const stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
  video.srcObject=stream; await video.play();
}
 
/* Экспорт: landmarker через export-клаузу — живая связка (null до initVision). */
export { video, canvas, ctx, landmarker, initVision };
