/* PROBE1: Render and freeze probes: repeatability, the render queue, AF1, AF3, AF5, LR1, AF6b, AF2, freeze cost. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { fxSnapshot, fxInstance, AC as LIVE_AC, chainStateOf, routeOfOwner, ownerGain, ownerPan, masterLevel, chordHold, fxParamKeysOf, fxPlaySet } from '../audio.js';
import { afActive, qRank, qBegin, qStep, qRunning, qAdd, qCostOf, qCostSet, qState, qEnd, afTick, afBegin, AF_DELAY, afHint, afEnd } from '../frzqueue.js';
import { L } from '../i18n.js';
import { KEEP_MAX, PRINT_MAX } from '../probedata.js';
import { events, editIsOpen, recording, freezeState, autChainOf, freezeTicket, loop, laneSoloOn, laneLenOf, laneMuted, setLanePan, lanePanOf, songBeats, unfreezeLayer, toggleLaneMute, laneHasChain, laneLevelOf, editClose, editOpen, setLaneLevel, setLoopBpm, frzBytesTotal, laneIdOf, editInsertHit, captureInfoOf, editUndo, editRedo, laneDelTap, laneRoleOf, WchOn, WchOff, regionOn, seekTo, onLoop, setRegionOn, autPoints, autMovePoint, autAddPoint, editHistPeek, fxPlayDriving, armedLayer, toggleArm, setLiveLeakDbg, setLiveIsolation, editRevert, songNotes, frozenInfo } from '../recorder.js';
import { rollOpen, arrOpen, chainKeyOf, fx as liveFx, fx as stateFx, tonic, aRef, setTonic, setARef, trackChainKeyOf, fxChainOf, chIdx, FX_VOL } from '../state.js';
import { PROBE_SHORT, meas, QUICK } from './kit.js';
import { row } from './rows.js';
/* ═══ ПОВТОРЯЕМОСТЬ РЕНДЕРА — P.checkRepeat (после MX2; слайс «быстрые пробы») ═══
   Одна и та же дорожка рендерится несколько раз с одними настройками (render.renderTrack — путь заморозки) КОРОТКИМ ОКНОМ (o.short —
   PROBE_SHORT с от первой ноты, хвост ≤ 1 с); материал и снимок живой цепи соло — одни (o.solo).
   (1) СУХОЙ ≤ REP_DRY·пик (1e-4). Два сухих рендера обычно совпадают до последних битов, но во втором проходе P.all (после многих
       рендеров той же сессии) наблюдалось 1.54e-5 пика — и с ОБОЙДЁННОЙ стадией выразительности тоже, так что прежнее объяснение
       («вау усиливает последние биты») снято. Лучшее, что известно: Chrome складывает входы узла в порядке указателей, своём у каждой
       постройки графа и зависящем от того, что строилось раньше; одна иная разница округления до нелинейной ступени голоса (драйв)
       переносится дальше. Узел не установлен. −96 дБ — неслышимо; допуск 1e-4 — «разница порядка сложения при постройке графа,
       неслышимая» (HANDOFF, пределы).
   (2) МОКРЫЙ ≤ REP_WET·пик (2e-4) по сэмплам и по общей энергии: разница сухого сквозь цепь плюс последние биты сети по петлям с
       усилением < 1. Петли реверба в копии рендера — с одним входом (audio.apStage/buildFDN), иначе два рендера давали разную комнату.
   ⛳ КОНТРОЛИ (мера обязана уметь провалиться): сухой с панорамой 0.5 против центра — разница > REP_DRY·100; мокрый с уровнем 0.9
       (o.trackGain) — отношение RMS 0.9 ± 1e-3 (ступень уровня и цепь линейны) и разница > REP_WET·100. Ударные (цепь пуста) — дважды,
       тот же допуск.
   (3) ДОГОВОР ЗАМОРОЗКИ: у соло-дорожки с нотами БЕЗ карты эффектов (их звук — живая цепь соло, правило R2) подпись заморозки обязана
       меняться при сдвиге живого вибрато (state.fx) и возвращаться при возврате; у дорожки без таких нот — не меняться.
   ⛳ ДОКАЗАТЕЛЬСТВА — ТОЛЬКО ПО ЗАПРОСУ, P.checkRepeat({evidence:true}), в P.all их нет: сухой с обойдённой стадией выразительности
   (СВЕДЕНИЕ, не провал) и по одному эффекту (o.only — провал, если ступень не повторяется). A/B прежней живой проводки петель реверба
   (dbg.fdnLive) снят в AF1 вместе с самой проводкой (уборка LR1: проводка одна — с одним входом).
   Дорожки: самая короткая незамороженная соло-дорожка и, контролем, самая короткая ударная. Асинхронная: await P.checkRepeat(). */
export async function checkRepeat(opt={}){
  const EVID=!!(opt&&opt.evidence);
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const REP_DRY=1e-4, REP_WET=2e-4, REP_BITS=2e-6;   // объяснение — в шапке пробы
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);
  const pick=re=>L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&re.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b))[0];
  const solo=pick(/^leadOn$/), drum=pick(/^drum$/);
  /* ⛳ ОДИН СНИМОК ЖИВОЙ ЦЕПИ СОЛО НА ВСЕ РЕНДЕРЫ ПРОБЫ (o.solo): ноты посева без карты звучат живой цепью соло (договор заморозки), а её
     старые скаляры пишет рука эффектов — камера работает и во время пробы. Повторяемость меряем при ОДНИХ входах. */
  const soloMap=fxSnapshot(chainKeyOf('ld'));
  const e3=x=>Number.isFinite(x)?x.toExponential(2):String(x), f4=x=>Number.isFinite(x)?x.toFixed(4):String(x);
  const R=await import('../render.js');
  const rt=(ly,o)=>R.renderTrack(ly,{quiet:true, solo:soloMap, short:PROBE_SHORT, ...(o||{})}).then(r=>r.buf);
  if(solo==null) miss('no unfrozen solo track to render');
  else { cases++;
    try{
      const d1=await rt(solo,{dry:true}), d2=await rt(solo,{dry:true}), w1=await rt(solo), w2=await rt(solo);
      const dp=await rt(solo,{dry:true,trackPan:0.5}), wg=await rt(solo,{trackGain:0.9});
      const D=bufCmp(d1,d2,REP_DRY), W=bufCmp(w1,w2,REP_WET), C=bufCmp(d1,dp,REP_DRY), G=bufCmp(w1,wg,REP_WET);
      const tag=`L${solo+1} solo: dry twice — max difference ${e3(D.rel)} of peak${D.first!=null?`, first at ${D.first} s`:''}; wet twice — max difference ${e3(W.rel)} of peak, total RMS ratio ${f4(W.total)}${W.first!=null?`, first at ${W.first} s`:''}; controls — dry pan 0.5 vs centre ${e3(C.rel)}, wet level 0.9 RMS ratio ${f4(G.total)} (max difference ${e3(G.rel)})`;
      if(!D.shape||!W.shape) miss(`${tag} — two renders of the same track have different lengths`);
      meas(`${tag.split(' ')[0]} dry difference (of peak)`, D.rel, REP_DRY, 'max'); meas(`${tag.split(' ')[0]} wet difference (of peak)`, W.rel, REP_WET, 'max'); meas(`${tag.split(' ')[0]} control: pan difference`, C.rel, REP_DRY*100, 'min');
      if(!(D.rel<=REP_DRY)) miss(`${tag} — the DRY render differs by more than ${e3(REP_DRY)} of peak (build-order float differences stay near 1.5e-5, inaudible): it reads an input the render does not pin`);
      if(!(W.rel<=REP_WET)) miss(`${tag} — the WET render differs by more than ${e3(REP_WET)} of peak: something on the effect chain is not repeatable`);
      if(!(Math.abs(W.total-1)<=REP_WET)) miss(`${tag} — the WET render's total energy differs by more than ${e3(REP_WET)}`);
      if(!(C.rel>REP_DRY*100)) miss(`${tag} — CONTROL: a different pan renders within ${e3(REP_DRY*100)}; the dry measure cannot see a difference`);
      if(!(Math.abs(G.total-0.9)<=1e-3)) miss(`${tag} — CONTROL: a 0.9 track level should scale the wet RMS by exactly 0.9 (±0.001: the level stage and the chain are linear)`);
      if(!(G.rel>REP_WET*100)) miss(`${tag} — CONTROL: a 0.9 track level renders within ${e3(REP_WET*100)} of the full level; the wet measure cannot see a difference`);
      notes.push(tag);
      if(EVID){
        /* сведение: сухой БЕЗ стадии выразительности */
        const b1=await rt(solo,{dry:true,dbg:{expr:'bypass'}}), b2=await rt(solo,{dry:true,dbg:{expr:'bypass'}}), B=bufCmp(b1,b2,REP_BITS);
        notes.push(`evidence · L${solo+1} solo, dry with the expression stage bypassed: max difference ${e3(B.rel)} of peak${B.first!=null?`, first at ${B.first} s`:''} (with the stage ${e3(D.rel)}) — information, not a gate`);
        /* по одному эффекту */
        const chain=new Set(autChainOf(solo));
        for(const id of ['reverb','dly','trmMix']){
          const a1=await rt(solo,{only:id}), a2=await rt(solo,{only:id}), X=bufCmp(a1,a2,REP_WET), ok= X.rel<=REP_WET && Math.abs(X.total-1)<=REP_WET;
          notes.push(`evidence · L${solo+1} solo, only ${id} open${chain.has(id)?'':' (not in this track’s chain)'}: max difference ${e3(X.rel)} of peak, total RMS ratio ${f4(X.total)} — ${ok?'repeatable':'NOT REPEATABLE'}`);
          if(!ok) miss(`L${solo+1} solo: with only ${id} open two renders differ — max ${e3(X.rel)} of peak, RMS ratio ${f4(X.total)}: this stage is not repeatable`);
        }
      }
    }catch(err){ miss(`L${solo+1} solo: the offline render failed — ${err&&err.message}`); }
  }
  if(drum!=null && !QUICK){ cases++;   // P.quick: ударные — только в P.all
    try{ const a=await rt(drum), b=await rt(drum), X=bufCmp(a,b,REP_DRY);
      notes.push(`L${drum+1} drums (control): twice — max difference ${e3(X.rel)} of peak`);
      if(!X.shape||!(X.rel<=REP_DRY)) miss(`L${drum+1} drums: two renders differ by ${e3(X.rel)} of peak`); }
    catch(err){ miss(`L${drum+1} drums: the offline render failed — ${err&&err.message}`); }
  }
  // ---- договор заморозки: соло без карты → живая цепь в подписи (синхронно: подмена и возврат вибрато — без единого await) ----
  for(const ly of [solo,drum].filter(x=>x!=null)){ cases++;
    const noFx=events.some(e=>e.layer===ly&&(e.fn==='leadOn'||e.fn==='leadSet')&&e.a&&e.a.fx==null);
    const keepVib=liveFx.vib; let s0, s1, s2;
    try{ s0=freezeTicket(ly).sig; liveFx.vib=keepVib===0.5?0.25:0.5; s1=freezeTicket(ly).sig; }
    finally{ liveFx.vib=keepVib; }
    s2=freezeTicket(ly).sig;
    if(noFx && s1===s0) miss(`L${ly+1}: it has solo notes without an effect map (they sound with the live solo chain), yet moving the live vibrato does not change its freeze signature`);
    if(!noFx && s1!==s0) miss(`L${ly+1}: every note carries its own effect map, yet moving the live vibrato changes its freeze signature`);
    if(s2!==s0) miss(`L${ly+1}: with the live vibrato restored the freeze signature differs`);
    notes.push(`L${ly+1}: ${noFx?'has':'no'} solo notes without a map — live vibrato ${s1===s0?'does not change':'changes'} the freeze signature`);
  }
  console.log(`[scaleprobe repeat] tracks ${L.length} · cases ${cases} · differences ${nBad}${EVID?' · with evidence':''}`);
  notes.forEach(m=>console.log('[scaleprobe repeat] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe repeat] '+m));
  if(!nBad) console.log('[scaleprobe repeat] the same track renders the same twice — dry within the inaudible build-order differences, wet within twice that — the controls show the measure sees a change, and solo notes without a map put the live solo chain into the freeze signature');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* Сравнение двух буферов: rel — наибольшая разница сэмплов в долях пика первого; total/ratio — отношение RMS (всего и по каналам); first —
   секунда первого сэмпла, где разница больше eps·пик (последние биты в счёт не идут). */
