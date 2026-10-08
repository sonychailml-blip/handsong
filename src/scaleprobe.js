/* ⛳ ПРОБА УНИВЕРСАЛЬНОЙ МОДЕЛИ СТРОЯ — консольный инструмент (как ухо-проба render.js: R.aud/R.live), НЕ часть приложения.
   Никто его не импортирует: модуль грузится только руками из консоли браузера, при открытом приложении:
     const P = await import(new URL('src/scaleprobe.js', location.href).href);
     P.all()            // ВСЁ РАЗОМ: каждая проба по порядку, ОДНА сводная таблица (проба, случаи, материал песни, расхождения, время) и вердикт;
                        //   песенные проверки НЕ засчитываются на пустой или бедной песне — «song: not enough material» и чего не хватает
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
   T0: записи строёв и ладов — данные. Проверяется, что выборка каждого лада, ВЫВЕДЕННАЯ из его же чисел (scales.modeDerive),
   даёт КАЖДОЙ ступени (и верхней тонике) те же центы, что сегодня, а у равных строёв — те же шаги и тот же показ центов.
   T2: ВИД (строй, лад, якорь) — тождество видов (один объект на лад и якорь) и та же высота через вид, что через сам лад (у Пифагора —
   через прежний вариант {...лад, tunedFrom}), === по тому же пространству, что T1.
   T1: ЧАСТОТЫ. Новая функция высоты (scales.pitchHz под leadFreq/bassFreq/chordNotes/tonicFreq/centsOf) против ПРЕЖНИХ тел
   (scales.legacy*) — по всем ладам (у Пифагора — каждый «строй от»), ролям (соло, бас, аккорды всех типов, дрон), ступеням, регистрам,
   всем 12 тоникам и нескольким эталонам A4, плюс показ центов. Сравнение === (у аккордов — каждая нота: частота И интервал).
   ⛔ Ничего не сохраняет и не играет. ⚠️ T1 на время прогона ПЕРЕСТАВЛЯЕТ живые тонику и эталон A4 (через их сеттеры — иначе их не
   перебрать) и ВОЗВРАЩАЕТ их в finally; прогон синхронный, поэтому ни кадр, ни планировщик между ними не вклиниваются. Звучащие
   голоса частоту сами не перечитывают — их не задевает. */
import { SCALES, TUNINGS, scaleView, chordFams, chordUnit, droneDegree, tuningIndexOf, leadFreqTi, bassFreqTi, chordNotesAt, REG_N, modeSlotOfTi, viewIdOf, isTert, chordLabel, chordNotesStr,
         leadFreq, bassFreq, chordNotes, chordRowFreq, tonicFreq, centsOf, ruleChordSteps,
         CUR, IVX, NOTE_NAMES, stepName, qual, SEV, ROMAN, fifthStep, periodOf, baseF, keyOf, cFix } from './scales.js';   // T4c-2: последняя строка — то, что читают ЗАМОРОЖЕННЫЕ ОПОРЫ (ниже)
