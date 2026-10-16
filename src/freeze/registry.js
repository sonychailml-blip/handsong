/* REC5 (stage 3) — FROZEN TRACKS: the registry by lane id, the signature and its state (F5), what the auto-freeze watcher reads (AF3),
   install / pending readers (AF6b-fix), the 16-bit store (AF6b), the swap events → buffer (AF2), the two seams (enter / leave) and the
   nodes' life cycle — moved from recorder.js (which re-exports them — a facade). The scheduler's chase and release, the live drone and the
   capture snapshot come once through freezeWire (no import back into the recorder). The plan's split into registry + swap waits: the seams
   call both ways. Moved verbatim; edited lines are marked REC5. */
import { laneAudible, laneEditVer, laneGainOf, laneNew, laneOf, lanePanOf, layerOfOwner } from '../song/lanes.js';
import { aRef, bassIdx, chIdx, chainKeyOf, chordModeVer, leadIdx, scaleId, seventh, tonic, tonicCents, tunedFrom } from '../state.js';
import { cycling, loop, secPerBeat, timeAt } from '../transport/clock.js';
import { droneNonOct } from '../scales.js';
import { evGen, events, schedInvalidate } from '../song/store.js';
import { takeFx, takeFxVer } from '../song/capture.js';
import { AC, makeFrozenBus } from '../audio.js';
import * as AUD from '../audio.js';
import { autEarliest, autTakesOf } from '../song/automation.js';
import { hooks } from '../hooks.js';
/* REC5: what the freeze code needs from the recorder, wired once (freezeWire) */
const W={ capStart:()=>{}, droneSync:()=>{}, droneSyncAt:()=>{}, release:()=>{}, chasePlay:()=>{} };
const freezeWire=o=>{ Object.assign(W,o); };
const takeCapStart=(...a)=>W.capStart(...a), droneSync=(...a)=>W.droneSync(...a), droneSyncAt=(...a)=>W.droneSyncAt(...a),
  releaseLoopLayersAt=(...a)=>W.release(...a), chasePlay=(...a)=>W.chasePlay(...a);

const FRZ_DRONE_TC=0.02;   // A2b: дрон на шве — подмена в миг шва (буфер уходит рампой FRZ_FADE), без секундного провала
/* ═══════════ ⛳ ЗАМОРОЖЕННЫЕ ДОРОЖКИ — РЕЖИМ ВОСПРОИЗВЕДЕНИЯ (слайс F4) ═══════════
   ⛳ ЗАМОРОЗКА — ЭТО НЕ ПРЕОБРАЗОВАНИЕ. События НИКОГДА не выбрасываются: пока дорожка заморожена,
   транспорт играет ЕЁ БУФЕР ВМЕСТО её событий, и только. Разморозка — снять буфер, и дорожка снова
   играет события. Мгновенно и без потерь. Ради этого и существует редактор.

   ⛔ КЛЮЧ РЕЕСТРА — ID ДОРОЖКИ, А НЕ НОМЕР СЛОЯ (правило #27). Номера ПЕРЕИСПОЛЬЗУЮТСЯ (новая дорожка
   берёт maxLayer()+1, после отмены — освобождённый) и бывают с дырами. Ключуйся мы номером, новая
   дорожка молча унаследовала бы чужой буфер — правдоподобно, тихо и не найти. `laneNew` всегда выдаёт
   СВЕЖИЙ id, поэтому мёртвый id просто больше никогда не совпадёт.
   ⛔ И НИ В КОЕМ СЛУЧАЕ НЕ В СОБЫТИЕ: буфер — не часть записи, он живёт здесь, в recorder, рядом с
   дорожками. Правило #28 цело: реестр не в массиве событий, курсоров и schedInvalidate не трогает.

   ⚠️ ИСТОЧНИК БУФЕРА ОДНОРАЗОВ. AudioBufferSourceNode нельзя перезапустить — ни после stop, ни после
   естественного конца. Значит НОВЫЙ узел нужен на КАЖДЫЙ пуск транспорта, КАЖДУЮ перемотку и КАЖДЫЙ
   проход повтора. Это ТО ЖЕ САНКЦИОНИРОВАННОЕ ИСКЛЮЧЕНИЕ правила #3, что у ударов и метронома
   («per-hit drums/metronome — the exception»), только «на пуск», а не «на удар»: узел создают, он
   отыгрывает и уходит. Правило же запрещает ГЛУШИТЬ голоса пулов, а их здесь нет вовсе.

   ⛳ ПЕРЕМОТКА — ДАРОМ, И ЭТО САМОЕ ИЗЯЩНОЕ ЗДЕСЬ. У источника есть СМЕЩЕНИЕ, поэтому дорожка, в
   которую вошли посреди ноты, просто играет с середины сэмпла. Догонялка (chasePlay), которой живая
   дорожка поднимает зажатые голоса на входе, замороженной НЕ НУЖНА ВООБЩЕ. */
const frozen=new Map();     // id дорожки → { layer, buf, startSec, endSec, tailSec, pinned, bus, nodes[], armedRep }
/* «Есть ли хоть одна СВЕЖАЯ заморозка» — дешёвый гейт горячих путей. ⚠️ Устаревшие здесь не в счёт:
   их события обязаны играть, значит пропускать их нельзя. */
const frozenOn=()=>frozen.size>0;
/* Заморожен ли СЛОЙ (события этого слоя играть не надо). ⚠️ Спрашивают горячие пути, поэтому сначала
   дешёвая проверка «есть ли вообще хоть одна заморозка». */
function frzOf(layer){
  if(!frozen.size) return null;
  const id=laneOf(layer);
  return id==null?null:(frozen.get(id)||null);
}
/* ⛳ ИГРАЕТ ЛИ ЗА ЭТУ ДОРОЖКУ БУФЕР. ⛔ ИМЕННО «ЗАМОРОЖЕНА И СВЕЖА»: на этом предикате висят ОБА пути
   переигровки и догонялка, поэтому устаревшая дорожка автоматически возвращается к своим событиям —
   без единой отдельной ветки «а если устарела». */
const frzLayer=layer=> freezeState(layer)==='fresh';
/* А ЭТО — «есть ли буфер вообще», для показа и для уборки: устаревший буфер никуда не делся, его
   просто не слушают. Не путать с предыдущим. */
const frzHas=layer=>{ const f=frzOf(layer); return !!f&&!f.drop; };   // A2b: уходящая на шве — уже не заморожена
/* Буфер СЕЙЧАС владеет дорожкой (взведён) — даже если дорожка уже устарела и ждёт шва выхода. A2c: догонялка
   такую пропускает — передачу сделает frzLeave. В самом frzLeave armedRep сброшен ДО его догонялки. */
const frzBufOwns=layer=>{ const f=frzOf(layer); return !!(f&&f.armedRep!=null); };
/* AF2: БУФЕР ВЛАДЕЕТ ДОРОЖКОЙ СЕЙЧАС — свежая И подмены впереди нет (пока она запланирована, дорожку играют события; дрон, догонялка). */
const frzBufNow=layer=>{ const f=frzOf(layer); return !!f && !f.swap && freezeState(layer)==='fresh'; };
/* AF2: ДОГОНЯЛКА ПРОПУСКАЕТ дорожку, если её звук сейчас — буфер: взведённый узел, или свежая без подмены впереди, или подмена НА ШВЕ скобы
   (догонялка шва — уже для следующего прохода, а его играет буфер). Подмена внутри прохода ещё впереди — события, догонять. */
const frzChaseSkip=layer=>{ const f=frzOf(layer); if(!f) return false; if(f.armedRep!=null) return true;
  if(f.swap) return !!f.swap.seam; return freezeState(layer)==='fresh'; };

/* ЗАВЕСТИ/СНЯТЬ. ⛳ Зовёт их render.js — с F5 из кнопки ❄ редактора (ui.onFreeze), а также из консоли. */
/* ⛳ ПОДПИСЬ СВЕЖЕСТИ (F5) — «изменилось ли хоть что-то, из чего рендер собирал буфер».
   ⛳ ФОРМА ВЗЯТА У fxPlaySignature, А НЕ ПРИДУМАНА ЗАНОВО: та же дешёвая строка, которую можно сверять
   на каждом кадре, и тот же приём «считаем длины и версии, а не содержимое».
   ЧТО ВХОДИТ — РОВНО ТО, ЧТО РЕНДЕР ПОТРЕБЛЯЕТ:
     • СОБЫТИЯ ДОРОЖКИ: сколько их, первая и последняя доля, и сумма долей. ⚠️ Сумма — не «хеш ради
       хеша»: она ловит СДВИГ ноты внутри дорожки, при котором и число событий, и края не меняются
       (ровно случай «подвинул ноту в редакторе»);
     • ВЕРСИЯ ПРАВОК ЭТОЙ ДОРОЖКИ (laneEditVer, с A2; прежде — общий takeFxVer): правки полосы
       автоматизации и правки нот поднимают её, а длины при этом не меняются (сдвиг ноты по высоте сумму
       долей не трогает) — поэтому длины одни не годятся. ⛔ Своя у дорожки, а не общая: общий счётчик
       старил ВСЕ замороженные от правки одной — см. шапку laneEditVer;
     • ПРИКОЛОЧЕННОЕ рендером: тоника, эталон A4 и темп — всегда (смени тонику — буфер звучит в прежней,
       а события зазвучали бы в новой); лад, септаккорд и три запасных тембра — ТОЛЬКО если у дорожки
       есть событие, которое их читает (см. тело).
   ⛔ ЧТО НАМЕРЕННО НЕ ВХОДИТ: ПРИГЛУШЕНИЕ И СОЛО. Они не меняют ЗВУК дорожки, они меняют, слышно ли
   её, — и у замороженной это делает гейн шины. Включи мы их в подпись, любое нажатие M пометило бы
   дорожку устаревшей на ровном месте. (У fxPlaySignature они входят по другой причине: там от них
   зависит ПОБЕДИТЕЛЬ в свёртке автоматизации.)
   ⚠️ И НЕ ВХОДЯТ события ЧУЖИХ дорожек — хотя чужое взятое той же роли правит той же цепью (предел
   №1–2). Это осознанный компромисс: иначе запись на соседней дорожке помечала бы устаревшими все
   заморожённые сразу, а разница почти всегда неслышна. Названо, а не пропущено. */
