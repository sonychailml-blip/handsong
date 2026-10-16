/* REC3 part 2 (stage 3) — THE AUTOMATION LANE AND THE PER-NOTE LANES (O-4, V4b, VOL-3, ED5), THE BEND CURVE (OWN2, BEND-CURVE) and the
   TRACK'S CHAIN edits (S1) with their history kinds — moved from recorder.js (which re-exports them — a facade). Pure: no DOM, no Web
   Audio; imports only song/, scales.js and config.js; the engine's effect declarations, the tempo, the live chain snapshot and the open
   track's edit version come through song/env.js. Moved verbatim; the edited lines are marked REC3. */
import { evGen, evRole, events } from './store.js';
import { FX_CHAIN, autSmoothOf, laneChainKey, laneRoleOf, takeFx, takeFxTouch, takeFxVer } from './capture.js';
import { ldTherm, songNotes } from './notes.js';
import { AUT_RAMP_BEAT, AUT_RAMP_EPS } from '../config.js';
import { editBatch, editCommit, editGuard, editLayer, editPush } from './edit-notes.js';
import { histApply as editApply, histKind, histSeal } from './history.js';
import { ENV } from './env.js';
const fxParamMetaOf=(...a)=>ENV.fxParamMetaOf(...a), fxPerm=(...a)=>ENV.fxPerm(...a), fxNoteField=(...a)=>ENV.fxNoteField(...a),
  fxParamKeysOf=(...a)=>ENV.fxParamKeysOf(...a), fxDefaultsOf=(...a)=>ENV.fxDefaultsOf(...a), fxNoteFollows=(...a)=>ENV.fxNoteFollows(...a),
  fxIsPerNote=(...a)=>ENV.fxIsPerNote(...a);   // REC3: the engine's effect declarations, wired
const takeCapStart=tk=>ENV.capStart(tk), laneEditTouch=()=>ENV.laneEditTouch();   // REC3: the live chain snapshot, the open track's edit version

/* ═══ ПОЛОСА АВТОМАТИЗАЦИИ: ЧТЕНИЕ И ПРАВКА (слайс O-4) ═══
   ⛳ ЧТО ЗДЕСЬ ЗА ЕДИНИЦА. Полоса показывает ОДИН АДРЕС — (владелец цепи, эффект, параметр) — на ВСЕЙ
   дорожке, как его видит переигровка: точки всех взятых дорожки, слитые по времени. Это не «вид на одно
   взятое»: звучит-то именно слитая лента (fxPlayBuild), и показывать другое значило бы рисовать не то,
   что слышно.
   ⛳ КАКОМУ ВЗЯТОМУ ПРИНАДЛЕЖИТ ПРАВКА (ответ на «а если взятых два»):
     ПЕРЕТАСКИВАНИЕ правит ТУ САМУЮ точку, за которую взялись, — она лежит в СВОЁМ взятом и там остаётся.
     НОВАЯ точка ложится в ПОСЛЕДНЕЕ взятое дорожки (высший tk). Это не произвол: переигровка разрешает
     спор «последняя по времени, при равенстве — старшая по номеру взятого», поэтому точка в последнем
     взятом ПОБЕЖДАЕТ в любой момент, который она покрывает. То есть «добавил точку — она и слышна».
   ⚠️ СНИМОК СТАРТА — НЕ ТОЧКА. Уровень до первой точки задаёт снимок цепи взятого; он рисуется полкой, но
   ручки у него нет: двигать «состояние на старте» как точку значило бы править не автоматизацию, а сам
   снимок. Нужна точка раньше всех — её добавляют обычным способом, тапом в режиме вставки. */
const AUT_EPS=1e-9;
/* Взятые ДОРОЖКИ, от старшего к младшему, и их доли старта — одним проходом по событиям.
   ⛳ T4: ролей по взятым больше НЕ собираем. Прежде каждое взятое несло набор ключей своих ролей в этой
   дорожке, потому что дорожка могла держать несколько; теперь роль у дорожки одна, и каждое её взятое
   играло именно её — цепь одна на всю дорожку (laneChainKey). ⚠️ Одно ВЗЯТОЕ по-прежнему может нести
   несколько ролей (сплит) — но они лежат в РАЗНЫХ дорожках, и чужую цепь отсекает ключ точки (ent.key). */
function autTakesOf(layer){
  const m=new Map();
  for(const e of events) if(e.layer===layer){
    const tk=e.tk||0; let x=m.get(tk);
    if(!x) m.set(tk, x={tk, t0:e.t});
    if(e.t<x.t0) x.t0=e.t;
  }
  return [...m.values()].sort((a,b)=>b.tk-a.tk);      // старший первым: «последнее взятое» — это [0]
}
/* ВСЕ АДРЕСА, которые полоса может показать у этой дорожки: параметры эффектов её ОДНОЙ цепи.
   Порядок — порядок ЦЕПИ (он слышен с O-1): снимки ВСЕХ захваченных взятых, при расхождении порядок — у более старшего.
   S1: правки цепи (autChainAdd/Remove/Move) идут во все эти снимки сразу — список и правка смотрят в одно и то же. */
function autAddrs(layer){
  const out=[], key=laneChainKey(layer); if(!key) return out;
  /* ⛳ VOL-3: ГРОМКОСТЬ — ПЕРВОЙ, У КАЖДОЙ ДОРОЖКИ С РОЛЬЮ, и не из снимка захвата. Громкость есть у КАЖДОЙ ноты (поле a.vol),
     значит её полоса есть у каждой дорожки — в том числе у той, что захвата не имеет (вставленные в редакторе ноты). Вид и
     правка — из самих нот (autPoints → pnView), как у любого параметра «в ноте». Ниже, в обходе снимков, запись громкости
     пропускается (fxPerm), чтобы адрес не встал второй раз. */
  for(const meta of fxParamMetaOf(ENV.FX_VOL)) out.push({key, fx:ENV.FX_VOL, p:meta.key, labelKey:meta.labelKey, short:meta.short});
  for(const T of autTakesOf(layer).slice().reverse()){
    const rec=takeFx.get(T.tk); if(!rec) continue;
    const ch=rec.chains[key]; if(!ch) continue;
    for(const eff of ch) if(!fxPerm(eff.fxId)) for(const meta of fxParamMetaOf(eff.fxId)){   // громкость уже стоит первой (выше); прочие — в порядке цепи
      const i=out.findIndex(o=>o.fx===eff.fxId&&o.p===meta.key);
      if(i>=0) out.splice(i,1);                       // тот же адрес у более старшего взятого — порядок берём у него
      out.push({key, fx:eff.fxId, p:meta.key, labelKey:meta.labelKey, short:meta.short});
    }
  }
  /* ⛳ И ЭФФЕКТЫ, ДОБАВЛЕННЫЕ ПОСРЕДИ ВЗЯТОГО. Снимок цепи — это состав НА СТАРТЕ; эффект, добавленный по ходу, живёт в ленте
     записью состава (FX_CHAIN, поле ids) и своими величинами с той доли. Переигровка и заморозка его слышат, а полоса его не
     перечисляла — пока его не добавляли дорожке руками. Теперь его адреса стоят В КОНЦЕ списка, в порядке появления; их
     точки полоса берёт из ленты как обычно (autPointsCalc), а до первой точки полки нет — эффекта тогда и не было. */
  for(const T of autTakesOf(layer).slice().reverse()){
    const rec=takeFx.get(T.tk); if(!rec) continue;
    for(const ent of rec.lane){ if(ent.key!==key||ent.fx!==FX_CHAIN||!ent.ids) continue;
      for(const id of ent.ids){ if(fxPerm(id)||out.some(o=>o.fx===id)) continue;   // VOL-0: громкость есть в каждом составе — «добавленной посреди взятого» она не бывает
        for(const meta of fxParamMetaOf(id)) out.push({key, fx:id, p:meta.key, labelKey:meta.labelKey, short:meta.short}); } }
  }
  return out;
}
/* ТОЧКИ ОДНОГО АДРЕСА ПО ВСЕЙ ДОРОЖКЕ + УРОВЕНЬ ДО ПЕРВОЙ ТОЧКИ.
   base — величина из снимка САМОГО РАННЕГО взятого, которое этим адресом правит; ею рисуется полка слева.
   pts — записи дорожки (их и правит редактор) по времени; при равном времени старше тот, у кого больше
   tk, — тот же закон, что у переигровки. */
/* ⚠️ МЕМО НА ОДНУ ЗАПИСЬ, И ОНО ОБЯЗАТЕЛЬНО: autPoints зовёт ОТРИСОВКА, то есть 60 раз в секунду, а
   внутри — полный обход событий (autTakesOf) и всех дорожек захвата. На пятиминутной песне это десятки
   тысяч шагов НА КАДР. Ключ мемо — адрес плюс takeFxVer: версия поднимается КАЖДОЙ правкой захвата И
   каждой правкой нот (editCommit), то есть ровно тогда, когда ответ мог измениться. Одной записи хватает:
   полоса показывает РОВНО ОДИН адрес зараз (см. rollAut). */
