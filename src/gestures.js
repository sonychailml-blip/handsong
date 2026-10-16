/* GES1 (DAY run 2026-10-16): gestures.js is the FACADE of the gesture layer — importers (main, draw, ui, frzqueue, probes) keep their
   import lines. Parts: gestures/features.js (pure math), roles.js (owner keys, hand roles, note volume), hands.js (the state machine,
   processHands, the HAND1 probe clock), expr.js (expression hand), fxhand.js (effects hand), looper.js (looper hand). */
export { HANDS, processHands, voiceModeReset, handsProbe, processHandsProbe } from './gestures/hands.js';
export { ACTIONS } from './gestures/roles.js';
export { degRaw, pinchDbg } from './gestures/features.js';
export { fxParamsOf } from './gestures/fxhand.js';
