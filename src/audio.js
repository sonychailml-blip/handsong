import { leadIdx, setLeadIdx, bassIdx, setBassIdx, drumKitIdx, setDrumKitIdx } from './state.js';
import { baseF, tonicFreq } from './scales.js';
import { hooks } from './hooks.js';
import { CHORD_POOL_N, BASS_POOL_N } from './config.js';
 
/* ================= МУЗЫКАЛЬНЫЕ КОНСТАНТЫ ================= */
 
const LEAD_INSTR=[
  {label:'SuperSaw', att:0.012, rel:0.10},
  {label:'Орган',    att:0.008, rel:0.07},
  {label:'Пад',      att:0.120, rel:0.35},
  {label:'Колокол',  att:0.004, rel:0.30},
  {label:'Флейта',   att:0.050, rel:0.18},
  {label:'8-бит',    att:0.002, rel:0.05},
  /* FM-тембры (несущий+модулятор, огибающая индекса) — inгармонические спектры, недостижимые
     субтрактивным путём. rel длиннее tau индекса → «удар» ярче хвоста (см. buildFMBank). */
  {label:'Колокол (глубокий)', att:0.004, rel:1.6},
  {label:'Металлофон',         att:0.002, rel:0.45},
  /* Четыре новых семейства (индексы 8..15, тот же порядок, что банки в buildLeadBanks). Существующие
     8 записей выше не тронуты (байт-в-байт), новые сгруппированы по семействам ради читаемого списка.
     ПАДЫ — att медленный, rel ДЛИННЫЙ (~2.5с): звук должен тянуться, чтобы биения интервалов успели
     развиться (главное этого захода — слышимость строёв). ЩИПКОВЫЕ — быстрая атака, короткий rel.
     ДУХОВЫЕ — мягкая атака, умеренный rel. ОРГАНЫ — быстрые атака/релиз, плоско. */
  {label:'Пад тёплый',      att:0.35,  rel:2.5},   // ПАДЫ
  {label:'Пад стеклянный',  att:0.30,  rel:2.5},
  {label:'Уд',              att:0.004, rel:0.35},  // ЩИПКОВЫЕ
  {label:'Струна щипком',   att:0.003, rel:0.22},
  {label:'Флейта воздушная',att:0.06,  rel:0.20},  // ДУХОВЫЕ
  {label:'Тростевой',       att:0.04,  rel:0.16},
  {label:'Орган полный',    att:0.006, rel:0.06},  // ОРГАННЫЕ
  {label:'Орган мягкий',    att:0.02,  rel:0.10},
  /* Карплюс–Стронг (физ. модель щипковой струны) — третий способ построения голоса (ворклет,
     см. ks-worklet.js и buildKSBank). Быстрая атака, естественный хвост даёт сама петля. */
  {label:'Струна',    att:0.002, rel:0.4},
  {label:'Ситар',     att:0.002, rel:0.6},
  {label:'Уд (струна)', att:0.002, rel:0.3},  // KS-щипковые: параметрические вариации одной струны (см. KS_BANKS). «(струна)» — чтобы не дублировать субтрактивный «Уд» (индекс 10)
  {label:'Кото',      att:0.002, rel:0.5},
  {label:'Сантур',    att:0.001, rel:0.25},
  {label:'Гитара',    att:0.002, rel:0.5},
  {label:'Пиццикато', att:0.001, rel:0.15},
];
/* Аккордовые тембры: 2 осциллятора (типы t1/t2, отношение частот ratio, расстройка det в центах,
   микс m1/m2), общий НЧ-фильтр lp, огибающая att/rel. Плюс улучшения качества (per-bank):
   fo — во сколько раз фильтр открыт в атаке (огибающая фильтра), ft — время оседания, fv — скорость→
   яркость (cutoff = lp·(1+fv·vol), пол=lp), hj — гуманизация высоты (0 у органа/падов для строёв). */
const CHORD_INSTR=[
  {label:'Тёплый пад',     t1:'sawtooth', t2:'sawtooth', ratio:1, det:9, m1:.50, m2:.50, lp:1500, lvl:.17, att:.22,  rel:.50, fo:1.4, ft:.30, fv:.6, hj:0},
  {label:'Стеклянный пад', t1:'triangle', t2:'sine',     ratio:2, det:5, m1:.55, m2:.30, lp:3400, lvl:.21, att:.14,  rel:.60, fo:1.4, ft:.28, fv:.6, hj:0},
  {label:'Орган',          t1:'square',   t2:'sine',     ratio:2, det:0, m1:.45, m2:.35, lp:4200, lvl:.15, att:.012, rel:.09, fo:1.0, ft:.02, fv:.2, hj:0},
  {label:'Эл. пиано',      t1:'sine',     t2:'sine',     ratio:3, det:0, m1:.60, m2:.16, lp:5200, lvl:.22, att:.004, rel:.45, fo:2.2, ft:.12, fv:1.0,hj:1},
  /* Аккордовые эквиваленты новых семейств. Пул строит голос иначе (o1/o2 → фильтр, тембр печётся на
     атаке), поэтому характер адаптирован под ЭТУ форму, а не скопирован из лид-банков. Существующие 4
     записи выше не тронуты (байт-в-байт). Аккордовый голос ДЕРЖИТ уровень, пока зажат → «сустейн» уже
     есть; для строёв важнее ДЛИННЫЙ rel (хвост, где слышны биения) и СТАБИЛЬНЫЙ тон (органы: det=0,
     сами не бьются). Имена с «(долгий)»: существующие «Тёплый/Стеклянный пад» короче — новые тянутся. */
  {label:'Пад тёплый (долгий)',     t1:'sawtooth', t2:'sawtooth', ratio:1, det:10, m1:.50, m2:.50, lp:1300, lvl:.16, att:.35,  rel:1.8, fo:1.4, ft:.35, fv:.6, hj:0},  // ПАДЫ (hj=0 — чистая высота для строёв)
  {label:'Пад стеклянный (долгий)', t1:'triangle', t2:'sine',     ratio:2, det:6,  m1:.52, m2:.30, lp:3000, lvl:.18, att:.30,  rel:1.8, fo:1.4, ft:.30, fv:.6, hj:0},
  {label:'Уд',                      t1:'sawtooth', t2:'triangle', ratio:1, det:4,  m1:.50, m2:.34, lp:1200, lvl:.20, att:.004, rel:.30, fo:3.0, ft:.12, fv:1.4,hj:1},  // ЩИПКОВЫЕ (яркое открытие фильтра)
  {label:'Струна щипком',           t1:'sawtooth', t2:'sawtooth', ratio:1, det:2,  m1:.46, m2:.30, lp:2600, lvl:.18, att:.003, rel:.22, fo:3.2, ft:.09, fv:1.4,hj:1},
  {label:'Флейта',                  t1:'sine',     t2:'sine',     ratio:2, det:0,  m1:.60, m2:.18, lp:2600, lvl:.20, att:.06,  rel:.20, fo:1.3, ft:.08, fv:.5, hj:1},  // ДУХОВЫЕ
  {label:'Тростевой',               t1:'square',   t2:'sawtooth', ratio:1, det:5,  m1:.34, m2:.26, lp:2200, lvl:.15, att:.05,  rel:.18, fo:2.0, ft:.14, fv:1.0,hj:1},
  {label:'Орган полный',            t1:'square',   t2:'sine',     ratio:3, det:0,  m1:.42, m2:.30, lp:4800, lvl:.15, att:.008, rel:.10, fo:1.0, ft:.02, fv:.2, hj:0},  // ОРГАННЫЕ (det=0, hj=0 — лучший для строёв)
  {label:'Орган мягкий',            t1:'sine',     t2:'sine',     ratio:2, det:0,  m1:.58, m2:.24, lp:3000, lvl:.17, att:.02,  rel:.12, fo:1.0, ft:.02, fv:.2, hj:0},
  /* Расширение (индексы 12..15). НЕ дублируем уже имеющееся: «Орган» (idx 2, det=0) — уже чистый
     эталон для строёв; тёплые/длинные пады и щипковые (Уд/Струна щипком) тоже есть. Добавляем ровно
     то, чего НЕ было: ПИТЧ-ЧИСТЫЕ пады (существующие все с расстройкой det 5..10 — тембр сам бьётся;
     здесь det=0, характер из РАЗНЫХ волн, а не из расстройки → биения = ТОЛЬКО строй), смычковые и
     яркий щипок. hj=0 у падов/струнных (для строёв), hj=1 только у щипковых (не инструмент для строёв). */
  {label:'Пад тёплый (чистый)',     t1:'sawtooth', t2:'triangle', ratio:1, det:0,  m1:.48, m2:.34, lp:1400, lvl:.16, att:.30,  rel:2.0, fo:1.4, ft:.35, fv:.6, hj:0},  // ЧИСТЫЕ ПАДЫ (det=0 — биения только от строя)
  {label:'Пад стеклянный (чистый)', t1:'triangle', t2:'sine',     ratio:2, det:0,  m1:.52, m2:.28, lp:3000, lvl:.18, att:.28,  rel:2.0, fo:1.4, ft:.30, fv:.6, hj:0},  // ratio 2 = чистая октава (без биений)
  {label:'Струнные',                t1:'sawtooth', t2:'sawtooth', ratio:1, det:6,  m1:.46, m2:.40, lp:2200, lvl:.17, att:.18,  rel:.80, fo:1.6, ft:.30, fv:.8, hj:0},  // СМЫЧКОВЫЕ: мягкая атака + медленное открытие фильтра (наплыв), лёгкая ширина ансамбля
  {label:'Щипковые',                t1:'sawtooth', t2:'square',   ratio:1, det:3,  m1:.44, m2:.28, lp:2800, lvl:.19, att:.003, rel:.20, fo:3.5, ft:.08, fv:1.5, hj:1},  // ЯРКИЙ ЩИПОК: быстрая атака, резкое открытие/закрытие фильтра — для макамов/пентатоник, где пад неуместен
];
/* Бас-тембры (моно-голос, низкий регистр): 2 осц (t1/t2, отношение ratio, расстройка det),
   НЧ-фильтр lp, огибающая att/rel. Плюс огибающая фильтра на атаке: fo — открытие, ft — время,
   fv — скорость→яркость (cutoff = lp·(1+fv·vol), пол=lp). Высоту баса НЕ гуманизируем (низкие
   биения гулкие); синус (Саб) на фильтр почти не реагирует — fo мал. */
