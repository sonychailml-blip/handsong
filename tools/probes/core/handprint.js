/* CORE-1 CP4: a performance that MOVES DEPTH, printed per app. HAND1 holds the playing hand's size constant and is «not applicable» on Night, so neither can see a
   change in the depth path. Made on the tree before the mapping existed (tools/prints/hand-depth.<app>.print.json; each app's print is its own baseline, core rule 9).
   Printed per frame: every W* call, hand states, the live voices, the aim of each driven parameter, and the depth the visuals read.
   Rows: «CAL4 depth print»: uncalibrated must stay exact. CONTROL: the same performance with the palm 1% larger must differ. */
import { row } from './rows.js';
import { gestureEnvKeep, gestureEnvSet, GESTURE_ENV, gestureFxKeep } from './hand.js';
import { handsProbe, processHandsProbe, HANDS, fxParamsOf, handsView } from '../../../core/gestures.js';
import { wTapSet, liveAllOff } from '../../../core/recorder.js';
import { hooks } from '../../../core/hooks.js';
import { fxInstance, fxAimGet, fxAimSet, leadHold, bassHold, chordHold } from '../../../core/audio.js';
import { withLang } from '../../../core/i18n.js';
import { pose } from '../../../core/gestures/pose.js';
import { profileCurrent } from '../../../core/profile.js';
import { handCalOpen, handCalSetSens, handCalSetDepthSens, handCalSetDir, calKeep } from '../../../core/handcal.js';
import { calStoreKey, calCameraKey, calEmpty, calText, calFarRatio, calFilter, calHold, calBand, calSize, CAL } from '../../../core/pure/handcal.js';
import { fineNew, fineStep } from '../../../core/live/capture.js';
import { beatsOf } from '../../../core/transport/clock.js';
import { freezeSig } from '../../../core/freeze/registry.js';
import { events } from '../../../core/song/store.js';
import { fxParamKeysOf } from '../../../core/audio.js';
import { songPrint } from './run.js';
import * as ST from '../../../core/state.js';

const W=1000, H=600, PIN=0.05;
const r6=v=> typeof v==='number' ? +v.toFixed(6) : v;
const js=x=>JSON.stringify(x,(k,v)=>r6(v));
const isNight=()=>profileCurrent()==='profile.night';
const printFile=()=>`tools/prints/hand-depth.${isNight()?'night':'full'}.print.json`;
const rolesOf=()=> isNight() ? ['ld'] : ['ld','ch','bs','dr'];
const open=[1,1,1,1], pin=f=>[0,1,2,3].map(i=>i===f?PIN:1);

