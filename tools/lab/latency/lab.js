/* LATENCY LAB (development page, not part of any app): the SHORTEST way from a hand gesture to a sound on this computer, and its measurement.
   One camera stream at a small size and the highest frame rate; each new frame (requestVideoFrameCallback) goes straight to ONE MediaPipe hand
   model (our own copy, core/vendor) on the video element itself — no snapshot, no worker, no schedule; a gesture fires a prepared click
   buffer straight into the speakers (no effects, no limiter). The microphone (in the same audio clock) hears the real clap and the click; the
   time between them is the whole delay. Each measurement also shows what the page itself can time: the frame's way from the camera to the page
   (captureTime), the recognition, and the sound's way to the speaker (baseLatency + outputLatency); the rest is inside the camera and driver.
   Microphone sound stays in memory (the last 4 s) and is never sent or kept. */
import { mpFilesOf } from '../../../core/handdet.js';
import { makeClick, analyse, clickHeard, clapNew, clapStep, tapNew, tapStep, lowY, median, CLAP, TAP, pinchNew, pinchStep, PINCH_ON } from '../../probes/light/lab-analyse.js';

const Q=new URLSearchParams(location.search);
const CFG={ cam:Q.get('cam')==='640' ? 640 : 320, fps:Q.get('fps')==='30' ? 30 : 60, dev:Q.get('dev')==='CPU' ? 'CPU' : 'GPU',
  g:['tap','flash','key','pinch'].includes(Q.get('g')) ? Q.get('g') : 'clap', lat:Q.get('lat')==='int' ? 'int' : 'min', view:Q.get('view')!=='off' };
const $=id=>document.getElementById(id);
const video=$('video'), cv=$('view'), g2=cv.getContext('2d');
const R={ fl:{ on:false, s:0, flipAt:0, next:0, pend:null, lv:[[],[]], last:null, got:[], miss:0 }, pf:[], loop:null, ctx:null, stream:null, L:null, click:null, ring:null, ringEnd:0, frames:[], det:[], cap:[], hands:[], ts:0, busy:false, rows:[], st:null, aspect:4/3, ready:false, err:'' };
const fmt=v=>v==null ? '—' : (Math.round(v*10)/10).toFixed(1);
const say=(s, cls='muted')=>{ const m=$('msg'); m.textContent=s; m.className=cls; };

/* the settings form: the page reloads with them in the address */
for(const [id, k, v] of [['cCam','cam',String(CFG.cam)],['cFps','fps',String(CFG.fps)],['cDev','dev',CFG.dev],['cG','g',CFG.g],['cLat','lat',CFG.lat],['cView','view',CFG.view ? 'on' : 'off']]) $(id).value=v;
const formQ=()=>new URLSearchParams({ cam:$('cCam').value, fps:$('cFps').value, dev:$('cDev').value, g:$('cG').value, lat:$('cLat').value, view:$('cView').value });
$('apply').onclick=()=>{ location.search=formQ().toString(); };
/* a setting changed without «Применить»: Start applies it first (the founder chose «flash», pressed Start, saw no flash) */
const formChanged=()=>$('cCam').value!==String(CFG.cam) || $('cFps').value!==String(CFG.fps) || $('cDev').value!==CFG.dev || $('cG').value!==CFG.g || $('cLat').value!==CFG.lat || $('cView').value!==(CFG.view ? 'on' : 'off');
$('rest').hidden=CFG.g!=='tap';
const HOW={ clap:['Сядьте так, чтобы обе руки были видны камере, ладони примерно в 40–60 см от ноутбука.','Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».',
  'Хлопайте не быстро, раз в 2 секунды, ладони навстречу друг другу перед камерой. После каждого хлопка — щелчок.','Сделайте 10–15 хлопков. Пропуски — не страшно, они не считаются.','Нажмите «Скопировать результаты» и пришлите их мне.'],
  tap:['Положите ладонь на стол (книгу, колено) так, чтобы камера её видела, и нажмите «Рука на месте удара» — держите руку 1 секунду.','Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».',
  'Поднимите руку на 15–20 см и резко ударьте ладонью по тому же месту. Раз в 2 секунды.','Сделайте 10–15 ударов, затем «Скопировать результаты».'],
  pinch:['Одна рука перед камерой, ближе к ноутбуку (30–40 см), ладонью к камере — как в Handsong.','Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».',
    'Стукайте НОГТЕМ большого пальца о ноготь указательного — резкий «тик», который слышит микрофон (мягкие подушечки он не слышит). Раз в 2 секунды; между щипками пальцы разводите.','Сделайте 10–15 щипков, затем «Скопировать результаты». Если пишет «жест не слышен» — стукайте резче или держите руку ближе к ноутбуку.'],
  key:['Сначала «Проверка звука»: должна появиться строка «микрофон слышит щелчок».','Резко нажимайте пробел, чтобы был слышен стук клавиши, раз в 2 секунды. После каждого нажатия — щелчок.',
    'Сделайте 10–15 нажатий, затем «Скопировать результаты». Камера и модель здесь не участвуют: это задержка звука (и немного клавиатуры).'],
  flash:['Камера должна видеть свет экрана. Проще всего: держите лист белой бумаги в 10–20 см перед камерой, повернув его к экрану, — экран будет то освещать его, то гасить. Можно и без бумаги: приглушите свет в комнате, лицо тоже освещается экраном.','Нажмите «Старт»: экран начнёт мигать белым и чёрным.',
    'Подождите 20–30 вспышек (около 20 секунд), затем «Стоп» в середине экрана.','«Скопировать результаты» и пришлите мне. Это задержка самой камеры: от экрана до кадра в странице.'] };
