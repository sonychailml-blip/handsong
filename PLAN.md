# План: разбиение index.html на ES-модули (только план, без кода)

## Контекст

Приложение работает; цель — сделать проект пригодным для дальнейшей работы. Любое изменение звучания, тайминга или жестов = провал. Никаких сборщиков, никаких переименований существующих имён, стиль кода не трогаем. Русские комментарии переезжают вместе с кодом.

**Единственное неизбежное «новое»**: перерезать цикл audio→DOM без нового кода невозможно. Ниже — полный закрытый список новых имён (только добавления, ни одного переименования); всё остальное переезжает 1-в-1.

---

## 0. Возражения по исходному списку (вы просили оспорить)

1. **Нужен ещё один файл — `src/hooks.js`** (4 строки). Это ключ к развязке циклов, см. §2.
2. **`state.js` должен быть уже, чем ваш список.** `HANDS` и `leadOwner` пишутся только в gestures → живут в `gestures.js`. `back` — в `backing.js`. `events`/`recording` — в `recorder.js`. В `state.js` только сквозное музыкальное состояние: `scaleIdx, tonic, seventh, leadIdx, chIdx, fx, revDisp`. Монолитный state.js со всем подряд создаёт лишние рёбра графа без выгоды. Подробно в §3.
3. **`initBacking()` не нужен.** Узлы подложки (`backBus, backRev, dO1, dO2, dG, noiseBuf`) создаются внутри `initAudio` — оставить как есть и просто экспортировать их из `audio.js`. backing.js импортирует их односторонне. Ноль новых функций, ноль риска изменить порядок создания узлов.
4. **`LEAD_INSTR` / `CHORD_INSTR` — не в config.js, а в audio.js** (экспорт для ui). Это определения синтеза, а не пороги. config.js — только числа/метаданные, общие для нескольких слоёв.
5. **`statusEl` пишется из `draw()`** — это тоже «слой пишет в DOM», но draw — презентационный слой; правило «аудио не трогает DOM» на него не распространяется. Оставить: `draw.js` сам делает lookup `#status`. Гонять строку статуса через hooks — churn без выгоды.
6. В остальном ваша раскладка верна.

---

## 1. Раскладка по файлам

`index.html` — только разметка + `<link rel="stylesheet" href="style.css">` + `<script type="module" src="src/main.js">`.

`style.css` — весь `<style>` как есть.

### src/config.js (лист графа, ничего не импортирует)
Переезжает: `FXW, ZB, FINGER_TIPS, FX_META, REV_COLOR` + магические числа получают имена (новые константы, значения 1-в-1):
- `PINCH_ON=0.45` (захват щипка), `PINCH_HOLD=0.5` (порог смены пальца), `PINCH_OFF=0.72` (отпускание)
- `REV_NEAR=0.27`, `REV_RANGE=0.19` (формула `(0.27-hs)/0.19`)
- `ROW_HYST=0.16` (гистерезис ступени в degHyst)
- `WATCHDOG_MS=120`
- `SCHED_AHEAD=0.14`, `SCHED_TICK_MS=25`

EMA-коэффициенты (0.35/0.4/0.15) и `H*0.7` (диапазон регулировки эффекта) в этот проход **не** выносить — каждый вынесенный литерал = шанс тихой опечатки; ограничиться вашим списком.

Экспорт: всё выше. Импорт: ничего.

### src/state.js (лист)
Переезжает: `let scaleIdx=11, tonic=9; let seventh=false, leadIdx=0, chIdx=0; const fx={...}; let revDisp=0;`

**Причина сеттеров**: ES-модули дают live bindings — импортёр видит актуальное значение экспортированного `let`, но **присваивать импортированному биндингу нельзя** (TypeError). Каждый `let`, который пишется извне, получает сеттер в своём модуле:
`setScaleIdx, setTonic, setSeventh, setLeadIdx, setChIdx, setRevDisp` (новые имена — единственное изменение в местах записи: `tonic=+e.target.value` → `setTonic(+e.target.value)`).
`fx` — объект, только мутируется (`fx.dly=...`), сеттер не нужен, экспортируется как есть.

