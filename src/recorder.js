import { AC, setLeadInstr, applyFx, scheduleBend, leadCancel, leadOff, leadAllOff, leadHold, chordOn, chordGlide, chordOff, chordHold, bassOff, bassHold, drumHit, droneOn, droneOff, fxParamKeysOf, fxParamMetaOf, fxDefaultsOf, fxIsPerNote, fxNoteField, fxNoteFollows, fxPerm } from './audio.js';   // fxNoteFollows — гладкая автоматизация: писать ли ведения рампы внутри зажатой ноты   // fxPerm — VOL-0: постоянная запись цепи (громкость) — ни в сводке захвата, ни на полосе, ни в цепи дорожки редактора   // V4b: параметр «в ноте» (полоса читает и правит его В НОТАХ) и где он лежит в событии   // F4: makeFrozenBus — шина замороженной дорожки (гейн прямо в мастер)
import { aRef, setARef, scaleId, leadIdx, chIdx, bassIdx, drumKitIdx, seventh, tonic, setTonic, tonicCents, tunedFrom, setLatchDeg, setLatchTy, chainKeyOf, FX_VOL } from './state.js';   // FX_VOL — VOL-3: полоса громкости у каждой дорожки   // F5: tonic/aRef/лад (scaleId с F1) — в ПОДПИСЬ СВЕЖЕСТИ замороженной дорожки (рендер их приколачивал, значит их смена делает буфер устаревшим)
import { modeSlotOfTi, scaleView } from './scales.js';   // typedChords/chordFams (тип вставленного аккорда, S2) сняты в U5 — вставка без выделения кладёт единицу корня. chordNotes — U2: ноты аккорда (для распада при правке одной ноты). chordUnit — U4: каноническая форма ноты на ряду (однонотный тип = сам корень)
import { REC_VOL_EPS, REC_REV_EPS, volAmp } from './config.js';   // volFromOld — VOL-2b: громкость вставленной ноты в новой шкале
import * as AUD from './audio.js';   // F3: ИМЕНОВАННОЕ ПРОСТРАНСТВО того же модуля — только чтобы makeENG могла получить ЛЮБУЮ копию движка (живую или рендерную). Именованные импорты выше остаются, это тот же самый модуль
import { hooks } from './hooks.js';
import { activeKind } from './clip.js';   // S5.0: редактор не открывается поверх идущей записи клипа. Отказ живёт ЗДЕСЬ, рядом с прочими (см. editOpen), а не в ui. Цикла нет: clip тянет audio/state/vision/i18n и НИКОГДА recorder
import { events, schedInvalidate, compactEvents, evSeqFill, evOrder, evRole, evIdFloor } from './song/store.js';   // REC1: the song's event store (recorder re-exports what others read)
import { chOwnerKey, bassOwnerKey, ldKey, songNotes, notesReset, viewAudit, editViewCheck, songSegs } from './song/notes.js';   // REC2: the song as notes, owner and chase keys, view checks
import { onApplied, histNote, histWire, histKind, histApply as editApply, histTouched, histPush, histSeal, histHash, histReset, histCanUndo, histCanRedo, histLen, histTopLabel, histUndo, histRedo, histTab, histMaster, laneNameStep, moveLaneStep, histPeek, histOffAdd, histOffNow, histDbg, histDbgO } from './song/history.js';   // REC2: the one history (ED7); step kinds register with it
import { chordMoveTy, editBackingOpen, editCanRedo, editCanUndo, editCommit, editDeleteHit, editDeleteSeg, editGuard, editMoveHit, editMoveSeg, editResizeSeg, segChordNotes, tiePartners, untieAcross, editWire } from './song/edit-notes.js';   // REC3: the editor's edit core and note edits
import { editDeleteChordNote, editMoveChordNote, editResizeChordNote } from './song/edit-chords.js';   // REC3: chord-note edits (dissolve)
import { editDeleteSel, editMoveSel } from './song/edit-group.js';   // REC3: group edits (ED1)
import { laneId, laneMute, laneSolo, laneLevel, lanePan, laneLenOf, laneEditVer, laneVerBump, laneEditVerOf, laneNew, laneOf, laneForget, laneTablesClear, laneLayerOf, armedLayer, toggleArm, laneDelTap, laneDelCancel, laneDelPendingLayer, laneAudible, laneLevelOf, laneGainOf, layerOfOwner, lanePanOf, laneNameOf, setLaneName, laneOrder, moveLane, laneShowKeep, laneLook, laneMuted, laneSoloed, laneSoloOn, laneRow, laneRowSet, laneWire } from './song/lanes.js';   // REC1: the track tables
import { takeNext, takeSeqFloor, takeFx, takeFxTouch, laneIdFloor, FX_CHAIN, setAutRecSmooth, fxLaneExpand, laneRoleOf, captureInfoOf } from './song/capture.js';   // REC3 part 2: capture records, lane law, track role
import { envWire } from './song/env.js';
import { songData, songPlan } from './song/file.js';   // SAVE1: the song ↔ its file record   // REC3 part 2: the song layer's environment (wired below)
import { bendDbg, autAddrs, bendEdited, editBendPoint, editBendShape, pnBars, editVolSel, takeFxDump, autPoints, autMovePoint, autDeletePoint, autAddPoint, autShapePoint, autCurvePoint, autChainOf, autChainAdd, autChainRemove, autChainMove } from './song/automation.js';   // REC3 part 2: automation and per-note lanes, bends, volume bars, track chain edits
import { editTakeReset, editInsertBass, editInsertLead, editInsertChord, editInsertHit, laneTimbreOf, editSetTimbre } from './song/edit-insert.js';   // REC3 part 2: inserts, session take, timbre
import { editDegreeWhy, trackViewOfLayer, editTrackModeWhy, editTrackMode, trDbg, editTransposeWhy, editTranspose, songTransposeWhy, songTranspose, editDegreeSel } from './song/transpose.js';   // REC3 part 2: degrees, mode, semitones
import { editQuantSel } from './song/quantise.js';   // REC3 part 2: quantise (ED3)
import { editCopySel, editClipInfo, editPasteWhy, editPaste, editDuplicateSel } from './song/clipboard.js';   // REC3 part 2: clipboard (ED2)
import { secDbg, secMarks, secMarksSet, secCopy, sections, songEditWhy, songEdit, secAdd, secRename, secDelete, songCanUndo, songCanRedo, songUndo, songRedo, songHistReset } from './song/sections.js';   // REC3 part 2: sections (ED6)
import { clockWire, secPerBeat, beatNow, timeAt, secOf, beatsOf, loop, songLen, songBeats, cycling, songAt, rgnApply, regionOn, braceProbe, setRegionOn, braceTap, braceMove, braceSet, beatLevel, loopPos, setLoopBars, METRES, setLoopMetre, setLoopQuant, SUBS, setLoopSub, setLoopBpm } from './transport/clock.js';   // REC4: the transport clock (loop, song length, brace, metre, setters)
import { freezeWire, frzWatchBump, frzPend, frozen, frzLayer, frzHas, frzBufNow, frzGlobalKey, frzSigMemo, frzSigTonicDbg, freezeSig, freezeState, freezePinCaptures, frzWatchKey, frzRetuneOnly, laneHasChain, frzBytesTotal, frzBytesOf, songPinChains, freezeTicket, freezeSet, frzPendCancel, frzWhenReady, frzReadersAlive, frzSwapDbg, FRZ_CHUNK, frzStoreMode, frzPackAsync, frzChunkDbg, frzNodesInfo, frzSwapCancelAll, frzSwapInfo, freezeDrop, unfreezeLayer, frozenLayers, frozenInfo, frzGain, frzGainAll, frzBusGain, frzStopAll } from './freeze/registry.js';   // REC5: the freeze registry, signature, 16-bit store, swap and seams
import { schedWire, chaseReset, clearPump, releaseLoopLayersAt, chaseFor, chaseNote, chasePlay, startTransport, seekTo } from './transport/scheduler.js';   // REC4: the scheduler (cursors, look-ahead, chase, near-fire, tick, start, seek)
import { evHzDbg, evHz, evReg, makeENG, ENG } from './live/eng.js';   // REC5: the engine table ENG (makeENG) and the event pricing evHz
import { recWire, recording, recBass, takeSt, takeJoin, takeSrc, nextFreeLayer, pushLy, recLayers, isRecLayer, curTake, curTakeSet, recWinReset, inPB, push, noInst, recLeadReset, recFoldRoll, recAllOff, recDrop, wTapSet, WleadOn, WleadOff, liveChClear, WchOn, WchSet, WchOff, latchOpenAt, recLatchOpen, WbassOn, WbassOff, WdrumHit, setRecording, recStop, onRec } from './live/record.js';   // REC5: live recording (take routing, push, rec*, W*, record start / stop)
import { backingWire, loadArrangement, loadJam, backingEvent, clearJam } from './live/backing.js';   // REC5: backing (arrangement load, jam, clear)
import { capRecordNow, capReset, takeCapStart, fineNew, fineReset, fineStep, pnSnap, takeCapSample, fxLaneMerge, fxPlayDrive, fxPlayDriving, fxIsDriven, fxPlayStop, liveIso, setLiveIsolation, playKeyOf } from './live/capture.js';   // REC5: capture sampling, the fine-recording automaton, effect playback, live isolation
/* REC3 part 2: what song/ needs from above — the engine's effect declarations and the chain key (more entries join as code moves) */
backingWire({ snapBegin:(...a)=>snapBegin(...a), snapEnd:(...a)=>snapEnd(...a), capStart:tk=>takeCapStart(tk), droneSync:(...a)=>droneSync(...a),
  lanePrune:()=>lanePrune(), softAllOff:()=>softAllOff(), droneActive:()=>droneActive(), clearRec:()=>clearRec() });   // REC5
recWire({ fineStep:(...a)=>fineStep(...a), fineReset:(...a)=>fineReset(...a), fineNew:(...a)=>fineNew(...a), pnSnap:(...a)=>pnSnap(...a),
  takeBegin:()=>takeBegin(), takeEnd:()=>{ const t=takeTok; takeTok=null; snapEnd(t); }, editIsOpen:()=>editIsOpen(), laneReset:()=>laneReset(),
  capStart:tk=>takeCapStart(tk) });   // REC5
schedWire({ recording:()=>recording, curTake:()=>curTake, latchOpenAt:()=>latchOpenAt, chordHlOff:()=>{ curChordDeg=-1; },
  setLoopChordHl:(...a)=>setLoopChordHl(...a), takeCapSample:(...a)=>takeCapSample(...a), fxPlayDrive:(...a)=>fxPlayDrive(...a),
  fxPlayStop:()=>fxPlayStop(), noInst:(...a)=>noInst(...a), recLeadReset:()=>recLeadReset(), recFoldRoll:()=>recFoldRoll(),
  recLatchOpen:()=>recLatchOpen() });   // REC4 — recBass and ENG are wired where ENG is declared
freezeWire({ capStart:(...a)=>takeCapStart(...a), droneSync:(...a)=>droneSync(...a), droneSyncAt:(...a)=>droneSyncAt(...a),
  release:(...a)=>releaseLoopLayersAt(...a), chasePlay:(...a)=>chasePlay(...a) });   // REC5
