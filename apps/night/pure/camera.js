/* NIGHT-10 — THE CAMERAS AS THE PERSON READS THEM (pure, rule #36; data row «NIGHT camera names (app)»). The browser's list (core/vision.js
   cameraList: deviceId, label, facing guessed from the label's words) → one entry per camera with what the Settings card shows:
   - a phone or tablet: «Front» / «Back» by the camera's facing (a second back camera «Back 2»), a camera of unknown facing by its name;
   - a computer: the device's own name, without the hardware numbers some names carry («HD Webcam (046d:0825)» → «HD Webcam»);
   - no label yet (before the camera permission): «Camera 1», «Camera 2».
   → [{ deviceId, kind: 'front' | 'back' | 'name' | 'number', n (1-based, per kind), name (the cleaned label, for 'name') }]; the shell turns kind
   and n into words through its texts (night.cam.*). Nothing technical (ids, resolutions) is ever shown. */
export const cleanCamName=s=>String(s||'').replace(/\s*\((?:[0-9a-f]{4}:[0-9a-f]{4}|vid[^)]*|usb[^)]*)\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
export function cameraNames(list, mobile){
  const out=[], count={ front:0, back:0, name:0, number:0 };
  for(const d of Array.isArray(list) ? list : []){
    const name=cleanCamName(d && d.label);
    let kind= !name ? 'number' : mobile && d.facing==='user' ? 'front' : mobile && d.facing==='environment' ? 'back' : 'name';
    count[kind]++; out.push({ deviceId:(d && d.deviceId)||'', kind, n: kind==='number' ? out.length+1 : count[kind], name: kind==='name' ? name : '' });
  }
  return out;
}
/* is this device a phone or a tablet (Front / Back words) — from the browser's own hints */
export const camMobile=env=>!!(env && (/Android|iPhone|iPad|iPod|Mobile/i.test(env.ua||'') || (env.platform==='MacIntel' && (env.touch||0)>1)));
