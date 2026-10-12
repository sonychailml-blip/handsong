/* ═══════════════ ⛳ ОЧЕРЕДЬ АВТОЗАМОРОЗКИ — СЛАЙС AF1 (дуга «АВТОЗАМОРОЗКА», план AF1–AF6 — HANDOFF, Часть II) ═══════════════
   ЧТО ЭТО. Дорожки встают в очередь на заморозку ПО ID (правило #27: номер слоя — лишь адрес звука сейчас, его переиспользуют), очередь
   берёт их ПО ОДНОЙ (рендер копии движка и так один за раз — render.renderQueued) в порядке ПРИОРИТЕТА и только при открытых ВОРОТАХ.
   ⛳ В AF1 ВХОД — ТОЛЬКО КОНСОЛЬ: R.autoFreeze(true) ставит в очередь каждую несвежую дорожку (кроме пишущейся), R.autoFreeze(false)
   выключает, R.freezeQueue() показывает очередь. Наблюдателя и триггеров с задержками нет (AF3), интерфейса нет (AF4), подмены в выбранный
   миг нет (AF2: готовый буфер входит прежним швом A2 на горизонте планировщика).
   ⛳ ПРИОРИТЕТ (решение пользователя 7): сперва СЛЫШИМЫЕ сейчас (не заглушены, соло не мимо них), затем — те, до которых бегунок дойдёт
   РАНЬШЕ (под бегунком — ноль; впереди — сколько долей до начала; позади — до конца песни и с начала; при крутящейся скобе — по кругу скобы,
   а дорожки вне скобы — после всех); дальше — по песне, по номеру. Порядок считается В МИГ ВЫБОРА, поэтому новая массовая смена
   пересортировывает очередь сама.
   ⛳ ВОРОТА: (1) запись — НИКОГДА (кадры принадлежат руке, а пишущаяся дорожка и так не готова); (2) запись клипа — никогда (рывок кадра лёг
   бы в файл); (3) ЩИПОК — ждём, ЕСЛИ раскладка этой дорожки стоит кадра: мера — её прошлая раскладка (ms.layoutMs, замер A0/AF1), у новой —
   наибольшая виденная, а не мерили ни разу — считаем, что стоит (QF.frameMs — половина кадра при 60/с). Ворота проверяются ДВАЖДЫ: при
   выборе (не начинать) и ВНУТРИ рендера прямо перед раскладкой (render: o.layoutGate) — между выбором и раскладкой есть await (импорт,
   initAudio с addModule), и щипок мог начаться в нём; синхронный участок раскладки начинается только при открытых воротах.
   ⛳ УСТАРЕВШИЙ РЕЗУЛЬТАТ — никогда не ставится: это делает билет A2 (render.freeze → REC.freezeSet сверяет подпись); очередь лишь читает
   отказ 'sig' и ставит дорожку обратно — её возьмут, когда подпись УСТОИТСЯ (QF.settleMs без изменений). Подпись сверяется на каждом шаге:
   дорожка, менявшаяся много раз, пока ждала, будет отрендерена ОДИН раз — с последней подписью.
   ⛔ Рендер не отменить (у startRendering нет прерывания): выключение очереди снимает ЖДУЩИЕ, идущий доигрывает и ставится, если ещё верен.
   ⛳ ДЛЯ ПРОБЫ (P.checkFreezeQueue) — подмена часов, ворот, исполнителя (render.freeze с поддельным рендером) и шаг вручную (qStep): так
   приоритет, ворота и устаревание проверяются без настоящих рендеров и за доли секунды. Приложение эти подмены не трогает никогда.
   Нижний слой: DOM не трогает (правило #5). Грузится ЛЕНИВО — его импортирует только render.js. */
import { events, loop, recording, freezeState, freezeSig, freezePinCaptures, laneIdOf, laneLayerOf, laneAudible, isRecLayer,
         loopPos, songBeats, cycling, laneLenOf } from './recorder.js';
import { HANDS } from './gestures.js';
import { activeKind } from './clip.js';

