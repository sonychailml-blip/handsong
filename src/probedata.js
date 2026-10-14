/* ⛳ ПРОБЫ ДАННЫХ — ЧАСТЬ ПРОБЫ, КОТОРОЙ НЕ НУЖНЫ НИ БРАУЗЕР, НИ КАМЕРА, НИ ЗВУК (слайс «быстрые пробы»).
   Вынесено из scaleprobe.js СЛОВО В СЛОВО: реестры встроенных ладов (без файлов пользователя), ЗАМОРОЖЕННЫЕ ОПОРЫ (прежние тела функций
   высоты, аккордов, подписей до F3/F4/T7), помощники прогона (sweep, allViews, NEW/OLD) и пробы T0 (данные), T1 (частоты), T2 (вид),
   T6b (нетипизированные аккорды), «стопка», F4 (поведение данными), справка drone(). Импортирует ТОЛЬКО scales/state/i18n (и через
   них config, scaleload, userstore, hooks) — поэтому этот модуль грузится и в node: tools/probe-data.mjs гоняет те же пробы без браузера.
   scaleprobe.js импортирует его и отдаёт те же P.checkData/…/P.checkBehaviour, что и прежде; P.all() держит эти строки как раньше.
   ⛔ Сюда — только то, что не трогает draw/ui/audio/recorder/userfiles: иначе node не загрузит модуль (проверяет check-static —
   неизвестное имя в модуле — и сам node при запуске раннера). */
import { shiftDegrees, SCALES as SCALES_ALL, TUNINGS as TUNINGS_ALL, scaleView, chordFams, chordUnit, droneDegree, tuningIndexOf, leadFreqTi, bassFreqTi, chordNotesAt, REG_N, modeSlotOfTi, viewIdOf, chordLabel, chordNotesStr,
         leadFreq, bassFreq, chordNotes, chordRowFreq, tonicFreq, centsOf, ruleChordSteps,
         CUR, IVX, NOTE_NAMES, stepName, qual, SEV, ROMAN, fifthStep, periodOf, baseF, keyOf, cFix, chordBuildOf, chordTypeFits, chordPitchHz, pitchHz, chordModeOf, CHORD_FAM_SETS as CFS_ALL, TRADITIONS, GRP, menuOf, scaleById, regWord, rootName, range, droneNonOct, chordRowFreqAt, regWordFull, rowLabel, OCT_ROMAN, tuningOf, name24, supportsProgressions, backingRhythmOf, tuningStatus, degCentsExact, DRONE_TOL, setDroneNonOct, scaleData, registerRecord, unregisterRecord, chordModeName, chordModeHint, viewOfId, resolveScaleId, applyScaleId, namingOf, chordAtRoot } from './scales.js';   // F8: что звучит на корне   // F7: псевдонимы ладов   // F0: снимок «строи файлами»   // T7: как строятся аккорды строя, тип целиком в строе, высота строя в регистре аккордов   // T4c-2: последняя строка — то, что читают ЗАМОРОЖЕННЫЕ ОПОРЫ (ниже)
import { tonic, aRef, setTonic, setARef, scaleId, tunedFrom, seventh, setScaleId, setTunedFrom, setSeventh, chordModeSel, setChordMode, setChordModeSel, laneRow0, setLaneRow0, arrOpen, arrFace, rollOpen, rollBeat0, rollSpan,
         fx as liveFx, fxChains, chainOwners, chainKeyOf, leadIdx, chIdx, bassIdx, drumKitIdx, voiceMode } from './state.js';   // страж P.all: живое состояние звука, которое читает рендер   // laneRow0 — прокрутка полосы дорожек (P.checkTracks листает её и возвращает)   // T7b: режимы аккордов — сценарий P.seed и прогон P.checkModes (и их возврат)   // P.seed: лад, «строй от» и септаккорд сценария — и их возврат
import { L, t, withLang } from './i18n.js';   // T7: подписи типов в отчёте P.checkPure; F0: имена режимов аккордов (t) и язык снимка без записи выбора (withLang)

const isUserId=id=>String(id).startsWith('u.');
const SCALES=SCALES_ALL.filter(s=>!isUserId(s.id));
const TUNINGS=Object.fromEntries(Object.entries(TUNINGS_ALL).filter(([k])=>!isUserId(k)));
const CHORD_FAM_SETS=Object.fromEntries(Object.entries(CFS_ALL).filter(([k])=>!isUserId(k)));
const userCount=()=>SCALES_ALL.filter(s=>isUserId(s.id)).length+Object.keys(TUNINGS_ALL).filter(isUserId).length+Object.keys(CFS_ALL).filter(isUserId).length;

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
/* ⛳ F4: isTert ПЕРЕЕХАЛ СЮДА из scales.js слово в слово — в приложении у него не осталось читателя; живёт им только эталон (стопка терций
   по tag). Как функция он НЕ равен правилу аккордов лада: макамы — tag 'maqam' (isTert истинно), а правило 'none' (аккордов нет); на путях,
   которые доходят до него (лады с аккордами), ответы совпадают. */
/* ⛳ F5b: ТЕГИ ЛАДОВ (прежнее поле данных compat.tag — семейство лада: dia / ethnic / maqam / penta / blues / chrom / edo / ji / bp / carlos) —
   ПЕРЕЕХАЛИ СЮДА, к замороженным опорам, которые одни их и читают (isTert, legacyChordSteps, legacyChordLabel, выбор правила в
   P.checkRules). Ключ — id лада; значения — ровно те, что стояли в файлах data/modes/ до F5b. tagOf: у копии с собственным tag (опора
   «стопки» {...лад, tag:'dia'}) — её tag, иначе — по id. */
