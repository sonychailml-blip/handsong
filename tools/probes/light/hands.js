/* LIGHT-3 row «LIGHT hands = core hands»: Light's hands (apps/light/gestures.js, a cut copy of core's) must make EXACTLY the note calls core's
   gesture machine makes on the same synthetic hands — the solo parts of core's HAND1 performance (a slow approach, degrees, volume, a finger
   change, two and three fingers, the effects hand moving with the playing hand, lead mode with a hand-over, hold, theremin, a hand leaving the
   frame) in Light's own live chain. Core is driven through its probe clock and the recorder's tap (both imported here, probe only — after the
   «on its own» row); Light through its probe clock and its adapter's tap. Per frame: every leadOn / leadOff with its owner and payload (numbers to
   6 places) and the solo chain's aims. CONTROL: Light with the effects sensitivity at 1.5 must differ (the comparison can fail, the hook acts). */
import * as ST from '../../../core/state.js';
import { CAM_MARGIN } from '../../../core/config.js';
import { leadAllOff } from '../../../core/audio.js';
import { pose } from '../../../core/gestures/pose.js';
import { fxParamsOf } from '../../../core/gestures/fxhand.js';
import { lightHandsProbe, lightProcessHandsProbe, lightHandsReset, setLightFxSens, setLightPerHandReverb, setLightMirrorVolume } from '../../../apps/light/gestures.js';
import { lightNoteTapSet } from '../../../apps/light/engine.js';

const FPS=30, W=1000, H=600, PIN=0.05, OPEN=1;
const r6=v=> typeof v==='number' ? +v.toFixed(6) : v, js=x=>JSON.stringify(x,(k,v)=>r6(v));
const gapsOf=fingers=>[0,1,2,3].map(f=>fingers.includes(f)?PIN:OPEN);
function script(){
  const F=[], fr=(hands,env)=>F.push({ hands, env });
  const hold=(n,hands)=>{ for(let i=0;i<n;i++) fr(hands); };
  const move=(n,key,a,b)=>{ for(let i=1;i<=n;i++){ const u=i/n, p={}; for(const k of Object.keys(a)) p[k]= typeof a[k]==='number' ? a[k]+(b[k]-a[k])*u : a[k]; fr([{ key, p }]); } };
  const approach=(key,x,y,f)=>{ for(const g of [0.6,0.4,0.3,0.26,0.23,0.21,0.19,0.17,0.12,PIN]){ const gaps=[1,1,1,1]; gaps[f]=g; fr([{ key, p:{ x, y, gaps } }]); } };
  const none=n=>hold(n,[]), set=f=>fr(null,f);
  approach('Right',0.6,0.7,0);
  move(12,'Right',{ x:0.6, y:0.7, gaps:gapsOf([0]) },{ x:0.6, y:0.2, gaps:gapsOf([0]) });
  move(8,'Right',{ x:0.6, y:0.2, gaps:gapsOf([0]) },{ x:0.9, y:0.2, gaps:gapsOf([0]) });
  hold(3,[{ key:'Right', p:{ x:0.9, y:0.2, gaps:[0.4,PIN,1,1] } }]);
  hold(3,[{ key:'Right', p:{ x:0.9, y:0.2, gaps:[PIN,PIN,1,1] } }]);
  hold(3,[{ key:'Right', p:{ x:0.8, y:0.45, gaps:[PIN,PIN,PIN,1] } }]);
  hold(3,[{ key:'Right', p:{ x:0.8, y:0.45, gaps:gapsOf([]) } }]);
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3, y:0.5, gaps:gapsOf([0]) } }]);
  for(let i=1;i<=8;i++) fr([{ key:'Right', p:{ x:0.7, y:0.5, s:0.2+0.012*i, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.3+0.03*i, y:0.5-0.04*i, s:0.2+0.01*i, gaps:gapsOf([0]) } }]);
  for(const f of [1,2,3]) hold(4,[{ key:'Right', p:{ x:0.7, y:0.5, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.5, y:0.3+0.05*f, gaps:gapsOf([f]) } }]);
  none(5);
  set(()=>{ ST.setVoiceMode('ld','lead'); ST.setHandFn('ld','L','note'); });
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } }]);
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.2, y:0.3, gaps:gapsOf([0]) } }]);
  hold(4,[{ key:'Right', p:{ x:0.8, y:0.6, gaps:gapsOf([0]) } },{ key:'Left', p:{ x:0.2, y:0.3, gaps:gapsOf([]) } }]);
  none(5);
  set(()=>{ ST.setVoiceMode('ld','poly'); ST.setHandFn('ld','L','fx'); ST.setHandFn('ld','R','hold'); });
  hold(3,[{ key:'Right', p:{ x:0.7, y:0.6, gaps:gapsOf([0]) } }]);
  move(6,'Right',{ x:0.7, y:0.6, gaps:gapsOf([0]) },{ x:0.4, y:0.2, gaps:gapsOf([0]) });
  none(5);
  set(()=>{ ST.setHandFn('ld','R','therm'); });
  move(10,'Right',{ x:0.7, y:0.8, gaps:gapsOf([0]) },{ x:0.7, y:0.1, gaps:gapsOf([0]) });
  none(5);
  set(()=>{ ST.setHandFn('ld','R','note'); });
  hold(3,[{ key:'Right', p:{ x:0.6, y:0.5, gaps:gapsOf([0]) } }]);
  none(8);
  return F;
}
const ENV={ scaleId:'major', tonic:0, tonicCents:0, pinchFingers:4, rectPref:'auto', camFacing:'user' };
function envKeep(){ return { scaleId:ST.scaleId, tonic:ST.tonic, tonicCents:ST.tonicCents, pinchFingers:ST.pinchFingers, rectPref:ST.rectPref, camFacing:ST.camFacing,
  hand:{ ...ST.handFn.ld }, voice:ST.voiceMode.ld, viewRect:ST.viewRect }; }