/* ═══ V4b: ПАРАМЕТР «В НОТЕ» НА ПОЛОСЕ — ВИД И ПРАВКА ИЗ САМИХ НОТ ═══
   ⛳ ОДИН ИСТОЧНИК ПРАВДЫ. Величину параметра «в ноте» (fxIsPerNote: прицепочный модуля — Скольжение, яркость аккордов — и
   старые скаляры соло vib/drv/trm) переигровка и заморозка читают из СОБЫТИЯ НОТЫ. Значит и полоса обязана показывать и
   править ИМЕННО ЕГО: прежде она рисовала точки захвата, их правка не меняла ни одной ноты — видно одно, звучит другое.
   Точки захвата для этих адресов больше никто не читает (fxLaneMerge их пропускает); захват при этом не тронут.
   ⛳ ЧТО ТАКОЕ «ТОЧКА». Несут величину «вкл» и ведения ноты (pnCarrier) — каждое своё значение, по времени. Подряд идущие
   события с ОДНОЙ величиной — один ОТРЕЗОК; точка — его первое событие. Ступенька между точками — ровно то, что звучит:
   каждая нота берёт величину своего события, и до следующего события величина та же.
   ⛳ ГЛАДКАЯ АВТОМАТИЗАЦИЯ — ФОРМА И РАМПА ЖИВУТ В САМИХ СОБЫТИЯХ, в двух картах нагрузки по ключу адреса 'fxId:pKey':
     a.sh[адрес] = 's' — событие-ТОЧКА, в которую отрезок ВХОДИТ плавно (прямая от предыдущей точки);
                   'r' — событие ВНУТРИ плавного отрезка: его величина — точка прямой, ТОЧКОЙ оно не считается (pnPoints его пропускает);
     a.gen[адрес] = 1 — событие ПОРОЖДЕНО редактором ради этого адреса: ЯКОРЬ (точка посреди зажатой ноты — ведение на её доле) или
                   ШАГ РАМПЫ (ведение внутри зажатой ноты, чтобы голос ехал по прямой). Перестраивая адрес, редактор такие снимает и
                   кладёт заново; событие, нужное и другому адресу, остаётся (снимается только метка).
   Нет карт — ступенька, как было: всё записанное и всё, что пишет рука, звучит байт-в-байт по-прежнему. Звуку карты не нужны
   вовсе: движок читает только величины, а величины в событиях уже стоят на прямой.
   ⛳ ПРАВКА — ПЕРЕСТРОЙКА АДРЕСА ИЗ СПИСКА ТОЧЕК (pnPlan, ОДНА функция на все правки): точки полосы → где каждая вступает
   (на событии этой доли; посреди зажатой ноты — якорем; между нотами — на первом событии после неё, как и прежде) → каждому
   событию дорожки величина и метка по закону «ступенька или прямая» → шаги рампы внутри зажатых нот. Полоса после правки
   перестраивается из нот — точка встаёт туда, где величина действительно вступила, а не туда, куда ткнули.
   ⛳ ПРЕДЕЛ «ТОЧКА ПОСРЕДИ ЗАЖАТОЙ НОТЫ НЕ РОЖДАЕТ СОБЫТИЯ» СНЯТ этим же слайсом: её держит якорь, иначе нарастание внутри ОДНОЙ
   долгой ноты поставить было бы некуда.
   ⛳ ПРАВКА — ОДНА ЗАПИСЬ ИСТОРИИ И ОДИН СБРОС: ходы 'del' (прежние порождённые), 'move' (нагрузка — НОВЫМ объектом, время и
   замороженный лад нетронуты — правило #7) и 'ins' (новые порождённые) собирает editBatch (правило #28); editCommit поднимает
   версию правки дорожки — замороженная устаревает.
   ⛳ «НЕ ЗАДАНО» — ОТСУТСТВИЕ величины в событии: нота играет СЕГОДНЯШНЕЕ умолчание роли (у Скольжения — 20/12 мс, у яркости —
   открытый фильтр, у скаляров — ноль). Рисуется на уровне умолчания (fxDefaultsOf — та же шкала, что у меню); ведущий
   отрезок «не задано» — полка без ручки, как снимок старта у ленты. */
const pnCarrier=fn=> fn==='leadOn'||fn==='leadSet'||fn==='bassOn'||fn==='bassSet'||fn==='chOn'||fn==='chSet'||fn==='drum';   // удар несёт свою карту (яркость ударных), как «вкл» ноты
const pnSame=(x,y)=> (x==null&&y==null) || (x!=null&&y!=null&&Math.abs(x-y)<1e-6);
/* Величина в событии (0..1) либо null — «не задано». Где лежит — по объявлению (fxNoteField) И РОЛИ события: своё поле или
   карта a.fx (яркость — поле a.bri у аккордов, карта у соло/баса/ударных). */
function pnGet(ev,fxId,pKey){
  const a=ev.a, nf=fxNoteField(fxId,pKey,evRole(ev.fn));
  if(nf){ const x=a&&a[nf.key]; return x==null ? null : (nf.inv?1-x:x); }
  const m=a&&a.fx, x=m?m[fxId+':'+pKey]:undefined; return x==null ? null : x;
}
/* НОВАЯ нагрузка с этой величиной (v=null — снять). Карта — тоже новым объектом: записанная карта неизменяема (см. push).
   ⚠️ БАС: опустевшая карта снимается ЦЕЛИКОМ — отсутствие карты у баса и есть «не задано», событие снова байт-в-байт как без
   Скольжения. СОЛО: карта остаётся всегда — у соло её ОТСУТСТВИЕ значит «звучи живой цепью» (правило R2 в applyFx). */
function pnWith(ev,fxId,pKey,v){
  const a=ev.a||{}, nf=fxNoteField(fxId,pKey,evRole(ev.fn)), b={...a};
  if(nf){ if(v==null){ if(!nf.required) delete b[nf.key]; } else b[nf.key]= nf.inv?1-v:v; return b; }   // VOL-3: ОБЯЗАТЕЛЬНОЕ поле (громкость) не снимается никогда — второй рубеж после pnPlan
  const k=fxId+':'+pKey, m={...(a.fx||{})};
  if(v==null) delete m[k]; else m[k]=v;
  if(Object.keys(m).length || ev.fn[0]==='l') b.fx=m; else delete b.fx;
  return b;
}
/* Умолчание адреса в 0..1 — уровень «не задано» на полосе. Та же шкала, что у меню и захвата (fxDefaultsOf, с defBy владельца). */
const pnDef=(key,fxId,pKey)=>{ const i=fxParamKeysOf(fxId).indexOf(pKey), d=fxDefaultsOf(fxId,key); return i>=0&&d[i]!=null ? d[i] : 0; };
/* Метки гладкой автоматизации (см. шапку): форма ('s'/'r') и «порождено ради адреса». Ключ адреса — 'fxId:pKey', как в карте a.fx. */
const pnMk=(fxId,pKey)=>fxId+':'+pKey;
const pnShOf=(e,mk)=>{ const s=e.a&&e.a.sh; return s?s[mk]:undefined; };
const pnGenOf=(e,mk)=>{ const g=e.a&&e.a.gen; return !!(g&&g[mk]); };
/* НОВАЯ нагрузка с меткой формы sh (undefined — снять) и флагом «порождено» для адреса mk. Пустые карты снимаются целиком —
   событие без меток байт-в-байт как до гладкой автоматизации. */
function pnMarks(a,mk,sh,gen){
  const b={...a}, s={...(a.sh||{})}, g={...(a.gen||{})};
  if(sh) s[mk]=sh; else delete s[mk];
  if(gen) g[mk]=1; else delete g[mk];
  if(Object.keys(s).length) b.sh=s; else delete b.sh;
  if(Object.keys(g).length) b.gen=g; else delete b.gen;
  return b;
}
/* ТОЧКИ АДРЕСА: события дорожки, несущие величину, по времени (массив отсортирован — редактор открыт только вне записи).
   Точка — событие, с которого величина МЕНЯЕТСЯ; события внутри плавного отрезка ('r') точками не бывают. Метка 's' делает точкой
   и событие с прежней величиной — это плоский кусок перед подъёмом (pnPlan ставит её ровно для этого случая).
   leadUnset — перед первой точкой есть события БЕЗ величины (ведущее «не задано»): туда можно поставить точку (pnAdd). */
/* ⛳ g0 (слайс «запись отражает плавность руки») — доля ПОСЛЕДНЕГО события предыдущего отрезка с той же величиной (события «внутри
   плавного» 'r' не в счёт). Это миг, до которого величина ТОЧНО стояла: у записанного движения после паузы там лежит ведение
   УДЕРЖАНИЯ (fineStep), и плавный вход в точку начинается ОТТУДА, а не от начала отрезка — иначе прямая ползла бы через всю паузу.
   Рисунок ведёт прямую ОТ g0 (до него — ровно: записанная пауза). У поставленного рукой 's' внутри отрезка события перестроены по прямой ('r'), так
   что g0 там совпадает с долей предыдущей точки — и форма человека едет от точки, как и прежде.
   sh: 's' / 'h' — форма человека; нет — записанная точка (отрезок в неё плавный; паузу записанного несёт ведение удержания). */
function pnPoints(layer,fxId,pKey){
  const mk=pnMk(fxId,pKey), pts=[]; let cur=null, end=null;
  pts.leadUnset=false;
  for(const e of events){ if(e.layer!==layer||!pnCarrier(e.fn)) continue;
    const v=pnGet(e,fxId,pKey), s=pnShOf(e,mk);
    if(!cur){ cur={t:e.t, v, sh:undefined, ev:e}; end=e.t; if(v!=null) pts.push(cur); else pts.leadUnset=true; continue; }
    if(s==='r') continue;
    if(pnSame(v,cur.v) && !(s==='s' && e.t>cur.t+AUT_EPS)){ end=e.t; continue; }
    cur={t:e.t, v, sh: (s==='s'||s==='h')?s:undefined, ev:e, g0:end}; pts.push(cur); end=e.t;
  }
  return pts;
}
/* ФОРМА ОТРЕЗКА, ВХОДЯЩЕГО В ТОЧКУ i, — тем же законом, что у шины (autSmoothOf), промежуток — от g0. 's'/'h' — форма человека. */
function pnEffSh(P,i){
  const p=P[i]; if(!p) return undefined;
  if(p.sh) return p.sh;
  if(i<=0||p.v==null||P[i-1].v==null) return 'h';
  return autSmoothOf({t:(p.g0??P[i-1].t), v:P[i-1].v}, p) ? 's' : 'h';
}
/* ВИД ДЛЯ ПОЛОСЫ — в той же форме, что у ленты ({base, baseT, pts}), плюс per (адрес «в ноте») и spans — где у дорожки ЗВУЧАТ
   ноты: вне их величина не звучит ни на чём, и draw рисует там линию приглушённой (ноты берём из songNotes — единственного
   спаривания «вкл»/«выкл», правило редактора). */