const TAG_OF={
  'major':'dia', 'natural-minor':'dia', 'harmonic-minor':'dia', 'melodic-minor':'dia', 'dorian':'dia', 'phrygian':'dia',
  'lydian':'dia', 'mixolydian':'dia', 'locrian':'dia', 'hungarian-minor':'ethnic', 'major-penta':'penta', 'minor-penta':'penta',
  'blues':'blues', 'chromatic':'chrom', 'maqam-rast':'maqam', 'maqam-bayati':'maqam', 'edo19-full':'edo', 'edo31-full':'edo',
  'maqam-hijaz':'maqam', 'harmonic-major':'dia', 'melodic-major':'dia', 'whole-tone':'ethnic', 'octatonic-wh':'ethnic', 'octatonic-hw':'ethnic',
  'messiaen-3':'ethnic', 'phrygian-dominant':'ethnic', 'double-harmonic':'ethnic', 'enigmatic':'ethnic', 'prometheus':'ethnic', 'egyptian':'penta',
  'man-gong':'penta', 'ritusen':'penta', 'hungarian-penta':'penta', 'scriabin-penta':'penta', 'kumoi-western':'penta', 'major-blues':'penta',
  'maqam-saba':'maqam', 'maqam-sikah':'maqam', 'maqam-nahawand':'maqam', 'maqam-kurd':'maqam', 'maqam-ajam':'maqam', 'maqam-nikriz':'maqam',
  'maqam-nawa-athar':'maqam', 'slendro':'penta', 'pelog':'penta', 'hirajoshi':'penta', 'kumoi-japanese':'penta', 'in-insen':'penta',
  'iwato':'penta', 'partch-43':'ji', 'bohlen-pierce':'bp', 'carlos-alpha':'carlos', 'carlos-beta':'carlos', 'carlos-gamma':'carlos',
  'pelog-lima':'penta', 'pelog-nem':'penta', 'pelog-barang':'penta', 'pythagorean':'penta', 'ji-adaptive':'penta', 'ji-fixed':'penta', 'just-intonation':'penta',   // F7: слитый Натуральный — тот же тег, что у обоих прежних
  'meantone-quarter':'penta', 'shruti-22':'penta', 'raga-bhairav':'penta', 'raga-yaman':'penta', 'raga-kafi':'penta', 'raga-bhairavi':'penta',
  'raga-todi':'penta', 'raga-khamaj':'penta', 'raga-asavari':'penta', 'raga-malhar':'penta', 'raga-purvi':'penta', 'raga-bilawal':'penta',
  'werckmeister-3':'penta', 'vallotti':'penta', 'kirnberger-3':'penta',
};
const tagOf=s=> s.tag!==undefined ? s.tag : TAG_OF[s.id];
const isTert=s=>{ const g=tagOf(s); return g==='dia'||g==='ethnic'||g==='maqam'; };   // F5b: тег — из таблицы пробы (было s.tag)
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
  if (tagOf(s)==='edo'){   // F5b: тег — из таблицы пробы
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
const legacyChordNotesStr=(deg,s=CUR(),sev=seventh)=>legacyChordSteps(deg,s,sev).map(st=>preF3StepName(st,s)).join('·');   // F3: имя шага — замороженное (опора целиком замороженная)
/* LEGACY-ОПОРА (слайс «стопка»): прежняя цена (legacyChordNotes), а у аккорда без типа в ладу stack — та же прежняя арифметика
   СТОПКИ ЧЕРЕЗ СТУПЕНЬ, что у терцовых ладов (копия вида с tag 'dia': chordSteps стопкой). При R.powerOld — прежний пауэр-аккорд, как и
   новый путь. ⛔ Читают ТОЛЬКО проба и прежний путь рядов редактора (draw.legacyRollSegNotes); уходит в T4c. */
const STACK_REF=new WeakMap();
function legacyChordNotesRef(deg,oct, s=CUR(), sev=seventh, ty=null){
  if (!ty && s.chordRule && s.chordRule.kind==='stack'){
    let r=STACK_REF.get(s); if(!r){ r={...s, tag:'dia'}; STACK_REF.set(s,r); }
    return legacyChordNotes(deg,oct,r,sev,null);
  }
  /* ⛳ T7 — СМЕНА ОПРЕДЕЛЕНИЯ, РЕШЁННАЯ ПОЛЬЗОВАТЕЛЕМ (по теории): у Болена–Пирса аккорды — ИЗ ШАГОВ СТРОЯ (набор 'bp' — целые шаги), а не
     чистыми отношениями. Прежняя period-ветка legacyChordNotes приняла бы шаги за отношения; опора для строя «из строя» с периодом ≠ 2 —
     последняя строка legacyChordNotes (равная ветка), то же выражение слово в слово. Адаптивный неоктавный строй (встроенных нет)
     по-прежнему шёл бы period-веткой. */
  if (ty && periodOf(s)!==2 && chordBuildOf(s)!=='adaptive'){
    const n=s.iv.length, P=periodOf(s), r0=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
    return legacyChordSteps(deg,s,sev,ty).map(st=>({ f: baseF()/2*Math.pow(P,oct)*Math.pow(P,st/s.edo), iv: st-r0 }));
  }
  return legacyChordNotes(deg,oct,s,sev,ty);
}
/* ═══ ⛳ F3 — ЗАМОРОЖЕННЫЕ ОПОРЫ ИМЁН (подписи ДО F3, СЛОВО В СЛОВО) ═══
   До F3 подписи ветвились по свойствам лада (edo 12/24, период, cents, swaraNames, swaraFull, fixedKey); с F3 они читают СХЕМУ ИМЁН из
   данных строя и лада (scales.namingOf). Прежние тела — здесь, под префиксом preF3: scales.stepName/rowLabel/rootName/regWord/chordLabel/
   stackLabel/chordNotesStr/swaraLbl/swaraOfCents (с таблицами SWARA_OF/SHRUTI_OF и STACK_Q*), draw.noteLbl/tunPitchLbl/axisLbl и полное
   слово периода (draw: periodOf()===2 ? 'reg.octaveFull' : regWord().toUpperCase()). Изменено при переезде: снят export, добавлен префикс,
   внутренние вызовы ведут на замороженные же копии; name24 и NOTE_NAMES — общие (F3 их не менял). ⛔ ЭТАЛОН — не правится вслед за
   приложением; читает только P.checkNames (и опора T6c — preF3StepName). */
const preF3_SWARA_OF={0:{default:'Sa',ru:'Са'},90:{default:'Re♭',ru:'Ре♭'},112:{default:'Re♭',ru:'Ре♭'},182:{default:'Re',ru:'Ре'},204:{default:'Re',ru:'Ре'},294:{default:'Ga♭',ru:'Га♭'},316:{default:'Ga♭',ru:'Га♭'},386:{default:'Ga',ru:'Га'},408:{default:'Ga',ru:'Га'},
  498:{default:'Ma',ru:'Ма'},520:{default:'Ma',ru:'Ма'},590:{default:'Ma♯',ru:'Ма♯'},612:{default:'Ma♯',ru:'Ма♯'},702:{default:'Pa',ru:'Па'},792:{default:'Dha♭',ru:'Дха♭'},814:{default:'Dha♭',ru:'Дха♭'},884:{default:'Dha',ru:'Дха'},906:{default:'Dha',ru:'Дха'},
  996:{default:'Ni♭',ru:'Ни♭'},1018:{default:'Ni♭',ru:'Ни♭'},1088:{default:'Ni',ru:'Ни'},1110:{default:'Ni',ru:'Ни'}};
const preF3_SHRUTI_OF={0:{default:'Chandovati',ru:'Чхандовати'},90:{default:'Dayavati',ru:'Дайавати'},112:{default:'Ranjani',ru:'Ранджани'},182:{default:'Ratika',ru:'Ратика'},204:{default:'Raudri',ru:'Раудри'},294:{default:'Krodha',ru:'Кродха'},
  316:{default:'Vajrika',ru:'Ваджрика'},386:{default:'Prasarini',ru:'Прасарини'},408:{default:'Priti',ru:'Прити'},498:{default:'Marjani',ru:'Марджани'},520:{default:'Kshiti',ru:'Кшити'},590:{default:'Rakta',ru:'Ракта'},612:{default:'Sandipani',ru:'Сандипани'},
  702:{default:'Alapini',ru:'Алапини'},792:{default:'Madanti',ru:'Маданти'},814:{default:'Rohini',ru:'Рохини'},884:{default:'Ramya',ru:'Рамья'},906:{default:'Ugra',ru:'Угра'},996:{default:'Kshobhini',ru:'Кшобхини'},1018:{default:'Tivra',ru:'Тивра'},
  1088:{default:'Kumudvati',ru:'Кумудвати'},1110:{default:'Manda',ru:'Манда'}};
const preF3RegWord=(s=CUR())=>{ const P=periodOf(s); return P===2?t('reg.oct'):P===3?t('reg.tritave'):t('reg.reg'); };
const preF3RegWordFull=(s=CUR())=>periodOf(s)===2?t('reg.octaveFull'):preF3RegWord(s).toUpperCase();
const preF3RootName=(deg,s=CUR())=>{ const n=s.iv.length, d=((deg%n)+n)%n;
  return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12] : 'ст'+s.iv[d]; };
