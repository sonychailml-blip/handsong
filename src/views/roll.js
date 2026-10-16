/* DRAW1 (DAY run 2026-10-16): the track editor (drawRoll, rollView, the pitch axis, the automation lane, hit tests) — moved from draw.js verbatim (draw.js is the facade). Canvas only; nothing visible changed. */
import { ctx, canvas } from '../vision.js';
import { CUR, chordRowFreq, OCT_ROMAN, REG_N, baseF, listName, namingOf, stepName, chordPitchHz, chordNotesAt, chordRowFreqAt, leadFreqTi, tuningOf, viewKey } from '../scales.js';
import { icon } from '../icons.js';
import { t, L } from '../i18n.js';
import { fx, FX_VOL, rollBeat0, rollSpan, rollSel, rollSelNote, rollSelMany, rollPick, rollBox, rollDrag, rollIns, rollRole, rollRow0, rollRowsAll, ROLL_EDITABLE, rollAut, rollAutSel, rollAutDrag, rollVolBars, rollBendSel, rollBendDrag } from '../state.js';
import { FX_META, INSTR_COL, LANE_NOROLE_COL, bendSeg, curveU } from '../config.js';
import { DRUM_NAMES, DRUM_ROWS, FX_FACTORY } from '../audio.js';
import { loop, loopPos, beatLevel, regionOn, songNotes, songSegs, captureInfoOf, autPoints, pnBars, editLayer as rollTrackLayer, chordMoveTy, bendEdited } from '../recorder.js';
import { ROLL_BAR_H, ROLL_TP_H, hexA, laneBeatAt, laneBeatX, noteLbl, rollRowAt, rollRowY, statusEl, syncLoopTransport } from './common.js';
import { loopViewClear } from './strip.js';

const ROLL_RULER_H=16;                  // полоса ЛИНЕЙКИ (S5.2): тап по ней = перемотка; своя цель, как полоса скобы у лупера
const ROLL_LBL_W=58;                    // МИНИМУМ колонки подписей слева (ударным её и хватает); ладовой роли ширину считает rollGutterW
/* ⛳ ПОДВАЛ РЕДАКТОРА — ПОЛОСА ПОД СЕТКОЙ, И ЕЁ ВЫСОТА СЧИТАЕТСЯ ИЗ ЧИСЛА СТРОК, а не выписана числом.
   ⚠️ ПОЧЕМУ ЭТО ЗАВЕДЕНО: подвал был фиксированные 26px, целиком занятые ОДНОЙ строкой-подсказкой. Вторая
   строка (что у дорожки захвачено, O-2) встала на gy1+26, то есть ровно на y=H — на ПОСЛЕДНИЙ ряд пикселей
   экрана, да ещё с унаследованной серединной привязкой: от неё внутрь холста попадали верхние ~5px букв.
   Строка рисовалась и была невидима. ⛔ Не «подвинуть на пару пикселей»: полосу, рассчитанную на одну
   строку, нельзя набивать двумя — следующая строка (а «заморожено с …» уже в пути) повторила бы ту же
   ошибку. Полоса теперь ЗНАЕТ, сколько в ней строк: добавляешь строку — поднимаешь ROLL_FOOT_LINES, и
   сетка сама уступает ей место.
   ⚠️ ПЛАТА НАЗВАНА: сетка теряет 12px высоты. Транспортной полосе это не грозит — в редакторе она
   пришвартована СВЕРХУ (syncLoopTransport(true, ROLL_BAR_H+4)), и место под неё уже вычтено в ry0. */
const ROLL_FOOT_STEP=13;                                     // шаг строки подвала (шрифт 10px + воздух)
const ROLL_FOOT_LINES=2;                                     // подсказка + «что захвачено»
const ROLL_FOOT_H=ROLL_FOOT_STEP*ROLL_FOOT_LINES+12;         // =38: строки + нижнее поле, чтобы нижняя не липла к кромке
/* ИМЯ ЭФФЕКТА ДЛЯ ПОКАЗА — ОДНА РЕЗОЛЮЦИЯ НА ВСЁ ПРИЛОЖЕНИЕ (переехала сюда из ui в этой правке).
   ⛔ ВТОРОЙ КОПИИ БЫТЬ НЕ ДОЛЖНО: подвал редактора сперва обошёлся своим «FX_FACTORY[id] ? … : id», и
   старые скаляры (драйв/вибрато/тремоло-нота) выводились СЫРЫМИ ИДЕНТИФИКАТОРАМИ — у них записи в
   фабрике нет вовсе, зато есть имя в FX_META. Две резолюции разошлись бы ровно там, где их труднее
   всего сверить: в двух разных экранах.
   ⚠️ ЖИВЁТ В draw, а не в ui: ui импортирует draw (loopHit/rollHit/…), обратный импорт был бы циклом.
   Всё нужное здесь и так под рукой — FX_META из config, FX_FACTORY из audio, t из i18n.
   Порядок поиска: СНАЧАЛА метаданные показа (там лежат старые скаляры и цвет делея), потом реестр
   модулей, и лишь в последнюю очередь сам id — как признак «эффект есть, а имени ему не дали». */
export function fxTitleOf(fxId){
  const m=FX_META.find(q=>q.k===fxId); if(m) return t(m.fullKey);
  const mod=FX_FACTORY[fxId]; return mod ? t(mod.labelKey) : fxId;
}
const ROLL_PITCH_ROW_H=18;              // МИНИМАЛЬНАЯ высота ряда ладовой роли: ниже — не прочитать; при этом ряды прокручиваются
/* ⛳ ПОТОЛОК ВЫСОТЫ РЯДА (S5.6). Когда ряды ВЛЕЗАЮТ, они растягиваются на всю высоту — иначе пентатоника
   (24 ряда) оставляла бы пол-экрана пустым. Но расти бесконечно нельзя: ряд выше ~30px читается уже не
   как строка сетки, а как плита, и глаз теряет соседние ступени. 30 ещё и заметно выше пальца (24px),
   поэтому попадание от потолка не страдает. */
const ROLL_PITCH_ROW_MAX=30;
const ROLL_HIT_PX=12;                   // допуск попадания по времени: палец толще удара
/* ⛳ ЗОНА ИЗМЕНЕНИЯ ДЛИНЫ (S5.6) — правый край блока. ⚠️ Она ОТНИМАЕТ площадь у переноса, поэтому:
   (1) ширина зоны — не больше 40% блока, чтобы середина всегда оставалась «взять и двигать»;
   (2) у блока уже ROLL_EDGE_MIN_W зоны НЕТ ВОВСЕ — на узкой ноте палец не различит край и середину,
       и молчаливая подмена жеста была бы хуже отсутствия жеста (узкую ноту сперва растяните зумом). */
const ROLL_EDGE_PX=16, ROLL_EDGE_MIN_W=34;
let rollView=null;
let rollCache={view:null,layer:null,hits:null};
/* Удары ОТКРЫТОЙ дорожки, по времени. Пересобираются, только когда сменился вид нот (schedInvalidate)
   или дорожка — то есть не каждый кадр. Порядок наследуется от событий: они отсортированы. */
function rollHits(){
  const V=songNotes(), ly=rollTrackLayer();
  if(rollCache.view!==V||rollCache.layer!==ly)
    rollCache={ view:V, layer:ly, hits: ly==null?[] : V.notes.filter(n=>n.role==='dr'&&n.layer===ly).map(n=>n.head) };
  return rollCache.hits;
}
/* ═══ ВЫСОТНАЯ ДОРОЖКА: ЕЁ ВИД СТРОЯ И ЕЁ СЕГМЕНТЫ (S5.5; с T4c-2 — ОДНА группа) ═══
   ⛳ T4c-2: дорожка держит ОДИН вид строя — маршрут по строю (noteSource: роль + тембр + вид) рождает новую дорожку на смене лада,
   строя или «строй от», а вооружённая дорожка принимает только свой источник. Поэтому прежние ГРУППЫ ЛАДОВ (ось — одна группа,
   прочие — призраки, чип #rollScale для переключения) сняты: группа одна — вид дорожки и её сегменты этой роли. Сегменты ДРУГОГО вида
   (их не пишет ни один путь; recorder.viewAudit/viewWarn сообщают, если такое появится) не рисуются и не попадаемы — их ступени
   мерились бы чужой осью. Вид выбирается ПО ССЫЛКЕ (правило #25), первым сегментом дорожки.
   Мемо — на идентичность вида сегментов (он же мемо на songNotes), чтобы не пересобирать на кадр.
   ⚠️ T4: отбор `s.role!==role` на дорожке одной роли не отсекает ничего — он оставлен как СТРАЖ ОСИ. */
let segCache={view:null,layer:null,role:null,group:null};
function rollGroup(){
  const SV=songSegs(), ly=rollTrackLayer(), role=rollRole;
  if(segCache.view!==SV||segCache.layer!==ly||segCache.role!==role){
    let g=null;
    if(ly!=null&&role!=='dr') for(const s of SV.segs){
      if(s.layer!==ly||s.role!==role) continue;
      if(!g) g={sc:s.sc, sev:s.sev, segs:[]};
      if(s.sc===g.sc) g.segs.push(s);                        // ССЫЛКА, не имя; чужой вид — не на этой оси
    }
    segCache={view:SV, layer:ly, role, group:g};
  }
  return segCache.group;
}
/* Ряды высотной оси: ступени × регистры (с T3 это ось «Лад»; ось «Все» — высоты СТРОЯ × регистры, см. rollAxis ниже — и тот же
   закон дубля тоники наверху регистра). ⛳ СТУПЕНЕЙ — IVX(s).length, то есть iv.length+1: список
   ЗАМЫКАЕТСЯ ДУБЛЕМ ТОНИКИ сверху. Значит верхний ряд регистра и нижний ряд следующего — ОДНА И ТА ЖЕ
   ВЫСОТА, и это не ошибка: запись хранит СЫГРАННУЮ пару (с T4b3 ряд читается из пары «индекс в строе, регистр» — у дубля индекс корень+E
   в регистре r, у тоники следующего регистра индекс корня в регистре r+1), а сыграть можно и так, и так
   (rectSlotOf опирается на то же). Поэтому ролл кладёт ОБА ряда и НЕ переписывает ни одного события —
   дубль лишь помечен тусклее, чтобы человек понимал, почему две строки звучат одинаково. */
/* ═══ АККОРД КАК НОТЫ (слайс U1) — РЯДЫ НОТ СЕГМЕНТА ═══
   ⛳ НОТЫ — ТОЙ ЖЕ ФУНКЦИЕЙ, КОТОРОЙ ИХ ИГРАЕТ ДВИЖОК: scales.chordNotes (из неё же chordFreqs, а его зовут ENG.chOn/chSet). Своих
   правил построения аккорда у ролла нет — блок стоит там, где звучит нота.
   ⛳ НА РЯДУ ИЛИ МЕЖДУ РЯДАМИ. Ряд оси — ступень × регистр (ось «Лад») или высота строя × регистр (ось «Все», T3); его частота в
   регистре аккордов — scales.chordRowFreq у ступени (корень аккорда на этом ряду, той же ценой) и scales.chordPitchHz у приглушённого.
   Нота в пределах ROLL_ON_ROW_CENTS цента от ряда стоит НА нём (у дубля тоники — на тонике следующего регистра, а не на тусклом дубле);
   иначе — МЕЖДУ рядами, по логарифму частоты, то есть на своей НАСТОЯЩЕЙ высоте. У оси «Все» так бывает только у тонов ВНЕ СТРОЯ —
   чистых отношений (подвижный Натуральный, Партч вне ромба, Болен–Пирс: терция — корень × 5/4, а не высота строя); квинта пауэр-аккорда
   пентатоники (вне лада, но в строе) ложится на приглушённый ряд. У оси «Лад» — как прежде: между рядами и всё, что вне ступеней лада.
   Корень — ВСЕГДА на ряду своей записанной пары (ступень, регистр): так он стоял и до U1, и перенос/попадание по нему прежние.
   Каждый сегмент — в СВОЁМ замороженном ладу (правило #7); на оси рисуется группа своего лада, поэтому лад оси и лад сегмента одни.
   ⛳ РЯДЫ — ПО САМОЙ ДОРОЖКЕ (U2; в U1 был запас в ROLL_CH_EXTRA_REG регистров сверху «на всякий случай», и нота корня в верхнем
   регистре с 13-й над ним всё равно уходила за край). Сколько рядов, решает rollChordTotal — по НАСТОЯЩИМ нотам дорожки. */
const ROLL_ON_ROW_CENTS=1;
let chRowCache={ key:null, F:null };
function chRowFreqs(ax,sev,total){
  const key=ax; if(chRowCache.key===key && chRowCache.base===baseF(ax.sc) && chRowCache.tonic===viewKey(ax.sc) && chRowCache.F.length>=total) return chRowCache.F;   // TF1: keyed by the track view's key (the one door)   // частоты рядов зависят от оси (лад и «Все»/«Лад»), живой тоники и A4 (baseF), у fixedKey — от тоники-ключа
  const F=new Array(total);
  /* T3: ряд со ступенью — цена корня на нём (chordRowFreq, как прежде); приглушённый — та же высота строя в регистре аккордов
     (scales.chordPitchHz — та же функция высоты и доля роли). Ряды по-прежнему растут по высоте — двоичный поиск chRowOfFreq цел. */
  for(let r=0;r<total;r++){ const e=ax.ent(r), o=Math.floor(r/ax.rpp);
    F[r]= e.deg>=0 ? chordRowFreq(e.deg, o, ax.sc, sev) : chordPitchHz(e.j, o, ax.sc); }
  chRowCache={ key, base:baseF(ax.sc), tonic:viewKey(ax.sc), F };
  return F;
}
/* Ряд частоты f на оси F → { r, dev }. r — целый ряд (нота на нём) или дробный (между рядами, по логарифму частоты).
   ⛳ dev — ОТСТУПЛЕНИЕ В ЦЕНТАХ ОТ БЛИЖАЙШЕГО РЯДА ОСИ (U2; T3): у оси «Все» ряды — это ВСЕ высоты СТРОЯ сегмента в регистре аккордов,
   поэтому между рядами падает только высота ВНЕ СТРОЯ (тоны-отношения: подвижный Натуральный, Партч вне ромба, Болен–Пирс) — квинта
   пауэр-аккорда пентатоники ложится на приглушённый ряд, без «−100». У оси «Лад» ряды — ступени лада (прежний вид в точности), и там
   «между рядами» по-прежнему значит «вне ступеней лада». Мера — всегда сам строй/лад, ⛔ никогда не равномерная темперация. Знак:
   «+» — нота выше ряда, «−» — ниже. null — нота на ряду (в пределах ROLL_ON_ROW_CENTS) или вне таблицы. */
/* ⛳ T4b4-1: ДЛИНА ОСИ — АРГУМЕНТ (n = total), а не длина таблицы. Кэш chRowFreqs отдаёт таблицу ДЛИНОЙ НЕ МЕНЬШЕ total — какой её
   заполнил прежний вызывающий (рост оси в rollChordTotal просит больше), и у верхней кромки ответ зависел от ИСТОРИИ кэша: нота выше
   последнего ряда получала то «за краем» (r = n), то дробный ряд по лишним строкам таблицы. Теперь читаются только ряды [0, total) —
   их значения от истории не зависят (ряд r — функция оси, тоники и A4), — и ответ один при холодном и прогретом кэше (проба P.checkRowFix). */
function chRowOfFreq(f,F,dpo,total){
  const ct=(a,b)=>1200*Math.log2(a/b), n=Math.min(total,F.length);
  if(!(f>0)||!n) return { r:-1, dev:null };
  let lo=-1, hi=n-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(F[m]<=f*(1+1e-12)) lo=m; else hi=m-1; }   // последний ряд, чья частота ≤ f (у дубля тоники и тоники следующего регистра частота одна — берётся тоника регистра)
  const skipDup=r=> (r%dpo===dpo-1 && r+1<n && Math.abs(ct(F[r+1],F[r]))<1e-6) ? r+1 : r;
  if(lo>=0 && Math.abs(ct(f,F[lo]))<ROLL_ON_ROW_CENTS) return { r:skipDup(lo), dev:null };
  if(lo+1<n && Math.abs(ct(f,F[lo+1]))<ROLL_ON_ROW_CENTS) return { r:skipDup(lo+1), dev:null };
  if(lo<0) return { r: F[0]>0 ? Math.log(f/F[0])/Math.log(F[1]/F[0]) : -1, dev:null };   // ниже первого ряда (за краем оси)
  if(lo+1>=n) return { r:n, dev:null };                                                   // выше последнего — за краем
  const dl=ct(f,F[lo]), du=ct(f,F[lo+1]);                                                 // dl > 0, du < 0
  return { r: lo + Math.log(f/F[lo])/Math.log(F[lo+1]/F[lo]), dev: Math.abs(du)<dl ? du : dl };   // между рядами — по высоте; отступление — от БЛИЖНЕЙ ступени
}
/* Ноты сегмента на ОСИ ax (T3: rollAxis — ряды лада или строя; длина оси total) → [{ r, dev }] в порядке scales.chordNotes (номер ноты = индекс: его хранит
   выделение одной ноты, U2). У баса — одна нота, корень. У аккорда — каждая нота на ряду или между рядами.
   ⛳ КОРЕНЬ — НА РЯДУ СВОЕЙ ЗАПИСАННОЙ ПАРЫ (с T4b3 — индекс в строе и регистр; у нетипизированного аккорда — ступень и регистр до T6), и узнаётся он ПО ЧАСТОТЕ (совпадает с ценой корня chordRowFreq), а
   не по номеру: у однонотного аккорда (распад, U2) нота 0 — это, например, терция, а корня среди нот нет вовсе. Пара важна у дубля
   тоники: нота, записанная на тусклом верхнем ряду регистра, остаётся на нём (chRowOfFreq выбрал бы тонику следующего регистра).
   ОДНА функция для рисунка, попадания, призрака перетаскивания и размера оси (правило #9). */
