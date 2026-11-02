/* CORE-1 CP1: the guided hand measuring page. No audio, no app state, no setting touched: camera → the app's own detector and search schedule → numbers
   on screen. Sums: handstats-calc.js. Nothing leaves the device unless the person copies the text (rule #33); the camera's name is not in it. */
import { createDetector } from '../../../core/handdet.js';
import { schedNew, schedPlan, schedAfter } from '../../../core/pure/handsched.js';
import { handOf, report } from './handstats-calc.js';

const $=id=>document.getElementById(id), POLICY='2s', SETTLE_MS=2000, MEASURE_MS=8000, MOVE_MS=10000, MIN_SEEN=0.5;
const STEPS=[
  { id:'near', ms:MEASURE_MS, ru:'Поднесите играющую руку так близко к экрану, как вам хочется играть. Держите неподвижно.', en:'Bring your playing hand as close to the screen as you want to play. Hold it still.' },
  { id:'far', ms:MEASURE_MS, ru:'Теперь отведите руку так далеко, как вам хочется играть. Держите неподвижно.', en:'Now move it as far as you want to play. Hold it still.' },
  { id:'pinch', ms:MEASURE_MS, ru:'Рука посередине. Соедините большой и указательный пальцы. Держите неподвижно.', en:'Hand halfway. Touch thumb to index finger. Hold it still.' },
  { id:'open', ms:MEASURE_MS, ru:'Рука на том же месте. Разожмите пальцы. Держите неподвижно.', en:'Same place. Open your fingers. Hold it still.' },
  { id:'move', ms:MOVE_MS, ru:'Медленно ведите руку от ближней точки к дальней и обратно, пока идёт полоса.', en:'Slowly move your hand from near to far and back while the bar runs.' },
];
const WORDS={
  title:['Измерим вашу руку: около минуты, 5 коротких шагов. Звука нет. Изображение остаётся на устройстве.','We will measure your hand: about a minute, 5 short steps. No sound. Pictures stay on this device.'],
  start:['Начать','Start'], loading:['Загрузка, подождите…','Loading, please wait…'], ready:['Готово, измеряем','Ready, measure'],
  hold:['Приготовьтесь…','Get ready…'], measuring:['Измеряем…','Measuring…'],
  noHand:['Руку почти не было видно. Повторите этот шаг при хорошем свете.','Your hand was barely visible. Repeat this step in good light.'],
  noCam:['Камера не открылась. Разрешите доступ к камере и нажмите ещё раз.','The camera did not open. Allow camera access and press again.'],
  done:['Готово! Скопируйте текст и пришлите его.','Done! Copy the text and send it.'],
  copy:['Скопировать','Copy'], copied:['Скопировано. Пришлите этот текст.','Copied. Send this text.'],
  copyFail:['Не скопировалось: выделите текст ниже вручную.','Copying failed: select the text below by hand.'], again:['Измерить ещё раз','Measure again'],
};
const say=(ru,en)=>{ const b=$('say'); b.textContent=''; for(const [c,x] of [['ru',ru],['en',en]]){ const p=document.createElement('p'); p.className=c; p.textContent=x; b.append(p); } };
const label=(el,w)=>{ el.textContent=w[0]; const s=document.createElement('small'); s.textContent=w[1]; el.append(s); };
const note=w=>{ $('note').textContent= w ? w[0]+' / '+w[1] : ''; };