const BASS_INSTR=[
  {label:'Саб-синус', t1:'sine',     t2:'sine',     det:0,  ratio:1,   lp:420,  lvl:.45, att:.020, rel:.20, fo:1.0, ft:.03, fv:.2},
  {label:'Пила',      t1:'sawtooth', t2:'sawtooth', det:9,  ratio:1,   lp:850,  lvl:.38, att:.014, rel:.16, fo:2.5, ft:.10, fv:1.2},
  {label:'Кислотный', t1:'square',   t2:'sawtooth', det:0,  ratio:1,   lp:1300, lvl:.34, att:.008, rel:.13, fo:3.5, ft:.12, fv:1.6},
  {label:'Синт-бас',  t1:'sawtooth', t2:'square',   det:12, ratio:0.5, lp:700,  lvl:.40, att:.020, rel:.24, fo:2.0, ft:.12, fv:1.0},
  /* Расширение (индексы 4..6). Существующие 4 не тронуты (байт-в-байт). Бас НЕ гуманизируем по высоте
     (низкие расстройки гулкие) — здесь только огибающая фильтра/скорость→яркость, как у пула. */
  {label:'Контрабас',        t1:'sawtooth', t2:'triangle', det:4,  ratio:1,   lp:520,  lvl:.38, att:.004, rel:.30, fo:2.5, ft:.10, fv:1.2},  // щипковый контрабас: быстрая атака, тёплый, средний спад
  {label:'Синт-бас мягкий',  t1:'sine',     t2:'triangle', det:0,  ratio:1,   lp:480,  lvl:.42, att:.020, rel:.22, fo:1.8, ft:.15, fv:.8},   // круглый саб, лёгкое движение фильтра
  {label:'Орган-бас',        t1:'square',   t2:'sine',     det:0,  ratio:1,   lp:620,  lvl:.36, att:.012, rel:.30, fo:1.0, ft:.02, fv:.3},   // ровный тянущийся низ — для дронов и педалей (fo=1: без наплыва)
];
/* Ударные: имена рядов (индекс 0 = низ сетки). Синтез на лету, без сэмплов. */
const DRUM_NAMES=['Кик','Снейр','Клэп','Хэт','Том','Крэш'];
const DRUM_ROWS=DRUM_NAMES.length;
/* Наборы ударных: тембр рядов. Стандарт — синтезированный кит; Дарбука — дум/тек
   (спасены из удалённого backing.js). Селектор той же формы, что LEAD_INSTR и др. */
const DRUM_KITS=[{label:'Стандарт'},{label:'Дарбука'},{label:'Табла'},{label:'Гамелан'},{label:'Тайко'}];

/* ================= АУДИО-ДВИЖОК (чистый Web Audio) ================= */
let AC=null, master, limiter, verb, verbOut;
let banks=[], vibGain, humDetune, satWet, satDry, envGain, volGain,
    tremGain, tremDepth, dlyWet, revLead;              // соло-цепочка (humDetune — гуманизация высоты, общий узел в detune всех лид-осц.)
let lastVel=0.5;                                        // последняя громкость X — скорость→яркость читает её на атаке (формат события не трогаем)
let chordBus, revCh;                                    // аккорды (Z-яркость — пер-голосовой фильтр fb в пуле, не на шине)
let backBus, dO1, dO2, dG, noiseBuf;                    // дрон (шина + расстроенная пара)
const cv=[]; const chordHold={};                        // пул аккордовых голосов
let noteOnFlag=false;
const bv=[]; const bassHold={}; let bassBus;             // пул баса (моно-голос на слой)
let drumBus;                                             // шина ударных
 