clockWire({ recording:()=>recording, release:(...a)=>releaseLoopLayersAt(...a), swapCancelAll:()=>frzSwapCancelAll(), chasePlay:(...a)=>chasePlay(...a) });   // REC4
envWire({ fxPerm, fxParamMetaOf, fxNoteField, fxParamKeysOf, fxDefaultsOf, fxNoteFollows, fxIsPerNote, FX_VOL, chainKeyOf,
  fxSnapshot:key=>AUD.fxSnapshot(key), live:()=>({ leadIdx, chIdx, bassIdx, drumKitIdx, tunedFrom, tonic, seventh,
    leadTim:AUD.timbreKey('ld',leadIdx), chTim:AUD.timbreKey('ch',chIdx), bassTim:AUD.timbreKey('bs',bassIdx), kitTim:AUD.timbreKey('dr',drumKitIdx) }),   // TIM2: the live timbres as ids (editor inserts)
  /* SAVE1: what the song file reads from above — settings and the live scale, live chain snapshots, timbre ids and copies */
  songEnv:()=>({ aRef, bpm:loop.bpm, metre:loop.metre, bars:loop.bars, sub:loop.sub, quant:!!loop.quant, master:AUD.masterLevel(),
    brace:{ user:!!loop.rgn.user, from:loop.rgn.from, to:loop.rgn.to, on:!!loop.rgn.on }, live:{ scaleId, tonic, tonicCents, tunedFrom } }),
  soloSnap:()=>AUD.fxSnapshot(chainKeyOf('ld')), capNow:()=>capRecordNow(), timSnap:id=>AUD.timbreSnapshot(id), timRecord:id=>AUD.timbreRecord(id),
  timKnown:(r,id)=>AUD.timbreIdx(r,id)!==undefined, timKey:(r,x)=>AUD.timbreKey(r,x),
  timByDef:(r,def)=>{ const k=JSON.stringify(def); for(const x of AUD.timbresOf(r)){ const q=AUD.timbreSnapshot(x.id); if(q && JSON.stringify(q.def)===k) return x.id; } return null; },
  ready:()=>!!AC, af:kind=>{ if(hooks.af) hooks.af(kind); }, recording:()=>recording, pause:()=>{ if(loop.on) onLoop(); },
  metre:()=>loop.metre, sub:()=>loop.sub, bpm:()=>loop.bpm, pos:()=>loop.pos, brace:()=>loop.rgn, seek:b=>seekTo(b),
  braceRestore:s=>{ loop.rgn.user=s.user; rgnApply(s.from, s.to, loop.rgn.on); }, capStart:tk=>takeCapStart(tk), laneEditTouch:()=>laneEditTouch() });   // closures: those are declared further down

/* ================= ЗАПИСЬ И ЛИНЕЙНЫЙ ТРАНСПОРТ =================
   ⛳ ЗДЕСЬ ПРОИЗОШЛА СМЕНА МОДЕЛИ (слайс S3.3). Раньше приложение было ЛУПЕРОМ: время события
   сворачивалось в петлю (`t = e % loopBeats`), а всё поведение висело на ЗАВОРОТЕ. Теперь это
   ЛИНЕЙНЫЙ МНОГОДОРОЖЕЧНЫЙ РЕКОРДЕР: время события — АБСОЛЮТНЫЕ ДОЛИ ОТ НАЧАЛА ПЕСНИ, песня
   играет от позиции до конца материала и ОСТАНАВЛИВАЕТСЯ. Заворота НЕТ ВООБЩЕ.
   ⚠️ ПЕТЛИ СЕЙЧАС НЕТ НИ В КАКОМ ВИДЕ, и это ожидаемое состояние после этого слайса, а не потеря:
   зацикливание вернётся СЛЕДУЮЩИМ слайсом — как ОБЛАСТЬ на таймлайне («от такта до такта»), то есть
   с обратной полярностью: раньше петлёй было всё, теперь ею будет выбранный кусок.
   Событие — НАМЕРЕНИЕ, не кадр: время в АБСОЛЮТНЫХ ДОЛЯХ (t ≥ 0 от начала песни),
   высота — СТУПЕНЬ+ОКТАВА (deg/oct); частота выводится на исполнении через
   leadFreq/chordFreqs → запись перестраивается под текущий строй (§3.7).
   Пишем по изменению (дискретное — при смене, непрерывное — за мёртвой зоной),
   так кадровый лог (~60/с) схлопывается в горстку точек на ноту.
   Схема события: {t, layer, fn, a} — ПОЛЕЙ НЕ ПРИБАВИЛОСЬ И НЕ УБАВИЛОСЬ, сменился только СМЫСЛ t.
   ⚠️ S3.5d ПРИБАВИЛ ОДНО: tk — номер ВЗЯТОГО (см. takeSeq). Его несёт КАЖДОЕ событие.
   layer — дорожка (единица отмены).

   ТРАНСПОРТ. Один насос по часам AudioContext везёт позицию вперёд: доля = (now−t0)·bpm/60, где
   t0 — время НАЧАЛА ПЕСНИ (доля 0). Живой ввод идёт через W* (звук сразу + запись, если вооружено),
   переигровка зовёт ENG НАПРЯМУЮ — поэтому переигранное не пишется заново без всякого гейта. Овердаб:
   песня играет и одновременно пишется новая дорожка; дорожка, что пишется прямо сейчас,
   НЕ переигрывается (её слышно живьём) — иначе двойной триггер.
   ЗАПИСЬ ОСТАНАВЛИВАЮТ ЯВНО: ● начинает, ● заканчивает. Прежнего авто-закрытия «первого круга» по
   счётчику тактов больше нет — в линейной записи закрывать нечего и не по чему.
   ВЛАДЕЛЬЦЫ ГОЛОСОВ ПО СЛОЮ: живой аккорд — 'latch', переигранный — 'loop:N';
   живой бас — 'bass' (ведущий режим) или 'bass:L[:f]' (полифонический), переигранный — 'bassloop:N'. Поэтому один и тот же инструмент
   слоится сам на себя (аккорд поверх аккорда, бас поверх баса) — разные владельцы,
   разные голоса из пула.
   ⚠️ СОЛО ТЕПЕРЬ ТОЖЕ ПОЛИФОНИЧНО И ТОЖЕ РАЗВЕДЕНО ПО ВЛАДЕЛЬЦАМ: живая рука — 'lead:L'/'lead:R'
   (ключ строит soloKey в gestures, он же расширяется пальцем), переигранный слой — 'leadloop:N:v'.
   ЗДЕСЬ РАНЬШЕ БЫЛО НАПИСАНО «соло остаётся моно (один envGain): соло-поверх-соло делит голос,
   побеждает последний — это не баг». БОЛЬШЕ НЕ ТАК, и это была ровно та надпись, что отправляла
   искать не там: живая игра и переигранный соло-слой больше НЕ дерутся, две руки звучат вместе.
   v в событии — НОМЕР ОДНОВРЕМЕННОЙ НОТЫ внутри слоя (0,1,…): без него две руки, пишущие разом,
   не различить на переигровке (leadOff не с чем спарить). Старые события без v читаются как v=0 —
   один голос на слой, то есть старая петля играет БИТ-В-БИТ как играла. */
const droneActive=()=>events.some(e=>e.fn==='drone');   // жив ли слой-дрон (для гашения при снятии/стопе)
let curChordDeg=-1, curChordOct=0;                   // ступень И РЕГИСТР аккорда, что играет петля сейчас (для подсветки, §Q5). Регистр нужен с многопериодной сеткой: одна ступень живёт в нескольких прямоугольниках, без него подсветка всегда падала бы в нижний
/* ⛳ T4b4: МЕСТО ПОДСВЕТКИ ПЕРЕИГРАННОЙ/ДОГНАННОЙ НОТЫ — ИЗ ИНДЕКСА В СТРОЕ (a.ti) и регистра, обратной выборкой лада (scales.
   modeSlotOfTi) в ЛАДУ СОБЫТИЯ (sc — его замороженный вид). { deg, oct } или null — высоты нет в ладу (с T5 — нота, которую редактор поставил на приглушённый ряд): тогда
   подсветки нет, и ничего не бросает. ⛳ T4c-1: событие без индекса — подсветки нет (ступень больше не читается; запасной путь снят).
   Для ступеней 0..n ответ — ровно пара события (проба P.checkHl). Зовётся на СОБЫТИЕ аккорда (планировщик, догонялка), не на кадр. */
function hlOf(a,sc){ return modeSlotOfTi(a.ti, a.oct, sc); }   // modeSlotOfTi сам отвечает null на нечисловой индекс
const setLoopChordHl=(a,sc)=>{ const p=hlOf(a,sc); curChordDeg= p ? p.deg : -1; curChordOct= p ? p.oct : 0; };
const loopChordDeg=()=>loop.on?curChordDeg:-1;       // draw: подсветить аккорд петли, когда рука его не держит
const loopChordOct=()=>loop.on?curChordOct:0;        // его регистр — тем же путём (подсветка ищет прямоугольник по ПАРЕ deg+oct)

/* Уборка за слоями, у которых больше НЕТ СОБЫТИЙ (⤺ отмена слоя, снятие подложки).
   ⚠️ ЭТО ГИГИЕНА, А НЕ КОРРЕКТНОСТЬ (см. закон выше): пропусти мы её где-нибудь — таблица и
   множества просто подрастут мусором, но ни одна дорожка не перепутается, потому что номер получит
   свежий id при следующем рождении. Держим ради того, чтобы состояние не копилось за долгую сессию.
   Пишущийся слой ЩАДИМ — он законно пуст, пока в него не сыграли (его строку уже показывает полоса). */
/* УБОРКА — тем же законом, что у дорожек: запись взятого, чьих событий больше НЕТ, снимается.
   ⚠️ ЭТО ГИГИЕНА, А НЕ КОРРЕКТНОСТЬ (как и у lanePrune): осиротевшая запись никому не мешает, но копилась
   бы всю сессию. Зовётся ИЗ lanePrune — одной строкой, чтобы наследовать ВСЕХ её вызывающих сразу (⤺
   отмена взятого, удаление дорожки, снятие подложки) и не заводить третий список мест, где можно забыть.
   Пишущееся взятое ЩАДИМ — оно законно пусто, пока в него не сыграли. */
function takePrune(){
  const live=new Set(); for(const e of events) live.add(e.tk||0);
  for(const tk of [...takeFx.keys()]) if(!live.has(tk) && !(recording&&tk===curTake)) takeFx.delete(tk);
}
function takeReset(){ takeFx.clear(); capReset(); }   // ✕ — песни нет, значит нет и захвата
function lanePrune(){
  takePrune();   // O-2: захват взятого уходит вместе с его событиями — одной строкой, чтобы унаследовать всех вызывающих
  const live=new Set(); for(const e of events) live.add(e.layer);
  for(const [ly,id] of laneId) if(!live.has(ly) && !isRecLayer(ly)){   // T1: пишущиеся слои взятого щадим (прежде — один loop.layer)
    laneId.delete(ly); laneForget(id);   // AR2: имя и место уходят с дорожкой (REC1: every id table, the arm and the pending delete — song/lanes.js)
    freezeDrop(id); }   // S3.5c: снятая дорожка (⤺, снятие подложки) снимает и вооружение — ● дальше создаст новую, а не пишет в пустоту   // F4: и БУФЕР уходит вместе с ней — иначе он остался бы звучать за дорожку, которой больше нет
}
/* ⚠️ laneSeq НАМЕРЕННО НЕ ОБНУЛЯЕТСЯ: счётчик монотонен на всю сессию. Обнуление вернуло бы в оборот
   уже выданные номера id — а это ровно тот вид совпадения, от которого id и заводился. Стоит он
   ничего (целое число), а класс ошибок закрывает целиком. */
function laneReset(){ for(const id of [...frozen.keys()]) freezeDrop(id); for(const id of [...frzPend.keys()]) frzPendCancel(id,'dropped');   // F4: ✕ — песни нет, значит нет и её заморозок
  laneTablesClear(); takeReset(); }   // REC1: every track table, the arm and the pending delete (song/lanes.js)   // A2: версии правок — гигиена (id не переиспользуются, мёртвая запись ни на что не влияла бы)   // O-2: захват сбрасывается вместе с дорожками (✕ и старт записи на пустой песне)
/* Снять дорожку целиком. ⚠️ ЗВУЧАЩЕЕ ГАСИМ ТЕМ ЖЕ ПУТЁМ, ЧТО ЗАГЛУШЕНИЕ (releaseLoopLayersAt со слоем): ровно её
   владельцы — 'loop:N', 'loop:N:k' влитых взятых, 'bassloop:N…', 'leadloop:N:v' — и больше ничьи, поэтому
   хвосты остальных дорожек не обрываются (в отличие от ⤺, который зовёт softAllOff). Удары, уже поставленные
   в окно SCHED_AHEAD, доиграют — та же принятая цена, что у заглушения.
   СИРОТ НЕ ОСТАЁТСЯ: события ушли (с ними a.v соло и a.k влитых взятых — эти номера выводятся из лежащего в
   слое на каждом ●, отдельного состояния у них нет); курсоры, кэш догонялки и длину песни сбрасывает
   schedInvalidate; строку, mute/solo, вооружение и взвод — lanePrune; дрон — laneHush (уровень по слышимости
   ОСТАВШИХСЯ дорожек: ушёл последний слой-дрон — дрон гаснет). */
