import { scaleIdx, tonic, seventh, aRef, rectPref, tunedFrom } from './state.js';   // tunedFrom — P3 «строй от»: читает ТОЛЬКО scaleView (CUR)
import { t, L } from './i18n.js';   // t — для regWord (слово-регистр); L — для свар/шрути в swaraLbl (имена ладов/групп резолвят L() на стороне рисующих)

export const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ROMAN=['I','II','III','IV','V','VI','VII'];
export const OCT_ROMAN=['I','II','III','IV'];
export const range=n=>Array.from({length:n},(_,i)=>i);

/* ТРАДИЦИИ (ось 1 UI-MAP) — «в каком музыкальном мире я». Меню строя выбирает секцию, меню лада
   показывает только её лады. Порядок этого списка = порядок секций в UI (его И правим при разметке).
   РАЗДЕЛЫ ОБЕЩАЮТ ЗВУЧАНИЕ, А НЕ МЕХАНИЗМ. Раньше секции мешали разные основания (культурные
   «Индийская»/«Арабская», математические «Неоктавные», структурные «Ладовая», свалка «Мировые») —
   человек же выбирает лад по тому, КАК он зазвучит. Новые шесть секций — по КУЛЬТУРЕ / звуковому
   характеру:
     common  — «Привычное»: 12-TET (мажор/минор/лады/пентатоники/блюз/хроматика) — куда попадает новичок;
     mideast — «Ближний Восток»: арабские макамы (24-TET); позже турецкие макамы;
     india   — «Индия»: сетка 22 шрути + раги (раги ВЫБИРАЮТ ноты из сетки — потому две группы);
     easia   — «Ява и Дальний Восток»: яванский гамелан + японские и дальневосточные пентатоники;
     europe  — «Европа историческая»: строи/темперации (как настроены ноты, не какие выбраны) —
               ОТДЕЛЬНАЯ секция, а не подгруппа: темперация и лад — разные вещи;
     exp     — «Эксперименты»: равные EDO (19/31), Партч, Болен–Пирс, Карлос — честное имя для нарочно странного.
   ПРАВИЛО РАЗМЕЩЕНИЯ (для будущих ладов): новый лад идёт в секцию по его КУЛЬТУРЕ или ЗВУКОВОМУ
   характеру. НЕ заводить общий «прочее»-бакет — именно он и сделал «Мировые» бесполезными; если новая
   традиция не влезает, добавить ей СВОЮ географическую секцию. Порядок ГРУПП внутри секции fillScales
   берёт по ПЕРВОМУ появлению в SCALES (массив НЕ трогаем), порядок СЕКЦИЙ — из этого списка. */
export const TRADITIONS=[
  {id:'common', name:{en:'Familiar',            ru:'Привычное'}},
  {id:'mideast',name:{en:'Middle East',         ru:'Ближний Восток'}},
  {id:'india',  name:{en:'India',               ru:'Индия'}},
  {id:'easia',  name:{en:'Java & the Far East', ru:'Ява и Дальний Восток'}},
  {id:'europe', name:{en:'Historical Europe',   ru:'Европа историческая'}},
  {id:'exp',    name:{en:'Experiments',         ru:'Эксперименты'}},
];
/* ЛОКАЛИЗУЕМЫЕ ПОДПИСИ ПОДГРУПП (grp). Лад ссылается: grp:GRP.diatonic + стабильный grpKey (по нему
   fillScales раскладывает корзины — не зависит от языка; L(GRP.x) даёт подпись). Один ярлык — один
   объект, без повторения литерала на каждом ладе. */
export const GRP={
  diatonic:     {en:'Diatonic',             ru:'Диатоника'},
  modes:        {en:'Modes',                ru:'Лады (моды)'},
  ethnic:       {en:'Ethnic',               ru:'Этнические'},
  pentaBlues:   {en:'Pentatonic / blues',   ru:'Пентатоника / блюз'},
  chromatic:    {en:'Chromatic',            ru:'Хроматика'},
  symmetric:    {en:'Symmetric',            ru:'Симметричные'},
  exotic:       {en:'Exotic',               ru:'Экзотические'},
  worldPenta:   {en:'World pentatonics',    ru:'Мировые пентатоники'},
  maqamat:      {en:'Maqamat',              ru:'Макамы'},
  fullGrid:     {en:'Full grid',            ru:'Полная сетка'},
  ragas:        {en:'Ragas',                ru:'Раги'},
  fareastPenta: {en:'Far East pentatonics', ru:'Пентатоники Дальнего Востока'},
  gamelan:      {en:'Javanese gamelan',     ru:'Яванский гамелан'},
  japanese:     {en:'Japanese',             ru:'Японские'},
};

/* Каждый лад: edo — на сколько равных шагов делится ПЕРИОД (октава, если нет period; у Болена–Пирса — тритава, у Карлос — квинта),
   iv — ступени лада в этих шагах; у центового лада (cents) edo и iv — лишь НОМИНАЛЬНАЯ структура (число ступеней, ряды), а высоту
   ступени задают центы. tag — семейство (для аккордов), trad — традиция (меню строя), grp — подгруппа внутри традиции (пусто = без
   подзаголовка). T0: id — СТАБИЛЬНЫЙ идентификатор лада, tuning — id его строя (TUNINGS, ниже SCALES); sel/root выводятся при загрузке.
   ПОРЯДОК МАССИВА НЕ МЕНЯТЬ и новые лады добавлять В КОНЕЦ: индекс — это scaleIdx,
   на него смотрят state и sameDegrees. Меню фильтрует по trad, а не по порядку. */
/* ⛳ ТАБЛИЦЫ СТРОЁВ (слайс T0 универсальной модели строя, HANDOFF «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ») — высоты НЕРАВНЫХ строёв
   в центах над нулевой высотой строя, ОДНИМ литералом на строй. Их читают и запись строя в TUNINGS (ниже SCALES), и лады,
   которые САМИ ЕСТЬ этот строй целиком (cents:TBL.x): числа те же, что стояли в ладу литералом, — высота не изменилась ни на бит.
   Лады-ВЫБОРКИ (раги, патеты) держат свои центы как прежде; их выборка в строе-родителе ВЫВОДИТСЯ из этих чисел (modeDerive). */