say(`Сейчас режим: ${{ clap:'хлопок', tap:'удар ладонью', flash:'вспышка (камера смотрит на экран)', key:'клавиша (только звук)', pinch:'щипок (как в Handsong)' }[CFG.g]}. Нажмите «Старт» и разрешите камеру и микрофон.`);
$('howto').innerHTML=''; for(const s of HOW[CFG.g]){ const li=document.createElement('li'); li.textContent=s; $('howto').appendChild(li); }

/* ---- the microphone ring (4 s, frames of the audio clock) ---- */
function onMic(e){ const { f, d }=e.data, N=R.ring.length; for(let i=0;i<d.length;i++) R.ring[(f+i)%N]=d[i]; R.ringEnd=f+d.length; R.micBlocks=(R.micBlocks||0)+1; }
function micWindow(a, b){ const N=R.ring.length; a=Math.max(a, R.ringEnd-N+1); b=Math.min(b, R.ringEnd); const x=new Float32Array(Math.max(0,b-a)); for(let i=0;i<x.length;i++) x[i]=R.ring[(a+i)%N]; return { x, a }; }

/* the click, as directly as Web Audio allows; returns the audio-clock frame it was started at */
function playClick(){ const s=R.ctx.createBufferSource(); s.buffer=R.clickBuf; s.connect(R.ctx.destination); s.start(); return Math.round(R.ctx.currentTime*R.ctx.sampleRate); }
const WAIT_MS=700;
const outMs=()=>((R.ctx.baseLatency||0)+(R.ctx.outputLatency||0))*1000;

function fire(why, part){
  if(!R.ready) return;
  if(R.busy){ R.skipped=(R.skipped||0)+1; say(`Слишком часто: пока разбирается прошлый замер (0,7 с), новый жест не засчитывается (пропущено ${R.skipped}). Делайте паузу около 2 секунд.`, 'warn'); return; }
  R.busy=true;
  const play=playClick(), sr=R.ctx.sampleRate, out=outMs();
  setTimeout(()=>{
    const w=micWindow(play-Math.round(1.0*sr), play+Math.round(0.6*sr)), r=analyse(w.x, sr, R.click, play-w.a, R.lastClick!=null ? Math.max(0, R.lastClick+Math.round(0.05*sr)-w.a) : 0, R.rt);
    if(r.ok) R.lastClick=w.a+r.clickAt;   // the next search for a gesture starts after this click
    const { why:fail, clickAt, ...rest }=r, row={ n:R.rows.length+1, ...part, out, ...rest, why, fail };
    if(r.ok) row.rest=r.total-(part.cap??0)-part.det-out;
    R.rows.push(row); render(); R.busy=false;
  }, WAIT_MS);
}
/* «Проверка звука»: the click alone, three times — the microphone must find it; the median click → microphone time (R.rt) then holds the click
   search of every measurement (LIGHT-12g: run by itself at the start) */
