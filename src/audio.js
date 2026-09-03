import { leadIdx, setLeadIdx, bassIdx, setBassIdx, drumKitIdx, setDrumKitIdx } from './state.js';
import { baseF, tonicFreq } from './scales.js';
import { hooks } from './hooks.js';
import { CHORD_POOL_N, BASS_POOL_N, LEAD_POOL_N, LEAD_POOL_KS } from './config.js';
 
/* ================= МУЗЫКАЛЬНЫЕ КОНСТАНТЫ ================= */
 
const LEAD_INSTR=[
  {label:'SuperSaw', att:0.012, rel:0.10},
  {label:{en:'Organ', ru:'Орган'},    att:0.008, rel:0.07},
  {label:{en:'Pad', ru:'Пад'},      att:0.120, rel:0.35},
  {label:{en:'Bell', ru:'Колокол'},  att:0.004, rel:0.30},
  {label:{en:'Flute', ru:'Флейта'},   att:0.050, rel:0.18},
  {label:{en:'8-bit', ru:'8-бит'},    att:0.002, rel:0.05},
  /* FM-тембры (несущий+модулятор, огибающая индекса) — inгармонические спектры, недостижимые
     субтрактивным путём. rel длиннее tau индекса → «удар» ярче хвоста (см. buildFMBank). */
  {label:{en:'Bell (deep)', ru:'Колокол (глубокий)'}, att:0.004, rel:1.6},
  {label:{en:'Metallophone', ru:'Металлофон'},         att:0.002, rel:0.45},
  /* Четыре новых семейства (индексы 8..15, тот же порядок, что банки в buildLeadBanks). Существующие
     8 записей выше не тронуты (байт-в-байт), новые сгруппированы по семействам ради читаемого списка.
     ПАДЫ — att медленный, rel ДЛИННЫЙ (~2.5с): звук должен тянуться, чтобы биения интервалов успели
     развиться (главное этого захода — слышимость строёв). ЩИПКОВЫЕ — быстрая атака, короткий rel.
     ДУХОВЫЕ — мягкая атака, умеренный rel. ОРГАНЫ — быстрые атака/релиз, плоско. */
  {label:{en:'Warm pad', ru:'Пад тёплый'},      att:0.35,  rel:2.5},   // ПАДЫ
  {label:{en:'Glass pad', ru:'Пад стеклянный'},  att:0.30,  rel:2.5},
  {label:{default:'Oud', ru:'Уд'},              att:0.004, rel:0.35},  // ЩИПКОВЫЕ
  {label:{en:'Plucked string', ru:'Струна щипком'},   att:0.003, rel:0.22},
  {label:{en:'Airy flute', ru:'Флейта воздушная'},att:0.06,  rel:0.20},  // ДУХОВЫЕ
  {label:{en:'Reed', ru:'Тростевой'},       att:0.04,  rel:0.16},
  {label:{en:'Organ (full)', ru:'Орган полный'},    att:0.006, rel:0.06},  // ОРГАННЫЕ
  {label:{en:'Organ (soft)', ru:'Орган мягкий'},    att:0.02,  rel:0.10},
  /* Карплюс–Стронг (физ. модель щипковой струны) — третий способ построения голоса (ворклет,
     см. ks-worklet.js и buildKSBank). Быстрая атака, естественный хвост даёт сама петля. */
  {label:{en:'String', ru:'Струна'},    att:0.002, rel:0.4},
  {label:{default:'Sitar', ru:'Ситар'},     att:0.002, rel:0.6},
  {label:{en:'Oud (string)', ru:'Уд (струна)'}, att:0.002, rel:0.3},  // KS-щипковые: параметрические вариации одной струны (см. KS_BANKS). «(струна)» — чтобы не дублировать субтрактивный «Уд» (индекс 10)
  {label:{default:'Koto', ru:'Кото'},      att:0.002, rel:0.5},
  {label:{default:'Santur', ru:'Сантур'},    att:0.001, rel:0.25},
  {label:{en:'Guitar', ru:'Гитара'},    att:0.002, rel:0.5},
  {label:{en:'Pizzicato', ru:'Пиццикато'}, att:0.001, rel:0.15},
];
/* Аккордовые тембры: 2 осциллятора (типы t1/t2, отношение частот ratio, расстройка det в центах,
   микс m1/m2), общий НЧ-фильтр lp, огибающая att/rel. Плюс улучшения качества (per-bank):
   fo — во сколько раз фильтр открыт в атаке (огибающая фильтра), ft — время оседания, fv — скорость→
   яркость (cutoff = lp·(1+fv·vol), пол=lp), hj — гуманизация высоты (0 у органа/падов для строёв). */
const CHORD_INSTR=[
  {label:{en:'Warm pad', ru:'Тёплый пад'},     t1:'sawtooth', t2:'sawtooth', ratio:1, det:9, m1:.50, m2:.50, lp:1500, lvl:.17, att:.22,  rel:.50, fo:1.4, ft:.30, fv:.6, hj:0},
  {label:{en:'Glass pad', ru:'Стеклянный пад'}, t1:'triangle', t2:'sine',     ratio:2, det:5, m1:.55, m2:.30, lp:3400, lvl:.21, att:.14,  rel:.60, fo:1.4, ft:.28, fv:.6, hj:0},
  {label:{en:'Organ', ru:'Орган'},          t1:'square',   t2:'sine',     ratio:2, det:0, m1:.45, m2:.35, lp:4200, lvl:.15, att:.012, rel:.09, fo:1.0, ft:.02, fv:.2, hj:0},
  {label:{en:'E. piano', ru:'Эл. пиано'},      t1:'sine',     t2:'sine',     ratio:3, det:0, m1:.60, m2:.16, lp:5200, lvl:.22, att:.004, rel:.45, fo:2.2, ft:.12, fv:1.0,hj:1},
  /* Аккордовые эквиваленты новых семейств. Пул строит голос иначе (o1/o2 → фильтр, тембр печётся на
     атаке), поэтому характер адаптирован под ЭТУ форму, а не скопирован из лид-банков. Существующие 4
     записи выше не тронуты (байт-в-байт). Аккордовый голос ДЕРЖИТ уровень, пока зажат → «сустейн» уже
     есть; для строёв важнее ДЛИННЫЙ rel (хвост, где слышны биения) и СТАБИЛЬНЫЙ тон (органы: det=0,
     сами не бьются). Имена с «(долгий)»: существующие «Тёплый/Стеклянный пад» короче — новые тянутся. */
  {label:{en:'Warm pad (long)', ru:'Пад тёплый (долгий)'},     t1:'sawtooth', t2:'sawtooth', ratio:1, det:10, m1:.50, m2:.50, lp:1300, lvl:.16, att:.35,  rel:1.8, fo:1.4, ft:.35, fv:.6, hj:0},  // ПАДЫ (hj=0 — чистая высота для строёв)
  {label:{en:'Glass pad (long)', ru:'Пад стеклянный (долгий)'}, t1:'triangle', t2:'sine',     ratio:2, det:6,  m1:.52, m2:.30, lp:3000, lvl:.18, att:.30,  rel:1.8, fo:1.4, ft:.30, fv:.6, hj:0},
  {label:{default:'Oud', ru:'Уд'},                      t1:'sawtooth', t2:'triangle', ratio:1, det:4,  m1:.50, m2:.34, lp:1200, lvl:.20, att:.004, rel:.30, fo:3.0, ft:.12, fv:1.4,hj:1},  // ЩИПКОВЫЕ (яркое открытие фильтра)
  {label:{en:'Plucked string', ru:'Струна щипком'},           t1:'sawtooth', t2:'sawtooth', ratio:1, det:2,  m1:.46, m2:.30, lp:2600, lvl:.18, att:.003, rel:.22, fo:3.2, ft:.09, fv:1.4,hj:1},
  {label:{en:'Flute', ru:'Флейта'},                  t1:'sine',     t2:'sine',     ratio:2, det:0,  m1:.60, m2:.18, lp:2600, lvl:.20, att:.06,  rel:.20, fo:1.3, ft:.08, fv:.5, hj:1},  // ДУХОВЫЕ
  {label:{en:'Reed', ru:'Тростевой'},               t1:'square',   t2:'sawtooth', ratio:1, det:5,  m1:.34, m2:.26, lp:2200, lvl:.15, att:.05,  rel:.18, fo:2.0, ft:.14, fv:1.0,hj:1},
  {label:{en:'Organ (full)', ru:'Орган полный'},            t1:'square',   t2:'sine',     ratio:3, det:0,  m1:.42, m2:.30, lp:4800, lvl:.15, att:.008, rel:.10, fo:1.0, ft:.02, fv:.2, hj:0},  // ОРГАННЫЕ (det=0, hj=0 — лучший для строёв)
  {label:{en:'Organ (soft)', ru:'Орган мягкий'},            t1:'sine',     t2:'sine',     ratio:2, det:0,  m1:.58, m2:.24, lp:3000, lvl:.17, att:.02,  rel:.12, fo:1.0, ft:.02, fv:.2, hj:0},
  /* Расширение (индексы 12..15). НЕ дублируем уже имеющееся: «Орган» (idx 2, det=0) — уже чистый
     эталон для строёв; тёплые/длинные пады и щипковые (Уд/Струна щипком) тоже есть. Добавляем ровно
     то, чего НЕ было: ПИТЧ-ЧИСТЫЕ пады (существующие все с расстройкой det 5..10 — тембр сам бьётся;
     здесь det=0, характер из РАЗНЫХ волн, а не из расстройки → биения = ТОЛЬКО строй), смычковые и
     яркий щипок. hj=0 у падов/струнных (для строёв), hj=1 только у щипковых (не инструмент для строёв). */
  {label:{en:'Warm pad (clean)', ru:'Пад тёплый (чистый)'},     t1:'sawtooth', t2:'triangle', ratio:1, det:0,  m1:.48, m2:.34, lp:1400, lvl:.16, att:.30,  rel:2.0, fo:1.4, ft:.35, fv:.6, hj:0},  // ЧИСТЫЕ ПАДЫ (det=0 — биения только от строя)
  {label:{en:'Glass pad (clean)', ru:'Пад стеклянный (чистый)'}, t1:'triangle', t2:'sine',     ratio:2, det:0,  m1:.52, m2:.28, lp:3000, lvl:.18, att:.28,  rel:2.0, fo:1.4, ft:.30, fv:.6, hj:0},  // ratio 2 = чистая октава (без биений)
  {label:{en:'Strings', ru:'Струнные'},                t1:'sawtooth', t2:'sawtooth', ratio:1, det:6,  m1:.46, m2:.40, lp:2200, lvl:.17, att:.18,  rel:.80, fo:1.6, ft:.30, fv:.8, hj:0},  // СМЫЧКОВЫЕ: мягкая атака + медленное открытие фильтра (наплыв), лёгкая ширина ансамбля
  {label:{en:'Plucked', ru:'Щипковые'},                t1:'sawtooth', t2:'square',   ratio:1, det:3,  m1:.44, m2:.28, lp:2800, lvl:.19, att:.003, rel:.20, fo:3.5, ft:.08, fv:1.5, hj:1},  // ЯРКИЙ ЩИПОК: быстрая атака, резкое открытие/закрытие фильтра — для макамов/пентатоник, где пад неуместен
];
/* Бас-тембры (моно-голос, низкий регистр): 2 осц (t1/t2, отношение ratio, расстройка det),
   НЧ-фильтр lp, огибающая att/rel. Плюс огибающая фильтра на атаке: fo — открытие, ft — время,
   fv — скорость→яркость (cutoff = lp·(1+fv·vol), пол=lp). Высоту баса НЕ гуманизируем (низкие
   биения гулкие); синус (Саб) на фильтр почти не реагирует — fo мал. */
