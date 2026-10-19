/* TIM3 (RUN 4): timbres as data — the proof that nothing changes. `timbreSnapshotAll()` reads, through the render copy, for EVERY timbre of
   every role: its table entry (the view the engine reads), the node-creation TRACE of one voice (each create* call of the note in order,
   with the node's static settings — oscillator wave and frequency, gain value, filter type / frequency / Q, curve length, delay time) and
   the RMS envelope of a short render of that one note (20-ms windows). `P.dumpTimbres()` writes it once on unchanged code →
   tools/timbres.before.json; the row «TIM3 timbres = before» compares entries and traces EXACTLY and envelopes within 1e-5 of the peak
   window (renders repeat to 1–3 ULP only — the summand rule). */
import { row } from './rows.js';
import { gridFor } from '../live/record.js';
import { loop } from '../recorder.js';
import { VOICE_MODE_DEF } from '../state.js';
import { CHORD_GLIDE_TC, BASS_GLIDE_TC, LEAD_GLIDE_TC } from '../modules/timbres/stages.js';
import { TIMBRE_RECORDS, timbreLoadReport } from '../timbreload.js';

const FILE='tools/timbres.before.json', SEC=0.3, WIN=0.02;
const stat=n=>{ const o=[];
  if(n instanceof OscillatorNode) o.push(n.type, +n.frequency.value.toFixed(6), +n.detune.value.toFixed(6));
  else if(n instanceof BiquadFilterNode) o.push(n.type, +n.frequency.value.toFixed(6), +n.Q.value.toFixed(6), +n.gain.value.toFixed(6));
  else if(n instanceof GainNode) o.push(+n.gain.value.toFixed(9));
  else if(n instanceof WaveShaperNode) o.push(n.curve ? n.curve.length : 0);
  else if(n instanceof DelayNode) o.push(+n.delayTime.value.toFixed(9));
  else if(n instanceof ConstantSourceNode) o.push(+n.offset.value.toFixed(9));
  return o; };
async function oneTimbre(R, role, i, real, keepBuf, pre){   // pre(eng) — before the copy's start (RUN 8: «FULL untouched» turns Calm's path on as its CONTROL)
  return R.engineProbe(async(eng, ctx)=>{
    const log=ctx.__log; log.length=0; const T=0.01;
    if(role==='ld') eng.leadOn('tb:ld', 220, 0.6, i, 0, 1, undefined, undefined, T);
    else if(role==='ch') eng.chordOn('tb:ch', [220, 277.18, 329.63], 0.6, i, undefined, T);
    else if(role==='bs') eng.bassOn('tb:bs', 55, 0.6, i, 0, 0, undefined, undefined, T);
    else for(let r=0;r<6;r++) eng.drumHit(r, 0.8, i, undefined, T+r*0.04);
    const trace=log.map(([k,n])=>[k, ...stat(n)].join(' '));
    const b=await ctx.startRendering(), L=b.getChannelData(0), Rr=b.getChannelData(1), w=Math.round(WIN*b.sampleRate), env=[];
    for(let s=0;s+w<=L.length;s+=w){ let e=0; for(let j=s;j<s+w;j++) e+=L[j]*L[j]+Rr[j]*Rr[j]; env.push(Math.sqrt(e/(2*w))); }
    return { trace, env, buf: keepBuf ? [L.slice(), Rr.slice()] : null }; },
  { sec:SEC, real:!!real, pre, wrap(ctx){ const log=[]; ctx.__log=log;
      for(const name of Object.getOwnPropertyNames(BaseAudioContext.prototype)) if(/^create/.test(name) && typeof ctx[name]==='function'){
        const f=ctx[name].bind(ctx); Object.defineProperty(ctx, name, { configurable:true, value:(...a)=>{ const n=f(...a); log.push([name.slice(6), n]); return n; } }); } } });
}
export async function timbreSnapshotAll(){
  const R=await import('../render.js'), A=await import('../audio.js');
  const tables={ ld:A.LEAD_INSTR, ch:A.CHORD_INSTR, bs:A.BASS_INSTR, dr:A.DRUM_KITS }, out={ entries:{}, trace:{}, env:{} };
  for(const role of ['ld','ch','bs','dr']) for(let i=0;i<tables[role].length;i++){
    const e=tables[role][i]; if(!/^(solo|chord|bass|kit)\./.test(e.id)) continue;   // built-ins only (a session's own timbres are not part of «before»)
    out.entries[e.id]=JSON.parse(JSON.stringify(e));
    const r=await oneTimbre(R, role, i, role==='ld' && A.leadIsKs(i)); out.trace[e.id]=r.trace; out.env[e.id]=r.env.map(x=>+x.toPrecision(7)); }
  return out;
}
export async function dumpTimbres(){
  const s=await timbreSnapshotAll();
  return { meta:{ format:'handsong/timbre-snapshot', version:1, made:new Date().toISOString(), file:FILE, sec:SEC, win:WIN }, ...s };
}
export async function checkTimbresBefore(opt={}){
  const d=[]; let n=0; const miss=s=>d.push(s);
  let pin; try{ pin=await (await fetch(FILE, { cache:'no-store' })).json(); }
  catch(e){ return { cases:0, total:1, differences:[`no ${FILE} (${e&&e.message}) — P.dumpTimbres() on unchanged code makes it`] }; }
  const now=await timbreSnapshotAll(), ids=new Set([...Object.keys(pin.entries), ...Object.keys(now.entries)]);
  for(const id of ids){
    n++; if(JSON.stringify(pin.entries[id])!==JSON.stringify(now.entries[id])) miss(`${id}: the table entry differs — ${String(JSON.stringify(pin.entries[id])).slice(0,120)} → ${String(JSON.stringify(now.entries[id])).slice(0,120)}`);
    n++; const a=pin.trace[id]||[], b=now.trace[id]||[]; if(a.join('|')!==b.join('|')){ const k=a.findIndex((x,j)=>x!==b[j]); miss(`${id}: the creation trace differs at node ${k<0?a.length:k}: «${a[k<0?a.length:k]}» → «${b[k<0?a.length:k]}» (${a.length} → ${b.length} nodes)`); }
    n++; const E0=pin.env[id]||[], E1=now.env[id]||[], pk=Math.max(1e-12,...E0); let worst=0;
    for(let j=0;j<Math.max(E0.length,E1.length);j++) worst=Math.max(worst, Math.abs((E0[j]??NaN)-(E1[j]??NaN))/pk || (E0.length!==E1.length?Infinity:0));
    if(!(worst<=1e-5)) miss(`${id}: the render envelope differs by ${worst} of its peak window (limit 1e-5)`); }
  return { cases:n, total:d.length, differences:d };
}
/* TIM3a: the loader took every record of the bundle (none skipped, no emergency); each record's policies = its family's role values in the
   code today (user answer T3 — the app still reads the role): chords quantise 1 beat and glide CHORD_GLIDE_TC, bass ½ beat, BASS_GLIDE_TC,
   the default bass voice mode; CONTROL: a record with another quantise must be flagged by the same comparison */
