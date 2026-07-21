import { FXW, ZB, FINGER_TIPS, FX_META, PINCH_ON, PINCH_HOLD, PINCH_OFF, REV_NEAR, REV_RANGE, ROW_HYST, WATCHDOG_MS,
         CH_PAL_W, CH_PAL_PAD, CH_PAL_HEAD_H, PAL_HYST_X, PAL_HYST_Y } from './config.js';
import { fx, setRevDisp, leadIdx, chIdx, bassIdx, latchDeg, setLatchDeg, latchTy, setLatchTy, chordFam, setChordFam, chordVar, setChordVar, uiMode, phoneInstr, swapHands, rectOctReg, setRectOctReg, theremin } from './state.js';
import { IVX, supportsChords, typedChords, chordFams, rectGrid, rectRows, rectRowsFull, thereminHz } from './scales.js';
import { WleadOn, WleadOff, WchOn, WchSet, WchOff, WbassOn, WbassOff, WdrumHit } from './recorder.js';
import { chordHold, DRUM_ROWS } from './audio.js';
import { canvas } from './vision.js';
 
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
let latchLen=0;   // сколько нот звучит у 'latch': по нему решаем «глиссандо или переатака»
const zoneAt=(x,W)=> x<FXW*W?'fx' : x<ZB*W?'ch':'ld';
const zoneX =(z,W)=> z==='ch'?[FXW*W,ZB*W]:[ZB*W,W];
/* phone-режим: роль руки по handedness, а не по X. Правая=ноты, левая=эффекты
   (swapHands меняет местами). Без метки руки — играем ноты. */