function pnView(layer,key,fxId,pKey){
  const pts=[], P=pnPoints(layer,fxId,pKey);
  /* VOL-3: у ОБЯЗАТЕЛЬНОГО поля (громкость) «не задано» нет — полка слева до первой точки стоит на величине ПЕРВОЙ ноты, а не на
     уровне умолчания: ей там просто не на чем звучать (линия приглушена — там нет нот), и уровень умолчания ничего бы не значил. */
  const d = pnReq(fxId,pKey,laneRoleOf(layer)) && P.length && P[0].v!=null ? P[0].v : pnDef(key,fxId,pKey);
  /* ⛳ smooth — ТОТ ЖЕ закон, что у шины и у переигровки (pnEffSh → autSmoothOf): draw ведёт прямую, ui показывает ╱/⌐. g0 — откуда
     прямая начинается у ЗАПИСАННОЙ точки (после паузы — от ведения удержания, см. pnPoints); у формы человека — от предыдущей точки.
     ⛳ ЗВУК ТУТ ЖЕ: величина «в ноте» звучит из событий, и записанное движение лежит в них КАЖДОЙ единицей (тонкая запись, fineStep) —
     ровно та плотность, с какой редактор кладёт ведения рампы поставленному рукой плавному отрезку (AUT_RAMP_EPS = 0.01). Голос
     ведёт каждую ступень своей τ 40–50 мс — плавный отрезок записанного звучит так же, как нарисованный рукой, без добавленных
     событий. */
  P.forEach((r,i)=>{   // ведущее «не задано» точкой не бывает (pnPoints) — это полка (base), ручки нет
    const sh=pnEffSh(P,i), smooth= sh==='s' && i>0 && r.v!=null && P[i-1].v!=null;   // от «не задано» ехать не от чего — как и прежде
    pts.push({ per:true, smooth, g0: smooth && !r.sh && r.g0!=null ? r.g0 : null,
               pt:{ t:r.t, v:r.v==null?d:r.v, unset:r.v==null, sh:r.sh, pn:{layer,key,fx:fxId,p:pKey} } });   // sh — форма человека ('s'/'h') или нет (записанная)
  });
  /* У УДАРНЫХ «пауз» в этом смысле нет: удар — миг, его величина звучит в миг удара, и приглушать линию между ударами значило
     бы приглушить её всю. Поэтому для дорожки ударных spans не отдаём — линия рисуется целиком. */
  if(laneRoleOf(layer)==='dr') return { base:d, baseT:0, pts, per:true, spans:null };
  const sp=[];
  for(const n of songNotes().notes) if(n.layer===layer&&n.role!=='dr') sp.push([n.start, n.end==null?Infinity:n.end]);
  sp.sort((a,b)=>a[0]-b[0]);
  const spans=[]; for(const s of sp){ const L=spans[spans.length-1]; if(L&&s[0]<=L[1]) L[1]=Math.max(L[1],s[1]); else spans.push([s[0],s[1]]); }
  return { base:d, baseT:0, pts, per:true, spans };
}
/* ═══ ⛔ ИНВАРИАНТ VOL-3: ГРОМКОСТЬ У НОТЫ НЕ СНИМАЕТСЯ НИКОГДА ═══
   Параметр с ОБЯЗАТЕЛЬНЫМ полем в событии (объявление note.required — сегодня только громкость, поле a.vol) не бывает «не задан»:
   нота без громкости дала бы движку undefined, то есть NaN в гейне, а в лучшем случае — тишину по случайности. Держится ТРЕМЯ
   рубежами, все здесь, где живут пер-нотные правки полосы:
     1. pnPlan (ниже) — ЕДИНСТВЕННЫЙ производитель пер-нотных ходов — у обязательного поля берёт ведущую величину из первой
        точки (а не «не задано») и без единой точки отказывает;
     2. pnWith не удаляет обязательное поле, даже если его попросят (второй рубеж);
     3. операции полосы подставляют НАСТОЯЩУЮ величину вместо «не задано»: удаление ПЕРВОЙ точки отдаёт её отрезку величину
        СЛЕДУЮЩЕГО (а не «не задано»); единственный отрезок удалить нельзя; сдвиг первой точки ПОЗЖЕ отказывает (левее неё
        нет величины, которую отдать). Снять громкость с дорожки (autChainRemove) и переставить её (autChainMove) нельзя —
        она постоянная (fxPerm).
   ⚠️ Это НЕ запрет на тишину: громкость 0 — законная величина, её можно поставить точкой. Запрет — на ОТСУТСТВИЕ величины. */
const pnReq=(fxId,pKey,role)=>{ const nf=fxNoteField(fxId,pKey,role); return !!(nf&&nf.required); };
/* ═══ ПЕРЕСТРОЙКА АДРЕСА ИЗ СПИСКА ТОЧЕК (гладкая автоматизация) — ОДНА функция на все правки полосы «в ноте» ═══
   want — желаемые точки по времени: {t, v (null — «не задано»), sh ('s' — въезжать плавно), me (это та точка, которую правят)}.
   Отдаёт {list — ходы для editBatch, P — точки, как они ВСТУПЯТ}, либо null (обязательному полю не осталось ни одной точки).
   ⛳ ПОЧЕМУ ВЕДЕНИЯ, А НЕ РАМПА В ГОЛОСЕ. Величину «в ноте» голос берёт из СОБЫТИЙ, и её же читают переигровка, догонялка, шов
   заморозки и рендер. Рампа в голосе потребовала бы нового поля события («ехать к v до доли t»), перевода долей в секунды в
   каждом из этих путей (темп, шов скобы, вход посреди рампы) и своей кривой у каждого параметра (громкость — v², яркость — лог
   герц, скаляры — свои глубины), то есть пяти новых дорог звука. Ведения не требуют НИ ОДНОЙ: это обычные события, их уже
   умеет каждый путь, и заморозка повторяет их по построению. Цена названа: события — не больше ста на ноту за весь ход (порог
   AUT_RAMP_EPS), и правка ноты (перенос, длина) рампу не перестраивает — перестроит следующая правка этой полосы.
   ⚠️ Скольжение (fxNoteFollows=false) ведений не получает: голос читает его лишь на смене высоты, и там оно уже стоит на прямой. */
