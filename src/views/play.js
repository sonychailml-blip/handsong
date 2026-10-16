/* DRAW1 (DAY run 2026-10-16): the play screen: overlays per frame (drawOverlays), roles, grids, hands, palette, effect bars, status — moved from draw.js verbatim (draw.js is the facade). Canvas only; nothing visible changed. */
import { ctx, canvas } from '../vision.js';
import { cv, ROLE_COL } from '../palette.js';   // DRAW1b: canvas colours are design tokens (tokens.css «canvas»)
import { HANDS, degRaw } from '../gestures.js';
import { CUR, IVX, chordLabel, chordNotesStr, leadFreq, bassFreq, centsOf, OCT_ROMAN, supportsChords, typedChords, chordFams, rootName, rectGrid, rectLayout, rectBase, rectBaseMax, rectNoteAt, rectSlotOf, thereminSpan, baseF, regWord, regWordFull, tuningStatus, chordTypeFits, tuningIndexOf } from '../scales.js';
import { t, L } from '../i18n.js';
import { chainKeyOf, exprDisp, exprBrightDisp, chFitDeg, latchDeg, latchOct, chordFam, chordVar, phoneInstr, rectOctReg, roleHasTherm, roleHasExpr, handFnOf, splitOn, phoneHalves, sx, sy, videoRec, looperMsg, looperClear, handSide, rollOpen, arrOpen } from '../state.js';
import { FX_META, FINGER_TIPS, FX_BAR_W, FX_BAR_MAX, CH_PAL_PAD, CH_PAL_GAP, CH_PAL_HEAD_H, palColX, palRowY, rectBandY, palSplitX, CLEAR_HOLD_MS } from '../config.js';
import { DRUM_NAMES, chordHold, leadHold, bassHold } from '../audio.js';
import { recording, inPB, loop, loopChordDeg, loopChordOct } from '../recorder.js';
import { FX_EDGE, FX_STEP, fxBarItems, fxBarsBox, fxBarsY, fxParamOnFinger, hexA, mixHex, noteLbl, statusEl } from './common.js';
import { drawRoll } from './roll.js';
import { drawLooper, loopViewClear } from './strip.js';

 
/* ================= ОТРИСОВКА ================= */
/* labelX — где писать подписи ступеней. По умолчанию у левого края зоны; у соло в
   phone сдвигаем правее, чтобы столбики эффектов слева не легли поверх подписей. */