import { tonic, aRef, setTonic, setARef, scaleIdx, tunedFrom, seventh, setScaleIdx, setTunedFrom, setSeventh } from './state.js';   // P.seed: лад, «строй от» и септаккорд сценария — и их возврат
import { rollRowsProbe as RP } from './draw.js';   // пути рядов редактора без открытого редактора (и частоты рядов для замороженных рядов по ступени)
import { events, evHz, evReg, segChordNotes, probeTake, backingEvent, songSegs, chaseFor, chaseNote, hlOf, laneRoleOf, laneTimbreOf, viewAudit,
         seedTake, clearRec, editOpen, editClose, editSetLayer, editIsOpen, editDeleteChordNote, editMoveChordNote, editMoveSeg, chordMoveTy, editInsertBass, editInsertChord, loadJam, braceTap, setRegionOn,
         onLoop, loop, songBeats, setLoopMetre } from './recorder.js';   // T4c-2: песенная строка (P.checkSong) — цена, реестр, подсветка, сегменты, догонялка, распад

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   ⛳ ЗАМОРОЖЕННЫЕ ОПОРЫ (T4c-2) — ПРЕЖНИЕ ТЕЛА ФУНКЦИЙ ВЫСОТЫ, АККОРДОВ, ПОДПИСЕЙ И РЯДОВ, СЛОВО В СЛОВО.
   Жили в приложении (scales.legacy*, scales.chordSteps по tag, scales.fixedSlot, draw.legacyRollSeg*) и читались ТОЛЬКО пробой; в T4c-2
   переехали СЮДА, чтобы в приложении прежнего кода не осталось, а защита прогонов — осталась. ⛔ Это ЭТАЛОН, а не код приложения: их не
   правят вслед за приложением — новая цена обязана совпасть с ними (===), или расхождение должно быть названо и решено пользователем.
   Читают живую тонику и A4 (как и прежде), якорь и ключ — через scales.keyOf/cFix (одна опора A4, правило #17).
   Изменено при переезде ровно три вещи: снят `export`, chordSteps переименована в legacyChordSteps (имя в приложении свободно), и в опоре
   стопки снято условие временного R.powerOld (переключатель удалён — стопка насовсем).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const stepFor=(edo,ratio)=>Math.round(edo*Math.log2(ratio)); // шаг, ближайший к чистому интервалу ratio (копия scales.stepFor — часть эталона)
/* ⚠️ T1: три комментария ниже и fixedSlot описывают ПРЕЖНИЕ ветви высоты — сегодня это legacyLeadFreq/legacyBassFreq/legacyChordNotes/
   legacyCentsOf (только для пробы); оборачивание ступени и перенос в регистр новая функция повторяет тем же законом. */
/* Модуло-страховка: ступень вне лада (перенос фразы в лад покороче, §3.7) заворачивается
   с переносом октавы — сохраняет контур, не роняет частоту в NaN. При ступени внутри лада
   это тождество (i=deg, o=oct). CLAUDE.md: тихого NaN быть не должно. */
/* cx — ОВЕРЛЕЙ ЦЕНТОВ: если у лада есть s.cents (неравномерный строй), высоту ступени
   в пределах октавы задаёт он (2^(центы/1200)), а не равный шаг edo. ivx остаётся
   СТРУКТУРНЫМ (число ступеней, перенос октавы, оборачивание i) — период по-прежнему
   октава, регистр Math.pow(2,o) не трогаем. cents.length===iv.length, поэтому дописанные
   верхушки (edo→структура, 1200→центы) дают cx и ivx одинаковой длины. Нет s.cents —
   выражение байт-в-байт прежнее. */
/* fixedKey: сетка приколочена к ЯКОРЮ (anchorOf: C у пяти исторических темпераций, у Пифагора — его «строй от», P3), ТОНИКА =
   КЛЮЧ (индекс в сетку, не множитель). Ступень i звучит на АБСОЛЮТНОЙ позиции сетки (keyOf+шаг; при якоре C — tonic+шаг): slot — нота в октаве, carry — перенос октавы (напр. квинта
   от B уходит в следующую октаву). Якорь cFix (та же опора aRef). o — регистр (палец), carry
   складывается с ним. При тонике C (0) — байт-в-байт прежняя cents-ветка. */
function fixedSlot(s,step){ const L=s.cents.length, abs=keyOf(s)+step; return {slot:((abs%L)+L)%L, carry:Math.floor(abs/L)}; }
/* КОНТЕКСТНАЯ ЛОГИКА АККОРДОВ:
   · 7-ступенчатые лады (диатоника, венгерский, макамы) — наслоение терций:
     индексы i, i+2, i+4 (+ i+6 для септаккордов), % длины массива с переносом октавы;
   · пентатоника / блюз — терции дают кашу → пауэр-аккорды (I + V + октава); хроматика сюда не доходит: у неё палитра (typedChords), и
     живой аккорд всегда несёт тип (правило T6a — 'palette');
   · 19/31-TET — квинту ищем математически: round(N·log2(3/2)) шагов ≈ 700 центов,
     получаются открытые микротональные аккорды без диссонирующих кластеров. */
/* s (лад) и sev (септаккорд?) — параметры со значениями по умолчанию из живого состояния:
   петля передаёт СВОЙ замороженный лад/септаккорд (§3.4), живой ввод — берёт текущие. */
function legacyChordSteps(deg, s=CUR(), sev=seventh, ty=null){
  const n=s.iv.length;
  if (ty){                                   // типизированный аккорд: интервалы от корня, лад не диктует
    const r=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
    return ty.map(iv=>r+iv);
  }
  if (isTert(s)){
    const ks=sev?[0,2,4,6]:[0,2,4];
    return ks.map(k=>{const j=deg+k; return s.iv[j%n]+s.edo*Math.floor(j/n);});
  }
  const r=s.iv[deg%n]+s.edo*Math.floor(deg/n);
  if (s.tag==='edo'){
    /* Мезотоника (19/31-TET): аккорд строим ПО ИНТЕРВАЛУ, не по индексу.
       Отношения заданы на ладе (chord/chord7); 31-TET септаккорд = 4:5:6:7. */
    const rs=sev?s.chordRule.seventh:s.chordRule.triad;   // T6a: отношения переехали в правило аккордов лада (те же массивы)
    return rs.map(ra=>r+stepFor(s.edo,ra));
  }
  return [r, r+fifthStep(s.edo), r+s.edo];   // пентатоника/блюз — пауэр-аккорд как раньше (хроматика с палитрой сюда не доходит)
}
/* ═══ LEGACY (слайс T1) — ПРЕЖНИЕ тела функций высоты, СЛОВО В СЛОВО, под другими именами. ═══
   ⛔ Их читает ТОЛЬКО проба src/scaleprobe.js (сравнение === с новыми). В приложении их не зовёт никто — и звать нельзя: высота
   приложения — одна функция pitchHz. Удаляются отдельным слайсом после того, как проба покажет ноль и ухо подтвердит. */
/* LEGACY (T6c) — прежние подписи аккорда ПО TAG, слово в слово. ⛔ Читает ТОЛЬКО проба (P.checkLabels); уходят в T4c. */
function legacyChordLabel(deg,s=CUR(),sev=seventh){
  const n=s.iv.length, d=deg%n;
  if (!isTert(s)){
    return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12]+'5' : 'ст'+s.iv[d]+'·5';
  }
  const st=legacyChordSteps(deg,s,sev), r=st[0];
  if (s.edo===12){
    const root=NOTE_NAMES[(((tonic+r)%12)+12)%12];
    let q=qual(st[1]-r, st[2]-r);
    if (q==null) return root+'?';
    if (sev){ const sv=st[3]-r; q=SEV[q+'|'+sv] ?? (q+'⁷'); }
    return root+q;
  }
  return ROMAN[d]+(sev?'⁷':'');         // макам: римская ступень
}
const legacyChordNotesStr=(deg,s=CUR(),sev=seventh)=>legacyChordSteps(deg,s,sev).map(st=>stepName(st,s)).join('·');
/* LEGACY-ОПОРА (слайс «стопка»): прежняя цена (legacyChordNotes), а у аккорда без типа в ладу stack — та же прежняя арифметика
   СТОПКИ ЧЕРЕЗ СТУПЕНЬ, что у терцовых ладов (копия вида с tag 'dia': chordSteps стопкой). При R.powerOld — прежний пауэр-аккорд, как и
   новый путь. ⛔ Читают ТОЛЬКО проба и прежний путь рядов редактора (draw.legacyRollSegNotes); уходит в T4c. */
const STACK_REF=new WeakMap();
function legacyChordNotesRef(deg,oct, s=CUR(), sev=seventh, ty=null){
  if (!ty && s.chordRule && s.chordRule.kind==='stack'){
    let r=STACK_REF.get(s); if(!r){ r={...s, tag:'dia'}; STACK_REF.set(s,r); }
    return legacyChordNotes(deg,oct,r,sev,null);
  }
  return legacyChordNotes(deg,oct,s,sev,ty);
}
const legacyTonicFreq=(s=CUR())=> s.fixedKey ? cFix(s)*Math.pow(2,s.cents[keyOf(s)]/1200) : baseF();
function legacyLeadFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length, P=periodOf(s);
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,ivx[i]); return cFix(s)*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
  const cx=s.cents?s.cents.concat([1200]):null;
  const r=cx?Math.pow(2,cx[i]/1200):Math.pow(P,ivx[i]/s.edo);   // равный шаг — в ПЕРИОДЕ лада (P^(шаг/edo)); cents-ветка октавная (2/1200), её не трогаем
  return baseF()*Math.pow(P,o)*r; }                             // регистр — на ПЕРИОД (BP: тритава 3^oct); P=2 у прочих — байт-в-байт
function legacyBassFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length, P=periodOf(s); // бас на 2 октавы ниже соло (baseF/4 — константа-пол, не период)
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,ivx[i]); return cFix(s)/4*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
  const cx=s.cents?s.cents.concat([1200]):null;
  const r=cx?Math.pow(2,cx[i]/1200):Math.pow(P,ivx[i]/s.edo);
  return baseF()/4*Math.pow(P,o)*r; }
