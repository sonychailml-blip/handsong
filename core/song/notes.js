/* REC2 (stage 3) — THE SONG AS NOTES, moved from recorder.js (which re-exports these names — a facade). Pure: no DOM, no Web Audio;
   imports only song/store.js. Owns: the owner keys of replayed voices (chOwnerKey, bassOwnerKey, ldKey — the engine's keys, ONE formula),
   the chase keys (chaseKind, chaseKey), the note view songNotes() and the segment view songSegs() (both lazy memos, reset only by the store's
   rebase point or notesReset()), and the T6a view checks (viewWarn, viewAudit, editViewCheck, trackViewCheck). */
import { events, onInvalidate, chaseRole, sortedLen } from './store.js';

/* ---- owner keys of replayed voices ---- */
/* ⛳ СУФФИКС ВЗЯТОГО (a.k, слайс S3.5c). У аккорда и баса ОДИН владелец на слой — «последний побеждает»
   было их задуманным поведением, пока каждое взятое рождало НОВЫЙ слой. Запись В СУЩЕСТВУЮЩУЮ дорожку
   это ломает: аккорды нового взятого и старые аккорды той же дорожки легли бы на ОДИН владелец, и на
   переигровке chOn нового гасил бы старый, а chOff старого — новый. «Слияние» на деле стало бы заменой.
   Поэтому взятое, влитое в дорожку, где уже есть аккорды/бас, получает свой k ≥ 1, и его владелец —
   'loop:N:k'.
   ⛳ И ТОТ ЖЕ k ПОДНИМАЕТСЯ НА КАЖДОМ ШВЕ ПОВТОРА (S3.5e, recFoldRoll): проходы одного взятого — это тоже
   наложение на одно и то же время, и без подъёма «выкл» последнего прохода обрывал бы аккорд каждого.
   Событие без k — это k=0, ключ БЕЗ суффикса: так звучат старые записи и ПЕРВЫЙ проход взятого в новую
   дорожку; следующие проходы того же взятого при крутящейся скобе уже идут с k ≥ 1. Обходы по префиксу
   (releaseLoopLayersAt: хвост 'N' или 'N:…') суффикс понимают — так устроены ключи соло 'leadloop:N:v'. */
const chOwnerKey  =ctx=> ctx?'loop:'+ctx.layer+(ctx.a&&ctx.a.k?':'+ctx.a.k:''):'latch';
/* P2: БАС — ЕЩЁ И НОМЕР НОТЫ v (одновременные бас-ноты одного взятого, зеркало 'leadloop:N:v'). Хвост ':k:v' — только при
   v≠0, и тогда k пишется всегда (даже 0), чтобы 'N:k' и 'N:k:v' не путались. ⛔ При v=0 ключ БАЙТ-В-БАЙТ прежний — так
   звучит весь бас, записанный до P2, и весь бас одного владельца. Префиксное сравнение дорожки (releaseLoopLayersAt:
   хвост 'N' или 'N:…') с обеими формами работает. */
const bassOwnerKey=ctx=>{ if(!ctx) return 'bass';
  const k=(ctx.a&&ctx.a.k)||0, v=(ctx.a&&ctx.a.v)||0;
  return 'bassloop:'+ctx.layer+(v ? ':'+k+':'+v : (k ? ':'+k : '')); };
/* Ключ владельца СОЛО-голоса на ПЕРЕИГРОВКЕ: слой + номер одновременной ноты (a.v). Живой ключ
   ('lead:L'/'lead:R') строит gestures и передаёт явным аргументом — в событие он НЕ попадает (это
   состояние руки, а не намерение). a.v||0 — вот та самая совместимость: событие без v = нота №0. */
const ldKey=(ctx,a)=> ctx ? 'leadloop:'+ctx.layer+':'+(a.v||0) : 'lead:?';

