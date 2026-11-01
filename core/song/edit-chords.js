/* REC3 (stage 3) — CHORD-NOTE EDITS (U2–U4: a chord dissolves into one-note chords when one of its notes is deleted, moved or resized),
   moved from recorder.js (which re-exports these names — a facade). Pure: no DOM, no Web Audio;
   imports only song/, the pitch truth scales.js and config.js. Moved verbatim; the edited lines are marked REC3. */
import { chaseRole } from './store.js';
import { chaseKind, songSegs, layerTakeTop } from './notes.js';
import { EDIT_GAP, EDIT_MIN_LEN, commitDetach, detachPlan, editDeleteSeg, editGuard, editLayer, editMoveSeg, editResizeSeg, segChordNotes, slotPt } from './edit-notes.js';
import { chordUnit } from '../scales.js';

/* ═══ U2: РАСПАД АККОРДА — ПРАВКА ОДНОЙ ЕГО НОТЫ ═══
   ⛳ ЗАКОН (решение пользователя, план «АККОРД КАК НОТЫ»): правка ОДНОЙ ноты аккорда РАСПУСКАЕТ его на ОДНОНОТНЫЕ аккорды, и
   правка применяется к одной из них. U2 — УДАЛЕНИЕ ноты, U3 — её перенос во времени и длина, U4 — по высоте (chordNoteEdit ниже).
   ⛳ ЧТО ПИШЕТСЯ. Сперва — ТО ЖЕ ОТДЕЛЕНИЕ, что у переноса и удаления сегмента (detachPlan, E2): сегмент посреди ведения
   (аккорды, сменённые одной защёлкой) становится отдельной нотой; одиночный аккорд (сегмент-начало со своим «выкл») берётся как
   есть — отделять его не от чего. Затем отделённая нота РАЗМНОЖАЕТСЯ: на каждую оставшуюся ноту аккорда — своя копия ВСЕХ её
   событий («вкл», ведения громкости и яркости внутри, «выкл»), каждая
     • с ТЕМ ЖЕ корнем и регистром (a.deg/a.oct) и ТЕМ ЖЕ замороженным ладом (sc/sev едут с событием — правило #7);
     • с ОДНОЭЛЕМЕНТНЫМ ТИПОМ a.ty = [интервал этой ноты] — интервал ровно тот, что вернула scales.chordNotes (iv — в мере ветки
       цены: целые полутоны у сетки и ступенчатых наборов, отношение у чистых); ⚠️ это НОВЫЙ массив, а не ссылка в наборе
       семейств (правило #7 — тип в событии теперь бывает и данными вне палитры; сравнение — tyEq, по значению);
     • со СВОИМ свежим суффиксом взятого k (k0, k0+1, … — выше всех k слоя, layerTakeTop), то есть со своим владельцем
       'loop:N:k': у каждой ноты свой голос, ничья с ничьей не путается;
     • громкость, яркость, тембр («вкл»), отметки автоматизации (sh/gen) — КОПИИ полей исходных событий, ничего не выдумано.
   Удаляемая нота просто не получает копии. Первая оставшаяся нота едет на ИСХОДНЫХ объектах событий (ход 'move'), прочие —
   новыми объектами в том же взятом (tk) и слое (правило #27). Всё — ОДНА составная правка (commitDetach → editBatch): один ↶
   возвращает аккорд в точности (те же объекты, те же нагрузки), одна запись истории.
   ⛳ ПОЧЕМУ ЗВУК ОСТАВШИХСЯ НОТ НЕ МЕНЯЕТСЯ (доказательство — по движку, audio.chordOn/chordGlide/chordOff):
     • ВЫСОТА: chordFreqs(deg,oct,sc,sev,[iv_i]) — та же ветка chordNotes с тем же корнем (корень не зависит от типа ни в одной из
       четырёх ветвей), нота = корень·iv_i (или ступень корень+iv_i сетки / шаг r0+iv_i) — ровно частота ноты i исходного аккорда;
     • УРОВЕНЬ: голос аккорда получает ins.lvl·volAmp(vol)·(1−rnd·0.05) — от ЧИСЛА нот уровень не зависит (нормировки на число
       голосов в chordOn нет), значит одна нота звучит так же, как в составе;
     • ФИЛЬТРЫ: f (атака) ставится из тембра и громкости, fb (яркость) — из a.bri; оба — пер-голосовые и от состава не зависят
       (правило #19 не тронуто);
     • ВЕДЕНИЕ: chordGlide сопоставляет голос i частоте i; у однонотного аккорда голос 0 — частоте 0, то есть той же ноте;
     • ШИНА: все владельцы 'loop:N:*' слоя идут в одну chordBus → одна цепь эффектов дорожки;
     • ГОЛОСОВ не больше, чем было (N−1 из N): живой пул 24 крадёт не раньше прежнего.
     Различается лишь гуманизация (−0..5% уровня, ±10% атаки, центы) — она СВЕЖАЯ на каждой атаке и не записывается (правило
     #11), то есть различалась и между двумя переигровками одного аккорда.
   ⚠️ ЦЕНА ПЛАТИТСЯ ЗДЕСЬ (та же, что у E2, и только у сегмента ВНУТРИ ведения): там, где аккорд плавно сменялся из соседнего и
   плавно перетекал в следующий, теперь «выкл» и новая атака — края сегмента РЕ-АРТИКУЛИРУЮТСЯ (detachPlan). Одиночный аккорд
   распадается без цены: ноты атакуют и отпускаются ровно там, где и прежде.
   null — распускать нечего или некуда (открытый сегмент — так лежит подложка, её не правят). */
