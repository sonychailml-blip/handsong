## §1 Фундамент (moved at RUN 5, 2026-10-17 — the Russian text as it stood; BACKLOG.md §1 is its English rewrite)

## 1. Фундамент

_(Заголовок раньше читался «сразу после шага 14, до фич» — рефакторинг давно закончен, а фичи давно
идут. Здесь лежит то, что ПОДПИРАЕТ другие работы: хранилище настроек, идентификатор лада, офлайн.)_

### ⬜ localStorage для настроек
> **Механизм УЖЕ есть и работает:** `i18n.store` — обёртка над localStorage с try/catch и падением в
> ПАМЯТЬ (приватный режим и `file://` не должны ронять старт). Через неё уже персистятся **язык**
> (`handsong.lang`) и **прогресс уроков** (`handsong.lesson.<id>`). Настройки ниже — просто ещё ключи
> в том же хранилище; писать новую обвязку не нужно.

Сейчас каждый запуск — минорная пентатоника от A, и все накопившиеся настройки СБРАСЫВАЮТСЯ.
Сохранять: `scaleIdx`, `tonic`, `seventh`, `leadIdx`/`chIdx`/`bassIdx`/`drumKitIdx`, `loop.bpm`.
**Добавились сессионные настройки, которые тоже стоит персистить:** `aRef` (эталон A4 — сейчас сброс на
440), `handFn` (функции рук соло/бас), `loop.metre` (размер такта). Хорошо ложится к публикации (§3.25/
HANDOFF): человек вернётся к своему строю/эталону/раскладке рук.

### 🔵 СТАБИЛЬНЫЙ ИДЕНТИФИКАТОР ЛАДА — ПРЕДПОСЫЛКА, блокирует две фичи