const BASS_INSTR=[
  {label:{en:'Sub sine', ru:'Саб-синус'}, t1:'sine',     t2:'sine',     det:0,  ratio:1,   lp:420,  lvl:.45, att:.020, rel:.20, fo:1.0, ft:.03, fv:.2},
  {label:{en:'Saw', ru:'Пила'},      t1:'sawtooth', t2:'sawtooth', det:9,  ratio:1,   lp:850,  lvl:.38, att:.014, rel:.16, fo:2.5, ft:.10, fv:1.2},
  {label:{en:'Acid', ru:'Кислотный'}, t1:'square',   t2:'sawtooth', det:0,  ratio:1,   lp:1300, lvl:.34, att:.008, rel:.13, fo:3.5, ft:.12, fv:1.6},
  {label:{en:'Synth bass', ru:'Синт-бас'},  t1:'sawtooth', t2:'square',   det:12, ratio:0.5, lp:700,  lvl:.40, att:.020, rel:.24, fo:2.0, ft:.12, fv:1.0},
  /* Расширение (индексы 4..6). Существующие 4 не тронуты (байт-в-байт). Бас НЕ гуманизируем по высоте
     (низкие расстройки гулкие) — здесь только огибающая фильтра/скорость→яркость, как у пула. */
  {label:{en:'Upright bass', ru:'Контрабас'},        t1:'sawtooth', t2:'triangle', det:4,  ratio:1,   lp:520,  lvl:.38, att:.004, rel:.30, fo:2.5, ft:.10, fv:1.2},  // щипковый контрабас: быстрая атака, тёплый, средний спад
  {label:{en:'Synth bass (soft)', ru:'Синт-бас мягкий'},  t1:'sine',     t2:'triangle', det:0,  ratio:1,   lp:480,  lvl:.42, att:.020, rel:.22, fo:1.8, ft:.15, fv:.8},   // круглый саб, лёгкое движение фильтра
  {label:{en:'Organ bass', ru:'Орган-бас'},        t1:'square',   t2:'sine',     det:0,  ratio:1,   lp:620,  lvl:.36, att:.012, rel:.30, fo:1.0, ft:.02, fv:.3},   // ровный тянущийся низ — для дронов и педалей (fo=1: без наплыва)
];
/* Ударные: имена рядов (индекс 0 = низ сетки). Синтез на лету, без сэмплов. */
const DRUM_NAMES=[{en:'Kick',ru:'Кик'},{en:'Snare',ru:'Снейр'},{en:'Clap',ru:'Клэп'},{en:'Hat',ru:'Хэт'},{en:'Tom',ru:'Том'},{en:'Crash',ru:'Крэш'}];
const DRUM_ROWS=DRUM_NAMES.length;
/* Наборы ударных: тембр рядов. Стандарт — синтезированный кит; Дарбука — дум/тек
   (спасены из удалённого backing.js). Селектор той же формы, что LEAD_INSTR и др. */
const DRUM_KITS=[{label:{en:'Standard',ru:'Стандарт'}},{label:{default:'Darbuka',ru:'Дарбука'}},{label:{default:'Tabla',ru:'Табла'}},{label:{default:'Gamelan',ru:'Гамелан'}},{label:{default:'Taiko',ru:'Тайко'}}];

/* ================= АУДИО-ДВИЖОК (чистый Web Audio) ================= */
let AC=null, master, limiter, verb, verbOut;
/* banks — СКРАТЧ строителя банков (buildLeadBanks кладёт сюда собранный банк, buildLeadBank забирает).
   Раньше это был ПОСТОЯННЫЙ массив всех 23 банков соло-цепочки; теперь банк живёт в ГОЛОСЕ пула.
   bldHum — ConstantSource гуманизации ТОГО голоса, который сейчас строится (его цепляет mkOsc). */
let banks=[], bldHum=null, vibGain,
    tremGain, tremDepth, dlyWet, revLead, exprVibPitch, exprVibAmp, exprWah, exprSatSoftG, exprSatHardG, exprDlyWet;   // соло-ШИНА (expr* — узлы руки-ВЫРАЗИТЕЛЬНОСТИ (живость-вибрато / вау / текстура мягк.+жёстк. / пространство-делей), нейтральны по умолчанию)
let chordBus, revCh;                                    // аккорды (Z-яркость — пер-голосовой фильтр fb в пуле, не на шине)
let backBus, dO1, dO2, dG, noiseBuf;                    // дрон (шина + расстроенная пара)
const cv=[]; const chordHold={};                        // пул аккордовых голосов
const bv=[]; const bassHold={}; let bassBus;             // пул баса (моно-голос на слой)
let drumBus;                                             // шина ударных
 
function makeSatCurve(k=4,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x);} return c; }
/* ЖЁСТКАЯ кривая искажения — ДРУГОЙ ХАРАКТЕР, не «больше того же»: резкий клип (k высокий) + заострение
   (pow<1) + лёгкая АСИММЕТРИЯ (чётные гармоники → «злее/грязнее», а не просто громче тот же тон). Пара к
   makeSatCurve (мягкое/тёплое): размах пальцев морфит МЕЖДУ ними, поэтому щепоть = тепло, веер = грязь. */
function makeHardCurve(k=18,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; let y=Math.tanh(k*x); y=Math.sign(y)*Math.pow(Math.abs(y),0.7);
    c[i]=Math.max(-1,Math.min(1, y+0.12*x*x*Math.sign(x))); } return c; }