/* a list of { hands:[{ key, p }], ms } or { env } */
function script(scale=1){
  const F=[], fr=(hands,ms=1000/30)=>F.push({ hands:hands.map(h=>({ key:h.key, p:{ ...h.p, s:h.p.s*scale } })), ms });
  const R=(s,gaps=open,x=0.7,y=0.6)=>({ key:'Right', p:{ x, y, s, gaps } });
  const sweep=(a,b,n,gaps,ms)=>{ for(let i=0;i<=n;i++) fr([R(a+(b-a)*i/n,gaps)],ms); };
  const none=n=>{ for(let i=0;i<n;i++) fr([]); };
  const set=f=>F.push({ env:f });
  /* the playing hand: open, then pinched, then a pinch in the middle of a sweep */
  set(()=>ST.setPhoneInstr('ld'));
  sweep(0.45,0.08,40,open); sweep(0.08,0.45,40,open);
  sweep(0.45,0.10,30,pin(0)); sweep(0.10,0.30,20,pin(1));
  sweep(0.30,0.20,8,open); sweep(0.20,0.12,8,pin(0)); sweep(0.12,0.28,8,open); none(6);
  /* the same at the Poco's rate: today's filter steps per frame, so this pins it */
  sweep(0.40,0.10,14,open,143); sweep(0.10,0.40,14,pin(0),143); none(6);
  /* back after a gap at another size */
  sweep(0.15,0.15,4,open); none(10); sweep(0.35,0.35,4,open); none(6);
  /* the effects hand: each finger, every axis it carries, the playing hand still */
  for(const f of [0,1,2,3]){ for(let i=0;i<=10;i++) fr([R(0.2),{ key:'Left', p:{ x:0.3+0.02*i, y:0.6-0.03*i, s:0.18+0.008*i, gaps:pin(f) } }]); none(4); }
  /* volume moved to depth, both ways: read through its address */
  const vol=()=>ST.fxChainOf(ST.chainKeyOf('ld')).find(e=>e&&e.fxId===ST.FX_VOL).params[0];
  let keep=null;
  set(()=>{ const p=vol(); keep={ ...p }; p.axis='z'; });
  sweep(0.40,0.12,16,pin(0)); none(4);
  set(()=>{ vol().inv=true; });
  sweep(0.40,0.12,16,pin(0)); none(4);
  set(()=>{ Object.assign(vol(),keep); });
  /* Full's other roles */
  if(!isNight()){
    for(const r of ['ch','bs','dr']){ set(()=>ST.setPhoneInstr(r)); sweep(0.40,0.10,16,pin(0)); sweep(0.10,0.40,16,open); none(6); }
    set(()=>ST.setPhoneInstr('ld'));
  }
  return { F, restore:()=>{ if(keep) Object.assign(vol(),keep); } };
}
/* the Night page builds its other roles' effect instances only when played, so it keeps the solo chain alone */
function fxKeepOf(){
  if(!isNight()) return gestureFxKeep();
  const key=ST.chainKeyOf('ld'), back=[];
  for(const e of ST.fxChainOf(key)){ const id=e.fxId, inst=fxInstance(key,id); if(!inst) continue;
    for(const p of inst.params){ const v=p.cur, a=fxAimGet(key,id,p.key,null); back.push(()=>{ if(p.cur!==v) p.setNorm(v); fxAimSet(key,id,p.key,a); }); } }
  return ()=>back.forEach(f=>f());
}
function perform(scale=1){ return withLang('en',()=>performNow(scale)); }
function performNow(scale){
  const lines=[], clk={ t:1000, W, H }, keep=gestureEnvKeep(), tutK=hooks.tutor, fxBack=fxKeepOf(), { F, restore }=script(scale);
  let f=0; const last={}, put=(k,s)=>lines.push(`f${f} ${k} ${s}`), changed=(k,v)=>{ if(last[k]!==v){ last[k]=v; return true; } return false; };
  try{
    gestureEnvSet(GESTURE_ENV); hooks.tutor=null;
    handsProbe(clk,()=>true); wTapSet((name,args)=>put('W',`${name} ${js(args)}`));
    for(const step of F){
      if(step.env){ step.env(); continue; }
      f++; clk.t+=step.ms;
      processHandsProbe({ landmarks:step.hands.map(h=>pose(h.p)), handednesses:step.hands.map(h=>[{ categoryName:h.key }]) });
      const hs=Object.entries(HANDS).map(([k,S])=>`${k}:${S.pinch?1:0}/${S.zone}/${S.role}/${S.fn}/d${S.deg}/o${S.oct}/v${r6(S.vol)}`).sort().join(' ');
      if(changed('hands',hs)) put('hands',hs||'-');
      const vk=[Object.keys(leadHold).sort().join(','),Object.keys(bassHold).sort().join(','),Object.keys(chordHold).sort().join(',')].join(' | ');
      if(changed('voices',vk)) put('voices',vk);
      const aim=rolesOf().map(r=>{ const key=ST.chainKeyOf(r); return ST.fxChainOf(key).map(e=>(fxParamsOf(key,e.fxId)||[]).map(p=>r6(p.get())).join(',')).join(';'); }).join(' | ');
      if(changed('aim',aim)) put('aim',aim);
      const v=handsView().map(h=>`${h.key}:${r6(h.d)}/${h.pinch?1:0}/${h.play?1:0}`).sort().join(' ');
      if(changed('view',v)) put('view',v||'-');
    }
  } finally {
    wTapSet(null); hooks.tutor=tutK; handsProbe(null); liveAllOff(); restore(); gestureEnvSet(keep); fxBack();
  }
  return lines;
}
export function dumpHandPrint(){
  const lines=perform(1);
  return { meta:{ format:'handsong/hand-depth-print', version:1, made:new Date().toISOString(), file:printFile(), profile:profileCurrent(), W, H, chains:JSON.stringify(ST.fxChains) }, lines };
}
const differs=(a,b)=>{ const out=[]; for(let i=0;i<Math.max(a.length,b.length);i++) if(a[i]!==b[i]) out.push(`line ${i+1}: «${b[i]??'(none)'}», print «${a[i]??'(none)'}»`); return out; };
export async function checkHandPrint(){
  const d=[]; let n=0;
  let file=null; try{ const r=await fetch(new URL('../../../'+printFile(), import.meta.url),{ cache:'no-store' }); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ return { cases:1, total:1, differences:[`no depth print ${printFile()} (${e&&e.message})`] }; }
  if(JSON.stringify(ST.fxChains)!==file.meta.chains) return { cases:1, total:1, differences:['the live chains differ from the print\'s: the performance would not compare'] };
  const now=perform(1); n+=now.length; const x=differs(file.lines,now); x.slice(0,8).forEach(s=>d.push(s)); if(x.length>8) d.push(`...and ${x.length-8} more lines differ`);
  /* nothing changes while uncalibrated: opened, neutral settings, a record for another camera. CONTROLS: a sensitivity of 1.01, or this camera calibrated, must differ */
  const keep=calKeep();
  try{
    const same=(what)=>{ n++; const y=differs(file.lines,perform(1)); if(y.length) d.push(`${what}: ${y[0]}`); }, moved=(what)=>{ n++; if(!differs(file.lines,perform(1)).length) d.push('CONTROL: '+what+' left the print unchanged'); };
    calOpen(); same('opened with an empty record');
    calOpen(); handCalSetSens(1); handCalSetDepthSens(1); same('opened with neutral settings');
    calOpen({ cameras:{ [calCameraKey('another camera','user')]:{ near:0.3, noise:0.005, at:1 } } }); same('a record for another camera');
    calOpen(); handCalSetSens(1.01); moved('a sensitivity of 1.01');
    calOpen({ cameras:{ [CAM_KEY]:{ near:0.3, noise:0.005, at:1 } } }); moved('a calibrated camera');
  } finally { keep(); }
  n++; if(!now.some(l=>/ view /.test(l))) d.push('the performance printed no depth for the visuals');
  n++; if(!differs(file.lines,perform(1.01)).length) d.push('CONTROL: a palm 1% larger left the print unchanged: it cannot see depth');
  return { cases:n, total:d.length, differences:d, lines:now.length };
}
row({ night:true, at:455.5, name:'CAL4 depth print', run:()=>checkHandPrint(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });

/* ---- CORE-1 CP4: the calibrated mapping through the real gesture sites ---- */
const CAM={ label:'probe camera', facing:'user' }, CAM_KEY=calCameraKey(CAM.label,CAM.facing), SCOPE='probe';
function calOpen(parts={}){ const m=new Map(), store={ getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,v), removeItem:k=>m.delete(k) }, r=calEmpty(SCOPE);
  store.setItem(calStoreKey(SCOPE),calText({ ...r, ...parts, global:{ ...r.global, ...(parts.global||{}) } })); handCalOpen({ scope:SCOPE, store, camera:()=>CAM }); }
