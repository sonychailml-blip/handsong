/* REC3 (stage 3) — THE EDITOR'S EDIT CORE AND NOTE EDITS (guard, commit, batch, tie pairs, key clash, detach; move / resize / delete of
   notes and drum hits), moved from recorder.js (which re-exports these names — a facade). Pure: no DOM, no Web Audio;
   imports only song/, the pitch truth scales.js and config.js. Moved verbatim; the edited lines are marked REC3. */
import { events, compactEvents, evOrder, evSeqFill, schedInvalidate, chaseRole } from './store.js';
import { chaseKey, chaseKind, songSegs, layerSlotTop, layerTakeTop } from './notes.js';
import { laneOf, laneVerBump } from './lanes.js';
import { histApply as editApply, histCanUndo, histCanRedo, histPush, histSeal } from './history.js';
import { chordNotesAt, chordTypeFits, modeSlotOfTi, periodOf, tuningOf } from '../scales.js';
import { bendSplit } from '../config.js';

/* REC3: what the edits need from the editor session and the recorder comes once through editWire: ready (sound started), isOpen and
   layer (the editor session — its open track), pause (stop the transport before an edit), touch (after an edit: the capture version and
   the open track's edit version — its freeze goes stale). */
const W={ ready:()=>false, isOpen:()=>false, layer:()=>null, pause:()=>{}, touch:()=>{} };
const editWire=o=>{ Object.assign(W,o); };
const editIsOpen=()=>W.isOpen(), editLayer=()=>W.layer();

const editCanUndo=()=>histCanUndo();   // ED7: the editor's ↶/↷ are the one history's
const editCanRedo=()=>histCanRedo();
const editPush=u=>{ histPush(u); };   // ED7: the single writer of the one history (a new step drops the redo branch)   // НОВАЯ правка обрывает ветку отменённого
/* ⛳ СОСТАВНАЯ ПРАВКА (E1) — ОДНА запись истории из НЕСКОЛЬКИХ ходов уже существующих видов ('move', 'ins',
   'del', 'timbre', ходы полосы автоматизации). Вперёд — по порядку, назад — в ОБРАТНОМ (editApply, 'batch'),
   сортировка и сброс курсоров — ОДИН раз на всю правку (editCommit, правило #28).
   ⛳ ЗАЧЕМ ИМЕННО ТАК: у человека одна ↶, и она обязана снимать ОДНО действие, из скольких бы событий оно ни
   состояло — перенос ноты целиком (E1), отделение сегмента глиссандо (E2: «выкл» слева + ноты под свежим
   ключом + «вкл» справа), затем правка соло и аккордов. Нового вида хода для каждой из них не заводим:
   они собираются из тех, что уже умеют ходить в обе стороны.
   ⚠️ list строит ВЫЗЫВАЮЩИЙ, и ходы в нём ещё НЕ ПРИМЕНЕНЫ (у 'move' — оба состояния, from и to): применяет их
   editBatch тем же editApply, которым потом ходят ↶/↷, — вперёд и назад по одному пути, а не по двум.
   Вызывающий уже прошёл editGuard. */
function editBatch(list){
  if(!list||!list.length) return false;
  list=tieUntiePass(list);                                     // ⛳ S6: правка края пары связки развязывает ОБЕ половины — той же записью истории
  for(const u of list) editApply(u,false);
  editPush(list.length===1 ? list[0] : { kind:'batch', list });   // один ход — сам ход, без обёртки: в истории та же запись, что дала бы прежняя одиночная правка
  editCommit(); return true;
}
/* Дорожка ПОДЛОЖКИ (🎵): её события помечены ev.jam, и clearJam снимает их ЦЕЛИКОМ. Правка внутри такой
   дорожки пережила бы снятие подложки осиротевшим обрывком — поэтому подложка в S5.1 ТОЛЬКО ЧИТАЕТСЯ.
   ⚠️ Аранжировка из ⚙-панели метки НЕ несёт (известное расхождение, см. отчёт) и потому правится как
   обычная запись — это честно: clearJam её и не тронет. */
const laneIsBacking=layer=> layer!=null && events.some(e=>e.layer===layer&&e.jam);
const editBackingOpen=()=>laneIsBacking(editLayer());
/* ЕДИНЫЙ ВХОД ВСЕХ ПРАВОК: редактор открыт, дорожка жива и не подложка, транспорт ОСТАНОВЛЕН.
   ⚠️ ПАУЗУ СТАВИМ ЗДЕСЬ, А НЕ В ui: правка при идущем транспорте легла бы под уже запланированные в окно
   опережения события и под звучащие голоса. onLoop — обычная пауза, а следующий ▶ поднимет состояние
   обычной догонялкой (chasePlay в startTransport) — уже с учётом правки. */
/* ⛳ T5: backingOk — ЕДИНСТВЕННОЕ послабление: ЗАМЕНА ТЕМБРА подложке разрешена (решение пользователя №2).
   Она переписывает тембр у всех событий дорожки и не рождает обрывков — clearJam снимает их все, ev.jam
   цел. Ноты подложки по-прежнему только читаются: все прочие правки зовут editGuard() без флага. */
