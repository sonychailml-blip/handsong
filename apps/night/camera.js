/* NIGHT-10 — CHOOSING THE CAMERA (Settings → Camera). On a phone the back camera often sees hands better (and can face the person while the
   picture goes to a TV); on a computer a better USB webcam may be plugged in. The list (core/vision.js cameraList, CORE-16) is named by
   ./pure/camera.js (Front / Back on a phone, the names on a computer, «Camera N» before the permission) and shown only with two or more. A tap
   switches LIVE (cameraSwitch: the same hand model, the music and everything else go on); the choice is kept on this device and opens next
   time (camRestore, before the start); a saved camera that is gone opens the default quietly (core falls back). A picked camera tells its
   facing: the back one is not mirrored (camFacing → mirrored(): the picture and the hands' positions together; the hands keep their own labels,
   so the right hand still plays). The calibration is per camera (core/handcal.js keys it by the camera): a camera not offered yet gets the
   offer after the switch (after()). Nothing technical is shown; the image never leaves the device (rule #33). */
import { cameraList, cameraSwitch, setCameraPick, cameraPickInfo } from '../../core/vision.js';
import { cameraNames, camMobile } from './pure/camera.js';
import { t } from '../../core/i18n.js';

export const CAM_KEY='handsong.nightCam';
const $=id=>document.getElementById(id);
const load=()=>{ try{ const v=JSON.parse(localStorage.getItem(CAM_KEY)||'null'); return v && typeof v.deviceId==='string' && v.deviceId ? v : null; }catch(e){ return null; } };
const save=v=>{ try{ if(v) localStorage.setItem(CAM_KEY, JSON.stringify(v)); else localStorage.removeItem(CAM_KEY); }catch(e){} };
let env=null, busy=false, after=null, names=[];
const envNow=()=>env || { ua:navigator.userAgent, platform:navigator.platform, touch:navigator.maxTouchPoints||0 };
/* at load, before the start: the camera kept on this device (if any) is the one the start opens */
export function camRestore(){ const v=load(); setCameraPick(v ? { deviceId:v.deviceId } : null); return v; }
/* the shell's door: what happens after a switch (the calibration offer) */
export function camWire(o={}){ after=o.after||null; }
const nameOf=e=> e.kind==='front' ? t('night.cam.front')+(e.n>1 ? ' '+e.n : '') : e.kind==='back' ? t('night.cam.back')+(e.n>1 ? ' '+e.n : '') : e.kind==='name' ? e.name : t('night.cam.n', { n:e.n });
/* fill the Camera section (the settings card is open) → a promise of the entries */
export async function camRender(){
  const sec=$('nightCamSec'), seg=$('nightCamSeg'); if(!sec || !seg) return [];
  const list=await cameraList(); names=cameraNames(list, camMobile(envNow()));
  sec.hidden=names.length<2; if(names.length<2){ seg.replaceChildren(); return names; }
  const cur=cameraPickInfo().deviceId;
  if(seg.children.length!==names.length || [...seg.children].some((b,i)=>b.dataset.cam!==names[i].deviceId)){
    seg.replaceChildren(...names.map(e=>{ const b=document.createElement('button'); b.type='button'; b.dataset.cam=e.deviceId; b.onclick=()=>pickCam(e.deviceId); return b; })); }
  [...seg.children].forEach((b,i)=>{ b.textContent=nameOf(names[i]); b.classList.toggle('on', !!cur && b.dataset.cam===cur); });
  seg.classList.toggle('night-seg-2', names.length===2);
  return names;
}
/* a tap on a camera: switch live, keep it, then the shell's after() (the calibration offer for a new camera) */
async function pickCam(deviceId){
  if(busy || !deviceId || deviceId===cameraPickInfo().deviceId) return;
  busy=true; const was=cameraPickInfo();
  try{ await cameraSwitch({ deviceId }); save({ deviceId }); if(after) after(); }
  catch(e){ console.warn('[night] the camera did not switch — staying on the one before:', e);   // eslint-disable-line no-console
    try{ await cameraSwitch(was.pick); }catch(e2){} }
  finally{ busy=false; camRender(); }
}
/* probe only: a made-up device (ua, platform, touch) for the names; the state */
export const camEnvDbg=e=>{ env=e||null; };
export const camDbg=()=>({ saved:load(), names:names.map(x=>({ ...x })), busy, ...cameraPickInfo() });