/* ВЫРАЗИТЕЛЬНОСТЬ — числа СТОРОНЫ ЗВУКА (канал→узел): здесь, а не в EXPR_CFG (gestures), потому что gestures
   импортирует audio — обратный импорт запрещён (цикл). EXPR_CFG держит признак→канал (мёртвые зоны/пружины);
   этот блок — канал→глубина/диапазон/добротность. Все ЭТИ числа тоже крутят НА СЛУХ. */
const EXPR_A={
  vibHz:5.2,                 // ЭНЕРГИЯ→ЖИВОСТЬ: частота шиммера (LFO)
  vibCents:2.5, vibAmp:0.05, // глубина шиммера ВЫСОТЫ (±центы, в пределах пары центов — живьём, в запись НЕ идёт) и АМПЛИТУДЫ (доля)
  wahLo:350, wahHi:2200, wahQ:5, wahBoost:14,   // НАТЯЖЕНИЕ→ВАУ: пик пробегает lo..hi (лог) с добротностью Q и подъёмом дБ
  soft:0.5, hard:1.0,        // РАЗМАХ→ТЕКСТУРА: уровни МЯГКОГО (тёплого) и ЖЁСТКОГО (грязного) искажений — меняется ХАРАКТЕР
  spaceMax:0.5,              // НАКЛОН→ПРОСТРАНСТВО: потолок посыла в делей
};
/* РЕВЕРБЕРАТОР — числа СТОРОНЫ ЗВУКА (как EXPR_A выше, и по той же причине живут здесь, а не в config:
   config — лист с геометрией/порогами жестов, а это «крутится НА СЛУХ»). Заменили конвольвер со
   случайным шумовым IR (makeIR): там хвост был ЗАПЕЧЁН в буфер — живьём менялось только КОЛИЧЕСТВО
   посыла, а длина и окраска стояли намертво. В сети задержек (см. buildFDN) и то и другое — настоящие
   AudioParam'ы. Пока держим их КОНСТАНТАМИ: живьём по-прежнему рулит только глубина руки (Z). */
