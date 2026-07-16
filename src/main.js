import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { FXW, ZB, FINGER_TIPS, FX_META, REV_COLOR, PINCH_ON, PINCH_HOLD, PINCH_OFF, REV_NEAR, REV_RANGE, ROW_HYST, WATCHDOG_MS, SCHED_AHEAD, SCHED_TICK_MS } from './config.js';
import { scaleIdx, tonic, seventh, leadIdx, chIdx, revDisp, fx, setScaleIdx, setTonic, setSeventh, setChIdx, setRevDisp } from './state.js';
import { NOTE_NAMES, ROMAN, OCT_ROMAN, range, SCALES, CUR, IVX, baseF, isTert, fifthStep, chordSteps, leadFreq, chordFreqs, name24, stepName, rowLabel, centsOf, qual, SEV, chordLabel, chordNotesStr } from './scales.js';
import { hooks } from './hooks.js';
import { initAudio, AC, setLeadInstr, applyParams, noteOn, noteOff, chordOn, chordGlide, chordOff, chordHold, LEAD_INSTR, CHORD_INSTR, backBus, backRev, dG, dO1, dO2, noiseBuf } from './audio.js';
 
/* =====================================================================
   AIR SYNTH 3 — жестовый синтезатор + интерактивный учебник ладов
   ---------------------------------------------------------------------
   Зоны экрана (по X, во всю высоту):
     [ ЭФФЕКТЫ 20% ] [ АККОРДЫ ~40% ] [ СОЛО ~40% ]
   Обе руки независимы: каждая играет ту зону, где начался её щипок.
   Эффекты и Z-реверб действуют ТОЛЬКО на соло-канал.
   Движок звука — чистый Web Audio (без библиотек): лид-банки из версии 2
   сохранены, добавлен пул аккордовых голосов и генеративная подложка.
   ===================================================================== */
 
 
 
/* ================= СОСТОЯНИЕ ================= */
 
const clamp01=v=>Math.max(0,Math.min(1,v));
 
 
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
  Object.keys(chordHold).forEach(k=>ENG.chOff(k)); }
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
 
/* ================= ВСПОМОГАТЕЛЬНОЕ ================= */
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
function hexA(hex,a){ const n=parseInt(hex.slice(1),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
 
/* ================= КАМЕРА + MEDIAPIPE ================= */
const video=document.getElementById('video');
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){this.rect(x,y,w,h);return this;};
let landmarker=null, lastTs=-1, latest=null;
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize',resize); resize();
 
async function initVision(msg){
  msg('Загружаю модель распознавания рук…');
  const files=await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  landmarker=await HandLandmarker.createFromOptions(files,{
    baseOptions:{
      modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate:"GPU"
    },
    runningMode:"VIDEO", numHands:2,
    minHandDetectionConfidence:0.5, minTrackingConfidence:0.5
  });
  msg('Включаю камеру…');
  const stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
  video.srcObject=stream; await video.play();
}
 
/* ================= ОБРАБОТКА РУК =================
   ПАРСИНГ MEDIAPIPE: result.landmarks — массив рук; в каждой 21 точка
   с нормированными координатами (x,y ∈ 0..1, origin слева-сверху КАДРА).
   Видео зеркалим, поэтому экранный x = (1 − lm.x) · W, y = lm.y · H.
   Ключевые точки: 4 — кончик большого, 8/12/16/20 — кончики пальцев,
   0 — запястье, 9 — основание среднего (по паре 0–9 меряем «глубину» Z:
   видимый размер кисти стабильнее, чем сырая z-координата модели).
   result.handednesses[i][0].categoryName ('Left'/'Right') — стабильный
   ключ руки между кадрами: у каждой руки свой независимый автомат щипка. */
const HANDS={}; let leadOwner=null;
const zoneAt=(x,W)=> x<FXW*W?'fx' : x<ZB*W?'ch':'ld';
const zoneX =(z,W)=> z==='ch'?[FXW*W,ZB*W]:[ZB*W,W];
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
    if(S.zone==='ch')WchOff(key);
  }
  S.pinch=false; S.adj=null; S.deg=-1;
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
    const S=HANDS[key]||(HANDS[key]={pinch:false,deg:-1,oct:0,zone:null,vol:.6,rev:0,adj:null,sm:{}});
    S.seen=now; S.lm=lm;
 
    const r=pinchRatios(lm), [mf,mv]=minFinger(r);
 
    if(!S.pinch&&mv<PINCH_ON){
      /* Захват щипка: палец задаёт октаву, а ЗОНА фиксируется по точке
         щипка и не меняется до отпускания — двигая руку по X ради
         громкости, нельзя случайно перескочить в соседнюю колонку. */
      S.pinch=true; S.oct=FINGER_TIPS.indexOf(mf); S.deg=-1; S.sm={};
      const px=(1-(lm[4].x+lm[mf].x)/2)*W;
      S.zone=zoneAt(px,W);
      if(S.zone==='fx'){
        const meta=FX_META.find(m=>m.finger===mf);
        S.adj={k:meta.k,y0:lm[4].y*H,base:fx[meta.k]};
      }else if(S.zone==='ld'){
        leadOwner=key;                       // приоритет последней ноты
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
        const rows=IVX().length;
        S.deg=degHyst(y,rows,H,S.deg);
        const[zx0,zx1]=zoneX(S.zone,W);
        S.vol=0.2+0.8*clamp01((x-zx0)/(zx1-zx0));
        if(S.zone==='ld'){
          if(leadOwner===key){
            const hs=emaS(S,'hs',dist(lm[0],lm[9]),0.15);
            S.rev=clamp01((REV_NEAR-hs)/REV_RANGE); setRevDisp(S.rev);
            WleadOn({freq:leadFreq(S.deg,S.oct),vol:S.vol,rev:S.rev,
                     vib:fx.vib,drv:fx.drv,trm:fx.trm,dly:fx.dly,inst:leadIdx});
          }
        }else{ // 'ch'
          const freqs=chordFreqs(S.deg,S.oct);
          if(!chordHold[key])WchOn(key,freqs,S.vol,chIdx);
          else WchSet(key,freqs,S.vol);
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
}
 
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
  let chAct=-1, ldAct=-1;
  for(const k in HANDS){ const S=HANDS[k];
    if(S.pinch&&S.deg>=0){
      if(S.zone==='ch')chAct=S.deg;
      if(S.zone==='ld'&&leadOwner===k)ldAct=S.deg;
    }}
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
      if(S.pinch&&(S.zone==='ch'||S.zone==='ld')&&S.deg>=0){
        // светящийся круг вокруг точки щипка
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
 
/* ================= ЦИКЛ ================= */
function loop(){
  requestAnimationFrame(loop);
  if(video.readyState>=2&&landmarker){
    const ts=performance.now();
    if(ts>lastTs){
      try{latest=landmarker.detectForVideo(video,ts);}catch(e){}
      lastTs=ts;
    }
  }
  processHands(latest);
  draw(latest);
}
 
/* ================= UI ================= */
const $=id=>document.getElementById(id);
const statusEl=$('status'), recBtn=$('rec'), backBtn=$('backBtn'),
      selScale=$('selScale'), selTonic=$('selTonic'),
      selLead=$('selLead'), selChord=$('selChord'), selStyle=$('selStyle'),
      bpmEl=$('bpm'), bpmV=$('bpmV'), bvolEl=$('bvol'), bvolV=$('bvolV'),
      scaleBtn=$('scaleBtn'), panelEl=$('panel');
 
function buildUI(){
  // лады с группировкой
  let g=null, og=null;
  SCALES.forEach((s,i)=>{
    if(s.grp!==g){ g=s.grp; og=document.createElement('optgroup'); og.label=g; selScale.appendChild(og); }
    const o=document.createElement('option'); o.value=i; o.textContent=s.name; og.appendChild(o);
  });
  selScale.value=scaleIdx;
  NOTE_NAMES.forEach((n,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=n; selTonic.appendChild(o);
  });
  selTonic.value=tonic;
  LEAD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selLead.appendChild(o);
  });
  CHORD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selChord.appendChild(o);
  });
  [['auto','Авто (Smart Match)'],['lofi','Lo-Fi бит'],['synthwave','Synthwave'],
   ['ethnic','Дарбука + дрон'],['ambient','Ambient-дрон']].forEach(([v,l])=>{
    const o=document.createElement('option'); o.value=v; o.textContent=l; selStyle.appendChild(o);
  });
  scaleBtn.textContent=SCALES[scaleIdx].name;
}
buildUI();

