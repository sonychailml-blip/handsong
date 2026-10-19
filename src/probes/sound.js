/* SND-F1: probes of the Calm prototype's sounds — the Firefly timbre, the Night forest room, our dynamics (Glue, safety Limiter).
   Rows register themselves (probes/rows.js). Deterministic offline renders except the two rows flagged realtime (live = offline needs a
   live capture; frozen = live needs R.live). Every row carries a CONTROL that must fail. */
import { row } from './rows.js';
import { forestIR, irNormScale, f32Hash, compGainDb, seeded, DYN_GLUE, DYN_LIMIT, DYN_MASTER, FOREST } from '../core/dsp.js';
import * as LIVE from '../audio.js';
import * as REC from '../recorder.js';
import { CUR, chordUnit } from '../scales.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* The prototype's note, verbatim (the reference the app's path is compared with); `tine` only for the CONTROL (a wrong partial ratio). */
function fireflyNote(ctx, out, f, vel, t, tine=4.2){
  const g=ctx.createGain(); g.gain.value=0.08+vel*0.16; g.connect(out);
  const part=(ratio, amp, decay, type)=>{
    const o=ctx.createOscillator(), pg=ctx.createGain();
    o.type=type; o.frequency.value=f*ratio;
    pg.gain.setValueAtTime(0,t);
    pg.gain.linearRampToValueAtTime(amp,t+0.006);
    pg.gain.exponentialRampToValueAtTime(0.0001,t+decay);
    o.connect(pg); pg.connect(g); o.start(t); o.stop(t+decay+0.05);
  };
  part(1,1.00,1.6,'triangle'); part(2,0.28,0.9,'sine'); part(tine,0.12,0.28,'sine');
}
const dynOpts=(mode,set,keep)=>({ numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[2], channelCount:2, channelCountMode:'explicit',
  channelInterpretation:'speakers', processorOptions:{ mode, keep:!!keep }, parameterData:{ ...set } });

/* ═══ SND-F1 Firefly identity (P.checkFirefly, quick and all; one 2-s render) ═══
   One note A4 at velocity 0.7 through the app's chord path (engine copy, chord timbre «Firefly», empty chain) vs the prototype's function
   in its own OfflineAudioContext: equal sample for sample after the chord bus level 0.28 (≤ FF_TOL of the peak; measured 1.4e-7, float
   rounding). The app's volume law is v² (rule #30's one curve), so velocity 0.7 = volume √((0.08 + 0.16·0.7)/0.24). Then in the LIVE engine:
   a strike for the live hands goes to the live chain, one for a track owner to the track chain (rule #31), and a stop before a strike
   begins cancels it. CONTROL: the reference with the tine partial at 4.3 instead of 4.2 must differ. */
const FF_TOL=1e-5, FF_BUS=0.28;
export async function checkFirefly(){
  const diff=[], miss=s=>diff.push(s); let cases=0;
  const R=await import('../render.js'), E=await import('../audio.js?render');
  const idx=E.CHORD_INSTR.findIndex(x=>x.strike==='firefly');
  cases++; if(idx<0){ miss('no chord timbre «Firefly» in the engine copy'); return { cases, total:diff.length, differences:diff }; }
  const T=0.05, F=440, VEL=0.7, vol=Math.sqrt((0.08+0.16*VEL)/E.CHORD_INSTR[idx].lvl);
  const app=await R.goldRender(e=>{ e.chordOn('ff',[F],vol,idx,null,T); e.chordOff('ff',0.5); }, 2.0);
  const ref=async tine=>{ const C=new OfflineAudioContext(2, app.L.length, app.rate); fireflyNote(C, C.destination, F, VEL, T, tine); return (await C.startRendering()).getChannelData(0); };
  const cmp=r=>{ let mx=0, pk=0; for(let i=0;i<r.length;i++){ mx=Math.max(mx, Math.abs(app.L[i]-FF_BUS*r[i])); pk=Math.max(pk, Math.abs(app.L[i])); } return pk>0 ? mx/pk : Infinity; };
  const e0=cmp(await ref(4.2)), e1=cmp(await ref(4.3));
  cases++; if(!(e0<=FF_TOL)) miss(`the app's Firefly differs from the prototype's note by ${e0.toExponential(2)} of the peak (limit ${FF_TOL})`);
  cases++; if(!app.L.every((v,i)=>v===app.R[i])) miss('the centred Firefly note is not identical in both channels');
  cases++; if(!(e1>FF_TOL)) miss(`CONTROL: a reference with the tine at 4.3 × f matched within ${e1.toExponential(2)} — the comparison cannot fail`);
  /* live engine: routes and cancel (strikes placed 0.4 s ahead and cancelled before they begin — nothing sounds) */
  const ac=LIVE.AC, L=REC.laneOrder().find(ly=>REC.laneRoleOf(ly)==='ch');
  if(!ac){ miss('audio is not started'); return { cases, total:diff.length, differences:diff }; }
  for(const [owner,want] of [['latch','live'], ...(L!=null ? [['loop:'+L,'track']] : [])]){
    const t=ac.currentTime+0.4; LIVE.chordOn(owner,[F],0.5,idx,null,t);
    const x=LIVE.ffInfo().filter(s=>s.owner===owner && Math.abs(s.t-t)<1e-9).pop();
    cases++; if(!x) miss(`a Firefly chord for «${owner}» made no strike`); else if(x.route!==want) miss(`a Firefly strike for «${owner}» went to the ${x.route} chain (rule #31: ${want})`);
    LIVE.chordOff(owner, ac.currentTime);
    const y=LIVE.ffInfo().filter(s=>Math.abs(s.t-t)<1e-9).pop();
    cases++; if(!y || !y.cancelled) miss(`stopping «${owner}» before its strike began did not cancel the strike`); }
  cases++; if(L==null) miss('no chord track in the song to check the track route — run await P.seed({replace:true})');
  return { cases, total:diff.length, differences:diff, notes:[`residual ${e0.toExponential(2)} of peak; control (tine 4.3) ${e1.toExponential(2)}`] };
}

/* ═══ SND-F1 Night forest IR (P.checkForest, quick and all) ═══
   The engine's room (live engine and render copy, at 44.1 and 48 kHz and the live rate) is EXACTLY the pure core's seeded IR × the
   spec's normalisation — no Math.random, the same at any rate and offline (frozen = live). The node row «SND-F1 Night forest IR (core)»
   pins the hashes and the envelope in node. SND-F1b: each Room length (Short 0.85 · Medium 1.7 · Long 3.4 s) the same way, and a render
   whose chain sets a room really plays that IR (the convolver's buffer length); a new module starts Medium. CONTROL: the copy's IR compared
   with the core at another rate must differ. */
export async function checkForest(){
  const diff=[], miss=s=>diff.push(s); let cases=0;
  const E=await import('../audio.js?render'), want=(rate,sec)=>{ const ch=forestIR(rate,sec), k=irNormScale(ch, rate); return ch.map(d=>d.map(x=>x*k)); };
  const same=(a,b)=>a.length===b.length && a.every((d,i)=>d.length===b[i].length && f32Hash([d])===f32Hash([b[i]]));
  for(const rate of [44100, 48000]){ cases++; if(!same(E.forestData(rate), want(rate))) miss(`the render copy's Night forest IR at ${rate} Hz is not the core's seeded IR`);
    for(const sec of FOREST.rooms){ cases++; if(!same(E.forestData(rate,sec), want(rate,sec))) miss(`the ${sec}-s room at ${rate} Hz is not the core's seeded IR`); } }
  { const R=await import('../render.js'), key=(await import('../state.js')).chainKeyOf('ch'), seen={};
    for(const [v01,sec] of [[null,FOREST.room],[0,0.85],[0.5,1.7],[1,3.4]]){
      await R.goldRender(e=>{ const i=e.fxInstance(key,'forest'); seen[v01]=[i.room(), i.conv.buffer.length]; }, 0.05, { [key]:{ ids:['forest'], set: v01==null ? {} : { 'forest:room':v01 } } });
      cases++; const [r,len]=seen[v01]||[]; if(r!==sec || len!==Math.round(48000*sec)) miss(`room ${v01==null?'(default)':v01}: the module plays ${r} s with a ${len}-frame IR, expected ${sec} s`); } }
  if(LIVE.AC){ const r=LIVE.AC.sampleRate; cases++; if(!same(LIVE.forestData(r), want(r))) miss(`the live engine's Night forest IR at ${r} Hz is not the core's seeded IR`); }
  cases++; if(same(E.forestData(44100), want(48000))) miss('CONTROL: the 44.1-kHz IR matched the 48-kHz one — the comparison cannot fail');
  cases++; if(same(E.forestData(48000,0.85), want(48000,1.7))) miss('CONTROL: the Short room matched the Medium one — the comparison cannot fail');
  return { cases, total:diff.length, differences:diff };
}

/* ═══ SND-F1 dynamics: curve, latency, ceiling (P.checkDynamics, quick and all; one offline render with the worklet) ═══
   Five channels of one OfflineAudioContext (48 kHz): 0 — Glue on a staircase of constant levels −40 … 0 dBFS (0.4 s each): the gain at the
   end of each step equals core/dsp.compGainDb (≤ DYN_TOL dB); 1 — Glue on an impulse: out on the SAME frame, nothing before; 2 — the
   Limiter on a hot signal (sine 2.0, a 3.0 burst, 4.0 impulses): never above its ceiling; a quiet sine afterwards passes untouched (exact);
   an isolated impulse comes out on its own frame at the ceiling. CONTROLS: the curve with ratio 2 must miss; channel 3 = the Limiter
   switched off must exceed the ceiling; channel 4 = the built-in DynamicsCompressorNode on the impulse must fail the latency check.
   SND-F1b: channels 2–3 use the MASTER's limiter (hold 40 ms, release 150 ms); channel 5 = many chords + drums from the engine copy pushed
   12 dB hot through it — never above the ceiling; the live master path holds our limiter and no browser compressor, 0 ms of delay. */
const DYN_TOL=0.01;
export async function checkDynamics(){
  const diff=[], miss=s=>diff.push(s); let cases=0;
  const rate=48000, STEP=0.4, LV=[-40,-30,-24,-18,-14,-12,-9,-6,-3,0], N=Math.round(STEP*rate)*LV.length, IMP=4800;
  const C=new OfflineAudioContext(6, N, rate);
  try{ await C.audioWorklet.addModule('src/engine/worklets/dyn-worklet.js'); }catch(e){ miss('the dynamics worklet did not load offline: '+(e&&e.message)); return { cases, total:diff.length, differences:diff }; }
  const buf=fill=>{ const b=C.createBuffer(1,N,rate), d=b.getChannelData(0); fill(d); return b; };
  const stair=buf(d=>{ const w=Math.round(STEP*rate); LV.forEach((l,k)=>d.fill(Math.pow(10,l/20), k*w, (k+1)*w)); });
  const imp=buf(d=>{ d[IMP]=0.5; });
  const QS=Math.round(2.4*rate), HI=Math.round(3.0*rate);   // quiet section start; isolated impulse
  const hot=buf(d=>{ for(let i=0;i<rate;i++) d[i]=2.0*Math.sin(2*Math.PI*220*i/rate);
    for(let i=rate;i<rate+0.2*rate;i++) d[i]= (Math.floor(i/50)%2 ? 3 : -3);
    for(const p of [1.4,1.6,1.8]) d[Math.round(p*rate)]=4.0;
    for(let i=QS;i<QS+0.5*rate;i++) d[i]=0.3*Math.sin(2*Math.PI*330*i/rate);
    d[HI]=4.0; });
  const R=await import('../render.js');
  const mix=await R.goldRender(e=>{ for(let k=0;k<6;k++){ const t=0.05+k*0.5; e.chordOn('a'+k,[110,165,220,277,330],1,[0,2,9,15][k%4],null,t); e.chordOn('b'+k,[440,554,660],1,2,null,t+0.25);
    for(let r=0;r<6;r++) e.drumHit(r,1,k%5,undefined,t+r*0.08); e.chordOff('a'+k,t+0.45); e.chordOff('b'+k,t+0.5); } }, N/rate);
  const loud=buf(d=>{ for(let i=0;i<N;i++) d[i]=0.8*4*mix.L[i]; });   // the master gain 0.8, then 12 dB hotter
  const m=C.createChannelMerger(6); m.connect(C.destination);
  const chain=(b,node,ch)=>{ const s=C.createBufferSource(); s.buffer=b; s.connect(node); node.connect(m,0,ch); s.start(0); };
  chain(stair, new AudioWorkletNode(C,'dyn',dynOpts('comp',{ ...DYN_GLUE, on:1 })), 0);
  chain(imp,   new AudioWorkletNode(C,'dyn',dynOpts('comp',{ ...DYN_GLUE, on:1 })), 1);
  chain(hot,   new AudioWorkletNode(C,'dyn',dynOpts('limit',{ ...DYN_MASTER, on:1 })), 2);
  chain(hot,   new AudioWorkletNode(C,'dyn',dynOpts('limit',{ ...DYN_MASTER, on:0 })), 3);
  chain(imp,   C.createDynamicsCompressor(), 4);
  chain(loud,  new AudioWorkletNode(C,'dyn',dynOpts('limit',{ ...DYN_MASTER, on:1 })), 5);
  const B=await C.startRendering(), o=k=>B.getChannelData(k);
  /* the static curve */
  const w=Math.round(STEP*rate), meas=LV.map((l,k)=>20*Math.log10(o(0)[(k+1)*w-1]/Math.pow(10,l/20)));
  const off=p=>Math.max(...LV.map((l,k)=>Math.abs(meas[k]-compGainDb(l,p))));
  cases++; { const e=off(DYN_GLUE); if(!(e<=DYN_TOL)) miss(`Glue's steady gain misses its formula by ${e.toFixed(4)} dB (limit ${DYN_TOL}) — measured ${meas.map(x=>x.toFixed(2)).join(', ')}`); }
  cases++; { const e=off({ ...DYN_GLUE, ratio:2 }); if(!(e>DYN_TOL)) miss('CONTROL: the curve with ratio 2 also matched — the curve check cannot fail'); }
  /* zero lookahead */
  const lat=d=>{ let first=-1, mx=0, at=-1; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(first<0&&a>0) first=i; if(a>mx){ mx=a; at=i; } } return { first, at }; };
  cases++; { const l=lat(o(1)); if(l.first!==IMP || l.at!==IMP) miss(`Glue: an impulse at frame ${IMP} came out first at ${l.first}, loudest at ${l.at} — not zero latency`); }
  cases++; { const l=lat(o(4)); if(l.first===IMP && l.at===IMP) miss('CONTROL: the built-in compressor passed the zero-latency check — the check cannot fail'); }
  /* the ceiling */
  const c=Math.fround(Math.pow(10, DYN_MASTER.ceil/20)), pk=d=>d.reduce((a,x)=>Math.max(a,Math.abs(x)),0);
  cases++; { const p=pk(o(2)); if(!(p<=c)) miss(`the Limiter let ${p.toFixed(6)} through, above its ceiling ${c.toFixed(6)}`); }
  cases++; { const p=pk(o(3)); if(!(p>c)) miss(`CONTROL: the Limiter switched off stayed under the ceiling (${p.toFixed(4)}) — the hot signal is not hot`); }
  cases++; { const d=o(2), h=hot.getChannelData(0); let bad=-1; for(let i=QS+Math.round(0.1*rate);i<QS+0.5*rate;i++) if(d[i]!==h[i]){ bad=i; break; }
    if(bad>=0) miss(`below the ceiling the Limiter changed the signal (frame ${bad}: ${d[bad]} vs ${h[bad]}) — it must be exact identity there`); }
  cases++; { const d=o(2); if(!(Math.abs(d[HI])===c && d[HI-1]===0)) miss(`the Limiter: an isolated 4.0 impulse came out as ${d[HI]} (frame before: ${d[HI-1]}) — expected exactly the ceiling on the same frame`); }
  cases++; { const inPk=pk(loud.getChannelData(0)), p=pk(o(5)); if(!(inPk>1 && p<=c)) miss(`chords + drums pushed to ${(20*Math.log10(inPk)).toFixed(1)} dBFS came out at ${(20*Math.log10(p)).toFixed(2)} dBFS (ceiling ${DYN_MASTER.ceil})`); }
  if(LIVE.AC){ const md=LIVE.masterDyn(); cases++;
    if(JSON.stringify(md.path)!==JSON.stringify(['glue','gain','limit']) || md.delayMs!==0) miss(`the live master path is ${md.path.join(' → ')} with ${md.delayMs} ms of delay — expected Glue → makeup → our limiter, 0 ms`); }
  return { cases, total:diff.length, differences:diff, notes:[`steady gains ${meas.map(x=>x.toFixed(2)).join(' ')} dB at ${LV.join(' ')} dBFS`] };
}