laneWire({ recording:()=>recording, recLayers, isRecLayer, audioOn:()=>!!AC, deleteLane });   // REC1: what song/lanes.js asks of the recorder
function deleteLane(layer){
  if(!AC || isRecLayer(layer)) return false;   // T1: любой слой взятого (прежде — loop.layer)
  const tok=snapBegin('rowdel'); try{ return deleteLaneDo(layer); } finally { snapEnd(tok); }   // ED7: a row delete is one step (↶ brings the track back, with its tables)
}
function deleteLaneDo(layer){
  releaseLoopLayersAt(undefined,layer);
  if(recording) events.sort((x,y)=>x.t-y.t);   // хвост взятого — в отсортированный префикс ДО schedInvalidate (см. setRegionOn)
  untieAcross(layer);                           // ⛳ S6: выжившие половины пар связки этой дорожки — обычные ноты (своя атака); их замороженные буферы устаревают
  if(!compactEvents(e=>e.layer===layer)) return false;
  schedInvalidate(); lanePrune();
  curChordDeg=-1;                               // подсветка аккорда петли могла принадлежать снятой дорожке; следующий chOn выставит заново
  laneHush();
  if(!events.length) clearRec(); else hooks.loop && hooks.loop(loop.on);
  if(hooks.af) hooks.af('rowDelete');           // AF3: a row delete may untie a pair — its partner goes stale
  return true;
}
/* Дрон — не нота, а УРОВЕНЬ (выделенные узлы, softAllOff его не трогает), поэтому «заглушить слой
   с дроном» нельзя сделать пропуском события: droneOn уже отработал. Спрашиваем отдельно, слышен ли
   дрон хоть на одной дорожке, и ведём общий уровень. */
/* ⚠️ «Слышим ЖИВЫМ ГОЛОСОМ» (A2): свежая замороженная дорожка свой дрон играет из БУФЕРА — посчитай мы её
   здесь, дрон звучал бы дважды на каждом пуске (дефект F4, найден при сверке A2). Устаревшая — снова в
   счёте: она играет события. */
/* AF2: живой ли ГОЛОС дрона этой дорожки: слышима, буфер ею ЕЩЁ не владеет (подмена впереди — играют события) и не исключена (droneSyncAt —
   уровень на миг подмены считается так, будто её дрон уже в буфере). */
let droneExcl=null;
const liveDrone=e=>laneAudible(e.layer)&&!frzBufNow(e.layer)&&e.layer!==droneExcl;
const droneAudible=()=>events.some(e=>e.fn==='drone'&&liveDrone(e));
/* Привести ЖИВОЙ дрон в соответствие со слышимостью — одна строка на всех: приглушение, заморозка,
   разморозка, устаревание. when — время шва (по умолчанию «сейчас»). */
/* MX1: УРОВЕНЬ ДРОНА — как в событии (a.lvl) × уровень его дорожки; несколько слышимых дронов — громкий из них (дрон один на движок). */
const droneLevel=()=>{ let L=0; for(const e of events) if(e.fn==='drone'&&liveDrone(e)){ const x=((e.a&&e.a.lvl)??0.18)*laneGainOf(e.layer); if(x>L) L=x; } return L; };
/* MX2: ПАНОРАМА ДРОНА — той дорожки, чей дрон взят громким (тот же выбор, что droneLevel); нет слышимого — центр. */
const dronePanOf=()=>{ let L=-1, P=0; for(const e of events) if(e.fn==='drone'&&liveDrone(e)){ const x=((e.a&&e.a.lvl)??0.18)*laneGainOf(e.layer); if(x>L){ L=x; P=lanePanOf(e.layer); } } return P; };
/* TF2: the view the drone sounds — of the loudest live drone event (as its level), else of any drone event; null = the live view */
const droneViewNow=()=>{ let L=-1, V=null; for(const e of events) if(e.fn==='drone'){ const x= liveDrone(e) ? ((e.a&&e.a.lvl)??0.18)*laneGainOf(e.layer) : -0.5; if(x>L){ L=x; V=e.sc||null; } } return V; };
const droneViewSync=()=>AUD.droneUse(droneViewNow());
const droneSync=(when,tc)=>{ if(droneActive()){ droneViewSync(); if(loop.on&&droneAudible()){ AUD.dronePan(dronePanOf(),when); droneOn(droneLevel(),when,tc); } else droneOff(when,tc); } };   // tc (A2b) — короткий только на шве заморозки; иначе прежние постоянные
/* AF2: уровень живого дрона на миг подмены — без дрона дорожки, уходящей в буфер (её дрон звучит из буфера). */
const droneSyncAt=(when,tc,layer)=>{ droneExcl=layer; try{ droneSync(when,tc); } finally { droneExcl=null; } };
/* Переключатели. Наружу дорожка адресуется НОМЕРОМ СЛОЯ — тем же, чем подписана её строка на полосе
   лупера; id остаётся внутренним делом (ui не может подержать протухший id).
   ⚠️ `?? laneNew(layer)` — НЕ «мягкое заведение id», а ЕДИНСТВЕННЫЙ БЕЗОПАСНЫЙ способ его получить,
   когда записи нет. Он безопасен ровно потому, что ОТСУТСТВИЕ записи не может нести устаревший id:
   вернуть что-то протухшее laneOf физически неспособен (он либо отдаёт действующий id, либо ничего).
   Сюда мы попадаем, только если слой родился мимо всех известных мест рождения, — то есть это ещё и
   САМОПОЧИНКА: дорожка получит id и переключатель сработает, вместо того чтобы молча ничего не делать. */
function toggleLaneMute(layer){ const id=laneOf(layer) ?? laneNew(layer);
  if(laneMute.has(id)) laneMute.delete(id); else laneMute.add(id);
  laneHush(); }
function toggleLaneSolo(layer){ const id=laneOf(layer) ?? laneNew(layer);
  if(laneSolo.has(id)) laneSolo.delete(id); else laneSolo.add(id);
  laneHush(); }
/* ⛳ MX1: УРОВЕНЬ ДОРОЖКИ. laneLevelOf — v (0…1, 1 без записи); laneGainOf — множитель v² (одна кривая с громкостью ноты). setLaneLevel
   переставляет ЗВУЧАЩИЕ голоса дорожки (audio.trackGainRetune по ключам владельцев её слоя), шину замороженной (frzGain) и дрон
   (droneSync) — новые атаки берут уровень сами (audio.ownerGain → функция ниже). Не правка песни: истории нет (одна история — ED7). */
function setLaneLevel(layer,v){
  if(layer==null) return false;
  const id=laneOf(layer) ?? laneNew(layer), x=Math.max(0,Math.min(1,+v||0));
  if(x===1) laneLevel.delete(id); else laneLevel.set(id,x);
  const g=volAmp(x);
  if(AC) AUD.trackGainRetune(k=> layerOfOwner(k)===layer ? g : null);
  frzGain(id); droneSync();
  return true;
}
/* ⛳ MX2: ПАНОРАМА ДОРОЖКИ. lanePanOf — p (−1…1, 0 без записи). setLanePan переставляет ЗВУЧАЩИЕ и уже поставленные окном голоса дорожки
   (audio.trackPanRetune по ключам владельцев её слоя) и дрон (droneSync) — новые атаки берут панораму сами (audio.ownerPan → функция ниже);
   у замороженной меняет ПОДПИСЬ (панорама вплавлена в буфер): дорожка устаревает и играет события — уже с новой панорамой; ❄ переморозит.
   Мемо подписи — по слою, глобальный ключ панораму не видит, поэтому запись этого слоя снимаем здесь. Не правка песни: истории нет (ED7). */
function setLanePan(layer,p){
  if(layer==null) return false;
  const id=laneOf(layer) ?? laneNew(layer), x=Math.round(Math.max(-1,Math.min(1,+p||0))*100)/100 || 0;   // || 0 — без «−0»
  if(x===0) lanePan.delete(id); else lanePan.set(id,x);
  if(AC) AUD.trackPanRetune(k=> layerOfOwner(k)===layer ? x : null);
  frzSigMemo.delete(layer); frzWatchBump();   // AF3: pan is outside frzGlobalKey — the watcher's key reads this version
  droneSync();
  return true;
}
/* ⛔ probe CONTROL only (P.checkLiveIsolation): a live owner takes this track's level and pan — the leak the probe must be able to see */
let liveLeakLy=null;
const setLiveLeakDbg=ly=>{ liveLeakLy= ly==null ? null : ly; return liveLeakLy; };
AUD.setTrackPanOf(k=>{ const ly=layerOfOwner(k)??liveLeakLy; return ly==null ? 0 : lanePanOf(ly); });   // rule #31: a live owner → centre   // ⛳ живые ключи (руки) — центр
/* Функцию «ключ владельца → множитель» получает ТОЛЬКО ЖИВОЙ движок (рендер — своя копия audio.js, у неё умолчание 1: уровень не вплавляется). */
AUD.setTrackGainOf(k=>{ const ly=layerOfOwner(k)??liveLeakLy; return ly==null ? 1 : laneGainOf(ly); });   // rule #31: a live owner (no layer) → 1
AUD.setTrackRouteOf(k=> liveIso && layerOfOwner(k)!=null);
/* ED6 probe only: snapshot and restore of the tracks' edit versions (a section edit and its ↶ both bump them, so a frozen track stays
   stale after a round trip); the restore drops the signature memo so freshness is read again. */
function laneVerKeep(){ const V=new Map(laneEditVer); return ()=>{ laneEditVer.clear(); for(const [k,v] of V) laneEditVer.set(k,v); frzSigMemo.clear(); frzWatchBump(); }; }
/* ⚠️ ЗАГЛУШАТЬ НАДО НЕМЕДЛЕННО, А НЕ «СО СЛЕДУЮЩЕГО СОБЫТИЯ»: удержанный аккорд слоя звучал бы до
   заворота (chOff у него ещё впереди). Ключи владельцев дают ТОЧНЫЙ адрес слоя, поэтому гасим ровно
   ставшие неслышимыми слои — ТЕМ ЖЕ обходом, что и граница повтора (releaseLoopLayersAt со слоем),
   второго обхода не заводим.
   Зовём после КАЖДОГО переключения и проходим ВСЕ слои, а не только тронутый: включение соло делает
   неслышимыми чужие дорожки, а снятие одного из двух соло — ту, что осталась без него.
   Уже молчащие слои проходят вхолостую (chordOff/bassOff/leadOff выходят сразу, если владельца нет).
   ⚠️ УДАРНЫЕ ОТМЕНИТЬ НЕЛЬЗЯ: drumHit — одноразовые осцилляторы, поэтому удары, уже запланированные
   в окно SCHED_AHEAD (~300мс), прозвучат ПОСЛЕ заглушения. Та же принятая и ограниченная цена, что у
   стопа петли и у отмены слоя; чинить её здесь нечем. */
function laneHush(){
  if(!AC) return;
  const seen=new Set();
  for(const e of events){ if(seen.has(e.layer)) continue; seen.add(e.layer);
    if(!laneAudible(e.layer)) releaseLoopLayersAt(undefined,e.layer); }
  frzGainAll();                                                                  // F4: у замороженной нет голосов, которые можно отпустить, — её приглушает ГЕЙН ШИНЫ; бьём отсюда же, откуда бьёт живое приглушение
  droneSync();   // уровень дрона — по слышимости ЕГО дорожки (уровень, а не нота: пропуском события его не заглушить)
}

