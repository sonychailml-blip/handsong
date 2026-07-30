import { AC, setLeadInstr, applyParams, scheduleBend, leadCancel, noteOn, noteOff, metroClick, chordOn, chordGlide, chordOff, chordHold,
         bassOn, bassSet, bassOff, bassHold, drumHit, droneOn, droneOff } from './audio.js';
import { leadIdx, chIdx, bassIdx, drumKitIdx, seventh, setLatchDeg, setLatchTy } from './state.js';
import { leadFreq, chordFreqs, bassFreq, CUR } from './scales.js';
import { buildArrangement } from './arrange.js';
import { REC_VOL_EPS, REC_REV_EPS, BEND_EPS_CENTS, SCHED_TICK_MS, SCHED_AHEAD, BEATS_PER_BAR } from './config.js';
import { hooks } from './hooks.js';

/* ================= ЗАПИСЬ И ЛУПЕР =================
   Событие — НАМЕРЕНИЕ, не кадр: время в ДОЛЯХ внутри петли (t ∈ [0,loopBeats)),
   высота — СТУПЕНЬ+ОКТАВА (deg/oct); частота выводится на исполнении через
   leadFreq/chordFreqs → петля перестраивается под текущий строй (§3.7).
   Пишем по изменению (дискретное — при смене, непрерывное — за мёртвой зоной),
   так кадровый лог (~60/с) схлопывается в горстку точек на ноту.
   Схема события: {t, layer, fn, a}. layer — слой овердаба (единица отмены).

   ЛУПЕР. Один насос по часам AudioContext крутит петлю фиксированной длины
   (loop.bars тактов). Позиция в долях = ((now−t0)·bpm/60) mod loopBeats; на
   завороте зависшие голоса гасятся, события переигрываются с начала. Живой ввод
   идёт через W* (звук сразу + запись, если вооружено), переигровка зовёт ENG
   НАПРЯМУЮ — поэтому переигранное не пишется заново без всякого гейта. Овердаб:
   петля играет и одновременно пишется новый слой; слой, что пишется прямо сейчас,
   НЕ переигрывается (его слышно живьём) — иначе двойной триггер.
   ВЛАДЕЛЬЦЫ ГОЛОСОВ ПО СЛОЮ: живой аккорд — 'latch', переигранный — 'loop:N';
   живой бас — 'bass', переигранный — 'bassloop:N'. Поэтому один и тот же инструмент
   слоится сам на себя (аккорд поверх аккорда, бас поверх баса) — разные владельцы,
   разные голоса из пула. Соло остаётся моно (один envGain): соло-поверх-соло делит
   голос, побеждает последний — легато-глиссандо и есть инструмент, это не баг. */
let recording=false;                                 // «вооружено»: пишем живой ввод
const events=[];                                     // стабильная ссылка (её читает визуализация в draw)
const loop={ on:false, bars:2, metre:BEATS_PER_BAR, bpm:84, t0:0, pos:-1e-9, sched:0, first:false, layer:0, clickBeat:0, quant:true };   // metre — долей в такте; pos — «сыгранная» доля (лид/дрон, почти-сейчас); sched — АБСОЛЮТНАЯ доля, до которой СЛОИ (аккорд/бас/удар) уже запланированы вперёд
const droneActive=()=>events.some(e=>e.fn==='drone');   // жив ли слой-дрон (для гашения при снятии/стопе)
let recLead=null, recCh=null, recBass=null, pumpTimer=null;
/* Глиссандо-в-луп: у ОТКРЫТОЙ соло-ноты копим кривую бенда (центы поверх ступени) в массив,
   лежащий ПО ССЫЛКЕ в событии leadOn. Активно только у терменвокса (гейт live!=null). */
let recLeadBend=null, noteStartBeat=0, bendLastC=null;
let curChordDeg=-1;                                  // ступень аккорда, что играет петля сейчас (для подсветки, §Q5)
const loopBeats=()=>loop.bars*loop.metre;
/* ГРУППИРОВКА (акценты) по размеру — СТАТИЧНАЯ, по умолчанию. Массив длин групп, сумма = размер.
   Нечётные размеры чувствуются НЕ ровно: балканская 7 = 3+2+2, 9 = 2+2+2+3, 5 = 2+3; индийский
   тинтал (16) — 4 вибхага по 4. Пользовательский выбор 3+2+2 vs 2+2+3 отложен (BACKLOG §3.23) —
   один разумный вариант на размер. Дефолт нечислового/неизвестного — одна группа (акцент только сам).
   khali — индексы ГРУПП, что ОСЛАБЛЕНЫ (не акцент, а «пустая» голова, структурная черта тала). */
