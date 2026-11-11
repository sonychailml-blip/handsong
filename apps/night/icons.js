/* NIGHT-7c — NIGHT'S OWN DRAWN ICONS (our own work, rule #32), added to the shared table through core's door (CORE-15) before the page's
   markup is filled (main.js imports this right after the texts). Room-neutral: Depth = layers going away with a light far off; Lightweight
   = a feather; full screen in / out = corners opening / closing; the Share and Add-to-Home-Screen pictures of the iPhone hint. */
import { svgIconAdd } from '../../core/icons.js';

export const NIGHT_ICONS=Object.freeze({
  depth:[['line','path',{ d:'M3 19.5h18M6 15h12M9 10.5h6' }], ['acc','circle',{ cx:12, cy:6, r:1.7 }]],
  lightweight:[['tint','path',{ d:'M19.5 4C12 4 7 9 7 16.5v3c5.5 0 12.5-4.5 12.5-15.5z', o:.2 }], ['line','path',{ d:'M19.5 4C12 4 7 9 7 16.5v3c5.5 0 12.5-4.5 12.5-15.5zM5 21.5l10-12' }]],
  'fs-enter':[['line','path',{ d:'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5' }]],
  'fs-exit':[['line','path',{ d:'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5' }]],
  share:[['line','path',{ d:'M8.5 9.5H6.5v11h11v-11h-2M12 3v11.5M8.5 6.5L12 3l3.5 3.5' }]],
  'add-home':[['tint','rect',{ x:4, y:4, width:16, height:16, rx:4, o:.15 }], ['line','rect',{ x:4, y:4, width:16, height:16, rx:4 }], ['acc-line','path',{ d:'M12 8.5v7M8.5 12h7' }]],
});
for(const [name, shapes] of Object.entries(NIGHT_ICONS)){ const why=svgIconAdd(name, shapes); if(why) console.warn('[night] icon:', why); }   // eslint-disable-line no-console