function pnPlan(layer,fxId,pKey,want){
  const mk=pnMk(fxId,pKey), req=pnReq(fxId,pKey,laneRoleOf(layer)), follow=fxNoteFollows(fxId,pKey);
  const xOnly=e=>{ const g=e.a&&e.a.gen; return !!(g&&g[mk]) && Object.keys(g).length===1; };   // порождено ТОЛЬКО ради этого адреса — снимается и кладётся заново
  const car=events.filter(e=>e.layer===layer&&pnCarrier(e.fn));
  const drop=car.filter(xOnly), keep=car.filter(e=>!xOnly(e));
  const notes=songNotes().notes.filter(n=>n.layer===layer&&n.role!=='dr');   // удар — миг: посреди него точке не встать, рампе ехать не в чем
  const heldAt=t=>notes.filter(n=>n.start<t-AUT_EPS && (n.end==null||n.end>t+AUT_EPS));
  /* 1) ГДЕ ТОЧКА ВСТУПАЕТ: на событии этой доли; посреди зажатой ноты — ЯКОРЕМ на своей доле; между нотами — на первом событии
        после неё (там величина и вступит; прежнее правило). Две точки на одной доле — побеждает поздняя по списку, а правленая
        (me) — всегда. */
  let P=[];
  for(const w of want){
    const at=keep.find(e=>Math.abs(e.t-w.t)<AUT_EPS);
    let te=null, anchor=false;
    if(at) te=at.t;
    else if(follow && heldAt(w.t).length){ te=w.t; anchor=true; }  // якорь. ⚠️ Скольжению — нет: его читают лишь на смене высоты, и точка вступает там (ниже)
    else { const nx=keep.find(e=>e.t>w.t); if(nx) te=nx.t; }
    if(te==null) continue;                                          // после последней ноты точке звучать не на чем
    const q={t:te, v:w.v, sh:w.sh, me:w.me, anchor};
    if(P.length && Math.abs(P[P.length-1].t-te)<AUT_EPS){ if(!P[P.length-1].me || q.me) P[P.length-1]=q; }   // правленая точка (me) не уступает соседу, на чьё событие она съехала
    else P.push(q);
  }
  /* 2) ЧИСТКА. Точка с прежней величиной не нужна — кроме плоского куска перед плавным подъёмом: там она держит начало прямой и
        становится 's' (плоская прямая звучит как ступенька, а меткой её видно pnPoints). Плавно въезжать можно лишь из точки с
        величиной в точку с величиной — иначе форма снимается (от «не задано» ехать не от чего). */
  const Q=[];
  for(let i=0;i<P.length;i++){ const p=P[i], pr=Q[Q.length-1], nx=P[i+1];
    if(!pr && !req && p.v==null) continue;                          // «не задано» первой точкой — то же, что ведущее «не задано»
    if(pr && pnSame(p.v,pr.v)){ if(nx && nx.sh==='s' && p.v!=null && nx.v!=null) p.sh='s'; else { if(p.me&&Q.length) Q[Q.length-1].me=true; continue; } }
    if(p.sh==='s' && !(pr && pr.v!=null && p.v!=null)) p.sh='h';   // ехать не от чего — СТУПЕНЬКА ЧЕЛОВЕКА, а не «нет формы» (иначе её начал бы выводить закон движения записанного)
    Q.push(p);
  }
  P=Q;
  if(req && !P.length) return null;
  const lead= req ? P[0].v : null;                                  // VOL-3: у обязательного поля левее первой точки — ЕЁ величина, не «не задано»
  const idxAt=t=>{ let i=-1; for(let k=0;k<P.length&&P[k].t<=t+AUT_EPS;k++) i=k; return i; };
  const valAt=t=>{ const i=idxAt(t); if(i<0) return lead;
    const p=P[i], q=P[i+1];
    if(q && q.sh==='s' && t>p.t+AUT_EPS) return p.v+(q.v-p.v)*(t-p.t)/(q.t-p.t);   // ПРЯМАЯ в шкале 0..1 — той, в которой рисует полоса
    return p.v; };
  const markAt=t=>{ const i=idxAt(t); if(i<0) return undefined;
    if(Math.abs(P[i].t-t)<AUT_EPS) return P[i].sh;                 // событие точки — форма входящего отрезка
    const q=P[i+1]; return q&&q.sh==='s' ? 'r' : undefined; };      // внутри плавного — метка «часть прямой»
  /* 3) ХОДЫ: прежние порождённые — снять; каждому событию — величина и метка; новые порождённые — положить. */
  const list=[];
  if(drop.length) list.push({ kind:'del', evs:drop });
  const atPt=t=>P.some(p=>Math.abs(p.t-t)<AUT_EPS);
  for(const e of keep){
    const v=valAt(e.t), m=markAt(e.t);
    /* ПОРОЖДЁННОЕ ДРУГИМ АДРЕСОМ, но служащее и этому (точка или шаг рампы на той же доле) — помечаем и этим адресом: иначе
       перестройка того адреса сняла бы событие, и здесь на его доле осталась бы дыра. */
    const gx = !!(e.a&&e.a.gen) && (m==='r' || atPt(e.t));
    if(pnSame(pnGet(e,fxId,pKey),v) && pnShOf(e,mk)===m && pnGenOf(e,mk)===gx) continue;   // уже так — не ход (↶ не должен «ничего не делать»)
    list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t, a:pnMarks(pnWith(e,fxId,pKey,v),mk,m,gx)} });
  }
  /* ПОРОЖДЁННОЕ ВЕДЕНИЕ ноты n на доле T: копия её последнего события не позже T — ступень, регистр, ключ владельца (a.v/a.k),
     замороженный лад (правило #7), номер взятого (⤺ снимет его вместе с нотой). Без связки T3 и без бенда (они — атаки).
     ⚠️ СОЛО: hold:true ТОЛЬКО у ноты терменвокса — такое ведение частоты не несёт и бенд не сбивает. У обычной ноты hold был бы
     ложью: догонялка прочла бы ведение как терменвоксное и подняла ноту на ступени АТАКИ, а не на той, где она звучит.
     ⚠️ ЧУЖИЕ АДРЕСА, чья прямая идёт через T, получают точку СВОЕЙ прямой (между соседними событиями ноты — это она и есть),
     а не прошлую величину: иначе ведение громкости откатывало бы идущую рампу яркости на шаг назад. */
  const setFn={ld:'leadSet', bs:'bassSet', ch:'chSet'};
  const mkEv=(n,T,m,v)=>{
    let src=null, nxt=null;
    for(const x of n.evs){ if(!pnCarrier(x.fn)||xOnly(x)) continue; if(x.t<=T+AUT_EPS) src=x; else { nxt=x; break; } }
    if(!src) return null;
    const fn=setFn[n.role];
    let a={...src.a}; delete a.tie; delete a.bend; delete a.sh; delete a.gen;
    if(n.role==='ld'){ const th=src.a.hold || ldTherm(n); if(th) a.hold=true; else delete a.hold; }   // S0: тот же тест терменвокса, что у songSegs (ldTherm) — истинность прежняя
    else delete a.inst;                                              // ведения баса и аккорда тембра не несут (T0)
    const ss=src.a.sh||{}, ns=(nxt&&nxt.a.sh)||{}, sh={};
    for(const k of new Set([...Object.keys(ss),...Object.keys(ns)])){ if(k===mk) continue;
      const inR = ns[k]==='r'||ns[k]==='s';
      if(!(ss[k]==='r'||inR)) continue;
      sh[k]='r';
      if(inR && nxt.t>src.t){ const c=k.indexOf(':'), f=k.slice(0,c), p=k.slice(c+1), v0=pnGet(src,f,p), v1=pnGet(nxt,f,p);
        if(v0!=null&&v1!=null) a=pnWith({fn,a},f,p, v0+(v1-v0)*(T-src.t)/(nxt.t-src.t)); }
    }
    if(Object.keys(sh).length) a.sh=sh;
    const e={ t:T, layer:src.layer, fn, a:pnMarks(pnWith({fn,a},fxId,pKey,v),mk,m,true), sc:src.sc, sev:src.sev, tk:src.tk };
    if(src.jam) e.jam=true;
    return e;
  };
  const ins=[];
  /* ЯКОРЬ — только у точки, под которой нет ни одного события дорожки, и тогда в КАЖДУЮ ноту, зажатую на её доле: полоса одна на
     дорожку, и поставленная посреди звука величина вступает у всего, что звучит.
     ⚠️ Точке, стоящей НА событии, якорей в чужих зажатых нотах НЕ кладём, и это защита, а не экономия: перестройка обходит ВСЕ
     точки адреса, а у записанного полифонично (две руки, свои громкости) точки чередуются по рукам — якоря у каждой переписали бы
     каждой ноте величину соседней руки по всей дорожке от первой же правки. Там величина вступает, как и прежде, на следующем
     событии ноты. */
  for(const p of P) if(p.anchor) for(const n of heldAt(p.t)){ const e=mkEv(n,p.t,p.sh,p.v); if(e) ins.push(e); }
  if(follow) for(let i=1;i<P.length;i++){ const p=P[i-1], q=P[i]; if(q.sh!=='s') continue;
    for(const n of notes){
      const lo=Math.max(p.t,n.start), hi=Math.min(q.t, n.end==null?Infinity:n.end);
      if(!(hi>lo+AUT_EPS)) continue;
      const own=n.evs.filter(x=>pnCarrier(x.fn)&&!xOnly(x));
      let last=valAt(lo);
      /* Сетка шагов — от начала ОТРЕЗКА (а не ноты и не такта): перестройка того же отрезка кладёт шаги на те же доли. */
      for(let k=Math.floor((lo-p.t)/AUT_RAMP_BEAT)+1; ; k++){ const T=p.t+k*AUT_RAMP_BEAT;
        if(T>=hi-AUT_EPS) break;
        if(T<=lo+AUT_EPS) continue;
        const v=valAt(T); if(Math.abs(v-last)<AUT_RAMP_EPS) continue;
        last=v;
        if(own.some(x=>Math.abs(x.t-T)<AUT_EPS)) continue;          // своё событие на этой доле уже есть — величину ему дал проход выше
        const e=mkEv(n,T,'r',v); if(e) ins.push(e);
      }
    }
  }
  if(ins.length) list.push({ kind:'ins', evs:ins });
  return { list, P };
}
/* Точка списка — по её доле и величине (объекты точек пересобираются после каждой правки, держаться за них нельзя). */
function pnLocate(P,pt){
  return P.findIndex(r=> Math.abs(r.t-pt.t)<AUT_EPS && pnSame(r.v, pt.unset?null:pt.v));
}
const pnWant=P=>P.map(p=>({t:p.t, v:p.v, sh:p.sh}));
/* Доля, на которой ВСТУПИЛА правленая точка (me), — туда и ставим выделение. */
const pnAt=(R,t)=>{ const p=R.P.find(q=>q.me); return p?p.t:t; };
/* Точка вида, которую выделить после правки: первая на доле ≥ t (там величина и вступила). Объект — ИЗ мемо autPoints, поэтому
   ui находит его в D.pts простым сравнением. */
function pnPick(P,t){ const D=autPoints(P.layer,P.key,P.fx,P.p); return D.pts.find(r=>r.pt.t>=t-AUT_EPS) || null; }
/* ПЕРЕНОС ТОЧКИ. Величина — у точки (её отрезок до следующей); время — зажато между соседями: дотянул до соседа — перенесённая
   его ЗАМЕНЯЕТ (прежде перенос «перетирал» всех, через кого проехал; с формами отрезков это давало бы непредсказуемые прямые).
   Форма точки едет вместе с ней. */
/* ⛳ ПРАВЛЕНАЯ ТОЧКА ДЕРЖИТ ТУ ФОРМУ, ЧТО БЫЛА ВИДНА (тот же закон, что у шины, autFreeze): записанная точка без своей формы получает
   выведенную ('s'/'h') — у правленой и у соседа справа. flat — только для САМОЙ правленой точки: если её выведенный плавный вход
   начинался ПОСЛЕ удержания (g0 позже предыдущей точки), форма человека поехала бы от предыдущей ТОЧКИ — через всю паузу; поэтому
   перед ней кладётся плоская точка на g0 с прежней величиной (pnPlan такую держит: «плоский кусок перед плавным подъёмом»). Соседу
   справа плоской точки не даём — её величина была бы величиной правленой точки, а та сейчас меняется; там форма остаётся выводимой. */
function pnFreeze(want,P,j,flat){
  const p=P[j]; if(!p||p.sh||!want[j]) return;
  const sh=pnEffSh(P,j), late= sh==='s' && p.g0!=null && j>0 && p.g0>P[j-1].t+AUT_EPS;
  if(late && !flat) return;
  want[j].sh=sh;
  if(late) want.splice(j,0,{ t:p.g0, v:P[j-1].v });
}
function pnMove(pt,t,v){
  if(!editGuard()) return false;
  const A=pt.pn, P=pnPoints(A.layer,A.fx,A.p), i=pnLocate(P,pt); if(i<0) return false;
  const want=pnWant(P); want[i].me=true;
  pnFreeze(want,P,i+1,false); pnFreeze(want,P,i,true);             // сосед справа ПЕРВЫМ: его заморозка индексов не сдвигает, а плоская точка правленой — сдвигает
  const k=want.findIndex(w=>w.me);
  if(Math.abs(t-pt.t)>AUT_EPS){                                    // ВРЕМЯ — соседи по списку ЖЕЛАНИЙ (с плоской точкой, если она легла)
    const lo= k>0 ? want[k-1].t : 0, hi= k+1<want.length ? want[k+1].t : Infinity;
    const b=Math.max(lo,Math.min(hi,Math.max(0,t)));
    if(k===0 && b>want[0].t && pnReq(A.fx,A.p,laneRoleOf(A.layer))) return false;   // VOL-3: первая точка громкости ПОЗЖЕ — левее неё величина та же (ведущая = первая), правка ничего бы не сдвинула, кроме лишнего якоря
    want[k].t=b;
    if(k>0 && Math.abs(b-lo)<AUT_EPS) want.splice(k-1,1);
    else if(k+1<want.length && Math.abs(b-hi)<AUT_EPS) want.splice(k+1,1);
  }else want[k].v=Math.max(0,Math.min(1,v));                       // ВЕЛИЧИНА
  const R=pnPlan(A.layer,A.fx,A.p,want);
  if(!R||!editBatch(R.list)) return false;                         // пусто — не правка (↶ не должен «ничего не делать»)
  return pnPick(A,pnAt(R,pt.t)) || true;
}
/* УДАЛЕНИЕ. Отрезок уходит к предыдущей величине. VOL-3: у ОБЯЗАТЕЛЬНОГО поля ведущая величина — первой точки, поэтому при
   удалении первой её место занимает следующая; единственную удалить нечем заменить — отказ (pnPlan вернёт null). */