const METRE_GROUPS={ 2:[2],3:[3],4:[4],5:[2,3],6:[3,3],7:[3,2,2],8:[4,4],9:[2,2,2,3],10:[2,3,2,3],12:[3,3,3,3],16:[4,4,4,4] };
const METRE_KHALI ={ 16:[2] };   // тинтал: 3-й вибхаг (индекс 2 = доля 8) — khali (открытый баян, без баса)
/* Уровень акцента доли b∈[0,metre): 2 сам (начало такта), 1 голова группы, -1 khali-голова, 0 обычная. */
function beatLevel(metre,b){
  const g=METRE_GROUPS[metre]||[metre], kh=METRE_KHALI[metre]||[];
  let acc=0;
  for(let i=0;i<g.length;i++){ if(acc===b) return b===0?2:(kh.includes(i)?-1:1); acc+=g[i]; }
  return 0;   // не голова группы
}
const loopChordDeg=()=>loop.on?curChordDeg:-1;       // draw: подсветить аккорд петли, когда рука его не держит
const maxLayer=()=>events.reduce((m,e)=>Math.max(m,e.layer),0);
/* Позиция для визуализации: фаза отсчёта / игры, доля внутри петли, всего долей. */
function loopPos(){
  if(!loop.on||!AC)return null;
  const e=(AC.currentTime-loop.t0)*loop.bpm/60, total=loopBeats();
  return e<0 ? {phase:'count', countLeft:Math.ceil(-e), pos:0, total, bars:loop.bars}
             : {phase:'play',  pos:e%total, total, bars:loop.bars};
}

/* ENG — единая точка исполнения (живьём через W* и на переигровке). deg→частота
   выводится ЗДЕСЬ. Ладовый КОНТЕКСТ: живьём (ctx нет) — текущий лад/септаккорд;
   на переигровке ctx=событие с ЗАМОРОЖЕННЫМ ладом (ev.sc) и септаккордом (ev.sev),
   §3.4. baseF() всегда живой → тоника глобальна, лад заморожен. leadFreq/bassFreq
   сами страхуют ступень вне лада (модуло+октава), так что частота не улетает в NaN.
   Владелец голосов ПО СЛОЮ (ctx=событие переигровки): аккорд — 'loop:'+layer / живой
   'latch'; бас — 'bassloop:'+layer / живой 'bass'. Так слой не крадёт голос у живого. */
