/* ================= ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n) — ЭТАП 0: только каркас =================
   English по умолчанию + Русский; форма механизма РАССЧИТАНА на четыре языка (en/ru/es/de), но
   словари es/de пока НЕ заводим (музыкальную терминологию на них проверить некому — ложная
   локализация читалась бы носителями как ошибки). Добавить язык позже = добавить его в LANGS и
   завести словарь, механизм не трогая.

   ЭТАП 0 НЕ ПЕРЕНОСИТ НИ ОДНОЙ строки: словари пусты, поэтому t() всегда падает на фолбэк
   (существующий русский текст в разметке/коде), а L() пропускает строки как есть. Приложение выглядит
   и ведёт себя РОВНО как сегодня. Переключатель уже есть, выбор сохраняется и переживает перезагрузку,
   на свежем профиле язык угадывается из браузера. Перенос строк — этапы A/B/C.

   Комментарии — на русском (политика языка комментариев не менялась; интернационализируем только
   ВИДИМЫЕ ПОЛЬЗОВАТЕЛЮ строки). */

/* store — обёртка над localStorage с try/catch. Приватный режим и file:// НЕ должны ронять старт:
   при недоступности localStorage тихо падаем на хранилище В ПАМЯТИ (переживёт сессию, но не
   перезагрузку — приемлемо, лучше, чем исключение на старте). */
const MEM = {};
export const store = {
  get(k){ try{ const v = localStorage.getItem(k); return v===null ? (k in MEM ? MEM[k] : null) : v; }
          catch(e){ return k in MEM ? MEM[k] : null; } },
  set(k,v){ try{ localStorage.setItem(k, v); }catch(e){ MEM[k] = v; } },
};

/* Доступные языки (порядок = порядок в переключателе). es/de готовы ПО ФОРМЕ (см. LANG_LABEL, L()),
   но пока не включены. English — умолчание. */
export const LANGS = ['en','ru'];
/* Эндонимы — самоназвания языков (каждый на своём языке), для подписи опций переключателя. Держим все
   четыре: пригодятся, когда es/de войдут; на выбор влияет только LANGS. */
export const LANG_LABEL = { en:'English', ru:'Русский', es:'Español', de:'Deutsch' };

/* СЛОВАРИ — key → строка, по языку. ЭТАП A: перенесён ИНТЕРФЕЙСНЫЙ ХРОМ (кнопки/подписи/подсказки/
   тосты/статус/ярлыки холста). English — ОСНОВНОЙ текст (по нему читает большинство), ru — перевод.
   МУЗЫКАЛЬНЫЕ ДАННЫЕ (имена ладов/традиций/групп/аккордов/свар/тембров/аранжировки) — ЭТАП B, их здесь
   НЕТ. es/de пусты (терминологию проверить некому). Неизвестный ключ → en → params.def → сам ключ. */