function makeSatCurve(k=4,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x);} return c; }
function makeIR(sec=1.8,decay=2.2){
  const len=Math.floor(AC.sampleRate*sec), b=AC.createBuffer(2,len,AC.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
  return b;
}
function mkOsc(type,freq,dest,gainVal){
  const o=AC.createOscillator(); o.type=type; o.frequency.value=freq;
  const g=AC.createGain(); g.gain.value=gainVal;
  o.connect(g); g.connect(dest); vibGain.connect(o.detune); humDetune.connect(o.detune); o.start();   // вибрато И гуманизация — оба в detune (центы), сумма с собственной расстройкой осц.
  return o;
}
const HUM_CENTS=4;   // глубина гуманизации высоты: ±центов на ноту — оживляет, но не читается как «расстроено»
/* Границы cutoff пер-голосового фильтра яркости fb (Hz), см. briToHz. MAX высоко — ВЫШЕ собственных
   фильтров f аккордовых голосов (lp 1200..5200): при нейтрали (depth=0) fb открыт настолько, что звук
   практически не меняется (fb в тракте всегда — перцептивно неотличимо, не байт-в-байт). MIN —
   приглушённый «далёкий» аккорд. */
const CHORD_LP_MAX=18000, CHORD_LP_MIN=700;
/* Огибающая фильтра + скорость→яркость на атаке (для лид-банков с фильтром). Возвращает strike(t,vel):
   cutoff прыгает к base*open (ярче в атаке), оседает к base*(1+fv*vel) за tc — громче нота = ярче,
   ПОЛ = base, поэтому тихая нота не глохнет. setFreq НЕ трогает фильтр → пофреймовая пересылка живого
   лид-пути не сбивает эту огибающую (в отличие от частоты). */
const fstrike=(lp,base,open,tc,fv)=>(t,vel)=>{
  lp.frequency.cancelScheduledValues(t);
  lp.frequency.setValueAtTime(base*open,t);
  lp.frequency.setTargetAtTime(base*(1+fv*vel),t,tc); };
/* --- Соло-банки: 4 тембра из версии 2 сохранены 1-в-1, добавлены Флейта и 8-бит. ksOk — загрузился
   ли KS-ворклет: если да, хвост списка (Струна/Ситар) строим физ.-моделью, иначе — запасными
   субтрактивными щипками, чтобы banks[] не разъехался с LEAD_INSTR по индексам. --- */
function buildLeadBanks(preBus, ksOk){
  { // SuperSaw
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const oscs=[]; for(const sp of [-12,-6,0,6,12]){
      const o=mkOsc('sawtooth',220,ig,0.17); o.detune.value=sp; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t))});
  }
  { // Орган (аддитивный)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.42],[2,.22],[3,.14],[4,.09]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый (hum=0): собственная расстройка замаскировала бы биения строёв
  }
  { // Пад
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2100; lp.connect(ig);
    const oscs=[]; for(const dt of [-7,0,7]){
      const o=mkOsc('triangle',220,lp,0.34); o.detune.value=dt; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,2100,1.5,0.35,0.8), hum:0});   // мягкая огибающая фильтра + скорость→яркость; hum=0 — чистая высота для строёв
  }
  { // Колокол (FM)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const car=mkOsc('sine',220,ig,0.5);
    const mod=AC.createOscillator(); mod.type='sine'; mod.frequency.value=220*3.507;
    const mg=AC.createGain(); mg.gain.value=220*1.6;
    mod.connect(mg); mg.connect(car.frequency); mod.start();
    banks.push({gain:ig,setFreq:(f,t)=>{
      car.frequency.setTargetAtTime(f,t,0.02);
      mod.frequency.setTargetAtTime(f*3.507,t,0.02);
      mg.gain.setTargetAtTime(f*1.6,t,0.02); },
      cancel:t=>{ car.frequency.cancelScheduledValues(t);
        mod.frequency.cancelScheduledValues(t); mg.gain.cancelScheduledValues(t); }});
  }
  { // Флейта: треугольник + синус-подпорка
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc('triangle',220,ig,0.35);
    const o2=mkOsc('sine',220,ig,0.22); o2.detune.value=4;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02);
      o2.frequency.setTargetAtTime(f,t,0.02);},
      cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  { // 8-бит: чистый прямоугольник
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o=mkOsc('square',220,ig,0.28);
    banks.push({gain:ig,setFreq:(f,t)=>o.frequency.setTargetAtTime(f,t,0.02),
                cancel:t=>o.frequency.cancelScheduledValues(t)});
  }
  /* Два FM-банка на общем buildFMBank. Порядок push совпадает с хвостом LEAD_INSTR (индексы 6,7).
     «Колокол (глубокий)»: ratio 1:1.41 (нецелый → плотная звонкая гроздь обертонов), пик индекса
     высокий и оседает медленно (tau 0.30) при длинном хвосте (rel 1.6) — металлический удар,
     переходящий в гул. «Металлофон»: ratio 1:3.51, скромнее пик, быстрый спад (tau 0.09) и короткий
     хвост (rel 0.45) — яркий короткий «тинь», как у гамелановой пластины. */
  buildFMBank(preBus,{ratio:1.41, peak:10, sus:1.0,  tau:0.30});   // Колокол (глубокий)
  buildFMBank(preBus,{ratio:3.51, peak:7,  sus:0.35, tau:0.09});   // Металлофон
  /* --- Четыре семейства обычных субтрактивных банков (индексы 8..15, порядок push = хвост LEAD_INSTR).
     Стиль тот же, что у банков выше: ig-гейт → preBus, осцилляторы через mkOsc (вибрато+общая цепочка),
     статичный НЧ-фильтр на банк. Огибающую громкости даёт ГЛОБАЛЬНЫЙ envGain по att/rel из LEAD_INSTR —
     сам банк её не трогает. В лид-цепочке нет ПОФАЗНОЙ огибающей фильтра и нет стадии спада-на-удержании
     (envGain держит 1, пока нота зажата): «щипок» слышен на атаке и на релизе/стаккато, а не как затухание
     удержанной ноты; «тростевой» призвук — из гармоник и резонанса фильтра, не из его движения. */
  { // Пад тёплый: расстроенная пара пил через мягкий НЧ — длинный слитный гул для слышимости биений
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400; lp.connect(ig);
    const oscs=[]; for(const dt of [-8,8]){ const o=mkOsc('sawtooth',220,lp,0.30); o.detune.value=dt; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,1400,1.5,0.4,0.8), hum:0});   // пад: плавная огибающая фильтра; hum=0 — чистая высота для строёв
  }
  { // Пад стеклянный: треугольник+синус, фильтр ярче — воздушнее, тоже длинный
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200; lp.connect(ig);
    const o1=mkOsc('triangle',220,lp,0.30); o1.detune.value=-5;
    const o2=mkOsc('sine',220,lp,0.24);     o2.detune.value=6;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,3200,1.4,0.35,0.7), hum:0});   // пад: чуть ярче, тоже чистый для строёв
  }
  { // Уд: тёплый щипок — пила+треугольник через низкий НЧ, лёгкая расстройка
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; lp.connect(ig);
    const o1=mkOsc('sawtooth',220,lp,0.28); o1.detune.value=-4;
    const o2=mkOsc('triangle',220,lp,0.22); o2.detune.value=4;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,1200,3.0,0.12,1.5)});   // щипок: яркое открытие фильтра, быстро закрывается; hum по умолчанию (1)
  }
  { // Струна щипком: ярче и суше — одна пила через более открытый фильтр
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; lp.connect(ig);
    const o=mkOsc('sawtooth',220,lp,0.26);
    banks.push({gain:ig,setFreq:(f,t)=>o.frequency.setTargetAtTime(f,t,0.02),
                cancel:t=>o.frequency.cancelScheduledValues(t),
                strike:fstrike(lp,2600,3.5,0.08,1.5)});   // щипок ярче/суше — резче открытие и закрытие фильтра
  }
  { // Флейта воздушная: почти синус + тихая октавная подпорка. ШУМА НЕТ: лид-банки в этой цепочке —
    // чисто осцилляторные (noiseBuf рождается позже, в initAudio), «дыхание» дают осцилляторы, не шум.
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc('sine',220,ig,0.34);
    const o2=mkOsc('sine',440,ig,0.05);   // тихая октава — лёгкий призвук вместо шума
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f*2,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  { // Тростевой: язычковый — прямоугольник+пила через РЕЗОНАНСНЫЙ НЧ (Q даёт формантный призвук)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; lp.Q.value=6; lp.connect(ig);
    const o1=mkOsc('square',220,lp,0.18);
    const o2=mkOsc('sawtooth',220,lp,0.14); o2.detune.value=5;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,2200,2.0,0.15,1.2)});   // тростевой: умеренное движение резонансного фильтра — язычковое «оживление»
  }
  { // Орган полный: драубары — гармоники 1,2,3,4,6 (октавы+квинты), плоская огибающая, БЕЗ расстройки
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);   // det=0 → тон сам не бьётся: лучший тембр для суждения о темперациях
    const parts=[[1,.34],[2,.26],[3,.20],[4,.14],[6,.08]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — лучший тембр для суждения о строях
  }
  { // Орган мягкий: меньше верхних гармоник, чуть скруглённая атака (att в LEAD_INSTR)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.44],[2,.20],[3,.10]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — без собственной расстройки
  }
  if(ksOk) KS_BANKS.forEach(o=>buildKSBank(preBus,o));               // Струна, Ситар, Уд, Кото, Сантур, Гитара, Пиццикато (индексы 16..22)
  else KS_BANKS.forEach(()=>buildKSFallback(preBus));               // ворклет не загрузился — столько же запасных щипков держат индексы
}
/* Таблица KS-банков (порядок = хвост LEAD_INSTR с индекса 16). Все — ОДНА струна с разными
   параметрами (никакой новой архитектуры): fb — длина затухания, damp — петлевой фильтр (0.5 =
   максимум затухания верхов, дальше = ярче), exBase/exSpan — яркость щипка (тихо/громко), nl —
   нелинейность в петле (джавари/металл), symp — сочувственные струны (тонально следуют за тоникой),
   body — фиксированный корпусный резонатор. Пустой объект = дефолты ворклета → «Струна» байт-в-байт;
   «Ситар» = nl 2.5 + тараб (как было). Чем каждый ОТЛИЧАЕТСЯ — в комментарии справа. */