⛳ **НАЧАТО (слайс T0 универсальной модели строя, HANDOFF «ПЛАН „УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ“»):** у каждого из 75 ладов теперь есть
стабильный строковый `id` (`'major'`, `'raga-yaman'`, `'pelog-barang'`…) и `tuning` — id его СТРОЯ в `scales.TUNINGS` (18 строёв со своими
id: `edo12`, `shruti22`, `pelog`, `partch43`, `ji12`…). Пока их читает только проба `src/scaleprobe.js`; события по-прежнему морозят ссылку
(правило #7), id понадобятся на границе сериализации. Абзац «Факт» ниже — состояние ДО T0.

**Факт (проверено по коду).** У ладов **НЕТ идентификатора вообще**: в `SCALES` 75 записей, ни у одной
нет поля `id`. Лад адресуется ПОЗИЦИЕЙ в массиве (`scaleIdx`) — отсюда и правило «дописывать только
в конец». А записанное событие лупера морозит **`sc:CUR()`, то есть ССЫЛКУ НА САМ ОБЪЕКТ лада**
(`recorder.push`), а не индекс и не имя.

**Что из этого следует — ровно две вещи, и обе важны:**
- **В ПАМЯТИ всё хорошо.** Слой держит объект, поэтому переигровка переживёт и перестановку массива,
  и переименование лада, и локализацию имён. Полимодальность (hard rule 7) на этом и стоит.
- **НА ДИСКЕ ничего не работает.** Ссылку на объект нельзя сериализовать. Значит **сохранить петлю
  невозможно** — не «трудно», а не на что записать, каким ладом играл слой.

⚠️ **ЭТО БЛОКИРУЕТ ДВЕ ФИЧИ, и ни за одну нельзя браться раньше:**
1. **Сохранение петель** (в localStorage, в файл, в ссылку — любое). Без id слой не восстановить.
2. **§3.34 Конструктор собственного строя.** Пользовательский лад по определению не может жить по
   индексу в append-only массиве: его создают, редактируют и УДАЛЯЮТ. Что происходит со слоем, который
   прямо сейчас играет удалённый строй? Пока нет id — ответа нет.

**Что делать (эскиз, не спецификация).** Дать каждому ладу стабильный строковый `id` (встроенным —
осмысленный постоянный ключ, пользовательским — сгенерированный и неизменяемый), адресовать лад по нему
всюду, где адрес переживает сессию, и оставить `scaleIdx` тем, чем он и является — позицией в текущем
списке для меню и состояния. `sc:CUR()` в событии при этом можно НЕ трогать: в памяти он и так верен;
id нужен на границе сериализации. Отдельно решить судьбу слоя, чей строй удалили (запретить удаление
используемого / подставить копию строя в петлю / отвязать слой).

⛳ **ДОБАВЛЕНО (дуга «СТРОЙ ОТ», P0/P1): лад в сохранённом файле пишется ПАРОЙ (id лада, строй от).** С P3 событие хранит
ВАРИАНТ лада на свой якорь (`scales.scaleView`: «следует за тоникой» или нота 0..11) — идентичность записанного лада
становится этой парой, и сериализация обязана записать обе половины. Update (TF1/TF2, 2026-10-14): the key is now frozen in each
event's view (`v.key`, any integer after a Transpose; `scales.viewKeyIdOf` = view id + `~key`) — a song file must store it with the view.

⛳ **ДОБАВЛЕНО (при T5): ПЕСНИ — ФАЙЛАМИ (направление пользователя).** Песня — данные, а не код: экспорт в файл и загрузка из файла,
чтобы делать музыку, делиться ею, скачивать и загружать; демо-пьесы — обычные файлы рядом с приложением, о которых его код не знает.
Нужно: (1) **стабильные id ТЕМБРОВ** (сегодня `a.inst`/`a.kit` — индексы списков; новый тембр сдвинул бы инструменты каждой сохранённой
песни — HANDOFF «ХРАНЕНИЕ ТЕМБРОВ»); (2) **ТОНИКА В ПЕСНЕ**, а не живая для всего приложения (сходится с заморозкой тоники);
(3) **ВЕРСИОНИРОВАННЫЙ ФОРМАТ**: дорожки, события с (id вида строя — `scales.viewIdOf`, индекс в строе, регистр — ступени в событии нет
с T4c-2), цепи, автоматизация, темп и размер. Нынешняя демо-пьеса `src/songs.js` — код, пишущий через воронки рекордера; когда формат
появится, она станет ПЕРВЫМ ФАЙЛОМ ПЕСНИ. Порядок прежний: сперва дуга редактора (T5 ✅, U5, T7, S4–S7, необходимое и своё редактора).

⛳ **ДОБАВЛЕНО (при T7): СТРОИ И ЛАДЫ — ФАЙЛАМИ (направление пользователя).** Каждый строй и лад — отдельный файл данных, поставляемый с
приложением; конструктор ладов добавляет и удаляет любой. Нужно: перенести в данные всё, что ещё в коде (имена ступеней, палитры аккордов,
традиции и место в меню, флаги поведения); загрузчик при старте, который читает и проверяет файлы; адресация каждого лада по стабильному id,
никогда по позиции (демо, уроки, живой индекс лада); песня хранит КОПИЮ каждого строя, которым пользуется, — удаление строя песню не ломает;
проверка файлов от других людей; четыре пункта готовности к Scala (§3.34). Плюс свойство «как строятся аккорды» — АДАПТИВНО (чистые
отношения, как хор) или ИЗ СТРОЯ (как инструмент): встроенные — по теории, строй пользователя выбирает (в коде с T7 — `chordBuild`). План — в
порядке работ сразу после T7 (HANDOFF); пользователь решает, до или после правки соло.

⛳ **ДОБАВЛЕНО (при F0): ПЛАН «СТРОИ И ЛАДЫ ФАЙЛАМИ» F0–F8 и формат файла v1 — HANDOFF (Часть I кратко, Часть II «F0» полностью).** Порядок
(решение пользователя): переезд — ДО правки соло. ✅ F0 — канонический снимок `tools/scales.before.json` (`P.dumpScales`/`P.checkFiles`).

⚠️ Это ФУНДАМЕНТ, а не фича: он ничего не добавляет пользователю сам по себе, но без него две фичи выше
делать нельзя. Оценивать и планировать его отдельно от них.

⛳ **С ДУГОЙ «РЕДАКТОР ДОРОЖЕК» ПУНКТ ПЕРЕСТАЛ БЫТЬ «КОГДА-НИБУДЬ».** Пока записью была петля на пару тактов,
невозможность её сохранить была пожатием плеч. Теперь запись — ЛИНЕЙНАЯ многодорожечная песня: минуты
материала, несколько дорожек, слитые взятые, а дальше — правка в пиано-ролле, где человек вложит ещё больше
труда. Такую вещь нельзя потерять вместе со вкладкой. Поэтому идентификатор лада — **ПРЕДПОСЫЛКА ТОГО, ЧТОБЫ ДУГУ
СТОИЛО ДОВОДИТЬ**, и его место в плане — не позже, чем сохранение станет следующим естественным вопросом
(самое позднее — до заморозки и экспорта: и то и другое бессмысленно для песни, которая не переживает
перезагрузку). Сверено: у 75 записей `SCALES` поля `id` по-прежнему нет, событие по-прежнему несёт `sc:CUR()`.

### ⬜ AF6 — the rest after AF6b (16-bit frozen data in memory is done) — rewritten in English at AF3
1. **On the device, across reloads** (decision 3(c), AFTER saving exists): Int16 chunks (`FRZ_CHUNK`, 2^15 frames) as files — in the
   PROJECT FOLDER (WAV, usable in other programs), else browser storage as a CACHE (losing it loses no work: it is recomputed from notes).
   Cache key = freeze signature (`freezeSig`) + track id; a stale cache entry is discarded.
2. **Chunk paging** (streaming): the audio-thread store keeps only chunks near the playhead (and around the brace), the rest loaded ahead;
   `frz-reader` already reads by chunks — needs a "need chunk k" protocol and look-ahead (by `SCHED_AHEAD` and the bar).
3. **Opus as an optional low-memory mode** for weak phones — by choice only, never default (WebCodecs; encoder delay → overlapping chunks
   or one stream; never MP3: encoder padding breaks joins).
4. **"Notes and tail only"** (decision 3(a)): ≈ 3 of ≈ 49 MB on the seed, ≈ 14 % on the demo — together with (1)/(2), as storage segments.
5. **Memory budget** — ✅ a guard exists since AF3 (`AF_BUDGET_MB`: 300 MB touch / 1 GB desktop; over it a track stays live, skipped, no
   eviction). AF6 may replace "skip" with "the farthest inaudible tracks stay events".
6. Without the frozen-track worklet — Float32 as before (named in `CLAUDE.md`); pack that path too if it turns out common.
7. **Offline contexts pinned by Chrome** (found AF3 part 0b; RENDER-LEAK): a context that called `audioWorklet.addModule` is never
   collected — ≈ 6 MB per render of a small track. ✅ Fixed for every track WITHOUT a KS timbre (the worklet is no longer loaded there;
   30 renders +1.2 MB, control +137.8 MB; renders got faster). ⬜ KS (plucked solo) tracks still pin ≈ 6 MB per render: tried and failed — a
   hosting iframe (removed, navigated), building everything inside it, dismantling the graph. Options: a JS (non-worklet) KS for renders
   only if it can be made sample-identical; or a render worker process if the platform ever offers one. Measure on a phone.
8. ⬜ **Per-track effect chains** (AF5 follow-up): today unfrozen tracks of one role share the role's TRACK chain (last writer wins among
   them; the live chain is separate since AF5). Per-track chains would isolate tracks from each other; cost ≈ one chain (a reverb ≈ 49 nodes)
   per unfrozen track that uses one.

### ⬜ Подмена буфером (AF2) — остаток: хвосты ударов и живой сети роли на перекрёсте (записано при AF2; не срочно)
При подмене без паузы (перекрёст 20 мс на такте) голоса аккордов, баса и соло дорожки срезаются точно, но (1) удары, уже поставленные до
подмены, — одноразовые узлы без реестра, их хвосты доигрывают поверх тех же хвостов в буфере; (2) живой реверб/делей роли несёт хвост
срезанных голосов (≤ RT60) поверх хвоста буфера. Лечение (1): реестр ударов по владельцу 'hit:N' (узел гейна удара, как tg у голосов) и
срез его тем же voicesCut. Лечение (2) — своя цепь на дорожку (её дала бы автозаморозка, когда сеть роли несёт только живое). Пока —
выбор паузы делает оба случая редкими.

