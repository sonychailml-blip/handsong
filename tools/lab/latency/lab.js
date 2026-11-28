/* LATENCY LAB (development page, not part of any app): the SHORTEST way from a hand gesture to a sound on this computer, and its measurement.
   One camera stream at a small size and the highest frame rate; each new frame (requestVideoFrameCallback) goes straight to ONE MediaPipe hand
   model (our own copy, core/vendor) on the video element itself — no snapshot, no worker, no schedule; a gesture fires a prepared click
   buffer straight into the speakers (no effects, no limiter). The microphone (in the same audio clock) hears the real clap and the click; the
   time between them is the whole delay. Each measurement also shows what the page itself can time: the frame's way from the camera to the page
   (captureTime), the recognition, and the sound's way to the speaker (baseLatency + outputLatency); the rest is inside the camera and driver.
   Microphone sound stays in memory (the last 4 s) and is never sent or kept. */
import { mpFilesOf } from '../../../core/handdet.js';
import { makeClick, analyse, clickHeard, clapNew, clapStep, tapNew, tapStep, lowY, median, CLAP, TAP } from './analyse.js';

const Q=new URLSearchParams(location.search);
const CFG={ cam:Q.get('cam')==='640' ? 640 : 320, fps:Q.get('fps')==='30' ? 30 : 60, dev:Q.get('dev')==='CPU' ? 'CPU' : 'GPU',
  g:Q.get('g')==='tap' ? 'tap' : 'clap', lat:Q.get('lat')==='int' ? 'int' : 'min', view:Q.get('view')!=='off' };
const $=id=>document.getElementById(id);
const video=$('video'), cv=$('view'), g2=cv.getContext('2d');
const R={ pf:[], loop:null, ctx:null, stream:null, L:null, click:null, ring:null, ringEnd:0, frames:[], det:[], cap:[], hands:[], ts:0, busy:false, rows:[], st:null, aspect:4/3, ready:false, err:'' };
const fmt=v=>v==null ? '—' : (Math.round(v*10)/10).toFixed(1);
const say=(s, cls='muted')=>{ const m=$('msg'); m.textContent=s; m.className=cls; };

/* the settings form: the page reloads with them in the address */
for(const [id, k, v] of [['cCam','cam',String(CFG.cam)],['cFps','fps',String(CFG.fps)],['cDev','dev',CFG.dev],['cG','g',CFG.g],['cLat','lat',CFG.lat],['cView','view',CFG.view ? 'on' : 'off']]) $(id).value=v;
$('apply').onclick=()=>{ const q=new URLSearchParams({ cam:$('cCam').value, fps:$('cFps').value, dev:$('cDev').value, g:$('cG').value, lat:$('cLat').value, view:$('cView').value }); location.search=q.toString(); };
$('rest').hidden=CFG.g!=='tap';
const HOW={ clap:['Сядьте так, чтобы обе руки были видны камере, ладони примерно в 40–60 см от ноутбука.','Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».',
  'Хлопайте не быстро, раз в 2 секунды, ладони навстречу друг другу перед камерой. После каждого хлопка — щелчок.','Сделайте 10–15 хлопков. Пропуски — не страшно, они не считаются.','Нажмите «Скопировать результаты» и пришлите их мне.'],
  tap:['Положите ладонь на стол (книгу, колено) так, чтобы камера её видела, и нажмите «Рука на месте удара» — держите руку 1 секунду.','Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».',
  'Поднимите руку на 15–20 см и резко ударьте ладонью по тому же месту. Раз в 2 секунды.','Сделайте 10–15 ударов, затем «Скопировать результаты».'] };
$('howto').innerHTML=''; for(const s of HOW[CFG.g]){ const li=document.createElement('li'); li.textContent=s; $('howto').appendChild(li); }

/* ---- the microphone ring (4 s, frames of the audio clock) ---- */
function onMic(e){ const { f, d }=e.data, N=R.ring.length; for(let i=0;i<d.length;i++) R.ring[(f+i)%N]=d[i]; R.ringEnd=f+d.length; R.micBlocks=(R.micBlocks||0)+1; }
function micWindow(a, b){ const N=R.ring.length; a=Math.max(a, R.ringEnd-N+1); b=Math.min(b, R.ringEnd); const x=new Float32Array(Math.max(0,b-a)); for(let i=0;i<x.length;i++) x[i]=R.ring[(a+i)%N]; return { x, a }; }

/* the click, as directly as Web Audio allows; returns the audio-clock frame it was started at */
function playClick(){ const s=R.ctx.createBufferSource(); s.buffer=R.clickBuf; s.connect(R.ctx.destination); s.start(); return Math.round(R.ctx.currentTime*R.ctx.sampleRate); }
const WAIT_MS=700;
const outMs=()=>((R.ctx.baseLatency||0)+(R.ctx.outputLatency||0))*1000;