const chOwnerKey  =ctx=> ctx?'loop:'+ctx.layer:'latch';
const bassOwnerKey=ctx=> ctx?'bassloop:'+ctx.layer:'bass';
const ENG={
  leadOn:(a,ctx,live)=>{ if(a.inst!==undefined&&a.inst!==leadIdx)setLeadInstr(a.inst);
              /* live — ЖИВОЙ override частоты (терменвокс): непрерывные Гц вместо ступенной leadFreq.
                 Только на ЖИВОМ пути (WleadOn); переигровка зовёт ENG без 3-го арг → live undefined →
                 частота из leadFreq по замороженному ладу (полимодальность цела). */
              if(ctx)leadCancel();                 // атака переигранной ноты: снять рампы прошлого бенда (не перетечёт)
              const base=leadFreq(a.deg,a.oct,ctx?ctx.sc:CUR());
              applyParams({freq:(live!=null?live:base),vol:a.vol,rev:a.rev,vib:a.vib,drv:a.drv,trm:a.trm,dly:a.dly});
              noteOn();
              if(a.bend&&a.bend.length)scheduleBend(a.bend,base,60/loop.bpm); },   // переигровка: кривая бенда поверх ступени замороженного лада
  leadSet:(a,ctx)=>applyParams({freq:(a.hold?null:leadFreq(a.deg,a.oct,ctx?ctx.sc:CUR())),vol:a.vol,rev:a.rev,vib:a.vib,drv:a.drv,trm:a.trm,dly:a.dly}),
  leadOff:()=>noteOff(),
  /* when — ЯВНОЕ время (опережение лупера, §планировщик). Живой путь (W*) зовёт без when → undefined
     → аудио-функции берут AC.currentTime (сейчас), байт-в-байт. Переигровка слоёв передаёт точное время. */
  chOn:(a,ctx,when)=>chordOn(chOwnerKey(ctx),chordFreqs(a.deg,a.oct,ctx?ctx.sc:CUR(),ctx?ctx.sev:seventh,a.ty),a.vol,a.inst,a.bri,when),   // a.bri — пер-событийная яркость (0=нейтраль); when остаётся ПОСЛЕДНИМ (планировщик)
  chSet:(a,ctx,when)=>chordGlide(chOwnerKey(ctx),chordFreqs(a.deg,a.oct,ctx?ctx.sc:CUR(),ctx?ctx.sev:seventh,a.ty),a.vol,a.bri,when),
  chOff:(a,ctx,when)=>chordOff(chOwnerKey(ctx),when),
  bassOn:(a,ctx,when,live)=>bassOn(bassOwnerKey(ctx),(live!=null?live:bassFreq(a.deg,a.oct,ctx?ctx.sc:CUR())),a.vol,a.inst,when),   // live — живой override Гц (терменвокс-бас), как у leadOn; переигровка без него → bassFreq (полимодальность цела)
  bassSet:(a,ctx,when)=>bassSet(bassOwnerKey(ctx),bassFreq(a.deg,a.oct,ctx?ctx.sc:CUR()),a.vol,when),
  bassOff:(a,ctx,when)=>bassOff(bassOwnerKey(ctx),when),
  drum:(a,ctx,when)=>drumHit(a.row,a.vol,a.kit,when),
  drone:a=>droneOn(a.lvl),                            // дрон: выделенные узлы, гасится по жизненному циклу (не в softAllOff)
};
const inPB=()=>loop.on;                               // для строки статуса (draw)

/* Сетка квантизации в долях: аккорды — доля (4/такт), бас — восьмая (8/такт),
   ударные — шестнадцатая (16/такт), соло — не квантуется. Общий тумблер loop.quant. */
const gridFor=fn=> fn[0]==='c'?1 : fn.slice(0,4)==='bass'?0.5 : fn==='drum'?0.25 : 0;
/* Запись события на текущую позицию в петле; время при квантизации снапится к сетке. */
function push(fn,a){
  if(!AC)return;
  const e=(AC.currentTime-loop.t0)*loop.bpm/60;
  if(e<0)return;                                      // ещё идёт отсчёт
  let t=e%loopBeats();
  const g=loop.quant?gridFor(fn):0;
  if(g>0)t=(Math.round(t/g)*g)%loopBeats();
  events.push({t,layer:loop.layer,fn,a,sc:CUR(),sev:seventh});   // §3.4: замораживаем ладовый контекст события
}
/* Доля внутри петли СЕЙЧАС (тот же счёт, что и push) — для dt точек бенда. */
const curBeat=()=>((AC.currentTime-loop.t0)*loop.bpm/60)%loopBeats();
/* Точка бенда: центы ЖИВОЙ высоты (live) относительно ступени АТАКИ (recLead.deg/oct по
   замороженному-в-будущем ладу CUR()). Само-прореживание порогом BEND_EPS_CENTS. dt клампим ≥0
   (нота через заворот петли — редкость; первый круг всё равно кончается на завороте). */
function pushBend(live){
  if(!recLeadBend||live==null)return;
  const c=1200*Math.log2(live/leadFreq(recLead.deg,recLead.oct,CUR()));
  if(bendLastC!=null&&Math.abs(c-bendLastC)<=BEND_EPS_CENTS)return;
  recLeadBend.push({dt:Math.max(0,curBeat()-noteStartBeat),c});
  bendLastC=c;
}
/* live!=null ⟺ phone-соло-терменвокс (gestures шлёт S.hz только там). Тогда высоту несёт БЕНД:
   deg/oct ЗАМОРОЖЕНЫ на атаке (не сравниваем и не обновляем — у c стабильная опора), а leadSet
   пишем лишь на смену громкости/реверба/тембра с меткой hold (переигровка не сбивает бенд частотой).
   live==null (терменвокс выкл / бас-как-соло нет / ПК) — код БАЙТ-В-БАЙТ как раньше. */
