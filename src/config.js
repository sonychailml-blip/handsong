/* ================= КОНФИГ: зоны, метаданные, пороги ================= */
export const FINGER_TIPS=[8,12,16,20];          // указ., средн., безым., мизинец
export const FXW=0.20, ZB=0.595;                // границы зон по X (доли ширины)

export const FX_META=[                           // эффекты (только соло-канал)
  {k:'dly', label:'DLY', full:'Делей',   finger:8,  color:'#4cc2ff'},
  {k:'vib', label:'VIB', full:'Вибрато', finger:12, color:'#ffb84c'},
  {k:'drv', label:'DRV', full:'Драйв',   finger:16, color:'#ff5d5d'},
  {k:'trm', label:'TRM', full:'Тремоло', finger:20, color:'#9b7bff'},
];
export const REV_COLOR='#57d9a3';
/* Акцент роли: холст красит ими сетку/ярлыки, UI — кнопку-переключатель роли.
   Общая метаданная двух слоёв → живёт здесь, а не дублируется в draw и ui. */
export const INSTR_COL={ld:'#ff9e2c', ch:'#b18cff', bs:'#3ad29f', dr:'#ffd23f'};

/* Пороги жестов и тайминги (значения 1-в-1 из исходника) */
export const PINCH_ON=0.25;                       // захват щипка
export const PINCH_HOLD=0.5;                      // смена пальца в щипке
export const PINCH_OFF=0.25;                      // отпускание
export const REV_NEAR=0.27, REV_RANGE=0.19;       // реверб: (0.27-hs)/0.19
export const ROW_HYST=0.16;                       // гистерезис ступени
export const WATCHDOG_MS=120;                     // таймаут потери руки, мс
export const SCHED_AHEAD=0.14;                    // опережение планировщика, с
export const SCHED_TICK_MS=25;                    // период планировщика, мс

export const FX_STRIP_H=52;                       // высота нижней полосы эффектов в phone-режиме, px

/* Запись как намерение (§3.4) */
export const BEATS_PER_BAR=4;                     // долей в такте — сетка записи и лупера (§3.5)
export const REC_VOL_EPS=0.03;                    // мёртвая зона громкости: тише — точку не пишем
export const REC_REV_EPS=0.03;                    // мёртвая зона реверба

/* Размеры голосовых пулов (всегда запущенные осцилляторы, правило #3 CLAUDE.md).
   Многослойный лупер: аккорды — до ~5 септаккордов (4 слоя + живой), бас — до 3 слоёв + живой.
   Числа подобрать A/B в приложении на целевом телефоне (слушать треск), поднять — секунда. */
export const CHORD_POOL_N=20;                     // голосов в пуле аккордов
export const BASS_POOL_N=4;                       // голосов в пуле баса (моно на слой)