/* REC3: the gates and the pause come from the recorder (editWire): sound started, the editor open on a live track, transport paused. */
function editGuard(backingOk){
  if(!W.ready()||!editIsOpen()||editLayer()==null) return false;
  if(!backingOk && editBackingOpen()) return false;
  W.pause();
  evSeqFill();
  return true;
}
function editCommit(){ evSeqFill(); events.sort(evOrder); schedInvalidate(); W.touch(); histSeal(); }   // one rebase per edit (rule #28); W.touch: capture version + only the edited track goes stale (A2); histSeal: the tripwire hash (ED7)
function editMoveHit(ev,t,row){
  if(!editGuard()||!ev||ev.fn!=='drum'||ev.layer!==editLayer()) return false;
  const from={t:ev.t, a:ev.a}, to={t:Math.max(0,t), a:{...ev.a, row}};   // ОБА состояния: from для ↶, to для ↷
  editPush({ kind:'move', ev, from, to });
  ev.t=to.t; ev.a=to.a;
  editCommit(); return true;
}
function editDeleteHit(ev){
  if(!editGuard()||!ev||ev.fn!=='drum'||ev.layer!==editLayer()) return false;
  if(!compactEvents(e=>e===ev)) return false;
  editPush({ kind:'del', evs:[ev] });                      // держим САМИ объекты — и ↶, и ↷ возвращают/убирают ровно их
  editCommit(); return true;
}
/* ═══ БАС: ПРАВКА ПО СЕГМЕНТАМ (слайс S5.5; НЕЗАВИСИМЫЕ НОТЫ — E1/E2) ═══
   ⛳ ПОЧЕМУ НЕ «НОТА». У бас-ноты ОДИН владелец голоса (в ведущем режиме — один на дорожку; в полифоническом у каждой
   одновременной ноты свой, по a.v), и смена высоты — это ВЕДЕНИЕ (bassSet),
   а не новая нота: бас-линия, сыгранная одним непрерывным движением, — это ОДНА нота songNotes на
   много высот. Редактировать её как одну — значит показать многоминутную полосу на одной высоте.
   Единица правки здесь — СЕГМЕНТ: событие, которое ЗАДАЁТ высоту («вкл» или ведение со сменой ступени),
   и промежуток до следующей такой смены. Вывод сегментов — songSegs, рядом с songNotes.
   ⛔ ПОРЯДОК ВНУТРИ КЛЮЧА ВЛАДЕЛЬЦА — вот чем бас опаснее удара (у того ключа нет вовсе). Все события
   одной бас-ноты И все ноты того же k делят ключ 'bassloop:N[:k]', а движок требует, чтобы время внутри
   ключа не шло назад: переставь ведение за соседа — и на переигровке ноты поменяются местами, а «выкл»
   закроет чужую.
   ⛳ S0 (правка соло и аккордов): функции ниже больше не басовые — роль берут из таблицы EDIT_ROLE (чуть ниже), и та же
   машинерия отделения служит соло и аккордам. С S2 правимы и аккорды (state.ROLL_EDITABLE), с S4 — соло (бас и соло — ОДИН
   инструмент: та же правка). Слово «бас» в доводах ниже — это история того, для кого их писали; закон тот же у всех трёх ролей.
   ⛳ E2: ЗАКОН НЕЗАВИСИМОСТИ. Прежде порядок стерегли ЗАЖИМОМ — событие нельзя было увести за соседа по ключу, —
   и именно зажим делал ноты ЗАВИСИМЫМИ: перенос сегмента глиссандо двигал общую с соседом границу, длина
   середины отнималась у следующего, удаление середины давало прежней высоте тянуться дальше. Пользователь это
   отверг: в редакторе ноты обязаны быть независимы. Теперь правка, которая задела бы соседа, сперва ОТДЕЛЯЕТ
   сегмент в собственную ноту под СВЕЖИМ k (тот же ход, что у вставки editInsertBass), и столкнуться ему больше
   не с кем — зажим не нужен вовсе. Перекрытие двух бас-нот переигровка уже умеет: ключ различает голоса. */
const EDIT_GAP=1e-4;                                        // зазор у границы: «вплотную» с равным t порядок решила бы сортировка, а не мы
const EDIT_MIN_LEN=1/32;                                    // минимальная длина ноты в долях: короче — это уже не нота, а щелчок
/* ═══ ТАБЛИЦА РОЛЕЙ ПРАВКИ (слайс S0 правки соло и аккордов) ═══
   ⛳ ОДНА МОДЕЛЬ ПРАВКИ НА ТРИ ЛАДОВЫЕ РОЛИ. Отделение сегмента, перенос ноты целиком, длина и удаление (E1/E2) строились для
   баса, но в них нет ничего басового, кроме ТРЁХ вещей, — их и держит эта таблица, а функции ниже читают её вместо литералов:
     on / off — какие события начинают и кончают ноту роли;
     fresh(слой) — СВЕЖАЯ идентичность ноты (часть ключа владельца, которой в слое ещё нет): у баса и аккордов — суффикс взятого k
       ('bassloop:N:k[:v]', 'loop:N:k'; layerTakeTop — выше всех k слоя), у соло — номер ноты v ('leadloop:N:v'; layerSlotTop —
       выше всех номеров слоя). ⚠️ У ключа соло суффикса k НЕТ ВОВСЕ — свежий k соло ничего бы не развёл (и layerTakeTop на
       дорожке соло всегда 0);
     keep(a) — поля ключа, которые нота ОСТАВЛЯЕТ себе при свежей идентичности: у баса это номер ноты v (P2: ключ 'bassloop:N:k:v'
       различает одновременные бас-ноты и при новом k); у аккорда и соло — ничего (у соло v и есть свежая идентичность);
     oldOff(a) — что несёт «выкл», закрывающий ноту под ПРЕЖНИМ ключом (по нагрузке определяющего события): бас — k и v, только
       ненулевые (байт-в-байт прежний E2); аккорд — k, только ненулевой; соло — v ВСЕГДА, как пишет запись (recLeadOff).
   ⛔ ВСТАВКА СЮДА НЕ ВХОДИТ: у каждой роли свои поля новой ноты (тембр, карта, тип) — это слайсы S2/S4.
   ⚠️ S0 был НЕВИДИМ (список правимых ролей не тронут); S2 открыл аккорды, S4 — соло (его отказы сняты к S6 — см. «ПАРЫ СВЯЗКИ» ниже);
   у баса каждая функция ниже даёт ТЕ ЖЕ события, что и прежде (сверено построчно — см. отчёт слайса). */
