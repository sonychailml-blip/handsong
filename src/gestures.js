import { FINGER_TIPS, FX_META, PINCH_ON, PINCH_HOLD, PINCH_OFF, REV_NEAR, REV_RANGE, ROW_HYST, WATCHDOG_MS,
         CH_PAL_PAD, CH_PAL_HEAD_H, PAL_HYST_X, PAL_HYST_Y, palSplitX } from './config.js';
import { fx, setRevDisp, leadIdx, chIdx, bassIdx, latchDeg, setLatchDeg, latchTy, setLatchTy, chordFam, setChordFam, chordVar, setChordVar, phoneInstr, swapHands, rectOctReg, setRectOctReg, theremin, splitOn, phoneHalves, flipX } from './state.js';
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
   Экранный x = flipX(lm.x) · W (ЕДИНЫЙ источник зеркала — state.flipX: фронт-камеру зеркалим,
   тыловую нет), y = lm.y · H (по вертикали фронт/тыл одинаковы).
   Ключевые точки: 4 — кончик большого, 8/12/16/20 — кончики пальцев,
   0 — запястье, 9 — основание среднего (по паре 0–9 меряем «глубину» Z:
   видимый размер кисти стабильнее, чем сырая z-координата модели).
   result.handednesses[i][0].categoryName ('Left'/'Right') — стабильный
   ключ руки между кадрами: у каждой руки свой независимый автомат щипка. */
