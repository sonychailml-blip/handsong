# UI-MAP — карта интерфейса Handsong (бывш. Air Synth 3)

Фундамент интерфейса. К этому документу возвращаемся при любой задаче про UI,
меню, роли, лупер. **Не реализация — карта.** Прежде чем строить кусок UI, свериться отсюда.

> Checked against the code after T5 (top bar, transport, play strip, the whole track editor); after V5 (the 🎛 Sound panel, the
> automation lane, split, hand functions); after AF4 (the play strip, the arrangement window and the editor bar have no freeze controls —
> tracks freeze themselves; a faint dot in the arrangement window only). Sections about scales, backing and the tutorial were not
> re-checked. Sections rewritten since DOCS-EN are in English.

---

## Главный принцип

**Экран — почти целиком игровое поле.** Пикселей мало (телефон вертикально —
основной режим). Меню не воруют место у игры: тонкие полоски, спрятаны, или совмещены
с индикатором. Всё, что не игровое поле, ужато до предела.

---

## Три оси (из них растёт всё)

### Axis 1 — THE SCALE (which musical world I am in)
Global, one active at a time, changed RARELY; lives in the scale menu. Organised in sections **BY SOUND, not by mechanism** (six today;
74 modes, indices 0..73). ⚠️ The order of `SCALES` and EVERY index stayed put — only each record's `trad`/`grp` text moved:
- **Common** (`common`, 12-TET) — where a beginner lands: diatonic (majors/minors), modes, ethnic, pentatonics/blues, **symmetric
  (whole-tone/octatonic/Messiaen)**, exotic (Phrygian dominant, double harmonic, Enigmatic, Prometheus…), world pentatonics, Japanese,
  chromatic (12 notes, chord type from the palette). Symmetric and chromatic are ORDINARY 12-TET, hence here, NOT in «Experiments».
- **Middle East** (`mideast`, 24-TET): maqamat (Rast, Bayati, Hijaz, Saba, Sikah, Nahawand, Kurd, Ajam, Nikriz, Nawa Athar) — NO chord
  ladder, subgroup «Maqamat». (Turkish maqams later.)
- **India** (`india`): the **22-shruti** grid (just intonation, smallest step 22¢ — the `cents` mechanism, octave-based) + **10 ragas**,
  each picking 7 swaras from the grid (two groups: grid, then ragas). All `noChords` (Indian classical music is melodic — a deliberate
  model choice). Labels from the tuning's naming list: full grid «swara · shruti name» (tonic «Sa · Chhandovati» — the swara sits on the
  LAST shruti of its group, Sangita-Ratnakara), ragas swaras only (Sa Re Ga Ma Pa Dha Ni). Honest in code: a raga is MORE than a scale
  (aroha/avaroha, vadi, phrases — not modelled); Kafi and Malhar share one scale on purpose.
- **Java and the Far East** (`easia`): Javanese **gamelan** (Slendro, Pelog, **Pelog patets** Lima/Nem/Barang — Lima and Nem have the
  SAME notes on purpose, the difference is functional, not a duplicate bug) + Japanese and Far-Eastern pentatonics (hirajoshi, kumoi, in,
  iwato, man gong, ritsusen). Gamelan by real cents (`cents`), monophonic (`noChords`).
- **Historical Europe** (`europe`) — its OWN top-level section (temperament and mode are DIFFERENT things, so not one bucket). Flat, read
  CHRONOLOGICALLY (see «The historical line» below).
- **Experiments** (`exp`) — bounded BY TUNING, not by mode: equal microtonal EDOs (19/31-TET, chord-type palette), **Partch** (43-tone
  just intonation, 11-limit; chords as pure RATIOS, palette `partch`), **Bohlen–Pierce** (tritave 3:1, 13 equal; 3.5.7 chords — palette
  `bp`) and **Wendy Carlos** α/β/γ (divide the pure fifth 3:2 into 9/11/20; register by the FIFTH; `noChords`; γ in rectangles).
  Non-octave tunings (`period` ≠ 2:1) move the register by the tuning's PERIOD.

**Placement rule (for the future):** a new mode goes into the section of its CULTURE or SOUND; NEVER a generic «other» bucket.

**Историческая линия «Европа историческая»** — про РАЗНЫЕ СТРОИ ОДНИХ И ТЕХ ЖЕ 12 нот, замыкает
историю: **Пифагоров** (чистые квинты → резкая терция 81/64) → **Натуральный подвижный, хор** (аккорд
чистый ОТ КОРНЯ — как хор/квартет подстраивает на лету) → **Натуральный фиксированный, клавесин** (ноты
из ЗАСТЫВШЕЙ сетки → часть аккордов чистые, часть волк) → **Мезотон 1/4 коммы** (квинты сужены ради
чистых терций, вся ошибка собрана в ОДНУ волк-квинту G#–Eb) → **велл-темперации Веркмайстер III /
Валлотти / Кирнбергер III** (каждая тональность играбельна, но со СВОЕЙ окраской — недостающее звено к
12-TET) → 12-TET (хроматика в «Привычном»). Учебный смысл: сыграть ОДИН И ТОТ ЖЕ аккорд по разделу и
услышать исторический компромисс. **Все фиксированные строи — свойство `fixedKey`: сетка приколочена к
абсолютным высотам от C, тоника выбирает КЛЮЧ (не множитель).** Оттого у Веркмайстера терция в C ≈390¢,
в F# ≈408¢ — тот же инструмент, разная тональность; ряды показывают РЕАЛЬНЫЕ имена нот. «Натуральный
подвижный» намеренно НЕ `fixedKey` — контраст пары и есть урок. Разметки «волк» в UI нет намеренно — учит ухо.

Расти можно бесконечно: новый лад = строка в раздел (по культуре/звучанию), новый раздел = группа.
Фундамент при этом не трогается.

### Ось 2 — РОЛЬ (что рука делает с нотами)
Одна активна за раз. Меняется ЧАСТО — тик по кнопке сверху (соло → аккорды → бас →
барабаны). Соло = мелодия, Аккорды = гармония, Бас = низ, Барабаны = ритм.
(Дрон — тонический гул; живёт как слой аранжировки в лупере.)

### Ось 3 — ВРЕМЯ (живьём / на дорожку / дорожками)
Живая игра · запись на дорожку · наслоение дорожек. **Время ЛИНЕЙНОЕ** (с слайса S3.3): песня — это
события в абсолютных долях от её начала, она играет до конца материала и останавливается; повтор — не
свойство записи, а ПОМЕЧЕННЫЙ участок (скоба). Дорожка ПОМНИТ свой звукоряд (`sc: CUR()`, включая его
`cents`) — отсюда полимодальность: записал роль в одном строе, переключился, играешь другую роль в
другом. Пользователь переключается между мирами, не держит два.
⛳ **В дорожке РОВНО ОДНА РОЛЬ И ОДИН ТЕМБР** (слайсы T2–T3; прежде дорожка ролью не типизировалась). Каждый
источник звука пишется в свою дорожку: сменил роль или тембр посреди дубля — нота дальше ложится в НОВУЮ
строку (сплит пишет две роли в одно взятое — рождаются две строки, и одно ⤺ снимает обе). Вооружённая
дорожка ДОПИСЫВАЕТ, но принимает только свой звук; другой звук уходит в новую строку, а заголовок полосы
говорит «L{n} берёт только свой звук». Тембр записанной дорожки меняется ТОЛЬКО в редакторе (T5).
**Четвёртое состояние времени — РЕДАКТОР** (пиано-ролл во весь экран, своя глава ниже): записанное можно
двигать, удлинять, удалять и ДОПИСЫВАТЬ то, чего никто не играл, — вместе с автоматизацией эффектов.
⛳ **И ДОРОЖКА ЗВУЧИТ ТЕМ, С ЧЕМ ЕЁ СЫГРАЛИ.** С дуги O-2/O-3 запись помнит не только ноты, но и ЭФФЕКТЫ:
состав цепи на старте дубля, всё, что двигалось потом, и перестановки в цепи. Покрутить ручку после
записи можно сколько угодно — на уже записанное это не влияет, а СТОЛБИКИ эффектов при этом продолжают
показывать, куда смотрит ВАША рука (параметр, которым правит запись, помечен пустым столбиком и
приглушённой подписью). ⚠️ Обратная сторона названа честно: сеть у владельца ОДНА, поэтому играть живьём
с другими настройками, чем в записи, сегодня НЕВОЗМОЖНО — это станет возможным только с заморозкой.

---

## Карта экрана (одна раскладка; ПК-режим удалён)

**Старт — светлая карточка** на светлом фоне. Две главные кнопки: «▶ Играть» (прежний поток — камера
только после тапа) и **«Обучение» — РАБОТАЕТ**: открывает список уроков, а выбор урока сам поднимает
приложение ТЕМ ЖЕ кликом (обе кнопки идут через `main.startApp`, поэтому AudioContext по-прежнему
создаётся внутри жеста). Ниже, в этом порядке: **⛶ во весь экран** (полезен почти каждый сеанс —
полосы браузера съедают вертикаль) и **⬇ Установить** (разовое действие, только для решивших оставить
приложение). Обе могут отсутствовать; `display:none` убирает из потока, раскладка ровная в любой
комбинации. Мелкий подвал: **🌐 переключатель языка** (English · Русский), заметка о первой версии,
ссылка отзыва, слот доната (скрыт, пока URL пуст), e-mail СОБИРАЕТСЯ в JS (не `mailto` в исходнике).
Длинный инструктаж лежит в `#helpOv` — из UI пока недостижим, ему место внутри обучения.

**Установка (PWA) — ПО РЕАЛЬНОЙ СПОСОБНОСТИ, не по строке браузера.** Chromium: ловим и ПРИДЕРЖИВАЕМ
`beforeinstallprompt`, кнопка появляется ТОЛЬКО после события (до него `prompt()` пуст — была бы мёртвая
кнопка). iOS Safari: события нет → короткая инструкция (Поделиться → на экран) вместо кнопки, которая не
может сработать. Уже установлено (standalone) → прячем всё. `sw.js` зарегистрирован ТОЛЬКО ради этого и
**намеренно БЕЗ кэша** (пустой `fetch`): ничто не может застрять устаревшим.

Одна вертикальная раскладка. **Верхняя полоска АВТО-СКРЫВАЕТСЯ** (класс `.min`) через ~3.5 с; тап
по экрану или движение мыши (порог 8px) её раскрывает; не прячется, пока открыта панель или зажат
палец. В СВЁРНУТОМ виде остаются ТОЛЬКО индикатор роли (одна или две половины) и три кнопки записи
(🎥 клип · 🎙 аудио · ● лупер) — ТЕ ЖЕ DOM-элементы, не зеркальная полоса (единый источник состояния).
Раскрытая полоска (сверено с `index.html`): **[Лад]** (звукоряд·тоника, тап → панель) · **[🎛 Звук]** ·
**[Роль]** (или две половины при сплите) · **[◨]** сплит (только ландшафт) · **[🔄]** камера (фронт/тыл) ·
**[⛶]** полный экран · **[🎥]**/**[🎙]** запись клипа/аудио · **[🎵 Подложка]** · **[⚙ Луп]** · **[●]** запись.
Кнопок 💻/📱 и `〰`/`⇄` больше нет (терменвокс и смена рук ушли в «Функции рук»). Под холстовой полосой
лупера — **транспорт из ШЕСТИ кнопок: ▶ играть/пауза · ⟳ повтор скобы вкл/выкл · ⤺ отменить последний
дубль · ✕ очистить всё · ■ паника · ✎ открыть окно аранжировки (AR1; строка там — редактор дорожки)** (в разметке есть и седьмая, ⏮ — она видна
только в редакторе; см. «Полоса лупера» и «Редактор дорожки» ниже). **Тап по кнопке бара НАЖИМАЕТ её, а не разворачивает бар**: иначе снятие
`.min` перекладывало бы бар в портрете на две строки, последняя кнопка уезжала бы из-под пальца и клик
промахивался — «нажать» делало кнопку недостижимой.

**Сплит-экран (только в ландшафте).** Экран делится на две половины, каждая — своя роль
(`SPLIT_ROLES`, крутится своей кнопкой). Роль руки = ПОЛОВИНА, в которой начался щипок (зона =
инструмент; любая рука — любую половину). Внутри половины всё по ПОЛОЖЕНИЮ (палитра типов — без
привязки к руке). **Функции рук применяются ПО ПОЛОВИНЕ, по её роли** (`handFnOf(key, роль-половины)`):
соло-/бас-половина работает как single-role (эффекты/удержание/терменвокс — как назначено). Прежний
ХАРДКОД «эффекты на левой руке в соло-половине» УБРАН — его теперь ДЕРИВИРУЕТ дефолт `handFn.ld.L='fx'`
(один источник правды). У каждой половины свой октавный прямоугольник (свой регистр). Роль+диапазон морозятся на `S` при захвате
(`S.role`/`S.rx0`/`S.rx1`), геометрия из одного источника (`phoneHalves`, `palSplitX`, `rectBandY`) —
попадание и рисунок не разъезжаются. Прокрутка половины ПРОПУСКАЕТ роль другой половины → две
одинаковые половины недостижимы. Довод — не «одноголосые цепи» (соло и бас бывают полифоническими), а то, что всё
состояние РОЛИ одно: цепь, регистр, режим голоса, защёлка, а в ведущем режиме — единственный голос. Каждая половина
следует режиму голоса СВОЕЙ роли. Поворот
в портрет на включённом сплите — авто-выключение (без зависших нот).

> **TF3b/TF5 (2026-10-14, English):** in «Scale», for a tuning NOT named by the 12 notes (Partch, 19/31-TET, gamelan, Bohlen–Pierce,
> Carlos, 22 shruti) the key row reads «1/1 =» with a ¢ field (−50…+50) and, when the tuning file declares one, a button «Historical 1/1: G»
> (Partch); the scale button shows «· 1/1 = A +12¢». The arrangement window's «−1 st / +1 st» (song) also moves the key knob; one ↶ undoes both.

**Три панели** (сверено с `index.html`), разделены по смыслу: **«Звукоряд»** = какие ноты есть и где лежат
(лад/тоника/**эталон A4**/раскладка нот/пальцев в руке/септаккорды) · **«🎛 Звук»** = как это звучит и чем
управляют (тембры — и **под тембром соло и под тембром баса строка РЕЖИМА ГОЛОСА: «Полифония / Ведущий»** (V3; две
кнопки, выбранная подсвечена, повторный тап по ней ничего не делает; умолчания — соло «Полифония», бас «Ведущий», то
есть как было всегда; смена гасит звучащее, при записи сперва закрывает открытые ноты дубля, и зажатая рука со
следующего кадра играет уже в новом режиме; дорожку смена НЕ делит) /**Функции рук**/**Действия пальцев**/конструктор
эффектов — **цепь показана ДВУМЯ ПОДПИСАННЫМИ ЗОНАМИ**: «в ноте» (эффекты без узлов, их величина едет в каждой ноте —
первой у КАЖДОЙ роли постоянная строка **«Громкость»** (VOL-2: без ✕ и стрелок; адрес — Фиксировано · пальцы × оси ·
играющая рука → Горизонталь · играющая рука → Глубина (с VOL-4: ближе к камере — тише, дальше — громче, «Инверсия»
переворачивает); при «Фиксировано» — степпер 0…100; на Горизонтали и на Глубине громкость у каждой руки своя (и едет вместе
с прочим на той же оси — например с яркостью аккордов на глубине), на пальце — одна на все руки роли, и только тогда у неё есть столбик; подсказка называет предел защёлкнутого
аккорда), затем драйв/вибрато/тремоло-нота у соло, **яркость** у всех ролей, **Скольжение** у соло и баса. ⛳ **Горизонталь
— ОБЩАЯ ось:** поставленный на неё параметр едет вместе с громкостью (чип «×2»); освободить её — унести громкость или
зафиксировать. Прежней отдельной строки «Громкость (фикс.)» больше нет) и «общий звук» (всё, что
стоит в сигнальном пути), у каждой одна строка объяснения; **`▲▼` перестановки есть ТОЛЬКО во второй зоне**, потому
что голос звучит раньше суммы по устройству и переставлять его против шинного нечего. Зоны — ТОЛЬКО ПОКАЗ: данные
остаются одним плоским списком в порядке звука. **Под зонами ДВА списка «добавить»** (V4): «+ Добавить в ноту»
предлагает только голосовые модули, объявленные для роли (и старые скаляры у соло), «+ Добавить в общий звук» — все
шинные; прежде один список предлагал всё, и яркость аккордов можно было добавить ролям, чьи голоса её не читают.
**Скольжение** — время перехода голоса к новой высоте, 4–800 мс; в цепи по умолчанию его нет, только что добавленное
равно сегодняшнему значению роли (соло 20 мс, бас 12 мс) и ничего не меняет, пока его не двинуть; действует лишь на
переход уже звучащего голоса — не на свежую атаку и не на терменвокс) · **«Лупер»** = время (длина
ПОДЛОЖКИ/**размер**/BPM/квантизация/дробление доли/аранжировка). Все три **светлые и НЕПРОЗРАЧНЫЕ**
(лежат поверх яркой картинки камеры), в ОДНОМ месте сверху (открытие одной прячет другие).
Панель звукоряда несёт **эталон A4** (пресеты 415…444 + свободный ввод, кламп 380–480). Панель «🎛 Звук» —
секцию **«Функции рук»** (заменила ⇄): по выпадающему НА РУКУ для каждой роли в игре, помечены
Левой/Правой рукой, сгруппированы под ярлыком роли. Соло: Эффекты · Ноты · Ноты (с удержанием) ·
Терменвокс · **Выразительность** · **Лупер**. Бас: Эффекты · Ноты · Ноты (с удержанием) · Терменвокс ·
Лупер. Аккорды: Эффекты · Защёлка · С удержанием · Лупер. **Ударные**: Эффекты · Удары · Лупер. Панель
лупера: **размер такта** (только на ПУСТОЙ песне при стоящем транспорте) и **дробление доли**
(4 · 16-е / 3 · триоли) рядом с длиной подложки/BPM/квантизацией. ⚠️ «Длина» здесь — длина ПОДЛОЖКИ
(сколько тактов займёт следующая аранжировка), а не петли: петли больше нет.

