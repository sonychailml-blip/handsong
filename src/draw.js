import { ctx, canvas, video } from './vision.js';
import { HANDS, leadOwner, zoneAt, zoneX, degRaw, handRole } from './gestures.js';
import { CUR, IVX, chordLabel, rowLabel, chordNotesStr, leadFreq, bassFreq, centsOf, OCT_ROMAN, supportsChords, typedChords, CHORD_FAMS, rootName } from './scales.js';
import { fx, revDisp, latchDeg, latchTy, chordFam, uiMode, phoneInstr } from './state.js';
import { FXW, ZB, FX_META, REV_COLOR, FINGER_TIPS, FX_BAR_W, FX_BAR_GAP, FX_BAR_MAX, INSTR_COL } from './config.js';
import { DRUM_NAMES } from './audio.js';

import { recording, inPB, loop, events, loopPos, loopChordDeg } from './recorder.js';
 
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
function drawBar(x,w,yTop,yBot,val,color,label,active){
  const h=yBot-yTop;
  ctx.fillStyle='rgba(255,255,255,.07)'; ctx.fillRect(x,yTop,w,h);
  const fh=h*val;
  ctx.fillStyle=color; ctx.globalAlpha=active?0.95:0.55;
  ctx.fillRect(x,yBot-fh,w,fh); ctx.globalAlpha=1;
  if(active){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-1.5,yTop-1.5,w+3,h+3);}
  ctx.fillStyle=active?color:'rgba(255,255,255,.6)';
  ctx.font='11px system-ui'; ctx.textAlign='center';
  ctx.fillText(label,x+w/2,yBot+15);
  if(active)ctx.fillText(Math.round(val*100)+'%',x+w/2,yTop-8);
}
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
/* ================= ВИЗУАЛИЗАЦИЯ ЛУПЕРА =================
   Полоса-транспорт сверху-по-центру: сетка тактов/долей, бегунок позиции,
   по строке на слой с метками событий (соло — оранжевые, аккорды — сиреневые).
   Видна только когда есть петля или идёт запись; иначе не мешает синтезатору. */
function drawLooper(){
  if(!loop.on && !events.length){ syncLoopTransport(false,0); return; }   // нет петли — полоса прячется
  const W=canvas.width, info=loopPos();
  const bars=loop.bars, total=bars*4;
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
    const gx=x0+bw*b/total, bar=b%4===0;
    ctx.strokeStyle=bar?'rgba(255,255,255,.34)':'rgba(255,255,255,.11)'; ctx.lineWidth=bar?1.4:0.8;
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
  ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-W,0,W,H); ctx.restore();
  ctx.fillStyle='rgba(7,7,13,.5)'; ctx.fillRect(0,0,W,H);
}
function drawOverlays(res){ if(uiMode==='phone') drawPhone(res); else drawPC(res); }

/* Лад без лестницы аккордов (макам): поле остаётся НА МЕСТЕ, приглушается, и вместо
   лестницы объясняет, куда делись аккорды и где взять гармонию. Геометрия колонки —
   от FXW/ZB, от лада не зависит: раскладка при смене лада не перекраивается. */
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