function preF3StepName(st,s=CUR()){
  if (s.edo===12) return NOTE_NAMES[(((tonic+st)%12)+12)%12];
  if (s.edo===24) return name24(tonic*2+st);
  return 'ст'+(((st%s.edo)+s.edo)%s.edo);
}
function preF3RowLabel(deg,s=CUR()){ const ivx=IVX(s);
  if (s.edo===12||s.edo===24) return preF3StepName(ivx[deg],s);
  const st=ivx[deg]%s.edo; return st===0?'Т':String(st);
}
const preF3SwaraLbl=(deg,s=CUR())=>{ const cx=(s.cents||[]).concat([1200]), c=cx[deg%cx.length]%1200;
  return preF3SwaraOfCents(c, !!s.swaraFull) ?? String(deg+1); };
function preF3SwaraOfCents(c, full){ const sw=preF3_SWARA_OF[c]; if(!sw) return null;
  return full ? `${L(sw)} · ${L(preF3_SHRUTI_OF[c])}` : L(sw); }
const preF3_STACK_Q3={'4,7':'','3,7':'m','3,6':'°','4,8':'+','2,7':'sus2','5,7':'sus4'};
const preF3_STACK_Q4={'4,7,11':'maj7','4,7,10':'7','3,7,10':'m7','3,6,10':'ø','3,6,9':'°7','4,7,9':'6','3,7,9':'m6','2,4,7':'add9','2,3,7':'madd9','5,7,10':'7sus4','4,8,11':'+(maj7)'};
function preF3StackLabel(st, s){
  if (s.edo!==12) return st.map(x=>preF3StepName(x,s)).join('–');
  const pc=x=>((x%12)+12)%12, nm=x=>NOTE_NAMES[pc(tonic+x)];
  const order=[]; for(const x of st){ const p=pc(x); if(!order.includes(p)) order.push(p); }
  const Q= order.length===3 ? preF3_STACK_Q3 : order.length===4 ? preF3_STACK_Q4 : null;
  if (Q) for(const r of order){
    const rel=order.filter(p=>p!==r).map(p=>pc(p-r)).sort((a,b)=>a-b).join(','), q=Q[rel];
    if (q!==undefined) return nm(r)+q+(r!==order[0] ? '/'+nm(order[0]) : '');
  }
  return st.map(nm).join('–');
}
function preF3ChordLabel(deg,s=CUR(),sev=seventh){
  const n=s.iv.length, d=deg%n;
  if (s.chordRule && s.chordRule.kind==='none') return '';
  if (s.chordRule && s.chordRule.kind==='stack') return preF3StackLabel(ruleChordSteps(deg,s,sev), s);
  if (!(s.chordRule && s.chordRule.kind==='tertian')){
    return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12]+'5' : 'ст'+s.iv[d]+'·5';
  }
  const st=ruleChordSteps(deg,s,sev), r=st[0];
  if (s.edo===12){
    const root=NOTE_NAMES[(((tonic+r)%12)+12)%12];
    let q=qual(st[1]-r, st[2]-r);
    if (q==null) return root+'?';
    if (sev){ const sv=st[3]-r; q=SEV[q+'|'+sv] ?? (q+'⁷'); }
    return root+q;
  }
  return ROMAN[d]+(sev?'⁷':'');
}
const preF3ChordNotesStr=(deg,s=CUR(),sev=seventh)=>ruleChordSteps(deg,s,sev).map(st=>preF3StepName(st,s)).join('·');
const preF3NoteLbl = (deg,s=CUR()) =>
  s.swaraNames ? preF3SwaraLbl(deg,s)
    : s.fixedKey ? preF3RowLabel(deg,s)
    : (periodOf(s)!==2 || s.cents || (s.edo!==12 && s.edo!==24))
    ? (IVX(s)[deg]%s.edo===0 ? 'Т' : String(deg+1))
    : preF3RowLabel(deg,s);
