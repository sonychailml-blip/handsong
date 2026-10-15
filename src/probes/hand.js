/* HAND1: SYNTHETIC HANDS → GESTURE FINGERPRINT. A pose → 21-landmark generator and a scripted performance fed frame by frame (probe
   clock, 30 fps, fixed 1000×600 play field, default crop and front camera) through the REAL gestures.processHands: solo (degrees,
   volume, register finger, several fingers), the effects hand, lead-mode hand-over, hold, theremin, the expression hand, bass, chords
   (latch, glide, same-degree off, typed palette), drums, split, the looper hand (record/play/undo edges, the 3-s clear and its cancel)
   and hands leaving the frame. Printed per frame: every W* call the gesture layer makes (recorder.wTapSet — the recorder's input),
   looper commands (swallowed: the transport is not started), tutor hooks, the live voice keys, hand states, effect aims and the
   expression display → compared line by line with tools/gesture.print.json (P.dumpGesture() on unchanged code).
   Recording itself is not part of the print: push stamps live events from the audio clock; the W* stream IS what it records, and the
   recorder funnels are covered by «write path (funnels)». The machine's own state is set aside while probing (gestures.handsProbe).
   CONTROL: PINCH_ON nudged by +0.03 (gestures.pinchDbg) must change the print — the slow pinch approaches cross the threshold. */
import { row } from './rows.js';
import { HANDS, handsProbe, processHandsProbe, pinchDbg, fxParamsOf } from '../gestures.js';
import { wTapSet, liveAllOff } from '../recorder.js';
import { hooks } from '../hooks.js';
import { leadHold, bassHold, chordHold, fxInstance, fxAimGet, fxAimSet, FX_AMT } from '../audio.js';
import { CAM_MARGIN } from '../config.js';
import { withLang } from '../i18n.js';
import { SCALES } from '../scales.js';
import * as ST from '../state.js';

const PRINT_FILE='tools/gesture.print.json', FPS=30, W=1000, H=600;
const r6=v=> typeof v==='number' ? +v.toFixed(6) : v;
const js=x=>JSON.stringify(x,(k,v)=>r6(v));
/* ── the pose generator: screen fractions (x, y) of the pinch point, hand size s (raw units), gaps = thumb-tip distance of each of the
   four fingers in palm sizes (< PINCH_ON pinches, ≈ 1 open), spread (free fingers fan out), tilt (palm normal via z) ── */
function rawOf(fx,fy){ const vr=ST.viewRect, x=fx*(vr.ax1-vr.ax0)+vr.ax0, y=fy*(vr.ay1-vr.ay0)+vr.ay0; return { x:ST.mirrored()?1-x:x, y }; }
const DIRS=[[-0.3,-1],[0,-1],[0.3,-1],[0.6,-1]].map(([a,b])=>{ const n=Math.hypot(a,b); return [a/n,b/n]; });
function pose({ x, y, s=0.2, gaps=[1,1,1,1], spread=0, tilt=0 }){
  const T=rawOf(x,y), P=(dx,dy,z=0)=>({ x:T.x+dx*s, y:T.y+dy*s, z });
  const lm=new Array(21);
  lm[0]=P(0.30,0.80); lm[1]=P(0.10,0.55); lm[2]=P(0,0.35); lm[3]=P(-0.02,0.15); lm[4]=P(0,0);
  const mcp=[P(0.10,-0.05,tilt*s),P(0.30,-0.15),P(0.48,-0.08),P(0.62,0.05,-tilt*s)];
  const palm=Math.hypot(lm[0].x-mcp[0].x, lm[0].y-mcp[0].y);
  for(let f=0;f<4;f++){ const b=5+4*f, g=gaps[f], d=DIRS[f], lat=g>0.5?spread*(f-1.5)*0.25:0;
    const tip={ x:T.x+(d[0]+lat)*g*palm, y:T.y+d[1]*g*palm, z:0 };
    lm[b]=mcp[f]; lm[b+1]={ x:mcp[f].x+(tip.x-mcp[f].x)/3, y:mcp[f].y+(tip.y-mcp[f].y)/3, z:0 };
    lm[b+2]={ x:mcp[f].x+2*(tip.x-mcp[f].x)/3, y:mcp[f].y+2*(tip.y-mcp[f].y)/3, z:0 }; lm[b+3]=tip; }
  return lm;
}
const PIN=0.05, OPEN=1;
const gapsOf=fingers=>[0,1,2,3].map(f=>fingers.includes(f)?PIN:OPEN);