/* ═══ SND-F1b master path, live (P.checkMasterPath, P.all only; REALTIME ≈ 1 s) ═══
   A −50 dBFS impulse into the live master, captured on the audio thread at the master's input and at the node that feeds the speakers:
   the same frame (our path adds no delay). CONTROL: a browser DynamicsCompressorNode (the old limiter's settings) on the same master,
   captured beside them, must come out later (it did by 288 frames at 48 kHz). Only a live capture shows the live graph's own delay. */
export async function checkMasterPath(){
  const diff=[], miss=s=>diff.push(s); let cases=0;
  const ac=LIVE.AC; if(!ac){ miss('audio is not started'); return { cases, total:diff.length, differences:diff }; }
  try{ await LIVE.probeCaptureReady(); }catch(e){ miss('the capture worklet did not load'); return { cases, total:diff.length, differences:diff }; }
  const { master, out }=LIVE.masterProbeNodes(), sr=ac.sampleRate;
  const dcn=ac.createDynamicsCompressor(); dcn.threshold.value=-6; dcn.knee.value=6; dcn.ratio.value=20; dcn.attack.value=0.010; dcn.release.value=0.25;
  const z=ac.createGain(); z.gain.value=0; z.connect(ac.destination);
  const Fs=Math.ceil((ac.currentTime+0.5)*sr/128)*128, want=Fs-Math.floor(ac.currentTime*sr)+Math.round(0.2*sr);
  const cap=src=>{ const n=new AudioWorkletNode(ac,'probe-cap',{ numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1], channelCount:2, channelCountMode:'explicit', processorOptions:{ want } });
    const p=new Promise((res,rej)=>{ n.port.onmessage=e=>res(e.data||{}); setTimeout(()=>rej(new Error('the live capture did not finish')), (want/sr+3)*1000); });
    src.connect(n); n.connect(z); return { n, p }; };
  master.connect(dcn);
  const A=cap(master), B=cap(out), D=cap(dcn);
  const bus=LIVE.makeFrozenBus(), b=ac.createBuffer(1,256,sr); b.getChannelData(0)[0]=Math.pow(10,-50/20);
  const s=ac.createBufferSource(); s.buffer=b; s.connect(bus); s.start(Fs/sr);
  const late=ac.currentTime*sr>=Fs;
  let r; try{ r=await Promise.all([A.p,B.p,D.p]); }catch(e){ miss(e.message); }
  finally{ try{ master.disconnect(dcn); }catch(e){} for(const x of [A,B,D]) try{ x.n.disconnect(); }catch(e){} try{ bus.disconnect(); z.disconnect(); }catch(e){} }
  if(!r) return { cases, total:diff.length, differences:diff };
  if(late){ miss('the impulse was scheduled 0.5 s ahead and the main thread was still late — the machine is too busy for this real-time row'); return { cases, total:diff.length, differences:diff }; }
  const at=m=>{ let mx=0, k=-1; for(let i=0;i<m.L.length;i++){ const a=Math.abs(m.L[i]); if(a>mx){ mx=a; k=i; } } return k<0 ? NaN : m.F0+k; };
  const [fa,fb,fd]=r.map(at);
  cases++; if(r.some(m=>m.gaps)) miss('a live capture has gaps on the audio thread');
  cases++; if(fa!==Fs) miss(`the impulse reached the master at frame ${fa}, scheduled for ${Fs}`);
  cases++; if(fb!==fa) miss(`the master path delays the sound by ${fb-fa} frames (${((fb-fa)/sr*1000).toFixed(2)} ms) — expected 0`);
  cases++; if(!(fd-fa>0)) miss(`CONTROL: the browser compressor came out after ${fd-fa} frames — the delay check cannot fail`);
  return { cases, total:diff.length, differences:diff, notes:[`master path ${fb-fa} frames; browser compressor ${fd-fa} frames = ${((fd-fa)/sr*1000).toFixed(2)} ms at ${sr} Hz`] };
}

