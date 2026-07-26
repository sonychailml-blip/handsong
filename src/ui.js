import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         phoneInstr, setPhoneInstr, handFn, setHandFn, splitOn, setSplitOn, SPLIT_ROLES, setSplitRole,
         camFacing, setCamFacing, aRef, setARef } from './state.js';
import { switchCamera } from './vision.js';
import { startClip, stopClip, activeKind, onClipChange } from './clip.js';
import { SCALES, NOTE_NAMES, TRADITIONS, scalesOfTrad, tradOfScale, supportsProgressions, supportsChords, CUR } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS, AC, droneOn } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopMetre, setLoopQuant, setLoopBpm, loop, events, recording, loadArrangement, loadJam, clearJam } from './recorder.js';
import { HARMONIES, RHYTHMS, BASS_MODES } from './arrange.js';
import { INSTR_COL } from './config.js';
import { hooks } from './hooks.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);

/* ССЫЛКИ СТАРТОВОЙ КАРТОЧКИ (плейсхолдеры). Впишите URL — ссылка появляется; пустой URL СКРЫВАЕТ её
   (мёртвых ссылок не рисуем). Меняется ОДНОЙ строкой ЗДЕСЬ. Отзыв без формы падает на e-mail; адрес
   собираем в JS (FB_MAIL_USER+'@'+FB_MAIL_DOMAIN), а НЕ mailto в HTML-исходнике — лёгкая защита от
   сборщиков адресов на публичной странице. i18n позже — строки пока русские. */
const FEEDBACK_URL='';        // Google-форма отзыва (впишется позже)
const DONATE_URL='';          // страница поддержки (впишется позже)
const FB_MAIL_USER='chailakhianmikhail', FB_MAIL_DOMAIN='gmail.com';   // fallback-почта, пока нет формы
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), instrBtnL=$('instrBtnL'), instrBtnR=$('instrBtnR'), splitBtn=$('splitBtn'), camBtn=$('camBtn'), camMsg=$('camMsg'), fsBtn=$('fsBtn'), fsBtnStart=$('fsBtnStart'), clipBtn=$('clipBtn'), audioBtn=$('audioBtn'), jamBtn=$('jamBtn'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'), loopMetre=$('loopMetre'),
      selTradition=$('selTradition'), selScale=$('selScale'), selTonic=$('selTonic'),
      selLead=$('selLead'), selChord=$('selChord'), selBass=$('selBass'),
      qOn=$('qOn'), qOff=$('qOff'),
      bpmEl=$('bpm'), bpmV=$('bpmV'),
      selProg=$('selProg'), selRhythm=$('selRhythm'), selBassMode=$('selBassMode'), selDrumKit=$('selDrumKit'), addArrBtn=$('addArrBtn'),
      scaleBtn=$('scaleBtn'), loopPanelBtn=$('loopPanelBtn'),
      panelScaleEl=$('panelScale'), panelLoopEl=$('panelLoop');
 
/* Кнопка-индикатор звукоряда (шаг 2 MENU-PLAN): «лад · тоника», единственный вход в меню.
   Имя тоники берём из NOTE_NAMES — тем же списком подписан <select id="selTonic">,
   чтобы подписи не разъехались. Читает живые связки scaleIdx/tonic, поэтому зовётся
   после КАЖДОЙ смены лада или тоники (иначе надпись протухает). */
function updScaleBtn(){ scaleBtn.textContent=`${SCALES[scaleIdx].name} · ${NOTE_NAMES[tonic]}`; }

/* Меню лада заполняем ладами ОДНОЙ традиции. value у <option> — абсолютный индекс в
   SCALES (он же scaleIdx), а не позиция в отфильтрованном списке: иначе selScale.onchange
   выставил бы не тот лад. Подгруппы (grp) рисуем, только если они заданы.
   ГРУППИРОВКА ПО КЛЮЧУ (grp), А НЕ ПО СОСЕДСТВУ В МАССИВЕ. Это разные вещи, и разница
   видна ровно тогда, когда лад дописан В КОНЕЦ SCALES (а правило требует дописывать
   только туда): раньше сравнивался лишь ПРЕДЫДУЩИЙ grp, поэтому «Диатоника» в конце
   массива открывала ВТОРУЮ группу «Диатоника» внизу списка. Теперь лады раскладываются
   по корзинам: порядок КОРЗИН — по первому появлению, порядок ВНУТРИ корзины — по
   массиву. Позиция в меню и позиция в SCALES развязаны, scaleIdx при этом не трогается.
   Пустой grp — не корзина: такие лады идут голыми <option> прямо в selScale
   (Хроматика/Арабская/Микротональная так и рисуются). */
function fillScales(tradId){
  selScale.textContent='';
  const order=[], buckets=new Map();            // order — grp в порядке первого появления
  scalesOfTrad(tradId).forEach(({i,s})=>{
    const k=s.grp||'';
    if(!buckets.has(k)){ buckets.set(k,[]); order.push(k); }
    buckets.get(k).push({i,s});                 // внутри корзины — порядок массива
  });
  for(const k of order){
    const parent = k ? selScale.appendChild(Object.assign(document.createElement('optgroup'),{label:k}))
                     : selScale;                // '' → без optgroup, прямо в список
    for(const {i,s} of buckets.get(k)){
      const o=document.createElement('option'); o.value=i; o.textContent=s.name; parent.appendChild(o);
    }
  }
}
function buildUI(){
  TRADITIONS.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent=t.name; selTradition.appendChild(o); });
  selTradition.value=tradOfScale(scaleIdx);      // традицию берём из активного лада, а не из умолчания
  fillScales(selTradition.value);
  selScale.value=scaleIdx;
  NOTE_NAMES.forEach((n,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=n; selTonic.appendChild(o);
  });
  selTonic.value=tonic;
  LEAD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selLead.appendChild(o);
  });
  CHORD_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selChord.appendChild(o);
  });
  BASS_INSTR.forEach((s,i)=>{
    const o=document.createElement('option'); o.value=i; o.textContent=s.label; selBass.appendChild(o);
  });
  DRUM_KITS.forEach((k,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=k.label; selDrumKit.appendChild(o); });
  HARMONIES.forEach((p,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=p.name; selProg.appendChild(o); });
  RHYTHMS.forEach((r,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=r.name; selRhythm.appendChild(o); });
  BASS_MODES.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; selBassMode.appendChild(o); });
  selBassMode.value='roots';
  updScaleBtn();                              // 1/3: старт
  loopBarsV.textContent=loop.bars;
  refreshProgAvail();
}
function refreshProgAvail(){                  // прогрессии — только там, где строятся аккорды и 7 ступеней; дрон — везде
  const ok=supportsProgressions()&&supportsChords();   // макам: iv.length===7, но лестницы аккордов нет
  [...selProg.options].forEach((o,i)=>{ o.disabled = !HARMONIES[i].drone && !ok; });
  if(selProg.selectedOptions[0] && selProg.selectedOptions[0].disabled) selProg.value='0';   // упасть на дрон
}
/* Размер: значение = loop.metre; БЛОКИРУЕМ селектор на непустой/играющей петле (смена переосмыслила бы
   времена всех событий — как длина). Плюс фильтруем ритмы: доступны лишь паттерны своего размера
   (beats===loop.metre); несовместимый ритм buildArrangement всё равно пропустит — тут только визуал. */
