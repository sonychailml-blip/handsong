import { ctx, canvas, video } from './vision.js';
import { HANDS, leadOwner, degRaw, handRole } from './gestures.js';
import { CUR, IVX, chordLabel, rowLabel, chordNotesStr, leadFreq, bassFreq, centsOf, OCT_ROMAN, supportsChords, typedChords, chordFams, rootName, rectGrid, rectRowsFull, thereminSpan, baseF, periodOf, regWord, swaraLbl } from './scales.js';
import { fx, revDisp, chBrightDisp, latchDeg, latchTy, chordFam, chordVar, phoneInstr, rectOctReg, roleHasTherm, roleHasFx, handFnOf, splitOn, phoneHalves, mirrored, sx, sy, videoRec } from './state.js';
import { FX_META, REV_COLOR, FINGER_TIPS, FX_BAR_W, FX_BAR_GAP, FX_BAR_MAX, INSTR_COL,
         CH_PAL_PAD, CH_PAL_GAP, CH_PAL_HEAD_H, palColX, palRowY, rectBandY, palSplitX, CAM_MARGIN } from './config.js';
import { DRUM_NAMES, chordHold } from './audio.js';

import { recording, inPB, loop, events, loopPos, loopChordDeg, beatLevel } from './recorder.js';
 
/* Геометрия столбиков эффектов. Правый край считаем ИЗ КОНСТАНТ, чтобы подписи
   ступеней сдвигались автоматически при подкрутке ширины/зазора — иначе разъедется. */
const FX_X0=6, FX_N=1+FX_META.length;                       // REV + эффекты
const FX_BAND_R=FX_X0+(FX_N-1)*(FX_BAR_W+FX_BAR_GAP)+FX_BAR_W;

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
 
/* ================= ОТРИСОВКА ================= */
/* labelX — где писать подписи ступеней. По умолчанию у левого края зоны; у соло в
   phone сдвигаем правее, чтобы столбики эффектов слева не легли поверх подписей. */
