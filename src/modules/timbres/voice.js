/* AUD1c (RUN 3, 2026-10-16) — starting a voice's oscillators (phase scatter, the pair start) and the solo oscillator with its detune taps. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */

const voiceBuild=(E)=>{ E.build.firstOsc=true; };   // зовётся В НАЧАЛЕ постройки каждого голоса/банка: следующий осциллятор — первый

function voiceStart(E, o){
  const d = E.build.firstOsc ? 0 : E.rnd()/Math.max(1,o.frequency.value);   // меньше одного периода частоты постройки
  E.build.firstOsc=false;
  o.start(E.ac.currentTime+d);
}

/* ⛳ ПАРА ОСЦИЛЛЯТОРОВ ГОЛОСА АККОРДА И БАСА — СТАРТ ВМЕСТЕ (починка после T4c-2: «записанный бас очень тихий»).
   ⛔ ДОВОД «у двух начальная фаза лишь сдвигает момент пика биений» (шапка выше) ВЕРЕН ТОЛЬКО ДЛЯ РАССТРОЕННОЙ пары. У голоса аккорда и
   баса o1/o2 строятся на ОДНОЙ частоте (440 по умолчанию) и потом ВСЕГДА едут вместе (o2 = o1·ratio, одна и та же рампа), значит
   разность их фаз, набранная разбросом старта, ЗАСТЫВАЕТ навсегда. Где тембр ставит обоим одну частоту без расстройки (ratio 1,
   det 0) — Саб-синус (синус+синус), Кислотный (квадрат+пила), Синт-бас мягкий (синус+треугольник), Орган-бас (квадрат+синус), — это
   НЕПОДВИЖНОЕ ГАШЕНИЕ основного тона: сумма 2·|cos(φ/2)|, от полной громкости до тишины, по одной случайной выборке на голос. Живой
   голос строится один раз на сессию (Math.random) и переиспользуется — весь бас сессии звучит с одной случайной громкостью; рендер
   берёт выборку из семени (номер дорожки — сессионный счётчик), и тот же материал замерзает то громко, то в 23 раза тише.
   ⛳ ТЕПЕРЬ: пара стартует В ОДИН МИГ (в фазе — как задуман тембр и как было до «B»; шапка buildBassPool прямо считает пик пары 2.0),
   а сам голос — со своей случайной задержкой (меньше периода частоты постройки): голоса между собой по-прежнему разбросаны (смысл «B»),
   выборка rnd() — ОДНА на голос, как и прежде (у второго осциллятора), так что последовательность случайных чисел рендера не сдвинута.
   Соло-банки (mkOsc) не трогаем: их пары на одной частоте расстроены (SuperSaw, треугольник+синус, квадрат+пила), а органы — на разных
   гармониках; там разброс безопасен и нужен. */
function voiceStartPair(E, o1,o2){
  const d=E.rnd()/Math.max(1,o1.frequency.value);   // одна задержка на голос — меньше одного периода частоты постройки
  E.build.firstOsc=false;
  o1.start(E.ac.currentTime+d); o2.start(E.ac.currentTime+d);
}

function mkOsc(E, type,freq,dest,gainVal){
  const o=E.ac.createOscillator(); o.type=type; o.frequency.value=freq;
  const g=E.ac.createGain(); g.gain.value=gainVal;
  o.connect(g); g.connect(dest); if(E.build.vib)E.build.vib.connect(o.detune); if(E.build.hum)E.build.hum.connect(o.detune); (E.build.shim||E.lfo.shimPitch).connect(o.detune); voiceStart(E, o);   // B: старт со СВОЕЙ фазой (см. voiceStart); форма — встроенная   // вибрато ЭТОГО ГОЛОСА (bldVib — с 3.7.1 глубина пер-голосовая, LFO общий) + гуманизация ЭТОГО ГОЛОСА (bldHum — иначе вторая атака перестроила бы первую, ещё звучащую ноту) + шиммер ВЫРАЗИТЕЛЬНОСТИ (общий) — всё в detune (центы), сумма; exprVibPitch=0 без руки → байт-в-байт
  return o;
}
export { voiceBuild, voiceStart, voiceStartPair, mkOsc };