function envSet(E){ ST.setScaleId(E.scaleId); ST.setTonic(E.tonic); ST.setTonicCents(E.tonicCents); ST.setPinchFingers(E.pinchFingers); ST.setRectPref(E.rectPref); ST.setCamFacing(E.camFacing);
  ST.setHandFn('ld','L',E.hand.L); ST.setHandFn('ld','R',E.hand.R); ST.setVoiceMode('ld',E.voice); ST.setViewRect(E.viewRect); }
const key=ST.chainKeyOf('ld');
const fxSnap=()=>ST.fxChainOf(key).map(e=>(fxParamsOf(key,e.fxId)||[]).map(p=>p.get()));
const fxRestore=s=>ST.fxChainOf(key).forEach((e,i)=>(fxParamsOf(key,e.fxId)||[]).forEach((p,j)=>{ if(s[i] && s[i][j]!=null) p.set(s[i][j]); }));

function perform(machine){
  const lines=[], clk={ t:1000, W, H }; let f=0;
  const put=(k,s)=>lines.push(`f${f} ${k} ${s}`);
  machine.begin(clk, (name,args)=>{ if(name==='leadOn' || name==='leadOff') put('W', `${name} ${js(args)}`); });
  try{
    for(const step of script()){
      if(step.env) step.env();
      if(!step.hands) continue;
      f++; clk.t+=1000/FPS;
      machine.frame({ landmarks:step.hands.map(h=>pose(h.p)), handednesses:step.hands.map(h=>[{ categoryName:h.key }]) });
      put('aim', ST.fxChainOf(key).map(e=>(fxParamsOf(key,e.fxId)||[]).map(p=>r6(p.get())).join(',')).join(';'));
    }
  } finally { machine.end(); leadAllOff(); }
  return lines;
}
export async function checkLightHands(){
  const diffs=[], miss=s=>diffs.push(s), notes=[];
  const G=await import('../../../core/gestures.js'), REC=await import('../../../core/recorder.js');
  const keep=envKeep(), fx0=fxSnap();
  const base={ ...ENV, hand:{ L:'fx', R:'note' }, voice:'poly', viewRect:{ ax0:CAM_MARGIN, ax1:1-CAM_MARGIN, ay0:CAM_MARGIN, ay1:1-CAM_MARGIN } };
  const core={ begin:(clk,tap)=>{ G.handsProbe(clk, ()=>true); REC.wTapSet(tap); }, frame:res=>G.processHandsProbe(res), end:()=>{ REC.wTapSet(null); G.handsProbe(null); } };
  const light={ begin:(clk,tap)=>{ lightHandsProbe(clk); lightNoteTapSet(tap); }, frame:res=>lightProcessHandsProbe(res), end:()=>{ lightNoteTapSet(null); lightHandsProbe(null); } };
  let a, b, c;
  setLightPerHandReverb(false); setLightMirrorVolume(false);   // LIGHT-6b/6c: core has ONE reverb and ONE volume law for both hands; the comparison runs Light the same way
  try{
    envSet(base); fxRestore(fx0); a=perform(core);
    envSet(base); fxRestore(fx0); b=perform(light);
    envSet(base); fxRestore(fx0); setLightFxSens(1.5); try{ c=perform(light); } finally { setLightFxSens(1); }
  } finally { envSet(keep); fxRestore(fx0); lightHandsReset(); setLightPerHandReverb(true); setLightMirrorVolume(true); }
  const calls=x=>x.filter(l=>/ W /.test(l)).length;
  notes.push(`core ${a.length} lines (${calls(a)} note calls), Light ${b.length} (${calls(b)})`);
  if(calls(a)<20) miss('the performance made only '+calls(a)+' note calls in core — it proves nothing');
  const n=Math.max(a.length,b.length); let shown=0;
  for(let i=0;i<n;i++) if(a[i]!==b[i]){ if(shown++<4) miss(`line ${i}: core «${(a[i]||'—').slice(0,160)}» ≠ Light «${(b[i]||'—').slice(0,160)}»`); }
  if(shown>4) miss(`… ${shown} lines differ in all`);
  const dc=c.filter((l,i)=>l!==b[i]).length; notes.push(`CONTROL (Light, effects sensitivity 1.5): ${dc} lines differ`);
  if(!dc) miss('CONTROL: the sensitivity change left every line equal — the comparison cannot fail');
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
