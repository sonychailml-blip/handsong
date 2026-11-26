/* NIGHT-7c — NIGHT'S OWN DRAWN ICONS (our own work, rule #32), added to the shared table through core's door (CORE-15) before the page's
   markup is filled (main.js imports this right after the texts). Room-neutral: Depth = layers going away with a light far off; Lightweight
   = a feather; full screen in / out = corners opening / closing; the Share and Add-to-Home-Screen pictures of the iPhone hint. */
import { svgIconAdd } from '../../core/icons.js';

import { FS_ENTER, FS_EXIT } from './pure/fsicons.js';   // NIGHT-8b: full screen as four corner brackets (the paths are pure: a data row reads them)

export const NIGHT_ICONS=Object.freeze({
  depth:[['line','path',{ d:'M3 19.5h18M6 15h12M9 10.5h6' }], ['acc','circle',{ cx:12, cy:6, r:1.7 }]],
  lightweight:[['tint','path',{ d:'M19.5 4C12 4 7 9 7 16.5v3c5.5 0 12.5-4.5 12.5-15.5z', o:.2 }], ['line','path',{ d:'M19.5 4C12 4 7 9 7 16.5v3c5.5 0 12.5-4.5 12.5-15.5zM5 21.5l10-12' }]],
  'fs-enter':[['fill','path',{ d:FS_ENTER }]],
  'fs-exit':[['fill','path',{ d:FS_EXIT }]],
  share:[['line','path',{ d:'M8.5 9.5H6.5v11h11v-11h-2M12 3v11.5M8.5 6.5L12 3l3.5 3.5' }]],
  'add-home':[['tint','rect',{ x:4, y:4, width:16, height:16, rx:4, o:.15 }], ['line','rect',{ x:4, y:4, width:16, height:16, rx:4 }], ['acc-line','path',{ d:'M12 8.5v7M8.5 12h7' }]],
  /* SHARE-3: the clip button (a ring with a dot of the room's light — the record sign, never red), the card's sound on / off, «saved» */
  'clip-rec':[['line','circle',{ cx:12, cy:12, r:8 }], ['acc','circle',{ cx:12, cy:12, r:3.6 }]],
  'speaker-on':[['line','path',{ d:'M4 10v4h3l5 4V6L7 10H4z' }], ['acc-line','path',{ d:'M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10' }]],
  'speaker-off':[['line','path',{ d:'M4 10v4h3l5 4V6L7 10H4zM16 9.5l5 5M21 9.5l-5 5' }]],
  saved:[['acc-line','path',{ d:'M5 12.5l4.5 4.5L19 7.5' }]],
});
for(const [name, shapes] of Object.entries(NIGHT_ICONS)){ const why=svgIconAdd(name, shapes); if(why) console.warn('[night] icon:', why); }   // eslint-disable-line no-console
