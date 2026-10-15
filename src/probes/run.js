/* PROBE1: P.all / P.quick / P.orderCheck — runs every registered row (probes/rows.js) in order, with the state guard between rows. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { masterLevel, fxSnapshot } from '../audio.js';
import { TUNINGS } from '../probedata.js';
import { events, laneLevelOf, lanePanOf, laneMuted, laneSoloed, laneOrder, laneNameOf, editIsOpen, loop, recording, histReset } from '../recorder.js';
import { viewIdOf, modeSlotOfTi } from '../scales.js';
import { arrOpen, arrFace, rollOpen, fxChains, chainOwners, fx as liveFx, leadIdx, chIdx, bassIdx, drumKitIdx, voiceMode, scaleId, tunedFrom, chordModeSel, seventh, tonic, aRef, setChordModeSel } from '../state.js';
import { frameStalls, MEAS, measReset, setQuick } from './kit.js';
import { rows as rowList, rowProblems, rowCheck } from './rows.js';
import { SEED_REC, SEED_FROZEN_EXPECT, seedFrozenSamples } from './seed.js';
import { checkPan } from './window.js';

/* ═══ МАТЕРИАЛ ПЕСНИ — ДОСТАТОЧНО ЛИ ЕГО, ЧТОБЫ ПЕСЕННЫЕ ПРОВЕРКИ ЧТО-ТО ДОКАЗЫВАЛИ ═══
   Дважды проба «прошла» на пустой песне: ноль расхождений из нуля случаев. Здесь — перечень того, без чего песенная часть проб
   ничего не проверяет: четыре роли; строи трёх семейств (равный, таблица, фиксированный ключ) и не меньше двух видов; аккорды трёх
   видов (стопка без типа по правилу лада, пауэр-аккорд, типизированный); удержанная нота терменвокса (бенд — путь догонялки, T4b2);
   распавшийся аккорд (однонотный тип — U2/U3/U4); подложка (ev.jam). → { ok, missing:[строки], counts } */
export function material(){
  const c={ ld:0, bs:0, ch:0, dr:0, equal:0, table:0, fixedKey:0, theremin:0, dissolved:0, backing:0, tertian:0, stack:0, typed:0, outOfMode:0 }, views=new Set();   // outOfMode (T5) — сведение, НЕ требование: демо-пьеса вне лада не играет, а прогон checkOut от песни не зависит
  for(const e of events){
    const a=e.a||{}, fn=e.fn;
    if(e.jam) c.backing++;
    const r= fn==='drum' ? 'dr' : fn.startsWith('lead') ? 'ld' : fn.startsWith('bass') ? 'bs' : fn.startsWith('ch') ? 'ch' : null;
    if(r) c[r]++;
    if(!r || r==='dr' || !e.sc) continue;
    views.add(viewIdOf(e.sc));
    if(TUNINGS[e.sc.tuning].equal!=null) c.equal++; else c.table++;
    if(e.sc.fixedKey) c.fixedKey++;
    if(/On$|Set$/.test(fn) && typeof a.ti==='number' && !modeSlotOfTi(a.ti,a.oct,e.sc)) c.outOfMode++;
    if(fn==='leadOn' && a.bend && a.bend.length) c.theremin++;
    if(fn==='chOn'){
      if(Array.isArray(a.ty) && a.ty.length===1) c.dissolved++;
      else if(a.ty) c.typed++;
      else { const k=e.sc.chordRule&&e.sc.chordRule.kind; if(k==='stack') c.stack++; else if(k==='tertian') c.tertian++; }
    }
  }
  c.views=views.size;
  const NEED=[['ld','a solo note'],['bs','a bass note'],['ch','a chord'],['dr','a drum hit'],['equal','an equal-tuning scale'],['table','a table tuning (raga, Partch, a temperament)'],
              ['fixedKey','a fixed-key scale (a historical temperament)'],['tertian','an untyped tertian chord'],['stack','a stacked chord (pentatonic: every other mode degree)'],['typed','a typed chord (palette)'],
              ['theremin','a held theremin note with a bend'],['dissolved','a dissolved chord (one-note type)'],['backing','a backing']];
  const missing=NEED.filter(([k])=>!c[k]).map(([,w])=>w);
  if(c.views<2) missing.push('a second tuning view');
  return { ok:!missing.length, missing, counts:c };
}
const HIDDEN='not checked: tab hidden';
/* PROBE1: the registry's own problems (duplicate names, two rows on one place, bad shapes) count as differences; CONTROL: a list with a
   duplicate name must be caught by the same check, else the check could not fail. */
