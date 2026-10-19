/* TIM3a (RUN 4) — THE TIMBRE RECORD and its validator. CORE: pure (rule #36), runs in node (data rows «TIM3 timbre records (core)»).
   A record `{ format:'handsong/timbre', version:1, id, family, engine, name, recipe, env, policies }` describes ONE timbre; its engine type
   (code, src/modules/timbres/) builds the sound from the recipe. Records are the source of truth (data/timbres/<id>.json, bundled into
   data/timbres.bundle.json by tools/timbre-bundle.mjs).
   ⛳ SAFETY (user answer T5): records will arrive from other people inside songs and packs, so EVERY value is bounded — levels and gains
   capped, cut-offs and frequencies in a safe range, a bounded number of partials, a per-voice node cap (the cost cap) — and anything out of
   bounds, unknown or too heavy is REFUSED with one line, never played. Today's built-in timbres sit well inside every bound. */
import { idSpace } from './registry.js';

export const TIMBRE_FORMAT='handsong/timbre', TIMBRE_VERSION=1;
export const TIMBRE_FAMILIES=Object.freeze(['solo','chord','bass','kit']);
export const WAVES=Object.freeze(['sine','square','sawtooth','triangle']);
/* the bounds (T5). lvl: a voice's output level (today's loudest: 0.45, Sub sine); gain: an oscillator's mix gain; cutMax: the highest
   cut-off a filter envelope may reach (lp · max(fo, 1 + fv)); nodesMax: Web Audio nodes per voice (the cost cap) */
export const TB=Object.freeze({ lvl:[0,0.5], gain:[0,1], ratio:[0.25,8], det:[-100,100], lp:[20,20000], att:[0.001,5], rel:[0.005,10],
  fo:[0.1,8], ft:[0.001,5], fv:[0,4], hj:[0,1], cutMax:24000, partials:8, pMult:[0.25,16], pGain:[0,1], pDecay:[0.01,10], pGainSum:2,
  glide:[0,1], quant:[0,4], nameMax:60, nodesMax:64,
  oscs:8, mult:[0.25,16], oscGainSum:2, Q:[0.0001,30], open:[1,8], fmRatio:[0.25,16], fmIndex:[0,20], tau:[0.001,5],
  kitVm:[0,2], kitD:[0.005,5], ksFb:[0.5,0.998], unit:[0,1], nl:[0,5], sympN:8, sympRatio:[0.25,8], sympQ:[0.1,100], sympGain:[0,0.5], bodyQ:[0.1,30], bodyDb:[-24,24],
  /* RUN 7: the modal and breath engines (Calm's sound pass) — modes / harmonics, soft-high lowpass, noise paths, own vibrato and breathing */
  mLvl:[0,2],   // the modal / breath output trim: decaying modes and band-pass formants lose level (a worst-case record peaks ≈ 0 dBFS pre-limiter)
  modes:16, mR:[0.25,24], mT60:[0.01,30], mAtt:[0.0005,0.2], dk:[0,1.5], vb:[0,2], softLp:[200,16000], nG:[0,1], nQ:[0.1,60], nT60:[0.001,1],
  nTrack:[0,1], jR:[0,0.02], jD:[0,0.5], jG:[0,0.5], harm:8, fmts:4, nOn:[1,8], vRate:[0.1,12], vCents:[0,50], vAmp:[0,0.3], vDelay:[0,3],
  vRise:[0.01,5], dCents:[0,20], dRate:[0.01,2], bRate:[0.01,2], bLvl:[0,0.5], bCut:[0,0.8], scoop:[-100,100], vbB:[0,1] });
