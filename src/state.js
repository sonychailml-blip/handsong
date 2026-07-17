/* ================= СОСТОЯНИЕ ================= */
export let scaleIdx=11, tonic=9;                 // старт: минорная пентатоника от A
export let seventh=false, leadIdx=0, chIdx=0, bassIdx=0;
export const fx={dly:0.25, vib:0.20, drv:0.12, trm:0.0};
export let revDisp=0;                            // отображение Z-реверба соло-руки
export let latchDeg=-1;                          // защёлкнутая ступень аккорда, -1 = тишина

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
export const setRevDisp=v=>{ revDisp=v; };
export const setLatchDeg=v=>{ latchDeg=v; };
export const setUiMode=v=>{ uiMode=v; };
export const setPhoneInstr=v=>{ phoneInstr=v; };
export const setSwapHands=v=>{ swapHands=v; };
