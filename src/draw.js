import { ctx, canvas, video } from './vision.js';
import { HANDS, degRaw } from './gestures.js';   // leadOwner был мёртвым импортом и исчез вместе с моно-соло
import { CUR, IVX, chordLabel, rowLabel, chordNotesStr, leadFreq, bassFreq, centsOf, OCT_ROMAN, supportsChords, typedChords, chordFams, rootName, rectGrid, rectLayout, rectBase, rectBaseMax, rectNoteAt, rectSlotOf, thereminSpan, baseF, periodOf, regWord, swaraLbl } from './scales.js';
import { t, L } from './i18n.js';
import { fx, fxLayout, chBrightDisp, exprDisp, exprBrightDisp, latchDeg, latchOct, latchTy, chordFam, chordVar, phoneInstr, rectOctReg, roleHasTherm, roleHasFx, roleHasExpr, handFnOf, splitOn, phoneHalves, mirrored, sx, sy, setViewRect, videoRec, looperMsg, looperClear, handSide } from './state.js';
import { FX_META, REV_COLOR, FINGER_TIPS, FX_BAR_W, FX_BAR_GAP, FX_BAR_MAX, INSTR_COL,
         CH_PAL_PAD, CH_PAL_GAP, CH_PAL_HEAD_H, palColX, palRowY, rectBandY, palSplitX, coverView, CLEAR_HOLD_MS } from './config.js';
import { DRUM_NAMES, chordHold, leadHold, FX_MODULES } from './audio.js';   // leadHold — реестр ЗВУЧАЩИХ соло-голосов: единственный источник для подсветки (см. drawRole)

import { recording, inPB, loop, events, loopPos, loopChordDeg, loopChordOct, beatLevel } from './recorder.js';
 
/* Геометрия столбиков эффектов. Правый край считаем ИЗ КОНСТАНТ, чтобы подписи
   ступеней сдвигались автоматически при подкрутке ширины/зазора — иначе разъедется. */
const FX_X0=6;
const fxBandR=n=> n>0 ? FX_X0+(n-1)*(FX_BAR_W+FX_BAR_GAP)+FX_BAR_W : 0;   // правый край полосы из n столбиков
/* ЕДИНЫЙ ИСТОЧНИК «какие столбики эффектов есть сейчас» — и для ОТРИСОВКИ, и для ШИРИНЫ ОТСТУПА под
   легенду. Раньше и состав, и счёт брались прямо из FX_META (константа на четыре); теперь состав
   задаёт РАСКЛАДКА (state.fxLayout, слот = палец), а раскладка живая. Разойдись счёт с рисованием —
   легенда наехала бы на столбики; поэтому обе стороны зовут ОДНУ функцию (тот же закон, что у сетки:
   попадание и отрисовка от одной геометрии).
   Слот с МОДУЛЕМ (реверб) в покое даёт ОДИН столбик (первый параметр), а пока его палец ЗАЖАТ —
   РАЗВОРАЧИВАЕТСЯ по столбику на параметр (TAIL/TONE): три ручки видно тогда, когда их крутят.
   Пустой слот («нет эффекта») не даёт столбика вовсе. */
const fxModOf=sl=> FX_MODULES[sl.fxId];
/* Слот, чей палец сейчас зажат у руки-эффектов, — он и разворачивается. Щипок fx-руки один, поэтому
   разворачивается не больше одного слота за раз. */
const fxActiveSlot=()=>{ for(const k in HANDS){ const S=HANDS[k]; if(S.pinch&&S.zone==='fx'&&S.adj) return S.adj.slot; } return null; };
/* «Этот параметр ведёт ДРУГАЯ (играющая) рука» — Пласт 3.2. Признак берём из РАСКЛАДКИ (адрес
   управления живёт там), а НЕ из дескриптора модуля: модуль знает про свои секунды и герцы, но не про
   то, чья рука его крутит. */
const fxParamIsPlay=la=> !!(la && la.mode==='drive' && la.hand==='play');
const fxBarItems=()=>{
  const act=fxActiveSlot(), out=[];
  fxLayout.forEach((sl,slot)=>{
    const m=FX_META.find(q=>q.k===sl.fxId);
    if(m){ out.push({v:fx[sl.fxId], c:m.color, l:m.label, slot, play:fxParamIsPlay(sl.params[0])}); return; }   // старый скалярный — как было (у него ровно один параметр)
    const mod=fxModOf(sl); if(!mod) return;                                    // пустой/неизвестный слот — молча без столбика
    /* Идём по ИНДЕКСАМ, а не по значениям: индекс — единственное, чем дескриптор модуля (mod.params)
       связан со своим параметром раскладки (sl.params), где и лежит адрес управления. */
    const idx=(slot===act && mod.params.length>1) ? mod.params.map((_,i)=>i) : [0];
    for(const i of idx){ const p=mod.params[i];
      out.push({v:p.getNorm(), c:REV_COLOR, l:p.short, slot, play:fxParamIsPlay(sl.params[i])}); }   // REV_COLOR — исторический тон реверба; отдельного столбика REV больше нет (Пласт 3.1), реверб показывают ЕГО СОБСТВЕННЫЕ параметры: TAIL/TONE/MIX
  });
  return out;
};
/* Сколько столбиков соло рисует СЕЙЧАС — и, значит, сколько места им резервировать под легенду.
   ⚠️ ОТДЕЛЬНОГО СТОЛБИКА REV БОЛЬШЕ НЕТ (Пласт 3.1): он показывал глубину ИГРАЮЩЕЙ руки, а реверб ушёл
   к fx-руке. Поэтому счёт = ровно столбики раскладки, без прежней «+1 на REV», и без руки-эффектов
   столбиков НЕТ ВОВСЕ (раньше оставался одинокий REV).
   ⚠️ ОТСТУП СЧИТАЕМ ПО МАКСИМУМУ (как если бы все слоты были развёрнуты), а НЕ по нарисованному
   сейчас: иначе разворот активного слота ДВИГАЛ БЫ ЛЕГЕНДУ под рукой при каждом щипке. */
const fxBarsMaxN=()=> fxLayout.reduce((n,sl)=>{
  if(FX_META.some(q=>q.k===sl.fxId)) return n+1;
  const mod=fxModOf(sl); return n+(mod?mod.params.length:0);
},0);
const fxN=()=> fxBarsMaxN();                                // столбики раскладки (по умолчанию 3 у реверба + 3 старых = 6)
const soloBarsN=()=> roleHasFx('ld') ? fxN() : 0;           // нет руки-эффектов → нет столбиков (REV, который жил без неё, удалён)
const bandR=role=> role==='ld' ? fxBandR(soloBarsN()) : fxBandR(fxN());   // у прочих ролей столбиков нет — резерв на полную полосу, как было

/* statusEl — свой lookup: draw пишет статус-строку (презентационный слой, §0.5). */
const statusEl=document.getElementById('status');

/* Транспорт лупера — HTML-полоса под холстовой коробкой drawLooper. Позицию знает
   только draw: высота коробки boxH зависит от числа слоёв и меняется без всяких
   хуков (овердаб, loadArrangement в играющую петлю). Поэтому drawLooper САМ
   публикует нижнюю границу коробки — loopBarBottom — и двигает полосу.
   Пишем в DOM только при ИЗМЕНЕНИИ, а не каждый кадр (§0.5: draw — презентационный
   слой, statusEl уже так работает). */
const loopTransportEl=document.getElementById('loopTransport');
let loopBarBottom=0;                       // нижний край холстовой полосы лупера, CSS-px (canvas px == CSS px)
let tpOn=null, tpTop=-1;
function syncLoopTransport(on,bottom){
  loopBarBottom = on ? bottom : 0;
  if(on!==tpOn){ tpOn=on; loopTransportEl.classList.toggle('on',on); }
  if(on && bottom!==tpTop){ tpTop=bottom; loopTransportEl.style.top=bottom+'px'; }
}
 
