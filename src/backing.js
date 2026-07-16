import { AC, backBus, backRev, dG, dO1, dO2, noiseBuf } from './audio.js';
import { CUR, baseF, chordSteps } from './scales.js';
import { hooks } from './hooks.js';
import { SCHED_AHEAD, SCHED_TICK_MS } from './config.js';
 
/* ================= ГЕНЕРАТИВНАЯ ПОДЛОЖКА (Smart Match) =================
   ПРИНЦИП SMART MATCH: тег лада определяет стиль автоматически
     penta/blues → Lo-Fi бит со свингом  · dia/chrom → Synthwave + арпеджиатор
     ethnic/maqam → дарбука + тонический дрон · edo(19/31) → эмбиент-дрон и перезвоны
   Тональность фона всегда = текущая тоника (baseF). Пользователь может
   переопределить стиль вручную; смена лада на лету перестраивает паттерны
   без остановки — планировщик каждый шаг читает актуальные baseF()/лад. */
const back={playing:false, styleSel:'auto', eff:'lofi', bpm:84, step:0, nextT:0, timer:null};
const STYLE_BPM={lofi:84, synthwave:120, ethnic:100, ambient:64};
const STYLE_LABEL={lofi:'Lo-Fi бит', synthwave:'Synthwave', ethnic:'Дарбука+дрон', ambient:'Ambient-дрон'};
function smartStyle(){ const t=CUR().tag;
  if(t==='penta'||t==='blues')return'lofi';
  if(t==='ethnic'||t==='maqam')return'ethnic';
  if(t==='edo')return'ambient';
  return'synthwave';
}
function droneTo(v){ if(!AC)return; const t=AC.currentTime;
  dG.gain.setTargetAtTime(v,t,1.2);
  dO1.frequency.setTargetAtTime(baseF()/2,t,0.3);
  dO2.frequency.setTargetAtTime(baseF()/2*1.498,t,0.3);
}
function refreshStyle(forceBpm){
  const e=back.styleSel==='auto'?smartStyle():back.styleSel;
  const changed=e!==back.eff; back.eff=e;
  if(forceBpm||(changed&&back.styleSel==='auto')){
    back.bpm=STYLE_BPM[e]; hooks.bpm && hooks.bpm(back.bpm);
  }
  droneTo(back.playing&&(e==='ethnic'||e==='ambient') ? (e==='ambient'?0.22:0.15) : 0);
}
/* Однократные звуки перкуссии — синтез на лету, без сэмплов */
function nsrc(t){ const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.start(t); return s; }
function kick(t,v=1,f0=150,f1=46,d=0.16){
  const o=AC.createOscillator(), g=AC.createGain();
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+0.08);
  g.gain.setValueAtTime(0.9*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(backBus); o.start(t); o.stop(t+d+0.05);
}
function snare(t,v=1){
  const s=nsrc(t), f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.8;
  g.gain.setValueAtTime(0.45*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
  s.connect(f); f.connect(g); g.connect(backBus); s.stop(t+0.15);
  const o=AC.createOscillator(), og=AC.createGain(); o.type='triangle'; o.frequency.value=185;
  og.gain.setValueAtTime(0.25*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.08);
  o.connect(og); og.connect(backBus); o.start(t); o.stop(t+0.1);
}
function hat(t,v=1,open=false){
  const s=nsrc(t), f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='highpass'; f.frequency.value=7800;
  const d=open?0.28:0.05;
  g.gain.setValueAtTime(0.22*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  s.connect(f); f.connect(g); g.connect(backBus); s.stop(t+d+0.03);
}
function dum(t,v=1){ kick(t,v,130,52,0.18); }
function tek(t,v=1){
  const s=nsrc(t), f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='highpass'; f.frequency.value=4500;
  g.gain.setValueAtTime(0.3*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  s.connect(f); f.connect(g); g.connect(backBus); s.stop(t+0.06);
  const o=AC.createOscillator(), og=AC.createGain(); o.type='sine'; o.frequency.value=950;
  og.gain.setValueAtTime(0.12*v,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.03);
  o.connect(og); og.connect(backBus); o.start(t); o.stop(t+0.05);
}
function bassN(t,f,d){
  const o=AC.createOscillator(), lp=AC.createBiquadFilter(), g=AC.createGain();
  o.type='sawtooth'; o.frequency.value=f; lp.type='lowpass'; lp.frequency.value=620;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.30,t+0.012);
  g.gain.exponentialRampToValueAtTime(0.001,t+Math.max(d,0.08));
  o.connect(lp); lp.connect(g); g.connect(backBus); o.start(t); o.stop(t+d+0.08);
}
function pluckA(t,f,v,d){                    // арпеджиатор synthwave
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='square'; o.frequency.value=f;
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
  o.connect(g); g.connect(backBus); o.start(t); o.stop(t+d+0.05);
}
function chime(t){                           // генеративные перезвоны для эмбиента
  const s=CUR(), iv=s.iv;
  const st=iv[(Math.random()*iv.length)|0]+s.edo*(1+((Math.random()*2)|0));
  const f=baseF()*Math.pow(2,st/s.edo);
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='sine'; o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.10,t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t+2.4);
  o.connect(g); g.connect(backBus); g.connect(backRev);
  o.start(t); o.stop(t+2.6);
}
const bassRoot=()=>baseF()/2;
const arpTones=()=>{ const s=CUR();
  return chordSteps(0).slice(0,3).map(x=>baseF()*Math.pow(2,x/s.edo)); };
const PAT={
  lofi:{sw:0.30,
    kick:[1,0,0,0,0,0,0,.7,0,0,1,0,0,0,0,0],
    snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    hat:[.5,0,.35,0,.5,0,.35,.25,.5,0,.35,0,.5,0,.35,.2],
    bass:{0:[1,3],10:[1,2],14:[1.5,1]}},
  synthwave:{sw:0,
    kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    hat:[0,0,.5,0,0,0,.5,0,0,0,.5,0,0,0,.6,0],
    bass:'oct'},
  ethnic:{sw:0,   // маqсум: Дум-Тек-—-Тек-Дум-—-Тек-—
    dum:[1,0,0,0,0,0,0,0,.9,0,0,0,0,0,0,0],
    tek:[0,0,.8,0,0,0,.7,0,0,0,0,0,.8,0,.4,0]},
};
function schedStep(st,t){
  const e=back.eff, sp=60/back.bpm/4;
  if(e==='ambient'){ if(Math.random()<0.07)chime(t); return; }
  const P=PAT[e];
  const T=t+((P.sw&&st%2)?sp*P.sw:0);        // свинг: нечётные 16-е позже
  if(e==='ethnic'){ if(P.dum[st])dum(T,P.dum[st]); if(P.tek[st])tek(T,P.tek[st]); return; }
  if(P.kick[st])kick(T,P.kick[st]);
  if(P.snare[st])snare(T,P.snare[st]);
  if(P.hat[st])hat(T,P.hat[st], e==='synthwave'&&st===14);
  if(P.bass==='oct'){ if(st%2===0)bassN(T,bassRoot()*(st%4===2?2:1),sp*0.95); }
  else if(P.bass&&P.bass[st]){ const[m,d]=P.bass[st]; bassN(T,bassRoot()*m,sp*d); }
  if(e==='synthwave'){ const tn=arpTones(); pluckA(T,tn[st%tn.length]*2,0.09,sp*0.9); }
}
/* Планировщик «двух часов»: setInterval будит нас каждые 25 мс,
   а события ставятся точно по часам AudioContext с опережением 0.14 с. */
function schedTick(){
  const ahead=SCHED_AHEAD;
  while(back.nextT<AC.currentTime+ahead){
    schedStep(back.step,back.nextT);
    back.nextT+=60/back.bpm/4;
    back.step=(back.step+1)%16;
  }
}
function toggleBack(){
  if(!AC)return;
  if(!back.playing){
    back.playing=true; back.step=0; back.nextT=AC.currentTime+0.08;
    back.timer=setInterval(schedTick,SCHED_TICK_MS);
    hooks.back && hooks.back(back.playing);
  }else{
    back.playing=false; clearInterval(back.timer);
    hooks.back && hooks.back(back.playing);
  }
  refreshStyle(false);
}
 
/* Экспорт: узлы и лад читаются только внутри тел функций (живые связки). */
export { back, toggleBack, refreshStyle, STYLE_LABEL };