/* TIM3b: checks of the solo engine types (recipes with optional parts) — each returns null or one line */
const chkNum=(path,v,b)=> inB(v,b) ? null : path+': '+JSON.stringify(v)+' outside '+b.join('…');
const onlyKeys=(path,o,keys)=>{ if(!plain(o)) return path+': an object'; for(const k of Object.keys(o)) if(!keys.includes(k)) return path+': unknown field «'+k+'»'; return null; };
function chkSubtractive(R){
  let p=onlyKeys('recipe',R,['oscs','filter','strike','hum']); if(p) return p;
  if(!Array.isArray(R.oscs) || !R.oscs.length || R.oscs.length>TB.oscs) return 'recipe.oscs: 1…'+TB.oscs+' oscillators';
  let sum=0;
  for(let i=0;i<R.oscs.length;i++){ const o=R.oscs[i], q='recipe.oscs['+i+']';
    if((p=onlyKeys(q,o,['wave','mult','gain','detune']))) return p;
    if(!WAVES.includes(o.wave)) return q+'.wave: '+JSON.stringify(o.wave);
    if((p=chkNum(q+'.mult',o.mult,TB.mult)) || (p=chkNum(q+'.gain',o.gain,TB.gain))) return p;
    if('detune' in o && (p=chkNum(q+'.detune',o.detune,TB.det))) return p;
    sum+=o.gain; }
  if(sum>TB.oscGainSum) return 'recipe.oscs: gains sum to '+sum+' (cap '+TB.oscGainSum+')';
  if('filter' in R){ if((p=onlyKeys('recipe.filter',R.filter,['freq','Q'])) || (p=chkNum('recipe.filter.freq',R.filter.freq,TB.lp))) return p;
    if('Q' in R.filter && (p=chkNum('recipe.filter.Q',R.filter.Q,TB.Q))) return p; }
  if('strike' in R){ if(!('filter' in R)) return 'recipe.strike: needs a filter';
    if((p=onlyKeys('recipe.strike',R.strike,['open','tc','fv'])) || (p=chkNum('recipe.strike.open',R.strike.open,TB.open)) || (p=chkNum('recipe.strike.tc',R.strike.tc,TB.tau)) || (p=chkNum('recipe.strike.fv',R.strike.fv,TB.fv))) return p;
    const top=R.filter.freq*Math.max(R.strike.open, 1+R.strike.fv); if(top>TB.cutMax) return 'recipe.strike: the filter envelope reaches '+Math.round(top)+' Hz (cap '+TB.cutMax+')'; }
  if('hum' in R && R.hum!==0) return 'recipe.hum: 0 or absent';
  return null;
}
function chkFm2(R){
  let p=onlyKeys('recipe',R,['ratio','peak','sus','tau','fixed']); if(p) return p;
  if((p=chkNum('recipe.ratio',R.ratio,TB.fmRatio)) || (p=chkNum('recipe.sus',R.sus,TB.fmIndex))) return p;
  if(R.fixed!==undefined && R.fixed!==true) return 'recipe.fixed: true or absent';
  if(R.fixed) return ('peak' in R || 'tau' in R) ? 'recipe: a fixed index has no peak or tau' : null;
  return chkNum('recipe.peak',R.peak,TB.fmIndex) || chkNum('recipe.tau',R.tau,TB.tau);
}
function chkKs(R){
  let p=onlyKeys('recipe',R,['fb','damp','exBase','exSpan','nl','symp','body']); if(p) return p;
  for(const [k,b] of [['fb',TB.ksFb],['damp',TB.unit],['exBase',TB.unit],['exSpan',TB.unit],['nl',TB.nl]]) if(k in R && (p=chkNum('recipe.'+k,R[k],b))) return p;
  if('symp' in R){ const S=R.symp; if((p=onlyKeys('recipe.symp',S,['ratios','Q','gain']))) return p;
    if(!Array.isArray(S.ratios) || !S.ratios.length || S.ratios.length>TB.sympN) return 'recipe.symp.ratios: 1…'+TB.sympN;
    for(let i=0;i<S.ratios.length;i++) if((p=chkNum('recipe.symp.ratios['+i+']',S.ratios[i],TB.sympRatio))) return p;
    if((p=chkNum('recipe.symp.Q',S.Q,TB.sympQ)) || (p=chkNum('recipe.symp.gain',S.gain,TB.sympGain))) return p; }
  if('body' in R){ const B=R.body; if((p=onlyKeys('recipe.body',B,['hz','Q','db'])) || (p=chkNum('recipe.body.hz',B.hz,TB.lp)) || (p=chkNum('recipe.body.Q',B.Q,TB.bodyQ)) || (p=chkNum('recipe.body.db',B.db,TB.bodyDb))) return p; }
  return null;
}
/* RUN 7: the MODAL engine (struck bodies) and the BREATH engine (breathing sustained sounds) — every field bounded (T5) */
const chkPart=(path,o,spec)=>{ let p=onlyKeys(path,o,Object.keys(spec)); if(p) return p;
  for(const [k,[b,req]] of Object.entries(spec)){ if(!(k in o)){ if(req) return path+'.'+k+': missing'; continue; }
    if(b==='wave'){ if(!WAVES.includes(o[k])) return path+'.'+k+': '+JSON.stringify(o[k]); continue; }
    if((p=chkNum(path+'.'+k,o[k],TB[b]))) return p; }
  return null; };