Экспорт: все переменные + сеттеры. Импорт: ничего.

### src/hooks.js (новый, лист)
`export const hooks={leadInstr:null, bpm:null, back:null, rec:null};`
Механика — §2. Импорт: ничего.

### src/scales.js
Переезжает: `NOTE_NAMES, ROMAN, OCT_ROMAN, range, SCALES, CUR, IVX, baseF, isTert, fifthStep, chordSteps, leadFreq, chordFreqs, name24, stepName, rowLabel, centsOf, qual, SEV, chordLabel, chordNotesStr`.
`clamp01` — НЕ сюда: используется только в processHands → едет в gestures.js.
Экспорт: всё перечисленное. Импорт: `state` (`scaleIdx, tonic, seventh` — live bindings, только чтение).
⚠ `CUR()/IVX()/baseF()/chordSteps()` обязаны читать live-значения при каждом вызове (планировщик подложки на это рассчитывает) — с live bindings это работает автоматически, ловушка описана в §5 шаг 5.

### src/audio.js
Переезжает: `AC, master, limiter, verb, verbOut, banks, vibGain, satWet, satDry, envGain, volGain, tremGain, tremDepth, dlyWet, revLead, chordBus, revCh, backBus, backRev, dO1, dO2, dG, noiseBuf, cv, chordHold, noteOnFlag, LEAD_INSTR, CHORD_INSTR, makeSatCurve, makeIR, mkOsc, buildLeadBanks, buildChordPool, cvRelease, cvAlloc, chordOn, chordGlide, chordOff, initAudio, setLeadInstr, applyParams, noteOn, noteOff`.
Правка внутри: `selLead.value=leadIdx` → `hooks.leadInstr && hooks.leadInstr(leadIdx)`. Также `leadIdx=...` в setLeadInstr → `setLeadIdx(...)`.
Экспорт: `initAudio, AC` (live), `setLeadInstr, applyParams, noteOn, noteOff, chordOn, chordGlide, chordOff, chordHold, LEAD_INSTR, CHORD_INSTR, backBus, backRev, dG, dO1, dO2, noiseBuf`.
Импорт: `state` (`leadIdx, setLeadIdx`), `scales` (`baseF` — для dO1/dO2 в initAudio), `hooks`.
⚠ Никакого top-level кода: `initAudio()` вызывается ТОЛЬКО из обработчика startBtn (жёсткое правило №1 CLAUDE.md).

### src/backing.js
Переезжает: `back, STYLE_BPM, STYLE_LABEL, smartStyle, droneTo, refreshStyle, nsrc, kick, snare, hat, dum, tek, bassN, pluckA, chime, bassRoot, arpTones, PAT, schedStep, schedTick, toggleBack`.
Правки внутри: в refreshStyle `bpmEl.value=back.bpm; bpmV.textContent=back.bpm;` → `hooks.bpm && hooks.bpm(back.bpm)`; в toggleBack `backBtn.textContent=...` (обе ветки) → `hooks.back && hooks.back(back.playing)`.
Экспорт: `back, toggleBack, refreshStyle, STYLE_LABEL` (нужен draw для статуса).
Импорт: `audio` (`AC, backBus, backRev, dG, dO1, dO2, noiseBuf`), `scales` (`CUR, baseF, chordSteps`), `hooks`, `config` (`SCHED_AHEAD, SCHED_TICK_MS`).