const once=()=>new Promise(res=>{ const play=playClick(), sr=R.ctx.sampleRate;
  setTimeout(()=>{ const w=micWindow(play-Math.round(0.1*sr), play+Math.round(0.6*sr)), p=play-w.a, c=clickHeard(w.x, R.click, p, p+Math.round(0.4*sr), 0, p);
    res({ ok:c.ok, score:c.score, loud:c.loud, rt:c.ok ? (c.at-p)/sr*1000 : null }); }, WAIT_MS); });
async function loopTest(){
  if(R.busy) return; R.busy=true; say('Проверка звука: три щелчка…');
  const got=[]; for(let i=0;i<3;i++){ got.push(await once()); await new Promise(r=>setTimeout(r, 150)); }
  /* the click may arrive twice (the founder's laptop: a second copy ≈ 120–170 ms later): the time is the EARLIEST arrival that at least two of
     the three agree on within 10 ms */
  const ok=got.filter(g=>g.ok), all=ok.map(g=>g.rt).sort((a,b)=>a-b), near=all.length ? all.filter(v=>v-all[0]<=10) : [], two=near.length>=2 ? near : all.slice(1).filter(v=>v-all[1]<=10);
  const rts=two.length>=2 ? two : [], rt=median(rts), spread=rts.length ? Math.max(...rts)-Math.min(...rts) : null;
  R.loop={ ok:rts.length>=2, all:all.map(v=>Math.round(v)), n:ok.length, score:Math.round(median(got.map(g=>g.score))*100)/100, loud:Math.round(median(got.map(g=>g.loud))*10)/10, rt:rt!=null ? Math.round(rt*10)/10 : null, spread };
  if(R.loop.ok){ R.rt=rt; say(`Микрофон слышит щелчок: ${ok.length} из 3, от запуска щелчка до микрофона ${fmt(rt)} мс (разброс ${fmt(spread)}). Можно начинать.`, 'ok'); }
  else { R.rt=null; say(`Микрофон не слышит щелчок уверенно (${ok.length} из 3${spread!=null ? `, разброс ${fmt(spread)} мс` : ''}). Включите динамики погромче, отключите наушники и нажмите «Проверка звука» ещё раз.`, 'bad'); }
  R.busy=false;
}

/* ---- each new camera frame: recognise at once, then the gesture ---- */
function onFrame(now, md){
  video.requestVideoFrameCallback(onFrame);
  const at=performance.now(); R.frames.push(at); while(R.frames.length && at-R.frames[0]>2000) R.frames.shift();
  R.pf.push([at, md.presentedFrames]); while(R.pf.length>2 && at-R.pf[0][0]>2000) R.pf.shift();
  if(CFG.g==='flash'){ flashFrame(at, md); return; }
  let res; try{ R.ts=Math.max(R.ts+1, Math.floor(at)); res=R.L.detectForVideo(video, R.ts); }catch(e){ R.err=String(e && e.message || e); return; }
  const done=performance.now(), hands=res.landmarks||[], det=done-at, cap=md.captureTime ? at-md.captureTime : null;
  R.det.push(det); if(R.det.length>60) R.det.shift(); if(cap!=null){ R.cap.push(cap); if(R.cap.length>60) R.cap.shift(); }
  R.hands=hands;
  if(R.resting){ if(hands.length) R.resting.push(lowY(hands[0])); return; }
  const why= CFG.g==='clap' ? clapStep(R.st, hands, R.aspect, CLAP) : CFG.g==='pinch' ? pinchStep(R.st, hands) : tapStep(R.st, hands, TAP);
  if(why) fire(why, { cap, det, frameMs:1000/Math.max(1, R.frames.length/2) });
}

