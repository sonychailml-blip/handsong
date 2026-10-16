/* DRAW1 (DAY run 2026-10-16): the play strip, the arrangement window and the mixer (drawLooper, loopView, their hit tests and probes) — moved from draw.js verbatim (draw.js is the facade). Canvas only; nothing visible changed. */
import { ctx, canvas } from '../vision.js';
import { chordNotesAt, leadFreqTi, bassFreqTi } from '../scales.js';
import { t, L, lang } from '../i18n.js';
import { sy, rollBeat0, rollSpan, secSel, laneRow0, arrFace, laneDrag } from '../state.js';
import { INSTR_COL, LANE_NOROLE_COL } from '../config.js';
import { DRUM_ROWS, timbresOf, masterLevel, masterMeter } from '../audio.js';
import { hooks } from '../hooks.js';
import { recording, loop, events, loopPos, recLayers, isRecLayer, beatLevel, songBeats, laneMuted, laneSoloed, laneSoloOn, cycling, armedLayer, laneDelPendingLayer, songNotes, songSegs, sections, histCanUndo, laneLevelOf, lanePanOf, laneNameOf, laneOrder, laneLook } from '../recorder.js';
import { LOOP_EMPTY_TOP, ROLL_BAR_H, ROLL_TP_H, emptyTpOld, hexA, laneBeatAt, laneBeatX, syncLoopTransport } from './common.js';

/* ================= ВИЗУАЛИЗАЦИЯ ЛУПЕРА =================
   Полоса-транспорт сверху-по-центру: сетка тактов/долей, бегунок позиции,
   по строке на слой с метками событий (соло — оранжевые, аккорды — сиреневые).
   Видна только когда есть петля или идёт запись; иначе не мешает синтезатору. */

/* ⛳ ПРЕОБРАЗОВАНИЕ «ДОЛЯ ↔ ПИКСЕЛЬ» — ЕДИНЫЙ ИСТОЧНИК ДЛЯ РИСОВАНИЯ И ПОПАДАНИЯ (правило #9).
   Заводится СЕЙЧАС, хотя масштаб пока ровно один (вся петля в ширину полосы) и управлять им нечем:
   всё, что придёт в полосу дальше (прокрутка, зум, пиано-ролл, перетаскивание событий), обязано
   попадать туда же, куда рисует. Две независимые копии геометрии — ровно та ошибка, от которой
   правило #9 и написано; дешевле завести одну ТЕПЕРЬ, пока потребитель один.
   ⚠️ ВЫРАЖЕНИЕ ОСТАВЛЕНО ДОСЛОВНО ПРЕЖНИМ — x0 + bw*(доля/span). Алгебраически это то же, что
   «доля/шаг», но НЕ то же в плавающей точке, а картинка обязана остаться прежней.
   loopView — снимок геометрии ПОСЛЕДНЕГО нарисованного кадра полосы; null, когда полосы нет. */
let loopView=null;
const loopViewClear=()=>{ loopView=null; };   // DRAW1: the one writer outside this module (the editor and a video clip hide the strip)
/* Ширина гнезда переключателя и зазор. Нарисованная кнопка мельче гнезда — палец толще буквы. */
const LANE_TOG_W=21, LANE_TOG_GAP=2;
/* ✕ удаления (S3.5d) — третьим гнездом, но ОТСТУПЛЕН на LANE_DEL_GAP: соседство с S шириной в 2px делало бы
   промах «хотел соло — взвёл удаление» частым. Промах всё равно не разрушает (нужен второй тап), но
   отступ снимает большую часть ложных взводов. Зазор — мёртвая зона, тап в него не делает ничего. */
const LANE_DEL_GAP=6, LANE_DEL_COL='#e5484d';
const LANE_MUTE_COL='#e5a23c', LANE_SOLO_COL='#57d9a3';   // заглушено — янтарь (внимание), соло — тот же зелёный, что у «играет»
const LANE_OFF_A=0.34;                                    // прозрачность НЕСЛЫШНОЙ строки
/* Mark column of a strip row (E0-fix): between the name column and the lane, present only while a row is armed (the red dot).
   AF4: freezing shows nothing on the play strip (no ❄, no stale mark). */
const MARK_COL_W=28, ARM_DOT_X=7;
/* AF4: the arrangement window's freeze dot — at the right end of the row header; hollow = waiting to freeze, pulsing = rendering. */
const ARR_DOT_W=10, ARR_DOT_R=3, ARR_DOT_PULSE_MS=180;
/* ⛳ ПОЛОСА ДОРОЖЕК ПО ВЫСОТЕ ЭКРАНА (починка «дорожки дальше 16-й не видны»). Прежде коробка росла на rowH с каждой дорожкой БЕЗ
   ПРЕДЕЛА: на экране высотой ~400–450 px строки ниже ~16-й (и HTML-транспорт под коробкой — ▶, ⤺, ✎…) уходили за нижний край, и до
   них было не дотянуться ни тапом (вооружить, M/S, ✕), ни редактором (✎ открывает вооружённую дорожку). Теперь видимых строк — сколько
   влезает над транспортом; лишние листаются (перетаскивание строк, колесо). Строки НЕ сжимаем: 16 px — уже предел для трёх гнёзд под
   палец. Запас снизу — высота HTML-транспорта с зазором и подвалом (LOOP_TP_RESERVE). Пока все строки влезают — полоса байт-в-байт
   прежняя (ни подвала, ни полосы прокрутки). Жёсткого потолка числа дорожек нет. */
const LOOP_TP_RESERVE=60, LOOP_MIN_ROWS=3, LOOP_FOOT_H=14;
/* ⛳ AR1 — ОКНО АРАНЖИРОВКИ: ТА ЖЕ ПОЛОСА ДОРОЖЕК ВО ВЕСЬ ЭКРАН (drawLooper(true)), а не второй рисунок рядом. Один код и ОДИН снимок
   loopView (правило #9): попадание (loopHit), прокрутка строк (loopScroll), скоба и бегунок — те же функции, что у полосы игры. Разница
   только в параметрах: окно времени — ОБЩЕЕ с редактором дорожки (rollBeat0/rollSpan, а не «вся песня»), строки под палец (ARR_ROW_H),
   у строки колонка-заголовок «L# · роль · тембр» (ARR_HDR_*), кнопки M / S / ❄ шириной под палец (❄ — НАСТОЯЩАЯ кнопка: места теперь
   хватает), вместо рисок событий — МИНИАТЮРЫ нот (laneMini), полоса скобы выше (ARR_BRACE_H). Транспорт — сверху, под баром окна, как у
   редактора. ✕ удаления строки остаётся на полосе игры (ряду под палец нужен широкий отрезок времени). */
const ARR_ROW_H=40, ARR_BTN_W=36, ARR_BTN_GAP=4, ARR_HDR_MIN=100, ARR_HDR_MAX=170, ARR_BRACE_H=26, ARR_MARGIN=10;
const ARR_SEC_H=20;   // ED6: the sections band of the window (markers with names), between the header and the brace band   // AR2: колонка заголовка 92 → 100 (в ней теперь ещё ручка перестановки)
/* ⛳ AR2: ЗАГОЛОВОК СТРОКИ ОКНА — слева РУЧКА перестановки (ARR_HANDLE_W во всю высоту строки — под большой палец: 28 × 40, зона попадания та
   же), правее — ИМЯ дорожки цветом её роли и под ним «L#» (у переименованной — ещё «роль · тембр», чтобы имя по умолчанию не терялось). */
const ARR_HANDLE_W=28;
/* ⛳ AR2: КОЛОНКА ИМЕНИ НА ПОЛОСЕ ИГРЫ — внутри коробки, слева от линейки (до колонки значков): доля ширины полосы в пределах MIN…MAX px.
   Цена названа: линейка уже на эту ширину (на 380 px — 58 px: 261 → 203 px). Подпись «L1» левее коробки остаётся (её называет заголовок). */
const LANE_NAME_FR=0.17, LANE_NAME_MIN=48, LANE_NAME_MAX=100;
/* ⛳ AR2-fix: «L#» — ВНУТРИ КОЛОНКИ ИМЕНИ, а не левее коробки. Пользователь увидел: подписи L1, L2… торчали за рамкой полосы (они висели
   правее-налево от кромки x0−4, а рамка — x0−10; на 380 px им было некуда). Рамку растить некуда (на 380 px она и так в 10 px от краёв
   экрана), поэтому колонка ТА ЖЕ по ширине, в ней «L#» серым, за ним имя цветом роли, обрезанное многоточием по колонке — линейка не
   сужается (на 380 px — 203 px, как после AR2). Горизонталь полосы — ОДНА чистая функция ширины холста (stripCols): по ней рисует
   drawLooper и по ней же проба проверяет 360 / 380 / 768 / 1280 px (stripProbe) — у проверки и рисунка одна геометрия (правило #9). */
const LANE_NAME_FONT='600 9px system-ui', LANE_LBL_GAP=4, LANE_COL_PAD=3, STRIP_FRAME_PAD=10;
function stripCols(W, markW){
  const sw=Math.min(560,W-40), x0=(W-sw)/2;
  const togBand=LANE_TOG_W*3+LANE_TOG_GAP*2+LANE_DEL_GAP+6;
  const nameW=Math.round(Math.max(LANE_NAME_MIN, Math.min(LANE_NAME_MAX, sw*LANE_NAME_FR)));
  const mx0=x0+nameW, lx0=mx0+markW, bw=Math.max(60, sw-togBand-markW-nameW);
  return { sw, x0, togBand, nameW, mx0, lx0, bw, fx0:x0-STRIP_FRAME_PAD, fx1:x0+sw+STRIP_FRAME_PAD };
}
/* Где встанут «L#» и имя строки в колонке (шрифт ставится здесь же — меряет measureText). nm — то, что рисуется (обрезано по колонке);
   у совсем узкой колонки имени не остаётся места — тогда один «L#». */
