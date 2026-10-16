/* REC5 (stage 3) — THE ENGINE TABLE: makeENG (one dispatch table for live play, replay and the render copy), the live ENG, and the
   event pricing at play time (evHz, evTi, evReg) — moved from recorder.js (which re-exports them — a facade). Moved verbatim. */
import { CUR, baseF, bassFreqTi, chordFreqsAt, leadFreqTi, modeSlotOfTi, tuningIndexOf } from '../scales.js';
import { leadIdx, seventh } from '../state.js';
import { bassOff, bassOn, bassSet, leadOff, leadOn, leadSet } from '../audio.js';
import { bassOwnerKey, chOwnerKey, ldKey } from '../song/notes.js';
import { secPerBeat } from '../transport/clock.js';
import * as AUD from '../audio.js';

/* ENG — единая точка исполнения (живьём через W* и на переигровке). deg→частота
   выводится ЗДЕСЬ. Ладовый КОНТЕКСТ: живьём (ctx нет) — текущий лад/септаккорд;
   на переигровке ctx=событие с ЗАМОРОЖЕННЫМ ладом (ev.sc) и септаккордом (ev.sev),
   §3.4. baseF() всегда живой → тоника глобальна, лад заморожен. leadFreq/bassFreq
   сами страхуют ступень вне лада (модуло+октава), так что частота не улетает в NaN.
   Владелец голосов ПО СЛОЮ (ctx=событие переигровки): аккорд — 'loop:'+layer / живой
   'latch'; бас — 'bassloop:'+layer / живой 'bass'. Так слой не крадёт голос у живого. */
/* ⛳ ЕДИНАЯ ФОРМА ВЫЗОВА: КАЖДАЯ запись ENG — это (a, ctx, opt), где opt — ОДИН И ТОТ ЖЕ ИМЕНОВАННЫЙ
   набор `{when, live, own}`. Слайс S2 завёл эту форму, и это НЕ косметика, а снятие ловушки.
   ⚠️ ЧТО БЫЛО: у записей была РАЗНАЯ позиционная форма — `leadOn:(a,ctx,live,own)` против
   `chOn:(a,ctx,when)` и `bassOn:(a,ctx,when,live)`, — а диспетчер планировщика зовёт их ОДИНАКОВО:
   `ENG[ev.fn](ev.a, ev, when)`. Пока лид шёл мимо планировщика (fireNear), это сходило с рук. Но стоило
   бы завести лид в планировщик — и ВРЕМЯ В СЕКУНДАХ легло бы в слот ЖИВЫХ ГЕРЦ терменвокса: нота
   зазвучала бы на абсурдной высоте или не зазвучала вовсе. Тихо, правдоподобно, ищется долго.
   ⚠️ ПОЧЕМУ НЕ ХВАТИЛО БЫ «поставить when последним у всех». У лида кроме when есть ещё live и own,
   поэтому третий позиционный слот У РАЗНЫХ записей всё равно значил бы разное — в каком порядке ни
   расставляй. Ловушка позиционная ПО ПРИРОДЕ, и лечится она только снятием позиционности: у
   дополнительных аргументов больше НЕТ номеров, есть ИМЕНА. Время может попасть в `live` теперь лишь
   у того, кто СОБСТВЕННОРУЧНО напишет слово `live`, — то есть ошибка стала невыразимой, а не
   несовершённой.
   ⚠️ live (живые Гц терменвокса) остаётся ОТДЕЛЬНЫМ полем и ЖИВЫМ-ТОЛЬКО (правило #11): переигровка
   его не передаёт никогда, частота там выводится из ступени по замороженному ладу.
   ⛔ Добавляешь запись в ENG — держи ту же форму. Второй формы здесь быть не должно. */
/* ⛳ ТАБЛИЦА ДИСПЕТЧЕРИЗАЦИИ — ТЕПЕРЬ ФАБРИКА (слайс F3), А НЕ ЛИТЕРАЛ.
   Причина одна: офлайн-рендер обязан звать ТЕ ЖЕ отображения «событие → вызов движка», но у ДРУГОЙ
   копии движка (своей, против своего контекста). Второй такой таблицы писать нельзя — она бы
   разошлась с этой, и замороженная дорожка зазвучала бы иначе, чем её играет транспорт. Поэтому
   таблица параметризована модулем звука: живая — makeENG(AUD), рендерная — makeENG(своя копия).
   ⚠️ ТЕЛА ЗАПИСЕЙ НЕ ТРОНУТЫ — добавлен только префикс A. у функций звука. Ключи владельцев
   (ldKey/chOwnerKey/bassOwnerKey), замороженный лад и loop.bpm остаются здешними: они про ЗАПИСЬ,
   а не про движок, и у обеих копий обязаны быть одни и те же. */