function pnDelete(pt){
  if(!editGuard()) return false;
  const A=pt.pn, P=pnPoints(A.layer,A.fx,A.p), i=pnLocate(P,pt); if(i<0) return false;
  const want=pnWant(P);
  pnFreeze(want,P,i+1,false);                                      // сосед справа теперь въезжает от предыдущей — его видимая форма застывает (без плоской точки, см. pnFreeze)
  want.splice(i,1);
  const R=pnPlan(A.layer,A.fx,A.p,want);
  return !!R && editBatch(R.list);
}
/* НОВАЯ ТОЧКА — ПЛАВНАЯ, если перед ней есть точка с величиной (решение: поставленное рукой въезжает плавно). Ставится и ПОСРЕДИ
   зажатой ноты (якорь). До первой точки — только в ведущее «не задано» (как прежде): иначе новая первая точка тихо переписала
   бы все ноты левее неё. На доле существующей точки — это правка её величины. */
function pnAdd(layer,key,fxId,pKey,t,v){
  if(!editGuard()) return null;
  const P=pnPoints(layer,fxId,pKey); let j=-1;
  for(let i=0;i<P.length;i++){ if(P[i].t<=t+AUT_EPS) j=i; else break; }
  if(j<0 && !P.leadUnset) return null;                             // до первой ТОЧКИ нот без величины нет — покрывать нечего
  const want=pnWant(P), x=Math.max(0,Math.min(1,v));
  pnFreeze(want,P,j+1,false);                                      // сосед справа теперь въезжает от новой точки — его видимая форма застывает (индексов не сдвигает)
  if(j>=0 && Math.abs(P[j].t-t)<AUT_EPS){ want[j].me=true; pnFreeze(want,P,j,true); want[want.findIndex(w=>w.me)].v=x; }   // на доле точки — правка её величины, как перенос по величине
  else want.splice(j+1,0,{ t, v:x, sh: j>=0&&P[j].v!=null ? 's' : 'h', me:true });   // форма поставленной точки — ВСЕГДА человеческая: без неё её форму начал бы выводить закон движения
  const R=pnPlan(layer,fxId,pKey,want);
  if(!R||!editBatch(R.list)) return null;                          // между t и следующей нотой нет — точке негде звучать
  const r=pnPick({layer,key,fx:fxId,p:pKey},pnAt(R,t)); return r?r.pt:null;
}
/* ФОРМА ОТРЕЗКА, ВХОДЯЩЕГО В ТОЧКУ: плавно ↔ ступенькой. Отказ у первой точки и у «не задано» — ехать не от чего. */
function pnShape(pt){
  if(!editGuard()) return false;
  const A=pt.pn, P=pnPoints(A.layer,A.fx,A.p), i=pnLocate(P,pt); if(i<=0) return false;
  if(P[i].v==null || P[i-1].v==null) return false;
  const want=pnWant(P); want[i].sh= pnEffSh(P,i)==='s' ? 'h' : 's'; want[i].me=true;   // переключаем ВИДИМУЮ форму (у записанной — выведенную) и делаем её формой человека
  const R=pnPlan(A.layer,A.fx,A.p,want);
  if(!R||!editBatch(R.list)) return false;
  return pnPick(A,pnAt(R,pt.t)) || true;
}
/* Снять величину адреса со ВСЕХ нот дорожки (для снятия голосового эффекта с дорожки, autChainRemove) — той же перестройкой без
   единой точки: величины уходят, метки снимаются, порождённые ради адреса ведения удаляются.
   ⚠️ Планы параметров одного эффекта строятся по ОДНОМУ исходному состоянию; у сегодняшних голосовых модулей параметр «в ноте»
   один (громкость, яркость, скольжение, скаляры), так что ходы двух планов по одному событию не встречаются. Появится модуль с
   двумя — строить второй план после применения первого. */
function pnStripMoves(layer,fxId){
  const list=[];
  for(const pk of fxParamKeysOf(fxId)) if(fxIsPerNote(fxId,pk)){ const R=pnPlan(layer,fxId,pk,[]); if(R) list.push(...R.list); }
  return list;
}
/* ═══ OWN2: THE BEND CURVE OF A THEREMIN NOTE, EDITED BY ITS POINTS ═══
   a.bend on the note-on — [{dt, c, sh?, k?}]: beats from the note start, cents from its attack pitch; a segment's shape on its end point
   (config.js, BEND-CURVE: 's' glide, 'h' step, k curvature; no sh = a recorded point, a step as before).
   op 'move' (i, dt, c), 'add' (dt, c), 'del' (i). The first point stays at dt 0 (only its cents move) and cannot be deleted; times stay
   strictly increasing (a move is clamped between its neighbours) and inside the note (before its end); cents are whole, clamped ±2400.
   ⛳ BEND-CURVE: a point the person adds or moves GLIDES in and out — it gets sh 's', and so does the next point when it has no shape of
   its own (a recorded one); after a delete the next point glides from the previous one the same way. Explicit shapes are kept.
   A NEW payload with a new array (the old one goes to the history whole — S5's rule; a later shortening trims it with bendTrim as
   before); one editor step of the one history. → the point's index after the edit, or false (refused or nothing changed). */
const BEND_C_MAX=2400, BEND_EPS=1e-6;
let bendInPlace=false; const bendDbg=v=>{ bendInPlace=!!v; };   // probe CONTROL only: the array changed in place — ↶ cannot bring it back
/* the curve after one point edit — pure (the editor and the drag ghost, draw.rollBendHandles): { B, at } or null (refused / no change) */
function bendEdited(B,op,i,dt,c,len){
  const cc=x=>Math.max(-BEND_C_MAX,Math.min(BEND_C_MAX,Math.round(+x||0)));
  const glideIn=(B2,j)=>{ const q=B2[j]; if(j>0 && q && !q.sh) B2[j]={ ...q, sh:'s' }; };
  let B2=B.slice(), at=i;
  if(op==='move'){ if(!(i>=0&&i<B.length)) return null;
    const lo= i>0 ? B[i-1].dt+BEND_EPS : 0, hi= i+1<B.length ? B[i+1].dt-BEND_EPS : len-BEND_EPS;
    const p={ ...B[i], dt: i===0 ? 0 : Math.max(lo,Math.min(hi,+dt||0)), c:cc(c) };
    if(p.dt===B[i].dt && p.c===B[i].c) return null;
    B2[i]=p; glideIn(B2,i); glideIn(B2,i+1); }
  else if(op==='add'){ if(!(dt>BEND_EPS && dt<len-BEND_EPS) || B.some(p=>Math.abs(p.dt-dt)<BEND_EPS)) return null;
    at=B.findIndex(p=>p.dt>dt); if(at<0) at=B.length; B2.splice(at,0,{ dt, c:cc(c), sh:'s' }); glideIn(B2,at+1); }
  else if(op==='del'){ if(!(i>0&&i<B.length)) return null; B2.splice(i,1); at=i-1; glideIn(B2,i); }
  else return null;
  return { B:B2, at };
}
const bendNoteOf=ev=>{
  if(!editGuard()||!ev||ev.fn!=='leadOn'||ev.layer!==editLayer()) return null;
  const B=ev.a&&ev.a.bend; if(!B||!B.length) return null;
  const n=songNotes().notes.find(x=>x.head===ev); return n ? { B, len: n.end==null ? Infinity : n.end-n.start } : null; };
function bendCommit(ev,B,B2){
  const from={t:ev.t, a:ev.a};
  if(bendInPlace){ B.length=0; B.push(...B2); }
  const to={t:ev.t, a: bendInPlace ? ev.a : { ...ev.a, bend:B2 }};
  editPush({ kind:'move', label:'bend', ev, from, to }); ev.a=to.a; editCommit();
}
function editBendPoint(ev,op,i,dt,c){
  const N=bendNoteOf(ev); if(!N) return false;
  const R=bendEdited(N.B,op,i,dt,c,N.len); if(!R) return false;
  bendCommit(ev,N.B,R.B); return R.at;
}
/* BEND-CURVE: the shape of the segment that ends at point i (i ≥ 1): sh 's' glide / 'h' step; k (with 's') its curvature, −1..1 (0 =
   straight; undefined keeps the current one). One step of the one history (label 'bend'). → i, or false (refused / no change). */
function editBendShape(ev,i,sh,k){
  const N=bendNoteOf(ev); if(!N || !(i>0&&i<N.B.length) || (sh!=='s'&&sh!=='h')) return false;
  const q=N.B[i], p={ ...q, sh };
  if(sh==='s' && k!==undefined){ const kk=Math.max(-1,Math.min(1,Math.round((+k||0)*100)/100)); if(kk) p.k=kk; else delete p.k; }
  if(q.sh===p.sh && (q.k||0)===(p.k||0)) return false;
  const B2=N.B.slice(); B2[i]=p; bendCommit(ev,N.B,B2); return i;
}
/* ED5: VOLUME BARS — the Volume address per NOTE (a chord is one note, a drum hit is one): its value at the start and, when it changes
   inside the note, the note's own values [t, v]. Same field as the lane (pnGet 'vol:amt'); memoised on songNotes' identity (reset by
   schedInvalidate, rule #28). */
