/* CORE-1 CP4: a development panel for the calibration, no app UI and no console needed: run it, set the sliders, measure the wrist. Address: <page>?probe&calpanel. It lives under
   tools/, so previews carry it and production doesn't (the page has no probes tag there; tools/smoke-paths.mjs checks both). Stores numbers only; nothing leaves the device unless copied. */
import { handCalOpen, handCalRead, handCalSetDepthSens, handCalSetSens, handCalSetDir, handCalReset, handCalStart, handCalCancel, handCalAccept, handCalState, onHandCal } from '../../../core/handcal.js';
import { CAL, calFarRatio } from '../../../core/pure/handcal.js';
import { BUS } from '../../../core/pure/bus.js';
import { AC } from '../../../core/audio.js';
import { chainKeyOf, fxChainOf, FX_VOL } from '../../../core/state.js';

const W={
  title:['Калибровка: проверка','Calibration: test'], open:['Калибр.','Calib.'], close:['Свернуть','Fold'],
  start:['Калибровать','Calibrate'], save:['Сохранить','Save'], cancel:['Отмена','Cancel'],
  play:['Сначала нажмите Play в приложении.','Press Play in the app first.'],
  idle:['Поднесите играющую руку так близко, как хотите играть. Вся рука в кадре.','Bring your playing hand as close as you want to play, whole hand in the frame.'],
  waitHand:['Покажите руку.','Show your hand.'], holdNear:['Держите неподвижно…','Hold still…'],
  review:['Попробуйте поиграть. Сохранить?','Try playing. Save?'], saved:['Сохранено.','Saved.'], cancelled:['Отменено.','Cancelled.'],
  back:['Вся рука должна быть в кадре: чуть дальше от камеры.','The whole hand must be in the frame: move back a little.'],
  closer:['Рука слишком далеко: подойдите ближе.','Your hand is too far: come closer.'], still:['Рука движется: держите неподвижно.','Your hand is moving: hold it still.'],
  depth:['Глубина: ход руки','Depth: hand travel'], fx:['Эффекты: чувствительность','Effects: sensitivity'], dir:['Направление','Direction'],
  near0:['близко = 0','near = 0'], near100:['близко = 100','near = 100'], auto:['как задано','default'],
  reset:['Сбросить камеру','Reset this camera'], resetAll:['Сбросить всё','Reset everything'], copy:['Скопировать числа','Copy the numbers'], copied:['Скопировано.','Copied.'],
  wrist:['Проверка запястья (6 с)','Wrist test (6 s)'], wristRun:['Рука на месте, поворачивайте кисть…','Keep the hand in place, turn your wrist…'],
};
const WHY={
  'no-hand':['Руку не видно.','No hand in view.'], 'not-still':['Рука двигалась.','Your hand kept moving.'], 'out-of-frame':['Рука не помещалась в кадр: отойдите чуть дальше.','The hand did not fit the frame: move back a little.'],
  'too-far':['Рука была слишком далеко: подойдите ближе.','Your hand was too far: come closer.'], 'hand-lost':['Рука пропала из виду.','The hand was lost.'], 'low-rate':['Слишком мало кадров: нужно больше света.','Too few frames: it needs more light.'],
  busy:['Сейчас нельзя: идёт запись или открыт редактор.','Not now: recording, or an editor is open.'], synthetic:['Сейчас рукой управляет подсказка: покажите свою руку и нажмите снова.','The hint is driving the hand: show your own hand and press again.'],
  'camera-changed':['Камера сменилась.','The camera changed.'], cancelled:['Отменено.','Cancelled.'],
};
const say=w=>w ? w[0]+' / '+w[1] : '';
const CSS=`#calPill,#calPanel{position:fixed;z-index:2147483000;font:15px/1.3 system-ui,sans-serif;color:#f1eee4}
#calPill{left:8px;bottom:8px;min-height:48px;min-width:72px;background:#c8f56a;color:#10140a;border:0;border-radius:12px;font-weight:600}
#calPanel{left:0;right:0;top:0;max-height:72vh;overflow:auto;background:rgba(7,9,13,.86);padding:10px 12px 14px;box-sizing:border-box}
#calPanel[hidden]{display:none}
#calPanel h2{font-size:16px;margin:0 0 4px}
#calPanel .row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
#calPanel button{min-height:48px;flex:1 1 72px;background:#222936;color:#f1eee4;border:1px solid #3a4454;border-radius:10px;font:600 15px system-ui,sans-serif;padding:4px 8px}
#calPanel button.on{background:#c8f56a;color:#10140a}
#calPanel button[hidden]{display:none}
#calPanel .label{color:#a4acba;font-size:13px;margin-top:8px}
#calSay{font-size:17px;font-weight:600;min-height:44px}
#calNums{font:13px ui-monospace,monospace;color:#c8d0dc}
.calBar{height:14px;background:#11151d;border:1px solid #3a4454;border-radius:7px;overflow:hidden;margin:4px 0}
.calBar i{display:block;height:100%;width:0;background:#c8f56a}
#calCopy{width:100%;height:80px;font:11px ui-monospace,monospace;background:#11151d;color:#f1eee4}`;

