/* AUD1c (RUN 3, 2026-10-16) — shared voice stages: track route, pan, brightness, saturation curves, the brightness ranges, the solo glide time, the filter strike. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */

/* R2: the data tables of these shared modules are deep-frozen — a write would throw in BOTH engine copies */
const freezeDeep=x=>{ if(x && typeof x==='object' && !Object.isFrozen(x)){ Object.freeze(x); for(const k of Object.keys(x)) freezeDeep(x[k]); } return x; };
function panGains(p){ if(!(p!==0)||!Number.isFinite(p)) return [1,1]; if(p<=-1) return [Math.SQRT2,0]; if(p>=1) return [0,Math.SQRT2];
  const th=(p+1)*Math.PI/4; return [Math.SQRT2*Math.cos(th), Math.SQRT2*Math.sin(th)]; }

function voiceRoute(E, src,live,track){
  if(!track){ src.connect(live); return null; }
  const rL=E.ac.createGain(), rT=E.ac.createGain(); rL.gain.value=1; rT.gain.value=0;
  src.connect(rL); src.connect(rT); rL.connect(live); rT.connect(track);
  return { rL, rT };
}

function makePanStage(E, src,dest){
  const l=E.ac.createGain(), r=E.ac.createGain(), out=E.ac.createChannelMerger(2); l.gain.value=1; r.gain.value=1;
  src.connect(l); src.connect(r); l.connect(out,0,0); r.connect(out,0,1); if(dest) out.connect(dest);
  return { l, r, out }; }

function makeSatCurve(k=4,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x);} return c; }

/* ЖЁСТКАЯ кривая искажения — ДРУГОЙ ХАРАКТЕР, не «больше того же»: резкий клип (k высокий) + заострение
   (pow<1) + лёгкая АСИММЕТРИЯ (чётные гармоники → «злее/грязнее», а не просто громче тот же тон). Пара к
   makeSatCurve (мягкое/тёплое): размах пальцев морфит МЕЖДУ ними, поэтому щепоть = тепло, веер = грязь. */
function makeHardCurve(k=18,n=1024){ const c=new Float32Array(n);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; let y=Math.tanh(k*x); y=Math.sign(y)*Math.pow(Math.abs(y),0.7);
    c[i]=Math.max(-1,Math.min(1, y+0.12*x*x*Math.sign(x))); } return c; }

const HUM_CENTS=4;   // глубина гуманизации высоты: ±центов на ноту — оживляет, но не читается как «расстроено»

/* Границы cutoff пер-голосового фильтра яркости fb (Hz), см. briToHz. MAX высоко — ВЫШЕ собственных
   фильтров f аккордовых голосов (lp 1200..5200): при нейтрали (depth=0) fb открыт настолько, что звук
   практически не меняется (fb в тракте всегда — перцептивно неотличимо, не байт-в-байт). MIN —
   приглушённый «далёкий» аккорд. */
const CHORD_LP_MAX=18000, CHORD_LP_MIN=700;

/* Огибающая фильтра + скорость→яркость на атаке (для лид-банков с фильтром). Возвращает strike(t,vel):
   cutoff прыгает к base*open (ярче в атаке), оседает к base*(1+fv*vel) за tc — громче нота = ярче,
   ПОЛ = base, поэтому тихая нота не глохнет. setFreq НЕ трогает фильтр → пофреймовая пересылка живого
   лид-пути не сбивает эту огибающую (в отличие от частоты). */
const fstrike=(lp,base,open,tc,fv)=>(t,vel)=>{
  lp.frequency.cancelScheduledValues(t);
  lp.frequency.setValueAtTime(base*open,t);
  lp.frequency.setTargetAtTime(base*(1+fv*vel),t,tc); };

/* ⛳ V1 (режимы голоса): ВРЕМЯ СКОЛЬЖЕНИЯ ВЫСОТЫ — АРГУМЕНТ setFreq(f,tc,t) у КАЖДОГО банка, по умолчанию сегодняшние
   20 мс (undefined в слоте tc → умолчание). ⛔ Время t — ПОСЛЕДНИМ (правило #15): все три вызова (leadOn, leadSet,
   scheduleBend) передают его третьим; старая форма (f,t) у вызывающего положила бы время в слот tc. Прежде 0.02 было вписано в каждое замыкание. ⛔ Скольжение в смысле «портаменто» идёт ТОЛЬКО на легато-переезде
   уже звучащего голоса (leadOn/leadSet его и передают); КАДРЫ ТЕРМЕНВОКСА, ТОЧКИ БЕНДА (scheduleBend) и СВЕЖАЯ АТАКА
   идут умолчанием — у терменвокса и бенда 20 мс это СГЛАЖИВАНИЕ СЛЕЖЕНИЯ, а не портаменто, а свежая атака не смеет
   въезжать с высоты прежней ноты переиспользованного голоса. У FM-банков вместе с несущей едут модулятор и индекс —
   одним tc, иначе на скольжении поплыло бы отношение частот (тембр). */
const LEAD_GLIDE_TC=0.02;

