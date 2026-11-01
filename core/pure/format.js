/* FMT1 (stage 3) — THE FILE FORMAT CORE: the envelope every data file carries ({ format:'handsong/<kind>', version, id, … }), the current
   version of each kind, the migration steps (one pure function per version step; none yet — every kind is at v1) and refusing a NEWER
   version in words, plus the per-kind validators of the scale data (moved verbatim from scaleload.js, which re-exports what others read).
   Pure core: no DOM, no Web Audio, no network — runs in node (the data runner's row «FMT1 format + registry (core)»). */
import { USER_ID } from './registry.js';
import { SONG_VERSION, SONG_MIGRATIONS } from './songfile.js';   // SAVE1: the song file's version and migrations (v1 → v2: TIM2 timbre ids)

const F={ manifest:'handsong/manifest', menu:'handsong/menu', tuning:'handsong/tuning', mode:'handsong/mode', palette:'handsong/palette', chordmodes:'handsong/chordmodes', song:'handsong/song' };
/* FMT1: the version each kind is read at today and its migrations ({ kind: [fn v1→v2, fn v2→v3, …] }, index = from-version − 1) */
const FORMAT_VERSION={ manifest:1, menu:1, tuning:1, mode:1, palette:1, chordmodes:1, song:SONG_VERSION };
const MIGRATIONS={ song:SONG_MIGRATIONS };
const kindOfFormat=fmt=> typeof fmt==='string' && fmt.slice(0,9)==='handsong/' ? fmt.slice(9) : null;
/* A record of an OLDER version → the current one through the migration steps (a copy; the stored record is never changed in place);
   a NEWER one is refused in words; unknown kind / no version → the record unchanged (the validator words it). */