const REV_A={
  decay:1.7,      // ДЛИНА ХВОСТА: RT60, с. Не с потолка: у старого IR огибающая (1−t/1.8)^2.2 пересекала
                  // −60 дБ на t≈1.72 с. Но спад там был ПОЛИНОМИАЛЬНЫЙ (дольше держится, потом обрыв), а
                  // у сети — экспоненциальный, поэтому на слух может проситься короче: рабочее 1.4–1.8.
  tone:5000,      // ОКРАСКА: cutoff демпфирующего ФНЧ В ПЕТЛЕ, Гц. Старый IR — белый шум, верхи не гасли
                  // вовсе (ярче любой реальной комнаты). 5 кГц = «чуть лучшая комната»: естественный спад
                  // верхов при сохранённой яркости. Прочтётся как «глуше, чем было» → поднять к 8000.
  toneQ:-3.0103,  // Q ФНЧ В ПЕТЛЕ. ⚠️ НЕ КОСМЕТИКА — от этого числа зависит устойчивость сети, и на нём
                  // реверб уже самовозбудился. У lowpass/highpass Web Audio трактует Q в ДЕЦИБЕЛАХ
                  // (α = sin ω₀/(2·10^(Q/20))), а ДЕФОЛТ Q=1 (дБ) = добротность 1.122 — выше плоского
                  // порога 1/√2, то есть РЕЗОНАНСНЫЙ ПИК +1.96 дБ (|LP|≈1.25) чуть ниже среза. Вне петли
                  // это просто подкраска, В ПЕТЛЕ — смерть: усиление обхода = g·|LP| = 0.886·1.25 = 1.11 > 1,
                  // и сеть завелась свистом на ~3.9 кГц (все четыре линии разом, матрица их синхронизует).
                  // −3.0103 дБ = добротность ровно 1/√2 (Баттерворт): характеристика МОНОТОННА, максимум
                  // ровно 1 на DC. Только с ним верно «усиление петли = radius(M)·g·|LP| ≤ g < 1» — и верно
                  // при ЛЮБЫХ достижимых decay и tone, а не только при сегодняшних константах.
                  // ⚠️ Кламп gMax тут НЕ помогал и помочь не мог: он ограничивает g, а разгон давал фильтр.
  outTrim:0.5,   // КАЛИБРОВКА УРОВНЯ под старый конвольвер (у того normalize=true, у сети нормировки нет).
                  // Оценка: g≈0.86 даёт накопление 1/(1−g)≈7 на линию, четыре некогерентно ≈×2, распределение
                  // входа/сбор отводов по 1/√N ⇒ ≈×3.6 ⇒ трим ≈0.28. ⚠️ ЧИСЛО ПОД УХО, диапазон ~0.1–0.6.
  preDelay:0.010, // пред-задержка: старый IR начинался с нулевого сэмпла (0 мс). 10 мс не читаются как
                  // отдельный слэп, но убирают замыливание атаки. Ближайшее к старому звуку — 0.
  hpf:80,         // ФВЧ на входе: не даёт DC/гулу копиться в петлях. Бас в реверб не идёт — потери не слышно.
  gMax:0.95,      // ПОТОЛОК обратной связи (защита от разгона; формула RT60→g и так даёт <1)
  diff:[0.0077,0.0109,0.0143], diffG:0.62,   // ТРИ входных аллпаса-диффузора (с) и их коэффициент
  lines:[0.0297,0.0371,0.0411,0.0437],       // ЧЕТЫРЕ линии сети (с); длины взаимно непериодичны
};
function mkOsc(type,freq,dest,gainVal){
  const o=AC.createOscillator(); o.type=type; o.frequency.value=freq;
  const g=AC.createGain(); g.gain.value=gainVal;
  o.connect(g); g.connect(dest); vibGain.connect(o.detune); if(bldHum)bldHum.connect(o.detune); exprVibPitch.connect(o.detune); o.start();   // вибрато fx (ОБЩЕЕ) + гуманизация ЭТОГО ГОЛОСА (bldHum — иначе вторая атака перестроила бы первую, ещё звучащую ноту) + шиммер ВЫРАЗИТЕЛЬНОСТИ (общий) — всё в detune (центы), сумма; exprVibPitch=0 без руки → байт-в-байт
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
function buildLeadBanks(preBus, ksOk, only){
  let i=0; const sel=n=>only==null||only===n;
  if(sel(i++)){ // SuperSaw
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const oscs=[]; for(const sp of [-12,-6,0,6,12]){
      const o=mkOsc('sawtooth',220,ig,0.17); o.detune.value=sp; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t))});
  }
  if(sel(i++)){ // Орган (аддитивный)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.42],[2,.22],[3,.14],[4,.09]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый (hum=0): собственная расстройка замаскировала бы биения строёв
  }
  if(sel(i++)){ // Пад
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2100; lp.connect(ig);
    const oscs=[]; for(const dt of [-7,0,7]){
      const o=mkOsc('triangle',220,lp,0.34); o.detune.value=dt; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,2100,1.5,0.35,0.8), hum:0});   // мягкая огибающая фильтра + скорость→яркость; hum=0 — чистая высота для строёв
  }
  if(sel(i++)){ // Колокол (FM)
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
  if(sel(i++)){ // Флейта: треугольник + синус-подпорка
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc('triangle',220,ig,0.35);
    const o2=mkOsc('sine',220,ig,0.22); o2.detune.value=4;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02);
      o2.frequency.setTargetAtTime(f,t,0.02);},
      cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  if(sel(i++)){ // 8-бит: чистый прямоугольник
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
  if(sel(i++))buildFMBank(preBus,{ratio:1.41, peak:10, sus:1.0,  tau:0.30});   // Колокол (глубокий)
  if(sel(i++))buildFMBank(preBus,{ratio:3.51, peak:7,  sus:0.35, tau:0.09});   // Металлофон
  /* --- Четыре семейства обычных субтрактивных банков (индексы 8..15, порядок push = хвост LEAD_INSTR).
     Стиль тот же, что у банков выше: ig-гейт → preBus, осцилляторы через mkOsc (вибрато+общая цепочка),
     статичный НЧ-фильтр на банк. Огибающую громкости даёт env ГОЛОСА по att/rel из LEAD_INSTR —
     сам банк её не трогает. В лид-цепочке нет ПОФАЗНОЙ огибающей фильтра и нет стадии спада-на-удержании
     (env держит 1, пока нота зажата): «щипок» слышен на атаке и на релизе/стаккато, а не как затухание
     удержанной ноты; «тростевой» призвук — из гармоник и резонанса фильтра, не из его движения. */
  if(sel(i++)){ // Пад тёплый: расстроенная пара пил через мягкий НЧ — длинный слитный гул для слышимости биений
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400; lp.connect(ig);
    const oscs=[]; for(const dt of [-8,8]){ const o=mkOsc('sawtooth',220,lp,0.30); o.detune.value=dt; oscs.push(o); }
    banks.push({gain:ig,setFreq:(f,t)=>oscs.forEach(o=>o.frequency.setTargetAtTime(f,t,0.02)),
                cancel:t=>oscs.forEach(o=>o.frequency.cancelScheduledValues(t)),
                strike:fstrike(lp,1400,1.5,0.4,0.8), hum:0});   // пад: плавная огибающая фильтра; hum=0 — чистая высота для строёв
  }
  if(sel(i++)){ // Пад стеклянный: треугольник+синус, фильтр ярче — воздушнее, тоже длинный
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200; lp.connect(ig);
    const o1=mkOsc('triangle',220,lp,0.30); o1.detune.value=-5;
    const o2=mkOsc('sine',220,lp,0.24);     o2.detune.value=6;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,3200,1.4,0.35,0.7), hum:0});   // пад: чуть ярче, тоже чистый для строёв
  }
  if(sel(i++)){ // Уд: тёплый щипок — пила+треугольник через низкий НЧ, лёгкая расстройка
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1200; lp.connect(ig);
    const o1=mkOsc('sawtooth',220,lp,0.28); o1.detune.value=-4;
    const o2=mkOsc('triangle',220,lp,0.22); o2.detune.value=4;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,1200,3.0,0.12,1.5)});   // щипок: яркое открытие фильтра, быстро закрывается; hum по умолчанию (1)
  }
  if(sel(i++)){ // Струна щипком: ярче и суше — одна пила через более открытый фильтр
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; lp.connect(ig);
    const o=mkOsc('sawtooth',220,lp,0.26);
    banks.push({gain:ig,setFreq:(f,t)=>o.frequency.setTargetAtTime(f,t,0.02),
                cancel:t=>o.frequency.cancelScheduledValues(t),
                strike:fstrike(lp,2600,3.5,0.08,1.5)});   // щипок ярче/суше — резче открытие и закрытие фильтра
  }
  if(sel(i++)){ // Флейта воздушная: почти синус + тихая октавная подпорка. ШУМА НЕТ: лид-банки в этой цепочке —
    // чисто осцилляторные (noiseBuf рождается позже, в initAudio), «дыхание» дают осцилляторы, не шум.
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const o1=mkOsc('sine',220,ig,0.34);
    const o2=mkOsc('sine',440,ig,0.05);   // тихая октава — лёгкий призвук вместо шума
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f*2,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);}});
  }
  if(sel(i++)){ // Тростевой: язычковый — прямоугольник+пила через РЕЗОНАНСНЫЙ НЧ (Q даёт формантный призвук)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; lp.Q.value=6; lp.connect(ig);
    const o1=mkOsc('square',220,lp,0.18);
    const o2=mkOsc('sawtooth',220,lp,0.14); o2.detune.value=5;
    banks.push({gain:ig,setFreq:(f,t)=>{o1.frequency.setTargetAtTime(f,t,0.02); o2.frequency.setTargetAtTime(f,t,0.02);},
                cancel:t=>{o1.frequency.cancelScheduledValues(t); o2.frequency.cancelScheduledValues(t);},
                strike:fstrike(lp,2200,2.0,0.15,1.2)});   // тростевой: умеренное движение резонансного фильтра — язычковое «оживление»
  }
  if(sel(i++)){ // Орган полный: драубары — гармоники 1,2,3,4,6 (октавы+квинты), плоская огибающая, БЕЗ расстройки
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);   // det=0 → тон сам не бьётся: лучший тембр для суждения о темперациях
    const parts=[[1,.34],[2,.26],[3,.20],[4,.14],[6,.08]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — лучший тембр для суждения о строях
  }
  if(sel(i++)){ // Орган мягкий: меньше верхних гармоник, чуть скруглённая атака (att в LEAD_INSTR)
    const ig=AC.createGain(); ig.gain.value=0; ig.connect(preBus);
    const parts=[[1,.44],[2,.20],[3,.10]].map(([h,g])=>({h,o:mkOsc('sine',220*h,ig,g)}));
    banks.push({gain:ig,setFreq:(f,t)=>parts.forEach(p=>p.o.frequency.setTargetAtTime(f*p.h,t,0.02)),
                cancel:t=>parts.forEach(p=>p.o.frequency.cancelScheduledValues(t)), hum:0});   // орган чистый — без собственной расстройки
  }
  KS_BANKS.forEach(o=>{ if(sel(i++)){ if(ksOk)buildKSBank(preBus,o); else buildKSFallback(preBus); } });   // Струна, Ситар, Уд, Кото, Сантур, Гитара, Пиццикато (индексы 16..22); ворклет не загрузился — запасной щипок держит индекс
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
   ОГРАНИЧЕНИЯ (осознанно): у KS нет oscillator.detune → детюн-вибрато и гуманизация его не касаются (hum:0).
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
/* ================= РЕВЕРБЕРАТОР: СЕТЬ ЗАДЕРЖЕК С ОБРАТНОЙ СВЯЗЬЮ (FDN) =================
   Схема (одна на всех; вход — узел verb, выход — verbOut → master):
     verb → ФВЧ → пред-задержка → аллпас ×3 → [ 4 линии: задержка → ФНЧ(окраска) → g(длина) ]
                                                  ↕ перемешивание Хаусхолдера
                                               → стерео-отводы → merger → трим → verbOut
   ПОЧЕМУ ИМЕННО ТАК (каждый пункт — не украшение):
   • ЧЕТЫРЕ ЛИНИИ — минимум, дающий РАСТУЩУЮ плотность эха, как в комнате; одна-две дают «пружину».
     Длины взаимно непериодичны, иначе отражения выстраиваются в периодический «бонг».
   • ТРИ АЛЛПАСА НА ВХОДЕ — обязательны, а не полировка. Мы заменяем свёртку с ШУМОМ, плотную с
     нулевого сэмпла; голая сеть отвечает на щипок несколькими различимыми пингами, пока плотность
     нарастает. Аллпасы размазывают вход, и хвост начинается уже плотным.
   • ФНЧ ВНУТРИ петли, а не после неё: только там верхи теряют энергию НА КАЖДОМ проходе — ровно так их
     гасят воздух и мягкие поверхности. Это и делает окраску отдельным параметром, а не тон-ручкой.
   • ПЕРЕМЕШИВАНИЕ ХАУСХОЛДЕРА: in_i = вход + x_i − (2/N)·Σx. Полная ортогональная матрица 4×4 за два
     общих узла вместо шестнадцати связей. Ортогональность НЕСУЩАЯ: матрица не добавляет и не отнимает
     энергию, поэтому длину хвоста задают ТОЛЬКО g_i и демпфирование, а разгон «от матрицы» невозможен.
   • СТЕРЕО-ОТВОДЫ ОБЯЗАТЕЛЬНЫ: все узлы здесь моно-в-моно, а у старого конвольвера IR был
     ДВУХКАНАЛЬНЫЙ шум — хвост был ШИРОКИМ. Без разных знаков линий на L и R реверб схлопнулся бы в
     точку по центру, и это читалось бы как «стало уже», а не как «другой ревербератор».
   • НАТИВНЫЕ DelayNode в петле здесь МОЖНО — в отличие от Карплюса (см. ks-worklet.js): петля заперта
     одним квантом (128 сэмплов ≈ 2.9 мс), но все задержки тут 7–44 мс, на порядок выше пола, и строить
     реверб в ноту не нужно, поэтому сэмпловая квантизация неслышна. Ворклет не требуется. */
let revLines=[];   // [{d,lp,fb,time}] — ручки ЖИВЫХ параметров сети; см. setRevDecay/setRevTone
/* Аллпас Шрёдера: y = −g·x + z(x + g·y). Задержка БЕЗ окраски спектра — ровно то, что нужно, чтобы
   размазать вход, ничего в нём не подкрасив. Возвращает выход (он же вход следующей ступени). */