/* ⚠️ МЕМО ОБЯЗАТЕЛЬНО, И ЭТО НЕ ОПТИМИЗАЦИЯ «НА ВСЯКИЙ». freezeState зовёт ОТРИСОВКА — по строке на
   кадр, — а подпись обходит ВСЕ события. На песне в несколько минут с двумя десятками дорожек это
   O(дорожек × событий) НА КАДР, ровно та беда, которую полоса лупера уже однажды пережила (см. метки
   событий в draw). Ключ мемо — ДЕШЁВЫЕ величины, которые меняются всегда, когда мог измениться ответ:
   число событий (запись/отмена/удаление) + takeFxVer (ЛЮБАЯ правка редактора поднимает его в
   editCommit) + приколоченное. Совпал ключ — отдаём готовую подпись, обход не делаем.
   ⚠️ Сумму долей всё равно СЧИТАЕМ (она ловит сдвиг ноты): ключ отвечает «могло ли измениться»,
   подпись — «изменилось ли». Полагаться на один takeFxVer было бы ставкой на то, что будущий путь
   правки не забудет его поднять.
   ⛳ A1 (дуга «АВТОЗАМОРОЗКА»): МЕМО СТАЛО ПО СЛОЮ. Прежде место было ОДНО, а ключ начинался со слоя —
   поэтому при двух замороженных дорожках полоса спрашивала L1, L2, L1, L2… и каждый вызов вытеснял
   предыдущий: мемо не попадало НИКОГДА, и довод абзацем выше был правдой только для одной дорожки.
   Теперь это Map «слой → подпись», и она очищается ЦЕЛИКОМ, как только сменилась НЕСЛОЕВАЯ часть
   ключа (frzGlobalKey): всё, что в неё входит, общее для всех дорожек, значит и устаревают они вместе.
   ⛔ ЧТО ВОЗВРАЩАЕТ freezeSig — НЕ ИЗМЕНИЛОСЬ НИ ДЛЯ ОДНОГО ВХОДА: та же строка, собранная тем же
   обходом. Поменялось только то, КАК ЧАСТО обход делается. Мемо никуда не выгружается: слоёв столько,
   сколько дорожек, и вся Map гибнет при следующей же смене ключа. */
/* ⛳ ГЛОБАЛЬНЫЙ КЛЮЧ ГРЯЗИ — дешёвая строка, которая меняется ВСЕГДА, когда могла смениться подпись
   хотя бы одной дорожки: число событий + поколение состава (evGen, см. у schedInvalidate) + версия
   захвата + приколоченное. Экспортирован для A3/A4: наблюдатель сверяет ЕЁ раз в полсекунды и только
   при смене пересчитывает подписи по дорожкам. ⛔ Он лишь ЧИТАЕТ и schedInvalidate не зовёт (#28). */
/* P3 «строй от»: tunedFrom — в приколоченном, как id лада (scaleId, F1): он входит в CUR() — запасной лад события без sc (сегодня таких нет).
   ⛳ В ПОДПИСЬ ДОРОЖКИ он попадает ТОЛЬКО через эту запасную ветку (noSc в freezeSig): у события есть sc — вариант лада со своим
   якорем, и смена выбора его звук не меняет; значит замороженная дорожка от передвижения выбора НЕ стареет (мемо подписи лишь
   пересчитается к той же строке). ⛳ T2: пара (лад, tunedFrom) — ровно КЛЮЧ ВИДА (строй, лад, якорь), который отдаёт CUR(). */
const frzPinned=()=>[tonic,tonicCents,aRef,scaleId,tunedFrom,chordModeVer,seventh?1:0,loop.bpm,leadIdx,bassIdx,chIdx,droneNonOct()].join(',');   // T4c-2: флаг временного R.powerOld снят вместе с ним
const frzGlobalKey=()=>events.length+'|'+evGen+'|'+takeFxVer+'|'+frzPinned();
const frzSigMemo=new Map(); let frzSigG=null;
let frzSigTonic=false;
const frzSigTonicDbg=on=>{ frzSigTonic=!!on; frzSigMemo.clear(); };   // probe CONTROL only (row «TF2 recordings keep their key»)
function freezeSig(layer){
  const P=frzPinned();
  const g=events.length+'|'+evGen+'|'+takeFxVer+'|'+P;          // = frzGlobalKey(), но P уже посчитан. takeFxVer здесь ОСТАЁТСЯ: это ключ МЕМО («могла ли смениться хоть одна подпись»), а не сама подпись
  if(frzSigG!==g){ frzSigMemo.clear(); frzSigG=g; }
  const hit=frzSigMemo.get(layer); if(hit!==undefined) return hit.v+(hit.noFx?soloLiveSig():'');
  /* ⛳ ЗАПАСНЫЕ ЗНАЧЕНИЯ — ТОЛЬКО ЕСЛИ ДОРОЖКА ИХ ЧИТАЕТ. Лад и септаккорд нужны событию без `sc`, живые
     тембры — «вкл» без `a.inst` (правила чтения — у самих записей ENG и в bassOn: `ins ?? bassIdx`).
     Сегодня таких событий почти не бывает, и безусловное включение делало одно: смена живого тембра в
     панели старила ВСЕ замороженные дорожки — та же болезнь, что у takeFxVer. Тоника, A4 и темп
     входят ВСЕГДА: они меняют звук любой дорожки. */
  /* ⛳ T0: ТЕМБРЫ САМОЙ ДОРОЖКИ — в подписи. Тембр живёт в «вкл» ноты (соло/аккорд/бас — `a.inst`), в каждом
     ударе (`a.kit`) и — только у СОЛО — ещё в ведении (смена тембра посреди ноты, см. noInst); свёртка по
     порядку событий ловит и смену тембра, и перестановку «какая нота каким».
     Прежде тембра в подписи не было вовсе: будущая замена тембра у замороженной дорожки оставила бы её
     играть СТАРЫЙ звук свежим буфером — если бы путь замены забыл поднять версию правок.
     ⚠️ УРОК A2 СОБЛЮДЁН: в свёртку идут только данные СОБЫТИЙ дорожки, живые индексы — никогда (они входят
     лишь запасными значениями, и лишь когда событие без тембра их читает, см. выше). Переключатель тембра
     в панели замороженную дорожку не старит.
     ⚠️ Мемо подписи сбрасывается по глобальному ключу (число событий, поколение, takeFxVer, приколоченное):
     замена тембра обязана пройти через editCommit — он поднимает takeFxVer, как и любая правка редактора. */
  const tmix=(h,tag,x)=>{ let k=(Math.imul(h,31)+tag*64)|0; for(const c of (x==null?'-':String(x))) k=(Math.imul(k,31)+c.codePointAt(0))|0; return k; };   // TIM2: ids are strings — hash every character   // индексы < 63 (тембров соло 23, наборов 5). ⚠️ ВЕРНО ТОЛЬКО ДЛЯ ВСТРОЕННЫХ ИНДЕКСОВ: id упакован малым целым (|0), и строковый id (стабильные id тембров, BACKLOG §7.4) свернётся в 0 — два разных тембра подпишутся одинаково. ПЕРЕПИСАТЬ вместе со стабильными id
  let n=0, first=null, last=null, sum=0, noSc=false, dr=false, ld=false, ch=false, bs=false, tim=0, noFx=false;
  for(const e of events) if(e.layer===layer){
    n++; sum+=e.t; if(first===null||e.t<first) first=e.t; if(last===null||e.t>last) last=e.t;
    if(!e.sc) noSc=true;
    if(e.fn==='drone') dr=true;   // TF2: the drone sounds its event's view; only the live Bohlen–Pierce drone choice (droneNonOct) stays live
    const a=e.a; if(a&&a.fx==null&&(e.fn==='leadOn'||e.fn==='leadSet')) noFx=true;   // договор заморозки: соло-нота без карты звучит ЖИВОЙ цепью соло (R2) — см. soloLiveSig
    if(a){ if(e.fn==='leadOn'){ tim=tmix(tim,1,a.inst); if(a.inst===undefined) ld=true; }
                        else if(e.fn==='leadSet'&&a.inst!=null) tim=tmix(tim,5,a.inst);   // T0-fix: ведение соло несёт тембр (нота переливается), и рендер его играет — значит и подпись его видит
                        else if(e.fn==='chOn'){ tim=tmix(tim,2,a.inst); if(a.inst===undefined) ch=true; }
                        else if(e.fn==='bassOn'){ tim=tmix(tim,3,a.inst); if(a.inst==null) bs=true; }
                        else if(e.fn==='drum') tim=tmix(tim,4,a.kit); } }
  const id=laneOf(layer), ver=id==null?0:(laneEditVer.get(id)||0);
  /* TF2: the tonic left field 5 — a view carries its key, so the key knob changes no recorded sound (an event without a view still reads
     it: the noSc fallback). frzSigTonic = the probe CONTROL (the old signature, a key change stales every frozen track). */
  const v=n+'|'+first+'|'+last+'|'+sum.toFixed(6)+'|e'+ver+'|'+(frzSigTonic?tonic+',':'')+aRef+','+loop.bpm
         +'|'+(noSc?tonic+(tonicCents?'~'+tonicCents+'c':'')+','+scaleId+','+tunedFrom+','+chordModeVer+','+(seventh?1:0)+','+droneNonOct():'-')+(dr?',d'+droneNonOct():'')+'|'+(ld?leadIdx:'-')+','+(ch?chIdx:'-')+','+(bs?bassIdx:'-')+'|i'+tim
         +'|p'+lanePanOf(layer);   // MX2: панорама дорожки вплавлена в буфер (ступень до цепи) — её смена старит; уровня здесь НЕТ (он на шине замороженной)   // флип R.powerOld старит ТОЛЬКО дорожки со стопками
  frzSigMemo.set(layer, {v, noFx});
  return v+(noFx?soloLiveSig():'');
}
/* ⛳ ДОГОВОР ЗАМОРОЗКИ (после MX2): у дорожки с соло-нотами БЕЗ карты эффектов подпись складывает снимок ЖИВОЙ цепи соло — им такие ноты и
   звучат (правило R2 в audio.applyFx; рендер даёт им тот же снимок, render.patchInst). Сдвинул живую ручку соло — замороженная устарела и
   играет события, ❄ переморозит с новым. Снимок — НЕ в мемо (меняется рукой каждый кадр), а приставкой при каждом чтении: обход событий
   остаётся мемоизированным, дёшев только сам снимок (несколько ключей). Записанные рукой ноты карту несут всегда — их подписи это не касается. */
