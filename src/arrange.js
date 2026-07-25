/* Размер такта (metre) приходит через ctx.metre из loop.metre — модуль остаётся чистым (без импорта состояния). */

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
/* Каждый паттерн ОБЪЯВЛЯЕТ свой размер (beats — долей в такте) и сетку из beats*4 ячеек (16-е).
   stepBeat = beats/grid.length (у корректного паттерна = 0.25). buildArrangement кладёт паттерн, только
   если beats === текущему размеру петли (loop.metre), иначе ритм пропускается. Существующие — beats:4. */
export const RHYTHMS=[
  {name:'Бэкбит', beats:4, grid:[
    {0:1,3:.35}, null, {3:.35}, null, {1:1,3:.35}, null, {3:.35}, null,
    {0:1,3:.35}, null, {3:.35}, null, {1:1,3:.35}, null, {3:.35}, null,
  ]},
  {name:'Маqсум', beats:4, grid:[   // дум(ряд0)/тек(ряд3) — спасён из PAT.ethnic; на дарбука-ките звучит как маqсум
    {0:1}, null, {3:.8}, null, null, null, {3:.7}, null,
    {0:.9}, null, null, null, {3:.8}, null, {3:.4}, null,
  ]},
  /* --- Паттерны в НОВЫХ размерах (по 4 ячейки на долю; ряды: 0=низ, 1=акцент, 3=высокий тычок).
     Рисунок повторяет АКЦЕНТНУЮ группировку размера (см. METRE_GROUPS): узнаётся структурой, а не
     «тем же ритмом другой длины». В аранжировке всплывают только при своём размере (beats===metre). --- */
  {name:'Вальс', beats:3, grid:[            // 3/4, oom-pah-pah: тяжёлая 1, лёгкие 2 и 3
    {0:1},   null, null,   null,            // 1 — сильная доля (бас, «oom»)
    {2:.5},  null, {3:.25},null,            // 2 — лёгкая («pah»)
    {2:.5},  null, {3:.25},null,            // 3 — лёгкая («pah»)
  ]},
  {name:'Дадра', beats:6, grid:[            // индийская дадра-тал 3+3: Dha Dhin Na | Dha Tin Na, вторая половина легче
    {0:1,1:.5},   null, {3:.3}, null,       // 1 Dha — голова 1-й группы (бас+на)
    {1:.6},       null, {3:.3}, null,       // 2 Dhin
    {3:.5},       null, {3:.3}, null,       // 3 Na
    {0:.8,1:.45}, null, {3:.3}, null,       // 4 Dha — голова 2-й группы (тише)
    {1:.55},      null, {3:.3}, null,       // 5 Tin
    {3:.5},       null, {3:.3}, null,       // 6 Na
  ]},
  {name:'Балканский 7', beats:7, grid:[     // 3+2+2 — «хромает»: кик на ДЛИННОЙ группе, снейры на двух коротких
    {0:1,3:.3},  null, {3:.25},null,        // 1 — голова длинной группы (3)
    {3:.3},      null, {3:.25},null,        // 2
    {3:.3},      null, {3:.25},null,        // 3
    {1:.8,3:.3}, null, {3:.25},null,        // 4 — голова 1-й короткой (2)
    {3:.3},      null, {3:.25},null,        // 5
    {1:.7,3:.3}, null, {3:.25},null,        // 6 — голова 2-й короткой (2)
    {3:.3},      null, {3:.25},null,        // 7
  ]},
  {name:'Кехерва', beats:8, grid:[          // индийская кехерва 4+4: бас на головах вибхагов (1 и 5), 5-я легче
    {0:1,3:.3},   null, {3:.25},null,       // 1 Dha — голова 1-го вибхага
    {3:.3},       null, {3:.25},null,       // 2 Ge
    {1:.5,3:.3},  null, {3:.25},null,       // 3 Na
    {3:.3},       null, {3:.25},null,       // 4 Ti
    {0:.75,3:.3}, null, {3:.25},null,       // 5 Na — голова 2-го вибхага (тише)
    {3:.3},       null, {3:.25},null,       // 6 Ka
    {1:.5,3:.3},  null, {3:.25},null,       // 7 Dhi
    {3:.3},       null, {3:.25},null,       // 8 Na
  ]},
  {name:'Балканский 9', beats:9, grid:[     // 2+2+2+3 — три коротких и ДЛИННАЯ финальная группа (галоп к разрешению)
    {0:1,3:.3},  null, {3:.25},null,        // 1 — голова (2)
    {3:.3},      null, {3:.25},null,        // 2
    {1:.7,3:.3}, null, {3:.25},null,        // 3 — голова (2)
    {3:.3},      null, {3:.25},null,        // 4
    {1:.7,3:.3}, null, {3:.25},null,        // 5 — голова (2)
    {3:.3},      null, {3:.25},null,        // 6
    {0:.9,3:.3}, null, {3:.25},null,        // 7 — голова ДЛИННОЙ группы (3), кик
    {3:.3},      null, {3:.25},null,        // 8
    {3:.3},      null, {3:.25},null,        // 9
  ]},
  {name:'Тинтал', beats:16, grid:[          // индийский тинтал 4+4+4+4. KHALI (3-й вибхаг, доли 9–12): БАС ОТСУТСТВУЕТ (открытый баян) — структурная черта тала, «пустой» вибхаг слышен как провал низа
    {0:1,1:.6},   null, {3:.3}, null,       // 1 Dha — САМ (бас+на)
    {3:.35},      null, {3:.3}, null,       // 2 Dhin
    {3:.35},      null, {3:.3}, null,       // 3 Dhin
    {1:.5,3:.3},  null, {3:.3}, null,       // 4 Dha
    {0:.85,1:.5}, null, {3:.3}, null,       // 5 Dha — тали (бас)
    {3:.35},      null, {3:.3}, null,       // 6 Dhin
    {3:.35},      null, {3:.3}, null,       // 7 Dhin
    {1:.5,3:.3},  null, {3:.3}, null,       // 8 Dha
    {3:.4},       null, {3:.3}, null,       // 9 — KHALI: только высокий, БЕЗ баса
    {3:.35},      null, {3:.3}, null,       // 10 Tin
    {3:.35},      null, {3:.3}, null,       // 11 Tin
    {1:.4,3:.3},  null, {3:.3}, null,       // 12 Ta (высокий)
    {0:.85,1:.5}, null, {3:.3}, null,       // 13 — бас возвращается (тали)
    {3:.35},      null, {3:.3}, null,       // 14 Dhin
    {3:.35},      null, {3:.3}, null,       // 15 Dhin
    {1:.5,3:.3},  null, {3:.3}, null,       // 16 Dha
  ]},
];
/* Бас — только «честные» режимы: корень (фундамент аккорда) и педаль (дрон-тоника). */
export const BASS_MODES=[
  {id:'none',  name:'Нет'},
  {id:'roots', name:'Основные тоны'},
  {id:'pedal', name:'Педаль (тоника)'},
];