export const DICTS = {
  en: {
    // приложение / стартовая карточка
    'app.title':'Handsong — gesture synth & interactive tunings tutorial',
    'start.tag':'A gesture synth: play with your hands in front of the camera.',
    'start.play':'▶ Play',
    'start.learn':'Learn',
    'start.learnTitle':'Interactive lessons (coming soon)',
    'start.learnSoon':'Interactive lessons are coming soon.',
    'foot.feedbackText':'First version — bugs and rough edges are likely. Tell me what breaks:',
    'foot.feedbackLink':'Feedback',
    'foot.emailLink':'Email me',
    'foot.supportText':'Handsong is made by one person, in spare time, and free for everyone. If you’d like to support its development:',
    'foot.donateLink':'Donate',
    // установка (PWA)
    'install.btn':'⬇ Install',
    'install.title':'Add Handsong to your home screen',
    'install.ios':'To install: tap Share, then “Add to Home Screen”.',
    'install.hint':'add Handsong to your home screen',
    // полноэкранный режим
    'fs.title.enter':'Fullscreen: hide the browser bars',
    'fs.title.exit':'Exit fullscreen',
    'fs.start.enter':'⛶ Fullscreen',
    'fs.start.exit':'⛶ Exit fullscreen',
    // загрузка / ошибка старта (стартовая карточка)
    'load.model':'Loading the hand-tracking model…',
    'load.camera':'Starting the camera…',
    'load.error':'Couldn’t start: {msg}. Check camera access and that the page is served over https.',
    // верхняя панель
    'bar.scale':'Scale',
    'bar.scaleTitle':'Scale: mode, tonic, timbres',
    'bar.instrTitle':'Solo / Chords',
    'bar.halfLTitle':'Left half: instrument',
    'bar.halfRTitle':'Right half: instrument',
    'bar.splitTitle':'Split screen: chords | solo on two halves',
    'bar.camTitle':'Switch camera: front / back',
    'bar.loop':'⚙ Loop',
    'bar.loopTitle':'Looper panel: bars, tempo, arrangement',
    // роли (кнопка роли, свёрнутый бар — держим коротко)
    'role.ld':'🎸 Solo',
    'role.ch':'🎹 Chords',
    'role.bs':'🎚 Bass',
    'role.dr':'🥁 Drums',
    // сплит / камера (тосты и динамические подсказки)
    'split.on':'Split screen ON — tap to turn off',
    'split.off':'Split screen: two roles on two halves',
    'cam.unavailable':'Second camera unavailable',
    // запись клипа / аудио
    'clip.title.rec':'Recording clip — tap to stop and save',
    'clip.title.idle':'Record clip: video + sound in one file (WebM; social apps may want MP4 — you’d need to convert)',
    'clip.saving':'Saving clip…',
    'clip.recording':'● Recording clip',
    'clip.errPrefix':'Clip: ',
    'audio.title.rec':'Recording audio — tap to stop and save',
    'audio.title.idle':'Record audio: sound only to a file (WebM/Opus; Safari may give mp4)',
    'audio.saving':'Saving audio…',
    'audio.recording':'● Recording audio',
    'audio.errPrefix':'Audio: ',
    // джем
    'jam.label':'🎵 Jam',
    'jam.title.on':'Jam playing — tap to switch variant (turns off at the end)',
    'jam.title.off':'Jam: a backing for the tuning — tap to start, next tap switches variant',
    'jam.sizeMismatch':'Jam: the loop has a different metre — clear it (✕)',
    // кнопка записи ● (лупер)
    'rec.title.recFirst':'Recording the loop — tap to stop',
    'rec.title.overdub':'Overdubbing layer {n} — tap to stop',
    'rec.title.armed':'Loop playing — tap to start a new layer',
    'rec.title.idle':'Record: tap for a one-bar count-in, then the loop',
    // транспорт лупера
    'transport.loopPlay':'⟳ loop',
    'transport.loopPause':'❚❚ loop',
    'transport.loopTitle':'Loop: play / pause',
    'transport.undoTitle':'Remove the last layer',
    'transport.clearTitle':'Clear the loop',
    'transport.panicTitle':'Silence everything',
    // панель звукоряда
    'panel.collapse':'Collapse ✕',
    'panel.scale.head':'Scale',
    'panel.scale.sepScale':'Scale & tonic',
    'panel.scale.tradition':'Tradition',
    'panel.scale.mode':'Scale',
    'panel.scale.tonic':'Tonic',
    'panel.scale.aref':'A4 reference',
    'panel.scale.arefHint':'A single reference pitch is a 20th-century invention: before it, every town and church tuned its own way; baroque ensembles still play at 415.',
    'panel.scale.chords':'Chords',
    'panel.scale.triads':'Triads',
    'panel.scale.sevenths':'Sevenths',
    'panel.scale.sepTimbre':'Timbres',
    'panel.scale.leadInstr':'Solo instrument',
    'panel.scale.chordInstr':'Chord instrument',
    'panel.scale.bassInstr':'Bass instrument',
    'panel.scale.drumKit':'Drum kit',
    'panel.scale.handFn':'Hand functions',
    'aref.415':'415 · baroque',
    'aref.440':'440 · modern standard',
    'aref.444':'444 · orchestral',
    'unit.hz':'Hz',
    // панель лупера
    'panel.loop.head':'Looper',
    'panel.loop.sepLoop':'Loop (looper)',
    'panel.loop.length':'Length (bars)',
    'panel.loop.metre':'Metre (beats)',
    'panel.loop.tempo':'Tempo (BPM)',
    'panel.loop.quant':'Quantize',
    'panel.loop.hint':'Length and metre can be changed only on an empty loop.',
    'panel.loop.sepArr':'Arrangement (layers)',
    'panel.loop.harmony':'Harmony',
    'panel.loop.rhythm':'Rhythm',
    'panel.loop.bassMode':'Bass part',
    'panel.loop.addLayers':'＋ Add layers',
    'common.on':'On',
    'common.off':'Off',
    // функции рук
    'handfn.fx':'Effects',
    'handfn.note':'Notes (continuous)',
    'handfn.hold':'Notes (held)',
    'handfn.therm':'Theremin',
    'handfn.expr':'Expression',
    'handfn.loop':'Looper (control)',
    'handfn.latch':'Chords (latch)',
    'handfn.chHold':'Chords (held)',
    'hand.left':'Left hand',
    'hand.right':'Right hand',
    // холст: статус-строка ({name} — имя лада, локализуется на этапе B)
    'status.centsScale':'Scale: {name} · cents tuning · {n} steps',
    'status.edoScale':'Scale: {name} · {edo}-TET · steps: {steps}',
    'status.step':' · step {c}c',
    'status.recPrefix':'● recording · ',
    'status.loopPrefix':'▶ loop · {bpm} BPM · ',
    // холст: коробка лупера
    'looper.count':'COUNT-IN  {n}',
    'looper.recFirst':'● RECORDING · {n}-bar loop',
    'looper.overdub':'● OVERDUB · layer {n}',
    'looper.playing':'▶ LOOP · {bars} bars · {layers} layers',
    'looper.paused':'LOOP · {bars} bars · {layers} layers · “⟳ loop” to play',
    'looper.clear':'CLEAR',
    // холст: подсказка «нет аккордов» (макам) — держим строки короткими под ширину поля
    'nochords.title':'NO CHORDS',
    'nochords.l1':'Chords aren’t built in a maqam.',
    'nochords.l2':'Use the drone in the looper; record',
    'nochords.l3':'chords in another scale and play over it.',
    // холст: рука-лупер
    'hand.looper':'LOOPER',
    'looper.handHint':'index=record · middle=play · ring=undo · pinky=clear',
    // холст: короткие индикаторы (узкие столбики — токены той же длины, что и в ru)
    'ind.bright':'BRT',
    'ind.expr':'EXP',
    'hand.expr':'EXP',
    // холст: слово-регистр
    'reg.oct':'oct',
    'reg.octaveFull':'OCTAVE',
    'reg.tritave':'tritave',
    'reg.reg':'reg',
    // холст: ярлыки нот
    'tag.gliss':'glissando',
    'tag.step':'step',
    'tag.hold':'held',
    'tag.octHint':'finger I–IV → register (now {r})',
    // холст: полные имена эффектов
    'fx.dly':'Delay',
    'fx.vib':'Vibrato',
    'fx.drv':'Drive',
    'fx.trm':'Tremolo',
    // сообщения руки-лупера (подтверждения команд)
    'msg.recording':'● Recording',
    'msg.overdub':'● Overdub',
    'msg.recStop':'Recording stopped',
    'msg.noLoop':'No loop',
    'msg.play':'▶ Play',
    'msg.pause':'⏸ Pause',
    'msg.noLayers':'No layers',
    'msg.undo':'↶ Undo layer',
    'msg.alreadyEmpty':'Already empty',
    'msg.cleared':'✕ Cleared',
    'msg.clearCancelled':'Clear cancelled',
    // ошибки записи (clip)
    'err.noRecorder':'Recording isn’t supported by this browser',
    'err.noCapture':'captureStream isn’t supported by this browser',
    'err.noAudio':'Sound hasn’t started yet',
    'err.recStartPrefix':'Couldn’t start recording: ',
    // демо (стартовый оверлей)
    'demo.hint':'The same motif in six tunings — hear how the tuning changes.',
    'demo.skip':'Skip ✕',
  },
  ru: {
    'app.title':'Handsong — жестовый синтезатор и интерактивный учебник ладов',
    'start.tag':'Жестовый синтезатор: играйте руками перед камерой.',
    'start.play':'▶ Играть',
    'start.learn':'Обучение',
    'start.learnTitle':'Интерактивное обучение (скоро)',
    'start.learnSoon':'Интерактивное обучение готовится — скоро.',
    'foot.feedbackText':'Первая версия — баги и шероховатости вероятны. Расскажите, что сломалось:',
    'foot.feedbackLink':'Отзыв',
    'foot.emailLink':'Написать на почту',
    'foot.supportText':'Handsong делает один человек, в свободное время, и бесплатно для всех. Если хотите поддержать разработку:',
    'foot.donateLink':'Поддержать',
    'install.btn':'⬇ Установить',
    'install.title':'Добавить Handsong на домашний экран',
    'install.ios':'Чтобы установить: нажмите «Поделиться», затем «На экран „Домой“».',
    'install.hint':'добавить Handsong на домашний экран',
    'fs.title.enter':'Во весь экран: убрать полосы браузера',
    'fs.title.exit':'Выйти из полноэкранного режима',
    'fs.start.enter':'⛶ Во весь экран',
    'fs.start.exit':'⛶ Свернуть',
    'load.model':'Загружаю модель распознавания рук…',
    'load.camera':'Включаю камеру…',
    'load.error':'Не получилось: {msg}. Проверьте доступ к камере и что страница открыта по https.',
    'bar.scale':'Лад',
    'bar.scaleTitle':'Звукоряд: лад, тоника, тембры',
    'bar.instrTitle':'Соло / Аккорды',
    'bar.halfLTitle':'Левая половина: инструмент',
    'bar.halfRTitle':'Правая половина: инструмент',
    'bar.splitTitle':'Сплит-экран: аккорды | соло на двух половинах',
    'bar.camTitle':'Переключить камеру: фронтальная / тыловая',
    'bar.loop':'⚙ Луп',
    'bar.loopTitle':'Панель лупера: такты, темп, аранжировка',
    'role.ld':'🎸 Соло',
    'role.ch':'🎹 Аккорды',
    'role.bs':'🎚 Бас',
    'role.dr':'🥁 Ударные',
    'split.on':'Сплит-экран ВКЛ — тап выключит',
    'split.off':'Сплит-экран: две роли на двух половинах',
    'cam.unavailable':'Вторая камера недоступна',
    'clip.title.rec':'Идёт запись клипа — тап остановит и сохранит',
    'clip.title.idle':'Запись клипа: видео+звук в один файл (WebM; соцсети могут просить MP4 — понадобится конвертация)',
    'clip.saving':'Сохраняю клип…',
    'clip.recording':'● Идёт запись клипа',
    'clip.errPrefix':'Клип: ',
    'audio.title.rec':'Идёт запись аудио — тап остановит и сохранит',
    'audio.title.idle':'Запись аудио: только звук в файл (WebM/Opus; Safari может дать mp4)',
    'audio.saving':'Сохраняю аудио…',
    'audio.recording':'● Идёт запись аудио',
    'audio.errPrefix':'Аудио: ',
    'jam.label':'🎵 Джем',
    'jam.title.on':'Джем играет — тап сменит вариант (в конце выключит)',
    'jam.title.off':'Джем: подложка по строю — тап включит, следующий тап сменит вариант',
    'jam.sizeMismatch':'Джем: петля другого размера — очистите её (✕)',
    'rec.title.recFirst':'Идёт запись круга — тап остановит',
    'rec.title.overdub':'Наложение слоя {n} — тап остановит',
    'rec.title.armed':'Петля играет — тап начнёт новый слой',
    'rec.title.idle':'Запись: тап — отсчёт такта, затем круг',
    'transport.loopPlay':'⟳ луп',
    'transport.loopPause':'❚❚ луп',
    'transport.loopTitle':'Петля: играть / пауза',
    'transport.undoTitle':'Убрать последний слой',
    'transport.clearTitle':'Очистить петлю',
    'transport.panicTitle':'Заглушить всё',
    'panel.collapse':'Свернуть ✕',
    'panel.scale.head':'Звукоряд',
    'panel.scale.sepScale':'Лад и тоника',
    'panel.scale.tradition':'Строй',
    'panel.scale.mode':'Лад',
    'panel.scale.tonic':'Тоника',
    'panel.scale.aref':'Эталон A4',
    'panel.scale.arefHint':'Единый эталон — изобретение XX века: до него каждый город и церковь настраивались по-своему, барочные ансамбли и сегодня играют на 415.',
    'panel.scale.chords':'Аккорды',
    'panel.scale.triads':'Трезвучия',
    'panel.scale.sevenths':'Септаккорды',
    'panel.scale.sepTimbre':'Тембры',
    'panel.scale.leadInstr':'Соло-инструмент',
    'panel.scale.chordInstr':'Аккорд-инструмент',
    'panel.scale.bassInstr':'Бас-инструмент',
    'panel.scale.drumKit':'Набор ударных',
    'panel.scale.handFn':'Функции рук',
    'aref.415':'415 · барочный',
    'aref.440':'440 · современный стандарт',
    'aref.444':'444 · оркестровый',
    'unit.hz':'Гц',
    'panel.loop.head':'Лупер',
    'panel.loop.sepLoop':'Петля (лупер)',
    'panel.loop.length':'Длина (такты)',
    'panel.loop.metre':'Размер (долей)',
    'panel.loop.tempo':'Темп (BPM)',
    'panel.loop.quant':'Квантизация',
    'panel.loop.hint':'Длину и размер меняют только на пустой петле.',
    'panel.loop.sepArr':'Аранжировка (слои)',
    'panel.loop.harmony':'Гармония',
    'panel.loop.rhythm':'Ритм',
    'panel.loop.bassMode':'Бас-партия',
    'panel.loop.addLayers':'＋ Добавить слои',
    'common.on':'Вкл',
    'common.off':'Выкл',
    'handfn.fx':'Эффекты',
    'handfn.note':'Ноты (непрерывно)',
    'handfn.hold':'Ноты (с удержанием)',
    'handfn.therm':'Терменвокс',
    'handfn.expr':'Выразительность',
    'handfn.loop':'Лупер (управление)',
    'handfn.latch':'Аккорды (защёлка)',
    'handfn.chHold':'Аккорды (с удержанием)',
    'hand.left':'Левая рука',
    'hand.right':'Правая рука',
    'status.centsScale':'Лад: {name} · центовый строй · {n} ступеней',
    'status.edoScale':'Лад: {name} · {edo}-TET · ступени: {steps}',
    'status.step':' · шаг {c}c',
    'status.recPrefix':'● запись · ',
    'status.loopPrefix':'▶ петля · {bpm} BPM · ',
    'looper.count':'ОТСЧЁТ  {n}',
    'looper.recFirst':'● ЗАПИСЬ · круг {n} т.',
    'looper.overdub':'● НАЛОЖЕНИЕ · слой {n}',
    'looper.playing':'▶ ПЕТЛЯ · {bars} т. · слоёв {layers}',
    'looper.paused':'ПЕТЛЯ · {bars} т. · слоёв {layers} · «⟳ луп» играть',
    'looper.clear':'ОЧИСТКА',
    'nochords.title':'АККОРДОВ НЕТ',
    'nochords.l1':'В макаме аккорды не строятся.',
    'nochords.l2':'Дрон — в лупере; аккорды запишите',
    'nochords.l3':'в другом ладу и играйте под макам.',
    'hand.looper':'ЛУПЕР',
    'looper.handHint':'указ.=запись · средн.=пуск · безым.=отмена · мизинец=очистка',
    'ind.bright':'ЯРК',
    'ind.expr':'ВЫР',
    'hand.expr':'ВЫР',
    'reg.oct':'окт',
    'reg.octaveFull':'ОКТАВА',
    'reg.tritave':'тритава',
    'reg.reg':'рег.',
    'tag.gliss':'глиссандо',
    'tag.step':'ступень',
    'tag.hold':'держ.',
    'tag.octHint':'палец I–IV → регистр (сейчас {r})',
    'fx.dly':'Делей',
    'fx.vib':'Вибрато',
    'fx.drv':'Драйв',
    'fx.trm':'Тремоло',
    'msg.recording':'● Запись',
    'msg.overdub':'● Наложение',
    'msg.recStop':'Запись стоп',
    'msg.noLoop':'Нет петли',
    'msg.play':'▶ Пуск',
    'msg.pause':'⏸ Пауза',
    'msg.noLayers':'Нет слоёв',
    'msg.undo':'↶ Отмена слоя',
    'msg.alreadyEmpty':'Уже пусто',
    'msg.cleared':'✕ Очищено',
    'msg.clearCancelled':'Очистка отменена',
    'err.noRecorder':'Запись не поддерживается браузером',
    'err.noCapture':'captureStream не поддерживается браузером',
    'err.noAudio':'Звук ещё не запущен',
    'err.recStartPrefix':'Не удалось начать запись: ',
    'demo.hint':'Один и тот же мотив звучит в шести строях — слушайте, как меняется настройка.',
    'demo.skip':'Пропустить ✕',
  },
  es: {}, de: {},
};

