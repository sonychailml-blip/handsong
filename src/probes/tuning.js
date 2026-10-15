/* PROBE1: Tuning and editor-row probes: pitch from the tuning index, editor rows, highlights, chord rules and labels, out-of-mode pitches, song integrity, chord types and modes. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { rollRowsProbe as RP } from '../draw.js';
import { L, t } from '../i18n.js';
import { legacyChordNotesRef, sweep, OLD, KEEP_MAX, allViews, PRINT_MAX, TUNINGS, SCALES, isTert, tagOf, keyless, legacyChordNotesStr, legacyChordLabel, legacyLeadFreq, legacyBassFreq, PRE_T7_SETS, preT7ChordUnit, A4_SET, preT7ChordNotesAt, preT7ChordNotes, CHORD_FAM_SETS, legacyChordNotes } from '../probedata.js';
import { hlOf, events, laneRoleOf, laneTimbreOf, viewAudit, evHz, evReg, songSegs, chaseFor, chaseNote, segChordNotes, chordMoveTy } from '../recorder.js';
import { chordRowFreq, leadFreqTi, tuningIndexOf, bassFreqTi, chordNotesAt, tonicFreq, centsOf, scaleView, chordUnit, chordFams, REG_N, modeSlotOfTi, viewIdOf, ruleChordSteps, chordNotesStr, chordLabel, periodOf, chordBuildOf, chordRowFreqAt, chordTypeFits, chordNotes, CUR, chordModeOf, chordPitchHz, pitchHz, baseF } from '../scales.js';
import { tonic, setTonic, aRef, chordModeSel, scaleId, setARef, setScaleId, setChordMode, tunedFrom, setChordModeSel } from '../state.js';
import { row } from './rows.js';
/* Прежние РЯД и НОТЫ сегмента редактора ПО СТУПЕНИ (были draw.legacyRollSegRoot/legacyRollSegNotes, T4b3). Синтетический сегмент прогона
   несёт ступень сам (s.deg); частоты рядов оси, место частоты среди них и допуск «на ряду» — те же функции и число, что у рисунка
   (draw.rollRowsProbe: rowFreqs/rowOfFreq/onRowCents). Призрак по ступени не нужен: его сверяла только песенная часть, снятая в T4c-2. */
function refRollSegRoot(s,ax){ return ax.rowOf(s.deg,s.oct); }
function refRollSegNotes(s,ax,total){
  const r0=ax.rowOf(s.deg,s.oct);
  if(s.role!=='ch') return [{ r:r0, dev:null }];
  const N=legacyChordNotesRef(s.deg,s.oct,s.sc,s.sev,s.ty), F=RP.rowFreqs(ax,s.sev,total), dpo=ax.rpp;
  const fr=chordRowFreq(s.deg,s.oct,s.sc,s.sev);
  return N.map(n=> Math.abs(1200*Math.log2(n.f/fr))<RP.onRowCents ? { r:r0, dev:null } : RP.rowOfFreq(n.f,F,dpo,total));
}

/* ═══ T4b1: ЗВУК ЧИТАЕТ ИНДЕКС В СТРОЕ — ПРОГОН ═══
   Каждый вид × тоники × A4 × регистры × ступени 0..n (столько и пишут пути записи) × все типы — ступень → индекс функцией записи
   (tuningIndexOf), цена из индекса против ЗАМОРОЖЕННОЙ опоры (прежняя цена по ступени) — ===. Тоника и показ центов — как в T1.
   ⛳ T4c-2: песенная часть (цена из a.ti против цены по хранимой ступени) снята вместе со ступенью — её защиту несёт P.checkSong. */
export function checkSound(){
  const TI={ lead:(d,o,v)=>leadFreqTi(tuningIndexOf(d,v,false),o,v), bass:(d,o,v)=>bassFreqTi(tuningIndexOf(d,v,false),o,v),
             chord:(d,o,v,sev,ty)=>chordNotesAt(tuningIndexOf(d,v,true),o,v,sev,ty), tonic:tonicFreq, cents:centsOf };
  const r=sweep('T4b1',['from ti','old'],TI,OLD,(s,tf)=>{ const v=scaleView(s,tf); return [v,v]; }, { melMax:n=>n, chMax:n=>n });
  if(!r.total) console.log('[scaleprobe T4b1] every sweep case prices identically from the tuning index');
  return { sweep:r };
}

/* ═══ T4b3: РЯДЫ И РИСОВАНИЕ РЕДАКТОРА ЧИТАЮТ ИНДЕКС В СТРОЕ ═══
   Работает БЕЗ открытого редактора: ось строится для каждого вида (draw.rollRowsProbe.axis), обе оси — «Все» и «Лад».
   ⛳ T4c-2: ПЕСЕННАЯ ЧАСТЬ (ниже — п. 1) СНЯТА: прежний путь читал хранимую ступень, её нет; её защиту несёт P.checkSong. Был:
   1) ПЕСНЯ: каждый сегмент каждой дорожки (соло, бас, аккорды), сгруппированный, как группирует редактор (дорожка, роль, ССЫЛКА на вид):
      • высота оси аккордов (rollChordTotal — сколько рядов) — путь индекса против прежнего;
      • РЯД КОРНЯ (он же ряд блока баса/соло и rootRow попадания) и КАЖДАЯ нота блока — ряд и отступление в центах (по нему блок
        рисуется «вне ряда», им же решается выделение-контур) — путь индекса против прежнего;
      • ПОПАДАНИЕ: палец на ряду каждой ноты, на ряду корня и в ±0.3/±0.49 ряда от них — какую ноту берёт (номер) и на каком расстоянии;
      • ПРИЗРАК переноса целого аккорда: для КАЖДОГО яркого ряда оси — ноты сегмента, поставленного туда (путь индекса: с индексом, который
        поставит правка; прежний: только ступень и регистр);
      • выделение одной ноты и её призрак берут ряды из того же списка нот — сверены выше.
      Полоса «в ноте» (громкость, яркость …) строится из величин и времени нот — ни ступени, ни ряда не читает; сверять там нечего.
   2) ПРОГОН: каждый вид × обе оси × регистры 0..3 × ступени 0..n — ряд из ступени (rowOf) против ряда из индекса (rowOfTi от tuningIndexOf
      по закону мелодии/баса и по закону аккорда); и ряды нот аккорда (корень и каждая нота) для каждого типа лада, без типа (септаккорд
      выкл/вкл) и единицы корня — путь индекса против прежнего.
   Кэш частот рядов аккордов сбрасывается перед каждым расчётом, который его заполняет (RP.reset), — оба пути считаются при одном его
   состоянии. Сравнение ===. Принимается ТОЛЬКО при нуле. Ничего не меняет. */