function chkModal(R){
  let p=onlyKeys('recipe',R,['modes','lvl','att','dk','vb','lp','noise','body','jit','hum']); if(p) return p;
  if(!Array.isArray(R.modes) || !R.modes.length || R.modes.length>TB.modes) return 'recipe.modes: 1…'+TB.modes+' modes';
  let sum=0;
  for(let i=0;i<R.modes.length;i++){ const m=R.modes[i]; if((p=chkPart('recipe.modes['+i+']',m,{ r:['mR',1], g:['gain',1], d:['mT60',1], a:['mAtt'], w:['wave'] }))) return p; sum+=m.g; }
  if(sum>TB.pGainSum) return 'recipe.modes: gains sum to '+sum+' (cap '+TB.pGainSum+')';
  if((p=chkPart('recipe',{ lvl:R.lvl, lp:R.lp, ...('att' in R?{ att:R.att }:{}), ...('dk' in R?{ dk:R.dk }:{}), ...('vb' in R?{ vb:R.vb }:{}) },{ lvl:['mLvl',1], lp:['softLp',1], att:['mAtt'], dk:['dk'], vb:['vb'] }))) return p;
  if('noise' in R && (p=chkPart('recipe.noise',R.noise,{ g:['nG',1], hz:['lp',1], q:['nQ',1], d:['nT60',1], t:['nTrack'] }))) return p;
  if('body' in R){ if(!('noise' in R)) return 'recipe.body: needs a noise strike';
    if((p=chkPart('recipe.body',R.body,{ hz:['lp',1], q:['nQ',1], g:['nG',1] }))) return p; }
  if('jit' in R && (p=chkPart('recipe.jit',R.jit,{ r:['jR'], d:['jD'], g:['jG'] }))) return p;
  if('hum' in R && R.hum!==0) return 'recipe.hum: 0 or absent';
  return null;
}
function chkBreath(R){
  let p=onlyKeys('recipe',R,['harm','lvl','lp','vb','body','formants','noise','air','chiff','vib','drift','scoop','breathe','hum']); if(p) return p;
  if(!Array.isArray(R.harm) || !R.harm.length || R.harm.length>TB.harm) return 'recipe.harm: 1…'+TB.harm+' harmonics';
  let sum=0;
  for(let i=0;i<R.harm.length;i++){ const h=R.harm[i]; if((p=chkPart('recipe.harm['+i+']',h,{ m:['mult',1], g:['gain',1], w:['wave'], dt:['det'] }))) return p; sum+=h.g; }
  if(sum>TB.oscGainSum) return 'recipe.harm: gains sum to '+sum+' (cap '+TB.oscGainSum+')';
  if((p=chkPart('recipe',{ lvl:R.lvl, lp:R.lp, ...('vb' in R?{ vb:R.vb }:{}), ...('scoop' in R?{ scoop:R.scoop }:{}) },{ lvl:['mLvl',1], lp:['softLp',1], vb:['vbB'], scoop:['scoop'] }))) return p;
  if('body' in R && (p=chkPart('recipe.body',R.body,{ hz:['lp',1], q:['bodyQ',1], db:['bodyDb',1] }))) return p;
  if('formants' in R){ if(!Array.isArray(R.formants) || !R.formants.length || R.formants.length>TB.fmts) return 'recipe.formants: 1…'+TB.fmts;
    for(let i=0;i<R.formants.length;i++) if((p=chkPart('recipe.formants['+i+']',R.formants[i],{ hz:['lp',1], q:['nQ',1], g:['gain',1] }))) return p; }
  if('noise' in R && (p=chkPart('recipe.noise',R.noise,{ g:['nG',1], q:['nQ',1], m:['mult',1], on:['nOn'] }))) return p;
  if('air' in R && (p=chkPart('recipe.air',R.air,{ g:['nG',1], hz:['lp',1], q:['nQ',1] }))) return p;
  if('chiff' in R && (p=chkPart('recipe.chiff',R.chiff,{ g:['nG',1], m:['mult',1], q:['nQ',1], d:['nT60',1] }))) return p;
  if('vib' in R && (p=chkPart('recipe.vib',R.vib,{ rate:['vRate',1], cents:['vCents',1], amp:['vAmp'], delay:['vDelay',1], rise:['vRise',1] }))) return p;
  if('drift' in R && (p=chkPart('recipe.drift',R.drift,{ cents:['dCents',1], rate:['dRate',1] }))) return p;
  if('breathe' in R && (p=chkPart('recipe.breathe',R.breathe,{ rate:['bRate',1], lvl:['bLvl',1], cut:['bCut',1] }))) return p;
  if(R.lp*(1+(R.breathe?R.breathe.cut:0))>TB.cutMax) return 'recipe.breathe: the cut-off reaches past '+TB.cutMax+' Hz';
  if('hum' in R && R.hum!==0) return 'recipe.hum: 0 or absent';
  return null;
}
/* TIM3c: a kit = six rows, each a named row synth (code — src/modules/timbres/drumkits.js) with its parameters (data) */
export const KIT_SYNTHS=Object.freeze({ kick:[], snare:[], clap:[], hat:[], tom:[], crash:[], dum:['f0','f1','d'], tek:['hp','f'], edge:['hp','g','d'],
  baya:['f0','f1','d'], na:['f','d'], tick:[], gong:['f','ratio','idx','d'], taiko:['f0','f1','d'], ka:[] });