const EDIT_ROLE={
  bs:{ on:'bassOn', off:'bassOff', fresh:ly=>({k:layerTakeTop(ly)}),
       keep:a=>{ const v=(a&&a.v)||0; return v?{v}:null; },
       oldOff:a=>{ const k=(a&&a.k)||0, v=(a&&a.v)||0; return {...(k?{k}:null), ...(v?{v}:null)}; } },
  ch:{ on:'chOn', off:'chOff', fresh:ly=>({k:layerTakeTop(ly)}),
       keep:()=>null,
       oldOff:a=>{ const k=(a&&a.k)||0; return k?{k}:{}; } },
  ld:{ on:'leadOn', off:'leadOff', fresh:ly=>({v:layerSlotTop(ly)}),
       keep:()=>null,
       oldOff:a=>({v:(a&&a.v)||0}) },
};
const editRoleOf=fn=>EDIT_ROLE[chaseRole(fn)]||null;       // null — удар, дрон, сирота без роли: правкам сегмента не подлежит
/* ═══ S4: ОТКАЗ ПРАВКИ СОЛО — ОДИН ПРЕДИКАТ (с S5 отказ ОДИН; ⛳ С S6 ОТКАЗОВ НЕТ — ПРЕДИКАТ СНЯТ) ═══
   ⛳ S6: край пары связки больше не отказывается — правка, двигающая или снимающая его, РАЗВЯЗЫВАЕТ обе половины (tieUntiePass в
   editBatch). Предикат, всегда отвечающий «нет», — мёртвый код и ложное обещание крючка: общее правило теперь живёт в editBatch, через
   который идёт каждая правка нот, и нового отказа сюда не добавить, не обойдя его. Текст ниже — история S4/S5. */
/* (история)
   Соло правится ТОЙ ЖЕ машинерией, что бас (бас и соло — один инструмент). В S4 отказывали две правки, каждая — до своего слайса:
     • (СНЯТ в S5) ДЛИНА НОТЫ ТЕРМЕНВОКСА. Перенос «выкл» оставлял бы точки кривой бенда ПОСЛЕ отпускания. С S5 укорочение ОБРЕЗАЕТ кривую
       (bendTrim, editResizeSeg), а голос, выданный новому владельцу, начинается без расписанной кривой (audio.leadAlloc → leadOn). Перенос
       целиком, смена высоты и удаление терменвокса верны по построению с S4: события едут все вместе, dt точек бенда — от атаки, центы —
       от ступени атаки (контур переносится и транспонируется сам).
     • КРАЙ ПАРЫ СВЯЗКИ (до S6) — «вкл» с a.tie (нота продолжает ноту другой дорожки после смены тембра, T3) или «выкл» с a.tie (её
       продолжает нота другой дорожки). Правка, меняющая ВРЕМЯ такого края или снимающая его, оставила бы ноту, входящую без атаки из
       ничего, или обрубок с быстрым релизом посреди звука. Смена ОДНОЙ высоты край не трогает — разрешена.
   op: 'time' — перенос во времени (editMoveSeg с другой долей: одиночная нота целиком или отделение — время меняют события самого
   сегмента: «вкл», если сегмент — начало ноты, и «выкл», если он последний), 'del' — удаление (то же множество краёв), 'len' — длина
   (двигается только «выкл», и только когда сегмент кончается СВОИМ «выкл»; граница глиссандо отделяет сегмент, не трогая краёв).
   → ключ словаря с причиной ('roll.tieEdge') или null. ⛔ ОДИН ИСТОЧНИК: его зовут и функции правки (инвариант),
   и ui (сказать почему) — второй копии условия в ui нет. Только чтение. */
/* ═══ S6: ПАРЫ СВЯЗКИ — НАЙТИ ПАРТНЁРА, РАЗВЯЗАТЬ ОБЕ ПОЛОВИНЫ ═══
   ПАРА (T3): нота соло, продолженная через смену тембра, — «выкл» с a.tie в дорожке прежнего тембра и «вкл» с a.tie в дорожке нового, в ОДНУ
   долю, в ОДНОМ взятом. Переигровка делает из пары 20-мс переход (быстрый релиз + вход без атаки и удара). Правка, СДВИГАЮЩАЯ общий край во
   времени или СНИМАЮЩАЯ его (перенос ноты, длина, удаление, перенос целиком — на любом пути: editMoveNote, отделение, editResizeSeg,
   editDeleteSeg), оставила бы обрубок с быстрым релизом или ноту, входящую без атаки из ничего. РЕШЕНИЕ ПОЛЬЗОВАТЕЛЯ: такая правка МОЛЧА
   снимает tie с ОБЕИХ половин той же записью истории — дальше это две обычные ноты (своя атака, свой релиз). Смена одной высоты время края не
   трогает — связка остаётся.
   ⛳ ПАРТНЁР: противоположное событие соло («вкл» ↔ «выкл») с a.tie, того же взятого (tk), на ТОЙ ЖЕ доле, в ДРУГОЙ дорожке. Кандидатов
   больше одного — когда при смене тембра звучало НЕСКОЛЬКО нот (две руки, несколько пальцев): каждая даёт свою пару, все в одну долю и
   одну пару дорожек. Тогда сверяется ВЫСОТА — пара (ti, oct) ноты на краю (у «выкл» — сегмент, который он кончает; у «вкл» — его сегмент).
   Не различает её только УНИСОН двух нот (или терменвокс: продолжение начинается с ближайшей ступени, а не со ступени атаки) — тогда
   развязываются ВСЕ кандидаты (названо: лишняя развязка лишь даёт соседней паре свою атаку; оставить связанной чужую — хуже).
   → массив партнёров (пустой — не край пары). Только чтение. */