let pnBarsN=null, pnBarsL=null, pnBarsV=null;
function pnBars(layer){
  const N=songNotes(); if(pnBarsN===N && pnBarsL===layer) return pnBarsV;
  const out=[];
  for(const n of N.notes){ if(n.layer!==layer) continue;
    const car=n.evs.filter(e=>pnCarrier(e.fn)); if(!car.length) continue;
    const v=pnGet(car[0],ENV.FX_VOL,'amt'); if(v==null) continue;
    let path=null, last=v;
    for(const e of car){ const x=pnGet(e,ENV.FX_VOL,'amt'); if(x!=null && !pnSame(x,last)){ (path||(path=[[car[0].t,v]])).push([e.t,x]); last=x; } }
    out.push({ t:n.start, end:n.end, v, ev:n.head, evs:n.evs, path, role:n.role });
  }
  pnBarsN=N; pnBarsL=layer; pnBarsV=out; return out;
}
/* ED5: a bar drag — shift the volume of whole NOTES by d: every volume value of each note moves by d, clamped to 0..1 (rule #30: always a
   value). A bar is a note, not a moment: two notes on one beat (two hands, kick and hat) keep their own values, unlike the line, which
   holds one value per beat (pnPlan). The edited notes' own smooth marks for Volume become steps ('r'/'s' → 'h', generated-for-Volume
   flags dropped): their values have left the drawn line, and the lane must show what sounds. A segment head selects its whole note.
   One history entry; returns the notes' heads or false (nothing changed). */
function editVolSel(evs,d){
  if(!editGuard()||!evs||!evs.length||!Number.isFinite(d)) return false;
  const ly=editLayer(), mk=pnMk(ENV.FX_VOL,'amt'), want=new Set(evs), list=[], heads=[];
  for(const n of songNotes().notes){
    if(n.layer!==ly || !n.evs.some(e=>want.has(e))) continue;
    heads.push(n.head);
    for(const e of n.evs){ if(!pnCarrier(e.fn)) continue;
      const x=pnGet(e,ENV.FX_VOL,'amt'); if(x==null) continue;
      const y=Math.max(0,Math.min(1,Math.round((x+d)*1e6)/1e6)), s=pnShOf(e,mk), g=pnGenOf(e,mk), s2= s==='r'||s==='s' ? 'h' : s;
      if(pnSame(x,y) && s2===s && !g) continue;
      let a=pnWith(e,ENV.FX_VOL,'amt',y); if(s2!==s||g) a=pnMarks(a,mk,s2,false);
      list.push({ kind:'move', ev:e, from:{t:e.t, a:e.a}, to:{t:e.t, a} });
    }
  }
  return list.length && editBatch(list) ? heads : false;
}
/* probe only: every take's captured lane and chain snapshot as plain data (points sorted — their order in a lane carries no meaning) */
const takeFxDump=()=>JSON.stringify([...takeFx].sort((x,y)=>x[0]-y[0]).map(([tk,r])=>[tk, r.chains, r.lane.map(p=>JSON.stringify(p)).sort()]));
let autMemoK='', autMemoV=null;
function autPoints(layer,key,fxId,pKey){
  const mk=layer+'|'+key+'|'+fxId+'|'+pKey+'|'+takeFxVer+'|'+evGen+'|'+ENV.bpm();   // + loop.bpm: форма записанной точки выводится по промежутку в СЕКУНДАХ (autSmoothOf). Переключатель уха поднимает takeFxVer сам. V4b: + evGen (поднимает КАЖДЫЙ schedInvalidate): вид «в ноте» строится из СОБЫТИЙ, а takeFxVer поднимают только правки редактора — новое взятое в ту же дорожку оставило бы мемо прежним
  if(autMemoK===mk && autMemoV) return autMemoV;
  const r=autPointsCalc(layer,key,fxId,pKey);
  autMemoK=mk; autMemoV=r; return r;
}
function autPointsCalc(layer,key,fxId,pKey){
  let base=null, baseT=Infinity;
  const pts=[];
  /* ⚠️ Адрес ЧУЖОЙ цепи — пусто. Адреса приходят из autAddrs и несут ключ цепи дорожки, так что это страж,
     а не развилка: без него адрес не той цепи вытащил бы точки соседней дорожки из общего взятого сплита. */
  if(key!==laneChainKey(layer)) return { base, baseT:0, pts };
  if(fxIsPerNote(fxId,pKey)) return pnView(layer,key,fxId,pKey);   // V4b: параметр «в ноте» — вид из самих нот, не из точек захвата
  for(const T of autTakesOf(layer)){
    const rec=takeFx.get(T.tk); if(!rec) continue;
    const ch=rec.chains[key];
    if(ch && T.t0<=baseT){ const eff=ch.find(e=>e.fxId===fxId);
      if(eff){ const names=fxParamKeysOf(fxId), i=names.indexOf(pKey);
        if(i>=0 && eff.params[i]!=null){ base=eff.params[i]; baseT=T.t0; } } }
    for(const ent of rec.lane) if(ent.key===key&&ent.fx===fxId&&ent.p===pKey)
      pts.push({pt:ent, tk:T.tk, lane:rec.lane});
  }
  pts.sort((a,b)=> a.pt.t-b.pt.t || a.tk-b.tk);
  /* ФОРМА КАЖДОГО ОТРЕЗКА — ТЕМ ЖЕ законом, что у переигровки (autSmoothOf): draw рисует прямую, где smooth, и ступеньку, где нет;
     кнопка ╱/⌐ показывает то же. Первая точка входит с полки снимка — плавно оттуда не едут ни звук, ни рисунок.
     ⚠️ Предшественник здесь — точка ЭТОЙ дорожки; у переигровки — точка того же адреса во всей песне (одна цепь на роль). Если
     другая дорожка той же роли пишет тот же адрес вперемешку, звук и рисунок могут разойтись — тот же давний предел, что у полки. */
  for(let i=0;i<pts.length;i++) pts[i].smooth = i>0 && autSmoothOf(pts[i-1].pt, pts[i].pt);
  return { base, baseT: baseT===Infinity?0:baseT, pts };
}
/* ⛳ ОБЩИЙ ХВОСТ ВСЕХ ПРАВОК ПОЛОСЫ. editCommit сортирует СОБЫТИЯ и сбрасывает курсоры — здесь этого не
   нужно и НЕЛЬЗЯ: захват не события (правило #28). Нужно ровно одно — поднять версию захвата, чтобы
   лента переигровки пересобралась и правка зазвучала на следующем ▶. */
const autCommit=()=>{ takeFxTouch(); laneEditTouch(); histSeal(); };   // A2: см. laneEditVer
/* ═══ S1: ОДНА ЦЕПЬ ДОРОЖКИ В РЕДАКТОРЕ ═══
   ⛳ ЦЕПЬ ДОРОЖКИ — ЭТО СНИМКИ ВСЕХ ЕЁ ЗАХВАЧЕННЫХ ВЗЯТЫХ. Каждый снимок вступает с первой доли своего взятого (fxLaneMerge),
   поэтому правка цепи, легшая в ОДНО взятое, звучала бы лишь с его старта. Отсюда закон: добавить, снять, переставить —
   ВО ВСЕХ захваченных взятых дорожки, ОДНОЙ записью истории.
   ⚠️ ИСПРАВЛЕННЫЙ ДЕФЕКТ (бас и ударные — уже до S1). Прежде правки брали СТАРШЕЕ взятое дорожки (autEnsure) и, если у него
   не было захвата, заводили ему снимок ЖИВОЙ цепи. Старшим после вставки в редакторе становится РЕДАКТОРСКОЕ взятое (editTake,
   захвата у него нет) — и первая же правка цепи или шинная точка переводила с доли вставленной ноты ВСЮ РОЛЬ, на каждой её
   дорожке (цепи принадлежат роли), на то, как стоят живые ручки. А эффект, добавленный в редакторе, звучал лишь с начала
   последнего взятого.
   ⛳ ВЗЯТОЕ БЕЗ ЗАХВАТА ВНУТРИ ЗАХВАЧЕННОЙ ДОРОЖКИ СВОЕГО НЕ ПОЛУЧАЕТ НИКОГДА — оно играет цепью дорожки (fxLaneMerge: вставка
   раньше всех захваченных заимствует снимок самого раннего из них). ⛔ ЖИВАЯ ЦЕПЬ читается ровно в одном случае: у дорожки
   захвата нет НИ В ОДНОМ взятом — она и шла за живой цепью, а снимок оставляет её звучать ровно как в этот миг (и с этого
   мига ПРИКАЛЫВАЕТ: ручки её больше не достают). Тогда захват получает ОДНО взятое — самое раннее, чтобы цепь начиналась с
   первой ноты дорожки. Снимок делает ТА ЖЕ takeCapStart, что и на ● (опору прореживания она засевает только своему взятому,
   tk===curTake, — здесь это не так, идущая запись цела), а ход 'autcap' кладётся ПЕРВЫМ в ту же запись истории: ↶ снимет и
   его, и дорожка снова пойдёт за живой цепью, как до правки. */
/* Захваченные взятые дорожки — старший номер первым (порядок autTakesOf). */
const autCapTakes=layer=>autTakesOf(layer).filter(T=>takeFx.has(T.tk));
/* Самое раннее взятое по первой доле в дорожке; при равенстве — младший номер. */
const autEarliest=Ts=>Ts.reduce((a,b)=> !a||b.t0<a.t0||(b.t0===a.t0&&b.tk<a.tk) ? b : a, null);
/* Захваты дорожки для правки цепи: [{tk, rec}] (старший первым) и ходы, которые уже сделаны и обязаны войти в запись истории
   ПЕРВЫМИ (сегодня — только заведённый захват, 'autcap'). make=false — не заводить никогда (снять и переставить нечего, пока
   захвата нет: список цепи тогда пуст). */
function autCaps(layer,make){
  const caps=autCapTakes(layer).map(T=>({tk:T.tk, rec:takeFx.get(T.tk)}));
  if(caps.length||!make) return { caps, ops:[] };
  const E=autEarliest(autTakesOf(layer)); if(!E) return { caps, ops:[] };
  takeCapStart(E.tk);
  const rec=takeFx.get(E.tk); if(!rec) return { caps, ops:[] };
  return { caps:[{tk:E.tk, rec}], ops:[{ kind:'autcap', tk:E.tk, rec }] };
}
/* ПРАВКА ЗАХВАТА ОДНОЙ ЗАПИСЬЮ ИСТОРИИ. Ходы ещё НЕ применены: применяет их тот же editApply, которым ходят ↶/↷ (как editBatch).
   Хвост — autCommit, а не editCommit: события не менялись (правило #28 — про события). Один ход — сам ход, без обёртки. */
