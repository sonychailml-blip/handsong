import { FXW, ZB, FINGER_TIPS, FX_META, PINCH_ON, PINCH_HOLD, PINCH_OFF, REV_NEAR, REV_RANGE, ROW_HYST, WATCHDOG_MS, FX_STRIP_H } from './config.js';
import { fx, setRevDisp, leadIdx, chIdx, bassIdx, latchDeg, setLatchDeg, uiMode, phoneInstr, swapHands } from './state.js';
import { IVX } from './scales.js';
import { WleadOn, WleadOff, WchOn, WchSet, WchOff, WbassOn, WbassOff, WdrumHit } from './recorder.js';
import { chordHold, DRUM_ROWS } from './audio.js';
import { canvas } from './vision.js';
 
const clamp01=v=>Math.max(0,Math.min(1,v));
 
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
 
/* ================= ОБРАБОТКА РУК =================
   ПАРСИНГ MEDIAPIPE: result.landmarks — массив рук; в каждой 21 точка
   с нормированными координатами (x,y ∈ 0..1, origin слева-сверху КАДРА).
   Видео зеркалим, поэтому экранный x = (1 − lm.x) · W, y = lm.y · H.
   Ключевые точки: 4 — кончик большого, 8/12/16/20 — кончики пальцев,
   0 — запястье, 9 — основание среднего (по паре 0–9 меряем «глубину» Z:
   видимый размер кисти стабильнее, чем сырая z-координата модели).
   result.handednesses[i][0].categoryName ('Left'/'Right') — стабильный
   ключ руки между кадрами: у каждой руки свой независимый автомат щипка. */
const HANDS={}; let leadOwner=null; let chOwner=null; let bassOwner=null;   // chOwner — рука защёлки, bassOwner — рука баса
const zoneAt=(x,W)=> x<FXW*W?'fx' : x<ZB*W?'ch':'ld';
const zoneX =(z,W)=> z==='ch'?[FXW*W,ZB*W]:[ZB*W,W];
/* phone-режим: роль руки по handedness, а не по X. Правая=ноты, левая=эффекты
   (swapHands меняет местами). Без метки руки — играем ноты. */