const SS=size=>size/0.95;   // pose(): palm size = 0.95 s
/* a real-time-free session on the probe clock; the app's environment and effects restored after */
function session(fn){ return withLang('en',()=>{ const clk={ t:1000, W, H }, keep=gestureEnvKeep(), tutK=hooks.tutor, fxBack=fxKeepOf();
  const step=(hands,ms=1000/30)=>{ clk.t+=ms; processHandsProbe({ landmarks:hands.map(h=>pose({ gaps:open, x:0.7, y:0.6, ...h, s:SS(h.size) })), handednesses:hands.map(h=>[{ categoryName:h.key||'Right' }]) }); };
  try{ gestureEnvSet(GESTURE_ENV); hooks.tutor=null; handsProbe(clk,()=>true); wTapSet(()=>{}); return fn({ clk, step }); }
  finally{ wTapSet(null); hooks.tutor=tutK; handsProbe(null); liveAllOff(); gestureEnvSet(keep); fxBack(); } }); }
/* the app's default depth control: the forest on Night, chord brightness (played under a pinch) on Full */
function depthControl(){ const role=isNight()?'ld':'ch', key=ST.chainKeyOf(role);
  for(const e of ST.fxChainOf(key)) for(let i=0;i<e.params.length;i++){ const pa=e.params[i]; if(e.fxId!==ST.FX_VOL && pa.mode==='drive' && pa.hand==='play' && pa.axis==='z') return { role, key, fxId:e.fxId, i, pa, id:key+'|'+e.fxId+':'+fxParamKeysOf(e.fxId)[i], read:()=>fxParamsOf(key,e.fxId)[i].get(), gaps:role==='ch'?pin(0):open }; }
  return null; }
