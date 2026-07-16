/* ================= СОСТОЯНИЕ ================= */
export let scaleIdx=11, tonic=9;                 // старт: минорная пентатоника от A
export let seventh=false, leadIdx=0, chIdx=0;
export const fx={dly:0.25, vib:0.20, drv:0.12, trm:0.0};
export let revDisp=0;                            // отображение Z-реверба соло-руки

/* Сеттеры: присваивать импортированному биндингу нельзя (TypeError). */
export const setScaleIdx=v=>{ scaleIdx=v; };
export const setTonic=v=>{ tonic=v; };
export const setSeventh=v=>{ seventh=v; };
export const setLeadIdx=v=>{ leadIdx=v; };
export const setChIdx=v=>{ chIdx=v; };
export const setRevDisp=v=>{ revDisp=v; };