/* Числа очереди. settleMs — сколько подпись должна стоять без изменений, прежде чем дорожку возьмут (в AF3 задержку задаст триггер: 0.5 /
   1.0 / 1.5 с; здесь — одна). pollMs — шаг водителя. frameMs — бюджет раскладки при щипке (половина кадра 60/с: раскладка дольше — рывок
   руки → звука виден). gatePollMs — шаг ожидания ворот внутри рендера. fails — сколько ошибок рендера подряд терпим, прежде чем снять. */
const QF={ settleMs:1000, pollMs:250, frameMs:8, gatePollMs:50, fails:2, logN:40 };

const Q=new Map();        // id дорожки → { id, sig, since, state:'wait'|'run', runs, again, fails, pinned, why, added }
const COST=new Map();     // id дорожки → её последняя раскладка, мс (ворота щипка)
let costMax=null;         // наибольшая виденная раскладка — оценка для дорожки, которую ещё не мерили
let ON=false, RUN=null, RUNP=null, TIMER=null, RUNNER=null, HOOK=null;
const LOG=[];             // последние исходы: { L, id, res, layoutMs, ms, runs, why }

const nowMs=()=> HOOK&&HOOK.now ? HOOK.now() : performance.now();
/* Исполнитель — render.freeze (ставит его render.js при загрузке: прямой импорт render.js отсюда был бы кругом модулей). */
const setRunner=fn=>{ RUNNER=fn; };

/* ═══ ВОРОТА ═══ Каждое — функция, которую проба может подменить (HOOK.gates). */
const anyPinch=()=>{ for(const k in HANDS) if(HANDS[k]&&HANDS[k].pinch) return true; return false; };
const G={
  recording:()=> HOOK&&HOOK.gates&&HOOK.gates.recording ? HOOK.gates.recording() : recording,
  clip:     ()=> HOOK&&HOOK.gates&&HOOK.gates.clip      ? HOOK.gates.clip()      : activeKind()!=null,
  pinch:    ()=> HOOK&&HOOK.gates&&HOOK.gates.pinch     ? HOOK.gates.pinch()     : anyPinch(),
};
/* Ожидаемая раскладка дорожки: своя прошлая, иначе наибольшая виденная, иначе «неизвестно» = стоит кадра. */
const costOf=id=> COST.has(id) ? COST.get(id) : (costMax!=null ? costMax : Infinity);
/* Что сейчас держит ворота для этой дорожки (null — открыты). */
function gateBlock(id){
  if(G.recording()) return 'recording';
  if(G.clip()) return 'clip';
  if(G.pinch() && !(costOf(id)<=QF.frameMs)) return 'pinch';
  return null;
}
/* Ожидание ворот ВНУТРИ рендера (render: o.layoutGate) — перед синхронной раскладкой. */
function gateWait(e){
  return new Promise(res=>{
    const step=()=>{ const b=gateBlock(e.id); e.gate=b; if(!b) return res(); setTimeout(step, QF.gatePollMs); };
    step(); });
}

/* ═══ ПРИОРИТЕТ — чистая функция (проба сверяет её и на выдуманных записях) ═══
   it: { id, layer, audible, b0, b1 } — доли начала и конца материала дорожки; ctx: { p — песенная доля бегунка, end — конец песни,
   rgn — { on, from, to } крутящаяся скоба или null }. Возвращает НОВЫЙ массив по порядку взятия. */