function recLeadEv(p,live){
  if(!recording)return;
  if(!recLead){
    const a={...p};
    if(live!=null){ a.bend=[]; recLeadBend=a.bend; noteStartBeat=curBeat(); bendLastC=null; }
    push('leadOn',a);
    recLead={deg:p.deg,oct:p.oct,vol:p.vol,rev:p.rev,inst:p.inst};
    if(live!=null)pushBend(live);                  // стартовая точка (recLead уже есть — опора известна)
    return;
  }
  if(live!=null){                                  // терменвокс: пишем бенд + громкость/реверб (hold), НЕ deg/oct
    pushBend(live);
    if(p.inst!==recLead.inst||Math.abs(p.vol-recLead.vol)>REC_VOL_EPS||Math.abs(p.rev-recLead.rev)>REC_REV_EPS){
      push('leadSet',{...p,hold:true});
      recLead={deg:recLead.deg,oct:recLead.oct,vol:p.vol,rev:p.rev,inst:p.inst};   // deg/oct остаются на атаке
    }
    return;
  }
  if(p.deg!==recLead.deg||p.oct!==recLead.oct||p.inst!==recLead.inst||
     Math.abs(p.vol-recLead.vol)>REC_VOL_EPS||Math.abs(p.rev-recLead.rev)>REC_REV_EPS){ push('leadSet',{...p}); }
  else return;
  recLead={deg:p.deg,oct:p.oct,vol:p.vol,rev:p.rev,inst:p.inst};
}
function recLeadOff(){ if(recording&&recLead){ push('leadOff',{}); recLead=null; } recLeadBend=null; }
/* ty входит в сравнение: у типизированных аккордов громкость ФИКСИРОВАНА, а сектор
   меняется без смены ступени/октавы — без этой проверки смена типа не попала бы в
   запись вовсе, и петля играла бы не тот аккорд. Сравнение по ссылке корректно:
   ty — это всегда один и тот же массив из таблицы CHORD_FAMS. */
/* a.bri (яркость) входит в запись КАК a.rev у соло: ложится в полезную нагрузку a (рядом с ty/inst),
   слой запоминает свою яркость и переигрывается с ней. Смена ТОЛЬКО яркости (рука двинулась в глубину,
   ступень/тип/громкость те же) должна попасть в запись → добавляем |Δbri|>REC_REV_EPS в тест chSet
   (та же мёртвая зона, что у реверба соло). События аккордов КВАНТУЮТСЯ к доле (gridFor='chOn'/'chSet'→1),
   поэтому при вкл. квантизации кривая яркости привязывается к долям (грубее соло, но согласно с тем, что
   аккорды и так поbeat-квантованы); при выкл. — полное разрешение жеста. */
function recChOn(a){ if(!recording)return; push('chOn',{...a}); recCh={deg:a.deg,oct:a.oct,vol:a.vol,ty:a.ty,bri:a.bri}; }
function recChSet(a){
  if(!recording)return;
  if(!recCh){ push('chOn',{...a}); }
  else if(a.deg!==recCh.deg||a.oct!==recCh.oct||a.ty!==recCh.ty||Math.abs(a.vol-recCh.vol)>REC_VOL_EPS||Math.abs((a.bri||0)-(recCh.bri||0))>REC_REV_EPS){ push('chSet',{...a}); }
  else return;
  recCh={deg:a.deg,oct:a.oct,vol:a.vol,ty:a.ty,bri:a.bri};
}
function recChOff(){ if(recording&&recCh){ push('chOff',{}); recCh=null; } }
function recBassEv(p){                                  // бас прореживается как соло
  if(!recording)return;
  if(!recBass){ push('bassOn',{...p}); }
  else if(p.deg!==recBass.deg||p.oct!==recBass.oct||p.inst!==recBass.inst||Math.abs(p.vol-recBass.vol)>REC_VOL_EPS){ push('bassSet',{...p}); }
  else return;
  recBass={deg:p.deg,oct:p.oct,vol:p.vol,inst:p.inst};
}
function recBassOff(){ if(recording&&recBass){ push('bassOff',{}); recBass=null; } }
function recDrum(a){ if(recording)push('drum',{...a}); }   // удар — одиночное событие