hooks.leadInstr = v  => selLead.value = v;
hooks.bpm       = v  => { bpmEl.value = v; bpmV.textContent = v; };
hooks.back      = p  => backBtn.textContent = p ? '❚❚ фон' : '▶ фон';
hooks.rec       = on => recBtn.classList.toggle('on', on);

$('menuBtn').onclick=()=>panelEl.classList.toggle('on');
$('panelClose').onclick=()=>panelEl.classList.remove('on');
scaleBtn.onclick=()=>panelEl.classList.toggle('on');
$('helpBtn').onclick=()=>$('helpOv').classList.add('on');
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');
$('panicBtn').onclick=panic;
 
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff(); refreshStyle(false);
  scaleBtn.textContent=SCALES[scaleIdx].name;
};
selTonic.onchange=e=>{ setTonic(+e.target.value); refreshStyle(false); };
$('qTriad').onclick=()=>{ setSeventh(false); $('qTriad').classList.add('act'); $('qSev').classList.remove('act'); };
$('qSev').onclick =()=>{ setSeventh(true);  $('qSev').classList.add('act');  $('qTriad').classList.remove('act'); };
selLead.onchange=e=>setLeadInstr(+e.target.value);
selChord.onchange=e=>setChIdx(+e.target.value);
selStyle.onchange=e=>{ back.styleSel=e.target.value; refreshStyle(back.styleSel!=='auto'); };
bpmEl.oninput=e=>{ back.bpm=+e.target.value; bpmV.textContent=back.bpm; };
bvolEl.oninput=e=>{ bvolV.textContent=e.target.value+'%';
  if(AC)backBus.gain.setTargetAtTime(e.target.value/100,AC.currentTime,0.05); };
backBtn.onclick=toggleBack;
 
recBtn.onclick=()=>{
  recording=!recording;
  recBtn.classList.toggle('on',recording);
  if(recording){recStart=performance.now()/1000;events=[];}
};
$('playBtn').onclick=()=>{recording=false;recBtn.classList.remove('on');playRec();};
$('clrBtn').onclick=()=>{events=[];playTimers.forEach(clearTimeout);playTimers=[];
  playbackUntil=0;softAllOff();};
 
/* ================= СТАРТ =================
   AudioContext создаётся строго по клику пользователя —
   иначе браузеры блокируют автовоспроизведение. */
$('startBtn').onclick=async()=>{
  const btn=$('startBtn'), msgEl=$('loadmsg'), msg=t=>msgEl.textContent=t;
  btn.disabled=true;
  try{
    initAudio();
    await AC.resume();
    refreshStyle(true);
    await initVision(msg);
    try{await navigator.wakeLock.request('screen');}catch(e){}
    $('start').classList.remove('on');
    $('bar').classList.add('on');
    loop();
  }catch(err){
    btn.disabled=false;
    msg('Не получилось: '+(err&&err.message?err.message:err)+
        '. Проверьте доступ к камере и что страница открыта по https.');
  }
};