const preF3TunSize=T=>T.equal!=null ? T.equal : T.cents.length;
function preF3TunPitchLbl(sc,j){
  const T=sc&&tuningOf(sc), N=preF3TunSize(T), k=sc.root+j;
  if(T.equal!=null && T.period===2 && (T.equal===12||T.equal===24)) return preF3StepName(j,sc);
  if(sc.swaraNames && T.cents){ const c=(T.cents[k%N]+1200*Math.floor(k/N)-T.cents[sc.root])%1200; const nm=preF3SwaraOfCents(c,true); if(nm) return nm; }
  return '('+(((k%N)+N)%N+1)+')';
}
function preF3AxisLbl(ax,r){
  const e=ax.ent(r), base = e.deg>=0 ? preF3NoteLbl(e.deg,ax.sc) : preF3TunPitchLbl(ax.sc,e.j);
  return (((r%ax.rpp)+ax.rpp)%ax.rpp)===0 ? base+' '+(OCT_ROMAN[(r/ax.rpp)|0]||'') : base;
}
/* ═══ ⛳ F4 — ЗАМОРОЖЕННЫЕ ОПОРЫ ПОВЕДЕНИЯ (код ДО F4, СЛОВО В СЛОВО) ═══
   До F4 решали строение лада: дрон неоктавного строя — константа 5/3 при переключателе 'cons'; прогрессии — семь ступеней; ритм джема
   бесаккордового лада — 24 шага (ui.jamVariants: CUR().edo===24); строка статуса — s.cents и s.edo!==12 (draw.drawStatus). Читает только
   P.checkBehaviour. */
const preF4_C_OF=r=>1200*Math.log2(r);
const preF4_FIFTH=preF4_C_OF(3/2), preF4_OCT_FALLBACK=[preF4_C_OF(4/3), preF4_C_OF(15/8), preF4_C_OF(9/5), preF4_C_OF(16/9)], preF4_CONS=preF4_C_OF(5/3);
function preF4DroneDegree(s=CUR()){
  const n=s.iv.length, cs=[];
  for(let d=1; d<=n; d++) cs.push([d, degCentsExact(d,s)]);
  const near=c=>{ let best=null, bd=Infinity; for(const [d,x] of cs){ const e=Math.abs(x-c); if(e<bd){ bd=e; best=d; } } return bd<=DRONE_TOL ? best : null; };
  const pick=(d,why)=>({ deg:d, why, cents:degCentsExact(d,s) });
  let d=near(preF4_FIFTH); if(d!=null) return pick(d,'fifth');
  if(tuningOf(s).period===2){
    d=near(preF4_OCT_FALLBACK[0]); if(d!=null) return pick(d,'fourth');
    for(const c of preF4_OCT_FALLBACK.slice(1)){ d=near(c); if(d!=null) return pick(d,'seventh'); }
  }else if(droneNonOct()==='cons'){ d=near(preF4_CONS); if(d!=null) return pick(d,'cons'); }
  return pick(n,'period');
}
const preF4Progressions=(s=CUR())=>s.iv.length===7;
const preF4Maqsum=(s=CUR())=>s.edo===24;
function preF4Status(s=CUR()){
  let st;
  if(s.cents){
    st=t('status.centsScale',{name:L(s.name), n:s.iv.length});
  }else{
    st=t('status.edoScale',{name:L(s.name), edo:s.edo, steps:s.iv.join('-')});
    if(s.edo!==12)st+=t('status.step',{c:Math.round(1200*Math.log2(periodOf(s))/s.edo)});
  }
  return st;
}
/* ═══ ⛳ T7b — ЗАМОРОЖЕННЫЕ ОПОРЫ ДО T7 (из прежнего кода, `git show` коммита до T7 — scales.js, только чтение; СЛОВО В СЛОВО) ═══
   Режим «Свободно» обязан звучать РОВНО как до T7. Здесь — то, чем это сверяется: наборы Партча и Болена–Пирса, как они стояли до T7
   (у Б–П — с тремя аккордами на 11), и ветка цены, по которой оба тогда звучали (scales.chordNotesAt: `s.cents || periodOf(s)!==2` —
   корень pitchHz от якоря, нота = корень × отношение; ступенный путь scales.chordNotes — та же форма от s.sel[d]), и единица корня
   (scales.chordUnit). Якорь подвижного лада подставлен литералом — тело modeAnchor для !fixedKey: { A:baseF(), z:s.root, key:0 }
   (оба лада подвижные). ⛔ Эталон: его не правят вслед за приложением. */
