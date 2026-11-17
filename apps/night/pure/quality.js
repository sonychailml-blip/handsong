/* NIGHT-16 — THE QUALITY CHOICE: one control, heaviest to lightest. 'full' (Detailed), 'reduced' (Standard), 'light' (Light: the old
   Lightweight mode — Standard's picture without the glass blur, the lighter echo, simpler music, fewer ringing notes). Stored as before: the
   Light flag under the old Lightweight key ('1' = on) and the picture level under the scene's own key, so every saved setting reads on. A
   first visit stores nothing: Standard (the scene's default) — the device's own pick, as before. Pure: no DOM, no storage. */
export const QUALITIES=Object.freeze(['full', 'reduced', 'light']);
/* the stored pair → the choice (an unknown level reads as Standard; Light wins over any level: the old Lightweight drew Standard) */
export const qualityFrom=(light, level)=>light==='1' ? 'light' : level==='full' ? 'full' : 'reduced';
/* the choice → what is stored and drawn: { light '1'|'0', level } */
export const qualityState=q=>Object.freeze({ light: q==='light' ? '1' : '0', level: q==='full' ? 'full' : 'reduced' });
