import { AC, setLeadInstr, applyParams, noteOn, noteOff, chordOn, chordGlide, chordOff, chordHold } from './audio.js';
import { back, toggleBack } from './backing.js';
import { leadIdx, setLatchDeg } from './state.js';
import { hooks } from './hooks.js';
 
/* ================= ЗАПИСЬ / ВОСПРОИЗВЕДЕНИЕ ================= */
let recording=false, recStart=0, events=[], playbackUntil=0, playTimers=[];
const ENG={
  leadOn:p=>{ if(p.inst!==undefined&&p.inst!==leadIdx)setLeadInstr(p.inst); applyParams(p); noteOn(); },
  leadOff:()=>noteOff(),
  chOn:(id,freqs,vol,ins)=>chordOn(id,freqs,vol,ins),
  chSet:(id,freqs,vol)=>chordGlide(id,freqs,vol),
  chOff:id=>chordOff(id),
};
const inPB=()=>performance.now()<playbackUntil;
function recEv(fn,args){ if(recording&&!inPB())
  events.push({dt:performance.now()/1000-recStart,fn,args}); }
const WleadOn =p=>{ if(!inPB()){ENG.leadOn(p); recEv('leadOn',[p]);} };
const WleadOff=()=>{ if(!inPB()){ENG.leadOff(); recEv('leadOff',[]);} };
const WchOn =(id,f,v,i)=>{ if(!inPB()){ENG.chOn(id,f,v,i); recEv('chOn',[id,f,v,i]);} };
const WchSet=(id,f,v)=>{ if(!inPB()){ENG.chSet(id,f,v); recEv('chSet',[id,f,v]);} };
const WchOff=id=>{ if(!inPB()){ENG.chOff(id); recEv('chOff',[id]);} };
function softAllOff(){ if(!AC)return; ENG.leadOff();
  Object.keys(chordHold).forEach(k=>ENG.chOff(k));   // ключ 'latch' снимается этим обходом
  setLatchDeg(-1); }
function playRec(){
  if(!events.length||!AC)return;
  playTimers.forEach(clearTimeout); playTimers=[];
  softAllOff();
  const dur=events[events.length-1].dt;
  playbackUntil=performance.now()+dur*1000+400;
  for(const ev of events)
    playTimers.push(setTimeout(()=>ENG[ev.fn](...ev.args), ev.dt*1000));
  playTimers.push(setTimeout(softAllOff, dur*1000+80));
}
function panic(){
  playTimers.forEach(clearTimeout); playTimers=[]; playbackUntil=0;
  softAllOff();
  if(back.playing)toggleBack();
  recording=false; hooks.rec && hooks.rec(false);
}
 
/* Тела бывших обработчиков ui: пишут recording/recStart/events —
   через границу модуля это невозможно, поэтому живут здесь. */
function toggleRec(){
  recording=!recording;
  hooks.rec && hooks.rec(recording);
  if(recording){recStart=performance.now()/1000;events=[];}
}
function stopRec(){ recording=false; hooks.rec && hooks.rec(false); }
function clearRec(){ events=[];playTimers.forEach(clearTimeout);playTimers=[];
  playbackUntil=0;softAllOff(); }
 
/* Экспорт: `recording` через export-клаузу — живая связка (её читает draw). */
export {
  WleadOn, WleadOff, WchOn, WchSet, WchOff,
  softAllOff, playRec, panic, inPB, recording,
  toggleRec, stopRec, clearRec,
};
