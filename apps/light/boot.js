/* LIGHT-3 — LIGHT'S OWN START AND FRAME LOOP (option B: no shared legacy UI). The tap on Play creates the AudioContext in its synchronous part
   (hard rule #1), then the hand model (MediaPipe from our own origin) and the camera; then the page's profile is applied through Light's own
   doors (core/profile.js: the «Familiar» modes, SuperSaw, key A, the hands, the solo chain as data) and the loop starts. FRAME (rule #8): each
   processed camera frame → its crop (rule #12) → Light's hands (sound now) → it becomes the shown picture; every screen frame draws that picture,
   the field and the hands. A failed start leaves the card usable: «Try again» retries only what failed (sound and model are built once). */
import { initAudio, AC, setLeadInstr, fxSetActive, fxChainResplice, timbreIdOf, timbreIdx } from '../../core/audio.js';
import { video, initDetector, startCamera, setHandsSink, pollFrame, canvas } from '../../core/vision.js';
import { profileWire, profileApply } from '../../core/profile.js';
import { scaleId, tonic, tonicCents, leadIdx, phoneInstr, splitOn, handFn, voiceMode, fx, fxChainOf, chainKeyOf, fxIsScalar, setFxChain,
  setScaleId, setTonic, setTonicCents, setHandFn, setVoiceMode, sx, sy } from '../../core/state.js';
import { fxParamsOf } from '../../core/gestures/fxhand.js';
import { t } from '../../core/i18n.js';
import { lightProcessHands, lightHandsView, lightHandsReset, lightVoiceModeReset } from './gestures.js';
import { lightAllOff } from './engine.js';
import { lightDrawFrame, lightSyncViewRect } from './draw.js';

export const PROFILE='profile.light';
const $=id=>document.getElementById(id);
let shown=null, started=false, starting=false, face=null;
const stage={ audio:false, det:false };
const listeners=[];
export const onLightFrame=f=>{ listeners.push(f); };   // the shell's bars, once per screen frame, with the hands in view
const starts=[];
export const onLightStart=f=>{ starts.push(f); };   // LIGHT-3b: once the start is done and the profile applied (the controls restore the person's choices)
export const lightStarted=()=>started;

/* a profile's solo chain into the live state and sound (as the shared UI's profChain): the data, then the sound halves, then each fixed value */
function chainApply(key, entries, amts){
  const now=fxChainOf(key); if(JSON.stringify(now)===JSON.stringify(entries)) return;
  const before=new Set(now.map(e=>e.fxId)), after=new Set(entries.map(e=>e.fxId));
  setFxChain(key, entries);
  for(const id of before) if(!after.has(id)) fxSetActive(key,id,false);
  for(const id of after) if(!before.has(id)) fxSetActive(key,id,true);
  fxChainResplice(key);
  for(const eff of fxChainOf(key)) eff.params.forEach((pa,pi)=>{ if(pa.mode==='fixed' && pa.v01!=null){ const p=fxParamsOf(key,eff.fxId)[pi]; if(p) p.set(pa.v01); } });
  if(amts) for(const eff of fxChainOf(key)) if(fxIsScalar(eff.fxId) && amts[eff.fxId]!=null && fx[eff.fxId]!==amts[eff.fxId]){ const p=fxParamsOf(key,eff.fxId)[0]; if(p) p.set(amts[eff.fxId]); }
}
/* Light's doors to core/profile.js: read the live state, write a state (every live note off first), put the face on */
profileWire({
  busy:()=>null,
  read:()=>({ scaleId, tonic, tonicCents, lead:timbreIdOf('ld',leadIdx), phoneInstr, splitOn, hand:{ ...handFn.ld }, voice:voiceMode.ld,
    chain:JSON.parse(JSON.stringify(fxChainOf(chainKeyOf('ld')))), scalars:{ ...fx } }),
  write:s=>{ lightAllOff(); lightHandsReset();
    if(scaleId!==s.scaleId) setScaleId(s.scaleId);
    if(tonic!==s.tonic || tonicCents!==s.tonicCents){ setTonic(s.tonic); setTonicCents(s.tonicCents); }
    const li=timbreIdx('ld', s.lead); if(li!=null && li!==leadIdx) setLeadInstr(li);
    setHandFn('ld','L',s.hand.L); setHandFn('ld','R',s.hand.R);
    if(voiceMode.ld!==s.voice){ setVoiceMode('ld',s.voice); lightVoiceModeReset(); }
    if(s.chain) chainApply(chainKeyOf('ld'), s.chain, s.scalars); },
  face:p=>{ if(face) face(p); },
});
export const setLightFace=f=>{ face=f; };

let frames=0;   // processed camera frames (the path check and the probes read it)
function onHands(f){
  frames++;
  if(f.frame) lightSyncViewRect(f.frame.width, f.frame.height);
  lightProcessHands(f.res);
  if(f.frame){ if(shown) shown.close(); shown=f.frame; }
}
const sxOf=x=>sx(x, canvas.width), syOf=y=>sy(y, canvas.height);
function loop(now){
  requestAnimationFrame(loop);
  pollFrame();
  const hands=lightHandsView();
  lightDrawFrame(shown || video, hands, sxOf, syOf);
  for(const f of listeners) f(now, hands);
}

function fail(err){
  const kind=err&&err.camKind, own=kind&&kind!=='other' ? t('cam.'+kind) : t('load.error',{ msg:(err&&err.message?err.message:err) });
  $('loadmsg').textContent=own; $('startBtn').disabled=false; $('start').classList.remove('busy'); $('camRetry').hidden=false;
}
async function start(){
  if(started) return true; if(starting) return false; starting=true;
  const msg=s=>{ $('loadmsg').textContent=s; };
  const audioP= stage.audio ? null : initAudio();   // rule #1: the context in this tap's synchronous part
  $('startBtn').disabled=true; $('camRetry').hidden=true; $('start').classList.add('busy');
  try{
    if(audioP){ await audioP; stage.audio=true; }
    await AC.resume();
    if(!stage.det){ await initDetector(msg, { files:'own' }); stage.det=true; }
    msg(t('load.camera'));
    await startCamera();
    try{ await navigator.wakeLock.request('screen'); }catch(e){}
    { const why=profileApply(PROFILE); if(why) console.warn('[light] the profile: '+why); }   // eslint-disable-line no-console
    for(const f of starts){ try{ f(); }catch(e){ console.warn('[light] a start listener failed', e); } }   // eslint-disable-line no-console
    $('start').classList.remove('busy','on');
    started=true; requestAnimationFrame(loop);
    return true;
  }catch(err){ console.warn('[light] the start failed:', err); fail(err); return false; }   // eslint-disable-line no-console
  finally{ starting=false; }
}
export function lightBoot(){
  setHandsSink(onHands, ()=>false);
  $('startBtn').onclick=()=>{ start(); };
  $('camRetry').onclick=()=>{ start(); };
  if(new URLSearchParams(location.search).has('probe')){ const l=document.querySelector('link[rel="handsong-probes"]');   // ?probe: the page's probe facade (a shipped page has no such tag)
    if(l) import(l.href).then(m=>m.install()).catch(e=>console.warn('[probe] the probes failed to load', e)); }   // eslint-disable-line no-console
}
/* probe only */
export const lightBootDbg=()=>({ started, stage:{ ...stage }, frames, picture:!!shown });