### ⛳ СОХРАНЕНИЕ — решение пользователя (записано при AF1; этап 3 порядка работ, вместе с форматом песни)
Песня — работа человека, мала (сотни КБ) и защищается; замороженный звук — пересчитываемый кэш. Два видимых состояния «Черновик» / «Проект —
сохранён в …»; проект — папка на диске (File System Access API, WAV замороженных дорожек), файл проекта вручную, позже аккаунт (только
песни). Автосохранение + версии, запись-затем-замена, одна редактирующая вкладка, экспорт/импорт одним файлом, `storage.persist()`,
предупреждения (приватное окно, Safari вне главного экрана — 7 дней, давно нет копии) и понятные ошибки диска. Полностью — §3.35, врезка
«РЕШЕНИЕ ПОЛЬЗОВАТЕЛЯ О СОХРАНЕНИИ».

### ⬜ ЗАПИСЬ ЗВУКОМ («аудиодубль») — за автозаморозкой, рядом с микшером

Второй способ записи: дорожка снимается ЗВУКОМ во время игры, а не событиями; её ноты не правятся (обрезка, перенос и уровень — может
  быть, позже). Переиспользует машинерию воспроизведения замороженной дорожки: дорожка, чьё содержимое — буфер. Выигрыш: ровно то, что
  было слышно, рука выразительности тоже; никаких различий повторного исполнения; путь к записи с микрофона потом. **Настоящее
  препятствие:** сеть эффектов одна на роль — снятие шины роли поймало бы и НЕзамороженные дорожки этой роли, играющие из событий, поэтому
  возможность естественно идёт ЗА АВТОМАТИЧЕСКОЙ ЗАМОРОЗКОЙ, после которой эта сеть несёт только живую игру. Место в порядке работ — рядом
  с автозаморозкой и микшером.
Подробно — HANDOFF, часть I. Зависит от: автоматической заморозки (сеть эффектов роли без воспроизводимых дорожек), воспроизведения
замороженной дорожки (буфер на дорожке — уже есть, F4).

### ⬜ ГОТОВНОСТЬ К SCALA (.scl/.kbm) — до конструктора ладов, рядом со стабильными id строёв пользователя

Ядро модели уже совпадает со Scala: `.scl` перечисляет высоты центами или отношениями и кончается периодом; `.kbm`
  хранит опорную ноту и её частоту; наши строй (`TUNINGS`), якорь (вид, «строй от», A4) и выборка лада (`sel`/`root`) ложатся на них.
  Для чистого обмена туда и обратно не хватает четырёх вещей:
  (а) **ТОЧНЫЕ ОТНОШЕНИЯ** — данными рядом с центами у чистых строёв (Партч, чистый строй `ji12`, пифагоров), чтобы экспорт писал `7/4`, а
      не округлённые центы. Цена по-прежнему читает центы — слышимо ничего не меняется;
  (б) **ИМЕНА СТУПЕНЕЙ** — необязательными данными строя вместо путей кода на каждый строй (`stepName`, `swaraOfCents`, «(4)» у Пелога), чтобы
      импортированный или пользовательский строй нёс свои имена;
  (в) **ПРАВИЛА НОРМАЛИЗАЦИИ ИМПОРТА**: высоты не по порядку, повторы, значения за периодом, подразумеваемое 1/1, которого `.scl` не пишет;
  (г) **ПРОБА ТУДА-ОБРАТНО**: каждый встроенный строй экспортировать в `.scl/.kbm`, импортировать назад, сравнить высоты. Равный строй,
      выгруженный списком центов, при импорте обязан УЗНАВАТЬСЯ и возвращаться в форму генератора (`{period, equal}`) — иначе частоты
      поплывут в последнем бите (форма генератора — то, на чём держится побитная верность `pitchHz`).
Подробно — HANDOFF, часть I, рядом с планом T6. Зависит от: стабильных id строёв пользователя (§1 выше) и формата файла песни.

### ⬜ Service Worker: кэш модели
> **SW УЖЕ зарегистрирован — и НАМЕРЕННО пустой** (`sw.js`, пустой `fetch`-обработчик). Его единственная
> задача — устанавливаемость: без зарегистрированного SW с fetch-обработчиком Chromium не присылает
> `beforeinstallprompt`, и кнопка установки не появляется вовсе (см. «Публикация» в CLAUDE.md). Кэша нет
> СОЗНАТЕЛЬНО: ничто не может застрять устаревшим, камера/звук/ворклет и относительные пути под подпапкой
> GitHub Pages работают ровно как без SW. **Этот пункт = добавить кэш В НЕГО**, а не заводить новый SW.

Модель + WASM качаются с CDN при каждом запуске. Плохой интернет = приложение не стартует.
Даёт офлайн и быстрый старт. ⚠️ Взвесить цену: кэш модели — это ещё и риск застрявшей версии, ради которого
кэш и не заводили сразу.



## NIGHT-15a audit (2026-11-15): closed and outdated backlog items, word for word, with the evidence
Each item checked against the code of 2026-11-15 (tree hashes core f35f07b9825d7997, apps/night 1e02ac1d7c2e070f). Verdicts: FIXED (the run that fixed it), OUTDATED (no longer relevant, why), MERGED (into which open item).