function stripRowText(lid, C, name){
  ctx.font=LANE_NAME_FONT;
  const lbl='L'+(lid+1), lx=C.x0+LANE_COL_PAD, lw=ctx.measureText(lbl).width, nx=lx+lw+LANE_LBL_GAP, room=C.x0+C.nameW-LANE_COL_PAD-nx;
  const nm= room>8 ? arrClip(name, room) : '', nw= nm ? ctx.measureText(nm).width : 0;
  return { lbl, lblX0:lx, lblX1:lx+lw, nm, nameX0:nx, nameX1:nx+nw };
}
/* ⛳ AR2: ЦВЕТ И ИМЯ ДОРОЖКИ — ОДНИ на все виды (окно, микшер, полоса игры, редактор). Цвет — палитра ролей config.INSTR_COL (данные; почему
   она различается светлотой — там же); без роли (слой дрона) — нейтральный серый. Роль и тембр — recorder.laneLook (один проход, мемо).
   Имя — данное человеком (recorder.laneNameOf), иначе «роль · тембр» на языке интерфейса (тембр — единственный вход audio.timbresOf, T5);
   кэш имени по умолчанию — по (язык, роль, тембр, дрон): сочетаний единицы, а timbresOf строит список на каждый вызов. */
const laneRoleLook=ly=>{ const x=laneLook(ly); return x ? x.role : null; };
export const laneCol=ly=> INSTR_COL[laneRoleLook(ly)] || LANE_NOROLE_COL;
const defNameMemo=new Map();
export function laneDefName(ly){
  const x=laneLook(ly), role=x?x.role:null, tim=x?x.tim:null, k=lang+'|'+role+'|'+tim+'|'+(x&&x.drone?1:0);
  let s=defNameMemo.get(k); if(s!=null) return s;
  if(!role) s= x&&x.drone ? t('track.drone') : t('arr.noRole');
  else { const e=timbresOf(role).find(z=>z.id===tim||z.idx===tim); s=t('track.role.'+role)+(e?' · '+L(e.name):''); }   // TIM2: a track's timbre is an id
  defNameMemo.set(k,s); return s;
}
export const laneTitle=ly=> laneNameOf(ly) || laneDefName(ly);
/* ⛳ MX1 — ЛИЦО «МИКШЕР» ТОГО ЖЕ ОКНА (state.arrFace==='mix'): те же строки и порядок, в теле строки — ФЕЙДЕР уровня дорожки вместо
   миниатюр (тянуть пальцем вдоль; ход — от кромок дорожки на MIX_PAD), снизу — полоса МАСТЕРА (MIX_MASTER_H): фейдер уровня мастера,
   измеритель выхода и подавление лимитера. Бегунок — только в полосе скобы (не поверх фейдеров). */
const MIX_PAD=8, MIX_MASTER_H=64;
/* ⛳ MX2: ТЕЛО СТРОКИ ДЕЛИТСЯ — слева ФЕЙДЕР уровня, справа РУЧКА ПАНОРАМЫ шириной MIX_PAN_W (доля тела, в пределах MIX_PAN_MIN…MAX px).
   Ход ручки — [pfx0, pfx0+pfw] снимка, центр — его середина (метка «фиксации»); ui ведёт палец по тем же числам (правило #9). */
const MIX_PAN_W=0.36, MIX_PAN_MIN=84, MIX_PAN_MAX=180;
/* Подпись панорамы: «L 30» / «C» / «R 30» (en), «Л 30» / «Ц» / «П 30» (ru) — число шкалы −100…+100 без знака, сторона буквой. */
const panLbl=p=>{ const n=Math.round(Math.abs(p)*100); return n===0 ? t('mix.panC') : t(p<0?'mix.panL':'mix.panR',{n}); };
/* Подпись уровня: число шкалы (0…100, как у громкости ноты) и децибелы множителя v² (40·log10 v); 0 — тишина «−∞». */
const levelLbl=v=> Math.round(v*100)+' · '+(v<=0 ? '−∞' : (40*Math.log10(v)).toFixed(1).replace('-','−'))+' '+t('mix.db');
/* Кнопка дорожки: буква в рамке, залитая — когда включена. Буква, а не значок: на 380px значок в
   21px нечитаем, а места под подпись нет. Буквы локализованы (M/S ↔ М/С) — см. словари. */