function untilHeard(it, ctx){
  const p=ctx.p, b0=it.b0, b1=it.b1;
  if(ctx.rgn&&ctx.rgn.on){ const f=ctx.rgn.from, t=ctx.rgn.to, L=t-f;
    const s=Math.max(b0,f), e=Math.min(b1,t);
    if(!(e>s-1e-9)) return 2*Math.max(ctx.end,1)+b0;   // вне скобы: пока она крутится, не прозвучит — после всех
    const q= p>=f&&p<t ? p : f;                        // бегунок перед скобой войдёт в неё с начала
    const lead= p<f ? f-p : 0;
    if(q>=s-1e-9 && q<=e+1e-9) return lead;
    return lead + (s>q ? s-q : (t-q)+(s-f));
  }
  if(p>=b0-1e-9 && p<=b1+1e-9) return 0;
  if(b0>p) return b0-p;
  return Math.max(0,ctx.end-p)+b0;                     // позади: следующий раз — с начала песни
}
function qRank(list, ctx){
  return list.map(it=>({it, k:[it.audible?0:1, untilHeard(it,ctx), it.b0, it.layer]}))
    .sort((x,y)=>{ for(let i=0;i<4;i++){ const d=x.k[i]-y.k[i]; if(d) return d; } return 0; })
    .map(x=>x.it);
}
/* Контекст приоритета из живого транспорта: бегунок — песенная доля (играет) или место, где стоит; скоба — если крутится. */
function rankCtx(){
  if(HOOK&&HOOK.ctx) return HOOK.ctx();
  const lp=loopPos(), p= lp&&lp.phase==='play' ? lp.pos : Math.max(0, loop.pos||0);
  return { p, end:songBeats(), rgn: cycling() ? { on:true, from:loop.rgn.from, to:loop.rgn.to } : null };
}
/* Края материала по слоям — один проход по событиям (зовётся раз на выбор, не на кадр). */
function spans(){
  const m=new Map();
  for(const e of events){ const s=m.get(e.layer); if(!s) m.set(e.layer,{b0:e.t,b1:e.t}); else { if(e.t<s.b0) s.b0=e.t; if(e.t>s.b1) s.b1=e.t; } }
  for(const [ly,s] of m){ const L=laneLenOf(ly); if(L>s.b1) s.b1=L; }   // подложка звучит все свои такты
  return m;
}

/* ═══ ПОСТАНОВКА ═══ */
function qAdd(layer, why){
  const id=laneIdOf(layer); if(id==null) return false;
  if(!events.some(e=>e.layer===layer)) return false;
  if(freezeState(layer)==='fresh') return false;
  const e=Q.get(id), sig=freezeSig(layer), t=nowMs();
  if(e){ if(e.state==='wait' && e.sig!==sig){ e.sig=sig; e.since=t; } return true; }
  Q.set(id,{ id, sig, since:t, state:'wait', runs:0, again:false, fails:0, pinned:false, why:why||'console', added:t, gate:null });
  return true;
}
/* Все несвежие дорожки, кроме пишущейся. */
function qAddAll(why){
  let n=0; for(const ly of [...new Set(events.map(e=>e.layer))]) if(!isRecLayer(ly) && qAdd(ly, why)) n++;
  return n;
}

/* ═══ ОДИН ШАГ ОЧЕРЕДИ ═══ Обновить записи (подпись, уход, свежесть), проверить ворота, взять ОДНУ по приоритету.
   Возвращает слово состояния: 'off' | 'busy' | 'idle' | 'settling' | 'gate:recording' | 'gate:clip' | 'gate:pinch' | 'start:L#'. */
function qStep(){
  if(!ON) return 'off';
  const t=nowMs();
  for(const e of [...Q.values()]){
    if(e.state==='run') continue;
    const ly=laneLayerOf(e.id);
    if(ly==null){ qLog(e,null,'gone'); Q.delete(e.id); continue; }
    if(!events.some(x=>x.layer===ly)){ qLog(e,ly,'empty'); Q.delete(e.id); continue; }
    if(freezeState(ly)==='fresh'){ qLog(e,ly,'fresh already'); Q.delete(e.id); continue; }
    const sig=freezeSig(ly); if(sig!==e.sig){ e.sig=sig; e.since=t; }
  }
  if(RUN) return 'busy';
  if(!Q.size) return 'idle';
  if(G.recording()) return 'gate:recording';
  if(G.clip()) return 'gate:clip';
  const sp=spans(), ready=[];
  for(const e of Q.values()){
    const ly=laneLayerOf(e.id); if(ly==null || isRecLayer(ly)) continue;
    if(t-e.since<QF.settleMs) continue;
    const s=sp.get(ly)||{b0:0,b1:0};
    ready.push({ id:e.id, layer:ly, audible:laneAudible(ly), b0:s.b0, b1:s.b1 });
  }
  if(!ready.length) return 'settling';
  const order=qRank(ready, rankCtx());
  const pick=order.find(it=>!gateBlock(it.id));
  if(!pick){ for(const it of order) Q.get(it.id).gate='pinch'; return 'gate:pinch'; }
  RUNP=qRun(Q.get(pick.id), pick.layer);
  return 'start:L'+(pick.layer+1);
}
/* ═══ ИСПОЛНЕНИЕ ═══ render.freeze: билет ДО рендера, freezeSet сверяет подпись после. ⛳ Захват прикалываем ЗДЕСЬ и запоминаем: у дорожки
   без захвата вовсе freeze сделал бы это МОЛЧА (решение 8 — творить цепь при рождении дорожки — план AF3); здесь это хотя бы видно в
   R.freezeQueue(). Повторный вызов внутри freeze ничего не делает. */