const KS_BANKS=[
  {},                                                                                             // Струна: эталон (fb .992, damp .5, щипок .15/.8)
  {nl:2.5, symp:{ratios:[1,4/3,3/2,2,9/4], Q:60, gain:.10}},                                       // Ситар: джавари (клип в петле) + тараб (5 полос)
  {fb:.984, damp:.50, exBase:.04, exSpan:.40},                                                     // Уд: тёмный мягкий щипок + короче хвост, без буза — тёплая лютня
  {fb:.994, damp:.44, exBase:.30, exSpan:.55, symp:{ratios:[1,3/2], Q:50, gain:.05}},              // Кото: яркая атака, длиннее хвост, лёгкий сочувственный звон
  {fb:.972, damp:.40, exBase:.55, exSpan:.40, nl:1.2, body:{hz:3400, Q:1.2, db:5}},                // Сантур: ЖЁСТКИЙ яркий удар, быстрый спад, мягкий металлический край (но струна, не FM)
  {fb:.995, damp:.46, exBase:.22, exSpan:.70},                                                     // Гитара: ярко + длинный сустейн — самый «привычный»
  {fb:.965, damp:.50, exBase:.18, exSpan:.60},                                                     // Пиццикато: очень быстрый спад (низкий fb) — короткий глушёный щипок для ритма
];
/* --- KS-банк: обёртка вокруг AudioWorkletNode 'ks-string' в контракт банка {gain,setFreq,cancel,strike}.
   node → [корпусный резонатор body] → ig → preBus: голос идёт через ОБЩУЮ цепочку (drive → огибающая →
   тремоло → delay/reverb), как любой банк. setFreq — a-rate param freq (та же setTargetAtTime 0.02, что у
   всех → глиссандо/бенд/терменвокс без спец-кода). strike — фронт param pluck в момент t (значение=vel).
   opts (из KS_BANKS): nl/fb/damp/exBase/exSpan → в processorOptions ворклета; symp — сочувственные струны
   (высокодобротные полосы, звенящие от выхода струны, тонально следуют за baseF(), ретюн на щипке — как
   droneOn за тоникой); body — фиксированный корпусный резонатор (peaking) в сухом пути.
   ОГРАНИЧЕНИЯ (осознанно): у KS нет oscillator.detune → детюн-вибрато и humDetune его не касаются (hum:0).
   Ситар/тараб — УБЕДИТЕЛЬНЫЙ НАМЁК, не копия (реальные джавари — распределённое касание порожка). --- */
function buildKSBank(preBus, opts){
  opts=opts||{};
  const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
  const po={}; ['nl','fb','damp','exBase','exSpan'].forEach(k=>{ if(opts[k]!=null) po[k]=opts[k]; });   // только заданные — остальное дефолты ворклета
  const node=new AudioWorkletNode(AC,'ks-string',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1],processorOptions:po});
  const freqP=node.parameters.get('freq'), pluckP=node.parameters.get('pluck');
  if(opts.body){ const bd=AC.createBiquadFilter(); bd.type='peaking';   // сухой путь через корпусный резонатор
    bd.frequency.value=opts.body.hz; bd.Q.value=opts.body.Q; bd.gain.value=opts.body.db; node.connect(bd); bd.connect(ig); }
  else node.connect(ig);
  let symp=null;
  if(opts.symp){ const s=opts.symp, sum=AC.createGain(); sum.gain.value=s.gain;   // сочувственные струны — тихий параллельный посыл
    symp=s.ratios.map(r=>{ const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=s.Q;
      bp.frequency.value=baseF()*r; node.connect(bp); bp.connect(sum); return {bp,r}; });
    sum.connect(ig); }
  const retune=()=>{ if(!symp)return; const b=baseF(), t=AC.currentTime;   // следуют за тоникой (как дрон)
    symp.forEach(x=>x.bp.frequency.setTargetAtTime(b*x.r,t,0.05)); };
  banks.push({gain:ig,
    setFreq:(f,t)=>freqP.setTargetAtTime(f,t,0.02),
    cancel:t=>freqP.cancelScheduledValues(t),
    strike:(t,vel)=>{ retune(); const v=Math.max(0.05,Math.min(1,vel==null?0.6:vel));
      pluckP.cancelScheduledValues(t); pluckP.setValueAtTime(v,t); pluckP.setValueAtTime(0,t+0.005); },   // импульс: фронт=щипок, спад — чтобы следующая нота дала новый фронт
    hum:0});
}
/* Запасной субтрактивный щипок для слотов Струна/Ситар, если KS-ворклет не загрузился (держит индексы). */
function buildKSFallback(preBus){
  const ig=AC.createGain(); ig.gain.value=0;
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800; lp.connect(ig); ig.connect(preBus);
  const o=mkOsc('sawtooth',220,lp,0.26);
  banks.push({gain:ig,setFreq:(f,t)=>o.frequency.setTargetAtTime(f,t,0.02),
              cancel:t=>o.frequency.cancelScheduledValues(t), strike:fstrike(lp,1800,3.0,0.1,1.4)});
}
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
function buildFMBank(preBus,{ratio,peak,sus,tau}){
  const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
  let curF=220;                                     // последняя целевая частота: attack() берёт индекс от неё (setFreq идёт ДО noteOn)
  const car=mkOsc('sine',curF,ig,0.5);              // несущий: в общую цепочку + вибрато (vibGain внутри mkOsc)
  const mod=AC.createOscillator(); mod.type='sine'; mod.frequency.value=curF*ratio;   // модулятор: голый, только в car.frequency
  const modGain=AC.createGain(); modGain.gain.value=curF*sus;
  mod.connect(modGain); modGain.connect(car.frequency); mod.start();
  banks.push({gain:ig,
    setFreq:(f,t)=>{ curF=f;                        // несущий, модулятор (f*ratio) и индекс (f*sus) — тем же setTargetAtTime, что и все банки (бенд/глиссандо/терменвокс тянут ВЕСЬ спектр)
      car.frequency.setTargetAtTime(f,t,0.02);
      mod.frequency.setTargetAtTime(f*ratio,t,0.02);
      modGain.gain.setTargetAtTime(f*sus,t,0.02); },
    cancel:t=>{ car.frequency.cancelScheduledValues(t);
      mod.frequency.cancelScheduledValues(t); modGain.gain.cancelScheduledValues(t); },
    strike:(t,vel)=>{ modGain.gain.cancelScheduledValues(t);   // огибающая ИНДЕКСА (не фильтра): пинок вверх, затем спад; vel не используем — у FM нет фильтра
      modGain.gain.setValueAtTime(curF*peak,t);
      modGain.gain.setTargetAtTime(curF*sus,t,tau); }});
}
/* Карта глубины руки → cutoff яркости (Гц). depth 0 близко/ярко → CHORD_LP_MAX (открыт, НЕЙТРАЛЬ =
   сегодняшний звук), 1 далеко/глухо → CHORD_LP_MIN. Логарифмическая (перцептивно ровная). Единый
   источник для атаки (chordOn) и ведения (chordGlide) — раньше жила в удалённом setChordBright. */
const briToHz=bri=>{ const d=Math.max(0,Math.min(1,bri||0)); return CHORD_LP_MAX*Math.pow(CHORD_LP_MIN/CHORD_LP_MAX,d); };
/* --- Пул аккордовых голосов (всегда запущены, гейт по громкости; размер — CHORD_POOL_N) ---
   ДВА фильтра на голос, НЕ один — осознанно, не «избыточность»: f несёт огибающую АТАКИ (fo/ft/fv,
   тембр), пекётся один раз на атаке и пофреймово не трогается; fb несёт НЕПРЕРЫВНУЮ яркость (Z-глубина
   руки, выразительность), ведётся setTargetAtTime всю ноту. Свести их в один узел нельзя: смена яркости
   тогда дралась бы с запланированной рампой атаки (в окне ft), и тембр навсегда сцепился бы с
   выразительностью. БУДУЩЕЙ СЕССИИ: не «упрощать» f и fb в один фильтр. Порядок o1/o2 → f (атака) → fb
   (яркость) → g (гейт громкости) → dest. */
function buildChordPool(dest, n=CHORD_POOL_N){
  for(let i=0;i<n;i++){
    const o1=AC.createOscillator(), o2=AC.createOscillator();
    const g1=AC.createGain(), g2=AC.createGain();
    const f=AC.createBiquadFilter(), fb=AC.createBiquadFilter(), g=AC.createGain();
    o1.type='sawtooth'; o2.type='sawtooth';
    f.type='lowpass'; f.frequency.value=1500;                 // f — огибающая атаки (тембр)
    fb.type='lowpass'; fb.frequency.value=CHORD_LP_MAX;       // fb — непрерывная яркость (выразительность); дефолт открыт → нейтраль
    g1.gain.value=.5; g2.gain.value=.5; g.gain.value=0;
    o1.connect(g1); o2.connect(g2); g1.connect(f); g2.connect(f); f.connect(fb); fb.connect(g); g.connect(dest);
    o1.start(); o2.start();
    cv.push({o1,o2,g1,g2,f,fb,g,owner:null,ins:null,tOn:0,lvl:0});
  }
}
/* when — ЯВНОЕ время планирования (опережение лупера). По умолчанию AC.currentTime → живые вызовы
   БАЙТ-В-БАЙТ. Все внутренние setValueAtTime/setTargetAtTime идут на t=when, поэтому голос стартует
   ровно тогда, когда надо, а не «когда добежал кадр». */