/* ---- chase keys: an event's kind and its voice owner ---- */
const chaseKind=f=> f[f.length-1];                                                // 'n' — …On, 't' — …Set, 'f' — …Off
const chaseKey=(role,ev)=> role==='ch'?chOwnerKey(ev) : role==='bs'?bassOwnerKey(ev) : ldKey(ev,ev.a);

/* ═══ THE SONG'S NOTES (S4.0, the piano roll's foundation) ═══
   A note is not an event: solo = on, changes, off tied by a.v; chords and bass the same tied by a.k; a drum hit is one event.
   ⛳ A note's identity is the ENGINE's owner key (chaseRole/chaseKind/chaseKey → ldKey/chOwnerKey/bassOwnerKey) — ⛔ no second pairing
   formula. An on while one is open closes it (endBy 'next'); changes/offs with no open note are orphans; open notes have end=null; drums are
   zero-length hits; the drone is a level. Reads only the SORTED prefix (sortedLen) — a running take's tail is unsorted and not replayed.
   Lazy: built on the first read after a rebase, reset by the store's listener below (rule #28) or notesReset(). ⛔ Never called from a sound
   path (tick, scheduleLayers, fireNear, chase, ENG, push, rec*). Read only: the view and its arrays are frozen; events inside are live. */
let notesView=null;                 // the note view memo (S4.0): built lazily by songNotes, reset at every rebase
onInvalidate(()=>{ notesView=null; });   // REC2: the note view's own reset (was a statement of the recorder's listener)
const notesReset=()=>{ notesView=null; };   // a view change without a rebase (the backing follows the key)
function songNotes(){
  if(notesView) return notesView;
  const N=sortedLen();                                       // REC2: the store's sorted prefix (a running take's unsorted tail stays out)
  const notes=[], levels=[], orphans=[], other=[], open=new Map();
  for(let i=0;i<N;i++){ const ev=events[i], f=ev.fn, tk=ev.tk||0;
    if(f==='drum'){ notes.push({role:'dr', layer:ev.layer, tk, key:null, head:ev, evs:[ev], start:ev.t, end:ev.t, endBy:'hit', mixedTk:false}); continue; }
    if(f==='drone'){ levels.push(ev); continue; }
    const role=chaseRole(f), kind=chaseKind(f);
    if(!role || (kind!=='n'&&kind!=='t'&&kind!=='f')){ other.push(ev); continue; }
    const k=chaseKey(role,ev); let n=open.get(k);
    if(kind==='n'){
      if(n){ n.end=ev.t; n.endBy='next'; }                    // «вкл» поверх открытой ноты того же ключа — прежняя кончилась здесь
      n={role, layer:ev.layer, tk, key:k, head:ev, evs:[ev], start:ev.t, end:null, endBy:'open', mixedTk:false};
      notes.push(n); open.set(k,n);
    }else if(!n) orphans.push(ev);                            // ведение/«выкл» без «вкл» — сирота
    else { n.evs.push(ev); if(tk!==n.tk) n.mixedTk=true;
      if(kind==='f'){ n.end=ev.t; n.endBy='off'; open.delete(k); } }
  }
  for(const n of notes){ Object.freeze(n.evs); Object.freeze(n); }
  notesView=Object.freeze({ notes:Object.freeze(notes), levels:Object.freeze(levels), orphans:Object.freeze(orphans), other:Object.freeze(other), prefix:N });
  return notesView;
}
/* ═══ СЕГМЕНТЫ: ВЫСОТА ДЕРЖИТСЯ ДО СЛЕДУЮЩЕЙ СМЕНЫ (слайс S5.5) ═══
   ⚠️ ЗАЧЕМ ОТДЕЛЬНО ОТ songNotes, а не вместо неё. songNotes группирует ЖИЗНЬ ГОЛОСА — и это верно для
   звука: одна бас-нота = один голос от «вкл» до «выкл». Но у баса и соло смена высоты внутри ноты — это
   ВЕДЕНИЕ, поэтому бас-линия, сыгранная одним движением, — ОДНА нота на десяток высот. Нарисуй её как
   ноту — получишь одну полосу через всю песню на высоте ПЕРВОЙ ступени, а остальные высоты исчезнут.
   СЕГМЕНТ — то, что музыкант и называет нотой: событие, ЗАДАЮЩЕЕ высоту, и промежуток до следующей смены.
   ⛳ ГРАНИЦА — ТОЛЬКО СМЕНА ВЫСОТЫ. Ведения, меняющие лишь громкость или эффекты, границами НЕ являются:
   они внутри сегмента (иначе одна нота с крещендо рассыпалась бы на десяток «нот» одной высоты).
   ⛳ У КАЖДОГО СЕГМЕНТА СВОЙ ЛАД — тот, что заморожен в ЕГО событии (sc/sev). Это не формальность: ось
   рисуется в ладу показанной группы, и сегмент обязан знать свой собственный.
   ⛳ ИНВАЛИДАЦИЯ — ЧУЖАЯ: мемо на ИДЕНТИЧНОСТЬ объекта songNotes(). Тот пересобирается только в
   schedInvalidate, значит второй точки сброса здесь нет (правило #28) — как и у кэша ролла в draw.
   byEv — обратный указатель «событие → его сегмент»: правке нужно знать, сегмент ли это начала ноты. */