function handRole(key){
  if(key.slice(0,4)==='Left')  return swapHands?'notes':'fx';
  if(key.slice(0,5)==='Right') return swapHands?'fx':'notes';
  return 'notes';
}
const playHeight=H=> (uiMode==='phone'&&phoneInstr==='ld') ? Math.max(1,H-FX_STRIP_H) : H;   // полоса эффектов (и её отступ) только у соло
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
function endPinch(key,S){
  if(S.pinch){
    if(S.zone==='ld'&&leadOwner===key){ WleadOff(); leadOwner=null; }
    if(S.zone==='bs'&&bassOwner===key){ WbassOff(); bassOwner=null; }
    // 'ch': WchOff НЕ зовём — защёлкнутый аккорд продолжает звучать; лишь отпускаем руль
    if(S.zone==='ch'&&chOwner===key)chOwner=null;
  }
  S.pinch=false; S.adj=null; S.deg=-1;
  S.inert=false; S.fresh=false;                // размыкание снимает инертность
}
function processHands(res){
  const W=canvas.width, H=canvas.height, now=performance.now();
  const seen=new Set();
  const hands=(res&&res.landmarks)?res.landmarks:[];
  const heads=(res&&(res.handednesses||res.handedness))||[];
 
  for(let i=0;i<hands.length;i++){
    const lm=hands[i];
    let key=(heads[i]&&heads[i][0]&&heads[i][0].categoryName)||('H'+i);
    if(seen.has(key))key+=i;
    seen.add(key);
    const S=HANDS[key]||(HANDS[key]={pinch:false,deg:-1,oct:0,zone:null,vol:.6,rev:0,adj:null,sm:{},inert:false,fresh:false});
    S.seen=now; S.lm=lm;
 
    const r=pinchRatios(lm), [mf,mv]=minFinger(r);
 
    if(!S.pinch&&mv<PINCH_ON){
      /* Захват щипка: палец задаёт октаву, а ЗОНА фиксируется по точке
         щипка и не меняется до отпускания — двигая руку по X ради
         громкости, нельзя случайно перескочить в соседнюю колонку. */
      S.pinch=true; S.oct=FINGER_TIPS.indexOf(mf); S.deg=-1; S.sm={};
      if(uiMode==='phone'){
        S.zone = (phoneInstr==='ld'&&handRole(key)==='fx') ? 'fx' : phoneInstr;   // эффекты только у соло; у прочих инструментов обе руки играют ноты
      }else{
        const px=(1-(lm[4].x+lm[mf].x)/2)*W;
        S.zone=zoneAt(px,W);
      }
      if(S.zone==='fx'){
        const meta=FX_META.find(m=>m.finger===mf);
        S.adj={k:meta.k,y0:lm[4].y*H,base:fx[meta.k]};
      }else if(S.zone==='ld'){
        leadOwner=key;                       // приоритет последней ноты
      }else if(S.zone==='bs'){
        bassOwner=key;                       // бас моно — рулит последняя рука
      }else if(S.zone==='ch'){
        S.fresh=true;                        // решение о защёлке примем этот кадр, когда посчитаем ступень
      }else if(S.zone==='dr'){
        S.fresh=true;                        // удар сработает этот кадр по ряду
      }
    }else if(S.pinch){
      if(mv>PINCH_OFF){ endPinch(key,S); }
      else if(mv<PINCH_HOLD&&FINGER_TIPS.indexOf(mf)!==S.oct){
        S.oct=FINGER_TIPS.indexOf(mf);       // смена пальца = смена октавы на лету
        if(S.zone==='fx'&&S.adj){
          const meta=FX_META.find(m=>m.finger===mf);
          S.adj={k:meta.k,y0:lm[4].y*H,base:fx[meta.k]};
        }
      }
    }
 
    if(S.pinch){
      /* Высота и громкость читаются с кончика ТОГО пальца, который
         зажат с большим (S.oct) — переключил палец, слежение мгновенно
         перешло на него. */
      const tip=lm[FINGER_TIPS[S.oct]];
      const x=emaS(S,'x',(1-tip.x)*W,0.4);
      const y=emaS(S,'y',tip.y*H,0.4);
      S.x=x; S.y=y;
 
      if(S.zone==='fx'){
        /* Регулировка относительная («от текущего»), диапазон — 70%
           высоты экрана; значение остаётся после отпускания (латч). */
        if(S.adj)fx[S.adj.k]=clamp01(S.adj.base+(S.adj.y0-lm[4].y*H)/(H*0.7));
      }else{
        const rows= S.zone==='dr' ? DRUM_ROWS : IVX().length, phone=uiMode==='phone';
        S.deg=degHyst(y,rows,playHeight(H),S.deg);
        const[zx0,zx1]= phone ? [0,W] : zoneX(S.zone,W);   // phone: громкость по всей ширине
        S.vol=0.2+0.8*clamp01((x-zx0)/(zx1-zx0));
        if(S.zone==='ld'){
          if(leadOwner===key){
            const hs=emaS(S,'hs',dist(lm[0],lm[9]),0.15);
            S.rev=clamp01((REV_NEAR-hs)/REV_RANGE); setRevDisp(S.rev);
            WleadOn({deg:S.deg,oct:S.oct,vol:S.vol,rev:S.rev,   // ступень+октава, не частота: запись = намерение
                     vib:fx.vib,drv:fx.drv,trm:fx.trm,dly:fx.dly,inst:leadIdx});
          }
        }else if(S.zone==='bs'){                            // бас: моно-голос, ведётся как соло
          if(bassOwner===key)WbassOn({deg:S.deg,oct:S.oct,vol:S.vol,inst:bassIdx});
        }else if(S.zone==='dr'){                            // ударные: один удар на щипок (по ряду)
          if(S.fresh){ S.fresh=false; WdrumHit(S.deg,S.vol); }
        }else{ // 'ch' — колонка аккордов: защёлка (владелец голосов — постоянный ключ 'latch')
          if(S.inert){
            // стоп-щипок отработал: рука молчит до размыкания пальцев
          }else if(S.fresh){
            S.fresh=false;                        // решение принимается один раз за щипок
            if(latchDeg>=0&&S.deg===latchDeg){
              WchOff('latch'); setLatchDeg(-1); chOwner=null; S.inert=true;   // та же ступень → выключаем, рука инертна
            }else{
              if(latchDeg<0)WchOn('latch',S.deg,S.oct,S.vol,chIdx);   // тишина → новый аккорд с атакой
              else WchSet('latch',S.deg,S.oct,S.vol);                 // другая ступень → глиссандо без переатаки
              setLatchDeg(S.deg); chOwner=key;                        // рулит последний щипнувший
            }
          }else if(chOwner===key&&latchDeg>=0){
            WchSet('latch',S.deg,S.oct,S.vol); setLatchDeg(S.deg);  // ведение: Y=ступень (глиссандо), X=громкость
          }else if(chOwner===key){
            chOwner=null;                         // латч сброшен извне (тоника/лад/паника) — отпускаем руль
          }
        }
      }
    }
  }
  /* Watchdog: рука пропала из кадра во время щипка → принудительный
     release через 120 мс (короткая пауза прощает мигание трекинга). */
  for(const k of Object.keys(HANDS)){
    const S=HANDS[k];
    if(!seen.has(k)&&now-S.seen>WATCHDOG_MS){ endPinch(k,S); delete HANDS[k]; }
  }
  if(leadOwner&&!HANDS[leadOwner])leadOwner=null;
  if(bassOwner&&!HANDS[bassOwner]){ WbassOff(); bassOwner=null; }
}

/* Экспорт: HANDS/leadOwner — живые связки (их читает draw). */
export { HANDS, leadOwner, processHands, zoneAt, zoneX, degRaw, handRole };
