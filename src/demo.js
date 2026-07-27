/* =====================================================================
   ДЕМО «ПУТЕШЕСТВИЕ ПО СТРОЯМ» (прототип, side-experiment)
   ---------------------------------------------------------------------
   Одна кнопка на стартовом экране проигрывает ОДИН мотив через шесть строёв
   с аранжировкой (бас, дрон/аккорды, ударные), аркой плотности и кросс-фейдом
   между сценами, затем возвращает стартовый экран. Стартовый поток (#startBtn)
   НЕ трогаем. Камера НЕ запрашивается — только звук по клику.

   СОСТОЯНИЕ ПРИЛОЖЕНИЯ НЕ ТРОГАЕТСЯ: высоту берём leadFreq/bassFreq/chordFreqs(…,
   ЯВНЫЙ лад) — лад сцены передаём объектом, setScaleIdx/setTonic НЕ зовём. Живой
   scaleIdx/tonic после демо те же (explicit-scale route, не save/restore).

   ЗВУК — СВОИ мини-голоса демо (не пул движка): все узлы планируются по часам AC
   (без дрейфа) и полностью гасятся на стопе. Движок не трогаем совсем — его chOn/
   bassOn/drumHit/droneOn играют «сейчас» (AC.currentTime), отложенного планирования
   у них нет; поэтому демо самодостаточно (правило «Everything stays inside the demo»).

   АРКА ПЛОТНОСТИ (мотив В КАЖДОЙ сцене — те же ступени, меняется ТОЛЬКО окружение):
     sparse (12-TET, Пифагоров): мелодия + лёгкий бас.
     full   (Хиджаз, Бхайрав, Пелог): мелодия + бас + дрон/аккорды + ударные.
     thin   (Болен–Пирс): мелодия + дрон (бас и ударные уходят) — пустое странное пространство.
   ГАРМОНИЯ по-культурному: supportsChords(лад) → аккорды; noChords (макам/рага/пелог/BP) → ДРОН.
   Триад под рагой не будет НИКОГДА — ровно та ошибка, которой проект избегает. (В этом наборе
   все full-сцены монофоничны → фактически всегда дрон; аккордовая ветка гейтится, но не звучит.)

   КРОСС-ФЕЙД: дрон/аккорд сцены гаснет НЕ на границе, а на OVERLAP секунд ПОЗЖЕ — заходит в
   следующую сцену; у sparse-сцен без дрона хвост даёт удлинённая последняя нота мелодии. Всё по AC. */

import { AC, initAudio } from './audio.js';
import { SCALES, leadFreq, bassFreq, chordFreqs, supportsChords } from './scales.js';

const $ = id => document.getElementById(id);

/* Мотив — В СТУПЕНЯХ лада (никогда не в частотах), одинаков во ВСЕХ сценах: [доля, ступень,
   длит.(доли)]. Ступени оборачиваются длиной лада в leadFreq (5-нотный лад превратит ступень 5
   в тонику периодом выше — так задумано). */
const THEME=[
  [0.0,0,0.5],[0.5,2,0.5],[1.0,4,1.0],
  [2.0,2,0.5],[2.5,4,0.5],[3.0,5,1.0],
  [4.0,4,0.5],[4.5,2,0.5],[5.0,0,2.0],
];
/* Бас — корни из ТЕХ ЖЕ ступеней, вдвое реже мелодии (сильные доли): 0 · 4 · 0. Даётся
   ступенями → bassFreq пере-настраивает под каждый лад. */
const BASSLINE=[ [0.0,0,2.0], [2.0,4,2.0], [4.0,0,3.0] ];
/* Ударные — лёгкий рисунок (ряды как в audio.drumHit: кик=0, снейр=1, хэт=3). Только в full-сценах. */
const DRUMLINE=[
  [0,0,1.0],[2,1,0.9],[4,0,1.0],[6,1,0.9],
  [0.5,3,0.25],[1.5,3,0.25],[2.5,3,0.25],[3.5,3,0.25],[4.5,3,0.25],[5.5,3,0.25],
];
const SPB=0.5;       // секунд на долю (120 BPM): мотив = 7 долей = 3.5 c
const OVERLAP=0.8;   // с: на сколько хвост сцены заходит в следующую (кросс-фейд)