/* Обёртки W*: живой звук СРАЗУ + запись (если вооружено). Переигровка (насос)
   зовёт ENG напрямую, мимо W* → сама себя не пишет; живой гейт больше не нужен. */
const WleadOn =(p,live)=>{ ENG.leadOn(p,null,live); recLeadEv(p,live); };   // live: в звук (стадия a) И в запись бенда (стадия b); ENG.leadOn получает p БЕЗ bend — живая нота не трогается
const WleadOff=()=>{ ENG.leadOff(); recLeadOff(); };
/* ty — интервалы типизированного аккорда. Живёт в ПОЛЕЗНОЙ НАГРУЗКЕ a (как a.inst —
   тембр), а не рядом с sc/sev: тип — свойство самого аккорда, а не ладового контекста.
   Так он замораживается в событии сам собой и переигрывается как сыгран. */
const WchOn =(_o,deg,oct,vol,ins,ty,bri)=>{ const a={deg,oct,vol,inst:ins,ty,bri}; ENG.chOn(a); recChOn(a); };   // bri — живая яркость руки: в звук (ENG) И в запись (rec), как a.rev у соло
const WchSet=(_o,deg,oct,vol,ty,bri)    =>{ const a={deg,oct,vol,ty,bri};          ENG.chSet(a); recChSet(a); };
const WchOff=_o                 =>{ ENG.chOff(); recChOff(); };
const WbassOn =(p,live)=>{ ENG.bassOn(p,null,undefined,live); recBassEv(p); };   // live в звук, НЕ в запись (recBassEv пишет ступень) — инвариант «живые Гц не записываются», как у соло
const WbassOff=()=>{ ENG.bassOff(); recBassOff(); };
const WdrumHit=(row,vol)=>{ const a={row,vol,kit:drumKitIdx}; ENG.drum(a); recDrum(a); };

function softAllOff(){ if(!AC)return; noteOff();
  Object.keys(chordHold).forEach(k=>chordOff(k));   // все владельцы аккордов: 'latch' + 'loop:N'
  Object.keys(bassHold).forEach(k=>bassOff(k));     // все владельцы баса: 'bass' + 'bassloop:N'
  setLatchDeg(-1); setLatchTy(null);              // тип гасим вместе со ступенью: иначе после паники/очистки
  recLead=null; recCh=null; recBass=null; recLeadBend=null; }   // следующий щипок той же ступени прочёлся бы как «тот же аккорд»; бенд открытой ноты сбрасываем
function setRecording(v){ recording=v; hooks.rec && hooks.rec(v); }

/* --- Транспорт петли --- */
function clearPump(){ if(pumpTimer){ clearInterval(pumpTimer); pumpTimer=null; } }
/* СЛОИ (аккорд/бас/удар) идут ВПЕРЁД по явному времени; ЛИД/дрон — «почти сейчас» (моно-соло делит
   один голос с живой игрой: пред-планировать его далеко вперёд опасно, §6). fn[0]==='c' → аккорд;
   slice(0,4)==='bass' → бас; 'drum' → удар. Лид (leadOn/leadSet/leadOff) и дрон — НЕ вперёд. */
const isLayer=fn=> fn[0]==='c' || fn.slice(0,4)==='bass' || fn==='drum';

/* 1) СЛОИ ВПЕРЁД: на каждый опрос планируем события в окне [loop.sched, горизонт) по их ТОЧНОМУ времени
   loop.t0 + абс.доля*spb, с проекцией через завороты (rep — номер повтора петли). Интервал ПОЛУОТКРЫТ
   [lo,hi): включает начало → доля 0 (сильный удар) не теряется на старте и после каждого заворота.
   На границе повтора гасим слои петли по ЯВНОМУ времени (releaseLoopLayersAt) — аналог softAllOff, но
   не «сейчас». Событие пишущегося слоя пропускаем. loop.sched — абсолютная доля, монотонно растёт. */