export function checkRows(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const cmpNotes=(at,N,O)=>{
    if(N.length!==O.length){ miss(`${at}: ${N.length} blocks new, ${O.length} legacy`); return; }
    for(let i=0;i<N.length;i++) if(N[i].r!==O[i].r||N[i].dev!==O[i].dev) miss(`${at} note ${i}: row ${N[i].r} dev ${N[i].dev} new, row ${O[i].r} dev ${O[i].dev} legacy`);
  };
  const VIEWS=[['all',true],['mode',false]];
  const songBad=0;
  // ---- 2) прогон по видам ----
  let nRow=0, nTone=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), total=2*REG_N*ax.rpp;
      RP.reset();
      for(let o=0;o<4;o++) for(let d=0;d<=n;d++){
        const want=ax.rowOf(d,o), at=`${id} [${vn}] degree ${d} reg ${o}`;
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,false),o); if(got!==want) miss(`${at}: melody/bass row from ti ${got}, from degree ${want}`); }
        nRow++; { const got=ax.rowOfTi(tuningIndexOf(d,v,true),o); if(got!==want) miss(`${at}: chord-root row from ti ${got}, from degree ${want}`); }
        for(const [ty,sev] of tys){
          if(!ty && v.chordRule && v.chordRule.kind==='none') continue;   // T6b: «аккорда нет» — проверяет P.checkUntyped
          const g={ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty };
          nTone++; const rN=RP.root(g,ax), rL=refRollSegRoot(g,ax);
          const tt=`${at} chord ${ty?'['+ty.join(',')+']':'none'}${sev?' 7th':''}`;
          if(rN!==rL) miss(`${tt}: root row ${rN} new, ${rL} legacy`);
          cmpNotes(tt, RP.notes(g,ax,total), refRollSegNotes(g,ax,total));
        }
      }
    }
  }
  console.log(`[scaleprobe T4b3] sweep: rows ${nRow} · chord placements ${nTone} (every view, both views of the axis, registers 0..3, degrees 0..n) · differences ${nBad-songBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b3] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b3] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b3] every row and chord placement is identical when read from the tuning index');
  RP.reset();
  return { rows:nRow, chords:nTone, total:nBad, differences:bad };
}

/* ═══ T4b4-1: ДВЕ ПРАВКИ РЯДОВ РЕДАКТОРА (ВИДИМЫЕ) ═══
   1) НИЖНИЙ РЯД ПО УМОЛЧАНИЮ (draw.rollDefaultRow0For): каждый вид × обе оси × регистр 0..3 × несколько высот окна — ряд корня регистра
      reg·rpp ВИДЕН в окне [row0, row0+rows); у оси «Лад» row0 равен прежней формуле (iv.length+1 рядов на регистр); у оси «Все» печатается,
      во скольких случаях прежняя формула открыла бы не тот регистр (это и есть правка).
   2) РЯДЫ НОТ АККОРДА НЕ ЗАВИСЯТ ОТ ИСТОРИИ КЭША: каждый вид × обе оси × ступень 0..n × регистр 0..3 × каждый тип лада, без типа и
      единица корня — ряды и отступления нот при ХОЛОДНОМ кэше против прогретого ДРУГИМ вызывающим (ось втрое длиннее), ===. */
export function checkRowFix(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const VIEWS=[['all',true],['mode',false]];
  let nDef=0, nOld=0, nCache=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    const tys=[[null,false],[null,true],[chordUnit(v),false]];
    for(const f of chordFams(v)) for(const ty of f.types) tys.push([ty.iv,false]);
    for(const [vn,all] of VIEWS){
      const ax=RP.axis(v,all), rpp=ax.rpp, T=REG_N*rpp;
      // ---- 1) нижний ряд по умолчанию ----
      for(let reg=0; reg<REG_N; reg++) for(const rows of [1,5,8,rpp,2*rpp,T,T+3]){
        nDef++; const r0=RP.defRow0(v,reg,rows,ax), at=`${id} [${vn}] register ${reg} window ${rows} rows`;
        if(!(r0>=0 && reg*rpp>=r0 && reg*rpp<r0+rows)) miss(`${at}: bottom row ${r0} does not show register ${reg} (its root row ${reg*rpp})`);
        const old=Math.max(0, Math.min(reg*(n+1), 4*(n+1)-rows));
        if(!all||rpp===n+1){ if(r0!==old) miss(`${at}: bottom row ${r0}, the old formula gives ${old} (they must agree where rows per register = degrees + 1)`); }
        else if(!(old>=0 && reg*rpp>=old && reg*rpp<old+rows)) nOld++;
      }
      // ---- 2) кэш частот рядов ----
      const segs=[];
      for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++) for(const [ty,sev] of tys) segs.push({ role:'ch', deg:d, oct:o, ti:tuningIndexOf(d,v,true), sc:v, sev, ty });
      RP.reset(); const cold=segs.map(g=>RP.notes(g,ax,T));
      RP.reset(); RP.notes(segs[0],ax,3*T);                    // прогрев ДРУГИМ вызывающим: таблица втрое длиннее оси
      for(let i=0;i<segs.length;i++){ nCache++; const g=segs[i], W=RP.notes(g,ax,T), C=cold[i];
        const at=`${id} [${vn}] chord degree ${g.deg} reg ${g.oct} ${g.ty?'['+g.ty.join(',')+']':'none'}${g.sev?' 7th':''}`;
        if(W.length!==C.length){ miss(`${at}: ${W.length} notes warm, ${C.length} cold`); continue; }
        for(let k=0;k<W.length;k++) if(W[k].r!==C[k].r||W[k].dev!==C[k].dev) miss(`${at} note ${k}: row ${W[k].r} dev ${W[k].dev} with a warm cache, row ${C[k].r} dev ${C[k].dev} cold`); }
    }
  }
  RP.reset();
  console.log(`[scaleprobe T4b4-1] default bottom row: ${nDef} cases (in "All", the old formula would have opened the wrong register in ${nOld}) · chord rows cold vs warm cache: ${nCache} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4-1] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4-1] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b4-1] the roll opens on the live register in both views, and chord rows no longer depend on cache history');
  return { defaults:nDef, oldWrong:nOld, cache:nCache, total:nBad, differences:bad };
}

/* ═══ T4b4: ПОДСВЕТКА ЧИТАЕТ ИНДЕКС В СТРОЕ ═══
   Без рук и без редактора. Место подсветки переигранной/догнанной ноты — recorder.hlOf (индекс → обратная выборка лада) против прежнего
   legacyHlOf (ступень и регистр события), сравнение ===:
   1) ПРОГОН: каждый вид × закон аккорда и закон мелодии/баса × ступень 0..n × регистр 0..3;
   2) ВЫСОТЫ ВНЕ ЛАДА: у видов, чей лад меньше строя, — каждая высота строя без ступени лада, в регистрах 0..3 и через перенос периода —
      обязана дать «нет места» (null), не бросив;
   ⛳ T4c-2: песенные части (3 — события песни, 4 — догонялка) сравнивали с ХРАНИМОЙ ступенью — сняты; их защиту несёт P.checkSong.
   Опора прогона — сама пара (ступень, регистр), из которой сделан индекс (прежний legacyHlOf возвращал ровно её).
   Живые подсветки (ступень жеста в реестрах leadHold/bassHold, защёлка latchDeg, ярлыки рук) не менялись — сравнивать там нечего. */
export function checkHl(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const same=(N,O)=> !!N && !!O && N.deg===O.deg && N.oct===O.oct;
  const show=p=> p ? `${p.deg}/${p.oct}` : 'none';
  let nSweep=0, nOut=0;
  for(const [sc0,tf] of allViews()){
    const v=scaleView(sc0,tf), n=v.iv.length, id=v.id+(v.tunable?`[from ${tf}]`:'');
    for(const chord of [true,false]) for(let o=0;o<REG_N;o++) for(let d=0;d<=n;d++){
      nSweep++; const a={ deg:d, oct:o, ti:tuningIndexOf(d,v,chord) }, N=hlOf(a,v), O={ deg:d, oct:o };
      if(!same(N,O)) miss(`${id} ${chord?'chord':'melody'} degree ${d} reg ${o}: from ti ${show(N)}, legacy ${show(O)}`);
    }
    const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, inMode=new Set(v.sel.map(k=>k-v.root));
    if(v.sel.length<E) for(let j=0;j<E;j++){ if(inMode.has(j)) continue;
      for(let o=0;o<REG_N;o++) for(const c of [0,1,-1]){ nOut++;
        let p; try{ p=modeSlotOfTi(v.root+j+E*c,o,v); }catch(e){ miss(`${id} pitch ${j} reg ${o}: threw ${e&&e.message}`); continue; }
        if(p!==null) miss(`${id} out-of-mode pitch ${j} (+${c} period) reg ${o}: gave a slot ${show(p)}`); } }
  }
  console.log(`[scaleprobe T4b4] sweep ${nSweep} · out-of-mode pitches ${nOut} (no slot, none threw) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T4b4] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T4b4] …and ${nBad-PRINT_MAX} more (first ${Math.min(nBad,KEEP_MAX)} are in the returned object)`);
  if(!nBad) console.log('[scaleprobe T4b4] every highlight read from the tuning index lands on the degree and register it was made from');
  return { sweep:nSweep, outOfMode:nOut, total:nBad, differences:bad };
}

/* ═══ МАРШРУТ ПО СТРОЮ — ЧТО ЛЕЖИТ В КАЖДОЙ ДОРОЖКЕ (справка, не проверка; ничего не меняет) ═══
   Строка на дорожку: L-номер, роль (laneRoleOf), тембр (laneTimbreOf — индекс тембра роли / набора ударных), вид(ы) строя её высотных
   событий (scales.viewIdOf — тот же, что в ключе маршрута), число событий и подложка ли. Видов больше одного — предупреждение: так могла
   лечь только запись, сделанная ДО маршрута по строю (ничего не сохраняется — после перезагрузки таких нет). */
export function tracks(){
  const L=new Map();
  for(const e of events){
    let r=L.get(e.layer); if(!r){ r={ views:new Set(), n:0, jam:false }; L.set(e.layer,r); }
    r.n++; if(e.jam) r.jam=true;
    if(e.sc && e.fn!=='drum' && e.fn!=='drone') r.views.add(viewIdOf(e.sc));
  }
  const rows=[...L.keys()].sort((a,b)=>a-b).map(ly=>{ const r=L.get(ly);
    return { track:'L'+(ly+1), role:laneRoleOf(ly)||'-', timbre:laneTimbreOf(ly)??'-', view:[...r.views].join(' + ')||'-', events:r.n, backing:r.jam }; });
  console.table(rows);
  const mixed=rows.filter(x=>x.view.includes(' + '));
  if(mixed.length) mixed.forEach(x=>console.warn(`[scaleprobe tracks] ${x.track} holds ${x.view.split(' + ').length} tuning views: ${x.view} (recorded before routing by tuning)`));
  else console.log(`[scaleprobe tracks] ${rows.length} tracks, each with one tuning view at most`);
  return rows;
}

/* ═══ T6a: ПРАВИЛО АККОРДОВ ЛАДА — ДАННЫЕ (chordRule) ═══
   1) у каждого из 75 ладов правило есть, его вид — один из пяти, и он РАВЕН сегодняшнему выбору по tag (тот же порядок, что chordSteps:
      noChords → none; isTert → tertian; tag 'edo' → ratios; есть палитра → palette; иначе power); полей chord/chord7 больше нет;
   2) перенос отношений 19/31-TET: массивы правила — прежние числа, и ruleChordSteps (путь приложения, T4c-2) даёт те же шаги, что прежняя
      формула от прежних литералов, — каждая ступень 0..n, триада и септаккорд (===);
   3) ДАННЫМИ ДОКАЗАНО, что смена определения у нетипизированных аккордов центового лада (T6b) недостижима: каждый лад с аккордами и без
      палитры стоит на РАВНОМ строе, и правило ratios — тоже только на равном;
   4) вид лада несёт то же правило (scaleView копирует поля);
   5) песня: каждый хранимый аккорд без типа — в виде, чьё правило строит аккорды (tertian/power/ratios); защитные проверки вида
      (recorder.viewAudit — тот же предикат, что пишет в консоль) не находят ни ноты через два вида, ни дорожки с двумя видами.
   Ничего не меняет и не играет. */