const CHORD_VOL=0.55, BASS_VOL=0.6;

/* Чистая генерация: sel={prog, rhythm, bass}, ctx={chIdx, bassIdx, drumKitIdx, metre}.
   metre — долей в такте (переменный размер, из loop.metre); дефолт 4 = прежнее поведение.
   → {bars, layers:[evList,…]} в порядке ГАРМОНИЯ, БАС, РИТМ (undo снимает сверху → сначала ритм). */
export function buildArrangement(sel, ctx){
  const { chIdx=0, bassIdx=0, drumKitIdx=0, metre=4 } = ctx || {};
  const h=HARMONIES[sel.prog];
  if(!h) return null;
  const degs = h.drone ? [0,0] : h.degs;                     // дрон: неявная тоника на 2 такта (для длины/баса)
  const bars=degs.length, layers=[];

  // Гармония: дрон — один событие-маркер (выделенные узлы dO1/dO2/dG); иначе аккорд на такт
  if(h.drone) layers.push([{ t:0, fn:'drone', a:{lvl:0.18} }]);
  else layers.push(degs.map((deg,bar)=>({ t:bar*metre, fn:'chOn',
    a:{deg, oct:0, vol:CHORD_VOL, inst:chIdx} })));

  // Бас (корни берём из degs — у дрона это тоника)
  const bass=BASS_MODES.find(b=>b.id===sel.bass);
  if(bass&&bass.id==='roots')
    layers.push(degs.map((deg,bar)=>({ t:bar*metre, fn:'bassOn',
      a:{deg, oct:0, vol:BASS_VOL, inst:bassIdx} })));
  else if(bass&&bass.id==='pedal')
    layers.push([{ t:0, fn:'bassOn', a:{deg:0, oct:0, vol:BASS_VOL, inst:bassIdx} }]);   // тоника на весь круг

  // Ритм: только паттерн СВОЕГО размера (beats===metre), иначе пропускаем. stepBeat — из самого паттерна.
  const rhythm=RHYTHMS[sel.rhythm];
  if(rhythm && (rhythm.beats||4)===metre){
    const stepBeat=(rhythm.beats||4)/rhythm.grid.length;     // доля одной ячейки (у 16-й сетки = 0.25)
    const drums=[];
    for(let bar=0;bar<bars;bar++) rhythm.grid.forEach((cell,st)=>{ if(!cell)return;
      for(const row in cell) drums.push({ t:bar*metre+st*stepBeat, fn:'drum',
        a:{row:+row, vol:cell[row], kit:drumKitIdx} }); });
    if(drums.length) layers.push(drums);
  }
  return { bars, layers };
}
