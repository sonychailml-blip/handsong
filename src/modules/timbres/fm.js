/* AUD1c (RUN 3, 2026-10-16) — the FM solo bank (modulator → carrier frequency, index envelope). Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { mkOsc, voiceStart } from './voice.js';
import { LEAD_GLIDE_TC } from './stages.js';

/* --- FM-голос: АЛЬТЕРНАТИВНЫЙ способ построить банк, рядом с субтрактивным (не вместо него).
   Несущий (car) идёт через mkOsc в ОБЩУЮ соло-цепочку (drive → глоб. огибающая → громкость →
   тремоло → delay/reverb) — как любой банк, поэтому эффекты/посылы/лимитер его не отличают.
   Модулятор (mod) — ГОЛЫЙ осциллятор → modGain → car.frequency: в выход и в вибрато он НЕ идёт,
   он лишь качает частоту несущего. Нецелый ratio даёт ИНГАРМОНИЧЕСКИЙ спектр (обертоны не кратны
   основному тону) — класс тембров, физически недостижимый субтрактивным путём: колокол,
   гамелановый металл, трубчатый металл. Индекс модуляции = глубина качания в Гц (modGain); он
   масштабируется частотой (f*sus), чтобы спектр не «плыл» по высоте. attack() даёт индексу СВОЮ
   огибающую — прыжок к f*peak и спад к f*sus за постоянную tau. Индекс спадает БЫСТРЕЕ амплитуды
   (rel банка длиннее tau): яркий удар, оседающий в тихий устойчивый гул — именно это ухо читает
   как «удар по металлу». Нецелый ratio РАЗМЫВАЕТ воспринимаемую высоту: честно для гамелана, но
   усложняет тонкое сравнение строёв — так задумано, не баг. */
function buildFMBank(E, preBus,{ratio,peak,sus,tau}){
  const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  let curF=220;                                     // последняя целевая частота: attack() берёт индекс от неё (setFreq идёт ДО noteOn)
  const car=mkOsc(E, 'sine',curF,ig,0.5);              // несущий: в общую цепочку + вибрато (пер-голосовой bldVib цепляет mkOsc)
  const mod=E.ac.createOscillator(); mod.type='sine'; mod.frequency.value=curF*ratio;   // модулятор: голый, только в car.frequency
  const modGain=E.ac.createGain(); modGain.gain.value=curF*sus;
  mod.connect(modGain); modGain.connect(car.frequency); voiceStart(E, mod);   // B: модулятор — своей фазой относительно несущего (см. voiceStart)
  E.build.banks.push({gain:ig,
    setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{ curF=f;                        // несущий, модулятор (f*ratio) и индекс (f*sus) — тем же setTargetAtTime, что и все банки (бенд/глиссандо/терменвокс тянут ВЕСЬ спектр)
      car.frequency.setTargetAtTime(f,t,tc);
      mod.frequency.setTargetAtTime(f*ratio,t,tc);
      modGain.gain.setTargetAtTime(f*sus,t,tc); },
    cancel:t=>{ car.frequency.cancelScheduledValues(t);
      mod.frequency.cancelScheduledValues(t); modGain.gain.cancelScheduledValues(t); },
    strike:(t,vel)=>{ modGain.gain.cancelScheduledValues(t);   // огибающая ИНДЕКСА (не фильтра): пинок вверх, затем спад; vel не используем — у FM нет фильтра
      modGain.gain.setValueAtTime(curF*peak,t);
      modGain.gain.setTargetAtTime(curF*sus,t,tau); }});
}
export { buildFMBank };