function drawPC(res){
  const W=canvas.width, H=canvas.height;
  const fxX=FXW*W, zbX=ZB*W;
  // лёгкие подкраски зон
  ctx.fillStyle='rgba(177,140,255,.05)'; ctx.fillRect(fxX,0,zbX-fxX,H);
  ctx.fillStyle='rgba(255,158,44,.05)';  ctx.fillRect(zbX,0,W-zbX,H);
  // светящиеся границы зон
  for(const[bx,col]of[[fxX,'#4cc2ff'],[zbX,'#b18cff']]){
    ctx.strokeStyle=hexA(col,.12); ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx,H); ctx.stroke();
    ctx.strokeStyle=hexA(col,.55); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx,H); ctx.stroke();
  }
  // заголовки зон
  ctx.font='700 12px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.fillText('ЭФФЕКТЫ',fxX/2,52);
  ctx.fillText('АККОРДЫ',(fxX+zbX)/2,52);
  ctx.fillText('СОЛО',(zbX+W)/2,52);
 
  // активные ступени по зонам
  let ldAct=-1;
  for(const k in HANDS){ const S=HANDS[k];
    if(S.pinch&&S.deg>=0&&S.zone==='ld'&&leadOwner===k)ldAct=S.deg;
  }
  const chAct=latchDeg>=0?latchDeg:loopChordDeg();   // подсветка: рука в приоритете, иначе — аккорд петли (§Q5)
  // сетки: лестница аккордов и лестница нот — учебный слой
  if(supportsChords())drawGrid(fxX,zbX,'#b18cff',chordLabel,chAct);
  else drawNoChordsHint(fxX,zbX,0,H);            // макам: колонка на месте, но без лестницы
  drawGrid(zbX,W,'#ff9e2c',rowLabel,ldAct);
 
  // панель эффектов (левая колонка, вся высота)
  {
    const nB=5, gap=9, m=12;
    const bw=Math.min(40,(fxX-2*m-(nB-1)*gap)/nB);
    const total=nB*bw+(nB-1)*gap, bx0=(fxX-total)/2;
    const yTop=H*0.14, yBot=H*0.86;
    drawBar(bx0,bw,yTop,yBot,revDisp,REV_COLOR,'REV',false);
    FX_META.forEach((mt,i)=>{
      let act=false;
      for(const k in HANDS){const S=HANDS[k];
        if(S.pinch&&S.zone==='fx'&&S.adj&&S.adj.k===mt.k)act=true;}
      drawBar(bx0+(i+1)*(bw+gap),bw,yTop,yBot,fx[mt.k],mt.color,mt.label,act);
    });
    ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='11px system-ui'; ctx.textAlign='center';
    ctx.fillText('щипок = эффект · тяни ↑↓',fxX/2,yBot+30);
  }
 
  // руки: точки + «призрачная» подсказка + ярлыки
  if(res&&res.landmarks){
    for(const k in HANDS){
      const S=HANDS[k], lm=S.lm; if(!lm)continue;
      const zcol=S.zone==='ch'?'#b18cff':S.zone==='ld'?'#ff9e2c':'#4cc2ff';
      for(let i=0;i<lm.length;i++){
        const x=(1-lm[i].x)*W, y=lm[i].y*H;
        const tipPt=i===4||FINGER_TIPS.includes(i);
        let col='rgba(255,255,255,.45)';
        if(tipPt)col=S.pinch?zcol:'rgba(255,255,255,.65)';
        if(S.pinch&&S.zone==='fx'&&S.adj){
          const meta=FX_META.find(m=>m.k===S.adj.k);
          if(i===4||i===meta.finger)col=meta.color;
        }
        ctx.fillStyle=col;
        ctx.beginPath(); ctx.arc(x,y,tipPt?6:2.5,0,7); ctx.fill();
      }
      if(S.pinch&&!S.inert&&(S.zone==='ld'||(S.zone==='ch'&&supportsChords()))&&S.deg>=0){
        // светящийся круг вокруг точки щипка (инертная рука ничего не звучит — не рисуем)
        ctx.strokeStyle=zcol; ctx.lineWidth=2.5; ctx.globalAlpha=.9;
        ctx.beginPath(); ctx.arc(S.x,S.y,16+6*S.vol,0,7); ctx.stroke();
        ctx.globalAlpha=.25;
        ctx.beginPath(); ctx.arc(S.x,S.y,26+8*S.vol,0,7); ctx.stroke();
        ctx.globalAlpha=1;
        // парящий ярлык: нота/аккорд + частота + громкость (учебный слой)
        const s=CUR();
        if(S.zone==='ld'){
          const f=leadFreq(S.deg,S.oct);
          const L1=(s.edo>12&&s.tag==='edo')
            ? `ступень ${IVX()[S.deg]%s.edo} · окт ${OCT_ROMAN[S.oct]}`
            : `${rowLabel(S.deg)} · окт ${OCT_ROMAN[S.oct]}`;
          const L2=`${Math.round(f)} Гц · ${Math.round(S.vol*100)}%`+
                   (s.edo!==12?` · ${centsOf(S.deg)}c`:'');
          drawTag(S.x,S.y,[L1,L2],'#ff9e2c');
        }else{
          drawTag(S.x,S.y,[chordLabel(S.deg),chordNotesStr(S.deg),
            `окт ${OCT_ROMAN[S.oct]} · ${Math.round(S.vol*100)}%`],'#b18cff');
        }
      }else if(!S.pinch){
        // подсказка до щипка: что прозвучит под пальцем
        const tip=lm[8], x=(1-tip.x)*W, y=tip.y*H;
        const z=zoneAt(x,W);
        if(z==='ld'||(z==='ch'&&supportsChords())){
          const rows=IVX().length, d=degRaw(y,rows,H), seg=H/rows;
          const[zx0,zx1]=zoneX(z,W);
          const col=z==='ch'?'#b18cff':'#ff9e2c';
          ctx.strokeStyle=hexA(col,.4); ctx.lineWidth=1.5;
          ctx.strokeRect(zx0,(rows-1-d)*seg,zx1-zx0,seg);
          ctx.fillStyle=hexA(col,.75); ctx.font='600 13px system-ui'; ctx.textAlign='left';
          ctx.fillText(z==='ch'?chordLabel(d):rowLabel(d),x+14,y-12);
        }
      }
    }
  }
 
  drawLooper();                                // транспорт лупера (сверху по центру)
  drawStatus();
}
/* Статус-строка (учебный слой) — общая для обоих режимов. */
function drawStatus(){
  const s=CUR();
  let st=`Лад: ${s.name} · ${s.edo}-TET · ступени: ${s.iv.join('-')}`;
  if(s.edo!==12)st+=` · шаг ${(1200/s.edo).toFixed(1)}c`;
  if(recording)st='● запись · '+st;
  else if(inPB())st=`▶ петля · ${loop.bpm} BPM · `+st;
  statusEl.textContent=st;
  ctx.textAlign='left';
}