### src/recorder.js
Переезжает: `recording, recStart, events, playbackUntil, playTimers, ENG, inPB, recEv, WleadOn, WleadOff, WchOn, WchSet, WchOff, softAllOff, playRec, panic`.
Правка внутри panic: `recBtn.classList.remove('on')` → `hooks.rec && hooks.rec(false)`.
**Новые функции** (тела — дословно из нынешних обработчиков ui, т.к. они пишут `recording/recStart/events`, что через границу модуля невозможно):
- `toggleRec()` = тело recBtn.onclick (`recording=!recording; hooks.rec(recording); if(recording){recStart=...; events=[];}`)
- `stopRec()` = `recording=false; hooks.rec(false);` (первая половина playBtn.onclick)
- `clearRec()` = тело clrBtn.onclick
Экспорт: `WleadOn, WleadOff, WchOn, WchSet, WchOff, softAllOff, playRec, panic, inPB, recording` (live, для draw), `toggleRec, stopRec, clearRec`.
Импорт: `audio` (`setLeadInstr, applyParams, noteOn, noteOff, chordOn, chordGlide, chordOff, chordHold` — softAllOff обходит `Object.keys(chordHold)`), `backing` (`back, toggleBack` — для panic), `state` (`leadIdx` — ENG.leadOn сравнивает `p.inst!==leadIdx`), `hooks`.

### src/vision.js
Переезжает: CDN-импорт `HandLandmarker/FilesetResolver`, `video, canvas, ctx`, полифилл `roundRect`, `resize` + `addEventListener('resize')` + вызов `resize()`, `landmarker, initVision`.
`lastTs, latest` — НЕ сюда, они принадлежат циклу → main.js.
Экспорт: `video, canvas, ctx, landmarker` (live), `initVision`.
Импорт: только CDN.

### src/gestures.js
Переезжает: `dist, pinchRatios, minFinger, emaS, clamp01, HANDS, leadOwner, zoneAt, zoneX, degRaw, degHyst, endPinch, processHands`.
`hexA` — НЕ сюда (используется только в draw).
Экспорт: `HANDS, leadOwner` (live), `processHands, zoneAt, zoneX, degRaw` (нужны draw для призрачной подсказки).
Импорт: `config` (`FXW→zoneAt`? — zoneAt использует FXW/ZB; `FINGER_TIPS, FX_META`, пороги), `state` (`fx, setRevDisp, leadIdx, chIdx`), `scales` (`IVX, leadFreq, chordFreqs`), `recorder` (`WleadOn, WleadOff, WchOn, WchSet, WchOff`), `audio` (`chordHold` — проверка `if(!chordHold[key])`), `vision` (`canvas`).
Правка внутри: `revDisp=S.rev` → `setRevDisp(S.rev)`.

### src/draw.js
Переезжает: `hexA, drawBar, drawGrid, drawTag, draw` + локальный `const statusEl=document.getElementById('status')`.
Экспорт: `draw`.
Импорт: `vision` (`ctx, canvas, video`), `gestures` (`HANDS, leadOwner, zoneAt, zoneX, degRaw`), `scales` (`CUR, IVX, chordLabel, rowLabel, chordNotesStr, leadFreq, centsOf, OCT_ROMAN, NOTE_NAMES`? — нет, NOTE_NAMES в draw не нужен), `state` (`fx, revDisp`), `config` (`FXW, ZB, FX_META, REV_COLOR, FINGER_TIPS`), `backing` (`back, STYLE_LABEL`), `recorder` (`recording, inPB`).

### src/ui.js (модуль побочных эффектов, ничего не экспортирует кроме `$`)
Переезжает: `$`, все lookup'ы элементов (кроме statusEl→draw, startBtn→main), `buildUI` + его вызов, все onclick/onchange (`selScale, selTonic, qTriad/qSev, selLead, selChord, selStyle, bpmEl, bvolEl, backBtn, menuBtn, panelClose, scaleBtn, helpBtn/helpClose, panicBtn, recBtn, playBtn, clrBtn`).
**Регистрация hooks** (top-level):
- `hooks.leadInstr = v => selLead.value = v;`
- `hooks.bpm = v => { bpmEl.value = v; bpmV.textContent = v; };`
- `hooks.back = p => backBtn.textContent = p ? '❚❚ фон' : '▶ фон';`
- `hooks.rec = on => recBtn.classList.toggle('on', on);`
Правки в обработчиках: присваивания `scaleIdx/tonic/seventh/chIdx` → сеттеры state; `recBtn.onclick=toggleRec`; `playBtn.onclick=()=>{stopRec();playRec();}`; `clrBtn.onclick=clearRec`; `bvolEl.oninput` остаётся как есть — импортирует `AC, backBus` из audio (направление ui→audio законно).
Импорт: `state` (сеттеры + значения для начальных `selScale.value=scaleIdx` и т.п.), `scales` (`SCALES, NOTE_NAMES`), `audio` (`setLeadInstr, AC, backBus, LEAD_INSTR, CHORD_INSTR`), `backing` (`back, toggleBack, refreshStyle`), `recorder` (`softAllOff, playRec, panic, toggleRec, stopRec, clearRec`), `hooks`.