function registryProblems(){
  const out=rowProblems();
  const ctl=rowCheck([{ at:1, name:'x', run:()=>0, read:()=>0 },{ at:2, name:'x', run:()=>0, read:()=>0 }]);
  if(!ctl.some(m=>/two rows named/.test(m))) out.push('CONTROL: a duplicate row name was not caught — the registry check cannot fail');
  return out;
}
/* ⛳ СТРАЖ СОСТОЯНИЯ МЕЖДУ СТРОКАМИ P.all (после MX2: проба, оставившая след, роняет ЧУЖУЮ строку — и виноватую не видно). Снимок до и после
   КАЖДОЙ строки: уровень, панорама, M и S каждой дорожки; уровень мастера; окно аранжировки, его лицо, редактор; переключатели КОПИИ
   ДВИЖКА рендера (render.copyState — уровень и панорама по ключу, раскладчик, семя, отладка, ключ удара, величины соло-ноты). Строка, после
   которой снимок иной, получает расхождение «state guard: left changed …» с полем и значениями до/после. Вызывайте как прежде: await P.all(). */
/* Part 0 (ED3): a fingerprint of the song's events in array order — beat, layer, kind, take, payload, view. A row that leaves an event
   changed (a mark, a payload, the order at one beat) is named by the guard right after it, not by a later row it happens to break. */
export function songPrint(){
  let h=0x811c9dc5;
  const mix=str=>{ for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193); } };
  for(const e of events) mix(`${e.t}|${e.layer}|${e.fn}|${e.tk}|${e.jam?1:0}|${e.sc?viewIdOf(e.sc):''}|${e.sev?1:0}|${JSON.stringify(e.a)}
`);
  return `${events.length} events #${(h>>>0).toString(16)}`;
}
async function stateSig(R){
  const Ls=[...new Set(events.map(e=>e.layer))].sort((a,b)=>a-b);
  let copy='—'; try{ if(R) copy=JSON.stringify(await R.copyState()); }catch(e){ copy='copy state unreadable: '+(e&&e.message); }
  return { 'track level/pan/mute/solo': Ls.map(ly=>`L${ly+1}:${laneLevelOf(ly)}/${lanePanOf(ly)}/${laneMuted(ly)?'M':'-'}${laneSoloed(ly)?'S':'-'}`).join(' '),
           'master level': String(masterLevel()),
           'track names and order (AR2)': laneOrder().map(ly=>`L${ly+1}${laneNameOf(ly)!=null?'='+laneNameOf(ly):''}`).join(' '),
           'windows (arrangement/face/editor)': [arrOpen, arrFace, rollOpen, editIsOpen()].join(','),
           'render engine copy': copy,
           /* ⛳ ЖИВОЕ СОСТОЯНИЕ ЗВУКА, КОТОРОЕ ЧИТАЕТ РЕНДЕР ИЛИ ПЕРЕИГРОВКА (после MX2): цепи всех владельцев (состав и адреса), их прицепочные
              величины (fxSnapshot — только чтение), старые скаляры соло, живые тембры и режимы голоса, вид строя (лад, «строй от», режим
              аккордов, септаккорд), тоника, A4, темп, размер, транспорт. Величины сетевых параметров живых экземпляров (реверб, делей) сюда не
              входят — их меняет только рука эффектов и переигровка, а читать их без постройки экземпляра нечем. */
           'live effect chains': JSON.stringify(fxChains)+' '+chainOwners().map(o=>JSON.stringify(fxSnapshot(o.key))).join(' ')+' scalars '+JSON.stringify(liveFx),
           'live timbres and voice modes': [leadIdx,chIdx,bassIdx,drumKitIdx].join(',')+' '+JSON.stringify(voiceMode),
           'tuning view': [scaleId,tunedFrom,JSON.stringify(chordModeSel),seventh].join(','),
           'tonic / A4 / tempo / metre': [tonic,aRef,loop.bpm,loop.metre].join(','),
           'transport': [loop.on,recording].join(','),
           'song events': songPrint() };
}
/* ═══ P.all — ВСЕ ПРОБЫ ОДНОЙ КОМАНДОЙ ═══
   Каждая проба по порядку; её подробный вывод ПРИГЛУШЁН (console.log/warn/table/info на время прогона — ⚠️ одноразовые предупреждения
   приложения, попавшие в это время, тоже не напечатаются), если не P.all({verbose:true}). Итог — ОДНА таблица: проба, случаи, материал песни
   (сколько песенных единиц она прошла), расхождения, время; под таблицей — первые расхождения каждой ненулевой строки. Песенные строки не
   засчитываются, если песне не хватает материала (material) — тогда вердикт «song: not enough material» и перечень недостающего. */
