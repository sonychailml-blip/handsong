/* REC3 part 2 (stage 3) — INSERTS of the track editor (bass, solo, chords, drum hits; the session take; the pinned chain of a new track) and the TIMBRE REPLACEMENT (T5) — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web Audio;
   imports only song/, scales.js and config.js; the live choices, the transport and the engine's declarations come through song/env.js.
   Moved verbatim; the edited lines are marked REC3. */
import { volFromOld } from '../config.js';
import { laneRoleOf, takeNext } from './capture.js';
import { autCaps } from './automation.js';
import { EDIT_GAP, chordMoveTy, editCommit, editGuard, editLayer, editPush } from './edit-notes.js';
import { chaseRole, events, isNoteStart } from './store.js';
import { layerSlotTop, layerTakeTop, songSegs, trackViewCheck } from './notes.js';
import { CUR, chordTypeFits, chordUnit, modeSlotOfTi } from '../scales.js';
import { ENV } from './env.js';
const chainKeyOf=(...a)=>ENV.chainKeyOf(...a);   // REC3: the chain key, wired

/* Громкость вставленной в редакторе ноты, когда в дорожке спросить не у кого: прежние 0.8, пересчитанные в новую шкалу
   (VOL-2b, config.volFromOld) — чтобы вставка звучала так же громко, как до стандартизации (удар и бас: √0.86 ≈ 0.927). */
const editDefVol=role=>volFromOld(role,0.8);
let editTake=0;   // сделанное · отменённое (ждёт ↷) · номер взятого для ВСТАВОК сессии
const editTakeReset=()=>{ editTake=0; }, editTakeNow=()=>editTake||(editTake=takeNext());   // REC3: the session take — reset by the editor session, made by the first insert or paste
/* AF3: an insert into a track that has no captured chain in any take pins the live chain at that moment (user decision: a track
   created in the editor gets a snapshot at birth); the 'autcap' step goes FIRST in the same history entry, so ↶ removes both.
   A track that already has a chain keeps inheriting it (autCaps makes nothing). */
function editInsPush(layer,u){ const pin=autCaps(layer,true); editPush(pin.ops.length ? { kind:'batch', list:[...pin.ops,u] } : u); }
/* Кит и громкость вставленного удара — у БЛИЖАЙШЕГО удара ЭТОЙ дорожки («как здесь принято»), иначе живой
   кит и средняя громкость. Обход O(n) — один на вставку, не на кадр. */
function editDrumDefaults(layer,t){
  let best=null,bd=Infinity;
  for(const e of events) if(e.layer===layer&&e.fn==='drum'){ const d=Math.abs(e.t-t); if(d<bd){ bd=d; best=e; } }
  return { kit: best&&best.a.kit!=null ? best.a.kit : ENV.live().kitTim,
           vol: best&&best.a.vol!=null ? best.a.vol : editDefVol('dr') };
}
/* Вставка бас-ноты: пара «вкл»+«выкл» со СВЕЖИМ k (свой владелец — см. довод о порядке выше).
   ⛳ ОТКУДА ПОЛЯ: тембр — ТОЛЬКО с «вкл» соседней ноты (у ведения он записан, но звук его не читает —
   тембр печётся на атаке; брать его с ведения значит списывать у того, кто им не распоряжается);
   громкость — с ближайшего бас-события, НЕСУЩЕГО громкость (U5: прежде ближайшим мог оказаться «выкл» без громкости — и вставка молча
   брала умолчание); ЛАД И СЕПТАККОРД — с ПОКАЗАННОЙ ГРУППЫ (их передаёт редактор),
   ⛔ а не CUR(): нота обязана родиться в том ладу, в котором нарисована ось. Пустая дорожка группы не
   имеет — тогда вызывающий честно передаёт живой лад.
   ⛳ U5: ВЫСОТА — ЛЮБАЯ ВЫСОТА СТРОЯ, яркий ряд или приглушённый (как перенос с T5): пишется пара ряда (ti, oct) как есть. Отказ — только
   у нецелого индекса или регистра (такого ряд не отдаёт). */