const laneEditTouch=()=>{ if(editLane!=null) laneEditVer.set(editLane,(laneEditVer.get(editLane)||0)+1); };
/* ═══ РЕДАКТОР ДОРОЖКИ: ОДИН ФЛАГ — ВСЕ ОТКАЗЫ (слайс S5.0) ═══
   ⛳ ФЛАГ ЖИВЁТ ЗДЕСЬ, А НЕ В ui, И ЭТО НЕСУЩЕЕ. «Редактор открыт» — условие, при котором ЗАПИСЬ
   невозможна, а запись держит recorder. Спрячь флаг в ui — и каждый новый вход (кнопка ●, рука-лупер,
   будущая педаль, урок) обязан был бы ВСПОМНИТЬ про отказ. Здесь про него не помнит никто: onRec
   спрашивает один раз, и этого хватает всем настоящим и будущим путям.
   ⛔ АДРЕС ДОРОЖКИ — id, А НЕ НОМЕР СЛОЯ (правило #27): номера переиспользуются (⤺ освобождает, следующая
   запись берёт тот же), и редактор, открытый «на слое 2», после отмены смотрел бы на ЧУЖУЮ дорожку с тем
   же номером. id не выдаётся дважды, поэтому протухший id может только «никуда не указывать» — тогда
   editLayer() отдаёт null, и редактор честно говорит «дорожки больше нет».
   `laneOf(layer) ?? laneNew(layer)` — та же самопочинка, что у toggleLaneMute/toggleArm, и безопасна по
   той же причине: ОТСУТСТВИЕ записи не может нести устаревший id, затирать нечего.
   ⚠️ ОТКРЫТИЕ ГЛУШИТ ЗВУК, И ДВУМЯ РАЗНЫМИ ПУТЯМИ — оба уже существуют, новых не заводим:
     транспорт ИДЁТ → onLoop() — обычная ПАУЗА: она закрывает открытые ноты в записи (recAllOff) и гасит;
     транспорт СТОИТ → softAllOff() — иначе ЗАЩЁЛКНУТЫЙ аккорд звенел бы дальше: пальцы разомкнуты,
       watchdog жестов его не снимает (endPinch в защёлке аккорд не гасит — см. gestures).
   ⛔ Запись и запись клипа — отказ. Открывать редактор поверх них значит редактировать то, что прямо
   сейчас меняется под руками (запись) или снимать в файл служебный экран (клип). */