const soloLiveSig=()=>'|fx'+JSON.stringify(AUD.fxSnapshot(chainKeyOf('ld')));
/* ⛳ СОСТОЯНИЕ ДОРОЖКИ ДЛЯ ПОКАЗА И ДЛЯ ЗВУКА: 'none' | 'fresh' | 'stale'.
   ⛔ ЗВУК ГАТИТСЯ НА «ЗАМОРОЖЕНА И СВЕЖА», А НЕ НА «ЗАМОРОЖЕНА» — устаревшая дорожка обязана
   ВЕРНУТЬСЯ К СВОИМ СОБЫТИЯМ, а не замолчать и не играть старое как ни в чём не бывало. */
function freezeState(layer){
  const f=frzOf(layer); if(!f||f.drop) return 'none';   // drop (A2b): разморожена НА ХОДУ — для показа и для событий её уже нет; запись живёт лишь до шва, пока буфер доигрывает (см. frzLeave)
  return f.sig===freezeSig(layer) ? 'fresh' : 'stale';
}
/* ⛳ ЕСТЬ ЛИ У ДОРОЖКИ ВЗЯТОЕ БЕЗ ЗАХВАТА (F5) — и прикалываем его, раз уж морозим.
   ⚠️ ЭТО РЕАЛЬНАЯ СМЕНА ПОВЕДЕНИЯ, КОТОРАЯ ДО СИХ ПОР ПРОИСХОДИЛА МОЛЧА, В ДВУХ МЕСТАХ: дорожка без
   захвата шла ЗА ЖИВОЙ ЦЕПЬЮ, и первый же снимок (добавление эффекта в редакторе — autCaps, S1; а теперь
   и заморозка) ПРИКАЛАЧИВАЕТ её к цепи в том виде, в каком та стоит В ЭТОТ МИГ. Звучать она
   продолжает ровно так же, как секунду назад, — но живые ручки до неё больше не дотянутся.
   ⛳ Единственный сегодняшний источник таких взятых — ВСТАВКА В РЕДАКТОРЕ (editInsertHit/editInsertBass
   заводят свой editTake и takeCapStart не зовут).
   ⛳ S1 — ПРИКАЛЫВАЕМ, ТОЛЬКО ЕСЛИ У ДОРОЖКИ НЕТ ЗАХВАТА ВОВСЕ, и тогда ОДНОМУ, самому раннему взятому. ⚠️ ИСПРАВЛЕНО: прежде
   снимок живой цепи получало КАЖДОЕ взятое без захвата — и вставка в редакторе посреди записанной дорожки после ❄ переводила с
   доли вставленной ноты ВСЮ РОЛЬ (на каждой её дорожке — цепи принадлежат роли) на то, как стоят живые ручки: снимок взятого
   вступает с его первой доли (fxLaneMerge). Взятое без захвата внутри захваченной дорожки играет цепью дорожки и захвата не
   получает (см. fxLaneMerge: раньше всех захваченных — заимствует снимок самого раннего из них). ⛔ Живая цепь здесь читается
   лишь для дорожки, у которой своей цепи нет ни в одном взятом, — она и шла за живой цепью.
   Возвращаем true, если что-то приколотили, — вызывающий скажет об этом ОДИН раз. */
function freezePinCaptures(layer){
  const Ts=autTakesOf(layer); if(!Ts.length) return false;
  if(Ts.some(T=>takeFx.has(T.tk))) return false;             // у дорожки есть своя цепь — прикалывать нечего
  const E=autEarliest(Ts); takeCapStart(E.tk);
  return takeFx.has(E.tk);
}
/* ═══ AF3: what the auto-freeze WATCHER reads (frzqueue.js). Pure reads except songPinChains. ═══ */
/* Watch key: frzGlobalKey + a version bumped by signature inputs outside it (pan) + the live solo chain when some solo note has no map
   (those notes sound with the live chain, soloLiveSig). Polled ~4×/s; signatures are recomputed only when it moves. */
let frzWatchVer=0, frzNoFxKey=null, frzNoFxAny=false;
const frzWatchBump=()=>{ frzWatchVer++; };   // REC5: the watcher's version — bumped by a pan change and laneVerKeep (outside this module)
function frzWatchKey(){
  const k=events.length+'|'+evGen;
  if(frzNoFxKey!==k){ frzNoFxKey=k; frzNoFxAny=events.some(e=>e.a&&e.a.fx==null&&(e.fn==='leadOn'||e.fn==='leadSet')); }
  return frzGlobalKey()+'|w'+frzWatchVer+(frzNoFxAny?soloLiveSig():'');
}
/* Stale ONLY because A4 or tempo moved (field 5 of the signature): the watcher gives such tracks the longer 'retune' settle (TF4). Since
   TF2 the tonic is not in it: a key change leaves frozen tracks fresh. */
const frzSigNoRetune=s=>{ const p=s.split('|'); if(p.length>5) p[5]='*'; return p.join('|'); };
function frzRetuneOnly(layer){
  const f=frzOf(layer); if(!f||f.drop) return false;
  const cur=freezeSig(layer);
  return cur!==f.sig && frzSigNoRetune(cur)===frzSigNoRetune(f.sig);
}
/* Does the track own an effect chain (a captured take)? Auto-freeze never pins one silently; empty track → nothing to pin. */
function laneHasChain(layer){ const Ts=autTakesOf(layer); return !Ts.length || Ts.some(T=>takeFx.has(T.tk)); }
/* Bytes held by frozen tracks (playing and pending), and by one track — the memory budget (AF3, until AF6). */
function frzBytesTotal(){ let n=0; for(const f of frozen.values()) if(!f.drop) n+=f.bytes||0; for(const f of frzPend.values()) n+=f.bytes||0; return n; }
const frzBytesOf=layer=>{ const id=laneOf(layer); if(id==null) return 0; const f=frozen.get(id), q=frzPend.get(id); return Math.max(f&&!f.drop?f.bytes||0:0, q?q.bytes||0:0); };
/* Song load (P.seed, P.song, a future import): every track without a captured chain gets the live chain pinned NOW, once — so auto-freeze
   never has to. Returns the layers pinned. */
function songPinChains(){
  const out=[]; for(const ly of [...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b)) if(freezePinCaptures(ly)) out.push(ly);
  /* AF5: a solo note without an effect map replays with the hand's live solo values (R2) — the live hands would reach a recorded track.
     At song load such notes get the live solo snapshot ONCE, as a fresh payload (they keep sounding as now; live knobs no longer reach
     them). Recorded notes always carry a map; an editor insert copies its neighbour's map (or, in an empty track, the snapshot). */
  let snap=null, nMap=0;
  for(let i=0;i<events.length;i++){ const e=events[i];
    if((e.fn==='leadOn'||e.fn==='leadSet') && e.a && e.a.fx==null){ if(!snap) snap=AUD.fxSnapshot(chainKeyOf('ld')); e.a={...e.a, fx:{...snap}}; nMap++; } }
  if(nMap) schedInvalidate();
  out.soloMaps=nMap; out.soloSnap=snap;
  if(hooks.af) hooks.af('song');
  return out;
}
/* ⛳ БИЛЕТ ЗАМОРОЗКИ (A2) — что именно рендер берётся заморозить, снятое ДО рендера: слой, ID дорожки и
   подпись. Рендер идёт секунды; за это время в дорожку могут влить дубль, отменить взятое (и номер слоя
   уйдёт ДРУГОЙ дорожке — правило #27 с новой стороны), сменить тонику. Прежде подпись снималась ПОСЛЕ
   рендера, и старый материал вставал бы как свежий — неверная музыка, найти которую нельзя.
   `?? laneNew` — та же самопочинка, что у переключателей дорожки (довод — у toggleLaneMute). */
function freezeTicket(layer){
  if(layer==null) return null;
  const id=laneOf(layer) ?? laneNew(layer);
  return { layer, id, sig:freezeSig(layer) };
}
/* Поставить отрендеренный буфер. Возвращает true, либо СЛОВО-причину отказа ('lane' — номер слоя теперь
   у другой дорожки или её нет; 'sig' — дорожка изменилась за время рендера; 'engine' — нет движка).
   ⛔ «Раз уж посчитали — поставим» НЕЛЬЗЯ НИКОГДА: это неверная музыка, помеченная свежей. */