/* ═══ ⛳ ЯРКОСТЬ В ГОЛОСЕ СОЛО, БАСА И В УДАРЕ — «СТУПЕНЬ ЯРКОСТИ», ПРОЗРАЧНАЯ, ПОКА НЕ ЗАДАНА ═══
   ЧТО ДВИГАЕТ ЯРКОСТЬ. У аккорда — его второй фильтр fb (правило #19, не тронут). Соло, бас и удар такого не имеют, а
   их собственные фильтры (огибающая атаки у субтрактивных банков, lp баса, фильтры ударов) — это ТЕМБР, и трогать их
   нельзя (решение пользователя: тембры не меняются). Поэтому у голоса соло и баса появляется своя ступень ПОСЛЕ всего
   голоса (соло — после тремоло, перед суммой; бас — после громкости, перед шиной), одна на ВСЕ пути синтеза — субтрактивный,
   FM, орган, Карплюс–Стронг: она фильтрует уже готовый звук голоса, какой бы банк его ни сделал. Удар строит свои узлы
   каждый раз — ему фильтр ставится в самом ударе и ТОЛЬКО когда величина задана (drumHit).
   ⛳ ПРОЗРАЧНОСТЬ, КОГДА НЕ ЗАДАНА, — ТОЧНАЯ, А НЕ «НА СЛУХ»: прежняя связь голоса с суммой (trem→leadSum, vol→шина) НЕ
   ТРОНУТА, а ступень добавляет к ней ДВЕ ветви — фильтр×w и сам сигнал×(−w): выход = x + w·(LP(x) − x). Не задана → w=0,
   обе ветви дают РОВНО ноль (y·0 = 0, а x + 0 = x в IEEE точно, в любом порядке сложения) — ни окраски, ни уровня, ни
   фазы: у суммы те же ненулевые слагаемые, что и прежде. Задана → w=1, выход = LP(x). Полностью открытая (v=1) — тоже
   w=0: ступень выходит из пути целиком, так что только что добавленная и нетронутая яркость не меняет ничего.
   ⛳ ОДИН СМЫСЛ НА ВСЕ РОЛИ: 0 — темнее всего, что роль разумно может (срез чуть выше области её основных тонов), 1 —
   открыто (срез выше всего её содержимого); между ними — одна и та же логарифмическая кривая. Диапазон — ПО РОЛИ (у
   аккордов — прежний CHORD_LP_MIN..MAX, он и задан спецификацией): у баса вся энергия ниже ~1.5 кГц (его собственный lp
   420–1300 Гц), и срез 700 Гц…18 кГц почти ничего бы с ним не делал — ползунок был бы мёртвым на 90% хода.
   ⛳ ЧИТАЕТСЯ НА АТАКЕ И ВЕДЁТСЯ, ПОКА НОТА ЗВУЧИТ (как у аккордов: атака ставит, ведение подъезжает) — у соло и баса каждое
   их ведение несёт свою величину (карта события), так что полоса автоматизации V4b правит именно то, что звучит. Удар —
   только в миг удара (у него нет ведений). */
const BRI_HZ=freezeDeep({ ld:[700,18000], bs:[100,4000], dr:[300,18000] });   // [темнее всего, открыто], Гц — числа стороны звука (у аккордов — CHORD_LP_MIN/MAX)

const BRI_OPEN=1-1e-6;                                            // v ≥ этого — «открыто»: ступень выходит из пути (w=0)

const briHzOf=(role,v)=>{ const r=BRI_HZ[role]||BRI_HZ.ld; return r[0]*Math.pow(r[1]/r[0], Math.max(0,Math.min(1,v))); };

/* Ступень строится ВМЕСТЕ с голосом и живёт до конца контекста (правило #3: ничего не запускается и не останавливается —
   в ней нет источников). src — выход голоса, dest — куда он и так подключён (эта связь остаётся как была). */
function makeBriStage(E, src,dest){
  const lp=E.ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=BRI_HZ.ld[1];
  const wet=E.ac.createGain(); wet.gain.value=0;
  const neg=E.ac.createGain(); neg.gain.value=0;
  src.connect(lp); lp.connect(wet); wet.connect(dest);
  src.connect(neg); neg.connect(dest);
  return { lp, wet, neg, w:0 };
}

/* Карта глубины руки → cutoff яркости (Гц). depth 0 близко/ярко → CHORD_LP_MAX (открыт, НЕЙТРАЛЬ =
   сегодняшний звук), 1 далеко/глухо → CHORD_LP_MIN. Логарифмическая (перцептивно ровная). Единый
   источник для атаки (chordOn) и ведения (chordGlide) — раньше жила в удалённом setChordBright. */
const briToHz=bri=>{ const d=Math.max(0,Math.min(1,bri||0)); return CHORD_LP_MAX*Math.pow(CHORD_LP_MIN/CHORD_LP_MAX,d); };
/* Скольжение БАСА — довод и история у bassOn (там, где она читается). ⚠️ V4: объявлена ЗДЕСЬ, рядом с соловой, потому что
   на обе ссылается объявление модуля «Скольжение» (GLIDE_PARAMS, его умолчания по ролям), а оно стоит выше bassOn по
   файлу — const, объявленная ниже, дала бы на загрузке модуля ReferenceError (мёртвая зона). */
const BASS_GLIDE_TC=0.012;

export { BASS_GLIDE_TC, freezeDeep, makePanStage, voiceRoute, panGains, BRI_HZ, BRI_OPEN, briHzOf, makeBriStage, makeSatCurve, makeHardCurve, CHORD_LP_MAX, CHORD_LP_MIN, briToHz, HUM_CENTS, LEAD_GLIDE_TC, fstrike };