export async function all(opt={}){   // F0: async — строка снимка читает tools/scales.before.json (fetch); звать await P.all()
  const keep={ log:console.log, warn:console.warn, table:console.table, info:console.info }, mute=()=>{};
  const T00=performance.now(), title=opt.quick?'P.quick':'P.all';
  const rows=[], lists=[], keepCM=chordModeSel, measures={};
  let RR=null; try{ RR=await import('../render.js'); }catch(e){ RR=null; }   // страж читает копию движка рендера
  let nGuard=0; const stall0=frameStalls;
  setChordModeSel({});   // T7b: прогоны строят виды с ЖИВЫМ выбором режима аккордов — гоняем на умолчаниях, выбор человека возвращаем ниже
  setQuick(opt.quick);
  const RUN=rowList({ quick:!!opt.quick }), nRun=RUN.length, regBad=registryProblems();   // PROBE1: rows from the registry, in «at» order
  try{
  for(const { name, run, read, drawn } of RUN){
    histReset();   // ED7: every row starts with an empty history (probes write the song directly; the tripwire would refuse a stale step)
    const g0=await stateSig(RR), st0=frameStalls;
    const t0=performance.now(); let row; measReset();
    if(!opt.verbose){ console.log=console.warn=console.table=console.info=mute; }
    try{ let res=run(); if(res && typeof res.then==='function') res=await res;   // F0: проба может быть асинхронной (P.checkFiles)
         const x=read(res); row={ check:name, cases:x.cases, song:x.song==null?'—':x.song, differences:x.diff, note:x.status }; if(x.diff) lists.push([name,x.list||[]]); }
    catch(err){ row={ check:name, cases:'—', song:'—', differences:'ERROR' }; lists.push([name,[String(err&&err.stack||err)]]); }
    finally{ Object.assign(console,keep); }
    row.ms=Math.round(performance.now()-t0);
    if(MEAS.length) measures[name]=MEAS; measReset();
    if(drawn && frameStalls>st0) row.hidden=true;   // кадры не пришли — окно не рисовалось, снимок мог быть старым
    { const g1=await stateSig(RR), ch=Object.keys(g0).filter(k=>g0[k]!==g1[k]);
      if(ch.length){ nGuard++; if(typeof row.differences==='number') row.differences+=ch.length;
        lists.push([name+' — state guard', ch.map(k=>`state guard: left changed — ${k}: ${g0[k]} → ${g1[k]}`)]); } }
    rows.push(row);
    /* ⛳ ХОД ПРОГОНА (раннер tools/probe-browser.mjs): строка на каждую пробу сразу по её завершении — мимо приглушения (keep.log) */
    if(opt.progress) keep.log(`[scaleprobe row] ${rows.length}/${nRun} ${name} · cases ${row.cases} · differences ${row.differences} · ${row.ms} ms`);
  }
  } finally { setChordModeSel(keepCM); setQuick(false); }
  const M=material();
  for(const r of rows) if(r.song!=='—') r.status = !M.ok ? 'song: not enough material' : r.differences===0 ? 'pass' : 'FAIL';
                         else r.status = r.differences===0 ? (r.note||'pass') : 'FAIL';   // F0: «снимка ещё нет» — не провал, но и не pass
  for(const r of rows) if(r.hidden) r.status=HIDDEN;   // ⛳ вкладка скрыта: не FAIL и не pass
  const nHidden=rows.filter(r=>r.hidden).length;
  for(const r of rows){ delete r.note; delete r.hidden; }
  console.table(rows);
  if(SEED_REC && SEED_REC.kind==='song') console.log(`[scaleprobe all] frozen seed bass: not applicable — the loaded song is P.song('${SEED_REC.name}')`);
  else { const F=SEED_REC&&SEED_REC.freeze, E=SEED_FROZEN_EXPECT;
    console.log(F ?`[scaleprobe all] frozen seed bass L${F.layer+1}: peak ${F.peak} (expected ${E.peak}), rms ${F.rms} (expected ${E.rms}), buffer ${F.samples} samples (expected ${seedFrozenSamples(F)} at ${F.rate||48000} Hz)`
                  : '[scaleprobe all] frozen seed bass: none in this session (run await P.seed({replace:true}))'); }
  for(const [name,list] of lists){ console.warn(`[scaleprobe all] ${name}: first differences`); list.slice(0,opt.show||5).forEach(m=>console.warn('   '+m)); }
  if(regBad.length){ console.warn(`[scaleprobe all] probe rows registry: ${regBad.length} problem(s)`); regBad.slice(0,opt.show||5).forEach(m=>console.warn('   '+m)); }
  const nDiff=regBad.length+rows.reduce((n,r)=>n+(r.status===HIDDEN?0:typeof r.differences==='number'?r.differences:1),0), noSnap=rows.some(r=>r.status==='no snapshot yet');
  if(!M.ok) console.warn(`[scaleprobe all] song: not enough material — missing ${M.missing.join('; ')} (run await P.seed({replace:true}) for a complete test song)`);
  if(noSnap) console.log('[scaleprobe all] scale-data snapshot: no tools/scales.before.json yet — P.dumpScales() makes it (F0 «tunings as files»)');
  console.log(nGuard ? `[scaleprobe all] state guard: ${nGuard} row(s) left the mixer, the windows, the live sound state or the render engine copy changed (see the lists above)`
                     : '[scaleprobe all] state guard: no row left the mixer, the windows, the live sound state, the song events or the render engine copy changed');
  if(frameStalls>stall0) console.warn(`[scaleprobe all] ${frameStalls-stall0} animation frame(s) never came (tab hidden?) — ${nHidden} row(s) that read the drawn window are marked «${HIDDEN}»; rerun with the tab visible`);
  const pass=nDiff===0&&M.ok&&!nHidden, sec=((performance.now()-T00)/1000).toFixed(1);
  console.log(`[scaleprobe all] ${title}: ${pass ? 'PASS' : 'NOT A PASS'} — ${rows.length} checks, ${nDiff} differences${nHidden?`, ${nHidden} not checked (tab hidden — rerun with the tab visible)`:''}, song material ${M.ok?'complete':'incomplete'} (${events.length} events, ${M.counts.views} tuning views) · ${sec} s`);
  return { pass, rows, material:M, hidden:nHidden, seconds:+sec, measures };
}