function editInsertBass(t,ti,oct,sc,sev,len){   // T4c-1: высота — индексом (ряд оси); U5: и вне лада
  if(!editGuard()) return false;
  if(!Number.isInteger(ti)||!Number.isInteger(oct)) return false;   // U5: прежде — отказ, если высоты нет в ладу
  const layer=editLayer();
  trackViewCheck(layer,sc);   // T6a: проверка вида, поведение не меняет
  let on=null, near=null, bd=Infinity;
  for(const e of events){
    if(e.layer!==layer||chaseRole(e.fn)!=='bs') continue;
    const d=Math.abs(e.t-t);
    if(d<bd && e.a && e.a.vol!=null){ bd=d; near=e; }
    if(e.fn==='bassOn' && (!on||Math.abs(e.t-t)<Math.abs(on.t-t))) on=e;
  }
  const inst = on&&on.a.inst!=null ? on.a.inst : ENV.live().bassTim;
  const vol  = near&&near.a.vol!=null ? near.a.vol : editDefVol('bs');
  const k=layerTakeTop(layer);                               // свой ключ владельца: пересечься с существующим басом нечем
  editTakeNow();
  const t0=Math.max(0,t), t1=t0+Math.max(EDIT_GAP*2,len||1);
  const mk=(fn,a,tt)=>({ t:tt, layer, fn, a:(k?{...a,k}:a), sc, sev, tk:editTake });
  const evOn =mk('bassOn', {ti,oct,vol,inst}, t0);   // T4c-2: индекс и регистр, ступени нет
  const evOff=mk('bassOff',{}, t1);
  events.push(evOn,evOff);
  editInsPush(layer, { kind:'ins', evs:[evOn,evOff] });
  editCommit(); return evOn;
}
/* ═══ ВСТАВКА НОТЫ СОЛО (S4) — ЗЕРКАЛО editInsertBass: бас и соло — один инструмент ═══
   Пара «вкл»+«выкл» со СВЕЖИМ номером ноты v (layerSlotTop — выше всех номеров слоя): у ключа соло 'leadloop:N:v' суффикса k нет,
   свежая идентичность — v (EDIT_ROLE.ld.fresh); пересечься с нотами дорожки ей нечем.
   ⛳ ОТКУДА ПОЛЯ (решения пользователя по плану S4–S7):
     • ВЫСОТА — пара тронутого ряда (ti, oct), любого, яркого или приглушённого (как у баса с U5); лад и септаккорд — оси (их передаёт
       редактор), ⛔ не CUR() (правило #7);
     • ТЕМБР — с «вкл» БЛИЖАЙШЕЙ ноты соло дорожки, иначе живой leadIdx;
     • ГРОМКОСТЬ — с ближайшего события соло, НЕСУЩЕГО её, иначе editDefVol('ld') (правило #30: громкость есть всегда);
     • КАРТА ЭФФЕКТОВ — с ближайшего события соло, несущего ноту («вкл» или ведение; «выкл» ноты не несёт), КОПИЕЙ И КАК ЕСТЬ, ВКЛЮЧАЯ ЕЁ
       ОТСУТСТВИЕ (решение 1): нота звучит, как соседи. ⚠️ У соло отсутствие карты значит «звучи ЖИВОЙ цепью» (audio.applyFx, R2), а
       пустая карта {} — драйв 0 (умолчание 0.12): поэтому карту НЕ выдумываем — ни {}, ни снимок, когда у соседа её нет. В ПУСТОЙ
       дорожке (соседей нет вовсе) — снимок живой цепи соло (fxSnapshot), ровно то, что записала бы сыгранная сейчас нота;
     • БЕНДА, СВЯЗКИ И hold НЕТ НИКОГДА: вставленная нота — обычная нота, не терменвокс и не продолжение чужой.
   Отказ — только у нецелого индекса или регистра (такого ряд не отдаёт). */