function scheduleLayers(){
  const spb=60/loop.bpm, lb=loopBeats();
  const horizon=(AC.currentTime+SCHED_AHEAD-loop.t0)/spb;   // абс. доля на горизонте опережения
  let guard=0;
  while(loop.sched<horizon-1e-9 && guard++<64){
    const rep=Math.floor(loop.sched/lb+1e-9), repEnd=(rep+1)*lb;
    const segEnd=Math.min(horizon,repEnd);
    const lo=loop.sched-rep*lb, hi=segEnd-rep*lb;           // [lo,hi) в пределах петли
    for(const ev of events){
      if(!isLayer(ev.fn)) continue;
      if(recording&&ev.layer===loop.layer) continue;
      if(ev.t>=lo&&ev.t<hi){
        const when=loop.t0+(rep*lb+ev.t)*spb;               // ТОЧНОЕ время события
        ENG[ev.fn](ev.a,ev,when);                           // ev несёт замороженный лад (§3.4)
        if(ev.fn==='chOn'||ev.fn==='chSet')curChordDeg=ev.a.deg;   // подсветка ведёт на опережение (~до окна) — косметика
        else if(ev.fn==='chOff')curChordDeg=-1;
      }
    }
    if(segEnd>=repEnd-1e-9) releaseLoopLayersAt(loop.t0+repEnd*spb);   // достигли границы повтора — гасим слои по явному времени
    loop.sched=segEnd;
  }
}
/* Гашение СЛОЁВ петли на границе повтора, по явному времени (owner 'loop:'/'bassloop:'; живое — latch/bass —
   гасит liveWrapRelease почти-сейчас). Читает hold СЕЙЧАС: там уже голоса уходящего повтора (chOn их создал). */
function releaseLoopLayersAt(when){
  for(const k of Object.keys(chordHold)) if(k.slice(0,5)==='loop:') chordOff(k,when);
  for(const k of Object.keys(bassHold))  if(k.slice(0,9)==='bassloop:') bassOff(k,when);
}
/* 2) ЛИД/дрон — почти-сейчас (как раньше): события в (a,b] БЕЗ when → AC.currentTime. Слои тут пропускаем. */
function fireNear(a,b){
  for(const ev of events)
    if(!isLayer(ev.fn)&&ev.t>a&&ev.t<=b&&!(recording&&ev.layer===loop.layer))
      ENG[ev.fn](ev.a,ev);
}
/* Гашение ЖИВОГО на завороте — слои петли гасятся вперёд (releaseLoopLayersAt), а ЖИВОЙ аккорд НЕ трогаем.
   Живой аккорд ('latch') принадлежит РУКЕ, а не петле: удержанный или защёлкнутый, он обязан пережить
   сколько угодно заворотов, пока игрок не отпустит пальцы (удержание) или не сменит аккорд (защёлка).
   Раньше здесь стоял chordOff('latch') + сброс latchDeg/latchTy/recCh — он и обрезал аккорд на границе;
   убрано. Лид/бас гасим по-прежнему: они моно и переатакуются со следующего кадра ещё зажатой рукой
   (для аккорда так нельзя — живой путь WchSet→chordGlide не пересобирает удалённые голоса). */
function liveWrapRelease(){ if(!AC)return; noteOff();
  bassOff('bass');
  recLead=null; recBass=null; recLeadBend=null; }