function bufCmp(a,b,eps){
  if(a.length!==b.length||a.numberOfChannels!==b.numberOfChannels) return { shape:false, rel:Infinity, ratio:[NaN,NaN], total:NaN, first:null };
  let pk=0, mx=0; const ea=[0,0], eb=[0,0];
  for(let c=0;c<Math.min(2,a.numberOfChannels);c++){ const x=a.getChannelData(c); for(let i=0;i<x.length;i++){ const u=Math.abs(x[i]); if(u>pk) pk=u; } }
  let first=-1; const lim=(eps||0)*pk;
  for(let c=0;c<Math.min(2,a.numberOfChannels);c++){ const x=a.getChannelData(c), y=b.getChannelData(c);
    for(let i=0;i<x.length;i++){ const u=x[i], v=y[i], d=Math.abs(u-v); if(!(d<=mx)) mx=d; if(d>lim && (first<0||i<first)) first=i; ea[c]+=u*u; eb[c]+=v*v; } }
  const ta=ea[0]+ea[1], tb=eb[0]+eb[1];
  return { shape:true, pk, rel: pk>0 ? mx/pk : (mx>0?Infinity:0), ratio: ea.map((e,c)=> e>0 ? Math.sqrt(eb[c]/e) : (eb[c]>0?Infinity:1)),
           total: ta>0 ? Math.sqrt(tb/ta) : (tb>0?Infinity:1), first: first<0 ? null : +(first/a.sampleRate).toFixed(3) };
}
/* ═══ ОЧЕРЕДЬ РЕНДЕРОВ — P.checkQueue (после MX2) ═══
   Два рендера, запрошенные ОДНОВРЕМЕННО (Promise.all, без await между запросами), обязаны дать ровно то же, что каждый ОДИН: сухой
   рендер соло-дорожки и сухой рендер ударной — сначала поодиночке, затем оба разом, и каждый из пары сверяется со своим одиночным
   (≤ 1e-4 пика — допуск сухого из P.checkRepeat: два независимых рендера соло расходятся на последние биты, усиленные вау стадии
   выразительности, до ~2e-5; порча от наложения давала 1.2 пика и Infinity). Ещё — две КОПИИ одного рендера разом (тот же случай, что два быстрых ❄ на одной дорожке). Песня после — та же (число
   событий), очередь пуста.
   ⛳ КОНТРОЛЬ: в миг запроса пары очередь обязана держать ≥ 2 рендера — иначе запросы не пересеклись и проба ничего не проверила; и мера
   обязана видеть разницу — одиночный против того же рендера с панорамой 0.5. Асинхронная: await P.checkQueue(). */