function refreshMetreCtl(){
  loopMetre.value = loop.metre;
  loopMetre.disabled = !!(events.length || loop.on);
  [...selRhythm.options].forEach((o,i)=>{ o.disabled = (RHYTHMS[i].beats||4) !== loop.metre; });
  if(selRhythm.selectedOptions[0] && selRhythm.selectedOptions[0].disabled){   // выбранный ритм не того размера → упасть на совместимый (как refreshProgAvail)
    const alt=RHYTHMS.findIndex(r=>(r.beats||4)===loop.metre); if(alt>=0) selRhythm.value=alt;
  }
}
buildUI(); refreshMetreCtl();

hooks.leadInstr = v  => selLead.value = v;
hooks.bassInstr = v  => selBass.value = v;
hooks.drumKit   = v  => selDrumKit.value = v;
/* Кнопка записи — компактная иконка: состояние показываем ВИДОМ (классы + CSS),
   а не текстом. Подробности («круг N т.» / «слой K») и так пишет холстовая полоса
   лупера (drawLooper); текст в кнопке был бы вторым, худшим экземпляром той же
   информации. Смысл иконки раскрывает подсказка (title) — по наведению/долгому тапу. */
function updRecBtn(){
  recBtn.classList.toggle('on', recording);                     // идёт запись (любая)
  recBtn.classList.toggle('first', recording && loop.first);    // первый круг ≠ наложение
  recBtn.classList.toggle('armed', !recording && loop.on);      // петля играет: тап добавит слой
  recBtn.title = recording
    ? (loop.first ? 'Идёт запись круга — тап остановит'
                  : `Наложение слоя ${loop.layer+1} — тап остановит`)
    : (loop.on ? 'Петля играет — тап начнёт новый слой'
               : 'Запись: тап — отсчёт такта, затем круг');
  loopBarsV.textContent = loop.bars;
}
hooks.rec       = () => updRecBtn();
hooks.loop      = on => { loopBtn.classList.toggle('on', on); loopBtn.textContent = on ? '❚❚ луп' : '⟳ луп'; updRecBtn(); refreshMetreCtl(); };   // транспорт менялся → перечитать блокировку размера (пусто/играет)

/* Две панели (звукоряд и лупер) — оба оверлея на ОДНОМ месте (сверху). Одна за раз: открытие одной
   прячет другую (иначе перекрылись бы). Лупер РАНЬШЕ жил снизу, чтобы холстовая сетка тактов
   оставалась видна при игре; теперь он тоже сверху (см. #panelLoop в style.css) — сетку видно после
   закрытия панели. */