const KIT_B={ f0:'lp', f1:'lp', f:'lp', hp:'lp', d:'kitD', g:'gain', ratio:'fmRatio', idx:'fmIndex' };
function chkDrumkit(R){
  let p=onlyKeys('recipe',R,['rows']); if(p) return p;
  if(!Array.isArray(R.rows) || R.rows.length!==6) return 'recipe.rows: exactly 6 rows';
  for(let i=0;i<6;i++){ const r=R.rows[i], q='recipe.rows['+i+']';
    if(!plain(r) || !KIT_SYNTHS[r.synth]) return q+'.synth: one of '+Object.keys(KIT_SYNTHS).join(', ');
    if((p=onlyKeys(q,r,['synth','vm',...KIT_SYNTHS[r.synth]]))) return p;
    if((p=chkNum(q+'.vm',r.vm,TB.kitVm))) return p;
    for(const k of KIT_SYNTHS[r.synth]) if((p=chkNum(q+'.'+k,r[k],TB[KIT_B[k]]))) return p; }
  return null;
}
/* engine types known to this app: their family, recipe fields in ORDER (the order of today's table entries — key order is kept by the
   views, song copies compare by text), and the nodes one voice costs */
const NUM=(k,b)=>({ k, t:'num', b }), WAV=k=>({ k, t:'wave' });
export const ENGINES=Object.freeze({
  chord2:{ family:'chord', fields:[WAV('t1'), WAV('t2'), NUM('ratio','ratio'), NUM('det','det'), NUM('m1','gain'), NUM('m2','gain'), NUM('lp','lp'), NUM('lvl','lvl'),
           NUM('fo','fo'), NUM('ft','ft'), NUM('fv','fv'), NUM('hj','hj')], nodes:()=>12 },
  tine:  { family:['chord','solo'], fields:[{ k:'partials', t:'partials' }, NUM('lvl','lvl')], nodes:r=>4+2*r.partials.length },   // C4a: also a solo bank («Firefly» solo)
  bass2: { family:'bass', fields:[WAV('t1'), WAV('t2'), NUM('det','det'), NUM('ratio','ratio'), NUM('lp','lp'), NUM('lvl','lvl'), NUM('fo','fo'), NUM('ft','ft'), NUM('fv','fv')],
           nodes:()=>12 },
  /* TIM3b — solo: oscillators (in CREATION order) through an optional lowpass with a filter strike; FM pair (index envelope, or a fixed
     index); Karplus–Strong string (worklet) with optional sympathetic strings and body */
  subtractive:{ family:'solo', check:chkSubtractive, nodes:r=>1+(r.filter?1:0)+2*r.oscs.length },
  fm2:        { family:'solo', check:chkFm2, nodes:()=>5 },
  ks:         { family:'solo', check:chkKs, nodes:r=>3+(r.body?1:0)+(r.symp?1+r.symp.ratios.length:0) },
  drumkit:    { family:'kit', check:chkDrumkit, nodes:()=>8 },   // TIM3c: the heaviest row synth today builds 7 nodes per hit
  /* RUN 7: modal = a struck body (per strike: 2 nodes a mode + the noise burst and body; static: sum, lowpass, gate); breath = harmonics,
     formants, three noise paths, own vibrato / drift / breathing (all built once per voice) */
  modal:      { family:'solo', check:chkModal, nodes:r=>3+2*r.modes.length+(r.noise?3:0)+(r.body?2:0) },
  breath:     { family:'solo', check:chkBreath, nodes:r=>6+2*r.harm.length+2*(r.formants?r.formants.length:0)+(r.vib?(r.vib.amp?3:2):0)+(r.drift?2:0)+(r.scoop?1:0)+(r.breathe?3:0)
                +((r.noise||r.air||r.chiff)?1:0)+(r.noise?2:0)+(r.air?2:0)+(r.chiff?2:0)+(r.body?1:0) },
});
/* the policies each family carries today (user answer T3: written into every record with today's role values; the app reads the role
   until stage 7; a probe pins record = role) */