/* ⛳ НОТА ТЕРМЕНВОКСА СОЛО — у её «вкл» есть кривая бенда (recLeadOpen кладёт a.bend=[] и сразу стартовую точку). ОДИН тест на
   весь рекордер: его же берёт перестройка «в ноте» (pnPlan — порождённому ведению hold:true только у такой ноты), и проход
   сегментов (songSegs — такая нота одним сегментом). Разойдись они — полоса считала бы ноту терменвоксом, а ролл резал бы её. */
const ldTherm=n=> n.role==='ld' && !!(n.head && n.head.a && n.head.a.bend && n.head.a.bend.length);
/* ТИП АККОРДА — ПО ЗНАЧЕНИЮ (слайс U1). Записанный аккорд несёт ссылку в CHORD_FAM_SETS, и у одной записи одна ссылка — для него
   «то же значение» и «та же ссылка» совпадают, ничего не меняется. Распавшаяся нота (U2) несёт ЛИТЕРАЛ интервала ([iv]) — свой массив у
   каждого события; сравнение по ссылке резало бы её на ложные сегменты на каждом ведении. null — нетипизированный аккорд. */
const tyEq=(a,b)=> a===b || (!!a && !!b && a.length===b.length && a.every((x,i)=>x===b[i]));
let segView=null;
/* ⛳ T6a — ЗАЩИТНЫЕ ПРОВЕРКИ ВИДА. Маршрут по строю (ключ источника — роль + тембр + вид) делает дорожку и ноту ОДНОГО вида для всего
   нового материала, поэтому страховки плана T6 («новый сегмент, если вид события другой»; «проверка вида в функциях правки») стали
   ПРОВЕРКАМИ: каждая пишет в консоль ОДИН раз за сессию на свой вид нарушения и НИЧЕГО не меняет в поведении. Сработать они могут только
   на материале, записанном до маршрута по строю (ничего не сохраняется — после перезагрузки такого нет). Те же предикаты отдаёт
   viewAudit — их сверяет проба P.checkRules на загруженной песне. */