/* ---- LIGHT-12c: the CAMERA alone — the screen flips black/white, the camera looks at it (turned to it, or through a mirror); each flip's time
   to the first frame past the middle brightness = screen → frame in the page (it includes the screen's own output, usually 20–50 ms) ---- */
const sm=document.createElement('canvas'); sm.width=16; sm.height=12; const sg=sm.getContext('2d', { willReadFrequently:true });
function bright(){ sg.drawImage(video, 0, 0, 16, 12); const d=sg.getImageData(0, 0, 16, 12).data; let v=0; for(let i=0;i<d.length;i+=4) v+=d[i]*0.3+d[i+1]*0.59+d[i+2]*0.11; return v/(d.length/4); }
const FLASH_MIN=6;   // brightness difference (of 255, the frame's 16×12 average) between the settled black and white states — a lit sheet of paper gives far more
function flashFrame(at, md){
  const F=R.fl, b=bright(); F.last=b; if(!F.on || !F.pend) return;
  const lo=median(F.lv[0]), hi=median(F.lv[1]); if(lo==null || hi==null || hi-lo<FLASH_MIN) return;
  const mid=(lo+hi)/2;
  if(F.pend.s ? b>mid : b<mid){ F.got.push({ lat:at-F.pend.at, cap:md.captureTime ? md.captureTime-F.pend.at : null }); F.pend=null; }
}
function flashTick(now){
  const F=R.fl; if(!F.on || now<F.next) return;
  if(F.last!=null) F.lv[F.s].push(F.last);   // the settled brightness of the state that ends now
  if(F.pend) F.miss++;
  F.s^=1; $('flash').classList.toggle('white', !!F.s); F.flipAt=performance.now(); F.pend={ s:F.s, at:F.flipAt };
  F.next=now+600+Math.random()*250;
  const lo=median(F.lv[0]), hi=median(F.lv[1]), ok=F.got;
  $('flashInfo').textContent= lo!=null && hi!=null && hi-lo<FLASH_MIN ? `Камера не видит вспышек (разница яркости ${fmt(hi-lo)}, нужно от ${FLASH_MIN}). Поднесите лист белой бумаги ближе к камере, повернув к экрану, или приглушите свет в комнате.`
    : `Вспышек поймано: ${ok.length}${F.miss ? `, пропущено ${F.miss}` : ''}. Экран → кадр: ${ok.length ? fmt(median(ok.map(g=>g.lat)))+' мс' : '—'}`;
}
function flashSummary(){ const ok=R.fl.got; if(!ok.length) return null;
  const caps=ok.map(g=>g.cap).filter(v=>v!=null);
  return { n:ok.length, miss:R.fl.miss, lat:median(ok.map(g=>g.lat)), min:Math.min(...ok.map(g=>g.lat)), max:Math.max(...ok.map(g=>g.lat)), cap:caps.length ? median(caps) : null }; }