/* ================= PHONE-РЕЖИМ (вертикальный) =================
   Один инструмент на всю ширину (высотой до полосы эффектов), правая рука
   играет ноты, левая — эффекты в компактной полосе снизу. */
function drawPhone(res){
  const W=canvas.width, H=canvas.height;
  const instr=phoneInstr, accent=INSTR_COL[instr];
  /* Сетка снова во ВСЮ высоту: нижней полосы эффектов больше нет, столбики лежат
     поверх слева. Та же высота используется в gestures (degHyst) — не расходиться! */
  const playH=H;
  const labelX= instr==='ld' ? FX_BAND_R+8 : 7;   // у соло подписи правее столбиков эффектов
  if(instr==='dr'){
    drawDrumGrid(W,playH);
  }else{
    // активная ступень: аккорд — по защёлке, соло/бас — по играющей руке
    let act=-1;
    if(instr==='ch')act=latchDeg>=0?latchDeg:loopChordDeg();   // рука в приоритете, иначе аккорд петли (§Q5)
    else for(const k in HANDS){ const S=HANDS[k]; if(S.pinch&&S.deg>=0&&(S.zone==='ld'||S.zone==='bs'))act=S.deg; }
    if(instr==='ch'&&!supportsChords())drawNoChordsHint(0,W,0,playH);   // макам: всё поле роли — объяснение
    else{
      /* У типизированных аккордов ряд подписываем именем КОРНЯ (C, C#…): тип задаёт
         сектор, а не лад, поэтому обычный chordLabel (он дал бы пауэр-аккорд «C5») врёт. */
      const chTyped = instr==='ch' && typedChords();
      /* У типизированных подсветку ряда ГАСИМ (act=-1): её несёт подсветка сектора,
         иначе полоса во всю ширину противоречила бы точечной. */
      drawGrid(0,W,accent, instr==='ch'?(chTyped?rootName:chordLabel):rowLabel, chTyped?-1:act, playH, labelX);
      if(chTyped)drawChordSectors(W,playH);        // карта секторов + подсветка активного
    }
  }
  /* Заголовок роли на холсте убран: роль показывает и переключает кнопка instrBtn
     в верхней панели (дубль одной и той же информации в двух местах не нужен). */
  drawHandsPhone(res,W,H,playH);
  if(instr==='ld')drawFxBars(W,H);          // эффекты действуют только на соло-канал
  drawLooper();
  drawStatus();
}
/* Сетка ударных: по ряду на инструмент кита, без тоники/центов. */
function drawDrumGrid(W,playH){
  const rows=DRUM_NAMES.length, seg=playH/rows;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  for(let i=0;i<rows;i++){ const y=i*seg, idx=rows-1-i;
    ctx.fillStyle= i%2? 'rgba(255,210,63,.05)':'rgba(255,255,255,.03)'; ctx.fillRect(0,y,W,seg);
    ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    ctx.fillStyle='rgba(255,210,63,.85)'; ctx.font='600 14px system-ui';
    ctx.fillText(DRUM_NAMES[idx], 10, y+seg/2);
  }
}
function drawHandsPhone(res,W,H,playH){
  if(!res||!res.landmarks)return;
  const instr=phoneInstr, isCh=instr==='ch', isDr=instr==='dr', accent=INSTR_COL[instr], fxOn=instr==='ld';
  for(const k in HANDS){
    const S=HANDS[k], lm=S.lm; if(!lm)continue;
    const fxHand=fxOn&&handRole(k)==='fx', base=fxHand?'#4cc2ff':accent;   // рука эффектов есть только у соло
    for(let i=0;i<lm.length;i++){
      const x=(1-lm[i].x)*W, y=lm[i].y*H, tipPt=i===4||FINGER_TIPS.includes(i);
      ctx.fillStyle=tipPt?(S.pinch?base:'rgba(255,255,255,.65)'):'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.arc(x,y,tipPt?6:2.5,0,7); ctx.fill();
    }
    if(fxHand){                                  // рука эффектов: подпись выбранного эффекта у кисти
      if(S.pinch&&S.adj){ const meta=FX_META.find(m=>m.k===S.adj.k);
        ctx.fillStyle=meta.color; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(`${meta.full} ${Math.round(fx[meta.k]*100)}%`, S.x+14, S.y-10); }
      continue;
    }
    // рука нот
    if(isCh&&!supportsChords())continue;         // макам: аккордов нет — ни круга, ни ярлыка, ни подсказки
    if(isCh&&typedChords()&&handRole(k)==='fx')continue;   // рука-семейство нот не играет — не рисуем ей подсказку ряда
    if(S.pinch&&!S.inert&&S.deg>=0){
      ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.globalAlpha=.9;
      ctx.beginPath(); ctx.arc(S.x,S.y,16+6*S.vol,0,7); ctx.stroke();
      ctx.globalAlpha=.25; ctx.beginPath(); ctx.arc(S.x,S.y,26+8*S.vol,0,7); ctx.stroke(); ctx.globalAlpha=1;
      const s=CUR();
      if(instr==='ld'||instr==='bs'){
        const f=instr==='bs'?bassFreq(S.deg,S.oct):leadFreq(S.deg,S.oct);
        const L1=(s.edo>12&&s.tag==='edo')?`ступень ${IVX()[S.deg]%s.edo} · окт ${OCT_ROMAN[S.oct]}`:`${rowLabel(S.deg)} · окт ${OCT_ROMAN[S.oct]}`;
        const L2=`${Math.round(f)} Гц · ${Math.round(S.vol*100)}%`+(s.edo!==12?` · ${centsOf(S.deg)}c`:'');
        drawTag(S.x,S.y,[L1,L2],accent);
      }else if(isDr){
        drawTag(S.x,S.y,[DRUM_NAMES[S.deg]||'—',`${Math.round(S.vol*100)}%`],accent);
      }else if(typedChords()){                   // тип задаёт сектор — chordLabel дал бы «C5», это враньё
        const fam=CHORD_FAMS[chordFam]||CHORD_FAMS[0];
        const ty=fam.types[Math.min(S.sect==null?0:S.sect,fam.types.length-1)];
        drawTag(S.x,S.y,[rootName(S.deg)+ty.label,`${fam.name} · окт ${OCT_ROMAN[S.oct]}`],accent);
      }else drawTag(S.x,S.y,[chordLabel(S.deg),chordNotesStr(S.deg),`окт ${OCT_ROMAN[S.oct]} · ${Math.round(S.vol*100)}%`],accent);
    }else if(!S.pinch){                          // подсказка до щипка — ряд под указательным на всю ширину
      const tip=lm[8], x=(1-tip.x)*W, y=tip.y*H;
      const rows=isDr?DRUM_NAMES.length:IVX().length, d=degRaw(Math.min(y,playH-1),rows,playH), seg=playH/rows;
      ctx.strokeStyle=hexA(accent,.4); ctx.lineWidth=1.5; ctx.strokeRect(0,(rows-1-d)*seg,W,seg);
      ctx.fillStyle=hexA(accent,.8); ctx.font='600 13px system-ui'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillText(isDr?(DRUM_NAMES[d]||''):(isCh?(typedChords()?rootName(d):chordLabel(d)):rowLabel(d)),x+14,y-12);
    }
  }
}
/* Компактная полоса эффектов снизу: REV (глубина соло-руки) + 4 эффекта. */
/* Эффекты соло: тонкие вертикальные столбики СЛЕВА, поверх сетки — поле под ними
   играбельно. Высота = величина эффекта, но с потолком FX_BAR_MAX: короткие и
   неброские, а не во весь экран. Проценты у пальца рисует drawHandsPhone — здесь
   только полоски. Полупрозрачны, пока эффект не крутят. */
