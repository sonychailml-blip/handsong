/* GES1 part 2 (stage 3) — THE LOOPER HAND (function 'loop'): one command per pinch edge (rule #21) — record / play-pause / undo / the
   3-s clear with its countdown — and its named confirmations — moved from gestures.js (which re-exports what its readers import). The probe
   clock (nowMs) and the probe's looper tap come once through looperWire. Moved verbatim. */
import { setLooperClear, setLooperMsg } from '../state.js';
import { CLEAR_HOLD_MS, FINGER_TIPS, LOOPER_MSG_MS } from '../config.js';
import { clearSong, events, loop, onLoop, onRec, onUndo, recording } from '../recorder.js';
import { t } from '../i18n.js';
/* GES1: the probe clock and the probe's command tap, wired once (looperWire) */
const W={ nowMs:()=>performance.now(), tap:()=>null };
const looperWire=o=>{ Object.assign(W,o); };
const nowMs=()=>W.nowMs();

/* Рука-ЛУПЕР (функция 'loop'): нот не играет, командует лупером щипками пальцев. Команды — СОБЫТИЯ, а не
   непрерывный звук: срабатывают РАЗ на формирование щипка (edge), не повторяются в удержании. Раскладка
   thumb+палец: указ.→запись, средн.→пуск/пауза, безым.→отмена последнего взятого, мизинец→очистить ВСЁ (только после
   3с удержания с отсчётом — единственное разрушительное действие). Невозможные команды сообщаются, а не
   молчат. Здесь только логика; кнопки транспорта в UI работают как прежде (это ЕЩЁ один вход). */
function looperMsgSet(text,ok){ setLooperMsg({text, until:nowMs()+LOOPER_MSG_MS, ok}); }
function doLooper(cmd){
  { const looperTap=W.tap(); if(looperTap && looperTap(cmd)) return; }   // GES1: the tap is read through the wire   // HAND1: a probe session prints the command and keeps the transport still
  if(cmd==='rec'){                                        // всегда возможно: не пишет→запись, пишет→стоп
    /* ⛳ S3.3: развилка «первый круг / наложение» исчезла вместе с loop.first — различать здесь нечего. КУДА
       писать, решает onRec: с S3.5c — во ВООРУЖЁННУЮ дорожку, если она есть, иначе в новую. Рука-лупер
       зовёт тот же onRec, что и кнопка ●, поэтому ведёт себя так же. Номер дорожки показывает полоса лупера. */
    onRec(); looperMsgSet(t(recording ? 'msg.recording' : 'msg.recStop'), true);
  }else if(cmd==='play'){
    if(!loop.on && !events.length){ looperMsgSet(t('msg.noLoop'), false); return; }   // нечего играть
    onLoop(); looperMsgSet(t(loop.on?'msg.play':'msg.pause'), true);
  }else if(cmd==='undo'){
    if(!events.length){ looperMsgSet(t('msg.noLayers'), false); return; }                // нечего отменять
    onUndo(); looperMsgSet(t('msg.undo'), true);
  }else if(cmd==='clear'){
    if(!loop.on && !events.length){ looperMsgSet(t('msg.alreadyEmpty'), false); return; }    // нечего очищать — движок не дёргаем
    clearSong(); looperMsgSet(t('msg.cleared'), true);   // ED7: the looper hand's clear is a step (↶ brings the song back)
  }
}
/* Вызов НА ЗАХВАТЕ щипка (edge) → единичное срабатывание по построению. index/middle/ring — сразу;
   мизинец только заводит 3с-таймер (S.clearT0) и показывает отсчёт, сама очистка — в блоке удержания. */
function fireLooperCmd(S,mf){
  const f=FINGER_TIPS.indexOf(mf);                        // 0 указ · 1 средн · 2 безым · 3 мизинец
  if(f===3){ S.clearT0=nowMs(); S.clearFired=false; setLooperClear(CLEAR_HOLD_MS); return; }
  if(f===0) doLooper('rec');
  else if(f===1) doLooper('play');
  else if(f===2) doLooper('undo');
}

export { looperWire, doLooper, fireLooperCmd };