/* ---- the picture (screen frames only; never in the recognition path) and the live numbers ---- */
function draw(){
  requestAnimationFrame(draw);
  if(!R.ready) return;
  if(CFG.g==='flash'){ flashTick(performance.now()); return; }
  if(CFG.g==='key') return;
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
  if(CFG.g==='key'){ G.textContent='Резко нажимайте пробел.'; return; }
  if(CFG.g==='pinch'){ G.textContent= R.st.r!=null ? `Пальцы: ${fmt(R.st.r)} (щипок ниже ${PINCH_ON})${R.st.on ? ' — сжато, разведите пальцы' : ''}` : 'Руки в кадре нет'; return; }
  if(CFG.g==='flash'){ const f=flashSummary(); G.textContent=f ? `Камера: от экрана до кадра в странице ${fmt(f.lat)} мс (медиана из ${f.n})` : 'Вспышек ещё нет'; if(f) renderFlash(f); return; }
  if(CFG.g==='clap') G.textContent= R.st.d!=null ? `Ладони: ${fmt(R.st.d)} ладони друг от друга (срабатывает ближе ${CLAP.near})${R.st.armed ? '' : ' — разведите руки'}` : `Рук в кадре: ${R.hands.length} (нужно две)`;
  else G.textContent= R.st.rest==null ? 'Сначала «Рука на месте удара».' : (R.st.y!=null ? `Рука: ${fmt((R.st.rest-R.st.y)*100)}% кадра над местом удара${R.st.armed ? '' : ' — поднимите руку'}` : 'Руки в кадре нет');
}
function renderFlash(f){
  $('sTotal').textContent=`${fmt(f.lat)} мс`;
  $('sParts').textContent=`задержка камеры: от смены экрана до кадра в странице, медиана из ${f.n} вспышек (пропущено ${f.miss}), разброс ${fmt(f.min)}…${fmt(f.max)} мс`+
    (f.cap!=null ? `; из них до отметки «кадр снят» в браузере ${fmt(f.cap)} мс, после неё ${fmt(f.lat-f.cap)} мс` : '')+'. Включает вывод картинки на экран (обычно 20–50 мс).';
  $('copy').disabled=false;
}
function render(){
  const tb=$('rows'); tb.innerHTML='';
  for(const r of R.rows){ const tr=document.createElement('tr'), why={ near:'ладони сошлись', lost:'рука пропала у другой', strike:'удар', key:'клавиша', pinch:'щипок' }[r.why]||r.why;
    const cells= r.ok ? [r.n, fmt(r.total), fmt(r.cap), fmt(r.det), fmt(r.out), fmt(r.rest), why, `сходство ${r.score} · петля ${fmt(r.roundtrip)}`]
      : [r.n, { click:'щелчок не найден', clap:'жест не слышен', edge:'хлопок не найден', short:'меньше 15 мс — ошибка' }[r.fail]||'не измерено', '', '', '', '', why, r.score!=null ? `сходство ${(+r.score).toFixed(2)}` : ''];
    if(!r.ok) tr.className='muted';
    for(const c of cells){ const td=document.createElement('td'); td.textContent=String(c); tr.appendChild(td); } tb.appendChild(tr); }
  const ok=R.rows.filter(r=>r.ok);
  $('sTotal').textContent= ok.length ? `${fmt(median(ok.map(r=>r.total)))} мс` : '—';
  $('sParts').textContent= ok.length ? `из ${ok.length} измерений (не измерено ${R.rows.length-ok.length}); разброс ${fmt(Math.min(...ok.map(r=>r.total)))}…${fmt(Math.max(...ok.map(r=>r.total)))} мс. Медианы частей: кадр до страницы ${fmt(median(ok.map(r=>r.cap)))}, распознавание ${fmt(median(ok.map(r=>r.det)))}, звук до динамика ${fmt(median(ok.map(r=>r.out)))}, остальное ${fmt(median(ok.map(r=>r.rest)))} мс.` : '';
  $('copy').disabled=!R.rows.length;
}
function report(){
  const ok=R.rows.filter(r=>r.ok), vt=R.stream.getVideoTracks()[0], s=vt ? vt.getSettings() : {}, f=flashSummary();
  const L=[`Лаборатория задержки · ${new Date().toISOString().slice(0,16)}`, `настройки: камера ${vt ? `${s.width}×${s.height} @ ${s.frameRate} (просили ${CFG.cam}, ${CFG.fps})` : 'не нужна'}, распознавание ${CFG.dev}, жест ${CFG.g}, звук ${CFG.lat==='min' ? 'минимум' : 'interactive'}`,
    `проверка звука: ${R.loop ? `${R.loop.ok ? 'слышно' : 'НЕ уверенно'} ${R.loop.n} из 3, сходство ${R.loop.score}, громкость ×${R.loop.loud}, щелчок→микрофон ${R.loop.rt ?? '—'} мс (разброс ${R.loop.spread!=null ? fmt(R.loop.spread) : '—'}; все три: ${R.loop.all.join(', ')})` : 'не делали'}; кадров/с: ${$('lFps').textContent}`,
    `звук: ${R.ctx.sampleRate} Гц, база ${fmt((R.ctx.baseLatency||0)*1000)} мс, выход ${fmt((R.ctx.outputLatency||0)*1000)} мс; браузер ${navigator.userAgent.match(/Chrome\/[\d.]+|Firefox\/[\d.]+|Edg\/[\d.]+/)?.[0]||'?'}`,
    ...(CFG.g==='flash' ? [f ? `КАМЕРА: экран → кадр в странице медиана ${fmt(f.lat)} мс из ${f.n} (пропущено ${f.miss}), от ${fmt(f.min)} до ${fmt(f.max)}${f.cap!=null ? `; до отметки «кадр снят» ${fmt(f.cap)}` : ''}` : 'КАМЕРА: вспышек не поймано', ...R.fl.got.map((g,i)=>`${i+1} · ${fmt(g.lat)} · ${fmt(g.cap)}`)] : []),
    ok.length ? `ИТОГ: медиана ${fmt(median(ok.map(r=>r.total)))} мс из ${ok.length} (не измерено ${R.rows.length-ok.length}), от ${fmt(Math.min(...ok.map(r=>r.total)))} до ${fmt(Math.max(...ok.map(r=>r.total)))}` : 'ИТОГ: нет измерений',
    'n · всего · кадр→страница · распознавание · звук→динамик · остальное · сработало · сходство · петля (щелчок→микрофон)'];
  for(const r of R.rows) L.push(r.ok ? [r.n, fmt(r.total), fmt(r.cap), fmt(r.det), fmt(r.out), fmt(r.rest), r.why, r.score, fmt(r.roundtrip)].join(' · ') : `${r.n} · не измерено (${r.fail}) · ${r.why} · сходство ${r.score!=null ? (+r.score).toFixed(2) : '—'} · громкость ×${r.loud??'—'} · щелчок→микрофон ${r.roundtrip??'—'}`);
  return L.join('\n');
}