/* ═══ T4b1: ЗВУК ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   Таблица ниже цены соло и баса берёт из a.ti (scales.leadFreqTi/bassFreqTi — та же функция высоты, побитно та же цена; проба
   P.checkSound), аккорда — через chordFreqsAt (из индекса — там, где это побитно то же, иначе по ступени: см. её шапку).
   ⛳ ОТКУДА ИНДЕКС: у события — a.ti (T4a, три воронки записи). ЖИВОЙ вызов (W*, ctx==null) несёт нагрузку жестов — у неё индекса нет:
   переводим ступень той же функцией T4a (tuningIndexOf, живой вид CUR) — это не запасной путь, а сама цена живой ноты.
   ⛳ T4c-2: у ЗАПИСАННОГО события — только a.ti (ступени в событии нет); у ЖИВОЙ нагрузки жестов (ctx==null) — её ступень лада,
   переведённая той же функцией записи: это вход жестов, а не запасной путь. Без индекса цена — не число, и таблица ниже атаку пропускает. */
function evTi(a,ctx,chord){ return ctx ? a.ti : tuningIndexOf(a.deg, CUR(), chord); }
/* ⛳ T4c-1: ЦЕНА СОБЫТИЯ ДЛЯ ЗВУКА — ОДНА ЧИСТАЯ ФУНКЦИЯ на роль (соло 'ld', бас 'bs' — частота; аккорд 'ch' — частоты нот). Её зовут
   таблица ENG и проба P.checkStrip — второй формулы нет. Читает a.ti, a.oct, a.ty и вид/септаккорд контекста; ступень — только у ЖИВОЙ
   нагрузки (evTi). Нет цены (нет индекса, высоты нет в ладу) — соло/бас NaN, аккорд — пустой список: таблица атаку пропускает. */
/* TF0 control (probe only): one track priced off by a few cents — the song fingerprint must catch it. null = off (the normal path). */
let EVHZ_DBG=null;
const evHzDbg=(layer,cents)=>{ EVHZ_DBG= layer==null ? null : { layer, r:Math.pow(2,cents/1200) }; };
function evHz(a,ctx,role){
  const f=evHz0(a,ctx,role), D=EVHZ_DBG;
  return D && ctx && ctx.layer===D.layer ? (Array.isArray(f) ? f.map(x=>x*D.r) : f*D.r) : f;
}
function evHz0(a,ctx,role){
  const sc=ctx?ctx.sc:CUR(), ti=evTi(a,ctx,role==='ch');
  if(role==='ld') return leadFreqTi(ti,a.oct,sc);
  if(role==='bs') return bassFreqTi(ti,a.oct,sc);
  return chordFreqsAt(ti,a.oct,sc,ctx?ctx.sev:seventh,a.ty);
}
/* ⛳ T4c-1: МЕСТО ГОЛОСА В РЕЕСТРЕ (leadHold/bassHold: deg/oct — для подсветки). Живой вызов — ступень жеста, как была (подсвечивает
   только живые ключи, правило #26); переигранный — место индекса в ладу события (обратная выборка), а не записанная ступень. */