/* Типизированные аккорды (Хроматика): ряд корня делится на вертикальные СЕКТОРЫ —
   по одному на вариант семейства. Активный сектор подсвечен, каждый подписан готовым
   именем аккорда (C · Cmaj7 · C7). Плюс индикатор семейства: оно ЛИПКОЕ, поэтому
   должно быть видно, что сейчас выбрано, даже когда левой руки нет в кадре. */
const SECT_LABEL_MIN_ROW=44;   // ниже этой высоты ряда подписи карты не влезают — рисуем только разделители
function drawChordSectors(W,H){
  const fam=CHORD_FAMS[chordFam]||CHORD_FAMS[0], nS=fam.types.length;
  const rows=IVX().length, seg=H/rows, sw=W/nS;

  /* КАРТА: все ряды сразу разбиты на секторы и подписаны — пользователь видит,
     что где лежит, ДО касания. 12 рядов × 3 сектора: по ширине просторно
     (~127px на сектор), тесно по высоте — поэтому на низких рядах (альбомная
     ориентация) подписи снимаем и оставляем только разделители: читаемо или никак. */
  const withLabels = seg>=SECT_LABEL_MIN_ROW;
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='10px system-ui';
  ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1;
  for(let r=0;r<rows;r++){
    const y=r*seg, d=rows-1-r;
    for(let i=1;i<nS;i++){                       // разделители секторов внутри ряда
      const x=i*sw; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+seg); ctx.stroke();
    }
    if(!withLabels)continue;
    ctx.fillStyle='rgba(255,255,255,.38)';
    for(let i=0;i<nS;i++)ctx.fillText(rootName(d)+fam.types[i].label, i*sw+sw/2, y+seg/2);
  }

  /* АКТИВНЫЙ сектор: рука в приоритете, иначе — защёлкнутый (deg+ty), чтобы после
     отпускания было видно, что именно звучит. Подсветка на СЕКТОР, не на весь ряд. */
  let deg=-1, sect=-1;
  for(const k in HANDS){ const S=HANDS[k];
    if(S.zone==='ch'&&S.pinch&&!S.inert&&S.deg>=0){ deg=S.deg; sect=S.sect==null?-1:S.sect; } }
  if(deg<0&&latchDeg>=0){ deg=latchDeg; sect=fam.types.findIndex(t=>t.iv===latchTy); }
  if(deg>=0&&sect>=0){
    const y=(rows-1-deg)*seg, x=sect*sw;
    ctx.fillStyle=hexA(INSTR_COL.ch,.30); ctx.fillRect(x,y,sw,seg);
    ctx.strokeStyle=INSTR_COL.ch; ctx.lineWidth=2; ctx.strokeRect(x+1,y+1,sw-2,seg-2);
    ctx.fillStyle='#fff'; ctx.font='700 15px system-ui';
    ctx.fillText(rootName(deg)+fam.types[sect].label, x+sw/2, y+seg/2);
  }

  // индикатор семейства — всегда, даже когда левой руки нет в кадре (оно липкое)
  ctx.textAlign='left'; ctx.font='700 12px system-ui'; ctx.fillStyle=hexA(INSTR_COL.ch,.9);
  ctx.fillText(`Семейство: ${fam.name}  (${fam.finger===0?'указательный':'средний'})`, 12, 22);
  ctx.textBaseline='alphabetic';
}
function drawFxBars(W,H){
  const items=[{v:revDisp,c:REV_COLOR,l:'REV',fxk:null},
    ...FX_META.map(m=>({v:fx[m.k],c:m.color,l:m.label,fxk:m.k}))];
  const y1=H-40, y0=y1-FX_BAR_MAX;                // низ слева: выше строки статуса, ниже коробки лупера
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font='11px system-ui';
  items.forEach((it,i)=>{
    const x=FX_X0+i*(FX_BAR_W+FX_BAR_GAP);
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
 
/* loopBarBottom — живая связка: нижний край холстовой полосы лупера (0, когда её нет).
   Экспортирована, чтобы позицию мог прочитать кто угодно, а не только draw. */
export { drawVideoBackground, drawOverlays, loopBarBottom };
