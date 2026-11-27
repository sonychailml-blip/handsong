/* LIGHT-3b — LIGHT'S OWN DRAWN ICONS (our own work, rule #32; the shapes of the founder's approved drawing, tools/.out/light-ui/), added to the shared
   table through core's door (core/icons.js svgIconAdd, CORE-15) before the page's markup is filled. 'line' = a 1.6 round stroke of the current
   colour, 'acc' = Light's amber (the --night-accent name core paints with is defined in light.css). */
import { svgIconAdd } from '../../core/icons.js';

export const LIGHT_ICONS=Object.freeze({
  timbre:[['line','path',{ d:'M2.5 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 12 4 12 2-6 3-6' }]],
  hands:[['line','path',{ d:'M7 20c-2.5-2-3.5-4.5-3.5-7V9.5a1.3 1.3 0 0 1 2.6 0V12M6.1 11V5.5a1.3 1.3 0 0 1 2.6 0V11M8.7 10.5V4.5a1.3 1.3 0 0 1 2.6 0v6M11.3 11V6a1.3 1.3 0 0 1 2.6 0v7.5c0 3-1.5 5.5-3.5 6.5M17 8.5l2.5 2.5-2.5 2.5M19.5 11h-3' }]],
  'camera-flip':[['line','path',{ d:'M5 7h3l1.5-2.2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9.2 13.4a3 3 0 0 1 5.3-1.6M14.8 12.6a3 3 0 0 1-5.3 1.6M14.6 10.4v1.6h-1.6M9.4 15.6V14h1.6' }]],
  sliders:[['line','path',{ d:'M4 7h9M17 7h3M4 17h3M11 17h9' }], ['acc','circle',{ cx:15, cy:7, r:2 }], ['acc','circle',{ cx:9, cy:17, r:2 }]],
  'chev-down':[['line','path',{ d:'M6 9l6 6 6-6' }]],
  'chev-up':[['line','path',{ d:'M6 15l6-6 6 6' }]],
  /* LIGHT-5: the clip button (a ring with an amber dot — never red, as in Night), the card's sound on / off, «saved» */
  'clip-rec':[['line','circle',{ cx:12, cy:12, r:8 }], ['acc','circle',{ cx:12, cy:12, r:3.6 }]],
  'speaker-on':[['line','path',{ d:'M4 10v4h3l5 4V6L7 10H4z' }], ['acc-line','path',{ d:'M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10' }]],
  'speaker-off':[['line','path',{ d:'M4 10v4h3l5 4V6L7 10H4zM16 9.5l5 5M21 9.5l-5 5' }]],
  saved:[['acc-line','path',{ d:'M5 12.5l4.5 4.5L19 7.5' }]],
  /* LIGHT-9: the language (a globe), the iPhone's Share sign and «add» square (the home-screen card) */
  globe:[['line','circle',{ cx:12, cy:12, r:8.5 }], ['line','path',{ d:'M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5M12 3.5C9.6 5.8 8.4 8.6 8.4 12s1.2 6.2 3.6 8.5' }]],
  /* LIGHT-8: full screen — four corner brackets, the same drawing as Night's (apps/night/pure/fsicons.js; out: corners point out, in: they point in) */
  'fs-enter':[['fill','path',{ d:'M3.5 3.5H9V5.5H5.5V9H3.5ZM20.5 3.5V9H18.5V5.5H15V3.5ZM20.5 20.5H15V18.5H18.5V15H20.5ZM3.5 20.5V15H5.5V18.5H9V20.5Z' }]],
  'fs-exit':[['fill','path',{ d:'M7.5 3.5H9.5V9.5H3.5V7.5H7.5ZM16.5 3.5H14.5V9.5H20.5V7.5H16.5ZM16.5 20.5H14.5V14.5H20.5V16.5H16.5ZM7.5 20.5H9.5V14.5H3.5V16.5H7.5Z' }]],
});
for(const [name, shapes] of Object.entries(LIGHT_ICONS)){ const why=svgIconAdd(name, shapes); if(why) console.warn('[light] icon:', why); }   // eslint-disable-line no-console