### src/main.js (composition root)
Переезжает: `lastTs, latest`, `loop()`, обработчик `startBtn` (lookup `$('startBtn')` и `$('loadmsg')` — импортирует `$` из ui или делает getElementById; рекомендую импорт `$`).
Импорт: `'./ui.js'` (side-effect), `vision` (`initVision, video, landmarker`), `audio` (`initAudio, AC`), `backing` (`refreshStyle`), `gestures` (`processHands`), `draw` (`draw`).

**Проверка графа на циклы**: config, state, hooks — листья; scales→state; audio→{state, scales, hooks}; backing→{config, audio, scales, hooks}; recorder→{state, audio, backing, hooks}; vision→CDN; gestures→{config, state, scales, audio, recorder, vision}; draw→{config, state, vision, gestures, scales, backing, recorder}; ui→{state, scales, audio, backing, recorder, hooks}; main→все. Обратных рёбер нет — граф ацикличен.

---

## 2. Разрезание циклов audio↔UI

**Механизм: объект `hooks`** (src/hooks.js) — nullable-колбэки, которые ui.js заполняет на этапе загрузки модулей. Нижние слои вызывают `hooks.x && hooks.x(v)` вместо записи в DOM. Инверсия зависимости: audio/backing/recorder импортируют лист `hooks.js`, ui.js импортирует его же и регистрирует реализации. Цикла нет.

Почему не CustomEvent на window: hooks греппаются (`hooks.bpm` находится поиском), типизированы по месту, нет строковых имён событий. Почему не колбэк-параметры функций: `setLeadInstr` вызывается из трёх мест (ui, ENG.leadOn при воспроизведении, initAudio-косвенно) — прокидывать колбэк через все пути хуже.

**Ключевое требование пользователя выполнено автоматически**: `ENG.leadOn` (playback) → `setLeadInstr` → `hooks.leadInstr` — dropdown обновляется из любого пути вызова, т.к. хук зашит в саму setLeadInstr, а не в обработчик.

Порядок безопасен: ui.js регистрирует хуки при evaluation (до клика по startBtn), а первый вызов любого хука — не раньше `refreshStyle(true)` внутри обработчика startBtn. Гвард `&&` защищает от гипотетического вызова до регистрации (поведение = сегодняшнему «ничего не обновилось» невозможно, но тишина лучше TypeError).