export async function checkQueue(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const EPS=1e-4, n0=events.length, e3=x=>Number.isFinite(x)?x.toExponential(2):String(x);
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);
  const pick=re=>L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&re.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b))[0];
  const A=pick(/^leadOn$/)??pick(/^(chOn|bassOn)$/), B=pick(/^drum$/);
  if(A==null||B==null){ miss('needs an unfrozen pitched track and an unfrozen drum track'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const soloMap=fxSnapshot(chainKeyOf('ld'));
  const R=await import('../render.js');
  const rt=(ly,opt)=>R.renderTrack(ly,{quiet:true, dry:true, solo:soloMap, short:PROBE_SHORT, ...(opt||{})}).then(r=>r.buf);
  try{
    const a0=await rt(A), b0=await rt(B), ap=await rt(A,{trackPan:0.5});
    cases++;
    const pa=rt(A), pb=rt(B), q=R.renderQueue();
    const [a1,b1]=await Promise.all([pa,pb]);
    if(!(q>=2)) miss(`CONTROL: when the pair was requested the queue held ${q} render(s) — the requests did not overlap, nothing was tested`);
    const CA=bufCmp(a0,a1,EPS), CB=bufCmp(b0,b1,EPS), CC=bufCmp(a0,ap,EPS);
    if(!(CA.rel<=EPS)) miss(`L${A+1} rendered together with L${B+1} differs from L${A+1} rendered alone — max ${e3(CA.rel)} of peak${CA.first!=null?`, from ${CA.first} s`:''}`);
    if(!(CB.rel<=EPS)) miss(`L${B+1} rendered together with L${A+1} differs from L${B+1} rendered alone — max ${e3(CB.rel)} of peak${CB.first!=null?`, from ${CB.first} s`:''}`);
    if(!(CC.rel>EPS*100)) miss(`CONTROL: a pan of 0.5 renders the same as centre within ${EPS} — the measure cannot see a difference`);
    meas('pitched together vs alone (of peak)', CA.rel, EPS, 'max'); meas('drums together vs alone (of peak)', CB.rel, EPS, 'max'); meas('control: pan 0.5 vs centre', CC.rel, EPS*100, 'min');
    notes.push(`two tracks at once (queue ${q}): L${A+1} ${e3(CA.rel)}, L${B+1} ${e3(CB.rel)} of peak against alone; control (pan 0.5) ${e3(CC.rel)}`);
    cases++;
    const pc=rt(A), pd=rt(A), q2=R.renderQueue();
    const [c1,c2]=await Promise.all([pc,pd]);
    const C1=bufCmp(a0,c1,EPS), C2=bufCmp(a0,c2,EPS);
    if(!(q2>=2)) miss(`CONTROL: the same track twice — the queue held ${q2} render(s) when requested`);
    if(!(C1.rel<=EPS&&C2.rel<=EPS)) miss(`L${A+1} rendered twice at once differs from alone — ${e3(C1.rel)} / ${e3(C2.rel)} of peak`);
    notes.push(`the same track twice at once (queue ${q2}): ${e3(C1.rel)} / ${e3(C2.rel)} of peak against alone`);
  } catch(err){ miss('a render failed — '+(err&&err.message)); }
  cases++;
  if(events.length!==n0) miss(`the song changed during the renders: ${n0} events before, ${events.length} after`);
  if(R.renderQueue()!==0) miss(`the render queue is not empty afterwards (${R.renderQueue()})`);
  console.log(`[scaleprobe queue] cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe queue] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe queue] '+m));
  if(!nBad) console.log('[scaleprobe queue] renders requested at once wait for each other and give exactly what each gives alone; the song and the queue are untouched afterwards');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ ⛳ AF1: ОЧЕРЕДЬ АВТОЗАМОРОЗКИ — P.checkFreezeQueue ═══
   Очередь (frzqueue.js) гоняется ВРУЧНУЮ (qStep) на ПОДМЕНЁННЫХ часах и воротах, исполнитель — настоящий render.freeze (билет и freezeSet —
   настоящие) с ПОДДЕЛЬНЫМ рендером (буфер-пустышка, без копии движка): так проверяются приоритет, ворота и устаревание за доли секунды.
   (1) ПРИОРИТЕТ, чистая функция: слышимые раньше заглушённых; под бегунком — первыми; впереди — по расстоянию; позади — после (до конца
       песни и с начала); при крутящейся скобе — по кругу скобы, вне скобы — последними. КОНТРОЛЬ: порядок песни ≠ ожидаемому.
   (2) ПРИОРИТЕТ, настоящие дорожки: три незамороженные с непересекающимися краями A < B < C, бегунок на начале B: порядок исполнения B, C, A;
       B заглушена: C, A, B. КОНТРОЛЬ: порядок песни (A, B, C) не совпадает ни с одним.
   (3) ЗАПИСЬ и КЛИП: при закрытых воротах шаг не начинает ничего (исполнитель не позван ни разу); открыли — начал. ВНУТРИ рендера: ворота
       закрылись после выбора — раскладка (o.layoutGate) не начинается, пока не откроются.
   (4) ЩИПОК: раскладка дороже бюджета — ждёт; не мерили ни разу — ждёт; дешевле — идёт.
   (5) УСТАРЕВШИЙ РЕЗУЛЬТАТ: во время «рендера» сдвинули панораму дорожки (она в подписи) — буфер НЕ поставлен (дорожка не заморожена), запись
       снова в очереди; пока подпись не устоялась — не берётся; устоялась — второй рендер, поставлен, свежая.
   (6) "changed while queued" moved to the AF3 row's edit burst (one render after the last change, fresh against the final signature).
   Всё возвращается: панорамы, приглушения, заморозки, сделанные пробой (размораживаются), замеры очереди (qEnd). Нужны: звук запущен, транспорт
   стоит, редактор и окно закрыты, R.autoFreeze выключен, ни одна дорожка не в соло; для (2) — три незамороженные дорожки с раздельными краями
   (на посеве есть; нет — случай «не применим», не расхождение). */
export async function checkFreezeQueue(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  const out=()=>({ cases, song:L.length, total:nBad, differences:bad });
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(!LIVE_AC){ miss('audio is not started (press ▶ Play)'); return out(); }
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return out(); }
  if(recording||loop.on){ miss('the transport is playing or recording — stop it first'); return out(); }
  if(laneSoloOn()){ miss('a track is soloed — un-solo it first (audibility is part of the priority)'); return out(); }
  const R=await import('../render.js');
  if(afActive()){ miss('auto-freeze is running — run this as P.* (the probe lock pauses it)'); return out(); }
  /* ---- (1) чистая функция приоритета ---- */
  { const ctx={p:10,end:100,rgn:null}, it=(id,audible,b0,b1)=>({id,layer:id,audible,b0,b1});
    const items=[it(1,false,0,200),it(2,true,50,60),it(3,true,5,20),it(4,true,0,5),it(5,true,12,30)];
    const want=[3,5,2,4,1], got=qRank(items,ctx).map(x=>x.id), got2=qRank(items.slice().reverse(),ctx).map(x=>x.id); cases+=2;
    if(got.join()!==want.join()) miss(`priority (pure): expected ${want.join(',')} (under the playhead, ahead by distance, behind, muted last), got ${got.join(',')}`);
    if(got2.join()!==want.join()) miss(`priority (pure): the order depends on the input order — ${got2.join(',')}`);
    const cyc={p:20,end:100,rgn:{on:true,from:8,to:24}}, items2=[it(1,true,0,4),it(2,true,22,23),it(3,true,9,10),it(4,true,30,40)];
    const want2=[2,3,1,4], g3=qRank(items2,cyc).map(x=>x.id); cases++;
    if(g3.join()!==want2.join()) miss(`priority (cycling brace 8–24, playhead 20): expected ${want2.join(',')} (ahead in the cycle, then around it, outside the brace last), got ${g3.join(',')}`);
    const songOrd=items.slice().sort((a,b)=>a.b0-b.b0||a.id-b.id).map(x=>x.id); cases++;
    if(songOrd.join()===want.join()) miss('priority CONTROL: the song order equals the expected order — the case cannot tell priority from song order');
    notes.push(`priority (pure): ${got.join(',')} · cycling: ${g3.join(',')}`); }
  /* ---- подготовка: дорожки, подмены ---- */
  const span=new Map(); for(const e of events){ const s=span.get(e.layer); if(!s) span.set(e.layer,{b0:e.t,b1:e.t}); else { s.b0=Math.min(s.b0,e.t); s.b1=Math.max(s.b1,e.t); } }
  for(const [ly,s] of span){ const Ln=laneLenOf(ly); if(Ln>s.b1) s.b1=Ln; }
  const free=L.filter(ly=>freezeState(ly)==='none' && !laneMuted(ly)).sort((a,b)=>span.get(a).b0-span.get(b).b0||a-b);
  let tri=null;
  for(const b of free){ const B=span.get(b);
    const a=free.find(x=>x!==b && span.get(x).b1<B.b0-1e-9), c=free.find(x=>x!==b && span.get(x).b0>B.b1+1e-9);
    if(a!=null&&c!=null){ tri=[a,b,c]; break; } }
  if(!free.length){ miss('the song has no unfrozen, unmuted track — run await P.seed({replace:true})'); return out(); }
  /* (2) нужна тройка с раздельными краями — на посеве есть; у демо-пьесы её может не быть (пад тянется через всю песню): тогда случай (2)
     «не применим», это не расхождение. Случаи (3)–(6) берут любые дорожки (по кругу, повтор законен: каждый случай размораживает своё). */
  const rest0=free.filter(ly=>!tri||!tri.includes(ly)), rest= rest0.length ? rest0 : free, pickR=i=>rest[i%rest.length];
  let T=0; const G={ recording:false, clip:false, pinch:false }, calls=[];
  let ctxP=0, panHit=null, gateLog=null;
  const fake=async(layer,o)=>{ calls.push(layer);
    await new Promise(r=>setTimeout(r,0));
    if(panHit===layer){ setLanePan(layer, (lanePanOf(layer)===0.5?0.25:0.5)); panHit=null; }   // (5): дорожка меняется ВО ВРЕМЯ рендера
    if(o.layoutGate){ await o.layoutGate(); if(gateLog) gateLog.passed=true; }
    return { buf:LIVE_AC.createBuffer(2,128,LIVE_AC.sampleRate), startSec:0.5, endSec:0.5, tailSec:0, pinned:{ tonic, aRef, bpm:loop.bpm }, ms:{ layoutMs:null } }; };
  const keepPan=new Map(L.map(ly=>[ly,lanePanOf(ly)])), touchedMute=new Set(), mine=new Set();
  const SETTLE=100, STEP=SETTLE+1, Lb=x=>'L'+(x+1);
  const hook={ now:()=>T, gates:{ recording:()=>G.recording, clip:()=>G.clip, pinch:()=>G.pinch },
               ctx:()=>({ p:ctxP, end:songBeats(), rgn:null }), opt:{ renderFn:fake, noPin:true }, noPin:true, settleMs:SETTLE, frameMs:8, gatePollMs:5 };
  if(!qBegin(hook)){ miss('the freeze queue is busy (on, or a render is running) — wait and run again'); return out(); }
  const drain=async(max=12)=>{ for(let i=0;i<max;i++){ T+=STEP; const st=qStep();
      if(st.startsWith('start:')){ mine.add(calls[calls.length-1]); await qRunning(); } else if(st==='idle') break; } };
  const unfreezeMine=()=>{ for(const ly of mine) if(freezeState(ly)!=='none') unfreezeLayer(ly); };
  try{
    /* ---- (2) приоритет на настоящих дорожках ---- */
    if(!tri) notes.push('priority (tracks): not applicable on this song — no three unfrozen tracks with separate spans (the seed has them)');
    else { const [A,B,C]=tri;
    ctxP=span.get(B).b0;
    for(const [want,muted] of [[[B,C,A],null],[[C,A,B],B]]){ cases++;
      if(muted!=null){ toggleLaneMute(muted); touchedMute.add(muted); }
      calls.length=0; for(const ly of [A,B,C]) qAdd(ly,'probe');
      await drain();
      const got=calls.slice();
      if(got.join()!==want.join()) miss(`priority (tracks): playhead at ${Lb(B)}'s start${muted!=null?`, ${Lb(muted)} muted`:''} — expected ${want.map(Lb).join(', ')}, rendered ${got.map(Lb).join(', ')}`);
      if(want.join()===[A,B,C].join()) miss('priority (tracks) CONTROL: the expected order equals the song order');
      notes.push(`priority (tracks)${muted!=null?' with '+Lb(muted)+' muted':''}: ${got.map(Lb).join(', ')}`);
      if(muted!=null){ toggleLaneMute(muted); touchedMute.delete(muted); }
      unfreezeMine(); } }
    /* ---- (3) запись и клип ---- */
    const D=pickR(0), E=pickR(1), F=pickR(2), H=pickR(3);
    for(const g of ['recording','clip']){ cases++;
      calls.length=0; qAdd(D,'probe'); G[g]=true;
      const st=[]; for(let i=0;i<4;i++){ T+=STEP; st.push(qStep()); }
      if(calls.length || st.some(s=>s!=='gate:'+g)) miss(`gate (${g}): while ${g} the queue must start nothing — steps said ${st.join(', ')}, renders started ${calls.length}`);
      G[g]=false; T+=STEP; const s2=qStep(); if(s2.startsWith('start:')){ mine.add(D); await qRunning(); }
      if(!s2.startsWith('start:') || calls.length!==1) miss(`gate (${g}) CONTROL: with the gate open the queue must start the track — step said ${s2}`);
      unfreezeMine(); }
    { cases++; calls.length=0; gateLog={ passed:false }; qAdd(E,'probe'); T+=STEP; const s=qStep();   // ворота закрылись ПОСЛЕ выбора
      if(!s.startsWith('start:')) miss(`gate inside the render: the queue did not start ${Lb(E)} (${s})`);
      else { G.recording=true; mine.add(E);
        await new Promise(r=>setTimeout(r,60));
        if(gateLog.passed) miss('gate inside the render: recording began after the pick, yet the layout went ahead');
        G.recording=false; await qRunning();
        if(!gateLog.passed) miss('gate inside the render CONTROL: with the gate open again the layout never ran'); }
      gateLog=null; unfreezeMine(); }
    /* ---- (4) щипок ---- */
    { const cost0=qCostOf(F); G.pinch=true; qAdd(F,'probe');
      for(const [ms,go] of [[50,false],[null,false],[2,true]]){ cases++; calls.length=0; qCostSet(F,ms); T+=STEP; const s=qStep();
        const started=s.startsWith('start:'); if(started){ mine.add(F); await qRunning(); }
        if(started!==go) miss(`gate (pinch): a hand pinches, the track's layout is ${ms==null?'never measured':ms+' ms'} (budget 8 ms) — it must ${go?'start':'wait'}, the step said ${s}`); }
      G.pinch=false; qCostSet(F,cost0); unfreezeMine(); }
    /* ---- (5) устаревший результат не ставится ---- */
    { cases++; calls.length=0; panHit=H; qAdd(H,'probe'); T+=STEP; const s=qStep();
      if(!s.startsWith('start:')){ miss(`stale: the queue did not start ${Lb(H)} (${s})`); }
      else { mine.add(H); const res=await qRunning();
        if(freezeState(H)!=='none') miss(`stale: ${Lb(H)} changed during its render, yet its buffer was installed (${freezeState(H)})`);
        if(!/stale/.test(res)) miss(`stale: the outcome should be "stale — re-queued", got "${res}"`);
        const en=qState().entries.find(x=>x.id===freezeTicket(H).id);
        if(!en||!en.again) miss('stale: the track is not back in the queue (or not marked "changed during its render")');
        setLanePan(H, keepPan.get(H));                 // подпись меняется ещё раз — успокоение заново
        T+=SETTLE/2; const s1=qStep();
        if(s1.startsWith('start:')){ await qRunning(); miss('stale: the track was re-rendered before its signature settled'); }
        T+=SETTLE; const s2=qStep(); if(s2.startsWith('start:')) await qRunning();
        if(calls.filter(x=>x===H).length!==2 || freezeState(H)!=='fresh') miss(`stale CONTROL: after the signature settled the track should render a second time and be fresh — renders ${calls.filter(x=>x===H).length}, state ${freezeState(H)}`); }
      unfreezeMine(); }
  }catch(err){ miss('the probe failed: '+(err&&err.message)); }
  finally{
    try{ await qRunning(); }catch(e){ /* исход уже в отчёте */ }
    qEnd();
    for(const ly of touchedMute) toggleLaneMute(ly);
    for(const [ly,p] of keepPan) if(lanePanOf(ly)!==p) setLanePan(ly,p);
    for(const ly of mine) if(freezeState(ly)!=='none') unfreezeLayer(ly);
  }
  console.log(`[scaleprobe freeze-queue] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe freeze-queue] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe freeze-queue] '+m));
  if(!nBad) console.log('[scaleprobe freeze-queue] the queue takes audible tracks near the playhead first, starts nothing while recording or recording a clip (and stops before the layout if that begins after the pick), waits on a pinch when the layout costs a frame, never installs a stale buffer and renders a track that kept changing once, with its final signature');
  return out();
}
/* ═══ ⛳ AF3: THE AUTO-FREEZE WATCHER — P.checkAutoFreeze (row 'AF3 auto-freeze watcher', P.quick and P.all) ═══
   Deterministic: the watcher and queue run with a probe clock and hand-driven ticks (afBegin/afTick, 50-ms steps), renders are fakes
   (a 128-sample buffer through the real ticket and freezeSet), the watcher looks at one track only (hook.layers). Cases: each trigger
   makes a candidate after its delay and not before (start within one step after it) — default change, pan (held, then released),
   editor (open = held; editClose is the real site), take end (recording gate, then the hint), undo, backing, row delete, song load;
   five edits 0.6 s apart → exactly one render, 1 s after the last; level → no render; tonic → no render, stays fresh (TF2); A4, tempo
   (TF4) → stale at once, one re-render 1.5 s after the last move (three A4 moves 0.6 s apart → one), restored → once more; budget skip
   (no render, not retried); an editor-created track carries a pinned chain.
   CONTROLS that must fail: a settle clock that does not reset (dbg.noReset) renders before the edits end; a watcher that reacts to
   level (dbg.level) renders; the pre-TF4 switch (dbg.noRetune) leaves an A4 change unrendered; with the default budget the skipped
   track renders. Everything restored in finally: pans, levels, tonic, A4, tempo, the probe's frozen tracks, the probe's track. ≈ 1–2 s. */
export async function checkAutoFreeze(){
  const bad=[], notes=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  const out=()=>({ cases, song:L.length, total:nBad, differences:bad, notes });
  if(!L.length) return { cases:0, song:0, total:0, differences:[], notes };
  if(!LIVE_AC){ miss('audio is not started (press ▶ Play)'); return out(); }
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return out(); }
  if(recording||loop.on){ miss('the transport is playing or recording — stop it first'); return out(); }
  await import('../render.js');   // the queue's runner (render.freeze)
  const A=L.find(ly=>freezeState(ly)==='none' && !laneMuted(ly) && laneHasChain(ly) && !events.some(e=>e.layer===ly&&e.fn==='drone'));
  if(A==null){ miss('the song has no unfrozen track with a chain — run await P.seed({replace:true})'); return out(); }
  const Lb=x=>'L'+(x+1), STEP=50, MB=1048576;
  let T=0; const G={ rec:false }, calls=[];
  const fake=async(layer)=>{ calls.push({ layer, T }); await new Promise(r=>setTimeout(r,0));
    return { buf:LIVE_AC.createBuffer(2,128,LIVE_AC.sampleRate), startSec:0.5, endSec:0.5, tailSec:0, pinned:{ tonic, aRef, bpm:loop.bpm }, ms:{ layoutMs:1 } }; };
  const hook={ now:()=>T, gates:{ recording:()=>G.rec, clip:()=>false, pinch:()=>false }, ctx:()=>({ p:0, end:songBeats(), rgn:null }),
               opt:{ renderFn:fake }, layers:[A], dbg:{}, budgetMB:null };
  const keep={ pan:lanePanOf(A), lvl:laneLevelOf(A), tonic, aRef, bpm:loop.bpm };
  let made=null;
  /* advance the probe clock by ms in STEP ticks; returns the probe times of renders started */
  const run=async ms=>{ const st=[]; for(let x=0;x<ms;x+=STEP){ T+=STEP; const s=afTick(); if(s.startsWith('start:')){ st.push(T); await qRunning(); } } return st; };
  const pans=[0.21,-0.33,0.47,-0.12,0.3,-0.4,0.15,-0.25,0.38,-0.05,0.27,-0.18];
  let pi=0; const nudge=()=>setLanePan(A, pans[(pi++)%pans.length]);
  /* one trigger: act() at t0 (the change and its hint); no render before t0+delay, one within two steps after */
  const trial=async(label, delay, act, pre)=>{ cases++;
    if(freezeState(A)!=='fresh'){ miss(`${label}: ${Lb(A)} is not fresh before the case (${freezeState(A)})`); return; }
    if(pre){ const early=await pre(); if(early.length){ miss(`${label}: rendered while held (at +${early[0]} ms)`); return; } }
    const t0=T; act();
    const st=await run(delay+3*STEP);
    const at=st.length ? st[0]-t0 : null;
    if(at==null) miss(`${label}: no render within ${delay+3*STEP} ms (delay ${delay} ms)`);
    else if(at<delay) miss(`${label}: rendered ${at} ms after the trigger — before its ${delay}-ms delay`);
    else if(at>delay+2*STEP) miss(`${label}: rendered ${at} ms after the trigger — later than its ${delay}-ms delay plus two steps`);
    if(st.length>1) miss(`${label}: ${st.length} renders, expected one`);
    if(freezeState(A)!=='fresh') miss(`${label}: ${Lb(A)} is ${freezeState(A)} after its render`);
    notes.push(`${label}: render ${at} ms after the trigger (delay ${delay} ms)`); };
  if(!afBegin(hook)){ miss('auto-freeze is busy (a render is running or another probe drives it) — run again'); return out(); }
  try{
    /* (0) the first scan finds the unfrozen track: default delay */
    { cases++; const st=await run(AF_DELAY.change+3*STEP);
      if(st.length!==1 || freezeState(A)!=='fresh') miss(`first scan: expected one render of ${Lb(A)} after ${AF_DELAY.change} ms, got ${st.length} (${freezeState(A)})`);
      else if(st[0]<AF_DELAY.change) miss(`first scan: rendered at ${st[0]} ms, before ${AF_DELAY.change} ms`); }
    /* (1) each trigger */
    await trial('any change (no hint)', AF_DELAY.change, ()=>nudge());
    await trial('pan (held, then released)', AF_DELAY.pan, ()=>{ nudge(); afHint('pan'); },
      async()=>{ afHint('panHold'); nudge(); return run(2000); });
    await trial('editor (open = held; real editClose)', AF_DELAY.editor, ()=>editClose(),
      async()=>{ editOpen(A); nudge(); const r=await run(2000); return r; });
    await trial('take end (recording gate, then the hint)', AF_DELAY.take, ()=>{ G.rec=false; afHint('take'); },
      async()=>{ G.rec=true; nudge(); return run(2000); });
    for(const k of ['undo','backing','rowDelete','song']) await trial(k, AF_DELAY[k], ()=>{ nudge(); afHint(k); });
    /* (2) repeated edits within the settle time — exactly one render, after the last */
    const burst=async label=>{ calls.length=0; const t0=T; let tl=0;
      for(let i=0;i<5;i++){ nudge(); afHint('pan'); tl=T; await run(600); }
      const st=await run(AF_DELAY.pan+3*STEP); return { n:calls.length, first: calls.length ? calls[0].T-t0 : null, last:tl-t0, st }; };
    { cases++; const b=await burst('burst');
      if(b.n!==1) miss(`five pan moves 600 ms apart: expected exactly one render, got ${b.n}`);
      else if(b.first<b.last+AF_DELAY.pan) miss(`five pan moves: the render came ${b.first} ms after the first move, before the last move + ${AF_DELAY.pan} ms (${b.last+AF_DELAY.pan})`);
      if(freezeState(A)!=='fresh') miss(`five pan moves: the installed buffer is not fresh against the final signature (${freezeState(A)})`);   // merged from AF1 case (6)
      notes.push(`five moves 600 ms apart: ${b.n} render at +${b.first} ms (last move at +${b.last} ms)`);
      cases++; hook.dbg.noReset=true; const c=await burst('control'); hook.dbg.noReset=false;
      if(c.n<=1 && !(c.first!=null && c.first<c.last+AF_DELAY.pan)) miss('CONTROL (settle clock that does not reset): it still gave one render after the last move — the case cannot fail');
      notes.push(`control, clock not reset: ${c.n} render(s), first at +${c.first} ms`);
      await run(AF_DELAY.pan+3*STEP); }
    /* (3) level never triggers; control: a watcher that reacts to level */
    { cases++; calls.length=0; setLaneLevel(A, keep.lvl===0.5?0.6:0.5); await run(3000); setLaneLevel(A, keep.lvl); await run(3000);
      if(calls.length) miss(`level: moving ${Lb(A)}'s level gave ${calls.length} render(s) — level is not in the frozen sound`);
      cases++; hook.dbg.level=true; await run(STEP); calls.length=0; setLaneLevel(A, keep.lvl===0.5?0.6:0.5); await run(3000);
      hook.dbg.level=false; setLaneLevel(A, keep.lvl);
      if(!calls.length) miss('CONTROL (a watcher that reacts to level): no render — the level case cannot fail');
      notes.push(`level: 0 renders; control reacting to level: ${calls.length}`); await run(500); }
    /* (4) TF2: the tonic leaves the frozen track fresh (no render). TF4: A4, tempo — the track goes stale at once (plays its events), renders
       after the 'retune' settle and not before, fresh again; three moves 0.6 s apart → one render after the last; restored → once more. */
    { cases++; calls.length=0; setTonic((keep.tonic+2)%12); await run(3000); const st=freezeState(A); setTonic(keep.tonic); await run(1000);
      if(calls.length) miss(`tonic: a key change re-rendered ${Lb(A)} — recordings keep their key (TF2)`);
      if(st!=='fresh') miss(`tonic: after a key change ${Lb(A)} should stay fresh (TF2), it is ${st}`); }
    const retuneTrial=async(name, vals, set)=>{ cases++;
      if(freezeState(A)!=='fresh'){ miss(`${name}: ${Lb(A)} is not fresh before the case (${freezeState(A)})`); return null; }
      calls.length=0; const t0=T; let tl=t0, st0=null;
      for(let i=0;i<vals.length;i++){ if(i) await run(600); set(vals[i]); tl=T; if(!i){ await run(STEP); st0=freezeState(A); } }
      const st=await run(AF_DELAY.retune+3*STEP), at= calls.length ? calls[0].T-tl : null;
      return { st0, n:calls.length, at, fresh:freezeState(A)==='fresh', starts:st }; };
    const retuneCheck=(label,r)=>{ if(!r) return;
      if(r.st0!=='stale') miss(`${label}: right after the change ${Lb(A)} should be stale (playing its events), it is ${r.st0}`);
      if(r.n!==1) miss(`${label}: expected exactly one re-render after the last move, got ${r.n}`);
      else if(r.at<AF_DELAY.retune) miss(`${label}: re-rendered ${r.at} ms after the last move — before its ${AF_DELAY.retune}-ms delay`);
      else if(r.at>AF_DELAY.retune+2*STEP) miss(`${label}: re-rendered ${r.at} ms after the last move — later than ${AF_DELAY.retune} ms plus two steps`);
      if(!r.fresh) miss(`${label}: after the re-render ${Lb(A)} is ${freezeState(A)}, want fresh`);
      notes.push(`${label}: ${r.n} re-render at +${r.at} ms after the last move (delay ${AF_DELAY.retune} ms)`); };
    const a1=keep.aRef===440?442:440, a2=keep.aRef===440?443:441, a3=keep.aRef===440?444:439;
    retuneCheck('A4 (three moves)', await retuneTrial('A4', [a1,a2,a3], v=>setARef(v)));
    retuneCheck('A4 restored', await retuneTrial('A4 restored', [keep.aRef], v=>setARef(v)));
    retuneCheck('tempo', await retuneTrial('tempo', [keep.bpm+12], v=>setLoopBpm(v)));
    retuneCheck('tempo restored', await retuneTrial('tempo restored', [keep.bpm], v=>setLoopBpm(v)));
    /* CONTROL: the pre-TF4 switch (off) — an A4 change must leave the track stale with no render, so the cases above can fail */
    { cases++; hook.dbg.noRetune=true; const r=await retuneTrial('control', [a1], v=>setARef(v)); hook.dbg.noRetune=false;
      if(r && r.n===1 && r.fresh) miss('CONTROL (re-freeze on A4/tempo switched off): the A4 change still re-rendered — the cases cannot fail');
      notes.push(`control, switch off: ${r?r.n:'—'} render(s), ${freezeState(A)}`);
      setARef(keep.aRef); await run(AF_DELAY.retune+3*STEP);
      cases++; if(freezeState(A)!=='fresh') miss(`control: back at A4 ${keep.aRef} ${Lb(A)} should be fresh again (its old buffer), it is ${freezeState(A)}`); }
    /* (5) memory budget: over it → skipped, not retried; control: the default budget renders it */
    { cases++; calls.length=0; hook.budgetMB=frzBytesTotal()/MB+0.001; nudge(); afHint('pan'); await run(3000);
      const en=qState().entries.find(e=>e.id===laneIdOf(A));
      if(calls.length) miss(`budget: ${calls.length} render(s) over the budget`);
      if(!en || en.state!=='skip' || !en.skip || en.skip.why!=='budget') miss(`budget: ${Lb(A)} should be listed as skipped (budget), got ${en?en.state+(en.skip?' '+en.skip.why:''):'no entry'}`);
      cases++; hook.budgetMB=null; await run(2000);
      if(calls.length) miss('budget: the skipped track was retried without a change');
      cases++; nudge(); afHint('pan'); await run(AF_DELAY.pan+3*STEP);
      if(calls.length!==1) miss(`CONTROL (budget): with the default budget and a change the track should render once, got ${calls.length}`);
      notes.push(`budget: skipped and not retried; default budget: ${calls.length} render`); }
    /* (6) an editor-created track carries a pinned chain (and the pin is in the insert's history entry) */
    { cases++; const ly=Math.max(...L)+1;
      if(editOpen(ly) && editInsertHit(0,0)){ made=ly;
        if(!laneHasChain(ly)) miss(`editor-created track ${Lb(ly)}: no captured chain after the first insert`);
        const ci=captureInfoOf(ly); if(!ci||!ci.takes) miss(`editor-created track ${Lb(ly)}: captureInfoOf reports no captured take`);
        cases++; editUndo(); if(events.some(e=>e.layer===ly)) miss(`editor-created track: ↶ left its events`);
        editRedo(); if(!laneHasChain(ly)) miss('editor-created track: ↷ brought the insert back without its chain');
      } else miss(`editor-created track: could not open the editor on ${Lb(ly)} and insert a hit`);
      editClose(); }
  }catch(err){ miss('the probe failed: '+(err&&err.stack||err)); }
  finally{
    try{ await qRunning(); }catch(e){}
    afEnd();
    if(editIsOpen()) editClose();
    if(made!=null && events.some(e=>e.layer===made)){ laneDelTap(made); laneDelTap(made); }
    if(tonic!==keep.tonic) setTonic(keep.tonic); if(aRef!==keep.aRef) setARef(keep.aRef); if(loop.bpm!==keep.bpm) setLoopBpm(keep.bpm);
    if(lanePanOf(A)!==keep.pan) setLanePan(A, keep.pan); if(laneLevelOf(A)!==keep.lvl) setLaneLevel(A, keep.lvl);
    if(freezeState(A)!=='none') unfreezeLayer(A);
  }
  console.log(`[scaleprobe auto-freeze] ${Lb(A)} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe auto-freeze] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe auto-freeze] '+m));
  if(!nBad) console.log('[scaleprobe auto-freeze] every trigger makes its track a candidate after its own delay and not before, an edit burst gives one render after it ends, level and tonic/A4/tempo give none, a track over the memory budget is skipped and not retried, an editor-created track carries a pinned chain — and the controls show each case could fail');
  return out();
}
/* ═══ ⛳ AF5: A TRACK AND THE LIVE HANDS NEVER SHARE AN EFFECT NETWORK — P.checkLiveIsolation (row 'AF5 track and live isolated') ═══
   The user's hard rule, read on the live voice path, not by capturing audio: the live chord chain (composition, every instance value, its
   output gain), the live owner's route/level/pan and the live solo scalars must stay EXACTLY the same while a chord track is edited in
   the editor (Volume lane, an effect value — reverb mix at its last beat — and its pan), after leaving, while the transport plays it
   unfrozen, and while it is frozen. The other way: turning the live reverb mix leaves the track chain and the frozen track untouched.
   Positive checks (the case can fail): while playing, the TRACK chain carries the edited value; the track's owner routes to the track
   chain. AF5: a frozen track drives no chain. CONTROL that must fail: the old shared network (recorder.setLiveIsolation(false)) — the live
   chain then takes the track's value. Real time: the transport plays ≈ 1 s per state. Everything restored. */
export async function checkLiveIsolation(){
  const bad=[], notes=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  const out=()=>({ cases, song:L.length, total:nBad, differences:bad, notes });
  if(!L.length) return { cases:0, song:0, total:0, differences:[], notes };
  if(!LIVE_AC){ miss('audio is not started (press ▶ Play)'); return out(); }
  if(editIsOpen()||rollOpen||arrOpen||recording||loop.on){ miss('stop the transport and close the editor/arrangement first'); return out(); }
  const R=await import('../render.js'), LK=chainKeyOf('ch'), TK=trackChainKeyOf(LK);
  const C=L.find(ly=>laneRoleOf(ly)==='ch' && laneHasChain(ly) && freezeState(ly)==='none' && autChainOf(ly).includes('reverb') && !events.some(e=>e.layer===ly&&e.jam));
  if(C==null){ miss('no unfrozen chord track with a reverb in its chain — run await P.seed({replace:true})'); return out(); }
  const Lb='L'+(C+1), tl=Math.max(...events.filter(e=>e.layer===C).map(e=>e.t));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const LIVE_KEYS=['latch','lead:L','lead:R','lead:M','bass','bass:L',null];   // live owners of every role (null — a live drum hit)
  const liveState=()=>JSON.stringify({ chain:chainStateOf(LK), solo:chainStateOf(chainKeyOf('ld')), bs:chainStateOf(chainKeyOf('bs')), dr:chainStateOf(chainKeyOf('dr')),
    route:LIVE_KEYS.map(routeOfOwner), gain:LIVE_KEYS.map(ownerGain), pan:LIVE_KEYS.map(ownerPan), master:masterLevel(), scal:{...stateFx}, cfg:fxChainOf(LK) });
  /* a sounding live chord: every voice's track-level stage, pan pair and router (the stages a track's mixer level/pan act on) */
  const voiceRead=async()=>{ WchOn('latch',0,1,0.9,chIdx); await sleep(150); const vs=chordHold['latch']||[];
    const r=JSON.stringify(vs.map(v=>[+v.tg.gain.value.toFixed(5), +v.pan.l.gain.value.toFixed(5), +v.pan.r.gain.value.toFixed(5), v.rt?+v.rt.rL.gain.value.toFixed(5):null, v.rt?+v.rt.rT.gain.value.toFixed(5):null]));
    WchOff('latch'); await sleep(80); return r; };
  const mixOf=k=>{ const st=chainStateOf(k); const r=st.vals.reverb; return r ? r[fxParamKeysOf('reverb').indexOf('mix')] : null; };
  /* RUN 3: the live mix is kept and restored EXACTLY (chainStateOf rounds to 6 digits — restoring that left the live chord reverb mix
     5e-7 off for every later row; the SONG2 row saw it) */
  const exactMix=k=>{ const st=chainStateOf(k); if(!st.vals.reverb) return null; const p=fxInstance(k,'reverb').params.find(q=>q.key==='mix'); return p ? p.cur : mixOf(k); };
  const keep={ pan:lanePanOf(C), rgn:regionOn(), liveMix:exactMix(LK) };
  let frozeC=false, ptAdded=false, hist=null, mix=null;
  const play=async(ms)=>{ seekTo(Math.max(0,tl-1)); onLoop(); await sleep(ms); };
  const stop=async()=>{ if(loop.on) onLoop(); await sleep(60); };
  try{
    if(keep.rgn) setRegionOn(false);
    const L0=liveState();
    const same=(label)=>{ cases++; const s=liveState(); if(s!==L0) miss(`${label}: the LIVE path changed — ${diffKeys(L0,s)}`); };
    /* 1) edits in the editor */
    editOpen(C);
    { const D=autPoints(C,LK,FX_VOL,'amt'), r=D&&D.pts&&D.pts.find(x=>x.pt&&!x.pt.unset);
      if(r) autMovePoint(r.pt, r.pt.t, Math.max(0, r.pt.v-0.5)); else notes.push('no volume point to move'); }
    ptAdded=!!autAddPoint(C,'reverb','mix',tl,0.02);
    if(!ptAdded) miss(`${Lb}: the editor did not take a reverb-mix point`);
    setLanePan(C,-0.6);
    same('editor open, after volume, effect and pan edits');
    hist=editHistPeek();   // the edits are walked back through the editor's own undo at the end (exact payloads, no shape marks left)
    editClose(); same('after leaving the editor');
    /* 2) the track plays through events (unfrozen) */
    await play(1100);
    same('transport playing the edited track (unfrozen)');
    cases++; const tm=mixOf(TK), drvC=fxPlayDriving().some(x=>x.key===TK&&x.fx==='reverb'&&x.p==='mix');   // a take may span several layers — the entry's layer is the take's first
    if(!drvC || tm==null || !(tm<keep.liveMix)) miss(`positive: while playing, ${Lb}'s edited reverb mix should drive the TRACK chain (driving: ${drvC}, track mix ${tm}, live mix ${keep.liveMix})`);
    cases++; if(routeOfOwner('loop:'+C)!=='track' || routeOfOwner('latch')!=='live') miss(`routing: the track's owner → ${routeOfOwner('loop:'+C)}, the live latch → ${routeOfOwner('latch')} (expected track / live)`);
    /* 3) the other way: a live knob moves while the track plays — the track chain keeps the track's value */
    cases++; fxPlaySet(LK,'reverb','mix',0.9); await sleep(150);
    const tm2=mixOf(TK); if(tm2==null || !(tm2<0.2)) miss(`live → track (playing): with the live reverb mix at 0.9 the track chain reads ${tm2} — it follows its automation (< 0.2 here), never the hand`);
    fxPlaySet(LK,'reverb','mix',keep.liveMix);
    await stop(); same('transport stopped');
    /* 1b) the MIXER's level and pan — of the ARMED track and of a track that is NOT armed — never reach a live voice */
    { const V0=await voiceRead(), C2=L.find(ly=>ly!==C && laneRoleOf(ly) && ly!==armedLayer());
      mix={ arm:armedLayer(), lv:new Map(), pn:new Map() };
      for(const ly of [C,C2]) if(ly!=null){ mix.lv.set(ly,laneLevelOf(ly)); mix.pn.set(ly,lanePanOf(ly)); }
      if(armedLayer()!==C) toggleArm(C);
      for(const [ly,lab] of [[C,'armed'],[C2,'not armed']]) if(ly!=null){ cases++;
        setLaneLevel(ly,0.2); setLanePan(ly,0.8);
        same(`mixer level 0.2 + pan 0.8 of the ${lab} track L${ly+1}`);
        const vr=await voiceRead(); if(vr!==V0) miss(`mixer (${lab} track L${ly+1}): a live chord voice changed — ${V0} → ${vr}`); }
      cases++; setLiveLeakDbg(C); const vc=await voiceRead(); setLiveLeakDbg(null);
      if(vc===V0) miss('CONTROL (a live voice takes the armed track’s level and pan): the voice read-out did not change — the mixer case cannot fail');
      notes.push(`mixer level/pan of the armed L${C+1}${C2!=null?' and the unarmed L'+(C2+1):''}: live voices ${V0}; control ${vc}`); }
    cases++; { const t0s=JSON.stringify(chainStateOf(TK)); fxPlaySet(LK,'reverb','mix',0.9); const t1s=JSON.stringify(chainStateOf(TK)); fxPlaySet(LK,'reverb','mix',keep.liveMix);
      if(t1s!==t0s) miss('live → track (stopped): turning the live reverb mix changed the track chain'); }
    /* 4) frozen (fake buffer through the real ticket): it plays its buffer, drives no chain (AF5), the live path stays */
    const fake=async()=>({ buf:LIVE_AC.createBuffer(2,128,LIVE_AC.sampleRate), startSec:0.5, endSec:0.5, tailSec:0, pinned:{ tonic, aRef, bpm:loop.bpm }, ms:{ layoutMs:1 } });
    const r=await R.freeze(C,{ renderFn:fake, noPin:true, quiet:true }); frozeC= !!(r&&r.installed);
    if(!frozeC) miss(`${Lb}: the fake freeze was not installed (${r&&r.refused})`);
    else { await play(1100);
      same('transport playing the frozen track');
      cases++; const drv=fxPlayDriving().filter(x=>x.layer===C); if(drv.length) miss(`AF5: the frozen ${Lb} still drives ${drv.length} address(es) (${drv.slice(0,3).map(x=>x.key+' '+x.fx+':'+x.p).join(', ')})`);
      await stop(); }
    /* CONTROL — the old shared network must change the live path */
    if(frozeC){ unfreezeLayer(C); frozeC=false; }
    cases++; setLiveIsolation(false);
    try{ await play(1100); const s=liveState(); if(s===L0) miss('CONTROL (old shared network): the live path did not change while the edited track played — the case cannot fail');
      notes.push(`control (shared network): live reverb mix while playing ${mixOf(LK)}`); }
    finally{ await stop(); setLiveIsolation(true); }
    notes.push(`${Lb}: live path unchanged in 5 states; track chain reverb mix ${tm} while playing`);
  }catch(err){ miss('the probe failed: '+(err&&err.stack||err)); }
  finally{
    if(loop.on) onLoop();
    setLiveIsolation(true);
    if(frozeC) unfreezeLayer(C);
    if(editIsOpen()){ if(!hist) hist=editHistPeek(); editClose(); }
    /* undo the editor edits (volume point, reverb point) through the editor's own history — the exact payloads come back; restoring by
       moving the point again left a hand-shape mark ('sh') on the seed's volume and failed «seed notes as intended» in a later P.all */
    if(hist&&hist.length){ editOpen(C); if(!editRevert(hist)) miss(`${Lb}: the editor edits could not be reverted`); editClose(); }
    setLiveLeakDbg(null);
    if(mix){ for(const [ly,v] of mix.lv) setLaneLevel(ly,v); for(const [ly,v] of mix.pn) setLanePan(ly,v);
      if(armedLayer()!==mix.arm){ if(armedLayer()!=null) toggleArm(armedLayer()); if(mix.arm!=null) toggleArm(mix.arm); } }
    if(lanePanOf(C)!==keep.pan) setLanePan(C,keep.pan);
    if(exactMix(LK)!==keep.liveMix && keep.liveMix!=null) fxPlaySet(LK,'reverb','mix',keep.liveMix);
    cases++; if(keep.liveMix!=null && exactMix(LK)!==keep.liveMix) miss(`the live chord reverb mix is ${exactMix(LK)} after the row, not exactly ${keep.liveMix}`);
    if(keep.rgn && !regionOn()) setRegionOn(true);
    if(freezeState(C)!=='none') unfreezeLayer(C);
  }
  console.log(`[scaleprobe isolation] ${Lb} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe isolation] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe isolation] '+m));
  if(!nBad) console.log('[scaleprobe isolation] editing a track (volume, an effect value, pan) never moves the live path — in the editor, after it, while the track plays unfrozen or frozen; a live knob never moves the track chain; a frozen track drives no chain; and the old shared network (control) does move it');
  return out();
}
const diffKeys=(a,b)=>{ const A=JSON.parse(a), B=JSON.parse(b); return Object.keys(A).filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k])).map(k=>k+': '+JSON.stringify(A[k]).slice(0,120)+' → '+JSON.stringify(B[k]).slice(0,120)).join('; '); };
/* ═══ ⛳ AF1: ЗАМЕР — РАСКЛАДКА НА ГЛАВНОМ ПОТОКЕ И ПАМЯТЬ ЗАМОРОЖЕННЫХ БУФЕРОВ — P.freezeCost() (по запросу, не в P.all) ═══
   Для КАЖДОЙ дорожки — раскладка без рендера (render.layoutCost: тот же путь, что у заморозки, до startRendering), то есть:
     • layoutMs — синхронный участок главного потока (то, что ворота щипка сравнивают с бюджетом), худший и типичный (медиана);
     • память буфера, который дал бы рендер СЕГОДНЯ: стерео float32 × (разгон 0.5 с + от первого события до конца материала + хвост);
     • (a) ТОЛЬКО НОТЫ И ХВОСТ: объединение [начало ноты, конец ноты + хвост] без разгона — паузы длиннее хвоста не хранятся;
     • (b) 16 БИТ: вдвое меньше float32 (плюс короткие куски float32 у бегунка — не в счёте);
     • ОДИН ЦИКЛ: повторяется ли СОДЕРЖИМОЕ дорожки (те же события с тем же шагом в целое число тактов) — тогда сколько хранил бы один цикл.
   ⚠️ Числа — от живой частоты дискретизации и цепей, как стоят; время раскладки — этой машины (телефон — отдельный замер). */
export async function freezeCost(){
  if(!LIVE_AC){ console.warn('[scaleprobe cost] audio is not started (press ▶ Play)'); return null; }
  if(recording){ console.warn('[scaleprobe cost] recording — stop it first'); return null; }
  const R=await import('../render.js');
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b), rows=[], spb=60/loop.bpm, MB=1024*1024;
  const NV=songNotes();
  const repeatOf=ly=>{   // наименьший шаг в целое число тактов, с которым содержимое дорожки повторяется (≥ 2 копий), или null
    const evs=events.filter(e=>e.layer===ly).slice().sort((a,b)=>a.t-b.t); if(evs.length<2) return null;
    const tok=e=>{ const a=e.a||{}; return [e.fn,a.ti,a.oct,a.row,a.kit,a.inst,a.vol!=null?Math.round(a.vol*1000):'',a.ty?JSON.stringify(a.ty):'',a.bri!=null?Math.round(a.bri*1000):''].join('|'); };
    const at=new Set(evs.map(e=>Math.round(e.t*1000)+'#'+tok(e)));
    const b0=evs[0].t, b1=evs[evs.length-1].t, Mt=loop.metre;
    for(let P=Mt; P<=b1-b0+1e-9; P+=Mt){
      let ok=true; for(const e of evs){ if(e.t+P>b1+1e-9) continue; if(!at.has(Math.round((e.t+P)*1000)+'#'+tok(e))){ ok=false; break; } }
      if(ok) return { P, copies:Math.floor((b1-b0)/P+1e-9)+1 };
    }
    return null; };
  for(const ly of L){
    let r=null; try{ r=await R.layoutCost(ly); }catch(err){ rows.push({ track:'L'+(ly+1), error:err&&err.message }); continue; }
    const B=sec=>sec*r.rate*2*4/MB;
    const evs=events.filter(e=>e.layer===ly), t0=Math.min(...evs.map(e=>e.t)), tEnd=t0+r.songSec/spb;
    const iv=[];
    for(const n of NV.notes) if(n.layer===ly) iv.push([(n.start-t0)*spb, ((n.end==null?tEnd:n.end)-t0)*spb + r.tailSec]);
    if(evs.some(e=>e.fn==='drone')) iv.push([0, (tEnd-t0)*spb + r.tailSec]);
    iv.sort((a,b)=>a[0]-b[0]); let a=0, cs=0, ce=-1;
    for(const [s,e] of iv){ if(s>ce){ if(ce>cs) a+=ce-cs; cs=s; ce=e; } else ce=Math.max(ce,e); } if(ce>cs) a+=ce-cs;
    const per=repeatOf(ly);
    /* AF6b: «today» — ПАМЯТЬ СЕЙЧАС: у замороженной — настоящие байты хранилища (frozenInfo.bytes: 16 бит, или Float32-запас без ворклета),
       у прочих — сколько заняла бы её заморозка в 16 битах; «Float32» — прежняя мера (до AF6b), для сравнения */
    const fi=frozenInfo(ly), now16=fi ? fi.bytes/MB : B(r.totalSec)/2;
    rows.push({ track:'L'+(ly+1), role:laneRoleOf(ly)||'—', 'layout ms':r.ms.layoutMs, 'buffer s':+r.totalSec.toFixed(1), frozen: fi ? fi.kind : '—',
      'Float32 MB (before AF6b)':+B(r.totalSec).toFixed(1), 'today MB':+now16.toFixed(2), '(a) notes+tail 16-bit MB':+(B(a)/2).toFixed(1),
      repeats:per?`${per.copies}× every ${per.P/loop.metre} bar(s)`:'—', 'one cycle MB':per?+B(per.P*spb+r.tailSec).toFixed(1):'—' });
  }
  const ok=rows.filter(x=>x['layout ms']!=null), ms=ok.map(x=>x['layout ms']).sort((a,b)=>a-b), med=ms.length?ms[Math.floor((ms.length-1)/2)]:null;
  const sum=k=>+ok.reduce((s,x)=>s+(typeof x[k]==='number'?x[k]:0),0).toFixed(1);
  console.table(rows);
  const res={ tracks:rows.length, layoutWorst:ms.length?ms[ms.length-1]:null, layoutTypical:med, frameBudget:8,
    mb:{ float32:sum('Float32 MB (before AF6b)'), today:sum('today MB'), a16:sum('(a) notes+tail 16-bit MB'),
         frozenNow:+ok.reduce((s,x)=>s+(x.frozen!=='—'?x['today MB']:0),0).toFixed(2) }, rows };
  console.log(`[scaleprobe cost] ${rows.length} tracks · layout worst ${res.layoutWorst} ms, typical ${res.layoutTypical} ms (budget at a pinch ${res.frameBudget} ms) · memory: Float32 (before AF6b) ${res.mb.float32} MB → today (16-bit; real bytes of the frozen tracks) ${res.mb.today} MB, of which frozen now ${res.mb.frozenNow} MB → with (a) notes+tail also ${res.mb.a16} MB`);
  return res;
}
/* ═══ ⛳ LR1: ЖИВОЙ И ЗАМОРОЖЕННЫЙ РЕВЕРБ СОГЛАСНЫ — P.checkRevAgree ═══
   Тело — render.revAgree (там материал, мера, допуск и контроли — см. его шапку): временная дорожка аккордов играет ЖИВЫМ движком (R.live,
   выход мастера снят мимо колонок) и рендерится путём ЗАМОРОЗКИ; энергия хвоста относительно звучания и спектральный баланс хвоста обязаны
   совпасть в пределах допуска (дБ), а контроли — дорожка с другой длиной хвоста и с другой окраской — обязаны из него выйти (мера умеет
   провалиться). Временные дорожки снимаются, величины цепи аккордов возвращаются. Транспорт должен стоять. ≈ 8–10 с: в P.all, не в P.quick. */
export async function checkRevAgree(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('../render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.revAgree();
  if(!r.ok){ miss('live vs frozen reverb: '+r.why); console.warn('[scaleprobe rev-agree] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=3;
  meas('tail energy live − frozen', r.dEnergy, r.tolE, 'abs', ' dB'); meas('tail balance live − frozen', r.dBright, r.tolB, 'abs', ' dB');
  meas('control: decay moves energy by', Math.abs(r.ctrlDecay.dEnergy), r.tolE, 'min', ' dB'); meas('control: tone moves balance by', Math.abs(r.ctrlTone.dBright), r.tolB, 'min', ' dB');
  if(!r.agree) miss(`live and frozen reverb disagree: tail energy Δ ${r.dEnergy} dB, tail balance Δ ${r.dBright} dB (tolerance ±${r.tolE} / ±${r.tolB} dB)`);
  if(Math.abs(r.ctrlDecay.dEnergy)<=r.tolE) miss(`control: a ${r.ctrlDecay.sec}-s tail moves the tail energy by only ${r.ctrlDecay.dEnergy} dB — the energy measure could not fail`);
  if(Math.abs(r.ctrlTone.dBright)<=r.tolB) miss(`control: a ${r.ctrlTone.hz}-Hz tone moves the tail balance by only ${r.ctrlTone.dBright} dB — the balance measure could not fail`);
  console.log(`[scaleprobe rev-agree] tail energy live ${r.live.energy} dB / frozen ${r.frozen.energy} dB (Δ ${r.dEnergy}, tolerance ±${r.tolE}) · tail balance live ${r.live.bright} / frozen ${r.frozen.bright} dB (Δ ${r.dBright}, ±${r.tolB}) · controls: ${r.ctrlDecay.sec}-s tail Δ ${r.ctrlDecay.dEnergy} dB, ${r.ctrlTone.hz}-Hz tone Δ ${r.ctrlTone.dBright} dB · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe rev-agree] '+m));
  return { cases, total:nBad, differences:bad };
}
/* ═══ ⛳ AF6b: 16-БИТНЫЙ ЗАМОРОЖЕННЫЙ БУФЕР ЗВУЧИТ КАК FLOAT32 — P.checkChunks ═══
   Тело — render.chunkCheck (материал, прогоны, сопоставление по кадрам, допуски и контроли — в его шапке): живой мастер, пока замороженная
   дорожка (громче 1.0) играет через стыки кусков, шов скобы и перемотку, против того же прогона с Float32-хранением тем же чтецом; чтец
   против самого рендера; длина до сэмпла. Контроли: кусок со сдвигом на сэмпл, выброшенный кусок, хранение без масштаба — обязаны
   провалиться. Беззвучно (мастер мимо колонок). Транспорт стоит, соло снято, R.autoFreeze выключен. ≈ 12 с — в P.all, не в P.quick. */