function fire(why, part){
  if(R.busy || !R.ready) return; R.busy=true;
  const play=playClick(), sr=R.ctx.sampleRate, out=outMs();
  setTimeout(()=>{
    const w=micWindow(play-Math.round(1.0*sr), play+Math.round(0.6*sr)), r=analyse(w.x, sr, R.click, play-w.a);
    const { why:fail, ...rest }=r, row={ n:R.rows.length+1, ...part, out, ...rest, why, fail };
    if(r.ok) row.rest=r.total-(part.cap??0)-part.det-out;
    R.rows.push(row); render(); R.busy=false;
  }, WAIT_MS);
}
/* «Проверка звука»: the click alone — the microphone must find it (and the speaker→microphone round trip is shown) */
function loopTest(){
  if(R.busy) return; R.busy=true; const play=playClick(), sr=R.ctx.sampleRate;
  setTimeout(()=>{ const w=micWindow(play-Math.round(0.1*sr), play+Math.round(0.6*sr)), p=play-w.a, c=clickHeard(w.x, R.click, p, p+Math.round(0.4*sr));
    R.loop={ ok:c.ok, score:Math.round(c.score*100)/100, loud:Math.round(c.loud*10)/10, rt:c.ok ? Math.round((c.at-p)/sr*10000)/10 : null };
    if(c.ok) say(`Микрофон слышит щелчок (сходство ${c.score.toFixed(2)}; от запуска щелчка до микрофона ${fmt((c.at-p)/sr*1000)} мс). Можно хлопать.`, 'ok');
    else say(`Микрофон НЕ слышит щелчок (сходство ${c.score.toFixed(2)}, громкость над фоном ×${c.loud.toFixed(1)}). Сделайте звук громче, выключите наушники, проверьте, что выбран микрофон ноутбука.`, 'bad');
    R.busy=false; }, WAIT_MS);
}

/* ---- each new camera frame: recognise at once, then the gesture ---- */
function onFrame(now, md){
  video.requestVideoFrameCallback(onFrame);
  const at=performance.now(); R.frames.push(at); while(R.frames.length && at-R.frames[0]>2000) R.frames.shift();
  R.pf.push([at, md.presentedFrames]); while(R.pf.length>2 && at-R.pf[0][0]>2000) R.pf.shift();
  let res; try{ R.ts=Math.max(R.ts+1, Math.floor(at)); res=R.L.detectForVideo(video, R.ts); }catch(e){ R.err=String(e && e.message || e); return; }
  const done=performance.now(), hands=res.landmarks||[], det=done-at, cap=md.captureTime ? at-md.captureTime : null;
  R.det.push(det); if(R.det.length>60) R.det.shift(); if(cap!=null){ R.cap.push(cap); if(R.cap.length>60) R.cap.shift(); }
  R.hands=hands;
  if(R.resting){ if(hands.length) R.resting.push(lowY(hands[0])); return; }
  const why= CFG.g==='clap' ? clapStep(R.st, hands, R.aspect, CLAP) : tapStep(R.st, hands, TAP);
  if(why) fire(why, { cap, det, frameMs:1000/Math.max(1, R.frames.length/2) });
}

