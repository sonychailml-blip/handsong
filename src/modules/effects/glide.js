/* AUD2a (RUN 3, 2026-10-16) — the effect «Glide» (a voice module; the pitch glide time). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { BASS_GLIDE_TC, LEAD_GLIDE_TC, freezeDeep } from '../timbres/stages.js';
import { fxWrapParam } from './param.js';

/* ═══ СКОЛЬЖЕНИЕ — ГОЛОСОВОЙ МОДУЛЬ МЕЛОДИЧЕСКИХ РОЛЕЙ (V4, режимы голоса) ═══
   Время, за которое УЖЕ ЗВУЧАЩИЙ голос переезжает на новую высоту (портаменто). Величина — постоянная времени
   setTargetAtTime, та самая, что V1 сделал аргументом движка (leadOn/leadSet/bassOn/bassSet → банк setFreq).
   ⛳ ОБЪЯВЛЕН ТАК ЖЕ, КАК ЯРКОСТЬ, И ПОТОМУ ПОЛУЧАЕТ ВСЁ ПО ПРАВИЛУ #29 ДАРОМ: палец и ось (fxChainAdd), столбик
   (fxBarItems), значение в меню, захват в ленту автоматизации (fxCaptureWalk обходит inst.params), переигровку ленты
   (fxPlaySet). attach:true — величина ЕДЕТ В КАРТЕ a.fx СОБЫТИЯ (fxSnapshot), поэтому нота звучит со СВОИМ
   скольжением на переигровке и в заморозке, а не с тем, куда рука поставила его сейчас.
   ⚠️ ДВЕ ВЕЩИ, КОТОРЫХ ОБЪЯВЛЕНИЕ СДЕЛАТЬ НЕ МОЖЕТ, — И ОНИ НАПИСАНЫ РУКАМИ (это и есть граница правила):
     • ЧИТАТЕЛЬ. Узлов у голосового модуля нет, значит «куда девать величину» знает только голос: fxGlideOf ниже
       разнормирует её из карты, а recorder.makeENG кладёт в аргумент glide. Так же было у яркости (fxChordBri).
     • УМОЛЧАНИЕ ПО ВЛАДЕЛЬЦУ. Решение пользователя: только что добавленное Скольжение равно СЕГОДНЯШНЕМУ скольжению
       ЭТОЙ роли (соло 20 мс, бас 12 мс), чтобы добавление ничего не меняло. Одного def на это мало — отсюда поле
       defBy {роль: величина} и fxDefFor (ключ цепи сравнивается на РАВЕНСТВО с chainKeyOf(роль), не разбирается).
   ⛔ КОНТРАКТ V1 ЦЕЛ: скольжение — ТОЛЬКО легато-переезд звучащего голоса. Свежую атаку отсекает сам движок (fresh →
      умолчание), кадры терменвокса — ENG (live!=null → glide не передаётся), точки бенда — scheduleBend (его не берёт).
   Диапазон: 4 мс (почти скачок) … 0.8 с (≈2.4 с до 95% пути) — длинный конец нужен для слышимого «воя» в басу; лог-шкала,
   иначе половина хода ушла бы на неразличимые сотни миллисекунд. ⛔ В цепь по умолчанию НЕ сеется (решение
   пользователя): каждая запись цепи рисует столбик, и посев добавил бы столбик при нетронутых умолчаниях. */
const GLIDE_PARAMS=freezeDeep([
  {key:'time', labelKey:'fx.glide.time', short:'GLD', unit:'s',
   def:LEAD_GLIDE_TC, defBy:{ld:LEAD_GLIDE_TC, bs:BASS_GLIDE_TC}, min:0.004, max:0.8, curve:'log', attach:true, readAt:'pitch'},   // readAt: голос читает скольжение ТОЛЬКО на смене высоты (см. fxNoteFollows)
]);

function makeGlideFx(){
  const params=GLIDE_PARAMS.map(sp=>({...sp, set:()=>{}}));   // узлов нет: set пуст, величину держит p.cur, читает голос (см. fxGlideOf)
  for(const p of params) fxWrapParam(p);
  return { id:'glide', labelKey:'fx.glide', kind:'voice', params };
}
export { GLIDE_PARAMS, makeGlideFx };
