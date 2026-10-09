/* ═══ ⛳ ЗАГРУЗЧИК ДАННЫХ ЛАДОВ (слайс F5 плана «СТРОИ И ЛАДЫ ФАЙЛАМИ», HANDOFF) ═══
   Данные ладов — ФАЙЛЫ в data/ (форма v1: index.json — манифест, menu.json, по файлу на строй, лад, палитру и набор режимов аккордов;
   комментарии к ним — data/README.md). scales.js ждёт loadScaleData() ВЕРХНЕУРОВНЕВЫМ await до того, как кто-либо прочтёт лады: каждый
   модуль, импортирующий scales.js (прямо или через другой модуль), ждёт вместе с ним, и все синхронные читатели остаются как были.
   ПОРЯДОК: манифест → menu.json и ВСЕ файлы параллельно (Promise.allSettled) → проверка: строи, затем палитры, наборы режимов, лады (лад
   ссылается на строй, палитру и набор — они проверяются раньше). Возвращает объект той же формы, что был у scaledata.js (F2–F4):
   {manifest, menu, tunings, palettes, chordModeSets, modes} — в списках манифеста ТОЛЬКО прошедшие проверку записи.
   ⛳ ПРОВЕРКА КАЖДОГО ФАЙЛА: форма (format, version, id = имя в манифесте, известные ключи), типы и диапазоны; высоты по возрастанию в
   пределах периода (первая — 0¢); отношение и центы согласны — до половины последнего записанного знака центов (у таблиц с целыми
   центами, как 22 шрути, — до 0.5¢; у записанных до сотых — до 0.005¢); ступени лада — целые, по возрастанию, в одном периоде от корня,
   корень среди них; палитра по виду согласна со строем (отношения — у таблицы или у лада, строящего аккорды «адаптивно», в каждом режиме
   аккордов; шаги — у равного строя или у таблицы с сеткой chords.grid); переопределения режимов аккордов — только build, palette, rule;
   id уникальны. СЛОМАННЫЙ ФАЙЛ ПРОПУСКАЕТСЯ — одна строка в консоли и общее известие на стартовой карточке (ui/main читают loadReport);
   лады пропущенного строя (палитры, набора) пропускаются с ним. Стартовый лад не загрузился — берётся первый годный.
   ⛳ ПРИЛОЖЕНИЕ ЗАПУСКАЕТСЯ ВСЕГДА: не читается манифест или меню, или не осталось ни одного лада — АВАРИЙНАЯ ПАРА (12-равный строй и
   хроматика, с её палитрой) из данных ниже, через ТУ ЖЕ проверку.
   ⛳ F6 — ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ (userstore.js: IndexedDB, иначе store) грузятся ПОСЛЕ встроенных (и после аварийной пары, если до неё
   дошло) ТОЙ ЖЕ проверкой, в том же порядке зависимостей — строи, палитры, наборы режимов, лады; ссылаться можно и на встроенные, и на
   свои. id файла пользователя — в своём пространстве: «u.<uuid>» (USER_ID); иное id или id, уже занятое (встроенным или другим файлом
   пользователя иного вида), — отказ. Сломанный файл пользователя пропускается со строкой в консоли и в общем известии и НИКОГДА не
   останавливает встроенные. checkRecord — та же проверка для установки из консоли (userfiles.js) против ЖИВОГО набора.
   ⛔ Нижний слой: DOM не трогает (известие показывает main по loadReport). Из приложения импортирует только userstore — цикла нет.
   ⚠️ Сервис-воркер (sw.js) по-прежнему ничего не кэширует: файлы данных приходят из сети при каждом запуске (запрос с cache:'no-cache' —
   условный, неизменный файл отвечает 304). Офлайн приложение не работает и без этого (MediaPipe — с CDN). */
import { userAll } from './userstore.js';   // F6: файлы пользователя
const BASE=new URL('../data/', import.meta.url);
const F={ manifest:'handsong/manifest', menu:'handsong/menu', tuning:'handsong/tuning', mode:'handsong/mode', palette:'handsong/palette', chordmodes:'handsong/chordmodes' };
export const loadReport={ ms:0, files:0, problems:[], emergency:false, user:0 };   // user — сколько файлов пользователя принято (F6)   // итог загрузки — читают main (известие) и консоль

