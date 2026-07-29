import { FINGER_TIPS, FX_META, PINCH_ON, PINCH_HOLD, PINCH_OFF, REV_NEAR, REV_RANGE, ROW_HYST, WATCHDOG_MS,
         CH_PAL_PAD, CH_PAL_HEAD_H, PAL_HYST_X, PAL_HYST_Y, palSplitX, CLEAR_HOLD_MS, LOOPER_MSG_MS } from './config.js';
import { fx, setRevDisp, setChBrightDisp, setLooperMsg, setLooperClear, setExprDisp, setExprBrightDisp, leadIdx, chIdx, bassIdx, latchDeg, setLatchDeg, latchTy, setLatchTy, chordFam, setChordFam, chordVar, setChordVar, phoneInstr, handFnOf, rectOctReg, setRectOctReg, splitOn, phoneHalves, sx, sy, handSide } from './state.js';
import { IVX, supportsChords, typedChords, chordFams, rectGrid, rectRows, rectRowsFull, thereminHz } from './scales.js';
import { WleadOn, WleadOff, WchOn, WchSet, WchOff, WbassOn, WbassOff, WdrumHit,
         onRec, onLoop, onUndo, clearRec, recording, loop, events } from './recorder.js';
import { t } from './i18n.js';
import { hooks } from './hooks.js';
import { chordHold, DRUM_ROWS, applyExpr } from './audio.js';
import { canvas } from './vision.js';
/* ЗАЦЕПКИ ОБУЧЕНИЯ (tutor). События шлём В ТОЧКАХ РЕАЛЬНОГО ДЕЙСТВИЯ (не пересчитываем параллельно):
   событие возникает ⇔ действие произошло. Обучение учит ТЕКУЩЕЙ жест-модели — при изменении жестов
   эти зацепки НАДО править вместе с ними. tutorTap — nullsafe обёртка (hooks.tutor ставит src/tutor.js). */
const tutorTap=(kind,payload)=>{ if(hooks.tutor) hooks.tutor(kind,payload); };
let tutSeenT=0;   // троттлинг heartbeat 'seen' (рука в кадре) — ~1/с
 