function editInsertLead(t,ti,oct,sc,sev,len){
  if(!editGuard()) return false;
  if(!Number.isInteger(ti)||!Number.isInteger(oct)) return false;
  const layer=editLayer();
  trackViewCheck(layer,sc);   // T6a: проверка вида, поведение не меняет
  let on=null, near=null, nfx=null, bd=Infinity, bf=Infinity;
  for(const e of events){
    if(e.layer!==layer||chaseRole(e.fn)!=='ld') continue;
    const d=Math.abs(e.t-t);
    if(d<bd && e.a && e.a.vol!=null){ bd=d; near=e; }
    if(e.fn!=='leadOff' && d<bf){ bf=d; nfx=e; }              // ближайшее событие, несущее ноту, — его карта (или её отсутствие)
    if(e.fn==='leadOn' && (!on||d<Math.abs(on.t-t))) on=e;
  }
  const inst = on&&on.a.inst!=null ? on.a.inst : ENV.live().leadTim;
  const vol  = near&&near.a.vol!=null ? near.a.vol : editDefVol('ld');
  const fx   = nfx ? (nfx.a&&nfx.a.fx ? {...nfx.a.fx} : null) : ENV.fxSnapshot(chainKeyOf('ld'));   // копия соседа как есть; пустая дорожка — снимок живой цепи
  const v=layerSlotTop(layer);
  editTakeNow();
  const t0=Math.max(0,t), t1=t0+Math.max(EDIT_GAP*2,len||1);
  const mk=(fn,a,tt)=>({ t:tt, layer, fn, a, sc, sev, tk:editTake });
  const evOn =mk('leadOn', fx ? {ti,oct,vol,fx,inst,v} : {ti,oct,vol,inst,v}, t0);   // поля — в порядке записанного «вкл» соло ({...жест, v}), ступени нет
  const evOff=mk('leadOff',{v}, t1);                          // «выкл» соло несёт свой v всегда (как recLeadOff)
  events.push(evOn,evOff);
  editInsPush(layer, { kind:'ins', evs:[evOn,evOff] });
  editCommit(); return evOn;
}
/* ═══ ВСТАВКА В ДОРОЖКУ АККОРДОВ (S2; ⛳ U5 — правила пользователя) — пара «вкл»+«выкл» со СВЕЖИМ k, как у баса ═══
   ⛳ ЧТО ВСТАВЛЯЕТ ТАП (решения пользователя, U5):
     • НИЧЕГО НЕ ВЫДЕЛЕНО (или выделена ОДНА нота аккорда) → ОДНА НОТА: аккорд из одной ноты на тронутом ряду — любом, яркий он или
       приглушённый; тип — единица корня scales.chordUnit(вид) (каноническая форма ноты на ряду, как у переноса одной ноты U4): нота
       звучит ровно высоту ряда. Прежнее правило S2 «тип ближайшего аккорда, иначе первый тип палитры» СНЯТО.
     • выделен ЦЕЛЫЙ аккорд (sel — его определяющее событие; что выделение целое, решает ui: уровень одной ноты сюда не передаётся) →
       ЕГО ФОРМА от тронутого корня: типизированный — ТОТ ЖЕ тип, жёстко; нетипизированный на ЯРКОМ корне — нетипизированный, по правилу
       лада (качество следует ступени, как у переноса); нетипизированный на ПРИГЛУШЁННОМ корне — правило там аккорда не строит, поэтому
       — типизированный с НЫНЕШНИМИ интервалами выделенного (вариант (а) T5, та же функция chordMoveTy); её отказ (null — недостижим
       сегодня) — отказ вставки. Септаккорд (sev) — выделенного аккорда: форма нетипизированного от него зависит.
   ⛳ ВСТАВКА НИЧЕГО НЕ РАСПУСКАЕТ: новая пара — свой ключ владельца 'loop:N:k' со свежим k, соседние аккорды не тронуты.
   ⛳ ОТКУДА ПОЛЯ: с выделенным аккордом — ТЕМБР (тембр его ноты, seg.inst), ГРОМКОСТЬ (его определяющего события) и ЯРКОСТЬ (только
   если она у него задана) — копия этого аккорда; без выделения — тембр с «вкл» ближайшего аккорда дорожки (тембр печётся на атаке),
   иначе живой chIdx; громкость с ближайшего события аккорда, несущего её, иначе editDefVol('ch'); яркости нет (отсутствие a.bri —
   «не задана», фильтр открывается на атаке). Правило #30: громкость у вставленной ноты есть ВСЕГДА. ЛАД — показанной группы (их передаёт
   редактор; правило #7); выделенный аккорд обязан быть в том же виде и в той же дорожке, иначе он не форма (вставка — одна нота).
   В ладу без аккордов (правило 'none') аккорда нет — отказ, как прежде (T6b).
   ⛔ Живая защёлка ('latch') не трогается ничем: это события дорожки, её владелец — 'loop:N:k' (правило #20). */