/* ---- проверки ---- */
const isObj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const isStr=x=>typeof x==='string' && x.length>0;
const isInt=x=>Number.isInteger(x);
const isNum=x=>typeof x==='number' && Number.isFinite(x);
const RATIO=/^[1-9]\d*(\/[1-9]\d*)?$/;
export const CM_MAX=8;   // F6b: режимов аккордов в наборе — не больше: панель держит их кнопками под палец (переносятся рядами), больше — уже меню, не переключатель
const ratioVal=r=>{ const [a,b]=r.split('/'); return b===undefined ? Number(a) : Number(a)/Number(b); };
const isRatio=x=>typeof x==='string' && RATIO.test(x);
const isLName=x=>isStr(x) || (isObj(x) && Object.keys(x).length>0 && Object.values(x).every(isStr));   // имя: строка или {en, ru, default…}
const isWord=x=>isStr(x) || isLName(x);                                                                    // слово периода: ключ словаря или имя
class Bad extends Error {}
const need=(c,msg)=>{ if(!c) throw new Bad(msg); };
const keysOnly=(o,allowed,where)=>{ for(const k of Object.keys(o)) need(allowed.includes(k), `${where}: unknown field "${k}"`); };
const head=(x,fmt,id)=>{ need(isObj(x),'not an object'); need(x.format===fmt,`format must be "${fmt}"`); need(x.version===1,'version must be 1');
  if(id!==undefined) need(x.id===id,`id "${x.id}" does not match its manifest entry "${id}"`); };
const decimals=c=>{ const s=String(c), i=s.indexOf('.'); return i<0 ? 0 : s.length-i-1; };
const tunSize=x=> x.pitches.equal!=null ? x.pitches.equal : x.pitches.list.length;