function dissolvePlan(seg,N,drop){
  const n=seg.note, X=seg.endEv;
  const alone = seg.first && X && chaseKind(X.fn)==='f';      // одиночный аккорд: отделять не от чего — берём все его события как есть
  const P = alone ? { ops:[], items:n.evs.map(e=>({ orig:e, fn:e.fn, t:e.t, a:e.a })) } : detachPlan(seg);
  if(!P) return null;
  const k0=layerTakeTop(n.layer), items=[];
  N.map((x,i)=>i).filter(i=>i!==drop).forEach((i,j)=>{
    const ty=[N[i].iv], k=k0+j;                               // свой тип из одной ноты и свой владелец 'loop:N:k'
    for(const it of P.items){
      const a={...it.a, ...(chaseKind(it.fn)!=='f'?{ty}:null), k};   // «выкл» типа не несёт — у него только ключ
      items.push({ ...(j===0 ? {...it, a} : { orig:null, proto:it.orig||it.proto, fn:it.fn, t:it.t, a }), note:i });   // U3: note — номер ноты в chordNotes, чья это копия (по нему перенос и длина находят СВОЮ однонотную)
    }
  });
  return { ops:P.ops, items };
}
/* Удалить ОДНУ ноту аккорда (idx — её номер в scales.chordNotes сегмента, тот же, что у блока на экране): аккорд распадается
   на однонотные, удаляемая уходит (см. dissolvePlan). Аккорд из одной ноты — это удаление сегмента целиком, как прежде.
   → true или false. */
function editDeleteChordNote(ev,idx){
  if(!editGuard()||!ev||ev.layer!==editLayer()||chaseRole(ev.fn)!=='ch') return false;
  const seg=songSegs().byEv.get(ev); if(!seg||seg.ev!==ev) return false;
  const N=segChordNotes(seg);   // T4b2: ноты — по индексу корня (типизированный), иначе по ступени — те же интервалы, что играет ENG (проба T4b1)
  if(!(idx>=0&&idx<N.length)) return false;
  if(N.length<2) return editDeleteSeg(ev);
  const P=dissolvePlan(seg,N,idx); if(!P) return false;
  return !!commitDetach(P,true);
}
/* ═══ U3: ПЕРЕНОС ВО ВРЕМЕНИ И ДЛИНА ОДНОЙ НОТЫ АККОРДА ═══
   ⛳ ТОТ ЖЕ РАСПАД, ЧТО У УДАЛЕНИЯ (U2), — без второй модели: dissolvePlan(seg, N, -1) распускает сегмент на однонотные аккорды, НИ
   ОДНОЙ не снимая (каждая звучит ровно как в составе — доказательство в шапке распада), а затем правка трогает ТОЛЬКО копию выбранной
   ноты (it.note === idx): перенос сдвигает ВСЕ её события («вкл», ведения громкости/яркости внутри, «выкл») на одну дельту; длина
   двигает её «выкл» и снимает её же ведения за новым концом (как editResizeSeg). Прочие копии стоят где стояли.
   ⛳ СТОЛКНУТЬСЯ НЕ С ЧЕМ: у каждой копии свой свежий k выше всех k слоя (dissolvePlan), значит ни перенос, ни удлинение не заходят на
   чужой ключ — зажим и «свежий k по столкновению» (E1) здесь не нужны. Перекрытие с соседним аккордом — два голоса, как у E2.
   ⚠️ ЦЕНА — та же, что у распада: сегмент внутри ведения сперва ОТДЕЛЯЕТСЯ (detachPlan), и его края ре-артикулируются.
   Всё — ОДНА составная правка (commitDetach → editBatch): один ↶ возвращает аккорд в точности.
   Высота одной ноты — U4 (editMoveChordNote с deg/oct, ниже). Аккорд из одной ноты — обычный сегмент: editMoveSeg / editResizeSeg.
   → «вкл» правленой однонотной (её выделит редактор) или false. */