function apStage(src,time,g){
  const sum=AC.createGain(), d=AC.createDelay(0.25), fb=AC.createGain(), ff=AC.createGain(), out=AC.createGain();
  d.delayTime.value=time; fb.gain.value=g; ff.gain.value=-g; out.gain.value=1;
  src.connect(sum); sum.connect(d); d.connect(fb); fb.connect(sum);   // петля: +g (в цикле есть d — правило Web Audio соблюдено)
  d.connect(out); sum.connect(ff); ff.connect(out);                   // прямой ход: −g
  return out;
}
function buildFDN(inNode,outNode){
  const N=REV_A.lines.length, sc=1/Math.sqrt(N);       // энергосохраняющее распределение входа и сбор отводов
  const hp=AC.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=REV_A.hpf; hp.Q.value=REV_A.toneQ;   // Q — та же беда «Q в дБ» (дефолт дал бы +2 дБ горб на 80 Гц); ЗДЕСЬ безобидно (узел на прямом ходу, вне петель), правим ради единообразия — дефект один и тот же
  const pre=AC.createDelay(0.25); pre.delayTime.value=REV_A.preDelay;
  inNode.connect(hp); hp.connect(pre);
  let src=pre;
  for(const t of REV_A.diff) src=apStage(src,t,REV_A.diffG);
  const dist=AC.createGain(); dist.gain.value=sc; src.connect(dist);   // один узел на все линии (вместо N)
  /* Вторая половина матрицы Хаусхолдера: S — сумма выходов всех линий, H — её масштаб −2/N.
     Первая половина (+x_i) — прямая связь fb→inSum каждой линии ниже. */
  const S=AC.createGain(); S.gain.value=1;
  const H=AC.createGain(); H.gain.value=-2/N; S.connect(H);
  const chL=AC.createGain(), chR=AC.createGain(), merge=AC.createChannelMerger(2), trim=AC.createGain();
  chL.gain.value=1; chR.gain.value=1; trim.gain.value=REV_A.outTrim;
  chL.connect(merge,0,0); chR.connect(merge,0,1); merge.connect(trim); trim.connect(outNode);
  const sgnL=[1,1,-1,-1], sgnR=[1,-1,-1,1];            // разные знаки/линии на каналы → декорреляция (ширина)
  revLines=REV_A.lines.map((time,i)=>{
    const inSum=AC.createGain(); inSum.gain.value=1;
    const d=AC.createDelay(0.25); d.delayTime.value=time;
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=REV_A.tone; lp.Q.value=REV_A.toneQ;   // ОКРАСКА (в петле); Q — Баттерворт, БЕЗ пика: см. REV_A.toneQ, дефолтный Q заводил сеть свистом
    const fb=AC.createGain(); fb.gain.value=0;          // ДЛИНА; настоящее значение ставит setRevDecay из RT60
    dist.connect(inSum);                                 // вход сети
    inSum.connect(d); d.connect(lp); lp.connect(fb);     // тело линии: задержка → демпфирование → потеря
    fb.connect(inSum); fb.connect(S); H.connect(inSum);  // Хаусхолдер: +x_i, вклад в Σ, общий член −(2/N)Σ
    const tL=AC.createGain(), tR=AC.createGain();
    tL.gain.value=sc*sgnL[i]; tR.gain.value=sc*sgnR[i];
    fb.connect(tL); tL.connect(chL); fb.connect(tR); tR.connect(chR);
    return {d,lp,fb,time};
  });
}
/* ДЛИНА ХВОСТА (RT60 → обратная связь каждой линии). g_i = 10^(−3·d_i/RT60): сигнал, обошедший линию
   RT60/d_i раз, теряет ровно 60 дБ. Формула ЗАВИСИТ ОТ ДЛИНЫ ЛИНИИ — потому одно число и даёт
   одинаковый хвост на четырёх РАЗНЫХ задержках.
   ⚠️ УСТОЙЧИВОСТЬ ДЕРЖИТСЯ НА ТРЁХ ВЕЩАХ, И ТРЕТЬЯ НЕОЧЕВИДНА — на ней сеть уже завелась:
     (1) матрица перемешивания ОРТОГОНАЛЬНА (спектральный радиус ровно 1) — энергии не добавляет;
     (2) g < 1 математически при любом конечном RT60, сверху кламп gMax;
     (3) ФНЧ в петле имеет Q БАТТЕРВОРТА (REV_A.toneQ = −3.0103 дБ) ⇒ |LP| ≤ 1 НА ВСЕХ частотах.
   Итого усиление обхода = radius(M)·g·|LP| ≤ g < 1, и это верно при ЛЮБЫХ decay/tone.
   ⛔ НИКОГДА НЕ ПИСАТЬ «ФНЧ в петле даёт потери» — это ровно та ЛОЖНАЯ посылка, из-за которой реверб
   самовозбудился. Фильтр гасит в полосе ЗАДЕРЖИВАНИЯ, но с дефолтным Q (а он у Web Audio в ДЕЦИБЕЛАХ!)
   УСИЛИВАЕТ на резонансном пике (+1.96 дБ, |LP|≈1.25), а петля живёт как раз в полосе ПРОПУСКАНИЯ:
   0.886·1.25 = 1.11 > 1 → свист на ~3.9 кГц. Убери Баттерворт — вернётся. Считать усиление петли, а не
   доверять слову «фильтр». Мастер-лимитер — ПОСЛЕДНИЙ РУБЕЖ (он ту аварию и поймал), НЕ гарантия схемы. */
function setRevDecay(sec){ if(!AC||!revLines.length)return;
  const t=AC.currentTime, rt=Math.max(0.05,sec);
  for(const L of revLines){ const g=Math.min(REV_A.gMax, Math.pow(10,-3*L.time/rt));
    L.fb.gain.setTargetAtTime(g,t,0.05); } }
/* ОКРАСКА ХВОСТА: cutoff демпфирующих ФНЧ во ВСЕХ петлях. Живой параметр — в отличие от IR, где тембр
   хвоста был запечён в буфер и менялся только пересборкой буфера. */