export async function checkHandMap(){
  const d=[]; let n=0; const ok=(what,c)=>{ n++; if(!c) d.push(what); }, near=(what,a,b,tol=1e-9)=>{ n++; if(!(Math.abs(a-b)<=tol)) d.push(`${what}: ${a}, expected ${b}`); };
  const keep=calKeep(), NEAR=0.3, NOISE=0.005, cam={ [CAM_KEY]:{ near:NEAR, noise:NOISE, at:1 } };
  const R=await import('../../../core/render.js');
  try{
    const C=depthControl(); ok('the app has a depth control', !!C); if(!C) return { cases:n, total:d.length, differences:d };
    const hold=(c,size,frames=40,ms)=>{ for(let i=0;i<frames;i++) c.step([{ size, gaps:C.gaps }],ms); };
    session(c=>{ ST.setPhoneInstr(C.role);
      /* both ends exactly, each slider stop, each direction; no direction follows the parameter */
      for(const s of [0.7,1,2]) for(const dir of ['near0','near100']){ calOpen({ cameras:cam, global:{ depth:s } }); handCalSetDir(C.id,dir);
        hold(c,NEAR); const atNear=C.read(); hold(c,NEAR*calFarRatio(s)*0.8); const atFar=C.read(); hold(c,NEAR); const back=C.read();
        ok(`${dir} at ${s}x: near end`, atNear===(dir==='near0'?0:1)); ok(`${dir} at ${s}x: far end`, atFar===(dir==='near0'?1:0)); ok(`${dir} at ${s}x: near end again`, back===atNear); }
      calOpen({ cameras:cam }); hold(c,NEAR); ok('no direction follows the parameter', C.read()===(C.pa.inv?1:0));
      /* an override replaces the slider: the far end comes sooner at 2x */
      calOpen({ cameras:cam }); handCalSetSens(2,C.id); hold(c,NEAR*calFarRatio(2)*0.97,80); ok('an override reaches its own far end', C.read()===(C.pa.inv?0:1));
      /* the visuals read the same depth as the sound, every frame */
      calOpen({ cameras:cam }); handCalSetDir(C.id,'near0'); let same=true, frames=0; for(let i=0;i<=60;i++){ c.step([{ size:NEAR*(1-0.6*i/60), gaps:C.gaps }]); const v=handsView()[0]; if(v){ frames++; if(v.d!==C.read()) same=false; } } ok('the visuals read the same depth', same && frames>50);
    });
    /* one filter step per frame, whoever reads; a pinch doesn't restart it; a long gap does */
    session(c=>{ const vol=ST.fxChainOf(ST.chainKeyOf('ld')).find(e=>e&&e.fxId===ST.FX_VOL).params[0], vk={ ...vol }; vol.axis='z'; ST.setPhoneInstr('ld'); calOpen({ cameras:cam });
      try{ const st={}; let rst={}, same=true, differs=false;
        for(let i=0;i<90;i++){ const size=NEAR*(1-0.5*Math.sin(i/9)**2), pinched=(i>>3)%2===1, ms=i%5===0?143:33; c.step([{ size, gaps:pinched?pin(0):open }],ms); const t=c.clk.t, S=Object.values(HANDS)[0], raw=calSize(S.lm);
          const want=calHold(st,calFilter(st,raw,t)/NEAR,calBand(NOISE)); if(!Object.is(S.calF,want)) same=false;
          if(i%8===0) rst={}; if(calHold(rst,calFilter(rst,raw,t)/NEAR,calBand(NOISE))!==want) differs=true; }
        ok('one step per frame, no restart on a pinch (exact, pure replay)', same); ok('CONTROL: a filter reset on the pinches differs', differs);
        const S=Object.values(HANDS)[0], before=S.cal.hs; c.step([{ size:NEAR*0.9 }],CAL.blinkMs+50); ok('a long gap starts fresh', before!==S.cal.hs && S.cal.hs===calSize(S.lm)); }
      finally{ Object.assign(vol,vk); } });
    /* the effects hand: its own zero, its own sensitivity, exactly today's at 1 on every axis, calibrated or not; the horizontal volume exactly today's */
    const fxE=ST.fxChainOf(ST.chainKeyOf('ld')).flatMap(e=>e.params.map((pa,i)=>({ e,pa,i }))).find(x=>x.pa.mode==='drive'&&x.pa.hand==='fx'); ok('the app has an effects control', !!fxE);
    if(fxE){ const key=ST.chainKeyOf('ld'), get=()=>fxParamsOf(key,fxE.e.fxId)[fxE.i].get(), axis0=fxE.pa.axis;
      const series=(axis,setup)=>session(c=>{ ST.setPhoneInstr('ld'); fxE.pa.axis=axis; setup(); const out=[]; fxParamsOf(key,fxE.e.fxId)[fxE.i].set(0.5);
        for(let i=0;i<=12;i++){ c.step([{ size:0.2, x:0.75, y:0.6, gaps:pin(0) },{ key:'Left', x:0.2+0.01*i, y:0.6-0.012*i, size:0.2+0.004*i, gaps:pin(fxE.pa.finger) }]); out.push({ v:get(), vol:HANDS.Right&&HANDS.Right.vol }); }
        for(let i=0;i<4;i++) c.step([]); return out; });
      try{ for(const axis of ['x','y','z']){
        const today=series(axis,()=>keep()), one=series(axis,()=>calOpen({ cameras:cam })), two=series(axis,()=>{ calOpen({ cameras:cam }); handCalSetSens(2); });
        ok(`${axis}: at 1x, calibrated, exactly today's`, today.every((x,i)=>Object.is(x.v,one[i].v))); ok(`${axis}: the horizontal volume exactly today's`, today.every((x,i)=>Object.is(x.vol,one[i].vol)));
        ok(`${axis}: the grab point stays the zero`, Math.abs(two[0].v-today[0].v)<1e-9);
        near(`${axis}: 2x moves twice as far`, two[4].v-two[0].v, 2*(today[4].v-today[0].v), 1e-9); ok(`${axis}: (the script moves it)`, Math.abs(today[4].v-today[0].v)>0.005);
        const ov=series(axis,()=>{ calOpen({ cameras:cam }); handCalSetSens(0.5); handCalSetSens(1,key+'|'+fxE.e.fxId+':'+fxParamKeysOf(fxE.e.fxId)[fxE.i]); }); ok(`${axis}: an override replaces the global`, today.every((x,i)=>Object.is(x.v,ov[i].v))); } }
      finally{ fxE.pa.axis=axis0; keep(); } }
    /* CAL7: a still hand writes nothing, at the smallest near size and 2x, at both rates, through the recorder's own automaton. CONTROL: a real slow drift must write */
    const rec=(fps,drift,seed)=>session(c=>{ ST.setPhoneInstr(C.role); calOpen({ cameras:{ [CAM_KEY]:{ near:CAL.minNear, noise:0.0065, at:1 } }, global:{ depth:2 } }); handCalSetDir(C.id,'near0');
      let s=seed>>>0; const rnd=()=>(s=Math.imul(s,1664525)+1013904223>>>0)/4294967296, g=()=>Math.sqrt(-2*Math.log(rnd()||1e-9))*Math.cos(2*Math.PI*rnd());
      const ms=1000/fps, N=Math.round(60*fps), at=i=>CAL.minNear*(0.8-drift*(i*ms/1000)+0.0065*g()); let st=null, pts=0, moved=0, last=null, t=0;
      for(let i=0;i<N;i++){ c.step([{ size:at(i), gaps:C.gaps }],ms); t+=ms; if(i*ms<2000) continue; const v=C.read(), b=beatsOf(t/1000); if(!st) st=fineNew(v,b); else pts+=fineStep(st,v,b).length; if(last!=null&&v!==last) moved++; last=v; }
      return { pts, moved }; });
    /* the rate over many seeds is the data row's (CAL1-3); here the real sites and the recorder's own automaton, fixed seeds */
    for(const fps of [30,7]){ let pts=0, moved=0; for(const seed of [41,42,43,44,45]){ const a=rec(fps,0,seed+fps); pts+=a.pts; moved+=a.moved; } ok(`CAL7 ${fps} fps: a still hand, 5 minutes on fixed seeds, writes at most one point (${pts} points, value moved ${moved} times)`, pts<=1); const b=rec(fps,0.005,41+fps); ok(`CONTROL ${fps} fps: a slow drift must write`, b.pts>0); }
    /* CAL8: songs don't care */
    { const sig0=songPrint(), ls=[...new Set(events.map(e=>e.layer))], fz0=ls.map(l=>freezeSig(l)).join('|'), play=eng=>eng.leadOn('lead:cal',220,0.7,0,0,1,null,false,0.01), g0=await R.goldRender(play,0.2);
      session(c=>{ calOpen({ cameras:cam, global:{ depth:2, fx:2 } }); ST.setPhoneInstr(C.role); for(let i=0;i<40;i++) c.step([{ size:NEAR*(1-i/80), gaps:C.gaps }]); });
      const g1=await R.goldRender(play,0.2); ok('CAL8: the song is untouched', songPrint()===sig0); ok('CAL8: freeze signatures unchanged', ls.map(l=>freezeSig(l)).join('|')===fz0);
      /* renders repeat to a few ULP with no calibration at all (measured 7.5e-9), so the limit sits there, not at exact equality */
      const gap=(a,b)=>a.L.length!==b.L.length ? Infinity : a.L.reduce((m,x,i)=>Math.max(m,Math.abs(x-b.L[i])),0), g2=await R.goldRender(eng=>eng.leadOn('lead:cal',220,0.71,0,0,1,null,false,0.01),0.2);
      ok(`CAL8: a render repeats after calibrated hands (${gap(g0,g1)})`, gap(g0,g1)<=1e-7); ok(`CONTROL: a note at 0.71 must show (${gap(g0,g2)})`, gap(g0,g2)>1e-5);
      if(events.length){ const e=events[0], v=e.a.vol; e.a.vol=(v||0)+0.01; ok('CONTROL: a changed event must be seen', songPrint()!==sig0); e.a.vol=v; } }
  } finally { keep(); }
  return { cases:n, total:d.length, differences:d };
}
row({ night:true, at:456.5, name:'CAL5/CAL7/CAL8 calibrated hand', run:()=>checkHandMap(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