---

## Play strip — song, brace, tracks (checked against `draw.drawLooper`; rewritten in English at AF4)

A box at the top centre; visible while the transport runs or the song has events. Top to bottom:

**Header.** The mode in words: "COUNT n" · "● REC · track N" (or "tracks L1, L3" when a take made several — split, a role or timbre
change mid-take) · "▶ PLAYING · N bars · M tracks" · "SONG · N bars · M tracks · ▶ play". Suffixes: **"REC → Ln"** (where ● goes;
"(not heard)" when that track is muted or silenced by another's solo) · **"REPEAT"** · **"SOLO"**. With a delete armed the whole header is
replaced by red "✕ again — delete Ln".

**Timeline — the whole song across.** Length comes from the material; width = max(song length, position, backing length, brace end).
Bar grid always, beats while distinguishable (≥ 6 px), bars thinned on a long song. **The playhead follows the SONG position:** with
repeat it cycles inside the brace and the strip does not grow. Geometry = ONE snapshot (`loopView`); beat→pixel and pixel→beat read it.

**Brace band (16 px, between header and tracks — its own tap target).** Fill = the bars under the brace (GREEN with repeat on; grey —
a brace exists but does not cycle: it still sets where recording starts). Ends ⌈…⌉: **solid** — set by the user; **dashed + "auto"** —
follows the material. Label: bar numbers "3–5". Bar ticks are tap targets. **Tap** moves the nearer end to the nearest bar line;
**drag** moves the taken end. Hit zone = header + band (~38 px for a thumb). Quantum: a BAR, minimum one bar. No edits while recording.

**Track row (16 px).** Inside the box, left of the lane — the **NAME COLUMN**: "L1" grey (red when armed), then the track name in its
role colour ("role · timbre" by default, or the name given in the window); 17 % of the strip, 48–100 px (at 380 px the lane is
261 → 203 px). On the lane — event ticks in the ROLE colour; on the right three slots: **M** (mute) · **S** (solo) · gap · **✕** (delete).
An inaudible row (mute or another's solo) is dimmed; the row being recorded is filled red.
- **No freeze marks (AF4).** Tracks freeze themselves (auto-freeze); the play strip shows nothing about it — no ❄, no stale mark.
- **MARK COLUMN** (E0-fix): only while a row is ARMED (outside recording) a 28-px column sits between the name column and the lane with the
  red arm dot; the lane is that much narrower (M/S/✕ do not move). No armed row — no column. Tapping it arms, like tapping the name.
- **The name follows the timbre** (AR2): the default name is "role · timbre"; replacing the timbre in the editor renames it (a renamed
  track keeps its given name). Row order is ONE with the arrangement window (reordered there, by the handle).
- **Arming** — a tap on the row OUTSIDE the buttons (including "L1"): red frame, red dot, red label; tap again to disarm. ● records into
  it, no new row. ⛔ Deleting is NOT tied to arming: the red frame means "where I will record", nothing else.
- **Delete** — ✕ twice within 3 s: the first tap fills the button and the row red, the second deletes. Any other tap on the strip disarms
  it. **A delete cannot be undone** — the confirmation carries the weight.

**380 px — honest count:** box 340 px, lane 261 px, slots 21×16 px (hit 23×16). ⚠️ The row is shorter than a finger (M/S always were);
the ✕ confirmation prevents damage, not misses. Cheapest fix: rows 16 → 22 px (cost: height per track).

---

## ARRANGEMENT WINDOW AND MIXER — the third screen (AR1, MX1, MX2, AR2, AF4, ED6; checked against `index.html`, `style.css`, `ui.js`, `draw.drawLooper(true)`; rewritten in English at AF4)

**Opened by ✎ in the transport, FULL SCREEN** (the camera is not read — the same `main.loop` branch as the editor). It is the play strip
grown to the whole screen: one row per track; on top its own bar `#arrBar`: **✕** (back to play) · title · **🎚 / ▤** (face: mixer /
arrangement) · **−** **+** (time zoom) · **⤢** (whole song) · ED6: **＋▯** insert as many EMPTY bars before the brace as it is long ·
**✂** cut the bars under the brace · **⧉** duplicate them right after · **§✕** remove the selected section marker · TF3: **−1 st / +1 st**
(ru «−1 пт / +1 пт») the WHOLE SONG a semitone down / up — every track with pitch, the backing too, drums untouched; one ↶; refused while
recording · **↶ ↷** undo / redo
of these (the song history — section edits and marker changes; the tooltips name the bars). Under it the transport `.arr`: **⏮ ▶ ⟳**
(⤺ ✕ ■ ✎ live on the play screen). **§✎** (ED6 fix) renames the selected marker. ED7: the window's **↶ ↷** are the ONE history's.
Below: a status line, the **SECTIONS band** (ED6, 20 px: named markers at bar lines, amber, a faint line down the rows; **tap empty band**
— a new marker at that bar, named A, B, …; an empty strip says «+ section — tap here to mark a bar»; **tap a marker** — select it
(outlined) and put the brace on its section, to the next marker or the song end; **double tap / double click** — rename it in a field over
the marker (it opens on the second tap's release), Enter or tapping elsewhere keeps, Esc cancels; or select it and press **§✎**), the BRACE band
(tap/drag an end, as on the play strip), track rows of 40 px:
- **header on the left** (AR2): **≡ HANDLE** (28 px, full row height — drag up/down: the row moves, a white line shows where, rows
  scroll at the window edges; one order for the window, mixer, play strip and the editor's track chip; a new track goes last), then the
  **NAME** in the role colour ("role · timbre" by default) and "L#" on a second line (a renamed track also shows "role · timbre"). Tap the
  name — arm (red second line, dot and frame); **double tap — rename**: a field over the header, Enter or tapping elsewhere keeps, Esc
  cancels, empty → the default again (arming stays as it was). Role colours differ in LIGHTNESS (bass darkest, drums lightest) — readable
  in greyscale.
- **the freeze dot (AF4)** — at the right end of the header, faint: **hollow** = waiting to freeze (settling after a change, or ready),
  **pulsing** = rendering now; **nothing** = frozen, or playing live by choice (skipped by the memory budget, no captured chain, or stale
  only by A4/tempo while re-freezing on those is off — since TF2 the key knob stales nothing). `R.freezeQueue()` in the console says why. Not a button.
- **row body** — in the arrangement face, note MINIATURES (blocks by pitch within the track's range; a chord as a stack; hits as ticks by
  kit row); a tap opens the track in the EDITOR on the same time span; in the mixer face — the track LEVEL fader on the left (drag along,
  relative; double tap — 100 / 0 dB; label "number · dB") and the PAN control on the right (MX2: −100…+100, fill from the centre, centre
  mark; drag along with a centre detent; double tap — centre; label "L 30 / C / R 30", in Russian "Л / Ц / П");
- **slots on the right, 36 px**: M · S (AF4: the ❄ slot is gone).
In the mixer face, at the bottom — the **MASTER strip**: master level fader, output meter (peak after the limiter, dBFS, with hold) and
limiter gain reduction ("Limiter −x dB", red when acting). Gestures: drag along — time (in the mixer — the fader), across — rows, two
fingers — zoom, wheel (Ctrl/⌘ — zoom; in the mixer over a fader — level, over the pan control — pan, step 1). The time window is ONE with
the editor: open a track — the same span; come back (editor ✕) — the same. Releasing a pan control (or a wheel step, a double tap) starts
the 1-s settle of auto-freeze; level never does. Row ✕ delete — only on the play strip.
**SECTION EDITS (ED6)** act on the bars under the brace in EVERY track at once: notes of all roles, drum hits, theremin bends, captured
automation, the brace, the markers and backing lengths move together. INSERT: everything from the brace start moves later; a note ringing
across keeps ringing through the new bars. CUT: what starts inside goes (a note starting inside goes whole, its tail too); a note that
began earlier is shortened by the cut. DUPLICATE: what starts inside is repeated right after (its automation too); a note ringing past the
end stops there and its copy carries the tail. A brace that still follows the whole song is refused («Put the brace on the bars first»).
One ↶ undoes the whole edit (ED7: it is one step of the ONE history, like every other change). Frozen tracks whose
material moved re-freeze by themselves; tracks wholly before the edit keep their freeze.

---

## TRACK EDITOR — full-screen piano roll (checked against `index.html`, `style.css`, `ui.js`, `draw.drawRoll` after T5; ❄ removed at AF4; rewritten in English at AF4)

**Opened by tapping a track row in the ARRANGEMENT WINDOW (since AR1; ✎ opens the window), FULL SCREEN; ✕ — back to the window.** No
camera: `main.loop` takes another branch — the camera stream STAYS open (instant return, no new permission prompt) but frames are not
read or drawn and hand tracking is skipped. The play bar (`#bar`) hides; the editor's own bar `#rollBar` replaces it; the transport under
the canvas shrinks (class `.roll`) to **TWO buttons: ⏮ to start · ▶ play/pause** (⟳ ✕ ■ ✎ and ⤺ hidden by CSS — repeat, clear and panic
would change the song under the open editor). ED7: the editor's **↶ ↷** are the ONE history's — they undo any step (a take, ⤺, the
mixer, a section edit…), not only this track's edits; an undo that removes the open track returns to the window.

**WHICH TRACK AND ON WHAT.** The one whose row was tapped in the window. **No role tabs** (removed at T4): a track holds one role and the
editor opens on it — drums on six rows, bass, chords and solo on the rows of the tuning/mode (since S4 all four roles are edited by one
machinery). The role is read from the track's events when it opens or the track changes, and kept for the session: a track emptied by
deletes keeps its axis so ✚ and ↶ work. A track with no notes from the start (a backing DRONE layer; an armed, emptied and reopened one)
opens with "This track has no notes" — no axis, no invented role.

**REFUSALS BOTH WAYS, IN WORDS.** The editor does not open over a running recording (●), a clip recording (🎥/🎙) or an empty song; ●
does not record while the editor is open. A BACKING track (🎵): its NOTES are read-only — any note edit refuses with a reason ("Backing
track — read only"), because removing the backing (`clearJam`) would take its events and leave the edit as a fragment. ⛳ **Exception —
timbre replacement** (allowed for backing by user decision: it rewrites every event of the track and leaves no fragments); ↶/↷ there only
undo/redo that.

**ON SCREEN, TOP TO BOTTOM:** the editor bar · the bar RULER (tap = seek; no drag on purpose — it would promise scrubbing) · the note GRID
(or the one-line message above) · [the automation lane, when open] · a two-line FOOTER. The playhead runs THROUGH the ruler, grid AND lane:
one time. Mode rows STRETCH to the full height when they fit (up to 30 px), else 18 px with scrolling; the label column on the left is
MEASURED from the track's mode labels (capped at 42 % of the canvas). The roll's top is a constant (`ROLL_BAR_H=46` + transport 44), not
the bar's measured height: the bar is one scrolling line, so the ruler and grid never move.

**EDITOR BAR — 30 elements in the markup, in order** (checked against `index.html`, block `#rollBar`; one line, scrolls sideways on a
narrow screen): `✕` close · `L1 · name` switch track (number and NAME in the role colour, long ones ellipsised; cycles in the window's
DISPLAY ORDER; dims when there is one track) · **TIMBRE select** (`#rollTimbre`, T5 — the track ROLE's timbres, kits for drums; hidden on a
track without notes) · **MODE select** (`#rollMode`, OWN1 — the modes of the track's tuning with as many degrees; picking one moves the
whole track by degrees; hidden on drums, on a backing and when there is no other such mode) · `[mode 1/2]` the axis mode chip — **shown ONLY when the track has events in different modes** · `✚` insert mode ·
`⬚` pick mode (ED1) · `🗑` delete the selection (a note, several notes or an automation point; the tooltip says which) · `⧉` copy ·
`📋` paste at the playhead · `⧉⁺` duplicate right after the selection (ED2) · `⌗` quantise the selection + three selects: grid (1, 1/2, 1/4,
1/8, 1/3, 1/6 of a beat; starts at the snap step), what (Starts / Ends / Starts + ends), strength (100/75/50/25 %) (ED3) · `−1°` / `+1°` the selection one degree of its mode down / up (ED4) · `−1 st` / `+1 st` the WHOLE TRACK a semitone down / up (TF3) · `↶` undo edit · `↷` redo edit · `⌗ 1/4` snap label
("free" without quantise; "(grid finer than a pixel)" when the step is below what is drawn) · **automation lane select** (first item
"— no automation —") · **"+ effect for this track" select** · `▲` earlier in the chain · `▼` later · `⊘` remove the effect from the track ·
**`╱`/`⌐` segment shape** (smooth automation: visible while the lane is open — and, BEND-CURVE, while a bend point is selected: then it is
the shape of the bend segment entering that point; live when the selected point has a point with a value before
it; the icon is the CURRENT shape of the segment entering the point: `╱` smooth, `⌐` step; a tap toggles, a toast names the new shape) ·
**`▮▮`/`•—` Volume face** (ED5: shown only while the lane shows Volume — bars, one per note, or the line of points; the icon is the
CURRENT face) · `−`/`+` zoom. (AF4: the `❄` button and its state label are gone — tracks freeze themselves.)
**Keyboard:** **Backspace / Delete** delete the selection — the same path as 🗑, only when 🗑 is live. Silent while focus is in an input
field (tempo, A4, any text/number), on key repeat and with Ctrl/Cmd/Alt. A dropdown is not an input field. **Ctrl/⌘+A** select every note
of the track · **Esc** select nothing · **Ctrl/⌘+C / V / D** copy / paste / duplicate (ED1/ED2; same input-field guard) · **Alt+↑ / Alt+↓** one degree up / down (ED4).

**SEVERAL NOTES (ED1).** `⬚` pick mode (or holding Shift): a tap on a note adds or removes it, a drag starting on empty space draws a
dashed box and adds every note it covers, a tap on empty space selects nothing (pick mode and ✚ insert exclude each other; the field's
frame brightens). Selected notes are white; chords are selected whole. Dragging any selected note moves the whole group — the grabbed note
snaps to the grid, the others keep their distance, rows follow the finger; dashed ghosts show where every note lands. 🗑 / ⌫ deletes the
group. Each is ONE ↶. A fully selected glide moves as one gliding note; a part of a line detaches (as a single edit would). A group that
cannot go there (a chord type missing on a root, a note leaving the registers) moves nothing and says so. With ⬚ off a tap selects one
note as before (the chord-note level and ✚'s chord shape work on a single selection only).
**COPY / PASTE / DUPLICATE (ED2).** `⧉` copies the selection (toast «Copied: n»; works on a backing too) — the clipboard lives until the
app is closed, across tracks. `📋` pastes at the playhead (snapped like an insert) into this track or another track of the SAME role and
mode — other role or mode: a toast says why; the pasted notes take the TARGET track's timbre and become the selection. `⧉⁺` repeats the
selection right after itself (a phrase longer than half a bar lands on the next bar line). One ↶ per paste.
**QUANTISE (ED3).** `⌗` moves the selection toward the grid chosen in the selects beside it. «Starts»: a note's start goes to the grid and
the note keeps its length; a pitch change inside a glide moves by itself — the line stays one gliding note, its neighbour gets longer or
shorter. «Ends»: only note ends move. Strength below 100 % moves part of the way. Drum hits move with «Starts». Pitches never change.
Nothing to move → toast «Nothing moved — already on the grid». One ↶.
**BY DEGREES (ED4).** `−1°` / `+1°` (Alt+↓ / Alt+↑) move every selected note one degree of its own mode (C→D→E… in major); a note outside
the mode keeps its distance from the nearest degree (C# → D#); chords move to the chord of the next degree. Times never change, glides
stay whole. Past the registers, a chord type that does not fit, or drum hits only → a toast says why, nothing moves. One ↶ per press.
**TRANSPOSE BY SEMITONES (TF3).** `−1 st` / `+1 st` (ru «−1 пт / +1 пт») move the WHOLE open track a semitone: its key moves, notes,
times, volumes, bends and effects stay. In a historical temperament the key colour changes (as on an organ); in tunings without 12 notes
(Partch, 19/31-TET, gamelan, Bohlen–Pierce) their 1/1 moves 100 cents. Refused on drums («Drums have no pitch»), on a backing («A backing
follows the key — change the key instead») and two octaves away. One ↶; a frozen track re-freezes by itself after the editor closes.
**THE KEY KNOB (TF2).** The tonic in the «Scale» panel changes only what the HANDS play (and re-makes a Jam / Drums backing in the new
key); recorded tracks keep the key they were played in and keep playing; frozen tracks stay frozen. Changing it while recording starts a
NEW track (as a mode change does). To move recordings: the Transpose buttons above.

**BEND CURVE (OWN2).** Select a theremin note (one with a curve): its points become white dots. Drag a dot up/down — cents (from the
note's attack pitch), sideways — time inside the note (one axis per gesture; the first dot only moves up/down; a dot stops before its
neighbour); a dashed ghost and «+35¢ · 1.25» follow the finger. With ✚ on, a tap inside the selected note's time adds a dot there. 🗑 / ⌫
removes the selected dot (the first stays). Each change is one ↶.
**BEND SHAPES (BEND-CURVE).** A dot you add or drag GLIDES: the pitch slides into it from the previous dot and on to the next one (a dot
straight from the recording keeps its recorded step — recordings are dense, so they already sound smooth). Every glide of the selected
note shows a small hollow DIAMOND at its middle: drag it up/down to bend the glide (up = reaches the new pitch early, down = late; near the
straight line it snaps straight); the ghost shows «⌒ +0.35». To make a deliberate JUMP: tap the dot at the END of that segment, then tap
`╱`/`⌐` in the editor bar — `⌐` = hold, then jump at the dot; tap again for `╱` = glide. The automation lane works the same way for bus
effects (reverb, delay, tremolo mix): select a point — its incoming glide shows the diamond; `╱`/`⌐` as before. Per-note lanes (Volume,
brightness, glide…) have no diamond yet. Each change is one ↶.
**TRACK INTO ANOTHER MODE (OWN1).** The `MODE` select in the editor bar lists the modes of the track's tuning with the same number of degrees.
Pick one — every note of the track moves to the same degree of the new mode (in C: major → Dorian turns E into E♭, B into B♭); a note
outside the old mode keeps its distance from the nearest degree. Times, volumes, bends stay. One ↶; a frozen track re-freezes by itself.
**ONE UNDO (ED7).** ↶ ↷ in the editor bar, in the window bar and on the play screen (next to ⤺), and Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (Ctrl+Y):
one history for takes, ⤺, note edits, automation, mixer level / pan / master, names and order, row delete, backing, sections and markers,
✕ clear (its ↶ brings the brace and ⟳ back too). **After ✕** the strip disappears with the song, so a box «Song cleared — ↶ Undo»
shows for ~6 s under the top bar (its button undoes the clear), and the transport row stays where it was with ONLY ↶ ↷ while there is
anything to undo (ED7-fix2). A toast names what was undone. Not in the history: mute, solo, arming, the brace, tempo,
tonic.

**VOLUME BARS (ED5).** With the lane on Volume and `▮▮` on (the default face), every NOTE is one bar at its start, height = its
volume (a chord is one bar, a drum hit one bar; a faint line follows the volume where it changes inside a note). Drag a bar up/down (the
number shows beside it; tenths near the bar, single units with the finger moved aside) — that note's whole volume moves by the same
amount; when the note is part of a several-notes selection, every selected note moves together. Two notes on one beat (two hands, kick
and hat) keep their own volumes — unlike the line, which holds one value per moment. A tap selects the note. One ↶ per drag. `•—` returns
to the line of points (point insert and ╱/⌐ live there).

**TIMBRE REPLACEMENT (T5).** Pick another timbre in `#rollTimbre` — the whole track sounds with it: every note start is rewritten (for
drums the kit of every hit); notes and rhythm unchanged. **One history entry:** one ↶ undoes it all, one ↷ redoes. **The track's effects
do NOT change** (the chain belongs to the track; recorded automation is the performance). A frozen track goes stale, plays its events in
the new timbre and re-freezes by itself after leaving the editor. Only WITHIN the role (bass by a bass timbre, drums by a kit). A drone
layer has no choice.

**FREEZING (AF3/AF4) — no control here.** A track renders to a buffer by itself after it settles (0.5 s after leaving the editor, 1 s after
a take, a pan release, an undo…); the transport plays the buffer instead of the events (events are never discarded). An edit never waits
for it: the track goes stale and plays its events until it re-freezes. Console only: `R.freezeQueue()`, `R.autoFreeze(false)`,
`R.freeze`/`R.unfreeze`.

**FOOTER — TWO LINES, both load-bearing.** The upper one — field gesture hints ("drag a note — move · its right edge — length · empty space
— scroll · two fingers — zoom · ruler — playhead"). The lower one — **CAPTURE SUMMARY**: what EXACTLY THIS track was recorded with — its
role and the effects of its chain plus the number of automation points ("captured — 🎚 Bass: Reverb · Delay · automation points: 214"), or
"captured — 🎚 Bass: no effects". One role per track (T4), so one chain in the line. A track without notes has no line.

**AUTOMATION LANE (O-4)** — a second horizontal band UNDER the note grid, 30 % of the free field within 56…92 px; the grid gives it exactly
that height and recomputes its rows. The TIME axis is the notes' (one snapshot for both fields); the VALUE axis is 0..100 with lines at
tenths and "100"/"0" labels at the left. Opened and closed by ONE select in the bar: the first item closes, the others are the parameters
of THIS TRACK's chain effects (one chain — its role's), grouped by effect in CHAIN ORDER. **The first item of every track with a role is
"Volume"** (VOL-3; its points come from the notes, like every per-note address below; it is never "not set"). In the lane: the address
name top left, the line, points, a shelf left of the first point (the state at the take's start). **The line is a step or a ramp, as it
SOUNDS:** each segment has its own shape, stored on the point it enters. Recorded points are always steps; a point placed with ✚ is SMOOTH
when a point precedes it (from the shelf — a step). Change the selected point's shape with `╱`/`⌐`; ↶/↷ restore it.
**Gestures:** a finger on a point takes it; the axis is decided by the first move (vertical = value, horizontal = time) and kept until
release; the value moves by TENTHS near the lane and by ONES when the finger moves aside (the number follows the finger and fades on
release); TIME is free (quantise does not apply). `✚` + tap on empty space — a new point; `🗑` or Backspace — remove the selected one.
**PER-NOTE ADDRESSES (V4b) — the lane edits THE NOTES.** For Glide, brightness, vibrato/drive/tremolo, each note carries the value; the
lane is built FROM THE NOTES: consecutive notes with one value = one segment, a point at its start. Dragging a point's value changes every
note of the segment; dragging its time moves the segment boundary; deleting gives the segment the previous value (the first — "not set");
a new point covers the notes up to the next boundary. One edit — one history entry; a frozen track goes stale. "Not set" (the note plays
the role default) — a hollow point at the default level; between notes the line is dimmed. **With smooth automation** a point can sit IN
THE MIDDLE of a held note (an anchor change event) and a smooth segment sounds INSIDE a long note (the editor writes change events along the
ramp) — a swell inside one note is two points. Glide changes only where the pitch changes. Named limits: a NOTE edit (move, length) does
not rebuild its ramp — the next edit of that address does; Glide over a recorded bass theremin smooths its steps.
**EFFECTS ADDED MID-TAKE** are listed too — at the end, with the line from the moment of adding and no shelf before it.
**The second half of the lane — THE TRACK'S OWN CHAIN:** "+ effect for this track" adds an effect not played live — first the role's
voice modules (their values go into the notes; removing the module in the same undoable step clears them from the notes), then bus
effects; effects the track already has (also those added mid-take) are not offered. `▲▼` move the shown effect in the chain, `⊘` removes
it; on an effect added mid-take they do not act yet. ⛔ The live hand chain is NOT touched — additions live in the track's CAPTURE. "+
effect" is disabled on a track without notes.
⚠️ A track without any captured chain gets one as a SNAPSHOT of the live chain: on its first insert in the editor (AF3: a track created in
the editor), at song load, or on the first chain edit — it keeps sounding as it did, but from then on live knobs no longer reach it.
Auto-freeze never pins the live chain by itself (such a track would be skipped). No on-screen notice on the "+ effect" path (known debt).

---

## PRIVACY NOTICE AND LATENCY METER (PRIV1, LAT1 — 2026-10-14; checked against `index.html`, `style.css`, `latmeter.js`)
- **Start card, footer, last line:** «Privacy» — a fold (`<details id="privacyNote">`); a tap opens two short paragraphs: camera picture,
  sound and hand movements stay on the device (detection runs in the browser; the app downloads only itself and the hand model from
  jsDelivr and Google's storage; recordings leave only when the person saves or shares them) and the Vercel copy's anonymous visit counter.
- **«🎛 Sound» panel, last section «Diagnostics»:** row «Latency meter» with On / Off (default Off).
- **On → a small box top-left under the bar** (`#latDiag`, over the camera picture, not in video clips): the delay on this device in ms
  (average · 95 % of frames) — camera fps and size with «picture taken → app» (or «frame shown → app» where the browser does not report the
  capture time), hand detection, gestures and sound commands, drawing with the frame interval, sound (buffer · output device · audio block ·
  measured path), page busy (long tasks) in the last minute, and «Hand → sound ≈ N ms»; a Bluetooth line when suspected. Buttons «Copy»
  (copies exactly the shown text, nothing is sent) and «Close» (= Off). Refreshed twice a second.
- **Bluetooth warning** (`#latWarn`, below the bar, centred, with «OK»; hides by itself after 15 s): once per output device, about 4 s
  after the start or after the output changes, when the output latency is 100 ms or more or the device's name looks wireless.
- **LAT1b (2026-10-15) — more lines in the box (and in «Copy», `R.latency()`):** «camera delivers N fps · we process N fps» (SND-F1b), a
  «master path» figure in the sound line (0 ms with our limiter); camera asked vs given (size, frame rate); «waiting for the
  next camera frame ≈ N» (half a frame); detections of an already seen frame per minute; the hand model asked / really running on (GPU or
  CPU, read from MediaPipe's own log lines; «GPU, with a part on CPU» or «CPU (confirmed earlier on this page)» where that applies) and hands tracked; the graphics renderer's name with «hardware» or «software»; page busy at
  startup (first 10 s) and while playing (last minute, restarted by a test switch) with the longest task's cause where the browser names
  it; a second total «Hand → sound incl. frame wait ≈ N ms» under the first.
- **«Diagnostics» test switches (LAT1b, session only, never saved; defaults = the app as before):** «Hands tracked (test)» 2 / 1 · «Hand
  model on (test)» GPU / CPU · «Camera frame rate (test)» default / 30 / 60; a hint line under them (shows «Applying…» or why a switch did
  not apply). After a switch the meter restarts its numbers.

## MASTER DYNAMICS, NIGHT FOREST, FIREFLY (SND-F1 — 2026-10-15; checked against `index.html`, `ui.js`, `audio.js`)
- **«🎛 Sound» panel, section «Master» (above «Diagnostics»):** «Glue (gentle compressor)» On / Off (default Off) · a hint line (the limiter
  at the very end is always on — no switch since SND-F1b). Session only.
- **Chord timbre «Firefly» (Светлячок):** «🎛 Sound» → «Chord instrument» (the last entry), also in the track editor's timbre list of chord
  tracks. Struck: each pinch strikes the notes once and they ring out (≈ 1.6 s); a latched chord keeps its place but its sound decays; a
  move to another degree strikes again.
- **Effects «Night forest» and «Glue»:** «🎛 Sound» → «Effects constructor» → «+ add effect» list: «Night forest» among the ordinary
  effects, «Glue» under its own heading «Dynamics». Night forest has Amount (default 0.8 = the prototype) and «Room» — three buttons
  Short 0.85 s / Medium 1.7 s / Long 3.4 s (SND-F1b; it starts «Fixed» on Medium; open the effect by tapping its name); Glue six
  (Threshold, Ratio, Knee, Attack, Release, Makeup gain). Also in the track editor's chain list.

## ОБУЧЕНИЕ — шесть уроков ВНУТРИ живого приложения

«Обучение» на старте открывает **СПИСОК уроков** — заодно это меню возможностей инструмента: человек
видит, что тут вообще есть. Выбор урока поднимает приложение и ведёт урок **в реальном приложении**:
живая камера, живой звук, живая сетка. Учатся, ДЕЛАЯ, а не читая.

**Шесть уроков, цепочкой:** Основы → Аккорды → Строи и тембры → Лупер → Функции рук → Две роли сразу.
Каждый шаг ЖДЁТ, пока действие реально произойдёт (событие приходит из точки самого действия), затем
подсвечивает «Дальше» и ставит ✓ — **сам не прыгает**, человек жмёт, когда дочитал. «Пропустить»
возвращает к списку. ФИНАЛ урока — карточка ВЫБОРА: «Дальше: <урок>» ведёт прямо в следующий урок
цепочки, «Готово — играть» оставляет играть. Пройденные помечены тихой ✓ (localStorage), но это
**не гейт**: любой урок доступен в любом порядке, цепочка — удобство, а не замена списку.

**Уроки — ДАННЫЕ, не логика.** Урок = запись `{id, titleKey, descKey, steps, next, setup}`; шаг =
`{key, gate, enter, done, final}`. Добавить урок = добавить запись. Шаг с `gate` тихо ВЫПАДАЕТ там, где
он бессмыслен (аккорд-шаги в бесаккордовом ладу, шаг палитры на ладу без `typedChords`).

**Правило setup:** урок обязан САМ привести приложение в состояние, где ЕГО шаги выполнимы, что бы ни
делал предыдущий урок. Найденные и закрытые протечки:
- **функции рук текли вперёд** — «Функции рук»/«Две роли» переписывают `handFn.ld`, свободная игра ещё
  и `ch`/`bs`; «Основы» находили левую руку НЕ на эффектах, а «Аккорды»/«Лупер» — аккорд-руку на
  «удержании» вместо «защёлки», и шаг защёлки не мог сработать. Теперь `tutorReset` возвращает дефолты
  ВСЕХ трёх ролей;
- **джем тёк вперёд** — петля/джем из «Лупера» продолжали играть в следующем уроке. `tutorReset` чистит
  петлю (та же связка, что кнопка ✕), а шаг джема чистит ещё раз, чтобы джем встал на пустую петлю и
  принялся при любом размере/ладу;
- **«Лупер» попадал на бесаккордовый лад** — «Строи» намеренно оставляют человека на Пелоге, а шаг
  наложения просит роль «Аккорды», которая там молчит. Теперь урок стартует на Мажоре (ищем по
  интервалам, не по индексу); «Аккорды» и «Две роли» — на Хроматике (единственный лад с ПОЛНОЙ палитрой
  типов); у «Двух ролей» порядок важен: сначала лад, потом пара половин.

**Подсказка прячется под работающим пальцем.** При открытой панели полоса сворачивается в ОДНУ строку у
нижней кромки (инструкцию не прячем: шаги просят два дела разом, а человек листает длинное меню). Пока
палец РАБОТАЕТ ВНУТРИ панели — полоса гаснет совсем и становится сквозной, возвращается через ~1.8 с.
Триггер — **ФОКУС** (`focusin`/`focusout`), а НЕ pointer-события: нативный пикер `<select>` съедает
`pointerup`, и на нём подсказка возвращалась поверх ещё открытого пикера («не прячется»). Фокус приходит
надёжно и ДЕРЖИТСЯ, пока пикер открыт.

**Видимость полосы решает РОВНО класс `.on`.** Классы положения (`.mini`/`.low`/`.hushed`) `display` не
несут. Раньше правило `.mini` несло свой `display:flex` и перебивало базовое `display:none` — и открытие
«Звукоряда» БЕЗ всякого урока выбрасывало пустую полосу с оранжевой кнопкой.

---

## Функции рук — что ещё умеет рука, кроме нот

Помимо нот (см. «Решённые вопросы»), рука может не играть вовсе:

**ВЫРАЗИТЕЛЬНОСТЬ (соло).** Рука нот НЕ играет — она «дышит» в звук. Живость даётся **малым числом
входов и БОГАТЫМ средним слоем**, а не количеством параметров: движение накачивает резонатор (стоишь —
тон мертвеет), у каждого канала своя инерц-пружина (рывок → перелёт и оседание = «тело»). **Четыре
канала ведут ЧЕТЫРЕ РАЗНЫЕ оси:** энергия→живость (шиммер), раскрытость ладони→вау (резонансный пик
бежит по частоте), размах пальцев→ХАРАКТЕР искажения (щепоть тёплое ↔ веер грязное — род, не
количество), наклон ладони→пространство (эхо). Раньше три канала из четырёх толкали ЯРКОСТЬ, и всё
ощущалось как ОДНА ось, поделённая на четыре способа — поэтому яркость как ось убрана.
**Покоящаяся рука обязана давать РОВНО ноль** (мёртвая зона на сглаженной скорости): дрожание
распознавания иначе читается как игра. **Громкость выразительность НЕ трогает** — она целиком у нотной
руки, две руки не дерутся за одну величину. Из высоты — только шиммер в пределах пары центов, живьём,
**в запись не идёт**. На экране это НЕ приборная панель: один столбик **ВЫР** (энергия) плюс тон и
размер точек руки (раскрытость/энергия); текстуру и пространство слышно, их не рисуем.

**ЛУПЕР (управление).** Доступна всем четырём ролям. Рука нот не играет, а командует записью
щипками: указательный=запись (во вооружённую дорожку, если она есть) и стоп, средний=пуск/пауза,
безымянный=отмена последнего дубля, мизинец=очистить всё (только
после 3 с удержания с видимым отсчётом; отпустил раньше — отмена). Команда срабатывает РАЗ на щипок —
СТРУКТУРНО: она живёт в блоке ЗАХВАТА щипка, а он по построению отрабатывает один раз на переход
«не сжато → сжато»; удержание идёт другой веткой. Палец у лупер-руки ЗАМОРОЖЕН, поэтому дрожание не
соскользнёт на соседний и не выстрелит вторую команду. Каждая команда подтверждается на экране ПО ИМЕНИ,
невозможные говорят почему («Нечего играть», «Нечего отменять», «Уже пусто»). Кнопки транспорта работают как
прежде — рука-лупер это ЕЩЁ один вход, не замена.

---

## 🎵 Подложка — два пути от одной кнопки

Тап по кнопке В ПОКОЕ открывает крошечное меню из двух пунктов: **«Джем (вся подложка)»** (гармония +
бас + ударные, как раньше) и **«🥁 Только ударные»**. Выбор СРАЗУ запускает — старт стоит 2 тапа;
дальше каждый тап переключает вариант ВНУТРИ выбранного пути ОДНИМ тапом, как было, и в конце цикла
выкл (кнопка в покое → следующий тап опять спросит). Долгий тап (правый клик) возвращает к выбору, не
докручивая цикл. Меню держит бар РАЗВЁРНУТЫМ, пока открыто, — оно привязано к кнопке, а свёрнутый бар её
прячет.

**Звучащий вариант НАЗВАН**: на кнопке имя + позиция (`🥁 Шаффл · 10/12`, длинное режется многоточием,
чтобы бар в портрете не переносился), полное имя в подсказке, и КАЖДАЯ смена всплывает тостом с полным
именем — тост важен потому, что свёрнутый бар кнопку прячет. Восемнадцать паттернов: номер «4/10» сам по
себе не говорит ничего.

Список «только ударных» **фильтруется по РАЗМЕРУ** (в 7 предложат ровно «Балканский 7», рока там нет);
размер без паттернов (5/10/12) ГАСИТ пункт с причиной, а не открывает пустой цикл.
⚠️ **Но КУЛЬТУРНОГО гейта у этого пути НЕТ, а у джема ЕСТЬ** (джем выбирает вариант по СВОЙСТВАМ лада).
Поэтому под рагой в 4/4 «только ударные» честно предложат рок и диско. Одна кнопка — два разных правила
приличия; это дефект, а не выбор (BACKLOG §3.33 п.1). Оба пути кладутся
через ту же метку `ev.jam` — ОДНА метка, одна очистка: снять подложку нельзя так, чтобы задеть записи
игрока. Следствие, честное: джем и «только ударные» не сосуществуют.

---

## Роль «Аккорды» — адаптивное поле

Одна роль, выглядит по-разному от звукоряда:
- **Диатоника**: ступени по вертикали, тип диктует лад.
- **Типизированные** (свойство `typedChords`; 8 наборов): экран делится на ПАЛИТРУ типов слева
  (колонка=семейство, ряд=вариант, из данных) и ряды/прямоугольники корней справа. Левая рука
  выбирает тип ПОЛОЖЕНИЕМ (большой+указательный, липко, по умолчанию первый); правая играет
  Y=корень, X=громкость, октаву — палец (нерект) ИЛИ октавный прямоугольник (19/31/Парч, rect).
  Тип мёрзнет в лупе (`a.ty`). Наборы:
  - Хроматика/19-TET/31-TET — шаги своего edo (`chrom12`/`edo19`/`edo31`).
  - Парч — 11-предельные ОТНОШЕНИЯ (`partch`: О / У / Диез 7-11 / Станд.), цент-ветка.
  - Болен–Пирс — отношения подгруппы 3.5.7 (`bp`: Мажор 3:5:7 / Минор 5:7:9 / Характерные),
    период-ветка `chordFreqs`.
  - Европа историческая — те же 24 типа, что хроматика, но: **чистыми отношениями**
    (`pyth` пифагоров, `nat` натуральный подвижный — аккорд чист от корня) ЛИБО **из фиксированной
    сетки** (`natfix` + `gridChords`: натуральный фиксированный, мезотон, велл-темперации — часть аккордов волк).
  - Выбор типа ПО ПОЛОЖЕНИЮ: вне сплита — левая (fx) рука; в сплите — любая рука слева от раздела
    своей половины (привязки к руке нет).
- **Макам, гамелан/патеты, Карлос** (`noChords`): роль отключена (монофония по традиции/выбору) —
  только соло + дрон.

---

## Решённые вопросы

- **ОДНА РОЛЬ И ОДИН ТЕМБР НА ДОРОЖКУ; ЗАМЕНА ТЕМБРА В РЕДАКТОРЕ — СДЕЛАНО** (слайсы T0–T5; разбор — HANDOFF,
  история). Каждый источник звука пишется в свою дорожку (сегодня источник = роль + тембр; позже — тембр,
  назначенный пальцу). Вкладок ролей в редакторе больше нет. Тембр записанной дорожки меняется ТОЛЬКО в
  редакторе, внутри роли, одной правкой истории; эффекты дорожки при этом не меняются.
- **TRACK FREEZING — DONE, AUTOMATIC** (F0–F5, A0–A2c, AF1–AF4). Tracks freeze themselves once they settle after a change; no ❄
  anywhere, only a faint dot in the arrangement window (hollow waiting, pulsing rendering). An edit makes a track stale (it plays its
  events) instead of being refused. Console: `R.freezeQueue()`, `R.autoFreeze(false)`.
- **ВЛАДЕНИЕ ЭФФЕКТАМИ — СДЕЛАНО** (O-0…O-4): последовательная цепь (звук изменён сознательно), захват всего
  сыгранного по взятым, переигровка захвата, прицел руки отдельно от звука, полоса автоматизации в редакторе.
- **ПИАНО-РОЛЛ — СДЕЛАН ДЛЯ ДВУХ РОЛЕЙ ИЗ ЧЕТЫРЁХ** (S4.0–S5.6): ударные и бас. Соло и аккорды — не начаты.
  ✅ Ноты баса в ролле НЕЗАВИСИМЫ (E0–E2): одиночная нота переносится целиком; правка отрезка линии, сыгранной одним
  щипком, сперва ОТДЕЛЯЕТ его (цена — скольжение в него и из него становится новой атакой), смена одной высоты
  скольжение сохраняет. Прежняя запись «следствие монофонии баса, решать вместе с полифоническим басом» закрыта.
- **РЕЖИМЫ ГОЛОСА — СДЕЛАНО** (V1–V4b): соло и бас — один мелодический инструмент с выбором «Полифония / Ведущий» в
  панели «🎛 Звук»; Скольжение — голосовой модуль, назначаемый на палец и записываемый.
- **ЛУПЕР → ЛИНЕЙНЫЙ МНОГОДОРОЖЕЧНЫЙ РЕКОРДЕР — СДЕЛАНО** (дуга слайсов S1–S3.5e, первая часть «Редактора
  дорожек»; разбор — HANDOFF). Дорожки с М/С (идентичность — сгенерированный id, не номер слоя) · время
  события АБСОЛЮТНОЕ, песня играет до конца и встаёт · повтор — СКОБА (потактовые края, её начало = начало
  записи, ⟳ только включает) · догонялка: вход в песню не с начала поднимает аккорды/бас/соло, которые
  звучали бы · запись ВО ВООРУЖЁННУЮ дорожку (слияние, а не замена) · удаление любой дорожки с её строки ·
  ⤺ снимает ПОСЛЕДНЕЕ ВЗЯТОЕ · три остановки с тремя смыслами (пауза держит место, паника сбрасывает на
  начало скобы, очистка — всё в ноль) · ничто не остаётся незакрытым в записи, в том числе на шве повтора.
- **Слияние ПК/телефон — СДЕЛАНО (крупнейшая перестройка).** ПК-режим и `uiMode` УДАЛЕНЫ; осталась
  одна вертикальная раскладка. Его единственную способность (две роли сразу) закрыл СПЛИТ-ЭКРАН
  (`splitOn`, только ландшафт): две половины, зона=инструмент, работа внутри половины по положению,
  эффекты — единственное, что привязано к руке (левая, в соло-половине). Роль+диапазон морозятся на
  `S` при захвате; единый источник геометрии — `phoneHalves`/`palSplitX`/`rectBandY`. Резолвер
  регистра теперь берёт РОЛЬ явным аргументом (`rectOctReg(role)`), а не глобальный `phoneInstr`.
  Пары ролей крутятся двумя кнопками, прокрутка пропускает роль другой половины (две половины одной роли
  невозможны — они делили бы состояние роли, а в ведущем режиме и единственный голос). Удалено: `drawPC`, `drawBar`, `zoneAt`/`zoneX`, `FXW`/`ZB`, `modeBtn`, класс `.phone`.
- **Жест выбора типа — палитра** (по положению; в сплите — любой рукой).
- **Макам без аккордов** (`noChords`); аккорды под макам — через полимодальность.
- **Хроматика/19-TET/31-TET — типизированные** через свойство `typedChords`.
- **Порядок меню независим от порядка массива**: лады добавляются В КОНЕЦ `SCALES`
  (индекс = `scaleIdx`), меню группирует по ключу `grp`.
- **Строй по центам** (Ява и Дальний Восток): гамелан задан реальными центами, не равным edo.
  Октава остаётся 2:1 (растяжку/ombak не моделируем). Гамелан — `noChords`.
- **«4 ноты в прямоугольнике» — СДЕЛАНО** (соло, бас, аккорды) и с этого шага — ПЕРЕКЛЮЧАЕМАЯ
  РАСКЛАДКА, а не свойство лада. `rectRows()` нотных прямоугольников + 1 октавный снизу
  (`rectRowsFull()`); Y выбирает прямоугольник, палец I–IV — 1 из 4 нот. Геометрия из одного
  источника (`rectBandY`+`rectRowsFull`), ввод и рисунок не разъезжаются.
  **Выбор человека — `state.rectPref`** ('auto'|'rect'|'rows', дефолт 'auto'), контрол «Раскладка
  нот» в панели звукоряда рядом с ладом; свойство `s.rectGrid` осталось ДЕФОЛТОМ лада. Разрешает
  ОДНО место — `scales.rectGrid()`.
  **Арифметика (ОДНА функция `rectLayout`):** переменны ДВЕ вещи — число нот в прямоугольнике
  k (4→3→2, первое подходящее) и повтор тоники на границе периода dup (0/1, ВЫРАВНИВАНИЕ: период
  занимает целое число прямоугольников). Дальше показываем СКОЛЬКО ВЛЕЗЕТ периодов, потолки —
  REG_N=4 (столько же и регистров, поэтому сетка на все четыре ничего не теряет) и 12
  прямоугольников. Итог по реальным данным: 7-нотные → k4/dup1, 4 октавы, 8 полос; 5-нотные →
  k3/dup1, 8; 6 → k3, 8; октатоники → k4, 8; 9 (Мессиан-3, Карлос α) и 11 (β) и 12 (хроматика,
  исторические) → 12 полос на 4 октавы; 19-TET и гамма → 2 октавы, 10+1; 31-TET (8+1), Парч (11+1),
  22 шрути (k2, 11+1), Болен–Пирс (k2/dup1, 7+1) → один период с регистровой полосой.
  ⛔ **НЕДОСТУПНЫХ ЛАДОВ БОЛЬШЕ НЕТ** (чётные делятся при k=2, нечётные при k=2+dup), поэтому ветка
  «недоступно с причиной» и две её строки словаря УДАЛЕНЫ — мёртвое объяснение хуже отсутствующего.
  ⛔ **Период-гейт у dup СНЯТ** (иначе Болен–Пирс и Карлос-бета, оба простые, не раскладываются
  никак); на высоту это не влияет, но подпись верхнего слота «Т» для Карлоса — преувеличение
  (её квинта не интервал эквивалентности), оговорка записана в коде.
  Раскладка НИКОГДА не попадает в событие — слой переигрывается одинаково; диапазон (deg,oct) тот же,
  что и был, поэтому старые петли играют как играли.
- **Октавный прямоугольник — блокер РЕШЁН, а у большинства ладов он теперь и НЕ НУЖЕН.** Полоса
  существует ТОЛЬКО там, где показан не весь диапазон (`rectLayout().hasReg` = `octaves < REG_N`) —
  ОДИН предикат на захват жеста, рисование и терменвокс. Где она есть, ловит ЛЮБУЮ руку по положению
  (зона `'oct'`, перебивает роль; у аккордов — правее палитры, но ТОЛЬКО когда палитра есть,
  т.е. `typedChords`: у нетипизированного аккордового лада полоса идёт во всю ширину роли) и
  двигает ОКНО из `octaves` периодов (а не одну октаву): база клампится `rectBase` ОДИНАКОВО на
  чтении и на записи, выбираемых баз `rectBaseMax()+1` — при одном периоде прежние четыре
  (байт-в-байт), при двух три, подпись «окт I–II», лишние пальцы тусклые. Регистры раздельны: соло
  `octReg`, бас `bassOctReg`, аккорды `chordOctReg` — резолвер `rectOctReg(role)` в `state.js` (роль
  явным аргументом, чтобы в сплите две половины писали каждая свой регистр).
  ⚠️ Где полоса ОСТАЛАСЬ, она по-прежнему забирает `1/(N+1)` высоты (у Парча 8%). Где её НЕТ, вся
  высота отдана нотам: у 7-нотного лада прежняя треть экрана под регистр стала двумя лишними
  октавами нот.
- **Парч (43 тона, чистая интонация) — СДЕЛАНО** (SCALES индекс 49): цент-лад, `trad:'world'`,
  `rectGrid`, аккорды чистыми отношениями (`typedChords:'partch'`).
- **Аккорды на цент-ладах — СДЕЛАНО.** Цент-ветка `chordFreqs` (гейт `s.cents && ty`) считает
  ноту аккорда как `тоника·2^(центы_корня/1200)·ratio` — отношения напрямую, мимо шагов edo.
  Шаговый путь (chrom12/edo19/edo31) не тронут. Гамелан — `noChords` ПО ВЫБОРУ, не по нехватке.
- **Функции рук — СДЕЛАНО** (заменили тумблер терменвокса `〰` и смену рук `⇄`): каждой руке —
  функция В ПРЕДЕЛАХ РОЛИ (`handFn`, у каждой из четырёх ролей своя пара). СОЛО/БАС: **Эффекты** (с цели
  (б) — у ВСЕХ ролей) · **Ноты (непрерывно)** · **Ноты (с удержанием)** (нота мёрзнет на щипке, громкость по X живая,
  стоп по размыканию) · **Терменвокс**. **АККОРДЫ** (новое): **Аккорды (защёлка)** (дефолт — аккорд
  звучит и после размыкания; джем и сплит держатся на этом) · **Аккорды (с удержанием)** (аккорд мёрзнет,
  пока пальцы вместе, гаснет при размыкании — тот же механизм, что соло-hold). У ВСЕХ трёх нот-ролей есть
  **Лупер (управление)** (см. «Рука-лупер» ниже). Дефолты = как раньше (соло левая=эффекты/правая=ноты;
  бас обе ноты; аккорды обе защёлка). Передача голоса — это ВЕДУЩИЙ РЕЖИМ голоса, а не свойство баса: у роли в
  ведущем режиме (бас по умолчанию, соло — по выбору) последний щипок берёт единственный голос, он скользит к новой
  высоте, отпустил — голос возвращается ещё зажатой руке (нет застрявшей ноты). В полифоническом режиме (соло по
  умолчанию, бас — по выбору) у каждой руки и пальца свой голос, передавать нечего. У УДАРНЫХ функции рук
  тоже есть: Удары (дефолт) · Эффекты · Лупер. В сплите — ПО ПОЛОВИНЕ, по её роли.
- **Яркость аккорда по глубине руки + ЯРК-индикатор — СДЕЛАНО**: Z-глубина ведущей руки (тот же размер
  кисти, что реверб соло) → яркость тембра (НЕ высоту), пишется в событие как `a.bri` (как `a.rev` у
  соло) — слой переигрывается со своей яркостью. ⚠️ Отдельного столбика **ЯРК** больше НЕТ: яркость
  стала обычным эффектом цепи аккордов (`bright`, по умолчанию на глубине руки), её показывает столбик цепи. Инвариант: ДВА фильтра на голос (`f` атака/тембр, `fb` непрерывная яркость) — сливать
  нельзя (см. CLAUDE.md, hard rule 19).
- **Рука-ЛУПЕР («Лупер») — СДЕЛАНО**: рука нот не играет, командует лупером щипками пальцев —
  указательный=запись (во вооружённую дорожку, если есть), средний=пуск/пауза, безымянный=отмена
  последнего дубля, мизинец=очистить всё (после 3с
  удержания с видимым отсчётом; отпустил раньше — отмена). Команда срабатывает РАЗ на щипок (по построению:
  блок захвата = edge), палец заморожен, чтобы дрожание не выстрелило вторую команду. Каждая команда
  подтверждается на экране по имени, невозможные говорят почему («Нечего играть» и т.п.). Кнопки транспорта
  в UI работают как прежде — рука-лупер это ЕЩЁ один вход.
- **Живой аккорд переживает ГРАНИЦУ ПОВТОРА — СДЕЛАНО, и правило в силе после смены модели**: раньше
  `liveWrapRelease` гасил `'latch'` на каждой границе повтора (соло/бас выживали СЛУЧАЙНО — их переатакует
  зажатая рука, а `chordGlide` удалённые голоса не пересобирает → гас только аккорд). Теперь шов гасит
  ТОЛЬКО голоса дорожек и живые соло/бас; удержанный/защёлкнутый аккорд принадлежит РУКЕ.
  ⚠️ «Заворота петли» больше НЕТ: граница существует ТОЛЬКО пока крутится скоба повтора.
  ⚠️ И не путать ЗВУК с ЗАПИСЬЮ: в ЗАПИСЬ на каждом шве ложится «выкл» аккорда в конце прохода и свежее
  «вкл» в начале следующего (иначе он звенел бы на переигровке до конца песни). Это только события —
  живой голос аккорда при этом не трогается вовсе.
- **COVER-видео (без растяжения) — СДЕЛАНО**: `coverView(vw,vh,W,H)` заменил прежний кроп фиксированной
  долей по оси. Кадр вписывается в соотношение холста (cover) и ужимается на `CAM_MARGIN` — картинка
  больше не растягивается по горизонтали на широком окне. ОДНА область (`viewRect`) кормит и источник
  `drawImage`, и ремап `sx`/`sy` — иначе рука рисовалась бы не там, где палец. `remapAxis` остался как
  частный случай равного соотношения. Итог полей: длинная ось холста держит 12%, обрезанная получает
  больше → `CAM_MARGIN` не поднимали; на телефоне-портрете с ландшафтным сенсором видна центральная полоса.
- **Разделы меню ПО ЗВУЧАНИЮ — СДЕЛАНО**: шесть разделов (Привычное · Ближний Восток · Индия · Ява и
  Дальний Восток · Европа историческая · Эксперименты). «Европа историческая» — свой раздел (хронология);
  «Эксперименты» ограничен СТРОЕМ (целотон/октатоники/Мессиан — обычный 12-TET, остаются в «Привычном»).
  Порядок `SCALES` и все индексы НЕ тронуты — переехал только текст `trad`/`grp`.
- **Терменвокс — теперь ФУНКЦИЯ РУКИ** (соло И бас): высота непрерывна по y, интерполяция в центах
  (`thereminSpan`/`thereminHz`), бас = `thereminHz/4`. Рисуется АДДИТИВНЫМ оверлеем тонких линий ПОВЕРХ
  обычной сетки (`drawThereminLines`), только когда какая-то рука роли назначена на терменвокс. Живьём;
  лупер пишет ближайшую ступень (живые Гц не записываются — ни у соло, ни у баса).
- **Эталон A4 — СДЕЛАНО** (`aRef`, панель звукоряда): регулируемая опорная частота (по умолч. 440,
  380–480; пресеты 415 барочный … 444 оркестровый + свободный ввод с клампом). ЕДИНЫЙ источник:
  `baseF()` И якорь фиксированных строёв `cFix()` берут его же (`a3=aRef/2`) → мир и темперации едут
  ВМЕСТЕ. Смена ре-настраивает всё живьём (дрон следует, слои петли — на переигровке).
- **Фиксированный строй `fixedKey` + велл-темперации — СДЕЛАНО**: у шести исторических строёв тоника —
  КЛЮЧ, а не множитель (сетка приколочена к абсолютным высотам от C). Веркмайстер: терция ≈390¢ в C,
  ≈408¢ в F#. Ряды показывают РЕАЛЬНЫЕ имена нот. `fixedKey` — ОТДЕЛЬНОЕ свойство от `gridChords`
  (Пифагоров `fixedKey`, но аккорды чистыми отношениями; Натуральный подвижный — намеренно не `fixedKey`).
- **Разбор аккорда — СДЕЛАНО**: пока аккорд звучит, в его подсвеченном прямоугольнике — Гц каждой ноты
  + интервал над КОРНЕМ в центах. Числа из ЗВУЧАЩИХ голосов (`chordHold`), не пересчёт → дисплей и звук
  не разойдутся. Только живой защёлкнутый аккорд.
- **Переменный размер такта — СДЕЛАНО** (`loop.metre`, панель лупера): 2..16 долей (только на пустой
  песне при стоящем транспорте), БЕЗ знаменателя (движок считает доли при BPM). Акценты по группам (`METRE_GROUPS`: 7=3+2+2,
  16=4×4 с khali в 3-м вибхаге) — видно (сетка) и слышно (метроном). Ритмы объявляют свои `beats`.
- **Планировщик с опережением — СДЕЛАНО** (архитектурный инвариант): слои планируются на ТОЧНОЕ время в
  окне ~300мс, живые вызовы — «сейчас». Убрал дрейф от блокировок main-thread (синхронный MediaPipe).
- **Три пути синтеза — СДЕЛАНО**: субтрактивный + FM (`buildFMBank`: ингармонические колокол/металлофон)
  + Карплюс–Стронг (`ks-worklet.js`: физ. струна, строй <1¢, банки Струна/Ситр/Уд/Кото/Сантур/Гитара/
  Пиццикато; при провале ворклета — запасные щипки). Пады/органы питч-ЧИСТЫЕ (биения = строй, не тембр).
- **Полный экран — СДЕЛАНО** (`⛶` на старте и в баре): одно состояние, синхрон через `fullscreenchange`,
  спрятан там, где нет Fullscreen API (iPhone Safari).
- **Неоктавные строи — СДЕЛАНО** (раздел `exp` «Эксперименты»): период стал СВОЙСТВОМ лада (`period`,
  `periodOf(s)=s.period||2`), двойка в ядре обобщена до `P` в `leadFreq`/`bassFreq`/`chordFreqs`/
  `centsOf` (`pc=1200*log2(P)`). Дефолт 2 ⇒ все октавные лады байт-в-байт. Регистр сдвигает на
  ПЕРИОД. Ярлыки: `gridNoteLbl` (порядковый Т,2,3… у неоктавных И цент-ладов) и `regWord`
  (окт/тритава/рег.). Дизайн-вопрос «октавный прямоугольник без октавы» РЕШЁН: это регистр на период.
- **Болен–Пирс (тритава) — СДЕЛАНО** + аккорды подгруппы 3.5.7 (`CHORD_FAM_SETS['bp']`, период-ветка).
- **Карлос α/β/γ — СДЕЛАНО** (делят квинту 3:2). Гамма получила rect-раскладку: счётчик `rectRows`
  развязан — `+1` (верхняя тоника) гейтится периодом, у неоктавного лада его нет, гамма 20/4=5.
- **Исторические темперации — СДЕЛАНО** (раздел `europe` «Европа историческая»): Пифагоров, Натуральный ×2 (подвижный/
  фиксированный), Мезотон 1/4 коммы. Фиксированные строят аккорд из сетки (`gridChords` + grid-ветка
  `chordFreqs`) → слышен волк; подвижный/Пифагор — чистым отношением от корня.
- **Индийская классика — СДЕЛАНО** (традиция `indian`, индексы 61..71): сетка 22 шрути (чистая
  интонация) + 10 раг, все `noChords`. Ярлыки сваром/шрути (`swaraLbl`); `drawStatus` для цент-ладов
  печатает «центовый строй · N ступеней», а не фиктивный «N-TET · шаг X» (равного шага у гамелана/
  Парча/темпераций/раг НЕТ).
- **Переключение камеры — СДЕЛАНО** (`🔄`): `camFacing`/`mirrored()`/`flipX` — ЕДИНЫЙ источник зеркала;
  фронт зеркалим, тыл нет; поток пере-запрашивается на ТОТ ЖЕ `<video>` (landmarker не пересоздаём);
  отказ → откат + русский тост.
- **Поля кадра — СДЕЛАНО** (`CAM_MARGIN=0.12`): показываем/играем внутренние ~76% кадра, MediaPipe
  получает ПОЛНЫЙ кадр — рука на крайних прямоугольниках ещё в кадре. ДВЕ роли координат: СЫРЫЕ (вся
  гест-математика — щипок/размер/Z-реверб/пороги) и РЕМАПНУТЫЕ (`sx`/`sy` — позиция и попадание).
  Координаты не клампим, сатурируется только выбор.
- **Прицел реверба под сплитом — СНЯТ вместе с показом**: `revDisp` удалён — реверб ушёл с играющей руки
  (Пласт 3.1). Критерий `soloNoteHand` остался и решает теперь другое: ЧЬЯ глубина ведёт параметры
  соло-цепи на адресе `play:z`.
- **Запись клипа/аудио — СДЕЛАНО** (`clip.js`, `🎥`/`🎙`): видео = кадр ХОЛСТА (без HTML-накладок) +
  отвод звука в ОДИН файл; аудио = только звук; взаимоисключаемы; честный WebM. Кнопки ведёт реальное
  состояние рекордера (`onClipChange`) — не залипают.
- **Джем — СДЕЛАНО** (`🎵`): культурная подложка одним тапом, тап меняет вариант (прежний стоп, не
  слоями), в конце выкл. Не режим — обычные слои лупера с меткой `ev.jam` (`clearJam` не тронет записи
  игрока). Варианты по СВОЙСТВАМ лада, из существующих `HARMONIES`/`RHYTHMS`/`BASS_MODES`.
- **UI-волна — СДЕЛАНО**: светлая стартовая карточка (2 кнопки, подвал с отзывом/донатом) ·
  авто-скрытие верхней полоски (в свёрнутом — роль + 3 кнопки записи, те же элементы) · светлые
  непрозрачные панели · урезанные панели звукоряда/лупера.
- **ПУБЛИКАЦИЯ — СДЕЛАНО**: приложение переименовано в **Handsong**, выложено статикой (базовый путь
  ОТНОСИТЕЛЬНЫЙ — работает из подпапки GitHub Pages; камере/звуку/ворклету нужен HTTPS), **устанавливается**
  (`manifest.json` + `sw.js`). SW **намеренно БЕЗ кэша** — единственная его задача — чтобы Chromium прислал
  `beforeinstallprompt` и кнопка установки вообще появилась; кэша нет, значит ничто не застрянет устаревшим.
  Форма отзыва и донат — ДВЕ константы в `ui.js` (`FEEDBACK_URL`/`DONATE_URL`; пустой донат прячет строку
  целиком, а не рисует мёртвую ссылку). ⚠️ Живой URL в репозитории НИГДЕ не записан — вписать в HANDOFF.
- **ЛОКАЛИЗАЦИЯ — СДЕЛАНО** (английский по умолчанию + русский; es/de готовы ПО ФОРМЕ, но не включены —
  музыкальную терминологию проверить некому, а неверный термин носитель прочтёт как баг). Интерфейс — в
  словарях (`t()`, `data-i18n`); фолбэк язык → en → умолчание вызова → САМ КЛЮЧ, чтобы пропущенный перевод
  был ВИДЕН. Музыкальные имена — ВНУТРИ данных (`L()`), тремя формами, и форма кодирует решение: голая
  строка = международная запись, `{default, ru}` = имя собственное (транслитерация), полный объект =
  переводимое слово. **Опасность идентификатора, закрытая:** `demo.js` сопоставлял сцены с ладами ПО ИМЕНИ,
  а меню бакетило группы по ПОКАЗЫВАЕМОЙ подписи — оба сломались бы от локализации; теперь стабильный
  индекс и стабильный ключ. Больше НИЧТО не смеет опираться на отображаемое имя.
- **ОБУЧЕНИЕ — СДЕЛАНО** (шесть уроков, см. отдельный раздел выше). Было «ГЛАВНОЙ фичей после публикации» —
  вышло. Ожидавшиеся «хуки завершения жеста» построены как ОДИН канал `hooks.tutor`, а события шлются ИЗ
  ТОЧЕК реального действия (событие возникает ⇔ действие произошло), а не пересчитываются параллельно.
- **ВЫРАЗИТЕЛЬНОСТЬ и РУКА-ЛУПЕР — СДЕЛАНО** (см. раздел «Функции рук» выше). Ключевое, что легко потерять
  при правках: суб-шаг фиксированным шагом (без него пружина самовозбуждалась ниже ~13 fps — та самая
  загадочная дрожь 5–8 Гц), мёртвые зоны (покой = РОВНО ноль), четыре РАЗНЫЕ оси, и единичное срабатывание
  команд лупера ПО ПОСТРОЕНИЮ (блок захвата щипка), а не по флагу.
- **Дробление доли и восемнадцать ритмов — СДЕЛАНО**: паттерн объявляет `sub` (ячеек на долю: 4 = 16-е,
  3 = ТРИОЛИ), `stepBeat=1/sub`; сетка обязана быть ровно `beats*sub`, иначе паттерн пропускается (опечатка
  в данных иначе молча растянула бы такт). Квантизация ЖИВЫХ ударов идёт по `loop.sub` — ЯВНАЯ настройка
  панели, не вывод из последнего загруженного паттерна. Восемнадцать паттернов, десять из них ходовые 4/4
  (рок/поп/фанк/диско/хип-хоп/босса/самба/регги/марш/шаффл — шаффл единственный триольный).
- **Две ошибки, найденные в том же заходе:** (1) в аранжировку НЕ передавался выбранный набор ударных —
  любая подложка играла «Стандартом», какой бы кит ни стоял; (2) правило свёрнутой подсказки тура несло
  свой `display` и перебивало правило скрытия — пустая полоса вылезала БЕЗ всякого урока.

---

## Крупная фича «4 ноты в прямоугольнике» — СДЕЛАНО (была будущей)

**Была проблема:** в строях с большим числом ступеней (19-TET=19, 31-TET=31, Парч=43)
слишком много узких рядов, чтобы попадать по Y. 43 ряда на телефоне — ~18px, не попасть.

**Что построено (соло → бас → аккорды):** с правого пальца снята
функция октавы и отдана под ДОВЫБОР ноты внутри прямоугольника — 4 ноты на прямоугольник
(указательный=нижняя … мизинец=верхняя). Y выбирает прямоугольник, палец — ноту в нём.
Геометрия из ОДНОГО источника (`rectBandY` в config, `rectRows`/`rectRowsFull` в scales) — ввод
(`degHyst`) и рисунок (`drawRectGrid`) делят высоту одинаково.

**ШАГ 2 (сделан): раскладка стала СОСТОЯНИЕМ, доступным обычным ладам.** Прямоугольники больше не
привилегия микротональных строёв: свойство `rectGrid` — теперь лишь ДЕФОЛТ лада, а выбирает человек
(`state.rectPref`, контрол «Раскладка нот» рядом с ладом). Свойство лада — только ДЕФОЛТ.
Заодно закрыты три вещи, которые всплыли только на новых ладах: (1) у нетипизированных аккордовых
ладов рисунок брал узкие ряды, пока ввод шёл прямоугольниками (не било лишь потому, что rect-лады
были либо `typedChords`, либо `noChords`); (2) подписи нот слиты в ОДНУ функцию `noteLbl` — подпись
зависит от ЛАДА, а не от раскладки, поэтому 7-нотный лад в прямоугольниках показывает настоящие
имена нот, рага — свары; (3) старый off-by-one терменвокса (делил поле на `IVX().length`, а не на
число нот сетки — гамма делилась на 21 вместо 20).

**ШАГ 3 (сделан): переменное k и НЕСКОЛЬКО ОКТАВ СРАЗУ.** Вся арифметика съехала в ОДНУ функцию
`rectLayout` (см. выше в разделе про сетку): нот в прямоугольнике k = 4/3/2, повтор тоники dup = 0/1
ради ВЫРАВНИВАНИЯ периода, дальше показываем сколько влезет периодов (потолки REG_N=4 и 12
прямоугольников). Следствия: **раскладываются ВСЕ 75 ладов** (пентатоники, блюз, сетка 22 шрути и
Болен–Пирс были невозможны — теперь нет), у большинства **регистровая полоса ИСЧЕЗЛА** (весь диапазон
под рукой: 7-нотный лад — 8 прямоугольников на 4 октавы, хроматика — 12), а где показан не весь
диапазон (19-TET, гамма — 2 октавы; 31-TET, Парч, шрути, BP — 1) полоса осталась и двигает ОКНО.
Ветка «недоступно с причиной» и две её строки словаря УДАЛЕНЫ. Байт-в-байт остались **31-TET и Парч**;
19-TET и гамма ИЗМЕНИЛИСЬ намеренно. Ещё два дефекта закрыты в том же заходе: подсветка искала
прямоугольник по одной СТУПЕНИ (на многопериодной сетке всегда падала бы в нижний блок — теперь носим
пару ступень+регистр и ищем обратной формулой `rectSlotOf`), и тождество защёлки не включало регистр
(один и тот же аккорд октавой выше ГЛУШИЛ бы предыдущий вместо перехода).

**Блокер октавы — РЕШЁН октавным прямоугольником.** Нижняя полоса сетки — «ОКТАВА»: щипок
в неё (любой рукой, по положению — зона `'oct'` перебивает роль; у аккордов правее палитры, но
только когда палитра ЕСТЬ — `typedChords`) ставит ЛИПКИЙ регистр роли. Регистры раздельны
(`octReg`/`bassOctReg`/`chordOctReg`),
резолвятся в одном месте — `rectOctReg()`/`setRectOctReg()` в `state.js`. Соло и аккорды не
расходятся: у аккордов rect — ряды КОРНЕЙ (правее палитры у типизированных, во всю ширину роли у
прочих), палитра слева не тронута, тип из палитры.

**Парч** на этой раскладке стал играбельным («11 крупных прямоугольников») и получил
собственные аккорды (см. Решённые вопросы).

---

## Порядок работ

**Сделано:** макам без аккордов · два меню + индикатор строя · палитра типов (Хроматика,
31-TET, 19-TET) · аккорды 19/31-TET по интервалам · гарм./мел. мажор + группировка по
`grp` · волны экзотических/симметричных, мировых пентатоник, макамов, японских ·
механизм центов + слендро/пелог · **rect-модель «4 ноты в прямоугольнике» (соло/бас/аккорды)**
· **октавный прямоугольник** (раздельные регистры, резолвер) · **Парч (43 тона)** ·
**аккорды Парча** (палитра `partch`, чистые отношения) · **аккорды на цент-ладах** (цент-ветка
`chordFreqs`) · **терменвокс** (непрерывная высота, соло) · **неоктавные строи**
(период как свойство: Болен–Пирс + аккорды 3.5.7, Карлос α/β/γ, rect для гаммы) ·
**исторические темперации** (Пифагоров/Натуральный ×2/Мезотон; grid-аккорды и волк) ·
**патеты пелога** · **порядковые ярлыки для цент-ладов** (`gridNoteLbl`) ·
**слияние ПК/телефон** (удалён ПК/`uiMode`; сплит-экран на две роли, зона=инструмент,
единый источник геометрии, ролевой резолвер регистра, ландшафт-гейт) ·
**индийская традиция** (22 шрути + 10 раг, ярлыки сваром/шрути) ·
**переключение камеры** (единый источник зеркала) · **поля кадра** (`CAM_MARGIN`, две роли
координат) · **прицел реверба под сплитом** (нотная рука соло-половины) ·
**запись клипа/аудио** (`clip.js`) · **джем** (`ev.jam`) · **UI-волна** (светлый старт,
авто-скрытие полоски, светлые панели) · **три пути синтеза** (FM `buildFMBank` + Карплюс–Стронг
`ks-worklet.js` + субтрактивный; барабанные наборы табла/дарбука/гамелан/тайко) · **переменный размер
такта** (`loop.metre`, акценты `METRE_GROUPS`, планировщик с опережением) · **fixedKey + велл-темперации**
(тоника=ключ) · **регулируемый эталон A4** (`aRef`) · **разбор аккорда** (Гц из звучащих голосов) ·
**центы на КАЖДОМ ладу в ярлыке** · **Функции рук** (заменили `〰`/`⇄`; удержание, терменвокс-функция,
передача голоса — ныне ведущий режим) · **полный экран** (`⛶`) · **функции рук у аккордов** (защёлка/удержание) ·
**рука-лупер** (команды пальцами) · **яркость аккорда по глубине + ЯРК** (`a.bri`, два фильтра) ·
**живой аккорд переживает заворот петли** · **COVER-видео** (`coverView`, без растяжения) ·
**разделы меню по звучанию** (шесть; индексы `SCALES` не тронуты) ·
**ПУБЛИКАЦИЯ** (Handsong, статика с относительным путём, установка через `manifest.json`+беcкэшевый `sw.js`,
отзыв/донат двумя константами) · **ЛОКАЛИЗАЦИЯ** (английский по умолчанию + русский; интерфейс в словарях,
музыкальные имена тремя формами внутри данных; закрыта опасность «имя как идентификатор») ·
**ОБУЧЕНИЕ** (шесть уроков данными, цепочка, один канал `hooks.tutor`) ·
**рука-ВЫРАЗИТЕЛЬНОСТЬ** (четыре оси, резонатор+пружина, суб-шаг) ·
**дробление доли `sub` + 18 ритмов** · **кнопка «Подложка»** (джем / только ударные, фильтр по размеру) ·
**ЛИНЕЙНЫЙ МНОГОДОРОЖЕЧНЫЙ РЕКОРДЕР** (дорожки М/С, абсолютное время, скоба повтора, догонялка, запись во
вооружённую дорожку, удаление дорожки, ⤺ последнего дубля, три остановки, закрытие нот на шве) ·
**ПИАНО-РОЛЛ** для ударных и баса (правка, вставка, длина, отмена И возврат) · **ВЛАДЕНИЕ ЭФФЕКТАМИ** и
**полоса автоматизации** · **track FREEZING** (automatic since AF3/AF4, no ❄) · **ОДНА РОЛЬ И ОДИН ТЕМБР на дорожку** ·
**замена тембра** в редакторе · Backspace удаляет выбранное · **независимые ноты баса** в редакторе (E0–E2) ·
**РЕЖИМЫ ГОЛОСА** (полифония / ведущий у соло и баса) и **Скольжение** · **полоса правит пер-нотные величины в нотах**
(V4b) · **заморозка звучит как живая игра** · **яркость у каждой роли**.

**Дальше — ПОРЯДОК, КАК ОН СТОИТ СЕЙЧАС** (решение пользователя; источник и подробности — HANDOFF, «Порядок работ»):
1. **ПЛАН** громкости как параметра и двух свободных осей играющей руки (влево–вправо, глубина) на любой параметр.
2. Правка соло и аккордов в пиано-ролле.
3. **Фундамент:** стабильные идентичности ладов и тембров, формат песни и формат тембра.
4. **Сохранение** на устройстве, экспорт и импорт песни файлом.
5. **Необходимое редактору** (выделение, копирование, громкость нот полосой, квантизация после записи,
   транспонирование по ступеням, имена/цвета/порядок дорожек, разделы, одна отмена на всю программу).
6. **Что делает редактор нашим** (перестройка дорожки в другой лад, отклонение рядов в центах, бенд кривой).
7. **Автозаморозка**, **микшер** с полосой мастер-выхода, **экспорт аудио** со строем в Scala.
8. **Конструктор тембров** — на готовом формате. 9. **Сервер.**
⚠️ Предпосылка сохранения чего бы то ни было — СТАБИЛЬНЫЕ ИДЕНТИФИКАТОРЫ ЛАДОВ И ТЕМБРОВ (BACKLOG §1).
Прежний пункт «Редактор дорожек, остаток» (режим записи → пиано-ролл → контекст рендера → экспорт →
заморозка) закрыт или переехал в список выше: режим записи стал линейной песней, пиано-ролл и заморозка
сделаны, экспорт — в пункте 7.
- **Промо-ролик.** Приложение опубликовано и умеет само себя объяснить (обучение), но **в движении его
  никто не видел**: ссылкой поделиться нечем. Это ближайший шаг — он про доведение до людей, а не про код.
- **Замер задержки входа** (рука → звук). Известный корень — синхронный MediaPipe в главном потоке;
  планировщик с опережением его МАСКИРУЕТ, но не убирает. Сначала ИЗМЕРИТЬ, потом решать (правило проекта:
  диагностика до постройки).
- **Испанский и немецкий** — механизм и формы готовы, ждём человека, который проверит музыкальную
  терминологию. Без проверки не включаем.
- **Глиссандо-в-луп — у СОЛО СДЕЛАНО** (терменвокс пишет ближайшую ступень плюс кривую бенда `a.bend`, и
  переигровка её повторяет); **у БАСА — нет** (бас-терменвокс пишет только ближайшую ступень) · подсказка аккорда
  лупа поверх поля соло · **сплит — ровно две половины** (трёхролевых раскладок нет) · заморозка тоники
  per-event для fixedKey-слоёв (полимодальность окраски — отложена, см. BACKLOG) · **свинг как ОТНОШЕНИЕ**
  (не сетка; `sub` — предпосылка, см. BACKLOG §3.30).
- **Оставшийся строй:** турецкие макамы (9-комма/53-EDO) — последнее крупное белое пятно карты; после
  них карта строёв по сути ПОЛНАЯ (см. BACKLOG §3.25).

Правило: не обустраивать комнаты, пока не согласован план дома. Карта — план дома.
~~Английский/локализацию — только когда UI застынет.~~ — устарело: локализация выпущена (en по умолчанию + ru),
новые строки интерфейса сразу идут в оба словаря.