function showLoop(on){ panelLoopEl.classList.toggle('on',on); loopPanelBtn.classList.toggle('on',on);
  if(on){ panelScaleEl.classList.remove('on'); refreshMetreCtl(); } }   // при открытии — актуализируем блокировку размера (петля могла измениться при закрытой панели)
function showScale(on){ panelScaleEl.classList.toggle('on',on); if(on)showLoop(false); }
$('panelClose').onclick=()=>showScale(false);
scaleBtn.onclick=()=>showScale(!panelScaleEl.classList.contains('on'));
loopPanelBtn.onclick=()=>showLoop(!panelLoopEl.classList.contains('on'));
/* Кнопка учебника (#helpBtn) убрана из панели «Звукоряд» — #helpOv и его логика ЖИВЫ, но учебник
   ВРЕМЕННО недостижим из UI (переедет внутрь «Обучения», когда оно выйдет). Оставляем только
   закрытие: helpClose живёт внутри #helpOv и понадобится, как только оверлей снова начнут открывать. */
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');

/* ===== АВТО-СКРЫТИЕ ВЕРХНЕЙ ПАНЕЛИ (#bar) =====
   Панель разрослась до ~10 кнопок и съедала игровое поле. Теперь она САМА сворачивается (класс .min,
   CSS): в свёрнутом виде на экране остаются ТОЛЬКО индикатор роли (одна кнопка, или ДВЕ половины при
   сплите — видно, что играет каждая) и три кнопки записи (🎥/🎙/●). Это ТЕ ЖЕ DOM-элементы, что в
   раскрытой панели — единый источник состояния, второго набора кнопок нет и рассинхрону неоткуда взяться.
   Раскрытие — любой тап по экрану (тач) или заметное движение мыши (порог MOUSE_EPS гасит дрожание);
   через BAR_HIDE_MS без действий — снова .min. НЕ сворачиваем, пока открыта панель (#panelScale/
   #panelLoop) ИЛИ зажат палец/курсор — иначе меню закрылось бы под рукой. Тап ТОЛЬКО показывает меню:
   игра идёт с камеры (жесты), ввод с тача не читает никто — раскрытие не крадёт жест и не рождает ноту. */
const barEl=$('bar');
const BAR_HIDE_MS=3500, MOUSE_EPS=8;            // BAR_HIDE_MS — авто-скрытие, мс; MOUSE_EPS — порог движения мыши, px
let barTimer=0, pointerDown=false, lastMX=null, lastMY=null;
const panelOpen=()=>panelScaleEl.classList.contains('on')||panelLoopEl.classList.contains('on');
function armBarHide(){
  clearTimeout(barTimer);
  barTimer=setTimeout(()=>{
    if(panelOpen()||pointerDown){ armBarHide(); return; }   // под рукой / открытая панель — не сворачиваем, переставляем таймер
    barEl.classList.add('min');
  }, BAR_HIDE_MS);
}
function revealBar(){ barEl.classList.remove('min'); armBarHide(); }   // показать панель и перезавести таймер
addEventListener('pointerdown', ()=>{ pointerDown=true;  revealBar(); });
addEventListener('pointerup',   ()=>{ pointerDown=false; armBarHide(); });
addEventListener('pointercancel',()=>{ pointerDown=false; armBarHide(); });
addEventListener('pointermove', e=>{
  if(e.pointerType==='mouse'){                  // мышь: раскрываем/сбрасываем таймер лишь при движении больше порога — дрожание не мигает панелью
    if(lastMX!==null && Math.hypot(e.clientX-lastMX,e.clientY-lastMY)<MOUSE_EPS)return;
    lastMX=e.clientX; lastMY=e.clientY;
  }
  revealBar();
});

/* СТАРТОВАЯ КАРТОЧКА. Две кнопки: «▶ Играть» (main.js, прежний поток — не трогаем) и «Обучение».
   «Обучение» видима, но пока без функции: тап показывает заметку «скоро» (читается как ЗАПЛАНИРОВАННОЕ,
   кнопку НЕ гасим). Демо строёв (demo.js) и мини-учебник (#helpOv) остаются рабочими в коде — кнопки
   их запуска (со старта и из панели «Звукоряд») сняты, переедут внутрь обучения позже. */
$('learnBtn').onclick=()=>{ $('learnMsg').textContent='Интерактивное обучение готовится — скоро.'; };
/* Ссылки подвала: форма отзыва / поддержка. Пустой URL — прячем ссылку. Отзыв без формы → mailto с
   адресом, собранным в рантайме (не в HTML-исходнике). Зовётся один раз при загрузке модуля. */