function hexA(hex,a){ const n=parseInt(hex.slice(1),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
/* Смешать два hex-цвета (t: 0→h1, 1→h2), вернуть rgba с альфой a. Для тона точек руки-выразительности. */
function mixHex(h1,h2,t,a){ const A=parseInt(h1.slice(1),16), B=parseInt(h2.slice(1),16), k=Math.max(0,Math.min(1,t));
  const r=((A>>16)&255)+(((B>>16)&255)-((A>>16)&255))*k, g=((A>>8)&255)+(((B>>8)&255)-((A>>8)&255))*k, b=(A&255)+((B&255)-(A&255))*k;
  return `rgba(${r|0},${g|0},${b|0},${a})`; }
 
/* ================= ОТРИСОВКА ================= */
/* labelX — где писать подписи ступеней. По умолчанию у левого края зоны; у соло в
   phone сдвигаем правее, чтобы столбики эффектов слева не легли поверх подписей. */
/* activeDegs — МНОЖЕСТВО звучащих ступеней (Set), а не одна: соло полифонично, и двумя руками можно
   держать два ряда сразу. У аккордов/баса в множестве максимум одна — рисунок тот же, что и был. */
function drawGrid(zx0,zx1,accent,labelOf,activeDegs,gridH=canvas.height,labelX=zx0+7){
  const s=CUR(), ivx=IVX(), rows=ivx.length, seg=gridH/rows;
  if(activeDegs&&activeDegs.size){
    ctx.fillStyle=hexA(accent,.26);
    for(const d of activeDegs) if(d>=0&&d<rows) ctx.fillRect(zx0,(rows-1-d)*seg,zx1-zx0,seg);
  }
  const every=seg>=15?1:seg>=9?2:4;
  ctx.font='12px system-ui'; ctx.textBaseline='middle'; ctx.textAlign='left';
  for(let i=0;i<rows;i++){
    const y=i*seg, deg=rows-1-i, ton=ivx[deg]%s.edo===0;
    ctx.strokeStyle=ton?'rgba(87,217,163,.30)':'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.moveTo(zx0,y); ctx.lineTo(zx1,y); ctx.stroke();
    if(ton||deg%every===0){
      ctx.fillStyle=ton?'#57d9a3':'rgba(255,255,255,.55)';
      ctx.fillText(labelOf(deg),labelX,y+seg/2);
    }
  }
}
/* ЕДИНАЯ ПОДПИСЬ НОТЫ — одна на ОБЕ раскладки (прямоугольники и узкие ряды).
   ⚠️ ПОДПИСЬ ЗАВИСИТ ОТ ЛАДА, А НЕ ОТ РАСКЛАДКИ. Раньше функций было ДВЕ (rectNoteLbl — всегда
   порядковый; gridNoteLbl — свары/имена нот/порядковый), и это сходило с рук ровно потому, что
   прямоугольники стояли на четырёх ладах, каждому из которых порядковый и был нужен. Как только
   мажор можно положить в прямоугольники, две функции начали бы врать друг про друга: одна и та же
   нота читалась бы «C» в рядах и «2» в прямоугольниках. Слито в одну.
   Ветки (порядок важен):
   (1) свары (индийские) — саргам;
   (2) fixedKey — сетка приколочена к C, имена нот СНОВА правдивы (rowLabel даёт NOTE_NAMES по КЛЮЧУ);
   (3) ПОРЯДКОВЫЙ Т,2,3,4… — трём родам ладов: НЕОКТАВНЫМ (period≠2: номер шага врал бы off-by-one),
       CENTS-ладам (их ноты не на 12-TET высотах: пифагоров D#=611.73¢ — имена C/C#/D врали бы) и
       ладам, у которых edo НЕ 12/24 (19/31-TET): у них rowLabel печатает НОМЕР ШАГА (Т,1,2…), а он
       на единицу расходится с легендой пальцев I–IV — «5-я нота» звалась бы «4». Тонику ловим
       СТРУКТУРНО (IVX[deg]%edo===0, как зелёная линия в drawGrid), а не через centsOf===0: у
       неоктавного периода центы сверху не округляются в ровный ноль;
   (4) иначе — реальные имена нот (12-TET, макамы 24-TET).
   БАЙТ-В-БАЙТ у всех четырёх сегодняшних rect-ладов: 19/31-TET (edo∉{12,24} → порядковый),
   Партч (cents → порядковый), гамма (period≠2 → порядковый) — ровно то, что давал rectNoteLbl;
   структурная проверка тоники совпадает с прежней centsOf===0 и на нижней, и на верхней тонике.
   Ветка (3) по edo∉{12,24} СЕГОДНЯ недостижима у нерект-ладов (единственные такие лады — 19/31-TET,
   а они rect), поэтому нерект-подписи тоже байт-в-байт; достижимой она станет, когда человек
   переключит 19/31-TET в узкие ряды — и там она как раз и нужна. */
const noteLbl = deg => { const s=CUR();
  return s.swaraNames ? swaraLbl(deg)
    : s.fixedKey ? rowLabel(deg)
    : (periodOf(s)!==2 || s.cents || (s.edo!==12 && s.edo!==24))
    ? (IVX()[deg]%s.edo===0 ? 'Т' : String(deg+1))
    : rowLabel(deg); };
/* Сетка ПРЯМОУГОЛЬНИКОВ (соло/бас/аккорды). Прямоугольник выбирается по Y, нота/корень внутри —
   ПАЛЬЦЕМ, а НЕ горизонталью: X — громкость. Поэтому ноты показываем КОМПАКТНОЙ ЛЕГЕНДОЙ по пальцам
   (I/II/… → нота), а не колонками. Активный палец подсвечен, активный прямоугольник подтонирован.
   Полосу даёт rectBandY (тот же делитель высоты, что у degHyst в gestures), число полос и ВСЮ
   арифметику — rectLayout: ввод и картинка не разъедутся.
   ⚠️ ТРИ ВЕЩИ ЗДЕСЬ ПЕРЕМЕННЫЕ, а не константы:
   (1) НОТ В ПРЯМОУГОЛЬНИКЕ RL.k (4/3/2) — никаких зашитых четвёрок; лишние пальцы рисуем ТУСКЛЫМ
       прочерком: молчание без объяснения читается как поломка (при k=2 половина руки холостая);
   (2) ОКТАВНАЯ ПОЛОСА ЕСТЬ НЕ ВСЕГДА — смещение «полоса→прямоугольник» берём из RL.regBands
       (при показе всех регистров она равна 0 и полоса === прямоугольник);
   (3) ПЕРИОДОВ НА ЭКРАНЕ МОЖЕТ БЫТЬ НЕСКОЛЬКО — тогда у каждой полосы свой регистр, и его НАДО
       показать (маркер справа): четыре одинаковых блока без пометки не дают понять, куда целишься.
   activeSlots — МНОЖЕСТВО (Set) звучащих СЛОТОВ (не ступеней!), см. правило про подсветку в drawRole.
   ⚠️ Именно множество: соло полифонично (нота на руку сейчас, до четырёх на руку с многопальцевым
   вводом), и подсветить надо КАЖДУЮ звучащую. Отсюда же второе требование: в одном прямоугольнике
   может гореть НЕСКОЛЬКО строк легенды — по строке на звучащий палец.
   x0..x1 — X-ПРОТЯЖЁННОСТЬ: соло/бас на всю ширину роли; ТИПИЗИРОВАННЫЕ аккорды — правее палитры
   [palSplitX,rx1], нетипизированные (палитры нет) — тоже на всю ширину роли. lblOf(deg) — подпись
   ноты/корня, её выбирает вызывающий (соло/бас: нота+центы; аккорды: корень+центы или имя аккорда). */
function drawRectGrid(x0,x1,playH,accent,activeSlots,lblOf,role,rx0=x0){
  const RL=rectLayout(), nB=RL.bands, w=x1-x0, base=rectBase(rectOctReg(role));
  const aSet=activeSlots||new Set();
  const rectOn=new Set(); for(const g of aSet) rectOn.add(Math.floor(g/RL.k));   // прямоугольники, где звучит хоть одна нота
  const lx=Math.max(x0+7,rx0+bandR(role)+8);     // легенда правее столбиков эффектов (соло, от rx0 — левого края роли) и правее палитры (аккорды). rx0 ОТДЕЛЬНО от x0: у аккордов x0=split, но столбиков там нет. Резерв — по ЧИСЛУ реально нарисованных столбиков (bandR), иначе одинокий REV оставлял бы пустую полосу на месте исчезнувших четырёх
  ctx.textBaseline='middle';
  for(let b=0;b<nB;b++){
    const [yTop,yBot]=rectBandY(b,playH,nB), h=yBot-yTop;
    if(RL.hasReg&&b===0){
      drawRectOctBand(x0,w,lx,yTop,h,role);      // общий с терменвоксом рендер октавной полосы (роль → чей регистр подсветить)
    }else{
      const r=b-RL.regBands, on=rectOn.has(r);   // нотный прямоугольник = полоса − октавная (если она есть); «активен» = звучит ЛЮБАЯ его нота
      ctx.fillStyle= on ? hexA(accent,.16) : (r%2?'rgba(255,255,255,.05)':'rgba(255,255,255,.03)');
      ctx.fillRect(x0,yTop,w,h);
      ctx.strokeStyle= on ? accent : 'rgba(255,255,255,.12)';
      ctx.lineWidth= on ? 2 : 1; ctx.strokeRect(x0+0.5,yTop+0.5,w-1,h-1);
      /* Легенда пальцев (I=указ. … ), стопкой — это КЛЮЧ, а не зоны выбора. Строк RL.k; холостые пальцы
         дорисовываем тусклым прочерком, чтобы «мизинец молчит» читалось как УСТРОЙСТВО, а не как сбой.
         Высоту делим на ВСЕ ЧЕТЫРЕ пальца — стопка не скачет при смене лада.
         ⚠️ ПОРЯДОК СТРОК ПЕРЕВЁРНУТ: НИЖНЯЯ нота прямоугольника — ВНИЗУ, верхняя — вверху. Раньше
         список шёл сверху вниз, то есть ВНУТРИ блока высота росла вниз, а сама сетка снаружи растёт
         ВВЕРХ — «выше звучит, ниже написано». Это ТОЛЬКО ПОРЯДОК ОТРИСОВКИ: палец n по-прежнему берёт
         слот r*k+n (указательный — первая нота прямоугольника, мизинец — последняя), подсветка ищет тот
         же слот, звук не тронут. Меняется y строки, и ничего больше. */
      const NF=FINGER_TIPS.length, eh=Math.min(20,(h-8)/NF), sy=yTop+(h-eh*NF)/2;
      for(let n=0;n<NF;n++){
        const ey=sy+(NF-1-n)*eh+eh/2, live=n<RL.k, act=aSet.has(r*RL.k+n);   // (NF-1-n) — тот самый переворот; подсвечиваем СТРОКУ ЗВУЧАЩЕГО пальца, а не «строку активного прямоугольника»: в одном прямоугольнике их может гореть несколько
        ctx.textAlign='left';
        if(!live){ ctx.font='11px system-ui'; ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillText(`${OCT_ROMAN[n]}  —`, lx, ey); continue; }
        const deg=rectNoteAt(Math.min(r*RL.k+n,RL.notes-1),base).deg;
        ctx.font= act?'700 13px system-ui':'12px system-ui';
        ctx.fillStyle= act?accent:'rgba(255,255,255,.6)';
        ctx.fillText(`${OCT_ROMAN[n]}  ${lblOf(deg)}`, lx, ey);
      }
      /* МАРКЕР РЕГИСТРА у правого края полосы — только когда периодов на экране несколько.
         Без него четыре одинаковых блока не отличить, и человек не знает, в какой октаве целится.
         Регистр берём ТОЙ ЖЕ формулой, что и звук (rectNoteAt), поэтому маркер не может соврать. */
      if(RL.octaves>1){
        const o=rectNoteAt(r*RL.k,base).oct;
        ctx.font='700 11px system-ui'; ctx.textAlign='right';
        ctx.fillStyle= on ? hexA(accent,.95) : 'rgba(255,255,255,.34)';
        ctx.fillText(OCT_ROMAN[o]||String(o+1), x1-6, yTop+Math.min(10,h/2));   // ВВЕРХУ полосы, а не по центру: центр справа занимает разбор Гц звучащего аккорда
      }
    }
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
/* ОКТАВНАЯ ПОЛОСА (нижний прямоугольник) — распорядитель регистра, control-синий. Строки
   палец→регистр; активный регистр РОЛИ (rectOctReg: соло→octReg, бас→bassOctReg, аккорды→chordOctReg)
   подсвечен. Рендер октавной полосы для rect-сетки (drawRectGrid); терменвокс теперь аддитивный
   оверлей и полосу НЕ перерисовывает (её даёт сетка).
   ⚠️ ПОЛОСА ЕСТЬ ТОЛЬКО ТАМ, ГДЕ ПОКАЗАН НЕ ВЕСЬ ДИАПАЗОН (rectLayout().hasReg), и она двигает ОКНО
   из octaves периодов, а не одну октаву. Значит выбираемых баз не всегда четыре: их rectBaseMax()+1
   (при одном периоде — прежние четыре, байт-в-байт), и лишние пальцы холостые — тем же тусклым
   прочерком, что и в нотном прямоугольнике. Подпись окна из двух периодов — «окт II–III». */
function drawRectOctBand(x0,w,lx,yTop,h,role){
  ctx.fillStyle=hexA('#4cc2ff',.10); ctx.fillRect(x0,yTop,w,h);
  ctx.strokeStyle=hexA('#4cc2ff',.55); ctx.lineWidth=1.5; ctx.strokeRect(x0+0.5,yTop+0.5,w-1,h-1);
  const oc=rectLayout().octaves, nSel=rectBaseMax()+1, rows=FINGER_TIPS.length+1;   // строк всегда 5 (шапка+4 пальца) — стопка не скачет от лада к ладу
  const eh=Math.min(18,(h-6)/rows), sy=yTop+(h-eh*rows)/2, reg=rectBase(rectOctReg(role));
  ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.font='700 12px system-ui'; ctx.fillStyle=hexA('#4cc2ff',.9);
  ctx.fillText(periodOf()===2?t('reg.octaveFull'):regWord().toUpperCase(), lx, sy+eh/2);   // слово-регистр по периоду (октава→ОКТАВА; период≠2 → ТРИТАВА/РЕГ.)
  for(let n=0;n<FINGER_TIPS.length;n++){
    const ey=sy+(n+1)*eh+eh/2;
    if(n>=nSel){ ctx.font='11px system-ui'; ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fillText(`${OCT_ROMAN[n]}  —`, lx, ey); continue; }   // база вне допустимой — палец холостой
    const act=n===reg, span = oc>1 ? `${OCT_ROMAN[n]}–${OCT_ROMAN[n+oc-1]}` : OCT_ROMAN[n];
    ctx.font= act?'700 13px system-ui':'12px system-ui';
    ctx.fillStyle= act?'#4cc2ff':'rgba(255,255,255,.6)';
    ctx.fillText(`${OCT_ROMAN[n]}  ${regWord()} ${span}`, lx, ey);
  }
}
/* ТЕРМЕНВОКС — АДДИТИВНЫЙ ОВЕРЛЕЙ поверх ОБЫЧНОЙ сетки (rect-прямоугольники/узкие ряды остаются как
   есть; терменвокс их НЕ заменяет — лишь добавляет линии). Рисуем ТОЛЬКО тонкие линии — по одной на
   реальную ноту (у rect-ладов 4 на прямоугольник), в ЦЕНТРЕ своего деления: ориентир для непрерывной
   высоты. Поле/октавную полосу/грубые границы уже нарисовала сетка — здесь НЕ повторяем (иначе двойная
   заливка/затемнение). Геометрия — thereminSpan, ТОТ ЖЕ раздел, что у звука (gestures), поэтому линия и
   слышимый центр совпадают. Ближайшие ноты (activeSlots) ярче. rx0 — левый край роли (легенда правее
   столбиков эффектов). Показываем ТОЛЬКО когда какая-то рука роли назначена на терменвокс (drawRole). */
/* activeSlots — МНОЖЕСТВО (Set) звучащих слотов: терменвоксом тоже можно вести двумя руками, и ярче
   должна быть КАЖДАЯ ведомая линия, а не одна. У баса (моно) в множестве максимум одна. */
function drawThereminLines(x0,x1,playH,accent,activeSlots,rx0=x0,role='ld'){
  const {M,spanBot,divH}=thereminSpan(playH), last=M-1, s=CUR();   // M = ноты НА СЕТКЕ (см. thereminSpan)
  const lx=Math.max(x0+7,rx0+bandR(role)+8);     // тот же резерв, что у сетки: по числу реально нарисованных столбиков
  const every=divH>=15?1:divH>=9?2:4;             // подписи прореживаем, если линии частые (Партч=44 нот)
  /* i — СЛОТ, а не ступень: у многопериодной сетки одна ступень встречается в каждом периоде,
     поэтому подпись и «зелёная тоника» берутся через rectNoteAt — ту же формулу, что даёт звук. */
  const base=rectGrid()?rectBase(rectOctReg(role)):0;
  const degOf = i => rectGrid() ? rectNoteAt(i,base).deg : i;
  ctx.textBaseline='middle';
  for(let i=0;i<=last;i++){
    const yc=spanBot-(i+0.5)*divH, on=!!(activeSlots&&activeSlots.has(i)), d=degOf(i);
    const ton=IVX()[d]%s.edo===0;                  // тоника/октава — зелёным (как drawGrid)
    ctx.strokeStyle= on?accent : ton?'rgba(87,217,163,.5)':'rgba(255,255,255,.22)';   // чуть ярче: линии поверх готовой сетки
    ctx.lineWidth= on?2:0.8;
    ctx.beginPath(); ctx.moveTo(x0,yc); ctx.lineTo(x1,yc); ctx.stroke();
    if(on||i%every===0){
      ctx.fillStyle= on?accent : ton?'#57d9a3':'rgba(255,255,255,.6)';
      ctx.font= on?'700 12px system-ui':'11px system-ui'; ctx.textAlign='left';
      ctx.fillText(`${noteLbl(d)} · ${centsOf(d)}c`, lx, yc);   // та же подпись, что у сетки и у ярлыка — одна функция на все раскладки
    }
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
function drawTag(x,y,lines,color){
  ctx.font='600 15px system-ui';
  let w=0; for(const L of lines)w=Math.max(w,ctx.measureText(L).width);
  const lh=19, h=lines.length*lh+12, bw=w+18;
  let bx=x+16, by=y-h-10;
  if(bx+bw>canvas.width-6)bx=x-bw-16;
  if(by<50)by=y+16;
  ctx.fillStyle='rgba(10,10,20,.82)';
  ctx.strokeStyle=color; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,h,9); ctx.fill(); ctx.stroke();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  lines.forEach((L,i)=>{
    ctx.font=i===0?'700 15px system-ui':'12px system-ui';
    ctx.fillStyle=i===0?color:'rgba(255,255,255,.8)';
    ctx.fillText(L,bx+9,by+10+lh*i+lh/2-3);
  });
}
/* ================= ЖИВЫЕ ГЦ ЗВУЧАЩЕГО АККОРДА (только роль АККОРДЫ) =================
   Соло/бас показывают Гц и центы в ярлыке; у аккордов не было НИЧЕГО про верхние голоса —
   а именно они и есть смысл строя (какая терция, какая септима). Показываем РЕАЛЬНЫЕ Гц каждой
   ноты + в скобках интервал НАД КОРНЕМ в центах.
   ЕДИНЫЙ ИСТОЧНИК: берём частоты прямо из звучащих голосов chordHold['latch'] — это в точности
   вывод того самого вызова chordFreqs(), что породил звук (chordOn: o1.frequency.setValueAtTime(fr);
   гуманизация сидит на detune, не на frequency, поэтому .value === чистый fr). Ничего не пересчитываем
   параллельным путём → цифры не могут разойтись со слышимым; замороженный per-event sc уже учтён на
   стороне движка (latch живёт под текущим ладом — смена лада/тоники гасит его через softAllOff).
   ПОЧЕМУ интервал НАД КОРНЕМ, а не центы-от-тоники: верхние голоса центами-от-тоники читаются плохо,
   а «сколько над корнем» — ровно то число, что проверяют на слух (386 = чистая терция, 408 —
   пифагорова, 400 — 12-TET, 969 — натуральная септима 7/4). Корню скобка не нужна (0). */
function latchChordFreqs(){                        // частоты звучащего защёлкнутого аккорда, корень первым; null — тишины/нет голосов
  const vs=chordHold['latch']; if(!vs||!vs.length)return null;
  return vs.map(v=>v.o1.frequency.value);
}
/* ЖИВЫЕ НОТЫ ОДНОЙ РУКИ — из leadHold, реестра ЗВУЧАЩИХ голосов. ТА ЖЕ дисциплина, что у аккордового
   разбора (latchChordFreqs): показываем то, что ЗВУЧИТ, а не то, что намеревалась рука — HANDS хранит
   намерение и разошлось бы со звуком там, где голос украли. Ключи этой руки: 'lead:L' (потолок 1 и
   терменвокс — нота у руки одна) либо 'lead:L:<палец>' (многопальцевый). Гц считаем leadFreq(deg,oct) —
   ТОЙ ЖЕ функцией, что дала частоту звуку (recorder.ENG.leadOn), поэтому число не может разойтись.
   Сортируем по высоте: список читается снизу вверх, как сама сетка. */
function handLeadNotes(key){
  const pre='lead:'+handSide(key), out=[];
  for(const k in leadHold){
    if(k!==pre && k.slice(0,pre.length+1)!==pre+':')continue;
    const v=leadHold[k]; if(v.deg>=0) out.push({deg:v.deg,oct:v.oct,f:leadFreq(v.deg,v.oct)});
  }
  return out.sort((a,b)=>a.f-b.f);
}
/* Строки ярлыка для НЕСКОЛЬКИХ нот. Лестница деградации — ТА ЖЕ, что у аккордового разбора (fitReadout):
   «нота Гц (центы)» на всех → центы только у первых трёх → одни Гц → и лишь в самом конце «…». Число
   НИКОГДА не режется посередине: packSegs переносит сегментами. */
function fitLeadNotes(notes,maxW,maxLines){
  const nm=n=>noteLbl(n.deg), hz=n=>String(Math.round(n.f)), ct=n=>`${nm(n)} ${hz(n)} (${centsOf(n.deg)}c)`;
  const full=notes.map(ct), first3=notes.map((n,i)=>i<3?ct(n):`${nm(n)} ${hz(n)}`), hzOnly=notes.map(n=>`${nm(n)} ${hz(n)}`);
  for(const segs of [full,first3,hzOnly]){ const L=packSegs(segs,maxW,maxLines,false); if(L)return L; }
  return packSegs(hzOnly,maxW,maxLines,true);
}
/* Разложить сегменты по строкам (≤maxLines) под ширину maxW. trunc=false → null, если не влезло
   (пробуем более компактный вариант/шрифт); trunc=true → добиваем «…» на границе СЕГМЕНТА, число
   не режем никогда. */
function packSegs(segs,maxW,maxLines,trunc){
  const lines=[]; let cur='';
  for(const s of segs){
    const cand=cur?cur+' · '+s:s;
    if(ctx.measureText(cand).width<=maxW){ cur=cand; continue; }
    if(cur){ lines.push(cur); cur=''; }
    if(lines.length>=maxLines){ if(!trunc)return null; lines[maxLines-1]+=' …'; return lines; }
    if(ctx.measureText(s).width<=maxW){ cur=s; }
    else { if(!trunc)return null; lines.push('…'); if(lines.length>=maxLines)return lines.slice(0,maxLines); }
  }
  if(cur)lines.push(cur);
  return lines.length<=maxLines?lines:(trunc?lines.slice(0,maxLines):null);
}
/* Подобрать раскладку: сперва все ноты с центами, не влезло — центы только у первых трёх (Гц у всех),
   не влезло — только Гц. Шрифт 11→10. Гарантированный фолбэк — Гц с «…», без обрезки числа.
   Единицу «Гц» дописываем ОДИН раз к ПОСЛЕДНЕМУ сегменту (не после каждого числа — строка длиннее не
   нужна): встаёт в конец последней строки «… 220 (700¢) Гц», как читает и соло-ярлык («Гц» словом, а
   не «Hz»). Приписана ДО упаковки, поэтому её ширина учтена — за край не вылезет. */
function fitReadout(freqs,maxW){
  const f0=freqs[0], hz=f=>String(Math.round(f)),
        ct=f=>`${Math.round(f)} (${Math.round(1200*Math.log2(f/f0))}¢)`;
  const unit=a=>{ const b=a.slice(); b[b.length-1]+=' '+t('unit.hz'); return b; };   // «Гц» на последний сегмент → конец последней строки
  const withC =unit(freqs.map((f,i)=>i===0?hz(f):ct(f)));
  const first3=unit(freqs.map((f,i)=>i===0?hz(f):(i<3?ct(f):hz(f))));
  const hzOnly=unit(freqs.map(hz));
  for(const px of [11,10]){ ctx.font=`600 ${px}px system-ui`;
    for(const segs of [withC,first3,hzOnly]){ const L=packSegs(segs,maxW,2,false); if(L)return{lines:L,px}; } }
  ctx.font='600 10px system-ui';
  return {lines:packSegs(hzOnly,maxW,2,true),px:10};
}
/* Нарисовать разбор внутри полосы [x0..x1]×[yTop..yBot], прижав вправо (слева — корневая подпись/легенда
   пальцев). Тёмная подложка — чтобы Гц читались поверх подсвеченного прямоугольника. */
function drawChordReadout(x0,x1,yTop,yBot,freqs,accent){
  const maxW=Math.max(40,x1-x0-10), band=yBot-yTop;
  const fit=fitReadout(freqs,maxW); ctx.font=`600 ${fit.px}px system-ui`;
  const lh=fit.px+4, blockH=fit.lines.length*lh, by=yTop+Math.max(0,(band-blockH)/2);
  let bw=0; for(const L of fit.lines)bw=Math.max(bw,ctx.measureText(L).width);
  ctx.fillStyle='rgba(10,10,20,.74)';
  ctx.beginPath(); ctx.roundRect(x1-8-bw-6,by-3,bw+12,blockH+6,5); ctx.fill();
  ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillStyle=accent;
  fit.lines.forEach((L,i)=>ctx.fillText(L,x1-10,by+lh*i+lh/2));
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ================= ВИЗУАЛИЗАЦИЯ ЛУПЕРА =================
   Полоса-транспорт сверху-по-центру: сетка тактов/долей, бегунок позиции,
   по строке на слой с метками событий (соло — оранжевые, аккорды — сиреневые).
   Видна только когда есть петля или идёт запись; иначе не мешает синтезатору. */
function drawLooper(){
  if(!loop.on && !events.length){ syncLoopTransport(false,0); return; }   // нет петли — полоса прячется
  const W=canvas.width, info=loopPos();
  const bars=loop.bars, total=bars*loop.metre;   // переменный размер; бегунок ниже делит на info.total (тот же loopBeats) → сетка и бегунок заперты вместе
  const bw=Math.min(560,W-40), x0=(W-bw)/2, x1=x0+bw;
  const ids=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  const rows=ids.slice();
  if(recording && !rows.includes(loop.layer)) rows.push(loop.layer);   // пустой слой, что пишется прямо сейчас
  const nRow=Math.max(1,rows.length), rowH=13, headH=22, pad=7, y0=64;   // ниже заголовков зон (y≈52)
  const gy0=y0+headH, boxH=headH+nRow*rowH+pad*2, gy1=y0+boxH-pad;
  syncLoopTransport(true, y0+boxH+4);         // считаем из ТОГО ЖЕ boxH, что рисуем → разъехаться не могут

  ctx.fillStyle='rgba(10,10,20,.74)'; ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(x0-10,y0,bw+20,boxH,11); ctx.fill(); ctx.stroke();

  // заголовок — режим
  let head, hc;
  if(info&&info.phase==='count'){ head=t('looper.count',{n:info.countLeft}); hc='#57d9a3'; }
  else if(recording){ head=loop.first?t('looper.recFirst',{n:bars}):t('looper.overdub',{n:loop.layer+1}); hc='#e5484d'; }
  else if(loop.on){ head=t('looper.playing',{bars, layers:ids.length}); hc='#57d9a3'; }
  else { head=t('looper.paused',{bars, layers:ids.length}); hc='rgba(255,255,255,.7)'; }
  ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.font='600 12px system-ui';
  ctx.fillStyle=hc; ctx.fillText(head,x0-2,y0+headH/2+1);

  /* ДРОБЛЕНИЕ ДОЛИ — тонкие короткие штрихи, и ТОЛЬКО когда сетка не шестнадцатая (loop.sub!==4):
     играющий должен ВИДЕТЬ ту сетку, к которой его квантуют (иначе триольная квантизация — сюрприз).
     При sub=4 (умолчание) не рисуем ничего → вид 4/4 байт-в-байт. Рисуем ДО долевых линий: те поверх. */
  if(loop.sub!==4){
    ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=0.8;
    const sy0=gy0+(gy1-gy0)*0.35;                  // короче долевых — читается как «мельче», не спорит с ними
    for(let b=0;b<total;b++) for(let k=1;k<loop.sub;k++){
      const gx=x0+bw*(b+k/loop.sub)/total;
      ctx.beginPath(); ctx.moveTo(gx,sy0); ctx.lineTo(gx,gy1); ctx.stroke();
    }
  }
  // сетка долей и тактов
  for(let b=0;b<=total;b++){
    const gx=x0+bw*b/total, bib=b%loop.metre, lvl=beatLevel(loop.metre,bib);   // видно 3+2+2, а не N одинаковых чёрточек
    let sc,lw;
    if(bib===0){ sc='rgba(255,255,255,.34)'; lw=1.4; }        // начало такта — как было (4/4 байт-в-байт)
    else if(lvl===1){ sc='rgba(255,255,255,.24)'; lw=1.1; }   // голова группы
    else if(lvl===-1){ sc='rgba(140,180,255,.20)'; lw=1.0; }  // khali — холодный тусклый штрих («пустая» голова)
    else { sc='rgba(255,255,255,.11)'; lw=0.8; }              // обычная доля — как было
    ctx.strokeStyle=sc; ctx.lineWidth=lw;
    ctx.beginPath(); ctx.moveTo(gx,gy0); ctx.lineTo(gx,gy1); ctx.stroke();
  }
  // строки слоёв + метки событий
  rows.forEach((lid,ri)=>{
    const ry=gy0+ri*rowH, mid=ry+rowH/2, live=recording&&lid===loop.layer;
    ctx.fillStyle=live?'rgba(229,72,77,.16)':'rgba(255,255,255,.04)';
    ctx.fillRect(x0,ry+1,bw,rowH-2);
    ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='10px system-ui'; ctx.textAlign='right';
    ctx.fillText('L'+(lid+1),x0-4,mid);
    for(const e of events){ if(e.layer!==lid) continue;
      if(e.fn==='leadOff'||e.fn==='chOff') continue;
      const ex=x0+bw*(e.t/total), ch=e.fn[0]==='c';
      ctx.fillStyle=ch?'#b18cff':'#ff9e2c';
      ctx.beginPath(); ctx.roundRect(ex-1.5,ry+3,3.5,rowH-6,1.5); ctx.fill();
    }
  });
  // бегунок позиции
  if(info&&info.phase==='play'){
    const px=x0+bw*(info.pos/info.total);
    ctx.strokeStyle=recording?'#e5484d':'#57d9a3'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(px,gy0-2); ctx.lineTo(px,gy1+2); ctx.stroke();
    ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.arc(px,gy0-2,3,0,7); ctx.fill();
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* Видео-фон рисуем ДО детекции (тот же синхронный тик = тот же кадр видео),
   накладки — ПОСЛЕ. Так пиксели видео и точки руки берутся из ОДНОГО кадра:
   экран показывает то, ЧТО ПРОЗВУЧИТ, а не гонит свежее видео впереди отстающих
   точек. Это фикс когерентности, НЕ латентности — видео становится позже, чтобы
   совпасть с точками (звук по-прежнему из того же старого кадра). */
function drawVideoBackground(){
  const W=canvas.width, H=canvas.height;
  /* COVER-кадрирование: на холст попадает суб-прямоугольник кадра с соотношением ХОЛСТА, поэтому
     картинка НЕ растягивается (прежняя прямая растяжка кадра 4:3 в широкое окно давала горизонтальный
     растяг). Прямоугольник считает config.coverView из интрин. пикселей видео (videoWidth/Height) и
     формы холста; ТУ ЖЕ область кладём в state.viewRect (setViewRect) — ремап точек (sx/sy) кадрирует
     ЕЮ ЖЕ, так что картинка и рука режутся ОДНИМ прямоугольником и не разъедутся (правило #12). Пишем
     rect ДО детекции (правило #8: этот кадр видео → detect → processHands читает свежий viewRect).
     Пока видео не готово (нет размеров) — держим прежний rect (дефолт полей), рисуем лишь затемнение.
     Зеркалим только фронтальную (mirrored — тот же источник, что flipX/sx; rect симметричен по X). */
  const vw=video.videoWidth, vh=video.videoHeight;
  if(vw&&vh){
    const r=coverView(vw,vh,W,H); setViewRect(r);
    const sx0=r.ax0*vw, sy0=r.ay0*vh, sw=(r.ax1-r.ax0)*vw, sh=(r.ay1-r.ay0)*vh;
    if(mirrored()){ ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,sx0,sy0,sw,sh,-W,0,W,H); ctx.restore(); }
    else ctx.drawImage(video,sx0,sy0,sw,sh,0,0,W,H);
  }
  ctx.fillStyle='rgba(7,7,13,.5)'; ctx.fillRect(0,0,W,H);
}
function drawOverlays(res){ drawPhone(res); }

/* Лад без лестницы аккордов (макам): поле остаётся НА МЕСТЕ, приглушается, и вместо
   лестницы объясняет, куда делись аккорды и где взять гармонию. Занимает весь X-диапазон
   роли [x0,x1] (сплит — свою половину), от лада не зависит: раскладка при смене лада не перекраивается. */
function drawNoChordsHint(x0,x1,yTop,yBot){
  const cx=(x0+x1)/2, cy=(yTop+yBot)/2;
  ctx.fillStyle='rgba(10,10,20,.38)'; ctx.fillRect(x0,yTop,x1-x0,yBot-yTop);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=hexA('#b18cff',.7); ctx.font='700 13px system-ui';
  ctx.fillText(t('nochords.title'),cx,cy-32);
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='12px system-ui';
  [t('nochords.l1'),t('nochords.l2'),t('nochords.l3')].forEach((ln,i)=>ctx.fillText(ln,cx,cy-6+i*17));   // строки коротки под ширину поля роли
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

/* Статус-строка (учебный слой). */
function drawStatus(){
  const s=CUR();
  /* Цент-лады (гамелан/Парч/темперации/индийские) НЕ равномерны: печатать «N-TET» и мнимый шаг
     1200/edo было бы враньём (шрути неравны, минимум 22¢; edo — лишь номинал). Показываем ЧЕСТНО:
     «центовый строй · N ступеней» + реальные центы. Нецентовые лады — строка байт-в-байт как была. */
  let st;
  if(s.cents){
    st=t('status.centsScale',{name:L(s.name), n:s.iv.length});   // имя лада резолвим через L() (объект {en,ru}/{default,ru}); центы не печатаем целиком
  }else{
    st=t('status.edoScale',{name:L(s.name), edo:s.edo, steps:s.iv.join('-')});
    if(s.edo!==12)st+=t('status.step',{c:(1200/s.edo).toFixed(1)});
  }
  if(recording)st=t('status.recPrefix')+st;
  else if(inPB())st=t('status.loopPrefix',{bpm:loop.bpm})+st;
  statusEl.textContent=st;
  ctx.textAlign='left';
}

/* ================= ВЕРТИКАЛЬНАЯ РАСКЛАДКА (единственная) =================
   Роль занимает ВСЮ высоту холста: нижней полосы эффектов больше НЕТ (она резала сетке высоту),
   столбики эффектов рисуются ПОВЕРХ сетки слева. Что делает каждая рука — не зафиксировано здесь,
   а решает handFn (эффекты/ноты/удержание/терменвокс/выразительность/лупер), поэтому «правая играет,
   левая эффекты» — лишь ДЕФОЛТ, а не правило раскладки. При splitOn ролей две, по половине экрана. */
/* Рендер ОДНОЙ роли в её X-диапазон [rx0,rx1]. Вынесено из drawPhone, чтобы сплит-экран мог
   позвать её дважды (по половине на роль); single-role зовёт один раз с (phoneInstr,0,W). rx0 —
   левый край роли (начало столбиков эффектов), ОТДЕЛЬНО от x0 сетки (у ТИПИЗИРОВАННЫХ аккордов
   x0=split — слева палитра; у нетипизированных палитры нет и сетка идёт от rx0, как у соло). */
function drawRole(instr,rx0,rx1,playH){
  const accent=INSTR_COL[instr], split=palSplitX(rx0,rx1);
  const labelX= instr==='ld' ? rx0+bandR('ld')+8 : rx0+7;   // у соло подписи правее столбиков — ровно тех, что рисуются сейчас (пять с рукой-эффектами, один REV без неё)
  if(instr==='dr'){ drawDrumGrid(rx0,rx1,playH); return; }
  /* Активная НОТА подсветки — ПАРА (ступень, регистр): аккорд по защёлке, соло по звучащим голосам,
     бас по играющей руке.
     ⚠️ (1) ПОЧЕМУ ПАРА, А НЕ ОДНА СТУПЕНЬ. Пока сетка показывала ОДИН период, ступень ОДНОЗНАЧНО
     задавала прямоугольник (слот === ступень). Теперь периодов на экране до четырёх: ступень 2 живёт в
     ЧЕТЫРЁХ прямоугольниках, и по одной ступени подсветка всегда падала бы в НИЖНИЙ. Поэтому регистр
     носится рядом со ступенью, а прямоугольник ищется ОБРАТНОЙ формулой rectSlotOf — той же, что прямая
     rectNoteAt в gestures.
     ⚠️ (2) ПОЧЕМУ МНОЖЕСТВО, А НЕ ОДНА НОТА. Здесь стоял цикл по рукам, ПЕРЕЗАПИСЫВАВШИЙ единственное
     значение: побеждала последняя рука, и вторая звучащая нота оставалась в тёмном прямоугольнике.
     Писалось это при МОНО-соло, где второй ноты и быть не могло. С пулом их уже две (по руке), а с
     многопальцевым вводом станет до восьми — поэтому подсветка теперь МНОЖЕСТВО, и добавление
     пальцев её больше не тронет.
     ⚠️ (3) ОТКУДА БЕРЁМ МНОЖЕСТВО У СОЛО — ИЗ leadHold, то есть из ТОГО ЖЕ реестра, по которому
     аудио-движок решает, какой голос звучит. Не из HANDS: HANDS — это НАМЕРЕНИЕ руки, параллельная
     запись, и она разошлась бы со звуком ровно там, где голос украли (рука «играет», а прямоугольник
     светился бы впустую). deg/oct пишет в голос сам leadOn — тот же вызов, что запускает звук, второго
     пути записи нет, поэтому картинка не может ни соврать, ни отстать на кадр. Та же дисциплина, что у
     разбора Гц аккорда (частоты берутся из chordHold, а не пересчитываются).
     ⚠️ (4) СЛОИ ПЕТЛИ НЕ ПОДСВЕЧИВАЕМ (фильтр 'lead:' — только живые руки). Подсветка отвечает на
     вопрос «что делают ТВОИ РУКИ»; занятая петля зажгла бы половину сетки и перестала бы что-либо
     значить. У аккордов иначе (там подсвечивается и аккорд петли) — но у аккорда он ОДИН, а соло-слоёв
     может быть сколько угодно.
     БАС ЗДЕСЬ НАМЕРЕННО ИДЁТ СТАРЫМ ПУТЁМ — он ещё МОНО (свой пул bassHold, один голос на слой), и
     сводить его с соло в одну ветку нельзя, пока это так. */
  let act=-1, actOct=0;                       // ОДНА нота — только для разбора Гц аккорда (у аккорда она и правда одна)
  const notes=[];                             // ВСЕ звучащие ноты роли: [{deg,oct}]
  if(instr==='ch'){                                          // рука в приоритете, иначе аккорд петли (§Q5)
    if(latchDeg>=0) notes.push({deg:latchDeg,oct:latchOct});
    else { const d=loopChordDeg(); if(d>=0) notes.push({deg:d,oct:loopChordOct()}); }
    if(notes.length){ act=notes[0].deg; actOct=notes[0].oct; }
  }else if(instr==='ld'){
    for(const k in leadHold){ if(k.slice(0,5)!=='lead:')continue;   // только ЖИВЫЕ руки; 'leadloop:N:v' — слои петли, их не светим
      const v=leadHold[k]; if(v.deg>=0){ notes.push({deg:v.deg,oct:v.oct}); if(act<0){ act=v.deg; actOct=v.oct; } } }
  }else for(const k in HANDS){ const S=HANDS[k]; if(S.pinch&&S.deg>=0&&S.zone==='bs'){ act=S.deg; actOct=S.regOct; } }   // БАС: моно, последняя рука — как было
  if(instr==='bs'&&act>=0) notes.push({deg:act,oct:actOct});
  /* Ступени и слоты — ОДНИМ проходом по нотам: слоты нужны rect-сетке, ступени — узким рядам.
     Слот вне показанного окна (rectSlotOf → −1) просто не попадает в множество: подсвечивать негде. */
  const hlBase=rectBase(rectOctReg(instr)), actDegs=new Set(), actSlots=new Set();
  for(const n of notes){ actDegs.add(n.deg);
    if(rectGrid()){ const g=rectSlotOf(n.deg,n.oct,hlBase); if(g>=0)actSlots.add(g); } }
  const actSlot = actSlots.size ? Math.min(...actSlots) : -1;   // ЕДИНСТВЕННЫЙ слот — только для разбора Гц аккорда (см. ниже); у соло их может быть несколько
  if(instr==='ch'&&!supportsChords()){ drawNoChordsHint(rx0,rx1,0,playH); return; }   // макам: всё поле роли — объяснение
  /* У типизированных аккордов ряд подписываем именем КОРНЯ (C, C#…): тип задаёт
     палитра, а не лад, поэтому обычный chordLabel (он дал бы пауэр-аккорд «C5») врёт. */
  const chTyped = instr==='ch' && typedChords();
  /* ОДНА развилка «прямоугольники vs узкие ряды» на ВСЕ ТРИ ноте-роли (соло/бас/аккорды).
     ⚠️ ПОЧЕМУ ЭТО ВАЖНО И ПОЧЕМУ ДЫРА ДОЛГО НЕ БЫЛА ВИДНА. gestures решает rect по РОЛИ:
     rectPlay = (зона ld|bs|ch) && rectGrid(). А здесь rect-ветка аккордов раньше жила ВНУТРИ
     chTyped, и нетипизированный аккордовый лад падал в drawGrid — узкие ряды. Разойтись это не
     могло ровно потому, что все четыре rect-лада были либо typedChords (19/31-TET, Партч), либо
     noChords (гамма): нетипизированного rect-лада с аккордами просто НЕ СУЩЕСТВОВАЛО. Как только
     раскладку стало можно включать человеку, таких ладов стало большинство (вся диатоника, лады,
     этнические, октатоники) — и палец брал бы корень, которого не видит (правило #9). НЕ
     возвращать rect-ветку аккордов внутрь chTyped.
     Поле нот/корней начинается правее палитры ТОЛЬКО у типизированных (палитра бывает лишь у них);
     у прочих — от левого края роли, как у соло/баса. */
  const gx0 = chTyped ? split : rx0;
  const rowLblOf = instr==='ch' ? (chTyped?rootName:chordLabel) : noteLbl;   // узкие ряды: у типизированных — имя КОРНЯ (chordLabel дал бы «C5», это враньё), у прочих аккордов — имя аккорда, у соло/баса — нота
  if(rectGrid()){
    /* Легенда пальцев: соло/бас — нота+центы; типизированные аккорды — корень+центы; прочие
       аккорды — имя аккорда (ровно то же, что показывал бы ряд). Центы прячем, когда периодов
       несколько: они одинаковы в каждом блоке, и на 48 слотах это шум — живой ярлык их всё равно
       показывает. При одном периоде подпись прежняя, байт-в-байт. */
    const many = rectLayout().octaves>1;
    const lblOf = instr==='ch' ? (chTyped ? (many ? rootName : d=>`${rootName(d)} · ${centsOf(d)}c`) : chordLabel)
                               : (many ? noteLbl : d=>`${noteLbl(d)} · ${centsOf(d)}c`);
    drawRectGrid(gx0,rx1,playH,accent,actSlots,lblOf,instr,rx0);
  }else drawGrid(gx0,rx1,accent,rowLblOf,actDegs,playH, chTyped?split+7:labelX);
  if(chTyped){
    drawChordPalette(rx0,split,playH);
    ctx.strokeStyle=hexA(accent,.35); ctx.lineWidth=1.5;   // тонкий разделитель палитра|ноты ВНУТРИ роли
    ctx.beginPath(); ctx.moveTo(split,0); ctx.lineTo(split,playH); ctx.stroke();
  }
  /* Терменвокс — АДДИТИВНЫЙ оверлей ПОВЕРХ сетки соло/баса: тонкие нотные линии, ТОЛЬКО когда какая-то
     рука этой роли назначена на терменвокс (иначе линии — мусор). Сетка (rect/ряды) уже нарисована. */
  if((instr==='ld'||instr==='bs')&&roleHasTherm(instr))drawThereminLines(rx0,rx1,playH,accent,rectGrid()?actSlots:actDegs,rx0,instr);   // подсветка линий — по СЛОТАМ у rect-сетки (у узких рядов слот===ступень); множество, т.к. терменвоксом можно вести двумя руками
  /* Живой разбор Гц ПОВЕРХ подсвеченного корня — только у аккордов и только пока аккорд ЗАЩЁЛКНУТ и
     звучит (latchDeg>=0). Аккорд петли (loopChordDeg) сюда НЕ попадает: его владелец — 'loop:N', а не
     'latch'; подсветка ряда у него остаётся прежней (без разбора). Считаем полосу тем же способом, что
     рисовала сетка (rectBandY / seg=playH/rows), поэтому цифры лягут ровно в подсвеченный прямоугольник. */
  if(instr==='ch'&&latchDeg>=0&&supportsChords()){
    const freqs=latchChordFreqs();
    if(freqs&&freqs.length){
      const nx0 = chTyped ? split : rx0;                     // левый край поля корней (у типизированных — правее палитры)
      if(rectGrid()&&actSlot>=0){                            // полоса = прямоуг.(floor(слот/k)) + октавная, если она есть; по СТУПЕНИ её не найти (см. подсветку выше)
        const RL=rectLayout(), [yTop,yBot]=rectBandY(Math.floor(actSlot/RL.k)+RL.regBands,playH,RL.bands);
        drawChordReadout(nx0+(rx1-nx0)*0.42,rx1,yTop,yBot,freqs,INSTR_COL.ch);   // правая часть прямоугольника (слева — легенда пальцев)
      }else if(!rectGrid()){                                  // узкие ряды (chrom12/BP/темперации/диатоника): ряд act. rect-сетка с аккордом ВНЕ окна разбор просто не рисует — рисовать его негде
        const rows=IVX().length, seg=playH/rows, yTop=(rows-1-act)*seg;
        drawChordReadout(nx0+(chTyped?36:66),rx1,yTop,yTop+seg,freqs,INSTR_COL.ch);   // резерв слева под корневую подпись
      }
    }
  }
  // Индикатор Z-яркости — пока звучит защёлкнутый аккорд (та же связка, что разбор Гц выше)
  if(instr==='ch'&&latchDeg>=0&&supportsChords())drawChordBright(rx0,rx1,playH);
}
function drawPhone(res){
  const W=canvas.width, H=canvas.height;
  /* Сетка во ВСЮ высоту: нижней полосы эффектов больше нет, столбики лежат поверх слева.
     Та же высота используется в gestures (degHyst) — не расходиться! */
  const playH=H;
  if(splitOn){
    /* СПЛИТ-ЭКРАН: по половине на роль (ЕДИНЫЙ источник геометрии — phoneHalves, тот же, что у
       gestures). Каждая половина — своя роль, своя сетка/палитра/октавная полоса в своём диапазоне. */
    const halves=phoneHalves(W);
    for(const h of halves) drawRole(h.role,h.rx0,h.rx1,playH);
    ctx.strokeStyle=hexA('#fff',.18); ctx.lineWidth=2;   // разделитель половин по центру
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    const solo=halves.find(h=>h.role==='ld'); if(solo&&roleHasFx('ld'))drawFxBars(solo.rx0,H);   // столбики у соло-половины — ТОЛЬКО при руке-эффектах: с уходом REV (Пласт 3.1) без неё рисовать нечего
    if(solo&&roleHasExpr('ld'))drawExprBar(solo.rx0,solo.rx1,H);   // «ВЫР» — энергия смычка у соло-половины, только если назначена рука-выразительность
  }else{
    drawRole(phoneInstr,0,W,playH);
    if(phoneInstr==='ld'&&roleHasFx('ld'))drawFxBars(0,H);   // ТОЛЬКО при руке-эффектах: столбик REV (он жил по roleHasNotes) удалён в Пласте 3.1 — реверб теперь обычный слот раскладки
    if(phoneInstr==='ld'&&roleHasExpr('ld'))drawExprBar(0,W,H);   // «ВЫР» — энергия смычка; полосу прячем, если НИ ОДНА рука не назначена на выразительность
  }
  /* Заголовок роли на холсте убран: роль показывает и переключает кнопка instrBtn в верхней панели. */
  drawHandsPhone(res,W,H,playH);
  if(!videoRec)drawLooper();                  // при записи клипа полосу лупера (служебная накладка НА ХОЛСТЕ) прячем из кадра; сетка/руки/ярлыки/эффекты — это ИГРА, остаются
  if(!videoRec)drawLooperFeedback(W,H);       // подтверждение команды рукой-лупером + отсчёт очистки — тоже служебная накладка, прячем в клипе
  drawStatus();                               // #status — HTML-элемент (не холст), в кадр клипа не попадает сам собой, как и кнопки
}
/* Обратная связь руки-ЛУПЕРА (у команд нет ноты в звуке — показываем на экране), в стиле коробки лупера
   (тёмный скруглённый прямоугольник). ДВЕ накладки: (1) обратный отсчёт очистки (мизинец удержан) —
   заметное красное кольцо с секундами, действие разрушительное; (2) всплывающее подтверждение последней
   команды (зелёное = ок, красное = невозможно), гаснет по looperMsg.until. */
function drawLooperFeedback(W,H){
  const now=performance.now();
  if(looperClear>=0){
    const cx=W/2, cy=H*0.42, R=46, frac=Math.max(0,Math.min(1,looperClear/CLEAR_HOLD_MS));   // 1→0
    ctx.fillStyle='rgba(10,10,20,.82)'; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
    ctx.strokeStyle='#e5484d'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+2*Math.PI*frac); ctx.stroke();   // убывающая дуга = остаток
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='700 26px system-ui'; ctx.fillText(String(Math.ceil(looperClear/1000)), cx, cy-4);
    ctx.font='600 10px system-ui'; ctx.fillText(t('looper.clear'), cx, cy+16);
  }
  if(looperMsg && now<looperMsg.until){
    const mtext=looperMsg.text, cx=W/2, cy=H*0.20;
    ctx.font='700 16px system-ui'; const w=ctx.measureText(mtext).width;
    ctx.fillStyle='rgba(10,10,20,.85)';
    ctx.beginPath(); ctx.roundRect(cx-w/2-14,cy-16,w+28,32,9); ctx.fill();
    ctx.strokeStyle=looperMsg.ok?'rgba(87,217,163,.7)':'rgba(229,72,77,.85)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=looperMsg.ok?'#7ee0b6':'#ff8a8d'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(mtext, cx, cy);
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* Сетка ударных: по ряду на инструмент кита, без тоники/центов. Рисуем в X-диапазоне роли [rx0,rx1]
   (сплит: только своя половина; single-role: 0..W, байт-в-байт). */
function drawDrumGrid(rx0,rx1,playH){
  const rows=DRUM_NAMES.length, seg=playH/rows, w=rx1-rx0;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  for(let i=0;i<rows;i++){ const y=i*seg, idx=rows-1-i;
    ctx.fillStyle= i%2? 'rgba(255,210,63,.05)':'rgba(255,255,255,.03)'; ctx.fillRect(rx0,y,w,seg);
    ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(rx0,y); ctx.lineTo(rx1,y); ctx.stroke();
    ctx.fillStyle='rgba(255,210,63,.85)'; ctx.font='600 14px system-ui';
    ctx.fillText(L(DRUM_NAMES[idx]), rx0+10, y+seg/2);
  }
}
function drawHandsPhone(res,W,H,playH){
  if(!res||!res.landmarks)return;
  for(const k in HANDS){
    const S=HANDS[k], lm=S.lm; if(!lm)continue;
    /* Роль и X-диапазон ЭТОЙ руки: при сплите — щипок берёт ЗАМОРОЗКУ на S (совпадает с попаданием),
       до щипка — живую половину под указательным (lm[8]); вне сплита — глобальный phoneInstr на весь
       холст (single-role, байт-в-байт). Раздел палитра|ноты — palSplitX того же диапазона. */
    let instr,rx0,rx1;
    if(splitOn){
      if(S.pinch){ instr=S.role; rx0=S.rx0; rx1=S.rx1; }
      else { const px=Math.max(0,Math.min(W-1,sx(lm[8].x,W))), hs=phoneHalves(W), h=hs.find(q=>px>=q.rx0&&px<q.rx1)||hs[hs.length-1]; instr=h.role; rx0=h.rx0; rx1=h.rx1; }   // px через sx (поля кадра); для ВЫБОРА половины сатурируем к кромке — как в gestures
    }else{ instr=phoneInstr; rx0=0; rx1=W; }
    const split=palSplitX(rx0,rx1), accent=INSTR_COL[instr], isCh=instr==='ch', isDr=instr==='dr';
    const fxHand=instr==='ld'&&handFnOf(k,'ld')==='fx', base=fxHand?'#4cc2ff':accent;   // рука эффектов = её ФУНКЦИЯ в соло-роли (single И сплит-половина одинаково)
    const loopHand=(instr==='ld'||instr==='bs'||instr==='ch')&&handFnOf(k,instr)==='loop';   // рука-ЛУПЕР: нот не играет, командует пальцами
    const exprHand=instr==='ld'&&handFnOf(k,'ld')==='expr';   // рука-ВЫРАЗИТЕЛЬНОСТЬ: нот не играет, «дышит» в звук
    /* Одна рука — четыре канала, БЕЗ панели приборов: тон точек = ШИРИНА/раскрытость (тускло-синий кулак →
       воздушно-голубой раскрытая ладонь), непрозрачность И размер = ЭНЕРГИЯ (движение → свечение). Текстуру и
       пространство не рисуем (их слышно как грязь и эхо), чтобы не превратить экран в измеритель. */
    const eTip = exprHand ? mixHex(EXPR_COL_DK,EXPR_COL,exprBrightDisp,0.45+0.55*exprDisp) : null;
    for(let i=0;i<lm.length;i++){
      const x=sx(lm[i].x,W), y=sy(lm[i].y,H), tipPt=i===4||FINGER_TIPS.includes(i);   // точки в экранных пикселях игрового поля (поля кадра сняты); НЕ клампим — рука уходит за кромку вместе с картинкой
      ctx.fillStyle= exprHand ? (tipPt?eTip:mixHex(EXPR_COL_DK,EXPR_COL,exprBrightDisp,0.3))
                   : tipPt?(S.pinch?base:'rgba(255,255,255,.65)'):'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.arc(x,y,exprHand&&tipPt?6+3*exprDisp:(tipPt?6:2.5),0,7); ctx.fill();   // кончики растут с энергией
    }
    if(exprHand){                                // рука-ВЫРАЗИТЕЛЬНОСТЬ: играет НИЧЕГО — помечаем у основания среднего (lm[9])
      const px=S.pinch?S.x:sx(lm[9].x,W), py=S.pinch?S.y:sy(lm[9].y,H);
      ctx.fillStyle=hexA(EXPR_COL,.95); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(t('hand.expr'), px+14, py-10);
      continue;
    }
    if(S.pinch&&S.zone==='oct'){                  // рука в октавной полосе (любая, в т.ч. левая): показываем регистр, эффектов НЕ трогаем
      ctx.fillStyle='#4cc2ff'; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(`${regWord().toUpperCase()} ${OCT_ROMAN[S.oct]}`, S.x+14, S.y-10);   // «ОКТ»/«ТРИТАВА» по периоду
      continue;
    }
    if(fxHand){                                  // рука эффектов: подпись выбранного эффекта у кисти
      if(S.pinch&&S.adj){ const meta=FX_META.find(m=>m.k===S.adj.fxId);   // эффект берём из ЗАХВАТА (S.adj.fxId), а раскладка решила его ещё на щипке
        if(meta){ ctx.fillStyle=meta.color; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
          ctx.fillText(`${t(meta.fullKey)} ${Math.round(fx[meta.k]*100)}%`, S.x+14, S.y-10); } }
      continue;
    }
    if(loopHand){                                // рука-ЛУПЕР: помечаем, чтобы не казалась «немой»; подсказку раскладки даём до щипка
      const px=S.pinch?S.x:sx(lm[8].x,W), py=S.pinch?S.y:sy(lm[8].y,H);
      ctx.fillStyle=hexA('#57d9a3',.95); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(t('hand.looper'), px+14, py-10);
      if(!S.pinch){ ctx.fillStyle=hexA('#57d9a3',.6); ctx.font='600 10px system-ui';
        ctx.fillText(t('looper.handHint'), px+14, py+6); }   // раскладка команд — только пока не щиплет (не мешает отсчёту/подтверждению)
      continue;
    }
    // рука нот
    if(isCh&&!supportsChords())continue;         // макам: аккордов нет — ни круга, ни ярлыка, ни подсказки
    // рука-палитра нот не играет — не рисуем ей подсказку ряда. Признак ОДИН на оба пути (single-role и
    // сплит): по ЗОНЕ (щипок='chFam') или ПОЛОЖЕНИЮ (до щипка: указательный слева от раздела). Привязки
    // к руке больше нет нигде — ни здесь, ни в hit-test (см. famHand в gestures).
    if(isCh&&typedChords()&&(S.pinch?S.zone==='chFam':sx(lm[8].x,W)<split))continue;
    /* ХОЛОСТОЙ ПАЛЕЦ (щипок есть, ноты нет — при k<4 лишние пальцы молчат): рука НЕ должна пропадать
       с экрана, иначе молчание читается как потеря трекинга. Тусклое кольцо + прямая подпись. */
    if(S.pinch&&!S.inert&&S.deg<0&&rectGrid()&&(instr==='ld'||instr==='bs'||instr==='ch')){
      ctx.strokeStyle=hexA(accent,.45); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(S.x,S.y,16,0,7); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='600 12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(t('tag.idleFinger'), S.x+14, S.y-10);
      continue;
    }
    if(S.pinch&&!S.inert&&S.deg>=0){
      ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.globalAlpha=.9;
      ctx.beginPath(); ctx.arc(S.x,S.y,16+6*S.vol,0,7); ctx.stroke();
      ctx.globalAlpha=.25; ctx.beginPath(); ctx.arc(S.x,S.y,26+8*S.vol,0,7); ctx.stroke(); ctx.globalAlpha=1;
      const s=CUR();
      if((instr==='ld'||instr==='bs')&&S.fn==='therm'&&S.hz){
        /* Терменвокс (соло/бас): высота НЕПРЕРЫВНА — живые Гц и центы над тоникой РОЛИ. Опора центов —
           тоника соло (baseF) или баса (baseF/4), иначе бас показал бы −2400¢. «≈» — ближайшая нота. */
        const ref=instr==='bs'?baseF()/4:baseF(), cAbs=Math.round(1200*Math.log2(S.hz/ref));
        drawTag(S.x,S.y,[`≈ ${noteLbl(S.deg)} · ${t('tag.gliss')}`,
          `${Math.round(S.hz)} ${t('unit.hz')} · ${Math.round(S.vol*100)}% · ${cAbs}c`],accent);
      }else if(instr==='ld'||instr==='bs'){
        /* rect-раскладка (соло/бас): S.oct — ПАЛЕЦ, а не октава. Октаву посчитала игра (S.regOct —
           из слота, единая формула rectNoteAt), берём ЕЁ: пересчитывать вторым путём нельзя, иначе
           ярлык врал бы про Гц и регистр там, где на экране несколько периодов. */
        const oShow=S.regOct;
        const f=instr==='bs'?bassFreq(S.deg,oShow):leadFreq(S.deg,oShow);
        /* Подпись ноты — ТА ЖЕ функция, что у сетки и подсказки (noteLbl): ярлык не может назвать
           ноту иначе, чем легенда под пальцем. Прежняя спец-ветка «шаг N» (s.edo>12 && tag==='edo')
           убрана: единственные лады с tag:'edo' — 19/31-TET, а они были rect, так что ветка была
           НЕДОСТИЖИМА (правка байт-в-байт). Достижимой она стала бы ровно сейчас — когда 19/31-TET
           можно переключить в узкие ряды, — и там «шаг 5» расходилось бы с сеточным «6». */
        const hold = S.fn==='hold' ? ' · '+t('tag.hold') : '';   // маркер удержания: нота держится, пока пальцы вместе
        /* НЕСКОЛЬКО НОТ ОДНОЙ РУКИ (многопальцевый щипок): показываем ВСЕ, как это давно делает разбор
           аккорда, — иначе ярлык называл бы одну ноту из четырёх и врал бы о том, что слышно. Заголовок:
           имена (это и есть аккорд «одним взглядом») + регистр + громкость; ниже — по сегменту на ноту с
           Гц и центами, упакованные с деградацией (см. fitLeadNotes). Только СОЛО: у баса нота одна.
           ⚠️ ОДНА НОТА ИДЁТ ПРЕЖНЕЙ ВЕТКОЙ — две строки слово в слово, как было (гарантия «одна нота
           выглядит как раньше»); ветка ниже включается ровно с ДВУХ. */
        const many = instr==='ld' ? handLeadNotes(k) : [];
        if(many.length>1){
          ctx.font='12px system-ui';                                   // тем же шрифтом packSegs и меряет
          const lines=fitLeadNotes(many,Math.min(300,W*0.6),3);
          const head=`${many.map(n=>noteLbl(n.deg)).join(' ')} · ${regWord(s)} ${OCT_ROMAN[oShow]}${hold} · ${Math.round(S.vol*100)}%`;
          drawTag(S.x,S.y,[head,...lines],accent);
          continue;
        }
        const L1=`${noteLbl(S.deg)} · ${regWord(s)} ${OCT_ROMAN[oShow]}`;
        /* Центы показываем ВСЕГДА, на любом ладу (снят прежний гейт s.edo!==12). Исторические
           темперации (Пифагоров, оба Натуральных, мезотон, велл-темперации) — это edo:12 cents-лады:
           ИМЯ ноты одинаковое, а высота гуляет до ~21.5¢ (Пифагорова терция 408¢ vs Натуральная 386¢ на
           той же ступени) — без числа их не различить ни глазом, ни на короткой ноте ухом. Ровно там,
           где чтение нужнее всего, оно и пряталось. Чистый 12-TET теперь даёт круглые сотни (0/100/200…)
           — безвредно и держит ярлык на одном месте на всех ладах: единообразие важнее трёх сэкономленных
           символов. Формат и позиция прежние (Гц · % · центы), меняется только условие. */
        const L2=`${Math.round(f)} ${t('unit.hz')} · ${Math.round(S.vol*100)}% · ${centsOf(S.deg)}c`;
        drawTag(S.x,S.y,[L1+hold,L2],accent);
      }else if(isDr){
        drawTag(S.x,S.y,[L(DRUM_NAMES[S.deg])||'—',`${Math.round(S.vol*100)}%`],accent);
      }else if(typedChords()){                   // тип задаёт палитра — chordLabel дал бы «C5», это враньё
        const FS=chordFams(), fam=FS[Math.min(chordFam,FS.length-1)]||FS[0];
        const ty=fam.types[Math.min(chordVar,fam.types.length-1)];
        const oShow=S.regOct;   // регистр посчитала игра (из слота либо от пальца) — второй путь врал бы на многопериодной сетке
        drawTag(S.x,S.y,[rootName(S.deg)+' '+(L(ty.label)||''),   // у ярлыка есть ширина — пишем полное имя типа
          L(ty.full)||L(fam.name),`${regWord(s)} ${OCT_ROMAN[oShow]} · ${Math.round(S.vol*100)}%`],accent);
      }else{
        /* Нетипизированные аккорды (диатоника и пр.): в rect-раскладке S.oct значит «корень в
           прямоугольнике», а регистр посчитала игра (S.regOct). Раньше здесь всегда стоял S.oct —
           это не било лишь потому, что нетипизированного rect-лада с аккордами не существовало. */
        const oShow=S.regOct;
        drawTag(S.x,S.y,[chordLabel(S.deg),chordNotesStr(S.deg),`${regWord(s)} ${OCT_ROMAN[oShow]} · ${Math.round(S.vol*100)}%`],accent);
      }
    }else if(!S.pinch){                          // подсказка до щипка — под указательным
      const tip=lm[8], x=sx(tip.x,W), y=sy(tip.y,H);   // подсказка до щипка — в экранных пикселях игрового поля (поля кадра сняты)
      if((instr==='ld'||instr==='bs'||instr==='ch')&&rectGrid()){
        /* rect-раскладка (соло/бас/аккорды): подсказка кадрирует ПОЛОСУ сетки под рукой (тем же
           смещением regBands, что и игра). У ТИПИЗИРОВАННЫХ аккордов рамка/подписи живут правее
           палитры. Октавная полоса (если она есть) — показываем окно регистров; иначе RL.k нот/корней
           и номер регистра этой полосы, когда периодов несколько. */
        const RL=rectLayout(), band=degRaw(Math.min(y,playH-1),RL.bands,playH), hbase=rectBase(rectOctReg(instr));
        const [yTop,yBot]=rectBandY(band,playH,RL.bands), hx0=(instr==='ch'&&typedChords())?split:rx0;   // правее палитры — только когда палитра ЕСТЬ (typedChords), иначе поле роли целиком
        ctx.strokeStyle=hexA(accent,.4); ctx.lineWidth=1.5; ctx.strokeRect(hx0,yTop,rx1-hx0,yBot-yTop);
        let lbl;
        if(RL.hasReg&&band===0) lbl=`${periodOf()===2?t('reg.octaveFull'):regWord().toUpperCase()} · ${t('tag.octHint',{r:OCT_ROMAN[hbase]})}`;   // роль=instr
        /* Подписи нот — ТЕ ЖЕ, что в легенде прямоугольника: типизированные аккорды — корень,
           нетипизированные — имя аккорда (как в их рядах), соло/бас — noteLbl. Их RL.k, а не всегда 4. */
        else{ const r=band-RL.regBands, hlbl = instr==='ch' ? (typedChords()?rootName:chordLabel) : noteLbl;
              lbl=''; for(let n=0;n<RL.k;n++){ const nt=rectNoteAt(Math.min(r*RL.k+n,RL.notes-1),hbase); lbl+=(n?'  ':'')+OCT_ROMAN[n]+':'+hlbl(nt.deg); }
              if(RL.octaves>1) lbl+='   '+regWord()+' '+(OCT_ROMAN[rectNoteAt(r*RL.k,hbase).oct]||''); }   // какой это период — иначе четыре одинаковых блока не различить
        ctx.fillStyle=hexA(accent,.8); ctx.font='600 12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        ctx.fillText(lbl,x+14,y-12);
      }else{
        const rows=isDr?DRUM_NAMES.length:IVX().length, d=degRaw(Math.min(y,playH-1),rows,playH), seg=playH/rows;
        /* У типизированных аккордов ряды живут ТОЛЬКО справа от палитры — рамка на всю
           ширину легла бы поверх ячеек и врала бы, что там играются ноты. */
        const hx0 = (isCh&&typedChords()) ? split : rx0;
        ctx.strokeStyle=hexA(accent,.4); ctx.lineWidth=1.5; ctx.strokeRect(hx0,(rows-1-d)*seg,rx1-hx0,seg);
        ctx.fillStyle=hexA(accent,.8); ctx.font='600 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        ctx.fillText(isDr?(L(DRUM_NAMES[d])||''):(isCh?(typedChords()?rootName(d):chordLabel(d)):noteLbl(d)),x+14,y-12);
      }
    }
  }
}
/* Компактная полоса эффектов снизу: REV (глубина соло-руки) + 4 эффекта. */
/* Эффекты соло: тонкие вертикальные столбики СЛЕВА, поверх сетки — поле под ними
   играбельно. Высота = величина эффекта, но с потолком FX_BAR_MAX: короткие и
   неброские, а не во весь экран. Проценты у пальца рисует drawHandsPhone — здесь
   только полоски. Полупрозрачны, пока эффект не крутят. */
/* ПАЛИТРА ТИПОВ (левая половина экрана, телефон вертикально).
   КОЛОНКА = семейство, РЯД внутри колонки = вариант. Число колонок и число рядов —
   ИЗ ДАННЫХ (chordFams(), у каждой колонки СВОЯ types.length): наборы могут быть
   рваными, 4×6 — частный случай. Выбор ЛИПКИЙ, поэтому подсветка ячейки видна и когда
   руки нет в кадре — человек видит заготовленную форму до касания, как аккорд на грифе.
   Геометрию берём из palColX/palRowY — теми же функциями считает попадание gestures. */
function wrapLabel(s,maxW){                       // подпись длиннее ячейки — в две строки по границе слова/слога
  if(ctx.measureText(s).width<=maxW||s.length<4)return[s];
  let best=-1;
  for(let i=1;i<s.length;i++){                    // режем как можно ближе к середине
    if(best<0||Math.abs(i-s.length/2)<Math.abs(best-s.length/2)){
      if(ctx.measureText(s.slice(0,i)).width<=maxW&&ctx.measureText(s.slice(i)).width<=maxW)best=i;
    }
  }
  return best<0?[s]:[s.slice(0,best),s.slice(best)];
}
function drawChordPalette(x0,x1,H){
  const FS=chordFams(), nC=FS.length;
  /* Полосы сверху (имена семейств) и снизу (полное имя выбранного типа) — вне клеток:
     та же вычиталка стоит в gestures, иначе подпись легла бы на ячейку, а палец брал бы
     ячейку под подписью. */
  const px0=x0+CH_PAL_PAD, px1=x1-CH_PAL_PAD, py0=CH_PAL_HEAD_H, py1=H-CH_PAL_HEAD_H;
  const selC=Math.min(chordFam,nC-1), selF=FS[selC]||FS[0];
  const selR=Math.min(chordVar,selF.types.length-1);

  ctx.fillStyle='rgba(10,10,20,.30)'; ctx.fillRect(x0,0,x1-x0,H);   // палитра чуть темнее поля нот
  ctx.textBaseline='middle';
  for(let c=0;c<nC;c++){
    const fam=FS[c], nR=fam.types.length, [cx0,cx1]=palColX(c,px0,px1,nC);
    // ШАПКА КОЛОНКИ — имя семейства; активная колонка ярче
    ctx.textAlign='center'; ctx.font='700 10px system-ui';
    ctx.fillStyle = c===selC ? '#fff' : hexA(INSTR_COL.ch,.7);
    ctx.fillText(L(fam.name), (cx0+cx1)/2, CH_PAL_HEAD_H/2);
    for(let r=0;r<nR;r++){
      const [cy0,cy1]=palRowY(r,py0,py1,nR);
      const bx=cx0+CH_PAL_GAP/2, by=cy0+CH_PAL_GAP/2;      // зазор съедается ВНУТРИ клетки: попадание идёт по полной
      const bw=(cx1-cx0)-CH_PAL_GAP, bh=(cy1-cy0)-CH_PAL_GAP;
      const on = c===selC && r===selR;
      ctx.fillStyle = on ? hexA(INSTR_COL.ch,.32) : 'rgba(255,255,255,.05)';
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
      ctx.strokeStyle = on ? INSTR_COL.ch : 'rgba(255,255,255,.12)';
      ctx.lineWidth = on ? 2 : 1; ctx.stroke();
      /* Подпись НЕ мельчим ниже 10px (после этого не читается на телефоне) — длинные
         теги 31-TET («нейтр♮7», «субмин») переносим на две строки: высота у клетки есть. */
      ctx.font = on ? '700 10px system-ui' : '10px system-ui';
      ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,.72)';
      const lines=wrapLabel(L(fam.types[r].label)||'—', bw-6), cy=(by+by+bh)/2;
      lines.forEach((L,i)=>ctx.fillText(L, bx+bw/2, cy+(i-(lines.length-1)/2)*11));
    }
  }
  /* Полное имя выбранного типа — одной строкой снизу, где есть вся ширина палитры.
     full есть только там, где короткий тег непонятен (31-TET). */
  const t=selF.types[selR], fullNm=t&&(L(t.full)||L(t.label));
  if(fullNm){
    ctx.textAlign='center'; ctx.font='11px system-ui'; ctx.fillStyle=hexA(INSTR_COL.ch,.9);
    ctx.fillText(fullNm, (x0+x1)/2, H-CH_PAL_HEAD_H/2);
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
/* ⚠️ ОТДЕЛЬНОГО СТОЛБИКА REV БОЛЬШЕ НЕТ (Пласт 3.1). Он показывал ГЛУБИНУ ИГРАЮЩЕЙ руки и жил по
   своему условию (roleHasNotes), потому что реверб принадлежал именно ей: dist(lm[0],lm[9]) → S.rev →
   payload.rev → revLead.gain. Теперь подмес соло в реверб ведёт FX-РУКА (параметр 'mix' модуля), и
   реверб показывают ЕГО СОБСТВЕННЫЕ столбики наравне с прочими эффектами: TAIL/TONE/MIX в своём слоте.
   Следствие, принятое сознательно: НЕТ руки-эффектов — нет и столбиков вообще (двигать нечем), а
   «прицел до щипка» исчез вместе с revDisp — целиться стало нечем. */
function drawFxBars(rx0,H){                        // rx0 — левый край роли-соло (столбики от него); прежний 1-й арг W не использовался
  const items = roleHasFx('ld') ? fxBarItems() : [];
  const y1=H-40, y0=y1-FX_BAR_MAX;                // низ слева: выше строки статуса, ниже коробки лупера
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  items.forEach((it,i)=>{
    const x=rx0+FX_X0+i*(FX_BAR_W+FX_BAR_GAP);
    let actv=false; for(const k in HANDS){ const S=HANDS[k];
      // Подсветка — ПО СЛОТУ, а не по имени эффекта: слот уникален, а один эффект с 2.3 может лежать на двух пальцах, и подсветились бы оба. ⚠️ it.slot!=null, НЕ truthy: слот 0 (указательный) — валидный и ложный.
      if(it.slot!=null&&S.pinch&&S.zone==='fx'&&S.adj&&S.adj.slot===it.slot)actv=true; }
    ctx.fillStyle='rgba(255,255,255,.09)'; ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
    const fh=FX_BAR_MAX*Math.max(0,Math.min(1,it.v));
    ctx.fillStyle=it.c; ctx.globalAlpha=actv?0.95:0.5;
    ctx.fillRect(x,y1-fh,FX_BAR_W,fh); ctx.globalAlpha=1;                                // заполнение снизу вверх
    if(actv){ ctx.strokeStyle=it.c; ctx.lineWidth=1.5; ctx.strokeRect(x-1.5,y0-1.5,FX_BAR_W+3,FX_BAR_MAX+3); }
    /* МЕТКА «ведёт ИГРАЮЩАЯ рука» (Пласт 3.2): точка в ЗАЗОРЕ слева от столбика. Зазор уже есть
       (FX_BAR_GAP=15), поэтому метка НИЧЕГО не двигает — ни столбиков, ни отступа легенды. Точка стоит
       вплотную к СВОЕМУ столбику (4px) и далеко от соседнего (11px), так что чья она — не спутать.
       Почему не рамка и не другой оттенок трека: рамку уже занимает подсветка активного слота (actv), а
       заливка трека меняется с величиной — метка обязана читаться при ЛЮБОМ значении, включая 0 и 100%. */
    if(it.play){ ctx.fillStyle=it.c; ctx.globalAlpha=0.9;
      ctx.beginPath(); ctx.arc(x-5, y0+5, 2.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    ctx.fillStyle=actv?it.c:'rgba(255,255,255,.5)';
    ctx.fillText(it.l,x+FX_BAR_W/2,y0-5);
  });
}
 
/* Индикатор Z-ЯРКОСТИ аккордов — ЗЕРКАЛО столбика реверба (drawFxBars), но у аккордовой роли: одиночный
   вертикальный столбик, заполнение = ЯРКОСТЬ (chBrightDisp, 1=ярко/открыто/нейтраль → полный столбик,
   0=глухо/далеко → пустой). Стоит внизу-СПРАВА роли (нотная часть — всегда свободна: палитра слева).
   Виден только пока звучит защёлкнутый аккорд (гейт в drawRole) — как и живой разбор Гц. */
function drawChordBright(rx0,rx1,H){
  const v=Math.max(0,Math.min(1,chBrightDisp));
  const x=rx1-FX_BAR_W-10, y1=H-40, y0=y1-FX_BAR_MAX;
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  ctx.fillStyle='rgba(255,255,255,.09)'; ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
  const fh=FX_BAR_MAX*v;
  ctx.fillStyle=INSTR_COL.ch; ctx.globalAlpha=0.7; ctx.fillRect(x,y1-fh,FX_BAR_W,fh); ctx.globalAlpha=1;   // заполнение снизу вверх
  ctx.fillStyle=hexA(INSTR_COL.ch,.85); ctx.fillText(t('ind.bright'),x+FX_BAR_W/2,y0-5);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* Индикатор ЭНЕРГИИ руки-ВЫРАЗИТЕЛЬНОСТИ («смычок») — один вертикальный столбик «ВЫР», как ЯРК/REV.
   Заполнение = exprDisp (0 покой .. 1 поёт). Стоит внизу-СПРАВА соло-поля (там свободно, эффекты —
   слева). Виден, ТОЛЬКО когда какая-то рука соло назначена на 'expr' (гейт в drawPhone). Столбик
   отвечает на движение ДО первой ноты — так связка «двигаю → открывается» видна сразу (учебность). */
const EXPR_COL='#5ad1ff';   // воздушный тон (ЯРКО/раскрыто) — не путать с REV (зелёный) и ролью соло (оранжевый)
const EXPR_COL_DK='#3a5cff';   // тускло-синий (СЖАТО/тускло) — второй конец тона точек руки
function drawExprBar(rx0,rx1,H){
  const v=Math.max(0,Math.min(1,exprDisp));
  const x=rx1-FX_BAR_W-10, y1=H-40, y0=y1-FX_BAR_MAX;
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  ctx.fillStyle='rgba(255,255,255,.09)'; ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
  const fh=FX_BAR_MAX*v;
  ctx.fillStyle=EXPR_COL; ctx.globalAlpha=0.7; ctx.fillRect(x,y1-fh,FX_BAR_W,fh); ctx.globalAlpha=1;   // заполнение снизу вверх
  ctx.fillStyle=hexA(EXPR_COL,.85); ctx.fillText(t('ind.expr'),x+FX_BAR_W/2,y0-5);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* loopBarBottom — живая связка: нижний край холстовой полосы лупера (0, когда её нет).
   Экспортирована, чтобы позицию мог прочитать кто угодно, а не только draw. */
export { drawVideoBackground, drawOverlays, loopBarBottom };