/* ⛳ T4b3: РЯД И НОТЫ СЕГМЕНТА — ИЗ ХРАНИМОЙ ПАРЫ (индекс в строе a.ti, регистр), а не из ступени лада. Пара — тождество ноты (как и
   прежде пара ступень × регистр): дубль тоники регистра r (индекс корень+E, регистр r) и корень регистра r+1 (индекс корня, регистр r+1)
   ложатся каждый на СВОЙ ряд — ось переводит индекс в ряд, не сравнивая высот (ax.rowOfTi).
   ⛳ АККОРД ЧИТАЕТ ИНДЕКС ТАМ ЖЕ, ГДЕ ИЗ НЕГО ЗВУЧИТ — одни ворота scales.chordReadsTi (их же спрашивает цена chordNotesAt): у
   типизированного аккорда ряд корня, его ноты (chordNotesAt — то, чем играет ENG) и частота ряда корня (chordRowFreqAt — по ней корень
   узнаётся среди нот) — из индекса. ⛔ Нетипизированный аккорд (стопка терций, пауэр-аккорд, округлённые отношения — их строит ЛАД по
   ступени) — целиком по ступени до T6.
   ⛳ T4c-1: СТУПЕНИ СЕГМЕНТ БОЛЬШЕ НЕ НЕСЁТ (recorder.songSegs) — ряд и ноты ТОЛЬКО из индекса; у аккорда без ветки по индексу (правила
   palette/none) chordNotesAt сам берёт место корня обратной выборкой. Индекса нет или его нет на оси — ряда нет (NaN: блок не рисуется,
   попадания нет); ниже — прежний текст о запасном пути, теперь снятом.
   Запасной путь по ступени — у сегмента без индекса (после T4a их нет) и у индекса, которого нет на оси (у оси «Лад» — высота вне лада:
   с T5 — дробный ряд между ступенями, ax.placeTi); снят в T4c. Новых выделений памяти нет: ряд — арифметика оси, списки нот — те же, что у пути ступени. */
/* ⛳ T5: у оси «Лад» нота ВНЕ лада — дробный ряд между ступенями (ax.placeTi) с отступлением dev; корень аккорда вне лада несёт тот же
   знак, что тон вне ряда. У оси «Все» каждая высота строя — свой целый ряд, dev корня — null, как прежде. */
function rollSegRoot(s,ax){ return ax.placeTi(s.ti,s.oct).r; }   // T4c-1: только индекс; T5: вне лада у оси «Лад» — между рядами
function rollSegNotes(s,ax,total){
  const P0=ax.placeTi(s.ti,s.oct), r0=P0.r;
  if(s.role!=='ch') return [{ r:r0, dev:P0.dev }];
  const N=chordNotesAt(s.ti,s.oct,s.sc,s.sev,s.ty);   // T4c-1: ноты — то, чем играет ENG (evHz), из индекса корня
  const F=chRowFreqs(ax,s.sev,total), dpo=ax.rpp;
  const fr=chordRowFreqAt(s.ti,s.oct,s.sc,s.sev);
  return N.map(n=> Math.abs(1200*Math.log2(n.f/fr))<ROLL_ON_ROW_CENTS ? { r:r0, dev:P0.dev } : chRowOfFreq(n.f,F,dpo,total));
}
const rollSegRows=(s,ax,total)=>rollSegNotes(s,ax,total).map(x=>x.r);
/* ═══ S5: КРИВАЯ БЕНДА НОТЫ ТЕРМЕНВОКСА — НА ЕЁ НАСТОЯЩЕЙ ВЫСОТЕ, ПО ТОЙ ЖЕ ОСИ, ЧТО РЯДЫ (правило #9) ═══
   Точка кривой — центы c над ценой АТАКИ ноты (leadFreqTi пары сегмента — та же цена, от которой бенд играет переигровка: ENG.leadOn →
   scheduleBend). Её место на оси — ДРОБНЫЙ ряд по логарифму частоты между соседними рядами оси (тот же закон, что у тона аккорда вне
   ряда и у ноты вне лада в «Лад» — ax.placeTi): частоты рядов — цена каждого целого ряда оси в регистре соло (ax.pitchOf → leadFreqTi),
   и в «Все», и в «Лад»; уход кривой вне лада ложится между рядами. Кривая ПРИВЯЗАНА к ряду самого блока: r = ряд блока + (ряд частоты
   точки − ряд частоты атаки), поэтому c = 0 стоит ровно на блоке — и у ноты на тусклом дубле тоники (ряд блока — дубль, а по частоте
   это тоника следующего регистра; там же — честный предел: у самого дубля шаг кривой на ряд выше читается от тоники следующего регистра).
   За краями оси — продолжение по крайнему шагу (рисунок обрежется клипом). → [{t, r}] (t — доля песни) или null (не терменвокс). */
let ldRowCache={ key:null, F:null };
function ldRowFreqs(ax,total){
  if(ldRowCache.key===ax && ldRowCache.base===baseF(ax.sc) && ldRowCache.tonic===viewKey(ax.sc) && ldRowCache.F.length>=total) return ldRowCache.F;   // TF1: the track view's key   // те же ключи, что у chRowFreqs: ось, A4/тоника (baseF), тоника-ключ fixedKey
  const F=new Array(total);
  for(let r=0;r<total;r++){ const p=ax.pitchOf(r); F[r]= p ? leadFreqTi(p.ti,p.oct,ax.sc) : NaN; }
  ldRowCache={ key:ax, base:baseF(ax.sc), tonic:viewKey(ax.sc), F };
  return F;
}
function rowOfHz(f,F,total){   // дробный ряд частоты f на оси F (ряды по возрастанию; у дубля тоники частота повторяется — берётся ПОСЛЕДНИЙ ряд ≤ f)
  const n=Math.min(total,F.length); if(!(f>0)||n<2) return NaN;
  let lo=-1, hi=n-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(F[m]<=f*(1+1e-12)) lo=m; else hi=m-1; }
  if(lo<0) return Math.log(f/F[0])/Math.log(F[1]/F[0]);                        // ниже первого ряда
  if(lo>=n-1) return (n-1)+Math.log(f/F[n-1])/Math.log(F[n-1]/F[n-2]);          // выше последнего
  return lo+Math.log(f/F[lo])/Math.log(F[lo+1]/F[lo]);
}
const bendMemo=new WeakMap();   // сегмент → { ax, base, tonic, total, pts }: сегменты пересобираются со songSegs, так что старые уходят сами
function rollBendPts(s,ax,total){
  const h=s.note&&s.note.head, B=h&&h.a&&h.a.bend;
  if(s.role!=='ld'||!s.first||!B||!B.length) return null;
  const m=bendMemo.get(s);
  if(m && m.ax===ax && m.base===baseF(ax.sc) && m.tonic===viewKey(ax.sc) && m.total===total && m.B===B) return m.pts;
  const pts=bendRowsOf(s,B,ax,total);
  if(pts) pts.path=bendPathOf(s,B,ax,total);   // BEND-CURVE: what is drawn (steps and glides), beside the points (the handles)
  bendMemo.set(s,{ ax, base:baseF(ax.sc), tonic:viewKey(ax.sc), total, B, pts });
  return pts;
}
/* any curve B of segment s → rows (OWN2: the ghost of a dragged point uses the same mapping as the drawn curve) */
function bendRowsOf(s,B,ax,total){
  const F=ldRowFreqs(ax,total), f0=leadFreqTi(s.ti,s.oct,s.sc), r0=rollSegRoot(s,ax), rf0=rowOfHz(f0,F,total);
  return (f0>0 && Number.isFinite(rf0) && Number.isFinite(r0)) ? B.map(p=>({ t:s.start+p.dt, r:r0+rowOfHz(f0*Math.pow(2,p.c/1200),F,total)-rf0 })) : null;
}
/* BEND-CURVE: the drawn path of curve B — {t, r, g}: a step point (g false: hold, then up/down to it) or a sample of a glide (g true:
   straight to it), the glide sampled by the replay's own law (config.bendSeg) */
const BEND_DRAW_N=24;
function bendPathOf(s,B,ax,total){
  const F=ldRowFreqs(ax,total), f0=leadFreqTi(s.ti,s.oct,s.sc), r0=rollSegRoot(s,ax), rf0=rowOfHz(f0,F,total);
  if(!(f0>0 && Number.isFinite(rf0) && Number.isFinite(r0))) return null;
  const R=c=>r0+rowOfHz(f0*Math.pow(2,c/1200),F,total)-rf0, out=[];
  B.forEach((q,j)=>{ const p=B[j-1];
    if(p && q.sh==='s' && q.dt>p.dt) for(let n=1;n<=BEND_DRAW_N;n++){ const u=n/BEND_DRAW_N; out.push({ t:s.start+p.dt+(q.dt-p.dt)*u, r:R(bendSeg(p,q,u)), g:true }); }
    else out.push({ t:s.start+q.dt, r:R(q.c), g:false }); });
  return out;
}
/* stroke a bend path from (x, the attack row) to the block's end x2 */
function bendStroke(V,P,x,x2,y0,cy){
  ctx.beginPath(); let px=x, py=y0; ctx.moveTo(px,py);   // до первой точки — ступень атаки (0 центов)
  for(let i=0;i<P.length;i++){ const nx=laneBeatX(V,P[i].t), ny=cy(P[i].r);
    if(P[i].g){ ctx.lineTo(nx,ny); px=nx; py=ny; continue; }
    if(nx-px<0.5 && i<P.length-1 && !P[i+1].g){ py=ny; continue; }   // слить вершины в полпикселя — держим последнее значение
    ctx.lineTo(nx,py); ctx.lineTo(nx,ny); px=nx; py=ny; }
  ctx.lineTo(x2,py); ctx.stroke();
}
function hzOfRow(q,F,total){   // the inverse of rowOfHz: a fractional row → Hz on the axis F
  const n=Math.min(total,F.length); if(n<2) return NaN;
  if(q<0) return F[0]*Math.pow(F[1]/F[0],q);
  if(q>=n-1) return F[n-1]*Math.pow(F[n-1]/F[n-2],q-(n-1));
  const lo=Math.floor(q); return F[lo]*Math.pow(F[lo+1]/F[lo],q-lo);
}
/* OWN2: cents (from the attack pitch) and beats (from the note start) of a screen point over the selected theremin note — the same
   snapshot the handles were drawn from (rule #9); null when no theremin note is selected. */
/* probe only (the runner's real-input check): the drawn bend handles of the selected theremin note */
/* BEND-CURVE: the lane value (0..1) at screen y, from the drawn snapshot (rule #9); null without a lane */
export const rollAutValAt=py=>{ const V=rollView; return V&&V.aut ? autVAt(V,py) : null; };
export const rollBendProbe=()=>{ const b=rollView&&rollView.bend; return b ? b.pts.map(q=>({ i:q.i, x:q.x, y:q.y, dt:q.dt, c:q.c })) : null; };
export function rollBendAt(px,py){
  const V=rollView, b=V&&V.bend; if(!b) return null;
  const rp=(V.row0||0)+V.rows-1-((py-V.gy0)/V.rowH-0.5), hz=hzOfRow(rp-b.r0+b.rf0,b.F,V.total);
  return { c: hz>0 ? 1200*Math.log2(hz/b.f0) : 0, dt: laneBeatAt(V,px)-b.start, ev:b.ev, end:b.end, start:b.start };
}
const ROLL_BEND_MIN_W=6;
/* OWN2: the points of the selected theremin note's curve as handles (the selected one larger, outlined), their snapshot V.bend for
   rollHit / rollBendAt, and — while a point is dragged — the ghost curve (dashed) with its value beside the finger: cents and the beat
   inside the note. The ghost clamps like the edit (first point at 0, between neighbours, before the end). */