function setRevTone(hz){ if(!AC||!revLines.length)return;
  const t=AC.currentTime, f=Math.max(200,Math.min(18000,hz));
  for(const L of revLines) L.lp.frequency.setTargetAtTime(f,t,0.05); }
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
  ksReady=ksOk;                                    // голоса пула строятся ЛЕНИВО, уже после initAudio — запоминаем результат загрузки
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
 
  /* Общий ревербератор: СЕТЬ ЗАДЕРЖЕК С ОБРАТНОЙ СВЯЗЬЮ (FDN, см. buildFDN), у каждого источника свой
     send. Заменила конвольвер со случайным шумовым IR: у свёртки хвост ЗАПЕЧЁН в буфер, и живьём
     менялось только КОЛИЧЕСТВО посыла — длина и окраска стояли намертво. Здесь длина (обратная связь
     линий) и окраска (ФНЧ внутри петель) — настоящие AudioParam'ы; пока держим их константами REV_A,
     живьём по-прежнему рулит ТОЛЬКО глубина руки (Z) через send соло.
     ⚠️ verb остался ВХОДНЫМ УЗЛОМ и сохранил ИМЯ намеренно: оба посыла — соло (leadOut→revLead→verb) и
     аккорды (chordBus→revCh→verb) — приходят сюда, и их проводка ниже НЕ тронута. Общий реверб для
     соло и аккордов работает ПО ПОСТРОЕНИЮ, а не потому, что кто-то не забыл его перецепить. */
  verb=AC.createGain(); verb.gain.value=1;
  verbOut=AC.createGain(); verbOut.gain.value=0.9;
  verbOut.connect(master);
  buildFDN(verb,verbOut);
  setRevDecay(REV_A.decay); setRevTone(REV_A.tone);   // единственный вызов: параметры живые, но в этом заходе постоянные
 
  /* --- СОЛО-цепочка (как в версии 2) --- */
  const vibLFO=AC.createOscillator(); vibLFO.frequency.value=5.5;
  vibGain=AC.createGain(); vibGain.gain.value=0;
  vibLFO.connect(vibGain); vibLFO.start();
  /* Гуманизация высоты — ConstantSource в detune осцилляторов; на каждой атаке свежий случайный сдвиг
     ±HUM_CENTS·bank.hum, detune не трогается пофреймовой setFreq, поэтому сдвиг держится всю ноту.
     ⚠️ ОН ПЕР-ГОЛОСОВОЙ (v.hum, см. пул соло), а НЕ общий, как был: с пулом общий узел означал бы, что
     атака второй ноты перестраивает высоту первой, ещё звучащей. Здесь его больше не создаём. */
  /* ЖИВОСТЬ (энергия → вибрато): свой LFO шиммера. exprVibPitch → detune ВСЕХ лид-осц. (mkOsc цепляет ниже),
     глубина = энергия (пишет applyExpr, в пределах пары центов). ОТДЕЛЬНО от vibGain (вибрато fx-руки) — не
     дерутся, суммируются в detune. На реальном инструменте вибрато рождается из НЕПРЕРЫВНОГО усилия, а
     идеально статичный тон звучит МЁРТВО — так «смычок» кормит теперь ЖИЗНЬ, а не громкость. Создаём ДО
     построением голосов, чтобы mkOsc сразу цеплял exprVibPitch (как vibGain). Живьём, в запись НЕ идёт. */
  const exprVibLFO=AC.createOscillator(); exprVibLFO.type='sine'; exprVibLFO.frequency.value=EXPR_A.vibHz;
  exprVibPitch=AC.createGain(); exprVibPitch.gain.value=0;   // глубина шиммера ВЫСОТЫ (центы), нейтраль 0 → detune += 0 (байт-в-байт)
  exprVibLFO.connect(exprVibPitch); exprVibLFO.start();

  /* ВХОД ШИНЫ СОЛО: сюда суммируются голоса пула (каждый со своим банком, шейпером, огибающей и
     громкостью — см. «ПУЛ ГОЛОСОВ»). Голоса строятся ЛЕНИВО, поэтому здесь ничего не строим: играющий
     одну ноту получит ровно один голос = ровно один банк (вместо прежних 23 сразу). */
  leadSum=AC.createGain(); leadSum.gain.value=1;
  const satSum=leadSum;

  /* ВЫРАЗИТЕЛЬНОСТЬ (рука-«смычок»): ЧЕТЫРЕ канала → ЧЕТЫРЕ РАЗНЫЕ оси (см. applyExpr): ЖИВОСТЬ (энергия→
     вибрато, выше), ВАУ (натяжение→резонансный пик), ТЕКСТУРА (размах→ХАРАКТЕР искажения), ПРОСТРАНСТВО
     (наклон→делей). Громкость больше НЕ здесь — она целиком у НОТНОЙ руки (vol ГОЛОСА, X-позиция): две руки не
     дерутся за одну величину. Все узлы ниже НЕЙТРАЛЬНЫ по умолчанию (gain 1 или 0, wah при 0дБ — плоский
     тождественный биквад) → без руки соло-цепочка БИТ-В-БИТ как сегодня.
     Огибающая (env) и громкость X (vol) ушли В ГОЛОС пула: у каждой руки свой X и своя нота, делить их
     одним узлом больше нельзя. Порядок внутри голоса тот же — шейпер → env → vol, — поэтому одна нота
     звучит как раньше; сюда голоса приходят уже суммой (leadSum). */
  /* ЖИВОСТЬ (амплитудная часть шиммера): exprGain = ЕДИНИЦА (база), её .gain МОДУЛИРУЕТ vibrato-LFO через
     exprVibAmp (глубина=энергия). applyExpr сам exprGain НЕ пишет (громкость ушла нотной руке). Нейтраль:
     exprVibAmp=0 → exprGain держит ровно 1 (тождество). Пара к exprVibPitch (высотная часть, в detune). */
  const exprGain=AC.createGain(); exprGain.gain.value=1;
  satSum.connect(exprGain);
  exprVibAmp=AC.createGain(); exprVibAmp.gain.value=0;
  exprVibLFO.connect(exprVibAmp); exprVibAmp.connect(exprGain.gain);

  /* ТЕКСТУРА (размах пальцев → ХАРАКТЕР искажения, НЕ количество): ДВА шейпера параллельно — МЯГКИЙ (тёплый,
     makeSatCurve) и ЖЁСТКИЙ (грязный, makeHardCurve). Размах морфит МИКС между ними: щепоть=тёплое, веер=грязное
     (разный РОД искажения). exprSatLP после ГАСИТ добавленные верхи → «грязнее», а НЕ «ярче» (в этом и была
     жалоба на текстуру). Сухой всегда полный (параллель). Нейтраль: обе влажные=0 → только сухой = тождество. */
  const softShaper=AC.createWaveShaper(); softShaper.curve=makeSatCurve();  softShaper.oversample='2x';
  const hardShaper=AC.createWaveShaper(); hardShaper.curve=makeHardCurve(); hardShaper.oversample='4x';
  const exprSatLP=AC.createBiquadFilter(); exprSatLP.type='lowpass'; exprSatLP.frequency.value=2500;   // грязь ≠ ярче
  const exprSatDry=AC.createGain(); exprSatDry.gain.value=1;
  exprSatSoftG=AC.createGain(); exprSatSoftG.gain.value=0;
  exprSatHardG=AC.createGain(); exprSatHardG.gain.value=0;
  const exprSatWetSum=AC.createGain(), exprSatSum=AC.createGain();
  exprGain.connect(exprSatDry); exprSatDry.connect(exprSatSum);
  exprGain.connect(softShaper); softShaper.connect(exprSatSoftG); exprSatSoftG.connect(exprSatWetSum);
  exprGain.connect(hardShaper); hardShaper.connect(exprSatHardG); exprSatHardG.connect(exprSatWetSum);
  exprSatWetSum.connect(exprSatLP); exprSatLP.connect(exprSatSum);

  tremGain=AC.createGain(); tremGain.gain.value=1;
  const tremLFO=AC.createOscillator(); tremLFO.frequency.value=4;
  tremDepth=AC.createGain(); tremDepth.gain.value=0;
  tremLFO.connect(tremDepth); tremDepth.connect(tremGain.gain); tremLFO.start();
  /* ВАУ (натяжение → частота резонансного пика): высокодобротный PEAKING-биквад — резонансный пик, который
     ПРОБЕГАЕТ частоту вслед за раскрытием ладони (раскрыто = пик вверх, кулак = вниз). Громче/яснее фейзера,
     физически читаемо — рука ведёт «голос» звука. Peaking (а не чистый bandpass в разрыв: тот истончил бы
     тон) — пропускает ВЕСЬ сигнал, поднимает одну полосу. Нейтраль: подъём 0дБ → peaking-биквад ПЛОСКИЙ
     (тождество), поэтому без руки байт-в-байт. Частота/Q/подъём — EXPR_A (крутить на слух). */
  exprWah=AC.createBiquadFilter(); exprWah.type='peaking'; exprWah.frequency.value=EXPR_A.wahLo; exprWah.Q.value=EXPR_A.wahQ; exprWah.gain.value=0;
  exprSatSum.connect(exprWah); exprWah.connect(tremGain);
 
  const leadOut=AC.createGain(); leadOut.gain.value=0.22;   // сушит и посылы (dly/rev идут ПОСЛЕ leadOut)
  tremGain.connect(leadOut); leadOut.connect(master);
 
  const dly=AC.createDelay(1); dly.delayTime.value=0.35;
  const fb=AC.createGain(); fb.gain.value=0.45; dly.connect(fb); fb.connect(dly);
  dlyWet=AC.createGain(); dlyWet.gain.value=0;
  leadOut.connect(dly); dly.connect(dlyWet); dlyWet.connect(master);
 
  revLead=AC.createGain(); revLead.gain.value=0;
  leadOut.connect(revLead); revLead.connect(verb);
  /* ПРОСТРАНСТВО (наклон ладони → ЭХО): ОТДЕЛЬНАЯ линия ДЕЛЕЯ руки-выразительности — НЕ реверб, чтобы читалось
     как ЭХО, а не как комната, которую уже даёт реверб fx-руки. Своя линия + обратная связь + посыл, ДОБАВОЧНО к
     делею fx-руки (dly/dlyWet), чьи значения она НЕ читает и НЕ пишет. Нейтраль: посыл 0. */
  const exprDlyLine=AC.createDelay(1); exprDlyLine.delayTime.value=0.28;
  const exprDlyFb=AC.createGain(); exprDlyFb.gain.value=0.4; exprDlyLine.connect(exprDlyFb); exprDlyFb.connect(exprDlyLine);
  exprDlyWet=AC.createGain(); exprDlyWet.gain.value=0;
  leadOut.connect(exprDlyLine); exprDlyLine.connect(exprDlyWet); exprDlyWet.connect(master);

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
/* ⚠️ СМЕНА ИНСТРУМЕНТА БОЛЬШЕ НЕ «ПЕРЕЛИВАЕТ» ЗВУЧАЩУЮ НОТУ. Раньше здесь был кроссфейд гейтов всех 23
   банков: удержанная нота меняла тембр под пальцами. Теперь тембр ПЕЧЁТСЯ НА АТАКЕ в голосе (по a.inst),
   ровно как у аккордов и баса, — звучащая нота доигрывает своим тембром, новый инструмент вступает со
   СЛЕДУЮЩЕЙ атаки. Это осознанная плата за пул, и она же чинит старый баг: переигранный слой звал
   setLeadInstr(a.inst) и УВОДИЛ живой инструмент вместе с кнопкой в панели (см. ENG.leadOn в recorder). */