const TBL={
  slendro:[0,231,474,717,955],
  pelog:[0,120,258,539,675,785,943],
  partch43:[0,21.51,53.27,84.47,111.73,150.64,165.0,182.4,203.91,231.17,266.87,294.13,315.64,
           347.41,386.31,417.51,435.08,470.78,498.04,519.55,551.32,582.51,617.49,648.68,680.45,
           701.96,729.22,764.92,782.49,813.69,852.59,884.36,905.87,933.13,968.83,996.09,1017.6,
           1035.0,1049.36,1088.27,1115.53,1146.73,1178.49],
  pythagorean12:[0,90.22,203.91,294.13,407.82,498.04,611.73,701.96,792.18,905.87,996.09,1109.78],
  ji12:[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27],
  meantone:[0,76.05,193.16,310.26,386.31,503.42,579.47,696.58,772.63,889.74,1006.84,1082.89],
  shruti22:[0,90,112,182,204,294,316,386,408,498,520,590,612,702,792,814,884,906,996,1018,1088,1110],
  werckmeister3:[0,90.22,192.18,294.13,390.22,498.04,588.27,696.09,792.18,888.27,996.09,1092.18],
  vallotti:[0,94.13,196.09,298.04,392.18,501.96,592.18,698.04,796.09,894.13,1000,1090.22],
  kirnberger3:[0,90.22,193.16,294.13,386.31,498.04,590.22,696.58,792.18,889.74,996.09,1088.27],
};
export const SCALES=[
 {id:'major', tuning:'edo12', name:{en:'Major (Ionian)', ru:'Мажор (ионийский)'},            trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,4,5,7,9,11], tag:'dia'},
 {id:'natural-minor', tuning:'edo12', name:{en:'Natural minor (Aeolian)', ru:'Минор натуральный (эолийский)'},trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,3,5,7,8,10], tag:'dia'},
 {id:'harmonic-minor', tuning:'edo12', name:{en:'Harmonic minor', ru:'Гармонический минор'},          trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,3,5,7,8,11], tag:'dia'},
 {id:'melodic-minor', tuning:'edo12', name:{en:'Melodic minor', ru:'Мелодический минор'},           trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,3,5,7,9,11], tag:'dia'},
 {id:'dorian', tuning:'edo12', name:{en:'Dorian', ru:'Дорийский'},                    trad:'common', grp:GRP.modes, grpKey:'modes',        edo:12, iv:[0,2,3,5,7,9,10], tag:'dia'},
 {id:'phrygian', tuning:'edo12', name:{en:'Phrygian', ru:'Фригийский'},                   trad:'common', grp:GRP.modes, grpKey:'modes',        edo:12, iv:[0,1,3,5,7,8,10], tag:'dia'},
 {id:'lydian', tuning:'edo12', name:{en:'Lydian', ru:'Лидийский'},                    trad:'common', grp:GRP.modes, grpKey:'modes',        edo:12, iv:[0,2,4,6,7,9,11], tag:'dia'},
 {id:'mixolydian', tuning:'edo12', name:{en:'Mixolydian', ru:'Миксолидийский'},               trad:'common', grp:GRP.modes, grpKey:'modes',        edo:12, iv:[0,2,4,5,7,9,10], tag:'dia'},
 {id:'locrian', tuning:'edo12', name:{en:'Locrian', ru:'Локрийский'},                   trad:'common', grp:GRP.modes, grpKey:'modes',        edo:12, iv:[0,1,3,5,6,8,10], tag:'dia'},
 {id:'hungarian-minor', tuning:'edo12', name:{en:'Hungarian minor', ru:'Венгерский минор'},             trad:'common', grp:GRP.ethnic, grpKey:'ethnic',         edo:12, iv:[0,2,3,6,7,8,11], tag:'ethnic'},
 {id:'major-penta', tuning:'edo12', name:{en:'Major pentatonic', ru:'Мажорная пентатоника'},         trad:'common', grp:GRP.pentaBlues, grpKey:'pentaBlues', edo:12, iv:[0,2,4,7,9],      tag:'penta'},
 {id:'minor-penta', tuning:'edo12', name:{en:'Minor pentatonic', ru:'Минорная пентатоника'},         trad:'common', grp:GRP.pentaBlues, grpKey:'pentaBlues', edo:12, iv:[0,3,5,7,10],     tag:'penta'},
 {id:'blues', tuning:'edo12', name:{en:'Blues (with ♭5)', ru:'Блюз (с ♭5)'},                  trad:'common', grp:GRP.pentaBlues, grpKey:'pentaBlues', edo:12, iv:[0,3,5,6,7,10],   tag:'blues'},
 {id:'chromatic', tuning:'edo12', name:{en:'Chromatic (12 notes)', ru:'Хроматика (12 нот)'},           trad:'common', grp:GRP.chromatic, grpKey:'chromatic',                   edo:12, iv:range(12),        tag:'chrom', typedChords:'chrom12'},
 {id:'maqam-rast', tuning:'edo24', name:{en:'Maqam Rast (quarter-tones)', ru:'Макам Раст (¼-тоны)'},          trad:'mideast',  grp:GRP.maqamat, grpKey:'maqamat',             edo:24, iv:[0,4,7,10,14,18,21], tag:'maqam', noChords:true},
 {id:'maqam-bayati', tuning:'edo24', name:{en:'Maqam Bayati (quarter-tones)', ru:'Макам Баяти (¼-тоны)'},         trad:'mideast',  grp:GRP.maqamat, grpKey:'maqamat',             edo:24, iv:[0,3,6,10,14,16,20], tag:'maqam', noChords:true},
 {id:'edo19-full', tuning:'edo19', name:{en:'19-TET — full tuning', ru:'19-TET — весь строй'},          trad:'exp', grp:'',                   edo:19, iv:range(19),        tag:'edo',
   chord:[1, 6/5, 3/2], chord7:[1, 6/5, 3/2, 9/5], typedChords:'edo19', rectGrid:true},   // мин.терция 5ш (+0.2¢), кв.11, мал.7 16ш (−7¢)
 {id:'edo31-full', tuning:'edo31', name:{en:'31-TET — full tuning', ru:'31-TET — весь строй'},          trad:'exp', grp:'',                   edo:31, iv:range(31),        tag:'edo',
   chord:[1, 5/4, 3/2], chord7:[1, 5/4, 3/2, 7/4], typedChords:'edo31', rectGrid:true},   // маж.терция 10ш (+0.8¢), кв.18, нат.7 25ш (−1.1¢) = 4:5:6:7
 /* Хиджаз: джинс Хиджаз (0-1-4-5 полутонов, характерная увеличенная секунда 2→8
    в четвертях) + джинс Нахаванд сверху. Четвертитонов НЕ содержит — отсюда имя без
    пометки «¼-тоны», хотя традиция та же, 24-TET. Добавлен В КОНЕЦ: индексы не поехали. */
 {id:'maqam-hijaz', tuning:'edo24', name:{default:'Maqam Hijaz', ru:'Макам Хиджаз'}   /* арабская романизация Hijaz; турецкая — Hicaz (строй тут арабский, 24-TET) */,                 trad:'mideast',  grp:GRP.maqamat, grpKey:'maqamat',             edo:24, iv:[0,2,8,10,14,16,20], tag:'maqam', noChords:true},
 /* Мажоры с пониженной VI — пара к гармоническому/мелодическому минору: ♭VI даёт
    увеличенное трезвучие на VI ступени (qual: 4+8 → «+»), ради него их и берут.
    Добавлены В КОНЕЦ (индексы не поехали), а в меню встают внутрь группы «Диатоника»
    к минорам — порядок в выпадашке задаёт fillScales группировкой по grp, не массивом. */
 {id:'harmonic-major', tuning:'edo12', name:{en:'Harmonic major', ru:'Гармонический мажор'},          trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,4,5,7,8,11], tag:'dia'},
 {id:'melodic-major', tuning:'edo12', name:{en:'Melodic major', ru:'Мелодический мажор'},           trad:'common', grp:GRP.diatonic, grpKey:'diatonic',          edo:12, iv:[0,2,4,5,7,8,10], tag:'dia'},
 /* Симметричные и экзотические 12-TET лады. tag:'ethnic' → аккорды наслоением терций по
    индексу (isTert), спец-ветки НЕ нужны: целотоновая сама даёт увеличенные трезвучия,
    октатоники — уменьшённые (°/°7). Плотные лады (Мессиан-3, Прометеев) на части
    ступеней дают «?» в подписи аккорда — это косметика, звучит и пишется верно.
    Добавлены В КОНЕЦ (индексы 21..28 не поехали), в меню — две новые группы grp. */
 {id:'whole-tone', tuning:'edo12', name:{en:'Whole-tone', ru:'Целотоновая'},              trad:'common', grp:GRP.symmetric, grpKey:'symmetric', edo:12, iv:[0,2,4,6,8,10],        tag:'ethnic'},
 {id:'octatonic-wh', tuning:'edo12', name:{en:'Octatonic (whole-half)', ru:'Октатоника (тон-полутон)'}, trad:'common', grp:GRP.symmetric, grpKey:'symmetric', edo:12, iv:[0,2,3,5,6,8,9,11],    tag:'ethnic'},
 {id:'octatonic-hw', tuning:'edo12', name:{en:'Octatonic (half-whole)', ru:'Октатоника (полутон-тон)'}, trad:'common', grp:GRP.symmetric, grpKey:'symmetric', edo:12, iv:[0,1,3,4,6,7,9,10],    tag:'ethnic'},
 {id:'messiaen-3', tuning:'edo12', name:{en:'Messiaen mode 3', ru:'Мессиан, мод 3'},           trad:'common', grp:GRP.symmetric, grpKey:'symmetric', edo:12, iv:[0,2,3,4,6,7,8,10,11], tag:'ethnic'},
 {id:'phrygian-dominant', tuning:'edo12', name:{en:'Phrygian dominant', ru:'Фригийский доминантный'},   trad:'common', grp:GRP.exotic, grpKey:'exotic', edo:12, iv:[0,1,4,5,7,8,10],      tag:'ethnic'},
 {id:'double-harmonic', tuning:'edo12', name:{en:'Double harmonic', ru:'Двойной гармонический'},    trad:'common', grp:GRP.exotic, grpKey:'exotic', edo:12, iv:[0,1,4,5,7,8,11],      tag:'ethnic'},
 {id:'enigmatic', tuning:'edo12', name:{en:'Enigmatic (Verdi)', ru:'Энигматическая (Верди)'},   trad:'common', grp:GRP.exotic, grpKey:'exotic', edo:12, iv:[0,1,4,6,8,10,11],     tag:'ethnic'},
 {id:'prometheus', tuning:'edo12', name:{en:'Prometheus (Scriabin)', ru:'Прометеевский (Скрябин)'},  trad:'common', grp:GRP.exotic, grpKey:'exotic', edo:12, iv:[0,2,4,6,9,10],        tag:'ethnic'},
 /* Мировые пентатоники. tag:'penta' → аккорды пауэр (корень+квинта+октава, ветка
    chordSteps без isTert), спец-веток НЕ нужно; на 5-6 нотах терции дают кашу, потому
    пауэр. Ни у одной нет noChords. Блюзовая мажорная берёт СУЩЕСТВУЮЩУЮ группу
    'Пентатоника / блюз' (строка 1-в-1 как у Мажорной/Минорной/Блюза) — в меню встаёт
    внутрь неё, а не отдельной группой. Добавлены В КОНЕЦ (индексы 29..35 не поехали). */
 {id:'egyptian', tuning:'edo12', name:{en:'Egyptian (suspended)', ru:'Египетская (суспенд.)'},   trad:'common', grp:GRP.worldPenta, grpKey:'worldPenta', edo:12, iv:[0,2,5,7,10], tag:'penta'},
 {id:'man-gong', tuning:'edo12', name:{en:'Man Gong (Chinese)', ru:'Ман гонг (китайская)'}   /* «Man Gong» — имя из ЗАПАДНЫХ сводов ладов, приписываемое китайской музыке (пентатоника 1-♭3-4-♭6-♭7, она же блюзовая минорная). КАНОНИЧЕСКИЕ китайские лады зовутся Gong/Shang/Jue/Zhi/Yu — честная оговорка, как с именами шрути */,    trad:'easia', grp:GRP.fareastPenta, grpKey:'fareastPenta', edo:12, iv:[0,3,5,8,10], tag:'penta'},
 {id:'ritusen', tuning:'edo12', name:{default:'Ritusen', ru:'Ритусэн'}   /* Ritusen — написание из сводов ладов (пентатоника 1-2-4-5-6, блюзовая мажорная; связывают с рагой Дурга); от японского лада рицу (律) — тоже компиляционное имя */,                 trad:'easia', grp:GRP.fareastPenta, grpKey:'fareastPenta', edo:12, iv:[0,2,5,7,9],  tag:'penta'},
 {id:'hungarian-penta', tuning:'edo12', name:{en:'Hungarian pentatonic', ru:'Венгерская пентатоника'},  trad:'common', grp:GRP.worldPenta, grpKey:'worldPenta', edo:12, iv:[0,3,5,6,9],  tag:'penta'},
 {id:'scriabin-penta', tuning:'edo12', name:{en:'Scriabin pentatonic', ru:'Скрябинская пентатоника'}, trad:'common', grp:GRP.worldPenta, grpKey:'worldPenta', edo:12, iv:[0,2,4,7,10], tag:'penta'},
 {id:'kumoi-western', tuning:'edo12', name:{en:'Kumoi (Western)', ru:'Кумои (зап.)'},            trad:'easia', grp:GRP.fareastPenta, grpKey:'fareastPenta', edo:12, iv:[0,1,5,7,8],  tag:'penta'},
 {id:'major-blues', tuning:'edo12', name:{en:'Major blues', ru:'Блюзовая мажорная'},       trad:'common', grp:GRP.pentaBlues, grpKey:'pentaBlues',  edo:12, iv:[0,2,3,4,7,9], tag:'penta'},
 /* Макамы (24-TET). trad:'mideast', tag:'maqam', noChords:true — как у Раст/Баяти/Хиджаз:
    аккордов нет (роль «Аккорды» показывает подсказку, гейт supportsChords). Все десять
    (три прежних + семь новых) сведены в одну подгруппу grp:GRP.maqamat, grpKey:'maqamat' — строка 1-в-1,
    иначе бакеты бы разъехались. Добавлены В КОНЕЦ (индексы 36..42 не поехали). */
 {id:'maqam-saba', tuning:'edo24', name:{default:'Maqam Saba', ru:'Макам Саба'},                              trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,3,6,8,14,16,20],  tag:'maqam', noChords:true},
 {id:'maqam-sikah', tuning:'edo24', name:{default:'Maqam Sikah', ru:'Макам Сикях'}   /* арабская Sikah; турецко-персидская — Segah */,                             trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,3,7,11,14,17,21], tag:'maqam', noChords:true},
 {id:'maqam-nahawand', tuning:'edo24', name:{en:'Maqam Nahawand (tuned like natural minor)', ru:'Макам Нахаванд (строй как у натур. минора)'}, trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,4,6,10,14,16,20], tag:'maqam', noChords:true},
 {id:'maqam-kurd', tuning:'edo24', name:{en:'Maqam Kurd (tuned like Phrygian)', ru:'Макам Курд (строй как у фригийского)'},     trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,2,6,10,14,16,20], tag:'maqam', noChords:true},
 {id:'maqam-ajam', tuning:'edo24', name:{en:'Maqam Ajam (tuned like major)', ru:'Макам Аджам (строй как у мажора)'},         trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,4,8,10,14,18,22], tag:'maqam', noChords:true},
 {id:'maqam-nikriz', tuning:'edo24', name:{default:'Maqam Nikriz', ru:'Макам Никриз'},                            trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,4,6,12,14,18,20], tag:'maqam', noChords:true},
 {id:'maqam-nawa-athar', tuning:'edo24', name:{default:'Maqam Nawa Athar', ru:'Макам Нава Атар'}   /* встречается и слитно — Nawathar */,                          trad:'mideast', grp:GRP.maqamat, grpKey:'maqamat', edo:24, iv:[0,4,6,12,14,16,22], tag:'maqam', noChords:true},
 /* Мировые строи — НЕравномерные лады через поле cents (центы каждой ступени от тоники,
    length===iv.length). Высоту берёт leadFreq/bassFreq из cents, структуру (число ступеней,
    сетка, ряды) — из edo/iv. Слендро: приближение яванского гамелана, шаги неравные
    (2-я ступень 231¢, не 240¢ равной пентатоники). noChords: терции гамелану чужды. */
 {id:'slendro', tuning:'slendro', name:{en:'Slendro (Javanese gamelan, approx.)', ru:'Слендро (яван. гамелан, приближение)'}, trad:'easia', grp:GRP.gamelan, grpKey:'gamelan', edo:5, iv:[0,1,2,3,4],
    cents:TBL.slendro, tag:'penta', noChords:true},
 {id:'pelog', tuning:'pelog', name:{en:'Pelog (Javanese gamelan, approx.)', ru:'Пелог (яван. гамелан, приближение)'}, trad:'easia', grp:GRP.gamelan, grpKey:'gamelan', edo:7,
    iv:[0,1,2,3,4,5,6], cents:TBL.pelog, tag:'penta', noChords:true},
 /* Японские пентатоники (12-TET). tag:'penta' → пауэр-аккорды (ветка chordSteps без isTert).
    Ин намеренно совпадает по iv с 'Кумои (зап.)' из мировых пентатоник — это разные лады
    по имени/группе, общий iv безвреден (state по scaleIdx, луп по ссылке на sc).
    Добавлены В КОНЕЦ (индексы 45..48 не поехали), в меню — новая группа grp 'Японские'. */
 {id:'hirajoshi', tuning:'edo12', name:{default:'Hirajoshi', ru:'Хирадзёси'},                          trad:'easia', grp:GRP.japanese, grpKey:'japanese', edo:12, iv:[0,2,3,7,8],  tag:'penta'},
 {id:'kumoi-japanese', tuning:'edo12', name:{en:'Kumoi (Japanese)', ru:'Кумои (яп.)'},                        trad:'easia', grp:GRP.japanese, grpKey:'japanese', edo:12, iv:[0,2,3,7,9],  tag:'penta'},
 {id:'in-insen', tuning:'edo12', name:{en:'In (Insen; same as Kumoi Western)', ru:'Ин (Инсэн; совпадает с Кумои зап.)'}, trad:'easia', grp:GRP.japanese, grpKey:'japanese', edo:12, iv:[0,1,5,7,8],  tag:'penta'},
 {id:'iwato', tuning:'edo12', name:{default:'Iwato', ru:'Ивато'},                              trad:'easia', grp:GRP.japanese, grpKey:'japanese', edo:12, iv:[0,1,5,6,10], tag:'penta'},
 /* Партч (Harry Partch, «Genesis of a Music») — 43-тоновая ЧИСТАЯ ИНТОНАЦИЯ (11-предельный
    тональный ромб). Центы посчитаны из канонических отношений (ниже); 2 знака сохраняют JI
    точно (в отличие от целочисленных приближений гамелана). Октава = 2/1 (тождество Партча),
    регистр 2^oct не трогаем — строй ОКТАВО-повторяющийся. typedChords:'partch': аккорды из
    ЧИСТЫХ ОТНОШЕНИЙ (11-предел, палитра О/У/Станд./Sus-11) — chordFreqs через cents-ветку
    множит корень на ratio напрямую, минуя 2^(шаг/edo). rectGrid: 43+1=44, 44/4=11 прямоугольников
    (кратность 4 держится). tag:'ji' — не 'edo'/'penta': шаговых аккордов не строит, как равный EDO не читается.
    Отношения: 1/1 81/80 33/32 21/20 16/15 12/11 11/10 10/9 9/8 8/7 7/6 32/27 6/5 11/9 5/4
    14/11 9/7 21/16 4/3 27/20 11/8 7/5 10/7 16/11 40/27 3/2 32/21 14/9 11/7 8/5 18/11 5/3
    27/16 12/7 7/4 16/9 9/5 20/11 11/6 15/8 40/21 64/33 160/81. Добавлен В КОНЕЦ (индекс 49). */
 {id:'partch-43', tuning:'partch43', name:{en:'Partch (43 tones, just intonation)', ru:'Партч (43 тона, чистая интонация)'}, trad:'exp', grp:'', edo:43, iv:range(43),
    cents:TBL.partch43,
    tag:'ji', typedChords:'partch', rectGrid:true},
 /* Болен–Пирс — НЕОКТАВНЫЙ строй: период не октава (2:1), а ТРИТАВА (3:1). 13 РАВНЫХ шагов
    3^(1/13) ≈ 146.3¢, полная тритава = 1901.955¢. РАВНОМЕРНЫЙ внутри периода (как 19/31-TET
    внутри октавы) — НЕ cents-лад: свойство period:3 заменяет зашитую октаву в формуле высоты
    (periodOf: leadFreq/bassFreq берут P^oct и P^(шаг/edo)). Регистр (палец, 0..3) сдвигает на
    ТРИТАВУ. typedChords:'bp': аккорды подгруппы 3.5.7 (палитра Мажор/Минор/Характерные) — не
    шаги edo, а ЧИСТЫЕ ОТНОШЕНИЯ; chordFreqs через period-ветку (P!==2 && ty) берёт корень
    равным шагом (P^(iv/edo)) и множит на ratio напрямую. Строй Карлос — позже. НЕ rect: (13+1)=14
    не делится на 4, rectGrid нельзя. tag:'bp' — инертен у всех читателей (не 'edo'/'penta'/терции). Индекс 50. */
 {id:'bohlen-pierce', tuning:'bp13', name:{en:'Bohlen–Pierce (13 equal, tritave)', ru:'Болен–Пирс (13 равных, тритава)'}, trad:'exp', grp:'', edo:13, iv:range(13),
    period:3, tag:'bp', typedChords:'bp'},
 /* Строи Уэнди Карлос — НЕОКТАВНЫЕ: у них НЕТ интервала эквивалентности вовсе. Карлос вывела их,
    поделив чистую КВИНТУ 3:2 на РАВНЫЕ части (alpha=9, beta=11, gamma=20) — не октаву. Моделируем
    period:3/2 (квинта-генератор) + edo=число делений + РАВНЫЕ шаги (period^(iv/edo), НЕ cents-лад):
    деление чистой квинты воспроизводит опубликованный шаг Карлос до <0.02¢ (alpha 77.995 vs 78.0,
    beta 63.814 vs 63.8, gamma 35.098 vs 35.1) — неслышимо. Регистр (палец) сдвигает на КВИНТУ (P^oct).
    noChords (стадия 1): аккорды Карлос — позже. НЕ rect: у неоктавного лада ЗАКРЫТАЯ форма (+1,
    верхняя тоника) не предлагается по построению (см. rectPad), а открытая требует iv.length%4===0 —
    у alpha 9 и beta 11 не делится. Прямоугольники им НЕДОСТУПНЫ, и это не выбор данных, а арифметика
    (у beta 11+1=12 делится СЛУЧАЙНО — период-гейт и не пускает её через закрытую форму). tag:'carlos' — инертен у всех
    читателей tag (как 'bp': не 'dia'/'ethnic'/'maqam'/'edo'). Индексы 51/52/53. */
 {id:'carlos-alpha', tuning:'carlos-alpha', name:{en:'Carlos Alpha (9 steps of the fifth)', ru:'Карлос альфа (9 шагов квинты)'},  trad:'exp', grp:'', edo:9,  iv:range(9),  period:3/2, tag:'carlos', noChords:true},
 {id:'carlos-beta', tuning:'carlos-beta', name:{en:'Carlos Beta (11 steps of the fifth)', ru:'Карлос бета (11 шагов квинты)'},  trad:'exp', grp:'', edo:11, iv:range(11), period:3/2, tag:'carlos', noChords:true},
 {id:'carlos-gamma', tuning:'carlos-gamma', name:{en:'Carlos Gamma (20 steps of the fifth)', ru:'Карлос гамма (20 шагов квинты)'}, trad:'exp', grp:'', edo:20, iv:range(20), period:3/2, tag:'carlos', noChords:true, rectGrid:true},
 /* Патеты пелога — 5-нотные ЛАДЫ, выбранные из 7-нотного пелога (те же cents-ступени, что у
    «Пелог» выше): Лима и Нем берут ступени 1-2-3-5-6, Баранг — 2-3-5-6-7 (нормирован от своей
    тоники, −120¢). Центы — ПРИБЛИЖЕНИЕ (у яванского гамелана нет эталона — та же оговорка, что
    у Слендро/Пелог); октаву 2:1 дописывает механизм; noChords (гамелан монофоничен). ВАЖНО: Лима
    и Нем — ОДНИ И ТЕ ЖЕ ноты (обе на 1-2-3-5-6); различаются функцией/тоникой в традиции, не
    строем — держим двумя именованными записями НАРОЧНО (как две Кумои / Ин), это НЕ дубликат-баг.
    Баранг (2-3-5-6-7) — по-настоящему другой набор. Индексы 54/55/56, добавлены В КОНЕЦ. */
 {id:'pelog-lima', tuning:'pelog', name:{en:'Pelog patet Lima (Javanese, approx.)', ru:'Пелог патет лима (яван., прибл.)'},   trad:'easia', grp:GRP.gamelan, grpKey:'gamelan', edo:5, iv:range(5), cents:[0,120,258,675,785], tag:'penta', noChords:true},
 {id:'pelog-nem', tuning:'pelog', name:{en:'Pelog patet Nem (Javanese, approx.)', ru:'Пелог патет нем (яван., прибл.)'},    trad:'easia', grp:GRP.gamelan, grpKey:'gamelan', edo:5, iv:range(5), cents:[0,120,258,675,785], tag:'penta', noChords:true},
 {id:'pelog-barang', tuning:'pelog', name:{en:'Pelog patet Barang (Javanese, approx.)', ru:'Пелог патет баранг (яван., прибл.)'}, trad:'easia', grp:GRP.gamelan, grpKey:'gamelan', edo:5, iv:range(5), cents:[0,138,555,665,823], tag:'penta', noChords:true},
 /* Пифагоров строй — 12 нот из цепочки ЧИСТЫХ квинт 3/2 (показатели −5..+6), свёрнутых в октаву.
    Квинты по построению ПРАКТИЧЕСКИ ЧИСТЫЕ (701.96¢), но большая терция 81/64 = 407.82¢ — ОСТРАЯ,
    на 22¢ выше чистой 5/4 (386.31¢): отсюда средневековое письмо параллельными квинтами и позднейшая
    нужда в темперациях. Cents-механизм даёт точную высоту (2^(центы/1200)); октаву 2:1 дописывает
    сам механизм. ⛳ P2 дуги «СТРОЙ ОТ» (решение пользователя: «Пифагоров строй должен звучать как Пифагоров строй; аккордов
    из других строёв в нём быть не должно»): аккорды — ИЗ СОБСТВЕННЫХ НОТ ИНСТРУМЕНТА, как у прочих темпераций: typedChords:'natfix'
    (те же 24 типа, целые полутоновые смещения) + gridChords:true — chordNotes берёт корень и КАЖДЫЙ тон аккорда из сетки строя.
    Нота, попавшая на волчью квинту, звучит так, как её даёт инструмент, — без особого случая (как у фиксированного Натурального и
    мезотона). Прежний набор чистых отношений 'pyth' удалён (P2): кроме этого лада им не пользовался никто.
    ⛳ P3: tunable:true — у этого лада есть выбор «СТРОЙ ОТ» (нота, от которой строится цепочка квинт; по умолчанию СЛЕДУЕТ
    ЗА ТОНИКОЙ — state.tunedFrom), и живой лад приходит ВИДОМ на свой якорь (scaleView ниже; с T2 — у каждого лада). Сам объект SCALES[57] без варианта
    — настроен ОТ C (anchorOf → 0): на нём строит свою сцену демо стартового экрана. Натуральный (чистые терции, но фальшивые
    квинты) — контрапара. trad:'europe' (секция
    «Европа историческая», grp:'' — плоский хронологический список, а не подгруппа): секция ПРО РАЗНЫЕ
    СТРОИ ОДНИХ И ТЕХ ЖЕ 12 НОТ (темперация ≠ лад), а НЕ утверждение, будто макам/гамелан «менее
    историчны» — те живут в своих секциях. Сюда же Натуральный/мезотон/велл-темперации, по времени сверху
    вниз. tag:'penta' — инертный (как у Слендро/Пелог: не 'dia'/'ethnic'/'maqam'/'edo'). Индекс 57, В КОНЕЦ. */
 {id:'pythagorean', tuning:'pythagorean12', name:{en:'Pythagorean tuning (pure fifths)', ru:'Пифагоров строй (чистые квинты)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.pythagorean12, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true, tunable:true},
 /* Натуральный строй, ПОДВИЖНЫЙ (хор/струнные) — 5-предельная ЧИСТАЯ ИНТОНАЦИЯ: интервалы суть простые
    целочисленные отношения прямо из обертонового ряда (16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3,
    9/5, 15/8). Большая терция 5/4 = 386.31¢ — ЧИСТАЯ (замок 4:5:6, без биения), в отличие от резкой
    пифагоровой 81/64 = 407.82¢: обе терции расходятся на СИНТОНИЧЕСКУЮ КОММУ (21.5¢), а квинты одинаковы
    (обе чистые 3/2). typedChords:'nat' — КАЖДЫЙ аккорд строится ЧИСТЫМ отношением ОТ СВОЕГО КОРНЯ
    (chordFreqs·cents-ветка root·ratio), поэтому пуст волка НЕТ ни на одном корне — модель хора/квартета,
    что подстраивает каждый аккорд на лету («подвижная» чистая интонация). Пара к ФИКСИРОВАННОМУ ниже
    (клавесин): те же 12 нот, но там аккорды берутся из ЗАСТЫВШЕЙ сетки → волк. Контрапара к Пифагорову.
    tag:'penta' — инертный. Индекс 58. */
 {id:'ji-adaptive', tuning:'ji12', name:{en:'Just intonation (adaptive, choir)', ru:'Натуральный строй (подвижный, хор)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.ji12, tag:'penta', typedChords:'nat'},
 /* Натуральный строй, ФИКСИРОВАННЫЙ (клавесин/орган) — ТЕ ЖЕ 12 нот (cents 1-в-1 с подвижным выше),
    настроенные ОДИН РАЗ от тоники. Но аккорды берут ноты ИЗ ЗАСТЫВШЕЙ СЕТКИ (typedChords:'natfix' —
    ЦЕЛЫЕ полутоновые смещения; gridChords:true гонит chordFreqs в grid-ветку, читающую ступень корень+off
    из cents-сетки). Оттого интервалы МЕЖДУ нотами сетки — какие даст фиксированный строй: чистые на одних
    корнях (мажор 0,1,3,5,7,8), ВОЛК на других (квинта −21.5¢ на 2,10 и +19.5¢ на 6; терции ±41¢) — ровно
    ПОЧЕМУ и придумали темперации. Разметки «волк» в UI НЕТ намеренно: учит ухо, не подпись. Пара к
    подвижному выше — переключи на ОДНОМ аккорде и услышь разницу. tag:'penta' — инертный. Индекс 59, В КОНЕЦ. */
 {id:'ji-fixed', tuning:'ji12', name:{en:'Just intonation (fixed, harpsichord)', ru:'Натуральный строй (фиксированный, клавесин)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.ji12, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true},
 /* Мезотон 1/4 коммы (Аарон, 1523) — ИСТОРИЧЕСКИЙ КОМПРОМИСС. Каждая квинта СУЖЕНА на 1/4 синтонической
    коммы до 696.58¢ (чистая 701.96¢), чтобы четыре квинты минус две октавы дали ЧИСТУЮ большую терцию
    386.31¢ (как в Натуральном). В отличие от фиксированного Натурального, где ошибка РАЗБРОСАНА (волк-квинты
    И терции мимо на ±41¢ на многих корнях), мезотон СОБИРАЕТ всю ошибку в ОДНУ волк-квинту (G#–Eb ≈ 737.6¢,
    ~36¢ шире чистой), оставляя терции чистыми, а квинты ровными на ~8 ходовых тональностях. Это и есть
    компромисс: пожертвовать одной тональностью, чтобы запели остальные. Замыкает линию Пифагор →
    Натуральный → Мезотон → 12-TET (Хроматика). typedChords:'natfix', gridChords:true — ФИКСИРОВАННАЯ
    клавиатура: аккорды берут ноты ИЗ СЕТКИ (grid-ветка chordFreqs), как фиксированный Натуральный; пере-
    страивать каждый аккорд чистым от корня НЕЛЬЗЯ (это стёрло бы весь смысл — вышел бы Натуральный). Разметки
    «волк» в UI НЕТ намеренно — учит ухо. tag:'penta' — инертный. Индекс 60, В КОНЕЦ. */
 {id:'meantone-quarter', tuning:'meantone-quarter', name:{en:'Quarter-comma meantone (harpsichord)', ru:'Мезотон 1/4 коммы (клавесин)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.meantone, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true},

 /* ================= ИНДИЙСКАЯ КЛАССИКА (традиция 'indian') =================
    22 ШРУТИ — микротональная сетка ЧИСТОЙ ИНТОНАЦИИ (не равные шаги!). Позиции выводятся из
    циклов чистых квинт/кварт (3/2) и чистых терций (5/4); наименьший интервал — 22¢, синтоническая
    комма. Поэтому в сетке есть комма-ПАРЫ: 386 (чистая терция 5/4) против 408 (пифагорова терция
    81/64), 90 против 112, 590 против 612, 996 против 1018 и т.д. Раги ВЫБИРАЮТ свои ноты (свары) ИЗ
    этой сетки — именно комма-выбор придаёт рагам их разный характер. Механизм тот же, что у гамелана/
    Парча: cents:[...], 2^(центы/1200); ЯДРО НЕ МЕНЯЕТСЯ. Октавные (period нет). noChords: индийская
    классика МЕЛОДИЧНА — аккордов в ней нет, это ОСОЗНАННЫЙ выбор модели, не ограничение (роль
    «Аккорды» покажет подсказку). rectGrid (=ДЕФОЛТ раскладки) НЕ ставим: у СЕТКИ 22 шрути он и
    невозможен (22+1=23 и 22 — ни то ни другое не делится на 4: единственный случай, который
    прямоугольники не спасают), а 7-нотным РАГАМ он доступен (7+1=8 → 2 прямоугольника), но по
    умолчанию они открываются узкими рядами — 7 рядов попадаются нормально; человек включит сам.
    tag:'penta' — инертный ярлык, как у прочих цент-ладов.
    ЧЕСТНОСТЬ (как «приближение» у гамелана): мы моделируем ТОЛЬКО звукоряд — КАКИЕ свары. Рага —
    БОЛЬШЕ звукоряда: у неё путь вверх/вниз (ароха/авароха, часто РАЗНЫЕ), опорные ноты (вади/самвади),
    характерные фразы (пакад) и время суток — НИЧЕГО из этого мы не моделируем. Индексы 61..71, В КОНЕЦ. */
 {id:'shruti-22', tuning:'shruti22', name:{en:'22 shruti (full grid)', ru:'22 шрути (полная сетка)'}, trad:'india', grp:GRP.fullGrid, grpKey:'fullGrid', edo:22, iv:range(22),
    cents:TBL.shruti22,
    tag:'penta', noChords:true, swaraNames:true, swaraFull:true},   // swaraNames → саргам; swaraFull → «свара · имя-шрути» (грид различает комма-пары именем, раги — только сварой)

 /* 10 известных раг — 7 свар, ВЫБРАННЫХ из сетки 22 шрути (каждое значение — член сетки). Витрины
    чистой интонации: комал-Ре Бхайрава (90 — малый шрути), тивра-Ма Йамана (590 — острая ув.кварта),
    чистые терции 386 и пифагоровы 408, чистая квинта везде 702. Только звукоряд — путь/опоры/фразы
    НЕ моделируются (см. блок выше). swaraNames:true → ряды подписаны сварами (Са/Ре/Га/Ма/Па/Дха/Ни). */
 {id:'raga-bhairav', tuning:'shruti22', name:{default:'Bhairav', ru:'Бхайрав'}   /* хиндустани: короткая форма Bhairav; встречается и Bhairava */,  trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,90,386,498,702,792,1088],  tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-yaman', tuning:'shruti22', name:{default:'Yaman', ru:'Йаман'},    trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,408,590,702,906,1110], tag:'penta', noChords:true, swaraNames:true},
 /* Кафи и Мальхар несут ОДИН И ТОТ ЖЕ звукоряд [0,204,316,498,702,906,1018] — различаются движением/
    опорами/фразами (которых мы не моделируем), а не нотами. НЕ баг-дубль, а осознанно (как две Кумои,
    как пелог лима/нем). */
 {id:'raga-kafi', tuning:'shruti22', name:{default:'Kafi', ru:'Кафи'},     trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,316,498,702,906,1018], tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-bhairavi', tuning:'shruti22', name:{default:'Bhairavi', ru:'Бхайрави'}, trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,90,294,498,702,792,996],   tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-todi', tuning:'shruti22', name:{default:'Todi', ru:'Тоди'},     trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,90,294,590,702,792,1088],  tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-khamaj', tuning:'shruti22', name:{default:'Khamaj', ru:'Кхамадж'},  trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,408,498,702,906,1018], tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-asavari', tuning:'shruti22', name:{default:'Asavari', ru:'Асавари'},  trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,294,498,702,792,996],  tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-malhar', tuning:'shruti22', name:{default:'Malhar', ru:'Мальхар'},  trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,316,498,702,906,1018], tag:'penta', noChords:true, swaraNames:true},   // тот же звукоряд, что Кафи (см. коммент выше)
 {id:'raga-purvi', tuning:'shruti22', name:{default:'Purvi', ru:'Пурви'},    trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,90,386,590,702,792,1088],  tag:'penta', noChords:true, swaraNames:true},
 {id:'raga-bilawal', tuning:'shruti22', name:{default:'Bilawal', ru:'Билавал'}   /* [0,204,386,498,702,884,1088] = натуральный мажор (JI) = тхат БИЛАВАЛ, один из 10 родительских ладов хиндустани. Раньше ошибочно значился «Мармари» (не существующая рага) */,  trad:'india', grp:GRP.ragas, grpKey:'ragas', edo:7, iv:range(7), cents:[0,204,386,498,702,884,1088],  tag:'penta', noChords:true, swaraNames:true},

 /* ================= ВЕЛЛ-ТЕМПЕРАЦИИ («хорошо темперированные» строи) =================
    НЕДОСТАЮЩЕЕ ЗВЕНО между мезотоном и 12-TET. Мезотон давал играть в ~8 тональностях и ВЫЛ в
    остальных (вся ошибка собрана в одну волк-квинту). Велл-темперации распределяют пифагорову
    комму (23.46¢) НЕРАВНОМЕРНО так, что ИГРАБЕЛЬНА КАЖДАЯ тональность, но каждая держит свою
    ОКРАСКУ: ближние тональности — почти чистые терции, дальние — резче (к пифагоровой 407.8¢).
    12-TET позже стёр характер начисто (все терции ровно 400¢, разброс 0). Именно это Бах показал,
    написав прелюдии во всех 24 тональностях. Строятся цепью квинт от C: часть квинт СУЖЕНА, сумма
    сужений = пифагорова комма (цепь замыкается). Как мезотон/фикс-Натуральный — ФИКСИРОВАННАЯ
    клавиатура: typedChords:'natfix' + gridChords:true, аккорды берут ноты ИЗ СЕТКИ (grid-ветка
    chordFreqs), строить чистыми от корня НЕЛЬЗЯ — стёрло бы весь смысл неравномерности.
    ⚠️ СМЕНА ТОНИКИ в меню меняет ОКРАСКУ (в отличие от 12-TET, где все тональности звучат
    одинаково): тоника переносит начало отсчёта по НЕРАВНОМЕРНОЙ сетке. tag:'penta' — инертный.
    Индексы 72..74, В КОНЕЦ (ничего не сдвигается — раги 61..71 на местах). */
 /* Веркмайстер III (1691) — 4 квинты по 1/4 пифагоровой коммы (C–G, G–D, D–A, B–F#). Терция от
    тоники 390.2¢ (почти чистая), в дальних тональностях до 407.8¢ (пифагорова); разброс ~17.6¢. */
 {id:'werckmeister-3', tuning:'werckmeister3', name:{default:'Werckmeister III (1691)', ru:'Веркмайстер III (1691)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.werckmeister3, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true},
 /* Валлотти (1754) — 6 квинт по 1/6 коммы (F–C–G–D–A–E–B), мягче распределено. Терция 392.2¢,
    разброс ~15.6¢ — самый РОВНЫЙ из трёх (ближе всего к 12-TET по равномерности, но характер ещё есть). */
 {id:'vallotti', tuning:'vallotti', name:{default:'Vallotti (1754)', ru:'Валлотти (1754)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.vallotti, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true},
 /* Кирнбергер III (1779) — 4 квинты по 1/4 СИНТОНИЧЕСКОЙ коммы (C–G–D–A–E) + одна сужена на схизму.
    Терция от тоники ЧИСТАЯ 386.31¢, но разброс самый большой (~21.5¢): чистота ближних тональностей
    куплена резкостью дальних. */
 {id:'kirnberger-3', tuning:'kirnberger3', name:{default:'Kirnberger III (1779)', ru:'Кирнбергер III (1779)'}, trad:'europe', grp:'', edo:12, iv:range(12),
    cents:TBL.kirnberger3, tag:'penta', typedChords:'natfix', gridChords:true, fixedKey:true},
];
/* ⛳ СТРОИ — ДАННЫЕ (слайс T0 универсальной модели строя, HANDOFF «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ»). СТРОЙ — все высоты инструмента:
   ПЕРИОД повторения и высоты внутри него. ЛАД — выбор из строя (ниже, поля sel/root у каждого лада SCALES).
     • РАВНЫЙ строй держит ФОРМУ ГЕНЕРАТОРА — число шагов equal и период (шаг k звучит period^(k/equal)), а НЕ развёрнутый список
       центов: ровно это выражение и стоит в сегодняшней равной ветке (P^(шаг/edo)), поэтому общая функция высоты (T1) останется
       побитно прежней. Шаг k бывает и ≥ equal (аккорд через период) — переноса для равного строя не нужно;
     • ТАБЛИЧНЫЙ строй — центы над нулевой высотой строя в пределах периода (TBL выше), период — октава (все центовые строи октавные).
   ⛳ id — СТАБИЛЬНЫЙ идентификатор (правило #25: отображаемое имя — не идентификатор): его запишет сохранение, его прочтёт импорт.
   Имён у записей пока нет — строй нигде не показывается; имена придут вместе с конструктором.
   ⚠️ Натуральный подвижный и фиксированный — ОДИН строй ji12 (те же 12 высот): различаются они не строем, а ЯКОРЕМ (подвижный
   строится от тоники, фиксированный — от C) и аккордами (чистые отношения / сетка). Так и задумано моделью: строй — только высоты.
   ⚠️ T0 НЕВИДИМ: эти записи и поля sel/root читает ТОЛЬКО проба (src/scaleprobe.js); цена, события, редактор их не видят (T1+). */
export const TUNINGS={
  'edo12':{id:'edo12', period:2, equal:12},
  'edo19':{id:'edo19', period:2, equal:19},
  'edo24':{id:'edo24', period:2, equal:24},
  'edo31':{id:'edo31', period:2, equal:31},
  'bp13':{id:'bp13', period:3, equal:13},                     // Болен–Пирс: 13 равных шагов ТРИТАВЫ
  'carlos-alpha':{id:'carlos-alpha', period:3/2, equal:9},    // Карлос: равные доли чистой КВИНТЫ (генератор, не эквивалентность)
  'carlos-beta':{id:'carlos-beta', period:3/2, equal:11},
  'carlos-gamma':{id:'carlos-gamma', period:3/2, equal:20},
  'slendro':{id:'slendro', period:2, cents:TBL.slendro},
  'pelog':{id:'pelog', period:2, cents:TBL.pelog},             // родитель патетов Лима/Нем/Баранг
  'partch43':{id:'partch43', period:2, cents:TBL.partch43},
  'shruti22':{id:'shruti22', period:2, cents:TBL.shruti22},    // родитель десяти раг
  'ji12':{id:'ji12', period:2, cents:TBL.ji12},
  'pythagorean12':{id:'pythagorean12', period:2, cents:TBL.pythagorean12},
  'meantone-quarter':{id:'meantone-quarter', period:2, cents:TBL.meantone},
  'werckmeister3':{id:'werckmeister3', period:2, cents:TBL.werckmeister3},
  'vallotti':{id:'vallotti', period:2, cents:TBL.vallotti},
  'kirnberger3':{id:'kirnberger3', period:2, cents:TBL.kirnberger3},
};
/* ⛳ ЛАД — ВЫБОРКА ИЗ СТРОЯ (слайс T0). Каждый элемент SCALES — запись ЛАДА: id (стабильный) и tuning (id строя) стоят в данных
   литералами; sel и root ВЫВОДЯТСЯ здесь, при загрузке модуля, из сегодняшних полей — руками не пишутся:
     sel  — индексы строя, на которых стоят ступени лада, по порядку ступеней (индекс ≥ числа высот строя — та же высота периодом выше);
     root — индекс строя, на котором стоит ступень 0 (тоника лада), когда строй строится от тоники: 0 у всех, кроме патета Баранг
            (Пелог, индекс 1 — его центы нормированы от своей тоники, −120¢). У Баранга sel[0] === root.
   РАВНЫЙ строй: sel = iv (ступени лада УЖЕ записаны в шагах строя), root = 0; число шагов и период обязаны совпасть с edo/period лада.
   ТАБЛИЦА: каждая ступень ищется в таблице ТОЧНЫМ равенством (T[root] + центы ступени; за периодом — минус 1200 и индекс + N); root —
   наименьший, при котором нашлись ВСЕ ступени. ⛳ Так раги «переезжают» в сетку 22 шрути, а патеты — в Пелог: связь «родитель» стоит в
   данных (tuning), а выборка выведена из ИХ ЖЕ центов, ни одного числа не переписано.
   Не нашлось (не тот строй, не те числа) — sel = root = null: модуль не падает, проба печатает несовпадение.
   ⚠️ ДОПОЛНЯЕМ ОБЪЕКТЫ ЛАДОВ ОДИН РАЗ, ЗДЕСЬ, до первого CUR(): виды scaleView (копии, T2) рождаются позже и несут поля сами.
   ⛔ Период берём из поля (s.period||2), а не periodOf: тот объявлен ниже и при загрузке модуля ещё недоступен. */
const modeDerive=s=>{
  const T=TUNINGS[s.tuning]; if(!T) return null;
  const P=s.period||2;
  if(T.equal){ if(s.cents||T.equal!==s.edo||T.period!==P) return null; return { sel:s.iv.slice(), root:0 }; }
  if(!s.cents||T.period!==P) return null;
  const C=T.cents, N=C.length;
  for(let r=0;r<N;r++){
    const sel=[];
    for(const c of s.cents){ let x=C[r]+c, w=0; if(x>=1200){ x-=1200; w=N; } const i=C.indexOf(x); if(i<0) break; sel.push(i+w); }
    if(sel.length===s.cents.length) return { sel, root:r };
  }
  return null;
};
for(const s of SCALES){ const m=modeDerive(s); s.sel=m?m.sel:null; s.root=m?m.root:null; }

/* Лады традиции — в порядке массива; отдаём вместе с АБСОЛЮТНЫМ индексом,
   потому что value у <option> обязан остаться scaleIdx. */
export const scalesOfTrad=id=>SCALES.map((s,i)=>({i,s})).filter(x=>x.s.trad===id);
export const tradOfScale=i=>SCALES[i].trad;

/* ⛳ T2: живой лад — ВИД (строй, лад, якорь; scaleView ниже) на текущий лад и якорь — у КАЖДОГО лада (P3 делал вариант только у
   tunable). Событие морозит sc:CUR() — значит морозит вид целиком: строй, лад и якорь (правило #7). */
export const CUR=()=>scaleView(SCALES[scaleIdx]);
/* ⛳ s — ЗАМОРОЖЕННЫЙ ЛАД СОБЫТИЯ (слайс S5.4). Тот же приём, что у leadFreq/chordSteps: параметр
   с умолчанием из живого состояния. Без аргумента — ровно прежнее поведение, байт-в-байт.
   ⚠️ ВНУТРИ подписей звать голый IVX() НЕЛЬЗЯ: параметр стал бы враньём, которое всплывает только на
   необычных строях (у 19/31-TET и Партча длина ivx другая — подпись молча съехала бы на чужую ступень). */
export const IVX=(s=CUR())=>s.iv.concat([s.edo]);           // + верхняя тоника
/* ЕДИНСТВЕННЫЙ источник опорной частоты — ЖИВАЯ настройка aRef (эталон A4, Гц; 380–480, по умолч. 440,
   лежит в state рядом с тоникой). База тоники baseF() И высота ЯКОРЯ фиксированных строёв cFix() (нота «строй от»: C у пяти
   исторических темпераций, у Пифагора — выбор, P3) читают ЕЁ
   ЖЕ через одну деривацию a3()=aRef/2 (A3). Копий 440/220 в коде высоты быть НЕ должно: сменил эталон
   — уехало ВСЁ, подвижные и фиксированные строи вместе (иначе гамелан уехал бы на 415, а Веркмайстер
   остался на 440 — «расстроенный инструмент»). aRef — импорт-биндинг, обе функции пересчитываются сами. */
const a3=()=>aRef/2;                                        // A3 из живого эталона A4 — единственная деривация опоры
export const baseF=()=>a3()*Math.pow(2,(tonic-9)/12);       // частота тоники (C=130.81 Гц при A4=440)
/* ═══ «СТРОЙ ОТ» — ЯКОРЬ ФИКСИРОВАННОЙ СЕТКИ (слайс P1 дуги «СТРОЙ ОТ», HANDOFF) ═══
   Фиксированный строй (fixedKey) — это инструмент, который НАСТРОЙЩИК настроил от одной ноты (якоря), а МУЗЫКАНТ играет
   в любой тональности (тоника). Две независимые вещи — и в арифметике высоты они теперь названы порознь:
     anchorOf(s) — нота, ОТ КОТОРОЙ настроена сетка (класс высоты 0..11, 0 = C);
     cFix(s)     — ВЫСОТА якоря: его равномерная высота от единого эталона A4 (a3 ← aRef, правило #17) — обобщение прежнего
                   «C3 = 130.81 Гц при A4=440»; если якорь ВЫШЕ тоники, он берётся октавой ниже, чтобы тоника звучала в том же
                   регистре, что и у подвижных ладов (около baseF), а не прыгала на октаву;
     keyOf(s)    — СДВИГ КЛЮЧА: тоника минус якорь (0..11) — место тоники в сетке. Его читают fixedSlot и прочие ветки fixedKey.
   ⛳ P1 был НЕВИДИМ: anchorOf всегда отдавал C (0) — так настроены все шесть исторических строёв, и так было в коде. Тогда
   cFix = a3·2^((0−9−0)/12) — ТО ЖЕ выражение, что прежнее a3·2^((0−9)/12) (−9−0 и 0−9 — одно и то же целое −9, деление на 12 —
   то же число с плавающей точкой), а keyOf = tonic−0+0 = tonic (целое, точно). Значит каждая формула ниже — побайтно прежняя.
   P3 (сделан): выбор якоря у Пифагора; якорь = тоника даёт keyOf=0 и cFix = a3·2^((tonic−9−0)/12) — то же выражение, что baseF():
   ровно подвижный путь. Прочие пять фиксированных строёв — от C, как прежде.
   ⚠️ Сетка fixedKey — 12 нот (cents.length===12 у всех шести): якорь и ключ — индексы в ЭТИ 12 полутонов. */
/* P3: якорь берётся из ЛАДА (поле варианта tunedFrom), а НЕ из живого state — поэтому записанное событие, чей sc — вариант со своим
   якорем, звучит со СВОИМ якорем, как бы ни двигали выбор. 'T' — следует за тоникой (якорь = тоника: keyOf=0, cFix=baseF — подвижный
   путь); число — закреплённая нота; поля нет (пять прочих фиксированных строёв и сам объект SCALES[57], на котором строит сцену
   демо) — C, историческая практика. */
const anchorOf=s=> s.tunedFrom==='T' ? tonic : (s.tunedFrom==null ? 0 : s.tunedFrom);
/* ⛳ ВИД — (СТРОЙ, ЛАД, ЯКОРЬ) ОДНИМ ОБЪЕКТОМ (слайс T2 универсальной модели строя; обобщает вариант лада на якорь из P3).
   CUR() отдаёт ВИД, и каждое событие, которое и так хранит sc: CUR(), морозит теперь ВИД целиком (правило #7) — без нового поля события.
   ФОРМА: копия полей лада (все прежние читатели — iv, edo, cents, period, fixedKey, sel, root, tunedFrom… — работают как прежде) и сверху:
     mode      — сам объект лада из SCALES (запись ЛАДА; у вида он и есть «какой лад»);
     tuningRec — запись его СТРОЯ (TUNINGS[tuning]);
     anchor    — { policy, from }: policy 'tonic' — подвижный (строй строится от тоники), 'C' — фиксированный от C (пять исторических
                 темпераций), 'choice' — «строй от» на выбор (tunable, Пифагор); from — нота «строй от»: 'T' — тоника, 0..11 — класс высоты.
     tunedFrom — ТОЛЬКО у tunable (как в P3: его читает anchorOf); у прочих поля нет — значит и цена у них прежняя.
   ⛳ ПАМЯТЬ — НА (ЛАД, ЯКОРЬ), И ЭТО НЕСУЩЕЕ: один и тот же лад с одним и тем же якорем ВСЕГДА даёт ОДИН И ТОТ ЖЕ объект. У лада без выбора
   якорь один — вид один; у Пифагора — не больше 13 ('T' + 12 нот). На тождестве держатся: группировка дорожки по ладу в редакторе
   (draw.rollGroups/rollHit — по ССЫЛКЕ sc), кэши рядов и подписей редактора (draw chRowCache/rollTopCache/lblCache — ключ sc), мемо
   раскладки (rectLayout, одна запись на ссылку) и тип аккорда для вставки (recorder: sel.sc===sc / e.sc!==sc). Все они получают лад только
   через CUR() или из sc события — значит видят виды, и тождество держится так же, как держалось у голых объектов.
   ⚠️ Две дорожки, записанные с разными «строй от», — РАЗНЫЕ виды для редактора (две группы, чип #rollScale): честно, это разные
   настройки инструмента. ⛔ Голые объекты SCALES в sc не попадают: события рождаются из CUR() или копируют sc другого события.
   Голый объект годится в цену сам (у него те же поля): на нём строит сцены демо стартового экрана и сверяет проба.
   Ничего не мутирует ни лады, ни виды; вид от вида — тот же вид (берём его mode). */
const SCALE_VIEWS=new WeakMap();
const anchorPolicy=s=> s.tunable ? 'choice' : s.fixedKey ? 'C' : 'tonic';
export function scaleView(s, tf=tunedFrom){
  if(!s) return s;
  const base=s.mode||s, key=base.tunable ? tf : '';           // у лада без выбора якорь один — и ключ один
  let m=SCALE_VIEWS.get(base); if(!m){ m=new Map(); SCALE_VIEWS.set(base,m); }
  let v=m.get(key);
  if(!v){
    const policy=anchorPolicy(base);
    v= base.tunable ? {...base, tunedFrom:tf} : {...base};    // tunedFrom — только у tunable: anchorOf у прочих читает «поля нет» (C), как прежде
    v.mode=base; v.tuningRec=TUNINGS[base.tuning];
    v.anchor={ policy, from: policy==='choice' ? tf : policy==='C' ? 0 : 'T' };
    m.set(key,v);
  }
  return v;
}
const keyOf=s=>{ const A=anchorOf(s); return tonic-A+(A>tonic?12:0); };
const cFix=(s=CUR())=>{ const A=anchorOf(s); return a3()*Math.pow(2,(A-9-(A>tonic?12:0))/12); };   // C3 = 130.81 Гц при A4=440 (та же опора, что baseF)
/* Частота ТОНИКИ/КЛЮЧА для дрона и родственного: у fixedKey — ФИКСИРОВАННАЯ высота ключа
   (cFix·2^(cents[ключ]/1200)), иначе дрон бился бы с приколоченной сеткой; у прочих — baseF()
   (подвижная тоника). Опора та же (cFix←a3←aRef) — не разъедется. P1: ключ — keyOf (при якоре C это tonic). */
/* T1: высота ТОНИКИ — та же функция высоты (pitchHz ниже), индекс строя — корень лада (+ ключ у фиксированных). Подвижные: A·P^0·ρ(z)
   = A·1·1 — ровно baseF(); фиксированные: cFix·2^0·2^(c[ключ]/1200) — ровно прежнее. Прежнее тело — legacyTonicFreq (только для пробы). */
export const tonicFreq=(s=CUR())=>{ const T=TUNINGS[s.tuning], a=modeAnchor(s); return pitchHz(T,a.A,a.z,a.key+s.sel[0],0); };
/* ПЕРИОД лада (интервал эквивалентности) — по умолчанию ОКТАВА (2). Неоктавный строй задаёт
   своё (Болен–Пирс period:3 — тритава). Заменяет зашитую двойку в формуле высоты: и регистр
   P^oct, и равный шаг P^(шаг/edo). Дефолт 2 ⇒ ВСЕ прежние лады байт-в-байт. */
export const periodOf=(s=CUR())=>s.period||2;
/* Слово-РЕГИСТР для ярлыков: у октавного лада (period 2) — «окт», у тритавного (Болен–Пирс,
   period 3) — «тритава», иначе нейтральное «рег.» (будущие неоктавные, напр. Карлос). Зависит
   ТОЛЬКО слово; римская цифра OCT_ROMAN[oct] та же. Дефолт 2 ⇒ все прежние лады «окт» байт-в-байт. */
export const regWord=(s=CUR())=>{ const P=periodOf(s); return P===2?t('reg.oct'):P===3?t('reg.tritave'):t('reg.reg'); };
/* Совместимость ладов для §3.7 (перенос фразы в другой строй возможен лишь при равном
   числе ступеней: 7→7 да, 7→5 нет). UI-уровень — принимает индексы, не хранимые данные. */
export const sameDegrees=(a,b)=>SCALES[a].iv.length===SCALES[b].iv.length;
/* Прогрессии (II–V–I и т.п.) — римские ступени, осмысленны лишь в 7-ступенчатом ладу;
   в пентатонике(5)/блюзе(6)/хроматике(12)/range(19|31) «V» не к чему привязать. */
export const supportsProgressions=(s=CUR())=>s.iv.length===7;
/* Лестницы аккордов нет (арабская традиция: музыка монофонична, трезвучий не строит,
   часть ступеней даёт двойной четвертьтон — муть). Свойство лада, а не строковый tag:
   переживёт перегруппировку ладов по традициям. Гейт ТОЛЬКО живого ввода — переигровка
   слоёв идёт по замороженному sc и обязана звучать как записана (полимодальность). */
export const supportsChords=(s=CUR())=>!s.noChords;
/* Типизированные аккорды (UI-MAP «Хроматика»): аккорд задаётся не ступенью лада, а
   ячейкой ПАЛИТРЫ — СЕМЕЙСТВО (колонка) + ВАРИАНТ (ряд), выбор ПО ПОЛОЖЕНИЮ щипка,
   ЛЮБОЙ рукой (привязки к handedness нет — см. state.chordFam).
   Тип попадает в событие данными (a.ty = массив интервалов), поэтому переигровка
   старых петель, где ty нет, идёт прежним путём (ty=undefined → шаговая ветка).
   Свойство лада — КЛЮЧ набора семейств в CHORD_FAM_SETS, а не true: строка тоже
   истинна, поэтому предикат ниже не изменился. */
export const typedChords=(s=CUR())=>!!s.typedChords;
/* ===== СЕТКА ПРЯМОУГОЛЬНИКОВ: ВСЯ АРИФМЕТИКА В ОДНОЙ ФУНКЦИИ =====
   Раскладка перестала быть «4 ноты в прямоугольнике на один период». Два обобщения:
   (1) НОТ В ПРЯМОУГОЛЬНИКЕ k — переменное: 4, иначе 3, иначе 2. Лишние пальцы (при k<4) НЕ играют
       ничего — лучше молчание, чем чужая нота (и оно ОБЪЯСНЕНО в легенде тусклой строкой, иначе
       читается как поломка);
   (2) ПОКАЗЫВАЕМ НЕСКОЛЬКО ПЕРИОДОВ СРАЗУ, сколько влезет (потолки ниже). Где влезли ВСЕ регистры —
       октавная полоса не нужна: весь диапазон уже под рукой.
   ДВЕ ФОРМЫ ПЕРИОДА (dup), разница — лежит ли на сетке ВЕРХНЯЯ ТОНИКА:
     dup=1 — тоника ПОВТОРЕНА на границе периода (нот iv.length+1). Смысл сменился: раньше это было
       «замкнуть октаву», теперь — ВЫРАВНИВАНИЕ: период занимает ЦЕЛОЕ число прямоугольников, поэтому
       рука всегда знает, где она. Верхний слот и первый слот следующего блока — ОДНА И ТА ЖЕ высота
       (leadFreq: deg=iv.length → P^1 при том же oct; deg=0 при oct+1 → то же самое), см. §дубль ниже;
     dup=0 — сетка = сами ноты лада. Верхняя тоника остаётся в IVX (центы, терменвокс), но на сетку
       не выходит: нота периодом выше приходит следующим блоком (или регистром, если блок один).
   ⚠️ ПЕРИОД-ГЕЙТ У dup СНЯТ НАМЕРЕННО. Раньше dup=1 позволялся ТОЛЬКО октавному ладу (periodOf===2).
   Теперь dup — свойство РАСКЛАДКИ (выравнивание), а не утверждение об эквивалентности, и без него
   Болен–Пирс (13, простое) и Карлос-бета (11, простое) не разложились бы НИКАК. На высоту это не
   влияет: periodOf по-прежнему правит регистром, шагом, центами и regWord.
   ЧЕСТНАЯ ОГОВОРКА (принята осознанно): подпись верхнего слота — «Т» (структурная проверка
   IVX[deg]%edo===0). Для Болена–Пирса это ПРАВДА (тритава 3:1 — его интервал эквивалентности), для
   КАРЛОСА — ПРЕУВЕЛИЧЕНИЕ: её квинта 3:2 — генератор, эквивалентности у строёв Карлос нет вовсе.
   Живём с этим; если начнёт мешать — свойству лада equiv:false и порядковая подпись в noteLbl.
   ПОРЯДОК ПЕРЕБОРА: k = 4 → 3 → 2, внутри k сперва dup=0, потом dup=1. Именно этот порядок даёт
   7-нотным ладам k=4,dup=1 (2 прямоугольника), а не k=3.
   ПОТОЛКИ: REG_N периодов (это НЕ произвольная четвёрка — столько и есть регистров, OCT_ROMAN;
   поэтому сетка на все REG_N периодов покрывает ВЕСЬ диапазон регистров, ничего не теряя) и
   RECT_MAX прямоугольников (плотность экрана).
   ПРОВЕРЕНО НА РЕАЛЬНЫХ ДАННЫХ (все 75 ладов; число ступеней → k/dup/прямоуг. на период/периодов):
     7 (мажор, лады, макамы, раги, пелог) → 4/1/2 → 4 периода, 8 полос, БЕЗ регистровой
     5 (пентатоники, слендро, патеты)     → 3/1/2 → 4 периода, 8 полос, без регистровой
     6 (блюз, целотоновая, Прометей)      → 3/0/2 → 4 периода, 8 полос, без регистровой
     8 (октатоники)                       → 4/0/2 → 4 периода, 8 полос, без регистровой
     9 (Мессиан-3, Карлос альфа)          → 3/0/3 → 4 периода, 12 полос, без регистровой
    11 (Карлос бета)                      → 4/1/3 → 4 периода, 12 полос, без регистровой
    12 (хроматика, 6 историч. строёв)     → 4/0/3 → 4 периода, 12 полос, без регистровой
    19 (19-TET)                           → 4/1/5 → 2 периода, 10+1 полос, С регистровой
    20 (Карлос гамма)                     → 4/0/5 → 2 периода, 10+1 полос, С регистровой
    31 (31-TET)                           → 4/1/8 → 1 период,  8+1 полос,  С регистровой (как сегодня)
    43 (Партч)                            → 4/1/11 → 1 период, 11+1 полос, С регистровой (как сегодня)
    22 (сетка шрути)                      → 2/0/11 → 1 период, 11+1 полос, С регистровой (НОВОЕ: была невозможна)
    13 (Болен–Пирс)                       → 2/1/7  → 1 период, 7+1 полос,  С регистровой (НОВОЕ)
   МЕМОИЗАЦИЯ на ССЫЛКУ лада: функцию зовут ~30 раз за кадр (gestures+draw), лады — статические
   объекты, поэтому кэш на одну запись точен. rectPref в кэш НЕ входит (его решает rectGrid). */
export const REG_N=OCT_ROMAN.length;     // сколько регистров существует (I..IV) — он же потолок числа показываемых периодов
const RECT_MAX=12;                       // потолок числа НОТНЫХ прямоугольников на экране (плотность)
let _rlS=null, _rl=null;                 // кэш на одну запись: ключ — ССЫЛКА на лад
export function rectLayout(s=CUR()){
  if(s===_rlS) return _rl;
  let k=4, dup=0;
  outer: for(const kk of [4,3,2]) for(const dd of [0,1]) if((s.iv.length+dd)%kk===0){ k=kk; dup=dd; break outer; }
  const block=s.iv.length+dup, perOct=block/k;
  const octaves=Math.max(1,Math.min(REG_N,Math.floor(RECT_MAX/perOct)));
  const rects=perOct*octaves, hasReg=octaves<REG_N;
  _rlS=s; _rl={k,dup,block,perOct,octaves,rects,hasReg,
               regBands:hasReg?1:0,                 // ЕДИНЫЙ источник смещения «полоса → прямоугольник» (было зашитое −1 в четырёх местах)
               bands:rects+(hasReg?1:0), notes:rects*k};
  return _rl;
}
/* Возможны ли прямоугольники. ТЕПЕРЬ ВСЕГДА ДА и это доказуемо: чётное число ступеней делится
   k=2,dup=0; нечётное — k=2,dup=1. Предикат оставлен как ЗАЩИТА разрешителя (вырожденный
   пользовательский строй в будущем), но UI-ветку «недоступно с причиной» он больше не питает —
   причины не существует, и мёртвого объяснения в панели быть не должно. */
export const rectEligible=(s=CUR())=>s.iv.length>=2;
/* РАЗРЕШИТЕЛЬ РАСКЛАДКИ — ОДНО место, где решается «прямоугольники или узкие ряды». Раскладка
   НЕ свойство лада: s.rectGrid остался в данных, но это ДЕФОЛТ («каким лад открывается»), а выбор
   человека живёт в state.rectPref ('auto'|'rect'|'rows', дефолт 'auto'). Узкие ряды возможны ВСЕГДА. */
export const rectGrid=(s=CUR())=>rectEligible(s) && (rectPref==='auto' ? !!s.rectGrid : rectPref==='rect');
export const rectDefault=(s=CUR())=>!!s.rectGrid;   // «как лад открывается» — для подписи варианта «По ладу» в UI
/* Тонкие обёртки над rectLayout — чтобы места вызова не знали про поля объекта.
   ⚠️ rectRows СМЕНИЛ СМЫСЛ: это прямоугольники ВСЕЙ сетки (всех показанных периодов), а не одного. */
export const rectRows=(s=CUR())=>rectLayout(s).rects;
export const rectNotes=(s=CUR())=>rectLayout(s).notes;      // сколько нот РЕАЛЬНО лежит на сетке
export const rectRowsFull=(s=CUR())=>rectLayout(s).bands;   // полос всего (нотные + октавная, если она есть)
/* БАЗА ОКНА (номер регистра, с которого начинается нижний блок). Пока показан не весь диапазон
   (hasReg), её задаёт липкий регистр роли, и он двигает ВСЁ ОКНО целиком; когда показаны все REG_N
   периодов — база жёстко 0 (двигать нечего, регистр не участвует). Кламп ОДИН и общий для чтения
   и для записи в октавной полосе: верх окна не должен уезжать за последний регистр. */
export const rectBase=(reg,s=CUR())=>{ const L=rectLayout(s);
  return L.hasReg ? Math.max(0,Math.min(reg,REG_N-L.octaves)) : 0; };
export const rectBaseMax=(s=CUR())=>{ const L=rectLayout(s); return L.hasReg?REG_N-L.octaves:0; };   // сколько баз выбираемо в октавной полосе (0..max)
/* СЛОТ → НОТА: единственная формула отображения сетки в (ступень, регистр). Слот g считается от
   НИЖНЕГО левого: g = прямоугольник*k + палец. Блок = один период (block нот), поэтому deg внутри
   блока, а номер блока прибавляется к базе окна. Диапазоны на выходе — РОВНО сегодняшние:
   deg ∈ [0, iv.length], oct ∈ [0, REG_N-1]; формат события не меняется ни на бит. */
export const rectNoteAt=(g,base,s=CUR())=>{ const L=rectLayout(s);
  return {deg:g%L.block, oct:base+Math.floor(g/L.block)}; };
/* НОТА → СЛОТ: обратное отображение, нужно ПОДСВЕТКЕ (какой прямоугольник зажечь). Однозначно даже
   при dup=1: храним СЫГРАННУЮ пару (deg,oct), а не высоту, поэтому «верхний слот блока» (deg=block-1)
   и «первый слот следующего» (deg=0, oct+1) — разные g. Старое событие с deg=iv.length при dup=0
   ложится на первый слот следующего блока — ТА ЖЕ высота, деградация мягкая. Вне окна → -1. */
export const rectSlotOf=(deg,oct,base,s=CUR())=>{ const L=rectLayout(s);
  const g=(oct-base)*L.block+deg;
  return (g<0||g>=L.notes) ? -1 : g; };
/* ТЕРМЕНВОКС — ОБЩИЙ раздел вертикали для звука (gestures) и рисунка (draw): не разъезжаться,
   иначе высота под пальцем ≠ высота на линии. M = число нот раскладки; нотное поле [0,spanBot]
   сверху вниз = ВЫСШАЯ..низшая нота. У rect-лада низ отдан октавной полосе (spanBot = поле без
   нижней полосы), у 12-TET — вся высота. Тонкое деление divH = spanBot/M (у rect-ладов = seg/4 →
   ровно 4 линии на прямоугольник).
   ⚠️ ПОЧИНКА СТАРОГО OFF-BY-ONE (был неверен ДО этой правки, не сломан ею): M брался как
   IVX().length ВСЕГДА. У ЗАКРЫТОЙ rect-формы rectNotes()===IVX().length, и всё сходилось
   (19/31/Партч — байт-в-байт). У ОТКРЫТОЙ формы верхней тоники на сетке НЕТ, и линий выходило на
   одну больше слотов: Карлос-гамма делила поле на 21 вместо 20 — линии уползали ~5% к верху.
   Незаметно на экзотической гамме, но хроматика (13 против 12) вынесла бы это на общий лад.
   Берём то, что РЕАЛЬНО лежит на сетке (rectNotes), у нерект-ладов — как было. */
export const thereminSpan=(playH)=>{ const M=rectGrid()?rectNotes():IVX().length;
  const reg=rectGrid()?rectLayout().regBands:0;   // низ отдан октавной полосе ТОЛЬКО когда она есть (hasReg); при показе всех регистров полос-нот — все
  const spanBot = rectGrid() ? playH*(rectRowsFull()-reg)/rectRowsFull() : playH;
  return {M, spanBot, divH:spanBot/M}; };
/* y → ДРОБНЫЙ СЛОТ p (0=низ … M-1=верх); центр деления = ТОЧНАЯ нота. Соседи floor/ceil,
   интерполяция ЛОГАРИФМИЧЕСКАЯ (линейно в центах = геометрически в Гц) через leadFreq — так
   неравные интервалы Партча/гамелана и любой EDO звучат верно.
   3-й аргумент — БАЗА ОКНА (нерект: просто регистр, как было). У многопериодной сетки слот несёт
   И ступень, И номер периода, поэтому высоту соседей берём через rectNoteAt — иначе линии и звук
   разъехались бы на целые октавы. У однопериодной сетки и узких рядов слот === ступень, регистр =
   база: байт-в-байт прежнее поведение.
   ⚠️ ПЛАТО НА ГРАНИЦЕ ПЕРИОДА при dup=1: два соседних слота — ОДНА высота, поэтому на одном делении
   глиссандо стоит на месте. Это честное следствие сетки (там и правда одна и та же нота); ломать
   ради этого совпадение линий с сеткой не станем.
   Кламп: y в [0,spanBot], p в [0,last]. Возвращаем и ступень, И регистр — вызывающий пишет в
   событие ближайшую НОТУ (deg+oct), формат события прежний. */
export const thereminHz=(y,playH,base)=>{ const {M,spanBot,divH}=thereminSpan(playH), last=M-1;
  const noteOf = i => rectGrid() ? rectNoteAt(i,base) : {deg:i, oct:base};
  const yc=Math.max(0,Math.min(spanBot,y)), fp=yc/divH;
  let p=last-fp+0.5; p=Math.max(0,Math.min(last,p));
  const d0=Math.floor(p), d1=Math.min(d0+1,last), fr=p-d0;
  const n0=noteOf(d0), n1=noteOf(d1), near=noteOf(Math.round(p));
  const l0=Math.log2(leadFreq(n0.deg,n0.oct)), l1=Math.log2(leadFreq(n1.deg,n1.oct));
  return {hz:Math.pow(2,l0+(l1-l0)*fr), deg:near.deg, oct:near.oct, slot:Math.round(p), p}; };
/* НАБОРЫ СЕМЕЙСТВ ПО ЛАДАМ. Интервалы — В ШАГАХ СВОЕГО СТРОЯ от корня; для 12-TET шаг
   это полутон, для 31-TET — 38.7 цента. Ветка `if(ty)` в chordSteps складывает шаги
   с шагами и от edo не зависит — один механизм на оба набора, разная только таблица.
   ⚠️ Набор нельзя ставить ладу с ДРУГИМ edo: 12-тоновые [0,4,7] на 31-TET дадут
   4/31 вместо терции — молча и мимо строя. Ключ привязан к ладу, лад знает свой edo.
   Число РЯДОВ колонки = длине её types, число КОЛОНОК = длине набора; рисование,
   попадание и гистерезис берут их из данных — таблицу можно менять свободно, в том
   числе делать колонки разной длины (палитра рисуется рвано-безопасно).
   Поле finger осталось от прежнего выбора семейства пальцем; сейчас порядок колонок
   задаёт сам массив, а finger не читается ни gestures, ни draw.
   Ступени БОЛЬШЕ edo (Add9=36 при edo=31) — легальны: это нона через октаву,
   chordFreqs берёт 2^(шаг/edo) без остатка, октава получается сама. */
export const CHORD_FAM_SETS={
 /* ── 12-TET Хроматика: интервалы в ПОЛУТОНАХ ─────────────────────────────── */
 chrom12:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[            // колонка 0 палитры
    {label:'M',      iv:[0,4,7]},
    {label:'maj7',  iv:[0,4,7,11]},
    {label:'7',     iv:[0,4,7,10]},
    {label:'6',     iv:[0,4,7,9]},
    {label:'add9',  iv:[0,4,7,14]},
    {label:'7#9',   iv:[0,4,7,10,15]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[            // колонка 1 палитры
    {label:'m',     iv:[0,3,7]},
    {label:'m7',    iv:[0,3,7,10]},
    {label:'m6',    iv:[0,3,7,9]},
    {label:'mM7',   iv:[0,3,7,11]},
    {label:'m9',    iv:[0,3,7,10,14]},
    {label:'madd9', iv:[0,3,7,14]},
  ]},
  {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[          // колонка 2 палитры
    {label:'dim',   iv:[0,3,6]},
    {label:'m7b5',  iv:[0,3,6,10]},
    {label:'dim7',  iv:[0,3,6,9]},
    {label:'aug',   iv:[0,4,8]},
    {label:'aug7',  iv:[0,4,8,10]},
    {label:'augM7', iv:[0,4,8,11]},
  ]},
  /* Последняя колонка: sus + расширенные. Имя семейства не «Sus» — в наборе лежат 6/9, maj9 и 13,
     которые sus не являются; индикатор не должен врать. */
  {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[    // колонка 3 палитры
    {label:'sus2',  iv:[0,2,7]},
    {label:'sus4',  iv:[0,5,7]},
    {label:'7sus4', iv:[0,5,7,10]},
    {label:'6/9',   iv:[0,4,7,9,14]},
    {label:'maj9',  iv:[0,4,7,11,14]},
    {label:'13',    iv:[0,4,7,10,21]},
  ]},
 ],
 /* ── 31-TET «весь строй»: интервалы в ШАГАХ 31-EDO (шаг = 38.71¢) ──────────
    Ради чего всё: 4:5:6:7 звучит биением в ноль — терция +0.8¢, нат.септима −1.1¢
    (в 12-TET та же септима мимо на +31¢ и поэтому «тянет»). Нейтральная терция 11/9
    (+1.0¢), субминор 7/6 (+4.1¢), супермажор 9/7 (−9.3¢, самый неточный в наборе —
    ближе 31-TET не даёт). Безымянный здесь НЕЙТРАЛЬНЫЕ, а не уменьшённые: ради
    нейтральных интервалов 31-TET и берут. */
 edo31:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[            // колонка 0 палитры
    {label:{en:'maj', ru:'маж'},    full:{en:'Pure major', ru:'Мажор чистый'},       iv:[0,10,18]},
    {label:'maj7',   full:'Maj7',               iv:[0,10,18,28]},
    {label:{en:'dom7', ru:'дом7'},   full:{en:'Dominant 7th · 4:5:6:7', ru:'Домин.7 · 4:5:6:7'},  iv:[0,10,18,25]},
    {label:{en:'super', ru:'супер'},  full:{en:'Supermajor · 9/7', ru:'Супермажор · 9/7'},   iv:[0,11,18]},
    {label:'6',      full:{en:'Major 6', ru:'Мажор 6'},            iv:[0,10,18,23]},
    {label:'add9',   full:{en:'Add9 (over the octave)', ru:'Add9 (через октаву)'},iv:[0,10,18,36]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[            // колонка 1 палитры
    {label:{en:'min', ru:'мин'},    full:{en:'Pure minor', ru:'Минор чистый'},       iv:[0,8,18]},
    {label:{en:'min7', ru:'мин7'},   full:{en:'Minor 7', ru:'Минор 7'},            iv:[0,8,18,26]},
    {label:{en:'submin', ru:'субмин'}, full:{en:'Subminor · 7/6', ru:'Субминор · 7/6'},     iv:[0,7,18]},
    {label:{en:'min6', ru:'мин6'},   full:{en:'Minor 6', ru:'Минор 6'},            iv:[0,8,18,23]},
    {label:{en:'minM7', ru:'минМ7'},  full:{en:'Minor-major 7', ru:'Мин-мажор 7'},        iv:[0,8,18,28]},
    {label:{en:'subm7', ru:'субм7'},  full:{en:'Subminor 7', ru:'Субминор 7'},         iv:[0,7,18,25]},
  ]},
  {id:'neu', name:{en:'Neutral/Dim.', ru:'Нейтр./Ум.'}, finger:2, types:[       // колонка 2 палитры
    {label:{en:'neut', ru:'нейтр'},  full:{en:'Neutral · 11/9', ru:'Нейтральное · 11/9'}, iv:[0,9,18]},
    {label:{en:'neut7', ru:'нейтр7'}, full:{en:'Neutral 7', ru:'Нейтральное 7'},      iv:[0,9,18,26]},
    {label:'dim',    full:{en:'Diminished', ru:'Уменьшённое'},        iv:[0,8,15]},
    {label:'m7b5',   full:{en:'Half-diminished', ru:'Полууменьшённое'},    iv:[0,8,15,26]},
    {label:'dim7',   full:{en:'Diminished 7th', ru:'Ум. септаккорд'},     iv:[0,8,15,23]},
    {label:{en:'neut♮7', ru:'нейтр♮7'},full:{en:'Neutral + natural 7 · 7/4', ru:'Нейтр. + нат.7 · 7/4'},iv:[0,9,18,25]},
  ]},
  {id:'sus', name:'Sus', finger:3, types:[              // колонка 3 палитры
    {label:'sus2',   full:'Sus2 · 9/8',         iv:[0,5,18]},
    {label:'sus4',   full:'Sus4 · 4/3',         iv:[0,13,18]},
    {label:'7sus4',  full:'7sus4',              iv:[0,13,18,25]},
    {label:'9sus4',  full:{en:'9sus4 (over the oct.)', ru:'9sus4 (через окт.)'}, iv:[0,13,18,36]},
    {label:'sus2/7', full:{en:'Sus2 + natural 7', ru:'Sus2 + нат.7'},       iv:[0,5,18,25]},
    {label:{en:'quart', ru:'кварт'},  full:{en:'Quartal chord', ru:'Квартаккорд'},        iv:[0,13,25]},
  ]},
 ],
 /* ── 19-TET «весь строй»: интервалы в ШАГАХ 19-EDO (шаг = 63.16¢) ──────────
    Ради чего всё: чистая МАЛАЯ терция 6/5 — 5 шагов (+0.2¢), и большая секста
    5/3 — 14 шагов (−0.2¢). Отсюда минорное трезвучие и мажорный секстаккорд
    звучат ровнее, чем в 12-TET (там та же терция мимо на −15.6¢ и «бьётся»).
    Зеркально 31-TET, где ради 4:5:6:7 берут МАЖОРНУЮ сторону: 19-TET — строй
    минорной терции. Большая терция 6 шагов (−7.4¢) чуть узка, малая септима
    16 шагов (−7¢) — компромисс, зато 5 шагов и 14 шагов почти идеальны. */
 edo19:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[            // колонка 0 палитры
    {label:{en:'maj', ru:'маж'},    full:{en:'Major', ru:'Мажор'},               iv:[0,6,11]},
    {label:'maj7',   full:'Maj7',                iv:[0,6,11,17]},
    {label:{en:'dom7', ru:'дом7'},   full:{en:'Dominant 7th', ru:'Домин.7'},             iv:[0,6,11,16]},
    {label:'6',      full:{en:'Major 6 · 5/3', ru:'Мажор 6 · 5/3'},       iv:[0,6,11,14]},
    {label:'add9',   full:{en:'Add9 (over the oct.)', ru:'Add9 (через окт.)'},   iv:[0,6,11,22]},
    {label:'6/9',    full:{en:'Major 6/9', ru:'Мажор 6/9'},           iv:[0,6,11,14,22]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[            // колонка 1 палитры
    {label:{en:'min', ru:'мин'},    full:{en:'Pure minor · 6/5', ru:'Минор чистый · 6/5'},  iv:[0,5,11]},
    {label:{en:'min7', ru:'мин7'},   full:{en:'Minor 7', ru:'Минор 7'},             iv:[0,5,11,16]},
    {label:{en:'min6', ru:'мин6'},   full:{en:'Minor 6 · 5/3', ru:'Минор 6 · 5/3'},       iv:[0,5,11,14]},
    {label:{en:'minM7', ru:'минМ7'},  full:{en:'Minor-major 7', ru:'Мин-мажор 7'},         iv:[0,5,11,17]},
    {label:{en:'min9', ru:'мин9'},   full:{en:'Minor 9', ru:'Минор 9'},             iv:[0,5,11,16,22]},
    {label:{en:'minadd9', ru:'минadd9'},full:{en:'Minor add9', ru:'Минор add9'},          iv:[0,5,11,22]},
  ]},
  {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[          // колонка 2 палитры
    {label:'dim',    full:{en:'Diminished', ru:'Уменьшённое'},         iv:[0,5,10]},
    {label:'m7b5',   full:{en:'Half-diminished', ru:'Полууменьшённое'},     iv:[0,5,10,16]},
    {label:'dim7',   full:{en:'Diminished 7th', ru:'Ум. септаккорд'},      iv:[0,5,10,15]},
    {label:'aug',    full:{en:'Augmented', ru:'Увеличенное'},         iv:[0,6,12]},
    {label:'aug7',   full:{en:'Augmented 7', ru:'Увелич. 7'},           iv:[0,6,12,16]},
    {label:'augM7',  full:{en:'Augmented-major 7', ru:'Увелич.-мажор 7'},     iv:[0,6,12,17]},
  ]},
  {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[    // колонка 3 палитры
    {label:'sus2',   full:'Sus2',                iv:[0,3,11]},
    {label:'sus4',   full:'Sus4 · 4/3',          iv:[0,8,11]},
    {label:'7sus4',  full:'7sus4',               iv:[0,8,11,16]},
    {label:'9sus4',  full:{en:'9sus4 (over the oct.)', ru:'9sus4 (через окт.)'},  iv:[0,8,11,22]},
    {label:'sus2/7', full:'Sus2 + 7',            iv:[0,3,11,16]},
    {label:{en:'quart', ru:'кварт'},  full:{en:'Quartal chord', ru:'Квартаккорд'},         iv:[0,8,16]},
  ]},
 ],
 /* ── Партч (43 тона, cents-строй): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ (11-предел), НЕ шаги edo.
    chordFreqs с cents-веткой множит корень на ratio напрямую (см. выше). О = отональные
    (обертоновые, X:X+1…), У = утональные (унтертоновые, 1/отональ). Метки честны по Партчу:
    отношение, а не «Cmaj7». iv начинается с 1 (унисон-корень). Отношения — обычные JS-числа
    (5/4 и т.д.): погрешность float ниже цента, а ссылка на массив iv держит ty===latchTy. */
 partch:[
  {id:'oton', name:{en:'O (otonal)', ru:'О (обертон.)'}, finger:0, types:[
    {label:'O',    full:{en:'Otonal triad · 4:5:6', ru:'Отональ. триада · 4:5:6'},         iv:[1,5/4,3/2]},
    {label:'O7',   full:{en:'Otonal tetrad · 4:5:6:7', ru:'Отональ. тетрада · 4:5:6:7'},      iv:[1,5/4,3/2,7/4]},
    {label:'O9',   full:{en:'Otonal pentad · 4:5:6:7:9', ru:'Отональ. пентада · 4:5:6:7:9'},    iv:[1,5/4,3/2,7/4,9/4]},
    {label:'O11',  full:{en:'Otonal hexad · 4:5:6:7:9:11', ru:'Отональ. гексада · 4:5:6:7:9:11'}, iv:[1,5/4,3/2,7/4,9/4,11/4]},
    {label:{en:'O no5', ru:'О-б5'}, full:{en:'Otonal, no fifth · 4:5:7', ru:'Отональ. без квинты · 4:5:7'},     iv:[1,5/4,7/4]},
    {label:{en:'O9n', ru:'О9нч'}, full:{en:'Otonal with ninth · 8:9:10:12', ru:'Отональ. с ноной · 8:9:10:12'},    iv:[1,9/8,5/4,3/2]},
  ]},
  {id:'uton', name:{en:'U (utonal)', ru:'У (унтертон.)'}, finger:1, types:[
    {label:'U',    full:{en:'Utonal triad · 10:12:15', ru:'Утональ. триада · 10:12:15'},      iv:[1,6/5,3/2]},
    {label:'U7',   full:{en:'Utonal tetrad · 1/(4:5:6:7)', ru:'Утональ. тетрада · 1/(4:5:6:7)'},  iv:[1,6/5,3/2,12/7]},
    {label:'U9',   full:{en:'Utonal pentad', ru:'Утональ. пентада'},                iv:[1,6/5,3/2,12/7,9/4]},
    {label:'U11',  full:{en:'Utonal hexad', ru:'Утональ. гексада'},                iv:[1,6/5,3/2,12/7,9/4,36/11]},
    {label:{en:'U no5', ru:'У-б5'}, full:{en:'Utonal, no fifth · 5:6:8', ru:'Утональ. без квинты · 5:6:8'},     iv:[1,6/5,8/5]},
    {label:{en:'U add9', ru:'Удоб9'},full:{en:'Utonal with ninth · 9:10:12', ru:'Утональ. с ноной · 9:10:12'},      iv:[1,10/9,6/5,3/2]},
  ]},
  {id:'sept', name:{en:'Sharp 7/11', ru:'Диез 7/11'}, finger:2, types:[
    {label:{en:'subm', ru:'субм'}, full:{en:'Subminor · 7/6 (267c)', ru:'Субминор · 7/6 (267c)'},          iv:[1,7/6,3/2]},
    {label:{en:'supM', ru:'супМ'}, full:{en:'Supermajor · 9/7 (435c)', ru:'Супермажор · 9/7 (435c)'},        iv:[1,9/7,3/2]},
    {label:{en:'neut', ru:'нейтр'},full:{en:'Neutral · 11/9 (347c)', ru:'Нейтральное · 11/9 (347c)'},      iv:[1,11/9,3/2]},
    {label:{en:'undec', ru:'ундец'},full:{en:'Undecimal · 11/8 (551c)', ru:'Ундецимальное · 11/8 (551c)'},    iv:[1,11/8,3/2]},
    {label:{en:'trit7', ru:'трит7'},full:{en:'Septimal tritone · 7/5 (583c)', ru:'Септим. тритон · 7/5 (583c)'},    iv:[1,7/5,3/2]},
    {label:{en:'harm', ru:'гарм'}, full:{en:'Harmonic segment · 8:10:11:12', ru:'Обертоновый срез · 8:10:11:12'},  iv:[1,5/4,11/8,3/2]},
  ]},
  {id:'std', name:{en:'Standard', ru:'Станд.'}, finger:3, types:[
    {label:'M',    full:{en:'Pure major · 4:5:6', ru:'Мажор чистый · 4:5:6'},            iv:[1,5/4,3/2]},
    {label:'m',    full:{en:'Pure minor · 10:12:15', ru:'Минор чистый · 10:12:15'},         iv:[1,6/5,3/2]},
    {label:'7',    full:{en:'Dominant 7th · 4:5:6:7', ru:'Домин.7 · 4:5:6:7'},               iv:[1,5/4,3/2,7/4]},
    {label:'maj7', full:{en:'Pure maj7 · 15/8', ru:'Maj7 чистый · 15/8'},              iv:[1,5/4,3/2,15/8]},
    {label:'sus4', full:'Sus4 · 4/3',                      iv:[1,4/3,3/2]},
    {label:{en:'quart', ru:'кварт'},full:{en:'Quartal chord · 9:12:16', ru:'Квартаккорд · 9:12:16'},           iv:[1,4/3,16/9]},
  ]},
 ],
 /* ── Болен–Пирс (неоктавный, период 3): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ подгруппы 3.5.7,
    нормированные от корня (÷3, поэтому 3:5:7 → [1,5/3,7/3]). Как у Партча — НЕ шаги edo; но BP
    НЕ cents-лад, а ПЕРИОД-РАВНЫЙ: chordFreqs берёт корень равным шагом (P^(iv/edo), P=3) и множит
    на ratio напрямую (см. period-ветку в chordFreqs). Метки честны по BP — отношение, а не «Cmaj».
    iv с 1 (унисон-корень). Три колонки по 5: Мажор (отональ. вокруг 3:5:7) / Минор (вокруг 5:7:9) /
    Характерные (нечётные терции 9/7·7/5 и симметричные стопки). Отношения — обычные JS-числа. */
 bp:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
    {label:'3:5:7',     full:{en:'Major triad · 3:5:7 (885/1467¢)', ru:'Мажорная триада · 3:5:7 (885/1467¢)'}, iv:[1,5/3,7/3]},
    {label:'3:5:7:9',   full:{en:'Tetrad · 3:5:7:9 (top = tritave)', ru:'Тетрада · 3:5:7:9 (верх = тритава)'},  iv:[1,5/3,7/3,3]},
    {label:'3:5:7:9:11',full:{en:'Pentad · 3:5:7:9:11', ru:'Пентада · 3:5:7:9:11'},                iv:[1,5/3,7/3,3,11/3]},
    {label:'3:5',       full:{en:'Dyad · 3:5 (885¢)', ru:'Диада · 3:5 (885¢)'},                  iv:[1,5/3]},
    {label:'3:7',       full:{en:'Dyad · 3:7 (1467¢)', ru:'Диада · 3:7 (1467¢)'},                 iv:[1,7/3]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
    {label:'5:7:9',    full:{en:'Minor triad · 5:7:9 (583/1018¢)', ru:'Минорная триада · 5:7:9 (583/1018¢)'}, iv:[1,7/5,9/5]},
    {label:'5:7:9:11', full:{en:'Tetrad · 5:7:9:11', ru:'Тетрада · 5:7:9:11'},                  iv:[1,7/5,9/5,11/5]},
    {label:'7:9:11',   full:{en:'Triad · 7:9:11 (435/782¢)', ru:'Триада · 7:9:11 (435/782¢)'},          iv:[1,9/7,11/7]},
    {label:'5:7',      full:{en:'Dyad · 5:7 (583¢, septimal tritone)', ru:'Диада · 5:7 (583¢, септим. тритон)'},  iv:[1,7/5]},
    {label:'5:9',      full:{en:'Dyad · 5:9 (1018¢)', ru:'Диада · 5:9 (1018¢)'},                 iv:[1,9/5]},
  ]},
  {id:'char', name:{en:'Characteristic', ru:'Характерные'}, finger:2, types:[
    {label:'9/7',   full:{en:'Supermajor third · 9/7 (435¢) + 7/3', ru:'Супермажор. терция · 9/7 (435¢) + 7/3'}, iv:[1,9/7,7/3]},
    {label:'7/5',   full:{en:'Septimal tritone · 7/5 (583¢) + 7/3', ru:'Септим. тритон · 7/5 (583¢) + 7/3'},     iv:[1,7/5,7/3]},
    {label:'15/7',  full:{en:'Upper · 3:5:15/7 (885/1319¢)', ru:'Верхняя · 3:5:15/7 (885/1319¢)'},        iv:[1,5/3,15/7]},
    {label:'25/9',  full:{en:'Stack of 5/3 · 9:15:25 (symmetric)', ru:'Стопка 5/3 · 9:15:25 (симметр.)'},       iv:[1,5/3,25/9]},
    {label:'49/25', full:{en:'Stack of 7/5 · 25:35:49 (symmetric)', ru:'Стопка 7/5 · 25:35:49 (симметр.)'},      iv:[1,7/5,49/25]},
  ]},
 ],
 /* ── (набор 'pyth' — чистые пифагоровы ОТНОШЕНИЯ — УДАЛЁН в P2 дуги «СТРОЙ ОТ»: аккорды Пифагора теперь из собственных нот
    инструмента, набор 'natfix' + gridChords; другим ладом он не использовался, оставлять его ловушкой нельзя.) */
 /* ── Натуральный строй (5-предел, cents-лад edo:12): ТА ЖЕ лексика аккордов, что у Хроматики/
    Пифагора, но intervals — ЧИСТЫЕ 5-ПРЕДЕЛЬНЫЕ ОТНОШЕНИЯ прямо из обертонового ряда. Полутон→
    отношение: 0=1/1 1=16/15 2=9/8 3=6/5 4=5/4 5=4/3 6=45/32 7=3/2 8=8/5 9=5/3 10=9/5 11=15/8, выше
    октавы ·2^(эт//12). БОЛЬШАЯ ТЕРЦИЯ 5/4 = 386.31¢ — ЧИСТАЯ (замок 4:5:6, без биения), против
    резкой пифагоровой 81/64 = 407.82¢: обе терции расходятся на СИНТОНИЧЕСКУЮ КОММУ (21.5¢), а
    квинты у них ОДИНАКОВЫ (обе чистые 3/2). A/B-контраст: переключи Пифагор↔Натуральный на одном
    аккорде — терция из «бьётся» станет «замерла». chordFreqs берёт cents-ветку (s.cents && ty, как
    Партч; Пифагор с P2 — из сетки): корень из cents-оверлея, аккордовая нота = корень·ratio. Колонки/метки 1-в-1 с chrom12. */
 nat:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
    {label:'M',     full:{en:'Major · 4:5:6 pure, beatless', ru:'Мажор · 4:5:6 чистый, без биения'}, iv:[1,5/4,3/2]},
    {label:'maj7',  full:{en:'Maj7 · seventh 15/8', ru:'Maj7 · септима 15/8'},              iv:[1,5/4,3/2,15/8]},
    {label:'7',     full:{en:'Dominant 7th · 9/5', ru:'Домин.7 · 9/5'},                    iv:[1,5/4,3/2,9/5]},
    {label:'6',     full:{en:'Major 6 · sixth 5/3', ru:'Мажор 6 · секста 5/3'},             iv:[1,5/4,3/2,5/3]},
    {label:'add9',  full:'Add9 · 9/4',                       iv:[1,5/4,3/2,9/4]},
    {label:'7#9',   full:'7#9 · 12/5',                       iv:[1,5/4,3/2,9/5,12/5]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
    {label:'m',     full:{en:'Minor · third 6/5 pure', ru:'Минор · терция 6/5 чистая'},        iv:[1,6/5,3/2]},
    {label:'m7',    full:{en:'Minor 7 · 9/5', ru:'Минор 7 · 9/5'},                    iv:[1,6/5,3/2,9/5]},
    {label:'m6',    full:{en:'Minor 6 · 5/3', ru:'Минор 6 · 5/3'},                    iv:[1,6/5,3/2,5/3]},
    {label:'mM7',   full:{en:'Minor-major 7 · 15/8', ru:'Мин-мажор 7 · 15/8'},               iv:[1,6/5,3/2,15/8]},
    {label:'m9',    full:{en:'Minor 9 · 9/4', ru:'Минор 9 · 9/4'},                    iv:[1,6/5,3/2,9/5,9/4]},
    {label:'madd9', full:{en:'Minor add9 · 9/4', ru:'Минор add9 · 9/4'},                 iv:[1,6/5,3/2,9/4]},
  ]},
  {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[
    {label:'dim',   full:{en:'Diminished · 45/32', ru:'Уменьшённое · 45/32'},              iv:[1,6/5,45/32]},
    {label:'m7b5',  full:{en:'Half-diminished', ru:'Полууменьшённое'},                  iv:[1,6/5,45/32,9/5]},
    {label:'dim7',  full:{en:'Diminished 7th · 5/3', ru:'Ум. септаккорд · 5/3'},             iv:[1,6/5,45/32,5/3]},
    {label:'aug',   full:{en:'Augmented · 8/5', ru:'Увеличенное · 8/5'},                iv:[1,5/4,8/5]},
    {label:'aug7',  full:{en:'Augmented 7', ru:'Увелич. 7'},                        iv:[1,5/4,8/5,9/5]},
    {label:'augM7', full:{en:'Augmented-major 7', ru:'Увелич.-мажор 7'},                  iv:[1,5/4,8/5,15/8]},
  ]},
  {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[
    {label:'sus2',  full:'Sus2 · 9/8',                       iv:[1,9/8,3/2]},
    {label:'sus4',  full:{en:'Sus4 · 4/3 (pure fourth)', ru:'Sus4 · 4/3 (чистая кварта)'},       iv:[1,4/3,3/2]},
    {label:'7sus4', full:'7sus4',                            iv:[1,4/3,3/2,9/5]},
    {label:'6/9',   full:{en:'Major 6/9', ru:'Мажор 6/9'},                        iv:[1,5/4,3/2,5/3,9/4]},
    {label:'maj9',  full:'Maj9',                             iv:[1,5/4,3/2,15/8,9/4]},
    {label:'13',    full:{en:'13 · sixth 10/3', ru:'13 · секста 10/3'},                 iv:[1,5/4,3/2,9/5,10/3]},
  ]},
 ],
 /* ── Натуральный ФИКСИРОВАННЫЙ (клавесин): ТА ЖЕ 24-аккордовая лексика, что chrom12/nat, но iv —
    ЦЕЛЫЕ ПОЛУТОНОВЫЕ СМЕЩЕНИЯ (как chrom12, НЕ отношения). chordFreqs с веткой s.gridChords читает
    ноту (корень+off) ИЗ cents-сетки строя — оттого часть аккордов чистые, часть волк (см. коммент
    ветки). Структура/метки 1-в-1 с chrom12; отличается только тем, что лад (gridChords) трактует
    эти же числа через фиксированную сетку, а не 12-TET. Разметки «волк» в UI НЕТ — учит ухо. */
 natfix:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
    {label:'M',     iv:[0,4,7]},
    {label:'maj7',  iv:[0,4,7,11]},
    {label:'7',     iv:[0,4,7,10]},
    {label:'6',     iv:[0,4,7,9]},
    {label:'add9',  iv:[0,4,7,14]},
    {label:'7#9',   iv:[0,4,7,10,15]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
    {label:'m',     iv:[0,3,7]},
    {label:'m7',    iv:[0,3,7,10]},
    {label:'m6',    iv:[0,3,7,9]},
    {label:'mM7',   iv:[0,3,7,11]},
    {label:'m9',    iv:[0,3,7,10,14]},
    {label:'madd9', iv:[0,3,7,14]},
  ]},
  {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[
    {label:'dim',   iv:[0,3,6]},
    {label:'m7b5',  iv:[0,3,6,10]},
    {label:'dim7',  iv:[0,3,6,9]},
    {label:'aug',   iv:[0,4,8]},
    {label:'aug7',  iv:[0,4,8,10]},
    {label:'augM7', iv:[0,4,8,11]},
  ]},
  {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[
    {label:'sus2',  iv:[0,2,7]},
    {label:'sus4',  iv:[0,5,7]},
    {label:'7sus4', iv:[0,5,7,10]},
    {label:'6/9',   iv:[0,4,7,9,14]},
    {label:'maj9',  iv:[0,4,7,11,14]},
    {label:'13',    iv:[0,4,7,10,21]},
  ]},
 ],
};
/* Набор семейств текущего лада. Ключ — свойство лада; неизвестный ключ и лад без
   типизации откатываются на 12-TET, чтобы вызывающий никогда не получил undefined. */
export const chordFams=(s=CUR())=>CHORD_FAM_SETS[s.typedChords]||CHORD_FAM_SETS.chrom12;
/* Имя корня для подписи типизированного аккорда (тип дописывает вызывающий). */
/* ⚠️ ТОНИКА ОСТАЁТСЯ ЖИВОЙ, И ЭТО НЕ НЕДОСМОТР (общее правило всех подписей ниже). В событии заморожен
   ЛАД (правило #7), а тоника — глобальная и живая: высоту переигровка тоже берёт от живой тоники
   (baseF/fixedSlot). Замороженная в подписи тоника разошлась бы с тем, что звучит. */
export const rootName=(deg,s=CUR())=>{ const n=s.iv.length, d=((deg%n)+n)%n;
  return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12] : 'ст'+s.iv[d]; };

/* ================= ТЕОРИЯ: СТУПЕНИ, АККОРДЫ, ИМЕНА =================
   ФОРМУЛЫ ВЫСОТЫ СЕГОДНЯ (их сведёт в одну функция высоты T1 универсальной модели строя):
     равный строй:   f = f_тоники · P^(регистр) · P^(n / N)   — P = periodOf (октава 2, тритава 3 у Болена–Пирса, квинта 3/2 у Карлос);
     центовый строй: f = f_тоники · 2^(регистр) · 2^(центы_ступени / 1200);
     фиксированный:  f = f_якоря · 2^(регистр+перенос) · 2^(центы[ключ+шаг] / 1200) (fixedKey, ниже).
   Для 12-TET шаг = полутон (100 центов), для 24-TET = четвертьтон (50 центов),
   для 19-TET = 63.2 цента, для 31-TET = 38.7 цента. */
export const isTert=s=>s.tag==='dia'||s.tag==='ethnic'||s.tag==='maqam';
export const fifthStep=edo=>Math.round(edo*Math.log2(1.5)); // шаг, ближайший к чистой квинте 702c
const stepFor=(edo,ratio)=>Math.round(edo*Math.log2(ratio)); // шаг, ближайший к чистому интервалу ratio
 
/* КОНТЕКСТНАЯ ЛОГИКА АККОРДОВ:
   · 7-ступенчатые лады (диатоника, венгерский, макамы) — наслоение терций:
     индексы i, i+2, i+4 (+ i+6 для септаккордов), % длины массива с переносом октавы;
   · пентатоника / блюз / хроматика — терции дают кашу → пауэр-аккорды (I + V + октава);
   · 19/31-TET — квинту ищем математически: round(N·log2(3/2)) шагов ≈ 700 центов,
     получаются открытые микротональные аккорды без диссонирующих кластеров. */
/* s (лад) и sev (септаккорд?) — параметры со значениями по умолчанию из живого состояния:
   петля передаёт СВОЙ замороженный лад/септаккорд (§3.4), живой ввод — берёт текущие. */
export function chordSteps(deg, s=CUR(), sev=seventh, ty=null){
  const n=s.iv.length;
  if (ty){                                   // типизированный аккорд: интервалы от корня, лад не диктует
    const r=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
    return ty.map(iv=>r+iv);
  }
  if (isTert(s)){
    const ks=sev?[0,2,4,6]:[0,2,4];
    return ks.map(k=>{const j=deg+k; return s.iv[j%n]+s.edo*Math.floor(j/n);});
  }
  const r=s.iv[deg%n]+s.edo*Math.floor(deg/n);
  if (s.tag==='edo'){
    /* Мезотоника (19/31-TET): аккорд строим ПО ИНТЕРВАЛУ, не по индексу.
       Отношения заданы на ладе (chord/chord7); 31-TET септаккорд = 4:5:6:7. */
    const rs=sev?s.chord7:s.chord;
    return rs.map(ra=>r+stepFor(s.edo,ra));
  }
  return [r, r+fifthStep(s.edo), r+s.edo];   // пентатоника/блюз/хроматика — пауэр-аккорд как раньше
}
/* ⚠️ T1: три комментария ниже и fixedSlot описывают ПРЕЖНИЕ ветви высоты — сегодня это legacyLeadFreq/legacyBassFreq/legacyChordNotes/
   legacyCentsOf (только для пробы); оборачивание ступени и перенос в регистр новая функция повторяет тем же законом. */
/* Модуло-страховка: ступень вне лада (перенос фразы в лад покороче, §3.7) заворачивается
   с переносом октавы — сохраняет контур, не роняет частоту в NaN. При ступени внутри лада
   это тождество (i=deg, o=oct). CLAUDE.md: тихого NaN быть не должно. */
/* cx — ОВЕРЛЕЙ ЦЕНТОВ: если у лада есть s.cents (неравномерный строй), высоту ступени
   в пределах октавы задаёт он (2^(центы/1200)), а не равный шаг edo. ivx остаётся
   СТРУКТУРНЫМ (число ступеней, перенос октавы, оборачивание i) — период по-прежнему
   октава, регистр Math.pow(2,o) не трогаем. cents.length===iv.length, поэтому дописанные
   верхушки (edo→структура, 1200→центы) дают cx и ivx одинаковой длины. Нет s.cents —
   выражение байт-в-байт прежнее. */
/* fixedKey: сетка приколочена к ЯКОРЮ (anchorOf: C у пяти исторических темпераций, у Пифагора — его «строй от», P3), ТОНИКА =
   КЛЮЧ (индекс в сетку, не множитель). Ступень i звучит на АБСОЛЮТНОЙ позиции сетки (keyOf+шаг; при якоре C — tonic+шаг): slot — нота в октаве, carry — перенос октавы (напр. квинта
   от B уходит в следующую октаву). Якорь cFix (та же опора aRef). o — регистр (палец), carry
   складывается с ним. При тонике C (0) — байт-в-байт прежняя cents-ветка. */
function fixedSlot(s,step){ const L=s.cents.length, abs=keyOf(s)+step; return {slot:((abs%L)+L)%L, carry:Math.floor(abs/L)}; }
/* ═══ ОДНА ФУНКЦИЯ ВЫСОТЫ (слайс T1 универсальной модели строя, HANDOFF «ПЛАН „УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ“») ═══
   hz = A · P^R · ρ(k). T — строй (TUNINGS), A — частота высоты строя z (ЯКОРЬ), уже поделённая для роли В СЕГОДНЯШНЕМ ПОРЯДКЕ
   (baseF()/4 у баса, /2 у аккордов, cFix у фиксированных строёв), k — индекс в строе, R — регистр.
     • РАВНЫЙ строй (форма генератора): ρ(k) = P^((k−z)/E), k НЕ приводится — шаг аккорда через период, как в прежней равной ветке;
     • ТАБЛИЦА: ρ(k) = 2^((c[k mod N] − c[z])/1200) (центы — всегда двоичные), перенос ⌊k/N⌋ уходит в регистр: P^(R+перенос).
   ⛳ ПОБИТНО ПРЕЖНЕЕ: порядок умножений и вид каждого выражения взяты из прежних ветвей (их копии — legacy* ниже; читает ТОЛЬКО проба
   src/scaleprobe.js). По семействам:
     равные строи: A·P^o·P^(шаг/edo) — то же выражение (k − 0 === k);
     центовые подвижные: c[k] − c[0] = c[k] − 0 — точно; ДУБЛЬ ТОНИКИ прежде звучал ·2^(1200/1200)=·2 в регистре o, теперь — переносом:
       ·2^(o+1)·2^0 — оба точное умножение на степень двойки, результат один и тот же;
     фиксированные (fixedKey) и сетка аккордов: та же форма cFix·2^(o+перенос)·2^(c/1200), k = ключ + шаг лада;
     раги на сетке 22 шрути — те же литералы центов; Баранг (z = 1, Пелог) — вычитания целых (258−120=138 …) точны.
   ⛔ Это довод, а не доказательство. Доказательство — проба: слайс принят ТОЛЬКО при нуле несовпадений (=== по всем ладам, ролям,
   ступеням, регистрам, тоникам, эталонам A4 и якорям). Порядок операций здесь НЕЛЬЗЯ «упрощать»: (A·x)·y ≠ A·(x·y) в плавающей точке. */
export function pitchHz(T,A,z,k,R){
  if(T.equal!=null) return A*Math.pow(T.period,R)*Math.pow(T.period,(k-z)/T.equal);
  const C=T.cents, N=C.length, idx=((k%N)+N)%N, carry=Math.floor(k/N);
  return A*Math.pow(T.period,R+carry)*Math.pow(2,(C[idx]-C[z])/1200);
}
const tSize=T=>T.equal!=null ? T.equal : T.cents.length;     // сколько высот в периоде строя
/* ЯКОРЬ ЛАДА — две величины модели (A — частота, z — индекс строя, звучащий на ней) и КЛЮЧ (сдвиг ступеней лада внутри строя).
     фиксированный строй (fixedKey): индекс 0 строя — на ЯКОРЕ (cFix: «строй от» — C у пяти исторических, выбор у Пифагора), тоника
       выбирает КЛЮЧ (keyOf). «Строй от» = тоника (P3) даёт key 0 и cFix — то же выражение, что baseF: подвижный путь;
     подвижный: на тонике (baseF) звучит КОРЕНЬ лада (root — 0 у всех, кроме Баранга: Пелог, индекс 1), ключа нет.
   ⚠️ До T2 якорь собирается на каждый вызов из тех же cFix/keyOf/baseF, что читали прежние ветви; замороженный вид — T2. */
const modeAnchor=s=> s.fixedKey ? { A:cFix(s), z:0, key:keyOf(s) } : { A:baseF(), z:s.root, key:0 };
/* Индекс строя ступени i ∈ [0..n] (i = n — верхняя тоника, дубль: корень периодом выше — то, что IVX дописывает как edo). */
const degK=(s,i,T)=> i<s.sel.length ? s.sel[i] : s.root+tSize(T);
/* Мелодия и бас: ступень → индекс строя тем же оборачиванием, что прежде (длина IVX = n+1, переполнение — в регистр). */
export function leadFreq(deg,oct, s=CUR()){ const T=TUNINGS[s.tuning], len=s.iv.length+1, a=modeAnchor(s);
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return pitchHz(T,a.A,a.z,a.key+degK(s,i,T),o); }
export function bassFreq(deg,oct, s=CUR()){ const T=TUNINGS[s.tuning], len=s.iv.length+1, a=modeAnchor(s);   // бас на 2 октавы ниже соло (A/4 — константа-пол, не период)
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return pitchHz(T,a.A/4,a.z,a.key+degK(s,i,T),o); }
/* ⛳ НОТЫ АККОРДА — ОДИН ИСТОЧНИК (слайс U1 «аккорд как ноты»). chordNotes отдаёт каждую звучащую ноту: f — частоту, iv — её интервал
   в той же записи, в какой его читает ветка цены (полутоновое смещение / отношение / шаг лада от корня). chordFreqs — ровно её частоты,
   и движок (ENG.chOn/chSet) играет их, а редактор показывает ноты аккорда этой же функцией: второй копии правил построения нет.
   ⚠️ АРИФМЕТИКА НЕ ТРОНУТА: в каждой ветке частота считается тем же выражением, что и прежде, — меняется лишь то, что рядом с ней
   кладётся интервал. Звук побитно прежний. */
export function chordFreqs(deg,oct, s=CUR(), sev=seventh, ty=null){ return chordNotes(deg,oct,s,sev,ty).map(n=>n.f); }
/* ⛳ ЕДИНИЦА КОРНЯ (U4 «аккорд как ноты») — однонотный тип, чья цена есть САМ КОРЕНЬ: аккорд (ступень, регистр, chordUnit(s)) звучит
   ровно высоту РЯДА (ступень, регистр). Это КАНОНИЧЕСКАЯ ФОРМА ноты на ряду: так редактор пишет ноту, перенесённую по высоте.
   ⛔ Цены здесь нет — только ответ на вопрос «в какой записи ветка chordNotes читает интервал», в ТОМ ЖЕ порядке ворот, что ниже:
     · s.cents && s.gridChords → ветка сетки: интервал — целое полутоновое смещение по сетке, корень = [0];
     · s.cents (без сетки)     → ветка чистых отношений (Партч, подвижный Натуральный): корень × отношение, корень = [1];
     · период ≠ 2              → ветка периода (Болен–Пирс): корень × отношение, корень = [1];
     · иначе                   → равная ветка (chordSteps, типизированный путь: шаг корня + интервал): корень = [0] — и у
                                  типизированных наборов (chrom12/edo19/edo31), и у нетипизированных ладов (стопка терций / пауэр-аккорд:
                                  их нота 0 — тот же шаг корня тем же выражением).
   ⚠️ Нетипизированного cents-лада с аккордами нет (все cents-лады с аккордами типизированы; гамелан, шрути, раги — noChords), поэтому
   «единица по воротам» и «нота 0 нетипизированной стопки» совпадают у всех ладов. Новый вид цены — новая строка ЗДЕСЬ, рядом с веткой. */
export function chordUnit(s=CUR()){
  if(s.cents) return s.gridChords ? [0] : [1];
  return periodOf(s)!==2 ? [1] : [0];
}
/* Частота РЯДА (ступень, регистр) в регистре аккордов — частота КОРНЯ аккорда на этом ряду, по той же цене, что у chordNotes: аккорд из
   ЕДИНИЦЫ КОРНЯ (chordUnit — у типизированного лада это первый интервал любого его типа: все типы начинаются с корня; у нетипизированного
   — нота 0 стопки). По ней редактор ставит ноты аккорда на ряд или между рядами — и по ней же (U4) звучит нота, перенесённая на ряд. */
export function chordRowFreq(deg,oct, s=CUR(), sev=seventh){
  return chordNotes(deg,oct,s,sev, chordUnit(s))[0].f;
}
export function chordNotes(deg,oct, s=CUR(), sev=seventh, ty=null){ // база аккордов на октаву ниже соло
  /* T1: ВОРОТА ВЕТВЕЙ И ИХ ПОРЯДОК — ПРЕЖНИЕ (правила аккордов станут данными в T6); меняется только то, ЧЕМ считается высота: каждая
     ветвь зовёт одну функцию высоты (pitchHz). Доводы ветвей — в legacyChordNotes ниже (прежнее тело, только для пробы). */
  const T=TUNINGS[s.tuning], n=s.iv.length;
  if (s.cents && ty && s.gridChords){
    /* СЕТКА: ноты аккорда — высоты строя (ключ + ступень корня + целое смещение), перенос периода — в регистр. */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n), K=a.key+s.sel[d];
    return ty.map(off=>({ f: pitchHz(T,a.A/2,a.z,K+off,o), iv:off }));
  }
  if (s.cents && ty){
    /* ТОНЫ-ОТНОШЕНИЯ (Партч, подвижный Натуральный): корень — высота строя, нота — корень × отношение, как прежде. Эти тоны лежат
       ВНЕ строя; держим их явно, пока пользователь не решит каждый случай на слух (T7). */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=pitchHz(T,a.A/2,a.z,a.key+s.sel[d],o);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  const P=periodOf(s);
  if (P!==2 && ty){
    /* Болен–Пирс: корень — равный шаг в ПЕРИОДЕ (тритава), нота — корень × отношение (тоны-отношения, как выше). */
    const a=modeAnchor(s), d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=pitchHz(T,a.A/2,a.z,a.key+s.sel[d],o);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  /* РАВНАЯ ветка: шаги chordSteps — уже индексы равного строя (неприведённые), регистр oct — прежний.
     ⚠️ Нетипизированный аккорд на ЦЕНТОВОМ ладу (ty нет) попадает сюда и прежде ценился НОМИНАЛЬНЫМИ равными шагами (edo лада), а
     не своей таблицей. Из интерфейса это недостижимо (прогрессии — только у 7-ступенных ладов с аккордами, а все такие центовые лады
     noChords; живая игра на типизированных ладах всегда несёт тип), но ради побитной верности цена та же: номинальный равный строй
     { period, equal: edo }. Правила аккордов как данные — T6; там этот путь исчезнет. */
  const r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
  const TE= T.equal!=null ? T : { period:P, equal:s.edo };
  return chordSteps(deg,s,sev,ty).map(st=>({ f: pitchHz(TE,baseF()/2,0,st,oct), iv: st-r0 })); }
 
export function name24(q){ q=((q%24)+24)%24;      // имена четвертьтонов: чётный шаг = обычная нота,
  return q%2 ? NOTE_NAMES[(((q+1)/2)|0)%12]+'½♭' : NOTE_NAMES[(q/2)%12]; } // нечётный = полубемоль
export function stepName(st,s=CUR()){
  if (s.edo===12) return NOTE_NAMES[(((tonic+st)%12)+12)%12];
  if (s.edo===24) return name24(tonic*2+st);
  return 'ст'+(((st%s.edo)+s.edo)%s.edo);
}
export function rowLabel(deg,s=CUR()){ const ivx=IVX(s);
  if (s.edo===12||s.edo===24) return stepName(ivx[deg],s);
  const st=ivx[deg]%s.edo; return st===0?'Т':String(st);
}
/* Центы для экранной подсказки. У лада с s.cents — РЕАЛЬНЫЕ центы ступени (визуальная
   правда: play-tag показывает 231, а не 240), гейт на s.cents, поэтому прочие лады
   считают по-прежнему от номинального равного шага. На высоту не влияет.
   fixedKey: интервал над КЛЮЧОМ = cents[tonic+deg] − cents[tonic] (зависит от тональности —
   у Веркмайстера терция читает 390¢ в C и 408¢ в F#, тот самый урок). При тонике C — как было. */
export const centsOf=(deg,s=CUR())=>{
  /* T1: по ЗАПИСИ строя (центы ступени — разность высот строя).
     ⛳ ОДНО ПРАВИЛО (решение пользователя, слайс «дрон и центы»): ЦЕЛЫЕ ЦЕНТЫ ВЕЗДЕ — точное значение округляется ОДИН раз. Прежде было
     три правила (десятые у фиксированных, сырые у подвижных таблиц, целые у равных); ошибка меньше полуцента далеко за пределом слуха,
     а точные значения остаются в ДАННЫХ (TBL, TUNINGS) — для конструктора ладов. ⚠️ Именно ТОЧНОЕ, а не прежние десятые: двойное
     округление (десятые, потом целые) у 17 из 936 случаев фиксированных строёв дало бы на единицу больше (мезотон: тритон 579.47¢ →
     579.5 → 580 вместо 579). Свёртка в период — прежняя у каждого вида (у фиксированных верхняя тоника читает 1200, у прочих 0).
     Вызывающие передают ступень 0..n; за пределами — оборачивание по n+1 (прежде у равных было NaN, у таблиц — оборачивание). */
  const T=TUNINGS[s.tuning], len=s.iv.length+1, K=degK(s,((deg%len)+len)%len,T);
  if(s.fixedKey){ const key=keyOf(s), k=key+K, C=T.cents, N=C.length, idx=((k%N)+N)%N, carry=Math.floor(k/N);
    return Math.round(C[idx]+1200*carry-C[key]); }            // урок фиксированного строя (390 против 408) виден и в целых центах
  if(T.equal==null){ const C=T.cents, N=C.length, idx=((K%N)+N)%N, carry=Math.floor(K/N);
    return Math.round((C[idx]+1200*carry-C[s.root])%1200); }  // центы таблицы над корнем лада (раги, гамелан, Партч) — целыми
  const pc=1200*Math.log2(T.period);   // центы ПЕРИОДА: октава 1200, тритава ≈1901.955 (BP)
  return Math.round(Math.round(K*pc/T.equal)%pc); };          // у неоктавных (pc дробный) верхняя тоника давала 0.045 — теперь 0

/* ═══ ДРОН — «КАК БЫЛО БЫ В ЖИВОМ ИСПОЛНЕНИИ» (слайс «дрон и центы», решение пользователя, HANDOFF) ═══
   Настоящий дрон — тампура, волынка, колёсная лира — настраивается на слух ЧИСТЫМИ интервалами, поэтому вторая струна — СОБСТВЕННАЯ
   высота СТРОЯ, а не постоянная ×1.498, и она СЛЕДУЕТ ЗА ЛАДОМ, как тампурист строит струну под рагу: ⛔ дрон никогда не тянет высоту,
   которой в ладу нет.
   ⛳ ВЫБОР СТУПЕНИ — ОДНО общее правило по выборке лада, без частных случаев (годится и для ладов пользователя):
     центы каждой ступени над корнем лада — ТОЧНЫЕ, из строя (degCentsExact); ищется ступень, БЛИЖАЙШАЯ к цели, и берётся, если она
     в пределах DRONE_TOL (17¢). Цели по порядку:
       1) квинта 3/2 (701.955¢) — у любого строя (у Карлос ПЕРИОД и есть 3/2 — верхняя тоника ложится ровно на неё, правило находит его
          само, частного случая нет);
       2) только у ОКТАВНЫХ строёв (кварта и септима — понятия октавы): кварта 4/3 (498.045¢), затем септима — 15/8 (1088.3¢, большая
          «Ни»), 9/5 (1017.6¢), 16/9 (996.1¢) (малые);
       3) у НЕОКТАВНОГО строя без квинты (Болен–Пирс) — выбор DRONE_NONOCT: 'cons' (УМОЛЧАНИЕ, выбор пользователя на слух при T3) —
          ступень, ближайшая к 5/3 (884.4¢; у Б–П 6 шагов = 877.6¢), или 'period' — тоника ПЕРИОДОМ выше (тритава 3:1);
       4) не нашлось ничего — тоника периодом выше (верхняя тоника: она есть в любом ладу).
   ⛳ ДОПУСК 17¢ — ОБОСНОВАН ДАННЫМИ (проверено по таблицам всех встроенных строёв во всех ключах): он принимает КАЖДУЮ квинту, которую
     строй считает квинтой (худшие — слендро +15.0¢, 19-TET −7.2¢, хорошие темперации до −5.9¢, мезотон −5.4¢), и ОТВЕРГАЕТ волков
     (пифагоров −23.5¢, фиксированный Натуральный −21.5¢ на D и Bb и +19.6¢ на F# — «квинта на комму шире», волк мезотона +35.7¢) и
     ближайшую к квинте ступень Болена–Пирса (+29.6¢). Граница лежит между 15.0¢ (слендро) и 19.6¢ (волк Натурального) — с запасом в обе стороны. Волк — по определению не квинта; тампурист не станет тянуть волка, а
     настроит кварту — так и делает правило (Пифагор от C в ключе F#: квинта — волк, дрон берёт чистую кварту F#–B).
   ⛳ УМОЛЧАНИЕ Б–П — СТУПЕНЬ 5:3 (878¢): РЕШЕНИЕ ПОЛЬЗОВАТЕЛЯ НА СЛУХ (записано при T3), сравнившего обе кандидатуры консолью render.js
     (R.droneBP('cons'|'period')). Прежнее умолчание слайса «дрон и центы» — тритава (3:1, собственная эквивалентность строя); переключатель
     оставлен, чтобы её можно было услышать.
   ⚠️ Дрон читает ЖИВОЙ лад (CUR — как и прежде: tonicFreq() без аргумента), а не замороженный лад события дрона. Его корень —
     tonicFreq()/2, побитно прежний; вторая струна — та же функция высоты (pitchHz) в регистре корня (A/2): высота строя, та же, что
     у мелодии в этом ладу, — дрон не бьётся с нотами лада. */
export const DRONE_TOL=17;   // ¢ — см. довод выше: между слендро (+15.0, квинта) и волком Натурального (+19.6, не квинта)
const C_OF=r=>1200*Math.log2(r);
const DRONE_FIFTH=C_OF(3/2), DRONE_OCT_FALLBACK=[C_OF(4/3), C_OF(15/8), C_OF(9/5), C_OF(16/9)], DRONE_CONS=C_OF(5/3);
let DRONE_NONOCT='cons';   // T3: решение пользователя на слух — ступень 5:3 Болена–Пирса (878¢); 'period' — тритава, слышна через R.droneBP('period')
export const droneNonOct=()=>DRONE_NONOCT;
export const setDroneNonOct=v=>{ DRONE_NONOCT = v==='period' ? 'period' : 'cons'; };   // неизвестное значение → умолчание ('cons')
/* Точные центы ступени d (0..n) над корнем лада — из строя (у фиксированного — над КЛЮЧОМ, как показ центов). */
export function degCentsExact(d, s=CUR()){
  const T=TUNINGS[s.tuning], K=degK(s,d,T);
  if(T.equal!=null) return (K-s.root)*1200*Math.log2(T.period)/T.equal;
  const key=s.fixedKey?keyOf(s):0, C=T.cents, N=C.length;
  const at=k=>C[((k%N)+N)%N]+1200*Math.floor(k/N);
  return at(key+K)-at(key+s.root);
}
/* Какую ступень берёт вторая струна дрона: { deg, why: 'fifth'|'fourth'|'seventh'|'cons'|'period', cents }. */
export function droneDegree(s=CUR()){
  const n=s.iv.length, cs=[];
  for(let d=1; d<=n; d++) cs.push([d, degCentsExact(d,s)]);
  const near=c=>{ let best=null, bd=Infinity; for(const [d,x] of cs){ const e=Math.abs(x-c); if(e<bd){ bd=e; best=d; } } return bd<=DRONE_TOL ? best : null; };
  const pick=(d,why)=>({ deg:d, why, cents:degCentsExact(d,s) });
  let d=near(DRONE_FIFTH); if(d!=null) return pick(d,'fifth');
  if(TUNINGS[s.tuning].period===2){
    d=near(DRONE_OCT_FALLBACK[0]); if(d!=null) return pick(d,'fourth');
    for(const c of DRONE_OCT_FALLBACK.slice(1)){ d=near(c); if(d!=null) return pick(d,'seventh'); }
  }else if(DRONE_NONOCT==='cons'){ d=near(DRONE_CONS); if(d!=null) return pick(d,'cons'); }
  return pick(n,'period');
}
/* Частота второй струны дрона — та же функция высоты, в регистре корня дрона (A/2, как tonicFreq()/2). */
export function droneSecondHz(s=CUR()){
  const T=TUNINGS[s.tuning], a=modeAnchor(s), d=droneDegree(s).deg;
  return pitchHz(T, a.A/2, a.z, a.key+degK(s,d,T), 0);
}
/* ⛳ T3: ВЫСОТА ПРОИЗВОЛЬНОЙ ВЫСОТЫ СТРОЯ В РЕГИСТРЕ АККОРДОВ — для приглушённых рядов редактора (высоты строя вне лада). j — сдвиг в
   строе над КОРНЕМ лада (0..размер строя; = degK − root), oct — регистр. Та же функция высоты и та же доля роли, что у chordNotes (A/2):
   ряд вне лада звучал бы ровно этой высотой — по ней редактор ставит ноты аккорда на такой ряд (квинта пауэр-аккорда пентатоники).
   ⚠️ Никто этим не ИГРАЕТ (звук нот — по-прежнему chordNotes); только показ. */
export function chordPitchHz(j,oct, s=CUR()){
  const T=TUNINGS[s.tuning], a=modeAnchor(s);
  return pitchHz(T, a.A/2, a.z, a.key+s.root+j, oct);
}
/* ═══ LEGACY (слайс T1) — ПРЕЖНИЕ тела функций высоты, СЛОВО В СЛОВО, под другими именами. ═══
   ⛔ Их читает ТОЛЬКО проба src/scaleprobe.js (сравнение === с новыми). В приложении их не зовёт никто — и звать нельзя: высота
   приложения — одна функция pitchHz. Удаляются отдельным слайсом после того, как проба покажет ноль и ухо подтвердит. */
export const legacyTonicFreq=(s=CUR())=> s.fixedKey ? cFix(s)*Math.pow(2,s.cents[keyOf(s)]/1200) : baseF();
export function legacyLeadFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length, P=periodOf(s);
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,ivx[i]); return cFix(s)*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
  const cx=s.cents?s.cents.concat([1200]):null;
  const r=cx?Math.pow(2,cx[i]/1200):Math.pow(P,ivx[i]/s.edo);   // равный шаг — в ПЕРИОДЕ лада (P^(шаг/edo)); cents-ветка октавная (2/1200), её не трогаем
  return baseF()*Math.pow(P,o)*r; }                             // регистр — на ПЕРИОД (BP: тритава 3^oct); P=2 у прочих — байт-в-байт