const LS_KEY = 'handsong.lang';

/* Язык браузера → один из доступных (по первым двум буквам, navigator.languages в порядке
   предпочтения); не совпало ни с одним — en. */
function detectLang(){
  const list = (navigator.languages && navigator.languages.length) ? navigator.languages
             : [navigator.language || ''];
  for(const l of list){ const code = String(l).toLowerCase().slice(0,2); if(LANGS.includes(code)) return code; }
  return 'en';
}

/* Начальный язык: сохранённый выбор (если валиден) → иначе язык браузера → иначе en.
   lang — ЖИВОЙ экспорт (let): t()/L() читают модульную переменную, обновляемую setLang; импортёры
   получают живую привязку, отдельной перерисовки для смены самой переменной не нужно. */
const _stored = store.get(LS_KEY);
export let lang = (_stored && LANGS.includes(_stored)) ? _stored : detectLang();

/* t(key, params) — строка UI-словаря текущего языка. Фолбэк: en-словарь → params.def (умолчание вызова)
   → сам ключ (видимый маркер недостающего перевода). {n}-подстановка для шаблонов (статус/ярлыки
   холста, этап A). Пока словари пусты → всегда фолбэк (params.def или ключ). */
export function t(key, params){
  const d = DICTS[lang] || {}, en = DICTS.en || {};
  let s = (key in d) ? d[key] : (key in en) ? en[key] : (params && params.def != null ? params.def : key);
  if(params) s = String(s).replace(/\{(\w+)\}/g, (m,k)=> k in params ? params[k] : m);
  return s;
}