**Полный список переплетений слоёв** (вы просили найти всё; ваши два — пункты 1–2):
1. `setLeadInstr` → `selLead.value` (audio→DOM) — hooks.leadInstr.
2. `refreshStyle` → `bpmEl.value, bpmV.textContent` (backing→DOM) — hooks.bpm.
3. `toggleBack` → `backBtn.textContent` (backing→DOM, две ветки) — hooks.back. Важно: toggleBack зовётся и из `panic()`, поэтому кнопка обязана обновляться не только из ui.
4. `panic` → `recBtn.classList.remove('on')` (recorder→DOM) — hooks.rec.
5. `recBtn/playBtn/clrBtn.onclick` пишут `recording, recStart, events, playTimers, playbackUntil` (ui→внутренности recorder) — решается новыми `toggleRec/stopRec/clearRec` в recorder.js (тела дословные).
6. `bvolEl.oninput` → `backBus.gain` напрямую (ui→аудио-узел). Направление ui→audio законно, цикла нет — оставить, импортировав `AC, backBus` из audio.js.
7. `softAllOff` (recorder) обходит `Object.keys(chordHold)` (внутреннее состояние audio) — экспортировать `chordHold` из audio.js, оставить как есть.
8. `processHands` читает `chordHold[key]` (gestures→audio) — тот же экспорт.
9. `ENG.leadOn` читает `leadIdx` (recorder→state) — live-import.
10. `draw()` пишет `statusEl.textContent` (draw→DOM) — принято осознанно (§0.5).
11. `draw()` читает `recording, inPB, back, STYLE_LABEL` (draw→recorder/backing) — законное направление, live-import.
12. `initAudio` читает `baseF()` для dO1/dO2 (audio→scales) — законно, односторонне.

---

## 3. Общее состояние: где живёт, кто пишет, кто читает

| Переменная | Живёт | Пишет | Читает | Механизм |
|---|---|---|---|---|
| `scaleIdx` | state.js | ui (selScale) → `setScaleIdx` | scales (CUR), ui | live binding |
| `tonic` | state.js | ui → `setTonic` | scales (baseF, stepName, chordLabel) | live binding |
| `seventh` | state.js | ui (qTriad/qSev) → `setSeventh` | scales (chordSteps, chordLabel) | live binding |
| `leadIdx` | state.js | audio (setLeadInstr) → `setLeadIdx` | audio, gestures (payload inst), recorder (ENG.leadOn) | live binding |
| `chIdx` | state.js | ui → `setChIdx` | gestures (WchOn) | live binding |
| `fx` | state.js | gestures (мутация полей) | gestures, draw | общий объект, сеттер не нужен |
| `revDisp` | state.js | gestures → `setRevDisp` | draw | live binding |
| `HANDS` | **gestures.js** | gestures (мутация+delete) | draw | общий объект |
| `leadOwner` | **gestures.js** | только gestures | draw | live binding, сеттер не нужен |
| `back` | **backing.js** | backing + ui (`back.styleSel`, `back.bpm` — мутация полей) | backing, draw | общий объект |
| `events, recording, recStart, playTimers, playbackUntil` | **recorder.js** | только recorder (после переноса тел обработчиков в toggleRec/stopRec/clearRec) | recorder, draw (`recording`, `inPB`) | live binding |
| `AC` и аудио-узлы | audio.js | audio (initAudio) | backing, recorder, ui (bvol) | live binding `AC`, экспорт узлов |
| `landmarker` | vision.js | vision (initVision) | main (loop) | live binding |
| `lastTs, latest` | main.js | main | main | локальные |

**Критично не сломать**: планировщик подложки (`schedStep/arpTones/droneTo/chime`) каждый шаг вызывает `baseF()`, `CUR()`, `chordSteps()` — функции, читающие live bindings `scaleIdx/tonic/seventh`. Смена лада/тоники на лету перестраивает паттерн без остановки. Это работает только если ни одна из этих функций не «замораживает» значение при импорте — с ES-модулями это гарантировано, ЕСЛИ никто не сделает локальную теневую копию (`const s=scaleIdx` на top-level модуля — запрещено).

---

## 4. Порядок инициализации

Сегодня: единый скоуп, объявления function-хойстятся, `buildUI()` и обработчики выполняются в конце файла; `setLeadInstr` ссылается на `selLead`, объявленный ниже точки определения, но выше точки первого вызова — работает только благодаря общему скоупу и тому, что вызов происходит после полного выполнения скрипта.

После разбиения: `<script type="module" src="src/main.js">` — module-скрипты deferred, DOM полностью распарсен до выполнения любого модуля → все `getElementById` на top-level модулей безопасны.