function buildStartLinks(){
  const fb=$('fbLink'), dn=$('donateLink');
  if(FEEDBACK_URL){ fb.href=FEEDBACK_URL; fb.target='_blank'; fb.textContent='Форма отзыва'; }
  else{ const a=FB_MAIL_USER+'@'+FB_MAIL_DOMAIN; fb.href='mailto:'+a; fb.removeAttribute('target'); fb.textContent='Написать: '+a; }
  fb.style.display='';                                   // отзыв виден всегда (форма или почта-fallback)
  if(DONATE_URL){ dn.href=DONATE_URL; dn.target='_blank'; dn.textContent='Поддержать проект'; dn.style.display=''; }
  else dn.style.display='none';                          // донат без URL — прячем (мёртвую ссылку не рисуем)
}
buildStartLinks();
$('panicBtn').onclick=()=>{ panic(); resetJamDisplay(); };   // паника гасит всё → индикатор джема тоже в покой
 
/* Смена традиции = смена лада: иначе продолжал бы звучать лад чужой традиции, а меню
   показывало бы другой. Переключаемся на ПЕРВЫЙ лад традиции тем же путём, что и selScale. */
selTradition.onchange=e=>{
  fillScales(e.target.value);
  const first=scalesOfTrad(e.target.value)[0];
  if(!first)return;
  selScale.value=first.i;
  setScaleIdx(first.i); softAllOff(); updScaleBtn(); refreshProgAvail();
};
selScale.onchange=e=>{
  setScaleIdx(+e.target.value); softAllOff();
  updScaleBtn(); refreshProgAvail();          // 2/3: смена лада
};
selTonic.onchange=e=>{ setTonic(+e.target.value); softAllOff(); updScaleBtn(); };   // 3/3: смена тоники
/* ЭТАЛОН A4 — единый источник высоты (двигает ВСЕ строи, подвижные и фиксированные, вместе).
   Два ввода: пресеты-подсказки (учат: 415 барочный … 444 оркестровый) и свободное число, КЛАМП 380–480;
   невалид/пусто → откат к последнему валидному, высота НИКОГДА не ломается. Смена ре-настраивает как
   тоника: softAllOff гасит звучащее (переатакует на новом эталоне), терменвокс и слои петли считают
   Hz живьём (leadFreq/chordFreqs читают aRef), дрон вне softAllOff — переигрываем сразу, если активен. */
const AREF_MIN=380, AREF_MAX=480;
const aRefSel=$('aRefSel'), aRefInput=$('aRefInput');
let lastARef=aRef;                                 // последнее ВАЛИДНОЕ значение — для отката
function syncARef(v){ aRefInput.value=v; aRefSel.value=String(v); }   // отразить в обоих; v не из списка → пресет пуст (кастом)
function applyARef(v){
  setARef(v); lastARef=v;
  softAllOff();                                    // звучащее гаснет и переиграется на новом эталоне (как смена тоники)
  if(events.some(e=>e.fn==='drone'))droneOn();     // дрон softAllOff не трогает — переигрываем на новую опору сразу (lvl 0.18, как в аранжировке)
}
aRefSel.onchange=e=>{ const v=+e.target.value; applyARef(v); syncARef(v); };
aRefInput.onchange=e=>{
  const v=Math.round(parseFloat(e.target.value));
  if(!Number.isFinite(v)||v<AREF_MIN||v>AREF_MAX){ syncARef(lastARef); return; }   // мусор/пусто/вне диапазона → откат, высота цела
  applyARef(v); syncARef(v);
};
syncARef(aRef);                                    // старт: 440 в обоих контролах
$('qTriad').onclick=()=>{ setSeventh(false); softAllOff(); $('qTriad').classList.add('act'); $('qSev').classList.remove('act'); };
$('qSev').onclick =()=>{ setSeventh(true);  softAllOff(); $('qSev').classList.add('act');  $('qTriad').classList.remove('act'); };
selLead.onchange=e=>setLeadInstr(+e.target.value);
selChord.onchange=e=>setChIdx(+e.target.value);
selBass.onchange=e=>setBassInstr(+e.target.value);
qOn.onclick =()=>{ setLoopQuant(true);  qOn.classList.add('act');  qOff.classList.remove('act'); };
qOff.onclick=()=>{ setLoopQuant(false); qOff.classList.add('act'); qOn.classList.remove('act'); };
bpmEl.oninput=e=>{ setLoopBpm(+e.target.value); bpmV.textContent=loop.bpm; };
selDrumKit.onchange=e=>setDrumKit(+e.target.value);
 
recBtn.onclick=onRec;
loopBtn.onclick=onLoop;
$('undoBtn').onclick=onUndo;
$('clrBtn').onclick=()=>{ clearRec(); resetJamDisplay(); };   // очистка петли → индикатор джема в покой
loopMinus.onclick=()=>{ setLoopBars(loop.bars-1); loopBarsV.textContent=loop.bars; };
loopPlus.onclick =()=>{ setLoopBars(loop.bars+1); loopBarsV.textContent=loop.bars; };
loopMetre.onchange=e=>{ setLoopMetre(+e.target.value); refreshMetreCtl(); };   // сеттер гейтит пустую петлю; refresh перечитает (клампнутое) значение + перефильтрует ритмы
addArrBtn.onclick=()=>{ loadArrangement({prog:+selProg.value, rhythm:+selRhythm.value, bass:selBassMode.value}); loopBarsV.textContent=loop.bars; };