function autBatch(list){
  if(!list||!list.length) return false;
  for(const u of list) editApply(u,false);
  editPush(list.length===1 ? list[0] : { kind:'batch', list });
  autCommit(); return true;
}
/* ⛳ ПРАВЛЕНАЯ ТОЧКА ДЕРЖИТ ТУ ФОРМУ, ЧТО БЫЛА ВИДНА (слайс «плавная внутри движения»). Форма записанной точки ВЫВОДИТСЯ из
   промежутка и скачка до соседки (autSmoothOf) — сдвинь одну точку, и выведенная форма её отрезка и отрезка СЛЕДУЮЩЕЙ точки могла
   бы молча перевернуться (тронул точку — а ступенька через одну стала прямой). Поэтому правка точки (перенос, удаление, вставка
   перед ней) сперва ЗАМОРАЖИВАЕТ выведенную форму у двух отрезков, которых она касается, — входящего в правленую точку и
   входящего в следующую, — делая их обычными формами человека ('s' или 'h'). Остальные записанные отрезки по-прежнему выводятся.
   Ход 'autshape' — в той же записи истории: ↶ вернёт и точку, и «форма выводится». */
function autFreeze(D,j){
  const r=D&&D.pts[j]; if(!r||r.per||r.pt.sh) return null;       // у «в ноте» и у точки с формой человека — нечего замораживать
  return { kind:'autshape', pt:r.pt, from:undefined, to: r.smooth?'s':'h' };
}
/* Перенос точки: время и величина. Обе зажаты — время не отрицательное, величина в 0..1. */
function autMovePoint(pt,t,v){
  if(pt&&pt.pn) return pnMove(pt,t,v);   // V4b: точка «в ноте» — переписываем НОТЫ; отдаём точку, которую выделить (объекты вида пересобраны)
  if(!editGuard()||!pt) return false;
  const to={t:Math.max(0,t), v:Math.max(0,Math.min(1,v))};
  if(Math.abs(to.t-pt.t)<AUT_EPS && Math.abs(to.v-pt.v)<1e-6) return false;   // не сдвинулось — не правка (иначе ↶ «ничего не делает»)
  const D=autPoints(editLayer(), pt.key, pt.fx, pt.p), i=D.pts.findIndex(r=>r.pt===pt);
  const list=i<0 ? [] : [autFreeze(D,i), autFreeze(D,i+1)].filter(Boolean);
  list.push({ kind:'autmove', pt, from:{t:pt.t,v:pt.v}, to });
  return autBatch(list);
}
function autDeletePoint(rec){
  if(rec&&rec.pt&&rec.pt.pn) return pnDelete(rec.pt);   // V4b: см. pnDelete
  if(!editGuard()||!rec||!rec.lane) return false;
  if(rec.lane.indexOf(rec.pt)<0) return false;
  const pt=rec.pt, D=autPoints(editLayer(), pt.key, pt.fx, pt.p), i=D.pts.findIndex(r=>r.pt===pt);
  const fz=i<0 ? null : autFreeze(D,i+1);                         // следующая точка теперь въезжает от предыдущей — её видимая форма застывает
  return autBatch([...(fz?[fz]:[]), { kind:'autdel', pt, lane:rec.lane }]);
}
/* Новая точка — в СТАРШЕЕ ЗАХВАЧЕННОЕ взятое дорожки (см. шапку O-4: при равной доле побеждает старший номер), в ЦЕПЬ ДОРОЖКИ
   (T4: ключ не передаётся — у дорожки одна цепь, выбирать её вызывающему нечем). ⚠️ S1: именно ЗАХВАЧЕННОЕ — редакторское
   взятое своего захвата не получает (см. autCaps); у дорожки без захвата вовсе он заводится самому раннему взятому. */
function autAddPoint(layer,fxId,pKey,t,v){
  if(!editGuard()) return null;
  const key=laneChainKey(layer); if(!key) return null;
  if(fxIsPerNote(fxId,pKey)) return pnAdd(layer,key,fxId,pKey,Math.max(0,t),v);   // V4b: захват не нужен — правится нота
  /* ⛳ ПОСТАВЛЕННАЯ РУКОЙ ТОЧКА — ПЛАВНАЯ (гладкая автоматизация), если перед ней есть ТОЧКА, от которой плавно ехать. Полка
     снимка точкой не считается (см. fxLaneSmooth): первая точка на полке встаёт ступенькой — иначе одна точка на такте 8 тянула
     бы подъём от самого начала взятого. Смотрим до autCaps: снимок, заведённый им, точек не прибавляет. */
  const D=autPoints(layer,key,fxId,pKey);
  const before=D.pts.some(r=>r.pt.t<=t+AUT_EPS);
  const fz=autFreeze(D, D.pts.findIndex(r=>r.pt.t>t+AUT_EPS));     // следующая точка теперь въезжает от новой — её видимая форма застывает (до autCaps: вид тот, что на экране)
  const {caps,ops}=autCaps(layer,true); if(!caps.length) return null;
  const rec=caps[0].rec;                                          // старшее захваченное
  /* Форма поставленной точки — ВСЕГДА человеческая: 's' от точки, 'h' после полки. Без поля она стала бы «записанной» (плавной по
     умолчанию), и ступенька человека пропала бы. */
  const pt={ t:Math.max(0,t), key, fx:fxId, p:pKey, v:Math.max(0,Math.min(1,v)), sh: before?'s':'h' };
  return autBatch([...ops, ...(fz?[fz]:[]), { kind:'autins', pt, lane:rec.lane }]) ? pt : null;   // точку кладёт editApply (как ↷) — сюда же, первым, ход заведённого захвата
}
/* ⛳ ФОРМА ОТРЕЗКА, ВХОДЯЩЕГО В ВЫБРАННУЮ ТОЧКУ: плавно ↔ ступенькой (гладкая автоматизация). Одна запись истории.
   Отказ, когда перед точкой нет точки (полка снимка / «не задано» / первая) — плавно ехать там не от чего; ui говорит это словами.
   Отдаёт: false — отказ; для точки ленты — true; для точки «в ноте» — точку, которую выделить (вид пересобран из нот). */
function autShapePoint(rec){
  const pt=rec&&rec.pt; if(!pt) return false;
  if(pt.pn) return pnShape(pt);
  if(!editGuard()) return false;
  const D=autPoints(editLayer(), pt.key, pt.fx, pt.p);           // полоса показывает ОТКРЫТУЮ дорожку — её вид и спрашиваем
  const i=D.pts.findIndex(r=>r.pt===pt);
  if(i<=0) return false;                                          // первая точка адреса — слева только полка снимка
  const from=pt.sh, to= D.pts[i].smooth ? 'h' : 's';               // переключаем ВИДИМУЮ форму (у записанной — выведенную) и делаем её формой человека
  return autBatch([{ kind:'autshape', pt, from, to }]);
}
const autShapeSet=(pt,sh)=>{ if(sh) pt.sh=sh; else delete pt.sh; };
/* BEND-CURVE: the curvature of the glide INTO a lane point (bus lanes; per-note addresses are not curved — they live in the notes'
   events). k −1..1, 0 = straight; the segment becomes the person's glide ('s') in the same step. One history step. → true / false. */
function autCurvePoint(rec,k){
  const pt=rec&&rec.pt; if(!pt||pt.pn||!editGuard()) return false;
  const D=autPoints(editLayer(), pt.key, pt.fx, pt.p), i=D.pts.findIndex(r=>r.pt===pt);
  if(i<=0) return false;
  const kk=Math.max(-1,Math.min(1,Math.round((+k||0)*100)/100)), list=[];
  if(pt.sh!=='s') list.push({ kind:'autshape', pt, from:pt.sh, to:'s' });
  if((pt.k||0)!==kk) list.push({ kind:'autcurve', pt, from:pt.k, to:kk||undefined });
  return autBatch(list);
}   // ПОЛЯ НЕТ — записанная точка (отрезок плавный); 's'/'h' — форма человека
/* ═══ ЧАСТЬ 2: ЦЕПЬ САМОЙ ДОРОЖКИ ═══
   ⛳ ГДЕ ЖИВЁТ ЭФФЕКТ, ДОБАВЛЕННЫЙ В РЕДАКТОРЕ: в СНИМКЕ ЦЕПИ ВЗЯТОГО (rec.chains[key]) — то есть в
   ЗАХВАТЕ ДОРОЖКИ, и больше нигде. ⛔ Живая цепь (state.fxChains) не трогается ни на символ: она —
   инструмент рук, и переписать её значило бы отнять у человека раскладку по пальцам (тот же закон, по
   которому переигровка подменяет ПУТЬ, а не цепь, — см. fxPlayPath).
   Переигровка подхватит это сама: fxPlayBuild кладёт снимок в ленту записью состава (FX_CHAIN), а
   fxPlayDrive превращает её в путь. Ни одной новой строки в звуковом пути не понадобилось.
   ⛳ T4: ЦЕПЬ — ОДНА, ЦЕПЬ ДОРОЖКИ. Ключ владельца функции берут сами (laneChainKey), а не у вызывающего:
   прежде ui выбирал «в чью цепь» по вкладке роли, и на дорожке двух ролей полоса могла показывать одну
   цепь, а ▲ двигать другую. Роль у дорожки одна — и выбора, который можно сделать неверно, больше нет. */
/* ⛳ S1: СПИСОК ЦЕПИ ДОРОЖКИ — ОБЪЕДИНЕНИЕ снимков ВСЕХ её захваченных взятых, ТЕМ ЖЕ законом, что у списка адресов полосы
   (autAddrs): от младшего взятого к старшему, эффект, встреченный снова, переезжает на место из более старшего. Разойдись эти
   два порядка — меню показало бы одного соседа, а ▲▼ двигали бы к другому. Прежде список брал одно старшее взятое, и эффект из
   раннего взятого полоса показывала, а ▲▼⊘ его не видели. Эффекты, добавленные ПОСРЕДИ взятого (запись состава в ленте, а не
   в снимке), сюда по-прежнему не входят — их ▲▼⊘ не трогают (названный предел). */