const noTie=a=>{ if(!a||!('tie' in a)) return a; const {tie, ...rest}=a; return rest; };
function tiePitch(ev){
  const S=songSegs();
  const g= ev.fn==='leadOn' ? S.byEv.get(ev) : S.segs.find(s=>s.endEv===ev);
  return g ? { ti:g.ti, oct:g.oct } : null;
}
function tiePartners(ev){
  const a=ev&&ev.a; if(!a||!a.tie) return [];
  const want= ev.fn==='leadOff' ? 'leadOn' : ev.fn==='leadOn' ? 'leadOff' : null; if(!want) return [];
  const C=events.filter(e=>e!==ev && e.fn===want && e.a && e.a.tie && e.tk===ev.tk && e.layer!==ev.layer && Math.abs(e.t-ev.t)<1e-9);
  if(C.length<2) return C;
  const p=tiePitch(ev); if(!p) return C;
  const M=C.filter(e=>{ const q=tiePitch(e); return !!q && q.ti===p.ti && q.oct===p.oct; });
  return M.length ? M : C;
}
/* ПРОХОД РАЗВЯЗКИ — внутри editBatch, то есть у КАЖДОЙ правки нот (список ходов ещё не применён: события в прежнем состоянии).
   Край пары, чьё время меняет ход 'move' (to.t ≠ from.t), теряет tie в своём же ходе (новая нагрузка to.a); край, уходящий ходом 'del',
   уходит со своей нагрузкой (↶ вернёт её с tie). Каждому партнёру — ход 'move' без смены времени с нагрузкой без tie (НОВЫЙ объект: ↶ вернёт
   прежний побитно) и ход 'lanetouch' его дорожки: freezeSig tie не сворачивает, а версия правок дорожки (laneEditVer) — сворачивает, и
   editCommit поднимает её только у ПРАВЛЕНОЙ дорожки. Ход 'lanetouch' поднимает версию партнёра и вперёд, и назад — замороженный партнёр
   устаревает на правке, на ↶ и на ↷. Нет краёв пары — список прежний, тем же объектом (байт-в-байт прежние правки). */
function tieUntiePass(list){
  const moved=[], gone=[], inList=new Set();
  for(const u of list){
    if(u.kind==='move'){ inList.add(u.ev); if(u.from&&u.from.a&&u.from.a.tie && Math.abs(u.to.t-u.from.t)>1e-9) moved.push(u); }
    else if(u.kind==='del'||u.kind==='ins') for(const e of u.evs){ inList.add(e); if(u.kind==='del'&&e.a&&e.a.tie) gone.push(e); }
  }
  if(!moved.length&&!gone.length) return list;
  const extra=[], ids=new Set(), done=new Set();
  for(const e of [...moved.map(u=>u.ev), ...gone])
    for(const p of tiePartners(e)){ if(done.has(p)||inList.has(p)) continue; done.add(p);
      extra.push({ kind:'move', ev:p, from:{t:p.t, a:p.a}, to:{t:p.t, a:noTie(p.a)} });
      const id=laneOf(p.layer); if(id!=null) ids.add(id); }
  for(const u of moved) u.to={ t:u.to.t, a:noTie(u.to.a) };   // свой tie — в своём же ходе (to — объект плана, не события)
  for(const id of ids) extra.push({ kind:'lanetouch', id });
  return [...list, ...extra];
}
/* Удаление СТРОКИ дорожки (✕): выжившие половины её пар развязываются (решение пользователя). ⚠️ Удаление строки НЕ ОТМЕНЯЕТСЯ (S3.5d) —
   развязка идёт тем же необратимым шагом: нагрузка партнёра заменяется новым объектом без tie, версия правок его дорожки поднимается
   (замороженный партнёр устаревает). → сколько партнёров развязано. */
function untieAcross(layer){
  const ids=new Set(); let n=0;
  for(const e of events){ if(e.layer!==layer||!e.a||!e.a.tie) continue;
    for(const p of tiePartners(e)){ if(p.layer===layer||!p.a.tie) continue; p.a=noTie(p.a); n++; const id=laneOf(p.layer); if(id!=null) ids.add(id); } }
  for(const id of ids) laneVerBump(id);
  return n;
}
/* События ОДНОГО сегмента, по времени: определяющее («вкл» или смена высоты) и ведения громкости внутри.
   Берём тем же обратным указателем byEv, которым songSegs их и собрал: «выкл» туда не входит (он кончает
   сегмент, а не принадлежит ему), определяющее событие следующего сегмента — тоже. */
function segEvs(seg){ const SV=songSegs(); return seg.note.evs.filter(e=>SV.byEv.get(e)===seg); }
/* Есть ли на отрезке [a,b] (с зазором) событие ДРУГОЙ ноты того же ключа владельца. O(n) на правку, не на кадр.
   S0: роль — у самой ноты (n.role), ключ — тем же chaseKey, что у движка и songNotes; у баса проверка дословно прежняя. */
function keyClash(n,a,b){
  const own=new Set(n.evs);
  for(const e of events){
    if(own.has(e)||e.layer!==n.layer||chaseRole(e.fn)!==n.role||chaseKey(n.role,e)!==n.key) continue;
    if(e.t>=a-EDIT_GAP && e.t<=b+EDIT_GAP) return true;
  }
  return false;
}
/* ⛳ E1: НОТА ИЗ ОДНОГО СЕГМЕНТА ПЕРЕНОСИТСЯ ЦЕЛИКОМ. Прежде перенос двигал ТОЛЬКО определяющее событие — «вкл», —
   зажатое перед соседом по ключу, а соседом у одиночной ноты оказывался её же «выкл». Призрак при этом рисовал
   блок ПРЕЖНЕЙ длины на новом месте (ui держит rollDrag.len), а в песню ложилось другое: нота, утащенная вправо,
   укорачивалась и не могла перейти свой старый конец, влево — удлинялась. Обещание и результат расходились
   (правило #9 — о том же, со стороны правки).
   Одиночная нота = сегмент-НАЧАЛО (first), кончающийся СВОИМ «выкл» (endEv — «выкл»): смены высоты в ней нет.
   Ведения ГРОМКОСТИ границами сегмента не являются (songSegs режет только по смене высоты), поэтому записанная
   нота с дрожью руки внутри — по-прежнему ОДИН сегмент, и сюда она попадает.
   Такую ноту переносим ЦЕЛИКОМ — «вкл», её ведения громкости и «выкл» на одну и ту же дельту, одной составной
   правкой. Высота — всем событиям, которые её несут («выкл» высоты не несёт).
   ⛳ ЧУЖАЯ НОТА ТОГО ЖЕ КЛЮЧА на новом месте — нота берёт СВЕЖИЙ k (см. шапку): зажим снова разошёлся бы с призраком. */