function setLeadInstr(i){
  setLeadIdx(((i%LEAD_INSTR.length)+LEAD_INSTR.length)%LEAD_INSTR.length);
  if(!AC)return;
  hooks.leadInstr && hooks.leadInstr(leadIdx);
}
/* ЭФФЕКТЫ соло — ОБЩИЕ НА ВСЕ ГОЛОСА (шина), кроме драйва. Одна идея на изменение: реверб/делей/тремоло/
   вибрато/выразительность живут на шине, поэтому две руки делят их глубину (последняя пишет). Пер-голосовой
   посыл в реверб — возможное продолжение, если общая глубина начнёт мешать.
   ДРАЙВ — ИСКЛЮЧЕНИЕ, И ЭТО НЕ ПРИХОТЬ: сатурация стоит ДО огибающей (bank → shaper → env → vol), а tanh
   нелинеен, поэтому env·tanh(x) ≠ tanh(env·x). Вынеси драйв на шину — и ОДНА нота при drv>0 (а он по
   умолчанию 0.12, не ноль!) зазвучала бы иначе, чем сегодня. Поэтому шейпер живёт В ГОЛОСЕ, и порядок
   узлов внутри голоса — байт-в-байт прежний. */
function applyFx(p){
  const t=AC.currentTime;
  vibGain.gain.setTargetAtTime(p.vib*35,t,0.05);
  for(const v of lv){ v.satWet.gain.setTargetAtTime(p.drv,t,0.05); v.satDry.gain.setTargetAtTime(1-p.drv*0.7,t,0.05); }
  lastFx.drv=p.drv;                                       // новый голос строится сразу с текущим драйвом
  tremDepth.gain.setTargetAtTime(p.trm*0.45,t,0.05);
  tremGain.gain.setTargetAtTime(1-p.trm*0.45,t,0.05);
  dlyWet.gain.setTargetAtTime(p.dly*0.55,t,0.08);
  revLead.gain.setTargetAtTime(p.rev*0.85,t,0.08);
}
/* ВЫРАЗИТЕЛЬНОСТЬ → звук. gestures прогнал признаки через резонатор/пружину (вся «жизнь» там) и шлёт СГЛАЖЕННЫЕ
   каналы 0..1 + engage. Мэппинг канал→узел (глубины/диапазоны) — по EXPR_A (числа стороны звука). Через
   setTargetAtTime (не прямое присваивание — то слышно как щелчок). ЧЕТЫРЕ РАЗНЫЕ оси, в этом весь смысл:
   en — ЖИВОСТЬ (энергия→вибрато высоты+амплитуды; НЕ громкость — та у нотной руки), ten — ВАУ (натяжение→частота
   пика), spr — ТЕКСТУРА (размах морфит МЯГК.↔ЖЁСТК. искажение — характер, не количество), ori — ПРОСТРАНСТВО
   (наклон→делей). Всё гейтится engage (нет руки → 0/тождество). Свои узлы — эффекты fx-руки не читают/не пишут. */
function applyExpr(en,ten,spr,ori,eng,tc){ if(!AC)return; const t=AC.currentTime;
  exprVibPitch.gain.setTargetAtTime(en*eng*EXPR_A.vibCents,t,tc);   // ЖИВОСТЬ: шиммер ВЫСОТЫ (±центы, живьём, в запись НЕ идёт)
  exprVibAmp.gain.setTargetAtTime(en*eng*EXPR_A.vibAmp,t,tc);       // ЖИВОСТЬ: шиммер АМПЛИТУДЫ (модулирует exprGain база 1)
  exprWah.frequency.setTargetAtTime(EXPR_A.wahLo*Math.pow(EXPR_A.wahHi/EXPR_A.wahLo,ten),t,tc);   // ВАУ: пик пробегает lo..hi (лог) по натяжению
  exprWah.gain.setTargetAtTime(eng*EXPR_A.wahBoost,t,tc);           // ВАУ: подъём дБ (0 без руки → плоский)
  exprSatSoftG.gain.setTargetAtTime(eng*(1-spr)*EXPR_A.soft,t,tc);  // ТЕКСТУРА: щепоть → тёплое (мягкий шейпер)
  exprSatHardG.gain.setTargetAtTime(eng*spr*EXPR_A.hard,t,tc);      // ТЕКСТУРА: веер → грязное (жёсткий шейпер)
  exprDlyWet.gain.setTargetAtTime(ori*eng*EXPR_A.spaceMax,t,tc);    // ПРОСТРАНСТВО: посыл в делей (эхо)
}
/* ================= СОЛО: ПУЛ ГОЛОСОВ (было — ОДИН моно-голос) =================
   Устройство ровно как у аккордов (cv/chordHold): голоса + владельцы, изоляция по КЛЮЧУ ВЛАДЕЛЬЦА.
   Живой голос руки = 'lead:L'/'lead:R', переигранный слой = 'leadloop:N:v' — поэтому живая игра и
   переигровка БОЛЬШЕ НЕ ДЕРУТСЯ за один голос (та же развязка, что 'latch' vs 'loop:N' у аккордов).
   ОТЛИЧИЕ ОТ АККОРДОВ, важное: аккордовый голос УНИВЕРСАЛЕН (два осциллятора, перенастраиваются на
   атаке), а соло-банки структурно разные (5-осцилляторный орган, FM-пара, KS-ворклет). Поэтому голос
   строит СВОЙ банк — и только тот, которым играет (см. buildLeadBank). Лениво: кто не играет вторую
   ноту, за второй голос не платит.
   ЧТО В ГОЛОСЕ, А ЧТО НА ШИНЕ (порядок узлов внутри голоса — прежний, до последнего звена):
     голос: банк → satDry/satWet(шейпер) → satSum → env → vol → leadSum   (+ свой hum в detune)
     шина:  leadSum → exprGain → expr-шейперы → вау → тремоло → leadOut → делей/реверб
   Драйв в голосе — не прихоть, см. applyFx. Огибающая и громкость X — очевидно в голосе (у каждой руки
   свой X). А вот ГУМАНИЗАЦИЯ: раньше humDetune был ОДИН на всю цепочку и переписывался на каждой атаке.
   ⚠️ С пулом это стало бы БАГОМ: вторая атака перестроила бы высоту ПЕРВОЙ, ещё звучащей ноты. Поэтому
   ConstantSource гуманизации — ПЕР-ГОЛОСОВОЙ (v.hum), и mkOsc цепляет именно его (bldHum).
   ⛔ НЕ возвращать общий humDetune и НЕ строить все банки в голосе. */
const lv=[]; const leadHold={};            // голоса пула и владельцы (ключ → голос)
let leadSum=null, ksReady=true;            // шина соло (вход эффектов) + загрузился ли KS-ворклет (для ленивой стройки)
const LEAD_KS_FROM=LEAD_INSTR.length-KS_BANKS.length;   // с какого индекса начинаются KS-инструменты (считаем, не зашиваем)
const lastFx={drv:0};                      // последний драйв — чтобы НОВЫЙ голос строился сразу с ним, а не с нулём
/* Собрать ОДИН банк по индексу инструмента в вход голоса. banks — скратч (см. buildLeadBanks). */
function buildLeadBank(ins, pre, hum){
  banks.length=0; bldHum=hum;
  buildLeadBanks(pre, ksReady, ins);
  bldHum=null;
  return banks[0];
}
function newLeadVoice(){
  const hum=AC.createConstantSource(); hum.offset.value=0; hum.start();   // гуманизация ЭТОГО голоса
  const pre=AC.createGain(); pre.gain.value=1;                            // вход банка (бывший общий preBus)
  const shaper=AC.createWaveShaper(); shaper.curve=makeSatCurve(); shaper.oversample='2x';
  const satDry=AC.createGain(); satDry.gain.value=1-lastFx.drv*0.7;
  const satWet=AC.createGain(); satWet.gain.value=lastFx.drv;
  const satSum=AC.createGain();
  const env=AC.createGain(); env.gain.value=0;
  const vol=AC.createGain(); vol.gain.value=0.5;
  pre.connect(satDry); pre.connect(shaper); shaper.connect(satWet);
  satDry.connect(satSum); satWet.connect(satSum);
  satSum.connect(env); env.connect(vol); vol.connect(leadSum);
  /* deg/oct — КАКУЮ НОТУ этот голос сейчас держит. Звуку они не нужны (частота уже в осцилляторах), их
     держит ПОДСВЕТКА: leadHold — единственный источник правды о том, что звучит, и записываются они
     ТЕМ ЖЕ вызовом, что запускает ноту (leadOn). Второго пути записи нет, поэтому картинка не может
     разойтись со звуком и не может отстать от него на кадр. */
  const v={hum,pre,satDry,satWet,env,vol,banks:{},ins:-1,owner:null,tOn:0,on:false,deg:-1,oct:0};
  lv.push(v); return v;
}
/* Банк голоса ПОД ИНСТРУМЕНТ: строим лениво и КЭШИРУЕМ на голосе. Кэш (а не пересборка) потому, что
   осциллятор, однажды запущенный, живёт до конца контекста (правило #3) — «выбросить» банк нельзя, его
   можно только заглушить гейтом, ровно как делал прежний глобальный набор. Практический потолок: число
   РЕАЛЬНО сыгранных инструментов × число РЕАЛЬНО занятых голосов (обычно 1–2 × 1–2), против 23 сегодня. */