function legacyChordNotes(deg,oct, s=CUR(), sev=seventh, ty=null){ // база аккордов на октаву ниже соло
  if (s.cents && ty && s.gridChords){
    /* ФИКСИРОВАННЫЙ cents-строй (Натуральный клавесин): ноты аккорда берутся ИЗ СЕТКИ, а не строятся
       чистым отношением от корня. ty здесь — ЦЕЛЫЕ ПОЛУТОНОВЫЕ СМЕЩЕНИЯ (как chrom12), а не ratio:
       нота = ступень (корень+off) из cents-сетки, с переносом октавы для off≥12 (add9=14, 13=21).
       Отсюда часть аккордов ЧИСТЫЕ (корни 0,1,3,5,7,8 у мажора), а часть — ВОЛК (квинта −21.5¢ на
       корнях 2,10; терции +41¢ на 4,9,11): ровно проблема фиксированной чистой интонации, ради которой
       и придумали темперации. Гейт СТОИТ ПЕРВЫМ — до pure-ratio ветки; без gridChords лады (Партч/
       подвижный Натуральный) идут прежним путём ниже, байт-в-байт; Пифагор с P2 дуги «СТРОЙ ОТ» — ЗДЕСЬ, из своей сетки. off=0 даёт корень 1-в-1.
       fixedKey: индекс включает ТОНИКУ (КЛЮЧ) — корень и голоса из АБСОЛЮТНОЙ позиции сетки
       (tonic+deg+off), поэтому окраска аккорда зависит от тональности (C-мажор мягок, F#-мажор резок);
       якорь cFix (та же опора). При тонике C (0) — байт-в-байт прежняя формула. P1: ключ — keyOf(s), якорь — cFix(s) (при якоре C —
       ровно прежние tonic и высота C). P3: у Пифагора якорь — его «строй от» (вариант лада, scaleView): «следует за тоникой» даёт
       keyOf=0 и cFix=baseF() — аккорды каждой тональности одинаковы; закреплённый якорь даёт краски тональностей. */
    const L=s.cents.length, key=s.fixedKey?keyOf(s):0, anchor=s.fixedKey?cFix(s):baseF();
    const d=key+((deg%L)+L)%L, o=oct+Math.floor(deg/L);
    return ty.map(off=>{ const g=d+off, gi=((g%L)+L)%L, carry=Math.floor(g/L);
      return { f: anchor/2*Math.pow(2,o+carry)*Math.pow(2,s.cents[gi]/1200), iv:off }; });
  }
  if (s.cents && ty){
    /* Cents-строй + типизированный аккорд (Партч): интервалы — ЧИСТЫЕ ОТНОШЕНИЯ от корня, не
       шаги edo. Корень = высота ступени из cents-оверлея (как в leadFreq), аккордовая нота =
       корень * ratio НАПРЯМУЮ — без 2^(шаг/edo), который на 43 неравных ступенях врёт. Расширения
       выше октавы (ratio>2, напр. 36/11) множатся как есть — аутентичный Партч. Ветка только для
       cents-лада С типизацией (Партч, подвижный Натуральный); прочие лады без s.cents ниже.
       ⚠️ Ветка fixedKey внутри (корень на фиксированной сетке, аккорд чистыми отношениями над ним) служила ПИФАГОРУ до P2 дуги
       «СТРОЙ ОТ»; с P2 его аккорды — из собственной сетки (ветка выше), и сегодня fixedKey-лада с отношениями нет — ветка
       дремлет, оставлена ради формулы корня (через keyOf/cFix). Гейт на s.fixedKey, НЕ на s.cents: подвижный Натуральный
       (nat, без fixedKey) остаётся байт-в-байт. */
    const n=s.iv.length, d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    let rootF;
    if(s.fixedKey){ const {slot,carry}=fixedSlot(s,d); rootF=cFix(s)/2*Math.pow(2,o+carry)*Math.pow(2,s.cents[slot]/1200); }
    else rootF=baseF()/2*Math.pow(2,o)*Math.pow(2,s.cents[d]/1200);   // подвижный Натуральный: корень из cents-оверлея над живой тоникой, как было
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  const P=periodOf(s);
  if (P!==2 && ty){
    /* Неоктавный ПЕРИОД-равный лад + типизированный аккорд (Болен–Пирс): корень — равным шагом
       В ПЕРИОДЕ (P^(iv/edo), как leadFreq), аккордовая нота = корень*ratio НАПРЯМУЮ — интервалы
       подгруппы 3.5.7 суть ЧИСТЫЕ ОТНОШЕНИЯ, а не шаги edo (chordSteps их бы принял за шаги —
       мимо строя). Регистр — на ПЕРИОД: P^o = тритава (не 2^o). ratio>P (тетрада 3:5:7:9 → 3)
       множится как есть — ровно тритавой выше, аутентично BP. Ветка ДРЕМЛЕТ у всех прежних ладов:
       period нет → P===2 → сюда не входят; nonoct-лад без ty (не должно быть) уходит вниз. */
    const n=s.iv.length, d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
    const rootF=baseF()/2*Math.pow(P,o)*Math.pow(P,s.iv[d]/s.edo);
    return ty.map(ra=>({ f:rootF*ra, iv:ra }));
  }
  // равная ветка: регистр и шаг — в ПЕРИОДЕ лада (P=2 у всех аккордовых ладов ⇒ байт-в-байт)
  /* iv — шаг ноты ОТ КОРНЯ (у типизированного — сам интервал типа; у стопки терций / пауэр-аккорда — разность с шагом корня, тем же
     выражением корня, что у chordSteps): с ним аккорд из одной ноты [iv] сыграет ровно эту частоту (типизированная ветка chordSteps). */
  const n=s.iv.length, r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
  return legacyChordSteps(deg,s,sev,ty).map(st=>({ f: baseF()/2*Math.pow(P,oct)*Math.pow(P,st/s.edo), iv: st-r0 })); }
const legacyCentsOf=(deg,s=CUR())=>{
  if(s.fixedKey){ const {slot,carry}=fixedSlot(s,deg); return Math.round((s.cents[slot]+1200*carry-s.cents[keyOf(s)])*10)/10; }   // ДЕСЯТЫЕ: разница 386.3 vs 407.8 — и есть предмет; целые прятали бы точность
  if(s.cents){ const cx=s.cents.concat([1200]); return cx[deg%cx.length]%1200; }
  const pc=1200*Math.log2(periodOf(s));   // центы ПЕРИОДА: октава 1200 (P=2, байт-в-байт), тритава ≈1901.955 (BP) — честный шаг ~146.3¢
  return Math.round(IVX(s)[deg]*pc/s.edo)%pc; };

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

/* ⛳ ВСЁ: данные (T0), частоты и центы (T1), вид (T2). → { data, pitch, view } — у каждого поле mismatches. */
export function check(){ const data=checkData(), pitch=checkPitch(), view=checkView(); return { data, pitch, view }; }

/* T0: строи, лады и выведенные выборки. → { tunings, modes, checks, mismatches:[строки] } и печать сводки. */
export function checkData(){
  const bad=[]; let checks=0;
  const ok=(cond,msg)=>{ checks++; if(!cond) bad.push(msg); return cond; };
  // ---- строи ----
  const tids=Object.keys(TUNINGS);
  for(const id of tids){
    const T=TUNINGS[id];
    ok(T.id===id, `tuning ${id}: record id is "${T.id}"`);
    ok(T.period>1, `tuning ${id}: period ${T.period} is not > 1`);
    if(T.equal!=null){
      ok(Number.isInteger(T.equal)&&T.equal>0, `tuning ${id}: equal count ${T.equal} is not a positive integer`);
      ok(T.cents==null, `tuning ${id}: has both an equal count and a cents table`);
    }else{
      const C=T.cents;
      if(ok(Array.isArray(C)&&C.length>0, `tuning ${id}: neither an equal count nor a cents table`)){
        ok(C[0]===0, `tuning ${id}: first pitch is ${C[0]}, not 0`);
        for(let i=1;i<C.length;i++) ok(C[i]>C[i-1], `tuning ${id}: pitch ${i} (${C[i]}) is not above pitch ${i-1} (${C[i-1]})`);
        ok(C[C.length-1]<1200*Math.log2(T.period), `tuning ${id}: last pitch ${C[C.length-1]} is not inside the period`);
      }
    }
  }
  // ---- лады ----
  const seen=new Map(), parented=[];
  SCALES.forEach((s,idx)=>{
    const tag=`mode #${idx} ${s.id}`;
    if(ok(typeof s.id==='string'&&s.id.length>0, `mode #${idx}: no id`)){
      ok(!seen.has(s.id), `${tag}: id also used by mode #${seen.get(s.id)}`); seen.set(s.id,idx);
    }
    const T=TUNINGS[s.tuning];
    if(!ok(!!T, `${tag}: tuning "${s.tuning}" does not exist`)) return;
    if(!ok(Array.isArray(s.sel)&&Number.isInteger(s.root), `${tag}: selection was not derived (the scale's numbers are not found in tuning ${s.tuning})`)) return;
    const n=s.iv.length;
    ok(s.sel.length===n, `${tag}: selection has ${s.sel.length} pitches, the mode has ${n} degrees`);
    if(T.equal!=null){
      /* РАВНЫЙ строй: ступени лада уже записаны в шагах строя — выборка обязана совпасть со ступенями побитно; показ центов — тем же
         выражением, что centsOf, но из ЗАПИСИ строя (число шагов и период), а не из полей лада. */
      const E=T.equal, pc=1200*Math.log2(T.period);
      ok(E===s.edo, `${tag}: tuning has ${E} steps, the mode says edo ${s.edo}`);
      ok(T.period===(s.period||2), `${tag}: tuning period ${T.period}, the mode's period ${s.period||2}`);
      ok(s.root===0, `${tag}: root ${s.root} on an equal tuning (expected 0)`);
      for(let i=0;i<=n;i++){
        const k = i<n ? s.sel[i] : s.root+E;                      // i = n — верхняя тоника (дубль), как в IVX
        const want = i<n ? s.iv[i] : s.edo;
        ok(k===want, `${tag}: degree ${i} → tuning step ${k}, today step ${want}`);
        const cts=Math.round(k*pc/E)%pc;
        ok(cts===legacyCentsOf(i,s), `${tag}: degree ${i} cents readout ${cts} from the tuning, ${legacyCentsOf(i,s)} today`);   // «сегодня» — прежнее тело (с T1 centsOf уже новая)
      }
    }else{
      /* ТАБЛИЦА: центы ступени из строя = T[k mod N] + период·⌊k/N⌋ − T[root] — обязаны быть ТЕМ ЖЕ числом, что центы ступени лада
         сегодня (с дописанной верхушкой 1200, как в leadFreq/bassFreq). */
      const C=T.cents, N=C.length, cx=s.cents.concat([1200]);
      ok(T.period===2 && !s.period, `${tag}: a cents mode on a non-octave tuning`);
      for(let i=0;i<=n;i++){
        const k = i<n ? s.sel[i] : s.root+N;
        const got = C[k%N] + 1200*Math.floor(k/N) - C[s.root];
        ok(got===cx[i], `${tag}: degree ${i} → tuning pitch ${k} = ${got}¢, today ${cx[i]}¢`);
      }
      if(n<N || s.root!==0) parented.push({ mode:s.id, tuning:s.tuning, root:s.root, sel:s.sel.join(' '), cents:s.cents.join(' ') });
    }
  });
  // ---- сводка ----
  console.log(`[scaleprobe T0] tunings ${tids.length} · modes ${SCALES.length} · checks ${checks} · mismatches ${bad.length}`);
  if(bad.length) bad.forEach(m=>console.warn('[scaleprobe T0] '+m));
  else console.log('[scaleprobe T0] every degree of every mode reproduces today\'s cents exactly');
  if(parented.length){ console.log('[scaleprobe T0] modes that select from a larger tuning (or start off its index 0):'); console.table(parented); }
  return { tunings:tids.length, modes:SCALES.length, checks, mismatches:bad };
}

/* ═══ ОБЩИЙ ПРОГОН: две реализации цены по всему пространству ═══
   Пространство: каждый вид (у tunable — 13: 'T' и 0..11) × 12 тоник × A4_SET ×
     соло и бас: ступень 0..2n+1 (дубль и оборачивание в следующий период) × регистр 0..3;
     аккорды: ступень 0..n+1 × регистр 0..3 × тип: без типа (септаккорд выкл/вкл), единица корня (chordUnit), каждый тип набора лада
       (chordFams — у нетипизированного лада это запасной chrom12: так проверяются и однонотные/распавшиеся типы в шагах);
     дрон: tonicFreq; показ центов: ступень 0..n.
   A и B — две реализации { lead, bass, chord, tonic, cents }; pick(лад, якорь) → [объект для A, объект для B]. Каждое несовпадение —
   строка со всеми входами; печатаем первые PRINT_MAX, в ответе держим до KEEP_MAX.
   ⚠️ На время прогона ПЕРЕСТАВЛЯЕТ живые тонику и A4 (сеттерами) и ВОЗВРАЩАЕТ их в finally; прогон синхронный. */
const A4_SET=[415, 440, 466.16];   // барочный, стандарт и некруглый — прогон и так в десятки миллионов сравнений (несколько секунд)
const PRINT_MAX=200, KEEP_MAX=10000;
const NEW={ lead:leadFreq, bass:bassFreq, chord:chordNotes, tonic:tonicFreq, cents:centsOf };
/* ⛳ ПОКАЗ ЦЕНТОВ С СЛАЙСА «ДРОН И ЦЕНТЫ» — ОДНО ПРАВИЛО: ЦЕЛЫЕ ЦЕНТЫ, точное значение округляется ОДИН раз. Ожидание:
     равные строи и подвижные таблицы — Math.round(прежнего показа): прежний показ там и есть точное значение (у равных — уже целое;
       у неоктавных верхняя тоника давала 0.045 → 0);
     фиксированные строи — Math.round(ТОЧНОГО), а не прежних десятых: двойное округление (десятые, потом целые) в 17 из 936 случаев
       даёт на единицу больше (мезотон: 579.47 → 579.5 → 580 вместо 579). Точное значение считает здесь НЕЗАВИСИМЫЙ оракул по данным
       лада (прежняя формула fixedKey без умножения на 10): якорь из «строй от» вида, ключ = тоника − якорь.
   Частоты — по-прежнему строгим === с прежними телами. */
const fixedExact=(d,v)=>{ const A= v.tunedFrom==='T' ? tonic : (v.tunedFrom==null ? 0 : v.tunedFrom), key=tonic-A+(A>tonic?12:0);
  const C=v.cents, L=C.length, abs=key+d, slot=((abs%L)+L)%L, carry=Math.floor(abs/L);
  return C[slot]+1200*carry-C[key]; };
const OLD={ lead:legacyLeadFreq, bass:legacyBassFreq, chord:legacyChordNotesRef, tonic:legacyTonicFreq,   // «стопка»: у лада stack опора — прежняя арифметика стопки (scales.legacyChordNotesRef)
            cents:(d,v)=> v.fixedKey ? Math.round(fixedExact(d,v)) : Math.round(legacyCentsOf(d,v)) };
const allViews=()=>{ const out=[];
  for(const s of SCALES){ if(s.tunable){ out.push([s,'T']); for(let pc=0;pc<12;pc++) out.push([s,pc]); } else out.push([s,'T']); }
  return out; };
function sweep(stage, what, A, B, pick, opt={}){
  const melMax=opt.melMax||(n=>2*n+1), chMax=opt.chMax||(n=>n+1);   // T4b1: прогон по индексу в строе — ступени, которые путь записи может положить (0..n)
  const t0=performance.now(), keepT=tonic, keepA=aRef;
  const bad=[]; let cases=0, nBad=0;
  const miss=msg=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(msg); };
  try{
    for(const [s,tf] of allViews()){
      const [va,vb]=pick(s,tf), n=s.iv.length, id=s.id+(s.tunable?`[from ${tf}]`:'');
      const tys=[[null,false],[null,true],[chordUnit(s),false]];
      for(const f of chordFams(s)) for(const ty of f.types) tys.push([ty.iv,false]);
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A4 of A4_SET){ setARef(A4);
          const at=`${id} tonic ${tn} A4 ${A4}`;
          cases++; { const a=A.tonic(va), b=B.tonic(vb); if(a!==b) miss(`${at} drone: ${what[0]} ${a} ${what[1]} ${b}`); }
          for(let d=0;d<=n;d++){ cases++; const a=A.cents(d,va), b=B.cents(d,vb); if(a!==b) miss(`${at} cents deg ${d}: ${what[0]} ${a} ${what[1]} ${b}`); }
          for(let o=0;o<4;o++){
            for(let d=0;d<=melMax(n);d++){
              cases++; { const a=A.lead(d,o,va), b=B.lead(d,o,vb); if(a!==b) miss(`${at} melody deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
              cases++; { const a=A.bass(d,o,va), b=B.bass(d,o,vb); if(a!==b) miss(`${at} bass deg ${d} reg ${o}: ${what[0]} ${a} ${what[1]} ${b}`); }
            }
            for(let d=0;d<=chMax(n);d++) for(const [ty,sev] of tys){
              if(!ty && va.chordRule && va.chordRule.kind==='none') continue;   // T6b: «аккорда нет» — смена определения, её проверяет P.checkUntyped
              const X=A.chord(d,o,va,sev,ty), Y=B.chord(d,o,vb,sev,ty);
              const tag=()=>`${at} chord deg ${d} reg ${o} type ${ty?'['+ty.join(',')+']':'none'}${sev?' 7th':''}`;
              if(X.length!==Y.length){ cases++; miss(`${tag()}: ${X.length} notes ${what[0]}, ${Y.length} ${what[1]}`); continue; }
              for(let i=0;i<X.length;i++){ cases++;
                if(X[i].f!==Y[i].f||X[i].iv!==Y[i].iv) miss(`${tag()} note ${i}: ${what[0]} ${X[i].f} (iv ${X[i].iv}) ${what[1]} ${Y[i].f} (iv ${Y[i].iv})`); }
            }
          }
        }
      }
    }
  } finally { setTonic(keepT); setARef(keepA); }
  const ms=Math.round(performance.now()-t0);
  console.log(`[scaleprobe ${stage}] cases ${cases} · mismatches ${nBad} · ${ms} ms (frequencies: melody, bass, every chord note, drone; cents readout)`);
  if(nBad){ bad.slice(0,PRINT_MAX).forEach(m=>console.warn(`[scaleprobe ${stage}] `+m)); if(nBad>PRINT_MAX) console.warn(`[scaleprobe ${stage}] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`); }
  return { cases, mismatches:bad, total:nBad, ms };
}
/* ═══ T1: НОВАЯ ФУНКЦИЯ ВЫСОТЫ ПРОТИВ ПРЕЖНИХ ТЕЛ (обе — на одном и том же виде); центы — против целого округления точного (см. OLD) ═══ */
export function checkPitch(){
  const r=sweep('T1',['new','old'],NEW,OLD,(s,tf)=>{ const v=scaleView(s,tf); return [v,v]; });
  if(!r.total) console.log('[scaleprobe T1] every frequency is bit-identical to the old functions, and every cents readout is the whole-cent rounding of the exact value');
  return r;
}
/* ═══ T2: ВИД (строй, лад, якорь) ═══
   1) ТОЖДЕСТВО: один и тот же лад с тем же якорем — ОДИН объект (дважды, и вид от вида); у лада без выбора якоря — один вид на любой
      «строй от»; у вида — mode (сам лад), tuningRec (его строй), anchor { policy, from }; у tunable — tunedFrom, у прочих его нет;
      поля лада (iv, edo, cents, sel, root …) — те же ссылки, что у лада.
   2) ЦЕНА: через вид — ровно то же, что через сам лад (у tunable — через прежний вариант P3 {...лад, tunedFrom}), новой функцией,
      === по пространству T1. */
export function checkView(){
  const bad=[]; let checks=0;
  const ok=(c,m)=>{ checks++; if(!c) bad.push(m); };
  for(const [s,tf] of allViews()){
    const id=s.id+(s.tunable?`[from ${tf}]`:''), v=scaleView(s,tf);
    ok(scaleView(s,tf)===v, `${id}: a second call gives a different view object`);
    ok(scaleView(v,tf)===v, `${id}: a view of the view is a different object`);
    ok(v!==s, `${id}: the view is the bare scale object`);
    ok(v.mode===s, `${id}: view.mode is not the scale itself`);
    ok(v.tuningRec===TUNINGS[s.tuning], `${id}: view.tuningRec is not the scale's tuning record`);
    const pol= s.tunable ? 'choice' : s.fixedKey ? 'C' : 'tonic';
    ok(!!v.anchor&&v.anchor.policy===pol, `${id}: anchor policy ${v.anchor&&v.anchor.policy}, expected ${pol}`);
    ok(!!v.anchor&&v.anchor.from===(pol==='choice'?tf:pol==='C'?0:'T'), `${id}: anchor from ${v.anchor&&v.anchor.from}`);
    if(s.tunable) ok(v.tunedFrom===tf, `${id}: tunedFrom ${v.tunedFrom}, expected ${tf}`);
    else{ ok(!('tunedFrom' in v), `${id}: a non-tunable view carries tunedFrom`);
          ok(scaleView(s,5)===v && scaleView(s,'T')===v, `${id}: a non-tunable scale has more than one view`); }
    for(const k of ['iv','edo','cents','period','fixedKey','gridChords','typedChords','noChords','sel','root','tuning','id'])
      ok(v[k]===s[k], `${id}: field ${k} differs between the view and the scale`);
  }
  console.log(`[scaleprobe T2] identity checks ${checks} · mismatches ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T2] '+m));
  const r=sweep('T2',['view','scale'],NEW,NEW,(s,tf)=>[scaleView(s,tf), s.tunable ? {...s, tunedFrom:tf} : s]);
  if(!bad.length && !r.total) console.log('[scaleprobe T2] views are stable and every pitch through a view is bit-identical to the scale itself');
  return { checks, identity:bad, cases:r.cases, ms:r.ms, total:bad.length+r.total, mismatches:bad.concat(r.mismatches) };
}

/* ═══ ДРОН (слайс «дрон и центы») — КАКУЮ СТУПЕНЬ берёт вторая струна у каждого лада (справка, не проверка) ═══
   Печатает таблицу: лад, ступень, почему (fifth / fourth / seventh / cons / period) и её точные центы над корнем — при ТЕКУЩЕЙ тонике
   (у фиксированных строёв от неё зависит ключ: Пифагор от C в ключе F# берёт кварту — его квинта там волк). Звук не трогает. */
export function drone(){
  const rows=[];
  for(const [s,tf] of allViews()){ const v=scaleView(s,tf), d=droneDegree(v);
    rows.push({ mode:s.id+(s.tunable?`[from ${tf}]`:''), degree:d.deg, why:d.why, cents:Math.round(d.cents*100)/100 }); }
  console.table(rows); return rows;
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
    const want= s.noChords ? 'none' : isTert(s) ? 'tertian' : s.tag==='edo' ? 'ratios' : s.typedChords ? 'palette' : 'stack';   // «стопка»: прежний выбор по tag «пауэр» — теперь stack (решение пользователя)
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
    if(k!=='tertian'&&k!=='stack'&&k!=='ratios') miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000}: an untyped chord in ${e.sc&&e.sc.id}, whose rule is ${k}`);
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
  ['seed notes as intended',()=>checkSeed(), r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences })],
  ['frozen seed bass level',()=>checkFrozen(), r=>({ cases:r.cases, song:r.cases, diff:r.total, list:r.differences })],
  ['write path (funnels)',()=>checkWrite(), r=>({ cases:r.cases, diff:r.total, list:r.differences })],
  ['tracks: one view',   ()=>tracks(),      r=>{ const m=r.filter(x=>x.view.includes(' + ')); return { cases:r.length, song:r.length, diff:m.length, list:m.map(x=>`${x.track} holds ${x.view}`) }; }],
];
export function all(opt={}){
  const keep={ log:console.log, warn:console.warn, table:console.table, info:console.info }, mute=()=>{};
  const rows=[], lists=[];
  for(const [name,run,read] of ALL_RUNS){
    const t0=performance.now(); let row;
    if(!opt.verbose){ console.log=console.warn=console.table=console.info=mute; }
    try{ const x=read(run()); row={ check:name, cases:x.cases, song:x.song==null?'—':x.song, differences:x.diff }; if(x.diff) lists.push([name,x.list||[]]); }
    catch(err){ row={ check:name, cases:'—', song:'—', differences:'ERROR' }; lists.push([name,[String(err&&err.stack||err)]]); }
    finally{ Object.assign(console,keep); }
    row.ms=Math.round(performance.now()-t0); rows.push(row);
  }
  const M=material();
  for(const r of rows) if(r.song!=='—') r.status = !M.ok ? 'song: not enough material' : r.differences===0 ? 'pass' : 'FAIL';
                         else r.status = r.differences===0 ? 'pass' : 'FAIL';
  console.table(rows);
  if(SEED_REC && SEED_REC.kind==='song') console.log(`[scaleprobe all] frozen seed bass: not applicable — the loaded song is P.song('${SEED_REC.name}')`);
  else { const F=SEED_REC&&SEED_REC.freeze, E=SEED_FROZEN_EXPECT;
    console.log(F ?`[scaleprobe all] frozen seed bass L${F.layer+1}: peak ${F.peak} (expected ${E.peak}), rms ${F.rms} (expected ${E.rms}), buffer ${F.samples} samples (expected ${E.samples})`
                  : '[scaleprobe all] frozen seed bass: none in this session (run await P.seed({replace:true}))'); }
  for(const [name,list] of lists){ console.warn(`[scaleprobe all] ${name}: first differences`); list.slice(0,opt.show||5).forEach(m=>console.warn('   '+m)); }
  const nDiff=rows.reduce((n,r)=>n+(typeof r.differences==='number'?r.differences:1),0);
  if(!M.ok) console.warn(`[scaleprobe all] song: not enough material — missing ${M.missing.join('; ')} (run await P.seed({replace:true}) for a complete test song)`);
  console.log(`[scaleprobe all] ${nDiff===0&&M.ok ? 'PASS' : 'NOT A PASS'} — ${rows.length} checks, ${nDiff} differences, song material ${M.ok?'complete':'incomplete'} (${events.length} events, ${M.counts.views} tuning views)`);
  return { pass:nDiff===0&&M.ok, rows, material:M };
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
const VIEWS_W=()=>{ const by=f=>SCALES.find(f);
  return [['major',SCALES.findIndex(s=>s.id==='major'),'T'], ['raga (table + selection)',SCALES.findIndex(s=>s.id==='raga-yaman'),'T'],
          ['pelog Barang (root offset)',SCALES.indexOf(by(s=>s.root>0)),'T'], ['Partch (table, ratio chords)',SCALES.findIndex(s=>s.id==='partch-43'),'T'],
          ['Pythagorean from C (fixed key)',SCALES.findIndex(s=>s.id==='pythagorean'),0], ['Pythagorean from the tonic',SCALES.findIndex(s=>s.id==='pythagorean'),'T'],
          ['Werckmeister (fixed key)',SCALES.findIndex(s=>s.id&&s.id.startsWith('werck')),'T'], ['Bohlen–Pierce (non-octave)',SCALES.indexOf(by(s=>s.tuning==='bp13')),'T'],
          ['19-TET',SCALES.indexOf(by(s=>s.tuning==='edo19')),'T'], ['major pentatonic (stack)',SCALES.findIndex(s=>s.id==='major-penta'),'T']].filter(x=>x[1]>=0); };
export function checkWrite(){
  const bad=[]; let nBad=0, cases=0, nView=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keep={ sc:scaleIdx, tf:tunedFrom, sev:seventh };
  try{
    for(const [name,idx,tf] of VIEWS_W()){
      setScaleIdx(idx); setTunedFrom(tf); nView++;
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
  } finally { setScaleIdx(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev); }
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
        const diffOf=ev=>[ ...(ev.sc && ev.sc.id!==sid ? [`${at}: stored in ${ev.sc.id}, the script intended ${sid}`] : []), ...writeDiff(at,ev,st.a,ign) ];
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
const SID=id=>{ const i=SCALES.findIndex(x=>x.id===id); if(i<0) throw new Error('no scale '+id); return i; };   // id — стабильный идентификатор (T0), не имя (правило #25)
export async function seed(opt={}){
  console.log('[scaleprobe seed] P.seed REPLACES the current song with a test song (nothing is saved).');
  if(editIsOpen()){ console.warn('[scaleprobe seed] the track editor is open — close it first.'); return null; }
  if(events.length && !opt.replace){ console.warn(`[scaleprobe seed] the song has ${events.length} events — refusing. Run await P.seed({replace:true}) to replace it.`); return null; }
  const keep={ sc:scaleIdx, tf:tunedFrom, sev:seventh };
  const built=[]; const say=m=>{ built.push(m); console.log('[scaleprobe seed] '+m); };
  try{
    SEED_REC={ kind:'seed', takes:[], edited:[['major',12],['partch-43',32],['major',8],['major-penta',76],['major',12,'bass']], freeze:null };   // задуманное — для P.checkSeed (ноты, которые сценарий правит в редакторе ниже; T5 — три правки на высоты вне лада)
    clearRec(); setLoopMetre(4); setSeventh(false);
    let nid=0; const S=[];
    const on =(fn,a,t)=>{ const id=++nid; S.push({fn,a,t,id}); return id; };
    const at =(id,fn,a,t)=>S.push({fn,a,t,id});
    const take=(label,scaleId,tf)=>{ setScaleIdx(SID(scaleId)); if(tf!==undefined) setTunedFrom(tf);
      const steps=S.splice(0), r=seedTake(steps); if(!r) throw new Error('seedTake refused — start the app (▶ Play) and stop the transport first');
      SEED_REC.takes.push({ label, take:r.take, scaleId, tf, steps:steps.map(st=>({ fn:st.fn, t:st.t, a:{...st.a} })) });
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
    { const v=scaleView(SCALES[SID('partch-43')],'T'), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[32,0,0,0],[36,11,1,0],[40,18,0,1],[44,25,2,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); }); }
    take('Partch: typed chords','partch-43');
    // ---- 4) Пифагор «строй от C»: аккорды палитры и бас ----
    { const v=scaleView(SCALES[SID('pythagorean')],0), F=chordFams(v), ty=(f,k)=>{ const fam=F[f]||F[0]; return (fam.types[k]||fam.types[0]).iv; };
      [[48,0,0,0],[52,5,0,0],[56,7,0,1],[60,0,1,0]].forEach(([t,d,f,k])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:ty(f,k)},t); at(id,'chOff',{},t+4); });
      const id=on('bassOn',{deg:0,oct:1,vol:.8,inst:0},48); at(id,'bassSet',{deg:5,oct:1,vol:.8},52); at(id,'bassSet',{deg:7,oct:1,vol:.8},56); at(id,'bassOff',{},64); }
    take('Pythagorean tuned from C: palette chords, bass','pythagorean',0);
    // ---- 5) пентатоника: аккорды-стопки ----
    [[64,0],[68,1],[72,3],[76,4]].forEach(([t,d])=>{ const id=on('chOn',{deg:d,oct:1,vol:.8,inst:0,ty:null},t); at(id,'chOff',{},t+4); });
    take('major pentatonic: stacked chords','major-penta');
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
    setScaleIdx(SID('major'));
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
  } finally {
    setScaleIdx(keep.sc); setTunedFrom(keep.tf); setSeventh(keep.sev);
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

/* ═══ T6b: НЕТИПИЗИРОВАННЫЕ АККОРДЫ — ЦЕНА ПО ПРАВИЛУ ЛАДА ОТ ИНДЕКСА КОРНЯ ═══
   Сравнение === (частота И интервал каждой ноты) с ПРЕЖНЕЙ ценой — legacyChordNotesRef (по ступени и tag; у лада stack — прежняя арифметика стопки):
   1) ПРОГОН: каждый вид, где правило строит нетипизированный аккорд (tertian/power/ratios), и — для полноты — лады с палитрой (их
      нетипизированный аккорд недостижим, цена прежняя) × 12 тоник × A4_SET × регистры 0..3 × ступени 0..n × септаккорд выкл/вкл:
      chordNotes (по ступени, теперь правилом) и chordNotesAt (по индексу корня через обратную выборку — то, чем играет ENG);
   2) 'none': у каждого вида без аккордов нетипизированный аккорд — НОЛЬ нот, подпись — пустая (смена определения, названная);
   3) данные: каждый лад с аккордами без палитры — на равном строе (иначе цена номинально-равной была бы ложью — недостижимо);
   ⛳ T4c-2: п. 4 (песня — сверка с ХРАНИМОЙ ступенью) снят; его защиту несёт P.checkSong. Был:
   4) ПЕСНЯ: каждое нетипизированное «вкл»/ведение аккорда — цена ENG (chordNotesAt из a.ti) против прежней; догонялка на каждой границе
      событий (нагрузка chaseNote, цена из индекса) против прежней по legacyChaseNote; интервалы распада (chordNotesAt сегмента — ими
      dissolvePlan пишет однонотные типы) против прежних; ряды редактора и призрак сверяет P.checkRows (его прежний путь — тоже прежняя цена). */
export function checkUntyped(){
  const bad=[]; let cases=0, none=0, nPal=0;
  const miss=m=>{ if(bad.length<KEEP_MAX) bad.push(m); };
  const cmp=(at,X,Y)=>{ cases++;
    if(X.length!==Y.length){ miss(`${at}: ${X.length} notes now, ${Y.length} before`); return; }
    for(let i=0;i<X.length;i++) if(X[i].f!==Y[i].f||X[i].iv!==Y[i].iv) miss(`${at} note ${i}: ${X[i].f} (iv ${X[i].iv}) now, ${Y[i].f} (iv ${Y[i].iv}) before`); };
  const keepT=tonic, keepA=aRef;
  try{
    for(const [s0,tf] of allViews()){
      const v=scaleView(s0,tf), n=v.iv.length, k=v.chordRule&&v.chordRule.kind, id=v.id+(v.tunable?`[from ${tf}]`:'');
      if(k==='none'){ for(let d=0;d<=n;d++) for(const sev of [false,true]){ none++;
          if(chordNotes(d,0,v,sev,null).length) miss(`${id} degree ${d}: a chordless mode still prices an untyped chord`);
          if(chordLabel(d,v,sev)!==''||chordNotesStr(d,v,sev)!=='') miss(`${id} degree ${d}: a chordless mode still names an untyped chord`); }
        continue; }
      if(k==='palette') nPal++;
      const T=TUNINGS[v.tuning];
      if(k!=='palette' && T.equal==null) miss(`${id}: an untyped chord rule on a TABLE tuning — its nominal-equal price would be a lie`);
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A4 of A4_SET){ setARef(A4);
          for(let o=0;o<4;o++) for(let d=0;d<=n;d++) for(const sev of [false,true]){
            const at=`${id} tonic ${tn} A4 ${A4} degree ${d} reg ${o}${sev?' 7th':''}`, L=legacyChordNotesRef(d,o,v,sev,null);
            cmp(at+' (by degree)', chordNotes(d,o,v,sev,null), L);
            cmp(at+' (from ti)', chordNotesAt(tuningIndexOf(d,v,true),o,v,sev,null), L);
          }
        }
      }
    }
  } finally { setTonic(keepT); setARef(keepA); }
  console.log(`[scaleprobe T6b] cases ${cases} (sweep) · chordless modes checked ${none} · palette views ${nPal} (unreachable, priced as before) · differences ${bad.length}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T6b] '+m));
  if(!bad.length) console.log('[scaleprobe T6b] every untyped chord prices identically from its chord rule and its root index; chordless modes build no chord');
  return { cases, none, palette:nPal, total:bad.length, mismatches:bad };
}

/* ═══ «СТОПКА»: ПРАВИЛО stack — АККОРД ЧЕРЕЗ СТУПЕНЬ ЛАДА В ПЕНТАТОНИКАХ, БЛЮЗЕ И ЯПОНСКИХ ЛАДАХ ═══
   1) ВНУТРИ ЛАДА: каждый вид с правилом stack × ступень 0..n × регистр 0..3 × септаккорд выкл/вкл — каждый шаг аккорда (ruleChordSteps,
      по нему и цена) приводится по модулю строя к ступени ЛАДА; ни один тон не вне лада;
   2) ПОДПИСЬ: у каждой такой ступени подпись непуста и без «?»/«undefined»; таблица подписей до-мажорной пентатоники и блюза (тоника C)
      печатается — та, что в отчёте;
   ⛳ T4c-2: п. 3 (временный переключатель R.powerOld и старение замороженных дорожек при его флипе) снят вместе с переключателем —
   стопка заменяет пауэр-аккорд насовсем (решение пользователя). Ничего не играет. */
export function checkStack(){
  const bad=[]; let cases=0;
  const miss=m=>{ if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic, views=[];
  for(const [s0,tf] of allViews()){ const v=scaleView(s0,tf); if(v.chordRule&&v.chordRule.kind==='stack') views.push(v); }
  try{
    for(const v of views){ const n=v.iv.length, E=v.edo, inMode=new Set(v.iv.map(x=>((x%E)+E)%E));
      for(const sev of [false,true]) for(let d=0;d<=n;d++){
        const st=ruleChordSteps(d,v,sev); cases++;
        for(const x of st) if(!inMode.has(((x%E)+E)%E)) miss(`${v.id} degree ${d}${sev?' 7th':''}: step ${x} is outside the mode`);
        for(let tn=0;tn<12;tn++){ setTonic(tn); const L=chordLabel(d,v,sev); cases++;
          if(!L || /\?|undefined/.test(L)) miss(`${v.id} tonic ${tn} degree ${d}${sev?' 7th':''}: label "${L}"`); }
      }
    }
    setTonic(0);
    for(const id of ['major-penta','blues']){ const v=views.find(x=>x.id===id); if(!v) continue; const rows=[];
      for(let d=0;d<=v.iv.length;d++) rows.push({ mode:id, degree:d, label:chordLabel(d,v,false), notes:chordNotesStr(d,v,false), label7:chordLabel(d,v,true), notes7:chordNotesStr(d,v,true) });
      console.table(rows); }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe stack] stack modes ${views.length} · cases ${cases} (tones inside the mode, labels) · differences ${bad.length}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe stack] '+m));
  if(!bad.length) console.log('[scaleprobe stack] every stacked chord stays inside its mode, and every label reads');
  return { modes:views.length, cases, total:bad.length, mismatches:bad };
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