/* ⛳ T4c-1: ПРАВКА ПОЛУЧАЕТ ВЫСОТУ ИНДЕКСОМ В СТРОЕ (ti) и регистром — так её отдаёт ряд редактора (draw: ось → {ti, oct}).
   ⛳ T5: ЛЮБАЯ ВЫСОТА СТРОЯ — ЯРКИЙ ряд или приглушённый. Два слоя (решение пользователя): строй даёт высоты, лад их подсвечивает;
   правка может выйти из лада, живая игра руками — нет. Нота вне лада — просто другой индекс строя: поля альтерации нет, ступени
   в событии нет (T4c-2), поэтому писать нечего, кроме самой пары. Прежде (до T5) высота вне лада давала null — правки не было.
   Отказ — только у нецелого индекса или регистра (такого ряд не отдаёт). */
function slotPt(ti,oct,ty){ return (Number.isInteger(ti)&&Number.isInteger(oct)) ? (ty ? {ti,oct,ty} : {ti,oct}) : null; }   // T5: без вида — проверять в ладу больше нечего
/* ⛳ T5, ВАРИАНТ (а) (решение пользователя): ЦЕЛЫЙ НЕТИПИЗИРОВАННЫЙ аккорд, перенесённый на высоту ВНЕ лада (приглушённый ряд),
   СОХРАНЯЕТ ФОРМУ — становится типизированным со своими НЫНЕШНИМИ интервалами (iv нот segChordNotes — шаги строя от корня, то, что он
   звучит сейчас). «Терции через ступень лада» от корня вне лада не определены; форма — определена. Вернувшись на яркий ряд, он ОСТАЁТСЯ
   типизированным (как перенесённые ноты U4): тип в событии — данные, а не ссылка в палитру (правило #7, сравнение — tyEq).
   → undefined — тип не трогать (не аккорд; уже типизирован — переносится жёстко, как прежде; корень в ладу — правило лада, как прежде);
     массив интервалов — писать его; null — отказ: форма в шагах строя неотличима от формы по правилу только на РАВНОМ октавном строе,
     чей шаг — шаг лада (цена нетипизированного — номинально-равная, типизированного — в шагах строя). Сегодня каждый лад с правилом
     аккордов стоит на таком строе (P.checkRules), так что отказ недостижим; он — страж для лада пользователя.
   ОДНА функция на правку (editMoveSeg) и на призрак переноса (draw.rollGhostSeg) — правило #9. */
function chordMoveTy(seg,ti,oct){
  if(!seg||seg.role!=='ch'||seg.ty||modeSlotOfTi(ti,oct,seg.sc)) return undefined;
  const sc=seg.sc, T=sc&&tuningOf(sc);   // F1: строй вида события
  if(!T || sc.cents || periodOf(sc)!==2 || T.equal!==sc.edo) return null;
  const N=segChordNotes(seg); return N.length ? N.map(n=>n.iv) : null;
}
function editMoveNote(n,t,pt){
  const R=EDIT_ROLE[n.role]; if(!R||!pt) return false;                  // U4: ty — однонотный аккорд в КАНОНИЧЕСКОЙ форме ряда (chordUnit); без него — прежние {deg,oct}
  const d=Math.max(0,t)-n.start;
  const fr= keyClash(n, n.start+d, n.end+d) ? R.fresh(n.layer) : null;   // S0: свежая идентичность ПО РОЛИ (бас/аккорд — {k} ≥1: в слое есть хотя бы эта нота; соло — {v} выше всех номеров слоя)
  const list=n.evs.map(e=>{
    const pitch = chaseKind(e.fn)!=='f';                     // S0: «выкл» высоты не несёт — у любой роли (у баса прежнее e.fn!=='bassOff')
    const a = (pitch||fr) ? {...e.a, ...(pitch?pt:null), ...fr} : e.a;   // нагрузка — НОВЫМ объектом (как у переноса); sc/sev/tk едут с самим событием (правило #7). Порядок полей прежний: {…, deg, oct, k}
    return { kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t+d, a} };
  });
  return editBatch(list) ? n.head : false;
}
/* ═══ E2: ОТДЕЛЕНИЕ СЕГМЕНТА ГЛИССАНДО ═══
   Сегмент s ноты под ключом K становится ОТДЕЛЬНОЙ нотой — строится ПЛАН, ещё ничего не тронуто:
     • s — не начало ноты → в его начале под K ложится «выкл»: левая часть ноты кончается там;
     • события s (определяющее и ведения громкости внутри) переходят под СВЕЖИЙ k. Определяющее, если оно было
       сменой высоты, становится «вкл» — с тембром НАЧАЛА ноты (ведения баса тембра не несут, T0);
     • конец s: свой «выкл» ноты (s — последний) переходит под новый k вместе с ним; иначе в конце s ложится
       новый «выкл» под новый k;
     • s кончался СЛЕДУЮЩЕЙ СМЕНОЙ ВЫСОТЫ → та смена становится «вкл» под K: правая часть — новая атака и дальше
       идёт под K как шла. Время внутри K монотонно: левая часть < «выкл» в начале s < «вкл» в конце s.
   Затем правка применяется к ОТДЕЛЁННОЙ ноте (items), и всё вместе — ОДНА составная запись истории (editBatch):
   один ↶ возвращает глиссандо в точности (те же объекты событий, те же нагрузки).
   ⚠️ ЦЕНА ПЛАТИТСЯ ЗДЕСЬ, И ОНА НАЗВАНА: скольжение В отделённую ноту и ИЗ неё пропадает — где было непрерывное
   глиссандо, теперь «выкл» и новая атака (левая часть отпускается с хвостом релиза, отделённая и правая
   атакуют заново). Нетронутые части звучат ровно как прежде. ⛔ Отделяется ТОЛЬКО то, что правят, и только
   правкой, которая иначе задела бы соседа (перенос во времени, длина на границе глиссандо, удаление); смена
   одной высоты глиссандо сохраняет (решение пользователя).
   ⛔ Новые события — в ТОМ ЖЕ взятом (tk), в том же слое (правило #27) и в СВОЁМ замороженном ладу (sc/sev
   копируются с события, чьё место они занимают, — правило #7): ⤺ снаружи снимет их вместе с дублем.
   null — отделять нечего или некуда (открытый сегмент без конца — так лежит подложка, а её не правят).
   ⛳ S0: РОЛЬ — ИЗ ТАБЛИЦЫ EDIT_ROLE (вид событий, свежая идентичность, «выкл» под прежним ключом). «Под свежим k» выше — это у
   баса и аккордов; у соло свежая идентичность — номер ноты v (см. таблицу). У баса нагрузки и порядок их полей — прежние. */
