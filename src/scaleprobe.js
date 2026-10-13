/* ⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
   Никто его не импортирует: модуль грузится только руками из консоли браузера, при открытом приложении:
     const P = await import(new URL('src/scaleprobe.js', location.href).href);
     P.all()            // ВСЁ РАЗОМ: каждая проба по порядку, ОДНА сводная таблица (проба, случаи, материал песни, расхождения, время) и вердикт;
                        //   песенные проверки НЕ засчитываются на пустой или бедной песне — «song: not enough material» и чего не хватает
     await P.quick()    // БЫСТРЫЙ БАРЬЕР (слайс «быстрые пробы»): строки P.all без прогонов по всем видам (их гоняет node — tools/probe-data.mjs) и без
                        //   прокрутки всех дорожек кадрами; рендеры — коротким окном. Цель < 30 с; время — в итоговой строке
     await P.checkRepeat({evidence:true})   // доказательства повторяемости рендера по запросу (обход стадии выразительности, по эффекту, живая проводка реверба)
     await P.seed({replace:true})   // ТЕСТОВАЯ ПЕСНЯ: детерминированная, через воронки рекордера (push, редактор, подложка); ЗАМЕНЯЕТ песню
     await P.song('triphop', {replace:true})   // ДЕМО-ПЬЕСА (src/songs.js): тем же образцом, что P.seed; ЗАМЕНЯЕТ песню. P.all после неё — тоже PASS
     P.check()          // T0 (данные) + T1 (частоты и центы) + T2 (вид) — сводка и каждое несовпадение
     (по отдельности: P.checkData(), P.checkPitch(), P.checkView(); справка о дроне — P.drone())
     P.checkWrite()     // ЗАПИСЬ ГЛАЗАМИ ЖЕСТА: известные нагрузки (роль × вид строя × регистр × ступень) через НАСТОЯЩИЕ воронки (взятое в
                        //   песочнице и подложка) — каждое поле и цена против истины из СТУПЕНИ ЖЕСТА
     P.checkSeed()      // каждая нота P.seed (или P.song) — как задумана (ступень, регистр, тембр, громкость, тип, бенд)
     P.checkFrozen()    // замороженный бас в раге (P.seed): пик, rms и длина буфера против ожидаемых — «внезапно тихо» = расхождение; у P.song — неприменимо
     P.checkSong()      // T4c-2: ЦЕЛОСТНОСТЬ ПЕСНИ БЕЗ СТУПЕНИ — ни одно событие не несёт ступени; цены, сегменты, догонялка на каждой доле, ряды
                        //   редактора (ряд ↔ индекс, призрак на своём ряду) и распад — правильной формы и равны замороженным опорам;
                        //   T5: высота — В СТРОЕ (не обязательно в ладу); вне лада — опора по ЦЕЛОМУ строю, подсветки нет, на оси «Лад» — между рядами
     P.dumpScales()     // F0 «строи файлами»: КАНОНИЧЕСКИЙ СНИМОК всего, что относится к ладам (данные, меню, дрон, подписи) — скачивается
                        //   файлом scales.before.json; положить его в tools/ (снимается на коде ДО переезда)
     P.checkUserDelete() // F6: УДАЛЕНИЕ ФАЙЛА ПОЛЬЗОВАТЕЛЯ НЕ ЛОМАЕТ ЗАПИСАННОЕ — лад пользователя ставится, в нём пишется взятое (песочница
                        //   probeTake), лад и строй удаляются — цена, ряды и подписи записанного === до удаления (нужен ▶ Play)
     P.checkUserChordModes() // F6b: СВОЙ НАБОР РЕЖИМОВ АККОРДОВ — три режима со своими именами: имена (и кнопки панели), цена каждого режима
                        //   по его переопределениям, записанные аккорды держат свой режим при переключении (правило T7b; нужен ▶ Play)
     P.checkRootAlone() // F8: ЩИПОК НА КОРНЕ, ГДЕ ТИПА НЕТ В СТРОЕ — ЗВУЧИТ ОДИН КОРЕНЬ: правило по каждому виду, типу и корню; засеянный щипок
                        //   в Партче «Как на инструменте» хранит однонотный аккорд на высоте корня, тот же в «Свободно» — целый тип
     P.checkBare()      // F7-починка: ГОЛЫЙ ЛАД = ВИД ЕГО РЕЖИМА ПО УМОЛЧАНИЮ — поля аккордов, цены и подписи (у каждого лада с режимами)
     P.checkMerge()     // F7: ДВА НАТУРАЛЬНЫХ → ОДИН: каждая предустановка слитого лада против ЗАМОРОЖЕННОЙ записи прежнего лада — каждая цена (===)
                        //   и каждая подпись; псевдонимы ведут на предустановку
     await P.renewSnapshot() // F5b: пересъёмка снимка — ТОЛЬКО если все расхождения P.checkFiles — объявленное изменение (уход tag)
     P.checkBehaviour() // F4: ПОВЕДЕНИЕ ДАННЫМИ — дрон (оба положения ухо-переключателя), прогрессии, ритм джема, строка статуса —
                        //   против замороженного кода до F4: каждый вид × 12 тоник (статус — en/ru)
     P.checkNames()     // F3: ИМЕНА ДАННЫМИ — подписи по схеме строя/лада против ЗАМОРОЖЕННЫХ подписей до F3: каждый вид × ступень ×
                        //   12 тоник × en/ru (ступень, ряд, шаг, корень, аккорд и его ноты, слово периода) + ряды обеих осей редактора
     await P.checkFiles() // F0: живой реестр против tools/scales.before.json, поле за полем ===; нет файла — «снимка ещё нет»
     P.checkTypes()     // тип аккорда — в сборке своего вида (отношения / шаги), ни одной ноты на 0 Гц: каждый вид каждого режима и вся песня
     P.checkOut()       // T5: ВЫСОТЫ ВНЕ ЛАДА — прогон: каждая приглушённая высота каждого вида × регистр — цена соло/баса, однонотный аккорд и
                        //   вариант (а) (целый аккорд с формой) против опоры по целому строю; ряды обеих осей
     P.checkStack()     // «стопка»: у ладов stack каждый тон аккорда — внутри лада; подписи вменяемы (таблица до-мажорной пентатоники и блюза)
     P.checkUntyped()   // T6b: нетипизированные аккорды — прогон: цена по правилу лада (по ступени и от индекса корня) против замороженной опоры
     P.checkLabels()    // T6c: подписи аккорда (chordLabel, chordNotesStr) по правилу лада против замороженных по tag — вид × ступень × септаккорд × 12 тоник
     P.checkRules()     // T6a: правило аккордов лада (chordRule) = прежний выбор по tag; нетипизированные аккорды — только на равных строях; проверки вида молчат на песне
     P.checkScroll()    // T6a-2: прокрутка редактора через «Все/Лад» — та же высота в окне, по каждому виду
     P.tracks()         // МАРШРУТ ПО СТРОЮ: каждая дорожка песни — роль, тембр, вид строя (и сколько видов в ней: больше одного быть не должно)
     P.checkHl()        // T4b4: ПОДСВЕТКА по индексу — прогон по видам (место из индекса = ступень и регистр, из которых он сделан); высоты вне лада
     P.checkRowFix()    // T4b4-1: нижний ряд по умолчанию в обеих осях и ряды нот аккорда при холодном и прогретом кэше
     P.checkRows()      // T4b3: РЯДЫ РЕДАКТОРА по индексу против замороженных рядов по ступени — прогон по видам, обе оси
     P.checkSound()     // T4b1: цена ПО ИНДЕКСУ В СТРОЕ против замороженных опор — прогон по всем видам
   ⛳ T4c-2: ПЕСЕННЫЕ ПРОБЫ, СВЕРЯВШИЕ СО ХРАНИМОЙ СТУПЕНЬЮ (T4a checkTi, T4b2 checkLogic, T4c-1 checkStrip, песенные части T4b1/T4b3/T4b4/T6b),
   сняты — ступени в событиях больше нет; их защиту несёт P.checkSong. Прежние тела функций (их «опоры») переехали сюда — раздел
   «ЗАМОРОЖЕННЫЕ ОПОРЫ» ниже; в приложении прежнего кода нет.
   Импорт по ТОМУ ЖЕ адресу, что у приложения ('./scales.js' без строки запроса), — значит проба видит ТЕ ЖЕ объекты ладов, что и
   приложение, а не вторую копию модуля.
   ⛳ ЗАЧЕМ (HANDOFF, «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ», метод доказательства): каждый слайс модели, который НЕ ДОЛЖЕН менять звук,
   принимается ТОЛЬКО при НУЛЕ несовпадений. Сравнение — строгим ===, без допусков: допуск спрятал бы ровно то, что проба ловит.
   T0: записи строёв и ладов — данные. Проверяется, что выборка каждого лада, ВЫВЕДЕННАЯ из его же чисел (scales.modeDerive; с F2 выборка — сама ДАННЫЕ, а центы выводит из неё сборщик),
   даёт КАЖДОЙ ступени (и верхней тонике) те же центы, что сегодня, а у равных строёв — те же шаги и тот же показ центов.
   T2: ВИД (строй, лад, якорь) — тождество видов (один объект на лад и якорь) и та же высота через вид, что через сам лад (у Пифагора —
   через прежний вариант {...лад, tunedFrom}), === по тому же пространству, что T1.
   T1: ЧАСТОТЫ. Новая функция высоты (scales.pitchHz под leadFreq/bassFreq/chordNotes/tonicFreq/centsOf) против ПРЕЖНИХ тел
   (scales.legacy*) — по всем ладам (у Пифагора — каждый «строй от»), ролям (соло, бас, аккорды всех типов, дрон), ступеням, регистрам,
   всем 12 тоникам и нескольким эталонам A4, плюс показ центов. Сравнение === (у аккордов — каждая нота: частота И интервал).
   ⛔ Ничего не сохраняет и не играет. ⚠️ T1 на время прогона ПЕРЕСТАВЛЯЕТ живые тонику и эталон A4 (через их сеттеры — иначе их не
   перебрать) и ВОЗВРАЩАЕТ их в finally; прогон синхронный, поэтому ни кадр, ни планировщик между ними не вклиниваются. Звучащие
   голоса частоту сами не перечитывают — их не задевает. */
import { SCALES as SCALES_ALL, TUNINGS as TUNINGS_ALL, scaleView, chordFams, chordUnit, droneDegree, tuningIndexOf, leadFreqTi, bassFreqTi, chordNotesAt, REG_N, modeSlotOfTi, viewIdOf, chordLabel, chordNotesStr,
         leadFreq, bassFreq, chordNotes, chordRowFreq, tonicFreq, centsOf, ruleChordSteps,
         CUR, IVX, NOTE_NAMES, stepName, qual, SEV, ROMAN, fifthStep, periodOf, baseF, keyOf, cFix, chordBuildOf, chordTypeFits, chordPitchHz, pitchHz, chordModeOf, CHORD_FAM_SETS as CFS_ALL, TRADITIONS, GRP, menuOf, scaleById, regWord, rootName, range, droneNonOct, chordRowFreqAt, regWordFull, rowLabel, OCT_ROMAN, tuningOf, name24, supportsProgressions, backingRhythmOf, tuningStatus, degCentsExact, DRONE_TOL, setDroneNonOct, scaleData, registerRecord, unregisterRecord, chordModeName, chordModeHint, viewOfId, resolveScaleId, applyScaleId, namingOf, chordAtRoot } from './scales.js';   // F8: что звучит на корне   // F7: псевдонимы ладов   // F0: снимок «строи файлами»   // T7: как строятся аккорды строя, тип целиком в строе, высота строя в регистре аккордов   // T4c-2: последняя строка — то, что читают ЗАМОРОЖЕННЫЕ ОПОРЫ (ниже)
import { tonic, aRef, setTonic, setARef, scaleId, tunedFrom, seventh, setScaleId, setTunedFrom, setSeventh, chordModeSel, setChordMode, setChordModeSel, laneRow0, setLaneRow0, arrOpen, arrFace, rollOpen, rollBeat0, rollSpan,
         fx as liveFx, fxChains, chainOwners, chainKeyOf, leadIdx, chIdx, bassIdx, drumKitIdx, voiceMode } from './state.js';   // страж P.all: живое состояние звука, которое читает рендер   // laneRow0 — прокрутка полосы дорожек (P.checkTracks листает её и возвращает)   // T7b: режимы аккордов — сценарий P.seed и прогон P.checkModes (и их возврат)   // P.seed: лад, «строй от» и септаккорд сценария — и их возврат
import { checkRecord } from './scaleload.js';
import * as SELF from './scaleprobe.js';   // AUTO-PROBE: сам модуль — для стража консоли (api() оборачивает его функции)
import { hooks } from './hooks.js';   // F6b: перестройка панели (hooks.scales) — проверка кнопок режимов аккордов   // F6: та же проверка записи, что у загрузчика и консоли файлов пользователя
import { example as userExample, chordModesExample as userCmExample } from './userfiles.js';   // F6b: свой набор из трёх режимов аккордов   // F6: пример файла пользователя — материал пробы удаления
import { L, t, withLang } from './i18n.js';   // T7: подписи типов в отчёте P.checkPure; F0: имена режимов аккордов (t) и язык снимка без записи выбора (withLang)
import { rollRowsProbe as RP, loopViewProbe, loopHit, loopScroll, arrGeom, rollGeom, laneTitle, laneCol, laneDefName, stripProbe } from './draw.js';   // AR2-fix: stripProbe — тексты полосы игры на заданной ширине   // AR2: имя и цвет дорожки (P.checkTrackLook)
import { INSTR_COL, LANE_NOROLE_COL } from './config.js';   // AR2: палитра ролей — данные, которые сверяет P.checkTrackLook
import { arrApi } from './ui.js';
import { qBegin, qEnd, qStep, qAdd, qRank, qRunning, qState, qCostSet, qCostOf } from './frzqueue.js';   // AF1: очередь автозаморозки — шаг вручную на подменённых часах и воротах (P.checkFreezeQueue)
import { setMasterLevel, masterLevel, masterMeter, ownerGain, ownerPan, fxSnapshot, timbresOf, AC as LIVE_AC } from './audio.js';   // AF1: LIVE_AC — буфер-пустышка поддельного рендера (P.checkFreezeQueue)   // AR2: timbresOf — имя тембра для независимой сборки имени по умолчанию   // MX1: мастер и множитель уровня дорожки живого движка — P.checkMixer; MX2: ownerPan — панорама по ключу владельца (P.checkPan)   // AR1: открыть/закрыть окно аранжировки и дорожку из него — те же входы, что у кнопок (P.checkArrange)   // полоса дорожек: снимок последнего кадра, попадание, окно прокрутки — P.checkTracks   // пути рядов редактора без открытого редактора (и частоты рядов для замороженных рядов по ступени)
import { events, evHz, evReg, segChordNotes, probeTake, backingEvent, songSegs, chaseFor, chaseNote, hlOf, laneRoleOf, laneTimbreOf, viewAudit,
         seedTake, clearRec, editOpen, editClose, editSetLayer, editIsOpen, editDeleteChordNote, editMoveChordNote, editMoveSeg, chordMoveTy, editInsertBass, editInsertChord, loadJam, braceTap, setRegionOn,
         onLoop, loop, songBeats, setLoopMetre,
         songNotes, editResizeSeg, editDeleteSeg, editInsertLead, editUndo, editRedo, freezeState, recording,
         tiePartners, laneEditVerOf, freezeTicket, laneDelTap,
         laneAudible, toggleLaneMute, toggleLaneSolo, laneMuted, laneSoloed, laneSoloOn, editLayer,
         laneLevelOf, setLaneLevel, frzBusGain, lanePanOf, setLanePan, autChainOf,
         laneNameOf, setLaneName, laneOrder, moveLane, laneShowKeep,
         unfreezeLayer, laneLenOf, frozenInfo } from './recorder.js';   // AF1: P.checkFreezeQueue / P.freezeCost   // AR2: имя, порядок показа, перестановка, снимок таблиц (P.checkTrackLook)   // MX1   // P.checkTracks   // S4: правка соло — P.seed (ч. 9) и P.checkSoloEdit   // T4c-2: песенная строка (P.checkSong) — цена, реестр, подсветка, сегменты, догонялка, распад
import { isUserId, SCALES, TUNINGS, CHORD_FAM_SETS, userCount, tagOf, isTert, legacyChordLabel, legacyChordNotesStr, legacyChordNotesRef, preF3RegWord, preF3RegWordFull, preF3RootName, preF3StepName, preF3RowLabel, preF3ChordLabel, preF3ChordNotesStr, preF3NoteLbl, preF3AxisLbl, preF4Status, PRE_T7_SETS, preT7ChordNotesAt, preT7ChordNotes, preT7ChordUnit, legacyLeadFreq, legacyBassFreq, legacyChordNotes, check, checkData, A4_SET, PRINT_MAX, OLD, allViews, sweep, checkPitch, checkView, drone, checkUntyped, checkStack, canon, snapViews, checkBehaviour, KEEP_MAX } from './probedata.js';   // слайс «быстрые пробы»: пробы данных и их опоры — в probedata.js (грузится и в node)
export { check, checkData, checkPitch, checkView, drone, checkUntyped, checkStack, checkBehaviour } from './probedata.js';
/* ⛳ F6: ПРОБЫ — ПО ВСТРОЕННЫМ ЛАДАМ. Файлы пользователя (id «u.…», userfiles.js) в прогоны и снимок F0 не входят: их нет ни в
   замороженных опорах, ни в снимке, и знать о них сверке нечего. Реестры ниже — живые таблицы scales без записей пользователя (снимок
   при загрузке пробы; встроенные во время сеанса не меняются). Удаление файла пользователя проверяет отдельная проба P.checkUserDelete. */
/* Прежние РЯД и НОТЫ сегмента редактора ПО СТУПЕНИ (были draw.legacyRollSegRoot/legacyRollSegNotes, T4b3). Синтетический сегмент прогона
   несёт ступень сам (s.deg); частоты рядов оси, место частоты среди них и допуск «на ряду» — те же функции и число, что у рисунка
   (draw.rollRowsProbe: rowFreqs/rowOfFreq/onRowCents). Призрак по ступени не нужен: его сверяла только песенная часть, снятая в T4c-2. */
function refRollSegRoot(s,ax){ return ax.rowOf(s.deg,s.oct); }
function refRollSegNotes(s,ax,total){
  const r0=ax.rowOf(s.deg,s.oct);
  if(s.role!=='ch') return [{ r:r0, dev:null }];
  const N=legacyChordNotesRef(s.deg,s.oct,s.sc,s.sev,s.ty), F=RP.rowFreqs(ax,s.sev,total), dpo=ax.rpp;
  const fr=chordRowFreq(s.deg,s.oct,s.sc,s.sev);
  return N.map(n=> Math.abs(1200*Math.log2(n.f/fr))<RP.onRowCents ? { r:r0, dev:null } : RP.rowOfFreq(n.f,F,dpo,total));
}

/* ═══ T4b1: ЗВУК ЧИТАЕТ ИНДЕКС В СТРОЕ — ПРОГОН ═══
   Каждый вид × тоники × A4 × регистры × ступени 0..n (столько и пишут пути записи) × все типы — ступень → индекс функцией записи
   (tuningIndexOf), цена из индекса против ЗАМОРОЖЕННОЙ опоры (прежняя цена по ступени) — ===. Тоника и показ центов — как в T1.
   ⛳ T4c-2: песенная часть (цена из a.ti против цены по хранимой ступени) снята вместе со ступенью — её защиту несёт P.checkSong. */
export function checkSound(){
  const TI={ lead:(d,o,v)=>leadFreqTi(tuningIndexOf(d,v,false),o,v), bass:(d,o,v)=>bassFreqTi(tuningIndexOf(d,v,false),o,v),
             chord:(d,o,v,sev,ty)=>chordNotesAt(tuningIndexOf(d,v,true),o,v,sev,ty), tonic:tonicFreq, cents:centsOf };
  const r=sweep('T4b1',['from ti','old'],TI,OLD,(s,tf)=>{ const v=scaleView(s,tf); return [v,v]; }, { melMax:n=>n, chMax:n=>n });
  if(!r.total) console.log('[scaleprobe T4b1] every sweep case prices identically from the tuning index');
  return { sweep:r };
}

/* ═══ T4b3: РЯДЫ И РИСОВАНИЕ РЕДАКТОРА ЧИТАЮТ ИНДЕКС В СТРОЕ ═══
   Работает БЕЗ открытого редактора: ось строится для каждого вида (draw.rollRowsProbe.axis), обе оси — «Все» и «Лад».
   ⛳ T4c-2: ПЕСЕННАЯ ЧАСТЬ (ниже — п. 1) СНЯТА: прежний путь читал хранимую ступень, её нет; её защиту несёт P.checkSong. Был:
   1) ПЕСНЯ: каждый сегмент каждой дорожки (соло, бас, аккорды), сгруппированный, как группирует редактор (дорожка, роль, ССЫЛКА на вид):
      • высота оси аккордов (rollChordTotal — сколько рядов) — путь индекса против прежнего;
      • РЯД КОРНЯ (он же ряд блока баса/соло и rootRow попадания) и КАЖДАЯ нота блока — ряд и отступление в центах (по нему блок
        рисуется «вне ряда», им же решается выделение-контур) — путь индекса против прежнего;
      • ПОПАДАНИЕ: палец на ряду каждой ноты, на ряду корня и в ±0.3/±0.49 ряда от них — какую ноту берёт (номер) и на каком расстоянии;
      • ПРИЗРАК переноса целого аккорда: для КАЖДОГО яркого ряда оси — ноты сегмента, поставленного туда (путь индекса: с индексом, который
        поставит правка; прежний: только ступень и регистр);
      • выделение одной ноты и её призрак берут ряды из того же списка нот — сверены выше.
      Полоса «в ноте» (громкость, яркость …) строится из величин и времени нот — ни ступени, ни ряда не читает; сверять там нечего.
   2) ПРОГОН: каждый вид × обе оси × регистры 0..3 × ступени 0..n — ряд из ступени (rowOf) против ряда из индекса (rowOfTi от tuningIndexOf
      по закону мелодии/баса и по закону аккорда); и ряды нот аккорда (корень и каждая нота) для каждого типа лада, без типа (септаккорд
      выкл/вкл) и единицы корня — путь индекса против прежнего.
   Кэш частот рядов аккордов сбрасывается перед каждым расчётом, который его заполняет (RP.reset), — оба пути считаются при одном его
   состоянии. Сравнение ===. Принимается ТОЛЬКО при нуле. Ничего не меняет. */
export function checkRows(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const cmpNotes=(at,N,O)=>{
    if(N.length!==O.length){ miss(`${at}: ${N.length} blocks new, ${O.length} legacy`); return; }
    for(let i=0;i<N.length;i++) if(N[i].r!==O[i].r||N[i].dev!==O[i].dev) miss(`${at} note ${i}: row ${N[i].r} dev ${N[i].dev} new, row ${O[i].r} dev ${O[i].dev} legacy`);
  };
  const VIEWS=[['all',true],['mode',false]];
  const songBad=0;
  // ---- 2) прогон по видам ----
  let nRow=0, nTone=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), total=2*REG_N*ax.rpp;
      RP.reset();
      for(let o=0;o<4;o++) for(let d=0;d<=n;d++){
        const want=ax.rowOf(d,o), at=`${id} [${vn}] degree ${d} reg ${o}`;
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,false),o); if(got!==want) miss(`${at}: melody/bass row from ti ${got}, from degree ${want}`); }
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,true),o); if(got!==want) miss(`${at}: chord-root row from ti ${got}, from degree ${want}`); }
        for(const [ty,sev] of tys){
          if(!ty && v.chordRule && v.chordRule.kind==='none') continue;   // T6b: «аккорда нет» — проверяет P.checkUntyped
          const g={ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty };
          nTone++; const rN=RP.root(g,ax), rL=refRollSegRoot(g,ax);
          const tt=`${at} chord ${ty?'['+ty.join(',')+']':'none'}${sev?' 7th':''}`;
          if(rN!==rL) miss(`${tt}: root row ${rN} new, ${rL} legacy`);
          cmpNotes(tt, RP.notes(g,ax,total), refRollSegNotes(g,ax,total));
        }
      }
    }
  }
  console.log(`[scaleprobe T4b3] sweep: rows ${nRow} · chord placements ${nTone} (every view, both views of the axis, registers 0..3, degrees 0..n) · differences ${nBad-songBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b3] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b3] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b3] every row and chord placement is identical when read from the tuning index');
  RP.reset();
  return { rows:nRow, chords:nTone, total:nBad, differences:bad };
}

/* ═══ T4b4-1: ДВЕ ПРАВКИ РЯДОВ РЕДАКТОРА (ВИДИМЫЕ) ═══
   1) НИЖНИЙ РЯД ПО УМОЛЧАНИЮ (draw.rollDefaultRow0For): каждый вид × обе оси × регистр 0..3 × несколько высот окна — ряд корня регистра
      reg·rpp ВИДЕН в окне [row0, row0+rows); у оси «Лад» row0 равен прежней формуле (iv.length+1 рядов на регистр); у оси «Все» печатается,
      во скольких случаях прежняя формула открыла бы не тот регистр (это и есть правка).
   2) РЯДЫ НОТ АККОРДА НЕ ЗАВИСЯТ ОТ ИСТОРИИ КЭША: каждый вид × обе оси × ступень 0..n × регистр 0..3 × каждый тип лада, без типа и
      единица корня — ряды и отступления нот при ХОЛОДНОМ кэше против прогретого ДРУГИМ вызывающим (ось втрое длиннее), ===. */
export function checkRowFix(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const VIEWS=[['all',true],['mode',false]];
  let nDef=0, nOld=0, nCache=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), rpp=ax.rpp, T=REG_N*rpp;
      // ---- 1) нижний ряд по умолчанию ----
      for(let reg=0; reg<REG_N; reg++) for(const rows of [1,5,8,rpp,2*rpp,T,T+3]){
        nDef++; const r0=RP.defRow0(v,reg,rows,ax), at=`${id} [${vn}] register ${reg} window ${rows} rows`;
        if(!(r0>=0 && reg*rpp>=r0 && reg*rpp<r0+rows)) miss(`${at}: bottom row ${r0} does not show register ${reg} (its root row ${reg*rpp})`);
        const old=Math.max(0, Math.min(reg*(n+1), 4*(n+1)-rows));
        if(!all||rpp===n+1){ if(r0!==old) miss(`${at}: bottom row ${r0}, the old formula gives ${old} (they must agree where rows per register = degrees + 1)`); }
        else if(!(old>=0 && reg*rpp>=old && reg*rpp<old+rows)) nOld++;
      }
      // ---- 2) кэш частот рядов ----
      const segs=[];
      for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++) for(const [ty,sev] of tys) segs.push({ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty });
      RP.reset(); const cold=segs.map(g=>RP.notes(g,ax,T));
      RP.reset(); RP.notes(segs[0],ax,3*T);                    // прогрев ДРУГИМ вызывающим: таблица втрое длиннее оси
      for(let i=0;i<segs.length;i++){ nCache++; const g=segs[i], W=RP.notes(g,ax,T), C=cold[i];
        const at=`${id} [${vn}] chord degree ${g.deg} reg ${g.oct} ${g.ty?'['+g.ty.join(',')+']':'none'}${g.sev?' 7th':''}`;
        if(W.length!==C.length){ miss(`${at}: ${W.length} notes warm, ${C.length} cold`); continue; }
        for(let k=0;k<W.length;k++) if(W[k].r!==C[k].r||W[k].dev!==C[k].dev) miss(`${at} note ${k}: row ${W[k].r} dev ${W[k].dev} with a warm cache, row ${C[k].r} dev ${C[k].dev} cold`); }
    }
  }
  RP.reset();
  console.log(`[scaleprobe T4b4-1] default bottom row: ${nDef} cases (in "All", the old formula would have opened the wrong register in ${nOld}) · chord rows cold vs warm cache: ${nCache} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4-1] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4-1] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b4-1] the roll opens on the live register in both views, and chord rows no longer depend on cache history');
  return { defaults:nDef, oldWrong:nOld, cache:nCache, total:nBad, differences:bad };
}

/* ═══ T4b4: ПОДСВЕТКА ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   Без рук и без редактора. Место подсветки переигранной/догнанной ноты — recorder.hlOf (индекс → обратная выборка лада) против прежнего
   legacyHlOf (ступень и регистр события), сравнение ===:
   1) ПРОГОН: каждый вид × закон аккорда и закон мелодии/баса × ступень 0..n × регистр 0..3;
   2) ВЫСОТЫ ВНЕ ЛАДА: у видов, чей лад меньше строя, — каждая высота строя без ступени лада, в регистрах 0..3 и через перенос периода —
      обязана дать «нет места» (null), не бросив;
   ⛳ T4c-2: песенные части (3 — события песни, 4 — догонялка) сравнивали с ХРАНИМОЙ ступенью — сняты; их защиту несёт P.checkSong.
   Опора прогона — сама пара (ступень, регистр), из которой сделан индекс (прежний legacyHlOf возвращал ровно её).
   Живые подсветки (ступень жеста в реестрах leadHold/bassHold, защёлка latchDeg, ярлыки рук) не менялись — сравнивать там нечего. */
export function checkHl(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const same=(N,O)=> !!N && !!O && N.deg===O.deg && N.oct===O.oct;
  const show=p=> p ? `${p.deg}/${p.oct}` : 'none';
  let nSweep=0, nOut=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    for(const chord of [true,false]) for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++){
      nSweep++; const a={ deg:d, oct:o, ti:tuningIndexOf(d,v,chord) }, N=hlOf(a,v), O={ deg:d, oct:o };
      if(!same(N,O)) miss(`${id} ${chord?'chord':'melody'} degree ${d} reg ${o}: from ti ${show(N)}, legacy ${show(O)}`);
    }
    const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, inMode=new Set(v.sel.map(k=>k-v.root));
    if(v.sel.length<E) for(let j=0;j<E;j++){ if(inMode.has(j)) continue;
      for(let o=0;o<REG_N;o++) for(const c of [0,1,-1]){ nOut++;
        let p; try{ p=modeSlotOfTi(v.root+j+E*c,o,v); }catch(e){ miss(`${id} pitch ${j} reg ${o}: threw ${e&&e.message}`); continue; }
        if(p!==null) miss(`${id} out-of-mode pitch ${j} (+${c} period) reg ${o}: gave a slot ${show(p)}`); } }
  }
  console.log(`[scaleprobe T4b4] sweep ${nSweep} · out-of-mode pitches ${nOut} (no slot, none threw) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b4] every highlight read from the tuning index lands on the degree and register it was made from');
  return { sweep:nSweep, outOfMode:nOut, total:nBad, differences:bad };
}

/* ═══ МАРШРУТ ПО СТРОЮ — ЧТО ЛЕЖИТ В КАЖДОЙ ДОРОЖКЕ (справка, не проверка; ничего не меняет) ═══
   Строка на дорожку: L-номер, роль (laneRoleOf), тембр (laneTimbreOf — индекс тембра роли / набора ударных), вид(ы) строя её высотных
   событий (scales.viewIdOf — тот же, что в ключе маршрута), число событий и подложка ли. Видов больше одного — предупреждение: так могла
   лечь только запись, сделанная ДО маршрута по строю (ничего не сохраняется — после перезагрузки таких нет). */
export function tracks(){
  const L=new Map();
  for(const e of events){
    let r=L.get(e.layer); if(!r){ r={ views:new Set(), n:0, jam:false }; L.set(e.layer,r); }
    r.n++; if(e.jam) r.jam=true;
    if(e.sc && e.fn!=='drum' && e.fn!=='drone') r.views.add(viewIdOf(e.sc));
  }
  const rows=[...L.keys()].sort((a,b)=>a-b).map(ly=>{ const r=L.get(ly);
    return { track:'L'+(ly+1), role:laneRoleOf(ly)||'-', timbre:laneTimbreOf(ly)??'-', view:[...r.views].join(' + ')||'-', events:r.n, backing:r.jam }; });
  console.table(rows);
  const mixed=rows.filter(x=>x.view.includes(' + '));
  if(mixed.length) mixed.forEach(x=>console.warn(`[scaleprobe tracks] ${x.track} holds ${x.view.split(' + ').length} tuning views: ${x.view} (recorded before routing by tuning)`));
  else console.log(`[scaleprobe tracks] ${rows.length} tracks, each with one tuning view at most`);
  return rows;
}

/* ═══ T6a: ПРАВИЛО АККОРДОВ ЛАДА — ДАННЫЕ (chordRule) ═══
   1) у каждого из 75 ладов правило есть, его вид — один из пяти, и он РАВЕН сегодняшнему выбору по tag (тот же порядок, что chordSteps:
      noChords → none; isTert → tertian; tag 'edo' → ratios; есть палитра → palette; иначе power); полей chord/chord7 больше нет;
   2) перенос отношений 19/31-TET: массивы правила — прежние числа, и ruleChordSteps (путь приложения, T4c-2) даёт те же шаги, что прежняя
      формула от прежних литералов, — каждая ступень 0..n, триада и септаккорд (===);
   3) ДАННЫМИ ДОКАЗАНО, что смена определения у нетипизированных аккордов центового лада (T6b) недостижима: каждый лад с аккордами и без
      палитры стоит на РАВНОМ строе, и правило ratios — тоже только на равном;
   4) вид лада несёт то же правило (scaleView копирует поля);
   5) песня: каждый хранимый аккорд без типа — в виде, чьё правило строит аккорды (tertian/power/ratios); защитные проверки вида
      (recorder.viewAudit — тот же предикат, что пишет в консоль) не находят ни ноты через два вида, ни дорожки с двумя видами.
   Ничего не меняет и не играет. */
export function checkRules(){
  const bad=[]; const miss=m=>bad.push(m);
  const KINDS=new Set(['tertian','stack','power','ratios','palette','none']);
  const OLD={ 'edo19-full':{ triad:[1,6/5,3/2], seventh:[1,6/5,3/2,9/5] }, 'edo31-full':{ triad:[1,5/4,3/2], seventh:[1,5/4,3/2,7/4] } };   // прежние литералы chord/chord7
  const same=(a,b)=> !!a && !!b && a.length===b.length && a.every((x,i)=>x===b[i]);
  const byKind={}; let nSteps=0;
  for(const s of SCALES){
    const R=s.chordRule, id=s.id;
    if(!R || !KINDS.has(R.kind)){ miss(`${id}: no chordRule, or an unknown kind`); continue; }
    byKind[R.kind]=(byKind[R.kind]||0)+1;
    const want= s.noChords ? 'none' : isTert(s) ? 'tertian' : tagOf(s)==='edo' ? 'ratios' : s.typedChords ? 'palette' : 'stack';   // «стопка»: прежний выбор по tag «пауэр» — теперь stack (решение пользователя)
    if(R.kind!==want) miss(`${id}: rule ${R.kind}, today's choice by tag ${want}`);
    if('chord' in s || 'chord7' in s) miss(`${id}: still carries chord/chord7 beside its rule`);
    const T=TUNINGS[s.tuning];
    if(R.kind==='ratios'){
      const o=OLD[id];
      if(!o) miss(`${id}: a ratios rule on a mode that had no chord ratios`);
      else{
        if(!same(R.triad,o.triad)||!same(R.seventh,o.seventh)) miss(`${id}: moved ratios differ from the old chord/chord7`);
        const n=s.iv.length;
        for(const sev of [false,true]) for(let d=0; d<=n; d++){ nSteps++;
          const r0=s.iv[d%n]+s.edo*Math.floor(d/n), w=(sev?o.seventh:o.triad).map(ra=>r0+Math.round(s.edo*Math.log2(ra))), g=ruleChordSteps(d,s,sev);   // T4c-2: путь приложения (chordSteps по tag ушла в опоры пробы)
          if(!same(g,w)) miss(`${id} degree ${d}${sev?' 7th':''}: steps ${g} now, ${w} from the old literals`); }
      }
      if(T.equal==null) miss(`${id}: a ratios rule on a table tuning`);
    }
    if(!s.noChords && !s.typedChords && T.equal==null) miss(`${id}: chords without a palette on a TABLE tuning — an untyped chord here would change definition in T6b`);
    if(R.kind==='palette' && !s.typedChords) miss(`${id}: palette rule without a palette`);
  }
  let nViews=0;
  for(const [s0,tf] of allViews()){ nViews++; const v=scaleView(s0,tf); if(v.chordRule!==s0.chordRule) miss(`${s0.id}: the view carries another chordRule object`); }
  let nUntyped=0;
  for(const e of events){
    if((e.fn!=='chOn'&&e.fn!=='chSet') || !e.a || e.a.ty) continue;
    nUntyped++; const k=e.sc&&e.sc.chordRule&&e.sc.chordRule.kind;
    if(k!=='tertian'&&k!=='stack'&&k!=='ratios'&&k!=='power') miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000}: an untyped chord in ${e.sc&&e.sc.id}, whose rule is ${k}`);
  }
  const A=viewAudit();
  A.notes.forEach(n=>miss(`L${n.layer+1} note at beat ${Math.round(n.start*1000)/1000} spans two tuning views`));
  A.tracks.forEach(ly=>miss(`L${ly+1} holds more than one tuning view`));
  console.log(`[scaleprobe T6a] modes ${SCALES.length} (${Object.entries(byKind).map(([k,n])=>k+' '+n).join(', ')}) · views ${nViews} · moved-ratio steps ${nSteps} · song: untyped chords ${nUntyped}, events ${events.length} · differences ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T6a] '+m));
  if(!bad.length) console.log('[scaleprobe T6a] every chord rule matches today\'s choice, untyped chords live only on equal tunings, and the view checks find nothing in the song');
  return { byKind, views:nViews, steps:nSteps, untyped:nUntyped, differences:bad };
}

/* ═══ T6a-2: ПРОКРУТКА РЕДАКТОРА ЧЕРЕЗ ПЕРЕКЛЮЧЕНИЕ ОСИ (видимая правка) ═══
   1) «Все» ↔ «Лад» (один вид): каждый вид с приглушёнными рядами × оба направления × высоты окна × каждое положение окна — высота
      якоря (средний видимый ряд, приглушённый — прилипший к ступени) после перевода (draw.rollRow0Across) стоит на ТОМ ЖЕ месте лада
      (та же пара ступень/регистр) и ВИДНА в окне после зажима; печатается, у скольких якорей высота точная, у скольких — соседняя ступень;
   (п. 2 — чип лада, другой вид — снят в T4c-2 вместе с чипом: у дорожки один вид строя.)
   Работает без редактора. Ничего не меняет. */
export function checkScroll(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const views=allViews().map(([s0,tf])=>scaleView(s0,tf));
  let nP=0, nExact=0;
  for(const v of views) for(const [f0,f1] of [[true,false],[false,true]]){
    const a0=RP.axis(v,f0), a1=RP.axis(v,f1); if(a0===a1) continue;   // приглушённых рядов нет — кнопки нет
    const T0=REG_N*a0.rpp, T1=REG_N*a1.rpp;
    for(const rows of [5,8,13,20]){ if(rows>T0) continue;
      for(let row0=0; row0<=T0-rows; row0++){
        nP++; const r0c=Math.min(RP.across(a0,a1,row0,rows), Math.max(0,T1-rows));
        const mid=row0+Math.floor(rows/2), sn=a0.snap(mid), pt=a0.pitchOf(sn), nr=a1.rowOfTi(pt.ti,pt.oct), back=a1.pitchOf(nr);   // T4c-1: ряд отдаёт {ti, oct}
        if(sn===mid) nExact++;
        const at=`${v.id}${v.tunable?'@'+v.tunedFrom:''} ${f0?'All→Mode':'Mode→All'} window ${rows} at row ${row0}`;
        if(!(nr>=r0c && nr<r0c+rows)) miss(`${at}: the anchor (ti ${pt.ti} reg ${pt.oct}) is at row ${nr}, outside the new window ${r0c}..${r0c+rows-1}`);
        if(!back||back.ti!==pt.ti||back.oct!==pt.oct) miss(`${at}: row ${nr} is not ti ${pt.ti} reg ${pt.oct} in the new axis`);
      }
    }
  }
  console.log(`[scaleprobe T6a-2] All/Mode switches ${nP} (anchor pitch exact in ${nExact}, snapped to the nearest degree in ${nP-nExact}) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T6a-2] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T6a-2] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe T6a-2] every All/Mode switch keeps the anchor pitch in view');
  return { toggles:nP, exact:nExact, total:nBad, differences:bad };
}

/* ═══ МАТЕРИАЛ ПЕСНИ — ДОСТАТОЧНО ЛИ ЕГО, ЧТОБЫ ПЕСЕННЫЕ ПРОВЕРКИ ЧТО-ТО ДОКАЗЫВАЛИ ═══
   Дважды проба «прошла» на пустой песне: ноль расхождений из нуля случаев. Здесь — перечень того, без чего песенная часть проб
   ничего не проверяет: четыре роли; строи трёх семейств (равный, таблица, фиксированный ключ) и не меньше двух видов; аккорды трёх
   видов (стопка без типа по правилу лада, пауэр-аккорд, типизированный); удержанная нота терменвокса (бенд — путь догонялки, T4b2);
   распавшийся аккорд (однонотный тип — U2/U3/U4); подложка (ev.jam). → { ok, missing:[строки], counts } */
export function material(){
  const c={ ld:0, bs:0, ch:0, dr:0, equal:0, table:0, fixedKey:0, theremin:0, dissolved:0, backing:0, tertian:0, stack:0, typed:0, outOfMode:0 }, views=new Set();   // outOfMode (T5) — сведение, НЕ требование: демо-пьеса вне лада не играет, а прогон checkOut от песни не зависит
  for(const e of events){
    const a=e.a||{}, fn=e.fn;
    if(e.jam) c.backing++;
    const r= fn==='drum' ? 'dr' : fn.startsWith('lead') ? 'ld' : fn.startsWith('bass') ? 'bs' : fn.startsWith('ch') ? 'ch' : null;
    if(r) c[r]++;
    if(!r || r==='dr' || !e.sc) continue;
    views.add(viewIdOf(e.sc));
    if(TUNINGS[e.sc.tuning].equal!=null) c.equal++; else c.table++;
    if(e.sc.fixedKey) c.fixedKey++;
    if(/On$|Set$/.test(fn) && typeof a.ti==='number' && !modeSlotOfTi(a.ti,a.oct,e.sc)) c.outOfMode++;
    if(fn==='leadOn' && a.bend && a.bend.length) c.theremin++;
    if(fn==='chOn'){
      if(Array.isArray(a.ty) && a.ty.length===1) c.dissolved++;
      else if(a.ty) c.typed++;
      else { const k=e.sc.chordRule&&e.sc.chordRule.kind; if(k==='stack') c.stack++; else if(k==='tertian') c.tertian++; }
    }
  }
  c.views=views.size;
  const NEED=[['ld','a solo note'],['bs','a bass note'],['ch','a chord'],['dr','a drum hit'],['equal','an equal-tuning scale'],['table','a table tuning (raga, Partch, a temperament)'],
              ['fixedKey','a fixed-key scale (a historical temperament)'],['tertian','an untyped tertian chord'],['stack','a stacked chord (pentatonic: every other mode degree)'],['typed','a typed chord (palette)'],
              ['theremin','a held theremin note with a bend'],['dissolved','a dissolved chord (one-note type)'],['backing','a backing']];
  const missing=NEED.filter(([k])=>!c[k]).map(([,w])=>w);
  if(c.views<2) missing.push('a second tuning view');
  return { ok:!missing.length, missing, counts:c };
}

/* ═══ P.all — ВСЕ ПРОБЫ ОДНОЙ КОМАНДОЙ ═══
   Каждая проба по порядку; её подробный вывод ПРИГЛУШЁН (console.log/warn/table/info на время прогона — ⚠️ одноразовые предупреждения
   приложения, попавшие в это время, тоже не напечатаются), если не P.all({verbose:true}). Итог — ОДНА таблица: проба, случаи, материал песни
   (сколько песенных единиц она прошла), расхождения, время; под таблицей — первые расхождения каждой ненулевой строки. Песенные строки не
   засчитываются, если песне не хватает материала (material) — тогда вердикт «song: not enough material» и перечень недостающего. */
/* ⛳ МЕРЫ СТРОК (слайс AUTO-PROBE): проба кладёт сюда измеренные величины с допуском — {name, value, limit, dir:'max'|'min'|'abs'|null,
   unit}; P.all собирает их по строкам (res.measures), раннер tools/probe-browser.mjs --repeat печатает по прогонам с запасом до допуска,
   чтобы хрупкие строки было видно ДО того, как они упадут. Вердикт меры не решают — их решает сама проба, как прежде. */
let MEAS=[];
const meas=(name,value,limit=null,dir=null,unit='')=>{ if(value!=null && Number.isFinite(+value)) MEAS.push({ name, value:+(+value).toPrecision(4), limit, dir, unit }); };
const ALL_RUNS=[
  ['T0 data',            ()=>checkData(),   r=>({ cases:r.checks, diff:r.mismatches.length, list:r.mismatches })],
  ['T1 pitch',           ()=>checkPitch(),  r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['T2 view',            ()=>checkView(),   r=>({ cases:r.checks+r.cases, diff:r.total, list:r.mismatches })],
  ['T4b1 sound (sweep)', ()=>checkSound(),  r=>({ cases:r.sweep.cases, diff:r.sweep.total, list:r.sweep.mismatches })],
  ['T4b3 editor rows (sweep)',()=>checkRows(), r=>({ cases:r.rows+r.chords, diff:r.total, list:r.differences })],
  ['T4b4-1 row fixes',   ()=>checkRowFix(), r=>({ cases:r.defaults+r.cache, diff:r.total, list:r.differences })],
  ['T4b4 highlights (sweep)',()=>checkHl(),  r=>({ cases:r.sweep+r.outOfMode, diff:r.total, list:r.differences })],
  ['T4c-2 song integrity',()=>checkSong(),  r=>({ cases:r.events+r.segments+r.chase+r.rows+r.dissolves, song:r.events, diff:r.total, list:r.differences })],   // T5: «в строе», вне лада — опора по целому строю
  ['T5 out-of-mode pitches (sweep)',()=>checkOut(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['T6b untyped chords (sweep)',()=>checkUntyped(), r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['stacked chords',     ()=>checkStack(),   r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['T6c chord labels',   ()=>checkLabels(), r=>({ cases:r.cases, diff:r.total, list:r.mismatches })],
  ['T6a chord rules',    ()=>checkRules(),  r=>({ cases:r.views+r.steps+r.untyped, song:r.untyped, diff:r.differences.length, list:r.differences })],
  ['T6a-2 scroll',       ()=>checkScroll(), r=>({ cases:r.toggles, diff:r.total, list:r.differences })],
  ['T7 chords in their tuning',()=>checkPure(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['chord types of their view\'s build',()=>checkTypes(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['T7b chord modes',    ()=>checkModes(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['seed notes as intended',()=>checkSeed(), r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences })],
  ['frozen seed bass level',()=>checkFrozen(), r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences })],
  ['S4 solo editing',    ()=>checkSoloEdit(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['tracks: every one reachable',()=>checkTracks(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['AR1 arrangement window',()=>checkArrange(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['MX1 track level and master',()=>checkMixer(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['MX2 track pan',()=>checkPan(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['AR2 track names, colours, order',()=>checkTrackLook(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['LR1 live and frozen reverb agree',()=>checkRevAgree(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['AF2 freeze swap inaudible',()=>checkSwap(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['AF6b 16-bit frozen playback',()=>checkChunks(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['render repeatability',()=>checkRepeat(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['renders serialized',()=>checkQueue(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['AF1 freeze queue',()=>checkFreezeQueue(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['write path (funnels)',()=>checkWrite(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F4 behaviour as data',()=>checkBehaviour(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F8 root alone',      ()=>checkRootAlone(), r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences })],
  ['bare mode = default chord mode',()=>checkBare(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F7 Just intonation merge',()=>checkMerge(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F6b user chord modes',()=>checkUserChordModes(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F6 user files: deletion keeps recordings',()=>checkUserDelete(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F3 naming as data', ()=>checkNames(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['F0 scale data snapshot',()=>checkFiles(), r=>({ cases:r.cases, diff:r.total, list:r.differences, status: r.noSnap ? 'no snapshot yet' : undefined })],
  ['tracks: one view',   ()=>tracks(),      r=>{ const m=r.filter(x=>x.view.includes(' + ')); return { cases:r.length, song:r.length, diff:m.length, list:m.map(x=>`${x.track} holds ${x.view}`) }; }],
];
/* ⛳ СЛАЙС «БЫСТРЫЕ ПРОБЫ». SLOW_ROWS — строки, которых нет в P.quick(): прогоны данных по всем видам (их же гоняет node —
   tools/probe-data.mjs — или они читают оси редактора через draw) и прокрутка всех дорожек кадрами. P.all() — полный барьер, в нём всё.
   DRAWN_ROWS — строки, читающие НАРИСОВАННОЕ окно (ждут кадров): не пришёл хоть один кадр (вкладка скрыта) — строка «not checked: tab
   hidden», не FAIL и не pass; итог просит повторить при видимой вкладке. */
const SLOW_ROWS=new Set(['T1 pitch','T2 view','T4b1 sound (sweep)','T4b3 editor rows (sweep)','T4b4 highlights (sweep)','T5 out-of-mode pitches (sweep)',
  'T6b untyped chords (sweep)','tracks: every one reachable','F3 naming as data','F0 scale data snapshot',
  'LR1 live and frozen reverb agree','AF2 freeze swap inaudible','AF6b 16-bit frozen playback']);   // AF2: ≈ 25–30 с живого съёма   // LR1: ≈ 8–10 с (живой съём в реальном времени + три полных рендера) — только в P.all
const DRAWN_ROWS=new Set(['tracks: every one reachable','AR1 arrangement window','MX1 track level and master','MX2 track pan','AR2 track names, colours, order']);
const HIDDEN='not checked: tab hidden';
for(const n of [...SLOW_ROWS,...DRAWN_ROWS]) if(!ALL_RUNS.some(r=>r[0]===n)) console.warn(`[scaleprobe] «${n}» is not a row of P.all — the quick/drawn lists are out of date`);
/* ⛳ СТРАЖ СОСТОЯНИЯ МЕЖДУ СТРОКАМИ P.all (после MX2: проба, оставившая след, роняет ЧУЖУЮ строку — и виноватую не видно). Снимок до и после
   КАЖДОЙ строки: уровень, панорама, M и S каждой дорожки; уровень мастера; окно аранжировки, его лицо, редактор; переключатели КОПИИ
   ДВИЖКА рендера (render.copyState — уровень и панорама по ключу, раскладчик, семя, отладка, ключ удара, величины соло-ноты). Строка, после
   которой снимок иной, получает расхождение «state guard: left changed …» с полем и значениями до/после. Вызывайте как прежде: await P.all(). */
async function stateSig(R){
  const Ls=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  let copy='—'; try{ if(R) copy=JSON.stringify(await R.copyState()); }catch(e){ copy='copy state unreadable: '+(e&&e.message); }
  return { 'track level/pan/mute/solo': Ls.map(ly=>`L${ly+1}:${laneLevelOf(ly)}/${lanePanOf(ly)}/${laneMuted(ly)?'M':'-'}${laneSoloed(ly)?'S':'-'}`).join(' '),
           'master level': String(masterLevel()),
           'track names and order (AR2)': laneOrder().map(ly=>`L${ly+1}${laneNameOf(ly)!=null?'='+laneNameOf(ly):''}`).join(' '),
           'windows (arrangement/face/editor)': [arrOpen, arrFace, rollOpen, editIsOpen()].join(','),
           'render engine copy': copy,
           /* ⛳ ЖИВОЕ СОСТОЯНИЕ ЗВУКА, КОТОРОЕ ЧИТАЕТ РЕНДЕР ИЛИ ПЕРЕИГРОВКА (после MX2): цепи всех владельцев (состав и адреса), их прицепочные
              величины (fxSnapshot — только чтение), старые скаляры соло, живые тембры и режимы голоса, вид строя (лад, «строй от», режим
              аккордов, септаккорд), тоника, A4, темп, размер, транспорт. Величины сетевых параметров живых экземпляров (реверб, делей) сюда не
              входят — их меняет только рука эффектов и переигровка, а читать их без постройки экземпляра нечем. */
           'live effect chains': JSON.stringify(fxChains)+' '+chainOwners().map(o=>JSON.stringify(fxSnapshot(o.key))).join(' ')+' scalars '+JSON.stringify(liveFx),
           'live timbres and voice modes': [leadIdx,chIdx,bassIdx,drumKitIdx].join(',')+' '+JSON.stringify(voiceMode),
           'tuning view': [scaleId,tunedFrom,JSON.stringify(chordModeSel),seventh].join(','),
           'tonic / A4 / tempo / metre': [tonic,aRef,loop.bpm,loop.metre].join(','),
           'transport': [loop.on,recording].join(',') };
}
export async function all(opt={}){   // F0: async — строка снимка читает tools/scales.before.json (fetch); звать await P.all()
  const keep={ log:console.log, warn:console.warn, table:console.table, info:console.info }, mute=()=>{};
  const T00=performance.now(), title=opt.quick?'P.quick':'P.all';
  const rows=[], lists=[], keepCM=chordModeSel, measures={};
  let RR=null; try{ RR=await import('./render.js'); }catch(e){ RR=null; }   // страж читает копию движка рендера
  let nGuard=0; const stall0=frameStalls;
  setChordModeSel({});   // T7b: прогоны строят виды с ЖИВЫМ выбором режима аккордов — гоняем на умолчаниях, выбор человека возвращаем ниже
  QUICK=!!opt.quick;
  const nRun=ALL_RUNS.filter(([n])=>!(opt.quick && SLOW_ROWS.has(n))).length;
  try{
  for(const [name,run,read] of ALL_RUNS){
    if(opt.quick && SLOW_ROWS.has(name)) continue;
    const g0=await stateSig(RR), st0=frameStalls;
    const t0=performance.now(); let row; MEAS=[];
    if(!opt.verbose){ console.log=console.warn=console.table=console.info=mute; }
    try{ let res=run(); if(res && typeof res.then==='function') res=await res;   // F0: проба может быть асинхронной (P.checkFiles)
         const x=read(res); row={ check:name, cases:x.cases, song:x.song==null?'—':x.song, differences:x.diff, note:x.status }; if(x.diff) lists.push([name,x.list||[]]); }
    catch(err){ row={ check:name, cases:'—', song:'—', differences:'ERROR' }; lists.push([name,[String(err&&err.stack||err)]]); }
    finally{ Object.assign(console,keep); }
    row.ms=Math.round(performance.now()-t0);
    if(MEAS.length) measures[name]=MEAS; MEAS=[];
    if(DRAWN_ROWS.has(name) && frameStalls>st0) row.hidden=true;   // кадры не пришли — окно не рисовалось, снимок мог быть старым
    { const g1=await stateSig(RR), ch=Object.keys(g0).filter(k=>g0[k]!==g1[k]);
      if(ch.length){ nGuard++; if(typeof row.differences==='number') row.differences+=ch.length;
        lists.push([name+' — state guard', ch.map(k=>`state guard: left changed — ${k}: ${g0[k]} → ${g1[k]}`)]); } }
    rows.push(row);
    /* ⛳ ХОД ПРОГОНА (раннер tools/probe-browser.mjs): строка на каждую пробу сразу по её завершении — мимо приглушения (keep.log) */
    if(opt.progress) keep.log(`[scaleprobe row] ${rows.length}/${nRun} ${name} · cases ${row.cases} · differences ${row.differences} · ${row.ms} ms`);
  }
  } finally { setChordModeSel(keepCM); QUICK=false; }
  const M=material();
  for(const r of rows) if(r.song!=='—') r.status = !M.ok ? 'song: not enough material' : r.differences===0 ? 'pass' : 'FAIL';
                         else r.status = r.differences===0 ? (r.note||'pass') : 'FAIL';   // F0: «снимка ещё нет» — не провал, но и не pass
  for(const r of rows) if(r.hidden) r.status=HIDDEN;   // ⛳ вкладка скрыта: не FAIL и не pass
  const nHidden=rows.filter(r=>r.hidden).length;
  for(const r of rows){ delete r.note; delete r.hidden; }
  console.table(rows);
  if(SEED_REC && SEED_REC.kind==='song') console.log(`[scaleprobe all] frozen seed bass: not applicable — the loaded song is P.song('${SEED_REC.name}')`);
  else { const F=SEED_REC&&SEED_REC.freeze, E=SEED_FROZEN_EXPECT;
    console.log(F ?`[scaleprobe all] frozen seed bass L${F.layer+1}: peak ${F.peak} (expected ${E.peak}), rms ${F.rms} (expected ${E.rms}), buffer ${F.samples} samples (expected ${E.samples})`
                  : '[scaleprobe all] frozen seed bass: none in this session (run await P.seed({replace:true}))'); }
  for(const [name,list] of lists){ console.warn(`[scaleprobe all] ${name}: first differences`); list.slice(0,opt.show||5).forEach(m=>console.warn('   '+m)); }
  const nDiff=rows.reduce((n,r)=>n+(r.status===HIDDEN?0:typeof r.differences==='number'?r.differences:1),0), noSnap=rows.some(r=>r.status==='no snapshot yet');
  if(!M.ok) console.warn(`[scaleprobe all] song: not enough material — missing ${M.missing.join('; ')} (run await P.seed({replace:true}) for a complete test song)`);
  if(noSnap) console.log('[scaleprobe all] scale-data snapshot: no tools/scales.before.json yet — P.dumpScales() makes it (F0 «tunings as files»)');
  console.log(nGuard ? `[scaleprobe all] state guard: ${nGuard} row(s) left the mixer, the windows, the live sound state or the render engine copy changed (see the lists above)`
                     : '[scaleprobe all] state guard: no row left the mixer, the windows, the live sound state or the render engine copy changed');
  if(frameStalls>stall0) console.warn(`[scaleprobe all] ${frameStalls-stall0} animation frame(s) never came (tab hidden?) — ${nHidden} row(s) that read the drawn window are marked «${HIDDEN}»; rerun with the tab visible`);
  const pass=nDiff===0&&M.ok&&!nHidden, sec=((performance.now()-T00)/1000).toFixed(1);
  console.log(`[scaleprobe all] ${title}: ${pass ? 'PASS' : 'NOT A PASS'} — ${rows.length} checks, ${nDiff} differences${nHidden?`, ${nHidden} not checked (tab hidden — rerun with the tab visible)`:''}, song material ${M.ok?'complete':'incomplete'} (${events.length} events, ${M.counts.views} tuning views) · ${sec} s`);
  return { pass, rows, material:M, hidden:nHidden, seconds:+sec, measures };
}

/* ═══ P.quick — БЫСТРЫЙ БАРЬЕР (слайс «быстрые пробы») ═══ Те же строки, что P.all, без SLOW_ROWS (прогоны данных по всем видам — их
   держит node, tools/probe-data.mjs, — оси редактора по всем видам и прокрутка всех дорожек кадрами); рендерящие строки и так короткие
   (PROBE_SHORT). Цель — меньше 30 с на настольном; время печатается в итоге. P.all() остаётся полным барьером. */
export function quick(opt={}){ return all({...opt, quick:true}); }
/* ═══ P.orderCheck — ПОРЯДОК НЕ ВЛИЯЕТ (после MX2) ═══ На посеянной песне: P.checkPan отдельно, затем P.all, затем P.all ЕЩЁ РАЗ — все три
   обязаны пройти (строка MX2 идёт в P.all ПОСЛЕ S4, второй прогон ставит S4 после неё). Посев — до: await P.seed({replace:true}).
   Асинхронная: await P.orderCheck(). */
/* ⛳ ВСЕГДА ОБА ПРОХОДА И ОДНА ИТОГОВАЯ СТРОКА (после MX2): упавший или бросивший первый проход не отменяет второй; каждый шаг — в своём
   try/catch; перед проходом — строка «идёт проход N из 2» (P.all молчит, пока идут строки, и долгий второй проход легко принять за конец). */
export async function orderCheck(){
  const run=async (label,f)=>{ console.log(`[scaleprobe order] ${label} — running…`);
    try{ return { r:await f(), err:null }; }catch(err){ console.warn(`[scaleprobe order] ${label} threw: ${err&&err.stack||err}`); return { r:null, err }; } };
  const failRows=x=> !x.r ? ['threw: '+(x.err&&x.err.message||x.err)] : x.r.rows.filter(z=>z.status==='FAIL'||z.differences==='ERROR').map(z=>z.check);
  const p=await run('P.checkPan', checkPan), a=await run('P.all pass 1 of 2', all), b=await run('P.all pass 2 of 2', all);
  const pOk= !!p.r && p.r.total===0, aOk= !!a.r && a.r.pass, bOk= !!b.r && b.r.pass, ok= pOk&&aOk&&bOk;
  const fa=failRows(a), fb=failRows(b);
  console.log(`[scaleprobe order] ${ok?'ORDER CHECK PASS':'ORDER CHECK FAILED'} — P.checkPan ${pOk?'pass':'FAIL'}; P.all pass 1 ${aOk?'PASS':'NOT A PASS'+(fa.length?' ('+fa.join('; ')+')':'')}; P.all pass 2 ${bOk?'PASS':'NOT A PASS'+(fb.length?' ('+fb.join('; ')+')':'')}`);
  return { ok, pan:p.r, first:a.r, second:b.r };
}
/* ═══ P.seed — ДЕТЕРМИНИРОВАННАЯ ТЕСТОВАЯ ПЕСНЯ ═══
   ⛔ ЗАМЕНЯЕТ ТЕКУЩУЮ ПЕСНЮ. На непустой песне без {replace:true} — отказ (живой дубль не должен пропасть от опечатки: ничего не
   сохраняется, но потерянный дубль — всё равно потеря). Пишет ТОЛЬКО через воронки рекордера: сценарные взятые — recorder.seedTake
   (push: маршрут, номер взятого, ключи, вид, индекс в строе), правки — функции редактора (editCommit), подложка — loadJam
   (loadArrangement). Руками ни одного события не пишется. Что строится (размер 4, у каждой части свои такты):
     доли  0–16  мажор: соло (мелодия + удержанная нота терменвокса с бендом), бас с глиссандо, аккорды стопкой по правилу лада (прогрессия
                 одним «вкл» и ведениями + отдельный аккорд) — три дорожки рождает ОДНО взятое (маршрут по роли);
     доли 16–32  бас в раге Яман (таблица 22 шрути);
     доли 32–48  аккорды в Партче (типизированные отношения палитры);
     доли 48–64  Пифагор «строй от C» (фиксированный ключ): аккорды палитры и бас;
     доли 64–80  пентатоника: аккорды-стопки (через ступень лада);
   затем РЕДАКТОР: отдельный мажорный аккорд РАСПАДАЕТСЯ (удалена средняя нота), у первого аккорда Партча одна нота сдвинута во времени и
   по высоте; затем ПОДЛОЖКА (джем I–vi–ii–V в мажоре, бас по корням, ударные), СКОБА повтора [такт 3, конец − 2 такта] пользователем,
   пауза транспорта и ЗАМОРОЗКА дорожки баса в раге (если рендер доступен из консоли). Живые лад, «строй от» и септаккорд возвращаются. */
/* ═══ ЗАПИСЬ ГЛАЗАМИ ЖЕСТА — СЛЕПЫЕ ПЯТНА ПРОБЫ, ЗАКРЫТЫЕ ПОСЛЕ «ТИХОГО БАСА» (после T4c-2) ═══
   Песенные строки сверяли сохранённое с самим собой (индекс → цена), а не с тем, что ДАЛ ЖЕСТ: потеряй воронка поле — тембр, громкость,
   регистр — ни одна строка не заметила бы. Три строки ниже сверяют с ИСТИНОЙ СНАРУЖИ сохранённого:
     P.checkWrite()  — известные нагрузки жеста (каждая роль, вид строя, регистр, ступень) через НАСТОЯЩИЕ воронки — взятое в песочнице
                       (recorder.probeTake → seedTake → push) и воронку подложки (recorder.backingEvent); КАЖДОЕ поле сохранённого события
                       против нагрузки (ступени нет, индекс есть, остальное — то же, карта эффектов — копией), цена ENG (evHz) против
                       ЗАМОРОЖЕННОЙ опоры, посчитанной из СТУПЕНИ ЖЕСТА (не из сохранённого индекса);
     P.checkSeed()   — P.seed записывает задуманное (ступень, регистр, тембр, громкость, тип, бенд каждой ноты сценария); каждое событие
                       песни сверяется с задуманным так же (кроме двух аккордов, которые сценарий потом правит в редакторе);
     P.checkFrozen() — пик, rms и длина буфера замороженного баса в раге (P.seed) против ожидаемых; буфер, внезапно ставший тихим, — расхождение.
   ⚠️ Песочница продвигает счётчики дорожек и взятых (они монотонны): у дорожек, рождённых ПОСЛЕ P.checkWrite, другой номер, а значит и
   другое семя заморозки. Существующие дорожки не затронуты. */
/* Запись сценарной песни: kind 'seed' — P.seed, 'song' — P.song (демо-пьеса, src/songs.js; шаги несут sid — id лада шага, ign — поля,
   которые потом правит полоса редактора, skip — шаг, который редактор распустил). Пишет последний из двух: песня одна. */
let SEED_REC=null;   // { kind, name?, takes:[{label, take, scaleId, tf, steps:[{fn,t,a,sid?,ign?,skip?}]}], edited:[[scaleId, t, роль?]], inserts:[…] (U5), freeze:{…}|null }
/* U5: форма аккорда — интервалы его нот в центах от первой (по ним «вставка формы воспроизводит выделенный аккорд») */
const centsShape=N=>N.map(n=>1200*Math.log2(n.f/N[0].f));
/* Замороженный бас в раге: значения, ЗАМЕРЕННЫЕ ПОСЛЕ починки «пара голоса в фазе» (voiceStartPair, отчёт пользователя). Прежние
   0.08527/0.054304 сами были частично погашенной выборкой фазы (две одинаковые волны со случайным сдвигом), а не честным эталоном. */
const SEED_FROZEN_EXPECT={ peak:0.08686, rms:0.055319, samples:650886, floor:0.9 };
const ROLE_OF={ l:'ld', b:'bs', c:'ch' };
const sameVal=(x,y)=> x===y || (x&&y&&typeof x==='object'&&typeof y==='object' ? JSON.stringify(x)===JSON.stringify(y) : false);
/* Одна сверка: сохранённое событие ev против нагрузки жеста g (со ступенью). ign — поля, которые не сравниваются (их потом переписала
   полоса редактора, P.song). → массив строк расхождений. */
function writeDiff(at, ev, g, ign){
  const out=[], a=ev.a||{}, role=ROLE_OF[ev.fn[0]], pitched= role && /On$|Set$/.test(ev.fn) && typeof g.deg==='number';
  const skip=k=> !!ign && ign.has(k);
  if('deg' in a) out.push(`${at}: the stored event carries a degree`);
  for(const k of Object.keys(g)){ if(k==='deg'||skip(k)) continue;
    if(!(k in a)) out.push(`${at}: field ${k} lost (gesture ${JSON.stringify(g[k])})`);
    else if(!sameVal(a[k],g[k])) out.push(`${at}: field ${k} stored ${JSON.stringify(a[k])}, gesture ${JSON.stringify(g[k])}`); }
  for(const k of Object.keys(a)) if(!(k in g) && k!=='ti' && k!=='k' && !skip(k)) out.push(`${at}: unexpected field ${k} = ${JSON.stringify(a[k])}`);
  if(g.fx && a.fx===g.fx) out.push(`${at}: the effect map is the gesture's own object, not a copy`);
  if(pitched){
    if(!Number.isInteger(a.ti)) out.push(`${at}: no tuning index`);
    const hz=evHz(a,ev,role), v=ev.sc;
    if(role==='ch'){ const ref=legacyChordNotesRef(g.deg,g.oct,v,ev.sev,g.ty??null).map(n=>n.f);
      if(hz.length!==ref.length || hz.some((f,i)=>f!==ref[i])) out.push(`${at}: chord price ${hz.join(' ')}, from the gesture degree ${ref.join(' ')}`); }
    else{ const ref= role==='ld' ? legacyLeadFreq(g.deg,g.oct,v) : legacyBassFreq(g.deg,g.oct,v);
      if(hz!==ref) out.push(`${at}: price ${hz}, from the gesture degree ${ref}`); }
  }
  return out;
}
const VIEWS_W=()=>{ const by=f=>(SCALES.find(f)||{}).id;   // F1: лады по id
  return [['major','major','T'], ['raga (table + selection)','raga-yaman','T'],
          ['pelog Barang (root offset)',by(s=>s.root>0),'T'], ['Partch (table, ratio chords)','partch-43','T'],
          ['Pythagorean from C (fixed key)','pythagorean',0], ['Pythagorean from the tonic','pythagorean','T'],
          ['Werckmeister (fixed key)',by(s=>s.id&&s.id.startsWith('werck')),'T'], ['Bohlen–Pierce (non-octave)',by(s=>s.tuning==='bp13'),'T'],
          ['19-TET',by(s=>s.tuning==='edo19'),'T'], ['major pentatonic (stack)','major-penta','T']].filter(x=>x[1] && scaleById(x[1])); };
export function checkWrite(){
  const bad=[]; let nBad=0, cases=0, nView=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keep={ sc:scaleId, tf:tunedFrom, sev:seventh };
  try{
    for(const [name,id,tf] of VIEWS_W()){
      setScaleId(id); setTunedFrom(tf); nView++;
      const v=CUR(), n=v.iv.length, k=v.chordRule&&v.chordRule.kind;
      const F=chordFams(v), ty0= v.typedChords&&F[0]&&F[0].types[0] ? F[0].types[0].iv : null;
      const steps=[]; let t=0; const add=(fn,a)=>{ steps.push({fn,a,t}); t+=0.125; };
      for(let o=0;o<4;o++) for(let d=0;d<=n;d++){
        add('leadOn',{deg:d,oct:o,vol:0.73,inst:3,fx:{'bright:amt':0.37,'glide:time':0.2},v:d%3});
        add('bassOn',{deg:d,oct:o,vol:0.61,inst:2,fx:{'glide:time':0.42},v:d%2});
        if(k!=='none') add('chOn',{deg:d,oct:o,vol:0.55,inst:1,ty:ty0,bri:0.3});
      }
      add('leadOn',{deg:Math.min(2,n),oct:1,vol:0.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:40}],tie:true,v:3});
      add('leadSet',{deg:Math.min(1,n),oct:1,vol:0.7,hold:true,v:3});
      add('bassSet',{deg:Math.min(3,n),oct:2,vol:0.5,v:1});
      if(k!=='none') add('chSet',{deg:Math.min(4,n),oct:2,vol:0.5,ty:ty0,bri:0.6});
      const R=probeTake(steps);
      if(!R.ok){ miss(`${name}: the sandboxed take was refused — ${R.why}`); break; }
      const byT=new Map(); for(const e of R.events) byT.set(e.fn+'@'+e.t, e);
      for(const st of steps){ cases++; const at=`push · ${name} · ${st.fn} degree ${st.a.deg} reg ${st.a.oct}`, ev=byT.get(st.fn+'@'+st.t);
        if(!ev){ miss(`${at}: no stored event`); continue; }
        if(ev.sc!==v) miss(`${at}: stored in another view (${ev.sc&&ev.sc.id})`);
        for(const m of writeDiff(at,ev,st.a)) miss(m); }
      // воронка подложки
      const B=[{fn:'bassOn',a:{deg:Math.min(1,n),oct:1,vol:0.6,inst:4}},{fn:'drum',a:{row:2,vol:0.7,kit:3}},{fn:'drone',a:{lvl:0.4}}];
      if(k!=='none') B.push({fn:'chOn',a:{deg:Math.min(2,n),oct:1,vol:0.55,inst:2,ty:ty0}});
      B.forEach((b,i)=>{ cases++; const at=`backing · ${name} · ${b.fn}`, ev=backingEvent({t:i,fn:b.fn,a:{...b.a}},999,0,true);
        if(!ev.jam||ev.sc!==v||ev.layer!==999) miss(`${at}: jam flag, view or layer wrong`);
        for(const m of writeDiff(at,ev,b.a)) miss(m); });
    }
  } finally { setScaleId(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev); }
  cases+=guardSelfTest(miss);   // AUTO-PROBE: страж консоли и его контроль
  console.log(`[scaleprobe write] views ${nView} · gesture and backing payloads ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe write] '+m));
  if(!nBad) console.log('[scaleprobe write] every field survives both funnels, no degree is stored, and every price equals the frozen reference from the gesture degree');
  return { views:nView, cases, total:nBad, differences:bad };
}
/* Задуманное P.seed (или P.song) против песни.
   Шаги взятого группируются по (функция, доля): событий с тем же номером взятого, функцией и долей обязано быть РОВНО столько, сколько
   шагов (порождённые полосой редактора — a.gen — не в счёт; группа с распущенным редактором шагом счёт не сверяет), и каждый шаг
   находит СВОЁ событие без расхождений. У P.seed группы по одному шагу — это прежняя проверка «ровно одно событие» дословно; у
   P.song на одной доле бывает несколько ударов разных рядов. */
export function checkSeed(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  if(!SEED_REC){ miss('no seed record in this session — run await P.seed({replace:true})'); return { cases, total:nBad, differences:bad }; }
  const R=SEED_REC, what= R.kind==='song' ? `song ${R.name}` : 'seed';
  const edited=(take,st)=> !!st.skip || (R.edited||[]).some(([id,t0,pf])=>take.scaleId===id && st.fn.startsWith(pf||'ch') && (st.t===t0||st.t===t0+4));   // T5: третье поле — роль правленого шага (по умолчанию аккорд)
  for(const take of R.takes){
    const G=new Map();
    for(const st of take.steps){ const k=st.fn+'@'+st.t; let g=G.get(k); if(!g) G.set(k, g={ fn:st.fn, t:st.t, steps:[], edited:false });
      if(edited(take,st)) g.edited=true; else g.steps.push(st); }
    for(const g of G.values()){
      const cand=events.filter(e=>e.tk===take.take && e.fn===g.fn && Math.abs(e.t-g.t)<1e-9 && !(e.a&&e.a.gen));
      const at0=`${what} · ${take.label} · ${g.fn} at beat ${g.t}`;
      if(!g.edited && cand.length!==g.steps.length) miss(`${at0}: ${cand.length} stored events (the script wrote ${g.steps.length})`);
      const used=new Set();
      for(const st of g.steps){
        cases++; const at=`${at0}${typeof st.a.deg==='number'?` degree ${st.a.deg} reg ${st.a.oct}`:''}`, sid=st.sid||take.scaleId, ign=st.ign?new Set(st.ign):null;
        const diffOf=ev=>[ ...(ev.sc && ev.sc.id!==sid ? [`${at}: stored in ${ev.sc.id}, the script intended ${sid}`] : []),
                           ...(take.cm!==undefined && ev.sc && ev.sc.chordMode!==take.cm ? [`${at}: chord mode ${ev.sc.chordMode}, the script intended ${take.cm}`] : []),   // T7b
                           ...writeDiff(at,ev,st.a,ign) ];
        let pick=null, pd=null;
        for(const c of cand){ if(used.has(c)) continue; const d=diffOf(c); if(!d.length){ pick=c; pd=d; break; } if(!pick){ pick=c; pd=d; } }
        if(!pick){ miss(`${at}: no stored event`); continue; }
        used.add(pick); for(const d of pd) miss(d);
      }
    }
  }
  /* ⛳ U5: ВСТАВКИ P.seed — каждая лежит, где задумана: пара (индекс, регистр), тип (по значению), громкость и тембр есть (правило #30),
     в ладу или вне его — как задумано, и ФОРМА (интервалы нот в центах от первой) — как у выделенного аккорда (или по правилу лада на
     ярком корне у нетипизированного). Вставка — своё взятое редактора: в группы сценарных взятых она не попадает. */
  const scriptedTk=new Set(R.takes.map(x=>x.take)); let nIns=0;
  for(const I of (R.inserts||[])){ cases++; nIns++;
    const at=`${what} · insert ${I.label}`;
    const ev=events.find(e=>e.fn===I.fn && e.layer===I.layer && Math.abs(e.t-I.t)<1e-9 && !scriptedTk.has(e.tk));
    if(!ev){ miss(`${at}: no inserted event at beat ${I.t} in L${I.layer+1}`); continue; }
    const a=ev.a||{};
    if(a.ti!==I.ti||a.oct!==I.oct) miss(`${at}: stored ti/reg ${a.ti}/${a.oct}, intended ${I.ti}/${I.oct}`);
    if('deg' in a) miss(`${at}: carries a degree`);
    if(!(typeof a.vol==='number' && a.vol>=0 && a.vol<=1)) miss(`${at}: volume ${a.vol} (rule #30)`);
    if(typeof a.inst!=='number') miss(`${at}: timbre ${a.inst}`);
    if('inst' in I && a.inst!==I.inst) miss(`${at}: timbre ${a.inst}, intended ${I.inst}`);   // S4: тембр — ближайшей ноты
    if('vol' in I && a.vol!==I.vol) miss(`${at}: volume ${a.vol}, intended ${I.vol}`);       // S4: громкость — ближайшего события с громкостью
    if('fx' in I && JSON.stringify(a.fx??null)!==JSON.stringify(I.fx??null)) miss(`${at}: effect map ${JSON.stringify(a.fx??null)}, intended ${JSON.stringify(I.fx??null)} (a copy of the neighbour's, absence included)`);   // S4: решение пользователя 1
    if(I.plain && (a.bend || a.tie || a.hold)) miss(`${at}: an inserted solo note carries ${a.bend?'a bend':a.tie?'a tie':'hold'}`);   // S4: вставленная нота — обычная
    if('ty' in I && JSON.stringify(a.ty??null)!==JSON.stringify(I.ty??null)) miss(`${at}: type ${JSON.stringify(a.ty)}, intended ${JSON.stringify(I.ty)}`);
    if(I.out!=null && !modeSlotOfTi(a.ti,a.oct,ev.sc)!==I.out) miss(`${at}: ${I.out?'should be outside':'should be inside'} its mode`);
    if(I.cents){ const N=chordNotesAt(a.ti,a.oct,ev.sc,ev.sev,a.ty), c=centsShape(N);
      if(c.length!==I.cents.length || c.some((x,i)=>Math.abs(x-I.cents[i])>1e-6)) miss(`${at}: shape ${c.map(x=>Math.round(x*1000)/1000).join(' ')}¢, intended ${I.cents.map(x=>Math.round(x*1000)/1000).join(' ')}¢`); }
  }
  console.log(`[scaleprobe seed-check] ${what}: scripted notes ${cases-nIns}${nIns?` · inserts ${nIns}`:''} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe seed-check] '+m));
  if(!nBad) console.log('[scaleprobe seed-check] every seeded note is stored as intended — timbre, volume, register, type, bend — and sounds its intended degree; every insert lies where intended with its intended shape');
  return { cases, total:nBad, differences:bad };
}
/* Уровень замороженного баса в раге (P.seed) против ожидаемого. */
export function checkFrozen(){
  if(SEED_REC && SEED_REC.kind==='song'){   // P.song: баса в раге нет — проверять нечего; демо-пьеса ничего не замораживает (её голосов хватает живым пулам)
    console.log(`[scaleprobe frozen] the loaded song is P.song('${SEED_REC.name}') — the seed's frozen raga bass is not in it; nothing to check`);
    return { cases:0, total:0, differences:[], got:null };
  }
  const bad=[]; const E=SEED_FROZEN_EXPECT, F=SEED_REC&&SEED_REC.freeze;
  if(!F){ bad.push('no frozen seed track in this session — run await P.seed({replace:true}) (the freeze needs ▶ Play started)'); return { cases:0, total:1, differences:bad, got:null }; }
  if(!F.installed) bad.push(`the seed's freeze of L${F.layer+1} was not installed (${F.refused})`);
  if(F.samples!==E.samples) bad.push(`buffer ${F.samples} samples, expected ${E.samples}`);
  if(!(F.peak>=E.peak*E.floor)) bad.push(`peak ${F.peak} is below ${Math.round(E.floor*100)}% of the expected ${E.peak} — the frozen bass went quiet`);
  if(!(F.rms>=E.rms*E.floor)) bad.push(`rms ${F.rms} is below ${Math.round(E.floor*100)}% of the expected ${E.rms} — the frozen bass went quiet`);
  console.log(`[scaleprobe frozen] L${F.layer+1} (bass in the raga): peak ${F.peak} (expected ${E.peak}), rms ${F.rms} (expected ${E.rms}), buffer ${F.samples} samples (expected ${E.samples})`);
  bad.forEach(m=>console.warn('[scaleprobe frozen] '+m));
  return { cases:3, total:bad.length, differences:bad, got:F };
}
/* ═══ S4: ПРАВКА СОЛО — P.checkSoloEdit ═══
   Соло правится ТОЙ ЖЕ машинерией, что бас (бас и соло — один инструмент). Проба держит три вещи, все — на загруженной песне:
     1) ИНВАРИАНТЫ ПЕСНИ: сирот нет (ведение или «выкл» без своей ноты); каждая нота соло кончается СВОИМ «выкл» (пары «вкл/выкл» сходятся);
        у каждого высотного «вкл»/ведения есть громкость (правило #30); каждая половина ПАРЫ СВЯЗКИ («выкл» с tie / «вкл» с tie) имеет
        партнёра — противоположное событие того же взятого на той же доле в ДРУГОЙ дорожке; точки кривой бенда лежат внутри своей ноты.
     2) ⛳ S6: ПАРТНЁР ПАРЫ СВЯЗКИ — recorder.tiePartners (то, чем развязывает правка) находит у каждой половины ровно ту, что видит
        инвариант 1. (S4–S5 здесь сверялись отказы soloEditBlock; с S6 отказов нет — предикат снят.)
     3) КРУГ «ПРАВКА → ↶ → ↷ → ↶»: после ↶ события песни ПОБИТНО прежние (те же объекты; доля, слой, функция, взятое, вид, септаккорд и
        нагрузка — по значению), после ↷ — побитно как после правки; правки: перенос одиночной ноты, её длина, высота и удаление; отделение
        и удаление сегмента ведущей линии; высота «вкл» пары связки; перенос с транспонированием терменвокса (кривая та же); вставка.
        Отказанная правка песню не трогает. Редактор открывается и закрывается самой пробой; песня после неё — та же.
        ⛳ S5: ДЛИНА ТЕРМЕНВОКСА — укорочение (кривая обрезана: точки ≤ новой длины прежние и по порядку, последняя — на новом конце со
        значением кривой там; прежний массив НЕ тронут) и удлинение (кривая — тот же массив); ↶ возвращает кривую побитно (круг).
        ⛳ S6: КРАЙ ПАРЫ СВЯЗКИ — перенос ноты с привязанным «выкл», её укорочение, удаление каждой половины, перенос «вкл»: после правки
        tie нет НИ у правленого края, НИ у партнёра; версия правок дорожки партнёра растёт (и подпись его заморозки меняется — замороженный
        партнёр устарел) на правке, на ↶ и на ↷; ↶ возвращает пару побитно. Смена одной высоты и длина ноты с привязанным «вкл» (двигается
        её собственный «выкл») связку ХРАНЯТ. Удаление СТРОКИ дорожки (необратимо) — на ВРЕМЕННОЙ паре, записанной самой пробой в конец
        песни (recorder.seedTake), в обе стороны: выжившая половина развязана, её версия выросла, подпись сменилась; затем обе временные
        дорожки удаляются, и песня — побитно прежняя (продвинутые счётчики дорожек и взятых — монотонны по замыслу).
     4) ⛳ S5: ГОЛОС ПОСЛЕ ИЗОГНУТОЙ НОТЫ НАЧИНАЕТ БЕЗ ЕЁ КРИВОЙ — на ЗВУКЕ, офлайн-рендером (render.reuseCheck): высота второй ноты на
        том же голосе — её собственная, а оба контроля мерой видны: своя кривая второй ноты читается как изгиб, а смоделированная чужая
        кривая — как наследство (мера оценивает ИЗВЕСТНЫХ кандидатов на их периодах, субгармонику не берёт). Поэтому проба асинхронна:
        await P.checkSoloEdit().
   У P.seed материал обязателен (его нет — расхождение); у демо-пьесы (P.song) отсутствующий случай лишь называется.
   ⚠️ Круг правит только НЕЗАМОРОЖЕННЫЕ дорожки: правка поднимает версию правок дорожки, и замороженная устарела бы. */
export async function checkSoloEdit(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const beat=t=>Math.round(t*1000)/1000;
  // ---- 1) инварианты песни ----
  const V=songNotes();
  cases++; if(V.orphans.length){ const o=V.orphans[0]; miss(`${V.orphans.length} orphan events (a change or release without its note) — first L${o.layer+1} beat ${beat(o.t)} ${o.fn}`); }
  for(const n of V.notes){ if(n.role!=='ld') continue; cases++; song++;
    const at=`L${n.layer+1} solo note at beat ${beat(n.start)}`;
    if(n.endBy!=='off') miss(`${at}: ends by '${n.endBy}', not by its own note-off`);
    const B=n.head.a&&n.head.a.bend;
    if(B&&B.length&&n.end!=null){ const top=Math.max(...B.map(p=>p.dt)); if(top>n.end-n.start+1e-9) miss(`${at}: its bend reaches ${beat(top)} beats, beyond the note's length ${beat(n.end-n.start)}`); }
  }
  for(const e of events){ if(!/^(lead|bass|ch)/.test(e.fn) || !/On$|Set$/.test(e.fn)) continue; cases++;
    if(!(e.a && typeof e.a.vol==='number')) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn}: no volume (rule #30)`); }
  const ties=events.filter(e=>e.fn.startsWith('lead')&&e.a&&e.a.tie); let nPairs=0;
  for(const e of ties){ cases++;
    const want= e.fn==='leadOff' ? 'leadOn' : e.fn==='leadOn' ? 'leadOff' : null, at=`L${e.layer+1} beat ${beat(e.t)} ${e.fn} with a tie`;
    if(!want){ miss(`${at}: only a note-on or a note-off may carry a tie`); continue; }
    const p=ties.filter(x=>x.fn===want && x.tk===e.tk && x.layer!==e.layer && Math.abs(x.t-e.t)<1e-9);
    if(!p.length) miss(`${at}: no partner (a ${want} with a tie in the same take, at the same beat, in another track)`);
    else if(e.fn==='leadOff') nPairs++;
  }
  if(!nPairs) lack('a linked pair (a solo note continued across a timbre switch)');
  // ---- 2) ⛳ S6: партнёр — тем же, чем развязывает правка ----
  for(const e of ties){ const want= e.fn==='leadOff' ? 'leadOn' : e.fn==='leadOn' ? 'leadOff' : null; if(!want) continue; cases++;
    const inv=ties.filter(x=>x.fn===want && x.tk===e.tk && x.layer!==e.layer && Math.abs(x.t-e.t)<1e-9), got=tiePartners(e);
    if(!got.length || got.some(p=>!inv.includes(p)) || (inv.length===1 && got[0]!==inv[0])) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn} with a tie: recorder.tiePartners finds ${got.length} partner(s), the invariant ${inv.length}`); }
  // ---- P.seed: терменвокс после правки — там, куда его перенесли, с той же кривой ----
  if(isSeed){ cases++; const T=SEED_REC.solo&&SEED_REC.solo.therm;
    if(!T) miss('the solo section of the seed did not run (no record of its theremin edit)');
    else { const h=events.find(e=>e.fn==='leadOn'&&Math.abs(e.t-T.t)<1e-9&&e.a&&e.a.bend&&e.a.bend.length);
      if(!h) miss(`the seed's theremin note is not at beat ${T.t}`);
      else { if(h.a.ti!==T.ti||h.a.oct!==T.oct) miss(`the seed's theremin note: ti/reg ${h.a.ti}/${h.a.oct}, intended ${T.ti}/${T.oct}`);
             if(JSON.stringify(h.a.bend)!==JSON.stringify(T.bend)) miss(`the seed's theremin note: the move changed its bend to ${JSON.stringify(h.a.bend)} (intended ${JSON.stringify(T.bend)})`); } } }
  const segs=()=>songSegs().segs.filter(g=>g.role==='ld' && !g.ev.jam && freezeState(g.layer)==='none');
  const isTherm=g=>!!(g.note.head.a&&g.note.head.a.bend&&g.note.head.a.bend.length);
  const offTie=g=>!!(g.endEv && g.endEv.fn==='leadOff' && g.endEv.a && g.endEv.a.tie);
  const headTie=g=>!!(g.first && g.note.head.a && g.note.head.a.tie);
  const single=g=>!!(g.first && g.endEv && g.endEv.fn==='leadOff');
  const plain=g=>single(g) && !isTherm(g) && !offTie(g) && !headTie(g);
  const find=(what,pred)=>{ const g=segs().find(pred); if(!g) lack(what); return g||null; };
  // ---- 3) круг правки ----
  if(editIsOpen()) miss('the track editor is open — close it: the round trip opens it itself');
  else if(recording) miss('recording — stop it first');
  else {
    const snap=()=>new Map(events.map(e=>[e,[e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]]));
    const FIELD=['t','layer','fn','tk','sc','sev','jam','a'];
    const same=(A,B)=>{ if(A.size!==B.size) return `${A.size} events instead of ${B.size}`;
      for(const [e,x] of B){ const y=A.get(e); if(!y) return `the ${x[2]} at beat ${beat(x[0])} is gone`;
        for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return `the ${x[2]} at beat ${beat(x[0])} differs (field ${FIELD[i]})`; }
      return null; };
    const open=ly=> editIsOpen() ? editSetLayer(ly) : editOpen(ly);
    const rt=(label,g,op)=>{ if(!g) return; cases++;
      if(!open(g.layer)){ miss(`${label}: the editor would not open L${g.layer+1}`); return; }
      const S0=snap(), r=op(g);
      if(!r){ miss(`${label}: the edit was refused`); return; }
      const S1=snap(); let d;
      if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
      if(r.check && (d=r.check())) miss(`${label}: ${d}`);
      if(!editUndo()){ miss(`${label}: undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: undo does not restore the song — ${d}`);
      if(!editRedo()){ miss(`${label}: redo refused`); return; }
      if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
      if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the song — ${d}`);
    };
    const at=e=>`L${e.layer+1} beat ${beat(e.t)}`;
    const verSig=ly=>{ const k=freezeTicket(ly); return { v:laneEditVerOf(ly), s:k&&k.sig }; };
    /* ⛳ S6: КРУГ ПРАВКИ КРАЯ ПАРЫ. edgeOf(g) — привязанное событие правленой ноты («вкл» или «выкл» с tie); партнёр берётся ДО правки. После
       правки tie нет ни у края (если край ещё в песне), ни у партнёра; версия правок дорожки партнёра выросла, подпись заморозки сменилась;
       ↶ — песня побитно прежняя (пара цела) и версия выросла снова (замороженный партнёр устарел и на ↶), ↷ — побитно как после правки и
       версия снова выросла, второй ↶ — побитно прежняя. */
    const pairRt=(label,g,edgeOf,op)=>{ if(!g) return; cases++;
      if(!open(g.layer)){ miss(`${label}: the editor would not open L${g.layer+1}`); return; }
      const E=edgeOf(g), Ps=tiePartners(E);
      if(Ps.length!==1){ miss(`${label}: ${Ps.length} partners found for the tied edge at ${at(E)} (expected 1)`); return; }
      const P=Ps[0], S0=snap(), A=verSig(P.layer), r=op(g);
      if(!r){ miss(`${label}: the edit was refused`); return; }
      const S1=snap(), B=verSig(P.layer); let d;
      if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
      if(P.a&&P.a.tie) miss(`${label}: the partner at ${at(P)} keeps its tie`);
      if(events.includes(E) && E.a && E.a.tie) miss(`${label}: the edited edge at ${at(E)} keeps its tie`);
      if(!(B.v>A.v)) miss(`${label}: the partner track's edit version did not rise (${A.v} → ${B.v}) — its frozen buffer would not go stale`);
      if(B.s===A.s) miss(`${label}: the partner track's freeze signature did not change`);
      if(!editUndo()){ miss(`${label}: undo refused`); return; }
      const C=verSig(P.layer);
      if((d=same(snap(),S0))) miss(`${label}: undo does not restore the pair — ${d}`);
      if(!(C.v>B.v)) miss(`${label}: undo did not raise the partner's edit version — a buffer frozen after the edit would stay fresh`);
      if(!editRedo()){ miss(`${label}: redo refused`); return; }
      if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
      if(!(verSig(P.layer).v>C.v)) miss(`${label}: redo did not raise the partner's edit version`);
      if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the pair — ${d}`);
    };
    /* Правка, НЕ трогающая время края, связку ХРАНИТ: партнёр с tie, его версия правок не меняется (обычный круг ниже — побитно). */
    const keepCheck=(g,edgeOf)=>{ const E=edgeOf(g), P=tiePartners(E)[0], v0=P?laneEditVerOf(P.layer):0;
      return ()=> !P ? 'no partner before the edit' : !(P.a&&P.a.tie) ? `the partner at ${at(P)} lost its tie` : laneEditVerOf(P.layer)!==v0 ? 'the partner track’s edit version changed' : null; };
    /* Цель каждой правки ищется ЗАНОВО (find после ↶ — та же песня, тот же ответ): объекты сегментов пересобираются после каждой правки. */
    try{
      const P1=()=>find('a plain solo note (its own note-off, no bend, no tie)',plain);
      rt('move a solo note half a beat later',P1(),g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      rt('lengthen a solo note',P1(),g=>editResizeSeg(g.ev,g.end+0.5));
      rt('shorten a solo note',P1(),g=>editResizeSeg(g.ev,g.start+(g.end-g.start)/2));
      rt('change the pitch of a solo note',P1(),g=>editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct));
      rt('delete a solo note',P1(),g=>editDeleteSeg(g.ev));
      rt('insert a solo note',P1(),g=>{ const ev=editInsertLead(g.start+0.25,g.ti+2,g.oct,g.sc,g.sev,1);
        return ev && { check:()=> (ev.a.bend||ev.a.tie||ev.a.hold) ? 'the inserted note carries a bend, a tie or hold' : typeof ev.a.vol!=='number' ? 'the inserted note has no volume' : null }; });
      const M=()=>find('a middle segment of a lead-mode line (a pitch change on each side)',g=>!g.first && g.endEv && g.endEv.fn==='leadSet');
      rt('move a middle segment of a lead line (it detaches)',M(),g=>editMoveSeg(g.ev,g.ev.t+0.25,g.ti,g.oct));
      rt('lengthen a middle segment of a lead line (it detaches)',M(),g=>editResizeSeg(g.ev,g.end+0.25));
      rt('delete a middle segment of a lead line (silence in its place)',M(),g=>editDeleteSeg(g.ev));
      rt('change the pitch of a middle segment (the glide is kept)',M(),g=>editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct));
      const TH=()=>find('a single theremin note with a bend',g=>single(g)&&isTherm(g)&&!offTie(g)&&!headTie(g));
      rt('move and transpose a theremin note (its bend keeps its shape)',TH(),g=>{ const B=JSON.stringify(g.note.head.a.bend), ev=editMoveSeg(g.ev,g.ev.t+0.5,g.ti+1,g.oct);
        return ev && { check:()=> JSON.stringify(ev.a.bend)!==B ? `the bend changed: ${JSON.stringify(ev.a.bend)} (was ${B})` : ev.a.ti!==g.ti+1 ? `ti ${ev.a.ti}, intended ${g.ti+1}` : null }; });
      rt('delete a theremin note',TH(),g=>editDeleteSeg(g.ev));
      /* ⛳ S5: ДЛИНА ТЕРМЕНВОКСА. Ожидаемая кривая укорочения считается ЗДЕСЬ, независимо от recorder.bendTrim: точки с dt ≤ L — те же и
         по порядку, конечная точка {L, c последней оставшейся} — если что-то ушло; прежний массив не тронут (его JSON до и после). */
      /* ⚠️ ПОЧИНКА (после S5): кривую и её JSON берём ДО правки. Правка ставит голове НОВУЮ нагрузку (ход 'move'), и прежде проба читала
         g.note.head.a.bend ПОСЛЕ неё — то есть уже обрезанную кривую: «хвоста за половиной» не находилось (ложное «в песне нет материала»),
         а сверка обрезки сравнивала обрезанное с самим собой и проходила вхолостую. B — массив головы до правки, B0 — его JSON до правки. */
      const bendCheck=(B,B0,ev,L)=>{ const nb=ev&&ev.a&&ev.a.bend;
        return ()=>{ if(JSON.stringify(B)!==B0) return 'the edit mutated the original bend array';
          if(!Array.isArray(nb)||!nb.length) return 'the edited note lost its bend';
          if(nb.some(p=>p.dt>L+1e-9)) return `a bend point at ${Math.max(...nb.map(p=>p.dt))} lies beyond the new length ${L}`;
          const keep=B.filter(p=>p.dt<=L+1e-9), cut=keep.length<B.length, last=keep[keep.length-1];
          if(!cut) return nb===B ? null : 'nothing was cut, yet the bend is a new array';
          const want=(last&&Math.abs(last.dt-L)<=1e-9) ? keep : [...keep, { dt:L, c:last?last.c:0 }];
          return JSON.stringify(nb)===JSON.stringify(want) ? null : `trimmed bend ${JSON.stringify(nb)}, expected ${JSON.stringify(want)}`; }; };
      rt('shorten a theremin note (its bend is trimmed)',TH(),g=>{ const L=(g.end-g.start)/2, B=g.note.head.a.bend, B0=JSON.stringify(B);
        if(!B.some(p=>p.dt>L+1e-9)) lack('a theremin note whose bend reaches past half its length');
        const ev=editResizeSeg(g.ev,g.start+L);
        return ev && { check:bendCheck(B,B0,ev,L) }; });
      rt('lengthen a theremin note (its bend is kept, the last value holds)',TH(),g=>{ const L=g.end-g.start+1, B=g.note.head.a.bend, B0=JSON.stringify(B);
        const ev=editResizeSeg(g.ev,g.start+L);
        return ev && { check:bendCheck(B,B0,ev,L) }; });
      const HT=()=>find('a solo note continuing another track (a tie on its note-on)',g=>headTie(g)&&single(g)&&!offTie(g));
      const OT=()=>find('a solo note continued in another track (a tie on its note-off)',g=>offTie(g)&&g.first&&!headTie(g));
      const onE=g=>g.ev, offE=g=>g.endEv;
      // связка ХРАНИТСЯ: время края не меняется
      { const g=HT(); rt('change the pitch of a tied note-on (the tie is kept)',g,g=>{ const k=keepCheck(g,onE), ev=editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct); return ev && { check:k }; }); }
      { const g=HT(); rt('lengthen a note whose note-on is tied (its own note-off moves; the tie is kept)',g,g=>{ const k=keepCheck(g,onE), ev=editResizeSeg(g.ev,g.end+0.5); return ev && { check:k }; }); }
      { const g=OT(); rt('change the pitch of a note whose note-off is tied (the tie is kept)',g,g=>{ const k=keepCheck(g,offE), ev=editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct); return ev && { check:k }; }); }
      // ⛳ S6: край двигается или уходит — обе половины развязаны
      pairRt('move a note whose note-off is tied (the edge moves)',OT(),offE,g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      pairRt('shorten a note across its tied note-off',OT(),offE,g=>editResizeSeg(g.ev,g.start+(g.end-g.start)/2));
      pairRt('lengthen a note past its tied note-off',OT(),offE,g=>editResizeSeg(g.ev,g.end+0.5));
      pairRt('delete the half whose note-off is tied',OT(),offE,g=>editDeleteSeg(g.ev));
      pairRt('move the tied note-on in time',HT(),onE,g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      pairRt('delete the half whose note-on is tied',HT(),onE,g=>editDeleteSeg(g.ev));
    } finally { if(editIsOpen()) editClose(); }
    /* ⛳ S6: УДАЛЕНИЕ СТРОКИ ДОРОЖКИ (✕, необратимо) — на ВРЕМЕННОЙ паре в конце песни, в обе стороны. Запись — recorder.seedTake (та же
       воронка, что P.seed); удаление — двойной тап laneDelTap (тот же путь, что у ✕ на полосе). После — песня побитно прежняя. */
    if(!loop.on){
      const S0=snap();
      const tmpPair=()=>{ const T=Math.ceil(songBeats())+8;
        const r=seedTake([{fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:0,v:0},t:T,id:1}, {fn:'leadOff',a:{v:0,tie:true},t:T+1,id:1},
                          {fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:1,tie:true,v:0},t:T+1,id:2}, {fn:'leadOff',a:{v:0},t:T+2,id:2}]);
        if(!r) return null;
        const off=events.find(e=>e.tk===r.take&&e.fn==='leadOff'&&e.a&&e.a.tie), on=events.find(e=>e.tk===r.take&&e.fn==='leadOn'&&e.a&&e.a.tie);
        return off&&on&&off.layer!==on.layer ? { off, on } : null; };
      const del=ly=>{ laneDelTap(ly); return laneDelTap(ly); };
      for(const [label,gone,keep] of [['delete the track row holding the tied note-off','off','on'],['delete the track row holding the tied note-on','on','off']]){ cases++;
        const pr=tmpPair(); if(!pr){ miss(`${label}: the temporary linked pair could not be recorded`); continue; }
        const G=pr[gone], K=pr[keep], A=verSig(K.layer);
        if(!del(G.layer)) miss(`${label}: the row delete was refused`);
        else { const B=verSig(K.layer);
          if(K.a&&K.a.tie) miss(`${label}: the surviving half at ${at(K)} keeps its tie`);
          if(!(B.v>A.v)) miss(`${label}: the surviving track's edit version did not rise — its frozen buffer would not go stale`);
          if(B.s===A.s) miss(`${label}: the surviving track's freeze signature did not change`); }
        if(events.includes(K) && !del(K.layer)) miss(`${label}: the temporary surviving track could not be removed`);
      }
      const d=same(snap(),S0); if(d) miss(`row delete: the song is not back as it was — ${d}`);
    } else miss('row delete: the transport is playing — stop it first');
  }
  // ---- 4) голос после изогнутой ноты — на звуке ----
  cases++; let RU=null;
  try{ const R=await import('./render.js'); RU=await R.reuseCheck(); }
  catch(err){ RU={ ok:false, why:'the offline render failed: '+(err&&err.message) }; }
  if(!RU.ok) miss(`voice reuse after a bent note: ${RU.why}`);
  else console.log(`[scaleprobe solo-edit] voice reuse: the second note on the bent note's voice sounds ${RU.f} Hz (its own ${RU.want}); the control's own bend reads ${RU.fControl} Hz (${RU.wantControl}); a simulated inherited curve reads as inherited`);
  if(RU.detail) console.log('[scaleprobe solo-edit] voice reuse, candidate correlations and window energy — '+RU.detail);
  console.log(`[scaleprobe solo-edit] solo notes ${song} · cases ${cases} · linked pairs ${nPairs} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe solo-edit] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe solo-edit] '+m));
  if(!nBad) console.log('[scaleprobe solo-edit] no orphans; every solo note ends by its own note-off; every pitched event has a volume; every linked half has its partner, found by recorder.tiePartners; every bend lies within its note; editing a tied edge unties both halves, stales the partner and round-trips bit for bit; a row delete unties the surviving half; every edit round-trips bit for bit; a theremin note’s length trims its bend exactly; a voice reused after a bent note starts unbent');
  return { cases, song, total:nBad, differences:bad };
}
/* ═══ ДОРОЖЕК БОЛЬШЕ, ЧЕМ СТРОК НА ЭКРАНЕ — P.checkTracks (починка «дорожки дальше 16-й не видны») ═══
   Для КАЖДОЙ дорожки песни: (1) СТРОКА — после прокрутки полосы (laneRow0, как листает палец) она среди нарисованных строк, целиком на
   экране, и попадание по ней даёт ЕЁ слой: «вооружить» у подписи, M и S в гнёздах; транспорт (▶ ⤺ ✎ …) — на экране; (2) РЕДАКТОР —
   editOpen открывает именно её; (3) M/S — заглушение делает её неслышной, соло — слышной при неслышных прочих (тот же предикат laneAudible,
   что у обоих путей переигровки), и всё возвращается; (4) ЗВУК — слышима при нетронутом микшере, у каждого «вкл» конечная цена (evHz —
   то, чем играет ENG), а у дорожек ДАЛЬШЕ 16-й — офлайн-рендер (render.renderTrack — та же таблица ENG на копии движка) с ненулевым пиком.
   Кадры ждёт сама (полоса рисуется в цикле приложения): await P.checkTracks(). Прокрутку, микшер и редактор возвращает как были; при
   тронутом микшере (заглушено или соло) пункт 3 пропускается с пометкой. Нужна полоса на экране (во время записи видеоклипа её нет). */
/* ⛳ КАДР С ЗАПАСНЫМ ТАЙМЕРОМ (после MX2: P.orderCheck напечатал одну таблицу P.all из двух). В скрытой вкладке requestAnimationFrame не
   приходит вовсе, и проба, ждущая кадр, висела бы бесконечно — молча. Теперь кадр — rAF или 1 с, что раньше; не дождались — счётчик
   frameStalls (P.all печатает его: окно не рисовалось, строки окон могли читать старый снимок). Держите вкладку видимой. */
let frameStalls=0;
/* ⛳ СКРЫТАЯ ВКЛАДКА (слайс «быстрые пробы»): кадров не будет вовсе — не ждём секунду на каждый, а сразу считаем пропуск; строки, читающие
   нарисованное окно, P.all покажет «не проверено: вкладка скрыта» (DRAWN_ROWS). */
const frame=()=>new Promise(res=>{ if(typeof document!=='undefined' && document.hidden){ frameStalls++; res(); return; }
  let done=false; const fin=st=>{ if(done) return; done=true; if(st) frameStalls++; res(); };
  requestAnimationFrame(()=>fin(false)); setTimeout(()=>fin(true),1000); });
const waitMs=ms=>new Promise(res=>setTimeout(res,ms));
/* ⛳ КОРОТКОЕ ОКНО РЕНДЕРА ПРОБ (слайс «быстрые пробы»): секунд песни от первого события дорожки (render.renderTrack o.short; хвост ≤ 1 с).
   Мерам проб — баланс каналов, отношение уровней, повтор двух рендеров — нужна пара секунд звука, не вся дорожка: рендер в разы короче
   (буфер ≈ 0.5 с разгона + 1 с песни + хвост ≤ 0.75 с).
   Замороженный бас посева (P.checkFrozen) этим не затронут — его цифры сняты при P.seed полной заморозкой (render.freeze). */
const PROBE_SHORT=1.0;
/* ⛳ P.quick: рендерящие строки берут ТОЛЬКО высотную дорожку — подслучаи ударных (ступень уровня и панорамы в ударе, повтор ударных)
   остаются в P.all. Рендер копии стоит около секунды даже коротким окном (пул аккордов копии строится и звучит целиком), а цель P.quick —
   меньше 30 с. Ставит P.all({quick:true}) на время прогона и снимает в finally. */
let QUICK=false;
/* ⛳ ОКНО АРАНЖИРОВКИ, ЛИЦО, ОКНО ВРЕМЕНИ И ПРОКРУТКА — СНИМОК И ВОЗВРАТ (починка после MX2). Пробы микшера открывают окно и лицо «микшер»;
   прежде в finally ставили лицо «аранжировка» безусловно и не возвращали окно времени (первый вход в окно вписывает всю песню) и прокрутку.
   Теперь — ровно как было до пробы, в finally (и при исключении). */
const winKeep=()=>({ face:arrFace, b0:rollBeat0, span:rollSpan, row0:laneRow0 });
function winRestore(k){ if(arrOpen) arrApi.close(); if(arrFace!==k.face) arrApi.face(k.face); arrApi.setWin(k.b0,k.span); setLaneRow0(k.row0); }
/* ═══ MX1: УРОВЕНЬ ДОРОЖКИ И МАСТЕР — P.checkMixer ═══
   (1) СТУПЕНЬ В ГОЛОСЕ МАСШТАБИРУЕТ ЗВУК ДОРОЖКИ: офлайн-рендер дорожки (render.renderTrack — та же таблица ENG на копии движка) с
       множителем g (o.trackGain — тем же путём, что живой голос: ступень tg по ключу владельца, множитель удара, дрона) против g = 1 —
       отношение RMS = g (допуск 2 %: при реверберации в цепи последние биты расходятся в разный хвост той же энергии — правило слагаемых,
       Known limits; поэтому мера — энергия, а не сэмплы). Для высотной дорожки и, если есть, ударной.
   (2) ЗАМОРОЖЕННАЯ: уровень — гейн её шины (frzGain), то есть буфер × g — ровно то, что дала (1) событиями; движение уровня оставляет её
       СВЕЖЕЙ, подпись заморозки (freezeTicket) не меняется, на шину поставлена цель g. ⚠️ Читается ЦЕЛЬ (recorder.frzBusGain), не
       bus.gain.value: при стоящем транспорте у шины нет источников, узел не обрабатывается и геттер держит старую 1.
   (3) ЖИВОЙ ДВИЖОК: множитель по ключу владельца переигровки (audio.ownerGain) — уровень дорожки; живые ключи — 1.
   (4) МАСТЕР: уровень мастера ставит гейн мастера 0.8·v² (читается с самого узла); измеритель отдаёт пик и подавление лимитера.
   (5) ЛИЦО МИКШЕРА: тело строки ловится как фейдер ЕЁ дорожки, полоса мастера — как фейдер мастера.
   Уровни, мастер, лицо и окно возвращает как были. Асинхронная: await P.checkMixer(). */
export async function checkMixer(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keepLvl=new Map(L.map(ly=>[ly,laneLevelOf(ly)])), keepM=masterLevel(), KW=winKeep();
  const rms=b=>{ let s=0,n=0; for(let c=0;c<b.numberOfChannels;c++){ const x=b.getChannelData(c); for(let i=0;i<x.length;i++){ s+=x[i]*x[i]; n++; } } return n?Math.sqrt(s/n):0; };
  const nOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);   // конец материала дорожки: рендер короче — проба быстрее
  const pitched=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&/^(leadOn|chOn|bassOn)$/.test(e.fn))).sort((a,b)=>nOf(a)-nOf(b));
  const drums=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&e.fn==='drum')).sort((a,b)=>nOf(a)-nOf(b));
  try{
    // ---- (1) ступень в голосе: рендер с множителем ----
    const R=await import('./render.js'), g=0.25;
    for(const ly of (QUICK?[pitched[0]]:[pitched[0], drums[0]]).filter(x=>x!=null)){ cases++;
      try{ const a=await R.renderTrack(ly,{trackGain:1, short:PROBE_SHORT, quiet:true}), b=await R.renderTrack(ly,{trackGain:g, short:PROBE_SHORT, quiet:true});
        const ra=rms(a.buf), rb=rms(b.buf), q=ra>0 ? rb/ra : NaN;
        if(!(ra>1e-6)) miss(`L${ly+1}: the unity render is silent`);
        else if(!(Math.abs(q/g-1)<=0.02)) miss(`L${ly+1}: at track gain ${g} the render's RMS ratio is ${q.toFixed(4)} (expected ${g})`);
        else notes.push(`L${ly+1}: RMS ratio ${q.toFixed(4)} at gain ${g}`);
        meas(`L${ly+1} RMS ratio / gain − 1`, q/g-1, 0.02, 'abs'); }
      catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); } }
    if(!pitched.length) miss('no unfrozen pitched track to render');
    // ---- (2) замороженная: уровень — гейн шины, буфер свежий ----
    const fz=L.find(ly=>freezeState(ly)==='fresh');
    if(fz!=null){ cases++;
      const sig0=freezeTicket(fz).sig;
      setLaneLevel(fz,0.5); await waitMs(150);
      const st=freezeState(fz), sig1=freezeTicket(fz).sig, bg=frzBusGain(fz);
      if(st!=='fresh') miss(`L${fz+1}: moving its level made the freeze ${st}`);
      if(sig1!==sig0) miss(`L${fz+1}: moving its level changed the freeze signature`);
      if(laneAudible(fz) && !(bg!=null && Math.abs(bg-0.25)<1e-12)) miss(`L${fz+1}: the gain scheduled on its frozen bus is ${bg}, expected 0.25 (level 0.5 → v² = 0.25)`);
      setLaneLevel(fz,keepLvl.get(fz)); await waitMs(100);
    } else notes.push('no frozen track in this song — the frozen-bus part is not checked (P.seed freezes the raga bass)');
    // ---- (3) живой движок: множитель по ключу владельца ----
    { cases++; const ly=L[0];
      setLaneLevel(ly,0.5);
      const keys=['leadloop:'+ly+':0','loop:'+ly,'loop:'+ly+':2','bassloop:'+ly,'hit:'+ly,'drone:'+ly];
      for(const k of keys){ const got=ownerGain(k); if(Math.abs(got-0.25)>1e-12) miss(`the live engine gives owner ${k} the gain ${got}, expected 0.25`); }
      for(const k of ['lead:L','latch','bass','bass:L:1',null]){ const got=ownerGain(k); if(got!==1) miss(`the live key ${k} gets the gain ${got}, expected 1`); }
      const other=L.find(o=>o!==ly); if(other!=null){ const got=ownerGain('loop:'+other); if(Math.abs(got-volAmpOf(laneLevelOf(other)))>1e-12) miss(`another track's owner gets ${got}`); }
      setLaneLevel(ly,keepLvl.get(ly)); }
    // ---- (4) мастер ----
    { cases++;
      setMasterLevel(0.5); await waitMs(250);
      let m=masterMeter();
      if(!m || Math.abs(m.gain-0.8*0.25)>0.004) miss(`master level 0.5 → master gain ${m&&m.gain}, expected 0.2 (0.8·0.5²)`);
      if(m && !(m.reduction<=0)) miss(`the limiter reduction reads ${m.reduction}, expected ≤ 0`);
      setMasterLevel(1); await waitMs(250); m=masterMeter();
      if(!m || Math.abs(m.gain-0.8)>0.004) miss(`master level 1 → master gain ${m&&m.gain}, expected 0.8 (as before MX1)`); }
    // ---- (5) лицо микшера: попадание ----
    { cases++;
      arrApi.open(); arrApi.face('mix'); await frame(); await frame();
      const V=loopViewProbe();
      if(!V||!V.mix) miss('the mixer face is not drawn');
      else{ for(const ly of V.rows){ const y=V.gy0+V.rows.indexOf(ly)*V.rowH+V.rowH/2, h=loopHit(V.x0+V.bw/2,y);
          if(!h||h.what!=='level'||h.layer!==ly) miss(`L${ly+1}: its row body is not its level fader (${h&&h.what})`); }
        const hm=V.ms && loopHit(V.x0+V.bw/2,(V.ms.y0+V.ms.y1)/2); if(!hm||hm.what!=='mlevel') miss('the master strip is not the master fader');
        if(V.ms && V.ms.y1>innerHeight) miss('the master strip lies below the bottom of the screen'); }
    }
  } finally {
    for(const [ly,v] of keepLvl) if(laneLevelOf(ly)!==v) setLaneLevel(ly,v);
    if(masterLevel()!==keepM) setMasterLevel(keepM);
    winRestore(KW);
  }
  console.log(`[scaleprobe mixer] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe mixer] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe mixer] '+m));
  if(!nBad) console.log('[scaleprobe mixer] the voice stage scales a track proportionally, a frozen track takes its level on its bus and stays fresh, live owners get their track’s gain, the master level sets the master gain, and the mixer face hits its faders');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ MX2: ПАНОРАМА ДОРОЖКИ — P.checkPan ═══
   (1) ВПЛАВЛЕНИЕ НАСТОЯЩИМ ПУТЁМ ЗАМОРОЗКИ: панорама ставится recorder.setLanePan (без подмены o.trackPan), затем render.renderTrack — тот
       же рендер, что даёт ❄. Мера — доля энергии левого канала sL = EL/(EL+ER).
       ⛳ БАЛАНС — НА СУХОМ РЕНДЕРЕ (o.dry: эффекты шины закрыты; после MX2 — мокрый центр соло читался то 0.493, то 0.443). Влажная доля —
       не панорама: отводы реверба на L и R — РАЗНЫЕ знаковые смеси линий сети, они не отражаются панорамой (хард-лево и хард-право — не
       зеркала), а хвост сети от рендера к рендеру иной в микроструктуре (правило слагаемых). Сухой сигнал — сама ступень панорамы:
       хард-лево R = 0 ТОЧНО, центр L = R ТОЧНО. Пороги сухого: стороны ≥ PAN_DRY_SIDE (0.99), центр 0.5 ± PAN_DRY_MID (0.01).
       ⛳ ОДИН МОКРЫЙ РЕНДЕР (хард-лево) — что эхо и хвосты не переворачивают картину: слева ≥ PAN_SIDE (0.8).
       ⛳ ПОЧЕМУ 0.8, А НЕ «ПОЧТИ 1»: сухой сигнал хард-лево справа — ТОЧНО ноль (закон равной мощности, R = 0), но реверб роли сводит вход
       в моно и кладёт влажную долю в оба канала поровну (делей и тремоло шины держат стерео — эхо остаётся слева). При L = √2·d и влажной
       энергии W на канал (у хард-лево вход реверба вдвое тише по энергии: 0.5·(L+R)) sL = (2D+W)/(2D+2W) ≥ 0.8 ⇔ W ≤ ⅔·D — порог держит
       любую дорожку, где влажная доля в центре не больше ~4/3 сухой на канал; мокрее — дорожка «утонула», и такой реверб надо назвать, а
       не прятать. Центр: сухое в обоих каналах одно и то же, влажное — разнознаковые отводы сети, энергии почти равны — 0.05 (≈ ±0.9 дБ).
       ⛳ КОНТРОЛЬ (мера обязана уметь провалиться): тест «хард-лево» прогоняется и на ЦЕНТРЕ, и на ХАРД-ПРАВО — оба обязаны его НЕ
       пройти, иначе мера не отличила бы лево от «не лево»; и зеркально тест «хард-право» — на хард-лево.
       Дорожки: самая короткая незамороженная высотная (ступень в голосе пула) и, если есть, ударная (ступень в ударе).
   (2) ЗАМОРОЖЕННАЯ: смена панорамы меняет подпись (freezeTicket) и старит буфер ('stale'); возврат панорамы — снова 'fresh' и та же подпись.
   (3) ЖИВОЙ ДВИЖОК: ключи владельцев дорожки получают её панораму (audio.ownerPan); живые ключи (руки) — центр.
   (4) ЛИЦО МИКШЕРА: правый блок тела строки ловится как панорама ЕЁ дорожки, левый — как уровень.
   Панорамы, окно и лицо возвращает как были. Асинхронная: await P.checkPan(). */
export async function checkPan(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const PAN_SIDE=0.8, PAN_DRY_SIDE=0.99, PAN_DRY_MID=0.01;
  const keepPan=new Map(L.map(ly=>[ly,lanePanOf(ly)])), KW=winKeep();
  const shareL=b=>{ if(b.numberOfChannels<2) return NaN; let l=0,r=0; const x=b.getChannelData(0), y=b.getChannelData(1);
    for(let i=0;i<x.length;i++){ l+=x[i]*x[i]; r+=y[i]*y[i]; } return (l+r)>0 ? l/(l+r) : NaN; };
  const f3=x=>Number.isFinite(x)?x.toFixed(3):String(x);
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);   // конец материала дорожки: рендер короче — проба быстрее
  const pitched=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&/^(leadOn|chOn|bassOn)$/.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b));
  const drums=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&e.fn==='drum')).sort((a,b)=>endOf(a)-endOf(b));
  try{
    // ---- (1) вплавление: рендер дорожки при панораме −1 / 0 / +1, поставленной самой дорожке ----
    const R=await import('./render.js');
    if(!pitched.length) miss('no unfrozen pitched track to render');
    for(const ly of (QUICK?[pitched[0]]:[pitched[0], drums[0]]).filter(x=>x!=null)){ cases++;
      try{
        const sh={};
        for(const [k,p] of [['left',-1],['centre',0],['right',1]]){ setLanePan(ly,p); sh[k]=shareL((await R.renderTrack(ly,{dry:true,quiet:true,short:PROBE_SHORT})).buf); }
        setLanePan(ly,-1); const wetL=shareL((await R.renderTrack(ly,{quiet:true,short:PROBE_SHORT})).buf);
        const tag=`L${ly+1}: left share, dry — hard left ${f3(sh.left)}, centre ${f3(sh.centre)}, hard right ${f3(sh.right)}; wet hard left ${f3(wetL)}`;
        if(!Number.isFinite(sh.left+sh.centre+sh.right+wetL)) miss(tag+' — a render is silent or mono');
        else{
          if(!(sh.left>=PAN_DRY_SIDE)) miss(`${tag} — dry hard left keeps less than ${PAN_DRY_SIDE} of its energy on the left`);
          if(!(1-sh.right>=PAN_DRY_SIDE)) miss(`${tag} — dry hard right keeps less than ${PAN_DRY_SIDE} of its energy on the right`);
          if(!(Math.abs(sh.centre-0.5)<=PAN_DRY_MID)) miss(`${tag} — dry centre is not balanced (±${PAN_DRY_MID})`);
          if(!(wetL>=PAN_SIDE)) miss(`${tag} — with effects, hard left keeps less than ${PAN_SIDE} on the left (echoes or tails flip the picture)`);
          if(sh.centre>=PAN_DRY_SIDE || sh.right>=PAN_DRY_SIDE) miss(`${tag} — CONTROL: the hard-left test passes on a render that is not panned left; the measure cannot catch a wrong pan`);
          if(1-sh.left>=PAN_DRY_SIDE || 1-sh.centre>=PAN_DRY_SIDE) miss(`${tag} — CONTROL: the hard-right test passes on a render that is not panned right`);
          meas(`L${ly+1} dry hard-left share`, sh.left, PAN_DRY_SIDE, 'min'); meas(`L${ly+1} dry centre share − 0.5`, sh.centre-0.5, PAN_DRY_MID, 'abs'); meas(`L${ly+1} wet hard-left share`, wetL, PAN_SIDE, 'min');
          notes.push(tag+` (controls: the hard-left test on centre/right reads ${f3(sh.centre)}/${f3(sh.right)} < ${PAN_DRY_SIDE}, the hard-right test on left/centre reads ${f3(1-sh.left)}/${f3(1-sh.centre)})`);
        }
      }catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); }
      finally{ setLanePan(ly,keepPan.get(ly)); }
    }
    // ---- (2) замороженная: панорама в подписи ----
    const fz=L.find(ly=>freezeState(ly)==='fresh');
    if(fz!=null){ cases++;
      const sig0=freezeTicket(fz).sig, p0=keepPan.get(fz), p1= p0===0.5 ? -0.5 : 0.5;
      setLanePan(fz,p1);
      const st1=freezeState(fz), sig1=freezeTicket(fz).sig;
      if(sig1===sig0) miss(`L${fz+1}: a pan change did not change the freeze signature`);
      if(st1!=='stale') miss(`L${fz+1}: after a pan change the freeze is ${st1}, expected stale`);
      setLanePan(fz,p0);
      const st2=freezeState(fz), sig2=freezeTicket(fz).sig;
      if(st2!=='fresh'||sig2!==sig0) miss(`L${fz+1}: with its pan restored the freeze is ${st2}${sig2!==sig0?' and the signature differs':''}, expected fresh and the same signature`);
      notes.push(`L${fz+1}: pan ${p1} → ${st1}; pan back → ${st2}`);
    } else notes.push('no frozen track in this song — the frozen part is not checked (P.seed freezes the raga bass)');
    // ---- (3) живой движок: панорама по ключу владельца ----
    { cases++; const ly=L[0];
      setLanePan(ly,0.3);
      for(const k of ['leadloop:'+ly+':0','loop:'+ly,'loop:'+ly+':2','bassloop:'+ly,'hit:'+ly,'drone:'+ly]){ const got=ownerPan(k); if(Math.abs(got-0.3)>1e-12) miss(`the live engine gives owner ${k} the pan ${got}, expected 0.3`); }
      for(const k of ['lead:L','lead:M','latch','bass','bass:L:1',null]){ const got=ownerPan(k); if(got!==0) miss(`the live key ${k} gets the pan ${got}, expected 0 (live hands stay centred)`); }
      const other=L.find(o=>o!==ly); if(other!=null){ const got=ownerPan('loop:'+other); if(Math.abs(got-lanePanOf(other))>1e-12) miss(`another track's owner gets the pan ${got}`); }
      setLanePan(ly,keepPan.get(ly)); }
    // ---- (4) лицо микшера: попадание по панораме ----
    { cases++;
      arrApi.open(); arrApi.face('mix'); await frame(); await frame();
      const V=loopViewProbe();
      if(!V||!V.mix) miss('the mixer face is not drawn');
      else for(const ly of V.rows){ const y=V.gy0+V.rows.indexOf(ly)*V.rowH+V.rowH/2;
        const hp=loopHit(V.pfx0+V.pfw/2,y), hl=loopHit(V.fx0+V.fw/2,y);
        if(!hp||hp.what!=='pan'||hp.layer!==ly) miss(`L${ly+1}: the pan block is not its pan control (${hp&&hp.what})`);
        if(!hl||hl.what!=='level'||hl.layer!==ly) miss(`L${ly+1}: the level part is not its level fader (${hl&&hl.what})`); }
      if(V && V.mix && !(V.pfw>=40)) miss(`the pan control is only ${V.pfw}px wide`);
    }
  } finally {
    for(const [ly,p] of keepPan) if(lanePanOf(ly)!==p) setLanePan(ly,p);
    winRestore(KW);
  }
  console.log(`[scaleprobe pan] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe pan] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe pan] '+m));
  if(!nBad) console.log('[scaleprobe pan] a panned track renders to its side through the freeze path (and the controls show the measure would catch a wrong pan), centre is balanced, a pan change stales a frozen track and restoring it makes it fresh again, live hands stay centred, and the mixer face hits its pan controls');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ ПОВТОРЯЕМОСТЬ РЕНДЕРА — P.checkRepeat (после MX2; слайс «быстрые пробы») ═══
   Одна и та же дорожка рендерится несколько раз с одними настройками (render.renderTrack — путь заморозки) КОРОТКИМ ОКНОМ (o.short —
   PROBE_SHORT с от первой ноты, хвост ≤ 1 с); материал и снимок живой цепи соло — одни (o.solo).
   (1) СУХОЙ ≤ REP_DRY·пик (1e-4). Два сухих рендера обычно совпадают до последних битов, но во втором проходе P.all (после многих
       рендеров той же сессии) наблюдалось 1.54e-5 пика — и с ОБОЙДЁННОЙ стадией выразительности тоже, так что прежнее объяснение
       («вау усиливает последние биты») снято. Лучшее, что известно: Chrome складывает входы узла в порядке указателей, своём у каждой
       постройки графа и зависящем от того, что строилось раньше; одна иная разница округления до нелинейной ступени голоса (драйв)
       переносится дальше. Узел не установлен. −96 дБ — неслышимо; допуск 1e-4 — «разница порядка сложения при постройке графа,
       неслышимая» (HANDOFF, пределы).
   (2) МОКРЫЙ ≤ REP_WET·пик (2e-4) по сэмплам и по общей энергии: разница сухого сквозь цепь плюс последние биты сети по петлям с
       усилением < 1. Петли реверба в копии рендера — с одним входом (audio.apStage/buildFDN), иначе два рендера давали разную комнату.
   ⛳ КОНТРОЛИ (мера обязана уметь провалиться): сухой с панорамой 0.5 против центра — разница > REP_DRY·100; мокрый с уровнем 0.9
       (o.trackGain) — отношение RMS 0.9 ± 1e-3 (ступень уровня и цепь линейны) и разница > REP_WET·100. Ударные (цепь пуста) — дважды,
       тот же допуск.
   (3) ДОГОВОР ЗАМОРОЗКИ: у соло-дорожки с нотами БЕЗ карты эффектов (их звук — живая цепь соло, правило R2) подпись заморозки обязана
       меняться при сдвиге живого вибрато (state.fx) и возвращаться при возврате; у дорожки без таких нот — не меняться.
   ⛳ ДОКАЗАТЕЛЬСТВА — ТОЛЬКО ПО ЗАПРОСУ, P.checkRepeat({evidence:true}), в P.all их нет: сухой с обойдённой стадией выразительности
   (СВЕДЕНИЕ, не провал) и по одному эффекту (o.only — провал, если ступень не повторяется). A/B прежней живой проводки петель реверба
   (dbg.fdnLive) снят в AF1 вместе с самой проводкой (уборка LR1: проводка одна — с одним входом).
   Дорожки: самая короткая незамороженная соло-дорожка и, контролем, самая короткая ударная. Асинхронная: await P.checkRepeat(). */
export async function checkRepeat(opt={}){
  const EVID=!!(opt&&opt.evidence);
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const REP_DRY=1e-4, REP_WET=2e-4, REP_BITS=2e-6;   // объяснение — в шапке пробы
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);
  const pick=re=>L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&re.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b))[0];
  const solo=pick(/^leadOn$/), drum=pick(/^drum$/);
  /* ⛳ ОДИН СНИМОК ЖИВОЙ ЦЕПИ СОЛО НА ВСЕ РЕНДЕРЫ ПРОБЫ (o.solo): ноты посева без карты звучат живой цепью соло (договор заморозки), а её
     старые скаляры пишет рука эффектов — камера работает и во время пробы. Повторяемость меряем при ОДНИХ входах. */
  const soloMap=fxSnapshot(chainKeyOf('ld'));
  const e3=x=>Number.isFinite(x)?x.toExponential(2):String(x), f4=x=>Number.isFinite(x)?x.toFixed(4):String(x);
  const R=await import('./render.js');
  const rt=(ly,o)=>R.renderTrack(ly,{quiet:true, solo:soloMap, short:PROBE_SHORT, ...(o||{})}).then(r=>r.buf);
  if(solo==null) miss('no unfrozen solo track to render');
  else { cases++;
    try{
      const d1=await rt(solo,{dry:true}), d2=await rt(solo,{dry:true}), w1=await rt(solo), w2=await rt(solo);
      const dp=await rt(solo,{dry:true,trackPan:0.5}), wg=await rt(solo,{trackGain:0.9});
      const D=bufCmp(d1,d2,REP_DRY), W=bufCmp(w1,w2,REP_WET), C=bufCmp(d1,dp,REP_DRY), G=bufCmp(w1,wg,REP_WET);
      const tag=`L${solo+1} solo: dry twice — max difference ${e3(D.rel)} of peak${D.first!=null?`, first at ${D.first} s`:''}; wet twice — max difference ${e3(W.rel)} of peak, total RMS ratio ${f4(W.total)}${W.first!=null?`, first at ${W.first} s`:''}; controls — dry pan 0.5 vs centre ${e3(C.rel)}, wet level 0.9 RMS ratio ${f4(G.total)} (max difference ${e3(G.rel)})`;
      if(!D.shape||!W.shape) miss(`${tag} — two renders of the same track have different lengths`);
      meas(`${tag.split(' ')[0]} dry difference (of peak)`, D.rel, REP_DRY, 'max'); meas(`${tag.split(' ')[0]} wet difference (of peak)`, W.rel, REP_WET, 'max'); meas(`${tag.split(' ')[0]} control: pan difference`, C.rel, REP_DRY*100, 'min');
      if(!(D.rel<=REP_DRY)) miss(`${tag} — the DRY render differs by more than ${e3(REP_DRY)} of peak (build-order float differences stay near 1.5e-5, inaudible): it reads an input the render does not pin`);
      if(!(W.rel<=REP_WET)) miss(`${tag} — the WET render differs by more than ${e3(REP_WET)} of peak: something on the effect chain is not repeatable`);
      if(!(Math.abs(W.total-1)<=REP_WET)) miss(`${tag} — the WET render's total energy differs by more than ${e3(REP_WET)}`);
      if(!(C.rel>REP_DRY*100)) miss(`${tag} — CONTROL: a different pan renders within ${e3(REP_DRY*100)}; the dry measure cannot see a difference`);
      if(!(Math.abs(G.total-0.9)<=1e-3)) miss(`${tag} — CONTROL: a 0.9 track level should scale the wet RMS by exactly 0.9 (±0.001: the level stage and the chain are linear)`);
      if(!(G.rel>REP_WET*100)) miss(`${tag} — CONTROL: a 0.9 track level renders within ${e3(REP_WET*100)} of the full level; the wet measure cannot see a difference`);
      notes.push(tag);
      if(EVID){
        /* сведение: сухой БЕЗ стадии выразительности */
        const b1=await rt(solo,{dry:true,dbg:{expr:'bypass'}}), b2=await rt(solo,{dry:true,dbg:{expr:'bypass'}}), B=bufCmp(b1,b2,REP_BITS);
        notes.push(`evidence · L${solo+1} solo, dry with the expression stage bypassed: max difference ${e3(B.rel)} of peak${B.first!=null?`, first at ${B.first} s`:''} (with the stage ${e3(D.rel)}) — information, not a gate`);
        /* по одному эффекту */
        const chain=new Set(autChainOf(solo));
        for(const id of ['reverb','dly','trmMix']){
          const a1=await rt(solo,{only:id}), a2=await rt(solo,{only:id}), X=bufCmp(a1,a2,REP_WET), ok= X.rel<=REP_WET && Math.abs(X.total-1)<=REP_WET;
          notes.push(`evidence · L${solo+1} solo, only ${id} open${chain.has(id)?'':' (not in this track’s chain)'}: max difference ${e3(X.rel)} of peak, total RMS ratio ${f4(X.total)} — ${ok?'repeatable':'NOT REPEATABLE'}`);
          if(!ok) miss(`L${solo+1} solo: with only ${id} open two renders differ — max ${e3(X.rel)} of peak, RMS ratio ${f4(X.total)}: this stage is not repeatable`);
        }
      }
    }catch(err){ miss(`L${solo+1} solo: the offline render failed — ${err&&err.message}`); }
  }
  if(drum!=null && !QUICK){ cases++;   // P.quick: ударные — только в P.all
    try{ const a=await rt(drum), b=await rt(drum), X=bufCmp(a,b,REP_DRY);
      notes.push(`L${drum+1} drums (control): twice — max difference ${e3(X.rel)} of peak`);
      if(!X.shape||!(X.rel<=REP_DRY)) miss(`L${drum+1} drums: two renders differ by ${e3(X.rel)} of peak`); }
    catch(err){ miss(`L${drum+1} drums: the offline render failed — ${err&&err.message}`); }
  }
  // ---- договор заморозки: соло без карты → живая цепь в подписи (синхронно: подмена и возврат вибрато — без единого await) ----
  for(const ly of [solo,drum].filter(x=>x!=null)){ cases++;
    const noFx=events.some(e=>e.layer===ly&&(e.fn==='leadOn'||e.fn==='leadSet')&&e.a&&e.a.fx==null);
    const keepVib=liveFx.vib; let s0, s1, s2;
    try{ s0=freezeTicket(ly).sig; liveFx.vib=keepVib===0.5?0.25:0.5; s1=freezeTicket(ly).sig; }
    finally{ liveFx.vib=keepVib; }
    s2=freezeTicket(ly).sig;
    if(noFx && s1===s0) miss(`L${ly+1}: it has solo notes without an effect map (they sound with the live solo chain), yet moving the live vibrato does not change its freeze signature`);
    if(!noFx && s1!==s0) miss(`L${ly+1}: every note carries its own effect map, yet moving the live vibrato changes its freeze signature`);
    if(s2!==s0) miss(`L${ly+1}: with the live vibrato restored the freeze signature differs`);
    notes.push(`L${ly+1}: ${noFx?'has':'no'} solo notes without a map — live vibrato ${s1===s0?'does not change':'changes'} the freeze signature`);
  }
  console.log(`[scaleprobe repeat] tracks ${L.length} · cases ${cases} · differences ${nBad}${EVID?' · with evidence':''}`);
  notes.forEach(m=>console.log('[scaleprobe repeat] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe repeat] '+m));
  if(!nBad) console.log('[scaleprobe repeat] the same track renders the same twice — dry within the inaudible build-order differences, wet within twice that — the controls show the measure sees a change, and solo notes without a map put the live solo chain into the freeze signature');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* Сравнение двух буферов: rel — наибольшая разница сэмплов в долях пика первого; total/ratio — отношение RMS (всего и по каналам); first —
   секунда первого сэмпла, где разница больше eps·пик (последние биты в счёт не идут). */
function bufCmp(a,b,eps){
  if(a.length!==b.length||a.numberOfChannels!==b.numberOfChannels) return { shape:false, rel:Infinity, ratio:[NaN,NaN], total:NaN, first:null };
  let pk=0, mx=0; const ea=[0,0], eb=[0,0];
  for(let c=0;c<Math.min(2,a.numberOfChannels);c++){ const x=a.getChannelData(c); for(let i=0;i<x.length;i++){ const u=Math.abs(x[i]); if(u>pk) pk=u; } }
  let first=-1; const lim=(eps||0)*pk;
  for(let c=0;c<Math.min(2,a.numberOfChannels);c++){ const x=a.getChannelData(c), y=b.getChannelData(c);
    for(let i=0;i<x.length;i++){ const u=x[i], v=y[i], d=Math.abs(u-v); if(!(d<=mx)) mx=d; if(d>lim && (first<0||i<first)) first=i; ea[c]+=u*u; eb[c]+=v*v; } }
  const ta=ea[0]+ea[1], tb=eb[0]+eb[1];
  return { shape:true, pk, rel: pk>0 ? mx/pk : (mx>0?Infinity:0), ratio: ea.map((e,c)=> e>0 ? Math.sqrt(eb[c]/e) : (eb[c]>0?Infinity:1)),
           total: ta>0 ? Math.sqrt(tb/ta) : (tb>0?Infinity:1), first: first<0 ? null : +(first/a.sampleRate).toFixed(3) };
}
/* ═══ ОЧЕРЕДЬ РЕНДЕРОВ — P.checkQueue (после MX2) ═══
   Два рендера, запрошенные ОДНОВРЕМЕННО (Promise.all, без await между запросами), обязаны дать ровно то же, что каждый ОДИН: сухой
   рендер соло-дорожки и сухой рендер ударной — сначала поодиночке, затем оба разом, и каждый из пары сверяется со своим одиночным
   (≤ 1e-4 пика — допуск сухого из P.checkRepeat: два независимых рендера соло расходятся на последние биты, усиленные вау стадии
   выразительности, до ~2e-5; порча от наложения давала 1.2 пика и Infinity). Ещё — две КОПИИ одного рендера разом (тот же случай, что два быстрых ❄ на одной дорожке). Песня после — та же (число
   событий), очередь пуста.
   ⛳ КОНТРОЛЬ: в миг запроса пары очередь обязана держать ≥ 2 рендера — иначе запросы не пересеклись и проба ничего не проверила; и мера
   обязана видеть разницу — одиночный против того же рендера с панорамой 0.5. Асинхронная: await P.checkQueue(). */
export async function checkQueue(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const EPS=1e-4, n0=events.length, e3=x=>Number.isFinite(x)?x.toExponential(2):String(x);
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);
  const pick=re=>L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&re.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b))[0];
  const A=pick(/^leadOn$/)??pick(/^(chOn|bassOn)$/), B=pick(/^drum$/);
  if(A==null||B==null){ miss('needs an unfrozen pitched track and an unfrozen drum track'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const soloMap=fxSnapshot(chainKeyOf('ld'));
  const R=await import('./render.js');
  const rt=(ly,opt)=>R.renderTrack(ly,{quiet:true, dry:true, solo:soloMap, short:PROBE_SHORT, ...(opt||{})}).then(r=>r.buf);
  try{
    const a0=await rt(A), b0=await rt(B), ap=await rt(A,{trackPan:0.5});
    cases++;
    const pa=rt(A), pb=rt(B), q=R.renderQueue();
    const [a1,b1]=await Promise.all([pa,pb]);
    if(!(q>=2)) miss(`CONTROL: when the pair was requested the queue held ${q} render(s) — the requests did not overlap, nothing was tested`);
    const CA=bufCmp(a0,a1,EPS), CB=bufCmp(b0,b1,EPS), CC=bufCmp(a0,ap,EPS);
    if(!(CA.rel<=EPS)) miss(`L${A+1} rendered together with L${B+1} differs from L${A+1} rendered alone — max ${e3(CA.rel)} of peak${CA.first!=null?`, from ${CA.first} s`:''}`);
    if(!(CB.rel<=EPS)) miss(`L${B+1} rendered together with L${A+1} differs from L${B+1} rendered alone — max ${e3(CB.rel)} of peak${CB.first!=null?`, from ${CB.first} s`:''}`);
    if(!(CC.rel>EPS*100)) miss(`CONTROL: a pan of 0.5 renders the same as centre within ${EPS} — the measure cannot see a difference`);
    meas('pitched together vs alone (of peak)', CA.rel, EPS, 'max'); meas('drums together vs alone (of peak)', CB.rel, EPS, 'max'); meas('control: pan 0.5 vs centre', CC.rel, EPS*100, 'min');
    notes.push(`two tracks at once (queue ${q}): L${A+1} ${e3(CA.rel)}, L${B+1} ${e3(CB.rel)} of peak against alone; control (pan 0.5) ${e3(CC.rel)}`);
    cases++;
    const pc=rt(A), pd=rt(A), q2=R.renderQueue();
    const [c1,c2]=await Promise.all([pc,pd]);
    const C1=bufCmp(a0,c1,EPS), C2=bufCmp(a0,c2,EPS);
    if(!(q2>=2)) miss(`CONTROL: the same track twice — the queue held ${q2} render(s) when requested`);
    if(!(C1.rel<=EPS&&C2.rel<=EPS)) miss(`L${A+1} rendered twice at once differs from alone — ${e3(C1.rel)} / ${e3(C2.rel)} of peak`);
    notes.push(`the same track twice at once (queue ${q2}): ${e3(C1.rel)} / ${e3(C2.rel)} of peak against alone`);
  } catch(err){ miss('a render failed — '+(err&&err.message)); }
  cases++;
  if(events.length!==n0) miss(`the song changed during the renders: ${n0} events before, ${events.length} after`);
  if(R.renderQueue()!==0) miss(`the render queue is not empty afterwards (${R.renderQueue()})`);
  console.log(`[scaleprobe queue] cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe queue] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe queue] '+m));
  if(!nBad) console.log('[scaleprobe queue] renders requested at once wait for each other and give exactly what each gives alone; the song and the queue are untouched afterwards');
  return { cases, song:L.length, total:nBad, differences:bad };
}
const volAmpOf=v=>{ const x=v>0?(v<1?v:1):0; return x*x; };   // та же кривая, что config.volAmp (проба не тянет config ради одной строки)
/* ═══ AR1: ОКНО АРАНЖИРОВКИ — P.checkArrange ═══
   Окно открывается ТЕМ ЖЕ входом, что ✎ (ui.arrApi — функции кнопок), и для КАЖДОЙ дорожки, пролистав строки (laneRow0): строка нарисована
   в окне (снимок loopView с full) и целиком на экране; попадание по ней — «вооружить» у заголовка, «открыть» по телу, M / S / ❄ в гнёздах —
   ЕЁ слой; число МИНИАТЮР строки = число её сегментов (высотная роль — songSegs) или ударов (ударные — songNotes); тап «открыть» (тот же
   вход, что тап) открывает в редакторе ИМЕННО её. Окно времени ОБЩЕЕ в обе стороны: задано в окне — тем же отрезком нарисован редактор
   (rollGeom), задано в редакторе — тем же отрезком нарисовано окно после возврата (arrGeom). Кадры ждёт сама: await P.checkArrange().
   Окно, прокрутку и отрезок времени возвращает как были. Нужен запущенный звук и непустая песня; во время записи — отказ. */
export async function checkArrange(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keep={ row0:laneRow0, b0:rollBeat0, span:rollSpan }, SV=songSegs(), NV=songNotes();
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  try{
    arrApi.open(); await frame(); await frame();
    if(!arrOpen){ miss('✎ (arrApi.open) did not open the arrangement window'); return { cases, song:L.length, total:nBad, differences:bad }; }
    for(const [i,ly] of L.entries()){ cases++;
      let V=loopViewProbe();
      if(!V||!V.full){ miss('the arrangement is not drawn (the snapshot is not the full-screen one)'); break; }
      if(!V.rows.includes(ly)){ const S=loopScroll();
        if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all?V.all.indexOf(ly):i))); await frame(); await frame(); V=loopViewProbe(); } }
      if(!V||!V.rows.includes(ly)){ miss(`L${ly+1}: not among the arrangement's rows even after scrolling`); continue; }
      const ri=V.rows.indexOf(ly), y=V.gy0+ri*V.rowH+V.rowH/2;
      if(V.gy0+(ri+1)*V.rowH>innerHeight) miss(`L${ly+1}: its row lies below the bottom of the screen`);
      const at=(x,want)=>{ const h=loopHit(x,y); if(!h||h.layer!==ly||h.what!==want) miss(`L${ly+1}: a tap at x ${Math.round(x)} gives ${h?h.what+' L'+(h.layer+1):'nothing'}, not ${want}`); };
      at(V.x0-8,'arm'); at(V.x0+V.bw/2,'open');   // AR2: левее ИМЕНИ теперь ручка перестановки — вооружает тап по имени (у кромки дорожки)
      const seen=new Set(); for(let x=V.tx0; x<V.tx0+160; x++){ const h=loopHit(x,y); if(h&&h.layer===ly) seen.add(h.what); }
      for(const w of ['mute','solo','frz']) if(!seen.has(w)) miss(`L${ly+1}: its ${w} button is not hittable`);
      cases++; const M=V.mini&&V.mini.get(ly);
      const nSeg=SV.segs.filter(s=>s.layer===ly).length, nHit=NV.notes.filter(n=>n.layer===ly&&n.role==='dr').length;
      if(!M) miss(`L${ly+1}: no miniature drawn`);
      else if(M.items.length!==(nSeg||nHit)) miss(`L${ly+1}: ${M.items.length} miniatures, ${nSeg?nSeg+' segments':nHit+' hits'}`);
    }
    // ---- открыть каждую дорожку из окна; окно времени — общее в обе стороны ----
    const W1={ b0:4, span:12 };
    arrApi.setWin(W1.b0, W1.span); await frame(); await frame();
    const w1=arrGeom(); cases++;
    if(!w1 || !near(w1.beat0,rollBeat0) || !near(w1.span,rollSpan)) miss(`the arrangement does not draw the shared window (${w1&&w1.beat0}/${w1&&w1.span} vs ${rollBeat0}/${rollSpan})`);
    for(const ly of L){ cases++;
      const b0=rollBeat0, sp=rollSpan;
      arrApi.openTrack(ly); await frame(); await frame();
      if(!rollOpen || editLayer()!==ly){ miss(`L${ly+1}: tapping its row does not open it in the editor (open: ${rollOpen}, layer L${editLayer()==null?'—':editLayer()+1})`); if(rollOpen) arrApi.closeTrack(); continue; }
      const g=rollGeom();
      if(!g || !near(g.beat0,b0) || !near(g.span,sp)) miss(`L${ly+1}: the editor opens on ${g&&g.beat0}/${g&&g.span}, not the arrangement's ${b0}/${sp}`);
      arrApi.closeTrack(); await frame(); await frame();
      if(!arrOpen || rollOpen) miss(`L${ly+1}: closing the editor does not return to the arrangement`);
    }
    cases++;   // редактор → окно: отрезок, заданный в редакторе, окно рисует после возврата
    arrApi.openTrack(L[0]); await frame();
    arrApi.setWin(8, 6); await frame(); await frame();
    const g2=rollGeom(), want={ b0:rollBeat0, span:rollSpan };
    arrApi.closeTrack(); await frame(); await frame();
    const w2=arrGeom();
    if(!g2 || !w2 || !near(w2.beat0,want.b0) || !near(w2.span,want.span) || !near(g2.span,want.span)) miss(`zoom set in the editor (${want.b0}/${want.span}) is not the arrangement's after returning (${w2&&w2.beat0}/${w2&&w2.span})`);
  } finally {
    if(rollOpen) arrApi.closeTrack();
    if(arrOpen) arrApi.close();
    setLaneRow0(keep.row0); arrApi.setWin(keep.b0, keep.span);
  }
  console.log(`[scaleprobe arrange] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe arrange] '+m));
  if(!nBad) console.log('[scaleprobe arrange] every track has its row in the arrangement — drawn, on screen, hittable (arm, open, M, S, ❄) — with one miniature per segment or hit; a row opens exactly its track; the time window is shared both ways');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ AR2: ИМЕНА, ЦВЕТА И ПОРЯДОК ДОРОЖЕК — P.checkTrackLook ═══
   (1) ИМЯ ПО УМОЛЧАНИЮ — «роль · тембр» на ОБОИХ языках, собранное здесь НЕЗАВИСИМО (recorder.laneRoleOf/laneTimbreOf — проход по событиям,
       audio.timbresOf, словарь) против draw.laneDefName (мемо recorder.laneLook и кэш имён); laneTitle = данное имя, иначе оно.
   (2) ПАЛИТРА — данные (config.INSTR_COL): у четырёх ролей РАЗНАЯ светлота (соседи по яркости ≥ 1.3× по контрасту — различимы и
       дальтонику) и каждая ≥ 4.5:1 к фону строки окна (имя — текст 12 px); цвет дорожки — цвет её роли (без роли — серый).
   (3) ВЕЗДЕ ОДНО — для КАЖДОЙ дорожки, с прокруткой строк: полоса игры, окно аранжировки, лицо микшера (снимок loopView.look — имя и цвет,
       которыми строка нарисована) и редактор (снимок rollView.col — цвет нот; чип дорожки — «L# · имя», --role — цвет).
   (4) ПЕРЕИМЕНОВАНИЕ — имя видно во всех четырёх местах, переживает прокрутку строк и смену лица; пустое — снова по умолчанию; длинное — 40 знаков.
   (5) ПЕРЕСТАНОВКА — последняя дорожка встаёт первой (recorder.moveLane): порядок ОДИН в окне, микшере и на полосе (снимок all = laneOrder),
       прочие сохраняют свой порядок; тап по телу каждой видимой строки ловится как ЕЁ дорожка («открыть» в окне, фейдер в микшере), ручка —
       'move' с местом строки; открыв первую строку, редактор стоит на ней, а чип дорожки ведёт к СЛЕДУЮЩЕЙ в этом порядке.
   (6) ПРАВИЛО #27 — временная дорожка с именем и ПЕРВЫМ местом снята (✕ дважды, как на полосе); следующая, родившаяся на ТОМ ЖЕ номере, —
       без имени и В КОНЦЕ. Песня после — та же (события, порядок). Нужен стоящий транспорт (иначе часть 6 пропускается с расхождением).
   Имена и места (ровно как были — recorder.laneShowKeep), окно, лицо, отрезок времени и прокрутку возвращает. Кадры ждёт сама:
   await P.checkTrackLook(). */
export async function checkTrackLook(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const LS=laneOrder();
  const done=()=>({ cases, song:LS.length, total:nBad, differences:bad });
  if(LS.length<2){ miss('fewer than two tracks — run await P.seed({replace:true})'); return done(); }
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return done(); }
  if(recording){ miss('recording — stop it first'); return done(); }
  const colOf=ly=>{ const r=laneRoleOf(ly); return r ? INSTR_COL[r] : LANE_NOROLE_COL; };
  const defOf=ly=>{ const r=laneRoleOf(ly);
    if(!r) return events.some(e=>e.layer===ly&&e.fn==='drone') ? t('track.drone') : t('arr.noRole');
    const e=timbresOf(r).find(z=>z.id===laneTimbreOf(ly)); return t('track.role.'+r)+(e?' · '+L(e.name):''); };
  const lum=h=>{ const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
  const cr=(a,b)=>(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  // строка видна (прокрутить к ней по месту в ОБЩЕМ порядке) — снимок или null
  const showRow=async ly=>{ let V=loopViewProbe(); if(!V) return null;
    if(!V.rows.includes(ly)){ const S=loopScroll(); if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all.indexOf(ly)))); await frame(); await frame(); V=loopViewProbe(); } }
    return V&&V.rows.includes(ly) ? V : null; };
  const lookAt=async (where,ly,full)=>{ cases++;
    const V=await showRow(ly); if(!V){ miss(`${where}: L${ly+1} is not among the drawn rows even after scrolling`); return; }
    if(!!V.full!==full){ miss(`${where}: the drawn screen is ${V.full?'the arrangement':'the play strip'}`); return; }
    const k=V.look&&V.look.get(ly); if(!k){ miss(`${where}: L${ly+1}: the row's name and colour are not in the snapshot`); return; }
    if(k.name!==laneTitle(ly)) miss(`${where}: L${ly+1} reads «${k.name}», not «${laneTitle(ly)}»`);
    if(k.col!==colOf(ly)) miss(`${where}: L${ly+1} is drawn ${k.col}, its role's colour is ${colOf(ly)}`);
    const F=V.frame; if(F && k.lblX0!=null) for(const [w,a,b] of [['label',k.lblX0,k.lblX1],['name',k.nameX0,k.nameX1]])   // AR2-fix: нарисованные тексты — внутри рамки
      if(b>a && (a<F[0]-0.5||b>F[1]+0.5)) miss(`${where}: L${ly+1}'s ${w} is drawn at [${a.toFixed(1)}, ${b.toFixed(1)}], outside the frame [${F[0]}, ${F[1]}]`); };
  const editorAt=async ly=>{ cases++;
    arrApi.openTrack(ly); await frame(); await frame();
    if(!rollOpen||editLayer()!==ly){ miss(`editor: L${ly+1} does not open`); if(rollOpen) arrApi.closeTrack(); return; }
    const g=rollGeom(), chip=document.getElementById('rollTrack'), want=t('roll.track',{n:ly+1})+' · '+laneTitle(ly);
    if(!g || (g.col||LANE_NOROLE_COL)!==colOf(ly)) miss(`editor: L${ly+1}'s notes are drawn ${g&&g.col}, its role's colour is ${colOf(ly)}`);
    if(chip){ if(chip.textContent!==want) miss(`editor: the track chip reads «${chip.textContent}», not «${want}»`);
      if(chip.style.getPropertyValue('--role')!==laneCol(ly) || laneCol(ly)!==colOf(ly)) miss(`editor: the track chip's colour is ${chip.style.getPropertyValue('--role')||'none'}, not ${colOf(ly)}`); }
    arrApi.closeTrack(); await frame(); };
  const everywhere=async (lys,label)=>{   // полоса игры → окно → микшер → редактор (из окна)
    await frame(); await frame();
    for(const ly of lys) await lookAt(label+' · play strip',ly,false);
    arrApi.open(); await frame(); await frame();
    if(!arrOpen){ miss(label+': the arrangement does not open'); return; }
    for(const ly of lys) await lookAt(label+' · arrangement',ly,true);
    arrApi.face('mix'); await frame(); await frame();
    for(const ly of lys) await lookAt(label+' · mixer',ly,true);
    arrApi.face('arr'); await frame();
    for(const ly of lys) await editorAt(ly);
    arrApi.close(); await frame(); };
  const restoreShow=laneShowKeep(), wk=winKeep();
  try{
    // ---- 1) имя по умолчанию, оба языка ----
    for(const lg of ['en','ru']) withLang(lg,()=>{ for(const ly of LS){ cases++;
      const want=defOf(ly), got=laneDefName(ly);
      if(got!==want) miss(`default name (${lg}) L${ly+1}: «${got}», not «${want}»`);
      if(laneTitle(ly)!==(laneNameOf(ly)||want)) miss(`name (${lg}) L${ly+1}: «${laneTitle(ly)}» is neither its own name nor the default`); } });
    // ---- 2) палитра ----
    { cases++; const roles=['ld','ch','bs','dr'], Y=roles.map(r=>lum(INSTR_COL[r])).sort((a,b)=>a-b), bg=lum('#141420');
      for(let i=1;i<Y.length;i++) if(cr(Y[i],Y[i-1])<1.3) miss(`palette: two role colours are too close in lightness (contrast ${cr(Y[i],Y[i-1]).toFixed(2)} < 1.3)`);
      for(const r of roles) if(cr(lum(INSTR_COL[r]),bg)<4.5) miss(`palette: ${r} ${INSTR_COL[r]} reads ${cr(lum(INSTR_COL[r]),bg).toFixed(2)}:1 on a row, below 4.5:1`);
      for(const ly of LS){ cases++; if(laneCol(ly)!==colOf(ly)) miss(`colour: L${ly+1} is ${laneCol(ly)}, its role's colour is ${colOf(ly)}`); } }
    // ---- 3) везде одно ----
    await everywhere(LS,'look');
    // ---- 4) переименование ----
    const A=LS[0], NAME='Probe · name ✓';
    cases++; setLaneName(A, NAME);
    if(laneTitle(A)!==NAME) miss(`rename: L${A+1} reads «${laneTitle(A)}» after the rename`);
    await everywhere([A],'renamed');
    arrApi.open(); await frame(); await frame();
    { const S=loopScroll(); if(S){ cases++; setLaneRow0(S.nAll-S.visN); await frame(); await frame(); setLaneRow0(0); await frame(); await frame(); await lookAt('renamed · after a scroll',A,true); } }
    arrApi.face('mix'); await frame(); await frame(); await lookAt('renamed · after a face switch',A,true);
    arrApi.face('arr'); arrApi.close(); await frame();
    cases++; setLaneName(A,'   ');
    if(laneNameOf(A)!==null || laneTitle(A)!==laneDefName(A)) miss(`rename: an empty name does not return to the default («${laneTitle(A)}»)`);
    cases++; setLaneName(A,'x'.repeat(60));
    if((laneNameOf(A)||'').length!==40) miss(`rename: a 60-character name keeps ${(laneNameOf(A)||'').length} characters, not 40`);
    setLaneName(A,null);
    // ---- 5) перестановка ----
    const Z=LS[LS.length-1]; cases++;
    moveLane(Z,0);
    const O=laneOrder();
    if(O[0]!==Z) miss(`reorder: L${Z+1} moved to the top, but the order starts with L${O[0]+1}`);
    if(JSON.stringify(O.slice(1))!==JSON.stringify(LS.filter(l=>l!==Z))) miss('reorder: the other tracks did not keep their order');
    await frame(); await frame();
    const sameAll=(where)=>{ cases++; const V=loopViewProbe(); if(!V||!V.all) { miss(`${where}: not drawn`); return null; }
      if(JSON.stringify(V.all)!==JSON.stringify(O)) miss(`${where}: rows are drawn in the order ${V.all.map(l=>'L'+(l+1)).join(' ')}, not ${O.map(l=>'L'+(l+1)).join(' ')}`); return V; };
    setLaneRow0(0); await frame(); await frame(); sameAll('reorder · play strip');
    arrApi.open(); await frame(); await frame();
    const hitRows=(where,want)=>{ const V=sameAll(where); if(!V) return;
      V.rows.forEach((ly,ri)=>{ cases++; const y=V.gy0+ri*V.rowH+V.rowH/2;
        if(ly!==O[V.row0+ri]) miss(`${where}: row ${ri+1} shows L${ly+1}, the order says L${O[V.row0+ri]+1}`);
        const h=loopHit(V.x0+(V.mix?6:V.bw/2),y); if(!h||h.layer!==ly||h.what!==want) miss(`${where}: a tap on row ${ri+1} gives ${h?h.what+' L'+(h.layer+1):'nothing'}, not ${want} L${ly+1}`);
        const g=loopHit(V.hx0+4,y); if(!g||g.what!=='move'||g.layer!==ly||g.row!==V.row0+ri) miss(`${where}: row ${ri+1}'s handle gives ${g?g.what+' L'+(g.layer+1)+' at '+g.row:'nothing'}, not move L${ly+1} at ${V.row0+ri}`); }); };
    setLaneRow0(0); await frame(); await frame();
    hitRows('reorder · arrangement','open');
    arrApi.face('mix'); await frame(); await frame();
    hitRows('reorder · mixer','level');
    arrApi.face('arr'); await frame();
    cases++; arrApi.openTrack(O[0]); await frame(); await frame();
    if(editLayer()!==Z) miss(`reorder: opening the first row opens L${editLayer()==null?'—':editLayer()+1}, not L${Z+1}`);
    { const chip=document.getElementById('rollTrack'); if(chip && !chip.disabled){ chip.click(); await frame();
        if(editLayer()!==O[1]) miss(`reorder: the editor's track chip goes from L${Z+1} to L${editLayer()==null?'—':editLayer()+1}, not to the next in the order (L${O[1]+1})`); } }
    arrApi.closeTrack(); await frame(); arrApi.close(); await frame();
    // ---- 6) правило #27: новая дорожка на номере удалённой ----
    if(!loop.on){ cases++;
      const nEv=events.length, O0=laneOrder();
      const tmp=()=>{ const T=Math.ceil(songBeats())+8;
        const r=seedTake([{fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:0,v:0},t:T,id:1}, {fn:'leadOff',a:{v:0},t:T+1,id:1}]);
        return r&&r.layers.length ? r.layers[0] : null; };
      const del=ly=>{ laneDelTap(ly); return laneDelTap(ly); };
      const T1=tmp();
      if(T1==null) miss('rule #27: the temporary track could not be recorded');
      else{
        setLaneName(T1,'Probe temp'); moveLane(T1,0);
        if(laneOrder()[0]!==T1||laneTitle(T1)!=='Probe temp') miss('rule #27: the temporary track did not take its name and the first place');
        if(!del(T1)) miss('rule #27: the temporary track could not be deleted');
        const T2=tmp();
        if(T2==null) miss('rule #27: the second temporary track could not be recorded');
        else{
          if(T2!==T1) console.log(`[scaleprobe track-look] rule #27: the second temporary track took L${T2+1}, not the freed L${T1+1} — still checked`);
          if(laneNameOf(T2)!==null) miss(`rule #27: a new track on L${T2+1} inherits the deleted track's name «${laneNameOf(T2)}»`);
          const O2=laneOrder(); if(O2[O2.length-1]!==T2) miss(`rule #27: a new track on L${T2+1} is not last (it is at place ${O2.indexOf(T2)+1} of ${O2.length})`);
          if(!del(T2)) miss('rule #27: the second temporary track could not be deleted'); }
        if(events.length!==nEv || JSON.stringify(laneOrder())!==JSON.stringify(O0)) miss('rule #27: the song is not back as it was (events or order)');
      }
    } else miss('rule #27: the transport is playing — stop it first');
    // ---- 7) AR2-fix: полоса игры на ширинах 360 / 380 / 768 / 1280 px — каждый «L#» и имя внутри рамки и своей колонки ----
    for(const W of [360,380,768,1280]){ const SP=stripProbe(W);
      for(const r of SP.rows){ cases++; const [f0,f1]=r.frame;
        for(const [w,[a,b]] of [['label',r.lbl],['name',r.name]]){
          if(b>a && (a<f0-0.5||b>f1+0.5)) miss(`strip at ${W} px: L${r.ly+1}'s ${w} [${a.toFixed(1)}, ${b.toFixed(1)}] leaves the frame [${f0}, ${f1}]`);
          if(b>a && (a<r.col[0]-0.5||b>r.col[1]+0.5)) miss(`strip at ${W} px: L${r.ly+1}'s ${w} [${a.toFixed(1)}, ${b.toFixed(1)}] leaves its name column [${r.col[0]}, ${r.col[1]}]`); } }
      cases++; const o=SP.old;   // контроль: прежняя раскладка («L#» правым краем у x0−4) — та, что торчала у пользователя; мера обязана её поймать
      if(!(o.lbl[0]<o.frame[0]-0.5)) miss(`control at ${W} px: the old label place [${o.lbl[0].toFixed(1)}, ${o.lbl[1].toFixed(1)}] reads as inside the frame [${o.frame[0]}, ${o.frame[1]}] — the check could not catch the overflow`); }
  } finally {
    if(rollOpen) arrApi.closeTrack();
    restoreShow(); winRestore(wk);
  }
  await frame();
  console.log(`[scaleprobe track-look] tracks ${LS.length} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe track-look] '+m));
  if(!nBad) console.log('[scaleprobe track-look] default names follow role and timbre in both languages; the four role colours differ in lightness; every track is drawn with one name and one colour in the play strip, the arrangement, the mixer and the editor; a rename shows everywhere and survives a scroll and a face switch; a reorder is one order everywhere and every row still opens its own track; a new track on a deleted number inherits neither name nor place');
  return done();
}
/* ═══ ⛳ AF1: ОЧЕРЕДЬ АВТОЗАМОРОЗКИ — P.checkFreezeQueue ═══
   Очередь (frzqueue.js) гоняется ВРУЧНУЮ (qStep) на ПОДМЕНЁННЫХ часах и воротах, исполнитель — настоящий render.freeze (билет и freezeSet —
   настоящие) с ПОДДЕЛЬНЫМ рендером (буфер-пустышка, без копии движка): так проверяются приоритет, ворота и устаревание за доли секунды.
   (1) ПРИОРИТЕТ, чистая функция: слышимые раньше заглушённых; под бегунком — первыми; впереди — по расстоянию; позади — после (до конца
       песни и с начала); при крутящейся скобе — по кругу скобы, вне скобы — последними. КОНТРОЛЬ: порядок песни ≠ ожидаемому.
   (2) ПРИОРИТЕТ, настоящие дорожки: три незамороженные с непересекающимися краями A < B < C, бегунок на начале B: порядок исполнения B, C, A;
       B заглушена: C, A, B. КОНТРОЛЬ: порядок песни (A, B, C) не совпадает ни с одним.
   (3) ЗАПИСЬ и КЛИП: при закрытых воротах шаг не начинает ничего (исполнитель не позван ни разу); открыли — начал. ВНУТРИ рендера: ворота
       закрылись после выбора — раскладка (o.layoutGate) не начинается, пока не откроются.
   (4) ЩИПОК: раскладка дороже бюджета — ждёт; не мерили ни разу — ждёт; дешевле — идёт.
   (5) УСТАРЕВШИЙ РЕЗУЛЬТАТ: во время «рендера» сдвинули панораму дорожки (она в подписи) — буфер НЕ поставлен (дорожка не заморожена), запись
       снова в очереди; пока подпись не устоялась — не берётся; устоялась — второй рендер, поставлен, свежая.
   (6) МЕНЯЛАСЬ, ПОКА ЖДАЛА: три сдвига панорамы через полвремени успокоения — ни одного рендера; после успокоения — РОВНО ОДИН, и поставленный
       буфер свеж против ПОСЛЕДНЕЙ подписи.
   Всё возвращается: панорамы, приглушения, заморозки, сделанные пробой (размораживаются), замеры очереди (qEnd). Нужны: звук запущен, транспорт
   стоит, редактор и окно закрыты, R.autoFreeze выключен, ни одна дорожка не в соло; для (2) — три незамороженные дорожки с раздельными краями
   (на посеве есть; нет — случай «не применим», не расхождение). */
export async function checkFreezeQueue(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  const out=()=>({ cases, song:L.length, total:nBad, differences:bad });
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(!LIVE_AC){ miss('audio is not started (press ▶ Play)'); return out(); }
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return out(); }
  if(recording||loop.on){ miss('the transport is playing or recording — stop it first'); return out(); }
  if(laneSoloOn()){ miss('a track is soloed — un-solo it first (audibility is part of the priority)'); return out(); }
  const R=await import('./render.js');
  if(R.autoFreeze()){ miss('R.autoFreeze is ON — turn it off (R.autoFreeze(false)) before this probe'); return out(); }
  /* ---- (1) чистая функция приоритета ---- */
  { const ctx={p:10,end:100,rgn:null}, it=(id,audible,b0,b1)=>({id,layer:id,audible,b0,b1});
    const items=[it(1,false,0,200),it(2,true,50,60),it(3,true,5,20),it(4,true,0,5),it(5,true,12,30)];
    const want=[3,5,2,4,1], got=qRank(items,ctx).map(x=>x.id), got2=qRank(items.slice().reverse(),ctx).map(x=>x.id); cases+=2;
    if(got.join()!==want.join()) miss(`priority (pure): expected ${want.join(',')} (under the playhead, ahead by distance, behind, muted last), got ${got.join(',')}`);
    if(got2.join()!==want.join()) miss(`priority (pure): the order depends on the input order — ${got2.join(',')}`);
    const cyc={p:20,end:100,rgn:{on:true,from:8,to:24}}, items2=[it(1,true,0,4),it(2,true,22,23),it(3,true,9,10),it(4,true,30,40)];
    const want2=[2,3,1,4], g3=qRank(items2,cyc).map(x=>x.id); cases++;
    if(g3.join()!==want2.join()) miss(`priority (cycling brace 8–24, playhead 20): expected ${want2.join(',')} (ahead in the cycle, then around it, outside the brace last), got ${g3.join(',')}`);
    const songOrd=items.slice().sort((a,b)=>a.b0-b.b0||a.id-b.id).map(x=>x.id); cases++;
    if(songOrd.join()===want.join()) miss('priority CONTROL: the song order equals the expected order — the case cannot tell priority from song order');
    notes.push(`priority (pure): ${got.join(',')} · cycling: ${g3.join(',')}`); }
  /* ---- подготовка: дорожки, подмены ---- */
  const span=new Map(); for(const e of events){ const s=span.get(e.layer); if(!s) span.set(e.layer,{b0:e.t,b1:e.t}); else { s.b0=Math.min(s.b0,e.t); s.b1=Math.max(s.b1,e.t); } }
  for(const [ly,s] of span){ const Ln=laneLenOf(ly); if(Ln>s.b1) s.b1=Ln; }
  const free=L.filter(ly=>freezeState(ly)==='none' && !laneMuted(ly)).sort((a,b)=>span.get(a).b0-span.get(b).b0||a-b);
  let tri=null;
  for(const b of free){ const B=span.get(b);
    const a=free.find(x=>x!==b && span.get(x).b1<B.b0-1e-9), c=free.find(x=>x!==b && span.get(x).b0>B.b1+1e-9);
    if(a!=null&&c!=null){ tri=[a,b,c]; break; } }
  if(!free.length){ miss('the song has no unfrozen, unmuted track — run await P.seed({replace:true})'); return out(); }
  /* (2) нужна тройка с раздельными краями — на посеве есть; у демо-пьесы её может не быть (пад тянется через всю песню): тогда случай (2)
     «не применим», это не расхождение. Случаи (3)–(6) берут любые дорожки (по кругу, повтор законен: каждый случай размораживает своё). */
  const rest0=free.filter(ly=>!tri||!tri.includes(ly)), rest= rest0.length ? rest0 : free, pickR=i=>rest[i%rest.length];
  let T=0; const G={ recording:false, clip:false, pinch:false }, calls=[];
  let ctxP=0, panHit=null, gateLog=null;
  const fake=async(layer,o)=>{ calls.push(layer);
    await new Promise(r=>setTimeout(r,0));
    if(panHit===layer){ setLanePan(layer, (lanePanOf(layer)===0.5?0.25:0.5)); panHit=null; }   // (5): дорожка меняется ВО ВРЕМЯ рендера
    if(o.layoutGate){ await o.layoutGate(); if(gateLog) gateLog.passed=true; }
    return { buf:LIVE_AC.createBuffer(2,128,LIVE_AC.sampleRate), startSec:0.5, endSec:0.5, tailSec:0, pinned:{ tonic, aRef, bpm:loop.bpm }, ms:{ layoutMs:null } }; };
  const keepPan=new Map(L.map(ly=>[ly,lanePanOf(ly)])), touchedMute=new Set(), mine=new Set();
  const SETTLE=100, STEP=SETTLE+1, Lb=x=>'L'+(x+1);
  const hook={ now:()=>T, gates:{ recording:()=>G.recording, clip:()=>G.clip, pinch:()=>G.pinch },
               ctx:()=>({ p:ctxP, end:songBeats(), rgn:null }), opt:{ renderFn:fake, noPin:true }, noPin:true, settleMs:SETTLE, frameMs:8, gatePollMs:5 };
  if(!qBegin(hook)){ miss('the freeze queue is busy (on, or a render is running) — wait and run again'); return out(); }
  const drain=async(max=12)=>{ for(let i=0;i<max;i++){ T+=STEP; const st=qStep();
      if(st.startsWith('start:')){ mine.add(calls[calls.length-1]); await qRunning(); } else if(st==='idle') break; } };
  const unfreezeMine=()=>{ for(const ly of mine) if(freezeState(ly)!=='none') unfreezeLayer(ly); };
  try{
    /* ---- (2) приоритет на настоящих дорожках ---- */
    if(!tri) notes.push('priority (tracks): not applicable on this song — no three unfrozen tracks with separate spans (the seed has them)');
    else { const [A,B,C]=tri;
    ctxP=span.get(B).b0;
    for(const [want,muted] of [[[B,C,A],null],[[C,A,B],B]]){ cases++;
      if(muted!=null){ toggleLaneMute(muted); touchedMute.add(muted); }
      calls.length=0; for(const ly of [A,B,C]) qAdd(ly,'probe');
      await drain();
      const got=calls.slice();
      if(got.join()!==want.join()) miss(`priority (tracks): playhead at ${Lb(B)}'s start${muted!=null?`, ${Lb(muted)} muted`:''} — expected ${want.map(Lb).join(', ')}, rendered ${got.map(Lb).join(', ')}`);
      if(want.join()===[A,B,C].join()) miss('priority (tracks) CONTROL: the expected order equals the song order');
      notes.push(`priority (tracks)${muted!=null?' with '+Lb(muted)+' muted':''}: ${got.map(Lb).join(', ')}`);
      if(muted!=null){ toggleLaneMute(muted); touchedMute.delete(muted); }
      unfreezeMine(); } }
    /* ---- (3) запись и клип ---- */
    const D=pickR(0), E=pickR(1), F=pickR(2), H=pickR(3);
    for(const g of ['recording','clip']){ cases++;
      calls.length=0; qAdd(D,'probe'); G[g]=true;
      const st=[]; for(let i=0;i<4;i++){ T+=STEP; st.push(qStep()); }
      if(calls.length || st.some(s=>s!=='gate:'+g)) miss(`gate (${g}): while ${g} the queue must start nothing — steps said ${st.join(', ')}, renders started ${calls.length}`);
      G[g]=false; T+=STEP; const s2=qStep(); if(s2.startsWith('start:')){ mine.add(D); await qRunning(); }
      if(!s2.startsWith('start:') || calls.length!==1) miss(`gate (${g}) CONTROL: with the gate open the queue must start the track — step said ${s2}`);
      unfreezeMine(); }
    { cases++; calls.length=0; gateLog={ passed:false }; qAdd(E,'probe'); T+=STEP; const s=qStep();   // ворота закрылись ПОСЛЕ выбора
      if(!s.startsWith('start:')) miss(`gate inside the render: the queue did not start ${Lb(E)} (${s})`);
      else { G.recording=true; mine.add(E);
        await new Promise(r=>setTimeout(r,60));
        if(gateLog.passed) miss('gate inside the render: recording began after the pick, yet the layout went ahead');
        G.recording=false; await qRunning();
        if(!gateLog.passed) miss('gate inside the render CONTROL: with the gate open again the layout never ran'); }
      gateLog=null; unfreezeMine(); }
    /* ---- (4) щипок ---- */
    { const cost0=qCostOf(F); G.pinch=true; qAdd(F,'probe');
      for(const [ms,go] of [[50,false],[null,false],[2,true]]){ cases++; calls.length=0; qCostSet(F,ms); T+=STEP; const s=qStep();
        const started=s.startsWith('start:'); if(started){ mine.add(F); await qRunning(); }
        if(started!==go) miss(`gate (pinch): a hand pinches, the track's layout is ${ms==null?'never measured':ms+' ms'} (budget 8 ms) — it must ${go?'start':'wait'}, the step said ${s}`); }
      G.pinch=false; qCostSet(F,cost0); unfreezeMine(); }
    /* ---- (5) устаревший результат не ставится ---- */
    { cases++; calls.length=0; panHit=H; qAdd(H,'probe'); T+=STEP; const s=qStep();
      if(!s.startsWith('start:')){ miss(`stale: the queue did not start ${Lb(H)} (${s})`); }
      else { mine.add(H); const res=await qRunning();
        if(freezeState(H)!=='none') miss(`stale: ${Lb(H)} changed during its render, yet its buffer was installed (${freezeState(H)})`);
        if(!/stale/.test(res)) miss(`stale: the outcome should be "stale — re-queued", got "${res}"`);
        const en=qState().entries.find(x=>x.id===freezeTicket(H).id);
        if(!en||!en.again) miss('stale: the track is not back in the queue (or not marked "changed during its render")');
        setLanePan(H, keepPan.get(H));                 // подпись меняется ещё раз — успокоение заново
        T+=SETTLE/2; const s1=qStep();
        if(s1.startsWith('start:')){ await qRunning(); miss('stale: the track was re-rendered before its signature settled'); }
        T+=SETTLE; const s2=qStep(); if(s2.startsWith('start:')) await qRunning();
        if(calls.filter(x=>x===H).length!==2 || freezeState(H)!=='fresh') miss(`stale CONTROL: after the signature settled the track should render a second time and be fresh — renders ${calls.filter(x=>x===H).length}, state ${freezeState(H)}`); }
      unfreezeMine(); }
    /* ---- (6) менялась, пока ждала — один рендер с последней подписью ---- */
    { cases++; calls.length=0; qAdd(D,'probe'); const p0=lanePanOf(D);
      const st=[]; for(const p of [0.3,-0.3,0.1]){ T+=SETTLE/2; setLanePan(D,p); st.push(qStep()); }
      if(calls.length) miss(`changing while queued: a render started before the signature settled (steps ${st.join(', ')})`);
      for(let i=0;i<4;i++){ T+=STEP; const x=qStep(); if(x.startsWith('start:')){ mine.add(D); await qRunning(); } }
      if(calls.length!==1) miss(`changing while queued: expected exactly one render after it settled, got ${calls.length}`);
      if(freezeState(D)!=='fresh') miss(`changing while queued: the installed buffer is not fresh against the final signature (${freezeState(D)})`);
      setLanePan(D,p0); unfreezeMine(); }
  }catch(err){ miss('the probe failed: '+(err&&err.message)); }
  finally{
    try{ await qRunning(); }catch(e){ /* исход уже в отчёте */ }
    qEnd();
    for(const ly of touchedMute) toggleLaneMute(ly);
    for(const [ly,p] of keepPan) if(lanePanOf(ly)!==p) setLanePan(ly,p);
    for(const ly of mine) if(freezeState(ly)!=='none') unfreezeLayer(ly);
  }
  console.log(`[scaleprobe freeze-queue] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe freeze-queue] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe freeze-queue] '+m));
  if(!nBad) console.log('[scaleprobe freeze-queue] the queue takes audible tracks near the playhead first, starts nothing while recording or recording a clip (and stops before the layout if that begins after the pick), waits on a pinch when the layout costs a frame, never installs a stale buffer and renders a track that kept changing once, with its final signature');
  return out();
}
/* ═══ ⛳ AF1: ЗАМЕР — РАСКЛАДКА НА ГЛАВНОМ ПОТОКЕ И ПАМЯТЬ ЗАМОРОЖЕННЫХ БУФЕРОВ — P.freezeCost() (по запросу, не в P.all) ═══
   Для КАЖДОЙ дорожки — раскладка без рендера (render.layoutCost: тот же путь, что у заморозки, до startRendering), то есть:
     • layoutMs — синхронный участок главного потока (то, что ворота щипка сравнивают с бюджетом), худший и типичный (медиана);
     • память буфера, который дал бы рендер СЕГОДНЯ: стерео float32 × (разгон 0.5 с + от первого события до конца материала + хвост);
     • (a) ТОЛЬКО НОТЫ И ХВОСТ: объединение [начало ноты, конец ноты + хвост] без разгона — паузы длиннее хвоста не хранятся;
     • (b) 16 БИТ: вдвое меньше float32 (плюс короткие куски float32 у бегунка — не в счёте);
     • ОДИН ЦИКЛ: повторяется ли СОДЕРЖИМОЕ дорожки (те же события с тем же шагом в целое число тактов) — тогда сколько хранил бы один цикл.
   ⚠️ Числа — от живой частоты дискретизации и цепей, как стоят; время раскладки — этой машины (телефон — отдельный замер). */
export async function freezeCost(){
  if(!LIVE_AC){ console.warn('[scaleprobe cost] audio is not started (press ▶ Play)'); return null; }
  if(recording){ console.warn('[scaleprobe cost] recording — stop it first'); return null; }
  const R=await import('./render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b), rows=[], spb=60/loop.bpm, MB=1024*1024;
  const NV=songNotes();
  const repeatOf=ly=>{   // наименьший шаг в целое число тактов, с которым содержимое дорожки повторяется (≥ 2 копий), или null
    const evs=events.filter(e=>e.layer===ly).slice().sort((a,b)=>a.t-b.t); if(evs.length<2) return null;
    const tok=e=>{ const a=e.a||{}; return [e.fn,a.ti,a.oct,a.row,a.kit,a.inst,a.vol!=null?Math.round(a.vol*1000):'',a.ty?JSON.stringify(a.ty):'',a.bri!=null?Math.round(a.bri*1000):''].join('|'); };
    const at=new Set(evs.map(e=>Math.round(e.t*1000)+'#'+tok(e)));
    const b0=evs[0].t, b1=evs[evs.length-1].t, Mt=loop.metre;
    for(let P=Mt; P<=b1-b0+1e-9; P+=Mt){
      let ok=true; for(const e of evs){ if(e.t+P>b1+1e-9) continue; if(!at.has(Math.round((e.t+P)*1000)+'#'+tok(e))){ ok=false; break; } }
      if(ok) return { P, copies:Math.floor((b1-b0)/P+1e-9)+1 };
    }
    return null; };
  for(const ly of L){
    let r=null; try{ r=await R.layoutCost(ly); }catch(err){ rows.push({ track:'L'+(ly+1), error:err&&err.message }); continue; }
    const B=sec=>sec*r.rate*2*4/MB;
    const evs=events.filter(e=>e.layer===ly), t0=Math.min(...evs.map(e=>e.t)), tEnd=t0+r.songSec/spb;
    const iv=[];
    for(const n of NV.notes) if(n.layer===ly) iv.push([(n.start-t0)*spb, ((n.end==null?tEnd:n.end)-t0)*spb + r.tailSec]);
    if(evs.some(e=>e.fn==='drone')) iv.push([0, (tEnd-t0)*spb + r.tailSec]);
    iv.sort((a,b)=>a[0]-b[0]); let a=0, cs=0, ce=-1;
    for(const [s,e] of iv){ if(s>ce){ if(ce>cs) a+=ce-cs; cs=s; ce=e; } else ce=Math.max(ce,e); } if(ce>cs) a+=ce-cs;
    const per=repeatOf(ly);
    /* AF6b: «today» — ПАМЯТЬ СЕЙЧАС: у замороженной — настоящие байты хранилища (frozenInfo.bytes: 16 бит, или Float32-запас без ворклета),
       у прочих — сколько заняла бы её заморозка в 16 битах; «Float32» — прежняя мера (до AF6b), для сравнения */
    const fi=frozenInfo(ly), now16=fi ? fi.bytes/MB : B(r.totalSec)/2;
    rows.push({ track:'L'+(ly+1), role:laneRoleOf(ly)||'—', 'layout ms':r.ms.layoutMs, 'buffer s':+r.totalSec.toFixed(1), frozen: fi ? fi.kind : '—',
      'Float32 MB (before AF6b)':+B(r.totalSec).toFixed(1), 'today MB':+now16.toFixed(2), '(a) notes+tail 16-bit MB':+(B(a)/2).toFixed(1),
      repeats:per?`${per.copies}× every ${per.P/loop.metre} bar(s)`:'—', 'one cycle MB':per?+B(per.P*spb+r.tailSec).toFixed(1):'—' });
  }
  const ok=rows.filter(x=>x['layout ms']!=null), ms=ok.map(x=>x['layout ms']).sort((a,b)=>a-b), med=ms.length?ms[Math.floor((ms.length-1)/2)]:null;
  const sum=k=>+ok.reduce((s,x)=>s+(typeof x[k]==='number'?x[k]:0),0).toFixed(1);
  console.table(rows);
  const res={ tracks:rows.length, layoutWorst:ms.length?ms[ms.length-1]:null, layoutTypical:med, frameBudget:8,
    mb:{ float32:sum('Float32 MB (before AF6b)'), today:sum('today MB'), a16:sum('(a) notes+tail 16-bit MB'),
         frozenNow:+ok.reduce((s,x)=>s+(x.frozen!=='—'?x['today MB']:0),0).toFixed(2) }, rows };
  console.log(`[scaleprobe cost] ${rows.length} tracks · layout worst ${res.layoutWorst} ms, typical ${res.layoutTypical} ms (budget at a pinch ${res.frameBudget} ms) · memory: Float32 (before AF6b) ${res.mb.float32} MB → today (16-bit; real bytes of the frozen tracks) ${res.mb.today} MB, of which frozen now ${res.mb.frozenNow} MB → with (a) notes+tail also ${res.mb.a16} MB`);
  return res;
}
/* ═══ ⛳ LR1: ЖИВОЙ И ЗАМОРОЖЕННЫЙ РЕВЕРБ СОГЛАСНЫ — P.checkRevAgree ═══
   Тело — render.revAgree (там материал, мера, допуск и контроли — см. его шапку): временная дорожка аккордов играет ЖИВЫМ движком (R.live,
   выход мастера снят мимо колонок) и рендерится путём ЗАМОРОЗКИ; энергия хвоста относительно звучания и спектральный баланс хвоста обязаны
   совпасть в пределах допуска (дБ), а контроли — дорожка с другой длиной хвоста и с другой окраской — обязаны из него выйти (мера умеет
   провалиться). Временные дорожки снимаются, величины цепи аккордов возвращаются. Транспорт должен стоять. ≈ 8–10 с: в P.all, не в P.quick. */
export async function checkRevAgree(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('./render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.revAgree();
  if(!r.ok){ miss('live vs frozen reverb: '+r.why); console.warn('[scaleprobe rev-agree] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=3;
  meas('tail energy live − frozen', r.dEnergy, r.tolE, 'abs', ' dB'); meas('tail balance live − frozen', r.dBright, r.tolB, 'abs', ' dB');
  meas('control: decay moves energy by', Math.abs(r.ctrlDecay.dEnergy), r.tolE, 'min', ' dB'); meas('control: tone moves balance by', Math.abs(r.ctrlTone.dBright), r.tolB, 'min', ' dB');
  if(!r.agree) miss(`live and frozen reverb disagree: tail energy Δ ${r.dEnergy} dB, tail balance Δ ${r.dBright} dB (tolerance ±${r.tolE} / ±${r.tolB} dB)`);
  if(Math.abs(r.ctrlDecay.dEnergy)<=r.tolE) miss(`control: a ${r.ctrlDecay.sec}-s tail moves the tail energy by only ${r.ctrlDecay.dEnergy} dB — the energy measure could not fail`);
  if(Math.abs(r.ctrlTone.dBright)<=r.tolB) miss(`control: a ${r.ctrlTone.hz}-Hz tone moves the tail balance by only ${r.ctrlTone.dBright} dB — the balance measure could not fail`);
  console.log(`[scaleprobe rev-agree] tail energy live ${r.live.energy} dB / frozen ${r.frozen.energy} dB (Δ ${r.dEnergy}, tolerance ±${r.tolE}) · tail balance live ${r.live.bright} / frozen ${r.frozen.bright} dB (Δ ${r.dBright}, ±${r.tolB}) · controls: ${r.ctrlDecay.sec}-s tail Δ ${r.ctrlDecay.dEnergy} dB, ${r.ctrlTone.hz}-Hz tone Δ ${r.ctrlTone.dBright} dB · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe rev-agree] '+m));
  return { cases, total:nBad, differences:bad };
}
/* ═══ ⛳ AF6b: 16-БИТНЫЙ ЗАМОРОЖЕННЫЙ БУФЕР ЗВУЧИТ КАК FLOAT32 — P.checkChunks ═══
   Тело — render.chunkCheck (материал, прогоны, сопоставление по кадрам, допуски и контроли — в его шапке): живой мастер, пока замороженная
   дорожка (громче 1.0) играет через стыки кусков, шов скобы и перемотку, против того же прогона с Float32-хранением тем же чтецом; чтец
   против самого рендера; длина до сэмпла. Контроли: кусок со сдвигом на сэмпл, выброшенный кусок, хранение без масштаба — обязаны
   провалиться. Беззвучно (мастер мимо колонок). Транспорт стоит, соло снято, R.autoFreeze выключен. ≈ 12 с — в P.all, не в P.quick. */
export async function checkChunks(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('./render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.chunkCheck();
  if(!r.ok){ miss('16-bit frozen playback: '+r.why); console.warn('[scaleprobe chunks] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=9;   // AF6b-fix2: + утечка чтецов и её контроль
  meas('16-bit vs Float32 residual', r.residual, -90, 'max', ' dB'); meas('reader vs render', r.readerExact, -100, 'max', ' dB'); meas('worst chunk-join step', r.joinWorst, 3, 'max', '×');
  if(r.controls){ meas('control: one-sample shift', r.controls.shift, -90, 'min', ' dB'); meas('control: dropped chunk', r.controls.drop, -90, 'min', ' dB'); meas('control: no scale', r.controls.noscale, -90, 'min', ' dB'); }
  meas('slowest end report after stop', r.endLag, null, null, ' ms');
  for(const m of r.fails) miss(m);
  r.notes.forEach(m=>console.log('[scaleprobe chunks] '+m));
  console.log(`[scaleprobe chunks] track peak ${r.peak} (above 1.0 before the master) · ${r.len} frames · 16-bit vs Float32 residual ${r.residual} dB re peak (limit −90) · reader vs render ${r.readerExact} dB · chunk joins ${r.joins}, worst step ${r.joinWorst}× · controls: one-sample shift ${r.controls&&r.controls.shift} dB, dropped chunk ${r.controls&&r.controls.drop} dB, no scale ${r.controls&&r.controls.noscale} dB (each must be above −90) · end reports: slowest ${r.endLag} ms after the stop (waited up to ${r.endWait} ms) · live readers on the audio thread: before ${r.base}, after ${r.aliveAfter} · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe chunks] '+m));
  if(!nBad) console.log('[scaleprobe chunks] the 16-bit frozen buffer plays as the Float32 render to below −90 dB re its peak — through chunk joins, the loop seam and a seek, exact to the sample; a shifted chunk, a dropped chunk and storage without the scale factor all fail');
  return { cases, total:nBad, differences:bad };
}
/* ═══ ⛳ AF2: ПОДМЕНА СОБЫТИЙ БУФЕРОМ НЕСЛЫШИМА — P.checkSwap ═══
   Тело — render.swapCheck (материал, съём с меткой времени, мера, допуски и контроли — в его шапке): подмена на стоящем транспорте, в
   паузе, перекрёстом на линии такта у тянущегося пада и на шве скобы; каждая — без зазора, щелчка и скачка уровня против того же прогона
   одними событиями. Контроли: прежний вход A2 (голоса своим отпусканием) обязан провалить ОСТАТОК над буфером, жёсткая склейка съёма событий
   с самим собой в миг подмены — щелчок (AUTO-PROBE: прежний живой рубильник щёлкал лишь при несовпадении фаз и однажды «не провалился»).
   Ничего не звучит в колонках (мастер снят мимо них). Транспорт должен стоять, соло — снято, R.autoFreeze — выключен. ≈ 25–30 с: в P.all. */
export async function checkSwap(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('./render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.swapCheck();
  if(!r.ok){ miss('swap: '+r.why); console.warn('[scaleprobe swap] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=r.cases.length;
  for(const c of r.cases){ const n=c.name;
    if(n==='stopped'){ meas('stopped: onset frozen vs events', c.onsetMs, 10, 'max', ' ms'); meas('stopped: control onset shift seen', c.onsetCtrlMs-15, 2, 'abs', ' ms'); meas('stopped: level', c.level, 1, 'abs', ' dB'); meas('stopped: click', c.click, 3, 'max', '×'); }
    else if(/^held pad/.test(n)){ meas('pad: level jump', c.jump, 1, 'abs', ' dB'); meas('pad: gap', c.gap, -6, 'min', ' dB'); meas('pad: click', c.click, 3, 'max', '×'); meas('pad: leftover over the buffer', c.leftoverDb, -6, 'max', ' dB'); }
    else if(n==='control: old') meas('control old swap: leftover', c.leftoverDb, -6, 'min', ' dB');
    else if(/^control: hard splice/.test(n)) meas('control hard splice: click', c.click, 3, 'min', '×');
    else if(n==='rest'){ meas('rest: leftover over the buffer', c.leftoverDb, -6, 'max', ' dB'); meas('rest: click', c.click, 3, 'max', '×'); meas('rest: level jump (information)', c.jump, null, null, ' dB'); }
    else if(n==='loop seam'){ meas('seam: level jump', c.jump, 1, 'abs', ' dB'); meas('seam: gap', c.gap, -6, 'min', ' dB'); meas('seam: click', c.click, 3, 'max', '×'); } }
  for(const m of r.fails) miss(m);
  console.table(r.cases);
  console.log(`[scaleprobe swap] ${r.cases.length} swaps measured · ${r.fails.length} problem(s) · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe swap] '+m));
  if(!nBad) console.log('[scaleprobe swap] the frozen buffer takes over with no gap, no click and no level jump — stopped, in a rest, crossfaded on a held pad and at the loop seam; the old double release and a hard splice both fail, so the measures can see them');
  return { cases, total:nBad, differences:bad };
}
export async function checkTracks(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b), notes=[];
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()){ miss('the track editor is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keepRow0=laneRow0, mixerTouched=laneSoloOn() || L.some(ly=>laneMuted(ly));
  try{
    // ---- 1) строка на полосе ----
    await frame(); await frame();
    for(const [i,ly] of L.entries()){ cases++;
      let V=loopViewProbe();
      if(!V){ miss('the track strip is not drawn (no song, or a video clip is recording)'); break; }
      if(!V.rows.includes(ly)){ const S=loopScroll();
        if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all?V.all.indexOf(ly):i))); await frame(); await frame(); V=loopViewProbe(); } }
      if(!V||!V.rows.includes(ly)){ miss(`L${ly+1}: not among the drawn rows even after scrolling`); continue; }
      const ri=V.rows.indexOf(ly), y=V.gy0+ri*V.rowH+V.rowH/2;
      if(V.gy0+(ri+1)*V.rowH>innerHeight) miss(`L${ly+1}: its row lies below the bottom of the screen (y ${Math.round(y)} of ${innerHeight})`);
      const hA=loopHit(V.bx0-8,y); if(!hA||hA.layer!==ly||hA.what!=='arm') miss(`L${ly+1}: a tap on its label does not arm it (${hA&&hA.what} L${hA&&hA.layer+1})`);
      let hM=null, hS=null; for(let x=V.tx0; x<V.tx0+90 && !(hM&&hS); x++){ const h=loopHit(x,y); if(h&&h.what==='mute'&&!hM) hM=h; if(h&&h.what==='solo'&&!hS) hS=h; }
      if(!hM||hM.layer!==ly) miss(`L${ly+1}: its M button is not hittable`);
      if(!hS||hS.layer!==ly) miss(`L${ly+1}: its S button is not hittable`);
    }
    const tp=document.getElementById('loopTransport');
    if(tp){ cases++; const b=tp.getBoundingClientRect(); if(b.height>0 && b.bottom>innerHeight+0.5) miss(`the transport (▶ ⤺ ✎ …) lies below the bottom of the screen (${Math.round(b.bottom)} > ${innerHeight})`); }
    // ---- 2) редактор, 3) M/S, 4) звук ----
    for(const [i,ly] of L.entries()){
      cases++; if(!editOpen(ly) || editLayer()!==ly) miss(`L${ly+1}: the editor does not open on it`); editClose();
      if(!mixerTouched){ cases++;
        toggleLaneMute(ly); const mOff=!laneAudible(ly); toggleLaneMute(ly); const mBack=laneAudible(ly)&&!laneMuted(ly);
        toggleLaneSolo(ly); const other=L.find(o=>o!==ly), sOn=laneAudible(ly) && (other==null || !laneAudible(other)); toggleLaneSolo(ly); const sBack=!laneSoloOn() && laneAudible(ly);
        if(!mOff||!mBack) miss(`L${ly+1}: mute does not ${!mOff?'silence it':'come back'}`);
        if(!sOn||!sBack) miss(`L${ly+1}: solo does not ${!sOn?'isolate it':'come back'}`); }
      cases++; if(!mixerTouched && !laneAudible(ly)) miss(`L${ly+1}: not audible with an untouched mixer`);
      for(const e of events){ if(e.layer!==ly || !/^(leadOn|bassOn|chOn)$/.test(e.fn)) continue;
        const r=e.fn==='leadOn'?'ld':e.fn==='bassOn'?'bs':'ch', hz=evHz(e.a,e,r);
        if(r==='ch' ? !(hz.length && hz.every(f=>Number.isFinite(f)&&f>0)) : !(Number.isFinite(hz)&&hz>0)){ miss(`L${ly+1} beat ${Math.round(e.t*1000)/1000} ${e.fn}: no price — it would not sound`); break; } }
      if(i>=16){ cases++;
        try{ const R=await import('./render.js'), out=await R.renderTrack(ly), b=out&&out.buf; let pk=0;
          if(b) for(let c=0;c<b.numberOfChannels;c++){ const x=b.getChannelData(c); for(let k=0;k<x.length;k++){ const v=Math.abs(x[k]); if(v>pk) pk=v; } }
          if(!(pk>1e-4)) miss(`L${ly+1} (track ${i+1}): its offline render is silent (peak ${pk})`); else notes.push(`L${ly+1} (track ${i+1}) renders with peak ${pk.toFixed(4)}`); }
        catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); } }
    }
  } finally { setLaneRow0(keepRow0); if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe tracks] tracks ${L.length} · cases ${cases} · differences ${nBad}${mixerTouched?' · mixer touched: M/S toggles skipped':''}`);
  notes.forEach(m=>console.log('[scaleprobe tracks] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe tracks] '+m));
  if(!nBad) console.log('[scaleprobe tracks] every track is drawn on the strip (scrolling where needed) and hittable, opens in the editor, mutes and solos, and plays');
  return { cases, song:L.length, total:nBad, differences:bad };
}
const SID=id=>{ if(!scaleById(id)) throw new Error('no scale '+id); return id; };   // F1: адрес — сам id   // id — стабильный идентификатор (T0), не имя (правило #25)
export async function seed(opt={}){
  console.log('[scaleprobe seed] P.seed REPLACES the current song with a test song (nothing is saved).');
  if(editIsOpen()){ console.warn('[scaleprobe seed] the track editor is open — close it first.'); return null; }
  if(events.length && !opt.replace){ console.warn(`[scaleprobe seed] the song has ${events.length} events — refusing. Run await P.seed({replace:true}) to replace it.`); return null; }
  const keep={ sc:scaleId, tf:tunedFrom, sev:seventh, cm:chordModeSel };   // T7b: и выбор режимов аккордов
  const built=[]; const say=m=>{ built.push(m); console.log('[scaleprobe seed] '+m); };
  try{
    SEED_REC={ kind:'seed', takes:[], edited:[['major',12],['partch-43',32],['major',8],['major-penta',76],['major',12,'bass']], freeze:null };   // задуманное — для P.checkSeed (ноты, которые сценарий правит в редакторе ниже; T5 — три правки на высоты вне лада)
    clearRec(); setLoopMetre(4); setSeventh(false); setChordModeSel({});   // T7b: режимы аккордов — с умолчаний; каждое взятое ставит свой
    let nid=0; const S=[];
    const on =(fn,a,t,skip)=>{ const id=++nid; S.push({fn,a,t,id,...(skip?{skip:true}:null)}); return id; };   // skip (S4) — шаг, который сценарий потом правит в редакторе: P.checkSeed его не сверяет
    const at =(id,fn,a,t,skip)=>S.push({fn,a,t,id,...(skip?{skip:true}:null)});
    const take=(label,scaleId,tf,cm)=>{ setScaleId(SID(scaleId)); if(tf!==undefined) setTunedFrom(tf); if(cm!==undefined) setChordMode(scaleId,cm);   // T7b: режим аккордов взятого
      const steps=S.splice(0), r=seedTake(steps); if(!r) throw new Error('seedTake refused — start the app (▶ Play) and stop the transport first');
      SEED_REC.takes.push({ label, take:r.take, scaleId, tf, cm:chordModeOf(scaleById(SID(scaleId))), steps:steps.map(st=>({ fn:st.fn, t:st.t, a:{...st.a}, ...(st.skip?{skip:true}:null) })) });
      say(`${label}: take ${r.take}, ${r.events} events → tracks ${r.layers.map(l=>'L'+(l+1)).join(', ')}`); return r; };
    // ---- 1) мажор: соло, терменвокс, бас, аккорды ----
    const solo=(t,d,len)=>{ const id=on('leadOn',{deg:d,oct:1,vol:.8,inst:0},t); at(id,'leadOff',{v:0},t+len); };
    [[0,0],[1,2],[2,4],[3,5]].forEach(([t,d])=>solo(t,d,0.9));
    { const id=on('leadOn',{deg:2,oct:1,vol:.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:70},{dt:2,c:-50},{dt:3,c:0}]},4);
      at(id,'leadSet',{deg:3,oct:1,vol:.8,hold:true,v:0},5); at(id,'leadSet',{deg:1,oct:1,vol:.7,hold:true,v:0},6); at(id,'leadOff',{v:0},7.5); }
    [[8,4],[9,3],[10,2],[11,0]].forEach(([t,d])=>solo(t,d,0.9));
    { const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},0); at(id,'bassSet',{deg:3,oct:1,vol:.8},4); at(id,'bassSet',{deg:4,oct:1,vol:.7},8); at(id,'bassOff',{},12);
      const id2=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},12); at(id2,'bassOff',{},16); }
    { const id=on('chOn',{deg:0,oct:1,vol:.8,inst:0,ty:null},0); at(id,'chSet',{deg:3,oct:1,vol:.8,ty:null},4); at(id,'chSet',{deg:4,oct:1,vol:.8,ty:null},8);
      at(id,'chOff',{},12);   // «выкл» ПЕРЕД «вкл» следующего аккорда на ту же долю — тот же ключ владельца
      const id2=on('chOn',{deg:5,oct:1,vol:.8,inst:0,ty:null},12); at(id2,'chOff',{},16); }
    take('major: solo, theremin, bass, chords','major');
    // ---- 2) бас в раге ----
    { const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},16); at(id,'bassSet',{deg:2,oct:1,vol:.8},20); at(id,'bassSet',{deg:4,oct:1,vol:.8},24); at(id,'bassSet',{deg:1,oct:1,vol:.8},28); at(id,'bassOff',{},32); }
    take('raga Yaman: bass','raga-yaman');
    // ---- 3) Партч: типизированные аккорды ----
    /* T7: каждый засеянный аккорд Партча ЦЕЛИКОМ в 43 высотах (живая игра другого не даёт): О на 1/1, У на 5/4 (прежде — на 32/27, где
       У выходит из строя: 32/27·6/5 = 64/45), О7 на 4/3, субминор на 3/2. */
    { const v=scaleView(scaleById(SID('partch-43')),'T'), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[32,0,0,0],[36,14,1,0],[40,18,0,1],[44,25,2,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); }); }
    take('Partch: typed chords','partch-43');
    // ---- 4) Пифагор «строй от C»: аккорды палитры и бас ----
    { const v=scaleView(scaleById(SID('pythagorean')),0), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[48,0,0,0],[52,5,0,0],[56,7,0,1],[60,0,1,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); });
      const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},48); at(id,'bassSet',{deg:5,oct:1,vol:.8},52); at(id,'bassSet',{deg:7,oct:1,vol:.8},56); at(id,'bassOff',{},64); }
    take('Pythagorean tuned from C: palette chords, bass','pythagorean',0);
    // ---- 5) пентатоника: аккорды-стопки ----
    [[64,0],[68,1],[72,3],[76,4]].forEach(([t,d])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:null},t); at(id,'chOff',{},t+4); });
    take('major pentatonic: stacked chords','major-penta','T','stack');
    // ---- 5b) T7b: режимы аккордов — оба режима у Партча, Болена–Пирса и пентатоники ----
    const tyOf=(id,cm,f,k)=>{ const F=chordFams(scaleView(scaleById(SID(id)),'T',cm)), fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
    /* F8: «ЩИПОК» СЦЕНАРИЯ — тип, выбранный в палитре (первая ячейка, О), на корне d проходит ту же функцию, что живая игра (scales.chordAtRoot):
       звучит и пишется то, что она вернула. */
    const seedPinch=(id,cm,d)=>{ const v=scaleView(scaleById(SID(id)),'T',cm); return chordAtRoot(tyOf(id,cm,0,0), tuningIndexOf(d,v,true), v); };
    [[80,0,0,0],[84,9,2,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','free',f,k)},t); at(id,'chOff',{},t+4); });
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','free',0,2)},88); at(id,'chOff',{},92); }   // пентада 3:5:7:9:11 — аккорд на 11, вернувшийся в «Свободно»
    take('Bohlen–Pierce, Free: pure ratios, an 11-chord','bohlen-pierce','T','free');
    [[92,0,0,0],[96,4,1,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('bohlen-pierce','instrument',f,k)},t); at(id,'chOff',{},t+4); });
    take('Bohlen–Pierce, As on the instrument: steps','bohlen-pierce','T','instrument');
    [[100,11,1,0],[104,0,0,3]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('partch-43','free',f,k)},t); at(id,'chOff',{},t+4); });   // У на 32/27 — в «Свободно» доступен (тон 64/45 вне 43)
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:seedPinch('partch-43','free',3)},124); at(id,'chOff',{},128); }   // F8: тот же щипок, что ниже в «Как на инструменте», — в «Свободно» звучит ЦЕЛЫЙ тип
    take('Partch, Free: a chord outside the 43','partch-43','T','free');
    [[108,0,0,3],[112,18,0,1]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:tyOf('partch-43','instrument',f,k)},t); at(id,'chOff',{},t+4); });   // O11 на 1/1, O7 на 4/3 — целиком в 43
    { const id=on('chOn',{deg:3,oct:1,vol:.8,inst:0,ty:seedPinch('partch-43','instrument',3)},116); at(id,'chOff',{},120); }   // ⛳ F8: щипок с типом О на 21/20 (там ни один тип не ложится) — звучит ОДИН КОРЕНЬ
    take('Partch, As on the instrument','partch-43','T','instrument');
    [[116,0],[120,3]].forEach(([t,d])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:null},t); at(id,'chOff',{},t+4); });
    take('major pentatonic: power chords','major-penta','T','power');
    // ---- 6) редактор: распад аккорда и перенос одной ноты ----
    const segOf=(id,start)=>songSegs().segs.find(g=>g.role==='ch'&&g.sc.id===id&&g.start===start&&g.first&&!g.ev.jam);
    const g1=segOf('major',12);
    if(g1 && editOpen(g1.layer) && editDeleteChordNote(g1.ev,1)) say(`editor: the major chord at beat 12 (L${g1.layer+1}) dissolved — its middle note deleted`);
    else say('editor: dissolve FAILED');
    const g2=segOf('partch-43',32);
    if(g2 && editSetLayer(g2.layer) && editMoveChordNote(g2.ev,1,32.5,tuningIndexOf(modeSlotOfTi(g2.ti,g2.oct,g2.sc).deg+1,g2.sc,true),g2.oct)) say(`editor: one note of the first Partch chord (L${g2.layer+1}) moved half a beat later and one row up`);
    else say('editor: chord-note move FAILED');
    /* ---- 6b) T5: высоты ВНЕ ЛАДА (приглушённые ряды) — теми же функциями правки, что перенос в редакторе ---- */
    const segAt=(role,id,start)=>songSegs().segs.find(g=>g.role===role&&g.sc.id===id&&Math.abs(g.start-start)<1e-9&&!g.ev.jam);
    const dim=(g,ti)=>g && !modeSlotOfTi(ti,g.oct,g.sc);
    const b1=segAt('bs','major',12);
    if(dim(b1,b1&&b1.ti+1) && editSetLayer(b1.layer) && editMoveSeg(b1.ev,b1.start,b1.ti+1,b1.oct)) say(`editor T5: the major bass note at beat 12 (L${b1.layer+1}) moved one tuning step up, onto the dimmed C#`);
    else say('editor T5: out-of-mode bass move FAILED');
    const g3=segAt('ch','major',8);   // G–B–D внутри защёлкнутой прогрессии: его терция B → A# (приглушённый ряд), аккорд распадается
    if(dim(g3,g3&&g3.ti+3) && editSetLayer(g3.layer) && editMoveChordNote(g3.ev,1,g3.start,g3.ti+3,g3.oct)) say(`editor T5: the third of the major chord at beat 8 (L${g3.layer+1}) moved onto the dimmed A#`);
    else say('editor T5: out-of-mode chord-tone move FAILED');
    const g4=segAt('ch','major-penta',76), F4=g4&&g4.ti-4;   // A (ступень 4 пентатоники) → корень F, вне лада: вариант (а) — аккорд с формой
    if(dim(g4,F4) && editSetLayer(g4.layer)){ const r=editMoveSeg(g4.ev,g4.start,F4,g4.oct);
      say(r ? `editor T5: the whole stacked chord at beat 76 (L${g4.layer+1}) moved onto the dimmed F — typed with its shape [${r.a&&r.a.ty}]` : 'editor T5: whole-chord move onto a dimmed root FAILED'); }
    else say('editor T5: whole-chord move onto a dimmed root FAILED');
    /* ---- 6c) U5: ВСТАВКА — одна нота на любом ряду, форма выделенного ЦЕЛОГО аккорда ---- */
    SEED_REC.inserts=[];
    const insRec=(label,fn,layer,t,ti,oct,want)=>SEED_REC.inserts.push({ label, fn, layer, t, ti, oct, ...want });
    const bI=segAt('bs','major',12), c0=segAt('ch','major',0), p5=segAt('ch','partch-43',36);
    const fis=bI ? tuningIndexOf(0,bI.sc,false)+6 : null;   // F# — корень мажора + 6 полутонов: приглушённый ряд
    if(bI && editSetLayer(bI.layer) && editInsertBass(17,fis,1,bI.sc,bI.sev,1)){
      insRec('bass on the dimmed F#','bassOn',bI.layer,17,fis,1,{ out:true }); say(`editor U5: a bass note inserted on the dimmed F# at beat 17 (L${bI.layer+1})`); }
    else say('editor U5: bass insert on a dimmed row FAILED');
    if(c0 && editSetLayer(c0.layer)){
      const sc0=c0.sc, root=t=>tuningIndexOf(0,sc0,true)+t;   // индекс корня мажора + сдвиг в полутонах (равный 12-ступенный строй)
      const shape=centsShape(segChordNotes(c0)), ivs=segChordNotes(c0).map(n=>n.iv);
      if(editInsertChord(17,root(8),1,sc0,c0.sev,1,null)){ insRec('one note on the dimmed G#','chOn',c0.layer,17,root(8),1,{ ty:chordUnit(sc0), cents:[0], out:true }); say(`editor U5: one note inserted on the dimmed G# at beat 17 (L${c0.layer+1})`); }
      else say('editor U5: one-note chord insert FAILED');
      if(editInsertChord(18,root(3),1,sc0,c0.sev,1,c0.ev)){ insRec('C major shape at the dimmed D#','chOn',c0.layer,18,root(3),1,{ ty:ivs, cents:shape, out:true }); say(`editor U5: the C major chord's shape inserted at the dimmed D# at beat 18 — typed [${ivs}]`); }
      else say('editor U5: shape insert on a dimmed root FAILED');
      if(editInsertChord(19,root(5),1,sc0,c0.sev,1,c0.ev)){ insRec('C major shape at the bright F (by the rule)','chOn',c0.layer,19,root(5),1,{ ty:null, cents:centsShape(chordNotesAt(root(5),1,sc0,c0.sev,null)), out:false }); say(`editor U5: the C major chord's shape inserted at the bright F at beat 19 — untyped, by the mode's rule`); }
      else say('editor U5: shape insert on a bright root FAILED');
    }else say('editor U5: chord inserts FAILED (no major chord track)');
    if(p5 && editSetLayer(p5.layer)){ const r0=tuningIndexOf(0,p5.sc,true);
      if(editInsertChord(50,r0,1,p5.sc,p5.sev,1,p5.ev)){ insRec('Partch typed chord shape, rigid','chOn',p5.layer,50,r0,1,{ ty:p5.ty, cents:centsShape(segChordNotes(p5)), out:false }); say(`editor U5: the Partch chord at beat 36 inserted rigidly at the tonic at beat 50 (L${p5.layer+1})`); }
      else say('editor U5: typed shape insert FAILED'); }
    else say('editor U5: typed shape insert FAILED (no Partch chord)');
    editClose();
    // ---- 7) подложка, скоба, пауза ----
    setScaleId(SID('major'));
    if(loadJam({prog:2, rhythm:0, bass:'roots'})) say('backing: jam I–vi–ii–V in major (chords, root bass, drums) from beat 0'); else say('backing FAILED');
    const L=songBeats(), Mt=loop.metre;
    braceTap(2*Mt); braceTap(L-2*Mt); setRegionOn(true);
    say(`repeat brace: beats ${loop.rgn.from}–${loop.rgn.to} (set by the user), repeat on`);
    if(loop.on) onLoop();   // подложка подняла транспорт — пауза: проверки и заморозка идут на остановленном
    // ---- 8) заморозка дорожки баса в раге ----
    const gr=songSegs().segs.find(g=>g.role==='bs'&&g.sc.id==='raga-yaman');
    if(gr){ try{ const R=await import('./render.js'); const r=await R.freeze(gr.layer);
            SEED_REC.freeze={ layer:gr.layer, peak:r&&r.peak, rms:r&&r.rms, samples:r&&r.buf&&r.buf.length, installed:!!(r&&r.installed), refused:r&&r.refused };
            say(r&&r.installed ? `freeze: L${gr.layer+1} (bass in the raga) frozen` : `freeze: L${gr.layer+1} rendered but not installed (${r&&r.refused})`); }
            catch(err){ say('freeze: not available from the console ('+(err&&err.message)+')'); } }
    // ---- 9) S4: СОЛО ДЛЯ РЕДАКТОРА — ведущая линия, полифония, карта эффектов, терменвокс, пара связки; правки редактора над ними ----
    /* ⛳ ПОСЛЕ ЗАМОРОЗКИ И В КОНЦЕ ПЕСНИ (доли 132–151): прежние взятые, их дорожки (id дорожки → семя заморозки баса в раге), скоба и
       буфер не меняются — строка «frozen seed bass» и все прежние песенные случаи остаются теми же; новые лишь добавляются.
       Одно взятое: соло тембра 0 ложится в одну новую дорожку, продолжение пары связки (тембр 1) — во вторую (маршрут по тембру, T3). */
    setScaleId(SID('major'));
    { const id=on('leadOn',{deg:0,oct:1,vol:.8,inst:0,v:0},132);                  // ведущая линия: ОДНА нота (v 0) на пять высот
      at(id,'leadSet',{deg:2,oct:1,vol:.8,v:0},133,true); at(id,'leadSet',{deg:4,oct:1,vol:.8,v:0},134,true);   // их правит отделение сегмента (ниже)
      at(id,'leadSet',{deg:3,oct:1,vol:.8,v:0},135); at(id,'leadSet',{deg:1,oct:1,vol:.7,v:0},136); at(id,'leadOff',{v:0},137); }
    { const a=on('leadOn',{deg:4,oct:1,vol:.8,inst:0,v:0},138), b=on('leadOn',{deg:6,oct:1,vol:.75,inst:0,v:1},139);   // полифония: две ноты внахлёст
      at(a,'leadOff',{v:0},140); at(b,'leadOff',{v:1},141); }
    { const id=on('leadOn',{deg:2,oct:1,vol:.8,inst:0,fx:{'vib:amt':0.3,'drv:amt':0.2},v:0},142); at(id,'leadOff',{v:0},143); }   // нота с картой эффектов
    { const id=on('leadOn',{deg:1,oct:1,vol:.8,inst:0,bend:[{dt:0,c:0},{dt:1,c:60},{dt:2,c:-40}],v:0},144,true);   // терменвокс (его переносит и транспонирует редактор)
      at(id,'leadSet',{deg:2,oct:1,vol:.8,hold:true,v:0},145,true); at(id,'leadSet',{deg:0,oct:1,vol:.7,hold:true,v:0},146,true); at(id,'leadOff',{v:0},147,true); }
    { const a=on('leadOn',{deg:3,oct:1,vol:.8,inst:0,v:0},148); at(a,'leadOff',{v:0,tie:true},149);   // ПАРА СВЯЗКИ: смена тембра посреди ноты (T3)
      const b=on('leadOn',{deg:3,oct:1,vol:.8,inst:1,tie:true,v:0},149); at(b,'leadOff',{v:0},150); }
    take('major: solo for the editor (S4)','major');
    const ldSeg=t0=>songSegs().segs.find(g=>g.role==='ld'&&Math.abs(g.start-t0)<1e-9);
    const e1=ldSeg(133);
    if(e1 && editOpen(e1.layer) && editMoveSeg(e1.ev,133.5,e1.ti,e1.oct)) say(`editor S4: the second pitch of the solo line (L${e1.layer+1}) moved half a beat later — it detaches into its own note`);
    else say('editor S4: solo line segment move FAILED');
    const th=ldSeg(144), th2=th ? tuningIndexOf(2,th.sc,false) : null;
    if(th && editSetLayer(th.layer) && editMoveSeg(th.ev,144.5,th2,th.oct)){
      SEED_REC.solo={ therm:{ t:144.5, ti:th2, oct:th.oct, bend:[{dt:0,c:0},{dt:1,c:60},{dt:2,c:-40}] } };
      say(`editor S4: the theremin note (L${th.layer+1}) moved half a beat later and one degree up — its bend unchanged`); }
    else say('editor S4: theremin move FAILED');
    const fxn=ldSeg(142), tp=ldSeg(149);
    if(fxn && editSetLayer(fxn.layer)){ const ti=tuningIndexOf(5,fxn.sc,false);
      if(editInsertLead(142.5,ti,1,fxn.sc,fxn.sev,0.5)){ insRec('solo note copying its neighbour’s effect map','leadOn',fxn.layer,142.5,ti,1,{ inst:0, vol:.8, fx:{'vib:amt':0.3,'drv:amt':0.2}, plain:true });
        say(`editor S4: a solo note inserted at beat 142.5 (L${fxn.layer+1}) — it copies its neighbour's effect map`); }
      else say('editor S4: solo insert (with a map) FAILED'); }
    else say('editor S4: solo insert (with a map) FAILED (no note with a map)');
    if(tp && editSetLayer(tp.layer)){ const ti=tuningIndexOf(4,tp.sc,false);
      if(editInsertLead(151,ti,1,tp.sc,tp.sev,1)){ insRec('solo note whose neighbour has no map','leadOn',tp.layer,151,ti,1,{ inst:1, vol:.8, fx:null, plain:true });
        say(`editor S4: a solo note inserted at beat 151 (L${tp.layer+1}, the tie partner's track) — no map, as its neighbour`); }
      else say('editor S4: solo insert (no map) FAILED'); }
    else say('editor S4: solo insert (no map) FAILED (no tie partner)');
    editClose();
  } finally {
    setScaleId(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev); setChordModeSel(keep.cm);
  }
  tracks();
  const M=material();
  console.log(`[scaleprobe seed] built ${events.length} events; song material ${M.ok?'complete':'INCOMPLETE — missing '+M.missing.join('; ')}. Now run P.all().`);
  return { built, events:events.length, material:M };
}
/* ═══ P.song — ДЕМО-ПЬЕСА ИЗ src/songs.js ═══
   Тот же образец, что P.seed (воронки рекордера, функции редактора, подложка), но музыка, а не набор случаев. Модуль грузится
   лениво — приложение его не знает. Отказы (непустая песня без {replace:true}, запись, игра транспорта, открытый редактор) — в нём.
   Записанное задуманное (шаги взятых) становится записью для P.checkSeed: P.all после загрузки сверяет ПЬЕСУ, а не тестовую песню. */
export async function song(name='triphop', opt={}){
  const S=await import('./songs.js');
  if(!editIsOpen()) setChordModeSel({});   // T7b: пьеса написана в режимах аккордов по умолчанию (как тоника и лад, выбор остаётся у пьесы)
  const r=await S.loadSong(name, opt);
  if(!r) return null;
  SEED_REC={ kind:'song', name:r.name, takes:r.takes, edited:[], freeze:null };
  const M=material();
  console.log(`[scaleprobe song] «${r.name}»: ${events.length} events; song material ${M.ok?'complete':'INCOMPLETE — missing '+M.missing.join('; ')}. P.all() checks it.`);
  return { name:r.name, events:events.length, material:M };
}

/* ═══ T6c: ПОДПИСИ АККОРДА ЧИТАЮТ ПРАВИЛО ЛАДА ═══
   Каждый вид (у Пифагора — каждый «строй от») × ступень 0..n × септаккорд выкл/вкл × 12 тоник: chordLabel и chordNotesStr (по правилу,
   ruleChordSteps) против legacyChordLabel и legacyChordNotesStr (по tag) — строки, ===. Тоника и «строй от» переставляются сеттерами и
   возвращаются в finally (подпись читает живую тонику). Расхождение на ладу, где подпись ПОКАЗЫВАЕТСЯ (правило tertian/power — у прочих
   draw её не рисует: палитра пишет корень, noChords — объяснение), — ошибка; на прочих — считается отдельно как «не показывается» (по
   построению это только макамы: их tag давал стопку, правило 'none' — форма пауэр-аккорда) и печатается сведением. */
export function checkLabels(){
  const bad=[]; let cases=0, hidden=0; const hiddenIds=new Set(); const keepT=tonic;
  try{
    for(const [s0,tf] of allViews()){
      const v=scaleView(s0,tf), n=v.iv.length, k=v.chordRule&&v.chordRule.kind, shown= k==='tertian'||k==='stack';
      const vRef= k==='stack' ? {...v, tag:'dia'} : v;   // «стопка»: ноты стопки сверяются с прежней арифметикой стопки
      const id=v.id+(v.tunable?`[from ${tf}]`:'');
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const sev of [false,true]) for(let d=0;d<=n;d++){
          for(const [what,A,B] of (k==='stack' ? [['notes',chordNotesStr(d,v,sev),legacyChordNotesStr(d,vRef,sev)]]   // у стопки НОВАЯ подпись — её проверяет P.checkStack
                                                : [['label',chordLabel(d,v,sev),legacyChordLabel(d,v,sev)],['notes',chordNotesStr(d,v,sev),legacyChordNotesStr(d,v,sev)]])){
            if(shown) cases++;
            if(A===B) continue;
            if(shown) bad.push(`${id} tonic ${tn} degree ${d}${sev?' 7th':''} ${what}: rule "${A}", by tag "${B}"`);
            else { hidden++; hiddenIds.add(v.id); }
          }
        }
      }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe T6c] label cases ${cases} (modes whose chord labels are shown) · differences ${bad.length}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T6c] '+m));
  if(hidden) console.log(`[scaleprobe T6c] information: ${hidden} strings differ on modes whose chord labels are never shown (${[...hiddenIds].join(', ')})`);
  if(!bad.length) console.log('[scaleprobe T6c] every shown chord label and note list reads the same from the chord rule');
  return { cases, hidden, hiddenModes:[...hiddenIds], total:bad.length, mismatches:bad };
}

/* ═══ T5: ОПОРА ДЛЯ ВЫСОТЫ ВНЕ ЛАДА — ТОТ ЖЕ СТРОЙ КАК ЛАД ЦЕЛИКОМ ═══
   У высоты вне лада ПРЕЖНЕЙ цены не было (до T5 её не писал никто) — сверять с прошлым нечего. Опора — замороженные тела (legacy*) над
   СИНТЕТИЧЕСКИМ ладом «весь строй от корня лада»: равный строй — iv = 0..E−1, edo = E; таблица — центы строя от корня лада (с переносом
   за период). Высота вне лада — ступень такого лада, и прежняя формула по ступени даёт её цену НЕЗАВИСИМО от новой функции высоты.
   ⛳ ТОЧНО (===) там, где выражения совпадают по построению: равный строй с корнем 0 (все 12-тоновые лады и макамы) и таблица с корнем 0
   (раги, патеты Лима и Нем) — сдвиг c[k] − c[0] = c[k] − 0. ⚠️ У таблицы с корнем ≠ 0 (патет Баранг, корень — индекс 1 Пелога) высота
   за краем таблицы прежде считалась бы 2^((c+1200−c₀)/1200), теперь 2·2^((c−c₀)/1200) — равны по смыслу, но не обязаны в последнем бите:
   там сравнение — в центах, допуск 1e-6 цента, и такие случаи считаются ОТДЕЛЬНО. Фиксированного строя с приглушёнными рядами нет
   (все шесть — строй целиком), для него опоры нет. */
const WHOLE=new WeakMap();
function wholeOf(v){
  if(WHOLE.has(v)) return WHOLE.get(v);
  const T=TUNINGS[v.tuning]; let w=null;
  if(T && !v.fixedKey && v.sel){
    const ids=n=>[...Array(n).keys()];
    if(T.equal!=null){ if(v.root===0) w={...v, iv:ids(T.equal), edo:T.equal, cents:undefined}; }
    else { const C=T.cents, N=C.length, r=v.root; w={...v, iv:ids(N), edo:N, cents:ids(N).map(i=>C[(r+i)%N]+1200*Math.floor((r+i)/N)-C[r])}; }
  }
  WHOLE.set(v,w); return w;
}
const wholeExact=v=> TUNINGS[v.tuning].equal!=null || v.root===0;
/* сдвиг мелодии в целом строе: j ∈ [0, E] и регистр — тем же законом, что melodySplit/rowOfTi */
function wholeSplit(ti,oct,v){ const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length; let j=ti-v.root, R=oct|0;
  if(j<0||j>E){ const c= j>E ? Math.ceil((j-E)/E) : Math.floor(j/E); j-=E*c; R+=c; } return [j,R]; }
/* цена высоты вне лада против опоры по целому строю → строка расхождения или null; exact=false — сравнение в центах (см. выше) */
function outRef(role,a,v,sev){
  const W=wholeOf(v); if(!W) return { err:'no whole-tuning reference for this view' };
  if(role==='ch'){ if(!a.ty) return { err:'an UNTYPED chord outside its mode (option (a) should have typed it)' };
    return { f: legacyChordNotesRef(a.ti-v.root, a.oct, W, sev, a.ty).map(n=>n.f) }; }
  const [j,R]=wholeSplit(a.ti,a.oct,v);
  return { f: role==='ld' ? legacyLeadFreq(j,R,W) : legacyBassFreq(j,R,W) };
}
const sameHz=(x,y,exact)=> exact ? x===y : (x>0 && y>0 && Math.abs(1200*Math.log2(x/y))<1e-6);

/* ═══ T4c-2: ЦЕЛОСТНОСТЬ ПЕСНИ БЕЗ СТУПЕНИ — ЗАМЕНА ПЕСЕННЫХ ПРОБ, СВЕРЯВШИХ СО СТУПЕНЬЮ (T4a, T4b1, T4b2, T4b3, T4b4, T6b, T4c-1) ═══
   Хранимой ступени больше нет — сверять с ней нечего. Вместо этого каждая производная дорожка песни проверяется на ПРАВИЛЬНУЮ ФОРМУ и
   на ЦЕНУ ПРОТИВ ЗАМОРОЖЕННЫХ ОПОР (прежние тела функций по ступени — раздел выше), куда ступень приходит ОБРАТНОЙ ВЫБОРКОЙ ИЗ ИНДЕКСА
   (scales.modeSlotOfTi — та же функция, что у подсветки), а не из события. Сравнение ===:
     1) СОБЫТИЯ: ни одно событие не несёт ступени лада (поле deg); у каждого «вкл»/ведения соло, баса и аккорда — целые индекс в строе и
        регистр — высота В СТРОЕ события (⛳ T5: прежде требовалось «в ладу»; с T5 редактор ставит ноты и на приглушённые ряды). Высота В
        ЛАДУ: цена ENG (recorder.evHz) — конечная, положительная и РАВНА прежней цене по ступени этого места; место в реестре голосов (evReg)
        и подсветка аккорда (hlOf) переводятся назад в тот же индекс (tuningIndexOf — закон своей роли). Высота ВНЕ ЛАДА: цена равна опоре по
        ЦЕЛОМУ строю (wholeOf выше; аккорд обязан быть типизированным — вариант (а) или однонотная форма), подсветки нет (hlOf — null), реестр
        места не пишет (deg undefined);
     2) СЕГМЕНТЫ (songSegs): роль, целые индекс и регистр, равные хранимым у определяющего события, тот же вид, время начала = время события,
        конец не раньше начала, события начала и конца — из песни, указатель «событие → сегмент» покрывает каждое «вкл»/ведение;
     3) ДОГОНЯЛКА на КАЖДОЙ доле, где лежит событие: нагрузка без ступени, целые индекс и регистр, контекст — событие песни, цена конечная и
        равна прежней по ступени места (у удержанного терменвокса — место АТАКИ);
     4) РЕДАКТОР, обе оси («Все» и «Лад»), сегменты сгруппированы как в редакторе: ряд корня — целое; ряд → высота (pitchOf) возвращает ТОТ ЖЕ
        индекс и регистр (вставка и перенос пишут ровно это); призрак сегмента на его собственном ряду — те же блоки, что сам сегмент.
        ⛳ T5: у оси «Лад» нота вне лада — ДРОБНЫЙ ряд строго между соседними ступенями, по высоте между ними, с отступлением dev (знак
        «вне ряда»); у оси «Все» — целый ряд, как всякая высота строя;
     5) РАСПАД: ноты аккорда сегмента (segChordNotes) непусты и конечны, и однонотный аккорд с интервалом каждой ноты звучит ровно её частотой
        (U2/U3 — оставшиеся ноты после распада звучат как прежде).
   Работает на загруженной песне, без редактора и рук; ничего не меняет (кэш догонялки и рядов — только кэш). */
export function checkSong(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const ROLE={ l:'ld', b:'bs', c:'ch' }, VIEWS=[['all',true],['mode',false]];
  const isInt=Number.isInteger, fin=f=>typeof f==='number' && Number.isFinite(f) && f>0;
  const beat=t=>Math.round(t*1000)/1000;
  const sameNotes=(X,Y)=> X.length===Y.length && X.every((x,i)=>x.f===Y[i].f && x.iv===Y[i].iv);
  /* цена против прежней по ступени места (ступень — обратной выборкой из индекса); ⛳ T5: вне лада — против опоры по целому строю (→ null) */
  let nOut=0, nOutTol=0;
  const priceCheck=(at,a,ctx,role)=>{
    const p=modeSlotOfTi(a.ti,a.oct,ctx.sc);
    if(!p){ nOut++; const hz=evHz(a,ctx,role), R=outRef(role,a,ctx.sc,ctx.sev), ex=wholeExact(ctx.sc); if(!ex) nOutTol++;
      if(R.err){ miss(`${at}: ti ${a.ti} reg ${a.oct} outside the mode ${ctx.sc&&ctx.sc.id}: ${R.err}`); return null; }
      if(role==='ch'){ if(!hz.length || !hz.every(fin) || hz.length!==R.f.length || hz.some((f,i)=>!sameHz(f,R.f[i],ex))) miss(`${at}: out-of-mode chord ${hz.join(' ')}, whole-tuning reference ${R.f.join(' ')}`); }
      else if(!fin(hz) || !sameHz(hz,R.f,ex)) miss(`${at}: out-of-mode price ${hz}, whole-tuning reference ${R.f}`);
      return null; }
    const hz=evHz(a,ctx,role);
    if(role==='ch'){
      const ref=legacyChordNotesRef(p.deg,p.oct,ctx.sc,ctx.sev,a.ty), X=chordNotesAt(a.ti,a.oct,ctx.sc,ctx.sev,a.ty);
      if(!hz.length || !hz.every(fin)) miss(`${at}: chord price ${JSON.stringify(hz)} is empty or not finite`);
      else if(!sameNotes(X,ref) || hz.some((f,i)=>f!==ref[i].f)) miss(`${at}: chord notes ${X.map(n=>n.f).join(' ')} differ from the frozen reference ${ref.map(n=>n.f).join(' ')} (degree ${p.deg} reg ${p.oct})`);
    }else{
      const ref= role==='ld' ? legacyLeadFreq(p.deg,p.oct,ctx.sc) : legacyBassFreq(p.deg,p.oct,ctx.sc);
      if(!fin(hz)) miss(`${at}: price ${hz} is not a finite positive number`);
      else if(hz!==ref) miss(`${at}: price ${hz} differs from the frozen reference ${ref} (degree ${p.deg} reg ${p.oct})`);
    }
    return p;
  };
  // ---- 1) события ----
  const EV=new Set(events); let nEv=0, nDeg=0;
  for(const e of events){
    const at=`L${e.layer+1} beat ${beat(e.t)} ${e.fn}`;
    if(e.a && 'deg' in e.a){ nDeg++; miss(`${at}: carries a mode degree (${e.a.deg})`); }
    const r=ROLE[e.fn[0]]; if(!r || !/On$|Set$/.test(e.fn) || !e.a) continue;
    nEv++; const a=e.a;
    if(!isInt(a.ti) || !isInt(a.oct)){ miss(`${at}: tuning index ${a.ti} / register ${a.oct} missing or not whole`); continue; }
    if(!e.sc){ miss(`${at}: no frozen view`); continue; }
    const p=priceCheck(`${at} in ${e.sc.id}`,a,e,r);
    const back= r==='ch' ? hlOf(a,e.sc) : evReg(a,e);
    if(!p){ if(modeSlotOfTi(a.ti,a.oct,e.sc)) continue;   // в ладу, но цена не сошлась — уже названо
      if(r==='ch' ? back!==null : !(back && back.deg===undefined)) miss(`${at}: out of its mode, yet the ${r==='ch'?'highlight':'voice register'} gives a place (${back&&back.deg}/${back&&back.oct})`);
      continue; }
    if(!back || tuningIndexOf(back.deg,e.sc,r==='ch')!==a.ti || back.oct!==a.oct) miss(`${at}: ${r==='ch'?'highlight':'voice register'} ${back&&back.deg}/${back&&back.oct} does not convert back to ti ${a.ti} reg ${a.oct}`);
  }
  // ---- 2) сегменты ----
  const S=songSegs(); let nSeg=0;
  for(const g of S.segs){ nSeg++;
    const at=`segment L${g.layer+1} ${g.role} beat ${beat(g.start)}`, a=g.ev&&g.ev.a||{};
    if(g.role!=='ld'&&g.role!=='bs'&&g.role!=='ch') miss(`${at}: role ${g.role}`);
    if('deg' in g) miss(`${at}: carries a degree`);
    if(!isInt(g.ti)||!isInt(g.oct)||g.ti!==a.ti||g.oct!==(a.oct|0)) miss(`${at}: ti/register ${g.ti}/${g.oct}, its event stores ${a.ti}/${a.oct}`);
    if(!EV.has(g.ev)) miss(`${at}: its defining event is not in the song`);
    if(g.endEv && !EV.has(g.endEv)) miss(`${at}: its ending event is not in the song`);
    if(g.sc!==g.ev.sc) miss(`${at}: another view than its event`);
    if(g.start!==g.ev.t) miss(`${at}: starts at ${g.start}, its event at ${g.ev.t}`);
    if(g.end!=null && g.end<g.start) miss(`${at}: ends at ${g.end}, before it starts`);
    if(S.byEv.get(g.ev)!==g) miss(`${at}: the event→segment map does not lead back to it`);
  }
  for(const e of events){ const r=ROLE[e.fn[0]]; if(!r || !/On$|Set$/.test(e.fn)) continue; if(!S.byEv.has(e)) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn}: belongs to no segment`); }
  // ---- 3) догонялка ----
  const X=[...new Set(events.map(e=>e.t))].sort((p,q)=>p-q); let nChase=0;
  for(const x of X) for(const sct of chaseFor(x)){ nChase++;
    const N=chaseNote(sct,x), at=`chase at beat ${beat(x)}: L${sct.on.layer+1} ${sct.role}`;
    if('deg' in N.a) miss(`${at}: the payload carries a degree`);
    if(!EV.has(N.ctx)) miss(`${at}: its context is not an event of the song`);
    if(!isInt(N.a.ti)||!isInt(N.a.oct)){ miss(`${at}: ti/register ${N.a.ti}/${N.a.oct}`); continue; }
    if(sct.role==='ld' && sct.set && sct.set.a.hold && N.a.ti!==sct.on.a.ti) miss(`${at}: a held theremin note took ti ${N.a.ti}, its attack's is ${sct.on.a.ti}`);
    priceCheck(at,N.a,N.ctx,sct.role);
  }
  // ---- 4) редактор: ряд ↔ высота, призрак на своём ряду ----
  const groups=[];
  for(const g of S.segs){ if(g.role!=='ld'&&g.role!=='bs'&&g.role!=='ch') continue;
    let G=groups.find(q=>q.layer===g.layer&&q.role===g.role&&q.sc===g.sc); if(!G){ G={ layer:g.layer, role:g.role, sc:g.sc, segs:[] }; groups.push(G); } G.segs.push(g); }
  let nRow=0;
  for(const G of groups) for(const [vn,all] of VIEWS){
    const ax=RP.axis(G.sc,all); let total=REG_N*ax.rpp;
    if(G.role==='ch'){ RP.reset(); total=RP.total(G,ax,RP.notes,RP.root); }
    RP.reset();
    for(const g of G.segs){ nRow++;
      const at=`L${G.layer+1} ${G.role} [${vn}] segment beat ${beat(g.start)} (ti ${g.ti} reg ${g.oct})`, r=RP.root(g,ax);
      if(!all && !modeSlotOfTi(g.ti,g.oct,g.sc)){   // ⛳ T5: вне лада на оси «Лад» — между соседними ступенями, со знаком «вне ряда»
        const pl=ax.placeTi(g.ti,g.oct), lo=Math.floor(r), hi=Math.ceil(r), pL=ax.pitchOf(lo), pH=ax.pitchOf(hi);
        const f=leadFreqTi(g.ti,g.oct,g.sc), fL=pL&&leadFreqTi(pL.ti,pL.oct,g.sc), fH=pH&&leadFreqTi(pH.ti,pH.oct,g.sc);
        if(!(Number.isFinite(r) && lo!==hi && pl.r===r)) miss(`${at}: an out-of-mode root on the Mode axis at row ${r}, not between two rows`);
        else if(!(fL<f && f<fH)) miss(`${at}: row ${r} lies between rows whose pitches ${fL} / ${fH} do not bracket the note ${f}`);
        if(!(typeof pl.dev==='number' && Number.isFinite(pl.dev) && pl.dev!==0)) miss(`${at}: an out-of-mode note on the Mode axis carries no deviation mark (${pl.dev})`);
        const ns=RP.notes(g,ax,total); if(!ns.length || (g.role!=='ch' && ns[0].dev!==pl.dev)) miss(`${at}: the drawn block does not carry the deviation of its placement`);
        continue; }
      if(!isInt(r)){ miss(`${at}: root row ${r}`); continue; }
      const pit=ax.pitchOf(r);
      if(!pit || pit.ti!==g.ti || pit.oct!==g.oct){ miss(`${at}: row ${r} decodes to ${pit?pit.ti+'/'+pit.oct:'nothing'}`); continue; }
      if(g.role==='ch'){ const A=RP.notes(g,ax,total), B=RP.notes(RP.ghost(g,pit),ax,total);
        if(A.length!==B.length || A.some((n,i)=>n.r!==B[i].r||n.dev!==B[i].dev)) miss(`${at}: the ghost on its own row differs from the block`); }
    }
  }
  RP.reset();
  // ---- 5) распад ----
  let nDiss=0;
  for(const g of S.segs){ if(g.role!=='ch') continue; nDiss++;
    const at=`dissolve of the chord at beat ${beat(g.start)} L${g.layer+1}`, N=segChordNotes(g);
    if(!N.length || !N.every(n=>fin(n.f))){ miss(`${at}: notes ${JSON.stringify(N)}`); continue; }
    N.forEach((n,i)=>{ const one=chordNotesAt(g.ti,g.oct,g.sc,g.sev,[n.iv]);
      if(one.length!==1 || one[0].f!==n.f) miss(`${at} note ${i}: a one-note copy sounds ${one[0]&&one[0].f}, the note ${n.f}`); });
  }
  console.log(`[scaleprobe song] events ${events.length} (pitched ${nEv}, carrying a degree ${nDeg}) · out-of-mode prices ${nOut}${nOutTol?` (${nOutTol} compared in cents, table with a root offset)`:''} · segments ${nSeg} · chased notes ${nChase} at ${X.length} beats · editor segment×view ${nRow} · dissolves ${nDiss} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe song] '+m));
  if(!nBad && nEv) console.log('[scaleprobe song] no event carries a degree; every pitch is in its tuning; every price, segment, chased note, editor row and dissolve is well-formed and matches the frozen references (out-of-mode ones — the whole-tuning reference)');
  else if(!nEv) console.log('[scaleprobe song] the song has no pitched events — run await P.seed({replace:true}) first');
  return { events:nEv, outOfMode:nOut, segments:nSeg, chase:nChase, rows:nRow, dissolves:nDiss, total:nBad, differences:bad };
}

/* ═══ T7b-починка: ТИП АККОРДА — В СБОРКЕ СВОЕГО ВИДА; НИ ОДНОЙ НОТЫ НА 0 Гц ═══
   Вид считает аккорд ЛИБО отношениями (тоны-отношения: центовый лад без сетки, или неоктавный адаптивный — «Свободно» у Болена–Пирса),
   ЛИБО шагами/смещениями (равная ветка, сетка). Тип, записанный в сборке другого вида, звучит неверно: шаговый [0] в виде отношений —
   0 Гц (тишина), отношения в шаговом виде — дробные «шаги». Проверяется:
     1) КАЖДЫЙ вид (каждый режим аккордов) с аккордами: единица корня chordUnit — [1] у вида отношений, [0] у прочих; типы палитры — все
        интервалы > 0 у вида отношений, целые у прочих; на каждом корне (индекс 0..размер строя, регистр 1) ряд корня и каждая нота каждого
        типа — конечны и > 0 Гц;
     2) ПЕСНЯ: у каждого «вкл»/ведения аккорда с типом — тип в сборке ВИДА СОБЫТИЯ (то же правило), и каждая нота цены ENG (evHz) — конечна
        и > 0 Гц (у нетипизированных тоже). */
export function checkTypes(){
  const bad=[]; let nBad=0, cases=0, song=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const ratioView=v=> (!!v.cents && !v.gridChords) || (periodOf(v)!==2 && chordBuildOf(v)==='adaptive');
  const fits=(v,ty)=> ratioView(v) ? ty.every(x=>typeof x==='number' && x>0) : ty.every(Number.isInteger);
  const pos=f=>typeof f==='number' && Number.isFinite(f) && f>0;
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(m=>m.id) : [undefined])){
    const v=scaleView(s0,tf,cm); if(v.noChords || (v.chordRule && v.chordRule.kind==='none')) continue;
    const id=v.id+(v.tunable?'@'+tf:'')+(cm?'#'+cm:''), T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length;
    const u=chordUnit(v); cases++;
    if(JSON.stringify(u)!==JSON.stringify(ratioView(v)?[1]:[0])) miss(`${id}: root unit [${u}] in a ${ratioView(v)?'ratio':'step'}-priced view`);
    const tys=v.typedChords ? chordFams(v).flatMap(f=>f.types.map(x=>x.iv)) : [];
    for(const ty of tys){ cases++; if(!fits(v,ty)) miss(`${id}: palette type [${ty}] is not of the view's build (${ratioView(v)?'ratios':'steps'})`); }
    for(let ti=0; ti<=E; ti++){
      cases++; const rf=chordRowFreqAt(ti,1,v,false); if(!pos(rf)) miss(`${id} root ${ti}: row pitch ${rf}`);
      for(const ty of tys){ cases++; const N=chordNotesAt(ti,1,v,false,ty); if(!N.length || !N.every(n=>pos(n.f))) miss(`${id} root ${ti} [${ty}]: notes ${N.map(n=>n.f)}`); }
    }
  }
  for(const e of events){ if((e.fn!=='chOn'&&e.fn!=='chSet') || !e.a || !e.sc) continue;
    song++; cases++; const at=`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn} in ${viewIdOf(e.sc)}`;
    if(e.a.ty && !fits(e.sc,e.a.ty)) miss(`${at}: type [${e.a.ty}] is not of its view's build (${ratioView(e.sc)?'ratios':'steps'})`);
    const hz=evHz(e.a,e,'ch'); if(!hz.length || !hz.every(pos)) miss(`${at}: notes ${hz}`);
  }
  console.log(`[scaleprobe types] cases ${cases} · song chords ${song} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe types] '+m));
  if(!nBad) console.log('[scaleprobe types] every chord type is of its view\'s build, and no chord note prices at 0 Hz or below');
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ T7b: РЕЖИМЫ АККОРДОВ ═══
   1) «СВОБОДНО» = ДО T7, ПОБИТНО (Партч и Болен–Пирс): набор вида — ровно прежний (PRE_T7_SETS, JSON), у Б–П с тремя аккордами на 11;
      единица корня — прежняя; ворота chordTypeFits открыты на каждом корне; КАЖДАЯ нота каждого прежнего типа на каждом корне (индекс
      0..размер строя) × регистры 0..3 × 12 тоник × три A4 — chordNotesAt === прежней ветке (preT7ChordNotesAt), f и iv; ступенный путь
      chordNotes и частота ряда корня chordRowFreq — так же против preT7ChordNotes.
   2) «КАК НА ИНСТРУМЕНТЕ» = T7: у Б–П набор — CHORD_FAM_SETS.bpsteps (ссылка); у Партча на 1/1 все 24, на 9/8 — 8 типов.
   3) «ПАУЭР-АККОРД» (14 ладов стопки): нетипизированный аккорд (chordNotes и chordNotesAt по индексу) === прежнему пауэр-аккорду
      (legacyChordNotes по tag — тело до «стопки»), подписи chordLabel === legacyChordLabel, по ступеням 0..n, регистрам 0..3, 12 тоникам,
      септаккорд выкл/вкл; «Стопкой» — прежнее правило (вид без поправок).
   4) ВИД: режим — второй ключ памяти (тот же объект на ту же пару), id вида различает режимы, CUR() следует выбору (переставляется и
      возвращается в finally).
   5) ПЕСНЯ: каждый аккорд звучит, как записан, ПРИ ЛЮБОМ положении переключателя — цена каждого события (evHz) до и после того, как
      режим каждого лада переставлен на другой, === (цена читает вид события, не живой выбор); у события лада с режимами вид несёт режим. */
export function checkModes(){
  const bad=[]; let nBad=0, cases=0, song=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic, keepA=aRef, keepCM=chordModeSel, keepSc=scaleId;
  const json=x=>JSON.stringify(x);
  try{
    // 1) «Свободно» против прежнего кода
    for(const id of ['partch-43','bohlen-pierce']){
      const s0=SCALES.find(x=>x.id===id); if(!s0){ miss(`no mode ${id}`); continue; }
      const v=scaleView(s0,'T','free'), key=v.typedChords, PRE=PRE_T7_SETS[key];
      cases++; if(json(chordFams(v))!==json(PRE)) miss(`${id} Free: the chord set differs from the pre-T7 set '${key}'`);
      cases++; if(json(chordUnit(v))!==json(preT7ChordUnit(v))) miss(`${id} Free: chordUnit ${json(chordUnit(v))}, pre-T7 ${json(preT7ChordUnit(v))}`);
      const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, n=v.iv.length, types=PRE.flatMap(f=>f.types.map(x=>x.iv));
      for(const ty of types) for(let ti=0; ti<=E; ti++){ cases++; if(!chordTypeFits(ty,ti,v)) miss(`${id} Free: type [${ty}] refused on root ${ti}`); }
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A4 of A4_SET){ setARef(A4);
          for(let o=0;o<4;o++){
            for(const ty of types){
              for(let ti=0; ti<=E; ti++){ cases++;
                const X=chordNotesAt(ti,o,v,false,ty), Y=preT7ChordNotesAt(ti,o,v,ty);
                if(X.length!==Y.length || X.some((x,i)=>x.f!==Y[i].f || x.iv!==Y[i].iv)) miss(`${id} Free tonic ${tn} A4 ${A4} root ${ti} reg ${o} [${ty}]: ${X.map(x=>x.f)} now, ${Y.map(x=>x.f)} pre-T7`); }
              for(let d=0; d<=n; d++){ cases++;
                const X=chordNotes(d,o,v,false,ty), Y=preT7ChordNotes(d,o,v,ty);
                if(X.length!==Y.length || X.some((x,i)=>x.f!==Y[i].f || x.iv!==Y[i].iv)) miss(`${id} Free tonic ${tn} A4 ${A4} degree ${d} reg ${o} [${ty}] (degree path): ${X.map(x=>x.f)} now, ${Y.map(x=>x.f)} pre-T7`); }
            }
            for(let d=0; d<=n; d++){ cases++; const a=chordRowFreq(d,o,v,false), b=preT7ChordNotes(d,o,v,preT7ChordUnit(v))[0].f;
              if(a!==b) miss(`${id} Free tonic ${tn} A4 ${A4} row ${d} reg ${o}: row pitch ${a}, pre-T7 ${b}`); }
          }
        }
      }
    }
    setTonic(keepT); setARef(keepA);
    // 2) «Как на инструменте» = T7
    { const bp=SCALES.find(x=>x.id==='bohlen-pierce'), vi=scaleView(bp,'T','instrument');
      cases++; if(chordFams(vi)!==CHORD_FAM_SETS.bpsteps) miss('bohlen-pierce As on the instrument: the chord set is not bpsteps');
      const pa=SCALES.find(x=>x.id==='partch-43'), vp=scaleView(pa,'T','instrument'), all=chordFams(vp).flatMap(f=>f.types);
      const nOn=ti=>all.filter(x=>chordTypeFits(x.iv,ti,vp)).length;
      cases+=2; if(nOn(0)!==24) miss(`partch As on the instrument: ${nOn(0)} types on 1/1, 24 expected`); if(nOn(8)!==8) miss(`partch As on the instrument: ${nOn(8)} types on 9/8, 8 expected`); }
    // 3) пауэр-аккорд у ладов стопки
    for(const s0 of SCALES){ if(!s0.chordModes || !s0.chordModes.some(x=>x.id==='power')) continue;
      const vp=scaleView(s0,'T','power'), vs=scaleView(s0,'T','stack'), n=vp.iv.length;
      cases+=2; if(vp.chordRule.kind!=='power') miss(`${s0.id} power: rule ${vp.chordRule.kind}`); if(vs.chordRule!==s0.chordRule) miss(`${s0.id} stack: the view carries another rule`);
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const sev of [false,true]) for(let o=0;o<4;o++) for(let d=0; d<=n; d++){
          const ref=legacyChordNotes(d,o,vp,sev,null), X=chordNotes(d,o,vp,sev,null), Y= d<n ? chordNotesAt(tuningIndexOf(d,vp,true),o,vp,sev,null) : ref;   // по индексу — корни 0..n−1 (дубль тоники по индексу — корень регистра выше: другая, но равная высота; её сверяют T6b)
          cases+=2;
          if(X.length!==ref.length || X.some((x,i)=>x.f!==ref[i].f || x.iv!==ref[i].iv)) miss(`${s0.id} power tonic ${tn} degree ${d} reg ${o}${sev?' 7th':''}: ${X.map(x=>x.f)}, old power chord ${ref.map(x=>x.f)}`);
          if(Y.length!==ref.length || Y.some((x,i)=>x.f!==ref[i].f)) miss(`${s0.id} power (by index) tonic ${tn} degree ${d} reg ${o}${sev?' 7th':''}: ${Y.map(x=>x.f)}, old ${ref.map(x=>x.f)}`);
          if(o===0){ cases++; const a=chordLabel(d,vp,sev), b=legacyChordLabel(d,vp,sev); if(a!==b) miss(`${s0.id} power tonic ${tn} degree ${d}${sev?' 7th':''}: label "${a}", old "${b}"`); }
        }
      }
    }
    setTonic(keepT);
    // 4) вид
    for(const s0 of SCALES){ if(!s0.chordModes) continue;
      const ids=new Set();
      for(const m of s0.chordModes){ cases+=2; const a=scaleView(s0,'T',m.id), b=scaleView(s0,'T',m.id);
        if(a!==b) miss(`${s0.id} ${m.id}: two view objects for one mode`); if(a.chordMode!==m.id) miss(`${s0.id} ${m.id}: the view carries mode ${a.chordMode}`);
        ids.add(viewIdOf(a)); }
      cases++; if(ids.size!==s0.chordModes.length) miss(`${s0.id}: view ids do not tell the chord modes apart`);
    }
    { const s0=SCALES.find(x=>x.id==='partch-43'); setScaleId(s0.id);
      for(const m of s0.chordModes){ cases++; setChordMode(s0.id,m.id); if(CUR()!==scaleView(s0,tunedFrom,m.id)) miss(`CUR() does not follow the chord mode ${m.id}`); }
      setChordModeSel(keepCM); setScaleId(keepSc); }
    // 5) песня
    const chords=events.filter(e=>(e.fn==='chOn'||e.fn==='chSet') && e.a && e.sc);
    const before=chords.map(e=>evHz(e.a,e,'ch'));
    const flip={}; for(const s0 of SCALES) if(s0.chordModes){ const cur=chordModeOf(s0), other=s0.chordModes.find(x=>x.id!==cur); flip[s0.id]=other.id; }
    setChordModeSel(flip);
    chords.forEach((e,i)=>{ song++; cases++; const h=evHz(e.a,e,'ch'), b=before[i];
      if(h.length!==b.length || h.some((f,j)=>f!==b[j])) miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn}: sounds ${h} after the switch, ${b} as recorded`);
      const m=e.sc.mode||e.sc; if(m.chordModes && !e.sc.chordMode) miss(`L${e.layer+1} beat ${e.t}: the event's view carries no chord mode`); });
  } finally { setTonic(keepT); setARef(keepA); setChordModeSel(keepCM); setScaleId(keepSc); }
  console.log(`[scaleprobe T7b] cases ${cases} (Free vs pre-T7 code, As on the instrument = T7, power = the old power chord, views, song chords ${song}) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T7b] '+m));
  if(!nBad) console.log('[scaleprobe T7b] Free is bit-identical to the pre-T7 code (sets, every note, rows); As on the instrument is T7; power is the old power chord; every recorded chord sounds as recorded whatever the switch says');
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ T7: АККОРДЫ В СВОЁМ СТРОЕ — ПРОГОН (без песни) ═══
   1) КАЖДЫЙ вид с типизированными аккордами × каждый корень лада (регистр 1) × каждый тип набора: тип, ПРЕДЛАГАЕМЫЙ на этом корне
      (scales.chordTypeFits — ворота палитры, жеста и правки), звучит ТОЛЬКО высотами строя: каждый тон цены (chordNotesAt — ей играет ENG)
      в пределах 1¢ (порог «на ряду» редактора) от высоты строя в регистре аккордов (scales.chordPitchHz) — кроме АДАПТИВНОГО строя
      (подвижный Натуральный: высоты хора сдвигаются намеренно; его тоны вне строя считаются и печатаются, не ошибка).
   2) ПАРТЧ: проверка по ЦЕНТАМ, независимая от точных дробей ворот: предложенный тип — каждый тон в 0.02¢ от одной из 43 высот (центы
      таблицы округлены до сотых: корень и тон — по 0.005¢, вместе до 0.010¢; отказанные — от 3.2¢); НЕ предложенный — хотя бы один тон дальше 1¢ от любой (ворота не отсекают чистый аккорд); на 1/1 —
      вся палитра (24 типа). Печатается, сколько типов на каждом корне.
   (T7b: каждый вид — в КАЖДОМ своём режиме аккордов; «Свободно» адаптивен — его тоны мимо строя только считаются.)
   3) БОЛЕН–ПИРС («Как на инструменте»): каждый тип — целые шаги (ни одного отношения), ни одного аккорда с 11; на каждом корне 0..13 и регистрах 0..2 каждая
      нота РАВНА (===) высоте строя pitchHz(bp13, baseF()/2, 0, корень+шаг, регистр) — тону строя, а не отношению.
   Тоника и A4 — живые (цена от них зависит одинаково с обеих сторон). Ничего не меняет. */
export function checkPure(){
  const bad=[]; let nBad=0, cases=0, adaptOff=0, unfit=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const seen=new Set(), perRoot=[];
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(x=>x.id) : [undefined])){   // T7b: каждый режим аккордов
    const v=scaleView(s0,tf,cm); if(!v.typedChords || !v.sel) continue;
    const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, pc=1200*Math.log2(periodOf(v)), id=v.id+(v.tunable?'@'+tf:'')+(cm?'#'+cm:'');
    const P0=chordPitchHz(0,0,v), ref=[]; for(let j=0;j<E;j++) ref.push(((1200*Math.log2(chordPitchHz(j,0,v)/P0))%pc+pc)%pc);
    const dist=f=>{ const c=((1200*Math.log2(f/P0))%pc+pc)%pc; let d=Infinity; for(const r of ref){ const x=Math.abs(c-r); d=Math.min(d,x,pc-x); } return d; };
    const adaptive=chordBuildOf(v)==='adaptive', partch=v.tuning==='partch43' && !adaptive;   // T7b: правила Партча — в режиме «Как на инструменте»; «Свободно» — адаптивный (тоны мимо строя считаются)
    for(let d=0; d<v.iv.length; d++){
      const ti=tuningIndexOf(d,v,true); let nFit=0;
      for(const fam of chordFams(v)) for(const tp of fam.types){
        cases++; const fit=chordTypeFits(tp.iv,ti,v), N=chordNotesAt(ti,1,v,false,tp.iv), lb=`${id} root ${d} type ${L(tp.label)}`;
        if(!N.length){ miss(`${lb}: no notes`); continue; }
        const far=N.map(n=>dist(n.f)), worst=Math.max(...far);
        if(fit){ nFit++;
          if(adaptive){ if(worst>=1) adaptOff++; }
          else if(worst>=(partch?0.02:1)) miss(`${lb}: offered, yet a tone lies ${worst.toFixed(4)}¢ from the tuning`);
        }else{ unfit++;
          if(!partch) miss(`${lb}: refused on a tuning whose chords are built from the tuning by construction`);
          else if(worst<1) miss(`${lb}: refused, yet every tone is within 1¢ of the 43 pitches (${worst.toFixed(4)}¢)`);
        }
      }
      if(partch && !seen.has(d)){ seen.add(d); perRoot.push({ root:d, offered:nFit }); }
      if(partch && d===0 && nFit!==24) miss(`${id}: on 1/1 only ${nFit} of 24 types are offered`);
    }
  }
  // ---- Болен–Пирс
  const bp=SCALES.find(x=>x.tuning==='bp13'), vb=bp&&scaleView(bp,'T','instrument');   // T7b: шаги строя — режим «Как на инструменте»
  if(!vb) miss('no Bohlen–Pierce mode');
  else{ const T=TUNINGS.bp13;
    for(const fam of chordFams(vb)) for(const tp of fam.types){
      const lb=`bohlen-pierce type ${L(tp.label)}`;
      cases++; if(!tp.iv.every(Number.isInteger)) miss(`${lb}: ${tp.iv} is not a set of whole steps`);
      if(/(^|[:/])11([:/]|$)/.test(L(tp.label))) miss(`${lb}: a chord with 11 is still offered`);
      for(let ti=0; ti<=13; ti++) for(let o=0;o<3;o++){ cases++;
        const N=chordNotesAt(ti,o,vb,false,tp.iv);
        N.forEach((n,i)=>{ const w=pitchHz(T,baseF()/2,0,ti+tp.iv[i],o); if(n.f!==w) miss(`${lb} root ${ti} reg ${o} note ${i}: ${n.f}, the tuning pitch is ${w}`); });
      }
    }
  }
  console.log(`[scaleprobe T7] cases ${cases} · refused on a Partch root ${unfit} · adaptive Natural chords with a tone off the tuning ${adaptOff} (a choir's shifted pitch, not an error) · differences ${nBad}`);
  if(perRoot.length) console.log('[scaleprobe T7] Partch — types offered per root (of 24): '+perRoot.map(x=>`${x.root}:${x.offered}`).join(' '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T7] '+m));
  if(!nBad) console.log('[scaleprobe T7] every chord offered sounds only pitches of its tuning (adaptive Natural excepted, by design); Partch offers only its 43 pitches; Bohlen–Pierce chords are its own steps, no 11');
  return { cases, unfit, adaptOff, perRoot, total:nBad, differences:bad };
}

/* ═══ T5: ВЫСОТЫ ВНЕ ЛАДА — ПРОГОН (без песни) ═══
   Каждый вид с приглушёнными рядами (выборка лада меньше строя; фиксированных среди них нет) × каждая высота строя ВНЕ лада внутри
   периода × регистры 0..3:
     1) ЦЕНА соло и баса (leadFreqTi/bassFreqTi — ими играет ENG) против опоры по целому строю (wholeOf);
     2) РЯДЫ: у оси «Все» — целый ряд, и pitchOf отдаёт ту же пару (так её запишет перенос); у оси «Лад» — дробный ряд строго между двумя
        ступенями, по высоте между ними, с отступлением (placeTi — его рисует редактор); подсветки нет (modeSlotOfTi — null);
     3) у видов, чьё правило строит аккорды: ОДНОНОТНЫЙ аккорд (chordUnit — так ложится перенесённая нота аккорда) против опоры; и
        ВАРИАНТ (а) — каждая ступень 0..n−1 × септаккорд выкл/вкл: recorder.chordMoveTy даёт тип (массив) для высоты вне лада и НЕ даёт его
        для своего же яркого корня; с этим типом аккорд на СВОЁМ корне звучит РОВНО как нетипизированный (=== — форма сохранена, «перенёс
        и вернул — тот же звук»), а на корне вне лада — равен опоре по целому строю (та же форма, перенесённая).
   Точно (===), кроме таблицы с корнем ≠ 0 (Баранг) — там в центах, 1e-6 (см. wholeOf) и считается отдельно. Ничего не меняет. */
export function checkOut(){
  const bad=[]; let nBad=0, cases=0, tol=0, nViews=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const CH=new Set(['tertian','stack','power','ratios']);
  for(const [s0,tf] of allViews()){
    const v=scaleView(s0,tf), T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length;
    if(!v.sel || v.sel.length>=E) continue;
    nViews++; const id=v.id+(v.tunable?'@'+tf:''), W=wholeOf(v), ex=wholeExact(v), axA=RP.axis(v,true), axM=RP.axis(v,false), n=v.iv.length;
    if(!W){ miss(`${id}: no whole-tuning reference`); continue; }
    const k=v.chordRule&&v.chordRule.kind, chords=CH.has(k) && T.equal!=null;
    for(let o=0;o<4;o++) for(let j=1;j<E;j++){
      const ti=v.root+j; if(modeSlotOfTi(ti,o,v)) continue;
      const at=`${id} pitch +${j} reg ${o}`; if(!ex) tol++;
      cases++; { const [jj,R]=wholeSplit(ti,o,v), a=leadFreqTi(ti,o,v), b=legacyLeadFreq(jj,R,W); if(!sameHz(a,b,ex)) miss(`${at}: solo ${a}, whole-tuning reference ${b}`); }
      cases++; { const [jj,R]=wholeSplit(ti,o,v), a=bassFreqTi(ti,o,v), b=legacyBassFreq(jj,R,W); if(!sameHz(a,b,ex)) miss(`${at}: bass ${a}, whole-tuning reference ${b}`); }
      cases++; { const r=axA.rowOfTi(ti,o), p=Number.isInteger(r)&&axA.pitchOf(r); if(!p||p.ti!==ti||p.oct!==o) miss(`${at}: All axis row ${r} decodes to ${p?p.ti+'/'+p.oct:'nothing'}`); }
      cases++; { const pl=axM.placeTi(ti,o), lo=Math.floor(pl.r), hi=Math.ceil(pl.r), pL=axM.pitchOf(lo), pH=axM.pitchOf(hi), f=leadFreqTi(ti,o,v);
        if(!(Number.isFinite(pl.r)&&lo!==hi&&pL&&pH)) miss(`${at}: Mode axis place ${pl.r}, not between two rows`);
        else if(!(leadFreqTi(pL.ti,pL.oct,v)<f && f<leadFreqTi(pH.ti,pH.oct,v))) miss(`${at}: Mode axis row ${pl.r} is not between the pitches around it`);
        if(!(typeof pl.dev==='number'&&Number.isFinite(pl.dev)&&pl.dev!==0)) miss(`${at}: no deviation mark (${pl.dev})`); }
      if(!chords) continue;
      cases++; { const u=chordUnit(v), A=chordNotesAt(ti,o,v,false,u), B=legacyChordNotesRef(ti-v.root,o,W,false,u);
        if(A.length!==1||B.length!==1||A[0].f!==B[0].f) miss(`${at}: one-note chord ${A.map(x=>x.f)}, whole-tuning reference ${B.map(x=>x.f)}`); }
      for(const sev of [false,true]) for(let d=0;d<n;d++){
        const seg={ role:'ch', ty:null, sc:v, sev, ti:tuningIndexOf(d,v,true), oct:o }, tt=`${at} option (a) from degree ${d}${sev?' 7th':''}`;
        cases++; const ty=chordMoveTy(seg,ti,o);
        if(!Array.isArray(ty)){ miss(`${tt}: no shape (${ty})`); continue; }
        if(chordMoveTy(seg,seg.ti,o)!==undefined) miss(`${tt}: a shape is written for its own bright root`);
        const U=chordNotesAt(seg.ti,o,v,sev,null), K=chordNotesAt(seg.ti,o,v,sev,ty);
        if(U.length!==K.length || U.some((x,i)=>x.f!==K[i].f)) miss(`${tt}: typed on its own root ${K.map(x=>x.f)}, untyped ${U.map(x=>x.f)} — the shape changed`);
        const M=chordNotesAt(ti,o,v,sev,ty), B=legacyChordNotesRef(ti-v.root,o,W,sev,ty);
        if(M.length!==B.length || M.some((x,i)=>x.f!==B[i].f)) miss(`${tt}: on the dimmed root ${M.map(x=>x.f)}, whole-tuning reference ${B.map(x=>x.f)}`);
      }
    }
  }
  RP.reset();
  console.log(`[scaleprobe T5] views with pitches outside the mode ${nViews} · cases ${cases}${tol?` (${tol} pitches compared in cents — table with a root offset)`:''} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T5] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T5] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe T5] every pitch outside the mode prices as its tuning pitch, sits on its row (All) or between its neighbours (Mode), and a whole chord moved there keeps its shape');
  return { views:nViews, cases, tol, total:nBad, differences:bad };
}

/* ═══ F0 «СТРОИ И ЛАДЫ ФАЙЛАМИ»: КАНОНИЧЕСКИЙ СНИМОК — ДОКАЗАТЕЛЬСТВО ПЕРЕЕЗДА ═══
   Переезд (F1–F5) обязан оставить каждый встроенный лад ПОБИТНО тем же — по звуку и по показу. Снимок фиксирует ВСЁ, что относится к
   ладам, на коде ДО переезда; после каждого слайса P.checkFiles сверяет живой реестр с ним поле за полем, ===. Те же данные при том же
   коде цены — тот же звук; прочие пробы (T0…T7b) сверяют цену и ряды на тех данных, что загружены.
   ЧТО В СНИМКЕ (канонический JSON: ключи отсортированы, числа — как печатает JavaScript (кратчайшая запись, читается назад тем же
   double), нечисловые — метками '#NaN'/'#+Inf'/'#undefined'):
     modes      — каждый лад SCALES по порядку: ВСЕ его поля (вместе с выведенными sel/root, режимами аккордов, правилом), плюс индекс i;
     tunings    — TUNINGS целиком (центы, равные в форме генератора, точные отношения);
     palettes   — CHORD_FAM_SETS целиком (имена, подписи и интервалы типов на всех языках — объекты L как есть);
     traditions — TRADITIONS; groups — GRP;
     menu       — по каждому языку: традиции по порядку, их корзины (ключ, подпись) и лады (индекс, id, имя) — scales.menuOf, которым рисует
                  меню ui.fillScales;
     chordModes — по каждому языку: у каждого лада с режимами — id, имя и подсказка каждого режима (как их показывает панель);
     droneNonOct — выбор второй струны дрона у неоктавных строёв (ухо пользователя; влияет на ступень дрона);
     views      — каждый ВИД (лад × «строй от» у tunable × режим аккордов): id вида, якорь, режим, поля, которые режим подставляет; и по
                  каждой из 12 тоник — ступень второй струны дрона (droneDegree: ступень, причина, центы), показ центов каждой ступени
                  (centsOf), и по каждому языку: подпись каждой ступени (draw.noteLbl), подпись каждого ряда регистра обеих осей редактора
                  (draw.axisLbl: «Все» и «Лад»), подпись и ноты аккорда на каждой ступени с септаккордом и без (chordLabel, chordNotesStr —
                  у ладов с аккордами), имя корня палитры (rootName — у ладов с палитрой), слово регистра (regWord).
   meta (дата, формат) в сверку не входит. Ничего не меняет: тоника переставляется сеттером и возвращается в finally, язык — withLang
   (без записи выбора и без перерисовки), виды — те же запомненные объекты, что берёт приложение. */
const SNAP_FILE='tools/scales.before.json';
function buildSnapshot(){
  const LGS=['en','ru'], keepT=tonic;
  const snap={ meta:{ format:'handsong/scales-snapshot', version:1, made:new Date().toISOString(), file:SNAP_FILE } };
  snap.modes=SCALES.map((s0,i)=>({ i, fields:canon(s0) }));
  snap.tunings=canon(TUNINGS); snap.palettes=canon(CHORD_FAM_SETS); snap.traditions=canon(TRADITIONS); snap.groups=canon(GRP);
  snap.droneNonOct=droneNonOct();
  snap.menu={}; snap.chordModes={};
  for(const lg of LGS) withLang(lg,()=>{
    snap.menu[lg]=TRADITIONS.map(tr=>({ id:tr.id, name:L(tr.name),
      groups:menuOf(tr.id).map(g=>({ key:g.key, label:g.label, scales:g.items.filter(({s})=>!isUserId(s.id)).map(({i,s})=>({ i, id:s.id, name:L(s.name) })) }))
        .filter(g=>g.scales.length) }));   // F6: только встроенные (группа из одних ладов пользователя — не в снимке)
    snap.chordModes[lg]=SCALES.filter(x=>x.chordModes).map(x=>({ id:x.id, modes:x.chordModes.map(m=>({ id:m.id, name:chordModeName(m), hint:chordModeHint(m) })) }));   // F6b: ключ словаря или своё имя — одно чтение
  });
  snap.views=[];
  try{
    for(const {s0,tf,cm,v} of snapViews()){
      const n=v.iv.length, chords=!v.noChords && !(v.chordRule && v.chordRule.kind==='none'), axA=RP.axis(v,true), axM=RP.axis(v,false);
      const rec={ id:viewIdOf(v), mode:s0.id, tf, cm:cm??null, anchor:canon(v.anchor), chordMode:v.chordMode??null,
                  over:canon({ chordBuild:v.chordBuild, typedChords:v.typedChords, chordRule:v.chordRule }), byTonic:[] };
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        const T={ drone:canon(droneDegree(v)), cents:range(n+1).map(d=>canon(centsOf(d,v))), lang:{} };
        for(const lg of LGS) withLang(lg,()=>{
          const L1={ notes:range(n+1).map(d=>RP.noteLbl(d,v)),
                     axisAll:range(axA.rpp).map(r=>RP.axisLbl(axA,r)), axisMode:range(axM.rpp).map(r=>RP.axisLbl(axM,r)),
                     periodWord:regWord(v) };
          if(chords){ L1.chord=range(n+1).map(d=>chordLabel(d,v,false)); L1.chord7=range(n+1).map(d=>chordLabel(d,v,true));
                      L1.chordNotes=range(n+1).map(d=>chordNotesStr(d,v,false)); L1.chordNotes7=range(n+1).map(d=>chordNotesStr(d,v,true)); }
          if(v.typedChords) L1.root=range(n+1).map(d=>rootName(d,v));
          T.lang[lg]=L1;
        });
        rec.byTonic.push(T);
      }
      snap.views.push(rec);
    }
  } finally { setTonic(keepT); }
  return snap;
}
/* P.dumpScales() — снимок и СКАЧИВАНИЕ файла scales.before.json (положить в tools/ — его читает P.checkFiles). → сам снимок. */
export function dumpScales(){
  const snap=buildSnapshot(), text=JSON.stringify(snap);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'application/json'})); a.download='scales.before.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  console.log(`[scaleprobe files] snapshot: ${snap.modes.length} modes, ${Object.keys(snap.tunings).length} tunings, ${Object.keys(snap.palettes).length} palettes, ${snap.views.length} views × 12 tonics × 2 languages · ${(text.length/1024).toFixed(0)} KB — downloaded as scales.before.json; put it into tools/`);
  return snap;
}
/* ⛳ F7: СВЕРКА ПО id, А НЕ ПО МЕСТУ. Лады, виды и списки режимов аккордов сравниваются ПО СВОЕМУ id (лад — без номера i: место в массиве
   не тождество, правило #25; удаление одного лада иначе показало бы расхождение у каждого лада после него). Порядок проверяет меню — его
   списки остаются ПОЗИЦИОННЫМИ (без номера i, по той же причине), так что перестановка ладов видна. Форма файла снимка не меняется:
   оба снимка перекладываются здесь одинаково. */
function keyedSnap(x){ const o={...x};
  if(Array.isArray(o.modes)) o.modes=Object.fromEntries(o.modes.map(r=>[r.fields && r.fields.id, r.fields]));
  if(Array.isArray(o.views)) o.views=Object.fromEntries(o.views.map(v=>[v.id, v]));
  if(o.chordModes) o.chordModes=Object.fromEntries(Object.entries(o.chordModes).map(([lg,a])=>[lg, Object.fromEntries((a||[]).map(z=>[z.id, z.modes]))]));
  if(o.menu) o.menu=Object.fromEntries(Object.entries(o.menu).map(([lg,trs])=>[lg, (trs||[]).map(tr=>({ ...tr, groups:(tr.groups||[]).map(g=>({ ...g, scales:(g.scales||[]).map(({id,name})=>({id,name})) })) }))]));
  return o; }
/* P.checkFiles() — живой реестр против tools/scales.before.json, поле за полем (===), без meta. Файла нет — { noSnap:true }: P.all
   показывает «снимка ещё нет» (не провал и не pass). Каждое расхождение — путь и обе величины. */
export async function checkFiles(){
  let file;
  try{ const r=await fetch(new URL(SNAP_FILE, location.href), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ console.log(`[scaleprobe files] no snapshot yet (${SNAP_FILE}: ${e&&e.message}) — run P.dumpScales() on the unchanged code and put the file into tools/`);
            return { cases:0, total:0, differences:[], noSnap:true }; }
  file=keyedSnap(file);
  const live=keyedSnap(JSON.parse(JSON.stringify(buildSnapshot())));   // та же сериализация, что у файла: сравниваем одно с одним; F7 — по id
  const bad=[]; let nBad=0, cases=0;
  const groups=new Map();   // F5b: СВОДКА по пути поля (номера в [] → [*]) и виду расхождения — видно с одного взгляда, ЧТО разошлось
  const miss=(m,path,kind)=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m);
    const key=(path||'?').replace(/\[\d+\]/g,'[*]')+' · '+(kind||'value'); groups.set(key,(groups.get(key)||0)+1); };
  const show=x=>{ const j=JSON.stringify(x); return j===undefined ? 'nothing' : j.length>120 ? j.slice(0,117)+'…' : j; };
  const walk=(a,b,path)=>{
    if(a!==null && b!==null && typeof a==='object' && typeof b==='object'){
      if(Array.isArray(a)!==Array.isArray(b)){ miss(`${path}: array vs object`,path,'type'); return; }
      if(Array.isArray(a)){ if(a.length!==b.length) miss(`${path}: length ${b.length} now, ${a.length} in the snapshot`,path,'length');
        for(let i=0;i<Math.min(a.length,b.length);i++) walk(a[i],b[i],path+'['+i+']'); return; }
      for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
        if(!(k in a)) miss(`${path}.${k}: new now (${show(b[k])})`,path+'.'+k,'new'); else if(!(k in b)) miss(`${path}.${k}: gone now (snapshot ${show(a[k])})`,path+'.'+k,'gone'); else walk(a[k],b[k],path+'.'+k); }
      return;
    }
    cases++; if(a!==b) miss(`${path}: ${show(b)} now, ${show(a)} in the snapshot`,path,'value');
  };
  for(const k of new Set([...Object.keys(file),...Object.keys(live)])){ if(k==='meta') continue;
    if(!(k in file)) miss(`${k}: new now`,k,'new'); else if(!(k in live)) miss(`${k}: gone now`,k,'gone'); else walk(file[k],live[k],k); }
  { const u=userCount(); console.log(`[scaleprobe files] covers the BUILT-IN data only (data/ and the emergency pair)${u ? ` — ${u} user record(s) installed, not compared` : ''}`); }
  console.log(`[scaleprobe files] snapshot ${file.meta&&file.meta.made} · values compared ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe files] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe files] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe files] every mode, tuning, palette, menu entry, drone degree and label equals the snapshot');
  const summary=[...groups].map(([k,n])=>{ const i=k.lastIndexOf(' · '); return { field:k.slice(0,i), kind:k.slice(i+3), count:n }; });
  if(nBad){ console.log('[scaleprobe files] differences grouped by field path:'); console.table(summary); }
  return { cases, total:nBad, differences:bad, summary, made:file.meta&&file.meta.made };
}

/* ═══ ⛳ F3 — P.checkNames(): ИМЕНА ДАННЫМИ ПРОТИВ ЗАМОРОЖЕННЫХ ПОДПИСЕЙ ДО F3 ═══
   Каждый вид (лад × «строй от» у tunable × режим аккордов — те же виды, что у снимка F0) × 12 тоник × en/ru, строгое ===:
     слово периода (короткое и полное), каждая ступень 0..n — подпись ступени (draw.noteLbl), имя ряда (rowLabel), корень палитры
     (rootName), аккорд и его ноты с септаккордом и без (chordLabel, chordNotesStr — у ладов с аккордами, как в снимке), каждый шаг
     −edo..2·edo−1 (stepName); и каждый ряд ВСЕХ регистров обеих осей редактора «Все» и «Лад» (draw.axisLbl — у приглушённых рядов
     это имя высоты строя). Опоры — preF3* выше. Тонику переставляет сеттер и возвращает finally; язык — withLang. */
export function checkNames(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic;
  try{
    for(const {v} of snapViews()){
      const n=v.iv.length, id=viewIdOf(v), chords=!v.noChords && !(v.chordRule && v.chordRule.kind==='none');
      const axes=[['All',RP.axis(v,true)],['Mode',RP.axis(v,false)]];
      /* ⛳ F7: опоры F3 не знают схемы ступеней ОТ РЕЖИМА АККОРДОВ (degNaming появилась в F7): вид, чьи ступени режим называет
         порядковыми (Натуральный в «Свободно»), сверяется с замороженным порядковым правилом — тем же видом без fixedKey (опора F3 даёт
         порядковые у табличного лада без fixedKey: ровно прежний подвижный Натуральный). Иных схем режимы встроенных не задают. */
      const vr= v.degNaming==='ordinal' ? {...v, fixedKey:false} : v;
      const axR=ax=> vr===v ? ax : {...ax, sc:vr};
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const lg of ['en','ru']) withLang(lg,()=>{
          const eq=(what,a,b)=>{ cases++; if(a!==b) miss(`${id} tonic ${tn} ${lg} · ${what}: "${a}" now, "${b}" before F3`); };
          eq('period word', regWord(v), preF3RegWord(v)); eq('period word (full)', regWordFull(v), preF3RegWordFull(v));
          for(let d=0;d<=n;d++){
            eq(`degree ${d}`, RP.noteLbl(d,v), preF3NoteLbl(d,vr)); eq(`row ${d}`, rowLabel(d,v), preF3RowLabel(d,v)); eq(`root ${d}`, rootName(d,v), preF3RootName(d,v));
            if(chords) for(const sev of [false,true]){ const w=sev?' 7th':'';
              eq(`chord ${d}${w}`, chordLabel(d,v,sev), preF3ChordLabel(d,v,sev)); eq(`chord notes ${d}${w}`, chordNotesStr(d,v,sev), preF3ChordNotesStr(d,v,sev)); }
          }
          for(let st=-v.edo; st<2*v.edo; st++) eq(`step ${st}`, stepName(st,v), preF3StepName(st,v));
          for(const [nm,ax] of axes) for(let r=0;r<ax.rpp*REG_N;r++) eq(`${nm} axis row ${r}`, RP.axisLbl(ax,r), preF3AxisLbl(axR(ax),r));
        });
      }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe names] ${snapViews().length} views × 12 tonics × 2 languages · labels compared ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe names] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe names] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe names] every label read from the naming schemes equals the pre-F3 label');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F5b — P.renewSnapshot(): ПЕРЕСНЯТЬ СНИМОК ТОЛЬКО ПОСЛЕ ДОКАЗАННОГО РАСХОЖДЕНИЯ ═══
   Снимок F0 — доказательство переезда; переснимать его можно лишь тогда, когда сверка с ним показывает РОВНО то изменение, которое слайс
   объявил. allowed — список разрешённых групп сводки P.checkFiles (путь поля с [*] и вид расхождения); по умолчанию — изменение F5b:
   поле tag ушло из записи каждого лада (modes[*].fields.tag · gone), и таких расхождений ровно столько, сколько ладов. Всё иначе —
   отказ с причиной, ничего не скачивается. Иначе — P.dumpScales(): новый scales.before.json скачивается, его кладут в tools/ вместо старого. */
/* ⛳ ОБЪЯВЛЕННЫЕ ИЗМЕНЕНИЯ СНИМКА — по слайсу. field — путь поля сводки P.checkFiles; '*' — ОДНО звено пути (ключ объекта: id строя,
   лада…); count — сколько расхождений обязано найтись по ВСЕМ подходящим группам вместе. F5b: поле tag ушло из каждого лада. F6b: у
   каждого встроенного строя появилось имя (tunings.<id>.name — новое поле). Без аргумента renewSnapshot берёт ПОСЛЕДНЕЕ объявленное. */
export const SNAPSHOT_CHANGES={
  f5b:[{ field:'modes.*.tag', kind:'gone', count:()=>SCALES.length }],   // (с F7 сверка по id — путь записан в нынешней форме)
  f6b:[{ field:'tunings.*.name', kind:'new', count:()=>Object.keys(TUNINGS).length }],
  /* F7: два Натуральных слиты в один лад 'just-intonation' (13 «строй от» × 2 режима аккордов = 26 видов); в меню «Европа историческая»
     вместо двух строк — одна: из 7 строк группы стало 6, со второй по шестую строки сдвинулись (5 id и 5 имён на язык) и длина. */
  f7:[{ field:'modes.ji-adaptive', kind:'gone', count:()=>1 }, { field:'modes.ji-fixed', kind:'gone', count:()=>1 },
      { field:'modes.just-intonation', kind:'new', count:()=>1 },
      { field:'views.ji-adaptive', kind:'gone', count:()=>1 }, { field:'views.ji-fixed', kind:'gone', count:()=>1 },
      { field:'views.just-intonation@*', kind:'new', count:()=>26 },
      { field:'chordModes.*.just-intonation', kind:'new', count:()=>2 },
      { field:'menu.*[*].groups[*].scales', kind:'length', count:()=>2 },
      { field:'menu.*[*].groups[*].scales[*].id', kind:'value', count:()=>10 },
      { field:'menu.*[*].groups[*].scales[*].name', kind:'value', count:()=>10 }],
  /* F7-починка: голый лад РАВЕН своему режиму аккордов по умолчанию — у Партча и Болена–Пирса прибавилось chordBuild 'adaptive' (умолчание
     «Свободно»), у Натурального — палитра 'nat' и chordBuild 'adaptive' (его «Свободно»), а его «Как на инструменте» переопределяет и имена
     ступеней (degNaming 'notes12' — у самого лада теперь порядковые). */
  f7b:[{ field:'modes.partch-43.chordBuild', kind:'new', count:()=>1 }, { field:'modes.bohlen-pierce.chordBuild', kind:'new', count:()=>1 },
       { field:'modes.just-intonation.typedChords', kind:'new', count:()=>1 }, { field:'modes.just-intonation.chordBuild', kind:'new', count:()=>1 },
       { field:'modes.just-intonation.chordModes[*].over.degNaming', kind:'new', count:()=>1 }],
};
const reEsc=q=>q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fieldRe=f=>new RegExp('^'+f.split('[*]').map(p=>p.split('*').map(reEsc).join('[^.\\[\\]]+')).join('\\[\\*\\]')+'$');   // '*' — одно звено; '[*]' — номер в сводке, как есть
export async function renewSnapshot(arg=SNAPSHOT_CHANGES.f7b){
  const allowed=Array.isArray(arg) ? arg : (arg && arg.allowed) || SNAPSHOT_CHANGES.f7b;   // F6b: P.renewSnapshot({allowed: …}) или список
  const keep={ log:console.log, warn:console.warn, table:console.table }; let r;
  console.log=console.warn=console.table=()=>{};
  try{ r=await checkFiles(); } finally { Object.assign(console,keep); }
  const say=m=>console.log('%c[scaleprobe renew] '+m,'color:#57d9a3;font-weight:bold');
  if(r.noSnap){ say('no snapshot in tools/ to renew — nothing done'); return { renewed:false, why:'no snapshot' }; }
  if(!r.total){ say('the live data already equal the snapshot — nothing to renew'); return { renewed:false, why:'no differences' }; }
  console.table(r.summary);
  const fits=(a,g)=>a.kind===g.kind && (a.field===g.field || fieldRe(a.field).test(g.field));   // F6b: '*' — одно звено пути
  const odd=r.summary.filter(g=>!allowed.some(a=>fits(a,g)));
  const short=allowed.filter(a=>{ const n=r.summary.filter(g=>fits(a,g)).reduce((x,g)=>x+g.count,0); return !n || (a.count && n!==a.count()); });
  if(odd.length || short.length){
    say(`REFUSED — the differences are not exactly the declared change: ${odd.map(g=>`${g.field} · ${g.kind} ×${g.count}`).join('; ')||'—'}`
       +(short.length ? ` · expected but not matched: ${short.map(a=>`${a.field} · ${a.kind}${a.count?' ×'+a.count():''}`).join('; ')}` : ''));
    return { renewed:false, why:'unexpected differences', summary:r.summary };
  }
  say(`every one of the ${r.total} differences is the declared change (${allowed.map(a=>`${a.field} · ${a.kind}`).join('; ')}) — taking a new snapshot (old one made ${r.made})`);
  const snap=dumpScales();
  say('scales.before.json downloaded — move it into tools/ (replacing the old file), reload, and await P.checkFiles() must read zero');
  return { renewed:true, replaced:r.made, made:snap.meta.made, summary:r.summary };
}

/* ═══ ⛳ F6 — P.checkUserDelete(): УДАЛЕНИЕ ФАЙЛА ПОЛЬЗОВАТЕЛЯ НЕ ЛОМАЕТ ЗАПИСАННОЕ ═══
   Материал — пример файлов пользователя (userfiles.example: свой табличный строй с именами-списком и словом периода en/ru, лад на нём с
   палитрой 'nat') под id пробы. Порядок: та же проверка записи (checkRecord), установка ТЕМ ЖЕ кодом, что консоль (registerRecord — без
   записи в хранилище и без перестройки меню), лад становится живым, взятое пишется НАСТОЯЩЕЙ воронкой в песочнице (probeTake: соло, бас,
   аккорды палитры на каждой ступени, два регистра; песня не меняется); затем снимается «отпечаток» записанного — цена каждого события
   (evHz; у аккорда — каждая нота: частота и интервал), его место и подпись на ОБЕИХ осях редактора, и по виду — подписи ступеней,
   слово периода, строка статуса, дрон, id вида, строй вида; живой лад возвращается, ЛАД И СТРОЙ УДАЛЯЮТСЯ (unregisterRecord), удаление
   проверяется (нет в реестрах, в наборе, в меню), и отпечаток снимается снова — обязан совпасть строка в строку. Нужен ▶ Play (песочница —
   как у P.checkWrite). finally снимает записи пробы при любом исходе. */
const UD_T='u.f6f6f6f6-0000-4000-8000-00000000000a', UD_M='u.f6f6f6f6-0000-4000-8000-00000000000b';
export function checkUserDelete(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepSc=scaleId; let reg=false;
  const D=scaleData(), E=userExample();
  const t0={...E.tuning, id:UD_T}, m0={...E.mode, id:UD_M, tuning:UD_T, name:{en:'Probe: user mode',ru:'Проба: лад пользователя'}};
  const drop=()=>{ if(D.modes[UD_M]) unregisterRecord('mode',UD_M,false); if(D.tunings[UD_T]) unregisterRecord('tuning',UD_T,false); };
  const roleOf=fn=> fn.startsWith('lead') ? 'ld' : fn.startsWith('bass') ? 'bs' : fn.startsWith('ch') ? 'ch' : null;
  const fingerprint=evs=>{ const out=[], views=new Set();
    for(const ev of evs){ const role=roleOf(ev.fn); if(!role || ev.a.ti==null) continue; views.add(ev.sc);
      const price= role==='ch' ? chordNotesAt(ev.a.ti,ev.a.oct,ev.sc,ev.sev,ev.a.ty).map(n=>[n.f,n.iv]) : evHz(ev.a,ev,role);
      const axes=[true,false].map(all=>{ const ax=RP.axis(ev.sc,all), p=ax.placeTi(ev.a.ti,ev.a.oct);
        return { r:p.r, dev:p.dev, lbl: Number.isInteger(p.r) ? RP.axisLbl(ax,p.r) : null }; });
      out.push({ fn:ev.fn, t:ev.t, ti:ev.a.ti, oct:ev.a.oct, price, axes }); }
    for(const v of views){ const n=v.iv.length;
      out.push({ view:viewIdOf(v), tuning:tuningOf(v)===v.tuningRec, notes:range(n+1).map(d=>RP.noteLbl(d,v)), roots:range(n+1).map(d=>rootName(d,v)),
                 word:regWord(v), wordFull:regWordFull(v), status:tuningStatus(v), drone:canon(droneDegree(v)), cents:range(n+1).map(d=>centsOf(d,v)) }); }
    return out; };
  try{
    drop();
    for(const [k,r] of [['tuning',t0],['mode',m0]]){ cases++; const w= k==='mode' && !D.tunings[UD_T] ? 'tuning not registered' : checkRecord(k,r,D);
      if(w){ miss(`the example user ${k} fails the validator: ${w}`); return { cases, total:nBad, differences:bad }; }
      if(k==='tuning'){ registerRecord('tuning',t0,false); reg=true; } else registerRecord('mode',m0,false); }
    setScaleId(UD_M); const v=CUR(); cases++;
    if(!v || v.mode!==scaleById(UD_M)) miss('the user mode did not become the live view');
    const F=chordFams(v), tys=F.slice(0,2).map(f=>f.types[0].iv);
    const steps=[]; let t=0; const add=(fn,a)=>{ steps.push({fn,a,t}); t+=0.25; };
    for(const o of [1,2]) for(let d=0;d<=v.iv.length;d++){
      add('leadOn',{deg:d,oct:o,vol:0.7,inst:3,v:d%2}); add('bassOn',{deg:d,oct:o,vol:0.6,inst:2}); add('chOn',{deg:d,oct:o,vol:0.55,inst:1,ty:tys[d%tys.length]}); }
    const R=probeTake(steps); cases++;
    if(!R.ok){ miss(`the sandboxed take was refused — ${R.why}`); return { cases, total:nBad, differences:bad }; }
    const evs=R.events; cases++; if(!evs.some(e=>e.sc===v)) miss('no recorded event holds the user view');
    const before=fingerprint(evs);
    setScaleId(keepSc);                                     // живой лад — прежний, ПЕРЕД удалением (удаление не должно его переключать)
    const a=unregisterRecord('mode',UD_M,false), b=unregisterRecord('tuning',UD_T,false); reg=false;
    for(const [w,ok] of [['the mode was removed',a.ok],['the tuning was removed',b.ok],['scaleById no longer finds the mode',scaleById(UD_M)===null],
                         ['the registry has no tuning',!TUNINGS_ALL[UD_T]],['the data set has neither',!D.modes[UD_M]&&!D.tunings[UD_T]],
                         ['the menu has no user mode',!menuOf('exp').some(g=>g.items.some(({s})=>s.id===UD_M))],['the mode left SCALES',!SCALES_ALL.some(s=>s.id===UD_M)]]){
      cases++; if(!ok) miss(`deletion: ${w} — failed`); }
    const after=fingerprint(evs);
    cases++; if(before.length!==after.length) miss(`fingerprint length ${after.length} after deletion, ${before.length} before`);
    for(let i=0;i<Math.min(before.length,after.length);i++){ cases++; const A=JSON.stringify(after[i]), B=JSON.stringify(before[i]);
      if(A!==B) miss(`after deletion: ${A.slice(0,160)} — before: ${B.slice(0,160)}`); }
    console.log(`[scaleprobe user] recorded ${evs.length} events in a user mode, deleted the mode and its tuning · items compared ${before.length} · differences ${nBad}`);
  } finally { if(reg) drop(); else { try{ drop(); }catch(e){} } setScaleId(keepSc); }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe user] '+m));
  if(!nBad) console.log('[scaleprobe user] every recorded note sounds and shows exactly as before the user files were deleted');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F6b — P.checkUserChordModes(): СВОЙ НАБОР РЕЖИМОВ АККОРДОВ ═══
   Материал — userfiles.chordModesExample под id пробы: набор из ТРЁХ режимов со своими именами {en, ru} («Терции» без переопределений,
   «Палитра» — palette chrom12, «Пауэр» — rule power) и мажор на встроенном 12-равном с ним. Проверка (запись — та же checkRecord,
   установка — registerRecord без хранилища и меню): (1) имена и подсказки режимов на обоих языках — свои; если есть панель — после
   перестройки (hooks.scales) в #chordModeSeg ровно три кнопки с этими именами; (2) ЦЕНА каждого режима — как велят его переопределения:
   «Терции» === встроенный мажор (те же ступени, правило tertian), «Палитра» — каждый тип палитры chrom12 на каждом корне === встроенная
   хроматика, «Пауэр» === встроенная мажорная пентатоника в режиме «Пауэр-аккорд» (на общих корнях); и «Пауэр» хоть раз отличается от
   «Терций» (переопределение действует); (3) ЗАПИСАННОЕ ДЕРЖИТ СВОЙ РЕЖИМ (T7b): в каждом режиме пишется взятое (песочница probeTake), затем
   режим лада переключается — цена каждого записанного аккорда и режим его вида не меняются. Регистры 1..2, септаккорд без и с.
   finally — записи пробы снимаются, живой лад и выбор режимов возвращаются. Нужен ▶ Play (песочница). */
const CM_S='u.f6b0f6b0-0000-4000-8000-00000000000c', CM_M='u.f6b0f6b0-0000-4000-8000-00000000000d';
export function checkUserChordModes(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const D=scaleData(), E=userCmExample(), keepSc=scaleId, keepCM={...chordModeSel};
  const set={...E.set, id:CM_S}, mode={...E.mode, id:CM_M, chords:{...E.mode.chords, modes:CM_S}, name:{en:'Probe: user chord modes',ru:'Проба: свои режимы аккордов'}};
  const drop=()=>{ if(D.modes[CM_M]) unregisterRecord('mode',CM_M,false); if(D.chordModeSets[CM_S]) unregisterRecord('chordmodes',CM_S,false); };
  const sig=n=>JSON.stringify(n.map(x=>[x.f,x.iv]));
  const panelBtns=()=>{ const el=typeof document!=='undefined' && document.getElementById('chordModeSeg'); return el ? [...el.querySelectorAll('button')].map(b=>b.textContent) : null; };
  try{
    drop();
    for(const [k,r] of [['chordmodes',set],['mode',mode]]){ cases++; const w=checkRecord(k,r,D);
      if(w){ miss(`the example user ${k} fails the validator: ${w}`); return { cases, total:nBad, differences:bad }; }
      registerRecord(k,r,false); }
    const m0=scaleById(CM_M), ids=E.set.modes.map(x=>x.id); cases++;
    if(!m0 || !m0.chordModes || m0.chordModes.length!==3) miss('the user mode does not carry its three chord modes');
    // (1) имена — свои, на обоих языках; кнопки панели
    for(const lg of ['en','ru']) withLang(lg,()=>{ E.set.modes.forEach((x,i)=>{ const rm=m0.chordModes[i]; cases+=2;
      if(chordModeName(rm)!==x.name[lg]) miss(`${lg}: chord mode ${x.id} is named "${chordModeName(rm)}", not "${x.name[lg]}"`);
      if(chordModeHint(rm)!==x.hint[lg]) miss(`${lg}: chord mode ${x.id} hint "${chordModeHint(rm)}", not "${x.hint[lg]}"`); }); });
    if(panelBtns() && hooks.scales){ setScaleId(CM_M); hooks.scales({}); const B=panelBtns(); cases++;
      const want=E.set.modes.map(x=>L(x.name));
      if(JSON.stringify(B)!==JSON.stringify(want)) miss(`the panel shows ${JSON.stringify(B)}, expected ${JSON.stringify(want)}`);
      setScaleId(keepSc); hooks.scales({}); }
    // (2) цена каждого режима — по его переопределениям
    const V=Object.fromEntries(ids.map(id=>[id, scaleView(m0,'T',id)]));
    const major=scaleView(scaleById('major'),'T'), chrom=scaleView(scaleById('chromatic'),'T'), penta=scaleView(scaleById('major-penta'),'T','power');
    cases+=3; if(V.palette.typedChords!=='chrom12') miss('mode "palette" does not take the chrom12 palette'); if(V.thirds.typedChords!==undefined) miss('mode "thirds" carries a palette');
    if(!(V.power.chordRule && V.power.chordRule.kind==='power')) miss('mode "power" does not take the power rule');
    let differs=false;
    for(const oct of [1,2]) for(const sev of [false,true]){
      for(const ti of m0.sel){ cases++; const a=sig(chordNotesAt(ti,oct,V.thirds,sev,null)), b=sig(chordNotesAt(ti,oct,major,sev,null));
        if(a!==b) miss(`thirds ti ${ti} reg ${oct}${sev?' 7th':''}: ${a} vs built-in major ${b}`);
        for(const f of chordFams(V.palette)) for(const ty of f.types){ cases++; const x=sig(chordNotesAt(ti,oct,V.palette,sev,ty.iv)), y=sig(chordNotesAt(ti,oct,chrom,sev,ty.iv));
          if(x!==y) miss(`palette ti ${ti} reg ${oct} ${L(ty.label)}: ${x} vs built-in chromatic ${y}`); } }
      for(const ti of penta.sel){ cases++; const a=sig(chordNotesAt(ti,oct,V.power,sev,null)), b=sig(chordNotesAt(ti,oct,penta,sev,null));
        if(a!==b) miss(`power ti ${ti} reg ${oct}${sev?' 7th':''}: ${a} vs built-in pentatonic power ${b}`);
        if(a!==sig(chordNotesAt(ti,oct,V.thirds,sev,null))) differs=true; } }
    cases++; if(!differs) miss('mode "power" prices exactly like "thirds" — its override has no effect');
    // (3) записанное держит свой режим
    const rec=[];
    for(const id of ids){ setChordMode(CM_M,id); setScaleId(CM_M); const v=CUR(); cases++;
      if(v!==V[id]) miss(`chord mode ${id}: the live view is not the mode's view`);
      const ty0=chordFams(v)[0].types[0].iv, steps=[]; let t=0;
      for(const d of [0,1,3,4]) steps.push({fn:'chOn', a:{deg:d,oct:1,vol:0.6,inst:1,ty: id==='palette' ? ty0 : null}, t:(t+=0.5)});
      const R=probeTake(steps); cases++;
      if(!R.ok){ miss(`chord mode ${id}: the sandboxed take was refused — ${R.why}`); return { cases, total:nBad, differences:bad }; }
      for(const ev of R.events) if(ev.fn==='chOn') rec.push({ ev, cm:id, price:sig(chordNotesAt(ev.a.ti,ev.a.oct,ev.sc,ev.sev,ev.a.ty)) }); }
    for(const id of ids){ setChordMode(CM_M,id);
      for(const r of rec){ cases+=2; if(r.ev.sc.chordMode!==r.cm) miss(`a chord recorded in "${r.cm}" now holds the view of "${r.ev.sc.chordMode}"`);
        const p=sig(chordNotesAt(r.ev.a.ti,r.ev.a.oct,r.ev.sc,r.ev.sev,r.ev.a.ty)); if(p!==r.price) miss(`switching to "${id}" changed a chord recorded in "${r.cm}": ${p} vs ${r.price}`); } }
    console.log(`[scaleprobe chord modes] a user set of ${ids.length} chord modes (${E.set.modes.map(x=>x.name.en).join(' / ')}) · cases ${cases} · differences ${nBad}`);
  } finally { setScaleId(keepSc); setChordModeSel(keepCM); try{ drop(); }catch(e){} }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe chord modes] '+m));
  if(!nBad) console.log('[scaleprobe chord modes] own names, three buttons, each mode prices as its overrides say, recorded chords keep their mode');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F7 — P.checkMerge(): ДВА НАТУРАЛЬНЫХ → ОДИН ЛАД С «СТРОЙ ОТ» И РЕЖИМОМ АККОРДОВ ═══
   ЗАМОРОЖЕННЫЕ ОПОРЫ — записи прежних ладов 'ji-adaptive' и 'ji-fixed' ровно такими, какими их строил сборщик (объекты приложения, из
   снимка tools/scales.before.json до F7). Предустановки слитого лада 'just-intonation': «следует за тоникой + Свободно» против прежнего
   подвижного, «от C + Как на инструменте» против прежнего фиксированного. ЦЕНЫ (===): высота тоники, дрон, единица корня, набор палитры;
   × 12 тоник × A4 415 / 440 / 466.16 × регистры 0..3: соло и бас по ступени (0..12) и по индексу в строе (0..12), каждая нота каждого
   типа палитры (с септаккордом и без) по ступени и по индексу корня (0..11). ПОДПИСИ (на обоих языках, × 12 тоник): ступень, ряд, корень,
   аккорд и его ноты (± септаккорд), центы ступени, слово периода (оба), строка статуса, обе оси редактора (каждый ряд каждого регистра) —
   новые функции на виде предустановки против ЗАМОРОЖЕННЫХ подписей (preF3… и preF4Status) на прежнем виде. ПСЕВДОНИМЫ: прежние id ведут
   на слитый лад и открывают вид своей предустановки. Тоника, A4, лад, «строй от» и выбор режимов возвращаются в finally. */
const PRE_F7_MODES={"ji-adaptive":{"cents":[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27],"chordBuild":"adaptive","chordRule":{"kind":"palette"},"edo":12,"grp":"","id":"ji-adaptive","iv":[0,1,2,3,4,5,6,7,8,9,10,11],"name":{"en":"Just intonation — adaptive (as a choir sings)","ru":"Натуральный строй — подвижный (как поёт хор)"},"root":0,"sel":[0,1,2,3,4,5,6,7,8,9,10,11],"trad":"europe","tuning":"ji12","typedChords":"nat"},"ji-fixed":{"cents":[0,111.73,203.91,315.64,386.31,498.04,590.22,701.96,813.69,884.36,1017.6,1088.27],"chordRule":{"kind":"palette"},"edo":12,"fixedKey":true,"gridChords":true,"grp":"","id":"ji-fixed","iv":[0,1,2,3,4,5,6,7,8,9,10,11],"name":{"en":"Just intonation — fixed (as on a keyboard)","ru":"Натуральный строй — фиксированный (как на клавишных)"},"root":0,"sel":[0,1,2,3,4,5,6,7,8,9,10,11],"trad":"europe","tuning":"ji12","typedChords":"natfix"}};
const PRE_F7_OBJ={};   // объекты прежних ладов — по одному на сеанс (виды памятятся по объекту)
const preF7=id=>PRE_F7_OBJ[id] || (PRE_F7_OBJ[id]=JSON.parse(JSON.stringify(PRE_F7_MODES[id])));
export function checkMerge(){
  const bad=[]; let nBad=0, cases=0, nP=0, nL=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const M=scaleById('just-intonation');
  if(!M){ miss('no mode just-intonation'); return { cases, total:nBad, differences:bad }; }
  const keep={ t:tonic, a:aRef, sc:scaleId, tf:tunedFrom, cm:{...chordModeSel} };
  const J=x=>JSON.stringify(canon(x));
  const eqP=(what,a,b)=>{ cases++; nP++; if(typeof a==='number' ? a!==b : J(a)!==J(b)) miss(`${what}: ${typeof a==='number'?a:J(a).slice(0,140)} now, ${typeof b==='number'?b:J(b).slice(0,140)} before`); };
  const eqL=(what,a,b)=>{ cases++; nL++; if(a!==b) miss(`${what}: "${a}" now, "${b}" before`); };
  const presets=[['follows the tonic + Free','ji-adaptive','T','free'], ['tuned from C + As on the instrument','ji-fixed',0,'instrument']];
  try{
    for(const [name,oldId,tf,cm] of presets){
      const nv=scaleView(M,tf,cm), ov=scaleView(preF7(oldId),'T');
      const types=chordFams(ov).flatMap(f=>f.types.map(x=>x.iv));
      eqP(`${name}: palette`, chordFams(nv), chordFams(ov)); eqP(`${name}: root unit`, chordUnit(nv), chordUnit(ov));
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A of [415,440,466.16]){ setARef(A); const w=`${name} · tonic ${tn} · A4 ${A}`;
          eqP(`${w} · tonic Hz`, tonicFreq(nv), tonicFreq(ov)); eqP(`${w} · drone`, droneDegree(nv), droneDegree(ov));
          for(let o=0;o<4;o++){
            for(let d=0;d<=12;d++){ eqP(`${w} · lead deg ${d} reg ${o}`, leadFreq(d,o,nv), leadFreq(d,o,ov)); eqP(`${w} · bass deg ${d} reg ${o}`, bassFreq(d,o,nv), bassFreq(d,o,ov));
              eqP(`${w} · lead ti ${d} reg ${o}`, leadFreqTi(d,o,nv), leadFreqTi(d,o,ov)); eqP(`${w} · bass ti ${d} reg ${o}`, bassFreqTi(d,o,nv), bassFreqTi(d,o,ov)); }
            for(const sev of [false,true]) for(const ty of types) for(let d=0;d<12;d++){ const tw=`${w} · chord [${ty}]${sev?' 7th':''} reg ${o}`;
              eqP(`${tw} deg ${d}`, chordNotes(d,o,nv,sev,ty).map(x=>[x.f,x.iv]), chordNotes(d,o,ov,sev,ty).map(x=>[x.f,x.iv]));
              eqP(`${tw} ti ${d}`, chordNotesAt(d,o,nv,sev,ty).map(x=>[x.f,x.iv]), chordNotesAt(d,o,ov,sev,ty).map(x=>[x.f,x.iv])); } } }
        setARef(440);
        for(const lg of ['en','ru']) withLang(lg,()=>{ const w=`${name} · tonic ${tn} · ${lg}`;
          for(let d=0;d<=12;d++){ eqL(`${w} · degree ${d}`, RP.noteLbl(d,nv), preF3NoteLbl(d,ov)); eqL(`${w} · row ${d}`, rowLabel(d,nv), preF3RowLabel(d,ov));
            eqL(`${w} · root ${d}`, rootName(d,nv), preF3RootName(d,ov)); eqL(`${w} · cents ${d}`, String(centsOf(d,nv)), String(centsOf(d,ov)));
            for(const sev of [false,true]){ eqL(`${w} · chord ${d}${sev?' 7th':''}`, chordLabel(d,nv,sev), preF3ChordLabel(d,ov,sev)); eqL(`${w} · chord notes ${d}${sev?' 7th':''}`, chordNotesStr(d,nv,sev), preF3ChordNotesStr(d,ov,sev)); } }
          eqL(`${w} · period word`, regWord(nv), preF3RegWord(ov)); eqL(`${w} · period word (full)`, regWordFull(nv), preF3RegWordFull(ov)); eqL(`${w} · status`, tuningStatus(nv), preF4Status({...ov, name:nv.name}));   // F7-починка: имя лада — объявленное изменение; в опору подставлено новое имя, вся прочая строка сверяется как есть
          for(const all of [true,false]){ const aN=RP.axis(nv,all), aO=RP.axis(ov,all); eqL(`${w} · axis ${all?'All':'Mode'} rows per register`, String(aN.rpp), String(aO.rpp));
            for(let r=0;r<aO.rpp*REG_N;r++) eqL(`${w} · axis ${all?'All':'Mode'} row ${r}`, RP.axisLbl(aN,r), preF3AxisLbl(aO,r)); } });
      }
      // псевдоним
      cases+=4; const R=resolveScaleId(oldId);
      if(!R || R.id!=='just-intonation' || R.tunedFrom!==tf || R.chordMode!==cm) miss(`alias ${oldId} resolves to ${JSON.stringify(R)}`);
      if(scaleById(oldId)!==M) miss(`scaleById('${oldId}') is not the merged mode`);
      if(viewOfId(oldId)!==nv) miss(`viewOfId('${oldId}') is not the view of its preset`);
      applyScaleId(oldId); if(CUR()!==nv) miss(`applyScaleId('${oldId}') does not make its preset live`);
    }
    cases+=2; if(SCALES_ALL.some(x=>x.id==='ji-adaptive'||x.id==='ji-fixed')) miss('an old Natural mode is still a mode of its own');
    const eu=menuOf('europe').flatMap(g=>g.items.map(({s})=>s.id)); if(eu.filter(id=>id==='just-intonation').length!==1) miss(`Historical Europe lists: ${eu.join(', ')}`);
    console.log(`[scaleprobe F7] 2 presets × 12 tonics × 3 A4 · prices ${nP} · labels ${nL} · differences ${nBad}`);
  } finally { setTonic(keep.t); setARef(keep.a); setScaleId(keep.sc); setTunedFrom(keep.tf); setChordModeSel(keep.cm); }
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe F7] '+m));
  if(!nBad) console.log('[scaleprobe F7] both presets of Just intonation price and label exactly as the two old modes; the old ids open their presets');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F7-починка — P.checkBare(): ГОЛЫЙ ОБЪЕКТ ЛАДА РАВЕН ВИДУ ЕГО РЕЖИМА АККОРДОВ ПО УМОЛЧАНИЮ ═══
   У каждого лада с режимами аккордов: голый объект (без вида — так его берут демо, опоры пробы и всякий, кто читает лад напрямую) против
   вида с ПЕРВЫМ режимом набора (у лада с «строй от» — от C: голый объект настроен от C). Поля аккордов (сборка, палитра, правило, сетка,
   схема имён ступеней), и × 12 тоник × регистры 0..3: соло и бас по каждой ступени, каждая нота аккорда — каждого типа палитры и без
   типа, с септаккордом и без; подписи ступеней и центы. Сверка ===. Тоника возвращается в finally. */
export function checkBare(){
  const bad=[]; let nBad=0, cases=0, nModes=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const J=x=>JSON.stringify(x), keepT=tonic;
  try{
    for(const s of SCALES){ if(!s.chordModes) continue; nModes++;
      const cm=s.chordModes[0].id, v=scaleView(s, s.tunable ? 0 : 'T', cm), w=`${s.id} (default «${cm}»)`;
      for(const [f,a,b] of [['chord build',chordBuildOf(s),chordBuildOf(v)],['palette',s.typedChords,v.typedChords],['rule',J(s.chordRule),J(v.chordRule)],
                            ['grid',!!s.gridChords,!!v.gridChords]]){ cases++; if(a!==b) miss(`${w}: ${f} — bare ${a}, default view ${b}`); }
      const types=chordFams(v).map(fm=>fm.types.map(x=>x.iv)).flat(), n=s.iv.length;
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        cases++; if(namingOf(s).deg!==namingOf(v).deg) miss(`${w}: degrees named ${namingOf(s).deg} bare, ${namingOf(v).deg} by the default view`);
        for(let d=0;d<=n;d++){ cases+=2; if(RP.noteLbl(d,s)!==RP.noteLbl(d,v)) miss(`${w} tonic ${tn}: degree ${d} label "${RP.noteLbl(d,s)}" bare, "${RP.noteLbl(d,v)}" default`);
          if(centsOf(d,s)!==centsOf(d,v)) miss(`${w} tonic ${tn}: degree ${d} cents ${centsOf(d,s)} bare, ${centsOf(d,v)} default`); }
        for(let o=0;o<4;o++) for(let d=0;d<=n;d++){ cases+=2;
          if(leadFreq(d,o,s)!==leadFreq(d,o,v)) miss(`${w} tonic ${tn}: lead degree ${d} reg ${o}`);
          if(bassFreq(d,o,s)!==bassFreq(d,o,v)) miss(`${w} tonic ${tn}: bass degree ${d} reg ${o}`);
          if(d<n) for(const sev of [false,true]) for(const ty of [null,...types]){ cases++;
            const A=J(chordNotes(d,o,s,sev,ty).map(x=>[x.f,x.iv])), B=J(chordNotes(d,o,v,sev,ty).map(x=>[x.f,x.iv]));
            if(A!==B) miss(`${w} tonic ${tn}: chord ${ty?'['+ty+']':'untyped'}${sev?' 7th':''} degree ${d} reg ${o} — bare ${A.slice(0,90)}, default ${B.slice(0,90)}`); } } }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe bare] modes with chord modes ${nModes} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe bare] '+m));
  if(!nBad) console.log('[scaleprobe bare] every mode with chord modes prices and labels on its own exactly as its default chord mode');
  return { cases, total:nBad, differences:bad };
}

/* ═══ ⛳ F8 — P.checkRootAlone(): НА КОРНЕ, ГДЕ ВЫБРАННОГО ТИПА НЕТ В СТРОЕ, ЗВУЧИТ ОДИН КОРЕНЬ ═══
   (1) ПРАВИЛО по всему пространству: каждый вид (лад × «строй от» × режим аккордов) с палитрой, каждый тип палитры, каждый корень
   (индекс 0..размер строя): scales.chordAtRoot = тип, если chordTypeFits, иначе ровно однонотная форма вида (chordUnit) — по значению; и
   однонотная форма сама всегда «ложится». Ограничение — только у видов, где тест что-то отвергает (сегодня Партч «Как на инструменте»).
   (2) ЗАПИСЬ (нужна песня P.seed): засеянный щипок в Партче «Как на инструменте» (доля 116, тип О на 21/20) — однонотный аккорд в форме вида,
   его единственная нота — на высоте корня (chordPitchHz — высота строя в регистре аккордов, независимо от chordUnit); тот же щипок в
   «Свободно» (доля 124) — целый тип О, три ноты. */
export function checkRootAlone(){
  const bad=[]; let nBad=0, cases=0, song=0, restricted=0, alone=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const J=x=>JSON.stringify(x);
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(m=>m.id) : [undefined])){
    const v=scaleView(s0,tf,cm); if(!v.typedChords) continue;
    const T=tuningOf(v), N=T.equal!=null ? T.equal : T.cents.length, unit=chordUnit(v); let cut=0;
    cases++; if(!chordTypeFits(unit,0,v)) miss(`${viewIdOf(v)}: the one-note form itself does not fit`);
    for(const f of chordFams(v)) for(const ty of f.types) for(let ti=0;ti<=N;ti++){ cases++;
      const fit=chordTypeFits(ty.iv,ti,v), got=chordAtRoot(ty.iv,ti,v), want= fit ? ty.iv : unit;
      if(J(got)!==J(want)) miss(`${viewIdOf(v)} type ${L(ty.label)} root ${ti}: ${J(got)}, expected ${J(want)}`);
      if(!fit){ cut++; alone++; } }
    if(cut) restricted++;
  }
  const evAt=(cm,t)=>events.find(e=>e.fn==='chOn' && e.t===t && e.sc && e.sc.id==='partch-43' && e.sc.chordMode===cm && !e.jam);
  const ei=evAt('instrument',116), ef=evAt('free',124);
  if(!ei || !ef) miss('the seeded F8 pinches are not in the song — run await P.seed({replace:true})');
  else{ song=2; cases+=4;
    const ni=chordNotesAt(ei.a.ti,ei.a.oct,ei.sc,ei.sev,ei.a.ty), root=chordPitchHz(ei.a.ti-ei.sc.root,ei.a.oct,ei.sc);
    if(J(ei.a.ty)!==J(chordUnit(ei.sc))) miss(`As on the instrument, beat 116: stored type ${J(ei.a.ty)}, expected the one-note form ${J(chordUnit(ei.sc))}`);
    if(ni.length!==1 || ni[0].f!==root) miss(`As on the instrument, beat 116: sounds ${J(ni.map(x=>x.f))}, expected the root alone at ${root} Hz`);
    const nf=chordNotesAt(ef.a.ti,ef.a.oct,ef.sc,ef.sev,ef.a.ty), O=chordFams(ef.sc)[0].types[0].iv;
    if(J(ef.a.ty)!==J(O)) miss(`Free, beat 124: stored type ${J(ef.a.ty)}, expected the whole type ${J(O)}`);
    if(nf.length!==O.length) miss(`Free, beat 124: sounds ${nf.length} notes, expected ${O.length}`); }
  console.log(`[scaleprobe F8] views with a palette checked · views that restrict ${restricted} · root-alone cases ${alone} · seeded pinches ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe F8] '+m));
  if(!nBad) console.log('[scaleprobe F8] a type that does not fit sounds the root alone, by the one rule, and is stored as a one-note chord; Free sounds the whole type');
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ ⛳ СТРАЖ КОНСОЛИ — ОДНА ПРОБА ЗА РАЗ (слайс AUTO-PROBE) ═══
   window.P (адрес с ?probe — main.js) — НЕ сам модуль, а api(): каждая функция модуля обёрнута замком. Пока идёт любая проба (P.seed
   тоже), другой вызов P.* ОТКАЗЫВАЕТ словами и ничего не делает. Найдено у пользователя: P.quick, набранный до конца P.seed, прогнал
   строки на недостроенной песне (секция соло посева не прошла, замороженного баса не было) — 20 расхождений, ни одно не про код.
   Внутри модуля пробы зовут друг друга напрямую (P.all → checkSwap …) — мимо замка, как и прежде. Отказ — объект { refused:true, why }
   (у P.all/P.quick ещё pass:false), строка в консоль. ⚠️ Прямой импорт модуля (const P = await import(...)) — без стража. */
let LOCK=null;
const lockWhy=n=> LOCK==='seed' ? `P.seed is still running — wait for 'Now run P.all()' before P.${n}()`
                                : `P.${LOCK} is still running — wait for its result before P.${n}()`;
let API=null;
export function api(){
  if(API) return API;
  API={};
  for(const [n,v] of Object.entries(SELF)){
    if(typeof v!=='function' || n==='api'){ API[n]=v; continue; }
    API[n]=(...args)=>{
      if(LOCK){ const why=lockWhy(n); console.warn('[probe] '+why); return n==='all'||n==='quick' ? { pass:false, refused:true, why } : { refused:true, why }; }
      LOCK=n; let r;
      try{ r=v(...args); }catch(e){ LOCK=null; throw e; }
      if(r && typeof r.then==='function') return r.finally(()=>{ LOCK=null; });
      LOCK=null; return r;
    };
  }
  return API;
}
/* Проверка стража (строка «write path (funnels)»): пока замок взят, обёрнутый P.quick отказывает и не прогоняет ни строки; КОНТРОЛЬ — с
   отпущенным замком та же обёртка у дешёвой функции (material) работает (страж не отказывает всем подряд). Замок, взятый извне (P.all),
   возвращается как был. */
function guardSelfTest(miss){
  const held=LOCK, A=api(); let cases=0;
  try{
    LOCK=held||'checkWrite'; cases++;
    const r=A.quick();
    if(!(r && r.refused && /still running/.test(r.why||''))) miss('console guard: P.quick() started while another probe held the lock');
    LOCK=null; cases++;
    const m=A.material();
    if(!m || m.refused || typeof m.ok!=='boolean') miss('CONTROL (console guard): with no probe running, the guarded P.material() was refused or gave nothing — the guard refuses everything');
    if(LOCK!==null) miss('console guard: a finished call did not release the lock');
  } finally { LOCK=held; }
  return cases;
}
