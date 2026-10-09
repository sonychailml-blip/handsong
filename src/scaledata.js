/* ═══ ⛳ ДАННЫЕ ЛАДОВ И СТРОЁВ — ФОРМА ФАЙЛА v1 (слайс F2 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   Здесь — ВСЕ встроенные строи, лады, палитры аккордов, наборы режимов аккордов, традиции и группы меню, каждая запись в форме будущего
   файла (format, version, стабильный id). Пока это JS-модуль (F5 разложит записи по файлам data/ и загрузит их при старте); СБОРЩИК в
   scales.js выводит из них РОВНО сегодняшние объекты приложения (SCALES, TUNINGS, CHORD_FAM_SETS, TRADITIONS, GRP) — ни один читатель не
   тронут. Доказательство — снимок F0 (P.checkFiles: ноль).
   ⛳ ФОРМА v1:
     manifest — порядок записей; порядок ladов = порядок меню (внутри корзины) и индекс i снимка F0; start — лад при старте (F5);
     menu     — traditions [{id, name}], groups {key → name};
     tuning   — {format:'handsong/tuning', version, id, period (дробь строкой), pitches: {equal: E} — равный, ФОРМА ГЕНЕРАТОРА (не список:
                так цена P^(k/E) остаётся побитно прежней) | {list: [{cents, ratio?}]} — таблица: центы — ЦЕНА (сегодняшние литералы
                как есть), отношение — ТЕОРИЯ (точная дробь строкой; согласие с центами — до половины последнего знака литерала центов);
                chordFit:'ratios' — тип аккорда проверяется на «целиком в строе» точными дробями (chordTypeFits; сегодня — Партч)};
     palette  — {format:'handsong/palette', version, id, kind: 'steps' (целые шаги/смещения) | 'ratios' (дроби строками), families};
     chordmodes — {format:'handsong/chordmodes', version, id, modes: [{id, nameKey, hintKey, set: {build?, palette?, rule?}}]} — набор
                режимов аккордов, на который ссылается лад; первый — умолчание; set ложится поверх полей лада в его виде;
     mode     — {format:'handsong/mode', version, id, tuning, name, menu: {tradition, group ('' — без группы)}, degrees (индексы строя —
                выборка), root, anchor: {policy: 'tonic' | 'fixed' (note: якорь) | 'choice'}, chords: {rule, palette?, grid?, build?, modes?},
                layout?: {rect}, naming?: {scheme?, detail?} (F3: схема имён СТУПЕНЕЙ, если не схема строя; detail — показывать вторую
                часть имени списка), compat: {tag}};
     у строя с F3 ещё naming: {scheme: 'notes12'|'notes24'|'ordinal'|'list', names?: [{name, detail?}] — у list, по высоте} и
                periodWord: {short, full?} — слово периода (строка — ключ словаря, объект — имя en/ru); читает scales.namingOf.
   ⚠️ compat.tag — поле, которое ВЫВЕСТИ НЕЛЬЗЯ (семейство лада: 'penta' стоит и у пентатоник, и у раг, и у патетов): его читают только
   замороженные опоры пробы и isTert; уйдёт, когда уйдут они. Всё прочее у лада выводится (см. сборщик в scales.js).
   ⛔ Дроби (period, ratios правил, отношения палитр и строёв) — СТРОКАМИ; сборщик делит их тем же действием, что прежний литерал JS (5/4 —
   это и было деление двух чисел), поэтому double тот же. */