function detachPlan(seg){
  const n=seg.note, E=seg.ev, X=seg.endEv, R=EDIT_ROLE[n.role];
  if(seg.end==null||!R) return null;
  const fr=R.fresh(n.layer);                                  // свежая идентичность отделённой ноты: бас/аккорд {k}, соло {v}
  /* P2: НОМЕР НОТЫ v — часть ключа владельца баса (bassOwnerKey). Все события одной ноты несут один v, поэтому новый «выкл»
     левой части и «выкл» отделённой ноты обязаны нести его тоже: иначе «выкл» ушёл бы под ДРУГОЙ ключ и не закрыл свою
     ноту. При v=0 (ведущий режим, один владелец) поля нет — нагрузки те же, что до P2; у полифонического баса v бывает ≠0.
     S0: это и есть R.keep (бас) и R.oldOff (у баса — {k?, v?}); у соло «выкл» прежнего ключа несёт свой v всегда (как запись). */
  const keep=R.keep(E.a);
  const inst=((n.head&&n.head.a)||{}).inst, withInst=inst!==undefined?{inst}:null;   // тембр НАЧАЛА ноты: ведения баса и аккорда тембра не несут (T0); у соло ведение несёт тот же тембр, что «вкл» (с T3 открытая нота тембр не меняет)
  const ops=[], items=[];
  if(!seg.first) ops.push({ kind:'ins', evs:[{ t:seg.start, layer:n.layer, fn:R.off, a:R.oldOff(E.a), sc:E.sc, sev:E.sev, tk:E.tk }] });
  for(const e of segEvs(seg)){
    const on = e===E;
    items.push({ orig:e, fn: on?R.on:e.fn, t:e.t, a:{...e.a, ...(on&&e.fn!==R.on?withInst:null), ...fr} });
  }
  if(X && chaseKind(X.fn)==='f') items.push({ orig:X, fn:R.off, t:X.t, a:{...X.a, ...fr} });
  else {
    items.push({ orig:null, proto:E, fn:R.off, t:seg.end, a:{...fr, ...keep} });
    if(X) ops.push({ kind:'del', evs:[X] },
                   { kind:'ins', evs:[{ t:X.t, layer:X.layer, fn:R.on, a:{...X.a, ...withInst}, sc:X.sc, sev:X.sev, tk:X.tk }] });
  }
  return { ops, items };
}
/* ПЛАН → ОДНА СОСТАВНАЯ ПРАВКА. items уже несут КОНЕЧНОЕ состояние отделённой ноты (с правкой). Событие, чей
   вид не меняется, едет ходом 'move' (оба состояния); сменившее вид (ведение → «вкл») и новое — 'del'+'ins'
   новым объектом (вид события в ходе 'move' не хранится); keep=false или it.drop — событие уходит.
   → «вкл» отделённой ноты (его выделит редактор; это НОВЫЙ объект, если «вкл» родилось из смены высоты),
   true для удаления, false при отказе. */
/* U3: у РАСПАДА «вкл» в плане несколько (по одному на ноту), и выделить редактору надо не последний, а ту ноту, которую правили, —
   её «вкл» помечен it.sel; без пометки (отделение E2, удаление U2) — прежнее правило: последнее «вкл» плана. */
function commitDetach(P,keep){
  const list=P.ops.slice(), del=[], ins=[]; let head=null, pick=null;
  for(const it of P.items){
    if(!keep||it.drop){ if(it.orig) del.push(it.orig); continue; }
    if(it.orig && it.orig.fn===it.fn){
      list.push({ kind:'move', ev:it.orig, from:{t:it.orig.t, a:it.orig.a}, to:{t:it.t, a:it.a} });
      if(chaseKind(it.fn)==='n'){ head=it.orig; if(it.sel) pick=it.orig; }   // S0: «вкл» отделённой ноты — у любой роли (у баса прежнее it.fn==='bassOn': в плане бывают только события своей роли)
    }else{
      if(it.orig) del.push(it.orig);
      const p=it.orig||it.proto, ev={ t:it.t, layer:p.layer, fn:it.fn, a:it.a, sc:p.sc, sev:p.sev, tk:p.tk };
      ins.push(ev); if(chaseKind(it.fn)==='n'){ head=ev; if(it.sel) pick=ev; }
    }
  }
  if(del.length) list.push({ kind:'del', evs:del });
  if(ins.length) list.push({ kind:'ins', evs:ins });
  if(!editBatch(list)) return false;
  return keep ? (pick||head) : true;
}
/* Перенос СЕГМЕНТА: во времени и/или по высоте. Высота — НОВАЯ нагрузка (deg/oct), всё прочее едет с
   объектом: ⛔ ev.sc НЕ ТРОГАЕМ НИКОГДА — событие остаётся в СВОЁМ ладу (правило #7), иначе правка в
   хроматике молча переписала бы партчевскую ноту на полутона.
   Три пути, по тому, ЧТО меняется:
     ТОЛЬКО ВЫСОТА (время на месте) — глиссандо СОХРАНЯЕТСЯ (решение пользователя): новая ступень ложится на
       КАЖДОЕ событие сегмента, несущее высоту, — определяющее И ведения громкости внутри. ⚠️ Это починка E1:
       прежде ступень получало одно определяющее событие, а ведения внутри несли старую, и нота РАСПАДАЛАСЬ —
       с первого же ведения снова звучала прежняя высота (songSegs видел смену и резал сегмент).
     ОДИНОЧНАЯ НОТА во времени — целиком (E1, editMoveNote).
     СЕГМЕНТ ГЛИССАНДО во времени — ОТДЕЛЯЕТСЯ и едет один (E2): все его события на одну дельту, соседи на месте.
   → событие, которое редактор выделит после правки (у отделённой — её новое «вкл»), или false. */