/* ═══ SND-F1 dynamics live = offline (P.checkDynLive, P.all only; REALTIME ≈ 1 s) ═══
   The same deterministic test signal through a fresh Glue node in the LIVE AudioContext (captured on the audio thread, probe-cap worklet)
   and in an OfflineAudioContext: equal sample for sample (≤ LIVE_TOL of the peak) — only a live capture can show that the live context
   processes the worklet like the offline one. The source starts on a whole render quantum in both (scheduled 0.5 s ahead; a late start is
   reported as such), so the frames line up exactly. CONTROL:
   the offline run with makeup +0.5 dB must differ. */
const LIVE_TOL=1e-6;
export async function checkDynLive(){
  const diff=[], miss=s=>diff.push(s); let cases=0;
  const ac=LIVE.AC; if(!ac){ miss('audio is not started'); return { cases, total:diff.length, differences:diff }; }
  if(!LIVE.dynReady){ miss('the dynamics worklet is not loaded in the live context'); return { cases, total:diff.length, differences:diff }; }
  try{ await LIVE.probeCaptureReady(); }catch(e){ miss('the capture worklet did not load: '+(e&&e.message)); return { cases, total:diff.length, differences:diff }; }
  const sr=ac.sampleRate, len=Math.round(0.6*sr), r=seeded(0x5EED);
  const sig=new Float32Array(len); for(let i=0;i<len;i++){ const env=Math.exp(-3*i/len); sig[i]=env*(0.7*(r()*2-1)+0.4*Math.sin(2*Math.PI*180*i/sr)); }
  const play=(ctx,node,at)=>{ const b=ctx.createBuffer(1,len,sr); b.copyToChannel(sig,0); const s=ctx.createBufferSource(); s.buffer=b; s.connect(node); s.start(at); };
  const offline=async set=>{ const C=new OfflineAudioContext(2, len+2560, sr); await C.audioWorklet.addModule('src/engine/worklets/dyn-worklet.js');
    const n=new AudioWorkletNode(C,'dyn',dynOpts('comp',set)); n.connect(C.destination); play(C,n,1280/sr); return (await C.startRendering()).getChannelData(0).slice(1280,1280+len); };
  const A=await offline({ ...DYN_GLUE, on:1 }), Actl=await offline({ ...DYN_GLUE, makeup:DYN_GLUE.makeup+0.5, on:1 });
  /* one live capture → the live window, or { why } (RUN 3: a capture that saw NO signal is named and retried once — under heavy load the
     capture has missed the node's output entirely, which read as a full-scale difference) */
  const silentOf=w=>{ let pk=0; for(const x of w) if(Math.abs(x)>pk) pk=Math.abs(x); return !(pk>1e-6); };   // NaN (outside the capture) counts as nothing
  const liveTry=async()=>{
    const n=new AudioWorkletNode(ac,'dyn',dynOpts('comp',{ ...DYN_GLUE, on:1 })), z=ac.createGain(); z.gain.value=0;
    const Fs=(Math.ceil((ac.currentTime+0.5)*sr/128))*128, want=Fs-Math.floor(ac.currentTime*sr)+len+8192;
    const cap=new AudioWorkletNode(ac,'probe-cap',{ numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1], channelCount:2, channelCountMode:'explicit', processorOptions:{ want } });
    const got=new Promise((res,rej)=>{ cap.port.onmessage=e=>res(e.data||{}); setTimeout(()=>rej(new Error('the live capture did not finish')), (want/sr+3)*1000); });
    n.connect(cap); cap.connect(z); z.connect(ac.destination); play(ac,n,Fs/sr);
    const late=ac.currentTime*sr>=Fs;   // the main thread stalled past the planned start: the frames would not line up — say so, not «differ»
    let m; try{ m=await got; } catch(e){ return { why:e.message }; }
    finally{ try{ n.disconnect(); cap.disconnect(); z.disconnect(); }catch(e){} }
    if(m.gaps) return { why:`the live capture has ${m.gaps} gap(s) on the audio thread` };
    if(late) return { why:'the live start was scheduled 0.5 s ahead and the main thread was still late — the machine is too busy for this real-time row' };
    const live=new Float32Array(len); for(let i=0;i<len;i++){ const j=Fs+i-m.F0; live[i]= j>=0&&j<m.L.length ? m.L[j] : NaN; }
    if(silentOf(live)) return { why:'the live capture saw no signal (silence or nothing in the window)', silent:true };
    return { live };
  };
  cases++; if(!silentOf(new Float32Array(64)) || silentOf(sig)) miss('CONTROL: the silence test does not tell silence from the test signal');
  let T=await liveTry(), retried=false;
  if(T.silent){ retried=true; T=await liveTry(); }
  cases++;
  if(!T.live){ miss(T.why+(retried?' — twice (one retry)':'')); return { cases, total:diff.length, differences:diff }; }
  const live=T.live;
  const cmp=X=>{ let mx=0, pk=0; for(let i=0;i<len;i++){ mx=Math.max(mx, Math.abs(live[i]-X[i])); pk=Math.max(pk, Math.abs(X[i])); } return pk>0&&Number.isFinite(mx) ? mx/pk : Infinity; };
  const e0=cmp(A), e1=cmp(Actl);
  cases++; if(!(e0<=LIVE_TOL)) miss(`Glue live vs offline differ by ${e0.toExponential(2)} of the peak (limit ${LIVE_TOL})`);
  cases++; if(!(e1>LIVE_TOL)) miss('CONTROL: an offline run with +0.5 dB makeup matched the live one — the comparison cannot fail');
  return { cases, total:diff.length, differences:diff, notes:[`live vs offline ${e0.toExponential(2)} of peak (control ${e1.toExponential(2)})${retried?' · the first capture saw no signal — retried once':''}`] };
}

