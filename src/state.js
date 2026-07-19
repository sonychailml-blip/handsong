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