function editInsertChord(t,ti,oct,sc,sev,len,sel){   // T4c-1: высота корня — индексом (ряд оси); U5: и вне лада; sel — ЦЕЛЫЙ выделенный аккорд или null
  if(!editGuard()) return false;
  if(!Number.isInteger(ti)||!Number.isInteger(oct)) return false;   // U5: прежде — отказ, если высоты нет в ладу
  if(sc && sc.chordRule && sc.chordRule.kind==='none') return false;   // ⛳ T6b: в ладу без аккордов (правило 'none') аккорда нет — не вставляем беззвучный
  const layer=editLayer();
  trackViewCheck(layer,sc);   // T6a: проверка вида, поведение не меняет
  const S= sel && sel.layer===layer && chaseRole(sel.fn)==='ch' && sel.sc===sc ? songSegs().byEv.get(sel) : null;
  const shape= S && S.ev===sel ? S : null;                   // форма — только у определяющего события сегмента того же вида и дорожки
  let ty, inst, vol, bri, sv=sev;
  if(shape){
    if(shape.ty) ty=shape.ty;                                // типизированный — жёстко (тип — данные; сравнение по значению, правило #7)
    else if(modeSlotOfTi(ti,oct,sc)) ty=null;                // нетипизированный на ярком корне — правило лада
    else { ty=chordMoveTy(shape,ti,oct); if(!ty) return false; }   // на приглушённом — с нынешними интервалами (вариант (а))
    sv=shape.sev; inst=shape.inst; vol=shape.vol; bri=shape.ev.a.bri;
  }else{
    ty=chordUnit(sc);                                        // одна нота: единица корня — нота звучит высоту ряда
    let on=null, near=null, bd=Infinity;
    for(const e of events){
      if(e.layer!==layer||chaseRole(e.fn)!=='ch'||e.fn==='chOff') continue;
      const d=Math.abs(e.t-t);
      if(d<bd && e.a && e.a.vol!=null){ bd=d; near=e; }
      if(e.fn==='chOn' && (!on||Math.abs(e.t-t)<Math.abs(on.t-t))) on=e;
    }
    inst = on&&on.a.inst!=null ? on.a.inst : ENV.live().chTim;
    vol  = near ? near.a.vol : null;
  }
  if(ty && !chordTypeFits(ty, ti, sc)) return false;        // ⛳ T7: форма, которой на этом корне нет в строе (Партч — вне 43 высот), не вставляется (ui называет причину)
  if(inst==null) inst=ENV.live().chTim;
  if(vol==null) vol=editDefVol('ch');                        // правило #30
  const k=layerTakeTop(layer);                               // свой ключ владельца 'loop:N:k': пересечься с аккордами дорожки нечем
  editTakeNow();
  const t0=Math.max(0,t), t1=t0+Math.max(EDIT_GAP*2,len||1);
  const mk=(fn,a,tt)=>({ t:tt, layer, fn, a:(k?{...a,k}:a), sc, sev:sv, tk:editTake });
  const evOn =mk('chOn', bri!=null ? {ti,oct,vol,inst,ty,bri} : {ti,oct,vol,inst,ty}, t0);   // T4c-2: индекс корня и регистр, ступени нет
  const evOff=mk('chOff',{}, t1);
  events.push(evOn,evOff);
  editInsPush(layer, { kind:'ins', evs:[evOn,evOff] });
  editCommit(); return evOn;
}
function editInsertHit(t,row){
  if(!editGuard()) return false;
  const layer=editLayer(), d=editDrumDefaults(layer,t);
  /* ⛳ ОДНО ВЗЯТОЕ НА СЕССИЮ ПРАВКИ, а не на удар: ⤺ снаружи снимает «последнее взятое», и сессия правки —
     ближайший аналог дубля записи. Иначе десять вставок требовали бы десяти ⤺. */
  editTakeNow();
  const ev={ t:Math.max(0,t), layer, fn:'drum', a:{row, vol:d.vol, kit:d.kit}, sc:CUR(), sev:ENV.live().seventh, tk:editTake };
  events.push(ev);
  editInsPush(layer, { kind:'ins', evs:[ev] });
  editCommit(); return ev;
}
/* ═══ ЗАМЕНА ТЕМБРА ДОРОЖКИ (слайс T5) ═══
   ⛳ ПОСЛЕ ЗАПИСИ ЭТО ЕДИНСТВЕННЫЙ ПУТЬ сменить тембр дорожки (вооружение живой тембр не переключает — T3).
   Замена — ВНУТРИ РОЛИ: роли хранят разные виды нот (ряд / ступень+тип / одна нота), поэтому поле одно
   на роль — у ударных набор (`a.kit`), у прочих тембр (`a.inst`). Роль дорожки от замены не меняется, а
   значит не меняется и её ЦЕПЬ (ключ — по роли, T4): эффекты и записанная автоматика остаются дорожке —
   записанная автоматика И ЕСТЬ исполнение (решение пользователя №1).
   ЧТО ПЕРЕПИСЫВАЕТСЯ — ровно то, что тембр НЕСЁТ: каждое начало ноты («вкл», удар) и ведение соло, если в
   нём тембр есть (смена посреди ноты из материала до T3 — переигровка его играет, T0-fix). Ведения аккорда
   и баса тембра не несут никогда. Дрон — ни то, ни другое: у слоя дрона роли нет, выбора ему не дают.
   ⚠️ НАГРУЗКА — НОВЫМ ОБЪЕКТОМ, как у переноса: прежний уходит в историю целиком, и обратный ход не может
   растерять поля (tie, v, k, fx, bend, bri…). Время и замороженный лад (sc/sev, правило #7) не трогаются.
   ⛳ ОДНА ЗАПИСЬ ИСТОРИИ на всю замену: один тап — один ↶ — один ↷ (kind:'timbre', список {ev,from,to}).
   ⛳ ОБЫЧНЫЙ editCommit: версия правок дорожки растёт, а свёртка тембров в подписи свежести (T0) меняется
   сама — замороженная дорожка УСТАРЕВАЕТ и играет событиями уже в новом тембре. Курсоры — как у любой
   правки (#28), сортировка ничего не переставит: времена те же. */