export function mountCalPanel(app){
  const el=(tag,props={},...kids)=>{ const e=Object.assign(document.createElement(tag),props); e.append(...kids); return e; };
  const btn=(w,fn)=>el('button',{ textContent:say(w), onclick:fn });
  handCalOpen({ scope:'dev-'+app });
  let wrist=null, wristText='', note=null;
  const pill=el('button',{ id:'calPill', textContent:W.open[1] });
  const sayEl=el('div',{ id:'calSay' }), nums=el('div',{ id:'calNums' }), prog=el('i'), depthBar=el('i');
  const startB=btn(W.start,()=>{ note=null; const why=handCalStart(); if(why) note=WHY[why]||[why,why]; draw(); });
  const saveB=btn(W.save,()=>{ handCalAccept(); note=W.saved; draw(); }), cancelB=btn(W.cancel,()=>{ handCalCancel(); note=W.cancelled; draw(); });
  const stops=(values,set,get)=>{ const r=el('div',{ className:'row' }), bs=values.map(v=>{ const b=el('button',{ textContent:v+'×', onclick:()=>{ set(v); draw(); } }); b.dataset.v=v; r.append(b); return b; }); return { r, sync:()=>{ const c=get(); for(const b of bs) b.classList.toggle('on',+b.dataset.v===c); } }; };
  const dS=stops([CAL.depthMin,1,1.4,2],handCalSetDepthSens,()=>handCalRead().global.depth), fS=stops([CAL.sensMin,0.7,1,1.4,2],v=>handCalSetSens(v),()=>handCalRead().global.fx);
  /* every control on the playing hand's depth, as the app's chains have them now */
  const depthIds=()=>{ const out=[]; for(const role of ['ld','ch','bs','dr']){ const key=chainKeyOf(role); for(const e of fxChainOf(key)) e.params.forEach((pa,i)=>{ if(pa.mode==='drive'&&pa.hand==='play'&&pa.axis==='z') out.push({ id:key+'|'+e.fxId+':'+i, key, fxId:e.fxId, i }); }); } return out; };
  const dirBox=el('div'); let dirSig='';
  function buildDirs(){ const list=depthIds(), sig=list.map(x=>x.id).join(); if(sig===dirSig) return; dirSig=sig; dirBox.textContent='';
    for(const c of list) import('../../../core/audio.js').then(A=>{ const id=c.key+'|'+c.fxId+':'+A.fxParamKeysOf(c.fxId)[c.i]; dirBox.append(el('div',{ className:'label', textContent:say(W.dir)+': '+c.fxId+(c.fxId===FX_VOL?' (volume)':'')+', '+c.key }), el('div',{ className:'row' }, btn(W.near0,()=>handCalSetDir(id,'near0')), btn(W.near100,()=>handCalSetDir(id,'near100')), btn(W.auto,()=>handCalSetDir(id,null)))); }); }
  const wristB=btn(W.wrist,()=>{ wrist={ until:performance.now()+6000, lo:Infinity, hi:-Infinity, n:0 }; wristText=''; });
  const copyArea=el('textarea',{ id:'calCopy', readOnly:true, hidden:true });
  const report=()=>{ const r=handCalRead(), st=handCalState(); return JSON.stringify({ format:'handsong/calpanel', app, ua:navigator.userAgent, calibrated:r.calibrated, near:r.near, global:r.global, controls:r.controls, phase:st.phase, reason:st.reason, wrist:wristText||null }); };
  const copyB=btn(W.copy,async()=>{ copyArea.value=report(); try{ await navigator.clipboard.writeText(copyArea.value); note=W.copied; }catch(e){ copyArea.hidden=false; copyArea.focus(); copyArea.select(); } draw(); });
  const panel=el('div',{ id:'calPanel', hidden:true },
    el('h2',{ textContent:say(W.title) }), sayEl, el('div',{ className:'calBar' },prog), nums, el('div',{ className:'label', textContent:'d' }), el('div',{ className:'calBar' },depthBar),
    el('div',{ className:'row' },startB,saveB,cancelB),
    el('div',{ className:'label', textContent:say(W.depth) }), dS.r, el('div',{ className:'label', textContent:say(W.fx) }), fS.r, dirBox,
    el('div',{ className:'row' },wristB,copyB), el('div',{ className:'row' },btn(W.reset,()=>{ const r=handCalRead(); handCalReset({ camera:r.camera }); draw(); }),btn(W.resetAll,()=>{ handCalReset({ all:true }); draw(); })), copyArea);
  pill.onclick=()=>{ panel.hidden=!panel.hidden; pill.textContent=panel.hidden ? W.open[1] : W.close[1]; if(!panel.hidden) buildDirs(); draw(); };
  document.head.append(el('style',{ textContent:CSS })); document.body.append(pill,panel);
  const hand=()=>{ const v=BUS.get('handsView')||[]; return v.find(h=>h.play)||v[0]||null; };
  function draw(){
    const st=handCalState(), r=handCalRead(), going=st.phase==='waitHand'||st.phase==='holdNear';
    let text=note ? say(note) : '';
    if(!AC) text=say(W.play);
    else if(st.phase==='failed') text=say(WHY[st.reason]||[st.reason,st.reason]);
    else if(going||st.phase==='review') text=say(st.advice ? W[st.advice] : W[st.phase]);
    else if(!text) text=say(W.idle);
    if(wrist) text=say(W.wristRun);
    sayEl.textContent=text; prog.style.width=Math.round(st.progress*100)+'%';
    startB.hidden=going||st.phase==='review'; saveB.hidden=st.phase!=='review'; cancelB.hidden=!(going||st.phase==='review');
    const h=hand(), d=h?h.d:null, far=r.near!=null ? r.near*calFarRatio(r.global.depth) : null;
    depthBar.style.width=d==null ? '0' : Math.round(d*100)+'%';
    nums.textContent=`near ${r.near!=null?r.near.toFixed(3):'-'}${r.proposed?' (try)':''} · far ${far!=null?far.toFixed(3):'-'} · d ${d!=null?d.toFixed(3):'-'} · size ${st.size!=null?st.size.toFixed(3):'-'}`+(wristText?' · '+wristText:'');
    dS.sync(); fS.sync();
  }
  onHandCal(draw);
  setInterval(()=>{ if(wrist){ const h=hand(); if(h){ wrist.lo=Math.min(wrist.lo,h.d); wrist.hi=Math.max(wrist.hi,h.d); wrist.n++; }
      if(performance.now()>=wrist.until){ wristText=wrist.n ? `wrist ${wrist.lo.toFixed(2)}–${wrist.hi.toFixed(2)} = ${(wrist.hi-wrist.lo).toFixed(2)}` : 'wrist: no hand'; wrist=null; } }
    if(!panel.hidden) draw(); },100);
}