Порядок evaluation — post-order DFS по графу импортов от main.js: листья (config, state, hooks) выполняются первыми, затем scales → audio → backing → recorder, vision → gestures → draw → ui → main. Точный порядок между ветками зависит от порядка import-строк в main.js, но корректность от него не зависит, потому что:
- top-level побочные эффекты есть только в vision.js (lookup video/canvas, ctx, полифилл roundRect, resize+listener), ui.js (lookup элементов, buildUI(), навешивание обработчиков, регистрация hooks), draw.js (lookup statusEl);
- ни один модуль на top-level не вызывает функций чужих модулей (кроме `buildUI()` в ui.js, который трогает только DOM и свои импорты-константы);
- проблема «selLead ниже setLeadInstr» исчезает: setLeadInstr больше не знает про selLead (hooks), а hooks регистрируются при загрузке ui.js — задолго до первого клика.

Две особенности, которые надо знать:
1. **CDN-импорт MediaPipe в vision.js блокирует выполнение ВСЕГО графа**: статические импорты резолвятся до evaluation первого модуля. Это идентично текущему поведению (тот же import стоит первой строкой единственного скрипта): кнопка «Запустить» мертва, пока jsdelivr не отдаст модуль. Не чинить, просто знать.
2. `initAudio()` и `initVision()` вызываются только из обработчика startBtn в main.js — как сейчас. Ни один модуль не должен трогать `AC` на top-level (он `null` до клика).

---

## 5. Порядок работ (один шаг = один файл = проверка в браузере)

Базовая проверка после КАЖДОГО шага (из CLAUDE.md): Live Server → старт → щипок в СОЛО звучит · щипок в АККОРДАХ звучит · эффекты тянутся · «▶ фон» играет · переключить лад на «31-TET» и «Макам Раст».

**Шаг 1. style.css.** Вынести `<style>` в файл, `<link>`.
Тихо сломаться может: практически ничего логического; редкий случай — потеря правила при копировании (например `#bar.on{display:flex}` → верхняя панель никогда не появится, но это заметно). Проверка чисто визуальная: стартовый экран, панель настроек, скролл учебника.

**Шаг 2. Весь скрипт → src/main.js как есть** (одним блоком, без разрезания). `<script type="module" src="src/main.js">`.
Цель — отдельно проверить, что раздача модульных файлов работает (пути, MIME, Live Server), до любого перемещения кода.
Тихо: ничего — код байт-в-байт тот же. Единственный риск — опечатка в пути (но это громко: пустая страница).

**Шаг 3. src/config.js.** Константы + именование магических чисел, main.js импортирует.
Тихо: **опечатка в значении константы** — консоль молчит, меняется «ощущение»: щипок срабатывает раньше/позже (0.45/0.72), палец «дребезжит» на границе ступени (0.16), нота повисает дольше при потере руки (120), реверб выкручивается на другой дистанции (0.27/0.19), подложка микро-заикается (0.14/25). Проверка: щипок вблизи и вдали от камеры; медленное глиссандо через границу ступени в 31-TET (не должно трелить); убрать руку из кадра во время ноты (release ≤ ~0.1–0.2 с); фон без заиканий 30 с.

**Шаг 4. src/state.js** + сеттеры, замена присваиваний в оставшемся блобе.
Тихо: **теневая копия** — если где-то останется локальный `let tonic` рядом с импортом, UI будет менять локальную, а звук читать модульную: селект переключается, звук в старой тональности, консоль молчит. (Прямое присваивание импорту — громкий TypeError, его не пропустишь; тень — тихая.) Проверка: сменить тонику → дрон и ноты сдвинулись; сменить лад → сетка и звук совпадают; потянуть эффект → звук реально меняется (fx — общий объект, не копия).

**Шаг 5. src/scales.js.**
Тихо: **заморозка live-значений** — если `seventh`/`scaleIdx` окажутся скопированы в локальную константу, переключатель «Септаккорды» перестанет влиять на звук и подписи (без ошибок), или смена лада перестанет перестраивать аккорды подложки. Проверка: тумблер Трезвучия↔Септаккорды меняет подписи лестницы (C→Cmaj7) и звучание зажатого аккорда при перещипе; при играющем фоне сменить лад — арпеджио перестраивается на лету.