/* U4: ty (необязателен) — тип, который ложится вместе со ступенью и регистром на каждое событие, несущее высоту: так однонотный аккорд
   переносится на ряд в КАНОНИЧЕСКОЙ форме (chordUnit) и звучит ровно высоту ряда. Без ty — прежний перенос, тип не трогается. */
/* A segment's new pitch payload {ti, oct[, ty]}, or false when it cannot go there. Untyped whole chord off the mode keeps its shape
   (T5 a); a chord type missing on the new root in the tuning refuses (T7); any pitch of the tuning (T5). Shared by editMoveSeg and
   the group move (ED1). */
function segPitchPt(seg,ti,oct,ty){
  if(ty===undefined){ const ct=chordMoveTy(seg,ti,oct); if(ct===null) return false; ty=ct; }
  if(seg.role==='ch' && !chordTypeFits(ty!==undefined ? ty : seg.ty, ti, seg.sc)) return false;
  return slotPt(ti,oct,ty) || false;
}
function editMoveSeg(ev,t,ti,oct,ty){
  if(!editGuard()||!ev||ev.layer!==editLayer()) return false;
  if(!editRoleOf(ev.fn)) return false;                       // S0: ладовая роль из таблицы (бас/аккорды/соло); редактор пускает сюда бас и аккорды с S2, соло — с S4 (ROLL_EDITABLE)
  const seg=songSegs().byEv.get(ev); if(!seg||seg.ev!==ev) return false;   // правится только ОПРЕДЕЛЯЮЩЕЕ событие сегмента — его и отдаёт попадание (h.ev)
  const pt=segPitchPt(seg,ti,oct,ty); if(!pt) return false;
  const nt=Math.max(0,t);
  if(Math.abs(nt-ev.t)<=1e-9){
    const list=segEvs(seg).map(e=>({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t, a:{...e.a, ...pt}} }));
    return editBatch(list) ? ev : false;
  }
  if(seg.first && seg.endEv && chaseKind(seg.endEv.fn)==='f') return editMoveNote(seg.note,nt,pt);
  const P=detachPlan(seg); if(!P) return false;
  const d=nt-P.items[0].t;                                   // items[0] — определяющее событие (события сегмента идут по времени)
  for(const it of P.items){ it.t+=d; if(chaseKind(it.fn)!=='f') it.a={...it.a, ...pt}; }   // S0: «выкл» высоты не несёт — у любой роли
  return commitDetach(P,true);
}
/* Удаление сегмента.
     ОДИНОЧНАЯ нота (и нота без собственного конца) — уходит ЦЕЛИКОМ, как прежде: все её события.
     СЕГМЕНТ ГЛИССАНДО — E2: отделяется и уходит ОДИН. На его месте — ТИШИНА: левая часть кончается в его начале,
       правая начинается в его конце новой атакой. Прежде уходило одно событие, и предыдущая высота ТЯНУЛАСЬ через
       место удалённой, а удаление НАЧАЛА глиссандо уносило ВСЮ ноту — обе вещи задевали соседей. */
function editDeleteSeg(ev){
  if(!editGuard()||!ev||ev.layer!==editLayer()) return false;
  if(!editRoleOf(ev.fn)) return false;                       // S0: см. editMoveSeg
  const seg=songSegs().byEv.get(ev);
  const whole = !seg || (seg.first && !(seg.endEv && chaseKind(seg.endEv.fn)!=='f'));   // нет сегмента (сирота) / одиночная / начало ноты без смены высоты за ним
  if(!whole){ const P=detachPlan(seg); if(P) return commitDetach(P,false); }
  const evs = (seg&&seg.first&&seg.note) ? seg.note.evs.slice() : [ev];
  if(!evs.some(e=>events.includes(e))) return false;         // прежний отказ compactEvents (удалять нечего)
  return editBatch([{ kind:'del', evs }]);                   // S6: через editBatch — проход развязки видит удаляемый край пары. Один ход — та же запись истории, что прежде (editPush без обёртки)
}
/* ⛳ T4c-1: НОТЫ АККОРДА СЕГМЕНТА — ОДНА функция для распада (удаление одной ноты), правки одной ноты и пробы P.checkStrip: из индекса
   корня, регистра, типа и замороженного вида сегмента (ступени у сегмента больше нет). Интервалы iv — то, что ложится в однонотные типы. */
function segChordNotes(seg){ return chordNotesAt(seg.ti,seg.oct,seg.sc,seg.sev,seg.ty); }
/* ═══ S5: ОБРЕЗКА КРИВОЙ БЕНДА ПО НОВОЙ ДЛИНЕ НОТЫ ═══
   B — кривая (точки {dt, c}, dt в долях от атаки, по возрастанию), L — новая длина ноты в долях. Остаются точки с dt ≤ L; если что-то
   ушло, кривая ЗАКАНЧИВАЕТСЯ точкой {dt:L, c} — значением на новом конце. Значение кривой между точками — значение ПОСЛЕДНЕЙ точки до
   него (переигровка ставит каждую точку ступенью: scheduleBend → setFreq с τ 20 мс), поэтому c конечной точки — c последней оставшейся.
   → ТОТ ЖЕ массив, если за L ничего нет (удлинение, короткая кривая), иначе НОВЫЙ массив; ⛔ ни массив, ни точки не мутируются
   (на них держатся ↶ и прежние нагрузки). Точки в новом массиве — те же объекты (их никто не меняет), конечная — новая. */
