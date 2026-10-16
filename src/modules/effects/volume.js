/* AUD2a (RUN 3, 2026-10-16) — the effect «Volume» (the permanent voice module, rule #30). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { freezeDeep } from '../timbres/stages.js';   // R2: shared declarations are deep-frozen
import { FX_VOL, volFromOld } from '../../config.js';
import { fxWrapParam } from './param.js';

/* ═══ ГРОМКОСТЬ — ГОЛОСОВОЙ МОДУЛЬ ВСЕХ РОЛЕЙ (слайс VOL-0, план «громкость как параметр») ═══
   ⛳ ГРОМКОСТЬ ОСТАЁТСЯ ПЕР-НОТНОЙ (вывод плана): это не только уровень, но и СКОРОСТЬ УДАРА на атаке, которая лепит тембр
   (strike соло-банков, цель фильтра f аккорда), — шинный гейн после суммы её не повторит; две руки одной роли держат СВОИ
   громкости; записанное и так несёт её в каждой ноте. Поэтому величина живёт в ПРЕЖНЕМ поле события a.vol (note.key) —
   формат события не меняется ни на байт.
   ⛳ ПОЛЯ ОБЪЯВЛЕНИЯ:
     • шкала — СЫРАЯ 0..1, линейная (min 0, max 1): v01 === a.vol, в меню 0…100. Число громкости, а не амплитуда: в звук
       его переводит одна кривая config.volAmp (v², VOL-2b);
     • def/defBy — УМОЛЧАНИЕ ПО РОЛИ (VOL-2b): число, звучащее под новой кривой РОВНО как прежние 0.8 этой роли
       (volFromOld: соло √0.8≈0.894, аккорды √0.85≈0.922, бас и удар √0.86≈0.927; в меню 89/92/93). Прежде было одно
       0.8 — тот же уровень, что у удалённого в VOL-2 fxVolFix; под v² оно дало бы на 1–2 дБ тише прежнего. Им засевается
       «Фиксировано» у нетронутой громкости, и с него стартует громкость, впервые поставленная на палец;
     • attach + note:{key:'vol', required:true} без roles — величина «в ноте», в своём поле у ВСЕХ ролей, и она
       ОБЯЗАТЕЛЬНА: нота без громкости дала бы движку undefined, то есть NaN в гейне. Правку полосой, которая это
       соблюдает, делает VOL-3; здесь — объявление;
     • handRange — СНЯТ в VOL-2b (решение пользователя): ход руки по громкости ПОЛНЫЙ, 0..1 — у горизонтали и у пальца,
       левый край = 0 = тишина у каждой роли. В VOL-0…VOL-2 здесь стояло [0.2,1] (прежние 0.2+0.8·xn). Механизм
       (fxHandRange, умолчание [0,1]) остался — объявить ход сможет любой будущий параметр.
     • perm — ПОСТОЯННАЯ запись: сеется первой в каждую цепь (state.fxChains), не убирается и не переставляется. В VOL-0/
       VOL-1 не показывалась нигде; с VOL-2 — строка «Громкость» в панели (без ✕), столбик — только на пальце; в списках
       «добавить», на полосе и в сводке захвата её по-прежнему нет (fxPerm ниже).
   ⛔ УЗЛОВ НЕТ (как у Скольжения): правило #3 не задето — ничего не строится и не запускается.
   ⛔ ЧИСЛО ГРОМКОСТИ СЧИТАЮТ gestures, НА РУКУ (резолвер noteVolOf по этой записи: адрес, фиксированное v01, общий p.cur на
   пальце); в общий параметр роли (p.cur) горизонталь её не пишет. В ЗВУК число переводит ОДНА кривая config.volAmp (v²) —
   в chordOn/chordGlide, leadOn/leadSet, bassOn/bassSet и drumVoice (VOL-2b). По правилу #29 модуль
   захватывается (fxCaptureChain/fxCaptureWalk обходят inst.params), но ничто со звуком его не читает: переигровка
   пропускает пер-нотное (fxLaneMerge), снимок ноты пропускает поле со своим местом (fxSnapshot), голос берёт a.vol. */
const VOL_PARAMS=freezeDeep([
  {key:'amt', labelKey:'fx.vol.amt', short:'VOL', unit:'', def:volFromOld('ld',0.8),
   defBy:{ ld:volFromOld('ld',0.8), ch:volFromOld('ch',0.8), bs:volFromOld('bs',0.8), dr:volFromOld('dr',0.8) },
   min:0, max:1, curve:'lin', attach:true, note:{key:'vol', required:true}},
]);

function makeVolFx(){
  const params=VOL_PARAMS.map(sp=>({...sp, set:()=>{}}));   // узлов нет: set пуст, величину держит p.cur (как у Скольжения)
  for(const p of params) fxWrapParam(p);
  return { id:FX_VOL, labelKey:'fx.vol', kind:'voice', params };
}
export { VOL_PARAMS, makeVolFx };
