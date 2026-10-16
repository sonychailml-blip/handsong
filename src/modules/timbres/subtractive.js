/* AUD1c (RUN 3, 2026-10-16) — the solo banks by timbre position (subtractive bodies; FM and KS dispatched) and one bank for a voice. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { mkOsc, voiceBuild, voiceStart } from './voice.js';
import { LEAD_GLIDE_TC, fstrike } from './stages.js';
import { buildFMBank } from './fm.js';
import { KS_BANKS, buildKSBank, buildKSFallback } from './ks.js';

/* --- Соло-банки: 4 тембра из версии 2 сохранены 1-в-1, добавлены Флейта и 8-бит. ksOk — загрузился
   ли KS-ворклет: если да, хвост списка (Струна/Ситар) строим физ.-моделью, иначе — запасными
   субтрактивными щипками, чтобы banks[] не разъехался с LEAD_INSTR по индексам. --- */
/* ⚠️ СТРОИТЕЛЬ БАНКОВ ТЕПЕРЬ СТРОИТ РОВНО ОДИН БАНК — тот, что просят (only = индекс инструмента).
   ПОЧЕМУ: раньше здесь строились ВСЕ 23 банка сразу и жили вечно, приглушённые гейтом ig (40
   осцилляторов + 7 KS-ворклетов, всегда, на любом телефоне, каким бы инструментом ни играли). Пока
   соло было МОНО, это была одна цена на всё приложение. С пулом голосов «строить всё в каждом голосе»
   дало бы 6×40 осцилляторов и 6×7 ворклетов — вот это и убило бы полифонию. Голос строит СВОЙ банк,
   лениво, поэтому пул ДЕШЕВЛЕ сегодняшнего: один инструмент в игре = 1..5 осцилляторов вместо 40.
   ⛔ НЕ возвращать построение «всех банков»: ни глобально, ни тем более в каждом голосе.
   КАК СДЕЛАНО МАЛОЙ КРОВЬЮ: тела банков НЕ тронуты (в этом и гарантия «одна нота звучит как раньше») —
   каждый блок лишь обёрнут гейтом sel(i++), а собранный банк по-прежнему кладётся в banks[] через
   banks.push. banks — СКРАТЧ-массив: вызывающий (buildLeadBank) чистит его и забирает единственный
   элемент. Счётчик i растёт у КАЖДОГО блока (sel зовётся всегда) — индексы не разъезжаются с LEAD_INSTR. */