/* ---- the picture (screen frames only; never in the recognition path) and the live numbers ---- */
function draw(){
  requestAnimationFrame(draw);
  if(!R.ready) return;
  if(CFG.view){ g2.save(); g2.translate(cv.width,0); g2.scale(-1,1); g2.drawImage(video, 0, 0, cv.width, cv.height);
    g2.fillStyle='#7ee08a'; for(const h of R.hands) for(const p of h){ g2.fillRect(p.x*cv.width-2, p.y*cv.height-2, 4, 4); }
    if(CFG.g==='tap' && R.st.rest!=null){ g2.strokeStyle='#ffb44a'; g2.beginPath(); const y=(R.st.rest-TAP.margin)*cv.height; g2.moveTo(0,y); g2.lineTo(cv.width,y); g2.stroke(); }
    g2.restore(); }
  else { g2.fillStyle='#000'; g2.fillRect(0,0,cv.width,cv.height); }
}
function live(){
  if(!R.ready) return;
  const fps=R.frames.length>1 ? (R.frames.length-1)/((R.frames[R.frames.length-1]-R.frames[0])/1000) : 0;
  const P=R.pf, cam=P.length>1 ? (P[P.length-1][1]-P[0][1])/((P[P.length-1][0]-P[0][0])/1000) : 0;
  $('lFps').textContent=`камера ${fmt(cam)}, распознано ${fmt(fps)}`+(cam && cam<CFG.fps*0.8 ? ' (камера даёт меньше, чем просили: темно или не умеет)' : '')+(cam && fps<cam*0.8 ? ' (распознавание не успевает за камерой)' : '');
  $('lDet').textContent=fmt(median(R.det))+' мс'+(R.err ? ' · ошибка: '+R.err : '');
  $('lCap').textContent=R.cap.length ? fmt(median(R.cap))+' мс' : 'браузер не сообщает';
  $('lOut').textContent=`${fmt(outMs())} мс (база ${fmt((R.ctx.baseLatency||0)*1000)} + выход ${fmt((R.ctx.outputLatency||0)*1000)})`;
  $('lMic').textContent=R.micBlocks ? `идёт звук, ${R.ctx.sampleRate} Гц` : 'нет данных';
  const G=$('lGest');
  if(CFG.g==='clap') G.textContent= R.st.d!=null ? `Ладони: ${fmt(R.st.d)} ладони друг от друга (срабатывает ближе ${CLAP.near})${R.st.armed ? '' : ' — разведите руки'}` : `Рук в кадре: ${R.hands.length} (нужно две)`;
  else G.textContent= R.st.rest==null ? 'Сначала «Рука на месте удара».' : (R.st.y!=null ? `Рука: ${fmt((R.st.rest-R.st.y)*100)}% кадра над местом удара${R.st.armed ? '' : ' — поднимите руку'}` : 'Руки в кадре нет');
}
function render(){
  const tb=$('rows'); tb.innerHTML='';
  for(const r of R.rows){ const tr=document.createElement('tr'), why={ near:'ладони сошлись', lost:'рука пропала у другой', strike:'удар' }[r.why]||r.why;
    const cells= r.ok ? [r.n, fmt(r.total), fmt(r.cap), fmt(r.det), fmt(r.out), fmt(r.rest), why, `сходство ${r.score}`]
      : [r.n, { click:'щелчок не найден', clap:'жест не слышен', edge:'хлопок не найден', short:'меньше 15 мс — ошибка' }[r.fail]||'не измерено', '', '', '', '', why, r.score!=null ? `сходство ${(+r.score).toFixed(2)}` : ''];
    if(!r.ok) tr.className='muted';
    for(const c of cells){ const td=document.createElement('td'); td.textContent=String(c); tr.appendChild(td); } tb.appendChild(tr); }
  const ok=R.rows.filter(r=>r.ok);
  $('sTotal').textContent= ok.length ? `${fmt(median(ok.map(r=>r.total)))} мс` : '—';
  $('sParts').textContent= ok.length ? `из ${ok.length} измерений (не измерено ${R.rows.length-ok.length}); разброс ${fmt(Math.min(...ok.map(r=>r.total)))}…${fmt(Math.max(...ok.map(r=>r.total)))} мс. Медианы частей: кадр до страницы ${fmt(median(ok.map(r=>r.cap)))}, распознавание ${fmt(median(ok.map(r=>r.det)))}, звук до динамика ${fmt(median(ok.map(r=>r.out)))}, остальное ${fmt(median(ok.map(r=>r.rest)))} мс.` : '';
  $('copy').disabled=!R.rows.length;
}
function report(){
  const ok=R.rows.filter(r=>r.ok), s=R.stream.getVideoTracks()[0].getSettings();
  const L=[`Лаборатория задержки · ${new Date().toISOString().slice(0,16)}`, `настройки: камера ${s.width}×${s.height} @ ${s.frameRate} (просили ${CFG.cam}, ${CFG.fps}), распознавание ${CFG.dev}, жест ${CFG.g}, звук ${CFG.lat==='min' ? 'минимум' : 'interactive'}`,
    `проверка звука: ${R.loop ? (R.loop.ok ? `слышно, сходство ${R.loop.score}, громкость ×${R.loop.loud}, щелчок→микрофон ${R.loop.rt} мс` : `НЕ слышно, сходство ${R.loop.score}, громкость ×${R.loop.loud}`) : 'не делали'}; кадров/с: ${$('lFps').textContent}`,
    `звук: ${R.ctx.sampleRate} Гц, база ${fmt((R.ctx.baseLatency||0)*1000)} мс, выход ${fmt((R.ctx.outputLatency||0)*1000)} мс; браузер ${navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+|Edg\/[\d.]+/)?.[0]||'?'}`,
    ok.length ? `ИТОГ: медиана ${fmt(median(ok.map(r=>r.total)))} мс из ${ok.length} (не измерено ${R.rows.length-ok.length}), от ${fmt(Math.min(...ok.map(r=>r.total)))} до ${fmt(Math.max(...ok.map(r=>r.total)))}` : 'ИТОГ: нет измерений',
    'n · всего · кадр→страница · распознавание · звук→динамик · остальное · сработало · сходство'];
  for(const r of R.rows) L.push(r.ok ? [r.n, fmt(r.total), fmt(r.cap), fmt(r.det), fmt(r.out), fmt(r.rest), r.why, r.score].join(' · ') : `${r.n} · не измерено (${r.fail}) · ${r.why} · сходство ${r.score??'—'} · громкость ×${r.loud??'—'} · щелчок→микрофон ${r.roundtrip??'—'}`);
  return L.join('\n');
}