const PRE_T7_SETS={
 partch:[
  {id:'oton', name:{en:'O (otonal)', ru:'О (обертон.)'}, finger:0, types:[
    {label:'O',    full:{en:'Otonal triad · 4:5:6', ru:'Отональ. триада · 4:5:6'},         iv:[1,5/4,3/2]},
    {label:'O7',   full:{en:'Otonal tetrad · 4:5:6:7', ru:'Отональ. тетрада · 4:5:6:7'},      iv:[1,5/4,3/2,7/4]},
    {label:'O9',   full:{en:'Otonal pentad · 4:5:6:7:9', ru:'Отональ. пентада · 4:5:6:7:9'},    iv:[1,5/4,3/2,7/4,9/4]},
    {label:'O11',  full:{en:'Otonal hexad · 4:5:6:7:9:11', ru:'Отональ. гексада · 4:5:6:7:9:11'}, iv:[1,5/4,3/2,7/4,9/4,11/4]},
    {label:{en:'O no5', ru:'О-б5'}, full:{en:'Otonal, no fifth · 4:5:7', ru:'Отональ. без квинты · 4:5:7'},     iv:[1,5/4,7/4]},
    {label:{en:'O9n', ru:'О9нч'}, full:{en:'Otonal with ninth · 8:9:10:12', ru:'Отональ. с ноной · 8:9:10:12'},    iv:[1,9/8,5/4,3/2]},
  ]},
  {id:'uton', name:{en:'U (utonal)', ru:'У (унтертон.)'}, finger:1, types:[
    {label:'U',    full:{en:'Utonal triad · 10:12:15', ru:'Утональ. триада · 10:12:15'},      iv:[1,6/5,3/2]},
    {label:'U7',   full:{en:'Utonal tetrad · 1/(4:5:6:7)', ru:'Утональ. тетрада · 1/(4:5:6:7)'},  iv:[1,6/5,3/2,12/7]},
    {label:'U9',   full:{en:'Utonal pentad', ru:'Утональ. пентада'},                iv:[1,6/5,3/2,12/7,9/4]},
    {label:'U11',  full:{en:'Utonal hexad', ru:'Утональ. гексада'},                iv:[1,6/5,3/2,12/7,9/4,36/11]},
    {label:{en:'U no5', ru:'У-б5'}, full:{en:'Utonal, no fifth · 5:6:8', ru:'Утональ. без квинты · 5:6:8'},     iv:[1,6/5,8/5]},
    {label:{en:'U add9', ru:'Удоб9'},full:{en:'Utonal with ninth · 9:10:12', ru:'Утональ. с ноной · 9:10:12'},      iv:[1,10/9,6/5,3/2]},
  ]},
  {id:'sept', name:{en:'Sharp 7/11', ru:'Диез 7/11'}, finger:2, types:[
    {label:{en:'subm', ru:'субм'}, full:{en:'Subminor · 7/6 (267c)', ru:'Субминор · 7/6 (267c)'},          iv:[1,7/6,3/2]},
    {label:{en:'supM', ru:'супМ'}, full:{en:'Supermajor · 9/7 (435c)', ru:'Супермажор · 9/7 (435c)'},        iv:[1,9/7,3/2]},
    {label:{en:'neut', ru:'нейтр'},full:{en:'Neutral · 11/9 (347c)', ru:'Нейтральное · 11/9 (347c)'},      iv:[1,11/9,3/2]},
    {label:{en:'undec', ru:'ундец'},full:{en:'Undecimal · 11/8 (551c)', ru:'Ундецимальное · 11/8 (551c)'},    iv:[1,11/8,3/2]},
    {label:{en:'trit7', ru:'трит7'},full:{en:'Septimal tritone · 7/5 (583c)', ru:'Септим. тритон · 7/5 (583c)'},    iv:[1,7/5,3/2]},
    {label:{en:'harm', ru:'гарм'}, full:{en:'Harmonic segment · 8:10:11:12', ru:'Обертоновый срез · 8:10:11:12'},  iv:[1,5/4,11/8,3/2]},
  ]},
  {id:'std', name:{en:'Standard', ru:'Станд.'}, finger:3, types:[
    {label:'M',    full:{en:'Pure major · 4:5:6', ru:'Мажор чистый · 4:5:6'},            iv:[1,5/4,3/2]},
    {label:'m',    full:{en:'Pure minor · 10:12:15', ru:'Минор чистый · 10:12:15'},         iv:[1,6/5,3/2]},
    {label:'7',    full:{en:'Dominant 7th · 4:5:6:7', ru:'Домин.7 · 4:5:6:7'},               iv:[1,5/4,3/2,7/4]},
    {label:'maj7', full:{en:'Pure maj7 · 15/8', ru:'Maj7 чистый · 15/8'},              iv:[1,5/4,3/2,15/8]},
    {label:'sus4', full:'Sus4 · 4/3',                      iv:[1,4/3,3/2]},
    {label:{en:'quart', ru:'кварт'},full:{en:'Quartal chord · 9:12:16', ru:'Квартаккорд · 9:12:16'},           iv:[1,4/3,16/9]},
  ]},
 ],
 bp:[
  {id:'maj', name:{en:'Major', ru:'Мажор'}, finger:0, types:[
    {label:'3:5:7',     full:{en:'Major triad · 3:5:7 (885/1467¢)', ru:'Мажорная триада · 3:5:7 (885/1467¢)'}, iv:[1,5/3,7/3]},
    {label:'3:5:7:9',   full:{en:'Tetrad · 3:5:7:9 (top = tritave)', ru:'Тетрада · 3:5:7:9 (верх = тритава)'},  iv:[1,5/3,7/3,3]},
    {label:'3:5:7:9:11',full:{en:'Pentad · 3:5:7:9:11', ru:'Пентада · 3:5:7:9:11'},                iv:[1,5/3,7/3,3,11/3]},
    {label:'3:5',       full:{en:'Dyad · 3:5 (885¢)', ru:'Диада · 3:5 (885¢)'},                  iv:[1,5/3]},
    {label:'3:7',       full:{en:'Dyad · 3:7 (1467¢)', ru:'Диада · 3:7 (1467¢)'},                 iv:[1,7/3]},
  ]},
  {id:'min', name:{en:'Minor', ru:'Минор'}, finger:1, types:[
    {label:'5:7:9',    full:{en:'Minor triad · 5:7:9 (583/1018¢)', ru:'Минорная триада · 5:7:9 (583/1018¢)'}, iv:[1,7/5,9/5]},
    {label:'5:7:9:11', full:{en:'Tetrad · 5:7:9:11', ru:'Тетрада · 5:7:9:11'},                  iv:[1,7/5,9/5,11/5]},
    {label:'7:9:11',   full:{en:'Triad · 7:9:11 (435/782¢)', ru:'Триада · 7:9:11 (435/782¢)'},          iv:[1,9/7,11/7]},
    {label:'5:7',      full:{en:'Dyad · 5:7 (583¢, septimal tritone)', ru:'Диада · 5:7 (583¢, септим. тритон)'},  iv:[1,7/5]},
    {label:'5:9',      full:{en:'Dyad · 5:9 (1018¢)', ru:'Диада · 5:9 (1018¢)'},                 iv:[1,9/5]},
  ]},
  {id:'char', name:{en:'Characteristic', ru:'Характерные'}, finger:2, types:[
    {label:'9/7',   full:{en:'Supermajor third · 9/7 (435¢) + 7/3', ru:'Супермажор. терция · 9/7 (435¢) + 7/3'}, iv:[1,9/7,7/3]},
    {label:'7/5',   full:{en:'Septimal tritone · 7/5 (583¢) + 7/3', ru:'Септим. тритон · 7/5 (583¢) + 7/3'},     iv:[1,7/5,7/3]},
    {label:'15/7',  full:{en:'Upper · 3:5:15/7 (885/1319¢)', ru:'Верхняя · 3:5:15/7 (885/1319¢)'},        iv:[1,5/3,15/7]},
    {label:'25/9',  full:{en:'Stack of 5/3 · 9:15:25 (symmetric)', ru:'Стопка 5/3 · 9:15:25 (симметр.)'},       iv:[1,5/3,25/9]},
    {label:'49/25', full:{en:'Stack of 7/5 · 25:35:49 (symmetric)', ru:'Стопка 7/5 · 25:35:49 (симметр.)'},      iv:[1,7/5,49/25]},
  ]},
 ],
};
function preT7ChordNotesAt(ti,oct,s,ty){
  const T=TUNINGS[s.tuning], E=T.equal!=null ? T.equal : T.cents.length, c=Math.floor((ti-s.root)/E), K=ti-E*c, R=oct+c;
  const a={ A:baseF(), z:s.root, key:0 }, rootF=pitchHz(T,a.A/2,a.z,a.key+K,R);
  return ty.map(ra=>({ f:rootF*ra, iv:ra }));
}
function preT7ChordNotes(deg,oct,s,ty){
  const T=TUNINGS[s.tuning], n=s.iv.length, a={ A:baseF(), z:s.root, key:0 }, d=((deg%n)+n)%n, o=oct+Math.floor(deg/n);
  const rootF=pitchHz(T,a.A/2,a.z,a.key+s.sel[d],o);
  return ty.map(ra=>({ f:rootF*ra, iv:ra }));
}
const preT7ChordUnit=s=>{ if(s.cents) return s.gridChords ? [0] : [1]; return periodOf(s)!==2 ? [1] : [0]; };
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
            cents:(d,v)=> v.fixedKey ? fixedCents(d,v) : Math.round(legacyCentsOf(d,v)) };
