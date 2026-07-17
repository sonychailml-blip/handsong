import { ctx, canvas, video } from './vision.js';
import { HANDS, leadOwner, zoneAt, zoneX, degRaw } from './gestures.js';
import { CUR, IVX, chordLabel, rowLabel, chordNotesStr, leadFreq, centsOf, OCT_ROMAN } from './scales.js';
import { fx, revDisp, latchDeg } from './state.js';
import { FXW, ZB, FX_META, REV_COLOR, FINGER_TIPS } from './config.js';
import { back, STYLE_LABEL } from './backing.js';
import { recording, inPB } from './recorder.js';
 
/* statusEl — свой lookup: draw пишет статус-строку (презентационный слой, §0.5). */
const statusEl=document.getElementById('status');
 
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
function drawGrid(zx0,zx1,accent,labelOf,activeDeg){
  const s=CUR(), ivx=IVX(), rows=ivx.length, seg=canvas.height/rows;
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
      ctx.fillText(labelOf(deg),zx0+7,y+seg/2);
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
function draw(res){
  const W=canvas.width, H=canvas.height;
  ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-W,0,W,H); ctx.restore();
  ctx.fillStyle='rgba(7,7,13,.5)'; ctx.fillRect(0,0,W,H);
 
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
  const chAct=latchDeg;                        // подсветка аккорда — по защёлкнутой ступени, горит и без щипка
  // сетки: лестница аккордов и лестница нот — учебный слой
  drawGrid(fxX,zbX,'#b18cff',chordLabel,chAct);
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
      if(S.pinch&&!S.inert&&(S.zone==='ch'||S.zone==='ld')&&S.deg>=0){
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
        if(z==='ch'||z==='ld'){
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
 
  // статус: формула лада — всегда на виду (учебный слой)
  const s=CUR();
  let st=`Лад: ${s.name} · ${s.edo}-TET · ступени: ${s.iv.join('-')}`;
  if(s.edo!==12)st+=` · шаг ${(1200/s.edo).toFixed(1)}c`;
  if(back.playing)st=`▶ ${STYLE_LABEL[back.eff]} ${back.bpm} BPM · `+st;
  if(recording)st='● запись · '+st;
  if(inPB())st='▶ воспроизведение · '+st;
  statusEl.textContent=st;
  ctx.textAlign='left';
}
 
export { draw };