**Шаг 6. src/hooks.js + разрезание четырёх DOM-записей (ещё внутри main.js-блоба).** Заменить `selLead.value=...`, `bpmEl.value/bpmV.textContent`, `backBtn.textContent` (2 ветки), `recBtn.classList.remove` на вызовы hooks; регистрация хуков рядом с обработчиками. Отдельный шаг ДО выноса audio.js: развязка проверяется изолированно от перемещения кода.
Тихо: **незарегистрированный/опечатанный хук** — `hooks.leadInstr&&...` молча не сделает ничего: дропдаун перестанет следовать за инструментом при воспроизведении записи; BPM-слайдер перестанет прыгать при смене стиля; кнопка фона перестанет менять ▶/❚❚ при panic. Проверка (все четыре пути!): записать фразу со сменой инструмента через меню → воспроизвести → дропдаун прыгает; сменить лад пентатоника→мажор при авто-стиле → BPM в меню обновился; включить фон → нажать ■ panic → кнопка вернулась к «▶ фон», запись-индикатор погас.

**Шаг 7. src/audio.js.**
Тихо: (а) случайный top-level вызов `initAudio()` → AudioContext создан вне жеста → контекст suspended, приложение выглядит живым, но молчит (иногда без единой ошибки); (б) потерянная строка `connect` при переносе — узел выпал из графа: чуть другой микс (пропал send реверба аккордов, или satDry), «что-то не так со звуком», консоль чиста; (в) перепутан порядок создания узлов — обычно безвредно, но связи `vibGain.connect(o.detune)` внутри mkOsc зависят от того, что vibGain уже создан: mkOsc вызывается только из buildLeadBanks после создания vibGain — сохранить порядок initAudio дословно. Проверка: все 6 соло-тембров звучат и различаются; вибрато/драйв/тремоло/делей влияют; Z-реверб только на соло (аккорды сухие при выкрученном REV); два одновременных аккорда двумя руками; громкий стек не клиппирует (лимитер жив).

**Шаг 8. src/backing.js.**
Тихо: (а) если импортированы значения `backBus` и т.п. ДО initAudio — они `undefined` навсегда? Нет: live bindings, после initAudio импортёры видят узлы — но только если это `import {backBus}`, а не скопировано в локальную переменную на top-level; тихий симптом — фон молчит или играет мимо мастера; (б) заморозка baseF/CUR (см. шаг 5) — дрон перестаёт следовать за тоникой: проверяется сменой тоники при играющем ethnic/ambient; (в) `back.timer` — если back окажется скопирован, повторное нажатие «фон» не остановит старый interval → два планировщика, ускоряющийся/двоящийся бит. Проверка: старт/стоп фона несколько раз подряд (нет наложения ритма); каждый из 4 стилей вручную; авто-переключение стиля при смене лада; смена тоники ретюнит дрон.

**Шаг 9. src/recorder.js** (+ toggleRec/stopRec/clearRec, перевод обработчиков в блобе на них).
Тихо: (а) теневая `recording` в блобе → кнопка ● горит, а recEv видит false: запись «делается», но воспроизводить нечего — молча; (б) `events=[]` где-то напрямую по импорту → громкий TypeError, а вот тень → старая запись воспроизводится после «очистки»; (в) ENG-диспатч: если при переносе W*-обёрток перепутать ENG и W (вызвать W из плейбека) — плейбек начнёт перезаписывать сам себя при включённой записи (дубли событий, каша при повторном воспроизведении), консоль молчит. Проверка: записать фразу (соло+аккорд) → ▶ воспроизвести дважды (идентично) → ✕ очистить → ▶ (тишина) → записать заново при играющем воспроизведении старой (не должно попасть в новую запись — но её уже нет; вместо этого: включить запись, воспроизвести — по коду inPB() блокирует запись плейбека).