const HANDS={}; let leadOwner=null; let chOwner=null; let bassOwner=null;   // chOwner — рука защёлки, bassOwner — рука баса
let latchLen=0;   // сколько нот звучит у 'latch': по нему решаем «глиссандо или переатака»
/* Роль руки по handedness, а не по X. Правая=ноты, левая=эффекты
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
    const S=HANDS[key]||(HANDS[key]={pinch:false,deg:-1,oct:0,zone:null,vol:.6,rev:0,adj:null,sm:{},inert:false,fresh:false,role:null,rx0:0,rx1:0});
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
      {
        const py=(lm[4].y+lm[mf].y)/2*H;
        const px=flipX((lm[4].x+lm[mf].x)/2)*W;
        if(splitOn){
          /* СПЛИТ-ЭКРАН: половину (роль + X-диапазон) выбираем ПО ТОЧКЕ ЩИПКА и ЗАМОРАЖИВАЕМ на S —
             как S.zone. Роль этой руки = роль её половины (зона=инструмент). Раздел палитра|ноты —
             palSplitX диапазона ИМЕННО этой половины. Палитра — ПО ПОЛОЖЕНИЮ (без handRole): любая
             рука с большим+указательным (S.oct===0) слева от раздела выбирает тип. Эффекты остаются
             за левой рукой (handRole==='fx'), но ТОЛЬКО в соло-половине (h.role==='ld'). */
          const halves=phoneHalves(W), h=halves.find(q=>px>=q.rx0&&px<q.rx1)||halves[halves.length-1];
          S.role=h.role; S.rx0=h.rx0; S.rx1=h.rx1;
          const hsplit=palSplitX(h.rx0,h.rx1);
          const rectRole = (h.role==='ld'||h.role==='bs'||h.role==='ch') && rectGrid();
          const octRight = h.role!=='ch' || px>=hsplit;   // у аккордов октава — только в правой (нотной) части половины
          const octBand  = rectRole && octRight && degRaw(Math.min(py,H-1),rectRowsFull(),H)===0;
          const famHand  = h.role==='ch' && typedChords() && S.oct===0 && px<hsplit;   // ПОЛОЖЕНИЕ, без handRole
          S.zone = octBand ? 'oct'
                 : famHand ? 'chFam'
                 : (h.role==='ld' && handRole(key)==='fx') ? 'fx'   // эффекты — левая рука, только в соло-половине
                 : h.role;
        }else{
          /* ── SINGLE-ROLE (сплит выключен): сегодняшний путь, байт-в-байт ──
             Рука-«не-нотная» (handRole==='fx', по умолчанию ЛЕВАЯ) получает особую роль только там,
             где она есть: эффекты у соло, выбор семейства у типизированных аккордов. Октавный
             прямоугольник — ПОЛОЖЕНИЕ важнее роли (полоса 0 → 'oct', даже если это fx-рука), стоит
             ПЕРВЫМ в тернаре. У аккордов октава живёт только в правой половине [SPLIT,W]. */
          const rectRole = (phoneInstr==='ld'||phoneInstr==='bs'||phoneInstr==='ch') && rectGrid();   // rect-раскладка: соло, бас И аккорды
          const octRight = phoneInstr!=='ch' || px>=split;
          const octBand = rectRole && octRight && degRaw(Math.min(py,H-1),rectRowsFull(),H)===0;
          const famHand = phoneInstr==='ch' && typedChords() && handRole(key)==='fx';
          S.zone = octBand ? 'oct'
                 : famHand ? 'chFam'
                 : (phoneInstr==='ld'&&handRole(key)==='fx') ? 'fx'
                 : phoneInstr;
        }
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
      const x=emaS(S,'x',flipX(tip.x)*W,0.4);
      const y=emaS(S,'y',tip.y*H,0.4);
      S.x=x; S.y=y;
      /* X-диапазон роли ЭТОЙ руки при игре: при сплите — ЗАМОРОЖЕННЫЙ на захвате (S.rx0/S.rx1),
         иначе весь холст [0,W]. Раздел палитра|ноты — palSplitX того же диапазона. OFF → 0/W/split
         (байт-в-байт: диапазон от phoneInstr не зависел). */
      const prx0=splitOn?S.rx0:rx0, prx1=splitOn?S.rx1:rx1, psplit=palSplitX(prx0,prx1);

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
             2. только внутри палитры (S.x < psplit) — рука, ушедшая в зону нот, молчит.
           Ведение непрерывное, пока щипок держат: можно дотянуть до соседней ячейки. */
        if(S.oct===0 && S.x<psplit){
          const x0=prx0+CH_PAL_PAD, x1=psplit-CH_PAL_PAD, y0=CH_PAL_HEAD_H, y1=H-CH_PAL_HEAD_H;
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
           S.oct здесь — «какой палец», как везде.
           РОЛЬ регистра: при сплите — инструмент ЭТОЙ половины (S.role, заморожен на захвате: из зоны
           'oct' роль не достать); иначе — активный phoneInstr (single-role, байт-в-байт, включая
           смену роли DOM-кнопкой на удержанном щипке — softAllOff щипок не снимает). */
        setRectOctReg(splitOn?S.role:phoneInstr, S.oct);
      }else{
        /* Сетка «4 ноты в прямоугольнике» — соло, бас И аккорды на ладу с rectGrid (19/31-TET).
           Y выбирает ПОЛОСУ полной сетки; полоса 0 — октавная (её перехватывает зона 'oct'),
           нотный прямоугольник = полоса−1. Палец S.oct (0=указ.=низ … 3=мизинец=верх) — ноту/корень
           ВНУТРИ прямоугольника; октава — липкий регистр роли (rectOctReg). ступень = прямоуг*4
           + нота, кламп в 0..IVX-1 (верх.мизинец = тоника октавой выше). S.oct тут читается как
           «нота в прямоугольнике» — переосмысление ЛОКАЛЬНОЕ, в прочих местах S.oct по-прежнему октава.
           У аккордов это КОРЕНЬ; тип берётся из палитры отдельно, октава — chordOctReg. */
        const rectPlay = (S.zone==='ld'||S.zone==='bs'||S.zone==='ch') && rectGrid();
        const thereminOn = S.zone==='ld' && theremin;   // терменвокс — только соло-зона
        const oct = rectPlay?rectOctReg(S.zone):S.oct;           // октавный регистр роли (WleadOn/бас/терменвокс); роль = S.zone (при игре ='ld')
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
          }
        }else if(S.zone==='bs'){                            // бас: моно-голос, ведётся как соло
          if(bassOwner===key)WbassOn({deg:S.deg,oct:rectPlay?rectOctReg(S.zone):S.oct,vol:S.vol,inst:bassIdx});   // rect-бас — октава из bassOctReg (роль=S.zone='bs'); 12-TET бас — S.oct (палец), как было

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
    /* Индикатор реверба (revDisp): у СОЛО НОТНОЙ руки показываем ТЕКУЩУЮ глубину (Z=близость
       кисти) КАЖДЫЙ кадр — щипок не нужен, можно «прицелиться» ревербом ДО игры. Пропускаем, когда
       рука уже играет (ветка 'ld'/leadOwner выше сама зовёт setRevDisp — иначе посчитали бы EMA дважды).
       ТОЛЬКО дисплей: в звук (WleadOn) реверб по-прежнему уходит лишь при игре.
       При сплите «прицел» ДО щипка отключён (какая рука целится в соло — неоднозначно); живой revDisp
       при игре соло всё равно обновляет ветка 'ld' выше (§шаг3, осознанный выбор). */
    if(!splitOn && phoneInstr==='ld' && handRole(key)==='notes'
       && !(S.pinch && S.zone==='ld' && leadOwner===key)){
      setRevDisp(clamp01((REV_NEAR-emaS(S,'hs',dist(lm[0],lm[9]),0.15))/REV_RANGE));
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
  /* Соло-нотной руки нет в кадре → индикатор реверба гасим в 0 (не висит на последнем значении).
     Только для одиночного соло (вне сплита). */
  if(!splitOn && phoneInstr==='ld' && ![...seen].some(k=>handRole(k)==='notes')) setRevDisp(0);
}

/* Экспорт: HANDS/leadOwner — живые связки (их читает draw). */
export { HANDS, leadOwner, processHands, degRaw, handRole };