function freezeSet(ticket, rendered){
  if(!AC||!ticket||!rendered||!(rendered.buf||rendered.pack)) return 'engine';
  const {layer, id}=ticket;
  if(laneOf(layer)!==id) return 'lane';
  if(freezeSig(layer)!==ticket.sig) return 'sig';
  /* AF6b: 16 БИТ. Упаковку готовит render.freeze заранее, кусками и с уступками потоку (frzPackAsync); иначе — здесь, разом (буферы проб).
     Ворклета нет — дорожка держит прежний Float32-буфер (рост памяти вдвое, звук тот же). */
  const pk= AUD.frzReady ? (rendered.pack&&!rendered.pack.used ? rendered.pack : (rendered.buf ? frzPack(rendered.buf, frzStoreKind) : null)) : null;
  if(AUD.frzReady && !pk) return 'engine';
  frzPendCancel(id, 'superseded');                  // AF6b-fix: прежняя, ещё не готовая заморозка этой дорожки — снята
  const bus=makeFrozenBus(); if(!bus) return 'engine';
  let store;
  if(pk){ const key='frz:'+id+':'+(++frzKeySeq);
    if(!AUD.frzStorePut(key, pk)){ try{ bus.disconnect(); }catch(e){} return 'engine'; }
    pk.used=true;
    store={ key, len:pk.len, dur:pk.len/pk.rate, kind:pk.kind, peak:pk.peak, bytes:pk.bytes, blk:pk.blk, thr:pk.thr }; }
  else { const b=rendered.buf;
    store={ buf:b, len:b.length, dur:b.duration, kind:'float32-buffer', peak:null, bytes:b.length*b.numberOfChannels*4, ...frzBlocks(b) }; }
  /* evRun — «в этом прогоне дорожку сейчас играют СОБЫТИЯ». Играем — да: планировщик на ближайшем
     отрезке сделает шов ВХОДА (frzEnter). Стоим — нет: пуск взведёт буфер как обычно. */
  const f={ id, layer, startSec:rendered.startSec, endSec:rendered.endSec,
            tailSec:rendered.tailSec, pinned:rendered.pinned, sig:ticket.sig, bus, nodes:[], armedRep:null,
            evRun:loop.on, mark:null, drop:false, swap:null, lastSwap:null, log:[], spare:null, spareOk:false, ...store };   // AF2: swap — подмена впереди; blk/thr — карта тишины буфера (паузы). AF6b: key — данные в хранилище ворклета (16 бит), иначе buf; log — узлы для пробы; spare — чтец-запас (AF6b-fix)
  /* ⛳ AF6b-fix: ДВЕ ФАЗЫ. Буфер, чьи данные ещё не на потоке звука (или чей чтец там ещё не построен), играть НЕЛЬЗЯ — первый старт
     после заморозки терял бы начало (найдено пробой AF2 «стоящий»: начало на 101.9 мс позже событий). Поэтому запись реестра ждёт в
     frzPend, а прежняя заморозка (если была) — играет; ИГРАЮЩЕЙ запись становится, когда чтец-запас доложил «готов» (frzActivate): тогда
     же сверяются дорожка и подпись — изменилась за это время, буфер не ставится. Без ворклета (Float32-запас) — сразу, как прежде.
     Готовность ждут render.freeze и пробы — frzWhenReady(layer). */
  if(!f.key){ frozen.set(id, f); frzGain(id); return true; }
  f.readyP=new Promise(res=>{ f.readyRes=res; });
  frzPend.set(id, f);
  frzNewSpare(f, ()=>frzActivate(f, true));
  f.readyTimer=setTimeout(()=>frzActivate(f, false), FRZ_READY_MS);
  return true;
}
/* ⛳ AF6b-fix: ОЖИДАЮЩИЕ ГОТОВНОСТИ ЗАМОРОЗКИ — id дорожки → запись реестра, ещё не играющая. */
const frzPend=new Map();
const FRZ_READY_MS=3000;   // страховка: поток звука не доложил «готов» за 3 с — заморозка не ставится ('engine')
function frzActivate(f, ok){
  if(frzPend.get(f.id)!==f) return;                 // снята или заменена раньше
  frzPend.delete(f.id); clearTimeout(f.readyTimer);
  const why= !ok ? 'engine' : laneOf(f.layer)!==f.id ? 'lane' : freezeSig(f.layer)!==f.sig ? 'sig' : null;
  if(why){ frzPendDispose(f); f.readyRes(why); return; }
  freezeDrop(f.id);                                 // перезаморозка: старый буфер и его узлы уходят только СЕЙЧАС — до этого он играл
  f.evRun=loop.on;                                  // играем — подмену спланирует планировщик (AF2); стоим — пуск взведёт буфер
  frozen.set(f.id, f);
  frzGain(f.id);                                    // приглушение/соло действуют сразу
  f.readyRes(true);
}
function frzPendDispose(f){
  const b=f.bus, key=f.key, sp=f.spare; f.spare=null;
  if(sp){ try{ sp.port.postMessage({ stop:0 }); }catch(e){} }
  setTimeout(()=>{ try{ b.disconnect(); }catch(e){} if(key) AUD.frzStoreDel(key); }, 80);
}
function frzPendCancel(id, why){ const f=frzPend.get(id); if(!f) return; frzPend.delete(id); clearTimeout(f.readyTimer); frzPendDispose(f); f.readyRes(why||'dropped'); }
/* Готова ли заморозка дорожки (ждать её — render.freeze, пробы): true — играет; иначе слово причины ('sig', 'lane', 'engine', 'superseded',
   'dropped'); 'none' — заморозки нет вовсе. */
function frzWhenReady(layer){ const id=laneOf(layer); const f=id==null?null:frzPend.get(id);
  if(f) return f.readyP; return Promise.resolve(id!=null && frozen.has(id) ? true : 'none'); }
const frzReadersAlive=()=>AUD.frzStoreCount();   // ⛔ только проба: {alive} или null
/* ЧТЕЦ-ЗАПАС дорожки: построен заранее (пустым), «готов» докладывает поток звука. onReady — однократно. */
function frzNewSpare(f, onReady){
  const sp=AUD.frzReader(f.key, null, 0); f.spare=sp; f.spareOk=false;
  if(!sp){ if(onReady) onReady(); return; }
  sp.port.onmessage=e=>{ const m=e.data||{}; if(m.ready && f.spare===sp){ f.spareOk=true; if(onReady){ const cb=onReady; onReady=null; cb(); } } };
}
/* ═══ ⛳ AF2: ПОДМЕНА СОБЫТИЙ БУФЕРОМ В ВЫБРАННЫЙ МИГ — без зазора, без щелчка, без скачка уровня (решение пользователя) ═══
   Транспорт стоит — буфер входит сразу (пуск взводит его, evRun=false: так было и в A2). Играет — подмена НЕ на горизонте, а:
     (1) в ПЕРВУЮ ПАУЗУ дорожки в пределах FRZ_SWAP_BARS тактов от горизонта, лучше на ЛИНИИ ТАКТА (сперва линии тактов, потом сетка
         FRZ_REST_GRID доли);
     (2) паузы нет (дрон, тянущийся пад) — на ближайшей линии такта с РАВНОМОЩНЫМ ПЕРЕКРЁСТОМ FRZ_XF (20 мс): голоса дорожки уходят cos,
         буфер вплывает sin;
     (3) под крутящейся скобой ближайшая линия такта — её КОНЕЦ: подмена НА ШВЕ — следующий проход целиком играет буфер, а голоса
         прохода отпускает сам шов, как всегда (их хвост — хвост прохода; buffer нового прохода его не содержит), догонялка шва дорожку
         пропускает (frzChaseSkip), ни одна нота не удваивается и не теряется.
   ⛳ ЧТО ТАКОЕ ПАУЗА. Определяется по САМОМУ БУФЕРУ, а не по нотам: в нём уже есть всё, что звучит за дорожку, — голоса, их отпускания
   и хвосты её цепи (реверб, делей) в точности как отрендерено. Пауза на доле b — когда весь буфер в окне ±FRZ_REST_WIN (50 мс) вокруг
   смещения этой доли тише FRZ_REST_DB (−60 дБ) от пика буфера (до начала и после конца буфера — тишина). Тогда живые голоса дорожки в
   этот миг тоже отзвучали (те же ноты), и подмена ничего не режет и не удваивает. Карта тишины — пики блоков по FRZ_BLK (10 мс),
   один проход при постановке буфера (frzBlocks).
   ⛳ ДВОЙНОЕ ОТПУСКАНИЕ ПОЧИНЕНО. Прежде (A2) на входе голоса дорожки отпускались СВОИМ релизом (у долгого пада 1.8 с), а буфер уже играл
   те же ноты — до +6 дБ. Теперь голоса дорожки — и удерживаемые, и ещё звучащие отпущенные хвосты — уходят В МИГ подмены за FRZ_XF
   (audio.voicesCut: ступень уровня tg, cos); их остаток уже лежит в буфере, который вплывает с той же доли по той же формуле времени
   (frzStart: смещение = startSec + (b − первая доля)·spb, старт = t0 + (b + сдвиг прохода)·spb — сэмпл в сэмпл с событиями).
   Срез аккордов и баса ставит планировщик, когда его окно дошло до доли подмены (все события ДО неё уже поставлены); соло идёт «почти
   сейчас» — его срез ставит tick заранее (FRZ_LEAD_AHEAD) и повторяет после каждого соло-события слоя, сыгранного до шва (frzLeadRecut).
   ⚠️ Предел, названный: удары, поставленные до подмены, — одноразовые узлы без реестра; их хвосты (сотни мс) доигрывают поверх тех же
   хвостов в буфере. В паузе их нет; при перекрёсте на такте — кратко. Реверб/делей роли: хвост срезанных голосов в живой сети роли
   дозвучивает поверх хвоста буфера (≤ RT60) — у паузы его нет по определению паузы.
   ⛳ Контроли пробы P.checkSwap — frzSwapDbg('old'): прежний вход A2 (голоса своим релизом, буфер сразу); frzSwapDbg('hard'): то же место,
   что выбрано, но рубильником (без перекрёста). Только проба; без них подмена такая, как описано. */
