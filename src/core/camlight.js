/* LAT3 — low light. CORE: pure JavaScript (no DOM, camera, Web Audio or network); runs unchanged in node (data runner row «LAT3 low
   light (core)»). In low light a webcam lengthens its exposure and delivers fewer frames (the user's desktop: 6.3 fps in the evening vs
   14–30 by day), so every hand answer waits longer. Here: the test switch's constraints and verdict, the player hint's decision (frame
   timing only — no image analysis, rule #33), the «hands lost» counter, and the camera capabilities line for the meter's Copy text. */

/* ---------- the «Low light (test)» switch ---------- */
export const LOW_MODES=['off','fps15','fps24','exposure'];
export const LOW_TARGET={ fps15:15, fps24:24, exposure:24 };   // the frame rate each mode is meant to keep
export const LOW_EXPOSURE_S=1/40;      // «short manual exposure»: 25 ms leaves room for 30 fps
export const LOW_SETTLE_MS=1000, LOW_MEASURE_MS=2000;   // after applying: let the camera settle, then count delivered frames
/* manual exposure is offered only when the camera reports both a manual mode and an exposure-time range */
export const exposureSupported=caps=> !!(caps && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('manual')
  && caps.exposureTime && Number.isFinite(caps.exposureTime.min) && Number.isFinite(caps.exposureTime.max));
/* exposure time in the constraint's units (100 µs, Media Capture spec), clamped into the camera's range and snapped to its step */
export function exposureUnits(caps, sec=LOW_EXPOSURE_S){
  const r=caps.exposureTime, st=r.step>0 ? r.step : 0;
  let v=Math.min(r.max, Math.max(r.min, sec*1e4));
  if(st){ v=r.min+Math.round((v-r.min)/st)*st; if(v>r.max) v-=st; }
  return +v.toFixed(6);
}
/* The constraint set applyConstraints receives (it REPLACES the track's set, so the base — today's request — always rides along).
   null = the mode is not possible on this camera. Off after 'exposure' hands the exposure back to the camera ('continuous'). */
export function lowConstraints(mode, caps, base, prev='off'){
  if(!LOW_MODES.includes(mode)) return null;
  const c={ ...base };
  if(mode==='off'){ if(prev==='exposure' && caps && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) c.advanced=[{ exposureMode:'continuous' }]; return c; }
  if(mode==='exposure'){ if(!exposureSupported(caps)) return null; c.advanced=[{ exposureMode:'manual', exposureTime:exposureUnits(caps) }]; return c; }
  const n=LOW_TARGET[mode], b=base.frameRate&&base.frameRate.ideal;
  c.frameRate={ min:n, ideal:Math.max(n, b||30) };
  return c;
}
/* Did the mode do anything? Measured delivered fps before and after (after = counted once the camera settled). Kept when it reaches
   90 % of its target, or when it helped by a quarter at least ('partly'); manual exposure also needs the camera to report 'manual'.
   No measurement (NaN) = kept, named 'unmeasured'. */
export function lowVerdict({ mode, before, after, settings }){
  if(mode==='off') return { ok:true, why:'' };
  if(mode==='exposure' && !(settings && settings.exposureMode==='manual')) return { ok:false, why:'manual' };
  if(!Number.isFinite(after)) return { ok:true, why:'unmeasured' };
  if(after>=LOW_TARGET[mode]*0.9) return { ok:true, why:'' };
  if(Number.isFinite(before) && before>0 && after>=before*1.25) return { ok:true, why:'partly' };
  return { ok:false, why:'noeffect' };
}

/* ---------- the player hint «Too dark» ----------
   Fed with the time (ms) of every frame the camera delivers. The rate = frames within the last DARK_WIN ms (first to last); it counts
   only once a whole window was seen. The hint is due when the rate stays below DARK_FPS for MORE than DARK_MS while the camera was
   granted at least DARK_GRANTED fps (a camera that never promised more is not «slowed down»); it shows once per session, at the first
   frame where it is due and allowed (not recording, not in the editor). */
export const DARK_FPS=12, DARK_MS=3000, DARK_GRANTED=24, DARK_WIN=1000;
export const darkNew=(cfg={})=>({ cfg:{ fps:DARK_FPS, ms:DARK_MS, granted:DARK_GRANTED, win:DARK_WIN, ...cfg }, ts:[], t0:NaN, lowFrom:null, shown:false, fps:NaN });
export function darkStep(st, t, { granted, allowed=true }={}){
  const C=st.cfg; if(!Number.isFinite(st.t0)) st.t0=t;
  st.ts.push(t); while(st.ts.length && st.ts[0]<=t-C.win) st.ts.shift();
  const n=st.ts.length, dt=n>1 ? st.ts[n-1]-st.ts[0] : 0;
  st.fps= n>1 && dt>0 ? (n-1)*1000/dt : 0;
  const full=t-st.t0>=C.win, low=full && Number.isFinite(granted) && granted>=C.granted && st.fps<C.fps;
  if(!low){ st.lowFrom=null; return false; }
  if(st.lowFrom==null) st.lowFrom=t;
  if(st.shown || !(t-st.lowFrom>C.ms) || !allowed) return false;
  st.shown=true; return true;
}

/* ---------- hands lost (detection quality) ----------
   Fed with every processed frame (time ms, hands found). A loss = the number of hands drops and is back to the earlier number within
   LOST_MS (a hand that stays away longer has left; a hand that enters is not a loss). Several drops inside one gap count once. */
export const LOST_MS=1000;
export const lostNew=(cfg={})=>({ cfg:{ ms:LOST_MS, ...cfg }, prev:0, gap:null, n:0, times:[] });
export function lostStep(st, t, n){
  let hit=false;
  if(st.gap && t-st.gap.t>st.cfg.ms) st.gap=null;   // away too long: it left
  if(st.gap && n>=st.gap.k){ st.n++; st.times.push(t); hit=true; st.gap=null; }
  else if(!st.gap && n<st.prev) st.gap={ t, k:st.prev };
  st.prev=n;
  return hit;
}

/* ---------- camera capabilities, one line for the Copy text ----------
   What the browser reports for this webcam (track.getCapabilities) with the current value (getSettings) where there is one. Technical
   names stay as the browser gives them (the person sends the text on); ranges «min–max (step)», lists «a/b», current «= v». */
const CAP_KEYS=['frameRate','width','height','resizeMode','exposureMode','exposureTime','exposureCompensation','brightness','contrast',
  'saturation','sharpness','gain','iso','whiteBalanceMode','colorTemperature','focusMode','torch','backgroundBlur'];
const num=x=>Number.isFinite(x) ? String(+x.toFixed(3)) : String(x);
export function capsText(caps, settings={}){
  if(!caps || typeof caps!=='object') return '';
  const out=[];
  for(const k of CAP_KEYS){
    const c=caps[k]; if(c==null) continue;
    let s;
    if(Array.isArray(c)) s=c.map(String).join('/');
    else if(typeof c==='object') s=`${num(c.min)}–${num(c.max)}`+(Number.isFinite(c.step)&&c.step>0 ? ` (${num(c.step)})` : '');
    else s=String(c);
    const v=settings[k]; if(v!=null) s+=` = ${typeof v==='number' ? num(v) : String(v)}`;
    out.push(`${k} ${s}`);
  }
  return out.join(' · ');
}