/* ═══ SND-F1 freeze parity: Firefly + Night forest + Glue (P.checkFreezeParity, P.all only; REALTIME ≈ 8 s) ═══
   A temporary Firefly chord track at the song's end, its OWN chain extended in the editor by Night forest and Glue (the live chain is not
   touched — rule #31). Played by the live engine (R.live, captured) and rendered as a freeze would (renderTrack — loads the dynamics worklet
   because the chain holds Glue): onset-aligned energy of the strike (0–0.4 s), the body (0.6–1.4 s) and the room's tail (1.6–3.0 s) agree
   within FP_TOL dB each (LR1's tolerance), after one warm-up play. The live capture taps the master AFTER its gain (0.8 at level 100) and a render at gain 1: the
   live energies are corrected by the master gain read from the engine. CONTROL: the dry render (no chain at all) must miss the tail.
   (renderTrack's `only` is not used: it gates first, then the value replay builds the other effects open.) */
const FP_TOL=1.0;
function fpMeasure(L,R,rate){
  const n=Math.min(L.length,R.length), x=new Float32Array(n); let pk=0;
  for(let i=0;i<n;i++){ const v=0.5*(L[i]+R[i]); x[i]=v; pk=Math.max(pk,Math.abs(v)); }
  if(!(pk>0)) return { why:'silent' };
  let on=-1; for(let i=0;i<n;i++) if(Math.abs(x[i])>0.05*pk){ on=i; break; }
  const E=(a,b)=>{ const i0=on+Math.round(a*rate), i1=Math.min(n,on+Math.round(b*rate)); if(i1-i0<rate*0.1) return NaN; let s=0; for(let i=i0;i<i1;i++) s+=x[i]*x[i]; return 10*Math.log10(s/(i1-i0)+1e-30); };
  return { strike:E(0,0.4), body:E(0.6,1.4), tail:E(1.6,3.0) };
}
export async function checkFreezeParity(o={}){   // o.room: a Night forest room v01 (0 Short · 0.5 Medium · 1 Long; default = the module's Medium)
  const diff=[], miss=s=>diff.push(s); let cases=0, notes=[];
  const R=await import('../render.js'), E=LIVE;
  if(!E.AC){ miss('audio is not started'); return { cases, total:diff.length, differences:diff }; }
  if(REC.loop.on||REC.recording||REC.editIsOpen()){ miss('stop the transport and close the editor first'); return { cases, total:diff.length, differences:diff }; }
  try{ await E.probeCaptureReady(); }catch(e){ miss('the capture worklet did not load'); return { cases, total:diff.length, differences:diff }; }
  const idx=E.CHORD_INSTR.findIndex(x=>x.strike==='firefly'), made=[];
  try{
    const T=Math.ceil(REC.songBeats())+8, spb=60/REC.loop.bpm, beats=Math.max(1,Math.round(1.0/spb));
    const steps=ty=>[{fn:'chOn',a:{deg:0,oct:1,vol:0.9,inst:idx,ty},t:T,id:1},{fn:'chOff',a:{},t:T+beats,id:1}];
    let r=REC.seedTake(steps(null)); if(!r||!r.layers.length){ miss('the temporary Firefly track could not be recorded'); return { cases, total:diff.length, differences:diff }; }
    let ly=r.layers[0], on=REC.events.find(e=>e.layer===ly&&e.fn==='chOn'); made.push(ly);
    if(!on || !REC.evHz(on.a,on,'ch').length){ REC.laneDelTap(ly); REC.laneDelTap(ly); made.pop();
      r=REC.seedTake(steps(chordUnit(CUR()))); ly=r.layers[0]; made.push(ly); }
    REC.editOpen(ly); const okF=REC.autChainAdd(ly,'forest'), okG=REC.autChainAdd(ly,'glue');
    if(o.room!=null) REC.autAddPoint(ly,'forest','room',T,o.room);
    REC.editClose();
    cases++; if(!okF||!okG || !REC.autChainOf(ly).includes('forest') || !REC.autChainOf(ly).includes('glue')) { miss(`the track's chain did not take Night forest and Glue (${REC.autChainOf(ly).join(', ')})`); return { cases, total:diff.length, differences:diff }; }
    if(R.live(ly)){ await sleep(1500); } R.stop(); await sleep(300);   // warm-up: the track chain's new effects fade in on first use (≈ 0.6 dB measured)
    const gM=E.masterMeter().gain, gDb=20*Math.log10(gM);   // the live master gain inside the capture
    const capP=E.probeCapture(0.4+beats*spb+3.6);
    if(!R.live(ly)){ miss('R.live refused the temporary track'); return { cases, total:diff.length, differences:diff }; }
    const cap=await capP; R.stop();
    cases++; if(cap.gaps){ miss(`the live capture has ${cap.gaps} gap(s)`); return { cases, total:diff.length, differences:diff }; }
    const mL=fpMeasure(cap.L,cap.R,cap.rate); for(const k of ['strike','body','tail']) mL[k]-=gDb;
    const ch=b=>[b.getChannelData(0), b.numberOfChannels>1?b.getChannelData(1):b.getChannelData(0)];
    const rF=await R.renderTrack(ly,{ quiet:true }), mF=fpMeasure(...ch(rF.buf), rF.buf.sampleRate);
    cases++; if(!rF.dynLoaded) miss('the track render did not load the dynamics worklet although its chain holds Glue');
    const rC=await R.renderTrack(ly,{ quiet:true, dry:true }), mC=fpMeasure(...ch(rC.buf), rC.buf.sampleRate);
    for(const k of ['strike','body','tail']){ cases++; const d=mF[k]-mL[k];
      if(!(Math.abs(d)<=FP_TOL)) miss(`${k}: frozen ${mF[k].toFixed(2)} dB vs live ${mL[k].toFixed(2)} dB (Δ ${d.toFixed(2)}, limit ±${FP_TOL})`); }
    cases++; if(!(Math.abs(mC.tail-mL.tail)>FP_TOL)) miss(`CONTROL: a dry render matched the live tail (Δ ${(mC.tail-mL.tail).toFixed(2)} dB) — the tail check cannot fail`);
    notes.push(`live (÷ master ${gM.toFixed(3)}) ${['strike','body','tail'].map(k=>mL[k].toFixed(2)).join(' / ')} dB · frozen ${['strike','body','tail'].map(k=>mF[k].toFixed(2)).join(' / ')} · dry tail ${mC.tail.toFixed(2)}`);
  } catch(err){ miss('failed: '+(err&&err.stack||err)); }
  finally{ R.stop(); for(const ly of made.slice().reverse()){ REC.laneDelTap(ly); REC.laneDelTap(ly); } }
  return { cases, total:diff.length, differences:diff, notes };
}

