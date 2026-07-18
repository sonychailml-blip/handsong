import { scaleIdx, tonic, setScaleIdx, setTonic, setSeventh, setChIdx,
         uiMode, phoneInstr, swapHands, setUiMode, setPhoneInstr, setSwapHands } from './state.js';
import { SCALES, NOTE_NAMES, supportsProgressions, supportsChords } from './scales.js';
import { setLeadInstr, setBassInstr, setDrumKit, LEAD_INSTR, CHORD_INSTR, BASS_INSTR, DRUM_KITS } from './audio.js';
import { softAllOff, panic, onRec, onLoop, onUndo, clearRec, setLoopBars, setLoopQuant, setLoopBpm, loop, recording, loadArrangement } from './recorder.js';
import { HARMONIES, RHYTHMS, BASS_MODES } from './arrange.js';
import { hooks } from './hooks.js';

/* ================= UI ================= */
const $=id=>document.getElementById(id);
const recBtn=$('recBtn'), loopBtn=$('loopBtn'),
      instrBtn=$('instrBtn'), modeBtn=$('modeBtn'), swapBtn=$('swapBtn'),
      loopMinus=$('loopMinus'), loopPlus=$('loopPlus'), loopBarsV=$('loopBarsV'),
      selScale=$('selScale'), selTonic=$('selTonic'),
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

function buildUI(){
  // лады с группировкой
  let g=null, og=null;
  SCALES.forEach((s,i)=>{
    if(s.grp!==g){ g=s.grp; og=document.createElement('optgroup'); og.label=g; selScale.appendChild(og); }
    const o=document.createElement('option'); o.value=i; o.textContent=s.name; og.appendChild(o);
  });
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
function updRecBtn(){                         // ярлык кнопки записи зависит от режима
  recBtn.classList.toggle('on', recording);
  recBtn.textContent = recording ? (loop.first ? '● …круг' : '● …слой')
                                  : (loop.on ? '＋ слой' : '● запись');
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

/* Режим управления: ПК ↔ Смартфон, выбор инструмента (phone), обмен рук.
   При любом переключении глушим звук — зоны/роли рук меняются. */
/* Шаг 4 MENU-PLAN: пара кнопок → ОДНА иконка-тумблер, сама себе индикатор.
   Логика прежняя (setUiMode + класс .phone на body) — поменялось только отображение
   и то, чем это дёргают. Видимость ⇄ висит на том же .phone через CSS. */
function applyMode(){
  document.body.classList.toggle('phone', uiMode==='phone');
  modeBtn.textContent = uiMode==='phone' ? '📱' : '💻';
  modeBtn.title = uiMode==='phone' ? 'Режим: Смартфон — тап переключит на ПК'
                                   : 'Режим: ПК — тап переключит на Смартфон';
}
function applySwap(){                          // ⇄ — только в «Смартфон» (в ПК роль по месту, не по руке)
  swapBtn.classList.toggle('act', swapHands);
  swapBtn.title = swapHands ? 'Правая рука: эффекты — тап вернёт ей ноты'
                            : 'Правая рука: ноты — тап отдаст ей эффекты';
}
const INSTR_SEQ=['ld','ch','bs','dr'];
const INSTR_LBL={ld:'🎸 Соло', ch:'🎹 Аккорды', bs:'🎚 Бас', dr:'🥁 Ударные'};
function applyInstr(){ instrBtn.textContent = INSTR_LBL[phoneInstr]; }
modeBtn.onclick  =()=>{ setUiMode(uiMode==='phone'?'pc':'phone'); softAllOff(); applyMode(); };
instrBtn.onclick =()=>{ setPhoneInstr(INSTR_SEQ[(INSTR_SEQ.indexOf(phoneInstr)+1)%INSTR_SEQ.length]); softAllOff(); applyInstr(); };
swapBtn.onclick  =()=>{ setSwapHands(!swapHands); softAllOff(); applySwap(); };
applyMode(); applyInstr(); applySwap();
 
export { $ };