function cvRelease(v,hard,when){ const t=when!=null?when:AC.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setTargetAtTime(0,t,hard?0.02:(v.ins?v.ins.rel:0.3));
  v.owner=null;
}
function cvAlloc(when){ let v=cv.find(v=>!v.owner);
  if(!v){ v=cv.reduce((a,b)=>a.tOn<b.tOn?a:b); const o=v.owner; cvRelease(v,true,when);   // кража: снять голос со старого владельца на ТО ЖЕ время
    if(o&&chordHold[o]){ const a=chordHold[o].filter(x=>x!==v); a.length?chordHold[o]=a:delete chordHold[o]; } }
  return v;
}
/* bri — ПЕР-СОБЫТИЙНАЯ яркость (глубина 0..1, 0=нейтраль), стоит ПЕРЕД when: when обязан оставаться
   ПОСЛЕДНИМ (планировщик-опережение зовёт chordOn(...,when) с явным временем). ИЗОЛЯЦИЯ ПО СЛОЯМ — от
   ключей владельца: живой аккорд = 'latch', слой петли = 'loop:'+layer, у каждого свои голоса пула →
   своё fb. Поэтому живая рука ФИЗИЧЕСКИ не может изменить яркость переигранного слоя (она пишет только
   голоса 'latch'), и наоборот. Ровно это и есть причина ухода с общей шины на пер-голосовой fb. */
function chordOn(owner,freqs,vol,insIdx,bri,when){
  chordOff(owner,when);
  const ins=CHORD_INSTR[insIdx], t=when!=null?when:AC.currentTime, briHz=briToHz(bri);   // bri==null (аранжировка/джем) → briToHz→CHORD_LP_MAX (открыт, нейтраль = сегодняшний звук)
  chordHold[owner]=freqs.map(fr=>{
    const v=cvAlloc(when); v.owner=owner; v.ins=ins; v.tOn=t;
    v.o1.type=ins.t1; v.o2.type=ins.t2;
    const hc=(Math.random()*2-1)*HUM_CENTS*(ins.hj||0);   // гуманизация высоты на голос (свежая, не хранится); одинаковый сдвиг обоих осц → интервал det цел; у органа/падов hj=0
    v.o1.detune.setValueAtTime(-ins.det/2+hc,t); v.o2.detune.setValueAtTime(ins.det+hc,t);
    v.g1.gain.setValueAtTime(ins.m1,t); v.g2.gain.setValueAtTime(ins.m2,t);
    const fo=ins.fo||1, ft=ins.ft||0.02, fv=ins.fv||0;    // огибающая фильтра f + скорость→яркость (пол=lp: тихая нота не глохнет)
    v.f.frequency.cancelScheduledValues(t); v.f.frequency.setValueAtTime(ins.lp*fo,t);
    v.f.frequency.setTargetAtTime(ins.lp*(1+fv*vol),t,ft);
    v.fb.frequency.cancelScheduledValues(t); v.fb.frequency.setValueAtTime(briHz,t);   // яркость на АТАКЕ: голос ещё поднимает громкость с 0 → скачка cutoff не слышно
    v.o1.frequency.setValueAtTime(fr,t); v.o2.frequency.setValueAtTime(fr*ins.ratio,t);
    v.lvl=ins.lvl*(0.25+0.75*vol)*(1-Math.random()*0.05);   // −0..5% уровня — снять машинную ровность
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0,t);
    v.g.gain.setTargetAtTime(v.lvl,t,ins.att*(0.9+Math.random()*0.2));   // ±10% времени атаки
    return v;
  });
}
function chordGlide(owner,freqs,vol,bri,when){    // смена аккорда без переатаки — voice leading; bri ПЕРЕД when (when — последний, для планировщика)
  const vs=chordHold[owner]; if(!vs)return; const t=when!=null?when:AC.currentTime;
  const briHz=bri==null?null:briToHz(bri);       // bri==null (аранжировка/джем: chSet без яркости) → fb НЕ трогаем, остаётся с атаки
  vs.forEach((v,i)=>{ const fr=freqs[i]; if(fr==null)return;
    v.o1.frequency.setTargetAtTime(fr,t,0.035);
    v.o2.frequency.setTargetAtTime(fr*v.ins.ratio,t,0.035);
    if(briHz!=null)v.fb.frequency.setTargetAtTime(briHz,t,0.05);   // яркость ведём setTargetAtTime → без щелчка; f (атака) не трогаем — расцеплены
    const L=v.ins.lvl*(0.25+0.75*vol);
    if(Math.abs(L-v.lvl)>0.003){ v.lvl=L; v.g.gain.setTargetAtTime(L,t,0.05); }
  });
}
function chordOff(owner,when){ const vs=chordHold[owner]; if(!vs)return;
  vs.forEach(v=>cvRelease(v,false,when)); delete chordHold[owner]; }