function schedClicks(){                                // щелчки метронома с опережением по AC-часам
  const spb=60/loop.bpm, ahead=AC.currentTime+SCHED_AHEAD;
  while(loop.t0+loop.clickBeat*spb<ahead){
    const bt=loop.t0+loop.clickBeat*spb, inCount=loop.clickBeat<0;
    /* Просроченный щелчок (bt в прошлом — зависание ДЛИННЕЕ окна) НАМЕРЕННО пропускаем, а не играем
       поздно: поздний щелчок слышен как «флам»/спотыкание (хуже, чем разовый пропуск, который ухо
       достраивает). С окном 0.30с пропуски редки; слои же наоборот — просроченные играем (звучат
       поздно, но не рвут состояние аккорда/баса; деградация к прежнему поведению на огромных столах). */
    if(bt>=AC.currentTime-0.001&&(inCount||recording))
      metroClick(bt, beatLevel(loop.metre, (((loop.clickBeat%loop.metre)+loop.metre)%loop.metre)));   // акцент по ГРУППЕ, не только по началу такта
    loop.clickBeat++;
  }
}
function tick(){
  if(!loop.on||!AC)return;
  schedClicks();
  scheduleLayers();                                   // СЛОИ — вперёд по явному времени (сэмпл-точно)
  const e=(AC.currentTime-loop.t0)*loop.bpm/60;
  if(e<0)return;                                      // отсчёт: только щелчки/планирование
  const lb=loopBeats(); let pos=e%lb;
  if(pos<loop.pos){                                   // заворот петли (для лид/дрон)
    fireNear(loop.pos,lb);
    liveWrapRelease();                                // гасим ЖИВОЕ к границе (слои — по явному времени)
    if(loop.first){ loop.first=false; setRecording(false); events.sort((x,y)=>x.t-y.t); loop.sched=e;   // первая запись только что стала слоем — планировать её с ТЕКУЩЕЙ позиции (во время записи слоёв не планировалось → без дублей)
      hooks.tutor && hooks.tutor('loop',{ev:'loopClosed'}); }   // ЗАЦЕПКА ОБУЧЕНИЯ: первый круг замкнулся и пошёл петлёй («вернулся») — урок «Лупер»
    fireNear(-1e-9,pos);
  }else fireNear(loop.pos,pos);
  loop.pos=pos;
}
function startTransport(countIn){
  clearPump();
  const spb=60/loop.bpm;
  loop.on=true; loop.pos=-1e-9; loop.sched=0;              // sched=0 → планируем слои с доли 0 (первый удар петли — по явному времени, сэмпл-точно)
  loop.t0=AC.currentTime+(countIn?loop.metre*spb:0.06);   // отсчёт — ОДИН такт (loop.metre долей), при любом размере (предсказуемое правило)
  loop.clickBeat=countIn?-loop.metre:0;
  pumpTimer=setInterval(tick,SCHED_TICK_MS);
  hooks.loop && hooks.loop(true);
}

/* Кнопка «● запись»: пусто → запись слоя 0 с отсчётом (авто-луп по завершении круга);
   играет петля → тумблер овердаба (вкл/выкл новый слой). */
function onRec(){
  if(!AC)return;
  if(!loop.on){ events.length=0; loop.first=true; loop.layer=0; setRecording(true); startTransport(true);
    hooks.tutor && hooks.tutor('loop',{ev:'recStart'}); }   // ЗАЦЕПКА ОБУЧЕНИЯ: старт записи первого круга (отсчёт пошёл) — урок «Лупер»
  else if(recording){ recLeadOff(); recChOff(); setRecording(false); events.sort((x,y)=>x.t-y.t);
    hooks.tutor && hooks.tutor('loop',{ev:'overdubStop'}); }   // ЗАЦЕПКА ОБУЧЕНИЯ: овердаб остановлен (слой готов) — урок «Лупер»
  else{ loop.layer=maxLayer()+1; setRecording(true);
    hooks.tutor && hooks.tutor('loop',{ev:'overdubStart'}); }   // ЗАЦЕПКА ОБУЧЕНИЯ: начат новый слой поверх петли — урок «Лупер»
}
/* Загрузить аранжировку (гармония+бас+ритм) как ОТДЕЛЬНЫЕ слои, замороженные в текущем
   ладу/септаккорде (§3.4). Пустая петля → длина из прогрессии + запуск; непустая → только
   если длина совпадает (как setLoopBars). Слои снимаются undo сверху (сначала ритм). */