export async function checkChunks(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('../render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.chunkCheck();
  if(!r.ok){ miss('16-bit frozen playback: '+r.why); console.warn('[scaleprobe chunks] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=9;   // AF6b-fix2: + утечка чтецов и её контроль
  meas('16-bit vs Float32 residual', r.residual, -90, 'max', ' dB'); meas('reader vs render', r.readerExact, -100, 'max', ' dB'); meas('worst chunk-join step', r.joinWorst, 3, 'max', '×');
  if(r.controls){ meas('control: one-sample shift', r.controls.shift, -90, 'min', ' dB'); meas('control: dropped chunk', r.controls.drop, -90, 'min', ' dB'); meas('control: no scale', r.controls.noscale, -90, 'min', ' dB'); }
  meas('slowest end report after stop', r.endLag, null, null, ' ms');
  for(const m of r.fails) miss(m);
  r.notes.forEach(m=>console.log('[scaleprobe chunks] '+m));
  console.log(`[scaleprobe chunks] track peak ${r.peak} (above 1.0 before the master) · ${r.len} frames · 16-bit vs Float32 residual ${r.residual} dB re peak (limit −90) · reader vs render ${r.readerExact} dB · chunk joins ${r.joins}, worst step ${r.joinWorst}× · controls: one-sample shift ${r.controls&&r.controls.shift} dB, dropped chunk ${r.controls&&r.controls.drop} dB, no scale ${r.controls&&r.controls.noscale} dB (each must be above −90) · end reports: slowest ${r.endLag} ms after the stop (waited up to ${r.endWait} ms) · live readers on the audio thread: before ${r.base}, after ${r.aliveAfter} · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe chunks] '+m));
  if(!nBad) console.log('[scaleprobe chunks] the 16-bit frozen buffer plays as the Float32 render to below −90 dB re its peak — through chunk joins, the loop seam and a seek, exact to the sample; a shifted chunk, a dropped chunk and storage without the scale factor all fail');
  return { cases, total:nBad, differences:bad };
}
/* ═══ ⛳ AF2: ПОДМЕНА СОБЫТИЙ БУФЕРОМ НЕСЛЫШИМА — P.checkSwap ═══
   Тело — render.swapCheck (материал, съём с меткой времени, мера, допуски и контроли — в его шапке): подмена на стоящем транспорте, в
   паузе, перекрёстом на линии такта у тянущегося пада и на шве скобы; каждая — без зазора, щелчка и скачка уровня против того же прогона
   одними событиями. Контроли: прежний вход A2 (голоса своим отпусканием) обязан провалить ОСТАТОК над буфером, жёсткая склейка съёма событий
   с самим собой в миг подмены — щелчок (AUTO-PROBE: прежний живой рубильник щёлкал лишь при несовпадении фаз и однажды «не провалился»).
   Ничего не звучит в колонках (мастер снят мимо них). Транспорт должен стоять, соло — снято, R.autoFreeze — выключен. ≈ 25–30 с: в P.all. */
export async function checkSwap(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  let R=null; try{ R=await import('../render.js'); }catch(e){ miss('render.js did not load: '+(e&&e.message)); return { cases, total:nBad, differences:bad }; }
  cases++; const r=await R.swapCheck();
  if(!r.ok){ miss('swap: '+r.why); console.warn('[scaleprobe swap] '+r.why); return { cases, total:nBad, differences:bad }; }
  cases+=r.cases.length;
  for(const c of r.cases){ const n=c.name;
    if(n==='stopped'){ meas('stopped: onset frozen vs events', c.onsetMs, 10, 'max', ' ms'); meas('stopped: control onset shift seen', c.onsetCtrlMs-15, 2, 'abs', ' ms'); meas('stopped: level', c.level, 1, 'abs', ' dB'); meas('stopped: click', c.click, 3, 'max', '×'); }
    else if(/^held pad/.test(n)){ meas('pad: level jump', c.jump, 1, 'abs', ' dB'); meas('pad: gap', c.gap, -6, 'min', ' dB'); meas('pad: click', c.click, 3, 'max', '×'); meas('pad: leftover over the buffer', c.leftoverDb, -6, 'max', ' dB'); }
    else if(n==='control: old') meas('control old swap: leftover', c.leftoverDb, -6, 'min', ' dB');
    else if(/^control: hard splice/.test(n)) meas('control hard splice: click', c.click, 3, 'min', '×');
    else if(n==='rest'){ meas('rest: leftover over the buffer', c.leftoverDb, -6, 'max', ' dB'); meas('rest: click', c.click, 3, 'max', '×'); meas('rest: level jump (information)', c.jump, null, null, ' dB'); }
    else if(n==='loop seam'){ meas('seam: level jump', c.jump, 1, 'abs', ' dB'); meas('seam: gap', c.gap, -6, 'min', ' dB'); meas('seam: click', c.click, 3, 'max', '×'); } }
  for(const m of r.fails) miss(m);
  console.table(r.cases);
  console.log(`[scaleprobe swap] ${r.cases.length} swaps measured · ${r.fails.length} problem(s) · ${r.seconds} s`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe swap] '+m));
  if(!nBad) console.log('[scaleprobe swap] the frozen buffer takes over with no gap, no click and no level jump — stopped, in a rest, crossfaded on a held pad and at the loop seam; the old double release and a hard splice both fail, so the measures can see them');
  return { cases, total:nBad, differences:bad };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:380, name:'LR1 live and frozen reverb agree', run:()=>checkRevAgree(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true, realtime:true });
row({ at:390, name:'AF2 freeze swap inaudible', run:()=>checkSwap(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true, realtime:true });
row({ at:400, name:'AF6b 16-bit frozen playback', run:()=>checkChunks(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true, realtime:true });
row({ at:410, name:'render repeatability', run:()=>checkRepeat(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:420, name:'renders serialized', run:()=>checkQueue(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:430, name:'AF1 freeze queue', run:()=>checkFreezeQueue(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:440, name:'AF3 auto-freeze watcher', run:()=>checkAutoFreeze(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:450, name:'AF5 track and live isolated', run:()=>checkLiveIsolation(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
