/* LIGHT-3 — only the modes Light plays: the page profile's moods (Full's «Familiar» section) and what they name. The entry's FIRST import: it runs
   before core/scales.js loads its data (core/scalepick.js, CORE-20). ?probe: the probes load any other built-in they need themselves. */
import { scalesOnly } from '../../core/scalepick.js';

scalesOnly({ modes:[], profile:true });
