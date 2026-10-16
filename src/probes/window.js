/* PROBE1: Arrangement-window and mixer probes: every track reachable, AR1, MX1, MX2, AR2. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { masterLevel, ownerGain, setMasterLevel, masterMeter, ownerPan, AC as LIVE_AC, timbresOf } from '../audio.js';
import { INSTR_COL, LANE_NOROLE_COL } from '../config.js';
import { loopViewProbe, loopHit, loopScroll, arrGeom, rollGeom, laneTitle, laneCol, laneDefName, stripProbe } from '../draw.js';
import { afBegin, afTick, AF_DELAY, qRunning, afEnd } from '../frzqueue.js';
import { L, t, withLang } from '../i18n.js';
import { KEEP_MAX, PRINT_MAX } from '../probedata.js';
import { events, editIsOpen, recording, laneLevelOf, freezeState, freezeTicket, setLaneLevel, frzBusGain, laneAudible, lanePanOf, setLanePan, songSegs, songNotes, laneHasChain, loop, songBeats, unfreezeLayer, editLayer, armedLayer, laneOrder, laneRoleOf, laneTimbreOf, laneShowKeep, laneNameOf, setLaneName, moveLane, seedTake, laneDelTap, laneSoloOn, laneMuted, editOpen, editClose, toggleLaneMute, toggleLaneSolo, evHz } from '../recorder.js';
import { rollOpen, arrOpen, laneRow0, rollBeat0, rollSpan, setLaneRow0, tonic, aRef, setARef, setTonic } from '../state.js';
import { arrApi } from '../ui.js';
import { winKeep, QUICK, PROBE_SHORT, meas, waitMs, frame, winRestore } from './kit.js';
import { row } from './rows.js';
/* ═══ MX1: УРОВЕНЬ ДОРОЖКИ И МАСТЕР — P.checkMixer ═══
   (1) СТУПЕНЬ В ГОЛОСЕ МАСШТАБИРУЕТ ЗВУК ДОРОЖКИ: офлайн-рендер дорожки (render.renderTrack — та же таблица ENG на копии движка) с
       множителем g (o.trackGain — тем же путём, что живой голос: ступень tg по ключу владельца, множитель удара, дрона) против g = 1 —
       отношение RMS = g (допуск 2 %: при реверберации в цепи последние биты расходятся в разный хвост той же энергии — правило слагаемых,
       Known limits; поэтому мера — энергия, а не сэмплы). Для высотной дорожки и, если есть, ударной.
   (2) ЗАМОРОЖЕННАЯ: уровень — гейн её шины (frzGain), то есть буфер × g — ровно то, что дала (1) событиями; движение уровня оставляет её
       СВЕЖЕЙ, подпись заморозки (freezeTicket) не меняется, на шину поставлена цель g. ⚠️ Читается ЦЕЛЬ (recorder.frzBusGain), не
       bus.gain.value: при стоящем транспорте у шины нет источников, узел не обрабатывается и геттер держит старую 1.
   (3) ЖИВОЙ ДВИЖОК: множитель по ключу владельца переигровки (audio.ownerGain) — уровень дорожки; живые ключи — 1.
   (4) МАСТЕР: уровень мастера ставит гейн мастера 0.8·v² (читается с самого узла); измеритель отдаёт пик и подавление лимитера.
   (5) ЛИЦО МИКШЕРА: тело строки ловится как фейдер ЕЁ дорожки, полоса мастера — как фейдер мастера.
   Уровни, мастер, лицо и окно возвращает как были. Асинхронная: await P.checkMixer(). */