/* Плотность по уровню: что ОКРУЖАЕТ мотив (сам мотив неизменен). */
const LEVELS={
  sparse:{bass:true,  drums:false, harmony:false},
  full:  {bass:true,  drums:true,  harmony:true },
  thin:  {bass:false, drums:false, harmony:true },
};

/* Сцены: idx — СТАБИЛЬНЫЙ индекс лада в SCALES (массив append-only, индексы не двигаются), строка-
   культура, длительность (с), уровень плотности, цвет-тинт фона. РАНЬШЕ сцену сопоставляли с ладом ПО
   ИМЕНИ (SCALES.find по s.name) — но имена интернационализируются, и совпадение по имени сломалось бы;
   индекс от языка не зависит. Имя лада на экране берём из самого лада (SCALES[idx].name), не дублируем.
   Комментарий рядом — какой это лад (для читаемости, НЕ для сопоставления). */
const SCENES=[
  {idx:0,  culture:'как ваше фортепиано',  dur:4, level:'sparse', tint:'#ff9e2c'},   // Мажор (ионийский)
  {idx:57, culture:'средневековая Европа', dur:4, level:'sparse', tint:'#b18cff'},   // Пифагоров строй (чистые квинты)
  {idx:18, culture:'Ближний Восток',       dur:5, level:'full',   tint:'#57d9a3'},   // Макам Хиджаз
  {idx:62, culture:'Индия',                dur:5, level:'full',   tint:'#e5484d'},   // Бхайрав
  {idx:44, culture:'Ява',                  dur:5, level:'full',   tint:'#4db3ff'},   // Пелог (яван. гамелан, приближение)
  {idx:50, culture:'строй без октавы',     dur:5, level:'thin',   tint:'#ff5ca8'},   // Болен–Пирс (13 равных, тритава)
];

let running=false, voices=[], timers=[], pitchBus=null, pitchLP=null, drumBus=null, noiseBuf=null;

/* Все осцилляторы/источники копим в voices[] → на стопе жёстко глушим (нет застрявших нот). */
function track(node){ voices.push(node); return node; }

/* Мелодия: пила×2 (расстройка) → шина, огибающая по временам AC. last=true → удлинённый релиз,
   чтобы последняя нота сцены звенела в следующую (хвост-кросс-фейд для sparse-сцен без дрона). */
function melodyVoice(freq, at, durBeats, last){
  const durSec=durBeats*SPB, att=0.02, rel=last?0.7:0.28;
  const g=AC.createGain(); g.connect(pitchBus);
  const o1=track(AC.createOscillator()), o2=track(AC.createOscillator());
  o1.type='sawtooth'; o2.type='sawtooth';
  o1.frequency.setValueAtTime(freq,at); o2.frequency.setValueAtTime(freq,at); o2.detune.setValueAtTime(8,at);
  o1.connect(g); o2.connect(g);
  g.gain.setValueAtTime(0,at);
  g.gain.linearRampToValueAtTime(0.2, at+att);
  g.gain.setTargetAtTime(0, at+durSec, rel/3);
  const stopAt=at+durSec+rel+0.15;
  o1.start(at); o2.start(at); o1.stop(stopAt); o2.stop(stopAt);
}

/* Бас: пила+синус, НЧ-фильтр — низкий фундамент. Частота из bassFreq (пере-настройка по ладу). */
function bassVoice(freq, at, durBeats){
  const durSec=durBeats*SPB, att=0.02, rel=0.22;
  const g=AC.createGain(); const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=650;
  lp.connect(g); g.connect(pitchBus);
  const o1=track(AC.createOscillator()), o2=track(AC.createOscillator());
  o1.type='sawtooth'; o2.type='sine';
  o1.frequency.setValueAtTime(freq,at); o2.frequency.setValueAtTime(freq,at);
  o1.connect(lp); o2.connect(lp);
  g.gain.setValueAtTime(0,at);
  g.gain.linearRampToValueAtTime(0.26, at+att);
  g.gain.setTargetAtTime(0, at+durSec, rel/3);
  const stopAt=at+durSec+rel+0.15; o1.start(at); o2.start(at); o1.stop(stopAt); o2.stop(stopAt);
}