const clamp01=v=>Math.max(0,Math.min(1,v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/* Расстояние «большой палец → кончик» нормируется на размер ладони
   (запястье → основание указательного): щипок срабатывает одинаково
   вблизи и вдали от камеры — критично при игре Z-ревербом. */
function pinchRatios(lm){
  const scale=dist(lm[0],lm[5])||1e-6, r={};
  for(const f of FINGER_TIPS)r[f]=dist(lm[4],lm[f])/scale;
  return r;
}
function minFinger(r){
  let mf=FINGER_TIPS[0],mv=Infinity;
  for(const f of FINGER_TIPS)if(r[f]<mv){mv=r[f];mf=f;}
  return[mf,mv];
}
function emaS(S,k,v,a=0.35){ S.sm[k]=(k in S.sm)?S.sm[k]+a*(v-S.sm[k]):v; return S.sm[k]; }

/* ═══════════ ВЫРАЗИТЕЛЬНОСТЬ («смычок») — ВСЕ настройки в ОДНОМ месте (крутят НА СЛУХ) ═══════════
   Метафора смычка: рука не ЗАДАёт звук, а КОРМИТ энергию, которую система тратит. Мало входов
   (ЭНЕРГИЯ = скорость центра ладони; НАТЯЖЕНИЕ = сжатость кисти) → БОГАТАЯ внутренняя динамика
   (резонатор энергии, дрейф тембра, инерц-пружина). Всё в звук идёт через ВОЗБУЖДЕНИЕ
   (накачка-и-спад, пружина) и setTargetAtTime, НИКОГДА прямым присваиванием: прямое присваивание —
   ровно то, что делает управление «роботным», а вся фича существует, чтобы этого избежать.
   Первый заход (по плану §5): ТОЛЬКО соло, ТОЛЬКО энергия+натяжение, живьём (в событие не пишем). */
const EXPR_CFG={
  dtMin:0.005, dtMax:0.10,   // КЛАМП dt (с) — НЕ опционален: застрявший кадр дал бы огромный dt (и лишние суб-шаги). Устойчивость пружины он НЕ обеспечивает — это делает subDt (см. tickExpr)
  subDt:0.008,               // ФИКС. внутренний шаг интегрирования (~125 Гц): динамика суб-шагами, поэтому пружина/резонатор УСТОЙЧИВЫ при ЛЮБОЙ частоте кадров. Прежде f0=2.5Гц самовозбуждалась при dt>~0.075с (реальные ~10-20fps десктопа) → постоянное дрожание ~кадр/2, независимое от руки. ω·subDt=0.13 ≪ 2 — большой запас
  aPos:0.35,                 // сглаживание центра ладони (ema, доля за кадр) — ПЕРЕД дифференцированием (производная усиливает шум)
  tauV:0.12,                 // сглаживание СКОРОСТИ (с) — ПОСЛЕ дифференцирования: гасит скачки джиттера кадр-в-кадр, которые иначе накачивали бы энергию в покое
  v0:0.35, v1:2.5,           // МЁРТВАЯ ЗОНА скорости (размеров ладони/с): ниже v0 — РОВНО 0 (покоящаяся рука с джиттером ≈0.05..0.15 НЕ переходит порог), выше v1 — полный отклик. КНОБ: поднять v0, если в покое остаётся шевеление
  cOpen:1.15, cClosed:0.55,  // ВАУ (сжатость кисти): раскрытая ладонь ≈cOpen (пик вверх), кулак ≈cClosed (пик вниз) — среднее центр→5 кончиков / размер ладони
  orDead:0.20, orFull:0.75,  // ПРОСТРАНСТВО (наклон ладони → эхо): |верт. компонента нормали| ниже orDead — сухо (мёртвая зона у плашмя-к-камере), выше orFull — полное эхо
  sprMin:0.40, sprMax:1.20,  // ТЕКСТУРА (размах пальцев / размер ладони): щепоть ≈sprMin → тёплое, веер ≈sprMax → грязное
  tauT:0.25,                 // сглаживание ПОЗ (натяжение/наклон/размах, с) — поза, не рывок
  tauE:0.4,                  // РЕЗОНАТОР энергии: постоянная спада (с). «Смычок»: движение накачивает ЖИВОСТЬ, стоит — оседает (тон мертвеет)
  kPump:2.5,                 // сила накачки: kPump·tauE=1 → устойчивое E = e (линейный диапазон)
  springF0:2.5, springZeta:0.55,   // ИНЕРЦИЯ (масса-пружина) на ВСЕХ каналах (живость/вау/пространство/текстура): рывок → перелёт-и-оседание = «тело». f0 (Гц), затухание ζ. Устойчива благодаря subDt
  tcNode:0.03,               // сглаживание узлов выразительности, с   (числа стороны звука — глубины/диапазоны — в audio.EXPR_A: обратный импорт запрещён)
  tauEngage:0.3,             // ВВОД/ВЫВОД: плавный кроссфейд к нейтрали за ~эту постоянную (с) — без щелчка на появлении/уходе руки
};
/* smoothstep с мёртвой зоной: <a → 0 (РОВНО), >b → 1, между — гладко. Несущая часть: покоящаяся рука = 0 энергии. */
function smoothstep(a,b,x){ if(b<=a)return x>=b?1:0; const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
/* Динамика «смычка» — состояние ИНСТРУМЕНТА, не руки (владелец может смениться, энергия продолжается).
   E резонатор энергии; pres/wid/spat/sat — цели-через-пружину (X позиция, V скорость) = ЧЕТЫРЕ РАЗНЫЕ оси:
   ПРИСУТСТВИЕ (энергия), ШИРИНА (натяжение→фейзер), ПРОСТРАНСТВО (наклон→делей), ТЕКСТУРА (размах→драйв);
   engage кроссфейд к нейтрали. Яркость как ось убрана (была общей для трёх каналов — отсюда и жалоба). */
const EXPR={E:0,presX:0,presV:0,widX:0,widV:0,spatX:0,spatV:0,satX:0,satV:0,engage:0};
let exprPrevT=0;
/* Признаки руки-выразительности из СЫРЫХ lm, нормировано размером ладони (правило #12): sx/sy НЕ трогаем.
   Пишет S.exprE (энергия 0..1 через мёртвую зону), S.exprTsm (натяжение), S.exprMoveT (последнее движение). */
function exprFeatures(S,lm,dt,now){
  const hs=Math.max(dist(lm[0],lm[9]),0.02);
  const cx=(lm[0].x+lm[5].x+lm[9].x+lm[13].x+lm[17].x)/5, cy=(lm[0].y+lm[5].y+lm[9].y+lm[13].y+lm[17].y)/5;
  if(!S.exprPs){ S.exprPs={x:cx,y:cy}; S.exprTsm=null; S.exprVsm=0; S.exprOr=null; S.exprSpr=null; }
  const p=S.exprPs, nx=p.x+EXPR_CFG.aPos*(cx-p.x), ny=p.y+EXPR_CFG.aPos*(cy-p.y);
  const vRaw=Math.hypot(nx-p.x,ny-p.y)/hs/dt;            // скорость в размерах ладони/с (сглаженная позиция → диф.)
  S.exprPs={x:nx,y:ny};
  S.exprVsm+=(vRaw-S.exprVsm)*Math.min(1,dt/EXPR_CFG.tauV);   // сглаживаем СКОРОСТЬ: скачки джиттера кадр-в-кадр иначе пробивали бы мёртвую зону и качали энергию в покое
  S.exprE=smoothstep(EXPR_CFG.v0,EXPR_CFG.v1,S.exprVsm);      // мёртвая зона на СГЛАЖЕННОЙ скорости; покой → РОВНО 0
  /* НАТЯЖЕНИЕ (сжатость кисти) → ШИРИНА (фейзер): РАСКРЫТАЯ ладонь = широко/кружит (1), КУЛАК = узко/просто (0).
     Раскрыть руку интуитивно читается как «дать больше», сжать — как придержать: жест, который человек делает
     БЕЗ обучения. (Раньше вело яркость — убрали, чтобы каналы не сливались.) c — среднее центр→5 кончиков / размер ладони. */
  let cs=Math.hypot(lm[4].x-nx,lm[4].y-ny);               // большой (4) + четыре кончика (FINGER_TIPS) → 5
  for(const f of FINGER_TIPS)cs+=Math.hypot(lm[f].x-nx,lm[f].y-ny);
  const c=(cs/5)/hs, Traw=clamp((c-EXPR_CFG.cClosed)/(EXPR_CFG.cOpen-EXPR_CFG.cClosed),0,1);   // раскрыто (c большое)=1 широко, сжато=0 узко
  if(S.exprTsm==null)S.exprTsm=Traw;
  S.exprTsm+=(Traw-S.exprTsm)*Math.min(1,dt/EXPR_CFG.tauT);
  /* ПРОСТРАНСТВО (наклон ладони → ЭХО/делей). Нормаль плоскости через 0,5,17 (3D, с .z-глубиной MediaPipe).
     Плашмя к камере → нормаль вдоль оси z, |верт. компонента|≈0 (сухо); наклонил ладонь → верт. компонента
     растёт (эхо). Берём МОДУЛЬ (наклон в любую сторону = эхо): знак нормали зависит от хиральности руки (лево/
     право), модуль устойчив к этому. Мёртвая зона orDead у нейтрали. Знак/ось — кноб на слух (если «не та» сторона). */
  const ux=lm[5].x-lm[0].x, uy=lm[5].y-lm[0].y, uz=(lm[5].z||0)-(lm[0].z||0);
  const vx=lm[17].x-lm[0].x, vy=lm[17].y-lm[0].y, vz=(lm[17].z||0)-(lm[0].z||0);
  const nX=uy*vz-uz*vy, nY=uz*vx-ux*vz, nZ=ux*vy-uy*vx, nl=Math.hypot(nX,nY,nZ)||1e-6;
  const orRaw=smoothstep(EXPR_CFG.orDead,EXPR_CFG.orFull,Math.abs(nY/nl));   // мёртвая зона: почти-плашмя → РОВНО 0 сухо
  if(S.exprOr==null)S.exprOr=orRaw;
  S.exprOr+=(orRaw-S.exprOr)*Math.min(1,dt/EXPR_CFG.tauT);
  /* ТЕКСТУРА — РАЗМАХ пальцев: средняя ПОПАРНАЯ дистанция 5 кончиков / размер ладони (10 пар). ОТЛИЧНО от
     натяжения (там — от ЦЕНТРА): рука бывает раскрытой-но-щепотью или сжатой-но-веером. Веер=грязно, щепоть=чисто.
     Мёртвая зона — карта от щепоти (sprMin→0) к вееру (sprMax→1), покоящаяся щепоть = 0 (чисто). */
  const tp=[lm[4],lm[8],lm[12],lm[16],lm[20]]; let sp=0;
  for(let a=0;a<5;a++)for(let b=a+1;b<5;b++)sp+=Math.hypot(tp[a].x-tp[b].x,tp[a].y-tp[b].y);
  const spread=(sp/10)/hs, sprRaw=clamp((spread-EXPR_CFG.sprMin)/(EXPR_CFG.sprMax-EXPR_CFG.sprMin),0,1);
  if(S.exprSpr==null)S.exprSpr=sprRaw;
  S.exprSpr+=(sprRaw-S.exprSpr)*Math.min(1,dt/EXPR_CFG.tauT);
  if(S.exprE>0)S.exprMoveT=now;                           // «последнее движение» → выбор владельца при двух руках
}
/* Динамика + вывод в звук — ОДИН раз за кадр. Владелец = ПОСЛЕДНЯЯ ДВИГАВШАЯСЯ рука-выразительность
   (две руки не дерутся за один инструмент). Ничего не пишем в событие — живьём (как терменвокс-Гц). */
function tickExpr(now,dt){
  let owner=null;
  for(const k in HANDS){ const S=HANDS[k]; if(S.isExpr&&S.seen===now){ if(!owner||(S.exprMoveT||0)>(HANDS[owner].exprMoveT||0))owner=k; } }
  const active=!!owner;
  if(!active&&EXPR.engage<=1e-3)return;                   // ни одной руки-выразительности и уже нейтраль → узлы НЕ трогаем (байт-в-байт как сегодня)
  EXPR.engage+=((active?1:0)-EXPR.engage)*Math.min(1,dt/EXPR_CFG.tauEngage);   // engage — одно-полюсный, устойчив на полном dt
  const e=active?(HANDS[owner].exprE||0):0, T=active?(HANDS[owner].exprTsm||0):0,
        OR=active?(HANDS[owner].exprOr||0):0, SPR=active?(HANDS[owner].exprSpr||0):0;   // OR пространство (наклон), SPR текстура (размах)
  /* СУБ-ШАГ: вся динамика фиксированным малым шагом subDt, сколько бы ни длился кадр. Так пружина (и резонатор)
     устойчивы при ЛЮБОЙ частоте кадров — раньше f0=2.5Гц самовозбуждалась при dt>~0.075с (реальные ~10-20fps
     десктопа с синхронным MediaPipe), давая постоянное дрожание ~кадр/2 вне зависимости от руки. e/T/OR/SPR на
     кадр постоянны. Резонатор энергии («смычок») + инерц-пружина на КАЖДОМ из ЧЕТЫРЁХ каналов (полу-неявный
     Эйлер = «тело»). ЧЕТЫРЕ РАЗНЫЕ цели → четыре РАЗНЫЕ оси звука, а не одна ось четырьмя способами. */
  const w=2*Math.PI*EXPR_CFG.springF0, w2=w*w, zw=2*EXPR_CFG.springZeta*w;
  let rem=dt;
  while(rem>1e-6){
    const h=Math.min(EXPR_CFG.subDt,rem); rem-=h;
    EXPR.E+=(EXPR_CFG.kPump*e-EXPR.E/EXPR_CFG.tauE)*h; EXPR.E=clamp(EXPR.E,0,1);   // энергия → ЖИВОСТЬ (вибрато), НЕ громкость
    EXPR.presV+=(w2*(EXPR.E-EXPR.presX)-zw*EXPR.presV)*h; EXPR.presX+=EXPR.presV*h;   // ЖИВОСТЬ (энергия → глубина вибрато)
    EXPR.widV +=(w2*(T  -EXPR.widX )-zw*EXPR.widV )*h; EXPR.widX +=EXPR.widV *h;       // ВАУ (натяжение → частота пика)
    EXPR.spatV+=(w2*(OR -EXPR.spatX)-zw*EXPR.spatV)*h; EXPR.spatX+=EXPR.spatV*h;       // ПРОСТРАНСТВО (наклон → делей)
    EXPR.satV +=(w2*(SPR-EXPR.satX )-zw*EXPR.satV )*h; EXPR.satX +=EXPR.satV *h;       // ТЕКСТУРА (размах → характер искажения)
  }
  const presE=clamp(EXPR.presX,0,1), widE=clamp(EXPR.widX,0,1), spatE=clamp(EXPR.spatX,0,1), drvE=clamp(EXPR.satX,0,1);
  /* В звук ЧЕТЫРЕ канала 0..1 + engage; мэппинг канал→узел (глубины/диапазоны) — в audio (EXPR_A). Энергия
     (presE) → ЖИВОСТЬ (вибрато), НЕ громкость: громкость целиком у нотной руки. Натяжение (widE) → ВАУ,
     размах (drvE) → ТЕКСТУРА, наклон (spatE) → ПРОСТРАНСТВО. engage: нет руки → всё в нейтраль за ~0.3с. */
  applyExpr(presE, widE, drvE, spatE, EXPR.engage, EXPR_CFG.tcNode);
  setExprDisp(EXPR.engage*EXPR.E);                        // индикатор «ВЫР» — энергия/живость смычка (0 когда отпущено)
  setExprBrightDisp(EXPR.engage*widE);                   // тон точек руки — раскрытость (вау), не отдельная полоса
}

/* ================= ОБРАБОТКА РУК =================
   ПАРСИНГ MEDIAPIPE: result.landmarks — массив рук; в каждой 21 точка
   с нормированными координатами (x,y ∈ 0..1, origin слева-сверху КАДРА). Детектор читает ПОЛНЫЙ кадр.
   ДВЕ РОЛИ координат, строго врозь: (1) СЫРЫЕ lm.x/lm.y — вся гест-математика (щипок pinchRatios,
   размер ладони dist(0,9), какой палец, Z-реверб, пороги): работает и когда рука наполовину за
   кадром; (2) ЭКРАННЫЕ — позиция и попадание (половина/прямоугольник/зона, X-громкость) через
   state.sx/sy: экранный x = sx(lm.x,W) = ремап flipX(lm.x) по state.viewRect ·W, аналогично y.
   sx складывает ЗЕРКАЛО (flipX: фронт зеркалим, тыл нет) и COVER-КАДРИРОВАНИЕ (viewRect из
   config.coverView, пишет drawVideoBackground каждый кадр): холст заполняется суб-прямоугольником
   кадра с соотношением холста (без растяга) + поле CAM_MARGIN внутрь, чтобы рука на крайних
   прямоугольниках ещё была в кадре. ТА ЖЕ область кадрирует картинку — рука и видео не разъедутся.
   Ключевые точки: 4 — кончик большого, 8/12/16/20 — кончики пальцев,
   0 — запястье, 9 — основание среднего (по паре 0–9 меряем «глубину» Z:
   видимый размер кисти стабильнее, чем сырая z-координата модели).
   result.handednesses[i][0].categoryName ('Left'/'Right') — стабильный
   ключ руки между кадрами: у каждой руки свой независимый автомат щипка. */
const HANDS={}; let leadOwner=null; let chOwner=null; let bassOwner=null;   // chOwner — рука защёлки, bassOwner — рука баса
let latchLen=0;   // сколько нот звучит у 'latch': по нему решаем «глиссандо или переатака»
/* Роль руки по handedness — ТОЛЬКО для аккордов/ударных (рука-палитра). Левая=палитра ('fx'),
   правая=ноты. swapHands УБРАН: рука-палитра аккордов теперь ФИКСИРОВАНА за левой (осознанный размен —
   обмен рук делается «Функциями рук» для соло/баса, глобального свопа больше нет; аккордам смена
   палитра↔ноты по руке была некритична). Соло/бас берут функцию из handFn (handFnOf), НЕ отсюда. */
function handRole(key){
  return key.slice(0,4)==='Left' ? 'fx' : 'notes';
}
/* Рука-ЛУПЕР (функция 'loop'): нот не играет, командует лупером щипками пальцев. Команды — СОБЫТИЯ, а не
   непрерывный звук: срабатывают РАЗ на формирование щипка (edge), не повторяются в удержании. Раскладка
   thumb+палец: указ.→запись, средн.→пуск/пауза, безым.→отмена слоя, мизинец→очистить ВСЁ (только после
   3с удержания с отсчётом — единственное разрушительное действие). Невозможные команды сообщаются, а не
   молчат. Здесь только логика; кнопки транспорта в UI работают как прежде (это ЕЩЁ один вход). */
function looperMsgSet(text,ok){ setLooperMsg({text, until:performance.now()+LOOPER_MSG_MS, ok}); }
function doLooper(cmd){
  if(cmd==='rec'){                                        // всегда возможно: пусто→запись, играет→наложение, пишет→стоп
    onRec(); looperMsgSet(recording ? t(loop.first?'msg.recording':'msg.overdub') : t('msg.recStop'), true);
  }else if(cmd==='play'){
    if(!loop.on && !events.length){ looperMsgSet(t('msg.noLoop'), false); return; }   // нечего играть
    onLoop(); looperMsgSet(t(loop.on?'msg.play':'msg.pause'), true);
  }else if(cmd==='undo'){
    if(!events.length){ looperMsgSet(t('msg.noLayers'), false); return; }                // нечего отменять
    onUndo(); looperMsgSet(t('msg.undo'), true);
  }else if(cmd==='clear'){
    if(!loop.on && !events.length){ looperMsgSet(t('msg.alreadyEmpty'), false); return; }    // нечего очищать — движок не дёргаем
    clearRec(); looperMsgSet(t('msg.cleared'), true);
  }
}
/* Вызов НА ЗАХВАТЕ щипка (edge) → единичное срабатывание по построению. index/middle/ring — сразу;
   мизинец только заводит 3с-таймер (S.clearT0) и показывает отсчёт, сама очистка — в блоке удержания. */
function fireLooperCmd(S,mf){
  const f=FINGER_TIPS.indexOf(mf);                        // 0 указ · 1 средн · 2 безым · 3 мизинец
  if(f===3){ S.clearT0=performance.now(); S.clearFired=false; setLooperClear(CLEAR_HOLD_MS); return; }
  if(f===0) doLooper('rec');
  else if(f===1) doLooper('play');
  else if(f===2) doLooper('undo');
}
/* «Солирующая НОТНАЯ рука» — та, что ЦЕЛИТСЯ ревербом (revDisp до щипка): реверб ляжет на её ноту,
   поэтому прицел ведёт именно она, а не рука эффектов и не рука из чужой половины. ЕДИНЫЙ источник
   правила для обоих сайтов revDisp (пер-кадровый прицел + сброс в 0). Условия: (1) роль руки=ноты
   (не fx); (2) её РОЛЬ-ПОЛОВИНА — соло. Single-role: половина одна, поэтому просто phoneInstr==='ld'
   (байт-в-байт со старым гейтом). Сплит: роль половины — замороженная S.role у щипнувшей руки, иначе
   живая половина под указательным (lm[8]) через phoneHalves — ТАК ЖЕ, как её берёт drawHandsPhone,
   чтобы прицел работал ДО щипка (в этом весь смысл). Нет соло-половины в паре → ни у кого не 'ld' →
   false у всех → второй сайт гасит revDisp в 0. */
/* Роль-половина ЭТОЙ руки СЕЙЧАС: single — глобальный phoneInstr; сплит — замороженная S.role (щипок)
   или живая половина под указательным (lm[8]). Единый источник для soloNoteHand И проверки руки-
   выразительности (правило #18 — в сплите функция берётся ПО РОЛИ ПОЛОВИНЫ). */
function soloHalfRole(key,S,W){
  if(!splitOn) return phoneInstr;
  if(S.pinch) return S.role;
  const lm=S.lm; if(!lm) return null;
  // px через sx (поля кадра); для ВЫБОРА половины клампим в [0,W): рука в полях сатурируется к ближней кромке, а не проваливается в чужую половину
  const px=clamp(sx(lm[8].x,W),0,W-1), hs=phoneHalves(W), h=hs.find(q=>px>=q.rx0&&px<q.rx1)||hs[hs.length-1];
  return h.role;
}
function soloNoteHand(key,S,W){
  const role=soloHalfRole(key,S,W);
  return role==='ld' && handFnOf(key,'ld')!=='fx' && handFnOf(key,'ld')!=='loop' && handFnOf(key,'ld')!=='expr';   // нотная рука соло (не эффекты, не лупер, не выразительность); двух нотных рук — целятся обе, последняя пишет revDisp
}
/* Раньше у соло сетка обрезалась на высоту нижней полосы эффектов. Полосы больше нет
   (столбики рисуются ПОВЕРХ слева), поэтому ввод считается по ВСЕЙ высоте — как и
   рисуется. Эти две высоты обязаны совпадать: разойдутся — палец будет брать не ту
   ступень, которую видит, и тем сильнее, чем ниже по экрану. */
function degRaw(y,rows,H){ const seg=H/rows;
  let z=Math.floor(y/seg); if(z<0)z=0; if(z>rows-1)z=rows-1;
  return rows-1-z;
}
/* Гистерезис по границам ступеней: чтобы в 19/31-TET (узкие ряды)
   не было «трели» на стыке, соседняя ступень берётся лишь когда
   палец ушёл от границы дальше 16% высоты ряда. */
function degHyst(y,rows,H,prev){
  const seg=H/rows; let d=degRaw(y,rows,H);
  if(prev>=0&&prev<=rows-1&&Math.abs(d-prev)===1){
    const zTop=rows-1-Math.max(d,prev), b=(zTop+1)*seg;
    if(Math.abs(y-b)<seg*ROW_HYST)return prev;
  }
  return Math.min(d,rows-1);
}
/* Гистерезис ОДНОЙ оси — общий движок для колонок и рядов палитры: соседнюю ячейку
   берём, только если палец ушёл от границы дальше hyst её размера. Тот же приём, что
   degHyst по Y; без него на узких ячейках выбор дребезжал бы от дрожания руки. */
function axHyst(v,a0,a1,n,prev,hyst){
  const seg=(a1-a0)/n; let d=Math.floor((v-a0)/seg); if(d<0)d=0; if(d>n-1)d=n-1;
  if(prev>=0&&prev<=n-1&&Math.abs(d-prev)===1){
    const b=a0+Math.max(d,prev)*seg;
    if(Math.abs(v-b)<seg*hyst)return prev;
  }
  return d;
}
/* Попадание в ячейку палитры: ДВЕ независимые одномерные проверки. Сначала X даёт
   колонку (семейство), и только потом её types.length задаёт число рядов для Y —
   порядок важен, наборы могут быть рваными. prev-состояние живёт на РУКЕ (S.pc/S.pr),
   а не в глобальном стейте: новый щипок начинает с чистого листа, а залипшая ячейка
   при этом остаётся выбранной. */
function cellHyst(x,y,x0,x1,y0,y1,fams,prevC,prevR){
  const c=axHyst(x,x0,x1,fams.length,prevC,PAL_HYST_X);
  const nR=fams[c].types.length;
  const r=axHyst(y,y0,y1,nR,(prevR>=0&&prevR<nR)?prevR:-1,PAL_HYST_Y);
  return [c,r];
}
/* Другая рука, всё ещё держащая щипок в той же зоне — для моно-передачи голоса. */
function otherPinched(key,zone){ for(const k in HANDS){ if(k!==key){ const S=HANDS[k]; if(S.pinch&&S.zone===zone) return k; } } return null; }
function endPinch(key,S){
  if(S.pinch){
    /* МОНО-ПЕРЕДАЧА: голос (соло/бас) моно; если его отпускает ВЛАДЕЛЕЦ, а другая рука ещё держит щипок
       в той же зоне — передаём владение ей (подхватит следующим кадром, голос НЕ гасим). Иначе гасим.
       Так «последний щипок побеждает», а рука, оставшаяся зажатой, не замолкает и не залипает. */
    if(S.zone==='ld'&&leadOwner===key){ const nx=otherPinched(key,'ld'); if(nx)leadOwner=nx; else{ WleadOff(); leadOwner=null; } }
    if(S.zone==='bs'&&bassOwner===key){ const nx=otherPinched(key,'bs'); if(nx)bassOwner=nx; else{ WbassOff(); bassOwner=null; } }
    /* 'ch': в ЗАЩЁЛКЕ (S.fn!=='hold') WchOff НЕ зовём — аккорд звучит и после размыкания, лишь отпускаем
       руль. В УДЕРЖАНИИ (S.fn==='hold') размыкание пальцев ГАСИТ аккорд (как соло-hold) и чистит защёлку. */
    if(S.zone==='ch'&&chOwner===key){
      if(S.fn==='hold'){ WchOff('latch'); setLatchDeg(-1); setLatchTy(null); latchLen=0; }
      // ЗАЦЕПКА ОБУЧЕНИЯ: в ЗАЩЁЛКЕ пальцы разомкнуты, а аккорд ЗВУЧИТ дальше — урок «Аккорды» ловит этот момент (в удержании — нет, там аккорд погас выше).
      else if(latchDeg>=0) tutorTap('chordLatch',{deg:latchDeg});
      chOwner=null;
    }
    if(S.zone==='loop'&&S.clearT0!=null&&!S.clearFired){   // мизинец отпущен ДО 3с → очистка ОТМЕНЕНА (ничего не делаем, гасим отсчёт)
      setLooperClear(-1); setLooperMsg({text:t('msg.clearCancelled'), until:performance.now()+LOOPER_MSG_MS, ok:true});
    }
  }
  S.pinch=false; S.adj=null; S.deg=-1; S.rect=null;   // S.rect — гистерезис прямоугольника, как S.pc/S.pr у палитры
  S.inert=false; S.fresh=false; S.fn=null;      // размыкание снимает инертность и функцию руки
  S.clearT0=null; S.clearFired=false;           // отсчёт очистки лупера — сброс на размыкании
}
function processHands(res){
  const W=canvas.width, H=canvas.height, now=performance.now();
  const dtm=exprPrevT?clamp((now-exprPrevT)/1000,EXPR_CFG.dtMin,EXPR_CFG.dtMax):EXPR_CFG.dtMin;   // dt кадра для «смычка», КЛАМП обязателен (застрявший кадр иначе взорвал бы интеграторы)
  exprPrevT=now;
  const seen=new Set();
  const hands=(res&&res.landmarks)?res.landmarks:[];
  const heads=(res&&(res.handednesses||res.handedness))||[];

  for(let i=0;i<hands.length;i++){
    const lm=hands[i];
    let key=(heads[i]&&heads[i][0]&&heads[i][0].categoryName)||('H'+i);
    if(seen.has(key))key+=i;
    seen.add(key);
    const S=HANDS[key]||(HANDS[key]={pinch:false,deg:-1,oct:0,zone:null,vol:.6,rev:0,adj:null,sm:{},inert:false,fresh:false,role:null,rx0:0,rx1:0,fn:null,clearT0:null,clearFired:false});
    S.seen=now; S.lm=lm;
    /* X-диапазон роли по УМОЛЧАНИЮ (single-role, сплит выключен): вся ширина [0,W], раздел
       palSplitX(0,W)=CH_PAL_W*W (как было). При splitOn половину выводим из точки щипка и ЗАМОРАЖИВАЕМ
       на S (S.role/S.rx0/S.rx1) рядом с S.zone — чтобы чтение при игре совпало с захватом. */
    const [rx0,rx1]=[0,W], split=palSplitX(rx0,rx1);

    const r=pinchRatios(lm), [mf,mv]=minFinger(r);
 
    if(!S.pinch&&mv<PINCH_ON){
      /* Захват щипка: палец задаёт октаву, а ЗОНА фиксируется по точке
         щипка и не меняется до отпускания — двигая руку по X ради
         громкости, нельзя случайно перескочить в соседнюю колонку. */
      S.pinch=true; S.oct=FINGER_TIPS.indexOf(mf); S.deg=-1; S.sm={};
      S.pc=null; S.pr=null;                  // память гистерезиса палитры — на руке: новый щипок начинает с чистого листа
      S.rect=null;                           // память гистерезиса прямоугольника — тоже на руке, тем же приёмом
      S.clearT0=null; S.clearFired=false;    // отсчёт очистки лупера — свежий на каждый щипок (мизинец заведёт ниже)
      {
        const py=sy((lm[4].y+lm[mf].y)/2,H);       // экранные пиксели игрового поля (поля кадра сняты); гест-математику щипка выше это не касается — там сырые lm
        const px=sx((lm[4].x+lm[mf].x)/2,W);
        if(splitOn){
          /* СПЛИТ-ЭКРАН: половину (роль + X-диапазон) выбираем ПО ТОЧКЕ ЩИПКА и ЗАМОРАЖИВАЕМ на S —
             как S.zone. Роль этой руки = роль её половины (зона=инструмент). Раздел палитра|ноты —
             palSplitX диапазона ИМЕННО этой половины. Палитра — ПО ПОЛОЖЕНИЮ (без handRole): любая
             рука с большим+указательным (S.oct===0) слева от раздела выбирает тип. Эффекты — по
             ФУНКЦИИ руки в соло (handFnOf==='fx'), только в соло-половине (h.role==='ld'): дефолт
             handFn.ld.L='fx' ДЕРИВИРУЕТ прежний хардкод «эффекты у левой», без отдельного правила. */
          const halves=phoneHalves(W), hx=clamp(px,0,W-1), h=halves.find(q=>hx>=q.rx0&&hx<q.rx1)||halves[halves.length-1];   // клампим px ТОЛЬКО для выбора половины: щипок в поле полей целится в ближнюю половину, а не в чужую
          S.role=h.role; S.rx0=h.rx0; S.rx1=h.rx1;
          const hLoop = (h.role==='ld'||h.role==='bs'||h.role==='ch') && handFnOf(key,h.role)==='loop';   // рука-ЛУПЕР: команды по пальцам, положение на экране НЕважно (октавную полосу/палитру игнорируем)
          const hExpr = h.role==='ld' && handFnOf(key,'ld')==='expr';   // рука-ВЫРАЗИТЕЛЬНОСТЬ: щипком НИЧЕГО не играет (считается пофреймово ниже); перебивает положение, как лупер
          const hsplit=palSplitX(h.rx0,h.rx1);
          const rectRole = (h.role==='ld'||h.role==='bs'||h.role==='ch') && rectGrid();
          const octRight = h.role!=='ch' || px>=hsplit;   // у аккордов октава — только в правой (нотной) части половины
          const octBand  = rectRole && octRight && degRaw(Math.min(py,H-1),rectRowsFull(),H)===0;
          const famHand  = h.role==='ch' && typedChords() && S.oct===0 && px<hsplit;   // ПОЛОЖЕНИЕ, без handRole
          S.zone = hLoop ? 'loop'
                 : hExpr ? 'expr'
                 : octBand ? 'oct'
                 : famHand ? 'chFam'
                 : (h.role==='ld' && handFnOf(key,'ld')==='fx') ? 'fx'   // эффекты — ФУНКЦИЯ руки в соло; дефолт handFn.ld.L='fx' ДЕРИВИРУЕТ прежний хардкод «эффекты у левой в соло-половине»
                 : h.role;
        }else{
          /* ── SINGLE-ROLE (сплит выключен): сегодняшний путь, байт-в-байт ──
             Рука-«не-нотная» (handRole==='fx', по умолчанию ЛЕВАЯ) получает особую роль только там,
             где она есть: эффекты у соло, выбор семейства у типизированных аккордов. Октавный
             прямоугольник — ПОЛОЖЕНИЕ важнее роли (полоса 0 → 'oct', даже если это fx-рука), стоит
             ПЕРВЫМ в тернаре. У аккордов октава живёт только в правой половине [SPLIT,W]. */
          const sLoop = (phoneInstr==='ld'||phoneInstr==='bs'||phoneInstr==='ch') && handFnOf(key,phoneInstr)==='loop';   // рука-ЛУПЕР: команды по пальцам, положение НЕважно (октавную полосу/палитру игнорируем)
          const sExpr = phoneInstr==='ld' && handFnOf(key,'ld')==='expr';   // рука-ВЫРАЗИТЕЛЬНОСТЬ: щипком НИЧЕГО не играет (считается пофреймово ниже)
          const rectRole = (phoneInstr==='ld'||phoneInstr==='bs'||phoneInstr==='ch') && rectGrid();   // rect-раскладка: соло, бас И аккорды
          const octRight = phoneInstr!=='ch' || px>=split;
          const octBand = rectRole && octRight && degRaw(Math.min(py,H-1),rectRowsFull(),H)===0;
          const famHand = phoneInstr==='ch' && typedChords() && handRole(key)==='fx';   // палитра аккордов — фиксировано за левой (handRole)
          S.zone = sLoop ? 'loop'
                 : sExpr ? 'expr'
                 : octBand ? 'oct'
                 : famHand ? 'chFam'
                 : (phoneInstr==='ld'&&handFnOf(key,'ld')==='fx') ? 'fx'   // эффекты — если ФУНКЦИЯ этой руки в соло = fx
                 : phoneInstr;
        }
        S.fn = S.zone==='loop' ? 'loop'
             : (S.zone==='ld'||S.zone==='bs'||S.zone==='ch') ? handFnOf(key,S.zone) : null;   // функция руки: соло/бас — note/hold/therm; аккорды — latch/hold; лупер — loop; у fx/oct/chFam/ударных — null
        // ЗАЦЕПКА ОБУЧЕНИЯ: щипок сформирован (edge) — палец(=октава)+зона+рука. По построению раз на щипок.
        tutorTap('pinch',{finger:S.oct, zone:S.zone, hand:handSide(key)});
      }
      if(S.zone==='fx'){
        const meta=FX_META.find(m=>m.finger===mf);
        S.adj={k:meta.k,y0:lm[4].y*H,base:fx[meta.k]}; S.tutFx=null;   // S.tutFx — база для зацепки обучения 'fx' (сдвиг эффекта)
      }else if(S.zone==='ld'){
        leadOwner=key; S.tutDeg=undefined;   // приоритет последней ноты; S.tutDeg сброшен — свежий щипок переизвестит обучение о ноте
      }else if(S.zone==='bs'){
        bassOwner=key;                       // бас моно — рулит последняя рука
      }else if(S.zone==='ch'){
        S.fresh=true;                        // решение о защёлке примем этот кадр, когда посчитаем ступень
      }else if(S.zone==='dr'){
        S.fresh=true;                        // удар сработает этот кадр по ряду
      }else if(S.zone==='loop'){
        fireLooperCmd(S,mf);                 // команда лупера по пальцу — РАЗ на щипок (блок захвата = edge, единичное срабатывание по построению)
      }
    }else if(S.pinch){
      if(mv>PINCH_OFF){ endPinch(key,S); }
      else if(mv<PINCH_HOLD&&FINGER_TIPS.indexOf(mf)!==S.oct&&S.fn!=='hold'&&S.fn!=='loop'){   // 'hold'/'loop' морозят палец: у hold — октаву, у лупера — выбранную команду (мизинец не «перескочит» на безымянный)
        S.oct=FINGER_TIPS.indexOf(mf);       // смена пальца = смена октавы на лету
        if(S.zone==='fx'&&S.adj){
          const meta=FX_META.find(m=>m.finger===mf);
          S.adj={k:meta.k,y0:lm[4].y*H,base:fx[meta.k]}; S.tutFx=null;
        }
        // ЗАЦЕПКА ОБУЧЕНИЯ: палец сменён на лету (=другая октава) — то же событие pinch с новым пальцем.
        tutorTap('pinch',{finger:S.oct, zone:S.zone, hand:handSide(key)});
      }
    }
 
    if(S.pinch){
      /* Высота и громкость читаются с кончика ТОГО пальца, который
         зажат с большим (S.oct) — переключил палец, слежение мгновенно
         перешло на него. */
      const tip=lm[FINGER_TIPS[S.oct]];
      const x=emaS(S,'x',sx(tip.x,W),0.4);         // экранные пиксели игрового поля (поля кадра сняты) — позиция, громкость по X, попадание в прямоугольник/палитру
      const y=emaS(S,'y',sy(tip.y,H),0.4);
      S.x=x; S.y=y;
      /* X-диапазон роли ЭТОЙ руки при игре: при сплите — ЗАМОРОЖЕННЫЙ на захвате (S.rx0/S.rx1),
         иначе весь холст [0,W]. Раздел палитра|ноты — palSplitX того же диапазона. OFF → 0/W/split
         (байт-в-байт: диапазон от phoneInstr не зависел). */
      const prx0=splitOn?S.rx0:rx0, prx1=splitOn?S.rx1:rx1, psplit=palSplitX(prx0,prx1);

      if(S.zone==='fx'){
        /* Регулировка относительная («от текущего»), диапазон — 70%
           высоты экрана; значение остаётся после отпускания (латч). */
        if(S.adj){ fx[S.adj.k]=clamp01(S.adj.base+(S.adj.y0-lm[4].y*H)/(H*0.7));
          // ЗАЦЕПКА ОБУЧЕНИЯ: значение эффекта реально сдвинулось от старта (>3%) — рука эффектов «крутит», не просто щипнула. Троттлинг 5%.
          if(Math.abs(fx[S.adj.k]-S.adj.base)>0.03 && (S.tutFx==null||Math.abs(fx[S.adj.k]-S.tutFx)>0.05)){ S.tutFx=fx[S.adj.k]; tutorTap('fx',{k:S.adj.k}); } }
      }else if(S.zone==='chFam'){
        /* Рука-ПАЛИТРА: ТОЛЬКО выбирает ячейку (семейство+вариант) ПОЛОЖЕНИЕМ и молчит.
           Ветка стоит рядом с 'fx', ДО общего блока — поэтому не считает ни ступень, ни
           громкость, не берёт chOwner и не доходит до защёлки: левая рука нот не играет.
           Два гейта, оба оставляют выбор ЛИПКИМ (ничего не трогаем):
             1. только большой+УКАЗАТЕЛЬНЫЙ (S.oct===0) — щипок средним/безымянным/мизинцем
                на этой руке ничего не выбирает: палец здесь смысла не несёт, а случайный
                щипок не должен сбивать заготовленную форму;
             2. только внутри палитры (S.x < psplit) — рука, ушедшая в зону нот, молчит.
           Ведение непрерывное, пока щипок держат: можно дотянуть до соседней ячейки. */
        if(S.oct===0 && S.x<psplit){
          const x0=prx0+CH_PAL_PAD, x1=psplit-CH_PAL_PAD, y0=CH_PAL_HEAD_H, y1=H-CH_PAL_HEAD_H;
          const [c,r]=cellHyst(clamp(S.x,x0,x1),clamp(S.y,y0,y1),x0,x1,y0,y1,chordFams(),
                               S.pc==null?-1:S.pc, S.pr==null?-1:S.pr);
          S.pc=c; S.pr=r;
          // ЗАЦЕПКА ОБУЧЕНИЯ: выбран ДРУГОЙ тип аккорда в палитре (положением) — урок «Аккорды» ловит выбор типа.
          if(c!==chordFam||r!==chordVar) tutorTap('chordType',{fam:c,var:r});
          if(c!==chordFam)setChordFam(c);
          if(r!==chordVar)setChordVar(r);
        }
      }else if(S.zone==='oct'){
        /* Октавная полоса: рука МОЛЧИТ (как палитра/эффекты) — ни ступени, ни громкости,
           ни владельца. Палец I–IV задаёт липкий регистр РОЛИ (соло→octReg, бас→bassOctReg
           через резолвер); смена пальца на лету (S.oct обновился выше) двигает регистр.
           S.oct здесь — «какой палец», как везде.
           РОЛЬ регистра: при сплите — инструмент ЭТОЙ половины (S.role, заморожен на захвате: из зоны
           'oct' роль не достать); иначе — активный phoneInstr (single-role, байт-в-байт, включая
           смену роли DOM-кнопкой на удержанном щипке — softAllOff щипок не снимает). */
        setRectOctReg(splitOn?S.role:phoneInstr, S.oct);
      }else if(S.zone==='loop'){
        /* Рука-ЛУПЕР при удержании: команды index/middle/ring уже сработали НА ЗАХВАТЕ (edge, раз на
           щипок — здесь НЕ повторяются). Живёт лишь ОЧИСТКА (мизинец): 3с-обратный отсчёт, срабатывает
           РАЗ на отметке (гейт S.clearFired), отпускание раньше — отмена (endPinch гасит отсчёт). */
        if(S.clearT0!=null && !S.clearFired){
          const rem=CLEAR_HOLD_MS-(performance.now()-S.clearT0);
          if(rem<=0){ S.clearFired=true; setLooperClear(-1); doLooper('clear'); }
          else setLooperClear(rem);
        }
      }else if(S.zone==='expr'){
        /* Рука-ВЫРАЗИТЕЛЬНОСТЬ: щипком НИЧЕГО не играет. Её признаки считаются ПОФРЕЙМОВО (вне щипка,
           ниже по циклу, exprFeatures), поэтому здесь — ровно ничего. */
      }else{
        /* Сетка «4 ноты в прямоугольнике» — соло, бас И аккорды на ладу с rectGrid (19/31-TET).
           Y выбирает ПОЛОСУ полной сетки; полоса 0 — октавная (её перехватывает зона 'oct'),
           нотный прямоугольник = полоса−1. Палец S.oct (0=указ.=низ … 3=мизинец=верх) — ноту/корень
           ВНУТРИ прямоугольника; октава — липкий регистр роли (rectOctReg). ступень = прямоуг*4
           + нота, кламп в 0..IVX-1 (верх.мизинец = тоника октавой выше). S.oct тут читается как
           «нота в прямоугольнике» — переосмысление ЛОКАЛЬНОЕ, в прочих местах S.oct по-прежнему октава.
           У аккордов это КОРЕНЬ; тип берётся из палитры отдельно, октава — chordOctReg. */
        const rectPlay = (S.zone==='ld'||S.zone==='bs'||S.zone==='ch') && rectGrid();
        const noteZone = S.zone==='ld'||S.zone==='bs';
        const thereminOn = noteZone && S.fn==='therm';   // терменвокс — ФУНКЦИЯ руки, соло И бас
        const holdOn     = (noteZone||S.zone==='ch') && S.fn==='hold';   // удержание — соло/бас И аккорды: корень/октава мёрзнут одним и тем же гейтом (S.deg застыл ниже)
        const oct = rectPlay?rectOctReg(S.zone):S.oct;           // октавный регистр роли (WleadOn/бас/терменвокс); роль = S.zone (при игре ='ld'/'bs')
        if(thereminOn){
          /* Непрерывная высота: y → Гц через thereminHz (по leadFreq), интерполяция в центах между
             реальными нотами лада. БАС на 2 октавы ниже соло (bassFreq=leadFreq/4) — та же кривая ÷4.
             S.deg — ближайшая ступень (подсветка И запись: формат события не меняется), S.hz — живые Гц
             в звук. Палец ноту НЕ выбирает. */
          const th=thereminHz(y,H,oct); S.deg=th.deg; S.hz = S.zone==='bs' ? th.hz/4 : th.hz;
        }else if(holdOn && S.deg>=0){
          /* УДЕРЖАНИЕ: высота (S.deg) и октава (S.oct) ЗАМОРОЖЕНЫ с ПЕРВОГО кадра щипка — рука уходит
             куда угодно, нота держится (смена пальца октаву не двигает — гейт выше). Громкость (X) ниже
             — ЖИВАЯ (свелл). Стоп — только размыканием пальцев (endPinch). deg берётся на первом кадре
             ветками ниже (тогда S.deg==-1), дальше сюда — и больше не пересчитывается. ОДИН механизм
             для соло/баса И аккордов: у аккорда S.deg — это КОРЕНЬ, значит замерзают корень+октава, а
             тип по-прежнему из палитры (другая рука), громкость свеллит — ровно как задумано «заморожен». */
        }else if(rectPlay){
          S.rect=degHyst(y,rectRowsFull(),H,S.rect==null?-1:S.rect);   // полоса полной сетки
          const r=clamp(S.rect-1,0,rectRows()-1);                       // нотный прямоугольник = полоса−1 (низ → прямоуг.0, без мёртвой зоны)
          S.deg=clamp(r*4+S.oct, 0, IVX().length-1);
        }else{
          const rows= S.zone==='dr' ? DRUM_ROWS : IVX().length;
          S.deg=degHyst(y,rows,H,S.deg);            // вся высота — ровно так же, как рисует draw
        }
        /* Типизированный аккорд: левые CH_PAL_W заняты палитрой, поэтому громкость мерится по
           ПРАВОЙ зоне [split,rx1] — иначе вся половина экрана читалась бы «тихо». Остальные роли
           (соло/бас/ударные/обычные аккорды) — по всей ширине роли [rx0,rx1]. */
        const typed = S.zone==='ch'&&typedChords();
        const[zx0,zx1]= typed ? [psplit,prx1] : [prx0,prx1];
        S.vol=0.2+0.8*clamp01((x-zx0)/(zx1-zx0));
        /* Тип берётся из ЛИПКОГО выбора палитры (левая рука), а не из положения правой.
           Ссылка на элемент таблицы CHORD_FAM_SETS — от этого зависят и сравнение
           ty===latchTy, и заморозка a.ty в событии лупера. Кламп: у семейств может быть
           разное число вариантов, и chordVar мог остаться от более длинного. */
        let ty=null;
        if(typed){
          const FS=chordFams(), fam=FS[chordFam]||FS[0];
          ty=fam.types[Math.min(chordVar,fam.types.length-1)].iv;
        }
        /* Октава для аккорда: rect (19/31-TET) — липкий chordOctReg через резолвер; chrom12 —
           S.oct (палец), как было. Меняется ТОЛЬКО источник октавы, логика защёлки ниже — без изменений. */
        const chOct = rectPlay?rectOctReg(S.zone):S.oct;   // роль = S.zone (в аккордовой ветке ='ch')
        if(S.zone==='ld'){
          if(leadOwner===key){
            const hs=emaS(S,'hs',dist(lm[0],lm[9]),0.15);
            S.rev=clamp01((REV_NEAR-hs)/REV_RANGE); setRevDisp(S.rev);
            WleadOn({deg:S.deg,oct,vol:S.vol,rev:S.rev,   // ступень+октава, не частота: запись = намерение; rectGrid — октава из липкого регистра роли
                     vib:fx.vib,drv:fx.drv,trm:fx.trm,dly:fx.dly,inst:leadIdx}, thereminOn?S.hz:null);   // 2-й арг — ЖИВОЙ override Гц (терменвокс), в запись не идёт
            // ЗАЦЕПКА ОБУЧЕНИЯ: соло-нота зазвучала/сменила ступень (не пересчитываем — это ТОТ ЖЕ вызов, что породил звук).
            if(S.deg!==S.tutDeg){ S.tutDeg=S.deg; tutorTap('note',{deg:S.deg}); }
          }
        }else if(S.zone==='bs'){                            // бас: моно-голос, ведётся как соло
          if(bassOwner===key)WbassOn({deg:S.deg,oct:rectPlay?rectOctReg(S.zone):S.oct,vol:S.vol,inst:bassIdx}, thereminOn?S.hz:null);   // rect-бас — октава из bassOctReg; 2-й арг — живой override Гц (терменвокс-бас), в запись НЕ идёт (как соло)

        }else if(S.zone==='dr'){                            // ударные: один удар на щипок (по ряду)
          if(S.fresh){ S.fresh=false; WdrumHit(S.deg,S.vol); }
        }else if(!supportsChords()){
          /* Макам: лестницы аккордов нет — щипок в поле аккордов не строит ничего.
             Гейт стоит ЗДЕСЬ, после разбора зоны: рука жива (зона, ступень, громкость
             посчитаны — их читает draw для подсказки), молчит только аккордовая ветка.
             Соло/бас/ударные — соседние ветки выше, их это не касается; дрон живёт
             в лупере (ENG.drone), не в руке. Переигровка идёт мимо — по замороженному sc. */
        }else{ // 'ch' — колонка аккордов (владелец голосов — постоянный ключ 'latch'); функция руки latch/hold
          const hold = S.fn==='hold';             // «удержание» vs «защёлка»
          /* Z-ЯРКОСТЬ (глубина 0 близко/ярко .. 1 далеко/глухо): тот же размер кисти dist(0,9), что ведёт
             соло-реверб. Воздух гасит верхи быстрее низов → глубина читается как «аккорд отодвинулся» — та
             же природа, что реверб у соло, с другой стороны. Высоту НЕ трогает (только тембр). Считаем ДО
             WchOn/WchSet: bri едет в событие рядом с ty (как a.rev у соло) — слой запомнит свою яркость. */
          const bd = clamp01((REV_NEAR-emaS(S,'hs',dist(lm[0],lm[9]),0.15))/REV_RANGE);
          if(S.inert){
            // стоп-щипок отработал (только защёлка): рука молчит до размыкания пальцев
          }else if(S.fresh){
            S.fresh=false;                        // решение принимается один раз за щипок
            if(hold){
              /* УДЕРЖАНИЕ: каждый щипок — НОВАЯ атака; корень/октава уже заморожены гейтом holdOn выше
                 (S.deg застыл с первого кадра), тип — из палитры (другая рука). Тумблера «тот же аккорд →
                 выкл» тут НЕТ: выключение — это размыкание пальцев (endPinch зовёт WchOff). */
              WchOn('latch',S.deg,chOct,S.vol,chIdx,ty,bd);
              latchLen=ty?ty.length:0;
              setLatchDeg(S.deg); setLatchTy(ty); chOwner=key;
              tutorTap('chord',{deg:S.deg});   // ЗАЦЕПКА ОБУЧЕНИЯ: аккорд зазвучал (свежая атака, удержание)
            }else{
              /* Тождество защёлки: вне typedChords — ступень (как было, второй множитель
                 схлопывается в true); в typedChords — ПАРА (ступень+тип), иначе C→C7
                 читалось бы как «та же ступень» и глушило аккорд вместо переключения.
                 Цена: зона выключения сужается до конкретного сектора — это неизбежно. */
              const same = latchDeg>=0 && S.deg===latchDeg && (!typedChords() || ty===latchTy);
              if(same){
                WchOff('latch'); setLatchDeg(-1); setLatchTy(null); chOwner=null; S.inert=true;   // тот же аккорд → выключаем, рука инертна
              }else{
                /* Переатака нужна, когда МЕНЯЕТСЯ ЧИСЛО НОТ: chordGlide ведёт только уже
                   звучащие голоса, и 4-я нота (maj7 из трезвучия) молча не зазвучала бы
                   до следующей атаки (BACKLOG §4 — секторы делают этот баг достижимым). */
                if(latchDeg<0||(ty&&ty.length!==latchLen))WchOn('latch',S.deg,chOct,S.vol,chIdx,ty,bd);
                else WchSet('latch',S.deg,chOct,S.vol,ty,bd);          // та же плотность → глиссандо без переатаки
                latchLen=ty?ty.length:0;
                setLatchDeg(S.deg); setLatchTy(ty); chOwner=key;      // рулит последний щипнувший
                tutorTap('chord',{deg:S.deg});   // ЗАЦЕПКА ОБУЧЕНИЯ: аккорд зазвучал (свежая атака, защёлка)
              }
            }
          }else if(chOwner===key&&latchDeg>=0){
            /* Ведение КАЖДЫЙ кадр (~60/с) → живой звук яркости плавный через chordGlide; запись прорежена
               мёртвой зоной в recChSet. В защёлке корень следует за рукой (Y); в удержании S.deg заморожен
               гейтом выше → корень СТОИТ, меняется лишь громкость (свелл) и яркость (Z). */
            if(ty&&ty.length!==latchLen){ WchOn('latch',S.deg,chOct,S.vol,chIdx,ty,bd); latchLen=ty.length; }
            else WchSet('latch',S.deg,chOct,S.vol,ty,bd);   // ведение: Y=корень (rect) или ступень, X=громкость, Z=яркость
            setLatchDeg(S.deg); setLatchTy(ty);          // тип ведём вместе со ступенью — иначе сравнение протухнет
          }else if(chOwner===key){
            chOwner=null;                         // латч сброшен извне (тоника/лад/паника) — отпускаем руль
          }
          /* Индикатор ЯРК показывает ЖИВУЮ руку (эту), НЕ переигранные слои: у каждого слоя своя яркость в
             событии, но столбик один — как REV у соло показывает живую руку. Пока эта рука ведёт аккорд
             (chOwner===key), обновляем показ; после отпускания (защёлка) chOwner=null → показ замирает, а
             при полном отсутствии аккорда сбрасывается ниже (latchDeg<0). НЕ баг, что слои он не отражает. */
          if(chOwner===key) setChBrightDisp(1-bd);   // храним ЯРКОСТЬ (1=ярко); в событие едет bd (глубина, 0=нейтраль)
        }
      }
    }
    /* ВЫРАЗИТЕЛЬНОСТЬ считается ПОФРЕЙМОВО (БЕЗ щипка — дышат движением, не щипком), только если ЭТА рука
       назначена на 'expr' в соло (сплит — по роли её половины, правило #18). Играет НИЧЕГО, владельца не
       берёт; признаки — из СЫРЫХ lm (правило #12). */
    S.isExpr = soloHalfRole(key,S,W)==='ld' && handFnOf(key,'ld')==='expr';
    if(S.isExpr){ exprFeatures(S,lm,dtm,now);
      // ЗАЦЕПКА ОБУЧЕНИЯ: рука-выразительность реально ДВИЖЕТСЯ (энергия «смычка» перешла порог) — урок «Функции рук». Гистерезис (0.35↑/0.12↓), чтобы не спамить.
      if(S.exprE>0.35 && !S.tutExpr){ S.tutExpr=true; tutorTap('exprMove'); }
      else if(S.exprE<0.12) S.tutExpr=false;
    }
    /* Индикатор реверба (revDisp): у СОЛО НОТНОЙ руки показываем ТЕКУЩУЮ глубину (Z=близость
       кисти) КАЖДЫЙ кадр — щипок не нужен, можно «прицелиться» ревербом ДО игры. Пропускаем, когда
       рука уже играет (ветка 'ld'/leadOwner выше сама зовёт setRevDisp — иначе посчитали бы EMA дважды).
       ТОЛЬКО дисплей: в звук (WleadOn) реверб по-прежнему уходит лишь при игре.
       Кто целится — решает soloNoteHand (single-role и сплит одинаково): нотная рука соло-половины.
       При сплите прицел ведёт нотная рука ИМЕННО соло-половины (не fx, не рука из чужой половины). */
    if(soloNoteHand(key,S,W)
       && !(S.pinch && S.zone==='ld' && leadOwner===key)){
      setRevDisp(clamp01((REV_NEAR-emaS(S,'hs',dist(lm[0],lm[9]),0.15))/REV_RANGE));
    }
  }
  // ЗАЦЕПКА ОБУЧЕНИЯ (heartbeat): рука в кадре — троттлинг ~1/с. Обучение так отличит «камера не видит руку»
  // от «рука есть, но шаг не сделан» и подскажет про камеру/свет, а не про жест невидимой руке.
  if(hands.length && now-tutSeenT>1000){ tutSeenT=now; tutorTap('seen'); }
  /* Watchdog: рука пропала из кадра во время щипка → принудительный
     release через 120 мс (короткая пауза прощает мигание трекинга). */
  for(const k of Object.keys(HANDS)){
    const S=HANDS[k];
    if(!seen.has(k)&&now-S.seen>WATCHDOG_MS){ endPinch(k,S); delete HANDS[k]; }
  }
  if(leadOwner&&!HANDS[leadOwner])leadOwner=null;
  if(bassOwner&&!HANDS[bassOwner]){ WbassOff(); bassOwner=null; }
  /* Солирующей НОТНОЙ руки нет в кадре → индикатор реверба гасим в 0 (не висит на последнем значении).
     Тот же критерий «кто целит» (soloNoteHand): single-role — нотная рука при phoneInstr='ld' (байт-в-байт
     старое условие); сплит — нотная рука соло-половины. Нет соло-половины в паре (в SPLIT_ROLES нет 'ld')
     → soloNoteHand ложна у всех → тоже 0 (столбики FX при этом уже не рисуются — стейл не остаётся). */
  const reset = ![...seen].some(k=>{ const S=HANDS[k]; return S && soloNoteHand(k,S,W); });   // никто не целится соло → гасим revDisp (single-role и сплит одинаково; soloNoteHand сам знает роль-половину)
  if(reset) setRevDisp(0);
  if(latchDeg<0) setChBrightDisp(1);   // нет звучащего защёлкнутого аккорда → показ яркости в нейтраль (сам фильтр отпускать не нужно — следующая атака его перепишет)
  tickExpr(now,dtm);                   // «смычок»: динамика + вывод в звук раз за кадр (или плавный вывод к нейтрали, когда руки-выразительности нет)
}

/* Экспорт: HANDS/leadOwner — живые связки (их читает draw). */
export { HANDS, leadOwner, processHands, degRaw, handRole };
