/* ================= СОСТОЯНИЕ ================= */
export let scaleIdx=11, tonic=9;                 // старт: минорная пентатоника от A
export let seventh=false, leadIdx=0, chIdx=0, bassIdx=0, drumKitIdx=0;
export const fx={dly:0.25, vib:0.20, drv:0.12, trm:0.0};
export let revDisp=0;                            // отображение Z-реверба соло-руки
export let latchDeg=-1;                          // защёлкнутая ступень аккорда, -1 = тишина
/* Выбранная ячейка палитры типизированного аккорда (Хроматика, 31-TET):
   chordFam — КОЛОНКА (семейство), chordVar — РЯД внутри неё (вариант).
   Выбирается ПОЛОЖЕНИЕМ щипка левой руки по палитре, а не пальцем: палец на левой руке
   больше ничего не значит (щипок принимается только большой+указательный). ЛИПКОЕ:
   держится и после отпускания, и когда руки нет в кадре. По умолчанию (0,0) = чистое
   мажорное трезвучие, поэтому правой руке всегда есть что играть — даже если левой
   в кадре не было. Наборы семейств разной длины: читатели клампят по types.length. */
export let chordFam=0, chordVar=0;
/* Тип защёлкнутого аккорда (массив интервалов из CHORD_FAMS) или null. КОМПАНЬОН к
   latchDeg, а не замена: latchDeg>=0 используется как проверка «звучит ли» в четырёх
   местах — объект вместо числа сломал бы их молча. В typedChords ладу тождество
   защёлки = (ступень + тип), иначе C и C7 — «одна и та же» и переключение читается
   как выключение. Сравнение по ссылке точное: ty всегда из таблицы CHORD_FAMS. */
export let latchTy=null;

/* Режим управления. 'pc' — три колонки, любая рука играет любую зону (как раньше).
   'phone' — вертикальный: один инструмент на весь экран (phoneInstr), правая рука
   играет ноты где угодно, левая — эффекты где угодно (swapHands меняет руки). */
export let uiMode='pc';                          // 'pc' | 'phone'
export let phoneInstr='ld';                      // что показано в phone-режиме: 'ld' соло | 'ch' аккорды
export let swapHands=false;                      // phone: true → правая=эффекты, левая=ноты
/* Сплит-экран (только phone): ON — экран делится на ДВЕ половины, каждая играет свою роль сразу
   (зона = инструмент, любая рука работает любую половину). OFF — сегодняшний single-role на весь
   экран, байт-в-байт. Пара ролей на шаге 3 фиксирована — SPLIT_ROLES. Живая связка — писать через
   setSplitOn (правило #6). */
export let splitOn=false;
/* Пара ролей сплита [левая, правая] — РЕДАКТИРУЕМА (шаг 4a): каждую половину крутят своей кнопкой.
   ИНВАРИАНТ — две РАЗНЫЕ роли (см. cycleHalf в ui.js: при прокрутке пропускаем роль другой половины),
   поэтому дубль-половины и моно-конфликты (два соло / два баса) НЕДОСТИЖИМЫ по построению. Писать
   только через setSplitRole (правило #6). Дефолт — аккорды|соло, как на шаге 3. */
export let SPLIT_ROLES=['ch','ld'];
export const setSplitRole=(i,role)=>{ SPLIT_ROLES[i]=role; };
/* ЕДИНЫЙ источник геометрии половин: [левая, правая] с ролью и X-диапазоном. Границу W/2 знает
   ТОЛЬКО эта функция — и gestures (заморозка половины по точке щипка), и draw (рендер половин)
   зовут её, поэтому попадание и картинка не разъедутся. Читает SPLIT_ROLES вживую (роли меняются
   кнопками). Внутренний раздел палитра|ноты каждой половины — palSplitX(rx0,rx1), как и раньше. */
