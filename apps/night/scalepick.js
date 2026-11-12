/* CORE-20: Night fetches only the modes it plays — every room's moods and the page profile's moods (core/scalepick.js reads the profile) — and what
   they need. Adding a mode to Night stays naming it in a room's moods or in the profile's moods: nothing else lists them. The entry's FIRST import:
   it must run before core/scales.js loads its data. ?probe: the probes add the other built-ins themselves when a row first runs (tools/probes/night.js). */
import { scalesOnly } from '../../core/scalepick.js';
import { ROOMS } from './rooms/index.js';
import { roomModes } from './pure/room.js';

/* ?probe&oldload: every built-in, as before (the loading measurement's CONTROL; tools/probe-browser.mjs --measure-start) */
const OLD=(()=>{ try{ const q=new URLSearchParams(location.search); return q.has('probe') && q.has('oldload'); }catch(e){ return false; } })();
if(!OLD) scalesOnly({ modes:roomModes(ROOMS.map(R=>R.record)), profile:true });
