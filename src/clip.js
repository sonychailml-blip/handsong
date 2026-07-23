/* ================= ЗАПИСЬ ВИДЕОКЛИПА =================
   Кадр ХОЛСТА (canvas.captureStream) + звук (параллельный отвод из audio.js) сводим в ОДИН
   MediaStream → MediaRecorder пишет один файл С картинкой И звуком. HTML-панели/кнопки — отдельный
   DOM-слой, в захват холста НЕ попадают (проверяется глазом: в клипе их нет). Отдельно от лупера:
   его музыкальная запись — своя. Инертно, пока не жмут 🎥. Русские строки/сообщения — как везде. */
import { canvas } from './vision.js';
import { createRecordingTap } from './audio.js';
import { setVideoRec } from './state.js';

let rec=null, chunks=[], stream=null, tap=null, notify=null;

export const clipActive = () => !!rec;           // идёт ли запись клипа (читает ui для вида кнопки)
/* ЕДИНЫЙ источник правды — состояние здесь (rec). ui НЕ гадает по тапу, а ПОДПИСЫВАЕТСЯ: notify
   зовётся ПОСЛЕ каждой смены состояния (старт, реальная остановка, ошибка, внешний обрыв дорожки),
   поэтому кнопка (.act), флаг videoRec и настоящее состояние рекордера не могут разойтись. */
export const onClipChange = fn => { notify=fn; };
function fireChange(){ if(notify) try{ notify(clipActive()); }catch(e){} }

/* Лучший поддерживаемый контейнер/кодек. Браузеры пишут WEBM (vp9/vp8 + opus); MP4 не обещаем.
   Пустая строка → пусть MediaRecorder выберет сам (Safari может отдать mp4/H.264 — тоже ок). */
function pickMime(){
  const cands=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const m of cands) if(MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
function stamp(){                                // ГГГГММДД-ЧЧММСС для имени файла
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* Старт. Бросает при неподдержке/ошибке — вызывающий (ui) ловит и показывает короткое сообщение,
   НЕ оставляя полустарта: setVideoRec(true) ставим только когда запись реально пошла. */
export function startClip(){
  if(rec) return;
  if(typeof MediaRecorder==='undefined') throw new Error('Запись видео не поддерживается браузером');
  if(!canvas.captureStream) throw new Error('captureStream не поддерживается браузером');
  tap=createRecordingTap();                      // параллельный отвод звука; живой выход не трогаем
  if(!tap) throw new Error('Звук ещё не запущен');
  const vid=canvas.captureStream(30);            // 30 fps — хватает для соцсетей, легче для телефона; форма экрана (портрет/ландшафт) наследуется, без кропа
  stream=new MediaStream([...vid.getVideoTracks(), ...tap.stream.getAudioTracks()]);
  const mime=pickMime();
  try{
    rec=new MediaRecorder(stream, mime?{mimeType:mime}:undefined);
  }catch(e){ cleanup(); throw new Error('Не удалось начать запись: '+(e&&e.message||e)); }
  chunks=[];
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  rec.onstop=()=>{ const m=rec&&rec.mimeType||mime||'video/webm'; save(m); cleanup(); };   // сброс состояния — в cleanup, ПОСЛЕ реальной остановки
  rec.onerror=()=>{ cleanup(); };                // сбой рекордера — приводим состояние в покой (кнопка/флаг сбросятся в cleanup)
  /* Внешнее завершение: дорожка ХОЛСТА оборвалась сама (не наш stop) → останавливаем запись, чтобы
     кнопка/флаг не «залипли». Наш cleanup гасит дорожки через .stop(), а он 'ended' НЕ шлёт — сюда
     повторно не зайдём. */
  for(const t of stream.getVideoTracks()) t.addEventListener('ended', ()=>{ if(rec) stopClip(); });
  rec.start();                                   // без таймслайса: один blob на остановке (меньше событий — дешевле)
  setVideoRec(true);
  fireChange();                                  // ui: кнопка → .act
}

/* Стоп. Флаг videoRec и вид кнопки НЕ трогаем оптимистично: onstop → cleanup снимет их, когда
   рекордер действительно остановится (иначе кнопка/накладки разойдутся с реальным состоянием). */
export function stopClip(){
  if(!rec) return;
  try{ rec.stop(); }catch(e){ cleanup(); }       // onstop → save + cleanup; при ошибке stop чистим сами (cleanup всё сбросит)
}

/* Единственный путь завершения — зовётся из onstop, onerror, внешнего обрыва и catch старта. ВСЕГДА
   возвращает состояние в покой: гасит дорожки записи, снимает отвод, обнуляет ссылки, сбрасывает
   videoRec и уведомляет ui. Идемпотентен (повторный вызов безвреден: ссылки уже null). */
function cleanup(){
  if(stream) for(const t of stream.getTracks()) t.stop();   // гасим ТОЛЬКО дорожки записи (видео-трек холста + отвод звука); холст и живой звук живут дальше
  if(tap) tap.dispose();                                    // снимаем ребро limiter→отвод
  rec=null; chunks=[]; stream=null; tap=null;
  setVideoRec(false);                            // накладки возвращаются в кадр ТОЛЬКО когда запись реально завершена
  fireChange();                                  // ui: .act снимается на ЛЮБОМ пути завершения (норм. стоп, ошибка, внешний обрыв)
}

/* Сохранение: File → системный «Поделиться» (если умеет файлы), иначе скачивание. Имя — русское
   с меткой времени. Формат по факту WEBM (или что отдал браузер) — честно, MP4 не выдаём. */
function save(mime){
  if(!chunks.length) return;
  const blob=new Blob(chunks,{type:mime});
  const ext=mime.includes('mp4')?'mp4':'webm';
  const name=`эйр-синт-${stamp()}.${ext}`;
  const file=(typeof File!=='undefined') ? new File([blob],name,{type:mime}) : null;
  if(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:'Air Synth'}).catch(()=>download(blob,name));   // отмена/отказ шэра → скачиваем
  }else download(blob,name);
}
function download(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);   // отдать браузеру время начать скачивание, потом освободить память
}