function chordNoteEdit(ev,idx,fn){
  if(!editGuard()||!ev||ev.layer!==editLayer()||chaseRole(ev.fn)!=='ch') return false;
  const seg=songSegs().byEv.get(ev); if(!seg||seg.ev!==ev) return false;
  const N=segChordNotes(seg);   // T4b2: см. editDeleteChordNote (T4c-1: без ступени)
  if(!(idx>=0&&idx<N.length)) return false;
  if(N.length<2) return fn(seg,null);
  const P=dissolvePlan(seg,N,-1); if(!P) return false;
  const mine=P.items.filter(it=>it.note===idx);               // копия выбранной ноты: «вкл» первым, свой «выкл» последним (события сегмента идут по времени)
  if(!mine.length||fn(seg,mine)===false) return false;
  for(const it of mine) if(chaseKind(it.fn)==='n') it.sel=true;
  return commitDetach(P,true);
}
/* ⛳ U4: ПЕРЕНОС ОДНОЙ НОТЫ ПО ВЫСОТЕ — тот же распад, затем копия выбранной ноты получает КАНОНИЧЕСКУЮ ФОРМУ РЯДА: ступень и регистр
   ряда (deg/oct — ui расшифровывает ряд rollRowPitch по ладу оси) и однонотный тип scales.chordUnit(лад сегмента) — единицу корня, то
   есть аккорд из одного корня. Нота звучит ровно высоту ряда — ступени лада, то есть высоты СТРОЯ (HANDOFF, «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ»:
   ноты строятся из высот строя, лад — подсветка; ряд вне лада — приглушённый; с T5 нота встаёт и на него — та же каноническая форма, высота строя вне лада): нота
   вне ряда (чистое отношение между высотами строя), перенесённая
   на ряд, ПРИЛИПАЕТ к нему. Лад события не трогаем (правило #7): форма считается в его же sc.
   deg==null — высота не меняется (только время, U3). Время и высота вместе — ОДНА правка. Высота на все события копии, несущие
   высоту («вкл» и ведения внутри); «выкл» её не несёт.
   Аккорд из одной ноты (сам — нота): обычный перенос сегмента, но с той же канонической формой (editMoveSeg с ty) — иначе его
   прежний однонотный тип [iv] от прежнего корня увёл бы ноту мимо ряда, к которому её тянули (у нетипизированного лада корень
   идёт по ступеням, а интервал — в шагах). */
/* ⛳ T4c-1: высота приходит ИНДЕКСОМ (ti, oct — ряд оси). ⛳ T5: ряд — любой, яркий или приглушённый (slotPt). */
function editMoveChordNote(ev,idx,t,ti,oct){
  const pitch = ti!=null && oct!=null;
  return chordNoteEdit(ev,idx,(seg,mine)=>{
    if(!mine) return pitch ? editMoveSeg(seg.ev,t,ti,oct,chordUnit(seg.sc)) : editMoveSeg(seg.ev,t,seg.ti,seg.oct);
    const d=Math.max(0,t)-mine[0].t;
    if(Math.abs(d)<=1e-9 && !pitch) return false;
    const pt=pitch ? slotPt(ti,oct,chordUnit(seg.sc)) : null;   // T5: любая высота строя — однонотный аккорд в канонической форме ряда
    if(pitch && !pt) return false;
    for(const it of mine){ it.t+=d; if(pt && chaseKind(it.fn)!=='f') it.a={...it.a, ...pt}; }
  });
}
function editResizeChordNote(ev,idx,t){
  return chordNoteEdit(ev,idx,(seg,mine)=>{
    if(!mine) return editResizeSeg(seg.ev,t);
    const on=mine[0], off=mine[mine.length-1];
    if(chaseKind(off.fn)!=='f') return false;
    const T=Math.max(t, on.t+EDIT_MIN_LEN);
    if(Math.abs(T-off.t)<=1e-9) return false;
    off.t=T;
    for(const it of mine) if(it!==on && it!==off && it.t>=T-EDIT_GAP) it.drop=true;   // ведения этой ноты за новым концом — после «выкл» они сироты
  });
}

export { editDeleteChordNote, editMoveChordNote, editResizeChordNote };
