/* ЗВУК НА iPhone ПРИ ВКЛЮЧЁННОМ БЕЗЗВУЧНОМ РЕЖИМЕ (переключатель/«Без звука»).
   iOS по умолчанию отдаёт Web Audio в сессию «ambient» — её глушит беззвучный режим, и страница молчит,
   хотя всё работает. Страница должна объявить себя ПЛЕЕРОМ — сессия «playback». Зовётся В ТОМ ЖЕ ТАПЕ, что
   поднимает звук (main.startApp, синхронно, ДО initAudio и до первого await — правило жеста):
   • Safari 16.4+: navigator.audioSession.type='playback' (так же делает Night, apps/night/shell.js).
   • Старый iOS (нет audioSession): играем короткий ТИХИЙ <audio> (наш файл snd/silence.wav — полсекунды
     нулей): медиа-элемент переключает сессию страницы в playback, и Web Audio звучит вместе с ним.
     Только на iOS — на Android тихий элемент зажёг бы медиа-уведомление «играет», а пользы там нет.
   Не DOM-слой звука: модуль живёт рядом с main.js (правило #5 — audio.js DOM не трогает).
   Возвращает, что сделано: 'session' | 'element' | null — для проверки. */
import { AC } from './audio.js';
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);          // iPadOS маскируется под Mac
let silentEl=null;
export function audioSessionPlayback(){
  try{ const a=navigator.audioSession;
    if(a){ if(a.type!=='playback') a.type='playback'; return 'session'; } }catch(e){}
  if(!isIOS()) return null;
  try{
    if(!silentEl){ silentEl=new Audio('snd/silence.wav');
      silentEl.setAttribute('playsinline',''); silentEl.setAttribute('x-webkit-airplay','deny');   // не во весь экран, не в AirPlay
      silentEl.preload='auto'; }
    const p=silentEl.play(); if(p && p.catch) p.catch(()=>{});                  // отказ не роняет старт — звук просто останется как был
    return 'element';
  }catch(e){ return null; }
}

/* ПРОБУЖДЕНИЕ ПОСЛЕ ПРЕРЫВАНИЯ. iOS прерывает контекст (state 'interrupted' или 'suspended'): звонок, Siri,
   уход в другое приложение, блокировка экрана — и сам его не возвращает: человек возвращается к тишине до
   перезагрузки. Демо НИГДЕ не останавливает контекст само (нет suspend/close), поэтому любое «не running»
   после старта — чужое, и его можно поднимать. Когда:
   • страница снова видна (visibilitychange → visible, pageshow из bfcache) — попытка; без жеста iOS может
     отказать, тогда сработает следующее касание;
   • следующее касание/клик/клавиша — это ЖЕСТ: touchend/pointerup/click/keydown (не touchstart/pointerdown —
     WebKit не считает их жестом для звука). Ловим на window в фазе захвата, passive — чужие обработчики
     (бар, панели, жесты) не задеты.
   Каждый раз: сначала снова объявить сессию «playback» (после прерывания iOS мог её сбросить), затем resume.
   Пока контекст running — ничего не делаем (дёшево: одно сравнение). До старта (AC нет) — тоже ничего. */
function wake(){
  if(!AC || AC.state==='running' || AC.state==='closed') return;
  audioSessionPlayback();
  try{ const p=AC.resume(); if(p && p.catch) p.catch(()=>{}); }catch(e){}
}
const OPT={ capture:true, passive:true };
for(const ev of ['touchend','pointerup','click','keydown']) addEventListener(ev, wake, OPT);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') wake(); });
addEventListener('pageshow', wake);