async function qRun(e, layer){
  RUN=e; e.state='run'; e.runs++; e.gate=null;
  const t0=nowMs(); let res='error', why=null, lay=null;
  try{
    if(!(HOOK&&HOOK.noPin)) e.pinned = freezePinCaptures(layer) || e.pinned;
    const opt={ quiet:true, layoutGate:()=>gateWait(e), ...(HOOK&&HOOK.opt?HOOK.opt:null) };
    const r=await RUNNER(layer, opt);
    lay= r&&r.ms&&r.ms.layoutMs!=null ? r.ms.layoutMs : null;
    if(lay!=null){ COST.set(e.id, lay); costMax= costMax==null ? lay : Math.max(costMax, lay); }
    if(r&&r.installed){ res='installed'; Q.delete(e.id); }
    else if(r&&r.refused==='sig'){ res='stale — re-queued';
      if(!ON) Q.delete(e.id);
      else { const ly=laneLayerOf(e.id); e.state='wait'; e.again=true; e.since=nowMs(); e.sig= ly!=null ? freezeSig(ly) : e.sig; } }
    else if(r&&r.refused==='lane'){ res='gone'; Q.delete(e.id); }
    else { res='refused: '+(r&&r.refused); Q.delete(e.id); }
  }catch(err){
    why=(err&&err.message)||String(err); e.fails++;
    if(e.fails>=QF.fails || !ON){ res='error — dropped'; Q.delete(e.id); } else { res='error — re-queued'; e.state='wait'; e.since=nowMs(); }
  }finally{
    qLog(e, layer, res, { layoutMs:lay, ms:Math.round(nowMs()-t0), why });
    RUN=null;
  }
  return res;
}
function qLog(e, layer, res, x){
  LOG.push({ L: layer!=null ? 'L'+(layer+1) : '—', id:e.id, res, runs:e.runs, pinned:e.pinned, ...(x||null) });
  while(LOG.length>QF.logN) LOG.shift();
}

/* ═══ ВОДИТЕЛЬ ═══ Таймер шагов, пока очередь включена или рендер идёт. */
function pump(){
  TIMER=null;
  try{ qStep(); }catch(err){ console.warn('[autoFreeze] step failed: '+(err&&err.message)); }   // eslint-disable-line no-console
  if(ON || RUN) TIMER=setTimeout(pump, QF.pollMs);
}
const pumpStart=()=>{ if(!TIMER) TIMER=setTimeout(pump, 0); };