/* ⛳ F7: у фиксированного вида, чьи ступени режим аккордов называет ПОРЯДКОВЫМИ (Натуральный в «Свободно», degNaming), показ центов — в
   периоде (верхняя тоника 0), как у каждой нумерованной таблицы; прочие ступени лежат ниже 1200, поэтому опора — прежняя по модулю 1200. */
function fixedCents(d,v){ const r=Math.round(fixedExact(d,v)); return v.degNaming==='ordinal' ? r%1200 : r; }
const allViews=()=>{ const out=[];
  for(const s of SCALES){ if(s.tunable){ out.push([s,'T']); for(let pc=0;pc<12;pc++) out.push([s,pc]); } else out.push([s,'T']); }
  return out; };
function sweep(stage, what, A, B, pick, opt={}){
  const melMax=opt.melMax||(n=>2*n+1), chMax=opt.chMax||(n=>n+1);   // T4b1: прогон по индексу в строе — ступени, которые путь записи может положить (0..n)
  const t0=performance.now(), keepT=tonic, keepA=aRef;
  const bad=[]; let cases=0, nBad=0;
  const miss=msg=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(msg); };
  try{
    /* ⛳ T7b-починка: список видов — с режимом аккордов (opt.views: [лад, «строй от», режим]); единица корня и палитра — ИЗ ВИДА va, а не
       из голого лада: у лада с режимами вид может строить аккорд отношениями («Свободно»), а голый лад — шагами; единица голого ([0])
       на виде, считающем отношения, давала 0 Гц С ОБЕИХ сторон — и сверка молча «проходила» на тишине. */
    for(const [s,tf,cm] of (opt.views || allViews().map(([a,b])=>[a,b,undefined]))){
      const [va,vb]=pick(s,tf,cm), n=s.iv.length, id=s.id+(s.tunable?`[from ${tf}]`:'')+(cm?'#'+cm:'');
      const tys=[[null,false],[null,true],[chordUnit(va),false]];
      for(const f of chordFams(va)) for(const ty of f.types) tys.push([ty.iv,false]);
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
      === по пространству T1.
   ⛳ T7b-починка (строка падала с T7b, 99 360 расхождений — все аккорды Болена–Пирса): с T7b вид НЕСЁТ РЕЖИМ АККОРДОВ (поля режима поверх
   полей лада), а голый лад режима не несёт — «вид звучит как голый лад» стало неверным для ладов с режимами. Теперь опора — голый лад В ТОМ
   ЖЕ РЕЖИМЕ: {...лад, tunedFrom у tunable, ...поля режима (over)} — ровно то, что scaleView накладывает; прогон идёт по КАЖДОМУ режиму
   каждого вида, поля сверяются с той же опорой. */
export function checkView(){
  const bad=[]; let checks=0;
  const ok=(c,m)=>{ checks++; if(!c) bad.push(m); };
  const overOf=(s,cm)=> s.chordModes ? (s.chordModes.find(m=>m.id===cm)||s.chordModes[0]).over : {};
  const refOf=(s,tf,cm)=>({ ...s, ...(s.tunable?{tunedFrom:tf}:{}), ...overOf(s,cm) });   // голый лад в ТОМ ЖЕ режиме аккордов
  const VIEWS=[]; for(const [s,tf] of allViews()) for(const cm of (s.chordModes ? s.chordModes.map(m=>m.id) : [undefined])) VIEWS.push([s,tf,cm]);
  for(const [s,tf] of allViews()){
    const id=s.id+(s.tunable?`[from ${tf}]`:''), v=scaleView(s,tf), ref=refOf(s,tf,chordModeOf(s));
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
      ok(v[k]===ref[k], `${id}: field ${k} differs between the view and the scale in the same chord mode`);
  }
  console.log(`[scaleprobe T2] identity checks ${checks} · mismatches ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T2] '+m));
  const r=sweep('T2',['view','scale'],NEW,NEW,(s,tf,cm)=>[scaleView(s,tf,cm), refOf(s,tf,cm)], { views:VIEWS });
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

function canon(x){
  if(typeof x==='number') return Number.isFinite(x) ? x : Number.isNaN(x) ? '#NaN' : (x>0 ? '#+Inf' : '#-Inf');
  if(x===undefined) return '#undefined';
  if(x===null || typeof x!=='object') return x;
  if(Array.isArray(x)) return x.map(canon);
  const o={}; for(const k of Object.keys(x).sort()) o[k]=canon(x[k]); return o;
}
function snapViews(){ const out=[];
  for(const s0 of SCALES){
    const tfs = s0.tunable ? ['T', ...range(12)] : ['T'], cms = s0.chordModes ? s0.chordModes.map(m=>m.id) : [undefined];
    for(const tf of tfs) for(const cm of cms) out.push({ s0, tf, cm, v:scaleView(s0,tf,cm) });
  }
  return out;
}
/* ═══ ⛳ F4 — P.checkBehaviour(): ПОВЕДЕНИЕ ДАННЫМИ ПРОТИВ ЗАМОРОЖЕННОГО КОДА ДО F4 ═══
   Каждый вид (как у снимка F0): прогрессии и ритм джема (ritm maqsum ⇔ 24 шага); строка статуса на en и ru; и × 12 тоник × ОБА положения
   ухо-переключателя дрона ('cons', 'period') — ступень второй струны дрона целиком (ступень, причина, центы), ===. Тонику и переключатель
   возвращает finally. */
export function checkBehaviour(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic, keepD=droneNonOct();
  const eq=(what,a,b)=>{ cases++; const A=JSON.stringify(canon(a)), B=JSON.stringify(canon(b)); if(A!==B) miss(`${what}: ${A} now, ${B} before F4`); };
  try{
    for(const {v} of snapViews()){ const id=viewIdOf(v);
      eq(`${id} progressions`, supportsProgressions(v), preF4Progressions(v));
      eq(`${id} maqsum backing`, backingRhythmOf(v)==='maqsum', preF4Maqsum(v));
      for(const lg of ['en','ru']) withLang(lg,()=>eq(`${id} ${lg} status`, tuningStatus(v), preF4Status(v)));
      for(const sw of ['cons','period']){ setDroneNonOct(sw);
        for(let tn=0;tn<12;tn++){ setTonic(tn); eq(`${id} drone [${sw}] tonic ${tn}`, droneDegree(v), preF4DroneDegree(v)); } }
    }
  } finally { setTonic(keepT); setDroneNonOct(keepD); }
  console.log(`[scaleprobe behaviour] ${snapViews().length} views · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe behaviour] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe behaviour] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe behaviour] drone, progressions, backing rhythm and status line read from data equal the pre-F4 code');
  return { cases, total:nBad, differences:bad };
}
export { isUserId, SCALES, TUNINGS, CHORD_FAM_SETS, userCount, tagOf, isTert, legacyChordLabel, legacyChordNotesStr, legacyChordNotesRef, preF3RegWord, preF3RegWordFull, preF3RootName, preF3StepName, preF3RowLabel, preF3ChordLabel, preF3ChordNotesStr, preF3NoteLbl, preF3AxisLbl, preF4Status, PRE_T7_SETS, preT7ChordNotesAt, preT7ChordNotes, preT7ChordUnit, legacyLeadFreq, legacyBassFreq, legacyChordNotes, A4_SET, PRINT_MAX, OLD, allViews, sweep, canon, snapViews, KEEP_MAX };
/* ═══ ED4 — P.checkDegrees(): TRANSPOSE BY DEGREES (scales.shiftDegrees) against a reference written here by ABSOLUTE tuning steps ═══
   Every view × every tuning index of one period plus the top tonic (in the mode and out of it) × registers 0..3 × n = ±1..±9, ±(mode size),
   ±(mode size + 1): the result equals the reference — the nearest mode pitch by absolute steps (a tie takes the lower), moved n degrees,
   plus the same offset (user decision 5); it is written inside one period (the top tonic of the last register as the editor's top row).
   In the mode the degree is exactly degree + n (modeSlotOfTi) and −n brings the pitch back. Pure arithmetic, nothing plays. */