const FRZ_XF=0.02, FRZ_SWAP_BARS=2, FRZ_REST_DB=60, FRZ_REST_WIN=0.05, FRZ_REST_GRID=0.25, FRZ_BLK=0.01, FRZ_LEAD_AHEAD=0.075;
let frzSwapMode=null;
const frzSwapDbg=m=>{ frzSwapMode= m==='old'||m==='hard' ? m : null; return frzSwapMode; };
/* Карта тишины буфера: пик каждого блока FRZ_BLK по обоим каналам и порог паузы. */
function frzBlocks(buf){
  if(!buf||!buf.getChannelData) return { blk:null, thr:0 };
  const n=Math.max(1,Math.round(FRZ_BLK*buf.sampleRate)), nb=Math.ceil(buf.length/n), blk=new Float32Array(nb);
  let pk=0;
  for(let c=0;c<buf.numberOfChannels;c++){ const x=buf.getChannelData(c);
    for(let i=0;i<x.length;i++){ const a=x[i]<0?-x[i]:x[i]; const k=(i/n)|0; if(a>blk[k]) blk[k]=a; if(a>pk) pk=a; } }
  return { blk, thr:Math.max(pk*Math.pow(10,-FRZ_REST_DB/20), 1e-6) };
}
/* ═══ ⛳ AF6b: ЗАМОРОЖЕННЫЙ БУФЕР В 16 БИТАХ — УПАКОВКА ═══
   После рендера Float32 превращается в 16-битные куски по FRZ_CHUNK кадров на канал и уходит в хранилище на потоке звука
   (audio.frzStorePut → frz-worklet.js), Float32-копия в реестр не попадает. Память — вдвое меньше; звук — прежний до последних бит.
   ⛳ МАСШТАБ ДОРОЖКИ: до лимитера замороженная дорожка может быть громче 1.0 — поэтому q = round(x · 32767 / пик), а чтец множит на
   пик/32767 (mul): ничего не срезается, а вся сетка 16 бит отдана самой дорожке. Ошибка ≤ ½ ступени = пик/65534 — −96.3 дБ к пику (в
   среднем ≈ −101 дБ). ⛳ ПОДМЕШИВАНИЯ (TPDF) НЕТ — решено по мере: треугольный шум ±1 ступени поднял бы наибольшую ошибку до 1.5 ступени
   (−86.8 дБ к пику — за допуском −90 дБ) и сделал бы перезаморозку разной от раза к разу; без него ошибка коррелирована с сигналом лишь
   ниже −96 дБ к пику (хвост ещё и под мастером и лимитером) — неслышимо. Проба P.checkChunks меряет обе на самой дорожке.
   ⛳ КУСОК — единица ХРАНЕНИЯ (и будущей подкачки с диска, AF6), а не единица воспроизведения: чтец читает насквозь, стыков кусков в
   звуке нет. Степень двойки — индекс куска сдвигом. Карта тишины (паузы AF2) строится тем же проходом.
   ⛔ Режимы хранения 'f32' (эталон пробы: тот же чтец, Float32) и 'noscale' (контроль пробы: без масштаба — должно срезаться) — только проба. */
const FRZ_CHUNK=1<<15;          // кадров в куске хранения (≈ 0.68 с при 48 кГц)
const FRZ_PACK_SLICE=4;         // кусков за один заход асинхронной упаковки (≈ 1–3 мс на заход) — между заходами поток отдаётся кадру
let frzStoreKind='i16', frzKeySeq=0;
const frzStoreMode=m=>{ frzStoreKind= m==='f32'||m==='noscale' ? m : 'i16'; return frzStoreKind; };   // ⛔ только проба
/* Генератор упаковки: проход 1 — пик и карта тишины, проход 2 — куски; уступает после каждых FRZ_PACK_SLICE кусков. */
function* frzPackGen(buf, kind){
  const nch=buf.numberOfChannels, len=buf.length, rate=buf.sampleRate, X=[];
  for(let c=0;c<nch;c++) X.push(buf.getChannelData(c));
  const bn=Math.max(1,Math.round(FRZ_BLK*rate)), blk=new Float32Array(Math.ceil(len/bn));
  let pk=0, i=0, step=FRZ_CHUNK*FRZ_PACK_SLICE;
  while(i<len){ const z=Math.min(len,i+step);
    for(const x of X) for(let j=i;j<z;j++){ const a=x[j]<0?-x[j]:x[j]; const k=(j/bn)|0; if(a>blk[k]) blk[k]=a; if(a>pk) pk=a; }
    i=z; yield; }
  const S= kind==='noscale' ? 1 : (pk>0?pk:1), mul= kind==='f32' ? 1 : S/32767, inv=1/mul;
  const ch=X.map(()=>[]); let bytes=0;
  for(let a=0;a<len;a+=FRZ_CHUNK){ const z=Math.min(len,a+FRZ_CHUNK);
    for(let c=0;c<nch;c++){ const x=X[c];
      if(kind==='f32'){ const o=new Float32Array(z-a); o.set(x.subarray(a,z)); ch[c].push(o); bytes+=o.byteLength; }
      else { const o=new Int16Array(z-a); for(let j=a;j<z;j++){ let q=Math.round(x[j]*inv); if(q>32767) q=32767; else if(q<-32767) q=-32767; o[j-a]=q; } ch[c].push(o); bytes+=o.byteLength; } }
    if(((a/FRZ_CHUNK)+1)%FRZ_PACK_SLICE===0) yield; }
  return { ch, len, rate, chunk:FRZ_CHUNK, mul, peak:pk, kind, bytes, blk, thr:Math.max(pk*Math.pow(10,-FRZ_REST_DB/20), 1e-6), used:false };
}
function frzPack(buf, kind){ const g=frzPackGen(buf, kind||frzStoreKind); let r=g.next(); while(!r.done) r=g.next(); return r.value; }
/* Асинхронно — для настоящей заморозки (render.freeze): упаковка трёхминутной дорожки — несколько десятков мс счёта, отдаём их кадрам
   заходами. Нет ворклета — null (freezeSet оставит Float32). */
/* Уступка потоку между заходами — через MessageChannel, а не setTimeout: в скрытой вкладке таймер дросселируется до секунды, и упаковка
   длинной дорожки шла бы минутами. */
let frzYCh=null; const frzYQ=[];
function frzYield(){ if(!frzYCh){ frzYCh=new MessageChannel(); frzYCh.port1.onmessage=()=>{ const f=frzYQ.shift(); if(f) f(); }; }
  return new Promise(res=>{ frzYQ.push(res); frzYCh.port2.postMessage(0); }); }
async function frzPackAsync(buf){
  if(!AUD.frzReady||!buf) return null;
  const g=frzPackGen(buf, frzStoreKind); let r=g.next();
  while(!r.done){ await frzYield(); r=g.next(); }
  return r.value;
}
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkChunks): кусок хранения дорожки со сдвигом на сэмпл (shift) или тишиной (drop); null — снять. */
const frzChunkDbg=(layer,dbg)=>{ const f=frzOf(layer); if(!f||!f.key) return false; AUD.frzStoreDbg(f.key, dbg||null); return true; };
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ: как хранится дорожка и какие узлы-чтецы она завела (кадр старта, сдвиг d: кадр буфера = кадр контекста + d,
   сколько выдал, где остановлен). */
const frzNodesInfo=layer=>{ const f=frzOf(layer); return f ? { key:f.key||null, kind:f.kind, len:f.len, chunk:FRZ_CHUNK, peak:f.peak, bytes:f.bytes, log:f.log.map(x=>({...x})) } : null; };
/* Пауза на песенной доле b? (t0b — первая доля дорожки; spb — секунд на долю.) */
function frzRestAt(f, b, t0b, spb){
  if(!f.blk) return false;
  const off=f.startSec+(b-t0b)*spb, a=off-FRZ_REST_WIN, z=off+FRZ_REST_WIN, nb=f.blk.length;
  const k0=Math.max(0,Math.floor(a/FRZ_BLK)), k1=Math.min(nb-1,Math.floor(z/FRZ_BLK));
  for(let k=k0;k<=k1;k++) if(f.blk[k]>f.thr) return false;
  return true;
}
/* ПЛАН ПОДМЕНЫ — зовёт планировщик в НАЧАЛЕ отрезка, до его событий (lo — песенная доля начала отрезка, off — сдвиг прохода). */
function frzPlanSwap(f, lo, rep, off){
  const spb=secPerBeat(), M=loop.metre, T=b=>timeAt(b+off);
  if(frzSwapMode==='old'){                                 // контроль пробы: прежний вход A2
    const t=T(lo); frzEnter(f, lo, t, rep); f.mark.old=true; frzArm(f, lo, t, rep);
    f.lastSwap={ kind:'old', beat:lo, at:t, rep }; return; }
  const cyc=cycling(), R=loop.rgn, passEnd=cyc?R.to:Infinity, end=Math.min(lo+FRZ_SWAP_BARS*M, passEnd);
  const t0b=frzT0(f), rest=x=>frzRestAt(f,x,t0b,spb), bar0=Math.ceil(lo/M-1e-9)*M;
  let b=null, kind=null;
  for(let x=bar0; x<=end+1e-9; x+=M) if(x<passEnd-1e-9 && rest(x)){ b=x; kind='rest-bar'; break; }
  if(b==null) for(let x=Math.ceil(lo/FRZ_REST_GRID-1e-9)*FRZ_REST_GRID; x<=end+1e-9; x+=FRZ_REST_GRID) if(x<passEnd-1e-9 && rest(x)){ b=x; kind='rest'; break; }
  if(b==null){ b=bar0; kind='xf'; }
  const xf= frzSwapMode==='hard' ? 0 : FRZ_XF;
  if(cyc && b>=passEnd-1e-9){                              // ближайшая линия такта — конец скобы: подмена НА ШВЕ
    const at=T(passEnd);
    f.swap={ seam:true, rep, beat:R.from, at, cut:false, xf };
    f.mark={ kind:'enter', rep:rep+1, beat:R.from, at, seam:true };
    droneSyncAt(at, FRZ_DRONE_TC, f.layer);
    f.lastSwap={ kind:'seam', beat:passEnd, at, rep }; return; }
  const at=T(b);
  f.swap={ seam:false, rep, beat:b, at, cut:false, xf };
  f.mark={ kind:'enter', rep, beat:b, at, xf };
  frzStart(f, b, at, xf);                                  // узел буфера — со смещения доли b, ровно в миг at, вплывает за xf
  droneSyncAt(at, FRZ_DRONE_TC, f.layer);
  f.lastSwap={ kind: frzSwapMode==='hard' ? 'hard' : kind, beat:b, at, rep };
}
/* СРЕЗ аккордов и баса дорожки в миг подмены — когда окно планировщика дошло до её доли (всё до неё уже поставлено). */
function frzSwapCut(f, rep){
  const sw=f.swap; if(!sw||sw.cut||sw.seam) return;
  AUD.voicesCut(k=>layerOfOwner(k)===f.layer, sw.at, sw.xf, 'pool');
  sw.cut=true; f.armedRep=rep; f.evRun=false;
}
/* Соло: срез по времени шва (tick — заранее; fireNear — после соло-события слоя, сыгранного до шва). */
function frzCutLead(f, mk){ AUD.voicesCut(k=>layerOfOwner(k)===f.layer, Math.max(mk.at, AC.currentTime), mk.xf==null?FRZ_XF:mk.xf, 'lead'); }
function frzLeadAhead(){
  const lim=AC.currentTime+FRZ_LEAD_AHEAD;
  for(const f of frozen.values()){ const mk=f.mark;
    if(mk && mk.kind==='enter' && !mk.old && !mk.seam && !mk.leadCut && mk.at<=lim){ mk.leadCut=true; frzCutLead(f, mk); } }
}
function frzLeadRecut(ev){
  const f=frzOf(ev.layer), mk=f&&f.mark;
  if(mk && mk.kind==='enter' && mk.leadCut && !mk.seam) frzCutLead(f, mk);
}
/* ОТМЕНА подмены, ещё не начатой (дорожка устарела, прыжок скобы): её узел глушим (он ещё не звучит), отметку снимаем, дрон — как было.
   События так и владеют дорожкой (evRun), следующий отрезок спланирует подмену заново, если дорожка снова свежая. */
