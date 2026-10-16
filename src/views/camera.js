/* DRAW1 (DAY run 2026-10-16): the camera picture: the cover crop (syncViewRect) and the video background — moved from draw.js verbatim (draw.js is the facade). Canvas only; nothing visible changed. */
import { ctx, canvas, video } from '../vision.js';
import { mirrored, setViewRect } from '../state.js';
import { coverView } from '../config.js';

/* Видео-фон рисуем ДО детекции (тот же синхронный тик = тот же кадр видео),
   накладки — ПОСЛЕ. Так пиксели видео и точки руки берутся из ОДНОГО кадра:
   экран показывает то, ЧТО ПРОЗВУЧИТ, а не гонит свежее видео впереди отстающих
   точек. Это фикс когерентности, НЕ латентности — видео становится позже, чтобы
   совпасть с точками (звук по-прежнему из того же старого кадра). */
/* LAT2: the crop for a frame of vw×vh on the current canvas — written before processHands too (main.onHands), so the hands of a frame
   are remapped by the very crop its picture is drawn with (rule #12) */
function syncViewRect(vw, vh){ if(vw&&vh) setViewRect(coverView(vw,vh,canvas.width,canvas.height)); }
/* src: the snapshot of the camera frame whose hands are shown (LAT2, rule #8), or the live <video> */
function drawVideoBackground(src=video){
  const W=canvas.width, H=canvas.height;
  /* COVER-кадрирование: на холст попадает суб-прямоугольник кадра с соотношением ХОЛСТА, поэтому
     картинка НЕ растягивается (прежняя прямая растяжка кадра 4:3 в широкое окно давала горизонтальный
     растяг). Прямоугольник считает config.coverView из интрин. пикселей видео (videoWidth/Height) и
     формы холста; ТУ ЖЕ область кладём в state.viewRect (setViewRect) — ремап точек (sx/sy) кадрирует
     ЕЮ ЖЕ, так что картинка и рука режутся ОДНИМ прямоугольником и не разъедутся (правило #12). Пишем
     rect ДО детекции (правило #8: этот кадр видео → detect → processHands читает свежий viewRect).
     Пока видео не готово (нет размеров) — держим прежний rect (дефолт полей), рисуем лишь затемнение.
     Зеркалим только фронтальную (mirrored — тот же источник, что flipX/sx; rect симметричен по X). */
  const vw=src.videoWidth||src.width||0, vh=src.videoHeight||src.height||0;
  if(vw&&vh){
    const r=coverView(vw,vh,W,H); setViewRect(r);
    const sx0=r.ax0*vw, sy0=r.ay0*vh, sw=(r.ax1-r.ax0)*vw, sh=(r.ay1-r.ay0)*vh;
    if(mirrored()){ ctx.save(); ctx.scale(-1,1); ctx.drawImage(src,sx0,sy0,sw,sh,-W,0,W,H); ctx.restore(); }
    else ctx.drawImage(src,sx0,sy0,sw,sh,0,0,W,H);
  }
  ctx.fillStyle='rgba(7,7,13,.5)'; ctx.fillRect(0,0,W,H);
}

export { drawVideoBackground, syncViewRect };
