import { BEATS_PER_BAR } from './config.js';

/* ================= АРАНЖИРОВКА: гармония + ритм + бас как СЛОИ лупера =================
   Пользователь сам выбирает по одному из трёх списков — сочетание осмысленно, потому что
   ВЫБРАЛ ОН, а не генератор. Здесь только ДАННЫЕ шаблонов и ЧИСТАЯ генерация событий
   {t (в долях), fn, a}. Заморозку лада (sc/sev), номера слоёв и вставку в петлю делает
   recorder.loadArrangement — этот модуль без побочных эффектов (ни loop, ни AC).

   Гармонии — последовательность ступеней (0-инд.: I=0, ii=1 … vii=6), по одной на такт.
   Осмысленны лишь в 7-ступенчатом ладу (scales.supportsProgressions). */
export const PROGRESSIONS=[
  {name:'II–V–I',        degs:[1,4,0,0]},
  {name:'I–vi–ii–V',     degs:[0,5,1,4]},
  {name:'I–IV–V',        degs:[0,3,4,0]},
  {name:'Блюз (12 т.)',  degs:[0,0,0,0,3,3,0,0,4,3,0,0]},
];
/* Список гармоний для UI: дрон (без ступеней — работает в ЛЮБОМ ладу) + прогрессии
   (осмысленны лишь в 7-ступенчатых, гейтятся supportsProgressions на уровне UI). */
export const HARMONIES=[{name:'Дрон (тоника)', drone:true}, ...PROGRESSIONS];
/* Ритм — 16-шаговая сетка НА ТАКТ: элемент = null или {ряд ударных: громкость}.
   Ряды ударных (как в audio.drumHit): кик=0, снейр=1, клэп=2, хэт=3, том=4, крэш=5. */
export const RHYTHMS=[
  {name:'Бэкбит', grid:[
    {0:1,3:.35}, null, {3:.35}, null, {1:1,3:.35}, null, {3:.35}, null,
    {0:1,3:.35}, null, {3:.35}, null, {1:1,3:.35}, null, {3:.35}, null,
  ]},
  {name:'Маqсум', grid:[   // дум(ряд0)/тек(ряд3) — спасён из PAT.ethnic; на дарбука-ките звучит как маqсум
    {0:1}, null, {3:.8}, null, null, null, {3:.7}, null,
    {0:.9}, null, null, null, {3:.8}, null, {3:.4}, null,
  ]},
];
/* Бас — только «честные» режимы: корень (фундамент аккорда) и педаль (дрон-тоника). */
export const BASS_MODES=[
  {id:'none',  name:'Нет'},
  {id:'roots', name:'Основные тоны'},
  {id:'pedal', name:'Педаль (тоника)'},
];

const CHORD_VOL=0.55, BASS_VOL=0.6, STEPS_PER_BAR=16;

/* Чистая генерация: sel={prog, rhythm, bass}, ctx={chIdx, bassIdx, drumKitIdx}.
   → {bars, layers:[evList,…]} в порядке ГАРМОНИЯ, БАС, РИТМ (undo снимает сверху → сначала ритм). */
export function buildArrangement(sel, ctx){
  const { chIdx=0, bassIdx=0, drumKitIdx=0 } = ctx || {};
  const h=HARMONIES[sel.prog];
  if(!h) return null;
  const degs = h.drone ? [0,0] : h.degs;                     // дрон: неявная тоника на 2 такта (для длины/баса)
  const bars=degs.length, layers=[];
  const stepBeat=BEATS_PER_BAR/STEPS_PER_BAR;                 // доля одного 16-го

  // Гармония: дрон — один событие-маркер (выделенные узлы dO1/dO2/dG); иначе аккорд на такт
  if(h.drone) layers.push([{ t:0, fn:'drone', a:{lvl:0.18} }]);
  else layers.push(degs.map((deg,bar)=>({ t:bar*BEATS_PER_BAR, fn:'chOn',
    a:{deg, oct:0, vol:CHORD_VOL, inst:chIdx} })));

  // Бас (корни берём из degs — у дрона это тоника)
  const bass=BASS_MODES.find(b=>b.id===sel.bass);
  if(bass&&bass.id==='roots')
    layers.push(degs.map((deg,bar)=>({ t:bar*BEATS_PER_BAR, fn:'bassOn',
      a:{deg, oct:0, vol:BASS_VOL, inst:bassIdx} })));
  else if(bass&&bass.id==='pedal')
    layers.push([{ t:0, fn:'bassOn', a:{deg:0, oct:0, vol:BASS_VOL, inst:bassIdx} }]);   // тоника на весь круг

  // Ритм: сетка повторяется по тактам; набор ударных заморожен в событии (a.kit)
  const rhythm=RHYTHMS[sel.rhythm];
  if(rhythm){
    const drums=[];
    for(let bar=0;bar<bars;bar++) rhythm.grid.forEach((cell,st)=>{ if(!cell)return;
      for(const row in cell) drums.push({ t:bar*BEATS_PER_BAR+st*stepBeat, fn:'drum',
        a:{row:+row, vol:cell[row], kit:drumKitIdx} }); });
    if(drums.length) layers.push(drums);
  }
  return { bars, layers };
}