function frzSwapCancel(f){
  const sw=f.swap; if(!sw) return;
  f.swap=null; f.mark=null;
  if(!sw.seam) for(const n of f.nodes.slice()) frzKill(n, AC.currentTime);
  droneSync(sw.at, FRZ_DRONE_TC);
  if(f.drop) frzRetire(f);
}
const frzSwapCancelAll=()=>{ for(const f of [...frozen.values()]) if(f.swap&&!f.swap.cut) frzSwapCancel(f); };
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkSwap): последний план подмены дорожки — { kind:'rest-bar'|'rest'|'xf'|'seam'|'hard'|'old', beat, at, rep }. */
const frzSwapInfo=layer=>{ const f=frzOf(layer); return f&&f.lastSwap ? {...f.lastSwap} : null; };
/* ═══ ⛳ ДВА ШВА — ВХОД В БУФЕР И ВЫХОД ИЗ НЕГО (A2 и A2b). ОБА ЗОВЁТ ТОЛЬКО ПЛАНИРОВЩИК. ═══
   ⛳ ОДНО ПРАВИЛО НА ОБА НАПРАВЛЕНИЯ: ШОВ СТОИТ НА ГОРИЗОНТЕ ЗАПЛАНИРОВАННОГО — в начале отрезка `lo`
   планировщика, в миг T = t0 + (lo+сдвиг прохода)·spb. Всё, что до шва, УЖЕ поставлено тем, кто владел
   дорожкой до него; всё, что после, — поставит новый владелец. Поэтому ничего не надо ни отменять, ни
   переписывать заново, а курсоры не трогаются вовсе (правило #28 цело: сброса нет, потому что нечего
   сбрасывать — планировщик и так идёт вперёд с `lo`).
   ⛳ ПОЧЕМУ ИМЕННО ПЛАНИРОВЩИК, А НЕ МЕСТО СОБЫТИЯ. Дорожка покидает буфер тремя путями — устаревает от
   правки (запись в неё, отмена взятого), устаревает от тоники/A4/темпа, её размораживают — и входит в
   него двумя (заморозили на ходу, снова стала свежей). Ловить каждое в месте, где оно случилось, значило
   бы пять копий шва. Планировщик же на КАЖДОМ отрезке спрашивает одно: «кто сейчас должен звучать за эту
   дорожку — буфер или события?» — и если ответ сменился, шьёт. Один путь на все выходы и один на все входы. */
/* ВХОД (A2): до шва дорожку играли события — их голоса гасим ПО ВРЕМЕНИ ШВА. Релиз делает
   cancelScheduledValues(T), значит атаки аккордов/баса, уже поставленные в окно ПОСЛЕ шва, тоже снимаются.
   Удары, поставленные в окно, лежат ДО шва, а буфер играет только ПОСЛЕ — не двоится ничто. Соло и дрон
   идут «почти сейчас» через fireNear, им шов — отметка f.mark (проход и песенная доля шва): события слоя
   раньше неё ещё играют, позже — нет, а tick, дойдя до неё, гасит соло-голоса слоя (frzNearDone). ⛔ Правило #20: только
   голоса ДОРОЖКИ ('loop:N'/'bassloop:N'/'leadloop:N'), живой 'latch' не трогаем. */
/* ⚠️ AF2: прежний вход — планировщик его больше НЕ зовёт (подмена — frzPlanSwap); живёт ТОЛЬКО как контроль пробы frzSwapDbg('old'):
   голоса уходят СВОИМ релизом поверх буфера — двойное отпускание, которое проба обязана увидеть. */
function frzEnter(f, lo, T, rep){
  releaseLoopLayersAt(T, f.layer, 'pool');
  f.mark={ kind:'enter', rep, beat:lo, at:T }; f.evRun=false;
  droneSync(T, FRZ_DRONE_TC);
}
/* ⛳ ВЫХОД (A2b) — ЗЕРКАЛО ВХОДА. Буфер доигрывает ДО шва и уходит рампой FRZ_FADE (та же, что у любого
   обрыва: stop() насухо щёлкает); события берут дорожку С шва.
   ⛳ ДОГОНЯЛКА — ТА САМАЯ, ЧТО У ВХОДА В ПЕСНЮ НЕ С НАЧАЛА (chasePlay/chaseFor), второй не заводим: шов —
   это и есть вход в середину песни для одной дорожки. Она поднимает удержанные аккорды, бас и соло к доле
   `lo` по времени T, каждый со своим замороженным ладом и картой эффектов (правило #7), — в НОВОЙ тонике,
   если выход случился из-за неё: частоту выводит ENG из живой тоники. `only` ограничивает её этой дорожкой.
   ⛳ УДАРЫ В ОКНЕ ОПЕРЕЖЕНИЯ НЕ ТЕРЯЮТСЯ И НИЧЕГО НЕ ПЕРЕКЛАДЫВАЕТСЯ: окно до шва расписано буфером (события
   дорожки туда не ставились — она была заморожена), и буфер его ДОИГРЫВАЕТ; с шва события ставит обычный
   проход планировщика, который как раз начинается с `lo`. Прежде буфер глушили «сейчас», а события шли с
   горизонта — отсюда и дыра до ~300 мс.
   ⚠️ УЗЕЛ-ХВОСТ НЕ ОБРЫВАЕМ: если к шву буфер уже за концом музыки (endSec), в нём звучит только хвост цепи —
   пусть доиграет, как хвост живых голосов (тот же довод, что у шва скобы в frzArm).
   ⚠️ ЦЕНА, названная: хвосты реверба/делея от нот ДО шва жили в буфере — живая цепь этих нот не слышала,
   поэтому на шве «комната» дорожки начинается заново. Для сухой дорожки — ничего. */
function frzLeave(f, lo, T, rep){
  for(const n of f.nodes.slice()){
    const pos = n.off + (T - n.at);                 // где в буфере узел окажется на шве
    if(pos < f.endSec - 1e-6) frzKill(n, T);        // ещё музыка — уходим рампой в миг шва; иначе хвост доигрывает сам
  }
  f.armedRep=null; f.mark={ kind:'leave', rep, beat:lo, at:T }; f.evRun=true; f.swap=null;   // AF2: подмена, если была, позади — следующая свежесть спланирует новую
  chasePlay(lo, T, false, f.layer);                 // аккорды и бас — ДО событий этого отрезка (их поставит цикл сразу после)
  chasePlay(lo, T, true,  f.layer);                 // соло — по явному времени шва, как при пуске (startTransport)
  droneSync(T, FRZ_DRONE_TC);
}
/* ⛳ ОТМЕТКА ШВА ДЛЯ fireNear — f.mark = {kind:'enter'|'leave', rep, beat, at}. Соло и дрон идут «почти
   сейчас», а не по планировщику, поэтому им шов нужен явной отметкой.
   ⛳ СРАВНИВАЕМ ПАРУ (проход, песенная доля) СОБЫТИЯ с парой шва, а не часы с часами. По часам: тик идёт раз
   в ~25 мс, и тик, пересекающий шов, потерял бы (вход) или удвоил бы (выход) ноту, начатую в последние
   миллисекунды перед ним. По одной доле: шов стоит на ГОРИЗОНТЕ, и под крутящейся скобой он бывает уже в
   СЛЕДУЮЩЕМ проходе, пока играет ещё этот, — голая доля шва тогда меньше доли событий хвоста прохода, и
   порядок читался бы наоборот. Номер прохода (rgnReps, как у планировщика) снимает это целиком.
   ⚠️ `at` — часы шва: страховка, а не правило (см. frzNearDone).
   Возвращает true — событие слоя играть НЕ надо (его играет буфер). */