export function checkRules(){
  const bad=[]; const miss=m=>bad.push(m);
  const KINDS=new Set(['tertian','stack','power','ratios','palette','none']);
  const OLD={ 'edo19-full':{ triad:[1,6/5,3/2], seventh:[1,6/5,3/2,9/5] }, 'edo31-full':{ triad:[1,5/4,3/2], seventh:[1,5/4,3/2,7/4] } };   // прежние литералы chord/chord7
  const same=(a,b)=> !!a && !!b && a.length===b.length && a.every((x,i)=>x===b[i]);
  const byKind={}; let nSteps=0;
  for(const s of SCALES){
    const R=s.chordRule, id=s.id;
    if(!R || !KINDS.has(R.kind)){ miss(`${id}: no chordRule, or an unknown kind`); continue; }
    byKind[R.kind]=(byKind[R.kind]||0)+1;
    const want= s.noChords ? 'none' : isTert(s) ? 'tertian' : tagOf(s)==='edo' ? 'ratios' : s.typedChords ? 'palette' : 'stack';   // «стопка»: прежний выбор по tag «пауэр» — теперь stack (решение пользователя)
    if(R.kind!==want) miss(`${id}: rule ${R.kind}, today's choice by tag ${want}`);
    if('chord' in s || 'chord7' in s) miss(`${id}: still carries chord/chord7 beside its rule`);
    const T=TUNINGS[s.tuning];
    if(R.kind==='ratios'){
      const o=OLD[id];
      if(!o) miss(`${id}: a ratios rule on a mode that had no chord ratios`);
      else{
        if(!same(R.triad,o.triad)||!same(R.seventh,o.seventh)) miss(`${id}: moved ratios differ from the old chord/chord7`);
        const n=s.iv.length;
        for(const sev of [false,true]) for(let d=0; d<=n; d++){ nSteps++;
          const r0=s.iv[d%n]+s.edo*Math.floor(d/n), w=(sev?o.seventh:o.triad).map(ra=>r0+Math.round(s.edo*Math.log2(ra))), g=ruleChordSteps(d,s,sev);   // T4c-2: путь приложения (chordSteps по tag ушла в опоры пробы)
          if(!same(g,w)) miss(`${id} degree ${d}${sev?' 7th':''}: steps ${g} now, ${w} from the old literals`); }
      }
      if(T.equal==null) miss(`${id}: a ratios rule on a table tuning`);
    }
    if(!s.noChords && !s.typedChords && T.equal==null) miss(`${id}: chords without a palette on a TABLE tuning — an untyped chord here would change definition in T6b`);
    if(R.kind==='palette' && !s.typedChords) miss(`${id}: palette rule without a palette`);
  }
  let nViews=0;
  for(const [s0,tf] of allViews()){ nViews++; const v=scaleView(s0,tf); if(v.chordRule!==s0.chordRule) miss(`${s0.id}: the view carries another chordRule object`); }
  let nUntyped=0;
  for(const e of events){
    if((e.fn!=='chOn'&&e.fn!=='chSet') || !e.a || e.a.ty) continue;
    nUntyped++; const k=e.sc&&e.sc.chordRule&&e.sc.chordRule.kind;
    if(k!=='tertian'&&k!=='stack'&&k!=='ratios'&&k!=='power') miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000}: an untyped chord in ${e.sc&&e.sc.id}, whose rule is ${k}`);
  }
  const A=viewAudit();
  A.notes.forEach(n=>miss(`L${n.layer+1} note at beat ${Math.round(n.start*1000)/1000} spans two tuning views`));
  A.tracks.forEach(ly=>miss(`L${ly+1} holds more than one tuning view`));
  console.log(`[scaleprobe T6a] modes ${SCALES.length} (${Object.entries(byKind).map(([k,n])=>k+' '+n).join(', ')}) · views ${nViews} · moved-ratio steps ${nSteps} · song: untyped chords ${nUntyped}, events ${events.length} · differences ${bad.length}`);
  bad.forEach(m=>console.warn('[scaleprobe T6a] '+m));
  if(!bad.length) console.log('[scaleprobe T6a] every chord rule matches today\'s choice, untyped chords live only on equal tunings, and the view checks find nothing in the song');
  return { byKind, views:nViews, steps:nSteps, untyped:nUntyped, differences:bad };
}

/* ═══ T6a-2: ПРОКРУТКА РЕДАКТОРА ЧЕРЕЗ ПЕРЕКЛЮЧЕНИЕ ОСИ (видимая правка) ═══
   1) «Все» ↔ «Лад» (один вид): каждый вид с приглушёнными рядами × оба направления × высоты окна × каждое положение окна — высота
      якоря (средний видимый ряд, приглушённый — прилипший к ступени) после перевода (draw.rollRow0Across) стоит на ТОМ ЖЕ месте лада
      (та же пара ступень/регистр) и ВИДНА в окне после зажима; печатается, у скольких якорей высота точная, у скольких — соседняя ступень;
   (п. 2 — чип лада, другой вид — снят в T4c-2 вместе с чипом: у дорожки один вид строя.)
   Работает без редактора. Ничего не меняет. */
export function checkScroll(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const views=allViews().map(([s0,tf])=>scaleView(s0,tf));
  let nP=0, nExact=0;
  for(const v of views) for(const [f0,f1] of [[true,false],[false,true]]){
    const a0=RP.axis(v,f0), a1=RP.axis(v,f1); if(a0===a1) continue;   // приглушённых рядов нет — кнопки нет
    const T0=REG_N*a0.rpp, T1=REG_N*a1.rpp;
    for(const rows of [5,8,13,20]){ if(rows>T0) continue;
      for(let row0=0; row0<=T0-rows; row0++){
        nP++; const r0c=Math.min(RP.across(a0,a1,row0,rows), Math.max(0,T1-rows));
        const mid=row0+Math.floor(rows/2), sn=a0.snap(mid), pt=a0.pitchOf(sn), nr=a1.rowOfTi(pt.ti,pt.oct), back=a1.pitchOf(nr);   // T4c-1: ряд отдаёт {ti, oct}
        if(sn===mid) nExact++;
        const at=`${v.id}${v.tunable?'@'+v.tunedFrom:''} ${f0?'All→Mode':'Mode→All'} window ${rows} at row ${row0}`;
        if(!(nr>=r0c && nr<r0c+rows)) miss(`${at}: the anchor (ti ${pt.ti} reg ${pt.oct}) is at row ${nr}, outside the new window ${r0c}..${r0c+rows-1}`);
        if(!back||back.ti!==pt.ti||back.oct!==pt.oct) miss(`${at}: row ${nr} is not ti ${pt.ti} reg ${pt.oct} in the new axis`);
      }
    }
  }
  console.log(`[scaleprobe T6a-2] All/Mode switches ${nP} (anchor pitch exact in ${nExact}, snapped to the nearest degree in ${nP-nExact}) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T6a-2] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T6a-2] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe T6a-2] every All/Mode switch keeps the anchor pitch in view');
  return { toggles:nP, exact:nExact, total:nBad, differences:bad };
}

/* ═══ T6c: ПОДПИСИ АККОРДА ЧИТАЮТ ПРАВИЛО ЛАДА ═══
   Каждый вид (у Пифагора — каждый «строй от») × ступень 0..n × септаккорд выкл/вкл × 12 тоник: chordLabel и chordNotesStr (по правилу,
   ruleChordSteps) против legacyChordLabel и legacyChordNotesStr (по tag) — строки, ===. Тоника и «строй от» переставляются сеттерами и
   возвращаются в finally (подпись читает живую тонику). Расхождение на ладу, где подпись ПОКАЗЫВАЕТСЯ (правило tertian/power — у прочих
   draw её не рисует: палитра пишет корень, noChords — объяснение), — ошибка; на прочих — считается отдельно как «не показывается» (по
   построению это только макамы: их tag давал стопку, правило 'none' — форма пауэр-аккорда) и печатается сведением. */