/* Выбор инструмента. При любом переключении глушим звук — роли/зоны рук меняются.
   PC-режим удалён: вертикальная раскладка — единственная, поэтому нет ни modeBtn, ни класса .phone. */
const INSTR_SEQ=['ld','ch','bs','dr'];
const INSTR_LBL={ld:'🎸 Соло', ch:'🎹 Аккорды', bs:'🎚 Бас', dr:'🥁 Ударные'};
function applyInstr(){ instrBtn.textContent = INSTR_LBL[phoneInstr];
  instrBtn.style.setProperty('--role', INSTR_COL[phoneInstr]); renderHandFn(); }   // цвет роли; секция «Функции рук» зависит от активной роли
/* ФУНКЦИИ РУК: по выпадающему НА РУКУ (Левая/Правая) для КАЖДОЙ роли с записью (соло/бас/аккорды), что
   сейчас в игре. Строим динамически (как fillScales): single-role — одна роль; сплит — каждая ld/бас/ch-
   половина (пропуская dr, у неё записи нет). Строки помечены РУКОЙ, сгруппированы под ярлыком роли (🎸
   Соло / 🎹 Аккорды / 🎚 Бас) — видно, что назначение ПО РУКЕ, не по половине. Бас без 'fx'; аккорды —
   только защёлка/удержание (ни 'fx', ни терменвокса). Смена — setHandFn + softAllOff. */
const HANDFN_OPTS={
  ld:[['fx','Эффекты'],['note','Ноты (непрерывно)'],['hold','Ноты (с удержанием)'],['therm','Терменвокс']],
  bs:[['note','Ноты (непрерывно)'],['hold','Ноты (с удержанием)'],['therm','Терменвокс']],
  ch:[['latch','Аккорды (защёлка)'],['hold','Аккорды (с удержанием)']],
};
const handFnRows=$('handFnRows'), handFnSep=$('handFnSep');
const HAS_HANDFN=r=>r==='ld'||r==='bs'||r==='ch';   // роли с записью в handFn (у dr её нет)
function noteRolesInPlay(){
  if(!splitOn) return HAS_HANDFN(phoneInstr) ? [phoneInstr] : [];
  return [...new Set(SPLIT_ROLES)].filter(HAS_HANDFN);   // сплит: уникальные ld/бас/аккорд-половины
}
function renderHandFn(){
  const roles=noteRolesInPlay();
  handFnSep.style.display = handFnRows.style.display = roles.length ? '' : 'none';
  handFnRows.textContent='';
  for(const role of roles){
    const rl=document.createElement('div'); rl.className='handFnRole'; rl.textContent=INSTR_LBL[role];   // ярлык роли (🎸 Соло / 🎚 Бас)
    handFnRows.appendChild(rl);
    for(const hand of ['L','R']){
      const row=document.createElement('div'); row.className='prow';
      const lab=document.createElement('label'); lab.textContent = hand==='L'?'Левая рука':'Правая рука';
      const sel=document.createElement('select');
      for(const [v,t] of HANDFN_OPTS[role]){ const o=document.createElement('option'); o.value=v; o.textContent=t; sel.appendChild(o); }
      sel.value=handFn[role][hand];
      sel.onchange=e=>{ setHandFn(role,hand,e.target.value); softAllOff(); };   // роли/зоны рук меняются → глушим звук (как смена инструмента)
      row.appendChild(lab); row.appendChild(sel); handFnRows.appendChild(row);
    }
  }
}
/* Сплит доступен ТОЛЬКО в ландшафте: в портрете две половины ~195px, палитра аккордов нечитаема. */
const canSplit=()=>innerWidth>innerHeight;
/* ◨ Сплит-экран — только в ландшафте (canSplit). .act — включён. Кнопка-тумблер; выбор пары ролей —
   двумя кнопками половин (instrBtnL/R). */
function applySplit(){
  splitBtn.classList.toggle('act', splitOn);
  splitBtn.title = splitOn ? 'Сплит-экран ВКЛ — тап выключит'
                           : 'Сплит-экран: две роли на двух половинах';
  splitBtn.style.display = canSplit() ? '' : 'none';
  /* Одна кнопка роли (instrBtn) — только вне сплита; две кнопки половин — только в сплите. Никогда
     не видно все три: instrBtn и L/R взаимоисключимы по splitOn. */
  instrBtn.style.display  = !splitOn ? '' : 'none';
  instrBtnL.style.display = instrBtnR.style.display = splitOn ? '' : 'none';
  applySplitRoles();
}
/* Подписи и акцент двух кнопок половин — из SPLIT_ROLES (та же связка INSTR_LBL/INSTR_COL, что у
   instrBtn). Маркер стороны ◧/◨, чтобы было видно, какая половина. Обновляет и видимость 〰. */