/* ── the performance: a list of frames [{ hands:[{ key, p:pose args }] , env?:fn }] built by small helpers ── */
function script(){
  const F=[], fr=(hands,env)=>F.push({ hands, env });
  const hold=(n,hands,env)=>{ for(let i=0;i<n;i++) fr(hands, i===0?env:null); };
  const move=(n,key,a,b,extra={})=>{ for(let i=1;i<=n;i++){ const u=i/n, p={}; for(const k of Object.keys(a)) p[k]= typeof a[k]==='number' ? a[k]+(b[k]-a[k])*u : a[k]; fr([{ key, p:{ ...p, ...extra } }]); } };
  const approach=(key,x,y,f,extra={})=>{ for(const g of [0.6,0.4,0.3,0.26,0.23,0.21,0.19,0.17,0.12,PIN]){ const gaps=[1,1,1,1]; gaps[f]=g; fr([{ key, p:{ x, y, gaps, ...extra } }]); } };
  const none=n=>hold(n,[]);
  const set=f=>fr(null,f);   // an environment step (no frame)
  // 1 — solo, single role: right hand plays (note), slow approach, degrees, volume, register finger, several fingers
  set(()=>{ ST.setPhoneInstr('ld'); });
  approach('Right',0.6,0.7,0);
  move(12,'Right',{ x:0.6, y:0.7, gaps:gapsOf([0]) },{ x:0.6, y:0.2, gaps:gapsOf([0]) });
  move(8,'Right',{ x:0.6, y:0.2, gaps:gapsOf([0]) },{ x:0.9, y:0.2, gaps:gapsOf([0]) });
  hold(3,[{ key:'Right', p:{ x:0.9, y:0.2, gaps:[0.4,PIN,1,1] } }]);   // the middle finger takes over: register II
  hold(3,[{ key:'Right', p:{ x:0.9, y:0.2, gaps:[PIN,PIN,1,1] } }]);   // two fingers: two notes
  hold(3,[{ key:'Right', p:{ x:0.8, y:0.45, gaps:[PIN,PIN,PIN,1] } }]);
  hold(3,[{ key:'Right', p:{ x:0.8, y:0.45, gaps:gapsOf([]) } }]);
  // 2 — the effects hand (left, default 'fx') with the right hand playing
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3, y:0.5, gaps:gapsOf([0]) } }]);
  for(let i=1;i<=8;i++) fr([{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3+0.03*i, y:0.5-0.04*i, s:0.2+0.01*i, gaps:gapsOf([0]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.5, y:0.3, gaps:gapsOf([1]) } }]);
  none(5);
  // 3 — lead mode: both hands play one voice; the last pinch takes it, release hands it back
  set(()=>{ ST.setVoiceMode('ld','lead'); ST.setHandFn('ld','L','note'); });
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } }]);
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.2, y:0.3, gaps:gapsOf([0]) } }]);
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.2, y:0.3, gaps:gapsOf([]) } }]);
  none(5);
  set(()=>{ ST.setVoiceMode('ld','poly'); });
  // 4 — hold and theremin on the right hand
  set(()=>{ ST.setHandFn('ld','R','hold'); });
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.6, gaps:gapsOf([0]) } }]);
  move(6,'Right',{ x:0.7, y:0.6, gaps:gapsOf([0]) },{ x:0.4, y:0.2, gaps:gapsOf([0]) });
  none(5);
  set(()=>{ ST.setHandFn('ld','R','therm'); });
  move(10,'Right',{ x:0.7, y:0.8, gaps:gapsOf([0]) },{ x:0.7, y:0.1, gaps:gapsOf([0]) });
  none(5);
  set(()=>{ ST.setHandFn('ld','R','note'); });
  // 5 — the expression hand (left): movement pumps, openness, spread and tilt; the right hand plays
  set(()=>{ ST.setHandFn('ld','L','expr'); });
  for(let i=0;i<20;i++) fr([{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.25+0.08*Math.sin(i*0.9), y:0.5+0.05*Math.cos(i*0.7), spread:i/20, tilt:0.3*Math.sin(i*0.3), gaps:[1,1,1,1].map(g=>g*(0.5+i/40)) } }]);
  hold(6,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } }]);
  none(5);
  set(()=>{ ST.setHandFn('ld','L','fx'); });
  // 6 — bass (lead mode by default), then its theremin
  set(()=>{ ST.setPhoneInstr('bs'); });
  approach('Right',0.5,0.6,0);
  move(6,'Right',{ x:0.5, y:0.6, gaps:gapsOf([0]) },{ x:0.5, y:0.3, gaps:gapsOf([0]) });
  hold(4,[{ key:'Right', p:{ x:0.5, y:0.3, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3, y:0.7, gaps:gapsOf([0]) } }]);
  none(5);
  set(()=>{ ST.setHandFn('bs','R','therm'); });
  move(6,'Right',{ x:0.6, y:0.7, gaps:gapsOf([0]) },{ x:0.6, y:0.3, gaps:gapsOf([0]) });
  none(5);
  set(()=>{ ST.setHandFn('bs','R','note'); });
  // 7 — chords (latch): pinch, release (rings), another degree (glides), the same degree again (off)
  set(()=>{ ST.setPhoneInstr('ch'); });
  hold(3,[{ key:'Right', p:{ x:0.6, y:0.7, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.6, y:0.7, gaps:gapsOf([]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.6, y:0.3, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.6, y:0.3, gaps:gapsOf([]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.6, y:0.3, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.6, y:0.3, gaps:gapsOf([]) } }]);
  // 7b — typed chords on Chromatic: the palette (left of the split) picks a type, the right side plays the root
  set(()=>{ const c=SCALES.find(s=>s.typedChords==='chrom12'); if(c) ST.setScaleId(c.id); });
  hold(3,[{ key:'Left', p:{ x:0.08, y:0.4, gaps:gapsOf([0]) } }]); none(5);
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } }]); none(5);
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([]) } }]);
  set(()=>{ ST.setScaleId('major'); });
  // 8 — drums: two hands, several rows
  set(()=>{ ST.setPhoneInstr('dr'); });
  for(const y of [0.9,0.7,0.5,0.3,0.1]){ hold(2,[{ key:'Right', p:{ x:0.7, y, gaps:gapsOf([0]) } }]); none(5); }
  hold(2,[{ key:'Right', p:{ x:0.7, y:0.8, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3, y:0.2, gaps:gapsOf([0]) } }]); none(5);
  // 9 — split (chords left, solo right): either hand plays the half it pinches in
  set(()=>{ ST.setPhoneInstr('ld'); ST.setSplitOn(true); });
  hold(3,[{ key:'Left', p:{ x:0.3, y:0.6, gaps:gapsOf([0]) } },{ key:'Right', p:{ x:0.75, y:0.4, gaps:gapsOf([0]) } }]);
  hold(3,[{ key:'Left', p:{ x:0.3, y:0.6, gaps:gapsOf([]) } },{ key:'Right', p:{ x:0.75, y:0.4, gaps:gapsOf([0]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.3, y:0.6, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.3, y:0.6, gaps:gapsOf([]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.3, y:0.6, gaps:gapsOf([0]) } }]); hold(3,[{ key:'Right', p:{ x:0.3, y:0.6, gaps:gapsOf([]) } }]);   // the same chord again: the latch goes off
  set(()=>{ ST.setSplitOn(false); });
  // 10 — the looper hand: index, middle, ring fire once per pinch; pinky held 3 s clears once, released early it cancels
  set(()=>{ ST.setHandFn('ld','R','loop'); });
  for(const f of [0,1,2]){ hold(4,[{ key:'Right', p:{ x:0.6, y:0.5, gaps:gapsOf([f]) } }]); none(5); }
  hold(30,[{ key:'Right', p:{ x:0.6, y:0.5, gaps:gapsOf([3]) } }]); none(5);
  hold(100,[{ key:'Right', p:{ x:0.6, y:0.5, gaps:gapsOf([3]) } }]); none(5);
  set(()=>{ ST.setHandFn('ld','R','note'); });
  // 11 — a hand that leaves the frame while pinched: the watchdog releases it
  hold(3,[{ key:'Right', p:{ x:0.6, y:0.5, gaps:gapsOf([0]) } }]);
  none(8);
  return F;
}
/* The environment the print is made in (set, then restored): role, layout, hand functions, voice modes, fingers, scale and key,
   timbres, camera and crop. Live effect chains and the chord-mode choice must be the defaults — else the row is «not applicable». */
const ENV_KEYS=['phoneInstr','splitOn','pinchFingers','rectPref','camFacing','scaleId','tonic','tonicCents','tunedFrom','seventh','leadIdx','chIdx','bassIdx','drumKitIdx','chordFam','chordVar','exprDisp','exprBrightDisp','looperMsg','chFitDeg'];
function envKeep(){ const k={}; for(const n of ENV_KEYS) k[n]=ST[n];
  return { ...k, handFn:JSON.parse(JSON.stringify(ST.handFn)), voiceMode:{ ...ST.voiceMode }, viewRect:ST.viewRect, split:[...ST.SPLIT_ROLES] }; }
function envSet(E){
  ST.setPhoneInstr(E.phoneInstr); ST.setSplitOn(E.splitOn); ST.setPinchFingers(E.pinchFingers); ST.setRectPref(E.rectPref); ST.setCamFacing(E.camFacing);
  ST.setScaleId(E.scaleId); ST.setTonic(E.tonic); ST.setTonicCents(E.tonicCents); ST.setTunedFrom(E.tunedFrom); ST.setSeventh(E.seventh);
  ST.setLeadIdx(E.leadIdx); ST.setChIdx(E.chIdx); ST.setBassIdx(E.bassIdx); ST.setDrumKitIdx(E.drumKitIdx);
  ST.setChordFam(E.chordFam); ST.setChordVar(E.chordVar); ST.setExprDisp(E.exprDisp); ST.setExprBrightDisp(E.exprBrightDisp); ST.setLooperMsg(E.looperMsg); ST.setChFitDeg(E.chFitDeg);
  for(const r of Object.keys(E.handFn)) for(const h of Object.keys(E.handFn[r])) ST.setHandFn(r,h,E.handFn[r][h]);
  for(const r of Object.keys(E.voiceMode)) ST.setVoiceMode(r,E.voiceMode[r]);
  ST.setViewRect(E.viewRect); E.split.forEach((r,i)=>ST.setSplitRole(i,r));
}
const ENV0={ phoneInstr:'ld', splitOn:false, pinchFingers:4, rectPref:'auto', camFacing:'user', scaleId:'major', tonic:0, tonicCents:0, tunedFrom:'T',
  seventh:false, leadIdx:0, chIdx:0, bassIdx:0, drumKitIdx:0, chordFam:0, chordVar:0, exprDisp:0, exprBrightDisp:0, looperMsg:null, chFitDeg:-1, handFn:{ ld:{L:'fx', R:'note'}, bs:{L:'note', R:'note'}, ch:{L:'latch', R:'latch'}, dr:{L:'hit', R:'hit'} },
  voiceMode:{ ld:'poly', bs:'lead' }, split:['ch','ld'], viewRect:{ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN } };
/* The effects hand moves live effect values and aims: keep every live chain's values and aims, put them back after. */
function fxKeep(){
  const back=[];
  for(const o of ST.chainOwners()) for(const e of ST.fxChainOf(o.key)){ const key=o.key, id=e.fxId;
    if(ST.fxIsScalar(id)){ const v=ST.fx[id], a=fxAimGet(key,id,FX_AMT,null); back.push(()=>{ ST.fx[id]=v; fxAimSet(key,id,FX_AMT,a); }); continue; }
    const inst=fxInstance(key,id); if(!inst) continue;
    for(const p of inst.params){ const v=p.cur, a=fxAimGet(key,id,p.key,null); back.push(()=>{ if(p.cur!==v) p.setNorm(v); fxAimSet(key,id,p.key,a); }); } }
  return ()=>back.forEach(f=>f());
}
/* Run the performance → the print (lines). Synchronous between the environment steps: no app frame or scheduler tick interleaves. */
function perform(){ return withLang('en', performNow); }   // messages in English whatever the interface language
function performNow(){
  const lines=[], clk={ t:1000, W, H }, keep=envKeep(), tutKeep=hooks.tutor;
  let f=0, last={};
  const put=(kind,s)=>lines.push(`f${f} ${kind} ${s}`);
  const changed=(k,v)=>{ if(last[k]!==v){ last[k]=v; return true; } return false; };
  const fxBack=fxKeep();
  try{
    envSet(ENV0);
    handsProbe(clk, (cmd)=>{ put('looper',cmd); return true; });   // looper commands are printed and swallowed
    wTapSet((name,args)=>put('W',`${name} ${js(args)}`));
    hooks.tutor=(kind,p)=>put('tutor',`${kind} ${js(p??null)}`);
    for(const step of script()){
      if(step.env) step.env();
      if(!step.hands) continue;
      f++; clk.t+=1000/FPS;
      const res={ landmarks:step.hands.map(h=>pose(h.p)), handednesses:step.hands.map(h=>[{ categoryName:h.key }]) };
      processHandsProbe(res);
      const hs=Object.entries(HANDS).map(([k,S])=>`${k}:${S.pinch?1:0}/${S.zone}/${S.role}/${S.fn}/d${S.deg}/o${S.oct}/r${S.regOct}/v${r6(S.vol)}/${js(S.fing||{})}`).sort().join(' ');
      if(changed('hands',hs)) put('hands',hs||'—');
      const vk=[Object.keys(leadHold).sort().join(','),Object.keys(bassHold).sort().join(','),Object.keys(chordHold).sort().join(',')].join(' | ');
      if(changed('voices',vk)) put('voices',vk);
      const aim=['ld','ch','bs','dr'].map(r=>{ const key=ST.chainKeyOf(r); return ST.fxChainOf(key).map(e=>{ const P=fxParamsOf(key,e.fxId)||[]; return P.map(p=>r6(p.get())).join(','); }).join(';'); }).join(' | ');
      if(changed('aim',aim)) put('aim',aim);
      const ex=`${r6(ST.exprDisp)} ${r6(ST.exprBrightDisp)}`; if(changed('expr',ex)) put('expr',ex);
      const lm=ST.looperMsg && ST.looperMsg.until>clk.t ? ST.looperMsg.text : '—';   // shown messages only if(changed('msg',lm)) put('msg',lm);
    }
  } finally {
    wTapSet(null); hooks.tutor=tutKeep;
    handsProbe(null);
    liveAllOff();   // anything the performance left sounding (a latch) stops; tracks untouched
    envSet(keep); fxBack();
  }
  return lines;
}
const envOk=()=> JSON.stringify(ST.chordModeSel)==='{}';

export function dumpGesture(){
  if(!envOk()){ console.warn('[scaleprobe gesture] the chord-mode choice is not the default — reset it first'); return null; }
  const lines=perform();
  console.log(`[scaleprobe gesture] ${lines.length} lines — save the returned object as ${PRINT_FILE} (JSON)`);
  return { meta:{ format:'handsong/gesture-print', version:1, made:new Date().toISOString(), file:PRINT_FILE, fps:FPS, W, H, chains:JSON.stringify(ST.fxChains) }, lines };
}
export async function checkGesture(){
  const diff=[], miss=s=>diff.push(s); let cases=0, file=null;
  try{ const r=await fetch(new URL(PRINT_FILE, location.href), { cache:'no-store' }); if(!r.ok) throw new Error('HTTP '+r.status); file=await r.json(); }
  catch(e){ miss(`no gesture print ${PRINT_FILE} (${e&&e.message}) — P.dumpGesture() on unchanged code makes it`); return { cases, total:diff.length, differences:diff }; }
  if(!envOk() || JSON.stringify(ST.fxChains)!==file.meta.chains) return { cases:0, total:0, differences:[], status:'not applicable: live chains or chord modes changed' };
  const cmp=(a,b,tag)=>{ const out=[]; const n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++) if(a[i]!==b[i]) out.push(`${tag}line ${i+1}: «${b[i]??'(none)'}», print «${a[i]??'(none)'}»`);
    return out; };
  const now=perform(); cases+=now.length;
  const d=cmp(file.lines, now, ''); d.slice(0,8).forEach(miss); if(d.length>8) miss(`…and ${d.length-8} more lines differ`);
  /* CONTROL: a pinch threshold nudged by +0.03 must change the print */
  pinchDbg(0.03); let c; try{ c=cmp(file.lines, perform(), 'CONTROL '); } finally { pinchDbg(0); }
  cases++; if(!c.length) miss('CONTROL: PINCH_ON + 0.03 left the print unchanged — the fingerprint cannot see the pinch threshold');
  /* the voices are all off and the hands set aside again */
  cases++; const vk=Object.keys(leadHold).filter(k=>!k.startsWith('leadloop')).concat(Object.keys(bassHold).filter(k=>!k.startsWith('bassloop')),Object.keys(chordHold).filter(k=>k==='latch'));
  if(vk.length) miss(`live voices left sounding after the probe: ${vk.join(', ')}`);
  return { cases, total:diff.length, differences:diff, lines:now.length };
}
row({ at:455, name:'HAND1 gesture fingerprint', run:()=>checkGesture(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, status:r.status }) });