function bendTrim(B,L){
  if(!B||!B.length||!(B[B.length-1].dt>L+1e-9)) return B;
  const keep=B.filter(p=>p.dt<=L+1e-9), last=keep[keep.length-1];
  if(last && Math.abs(last.dt-L)<=1e-9) return keep;
  if(last && B[keep.length].sh==='s') return bendSplit(B,L).filter(p=>p.dt<=L+1e-9);   // BEND-CURVE: a glide across the new end ends on its own value there (exact split)
  return [...keep, { dt:L, c: last ? last.c : 0 }];   // до первой точки голос стоит на ступени атаки (0 центов)
}
/* ═══ ДЛИНА СЕГМЕНТА (S5.6; E2) ═══
   ⛳ ЧТО ДВИГАЕТ ИЗМЕНЕНИЕ ДЛИНЫ — по тому, ЧЕМ сегмент кончается:
     СВОИМ «выкл» (одиночная нота или последний сегмент глиссандо) → двигаем этот «выкл»: это и есть длина ноты,
       соседей она не задевает. Ведения громкости этого сегмента, оказавшиеся за новым концом, уходят (после «выкл»
       они сироты — их не слышно); прежде их время ЗАЖИМАЛО укорочение, и записанную ноту с дрожью руки внутри
       нельзя было укоротить. Удлинение поверх чужой ноты того же ключа → нота берёт свежий k (как перенос, E1),
       а не упирается в соседку.
     СЛЕДУЮЩЕЙ СМЕНОЙ ВЫСОТЫ (граница глиссандо) → E2: сегмент ОТДЕЛЯЕТСЯ, и двигается ЕГО СОБСТВЕННЫЙ новый «выкл».
       Прежде двигалась общая граница: этот сегмент рос, следующий на столько же укорачивался.
     «ВКЛ» СОСЕДНЕЙ НОТЫ того же ключа (endEv нет) / открытый сегмент — тянуть нечего, отказ (как было).
   ⚠️ НУЛЕВОЙ И ОТРИЦАТЕЛЬНОЙ ДЛИНЫ НЕ БЫВАЕТ: конец не ближе EDIT_MIN_LEN к началу.
   → определяющее событие сегмента (его выделит редактор; у отделённого — его новое «вкл») или false. */
function editResizeSeg(ev,t){
  if(!editGuard()||!ev||ev.layer!==editLayer()) return false;
  const R=editRoleOf(ev.fn); if(!R) return false;            // S0: см. editMoveSeg
  // S4–S6: отказов соло нет (край пары связки с S6 развязывается — tieUntiePass в editBatch); длина терменвокса обрезает кривую ниже (bendTrim, S5)
  const seg=songSegs().byEv.get(ev); if(!seg||!seg.endEv||seg.end==null) return false;
  const X=seg.endEv;
  if(chaseKind(X.fn)==='f'){
    const n=seg.note, T=Math.max(t, seg.start+EDIT_MIN_LEN);
    if(Math.abs(T-X.t)<=1e-9) return false;
    const drop=segEvs(seg).filter(e=>e!==seg.ev && e.t>=T-EDIT_GAP);
    const fr= (T>X.t && keyClash(n, X.t, T)) ? R.fresh(n.layer) : null;   // S0: свежая идентичность по роли (у баса — прежний {k})
    /* ⛳ S5: УКОРОЧЕНИЕ НОТЫ ТЕРМЕНВОКСА ОБРЕЗАЕТ ЕЁ КРИВУЮ — НОВОЙ нагрузкой «вкл» (ход 'move' везёт оба состояния: ↶ возвращает прежний
       объект нагрузки и с ним ПРЕЖНИЙ массив бенда, побитно). Удлинение кривую не трогает (bendTrim отдаёт тот же массив): последнее
       значение держится до нового конца. Нагрузки без бенда (бас, аккорд, обычное соло) — дословно прежние ходы. */
    const H=n.head, B=H&&H.a&&H.a.bend, nb=(B&&B.length) ? bendTrim(B, T-H.t) : B;
    const list=[];
    for(const e of n.evs){
      if(drop.includes(e)) continue;
      const trim= e===H && nb!==B;
      if(e!==X && !fr && !trim) continue;
      list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t: e===X?T:e.t, a: (fr||trim)?{...e.a, ...fr, ...(trim?{bend:nb}:null)}:e.a} });
    }
    if(drop.length) list.push({ kind:'del', evs:drop });
    return editBatch(list) ? seg.ev : false;
  }
  const P=detachPlan(seg); if(!P) return false;
  const on=P.items[0], off=P.items[P.items.length-1];         // отделённая нота: «вкл» первым, свой «выкл» последним
  const T=Math.max(t, on.t+EDIT_MIN_LEN);
  off.t=T;
  for(const it of P.items) if(it!==on && it!==off && it.t>=T-EDIT_GAP) it.drop=true;   // ведения громкости за новым концом
  return commitDetach(P,true);
}

export { EDIT_GAP, EDIT_MIN_LEN, EDIT_ROLE, bendTrim, chordMoveTy, commitDetach, detachPlan, editBackingOpen, editBatch, editCanRedo, editCanUndo, editCommit, editDeleteHit, editDeleteSeg, editGuard, editLayer, editMoveHit, editMoveSeg, editPush, editResizeSeg, editRoleOf, editWire, keyClash, noTie, segChordNotes, segEvs, segPitchPt, slotPt, tiePartners, untieAcross };