/* ---- the start: the audio context inside the tap (as the apps do), then microphone + camera in one request, the worklet, the model ---- */
async function start(){
  if(formChanged()){ say('Применяю настройки — после перезагрузки нажмите «Старт» ещё раз.', 'warn'); location.search=formQ().toString(); return; }
  $('start').disabled=true;
  R.ctx=new AudioContext({ latencyHint:CFG.lat==='min' ? 0 : 'interactive' });
  try{
    say('Разрешите камеру и микрофон…');
    const W=CFG.cam, H=CFG.cam*3/4;
    R.stream=await navigator.mediaDevices.getUserMedia({ video:CFG.g==='key' ? false : { width:{ ideal:W }, height:{ ideal:H }, frameRate:{ ideal:CFG.fps } },
      audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    await R.ctx.resume();
    await R.ctx.audioWorklet.addModule(new URL('../../probes/light/lab-tap-worklet.js', import.meta.url));
    const src=R.ctx.createMediaStreamSource(new MediaStream(R.stream.getAudioTracks())), tap=new AudioWorkletNode(R.ctx, 'lab-tap', { numberOfOutputs:1 }), mute=R.ctx.createGain();
    mute.gain.value=0; src.connect(tap); tap.connect(mute); mute.connect(R.ctx.destination); tap.port.onmessage=onMic;
    R.ring=new Float32Array(R.ctx.sampleRate*4); R.click=makeClick(R.ctx.sampleRate);
    R.clickBuf=R.ctx.createBuffer(1, R.click.length, R.ctx.sampleRate); R.clickBuf.copyToChannel(R.click, 0);
    if(CFG.g==='key'){ R.ready=true; setInterval(live, 250); for(const id of ['loop','reset']) $(id).disabled=false; $('lCam').textContent='не нужна в этом режиме';
      await loopTest(); return; }
    video.srcObject=new MediaStream(R.stream.getVideoTracks()); await video.play();
    const s=R.stream.getVideoTracks()[0].getSettings(); R.aspect=(s.width||W)/(s.height||H);
    $('lCam').textContent=`${s.width}×${s.height}, ${s.frameRate} к/с${s.width!==W ? ' (камера дала другой размер)' : ''}`;
    if(CFG.g==='flash'){ R.ready=true; R.fl.on=true; $('flash').hidden=false; video.requestVideoFrameCallback(onFrame); setInterval(live, 250); $('reset').disabled=false; say('Вспышки идут.', 'ok'); return; }
    say('Загружаю модель руки…');
    const at=mpFilesOf('own'), { HandLandmarker, FilesetResolver }=await import(at.lib), files=await FilesetResolver.forVisionTasks(at.wasm);
    R.L=await HandLandmarker.createFromOptions(files, { baseOptions:{ modelAssetPath:at.model, delegate:CFG.dev }, runningMode:'VIDEO',
      numHands:CFG.g==='clap' ? 2 : 1, minHandDetectionConfidence:0.5, minTrackingConfidence:0.5 });
    R.ts=Math.floor(performance.now()); R.L.detectForVideo(video, R.ts);   // the first recognition is slow (shaders): done before measuring
    R.st= CFG.g==='clap' ? clapNew() : CFG.g==='pinch' ? pinchNew() : tapNew();
    R.ready=true; video.requestVideoFrameCallback(onFrame); setInterval(live, 250);
    for(const id of ['loop','reset','rest']) $(id).disabled=false;
    await loopTest();
    if(CFG.g==='tap' && R.loop.ok) say('Звук проверен. Теперь «Рука на месте удара», потом удары.', 'ok');
  }catch(e){ say('Не получилось: '+(e && e.message || e), 'bad'); $('start').disabled=false; }
}
$('start').onclick=start;
/* LIGHT-12d: «клавиша» — a firm press makes the key's own sound (heard by the microphone) and plays the click at once: the sound path alone */
addEventListener('keydown', e=>{ if(CFG.g!=='key' || e.repeat || !R.ready) return; if(e.code==='Space'){ e.preventDefault(); if(document.activeElement) document.activeElement.blur(); }
  fire('key', { cap:null, det:0 }); });
$('loop').onclick=loopTest;
$('reset').onclick=()=>{ R.rows=[]; R.fl.got=[]; R.fl.miss=0; render(); };
$('flashStop').onclick=()=>{ R.fl.on=false; $('flash').hidden=true; const f=flashSummary(); if(f) renderFlash(f); say('Вспышки остановлены. «Скопировать результаты» — и пришлите мне.', 'ok'); };
$('copy').onclick=()=>{ const t=report(); navigator.clipboard.writeText(t).then(()=>say('Результаты скопированы — вставьте их в чат.', 'ok'), ()=>{ console.log(t); say('Не удалось скопировать; текст в консоли (F12).', 'warn'); }); };   // eslint-disable-line no-console
$('rest').onclick=()=>{ if(!R.ready) return; R.resting=[]; say('Держите руку на месте удара…');
  setTimeout(()=>{ const v=R.resting; R.resting=null; if(v.length<5){ say('Рука не видна — положите её так, чтобы камера её видела, и повторите.', 'bad'); return; }
    R.st=tapNew(median(v)); say('Место удара запомнено. Теперь «Проверка звука», потом удары.', 'ok'); }, 1000); };
requestAnimationFrame(draw);
/* for tools/lab/latency/check.mjs */
window.__lab=()=>({ loop:R.loop, busy:R.busy, flash:{ on:R.fl.on, got:R.fl.got.length, miss:R.fl.miss, last:R.fl.last }, ready:R.ready, frames:R.frames.length, det:median(R.det), cap:median(R.cap), mic:R.micBlocks||0, err:R.err, rows:R.rows.length, sr:R.ctx && R.ctx.sampleRate, out:R.ctx ? outMs() : null });
window.__labFire=why=>fire(why, { cap:null, det:0, frameMs:0 });