async function initAudio(){
  AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  /* KS-ворклет грузим В НАЧАЛЕ (по-прежнему внутри клика — правило #1 цело), ДО buildLeadBanks,
     чтобы banks[] строился синхронно и не разъехался с LEAD_INSTR. Провал загрузки — не падаем:
     ставим запасные субтрактивные щипки в слоты Струна/Ситар. Путь — от корня страницы (не ES-import). */
  let ksOk=true;
  try{ await AC.audioWorklet.addModule('src/ks-worklet.js'); }
  catch(e){ ksOk=false; console.warn('KS-ворклет не загрузился — ставлю запасные щипки:',e); }
  /* Мастер: сумма → лимитер (жёсткий компрессор) → выход.
     Лимитер обязателен: аккорды + драйв + подложка легко клиппируют. */
  limiter=AC.createDynamicsCompressor();
  /* Лимитер — АВАРИЙНЫЙ потолок, а не компрессор. Порог/ratio оставлены как защита,
     но время смягчено: attack 2 мс был КОРОЧЕ периода басовой волны (55 Гц = 18 мс) —
     детектор шёл по самим колебаниям и модулировал весь микс на частоте баса.
     10 мс длиннее периода → реагирует на огибающую; release 250 мс превращает
     остаточное подавление в ровное смещение вместо «дыхания»; knee 6 — мягкий вход. */
  limiter.threshold.value=-6; limiter.knee.value=6; limiter.ratio.value=20;
  limiter.attack.value=0.010; limiter.release.value=0.25;
  limiter.connect(AC.destination);
  master=AC.createGain(); master.gain.value=0.8; master.connect(limiter);
 
  /* Общий ревербератор: один конвольвер, у каждого источника свой send.
     Глубиной руки (Z) управляется только send соло-канала. */
  verb=AC.createConvolver(); verb.buffer=makeIR();
  verbOut=AC.createGain(); verbOut.gain.value=0.9;
  verb.connect(verbOut); verbOut.connect(master);
 
  /* --- СОЛО-цепочка (как в версии 2) --- */
  const vibLFO=AC.createOscillator(); vibLFO.frequency.value=5.5;
  vibGain=AC.createGain(); vibGain.gain.value=0;
  vibLFO.connect(vibGain); vibLFO.start();
  /* Гуманизация высоты: один ConstantSource в detune ВСЕХ лид-осцилляторов (как vibGain). На каждой
     атаке ставим свежий случайный сдвиг ±HUM_CENTS·bank.hum; detune не трогается пофреймовой setFreq,
     поэтому сдвиг держится всю ноту. Создаём ДО buildLeadBanks — mkOsc сразу цепляет его в detune. */
  humDetune=AC.createConstantSource(); humDetune.offset.value=0; humDetune.start();

  const preBus=AC.createGain(); preBus.gain.value=1;
  buildLeadBanks(preBus, ksOk);
  banks[leadIdx].gain.gain.value=1;
 
  const shaper=AC.createWaveShaper(); shaper.curve=makeSatCurve(); shaper.oversample='2x';
  satDry=AC.createGain(); satDry.gain.value=1;
  satWet=AC.createGain(); satWet.gain.value=0;
  preBus.connect(satDry); preBus.connect(shaper); shaper.connect(satWet);
  const satSum=AC.createGain(); satDry.connect(satSum); satWet.connect(satSum);
 
  envGain=AC.createGain(); envGain.gain.value=0;
  volGain=AC.createGain(); volGain.gain.value=0.5;
  satSum.connect(envGain); envGain.connect(volGain);
 
  tremGain=AC.createGain(); tremGain.gain.value=1;
  const tremLFO=AC.createOscillator(); tremLFO.frequency.value=4;
  tremDepth=AC.createGain(); tremDepth.gain.value=0;
  tremLFO.connect(tremDepth); tremDepth.connect(tremGain.gain); tremLFO.start();
  volGain.connect(tremGain);
 
  const leadOut=AC.createGain(); leadOut.gain.value=0.22;   // сушит и посылы (dly/rev идут ПОСЛЕ leadOut)
  tremGain.connect(leadOut); leadOut.connect(master);
 
  const dly=AC.createDelay(1); dly.delayTime.value=0.35;
  const fb=AC.createGain(); fb.gain.value=0.45; dly.connect(fb); fb.connect(dly);
  dlyWet=AC.createGain(); dlyWet.gain.value=0;
  leadOut.connect(dly); dly.connect(dlyWet); dlyWet.connect(master);
 
  revLead=AC.createGain(); revLead.gain.value=0;
  leadOut.connect(revLead); revLead.connect(verb);
 
  /* --- АККОРДЫ: чистая шина + фиксированный маленький send в реверб ---
     Z-ЯРКОСТЬ живёт ПЕР-ГОЛОСОВО (фильтр fb каждого голоса, см. buildChordPool), а НЕ на этой шине:
     общий фильтр не смог бы дать разным слоям петли РАЗНУЮ яркость. Поэтому шина снова простая. */
  chordBus=AC.createGain(); chordBus.gain.value=0.28; chordBus.connect(master);
  revCh=AC.createGain(); revCh.gain.value=0.12; chordBus.connect(revCh); revCh.connect(verb);
  buildChordPool(chordBus);
 
  /* --- БАС: пул моно-голосов (слой + живой), общая шина в master --- */
  bassBus=AC.createGain(); bassBus.gain.value=0.28; bassBus.connect(master);
  buildBassPool(bassBus);

  /* --- УДАРНЫЕ: своя шина в master (мимо эффектов соло) --- */
  drumBus=AC.createGain(); drumBus.gain.value=0.20; drumBus.connect(master);

  /* --- ДРОН: расстроенная пара пил через медленный НЧ-фильтр, на тонике (шина в master) --- */
  backBus=AC.createGain(); backBus.gain.value=0.28; backBus.connect(master);
  dO1=AC.createOscillator(); dO1.type='sawtooth'; dO1.frequency.value=tonicFreq()/2;         // tonicFreq: у fixedKey — ФИКСИРОВАННАЯ высота ключа (не бьётся с сеткой); у прочих = baseF()
  dO2=AC.createOscillator(); dO2.type='sawtooth'; dO2.frequency.value=tonicFreq()/2*1.498;   // квинту 1.498 пока оставляем ~чистой (не грид-квинта строя) — помечено в BACKLOG
  const dLP=AC.createBiquadFilter(); dLP.type='lowpass'; dLP.frequency.value=520;
  const dLFO=AC.createOscillator(); dLFO.frequency.value=0.06;
  const dLFOg=AC.createGain(); dLFOg.gain.value=260;
  dLFO.connect(dLFOg); dLFOg.connect(dLP.frequency); dLFO.start();
  dG=AC.createGain(); dG.gain.value=0;
  dO1.connect(dLP); dO2.connect(dLP); dLP.connect(dG); dG.connect(backBus);
  dO1.start(); dO2.start();
 
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
}
function setLeadInstr(i){
  setLeadIdx(((i%LEAD_INSTR.length)+LEAD_INSTR.length)%LEAD_INSTR.length);
  if(!AC)return;
  const t=AC.currentTime;
  banks.forEach((b,j)=>b.gain.gain.setTargetAtTime(j===leadIdx?1:0,t,0.02));
  hooks.leadInstr && hooks.leadInstr(leadIdx);
}
function applyParams(p){
  const t=AC.currentTime;
  if(p.freq!=null)banks.forEach(b=>b.setFreq(p.freq,t));   // freq НЕ трогаем, если не задан (leadSet с hold: обновляем громкость/эффекты, а идущий бенд не сбиваем)
  volGain.gain.setTargetAtTime(p.vol,t,0.04);
  lastVel=p.vol;                                          // запоминаем громкость X → скорость→яркость на следующей атаке
  vibGain.gain.setTargetAtTime(p.vib*35,t,0.05);
  satWet.gain.setTargetAtTime(p.drv,t,0.05);
  satDry.gain.setTargetAtTime(1-p.drv*0.7,t,0.05);
  tremDepth.gain.setTargetAtTime(p.trm*0.45,t,0.05);
  tremGain.gain.setTargetAtTime(1-p.trm*0.45,t,0.05);
  dlyWet.gain.setTargetAtTime(p.dly*0.55,t,0.08);
  revLead.gain.setTargetAtTime(p.rev*0.85,t,0.08);
}
/* Глиссандо-в-луп (переигровка терменвокса): расписываем ЗАПИСАННУЮ кривую бенда на будущие
   AC-времена через ТУ ЖЕ setFreq (setTargetAtTime 0.02) — тот же 20мс-глайд, что и живьём.
   baseFreq — частота ступени по ЗАМОРОЖЕННОМУ ладу (полимодальность), c — центы поверх неё;
   абсолютных Гц не храним. dt в долях → секунды через secPerBeat. */
function scheduleBend(points, baseFreq, secPerBeat){
  const t0=AC.currentTime;
  for(const pt of points){
    const f=baseFreq*Math.pow(2,pt.c/1200), at=t0+pt.dt*secPerBeat;
    banks.forEach(b=>b.setFreq(f,at));
  }
}
/* Снять расписанные рампы частоты (на атаке переигранной ноты, ctx): чтобы бенд предыдущей
   ноты не перетёк в следующую. Живой путь (без ctx) не зовёт — живой звук не трогаем. */
function leadCancel(){ const t=AC.currentTime; banks.forEach(b=>b.cancel&&b.cancel(t)); }
function noteOn(){
  if(noteOnFlag)return; noteOnFlag=true;
  const t=AC.currentTime, b=banks[leadIdx];
  /* Гуманизация — СВЕЖАЯ случайность на каждую атаку (в т.ч. при переигровке лупа: генерится здесь,
     в событии НЕ хранится). Высоту дёргаем на bank.hum (у органа/падов 0 — не маскируем биения строёв),
     уровень и время атаки — всем чуть-чуть (на биения не влияет). */
  const hum = b.hum==null?1:b.hum;
  humDetune.offset.setTargetAtTime((Math.random()*2-1)*HUM_CENTS*hum, t, 0.006);
  const lvlJ = 1 - Math.random()*0.05;                          // −0..5% уровня
  const attJ = LEAD_INSTR[leadIdx].att*(0.9+Math.random()*0.2);   // ±10% времени атаки
  envGain.gain.cancelScheduledValues(t);
  envGain.gain.setTargetAtTime(lvlJ,t,attJ);
  b.strike && b.strike(t, lastVel);   // FM: огибающая индекса; банки с фильтром: огибающая фильтра + скорость→яркость (от последней громкости X)
}
function noteOff(){
  if(!noteOnFlag)return; noteOnFlag=false;
  const t=AC.currentTime;
  envGain.gain.cancelScheduledValues(t);
  envGain.gain.setTargetAtTime(0,t,LEAD_INSTR[leadIdx].rel);
}
/* --- БАС: пул моно-голосов (один на слой). Тембр печётся НА АТАКЕ по слою (как аккорд),
   а не глобально — записанный слой сохраняет свой инструмент (§3.4, как строй/септаккорд). --- */
function buildBassPool(dest){
  for(let i=0;i<BASS_POOL_N;i++){
    const o1=AC.createOscillator(), o2=AC.createOscillator();
    const g1=AC.createGain(), g2=AC.createGain();
    const lp=AC.createBiquadFilter(), env=AC.createGain(), vol=AC.createGain();
    o1.type='sawtooth'; o2.type='sawtooth'; lp.type='lowpass'; lp.frequency.value=500;
    /* Осцилляторы приглушены ДО фильтра (как m1/m2 у аккордов): иначе два осциллятора
       в фазе дают пик 2.0 — в 12 раз громче аккордового голоса, и бас в одиночку
       вгонял лимитер в 12 дБ подавления, «прижимая» аккорды на всю длину ноты. */
    g1.gain.value=.5; g2.gain.value=.5;
    env.gain.value=0; vol.gain.value=0.5;
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(env); env.connect(vol); vol.connect(dest);
    o1.start(); o2.start();
    bv.push({o1,o2,g1,g2,lp,env,vol,owner:null,ins:null,tOn:0,on:false});
  }
}
function bvRelease(v,hard,when){ const t=when!=null?when:AC.currentTime;
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(0,t,hard?0.02:(v.ins?v.ins.rel:0.2));
  v.owner=null; v.on=false;
}
function bvAlloc(when){ let v=bv.find(v=>!v.owner);
  if(!v){ v=bv.reduce((a,b)=>a.tOn<b.tOn?a:b); const o=v.owner; bvRelease(v,true,when);   // кража: снять голос со старого владельца
    if(o&&bassHold[o]===v)delete bassHold[o]; }
  return v;
}
/* setBassInstr — ТОЛЬКО живой селектор: глобальный bassIdx + дропдаун. Пул не трогаем;
   живой бас возьмёт новый тембр на следующей атаке (как аккорды), слои — сохранят свой. */