const VIEW_WARNED=new Set();
function viewWarn(kind,msg){ if(VIEW_WARNED.has(kind)) return; VIEW_WARNED.add(kind); console.warn('[recorder] '+msg); }
const noteSpansViews=n=>{ const h=n.head&&n.head.sc; return !!h && n.evs.some(e=>e.sc&&e.sc!==h); };
/* Виды высотных событий дорожки (у ударов вида нет: высоты нет). */
function layerViews(layer){ const S=new Set(); for(const e of events) if(e.layer===layer&&e.sc&&e.fn!=='drum') S.add(e.sc); return S; }
function viewAudit(){
  const notes=[], tracks=[];
  for(const n of songNotes().notes) if(n.role!=='dr'&&noteSpansViews(n)) notes.push(n);
  for(const ly of new Set(events.map(e=>e.layer))) if(layerViews(ly).size>1) tracks.push(ly);
  return { notes, tracks };
}
/* Правка расшифровала ряд в ВИДЕ ОСИ sc — у правимого сегмента вид обязан быть тот же (попадание ловит только группу оси). */
function editViewCheck(ev,sc){ const g=songSegs().byEv.get(ev);
  if(g&&sc&&g.sc!==sc) viewWarn('edit',`an edit decoded a row in another tuning view than its note's (L${g.layer+1})`); }
/* Вставка в дорожку пишет вид оси — в дорожке с нотами он обязан быть её видом. */
function trackViewCheck(layer,sc){ const V=layerViews(layer);
  if(sc&&V.size&&!V.has(sc)) viewWarn('insert',`an insert wrote a tuning view the track L${layer+1} does not hold`); }
/* T4b2: индекс в строе ХРАНИМОГО события (T4c-1: только a.ti; у события без него — undefined, ступень не читается). */
const storedTi=ev=>{ const a=ev.a; return (a&&typeof a.ti==='number') ? a.ti : undefined; };   // T4c-2: ступени в событии нет вовсе   // ⛳ T4c-1: перевода ступени больше нет — нет индекса, нет высоты
function songSegs(){
  const V=songNotes();
  if(segView&&segView.view===V) return segView;
  const segs=[], byEv=new Map();
  for(const n of V.notes){
    if(n.role!=='bs'&&n.role!=='ld'&&n.role!=='ch') continue;
    /* ⛳ S0: НОТА ТЕРМЕНВОКСА — ОДИН СЕГМЕНТ. Её высоту несёт кривая бенда от ступени АТАКИ, а ведения с hold:true пишут
       ЖИВУЮ ближайшую ступень (recLeadEv: {...p, hold:true}) — звук её не читает (ENG.leadSet: hold → частоты нет), читает только
       подсветка. Сравни проход их ступени — одна согнутая нота рассыпалась бы на ложные «ноты» по ближайшим ступеням, и правка
       любой из них резала бы глиссандо, которого на этих границах нет. Поэтому внутри такой ноты смен высоты не бывает, а ведение
       hold сменой высоты не считается НИКОГДА (подстраховка: hold пишется только терменвоксом). У баса и аккордов — как было. */
    const therm=ldTherm(n);
    if(noteSpansViews(n)) viewWarn('note',`a note of L${n.layer+1} spans two tuning views (recorded before routing by tuning)`);   // T6a: проверка, поведение не меняет
    let cur=null;
    for(const ev of n.evs){
      const kind=chaseKind(ev.fn);
      if(kind==='f'){ if(cur){ cur.end=ev.t; cur.endBy='off'; cur.endEv=ev; } continue; }   // «выкл» закрывает последний сегмент
      const a=ev.a||{};
      /* ⛳ T4b2: СМЕНА ВЫСОТЫ — по ХРАНИМОЙ ПАРЕ (индекс в строе a.ti, регистр a.oct), у аккорда ещё тип по значению; ⛔ НЕ по абсолютной
         высоте: дубль тоники вверху регистра r и корень регистра r+1 звучат одинаково, но это РАЗНЫЕ записанные пары, и редактор держит
         их разными нотами (как держал по ступени). В пределах одного вида пара (ti, oct) взаимно однозначна с (ступень, регистр) — ответ
         прежний; доказательство было пробой P.checkLogic (против прежних сегментов по ступени) — снята в T4c-2 вместе со ступенью. */
      const ti=storedTi(ev);
      const pitchChanged = !cur || (!therm && !(n.role==='ld'&&a.hold) &&
                           (ti!==cur.ti || (a.oct|0)!==cur.oct || (n.role==='ch'&&!tyEq(a.ty,cur.ty))));   // U1: тип — ПО ЗНАЧЕНИЮ (tyEq)
      if(kind==='n'||pitchChanged){
        if(cur){ cur.end=ev.t; cur.endBy='next'; cur.endEv=ev; }   // S5.6: КАКОЕ событие кончает сегмент — его и двигает изменение длины
        cur={ role:n.role, layer:n.layer, key:n.key, tk:ev.tk||0, note:n, ev, endEv:null,
              first:ev===n.head, start:ev.t, end:null, endBy:'open',
              ti, oct:a.oct|0, ty:a.ty, sc:ev.sc, sev:ev.sev, inst:((n.head&&n.head.a)||{}).inst, vol:a.vol };   // T4b2: ti — индекс в строе сегмента; с T4b3 по нему ряды и рисование редактора (deg читают правка — расшифровка ряда до T5 — и нетипизированный аккорд до T6)   // T0: тембр сегмента — тембр НОТЫ (её «вкл»): ведения его не несут (у аккорда не несли никогда)
        segs.push(cur); byEv.set(ev,cur);
      }else byEv.set(ev,cur);                                                  // ведение громкости/эффектов — ВНУТРИ сегмента
    }
    /* Нота закрылась «вкл» СОСЕДНЕЙ ноты — хвостовой сегмент кончается там же, но endEv НЕ ставим: то
       событие принадлежит ДРУГОЙ ноте, и тянуть за него длину этой значило бы двигать чужое начало. */
    if(cur&&cur.end==null&&n.end!=null){ cur.end=n.end; cur.endBy=n.endBy; }
  }
  segs.sort((a,b)=>a.start-b.start);
  segView={ view:V, segs, byEv };
  return segView;
}