/* ═══ P.quick — БЫСТРЫЙ БАРЬЕР (слайс «быстрые пробы») ═══ Те же строки, что P.all, без медленных строк (флаг slow в реестре; прогоны данных по всем видам — их
   держит node, tools/probe-data.mjs, — оси редактора по всем видам и прокрутка всех дорожек кадрами); рендерящие строки и так короткие
   (PROBE_SHORT). Цель — меньше 30 с на настольном; время печатается в итоге. P.all() остаётся полным барьером. */
export function quick(opt={}){ return all({...opt, quick:true}); }
/* ═══ P.orderCheck — ПОРЯДОК НЕ ВЛИЯЕТ (после MX2) ═══ На посеянной песне: P.checkPan отдельно, затем P.all, затем P.all ЕЩЁ РАЗ — все три
   обязаны пройти (строка MX2 идёт в P.all ПОСЛЕ S4, второй прогон ставит S4 после неё). Посев — до: await P.seed({replace:true}).
   Асинхронная: await P.orderCheck(). */
/* ⛳ ВСЕГДА ОБА ПРОХОДА И ОДНА ИТОГОВАЯ СТРОКА (после MX2): упавший или бросивший первый проход не отменяет второй; каждый шаг — в своём
   try/catch; перед проходом — строка «идёт проход N из 2» (P.all молчит, пока идут строки, и долгий второй проход легко принять за конец). */
export async function orderCheck(){
  const run=async (label,f)=>{ console.log(`[scaleprobe order] ${label} — running…`);
    try{ return { r:await f(), err:null }; }catch(err){ console.warn(`[scaleprobe order] ${label} threw: ${err&&err.stack||err}`); return { r:null, err }; } };
  const failRows=x=> !x.r ? ['threw: '+(x.err&&x.err.message||x.err)] : x.r.rows.filter(z=>z.status==='FAIL'||z.differences==='ERROR').map(z=>z.check);
  const p=await run('P.checkPan', checkPan), a=await run('P.all pass 1 of 2', all), b=await run('P.all pass 2 of 2', all);
  const pOk= !!p.r && p.r.total===0, aOk= !!a.r && a.r.pass, bOk= !!b.r && b.r.pass, ok= pOk&&aOk&&bOk;
  const fa=failRows(a), fb=failRows(b);
  console.log(`[scaleprobe order] ${ok?'ORDER CHECK PASS':'ORDER CHECK FAILED'} — P.checkPan ${pOk?'pass':'FAIL'}; P.all pass 1 ${aOk?'PASS':'NOT A PASS'+(fa.length?' ('+fa.join('; ')+')':'')}; P.all pass 2 ${bOk?'PASS':'NOT A PASS'+(fb.length?' ('+fb.join('; ')+')':'')}`);
  return { ok, pan:p.r, first:a.r, second:b.r };
}