function checkManifest(x){
  head(x,F.manifest); keysOnly(x,['format','version','start','tunings','modes','palettes','chordModeSets'],'index');
  need(isStr(x.start),'start must be a mode id');
  for(const k of ['tunings','modes','palettes','chordModeSets']) need(Array.isArray(x[k]) && x[k].every(isStr), `${k} must be a list of ids`);
}
function checkMenu(x){
  head(x,F.menu); keysOnly(x,['format','version','traditions','groups'],'menu');
  need(Array.isArray(x.traditions) && x.traditions.length>0,'traditions must be a non-empty list');
  const seen=new Set();
  for(const t of x.traditions){ need(isObj(t) && isStr(t.id) && isLName(t.name),'a tradition needs id and name'); keysOnly(t,['id','name'],'tradition');
    need(!seen.has(t.id),`tradition "${t.id}" twice`); seen.add(t.id); }
  need(isObj(x.groups) && Object.values(x.groups).every(isLName),'groups must map keys to names');
}
function checkTuning(x,id){
  head(x,F.tuning,id); keysOnly(x,['format','version','id','name','period','pitches','chordFit','naming','periodWord','describe','drone'],'tuning');
  if(x.name!==undefined) need(isLName(x.name),'name must be a name: a string or {en, ru, …}');   // F6b: имя строя (у встроенных — есть у всех)
  if(USER_ID.test(String(x.id))) need(x.name!==undefined,'a user tuning needs a name ({en, ru})');
  need(isRatio(x.period) && ratioVal(x.period)>1,'period must be a ratio above 1, e.g. "2/1"');
  const P=x.pitches; need(isObj(P),'pitches missing'); keysOnly(P,['equal','list'],'pitches');
  need((P.equal!=null)!==(P.list!=null),'pitches: exactly one of equal or list');
  const pc=1200*Math.log2(ratioVal(x.period));
  if(P.equal!=null) need(isInt(P.equal) && P.equal>=1,'pitches.equal must be a whole number ≥ 1');
  else{
    need(Array.isArray(P.list) && P.list.length>=1,'pitches.list must be a non-empty list');
    P.list.forEach((p,i)=>{ need(isObj(p) && isNum(p.cents),`pitch ${i+1}: cents must be a number`); keysOnly(p,['cents','ratio'],`pitch ${i+1}`);
      need(i>0 || p.cents===0,'the first pitch must be 0 cents');
      need(i===0 || p.cents>P.list[i-1].cents,`pitch ${i+1}: cents must rise (${p.cents} after ${P.list[i-1] && P.list[i-1].cents})`);
      need(p.cents<pc,`pitch ${i+1}: ${p.cents}¢ is not inside the period (${pc.toFixed(2)}¢)`);
      if(p.ratio!==undefined){ need(isRatio(p.ratio),`pitch ${i+1}: ratio must be like "5/4"`);
        const c=1200*Math.log2(ratioVal(p.ratio)), tol=0.5*Math.pow(10,-decimals(p.cents))+1e-9;
        need(Math.abs(c-p.cents)<=tol,`pitch ${i+1}: ratio ${p.ratio} is ${c.toFixed(3)}¢, cents say ${p.cents}`); } });
  }
  if(x.chordFit!==undefined){ need(x.chordFit==='ratios','chordFit can only be "ratios"'); need(P.list && P.list.every(p=>p.ratio),'chordFit "ratios" needs a ratio on every pitch'); }
  const N=x.naming; need(isObj(N) && ['notes12','notes24','ordinal','list'].includes(N.scheme),'naming.scheme must be notes12, notes24, ordinal or list');
  keysOnly(N,['scheme','names'],'naming');
  if(N.scheme==='list'){ need(Array.isArray(N.names) && N.names.length===tunSize(x),'naming.names must give one entry per pitch');
    N.names.forEach((e,i)=>{ need(isObj(e) && isLName(e.name) && (e.detail===undefined || isLName(e.detail)),`naming.names[${i}] needs a name`); keysOnly(e,['name','detail'],`naming.names[${i}]`); }); }
  else need(N.names===undefined,'naming.names belongs only to the list scheme');
  const W=x.periodWord; need(isObj(W) && isWord(W.short) && (W.full===undefined || isWord(W.full)),'periodWord needs short'); keysOnly(W,['short','full'],'periodWord');
  const Dd=x.describe; need(isObj(Dd) && (Dd.kind==='equal'||Dd.kind==='table'),'describe.kind must be equal or table'); keysOnly(Dd,['kind','step'],'describe');
  need(Dd.kind===(P.equal!=null?'equal':'table'),'describe.kind does not match the pitches'); need(Dd.step===undefined || typeof Dd.step==='boolean','describe.step must be true or false');
  if(x.drone!==undefined){ need(isObj(x.drone) && isRatio(x.drone.withoutFifth) && ratioVal(x.drone.withoutFifth)>1,'drone.withoutFifth must be a ratio above 1'); keysOnly(x.drone,['withoutFifth'],'drone'); }
}
function checkRule(r,where){
  need(isObj(r) && ['tertian','stack','power','ratios','palette','none'].includes(r.kind),`${where}: rule.kind unknown`);
  if(r.kind==='ratios'){ keysOnly(r,['kind','triad','seventh'],where);
    for(const k of ['triad','seventh']) need(Array.isArray(r[k]) && r[k].length>0 && r[k].every(isRatio),`${where}: rule.${k} must be ratios`); }
  else keysOnly(r,['kind'],where);
}
function checkPalette(x,id){
  head(x,F.palette,id); keysOnly(x,['format','version','id','kind','families'],'palette');
  need(x.kind==='steps'||x.kind==='ratios','kind must be steps or ratios');
  need(Array.isArray(x.families) && x.families.length>0,'families must be a non-empty list');
  for(const f of x.families){ need(isObj(f) && isStr(f.id) && isLName(f.name),'a family needs id and name'); keysOnly(f,['id','name','finger','types'],`family ${f.id}`);
    need(f.finger===undefined || isInt(f.finger),`family ${f.id}: finger must be whole`);
    need(Array.isArray(f.types) && f.types.length>0,`family ${f.id}: types must be a non-empty list`);
    for(const t of f.types){ need(isObj(t) && isLName(t.label) && (t.full===undefined || isLName(t.full)),`family ${f.id}: a type needs a label`); keysOnly(t,['label','full','iv'],`family ${f.id}`);
      need(Array.isArray(t.iv) && t.iv.length>0 && t.iv.every(x.kind==='steps' ? isInt : isRatio),`family ${f.id}: type iv must be ${x.kind==='steps'?'whole steps':'ratios'}`); } }
}
function checkChordModes(x,id,pal){
  head(x,F.chordmodes,id); keysOnly(x,['format','version','id','modes'],'chordmodes');
  need(Array.isArray(x.modes) && x.modes.length>0 && x.modes.length<=CM_MAX,`modes must be a list of 1..${CM_MAX} chord modes`);
  const seen=new Set();
  for(const m of x.modes){ need(isObj(m) && isStr(m.id) && isObj(m.set),'a chord mode needs id and set');
    keysOnly(m,['id','nameKey','hintKey','name','hint','set'],`chord mode ${m.id}`); need(!seen.has(m.id),`chord mode "${m.id}" twice`); seen.add(m.id);
    // F6b: имя и подсказка — КЛЮЧ СЛОВАРЯ (nameKey/hintKey, встроенные) ИЛИ своё имя {en, ru} (name/hint, файл пользователя) — ровно одно из пары
    need((m.nameKey!==undefined)!==(m.name!==undefined),`chord mode ${m.id}: give exactly one of nameKey (dictionary key) or name ({en, ru})`);
    need((m.hintKey!==undefined)!==(m.hint!==undefined),`chord mode ${m.id}: give exactly one of hintKey (dictionary key) or hint ({en, ru})`);
    need(m.nameKey===undefined ? isLName(m.name) : isStr(m.nameKey),`chord mode ${m.id}: name must be a string key or {en, ru}`);
    need(m.hintKey===undefined ? isLName(m.hint) : isStr(m.hintKey),`chord mode ${m.id}: hint must be a string key or {en, ru}`);
    keysOnly(m.set,['build','palette','rule'],`chord mode ${m.id}: set (only build, palette, rule)`);
    if(m.set.build!==undefined) need(['adaptive','tuning'].includes(m.set.build),`chord mode ${m.id}: build must be adaptive or tuning`);
    if(m.set.palette!==undefined) need(pal[m.set.palette],`chord mode ${m.id}: palette "${m.set.palette}" not loaded`);
    if(m.set.rule!==undefined) checkRule(m.set.rule,`chord mode ${m.id}`); }
}
function checkMode(x,id,ctx){
  head(x,F.mode,id); keysOnly(x,['format','version','id','tuning','name','menu','degrees','root','anchor','chords','layout','naming','progressions','backing'],'mode');   // F5b: compat (tag) снят — тег живёт в пробе
  const T=ctx.tunings[x.tuning]; need(isStr(x.tuning) && T,`its tuning "${x.tuning}" is not loaded`);
  need(isLName(x.name),'name missing');
  need(isObj(x.menu) && ctx.trads.has(x.menu.tradition),`menu.tradition "${x.menu && x.menu.tradition}" unknown`); keysOnly(x.menu,['tradition','group'],'menu');
  need(x.menu.group==='' || (isStr(x.menu.group) && ctx.menu.groups[x.menu.group]),`menu.group "${x.menu.group}" unknown`);
  const N=tunSize(T), d=x.degrees;
  need(Array.isArray(d) && d.length>=1 && d.every(k=>isInt(k) && k>=0),'degrees must be whole numbers ≥ 0');
  need(d.every((k,i)=>i===0 || k>d[i-1]),'degrees must rise');
  need(isInt(x.root) && d.includes(x.root),'root must be one of the degrees');
  need(d.every(k=>k>=x.root && k<x.root+N),`degrees must lie within one period above the root (tuning has ${N} pitches)`);
  need(isObj(x.anchor) && ['tonic','fixed','choice'].includes(x.anchor.policy),'anchor.policy must be tonic, fixed or choice'); keysOnly(x.anchor,['policy','note'],'anchor');
  if(x.anchor.policy==='fixed') need(x.anchor.note===0,'anchor.note: only 0 (C) is supported for a fixed anchor today');   // F6b: иное нота молча строилась бы от C — честнее отказ
  const C=x.chords; need(isObj(C),'chords missing'); keysOnly(C,['rule','palette','grid','build','modes'],'chords'); checkRule(C.rule,'chords');
  if(C.palette!==undefined) need(ctx.palettes[C.palette],`palette "${C.palette}" not loaded`);
  if(C.grid!==undefined) need(C.grid===true,'chords.grid can only be true');
  if(C.build!==undefined) need(['adaptive','tuning'].includes(C.build),'chords.build must be adaptive or tuning');
  if(C.modes!==undefined) need(ctx.chordModeSets[C.modes],`chord modes "${C.modes}" not loaded`);
  const table=T.pitches.list!=null, cms=C.modes ? ctx.chordModeSets[C.modes].modes : [{id:'', set:{}}];
  for(const m of cms){ const pal=m.set.palette ?? C.palette, build=m.set.build ?? C.build; if(pal===undefined) continue;
    const kind=ctx.palettes[pal].kind, w=m.id ? ` (chord mode ${m.id})` : '';
    if(kind==='ratios') need(table || build==='adaptive',`palette "${pal}" holds ratios: needs a table tuning or chords built adaptively${w}`);
    else need(!table || C.grid===true,`palette "${pal}" holds steps: needs an equal tuning or chords.grid${w}`); }
  if(x.layout!==undefined){ need(isObj(x.layout) && typeof x.layout.rect==='boolean','layout.rect must be true or false'); keysOnly(x.layout,['rect'],'layout'); }
  if(x.naming!==undefined){ need(isObj(x.naming),'naming must be an object'); keysOnly(x.naming,['scheme','detail'],'naming');
    if(x.naming.scheme!==undefined) need(['notes12','notes24','ordinal','list'].includes(x.naming.scheme),'naming.scheme unknown');
    if(x.naming.scheme==='list') need(T.naming.scheme==='list','naming.scheme "list" needs a tuning with a name list');
    if(x.naming.detail!==undefined) need(typeof x.naming.detail==='boolean','naming.detail must be true or false'); }
  if(x.progressions!==undefined) need(typeof x.progressions==='boolean','progressions must be true or false');
  if(x.backing!==undefined){ need(isObj(x.backing) && isStr(x.backing.rhythm),'backing.rhythm missing'); keysOnly(x.backing,['rhythm'],'backing'); }
}