export const POLICY_KEYS=Object.freeze(['voiceMode','glide','register','quant']);
const fin=x=>typeof x==='number' && Number.isFinite(x);
const inB=(x,[lo,hi])=>fin(x) && x>=lo && x<=hi;
const plain=o=>o!==null && typeof o==='object' && !Array.isArray(o) && Object.getPrototypeOf(o)===Object.prototype;
function nameProblem(nm){
  if(typeof nm==='string') return nm.trim() && nm.length<=TB.nameMax ? null : 'name: empty or longer than '+TB.nameMax;
  if(!plain(nm)) return 'name: a string or {lang: string}';
  const ks=Object.keys(nm); if(!ks.length) return 'name: no language';
  for(const k of ks){ if(!/^(default|[a-z]{2})$/.test(k)) return 'name: unknown key «'+k+'»'; const v=nm[k]; if(typeof v!=='string' || !v.trim() || v.length>TB.nameMax) return 'name.'+k+': empty or longer than '+TB.nameMax; }
  return null;
}
/* → null (valid) or ONE line saying what is wrong (the first problem found) */
export function checkTimbre(rec){
  if(!plain(rec)) return 'not a record';
  if(rec.format!==TIMBRE_FORMAT) return 'format: not «'+TIMBRE_FORMAT+'»';
  if(rec.version!==TIMBRE_VERSION) return rec.version>TIMBRE_VERSION ? 'version '+rec.version+': made by a newer Handsong' : 'version: not '+TIMBRE_VERSION;
  const allowed=['format','version','id','family','engine','name','recipe','env','policies','author','licence'];
  for(const k of Object.keys(rec)) if(!allowed.includes(k)) return 'unknown field «'+k+'»';
  const sp=idSpace(rec.id); if(!sp) return 'id: not a permanent id';
  if(!TIMBRE_FAMILIES.includes(rec.family)) return 'family: one of '+TIMBRE_FAMILIES.join(', ');
  if(sp==='builtin' && rec.id.split('.')[0]!==(rec.family==='kit'?'kit':rec.family)) return 'id: a built-in id starts with its family';
  const E=ENGINES[rec.engine]; if(!E) return 'engine: «'+rec.engine+'» unknown to this app';
  if(!(Array.isArray(E.family) ? E.family : [E.family]).includes(rec.family)) return 'engine: '+rec.engine+' is not a '+rec.family+' engine';
  const np=nameProblem(rec.name); if(np) return np;
  if(!plain(rec.recipe)) return 'recipe: missing';
  const R=rec.recipe;
  if(E.check){ const q=E.check(R); if(q) return q; }
  const keys= E.fields ? E.fields.map(f=>f.k) : Object.keys(R);
  for(const k of Object.keys(R)) if(!keys.includes(k)) return 'recipe: unknown field «'+k+'»';
  for(const f of E.fields||[]){ const v=R[f.k];
    if(f.t==='wave'){ if(!WAVES.includes(v)) return 'recipe.'+f.k+': a wave ('+WAVES.join(', ')+')'; continue; }
    if(f.t==='num'){ if(!inB(v, TB[f.b])) return 'recipe.'+f.k+': '+JSON.stringify(v)+' outside '+TB[f.b].join('…'); continue; }
    if(f.t==='partials'){
      if(!Array.isArray(v) || !v.length || v.length>TB.partials) return 'recipe.partials: 1…'+TB.partials+' partials';
      let sum=0;
      for(let i=0;i<v.length;i++){ const p=v[i];
        if(!Array.isArray(p) || p.length!==4) return 'recipe.partials['+i+']: [mult, gain, decay, wave]';
        if(!inB(p[0], TB.pMult)) return 'recipe.partials['+i+'] mult: '+JSON.stringify(p[0])+' outside '+TB.pMult.join('…');
        if(!inB(p[1], TB.pGain)) return 'recipe.partials['+i+'] gain: '+JSON.stringify(p[1])+' outside '+TB.pGain.join('…');
        if(!inB(p[2], TB.pDecay)) return 'recipe.partials['+i+'] decay: '+JSON.stringify(p[2])+' outside '+TB.pDecay.join('…');
        if(!WAVES.includes(p[3])) return 'recipe.partials['+i+'] wave: '+JSON.stringify(p[3]);
        sum+=p[1]; }
      if(sum>TB.pGainSum) return 'recipe.partials: gains sum to '+sum+' (cap '+TB.pGainSum+')';
    } }
  if('lp' in R && 'fo' in R && 'fv' in R && R.lp*Math.max(R.fo, 1+R.fv)>TB.cutMax) return 'recipe: the filter envelope reaches '+Math.round(R.lp*Math.max(R.fo,1+R.fv))+' Hz (cap '+TB.cutMax+')';
  const nodes=E.nodes(R); if(!(nodes<=TB.nodesMax)) return 'cost: '+nodes+' nodes per voice (cap '+TB.nodesMax+')';
  if(rec.family==='kit'){ if('env' in rec) return 'env: a kit has none'; }   // TIM3c: a hit has its own envelope
  else {
  if(!plain(rec.env) || Object.keys(rec.env).some(k=>k!=='att'&&k!=='rel')) return 'env: {att, rel}';
  if(!inB(rec.env.att, TB.att)) return 'env.att: '+JSON.stringify(rec.env.att)+' outside '+TB.att.join('…');
  if(!inB(rec.env.rel, TB.rel)) return 'env.rel: '+JSON.stringify(rec.env.rel)+' outside '+TB.rel.join('…'); }
  const P=rec.policies; if(!plain(P)) return 'policies: missing';
  for(const k of Object.keys(P)) if(!POLICY_KEYS.includes(k)) return 'policies: unknown field «'+k+'»';
  if(!(P.voiceMode===null || P.voiceMode==='poly' || P.voiceMode==='lead')) return 'policies.voiceMode: null, poly or lead';
  if(!(P.glide===null || inB(P.glide, TB.glide))) return 'policies.glide: null or seconds '+TB.glide.join('…');
  if(!(P.register===null || ['solo','chord','bass'].includes(P.register))) return 'policies.register: null, solo, chord or bass';
  if(!(P.quant==='sub' || inB(P.quant, TB.quant))) return 'policies.quant: beats '+TB.quant.join('…')+' or «sub»';
  if(rec.author!=null && (typeof rec.author!=='string' || rec.author.length>120)) return 'author: a short string';
  if(rec.licence!=null && (typeof rec.licence!=='string' || rec.licence.length>120)) return 'licence: a short string';
  return null;
}
/* the cost of one voice (nodes) — for the ENG2 passport later */
export const timbreNodes=rec=>{ const E=ENGINES[rec&&rec.engine]; return E ? E.nodes(rec.recipe) : NaN; };
/* the bundle the app loads (tools/timbre-bundle.mjs builds it from the files) */
export const BUNDLE_FORMAT='handsong/timbre-bundle', BUNDLE_VERSION=1;
/* the CONTROLS of the validator: one damage per bound — each must be refused with a line naming the field */
const dmg=(k,bad)=>r=>{ if(k in r.recipe){ r.recipe[k]=bad; return 'recipe.'+k; } r.recipe.lvl=2; return 'recipe.lvl'; };   // a field this engine lacks → damage lvl instead
export const TIMBRE_DAMAGES=Object.freeze([
  ['recipe.lvl', r=>{ r.recipe.lvl=0.9; }], ['recipe.m1', dmg('m1',1.5)], ['recipe.lp', dmg('lp',40000)], ['recipe.det', dmg('det',500)],
  ['recipe.ratio', dmg('ratio',64)], ['recipe.t1', dmg('t1','custom')],
  ['recipe: the filter envelope', r=>{ if('lp' in r.recipe){ r.recipe.lp=9000; r.recipe.fo=3; return 'recipe: the filter envelope'; } r.recipe.lvl=2; return 'recipe.lvl'; }],
  ['recipe: unknown field', r=>{ r.recipe.evil=1; }], ['env.att', r=>{ r.env.att=0; }], ['env.rel', r=>{ r.env.rel=60; }],
  ['policies.glide', r=>{ r.policies.glide=5; }], ['policies.quant', r=>{ r.policies.quant=-1; }], ['engine', r=>{ r.engine='wasm-unknown'; }],
  ['family', r=>{ r.family='drone'; }], ['id', r=>{ r.id='Bad Id'; }], ['name', r=>{ r.name='x'.repeat(200); }], ['version', r=>{ r.version=2; }],
  ['unknown field', r=>{ r.script='alert(1)'; }], ['NaN', r=>{ r.recipe.lvl=NaN; }],
]);