function rollBendHandles(V,s,AX,BP,x,x2,cy){
  const B=s.note.head.a.bend, F=ldRowFreqs(AX,V.total), f0=leadFreqTi(s.ti,s.oct,s.sc), r0=rollSegRoot(s,AX), rf0=rowOfHz(f0,F,V.total);
  const R=c=>r0+rowOfHz(f0*Math.pow(2,c/1200),F,V.total)-rf0;
  V.bend={ ev:s.ev, start:s.start, end:s.end, F, f0, r0, rf0, pts:BP.map((q,i)=>({ i, x:laneBeatX(V,q.t), y:cy(q.r), dt:B[i].dt, c:B[i].c })), mids:[] };
  /* BEND-CURVE: a middle handle on every glide of the selected note — drag it up/down to curve the glide */
  B.forEach((q,j)=>{ const p=B[j-1]; if(!p||q.sh!=='s'||!(q.dt>p.dt)) return;
    V.bend.mids.push({ i:j, x:laneBeatX(V,s.start+(p.dt+q.dt)/2), y:cy(R(bendSeg(p,q,0.5))) }); });
  const D= rollBendDrag && rollBendDrag.ev===s.ev ? rollBendDrag : null;
  if(D){ const len= s.end==null ? Infinity : s.end-s.start, i=D.i;
    let B2;
    if(D.mid){ B2=B.slice(); B2[i]={ ...B[i], sh:'s', k:D.k }; }                     // a curved glide (the edit: recorder.editBendShape)
    else { const E=bendEdited(B,'move',i,D.dt,D.c,len); B2=E ? E.B : B; }        // the same pure edit as the release (recorder.bendEdited)
    const G=bendPathOf(s,B2,AX,V.total);
    if(G){ ctx.save(); ctx.setLineDash([4,3]); ctx.strokeStyle='#ffd479'; ctx.lineWidth=1.5;
      bendStroke(V,G,x,x2,cy(rollSegRoot(s,AX)),cy); ctx.restore();
      const q=B2[i], p=B2[i-1], mid=D.mid&&p;
      const gx=laneBeatX(V,s.start+(mid ? (p.dt+q.dt)/2 : q.dt)), gy=cy(R(mid ? bendSeg(p,q,0.5) : q.c));
      const txt= mid ? icon('curve')+' '+(D.k>0?'+':'')+(Math.round(D.k*100)/100) : (q.c>0?'+':'')+q.c+'¢ · '+(Math.round(q.dt*100)/100);
      ctx.font='11px system-ui'; ctx.textBaseline='middle'; const tw=ctx.measureText(txt).width+10;
      ctx.fillStyle='rgba(8,10,16,.86)'; ctx.fillRect(gx+10,gy-8,tw,16); ctx.strokeStyle='#ffd479'; ctx.lineWidth=1; ctx.strokeRect(gx+10.5,gy-7.5,tw-1,15);
      ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText(txt,gx+15,gy+.5); ctx.textBaseline='alphabetic'; } }
  for(const m of V.bend.mids){ const sel=rollBendSel===m.i;   // a hollow diamond: a shape handle, not a point
    ctx.beginPath(); ctx.moveTo(m.x,m.y-4.5); ctx.lineTo(m.x+4.5,m.y); ctx.lineTo(m.x,m.y+4.5); ctx.lineTo(m.x-4.5,m.y); ctx.closePath();
    ctx.fillStyle='rgba(20,20,32,.85)'; ctx.fill(); ctx.strokeStyle= sel ? '#ffd479' : '#fff'; ctx.lineWidth=1.4; ctx.stroke(); }
  for(const q of V.bend.pts){ const sel=rollBendSel===q.i;
    ctx.fillStyle= sel ? '#ffd479' : '#fff'; ctx.beginPath(); ctx.arc(q.x,q.y,sel?5:3.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(20,20,32,.9)'; ctx.lineWidth=1.2; ctx.stroke(); }
}   // уже — кривую не рисуем: на блоке в несколько пикселей она была бы просто штрихом поверх цвета
/* T4b3: СЕГМЕНТ-ПРИЗРАК переноса аккорда на ряд pit — ТА ЖЕ пара, что окажется в песне после правки: индекс и регистр ряда (T4c-1; с T5 —
   и приглушённого) и тип, который поставит правка (T5, вариант (а): recorder.chordMoveTy). ⚠️ Без
   индекса призрак прочёл бы ПРЕЖНИЙ индекс сегмента и стоял бы на старом месте — ошибка ПРОИЗВОДНОГО пути (урок T4b2). */
const rollGhostSeg=(s,pit)=>{ const ty=chordMoveTy(s,pit.ti,pit.oct); return ty===undefined ? { ...s, ti:pit.ti, oct:pit.oct } : { ...s, ti:pit.ti, oct:pit.oct, ty:ty||undefined }; };   // T5 (а): целый нетипизированный аккорд на высоту вне лада — с формой (ТА ЖЕ функция, что у правки); null — правка откажет, призрак пуст   // ⛳ T4c-1: ряд оси отдаёт сам индекс (pitchOf → {ti, oct}) — ровно то, что поставит коммит правки
/* Какую ноту сегмента берёт палец на дробном ряду rp: ближайшую (первая при равенстве) — { ni, dr }. Одна функция на попадание и пробу. */
function rollSegPick(ns,rp){ let dr=Infinity, ni=0; ns.forEach((x,i)=>{ const d=Math.abs(x.r-rp); if(d<dr){ dr=d; ni=i; } }); return { ni, dr }; }
/* ⛳ СКОЛЬКО РЯДОВ У ОСИ АККОРДОВ (U2) — ПО САМОЙ ДОРОЖКЕ, чтобы ни одна нота не упала за край (правило #9: число в снимке, его
   читают и рисунок, и попадание, и прокрутка).
     • НИЗ — ряд 0, и ниже ни одна нота аккорда не звучит ПО ПОСТРОЕНИЮ: корень стоит на ряду своей пары (регистр ≥ 0), а каждый тип
       всех восьми наборов начинается с корня и идёт вверх (шаг 0 / отношение 1, остальное больше), нетипизированный аккорд — тоже от
       корня; однонотный тип (U2) — интервал одной из таких нот, то есть тоже ≥ корня. Самая низкая нота дорожки — её самый низкий корень.
     • ВЕРХ — самая высокая звучащая нота дорожки (по scales.chordNotes — тем, чем играет движок), и ещё ЗАПАС ПЕРЕТАСКИВАНИЯ: самый
       широкий аккорд дорожки, поставленный на самый верхний ряд корня (base−1), — чтобы и призрак не уходил за край.
     • Ось не короче обычной (REG_N регистров): в ней лежат все ряды, на которые можно поставить корень (вставка, перенос).
   Мемо — на идентичность сегментов показанной группы (тот же мемо songSegs → rollGroup) + лад + тоника + A4: от тоники и A4 зависят
   частоты рядов и нот (у fixedKey — ключ), а от них — дробные ряды. Таблица частот растёт, пока самая высокая нота в неё не влезет. */
let rollTopCache={ segs:null };
function rollChordTotal(G,ax){
  const base=REG_N*ax.rpp; if(!G||!G.segs.length) return base;
  const c=rollTopCache; if(c.segs===G.segs && c.ax===ax && c.base===baseF(ax.sc) && c.tonic===viewKey(ax.sc)) return c.total;
  const total=chordTotalWith(G,ax,rollSegNotes,rollSegRoot);
  rollTopCache={ segs:G.segs, ax, base:baseF(ax.sc), tonic:viewKey(ax.sc), total };
  return total;
}
/* Сам расчёт, без мемо: notes/root — функции нот и ряда корня сегмента (T4b3: путь индекса; проба подставляет прежний путь ступени). */
function chordTotalWith(G,ax,notes,root){
  const base=REG_N*ax.rpp; if(!G||!G.segs.length) return base;
  const dpo=ax.rpp;
  let n=base+4*dpo, top=base-1, span=0;
  for(let out=true; out && n<=base+64*dpo; ){
    out=false; top=base-1; span=0;
    for(const s of G.segs){
      const r0=root(s,ax);
      for(const x of notes(s,ax,n)){ if(x.r>=n-0.5) out=true; if(x.r>top) top=x.r; if(x.r-r0>span) span=x.r-r0; }
    }
    if(out) n+=4*dpo;
  }
  return Math.max(base, Math.ceil(top)+1, Math.ceil(base-1+span)+1);
}
/* ⛳ U2: ОТСТУПЛЕНИЕ В ЦЕНТАХ НА БЛОКЕ — первое появление мысли «отступление в центах» в редакторе. Опора — ВСЕГДА ближайший ряд
   оси (chRowOfFreq): с T3 у оси «Все» это высоты СТРОЯ (подпись стоит только у тонов вне строя — тонов-отношений), у оси «Лад» —
   ступени лада, как прежде. ⛔ Никогда не равномерная темперация: у Натурального, Партча, Болена–Пирса «правильная» высота — их
   собственные высоты. Подпись — целые центы со знаком («+14», «−22»; минус — настоящий U+2212). Влезает в блок — пишется в нём;
   не влезает — только у ВЫДЕЛЕННОГО, справа от блока на тёмной подложке (иначе узкие блоки обрастали бы подписями поверх соседей). */
function rollDevLbl(x,y,w,h,dev,sel){
  const txt=(dev>0?'+':'−')+Math.round(Math.abs(dev));
  ctx.font = h>=12 ? '10px system-ui' : '9px system-ui';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const tw=ctx.measureText(txt).width;
  if(w>=tw+6 && h>=9){ ctx.fillStyle= sel ? '#0b0b14' : 'rgba(255,255,255,.88)'; ctx.fillText(txt, x+3, y+h/2); return; }
  if(!sel) return;
  ctx.fillStyle='rgba(11,11,20,.82)'; ctx.fillRect(x+w+3, y+h/2-7, tw+6, 14);
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillText(txt, x+w+6, y+h/2);
}
/* ═══ ОСЬ ВЫСОТ РЕДАКТОРА — ОДИН ОБЪЕКТ (слайс T3 универсальной модели строя) ═══
   ⛳ РЯДЫ — ИЗ СТРОЯ. Строй даёт все высоты, лад их подсвечивает (HANDOFF, «УНИВЕРСАЛЬНАЯ МОДЕЛЬ СТРОЯ»). Ось «Все» (rollRowsAll,
   умолчание): в каждом регистре — КАЖДАЯ высота строя над корнем лада, j = 0..размер строя (верхняя — дубль тоники следующего регистра);
   высоты лада — ЯРКИЕ ряды (у них есть ступень), прочие — ПРИГЛУШЁННЫЕ (ступени нет). Ось «Лад» — прежняя компактная ось РОВНО как была:
   ряд = ступень лада (IVX: n ступеней + дубль тоники). У лада, который и есть весь строй (хроматика, Партч, темперации, Болен–Пирс,
   Карлос, 19/31-TET, гамелан целиком, сетка шрути), обе оси совпадают — приглушённых рядов нет, кнопки нет.
   ⛳ ОДИН ОБЪЕКТ на (вид лада, «Все»/«Лад»), ЗАПОМНЕННЫЙ (WeakMap по виду — виды T2 стабильны): его кладёт в снимок rollView отрисовка,
   и его же читают попадание, призрак перетаскивания, частоты рядов аккордов, высота оси, колонка подписей и ui (правило #9 — один
   снимок): кто бы ни спросил «какой это ряд», ответ один.
   Форма: { sc, all, hasDim, rpp — рядов на регистр, ents[i] — { deg (ступень лада или −1), j (сдвиг в строе, у оси «Все»), bright, dup },
            rowOf(deg,oct) → ряд, rowOfTi(ti,oct) → ряд или undefined (T4b3), ent(r), pitchOf(r) → {ti,oct} (T4c-1; прежде {deg,oct}; с T5 —
            и у приглушённого ряда), placeTi(ti,oct) → {r, dev} (T5: место ноты на оси, у оси «Лад» — и вне лада, между рядами),
            snap(r) → ближайший ЯРКИЙ ряд (с U5 — только прокрутка через «Все/Лад») }.
   ⛳ T4b3: РЯД ИЗ ИНДЕКСА В СТРОЕ (rowOfTi) — рядом с рядом из ступени. Индекс ti (a.ti) — номер высоты строя вида; КЛЮЧ фиксированных
   строёв в нём не лежит (тоника живая) — и в оси его нет: ряды отсчитаны от корня лада, имена несёт живая тоника. Перевод:
     1) сдвиг над корнем лада j = ti − root и регистр R = oct; вне [0, E] (E — высот строя в периоде) сдвиг приводится целым периодом, а
        перенос уходит в регистр — тем же законом, что расщепление мелодии в цене (scales.melodySplit): j = E — ДУБЛЬ тоники наверху
        регистра R (так его пишут и мелодия, и аккорд: ступень n → индекс корень+E), j = 0 — корень регистра R;
     2) ряд внутри регистра: у оси «Все» — сам j (ряд оси И ЕСТЬ высота строя: равный строй — шаг, таблица — номер высоты в таблице, у
        Баранга отсчёт от его корня 1); у оси «Лад» — номер ступени, чья высота j (ступени лада — яркие ряды; j вне лада — undefined: с T5
        такую ноту кладёт между рядами placeTi);
     3) ряд = R·rpp + ряд внутри регистра — та же формула, что у rowOf.
   Для ступеней 0..n (их только и пишут пути записи) rowOfTi(tuningIndexOf(d), o) === rowOf(d, o) в обеих осях — проба P.checkRows.
   ⛳ T5: ПРИГЛУШЁННЫЙ РЯД — ТАКАЯ ЖЕ ЦЕЛЬ ПРАВКИ, КАК ЯРКИЙ. pitchOf расшифровывает любой целый ряд оси в {ti, oct} (у оси «Все» —
   корень лада + сдвиг ряда j, яркий он или нет), и перенос ноты баса, одной ноты аккорда и целого аккорда кладёт высоту строя вне лада.
   Прилипание к яркому (snap) осталось только у прокрутки через «Все/Лад» (с U5 и вставка — на любой ряд). У оси «Лад» все ряды яркие, snap —
   тождество, rowOf/pitchOf — ровно прежние rollRowOf/rollRowPitch.
   ⛳ T5: НОТА ВНЕ ЛАДА НА ОСИ «ЛАД» (там приглушённых рядов нет) — placeTi кладёт её МЕЖДУ соседними ступенями лада, на её настоящей
   высоте (по логарифму частоты — тот же закон, что у тона-отношения между рядами, chRowOfFreq), с отступлением dev в центах от
   БЛИЖАЙШЕЙ ступени. Рисунок показывает её тем же знаком, что тон вне ряда (светлее, контур цвета роли, «+100»), — никогда не молча
   пропадает; попадание её ловит (дробный ряд). Цена соседей — leadFreqTi того же вида: отношение частот у мелодии, баса и аккорда одно. */
const tunSize=T=>T.equal!=null ? T.equal : T.cents.length;
const tunOf=sc=>sc&&tuningOf(sc);   // F1: одна функция «строй вида» (scales.tuningOf)
const axisHasDim=sc=>{ const T=tunOf(sc); return !!(T&&sc.sel&&sc.sel.length<tunSize(T)); };
const AXIS_CACHE=new WeakMap();
function rollAxis(sc, all=rollRowsAll){
  const useAll=!!all && axisHasDim(sc), key=useAll?'all':'mode';
  let m=AXIS_CACHE.get(sc); if(!m){ m={}; AXIS_CACHE.set(sc,m); }
  if(m[key]) return m[key];
  const n=sc.iv.length, ents=[];
  if(!useAll) for(let d=0; d<=n; d++) ents.push({ deg:d, j:null, bright:true, dup:d===n });
  else{
    const T=tunOf(sc), E=tunSize(T), dOf=new Map();
    for(let d=0; d<=n; d++) dOf.set((d<n ? sc.sel[d] : sc.root+E)-sc.root, d);   // сдвиг ступени в строе над корнем лада (дубль — ровно E)
    for(let j=0; j<=E; j++){ const d=dOf.has(j)?dOf.get(j):-1; ents.push({ deg:d, j, bright:d>=0, dup:j===E }); }
  }
  const rpp=ents.length, degRow=[]; ents.forEach((e,i)=>{ if(e.deg>=0) degRow[e.deg]=i; });
  const at=r=>ents[((r%rpp)+rpp)%rpp];
  /* T4b3: сдвиг в строе над корнем (0..E) → ряд внутри регистра (см. шапку). Строится один раз на ось; rowOfTi — только арифметика. */
  const TT=tunOf(sc), E=TT&&sc.sel ? tunSize(TT) : 0, root=sc.root|0, jRow=[];
  if(E){ if(useAll) for(let j=0;j<=E;j++) jRow[j]=j;
         else for(let d=0; d<=n; d++) jRow[(d<n ? sc.sel[d] : root+E)-root]=d; }
  const ax={ sc, all:useAll, hasDim:axisHasDim(sc), rpp, ents,   // placeTi читает ax.rowOfTi — объект называет себя сам
    rowOf:(deg,oct)=>(oct|0)*rpp + (degRow[deg|0] ?? (deg|0)),
    rowOfTi:(ti,oct)=>{ if(!E || typeof ti!=='number') return undefined;
      let j=ti-root, R=oct|0;
      if(j<0 || j>E){ const c = j>E ? Math.ceil((j-E)/E) : Math.floor(j/E); j-=E*c; R+=c; }
      const i=jRow[j]; return i===undefined ? undefined : R*rpp+i; },
    ent:at,
    /* ⛳ T4c-1: РЯД → ВЫСОТА ИНДЕКСОМ В СТРОЕ { ti, oct } (не ступенью): ti = корень лада + сдвиг ряда в строе (j оси «Все»; у оси «Лад» —
       сдвиг ступени, дубль — E). Приглушённый ряд с T5 — тоже высота (без прилипания); правка и вставка
       пишут эту пару как есть (recorder.slotPt, editInsert*) — ступени в событии нет с T4c-2. */
    pitchOf:r=>{ if(!E || !Number.isInteger(r)) return null; const e=at(r);   // T5: и приглушённый ряд (у него j оси «Все»); дробный ряд (нота вне лада на оси «Лад») — не цель
      const j= e.j!=null ? e.j : (e.deg<n ? sc.sel[e.deg] : root+E)-root;
      return { ti:root+j, oct:Math.floor(r/rpp) }; },
    placeTi:(ti,oct)=>{ const r0=ax.rowOfTi(ti,oct); if(r0!==undefined) return { r:r0, dev:null };
      if(!E || typeof ti!=='number') return { r:NaN, dev:null };
      let j=ti-root, R=oct|0;
      if(j<0 || j>E){ const c = j>E ? Math.ceil((j-E)/E) : Math.floor(j/E); j-=E*c; R+=c; }
      let lo=-1, hi=-1; for(let q=0;q<=E;q++){ if(jRow[q]===undefined) continue; if(q<j) lo=q; else if(q>j){ hi=q; break; } }   // соседние ступени лада: сдвиг 0 — корень, E — дубль, j строго между
      if(lo<0 || hi<0) return { r:NaN, dev:null };
      const f=leadFreqTi(root+j,R,sc), fl=leadFreqTi(root+lo,R,sc), fh=leadFreqTi(root+hi,R,sc), rl=R*rpp+jRow[lo];
      const dl=1200*Math.log2(f/fl), du=1200*Math.log2(f/fh);   // dl > 0, du < 0
      return { r: rl + (jRow[hi]-jRow[lo])*Math.log(f/fl)/Math.log(fh/fl), dev: Math.abs(du)<dl ? du : dl }; },
    snap:r=>{ if(at(r).bright) return r;
      for(let k=1;k<rpp;k++){ if(r-k>=0 && at(r-k).bright) return r-k; if(at(r+k).bright) return r+k; }   // ничья — к НИЖНЕМУ (детерминированно)
      return r; } };
  m[key]=ax; return ax;
}
/* ⛳ ИМЯ РЯДА — ОДНА ФУНКЦИЯ НАЗВАНИЙ (правило #26). Ряд со ступенью лада называет noteLbl — ровно как прежде (у оси «Лад» ничего не
   изменилось). Приглушённый ряд — высота строя без ступени лада — называется по СХЕМЕ ИМЁН СТРОЯ (F3: scales.namingOf(sc).pitch —
   данные строя; до F3 — ветки по equal/period/swaraNames): notes12/notes24 — имена нот / четвертитонов от тоники (stepName — той же
   функцией, что ступени этих ладов); list — полное имя из списка строя («свара · шрути» различает комма-пары; раги своими ступенями
   называют только свару); иначе — НОМЕР высоты в строе в скобках («(4)» — четвёртая высота пелога: так на Яве и называют звуки
   пелога), чтобы не спутать с порядковыми номерами ступеней лада. Номер регистра — у первого ряда регистра.
   ⚠️ notes12 у 12-нотных ТАБЛИЦ (Пифагор, Натуральные, мезотон, велл-темперации) называет приглушённый ряд именем ноты, а до F3 — «(k)»;
   сегодня недостижимо: все их лады — весь строй, приглушённых рядов у них нет. */
function tunPitchLbl(sc,j){
  const T=tunOf(sc), N=tunSize(T), k=sc.root+j, p=namingOf(sc).pitch;
  if(p==='notes12'||p==='notes24') return stepName(j,sc);
  if(p==='list'){ const nm=listName(sc,k,true); if(nm) return nm; }
  return '('+(((k%N)+N)%N+1)+')';
}
function axisLbl(ax,r){
  const e=ax.ent(r), base = e.deg>=0 ? noteLbl(e.deg,ax.sc) : tunPitchLbl(ax.sc,e.j);
  return (((r%ax.rpp)+ax.rpp)%ax.rpp)===0 ? base+' '+(OCT_ROMAN[(r/ax.rpp)|0]||'') : base;
}
/* ⛳ ШИРИНА КОЛОНКИ ПОДПИСЕЙ — ИЗМЕРЯЕТСЯ, А НЕ УГАДЫВАЕТСЯ (S5.6, починка обрезки слева).
   ⚠️ ПРИЧИНА ОБРЕЗКИ БЫЛА ИМЕННО ЗДЕСЬ: колонка была КОНСТАНТОЙ (58px), а подписи бывают любой длины —
   «Са · Чхандовати» у 22-шрути в разы шире, чем «Т» или «12». Подпись рисуется ВПРАВО-выключенной от
   края сетки, поэтому всё, что не влезло, уезжало за левый край экрана.
   ⛳ ПОЧЕМУ ЭТО ЧИНИТ И ПОПАДАНИЕ ТОЖЕ: ширина идёт в x0 СНИМКА, а из снимка считают и рисование, и
   laneBeatAt (правило #9). Подвинулась колонка — подвинулась сетка, и палец берёт ту же ноту, что видит.
   ⛳ ПОЧЕМУ ДЕРЖИТ ЛЮБУЮ ПОДПИСЬ: (1) меряем РЕАЛЬНЫЕ строки лада (все ступени периода + самый широкий
   суффикс регистра), а не образец; (2) потолок 42% холста — даже абсурдная подпись не съест сетку;
   (3) на потолке текст КЛИПУЕТСЯ по колонке, поэтому «не влезло» выглядит как обрезанный хвост в своей
   колонке, а не как буквы поверх нот.
   Кэш — на (лад, тоника): имена нот зависят от ЖИВОЙ тоники, поэтому она в ключе. */
let lblCache={ax:null,tonic:-1,w:ROLL_LBL_W};
function rollGutterW(ax){
  if(lblCache.ax===ax&&lblCache.tonic===viewKey(ax.sc)) return lblCache.w;
  const prev=ctx.font;
  ctx.font='11px system-ui';
  let w=0;
  for(let r=0;r<ax.rpp;r++) w=Math.max(w, ctx.measureText(axisLbl(ax,r)+(r===0?'V':'')).width);   // T3: подписи ОСИ (и приглушённые); у ряда 0 axisLbl уже дописал « I», 'V' — запас до « IV»
  ctx.font=prev;
  lblCache={ ax, tonic:viewKey(ax.sc), w:Math.max(ROLL_LBL_W, Math.ceil(w)+14) };   // +14: зазор до сетки и запас на округление
  return lblCache.w;
}
const rollLower=(hits,t)=>{ let lo=0,hi=hits.length; while(lo<hi){ const m=(lo+hi)>>1; if(hits[m].t<t) lo=m+1; else hi=m; } return lo; };
/* ⛳ ПРИВЯЗКА ИДЁТ ЗА КВАНТИЗАЦИЕЙ ЗАПИСИ (S5.2 — ОТМЕНА РЕШЕНИЯ S5.1).
   ⚠️ В S5.1 шаг выбирала ПЛОТНОСТЬ ПИКСЕЛЕЙ, и это было неверно: человек уже сказал, как он думает о
   времени, — тумблером «Квантизация» в панели лупера. Редактор обязан слушать ЕГО, а не масштаб.
     КВАНТИЗАЦИЯ ВЫКЛ → привязки НЕТ ВОВСЕ: удар встаёт ровно туда, где отпустили. Человек отказался от
       сетки — навязывать её в редакторе значит спорить с явным выбором.
     КВАНТИЗАЦИЯ ВКЛ → шаг РОВНО тот, которым пишется живой удар: gridFor('drum') = 1/loop.sub
       (16-е или ТРИОЛИ). Правка садится туда же, куда села бы игра, — двух правд о времени не бывает.
   ⛳ ПЛОТНОСТЬ ПИКСЕЛЕЙ ОСТАЁТСЯ, НО ТОЛЬКО КАК ПОТОЛОК ВИДИМОСТИ: линии ближе ROLL_GRID_MIN_PX сливаются,
   и рисовать их нечестно. Если шаг привязки мельче рисуемого, ролл НЕ меняет шаг втихую — он говорит об
   этом в панели (см. roll.snapHidden): палец, тянущий к невидимой сетке, иначе выглядит как «нота прыгает
   сама». */
const ROLL_GRID_MIN_PX=3;
export function rollSnap(){
  const V=rollView, pxB=V?V.bw/V.span:0;
  const step=1/(loop.sub||4);                       // ТА ЖЕ сетка, что у записи ударов (gridFor('drum'))
  return { free:!loop.quant, step, drawn:pxB*step>=ROLL_GRID_MIN_PX };
}
export const rollSnapBeat=(beat,s)=> s.free ? Math.max(0,beat) : Math.max(0, Math.round(beat/s.step)*s.step);
/* ⛳ ШИРИНА БЛОКА УДАРА — ОДИН ИСТОЧНИК ДЛЯ РИСОВАНИЯ И ПОПАДАНИЯ (правило #9).
   Удар — событие без длительности, но рисовать его РИСКОЙ НА ДОЛЕ нельзя: на линии такта риска сидит
   ВЕРХОМ на границе, половиной в прошлом такте, — а нота «на раз» звучит ВНУТРИ такта. Поэтому блок
   начинается НА своей доле и растёт ВПРАВО, как нота в любом секвенсоре.
   Ширина — КЛЕТКА привязки (шаг квантизации в пикселях): блок читается как «вот эта клетка». Без
   квантизации клетки нет вовсе — берём скромную постоянную ширину, чтобы блок оставался видимым.
   Пол 6px — иначе на общем плане удар исчезает; потолок 36px — иначе на крупном плане одна шестнадцатая
   разрастается в плиту во весь ряд. */
function rollBlockPx(V){
  const pxB=V.bw/V.span, s=rollSnap();
  return Math.max(6, Math.min(36, s.free ? 10 : s.step*pxB));
}
const rollBlockBeats=V=> rollBlockPx(V)*V.span/V.bw;
/* ═══ ПОЛОСА АВТОМАТИЗАЦИИ (слайс O-4) ═══
   ⛳ ВРЕМЕННÁЯ ОСЬ — ТА ЖЕ, ЧТО У СЕТКИ НОТ, И ЭТО НЕ «СОГЛАСОВАНО», А ОДНА И ТА ЖЕ ВЕЛИЧИНА: полоса
   берёт x0/bw/beat0/span из ТОГО ЖЕ снимка rollView, который нарисовал ноты (правило #9). Второй
   геометрии времени в редакторе нет и быть не должно — иначе зум, прокрутка и бегунок разъехались бы
   между двумя полями, причём незаметно.
   ⛳ ВЫСОТА ПОЛОСЫ — ДОЛЯ СВОБОДНОГО ПОЛЯ, а не константа: «не полэкрана, но и не щель». Потолок держит
   её скромной на большом экране, пол — читаемой на маленьком, доля — соразмерной в альбомной ориентации.
   Сетка отдаёт ровно эту высоту плюс зазор; её ряды пересчитываются той же подгонкой, что и всегда. */
const ROLL_AUT_MAX=92, ROLL_AUT_MIN=56, ROLL_AUT_PART=0.30, ROLL_AUT_GAP=4;
const rollAutH=field=> Math.round(Math.max(ROLL_AUT_MIN, Math.min(ROLL_AUT_MAX, field*ROLL_AUT_PART)));
/* ⛳ ВЕРТИКАЛЬНАЯ ПРИВЯЗКА — ДЕСЯТЫЕ (шаг 0.1), И ОНА ВИДНА. У величины нет «квантизации» в настройках:
   квантизация — про время и про доли такта, а ось значения к тактам отношения не имеет. Но и СВОБОДНАЯ
   ось плоха: пальцем на 70px не поставить «ровно половину», а именно круглые величины человек и хочет.
   Поэтому шаг 0.1 (десять делений — столько же, сколько у шкалы 0..100 в меню) и ЛИНИИ через каждую
   десятую, как у времени свои линии тактов.
   ⚠️ ЭТО ГРУБЫЙ ШАГ, А НЕ ЕДИНСТВЕННЫЙ: единица достижима прямо здесь, ЗОНОЙ ТОЧНОСТИ (см. ниже), и
   линий от этого не прибавилось — сто линий превратили бы полосу в шум, а десять честно показывают
   именно тот шаг, которым палец берёт круглую величину.
   ⚠️ ШАГИ СЧИТАЕМ В ЕДИНИЦАХ ШКАЛЫ 0..100, а не в долях: Math.round(v/0.1)*0.1 даёт 0.7000000000000001,
   и сравнение «сдвинулась ли точка» начинает врать на ровном месте. */
const AUT_U=10, AUT_U_FINE=1;
const autSnapU=(v,u)=> Math.max(0,Math.min(1, Math.round(v*100/u)*u/100));
const autSnapV=v=>autSnapU(v,AUT_U);
const autY=(V,v)=> V.aut.y1-(V.aut.y1-V.aut.y0)*Math.max(0,Math.min(1,v));
const AUT_CURVE_N=16;   // BEND-CURVE: samples of a curved glide on the lane
const autVAt=(V,py)=> Math.max(0,Math.min(1,(V.aut.y1-py)/Math.max(1,V.aut.y1-V.aut.y0)));
/* ============ ЗОНА ТОЧНОСТИ И ОСЬ ЖЕСТА ============
   ⛳ ТОНКОСТЬ ПОКУПАЕТСЯ РАССТОЯНИЕМ, А НЕ ПИКСЕЛЯМИ ЭКРАНА: полосу растить нельзя — она откусывает от
   сетки нот, — поэтому шаг задаёт ОТХОД ПАЛЬЦА В СТОРОНУ. Близко к точке шаг десятая (круглую величину
   палец берёт сам), отвёл в сторону — единица (43 становится достижимым). Зон ровно две, а не плавный
   переход: плавный означал бы «какой у меня сейчас шаг — неизвестно», а две зоны можно НАЗВАТЬ, что
   подпись под пальцем и делает.
   ⛔ ЧЕСТНАЯ ОГОВОРКА — СВОБОДНОЙ ОСИ ЗДЕСЬ НЕТ. В этой полосе по горизонтали точка едет ВО ВРЕМЕНИ, по
   вертикали меняет ВЕЛИЧИНУ; идиома DAW «отвёл палец — стало точнее» требует оси, которая в этот миг
   ничего не значит. Поэтому ось ЖЕСТА фиксируется на первом же движении: преобладает вертикаль — правится
   ВЕЛИЧИНА (время стоит), преобладает горизонталь — правится ВРЕМЯ (величина стоит). Цена названа прямо:
   одной диагональю больше не переносят и то и другое разом, это два жеста. Взамен отход в сторону
   становится свободным и НИЧЕГО не стоит на экране.
   ⛳ ВЕЛИЧИНА ВЕДЁТСЯ ОТНОСИТЕЛЬНО МЕСТА ВЗЯТИЯ, а не по абсолютному Y: палец берёт точку с допуском в
   несколько пикселей, и абсолютная привязка дёрнула бы её на эти пиксели в тот же миг. Точка не прыгает
   под пальцем — тем же законом, по которому время ведётся через dt.
   ⛳ ВХОД В ЗОНУ НЕ ДВИГАЕТ ВЕЛИЧИНУ: якорь ставится ЗДЕСЬ И СЕЙЧАС и на ТЕКУЩЕМ ПОКАЗАННОМ числе —
   «40» остаётся «40» и дальше правится по единице. ⛔ Обратно зона НЕ переключается: вернувшись в грубую,
   число пришлось бы переокруглить, то есть отнять только что набранные 43. Уточнение необратимо в
   пределах одного жеста — отпустил и взял снова, если нужна десятая. */
const AUT_AXIS_PX=6, AUT_FINE_PX=56, AUT_FINE_GAIN=0.25;
/* Ведение точки пальцем: ось, зона и ВЕЛИЧИНА. G — память жеста (живёт в ui, там же, где и сам жест), а
   вся геометрия — здесь, у снимка (правило #9): ui не знает ни высоты полосы, ни шагов, ни порогов.
   ⚠️ Пока ось не решена (палец не тронулся), отдаём ХРАНИМУЮ величину без привязки — иначе тап по точке,
   записанной свипом (0.437), молча переписал бы её в 0.4. */
export function rollAutDrive(G,px,py){
  const V=rollView; if(!V||!V.aut) return { axis:G.axis||null, fine:!!G.fine, v:G.v0 };
  const h=Math.max(1,V.aut.y1-V.aut.y0), dx=px-G.x, dy=py-G.y;
  if(!G.axis && (Math.abs(dx)>AUT_AXIS_PX||Math.abs(dy)>AUT_AXIS_PX))
    G.axis = G.vOnly || Math.abs(dx)<=Math.abs(dy) ? 'v' : 't';   // ED5: a bar has no time axis (vOnly) — sideways is the fine zone
  if(!G.axis) return { axis:null, fine:false, v:G.v0 };
  if(G.axis==='t') return { axis:'t', fine:false, v:G.v0 };
  if(!G.fine && Math.abs(dx)>=AUT_FINE_PX) G.fine={ y:py, v:autSnapU(G.v0+(G.y-py)/h, AUT_U) };
  let raw = G.fine ? G.fine.v+(G.fine.y-py)/h*AUT_FINE_GAIN : G.v0+(G.y-py)/h;
  if(raw<0||raw>1){ const c= raw<0?0:1;   // упёрлись в край — переставляем якорь, иначе палец наматывает ход вхолостую и обратно точка трогается не сразу
    if(G.fine){ G.fine.v=c; G.fine.y=py; } else { G.v0=c; G.y=py; }
    raw=c; }
  return { axis:'v', fine:!!G.fine, v:autSnapU(raw, G.fine?AUT_U_FINE:AUT_U) };
}
/* ⛳ ЧТО РИСУЕМ МЕЖДУ ТОЧКАМИ — СТУПЕНЬКУ, А НЕ НАКЛОННУЮ ПРЯМУЮ, и это не стиль, а ЧЕСТНОСТЬ.
   Соблазн велик: соединить точки диагоналями, как рисуют огибающие в любой DAW. Но переигровка устроена
   иначе — fxPlayDrive СВОРАЧИВАЕТ ленту и применяет ПОСЛЕДНЮЮ точку, встреченную до текущей доли. То есть
   величина ДЕРЖИТСЯ на значении точки, пока не придёт следующая, и лишь тогда переезжает — быстро, за
   постоянную времени своего сеттера (0.05–0.08 с). Диагональ обещала бы ИНТЕРПОЛЯЦИЮ, которой нет: на
   длинном промежутке между двумя точками человек читал бы плавный подъём, а слышал бы полку и скачок.
   ⚠️ СГЛАЖИВАНИЕ СЕТТЕРА НЕ РИСУЕМ ТОЖЕ: на масштабе такта оно короче пикселя, а рисовать невидимое —
   значит загромождать. Ступенька говорит правду о главном: ГДЕ точки и КАКАЯ величина держится между ними.
   ⛳ И ПОТОМУ ЖЕ ЧАСТЫЙ СВИП ВЫГЛЯДИТ ПЛАВНЫМ: при записи точка ложится каждые 25 мс, ступеньки становятся
   уже пикселя и сливаются в наклон — ровно так, как это и звучит.
   ⛳ С ГЛАДКОЙ АВТОМАТИЗАЦИЕЙ ДИАГОНАЛЬ ПОЯВИЛАСЬ — ТАМ, ГДЕ ИНТЕРПОЛЯЦИЯ ЕСТЬ: отрезок, входящий в точку с формой 's', едет по
   прямой и на тике (fxPlayDrive → fxLaneAt), и в рендере (fxLaneExpand), и у параметра «в ноте» (величины нот и ведения рампы
   лежат на ней — pnPlan). Довод выше остаётся в силе для всего остального: ступенька там, где звук держит полку. */
function drawAutLane(V,ly){
  const A=V.aut; if(!A) return;
  const addr=rollAut;
  ctx.fillStyle='rgba(255,255,255,.028)'; ctx.fillRect(V.x0,A.y0,V.bw,A.y1-A.y0);
  // ---- горизонтали десятых + подписи 0/100 у левого края ----
  ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1;
  for(let k=0;k<=10;k++){ const y=autY(V,k/10);
    ctx.beginPath(); ctx.moveTo(V.x0,y); ctx.lineTo(V.x0+V.bw,y); ctx.stroke(); }
  ctx.strokeStyle='rgba(255,255,255,.16)';
  ctx.beginPath(); ctx.moveTo(V.x0,A.y0); ctx.lineTo(V.x0+V.bw,A.y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(V.x0,A.y1); ctx.lineTo(V.x0+V.bw,A.y1); ctx.stroke();
  ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.font='9px system-ui'; ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.fillText('100', V.x0-6, A.y0+5); ctx.fillText('0', V.x0-6, A.y1-5);
  if(!addr||ly==null){
    ctx.textAlign='center'; ctx.font='11px system-ui'; ctx.fillStyle='rgba(255,255,255,.45)';
    ctx.fillText(t('aut.pick'), V.x0+V.bw/2, (A.y0+A.y1)/2);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic'; return;
  }
  if(addr.fx===FX_VOL && rollVolBars){ drawVolBars(V,ly); return; }   // ED5: the Volume address, bars face
  const D=autPoints(ly,addr.key,addr.fx,addr.p);
  const col=AUT_COL;
  /* ⛳ ОТСЕКАЕМ ПО ОКНУ, как и ноты: полоса после долгого кручения ручкой держит тысячи точек, а на экране
     их сотня. Двоичным поиском находим первую видимую и идём до правого края — цена кадра зависит от
     ВИДИМОГО, а не от длины песни (тот же закон, что у rollLower у ударов). Соседей слева и справа берём
     по одной штуке сверх окна, иначе линия обрывалась бы на кромке вместо того, чтобы уходить за неё. */
  const P=D.pts, xL=V.beat0, xR=V.beat0+V.span;
  let lo=0, hi=P.length;
  while(lo<hi){ const mid=(lo+hi)>>1; if(P[mid].pt.t<xL) lo=mid+1; else hi=mid; }
  const from=Math.max(0,lo-1);
  let to=from; while(to<P.length && P[to].pt.t<=xR) to++;
  if(to<P.length) to++;
  // ---- линия ----
  const drag=rollAutDrag;
  const vOf=r=> (drag&&rollAutSel&&r.pt===rollAutSel.pt) ? drag.v : r.pt.v;
  const tOf=r=> (drag&&rollAutSel&&r.pt===rollAutSel.pt) ? drag.t : r.pt.t;
  const kOf=r=> (drag&&drag.mid&&rollAutSel&&r.pt===rollAutSel.pt) ? drag.k : (r.pt.k||0);   // BEND-CURVE: the curvature (a dragged middle handle shows its ghost value)
  V.aut.mid=null;
  ctx.lineWidth=2;
  const path=new Path2D();   // V4b: путь строим ОДИН раз — у адреса «в ноте» он штрихуется дважды (приглушённо везде, ярко там, где звучат ноты)
  let started=false, lastY=null, fromPt=false, prevX=V.x0, prevV=0;   // prevX — x предыдущей точки: от g0 ровный кусок ведём, только если он правее неё
  if(D.base!=null){ lastY=autY(V,D.base); path.moveTo(V.x0,lastY); started=true; }   // ПОЛКА слева: величина из снимка старта взятого — до первой точки величина именно такая (у адреса «в ноте» — уровень «не задано»)
  for(let i=from;i<to;i++){
    const r=P[i], x=laneBeatX(V,tOf(r)), y=autY(V,vOf(r));
    if(!started){ path.moveTo(x,y); started=true; }
    /* ⛳ ГЛАДКАЯ АВТОМАТИЗАЦИЯ: в точку с плавным входом — ПРЯМАЯ, и только ОТ ТОЧКИ: от полки снимка плавно не едет ни
       переигровка (fxLaneSmooth), ни нота (pnPlan снимает форму у первой точки). Прочее — ступенька, как было. Прямая в шкале 0..1
       — та же, по которой едут тик, рендер и ведения рампы, поэтому рисунок и звук совпадают, а не «похожи».
       r.smooth — ответ ТОГО ЖЕ закона, что у переигровки (recorder: autSmoothOf — форма человека или, у записанной точки, закон
       движения руки). Своей развилки по полю sh здесь нет: прочти draw sh сам — записанное движение рисовалось бы ступеньками,
       а звучало бы прямой. */
    else if(r.smooth && fromPt){
      /* g0 — у ЗАПИСАННОЙ величины «в ноте» после паузы прямая начинается не от предыдущей точки, а от мига, где рука ушла (там
         лежит ведение удержания — recorder.pnPoints): до него — ровно, как и звучит. У шины и у формы человека g0 нет. */
      if(r.g0!=null){ const xg=laneBeatX(V,r.g0); if(xg>prevX) path.lineTo(xg,lastY); }
      const k=r.per ? 0 : kOf(r), v1=vOf(r);
      if(k) for(let n=1;n<AUT_CURVE_N;n++){ const u=n/AUT_CURVE_N; path.lineTo(prevX+(x-prevX)*u, autY(V,prevV+(v1-prevV)*curveU(u,k))); }   // BEND-CURVE: the replay's law (recorder.fxLaneAt → config.curveU)
      path.lineTo(x,y);
      /* the middle handle of the glide INTO the selected point (bus lanes only — per-note addresses are not curved) */
      if(!r.per && rollAutSel && r.pt===rollAutSel.pt) V.aut.mid={ rec:r, x:(prevX+x)/2, y:autY(V,prevV+(v1-prevV)*curveU(0.5,k)), v0:prevV, v1 };
    }
    else { path.lineTo(x,lastY); path.lineTo(x,y); }   // ДЕРЖИМ прежнюю величину до самой точки, затем переезд: ровно то, что делает fxPlayDrive (у «в ноте» — каждая нота держит величину своего события)
    lastY=y; fromPt=true; prevX=x; prevV=vOf(r);
  }
  if(started&&lastY!=null) path.lineTo(V.x0+V.bw,lastY);
  /* ⛳ V4b: У АДРЕСА «В НОТЕ» ПАУЗЫ ЧЕСТНЫ. Величину несут ноты, и там, где у дорожки не звучит ни одна (D.spans — интервалы
     нот из songNotes), линия держит уровень лишь как «что возьмёт следующая нота»: сама по себе она там не звучит ни на чём.
     Поэтому рисуем её приглушённой всюду, а поверх — полной яркости ТОЛЬКО внутри нот (обрезкой по их интервалам). */
  if(D.per&&D.spans){
    ctx.strokeStyle=hexA(col,.3); ctx.stroke(path);
    ctx.save(); ctx.beginPath();
    for(const [a,b] of D.spans){
      const xa=Math.max(V.x0, laneBeatX(V,a)), xb=Math.min(V.x0+V.bw, b===Infinity ? V.x0+V.bw : laneBeatX(V,b));
      if(xb>=xa) ctx.rect(xa, A.y0-4, Math.max(1,xb-xa), A.y1-A.y0+8);
    }
    ctx.clip(); ctx.strokeStyle=col; ctx.stroke(path); ctx.restore();
  }else{ ctx.strokeStyle=col; ctx.stroke(path); }
  if(V.aut.mid){ const m=V.aut.mid;   // BEND-CURVE: a hollow diamond — a shape handle, not a point
    ctx.beginPath(); ctx.moveTo(m.x,m.y-4.5); ctx.lineTo(m.x+4.5,m.y); ctx.lineTo(m.x,m.y+4.5); ctx.lineTo(m.x-4.5,m.y); ctx.closePath();
    ctx.fillStyle='rgba(8,10,16,.9)'; ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1.4; ctx.stroke(); }
  // ---- точки ----
  for(let i=from;i<to;i++){
    const r=P[i], x=laneBeatX(V,tOf(r)), y=autY(V,vOf(r));
    if(x<V.x0-6||x>V.x0+V.bw+6) continue;
    const sel=rollAutSel&&rollAutSel.pt===r.pt;
    if(r.pt.unset&&!sel){ ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,3.2,0,Math.PI*2); ctx.stroke(); continue; }   // V4b: «не задано» (нота играет сегодняшнее умолчание) — полым кружком, как полая планка «ведёт не рука»
    ctx.fillStyle= sel?'#fff':col;
    ctx.beginPath(); ctx.arc(x,y,sel?4.5:3.2,0,Math.PI*2); ctx.fill();
    if(sel){ ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.stroke(); }
  }
  // ---- подпись адреса и величина выбранной точки ----
  ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.font='10px system-ui';
  const nm=fxTitleOf(addr.fx)+' · '+t(addr.labelKey||'');
  /* ⛳ ЕСЛИ ВЕРХНЯЯ СТРОКА НЕ ВМЕЩАЕТ ОБОИХ — ПОБЕЖДАЕТ ПОДСКАЗКА. Имя адреса и без того написано в
     выпадающем списке над полем (им его и выбирают), а подсказка живёт ровно те секунды, пока точка
     выбрана, и другого места у неё нет. Две налезшие друг на друга строки — хуже любой из них. */
  const hint = rollAutSel&&!drag ? t('aut.selHint') : '';
  const hw = hint ? ctx.measureText(hint).width : 0;
  if(!hint || ctx.measureText(nm).width+12+hw <= V.bw-8){
    ctx.fillStyle=hexA(col,.85); ctx.fillText(nm, V.x0+4, A.y0+12); }
  /* ⛳ ЧИСЛО — У ТОЧКИ И ТОЛЬКО ПОД ПАЛЬЦЕМ. Прежде оно стояло в углу полосы и держалось после отпускания:
     смотреть приходилось не туда, куда ведёшь, а взгляд на другом конце полосы — это и есть «не вижу, что
     ставлю». Табличку кладём СБОКУ от точки (не под палец — палец её и закрывает), с переворотом у правого
     края и зажимом по высоте, чтобы она не вылезла из полосы. Отпустили — таблички нет (rollAutDrag снят).
     ⛳ ЗОНА ТОЧНОСТИ НАЗВАНА СЛОВОМ, а не только цветом: «шаг стал другой» — это не оттенок, это факт. */
  if(rollAutSel && drag){                                               // палец лёг на точку — число уже видно, ещё до первого движения
    const px=Math.max(V.x0, Math.min(V.x0+V.bw, laneBeatX(V,drag.t))), py=autY(V,drag.v);
    const txt= drag.mid ? icon('curve')+' '+(drag.k>0?'+':'')+drag.k : Math.round(drag.v*100)+(drag.fine?' · '+t('aut.fine'):'');
    ctx.font='11px system-ui'; ctx.textBaseline='middle';
    const tw=ctx.measureText(txt).width, bw=tw+10, bh=16;
    const left = px+12+bw > V.x0+V.bw;                                  // у правого края переворачиваем сторону: иначе табличка уезжает за поле
    const bx = left ? px-12-bw : px+12, by=Math.max(A.y0+2, Math.min(A.y1-2-bh, py-bh/2));
    ctx.fillStyle='rgba(8,10,16,.86)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle= drag.fine?AUT_FINE_COL:col; ctx.lineWidth=1; ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
    ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText(txt, bx+5, by+bh/2+.5);
  }
  /* ⛳ ГДЕ ЧЕЛОВЕК УЗНАЁТ ПРО ЕДИНИЦЫ И ПРО УДАЛЕНИЕ — РОВНО ТАМ, ГДЕ ЭТО СТАЛО ВОЗМОЖНЫМ: точка выбрана.
     Подсказка стоит на месте прежнего числа (взгляд уже приучен к этому углу) и уходит, как только палец
     лёг на точку, — чтобы не спорить с табличкой величины. Второго жеста удаления не заводим: корзина в
     панели редактора одна на ноту и на точку, ей и говорим. */
  if(hint){
    ctx.textAlign='right'; ctx.textBaseline='alphabetic'; ctx.font='10px system-ui';
    ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.fillText(hint, V.x0+V.bw-4, A.y0+12);
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ED5: VOLUME BARS — the Volume address as one bar per note at its start (height = its volume), a faint line where the volume changes
   inside the note. The visible bars go into the snapshot (V.aut.bars) — rollHit reads exactly what was drawn (rule #9). While a bar is
   dragged (rollAutDrag.bar) every bar of the dragged set shows its value + d. */
function drawVolBars(V,ly){
  const A=V.aut, B=pnBars(ly), xL=V.beat0, xR=V.beat0+V.span, col=AUT_COL, drag=rollAutDrag&&rollAutDrag.bar ? rollAutDrag : null;
  const sel=new Set(rollSelMany.size ? rollSelMany : rollSel ? [rollSel] : []);
  const isSel=b=> b.evs.some(e=>sel.has(e)), moved=b=> drag && drag.set.has(b.ev);
  const vis=[];
  let lo=0, hi=B.length; while(lo<hi){ const m=(lo+hi)>>1; if(B[m].t<xL-1e-9) lo=m+1; else hi=m; }
  for(let i=Math.max(0,lo-1);i<B.length;i++){ const b=B[i];   // a note starting left of the window may still show its inner line
    if(b.t>xR) break;
    const x=laneBeatX(V,b.t); vis.push({ b, x });
    if(b.path){ ctx.strokeStyle=hexA(col,.35); ctx.lineWidth=1.5; ctx.beginPath();
      const P=b.path, end=b.end==null ? xR : b.end;
      for(let k=0;k<P.length;k++){ const xa=laneBeatX(V,P[k][0]), xb=laneBeatX(V, k+1<P.length ? P[k+1][0] : end), y=autY(V,P[k][1]);
        if(k===0) ctx.moveTo(xa,y); else ctx.lineTo(xa,y); ctx.lineTo(xb,y); }
      ctx.stroke(); }
  }
  A.bars=vis.filter(r=>r.x>=V.x0-6&&r.x<=V.x0+V.bw+6);
  for(const {b,x} of A.bars){
    const v= moved(b) ? Math.max(0,Math.min(1,b.v+drag.d)) : b.v, y=autY(V,v), s=isSel(b)||moved(b);
    ctx.strokeStyle= s ? '#fff' : hexA(col,.8); ctx.lineWidth= s ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x,A.y1); ctx.lineTo(x,y); ctx.stroke();
    ctx.fillStyle= s ? '#fff' : col; ctx.beginPath(); ctx.arc(x,y,s?4:3,0,Math.PI*2); ctx.fill();
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.font='10px system-ui';
  ctx.fillStyle=hexA(col,.85); ctx.fillText(fxTitleOf(FX_VOL)+' · '+t('aut.bars'), V.x0+4, A.y0+12);
  if(drag){   // the grabbed bar's number beside it (as the lane's point label)
    const px=Math.max(V.x0, Math.min(V.x0+V.bw, laneBeatX(V,drag.t))), v=Math.max(0,Math.min(1,drag.v0+drag.d)), py=autY(V,v);
    const txt=Math.round(v*100)+(drag.fine?' · '+t('aut.fine'):'');
    ctx.font='11px system-ui'; ctx.textBaseline='middle';
    const bw=ctx.measureText(txt).width+10, bh=16, left= px+12+bw > V.x0+V.bw;
    const bx= left ? px-12-bw : px+12, by=Math.max(A.y0+2, Math.min(A.y1-2-bh, py-bh/2));
    ctx.fillStyle='rgba(8,10,16,.86)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle= drag.fine?AUT_FINE_COL:col; ctx.lineWidth=1; ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
    ctx.fillStyle='#fff'; ctx.fillText(txt, bx+5, by+bh/2+.5);
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
const AUT_FINE_COL='#ffd479';   // зона точности: янтарь против зелени полосы — «шаг другой» видно и боковым зрением
const AUT_COL='#7ee0b6';   // тон полосы: родня бегунку (он тоже про ВРЕМЯ и тоже поверх поля), но не спорит с ролями
function drawRoll(){
  const W=canvas.width, H=canvas.height;
  /* Полосы лупера на экране нет → и попадать в неё нечем: снимаем её геометрию, как это делает запись
     клипа (иначе тап пришёлся бы по НЕВИДИМОЙ кнопке дорожки). */
  loopViewClear();
  if(statusEl.textContent) statusEl.textContent='';     // строка статуса игрового поля к роллу отношения не имеет
  /* ⛳ ПОЗИЦИЮ ТРАНСПОРТА ПО-ПРЕЖНЕМУ ВЛАДЕЕТ DRAW, тем же syncLoopTransport — только теперь полоса
     швартуется под панелью редактора, а не под коробкой лупера. Один владелец, одна функция. */
  syncLoopTransport(true, ROLL_BAR_H+4);
  ctx.fillStyle='#0b0b14'; ctx.fillRect(0,0,W,H);       // камеру не рисуем — фон честно непрозрачный
  const ly=rollTrackLayer();
  /* ry0 — верх ЛИНЕЙКИ (S5.2). Сетка начинается там же, где и раньше (ry0+ROLL_RULER_H === прежний gy0),
     поэтому поле нот не сдвинулось ни на пиксель: линейка заняла тот отступ, что и так пустовал. */
  /* ⛳ O-4: ПОЛОСА АВТОМАТИЗАЦИИ ОТКУСЫВАЕТ ОТ СЕТКИ, и обе меры считаются ЗДЕСЬ, из одного поля. Сетка
     отдаёт высоту полосы плюс зазор; её ряды пересчитает та же подгонка (fitH ниже), поэтому на телефоне
     и в альбоме всё раскладывается само, без второго набора правил. Полоса закрыта — всё как было. */
  const x1=W-12, ry0=ROLL_BAR_H+ROLL_TP_H+2, gy0=ry0+ROLL_RULER_H, foot=H-ROLL_FOOT_H;
  const autH = rollAut ? rollAutH(Math.max(1,foot-gy0)) : 0;
  const aut  = autH ? { y0:foot-autH, y1:foot } : null;
  const gy1  = autH ? aut.y0-ROLL_AUT_GAP : foot;   // низ сетки = верх полосы (или подвала): одна величина на обе стороны, разъехаться нечему
  /* ⛳ ГЕОМЕТРИЯ РЯДОВ РАЗНАЯ У РОЛЕЙ, И ЭТО ЕДИНСТВЕННОЕ ИХ РАЗЛИЧИЕ В СНИМКЕ. Ударные: шесть рядов во
     всю высоту, row0=0 — ровно как было. Ладовые роли: ряд фиксированной высоты, видно столько, сколько
     влезло, остальное — прокруткой (row0). */
  const G=rollGroup();
  const axSc = G ? G.sc : CUR();                       // лад ОСИ: вид дорожки, иначе живой (пустая роль)
  /* ⛳ НЕПРАВИМАЯ РОЛЬ — с S4 таких нет (правимы все четыре, state.ROLL_EDITABLE); ветка осталась СТРАЖЕМ для роли вне списка: вместо
     сетки ОДНА СТРОКА. Рядов и нот не рисуем — нарисованная нота, которую нельзя тронуть, читалась бы как поломка, — а попадание по
     полю молчит (rollHit), иначе вставка ушла бы мимо роли (вставка ведётся по роли — ui.ROLL_INSERT). Прежняя строка «роль — позже»
     (roll.roleLater) снята в S4 вместе с последней неправимой ролью; для недостижимой ветки — «нот нет».
     ⚠️ Линейка, бегунок и ПОЛОСА АВТОМАТИЗАЦИИ остаются: эффекты дорожки правятся и у такой роли.
     ⛳ T4: ДОРОЖКА БЕЗ РОЛИ (rollRole===null — нот не было с самого открытия: слой дрона, опустевшая
     вооружённая) — туда же: оси нет, поле не цель, одна строка «нот нет». Прежде такая дорожка открывалась
     на УДАРНЫХ — роли, которой у неё никогда не было. */
  const noRole = ly!=null && rollRole==null;
  const noEdit = ly!=null && (noRole || !ROLL_EDITABLE.includes(rollRole));
  const pitched = rollRole!=null && rollRole!=='dr' && !noEdit;   // T4: роли нет — оси высот нет (даже если дорожка исчезла, ly==null)
  const AX = pitched ? rollAxis(axSc) : null;           // T3: ОСЬ — один объект на кадр; кладётся в снимок, её читают все (правило #9)
  const x0 = pitched ? Math.min(rollGutterW(AX), Math.floor(W*0.42)) : ROLL_LBL_W;   // S5.6: колонка подписей — по МЕРКЕ, с потолком
  const total = pitched ? (rollRole==='ch' ? rollChordTotal(G,AX) : REG_N*AX.rpp) : DRUM_ROWS;   // U2: у аккордов — ПО САМОЙ ДОРОЖКЕ, ни одна нота за край (см. rollChordTotal)
  /* ⛳ ПОДГОНКА ПО ВЫСОТЕ (S5.6): ВЛЕЗАЮТ ВСЕ РЯДЫ — растягиваем их на всю высоту (до потолка), не
     влезают — оставляем минимальную высоту и прокручиваем, как было. Правило ДЕТЕРМИНИРОВАНО (число
     рядов × высота поля), поэтому на границе «влезает/не влезает» ничего не мигает: одно и то же поле
     всегда даёт один и тот же ответ, а при повороте экрана он просто пересчитывается на следующем кадре.
     ⛔ УДАРНЫЕ НЕ ЗАТРОНУТЫ: у них высота и раньше была «поле / 6», то есть ровно подгонка. */
  const fitH=(gy1-gy0)/Math.max(1,total);
  const rowH = pitched ? (fitH>=ROLL_PITCH_ROW_H ? Math.min(fitH,ROLL_PITCH_ROW_MAX) : ROLL_PITCH_ROW_H)
                       : (gy1-gy0)/DRUM_ROWS;
  const rows = pitched ? Math.max(1,Math.min(total,Math.floor((gy1-gy0)/rowH))) : DRUM_ROWS;
  const row0 = pitched ? Math.max(0,Math.min(rollRow0,Math.max(0,total-rows))) : 0;
  rollView={ x0, bw:Math.max(1,x1-x0), beat0:rollBeat0, span:Math.max(1e-6,rollSpan), ry0, gy0, rowH, rows, row0, total, sc:axSc, axis:AX, pitched, aut, noEdit, col: rollRole ? INSTR_COL[rollRole] : null };   // AR2: col — цвет роли дорожки (палитра ролей; тот же у её строки в окне, микшере и на полосе игры)   // axis (T3) — ось высот: ряд ↔ высота строя/ступень лада   // noEdit — поле нот не отвечает на палец (см. выше)   // aut — габарит полосы автоматизации (или null): попадание берёт ЕГО, а не считает заново
  const V=rollView, pxB=V.bw/V.span, M=loop.metre;
  const DPO = pitched ? AX.rpp : 0;
  // ---- ряды: чередующаяся заливка + подпись слева (ударные — имя ряда, лад — НОТА В ЛАДУ ОСИ) ----
  ctx.textBaseline='middle'; ctx.textAlign='right'; ctx.font='11px system-ui';
  for(let i=0; !noEdit && i<rows; i++){
    const r=row0+i, y=rollRowY(V,r), e=pitched?AX.ent(r):null;
    const dup = pitched && e.dup;                     // верхний ряд регистра — ДУБЛЬ тоники следующего: та же высота
    const dim = pitched && !e.bright;                 // T3: высота строя ВНЕ лада — приглушённый ряд (только показ; правка на нём — T5)
    ctx.fillStyle = dim ? 'rgba(0,0,0,.22)' : (pitched ? (r%DPO===0) : r%2) ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.015)';   // тоника регистра выделена заливкой — по ней читается октава; приглушённый — темнее фона
    ctx.fillRect(V.x0,y,V.bw,V.rowH);
    ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(V.x0,y); ctx.lineTo(V.x0+V.bw,y); ctx.stroke();
    ctx.fillStyle= dim ? 'rgba(255,255,255,.26)' : dup ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.62)';
    /* ⛳ ПОДПИСЬ — В ЛАДУ ОСИ, а не в живом: ради этого и заводился параметр у noteLbl (S5.4). Тоника
       ЖИВАЯ — высоту переигровка тоже берёт от живой тоники, и подпись обязана идти за ней.
       ⛳ КЛИП ПО КОЛОНКЕ (S5.6): ширину мы измерили, но у неё есть потолок — и на потолке хвост обязан
       обрезаться В КОЛОНКЕ, а не лезть на сетку или за край экрана. */
    if(V.rowH>=11){
      ctx.save(); ctx.beginPath(); ctx.rect(0,y,V.x0-4,V.rowH); ctx.clip();
      ctx.fillText(pitched ? axisLbl(AX,r)   // T3: имя ряда — одна функция (у ступени — noteLbl, у приглушённого — схема имён строя)
                           : (L(DRUM_NAMES[r])||''), V.x0-6, y+V.rowH/2);
      ctx.restore();
    }
  }
  // ---- скоба повтора: только ПОКАЗ (правка скобы живёт на полосе лупера) ----
  if(regionOn()){
    const R=loop.rgn, bx0=laneBeatX(V,Math.max(R.from,V.beat0)), bx1=laneBeatX(V,Math.min(R.to,V.beat0+V.span));
    if(bx1>bx0){ ctx.fillStyle='rgba(87,217,163,.10)'; ctx.fillRect(bx0,gy0,bx1-bx0,gy1-gy0);
      ctx.strokeStyle='rgba(87,217,163,.5)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(bx0,gy0); ctx.lineTo(bx0,gy1); ctx.moveTo(bx1,gy0); ctx.lineTo(bx1,gy1); ctx.stroke(); }
  }
  /* ---- ЛИНЕЙКА (S5.2): ОТДЕЛЬНАЯ полоса под перемотку. Ровно тот же приём, что у полосы скобы на полосе
     лупера: её низ — это gy0, то есть верх сетки, поэтому один тап физически не может попасть и в линейку,
     и в ноту. Сетка уже занята выбором и вставкой — третьему смыслу там места нет. ---- */
  ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(V.x0,V.ry0,V.bw,gy0-V.ry0);
  ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(V.x0,gy0); ctx.lineTo(V.x0+V.bw,gy0); ctx.stroke();
  /* ---- ПОДСЕТКА — РИСУЕТСЯ ВСЕГДА (S5.3; в S5.2 она появлялась только с квантизацией, и это смешивало
     две РАЗНЫЕ вещи). ПРИВЯЗКА — про то, куда встанет нота; ВИДИМОСТЬ — про то, где человек находится во
     времени. Без квантизации нота может встать куда угодно, значит линейка нужна БОЛЬШЕ, а не меньше.
     ЧТО РИСУЕМ БЕЗ КВАНТИЗАЦИИ: ТО ЖЕ дробление доли (1/loop.sub) — им человек и делит долю в панели
     лупера, даже когда не привязывается. ⛔ Не «по зуму»: плотность, скачущая от масштаба, — это не
     линейка, а мигание; а при постоянном шаге переключение квантизации меняет ТОЛЬКО ВИД сетки, и две
     картинки можно честно сравнить.
     ⛳ РЕЛЬСЫ ИЛИ ЛИНЕЙКА — РАЗЛИЧИМЫ ГЛАЗОМ: с квантизацией линии СПЛОШНЫЕ и ярче (к ним притягивает),
     без неё — ПУНКТИР и тусклее (они только меряют). Иначе свободное перетаскивание вдоль видимых линий
     обещало бы магнит, которого нет.
     Потолок видимости прежний (ROLL_GRID_MIN_PX): слившиеся линии не рисуем ни в том, ни в другом виде. ---- */
  const snap=rollSnap();
  if(snap.drawn){
    ctx.strokeStyle= snap.free ? 'rgba(255,255,255,.042)' : 'rgba(255,255,255,.075)';
    ctx.lineWidth=0.7;
    if(snap.free) ctx.setLineDash([2,4]);
    const s0=Math.ceil(V.beat0/snap.step)*snap.step;
    for(let b=s0;b<=V.beat0+V.span;b+=snap.step){
      if(Math.abs(b-Math.round(b))<1e-9) continue;          // доля/такт — их рисует блок ниже, своим весом
      const gx=laneBeatX(V,b); if(gx<V.x0-1||gx>V.x0+V.bw+1) continue;
      ctx.beginPath(); ctx.moveTo(gx,gy0); ctx.lineTo(gx,gy1); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  /* ---- сетка тактов и долей: ТЕ ЖЕ акценты, что у полосы лупера (beatLevel), и то же прореживание.
     Доли рисуем, пока они РАЗЛИЧИМЫ; такты — всегда, но реже, если их гуще 26px. ---- */
  const barStep=Math.max(1,Math.ceil(26/Math.max(1e-6,pxB*M))), showBeats=pxB>=7;
  const bFrom=Math.max(0,Math.floor(V.beat0)), bTo=Math.ceil(V.beat0+V.span);
  ctx.textAlign='left'; ctx.font='10px system-ui';
  for(let b=bFrom;b<=bTo;b++){
    const bib=((b%M)+M)%M;
    if(bib===0){ if(((b/M)|0)%barStep) continue; }
    else if(!showBeats) continue;
    const gx=laneBeatX(V,b); if(gx<V.x0-1||gx>V.x0+V.bw+1) continue;
    const lvl=beatLevel(M,bib);
    let sc,lw;
    if(bib===0){ sc='rgba(255,255,255,.34)'; lw=1.4; }
    else if(lvl===1){ sc='rgba(255,255,255,.22)'; lw=1.1; }
    else if(lvl===-1){ sc='rgba(140,180,255,.20)'; lw=1.0; }
    else { sc='rgba(255,255,255,.10)'; lw=0.8; }
    ctx.strokeStyle=sc; ctx.lineWidth=lw;
    ctx.beginPath(); ctx.moveTo(gx,gy0); ctx.lineTo(gx,gy1); ctx.stroke();
    if(bib===0 && pxB*M>=30){ ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillText(String((b/M|0)+1), gx+3, gy0-8); }   // номер такта — с единицы, как в подписи скобы
  }
  // ---- удары: только попавшие в окно (двоичный поиск по началу) ----
  const hits=(pitched||noEdit)?[]:rollHits(), blkW=rollBlockPx(V);   // noEdit: pitched там ложно, и без этой оговорки на поле соло легли бы УДАРЫ дорожки   // ширина блока — ОДНА на отрисовку, призрак и попадание
  for(let i=rollLower(hits,V.beat0); i<hits.length && hits[i].t<=V.beat0+V.span; i++){
    const ev=hits[i], r=ev.a.row|0; if(r<0||r>=rows) continue;
    const x=laneBeatX(V,ev.t), yT=rollRowY(V,r), h=V.rowH*0.62, y=yT+(V.rowH-h)/2;
    const w=blkW, vol=Math.max(0,Math.min(1,ev.a.vol==null?1:ev.a.vol));
    const sel = ev===rollSel || rollSelMany.has(ev);   // ED1: one of several selected
    ctx.fillStyle = sel ? '#fff' : hexA(INSTR_COL.dr, 0.35+0.55*vol);   // громкость читается насыщенностью — она записана в событии
    ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.fill();                          // S5.2: блок НАЧИНАЕТСЯ на доле и растёт вправо — нота «на раз» лежит ВНУТРИ такта, а не верхом на его линии
    if(sel){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(x-2,y-2,w+4,h+4,4); ctx.stroke(); }
  }
  /* ---- СЕГМЕНТЫ ЛАДОВОЙ РОЛИ (S5.5): у каждого своя ДЛИНА (от смены высоты до следующей), поэтому блок
     рисуется от start до end — в отличие от удара, у которого длительности нет вовсе. Открытый сегмент
     (нота без «выкл» — так лежит подложка) тянем до правого края окна: выдумывать ему конец нельзя.
     ⛳ T4c-2: призраков чужих ладов больше нет — у дорожки один вид (см. rollGroup). ---- */
  if(pitched){
    const col=V.col||LANE_NOROLE_COL, wEnd=V.beat0+V.span;   // AR2: цвет роли — из снимка (тот же, что у строки дорожки)
    for(const g of (G?[G]:[])){
      for(const s of g.segs){
        const en = s.end==null ? wEnd : s.end;
        if(en<V.beat0||s.start>wEnd) continue;
        const x=laneBeatX(V,Math.max(s.start,V.beat0)), x2=laneBeatX(V,Math.min(en,wEnd));
        const w=Math.max(3,x2-x);
        /* U1: БЛОК НА КАЖДУЮ ЗВУЧАЩУЮ НОТУ (у баса — одна, у аккорда — все его ноты; на ряду или между рядами — rollSegRows). Имя
           аккорда на блоке снято решением пользователя: ноты видны сами. Выделение и ручка длины — у ВСЕХ нот выделенного аккорда:
           выделен аккорд ЦЕЛИКОМ (выбор отдельной ноты — U2). */
        /* ⛳ U2: ДВА УРОВНЯ ВЫДЕЛЕНИЯ. rollSel — весь аккорд (все ноты белые, как в U1); rollSelNote — ОДНА нота (белая только она,
           прочие ноты этого аккорда — в своём цвете с тонким белым контуром: видно, из какого аккорда нота). Ручка длины — у всего
           аккорда и (U3) у одной выделенной ноты: её длина правится отдельно, аккорд при этом распадается.
           ⛳ U2: НОТА ВНЕ РЯДА (dev ≠ null — между ступенями лада) видна безошибочно, двумя знаками, спокойно: блок СВЕТЛЕЕ (заливка
           приглушена) и обведён контуром цвета роли; на блоке — отступление в центах от ближайшей ступени ЭТОГО лада («−22»), если
           влезает, иначе — рядом с блоком, когда он выделен (rollDevLbl). Мера — лад, не равномерная темперация (chRowOfFreq). */
        const h=V.rowH*0.7, vol=Math.max(0,Math.min(1,s.vol==null?1:s.vol)), chSel=s.ev===rollSel||rollSelMany.has(s.ev), one=s.ev===rollSel&&rollSelNote!=null;   // ED1: a member of a group selection is white too
        rollSegNotes(s,AX,V.total).forEach((nt,i)=>{
          const r=nt.r;
          if(r<row0-0.5||r>row0+rows-0.5) return;                      // за краем видимых рядов (и не залезать на линейку)
          const y=rollRowY(V,r)+(V.rowH-h)/2, off=nt.dev!=null, sel=chSel&&(!one||i===rollSelNote);
          ctx.fillStyle = sel ? (off?'rgba(255,255,255,.72)':'#fff') : hexA(col, (0.35+0.55*vol)*(off?0.45:1));
          ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.fill();
          if(off&&!sel){ ctx.strokeStyle=hexA(col,.95); ctx.lineWidth=1.25; ctx.beginPath(); ctx.roundRect(x+0.6,y+0.6,w-1.2,h-1.2,3); ctx.stroke(); }
          if(sel){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(x-2,y-2,w+4,h+4,4); ctx.stroke();
            /* РУЧКА ДЛИНЫ — только у ВЫДЕЛЕННОГО и только там, где тянуть есть за что (есть endEv и блок
               шире порога). Показываем на выделенном, а не на всех: иначе каждая нота обрастала бы засечкой. */
            if(s.endEv && w>=ROLL_EDGE_MIN_W && !rollSelMany.size){ ctx.fillStyle=hexA(col,.95); ctx.fillRect(x+w-3,y+2,3,h-4); } }   // U3: и у ОДНОЙ выделенной ноты — её длина правится отдельно (sel истинно только у неё)
          else if(one){ ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x-1.5,y-1.5,w+3,h+3,4); ctx.stroke(); }
          if(off) rollDevLbl(x,y,w,h,nt.dev,sel);
        });
        /* ⛳ S5: КРИВАЯ БЕНДА поверх блока терменвокса — СТУПЕНЯМИ, как её играет переигровка (каждая точка — setFreq с τ 20 мс: значение
           держится до следующей точки), последняя держится до конца блока. Блок остаётся целью попадания (rollHit кривую не знает). Вершины
           ближе полупикселя по x сливаются (на мелком масштабе длинная запись — не тысячи отрезков), вертикаль — клипом поля сетки. */
        const BP=w>=ROLL_BEND_MIN_W ? rollBendPts(s,AX,V.total) : null;
        if(BP){
          ctx.save(); ctx.beginPath(); ctx.rect(x,gy0,w,gy1-gy0); ctx.clip();
          ctx.strokeStyle = (s.ev===rollSel||rollSelMany.has(s.ev)) ? 'rgba(20,20,32,.85)' : 'rgba(255,255,255,.92)'; ctx.lineWidth=1.5;
          const cy=r=>rollRowY(V,r)+V.rowH/2;
          bendStroke(V,BP.path||BP,x,x2,cy(rollSegRoot(s,AX)),cy); ctx.restore();   // BEND-CURVE: steps where it steps, the glide law where it glides
          if(s.ev===rollSel && s.first && !rollSelMany.size) rollBendHandles(V,s,AX,BP,x,x2,cy);   // OWN2: the selected theremin note's points
        }
      }
    }
  }
  /* ---- ПРИЗРАК ПЕРЕТАСКИВАНИЯ (S5.1): пока палец ведёт, СОБЫТИЕ НЕ ТРОНУТО. Пунктир показывает, куда
     удар встанет после отпускания — по тем же laneBeatX/rollRowY, что и настоящие удары, поэтому
     обещание призрака и результат правки совпадают по построению. ---- */
  if(rollDrag&&rollDrag.ev){
    /* U1: у АККОРДА призрак — ВСЕ его ноты, сдвинутые на столько рядов, на сколько палец увёл взятую ноту (rollDrag.row − grabRow):
       ровно так ui и перенесёт корень. У баса и удара — один блок, как было (grabRow там равен ряду, сдвиг — сам ряд). */
    /* U3: rollDrag.note — тянут ОДНУ ноту аккорда (перенос во времени или длина): призрак — только её блок, на её же ряду (или между
       рядами — та же rollSegNotes, что нарисовала блок). U4: rollDrag.prow — ЦЕЛЕВОЙ ряд при переносе по высоте (null — высота прежняя):
       призрак стоит ровно на нём — туда нота и ляжет в канонической форме ряда. */
    /* ⛳ T3: ПРИЗРАК ЦЕЛОГО ПЕРЕНОСА — ТАМ, КУДА ЛЯЖЕТ РЕЗУЛЬТАТ. Цель — rollDragTarget (ряд корня + сдвиг пальца; с T5 без прилипания
       к яркому ряду, и высота прежняя, пока палец не ушёл с ряда) — ТА ЖЕ функция, по которой ui кладёт правку (правило #9). У аккорда призрак — ноты аккорда, построенного
       на этом корне (rollSegNotes того же сегмента с новой ступенью/регистром): прежде ноты сдвигались на число рядов, и у тонов вне
       ряда (тоны-отношения) или после прилипания к яркому ряду призрак разошёлся бы с результатом. У баса — сам целевой ряд. */
    const gseg = pitched ? songSegs().byEv.get(rollDrag.ev) : null;
    const oneGhost = gseg && gseg.role==='ch' && gseg.ev===rollDrag.ev && rollDrag.note!=null;
    const chordGhost = gseg && gseg.role==='ch' && gseg.ev===rollDrag.ev && (rollDrag.grabRow!=null || oneGhost);
    let ghostRows;
    if(oneGhost) ghostRows = rollDrag.prow!=null ? [rollDrag.prow] : rollSegNotes(gseg,AX,V.total).filter((nt,i)=>i===rollDrag.note).map(nt=>nt.r);
    else if(pitched && rollDrag.rootRow!=null){
      const T=rollDragTarget(rollDrag,gseg), pit=T.pit;   // T5: та же цель, что у правки (ui), — приглушённый ряд тоже
      ghostRows = (gseg && pit) ? rollSegRows(rollGhostSeg(gseg,pit), AX, V.total) : [T.row];   // T5: и у баса — место ноты той же rollSegNotes (у оси «Лад» нота вне лада, перенесённая только во времени, стоит между рядами)   // T4b3: призрак — с индексом, который поставит правка
    }else ghostRows=[rollDrag.row|0];
    const gx=laneBeatX(V,rollDrag.t), gh=V.rowH*(pitched?0.7:0.62);
    /* Призрак ладовой роли держит ДЛИНУ сегмента (rollDrag.len), у удара длины нет — там блок привязки. */
    const gw = pitched ? Math.max(3, laneBeatX(V,rollDrag.t+(rollDrag.len||1))-gx) : blkW;
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.setLineDash([3,3]);
    for(const gr of ghostRows){
      if(chordGhost ? (gr<row0-0.5||gr>row0+rows-0.5) : !(gr>=row0&&gr<row0+rows)) continue;
      const gy=rollRowY(V,gr)+(V.rowH-gh)/2;
      ctx.beginPath(); ctx.roundRect(gx,gy,gw,gh,3); ctx.stroke();   // призрак — ТОТ ЖЕ блок, что и настоящая нота
    }
    ctx.setLineDash([]);
  }
  /* ED1: GROUP GHOST — every selected note where the group move puts it: dt beats later, dr rows up (pitch through rollShiftPit, the
     function the edit reads — rule #9). */
  if(rollDrag&&rollDrag.many){
    const {dt,dr}=rollDrag, isSel=e=>e===rollSel||rollSelMany.has(e);
    const box=(gx,gr,gw,gh)=>{ if(gr<row0-0.5||gr>row0+rows-0.5) return; const gy=rollRowY(V,gr)+(V.rowH-gh)/2; ctx.beginPath(); ctx.roundRect(gx,gy,gw,gh,3); ctx.stroke(); };
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.setLineDash([3,3]);
    if(pitched && G) for(const s of G.segs){ if(!isSel(s.ev)) continue;
      const pit= dr ? rollShiftPit(s,dr) : null; if(dr && !pit) continue;
      const gx=laneBeatX(V,s.start+dt), gw=Math.max(3,laneBeatX(V,(s.end==null?s.start+1:s.end)+dt)-gx);
      for(const gr of rollSegRows(pit ? rollGhostSeg(s,pit) : s, AX, V.total)) box(gx,gr,gw,V.rowH*0.7); }
    else if(!pitched) for(const ev of hits) if(isSel(ev)) box(laneBeatX(V,ev.t+dt), (ev.a.row|0)+dr, blkW, V.rowH*0.62);
    ctx.setLineDash([]);
  }
  /* ED1: the selection box being drawn. */
  if(rollBox){ const b=rollBox, bx=Math.min(b.x0,b.x1), by=Math.min(b.y0,b.y1), bw=Math.abs(b.x1-b.x0), bh=Math.abs(b.y1-b.y0);
    ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.strokeRect(bx,by,bw,bh); ctx.setLineDash([]); }
  /* ⛳ O-4: ПОЛОСА — ДО БЕГУНКА. Она своё поле и заливает свой фон; нарисуй мы её после, фон лёг бы
     поверх бегунка ровно на её высоте, и линия времени разорвалась бы посреди экрана. */
  if(V.aut) drawAutLane(V,ly);
  /* ---- БЕГУНОК: теперь виден И НА ОСТАНОВЛЕННОМ транспорте (S5.2). Без этого перемотка была бы слепой:
     тапнул по линейке — и не видно, куда встал. Играет — яркий, стоит — приглушённый; доля берётся из
     того же loop.pos, с которого ▶ продолжит (onLoop). Треугольник-ручка сидит в линейке. ---- */
  const info=loopPos();
  const playing=!!(info&&info.phase==='play');
  const phBeat= playing ? info.pos : Math.max(0,loop.pos);
  if(phBeat>=V.beat0&&phBeat<=V.beat0+V.span){
    const px=laneBeatX(V,phBeat), col= playing ? '#57d9a3' : 'rgba(87,217,163,.55)';
    ctx.strokeStyle=col; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(px,V.ry0); ctx.lineTo(px, V.aut?V.aut.y1:gy1); ctx.stroke();   // O-4: сквозь ОБА поля — время у них одно, и линия обязана это показывать
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(px-5,V.ry0); ctx.lineTo(px+5,V.ry0); ctx.lineTo(px,V.ry0+7); ctx.closePath(); ctx.fill();
  }
  // ---- рамка поля и подсказка/пустота ----
  ctx.strokeStyle= rollIns ? hexA(INSTR_COL.dr,.75) : rollPick ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.14)';   // ED1: pick mode shows on the canvas too   // режим вставки виден и на холсте, а не только по кнопке: тап здесь СОЗДАЁТ удар
  ctx.lineWidth= (rollIns||rollPick) ? 2 : 1;
  ctx.strokeRect(V.x0,gy0,V.bw,gy1-gy0);
  ctx.textAlign='center'; ctx.font='12px system-ui';
  /* T4: «пусто» значит одно — в ДОРОЖКЕ не осталось нот (роль у неё одна, «нет этой роли» больше не бывает). */
  const emptyTrack = noRole || (pitched ? !G : !hits.length);
  if(ly==null||noEdit||emptyTrack){
    ctx.fillStyle='rgba(255,255,255,.55)';
    ctx.fillText(ly==null ? t('roll.noTrack') : t('roll.emptyTrack'), V.x0+V.bw/2, (gy0+gy1)/2);   // S4: «роль — позже» снята (правимы все роли)
  }
  /* ⛔ ПРИВЯЗКУ ЗАДАЁМ ЯВНО, А НЕ НАСЛЕДУЕМ. Отсюда и родился баг: textBaseline ставился на 'middle' у
     подписей рядов ~170 строк выше, и одно и то же число y значило здесь не то, что читалось при чтении
     кода. Подвал теперь объявляет своё состояние сам — как и всякий, кто рисует далеко от источника. */
  ctx.textBaseline='middle'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,.34)'; ctx.font='10px system-ui';
  ctx.fillText(t('roll.hint'), V.x0+V.bw/2, gy1+ROLL_FOOT_STEP);
  /* ⛳ ЧТО У ДОРОЖКИ ЗАХВАЧЕНО (слайс O-2) — ЕДИНСТВЕННЫЙ сегодняшний читатель реестра захвата.
     Захват сам по себе НЕВИДИМ (его пока никто не исполняет), а невидимое нельзя проверить — поэтому
     одна строка в углу: чем дорожка записана и сколько точек автоматизации под ней лежит.
     ⚠️ ЭТО НЕ ОТЛАДКА НА ВЫБРОС: та же строка — зародыш будущего «заморожено с …», который обязан будет
     сказать человеку, ЧЕМ вплавлен звук. Потому и стоит у края поля, а не поверх нот.
     ⛳ СТРОКА ГОВОРИТ ПРО ОТКРЫТУЮ ДОРОЖКУ, А НЕ ПРО ПРИЛОЖЕНИЕ. Прежде она объединяла цепи ВСЕХ
     владельцев, и басовая дорожка рекламировала делей соло и яркость аккордов — то есть врала о том
     единственном, о чём её спрашивают. Отбор по цепи дорожки делает captureInfoOf (см. его шапку).
     ⛳ T4: РОЛЬ ОДНА — она и названа («бас: …»). Слитого списка нескольких ролей больше не бывает. */
  {
    const cap=captureInfoOf(ly);
    if(cap){
      const rn=t('role.'+cap.role);
      const nm=cap.fx.map(fxTitleOf).join(' · ');   // ⛳ ТА ЖЕ резолюция имени, что в меню эффектов (см. fxTitleOf выше): старые скаляры больше не выводятся сырым id
      ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,.28)';
      ctx.fillText(cap.fx.length ? t('roll.cap',{role:rn,fx:nm,n:cap.pts}) : t('roll.capNone',{role:rn}),
                   V.x0, gy1+ROLL_FOOT_STEP*2);
    }
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ПОПАДАНИЕ — ИЗ ТОГО ЖЕ rollView, что нарисован (правило #9). Возвращает удар под пальцем
   ({what:'hit', ev}) либо клетку ({what:'grid', row, beat}) — вторая в S5.0 ничего не делает и
   существует затем, чтобы вставка в следующем слайсе не заводила ВТОРУЮ геометрию попадания.
   ⚠️ Допуск по времени — в ПИКСЕЛЯХ (ROLL_HIT_PX), переведённых в доли текущего масштаба: на любом
   зуме палец берёт то, что видит, а не «долю ± константа». */
export function rollHit(px,py){
  const V=rollView; if(!V) return null;
  if(px<V.x0-8||px>V.x0+V.bw+8) return null;
  const beat=laneBeatAt(V,px);
  if(py>=V.ry0 && py<V.gy0) return { what:'ruler', beat };   // S5.2: ЛИНЕЙКА — своя цель; её низ = верх сетки, пересечься они не могут
  /* ⛳ O-4: ПОЛОСА АВТОМАТИЗАЦИИ — своя цель, по ТОМУ ЖЕ снимку (V.aut), что её нарисовал. Её верх ниже
     низа сетки на зазор, поэтому перепутать поля нельзя: одна точка экрана принадлежит ровно одному.
     Отдаём и ВЗЯТУЮ ТОЧКУ (если палец на ней), и голое место — вставке нужно второе, переносу первое. */
  if(V.aut && py>=V.aut.y0-4 && py<=V.aut.y1+4){
    const v=autVAt(V,py), ly=rollTrackLayer();
    if(!rollAut||ly==null) return { what:'autgrid', beat, v };
    if(V.aut.bars){   // ED5: bars face — the nearest drawn bar by x (anywhere on its height); a tie takes the nearer head
      let best=null, bd=Infinity;
      for(const r of V.aut.bars){ const dx=Math.abs(r.x-px); if(dx>ROLL_HIT_PX) continue;
        const d=dx+Math.abs(autY(V,r.b.v)-py)*1e-3; if(d<bd){ bd=d; best=r; } }
      return best ? { what:'autbar', bar:best.b, beat, v } : { what:'autgrid', beat, v, bars:true };
    }
    const D=autPoints(ly,rollAut.key,rollAut.fx,rollAut.p);
    const tolX=ROLL_HIT_PX, tolY=ROLL_HIT_PX;
    let best=null, bd=Infinity;
    for(const r of D.pts){
      const dx=laneBeatX(V,r.pt.t)-px, dy=autY(V,r.pt.v)-py, d=Math.hypot(dx,dy);
      if(d<bd){ bd=d; best=r; }
    }
    if(best && bd<=Math.max(tolX,tolY)) return { what:'autpt', rec:best, beat, v };
    { const m=V.aut.mid; if(m && Math.hypot(m.x-px,m.y-py)<=ROLL_HIT_PX) return { what:'autmid', rec:m.rec, v0:m.v0, v1:m.v1, beat, v }; }   // BEND-CURVE
    return { what:'autgrid', beat, v };
  }
  if(V.bend){ for(const q of V.bend.pts) if(Math.hypot(q.x-px,q.y-py)<=ROLL_HIT_PX) return { what:'bendpt', ev:V.bend.ev, i:q.i, dt:q.dt, c:q.c, beat };   // OWN2: a point of the selected theremin note's curve
    for(const m of V.bend.mids) if(Math.hypot(m.x-px,m.y-py)<=ROLL_HIT_PX) return { what:'bendmid', ev:V.bend.ev, i:m.i, beat };   // BEND-CURVE: a glide's middle handle
  }
  if(V.noEdit) return null;                            // неправимая роль: поле нот НЕ цель — ни выбора, ни вставки (линейка и полоса выше — живы)
  const r=rollRowAt(V,py);
  const row0=V.row0||0;
  if(r<row0||r>=row0+V.rows) return null;
  /* S5.5: у ладовой роли попадание идёт по СЕГМЕНТАМ (у них есть длина), у ударных — по блоку привязки.
     Призраки чужих ладов НЕ ловим: их ступень измерена не этой осью, трогать её можно лишь переключив ось. */
  if(V.pitched){
    /* U1: палец ловит ЛЮБУЮ ноту сегмента — у аккорда их несколько, и бывают они МЕЖДУ рядами (rollSegRows — та же функция, что
       нарисовала блоки, правило #9). Ряд пальца — дробный (центр ряда = целое), нота поймана, если она ближе полуряда. Пойманная нота
       выделяет ВЕСЬ аккорд (h.ev — его определяющее событие); rootRow — ряд корня: ui переносит корень на столько рядов, на сколько
       палец ушёл от ряда, где взялся (row). У баса нота одна, rootRow = row — всё как было.
       U2: кроме того отдаётся НОМЕР пойманной ноты (note) и число нот (n) — по ним ui ставит второй уровень выделения (одна нота). */
    const SV=songSegs(), ly=rollTrackLayer(), tol=ROLL_HIT_PX*V.span/V.bw;
    const rp=row0+V.rows-1-((py-V.gy0)/V.rowH-0.5);
    let best=null, bd=Infinity, bdr=Infinity, bRoot=null, bNote=0, bN=1, bNr=null, bOff=false;
    for(const s of SV.segs){
      if(s.layer!==ly||s.role!==rollRole||s.sc!==V.sc) continue;
      const en = s.end==null ? V.beat0+V.span : s.end;
      const d = beat<s.start ? s.start-beat : beat>en ? beat-en : 0;
      if(d>tol) continue;
      const ns=rollSegNotes(s,V.axis,V.total), {ni,dr}=rollSegPick(ns,rp);   // U4: и отступление (dev) — нота ВНЕ ряда ли (по ней ui решает, прилипать ли)
      if(dr>0.5) continue;
      /* U2: rootRow — ряд ПАРЫ корня (ступень, регистр), а не ряд ноты 0: у однонотного аккорда (распад) нота 0 — не корень.
         note — номер пойманной ноты (порядок scales.chordNotes = порядок блоков), n — сколько нот у аккорда: по ним ui решает
         второй уровень выделения. */
      if(d<bd || (d===bd && dr<bdr)){ bd=d; bdr=dr; best=s; bRoot=rollSegRoot(s,V.axis); bNote=ni; bN=ns.length; bNr=ns[ni].r; bOff=ns[ni].dev!=null; }   // T4b3: ряд корня — из хранимой пары (индекс, регистр)
    }
    if(!(best&&bd<=tol)) return { what:'grid', row:r, beat };
    /* ⛳ КРАЙ ИЛИ СЕРЕДИНА (S5.6) — решаем ЗДЕСЬ, из той же геометрии, что нарисована: зона края не шире
       40% блока и не шире ROLL_EDGE_PX, у узких блоков её нет вовсе, и нет её у сегментов без endEv
       (открытый сегмент или конец, принадлежащий чужой ноте, — тянуть нечего). */
    const en = best.end==null ? null : best.end;
    const wpx = en==null ? Infinity : (en-best.start)*V.bw/V.span;
    const zoneB = (best.endEv && en!=null && wpx>=ROLL_EDGE_MIN_W)
                ? Math.min(ROLL_EDGE_PX, wpx*0.4)*V.span/V.bw : 0;
    return { what:'seg', seg:best, ev:best.ev, row:r, rootRow:bRoot, note:bNote, n:bN, nr:bNr, off:bOff, beat, edge: zoneB>0 && beat>=en-zoneB };   // U4: nr — ряд пойманной ноты (дробный, если она между рядами), off — она вне ряда
  }
  /* S5.2: попадание считаем по ВСЕМУ нарисованному блоку [t, t+блок], а не по расстоянию до доли, —
     иначе палец, положенный на видимый хвост блока, промахивался бы мимо него. Допуск ROLL_HIT_PX
     остаётся и добавляется с обеих сторон: он и ловит блоки уже пальца на общем плане. */
  const hits=rollHits(), tol=ROLL_HIT_PX*V.span/V.bw, blk=rollBlockBeats(V);
  let best=null, bd=Infinity;
  for(let i=rollLower(hits,beat-blk-tol); i<hits.length && hits[i].t<=beat+tol; i++){
    const ev=hits[i]; if((ev.a.row|0)!==r) continue;
    const d = beat<ev.t ? ev.t-beat : beat>ev.t+blk ? beat-(ev.t+blk) : 0;   // 0 — палец ВНУТРИ блока
    if(d<bd){ bd=d; best=ev; }
  }
  return best&&bd<=tol ? { what:'hit', ev:best, row:r, beat } : { what:'grid', row:r, beat };
}
/* ED1: the pitch a segment takes when a group moves dr rows — its root row on the axis plus dr, read back as a pitch of the tuning (the
   ghost and the edit read this one function, rule #9). null = off the axis or outside the registers. */
export function rollShiftPit(seg,dr){ const V=rollView, ax=V&&V.axis; if(!ax||!seg) return null;
  const r=Math.round(rollSegRoot(seg,ax)+dr); if(!Number.isFinite(r)||r<0) return null;
  const p=ax.pitchOf(r); return p && p.oct>=0 && p.oct<REG_N ? p : null; }
/* ED1: notes under a box (canvas px), blocks exactly as drawn (same snapshot and functions) → segment heads or drum hits. */
export function rollBoxHits(b){
  const V=rollView; if(!V||V.noEdit||!b) return [];
  const x0=Math.min(b.x0,b.x1), x1=Math.max(b.x0,b.x1), y0=Math.min(b.y0,b.y1), y1=Math.max(b.y0,b.y1), row0=V.row0||0, out=[];
  const meet=(bx,by,bw,bh)=> bx<=x1 && bx+bw>=x0 && by<=y1 && by+bh>=y0;
  if(V.pitched){ const G=rollGroup(); if(!G) return out; const wEnd=V.beat0+V.span, h=V.rowH*0.7;
    for(const s of G.segs){ const en=s.end==null?wEnd:s.end; if(en<V.beat0||s.start>wEnd) continue;
      const x=laneBeatX(V,Math.max(s.start,V.beat0)), w=Math.max(3,laneBeatX(V,Math.min(en,wEnd))-x);
      if(rollSegNotes(s,V.axis,V.total).some(nt=> nt.r>=row0-0.5 && nt.r<=row0+V.rows-0.5 && meet(x, rollRowY(V,nt.r)+(V.rowH-h)/2, w, h))) out.push(s.ev); }
    return out; }
  const blk=rollBlockPx(V), h=V.rowH*0.62;
  for(const ev of rollHits()){ const r=ev.a.row|0; if(r<0||r>=V.rows) continue;
    if(meet(laneBeatX(V,ev.t), rollRowY(V,r)+(V.rowH-h)/2, blk, h)) out.push(ev); }
  return out;
}
/* ED1: every note of the open track (select all) — the segment heads of its one view, or its drum hits. */
export function rollSelectable(){ const V=rollView; if(!V||V.noEdit) return [];
  if(V.pitched){ const G=rollGroup(); return G ? G.segs.map(s=>s.ev) : []; }
  return rollHits().slice(); }
/* Габариты окна для ЖЕСТА прокрутки/зума: ui якорит по НИМ, а пишет через сеттеры state — поэтому
   палец, рисунок и попадание читают одно и то же число (следующий кадр строит снимок из него же). */
export function rollGeom(){ const V=rollView;
  return V ? { x0:V.x0, bw:V.bw, beat0:V.beat0, span:V.span, rowH:V.rowH, rows:V.rows, row0:V.row0||0, total:V.total||V.rows, pitched:!!V.pitched, sc:V.sc, aut:V.aut||null, col:V.col } : null; }
/* Привязка величины к десятым — ИЗ ТОГО ЖЕ снимка. Её зовёт ВСТАВКА точки (величина места тапа приходит
   готовой из rollHit); перенос идёт через rollAutDrive, у которого свой шаг. Второй копии шага в ui нет
   (правило #9): он часть ЭТОЙ оси, а не отдельная настройка. */
export const rollAutSnapV=v=>autSnapV(v);
/* Вид строя открытой дорожки — его читает вставка (в каком виде родится нота). T4c-2: группа одна (rollGroup); null — у дорожки
   нет нот этой роли (тогда вставка честно берёт живой вид). Отдаём КОПИЮ полей, а не внутренний кэш. */
export function rollTrackView(){ const G=rollGroup(); return G ? { sc:G.sc, sev:G.sev } : null; }
/* Ряд ↔ высота ДЛЯ ВСТАВКИ И ПЕРЕНОСА: ui знает ряд под пальцем, а расшифровать его в (ступень,регистр)
   обязана та же формула, по которой ряды нарисованы. T3: та же ОСЬ (снимок rollView, если лад тот же). ⛳ T5: приглушённый ряд — тоже
   высота строя ({ti, oct}); null — только у дробного ряда. Вставка (с U5) — тоже на любой ряд, без прилипания. */
const axisFor=s=>{ const V=rollView, sc=s||CUR(); return (V&&V.axis&&V.axis.sc===sc) ? V.axis : rollAxis(sc); };
export function rollRowPitch(r,s){ return axisFor(s).pitchOf(r); }
/* T3: есть ли у ОСИ открытой дорожки высоты строя вне лада — ui показывает кнопку «Все / Лад» только тогда. Лад — тот же, что у оси
   (показанная группа или живой лад), роль — ладовая и правимая: тот же расчёт, что в drawRoll, не по снимку прошлого кадра. */
export function rollAxisHasDim(){
  if(rollRole==null||rollRole==='dr'||!ROLL_EDITABLE.includes(rollRole)) return false;
  const G=rollGroup();
  return axisHasDim(G?G.sc:CUR());
}
/* ⛳ T4b4-1: НИЖНИЙ ВИДИМЫЙ РЯД ПО УМОЛЧАНИЮ — окно на РЕГИСТР reg (липкий регистр роли), из РЯДОВ НА РЕГИСТР ОСИ (ax.rpp), а не из
   iv.length+1: у оси «Все» рядов в регистре больше (вся высота строя), и прежняя формула открывала ролл не на том регистре (с T3).
   Ось — та же, что нарисует кадр (rollAxis вида и текущий «Все/Лад»). Окно не уходит выше верха обычной оси (REG_N регистров). */
export function rollDefaultRow0For(sc, reg, rows, ax=rollAxis(sc)){
  const dpo=ax.rpp, r=Math.max(0,Math.min(REG_N-1,reg|0));
  return Math.max(0, Math.min(r*dpo, REG_N*dpo-rows));
}
/* ⛳ T6a-2: ОСЬ, КОТОРУЮ НАРИСУЕТ СЛЕДУЮЩИЙ КАДР, — тем же выбором группы и тем же «Все/Лад», что drawRoll (по живому состоянию, а не
   по снимку прошлого кадра). ui спрашивает её ДО и ПОСЛЕ переключения, чтобы перевести прокрутку. */
export function rollAxisNow(){
  const G=rollGroup();
  return rollAxis(G?G.sc:CUR());
}
/* ⛳ T6a-2: ПРОКРУТКА ЧЕРЕЗ ПЕРЕКЛЮЧЕНИЕ ОСИ — держим то, на что смотрел человек. Якорь — СРЕДНИЙ видимый ряд окна (row0 + ⌊rows/2⌋);
   новое окно ставится так, чтобы якорь остался на ТОМ ЖЕ месте окна (смещение off сохраняется; зажим в [0, total−rows] делает снимок).
     how='pitch' — «Все» ↔ «Лад» (ОДИН вид, меняются только ряды): якорь — ВЫСОТА. Приглушённый ряд прилипает к ближайшей ступени лада
       (snap — та же функция, что у правки), и ряд этой ступени в новой оси — rowOfTi той же пары (индекс, регистр; T4c-1). Из «Лад» в «Все» высота
       точная; из «Все» в «Лад» у приглушённого якоря — соседняя ступень (на ряд рядом).
     how='reg'   — (снят в T4c-2 вместе с чипом лада) чип лада (ДРУГОЙ вид, высоты разных ладов не сравниваем — индекс осмыслен только в своём виде): якорь — РЕГИСТР и доля
       внутри него.
   Прежде row0 переносился как число, и в оси с другим числом рядов на регистр окно уезжало в другой регистр. */
export function rollRow0Across(ax0,ax1,row0,rows){   // T4c-2: только «Все» ↔ «Лад» (how='pitch'); ветка чипа лада снята вместе с ним
  const mid=row0+Math.floor(rows/2), off=mid-row0;
  const pt=ax0.pitchOf(ax0.snap(mid)), r1=pt ? ax1.rowOfTi(pt.ti,pt.oct) : undefined, nr = r1!==undefined ? r1 : mid;   // T4c-1: та же высота — индексом (один вид)
  return Math.max(0, nr-off);
}
/* (T3: rollSnapRow — ближайший ЯРКИЙ ряд для правки и вставки; снят в U5: ни перенос, ни вставка больше не прилипают. Прилипание оси
   — ax.snap — осталось только у прокрутки через «Все/Лад», rollRow0Across.) */
/* ⛳ ЦЕЛЬ ПЕРЕНОСА ЦЕЛОГО СЕГМЕНТА → { row, pit }: ряд корня + сдвиг пальца (ряд пальца − ряд, где взялся) и высота этого ряда.
   ОДНА функция на призрак (draw) и на правку (ui) — правило #9. У баса ряд корня = ряд, где взялся, — целевой ряд = ряд пальца.
   ⛳ T5: БЕЗ ПРИЛИПАНИЯ — приглушённый ряд такая же цель, как яркий (прежде — rollSnapRow). Палец не ушёл с ряда — высота ПРЕЖНЯЯ
   (пара сегмента, не расшифровка ряда): у оси «Лад» нота вне лада стоит между рядами (дробный ряд), и перенос во времени не смеет
   уронить её на ступень. Ушёл — ряд округляется до целого (у целого ряда корня это ровно прежняя формула). */
export function rollDragTarget(d,seg){
  if((d.row|0)===d.grabRow) return { row:d.rootRow, pit: seg ? { ti:seg.ti, oct:seg.oct } : null };
  const row=Math.round(d.rootRow+((d.row|0)-d.grabRow)), V=rollView;
  return { row, pit: (V&&V.axis) ? V.axis.pitchOf(row) : null };
}
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (scaleprobe): пути рядов редактора без открытого редактора. reset — сброс кэша частот рядов аккордов (с T4b4-1
   ответ от истории кэша не зависит — проба это и проверяет). defRow0 — нижний видимый ряд по умолчанию (T4b4-1).
   ⛳ T4c-2: прежние ряды по ступени ушли в пробу (её «замороженные опоры»); им нужны частоты рядов оси (rowFreqs), место частоты среди
   них (rowOfFreq) и допуск «на ряду» (onRowCents) — ТЕ ЖЕ функции и число, что у рисунка, отдаются здесь. */
export const rollRowsProbe={ noteLbl, axisLbl,   // F0: подписи ступени и ряда оси — для снимка P.dumpScales
  axis:rollAxis, root:rollSegRoot, notes:rollSegNotes, total:chordTotalWith, pick:rollSegPick, ghost:rollGhostSeg,
  defRow0:rollDefaultRow0For, across:rollRow0Across, rowFreqs:chRowFreqs, rowOfFreq:chRowOfFreq, onRowCents:ROLL_ON_ROW_CENTS,
  reset:()=>{ chRowCache={ key:null, F:null }; } };

export { drawRoll };
