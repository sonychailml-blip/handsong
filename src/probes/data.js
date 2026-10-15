/* PROBE1: the data rows — run by P.all in the browser AND by tools/probe-data.mjs in node (flag node). Imports only probedata.js and the
   registry, so node can load it. */
import { row } from './rows.js';
import { checkData, checkPitch, checkView, checkUntyped, checkStack, checkBehaviour, checkDegrees as checkDegreesData, checkModeMap } from '../probedata.js';
row({ at:0, name:'T0 data', run:()=>checkData(), read:r=>({ cases:r.checks, diff:r.mismatches.length, list:r.mismatches }), node:true });
row({ at:10, name:'T1 pitch', run:()=>checkPitch(), read:r=>({ cases:r.cases, diff:r.total, list:r.mismatches }), slow:true, node:true });
row({ at:20, name:'T2 view', run:()=>checkView(), read:r=>({ cases:r.checks+r.cases, diff:r.total, list:r.mismatches }), slow:true, node:true });
row({ at:90, name:'T6b untyped chords (sweep)', run:()=>checkUntyped(), read:r=>({ cases:r.cases, diff:r.total, list:r.mismatches }), slow:true, node:true });
row({ at:100, name:'stacked chords', run:()=>checkStack(), read:r=>({ cases:r.cases, diff:r.total, list:r.mismatches }), node:true });
row({ at:240, name:'ED4 degrees (sweep)', run:()=>checkDegreesData(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), slow:true, node:true });
row({ at:250, name:'OWN1 modes by degrees (sweep)', run:()=>checkModeMap(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), node:true });
row({ at:470, name:'F4 behaviour as data', run:()=>checkBehaviour(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }), node:true });
