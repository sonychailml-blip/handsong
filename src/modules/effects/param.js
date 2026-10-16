/* AUD2a (RUN 3, 2026-10-16) — an effect parameter's normalised value (0..1 ↔ its units) and the wrapper every declared parameter goes through (setNorm, cur). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */

/* НОРМИРОВАНИЕ ПАРАМЕТРА: 0..1 ↔ реальная величина. Жест даёт 0..1 (смещение от точки захвата), а
   параметру нужны секунды/герцы — и ПО ЛОГ-ШКАЛЕ, иначе половина хода уходит на неслышимое: 200→400 Гц
   слышно как шаг, 17000→18000 — нет. Живёт РЯДОМ С ПАРАМЕТРОМ: одно место, где min/max/curve
   превращаются в число, и оно же — там, где эти поля объявлены.
   ⚠️ Кламп СЕТТЕРА остаётся властью (setRevDecay/setRevTone): min/max здесь — диапазон РУЧКИ, а не
   защита. Потолок decay 4.0 — не каприз: выше gMax режет g короткой линии и не режет длинную. */
const fxDenorm=(p,x)=> p.curve==='log' ? p.min*Math.pow(p.max/p.min,x) : p.min+(p.max-p.min)*x;

const fxNorm  =(p,v)=> p.curve==='log' ? Math.log(v/p.min)/Math.log(p.max/p.min) : (v-p.min)/(p.max-p.min);

/* Достраивает дескриптор: cur — ТЕКУЩЕЕ нормированное (стартует от def), getNorm/setNorm — то, чем его
   крутит жест. cur несущий, а не удобство: захват берёт getNorm() КАК БАЗУ, поэтому щипок ПРОДОЛЖАЕТ
   с того места, где комната стоит, а не прыгает с нуля. Это и есть латч (значение живёт в модуле). */
function fxWrapParam(p){
  const c01=x=>Math.max(0,Math.min(1,x));
  p.cur=c01(fxNorm(p,p.def));
  p.getNorm=()=>p.cur;
  /* ⛳ when — ЯВНОЕ ВРЕМЯ (слайс F3), по умолчанию «сейчас»: та же форма, что у голосовых функций с
     правила #15. Живьём его никто не передаёт, поэтому поведение прежнее дословно; офлайн-рендеру оно
     нужно, чтобы ЗАПИСАННАЯ автоматика легла в ТЕ доли, в которых её крутили, а не вся в нулевую
     секунду (у OfflineAudioContext currentTime под JS не движется). */
  p.setNorm=(x,when)=>{ p.cur=c01(x); p.set(fxDenorm(p,p.cur),when); };
}
export { fxNorm, fxDenorm, fxWrapParam };