function evReg(a,ctx){
  if(!ctx) return { deg:a.deg, oct:a.oct };
  return modeSlotOfTi(evTi(a,ctx,false), a.oct, ctx.sc) || { deg:undefined, oct:a.oct };
}
const okHz=f=>typeof f==='number' && Number.isFinite(f);
const makeENG=A=>({
  /* ⚠️ setLeadInstr(a.inst) ОТСЮДА УБРАН, и это ПОЧИНКА, а не потеря: переигранный слой уводил ЖИВОЙ
     инструмент (и кнопку в панели) — слой на Ситаре молча перекрашивал руку, играющую Органом. Теперь
     тембр печётся В ГОЛОСЕ на атаке (leadOn получает inst), как это давно делают аккорды и бас. */
  leadOn:(a,ctx,{when,live,own}={})=>{ const o=own||ldKey(ctx,a);
              /* live — ЖИВОЙ override частоты (терменвокс): непрерывные Гц вместо ступенной leadFreq.
                 Только на ЖИВОМ пути (WleadOn); переигровка зовёт ENG без live → частота из leadFreq по
                 замороженному ладу (полимодальность цела). */
              const base=evHz(a,ctx,'ld');           // T4c-1: цена — из индекса в строе (одна функция с пробой)
              if(live==null && !okHz(base)) return;  // T4c-1: нет индекса — ноты нет
              if(ctx)A.leadCancel(o,when);           // атака переигранной ноты на голосе, ЕЩЁ удержанном ТЕМ ЖЕ владельцем: снять рампы его прошлого бенда (не перетечёт) — в своём голосе и в то же время, что атака. ⛳ S5: голос, выданный НОВОМУ владельцу, чистит сам audio.leadOn (флаг handed) — здесь этот случай не ловился (голоса у ключа ещё не было)
              const gl=A.applyFx(a.fx);   // КАРТА ЭФФЕКТОВ ЭТОГО СОБЫТИЯ (3.7.2). Нет карты (события аранжировки) → applyFx возьмёт ТЕКУЩУЮ цепь роли, а не нейтраль. V4: заодно отдаёт СКОЛЬЖЕНИЕ ноты (или undefined — не задано)
              /* ⛔ V4, КОНТРАКТ V1: живой кадр ТЕРМЕНВОКСА (live!=null) скольжения НЕ получает — его 20 мс это сглаживание слежения, а не
                 портаменто; руке с долгим Скольжением высота отставала бы от руки. Свежую атаку отсекает сам движок (fresh → умолчание). */
              A.sympBase(ctx&&ctx.sc ? baseF(ctx.sc) : null);   // TF2: sympathetic strings of a replayed note follow its view's key; live — the live key
              const g=evReg(a,ctx); A.leadOn(o,(live!=null?live:base),a.vol,a.inst===undefined?leadIdx:a.inst,g.deg,g.oct,live!=null?undefined:gl,a.tie,when);   // время — в слоте when   // deg/oct — не для звука (частота уже посчитана), а для ПОДСВЕТКИ: leadHold знает, что звучит
              if(a.bend&&a.bend.length)A.scheduleBend(o,a.bend,base,secPerBeat(),a.bendFrom||0,when); },   // BEND-CURVE: bendFrom — the chase enters the curve late (chaseNote)   // переигровка: кривая бенда поверх ступени замороженного лада, в СВОЙ голос, с якорем в момент атаки
  leadSet:(a,ctx,{when,own}={})=>{ const o=own||ldKey(ctx,a);
              const gl=A.applyFx(a.fx);   // V4: скольжение ведения — из ЕГО карты (карта ведения несёт величину на миг ведения: сдвинул палец посреди ноты — следующий переезд уже с новой)
              const f=a.hold?null:evHz(a,ctx,'ld'); if(f!==null && !okHz(f)) return;   // T4c-1: нет индекса — ведения нет
              A.sympBase(ctx&&ctx.sc ? baseF(ctx.sc) : null);   // TF2: a bank built mid-note (timbre change) tunes to the note's key
              const g=evReg(a,ctx); A.leadSet(o,f,a.vol,g.deg,g.oct,a.inst,gl,when); },   // T4b1: цена — из индекса в строе   // ведение терменвокса (hold) частоты не несёт — скольжению там применяться не к чему   // T0-fix: a.inst — смена тембра ПОСРЕДИ НОТЫ, как она прозвучала живьём (кроссфейд банков голоса; см. audio.leadSet)   // live здесь не читался никогда: ведение терменвокса идёт через hold:true (частоту не сбиваем), а не через override
  leadOff:(a,ctx,{when,own}={})=>A.leadOff(own||ldKey(ctx,a),a&&a.tie,when),   // V2: tie ПЕРЕД when (правило #15)   // a.tie (T3) — нота продолжена в другой дорожке после смены тембра: быстрый релиз
  /* when — ЯВНОЕ время (опережение лупера, §планировщик). Живой путь (W*) зовёт без when → undefined
     → аудио-функции берут AC.currentTime (сейчас), байт-в-байт. Переигровка слоёв передаёт точное время. */
  chOn:(a,ctx,{when}={})=>{ const F=evHz(a,ctx,'ch'); if(F.length) A.chordOn(chOwnerKey(ctx),F,a.vol,a.inst,a.bri,when); },   // T4c-1: цена — из индекса корня (evHz); нот нет — атаки нет   // T4b1: типизированный — из индекса корня; без типа — по ступени (терции/пауэр — T6)   // a.bri — пер-событийная яркость (0=нейтраль); when остаётся ПОСЛЕДНИМ (планировщик)
  chSet:(a,ctx,{when}={})=>{ const F=evHz(a,ctx,'ch'); if(F.length) A.chordGlide(chOwnerKey(ctx),F,a.vol,a.bri,when); },
  chOff:(a,ctx,{when}={})=>A.chordOff(chOwnerKey(ctx),when),
  /* ⛳ V4: СКОЛЬЖЕНИЕ БАСА — ИЗ КАРТЫ СОБЫТИЯ, И ОТСУТСТВИЕ КАРТЫ ЗНАЧИТ «НЕ ЗАДАНО» (умолчание движка BASS_GLIDE_TC), а НЕ
     «возьми живую цепь». Карту бас несёт ТОЛЬКО при прицепочном параметре в цепи баса (gestures), поэтому ей нет у всего
     записанного без Скольжения, у подложки (arrange строит нагрузку сам) и у нот, вставленных в редакторе. Правило соло
     «нет карты → текущая цепь» здесь заставило бы басовую линию подложки скользить так, как сейчас стоит рука, — ровно
     довод яркости аккордов (fxChordBri). Кадр терменвокса (live) скольжения не получает — контракт V1. */
  bassOn:(a,ctx,{when,live,own}={})=>{ const f=live!=null?live:evHz(a,ctx,'bs'); if(!okHz(f)) return; const g=evReg(a,ctx); A.bassOn(own||bassOwnerKey(ctx),f,a.vol,a.inst,g.deg,g.oct,live!=null?undefined:A.fxGlideOf(a.fx),A.fxBriOf(a.fx),when); },   // ЯРКОСТЬ — из карты; нет карты — «не задана» (правило баса), звук как сегодня   // P1: deg/oct — для подсветки из реестра движка (как у leadOn); when ПОСЛЕДНИМ (правило #15)   // live — живой override Гц (терменвокс-бас), как у leadOn; переигровка без него → bassFreq (полимодальность цела)
  bassSet:(a,ctx,{when}={})=>{ const f=evHz(a,ctx,'bs'); if(!okHz(f)) return; const g=evReg(a,ctx); A.bassSet(bassOwnerKey(ctx),f,a.vol,g.deg,g.oct,A.fxGlideOf(a.fx),A.fxBriOf(a.fx),when); },   // ЯРКОСТЬ ведения — своя величина события. V4: скольжение — из карты ведения; нет карты — BASS_GLIDE_TC, та же, что у живого баса без Скольжения
  bassOff:(a,ctx,{when,own}={})=>A.bassOff(own||bassOwnerKey(ctx),when),   // P2: own — живой владелец (WbassOff), как у leadOff; переигровка его не передаёт — ключ из события
  drum:(a,ctx,{when}={})=>{ if(ctx) A.hitOwner('hit:'+ctx.layer); A.drumHit(a.row,a.vol,a.kit,A.fxBriOf(a.fx),when); },   // MX1: ключ удара — для уровня дорожки (у копии рендера множитель всегда 1)   // ЯРКОСТЬ удара — из его карты (карта есть, только когда в цепи ударных есть прицепочный параметр); нет — удар как сегодня
  drone:(a,ctx,{when}={})=>{ if(ctx) A.dronePan(A.ownerPan('drone:'+ctx.layer),when); A.droneUse(ctx?ctx.sc:null); A.droneOn(a.lvl*(ctx?A.ownerGain('drone:'+ctx.layer):1),when); },   // MX2: панорама дорожки дрона (у копии рендера — панорама дорожки, которую рендерят)   // MX1: × уровень дорожки дрона (у копии рендера — 1)        // дрон: выделенные узлы, гасится по жизненному циклу (не в softAllOff)
});
const ENG=makeENG(AUD);   // ЖИВАЯ таблица — против живой копии движка. Поведение прежнее дословно

export { evHzDbg, evHz, evReg, makeENG, ENG };