export async function checkMixer(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keepLvl=new Map(L.map(ly=>[ly,laneLevelOf(ly)])), keepM=masterLevel(), KW=winKeep();
  const rms=b=>{ let s=0,n=0; for(let c=0;c<b.numberOfChannels;c++){ const x=b.getChannelData(c); for(let i=0;i<x.length;i++){ s+=x[i]*x[i]; n++; } } return n?Math.sqrt(s/n):0; };
  const nOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);   // конец материала дорожки: рендер короче — проба быстрее
  const pitched=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&/^(leadOn|chOn|bassOn)$/.test(e.fn))).sort((a,b)=>nOf(a)-nOf(b));
  const drums=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&e.fn==='drum')).sort((a,b)=>nOf(a)-nOf(b));
  try{
    // ---- (1) ступень в голосе: рендер с множителем ----
    const R=await import('../render.js'), g=0.25;
    for(const ly of (QUICK?[pitched[0]]:[pitched[0], drums[0]]).filter(x=>x!=null)){ cases++;
      try{ const a=await R.renderTrack(ly,{trackGain:1, short:PROBE_SHORT, quiet:true}), b=await R.renderTrack(ly,{trackGain:g, short:PROBE_SHORT, quiet:true});
        const ra=rms(a.buf), rb=rms(b.buf), q=ra>0 ? rb/ra : NaN;
        if(!(ra>1e-6)) miss(`L${ly+1}: the unity render is silent`);
        else if(!(Math.abs(q/g-1)<=0.02)) miss(`L${ly+1}: at track gain ${g} the render's RMS ratio is ${q.toFixed(4)} (expected ${g})`);
        else notes.push(`L${ly+1}: RMS ratio ${q.toFixed(4)} at gain ${g}`);
        meas(`L${ly+1} RMS ratio / gain − 1`, q/g-1, 0.02, 'abs'); }
      catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); } }
    if(!pitched.length) miss('no unfrozen pitched track to render');
    // ---- (2) замороженная: уровень — гейн шины, буфер свежий ----
    const fz=L.find(ly=>freezeState(ly)==='fresh');
    if(fz!=null){ cases++;
      const sig0=freezeTicket(fz).sig;
      setLaneLevel(fz,0.5); await waitMs(150);
      const st=freezeState(fz), sig1=freezeTicket(fz).sig, bg=frzBusGain(fz);
      if(st!=='fresh') miss(`L${fz+1}: moving its level made the freeze ${st}`);
      if(sig1!==sig0) miss(`L${fz+1}: moving its level changed the freeze signature`);
      if(laneAudible(fz) && !(bg!=null && Math.abs(bg-0.25)<1e-12)) miss(`L${fz+1}: the gain scheduled on its frozen bus is ${bg}, expected 0.25 (level 0.5 → v² = 0.25)`);
      setLaneLevel(fz,keepLvl.get(fz)); await waitMs(100);
    } else notes.push('no frozen track in this song — the frozen-bus part is not checked (P.seed freezes the raga bass)');
    // ---- (3) живой движок: множитель по ключу владельца ----
    { cases++; const ly=L[0];
      setLaneLevel(ly,0.5);
      const keys=['leadloop:'+ly+':0','loop:'+ly,'loop:'+ly+':2','bassloop:'+ly,'hit:'+ly,'drone:'+ly];
      for(const k of keys){ const got=ownerGain(k); if(Math.abs(got-0.25)>1e-12) miss(`the live engine gives owner ${k} the gain ${got}, expected 0.25`); }
      for(const k of ['lead:L','latch','bass','bass:L:1',null]){ const got=ownerGain(k); if(got!==1) miss(`the live key ${k} gets the gain ${got}, expected 1`); }
      const other=L.find(o=>o!==ly); if(other!=null){ const got=ownerGain('loop:'+other); if(Math.abs(got-volAmpOf(laneLevelOf(other)))>1e-12) miss(`another track's owner gets ${got}`); }
      setLaneLevel(ly,keepLvl.get(ly)); }
    // ---- (4) мастер ----
    { cases++;
      setMasterLevel(0.5); await waitMs(250);
      let m=masterMeter();
      if(!m || Math.abs(m.gain-0.8*0.25)>0.004) miss(`master level 0.5 → master gain ${m&&m.gain}, expected 0.2 (0.8·0.5²)`);
      if(m && !(m.reduction<=0)) miss(`the limiter reduction reads ${m.reduction}, expected ≤ 0`);
      setMasterLevel(1); await waitMs(250); m=masterMeter();
      if(!m || Math.abs(m.gain-0.8)>0.004) miss(`master level 1 → master gain ${m&&m.gain}, expected 0.8 (as before MX1)`); }
    // ---- (5) лицо микшера: попадание ----
    { cases++;
      arrApi.open(); arrApi.face('mix'); await frame(); await frame();
      const V=loopViewProbe();
      if(!V||!V.mix) miss('the mixer face is not drawn');
      else{ for(const ly of V.rows){ const y=V.gy0+V.rows.indexOf(ly)*V.rowH+V.rowH/2, h=loopHit(V.x0+V.bw/2,y);
          if(!h||h.what!=='level'||h.layer!==ly) miss(`L${ly+1}: its row body is not its level fader (${h&&h.what})`); }
        const hm=V.ms && loopHit(V.x0+V.bw/2,(V.ms.y0+V.ms.y1)/2); if(!hm||hm.what!=='mlevel') miss('the master strip is not the master fader');
        if(V.ms && V.ms.y1>innerHeight) miss('the master strip lies below the bottom of the screen'); }
    }
  } finally {
    for(const [ly,v] of keepLvl) if(laneLevelOf(ly)!==v) setLaneLevel(ly,v);
    if(masterLevel()!==keepM) setMasterLevel(keepM);
    winRestore(KW);
  }
  console.log(`[scaleprobe mixer] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe mixer] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe mixer] '+m));
  if(!nBad) console.log('[scaleprobe mixer] the voice stage scales a track proportionally, a frozen track takes its level on its bus and stays fresh, live owners get their track’s gain, the master level sets the master gain, and the mixer face hits its faders');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ MX2: ПАНОРАМА ДОРОЖКИ — P.checkPan ═══
   (1) ВПЛАВЛЕНИЕ НАСТОЯЩИМ ПУТЁМ ЗАМОРОЗКИ: панорама ставится recorder.setLanePan (без подмены o.trackPan), затем render.renderTrack — тот
       же рендер, что даёт ❄. Мера — доля энергии левого канала sL = EL/(EL+ER).
       ⛳ БАЛАНС — НА СУХОМ РЕНДЕРЕ (o.dry: эффекты шины закрыты; после MX2 — мокрый центр соло читался то 0.493, то 0.443). Влажная доля —
       не панорама: отводы реверба на L и R — РАЗНЫЕ знаковые смеси линий сети, они не отражаются панорамой (хард-лево и хард-право — не
       зеркала), а хвост сети от рендера к рендеру иной в микроструктуре (правило слагаемых). Сухой сигнал — сама ступень панорамы:
       хард-лево R = 0 ТОЧНО, центр L = R ТОЧНО. Пороги сухого: стороны ≥ PAN_DRY_SIDE (0.99), центр 0.5 ± PAN_DRY_MID (0.01).
       ⛳ ОДИН МОКРЫЙ РЕНДЕР (хард-лево) — что эхо и хвосты не переворачивают картину: слева ≥ PAN_SIDE (0.8).
       ⛳ ПОЧЕМУ 0.8, А НЕ «ПОЧТИ 1»: сухой сигнал хард-лево справа — ТОЧНО ноль (закон равной мощности, R = 0), но реверб роли сводит вход
       в моно и кладёт влажную долю в оба канала поровну (делей и тремоло шины держат стерео — эхо остаётся слева). При L = √2·d и влажной
       энергии W на канал (у хард-лево вход реверба вдвое тише по энергии: 0.5·(L+R)) sL = (2D+W)/(2D+2W) ≥ 0.8 ⇔ W ≤ ⅔·D — порог держит
       любую дорожку, где влажная доля в центре не больше ~4/3 сухой на канал; мокрее — дорожка «утонула», и такой реверб надо назвать, а
       не прятать. Центр: сухое в обоих каналах одно и то же, влажное — разнознаковые отводы сети, энергии почти равны — 0.05 (≈ ±0.9 дБ).
       ⛳ КОНТРОЛЬ (мера обязана уметь провалиться): тест «хард-лево» прогоняется и на ЦЕНТРЕ, и на ХАРД-ПРАВО — оба обязаны его НЕ
       пройти, иначе мера не отличила бы лево от «не лево»; и зеркально тест «хард-право» — на хард-лево.
       Дорожки: самая короткая незамороженная высотная (ступень в голосе пула) и, если есть, ударная (ступень в ударе).
   (2) ЗАМОРОЖЕННАЯ: смена панорамы меняет подпись (freezeTicket) и старит буфер ('stale'); возврат панорамы — снова 'fresh' и та же подпись.
   (3) ЖИВОЙ ДВИЖОК: ключи владельцев дорожки получают её панораму (audio.ownerPan); живые ключи (руки) — центр.
   (4) ЛИЦО МИКШЕРА: правый блок тела строки ловится как панорама ЕЁ дорожки, левый — как уровень.
   Панорамы, окно и лицо возвращает как были. Асинхронная: await P.checkPan(). */
export async function checkPan(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); }, notes=[];
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const PAN_SIDE=0.8, PAN_DRY_SIDE=0.99, PAN_DRY_MID=0.01;
  const keepPan=new Map(L.map(ly=>[ly,lanePanOf(ly)])), KW=winKeep();
  const shareL=b=>{ if(b.numberOfChannels<2) return NaN; let l=0,r=0; const x=b.getChannelData(0), y=b.getChannelData(1);
    for(let i=0;i<x.length;i++){ l+=x[i]*x[i]; r+=y[i]*y[i]; } return (l+r)>0 ? l/(l+r) : NaN; };
  const f3=x=>Number.isFinite(x)?x.toFixed(3):String(x);
  const endOf=ly=>events.reduce((m,e)=>e.layer===ly&&e.t>m?e.t:m,0);   // конец материала дорожки: рендер короче — проба быстрее
  const pitched=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&/^(leadOn|chOn|bassOn)$/.test(e.fn))).sort((a,b)=>endOf(a)-endOf(b));
  const drums=L.filter(ly=>freezeState(ly)==='none' && events.some(e=>e.layer===ly&&e.fn==='drum')).sort((a,b)=>endOf(a)-endOf(b));
  try{
    // ---- (1) вплавление: рендер дорожки при панораме −1 / 0 / +1, поставленной самой дорожке ----
    const R=await import('../render.js');
    if(!pitched.length) miss('no unfrozen pitched track to render');
    for(const ly of (QUICK?[pitched[0]]:[pitched[0], drums[0]]).filter(x=>x!=null)){ cases++;
      try{
        const sh={};
        for(const [k,p] of [['left',-1],['centre',0],['right',1]]){ setLanePan(ly,p); sh[k]=shareL((await R.renderTrack(ly,{dry:true,quiet:true,short:PROBE_SHORT})).buf); }
        setLanePan(ly,-1); const wetL=shareL((await R.renderTrack(ly,{quiet:true,short:PROBE_SHORT})).buf);
        const tag=`L${ly+1}: left share, dry — hard left ${f3(sh.left)}, centre ${f3(sh.centre)}, hard right ${f3(sh.right)}; wet hard left ${f3(wetL)}`;
        if(!Number.isFinite(sh.left+sh.centre+sh.right+wetL)) miss(tag+' — a render is silent or mono');
        else{
          if(!(sh.left>=PAN_DRY_SIDE)) miss(`${tag} — dry hard left keeps less than ${PAN_DRY_SIDE} of its energy on the left`);
          if(!(1-sh.right>=PAN_DRY_SIDE)) miss(`${tag} — dry hard right keeps less than ${PAN_DRY_SIDE} of its energy on the right`);
          if(!(Math.abs(sh.centre-0.5)<=PAN_DRY_MID)) miss(`${tag} — dry centre is not balanced (±${PAN_DRY_MID})`);
          if(!(wetL>=PAN_SIDE)) miss(`${tag} — with effects, hard left keeps less than ${PAN_SIDE} on the left (echoes or tails flip the picture)`);
          if(sh.centre>=PAN_DRY_SIDE || sh.right>=PAN_DRY_SIDE) miss(`${tag} — CONTROL: the hard-left test passes on a render that is not panned left; the measure cannot catch a wrong pan`);
          if(1-sh.left>=PAN_DRY_SIDE || 1-sh.centre>=PAN_DRY_SIDE) miss(`${tag} — CONTROL: the hard-right test passes on a render that is not panned right`);
          meas(`L${ly+1} dry hard-left share`, sh.left, PAN_DRY_SIDE, 'min'); meas(`L${ly+1} dry centre share − 0.5`, sh.centre-0.5, PAN_DRY_MID, 'abs'); meas(`L${ly+1} wet hard-left share`, wetL, PAN_SIDE, 'min');
          notes.push(tag+` (controls: the hard-left test on centre/right reads ${f3(sh.centre)}/${f3(sh.right)} < ${PAN_DRY_SIDE}, the hard-right test on left/centre reads ${f3(1-sh.left)}/${f3(1-sh.centre)})`);
        }
      }catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); }
      finally{ setLanePan(ly,keepPan.get(ly)); }
    }
    // ---- (2) замороженная: панорама в подписи ----
    const fz=L.find(ly=>freezeState(ly)==='fresh');
    if(fz!=null){ cases++;
      const sig0=freezeTicket(fz).sig, p0=keepPan.get(fz), p1= p0===0.5 ? -0.5 : 0.5;
      setLanePan(fz,p1);
      const st1=freezeState(fz), sig1=freezeTicket(fz).sig;
      if(sig1===sig0) miss(`L${fz+1}: a pan change did not change the freeze signature`);
      if(st1!=='stale') miss(`L${fz+1}: after a pan change the freeze is ${st1}, expected stale`);
      setLanePan(fz,p0);
      const st2=freezeState(fz), sig2=freezeTicket(fz).sig;
      if(st2!=='fresh'||sig2!==sig0) miss(`L${fz+1}: with its pan restored the freeze is ${st2}${sig2!==sig0?' and the signature differs':''}, expected fresh and the same signature`);
      notes.push(`L${fz+1}: pan ${p1} → ${st1}; pan back → ${st2}`);
    } else notes.push('no frozen track in this song — the frozen part is not checked (P.seed freezes the raga bass)');
    // ---- (3) живой движок: панорама по ключу владельца ----
    { cases++; const ly=L[0];
      setLanePan(ly,0.3);
      for(const k of ['leadloop:'+ly+':0','loop:'+ly,'loop:'+ly+':2','bassloop:'+ly,'hit:'+ly,'drone:'+ly]){ const got=ownerPan(k); if(Math.abs(got-0.3)>1e-12) miss(`the live engine gives owner ${k} the pan ${got}, expected 0.3`); }
      for(const k of ['lead:L','lead:M','latch','bass','bass:L:1',null]){ const got=ownerPan(k); if(got!==0) miss(`the live key ${k} gets the pan ${got}, expected 0 (live hands stay centred)`); }
      const other=L.find(o=>o!==ly); if(other!=null){ const got=ownerPan('loop:'+other); if(Math.abs(got-lanePanOf(other))>1e-12) miss(`another track's owner gets the pan ${got}`); }
      setLanePan(ly,keepPan.get(ly)); }
    // ---- (4) лицо микшера: попадание по панораме ----
    { cases++;
      arrApi.open(); arrApi.face('mix'); await frame(); await frame();
      const V=loopViewProbe();
      if(!V||!V.mix) miss('the mixer face is not drawn');
      else for(const ly of V.rows){ const y=V.gy0+V.rows.indexOf(ly)*V.rowH+V.rowH/2;
        const hp=loopHit(V.pfx0+V.pfw/2,y), hl=loopHit(V.fx0+V.fw/2,y);
        if(!hp||hp.what!=='pan'||hp.layer!==ly) miss(`L${ly+1}: the pan block is not its pan control (${hp&&hp.what})`);
        if(!hl||hl.what!=='level'||hl.layer!==ly) miss(`L${ly+1}: the level part is not its level fader (${hl&&hl.what})`); }
      if(V && V.mix && !(V.pfw>=40)) miss(`the pan control is only ${V.pfw}px wide`);
    }
  } finally {
    for(const [ly,p] of keepPan) if(lanePanOf(ly)!==p) setLanePan(ly,p);
    winRestore(KW);
  }
  console.log(`[scaleprobe pan] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  notes.forEach(m=>console.log('[scaleprobe pan] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe pan] '+m));
  if(!nBad) console.log('[scaleprobe pan] a panned track renders to its side through the freeze path (and the controls show the measure would catch a wrong pan), centre is balanced, a pan change stales a frozen track and restoring it makes it fresh again, live hands stay centred, and the mixer face hits its pan controls');
  return { cases, song:L.length, total:nBad, differences:bad };
}
const volAmpOf=v=>{ const x=v>0?(v<1?v:1):0; return x*x; };   // та же кривая, что config.volAmp (проба не тянет config ради одной строки)
/* ═══ AR1: ОКНО АРАНЖИРОВКИ — P.checkArrange ═══
   Окно открывается ТЕМ ЖЕ входом, что ✎ (ui.arrApi — функции кнопок), и для КАЖДОЙ дорожки, пролистав строки (laneRow0): строка нарисована
   в окне (снимок loopView с full) и целиком на экране; попадание по ней — «вооружить» у заголовка, «открыть» по телу, M / S в гнёздах —
   ЕЁ слой; число МИНИАТЮР строки = число её сегментов (высотная роль — songSegs) или ударов (ударные — songNotes); тап «открыть» (тот же
   вход, что тап) открывает в редакторе ИМЕННО её. Окно времени ОБЩЕЕ в обе стороны: задано в окне — тем же отрезком нарисован редактор
   (rollGeom), задано в редакторе — тем же отрезком нарисовано окно после возврата (arrGeom). Кадры ждёт сама: await P.checkArrange().
   Окно, прокрутку и отрезок времени возвращает как были. Нужен запущенный звук и непустая песня; во время записи — отказ.
   AF4: no ❄ control anywhere on a row; the freeze DOT read from the drawn snapshot (loopView.dots): with auto-freeze driven by a probe
   clock and a held fake render — the rendering row is filled (pulsing), a waiting row hollow, frozen rows and a row stale only by the
   tonic show nothing; CONTROL: the rendering row must not read as waiting (and the two must differ). The play strip draws no dots, and
   with nothing armed its mark column stays closed although a track is frozen and one is stale (no ❄, no stale mark). */
export async function checkArrange(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keep={ row0:laneRow0, b0:rollBeat0, span:rollSpan }, SV=songSegs(), NV=songNotes();
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  try{
    arrApi.open(); await frame(); await frame();
    if(!arrOpen){ miss('✎ (arrApi.open) did not open the arrangement window'); return { cases, song:L.length, total:nBad, differences:bad }; }
    for(const [i,ly] of L.entries()){ cases++;
      let V=loopViewProbe();
      if(!V||!V.full){ miss('the arrangement is not drawn (the snapshot is not the full-screen one)'); break; }
      if(!V.rows.includes(ly)){ const S=loopScroll();
        if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all?V.all.indexOf(ly):i))); await frame(); await frame(); V=loopViewProbe(); } }
      if(!V||!V.rows.includes(ly)){ miss(`L${ly+1}: not among the arrangement's rows even after scrolling`); continue; }
      const ri=V.rows.indexOf(ly), y=V.gy0+ri*V.rowH+V.rowH/2;
      if(V.gy0+(ri+1)*V.rowH>innerHeight) miss(`L${ly+1}: its row lies below the bottom of the screen`);
      const at=(x,want)=>{ const h=loopHit(x,y); if(!h||h.layer!==ly||h.what!==want) miss(`L${ly+1}: a tap at x ${Math.round(x)} gives ${h?h.what+' L'+(h.layer+1):'nothing'}, not ${want}`); };
      at(V.x0-8,'arm'); at(V.x0+V.bw/2,'open');   // AR2: левее ИМЕНИ теперь ручка перестановки — вооружает тап по имени (у кромки дорожки)
      const seen=new Set(); for(let x=V.tx0; x<V.tx0+160; x++){ const h=loopHit(x,y); if(h&&h.layer===ly) seen.add(h.what); }
      for(const w of ['mute','solo']) if(!seen.has(w)) miss(`L${ly+1}: its ${w} button is not hittable`);
      for(let x=V.hx0; x<V.tx0+160; x+=2){ const h=loopHit(x,y); if(h&&h.what==='frz'){ miss(`L${ly+1}: a ❄ control is still hittable at x ${x}`); break; } }   // AF4
      cases++; const M=V.mini&&V.mini.get(ly);
      const nSeg=SV.segs.filter(s=>s.layer===ly).length, nHit=NV.notes.filter(n=>n.layer===ly&&n.role==='dr').length;
      if(!M) miss(`L${ly+1}: no miniature drawn`);
      else if(M.items.length!==(nSeg||nHit)) miss(`L${ly+1}: ${M.items.length} miniatures, ${nSeg?nSeg+' segments':nHit+' hits'}`);
    }
    // ---- AF4: the freeze dot (hollow = waiting, pulsing = rendering, nothing when frozen or live by choice) ----
    { setLaneRow0(0); await frame(); await frame();
      const V0=loopViewProbe(), vis=V0&&V0.rows||[];
      const cand=vis.filter(ly=>freezeState(ly)==='none' && laneHasChain(ly));
      if(cand.length<2) miss('freeze dot: fewer than two unfrozen tracks visible in the window — run await P.seed({replace:true})');
      else { let T=0, open=null; const gateP=new Promise(r=>{ open=r; }), mine=[];
        const fake=async()=>{ await gateP; return { buf:LIVE_AC.createBuffer(2,128,LIVE_AC.sampleRate), startSec:0.5, endSec:0.5, tailSec:0, pinned:{ tonic, aRef, bpm:loop.bpm }, ms:{ layoutMs:1 } }; };
        const keepT=tonic, keepA0=aRef;
        if(!afBegin({ now:()=>T, gates:{ recording:()=>false, clip:()=>false, pinch:()=>false }, ctx:()=>({ p:0, end:songBeats(), rgn:null }),
                      opt:{ renderFn:fake }, layers:cand.slice(0,2) })) miss('freeze dot: auto-freeze is busy — run again');
        else try{
          T+=50; afTick(); T+=AF_DELAY.change+50; const s0=afTick();
          const R0= s0.startsWith('start:L') ? +s0.slice(7)-1 : null, W0=cand.slice(0,2).find(x=>x!==R0);
          if(R0==null) miss(`freeze dot: no render started (${s0})`);
          else { mine.push(R0,W0); cases+=2;
            await frame(); await frame();
            const V=loopViewProbe(), dR=V&&V.dots&&V.dots.get(R0), dW=V&&V.dots&&V.dots.get(W0);
            if(!dR||dR.st!=='run'||!dR.filled) miss(`freeze dot: the rendering row L${R0+1} reads ${dR?dR.st+(dR.filled?' (filled)':' (hollow)'):'nothing'}, expected a pulsing (filled) dot`);
            if(!dW||dW.st!=='wait'||dW.filled) miss(`freeze dot: the waiting row L${W0+1} reads ${dW?dW.st+(dW.filled?' (filled)':' (hollow)'):'nothing'}, expected a hollow dot`);
            if(dR&&(dR.st==='wait'||(dW&&dR.st===dW.st&&dR.filled===dW.filled))) miss('freeze dot CONTROL: the rendering row reads as waiting — the two states are not told apart');
            for(const ly of vis) if(ly!==R0&&ly!==W0){ const d=V.dots.get(ly); if(d&&d.st){ miss(`freeze dot: L${ly+1} (not in the queue) shows a ${d.st} dot`); break; } }
            open(); await qRunning(); T+=50; const s1=afTick(); if(s1.startsWith('start:')) await qRunning();
            cases++; await frame(); await frame();
            const V2=loopViewProbe();
            for(const ly of [R0,W0]){ const d=V2.dots.get(ly); if(freezeState(ly)!=='fresh') miss(`freeze dot: L${ly+1} is ${freezeState(ly)} after its render`); else if(d&&d.st) miss(`freeze dot: the frozen row L${ly+1} still shows a ${d.st} dot`); }
            cases++; const keepA=aRef; setARef(keepA+2); T+=50; afTick(); await frame(); await frame();   // TF4: stale by A4 waits (hollow), then re-renders
            const V3=loopViewProbe(), d3=V3.dots.get(R0);
            if(freezeState(R0)!=='stale') miss(`freeze dot: after an A4 change L${R0+1} should be stale, it is ${freezeState(R0)}`);
            if(!d3||d3.st!=='wait'||d3.filled) miss(`freeze dot: L${R0+1}, stale by A4, reads ${d3&&d3.st?d3.st+(d3.filled?' (filled)':' (hollow)'):'nothing'} — want a hollow (waiting) dot (TF4)`);
            T+=AF_DELAY.retune+100; for(let i=0;i<4;i++){ T+=50; const s=afTick(); if(s.startsWith('start:')) await qRunning(); }
            cases++; await frame(); await frame(); const V4=loopViewProbe();
            for(const ly of [R0,W0]){ const d=V4.dots.get(ly); if(freezeState(ly)!=='fresh') miss(`freeze dot: after the A4 re-render L${ly+1} is ${freezeState(ly)}, want fresh (TF4)`); else if(d&&d.st) miss(`freeze dot: the re-frozen row L${ly+1} still shows a ${d.st} dot`); }
            setARef(keepA); }
        } finally { open(); try{ await qRunning(); }catch(e){} afEnd(); if(tonic!==keepT) setTonic(keepT); if(aRef!==keepA0) setARef(keepA0); for(const ly of mine) if(ly!=null&&freezeState(ly)!=='none') unfreezeLayer(ly); }
      } }
    // ---- открыть каждую дорожку из окна; окно времени — общее в обе стороны ----
    const W1={ b0:4, span:12 };
    arrApi.setWin(W1.b0, W1.span); await frame(); await frame();
    const w1=arrGeom(); cases++;
    if(!w1 || !near(w1.beat0,rollBeat0) || !near(w1.span,rollSpan)) miss(`the arrangement does not draw the shared window (${w1&&w1.beat0}/${w1&&w1.span} vs ${rollBeat0}/${rollSpan})`);
    for(const ly of L){ cases++;
      const b0=rollBeat0, sp=rollSpan;
      arrApi.openTrack(ly); await frame(); await frame();
      if(!rollOpen || editLayer()!==ly){ miss(`L${ly+1}: tapping its row does not open it in the editor (open: ${rollOpen}, layer L${editLayer()==null?'—':editLayer()+1})`); if(rollOpen) arrApi.closeTrack(); continue; }
      const g=rollGeom();
      if(!g || !near(g.beat0,b0) || !near(g.span,sp)) miss(`L${ly+1}: the editor opens on ${g&&g.beat0}/${g&&g.span}, not the arrangement's ${b0}/${sp}`);
      arrApi.closeTrack(); await frame(); await frame();
      if(!arrOpen || rollOpen) miss(`L${ly+1}: closing the editor does not return to the arrangement`);
    }
    cases++;   // редактор → окно: отрезок, заданный в редакторе, окно рисует после возврата
    arrApi.openTrack(L[0]); await frame();
    arrApi.setWin(8, 6); await frame(); await frame();
    const g2=rollGeom(), want={ b0:rollBeat0, span:rollSpan };
    arrApi.closeTrack(); await frame(); await frame();
    const w2=arrGeom();
    if(!g2 || !w2 || !near(w2.beat0,want.b0) || !near(w2.span,want.span) || !near(g2.span,want.span)) miss(`zoom set in the editor (${want.b0}/${want.span}) is not the arrangement's after returning (${w2&&w2.beat0}/${w2&&w2.span})`);
    // ---- AF4: the play strip draws no freeze dot and no ❄ / stale mark ----
    { cases++; arrApi.close(); const fz=L.find(ly=>freezeState(ly)==='fresh'), keepT=tonic;
      if(fz==null) miss('strip: no frozen track to look at (the seed freezes one)');
      else { const keepA=aRef; setARef(keepA+2); await frame(); await frame();   // TF2: a stale track by A4 (the tonic no longer stales)
        const V=loopViewProbe();
        if(!V||V.full) miss('strip: the play strip is not drawn after closing the window');
        else { if(V.dots) miss('strip: the play strip carries freeze dots');
          if(armedLayer()==null && V.markW) miss(`strip: nothing is armed, yet the mark column is open (${V.markW} px) — a freeze or stale mark is drawn`); }
        setARef(keepA); } }
  } finally {
    if(rollOpen) arrApi.closeTrack();
    if(arrOpen) arrApi.close();
    setLaneRow0(keep.row0); arrApi.setWin(keep.b0, keep.span);
  }
  console.log(`[scaleprobe arrange] tracks ${L.length} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe arrange] '+m));
  if(!nBad) console.log('[scaleprobe arrange] every track has its row in the arrangement — drawn, on screen, hittable (arm, open, M, S; no ❄) — with one miniature per segment or hit; a row opens exactly its track; the time window is shared both ways; the freeze dot is hollow while waiting, pulsing while rendering, absent when frozen or live by choice, and never on the play strip');
  return { cases, song:L.length, total:nBad, differences:bad };
}
/* ═══ AR2: ИМЕНА, ЦВЕТА И ПОРЯДОК ДОРОЖЕК — P.checkTrackLook ═══
   (1) ИМЯ ПО УМОЛЧАНИЮ — «роль · тембр» на ОБОИХ языках, собранное здесь НЕЗАВИСИМО (recorder.laneRoleOf/laneTimbreOf — проход по событиям,
       audio.timbresOf, словарь) против draw.laneDefName (мемо recorder.laneLook и кэш имён); laneTitle = данное имя, иначе оно.
   (2) ПАЛИТРА — данные (config.INSTR_COL): у четырёх ролей РАЗНАЯ светлота (соседи по яркости ≥ 1.3× по контрасту — различимы и
       дальтонику) и каждая ≥ 4.5:1 к фону строки окна (имя — текст 12 px); цвет дорожки — цвет её роли (без роли — серый).
   (3) ВЕЗДЕ ОДНО — для КАЖДОЙ дорожки, с прокруткой строк: полоса игры, окно аранжировки, лицо микшера (снимок loopView.look — имя и цвет,
       которыми строка нарисована) и редактор (снимок rollView.col — цвет нот; чип дорожки — «L# · имя», --role — цвет).
   (4) ПЕРЕИМЕНОВАНИЕ — имя видно во всех четырёх местах, переживает прокрутку строк и смену лица; пустое — снова по умолчанию; длинное — 40 знаков.
   (5) ПЕРЕСТАНОВКА — последняя дорожка встаёт первой (recorder.moveLane): порядок ОДИН в окне, микшере и на полосе (снимок all = laneOrder),
       прочие сохраняют свой порядок; тап по телу каждой видимой строки ловится как ЕЁ дорожка («открыть» в окне, фейдер в микшере), ручка —
       'move' с местом строки; открыв первую строку, редактор стоит на ней, а чип дорожки ведёт к СЛЕДУЮЩЕЙ в этом порядке.
   (6) ПРАВИЛО #27 — временная дорожка с именем и ПЕРВЫМ местом снята (✕ дважды, как на полосе); следующая, родившаяся на ТОМ ЖЕ номере, —
       без имени и В КОНЦЕ. Песня после — та же (события, порядок). Нужен стоящий транспорт (иначе часть 6 пропускается с расхождением).
   Имена и места (ровно как были — recorder.laneShowKeep), окно, лицо, отрезок времени и прокрутку возвращает. Кадры ждёт сама:
   await P.checkTrackLook(). */
export async function checkTrackLook(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const LS=laneOrder();
  const done=()=>({ cases, song:LS.length, total:nBad, differences:bad });
  if(LS.length<2){ miss('fewer than two tracks — run await P.seed({replace:true})'); return done(); }
  if(editIsOpen()||rollOpen||arrOpen){ miss('the track editor or the arrangement is open — close it first'); return done(); }
  if(recording){ miss('recording — stop it first'); return done(); }
  const colOf=ly=>{ const r=laneRoleOf(ly); return r ? INSTR_COL[r] : LANE_NOROLE_COL; };
  const defOf=ly=>{ const r=laneRoleOf(ly);
    if(!r) return events.some(e=>e.layer===ly&&e.fn==='drone') ? t('track.drone') : t('arr.noRole');
    const e=timbresOf(r).find(z=>z.idx===laneTimbreOf(ly)); return t('track.role.'+r)+(e?' · '+L(e.name):''); };
  const lum=h=>{ const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
  const cr=(a,b)=>(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  // строка видна (прокрутить к ней по месту в ОБЩЕМ порядке) — снимок или null
  const showRow=async ly=>{ let V=loopViewProbe(); if(!V) return null;
    if(!V.rows.includes(ly)){ const S=loopScroll(); if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all.indexOf(ly)))); await frame(); await frame(); V=loopViewProbe(); } }
    return V&&V.rows.includes(ly) ? V : null; };
  const lookAt=async (where,ly,full)=>{ cases++;
    const V=await showRow(ly); if(!V){ miss(`${where}: L${ly+1} is not among the drawn rows even after scrolling`); return; }
    if(!!V.full!==full){ miss(`${where}: the drawn screen is ${V.full?'the arrangement':'the play strip'}`); return; }
    const k=V.look&&V.look.get(ly); if(!k){ miss(`${where}: L${ly+1}: the row's name and colour are not in the snapshot`); return; }
    if(k.name!==laneTitle(ly)) miss(`${where}: L${ly+1} reads «${k.name}», not «${laneTitle(ly)}»`);
    if(k.col!==colOf(ly)) miss(`${where}: L${ly+1} is drawn ${k.col}, its role's colour is ${colOf(ly)}`);
    const F=V.frame; if(F && k.lblX0!=null) for(const [w,a,b] of [['label',k.lblX0,k.lblX1],['name',k.nameX0,k.nameX1]])   // AR2-fix: нарисованные тексты — внутри рамки
      if(b>a && (a<F[0]-0.5||b>F[1]+0.5)) miss(`${where}: L${ly+1}'s ${w} is drawn at [${a.toFixed(1)}, ${b.toFixed(1)}], outside the frame [${F[0]}, ${F[1]}]`); };
  const editorAt=async ly=>{ cases++;
    arrApi.openTrack(ly); await frame(); await frame();
    if(!rollOpen||editLayer()!==ly){ miss(`editor: L${ly+1} does not open`); if(rollOpen) arrApi.closeTrack(); return; }
    const g=rollGeom(), chip=document.getElementById('rollTrack'), want=t('roll.track',{n:ly+1})+' · '+laneTitle(ly);
    if(!g || (g.col||LANE_NOROLE_COL)!==colOf(ly)) miss(`editor: L${ly+1}'s notes are drawn ${g&&g.col}, its role's colour is ${colOf(ly)}`);
    if(chip){ if(chip.textContent!==want) miss(`editor: the track chip reads «${chip.textContent}», not «${want}»`);
      if(chip.style.getPropertyValue('--role')!==laneCol(ly) || laneCol(ly)!==colOf(ly)) miss(`editor: the track chip's colour is ${chip.style.getPropertyValue('--role')||'none'}, not ${colOf(ly)}`); }
    arrApi.closeTrack(); await frame(); };
  const everywhere=async (lys,label)=>{   // полоса игры → окно → микшер → редактор (из окна)
    await frame(); await frame();
    for(const ly of lys) await lookAt(label+' · play strip',ly,false);
    arrApi.open(); await frame(); await frame();
    if(!arrOpen){ miss(label+': the arrangement does not open'); return; }
    for(const ly of lys) await lookAt(label+' · arrangement',ly,true);
    arrApi.face('mix'); await frame(); await frame();
    for(const ly of lys) await lookAt(label+' · mixer',ly,true);
    arrApi.face('arr'); await frame();
    for(const ly of lys) await editorAt(ly);
    arrApi.close(); await frame(); };
  const restoreShow=laneShowKeep(), wk=winKeep();
  try{
    // ---- 1) имя по умолчанию, оба языка ----
    for(const lg of ['en','ru']) withLang(lg,()=>{ for(const ly of LS){ cases++;
      const want=defOf(ly), got=laneDefName(ly);
      if(got!==want) miss(`default name (${lg}) L${ly+1}: «${got}», not «${want}»`);
      if(laneTitle(ly)!==(laneNameOf(ly)||want)) miss(`name (${lg}) L${ly+1}: «${laneTitle(ly)}» is neither its own name nor the default`); } });
    // ---- 2) палитра ----
    { cases++; const roles=['ld','ch','bs','dr'], Y=roles.map(r=>lum(INSTR_COL[r])).sort((a,b)=>a-b), bg=lum('#141420');
      for(let i=1;i<Y.length;i++) if(cr(Y[i],Y[i-1])<1.3) miss(`palette: two role colours are too close in lightness (contrast ${cr(Y[i],Y[i-1]).toFixed(2)} < 1.3)`);
      for(const r of roles) if(cr(lum(INSTR_COL[r]),bg)<4.5) miss(`palette: ${r} ${INSTR_COL[r]} reads ${cr(lum(INSTR_COL[r]),bg).toFixed(2)}:1 on a row, below 4.5:1`);
      for(const ly of LS){ cases++; if(laneCol(ly)!==colOf(ly)) miss(`colour: L${ly+1} is ${laneCol(ly)}, its role's colour is ${colOf(ly)}`); } }
    // ---- 3) везде одно ----
    await everywhere(LS,'look');
    // ---- 4) переименование ----
    const A=LS[0], NAME='Probe · name ✓';
    cases++; setLaneName(A, NAME);
    if(laneTitle(A)!==NAME) miss(`rename: L${A+1} reads «${laneTitle(A)}» after the rename`);
    await everywhere([A],'renamed');
    arrApi.open(); await frame(); await frame();
    { const S=loopScroll(); if(S){ cases++; setLaneRow0(S.nAll-S.visN); await frame(); await frame(); setLaneRow0(0); await frame(); await frame(); await lookAt('renamed · after a scroll',A,true); } }
    arrApi.face('mix'); await frame(); await frame(); await lookAt('renamed · after a face switch',A,true);
    arrApi.face('arr'); arrApi.close(); await frame();
    cases++; setLaneName(A,'   ');
    if(laneNameOf(A)!==null || laneTitle(A)!==laneDefName(A)) miss(`rename: an empty name does not return to the default («${laneTitle(A)}»)`);
    cases++; setLaneName(A,'x'.repeat(60));
    if((laneNameOf(A)||'').length!==40) miss(`rename: a 60-character name keeps ${(laneNameOf(A)||'').length} characters, not 40`);
    setLaneName(A,null);
    // ---- 5) перестановка ----
    const Z=LS[LS.length-1]; cases++;
    moveLane(Z,0);
    const O=laneOrder();
    if(O[0]!==Z) miss(`reorder: L${Z+1} moved to the top, but the order starts with L${O[0]+1}`);
    if(JSON.stringify(O.slice(1))!==JSON.stringify(LS.filter(l=>l!==Z))) miss('reorder: the other tracks did not keep their order');
    await frame(); await frame();
    const sameAll=(where)=>{ cases++; const V=loopViewProbe(); if(!V||!V.all) { miss(`${where}: not drawn`); return null; }
      if(JSON.stringify(V.all)!==JSON.stringify(O)) miss(`${where}: rows are drawn in the order ${V.all.map(l=>'L'+(l+1)).join(' ')}, not ${O.map(l=>'L'+(l+1)).join(' ')}`); return V; };
    setLaneRow0(0); await frame(); await frame(); sameAll('reorder · play strip');
    arrApi.open(); await frame(); await frame();
    const hitRows=(where,want)=>{ const V=sameAll(where); if(!V) return;
      V.rows.forEach((ly,ri)=>{ cases++; const y=V.gy0+ri*V.rowH+V.rowH/2;
        if(ly!==O[V.row0+ri]) miss(`${where}: row ${ri+1} shows L${ly+1}, the order says L${O[V.row0+ri]+1}`);
        const h=loopHit(V.x0+(V.mix?6:V.bw/2),y); if(!h||h.layer!==ly||h.what!==want) miss(`${where}: a tap on row ${ri+1} gives ${h?h.what+' L'+(h.layer+1):'nothing'}, not ${want} L${ly+1}`);
        const g=loopHit(V.hx0+4,y); if(!g||g.what!=='move'||g.layer!==ly||g.row!==V.row0+ri) miss(`${where}: row ${ri+1}'s handle gives ${g?g.what+' L'+(g.layer+1)+' at '+g.row:'nothing'}, not move L${ly+1} at ${V.row0+ri}`); }); };
    setLaneRow0(0); await frame(); await frame();
    hitRows('reorder · arrangement','open');
    arrApi.face('mix'); await frame(); await frame();
    hitRows('reorder · mixer','level');
    arrApi.face('arr'); await frame();
    cases++; arrApi.openTrack(O[0]); await frame(); await frame();
    if(editLayer()!==Z) miss(`reorder: opening the first row opens L${editLayer()==null?'—':editLayer()+1}, not L${Z+1}`);
    { const chip=document.getElementById('rollTrack'); if(chip && !chip.disabled){ chip.click(); await frame();
        if(editLayer()!==O[1]) miss(`reorder: the editor's track chip goes from L${Z+1} to L${editLayer()==null?'—':editLayer()+1}, not to the next in the order (L${O[1]+1})`); } }
    arrApi.closeTrack(); await frame(); arrApi.close(); await frame();
    // ---- 6) правило #27: новая дорожка на номере удалённой ----
    if(!loop.on){ cases++;
      const nEv=events.length, O0=laneOrder();
      const tmp=()=>{ const T=Math.ceil(songBeats())+8;
        const r=seedTake([{fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:0,v:0},t:T,id:1}, {fn:'leadOff',a:{v:0},t:T+1,id:1}]);
        return r&&r.layers.length ? r.layers[0] : null; };
      const del=ly=>{ laneDelTap(ly); return laneDelTap(ly); };
      const T1=tmp();
      if(T1==null) miss('rule #27: the temporary track could not be recorded');
      else{
        setLaneName(T1,'Probe temp'); moveLane(T1,0);
        if(laneOrder()[0]!==T1||laneTitle(T1)!=='Probe temp') miss('rule #27: the temporary track did not take its name and the first place');
        if(!del(T1)) miss('rule #27: the temporary track could not be deleted');
        const T2=tmp();
        if(T2==null) miss('rule #27: the second temporary track could not be recorded');
        else{
          if(T2!==T1) console.log(`[scaleprobe track-look] rule #27: the second temporary track took L${T2+1}, not the freed L${T1+1} — still checked`);
          if(laneNameOf(T2)!==null) miss(`rule #27: a new track on L${T2+1} inherits the deleted track's name «${laneNameOf(T2)}»`);
          const O2=laneOrder(); if(O2[O2.length-1]!==T2) miss(`rule #27: a new track on L${T2+1} is not last (it is at place ${O2.indexOf(T2)+1} of ${O2.length})`);
          if(!del(T2)) miss('rule #27: the second temporary track could not be deleted'); }
        if(events.length!==nEv || JSON.stringify(laneOrder())!==JSON.stringify(O0)) miss('rule #27: the song is not back as it was (events or order)');
      }
    } else miss('rule #27: the transport is playing — stop it first');
    // ---- 7) AR2-fix: полоса игры на ширинах 360 / 380 / 768 / 1280 px — каждый «L#» и имя внутри рамки и своей колонки ----
    for(const W of [360,380,768,1280]){ const SP=stripProbe(W);
      for(const r of SP.rows){ cases++; const [f0,f1]=r.frame;
        for(const [w,[a,b]] of [['label',r.lbl],['name',r.name]]){
          if(b>a && (a<f0-0.5||b>f1+0.5)) miss(`strip at ${W} px: L${r.ly+1}'s ${w} [${a.toFixed(1)}, ${b.toFixed(1)}] leaves the frame [${f0}, ${f1}]`);
          if(b>a && (a<r.col[0]-0.5||b>r.col[1]+0.5)) miss(`strip at ${W} px: L${r.ly+1}'s ${w} [${a.toFixed(1)}, ${b.toFixed(1)}] leaves its name column [${r.col[0]}, ${r.col[1]}]`); } }
      cases++; const o=SP.old;   // контроль: прежняя раскладка («L#» правым краем у x0−4) — та, что торчала у пользователя; мера обязана её поймать
      if(!(o.lbl[0]<o.frame[0]-0.5)) miss(`control at ${W} px: the old label place [${o.lbl[0].toFixed(1)}, ${o.lbl[1].toFixed(1)}] reads as inside the frame [${o.frame[0]}, ${o.frame[1]}] — the check could not catch the overflow`); }
  } finally {
    if(rollOpen) arrApi.closeTrack();
    restoreShow(); winRestore(wk);
  }
  await frame();
  console.log(`[scaleprobe track-look] tracks ${LS.length} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe track-look] '+m));
  if(!nBad) console.log('[scaleprobe track-look] default names follow role and timbre in both languages; the four role colours differ in lightness; every track is drawn with one name and one colour in the play strip, the arrangement, the mixer and the editor; a rename shows everywhere and survives a scroll and a face switch; a reorder is one order everywhere and every row still opens its own track; a new track on a deleted number inherits neither name nor place');
  return done();
}
/* ═══ ДОРОЖЕК БОЛЬШЕ, ЧЕМ СТРОК НА ЭКРАНЕ — P.checkTracks (починка «дорожки дальше 16-й не видны») ═══
   Для КАЖДОЙ дорожки песни: (1) СТРОКА — после прокрутки полосы (laneRow0, как листает палец) она среди нарисованных строк, целиком на
   экране, и попадание по ней даёт ЕЁ слой: «вооружить» у подписи, M и S в гнёздах; транспорт (▶ ⤺ ✎ …) — на экране; (2) РЕДАКТОР —
   editOpen открывает именно её; (3) M/S — заглушение делает её неслышной, соло — слышной при неслышных прочих (тот же предикат laneAudible,
   что у обоих путей переигровки), и всё возвращается; (4) ЗВУК — слышима при нетронутом микшере, у каждого «вкл» конечная цена (evHz —
   то, чем играет ENG), а у дорожек ДАЛЬШЕ 16-й — офлайн-рендер (render.renderTrack — та же таблица ENG на копии движка) с ненулевым пиком.
   Кадры ждёт сама (полоса рисуется в цикле приложения): await P.checkTracks(). Прокрутку, микшер и редактор возвращает как были; при
   тронутом микшере (заглушено или соло) пункт 3 пропускается с пометкой. Нужна полоса на экране (во время записи видеоклипа её нет). */
export async function checkTracks(){
  const bad=[]; let nBad=0, cases=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const L=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b), notes=[];
  if(!L.length) return { cases:0, song:0, total:0, differences:[] };
  if(editIsOpen()){ miss('the track editor is open — close it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song:L.length, total:nBad, differences:bad }; }
  const keepRow0=laneRow0, mixerTouched=laneSoloOn() || L.some(ly=>laneMuted(ly));
  try{
    // ---- 1) строка на полосе ----
    await frame(); await frame();
    for(const [i,ly] of L.entries()){ cases++;
      let V=loopViewProbe();
      if(!V){ miss('the track strip is not drawn (no song, or a video clip is recording)'); break; }
      if(!V.rows.includes(ly)){ const S=loopScroll();
        if(S){ setLaneRow0(Math.max(0, Math.min(S.nAll-S.visN, V.all?V.all.indexOf(ly):i))); await frame(); await frame(); V=loopViewProbe(); } }
      if(!V||!V.rows.includes(ly)){ miss(`L${ly+1}: not among the drawn rows even after scrolling`); continue; }
      const ri=V.rows.indexOf(ly), y=V.gy0+ri*V.rowH+V.rowH/2;
      if(V.gy0+(ri+1)*V.rowH>innerHeight) miss(`L${ly+1}: its row lies below the bottom of the screen (y ${Math.round(y)} of ${innerHeight})`);
      const hA=loopHit(V.bx0-8,y); if(!hA||hA.layer!==ly||hA.what!=='arm') miss(`L${ly+1}: a tap on its label does not arm it (${hA&&hA.what} L${hA&&hA.layer+1})`);
      let hM=null, hS=null; for(let x=V.tx0; x<V.tx0+90 && !(hM&&hS); x++){ const h=loopHit(x,y); if(h&&h.what==='mute'&&!hM) hM=h; if(h&&h.what==='solo'&&!hS) hS=h; }
      if(!hM||hM.layer!==ly) miss(`L${ly+1}: its M button is not hittable`);
      if(!hS||hS.layer!==ly) miss(`L${ly+1}: its S button is not hittable`);
    }
    const tp=document.getElementById('loopTransport');
    if(tp){ cases++; const b=tp.getBoundingClientRect(); if(b.height>0 && b.bottom>innerHeight+0.5) miss(`the transport (▶ ⤺ ✎ …) lies below the bottom of the screen (${Math.round(b.bottom)} > ${innerHeight})`); }
    // ---- 2) редактор, 3) M/S, 4) звук ----
    for(const [i,ly] of L.entries()){
      cases++; if(!editOpen(ly) || editLayer()!==ly) miss(`L${ly+1}: the editor does not open on it`); editClose();
      if(!mixerTouched){ cases++;
        toggleLaneMute(ly); const mOff=!laneAudible(ly); toggleLaneMute(ly); const mBack=laneAudible(ly)&&!laneMuted(ly);
        toggleLaneSolo(ly); const other=L.find(o=>o!==ly), sOn=laneAudible(ly) && (other==null || !laneAudible(other)); toggleLaneSolo(ly); const sBack=!laneSoloOn() && laneAudible(ly);
        if(!mOff||!mBack) miss(`L${ly+1}: mute does not ${!mOff?'silence it':'come back'}`);
        if(!sOn||!sBack) miss(`L${ly+1}: solo does not ${!sOn?'isolate it':'come back'}`); }
      cases++; if(!mixerTouched && !laneAudible(ly)) miss(`L${ly+1}: not audible with an untouched mixer`);
      for(const e of events){ if(e.layer!==ly || !/^(leadOn|bassOn|chOn)$/.test(e.fn)) continue;
        const r=e.fn==='leadOn'?'ld':e.fn==='bassOn'?'bs':'ch', hz=evHz(e.a,e,r);
        if(r==='ch' ? !(hz.length && hz.every(f=>Number.isFinite(f)&&f>0)) : !(Number.isFinite(hz)&&hz>0)){ miss(`L${ly+1} beat ${Math.round(e.t*1000)/1000} ${e.fn}: no price — it would not sound`); break; } }
      if(i>=16){ cases++;
        try{ const R=await import('../render.js'), out=await R.renderTrack(ly), b=out&&out.buf; let pk=0;
          if(b) for(let c=0;c<b.numberOfChannels;c++){ const x=b.getChannelData(c); for(let k=0;k<x.length;k++){ const v=Math.abs(x[k]); if(v>pk) pk=v; } }
          if(!(pk>1e-4)) miss(`L${ly+1} (track ${i+1}): its offline render is silent (peak ${pk})`); else notes.push(`L${ly+1} (track ${i+1}) renders with peak ${pk.toFixed(4)}`); }
        catch(err){ miss(`L${ly+1}: the offline render failed — ${err&&err.message}`); } }
    }
  } finally { setLaneRow0(keepRow0); if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe tracks] tracks ${L.length} · cases ${cases} · differences ${nBad}${mixerTouched?' · mixer touched: M/S toggles skipped':''}`);
  notes.forEach(m=>console.log('[scaleprobe tracks] '+m));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe tracks] '+m));
  if(!nBad) console.log('[scaleprobe tracks] every track is drawn on the strip (scrolling where needed) and hittable, opens in the editor, mutes and solos, and plays');
  return { cases, song:L.length, total:nBad, differences:bad };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:330, name:'tracks: every one reachable', run:()=>checkTracks(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), slow:true, drawn:true, song:true });
row({ at:340, name:'AR1 arrangement window', run:()=>checkArrange(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), drawn:true, song:true });
row({ at:350, name:'MX1 track level and master', run:()=>checkMixer(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), drawn:true, song:true });
row({ at:360, name:'MX2 track pan', run:()=>checkPan(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), drawn:true, song:true });
row({ at:370, name:'AR2 track names, colours, order', run:()=>checkTrackLook(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), drawn:true, song:true });