export function legacyBassFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length, P=periodOf(s); // бас на 2 октавы ниже соло (baseF/4 — константа-пол, не период)
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,ivx[i]); return cFix(s)/4*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
  const cx=s.cents?s.cents.concat([1200]):null;
  const r=cx?Math.pow(2,cx[i]/1200):Math.pow(P,ivx[i]/s.edo);
  return baseF()/4*Math.pow(P,o)*r; }
export function legacyChordNotes(deg,oct, s=CUR(), sev=seventh, ty=null){ // база аккордов на октаву ниже соло
  if (s.cents && ty && s.gridChords){
    /* ФИКСИРОВАННЫЙ cents-строй (Натуральный клавесин): ноты аккорда берутся ИЗ СЕТКИ, а не строятся
       чистым отношением от корня. ty здесь — ЦЕЛЫЕ ПОЛУТОНОВЫЕ СМЕЩЕНИЯ (как chrom12), а не ratio:
       нота = ступень (корень+off) из cents-сетки, с переносом октавы для off≥12 (add9=14, 13=21).
       Отсюда часть аккордов ЧИСТЫЕ (корни 0,1,3,5,7,8 у мажора), а часть — ВОЛК (квинта −21.5¢ на
       корнях 2,10; терции +41¢ на 4,9,11): ровно проблема фиксированной чистой интонации, ради которой
       и придумали темперации. Гейт СТОИТ ПЕРВЫМ — до pure-ratio ветки; без gridChords лады (Партч/
       подвижный Натуральный) идут прежним путём ниже, байт-в-байт; Пифагор с P2 дуги «СТРОЙ ОТ» — ЗДЕСЬ, из своей сетки. off=0 даёт корень 1-в-1.
       fixedKey: индекс включает ТОНИКУ (КЛЮЧ) — корень и голоса из АБСОЛЮТНОЙ позиции сетки
       (tonic+deg+off), поэтому окраска аккорда зависит от тональности (C-мажор мягок, F#-мажор резок);
       якорь cFix (та же опора). При тонике C (0) — байт-в-байт прежняя формула. P1: ключ — keyOf(s), якорь — cFix(s) (при якоре C —
       ровно прежние tonic и высота C). P3: у Пифагора якорь — его «строй от» (вариант лада, scaleView): «следует за тоникой» даёт
       keyOf=0 и cFix=baseF() — аккорды каждой тональности одинаковы; закреплённый якорь даёт краски тональностей. */
    const L=s.cents.length, key=s.fixedKey?keyOf(s):0, anchor=s.fixedKey?cFix(s):baseF();
    const d=key+((deg%L)+L)%L, o=oct+Math.floor(deg/L);
    return ty.map(off=>{ const g=d+off, gi=((g%L)+L)%L, carry=Math.floor(g/L);
      return { f: anchor/2*Math.pow(2,o+carry)*Math.pow(2,s.cents[gi]/1200), iv:off }; });
  }
  if (s.cents && ty){
    /* Cents-строй + типизированный аккорд (Партч): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ от корня, не
       шаги edo. Корень = высота ступени из cents-оверлея (как в leadFreq), аккордовая нота =
       корень * ratio НАПРЯМУЮ — без 2^(шаг/edo), который на 43 неравных ступенях врёт. Расширения
       выше октавы (ratio>2, напр. 36/11) множатся как есть — аутентичный Партч. Ветка только для
       cents-лада С типизацией (Партч, подвижный Натуральный); прочие лады без s.cents ниже.
       ⚠️ Ветка fixedKey внутри (корень на фиксированной сетке, аккорд чистыми отношениями над ним) служила ПИФАГОРУ до P2 дуги
       «СТРОЙ ОТ»; с P2 его аккорды — из собственной сетки (ветка выше), и сегодня fixedKey-лада с отношениями нет — ветка
       дремлет, оставлена ради формулы корня (через keyOf/cFix). Гейт на s.fixedKey, НЕ на s.cents: подвижный Натуральный
       (nat, без fixedKey) остаётся байт-в-байт. */
    const n=s.iv.length, d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    let rootF;
    if(s.fixedKey){ const {slot,carry}=fixedSlot(s,d); rootF=cFix(s)/2*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
    else rootF=baseF()/2*Math.pow(2,o)*Math.pow(2,s.cents[d]/1200);   // подвижный Натуральный: корень из cents-оверлея над живой тоникой, как было
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  const P=periodOf(s);
  if (P!==2 && ty){
    /* Неоктавный ПЕРИОД-равный лад + типизированный аккорд (Болен–Пирс): корень — равным шагом
       В ПЕРИОДЕ (P^(iv/edo), как leadFreq), аккордовая нота = корень*ratio НАПРЯМУЮ — интервалы
       подгруппы 3.5.7 суть ЧИСТЫЕ ОТНОШЕНИЯ, а не шаги edo (chordSteps их бы принял за шаги —
       мимо строя). Регистр — на ПЕРИОД: P^o = тритава (не 2^o). ratio>P (тетрада 3:5:7:9 → 3)
       множится как есть — ровно тритавой выше, аутентично BP. Ветка ДРЕМЛЕТ у всех прежних ладов:
       period нет → P===2 → сюда не входят; nonoct-лад без ty (не должно быть) уходит вниз. */
    const n=s.iv.length, d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=baseF()/2*Math.pow(P,o)*Math.pow(P,s.iv[d]/s.edo);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  // равная ветка: регистр и шаг — в ПЕРИОДЕ лада (P=2 у всех аккордовых ладов ⇒ байт-в-байт)
  /* iv — шаг ноты ОТ КОРНЯ (у типизированного — сам интервал типа; у стопки терций / пауэр-аккорда — разность с шагом корня, тем же
     выражением корня, что у chordSteps): с ним аккорд из одной ноты [iv] сыграет ровно эту частоту (типизированная ветка chordSteps). */
  const n=s.iv.length, r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
  return chordSteps(deg,s,sev,ty).map(st=>({ f: baseF()/2*Math.pow(P,oct)*Math.pow(P,st/s.edo), iv: st-r0 })); }
export const legacyCentsOf=(deg,s=CUR())=>{
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,deg); return Math.round((s.cents[slot]+1200*carry-s.cents[keyOf(s)])*10)/10; }   // ДЕСЯТЫЕ: разница 386.3 vs 407.8 — и есть предмет; целые прятали бы точность
  if(s.cents){ const cx=s.cents.concat([1200]); return cx[deg%cx.length]%1200; }
  const pc=1200*Math.log2(periodOf(s));   // центы ПЕРИОДА: октава 1200 (P=2, байт-в-байт), тритава ≈1901.955 (BP) — честный шаг ~146.3¢
  return Math.round(IVX(s)[deg]*pc/s.edo)%pc; };


/* ===== Индийская классика: свары (саргам) + ПОДЛИННЫЕ имена 22 шрути (по РЕАЛЬНЫМ центам) =====
   ДВЕ таблицы, обе по центам сетки → грид и раги смотрят на ОДНИ И ТЕ ЖЕ центы, подписи не разъедутся.
   SWARA_OF — свара по области высоты (Са/Ре/Га/Ма/Па/Дха/Ни; ♭ комаль, ♯ тивра-Ма). Са и Па — ачала
   (неподвижны). Комма-ПАРЫ (90/112, 386/408, …) раньше различали НАШИМ штрихом ′ — это ВЫДУМКА. Теперь
   различаем ПОДЛИННЫМ ИМЕНЕМ ШРУТИ (у традиции они есть) — SHRUTI_OF, по одному на каждую из 22 позиций.
   КОНВЕНЦИЯ (источники расходятся — фиксируем выбор): КЛАССИЧЕСКАЯ, Сангита-Ратнакара (Шарнгадева, XIII в.).
   Шрути — это ПОДХОД к сваре; сама нота звучит на ПОСЛЕДНЕЙ шрути своей группы (размеры 4-3-2-4-4-3-2 = 22):
   Са=Чхандовати (4-я), Ре=Ратика (7-я), Га=Кродха (9-я), Ма=Марджани (13-я), Па=Алапини (17-я),
   Дха=Рамья (20-я), Ни=Кшобхини (22-я). Поэтому тоника — «Са · Чхандовати», НЕ «Са · Тивра» («тивра» =
   острый, на тонике бессмысленно; Тивра/Кумудвати/Манда — подход СНИЗУ к Са, т.е. верх октавы 1018/1088/1110).
   Свары-носители тут — древней Са-грамы (Ре 10/9, Га 32/27, Дха 5/3, Ни 16/9 ≈ кафи-тхат), поэтому
   Кродха/Кшобхини садятся в то, что СОВРЕМЕННО зовётся комаль (SWARA_OF — область высоты современная, НЕ
   меняем; имя шрути — классическое). АЛЬТЕРНАТИВА (НЕ берём): современная позиционная имя[i]↔цент[i],
   Са=Тивра(1)/Па=Кшити(14) — частая в онлайн-таблицах, но поздняя упрощёнка. Источники: Сангита-Ратнакара
   (sreenivasaraos.com), kaminimusic.com (позиционная, для сверки). */
/* Свары — транслит {default:латиница, ru:кириллица}: имена собственные, не переводятся (Sa Re Ga Ma Pa Dha Ni). */
const SWARA_OF={0:{default:'Sa',ru:'Са'},90:{default:'Re♭',ru:'Ре♭'},112:{default:'Re♭',ru:'Ре♭'},182:{default:'Re',ru:'Ре'},204:{default:'Re',ru:'Ре'},294:{default:'Ga♭',ru:'Га♭'},316:{default:'Ga♭',ru:'Га♭'},386:{default:'Ga',ru:'Га'},408:{default:'Ga',ru:'Га'},
  498:{default:'Ma',ru:'Ма'},520:{default:'Ma',ru:'Ма'},590:{default:'Ma♯',ru:'Ма♯'},612:{default:'Ma♯',ru:'Ма♯'},702:{default:'Pa',ru:'Па'},792:{default:'Dha♭',ru:'Дха♭'},814:{default:'Dha♭',ru:'Дха♭'},884:{default:'Dha',ru:'Дха'},906:{default:'Dha',ru:'Дха'},
  996:{default:'Ni♭',ru:'Ни♭'},1018:{default:'Ni♭',ru:'Ни♭'},1088:{default:'Ni',ru:'Ни'},1110:{default:'Ni',ru:'Ни'}};
/* Имена 22 шрути — транслит {default:латиница, ru:кириллица}: санскритские имена собственные. */
const SHRUTI_OF={0:{default:'Chandovati',ru:'Чхандовати'},90:{default:'Dayavati',ru:'Дайавати'},112:{default:'Ranjani',ru:'Ранджани'},182:{default:'Ratika',ru:'Ратика'},204:{default:'Raudri',ru:'Раудри'},294:{default:'Krodha',ru:'Кродха'},
  316:{default:'Vajrika',ru:'Ваджрика'},386:{default:'Prasarini',ru:'Прасарини'},408:{default:'Priti',ru:'Прити'},498:{default:'Marjani',ru:'Марджани'},520:{default:'Kshiti',ru:'Кшити'},590:{default:'Rakta',ru:'Ракта'},612:{default:'Sandipani',ru:'Сандипани'},
  702:{default:'Alapini',ru:'Алапини'},792:{default:'Madanti',ru:'Маданти'},814:{default:'Rohini',ru:'Рохини'},884:{default:'Ramya',ru:'Рамья'},906:{default:'Ugra',ru:'Угра'},996:{default:'Kshobhini',ru:'Кшобхини'},1018:{default:'Tivra',ru:'Тивра'},
  1088:{default:'Kumudvati',ru:'Кумудвати'},1110:{default:'Manda',ru:'Манда'}};
/* Подпись ступени deg: РЕАЛЬНЫЕ центы (как centsOf, с дописанной октавой 1200→0→Са) → свара. У полной
   сетки (свойство swaraFull) добавляем имя шрути «свара · имя» (различает комма-пары); у РАГ — только
   свара (раги поют/называют сварами: Са Ре Га Ма Па Дха Ни). Зовётся лишь для swaraNames-ладов, где все
   центы — члены сетки; фолбэк на порядковый — страховка. Точные центы всегда рядом (centsOf). */
export const swaraLbl=(deg,s=CUR())=>{ const cx=(s.cents||[]).concat([1200]), c=cx[deg%cx.length]%1200;
  return swaraOfCents(c, !!s.swaraFull) ?? String(deg+1); };
/* T3: имя высоты сетки шрути по ЕЁ ЦЕНТАМ — для приглушённых рядов редактора (шрути вне раги). full — «свара · шрути» (различает
   комма-пары), иначе только свара. Нет такой высоты в таблицах — null (вызывающий ставит свой запасной ярлык). */
export function swaraOfCents(c, full){ const sw=SWARA_OF[c]; if(!sw) return null;
  return full ? `${L(sw)} · ${L(SHRUTI_OF[c])}` : L(sw); }
 
export function qual(t,f){                         // качество трезвучия по интервалам (полутона)
  if(t===4&&f===7)return''; if(t===3&&f===7)return'm';
  if(t===3&&f===6)return'°'; if(t===4&&f===8)return'+';
  if(t===4&&f===6)return'♭5'; if(t===5&&f===7)return'sus4'; if(t===2&&f===7)return'sus2';
  return null;
}
export const SEV={'|11':'maj7','|10':'7','m|10':'m7','m|11':'m(maj7)','°|9':'°7','°|10':'ø',
           '+|11':'+(maj7)','+|10':'+7','♭5|10':'7♭5','sus4|10':'7sus4','sus2|10':'7sus2'};
/* sev — СЕПТАККОРД, тоже параметром (S5.4): он заморожен в событии (ev.sev) ровно как лад, поэтому
   подпись аккорда дорожки обязана читать ЕГО, а не живой тумблер панели. */
export function chordLabel(deg,s=CUR(),sev=seventh){
  const n=s.iv.length, d=deg%n;
  if (!isTert(s)){
    return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12]+'5' : 'ст'+s.iv[d]+'·5';
  }
  const st=chordSteps(deg,s,sev), r=st[0];
  if (s.edo===12){
    const root=NOTE_NAMES[(((tonic+r)%12)+12)%12];
    let q=qual(st[1]-r, st[2]-r);
    if (q==null) return root+'?';
    if (sev){ const sv=st[3]-r; q=SEV[q+'|'+sv] ?? (q+'⁷'); }
    return root+q;
  }
  return ROMAN[d]+(sev?'⁷':'');         // макам: римская ступень
}
/* ⛔ СТРЕЛКА, А НЕ `.map(stepName)` — И ЭТО НЕ КОСМЕТИКА. Array.map передаёт колбэку (значение, ИНДЕКС,
   массив), поэтому с новым вторым параметром индекс молча приехал бы на место ЛАДА: ошибки бы не было,
   а строка нот стала бы считаться по «ладу» 0,1,2… Точечная передача функции с умолчаниями запрещена
   везде, где колбэку дают больше одного аргумента. */
export const chordNotesStr=(deg,s=CUR(),sev=seventh)=>chordSteps(deg,s,sev).map(st=>stepName(st,s)).join('·');