function applySplitRoles(){
  [instrBtnL,instrBtnR].forEach((b,i)=>{
    const role=SPLIT_ROLES[i];
    b.textContent = (i===0?'◧ ':'') + INSTR_LBL[role] + (i===1?' ◨':'');
    b.style.setProperty('--role', INSTR_COL[role]);
  });
  renderHandFn();                             // ld/бас-половина могла появиться/исчезнуть — пересобираем секцию «Функции рук»
}
/* Прокрутка роли ОДНОЙ половины: следующий инструмент в INSTR_SEQ, ПРОПУСКАЯ роль ДРУГОЙ половины.
   Так две половины никогда не совпадут → дубль-половины и моно-конфликты (два соло / два баса)
   недостижимы по построению (INSTR_SEQ из 4, другая держит одну — всегда есть 3 варианта). */
function cycleHalf(i){
  const other=SPLIT_ROLES[i^1];
  let r=SPLIT_ROLES[i];
  do{ r=INSTR_SEQ[(INSTR_SEQ.indexOf(r)+1)%INSTR_SEQ.length]; }while(r===other);
  setSplitRole(i,r); softAllOff(); applySplitRoles();
}
instrBtn.onclick =()=>{ setPhoneInstr(INSTR_SEQ[(INSTR_SEQ.indexOf(phoneInstr)+1)%INSTR_SEQ.length]); softAllOff(); applyInstr(); };
instrBtnL.onclick=()=>cycleHalf(0);
instrBtnR.onclick=()=>cycleHalf(1);
splitBtn.onclick =()=>{ setSplitOn(!splitOn); softAllOff(); applySplit(); };
/* 🔄 Переключение камеры (фронт↔тыл). Уже ПОСЛЕ старта: кнопка живёт в #bar, а он виден лишь после
   «▶ Запустить» — камеру на загрузке не трогаем. Запрашиваем ДРУГУЮ facingMode; camFacing (единый
   источник зеркала flipX/mirrored) двигаем ТОЛЬКО после успеха, чтобы картинка и hit-test флипнулись
   вместе. Отказ (нет второй камеры / нет доступа) — откат на прежнюю камеру + короткий тост, без слома. */
let camMsgTimer=0;
function showCamMsg(t){
  camMsg.dataset.msg=t; camMsg.classList.add('on');
  clearTimeout(camMsgTimer); camMsgTimer=setTimeout(()=>camMsg.classList.remove('on'),2600);
}
async function toggleCamera(){
  const next = camFacing==='user' ? 'environment' : 'user';
  camBtn.disabled=true;
  try{
    await switchCamera(next);
    setCamFacing(next);                          // единый источник зеркала — только после успешного открытия
    camBtn.classList.toggle('act', next==='environment');   // .act = тыловая (незеркальная)
  }catch(err){
    try{ await switchCamera(camFacing); }catch(e){}          // откат: возвращаем прежнюю камеру (camFacing не менялся)
    showCamMsg('Вторая камера недоступна');
  }
  camBtn.disabled=false;
}
camBtn.onclick=toggleCamera;
/* ⛶ ПОЛНОЭКРАННЫЙ РЕЖИМ. Две кнопки на ОДНО состояние: тихая на стартовой карточке (fsBtnStart —
   полосы браузера съедают вертикаль ДО игры) и иконка в баре (fsBtn — редкая «задал и забыл», в
   МИНИ-полосу постоянных кнопок НЕ входит, скрыта списком .min в CSS). Обе зовут ОДИН toggle и обе
   отражают состояние через applyFullscreen.
   ПРАВИЛО ЖЕСТА (как звук/камера): requestFullscreen — только из клика, никогда сам на старте.
   ДЕТЕКЦИЯ ПО РЕАЛЬНОМУ API, не по браузеру: iOS Safari на iPhone не умеет полноэкранный для обычных
   элементов (только «на домашний экран») — там прячем ОБЕ кнопки, а не оставляем мёртвыми. Учитываем
   webkit-префикс (старый Safari/Chrome). Выход по Esc/системному жесту ловит fullscreenchange —
   кнопки не соврут о состоянии. Смена размера при входе/выходе идёт обычным путём resize (vision.js
   ресайзит холст, onResize пересчитывает canSplit — потеря хрома может РАЗРЕШИТЬ сплит). */