function buildLeadBanks(E, preBus, ksOk, only){
  let i=0; const sel=n=>only==null||only===n;
  if(sel(i++)){ // SuperSaw
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const oscs=[]; for(const sp of [-12,-6,0,6,12]){
      const o=mkOsc(E, 'sawtooth',220,ig,0.17); o.detune.value=sp; oscs.push(o); }
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,tc)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t))});
  }
  if(sel(i++)){ // Орган (аддитивный)
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.42],[2,.22],[3,.14],[4,.09]].map(([h,g])=>({h,o:mkOsc(E, 'sine',220*h,ig,g)}));
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,tc)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый (hum=0): собственная расстройка замаскировала бы биения строёв
  }
  if(sel(i++)){ // Пад
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2100; lp.connect(ig);
    const oscs=[]; for(const dt of [-7,0,7]){
      const o=mkOsc(E, 'triangle',220,lp,0.34); o.detune.value=dt; oscs.push(o); }
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,tc)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,2100,1.5,0.35,0.8), hum:0});   // мягкая огибающая фильтра + скорость→яркость; hum=0 — чистая высота для строёв
  }
  if(sel(i++)){ // Колокол (FM)
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const car=mkOsc(E, 'sine',220,ig,0.5);
    const mod=E.ac.createOscillator(); mod.type='sine'; mod.frequency.value=220*3.507;
    const mg=E.ac.createGain(); mg.gain.value=220*1.6;
    mod.connect(mg); mg.connect(car.frequency); voiceStart(E, mod);   // B: модулятор — тоже своей фазой относительно несущего (см. voiceStart)
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{
      car.frequency.setTargetAtTime(f,t,tc);
      mod.frequency.setTargetAtTime(f*3.507,t,tc);
      mg.gain.setTargetAtTime(f*1.6,t,tc); },
      cancel:t=>{ car.frequency.cancelScheduledValues(t);
        mod.frequency.cancelScheduledValues(t); mg.gain.cancelScheduledValues(t); }});
  }
  if(sel(i++)){ // Флейта: треугольник + синус-подпорка
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc(E, 'triangle',220,ig,0.35);
    const o2=mkOsc(E, 'sine',220,ig,0.22); o2.detune.value=4;
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{o1.frequency.setTargetAtTime(f,t,tc);
      o2.frequency.setTargetAtTime(f,t,tc);},
      cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  if(sel(i++)){ // 8-бит: чистый прямоугольник
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o=mkOsc(E, 'square',220,ig,0.28);
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>o.frequency.setTargetAtTime(f,t,tc),
                cancel:t=>o.frequency.cancelScheduledValues(t)});
  }
  /* Два FM-банка на общем buildFMBank. Порядок push совпадает с хвостом LEAD_INSTR (индексы 6,7).
     «Колокол (глубокий)»: ratio 1:1.41 (нецелый → плотная звонкая гроздь обертонов), пик индекса
     высокий и оседает медленно (tau 0.30) при длинном хвосте (rel 1.6) — металлический удар,
     переходящий в гул. «Металлофон»: ratio 1:3.51, скромнее пик, быстрый спад (tau 0.09) и короткий
     хвост (rel 0.45) — яркий короткий «тинь», как у гамелановой пластины. */
  if(sel(i++))buildFMBank(E, preBus,{ratio:1.41, peak:10, sus:1.0,  tau:0.30});   // Колокол (глубокий)
  if(sel(i++))buildFMBank(E, preBus,{ratio:3.51, peak:7,  sus:0.35, tau:0.09});   // Металлофон
  /* --- Четыре семейства обычных субтрактивных банков (индексы 8..15, порядок push = хвост LEAD_INSTR).
     Стиль тот же, что у банков выше: ig-гейт → preBus, осцилляторы через mkOsc (вибрато+общая цепочка),
     статичный НЧ-фильтр на банк. Огибающую громкости даёт env ГОЛОСА по att/rel из LEAD_INSTR —
     сам банк её не трогает. В лид-цепочке нет ПОФАЗНОЙ огибающей фильтра и нет стадии спада-на-удержании
     (env держит 1, пока нота зажата): «щипок» слышен на атаке и на релизе/стаккато, а не как затухание
     удержанной ноты; «тростевой» призвук — из гармоник и резонанса фильтра, не из его движения. */
  if(sel(i++)){ // Пад тёплый: расстроенная пара пил через мягкий НЧ — длинный слитный гул для слышимости биений
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400; lp.connect(ig);
    const oscs=[]; for(const dt of [-8,8]){ const o=mkOsc(E, 'sawtooth',220,lp,0.30); o.detune.value=dt; oscs.push(o); }
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,tc)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,1400,1.5,0.4,0.8), hum:0});   // пад: плавная огибающая фильтра; hum=0 — чистая высота для строёв
  }
  if(sel(i++)){ // Пад стеклянный: треугольник+синус, фильтр ярче — воздушнее, тоже длинный
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200; lp.connect(ig);
    const o1=mkOsc(E, 'triangle',220,lp,0.30); o1.detune.value=-5;
    const o2=mkOsc(E, 'sine',220,lp,0.24);     o2.detune.value=6;
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{o1.frequency.setTargetAtTime(f,t,tc); o2.frequency.setTargetAtTime(f,t,tc);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,3200,1.4,0.35,0.7), hum:0});   // пад: чуть ярче, тоже чистый для строёв
  }
  if(sel(i++)){ // Уд: тёплый щипок — пила+треугольник через низкий НЧ, лёгкая расстройка
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; lp.connect(ig);
    const o1=mkOsc(E, 'sawtooth',220,lp,0.28); o1.detune.value=-4;
    const o2=mkOsc(E, 'triangle',220,lp,0.22); o2.detune.value=4;
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{o1.frequency.setTargetAtTime(f,t,tc); o2.frequency.setTargetAtTime(f,t,tc);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,1200,3.0,0.12,1.5)});   // щипок: яркое открытие фильтра, быстро закрывается; hum по умолчанию (1)
  }
  if(sel(i++)){ // Струна щипком: ярче и суше — одна пила через более открытый фильтр
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; lp.connect(ig);
    const o=mkOsc(E, 'sawtooth',220,lp,0.26);
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>o.frequency.setTargetAtTime(f,t,tc),
                cancel:t=>o.frequency.cancelScheduledValues(t),
                strike:fstrike(lp,2600,3.5,0.08,1.5)});   // щипок ярче/суше — резче открытие и закрытие фильтра
  }
  if(sel(i++)){ // Флейта воздушная: почти синус + тихая октавная подпорка. ШУМА НЕТ: лид-банки в этой цепочке —
    // чисто осцилляторные (noiseBuf рождается позже, в initAudio), «дыхание» дают осцилляторы, не шум.
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc(E, 'sine',220,ig,0.34);
    const o2=mkOsc(E, 'sine',440,ig,0.05);   // тихая октава — лёгкий призвук вместо шума
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{o1.frequency.setTargetAtTime(f,t,tc); o2.frequency.setTargetAtTime(f*2,t,tc);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  if(sel(i++)){ // Тростевой: язычковый — прямоугольник+пила через РЕЗОНАНСНЫЙ НЧ (Q даёт формантный призвук)
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; lp.Q.value=6; lp.connect(ig);
    const o1=mkOsc(E, 'square',220,lp,0.18);
    const o2=mkOsc(E, 'sawtooth',220,lp,0.14); o2.detune.value=5;
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>{o1.frequency.setTargetAtTime(f,t,tc); o2.frequency.setTargetAtTime(f,t,tc);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,2200,2.0,0.15,1.2)});   // тростевой: умеренное движение резонансного фильтра — язычковое «оживление»
  }
  if(sel(i++)){ // Орган полный: драубары — гармоники 1,2,3,4,6 (октавы+квинты), плоская огибающая, БЕЗ расстройки
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);   // det=0 → тон сам не бьётся: лучший тембр для суждения о темперациях
    const parts=[[1,.34],[2,.26],[3,.20],[4,.14],[6,.08]].map(([h,g])=>({h,o:mkOsc(E, 'sine',220*h,ig,g)}));
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,tc)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — лучший тембр для суждения о строях
  }
  if(sel(i++)){ // Орган мягкий: меньше верхних гармоник, чуть скруглённая атака (att в LEAD_INSTR)
    const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.44],[2,.20],[3,.10]].map(([h,g])=>({h,o:mkOsc(E, 'sine',220*h,ig,g)}));
    E.build.banks.push({gain:ig,setFreq:(f,tc=LEAD_GLIDE_TC,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,tc)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — без собственной расстройки
  }
  KS_BANKS.forEach(o=>{ if(sel(i++)){ if(ksOk)buildKSBank(E, preBus,o); else buildKSFallback(E, preBus); } });   // Струна, Ситар, Уд, Кото, Сантур, Гитара, Пиццикато (индексы 16..22); ворклет не загрузился — запасной щипок держит индекс
}

/* Собрать ОДИН банк по индексу инструмента в вход голоса. banks — скратч (см. buildLeadBanks).
   vib — узел глубины вибрато ЭТОГО голоса: mkOsc цепляет его в detune (пара к hum). */
function buildLeadBank(E, ins, pre, hum, vib, shim){   // AF5: shim — this voice's gate of the expression shimmer (live copy; null = the shared node)
  E.build.banks.length=0; E.build.hum=hum; E.build.vib=vib; E.build.shim=shim||null;
  voiceBuild(E);                                    // B: новый банк голоса — первый осциллятор стартует сразу, остальные со своими фазами (см. voiceStart)
  buildLeadBanks(E, pre, E.wk.ks, ins);
  E.build.hum=null; E.build.vib=null; E.build.shim=null;
  return E.build.banks[0];
}
export { buildLeadBanks, buildLeadBank };