### From docs/night/BACKLOG.md «Open now»
- FIXED at NIGHT-2 stage 2 (as the item says; `tools/ui-snap.mjs` MSG_KNOWN is empty):
- ✅ **Landscape: the low-light hint overlapped the control panel** (its OK sat over the «Звук» label). Fixed at NIGHT-2 stage 2: in landscape it sits in the free area left of the capsule; the known line in `MSG_KNOWN` is gone.
- FIXED at NIGHT-2 stage 3 (four round buttons + settings; no change since):
- ✅ **Main screen: at most 6 icons** (user, 2026-11-02): four round buttons + settings since NIGHT-2 stage 3; the view switch, the Forest slider and «Play with» are in settings.
- FIXED at NIGHT-2 stage 3 (answered, built):
- ✅ **Question for the user (NIGHT-2 stage 2):** a «Play with» tap after calibrating changed the hands for this session only. Answered (2026-11-03): «Play with» moves into settings and is saved; the last choice wins. Built at stage 3.
- FIXED at CORE-22 (`core/vendor/mediapipe/0.10.35/` exists, CSP 'self'):
- ✅ **P9 first — the hand model on our own origin, cached** — built at CORE-22 (2026-11-13): the four files (+ the no-SIMD pair) under `core/vendor/mediapipe/0.10.35/`, both apps opt in, the CSP of both pages `'self'` only, a year-long immutable cache header (`vercel.json`); waits for step 157. (NIGHT-12 finding): every visit downloads the hand model again, about 7.6 MB (Google's storage response is not reused from the browser's cache; the WebAssembly and library are), so a second visit is not much cheaper than the first on a slow link. Hosting the four MediaPipe files ourselves with long-lived caching (and later a precache, C9 below) is the biggest remaining start win.
- FIXED at CORE-22 + NIGHT-14 (its last part, storage.persist, moved to an open item of its own, then NIGHT-15):
- ✅ **C9 offline** — built at CORE-22 + NIGHT-14 (2026-11-13), waits for step 157: vendored MediaPipe, CSP `'self'`, Night's precache with a versioned list written by `tools/build.mjs`, the quiet «A new version is ready» line. Left: `storage.persist` (not asked: the cache simply falls back to the network if the browser evicts it). The original item: vendored MediaPipe + model, CSP to `'self'`, SW precache + update toast, `storage.persist` (plan §9.1; the old cache item: `docs/core/BACKLOG.md` §1). CORE-20 estimate (2026-11-12): two runs — (1) a CORE run: the four files (library 137 KB, loader 322 KB, SIMD binary 11.15 MB, model 7.82 MB; the no-SIMD pair too, about 11 MB more, for old browsers) under `core/vendor/mediapipe/0.10.35/`, `handdet.js` through `new URL(…, import.meta.url)`, both pages' CSP to `'self'` + `'wasm-unsafe-eval'`, the register's entries from CDN to shipped, the runner's host list shrinks, `early.js` points home; about 19 MB more in git history. (2) a NIGHT run: a versioned precache list written by `tools/build.mjs` (page, static closure, data, Standard's forest files, three.js, the stream, MediaPipe ≈ 27 MB; Detailed +5 MB), cache-first with a build-hash cache name, an update notice, `storage.persist`; probes for the update path and an offline second start. Cost: our host serves the 19 MB a first visit (Vercel Hobby ≈ 100 GB/month ≈ 4,000 first visits; the binary compresses on the wire, the model hardly); second visits need no network at all (today: about 150 revalidations, 30 KB, the library and binary from the browser's cache, and the 7.6-MB model downloaded again every visit).
- FIXED at RAIN-0b (the row reads after an event wait; no failure since):
- ✅ (RAIN-0b, 2026-11-14: the row now reads after the room's own clock shows the jump and the room has stepped twice more there — an event wait with a 5-s limit, never a page-frame count) **«RAIN room» in `P.night`: one failure in the full suite under load** (NIGHT-14, 2026-11-13): «two minutes after its note the window glows at 0.964, the trace law says 0.364» — the row jumps the scene clock and reads after 3 frames; alone (`--eval`) it passes (0.363 vs 0.364). RAIN-0's row, the room untouched by NIGHT-14: watch it; if it recurs, give the clock jump its own settle wait (a frame count is a lottery under load).
- OUTDATED — replaced by the music bed (NIGHT-3 stage 4, NIGHT-4 v2; `apps/night/bed.js`, `bed2.js`); its open part is the NIGHT-4 item:
- ⬜ **Background music themes** (ex-RUN 10).
- FIXED at NIGHT-6, NIGHT-8, NIGHT-9, NIGHT-8c (the forest rebuilt with CC0 files; register entries «forest-files», «forest-floor-scan»):
- ⬜ **Port the forest demo with CC0 textures** (ex-RUN 11). Every texture goes in the licence register first (rule #32).
- FIXED at NIGHT-3 stages 2–5 (the switching machinery 2026-11-09, `apps/night/roomswitch.js`; the room «Rain» uses it); the Room button moved to the «Rain» item:
- ⬜ **Rooms as modules:** room contract, catalogue, loader. In progress: NIGHT-3 (`docs/night/design/NIGHT-3-rooms/PLAN.md`): stages 2–4 and stage 5 part 1 (settings) done; next stage 5 part 2, the switching machinery (where we stopped and the user's notes: PLAN.md, top). The forest stays the only room for now.
- FIXED at NIGHT-6 slices 0–9 (the forest polish); the second room was chosen: «Rain» (RAIN-0, RAIN-0b, RAIN-3), now the open «Rain» item:
- ⬜ **The forest polish, then a second room** (user, 2026-11-03): after NIGHT-3, a run merges today's forest with the sketch «Живой лес» (`tools/design/room-demos/rooms/2026-10-20_zhivoy-les.html`). In progress: NIGHT-6 (`docs/night/design/NIGHT-6-forest/PLAN.md`): the plan approved with the user's decisions and the files rule (2026-11-09); slices 0 + 1 built, waiting for the user's look and the Poco measurement (step 134). Only then a second room is chosen and ported. Candidates and estimated costs: PLAN.md §5. Lake first (cheapest, safest), then Aurora, Sea, Window (the «Тихие комнаты» sketch), Monastery («Комнаты света»), Cosmos; «Песня в темноте» later as its own mode. The Room button shows once there are two real rooms.
- MERGED into «Calibration NIGHT-2 stage 3» (step 129 covers step 125 for Night):
- ⬜ **Step 125 for Night:** now covered by step 128 on the real screens (laptop and Poco). Done so far: Full on the desktop (the panel).
- MERGED into «C8 rest, C10, C12»: the setting was built at NIGHT-7 (`#nightQualSeg` Standard / Detailed); the device default is C8 rest:
- ⬜ **Graphics quality in settings: low · medium · high** (user, 2026-11-03; room left in the View section). What it takes: (1) one setting over what exists: the scene level (`setSceneLevel` full / reduced / minimal, today a development switch) and, at low, what «Lighter forest» does (the delay-network room, strike caps at 60 %, no glass blur) — decide whether «Lighter forest» merges into low; (2) a device default chosen once: the engine class (ENG2, provisional), the GPU name, then the first 20–30 s of the forest measured (scene fps, hand detections per second, audio dropouts, the numbers «Measure this device» prints) → a proposal, never a silent switch while playing (user answer E1); (3) remembered on this device, the person's choice wins; (4) rows: the choice maps to the level and persists; the Poco numbers decide the thresholds (C8 rest).
- MERGED into «C8 rest, C10, C12» (rewritten there):
- ⬜ **C10 release:** the release edition exists (`tools/build.mjs`, `HANDSONG_EDITION=release`); left are the dist checks, privacy wording, hosting. **C12 release candidate:** both suites on the runner, the user's phone round, fixes, then publish.
- MERGED into the rewritten open list (same text, shortened):
- ⬜ **NIGHT-1: sound headroom.** Stages 1–2 done on the laptop (`docs/night/NIGHT-1-HEADROOM.md`): Night's work about halved, same sound. Open: the Poco page `<preview>/?probe&headroom` (user, 2026-11-03: later); step 127, the user's ear check of the quiet floor (option 3, off for players; a small saving, 2–11%); whether the Poco needs more.
- ⬜ **The cold first opening (NIGHT-7):** about 7 s at medium on the laptop in a fresh browser (shader compile; the bark's and the wood's shaders 1.3 + 1.2 s, the rest 0.1–0.5 s each); sliced, so the start card stays responsive, and Chrome keeps compiled shaders for later visits. Options, later: fewer shader variants (one program for the bark and the wood), a simpler first look that sharpens after, or the per-device levels the user planned.
- ⬜ **A cross-link to the full app, later:** from Night's info card, as a plain web link to the Handsong site or store page. Never a code import.
- ⬜ **Delete `apps/night/migrate.js` after the first public release,** with the row «NIGHT migrate» and the file's exemption in the row «OLD NAME gone».
- ⬜ **The user's eye and ear checks of RUN 9: steps 120–124,** and **the Poco measurement** (ⓘ → «Measure this device», 2 minutes with the forest on). Current addresses: `docs/night/HANDOFF.md`.
- ⬜ **The lantern, back as an offer in the low-light message** (user, 2026-11-09): not a menu switch again (removed at NIGHT-3 stage 5 part 1), but a button inside the low-light message, e.g. «Подсветить руки», since it exists to light the hands in a dark room. What it was: a warm radial glow over the bottom 24 % of the screen, remembered per device (`handsong.nightLantern`; the markup, rule and token are in the NIGHT-3 stage 5 part 1 commit's parent). The low-light message is core's (`core/legacy-ui/latmeter.js` `#darkHint`), so an app's button there needs a door (a CORE run).
- ⬜ **NIGHT-4, the music bed v2, after the user's step 131** (2026-11-09; `docs/night/design/NIGHT-3-rooms/PLAN.md` §4b):
- ⬜ **The bed's notes shown in the room** (user, NIGHT-3 stage 4, 2026-11-04; for the forest polish run, not before): e.g. fireflies lighting up with the music bed's chords, driven by the bed's own events (never by audio analysis), never brighter than the player's light. Built at NIGHT-6 slice 1 (the bed's events on the bus «bed», shown when heard: chords swell the mushrooms, each loop voice glows in its own cluster, glass notes make a far firefly twinkle); waiting for the user's look (step 134).
- ⬜ **Calibration and sensitivity screen (NIGHT-2):** stage 1 design approved with the user's answers (2026-11-03, `docs/night/design/NIGHT-2-calibration/DESIGN.md` «Decisions»); stage 2 built (`apps/night/calib.js`, the settings card); stage 3 after the user's laptop try (hand choice in settings, the flicker, far hands), waiting for the five checks of step 129. On top of CORE-1 (`docs/core/BACKLOG.md`, `docs/core/CORE-1-DESIGN.md` §6). User's decisions, 2026-11-02: the person sees only the one-step near calibration, offered once on first launch (skippable; stop the ghost first) and afterwards in the settings menu, next to two sliders, «Hand travel» (playing-hand depth; more travel = a lower value, so the long end is 0.7×) and «Effects sensitivity». No numbers, no direction choice, no calibration icon on the main screen. The test panel stays development-only.
- ⬜ **Audio dropouts right after the forest opens** (seen at NIGHT-1 stage 2, laptop, 2026-11-03): the first real-time pass of Firefly's fast passage right after the forest opened read free share 0 with 5 dropouts; the two other runs of the same case 63–75 and 50–63 with none, and every other case none. Likely the forest's opening (about 20 shaders compiled, the room built, 2–3 s the first time) competing with the audio thread. Not tiny to fix (delay the opening's heavy part, warm the shaders while silent, or open with the sound faded); watch it on the Poco with «Measure this device» first.
- ⬜ **Playing far from the camera: TV or projector, 1–2 m** (user, 2026-11-03). Stage 3 accepts a steady hand down to a palm size of 0.075 (≈1.5 m on a 640×480 webcam with a 45° view) and keeps the far end at 0.06 (≈1.9 m) — both ESTIMATES; the smallest size measured with no dropout is 0.109 (≈1 m). Past that the limit is the palm detector, which sees the whole frame shrunk to 192 px, so a higher camera resolution won't help it. What would: (1) measure first: the user calibrates at 1, 1.5 and 2 m (step 129, item 2) and the measuring page's far step at those distances; (2) a crop around the player once found (a narrower view for the detector, the picture unchanged; core vision, CORE run); (3) a camera with a narrower lens. Depth there has less travel and more shake.
- 💡 **Idea (user, 2026-11-02):** when no hand is found for a while, show a small camera thumbnail in a corner.
- ⬜ **A scales library with key choice.**
- ⬜ **Start times, measured again** (NIGHT-12, 2026-11-12): the start times of CORE-20 are NOT proven — the laptop was busy (a call, video) during every measurement, and `early.js` changed to the safe rule (after the load event and Begin) after the last one. Repeat on an idle laptop and on the Poco: `node tools/probe-browser.mjs --measure-start` and `--measure-start --throttle` (a warm-up visit, two alternating repetitions; «old» = `?probe&oldload`), and once on a built tree (`--root tools/.build/night-preview`, which adds «now without modulepreload»). Record: requests and bytes before Begin works, the time to a working Begin, tap → first camera frame, fresh and second visit.
- ⬜ **MediaPipe versions — look every 2–3 months, update only on purpose** (CORE-22, 2026-11-13; next look about 2027-01/02): check npm `@mediapipe/tasks-vision` and the hand model page for a new version; read its notes; never update as a side effect. An update is its own CORE run: a NEW folder `core/vendor/mediapipe/<version>/` (the year-long immutable cache header relies on a file never changing under its address), `core/handdet.js` `MP_VER` and `MP_SOURCES.own`, `apps/night/early.js`, the README's hashes, the register; then the hand rows compared before and after (the runner's hand and gesture rows, `P.night`'s hand rows, the hand-depth prints, «LAT2 worker = main thread») and the start measured (`--measure-start`); the old folder removed in the same run. The steps: `core/vendor/mediapipe/0.10.35/README.md`.
- ⬜ **An instant camera refusal can be misread while the hand model builds** (found at NIGHT-14, 2026-11-13; runner «NIGHT honest start» (D) failed 1 time in 3). Night tells «refused without asking» (an in-app browser) from «a person said no» by how fast the refusal comes back (`pure/inapp.js QUICK_DENY_MS` 450 ms, `core/vision.js` `gumMs`). That time is measured on the main thread, where both apps build the hand model (path 'main'); since CORE-22 the model arrives locally at once (and from the precache on a second visit), so its build — the two models and the two warm-ups, 0.5–1.6 s each — often overlaps the Begin tap, and the refusal's callback waits behind it. Proposed fix, its own small CORE run (opt-in, Night only): while a camera request is under `QUICK_DENY_MS` old, the detector holds its next heavy step (`createDetector` option `hold`, awaited before each build and warm-up; at most 450 ms of delay, only when the build is still running at the tap). The row is not loosened.
  - NIGHT-14c (2026-11-14): it failed in each of the last three full Night suites (NIGHT-14, 14b, 14c) and passed in each `--ui-only` run (3 of 3): it needs the machine busy. The proposed opt-in hold is the fix; until then a full-suite failure of this row alone is this race.
- ⬜ **Store packaging, later** (Capacitor: `webDir: dist`; the network list in `archive/SPLIT-PLAN.md` §4.4 must change first).
  - The A/B choice: v2 or v1, voices or horns. Once v2 stays, delete v1's driver, law and sound, keeping only what the AudioWorklet fallback needs (it plays v1 when AudioWorklet is missing), and decide the palette.
  - The Poco: the bed's cost on the phone (`?probe&headroom`; its `bedCost` measures v1 and v2 alone) and a listen.
  - Lighter keeps the node and its room (24 µs on the laptop): a 4-line room for weak devices only if the Poco needs it.
  - The «Лёгкий лес» text does not mention the music (a CORE text run).
  - Not built (plan §4): the sleep timer thinning the bed; the bed's own notes on the bus for a room's visuals.

### From docs/night/BACKLOG.md «Open from the old HANDOFF»
- MERGED into «C8 rest, C10, C12» / «The user's open checks» / «Later»:
- ⬜ C8 rest: phone numbers, the auto-proposal of a level.
- ⬜ RUN 9's questions to the user: is medium good enough or should high get cheaper · the night's 24 minutes and a cloud every 3 minutes · rare moments every 2.5–5 minutes · 1–3 s to open the forest, or a gentle «waking» moment · the falling star in front of the trees.
- ⬜ Before the first release: detection in a worker if phone numbers ask for it, the user's own visual design and icon set (§7.19; Night's look is chosen, the audit marks of the rest remain).
- ⬜ After the first release: installation (kiosk) mode §7.18 = stage 4b · «Listen» §7.17 · the plan's later list (§12): more rooms, the forest band, rhythmic backings, more timbres and effects, the expression hand, saved moments, packs, «Plus».
- ⬜ Selling: Vercel Hobby forbids it; a paid plan or other hosting first (§7.12 item 6, `docs/core/BACKLOG.md`).
- OUTDATED — steps 101–105 and 114–119 checked RUN 6–8's forest, profile switch, design proposals and listening page, all replaced since (RUN 9, NIGHT-6/8/9, DESIGN-1; the profile switch removed at SPLIT-2); today's checks are steps 120–162:
- ⬜ User checks without a closing record in the old HANDOFF: steps 101–105 and 114–119 (the user's checks of 106–113 led to RUN 8).

### From docs/night/BACKLOG.md «DESIGN-1 findings» and «NIGHT-14b leftovers»
## DESIGN-1 findings (2026-11-13, English; outside that run)
- Cached MediaPipe files and the Begin tap: in runner runs with `--cdn-cache` (the files arrive at once) the music was first audible 3.1–8.1 s after Begin (1.1–1.5 s without), and an instant camera refusal was timed past `QUICK_DENY_MS` (450 ms). Probably the runner's routing; still, measure a real second visit (HTTP cache) on the Poco: does the model's start-up delay the music?
- Phone landscape while playing: the coaching line touches the effect bars (`ui-snap`: play 844×390, nightCoach × nightFxBars) — seen before DESIGN-1 too.
- `tools/ui-snap.mjs`: two waits use an `async` predicate (night-cards, night-cal-fail) — Playwright does not await it, so they never wait.
- core/i18n.js keeps Night's old long settings texts (`night.light`, `night.musicAnswer`, the section headings) that Night no longer shows: a CORE run may drop them (core debt).
- Settings in tabs: the card is centred, so its height and place change from tab to tab (the founder's eye decides; a fixed top would hold it).

- NIGHT-14b leftovers (2026-11-14): (a) a first visit shorter than the start set's download (about 26 MB of files, ≈ 17 MB over Vercel's compression) still cannot start offline next time — it only resumes on the next online visit; a smaller start set (the model and the binary are 19 MB of it) would need the start card to work without hands offline — a design question. (b) `navigator.storage.persist()` is not asked: a browser short of space may drop the cache (Night then simply loads from the network). (c) The Poco keeps the caches of every preview address it opened (each its own origin): clear them in Chrome's site settings once in a while; test on the dev alias https://handsong-night-git-dev-mihail-bridge.vercel.app. (d) Run `node tools/smoke-paths.mjs --precache-url https://handsong-night-git-dev-mihail-bridge.vercel.app --phone` after each push that touches `sw.js`, `update.js` or the build.
- Verdicts: cached MediaPipe and the Begin tap — MERGED into «An instant camera refusal» (the same cause: the hand model's build on the main thread; the Poco measurement stays in «Start times»). Coaching line × effect bars — FIXED at NIGHT-13 (4). ui-snap async predicates — FIXED at NIGHT-13 (5). core/i18n.js old texts — MOVED to docs/core/BACKLOG.md «App texts into app dictionaries» (`night.light`, `night.musicAnswer`, `night.set.music` used nowhere, checked). Settings card height — FIXED at NIGHT-13 (3) (a fixed height, the tallest tab's). NIGHT-14b (a) and (c)(d) — kept in the open list; (b) storage.persist — open item, then NIGHT-15.

### From docs/core/BACKLOG.md «Open now»
- FIXED in the runner at NIGHT-3 stage 3 (its gate's own 50-ms settle turned out to be a lottery: open item, then NIGHT-15):
- ✅ **The ENG2 benchmark could run during the first probe row** (found at NIGHT-3 stage 3, 2026-11-03; fixed in the runner). `render.js` starts it by itself 20 s after loading on a device with none stored, and every runner profile is fresh. When the app's start took longer than that, the runner's auto-freeze pause came too late, and on Night (no seed before the rows) the benchmark was still rendering on the engine copy when GOLD's state guard took its snapshot: «render engine copy: offline true, seeded true → false». `tools/probe-browser.mjs` now runs the benchmark once right after the start and waits for it (an in-flight one finishes first; the stored result stops the timer's), then checks it settled; CONTROL: «nothing stored» must read unsettled. The guard was not loosened.
- FIXED at CORE-1:
- ✅ **CORE-1: hand calibration and sensitivity in the engine** (2026-11-02). Opt-in; Night opens it since NIGHT-2 stage 2 (scope `night`), Full not yet. Design: `docs/core/CORE-1-DESIGN.md`. The screens and the rest of step 125 are app work: `docs/full/BACKLOG.md`, `docs/night/BACKLOG.md`.
- FIXED at DOC2:
- ✅ **Slim `CLAUDE.md` back under ~60 KB** — done at DOC2 (2026-11-09): 73.6 → 49.5 KB, `docs/core/WORK-LOG.md` «DOC2». The item as it stood: (68.9 KB at SPLIT-2): it is loaded into every session, so move long reference sections into `docs/` files that sessions open on demand, keeping every rule findable. Prove nothing is lost: `tools/doc-split-check.mjs` with the new files added to its list.
- MERGED into «Flaky rows to watch» (none recurred in the run records since):
- ⬜ **`NIGHT stress`, a possible flaky check; look into it if it recurs, and tell the user when it does** (user, 2026-11-02). Seen once at CORE-1 CP2, unchanged audio: `live solo.handpan`, 48 dropouts in 6 s against 0 for the reference. The next two runs passed. Log: `tools/.probe-logs/2026-11-02T09-46-52-.log` (git-ignored). **It recurred at CORE-1 CP5, three sessions in a row on a tree that passed at 12:17** (core 7ef60d72285fb980; CP5 changed docs only): `solo.singing-bowl` 7, then 5, then 44 dropouts, `solo.handpan` 16 in the last, the reference 0 each time. Today: 1 failure in 6 sessions before CP4's tree, 3 in 4 on it. Not settled: the row plays through `processHands`, so CP4's doors are on its path (one boolean read each, calibration closed), and other rows ran 13–20% slower than at 12:17 with the user's Chrome open. **Rerun on the same core, laptop cooled and on power: two PASS in a row** (log stamps 18-12-41, 18-18-38), so CP4's code doesn't cause it by itself; heat, power or other load make the difference, and which one wasn't separated (Chrome was still running, one window, idle at 0% when sampled after the runs; Telegram was running at the start of the first run). Keep watching: Full's sound stays at 0 under the same playing, so Night's struck sounds have less margin on this laptop. Don't pass it with `--stress-not-judged`. NIGHT-1 stage 1 (`docs/night/NIGHT-1-HEADROOM.md` §5): cool and idle, 0–2 dropouts in 39 stress passes; the row's order leaves SuperSaw and flute banks computing under the handpan and bowl (offline +28–31% after the flute), though the reference's second pass carries them too.
- ⬜ **`LAT3 low light`, real-time, fails now and then:** 2 of 12 Full sessions on 2026-11-02 (10:33, 15:11, «after fps15 hand detection stopped»), passing on rerun. Same family as `LAT1b`.
- ⬜ **`P.quick`'s 3-minute limit no longer fits.** At CORE-1 CP3 it stopped three of seven Full sessions that day, 5–8 rows short of the end at 180 s, with no row failing. Passing runs that day took 135–167 s; rows ran about 30% slower across the suite in the failing runs. The slow factor stays 1.00 because `SLOW_REF` (idle 112.9 s) predates many time-based rows, so its reference rows still read below idle (0.53–0.75×). Refresh `SLOW_REF` or raise the default; meanwhile `--limit-quick 5`, named in the report. Again at NIGHT-3 stage 3 (2026-11-03, 12:38): 77 of 93 rows in 180 s, none failing. The time-based rows the speed factor leaves out (POOL1 14 s, LAT3 13 s, LAT2a 10 s, CAM-START 10 s, LAT1b 9 s) are the slowest; its reference rows ran at 0.62× their idle time, so the limit stayed 3 min. The rerun passed in 136.6 s.
- ⬜ **Smoke test: Full from a sub-folder stalled twice at its start, cause not found** (NIGHT-3 stage 3, 2026-11-03; user: find it, don't raise the timeout). `node tools/smoke-paths.mjs`, target «full at /some/sub/» (repo tree): 2 of the first 3 runs after the CORE-8 move waited the whole 180 s for the start card to close, with no page error, no console error and 213 responses against 222 at the root. The very same tree then loaded 11 times without a stall (one whole run, 6 alone, 4 right after «full at /»), and 4 more times after phase B; 15 of 15 in 13–15 s. Ruled out: the network (the four MediaPipe files are served from `tools/.cdn-cache/`, cached since 2026-10-14) and our changes (the same code passed). Not yet known: what the start waited on. The smoke test now prints, when a page stalls, the files last served, the requests still pending, the start card's text and the last console lines; `--only app@prefix --repeat N` reruns one target. Next time it happens, that printout names the cause.
- KEPT, rewritten with today's evidence:
- ⬜ **The service worker is never registered on a built page** (found at NIGHT-14, 2026-11-13). `core/legacy-ui/ui.js` registers `sw.js` on the window's load event, but ui.js finishes evaluating only after `core/scales.js`'s top-level `await loadScaleData()`; on a built page (its modules preloaded, CORE-20) the load event has usually fired by then, so the listener never runs (the smoke test's precache row saw `sw.js` asked 0 times). Night now registers its own worker (`apps/night/update.js`). Full: probably not installable from its built pages; the fix (register at once when `document.readyState==='complete'`) changes core behaviour — its own small CORE run, with Full's install prompt checked on a phone.
- ⬜ **App texts into app dictionaries** (user, NIGHT-2, 2026-11-03): Night's `night.*` keys (and the NIGHT-2 calibration texts) live in `core/i18n.js` for now, against core rules 2 and 8. A CORE run gives `core/i18n.js` a door for an app's own dictionary (`apps/<app>/i18n.js`, en + ru), moves the keys there, and the data row that checks keys in both languages follows them.
- ⬜ **The per-control sensitivity override has no screen** (found at CORE-1 CP5). By the user's UI decision the apps show two global sliders, so `handCalSetSens(v, id)` and the record's `sens` field have no caller outside the rows. When both calibration screens exist: remove it if neither uses it (core rule 1).
- ⬜ **ui-snap recheck on the GeForce.** RUN 9's Full screens were captured on the Intel HD 4000 and differ at rendering level from RUN 7's on the GeForce GT 635M (gradients ±1–2, glyph edges). A capture on the GeForce settles it.
- ⬜ **Remove the embedded `profile.full` from Night's page** once Night has its own stress reference (`core/DEBT.md`).
- ⬜ **Keep shrinking `core/legacy-ui/`** and the rest of `core/DEBT.md`. Next large piece: split the `recorder.js` facade so Night plays without the recording path.
- ⬜ Remove `tools/split-*` and `tools/split-baseline/` when the user no longer needs the split's proof; the row «OLD NAME gone» then loses its exemption for them.
- ⬜ Replace the temporary row exemptions as they fall away: `apps/night/migrate.js` (NIGHT backlog), and the known overlap in `tools/ui-snap.mjs` (`MSG_KNOWN`).

### From docs/core/BACKLOG.md, its last section
## Found at NIGHT-13 (2026-11-13) — ✅ fixed at NIGHT-13b (polled in the page, with a CONTROL)
- `tools/smoke-paths.mjs:133`: the clipboard check waits with an `async` predicate (`waitForFunction(async t=>(await navigator.clipboard.readText())===t)`); Playwright does not await a predicate's promise, so it is truthy at once and the check can never fail. Fix as in `ui-snap.mjs` (NIGHT-13): read the clipboard in an `evaluate` loop with a time limit, or a synchronous predicate over a value set by the page.

## NIGHT-15 (2026-11-15): items fixed, word for word, with the evidence
- FIXED at NIGHT-15 + CORE-23 (opt-in camHold; «NIGHT honest start» passed in three full Night suites in a row under load; (D2) a deterministic case with its CONTROL, (D3) the wiring with its CONTROL):
- ⬜ **An instant camera refusal can be misread while the hand model builds** (found at NIGHT-14; runner «NIGHT honest start» (D) fails in full Night suites under load, passes in `--ui-only`). Night tells «refused without asking» (an in-app browser) from «a person said no» by how fast the refusal comes back (`pure/inapp.js QUICK_DENY_MS` 450 ms, `core/vision.js` `gumMs`), measured on the main thread, where the hand model's build (two models, two warm-ups, 0.5–1.6 s each) can overlap the Begin tap. Fix: the opt-in hold — CORE-23 (NIGHT-15).
- FIXED at NIGHT-15 (pure/brook.js keeps the three highest gains; data row «NIGHT stream sound» with the old pick as CONTROL):
- ⬜ **The stream synthesis's Lighter mode keeps the FARTHEST three voices** (found at NIGHT-8b, never fixed): `pure/brook.js` takes voices 0–2 and the voices are listed far to near — gains 0.14 / 0.21 / 0.33 kept, 1.00 / 0.82 / 0.54 dropped (computed at NIGHT-15a). Heard only in the synthesis — the first 2 s before the recording arrives, or always if the recording fails to load; the shipped recording's Lighter mode keeps the three loudest correctly (`pure/brookrec.js`), which is why the founder hears nothing wrong.
- FIXED at NIGHT-15 (rooms/rain/heard.js through the host's heard hook; P.night «RAIN room» case 6 with the heard step off as CONTROL):
- ⬜ **Rain: the near / far balance freezes when no picture is drawn** (RAIN-3 limit): on the Dark and Camera backgrounds the focus never reaches the sound.
- FIXED at NIGHT-15 (apps/night/persist.js, pure/persist.js; data row «NIGHT storage persist»):
- ⬜ **`navigator.storage.persist()` is not asked** (NIGHT-14b): a browser short of space may drop the precache (Night then loads from the network).
- FIXED at NIGHT-15 (apps/night/licences.html, written with THIRD-PARTY-LICENSES.md and by the build; LIC1 checks it current, CONTROL a stale page):
- ⬜ **The third-party licences have no page in Night** (C10's privacy and licence wording).
- FIXED at NIGHT-15 (tools/probe-browser.mjs: waits for the render queue to drain, at most 30 s, then judges as before; the threshold and its CONTROL unchanged):
- ⬜ **The runner's engine-benchmark gate** (`tools/probe-browser.mjs`, before the rows): it waits a fixed 50 ms after its own benchmark and then demands an empty render queue — if the page's own 20-s benchmark queued a render meanwhile, the gate fails though nothing is wrong (a lottery settle). Fix at NIGHT-15.