/* Сустейн-слой (дрон ИЛИ аккорд): набор частот звучит от at, с фейдом-ин, держится и гаснет к
   endAt (= конец сцены + OVERLAP → заходит в следующую сцену = кросс-фейд). */
function sustainLayer(freqs, at, endAt, level){
  const fadeIn=0.4, fadeOut=OVERLAP;
  const g=AC.createGain(); const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
  lp.connect(g); g.connect(pitchBus);
  g.gain.setValueAtTime(0,at);
  g.gain.linearRampToValueAtTime(level, at+fadeIn);
  g.gain.setValueAtTime(level, Math.max(at+fadeIn, endAt-fadeOut));
  g.gain.linearRampToValueAtTime(0, endAt);
  freqs.forEach((f,i)=>{
    const o1=track(AC.createOscillator()), o2=track(AC.createOscillator());
    o1.type='sawtooth'; o2.type='sawtooth';
    o1.frequency.setValueAtTime(f,at); o2.frequency.setValueAtTime(f,at); o2.detune.setValueAtTime(7,at);
    o1.connect(lp); o2.connect(lp);
    const stopAt=endAt+0.1; o1.start(at); o2.start(at); o1.stop(stopAt); o2.stop(stopAt);
  });
}

/* Ударные: свой синтез по ряду (кик/снейр/хэт), запланированный на время at (порт из audio.drumHit,
   но с явным временем — чтобы не было дрейфа setTimeout). */
function drumHit(row, at, vol){
  const v=0.3+0.7*vol;
  if(row===0){                                     // кик
    const o=track(AC.createOscillator()), g=AC.createGain();
    o.frequency.setValueAtTime(165,at); o.frequency.exponentialRampToValueAtTime(48,at+0.09);
    g.gain.setValueAtTime(v,at); g.gain.exponentialRampToValueAtTime(0.001,at+0.22);
    o.connect(g); g.connect(drumBus); o.start(at); o.stop(at+0.28);
  } else if(row===1){                              // снейр
    const s=track(dNoise(at,0.2)), f=AC.createBiquadFilter(), g=AC.createGain();
    f.type='highpass'; f.frequency.value=1400; g.gain.setValueAtTime(0.5*v,at); g.gain.exponentialRampToValueAtTime(0.001,at+0.17);
    s.connect(f); f.connect(g); g.connect(drumBus);
    const o=track(AC.createOscillator()), og=AC.createGain(); o.type='triangle'; o.frequency.value=185;
    og.gain.setValueAtTime(0.3*v,at); og.gain.exponentialRampToValueAtTime(0.001,at+0.09);
    o.connect(og); og.connect(drumBus); o.start(at); o.stop(at+0.11);
  } else {                                         // хэт (закр.)
    const s=track(dNoise(at,0.06)), f=AC.createBiquadFilter(), g=AC.createGain();
    f.type='highpass'; f.frequency.value=8200; g.gain.setValueAtTime(0.32*v,at); g.gain.exponentialRampToValueAtTime(0.001,at+0.05);
    s.connect(f); f.connect(g); g.connect(drumBus);
  }
}
function dNoise(at,dur){ const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.start(at); s.stop(at+dur); return s; }

function showScene(sc, idx, n){
  $('demoScene').textContent=(idx+1)+' / '+n;
  $('demoName').textContent=sc.scale?sc.scale.name:'';   // имя из самого лада (стабильно; позже L(sc.scale.name))
  $('demoCulture').textContent=sc.culture;
  $('demoOv').style.background=
    'radial-gradient(circle at 50% 38%, '+sc.tint+'38, rgba(7,7,13,.96) 70%)';
}

/* Стоп: жёстко глушит все узлы (стоп всех источников + обнуление шин), снимает таймеры, прячет
   оверлей, включает кнопки. #start под ним не трогали — снова виден. Живое состояние не менялось. */