/* ═══ КОНСОЛЬ ═══ R.autoFreeze(true|false) · R.freezeQueue(). */
function autoFreeze(on){
  if(on==null) return ON;
  if(HOOK) { console.warn('[autoFreeze] a probe is using the queue — try again when it finishes'); return ON; }   // eslint-disable-line no-console
  if(on){
    ON=true; const n=qAddAll('console');
    console.log(`%c[autoFreeze] ON — ${n} track(s) queued (every track that is not frozen-and-fresh, except one being recorded). One render at a time; never while recording or recording a clip; a track whose layout costs more than ${QF.frameMs} ms waits while a hand pinches. R.freezeQueue() lists it.`,'font-weight:bold');   // eslint-disable-line no-console
    pumpStart();
  } else {
    ON=false; const n=[...Q.values()].filter(e=>e.state==='wait').length;
    for(const e of [...Q.values()]) if(e.state==='wait') Q.delete(e.id);
    console.log(`[autoFreeze] OFF — ${n} waiting track(s) dropped${RUN?'; the render in progress cannot be cancelled: it finishes and installs if still valid':''}.`);   // eslint-disable-line no-console
  }
  return ON;
}
function freezeQueue(){
  const t=nowMs(), sp=spans(), list=[];
  for(const e of Q.values()){ const ly=laneLayerOf(e.id), s=ly!=null?sp.get(ly):null;
    list.push({ id:e.id, layer:ly, audible: ly!=null&&laneAudible(ly), b0:s?s.b0:0, b1:s?s.b1:0, e }); }
  const ord=qRank(list, rankCtx());
  const rows=ord.map((it,i)=>{ const e=it.e, quiet=t-e.since;
    return { '#':i+1, track: it.layer!=null?'L'+(it.layer+1):'—',
      state: e.state==='run' ? 'rendering' : (quiet<QF.settleMs ? `settling (${((QF.settleMs-quiet)/1000).toFixed(1)} s)` : (e.gate ? 'waiting: '+e.gate : 'ready')),
      audible: it.audible, 'beats': it.b0+'–'+it.b1, 'layout ms (last)': COST.has(e.id)?COST.get(e.id):'—',
      renders: e.runs, again: e.again, 'pinned live chain': e.pinned }; });
  /* eslint-disable no-console */
  console.log(`[freezeQueue] ${ON?'ON':'OFF'} · ${Q.size} queued · ${RUN?'rendering now':'idle'} · settle ${QF.settleMs} ms · pinch budget ${QF.frameMs} ms · gates now: recording ${G.recording()}, clip ${G.clip()}, pinch ${G.pinch()}`);
  if(rows.length) console.table(rows);
  if(LOG.length){ console.log('[freezeQueue] last outcomes:'); console.table(LOG.slice(-10)); }
  /* eslint-enable no-console */
  return { on:ON, running:!!RUN, queue:rows, log:LOG.slice() };
}

/* ═══ ДЛЯ ПРОБЫ ═══ qBegin(hook) — очередь включается БЕЗ водителя (шаги — qStep вручную), с подменами hook: { now, gates:{recording,
   clip, pinch}, ctx, opt (добавка к опциям исполнителя — поддельный рендер), noPin, settleMs, frameMs, gatePollMs }; qEnd() — всё назад.
   Отказывает, если очередь уже включена или идёт рендер. */
let QF_KEEP=null;
function qBegin(hook){
  if(ON||RUN||HOOK) return false;
  HOOK=hook||{}; ON=true; Q.clear(); QF_KEEP={...QF, cost:new Map(COST), costMax};
  COST.clear(); costMax=null;   // проба начинает с чистых замеров (оценка «наибольшая виденная» из прошлых рендеров сессии сломала бы случай «не мерили»); qEnd вернёт
  for(const k of ['settleMs','frameMs','gatePollMs']) if(HOOK[k]!=null) QF[k]=HOOK[k];
  return true;
}
function qEnd(){ ON=false; Q.clear(); HOOK=null;
  if(QF_KEEP){ const {cost, costMax:cm, ...num}=QF_KEEP; Object.assign(QF,num); COST.clear(); for(const [k,v] of cost) COST.set(k,v); costMax=cm; }   // замеры пробы не остаются оценкой приложения
  QF_KEEP=null; }
const qRunning=()=>RUNP;                 // обещание последнего начатого исполнения (проба ждёт его)
const qState=()=>({ on:ON, running:!!RUN, size:Q.size, entries:[...Q.values()].map(e=>({...e})) });
const qCostSet=(layer,ms)=>{ const id=laneIdOf(layer); if(id==null) return; if(ms==null) COST.delete(id); else COST.set(id,ms); };
const qCostOf=layer=>{ const id=laneIdOf(layer); return id==null||!COST.has(id) ? null : COST.get(id); };

export { autoFreeze, freezeQueue, setRunner,
  /* только для пробы P.checkFreezeQueue */
  qBegin, qEnd, qStep, qAdd, qRank, qRunning, qState, qCostSet, qCostOf, QF };