export function checkLabels(){
  const bad=[]; let cases=0, hidden=0; const hiddenIds=new Set(); const keepT=tonic;
  try{
    for(const [s0,tf] of allViews()){
      const v=keyless(scaleView(s0,tf)), n=v.iv.length, k=v.chordRule&&v.chordRule.kind, shown= k==='tertian'||k==='stack';   // TF2: key-less — the loop steps the live tonic
      const vRef= k==='stack' ? {...v, tag:'dia'} : v;   // «стопка»: ноты стопки сверяются с прежней арифметикой стопки
      const id=v.id+(v.tunable?`[from ${tf}]`:'');
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const sev of [false,true]) for(let d=0;d<=n;d++){
          for(const [what,A,B] of (k==='stack' ? [['notes',chordNotesStr(d,v,sev),legacyChordNotesStr(d,vRef,sev)]]   // у стопки НОВАЯ подпись — её проверяет P.checkStack
                                                : [['label',chordLabel(d,v,sev),legacyChordLabel(d,v,sev)],['notes',chordNotesStr(d,v,sev),legacyChordNotesStr(d,v,sev)]])){
            if(shown) cases++;
            if(A===B) continue;
            if(shown) bad.push(`${id} tonic ${tn} degree ${d}${sev?' 7th':''} ${what}: rule "${A}", by tag "${B}"`);
            else { hidden++; hiddenIds.add(v.id); }
          }
        }
      }
    }
  } finally { setTonic(keepT); }
  console.log(`[scaleprobe T6c] label cases ${cases} (modes whose chord labels are shown) · differences ${bad.length}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T6c] '+m));
  if(hidden) console.log(`[scaleprobe T6c] information: ${hidden} strings differ on modes whose chord labels are never shown (${[...hiddenIds].join(', ')})`);
  if(!bad.length) console.log('[scaleprobe T6c] every shown chord label and note list reads the same from the chord rule');
  return { cases, hidden, hiddenModes:[...hiddenIds], total:bad.length, mismatches:bad };
}

/* ═══ T5: ОПОРА ДЛЯ ВЫСОТЫ ВНЕ ЛАДА — ТОТ ЖЕ СТРОЙ КАК ЛАД ЦЕЛИКОМ ═══
   У высоты вне лада ПРЕЖНЕЙ цены не было (до T5 её не писал никто) — сверять с прошлым нечего. Опора — замороженные тела (legacy*) над
   СИНТЕТИЧЕСКИМ ладом «весь строй от корня лада»: равный строй — iv = 0..E−1, edo = E; таблица — центы строя от корня лада (с переносом
   за период). Высота вне лада — ступень такого лада, и прежняя формула по ступени даёт её цену НЕЗАВИСИМО от новой функции высоты.
   ⛳ ТОЧНО (===) там, где выражения совпадают по построению: равный строй с корнем 0 (все 12-тоновые лады и макамы) и таблица с корнем 0
   (раги, патеты Лима и Нем) — сдвиг c[k] − c[0] = c[k] − 0. ⚠️ У таблицы с корнем ≠ 0 (патет Баранг, корень — индекс 1 Пелога) высота
   за краем таблицы прежде считалась бы 2^((c+1200−c₀)/1200), теперь 2·2^((c−c₀)/1200) — равны по смыслу, но не обязаны в последнем бите:
   там сравнение — в центах, допуск 1e-6 цента, и такие случаи считаются ОТДЕЛЬНО. Фиксированного строя с приглушёнными рядами нет
   (все шесть — строй целиком), для него опоры нет. */
const WHOLE=new WeakMap();
function wholeOf(v){
  if(WHOLE.has(v)) return WHOLE.get(v);
  const T=TUNINGS[v.tuning]; let w=null;
  if(T && !v.fixedKey && v.sel){
    const ids=n=>[...Array(n).keys()];
    if(T.equal!=null){ if(v.root===0) w={...v, iv:ids(T.equal), edo:T.equal, cents:undefined}; }
    else { const C=T.cents, N=C.length, r=v.root; w={...v, iv:ids(N), edo:N, cents:ids(N).map(i=>C[(r+i)%N]+1200*Math.floor((r+i)/N)-C[r])}; }
  }
  WHOLE.set(v,w); return w;
}
const wholeExact=v=> TUNINGS[v.tuning].equal!=null || v.root===0;
/* сдвиг мелодии в целом строе: j ∈ [0, E] и регистр — тем же законом, что melodySplit/rowOfTi */
function wholeSplit(ti,oct,v){ const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length; let j=ti-v.root, R=oct|0;
  if(j<0||j>E){ const c= j>E ? Math.ceil((j-E)/E) : Math.floor(j/E); j-=E*c; R+=c; } return [j,R]; }
/* цена высоты вне лада против опоры по целому строю → строка расхождения или null; exact=false — сравнение в центах (см. выше) */
function outRef(role,a,v,sev){
  const W=wholeOf(v); if(!W) return { err:'no whole-tuning reference for this view' };
  if(role==='ch'){ if(!a.ty) return { err:'an UNTYPED chord outside its mode (option (a) should have typed it)' };
    return { f: legacyChordNotesRef(a.ti-v.root, a.oct, W, sev, a.ty).map(n=>n.f) }; }
  const [j,R]=wholeSplit(a.ti,a.oct,v);
  return { f: role==='ld' ? legacyLeadFreq(j,R,W) : legacyBassFreq(j,R,W) };
}
const sameHz=(x,y,exact)=> exact ? x===y : (x>0 && y>0 && Math.abs(1200*Math.log2(x/y))<1e-6);

/* ═══ T4c-2: ЦЕЛОСТНОСТЬ ПЕСНИ БЕЗ СТУПЕНИ — ЗАМЕНА ПЕСЕННЫХ ПРОБ, СВЕРЯВШИХ СО СТУПЕНЬЮ (T4a, T4b1, T4b2, T4b3, T4b4, T6b, T4c-1) ═══
   Хранимой ступени больше нет — сверять с ней нечего. Вместо этого каждая производная дорожка песни проверяется на ПРАВИЛЬНУЮ ФОРМУ и
   на ЦЕНУ ПРОТИВ ЗАМОРОЖЕННЫХ ОПОР (прежние тела функций по ступени — раздел выше), куда ступень приходит ОБРАТНОЙ ВЫБОРКОЙ ИЗ ИНДЕКСА
   (scales.modeSlotOfTi — та же функция, что у подсветки), а не из события. Сравнение ===:
     1) СОБЫТИЯ: ни одно событие не несёт ступени лада (поле deg); у каждого «вкл»/ведения соло, баса и аккорда — целые индекс в строе и
        регистр — высота В СТРОЕ события (⛳ T5: прежде требовалось «в ладу»; с T5 редактор ставит ноты и на приглушённые ряды). Высота В
        ЛАДУ: цена ENG (recorder.evHz) — конечная, положительная и РАВНА прежней цене по ступени этого места; место в реестре голосов (evReg)
        и подсветка аккорда (hlOf) переводятся назад в тот же индекс (tuningIndexOf — закон своей роли). Высота ВНЕ ЛАДА: цена равна опоре по
        ЦЕЛОМУ строю (wholeOf выше; аккорд обязан быть типизированным — вариант (а) или однонотная форма), подсветки нет (hlOf — null), реестр
        места не пишет (deg undefined);
     2) СЕГМЕНТЫ (songSegs): роль, целые индекс и регистр, равные хранимым у определяющего события, тот же вид, время начала = время события,
        конец не раньше начала, события начала и конца — из песни, указатель «событие → сегмент» покрывает каждое «вкл»/ведение;
     3) ДОГОНЯЛКА на КАЖДОЙ доле, где лежит событие: нагрузка без ступени, целые индекс и регистр, контекст — событие песни, цена конечная и
        равна прежней по ступени места (у удержанного терменвокса — место АТАКИ);
     4) РЕДАКТОР, обе оси («Все» и «Лад»), сегменты сгруппированы как в редакторе: ряд корня — целое; ряд → высота (pitchOf) возвращает ТОТ ЖЕ
        индекс и регистр (вставка и перенос пишут ровно это); призрак сегмента на его собственном ряду — те же блоки, что сам сегмент.
        ⛳ T5: у оси «Лад» нота вне лада — ДРОБНЫЙ ряд строго между соседними ступенями, по высоте между ними, с отступлением dev (знак
        «вне ряда»); у оси «Все» — целый ряд, как всякая высота строя;
     5) РАСПАД: ноты аккорда сегмента (segChordNotes) непусты и конечны, и однонотный аккорд с интервалом каждой ноты звучит ровно её частотой
        (U2/U3 — оставшиеся ноты после распада звучат как прежде).
   Работает на загруженной песне, без редактора и рук; ничего не меняет (кэш догонялки и рядов — только кэш). */
export function checkSong(){
  const bad=[]; let nBad=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const ROLE={ l:'ld', b:'bs', c:'ch' }, VIEWS=[['all',true],['mode',false]];
  const isInt=Number.isInteger, fin=f=>typeof f==='number' && Number.isFinite(f) && f>0;
  const beat=t=>Math.round(t*1000)/1000;
  const sameNotes=(X,Y)=> X.length===Y.length && X.every((x,i)=>x.f===Y[i].f && x.iv===Y[i].iv);
  /* цена против прежней по ступени места (ступень — обратной выборкой из индекса); ⛳ T5: вне лада — против опоры по целому строю (→ null) */
  let nOut=0, nOutTol=0;
  const priceCheck=(at,a,ctx,role)=>{
    const p=modeSlotOfTi(a.ti,a.oct,ctx.sc);
    if(!p){ nOut++; const hz=evHz(a,ctx,role), R=outRef(role,a,ctx.sc,ctx.sev), ex=wholeExact(ctx.sc); if(!ex) nOutTol++;
      if(R.err){ miss(`${at}: ti ${a.ti} reg ${a.oct} outside the mode ${ctx.sc&&ctx.sc.id}: ${R.err}`); return null; }
      if(role==='ch'){ if(!hz.length || !hz.every(fin) || hz.length!==R.f.length || hz.some((f,i)=>!sameHz(f,R.f[i],ex))) miss(`${at}: out-of-mode chord ${hz.join(' ')}, whole-tuning reference ${R.f.join(' ')}`); }
      else if(!fin(hz) || !sameHz(hz,R.f,ex)) miss(`${at}: out-of-mode price ${hz}, whole-tuning reference ${R.f}`);
      return null; }
    const hz=evHz(a,ctx,role);
    if(role==='ch'){
      const ref=legacyChordNotesRef(p.deg,p.oct,ctx.sc,ctx.sev,a.ty), X=chordNotesAt(a.ti,a.oct,ctx.sc,ctx.sev,a.ty);
      if(!hz.length || !hz.every(fin)) miss(`${at}: chord price ${JSON.stringify(hz)} is empty or not finite`);
      else if(!sameNotes(X,ref) || hz.some((f,i)=>f!==ref[i].f)) miss(`${at}: chord notes ${X.map(n=>n.f).join(' ')} differ from the frozen reference ${ref.map(n=>n.f).join(' ')} (degree ${p.deg} reg ${p.oct})`);
    }else{
      const ref= role==='ld' ? legacyLeadFreq(p.deg,p.oct,ctx.sc) : legacyBassFreq(p.deg,p.oct,ctx.sc);
      if(!fin(hz)) miss(`${at}: price ${hz} is not a finite positive number`);
      else if(hz!==ref) miss(`${at}: price ${hz} differs from the frozen reference ${ref} (degree ${p.deg} reg ${p.oct})`);
    }
    return p;
  };
  // ---- 1) события ----
  const EV=new Set(events); let nEv=0, nDeg=0;
  for(const e of events){
    const at=`L${e.layer+1} beat ${beat(e.t)} ${e.fn}`;
    if(e.a && 'deg' in e.a){ nDeg++; miss(`${at}: carries a mode degree (${e.a.deg})`); }
    const r=ROLE[e.fn[0]]; if(!r || !/On$|Set$/.test(e.fn) || !e.a) continue;
    nEv++; const a=e.a;
    if(!isInt(a.ti) || !isInt(a.oct)){ miss(`${at}: tuning index ${a.ti} / register ${a.oct} missing or not whole`); continue; }
    if(!e.sc){ miss(`${at}: no frozen view`); continue; }
    const p=priceCheck(`${at} in ${e.sc.id}`,a,e,r);
    const back= r==='ch' ? hlOf(a,e.sc) : evReg(a,e);
    if(!p){ if(modeSlotOfTi(a.ti,a.oct,e.sc)) continue;   // в ладу, но цена не сошлась — уже названо
      if(r==='ch' ? back!==null : !(back && back.deg===undefined)) miss(`${at}: out of its mode, yet the ${r==='ch'?'highlight':'voice register'} gives a place (${back&&back.deg}/${back&&back.oct})`);
      continue; }
    if(!back || tuningIndexOf(back.deg,e.sc,r==='ch')!==a.ti || back.oct!==a.oct) miss(`${at}: ${r==='ch'?'highlight':'voice register'} ${back&&back.deg}/${back&&back.oct} does not convert back to ti ${a.ti} reg ${a.oct}`);
  }
  // ---- 2) сегменты ----
  const S=songSegs(); let nSeg=0;
  for(const g of S.segs){ nSeg++;
    const at=`segment L${g.layer+1} ${g.role} beat ${beat(g.start)}`, a=g.ev&&g.ev.a||{};
    if(g.role!=='ld'&&g.role!=='bs'&&g.role!=='ch') miss(`${at}: role ${g.role}`);
    if('deg' in g) miss(`${at}: carries a degree`);
    if(!isInt(g.ti)||!isInt(g.oct)||g.ti!==a.ti||g.oct!==(a.oct|0)) miss(`${at}: ti/register ${g.ti}/${g.oct}, its event stores ${a.ti}/${a.oct}`);
    if(!EV.has(g.ev)) miss(`${at}: its defining event is not in the song`);
    if(g.endEv && !EV.has(g.endEv)) miss(`${at}: its ending event is not in the song`);
    if(g.sc!==g.ev.sc) miss(`${at}: another view than its event`);
    if(g.start!==g.ev.t) miss(`${at}: starts at ${g.start}, its event at ${g.ev.t}`);
    if(g.end!=null && g.end<g.start) miss(`${at}: ends at ${g.end}, before it starts`);
    if(S.byEv.get(g.ev)!==g) miss(`${at}: the event→segment map does not lead back to it`);
  }
  for(const e of events){ const r=ROLE[e.fn[0]]; if(!r || !/On$|Set$/.test(e.fn)) continue; if(!S.byEv.has(e)) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn}: belongs to no segment`); }
  // ---- 3) догонялка ----
  const X=[...new Set(events.map(e=>e.t))].sort((p,q)=>p-q); let nChase=0;
  for(const x of X) for(const sct of chaseFor(x)){ nChase++;
    const N=chaseNote(sct,x), at=`chase at beat ${beat(x)}: L${sct.on.layer+1} ${sct.role}`;
    if('deg' in N.a) miss(`${at}: the payload carries a degree`);
    if(!EV.has(N.ctx)) miss(`${at}: its context is not an event of the song`);
    if(!isInt(N.a.ti)||!isInt(N.a.oct)){ miss(`${at}: ti/register ${N.a.ti}/${N.a.oct}`); continue; }
    if(sct.role==='ld' && sct.set && sct.set.a.hold && N.a.ti!==sct.on.a.ti) miss(`${at}: a held theremin note took ti ${N.a.ti}, its attack's is ${sct.on.a.ti}`);
    priceCheck(at,N.a,N.ctx,sct.role);
  }
  // ---- 4) редактор: ряд ↔ высота, призрак на своём ряду ----
  const groups=[];
  for(const g of S.segs){ if(g.role!=='ld'&&g.role!=='bs'&&g.role!=='ch') continue;
    let G=groups.find(q=>q.layer===g.layer&&q.role===g.role&&q.sc===g.sc); if(!G){ G={ layer:g.layer, role:g.role, sc:g.sc, segs:[] }; groups.push(G); } G.segs.push(g); }
  let nRow=0;
  for(const G of groups) for(const [vn,all] of VIEWS){
    const ax=RP.axis(G.sc,all); let total=REG_N*ax.rpp;
    if(G.role==='ch'){ RP.reset(); total=RP.total(G,ax,RP.notes,RP.root); }
    RP.reset();
    for(const g of G.segs){ nRow++;
      const at=`L${G.layer+1} ${G.role} [${vn}] segment beat ${beat(g.start)} (ti ${g.ti} reg ${g.oct})`, r=RP.root(g,ax);
      if(!all && !modeSlotOfTi(g.ti,g.oct,g.sc)){   // ⛳ T5: вне лада на оси «Лад» — между соседними ступенями, со знаком «вне ряда»
        const pl=ax.placeTi(g.ti,g.oct), lo=Math.floor(r), hi=Math.ceil(r), pL=ax.pitchOf(lo), pH=ax.pitchOf(hi);
        const f=leadFreqTi(g.ti,g.oct,g.sc), fL=pL&&leadFreqTi(pL.ti,pL.oct,g.sc), fH=pH&&leadFreqTi(pH.ti,pH.oct,g.sc);
        if(!(Number.isFinite(r) && lo!==hi && pl.r===r)) miss(`${at}: an out-of-mode root on the Mode axis at row ${r}, not between two rows`);
        else if(!(fL<f && f<fH)) miss(`${at}: row ${r} lies between rows whose pitches ${fL} / ${fH} do not bracket the note ${f}`);
        if(!(typeof pl.dev==='number' && Number.isFinite(pl.dev) && pl.dev!==0)) miss(`${at}: an out-of-mode note on the Mode axis carries no deviation mark (${pl.dev})`);
        const ns=RP.notes(g,ax,total); if(!ns.length || (g.role!=='ch' && ns[0].dev!==pl.dev)) miss(`${at}: the drawn block does not carry the deviation of its placement`);
        continue; }
      if(!isInt(r)){ miss(`${at}: root row ${r}`); continue; }
      const pit=ax.pitchOf(r);
      if(!pit || pit.ti!==g.ti || pit.oct!==g.oct){ miss(`${at}: row ${r} decodes to ${pit?pit.ti+'/'+pit.oct:'nothing'}`); continue; }
      if(g.role==='ch'){ const A=RP.notes(g,ax,total), B=RP.notes(RP.ghost(g,pit),ax,total);
        if(A.length!==B.length || A.some((n,i)=>n.r!==B[i].r||n.dev!==B[i].dev)) miss(`${at}: the ghost on its own row differs from the block`); }
    }
  }
  RP.reset();
  // ---- 5) распад ----
  let nDiss=0;
  for(const g of S.segs){ if(g.role!=='ch') continue; nDiss++;
    const at=`dissolve of the chord at beat ${beat(g.start)} L${g.layer+1}`, N=segChordNotes(g);
    if(!N.length || !N.every(n=>fin(n.f))){ miss(`${at}: notes ${JSON.stringify(N)}`); continue; }
    N.forEach((n,i)=>{ const one=chordNotesAt(g.ti,g.oct,g.sc,g.sev,[n.iv]);
      if(one.length!==1 || one[0].f!==n.f) miss(`${at} note ${i}: a one-note copy sounds ${one[0]&&one[0].f}, the note ${n.f}`); });
  }
  console.log(`[scaleprobe song] events ${events.length} (pitched ${nEv}, carrying a degree ${nDeg}) · out-of-mode prices ${nOut}${nOutTol?` (${nOutTol} compared in cents, table with a root offset)`:''} · segments ${nSeg} · chased notes ${nChase} at ${X.length} beats · editor segment×view ${nRow} · dissolves ${nDiss} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe song] '+m));
  if(!nBad && nEv) console.log('[scaleprobe song] no event carries a degree; every pitch is in its tuning; every price, segment, chased note, editor row and dissolve is well-formed and matches the frozen references (out-of-mode ones — the whole-tuning reference)');
  else if(!nEv) console.log('[scaleprobe song] the song has no pitched events — run await P.seed({replace:true}) first');
  return { events:nEv, outOfMode:nOut, segments:nSeg, chase:nChase, rows:nRow, dissolves:nDiss, total:nBad, differences:bad };
}

/* ═══ T7b-починка: ТИП АККОРДА — В СБОРКЕ СВОЕГО ВИДА; НИ ОДНОЙ НОТЫ НА 0 Гц ═══
   Вид считает аккорд ЛИБО отношениями (тоны-отношения: центовый лад без сетки, или неоктавный адаптивный — «Свободно» у Болена–Пирса),
   ЛИБО шагами/смещениями (равная ветка, сетка). Тип, записанный в сборке другого вида, звучит неверно: шаговый [0] в виде отношений —
   0 Гц (тишина), отношения в шаговом виде — дробные «шаги». Проверяется:
     1) КАЖДЫЙ вид (каждый режим аккордов) с аккордами: единица корня chordUnit — [1] у вида отношений, [0] у прочих; типы палитры — все
        интервалы > 0 у вида отношений, целые у прочих; на каждом корне (индекс 0..размер строя, регистр 1) ряд корня и каждая нота каждого
        типа — конечны и > 0 Гц;
     2) ПЕСНЯ: у каждого «вкл»/ведения аккорда с типом — тип в сборке ВИДА СОБЫТИЯ (то же правило), и каждая нота цены ENG (evHz) — конечна
        и > 0 Гц (у нетипизированных тоже). */
export function checkTypes(){
  const bad=[]; let nBad=0, cases=0, song=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const ratioView=v=> (!!v.cents && !v.gridChords) || (periodOf(v)!==2 && chordBuildOf(v)==='adaptive');
  const fits=(v,ty)=> ratioView(v) ? ty.every(x=>typeof x==='number' && x>0) : ty.every(Number.isInteger);
  const pos=f=>typeof f==='number' && Number.isFinite(f) && f>0;
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(m=>m.id) : [undefined])){
    const v=scaleView(s0,tf,cm); if(v.noChords || (v.chordRule && v.chordRule.kind==='none')) continue;
    const id=v.id+(v.tunable?'@'+tf:'')+(cm?'#'+cm:''), T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length;
    const u=chordUnit(v); cases++;
    if(JSON.stringify(u)!==JSON.stringify(ratioView(v)?[1]:[0])) miss(`${id}: root unit [${u}] in a ${ratioView(v)?'ratio':'step'}-priced view`);
    const tys=v.typedChords ? chordFams(v).flatMap(f=>f.types.map(x=>x.iv)) : [];
    for(const ty of tys){ cases++; if(!fits(v,ty)) miss(`${id}: palette type [${ty}] is not of the view's build (${ratioView(v)?'ratios':'steps'})`); }
    for(let ti=0; ti<=E; ti++){
      cases++; const rf=chordRowFreqAt(ti,1,v,false); if(!pos(rf)) miss(`${id} root ${ti}: row pitch ${rf}`);
      for(const ty of tys){ cases++; const N=chordNotesAt(ti,1,v,false,ty); if(!N.length || !N.every(n=>pos(n.f))) miss(`${id} root ${ti} [${ty}]: notes ${N.map(n=>n.f)}`); }
    }
  }
  for(const e of events){ if((e.fn!=='chOn'&&e.fn!=='chSet') || !e.a || !e.sc) continue;
    song++; cases++; const at=`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn} in ${viewIdOf(e.sc)}`;
    if(e.a.ty && !fits(e.sc,e.a.ty)) miss(`${at}: type [${e.a.ty}] is not of its view's build (${ratioView(e.sc)?'ratios':'steps'})`);
    const hz=evHz(e.a,e,'ch'); if(!hz.length || !hz.every(pos)) miss(`${at}: notes ${hz}`);
  }
  console.log(`[scaleprobe types] cases ${cases} · song chords ${song} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe types] '+m));
  if(!nBad) console.log('[scaleprobe types] every chord type is of its view\'s build, and no chord note prices at 0 Hz or below');
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ T7b: РЕЖИМЫ АККОРДОВ ═══
   1) «СВОБОДНО» = ДО T7, ПОБИТНО (Партч и Болен–Пирс): набор вида — ровно прежний (PRE_T7_SETS, JSON), у Б–П с тремя аккордами на 11;
      единица корня — прежняя; ворота chordTypeFits открыты на каждом корне; КАЖДАЯ нота каждого прежнего типа на каждом корне (индекс
      0..размер строя) × регистры 0..3 × 12 тоник × три A4 — chordNotesAt === прежней ветке (preT7ChordNotesAt), f и iv; ступенный путь
      chordNotes и частота ряда корня chordRowFreq — так же против preT7ChordNotes.
   2) «КАК НА ИНСТРУМЕНТЕ» = T7: у Б–П набор — CHORD_FAM_SETS.bpsteps (ссылка); у Партча на 1/1 все 24, на 9/8 — 8 типов.
   3) «ПАУЭР-АККОРД» (14 ладов стопки): нетипизированный аккорд (chordNotes и chordNotesAt по индексу) === прежнему пауэр-аккорду
      (legacyChordNotes по tag — тело до «стопки»), подписи chordLabel === legacyChordLabel, по ступеням 0..n, регистрам 0..3, 12 тоникам,
      септаккорд выкл/вкл; «Стопкой» — прежнее правило (вид без поправок).
   4) ВИД: режим — второй ключ памяти (тот же объект на ту же пару), id вида различает режимы, CUR() следует выбору (переставляется и
      возвращается в finally).
   5) ПЕСНЯ: каждый аккорд звучит, как записан, ПРИ ЛЮБОМ положении переключателя — цена каждого события (evHz) до и после того, как
      режим каждого лада переставлен на другой, === (цена читает вид события, не живой выбор); у события лада с режимами вид несёт режим. */
export function checkModes(){
  const bad=[]; let nBad=0, cases=0, song=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const keepT=tonic, keepA=aRef, keepCM=chordModeSel, keepSc=scaleId;
  const json=x=>JSON.stringify(x);
  try{
    // 1) «Свободно» против прежнего кода
    for(const id of ['partch-43','bohlen-pierce']){
      const s0=SCALES.find(x=>x.id===id); if(!s0){ miss(`no mode ${id}`); continue; }
      const v=keyless(scaleView(s0,'T','free')), key=v.typedChords, PRE=PRE_T7_SETS[key];   // TF2: key-less — the loop steps the live tonic
      cases++; if(json(chordFams(v))!==json(PRE)) miss(`${id} Free: the chord set differs from the pre-T7 set '${key}'`);
      cases++; if(json(chordUnit(v))!==json(preT7ChordUnit(v))) miss(`${id} Free: chordUnit ${json(chordUnit(v))}, pre-T7 ${json(preT7ChordUnit(v))}`);
      const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, n=v.iv.length, types=PRE.flatMap(f=>f.types.map(x=>x.iv));
      for(const ty of types) for(let ti=0; ti<=E; ti++){ cases++; if(!chordTypeFits(ty,ti,v)) miss(`${id} Free: type [${ty}] refused on root ${ti}`); }
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const A4 of A4_SET){ setARef(A4);
          for(let o=0;o<4;o++){
            for(const ty of types){
              for(let ti=0; ti<=E; ti++){ cases++;
                const X=chordNotesAt(ti,o,v,false,ty), Y=preT7ChordNotesAt(ti,o,v,ty);
                if(X.length!==Y.length || X.some((x,i)=>x.f!==Y[i].f || x.iv!==Y[i].iv)) miss(`${id} Free tonic ${tn} A4 ${A4} root ${ti} reg ${o} [${ty}]: ${X.map(x=>x.f)} now, ${Y.map(x=>x.f)} pre-T7`); }
              for(let d=0; d<=n; d++){ cases++;
                const X=chordNotes(d,o,v,false,ty), Y=preT7ChordNotes(d,o,v,ty);
                if(X.length!==Y.length || X.some((x,i)=>x.f!==Y[i].f || x.iv!==Y[i].iv)) miss(`${id} Free tonic ${tn} A4 ${A4} degree ${d} reg ${o} [${ty}] (degree path): ${X.map(x=>x.f)} now, ${Y.map(x=>x.f)} pre-T7`); }
            }
            for(let d=0; d<=n; d++){ cases++; const a=chordRowFreq(d,o,v,false), b=preT7ChordNotes(d,o,v,preT7ChordUnit(v))[0].f;
              if(a!==b) miss(`${id} Free tonic ${tn} A4 ${A4} row ${d} reg ${o}: row pitch ${a}, pre-T7 ${b}`); }
          }
        }
      }
    }
    setTonic(keepT); setARef(keepA);
    // 2) «Как на инструменте» = T7
    { const bp=SCALES.find(x=>x.id==='bohlen-pierce'), vi=scaleView(bp,'T','instrument');
      cases++; if(chordFams(vi)!==CHORD_FAM_SETS.bpsteps) miss('bohlen-pierce As on the instrument: the chord set is not bpsteps');
      const pa=SCALES.find(x=>x.id==='partch-43'), vp=scaleView(pa,'T','instrument'), all=chordFams(vp).flatMap(f=>f.types);
      const nOn=ti=>all.filter(x=>chordTypeFits(x.iv,ti,vp)).length;
      cases+=2; if(nOn(0)!==24) miss(`partch As on the instrument: ${nOn(0)} types on 1/1, 24 expected`); if(nOn(8)!==8) miss(`partch As on the instrument: ${nOn(8)} types on 9/8, 8 expected`); }
    // 3) пауэр-аккорд у ладов стопки
    for(const s0 of SCALES){ if(!s0.chordModes || !s0.chordModes.some(x=>x.id==='power')) continue;
      const vp=keyless(scaleView(s0,'T','power')), vs=scaleView(s0,'T','stack'), n=vp.iv.length;
      cases+=2; if(vp.chordRule.kind!=='power') miss(`${s0.id} power: rule ${vp.chordRule.kind}`); if(vs.chordRule!==s0.chordRule) miss(`${s0.id} stack: the view carries another rule`);
      for(let tn=0;tn<12;tn++){ setTonic(tn);
        for(const sev of [false,true]) for(let o=0;o<4;o++) for(let d=0; d<=n; d++){
          const ref=legacyChordNotes(d,o,vp,sev,null), X=chordNotes(d,o,vp,sev,null), Y= d<n ? chordNotesAt(tuningIndexOf(d,vp,true),o,vp,sev,null) : ref;   // по индексу — корни 0..n−1 (дубль тоники по индексу — корень регистра выше: другая, но равная высота; её сверяют T6b)
          cases+=2;
          if(X.length!==ref.length || X.some((x,i)=>x.f!==ref[i].f || x.iv!==ref[i].iv)) miss(`${s0.id} power tonic ${tn} degree ${d} reg ${o}${sev?' 7th':''}: ${X.map(x=>x.f)}, old power chord ${ref.map(x=>x.f)}`);
          if(Y.length!==ref.length || Y.some((x,i)=>x.f!==ref[i].f)) miss(`${s0.id} power (by index) tonic ${tn} degree ${d} reg ${o}${sev?' 7th':''}: ${Y.map(x=>x.f)}, old ${ref.map(x=>x.f)}`);
          if(o===0){ cases++; const a=chordLabel(d,vp,sev), b=legacyChordLabel(d,vp,sev); if(a!==b) miss(`${s0.id} power tonic ${tn} degree ${d}${sev?' 7th':''}: label "${a}", old "${b}"`); }
        }
      }
    }
    setTonic(keepT);
    // 4) вид
    for(const s0 of SCALES){ if(!s0.chordModes) continue;
      const ids=new Set();
      for(const m of s0.chordModes){ cases+=2; const a=scaleView(s0,'T',m.id), b=scaleView(s0,'T',m.id);
        if(a!==b) miss(`${s0.id} ${m.id}: two view objects for one mode`); if(a.chordMode!==m.id) miss(`${s0.id} ${m.id}: the view carries mode ${a.chordMode}`);
        ids.add(viewIdOf(a)); }
      cases++; if(ids.size!==s0.chordModes.length) miss(`${s0.id}: view ids do not tell the chord modes apart`);
    }
    { const s0=SCALES.find(x=>x.id==='partch-43'); setScaleId(s0.id);
      for(const m of s0.chordModes){ cases++; setChordMode(s0.id,m.id); if(CUR()!==scaleView(s0,tunedFrom,m.id)) miss(`CUR() does not follow the chord mode ${m.id}`); }
      setChordModeSel(keepCM); setScaleId(keepSc); }
    // 5) песня
    const chords=events.filter(e=>(e.fn==='chOn'||e.fn==='chSet') && e.a && e.sc);
    const before=chords.map(e=>evHz(e.a,e,'ch'));
    const flip={}; for(const s0 of SCALES) if(s0.chordModes){ const cur=chordModeOf(s0), other=s0.chordModes.find(x=>x.id!==cur); flip[s0.id]=other.id; }
    setChordModeSel(flip);
    chords.forEach((e,i)=>{ song++; cases++; const h=evHz(e.a,e,'ch'), b=before[i];
      if(h.length!==b.length || h.some((f,j)=>f!==b[j])) miss(`L${e.layer+1} beat ${Math.round(e.t*1000)/1000} ${e.fn}: sounds ${h} after the switch, ${b} as recorded`);
      const m=e.sc.mode||e.sc; if(m.chordModes && !e.sc.chordMode) miss(`L${e.layer+1} beat ${e.t}: the event's view carries no chord mode`); });
  } finally { setTonic(keepT); setARef(keepA); setChordModeSel(keepCM); setScaleId(keepSc); }
  console.log(`[scaleprobe T7b] cases ${cases} (Free vs pre-T7 code, As on the instrument = T7, power = the old power chord, views, song chords ${song}) · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T7b] '+m));
  if(!nBad) console.log('[scaleprobe T7b] Free is bit-identical to the pre-T7 code (sets, every note, rows); As on the instrument is T7; power is the old power chord; every recorded chord sounds as recorded whatever the switch says');
  return { cases, song, total:nBad, differences:bad };
}

/* ═══ T7: АККОРДЫ В СВОЁМ СТРОЕ — ПРОГОН (без песни) ═══
   1) КАЖДЫЙ вид с типизированными аккордами × каждый корень лада (регистр 1) × каждый тип набора: тип, ПРЕДЛАГАЕМЫЙ на этом корне
      (scales.chordTypeFits — ворота палитры, жеста и правки), звучит ТОЛЬКО высотами строя: каждый тон цены (chordNotesAt — ей играет ENG)
      в пределах 1¢ (порог «на ряду» редактора) от высоты строя в регистре аккордов (scales.chordPitchHz) — кроме АДАПТИВНОГО строя
      (подвижный Натуральный: высоты хора сдвигаются намеренно; его тоны вне строя считаются и печатаются, не ошибка).
   2) ПАРТЧ: проверка по ЦЕНТАМ, независимая от точных дробей ворот: предложенный тип — каждый тон в 0.02¢ от одной из 43 высот (центы
      таблицы округлены до сотых: корень и тон — по 0.005¢, вместе до 0.010¢; отказанные — от 3.2¢); НЕ предложенный — хотя бы один тон дальше 1¢ от любой (ворота не отсекают чистый аккорд); на 1/1 —
      вся палитра (24 типа). Печатается, сколько типов на каждом корне.
   (T7b: каждый вид — в КАЖДОМ своём режиме аккордов; «Свободно» адаптивен — его тоны мимо строя только считаются.)
   3) БОЛЕН–ПИРС («Как на инструменте»): каждый тип — целые шаги (ни одного отношения), ни одного аккорда с 11; на каждом корне 0..13 и регистрах 0..2 каждая
      нота РАВНА (===) высоте строя pitchHz(bp13, baseF()/2, 0, корень+шаг, регистр) — тону строя, а не отношению.
   Тоника и A4 — живые (цена от них зависит одинаково с обеих сторон). Ничего не меняет. */
export function checkPure(){
  const bad=[]; let nBad=0, cases=0, adaptOff=0, unfit=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const seen=new Set(), perRoot=[];
  for(const [s0,tf] of allViews()) for(const cm of (s0.chordModes ? s0.chordModes.map(x=>x.id) : [undefined])){   // T7b: каждый режим аккордов
    const v=scaleView(s0,tf,cm); if(!v.typedChords || !v.sel) continue;
    const T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length, pc=1200*Math.log2(periodOf(v)), id=v.id+(v.tunable?'@'+tf:'')+(cm?'#'+cm:'');
    const P0=chordPitchHz(0,0,v), ref=[]; for(let j=0;j<E;j++) ref.push(((1200*Math.log2(chordPitchHz(j,0,v)/P0))%pc+pc)%pc);
    const dist=f=>{ const c=((1200*Math.log2(f/P0))%pc+pc)%pc; let d=Infinity; for(const r of ref){ const x=Math.abs(c-r); d=Math.min(d,x,pc-x); } return d; };
    const adaptive=chordBuildOf(v)==='adaptive', partch=v.tuning==='partch43' && !adaptive;   // T7b: правила Партча — в режиме «Как на инструменте»; «Свободно» — адаптивный (тоны мимо строя считаются)
    for(let d=0; d<v.iv.length; d++){
      const ti=tuningIndexOf(d,v,true); let nFit=0;
      for(const fam of chordFams(v)) for(const tp of fam.types){
        cases++; const fit=chordTypeFits(tp.iv,ti,v), N=chordNotesAt(ti,1,v,false,tp.iv), lb=`${id} root ${d} type ${L(tp.label)}`;
        if(!N.length){ miss(`${lb}: no notes`); continue; }
        const far=N.map(n=>dist(n.f)), worst=Math.max(...far);
        if(fit){ nFit++;
          if(adaptive){ if(worst>=1) adaptOff++; }
          else if(worst>=(partch?0.02:1)) miss(`${lb}: offered, yet a tone lies ${worst.toFixed(4)}¢ from the tuning`);
        }else{ unfit++;
          if(!partch) miss(`${lb}: refused on a tuning whose chords are built from the tuning by construction`);
          else if(worst<1) miss(`${lb}: refused, yet every tone is within 1¢ of the 43 pitches (${worst.toFixed(4)}¢)`);
        }
      }
      if(partch && !seen.has(d)){ seen.add(d); perRoot.push({ root:d, offered:nFit }); }
      if(partch && d===0 && nFit!==24) miss(`${id}: on 1/1 only ${nFit} of 24 types are offered`);
    }
  }
  // ---- Болен–Пирс
  const bp=SCALES.find(x=>x.tuning==='bp13'), vb=bp&&scaleView(bp,'T','instrument');   // T7b: шаги строя — режим «Как на инструменте»
  if(!vb) miss('no Bohlen–Pierce mode');
  else{ const T=TUNINGS.bp13;
    for(const fam of chordFams(vb)) for(const tp of fam.types){
      const lb=`bohlen-pierce type ${L(tp.label)}`;
      cases++; if(!tp.iv.every(Number.isInteger)) miss(`${lb}: ${tp.iv} is not a set of whole steps`);
      if(/(^|[:/])11([:/]|$)/.test(L(tp.label))) miss(`${lb}: a chord with 11 is still offered`);
      for(let ti=0; ti<=13; ti++) for(let o=0;o<3;o++){ cases++;
        const N=chordNotesAt(ti,o,vb,false,tp.iv);
        N.forEach((n,i)=>{ const w=pitchHz(T,baseF()/2,0,ti+tp.iv[i],o); if(n.f!==w) miss(`${lb} root ${ti} reg ${o} note ${i}: ${n.f}, the tuning pitch is ${w}`); });
      }
    }
  }
  console.log(`[scaleprobe T7] cases ${cases} · refused on a Partch root ${unfit} · adaptive Natural chords with a tone off the tuning ${adaptOff} (a choir's shifted pitch, not an error) · differences ${nBad}`);
  if(perRoot.length) console.log('[scaleprobe T7] Partch — types offered per root (of 24): '+perRoot.map(x=>`${x.root}:${x.offered}`).join(' '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T7] '+m));
  if(!nBad) console.log('[scaleprobe T7] every chord offered sounds only pitches of its tuning (adaptive Natural excepted, by design); Partch offers only its 43 pitches; Bohlen–Pierce chords are its own steps, no 11');
  return { cases, unfit, adaptOff, perRoot, total:nBad, differences:bad };
}

/* ═══ T5: ВЫСОТЫ ВНЕ ЛАДА — ПРОГОН (без песни) ═══
   Каждый вид с приглушёнными рядами (выборка лада меньше строя; фиксированных среди них нет) × каждая высота строя ВНЕ лада внутри
   периода × регистры 0..3:
     1) ЦЕНА соло и баса (leadFreqTi/bassFreqTi — ими играет ENG) против опоры по целому строю (wholeOf);
     2) РЯДЫ: у оси «Все» — целый ряд, и pitchOf отдаёт ту же пару (так её запишет перенос); у оси «Лад» — дробный ряд строго между двумя
        ступенями, по высоте между ними, с отступлением (placeTi — его рисует редактор); подсветки нет (modeSlotOfTi — null);
     3) у видов, чьё правило строит аккорды: ОДНОНОТНЫЙ аккорд (chordUnit — так ложится перенесённая нота аккорда) против опоры; и
        ВАРИАНТ (а) — каждая ступень 0..n−1 × септаккорд выкл/вкл: recorder.chordMoveTy даёт тип (массив) для высоты вне лада и НЕ даёт его
        для своего же яркого корня; с этим типом аккорд на СВОЁМ корне звучит РОВНО как нетипизированный (=== — форма сохранена, «перенёс
        и вернул — тот же звук»), а на корне вне лада — равен опоре по целому строю (та же форма, перенесённая).
   Точно (===), кроме таблицы с корнем ≠ 0 (Баранг) — там в центах, 1e-6 (см. wholeOf) и считается отдельно. Ничего не меняет. */
export function checkOut(){
  const bad=[]; let nBad=0, cases=0, tol=0, nViews=0;
  const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const CH=new Set(['tertian','stack','power','ratios']);
  for(const [s0,tf] of allViews()){
    const v=scaleView(s0,tf), T=TUNINGS[v.tuning], E=T.equal!=null?T.equal:T.cents.length;
    if(!v.sel || v.sel.length>=E) continue;
    nViews++; const id=v.id+(v.tunable?'@'+tf:''), W=wholeOf(v), ex=wholeExact(v), axA=RP.axis(v,true), axM=RP.axis(v,false), n=v.iv.length;
    if(!W){ miss(`${id}: no whole-tuning reference`); continue; }
    const k=v.chordRule&&v.chordRule.kind, chords=CH.has(k) && T.equal!=null;
    for(let o=0;o<4;o++) for(let j=1;j<E;j++){
      const ti=v.root+j; if(modeSlotOfTi(ti,o,v)) continue;
      const at=`${id} pitch +${j} reg ${o}`; if(!ex) tol++;
      cases++; { const [jj,R]=wholeSplit(ti,o,v), a=leadFreqTi(ti,o,v), b=legacyLeadFreq(jj,R,W); if(!sameHz(a,b,ex)) miss(`${at}: solo ${a}, whole-tuning reference ${b}`); }
      cases++; { const [jj,R]=wholeSplit(ti,o,v), a=bassFreqTi(ti,o,v), b=legacyBassFreq(jj,R,W); if(!sameHz(a,b,ex)) miss(`${at}: bass ${a}, whole-tuning reference ${b}`); }
      cases++; { const r=axA.rowOfTi(ti,o), p=Number.isInteger(r)&&axA.pitchOf(r); if(!p||p.ti!==ti||p.oct!==o) miss(`${at}: All axis row ${r} decodes to ${p?p.ti+'/'+p.oct:'nothing'}`); }
      cases++; { const pl=axM.placeTi(ti,o), lo=Math.floor(pl.r), hi=Math.ceil(pl.r), pL=axM.pitchOf(lo), pH=axM.pitchOf(hi), f=leadFreqTi(ti,o,v);
        if(!(Number.isFinite(pl.r)&&lo!==hi&&pL&&pH)) miss(`${at}: Mode axis place ${pl.r}, not between two rows`);
        else if(!(leadFreqTi(pL.ti,pL.oct,v)<f && f<leadFreqTi(pH.ti,pH.oct,v))) miss(`${at}: Mode axis row ${pl.r} is not between the pitches around it`);
        if(!(typeof pl.dev==='number'&&Number.isFinite(pl.dev)&&pl.dev!==0)) miss(`${at}: no deviation mark (${pl.dev})`); }
      if(!chords) continue;
      cases++; { const u=chordUnit(v), A=chordNotesAt(ti,o,v,false,u), B=legacyChordNotesRef(ti-v.root,o,W,false,u);
        if(A.length!==1||B.length!==1||A[0].f!==B[0].f) miss(`${at}: one-note chord ${A.map(x=>x.f)}, whole-tuning reference ${B.map(x=>x.f)}`); }
      for(const sev of [false,true]) for(let d=0;d<n;d++){
        const seg={ role:'ch', ty:null, sc:v, sev, ti:tuningIndexOf(d,v,true), oct:o }, tt=`${at} option (a) from degree ${d}${sev?' 7th':''}`;
        cases++; const ty=chordMoveTy(seg,ti,o);
        if(!Array.isArray(ty)){ miss(`${tt}: no shape (${ty})`); continue; }
        if(chordMoveTy(seg,seg.ti,o)!==undefined) miss(`${tt}: a shape is written for its own bright root`);
        const U=chordNotesAt(seg.ti,o,v,sev,null), K=chordNotesAt(seg.ti,o,v,sev,ty);
        if(U.length!==K.length || U.some((x,i)=>x.f!==K[i].f)) miss(`${tt}: typed on its own root ${K.map(x=>x.f)}, untyped ${U.map(x=>x.f)} — the shape changed`);
        const M=chordNotesAt(ti,o,v,sev,ty), B=legacyChordNotesRef(ti-v.root,o,W,sev,ty);
        if(M.length!==B.length || M.some((x,i)=>x.f!==B[i].f)) miss(`${tt}: on the dimmed root ${M.map(x=>x.f)}, whole-tuning reference ${B.map(x=>x.f)}`);
      }
    }
  }
  RP.reset();
  console.log(`[scaleprobe T5] views with pitches outside the mode ${nViews} · cases ${cases}${tol?` (${tol} pitches compared in cents — table with a root offset)`:''} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe T5] '+m));
  if(nBad>PRINT_MAX) console.warn(`[scaleprobe T5] …and ${nBad-PRINT_MAX} more`);
  if(!nBad) console.log('[scaleprobe T5] every pitch outside the mode prices as its tuning pitch, sits on its row (All) or between its neighbours (Mode), and a whole chord moved there keeps its shape');
  return { views:nViews, cases, tol, total:nBad, differences:bad };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:30, name:'T4b1 sound (sweep)', run:()=>checkSound(), read:r=>({ cases:r.sweep.cases, diff:r.sweep.total, list:r.sweep.mismatches }), slow:true });
row({ at:40, name:'T4b3 editor rows (sweep)', run:()=>checkRows(), read:r=>({ cases:r.rows+r.chords, diff:r.total, list:r.differences }), slow:true });
row({ at:50, name:'T4b4-1 row fixes', run:()=>checkRowFix(), read:r=>({ cases:r.defaults+r.cache, diff:r.total, list:r.differences }) });
row({ at:60, name:'T4b4 highlights (sweep)', run:()=>checkHl(), read:r=>({ cases:r.sweep+r.outOfMode, diff:r.total, list:r.differences }), slow:true });
row({ at:70, name:'T4c-2 song integrity', run:()=>checkSong(), read:r=>({ cases:r.events+r.segments+r.chase+r.rows+r.dissolves, song:r.events, diff:r.total, list:r.differences }), song:true });   // T5: «в строе», вне лада — опора по целому строю
row({ at:80, name:'T5 out-of-mode pitches (sweep)', run:()=>checkOut(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true });
row({ at:110, name:'T6c chord labels', run:()=>checkLabels(), read:r=>({ cases:r.cases, diff:r.total, list:r.mismatches }) });
row({ at:120, name:'T6a chord rules', run:()=>checkRules(), read:r=>({ cases:r.views+r.steps+r.untyped, song:r.untyped, diff:r.differences.length, list:r.differences }), song:true });
row({ at:130, name:'T6a-2 scroll', run:()=>checkScroll(), read:r=>({ cases:r.toggles, diff:r.total, list:r.differences }) });
row({ at:140, name:'T7 chords in their tuning', run:()=>checkPure(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:150, name:'chord types of their view\'s build', run:()=>checkTypes(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:160, name:'T7b chord modes', run:()=>checkModes(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:600, name:'tracks: one view', run:()=>tracks(), read:r=>{ const m=r.filter(x=>x.view.includes(' + ')); return { cases:r.length, song:r.length, diff:m.length, list:m.map(x=>`${x.track} holds ${x.view}`) }; }, song:true });