function frzSkipNear(ev, rep){
  const f=frzOf(ev.layer); if(!f) return false;
  const mk=f.mark;
  if(mk){ const before = rep<mk.rep || (rep===mk.rep && ev.t<mk.beat-1e-9);
          return mk.kind==='leave' ? before : !before; }       // выход: до шва — буфер; вход: с шва — буфер
  return freezeState(ev.layer)==='fresh';                      // без шва: свежая — буфер, устаревшая/уходящая — события
}
/* Тик дошёл до (прохода rep, доли p): снять отметки, чей шов пройден. Вход — погасить соло-голоса слоя
   (дальше их играет буфер); выход — если это была разморозка, отпустить запись реестра.
   ⚠️ СТРАХОВКА ПО ЧАСАМ: смена скобы в те ≤300 мс, что шов ждёт, переназначает номера проходов — и отметка
   могла бы не дождаться своей пары никогда (выход тогда вечно глушил бы соло дорожки). Поэтому шов, чьё
   время прошло с запасом, снимается в любом случае. */
const FRZ_MARK_GRACE=0.25;
function frzNearDone(rep, p){
  const now=AC.currentTime;
  for(const f of frozen.values()){ const mk=f.mark; if(!mk) continue;
    if(!(rep>mk.rep || (rep===mk.rep && p>=mk.beat-1e-9) || now>=mk.at+FRZ_MARK_GRACE)) continue;
    f.mark=null;
    if(mk.kind==='enter'){
      if(mk.old) releaseLoopLayersAt(undefined, f.layer, 'lead');   // контроль 'old': прежний путь
      else if(!mk.seam && !mk.leadCut) frzCutLead(f, mk);              // страховка: срез соло не поставлен заранее (tick опоздал)
      if(f.swap && !f.swap.seam){ if(!f.swap.cut) frzSwapCut(f, mk.rep); f.swap=null; }   // AF2: подмена состоялась — буфер владеет дорожкой
    }
    else if(f.drop) frzRetire(f);
  }
}
/* Снять запись реестра. ⛳ ШИНУ ОТКЛЮЧАЕМ С ОТСРОЧКОЙ: мгновенный disconnect обрывал рампу FRZ_FADE,
   которую frzKill только что поставила, — то есть щёлкал ровно так, как рампа и должна была не дать.
   Отсрочка по стенным часам здесь законна: это уборка, а не музыкальное время. */
function frzRetire(f){
  if(frozen.get(f.id)!==f) return;
  frozen.delete(f.id);
  const b=f.bus, key=f.key, sp=f.spare; f.spare=null; if(sp){ try{ sp.port.postMessage({ stop:0 }); }catch(e){} }   // AF6b-fix: чтец-запас — завершить
  setTimeout(()=>{ try{ b.disconnect(); }catch(e){} if(key) AUD.frzStoreDel(key); }, 80);   // AF6b: данные в хранилище — снять (уже играющие чтецы держат свою ссылку)
}
function freezeDrop(id){
  frzPendCancel(id, 'dropped');                     // AF6b-fix: и ещё не готовая заморозка этой дорожки
  const f=frozen.get(id); if(!f) return false;
  frzStopOne(f, 0);                                 // 0 — «сейчас»: рампа FRZ_FADE, затем отсроченное отключение шины
  frzRetire(f);
  return true;
}
/* ⛳ РАЗМОРОЗКА ТРОГАЕТ РОВНО ОДНУ ДОРОЖКУ (ошибка «разморозил одну — разморозились все» жила в подписи —
   см. laneEditVer). Стоим, или буфер сейчас не владеет дорожкой (устарела) — снимаем сразу, шить нечего.
   Играем и буфер звучит — только ПОМЕЧАЕМ: запись сразу перестаёт считаться заморозкой (freezeState →
   'none': индикатор, кнопка и события видят разморозку немедленно), а шов ВЫХОДА делает планировщик на
   ближайшем отрезке — тем же frzLeave, что и устаревание. Запись реестра живёт до шва и уходит в
   frzNearDone (или на любой остановке — frzStopOne). */
const unfreezeLayer=layer=>{
  const id=laneOf(layer); if(id!=null) frzPendCancel(id,'dropped');   // AF6b-fix: ещё не готовая — снять
  const f=id==null?null:frozen.get(id); if(!f||f.drop) return false;
  if(loop.on && f.armedRep!=null){ f.drop=true; return true; }
  freezeDrop(id); droneSync(); return true;
};
const frozenLayers=()=>[...frozen.values()].filter(f=>!f.drop).map(f=>f.layer);   // A2b: уходящая на шве — уже не в списке
const frozenInfo=layer=>{ const f=frzOf(layer); return f?{ layer:f.layer, state:freezeState(layer), seconds:+f.dur.toFixed(3), bytes:f.bytes, kind:f.kind,   // AF6b: bytes — НАСТОЯЩАЯ память буфера (16 бит или Float32-запас)
  startSec:f.startSec, endSec:+f.endSec.toFixed(3), tailSec:+f.tailSec.toFixed(2), pinned:f.pinned, nodes:f.nodes.length }:null; };

/* ПРИГЛУШЕНИЕ/СОЛО — ОДНО ПРИСВАИВАНИЕ. ⚠️ У буфера нет голосов, которые можно отпустить, поэтому
   обычный путь (releaseLoopLayersAt) до него не дотягивается: слышимость проверяется ПОСОБЫТИЙНО
   внутри планировщика, а событий у замороженной дорожки там нет. Отсюда своя проверка — и звать её
   надо оттуда же, откуда бьёт живое приглушение (laneHush). */
function frzGain(id){
  const f=frozen.get(id); if(!f) return;
  const on=laneAudible(f.layer);
  const g=on?laneGainOf(f.layer):0; f.busTarget=g;   // MX1: цель шины — её единственный писатель здесь; читает проба (frzBusGain)
  f.bus.gain.setTargetAtTime(g, AC.currentTime, 0.01);   // не рубильник: щелчок на приглушении читался бы поломкой. MX1: слышимая — с уровнем дорожки (тот же множитель, что у голосов её событий)
}
const frzGainAll=()=>{ for(const id of frozen.keys()) frzGain(id); };
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkMixer): ЦЕЛЬ гейна шины замороженной дорожки — то значение, которое движок на неё поставил (null — не
   заморожена). ⚠️ Не bus.gain.value: пока транспорт стоит, у шины нет ни одного источника (буфер-источники создаются на пуске), браузер
   такой узел не обрабатывает, и геттер .value держит старое значение — хотя автоматизация в линии времени параметра уже стоит и
   применится с первого же кванта, когда буфер заиграет (на слух: фейдер в ноль на играющей замороженной дорожке её глушит). frzGain —
   единственный писатель этого гейна, поэтому его цель и есть то, чем шина зазвучит. */
const frzBusGain=layer=>{ const id=laneOf(layer), f=id!=null&&frozen.get(id); return f ? f.busTarget : null; };

/* ═══ УЗЛЫ: ЖИЗНЕННЫЙ ЦИКЛ ═══
   ⛳ СКОЛЬКО ИХ ЖИВЁТ: на дорожку — не больше ДВУХ одновременно, и только на шве повтора. Обычно один.
   Рождение: пуск транспорта, снятие паузы, перемотка и КАЖДЫЙ проход скобы.
   Смерть: пауза, паника, конец песни, перемотка, разморозка, удаление дорожки — и естественный конец
   буфера, когда его не обрывали.
   ⚠️ ЗАТУХАНИЕ ПРИ ОБРЫВЕ: stop() режет насухо, то есть ЩЁЛКАЕТ. Поэтому у каждого узла свой гейн, и
   обрыв — это короткая рампа FRZ_FADE, а уже потом stop. Естественный конец рампы не требует. */