function leadVoiceBank(v,ins){
  let b=v.banks[ins];
  if(!b){ b=v.banks[ins]=buildLeadBank(ins,v.pre,v.hum); b.gain.gain.value=0; }
  if(v.ins!==ins){
    /* ПЕРВЫЙ банк голоса открываем МГНОВЕННО — ровно как это делал initAudio (banks[leadIdx].gain.value=1)
       ещё до первой ноты. Через 20мс-рампу гейта первая атака вышла бы смазанной, и «одна нота звучит
       как раньше» сломалось бы на самой первой. Смена банка ПОЗЖЕ — прежним кроссфейдом setLeadInstr. */
    if(v.ins<0) b.gain.gain.value=1;
    else { const t=AC.currentTime; for(const k in v.banks) v.banks[k].gain.gain.setTargetAtTime(+k===ins?1:0,t,0.02); }
    v.ins=ins;
  }
  return b;
}
const leadCap=ins=> ins>=LEAD_KS_FROM ? LEAD_POOL_KS : LEAD_POOL_N;   // KS дороже (ворклет на голос) → свой потолок
/* Выдача голоса. Порядок: свой (тот же владелец — ведение ноты, НЕ переаллокация) → свободный с УЖЕ
   построенным нужным банком (сродство: иначе слой на Ситаре и живая рука на Органе строили бы банк на
   каждой атаке) → любой свободный → новый (лениво, пока не упёрлись в потолок) → КРАЖА.
   Красть начинаем с ОТПУЩЕННЫХ голосов (у них лишь хвост), и только потом с зажатых: у мелодии
   оборванная нота слышна куда сильнее, чем у аккорда (там cvAlloc просто берёт самый старый). */
function leadAlloc(owner,ins){
  if(leadHold[owner])return leadHold[owner];
  const cap=leadCap(ins);
  let v=lv.find(x=>!x.owner&&x.banks[ins]) || lv.find(x=>!x.owner);
  if(!v&&lv.length<cap) v=newLeadVoice();
  if(!v){ const free=lv.filter(x=>!x.on); v=(free.length?free:lv).reduce((a,b)=>a.tOn<b.tOn?a:b);
    if(v.owner) delete leadHold[v.owner]; leadRelease(v,true); }
  v.owner=owner; leadHold[owner]=v; return v;
}
function leadRelease(v,hard){
  const t=AC.currentTime;
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(0,t,hard?0.02:LEAD_INSTR[v.ins<0?leadIdx:v.ins].rel);
  v.on=false; v.owner=null;
}
/* Атака/ведение ноты владельца. Зовётся КАЖДЫЙ КАДР зажатой рукой (как и раньше): частота и громкость
   едут всегда, а сама атака — один раз (гейт v.on, бывший noteOnFlag). Порядок и постоянные времени
   1-в-1 прежние: setFreq 0.02 (тот самый 20мс-глайд), vol 0.04, гуманизация 0.006, ±5% уровня, ±10% атаки. */
function leadOn(owner,freq,vol,ins,deg,oct){
  const v=leadAlloc(owner,ins), t=AC.currentTime, b=leadVoiceBank(v,ins);
  if(freq!=null)b.setFreq(freq,t);
  v.vol.gain.setTargetAtTime(vol,t,0.04);
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }   // ЧТО звучит — для подсветки; пишем КАЖДЫЙ кадр, поэтому ведение ноты (смена ступени под пальцем) отражается сразу
  if(v.on)return;
  v.on=true; v.tOn=t;
  /* Гуманизация — СВЕЖАЯ случайность на каждую атаку (в т.ч. при переигровке лупа: генерится здесь, в
     событии НЕ хранится), теперь в СВОЙ ConstantSource голоса. Высоту дёргаем на bank.hum (у органа/падов
     0 — не маскируем биения строёв), уровень и время атаки — всем чуть-чуть (на биения не влияет). */
  const hum = b.hum==null?1:b.hum;
  v.hum.offset.setTargetAtTime((Math.random()*2-1)*HUM_CENTS*hum, t, 0.006);
  const lvlJ = 1 - Math.random()*0.05;                       // −0..5% уровня
  const attJ = LEAD_INSTR[ins].att*(0.9+Math.random()*0.2);   // ±10% времени атаки
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setTargetAtTime(lvlJ,t,attJ);
  b.strike && b.strike(t, vol);   // FM: огибающая индекса; банки с фильтром: огибающая фильтра + скорость→яркость (громкость ЭТОЙ атаки — прежний lastVel по значению)
}
function leadSet(owner,freq,vol,deg,oct){                    // ведение без атаки (leadSet из лупера; freq==null — идёт бенд, частоту не сбиваем)
  const v=leadHold[owner]; if(!v)return; const t=AC.currentTime, b=v.banks[v.ins];
  if(freq!=null&&b)b.setFreq(freq,t);
  v.vol.gain.setTargetAtTime(vol,t,0.04);
  if(deg!=null){ v.deg=deg; v.oct=oct||0; }                  // ступень ведётся вместе с частотой — подсветка идёт за нотой
}
/* Отпускание: голос УХОДИТ ИЗ leadHold сразу — подсветка гаснет ровно в тот момент, когда сняли ноту,
   а хвост релиза дозвучивает (так же вело себя моно-соло: noteOff гасил и S.deg, и картинку). */
function leadOff(owner){ const v=leadHold[owner]; if(!v)return; delete leadHold[owner]; v.deg=-1; leadRelease(v,false); }
function leadAllOff(){ for(const k of Object.keys(leadHold)) leadOff(k); }      // паника/смена лада: гасим ВСЕХ владельцев (как chordHold/bassHold)
/* Глиссандо-в-луп (переигровка терменвокса): расписываем ЗАПИСАННУЮ кривую бенда на будущие
   AC-времена через ТУ ЖЕ setFreq (setTargetAtTime 0.02) — тот же 20мс-глайд, что и живьём.
   baseFreq — частота ступени по ЗАМОРОЖЕННОМУ ладу (полимодальность), c — центы поверх неё;
   абсолютных Гц не храним. dt в долях → секунды через secPerBeat.
   ⚠️ ТОЛЬКО В СВОЙ ГОЛОС: раньше кривая ехала во ВСЕ банки сразу — с пулом это гнуло бы и живую руку. */
function scheduleBend(owner, points, baseFreq, secPerBeat){
  const v=leadHold[owner]; if(!v)return; const b=v.banks[v.ins]; if(!b)return;
  const t0=AC.currentTime;
  for(const pt of points){
    const f=baseFreq*Math.pow(2,pt.c/1200), at=t0+pt.dt*secPerBeat;
    b.setFreq(f,at);
  }
}
/* Снять расписанные рампы частоты (на атаке переигранной ноты, ctx): чтобы бенд предыдущей
   ноты не перетёк в следующую. Живой путь (без ctx) не зовёт — живой звук не трогаем.
   Тоже пер-голосово: отмена в чужом голосе оборвала бы чужой бенд. */
function leadCancel(owner){ const v=leadHold[owner]; if(!v)return; const b=v.banks[v.ins];
  if(b&&b.cancel)b.cancel(AC.currentTime); }
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
  initAudio, AC, setLeadInstr, applyFx, applyExpr, scheduleBend, leadCancel, metroClick,
  leadOn, leadSet, leadOff, leadAllOff, leadHold,   // соло — пул с владельцами (было: моно noteOn/noteOff/applyParams)
  chordOn, chordGlide, chordOff, chordHold,
  setBassInstr, bassOn, bassSet, bassOff, bassHold, drumHit, setDrumKit, droneOn, droneOff,
  LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_NAMES, DRUM_ROWS, DRUM_KITS, createRecordingTap,
};