const ROLE_POL={ solo:()=>({ voiceMode:VOICE_MODE_DEF.ld, glide:LEAD_GLIDE_TC, register:'solo', quant:gridFor('leadOn') }),
  chord:()=>({ voiceMode:null, glide:CHORD_GLIDE_TC, register:'chord', quant:gridFor('chOn') }),
  kit:()=>({ voiceMode:null, glide:null, register:null, quant: gridFor('drum')*(loop.sub||4)===1 ? 'sub' : gridFor('drum') }),   // TIM3c: drums quantise to 1/subdivision
  bass:()=>({ voiceMode:VOICE_MODE_DEF.bs, glide:BASS_GLIDE_TC, register:'bass', quant:gridFor('bassOn') }) };
const polDiff=r=>{ const want=ROLE_POL[r.family]&&ROLE_POL[r.family](); return want && JSON.stringify(r.policies)!==JSON.stringify(want) ? `${r.id}: policies ${JSON.stringify(r.policies)}, the role today ${JSON.stringify(want)}` : null; };
export function checkTimbreRecords(){
  const d=[]; let n=0; const miss=s=>d.push(s), R=timbreLoadReport();
  n+=3; if(R.error) miss('the bundle could not be read: '+R.error);
  if(R.skipped.length) miss('the loader skipped: '+R.skipped.join(' · '));
  if(R.emergency.length) miss('emergency records in use for: '+R.emergency.join(', '));
  for(const r of TIMBRE_RECORDS.filter(x=>/^(solo|chord|bass|kit)\./.test(x.id))){ n++; const p=polDiff(r); if(p) miss(p); }   // the built-ins (a person's own may differ)
  n++; { const r=JSON.parse(JSON.stringify(TIMBRE_RECORDS.find(x=>x.family==='bass'))); r.policies.quant=1; if(!polDiff(r)) miss('CONTROL: a bass record quantising 1 beat matched the role — the pin cannot fail'); }
  n++; if(!TIMBRE_RECORDS.every(r=>Object.isFrozen(r) && Object.isFrozen(r.recipe))) miss('a record is not deep-frozen (records are shared by the live engine and the render copy)');
  return { cases:n, total:d.length, differences:d };
}
row({ at:1001.65, name:'TIM3a timbre records loaded, policies = role', run:()=>checkTimbreRecords(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
row({ at:1001.7, name:'TIM3 timbres = before', run:()=>checkTimbresBefore(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences }) });
/* RUN 8 (the user: «Full exactly as before RUN 8»): row «FULL untouched» (P.all). In Full: (1) the live engine carries none of Calm's
   per-timbre settings (no strike caps, no Calm strike path, no low power); (2) the five struck solo timbres build and render EXACTLY as the
   RUN 7 print (tools/timbres.before.json: creation trace equal, envelope within 1e-5 of its peak window) — CONTROL: the same timbres with
   Calm's strike path on in the render copy must differ; (3) NO CAP: a dense Singing-bowl passage (32 strikes in 2.6 s) stops every one of
   its oscillators exactly once, at its own end — CONTROL: with Calm's caps (the profile's «voices») some are stopped a second time (faded). */
const STRUCK=['solo.firefly','solo.firefly-rich','solo.handpan','solo.singing-bowl','solo.kalimba'];
export async function checkFullUntouched(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s);
  try{
    const PR=await import('../profile.js'), A=await import('../audio.js'), R=await import('../render.js');
    if(PR.profileCurrent()!=='profile.full') return { cases:0, total:0, differences:[], notes:['not applicable: the app is not in Full'] };
    const E=A.engineCtx(); n++;
    if(E.calmLean || E.strikeCaps.size || E.lowPower) miss(`Full carries Calm's settings: Calm strikes ${E.calmLean}, caps ${E.strikeCaps.size}, low power ${E.lowPower}`);
    const pin=await (await fetch(FILE, { cache:'no-store' })).json(), voices=(PR.profileOf('profile.calm')||{}).voices||{};
    const cmp=async lean=>{ const out=[];
      for(const id of STRUCK){ const i=A.LEAD_INSTR.findIndex(x=>x.id===id); if(i<0){ out.push(id+': missing'); continue; }
        const r=await oneTimbre(R, 'ld', i, false, false, lean ? eng=>eng.setCalmStrikes(voices) : undefined), a=pin.trace[id]||[];
        if(a.join('|')!==r.trace.join('|')){ const k=a.findIndex((x,j)=>x!==r.trace[j]); out.push(`${id}: the creation trace differs at node ${k<0?a.length:k} (${a.length} → ${r.trace.length} nodes)`); continue; }
        const E0=pin.env[id]||[], pk=Math.max(1e-12, ...E0); let worst=0;
        for(let j=0;j<Math.max(E0.length,r.env.length);j++) worst=Math.max(worst, Math.abs((E0[j]??NaN)-(r.env[j]??NaN))/pk || (E0.length!==r.env.length?Infinity:0));
        if(!(worst<=1e-5)) out.push(`${id}: the render envelope differs by ${worst.toExponential(2)} of its peak window`); }
      return out; };
    const full=await cmp(false); n+=STRUCK.length; full.forEach(miss);
    const ctl=await cmp(true); n++; notes.push(`CONTROL with Calm's strike path: ${ctl.length} of ${STRUCK.length} differ`);
    if(ctl.length<STRUCK.length) miss(`CONTROL: Calm's strike path matched the RUN 7 print for ${STRUCK.length-ctl.length} timbre(s) — the comparison cannot fail`);
    /* no cap: count the stop() calls of every oscillator of a dense bowl passage (scheduled only — nothing needs rendering) */
    const stops=calm=>R.engineProbe(async(eng, ctx)=>{ if(calm) eng.setCalmStrikes(voices); eng.applyFx({}); const i=eng.LEAD_INSTR.findIndex(x=>x.id==='solo.singing-bowl');
        for(let k=0;k<32;k++){ const t=0.05+k*0.08, own='fu'+(k%4); eng.leadOn(own, 220*Math.pow(2,(k%5)/5), 1, i, undefined,undefined,undefined,undefined, t); eng.leadOff(own, undefined, t+0.3); }
        const L=ctx.__stops; return { oscs:L.length, early:L.filter(x=>x.n>1).length }; },
      { sec:0.1, wrap(ctx){ const log=[], f=ctx.createOscillator.bind(ctx); ctx.__stops=log;
          Object.defineProperty(ctx, 'createOscillator', { configurable:true, value:()=>{ const o=f(), rec={ n:0 }, s0=o.stop.bind(o); log.push(rec); o.stop=(...a)=>{ rec.n++; return s0(...a); }; return o; } }); } });
    const a=await stops(false), b=await stops(true); n+=2;
    notes.push(`a dense bowl passage: Full ${a.oscs} oscillators, ${a.early} stopped early; with Calm's caps ${b.early} of ${b.oscs}`);
    if(!(a.oscs>0 && a.early===0)) miss(`Full capped the bowl: ${a.early} of ${a.oscs} oscillators stopped early`);
    if(!(b.early>0)) miss('CONTROL: with Calm\'s caps no oscillator was stopped early — the no-cap check cannot fail');
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1001.75, name:'FULL untouched', run:()=>checkFullUntouched(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