/* ---- fresh owner-key slots (REC3: moved from recorder.js; push, the editor and sections read them) ---- */
/* Первый номер v ВЫШЕ всех соло-нот, уже лежащих в слое layer (0 — соло-нот нет). Событие без v — это
   нота №0 (совместимость ldKey), поэтому считаем его как 0, и слой со старой записью даст 1.
   ⛳ ОБХОД O(n) — ОДИН РАЗ НА ВЗЯТОЕ, на нажатии ●, а НЕ на ноту и НЕ в push: слайс S3.2 затем и был,
   чтобы на горячем пути не ходить по всей песне. На том же нажатии и так идёт maxLayer() — такой же
   полный обход, то есть цена нажатия ● по порядку не меняется. Кэша по слою НЕ заводим сознательно:
   его пришлось бы держать в строю через onUndo/clearJam/compactEvents — ещё одна точка рассинхрона.
   Отсортированность массива не нужна (максимум), поэтому хвост записи ему не помеха. */
function layerSlotTop(layer){
  let top=0;
  for(const e of events) if(e.layer===layer && e.fn.slice(0,4)==='lead'){ const v=(e.a&&e.a.v)||0; if(v+1>top) top=v+1; }
  return top;
}
/* S3.5c: суффикс взятого для аккорда/баса — выше всех k, уже лежащих в слое у аккордов/баса; 0, если их там
   нет вовсе (тогда и сталкиваться не с чем, и ключи остаются прежними). Тот же довод о цене, что выше:
   один обход на нажатие ●. */
function layerTakeTop(layer){
  let top=-1;
  for(const e of events) if(e.layer===layer && (e.fn[0]==='c'||e.fn[0]==='b')){ const k=(e.a&&e.a.k)||0; if(k>top) top=k; }
  return top+1;
}

export { layerSlotTop, layerTakeTop, chOwnerKey, bassOwnerKey, ldKey, chaseKind, chaseKey, songNotes, notesReset, ldTherm, viewAudit,
  editViewCheck, trackViewCheck, songSegs };