function laneTog(x,ry,rowH,lbl,on,col,w=LANE_TOG_W){   // AR1: w — ширина гнезда (у окна аранжировки — под палец)
  const h=rowH-3, y=ry+1.5;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,3);
  ctx.fillStyle   = on ? col : 'rgba(255,255,255,.07)'; ctx.fill();
  ctx.strokeStyle = on ? col : 'rgba(255,255,255,.20)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle   = on ? '#0b0b14' : 'rgba(255,255,255,.60)';
  ctx.font= w>LANE_TOG_W ? '600 14px system-ui' : '600 10px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(lbl, x+w/2, y+h/2+0.5);
}
function drawLooper(full){   // AR1: full — окно аранжировки (во весь экран); без аргумента — полоса на экране игры, как была
  const FULL=!!full;
  if(!loop.on && !events.length){   // нет петли — полоса прячется (и попадать не во что)
    if(FULL){ ctx.fillStyle='#0b0b14'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='13px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(t('roll.refusedEmpty'), canvas.width/2, canvas.height/2); ctx.textBaseline='alphabetic'; ctx.textAlign='left';
      syncLoopTransport(true, ROLL_BAR_H+4); }
    else { const u=histCanUndo()&&!emptyTpOld; syncLoopTransport(u, LOOP_EMPTY_TOP, u); }   // ED7-fix2: nothing to show but something to undo — ↶ stays where the transport sits
    loopView=null; return; }
  const W=canvas.width, info=loopPos();
  /* ⛳ ЛИНЕЙНЫЙ ТАЙМЛАЙН (S3.3). Раньше полоса показывала ОДИН круг петли: total = такты×размер, и
     всё — сетка, метки, бегунок — делилось на эту фиксированную длину.
     Теперь показываем ВСЮ ПЕСНЮ ЦЕЛИКОМ: выбранное отображение — «вписать всё» (fit), без прокрутки и
     зума. Это честный минимум для слайса: масштаб ОДИН, управлять им нечем, и он не врёт — видно
     ровно столько, сколько записано.
     ⚠️ Окно РАСТЁТ по мере записи, поэтому при длинной песне метки густеют. Прокрутка и зум придут с
     таймлайном редактора; преобразование доля↔пиксель для них уже есть (S1, loopView/laneBeatX) и
     менять его не придётся — поменяется только span и beat0.
     span берём как максимум из трёх: длина песни, ТЕКУЩАЯ позиция (иначе во время записи бегунок
     упёрся бы в правый край и встал) и длина ПОДЛОЖКИ (пустая песня — не нулевой отрезок, на нём
     видно сетку тактов и куда ляжет 🎵). */
  const posNow=info?info.pos:0;
  /* ⚠️ posNow — ПЕСЕННАЯ доля (loopPos, S3.5b): при повторе она не растёт за конец скобы, поэтому и
     ширина больше не ползёт вслед за часами. loop.rgn.to — четвёртый член (S3.5b): «следующая» скоба
     округлена вверх до такта и может быть чуть длиннее материала — без него её правый край рисовался бы
     за линейкой. */
  const total=Math.max(songBeats(), posNow, loop.bars*loop.metre, loop.rgn.to);
  /* ⛳ AR1: ОКНО ВРЕМЕНИ. Полоса игры — вся песня (0…total, как была). Окно аранжировки — ОБЩЕЕ с редактором дорожки (rollBeat0/rollSpan):
     зум и прокрутка одни на оба экрана, открыл дорожку — тот же отрезок, вернулся — тот же. */
  const beat0= FULL ? rollBeat0 : 0, span= FULL ? rollSpan : total, Hc=canvas.height;
  const hdrW= FULL ? Math.round(Math.max(ARR_HDR_MIN, Math.min(ARR_HDR_MAX, W*0.22))) : 0;   // колонка заголовков строк окна
  const sw= FULL ? W-2*ARR_MARGIN-hdrW : Math.min(560,W-40), x0= FULL ? ARR_MARGIN+hdrW : (W-sw)/2;   // у окна x0 — начало дорожки (правее колонки заголовков)     // sw — ПОЛОСА ЦЕЛИКОМ (прежний bw): по ней считается коробка, и она не изменилась
  /* ⛳ МЕСТО ПОД ПЕРЕКЛЮЧАТЕЛИ ОТРЕЗАЕМ ОТ ЛИНЕЙКИ ВРЕМЕНИ, А НЕ ОТ КОРОБКИ, и слева его взять нельзя:
     на телефоне 380px коробка уже упирается в кромки (x0=20), а подпись слоя («L1») висит ЛЕВЕЕ неё.
     Поэтому кнопки идут СПРАВА внутри коробки, а линейка ровно на столько же короче.
     ⚠️ ЦЕНА ВИДИМАЯ И НАЗВАННАЯ: сетка долей, метки событий и бегунок стали уже. Но ВСЕ ТРИ одинаково —
     они считаются из ОДНОГО loopView, поэтому разъехаться не могут (правило #9). */
  const togBand= FULL ? ARR_BTN_W*2+ARR_BTN_GAP+8 : LANE_TOG_W*3+LANE_TOG_GAP*2+LANE_DEL_GAP+6;   // window: M, S (AF4: ❄ removed); strip: M, S, ✕ + gaps
  const nIds=new Set(events.map(e=>e.layer)).size;   // дорожек с событиями — для заголовка («N дорожек»)
  /* ⛳ AR2: СТРОКИ — В ПОРЯДКЕ ПОКАЗА (recorder.laneOrder — один на окно, микшер, полосу игры и чип редактора): место, поставленное
     человеком, иначе номер слоя (умолчание прежнее); во время записи в конец — ещё пустые слои взятого (их строка видна с ●). */
  const rows=laneOrder();   // T1/T2: ВСЕ слои взятого (по дорожке на роль
  const armLy=armedLayer();                  // S3.5c: вооружённая дорожка (слой) или null — один раз на кадр, её читают и заголовок, и строки. E0-fix: поднят сюда — от него зависит ширина колонки значков
  /* ⛳ E0-fix: КОЛОНКА ЗНАЧКОВ — СВОЯ ПОЛОСА МЕЖДУ ПОДПИСЬЮ «L1» И ЛИНЕЙКОЙ, А НЕ ПОВЕРХ ЛИНЕЙКИ.
     Линейка дорожки начинается ровно с x0 — места «слева от неё» внутри коробки нет (на 380px x0=20, подпись
     L1 и так висит за кромкой). Поэтому и красная точка вооружения, и ❄ заморозки с самого начала лежали НА
     ЛИНЕЙКЕ, поверх меток первых нот; E0 развёл их между собой и тем задвинул ❄ ещё глубже в ноты.
     ⛳ ПОЧЕМУ КОЛОНКА, а не «сложить друг над другом» или «ужать»: строка — 16px, читаемая на телефоне ❄ — 11px;
     два значка на лишних 16px никуда не помещаются, не залезая в линейку. И почему не «шире только у таких строк»:
     преобразование доля→пиксель у всех строк ОДНО (правило #9), по строке его не сдвинуть.
     ⛳ КОЛОНКА ЕСТЬ, ТОЛЬКО ПОКА ЕСТЬ ЗНАЧКИ (вооружённая строка вне записи или замороженная/устаревшая): без них
     полоса байт-в-байт прежняя. Цена названа: пока колонка есть, линейка на MARK_COL_W уже, а при появлении или
     исчезновении первого значка вся линейка сдвигается на эту ширину. Геометрия — ИЗ СНИМКА: x0 снимка — начало
     ЛИНЕЙКИ (от него считают метки, сетка, скоба, бегунок и попадание), bx0 — кромка коробки (от неё — подпись
     и зоны попадания «вооружить»/«скоба»). Гнёзда M/S/✕ не двигаются: линейка ровно на столько же короче. */
  const markCol = !FULL && rows.some(l=>!recording&&l===armLy);   // AF4: only the arm dot needs the column (freezing shows nothing on the strip)
  const markW = markCol ? MARK_COL_W : 0;
  const SC = FULL ? null : stripCols(W, markW);   // AR2-fix: горизонталь полосы игры — ОДНА функция ширины (её же гоняет проба на разных ширинах)
  const nameW = FULL ? 0 : SC.nameW;             // AR2: колонка ИМЕНИ дорожки (у полосы игры; у окна имя — в заголовке)
  const mx0 = FULL ? x0 : SC.mx0;                // AR2: начало колонки значков (за колонкой имени)
  const lx0 = FULL ? x0+markW : SC.lx0;          // начало ЛИНЕЙКИ; x0 остаётся кромкой коробки
  const bw = FULL ? Math.max(60,sw-togBand-markW) : SC.bw, x1=lx0+bw;   // линейка времени; пол 60px — страховка на совсем узком экране; без смены роли — один, ровно прежний)
  /* rowH 13 → 16: строка стала не только читаемее, но и НАЖИМАЕМЕЕ — в ней теперь живут две кнопки.
     Выше не берём: каждая дорожка — это высота на экране, а их бывает много (см. отчёт слайса). */
  /* braceH — полоса СКОБЫ ПОВТОРА (S3.5b) между заголовком и строками. ОТДЕЛЬНАЯ полоса, а не тап по
     строкам: строки уже заняты mute/solo (и скоро — выбором дорожки для записи), и «тап по времени» с
     «тапом по дорожке» обязаны быть разными целями. */
  const rowH= FULL ? ARR_ROW_H : 16, headH=22, braceH= FULL ? ARR_BRACE_H : 16, secH= FULL ? ARR_SEC_H : 0, pad=7, y0= FULL ? ROLL_BAR_H+ROLL_TP_H+2 : 64;   // ED6: secH — the window's sections band (the play strip has none)   // ниже заголовков зон (y≈52); AR1: у окна — под баром и транспортом, как у редактора
  /* ⛳ ОКНО СТРОК (см. LOOP_TP_RESERVE): fit — сколько строк влезает над транспортом; не влезают все — одна строка высоты уходит под
     подвал «строки a–b из n», остальные — видимое окно с первой строки laneRow0 (state, пишет ui), зажатой здесь в пределы. Во время
     записи окно ПОКАЗЫВАЕТ пишущуюся дорожку (последнюю из слоёв взятого), даже если человек пролистал в сторону: «куда идёт запись» обязано
     быть видно — это вычисленный сдвиг, состояние прокрутки не пишется. */
  const allRows=rows, nAll=allRows.length;
  const MIX = FULL && arrFace==='mix';   // MX1: лицо «микшер» — снизу полоса мастера
  const fit=Math.max(LOOP_MIN_ROWS, Math.floor((Hc-y0-headH-secH-braceH-pad*2-(FULL?ARR_MARGIN:LOOP_TP_RESERVE)-(MIX?MIX_MASTER_H+8:0))/rowH));   // AR1: у окна транспорт сверху — снизу только поле; MX1: и полоса мастера
  const over = nAll>fit, visN = over ? Math.max(LOOP_MIN_ROWS-1, Math.floor((fit*rowH-LOOP_FOOT_H)/rowH)) : nAll;
  let r0 = over ? Math.max(0, Math.min(nAll-visN, laneRow0)) : 0;
  if(over && recording){ let last=-1; for(const ly of recLayers()){ const i=allRows.indexOf(ly); if(i>last) last=i; }
    if(last>=0 && (last<r0 || last>=r0+visN)) r0=Math.max(0, Math.min(nAll-visN, last-visN+1)); }
  const visRows = over ? allRows.slice(r0, r0+visN) : allRows;
  const footH = over ? LOOP_FOOT_H : 0;
  const nRow=Math.max(1,visRows.length);
  const gy0=y0+headH+secH+braceH, boxH=headH+secH+braceH+nRow*rowH+footH+pad*2, gy1=gy0+nRow*rowH;   // gy1 — низ СТРОК (без подвала: сетка и бегунок не заходят в него); без подвала — прежнее y0+boxH−pad
  syncLoopTransport(true, FULL ? ROLL_BAR_H+4 : y0+boxH+4);   // считаем из ТОГО ЖЕ boxH, что рисуем → разъехаться не могут; AR1: у окна — под баром, как у редактора
  /* Снимок геометрии для попадания — ОДИН объект, тот же, по которому ниже рисуем. tx0 — левый край
     первого гнезда переключателей. */
  loopView={ x0:lx0, bx0:x0, bw, beat0, span, gy0, rowH, rows:visRows, tx0:x1+6, by0:y0+headH+secH, hy0: FULL ? y0+headH+secH : y0,
             sec: FULL ? { y0:y0+headH, y1:y0+headH+secH, marks:[] } : null,   // ED6: the sections band and its drawn markers (hit-test reads them)
             over, row0:r0, nAll, visN, sx1: FULL ? W : x0+sw+10, sx0: FULL ? 0 : x0-28,
             full:FULL, hx0:ARR_MARGIN, mini: FULL ? new Map() : null, dots: FULL ? new Map() : null, markW,   // AF4: dots — the freeze dot drawn per visible window row (probe); markW — strip mark column
             all:allRows, look:new Map(), nameW, mx0, frame: FULL ? [0,W] : [SC.fx0,SC.fx1],   // AR2-fix: frame — рамка, внутри которой обязан лежать каждый текст строки (проба)   // AR2: all — ВСЕ строки в порядке показа (ui: место перестановки); look — нарисованные имя и цвет видимых строк (их сверяет проба); nameW/mx0 — колонка имени полосы игры и начало колонки значков
             mix:MIX, ...mixGeom(lx0,bw), ms: MIX ? { y0:gy1+footH+8, y1:gy1+footH+8+MIX_MASTER_H } : null };   // MX1: mix — лицо микшера; fx0/fw — ход фейдера; ms — полоса мастера   // AR1: full — окно аранжировки; hx0 — левый край колонки заголовков; mini — миниатюры видимых строк (слой → записи; их сверяет проба); sx0 — левый край зоны прокрутки строк   // ⛳ rows — ВИДИМЫЕ строки (их рисуем и ловим); over/row0/nAll/visN — окно прокрутки (ui листает по ним); sx1 — правая кромка коробки   // E0-fix: x0 — начало ЛИНЕЙКИ (с колонкой значков сдвинуто), bx0 — кромка коробки   // by0 — верх полосы скобы (рисование); hy0 — верх её ЗОНЫ ПОПАДАНИЯ: вместе с заголовком, в котором тапать больше не во что, — ~38px под большой палец вместо 16

  if(FULL){ ctx.fillStyle='#0b0b14'; ctx.fillRect(0,0,W,Hc); }   // AR1: окно — свой экран (камера не рисуется), фон целиком
  else{ ctx.fillStyle='rgba(10,10,20,.74)'; ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x0-10,y0,sw+20,boxH,11); ctx.fill(); ctx.stroke(); }
  /* AR1: у окна время уходит за края дорожки (зум) — всё, что на временной оси, рисуем в КЛИПЕ дорожки [lx0, lx0+bw]. У полосы игры
     время — вся песня, за края ничего не выходит, клипа нет (рисунок прежний). */
  const clipLane=()=>{ if(FULL){ ctx.save(); ctx.beginPath(); ctx.rect(lx0,0,bw,Hc); ctx.clip(); } };
  const unclip=()=>{ if(FULL) ctx.restore(); };
  clipLane();

  /* ⛳ ОБЛАСТЬ ПОВТОРА (S3.4) — рисуем ПОД сеткой и строками, чтобы она читалась как подсветка участка,
     а не как ещё один слой поверх. Показываем ТОЛЬКО включённой: помеченный, но выключенный участок
     обещал бы повтор, которого нет. Границы — из того же преобразования, что сетка и метки. */
  const RG=loop.rgn, cyc=cycling();   // cyc — тот же предикат, по которому ЗВУК решает, есть ли повтор (S3.5b; прежде здесь стояла своя копия условия)
  if(cyc){
    const rx0=laneBeatX(loopView,RG.from), rx1=laneBeatX(loopView,RG.to);
    ctx.fillStyle='rgba(87,217,163,.10)';                       // тот же зелёный, что у «играет» — это его участок
    ctx.fillRect(rx0,gy0,Math.max(1,rx1-rx0),gy1-gy0);
    ctx.strokeStyle='rgba(87,217,163,.55)'; ctx.lineWidth=1.5;  // скобки по краям: видно, ГДЕ шов
    ctx.beginPath(); ctx.moveTo(rx0,gy0); ctx.lineTo(rx0,gy1); ctx.moveTo(rx1,gy0); ctx.lineTo(rx1,gy1); ctx.stroke();
  }

  // заголовок — режим
  /* ⛳ ЗАГОЛОВОК ПЕРЕСОБРАН ПОД ЛИНЕЙНУЮ МОДЕЛЬ (S3.3): вместо «круг N тактов» — ДОРОЖКИ и ДЛИНА
     ПЕСНИ в тактах (выводимая из материала). Ветки loop.first больше нет — запись всегда «дорожка N». */
  const songBars=Math.max(1,Math.ceil(songBeats()/loop.metre));
  const delLy=laneDelPendingLayer();         // S3.5d: дорожка со взведённым удалением или null
  let head, hc;
  if(info&&info.phase==='count'){ head=t('looper.count',{n:info.countLeft}); hc='#57d9a3'; }
  else if(recording){ { const rl=recLayers().slice().sort((x,y)=>x-y); head= rl.length>1 ? t('looper.overdubMany',{list:rl.map(l=>l+1).join(', ')}) : t('looper.overdub',{n:rl[0]+1});
    if(armLy!=null && rl.some(l=>l!==armLy)) head+=' · '+t('looper.armedOwn',{n:armLy+1}); }   /* T3: вооружённая осталась красной, а ноты ушли в новую строку — называем это словами: она берёт только СВОЙ звук (роль и тембр) */   /* T2: взятое пишет по дорожке на роль — называем ВСЕ; одна — прежняя строка */ hc='#e5484d'; }
  else if(loop.on){ head=t('looper.playing',{bars:songBars, layers:nIds}); hc='#57d9a3'; }
  else { head=t('looper.paused',{bars:songBars, layers:nIds}); hc='rgba(255,255,255,.7)'; }
  /* СОЛО ОБЪЯВЛЯЕМ В ЗАГОЛОВКЕ: иначе «молчит половина дорожек» читается как поломка, а не как режим.
     Приписка к готовой строке, а не отдельный ключ на каждую фразу — состояний заголовка четыре. */
  /* S3.5c: КУДА ПОЙДЁТ ● — словом в заголовке, рядом с красной рамкой строки. «(не слышно)» — если дорожка
     заглушена или молчит из-за чужого соло: запись в неё разрешена (панч-ин), но человек обязан знать, что
     после ● свою запись он не услышит, пока не снимет заглушение. Во время записи заголовок и так
     называет дорожку («● ЗАПИСЬ · дорожка N»). */
  if(!recording && armLy!=null){
    const heard = laneSoloOn() ? laneSoloed(armLy) : !laneMuted(armLy);
    head += ' · ' + t(heard ? 'looper.armed' : 'looper.armedSilent', {n:armLy+1});
  }
  if(cyc) head += ' · ' + t('looper.regionOn');   // повтор объявляем словом: одна подсветка на полосе легко теряется на пёстрой камере
  if(laneSoloOn()) head += ' · ' + t('looper.soloOn');
  /* S3.5d: ВЗВЕДЁННОЕ УДАЛЕНИЕ ЗАМЕНЯЕТ заголовок целиком, красным: это единственное, что сейчас важно, и
     приписка к и без того длинной строке на 380px ушла бы за кромку. */
  if(delLy!=null){ head=t('looper.delConfirm',{n:delLy+1}); hc='#ff6b6f'; }
  unclip();   // заголовок — не время
  ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.font='600 12px system-ui';
  ctx.fillStyle=hc; ctx.fillText(head, FULL ? ARR_MARGIN : x0-2, y0+headH/2+1);
  clipLane();

  /* ДРОБЛЕНИЕ ДОЛИ — тонкие короткие штрихи, и ТОЛЬКО когда сетка не шестнадцатая (loop.sub!==4):
     играющий должен ВИДЕТЬ ту сетку, к которой его квантуют (иначе триольная квантизация — сюрприз).
     При sub=4 (умолчание) не рисуем ничего → вид 4/4 байт-в-байт. Рисуем ДО долевых линий: те поверх. */
  /* ⛳ ПЛОТНОСТЬ СЕТКИ ТЕПЕРЬ ПЕРЕМЕННАЯ (S3.3). В петле долей было 8–32, и рисовать их все было
     даром. У песни на пять минут их СОТНИ: сплошная заливка вместо сетки и бессмысленная работа
     каждый кадр. Поэтому мелкое рисуем, только пока оно РАЗЛИЧИМО: доли — от 6px между ними,
     дробление доли — от 4px. Такты рисуем всегда (это скелет), но если и они гуще 3px — прореживаем
     кратно, чтобы линии не слились в кашу. */
  const pxPerBeat=bw/Math.max(1e-9,span);   // AR1: по ОКНУ (у полосы игры окно — вся песня, span===total)
  const bA=Math.max(0,Math.floor(beat0)), bZ=Math.min(total, Math.ceil(beat0+span));   // видимые доли (у полосы игры — 0…total, как было)
  const barStep=Math.max(1,Math.ceil(3/(pxPerBeat*loop.metre)));   // рисовать каждый barStep-й такт
  if(loop.sub!==4 && pxPerBeat/loop.sub>=4){
    ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=0.8;
    const sy0=gy0+(gy1-gy0)*0.35;                  // короче долевых — читается как «мельче», не спорит с ними
    for(let b=bA;b<bZ;b++) for(let k=1;k<loop.sub;k++){
      const gx=laneBeatX(loopView,b+k/loop.sub);
      ctx.beginPath(); ctx.moveTo(gx,sy0); ctx.lineTo(gx,gy1); ctx.stroke();
    }
  }
  // сетка долей и тактов
  const showBeats=pxPerBeat>=6;
  for(let b=bA;b<=bZ;b++){
    const bib=b%loop.metre;
    if(bib===0){ if((b/loop.metre)%barStep) continue; }        // прореживание тактов на длинной песне
    else if(!showBeats) continue;                             // доли не различимы — не рисуем вовсе
    const gx=laneBeatX(loopView,b), lvl=beatLevel(loop.metre,bib);   // видно 3+2+2, а не N одинаковых чёрточек; X — через ЕДИНОЕ преобразование, как метки и бегунок
    let sc,lw;
    if(bib===0){ sc='rgba(255,255,255,.34)'; lw=1.4; }        // начало такта
    else if(lvl===1){ sc='rgba(255,255,255,.24)'; lw=1.1; }   // голова группы
    else if(lvl===-1){ sc='rgba(140,180,255,.20)'; lw=1.0; }  // khali — холодный тусклый штрих («пустая» голова)
    else { sc='rgba(255,255,255,.11)'; lw=0.8; }              // обычная доля
    ctx.strokeStyle=sc; ctx.lineWidth=lw;
    ctx.beginPath(); ctx.moveTo(gx,gy0); ctx.lineTo(gx,gy1); ctx.stroke();
  }
  /* ED6: SECTIONS — markers at bar lines with their names (a faint line down the rows), the selected one outlined; a label is clipped
     to the next marker. Drawn rectangles go into the snapshot (loopView.sec.marks) — loopHit reads exactly what was drawn. */
  if(loopView.sec){ const S=loopView.sec, ms=sections(), sy=S.y0+1, sh=S.y1-S.y0-3;
    ctx.fillStyle='rgba(255,255,255,.035)'; ctx.fillRect(lx0,sy,bw,sh);
    ctx.font='600 11px system-ui'; ctx.textBaseline='middle'; ctx.textAlign='left';
    if(!ms.length){ ctx.fillStyle='rgba(255,212,121,.45)'; ctx.fillText(t('sec.hint'), lx0+6, sy+sh/2+.5); }   // ED6-fix: an empty strip says what it is for
    for(let i=0;i<ms.length;i++){ const m=ms[i], x=laneBeatX(loopView,m.beat), xn= i+1<ms.length ? laneBeatX(loopView,ms[i+1].beat) : lx0+bw+200;
      if(x>lx0+bw+2 || xn<lx0-2) continue;
      const sel=secSel===m.id, w=Math.max(14, Math.min(ctx.measureText(m.name).width+10, xn-x-2));
      ctx.strokeStyle= sel ? 'rgba(255,255,255,.55)' : 'rgba(255,212,121,.28)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,S.y0); ctx.lineTo(x,gy1); ctx.stroke();
      ctx.fillStyle= sel ? 'rgba(255,212,121,.95)' : 'rgba(255,212,121,.22)'; ctx.fillRect(x,sy,w,sh);
      if(sel){ ctx.strokeStyle='#fff'; ctx.strokeRect(x+.5,sy+.5,w-1,sh-1); }
      ctx.save(); ctx.beginPath(); ctx.rect(x,sy,w,sh); ctx.clip();
      ctx.fillStyle= sel ? '#14141f' : '#ffd479'; ctx.fillText(m.name, x+5, sy+sh/2+.5); ctx.restore();
      S.marks.push({ id:m.id, beat:m.beat, name:m.name, x0:x, x1:x+w }); }
    ctx.textBaseline='alphabetic'; }
  /* ⛳ ПОЛОСА СКОБЫ ПОВТОРА (S3.5b). Читается честно и без легенды:
       заливка — какие ТАКТЫ под скобой; зелёная — повтор ВКЛЮЧЁН (тот же зелёный, что «играет»),
       серая — скоба есть, но не повторяется (она всё равно задаёт начало записи);
       края — скобки ⌈…⌉; СПЛОШНЫЕ — скобу поставил человек, ПУНКТИР + «авто» — скоба следует за материалом;
       надпись — номера тактов «3–5» (с единицы, включительно).
     Риски линий тактов в полосе — цели тапа: тап едет на ближайшую линию. Прореживание то же (barStep),
     что у сетки, — риска не обещает линию, которой на сетке нет.
     ⛔ Все X — через laneBeatX того же loopView (правило #9); попадание — через laneBeatAt того же V. */
  {
    const M=loop.metre, byA=loopView.by0+2, byB=gy0-3, bh=byB-byA, tab=5;
    ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(lx0,byA,bw,bh);   // E0-fix: полоса скобы — это ВРЕМЯ, значит от начала линейки (колонка значков ей не принадлежит)
    ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=1;
    for(let b=Math.floor(bA/M/barStep)*barStep;b*M<=bZ+1e-9;b+=barStep){ const gx=laneBeatX(loopView,b*M);
      ctx.beginPath(); ctx.moveTo(gx,byB-4); ctx.lineTo(gx,byB); ctx.stroke(); }
    const bx0=laneBeatX(loopView,RG.from), bx1=laneBeatX(loopView,RG.to);
    ctx.fillStyle= cyc ? 'rgba(87,217,163,.40)' : 'rgba(255,255,255,.16)';
    ctx.fillRect(bx0,byA,Math.max(1,bx1-bx0),bh);
    ctx.strokeStyle= cyc ? '#57d9a3' : 'rgba(255,255,255,.8)'; ctx.lineWidth= RG.user ? 2 : 1.2;
    if(!RG.user) ctx.setLineDash([2,2]);
    ctx.beginPath();
    ctx.moveTo(bx0+tab,byA); ctx.lineTo(bx0,byA); ctx.lineTo(bx0,byB); ctx.lineTo(bx0+tab,byB);
    ctx.moveTo(bx1-tab,byA); ctx.lineTo(bx1,byA); ctx.lineTo(bx1,byB); ctx.lineTo(bx1-tab,byB);
    ctx.stroke(); ctx.setLineDash([]);
    const a=Math.round(RG.from/M), z=Math.round(RG.to/M), nums= z-a<=1 ? String(z) : `${a+1}–${z}`;
    ctx.font='600 9px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const room=bx1-bx0-2*tab-4;
    let lbl= RG.user ? nums : nums+' · '+t('looper.braceAuto');
    if(ctx.measureText(lbl).width>room) lbl=nums;               // узко — только номера; «авто» всё равно читается по пунктиру
    if(ctx.measureText(lbl).width<=room){ ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fillText(lbl,(bx0+bx1)/2,(byA+byB)/2+0.5); }
    ctx.textAlign='left';
  }
  unclip();
  // строки слоёв + переключатели дорожки
  const soloOn=laneSoloOn();
  const rowOf=new Map();                                 // номер слоя → индекс строки (для ОДНОГО прохода по событиям, см. ниже)
  visRows.forEach((lid,ri)=>{
    rowOf.set(lid,ri);
    const col=laneCol(lid), name=laneTitle(lid);         // AR2: ОДНИ имя и цвет на все виды; в снимок — для пробы (что нарисовано)
    loopView.look.set(lid,{ name, col });
    const ry=gy0+ri*rowH, mid=ry+rowH/2, live=isRecLayer(lid);   /* T1: строка пишущегося слоя взятого (isRecLayer сама проверяет recording) */
    const muted=laneMuted(lid), soloed=laneSoloed(lid);
    /* ПРИГЛУШАЕМ ПО СЛЫШИМОСТИ, А НЕ ПО ГАЛОЧКЕ MUTE: при включённом соло молчат ВСЕ, кроме соло-дорожек,
       и это ровно то, что человек должен видеть. Показывай мы только mute — «включил соло на одной»
       выглядело бы как «ничего не изменилось», хотя замолчало почти всё. Тот же предикат, что и в звуке. */
    const off = soloOn ? !soloed : muted;
    ctx.globalAlpha = off ? LANE_OFF_A : 1;              // одна альфа на ВСЮ строку: фон и подпись гаснут вместе
    ctx.fillStyle=live?'rgba(229,72,77,.16)':'rgba(255,255,255,.04)';
    if(FULL) ctx.fillRect(ARR_MARGIN,ry+1,hdrW+bw,rowH-2);   // AR1: фон — от колонки заголовка до конца дорожки
    else ctx.fillRect(x0,ry+1,nameW+markW+bw,rowH-2);          // AR2: с колонкой имени.   E0-fix: фон строки — вместе с колонкой значков (она часть строки); без колонки markW=0 — как было
    if(FULL) Object.assign(loopView.look.get(lid), arrRowHeader(lid, ARR_MARGIN, ry, hdrW-6-ARR_DOT_W, rowH, lid===armLy && !recording, name, col));   // AF4: the header leaves room for the freeze dot   // AR2-fix: где встали тексты заголовка (проба: внутри рамки)
    else{ const RT=stripRowText(lid, SC, name);   // AR2-fix: «L#» и ИМЯ — в колонке имени, внутри рамки (прежде «L#» висел левее коробки и торчал за рамку)
      ctx.textAlign='left';
      ctx.fillStyle= (lid===armLy && !recording) ? '#ff6b6f' : 'rgba(255,255,255,.5)'; ctx.fillText(RT.lbl, RT.lblX0, mid+0.5);   // вооружена — «L#» красный (как прежде)
      if(RT.nm){ ctx.fillStyle=col; ctx.fillText(RT.nm, RT.nameX0, mid+0.5); }
      Object.assign(loopView.look.get(lid), { lblX0:RT.lblX0, lblX1:RT.lblX1, nameX0:RT.nameX0, nameX1:RT.nameX1 }); }
    if(FULL){ clipLane(); if(MIX) drawLaneFader(lid, ry, rowH); else drawLaneMini(lid, ry, rowH); unclip(); }   // AR1: МИНИАТЮРЫ нот/ударов — в клипе дорожки; MX1: в лице микшера — фейдер
    ctx.globalAlpha=1;                                   // кнопки рисуем В ПОЛНУЮ СИЛУ: это орган управления, он обязан читаться и на погашенной строке
    /* ⛳ ВООРУЖЁННАЯ ДОРОЖКА (S3.5c) — красная рамка во всю строку, красная точка записи в её начале и красная
       подпись, В ПОЛНУЮ СИЛУ даже на заглушённой строке: «куда я сейчас запишу» читается с одного взгляда
       на 380px, где слева от линейки места под значок нет (подпись L1 и так упирается в кромку).
       Во время записи рамку не рисуем: пишущуюся строку уже выделяет красная заливка (live). */
    const armed = !recording && lid===armLy;
    if(armed && FULL){ ctx.strokeStyle='#e5484d'; ctx.lineWidth=2; ctx.strokeRect(ARR_MARGIN+1,ry+1.5,hdrW+bw-2,rowH-3); }   // AR1: рамка — вокруг заголовка и дорожки
    else if(armed){
      ctx.strokeStyle='#e5484d'; ctx.lineWidth=2; ctx.strokeRect(x0+1,ry+1.5,nameW+markW+bw-2,rowH-3);   // AR2: и колонка имени внутри.   рамка — вокруг ВСЕЙ строки, колонка значков внутри неё
      ctx.fillStyle='#e5484d'; ctx.beginPath(); ctx.arc(mx0+ARM_DOT_X,mid,3.5,0,7); ctx.fill();   // AR2: колонка значков — за колонкой имени (mx0).   E0-fix: точка — в колонке значков (armed ⇒ колонка есть), а не на линейке
    }
    if(FULL){   // window: M / S under the finger; AF4: the freeze dot (no ❄, no stale mark) at the header's right end
      const st=ARR_BTN_W+ARR_BTN_GAP;
      laneTog(loopView.tx0,      ry,rowH,t('looper.laneMute'),muted, LANE_MUTE_COL, ARR_BTN_W);
      laneTog(loopView.tx0+st,   ry,rowH,t('looper.laneSolo'),soloed,LANE_SOLO_COL, ARR_BTN_W);
      const dot= hooks.afRow ? hooks.afRow(lid) : null, dx=ARR_MARGIN+hdrW-ARR_DOT_W/2-3;
      if(dot==='run'){ ctx.fillStyle=`rgba(255,255,255,${(0.3+0.35*(0.5+0.5*Math.sin(performance.now()/ARR_DOT_PULSE_MS))).toFixed(3)})`; ctx.beginPath(); ctx.arc(dx,mid,ARR_DOT_R,0,7); ctx.fill(); }
      else if(dot==='wait'){ ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(dx,mid,ARR_DOT_R,0,7); ctx.stroke(); }
      loopView.dots.set(lid, { st:dot, filled: dot==='run', x:dx, y:mid });
      return; }
    laneTog(loopView.tx0,                          ry,rowH,t('looper.laneMute'),muted, LANE_MUTE_COL);
    laneTog(loopView.tx0+LANE_TOG_W+LANE_TOG_GAP,  ry,rowH,t('looper.laneSolo'),soloed,LANE_SOLO_COL);
    /* S3.5d: ✕ — залит красным, пока удаление взведено; строка при этом краснеет поверх (видно, КАКАЯ дорожка уйдёт). */
    if(lid===delLy){ ctx.fillStyle='rgba(229,72,77,.24)'; ctx.fillRect(x0,ry+1,nameW+markW+bw,rowH-2); }   // AR2: с колонкой имени   // E0-fix: вся строка, с колонкой значков
    laneTog(loopView.tx0+2*(LANE_TOG_W+LANE_TOG_GAP)+LANE_DEL_GAP, ry,rowH,t('looper.laneDel'),lid===delLy,LANE_DEL_COL);
  });
  /* ⛳ AR2: ПЕРЕСТАНОВКА (палец тянет ручку строки окна): тянущаяся строка обведена цветом своей роли, белая черта — куда она встанет.
     Место — в ОБЩЕМ порядке (allRows), черта — на видимой строке (минус первая видимая r0); вне окна строк черты нет. */
  if(FULL && laneDrag){
    const from=allRows.indexOf(laneDrag.layer), to=laneDrag.to, ri=visRows.indexOf(laneDrag.layer);
    if(ri>=0){ ctx.strokeStyle=laneCol(laneDrag.layer); ctx.lineWidth=2; ctx.strokeRect(ARR_MARGIN+1,gy0+ri*rowH+1.5,hdrW+bw-2,rowH-3); }
    if(from>=0 && to!==from){ const k=(to>from?to+1:to)-r0;
      if(k>=0 && k<=visRows.length){ ctx.fillStyle='#fff'; ctx.fillRect(ARR_MARGIN, gy0+k*rowH-1.5, hdrW+bw, 3); } }
  }
  /* ⛳ МЕТКИ СОБЫТИЙ — ОДНИМ ПРОХОДОМ ПО ВСЕМ СОБЫТИЯМ, а не проходом НА КАЖДУЮ СТРОКУ (S3.3).
     Было O(дорожек × событий) НА КАДР: на петле с тремя строками и парой сотен событий незаметно, на
     песне в несколько минут с двумя десятками дорожек — десятки миллионов чтений в секунду, и полоса
     съедала бы кадр, ради которого весь S3.2 и делался. Стало O(событий): строку находим по карте.
     Альфу дорожки применяем поштучно — строки рисуются раньше, общий globalAlpha уже снят. */
  const laneAlpha=new Map();
  for(const lid of visRows) laneAlpha.set(lid, (soloOn ? !laneSoloed(lid) : laneMuted(lid)) ? LANE_OFF_A : 1);
  if(!FULL) for(const e of events){   // AR1: у окна вместо рисок — миниатюры (нарисованы со строками)
    if(e.fn==='leadOff'||e.fn==='chOff') continue;
    const ri=rowOf.get(e.layer); if(ri===undefined) continue;
    const ex=laneBeatX(loopView,e.t), ry=gy0+ri*rowH;    // ⛳ через ЕДИНОЕ преобразование — то же, по которому идёт попадание
    ctx.globalAlpha=laneAlpha.get(e.layer);
    ctx.fillStyle=loopView.look.get(e.layer).col;           // AR2: риска — цветом РОЛИ дорожки (прежде: аккорды сиреневые, прочее оранжевое)
    ctx.beginPath(); ctx.roundRect(ex-1.5,ry+3,3.5,rowH-6,1.5); ctx.fill();
  }
  ctx.globalAlpha=1;
  /* ⛳ ПОДВАЛ И ПОЛОСА ПРОКРУТКИ — только когда строки не влезают: «строки a–b из n — листайте» и тонкая полоса у правой кромки коробки
     (её длина — доля видимого, положение — первая видимая строка). Номера — ПОЗИЦИИ строк, не L-номера (у слоёв бывают дыры). */
  if(over){
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='10px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(t('looper.rowsShown',{a:r0+1, b:r0+visRows.length, n:nAll}), FULL ? ARR_MARGIN : x0, gy1+LOOP_FOOT_H/2+1);
    const sbx=x0+sw+5, sh=gy1-gy0, th=Math.max(10, sh*visRows.length/nAll), ty=gy0+(sh-th)*(r0/Math.max(1,nAll-visRows.length));
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(sbx,gy0,3,sh);
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(sbx,ty,3,th);
    ctx.textBaseline='alphabetic';
  }
  if(MIX) drawMasterStrip(loopView.ms, W);   // MX1: полоса мастера — под строками
  // бегунок позиции
  clipLane();
  if(MIX){ ctx.beginPath(); ctx.rect(0,0,W,gy0); ctx.clip(); }   // MX1: в лице микшера бегунок — только в полосе скобы, не поверх фейдеров
  if(info&&info.phase==='play'){
    /* ⛳ Тоже через ЕДИНОЕ преобразование. Прежде здесь стояло деление на info.total, а сетка делила на
       свой total — величины совпадали, но источников было ДВА; теперь источник один (loopView.span). */
    const px=laneBeatX(loopView,info.pos), ph0=loopView.by0+2;   // S3.5b: бегунок идёт и сквозь полосу скобы — видно, где он относительно неё
    if(cyc){ ctx.strokeStyle='rgba(10,10,20,.85)'; ctx.lineWidth=4;   // тёмная подложка ТОЛЬКО при повторе: на зелёной заливке скобы зелёный бегунок иначе тонет
      ctx.beginPath(); ctx.moveTo(px,ph0); ctx.lineTo(px,gy1+2); ctx.stroke(); }
    ctx.strokeStyle=recording?'#e5484d':'#57d9a3'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(px,ph0); ctx.lineTo(px,gy1+2); ctx.stroke();
    ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.arc(px,ph0,3,0,7); ctx.fill();
  }
  if(FULL && !(info&&info.phase==='play')){   // AR1: на остановленном транспорте бегунок тоже виден (приглушённо) — у окна это «откуда ▶»
    const px=laneBeatX(loopView,Math.max(0,loop.pos)), ph0=loopView.by0+2;
    ctx.strokeStyle='rgba(87,217,163,.55)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,ph0); ctx.lineTo(px,gy1+2); ctx.stroke(); }
  unclip();
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ═══ ЗАГОЛОВОК СТРОКИ ОКНА (AR1; с AR2 — ручка, ИМЯ цветом роли и «L#» второй строкой) ═══
   Имя и цвет — laneTitle/laneCol (одни на все виды; имя по умолчанию «роль · тембр» — роль и тембр по СОБЫТИЯМ дорожки, имя тембра —
   единственный вход audio.timbresOf, T5). Не влезает — обрезаем с многоточием по ширине колонки (measureText), а не переносим. armed —
   красная вторая строка и точка (куда пойдёт ●). Тап по имени — вооружить, двойной — переименовать (ui); ручка — тянуть (перестановка). */
/* ═══ MX1: ФЕЙДЕР УРОВНЯ ДОРОЖКИ — в теле строки (лицо «микшер») ═══ Значение — recorder.laneLevelOf (по id дорожки); ход — [fx0, fx0+fw]
   снимка (тот же, по которому ui ведёт палец). Фон тела заливается — сетка времени под фейдером не мешает читать. */
/* ⛳ MX2: ГЕОМЕТРИЯ ЛИЦА МИКШЕРА — ОДНА функция для снимка (рисование и попадание читают её числа): fx0/fw — ход фейдера уровня
   (левая часть тела), px0 — левая кромка блока панорамы, pfx0/pfw — ход ручки панорамы, mfx0/mfw — ход фейдера МАСТЕРА (во всю ширину). */
function mixGeom(lx0,bw){
  const pw=Math.round(Math.max(MIX_PAN_MIN, Math.min(MIX_PAN_MAX, bw*MIX_PAN_W))), px0=lx0+bw-pw;
  return { fx0:lx0+MIX_PAD, fw:Math.max(1,bw-pw-2*MIX_PAD), px0, pfx0:px0+MIX_PAD, pfw:Math.max(1,pw-2*MIX_PAD),
           mfx0:lx0+MIX_PAD, mfw:Math.max(1,bw-2*MIX_PAD) };
}
function drawLaneFader(ly,ry,rowH){
  const V=loopView, v=laneLevelOf(ly), col=laneCol(ly), cy=ry+rowH/2, kx=V.fx0+v*V.fw;
  ctx.fillStyle='rgba(10,10,20,.94)'; ctx.fillRect(V.x0,ry+1,V.bw,rowH-2);
  drawLanePan(ly,ry,rowH,col);
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(V.fx0,cy-3,V.fw,6,3); ctx.fill();
  ctx.fillStyle=hexA(col,.8); ctx.beginPath(); ctx.roundRect(V.fx0,cy-3,Math.max(0,kx-V.fx0),6,3); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.roundRect(kx-6,ry+5,12,rowH-10,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='11px system-ui'; ctx.textBaseline='middle';
  const lbl=levelLbl(v), tw=ctx.measureText(lbl).width; ctx.textAlign= kx>V.fx0+V.fw/2 ? 'left' : 'right';
  ctx.fillText(lbl, kx>V.fx0+V.fw/2 ? V.fx0+2 : V.fx0+V.fw-2, ry+9); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; void tw;
}
/* ═══ MX2: РУЧКА ПАНОРАМЫ ДОРОЖКИ — правый блок тела строки. Значение — recorder.lanePanOf (по id дорожки); заливка — от центра к ручке,
   метка центра (фиксация), подпись «L 30» / «C» / «R 30» над дорожкой ручки. ═══ */
function drawLanePan(ly,ry,rowH,col){
  const V=loopView, p=lanePanOf(ly), cy=ry+rowH/2, cx=V.pfx0+V.pfw/2, kx=V.pfx0+(p+1)/2*V.pfw;
  ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(V.px0+0.5,ry+6); ctx.lineTo(V.px0+0.5,ry+rowH-6); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(V.pfx0,cy-3,V.pfw,6,3); ctx.fill();
  ctx.fillStyle=hexA(col,.8); ctx.fillRect(Math.min(cx,kx),cy-3,Math.abs(kx-cx),6);
  ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillRect(cx-1,cy-7,2,14);
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.roundRect(kx-6,ry+5,12,rowH-10,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='11px system-ui'; ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(panLbl(p), cx, ry+9); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ═══ MX1: ПОЛОСА МАСТЕРА — уровень мастера (фейдер), измеритель выхода (пик после лимитера, дБFS, с удержанием пика) и подавление лимитера.
   Читает audio.masterLevel/masterMeter (анализатор на выходе лимитера; лимитер не трогаем — правило #4). ═══ */
let meterHold=0, meterHoldT=0;
function drawMasterStrip(ms,W){
  const V=loopView, v=masterLevel(), m=masterMeter(), y0=ms.y0, h=ms.y1-ms.y0;
  ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(ARR_MARGIN,y0,W-2*ARR_MARGIN,h);
  ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=1; ctx.strokeRect(ARR_MARGIN+0.5,y0+0.5,W-2*ARR_MARGIN-1,h-1);
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='600 12px system-ui'; ctx.fillText(t('mix.master'), ARR_MARGIN+6, y0+h*0.28);
  const red=m ? m.reduction : 0, redOn=red<-0.5;
  ctx.fillStyle= redOn ? '#ff6b6f' : 'rgba(255,255,255,.55)'; ctx.font='11px system-ui';
  ctx.fillText(t('mix.limiter',{db:(Math.abs(red)<0.05?0:red).toFixed(1).replace('-','−')}), ARR_MARGIN+6, y0+h*0.72);
  // фейдер мастера — в верхней половине, тем же ходом, что у строк
  const fy=y0+h*0.3, kx=V.mfx0+v*V.mfw;   // MX2: у мастера свой ход во всю ширину (у строк его делит панорама)
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(V.mfx0,fy-3,V.mfw,6,3); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.roundRect(V.mfx0,fy-3,Math.max(0,kx-V.mfx0),6,3); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.roundRect(kx-6,y0+4,12,h*0.5-6,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillText(levelLbl(v), V.x0+V.bw+8, fy);
  // измеритель — в нижней половине: −60…0 дБFS, удержание пика ~1 с
  const pk=m?m.peak:0, db=pk>0?20*Math.log10(pk):-120, fr=Math.max(0,Math.min(1,(db+60)/60)), now=performance.now();
  if(fr>=meterHold || now-meterHoldT>1000){ meterHold=fr; meterHoldT=now; }
  const my=y0+h*0.66, mh=Math.max(6,h*0.2);
  ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(V.mfx0,my,V.mfw,mh);
  ctx.fillStyle= db>-1 ? '#ff6b6f' : db>-6 ? '#f5a524' : '#57d9a3'; ctx.fillRect(V.mfx0,my,V.mfw*fr,mh);
  ctx.fillStyle='#fff'; ctx.fillRect(V.mfx0+V.mfw*meterHold-1,my,2,mh);
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillText((db<=-120?'−∞':db.toFixed(1).replace('-','−'))+' '+t('mix.dbfs'), V.x0+V.bw+8, my+mh/2);
  ctx.textBaseline='alphabetic';
}
function arrClip(s,w){ if(ctx.measureText(s).width<=w) return s; let a=s; while(a.length>1&&ctx.measureText(a+'…').width>w) a=a.slice(0,-1); return a+'…'; }
function arrRowHeader(lid,x,ry,w,rowH,armed,name,col){
  // ручка перестановки: три черты во всю высоту гнезда ARR_HANDLE_W (палец берёт её где угодно в строке слева)
  const hx=x+ARR_HANDLE_W/2, hy=ry+rowH/2;
  ctx.fillStyle='rgba(255,255,255,.07)'; ctx.beginPath(); ctx.roundRect(x+2,ry+4,ARR_HANDLE_W-6,rowH-8,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)'; for(const d of [-5,0,5]) ctx.fillRect(hx-7,hy+d-1,12,2);
  // имя цветом роли; ниже — «L#» (у переименованной ещё «роль · тембр»: имя по умолчанию не теряется). Вооружена — «L#» и точка красные
  const nx=x+ARR_HANDLE_W, nw=w-ARR_HANDLE_W, custom=laneNameOf(lid)!=null;
  const line2='L'+(lid+1)+(custom?' · '+laneDefName(lid):'');
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle=col; ctx.font='600 12px system-ui';
  const n1=arrClip(name,nw-(armed?8:0)), w1=ctx.measureText(n1).width;
  ctx.fillText(n1, nx, ry+rowH*0.34);
  ctx.fillStyle= armed ? '#ff6b6f' : 'rgba(255,255,255,.55)'; ctx.font='11px system-ui';
  const n2=arrClip(line2,nw), w2=ctx.measureText(n2).width;
  ctx.fillText(n2, nx, ry+rowH*0.70);
  if(armed){ ctx.fillStyle='#e5484d'; ctx.beginPath(); ctx.arc(x+w,ry+rowH*0.34,3.5,0,7); ctx.fill(); }
  ctx.textBaseline='alphabetic';
  return { nameX0:nx, nameX1:nx+w1, lblX0:nx, lblX1:nx+w2, handleX0:x+2, handleX1:x+ARR_HANDLE_W-4 };   // AR2-fix: где встали имя, «L#» и ручка
}
/* ═══ AR1: МИНИАТЮРЫ НОТ — ИЗ songSegs (ноты высотных ролей) и songNotes (удары) ═══
   Высотная роль: запись на СЕГМЕНТ (то, что редактор правит как ноту) — время [t0, t1] и частоты его нот (у аккорда — все ноты, той же
   chordNotesAt, что играет ENG; у соло — leadFreqTi, у баса — bassFreqTi: цены движка). Высота в строке — логарифм частоты в пределах
   САМОЙ дорожки (lo…hi), поэтому мелодия читается контуром, а не прилипает к краю. Открытый сегмент (подложка) — до конца песни.
   Ударные: запись на удар, высота — ряд набора (0 — бочка внизу). Мемо — по объекту songSegs (тот пересобирается только в
   schedInvalidate), поэтому кадр стоит один проход по видимым строкам. Записи кладутся в снимок (loopView.mini) — их сверяет проба. */
const miniMemo={ view:null, by:new Map() };
function laneMini(ly){
  const SV=songSegs();
  if(miniMemo.view!==SV){ miniMemo.view=SV; miniMemo.by=new Map(); }
  let m=miniMemo.by.get(ly); if(m) return m;
  const items=[]; let lo=Infinity, hi=-Infinity, kind='pitch';
  for(const s of SV.segs){ if(s.layer!==ly) continue;
    const t1= s.end==null ? Math.max(songBeats(), s.start+1) : s.end;
    const fs= s.role==='ch' ? chordNotesAt(s.ti,s.oct,s.sc,s.sev,s.ty).map(n=>n.f) : [ s.role==='bs' ? bassFreqTi(s.ti,s.oct,s.sc) : leadFreqTi(s.ti,s.oct,s.sc) ];
    const ls=fs.filter(f=>f>0).map(f=>Math.log2(f)); for(const v of ls){ if(v<lo) lo=v; if(v>hi) hi=v; }
    items.push({ t0:s.start, t1, ls }); }
  if(!items.length){ kind='hits';
    for(const n of songNotes().notes) if(n.layer===ly && n.role==='dr') items.push({ t0:n.start, t1:n.start, row:(n.head.a&&n.head.a.row)|0 }); }
  m={ kind, items, lo, hi }; miniMemo.by.set(ly,m); return m;
}
function drawLaneMini(ly,ry,rowH){
  const V=loopView, m=laneMini(ly); if(V&&V.mini) V.mini.set(ly,m);
  const col=laneCol(ly), top=ry+5, h=rowH-10, w0=V.beat0, w1=V.beat0+V.span;
  ctx.fillStyle=col;
  if(m.kind==='hits'){ for(const it of m.items){ if(it.t0<w0-1||it.t0>w1) continue;
      const x=laneBeatX(V,it.t0), y=top+h-(it.row+1)*h/DRUM_ROWS; ctx.fillRect(x-0.75,y,1.6,Math.max(1.5,h/DRUM_ROWS-1)); }
    return; }
  const span=m.hi-m.lo, yOf=v=> span>1e-9 ? top+h-2-(v-m.lo)/span*(h-4) : top+h/2;
  for(const it of m.items){ if(it.t1<w0||it.t0>w1) continue;
    const x=laneBeatX(V,it.t0), w=Math.max(2,laneBeatX(V,it.t1)-x-1);
    for(const v of it.ls) ctx.fillRect(x, yOf(v)-1.25, w, 2.5); }
}
/* ⛳ ПОПАДАНИЕ ПО ПЕРЕКЛЮЧАТЕЛЯМ ДОРОЖКИ — ИЗ ТОЙ ЖЕ ГЕОМЕТРИИ, ЧТО И РИСОВАНИЕ (правило #9).
   Координаты — в пикселях холста (он fixed inset:0 и canvas.width===innerWidth, см. vision.resize,
   но вызывающий всё равно вычитает getBoundingClientRect — так безопаснее и стоит один вызов на тап).
   Возвращает {layer, what:'mute'|'solo'} или null. САМ НИЧЕГО НЕ ДЕЛАЕТ: тап обрабатывает ui, состояние
   меняет recorder (правило #5) — draw лишь отвечает, куда попали.
   ⚠️ ЗОНА ПОПАДАНИЯ ШИРЕ НАРИСОВАННОЙ КНОПКИ: по вертикали — ВСЯ строка, по горизонтали — гнездо вместе
   с зазором. Палец толще буквы, а промах по соседней кнопке хуже промаха в пустоту.
   ⚠️ loopView===null, когда полосы нет (нет петли ИЛИ идёт запись клипа) — тогда и попадать не во что. */
export function loopHit(px,py){
  const V=loopView; if(!V) return null;
  /* ⛳ ПОЛОСА СКОБЫ (S3.5b) — {what:'brace', beat}. Граница с дорожками — ТОТ ЖЕ V.gy0, от которого
     считаются строки ниже: зона скобы кончается ровно там, где начинается строка 0, поэтому тап не может
     попасть в обе цели. По X — от кромки коробки до гнёзд переключателей (tx0); доля — laneBeatAt того же V. */
  if(V.sec && py>=V.sec.y0 && py<V.sec.y1){   // ED6: the window's sections band — a marker's label, else the empty band at a beat
    if(px<V.x0-10 || px>=V.tx0) return null;
    const m=V.sec.marks.find(r=>px>=r.x0-4 && px<=r.x1+2);
    return m ? { what:'sec', id:m.id, beat:m.beat } : { what:'secband', beat:laneBeatAt(V,px) }; }
  if(py>=V.hy0 && py<V.gy0) return (px>=V.bx0-10 && px<V.tx0) ? { what:'brace', beat:laneBeatAt(V,px) } : null;   // E0-fix: зона — от КРОМКИ КОРОБКИ (bx0); доля — от начала линейки (x0): тап в колонке значков над ней даёт долю 0 (laneBeatAt жмёт)
  if(!V.rows.length) return null;
  if(V.ms && py>=V.ms.y0 && py<V.ms.y1) return (px>=V.x0-8 && px<V.x0+V.bw+8) ? { what:'mlevel' } : null;   // MX1: полоса мастера — фейдер мастера
  if(py<V.gy0 || py>=V.gy0+V.rows.length*V.rowH) return null;
  const ri=Math.floor((py-V.gy0)/V.rowH);
  /* Window: M / S under the finger (AF4: no ❄); the row body opens the track in the editor; the header arms. Zones from the drawn snapshot. */
  if(V.full){
    const st=ARR_BTN_W+ARR_BTN_GAP, dx=px-V.tx0;
    if(V.mix && px>=V.x0 && px<V.x0+V.bw) return { layer:V.rows[ri], what: px>=V.px0 ? 'pan' : 'level' };   // MX1: в лице микшера тело строки — фейдер; MX2: правый блок — панорама
    if(dx>=0){ const k=Math.floor(dx/st); return k<2 ? { layer:V.rows[ri], what:['mute','solo'][k] } : null; }
    if(px>=V.x0 && px<V.x0+V.bw) return { layer:V.rows[ri], what:'open', beat:laneBeatAt(V,px) };
    if(px>=V.hx0 && px<V.hx0+ARR_HANDLE_W) return { layer:V.rows[ri], what:'move', row:V.row0+ri };   // AR2: РУЧКА — перестановка (row — место строки в общем порядке)
    if(px>=V.hx0 && px<V.x0) return { layer:V.rows[ri], what:'arm', name:true };   // AR2: name — тап по ИМЕНИ (двойной — переименовать, ui)
    return null;
  }
  const dx=px-V.tx0, step=LANE_TOG_W+LANE_TOG_GAP;
  if(dx>=0 && dx<step*2) return { layer:V.rows[ri], what: dx<step ? 'mute' : 'solo' };
  /* S3.5d: ✕ — та же строка ri, третье гнездо за отступом LANE_DEL_GAP (отступ — мёртвая зона). Геометрия та же,
     по которой drawLooper ставит кнопку: tx0 + 2·step + LANE_DEL_GAP. */
  const ddx=dx-step*2-LANE_DEL_GAP;
  if(ddx>=0 && ddx<step) return { layer:V.rows[ri], what:'del' };
  if(dx>=0) return null;
  /* S3.5c: ТА ЖЕ СТРОКА ri, левее гнёзд — вооружить дорожку. Слева захватываем и подпись «L1» (она висит левее
     линейки): палец тянется к имени дорожки. Гнёзда M/S проверены ВЫШЕ — тап по ним не вооружает. */
  if(dx<0 && px>=V.bx0-24) return { layer:V.rows[ri], what:'arm' };   // E0-fix: от кромки коробки — колонка значков тоже «строка вне гнёзд», тап по ней вооружает
  return null;
}
/* Доля под пикселем для ПЕРЕТАСКИВАНИЯ края скобы (S3.5b): тот же laneBeatAt по тому же снимку.
   Вертикаль НЕ проверяем — палец, съехавший с полосы на строки, продолжает тащить взятый край.
   null — полосы нет (и тащить нечего). */
export function loopBeatAt(px){ const V=loopView; return V ? laneBeatAt(V,px) : null; }
/* ⛳ ОКНО ПРОКРУТКИ ПОЛОСЫ ДОРОЖЕК — для жеста ui (перетаскивание строк, колесо): по ТОМУ ЖЕ снимку, что нарисован (правило #9).
   null — строки влезают все (листать нечего; полоса прежняя) или полосы нет. Прямоугольник — строки с подвалом, по ширине вся коробка. */
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkTracks): снимок геометрии полосы дорожек последнего кадра (тот, по которому ловит loopHit). Только чтение. */
export const loopViewProbe=()=>loopView;
/* ⛔ ТОЛЬКО ДЛЯ ПРОБЫ (P.checkTrackLook, AR2-fix): где встанут тексты строк ПОЛОСЫ ИГРЫ на ширине холста W — по ТОЙ ЖЕ stripCols/stripRowText,
   что рисует drawLooper (без колонки значков и с ней). old — где стоял бы «L#» ПРЕЖНЕЙ раскладки (правый край x0−4, шрифт 10px): контроль,
   который мера обязана поймать (он за рамкой). Ничего не рисует; шрифт холста возвращается. */
export function stripProbe(W){
  ctx.save();
  try{
    const rows=[]; let old=null;
    for(const markW of [0, MARK_COL_W]){ const C=stripCols(W, markW);
      for(const ly of laneOrder()){ const R=stripRowText(ly, C, laneTitle(ly)); rows.push({ ly, markW, frame:[C.fx0,C.fx1], col:[C.x0, C.x0+C.nameW], lbl:[R.lblX0,R.lblX1], name:[R.nameX0,R.nameX1], nm:R.nm, bw:C.bw }); }
      if(markW===0){ ctx.font='10px system-ui'; const ly=laneOrder().slice(-1)[0]??0, w=ctx.measureText('L'+(ly+1)).width; old={ frame:[C.fx0,C.fx1], lbl:[C.x0-4-w, C.x0-4] }; } }
    return { W, rows, old, bw:stripCols(W,0).bw };
  } finally { ctx.restore(); }
}
export function loopScroll(){ const V=loopView; if(!V||!V.over) return null;
  return { row0:V.row0, nAll:V.nAll, visN:V.visN, rowH:V.rowH, x0:V.sx0, x1:V.sx1, y0:V.gy0, y1:V.gy0+V.rows.length*V.rowH+LOOP_FOOT_H }; }
/* ⛳ AR1: ГЕОМЕТРИЯ ОКНА АРАНЖИРОВКИ для жестов ui (прокрутка и зум времени, якорь под пальцем) — из ТОГО ЖЕ снимка (правило #9). null —
   окно не нарисовано (или на экране полоса игры). */
export function arrGeom(){ const V=loopView; if(!V||!V.full) return null;
  return { x0:V.x0, bw:V.bw, beat0:V.beat0, span:V.span, rowH:V.rowH, gy0:V.gy0, y1:V.gy0+V.rows.length*V.rowH, mix:V.mix, all:V.all, row0:V.row0, nVis:V.rows.length, hx0:V.hx0, hw:V.x0-V.hx0, fx0:V.fx0, fw:V.fw, px0:V.px0, pfx0:V.pfx0, pfw:V.pfw, mfx0:V.mfx0, mfw:V.mfw, ms:V.ms, handleW:ARR_HANDLE_W, sec:V.sec }; }   // ED6: sec — the sections band (ui places the rename field over a marker)

export { drawLooper, loopViewClear };