**Шаг 10. src/vision.js.**
Тихо: (а) двойной `addEventListener('resize')` (остался в блобе и появился в модуле) — безвредно, но `resize()` дважды; хуже — НИ одного: после поворота телефона canvas остаётся старого размера, руки «мимо» зон; (б) полифилл roundRect не перенесён — на старых браузерах TypeError (громко), на новых незаметно. Проверка: ресайз окна/поворот — сетка перестраивается; руки трекаются.

**Шаг 11. src/gestures.js.**
Тихо: (а) теневые HANDS/leadOwner → draw рисует по одному объекту, звук идёт по другому: ноты играют, но подсветка/ярлыки мертвы, ИЛИ watchdog чистит не тот объект → повисшая нота при уходе руки из кадра; (б) `setRevDisp` забыт → REV-бар навсегда 0, звук реверба при этом работает; (в) пороги из config: перепроверить, что 0.45/0.5/0.72 подставлены в правильные места (пара перепутанных порогов — щипок «залипает»). Проверка: две руки одновременно (аккорд+соло); смена пальца в щипке меняет октаву без разрыва; убрать руку в щипке → релиз; REV-бар дышит с глубиной руки; подсветка активной строки следует за рукой.

**Шаг 12. src/draw.js.**
Тихо: (а) чтение `recording/back` из «не тех» биндингов → статусная строка не показывает «● запись»/«▶ Lo-Fi …» (звук работает); (б) призрачная подсказка использует degRaw/zoneAt из gestures — если продублировать вместо импорта, при будущей правке разъедутся. Проверка: статус-строка отражает запись/фон/воспроизведение; ярлыки ноты (Гц, %, центы в микротонике) и аккорда (имя, состав); подсказка без щипка в обеих зонах.

**Шаг 13. src/ui.js** — остаток блоба минус startBtn/loop; main.js становится финальным (loop, lastTs/latest, обработчик startBtn, импорт './ui.js').
Тихо: (а) `buildUI()` выполнился дважды (вызов остался и в блобе, и в ui.js) → задвоенные пункты в селектах — легко проглядеть; (б) забытый импорт `'./ui.js'` в main.js → ui.js вообще не выполнится: кнопки меню мертвы, hooks не зарегистрированы (звук при этом работает!); (в) порядок: регистрация hooks должна быть в ui.js top-level, не внутри buildUI-условий. Проверка: каждый контрол меню end-to-end (лад, тоника, септаккорды, оба тембра, стиль, BPM, громкость фона); все кнопки бара; полный чек-лист CLAUDE.md.

**Шаг 14. CLAUDE.md** — обновить: структура src/, правило hooks (аудио-слои зовут hooks, реализации только в ui.js), правило live bindings (писать чужой let только через сеттер владельца, никаких теневых копий), снять пункт «всё в одном файле» и пометку о долге DOM-записей (долг закрыт), обновить «где добавлять лад/тембр» на новые файлы.

---

## Замеченные баги (НЕ чинить в этом рефакторинге — отдельный список по вашему требованию)

1. `revDisp` не сбрасывается при отпускании соло-щипка — REV-бар замирает на последнем значении.
2. `clrBtn` не выключает `recording` и не сбрасывает `recStart` — если очистить во время записи, следующие события пишутся со старым отсчётом времени → воспроизведение начнётся с длинной паузы.
3. Идентификация рук: при двух руках одной handedness ключ `key+=i` зависит от порядка в массиве результатов и может меняться между кадрами → редкая повисшая нота до срабатывания watchdog.
4. Запись пишет `leadOn` покадрово (~60/с) — тысячи setTimeout при воспроизведении (уже отражено в CLAUDE.md как «correction»).
5. `refreshStyle(back.styleSel!=='auto')` при ручном выборе стиля затирает пользовательский BPM его дефолтом — возможно задумано, но выглядит спорно.