/* ---- сборка набора из прочитанного: проверка, пропуски, единственность ---- */
function assemble(man, menu, got, problems){
  const D={ manifest:{ format:man.format, version:man.version, start:man.start, tunings:[], modes:[], palettes:[], chordModeSets:[] },
            menu, tunings:{}, palettes:{}, chordModeSets:{}, modes:{} };
  const skip=(file,why)=>{ problems.push({file,why}); console.warn(`[scales] skipped data/${file} — ${why}`); };
  const pass=(list, folder, sect, check)=>{ const seen=new Set();
    for(const id of man[list]){ const file=`${folder}/${id}.json`;
      if(seen.has(id)){ skip(file,'listed twice in index.json'); continue; } seen.add(id);
      const g=got[file]; if(!g || g.err){ skip(file, g ? g.err : 'not read'); continue; }
      try{ check(g.val,id); D[sect][id]=g.val; D.manifest[list].push(id); } catch(e){ skip(file, e instanceof Bad ? e.message : String(e)); } } };
  const ctx={ tunings:D.tunings, palettes:D.palettes, chordModeSets:D.chordModeSets, menu, trads:new Set(menu.traditions.map(t=>t.id)) };
  pass('tunings','tunings','tunings', checkTuning);
  pass('palettes','palettes','palettes', checkPalette);
  pass('chordModeSets','chordmodes','chordModeSets', (x,id)=>checkChordModes(x,id,D.palettes));
  pass('modes','modes','modes', (x,id)=>checkMode(x,id,ctx));
  if(!D.modes[D.manifest.start] && D.manifest.modes.length){ D.manifest.start=D.manifest.modes[0];
    console.warn(`[scales] start mode "${man.start}" is not loaded — starting on "${D.manifest.start}"`); }
  return D;
}
const fileList=man=>[...man.tunings.map(i=>`tunings/${i}.json`), ...man.palettes.map(i=>`palettes/${i}.json`),
                     ...man.chordModeSets.map(i=>`chordmodes/${i}.json`), ...man.modes.map(i=>`modes/${i}.json`)];