let det=null, delegate='', stream=null, sched=schedNew(), hand=null, tap=null, phase='intro', result=null;
/* one camera frame through the app's schedule; `tap` collects while a step measures */
function frame(t){
  if(!det) return;
  const r=det.run($('video'), t, schedPlan(sched,POLICY), POLICY);
  sched=schedAfter(sched, r.action.split('>').pop(), r.n);
  feed(r.res.landmarks, t);
}
function feed(landmarks,t){ hand=handOf(landmarks); if(tap) tap({ t, hand }); }
function pump(){ const v=$('video');
  if(v.requestVideoFrameCallback){ const f=()=>{ frame(performance.now()); v.requestVideoFrameCallback(f); }; v.requestVideoFrameCallback(f); return; }   // the app's clock for dt: performance.now
  let last=-1; const f=()=>{ requestAnimationFrame(f); if(v.currentTime!==last){ last=v.currentTime; frame(performance.now()); } }; requestAnimationFrame(f);
}
async function setup(){
  const blank=()=>{ const c=typeof OffscreenCanvas!=='undefined' ? new OffscreenCanvas(640,480) : Object.assign(document.createElement('canvas'),{ width:640, height:480 }); c.getContext('2d'); return c; };
  stream=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ ideal:640 }, height:{ ideal:480 } }, audio:false });
  const v=$('video'); v.srcObject=stream; v.hidden=false; await v.play();
  if(!det){ try{ det=await createDetector({ delegate:'GPU', blank }); delegate='GPU'; }catch(e){ det=await createDetector({ delegate:'CPU', blank }); delegate='CPU'; } }
  try{ await navigator.wakeLock.request('screen'); }catch(e){}
  pump();
}
const info=()=>{ const v=$('video'), s=stream&&stream.getVideoTracks()[0]&&stream.getVideoTracks()[0].getSettings?stream.getVideoTracks()[0].getSettings():{};
  return { ua:navigator.userAgent, w:v.videoWidth, h:v.videoHeight, fps:s.frameRate??null, delegate, portrait:innerHeight>innerWidth, at:new Date().toISOString().slice(0,10) }; };

const STORE={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* one step: the person presses, a short settling time, then the measuring bar */
async function measure(S){
  $('go').disabled=true; note(null); label($('go'),WORDS.hold); await sleep(SETTLE_MS);
  label($('go'),WORDS.measuring); $('bar').hidden=false;
  const got=[], t0=performance.now(); tap=x=>got.push(x);
  await new Promise(res=>{ const f=()=>{ const u=(performance.now()-t0)/S.ms; $('fill').style.width=Math.min(100,u*100)+'%'; if(u>=1) res(); else requestAnimationFrame(f); }; f(); });
  tap=null; $('bar').hidden=true; $('fill').style.width='0'; $('go').disabled=false;
  return got;
}
let at=0;
const showStep=()=>{ const S=STEPS[at]; phase='step:'+S.id; $('step').textContent=`${at+1} / ${STEPS.length}`; say(S.ru,S.en); label($('go'),WORDS.ready); };
function finish(){
  result=report(STORE,info()); phase='done'; $('video').hidden=true; $('step').textContent=''; say(...WORDS.done); label($('go'),WORDS.copy);
  const o=$('out'); o.value=JSON.stringify(result); o.hidden=false; label($('again'),WORDS.again); $('again').hidden=false;
}
async function copy(){ const o=$('out');
  try{ await navigator.clipboard.writeText(o.value); note(WORDS.copied); }
  catch(e){ o.focus(); o.select(); note(WORDS.copyFail); } }
async function press(){
  if(phase==='intro'||phase==='nocam'){ $('go').disabled=true; label($('go'),WORDS.loading); note(null);
    try{ await setup(); }catch(e){ phase='nocam'; $('go').disabled=false; label($('go'),WORDS.start); note(WORDS.noCam); return; }
    $('go').disabled=false; at=0; showStep(); return; }
  if(phase==='done') return copy();
  if(!phase.startsWith('step:')) return;
  const S=STEPS[at], got=await measure(S), seen=got.filter(x=>x.hand).length;
  if(seen<got.length*MIN_SEEN || !got.length){ note(WORDS.noHand); return; }
  STORE[S.id]=got; at++;
  if(at<STEPS.length) showStep(); else finish();
}
$('go').onclick=press;
$('again').onclick=()=>{ for(const k in STORE) delete STORE[k]; result=null; $('out').hidden=true; $('again').hidden=true; $('video').hidden=false; note(null); at=0; showStep(); };
addEventListener('pagehide',()=>{ if(stream) for(const t of stream.getTracks()) t.stop(); });
say(...WORDS.title); label($('go'),WORDS.start);

/* for tools/smoke-paths.mjs: the page's state, and whole steps fed by script through the same sums */
window.__handstats={ phase:()=>phase, loaded:()=>!!det, steps:()=>STEPS.map(s=>s.id), fill:(data)=>{ for(const id of Object.keys(data)) STORE[id]=data[id]; at=STEPS.length; finish(); return result; } };