function setBassInstr(i){
  setBassIdx(((i%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length);
  hooks.bassInstr && hooks.bassInstr(bassIdx);
}
function bassOn(owner,freq,vol,ins,when){
  if(!AC)return; const t=when!=null?when:AC.currentTime;
  let v=bassHold[owner]; if(!v){ v=bvAlloc(when); v.owner=owner; bassHold[owner]=v; }
  if(!v.on){                                   // атака: печём тембр слоя, гейт вверх (идемпотентно при удержании)
    v.ins=BASS_INSTR[(((ins??bassIdx)%BASS_INSTR.length)+BASS_INSTR.length)%BASS_INSTR.length];
    v.o1.type=v.ins.t1; v.o2.type=v.ins.t2; v.o2.detune.setValueAtTime(v.ins.det,t);
    const fo=v.ins.fo||1, ft=v.ins.ft||0.03, fv=v.ins.fv||0;   // огибающая фильтра + скорость→яркость на АТАКЕ (не в пофреймовом пути → не сбивается); высоту баса НЕ дёргаем (низ = гулкие биения)
    v.lp.frequency.cancelScheduledValues(t); v.lp.frequency.setValueAtTime(v.ins.lp*fo,t);
    v.lp.frequency.setTargetAtTime(v.ins.lp*(1+fv*vol),t,ft);
    v.on=true; v.env.gain.cancelScheduledValues(t); v.env.gain.setTargetAtTime(1,t,v.ins.att*(0.9+Math.random()*0.2));   // ±10% времени атаки
  }
  v.tOn=t;
  v.o1.frequency.setTargetAtTime(freq,t,0.012); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,0.012);
  v.vol.gain.setTargetAtTime(v.ins.lvl*(0.3+0.7*vol),t,0.03);   // lvl — как у аккордов, чтобы бас не жёг лимитер
}
function bassSet(owner,freq,vol,when){
  if(!AC)return; const v=bassHold[owner]; if(!v||!v.ins)return; const t=when!=null?when:AC.currentTime;
  v.o1.frequency.setTargetAtTime(freq,t,0.03); v.o2.frequency.setTargetAtTime(freq*v.ins.ratio,t,0.03);
  v.vol.gain.setTargetAtTime(v.ins.lvl*(0.3+0.7*vol),t,0.05);   // тот же lvl, иначе глиссандо вернуло бы уровень
}
function bassOff(owner,when){ const v=bassHold[owner]; if(!v||!AC)return; bvRelease(v,false,when); delete bassHold[owner]; }

/* --- ДРОН: гейт dG, частота следует за тоникой (tonicFreq/2) в любом ладу (спасён из backing.js).
   tonicFreq — единый источник: у fixedKey это высота КЛЮЧА в приколоченной сетке (иначе дрон бился
   бы с ней), у прочих строёв = baseF() (байт-в-байт). Квинту 1.498 держим ~чистой — см. BACKLOG. */
function droneOn(level=0.18){ if(!AC)return; const t=AC.currentTime;
  dG.gain.setTargetAtTime(level,t,1.2);
  dO1.frequency.setTargetAtTime(tonicFreq()/2,t,0.3);
  dO2.frequency.setTargetAtTime(tonicFreq()/2*1.498,t,0.3);
}
function droneOff(){ if(!AC)return; dG.gain.setTargetAtTime(0,AC.currentTime,0.6); }
/* Живой селектор набора ударных: только глобальный индекс + дропдаун (удар транзиентный,
   тембр берётся на КАЖДЫЙ удар из a.kit — заморожен в событии, как бас/аккорд). */
function setDrumKit(i){
  setDrumKitIdx(((i%DRUM_KITS.length)+DRUM_KITS.length)%DRUM_KITS.length);
  hooks.drumKit && hooks.drumKit(drumKitIdx);
}

/* --- УДАРНЫЕ: однократный синтез по индексу ряда (0=низ сетки), набор — kit --- */
function dNoise(t,dur){ const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.start(t); s.stop(t+dur); return s; }
/* Дарбука-голоса (спасены из backing.js): Дум — низкий бум, Тек — звонкий щелчок. */
function dDum(t,v,f0=130,f1=52,d=0.18){ const o=AC.createOscillator(),g=AC.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.08);
  g.gain.setValueAtTime(0.9*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+d+0.05); }
function dTek(t,v,hp=4500,f=950){ const s=dNoise(t,0.05),bf=AC.createBiquadFilter(),g=AC.createGain();
  bf.type='highpass'; bf.frequency.value=hp; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  s.connect(bf); bf.connect(g); g.connect(drumBus);
  const o=AC.createOscillator(),og=AC.createGain(); o.type='sine'; o.frequency.value=f;
  og.gain.setValueAtTime(0.12*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  o.connect(og); og.connect(drumBus); o.start(t); o.stop(t+0.05); }
function darbukaHit(i,v,t){                       // 6 рядов → дарбука-голоса
  if(i===0)dDum(t,v);                             // Дум (низ)
  else if(i===1)dTek(t,v);                        // Тек
  else if(i===2)dTek(t,v*1.1,6000,1300);          // Так (ярче)
  else if(i===3)dTek(t,v*0.7,5200,1100);          // Ка (тише, короче)
  else if(i===4)dDum(t,v,180,80,0.14);            // Дум высокий
  else{ const s=dNoise(t,0.5),f=AC.createBiquadFilter(),g=AC.createGain();   // открытый край
    f.type='highpass'; f.frequency.value=5000; g.gain.setValueAtTime(0.28*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
    s.connect(f); f.connect(g); g.connect(drumBus); }
}
/* --- ТАБЛА (индийская). Подпись: баян (басовая мембрана) с сильным НИСХОДЯЩИМ бендом высоты —
   именно он делает возможным аккомпанемент для раг. Даян (высокий) — ясная высота с лёгким
   металлическим призвуком (пара ингармонических обертонов). --- */
function tabBaya(t,v,f0=185,f1=70,d=0.35){ const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.14);   // бенд вниз — подпись
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+d+0.05); }
function tabNa(t,v,f=520,d=0.22){ const g=AC.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); g.connect(drumBus);
  [[1,.6],[2.4,.22],[3.8,.12]].forEach(([r,a])=>{ const o=AC.createOscillator(); o.type='sine'; o.frequency.value=f*r;   // тоновый + ингармонический призвук
    const og=AC.createGain(); og.gain.value=a; o.connect(og); og.connect(g); o.start(t); o.stop(t+d+0.02); }); }
function tabTick(t,v){ const s=dNoise(t,0.04),f=AC.createBiquadFilter(),g=AC.createGain();   // сухой высокий тычок (тете)
  f.type='bandpass'; f.frequency.value=3200; f.Q.value=2; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  s.connect(f); f.connect(g); g.connect(drumBus); }
function tablaHit(i,v,t){                          // 6 рядов → голоса таблы (low/accent/high как у всех китов)
  if(i===0)tabBaya(t,v);                           // Ге/дха — баян с бендом (низ)
  else if(i===1)tabNa(t,v,520);                    // На — звонкий даян (акцент)
  else if(i===2)tabNa(t,v*0.9,660,0.18);           // Тин — выше, короче
  else if(i===3)tabTick(t,v);                      // Тете — сухой тычок (высокий)
  else if(i===4)tabBaya(t,v*0.9,150,80,0.22);      // Дхин — средний
  else tabNa(t,v,440,0.4);                          // Тун — длинный открытый звон
}
/* --- ГАМЕЛАН (яванский). Инструмент — инлайн-FM: несущий+модулятор с НЕЦЕЛЫМ отношением → ИНГАРМОНИЧЕСКИЙ
   бронзовый спектр (обычный шум/пилы так не умеют). Индекс модуляции спадает быстрее амплитуды — «удар»
   ярче хвоста. ЧЕСТНО: настоящий гамелан — литая бронза, у каждой пластины своя уникальная ингармоничность
   и «биение» пар; это ПРИБЛИЖЕНИЕ характера, не копия. --- */