/* ---- the start: the audio context inside the tap (as the apps do), then microphone + camera in one request, the worklet, the model ---- */
async function start(){
  $('start').disabled=true;
  R.ctx=new AudioContext({ latencyHint:CFG.lat==='min' ? 0 : 'interactive' });
  try{
    say('Разрешите камеру и микрофон…');
    const W=CFG.cam, H=CFG.cam*3/4;
    R.stream=await navigator.mediaDevices.getUserMedia({ video:{ width:{ ideal:W }, height:{ ideal:H }, frameRate:{ ideal:CFG.fps } },
      audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    await R.ctx.resume();
    await R.ctx.audioWorklet.addModule(new URL('./tap-worklet.js', import.meta.url));
    const src=R.ctx.createMediaStreamSource(new MediaStream(R.stream.getAudioTracks())), tap=new AudioWorkletNode(R.ctx, 'lab-tap', { numberOfOutputs:1 }), mute=R.ctx.createGain();
    mute.gain.value=0; src.connect(tap); tap.connect(mute); mute.connect(R.ctx.destination); tap.port.onmessage=onMic;
    R.ring=new Float32Array(R.ctx.sampleRate*4); R.click=makeClick(R.ctx.sampleRate);
    R.clickBuf=R.ctx.createBuffer(1, R.click.length, R.ctx.sampleRate); R.clickBuf.copyToChannel(R.click, 0);
    video.srcObject=new MediaStream(R.stream.getVideoTracks()); await video.play();
    const s=R.stream.getVideoTracks()[0].getSettings(); R.aspect=(s.width||W)/(s.height||H);
    $('lCam').textContent=`${s.width}×${s.height}, ${s.frameRate} к/с${s.width!==W ? ' (камера дала другой размер)' : ''}`;
    say('Загружаю модель руки…');
    const at=mpFilesOf('own'), { HandLandmarker, FilesetResolver }=await import(at.lib), files=await FilesetResolver.forVisionTasks(at.wasm);
    R.L=await HandLandmarker.createFromOptions(files, { baseOptions:{ modelAssetPath:at.model, delegate:CFG.dev }, runningMode:'VIDEO',
      numHands:CFG.g==='clap' ? 2 : 1, minHandDetectionConfidence:0.5, minTrackingConfidence:0.5 });
    R.ts=Math.floor(performance.now()); R.L.detectForVideo(video, R.ts);   // the first recognition is slow (shaders): done before measuring
    R.st= CFG.g==='clap' ? clapNew() : tapNew();
    R.ready=true; video.requestVideoFrameCallback(onFrame); setInterval(live, 250);
    for(const id of ['loop','reset','rest']) $(id).disabled=false;
    say(CFG.g==='clap' ? 'Готово. Сначала «Проверка звука», потом хлопайте.' : 'Готово. Сначала «Рука на месте удара», потом «Проверка звука».', 'ok');
  }catch(e){ say('Не получилось: '+(e && e.message || e), 'bad'); $('start').disabled=false; }
}
$('start').onclick=start;
$('loop').onclick=loopTest;
$('reset').onclick=()=>{ R.rows=[]; render(); };
$('copy').onclick=()=>{ const t=report(); navigator.clipboard.writeText(t).then(()=>say('Результаты скопированы — вставьте их в чат.', 'ok'), ()=>{ console.log(t); say('Не удалось скопировать; текст в консоли (F12).', 'warn'); }); };   // eslint-disable-line no-console
$('rest').onclick=()=>{ if(!R.ready) return; R.resting=[]; say('Держите руку на месте удара…');
  setTimeout(()=>{ const v=R.resting; R.resting=null; if(v.length<5){ say('Рука не видна — положите её так, чтобы камера её видела, и повторите.', 'bad'); return; }
    R.st=tapNew(median(v)); say('Место удара запомнено. Теперь «Проверка звука», потом удары.', 'ok'); }, 1000); };
requestAnimationFrame(draw);
/* for tools/lab/latency/check.mjs */
window.__lab=()=>({ ready:R.ready, frames:R.frames.length, det:median(R.det), cap:median(R.cap), mic:R.micBlocks||0, err:R.err, rows:R.rows.length, sr:R.ctx && R.ctx.sampleRate, out:R.ctx ? outMs() : null });
window.__labFire=why=>fire(why, { cap:null, det:0, frameMs:0 });