const FRZ_FADE=0.006;
const FRZ_STOP_LEAD=0.1;   // AUTO-PROBE: чтец молчит и завершается через столько после конца рампы — команда успевает прийти на поток звука (см. frzStart)
function frzStart(f, songBeat, atSec, xf){   // xf (AF2) — вплыть за xf секунд равной мощностью (подмена); не задан — сразу в полный уровень, как прежде
  /* СМЕЩЕНИЕ В БУФЕРЕ: сколько секунд от начала МУЗЫКИ уже прошло, плюс «разгон», который рендер
     положил перед первой нотой. Вот и вся догонялка. */
  const spb=secPerBeat();
  let off=f.startSec + (songBeat - frzT0(f))*spb;
  /* ⚠️ ОПОЗДАВШИЙ ТИК (заблокированный поток) — двигаем НЕ ТОЛЬКО время старта, НО И СМЕЩЕНИЕ. Сдвинь
     мы одно время, дорожка поехала бы назад ровно на величину опоздания и разошлась бы с живыми. */
  let at=atSec; const nowT=AC.currentTime;
  if(at<nowT){ off+=nowT-at; at=nowT; }
  /* ⛔ ВХОД ДО ПЕРВОЙ НОТЫ ДОРОЖКИ (найдено при A2): смещение выходит ОТРИЦАТЕЛЬНЫМ, и прежний
     start(at, max(0,off)) пускал буфер С НАЧАЛА И СРАЗУ — дорожка, записанная с 3-го такта, играла с 1-го.
     Отрицательное смещение значит «ещё рано»: старт откладываем на столько же, смещение — ноль. */
  if(off<0){ at-=off; off=0; }
  if(off>=f.dur) return null;                             // вошли за конец буфера — играть нечего
  const g=AC.createGain(); g.gain.value= xf>0 ? 0 : 1;
  if(xf!=null) AUD.xfRamp(g.gain, at, xf, 1, true);
  let n=null;
  const done=()=>{ const i=f.nodes.indexOf(n); if(i>=0) f.nodes.splice(i,1); try{ g.disconnect(); }catch(e){} };
  if(f.key){
    /* ⛳ AF6b: ЧТЕЦ 16-БИТНОГО ХРАНИЛИЩА. Старт и смещение — ЦЕЛЫЕ КАДРЫ: кадр буфера = кадр контекста + d. Отсчёт — от кадра опоры
       транспорта T0F = round(t0·sr): так узлы одного прогона лежат на одной сетке кадров независимо от дробной части t0 (два прогона —
       одна и та же раскладка по кадрам относительно своей опоры), и на стыке проходов скобы новый узел не уезжает на кадр от старого.
       Против прежнего источника буфера с дробным стартом (браузер интерполировал его на долю сэмпла) — сдвиг ≤ ½ кадра (≤ 11 мкс). */
    const sr=AC.sampleRate, T0F=Math.round(loop.t0*sr), startF=T0F+Math.round((at-loop.t0)*sr), offF=Math.round(off*sr), d=offF-startF;
    /* AF6b-fix: пускаем ЗАПАС, построенный заранее (команда — сообщением с кадром старта), и тут же строим следующий; запаса нет
       (два старта подряд быстрее, чем поток звука строит чтеца) — новый чтец сразу с параметрами, как в AF6b. */
    let src=null, spare=false;
    if(f.spare && f.spareOk){ src=f.spare; spare=true; f.spare=null; f.spareOk=false; src.port.postMessage({ play:{ startF, d } }); }
    else src=AUD.frzReader(f.key, startF, d);
    if(!src){ try{ g.disconnect(); }catch(e){} return null; }
    if(!f.spare) frzNewSpare(f, null);
    src.connect(g); g.connect(f.bus);
    const rec={ startF, d, offF, T0F, played:null, killF:null, stopF:null, first:null, seen:null, spare };
    f.log.push(rec); if(f.log.length>32) f.log.shift();
    /* ⛳ ОСТАНОВКА ЧТЕЦА — С ЗАПАСОМ FRZ_STOP_LEAD ПОСЛЕ КОНЦА РАМПЫ (слайс AUTO-PROBE). killF — где звук дорожки кончился (рампа FRZ_FADE
       ушла в ноль: это и есть слышимый конец), stopF — кадр, с которого чтец молчит и завершается. Прежде stopF = killF, а остановка «сейчас»
       (пауза, перемотка) — это «сейчас + 6 мс»: сообщение порта приходило на поток звука ПОЗЖЕ этого кадра (раннер: на 96 и 224 кадра), чтец
       успевал выдать лишний квант — неслышимо (гейн уже ноль), но не кадр в кадр. Запас 100 мс: команда приходит до своего кадра, остановка
       точна; кадр, на котором чтец её получил, он докладывает (seen) — опоздание названо, а не угадывается. */
    n={ src, g, killAt:null, at, off, rec, stop:t=>{ rec.killF=Math.round(t*sr); rec.stopF=rec.killF+Math.round(FRZ_STOP_LEAD*sr); rec.stopAt=performance.now(); src.port.postMessage({ stop:rec.stopF }); } };
    src.port.onmessage=e=>{ const m=e.data||{}; if(m.ended){ rec.played=m.played; rec.first=m.first; rec.seen=m.seen==null?null:m.seen; rec.endLagMs= rec.stopAt!=null ? +(performance.now()-rec.stopAt).toFixed(1) : null; done(); } };   // AF6b-fix2: endLagMs — сколько шёл отчёт о конце после команды остановки (проба)
  } else {                                                 // запас без ворклета: прежний источник Float32-буфера
    const src=AC.createBufferSource(); src.buffer=f.buf;
    src.connect(g); g.connect(f.bus);
    src.start(at, Math.max(0,off));
    n={ src, g, killAt:null, at, off, stop:t=>src.stop(t) };
    src.onended=done;
  }
  f.nodes.push(n);                                         // at/off (A2b): где узел будет в буфере в любой миг — frzLeave отличает по ним музыку от хвоста
  return n;
}
/* ПЕРВАЯ ДОЛЯ ДОРОЖКИ — та же, от которой рендер считал раскладку. ⚠️ Берём из СОБЫТИЙ, а не храним:
   события живы и неизменны, а лишняя копия числа однажды разъехалась бы с ними. */
function frzT0(f){
  let t0=null;
  for(const e of events) if(e.layer===f.layer && (t0===null||e.t<t0)) t0=e.t;
  return t0===null?0:t0;
}
function frzKill(n, atSec){
  if(!n||n.killAt!=null) return;
  /* AF6b: миг обрыва — на сетке кадров опоры транспорта (как старт чтеца, см. frzStart): рампа FRZ_FADE ложится на одни и те же кадры
     относительно опоры в любом прогоне (сдвиг ≤ ½ кадра). Иначе её дробная фаза разнилась бы от прогона к прогону. */
  const sr=AC.sampleRate, T0F=Math.round(loop.t0*sr);
  let t=Math.max(atSec==null?AC.currentTime:atSec, AC.currentTime);
  t=(T0F+Math.round((t-loop.t0)*sr))/sr; if(t<AC.currentTime) t=AC.currentTime;
  n.killAt=t;
  try{
    n.g.gain.cancelScheduledValues(t);
    n.g.gain.setValueAtTime(n.g.gain.value,t);
    n.g.gain.linearRampToValueAtTime(0,t+FRZ_FADE);     // де-щелчок: рубильник слышен как поломка
    n.stop(t+FRZ_FADE);                                  // AF6b: чтецу — кадр остановки сообщением; запасному источнику — stop()
  }catch(e){}
}
/* Отметки швов (A2/A2b) — сбрасываем: любой останов/перезапуск перевзводит дорожку целиком, недошитый шов
   теряет смысл (голоса гасят сами остановки). Уходящая на шве (разморожена на ходу) — уходит совсем. */
function frzStopOne(f, atSec){ for(const n of f.nodes.slice()) frzKill(n, atSec); f.armedRep=null; f.mark=null; f.swap=null;   // AF2: недошитая подмена теряет смысл, как и отметка
  if(f.drop) frzRetire(f); }
/* ⛳ ЕДИНАЯ ДВЕРЬ ОСТАНОВКИ — её и зовут пауза, паника, конец песни, перемотка и очистка. */
function frzStopAll(atSec){ for(const f of frozen.values()) frzStopOne(f, atSec); }

/* ⛳ ВЗВЕСТИ ИСТОЧНИКИ НА ТЕКУЩЕМ ПРОХОДЕ — зовётся ИЗ ПЛАНИРОВЩИКА, тем же временем и тем же
   сдвигом прохода, каким он ставит события слоёв (правило #15: второго пути таймирования нет).
   `rep` — номер прохода: сменился, значит начался новый круг и нужен НОВЫЙ узел (старый одноразов).
   ⛳ ШОВ: старый узел НЕ ОБРЫВАЕМ — он доигрывает СВОЙ ХВОСТ поверх начала следующего прохода. Ровно
   это живая дорожка делает релизами голосов, которые звучат через шов. ⛔ Складывать хвост нельзя,
   только перекрывать.
   ⚠️ ЧЕСТНО О ГРАНИЦАХ ПЕРЕКРЫТИЯ. В буфере после конца музыки (endSec) лежит ХВОСТ, и только он.
   Если шов приходится на конец материала (а так стоит скоба по умолчанию — она следует за материалом),
   то всё, что осталось в буфере, и есть хвост: отпускаем узел доигрывать до конца, обрывать нечего.
   Если же скоба — КУСОК середины, то за швом в буфере лежит СЛЕДУЮЩАЯ МУЗЫКА, а не хвост; играть её
   поверх нового прохода было бы неправдой, поэтому такой узел глушим с короткой рампой. Хвоста в этом
   случае не будет — он не существует в линейном аудио нигде, кроме конца дорожки. Названо, а не скрыто. */
function frzArm(f, songBeat, atSec, rep){
  const prev=f.nodes[f.nodes.length-1];
  if(prev){
    const spb=secPerBeat();
    const posAtSeam=f.startSec + (songBeat - frzT0(f))*spb;   // где в буфере окажется шов
    const musicEnd=f.endSec;                                   // конец МУЗЫКИ в координатах буфера
    if(posAtSeam < musicEnd - 1e-6) frzKill(prev, atSec);       // за швом ещё музыка — перекрывать ею нельзя
    /* иначе: за швом только хвост — пусть доигрывает сам, узел умрёт по onended */
  }
  f.armedRep=rep;
  frzStart(f, songBeat, atSec);
}
/* ⛔ frzArmAll УДАЛЁН (A2). Его единственный вызов — заморозка на ходу — перезапускал ВСЕ замороженные
   дорожки (обрыв с рампой и новый узел через 20 мс) ради одной новой. Пуск, снятие паузы и перемотка
   его не звали никогда: там взводит планировщик (armedRep=null). Заморозка на ходу — шов ВХОДА frzEnter
   из планировщика, одна дорожка. */


export { freezeWire, frzWatchBump, frzPend, frozen, frozenOn, frzLayer, frzHas, frzBufNow, frzChaseSkip, frzGlobalKey, frzSigMemo, frzSigTonicDbg, freezeSig, freezeState, freezePinCaptures, frzWatchVer, frzWatchKey, frzRetuneOnly, laneHasChain, frzBytesTotal, frzBytesOf, songPinChains, freezeTicket, freezeSet, frzPendCancel, frzWhenReady, frzReadersAlive, frzSwapDbg, FRZ_CHUNK, frzStoreMode, frzPackAsync, frzChunkDbg, frzNodesInfo, frzPlanSwap, frzSwapCut, frzLeadAhead, frzLeadRecut, frzSwapCancel, frzSwapCancelAll, frzSwapInfo, frzLeave, frzSkipNear, frzNearDone, freezeDrop, unfreezeLayer, frozenLayers, frozenInfo, frzGain, frzGainAll, frzBusGain, frzStopOne, frzStopAll, frzArm };