/* activeDegs — МНОЖЕСТВО звучащих ступеней (Set), а не одна: соло (и бас в полифоническом режиме) держит несколько
   нот, и двумя руками можно держать два ряда сразу. У аккордов и у роли в ведущем режиме в множестве максимум одна —
   рисунок тот же, что и был. */
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
    ctx.strokeStyle=ton?cv('tonic-a30'):cv('white-a08');
    ctx.beginPath(); ctx.moveTo(zx0,y); ctx.lineTo(zx1,y); ctx.stroke();
    if(ton||deg%every===0){
      ctx.fillStyle=ton?cv('tonic'):cv('white-a55');
      ctx.fillText(labelOf(deg),labelX,y+seg/2);
    }
  }
}
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
function drawRectGrid(x0,x1,playH,accent,activeSlots,lblOf,role){
  const RL=rectLayout(), nB=RL.bands, w=x1-x0, base=rectBase(rectOctReg(role));
  const aSet=activeSlots||new Set();
  const rectOn=new Set(); for(const g of aSet) rectOn.add(Math.floor(g/RL.k));   // прямоугольники, где звучит хоть одна нота
  const lx=x0+7;                                 // легенда от СВОЕГО левого края (у аккордов x0=split — правее палитры). ⚠️ Слайс б.2 убрал отсюда резерв под столбики (rx0+bandR+8): столбики ушли к ПРАВОЙ кромке, отодвигаться слева не от чего. Параметр rx0 существовал ТОЛЬКО ради этого слагаемого и снят вместе с ним
  ctx.textBaseline='middle';
  for(let b=0;b<nB;b++){
    const [yTop,yBot]=rectBandY(b,playH,nB), h=yBot-yTop;
    if(RL.hasReg&&b===0){
      drawRectOctBand(x0,w,lx,yTop,h,role);      // общий с терменвоксом рендер октавной полосы (роль → чей регистр подсветить)
    }else{
      const r=b-RL.regBands, on=rectOn.has(r);   // нотный прямоугольник = полоса − октавная (если она есть); «активен» = звучит ЛЮБАЯ его нота
      ctx.fillStyle= on ? hexA(accent,.16) : (r%2?cv('white-a05'):cv('white-a03'));
      ctx.fillRect(x0,yTop,w,h);
      ctx.strokeStyle= on ? accent : cv('white-a12');
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
        if(!live){ ctx.font='11px system-ui'; ctx.fillStyle=cv('white-a22'); ctx.fillText(`${OCT_ROMAN[n]}  —`, lx, ey); continue; }
        const deg=rectNoteAt(Math.min(r*RL.k+n,RL.notes-1),base).deg;
        ctx.font= act?'700 13px system-ui':'12px system-ui';
        ctx.fillStyle= act?accent:cv('white-a60');
        ctx.fillText(`${OCT_ROMAN[n]}  ${lblOf(deg)}`, lx, ey);
      }
      /* МАРКЕР РЕГИСТРА у правого края полосы — только когда периодов на экране несколько.
         Без него четыре одинаковых блока не отличить, и человек не знает, в какой октаве целится.
         Регистр берём ТОЙ ЖЕ формулой, что и звук (rectNoteAt), поэтому маркер не может соврать. */
      if(RL.octaves>1){
        const o=rectNoteAt(r*RL.k,base).oct;
        ctx.font='700 11px system-ui'; ctx.textAlign='right';
        ctx.fillStyle= on ? hexA(accent,.95) : cv('white-a34');
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
  ctx.fillStyle=hexA(cv('sky'),.10); ctx.fillRect(x0,yTop,w,h);
  ctx.strokeStyle=hexA(cv('sky'),.55); ctx.lineWidth=1.5; ctx.strokeRect(x0+0.5,yTop+0.5,w-1,h-1);
  const oc=rectLayout().octaves, nSel=rectBaseMax()+1, rows=FINGER_TIPS.length+1;   // строк всегда 5 (шапка+4 пальца) — стопка не скачет от лада к ладу
  const eh=Math.min(18,(h-6)/rows), sy=yTop+(h-eh*rows)/2, reg=rectBase(rectOctReg(role));
  ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.font='700 12px system-ui'; ctx.fillStyle=hexA(cv('sky'),.9);
  ctx.fillText(regWordFull(), lx, sy+eh/2);   // слово-регистр по периоду (октава→ОКТАВА; период≠2 → ТРИТАВА/РЕГ.)
  for(let n=0;n<FINGER_TIPS.length;n++){
    const ey=sy+(n+1)*eh+eh/2;
    if(n>=nSel){ ctx.font='11px system-ui'; ctx.fillStyle=cv('white-a22'); ctx.fillText(`${OCT_ROMAN[n]}  —`, lx, ey); continue; }   // база вне допустимой — палец холостой
    const act=n===reg, span = oc>1 ? `${OCT_ROMAN[n]}–${OCT_ROMAN[n+oc-1]}` : OCT_ROMAN[n];
    ctx.font= act?'700 13px system-ui':'12px system-ui';
    ctx.fillStyle= act?cv('sky'):cv('white-a60');
    ctx.fillText(`${OCT_ROMAN[n]}  ${regWord()} ${span}`, lx, ey);
  }
}
/* ТЕРМЕНВОКС — АДДИТИВНЫЙ ОВЕРЛЕЙ поверх ОБЫЧНОЙ сетки (rect-прямоугольники/узкие ряды остаются как
   есть; терменвокс их НЕ заменяет — лишь добавляет линии). Рисуем ТОЛЬКО тонкие линии — по одной на
   реальную ноту (у rect-ладов 4 на прямоугольник), в ЦЕНТРЕ своего деления: ориентир для непрерывной
   высоты. Поле/октавную полосу/грубые границы уже нарисовала сетка — здесь НЕ повторяем (иначе двойная
   заливка/затемнение). Геометрия — thereminSpan, ТОТ ЖЕ раздел, что у звука (gestures), поэтому линия и
   слышимый центр совпадают. Ближайшие ноты (activeSlots) ярче. Показываем ТОЛЬКО когда какая-то рука
   роли назначена на терменвокс (drawRole). */
/* activeSlots — МНОЖЕСТВО (Set) звучащих слотов: терменвоксом тоже можно вести двумя руками, и ярче
   должна быть КАЖДАЯ ведомая линия, а не одна. В ведущем режиме (у баса — по умолчанию) в множестве максимум одна. */
function drawThereminLines(x0,x1,playH,accent,activeSlots,role='ld'){
  const {M,spanBot,divH}=thereminSpan(playH), last=M-1, s=CUR();   // M = ноты НА СЕТКЕ (см. thereminSpan)
  const lx=x0+7;                                 // как у сетки: от своего левого края, без резерва (слайс б.2 — столбики теперь справа)
  const every=divH>=15?1:divH>=9?2:4;             // подписи прореживаем, если линии частые (Партч=44 нот)
  /* i — СЛОТ, а не ступень: у многопериодной сетки одна ступень встречается в каждом периоде,
     поэтому подпись и «зелёная тоника» берутся через rectNoteAt — ту же формулу, что даёт звук. */
  const base=rectGrid()?rectBase(rectOctReg(role)):0;
  const degOf = i => rectGrid() ? rectNoteAt(i,base).deg : i;
  ctx.textBaseline='middle';
  for(let i=0;i<=last;i++){
    const yc=spanBot-(i+0.5)*divH, on=!!(activeSlots&&activeSlots.has(i)), d=degOf(i);
    const ton=IVX()[d]%s.edo===0;                  // тоника/октава — зелёным (как drawGrid)
    ctx.strokeStyle= on?accent : ton?cv('tonic-a50'):cv('white-a22');   // чуть ярче: линии поверх готовой сетки
    ctx.lineWidth= on?2:0.8;
    ctx.beginPath(); ctx.moveTo(x0,yc); ctx.lineTo(x1,yc); ctx.stroke();
    if(on||i%every===0){
      ctx.fillStyle= on?accent : ton?cv('tonic'):cv('white-a60');
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
  ctx.fillStyle=cv('night-a82');
  ctx.strokeStyle=color; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,h,9); ctx.fill(); ctx.stroke();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  lines.forEach((L,i)=>{
    ctx.font=i===0?'700 15px system-ui':'12px system-ui';
    ctx.fillStyle=i===0?color:cv('white-a80');
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
/* ⛳ V2: для ЛЮБОЙ мелодической роли в ПОЛИФОНИЧЕСКОМ режиме — у баса ключи 'bass:L[:палец]' в bassHold, Гц — bassFreq,
   той же функцией, что дала частоту звуку (ENG.bassOn). В ВЕДУЩЕМ режиме ключ роли один и руке не принадлежит ('bass',
   у соло 'lead:M') — список пуст, и ярлык идёт прежней однонотной веткой (так бас выглядел всегда). */
function handLeadNotes(key,role='ld'){
  const bs=role==='bs', pre=(bs?'bass:':'lead:')+handSide(key), hold=bs?bassHold:leadHold, fq=bs?bassFreq:leadFreq, out=[];
  for(const k in hold){
    if(k!==pre && k.slice(0,pre.length+1)!==pre+':')continue;
    const v=hold[k]; if(v.deg>=0) out.push({deg:v.deg,oct:v.oct,f:fq(v.deg,v.oct)});
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
  ctx.fillStyle=cv('night-a74');
  ctx.beginPath(); ctx.roundRect(x1-8-bw-6,by-3,bw+12,blockH+6,5); ctx.fill();
  ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillStyle=accent;
  fit.lines.forEach((L,i)=>ctx.fillText(L,x1-10,by+lh*i+lh/2));
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* ⛳ ЕДИНСТВЕННАЯ РАЗВИЛКА «ИГРА ИЛИ РЕДАКТОР». Закрыт редактор — ветка та же, что была всегда. */
function drawOverlays(res){ if(rollOpen){ drawRoll(); return; } if(arrOpen){ drawLooper(true); return; } drawPhone(res); }   // AR1: окно аранжировки — та же полоса во весь экран

/* Лад без лестницы аккордов (макам): поле остаётся НА МЕСТЕ, приглушается, и вместо
   лестницы объясняет, куда делись аккорды и где взять гармонию. Занимает весь X-диапазон
   роли [x0,x1] (сплит — свою половину), от лада не зависит: раскладка при смене лада не перекраивается. */
function drawNoChordsHint(x0,x1,yTop,yBot){
  const cx=(x0+x1)/2, cy=(yTop+yBot)/2;
  ctx.fillStyle=cv('night-a38'); ctx.fillRect(x0,yTop,x1-x0,yBot-yTop);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=hexA(cv('chord'),.7); ctx.font='700 13px system-ui';
  ctx.fillText(t('nochords.title'),cx,cy-32);
  ctx.fillStyle=cv('white-a60'); ctx.font='12px system-ui';
  [t('nochords.l1'),t('nochords.l2'),t('nochords.l3')].forEach((ln,i)=>ctx.fillText(ln,cx,cy-6+i*17));   // строки коротки под ширину поля роли
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

/* Статус-строка (учебный слой). */
function drawStatus(){
  const s=CUR();
  /* Табличные строи (гамелан/Парч/темперации/индийские) НЕ равномерны: печатать «N-TET» и мнимый шаг было бы враньём. ⛳ F4: что
     писать, решает ЗАПИСЬ СТРОЯ (describe: 'equal' / 'table', step) — scales.tuningStatus; прежде — ветки по s.cents и s.edo!==12. */
  let st=tuningStatus(s);
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
  const accent=ROLE_COL[instr], split=palSplitX(rx0,rx1);
  const labelX= rx0+7;                                      // ОДНО правило на все роли (слайс б.2): подписи от левого края роли. Прежде у соло они отодвигались под столбики эффектов — те ушли вправо, отступ стал пустой полосой
  if(instr==='dr'){ drawDrumGrid(rx0,rx1,playH); return; }
  /* Активная НОТА подсветки — ПАРА (ступень, регистр): аккорд по защёлке, соло и бас по звучащим голосам движка
     (бас — с V2, прежде по играющей руке; см. (3) ниже).
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
     ⛳ V2: БАС — ТЕМ ЖЕ ПУТЁМ, из РЕЕСТРА ЗВУЧАЩИХ ГОЛОСОВ (bassHold; ступень и регистр пишет в голос bassOn — P1),
     живые ключи 'bass' (ведущий режим: один голос роли) и 'bass:<рука>[:палец]' (полифонический). Прежде бас светился
     из HANDS — из НАМЕРЕНИЯ последней в обходе руки, и при двух руках в ведущем режиме это могла быть не та, что
     звучит (голос у последнего щипка, а обход HANDS идёт в порядке появления рук). Теперь горит то, что ЗВУЧИТ
     (правило #26). Слои петли ('bassloop:…') не светим — тот же довод, что у соло. */
  let act=-1, actOct=0;                       // ОДНА нота — только для разбора Гц аккорда (у аккорда она и правда одна)
  const notes=[];                             // ВСЕ звучащие ноты роли: [{deg,oct}]
  if(instr==='ch'){                                          // рука в приоритете, иначе аккорд петли (§Q5)
    if(latchDeg>=0) notes.push({deg:latchDeg,oct:latchOct});
    else { const d=loopChordDeg(); if(d>=0) notes.push({deg:d,oct:loopChordOct()}); }
    if(notes.length){ act=notes[0].deg; actOct=notes[0].oct; }
  }else if(instr==='ld'){
    for(const k in leadHold){ if(k.slice(0,5)!=='lead:')continue;   // только ЖИВЫЕ руки; 'leadloop:N:v' — слои петли, их не светим
      const v=leadHold[k]; if(v.deg>=0){ notes.push({deg:v.deg,oct:v.oct}); if(act<0){ act=v.deg; actOct=v.oct; } } }
  }else if(instr==='bs'){
    for(const k in bassHold){ if(k!=='bass'&&k.slice(0,5)!=='bass:')continue;   // только ЖИВЫЕ владельцы баса (V2)
      const v=bassHold[k]; if(v.deg>=0){ notes.push({deg:v.deg,oct:v.oct}); if(act<0){ act=v.deg; actOct=v.oct; } } }
  }
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
    drawRectGrid(gx0,rx1,playH,accent,actSlots,lblOf,instr);
  }else drawGrid(gx0,rx1,accent,rowLblOf,actDegs,playH, chTyped?split+7:labelX);
  if(chTyped){
    drawChordPalette(rx0,split,playH);
    ctx.strokeStyle=hexA(accent,.35); ctx.lineWidth=1.5;   // тонкий разделитель палитра|ноты ВНУТРИ роли
    ctx.beginPath(); ctx.moveTo(split,0); ctx.lineTo(split,playH); ctx.stroke();
  }
  /* Терменвокс — АДДИТИВНЫЙ оверлей ПОВЕРХ сетки соло/баса: тонкие нотные линии, ТОЛЬКО когда какая-то
     рука этой роли назначена на терменвокс (иначе линии — мусор). Сетка (rect/ряды) уже нарисована. */
  if((instr==='ld'||instr==='bs')&&roleHasTherm(instr))drawThereminLines(rx0,rx1,playH,accent,rectGrid()?actSlots:actDegs,instr);   // подсветка линий — по СЛОТАМ у rect-сетки (у узких рядов слот===ступень); множество, т.к. терменвоксом можно вести двумя руками
  /* Живой разбор Гц ПОВЕРХ подсвеченного корня — только у аккордов и только пока аккорд ЗАЩЁЛКНУТ и
     звучит (latchDeg>=0). Аккорд петли (loopChordDeg) сюда НЕ попадает: его владелец — 'loop:N', а не
     'latch'; подсветка ряда у него остаётся прежней (без разбора). Считаем полосу тем же способом, что
     рисовала сетка (rectBandY / seg=playH/rows), поэтому цифры лягут ровно в подсвеченный прямоугольник. */
  if(instr==='ch'&&latchDeg>=0&&supportsChords()){
    const freqs=latchChordFreqs();
    if(freqs&&freqs.length){
      const nx0 = chTyped ? split : rx0;                     // левый край поля корней (у типизированных — правее палитры)
      /* ⚠️ РАЗБОР Гц УСТУПАЕТ ДОРОГУ СТОЛБИКАМ ЭФФЕКТОВ (слайс б.3). Оба прижаты к ПРАВОЙ кромке роли:
         разбор — по правому краю подсвеченного прямоугольника, столбики — внизу справа. Порядок
         рисования не спасает: drawFxBars идёт ПОЗЖЕ drawRole, так что столбики легли бы ПОВЕРХ цифр —
         и накрыли бы именно правый край, по которому цифры выровнены.
         ⚠️ ПОСЛЕ УПРОЩЕНИЯ ЭТО КАСАЕТСЯ КАЖДОГО АККОРДА, А НЕ ТОЛЬКО «С РУКОЙ НА ЭФФЕКТАХ». Столбики
         аккордов теперь на экране ВСЕГДА (цепь роли непуста по умолчанию: реверб + яркость), поэтому
         рамка fxBarsBox тоже считается всегда — она больше не спрашивает про руку. Условие ниже
         осталось прежним ровно потому, что оно и не про руку, а про ГЕОМЕТРИЮ.
         ⚠️ УСТУПАЕМ ТОЛЬКО ПРИ РЕАЛЬНОМ ПЕРЕСЕЧЕНИИ ПО ВЕРТИКАЛИ, а не всегда. Столбики занимают лишь
         нижнюю полосу экрана (~100px), а разбор живёт в полосе ЗАЩЁЛКНУТОГО аккорда — они совпадают,
         только когда корень взят в нижнем прямоугольнике/ряду (проверено: у 8 полос нижняя — это
         H-100..H, столбики H-140..H-40, пересечение есть). Безусловный отступ съедал бы ~170px ширины
         разбора на КАЖДОМ аккорде, включая верхние, — а на телефоне это половина роли, и лесенка
         сокращений (fitReadout) резала бы цифры там, где мешать некому.
         ⚠️ Прыжка «под рукой» это не даёт: ширина меняется при смене ПОЛОСЫ, то есть при взятии другого
         аккорда, а не по ходу звучания одного. */
      const box=fxBarsBox(chainKeyOf(instr),rx1,playH);   // O-0: цепь ЭТОЙ роли (ветка под instr==='ch'), а не литерал
      const rdX1=(yT,yB)=> (box && yB>box.y0 && yT<box.y1) ? box.xL-8 : rx1;
      if(rectGrid()&&actSlot>=0){                            // полоса = прямоуг.(floor(слот/k)) + октавная, если она есть; по СТУПЕНИ её не найти (см. подсветку выше)
        const RL=rectLayout(), [yTop,yBot]=rectBandY(Math.floor(actSlot/RL.k)+RL.regBands,playH,RL.bands);
        drawChordReadout(nx0+(rx1-nx0)*0.42,rdX1(yTop,yBot),yTop,yBot,freqs,ROLE_COL.ch);   // правая часть прямоугольника (слева — легенда пальцев)
      }else if(!rectGrid()){                                  // узкие ряды (chrom12/BP/темперации/диатоника): ряд act. rect-сетка с аккордом ВНЕ окна разбор просто не рисует — рисовать его негде
        const rows=IVX().length, seg=playH/rows, yTop=(rows-1-act)*seg;
        drawChordReadout(nx0+(chTyped?36:66),rdX1(yTop,yTop+seg),yTop,yTop+seg,freqs,ROLE_COL.ch);   // резерв слева под корневую подпись
      }
    }
  }
  /* ⚠️ ОТДЕЛЬНОГО ИНДИКАТОРА ЯРКОСТИ («ЯРК») ЗДЕСЬ БОЛЬШЕ НЕТ, И ЭТО УПРОЩЕНИЕ, А НЕ ПОТЕРЯ.
     Яркость аккордов — обычный эффект цепи (цель «а»), поэтому её показывает ОБЩИЙ путь: обход цепи в
     fxBarItems отдаёт её столбиком BRI наравне с реверберацией. Своя функция, свой гейт и свой цвет
     были наследством тех времён, когда яркость была вшитым поведением роли, а не записью цепи.
     ⚠️ ЧЕМ ЭТО БЫЛО ПЛОХО, ЧТОБЫ НЕ ВЕРНУЛИ: показ зависел ОТ РУКИ (три условия, четыре состояния), и
     столбик КОЧЕВАЛ МЕЖДУ ДВУМЯ РИСОВАЛЬЩИКАМИ — с рукой-эффектами его рисовал общий путь, без неё
     эта функция. Один и тот же эффект выглядел по-разному в зависимости от того, чем занята рука,
     хотя звучал одинаково. Новый закон ровно один: ЕСТЬ В ЦЕПИ — РИСУЕТСЯ. */
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
    ctx.strokeStyle=hexA(cv('white'),.18); ctx.lineWidth=2;   // разделитель половин по центру
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    for(const h of halves) drawFxBars(h.role,h.rx1,H);   // столбики КАЖДОЙ половины — у ЕЁ правой кромки (слайс б.2; прежде только соло-половина и от левой). Гейта по руке НЕТ: рисуется ЦЕПЬ половины, а у пустой цепи (бас/ударные по умолчанию) список пуст сам собой
    const solo=halves.find(h=>h.role==='ld');            // нужна ТОЛЬКО «ВЫР» ниже: выразительность пока соло-своя (roleHasExpr), в отличие от эффектов
    if(solo&&roleHasExpr('ld'))drawExprBar(solo.rx0,solo.rx1,H);   // «ВЫР» — энергия смычка у соло-половины, только если назначена рука-выразительность
  }else{
    drawRole(phoneInstr,0,W,playH);
    drawFxBars(phoneInstr,W,H);   // столбики текущей роли у правой кромки экрана (слайс б.2). Гейта по руке НЕТ — рисуется цепь роли; пустая цепь не даёт столбиков
    if(phoneInstr==='ld'&&roleHasExpr('ld'))drawExprBar(0,W,H);   // «ВЫР» — энергия смычка; полосу прячем, если НИ ОДНА рука не назначена на выразительность
  }
  /* Заголовок роли на холсте убран: роль показывает и переключает кнопка instrBtn в верхней панели. */
  drawHandsPhone(res,W,H,playH);
  if(!videoRec)drawLooper(); else loopViewClear();   // при записи клипа полосу лупера (служебная накладка НА ХОЛСТЕ) прячем из кадра; сетка/руки/ярлыки/эффекты — это ИГРА, остаются. ⚠️ Полосы нет → снимаем и геометрию попадания: иначе тап пришёлся бы по НЕВИДИМОЙ кнопке (loopView остался бы от последнего нарисованного кадра)
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
    ctx.fillStyle=cv('night-a82'); ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
    ctx.strokeStyle=cv('white-a16'); ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
    ctx.strokeStyle=cv('rec'); ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+2*Math.PI*frac); ctx.stroke();   // убывающая дуга = остаток
    ctx.fillStyle=cv('white'); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='700 26px system-ui'; ctx.fillText(String(Math.ceil(looperClear/1000)), cx, cy-4);
    ctx.font='600 10px system-ui'; ctx.fillText(t('looper.clear'), cx, cy+16);
  }
  if(looperMsg && now<looperMsg.until){
    const mtext=looperMsg.text, cx=W/2, cy=H*0.20;
    ctx.font='700 16px system-ui'; const w=ctx.measureText(mtext).width;
    ctx.fillStyle=cv('night-a85');
    ctx.beginPath(); ctx.roundRect(cx-w/2-14,cy-16,w+28,32,9); ctx.fill();
    ctx.strokeStyle=looperMsg.ok?cv('tonic-a70'):cv('rec-a85'); ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=looperMsg.ok?cv('mint'):cv('rec-pale'); ctx.textAlign='center'; ctx.textBaseline='middle';
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
    ctx.fillStyle= i%2? cv('amber-a05'):cv('white-a03'); ctx.fillRect(rx0,y,w,seg);
    ctx.strokeStyle=cv('white-a10'); ctx.beginPath(); ctx.moveTo(rx0,y); ctx.lineTo(rx1,y); ctx.stroke();
    ctx.fillStyle=cv('amber-a85'); ctx.font='600 14px system-ui';
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
    const split=palSplitX(rx0,rx1), accent=ROLE_COL[instr], isCh=instr==='ch', isDr=instr==='dr';
    const fxHand=handFnOf(k,instr)==='fx', base=fxHand?cv('sky'):accent;   // рука эффектов = её ФУНКЦИЯ В РОЛИ ЭТОЙ РУКИ (single И сплит-половина одинаково). Слайс б.1 снял отсюда 'ld': форма теперь та же, что у loopHand строкой ниже. В б.1 это БЕЗ РАЗНИЦЫ по поведению (кроме соло 'fx' выбрать негде), но в б.2 без этого fx-рука в чужой половине красилась бы акцентом роли
    const loopHand=handFnOf(k,instr)==='loop';   // рука-ЛУПЕР: нот не играет, командует пальцами. Перечень ролей снят в б.4 вместе с гейтами зоны (см. hLoop в gestures) — иначе ударная рука-лупер провалилась бы ниже и подписалась ярлыком ряда
    const exprHand=instr==='ld'&&handFnOf(k,'ld')==='expr';   // рука-ВЫРАЗИТЕЛЬНОСТЬ: нот не играет, «дышит» в звук
    /* Одна рука — четыре канала, БЕЗ панели приборов: тон точек = ШИРИНА/раскрытость (тускло-синий кулак →
       воздушно-голубой раскрытая ладонь), непрозрачность И размер = ЭНЕРГИЯ (движение → свечение). Текстуру и
       пространство не рисуем (их слышно как грязь и эхо), чтобы не превратить экран в измеритель. */
    const eTip = exprHand ? mixHex(EXPR_COL_DK,EXPR_COL,exprBrightDisp,0.45+0.55*exprDisp) : null;
    for(let i=0;i<lm.length;i++){
      const x=sx(lm[i].x,W), y=sy(lm[i].y,H), tipPt=i===4||FINGER_TIPS.includes(i);   // точки в экранных пикселях игрового поля (поля кадра сняты); НЕ клампим — рука уходит за кромку вместе с картинкой
      ctx.fillStyle= exprHand ? (tipPt?eTip:mixHex(EXPR_COL_DK,EXPR_COL,exprBrightDisp,0.3))
                   : tipPt?(S.pinch?base:cv('white-a65')):cv('white-a40');
      ctx.beginPath(); ctx.arc(x,y,exprHand&&tipPt?6+3*exprDisp:(tipPt?6:2.5),0,7); ctx.fill();   // кончики растут с энергией
    }
    if(exprHand){                                // рука-ВЫРАЗИТЕЛЬНОСТЬ: играет НИЧЕГО — помечаем у основания среднего (lm[9])
      const px=S.pinch?S.x:sx(lm[9].x,W), py=S.pinch?S.y:sy(lm[9].y,H);
      ctx.fillStyle=hexA(EXPR_COL,.95); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(t('hand.expr'), px+14, py-10);
      continue;
    }
    if(S.pinch&&S.zone==='oct'){                  // рука в октавной полосе (любая, в т.ч. левая): показываем регистр, эффектов НЕ трогаем
      ctx.fillStyle=cv('sky'); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(`${regWord().toUpperCase()} ${OCT_ROMAN[S.oct]}`, S.x+14, S.y-10);   // «ОКТ»/«ТРИТАВА» по периоду
      continue;
    }
    if(fxHand){                                  // рука эффектов: подпись выбранного эффекта у кисти
      /* Эффект берём из ЗАХВАТА — но захват теперь ПО ПАЛЬЦУ, и на одном пальце могут сидеть параметры
         РАЗНЫХ эффектов (Пласт 3.4.2). Подписываем ПЕРВЫЙ эффект с МЕТАДАННЫМИ ПОКАЗА (FX_META:
         цвет и имя) — это три скаляра и, с в.1, делей-модуль, поэтому его подпись у кисти осталась. У реверба
         метаданных нет, и на его пальце подпись по-прежнему не рисуется. На дефолтной цепи это ровно прежняя картинка:
         средний → «Делей 42%», указательный (реверб) → без подписи, как и было. */
      if(S.pinch&&S.adj){ let meta=null, ent=null;
        for(const e of S.adj.ent){ const m=FX_META.find(q=>q.k===e.fxId); if(m&&e.pIdx===0){ meta=m; ent=e; break; } }   // pIdx 0 — «величина» эффекта: у скаляра он единственный, у делея-модуля это mix (в.1); время и повторы на пальце подписью не дублируем
        if(meta){ ctx.fillStyle=cv(meta.col); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
          ctx.fillText(`${t(meta.fullKey)} ${Math.round(ent.get()*100)}%`, S.x+14, S.y-10); } }   // величина ЖИВАЯ, из записи захвата (в.1): у скаляра get() — тот же fx[k], у делея — cur экземпляра
      continue;
    }
    if(loopHand){                                // рука-ЛУПЕР: помечаем, чтобы не казалась «немой»; подсказку раскладки даём до щипка
      const px=S.pinch?S.x:sx(lm[8].x,W), py=S.pinch?S.y:sy(lm[8].y,H);
      ctx.fillStyle=hexA(cv('tonic'),.95); ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(t('hand.looper'), px+14, py-10);
      if(!S.pinch){ ctx.fillStyle=hexA(cv('tonic'),.6); ctx.font='600 10px system-ui';
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
      ctx.fillStyle=cv('white-a70'); ctx.font='600 12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
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
           Гц и центами, упакованные с деградацией (см. fitLeadNotes). V2: соло И бас — у кого из них ПОЛИФОНИЧЕСКИЙ
           режим; в ведущем нота у роли одна, и handLeadNotes честно отдаёт пусто.
           ⚠️ ОДНА НОТА ИДЁТ ПРЕЖНЕЙ ВЕТКОЙ — две строки слово в слово, как было (гарантия «одна нота
           выглядит как раньше»); ветка ниже включается ровно с ДВУХ. */
        const many = handLeadNotes(k,instr);
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
        if(S.rootOnly){   // ⛳ F8: выбранного типа на этом корне нет в строе — звучит ОДИН КОРЕНЬ; ярлык говорит почему (тип — замороженный щипком, S.ty)
          const sel=(S.ty && FS.flatMap(f=>f.types).find(x=>x.iv===S.ty)) || ty;
          drawTag(S.x,S.y,[rootName(S.deg)+' · '+t('tag.rootOnly'), t('tag.typeNotOnRoot',{type:L(sel.label)||''}),
            `${regWord(s)} ${OCT_ROMAN[oShow]} · ${Math.round(S.vol*100)}%`],accent);
        }else
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
        if(RL.hasReg&&band===0) lbl=`${regWordFull()} · ${t('tag.octHint',{r:OCT_ROMAN[hbase]})}`;   // роль=instr
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
  /* ⛳ T7: ТИПЫ, КОТОРЫХ НА КОРНЕ ПОД РУКОЙ НЕТ В СТРОЕ, — СЕРЫЕ (Партч: тон вне 43 высот; прочим строям всё доступно — chordTypeFits
     отвечает «да»). Корень — тот, на который аккордовая рука щипнула последней (state.chFitDeg, пишет gestures); ещё не щипала — серых
     нет. Выбрать серый тип можно (он пригодится на другом корне), но на этом корне аккорд не зазвучит — внизу сказано почему. */
  const sc=CUR(), fti= chFitDeg>=0 ? tuningIndexOf(chFitDeg,sc,true) : null;
  const fits=t=> fti==null || chordTypeFits(t.iv, fti, sc);

  ctx.fillStyle=cv('night-a30'); ctx.fillRect(x0,0,x1-x0,H);   // палитра чуть темнее поля нот
  ctx.textBaseline='middle';
  for(let c=0;c<nC;c++){
    const fam=FS[c], nR=fam.types.length, [cx0,cx1]=palColX(c,px0,px1,nC);
    // ШАПКА КОЛОНКИ — имя семейства; активная колонка ярче
    ctx.textAlign='center'; ctx.font='700 10px system-ui';
    ctx.fillStyle = c===selC ? cv('white') : hexA(ROLE_COL.ch,.7);
    ctx.fillText(L(fam.name), (cx0+cx1)/2, CH_PAL_HEAD_H/2);
    for(let r=0;r<nR;r++){
      const [cy0,cy1]=palRowY(r,py0,py1,nR);
      const bx=cx0+CH_PAL_GAP/2, by=cy0+CH_PAL_GAP/2;      // зазор съедается ВНУТРИ клетки: попадание идёт по полной
      const bw=(cx1-cx0)-CH_PAL_GAP, bh=(cy1-cy0)-CH_PAL_GAP;
      const on = c===selC && r===selR, ok=fits(fam.types[r]);
      ctx.globalAlpha = ok ? 1 : 0.38;                     // T7: серый — типа нет в строе на этом корне
      ctx.fillStyle = on ? hexA(ROLE_COL.ch,.32) : cv('white-a05');
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
      ctx.strokeStyle = on ? ROLE_COL.ch : cv('white-a12');
      ctx.lineWidth = on ? 2 : 1; ctx.stroke();
      /* Подпись НЕ мельчим ниже 10px (после этого не читается на телефоне) — длинные
         теги 31-TET («нейтр♮7», «субмин») переносим на две строки: высота у клетки есть. */
      ctx.font = on ? '700 10px system-ui' : '10px system-ui';
      ctx.fillStyle = on ? cv('white') : cv('white-a72');
      const lines=wrapLabel(L(fam.types[r].label)||'—', bw-6), cy=(by+by+bh)/2;
      lines.forEach((L,i)=>ctx.fillText(L, bx+bw/2, cy+(i-(lines.length-1)/2)*11));
      ctx.globalAlpha=1;
    }
  }
  /* Полное имя выбранного типа — одной строкой снизу, где есть вся ширина палитры.
     full есть только там, где короткий тег непонятен (31-TET). */
  const tp=selF.types[selR], fullNm=tp&&(L(tp.full)||L(tp.label)), unfit=tp&&!fits(tp);   // tp, не t: t — функция перевода
  if(fullNm){
    ctx.textAlign='center'; ctx.font='11px system-ui'; ctx.fillStyle= unfit ? cv('orange-a95') : hexA(ROLE_COL.ch,.9);
    ctx.fillText(unfit ? L(tp.label)+' — '+t('pal.unfit') : fullNm, (x0+x1)/2, H-CH_PAL_HEAD_H/2);   // T7: выбранный тип недоступен на этом корне — говорим почему
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
/* ⚠️ ОТДЕЛЬНОГО СТОЛБИКА REV БОЛЬШЕ НЕТ (Пласт 3.1). Он показывал ГЛУБИНУ ИГРАЮЩЕЙ руки и жил по
   своему условию (roleHasNotes), потому что реверб принадлежал именно ей: dist(lm[0],lm[9]) → S.rev →
   payload.rev → revLead.gain. Теперь подмес соло в реверб ведёт FX-РУКА (параметр 'mix' модуля), и
   реверб показывают ЕГО СОБСТВЕННЫЕ столбики наравне с прочими эффектами: TAIL/TONE/MIX в своём слоте.
   «Прицел до щипка» исчез вместе с revDisp — целиться стало нечем.
   ⚠️ Стоявшая здесь фраза «нет руки-эффектов — нет и столбиков вообще» БОЛЬШЕ НЕ ВЕРНА: с цели (б) столбики
   рисуют ЦЕПЬ роли БЕЗ гейта по руке (drawFxBars/fxBarItems ниже) — эффект звучит и без пальца на нём
   (фиксированные значения, адреса играющей руки), значит и показывать его есть что. */
function drawFxBars(role,rx1,H){                   // rx1 — ПРАВАЯ кромка роли (слайс б.2; было rx0 — левая). Зовётся для ЛЮБОЙ роли: пустой items = ничего не рисуем. role остаётся РОЛЬЮ: это адрес ЭКРАННОГО МЕСТА и руки, а ключ цепи выводится здесь же (O-0)
  const items = fxBarItems(role,chainKeyOf(role));   // БЕЗ гейта по руке: столбик показывает состояние ЭФФЕКТА, а эффект звучит и без пальца на нём (фиксированные параметры). Пустая цепь → пустой список → ничего не рисуется
  const {y0,y1}=fxBarsY(H);                       // низ справа: выше строки статуса, ниже коробки лупера (та вверху по центру). Числа те же, но теперь ОДНИ на отрисовку и на габарит fxBarsBox
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  items.forEach((it,i)=>{
    /* СПРАВА НАЛЕВО: i=0 — ближайшее к кромке гнездо ПОСЛЕ крайнего (крайнее занято ВЫР/ЯРК), дальше
       влево. Порядок цепи читается от кромки внутрь. Почему не «слева направо с прижатием блока к
       кромке»: тогда начало блока зависело бы от ДЛИНЫ цепи, и разворот эффекта под зажатым пальцем
       (аккордеон: 1 столбик → 3) СДВИГАЛ БЫ ВСЕ столбики разом, в том числе тот, что сейчас ведут.
       Здесь якорь у кромки: разворот добавляет столбики ВЛЕВО, а стоящие правее не двигаются. */
    const x=rx1-FX_EDGE-FX_STEP*(i+1);
    let actv=false; for(const k in HANDS){ const S=HANDS[k];
      /* Подсветка — ПО АДРЕСУ ПАРАМЕТРА этого столбика (Пласт 3.4.2), а не по имени эффекта и уже не
         по слоту: слота нет, а один эффект может лежать на нескольких пальцах сразу. Светится ровно
         то, что зажатый палец РЕАЛЬНО ведёт, — параметр, отданный «фиксировано» или играющей руке, не
         светится, даже если соседний параметр того же эффекта сидит на этом пальце. На дефолтной цепи
         (все три параметра реверба на указательном) это в точности прежняя картинка.
         ⚠️ Палец 0 (указательный) — валидный и ложный, поэтому сравнение идёт через предикат с !=null внутри.
         ⚠️ ФИЛЬТР ПО РОЛИ (S.role===role) — того же рода, что у fxActiveFinger выше, и по той же
         причине (слайс б.1): перебор идёт по ВСЕМ рукам, а fxParamOnFinger сравнивает ТОЛЬКО НОМЕР
         ПАЛЬЦА. Без фильтра в сплите fx-рука ЧУЖОЙ роли, зажавшая тот же по счёту палец, засветила бы
         столбики этой. В б.1 разницы нет (fx бывает лишь у соло), но ловушка была бы уже заряжена. */
      if(S.pinch&&S.zone==='fx'&&S.adj&&S.role===role&&fxParamOnFinger(it.fing,S.adj.finger))actv=true; }
    ctx.fillStyle=cv('white-a09'); ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
    const fh=FX_BAR_MAX*Math.max(0,Math.min(1,it.v));
    /* ⛳ ПОМЕТКА «ЭТИМ ПАРАМЕТРОМ ПРАВИТ ЗАПИСЬ» (O-3.1) — ПУСТОТЕЛЫЙ столбик вместо залитого.
       Зачем вообще метить: столбик показывает ПРИЦЕЛ руки, и без пометки человек двинул бы палец,
       услышал бы, что ничего не изменилось, и прочёл это как поломку. Пометка отвечает заранее.
       Почему ПУСТОТЕЛЫЙ, а не цвет и не мигание: «не подключено» читается мгновенно и на 380px, это
       СОСТОЯНИЕ, а не тревога, и он не спорит ни с подсветкой активного пальца (сплошная рамка, actv),
       ни с меткой играющей руки (точка слева) — обе остаются на своих местах и значат прежнее.
       ⚠️ ВТОРОЙ ПРИЗНАК — ПРИГЛУШЁННАЯ ПОДПИСЬ, и он несущий, а не украшение: при величине около нуля
       заливки нет вовсе, и «пустотелый» отличить не от чего. Подпись же нарисована ВСЕГДА, при любом
       значении, — значит метка не исчезает там, где она нужнее всего.
       ⛔ ТОЧКУ СПРАВА НЕ СТАВИТЬ, хотя она и напрашивалась парой к левой: шаг столбика 25px, ширина 10,
       то есть правый зазор — 15px, и точка на +5 встала бы в 5px от ТОЧКИ ИГРАЮЩЕЙ РУКИ соседнего
       столбика (та сидит на −5 от него). Две одинаковые точки в 5px друг от друга не различить, и
       словарь меток превратился бы в кашу ровно там, где должен был объяснять. */
    ctx.globalAlpha=actv?0.95:0.5;
    if(it.drv){ ctx.strokeStyle=it.c; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y1-fh+0.5,FX_BAR_W-1,Math.max(1,fh-1)); }
    else { ctx.fillStyle=it.c; ctx.fillRect(x,y1-fh,FX_BAR_W,fh); }                       // заполнение снизу вверх
    ctx.globalAlpha=1;
    if(actv){ ctx.strokeStyle=it.c; ctx.lineWidth=1.5; ctx.strokeRect(x-1.5,y0-1.5,FX_BAR_W+3,FX_BAR_MAX+3); }
    /* МЕТКА «ведёт ИГРАЮЩАЯ рука» (Пласт 3.2): точка в ЗАЗОРЕ слева от столбика. Зазор уже есть
       (FX_BAR_GAP=15), поэтому метка НИЧЕГО не двигает — ни столбиков, ни отступа легенды. Точка стоит
       вплотную к СВОЕМУ столбику (4px) и далеко от соседнего (11px), так что чья она — не спутать.
       Почему не рамка и не другой оттенок трека: рамку уже занимает подсветка активного слота (actv), а
       заливка трека меняется с величиной — метка обязана читаться при ЛЮБОМ значении, включая 0 и 100%. */
    if(it.play){ ctx.fillStyle=it.c; ctx.globalAlpha=0.9;
      ctx.beginPath(); ctx.arc(x-5, y0+5, 2.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    ctx.fillStyle = actv ? it.c : (it.drv ? cv('white-a26') : cv('white-a50'));   // ведёт запись → подпись приглушена (см. довод о метке выше): видно при ЛЮБОЙ величине, в том числе нулевой
    ctx.fillText(it.l,x+FX_BAR_W/2,y0-5);
  });
}
 
/* Индикатор ЭНЕРГИИ руки-ВЫРАЗИТЕЛЬНОСТИ («смычок») — один вертикальный столбик «ВЫР», как ЯРК/REV.
   Заполнение = exprDisp (0 покой .. 1 поёт). Стоит внизу-СПРАВА соло-поля (там свободно, эффекты —
   слева). Виден, ТОЛЬКО когда какая-то рука соло назначена на 'expr' (гейт в drawPhone). Столбик
   отвечает на движение ДО первой ноты — так связка «двигаю → открывается» видна сразу (учебность). */
const EXPR_COL=cv('cyan');   // воздушный тон (ЯРКО/раскрыто) — не путать с REV (зелёный) и ролью соло (оранжевый)
const EXPR_COL_DK=cv('indigo');   // тускло-синий (СЖАТО/тускло) — второй конец тона точек руки
function drawExprBar(rx0,rx1,H){
  const v=Math.max(0,Math.min(1,exprDisp));
  const x=rx1-FX_EDGE, y1=H-40, y0=y1-FX_BAR_MAX;   // КРАЙНЕЕ гнездо — то же, что у ЯРК (роли разные, гнездо одно). Столбики цепи начинаются СЛЕДУЮЩИМ гнездом, поэтому соло с рукой-выразительностью И рукой-эффектами показывает ВЫР у кромки и эффекты левее, без наложения
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  ctx.fillStyle=cv('white-a09'); ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
  const fh=FX_BAR_MAX*v;
  ctx.fillStyle=EXPR_COL; ctx.globalAlpha=0.7; ctx.fillRect(x,y1-fh,FX_BAR_W,fh); ctx.globalAlpha=1;   // заполнение снизу вверх
  ctx.fillStyle=hexA(EXPR_COL,.85); ctx.fillText(t('ind.expr'),x+FX_BAR_W/2,y0-5);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

export { drawOverlays };