export const phoneHalves = W => [
  {role:SPLIT_ROLES[0], rx0:0,   rx1:W/2},
  {role:SPLIT_ROLES[1], rx0:W/2, rx1:W},
];
/* Терменвокс (только phone-соло): ON — высота НЕПРЕРЫВНА по y (глиссандо/бенды/вибрато),
   а не квантуется к ступени; палец в нотном поле больше не выбирает ноту (её задаёт y),
   октавная полоса и регистр — как были. Живой звук: непрерывные Гц; лупер пишет ближайшую
   ступень (глиссандо-в-луп — задача позже). Живая связка — писать через setTheremin. */
export let theremin=false;
/* rect-соло (19/31-TET): ЛИПКИЙ октавный регистр (0..3), задаётся нижним «октавным»
   прямоугольником пальцем I–IV. Заменил фиксированный RECT_OCT. Общий для рук: любая
   рука, щипнувшая в октавной полосе, ставит его положением/пальцем. Живая связка —
   писать только через setOctReg (правило #6). Дефолт 1 = прежний RECT_OCT. */
export let octReg=1;
/* Бас (19/31-TET rect) держит СВОЙ липкий регистр, отдельный от соло: соло и бас живут в
   разных октавах, общий номер заставил бы их драться (двинул соло вверх — уехал бы и бас).
   Диапазон баса не меняется — те же 4 регистра (bassFreq на baseF/4), что и сейчас; меняется
   лишь ИСТОЧНИК номера 0..3: не «какой палец», а что выбрала октавная полоса. Дефолт 1. */
export let bassOctReg=1;
/* Аккорды (19/31-TET rect) держат СВОЙ липкий регистр КОРНЯ, отдельный от соло/баса: правая
   рука выбирает корень прямоугольником, октавная полоса (в правой половине) задаёт регистр.
   Тип по-прежнему из палитры. Диапазон не меняется — chordFreqs всё так же берёт oct; меняется
   лишь ИСТОЧНИК номера 0..3: не «какой палец», а что выбрала октавная полоса. Дефолт 1. */
export let chordOctReg=1;

/* Сеттеры: присваивать импортированному биндингу нельзя (TypeError). */
export const setScaleIdx=v=>{ scaleIdx=v; };
export const setTonic=v=>{ tonic=v; };
export const setSeventh=v=>{ seventh=v; };
export const setLeadIdx=v=>{ leadIdx=v; };
export const setChIdx=v=>{ chIdx=v; };
export const setBassIdx=v=>{ bassIdx=v; };
export const setDrumKitIdx=v=>{ drumKitIdx=v; };
export const setRevDisp=v=>{ revDisp=v; };
export const setLatchDeg=v=>{ latchDeg=v; };
export const setChordFam=v=>{ chordFam=v; };
export const setChordVar=v=>{ chordVar=v; };
export const setLatchTy=v=>{ latchTy=v; };
export const setUiMode=v=>{ uiMode=v; };
export const setPhoneInstr=v=>{ phoneInstr=v; };
export const setSwapHands=v=>{ swapHands=v; };
export const setSplitOn=v=>{ splitOn=v; };
export const setTheremin=v=>{ theremin=v; };
export const setOctReg=v=>{ octReg=v; };
export const setBassOctReg=v=>{ bassOctReg=v; };
export const setChordOctReg=v=>{ chordOctReg=v; };
/* РОЛЕВОЙ РЕЗОЛВЕР октавного регистра — ОДНО место, где решается «чей регистр»: аккорды, бас
   или соло. Ключ — ЯВНЫЙ аргумент role ('ld'|'ch'|'bs'), больше НЕ глобальный phoneInstr: при
   сплит-экране (две роли сразу) phoneInstr перестанет опознавать роль щипнувшей руки, поэтому
   роль передаём явно. Читают резолвер gestures (запись в октавной полосе + чтение при игре) и
   draw (подпись октавы) — каждый передаёт роль, которую и так знает (S.zone/instr). Нигде больше
   нет тернара 'ch'/'bs'. Вызовы — только в рантайме (TDZ ок). */
export const rectOctReg    = role => role==='ch' ? chordOctReg : role==='bs' ? bassOctReg : octReg;
export const setRectOctReg = (role,v) => { if(role==='ch') setChordOctReg(v); else if(role==='bs') setBassOctReg(v); else setOctReg(v); };
