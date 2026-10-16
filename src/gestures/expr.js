/* GES1 part 2 (stage 3) — THE EXPRESSION HAND (solo, function 'expr'): features off RAW landmarks, the middle layer (pump-and-decay,
   springs on a fixed sub-step, engage), the four axes (rules #22, #23) — moved from gestures.js (which re-exports what its readers import).
   The hands table comes once through exprWire. Moved verbatim; edited lines are marked GES1. */
import { clamp, dist, smoothstep } from './features.js';
import { FINGER_TIPS } from '../config.js';
import { applyExpr } from '../audio.js';
import { setExprBrightDisp, setExprDisp } from '../state.js';
/* GES1: the gesture machine's hands table, wired once (exprWire) */
const W={ HANDS:{} };
const exprWire=o=>{ Object.assign(W,o); };

/* ═══════════ ВЫРАЗИТЕЛЬНОСТЬ («смычок») — ВСЕ настройки в ОДНОМ месте (крутят НА СЛУХ) ═══════════
   Метафора смычка: рука не ЗАДАёт звук, а КОРМИТ энергию, которую система тратит. МАЛО ВХОДОВ →
   БОГАТАЯ внутренняя динамика (резонатор энергии, дрейф тембра, инерц-пружина). Живость даёт именно
   средний слой, а не число параметров — не «упрощать» его в прямое отображение признак→узел.
   ЧЕТЫРЕ признака, и каждый ведёт СВОЮ ось звука (в этом весь смысл; см. tickExpr/applyExpr):
     ЭНЕРГИЯ    = скорость центра ладони      → ЖИВОСТЬ (шиммер высоты+амплитуды)
     НАТЯЖЕНИЕ  = сжатость кисти (центр→кончики) → ВАУ (резонансный пик бежит по частоте)
     РАЗМАХ     = попарный разлёт кончиков    → ТЕКСТУРА (характер искажения: тёплое ↔ грязное)
     НАКЛОН     = наклон плоскости ладони     → ПРОСТРАНСТВО (эхо)
   Раньше три канала из четырёх толкали ЯРКОСТЬ, и всё ощущалось как ОДНА ось, поделённая на четыре
   способа — поэтому яркость как ось убрана. НЕ направлять два канала в одно измерение восприятия.
   Всё в звук идёт через ВОЗБУЖДЕНИЕ (накачка-и-спад, пружина) и setTargetAtTime, НИКОГДА прямым
   присваиванием: прямое присваивание — ровно то, что делает управление «роботным», а вся фича
   существует, чтобы этого избежать.
   ОБЛАСТЬ: пока ТОЛЬКО соло (роль 'ld'), живьём — в событие не пишем НИЧЕГО (правило #11/#23). */
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
/* Динамика «смычка» — состояние ИНСТРУМЕНТА, не руки (владелец может смениться, энергия продолжается).
   E резонатор энергии; pres/wid/spat/sat — цели-через-пружину (X позиция, V скорость) = ЧЕТЫРЕ РАЗНЫЕ оси:
   ПРИСУТСТВИЕ (энергия), ШИРИНА (натяжение→фейзер), ПРОСТРАНСТВО (наклон→делей), ТЕКСТУРА (размах→драйв);
   engage кроссфейд к нейтрали. Яркость как ось убрана (была общей для трёх каналов — отсюда и жалоба). */
const EXPR={E:0,presX:0,presV:0,widX:0,widV:0,spatX:0,spatV:0,satX:0,satV:0,engage:0};
let exprPrevT=0;
const exprPrevSet=v=>{ exprPrevT=v; };   // GES1: the frame time's writers outside (processHands, the probe clock)
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
  for(const k in W.HANDS){ const S=W.HANDS[k]; if(S.isExpr&&S.seen===now){ if(!owner||(S.exprMoveT||0)>(W.HANDS[owner].exprMoveT||0))owner=k; } }
  const active=!!owner;
  if(!active&&EXPR.engage<=1e-3)return;                   // ни одной руки-выразительности и уже нейтраль → узлы НЕ трогаем (байт-в-байт как сегодня)
  EXPR.engage+=((active?1:0)-EXPR.engage)*Math.min(1,dt/EXPR_CFG.tauEngage);   // engage — одно-полюсный, устойчив на полном dt
  const e=active?(W.HANDS[owner].exprE||0):0, T=active?(W.HANDS[owner].exprTsm||0):0,
        OR=active?(W.HANDS[owner].exprOr||0):0, SPR=active?(W.HANDS[owner].exprSpr||0):0;   // OR пространство (наклон), SPR текстура (размах)
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


export { exprWire, EXPR_CFG, EXPR, exprPrevT, exprPrevSet, exprFeatures, tickExpr };