function handRole(key){
  if(key.slice(0,4)==='Left')  return swapHands?'notes':'fx';
  if(key.slice(0,5)==='Right') return swapHands?'fx':'notes';
  return 'notes';
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
function endPinch(key,S){
  if(S.pinch){
    if(S.zone==='ld'&&leadOwner===key){ WleadOff(); leadOwner=null; }
    if(S.zone==='bs'&&bassOwner===key){ WbassOff(); bassOwner=null; }
    // 'ch': WchOff НЕ зовём — защёлкнутый аккорд продолжает звучать; лишь отпускаем руль
    if(S.zone==='ch'&&chOwner===key)chOwner=null;
  }
  S.pinch=false; S.adj=null; S.deg=-1; S.rect=null;   // S.rect — гистерезис прямоугольника, как S.pc/S.pr у палитры
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
      S.pc=null; S.pr=null;                  // память гистерезиса палитры — на руке: новый щипок начинает с чистого листа
      S.rect=null;                           // память гистерезиса прямоугольника — тоже на руке, тем же приёмом
      if(uiMode==='phone'){
        /* Рука-«не-нотная» (handRole==='fx', по умолчанию ЛЕВАЯ) получает особую роль
           только там, где она есть: эффекты у соло, выбор семейства у типизированных
           аккордов. Гейт из трёх условий, самое узкое — лад: typedChords стоит ровно
           на одном ладу из 19. Прочие лады/роли/ПК идут прежним путём. */
        /* Октавный прямоугольник (нижняя полоса rect-соло): ПОЛОЖЕНИЕ важнее роли. Считаем
           полосу по точке щипка при захвате (зона фиксируется, как и все прочие) — попал в
           полосу 0 → зона 'oct', даже если это fx-рука (левая): тянуться вниз за октавой
           нельзя ценой случайного эффекта. Стоит ПЕРВЫМ в тернаре, поэтому перебивает fx/ld. */
        const rectRole = (phoneInstr==='ld'||phoneInstr==='bs'||phoneInstr==='ch') && rectGrid();   // rect-раскладка: соло, бас И аккорды
        const py=(lm[4].y+lm[mf].y)/2*H;
        const px=(1-(lm[4].x+lm[mf].x)/2)*W;
        /* У аккордов октавная полоса живёт ТОЛЬКО в правой половине [SPLIT,W]: левая рука-палитра,
           дотянувшись до низа-слева, не должна перехватываться как октава — она выбирает тип.
           Соло/бас — октава по всей ширине (тест px пропускаем для не-'ch'). */
        const octRight = phoneInstr!=='ch' || px>=CH_PAL_W*W;
        const octBand = rectRole && octRight && degRaw(Math.min(py,H-1),rectRowsFull(),H)===0;
        const famHand = phoneInstr==='ch' && typedChords() && handRole(key)==='fx';
        S.zone = octBand ? 'oct'
               : famHand ? 'chFam'
               : (phoneInstr==='ld'&&handRole(key)==='fx') ? 'fx'
               : phoneInstr;
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
      }else if(S.zone==='chFam'){
        /* Рука-ПАЛИТРА: ТОЛЬКО выбирает ячейку (семейство+вариант) ПОЛОЖЕНИЕМ и молчит.
           Ветка стоит рядом с 'fx', ДО общего блока — поэтому не считает ни ступень, ни
           громкость, не берёт chOwner и не доходит до защёлки: левая рука нот не играет.
           Два гейта, оба оставляют выбор ЛИПКИМ (ничего не трогаем):
             1. только большой+УКАЗАТЕЛЬНЫЙ (S.oct===0) — щипок средним/безымянным/мизинцем
                на этой руке ничего не выбирает: палец здесь смысла не несёт, а случайный
                щипок не должен сбивать заготовленную форму;
             2. только внутри палитры (S.x < SPLIT) — рука, ушедшая в зону нот, молчит.
           Ведение непрерывное, пока щипок держат: можно дотянуть до соседней ячейки. */
        const SPLIT=CH_PAL_W*W;
        if(S.oct===0 && S.x<SPLIT){
          const x0=CH_PAL_PAD, x1=SPLIT-CH_PAL_PAD, y0=CH_PAL_HEAD_H, y1=H-CH_PAL_HEAD_H;
          const [c,r]=cellHyst(clamp(S.x,x0,x1),clamp(S.y,y0,y1),x0,x1,y0,y1,chordFams(),
                               S.pc==null?-1:S.pc, S.pr==null?-1:S.pr);
          S.pc=c; S.pr=r;
          if(c!==chordFam)setChordFam(c);
          if(r!==chordVar)setChordVar(r);
        }
      }else if(S.zone==='oct'){
        /* Октавная полоса: рука МОЛЧИТ (как палитра/эффекты) — ни ступени, ни громкости,
           ни владельца. Палец I–IV задаёт липкий регистр РОЛИ (соло→octReg, бас→bassOctReg
           через резолвер); смена пальца на лету (S.oct обновился выше) двигает регистр.
           S.oct здесь — «какой палец», как везде. */
        setRectOctReg(S.oct);
      }else{
        const phone=uiMode==='phone';
        /* Сетка «4 ноты в прямоугольнике» — phone-соло, бас И аккорды на ладу с rectGrid (19/31-TET).
           Y выбирает ПОЛОСУ полной сетки; полоса 0 — октавная (её перехватывает зона 'oct'),
           нотный прямоугольник = полоса−1. Палец S.oct (0=указ.=низ … 3=мизинец=верх) — ноту/корень
           ВНУТРИ прямоугольника; октава — липкий регистр роли (rectOctReg). ступень = прямоуг*4
           + нота, кламп в 0..IVX-1 (верх.мизинец = тоника октавой выше). S.oct тут читается как
           «нота в прямоугольнике» — переосмысление ЛОКАЛЬНОЕ, в прочих местах S.oct по-прежнему октава.
           У аккордов это КОРЕНЬ; тип берётся из палитры отдельно, октава — chordOctReg. */
        const rectPlay = phone && (S.zone==='ld'||S.zone==='bs'||S.zone==='ch') && rectGrid();
        const thereminOn = phone && S.zone==='ld' && theremin;   // терменвокс — ТОЛЬКО phone-соло
        const oct = rectPlay?rectOctReg():S.oct;                 // октавный регистр роли (WleadOn/бас/терменвокс)
        if(thereminOn){
          /* Непрерывная высота: y → Гц через общий раздел (thereminHz), интерполяция в центах
             между реальными нотами лада. S.deg — ближайшая ступень (для подсветки И записи в лупер:
             формат события не меняется), S.hz — живые Гц в звук. Палец ноту НЕ выбирает. */
          const th=thereminHz(y,H,oct); S.deg=th.deg; S.hz=th.hz;
        }else if(rectPlay){
          S.rect=degHyst(y,rectRowsFull(),H,S.rect==null?-1:S.rect);   // полоса полной сетки
          const r=clamp(S.rect-1,0,rectRows()-1);                       // нотный прямоугольник = полоса−1 (низ → прямоуг.0, без мёртвой зоны)
          S.deg=clamp(r*4+S.oct, 0, IVX().length-1);
        }else{
          const rows= S.zone==='dr' ? DRUM_ROWS : IVX().length;
          S.deg=degHyst(y,rows,H,S.deg);            // вся высота — ровно так же, как рисует draw
        }
        /* Типизированный аккорд в phone: левые CH_PAL_W заняты палитрой, поэтому громкость
           мерится по ПРАВОЙ зоне [SPLIT,W] — иначе вся половина экрана читалась бы «тихо».
           Остальные роли (соло/бас/ударные/обычные аккорды) — по всей ширине, как было. */
        const typed = S.zone==='ch'&&typedChords();
        const[zx0,zx1]= !phone ? zoneX(S.zone,W) : (typed ? [CH_PAL_W*W,W] : [0,W]);
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
        const chOct = rectPlay?rectOctReg():S.oct;
        if(S.zone==='ld'){
          if(leadOwner===key){
            const hs=emaS(S,'hs',dist(lm[0],lm[9]),0.15);
            S.rev=clamp01((REV_NEAR-hs)/REV_RANGE); setRevDisp(S.rev);
            WleadOn({deg:S.deg,oct,vol:S.vol,rev:S.rev,   // ступень+октава, не частота: запись = намерение; rectGrid — октава из липкого регистра роли
                     vib:fx.vib,drv:fx.drv,trm:fx.trm,dly:fx.dly,inst:leadIdx}, thereminOn?S.hz:null);   // 2-й арг — ЖИВОЙ override Гц (терменвокс), в запись не идёт
          }
        }else if(S.zone==='bs'){                            // бас: моно-голос, ведётся как соло
          if(bassOwner===key)WbassOn({deg:S.deg,oct:rectPlay?rectOctReg():S.oct,vol:S.vol,inst:bassIdx});   // rect-бас — октава из bassOctReg; 12-TET бас — S.oct (палец), как было

        }else if(S.zone==='dr'){                            // ударные: один удар на щипок (по ряду)
          if(S.fresh){ S.fresh=false; WdrumHit(S.deg,S.vol); }
        }else if(!supportsChords()){
          /* Макам: лестницы аккордов нет — щипок в поле аккордов не строит ничего.
             Гейт стоит ЗДЕСЬ, после разбора зоны: рука жива (зона, ступень, громкость
             посчитаны — их читает draw для подсказки), молчит только аккордовая ветка.
             Соло/бас/ударные — соседние ветки выше, их это не касается; дрон живёт
             в лупере (ENG.drone), не в руке. Переигровка идёт мимо — по замороженному sc. */
        }else{ // 'ch' — колонка аккордов: защёлка (владелец голосов — постоянный ключ 'latch')
          if(S.inert){
            // стоп-щипок отработал: рука молчит до размыкания пальцев
          }else if(S.fresh){
            S.fresh=false;                        // решение принимается один раз за щипок
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
              if(latchDeg<0||(ty&&ty.length!==latchLen))WchOn('latch',S.deg,chOct,S.vol,chIdx,ty);
              else WchSet('latch',S.deg,chOct,S.vol,ty);              // та же плотность → глиссандо без переатаки
              latchLen=ty?ty.length:0;
              setLatchDeg(S.deg); setLatchTy(ty); chOwner=key;        // рулит последний щипнувший
            }
          }else if(chOwner===key&&latchDeg>=0){
            if(ty&&ty.length!==latchLen){ WchOn('latch',S.deg,chOct,S.vol,chIdx,ty); latchLen=ty.length; }
            else WchSet('latch',S.deg,chOct,S.vol,ty);   // ведение: Y=корень (rect) или ступень, X=громкость
            setLatchDeg(S.deg); setLatchTy(ty);          // тип ведём вместе со ступенью — иначе сравнение протухнет
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
