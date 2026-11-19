/* NIGHT-16 — THE QUALITY CHOICE: one control, heaviest to lightest. 'full' (Detailed), 'reduced' (Standard), 'light' (Light: the old
   Lightweight mode — Standard's picture without the glass blur, the lighter echo, simpler music, fewer ringing notes). Stored as before: the
   Light flag under the old Lightweight key ('1' = on) and the picture level under the scene's own key, so every saved setting reads on. A
   first visit stores nothing: Standard (the scene's default) — the device's own pick, as before. Pure: no DOM, no storage. */
export const QUALITIES=Object.freeze(['full', 'reduced', 'light']);
/* the stored pair → the choice (an unknown level reads as Standard; Light wins over any level: the old Lightweight drew Standard) */
export const qualityFrom=(light, level)=>light==='1' ? 'light' : level==='full' ? 'full' : 'reduced';
/* the choice → what is stored and drawn: { light '1'|'0', level } */
export const qualityState=q=>Object.freeze({ light: q==='light' ? '1' : '0', level: q==='full' ? 'full' : 'reduced' });
/* PERF-4 (the founder approved, 2026-11-19): A WEAK GPU STARTS AT LIGHT on the FIRST visit only. Recognised by the WebGL renderer's name (the unmasked
   one where the browser gives it): Intel's integrated graphics up to Haswell — «HD Graphics» with no number or «Family», 2000 / 2500 / 3000 / 4000 /
   4200 / 4400 / 4600 / 5000 (the founder's HD 4000 measured 35 ms a frame at Standard) —, Intel GMA and «4 Series», ARM Mali-2xx/3xx/4xx and
   Mali-T6xx/T7xx, Qualcomm Adreno 2xx/3xx, PowerVR SGX. Not weak: Iris, UHD, HD 5xx/6xx and every later Intel, the Poco's Mali-G57, Apple, discrete
   cards, a masked name («WebKit WebGL»), a software renderer (another question; the probes' headless browser runs on one). */
const WEAK_HD=new Set(['2000', '2500', '3000', '4000', '4200', '4400', '4600', '5000']);
export function weakGpu(name){ const s=String(name||'').toLowerCase(); if(!s || /swiftshader|llvmpipe|softpipe|software|microsoft basic/.test(s)) return false;
  if(/intel/.test(s)){ if(/\bgma\b|4 series/.test(s)) return true; if(/iris|uhd/.test(s)) return false;
    const m=s.match(/\bhd graphics\b(?:\s+(\d{3,4}|family)\b)?/); if(m) return !m[1] || m[1]==='family' || WEAK_HD.has(m[1]); }
  return /\bmali-[234]\d\d\b|\bmali-t[67]\d\d\b|\badreno[^0-9]{0,8}[23]\d\d\b|\bpowervr sgx/.test(s); }
/* the first visit's choice: nothing stored yet (neither the Light flag nor a picture level) and a weak GPU → 'light' (then stored like a choice, so
   every later visit reads the player's choice as now); else null (Standard, the scene's default, as before) */
export const firstQualityOf=(light, level, gpu)=>light==null && level==null && weakGpu(gpu) ? 'light' : null;
