import { AC, setLeadInstr, applyParams, noteOn, noteOff, metroClick, chordOn, chordGlide, chordOff, chordHold,
         bassOn, bassSet, bassOff, bassHold, drumHit, droneOn, droneOff } from './audio.js';
import { leadIdx, chIdx, bassIdx, drumKitIdx, seventh, setLatchDeg } from './state.js';
import { leadFreq, chordFreqs, bassFreq, CUR } from './scales.js';
import { buildArrangement } from './arrange.js';
import { REC_VOL_EPS, REC_REV_EPS, SCHED_TICK_MS, SCHED_AHEAD, BEATS_PER_BAR } from './config.js';
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
const loop={ on:false, bars:2, bpm:84, t0:0, pos:-1e-9, first:false, layer:0, clickBeat:0, quant:true };
const droneActive=()=>events.some(e=>e.fn==='drone');   // жив ли слой-дрон (для гашения при снятии/стопе)
let recLead=null, recCh=null, recBass=null, pumpTimer=null;
let curChordDeg=-1;                                  // ступень аккорда, что играет петля сейчас (для подсветки, §Q5)
const loopBeats=()=>loop.bars*BEATS_PER_BAR;
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
  leadOn:(a,ctx)=>{ if(a.inst!==undefined&&a.inst!==leadIdx)setLeadInstr(a.inst);
              applyParams({freq:leadFreq(a.deg,a.oct,ctx?ctx.sc:CUR()),vol:a.vol,rev:a.rev,vib:a.vib,drv:a.drv,trm:a.trm,dly:a.dly});
              noteOn(); },
  leadSet:(a,ctx)=>applyParams({freq:leadFreq(a.deg,a.oct,ctx?ctx.sc:CUR()),vol:a.vol,rev:a.rev,vib:a.vib,drv:a.drv,trm:a.trm,dly:a.dly}),
  leadOff:()=>noteOff(),
  chOn:(a,ctx)=>chordOn(chOwnerKey(ctx),chordFreqs(a.deg,a.oct,ctx?ctx.sc:CUR(),ctx?ctx.sev:seventh),a.vol,a.inst),
  chSet:(a,ctx)=>chordGlide(chOwnerKey(ctx),chordFreqs(a.deg,a.oct,ctx?ctx.sc:CUR(),ctx?ctx.sev:seventh),a.vol),
  chOff:(a,ctx)=>chordOff(chOwnerKey(ctx)),
  bassOn:(a,ctx)=>bassOn(bassOwnerKey(ctx),bassFreq(a.deg,a.oct,ctx?ctx.sc:CUR()),a.vol,a.inst),
  bassSet:(a,ctx)=>bassSet(bassOwnerKey(ctx),bassFreq(a.deg,a.oct,ctx?ctx.sc:CUR()),a.vol),
  bassOff:(a,ctx)=>bassOff(bassOwnerKey(ctx)),
  drum:a=>drumHit(a.row,a.vol,a.kit),
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
function recLeadEv(p){
  if(!recording)return;
  if(!recLead){ push('leadOn',{...p}); }
  else if(p.deg!==recLead.deg||p.oct!==recLead.oct||p.inst!==recLead.inst||
          Math.abs(p.vol-recLead.vol)>REC_VOL_EPS||Math.abs(p.rev-recLead.rev)>REC_REV_EPS){ push('leadSet',{...p}); }
  else return;
  recLead={deg:p.deg,oct:p.oct,vol:p.vol,rev:p.rev,inst:p.inst};
}
function recLeadOff(){ if(recording&&recLead){ push('leadOff',{}); recLead=null; } }
function recChOn(a){ if(!recording)return; push('chOn',{...a}); recCh={deg:a.deg,oct:a.oct,vol:a.vol}; }
function recChSet(a){
  if(!recording)return;
  if(!recCh){ push('chOn',{...a}); }
  else if(a.deg!==recCh.deg||a.oct!==recCh.oct||Math.abs(a.vol-recCh.vol)>REC_VOL_EPS){ push('chSet',{...a}); }
  else return;
  recCh={deg:a.deg,oct:a.oct,vol:a.vol};
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
const WleadOn =p=>{ ENG.leadOn(p); recLeadEv(p); };
const WleadOff=()=>{ ENG.leadOff(); recLeadOff(); };
const WchOn =(_o,deg,oct,vol,ins)=>{ const a={deg,oct,vol,inst:ins}; ENG.chOn(a); recChOn(a); };
const WchSet=(_o,deg,oct,vol)   =>{ const a={deg,oct,vol};          ENG.chSet(a); recChSet(a); };
const WchOff=_o                 =>{ ENG.chOff(); recChOff(); };
const WbassOn =p=>{ ENG.bassOn(p); recBassEv(p); };
const WbassOff=()=>{ ENG.bassOff(); recBassOff(); };
const WdrumHit=(row,vol)=>{ const a={row,vol,kit:drumKitIdx}; ENG.drum(a); recDrum(a); };

function softAllOff(){ if(!AC)return; noteOff();
  Object.keys(chordHold).forEach(k=>chordOff(k));   // все владельцы аккордов: 'latch' + 'loop:N'
  Object.keys(bassHold).forEach(k=>bassOff(k));     // все владельцы баса: 'bass' + 'bassloop:N'
  setLatchDeg(-1); recLead=null; recCh=null; recBass=null; }
function setRecording(v){ recording=v; hooks.rec && hooks.rec(v); }

/* --- Транспорт петли --- */
function clearPump(){ if(pumpTimer){ clearInterval(pumpTimer); pumpTimer=null; } }
function fireWindow(a,b){                              // события в (a,b], кроме пишущегося сейчас слоя
  for(const ev of events)
    if(ev.t>a&&ev.t<=b&&!(recording&&ev.layer===loop.layer)){
      ENG[ev.fn](ev.a,ev);                            // ev несёт замороженный лад (§3.4)
      if(ev.fn==='chOn'||ev.fn==='chSet')curChordDeg=ev.a.deg;   // текущий аккорд петли — для подсветки (§Q5)
      else if(ev.fn==='chOff')curChordDeg=-1;
    }
}
function schedClicks(){                                // щелчки метронома с опережением по AC-часам
  const spb=60/loop.bpm, ahead=AC.currentTime+SCHED_AHEAD;
  while(loop.t0+loop.clickBeat*spb<ahead){
    const bt=loop.t0+loop.clickBeat*spb, inCount=loop.clickBeat<0;
    if(bt>=AC.currentTime-0.001&&(inCount||recording))
      metroClick(bt, (((loop.clickBeat%BEATS_PER_BAR)+BEATS_PER_BAR)%BEATS_PER_BAR)===0);
    loop.clickBeat++;
  }
}
function tick(){
  if(!loop.on||!AC)return;
  schedClicks();
  const e=(AC.currentTime-loop.t0)*loop.bpm/60;
  if(e<0)return;                                      // отсчёт: только щелчки
  const lb=loopBeats(); let pos=e%lb;
  if(pos<loop.pos){                                   // заворот петли
    fireWindow(loop.pos,lb);
    softAllOff();                                     // гасим зависшее к границе
    if(loop.first){ loop.first=false; setRecording(false); events.sort((x,y)=>x.t-y.t); }
    fireWindow(-1e-9,pos);
  }else fireWindow(loop.pos,pos);
  loop.pos=pos;
}
function startTransport(countIn){
  clearPump();
  const spb=60/loop.bpm;
  loop.on=true; loop.pos=-1e-9;
  loop.t0=AC.currentTime+(countIn?BEATS_PER_BAR*spb:0.06);
  loop.clickBeat=countIn?-BEATS_PER_BAR:0;
  pumpTimer=setInterval(tick,SCHED_TICK_MS);
  hooks.loop && hooks.loop(true);
}

/* Кнопка «● запись»: пусто → запись слоя 0 с отсчётом (авто-луп по завершении круга);
   играет петля → тумблер овердаба (вкл/выкл новый слой). */
function onRec(){
  if(!AC)return;
  if(!loop.on){ events.length=0; loop.first=true; loop.layer=0; setRecording(true); startTransport(true); }
  else if(recording){ recLeadOff(); recChOff(); setRecording(false); events.sort((x,y)=>x.t-y.t); }
  else{ loop.layer=maxLayer()+1; setRecording(true); }
}
/* Загрузить аранжировку (гармония+бас+ритм) как ОТДЕЛЬНЫЕ слои, замороженные в текущем
   ладу/септаккорде (§3.4). Пустая петля → длина из прогрессии + запуск; непустая → только
   если длина совпадает (как setLoopBars). Слои снимаются undo сверху (сначала ритм). */
function loadArrangement(sel){
  if(!AC)return;
  const arr=buildArrangement(sel, {chIdx, bassIdx});
  if(!arr||!arr.layers.length)return;
  if(!events.length){ loop.bars=arr.bars; loop.first=false; }
  else if(arr.bars!==loop.bars)return;                 // не тот размер — тихо, как setLoopBars
  const base=events.length?maxLayer()+1:0;
  arr.layers.forEach((evs,li)=>{ const layer=base+li;
    for(const e of evs) events.push({t:e.t, layer, fn:e.fn, a:e.a, sc:CUR(), sev:seventh}); });
  events.sort((x,y)=>x.t-y.t);
  if(!loop.on)startTransport(false);
  if(droneActive())droneOn();                          // включаем дрон сразу (насос переподтвердит на завороте)
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
}
function setLoopBars(n){                                // длина меняется только на пустой петле
  if(events.length||loop.on)return;
  loop.bars=Math.max(1,Math.min(8,n));
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
  onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopQuant, setLoopBpm, loop, events, loopPos,
  loadArrangement, loopChordDeg,
};