export function checkDegrees(){
  const bad=[]; let cases=0, views=0, offMode=0, ties=0; const miss=m=>{ if(bad.length<KEEP_MAX) bad.push(m); };
  for(const [s0,tf] of allViews()){
    const v=scaleView(s0,tf), n=v.iv.length, T=tuningOf(v), E= T.equal!=null ? T.equal : T.cents.length, R0=v.root, id=v.id+(v.tunable?`[from ${tf}]`:'');
    views++;
    const abs=(d,r)=>tuningIndexOf(d,v)+E*r;
    const ref=(A,k)=>{ const r0=Math.floor((A-R0)/E); let bd=-1, br=0, bD=Infinity;
      let tie=false;
      for(let r=r0-1;r<=r0+1;r++) for(let d=0;d<n;d++){ const x=Math.abs(A-abs(d,r)); if(x===bD) tie=true; if(x<bD || (x===bD && abs(d,r)<abs(bd,br))){ if(x<bD) tie=false; bD=x; bd=d; br=r; } }
      if(bD>0){ offMode++; if(tie) ties++; }
      const D=bd+k; return abs(((D%n)+n)%n, br+Math.floor(D/n)) + (A-abs(bd,br)); };
    const ks=[1,2,3,4,5,6,7,8,9,n,n+1];
    for(let j=0;j<=E;j++) for(let o=0;o<REG_N;o++) for(const k0 of ks) for(const k of [k0,-k0]){
      const ti=R0+j, A=ti+E*o, p=shiftDegrees(ti,o,v,k), at=`${id} index ${ti} reg ${o} by ${k}`; cases++;
      if(!p){ miss(`${at}: no result`); continue; }
      const got=p.ti+E*p.oct, w=ref(A,k);
      if(got!==w){ miss(`${at}: ${p.ti}/${p.oct} (abs ${got}), reference abs ${w}`); continue; }
      const top= p.oct===REG_N-1 && p.ti===R0+E;
      if(!top && (p.ti<R0 || p.ti>=R0+E)) miss(`${at}: index ${p.ti} is not inside one period`);
      const m=modeSlotOfTi(ti,o,v);
      if(m && m.deg<n){ const q=modeSlotOfTi(p.ti,p.oct,v), D=m.deg+k, wd=((D%n)+n)%n, wo=o+Math.floor(D/n);
        const qd= q && (q.deg===n ? 0 : q.deg), qo= q && (q.deg===n ? q.oct+1 : q.oct);
        if(!q || qd!==wd || qo!==wo) miss(`${at}: degree ${m.deg} → ${q?q.deg+'/'+q.oct:'off the mode'}, intended ${wd}/${wo}`);
        else { const b=shiftDegrees(p.ti,p.oct,v,-k); cases++; if(!b || b.ti+E*b.oct!==A) miss(`${at}: and back by ${-k} gives ${b?b.ti+'/'+b.oct:'nothing'}`); } }
    }
  }
  /* CONTROL: the sweep must hold out-of-mode pitches and nearest-degree ties, or it could not test decision 5 and its tie rule */
  if(!offMode||!ties) miss(`control: the sweep holds ${offMode} out-of-mode cases and ${ties} ties — decision 5 untested`);
  console.log(`[scaleprobe ED4] views ${views} · cases ${cases} (out of the mode ${offMode}, of them ties ${ties}) · differences ${bad.length}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED4] '+m));
  if(!bad.length) console.log('[scaleprobe ED4] every pitch moves exactly n degrees of its mode; an out-of-mode pitch keeps its offset from the nearest degree; −n brings a mode pitch back');
  return { views, cases, total:bad.length, differences:bad };
}