/* TIM1: permanent timbre ids — the pinned list below IS the contract (an id is never renamed or reused: a change here must be a decision,
   not a refactor). Every role: ids valid built-in ids, unique across roles, family prefix, table order = picker order, id ↔ index both
   ways; a hidden timbre leaves the picker but stays readable (songs still play), show brings it back. CONTROL: a renamed id is caught. */
const TIMBRE_IDS_PINNED={
  ld:['solo.supersaw','solo.organ','solo.pad','solo.bell','solo.flute','solo.8-bit','solo.bell-deep','solo.metallophone','solo.warm-pad','solo.glass-pad','solo.oud','solo.plucked-string','solo.airy-flute','solo.reed','solo.organ-full','solo.organ-soft','solo.string','solo.sitar','solo.oud-string','solo.koto','solo.santur','solo.guitar','solo.pizzicato','solo.firefly',
      'solo.firefly-rich','solo.handpan','solo.singing-bowl','solo.kalimba','solo.breath-flute','solo.breath-pad'],   // RUN 7: the Calm sound pass
  ch:['chord.warm-pad','chord.glass-pad','chord.organ','chord.e-piano','chord.warm-pad-long','chord.glass-pad-long','chord.oud','chord.plucked-string','chord.flute','chord.reed','chord.organ-full','chord.organ-soft','chord.warm-pad-clean','chord.glass-pad-clean','chord.strings','chord.plucked','chord.firefly'],
  bs:['bass.sub-sine','bass.saw','bass.acid','bass.synth','bass.upright','bass.synth-soft','bass.organ'],
  dr:['kit.standard','kit.darbuka','kit.tabla','kit.gamelan','kit.taiko'] };
