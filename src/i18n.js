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

/* СЛОВАРИ — key → строка, по языку. Пока ПУСТЫ (строки не перенесены): t() падает на en-словарь, затем
   на params.def, затем на сам ключ. Форма на четыре языка сохраняется — es/de добавятся сюда же. */
export const DICTS = { en:{}, ru:{}, es:{}, de:{} };

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
}

/* Сменить язык БЕЗ перезагрузки: валидируем, сохраняем, перерисовываем разметку, уведомляем подписчиков.
   Холст ничего не требует — draw читает t()/L() каждый кадр, следующий кадр уже локализован. */
export function setLang(code){
  if(!LANGS.includes(code)) return;
  lang = code; store.set(LS_KEY, code);
  applyI18n();
  for(const fn of _subs){ try{ fn(lang); }catch(e){} }
}