function drawGrid(zx0,zx1,accent,labelOf,activeDeg,gridH=canvas.height,labelX=zx0+7){
  const s=CUR(), ivx=IVX(), rows=ivx.length, seg=gridH/rows;
  if(activeDeg>=0){
    ctx.fillStyle=hexA(accent,.26);
    ctx.fillRect(zx0,(rows-1-activeDeg)*seg,zx1-zx0,seg);
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
/* Порядковый номер ноты В РАСКЛАДКЕ прямоугольников (не число шагов от тоники!): Т = тоника
   (и снизу, и октавная сверху), дальше 2,3,4… — так номера встают в ряд с римскими пальцами
   I–IV (rowLabel дал бы «1» у пальца II — читается как ошибка). Только для rect-соло. */
const rectNoteLbl = deg => (deg===0 || centsOf(deg)===0) ? 'Т' : String(deg+1);
/* Подпись ноты нерект-сетки. ПОРЯДКОВЫЙ номер Т,2,3,4… (как rect-лады) берут ДВА рода ладов:
   (1) НЕОКТАВНЫЕ (period≠2, Болен–Пирс/Карлос) — там номер ШАГА врал бы off-by-one;
   (2) CENTS-лады (s.cents есть, любой edo, вкл. Пифагоров edo:12) — их ноты НЕ на 12-TET высотах
   (пифагоров D# = 611.73¢, не темперированные 600¢), поэтому имена C/C#/D (rowLabel через stepName)
   ВРАЛИ бы; порядковый честнее, живой ярлык всё равно показывает реальные Гц/центы. Тонику и
   верхнюю тонику периода/октавы ловим СТРУКТУРНО (IVX[deg]%edo===0 — как зелёная линия тоники в
   drawGrid), а НЕ через centsOf===0: у неоктавного периода центы сверху не округляются в ровный 0.
   Октавный НЕ-cents лад (12-TET, макамы: period=2 И нет s.cents) → rowLabel как был, байт-в-байт.
   Партч — cents-лад, НО rect: везде идёт через rectNoteLbl/rect-ветки, сюда не заходит (без регресса). */
const gridNoteLbl = deg => CUR().swaraNames ? swaraLbl(deg)   // индийские лады: имена свар (саргам) вместо порядковых
  : CUR().fixedKey ? rowLabel(deg)   // фиксированный строй: сетка приколочена к C — имена нот СНОВА правдивы (этот C и есть C, лишь иначе настроен); rowLabel даёт NOTE_NAMES[(tonic+шаг)%12], имя зависит от КЛЮЧА
  : (periodOf(CUR())!==2 || CUR().cents)
  ? (IVX()[deg]%CUR().edo===0 ? 'Т' : String(deg+1))
  : rowLabel(deg);
/* Сетка «4 ноты в прямоугольнике» (phone-соло/бас/аккорды, 19/31-TET). Прямоугольник выбирается
   по Y, нота/корень внутри — ПАЛЬЦЕМ (I..IV), а НЕ горизонталью: X — громкость. Поэтому 4 ноты
   показываем КОМПАКТНОЙ ЛЕГЕНДОЙ по пальцам (I/II/III/IV → нота), а не колонками. Активный палец
   подсвечен, активный прямоугольник подтонирован. Полосу даёт rectBandY (тот же делитель высоты,
   что у degHyst в gestures), число полос — rectRowsFull (нотные + октавная): ввод и картинка не
   разъедутся. Полоса 0 — октавный распорядитель, 1..N — нотные (r=полоса−1).
   x0..x1 — X-ПРОТЯЖЁННОСТЬ: соло/бас на всю ширину [0,W]; аккорды — правая половина [SPLIT,W]
   (слева палитра). lblOf(deg) — подпись ноты/корня (соло/бас: порядковый+центы; аккорды: rootName). */
function drawRectGrid(x0,x1,playH,accent,activeDeg,lblOf,role,rx0=x0){
  const nRfull=rectRowsFull(), maxDeg=IVX().length-1, w=x1-x0;
  const aRect=activeDeg>=0?Math.floor(activeDeg/4):-1, aNote=activeDeg>=0?activeDeg%4:-1;
  const lx=Math.max(x0+7,rx0+FX_BAND_R+8);       // легенда правее столбиков эффектов (соло, от rx0 — левого края роли) и правее палитры (аккорды). rx0 ОТДЕЛЬНО от x0: у аккордов x0=split, но столбиков там нет
  ctx.textBaseline='middle';
  for(let b=0;b<nRfull;b++){                     // полос nRfull: полоса 0 — октавная (низ), 1..N — нотные
    const [yTop,yBot]=rectBandY(b,playH,nRfull), h=yBot-yTop;
    if(b===0){
      drawRectOctBand(x0,w,lx,yTop,h,role);      // общий с терменвоксом рендер октавной полосы (роль → чей регистр подсветить)
    }else{
      const r=b-1, on=r===aRect;                 // нотный прямоугольник = полоса−1
      ctx.fillStyle= on ? hexA(accent,.16) : (r%2?'rgba(255,255,255,.05)':'rgba(255,255,255,.03)');
      ctx.fillRect(x0,yTop,w,h);
      ctx.strokeStyle= on ? accent : 'rgba(255,255,255,.12)';
      ctx.lineWidth= on ? 2 : 1; ctx.strokeRect(x0+0.5,yTop+0.5,w-1,h-1);
      // легенда 4 пальцев (I=указ.=низ … IV=мизинец=верх), стопкой — это КЛЮЧ, не 4 зоны выбора
      const eh=Math.min(20,(h-8)/4), sy=yTop+(h-eh*4)/2;
      for(let n=0;n<4;n++){
        const deg=Math.min(r*4+n,maxDeg), ey=sy+n*eh+eh/2, act=on&&n===aNote;
        ctx.font= act?'700 13px system-ui':'12px system-ui';
        ctx.fillStyle= act?accent:'rgba(255,255,255,.6)'; ctx.textAlign='left';
        ctx.fillText(`${OCT_ROMAN[n]}  ${lblOf(deg)}`, lx, ey);
      }
    }
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
/* ОКТАВНАЯ ПОЛОСА (нижний прямоугольник) — распорядитель регистра, control-синий. 4 строки
   палец→регистр I–IV → окт I..IV; активный регистр РОЛИ (rectOctReg: соло→octReg, бас→bassOctReg,
   аккорды→chordOctReg) подсвечен. Рендер октавной полосы для rect-сетки (drawRectGrid); терменвокс
   теперь аддитивный оверлей и полосу НЕ перерисовывает (её даёт сетка). */
function drawRectOctBand(x0,w,lx,yTop,h,role){
  ctx.fillStyle=hexA('#4cc2ff',.10); ctx.fillRect(x0,yTop,w,h);
  ctx.strokeStyle=hexA('#4cc2ff',.55); ctx.lineWidth=1.5; ctx.strokeRect(x0+0.5,yTop+0.5,w-1,h-1);
  const eh=Math.min(18,(h-6)/5), sy=yTop+(h-eh*5)/2, reg=rectOctReg(role);
  ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.font='700 12px system-ui'; ctx.fillStyle=hexA('#4cc2ff',.9);
  ctx.fillText(periodOf()===2?'ОКТАВА':regWord().toUpperCase(), lx, sy+eh/2);   // слово-регистр по периоду (октава→ОКТАВА; период≠2 → ТРИТАВА/РЕГ.). period=2 байт-в-байт
  for(let n=0;n<4;n++){
    const ey=sy+(n+1)*eh+eh/2, act=n===reg;
    ctx.font= act?'700 13px system-ui':'12px system-ui';
    ctx.fillStyle= act?'#4cc2ff':'rgba(255,255,255,.6)';
    ctx.fillText(`${OCT_ROMAN[n]}  ${regWord()} ${OCT_ROMAN[n]}`, lx, ey);
  }
}
/* ТЕРМЕНВОКС — АДДИТИВНЫЙ ОВЕРЛЕЙ поверх ОБЫЧНОЙ сетки (rect-прямоугольники/узкие ряды остаются как
   есть; терменвокс их НЕ заменяет — лишь добавляет линии). Рисуем ТОЛЬКО тонкие линии — по одной на
   реальную ноту (у rect-ладов 4 на прямоугольник), в ЦЕНТРЕ своего деления: ориентир для непрерывной
   высоты. Поле/октавную полосу/грубые границы уже нарисовала сетка — здесь НЕ повторяем (иначе двойная
   заливка/затемнение). Геометрия — thereminSpan, ТОТ ЖЕ раздел, что у звука (gestures), поэтому линия и
   слышимый центр совпадают. Ближайшая нота (activeDeg) ярче. rx0 — левый край роли (легенда правее
   столбиков эффектов). Показываем ТОЛЬКО когда какая-то рука роли назначена на терменвокс (drawRole). */
function drawThereminLines(x0,x1,playH,accent,activeDeg,rx0=x0){
  const {M,spanBot,divH}=thereminSpan(playH), last=M-1, s=CUR(), rect=rectGrid();
  const lx=Math.max(x0+7,rx0+FX_BAND_R+8);
  const every=divH>=15?1:divH>=9?2:4;             // подписи прореживаем, если линии частые (Партч=44 нот)
  ctx.textBaseline='middle';
  for(let d=0;d<=last;d++){                        // d — ступень; линия в ЦЕНТРЕ деления
    const yc=spanBot-(d+0.5)*divH, on=d===activeDeg;
    const ton=IVX()[d]%s.edo===0;                  // тоника/октава — зелёным (как drawGrid)
    ctx.strokeStyle= on?accent : ton?'rgba(87,217,163,.5)':'rgba(255,255,255,.22)';   // чуть ярче: линии поверх готовой сетки
    ctx.lineWidth= on?2:0.8;
    ctx.beginPath(); ctx.moveTo(x0,yc); ctx.lineTo(x1,yc); ctx.stroke();
    if(on||d%every===0){
      ctx.fillStyle= on?accent : ton?'#57d9a3':'rgba(255,255,255,.6)';
      ctx.font= on?'700 12px system-ui':'11px system-ui'; ctx.textAlign='left';
      ctx.fillText(`${rect?rectNoteLbl(d):gridNoteLbl(d)} · ${centsOf(d)}c`, lx, yc);   // нерект (BP): порядковый, чтобы совпасть с сеткой/ярлыком
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
  const unit=a=>{ const b=a.slice(); b[b.length-1]+=' Гц'; return b; };   // «Гц» на последний сегмент → конец последней строки
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
  if(info&&info.phase==='count'){ head=`ОТСЧЁТ  ${info.countLeft}`; hc='#57d9a3'; }
  else if(recording){ head=loop.first?`● ЗАПИСЬ · круг ${bars} т.`:`● НАЛОЖЕНИЕ · слой ${loop.layer+1}`; hc='#e5484d'; }
  else if(loop.on){ head=`▶ ПЕТЛЯ · ${bars} т. · слоёв ${ids.length}`; hc='#57d9a3'; }
  else { head=`ПЕТЛЯ · ${bars} т. · слоёв ${ids.length} · «⟳ луп» играть`; hc='rgba(255,255,255,.7)'; }
  ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.font='600 12px system-ui';
  ctx.fillStyle=hc; ctx.fillText(head,x0-2,y0+headH/2+1);

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
  /* Кадрируем видео в ИГРОВОЕ поле: на экран попадает ровно то, что играбельно, ТОЙ ЖЕ долей полей
     CAM_MARGIN, что снимает remapAxis у точек (sx/sy) — картинка и рука не разъедутся. Источник —
     интрин. пиксели видео (videoWidth/Height); режем поля по КАЖДОЙ оси одной долей M, растяжение в
     холст остаётся ПРЯМЫМ, как было (никакого cover/letterbox тут не было — поля новых искажений не
     вносят, лишь «зумим» в центр). Зеркалим только фронтальную (mirrored — тот же источник, что flipX/sx). */
  const vw=video.videoWidth||W, vh=video.videoHeight||H, M=CAM_MARGIN;
  const cx0=M*vw, cy0=M*vh, cw=(1-2*M)*vw, ch=(1-2*M)*vh;
  if(mirrored()){ ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,cx0,cy0,cw,ch,-W,0,W,H); ctx.restore(); }
  else ctx.drawImage(video,cx0,cy0,cw,ch,0,0,W,H);
  ctx.fillStyle='rgba(7,7,13,.5)'; ctx.fillRect(0,0,W,H);
}
function drawOverlays(res){ drawPhone(res); }

/* Лад без лестницы аккордов (макам): поле остаётся НА МЕСТЕ, приглушается, и вместо
   лестницы объясняет, куда делись аккорды и где взять гармонию. Занимает весь X-диапазон
   роли [x0,x1] (сплит — свою половину), от лада не зависит: раскладка при смене лада не перекраивается. */
const NO_CHORDS_HINT=['В макаме аккорды не строятся.',
                      'Дрон — в лупере; аккорды запишите',
                      'в другом ладу и играйте под макам.'];
function drawNoChordsHint(x0,x1,yTop,yBot){
  const cx=(x0+x1)/2, cy=(yTop+yBot)/2;
  ctx.fillStyle='rgba(10,10,20,.38)'; ctx.fillRect(x0,yTop,x1-x0,yBot-yTop);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=hexA('#b18cff',.7); ctx.font='700 13px system-ui';
  ctx.fillText('АККОРДОВ НЕТ',cx,cy-32);
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='12px system-ui';
  NO_CHORDS_HINT.forEach((ln,i)=>ctx.fillText(ln,cx,cy-6+i*17));
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
    st=`Лад: ${s.name} · центовый строй · ${s.iv.length} ступеней`;   // полный список центов НЕ печатаем (43 у Партча, 22 у сетки — переполняет строку); реальные центы — на каждом ряду и в ярлыке
  }else{
    st=`Лад: ${s.name} · ${s.edo}-TET · ступени: ${s.iv.join('-')}`;
    if(s.edo!==12)st+=` · шаг ${(1200/s.edo).toFixed(1)}c`;
  }
  if(recording)st='● запись · '+st;
  else if(inPB())st=`▶ петля · ${loop.bpm} BPM · `+st;
  statusEl.textContent=st;
  ctx.textAlign='left';
}

/* ================= PHONE-РЕЖИМ (вертикальный) =================
   Один инструмент на всю ширину (высотой до полосы эффектов), правая рука
   играет ноты, левая — эффекты в компактной полосе снизу. */
/* Рендер ОДНОЙ роли в её X-диапазон [rx0,rx1]. Вынесено из drawPhone, чтобы сплит-экран мог
   позвать её дважды (по половине на роль); single-role зовёт один раз с (phoneInstr,0,W). rx0 —
   левый край роли (начало столбиков эффектов), ОТДЕЛЬНО от x0 сетки (у аккордов x0=split). */
function drawRole(instr,rx0,rx1,playH){
  const accent=INSTR_COL[instr], split=palSplitX(rx0,rx1);
  const labelX= instr==='ld' ? rx0+FX_BAND_R+8 : rx0+7;   // у соло подписи правее столбиков эффектов
  if(instr==='dr'){ drawDrumGrid(rx0,rx1,playH); return; }
  // активная ступень: аккорд — по защёлке, соло/бас — по играющей руке
  let act=-1;
  if(instr==='ch')act=latchDeg>=0?latchDeg:loopChordDeg();   // рука в приоритете, иначе аккорд петли (§Q5)
  else for(const k in HANDS){ const S=HANDS[k]; if(S.pinch&&S.deg>=0&&(S.zone==='ld'||S.zone==='bs'))act=S.deg; }
  if(instr==='ch'&&!supportsChords()){ drawNoChordsHint(rx0,rx1,0,playH); return; }   // макам: всё поле роли — объяснение
  /* У типизированных аккордов ряд подписываем именем КОРНЯ (C, C#…): тип задаёт
     палитра, а не лад, поэтому обычный chordLabel (он дал бы пауэр-аккорд «C5») врёт. */
  const chTyped = instr==='ch' && typedChords();
  if(chTyped){
    /* Экран поделён: слева палитра типов, справа ряды/прямоугольники корней. Палитра — как была.
       19/31-TET: правая половина — rect-корни + октавная полоса; chrom12 — узкие ряды как было. */
    if(rectGrid())drawRectGrid(split,rx1,playH,INSTR_COL.ch,act, d=>`${rootName(d)} · ${centsOf(d)}c`, instr, rx0);   // корни прямоугольниками, в правой половине (роль=instr='ch')
    else drawGrid(split,rx1,accent,rootName,act,playH,split+7);
    drawChordPalette(rx0,split,playH);
    ctx.strokeStyle=hexA(accent,.35); ctx.lineWidth=1.5;   // тонкий разделитель палитра|ноты ВНУТРИ роли
    ctx.beginPath(); ctx.moveTo(split,0); ctx.lineTo(split,playH); ctx.stroke();
  }else if((instr==='ld'||instr==='bs')&&rectGrid())drawRectGrid(rx0,rx1,playH,accent,act, d=>`${rectNoteLbl(d)} · ${centsOf(d)}c`, instr, rx0);   // 19/31-TET: прямоугольники по 4 ноты (соло И бас), accent = цвет роли, роль=instr
  else drawGrid(rx0,rx1,accent, instr==='ch'?chordLabel:gridNoteLbl, act, playH, labelX);   // соло/бас: gridNoteLbl = порядковый у неоктавных (BP), rowLabel у прочих
  /* Терменвокс — АДДИТИВНЫЙ оверлей ПОВЕРХ сетки соло/баса: тонкие нотные линии, ТОЛЬКО когда какая-то
     рука этой роли назначена на терменвокс (иначе линии — мусор). Сетка (rect/ряды) уже нарисована. */
  if((instr==='ld'||instr==='bs')&&roleHasTherm(instr))drawThereminLines(rx0,rx1,playH,accent,act,rx0);
  /* Живой разбор Гц ПОВЕРХ подсвеченного корня — только у аккордов и только пока аккорд ЗАЩЁЛКНУТ и
     звучит (latchDeg>=0). Аккорд петли (loopChordDeg) сюда НЕ попадает: его владелец — 'loop:N', а не
     'latch'; подсветка ряда у него остаётся прежней (без разбора). Считаем полосу тем же способом, что
     рисовала сетка (rectBandY / seg=playH/rows), поэтому цифры лягут ровно в подсвеченный прямоугольник. */
  if(instr==='ch'&&latchDeg>=0&&supportsChords()){
    const freqs=latchChordFreqs();
    if(freqs&&freqs.length){
      const nx0 = chTyped ? split : rx0;                     // левый край поля корней (у типизированных — правее палитры)
      if(rectGrid()){                                        // 19/31-TET/Партч: полоса — прямоуг.=floor(act/4), band=+1 (0 — октавная)
        const nRfull=rectRowsFull(), [yTop,yBot]=rectBandY(Math.floor(act/4)+1,playH,nRfull);
        drawChordReadout(nx0+(rx1-nx0)*0.42,rx1,yTop,yBot,freqs,INSTR_COL.ch);   // правая часть прямоугольника (слева — легенда пальцев)
      }else{                                                  // узкие ряды (chrom12/BP/темперации/диатоника): ряд act
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
    const solo=halves.find(h=>h.role==='ld'); if(solo&&roleHasFx('ld'))drawFxBars(solo.rx0,H);   // столбики эффектов — у соло-половины, ТОЛЬКО если у соло-роли есть рука-эффекты
  }else{
    drawRole(phoneInstr,0,W,playH);
    if(phoneInstr==='ld'&&roleHasFx('ld'))drawFxBars(0,H);   // эффекты действуют на соло-канал; полосу прячем, если НИ ОДНА рука не назначена на fx
  }
  /* Заголовок роли на холсте убран: роль показывает и переключает кнопка instrBtn в верхней панели. */
  drawHandsPhone(res,W,H,playH);
  if(!videoRec)drawLooper();                  // при записи клипа полосу лупера (служебная накладка НА ХОЛСТЕ) прячем из кадра; сетка/руки/ярлыки/эффекты — это ИГРА, остаются
  drawStatus();                               // #status — HTML-элемент (не холст), в кадр клипа не попадает сам собой, как и кнопки
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
    ctx.fillText(DRUM_NAMES[idx], rx0+10, y+seg/2);
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
    for(let i=0;i<lm.length;i++){
      const x=sx(lm[i].x,W), y=sy(lm[i].y,H), tipPt=i===4||FINGER_TIPS.includes(i);   // точки в экранных пикселях игрового поля (поля кадра сняты); НЕ клампим — рука уходит за кромку вместе с картинкой
      ctx.fillStyle=tipPt?(S.pinch?base:'rgba(255,255,255,.65)'):'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.arc(x,y,tipPt?6:2.5,0,7); ctx.fill();
    }
    if(S.pinch&&S.zone==='oct'){                  // рука в октавной полосе (любая, в т.ч. левая): показываем регистр, эффектов НЕ трогаем
      ctx.fillStyle='#4cc2ff'; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(`${regWord().toUpperCase()} ${OCT_ROMAN[S.oct]}`, S.x+14, S.y-10);   // «ОКТ»/«ТРИТАВА» по периоду; period=2 → 'ОКТ' байт-в-байт
      continue;
    }
    if(fxHand){                                  // рука эффектов: подпись выбранного эффекта у кисти
      if(S.pinch&&S.adj){ const meta=FX_META.find(m=>m.k===S.adj.k);
        ctx.fillStyle=meta.color; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(`${meta.full} ${Math.round(fx[meta.k]*100)}%`, S.x+14, S.y-10); }
      continue;
    }
    // рука нот
    if(isCh&&!supportsChords())continue;         // макам: аккордов нет — ни круга, ни ярлыка, ни подсказки
    // рука-палитра нот не играет — не рисуем ей подсказку ряда. Вне сплита это ЛЕВАЯ рука (handRole,
    // фиксировано — swap убран); при сплите — по ЗОНЕ (щипок='chFam') или ПОЛОЖЕНИЮ (до щипка: указ. слева).
    if(isCh&&typedChords()&&(splitOn ? (S.pinch?S.zone==='chFam':sx(lm[8].x,W)<split) : handRole(k)==='fx'))continue;
    if(S.pinch&&!S.inert&&S.deg>=0){
      ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.globalAlpha=.9;
      ctx.beginPath(); ctx.arc(S.x,S.y,16+6*S.vol,0,7); ctx.stroke();
      ctx.globalAlpha=.25; ctx.beginPath(); ctx.arc(S.x,S.y,26+8*S.vol,0,7); ctx.stroke(); ctx.globalAlpha=1;
      const s=CUR();
      if((instr==='ld'||instr==='bs')&&S.fn==='therm'&&S.hz){
        /* Терменвокс (соло/бас): высота НЕПРЕРЫВНА — живые Гц и центы над тоникой РОЛИ. Опора центов —
           тоника соло (baseF) или баса (baseF/4), иначе бас показал бы −2400¢. «≈» — ближайшая нота. */
        const ref=instr==='bs'?baseF()/4:baseF(), cAbs=Math.round(1200*Math.log2(S.hz/ref));
        drawTag(S.x,S.y,[`≈ ${rectGrid()?rectNoteLbl(S.deg):gridNoteLbl(S.deg)} · глиссандо`,
          `${Math.round(S.hz)} Гц · ${Math.round(S.vol*100)}% · ${cAbs}c`],accent);
      }else if(instr==='ld'||instr==='bs'){
        /* rectGrid (соло/бас): S.oct — это НОТА в прямоугольнике, а не октава. Октава — липкий
           регистр РОЛИ (rectOctReg: соло→octReg, бас→bassOctReg); берём его, иначе Гц/«окт» врали бы. */
        const rectRole=(instr==='ld'||instr==='bs')&&rectGrid();
        const oShow=rectRole?rectOctReg(instr):S.oct;   // роль=instr (rectRole ⇒ 'ld'/'bs')
        const f=instr==='bs'?bassFreq(S.deg,oShow):leadFreq(S.deg,oShow);
        const L1=rectRole?`${rectNoteLbl(S.deg)} · ${regWord(s)} ${OCT_ROMAN[oShow]}`   // rect: порядковый номер, в лад с легендой/подсказкой
          :(s.edo>12&&s.tag==='edo')?`ступень ${IVX()[S.deg]%s.edo} · ${regWord(s)} ${OCT_ROMAN[oShow]}`:`${gridNoteLbl(S.deg)} · ${regWord(s)} ${OCT_ROMAN[oShow]}`;
        /* Центы показываем ВСЕГДА, на любом ладу (снят прежний гейт s.edo!==12). Исторические
           темперации (Пифагоров, оба Натуральных, мезотон, велл-темперации) — это edo:12 cents-лады:
           ИМЯ ноты одинаковое, а высота гуляет до ~21.5¢ (Пифагорова терция 408¢ vs Натуральная 386¢ на
           той же ступени) — без числа их не различить ни глазом, ни на короткой ноте ухом. Ровно там,
           где чтение нужнее всего, оно и пряталось. Чистый 12-TET теперь даёт круглые сотни (0/100/200…)
           — безвредно и держит ярлык на одном месте на всех ладах: единообразие важнее трёх сэкономленных
           символов. Формат и позиция прежние (Гц · % · центы), меняется только условие. */
        const L2=`${Math.round(f)} Гц · ${Math.round(S.vol*100)}% · ${centsOf(S.deg)}c`;
        const hold = S.fn==='hold' ? ' · держ.' : '';   // маркер удержания: нота держится, пока пальцы вместе
        drawTag(S.x,S.y,[L1+hold,L2],accent);
      }else if(isDr){
        drawTag(S.x,S.y,[DRUM_NAMES[S.deg]||'—',`${Math.round(S.vol*100)}%`],accent);
      }else if(typedChords()){                   // тип задаёт палитра — chordLabel дал бы «C5», это враньё
        const FS=chordFams(), fam=FS[Math.min(chordFam,FS.length-1)]||FS[0];
        const ty=fam.types[Math.min(chordVar,fam.types.length-1)];
        const oShow=rectGrid()?rectOctReg(instr):S.oct;   // rect-аккорды (19/31): октава из chordOctReg (роль=instr='ch'); chrom12: S.oct (палец)
        drawTag(S.x,S.y,[rootName(S.deg)+' '+(ty.label||''),   // у ярлыка есть ширина — пишем полное имя типа
          ty.full||fam.name,`${regWord(s)} ${OCT_ROMAN[oShow]} · ${Math.round(S.vol*100)}%`],accent);
      }else drawTag(S.x,S.y,[chordLabel(S.deg),chordNotesStr(S.deg),`${regWord(s)} ${OCT_ROMAN[S.oct]} · ${Math.round(S.vol*100)}%`],accent);
    }else if(!S.pinch){                          // подсказка до щипка — под указательным
      const tip=lm[8], x=sx(tip.x,W), y=sy(tip.y,H);   // подсказка до щипка — в экранных пикселях игрового поля (поля кадра сняты)
      if((instr==='ld'||instr==='bs'||instr==='ch')&&rectGrid()){
        /* rectGrid (соло/бас/аккорды): подсказка кадрирует ПОЛОСУ полной сетки под рукой (то же
           r=полоса−1, что и в игре). У аккордов рамка/подписи живут в правой половине [SPLIT,W]
           (слева палитра). Полоса 0 — октавная: показываем регистр роли; иначе 4 ноты/корня. */
        const nRfull=rectRowsFull(), band=degRaw(Math.min(y,playH-1),nRfull,playH), maxDeg=IVX().length-1;
        const [yTop,yBot]=rectBandY(band,playH,nRfull), hx0=instr==='ch'?split:rx0;
        ctx.strokeStyle=hexA(accent,.4); ctx.lineWidth=1.5; ctx.strokeRect(hx0,yTop,rx1-hx0,yBot-yTop);
        let lbl;
        if(band===0) lbl=`${periodOf()===2?'ОКТАВА':regWord().toUpperCase()} · палец I–IV → регистр (сейчас ${OCT_ROMAN[rectOctReg(instr)]})`;   // роль=instr
        else{ const r=band-1; lbl=''; for(let n=0;n<4;n++){ const deg=Math.min(r*4+n,maxDeg); lbl+=(n?'  ':'')+OCT_ROMAN[n]+':'+(instr==='ch'?rootName(deg):rectNoteLbl(deg)); } }
        ctx.fillStyle=hexA(accent,.8); ctx.font='600 12px system-ui'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        ctx.fillText(lbl,x+14,y-12);
      }else{
        const rows=isDr?DRUM_NAMES.length:IVX().length, d=degRaw(Math.min(y,playH-1),rows,playH), seg=playH/rows;
        /* У типизированных аккордов ряды живут ТОЛЬКО справа от палитры — рамка на всю
           ширину легла бы поверх ячеек и врала бы, что там играются ноты. */
        const hx0 = (isCh&&typedChords()) ? split : rx0;
        ctx.strokeStyle=hexA(accent,.4); ctx.lineWidth=1.5; ctx.strokeRect(hx0,(rows-1-d)*seg,rx1-hx0,seg);
        ctx.fillStyle=hexA(accent,.8); ctx.font='600 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        ctx.fillText(isDr?(DRUM_NAMES[d]||''):(isCh?(typedChords()?rootName(d):chordLabel(d)):gridNoteLbl(d)),x+14,y-12);
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
    ctx.fillText(fam.name, (cx0+cx1)/2, CH_PAL_HEAD_H/2);
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
      const lines=wrapLabel(fam.types[r].label||'—', bw-6), cy=(by+by+bh)/2;
      lines.forEach((L,i)=>ctx.fillText(L, bx+bw/2, cy+(i-(lines.length-1)/2)*11));
    }
  }
  /* Полное имя выбранного типа — одной строкой снизу, где есть вся ширина палитры.
     full есть только там, где короткий тег непонятен (31-TET). */
  const t=selF.types[selR], fullNm=t&&(t.full||t.label);
  if(fullNm){
    ctx.textAlign='center'; ctx.font='11px system-ui'; ctx.fillStyle=hexA(INSTR_COL.ch,.9);
    ctx.fillText(fullNm, (x0+x1)/2, H-CH_PAL_HEAD_H/2);
  }
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
}
function drawFxBars(rx0,H){                        // rx0 — левый край роли-соло (столбики от него); прежний 1-й арг W не использовался
  const items=[{v:revDisp,c:REV_COLOR,l:'REV',fxk:null},
    ...FX_META.map(m=>({v:fx[m.k],c:m.color,l:m.label,fxk:m.k}))];
  const y1=H-40, y0=y1-FX_BAR_MAX;                // низ слева: выше строки статуса, ниже коробки лупера
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  items.forEach((it,i)=>{
    const x=rx0+FX_X0+i*(FX_BAR_W+FX_BAR_GAP);
    let actv=false; for(const k in HANDS){ const S=HANDS[k];
      if(it.fxk&&S.pinch&&S.zone==='fx'&&S.adj&&S.adj.k===it.fxk)actv=true; }
    ctx.fillStyle='rgba(255,255,255,.09)'; ctx.fillRect(x,y0,FX_BAR_W,FX_BAR_MAX);      // трек
    const fh=FX_BAR_MAX*Math.max(0,Math.min(1,it.v));
    ctx.fillStyle=it.c; ctx.globalAlpha=actv?0.95:0.5;
    ctx.fillRect(x,y1-fh,FX_BAR_W,fh); ctx.globalAlpha=1;                                // заполнение снизу вверх
    if(actv){ ctx.strokeStyle=it.c; ctx.lineWidth=1.5; ctx.strokeRect(x-1.5,y0-1.5,FX_BAR_W+3,FX_BAR_MAX+3); }
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
  ctx.fillStyle=hexA(INSTR_COL.ch,.85); ctx.fillText('ЯРК',x+FX_BAR_W/2,y0-5);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
/* loopBarBottom — живая связка: нижний край холстовой полосы лупера (0, когда её нет).
   Экспортирована, чтобы позицию мог прочитать кто угодно, а не только draw. */
export { drawVideoBackground, drawOverlays, loopBarBottom };