let editLane=null;                                   // id ДОРОЖКИ, открытой в редакторе (не номер слоя!), или null
const editIsOpen=()=>editLane!=null;
const editLayer=()=>laneLayerOf(editLane);           // НОМЕР СЛОЯ открытой дорожки или null, если её больше нет
function editOpen(layer){
  if(!AC||recording||activeKind()||layer==null) return false;
  const id=laneOf(layer) ?? laneNew(layer);
  if(loop.on) onLoop(); else softAllOff();
  editLane=id; editTakeReset();   // ED7: the history is the song's, not the session's — it survives opening, closing and switching tracks
  return true;
}
function editClose(){ const was=editLane!=null; editLane=null; editTakeReset(); if(was&&hooks.af) hooks.af('editor'); }   // AF3: leaving the editor is a settle trigger
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkWrite): ВЗЯТОЕ В ПЕСОЧНИЦЕ — шаги сценария проходят НАСТОЯЩУЮ воронку записи (seedTake → push: маршрут,
   ключи, копия карты эффектов, перевод ступени в индекс), получившиеся события отдаются копиями, а песня возвращается как была: события
   (содержимое массива — на месте, правило #28), дорожки без событий снимаются (lanePrune — с ними и захват взятого), состояние взятого
   очищается. Счётчики laneSeq/takeSeq остаются продвинутыми (они монотонны по замыслу): у дорожек, рождённых ПОСЛЕ, другой номер
   (и другое семя заморозки) — существующих это не касается. Отказ — запись, игра транспорта, открытый редактор, звук не запущен. */
function probeTake(steps){
  if(!AC) return { ok:false, why:'audio is not started (press ▶ Play)' };
  if(recording) return { ok:false, why:'recording' };
  if(loop.on) return { ok:false, why:'the transport is playing' };
  if(editLane!=null) return { ok:false, why:'the track editor is open' };
  const keep=events.slice(), had=new Set(keep), keepLayer=loop.layer, keepTake=curTake;
  let out=null; histOffAdd(1);   // ED7: the sandbox take leaves no step
  try{ const r=seedTake(steps); if(r) out=events.filter(e=>!had.has(e)).map(e=>({...e, a:e.a&&{...e.a}})); }
  finally{
    events.length=0; for(const e of keep) events.push(e);
    takeSt.clear(); takeSrc.clear(); loop.layer=keepLayer; curTakeSet(keepTake);
    schedInvalidate(); lanePrune(); histOffAdd(-1);
  }
  return out ? { ok:true, events:out } : { ok:false, why:'the recorder refused the take' };
}
/* Сменить открытую дорожку, не закрывая редактор (чип дорожки в панели). Звук уже заглушён открытием. */
function editSetLayer(layer){
  if(editLane==null||layer==null) return false;
  const id=laneOf(layer); if(id==null) return false;
  editLane=id; editTakeReset();   // ED7: one history across tracks (was: cleared per track); отмена/возврат «вслепую» на другой были бы враньём
  return true;
}
/* ═══ ПРАВКА УДАРОВ И ОТМЕНА ПРАВОК (слайс S5.1) ═══
   ⛳ ТРЕТЬЕ МЕСТО РОЖДЕНИЯ СОБЫТИЙ (после push и loadArrangement) — и обязано соблюдать ровно то же:
   абсолютное время, tk на КАЖДОМ событии, ОДИН schedInvalidate на правку с сортировкой ПЕРЕД ним
   (правило #28), удаление — только через compactEvents (массив events — стабильная ссылка, её читает draw).
   ⛔ push СЮДА НЕ ГОДИТСЯ, и это не лень: он берёт время у часов AudioContext, квантует живой сеткой и
   пишет только при recording. У правки время приходит от ПАЛЬЦА, а не от часов.
   ⛳ ПОЧЕМУ ПЕРЕНОС УДАРА НЕ МОЖЕТ НАРУШИТЬ ПОРЯДОК, который стережёт S4.3: тот порядок обязателен ВНУТРИ
   КЛЮЧА ВЛАДЕЛЬЦА — там, где «вкл» и «выкл» обязаны идти по очереди. У удара владельца нет вовсе
   (chaseRole('drum') → null), пары нет, ENG.drum сам себе начало и конец — «раньше своего вкл» лечь
   физически нечему. Остаётся ОДНО требование — отсортированность массива, и её держит editCommit.
   ⚠️ СОБЫТИЕ ПРАВИМ, НЕ ПЕРЕСОЗДАВАЯ. Объект события — РУЧКА: за него держатся выделение, история отмены и
   спаривание нот (songNotes.head). Поэтому t меняем на месте, а нагрузку кладём НОВЫМ объектом — прежний
   уходит в историю ЦЕЛИКОМ. Так обратный ход не может растерять поля: sc/sev/tk/jam едут вместе с объектом,
   а не переписываются по одному (у удара sc/sev мертвы — ENG.drum контекста не читает, — но формат события
   один на все роли, и ломать его здесь нечем).
   ⛳ ОТМЕНА ПРАВОК — СВОЯ, И ЭТО НЕ ВТОРОЕ ⤺. ⤺ снимает ВЗЯТОЕ (целый дубль записи), ↶ — ОДНУ правку.
   Спутать их нажатием нельзя: пока редактор открыт, ⤺ с экрана убран (S5.0), а ↶ живёт только в редакторе.
   ⛳ ИСТОРИЯ ЖИВЁТ РОВНО СЕССИЮ ПРАВКИ (чистят открытие, закрытие и смена дорожки). Причина не в экономии
   памяти: ВНЕ редактора песню меняют запись, ⤺, ✕ и подложка, и обратный ход, сохранённый «на потом»,
   однажды указал бы на событие, которого в песне уже нет. Закрыл редактор — история закрыта вместе с ним. */
let snapPend=null, takeTok=null;   // ED7: the one pending diff snapshot, and the running take's own
const takeBegin=()=>{ if(!takeTok) takeTok=snapBegin('take'); };   // the pending snapshot of a take (no-op when one is pending)
/* ---- diff snapshot steps ---- */
function laneDrop(ly,id){
  if(laneId.get(ly)===id) laneId.delete(ly);
  laneForget(id);   // REC1: song/lanes.js
  freezeDrop(id);
}
const snapState=()=>({ evs:events.slice(), t:events.map(e=>e.t), a:events.map(e=>e.a), fx:new Map(takeFx), lanes:new Map(laneId),
  rows:new Map([...laneId.values()].map(id=>[id,laneRow(id)])), marks:secCopy(secMarks), rg:{ ...loop.rgn } });
/* the brace as the person set it: a following brace is derived from the material (rgnSync), so only its ⟳ counts */
const braceKey=r=> JSON.stringify(r.user ? [1,r.from,r.to,!!r.on] : [0,!!r.on]);
function snapBegin(label){ if(histOffNow()||snapPend) return null; snapPend={ label, S:snapState() }; return snapPend; }
function snapEnd(tok){
  if(!tok||snapPend!==tok) return false;
  snapPend=null;
  const S=tok.S, A=new Set(events), B=new Set(S.evs), rem=[], add=[], ch=[];
  S.evs.forEach((e,i)=>{ if(!A.has(e)) rem.push([e,S.t[i],S.a[i]]); else if(e.t!==S.t[i]||e.a!==S.a[i]) ch.push([e,S.t[i],S.a[i],e.t,e.a]); });
  for(const e of events) if(!B.has(e)) add.push([e,e.t,e.a]);
  const remT=[], addT=[]; for(const [tk,r] of S.fx) if(takeFx.get(tk)!==r) remT.push([tk,r]); for(const [tk,r] of takeFx) if(S.fx.get(tk)!==r) addT.push([tk,r]);
  /* CMD1b: a lane kept under the same id whose row changed (Open of a file with the song's own track ids) is recorded as dropped + added */
  const rowSame=id=> tok.label!=='open' || JSON.stringify(S.rows.get(id))===JSON.stringify(laneRow(id));
  const remL=[], addL=[]; for(const [ly,id] of S.lanes) if(laneId.get(ly)!==id || !rowSame(id)) remL.push([ly,id,S.rows.get(id)]);
  for(const [ly,id] of laneId) if(S.lanes.get(ly)!==id || !rowSame(id)) addL.push([ly,id,laneRow(id)]);
  const mk= JSON.stringify(S.marks)!==JSON.stringify(secMarks) ? { from:S.marks, to:secCopy(secMarks) } : null;
  /* ✕ (user answer, 2026-10-14): its ↶ brings the brace and ⟳ back too. Only ✕ — the brace is otherwise not part of the history. */
  const whole= tok.label==='clear' || tok.label==='open';   // SONG3 (RUN 4): Open is one step like ✕ — brace, settings and the file's name/id ride along
  const br= whole && !histDbgO.noBrace && braceKey(S.rg)!==braceKey(loop.rgn) ? { from:S.rg, to:{ ...loop.rgn } } : null;
  const st= tok.st && !histDbgO.noOpenSt ? { from:tok.st, to:songSetNow() } : null, m= tok.meta || null;
  if(!rem.length&&!add.length&&!ch.length&&!remT.length&&!addT.length&&!remL.length&&!addL.length&&!mk&&!br&&!st) return false;
  if(!histPush({ kind:'snap', label:tok.label, rem, add, ch, remT, addT, remL, addL, mk, br, st, m })) return false;
  histSeal(); return true;
}
function snapApply(u,undo){
  const out= undo ? u.add : u.rem, inn= undo ? u.rem : u.add;
  if(out.length){ const X=new Set(out.map(x=>x[0])); compactEvents(e=>X.has(e)); }
  if(u.st) songSetApply(undo ? u.st.from : u.st.to);   // SONG3: while the song is empty (the metre can change only then)
  for(const [e,t,a] of inn){ e.t=t; e.a=a; events.push(e); }
  for(const c of u.ch){ c[0].t= undo?c[1]:c[3]; c[0].a= undo?c[2]:c[4]; }
  for(const [tk] of (undo?u.addT:u.remT)) takeFx.delete(tk);
  for(const [tk,r] of (undo?u.remT:u.addT)) takeFx.set(tk,r);
  for(const [ly,id] of (undo?u.addL:u.remL)) laneDrop(ly,id);
  for(const [ly,id,row] of (undo?u.remL:u.addL)){ laneId.set(ly,id); if(row) laneRowSet(id,row); }
  if(u.mk) secMarksSet(secCopy(undo?u.mk.from:u.mk.to));
  if(u.br){ const B= undo ? u.br.from : u.br.to; loop.rgn.user=!!B.user; rgnApply(B.from,B.to,!!B.on); }   // after the events: histCommit's rgnSync clamps it to the material
  if(u.m && hooks.songMeta) hooks.songMeta(undo ? u.m.from : u.m.to);   // SONG3: ui's Song file name and id (autosave writes under it)
}
/* the key knob inside a song Transpose step (user answer 1): ↶/↷ set it back / again ABSOLUTELY (the backing re-keyed by a knob turn in
   between is restored by the step's own view moves, so knob and backing agree again). Live hands stop; tracks are not touched here. */
function keyStepSet(k){
  if(k===tonic) return;
  setTonic(k); liveAllOff(); AUD.droneRetune(); hooks.key && hooks.key();
}
function histCommit(u){
  evSeqFill(); events.sort(evOrder); schedInvalidate(); takeFxTouch();
  for(const ly of histTouched(u)){ const id=laneOf(ly); if(id!=null) laneVerBump(id); }
  if(u.kind==='snap'){ curChordDeg=-1; laneDelCancel(); softAllOff(); if(!droneActive()) droneOff(); }
  droneSync();
  hooks.loop && hooks.loop(loop.on);
  if(hooks.af) hooks.af('undo');
}
/* REC2: what the one history (song/history.js) needs from here — the ↶/↷ gates and commit; for the hash the capture records, markers, master */
histWire({ ready:()=>!!AC&&!recording, pause:()=>{ if(loop.on) onLoop(); }, commit:histCommit,
  takes:()=>takeFx, marks:()=>secMarks, master:()=>AUD.masterLevel?AUD.masterLevel():0 });
/* ✕ clear — an ordinary step: the whole song comes back with ↶ (a running take ends first, as its own step). The brace returns to
   following the material; ↶ brings it (and ⟳) back as it was. */
function clearSong(){
  if(recording) recStop();
  const tok=snapBegin('clear'); clearRec(); snapEnd(tok);
  if(hooks.cleared) hooks.cleared();   // ED7-fix2: ui offers "Song cleared — Undo" (the ✕ button and the looper hand alike)
}
/* ═══ SAVE1: SAVE / OPEN A SONG FILE — the session part (the record itself: song/file.js; the text and the checks: core/songfile.js) ═══
   Unsaved = there is a song and its history hash moved since the last save or open (songMark). Open replaces the song the way a song load
   does (P.seed, P.song): everything cleared, tables and records installed, the history starts fresh; the settings come with it (A4,
   tempo, metre, length, subdivision, quantise, master, brace). Refused while recording or with the editor open. */
let songMarkH=null;
/* SONG3: the song's own settings (what a song file carries besides its material) — read and applied as one */
const songSetNow=()=>({ aRef, metre:loop.metre, bpm:loop.bpm, bars:loop.bars, sub:loop.sub, quant:loop.quant, master:AUD.masterLevel() });
function songSetApply(S){
  const a4=S.aRef!==aRef;
  setARef(S.aRef); setLoopMetre(S.metre); setLoopBpm(S.bpm); setLoopBars(S.bars); setLoopSub(S.sub); setLoopQuant(S.quant); AUD.setMasterLevel(S.master);
  if(a4) AUD.droneRetune();
}
const songMark=()=>{ songMarkH=histHash(); };
const songDirty=()=> events.length>0 && histHash()!==songMarkH;
function songSaveRec(meta){
  if(recording) return { ok:false, why:'rec' };
  if(!events.length) return { ok:false, why:'empty' };
  const rec=songData(meta||{}); songMark(); return { ok:true, rec };
}
/* SONG3 (RUN 4, user answer): Open is ONE step of the one history, like ✕ — ↶ brings the previous song back with its settings, brace and
   Song-file name/id (meta = { from, to } from ui); ↷ opens it again. Only where no snapshot can be taken (history off) it resets. */
function songOpenApply(P, meta){
  if(!AC) return { ok:false, why:'audio' };
  if(recording) return { ok:false, why:'rec' };
  if(editIsOpen()) return { ok:false, why:'editor' };
  if(loop.on) onLoop();   // paused, as for ↶ (the metre can change only on a stopped, empty song)
  const tok=snapBegin('open'); if(tok){ tok.st=songSetNow(); tok.meta=meta||null; }
  clearRec(); if(!tok) histReset();
  const S=P.settings;
  songSetApply(S);
  for(const T of P.tracks){ const id=laneNew(T.layer, T.id); laneRowSet(id,{ mute:!!T.mute, solo:!!T.solo, level:T.level, pan:T.pan, name:T.name, rank:T.rank, len:T.len }); }
  let tkMax=0;
  let pidMax=0; for(const [tk,rec] of P.takes){ takeFx.set(tk,rec); if(tk>tkMax) tkMax=tk; for(const p of rec.lane||[]) if(p.id>pidMax) pidMax=p.id; }
  laneIdFloor(pidMax);   // IDS1 part 2: the file's lane point ids stay; new points count on above them
  let idMax=0; for(const e of P.events){ events.push(e); if(e.tk>tkMax) tkMax=e.tk; if(e.id>idMax) idMax=e.id; }   // in the file's order = birth order
  evIdFloor(idMax);   // IDS1: the file's event ids stay; new events count on above them (events of an older file get theirs at the rebase)
  takeSeqFloor(tkMax);
  evSeqFill(); events.sort(evOrder);
  secMarksSet(P.marks);
  schedInvalidate(); takeFxTouch();
  loop.rgn.user=!!S.brace.user; rgnApply(S.brace.from, S.brace.to, !!S.brace.on);
  const pinned=songPinChains();   // a file always carries every chain (song/file.js); an older one may not — as at any song load
  if(tok) snapEnd(tok); else histReset();
  droneSync(); hooks.loop && hooks.loop(loop.on);
  songMark();
  return { ok:true, tracks:P.tracks.length, events:P.events.length, pinned:pinned.length };
}
/* REC3: what the edits (song/edit-notes.js) need from the editor session and the recorder */
editWire({ ready:()=>!!AC, isOpen:editIsOpen, layer:editLayer, pause:()=>{ if(loop.on) onLoop(); }, touch:()=>{ takeFxTouch(); laneEditTouch(); } });
/* ED7: snapshot steps, level / pan / name of a track, master, the key knob of a song Transpose ('ranks' — song/history.js) */
histKind('snap', snapApply, (u,S)=>{ for(const L of [u.rem,u.add,u.ch]) for(const x of L) S.add(x[0].layer); }, ['rem','add','ch','remT','addT','remL','addL','mk','br','st','m']);
histKind('tab', (u,undo)=>{ const ly=laneLayerOf(u.id), v= undo?u.from:u.to; if(ly==null) return;
  if(u.f==='level') setLaneLevel(ly,v); else if(u.f==='pan') setLanePan(ly,v); else setLaneName(ly,v||''); }, null, ['id','f','from','to','at']);
histKind('master', (u,undo)=>{ AUD.setMasterLevel(undo?u.from:u.to); }, null, ['from','to','at']);
histKind('key', (u,undo)=>{ keyStepSet(undo?u.from:u.to); }, null, ['from','to']);
/* ⛳ CMD1d: the commands that are NOT history steps (ED7 decision) go through ONE door: cmdSet applies today's setter and tells the journal
   (onApplied, dir 'set') by permanent ids; cmdNote only tells — for the key knob and A4, whose ui handlers do more than one setter. */
const CMD_SET={ mute:toggleLaneMute, solo:toggleLaneSolo, arm:toggleArm, region:setRegionOn, brace:braceSet, tempo:setLoopBpm };
function cmdSet(kind,...args){
  const f=CMD_SET[kind]; if(!f) throw new Error('cmdSet: unknown command '+kind);
  const r=f(...args);
  const v= kind==='mute'||kind==='solo'||kind==='arm' ? { layer:args[0], id:laneOf(args[0]) ?? null } : kind==='region' ? { on:!!args[0] }
    : kind==='brace' ? { from:args[0], to:args[1] } : { bpm:loop.bpm };
  histNote(kind, v);
  return r;
}
const cmdNote=(kind,value)=>histNote(kind,value);
/* ↶ / ↷ of the editor — since ED7 the one history (histUndo / histRedo: any step, any track, editor open or not). */
const editUndo=()=>histUndo();
const editRedo=()=>histRedo();
/* ⛔ Probe only (P.checkLiveIsolation): the open session's history, and walking such a list back in a LATER session on the same track —
   safe only when nothing changed the song in between (the probe plays and freezes, it edits nothing). Restores the exact payloads. */
const editHistPeek=()=>histPeek();
function editRevert(list){
  if(!list||!list.length||!editGuard(true)) return false;
  for(let i=list.length-1;i>=0;i--) editApply(list[i],true);
  editCommit(); histReset(); return true;   // ED7: the reverted steps are still in the one history — it is dropped (probe only)
}


schedWire({ recBass, ENG });   // REC4: the scheduler's engine table and the bass recording state (declared above)

/* ⛳ softAllOff — ЕДИНСТВЕННАЯ ТОЧКА «ЗАГЛУШИТЬ ВСЁ», И ТЕПЕРЬ ОНА ЖЕ ЗАКРЫВАЕТ ЗАПИСЬ (слайс S4.1).
   БЫЛО: последняя строка обнуляла состояние записи БЕЗ «выкл». Звук гас здесь же, а нота в дорожке оставалась открытой и
   на переигровке звенела до конца песни (со скобой — до шва, и догонялка поднимала её на каждом входе). Зовут эту функцию
   ~17 мест в ui — лад, тоника, A4, раскладка, пальцев в руке, трезвучие/септаккорд, функция руки, действия пальцев, роль,
   сплит и его роли, поворот в портрет, сбросы уроков. Это была НЕ семнадцать дыр, а одна строка.
   ТЕПЕРЬ: при записи СНАЧАЛА recAllOff — тот же обход, что у ●, паузы, паники, ⤺ и снятия подложки. «Выкл» ложится на
   долю ЭТОГО мига — ровно там, где звук и правда кончился (строками ниже). Новый вызывающий получит это даром.
   ⛔ Не чинить по местам вызова: смысл в том, что восемнадцатый вызов не может забыть.
   ⚠️ ИДЕМПОТЕНТНО: каждый rec*Off снимает то, что закрыл, поэтому второй проход (пауза, clearJam, ⤺ закрывают ДО нас) не
   находит открытого и не пишет ничего; recFoldRoll второй раз не видит «времени назад».
   ⚠️ ДОЛЯ «ВЫКЛ» ОСМЫСЛЕННА ВСЕГДА: запись идёт только при бегущем транспорте (● поднимает его, а все остановки снимают
   запись раньше или в том же вызове). В отсчёте push отказывает — но там по S4.1 и открытого нет.
   ⛔ БЕЗ ЗАПИСИ — БАЙТ-В-БАЙТ ПРЕЖНЯЯ (гейт recording). Паника (recStop) и ✕ (setRecording(false)) снимают запись ДО вызова.
   ⛔ СБРОС В КОНЦЕ ОСТАЁТСЯ: вне записи rec*Off состояние не чистят, а обещание функции — «после неё не открыто ничего».
   Где закрывать нельзя (⤺ снял текущее взятое — его «вкл» больше нет), вызывающий обязан ДО неё звать recDrop. */
/* ⛳ БУФЕРЫ ЗАМОРОЖЕННЫХ ГАСИМ ТОЛЬКО НА СТОЯЩЕМ ТРАНСПОРТЕ (A2b-fix). Все остановки (пауза, паника, редактор)
   снимают loop.on ДО этого вызова — им буферы гасятся как прежде. А на ИДУЩЕМ транспорте softAllOff зовут
   ~17 мест ui (тоника, лад, A4, роль, сплит…), и буфер для них — не «живая нота», а записанное
   воспроизведение. ⛔ ИМЕННО ЗДЕСЬ ЖИЛА ОШИБКА «СМЕНИЛ ТОНИКУ — ДОРОЖКА ЗАМОЛЧАЛА ДО КОНЦА»: frzStopAll
   гасил буфер «сейчас» и сбрасывал armedRep, поэтому шов выхода (frzLeave в планировщике) не находил, что
   передавать, догонялка не звала, а удержанный бас/аккорд — одно «вкл» и цепочка ведений — молчал до
   следующего «вкл». Теперь устаревшую дорожку передаёт событиям планировщик (догонялка на шве), а свежая
   просто играет дальше (прежде она ещё и перезапускалась с горизонта — дыра до ~300 мс на каждое
   переключение роли). */
/* ⛳ НА ИДУЩЕМ ТРАНСПОРТЕ ГОЛОСА ДОРОЖЕК НЕ ГАСНУТ, А ПЕРЕДАЮТСЯ (A2c). Прежде softAllOff гасил ВСЕХ владельцев, и
   удержанный бас или защёлкнутый аккорд ДОРОЖКИ (одно «вкл» и цепочка ведений) молчал до своего следующего «вкл» —
   на каждой смене тоники, лада, A4. Так было всегда у незамороженных дорожек; после шва выхода (A2b) — и у
   устаревших замороженных, отчего пачка изменений A4 (числовое поле шлёт change на КАЖДЫЙ шаг стрелки) гасила
   дорожку, которую первый шаг только что передал событиям. Теперь: ЖИВЫЕ владельцы — как всегда, сейчас;
   владельцы дорожек — trackResplice (шов на горизонте, та же догонялка). Стоим — всё дословно по-старому. */
function softAllOff(){ if(!AC)return;
  if(!loop.on) frzStopAll();                        // F4: аварийная остановка НИЧЕГО не знала о буферах — теперь знает. A2b-fix: только на СТОЯЩЕМ транспорте (довод выше)
  if(recording) recAllOff();                        // S4.1: закрыть в записи то, что сейчас заглушим
  if(loop.on){
    /* ЖИВЫЕ — сейчас, как всегда: руки соло ('lead:*'), живой аккорд ('latch' — правило #20 о шве повтора, а
       softAllOff гасил его всегда и гасит дальше), живой бас ('bass' и 'bass:…' — всё, что не isTrackOwner). Дорожки —
       передаёт trackResplice. */
    liveOwnersOff();
    trackResplice();
  }else{
    leadAllOff();                                   // все владельцы соло: 'lead:L/R' + 'leadloop:N:v' (раньше был один noteOff — соло было моно)
    Object.keys(chordHold).forEach(k=>chordOff(k)); // все владельцы аккордов: 'latch' + 'loop:N'
    Object.keys(bassHold).forEach(k=>bassOff(k));   // все владельцы баса: 'bass' + 'bassloop:N'
  }
  setLatchDeg(-1); setLatchTy(null); liveChClear();   // живой аккорд погашен — и его запись-зеркало тоже. тип гасим вместе со ступенью: иначе после паники/очистки
  recDrop(); }                                    // следующий щипок той же ступени прочёлся бы как «тот же аккорд»; состояние записи — в ноль (при записи оно уже закрыто выше)
function liveOwnersOff(){
  for(const k of Object.keys(leadHold))  if(!isTrackOwner(k)) leadOff(k);
  for(const k of Object.keys(chordHold)) if(!isTrackOwner(k)) chordOff(k);
  for(const k of Object.keys(bassHold))  if(!isTrackOwner(k)) bassOff(k);
}
/* TF2: the key knob — only what the HANDS play stops (a held note re-attacks next frame in the new key; while recording it is closed
   first, so it lands in a NEW track — the source carries the view's key, Q2). Tracks keep playing untouched: their views hold their keys.
   Stopped: the same as softAllOff (nothing of a track is sounding but release tails). */
function liveAllOff(){ if(!AC)return;
  if(!loop.on) return softAllOff();
  if(recording) recAllOff();
  liveOwnersOff();
  setLatchDeg(-1); setLatchTy(null); liveChClear();
  recDrop();
}
/* TF2 (user answer Q3): a backing (Jam, Drums) follows the key knob. Arrangements are written in DEGREES (arrange.js knows no key), so the
   backing re-made in the new key is exactly its events in the view of the new key — done in place: its tracks keep their ids, levels, pans,
   names and the transport keeps running. Not a history step (the key is a listening switch). Its held notes are handed over at the
   horizon (trackResplice of its layers), the drone takes the new view, its frozen tracks go stale (edit version) and re-freeze by
   themselves. → the layers re-keyed. */
function backingFollowKey(){
  const k=tonic, L=new Set();
  for(const e of events) if(e.jam && e.sc && e.sc.mode && e.fn!=='drum'){ const nv=scaleView(e.sc.mode, e.sc.tunedFrom, e.sc.chordMode, k, tonicCents); if(nv!==e.sc){ e.sc=nv; L.add(e.layer); } }   // TF3b: drum hits carry no pitch (as in Transpose), so ↶ of a song Transpose restores the whole backing; TF5: the knob's cents too
  if(!L.size) return [];
  for(const ly of L){ const id=laneOf(ly); if(id!=null) laneVerBump(id); }
  notesReset(); chaseReset(); frzSigMemo.clear();   // memos hold views; cursors and order untouched (safe while recording)
  if(loop.on) trackResplice(L);
  droneViewSync();
  if(hooks.af) hooks.af('backing');
  return [...L];
}
/* Владелец голоса ДОРОЖКИ — по префиксу ключа (те же, что у chOwnerKey/bassOwnerKey/ldKey и releaseLoopLayersAt). */
const isTrackOwner=k=> k.slice(0,5)==='loop:' || k.slice(0,9)==='bassloop:' || k.slice(0,9)==='leadloop:';
const trackOwnerLayer=k=> parseInt(k.slice(k.indexOf(':')+1),10);   // 'loop:3:2' → 3, 'leadloop:12:0' → 12
/* ⛳ ПЕРЕДАТЬ ДОРОЖКИ НА ГОРИЗОНТЕ — ТОТ ЖЕ ШОВ, ЧТО frzLeave, ТОЛЬКО ДЛЯ ВСЕХ ДОРОЖЕК, ИГРАЮЩИХ СОБЫТИЯМИ.
   Шов T — горизонт уже запланированного (loop.sched): всё до него поставлено, после — поставит обычный проход.
   Голоса дорожек гасим ПО ВРЕМЕНИ T (релиз отменяет и атаки, уже поставленные в окно после T), а догонялка
   (chasePlay — та же, что у входа в песню и у шва заморозки) поднимает удержанное к доле шва — в НОВОЙ высоте:
   частоту выводит ENG из живой тоники/A4, лад — свой замороженный (правило #7).
   ⚠️ СНЯТАЯ ДОРОЖКА (⤺/подложка на ходу: её событий больше нет) гасится СЕЙЧАС, а не на шве — догонять её
   нечем, а уже поставленные в окно атаки иначе прозвучали бы у удалённой ноты.
   ⚠️ Замороженные: свежую догонялка пропускает (играет буфер), ещё взведённую устаревшую — тоже (её передаст
   frzLeave, см. frzBufOwns в chasePlay); устаревшую и уже переданную — передаёт как любую.
   ⚠️ Во время записи: recAllOff (выше) уже закрыл открытое в дубле, а события пишущегося взятого chaseFor
   пропускает — дубль этим не задет. */
/* only (TF2) — a Set of layers to hand over (the backing after a key change); absent = every track. */
function trackResplice(only){
  const spb=secPerBeat(), m=loop.sched, T=timeAt(m), lo=songAt(m);
  const alive=new Set(); for(const e of events) alive.add(e.layer);
  const at=k=> alive.has(trackOwnerLayer(k)) ? T : undefined;          // живая дорожка — на шве; снятая — сейчас
  const mine=k=> !only || only.has(trackOwnerLayer(k));
  for(const k of Object.keys(chordHold)) if(k.slice(0,5)==='loop:' && mine(k))     chordOff(k, at(k));
  for(const k of Object.keys(bassHold))  if(k.slice(0,9)==='bassloop:' && mine(k)) bassOff(k, at(k));
  for(const k of Object.keys(leadHold))  if(k.slice(0,9)==='leadloop:' && mine(k)) leadOff(k, undefined, at(k));   // V2: слот tie пуст — время в слоте when
  if(only){ for(const ly of only){ chasePlay(lo, T, false, ly); chasePlay(lo, T, true, ly); } return; }
  chasePlay(lo, T, false);                          // аккорды и бас — по времени шва, до событий следующего отрезка
  chasePlay(lo, T, true);                           // соло — по явному времени шва, как при пуске
}
/* ⟳ — ИГРАТЬ / ПАУЗА. Позиция при паузе СОХРАНЯЕТСЯ, пуск продолжает с неё; если плейхед стоит на
   конце песни (её доиграли или остановили в самом конце) — пуск ПЕРЕМАТЫВАЕТ в начало, потому что
   «играть» в конце значит «сыграй ещё раз с начала», а не «стой на месте».
   ⛳ ЭТО И ЕСТЬ ТОТ ЕДИНСТВЕННЫЙ ПУТЬ, ПО КОТОРОМУ ЕЗДИТ ПЕРЕМОТКА (seekTo) в этом слайсе — отдельного
   органа управления для неё пока нет и заводить его здесь не стали (см. отчёт). */
function onLoop(){
  if(!AC)return;
  if(loop.on){
    /* ⛳ ПАУЗА ТЕПЕРЬ ЗАКРЫВАЕТ ОТКРЫТЫЕ НОТЫ (долг слайса S3.1). Тогда это было НЕВОЗМОЖНО сделать
       правильно: время сворачивалось в петлю, и «конец» удержанной ноты было некуда записать. Со
       сквозным временем у него есть честное место — текущая доля, — поэтому recAllOff здесь уместен
       ровно так же, как на остановке записи. ⛔ СТРОГО ДО setRecording(false) и ДО softAllOff:
       первый гасит запись, второй ВЫБРАСЫВАЕТ состояние открытых нот, не записав их. */
    recAllOff();
    loop.on=false; clearPump(); fxPlayStop(); softAllOff(); droneOff(); setRecording(false);   // O-3: fxPlayStop рядом с clearPump — где встал транспорт, там кончилась и власть записи над ручками
    events.sort((x,y)=>x.t-y.t); schedInvalidate();    // могли дописать выключения → порядок восстановить, курсоры сбросить
    hooks.rec&&hooks.rec(false); hooks.loop&&hooks.loop(false);
  }
  else if(events.length){
    const R=loop.rgn;
    const from = cycling()&&loop.pos>=R.to ? R.from          // повтор включён, а пауза оказалась за концом скобы (край двигали на паузе) → с начала скобы, как сделал бы шов
               : loop.pos>=songLen ? 0 : Math.max(0,loop.pos);   // доиграли до конца → следующий пуск с начала
    startTransport(false,from);
    droneSync();                                      // AR2 (хвост MX2): уровень и панорама дорожки дрона — прежний droneOn() после паузы звучал 0.18 по центру прежней панорамы, пока до конца песни не встретится событие дрона (а оно одно — на доле 0). ⚠️ droneSync спрашивает AUDIBLE: снятие паузы не должно воскрешать заглушённую дорожку дрона
  }
}
/* ⛳ ⤺ СНИМАЕТ ПОСЛЕДНЕЕ ВЗЯТОЕ (S3.5d), а не слой с наибольшим номером.
   Взятое в НОВУЮ дорожку — уходит вся дорожка, как прежде (без влитых взятых и удалений «наибольший слой» и
   «последнее взятое» — одно и то же: новая дорожка всегда получала maxLayer()+1). Взятое, ВЛИТОЕ в старую
   дорожку, — уходят только его события, дорожка сохраняет прежний материал (lanePrune её не тронет: события
   в слое остались). Повторяемо: каждое нажатие берёт наибольший из ОСТАВШИХСЯ tk.
   Подсказки на экране не нужно: снимается ровно то, что записали последним.
   Всё, что взятое породило, уходит вместе с его событиями: a.k и a.v выводятся из лежащего в слое на
   следующем ●, отдельного состояния у них нет; голоса гасит softAllOff; курсоры/догонялку/длину —
   schedInvalidate. После УДАЛЕНИЯ дорожки с её строки ⤺ снимает последнее из УЦЕЛЕВШИХ взятых: удаление
   в истории не лежит, ничего не воскрешается и ни на что пропавшее не указывает.
   Подложка/джем: каждый их слой — своё взятое (loadArrangement), поэтому ⤺ снимает их послойно, как и
   раньше; clearJam по-прежнему снимает РОВНО помеченное ev.jam, номера взятых ему не нужны. */
function onUndo(){
  if(!events.length)return;
  const tok=snapBegin('untake'); try{ onUndoDo(); } finally { snapEnd(tok); }   // ED7: ⤺ is an ordinary step (↶ brings the take back)
}
function onUndoDo(){
  let top=-Infinity; for(const e of events){ const k=e.tk||0; if(k>top) top=k; }
  /* S3.5d-fix: при записи снимается НЕ текущее взятое (например, слой подложки, положенной посреди записи) — закрыть
     удержанное ДО softAllOff, иначе его «вкл» останутся без «выкл». Если снимается само текущее взятое, закрывать нечего:
     его «вкл» уходят вместе с ним. top посчитан ДО закрытия, поэтому новые «выкл» (tk текущего) его не сдвигают.
     ⚠️ S4.1: ВТОРАЯ ВЕТКА ТЕПЕРЬ ОБЯЗАТЕЛЬНА. Прежде «закрывать нечего» обеспечивал сам softAllOff — он молча выбрасывал
     состояние. Теперь он при записи ЗАКРЫВАЕТ, и для снятого текущего взятого написал бы «выкл» без «вкл» — сирот. Поэтому
     здесь, ДО него, состояние выбрасываем явно: это не вторая политика, а случай, где «вкл» в песне уже нет. */
  if(recording){ if(top!==curTake) recAllOff(); else recDrop(); }
  if(recording) events.sort((x,y)=>x.t-y.t);            // хвост взятого — в отсортированный префикс ДО schedInvalidate
  compactEvents(e=>(e.tk||0)===top);                    // ОДИН проход вместо splice-в-цикле (см. compactEvents)
  schedInvalidate();                                    // состав событий изменился → курсоры недействительны
  lanePrune();                                          // снятая дорожка не должна оставить своё заглушение следующей записи на том же номере
  softAllOff(); if(!droneActive())droneOff();           // сняли слой-дрон → гасим (softAllOff дрон не трогает)
  if(!events.length)clearRec(); else hooks.loop && hooks.loop(loop.on);
  hooks.tutor && hooks.tutor('loop',{ev:'undo'});       // ЗАЦЕПКА ОБУЧЕНИЯ: снят верхний слой — урок «Лупер» (дошли только при непустой петле — ранний выход выше)
  if(hooks.af) hooks.af('undo');                        // AF3: undo of a take is a settle trigger
}
/* ⛳ СЦЕНАРНОЕ ВЗЯТОЕ — ЗАСЕВ ТЕСТОВОЙ ПЕСНИ ДЛЯ ПРОБЫ (scaleprobe P.seed). НЕ часть игры: из интерфейса его не зовёт никто.
   Пишет ТОЛЬКО через push — ту же воронку, что живая запись: маршрут по источнику (роль + тембр + вид строя; новые дорожки рождает
   takeMint → laneNew — правило #27), номер взятого tk, ключи k, вид события (sc/sev — живые CUR()/seventh на момент вызова), индекс в
   строе a.ti. Отличие от живой записи ровно одно: время ЯВНОЕ (at), поэтому нет ни отсчёта, ни квантизации, ни часов — тот же путь, каким
   уже пишет защёлка на старте записи (recLatchOpen). Начало взятого — как у onRec без вооружения (дорожка на ●, снимок цепей
   takeCapStart), конец — как recStop без recAllOff (открытых нот у сценария нет: каждую он закрывает сам). Синхронно: ни кадр, ни тик
   между шагами не вклиниваются.
   steps: [{fn, a, t, id, fz}] — id связывает «вкл» ноты с её ведениями и «выкл»: они идут в слой СВОЕЙ ноты (как r.layer у живой записи),
   а «вкл» и удар — маршрутом. → { take, events, layers } или null (нет движка, идёт запись или транспорт, открыт редактор).
   fz — необязательный ЗАМОРОЖЕННЫЙ контекст шага {sc, sev} (вид строя и септаккорд), тот же аргумент push, что у шва аккорда (S3.5e):
   демо-песня (songs.js) пишет одним взятым роль, чьи дорожки стоят в РАЗНЫХ видах (аккорды минора, пентатоники и натурального строя),
   а маршрут по строю (noteSource) разводит их по дорожкам сам. Без fz — живой CUR()/seventh, как было. */
function seedTake(steps){
  if(!AC || recording || loop.on || editIsOpen()) return null;
  takeBegin();   // ED7: as onRec — before the lane and the capture record are born
  const fresh=!events.length;
  if(fresh){ laneReset(); loop.layer=0; } else loop.layer=nextFreeLayer();
  laneNew(loop.layer);
  takeSt.clear(); takeSrc.clear(); takeJoin(loop.layer);
  curTakeSet(takeNext()); takeCapStart(curTake);
  recWinReset();
  setRecording(true);
  const lyOf=new Map(); let n=0;
  try{
    for(const st of steps){
      if(st.do){ st.do(); continue; }   // TF2: a probe step that changes the environment mid-take (the key)
      const ly = (st.id!=null && lyOf.has(st.id)) ? lyOf.get(st.id) : undefined;
      if(!push(st.fn, st.a, st.t, st.fz||null, false, ly)) continue;
      n++; if(ly===undefined && st.id!=null) lyOf.set(st.id, pushLy);
    }
  } finally { setRecording(false); events.sort((x,y)=>x.t-y.t); schedInvalidate(); }
  return { take:curTake, events:n, layers:[...new Set(lyOf.values())] };
}
function clearRec(){
  clearPump(); loop.on=false; fxPlayStop(); events.length=0; secMarksSet([]); if(takeTok){ if(snapPend===takeTok) snapPend=null; takeTok=null; }   // ED6: markers go with the song; ED7: a take cleared away is no step (the history itself stays — ✕ is a step, clearSong; loads reset it)
  loop.rgn.user=false; rgnApply(0,loop.metre,false); schedInvalidate(); laneReset(); setRecording(false); softAllOff(); droneOff();   // S3.5b: loop.on=false ПЕРЕД rgnApply — остановленному транспорту перепривязывать нечего; скоба — снова «следует», повтор выключен (user — не часть временнóй карты, поэтому пишется напрямую)   // ✕ — песни больше нет, значит нет ни дорожек, ни области повтора: помеченный участок пустой песни был бы ложью на экране
  hooks.loop && hooks.loop(false);
}
/* ⚠️ panic НАМЕРЕННО НЕ ТРОГАЕТ настройки дорожек: события переживают панику, значит переживают и
   дорожки. «■» — это «замолчи сейчас», а не «забудь, что я намикшировал».
   ⛳ ТРИ ОСТАНОВКИ — ОДНО ПРАВИЛО (S3.5c):
     ⏸ ПАУЗА  — ДЕРЖИТ позицию (onLoop): в этом весь её смысл.
     ■ ПАНИКА — СБРАСЫВАЕТ: всё глушит, бегунок — на НАЧАЛО СКОБЫ; следующий ▶ играет материал скобы с начала.
                Песню, скобу, mute/solo и вооружение — сохраняет: она глушит и перематывает, а не забывает.
     ✕ ОЧИСТКА — всё в ноль, скоба включительно (clearRec).
   Раньше паника позицию не трогала — ▶ продолжал с места, где её нажали, то есть вела себя как пауза.
   ⛔ ПАНИКА НЕ ИЗОБРЕТАЕТ СОБЫТИЙ: она не добавляет в запись ничего, чего человек не сыграл. Во время записи она
   сперва ОСТАНАВЛИВАЕТ ЗАПИСЬ ОБЫЧНЫМ ПУТЁМ ● (recStop): удержанное получает концы на доле нажатия — это честная
   запись того, что было сыграно до этого мига, тем же проверенным кодом, что у ●, а не второй закрывающий обход.
   ⚠️ СОРТИРОВКА — НЕ ЗАПИСЬ, но она обязательна при записи: schedInvalidate объявляет весь массив
   отсортированным префиксом, а дописанный хвост взятого не отсортирован. Прежде паника во время записи
   этого не делала — курсоры потом бинарным поиском шли по несортированному и теряли события.
   КУРСОРЫ и КЭШ ДОГОНЯЛКИ производны от точки входа — их сбрасывает schedInvalidate здесь, а следующий
   запуск (startTransport с доли начала скобы) ставит их заново и догоняет аккорды/бас оттуда. */
/* ⛳ S3.5d-fix: ПОРЯДОК — 1) закрыть и остановить запись, 2) остановить транспорт, 3) тишина, 4) перемотка.
   (1) ПЕРВЫМ, пока транспорт ещё идёт: концы ложатся на песенную долю НАЖАТИЯ, а recLeadOff/recBassOff при этом ещё
       успевают распознать шов прохода (recFoldRoll) — обе вещи опираются на живую опору t0. recStop — только ЗАПИСЬ
       событий в массив, звука он не издаёт.
   (2) ДО тишины: clearPump снимает насос, loop.on=false — после этого ни scheduleLayers, ни fireNear больше не
       позовутся, то есть ни одна нота дорожки не может быть поставлена ПОСЛЕ шага (3).
   (3) softAllOff гасит всех владельцев — живых и дорожечных, в т.ч. уже поставленные вперёд аккорд/бас (их hold уже
       заведён, и chordOff/bassOff снимают назначенную атаку). droneOff — уровень дрона.
       ⚠️ Честная принятая цена, как у стопа/заглушения: УДАРЫ, уже поставленные в окно SCHED_AHEAD (~300мс), —
       одноразовые осцилляторы, отменить их нечем; они доиграют.
   (4) Перемотка на начало скобы — последней: к ней уже нечего привязывать.
   Прежний вариант S3.5d (выбрасывать незакрытое) снят: защёлкнутая прогрессия без переатак — одна незакрытая нота,
   и паника стирала её целиком. Вне записи паника дословно прежняя. */
function panic(){
  if(recording) recStop();                         // (1) ТОТ ЖЕ путь, что ●, без зацепок обучения
  clearPump(); loop.on=false; fxPlayStop(); schedInvalidate();   // (2) события целы, транспорт остановлен — возобновят его с новой базой; O-3: и живая цепь возвращается человеку
  softAllOff(); droneOff();                        // (3)
  setRecording(false);
  loop.pos=loop.rgn.from;                          // (4) S3.5c: на начало скобы (rgn уже приведён к материалу schedInvalidate выше); onLoop стартует ровно отсюда
  hooks.loop && hooks.loop(false);
}

/* Экспорт: `recording` через export-клаузу — живая связка (её читает draw). */
export { secPerBeat, beatNow, timeAt, secOf, beatsOf,
  WleadOn, WleadOff, WchOn, WchSet, WchOff, WbassOn, WbassOff, WdrumHit, wTapSet,
  softAllOff, panic, inPB, recording,
  onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopMetre, METRES, setLoopSub, SUBS, beatLevel, setLoopQuant, setLoopBpm, loop, events, loopPos,
  songBeats, seekTo,   // S3.3: длина песни в долях (её читает полоса лупера, чтобы вписать таймлайн) и перемотка (пока по ней ездит только «пуск с конца → с начала»)
  setRegionOn, regionOn, cycling, braceTap, braceMove, braceSet,   // ED6: braceSet — both edges at once (a tapped section).  S3.5b: ⟳ только вкл/выкл повтора; скобу двигает тап/перетаскивание (ui), границы и user draw читает из loop.rgn
  loadArrangement, loadJam, clearJam, loopChordDeg, loopChordOct,
  toggleLaneMute, toggleLaneSolo, laneMuted, laneSoloed, laneSoloOn, toggleArm, armedLayer, laneDelTap, laneDelCancel, laneDelPendingLayer,   // дорожки (S1): ПИШЕТ ui (тап по полосе), ЧИТАЕТ draw (вид строки). Адрес — НОМЕР СЛОЯ, id остаётся внутри
  songNotes,      // S4.0: события, собранные в НОТЫ (только чтение) — по ним рисует пиано-ролл
  editOpen, editClose, editIsOpen, editLayer, editSetLayer,   // S5.0: редактор дорожки — ОДИН флаг на все отказы; наружу отдаём НОМЕР СЛОЯ, id остаётся здесь (правило #27)
  editMoveHit, editDeleteHit, editInsertHit, editUndo, editRedo, editCanUndo, editCanRedo, editBackingOpen,   // S5.1/S5.3: правка ударов, отмена и ВОЗВРАТ ПРАВОК (не путать с ⤺ — та снимает взятое)
  songSegs, editMoveSeg, editDeleteSeg, editInsertBass, editResizeSeg,   // S5.5/S5.6: СЕГМЕНТЫ (высота держится до следующей смены), правка баса по ним и ДЛИНА
  editInsertChord,
  editInsertLead,   // S4: вставка ноты соло (зеркало editInsertBass)
  laneAudible,   // слышимость дорожки (тот же предикат, что у обоих путей переигровки) — для пробы P.checkTracks
  laneLevelOf, setLaneLevel, frzBusGain,   // MX1: уровень дорожки (фейдер микшера) — по id дорожки, не в событии и не в подписи заморозки
  /* AR2: имя и порядок показа дорожки (по id дорожки, не в событии); роль и тембр каждой дорожки одним проходом — для показа */
  laneNameOf, setLaneName, laneOrder, moveLane, laneLook,
  /* AR2: снимок и возврат таблиц имён и мест — только для пробы P.checkTrackLook */
  laneShowKeep,
  lanePanOf, setLanePan, layerOfOwner,   // MX2: панорама дорожки — по id дорожки, не в событии, но В ПОДПИСИ заморозки (вплавляется в буфер); layerOfOwner — слой по ключу владельца (рендер, проба)
  tiePartners, laneEditVerOf,   // S6: партнёр пары связки и версия правок дорожки — для пробы P.checkSoloEdit (soloEditBlock снят: отказов нет)
  chordMoveTy,   // T5 (а): тип, который получит целый аккорд при переносе на высоту вне лада — правка и призрак (draw) читают ОДНУ функцию
  editMoveSel, editDeleteSel,
  editCopySel, editPaste, editDuplicateSel, editPasteWhy, editClipInfo,   // ED2: copy, paste, duplicate (the clipboard lives here)
  editQuantSel,   // ED3: quantise the selection after recording
  editDegreeSel, editDegreeWhy,   // ED4: transpose the selection by degrees of its mode, and why it cannot
  pnBars, editVolSel,   // ED5: the Volume address as one bar per note, and a bar drag (shift whole notes' volume)
  editBendPoint, bendDbg, editBendShape, bendEdited, editTrackMode, editTrackModeWhy, trackViewOfLayer,
  editTranspose, editTransposeWhy, songTranspose, songTransposeWhy, trDbg,   // TF3: transpose a track (editor) or the whole song (window) by semitones; trDbg — probe controls   // OWN1: a whole track into another mode by degrees; OWN2: move / add / delete a theremin note's bend point (bendDbg — probe control only); BEND-CURVE: segment shape, the pure edit (drag ghost)
  /* ED6: sections — markers, insert / cut / duplicate bars in every track, the song history (↶/↷ of the arrangement window) */
  sections, secAdd, secRename, secDelete, songEdit, songEditWhy, songUndo, songRedo, songCanUndo, songCanRedo,
  /* ED6 probe only: the forgetting plan (control), the song history reset, the tracks' edit versions kept and restored, the capture lanes as data */
  secDbg, songHistReset, laneVerKeep, takeFxDump,
  /* ED7: the one history — ↶/↷ everywhere, table steps (level / pan / name / order / master), ✕ as a step; probe: reset, length, hash, controls */
  histUndo, histRedo, histCanUndo, histCanRedo, histLen, histReset, histTab, histMaster, laneNameStep, moveLaneStep, clearSong, songSaveRec, songOpenApply, songPlan, songMark, songDirty, histHash, histDbg, histTopLabel,
  cmdSet, cmdNote, onApplied,   // CMD1d: the commands that are not steps, and the journal
  editDeleteChordNote, editMoveChordNote, editResizeChordNote,   // U2/U3: правка ОДНОЙ ноты аккорда (удаление, перенос во времени, длина) — аккорд распадается на однонотные (dissolvePlan)
  fxIsDriven,      // O-3.1: правит ли этим адресом запись ПРЯМО СЕЙЧАС — читают столбики, чтобы пометить чужое
  autAddrs, autPoints, autMovePoint, autDeletePoint, autAddPoint, autShapePoint, autCurvePoint,   // autCurvePoint — BEND-CURVE: curvature of a glide into a bus lane point. autShapePoint — гладкая автоматизация: форма отрезка, входящего в точку   // O-4 часть 1: ПОЛОСА АВТОМАТИЗАЦИИ — что показать, что нарисовать и три правки
  autChainOf, autChainAdd, autChainRemove, autChainMove,   // O-4 часть 2: цепь САМОЙ ДОРОЖКИ (живая цепь не трогается — см. шапку). ⚠️ fxAddableIds отсюда НЕ реэкспортируем: меню берёт его прямо у audio, где он и объявлен
  laneTimbreOf, editSetTimbre,   // T5: тембр дорожки (индекс тембра роли / набора ударных) и его ЗАМЕНА — одна правка истории
  seedTake,   // засев тестовой песни через push (scaleprobe P.seed) — не часть игры
  viewAudit, editViewCheck,   // T6a: защитные проверки вида — сводка для пробы P.checkRules и проверка правки (ui зовёт у расшифровки ряда)
  evHz, evHzDbg, evReg, segChordNotes, probeTake, backingEvent,
  liveAllOff, backingFollowKey, droneViewNow, frzSigTonicDbg,   // TF2: the key knob silences live owners only; the backing follows the key; the drone's view; signature control   // T4c-1/T4c-2: цена и место в реестре голосов события (их зовёт ENG), ноты аккорда сегмента (распад) и подмена событий — для пробы P.checkStrip
  hlOf,   // T4b4: место подсветки переигранной ноты из индекса (прежнее по ступени снято в T4c-2) — для пробы P.checkHl; legacy уходит в T4c
  laneRoleOf, laneLenOf, chaseFor, chaseNote,   // chaseFor/chaseNote — для песенной строки пробы (P.checkSong); legacy* сняты в T4c-2. eventTuningIndex (T4a) — индекс в строе, который ДОЛЖЕН стоять у события (проба сверяет a.ti). laneLenOf — конец материала слоя подложки (render: длина буфера заморозки).  T4: РОЛЬ ДОРОЖКИ (одна с T2) или null — редактор открывается на ней, а вкладок ролей больше нет
  captureInfoOf,   // O-2: СВОДКА захвата дорожки — единственный сегодняшний читатель реестра (показ в редакторе). Сам реестр наружу не отдаём: его пока некому исполнять
  /* F3 — ОФЛАЙН-РЕНДЕР: та же таблица диспетчеризации против ЧУЖОЙ копии движка · то же слияние ленты автоматизации (⛔ второго не
     писать) · роль события (чья это цепь эффектов) · fxLaneExpand — плавные отрезки ленты, развёрнутые в точки шагом тика (рендер и
     ухо-проба R.live) · КЛЮЧИ ВЛАДЕЛЬЦЕВ ldKey/chOwnerKey/bassOwnerKey — render.trackOpen помнит по ним незакрытые голоса (формулы
     ОДНИ — здесь; вторая копия в рендере разошлась бы с переигровкой).
     ⚠️ ПОЧИНКА: гладкая автоматизация дописала fxLaneExpand и свой комментарий ПОСЕРЕДИНЕ этой строки — три ключа владельцев
     оказались ЗА `//`, то есть перестали экспортироваться, и заморозка любой дорожки с соло/аккордами/басом падала
     («REC.bassOwnerKey is not a function»). Рендер грузится лениво, поэтому поломка видна лишь на ❄. Комментарии в этом
     списке — ОТДЕЛЬНЫМИ строками или блоком над именами, не в хвосте строки, куда допишут следующее имя. */
  makeENG, fxLaneMerge, fxLaneExpand, evRole, FX_CHAIN,
  ldKey, chOwnerKey, bassOwnerKey,
  /* Записанная автоматизация «плавная внутри движения»: переключатель для уха (render.recSteps / aud({recSteps})). В интерфейсе его нет. */
  setAutRecSmooth,
  /* AF1: очередь автозаморозки (frzqueue.js) — id дорожки по слою и обратно, подпись свежести (чтение; мемо то же) */
  laneOf as laneIdOf, laneLayerOf, freezeSig,
  /* AF2: подмена событий буфером — последний план дорожки и контроли (только проба P.checkSwap), скоба пробы */
  frzSwapInfo, frzSwapDbg, braceProbe,
  /* AF6b: упаковка замороженного буфера в 16 бит (render.freeze — заранее, кусками), режим хранения и дефекты кусков (только проба), узлы-чтецы */
  frzPackAsync, frzStoreMode, frzChunkDbg, frzNodesInfo, FRZ_CHUNK,
  /* AF6b-fix: заморозка играет только после «готов» с потока звука — ждать её (render.freeze, пробы) */
  frzWhenReady,
  /* AF6b-fix2: сколько чтецов живо на потоке звука (только проба: утечки нет) */
  frzReadersAlive,
  frzGlobalKey,   // A1: the cheap global "some signature may have changed" key; read through frzWatchKey
  /* AF3: the auto-freeze watcher (frzqueue.js) — its key, tonic-only staleness, chain presence, memory, song-load pinning */
  frzWatchKey, frzRetuneOnly, laneHasChain, frzBytesTotal, frzBytesOf, songPinChains,
  /* AF5: where recorded automation plays (render.live), and the probe control of the old shared network */
  playKeyOf, setLiveIsolation, fxPlayDriving, setLiveLeakDbg,
  /* probe only: revert an editor session's edits after it closed (P.checkLiveIsolation) */
  editHistPeek, editRevert,
  recLayers, isRecLayer,   // T1: СЛОИ ВЗЯТОГО — полоса и заголовок читают их вместо одиночного loop.layer (в T1 слой один)
  freezeTicket,   // A2: БИЛЕТ заморозки (слой + id дорожки + подпись), снятый ДО рендера; freezeSet ставит буфер только если билет ещё верен
  freezeSet, unfreezeLayer, frozenLayers, frozenInfo, freezeState, frzHas, freezePinCaptures,   // F4/F5: ЗАМОРОЗКА как РЕЖИМ ВОСПРОИЗВЕДЕНИЯ; freezeState — 'none'|'fresh'|'stale' для показа (звук гатится тем же предикатом внутри)
  frzLayer,   // F4: ЗАМОРОЗКА как РЕЖИМ ВОСПРОИЗВЕДЕНИЯ. События не выбрасываются: пока буфер есть, транспорт играет ЕГО вместо событий дорожки. Зовут пока только из консоли (render.js), кнопки в этом слайсе нет
  droneAudible,   // «есть ли СЛЫШИМЫЙ слой-дрон» — снаружи сегодня никем не читается (ui перестраивает дрон droneRetune'ом без уровня, слайс «дрон и центы»); оставлен для консоли и рендера
};