function upgrade(rec){
  const kind=rec && kindOfFormat(rec.format), cur=FORMAT_VERSION[kind];
  if(!cur || !Number.isInteger(rec.version) || rec.version>=cur) return rec;
  let r=JSON.parse(JSON.stringify(rec));
  for(let v=r.version; v<cur; v++){ const step=(MIGRATIONS[kind]||[])[v-1]; if(!step) return rec; r=step(r); r.version=v+1; }
  return r;
}
const newerWords=(x,cur)=>`made by a newer Handsong (file version ${x.version}; this one reads up to ${cur}) — update the app to open it`;
/* ---- проверки ---- */
const isObj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const isStr=x=>typeof x==='string' && x.length>0;
const isInt=x=>Number.isInteger(x);
const isNum=x=>typeof x==='number' && Number.isFinite(x);
const RATIO=/^[1-9]\d*(\/[1-9]\d*)?$/;
const CM_MAX=8;   // F6b: режимов аккордов в наборе — не больше: панель держит их кнопками под палец (переносятся рядами), больше — уже меню, не переключатель
const ratioVal=r=>{ const [a,b]=r.split('/'); return b===undefined ? Number(a) : Number(a)/Number(b); };
const isRatio=x=>typeof x==='string' && RATIO.test(x);
const isLName=x=>isStr(x) || (isObj(x) && Object.keys(x).length>0 && Object.values(x).every(isStr));   // имя: строка или {en, ru, default…}
const isWord=x=>isStr(x) || isLName(x);                                                                    // слово периода: ключ словаря или имя
class Bad extends Error {}
const need=(c,msg)=>{ if(!c) throw new Bad(msg); };
const keysOnly=(o,allowed,where)=>{ for(const k of Object.keys(o)) need(allowed.includes(k), `${where}: unknown field "${k}"`); };
const head=(x,fmt,id)=>{ need(isObj(x),'not an object'); need(x.format===fmt,`format must be "${fmt}"`); { const cur=FORMAT_VERSION[kindOfFormat(fmt)]||1; need(!(Number.isInteger(x.version) && x.version>cur), newerWords(x,cur)); need(x.version===cur,'version must be '+cur); }   // FMT1: newer → refused in words; today cur = 1 for every kind (the old words)
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
  head(x,F.tuning,id); keysOnly(x,['format','version','id','name','period','pitches','chordFit','naming','periodWord','describe','drone','anchor'],'tuning');   // TF5: anchor (the historical 1/1)
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
  /* TF5: the historical 1/1 — a note 0..11 (C = 0) and a cents nudge −50…+50, offered as one tap (never the default); only where the key is
     «1/1 = …» (a tuning not named by the 12 notes) */
  if(x.anchor!==undefined){ need(isObj(x.anchor),'anchor must be an object'); keysOnly(x.anchor,['historical'],'anchor');
    const H=x.anchor.historical; need(isObj(H) && isInt(H.key) && H.key>=0 && H.key<=11,'anchor.historical.key must be a note 0..11 (C = 0)');
    keysOnly(H,['key','cents','note'],'anchor.historical');
    need(H.cents===undefined || (isInt(H.cents) && Math.abs(H.cents)<=50),'anchor.historical.cents must be a whole number −50…50');
    need(H.note===undefined || isLName(H.note),'anchor.historical.note must be a name: a string or {en, ru, …}');
    need(N.scheme!=='notes12' && N.scheme!=='notes24','anchor.historical belongs to a tuning not named by the 12 notes'); }
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
    keysOnly(m.set,['build','palette','rule','grid','naming'],`chord mode ${m.id}: set (only build, palette, rule, grid, naming)`);   // F7: grid (аккорды из сетки) и naming (схема имён ступеней) — тоже свойства режима
    if(m.set.grid!==undefined) need(m.set.grid===true,`chord mode ${m.id}: grid can only be true`);
    if(m.set.naming!==undefined) need(['notes12','notes24','ordinal','list'].includes(m.set.naming),`chord mode ${m.id}: naming must be notes12, notes24, ordinal or list`);
    if(m.set.build!==undefined) need(['adaptive','tuning'].includes(m.set.build),`chord mode ${m.id}: build must be adaptive or tuning`);
    if(m.set.palette!==undefined) need(pal[m.set.palette],`chord mode ${m.id}: palette "${m.set.palette}" not loaded`);
    if(m.set.rule!==undefined) checkRule(m.set.rule,`chord mode ${m.id}`); }
}
function checkMode(x,id,ctx){
  head(x,F.mode,id); keysOnly(x,['format','version','id','tuning','name','menu','degrees','root','anchor','chords','layout','naming','progressions','backing','aliases'],'mode');   // F7: aliases   // F5b: compat (tag) снят — тег живёт в пробе
  const T=ctx.tunings[x.tuning]; need(isStr(x.tuning) && T,`its tuning "${x.tuning}" is not loaded`);
  need(isLName(x.name),'name missing');
  need(isObj(x.menu) && ctx.trads.has(x.menu.tradition),`menu.tradition "${x.menu && x.menu.tradition}" unknown`); keysOnly(x.menu,['tradition','group'],'menu');
  need(x.menu.group==='' || (isStr(x.menu.group) && ctx.menu.groups[x.menu.group]),`menu.group "${x.menu.group}" unknown`);
  const N=tunSize(T), d=x.degrees;
  need(Array.isArray(d) && d.length>=1 && d.every(k=>isInt(k) && k>=0),'degrees must be whole numbers ≥ 0');
  need(d.every((k,i)=>i===0 || k>d[i-1]),'degrees must rise');
  need(isInt(x.root) && d.includes(x.root),'root must be one of the degrees');
  need(d.every(k=>k>=x.root && k<x.root+N),`degrees must lie within one period above the root (tuning has ${N} pitches)`);
  need(isObj(x.anchor) && ['tonic','fixed','choice'].includes(x.anchor.policy),'anchor.policy must be tonic, fixed or choice'); keysOnly(x.anchor,['policy','note','followHint','fixedHint'],'anchor');
  for(const k of ['followHint','fixedHint']) if(x.anchor[k]!==undefined){ need(x.anchor.policy==='choice',`anchor.${k} belongs only to policy "choice"`); need(isStr(x.anchor[k]),`anchor.${k} must be a dictionary key`); }   // F7: подсказка выбора «строй от» — у лада своя
  if(x.anchor.policy==='fixed') need(x.anchor.note===0,'anchor.note: only 0 (C) is supported for a fixed anchor today');   // F6b: иное нота молча строилась бы от C — честнее отказ
  const C=x.chords; need(isObj(C),'chords missing'); keysOnly(C,['rule','palette','grid','build','modes'],'chords'); checkRule(C.rule,'chords');
  if(C.palette!==undefined) need(ctx.palettes[C.palette],`palette "${C.palette}" not loaded`);
  if(C.grid!==undefined) need(C.grid===true,'chords.grid can only be true');
  if(C.build!==undefined) need(['adaptive','tuning'].includes(C.build),'chords.build must be adaptive or tuning');
  if(C.modes!==undefined) need(ctx.chordModeSets[C.modes],`chord modes "${C.modes}" not loaded`);
  const table=T.pitches.list!=null, cms=C.modes ? ctx.chordModeSets[C.modes].modes : [{id:'', set:{}}];
  for(const m of cms){ const pal=m.set.palette ?? C.palette, build=m.set.build ?? C.build, grid=m.set.grid ?? C.grid; if(pal===undefined) continue;
    const kind=ctx.palettes[pal].kind, w=m.id ? ` (chord mode ${m.id})` : '';
    if(kind==='ratios') need((table && grid!==true) || (!table && build==='adaptive' && ratioVal(T.period)!==2),`palette "${pal}" holds ratios: needs a table tuning without grid, or a non-octave equal tuning with chords built adaptively${w}`);   // F7: на октавном равном строе отношения цена прочла бы как шаги
    else need(!table || grid===true,`palette "${pal}" holds steps: needs an equal tuning or grid${w}`); }
  /* ⛳ F7-починка: ПЕРВЫЙ режим набора — УМОЛЧАНИЕ, и голый лад обязан ему РАВНЯТЬСЯ: каждое поле, которое режим по умолчанию ставит,
     у самого лада уже такое же (по действующему значению: нет build — 'tuning', нет grid — без сетки, нет своей схемы имён — схема строя).
     Иначе голый объект лада (демо, опоры пробы, всякий, кто возьмёт лад без вида) цен и подписей своего умолчания не даёт — ловушка, в
     которую демо стартового экрана попадал до T7b; так было у Партча и Болена–Пирса (умолчание «Свободно» ставит adaptive, лад — нет). */
  if(C.modes!==undefined){ const d=ctx.chordModeSets[C.modes].modes[0].set, eff={
      build: C.build ?? 'tuning', palette: C.palette, rule: JSON.stringify(C.rule), grid: C.grid===true, naming: (x.naming && x.naming.scheme) || T.naming.scheme };
    const got={ build:d.build, palette:d.palette, rule: d.rule===undefined ? undefined : JSON.stringify(d.rule), grid: d.grid===true, naming:d.naming };
    for(const k of Object.keys(d)) need(got[k]===eff[k],`the default chord mode (the first of "${C.modes}") sets ${k}=${JSON.stringify(d[k])}, but the mode itself has ${JSON.stringify(k==='rule'?C.rule:eff[k])} — a mode must equal its default chord mode`); }
  if(x.aliases!==undefined){ need(Array.isArray(x.aliases),'aliases must be a list');   // F7: прежние id, ведущие на этот лад с предустановкой
    const cmIds=C.modes ? ctx.chordModeSets[C.modes].modes.map(z=>z.id) : [];
    for(const a of x.aliases){ need(isObj(a) && isStr(a.id) && a.id!==x.id,'an alias needs its own id'); keysOnly(a,['id','tunedFrom','chordMode'],`alias ${a.id}`);
      if(a.tunedFrom!==undefined) need(x.anchor.policy==='choice' && (a.tunedFrom==='T' || (isInt(a.tunedFrom) && a.tunedFrom>=0 && a.tunedFrom<12)),`alias ${a.id}: tunedFrom must be "T" or 0..11, on a mode with anchor "choice"`);
      if(a.chordMode!==undefined) need(cmIds.includes(a.chordMode),`alias ${a.id}: chord mode "${a.chordMode}" is not in the mode's set`); } }
  if(x.layout!==undefined){ need(isObj(x.layout) && typeof x.layout.rect==='boolean','layout.rect must be true or false'); keysOnly(x.layout,['rect'],'layout'); }
  if(x.naming!==undefined){ need(isObj(x.naming),'naming must be an object'); keysOnly(x.naming,['scheme','detail'],'naming');
    if(x.naming.scheme!==undefined) need(['notes12','notes24','ordinal','list'].includes(x.naming.scheme),'naming.scheme unknown');
    if(x.naming.scheme==='list') need(T.naming.scheme==='list','naming.scheme "list" needs a tuning with a name list');
    if(x.naming.detail!==undefined) need(typeof x.naming.detail==='boolean','naming.detail must be true or false'); }
  if(x.progressions!==undefined) need(typeof x.progressions==='boolean','progressions must be true or false');
  if(x.backing!==undefined){ need(isObj(x.backing) && isStr(x.backing.rhythm),'backing.rhythm missing'); keysOnly(x.backing,['rhythm'],'backing'); }
}

export { F, FORMAT_VERSION, MIGRATIONS, kindOfFormat, upgrade, Bad, CM_MAX, checkManifest, checkMenu, checkTuning, checkPalette, checkChordModes, checkMode };