function stopDemo(){
  if(!running) return;
  running=false;
  timers.forEach(clearTimeout); timers=[];
  const now=AC?AC.currentTime:0;
  voices.forEach(o=>{ try{o.stop(now);}catch(e){} });
  voices=[];
  [pitchBus,drumBus].forEach(b=>{ if(b){ try{ b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(0,now); }catch(e){} } });
  [pitchBus,pitchLP,drumBus].forEach(n=>{ if(n){ try{n.disconnect();}catch(e){} } });
  pitchBus=pitchLP=drumBus=null;
  const ov=$('demoOv'); if(ov){ ov.classList.remove('on'); ov.style.background=''; }
  const db=$('demoBtn'); if(db) db.disabled=false;
  const sb=$('startBtn'); if(sb) sb.disabled=false;
}

async function runDemo(){
  if(running) return;
  const scenes=SCENES.map(sc=>({...sc, scale:SCALES[sc.idx]}))
                     .filter(sc=>sc.scale);         // индекс вне массива — пропускаем сцену (без падения)
  if(!scenes.length) return;
  $('demoBtn').disabled=true; $('startBtn').disabled=true;
  try{
    if(!AC) initAudio();                            // как #startBtn: AudioContext только по клику
    await AC.resume();
  }catch(e){ $('demoBtn').disabled=false; $('startBtn').disabled=false; return; }
  running=true;

  pitchBus=AC.createGain(); pitchBus.gain.value=0.9;
  pitchLP=AC.createBiquadFilter(); pitchLP.type='lowpass'; pitchLP.frequency.value=2600;
  pitchBus.connect(pitchLP); pitchLP.connect(AC.destination);
  drumBus=AC.createGain(); drumBus.gain.value=0.5; drumBus.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }

  $('demoOv').classList.add('on');
  showScene(scenes[0],0,scenes.length);

  const t0=AC.currentTime+0.15;
  let accSec=0, accMs=0;
  scenes.forEach((sc,idx)=>{
    const base=t0+accSec, dens=LEVELS[sc.level];
    // мелодия (всегда) — те же ступени; последняя нота с длинным хвостом
    THEME.forEach(([beat,deg,dur],k)=>
      melodyVoice(leadFreq(deg,0,sc.scale), base+beat*SPB, dur, k===THEME.length-1));
    // бас (sparse/full)
    if(dens.bass) for(const [beat,deg,dur] of BASSLINE)
      bassVoice(bassFreq(deg,0,sc.scale), base+beat*SPB, dur);
    // гармония (full/thin): аккорды где строй их поддерживает, иначе ДРОН (макам/рага/пелог/BP)
    if(dens.harmony){
      const endAt=base + sc.dur + OVERLAP;                // конец сцены (в AC-секундах) + перекрытие → заход в следующую
      let freqs;
      if(supportsChords(sc.scale)) freqs=chordFreqs(0,0,sc.scale,false,null);   // аккорд от тоники (гейт; в этом наборе не срабатывает)
      else freqs=[ leadFreq(0,0,sc.scale)/2, leadFreq(0,0,sc.scale)*3/4 ];      // дрон: тоника октавой ниже + квинта
      sustainLayer(freqs, base, endAt, supportsChords(sc.scale)?0.05:0.11);
    }
    // ударные (только full)
    if(dens.drums) for(const [beat,row,vol] of DRUMLINE)
      drumHit(row, base+beat*SPB, vol);
    // подпись — по таймеру (визуально)
    const showAt=accMs;
    timers.push(setTimeout(()=>{ if(running) showScene(sc,idx,scenes.length); }, showAt));
    accSec+=sc.dur; accMs+=sc.dur*1000;
  });
  // финал: даём последнему дрону договорить перекрытие, затем возвращаем стартовый экран
  timers.push(setTimeout(stopDemo, accMs+(OVERLAP+0.5)*1000));
}

/* Проводка кнопок. Модуль грузится из main.js после разбора DOM (script в конце body). */
{
  const db=$('demoBtn'); if(db) db.onclick=runDemo;
  const ds=$('demoSkip'); if(ds) ds.onclick=stopDemo;
}