function autChainOf(layer){
  const key=laneChainKey(layer); if(!key) return [];
  const out=[];
  for(const T of autCapTakes(layer).slice().reverse()){
    const ch=takeFx.get(T.tk).chains[key]; if(!ch) continue;
    /* VOL-0: БЕЗ постоянной записи (громкость). Этот список читает ТОЛЬКО ui редактора — и ради индексов ▲▼: громкость стоит в
       снимке первой, и без фильтра у первого показанного эффекта ожила бы стрелка ▲ (двигать его «выше громкости»). */
    for(const e of ch){ if(fxPerm(e.fxId)) continue;
      const i=out.indexOf(e.fxId); if(i>=0) out.splice(i,1);
      out.push(e.fxId); }
  }
  return out;
}
/* ДОБАВИТЬ — в КАЖДОЕ захваченное взятое, где эффекта нет (у каждого своя запись с умолчаниями владельца — не общий объект:
   снимки взятых независимы). Эффект звучит по всей дорожке, с её первой ноты. У дорожки без захвата вовсе захват заводится
   (autCaps) — если в живой цепи эффект уже стоял, правкой остаётся сам заведённый захват: дорожка теперь с ним приколочена. */
function autChainAdd(layer,fxId){
  if(!editGuard()||!fxId) return false;
  const key=laneChainKey(layer); if(!key) return false;
  const {caps,ops}=autCaps(layer,true); if(!caps.length) return false;
  const list=ops.slice();
  for(const c of caps){ const ch=c.rec.chains[key];
    if(!ch || ch.some(e=>e.fxId===fxId)) continue;                   // тот же инвариант, что у живой цепи: одна запись на эффект
    list.push({ kind:'autfxins', ent:{ fxId, params:fxDefaultsOf(fxId,key) }, ch });   // V4: умолчание — ДЛЯ ЭТОГО владельца (defBy)
  }
  return autBatch(list);
}
/* СНЯТЬ — из КАЖДОГО захваченного взятого, где эффект есть, одной записью истории (ходы 'autfxdel' помнят место: ↶ вернёт в
   обратном порядке каждый на своё). Захвата не заводит: у дорожки без него снимать нечего. */
function autChainRemove(layer,fxId){
  if(!editGuard()||fxPerm(fxId)) return false;                      // VOL-0: постоянную запись не снимают (громкость есть у ноты всегда)
  const key=laneChainKey(layer); if(!key) return false;
  const list=[];
  for(const c of autCaps(layer,false).caps){ const ch=c.rec.chains[key]; if(!ch) continue;
    const i=ch.findIndex(e=>e.fxId===fxId); if(i>=0) list.push({ kind:'autfxdel', ent:ch[i], ch, at:i }); }
  if(!list.length) return false;
  /* ⛳ V4b: ГОЛОСОВОЙ ЭФФЕКТ ЖИВЁТ В НОТАХ, и снять его с дорожки — значит снять его величины с нот: иначе полоса пропала бы, а
     ноты звучали бы по-прежнему со Скольжением («убрал — а слышно»). Снятие из цепи и очистка нот — ОДНА запись истории,
     один сброс (editBatch, правило #28): ↶ вернёт и эффект, и величины. Шинный — как было. */
  const strip=pnStripMoves(layer,fxId);
  return strip.length ? editBatch([...list, ...strip]) : autBatch(list);
}
/* Перестановка — тем же переносом splice, что и у живой цепи (fxChainMove): порядок слышен, значит его
   надо уметь менять; вторая модель порядка не заводится. dir: −1 раньше, +1 позже.
   ⛳ S1: СОСЕД — ПО ПОКАЗАННОМУ СПИСКУ (autChainOf, объединение взятых), и в КАЖДОМ захваченном взятом, где есть оба, эффект
   встаёт ВПЛОТНУЮ перед соседом (−1) или сразу за ним (+1). Где снимки взятых совпадают по порядку (обычный случай), это ровно
   прежний шаг на одно место. Где разошлись — эффект подтягивается к соседу через стоящих между ними. */
function autChainMove(layer,fxId,dir){
  if(!editGuard()) return false;
  const key=laneChainKey(layer); if(!key) return false;
  const U=autChainOf(layer), i=U.indexOf(fxId), j=i+(dir<0?-1:1);
  if(i<0||j<0||j>=U.length) return false;
  const nb=U[j];
  if(fxPerm(fxId)||fxPerm(nb)) return false;   // VOL-0: постоянная запись не переставляется и соседом для переноса не служит (её место в снимке — первое; в U её и так нет)
  const list=[];
  for(const c of autCaps(layer,false).caps){ const ch=c.rec.chains[key]; if(!ch) continue;
    const a=ch.findIndex(e=>e.fxId===fxId), b=ch.findIndex(e=>e.fxId===nb); if(a<0||b<0) continue;
    const b2=b-(a<b?1:0), to= dir<0 ? b2 : b2+1;                    // индексы ПОСЛЕ изъятия — так их читает editApply ('autfxmove': splice(from,1), splice(to,0))
    if(to!==a) list.push({ kind:'autfxmove', ch, from:a, to });
  }
  return autBatch(list);
}
/* REC2: ONE step either way is song/history.js histApply (imported here as editApply); step kinds register themselves. This module
   registers the kinds it owns: lane automation and chain edits (capture records), the capture a chain edit creates, the section kinds, snapshot
   steps, the mixer tables, the master level and the key knob. 'touched' = the tracks whose freeze goes stale (lane points through their take). */
const tkLy=(tk,S)=>{ for(const e of events) if((e.tk||0)===tk) S.add(e.layer); };
const recOf=pred=>{ for(const [tk,r] of takeFx) if(pred(r)) return tk; return null; };
const capTouched=pred=>(u,S)=>{ const tk=recOf(r=>pred(r,u)); if(tk!=null) tkLy(tk,S); };
const ptTouched=capTouched((r,u)=>r.lane.includes(u.pt)), lnTouched=capTouched((r,u)=>r.lane===u.lane), chTouched=capTouched((r,u)=>Object.values(r.chains).includes(u.ch));
/* ⛳ ПРАВКИ ПОЛОСЫ АВТОМАТИЗАЦИИ (O-4) — В ТОЙ ЖЕ ИСТОРИИ, что и ноты, и по той же форме: ход возит
   ТОТ ЖЕ объект (точку или запись цепи), а не копию. Разной у них только цель: там массив событий,
   здесь массив дорожки автоматизации или снимок цепи взятого.
   ⛔ ВТОРОЙ ИСТОРИИ НЕ ЗАВОДИМ: ↶ у человека одна, и она обязана снимать последнее сделанное, чем бы
   оно ни было. Отсюда же и общий хвост — takeFxTouch, чтобы снятая правка перестала звучать. */
histKind('autmove', (u,undo)=>{ const s= undo?u.from:u.to; u.pt.t=s.t; u.pt.v=s.v; takeFxTouch(); }, ptTouched);
histKind('autshape', (u,undo)=>{ autShapeSet(u.pt, undo?u.from:u.to); takeFxTouch(); }, ptTouched);
histKind('autcurve', (u,undo)=>{ const k= undo?u.from:u.to; if(k) u.pt.k=k; else delete u.pt.k; takeFxTouch(); }, ptTouched);   // BEND-CURVE   // гладкая автоматизация: форма отрезка точки ленты — оба состояния в записи, как у переноса
const autLaneApply=(u,undo)=>{
  const add=(u.kind==='autdel')===undo;
  if(add){ if(u.lane.indexOf(u.pt)<0) u.lane.splice(u.kind==='autdel'&&u.at!=null ? Math.min(u.at,u.lane.length) : u.lane.length, 0, u.pt); }   // ED6: an undone delete goes back to its own place (the song fingerprint compares lanes in order)
  else { const i=u.lane.indexOf(u.pt); if(i>=0){ if(u.kind==='autdel') u.at=i; u.lane.splice(i,1); } }
  takeFxTouch();
};
histKind('autins', autLaneApply, lnTouched);
histKind('autdel', autLaneApply, lnTouched);
const autFxApply=(u,undo)=>{
  const add=(u.kind==='autfxdel')===undo;
  if(add){ if(u.ch.indexOf(u.ent)<0) u.ch.splice(u.at==null?u.ch.length:Math.min(u.at,u.ch.length),0,u.ent); }
  else { const i=u.ch.indexOf(u.ent); if(i>=0) u.ch.splice(i,1); }
  takeFxTouch();
};
histKind('autfxins', autFxApply, chTouched);
histKind('autfxdel', autFxApply, chTouched);
histKind('autfxmove', (u,undo)=>{ const from=undo?u.to:u.from, to=undo?u.from:u.to;
  if(from>=0&&from<u.ch.length){ const [e]=u.ch.splice(from,1); u.ch.splice(to,0,e); }
  takeFxTouch(); }, chTouched);
/* S1: ЗАХВАТ, ЗАВЕДЁННЫЙ ПРАВКОЙ ЦЕПИ дорожке, у которой его не было вовсе (autCaps). Вперёд — поставить (при первом ходе он уже
   стоит: его завела takeCapStart), назад — снять, и дорожка снова идёт за живой цепью, как до правки. Снимаем, только если на
   месте ТОТ ЖЕ объект: чужой захват того же взятого не наш. */
histKind('autcap', (u,undo)=>{
  if(undo){ if(takeFx.get(u.tk)===u.rec) takeFx.delete(u.tk); } else takeFx.set(u.tk,u.rec);
  takeFxTouch(); }, (u,S)=>{ tkLy(u.tk,S); });

export { bendDbg, autTakesOf, autAddrs, BEND_EPS, bendEdited, editBendPoint, editBendShape, pnBars, editVolSel, takeFxDump, autPoints, autEarliest, autCaps, autMovePoint, autDeletePoint, autAddPoint, autShapePoint, autCurvePoint, autChainOf, autChainAdd, autChainRemove, autChainMove };