const fsRoot=document.documentElement;
const fsReq = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
const fsSupported = !!(fsReq && fsExit && fsEnabled);
const fsOn = ()=> !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFullscreen(){
  if(!fsSupported)return;
  try{ const p = fsOn() ? fsExit.call(document) : fsReq.call(fsRoot); if(p&&p.catch)p.catch(()=>{}); }
  catch(e){}                                       // отказ (политика/жест) — молча, applyFullscreen выровняет по факту
}
function applyFullscreen(){
  if(!fsSupported){ fsBtn.style.display='none'; fsBtnStart.style.display='none'; return; }   // нет API — обе кнопки прочь (не мёртвые)
  const on=fsOn();
  fsBtn.classList.toggle('act', on);
  fsBtn.title = on ? 'Выйти из полноэкранного режима' : 'Во весь экран: убрать полосы браузера';
  fsBtnStart.classList.toggle('act', on);
  fsBtnStart.textContent = on ? '⛶ Свернуть' : '⛶ Во весь экран';
  fsBtnStart.title = fsBtn.title;
}
fsBtn.onclick=toggleFullscreen;
fsBtnStart.onclick=toggleFullscreen;
addEventListener('fullscreenchange', applyFullscreen);
addEventListener('webkitfullscreenchange', applyFullscreen);   // старый Safari/Chrome — своё имя события
applyFullscreen();                                 // старт: отразить факт (и спрятать обе, если API нет)
/* 🎥 ВИДЕОКЛИП (кадр холста + звук) и 🎙 АУДИО (только звук) — один движок clip.js на два вида.
   Тап старт / тап стоп+сохранение. Индикатор записи — .act (красный). Инертно до тапа; кнопки живут
   в #bar, а он виден лишь после «▶ Запустить». ВЗАИМНОЕ ИСКЛЮЧЕНИЕ: пока идёт одна запись, ДРУГАЯ
   кнопка disabled (два рекордера на одном отводе недопустимы) — видно, что нельзя, а не «молча не
   работает». Обе кнопки обновляет applyRec из ЕДИНОГО источника правды (activeKind через onClipChange),
   поэтому .act/disabled и реальное состояние не разойдутся. Форматы честно: видео WebM (соцсети могут
   просить MP4), аудио WebM/Opus (Safari может дать mp4) — MP3/WAV не обещаем. */
function applyRec(){
  const k=activeKind();                          // 'video' | 'audio' | null
  clipBtn.classList.toggle('act', k==='video');  clipBtn.disabled  = k==='audio';   // идёт аудио → видео нельзя
  audioBtn.classList.toggle('act', k==='audio'); audioBtn.disabled = k==='video';   // идёт видео → аудио нельзя
  clipBtn.title = k==='video' ? 'Идёт запись клипа — тап остановит и сохранит'
    : 'Запись клипа: видео+звук в один файл (WebM; соцсети могут просить MP4 — понадобится конвертация)';
  audioBtn.title = k==='audio' ? 'Идёт запись аудио — тап остановит и сохранит'
    : 'Запись аудио: только звук в файл (WebM/Opus; Safari может дать mp4)';
}
clipBtn.onclick=()=>{
  if(activeKind()==='video'){ stopClip(); showCamMsg('Сохраняю клип…'); }   // .act снимет onClipChange, когда рекордер РЕАЛЬНО остановится (onstop), не по тапу
  else{
    try{ startClip('video'); showCamMsg('● Идёт запись клипа'); }           // .act/disabled поставит onClipChange из startClip
    catch(err){ applyRec(); showCamMsg('Клип: '+(err&&err.message||err)); }   // старт бросил — состояние точно покой; синхронно приводим кнопки в покой
  }
};
audioBtn.onclick=()=>{
  if(activeKind()==='audio'){ stopClip(); showCamMsg('Сохраняю аудио…'); }
  else{
    try{ startClip('audio'); showCamMsg('● Идёт запись аудио'); }
    catch(err){ applyRec(); showCamMsg('Аудио: '+(err&&err.message||err)); }
  }
};
onClipChange(applyRec);                           // единый источник правды в clip.js уведомляет обе кнопки — .act/disabled/рекордер не разойдутся
applyRec();                                       // старт: покой

/* 🎵 ДЖЕМ — подложка по строю одним тапом; каждый следующий тап — СЛЕДУЮЩИЙ вариант (прежний
   СТОП, новый старт — варианты не слоятся), в конце ВЫКЛ и по кругу. Джем — не режим: это обычные
   слои лупера, помеченные e.jam (loadJam/clearJam), поэтому ⚙-панель, undo и запись работают как
   обычно. ВАРИАНТ ВЫБИРАЕТСЯ ПО СВОЙСТВАМ лада, не по имени/индексу. Данные берём из существующих
   HARMONIES/RHYTHMS/BASS_MODES — джем только ВЫБИРАЕТ. */
