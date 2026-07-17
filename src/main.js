import { initAudio, AC } from './audio.js';
import { refreshStyle } from './backing.js';
import { video, landmarker, initVision } from './vision.js';
import { processHands } from './gestures.js';
import { drawVideoBackground, drawOverlays } from './draw.js';
import { $ } from './ui.js';                     // side-effect: строит меню, вешает обработчики, регистрирует hooks
 
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

/* ВРЕМЕННО (диагностика GPU-делегата): всё на экран — на телефоне нет DevTools.
   inf=время инференса, aud=звук, gl=WebGL2-рендерер страницы, simd=поддержка WASM SIMD,
   coi=crossOriginIsolated, wasm=какой бинарь+версия, log=сообщения MediaPipe.
   Удалить после диагностики. */
const _diag=(window.__diag={inf:'инф —',aud:'звук —',gl:'',simd:'',coi:'',wasm:'',log:''});

/* B — захват сообщений MediaPipe/Emscripten (Emscripten печатает через console.*) */
{ const _rx=/gpu|xnnpack|webgl|tflite|delegate|simd|wasm/i, _buf=[];
  for(const m of ['log','info','warn','error']){ const o=console[m].bind(console);
    console[m]=(...a)=>{ o(...a); try{ const s=a.join(' ');
      if(_rx.test(s)){ _buf.push(s.slice(0,90)); if(_buf.length>6)_buf.shift(); _diag.log=_buf.join(' ┃ '); } }catch(e){} }; } }

/* C — есть ли у страницы аппаратный WebGL2 (Chrome 130+ роняет контекст без железа) */
try{ const gl=document.createElement('canvas').getContext('webgl2');
  if(!gl)_diag.gl='gl: webgl2 НЕТ';
  else{ const e=gl.getExtension('WEBGL_debug_renderer_info');
    _diag.gl='gl: '+String(e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)).slice(0,52); }
}catch(e){ _diag.gl='gl: err '+e.message; }

/* E — поддержка WASM SIMD (байты-зонд из wasm-feature-detect) */
_diag.simd='simd '+(WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))?'да':'НЕТ');

/* F — cross-origin isolation (доступны ли WASM-потоки; фактор «как отдаём страницу») */
_diag.coi='coi '+(self.crossOriginIsolated?'да':'нет');

/* экранный блок диагностики (обновляется в loop) */
const _box=document.createElement('div');
_box.style.cssText='position:fixed;left:4px;top:4px;z-index:9999;max-width:96vw;'+
  'font:11px/1.35 monospace;color:#0f0;background:rgba(0,0,0,.72);padding:4px 6px;white-space:pre-wrap;pointer-events:none';
document.body.appendChild(_box);
function _diagBox(){ _box.textContent=[_diag.inf,_diag.aud,_diag.wasm,_diag.simd,_diag.coi,_diag.gl,_diag.log].filter(Boolean).join('\n'); }
_diagBox();                                                         // первый показ (gl/simd/coi) ещё до старта

let _infBuf=[];
function _diagInf(dt){
  _infBuf.push(dt); if(_infBuf.length>30)_infBuf.shift();
  let s=0,m=0; for(const v of _infBuf){ s+=v; if(v>m)m=v; }
  _diag.inf=`инф ${(s/_infBuf.length).toFixed(1)}/${m.toFixed(1)}мс`;
}

function loop(){
  requestAnimationFrame(loop);
  drawVideoBackground();                     // фон — ДО детекции, тем же кадром видео
  if(video.readyState>=2&&landmarker){
    const ts=performance.now();
    if(ts>lastTs){
      const _t0=performance.now();                                    // ВРЕМЕННО Step1
      try{latest=landmarker.detectForVideo(video,ts);}catch(e){}      // читает тот же кадр (тик не прерывался)
      _diagInf(performance.now()-_t0);                                // ВРЕМЕННО Step1
      lastTs=ts;
    }
  }
  processHands(latest);
  drawOverlays(latest);                      // накладки — ПОСЛЕ, поверх того же кадра
  _diagBox();                                                       // ВРЕМЕННО диагностика
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
    _diag.aud=`звук b${(AC.baseLatency*1000).toFixed(1)} o${(AC.outputLatency*1000).toFixed(1)}мс sr${AC.sampleRate}`;  // ВРЕМЕННО Step1
    refreshStyle(true);
    await initVision(msg);
    /* D — какой wasm реально загрузил FilesetResolver (SIMD/NO-SIMD) + версия tasks-vision */
    try{ const nm=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/tasks-vision|vision_wasm/.test(n));
      const w=nm.find(n=>/\.wasm(\?|$)/.test(n))||'';
      const v=(nm.find(n=>/tasks-vision@/.test(n))||'').match(/tasks-vision@([\d.]+)/);
      _diag.wasm=`wasm ${/nosimd/.test(w)?'NO-SIMD':(w?'SIMD':'?не найден')} v${v?v[1]:'?'}`;
    }catch(e){ _diag.wasm='wasm err'; }                              // ВРЕМЕННО диагностика
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