function laneTimbreOf(layer){
  if(layer==null) return null;
  for(const e of events) if(e.layer===layer&&isNoteStart(e.fn)&&e.a){ const x= e.fn==='drum' ? e.a.kit : e.a.inst; if(x!=null) return x; }
  return null;
}
function editSetTimbre(id){
  if(id==null||!editGuard(true)) return false;             // true — подложке тоже можно (см. editGuard)
  const layer=editLayer(), role=laneRoleOf(layer); if(!role) return false;
  const f= role==='dr' ? 'kit' : 'inst', ch=[];
  for(const e of events){
    if(e.layer!==layer||!e.a) continue;
    if(!(isNoteStart(e.fn) || (e.fn==='leadSet'&&e.a.inst!=null))) continue;
    if(e.a[f]===id) continue;
    const from=e.a, to={...e.a, [f]:id};
    ch.push({ev:e, from, to}); e.a=to;
  }
  if(!ch.length) return false;                              // уже этот тембр — не правка (иначе ↶ «ничего не делает»)
  editPush({ kind:'timbre', ch });
  editCommit(); return true;
}

export { editDefVol, editTake, editTakeReset, editTakeNow, editInsPush, editInsertBass, editInsertLead, editInsertChord, editInsertHit, laneTimbreOf, editSetTimbre };