const JH_DRONE=0, JH_IviiiV=2, JH_IIVV=3;         // индексы HARMONIES: Дрон / I–vi–ii–V / I–IV–V
const JR_BACK=0, JR_MAQSUM=1, JR_NONE=-1;         // индексы RHYTHMS: Бэкбит / Маqсум; -1 → RHYTHMS[-1]=undefined → без ударных
/* Список вариантов (каждый — sel для лупера) в порядке переключения; выкл добавляет цикл в jamBtn. */
function jamVariants(){
  const chords=supportsChords(), prog=supportsProgressions()&&chords;   // 7 ступеней И есть аккорды (макам: 7 ступеней, но noChords → сюда не попадёт)
  if(prog) return [
    {prog:JH_IviiiV, rhythm:JR_BACK, bass:'roots'},   // I–vi–ii–V + бас по корням + бэкбит
    {prog:JH_IIVV,   rhythm:JR_BACK, bass:'roots'},   // I–IV–V + корни + бэкбит
    {prog:JH_DRONE,  rhythm:JR_NONE, bass:'pedal'},   // дрон + педаль, без ударных
  ];
  if(chords) return [                                 // аккорды, но не 7 ступеней: хроматика/19/31/партч/пифагор/натур/мезотон/пентатоники
    {prog:JH_DRONE, rhythm:JR_BACK, bass:'pedal'},    // дрон + педаль + бэкбит
    {prog:JH_DRONE, rhythm:JR_NONE, bass:'pedal'},    // дрон + педаль, без ударных
  ];
  if(CUR().edo===24) return [                         // !supportsChords + 24-TET = макам: уместен маqсум (24-TET уникален для макамов)
    {prog:JH_DRONE, rhythm:JR_MAQSUM, bass:'pedal'},  // дрон + педаль + маqсум
    {prog:JH_DRONE, rhythm:JR_NONE,   bass:'pedal'},  // дрон + педаль, без ударных
  ];
  return [                                            // прочие бесаккордовые (гамелан/BP/Карлос/раги): ударные чужды — сразу лёгкий вариант
    {prog:JH_DRONE, rhythm:JR_NONE, bass:'pedal'},    // дрон + педаль, без ударных
  ];
}
let jamStep=0;                                    // 0 = выкл, 1..N = номер варианта (место в цикле; сам джем — слои лупера)
function applyJam(){
  const n=jamVariants().length;
  jamBtn.classList.toggle('act', jamStep>0);
  jamBtn.textContent = jamStep>0 ? `🎵 ${jamStep}/${n}` : '🎵 Джем';
  jamBtn.title = jamStep>0 ? 'Джем играет — тап сменит вариант (в конце выключит)'
                           : 'Джем: подложка по строю — тап включит, следующий тап сменит вариант';
}
/* Подгоняем ритм варианта под ТЕКУЩИЙ размер петли: паттерн другого размера buildArrangement всё равно
   пропустит (джем остался бы без ударных) → берём первый RHYTHMS со своим beats===loop.metre, иначе без
   ударных (-1). На 4/4 ничего не меняется (ритмы джема уже beats:4) — байт-в-байт. */
function fitRhythm(sel){
  if(sel.rhythm<0 || (RHYTHMS[sel.rhythm] && (RHYTHMS[sel.rhythm].beats||4)===loop.metre)) return sel;
  const alt=RHYTHMS.findIndex(r=>(r.beats||4)===loop.metre);
  return {...sel, rhythm: alt};                   // findIndex вернёт -1, если совместимого нет → без ударных
}
function jamTo(step, vars){
  clearJam();                                     // снять ПРОШЛЫЕ слои джема (записи игрока целы — они без метки jam)
  if(step>0 && !loadJam(fitRhythm(vars[step-1]))){   // не встало (петля игрока другого размера) — честно сообщаем, цикл → выкл
    showCamMsg('Джем: петля другого размера — очистите её (✕)'); jamStep=0; applyJam(); return;
  }
  jamStep=step; applyJam();
}
jamBtn.onclick=()=>{
  if(!AC)return;
  const vars=jamVariants();
  let next=jamStep+1; if(next>vars.length)next=0;      // …→ vN → выкл → v1
  jamTo(next, vars);
};
function resetJamDisplay(){ jamStep=0; applyJam(); }    // внешняя очистка/паника петли: цикл джема начинается заново
applyJam();                                       // старт: выкл
/* Поворот экрана: свой слушатель resize у UI (vision.js в UI не лезет — DOM-граница). Повернули в
   портрет на включённом сплите → выключаем его (softAllOff — ничего не оставляем звучать), иначе
   застряли бы в неиграбельной двух-половинной раскладке. Обратно в ландшафт НЕ включаем сами —
   пользователь жмёт ◨ вручную (предсказуемо). applySplit всегда обновляет видимость кнопок. */
function onResize(){
  if(splitOn && !canSplit()){ setSplitOn(false); softAllOff(); }
  applySplit();
}
addEventListener('resize', onResize);
applySplit(); applyInstr();      // applySplit → applySplitRoles → renderHandFn; applyInstr → renderHandFn (инициализация кнопок ролей и секции «Функции рук»)
 
export { $, revealBar };
