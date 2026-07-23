import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         phoneInstr, swapHands, setPhoneInstr, setSwapHands, theremin, setTheremin, splitOn, setSplitOn, SPLIT_ROLES, setSplitRole,
         camFacing, setCamFacing } from './state.js';
import { switchCamera } from './vision.js';
import { startClip, stopClip, clipActive, onClipChange } from './clip.js';
import { SCALES, NOTE_NAMES, TRADITIONS, scalesOfTrad, tradOfScale, supportsProgressions, supportsChords } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopQuant, setLoopBpm, loop, recording, loadArrangement } from './recorder.js';
import { HARMONIES, RHYTHMS, BASS_MODES } from './arrange.js';
import { INSTR_COL } from './config.js';
import { hooks } from './hooks.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), instrBtnL=$('instrBtnL'), instrBtnR=$('instrBtnR'), swapBtn=$('swapBtn'), thereminBtn=$('thereminBtn'), splitBtn=$('splitBtn'), camBtn=$('camBtn'), camMsg=$('camMsg'), clipBtn=$('clipBtn'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'),
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
buildUI();

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
hooks.loop      = on => { loopBtn.classList.toggle('on', on); loopBtn.textContent = on ? '❚❚ луп' : '⟳ луп'; updRecBtn(); };

/* Шаг 3 MENU-PLAN: панели РАЗНОЙ природы. Звукоряд — оверлей (выбрал и закрыл),
   лупер — рабочая панель снизу (играть можно с открытой). Одна за раз: обе — карточки
   почти во весь экран, вместе они бы перекрылись, поэтому открытие одной прячет другую. */
function showLoop(on){ panelLoopEl.classList.toggle('on',on); loopPanelBtn.classList.toggle('on',on);
  if(on)panelScaleEl.classList.remove('on'); }
function showScale(on){ panelScaleEl.classList.toggle('on',on); if(on)showLoop(false); }
$('panelClose').onclick=()=>showScale(false);
scaleBtn.onclick=()=>showScale(!panelScaleEl.classList.contains('on'));
loopPanelBtn.onclick=()=>showLoop(!panelLoopEl.classList.contains('on'));
$('helpBtn').onclick=()=>$('helpOv').classList.add('on');
$('helpClose').onclick=()=>$('helpOv').classList.remove('on');
$('panicBtn').onclick=panic;
 
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
$('clrBtn').onclick=clearRec;
loopMinus.onclick=()=>{ setLoopBars(loop.bars-1); loopBarsV.textContent=loop.bars; };
loopPlus.onclick =()=>{ setLoopBars(loop.bars+1); loopBarsV.textContent=loop.bars; };
addArrBtn.onclick=()=>{ loadArrangement({prog:+selProg.value, rhythm:+selRhythm.value, bass:selBassMode.value}); loopBarsV.textContent=loop.bars; };

/* Выбор инструмента и обмен рук. При любом переключении глушим звук — роли/зоны рук меняются.
   PC-режим удалён: вертикальная раскладка — единственная, поэтому нет ни modeBtn, ни класса .phone. */
function applySwap(){                          // ⇄ — меняет местами ноты/эффекты у рук (соло-зона + палитра)
  swapBtn.classList.toggle('act', swapHands);
  swapBtn.title = swapHands ? 'Правая рука: эффекты — тап вернёт ей ноты'
                            : 'Правая рука: ноты — тап отдаст ей эффекты';
}
const INSTR_SEQ=['ld','ch','bs','dr'];
const INSTR_LBL={ld:'🎸 Соло', ch:'🎹 Аккорды', bs:'🎚 Бас', dr:'🥁 Ударные'};
function applyInstr(){ instrBtn.textContent = INSTR_LBL[phoneInstr];
  instrBtn.style.setProperty('--role', INSTR_COL[phoneInstr]); applyTheremin(); }   // цвет роли — в CSS-переменную; видимость 〰 зависит от роли
/* 〰 Терменвокс — компаньон кнопки роли: виден, когда есть соло-поверхность. .act — режим включён. */
function applyTheremin(){
  thereminBtn.classList.toggle('act', theremin);
  thereminBtn.title = theremin ? 'Терменвокс ВКЛ: непрерывная высота — тап выключит'
                               : 'Терменвокс: непрерывная высота (глиссандо)';
  /* 〰 виден, когда есть соло-поверхность: вне сплита — если роль соло; в сплите — если одна из
     половин соло (терменвокс работает в соло-зоне 'ld'). */
  thereminBtn.style.display = (splitOn ? SPLIT_ROLES.includes('ld') : phoneInstr==='ld') ? '' : 'none';
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
  applyTheremin();                             // соло-половина могла появиться/исчезнуть — обновляем видимость 〰
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
swapBtn.onclick  =()=>{ setSwapHands(!swapHands); softAllOff(); applySwap(); };
thereminBtn.onclick=()=>{ setTheremin(!theremin); softAllOff(); applyTheremin(); };
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
/* 🎥 Запись ВИДЕОКЛИПА (кадр холста + звук в один файл) — отдельно от лупера (● музыкальная запись).
   Тап старт / тап стоп+сохранение. Индикатор записи — класс .act (красный). Инертно до тапа; кнопка
   живёт в #bar, а он виден лишь после «▶ Запустить», поэтому до старта записать нельзя. Формат честно
   WebM (в подсказке предупреждаем про возможную конвертацию в MP4 для соцсетей). */
function applyClip(){
  const on=clipActive();
  clipBtn.classList.toggle('act', on);
  clipBtn.title = on ? 'Идёт запись клипа — тап остановит и сохранит'
                     : 'Запись клипа: видео+звук в один файл (WebM; соцсети могут просить MP4 — понадобится конвертация)';
}
clipBtn.onclick=()=>{
  if(clipActive()){ stopClip(); showCamMsg('Сохраняю клип…'); }   // .act снимет onClipChange, когда рекордер РЕАЛЬНО остановится (onstop), не по тапу
  else{
    try{ startClip(); showCamMsg('● Идёт запись клипа'); }        // .act поставит onClipChange из startClip
    catch(err){ applyClip(); showCamMsg('Клип: '+(err&&err.message||err)); }   // старт бросил — состояние точно покой; синхронно приводим кнопку в покой
  }
};
onClipChange(applyClip);                          // единый источник правды в clip.js уведомляет — кнопка/флаг/рекордер не разойдутся
applyClip();                                     // старт: покой
/* Поворот экрана: свой слушатель resize у UI (vision.js в UI не лезет — DOM-граница). Повернули в
   портрет на включённом сплите → выключаем его (softAllOff — ничего не оставляем звучать), иначе
   застряли бы в неиграбельной двух-половинной раскладке. Обратно в ландшафт НЕ включаем сами —
   пользователь жмёт ◨ вручную (предсказуемо). applySplit всегда обновляет видимость кнопок. */
function onResize(){
  if(splitOn && !canSplit()){ setSplitOn(false); softAllOff(); }
  applySplit();
}
addEventListener('resize', onResize);
applySplit(); applyInstr(); applySwap();      // applySplit → applySplitRoles → applyTheremin (инициализация всех кнопок ролей)
 
export { $ };
