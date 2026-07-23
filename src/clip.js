/* ================= ЗАПИСЬ КЛИПА / АУДИО =================
   ОДИН движок на два вида записи (не два модуля):
     • 'video' — кадр ХОЛСТА (canvas.captureStream) + звук → один файл С картинкой И звуком;
     • 'audio' — ТОЛЬКО звук (тот же параллельный отвод limiter'а) → аудиофайл.
   Звук в обоих случаях — параллельный отвод из audio.js (createRecordingTap): пишем ровно то, что
   слышно, живой выход не трогаем. HTML-панели/кнопки — отдельный DOM-слой, в захват холста не
   попадают. Отдельно от лупера (его музыкальная запись — своя). Инертно, пока не жмут кнопку.
   ЕДИНСТВЕННЫЙ рекордер за раз: recKind — вид активной записи ('video'|'audio') или null. Взаимное
   исключение видео/аудио обеспечивает ui (блокирует другую кнопку) + страховка `if(rec)return`. */
import { canvas } from './vision.js';
import { createRecordingTap } from './audio.js';
import { setVideoRec } from './state.js';

let rec=null, recKind=null, chunks=[], stream=null, tap=null, notify=null;

export const activeKind = () => recKind;         // 'video' | 'audio' | null — читает ui для вида кнопок
/* ЕДИНЫЙ источник правды — состояние здесь (rec/recKind). ui НЕ гадает по тапу, а ПОДПИСЫВАЕТСЯ:
   notify зовётся ПОСЛЕ каждой смены состояния (старт, реальная остановка, ошибка, внешний обрыв
   дорожки), поэтому кнопки (.act/disabled), флаг videoRec и настоящее состояние рекордера не
   могут разойтись. */
export const onClipChange = fn => { notify=fn; };
function fireChange(){ if(notify) try{ notify(recKind); }catch(e){} }

/* Лучший поддерживаемый контейнер/кодек по виду записи. Браузеры дают WEBM (vp9/vp8 + opus для
   видео, opus для аудио); Safari может отдать mp4. MP3/WAV НЕ обещаем. Пустая строка → пусть
   MediaRecorder выберет сам. */
function pickMime(kind){
  const cands = kind==='audio'
    ? ['audio/webm;codecs=opus','audio/webm','audio/mp4']
    : ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const m of cands) if(MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
function stamp(){                                // ГГГГММДД-ЧЧММСС для имени файла
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* Старт записи вида kind ('video'|'audio'). Бросает при неподдержке/ошибке — вызывающий (ui) ловит
   и показывает короткое сообщение, НЕ оставляя полустарта: videoRec ставим только для видео и только
   когда запись реально пошла. `if(rec)return` — страховка: одновременно два рекордера на одном
   отводе недопустимы (кнопки ui и так блокируют вторую запись). */
export function startClip(kind='video'){
  if(rec) return;
  if(typeof MediaRecorder==='undefined') throw new Error('Запись не поддерживается браузером');
  const video = kind==='video';
  if(video && !canvas.captureStream) throw new Error('captureStream не поддерживается браузером');
  tap=createRecordingTap();                      // параллельный отвод звука; живой выход не трогаем
  if(!tap) throw new Error('Звук ещё не запущен');
  let tracks=[...tap.stream.getAudioTracks()];    // аудио — всегда; видео добавляем сверху
  if(video){ const vid=canvas.captureStream(30); tracks=[...vid.getVideoTracks(), ...tracks]; }   // 30 fps — хватает для соцсетей, легче для телефона; форма экрана наследуется, без кропа
  stream=new MediaStream(tracks);
  const mime=pickMime(kind);
  try{
    rec=new MediaRecorder(stream, mime?{mimeType:mime}:undefined);
  }catch(e){ cleanup(); throw new Error('Не удалось начать запись: '+(e&&e.message||e)); }
  recKind=kind; chunks=[];
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  rec.onstop=()=>{ const m=rec&&rec.mimeType||mime||(video?'video/webm':'audio/webm'); save(m); cleanup(); };   // сброс состояния — в cleanup, ПОСЛЕ реальной остановки
  rec.onerror=()=>{ cleanup(); };                // сбой рекордера — приводим состояние в покой (кнопки сбросятся в cleanup)
  /* Внешнее завершение: дорожка записи оборвалась сама (не наш stop) → останавливаем, чтобы кнопки
     не «залипли». Наш cleanup гасит дорожки через .stop(), а он 'ended' НЕ шлёт — повторно не зайдём.
     Слушаем ВСЕ дорожки потока: у видео это холст, у аудио — отвод. */
  for(const t of stream.getTracks()) t.addEventListener('ended', ()=>{ if(rec) stopClip(); });
  rec.start();                                   // без таймслайса: один blob на остановке (меньше событий — дешевле)
  if(video) setVideoRec(true);                   // накладки холста прячет ТОЛЬКО видеозапись; аудио холст не снимает
  fireChange();                                  // ui: активная кнопка → .act, другая → disabled
}

/* Стоп. Вид/флаг/вид кнопок НЕ трогаем оптимистично: onstop → cleanup снимет их, когда рекордер
   действительно остановится (иначе кнопки/накладки разойдутся с реальным состоянием). */
export function stopClip(){
  if(!rec) return;
  try{ rec.stop(); }catch(e){ cleanup(); }       // onstop → save + cleanup; при ошибке stop чистим сами (cleanup всё сбросит)
}

/* Единственный путь завершения — зовётся из onstop, onerror, внешнего обрыва и catch старта. ВСЕГДА
   возвращает состояние в покой: снимает флаг видео (только если писалось видео), гасит дорожки
   записи, снимает отвод, обнуляет ссылки, уведомляет ui. Идемпотентен (повторный вызов безвреден). */
function cleanup(){
  if(recKind==='video') setVideoRec(false);      // накладки возвращаются в кадр ТОЛЬКО когда видеозапись реально завершена; аудио этот флаг не трогало
  if(stream) for(const t of stream.getTracks()) t.stop();   // гасим ТОЛЬКО дорожки записи (видео-трек холста + отвод звука); холст и живой звук живут дальше
  if(tap) tap.dispose();                                    // снимаем ребро limiter→отвод
  rec=null; recKind=null; chunks=[]; stream=null; tap=null;
  fireChange();                                  // ui: снимаем .act/disabled на ЛЮБОМ пути завершения (норм. стоп, ошибка, внешний обрыв)
}

/* Сохранение: File → системный «Поделиться» (если умеет файлы), иначе скачивание. Имя — русское
   с меткой времени, расширение — по РЕАЛЬНОМУ mime (audio→webm/m4a, video→webm/mp4). Честно, что
   отдал браузер: WebM/Opus обычно, mp4/m4a у Safari. */
function save(mime){
  if(!chunks.length) return;
  const blob=new Blob(chunks,{type:mime});
  const audio=mime.indexOf('audio')===0;
  const ext = mime.includes('mp4') ? (audio?'m4a':'mp4') : 'webm';
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