export const SCALE_DATA={
  manifest:{ format:'handsong/manifest', version:1, start:'minor-penta',
    tunings:['edo12','edo19','edo24','edo31','bp13','carlos-alpha','carlos-beta','carlos-gamma','slendro','pelog','partch43','shruti22','ji12','pythagorean12','meantone-quarter','werckmeister3','vallotti','kirnberger3'],
    palettes:['chrom12','edo31','edo19','partch','bp','bpsteps','nat','natfix'],
    chordModeSets:['freeInstrument','freeInstrumentBP','stackPower'],
    modes:[
      'major', 'natural-minor', 'harmonic-minor', 'melodic-minor', 'dorian', 'phrygian',
      'lydian', 'mixolydian', 'locrian', 'hungarian-minor', 'major-penta', 'minor-penta',
      'blues', 'chromatic', 'maqam-rast', 'maqam-bayati', 'edo19-full', 'edo31-full',
      'maqam-hijaz', 'harmonic-major', 'melodic-major', 'whole-tone', 'octatonic-wh', 'octatonic-hw',
      'messiaen-3', 'phrygian-dominant', 'double-harmonic', 'enigmatic', 'prometheus', 'egyptian',
      'man-gong', 'ritusen', 'hungarian-penta', 'scriabin-penta', 'kumoi-western', 'major-blues',
      'maqam-saba', 'maqam-sikah', 'maqam-nahawand', 'maqam-kurd', 'maqam-ajam', 'maqam-nikriz',
      'maqam-nawa-athar', 'slendro', 'pelog', 'hirajoshi', 'kumoi-japanese', 'in-insen',
      'iwato', 'partch-43', 'bohlen-pierce', 'carlos-alpha', 'carlos-beta', 'carlos-gamma',
      'pelog-lima', 'pelog-nem', 'pelog-barang', 'pythagorean', 'ji-adaptive', 'ji-fixed',
      'meantone-quarter', 'shruti-22', 'raga-bhairav', 'raga-yaman', 'raga-kafi', 'raga-bhairavi',
      'raga-todi', 'raga-khamaj', 'raga-asavari', 'raga-malhar', 'raga-purvi', 'raga-bilawal',
      'werckmeister-3', 'vallotti', 'kirnberger-3',
    ] },

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
   традиция не влезает, добавить ей СВОЮ географическую секцию. Порядок ГРУПП внутри секции menuOf
   берёт по ПЕРВОМУ появлению лада в manifest.modes, порядок СЕКЦИЙ — из этого списка. */
  menu:{ format:'handsong/menu', version:1,
    traditions:[
      {id:'common', name:{en:'Familiar', ru:'Привычное'}},
      {id:'mideast', name:{en:'Middle East', ru:'Ближний Восток'}},
      {id:'india', name:{en:'India', ru:'Индия'}},
      {id:'easia', name:{en:'Java & the Far East', ru:'Ява и Дальний Восток'}},
      {id:'europe', name:{en:'Historical Europe', ru:'Европа историческая'}},
      {id:'exp', name:{en:'Experiments', ru:'Эксперименты'}},
    ],
    /* ЛОКАЛИЗУЕМЫЕ ПОДПИСИ ПОДГРУПП. Лад ссылается КЛЮЧОМ (menu.group: 'diatonic'; '' — без группы); сборщик кладёт в
   объект лада подпись grp (этот объект) и стабильный grpKey — по ключу menuOf раскладывает корзины (не зависит от языка), L(подпись)
   даёт текст. Один ярлык — один объект на все лады группы. */
    groups:{
      diatonic:{en:'Diatonic', ru:'Диатоника'},
      modes:{en:'Modes', ru:'Лады (моды)'},
      ethnic:{en:'Ethnic', ru:'Этнические'},
      pentaBlues:{en:'Pentatonic / blues', ru:'Пентатоника / блюз'},
      chromatic:{en:'Chromatic', ru:'Хроматика'},
      symmetric:{en:'Symmetric', ru:'Симметричные'},
      exotic:{en:'Exotic', ru:'Экзотические'},
      worldPenta:{en:'World pentatonics', ru:'Мировые пентатоники'},
      maqamat:{en:'Maqamat', ru:'Макамы'},
      fullGrid:{en:'Full grid', ru:'Полная сетка'},
      ragas:{en:'Ragas', ru:'Раги'},
      fareastPenta:{en:'Far East pentatonics', ru:'Пентатоники Дальнего Востока'},
      gamelan:{en:'Javanese gamelan', ru:'Яванский гамелан'},
      japanese:{en:'Japanese', ru:'Японские'},
    } },

  /* ⛳ СТРОИ — ДАННЫЕ (слайс T0 универсальной модели строя, HANDOFF «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ»). СТРОЙ — все высоты инструмента:
   ПЕРИОД повторения и высоты внутри него. ЛАД — выбор из строя (ниже: degrees — индексы строя, root — у каждого лада).
     • РАВНЫЙ строй держит ФОРМУ ГЕНЕРАТОРА — число шагов equal и период (шаг k звучит period^(k/equal)), а НЕ развёрнутый список
       центов: ровно это выражение и стоит в сегодняшней равной ветке (P^(шаг/edo)), поэтому общая функция высоты (T1) останется
       побитно прежней. Шаг k бывает и ≥ equal (аккорд через период) — переноса для равного строя не нужно;
     • ТАБЛИЧНЫЙ строй — список высот pitches.list: центы над нулевой высотой строя в пределах периода (цена), у части — точное
       отношение (теория); период — октава (все табличные строи октавные).
   ⛳ id — СТАБИЛЬНЫЙ идентификатор (правило #25: отображаемое имя — не идентификатор): его запишет сохранение, его прочтёт импорт.
   Имени строя у записей пока нет — строй нигде не показывается (придёт с конструктором); имена его ВЫСОТ — с F3 схема naming.
   ⚠️ Натуральный подвижный и фиксированный — ОДИН строй ji12 (те же 12 высот): различаются они не строем, а ЯКОРЕМ (подвижный
   строится от тоники, фиксированный — от C) и аккордами (чистые отношения / сетка). Так и задумано моделью: строй — только высоты.
   С T1 цену считает одна функция высоты по записи строя и выборке лада; с T4 события хранят индекс в строе; с F2 выборка — ДАННЫЕ лада. */
  /* ⛳ T7: ТОЧНЫЕ ОТНОШЕНИЯ СТРОЯ — данными, рядом с центами (первая часть пункта (а) готовности к Scala; пока — только у Партча, которому
   они нужны для правила «аккорд Партча — только из его 43 высот»; chordFit:'ratios'). С F2 отношение стоит у каждой высоты рядом с её
   центами (центы — те же отношения, округлённые до сотых, отсюда ≤ 0.005¢ разницы) — ещё у ji12, pythagorean12 и shruti22, как теория:
   приложение их пока не читает. Цену они НЕ меняют — её по-прежнему считают центы (корень) и отношение типа. */
  tunings:{
    edo12:{ format:'handsong/tuning', version:1, id:'edo12', period:'2/1', pitches:{equal:12}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    edo19:{ format:'handsong/tuning', version:1, id:'edo19', period:'2/1', pitches:{equal:19}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    edo24:{ format:'handsong/tuning', version:1, id:'edo24', period:'2/1', pitches:{equal:24}, naming:{scheme:'notes24'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    edo31:{ format:'handsong/tuning', version:1, id:'edo31', period:'2/1', pitches:{equal:31}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    bp13:{ format:'handsong/tuning', version:1, id:'bp13', period:'3/1', pitches:{equal:13}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.tritave'} },   // Болен–Пирс: 13 равных шагов ТРИТАВЫ
    'carlos-alpha':{ format:'handsong/tuning', version:1, id:'carlos-alpha', period:'3/2', pitches:{equal:9}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.reg'} },   // Карлос: равные доли чистой КВИНТЫ (генератор, не эквивалентность)
    'carlos-beta':{ format:'handsong/tuning', version:1, id:'carlos-beta', period:'3/2', pitches:{equal:11}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.reg'} },
    'carlos-gamma':{ format:'handsong/tuning', version:1, id:'carlos-gamma', period:'3/2', pitches:{equal:20}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.reg'} },
    slendro:{ format:'handsong/tuning', version:1, id:'slendro', period:'2/1', pitches:{list:[
      {cents:0}, {cents:231}, {cents:474}, {cents:717}, {cents:955}
    ]}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    pelog:{ format:'handsong/tuning', version:1, id:'pelog', period:'2/1', pitches:{list:[   // родитель патетов Лима/Нем/Баранг
      {cents:0}, {cents:120}, {cents:258}, {cents:539}, {cents:675}, {cents:785},
      {cents:943}
    ]}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    partch43:{ format:'handsong/tuning', version:1, id:'partch43', period:'2/1', pitches:{list:[   // T7: точные отношения — по ним решается «тон аккорда — одна из 43 высот»
      {cents:0, ratio:'1/1'}, {cents:21.51, ratio:'81/80'}, {cents:53.27, ratio:'33/32'}, {cents:84.47, ratio:'21/20'}, {cents:111.73, ratio:'16/15'}, {cents:150.64, ratio:'12/11'},
      {cents:165.0, ratio:'11/10'}, {cents:182.4, ratio:'10/9'}, {cents:203.91, ratio:'9/8'}, {cents:231.17, ratio:'8/7'}, {cents:266.87, ratio:'7/6'}, {cents:294.13, ratio:'32/27'},
      {cents:315.64, ratio:'6/5'}, {cents:347.41, ratio:'11/9'}, {cents:386.31, ratio:'5/4'}, {cents:417.51, ratio:'14/11'}, {cents:435.08, ratio:'9/7'}, {cents:470.78, ratio:'21/16'},
      {cents:498.04, ratio:'4/3'}, {cents:519.55, ratio:'27/20'}, {cents:551.32, ratio:'11/8'}, {cents:582.51, ratio:'7/5'}, {cents:617.49, ratio:'10/7'}, {cents:648.68, ratio:'16/11'},
      {cents:680.45, ratio:'40/27'}, {cents:701.96, ratio:'3/2'}, {cents:729.22, ratio:'32/21'}, {cents:764.92, ratio:'14/9'}, {cents:782.49, ratio:'11/7'}, {cents:813.69, ratio:'8/5'},
      {cents:852.59, ratio:'18/11'}, {cents:884.36, ratio:'5/3'}, {cents:905.87, ratio:'27/16'}, {cents:933.13, ratio:'12/7'}, {cents:968.83, ratio:'7/4'}, {cents:996.09, ratio:'16/9'},
      {cents:1017.6, ratio:'9/5'}, {cents:1035.0, ratio:'20/11'}, {cents:1049.36, ratio:'11/6'}, {cents:1088.27, ratio:'15/8'}, {cents:1115.53, ratio:'40/21'}, {cents:1146.73, ratio:'64/33'},
      {cents:1178.49, ratio:'160/81'}
    ]}, naming:{scheme:'ordinal'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'}, chordFit:'ratios' },
    shruti22:{ format:'handsong/tuning', version:1, id:'shruti22', period:'2/1', pitches:{list:[   // родитель десяти раг
      {cents:0, ratio:'1/1'}, {cents:90, ratio:'256/243'}, {cents:112, ratio:'16/15'}, {cents:182, ratio:'10/9'}, {cents:204, ratio:'9/8'}, {cents:294, ratio:'32/27'},
      {cents:316, ratio:'6/5'}, {cents:386, ratio:'5/4'}, {cents:408, ratio:'81/64'}, {cents:498, ratio:'4/3'}, {cents:520, ratio:'27/20'}, {cents:590, ratio:'45/32'},
      {cents:612, ratio:'729/512'}, {cents:702, ratio:'3/2'}, {cents:792, ratio:'128/81'}, {cents:814, ratio:'8/5'}, {cents:884, ratio:'5/3'}, {cents:906, ratio:'27/16'},
      {cents:996, ratio:'16/9'}, {cents:1018, ratio:'9/5'}, {cents:1088, ratio:'15/8'}, {cents:1110, ratio:'243/128'}
    ]},
      /* ===== Индийская классика: свары (саргам) + ПОДЛИННЫЕ имена 22 шрути — СПИСОК ИМЁН СТРОЯ (F3; до F3 — таблицы SWARA_OF/SHRUTI_OF
         по центам в scales.js) =====
         Имена — у КАЖДОЙ ВЫСОТЫ СТРОЯ, по её номеру (порядок списка = порядок высот выше), поэтому сетка и раги называют ОДНИ И ТЕ ЖЕ высоты
         одними и теми же именами — подписи не разъедутся. name — свара, detail — имя шрути.
         name (свара) — по области высоты (Са/Ре/Га/Ма/Па/Дха/Ни; ♭ комаль, ♯ тивра-Ма). Са и Па — ачала
         (неподвижны). Комма-ПАРЫ (90/112, 386/408, …) раньше различали НАШИМ штрихом ′ — это ВЫДУМКА. Теперь
         различаем ПОДЛИННЫМ ИМЕНЕМ ШРУТИ (у традиции они есть) — detail, по одному на каждую из 22 позиций.
         КОНВЕНЦИЯ (источники расходятся — фиксируем выбор): КЛАССИЧЕСКАЯ, Сангита-Ратнакара (Шарнгадева, XIII в.).
         Шрути — это ПОДХОД к сваре; сама нота звучит на ПОСЛЕДНЕЙ шрути своей группы (размеры 4-3-2-4-4-3-2 = 22):
         Са=Чхандовати (4-я), Ре=Ратика (7-я), Га=Кродха (9-я), Ма=Марджани (13-я), Па=Алапини (17-я),
         Дха=Рамья (20-я), Ни=Кшобхини (22-я). Поэтому тоника — «Са · Чхандовати», НЕ «Са · Тивра» («тивра» =
         острый, на тонике бессмысленно; Тивра/Кумудвати/Манда — подход СНИЗУ к Са, т.е. верх октавы 1018/1088/1110).
         Свары-носители тут — древней Са-грамы (Ре 10/9, Га 32/27, Дха 5/3, Ни 16/9 ≈ кафи-тхат), поэтому
         Кродха/Кшобхини садятся в то, что СОВРЕМЕННО зовётся комаль (свара — область высоты современная, НЕ
         меняем; имя шрути — классическое). АЛЬТЕРНАТИВА (НЕ берём): современная позиционная имя[i]↔цент[i],
         Са=Тивра(1)/Па=Кшити(14) — частая в онлайн-таблицах, но поздняя упрощёнка. Источники: Сангита-Ратнакара
         (sreenivasaraos.com), kaminimusic.com (позиционная, для сверки). */
      naming:{scheme:'list', names:[
        {name:{default:'Sa',ru:'Са'}, detail:{default:'Chandovati',ru:'Чхандовати'}},   // 0¢ (1)
        {name:{default:'Re♭',ru:'Ре♭'}, detail:{default:'Dayavati',ru:'Дайавати'}},   // 90¢ (2)
        {name:{default:'Re♭',ru:'Ре♭'}, detail:{default:'Ranjani',ru:'Ранджани'}},   // 112¢ (3)
        {name:{default:'Re',ru:'Ре'}, detail:{default:'Ratika',ru:'Ратика'}},   // 182¢ (4)
        {name:{default:'Re',ru:'Ре'}, detail:{default:'Raudri',ru:'Раудри'}},   // 204¢ (5)
        {name:{default:'Ga♭',ru:'Га♭'}, detail:{default:'Krodha',ru:'Кродха'}},   // 294¢ (6)
        {name:{default:'Ga♭',ru:'Га♭'}, detail:{default:'Vajrika',ru:'Ваджрика'}},   // 316¢ (7)
        {name:{default:'Ga',ru:'Га'}, detail:{default:'Prasarini',ru:'Прасарини'}},   // 386¢ (8)
        {name:{default:'Ga',ru:'Га'}, detail:{default:'Priti',ru:'Прити'}},   // 408¢ (9)
        {name:{default:'Ma',ru:'Ма'}, detail:{default:'Marjani',ru:'Марджани'}},   // 498¢ (10)
        {name:{default:'Ma',ru:'Ма'}, detail:{default:'Kshiti',ru:'Кшити'}},   // 520¢ (11)
        {name:{default:'Ma♯',ru:'Ма♯'}, detail:{default:'Rakta',ru:'Ракта'}},   // 590¢ (12)
        {name:{default:'Ma♯',ru:'Ма♯'}, detail:{default:'Sandipani',ru:'Сандипани'}},   // 612¢ (13)
        {name:{default:'Pa',ru:'Па'}, detail:{default:'Alapini',ru:'Алапини'}},   // 702¢ (14)
        {name:{default:'Dha♭',ru:'Дха♭'}, detail:{default:'Madanti',ru:'Маданти'}},   // 792¢ (15)
        {name:{default:'Dha♭',ru:'Дха♭'}, detail:{default:'Rohini',ru:'Рохини'}},   // 814¢ (16)
        {name:{default:'Dha',ru:'Дха'}, detail:{default:'Ramya',ru:'Рамья'}},   // 884¢ (17)
        {name:{default:'Dha',ru:'Дха'}, detail:{default:'Ugra',ru:'Угра'}},   // 906¢ (18)
        {name:{default:'Ni♭',ru:'Ни♭'}, detail:{default:'Kshobhini',ru:'Кшобхини'}},   // 996¢ (19)
        {name:{default:'Ni♭',ru:'Ни♭'}, detail:{default:'Tivra',ru:'Тивра'}},   // 1018¢ (20)
        {name:{default:'Ni',ru:'Ни'}, detail:{default:'Kumudvati',ru:'Кумудвати'}},   // 1088¢ (21)
        {name:{default:'Ni',ru:'Ни'}, detail:{default:'Manda',ru:'Манда'}},   // 1110¢ (22)
      ]}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    ji12:{ format:'handsong/tuning', version:1, id:'ji12', period:'2/1', pitches:{list:[
      {cents:0, ratio:'1/1'}, {cents:111.73, ratio:'16/15'}, {cents:203.91, ratio:'9/8'}, {cents:315.64, ratio:'6/5'}, {cents:386.31, ratio:'5/4'}, {cents:498.04, ratio:'4/3'},
      {cents:590.22, ratio:'45/32'}, {cents:701.96, ratio:'3/2'}, {cents:813.69, ratio:'8/5'}, {cents:884.36, ratio:'5/3'}, {cents:1017.6, ratio:'9/5'}, {cents:1088.27, ratio:'15/8'}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    pythagorean12:{ format:'handsong/tuning', version:1, id:'pythagorean12', period:'2/1', pitches:{list:[
      {cents:0, ratio:'1/1'}, {cents:90.22, ratio:'256/243'}, {cents:203.91, ratio:'9/8'}, {cents:294.13, ratio:'32/27'}, {cents:407.82, ratio:'81/64'}, {cents:498.04, ratio:'4/3'},
      {cents:611.73, ratio:'729/512'}, {cents:701.96, ratio:'3/2'}, {cents:792.18, ratio:'128/81'}, {cents:905.87, ratio:'27/16'}, {cents:996.09, ratio:'16/9'}, {cents:1109.78, ratio:'243/128'}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    'meantone-quarter':{ format:'handsong/tuning', version:1, id:'meantone-quarter', period:'2/1', pitches:{list:[
      {cents:0}, {cents:76.05}, {cents:193.16}, {cents:310.26}, {cents:386.31}, {cents:503.42},
      {cents:579.47}, {cents:696.58}, {cents:772.63}, {cents:889.74}, {cents:1006.84}, {cents:1082.89}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    werckmeister3:{ format:'handsong/tuning', version:1, id:'werckmeister3', period:'2/1', pitches:{list:[
      {cents:0}, {cents:90.22}, {cents:192.18}, {cents:294.13}, {cents:390.22}, {cents:498.04},
      {cents:588.27}, {cents:696.09}, {cents:792.18}, {cents:888.27}, {cents:996.09}, {cents:1092.18}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    vallotti:{ format:'handsong/tuning', version:1, id:'vallotti', period:'2/1', pitches:{list:[
      {cents:0}, {cents:94.13}, {cents:196.09}, {cents:298.04}, {cents:392.18}, {cents:501.96},
      {cents:592.18}, {cents:698.04}, {cents:796.09}, {cents:894.13}, {cents:1000}, {cents:1090.22}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
    kirnberger3:{ format:'handsong/tuning', version:1, id:'kirnberger3', period:'2/1', pitches:{list:[
      {cents:0}, {cents:90.22}, {cents:193.16}, {cents:294.13}, {cents:386.31}, {cents:498.04},
      {cents:590.22}, {cents:696.58}, {cents:792.18}, {cents:889.74}, {cents:996.09}, {cents:1088.27}
    ]}, naming:{scheme:'notes12'}, periodWord:{short:'reg.oct', full:'reg.octaveFull'} },
  },

  /* НАБОРЫ СЕМЕЙСТВ ПО ЛАДАМ. Интервалы — В ШАГАХ СВОЕГО СТРОЯ от корня; для 12-TET шаг
   это полутон, для 31-TET — 38.7 цента. Типизированная ветка chordNotes складывает шаги
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
  palettes:{
    /* ── 12-TET Хроматика: интервалы в ПОЛУТОНАХ ─────────────────────────────── */
    chrom12:{ format:'handsong/palette', version:1, id:'chrom12', kind:'steps', families:[
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[   // колонка 0 палитры
      {label:'M', iv:[0,4,7]},
      {label:'maj7', iv:[0,4,7,11]},
      {label:'7', iv:[0,4,7,10]},
      {label:'6', iv:[0,4,7,9]},
      {label:'add9', iv:[0,4,7,14]},
      {label:'7#9', iv:[0,4,7,10,15]},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[   // колонка 1 палитры
      {label:'m', iv:[0,3,7]},
      {label:'m7', iv:[0,3,7,10]},
      {label:'m6', iv:[0,3,7,9]},
      {label:'mM7', iv:[0,3,7,11]},
      {label:'m9', iv:[0,3,7,10,14]},
      {label:'madd9', iv:[0,3,7,14]},
    ]},
    {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[   // колонка 2 палитры
      {label:'dim', iv:[0,3,6]},
      {label:'m7b5', iv:[0,3,6,10]},
      {label:'dim7', iv:[0,3,6,9]},
      {label:'aug', iv:[0,4,8]},
      {label:'aug7', iv:[0,4,8,10]},
      {label:'augM7', iv:[0,4,8,11]},
    ]},
    /* Последняя колонка: sus + расширенные. Имя семейства не «Sus» — в наборе лежат 6/9, maj9 и 13,
     которые sus не являются; индикатор не должен врать. */
    {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[   // колонка 3 палитры
      {label:'sus2', iv:[0,2,7]},
      {label:'sus4', iv:[0,5,7]},
      {label:'7sus4', iv:[0,5,7,10]},
      {label:'6/9', iv:[0,4,7,9,14]},
      {label:'maj9', iv:[0,4,7,11,14]},
      {label:'13', iv:[0,4,7,10,21]},
    ]},
    ] },
    /* ── 31-TET «весь строй»: интервалы в ШАГАХ 31-EDO (шаг = 38.71¢) ──────────
    Ради чего всё: 4:5:6:7 звучит биением в ноль — терция +0.8¢, нат.септима −1.1¢
    (в 12-TET та же септима мимо на +31¢ и поэтому «тянет»). Нейтральная терция 11/9
    (+1.0¢), субминор 7/6 (+4.1¢), супермажор 9/7 (−9.3¢, самый неточный в наборе —
    ближе 31-TET не даёт). Безымянный здесь НЕЙТРАЛЬНЫЕ, а не уменьшённые: ради
    нейтральных интервалов 31-TET и берут. */
    edo31:{ format:'handsong/palette', version:1, id:'edo31', kind:'steps', families:[
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[   // колонка 0 палитры
      {label:{en:'maj', ru:'маж'}, full:{en:'Pure major', ru:'Мажор чистый'}, iv:[0,10,18]},
      {label:'maj7', full:'Maj7', iv:[0,10,18,28]},
      {label:{en:'dom7', ru:'дом7'}, full:{en:'Dominant 7th · 4:5:6:7', ru:'Домин.7 · 4:5:6:7'}, iv:[0,10,18,25]},
      {label:{en:'super', ru:'супер'}, full:{en:'Supermajor · 9/7', ru:'Супермажор · 9/7'}, iv:[0,11,18]},
      {label:'6', full:{en:'Major 6', ru:'Мажор 6'}, iv:[0,10,18,23]},
      {label:'add9', full:{en:'Add9 (over the octave)', ru:'Add9 (через октаву)'}, iv:[0,10,18,36]},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[   // колонка 1 палитры
      {label:{en:'min', ru:'мин'}, full:{en:'Pure minor', ru:'Минор чистый'}, iv:[0,8,18]},
      {label:{en:'min7', ru:'мин7'}, full:{en:'Minor 7', ru:'Минор 7'}, iv:[0,8,18,26]},
      {label:{en:'submin', ru:'субмин'}, full:{en:'Subminor · 7/6', ru:'Субминор · 7/6'}, iv:[0,7,18]},
      {label:{en:'min6', ru:'мин6'}, full:{en:'Minor 6', ru:'Минор 6'}, iv:[0,8,18,23]},
      {label:{en:'minM7', ru:'минМ7'}, full:{en:'Minor-major 7', ru:'Мин-мажор 7'}, iv:[0,8,18,28]},
      {label:{en:'subm7', ru:'субм7'}, full:{en:'Subminor 7', ru:'Субминор 7'}, iv:[0,7,18,25]},
    ]},
    {id:'neu', name:{en:'Neutral/Dim.', ru:'Нейтр./Ум.'}, finger:2, types:[   // колонка 2 палитры
      {label:{en:'neut', ru:'нейтр'}, full:{en:'Neutral · 11/9', ru:'Нейтральное · 11/9'}, iv:[0,9,18]},
      {label:{en:'neut7', ru:'нейтр7'}, full:{en:'Neutral 7', ru:'Нейтральное 7'}, iv:[0,9,18,26]},
      {label:'dim', full:{en:'Diminished', ru:'Уменьшённое'}, iv:[0,8,15]},
      {label:'m7b5', full:{en:'Half-diminished', ru:'Полууменьшённое'}, iv:[0,8,15,26]},
      {label:'dim7', full:{en:'Diminished 7th', ru:'Ум. септаккорд'}, iv:[0,8,15,23]},
      {label:{en:'neut♮7', ru:'нейтр♮7'}, full:{en:'Neutral + natural 7 · 7/4', ru:'Нейтр. + нат.7 · 7/4'}, iv:[0,9,18,25]},
    ]},
    {id:'sus', name:'Sus', finger:3, types:[   // колонка 3 палитры
      {label:'sus2', full:'Sus2 · 9/8', iv:[0,5,18]},
      {label:'sus4', full:'Sus4 · 4/3', iv:[0,13,18]},
      {label:'7sus4', full:'7sus4', iv:[0,13,18,25]},
      {label:'9sus4', full:{en:'9sus4 (over the oct.)', ru:'9sus4 (через окт.)'}, iv:[0,13,18,36]},
      {label:'sus2/7', full:{en:'Sus2 + natural 7', ru:'Sus2 + нат.7'}, iv:[0,5,18,25]},
      {label:{en:'quart', ru:'кварт'}, full:{en:'Quartal chord', ru:'Квартаккорд'}, iv:[0,13,25]},
    ]},
    ] },
    /* ── 19-TET «весь строй»: интервалы в ШАГАХ 19-EDO (шаг = 63.16¢) ──────────
    Ради чего всё: чистая МАЛАЯ терция 6/5 — 5 шагов (+0.2¢), и большая секста
    5/3 — 14 шагов (−0.2¢). Отсюда минорное трезвучие и мажорный секстаккорд
    звучат ровнее, чем в 12-TET (там та же терция мимо на −15.6¢ и «бьётся»).
    Зеркально 31-TET, где ради 4:5:6:7 берут МАЖОРНУЮ сторону: 19-TET — строй
    минорной терции. Большая терция 6 шагов (−7.4¢) чуть узка, малая септима
    16 шагов (−7¢) — компромисс, зато 5 шагов и 14 шагов почти идеальны. */
    edo19:{ format:'handsong/palette', version:1, id:'edo19', kind:'steps', families:[
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[   // колонка 0 палитры
      {label:{en:'maj', ru:'маж'}, full:{en:'Major', ru:'Мажор'}, iv:[0,6,11]},
      {label:'maj7', full:'Maj7', iv:[0,6,11,17]},
      {label:{en:'dom7', ru:'дом7'}, full:{en:'Dominant 7th', ru:'Домин.7'}, iv:[0,6,11,16]},
      {label:'6', full:{en:'Major 6 · 5/3', ru:'Мажор 6 · 5/3'}, iv:[0,6,11,14]},
      {label:'add9', full:{en:'Add9 (over the oct.)', ru:'Add9 (через окт.)'}, iv:[0,6,11,22]},
      {label:'6/9', full:{en:'Major 6/9', ru:'Мажор 6/9'}, iv:[0,6,11,14,22]},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[   // колонка 1 палитры
      {label:{en:'min', ru:'мин'}, full:{en:'Pure minor · 6/5', ru:'Минор чистый · 6/5'}, iv:[0,5,11]},
      {label:{en:'min7', ru:'мин7'}, full:{en:'Minor 7', ru:'Минор 7'}, iv:[0,5,11,16]},
      {label:{en:'min6', ru:'мин6'}, full:{en:'Minor 6 · 5/3', ru:'Минор 6 · 5/3'}, iv:[0,5,11,14]},
      {label:{en:'minM7', ru:'минМ7'}, full:{en:'Minor-major 7', ru:'Мин-мажор 7'}, iv:[0,5,11,17]},
      {label:{en:'min9', ru:'мин9'}, full:{en:'Minor 9', ru:'Минор 9'}, iv:[0,5,11,16,22]},
      {label:{en:'minadd9', ru:'минadd9'}, full:{en:'Minor add9', ru:'Минор add9'}, iv:[0,5,11,22]},
    ]},
    {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[   // колонка 2 палитры
      {label:'dim', full:{en:'Diminished', ru:'Уменьшённое'}, iv:[0,5,10]},
      {label:'m7b5', full:{en:'Half-diminished', ru:'Полууменьшённое'}, iv:[0,5,10,16]},
      {label:'dim7', full:{en:'Diminished 7th', ru:'Ум. септаккорд'}, iv:[0,5,10,15]},
      {label:'aug', full:{en:'Augmented', ru:'Увеличенное'}, iv:[0,6,12]},
      {label:'aug7', full:{en:'Augmented 7', ru:'Увелич. 7'}, iv:[0,6,12,16]},
      {label:'augM7', full:{en:'Augmented-major 7', ru:'Увелич.-мажор 7'}, iv:[0,6,12,17]},
    ]},
    {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[   // колонка 3 палитры
      {label:'sus2', full:'Sus2', iv:[0,3,11]},
      {label:'sus4', full:'Sus4 · 4/3', iv:[0,8,11]},
      {label:'7sus4', full:'7sus4', iv:[0,8,11,16]},
      {label:'9sus4', full:{en:'9sus4 (over the oct.)', ru:'9sus4 (через окт.)'}, iv:[0,8,11,22]},
      {label:'sus2/7', full:'Sus2 + 7', iv:[0,3,11,16]},
      {label:{en:'quart', ru:'кварт'}, full:{en:'Quartal chord', ru:'Квартаккорд'}, iv:[0,8,16]},
    ]},
    ] },
    /* ── Партч (43 тона, cents-строй): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ (11-предел), НЕ шаги edo.
    chordFreqs с cents-веткой множит корень на ratio напрямую (см. выше). О = отональные
    (обертоновые, X:X+1…), У = утональные (унтертоновые, 1/отональ). Метки честны по Партчу:
    отношение, а не «Cmaj7». iv начинается с 1 (унисон-корень). Отношения — обычные JS-числа
    (5/4 и т.д.): погрешность float ниже цента, а ссылка на массив iv держит ty===latchTy. */
    partch:{ format:'handsong/palette', version:1, id:'partch', kind:'ratios', families:[
    {id:'oton', name:{en:'O (otonal)', ru:'О (обертон.)'}, finger:0, types:[
      {label:'O', full:{en:'Otonal triad · 4:5:6', ru:'Отональ. триада · 4:5:6'}, iv:['1','5/4','3/2']},
      {label:'O7', full:{en:'Otonal tetrad · 4:5:6:7', ru:'Отональ. тетрада · 4:5:6:7'}, iv:['1','5/4','3/2','7/4']},
      {label:'O9', full:{en:'Otonal pentad · 4:5:6:7:9', ru:'Отональ. пентада · 4:5:6:7:9'}, iv:['1','5/4','3/2','7/4','9/4']},
      {label:'O11', full:{en:'Otonal hexad · 4:5:6:7:9:11', ru:'Отональ. гексада · 4:5:6:7:9:11'}, iv:['1','5/4','3/2','7/4','9/4','11/4']},
      {label:{en:'O no5', ru:'О-б5'}, full:{en:'Otonal, no fifth · 4:5:7', ru:'Отональ. без квинты · 4:5:7'}, iv:['1','5/4','7/4']},
      {label:{en:'O9n', ru:'О9нч'}, full:{en:'Otonal with ninth · 8:9:10:12', ru:'Отональ. с ноной · 8:9:10:12'}, iv:['1','9/8','5/4','3/2']},
    ]},
    {id:'uton', name:{en:'U (utonal)', ru:'У (унтертон.)'}, finger:1, types:[
      {label:'U', full:{en:'Utonal triad · 10:12:15', ru:'Утональ. триада · 10:12:15'}, iv:['1','6/5','3/2']},
      {label:'U7', full:{en:'Utonal tetrad · 1/(4:5:6:7)', ru:'Утональ. тетрада · 1/(4:5:6:7)'}, iv:['1','6/5','3/2','12/7']},
      {label:'U9', full:{en:'Utonal pentad', ru:'Утональ. пентада'}, iv:['1','6/5','3/2','12/7','9/4']},
      {label:'U11', full:{en:'Utonal hexad', ru:'Утональ. гексада'}, iv:['1','6/5','3/2','12/7','9/4','36/11']},
      {label:{en:'U no5', ru:'У-б5'}, full:{en:'Utonal, no fifth · 5:6:8', ru:'Утональ. без квинты · 5:6:8'}, iv:['1','6/5','8/5']},
      {label:{en:'U add9', ru:'Удоб9'}, full:{en:'Utonal with ninth · 9:10:12', ru:'Утональ. с ноной · 9:10:12'}, iv:['1','10/9','6/5','3/2']},
    ]},
    {id:'sept', name:{en:'Sharp 7/11', ru:'Диез 7/11'}, finger:2, types:[
      {label:{en:'subm', ru:'субм'}, full:{en:'Subminor · 7/6 (267c)', ru:'Субминор · 7/6 (267c)'}, iv:['1','7/6','3/2']},
      {label:{en:'supM', ru:'супМ'}, full:{en:'Supermajor · 9/7 (435c)', ru:'Супермажор · 9/7 (435c)'}, iv:['1','9/7','3/2']},
      {label:{en:'neut', ru:'нейтр'}, full:{en:'Neutral · 11/9 (347c)', ru:'Нейтральное · 11/9 (347c)'}, iv:['1','11/9','3/2']},
      {label:{en:'undec', ru:'ундец'}, full:{en:'Undecimal · 11/8 (551c)', ru:'Ундецимальное · 11/8 (551c)'}, iv:['1','11/8','3/2']},
      {label:{en:'trit7', ru:'трит7'}, full:{en:'Septimal tritone · 7/5 (583c)', ru:'Септим. тритон · 7/5 (583c)'}, iv:['1','7/5','3/2']},
      {label:{en:'harm', ru:'гарм'}, full:{en:'Harmonic segment · 8:10:11:12', ru:'Обертоновый срез · 8:10:11:12'}, iv:['1','5/4','11/8','3/2']},
    ]},
    {id:'std', name:{en:'Standard', ru:'Станд.'}, finger:3, types:[
      {label:'M', full:{en:'Pure major · 4:5:6', ru:'Мажор чистый · 4:5:6'}, iv:['1','5/4','3/2']},
      {label:'m', full:{en:'Pure minor · 10:12:15', ru:'Минор чистый · 10:12:15'}, iv:['1','6/5','3/2']},
      {label:'7', full:{en:'Dominant 7th · 4:5:6:7', ru:'Домин.7 · 4:5:6:7'}, iv:['1','5/4','3/2','7/4']},
      {label:'maj7', full:{en:'Pure maj7 · 15/8', ru:'Maj7 чистый · 15/8'}, iv:['1','5/4','3/2','15/8']},
      {label:'sus4', full:'Sus4 · 4/3', iv:['1','4/3','3/2']},
      {label:{en:'quart', ru:'кварт'}, full:{en:'Quartal chord · 9:12:16', ru:'Квартаккорд · 9:12:16'}, iv:['1','4/3','16/9']},
    ]},
    ] },
    /* ── Болен–Пирс (неоктавный, период 3): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ подгруппы 3.5.7,
    нормированные от корня (÷3, поэтому 3:5:7 → [1,5/3,7/3]). Как у Партча — НЕ шаги edo; но BP
    НЕ cents-лад, а ПЕРИОД-РАВНЫЙ: chordFreqs берёт корень равным шагом (P^(iv/edo), P=3) и множит
    на ratio напрямую (см. period-ветку в chordFreqs). Метки честны по BP — отношение, а не «Cmaj».
    iv с 1 (унисон-корень). Три колонки по 5: Мажор (отональ. вокруг 3:5:7) / Минор (вокруг 5:7:9) /
    Характерные (нечётные терции 9/7·7/5 и симметричные стопки). Отношения — обычные JS-числа. */
    bp:{ format:'handsong/palette', version:1, id:'bp', kind:'ratios', families:[
    // ⛳ T7b: ПРЕЖНИЙ набор (до T7) СЛОВО В СЛОВО — режим «Свободно» (умолчание); проба сверяет его с копией из прежнего кода
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
      {label:'3:5:7', full:{en:'Major triad · 3:5:7 (885/1467¢)', ru:'Мажорная триада · 3:5:7 (885/1467¢)'}, iv:['1','5/3','7/3']},
      {label:'3:5:7:9', full:{en:'Tetrad · 3:5:7:9 (top = tritave)', ru:'Тетрада · 3:5:7:9 (верх = тритава)'}, iv:['1','5/3','7/3','3']},
      {label:'3:5:7:9:11', full:{en:'Pentad · 3:5:7:9:11', ru:'Пентада · 3:5:7:9:11'}, iv:['1','5/3','7/3','3','11/3']},
      {label:'3:5', full:{en:'Dyad · 3:5 (885¢)', ru:'Диада · 3:5 (885¢)'}, iv:['1','5/3']},
      {label:'3:7', full:{en:'Dyad · 3:7 (1467¢)', ru:'Диада · 3:7 (1467¢)'}, iv:['1','7/3']},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
      {label:'5:7:9', full:{en:'Minor triad · 5:7:9 (583/1018¢)', ru:'Минорная триада · 5:7:9 (583/1018¢)'}, iv:['1','7/5','9/5']},
      {label:'5:7:9:11', full:{en:'Tetrad · 5:7:9:11', ru:'Тетрада · 5:7:9:11'}, iv:['1','7/5','9/5','11/5']},
      {label:'7:9:11', full:{en:'Triad · 7:9:11 (435/782¢)', ru:'Триада · 7:9:11 (435/782¢)'}, iv:['1','9/7','11/7']},
      {label:'5:7', full:{en:'Dyad · 5:7 (583¢, septimal tritone)', ru:'Диада · 5:7 (583¢, септим. тритон)'}, iv:['1','7/5']},
      {label:'5:9', full:{en:'Dyad · 5:9 (1018¢)', ru:'Диада · 5:9 (1018¢)'}, iv:['1','9/5']},
    ]},
    {id:'char', name:{en:'Characteristic', ru:'Характерные'}, finger:2, types:[
      {label:'9/7', full:{en:'Supermajor third · 9/7 (435¢) + 7/3', ru:'Супермажор. терция · 9/7 (435¢) + 7/3'}, iv:['1','9/7','7/3']},
      {label:'7/5', full:{en:'Septimal tritone · 7/5 (583¢) + 7/3', ru:'Септим. тритон · 7/5 (583¢) + 7/3'}, iv:['1','7/5','7/3']},
      {label:'15/7', full:{en:'Upper · 3:5:15/7 (885/1319¢)', ru:'Верхняя · 3:5:15/7 (885/1319¢)'}, iv:['1','5/3','15/7']},
      {label:'25/9', full:{en:'Stack of 5/3 · 9:15:25 (symmetric)', ru:'Стопка 5/3 · 9:15:25 (симметр.)'}, iv:['1','5/3','25/9']},
      {label:'49/25', full:{en:'Stack of 7/5 · 25:35:49 (symmetric)', ru:'Стопка 7/5 · 25:35:49 (симметр.)'}, iv:['1','7/5','49/25']},
    ]},
    ] },
    /* ── Болен–Пирс, режим «КАК НА ИНСТРУМЕНТЕ» (T7b; был набором 'bp' в T7). ⛳ T7 (решение пользователя, по теории): аккорды — ИЗ ШАГОВ СТРОЯ, как играют равный BP:
    интервалы — ЦЕЛЫЕ ШАГИ (1 шаг = 1901.955/13 ≈ 146.30¢), равная ветка цены (как chrom12/edo19/edo31: шаг корня + шаг типа, без
    приведения — тритава = 13). Прежде — чистые отношения подгруппы 3.5.7 от корня (period-ветка). Каждый шаг — ближайший к
    отношению (round(13·log₃ r)); отступление от отношения — в подписи. Аккорды с 11 (3:5:7:9:11, 5:7:9:11, 7:9:11) СНЯТЫ: 11 — вне
    теории BP (3, 5 и 7), и в 13-равном строе он лежит в 48–55¢ от любой ступени. Метки — по-прежнему отношения (имя аккорда), полное
    имя — шаги и центы. Колонки разной длины (4/3/5) — палитра это держит. */
    bpsteps:{ format:'handsong/palette', version:1, id:'bpsteps', kind:'steps', families:[
    // T7b: набор T7 — режим «Как на инструменте» (вид подставляет typedChords:'bpsteps')
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
      {label:'3:5:7', full:{en:'Major triad · 3:5:7 = steps 0·6·10 (878/1463¢; −6.5/−3.8 from pure)', ru:'Мажорная триада · 3:5:7 = шаги 0·6·10 (878/1463¢; −6.5/−3.8 от чистых)'}, iv:[0,6,10]},
      {label:'3:5:7:9', full:{en:'Tetrad · 3:5:7:9 = steps 0·6·10·13 (top = tritave, exact)', ru:'Тетрада · 3:5:7:9 = шаги 0·6·10·13 (верх = тритава, точно)'}, iv:[0,6,10,13]},
      {label:'3:5', full:{en:'Dyad · 3:5 = 6 steps (878¢; −6.5)', ru:'Диада · 3:5 = 6 шагов (878¢; −6.5)'}, iv:[0,6]},
      {label:'3:7', full:{en:'Dyad · 3:7 = 10 steps (1463¢; −3.8)', ru:'Диада · 3:7 = 10 шагов (1463¢; −3.8)'}, iv:[0,10]},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
      {label:'5:7:9', full:{en:'Minor triad · 5:7:9 = steps 0·4·7 (585/1024¢; +2.7/+6.5 from pure)', ru:'Минорная триада · 5:7:9 = шаги 0·4·7 (585/1024¢; +2.7/+6.5 от чистых)'}, iv:[0,4,7]},
      {label:'5:7', full:{en:'Dyad · 5:7 = 4 steps (585¢; septimal tritone, +2.7)', ru:'Диада · 5:7 = 4 шага (585¢; септим. тритон, +2.7)'}, iv:[0,4]},
      {label:'5:9', full:{en:'Dyad · 5:9 = 7 steps (1024¢; +6.5)', ru:'Диада · 5:9 = 7 шагов (1024¢; +6.5)'}, iv:[0,7]},
    ]},
    {id:'char', name:{en:'Characteristic', ru:'Характерные'}, finger:2, types:[
      {label:'9/7', full:{en:'Supermajor third 9/7 + 7/3 = steps 0·3·10 (439/1463¢; +3.8/−3.8)', ru:'Супермажор. терция 9/7 + 7/3 = шаги 0·3·10 (439/1463¢; +3.8/−3.8)'}, iv:[0,3,10]},
      {label:'7/5', full:{en:'Septimal tritone 7/5 + 7/3 = steps 0·4·10 (585/1463¢; +2.7/−3.8)', ru:'Септим. тритон 7/5 + 7/3 = шаги 0·4·10 (585/1463¢; +2.7/−3.8)'}, iv:[0,4,10]},
      {label:'15/7', full:{en:'Upper · 3:5:15/7 = steps 0·6·9 (878/1317¢; −6.5/−2.7)', ru:'Верхняя · 3:5:15/7 = шаги 0·6·9 (878/1317¢; −6.5/−2.7)'}, iv:[0,6,9]},
      {label:'25/9', full:{en:'Stack of 5/3 · 9:15:25 = steps 0·6·12 (878/1756¢; −6.5/−13.1)', ru:'Стопка 5/3 · 9:15:25 = шаги 0·6·12 (878/1756¢; −6.5/−13.1)'}, iv:[0,6,12]},
      {label:'49/25', full:{en:'Stack of 7/5 · 25:35:49 = steps 0·4·8 (585/1170¢; +2.7/+5.4)', ru:'Стопка 7/5 · 25:35:49 = шаги 0·4·8 (585/1170¢; +2.7/+5.4)'}, iv:[0,4,8]},
    ]},
    ] },
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
    nat:{ format:'handsong/palette', version:1, id:'nat', kind:'ratios', families:[
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
      {label:'M', full:{en:'Major · 4:5:6 pure, beatless', ru:'Мажор · 4:5:6 чистый, без биения'}, iv:['1','5/4','3/2']},
      {label:'maj7', full:{en:'Maj7 · seventh 15/8', ru:'Maj7 · септима 15/8'}, iv:['1','5/4','3/2','15/8']},
      {label:'7', full:{en:'Dominant 7th · 9/5', ru:'Домин.7 · 9/5'}, iv:['1','5/4','3/2','9/5']},
      {label:'6', full:{en:'Major 6 · sixth 5/3', ru:'Мажор 6 · секста 5/3'}, iv:['1','5/4','3/2','5/3']},
      {label:'add9', full:'Add9 · 9/4', iv:['1','5/4','3/2','9/4']},
      {label:'7#9', full:'7#9 · 12/5', iv:['1','5/4','3/2','9/5','12/5']},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
      {label:'m', full:{en:'Minor · third 6/5 pure', ru:'Минор · терция 6/5 чистая'}, iv:['1','6/5','3/2']},
      {label:'m7', full:{en:'Minor 7 · 9/5', ru:'Минор 7 · 9/5'}, iv:['1','6/5','3/2','9/5']},
      {label:'m6', full:{en:'Minor 6 · 5/3', ru:'Минор 6 · 5/3'}, iv:['1','6/5','3/2','5/3']},
      {label:'mM7', full:{en:'Minor-major 7 · 15/8', ru:'Мин-мажор 7 · 15/8'}, iv:['1','6/5','3/2','15/8']},
      {label:'m9', full:{en:'Minor 9 · 9/4', ru:'Минор 9 · 9/4'}, iv:['1','6/5','3/2','9/5','9/4']},
      {label:'madd9', full:{en:'Minor add9 · 9/4', ru:'Минор add9 · 9/4'}, iv:['1','6/5','3/2','9/4']},
    ]},
    {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[
      {label:'dim', full:{en:'Diminished · 45/32', ru:'Уменьшённое · 45/32'}, iv:['1','6/5','45/32']},
      {label:'m7b5', full:{en:'Half-diminished', ru:'Полууменьшённое'}, iv:['1','6/5','45/32','9/5']},
      {label:'dim7', full:{en:'Diminished 7th · 5/3', ru:'Ум. септаккорд · 5/3'}, iv:['1','6/5','45/32','5/3']},
      {label:'aug', full:{en:'Augmented · 8/5', ru:'Увеличенное · 8/5'}, iv:['1','5/4','8/5']},
      {label:'aug7', full:{en:'Augmented 7', ru:'Увелич. 7'}, iv:['1','5/4','8/5','9/5']},
      {label:'augM7', full:{en:'Augmented-major 7', ru:'Увелич.-мажор 7'}, iv:['1','5/4','8/5','15/8']},
    ]},
    {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[
      {label:'sus2', full:'Sus2 · 9/8', iv:['1','9/8','3/2']},
      {label:'sus4', full:{en:'Sus4 · 4/3 (pure fourth)', ru:'Sus4 · 4/3 (чистая кварта)'}, iv:['1','4/3','3/2']},
      {label:'7sus4', full:'7sus4', iv:['1','4/3','3/2','9/5']},
      {label:'6/9', full:{en:'Major 6/9', ru:'Мажор 6/9'}, iv:['1','5/4','3/2','5/3','9/4']},
      {label:'maj9', full:'Maj9', iv:['1','5/4','3/2','15/8','9/4']},
      {label:'13', full:{en:'13 · sixth 10/3', ru:'13 · секста 10/3'}, iv:['1','5/4','3/2','9/5','10/3']},
    ]},
    ] },
    /* ── Натуральный ФИКСИРОВАННЫЙ (клавесин): ТА ЖЕ 24-аккордовая лексика, что chrom12/nat, но iv —
    ЦЕЛЫЕ ПОЛУТОНОВЫЕ СМЕЩЕНИЯ (как chrom12, НЕ отношения). chordFreqs с веткой s.gridChords читает
    ноту (корень+off) ИЗ cents-сетки строя — оттого часть аккордов чистые, часть волк (см. коммент
    ветки). Структура/метки 1-в-1 с chrom12; отличается только тем, что лад (gridChords) трактует
    эти же числа через фиксированную сетку, а не 12-TET. Разметки «волк» в UI НЕТ — учит ухо. */
    natfix:{ format:'handsong/palette', version:1, id:'natfix', kind:'steps', families:[
    {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
      {label:'M', iv:[0,4,7]},
      {label:'maj7', iv:[0,4,7,11]},
      {label:'7', iv:[0,4,7,10]},
      {label:'6', iv:[0,4,7,9]},
      {label:'add9', iv:[0,4,7,14]},
      {label:'7#9', iv:[0,4,7,10,15]},
    ]},
    {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
      {label:'m', iv:[0,3,7]},
      {label:'m7', iv:[0,3,7,10]},
      {label:'m6', iv:[0,3,7,9]},
      {label:'mM7', iv:[0,3,7,11]},
      {label:'m9', iv:[0,3,7,10,14]},
      {label:'madd9', iv:[0,3,7,14]},
    ]},
    {id:'dim', name:{en:'Dim./Aug.', ru:'Ум./Ув.'}, finger:2, types:[
      {label:'dim', iv:[0,3,6]},
      {label:'m7b5', iv:[0,3,6,10]},
      {label:'dim7', iv:[0,3,6,9]},
      {label:'aug', iv:[0,4,8]},
      {label:'aug7', iv:[0,4,8,10]},
      {label:'augM7', iv:[0,4,8,11]},
    ]},
    {id:'sus', name:{en:'Sus & extended', ru:'Sus и расшир.'}, finger:3, types:[
      {label:'sus2', iv:[0,2,7]},
      {label:'sus4', iv:[0,5,7]},
      {label:'7sus4', iv:[0,5,7,10]},
      {label:'6/9', iv:[0,4,7,9,14]},
      {label:'maj9', iv:[0,4,7,11,14]},
      {label:'13', iv:[0,4,7,10,21]},
    ]},
    ] },
  },

  /* ⛳ T6a: chordRule — ПРАВИЛО НЕТИПИЗИРОВАННОГО АККОРДА ЛАДА, ДАННЫМИ (как id и tuning в T0). Каким будет аккорд, когда тип ему не задан:
     {kind:'tertian'} — стопка терций по выборке лада (через ступень: i, i+2, i+4, +6 у септаккорда); диатоника, этнические и симметричные,
                        макамы (у тех аккордов нет — noChords — и правило 'none' важнее);
     {kind:'stack'}   — СТОПКА ЧЕРЕЗ СТУПЕНЬ ЛАДА, как tertian (i, i+2, i+4, +6 у септаккорда), но в 5–6-ступенных ладах — пентатоники,
                        блюз, японские (решение пользователя, записано при T6b): каждый тон аккорда — внутри лада. Отдельный вид, а не tertian,
                        потому что такая стопка — не всегда терции (C–E–A, D–G–C…), и подпись у неё своя (stackLabel);
     {kind:'power'}   — корень + квинта строя + период; в данных ладов как правило не стоит, а приходит РЕЖИМОМ АККОРДОВ «Пауэр-аккорд»
                        у 14 ладов стопки (T7b: вид подставляет chordRule:{kind:'power'}; R.powerOld снят в T4c-2), и — формой
                        недостижимого аккорда без типа у ладов с палитрой;
     {kind:'ratios', triad, seventh} — интервалы ОТНОШЕНИЯМИ, округлёнными к шагу строя (19/31-TET; сюда переехали прежние поля chord/chord7);
     {kind:'palette'} — у лада ПАЛИТРА (typedChords) и своего нетипизированного правила нет: аккорд без типа здесь не пишется ни одним путём;
     {kind:'none'}    — аккордов нет (сборщик ставит объекту лада noChords).
   ⚠️ С T6b ЦЕНУ, с T6c ПОДПИСИ (chordLabel, chordNotesStr) решает правило (ruleChordSteps); прежний выбор по tag — опора пробы
   (P.checkRules). Правило едет в вид лада (scaleView копирует поля). */
  /* ═══ ⛳ T7b — РЕЖИМЫ АККОРДОВ ЛАДА (решение пользователя: «надо дать выбор — режим, где доступно всё, как раньше, и режим, как сейчас,
   верный живому инструменту; иначе мы заранее сужаем музыкальные возможности людей») ═══
   ПРИНЦИП: не сужать возможности — когда теория ограничивает, ограничение предлагается РЕЖИМОМ, а не правилом.
   Режим — ДАННЫЕ: { id, nameKey, hintKey (словарь en+ru), set: {build?, palette?, rule?} } — сборщик кладёт set в over объекта режима
   (chordBuild / typedChords / chordRule), и over ложится ПОВЕРХ полей лада в его ВИДЕ (scaleView); лад ссылается на набор chords.modes. Поэтому режим
   МОРОЗИТСЯ В ВИДЕ (правило #7, как «строй от»): каждое событие держит sc — вид со своим режимом — и звучит, как записано, при любом
   положении переключателя; смена режима — смена вида, и запись уходит в НОВУЮ дорожку (маршрут по строю, как смена лада или «строй от»).
   Первый режим списка — УМОЛЧАНИЕ. Читатели ничего не знают о режимах: они читают поля вида (chordBuild, typedChords, chordRule).
     free / instrument — Партч и Болен–Пирс: «Свободно» (ПО УМОЛЧАНИЮ) — любой тип на любом корне чистыми отношениями, РОВНО как до T7
       (chordBuild 'adaptive': ворота chordTypeFits открыты, у Б–П — прежний набор 'bp' с аккордами на 11 и ветка периода); «Как на
       инструменте» — T7: Партч только из 43 высот (chordBuild 'tuning'), Б–П — из шагов строя без 11 (набор 'bpsteps').
     stack / power — 14 ладов пентатоник, блюза и японских: «Стопкой» (по умолчанию — стопка через ступень лада, каждый тон в ладу) и
       «Пауэр-аккорд» (прежнее правило: корень, квинта строя, октава — квинта бывает вне лада). */
  chordModeSets:{
    freeInstrument:{ format:'handsong/chordmodes', version:1, id:'freeInstrument', modes:[ {id:'free', nameKey:'cm.free', hintKey:'cm.free.hint', set:{build:'adaptive'}}, {id:'instrument', nameKey:'cm.instrument', hintKey:'cm.instrument.hint', set:{build:'tuning'}} ] },
    freeInstrumentBP:{ format:'handsong/chordmodes', version:1, id:'freeInstrumentBP', modes:[ {id:'free', nameKey:'cm.free', hintKey:'cm.free.hint', set:{build:'adaptive'}}, {id:'instrument', nameKey:'cm.instrument', hintKey:'cm.instrumentBP.hint', set:{build:'tuning', palette:'bpsteps'}} ] },
    stackPower:{ format:'handsong/chordmodes', version:1, id:'stackPower', modes:[ {id:'stack', nameKey:'cm.stack', hintKey:'cm.stack.hint', set:{}}, {id:'power', nameKey:'cm.power', hintKey:'cm.power.hint', set:{rule:{kind:'power'}}} ] },
  },

  /* ЛАД — ВЫБОРКА ИЗ СТРОЯ: tuning (id строя), degrees — индексы строя, на которых стоят ступени, по порядку (индекс ≥ числа высот —
   та же высота периодом выше), root — индекс, на котором стоит ступень 0 (0 у всех, кроме патета Баранг: 1). anchor — от чего строится
   (тоника / приколоченная нота / выбор «строй от»), chords — правило, палитра, сетка, сборка, набор режимов, menu — традиция и группа,
   layout.rect — открываться прямоугольниками, naming — переопределение схемы имён ступеней (F3), compat.tag — семейство (см. шапку).
   ⛳ С F2 направление вывода обратное прежнему: данные — выборка, а edo, iv, центы ступеней, period, noChords и флаги ВЫВОДИТ сборщик
   scales.js (комментарий над ним перечисляет, что и как). Лады, которые ЕСТЬ свой строй целиком, выбирают все его высоты; раги и патеты —
   часть (центы ступени = центы высоты строя минус центы корня). Ниже в комментариях лада «edo/iv/центы лада» — поля ОБЪЕКТА приложения,
   которые сборщик строит из этих данных.
   ⛳ F1: лад АДРЕСУЕТСЯ СТАБИЛЬНЫМ id (state.scaleId, scaleById; меню, уроки, демо, пины заморозки и рендера). Порядок manifest.modes —
   порядок внутри корзины меню (menuOf) и индекс i в снимке F0, поэтому новые лады — В КОНЕЦ манифеста. Меню фильтрует по традиции. */
  modes:{
    major:{ format:'handsong/mode', version:1, id:'major', tuning:'edo12', name:{en:'Major (Ionian)', ru:'Мажор (ионийский)'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,4,5,7,9,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    'natural-minor':{ format:'handsong/mode', version:1, id:'natural-minor', tuning:'edo12', name:{en:'Natural minor (Aeolian)', ru:'Минор натуральный (эолийский)'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,3,5,7,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    'harmonic-minor':{ format:'handsong/mode', version:1, id:'harmonic-minor', tuning:'edo12', name:{en:'Harmonic minor', ru:'Гармонический минор'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,3,5,7,8,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    'melodic-minor':{ format:'handsong/mode', version:1, id:'melodic-minor', tuning:'edo12', name:{en:'Melodic minor', ru:'Мелодический минор'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,3,5,7,9,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    dorian:{ format:'handsong/mode', version:1, id:'dorian', tuning:'edo12', name:{en:'Dorian', ru:'Дорийский'}, menu:{tradition:'common', group:'modes'}, degrees:[0,2,3,5,7,9,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    phrygian:{ format:'handsong/mode', version:1, id:'phrygian', tuning:'edo12', name:{en:'Phrygian', ru:'Фригийский'}, menu:{tradition:'common', group:'modes'}, degrees:[0,1,3,5,7,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    lydian:{ format:'handsong/mode', version:1, id:'lydian', tuning:'edo12', name:{en:'Lydian', ru:'Лидийский'}, menu:{tradition:'common', group:'modes'}, degrees:[0,2,4,6,7,9,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    mixolydian:{ format:'handsong/mode', version:1, id:'mixolydian', tuning:'edo12', name:{en:'Mixolydian', ru:'Миксолидийский'}, menu:{tradition:'common', group:'modes'}, degrees:[0,2,4,5,7,9,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    locrian:{ format:'handsong/mode', version:1, id:'locrian', tuning:'edo12', name:{en:'Locrian', ru:'Локрийский'}, menu:{tradition:'common', group:'modes'}, degrees:[0,1,3,5,6,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    'hungarian-minor':{ format:'handsong/mode', version:1, id:'hungarian-minor', tuning:'edo12', name:{en:'Hungarian minor', ru:'Венгерский минор'}, menu:{tradition:'common', group:'ethnic'}, degrees:[0,2,3,6,7,8,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'major-penta':{ format:'handsong/mode', version:1, id:'major-penta', tuning:'edo12', name:{en:'Major pentatonic', ru:'Мажорная пентатоника'}, menu:{tradition:'common', group:'pentaBlues'}, degrees:[0,2,4,7,9], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'minor-penta':{ format:'handsong/mode', version:1, id:'minor-penta', tuning:'edo12', name:{en:'Minor pentatonic', ru:'Минорная пентатоника'}, menu:{tradition:'common', group:'pentaBlues'}, degrees:[0,3,5,7,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    blues:{ format:'handsong/mode', version:1, id:'blues', tuning:'edo12', name:{en:'Blues (with ♭5)', ru:'Блюз (с ♭5)'}, menu:{tradition:'common', group:'pentaBlues'}, degrees:[0,3,5,6,7,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'blues'} },
    chromatic:{ format:'handsong/mode', version:1, id:'chromatic', tuning:'edo12', name:{en:'Chromatic (12 notes)', ru:'Хроматика (12 нот)'}, menu:{tradition:'common', group:'chromatic'}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'palette'}, palette:'chrom12'}, compat:{tag:'chrom'} },
    'maqam-rast':{ format:'handsong/mode', version:1, id:'maqam-rast', tuning:'edo24', name:{en:'Maqam Rast (quarter-tones)', ru:'Макам Раст (¼-тоны)'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,4,7,10,14,18,21], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'maqam-bayati':{ format:'handsong/mode', version:1, id:'maqam-bayati', tuning:'edo24', name:{en:'Maqam Bayati (quarter-tones)', ru:'Макам Баяти (¼-тоны)'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,3,6,10,14,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'edo19-full':{ format:'handsong/mode', version:1, id:'edo19-full', tuning:'edo19', name:{en:'19-TET — full tuning', ru:'19-TET — весь строй'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'ratios', triad:['1','6/5','3/2'], seventh:['1','6/5','3/2','9/5']}, palette:'edo19'}, layout:{rect:true}, compat:{tag:'edo'} },   // мин.терция 5ш (+0.2¢), кв.11, мал.7 16ш (−7¢)
    'edo31-full':{ format:'handsong/mode', version:1, id:'edo31-full', tuning:'edo31', name:{en:'31-TET — full tuning', ru:'31-TET — весь строй'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'ratios', triad:['1','5/4','3/2'], seventh:['1','5/4','3/2','7/4']}, palette:'edo31'}, layout:{rect:true}, compat:{tag:'edo'} },   // маж.терция 10ш (+0.8¢), кв.18, нат.7 25ш (−1.1¢) = 4:5:6:7
    /* Хиджаз: джинс Хиджаз (0-1-4-5 полутонов, характерная увеличенная секунда 2→8
    в четвертях) + джинс Нахаванд сверху. Четвертитонов НЕ содержит — отсюда имя без
    пометки «¼-тоны», хотя традиция та же, 24-TET. Стоит в конце манифеста (индекс не сдвинул прочих). */
    /* арабская романизация Hijaz; турецкая — Hicaz (строй тут арабский, 24-TET) */
    'maqam-hijaz':{ format:'handsong/mode', version:1, id:'maqam-hijaz', tuning:'edo24', name:{default:'Maqam Hijaz', ru:'Макам Хиджаз'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,2,8,10,14,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    /* Мажоры с пониженной VI — пара к гармоническому/мелодическому минору: ♭VI даёт
    увеличенное трезвучие на VI ступени (qual: 4+8 → «+»), ради него их и берут.
    Стоят в конце манифеста, а в меню встают внутрь группы «Диатоника»
    к минорам — порядок в выпадашке задаёт menuOf группировкой по группе, не манифестом. */
    'harmonic-major':{ format:'handsong/mode', version:1, id:'harmonic-major', tuning:'edo12', name:{en:'Harmonic major', ru:'Гармонический мажор'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,4,5,7,8,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    'melodic-major':{ format:'handsong/mode', version:1, id:'melodic-major', tuning:'edo12', name:{en:'Melodic major', ru:'Мелодический мажор'}, menu:{tradition:'common', group:'diatonic'}, degrees:[0,2,4,5,7,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'dia'} },
    /* Симметричные и экзотические 12-TET лады. Правило 'tertian' → аккорды наслоением терций по
    индексу, спец-ветки НЕ нужны: целотоновая сама даёт увеличенные трезвучия,
    октатоники — уменьшённые (°/°7). Плотные лады (Мессиан-3, Прометеев) на части
    ступеней дают «?» в подписи аккорда — это косметика, звучит и пишется верно.
    Индексы 21..28 (конец манифеста), в меню — две свои группы. */
    'whole-tone':{ format:'handsong/mode', version:1, id:'whole-tone', tuning:'edo12', name:{en:'Whole-tone', ru:'Целотоновая'}, menu:{tradition:'common', group:'symmetric'}, degrees:[0,2,4,6,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'octatonic-wh':{ format:'handsong/mode', version:1, id:'octatonic-wh', tuning:'edo12', name:{en:'Octatonic (whole-half)', ru:'Октатоника (тон-полутон)'}, menu:{tradition:'common', group:'symmetric'}, degrees:[0,2,3,5,6,8,9,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'octatonic-hw':{ format:'handsong/mode', version:1, id:'octatonic-hw', tuning:'edo12', name:{en:'Octatonic (half-whole)', ru:'Октатоника (полутон-тон)'}, menu:{tradition:'common', group:'symmetric'}, degrees:[0,1,3,4,6,7,9,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'messiaen-3':{ format:'handsong/mode', version:1, id:'messiaen-3', tuning:'edo12', name:{en:'Messiaen mode 3', ru:'Мессиан, мод 3'}, menu:{tradition:'common', group:'symmetric'}, degrees:[0,2,3,4,6,7,8,10,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'phrygian-dominant':{ format:'handsong/mode', version:1, id:'phrygian-dominant', tuning:'edo12', name:{en:'Phrygian dominant', ru:'Фригийский доминантный'}, menu:{tradition:'common', group:'exotic'}, degrees:[0,1,4,5,7,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    'double-harmonic':{ format:'handsong/mode', version:1, id:'double-harmonic', tuning:'edo12', name:{en:'Double harmonic', ru:'Двойной гармонический'}, menu:{tradition:'common', group:'exotic'}, degrees:[0,1,4,5,7,8,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    enigmatic:{ format:'handsong/mode', version:1, id:'enigmatic', tuning:'edo12', name:{en:'Enigmatic (Verdi)', ru:'Энигматическая (Верди)'}, menu:{tradition:'common', group:'exotic'}, degrees:[0,1,4,6,8,10,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    prometheus:{ format:'handsong/mode', version:1, id:'prometheus', tuning:'edo12', name:{en:'Prometheus (Scriabin)', ru:'Прометеевский (Скрябин)'}, menu:{tradition:'common', group:'exotic'}, degrees:[0,2,4,6,9,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'tertian'}}, compat:{tag:'ethnic'} },
    /* Мировые пентатоники. Правило 'stack' (стопка через ступень лада; режимом аккордов «Пауэр-аккорд» —
    прежний корень+квинта+октава), спец-веток НЕ нужно; на 5-6 нотах терции дают кашу, потому
    не терции. Аккорды есть у всех. Блюзовая мажорная берёт СУЩЕСТВУЮЩУЮ группу
    'Пентатоника / блюз' (строка 1-в-1 как у Мажорной/Минорной/Блюза) — в меню встаёт
    внутрь неё, а не отдельной группой. Индексы 29..35 (конец манифеста). */
    egyptian:{ format:'handsong/mode', version:1, id:'egyptian', tuning:'edo12', name:{en:'Egyptian (suspended)', ru:'Египетская (суспенд.)'}, menu:{tradition:'common', group:'worldPenta'}, degrees:[0,2,5,7,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    /* «Man Gong» — имя из ЗАПАДНЫХ сводов ладов, приписываемое китайской музыке (пентатоника 1-♭3-4-♭6-♭7, она же блюзовая минорная). КАНОНИЧЕСКИЕ китайские лады зовутся Gong/Shang/Jue/Zhi/Yu — честная оговорка, как с именами шрути */
    'man-gong':{ format:'handsong/mode', version:1, id:'man-gong', tuning:'edo12', name:{en:'Man Gong (Chinese)', ru:'Ман гонг (китайская)'}, menu:{tradition:'easia', group:'fareastPenta'}, degrees:[0,3,5,8,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    /* Ritusen — написание из сводов ладов (пентатоника 1-2-4-5-6, блюзовая мажорная; связывают с рагой Дурга); от японского лада рицу (律) — тоже компиляционное имя */
    ritusen:{ format:'handsong/mode', version:1, id:'ritusen', tuning:'edo12', name:{default:'Ritusen', ru:'Ритусэн'}, menu:{tradition:'easia', group:'fareastPenta'}, degrees:[0,2,5,7,9], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'hungarian-penta':{ format:'handsong/mode', version:1, id:'hungarian-penta', tuning:'edo12', name:{en:'Hungarian pentatonic', ru:'Венгерская пентатоника'}, menu:{tradition:'common', group:'worldPenta'}, degrees:[0,3,5,6,9], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'scriabin-penta':{ format:'handsong/mode', version:1, id:'scriabin-penta', tuning:'edo12', name:{en:'Scriabin pentatonic', ru:'Скрябинская пентатоника'}, menu:{tradition:'common', group:'worldPenta'}, degrees:[0,2,4,7,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'kumoi-western':{ format:'handsong/mode', version:1, id:'kumoi-western', tuning:'edo12', name:{en:'Kumoi (Western)', ru:'Кумои (зап.)'}, menu:{tradition:'easia', group:'fareastPenta'}, degrees:[0,1,5,7,8], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'major-blues':{ format:'handsong/mode', version:1, id:'major-blues', tuning:'edo12', name:{en:'Major blues', ru:'Блюзовая мажорная'}, menu:{tradition:'common', group:'pentaBlues'}, degrees:[0,2,3,4,7,9], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    /* Макамы (24-TET). Традиция 'mideast', compat.tag 'maqam', правило аккордов 'none' — как у Раст/Баяти/Хиджаз:
    аккордов нет (роль «Аккорды» показывает подсказку, гейт supportsChords). Все десять
    (три прежних + семь новых) сведены в одну группу 'maqamat' — один ключ,
    иначе корзины бы разъехались. Индексы 36..42 (конец манифеста). */
    'maqam-saba':{ format:'handsong/mode', version:1, id:'maqam-saba', tuning:'edo24', name:{default:'Maqam Saba', ru:'Макам Саба'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,3,6,8,14,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    /* арабская Sikah; турецко-персидская — Segah */
    'maqam-sikah':{ format:'handsong/mode', version:1, id:'maqam-sikah', tuning:'edo24', name:{default:'Maqam Sikah', ru:'Макам Сикях'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,3,7,11,14,17,21], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'maqam-nahawand':{ format:'handsong/mode', version:1, id:'maqam-nahawand', tuning:'edo24', name:{en:'Maqam Nahawand (tuned like natural minor)', ru:'Макам Нахаванд (строй как у натур. минора)'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,4,6,10,14,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'maqam-kurd':{ format:'handsong/mode', version:1, id:'maqam-kurd', tuning:'edo24', name:{en:'Maqam Kurd (tuned like Phrygian)', ru:'Макам Курд (строй как у фригийского)'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,2,6,10,14,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'maqam-ajam':{ format:'handsong/mode', version:1, id:'maqam-ajam', tuning:'edo24', name:{en:'Maqam Ajam (tuned like major)', ru:'Макам Аджам (строй как у мажора)'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,4,8,10,14,18,22], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    'maqam-nikriz':{ format:'handsong/mode', version:1, id:'maqam-nikriz', tuning:'edo24', name:{default:'Maqam Nikriz', ru:'Макам Никриз'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,4,6,12,14,18,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    /* встречается и слитно — Nawathar */
    'maqam-nawa-athar':{ format:'handsong/mode', version:1, id:'maqam-nawa-athar', tuning:'edo24', name:{default:'Maqam Nawa Athar', ru:'Макам Нава Атар'}, menu:{tradition:'mideast', group:'maqamat'}, degrees:[0,4,6,12,14,16,22], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'maqam'} },
    /* Мировые строи — НЕравномерные: табличный строй (pitches.list, центы каждой высоты), лад выбирает
    его высоты (degrees). Высоту считает одна функция высоты по строю, структуру (число ступеней,
    сетка, ряды) — номинальные edo/iv объекта лада. Слендро: приближение яванского гамелана, шаги неравные
    (2-я ступень 231¢, не 240¢ равной пентатоники). Аккордов нет (правило 'none'): терции гамелану чужды. */
    slendro:{ format:'handsong/mode', version:1, id:'slendro', tuning:'slendro', name:{en:'Slendro (Javanese gamelan, approx.)', ru:'Слендро (яван. гамелан, приближение)'}, menu:{tradition:'easia', group:'gamelan'}, degrees:[0,1,2,3,4], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    pelog:{ format:'handsong/mode', version:1, id:'pelog', tuning:'pelog', name:{en:'Pelog (Javanese gamelan, approx.)', ru:'Пелог (яван. гамелан, приближение)'}, menu:{tradition:'easia', group:'gamelan'}, degrees:[0,1,2,3,4,5,6], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    /* Японские пентатоники (12-TET). Правило 'stack' (режимом — пауэр-аккорд), как у мировых пентатоник.
    Ин намеренно совпадает по iv с 'Кумои (зап.)' из мировых пентатоник — это разные лады
    по имени/группе, общие ступени безвредны (state по id лада, дорожка по ссылке на вид).
    Индексы 45..48 (конец манифеста), в меню — своя группа 'japanese'. */
    hirajoshi:{ format:'handsong/mode', version:1, id:'hirajoshi', tuning:'edo12', name:{default:'Hirajoshi', ru:'Хирадзёси'}, menu:{tradition:'easia', group:'japanese'}, degrees:[0,2,3,7,8], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'kumoi-japanese':{ format:'handsong/mode', version:1, id:'kumoi-japanese', tuning:'edo12', name:{en:'Kumoi (Japanese)', ru:'Кумои (яп.)'}, menu:{tradition:'easia', group:'japanese'}, degrees:[0,2,3,7,9], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    'in-insen':{ format:'handsong/mode', version:1, id:'in-insen', tuning:'edo12', name:{en:'In (Insen; same as Kumoi Western)', ru:'Ин (Инсэн; совпадает с Кумои зап.)'}, menu:{tradition:'easia', group:'japanese'}, degrees:[0,1,5,7,8], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    iwato:{ format:'handsong/mode', version:1, id:'iwato', tuning:'edo12', name:{default:'Iwato', ru:'Ивато'}, menu:{tradition:'easia', group:'japanese'}, degrees:[0,1,5,6,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'stack'}, modes:'stackPower'}, compat:{tag:'penta'} },
    /* Партч (Harry Partch, «Genesis of a Music») — 43-тоновая ЧИСТАЯ ИНТОНАЦИЯ (11-предельный
    тональный ромб). Центы посчитаны из канонических отношений (ниже); 2 знака сохраняют JI
    точно (в отличие от целочисленных приближений гамелана). Октава = 2/1 (тождество Партча),
    регистр 2^oct не трогаем — строй ОКТАВО-повторяющийся. палитра 'partch' (chords.palette): аккорды из
    ЧИСТЫХ ОТНОШЕНИЙ (11-предел, палитра О/У/Станд./Sus-11) — chordFreqs через cents-ветку
    множит корень на ratio напрямую, минуя 2^(шаг/edo). layout.rect: 43+1=44, 44/4=11 прямоугольников
    (кратность 4 держится). compat.tag 'ji' — не 'edo'/'penta': шаговых аккордов не строит, как равный EDO не читается.
    ⛳ T7b: это — режим «КАК НА ИНСТРУМЕНТЕ»; по умолчанию режим «СВОБОДНО» — любой тип на любом корне, как до T7 (chordModes).
    ⛳ T7 (решение пользователя, по теории): аккорд Партча — ТОЛЬКО ИЗ ЕГО 43 ВЫСОТ. На каждом корне предлагаются лишь типы, у которых
    КАЖДЫЙ тон (корень × отношение, приведённое в октаву) — одна из 43 (точные отношения — ratio у высот строя partch43, проверка —
    chordTypeFits); прочие на этом корне недоступны (серые в палитре, с причиной), и ⛔ НИКОГДА не подменяются ближайшими высотами —
    это была бы ложная отональность. Полная палитра — только на 1/1; на 21/20, 11/10, 14/11, 11/7 — ни одного типа. Цена прежняя.
    Отношения (они же — ratio у высот строя partch43): 1/1 81/80 33/32 21/20 16/15 12/11 11/10 10/9 9/8 8/7 7/6 32/27 6/5 11/9 5/4
    14/11 9/7 21/16 4/3 27/20 11/8 7/5 10/7 16/11 40/27 3/2 32/21 14/9 11/7 8/5 18/11 5/3
    27/16 12/7 7/4 16/9 9/5 20/11 11/6 15/8 40/21 64/33 160/81. Добавлен В КОНЕЦ (индекс 49). */
    'partch-43':{ format:'handsong/mode', version:1, id:'partch-43', tuning:'partch43', name:{en:'Partch (43 tones, just intonation)', ru:'Партч (43 тона, чистая интонация)'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'palette'}, palette:'partch', modes:'freeInstrument'}, layout:{rect:true}, compat:{tag:'ji'} },   // T7b: «Свободно» (умолч., как до T7) / «Как на инструменте» (T7)
    /* Болен–Пирс — НЕОКТАВНЫЙ строй: период не октава (2:1), а ТРИТАВА (3:1). 13 РАВНЫХ шагов
    3^(1/13) ≈ 146.3¢, полная тритава = 1901.955¢. РАВНОМЕРНЫЙ внутри периода (как 19/31-TET
    внутри октавы) — НЕ табличный: период строя '3/1' заменяет зашитую октаву в формуле высоты
    (periodOf: leadFreq/bassFreq берут P^oct и P^(шаг/edo)). Регистр (палец, 0..3) сдвигает на
    ТРИТАВУ. Палитра 'bp': аккорды подгруппы 3.5.7 (палитра Мажор/Минор/Характерные) — не
    шаги edo, а ЧИСТЫЕ ОТНОШЕНИЯ; chordFreqs через period-ветку (P!==2 && ty) берёт корень
    равным шагом (P^(iv/edo)) и множит на ratio напрямую. ⛳ T7b: так — в режиме «СВОБОДНО» (умолчание, набор 'bp'); в режиме «КАК НА ИНСТРУМЕНТЕ» (T7) аккорды —
    ИЗ ШАГОВ СТРОЯ, как играют равный Болен–Пирс (набор 'bpsteps' — целые шаги, равная ветка цены; 3:5:7 = 0·6·10 шагов, в 4–7¢ от
    отношений), аккорды с 11 сняты — вне теории BP (3, 5 и 7). Строй Карлос — позже. НЕ rect: (13+1)=14
    не делится на 4, layout.rect нельзя. compat.tag 'bp' — инертен у всех читателей (не 'edo'/'penta'/терции). Индекс 50. */
    'bohlen-pierce':{ format:'handsong/mode', version:1, id:'bohlen-pierce', tuning:'bp13', name:{en:'Bohlen–Pierce (13 equal, tritave)', ru:'Болен–Пирс (13 равных, тритава)'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'palette'}, palette:'bp', modes:'freeInstrumentBP'}, compat:{tag:'bp'} },   // T7b: «Свободно» — набор 'bp' отношениями, как до T7; «Как на инструменте» — 'bpsteps' (T7)
    /* Строи Уэнди Карлос — НЕОКТАВНЫЕ: у них НЕТ интервала эквивалентности вовсе. Карлос вывела их,
    поделив чистую КВИНТУ 3:2 на РАВНЫЕ части (alpha=9, beta=11, gamma=20) — не октаву. Моделируем
    строй с периодом '3/2' (квинта-генератор) и equal = число делений — РАВНЫЕ шаги (period^(шаг/equal), НЕ таблица):
    деление чистой квинты воспроизводит опубликованный шаг Карлос до <0.02¢ (alpha 77.995 vs 78.0,
    beta 63.814 vs 63.8, gamma 35.098 vs 35.1) — неслышимо. Регистр (палец) сдвигает на КВИНТУ (P^oct).
    Аккордов нет (правило 'none', стадия 1): аккорды Карлос — позже. НЕ rect: у неоктавного лада ЗАКРЫТАЯ форма (+1,
    верхняя тоника) не предлагается по построению (см. rectPad), а открытая требует iv.length%4===0 —
    у alpha 9 и beta 11 не делится. Прямоугольники им НЕДОСТУПНЫ, и это не выбор данных, а арифметика
    (у beta 11+1=12 делится СЛУЧАЙНО — период-гейт и не пускает её через закрытую форму). compat.tag 'carlos' — инертен у всех
    читателей tag (как 'bp': не 'dia'/'ethnic'/'maqam'/'edo'). Индексы 51/52/53. */
    'carlos-alpha':{ format:'handsong/mode', version:1, id:'carlos-alpha', tuning:'carlos-alpha', name:{en:'Carlos Alpha (9 steps of the fifth)', ru:'Карлос альфа (9 шагов квинты)'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'carlos'} },
    'carlos-beta':{ format:'handsong/mode', version:1, id:'carlos-beta', tuning:'carlos-beta', name:{en:'Carlos Beta (11 steps of the fifth)', ru:'Карлос бета (11 шагов квинты)'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'carlos'} },
    'carlos-gamma':{ format:'handsong/mode', version:1, id:'carlos-gamma', tuning:'carlos-gamma', name:{en:'Carlos Gamma (20 steps of the fifth)', ru:'Карлос гамма (20 шагов квинты)'}, menu:{tradition:'exp', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, layout:{rect:true}, compat:{tag:'carlos'} },
    /* Патеты пелога — 5-нотные ЛАДЫ, выбранные из 7-нотного пелога (те же cents-ступени, что у
    «Пелог» выше): Лима и Нем берут ступени 1-2-3-5-6, Баранг — 2-3-5-6-7 (нормирован от своей
    тоники, −120¢). Центы — ПРИБЛИЖЕНИЕ (у яванского гамелана нет эталона — та же оговорка, что
    у Слендро/Пелог); октаву 2:1 дописывает механизм; аккордов нет (гамелан монофоничен). ВАЖНО: Лима
    и Нем — ОДНИ И ТЕ ЖЕ ноты (обе на 1-2-3-5-6); различаются функцией/тоникой в традиции, не
    строем — держим двумя именованными записями НАРОЧНО (как две Кумои / Ин), это НЕ дубликат-баг.
    Баранг (2-3-5-6-7) — по-настоящему другой набор. Индексы 54/55/56. */
    'pelog-lima':{ format:'handsong/mode', version:1, id:'pelog-lima', tuning:'pelog', name:{en:'Pelog patet Lima (Javanese, approx.)', ru:'Пелог патет лима (яван., прибл.)'}, menu:{tradition:'easia', group:'gamelan'}, degrees:[0,1,2,4,5], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'pelog-nem':{ format:'handsong/mode', version:1, id:'pelog-nem', tuning:'pelog', name:{en:'Pelog patet Nem (Javanese, approx.)', ru:'Пелог патет нем (яван., прибл.)'}, menu:{tradition:'easia', group:'gamelan'}, degrees:[0,1,2,4,5], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'pelog-barang':{ format:'handsong/mode', version:1, id:'pelog-barang', tuning:'pelog', name:{en:'Pelog patet Barang (Javanese, approx.)', ru:'Пелог патет баранг (яван., прибл.)'}, menu:{tradition:'easia', group:'gamelan'}, degrees:[1,2,4,5,6], root:1, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    /* Пифагоров строй — 12 нот из цепочки ЧИСТЫХ квинт 3/2 (показатели −5..+6), свёрнутых в октаву.
    Квинты по построению ПРАКТИЧЕСКИ ЧИСТЫЕ (701.96¢), но большая терция 81/64 = 407.82¢ — ОСТРАЯ,
    на 22¢ выше чистой 5/4 (386.31¢): отсюда средневековое письмо параллельными квинтами и позднейшая
    нужда в темперациях. Cents-механизм даёт точную высоту (2^(центы/1200)); октаву 2:1 дописывает
    сам механизм. ⛳ P2 дуги «СТРОЙ ОТ» (решение пользователя: «Пифагоров строй должен звучать как Пифагоров строй; аккордов
    из других строёв в нём быть не должно»): аккорды — ИЗ СОБСТВЕННЫХ НОТ ИНСТРУМЕНТА, как у прочих темпераций: палитра 'natfix'
    (те же 24 типа, целые полутоновые смещения) + chords.grid — chordNotes берёт корень и КАЖДЫЙ тон аккорда из сетки строя.
    Нота, попавшая на волчью квинту, звучит так, как её даёт инструмент, — без особого случая (как у фиксированного Натурального и
    мезотона). Прежний набор чистых отношений 'pyth' удалён (P2): кроме этого лада им не пользовался никто.
    ⛳ P3: anchor 'choice' — у этого лада есть выбор «СТРОЙ ОТ» (нота, от которой строится цепочка квинт; по умолчанию СЛЕДУЕТ
    ЗА ТОНИКОЙ — state.tunedFrom), и живой лад приходит ВИДОМ на свой якорь (scaleView ниже; с T2 — у каждого лада). Сам объект лада без варианта
    — настроен ОТ C (anchorOf → 0); демо стартового экрана с F1 берёт вид «строй от» C — тот же звук. Натуральный (чистые терции, но фальшивые
    квинты) — контрапара. традиция 'europe' (секция
    «Европа историческая», без группы — плоский хронологический список): секция ПРО РАЗНЫЕ
    СТРОИ ОДНИХ И ТЕХ ЖЕ 12 НОТ (темперация ≠ лад), а НЕ утверждение, будто макам/гамелан «менее
    историчны» — те живут в своих секциях. Сюда же Натуральный/мезотон/велл-темперации, по времени сверху
    вниз. compat.tag 'penta' — инертный (как у Слендро/Пелог: не 'dia'/'ethnic'/'maqam'/'edo'). Индекс 57. */
    pythagorean:{ format:'handsong/mode', version:1, id:'pythagorean', tuning:'pythagorean12', name:{en:'Pythagorean tuning (pure fifths)', ru:'Пифагоров строй (чистые квинты)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'choice'}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
    /* Натуральный строй, ПОДВИЖНЫЙ (хор/струнные) — 5-предельная ЧИСТАЯ ИНТОНАЦИЯ: интервалы суть простые
    целочисленные отношения прямо из обертонового ряда (16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3,
    9/5, 15/8). Большая терция 5/4 = 386.31¢ — ЧИСТАЯ (замок 4:5:6, без биения), в отличие от резкой
    пифагоровой 81/64 = 407.82¢: обе терции расходятся на СИНТОНИЧЕСКУЮ КОММУ (21.5¢), а квинты одинаковы
    (обе чистые 3/2). палитра 'nat' — КАЖДЫЙ аккорд строится ЧИСТЫМ отношением ОТ СВОЕГО КОРНЯ
    (chordFreqs·cents-ветка root·ratio), поэтому пуст волка НЕТ ни на одном корне — модель хора/квартета,
    что подстраивает каждый аккорд на лету («подвижная» чистая интонация). Пара к ФИКСИРОВАННОМУ ниже
    (клавесин): те же 12 нот, но там аккорды берутся из ЗАСТЫВШЕЙ сетки → волк. Контрапара к Пифагорову.
    ⛳ T7 (решение пользователя, по теории): это АДАПТИВНАЯ чистая интонация — так поют хор и струнный квартет: высоты сдвигаются, чтобы
    КАЖДЫЙ аккорд был чистым, поэтому тон аккорда может лечь МИМО 12 высот (на синтоническую комму) — и редактор честно показывает его
    между рядами с отступлением в центах: это сдвинутая высота хора, а не ошибка. chords.build 'adaptive' — единственный такой лад.
    Клавишная версия того же строя — «фиксированный» ниже (аккорды из сетки, с волком). Имя говорит это: «как поёт хор».
    Ступени называются ПОРЯДКОВЫМИ (naming.scheme 'ordinal', F3): высоты сдвигаются под аккорд, имя ноты соврало бы;
    ноты аккордов и корни палитры — именами нот (схема строя ji12 — notes12). compat.tag 'penta' — инертный. Индекс 58. */
    'ji-adaptive':{ format:'handsong/mode', version:1, id:'ji-adaptive', tuning:'ji12', name:{en:'Just intonation — adaptive (as a choir sings)', ru:'Натуральный строй — подвижный (как поёт хор)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'palette'}, palette:'nat', build:'adaptive'}, naming:{scheme:'ordinal'}, compat:{tag:'penta'} },
    /* Натуральный строй, ФИКСИРОВАННЫЙ (клавесин/орган) — ТЕ ЖЕ 12 нот (cents 1-в-1 с подвижным выше),
    настроенные ОДИН РАЗ от тоники. Но аккорды берут ноты ИЗ ЗАСТЫВШЕЙ СЕТКИ (палитра 'natfix' —
    ЦЕЛЫЕ полутоновые смещения; chords.grid гонит chordFreqs в grid-ветку, читающую ступень корень+off
    из cents-сетки). Оттого интервалы МЕЖДУ нотами сетки — какие даст фиксированный строй: чистые на одних
    корнях (мажор 0,1,3,5,7,8), ВОЛК на других (квинта −21.5¢ на 2,10 и +19.5¢ на 6; терции ±41¢) — ровно
    ПОЧЕМУ и придумали темперации. Разметки «волк» в UI НЕТ намеренно: учит ухо, не подпись. Пара к
    подвижному выше — переключи на ОДНОМ аккорде и услышь разницу. ⛳ T7: это КЛАВИШНАЯ версия строя (аккорды ИЗ СТРОЯ, как на
    инструменте с неподвижными клавишами) — имя говорит «как на клавишных». compat.tag 'penta' — инертный. Индекс 59. */
    'ji-fixed':{ format:'handsong/mode', version:1, id:'ji-fixed', tuning:'ji12', name:{en:'Just intonation — fixed (as on a keyboard)', ru:'Натуральный строй — фиксированный (как на клавишных)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'fixed', note:0}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
    /* Мезотон 1/4 коммы (Аарон, 1523) — ИСТОРИЧЕСКИЙ КОМПРОМИСС. Каждая квинта СУЖЕНА на 1/4 синтонической
    коммы до 696.58¢ (чистая 701.96¢), чтобы четыре квинты минус две октавы дали ЧИСТУЮ большую терцию
    386.31¢ (как в Натуральном). В отличие от фиксированного Натурального, где ошибка РАЗБРОСАНА (волк-квинты
    И терции мимо на ±41¢ на многих корнях), мезотон СОБИРАЕТ всю ошибку в ОДНУ волк-квинту (G#–Eb ≈ 737.6¢,
    ~36¢ шире чистой), оставляя терции чистыми, а квинты ровными на ~8 ходовых тональностях. Это и есть
    компромисс: пожертвовать одной тональностью, чтобы запели остальные. Замыкает линию Пифагор →
    Натуральный → Мезотон → 12-TET (Хроматика). Палитра 'natfix' + chords.grid — ФИКСИРОВАННАЯ
    клавиатура: аккорды берут ноты ИЗ СЕТКИ (grid-ветка chordFreqs), как фиксированный Натуральный; пере-
    страивать каждый аккорд чистым от корня НЕЛЬЗЯ (это стёрло бы весь смысл — вышел бы Натуральный). Разметки
    «волк» в UI НЕТ намеренно — учит ухо. compat.tag 'penta' — инертный. Индекс 60. */
    'meantone-quarter':{ format:'handsong/mode', version:1, id:'meantone-quarter', tuning:'meantone-quarter', name:{en:'Quarter-comma meantone (harpsichord)', ru:'Мезотон 1/4 коммы (клавесин)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'fixed', note:0}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
    /* ================= ИНДИЙСКАЯ КЛАССИКА (традиция 'indian') =================
    22 ШРУТИ — микротональная сетка ЧИСТОЙ ИНТОНАЦИИ (не равные шаги!). Позиции выводятся из
    циклов чистых квинт/кварт (3/2) и чистых терций (5/4); наименьший интервал — 22¢, синтоническая
    комма. Поэтому в сетке есть комма-ПАРЫ: 386 (чистая терция 5/4) против 408 (пифагорова терция
    81/64), 90 против 112, 590 против 612, 996 против 1018 и т.д. Раги ВЫБИРАЮТ свои ноты (свары) ИЗ
    этой сетки — именно комма-выбор придаёт рагам их разный характер. Механизм тот же, что у гамелана/
    Парча: табличный строй, 2^(центы/1200); ЯДРО НЕ МЕНЯЕТСЯ. Октавные. Аккордов нет (правило 'none'): индийская
    классика МЕЛОДИЧНА — аккордов в ней нет, это ОСОЗНАННЫЙ выбор модели, не ограничение (роль
    «Аккорды» покажет подсказку). layout.rect (=ДЕФОЛТ раскладки) НЕ ставим: у СЕТКИ 22 шрути он и
    невозможен (22+1=23 и 22 — ни то ни другое не делится на 4: единственный случай, который
    прямоугольники не спасают), а 7-нотным РАГАМ он доступен (7+1=8 → 2 прямоугольника), но по
    умолчанию они открываются узкими рядами — 7 рядов попадаются нормально; человек включит сам.
    compat.tag 'penta' — инертный ярлык, как у прочих табличных ладов. Имена ступеней — из списка строя shruti22 (F3): у сетки
    полные «свара · шрути» (naming.detail), у раг — свары.
    ЧЕСТНОСТЬ (как «приближение» у гамелана): мы моделируем ТОЛЬКО звукоряд — КАКИЕ свары. Рага —
    БОЛЬШЕ звукоряда: у неё путь вверх/вниз (ароха/авароха, часто РАЗНЫЕ), опорные ноты (вади/самвади),
    характерные фразы (пакад) и время суток — НИЧЕГО из этого мы не моделируем. Индексы 61..71. */
    'shruti-22':{ format:'handsong/mode', version:1, id:'shruti-22', tuning:'shruti22', name:{en:'22 shruti (full grid)', ru:'22 шрути (полная сетка)'}, menu:{tradition:'india', group:'fullGrid'}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, naming:{detail:true}, compat:{tag:'penta'} },   // F3: имена — список строя shruti22; naming.detail → «свара · имя-шрути» (сетка различает комма-пары именем, раги — только сварой)
    /* 10 известных раг — 7 свар, ВЫБРАННЫХ из сетки 22 шрути (каждое значение — член сетки). Витрины
    чистой интонации: комал-Ре Бхайрава (90 — малый шрути), тивра-Ма Йамана (590 — острая ув.кварта),
    чистые терции 386 и пифагоровы 408, чистая квинта везде 702. Только звукоряд — путь/опоры/фразы
    НЕ моделируются (см. блок выше). Ряды подписаны сварами (Са/Ре/Га/Ма/Па/Дха/Ни) — по списку строя shruti22 (схема list, F3). */
    /* хиндустани: короткая форма Bhairav; встречается и Bhairava */
    'raga-bhairav':{ format:'handsong/mode', version:1, id:'raga-bhairav', tuning:'shruti22', name:{default:'Bhairav', ru:'Бхайрав'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,1,7,9,13,14,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-yaman':{ format:'handsong/mode', version:1, id:'raga-yaman', tuning:'shruti22', name:{default:'Yaman', ru:'Йаман'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,8,11,13,17,21], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    /* Кафи и Мальхар несут ОДИН И ТОТ ЖЕ звукоряд [0,204,316,498,702,906,1018] — различаются движением/
    опорами/фразами (которых мы не моделируем), а не нотами. НЕ баг-дубль, а осознанно (как две Кумои,
    как пелог лима/нем). */
    'raga-kafi':{ format:'handsong/mode', version:1, id:'raga-kafi', tuning:'shruti22', name:{default:'Kafi', ru:'Кафи'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,6,9,13,17,19], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-bhairavi':{ format:'handsong/mode', version:1, id:'raga-bhairavi', tuning:'shruti22', name:{default:'Bhairavi', ru:'Бхайрави'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,1,5,9,13,14,18], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-todi':{ format:'handsong/mode', version:1, id:'raga-todi', tuning:'shruti22', name:{default:'Todi', ru:'Тоди'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,1,5,11,13,14,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-khamaj':{ format:'handsong/mode', version:1, id:'raga-khamaj', tuning:'shruti22', name:{default:'Khamaj', ru:'Кхамадж'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,8,9,13,17,19], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-asavari':{ format:'handsong/mode', version:1, id:'raga-asavari', tuning:'shruti22', name:{default:'Asavari', ru:'Асавари'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,5,9,13,14,18], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    'raga-malhar':{ format:'handsong/mode', version:1, id:'raga-malhar', tuning:'shruti22', name:{default:'Malhar', ru:'Мальхар'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,6,9,13,17,19], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },   // тот же звукоряд, что Кафи (см. коммент выше)
    'raga-purvi':{ format:'handsong/mode', version:1, id:'raga-purvi', tuning:'shruti22', name:{default:'Purvi', ru:'Пурви'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,1,7,11,13,14,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    /* [0,204,386,498,702,884,1088] = натуральный мажор (JI) = тхат БИЛАВАЛ, один из 10 родительских ладов хиндустани. Раньше ошибочно значился «Мармари» (не существующая рага) */
    'raga-bilawal':{ format:'handsong/mode', version:1, id:'raga-bilawal', tuning:'shruti22', name:{default:'Bilawal', ru:'Билавал'}, menu:{tradition:'india', group:'ragas'}, degrees:[0,4,7,9,13,16,20], root:0, anchor:{policy:'tonic'}, chords:{rule:{kind:'none'}}, compat:{tag:'penta'} },
    /* ================= ВЕЛЛ-ТЕМПЕРАЦИИ («хорошо темперированные» строи) =================
    НЕДОСТАЮЩЕЕ ЗВЕНО между мезотоном и 12-TET. Мезотон давал играть в ~8 тональностях и ВЫЛ в
    остальных (вся ошибка собрана в одну волк-квинту). Велл-темперации распределяют пифагорову
    комму (23.46¢) НЕРАВНОМЕРНО так, что ИГРАБЕЛЬНА КАЖДАЯ тональность, но каждая держит свою
    ОКРАСКУ: ближние тональности — почти чистые терции, дальние — резче (к пифагоровой 407.8¢).
    12-TET позже стёр характер начисто (все терции ровно 400¢, разброс 0). Именно это Бах показал,
    написав прелюдии во всех 24 тональностях. Строятся цепью квинт от C: часть квинт СУЖЕНА, сумма
    сужений = пифагорова комма (цепь замыкается). Как мезотон/фикс-Натуральный — ФИКСИРОВАННАЯ
    клавиатура: палитра 'natfix' + chords.grid, аккорды берут ноты ИЗ СЕТКИ (grid-ветка
    chordFreqs), строить чистыми от корня НЕЛЬЗЯ — стёрло бы весь смысл неравномерности.
    ⚠️ СМЕНА ТОНИКИ в меню меняет ОКРАСКУ (в отличие от 12-TET, где все тональности звучат
    одинаково): тоника переносит начало отсчёта по НЕРАВНОМЕРНОЙ сетке. compat.tag 'penta' — инертный.
    Индексы 72..74 (конец манифеста). */
    /* Веркмайстер III (1691) — 4 квинты по 1/4 пифагоровой коммы (C–G, G–D, D–A, B–F#). Терция от
    тоники 390.2¢ (почти чистая), в дальних тональностях до 407.8¢ (пифагорова); разброс ~17.6¢. */
    'werckmeister-3':{ format:'handsong/mode', version:1, id:'werckmeister-3', tuning:'werckmeister3', name:{default:'Werckmeister III (1691)', ru:'Веркмайстер III (1691)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'fixed', note:0}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
    /* Валлотти (1754) — 6 квинт по 1/6 коммы (F–C–G–D–A–E–B), мягче распределено. Терция 392.2¢,
    разброс ~15.6¢ — самый РОВНЫЙ из трёх (ближе всего к 12-TET по равномерности, но характер ещё есть). */
    vallotti:{ format:'handsong/mode', version:1, id:'vallotti', tuning:'vallotti', name:{default:'Vallotti (1754)', ru:'Валлотти (1754)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'fixed', note:0}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
    /* Кирнбергер III (1779) — 4 квинты по 1/4 СИНТОНИЧЕСКОЙ коммы (C–G–D–A–E) + одна сужена на схизму.
    Терция от тоники ЧИСТАЯ 386.31¢, но разброс самый большой (~21.5¢): чистота ближних тональностей
    куплена резкостью дальних. */
    'kirnberger-3':{ format:'handsong/mode', version:1, id:'kirnberger-3', tuning:'kirnberger3', name:{default:'Kirnberger III (1779)', ru:'Кирнбергер III (1779)'}, menu:{tradition:'europe', group:''}, degrees:[0,1,2,3,4,5,6,7,8,9,10,11], root:0, anchor:{policy:'fixed', note:0}, chords:{rule:{kind:'palette'}, palette:'natfix', grid:true}, compat:{tag:'penta'} },
  },
};