async function readJSON(rel){ const r=await fetch(new URL(rel,BASE),{cache:'no-cache'}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

/* ---- аварийная пара: 12-равный строй и хроматика (с её палитрой) — копия записей edo12, chromatic, chrom12 из data/ ---- */
const EMERGENCY={"manifest":{"format":"handsong/manifest","version":1,"start":"chromatic","tunings":["edo12"],"modes":["chromatic"],"palettes":["chrom12"],"chordModeSets":[]},"menu":{"format":"handsong/menu","version":1,"traditions":[{"id":"common","name":{"en":"Familiar","ru":"Привычное"}}],"groups":{"chromatic":{"en":"Chromatic","ru":"Хроматика"}}},"tunings":{"edo12":{"format":"handsong/tuning","version":1,"id":"edo12","name":{"en":"12-tone equal temperament","ru":"12-тоновая равномерная темперация"},"period":"2/1","pitches":{"equal":12},"naming":{"scheme":"notes12"},"periodWord":{"short":"reg.oct","full":"reg.octaveFull"},"describe":{"kind":"equal"}}},"palettes":{"chrom12":{"format":"handsong/palette","version":1,"id":"chrom12","kind":"steps","families":[{"id":"maj","name":{"en":"Major","ru":"Мажор"},"finger":0,"types":[{"label":"M","iv":[0,4,7]},{"label":"maj7","iv":[0,4,7,11]},{"label":"7","iv":[0,4,7,10]},{"label":"6","iv":[0,4,7,9]},{"label":"add9","iv":[0,4,7,14]},{"label":"7#9","iv":[0,4,7,10,15]}]},{"id":"min","name":{"en":"Minor","ru":"Минор"},"finger":1,"types":[{"label":"m","iv":[0,3,7]},{"label":"m7","iv":[0,3,7,10]},{"label":"m6","iv":[0,3,7,9]},{"label":"mM7","iv":[0,3,7,11]},{"label":"m9","iv":[0,3,7,10,14]},{"label":"madd9","iv":[0,3,7,14]}]},{"id":"dim","name":{"en":"Dim./Aug.","ru":"Ум./Ув."},"finger":2,"types":[{"label":"dim","iv":[0,3,6]},{"label":"m7b5","iv":[0,3,6,10]},{"label":"dim7","iv":[0,3,6,9]},{"label":"aug","iv":[0,4,8]},{"label":"aug7","iv":[0,4,8,10]},{"label":"augM7","iv":[0,4,8,11]}]},{"id":"sus","name":{"en":"Sus & extended","ru":"Sus и расшир."},"finger":3,"types":[{"label":"sus2","iv":[0,2,7]},{"label":"sus4","iv":[0,5,7]},{"label":"7sus4","iv":[0,5,7,10]},{"label":"6/9","iv":[0,4,7,9,14]},{"label":"maj9","iv":[0,4,7,11,14]},{"label":"13","iv":[0,4,7,10,21]}]}]}},"chordModeSets":{},"modes":{"chromatic":{"format":"handsong/mode","version":1,"id":"chromatic","tuning":"edo12","name":{"en":"Chromatic (12 notes)","ru":"Хроматика (12 нот)"},"menu":{"tradition":"common","group":"chromatic"},"degrees":[0,1,2,3,4,5,6,7,8,9,10,11],"root":0,"anchor":{"policy":"tonic"},"chords":{"rule":{"kind":"palette"},"palette":"chrom12"}}}};

function emergency(problems, why){
  console.warn(`[scales] scale data could not be loaded (${why}) — starting with the emergency pair: 12-equal and chromatic`);
  const E=EMERGENCY, got={};
  for(const f of fileList(E.manifest)){ const [folder,name]=f.split('/'), id=name.replace(/\.json$/,'');
    const rec=folder==='tunings'?E.tunings[id]:folder==='palettes'?E.palettes[id]:folder==='chordmodes'?E.chordModeSets[id]:E.modes[id];
    got[f]={val:JSON.parse(JSON.stringify(rec))}; }
  checkManifest(E.manifest); checkMenu(E.menu);   // та же проверка; брошенное здесь — ошибка самого кода, а не данных
  const D=assemble(E.manifest, E.menu, got, []);
  loadReport.emergency=true; loadReport.problems=problems;
  return D;
}

async function loadBuiltins(problems){
  let man, menu;
  try{ man=await readJSON('index.json'); checkManifest(man); }
  catch(e){ problems.push({file:'index.json', why:e.message||String(e)}); return { D:emergency(problems,'index.json: '+(e.message||e)), n:0 }; }
  const files=['menu.json', ...fileList(man)];
  const res=await Promise.allSettled(files.map(readJSON));
  const got={}; files.forEach((f,i)=>{ got[f]= res[i].status==='fulfilled' ? {val:res[i].value} : {err:(res[i].reason && res[i].reason.message) || 'not read'}; });
  try{ menu=got['menu.json'].val; if(got['menu.json'].err) throw new Error(got['menu.json'].err); checkMenu(menu); }
  catch(e){ problems.push({file:'menu.json', why:e.message||String(e)}); return { D:emergency(problems,'menu.json: '+(e.message||e)), n:files.length+1 }; }
  const D=assemble(man, menu, got, problems);
  if(!D.manifest.modes.length) return { D:emergency(problems,'no mode could be loaded'), n:files.length+1 };
  return { D, n:files.length+1 };
}
export async function loadScaleData(){
  const t0=performance.now(), problems=[];
  const { D, n }=await loadBuiltins(problems);
  loadReport.user=await addUserFiles(D, problems);   // F6: после встроенных; ошибки — только пропуски, встроенным не мешают
  loadReport.problems=problems;
  return finish(D, t0, n);
}

/* ═══ F6 — ФАЙЛЫ ПОЛЬЗОВАТЕЛЯ ═══ */
export const USER_ID=/^u\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const KINDS=[['tuning','tunings','tunings'],['palette','palettes','palettes'],['chordmodes','chordModeSets','chordModeSets'],['mode','modes','modes']];   // вид → раздел набора, список манифеста — в порядке зависимостей
const FORMAT_KIND={ [F.tuning]:'tuning', [F.palette]:'palette', [F.chordmodes]:'chordmodes', [F.mode]:'mode' };
export const kindOfRecord=rec=> rec && FORMAT_KIND[rec.format] || null;
const sectOf=kind=>KINDS.find(k=>k[0]===kind)[1];
/* Кто уже держит id (любой вид) — для единственности. → вид или null. */
export function idHolder(D,id){ for(const [kind,sect] of KINDS) if(D[sect][id]) return kind; return null; }
/* ⛳ Та же проверка, что у файлов data/, для ОДНОЙ записи против набора D (живого или собираемого). → null или причина словами. */
export function checkRecord(kind, rec, D){
  try{
    const ctx={ tunings:D.tunings, palettes:D.palettes, chordModeSets:D.chordModeSets, menu:D.menu, trads:new Set(D.menu.traditions.map(t=>t.id)) };
    if(kind==='tuning') checkTuning(rec, rec && rec.id);
    else if(kind==='palette') checkPalette(rec, rec && rec.id);
    else if(kind==='chordmodes') checkChordModes(rec, rec && rec.id, D.palettes);
    else if(kind==='mode') checkMode(rec, rec && rec.id, ctx);
    else return 'unknown kind of file (format must be handsong/tuning, handsong/mode, handsong/palette or handsong/chordmodes)';
    return null;
  }catch(e){ return e instanceof Bad ? e.message : String(e && e.message || e); }
}
async function addUserFiles(D, problems){
  const all=await userAll(); let ok=0;
  const skip=(e,why)=>{ problems.push({file:`user ${e.kind} ${e.id}`, why, user:true}); console.warn(`[scales] skipped user file ${e.kind} "${e.id}" — ${why}`); };
  for(const [kind,sect,list] of KINDS) for(const e of all){ if(e.kind!==kind) continue;
    if(!USER_ID.test(String(e.id))){ skip(e,'a user file id must be u.<uuid>'); continue; }
    if(kindOfRecord(e.rec)!==kind || e.rec.id!==e.id){ skip(e,'the stored record does not match its kind or id'); continue; }
    const h=idHolder(D,e.id); if(h){ skip(e,`the id is already used by a ${h}`); continue; }
    const why=checkRecord(kind, e.rec, D); if(why){ skip(e,why); continue; }
    D[sect][e.id]=e.rec; D.manifest[list].push(e.id); ok++;
  }
  return ok;
}
function finish(D, t0, n){
  loadReport.ms=Math.round(performance.now()-t0); loadReport.files=n;
  console.log(`[scales] ${D.manifest.modes.length} modes, ${D.manifest.tunings.length} tunings from ${n} files in ${loadReport.ms} ms`
    +(loadReport.user ? ` · ${loadReport.user} user file(s)` : '')+(loadReport.problems.length ? ` · ${loadReport.problems.length} skipped` : '')+(loadReport.emergency ? ' · EMERGENCY PAIR' : ''));
  return D;
}
