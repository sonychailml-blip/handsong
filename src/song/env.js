/* REC3 part 2 (stage 3) — THE SONG LAYER'S ENVIRONMENT: what pure song/ modules need from above — the transport (REC4's clock answers
   these later), the engine's effect DECLARATIONS (the FX_FACTORY readers of audio.js; AUD2 moves them into modules) and the live choices
   (timbres, kit, chain keys). The recorder wires it ONCE (envWire); song/ never imports those modules (folder rule) and reads through ENV
   at call time. Until wired every entry throws — nothing in song/ may run before the recorder has loaded. */
const unwired=n=>()=>{ throw new Error('song/env: '+n+' is not wired'); };
const ENV={};
for(const n of ['fxPerm','fxParamMetaOf','fxNoteField','fxParamKeysOf','fxDefaultsOf','fxNoteFollows','fxIsPerNote','fxSnapshot',
  'FX_VOL','chainKeyOf','live','ready','af','recording','playing','pause','metre','sub','bpm','pos','brace','braceRestore','seek','capStart','laneEditTouch',
  'songEnv','soloSnap','capNow','timSnap','timKnown','timByDef','timKey','timRecord']) ENV[n]=unwired(n);   // TIM3d: timRecord — a timbre's full record   // SAVE1: song settings, live snapshots, timbre ids and copies
const envWire=o=>{ for(const k in o){ if(!(k in ENV)) throw new Error('song/env: unknown entry '+k); ENV[k]=o[k]; } };
export { ENV, envWire };