function loadArrangement(sel, jam=false){
  if(!AC)return false;
  const arr=buildArrangement(sel, {chIdx, bassIdx, metre:loop.metre});
  if(!arr||!arr.layers.length)return false;
  if(!events.length){ loop.bars=arr.bars; loop.first=false; }
  else if(arr.bars!==loop.bars)return false;           // не тот размер — тихо, как setLoopBars
  const base=events.length?maxLayer()+1:0;
  arr.layers.forEach((evs,li)=>{ const layer=base+li;
    for(const e of evs){ const ev={t:e.t, layer, fn:e.fn, a:e.a, sc:CUR(), sev:seventh};
      if(jam)ev.jam=true;                              // МЕТКА СЛОЯ ДЖЕМА: живёт В САМОМ событии → снять ровно джем, не тронув записи игрока (см. clearJam)
      events.push(ev); } });
  events.sort((x,y)=>x.t-y.t);
  if(!loop.on)startTransport(false);
  if(droneActive())droneOn();                          // включаем дрон сразу (насос переподтвердит на завороте)
  if(jam) hooks.tutor && hooks.tutor('loop',{ev:'jam'});   // ЗАЦЕПКА ОБУЧЕНИЯ: джем реально встал (слои добавлены) — урок «Лупер»; только для джема, не для ручной аранжировки
  return true;                                         // добавили (джем-контроллер по этому знает, что вариант встал)
}
/* Джем — та же аранжировка-shortcut, но её слои ПОМЕЧЕНЫ (e.jam). loadJam кладёт помеченные,
   clearJam снимает РОВНО их. Записи игрока (push никогда не ставит jam) неуязвимы по построению. */
const loadJam=sel=>loadArrangement(sel, true);
function clearJam(){
  if(!events.length)return;
  let removed=false;
  for(let i=events.length-1;i>=0;i--) if(events[i].jam){ events.splice(i,1); removed=true; }
  if(!removed)return;
  softAllOff(); if(!droneActive())droneOff();          // бухгалтерия как в onUndo: гасим зависшее, ушёл слой-дрон → гасим дрон
  if(!events.length)clearRec(); else hooks.loop&&hooks.loop(loop.on);   // пусто → полный сброс; остались записи игрока → петля играет дальше
}
function onLoop(){                                     // играть/пауза петли
  if(!AC)return;
  if(loop.on){ loop.on=false; clearPump(); softAllOff(); droneOff(); setRecording(false);
    hooks.rec&&hooks.rec(false); hooks.loop&&hooks.loop(false); }
  else if(events.length){ startTransport(false); if(droneActive())droneOn(); }
}
function onUndo(){                                      // снять последний слой (на месте — ссылка events стабильна)
  if(!events.length)return;
  const top=maxLayer();
  for(let i=events.length-1;i>=0;i--)if(events[i].layer===top)events.splice(i,1);
  softAllOff(); if(!droneActive())droneOff();           // сняли слой-дрон → гасим (softAllOff дрон не трогает)
  if(!events.length)clearRec(); else hooks.loop && hooks.loop(loop.on);
  hooks.tutor && hooks.tutor('loop',{ev:'undo'});       // ЗАЦЕПКА ОБУЧЕНИЯ: снят верхний слой — урок «Лупер» (дошли только при непустой петле — ранний выход выше)
}
function setLoopBars(n){                                // длина меняется только на пустой петле
  if(events.length||loop.on)return;
  loop.bars=Math.max(1,Math.min(8,n));
}
const METRES=[2,3,4,5,6,7,8,9,10,12,16];               // допустимые размеры (долей в такте) — см. UI
function setLoopMetre(n){                               // размер меняется ТОЛЬКО на пустой петле (как bars: смена переосмыслила бы времена всех событий)
  if(events.length||loop.on)return;
  loop.metre = METRES.includes(+n) ? +n : loop.metre;
}
function setLoopQuant(v){ loop.quant=!!v; }             // общий тумблер квантизации
function setLoopBpm(v){ loop.bpm=Math.max(40,Math.min(240,+v||loop.bpm)); }   // темп петли — только пользователь
function clearRec(){
  clearPump(); events.length=0; loop.on=false; setRecording(false); softAllOff(); droneOff();
  hooks.loop && hooks.loop(false);
}
function panic(){
  clearPump(); loop.on=false;
  softAllOff(); droneOff();
  setRecording(false); hooks.loop && hooks.loop(false);
}

/* Экспорт: `recording` через export-клаузу — живая связка (её читает draw). */
export {
  WleadOn, WleadOff, WchOn, WchSet, WchOff, WbassOn, WbassOff, WdrumHit,
  softAllOff, panic, inPB, recording,
  onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopMetre, METRES, beatLevel, setLoopQuant, setLoopBpm, loop, events, loopPos,
  loadArrangement, loadJam, clearJam, loopChordDeg,
};