/* L(field) — поле-ИМЯ данных (звукоряды/аккорды/тембры). Принимает И строку (одинаково на всех языках:
   международный символ или пока-не-переведённое), И объект {en,ru,es,de,default}. Резолв по языку с
   фолбэком default → en → ru → первое значение. Этап B наполнит данные объектами; строки проходят
   насквозь, поэтому сегодня L() — тождество. Форма объекта — на четыре языка (частичный объект
   {default,ru} для транслитераций тоже валиден). */
export function L(field){
  if(field == null) return '';
  if(typeof field === 'string') return field;
  return field[lang] ?? field.default ?? field.en ?? field.ru ?? Object.values(field)[0] ?? '';
}

/* Подписчики на смену языка: этап A подключит сюда перерисовку динамики (выпадашки, составные кнопки).
   applyI18n зовётся ВСЕГДА; подписчики — для того, что нельзя выразить через [data-i18n]. */
const _subs = [];
export const onLangChange = fn => { _subs.push(fn); };

/* Перерисовка СТАТИЧЕСКОЙ разметки: проходим [data-i18n] (текст) и [data-i18n-title] (подсказка) и
   ставим из словаря. Пока таких атрибутов в HTML нет → no-op (строки не перенесены). Этап A разметит. */
export function applyI18n(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.getAttribute('data-i18n-title')); });
  try{ document.documentElement.setAttribute('lang', lang); }catch(e){}   // <html lang> в ногу с выбором
}

/* Сменить язык БЕЗ перезагрузки: валидируем, сохраняем, перерисовываем разметку, уведомляем подписчиков.
   Холст ничего не требует — draw читает t()/L() каждый кадр, следующий кадр уже локализован. */
export function setLang(code){
  if(!LANGS.includes(code)) return;
  lang = code; store.set(LS_KEY, code);
  applyI18n();
  for(const fn of _subs){ try{ fn(lang); }catch(e){} }
}