function gmlFM(t,v,f,ratio,idx,d){ const car=AC.createOscillator(),cg=AC.createGain();
  car.type='sine'; car.frequency.value=f;
  const mod=AC.createOscillator(),mg=AC.createGain(); mod.type='sine'; mod.frequency.value=f*ratio;
  mg.gain.setValueAtTime(f*idx,t); mg.gain.exponentialRampToValueAtTime(f*idx*0.1+0.001,t+d*0.4);   // огибающая индекса → металлический «пинг»
  mod.connect(mg); mg.connect(car.frequency);
  cg.gain.setValueAtTime(v,t); cg.gain.exponentialRampToValueAtTime(0.001,t+d);
  car.connect(cg); cg.connect(drumBus); car.start(t); mod.start(t); car.stop(t+d+0.05); mod.stop(t+d+0.05); }
function gamelanHit(i,v,t){
  if(i===0)gmlFM(t,v,82,1.47,6,1.8);               // гонг агенг — глубокий, ДЛИННЫЙ, ингармонический (низ)
  else if(i===1)gmlFM(t,v*0.9,300,2.76,4,0.7);     // кенонг — средний металлический (акцент)
  else if(i===2)gmlFM(t,v*0.85,230,2.4,4,0.6);     // кемпул — чуть иной средний
  else if(i===3)gmlFM(t,v*0.7,900,3.5,3,0.25);     // высокая пластина (сарон) — короткий звон (высокий)
  else if(i===4)gmlFM(t,v*0.85,400,2.1,3,0.5);     // кенонг выше — средний
  else gmlFM(t,v*0.7,1300,3.5,2,0.4);               // высокий мерцающий
}
/* --- ТАЙКО (японский). Большой мембранный барабан: низкий тон с падением высоты + шумовое тело кожи;
   деревянный щелчок по ободу (ка). --- */
function taikoDrum(t,v,f0=95,f1=55,d=0.42){ const o=AC.createOscillator(),g=AC.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.10);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+d+0.05);
  const s=dNoise(t,0.06),nf=AC.createBiquadFilter(),ng=AC.createGain();   // тело кожи
  nf.type='lowpass'; nf.frequency.value=1200; ng.gain.setValueAtTime(0.25*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.08);
  s.connect(nf); nf.connect(ng); ng.connect(drumBus); }
function taikoKa(t,v){ const o=AC.createOscillator(),g=AC.createGain();   // ка — сухой деревянный щелчок обода
  o.type='square'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(600,t+0.02);
  g.gain.setValueAtTime(0.4*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
  o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+0.06);
  const s=dNoise(t,0.03),f=AC.createBiquadFilter(),ng=AC.createGain();
  f.type='highpass'; f.frequency.value=4000; ng.gain.setValueAtTime(0.25*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.025);
  s.connect(f); f.connect(ng); ng.connect(drumBus); }
function taikoHit(i,v,t){
  if(i===0)taikoDrum(t,v);                          // о-дайко — большой глубокий (низ)
  else if(i===1)taikoDrum(t,v*0.9,150,85,0.28);     // средний удар (акцент)
  else if(i===2)taikoDrum(t,v*0.85,190,110,0.22);   // выше
  else if(i===3)taikoKa(t,v);                       // ка — деревянный щелчок обода (высокий)
  else if(i===4)taikoDrum(t,v*0.85,120,70,0.3);     // средний
  else taikoKa(t,v*1.1);                             // яркий обод
}
function drumHit(i,vol=1,kit=0,when){
  if(!AC)return; const t=when!=null?when:AC.currentTime, v=0.3+0.7*vol;   // when — опережение лупера; удар — одноразовый источник, стартует в t (все под-голоса уже берут t)
  if(kit===1) return darbukaHit(i,v,t);
  if(kit===2) return tablaHit(i,v,t);
  if(kit===3) return gamelanHit(i,v,t);
  if(kit===4) return taikoHit(i,v,t);
  if(i===0){ const o=AC.createOscillator(),g=AC.createGain();     // Кик
    o.frequency.setValueAtTime(165,t); o.frequency.exponentialRampToValueAtTime(48,t+0.09);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+0.28); }
  else if(i===1){ const s=dNoise(t,0.2),f=AC.createBiquadFilter(),g=AC.createGain();  // Снейр
    f.type='highpass'; f.frequency.value=1400; g.gain.setValueAtTime(0.5*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.17);
    s.connect(f); f.connect(g); g.connect(drumBus);
    const o=AC.createOscillator(),og=AC.createGain(); o.type='triangle'; o.frequency.value=185;
    og.gain.setValueAtTime(0.3*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    o.connect(og); og.connect(drumBus); o.start(t); o.stop(t+0.11); }
  else if(i===2){ const s=dNoise(t,0.14),f=AC.createBiquadFilter(),g=AC.createGain();  // Клэп
    f.type='bandpass'; f.frequency.value=1600; f.Q.value=1.2;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.55*v,t+0.004); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    s.connect(f); f.connect(g); g.connect(drumBus); }
  else if(i===3){ const s=dNoise(t,0.06),f=AC.createBiquadFilter(),g=AC.createGain();  // Хэт закр.
    f.type='highpass'; f.frequency.value=8200; g.gain.setValueAtTime(0.32*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    s.connect(f); f.connect(g); g.connect(drumBus); }
  else if(i===4){ const o=AC.createOscillator(),g=AC.createGain();  // Том
    o.frequency.setValueAtTime(230,t); o.frequency.exponentialRampToValueAtTime(92,t+0.18);
    g.gain.setValueAtTime(0.6*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
    o.connect(g); g.connect(drumBus); o.start(t); o.stop(t+0.3); }
  else{ const s=dNoise(t,0.7),f=AC.createBiquadFilter(),g=AC.createGain();  // Крэш
    f.type='highpass'; f.frequency.value=6000; g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
    s.connect(f); f.connect(g); g.connect(drumBus); }
}

/* Метроном лупера: короткий щелчок точно по часам AC (отсчёт и сетка овердаба).
   Идёт прямо в master, мимо громкости фона — слышен даже при выключенной подложке.
   level: 2 — сильная доля (сам/начало такта), 1 — голова группы (тали), 0 — обычная доля,
   -1 — khali: ОСЛАБЛЕННАЯ голова группы (тинтал, 3-й вибхаг пустой). Уровни 2 и 0 дают
   ТЕ ЖЕ частоты/громкость, что прежние accent true/false → на 4/4 метроном не изменился. */
function metroClick(t,level){
  if(!AC)return;
  const o=AC.createOscillator(), g=AC.createGain();
  const f0 = level>=2?2000 : level===1?1750 : level<0?1100 : 1400;   // 2 и 0 — как было (accent true/false)
  const f1 = level>=2?1500 : level===1?1300 : level<0?860  : 1050;
  const gp = level>=2?0.85 : level===1?0.66 : level<0?0.30 : 0.5;    // khali ТИШЕ обычной доли — «пустая» голова
  o.type='triangle'; o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(f1,t+0.03);   // короткий «щёлк» вниз — читается как деревяшка
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gp,t+0.002);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.09);
}

/* Параллельный ОТВОД звука для записи клипа. НОВЫЙ MediaStreamAudioDestinationNode, к нему цепляем
   ВЫХОД лимитера — то, что реально слышно (post-limiter). Живой путь limiter→AC.destination НЕ
   трогаем: это ДОПОЛНИТЕЛЬНОЕ ребро графа, звук в колонках не меняется (правило: живой аудио-путь
   неизменен). Возвращаем stream (аудиодорожка для MediaRecorder) и dispose — снять ребро по
   остановке, чтобы граф не копил мёртвые узлы. Вызывается только из записи клипа, после initAudio. */
function createRecordingTap(){
  if(!AC) return null;
  const dest=AC.createMediaStreamDestination();
  limiter.connect(dest);
  return { stream:dest.stream, dispose:()=>{ try{ limiter.disconnect(dest); }catch(e){} } };
}

/* Экспорт: `let` через export-клаузу — живые связки (AC виден после initAudio). */
export {
  initAudio, AC, setLeadInstr, applyParams, scheduleBend, leadCancel, noteOn, noteOff, metroClick,
  chordOn, chordGlide, chordOff, chordHold,
  setBassInstr, bassOn, bassSet, bassOff, bassHold, drumHit, setDrumKit, droneOn, droneOff,
  LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_NAMES, DRUM_ROWS, DRUM_KITS, createRecordingTap,
};