export function checkTimbreIds(){
  const diff=[]; let cases=0; const miss=m=>diff.push(m);
  const IDR_OK=/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/, FAM={ ld:'solo.', ch:'chord.', bs:'bass.', dr:'kit.' }, seen=new Set();
  const lists=r=>LIVE.timbresOf(r).map(x=>x.id);
  for(const r of ['ld','ch','bs','dr']){
    const T=LIVE.timbresOf(r), P=TIMBRE_IDS_PINNED[r];
    cases++; if(JSON.stringify(T.map(x=>x.id))!==JSON.stringify(P)) miss(`${r}: ids differ from the pinned list — ${T.map(x=>x.id).join(',')}`);
    T.forEach((x,i)=>{ cases++;
      if(!IDR_OK.test(x.id) || x.id.slice(0,FAM[r].length)!==FAM[r]) miss(`${r} ${i}: «${x.id}» is not a ${FAM[r]}… built-in id`);
      if(seen.has(x.id)) miss(`«${x.id}» twice`); seen.add(x.id);
      if(x.idx!==i) miss(`${r} ${i}: picker order differs from table order (idx ${x.idx})`);
      if(LIVE.timbreIdOf(r,i)!==x.id) miss(`${r} ${i}: timbreIdOf → ${LIVE.timbreIdOf(r,i)}`);
      const b=LIVE.timbreById(x.id); if(!b || b.role!==r || b.idx!==i) miss(`${r} ${i}: timbreById(${x.id}) → ${JSON.stringify(b&&{role:b.role,idx:b.idx})}`); });
  }
  { const R=LIVE.timbreReg('ch'), id='chord.firefly'; cases++;
    try{ R.hide(id);
      if(lists('ch').includes(id)) miss('a hidden timbre is still offered by the picker');
      if(!LIVE.timbreById(id)) miss('a hidden timbre is no longer readable — songs that use it could not play');
      if(R.remove(id)===null) miss('a built-in timbre was removed');
    } finally { R.show(id); }
    if(!lists('ch').includes(id)) miss('show did not bring the timbre back'); }
  { cases++; const P=TIMBRE_IDS_PINNED.ch.slice(); P[16]='chord.firefly-2';   // CONTROL: a renamed id must not match the pinned list
    if(JSON.stringify(lists('ch'))===JSON.stringify(P)) miss('CONTROL: a renamed id matched the pinned list — the check cannot fail'); }
  return { cases, total:diff.length, differences:diff };
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
const rd=r=>({ cases:r.cases, diff:r.total, list:r.differences });
row({ at:405.5, name:'TIM1 permanent timbre ids', run:()=>checkTimbreIds(), read:rd });
row({ at:406, name:'SND-F1 Firefly identity', run:()=>checkFirefly(), read:rd });
row({ at:407, name:'SND-F1 Night forest IR', run:()=>checkForest(), read:rd });
row({ at:408, name:'SND-F1 dynamics: curve, latency, ceiling', run:()=>checkDynamics(), read:rd });
row({ at:408.5, name:'SND-F1b master path (live)', run:()=>checkMasterPath(), read:rd, slow:true, realtime:true });
row({ at:409, name:'SND-F1 dynamics live = offline', run:()=>checkDynLive(), read:rd, slow:true, realtime:true });
row({ at:409.5, name:'SND-F1 freeze parity (Firefly, Night forest, Glue)', run:()=>checkFreezeParity(), read:rd, slow:true, realtime:true });
