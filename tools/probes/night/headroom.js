/* NIGHT-1 stage 1: Night's sound headroom, dev only. Address: <page>?probe&headroom (tools/probes/night.js mounts it). Under tools/, so previews carry it and production doesn't.
   Two kinds of number. OFFLINE: render time of a fixed passage on the render copy of the engine, the best of a few runs, so what else the computer does matters little. REAL TIME: the
   «NIGHT stress» playing through the live app with a calibrated ballast on the audio thread, stepped until dropouts start: what's left of a quantum. Nothing here changes the live sound
   except while it plays its passages, and the what-ifs touch only the render copy. Nothing leaves the device unless the person copies the text (rule #33). */
import { AC, engineCtx, timbreIdOf, fxInstance } from '../../../core/audio.js';
import * as A from '../../../core/audio.js';
import * as ST from '../../../core/state.js';
import { profileApply, profileOf } from '../../../core/profile.js';
import { BUS } from '../../../core/pure/bus.js';
import { rectLayout, CUR } from '../../../core/scales.js';
import { TIMBRE_RECORDS } from '../../../core/timbreload.js';
import { video, startCamera, pumpDbg } from '../../../core/vision.js';
import { setBackground, sceneInfo, setSceneLevel, sceneLevel } from '../../../apps/night/scene/host.js';
import { latReport } from '../../../core/legacy-ui/latmeter.js';
import * as G from '../../../core/gestures.js';
import { pose } from '../../../core/gestures/pose.js';
import { liveAllOff } from '../../../core/recorder.js';
import { afPause } from '../../../core/frzqueue.js';
import * as C from './headroom-calc.js';
import { LEAN_PATH } from '../../../apps/night/shell.js';

const off=undefined, wait=ms=>new Promise(r=>setTimeout(r,ms));
const NIGHT=['solo.firefly','solo.breath-flute','solo.handpan','solo.singing-bowl'], REF='solo.supersaw', ALL=[...NIGHT,REF];
/* the «NIGHT stress» row's chain and passage, the same numbers */
const CHAIN={ 'ctone:mix':1, 'ctone:tilt':0.5, 'cwave:mix':1, 'cwave:amount':0.5, 'cecho:amount':0.6, 'cecho:time':0.8431089342012043, 'fdepth:mix':1, 'fdepth:depth':0.4, 'fdepth:room':0.5 };
const NCHAIN=['ctone','cwave','cecho','fdepth'], FCHAIN=['reverb','dly'], HIGH=[440,493.88,554.37,659.26,739.99], LOW=[220,246.94,277.18,329.63,369.99];
const P={ stress:{ notes:48, dt:0.08, hold:0.3, vol:1, owners:4, F:HIGH, win:[1,4], len:5.2 }, gentle:{ notes:16, dt:0.75, hold:0.45, vol:0.6, owners:2, F:LOW, win:[3,12], len:12.2 } };
const prof=()=>profileOf('profile.night')||{};

/* ------------- offline: one render of the engine copy, timed between two points ------------- */
let RENDER=null; const render=async()=>RENDER||(RENDER=await import('../../../core/render.js'));
/* setup(eng, E, add) builds and schedules; add(t, fn) runs fn at render time t, off the clock: live play creates a note's nodes just before it, and a whole passage created up front would leave
   every finished note in the graph. opt.win = the timed window, opt.segs = points of a time profile. → { ms, us, sec, stamps, t0, x (mono mix), out } */
async function once(setup, len, opt={}){
  const R=await render(), [a,b]=opt.win||[0,len], segs=opt.segs||null;
  return R.engineProbe(async(eng, ctx)=>{
    const rate=ctx.sampleRate, map=new Map(), st=[]; let work=0;
    const add=(t,fn,first)=>{ const q=Math.max(0,Math.floor(t*rate/128)); if(!map.has(q)) map.set(q,[]); if(first) map.get(q).unshift(fn); else map.get(q).push(fn); };
    const out=await setup(eng, eng.engineCtx(), add);
    for(const t of segs||[a,b]) if(t>0 && t<len) add(t,()=>{ st.push(performance.now()-work); },true);
    for(const [q,fns] of map){ if(q===0){ for(const fn of fns) fn(); continue; } ctx.suspend(q*128/rate).then(()=>{ const w0=performance.now(), w=work; for(const fn of fns) fn(); work=w+performance.now()-w0; ctx.resume(); }); }
    const t0=performance.now(); const buf=await ctx.startRendering(); const t1=performance.now()-work;
    const ms= segs ? t1-t0 : (a<=0 ? (st.length?st[st.length-1]:t1)-t0 : (st.length>=2 ? st[st.length-1]-st[0] : t1-t0)), sec=b-a;
    if(out&&out.finish) out.finish();
    const res={ ms, sec, rate, us:C.usPerQuantum(ms,sec,rate), stamps:st, t0, t1, out };
    if(opt.audio){ const L=buf.getChannelData(0), Rr=buf.getChannelData(buf.numberOfChannels>1?1:0), x=new Float32Array(L.length); for(let i=0;i<x.length;i++) x[i]=(L[i]+Rr[i])/2; res.x=x; }
    return res; }, { sec:len });
}
/* the best of `times` runs: the least disturbed */
async function best(setup, len, opt={}, times=3){ let b=null; for(let i=0;i<times;i++){ const r=await once(setup,len,opt); if(!b || r.us<b.us) b=r; } return b; }
function prep(eng, id, o={}){
  eng.offlineTapMaster();
  const key=ST.chainKeyOf('ld'), night=id!==REF, ids=o.dry ? [] : (o.ids || (night ? NCHAIN : FCHAIN)), set=o.dry||!night ? {} : Object.fromEntries(Object.entries({ ...CHAIN, ...(o.set||{}) }).filter(([k])=>ids.includes(k.split(':')[0])));
  for(const k of new Set(ST.chainOwners().map(x=>x.key))){ const c= k===key ? ids : []; for(const x of c) eng.fxInstance(k,x); eng.fxRenderPath(k,c,c); }
  for(const [a,v] of Object.entries(set)){ const [fx,p]=a.split(':'); eng.fxPlaySet(key,fx,p,v,0); }
  eng.setTimbreTrim(night ? prof().levels : null); eng.setNightStrikes(night ? (o.caps||prof().voices||{}) : null); eng.applyFx({});
  if(night && !o.old) eng.setLeanPath(LEAN_PATH);
  if(o.quietFloor!=null) eng.setPartialFloor(o.quietFloor);
  return eng.LEAD_INSTR.findIndex(x=>x.id===id);
}
/* the passage on the copy, each note created just before its time; after(s, t, k): a hook right after each attack. Counts ringing and sources at each attack, as the row does */
function passage(eng, E, i, id, X, after, add, each){
  const o={ ringMax:0, ringSum:0, srcMax:0, n:0, finish(){ o.voices=E.pool.ld.v.length; o.ringMean=C.round(o.ringSum/Math.max(1,o.n),2); delete o.ringSum; delete o.finish; } };
  for(let k=0;k<X.notes;k++){ const t=0.05+k*X.dt, own='h'+(k%X.owners);
    add(t-0.02,()=>{ eng.leadOn(own, X.F[k%X.F.length], X.vol, i, off,off,off,off, t); eng.leadOff(own, off, t+X.hold);
      const L=E.pool.ld.strikes.filter(s=>s.id===id && !s.faded && s.t<=t && s.end>t); o.ringMax=Math.max(o.ringMax,L.length); o.ringSum+=L.length; o.n++;
      o.srcMax=Math.max(o.srcMax, L.reduce((m,s)=>m+s.srcs.length,0));
      if(after){ const s=E.pool.ld.strikes.find(x=>x.t===t && x.id===id); if(s) after(s,t,k); }
      if(each) each(); }); }
  return o;
}
const row=(r,extra={})=>({ us:C.round(r.us,0), pct:C.round(C.loadPct(r.us,r.rate),1), ...extra });

/* 1. the shared parts with no note ringing */
export async function sharedParts(tell=()=>{}){
  const R=await render(), rate=AC.sampleRate, out={}, len=3.2, win=[1,3];
  const bare=async(build,times=3)=>{ let m=Infinity; for(let i=0;i<times;i++){ const ctx=new OfflineAudioContext(2, Math.round(rate*len), rate); await build(ctx); const st=[]; for(const t of win) ctx.suspend(t).then(()=>{ st.push(performance.now()); ctx.resume(); }); await ctx.startRendering(); m=Math.min(m, st[1]-st[0]); } return C.usPerQuantum(m,win[1]-win[0],rate); };
  const add=(k,us,note)=>{ out[k]={ us:C.round(us,0), pct:C.round(C.loadPct(us,rate),1), ...(note?{ note }:{}) }; tell(k); };
  add('empty context (the timing overhead)', await bare(()=>{}));
  for(const [tag,old] of [['old path',true],['lean path',false]]){
    { const r=await best((eng)=>{ prep(eng,NIGHT[0],{ dry:true, old }); },len,{ win }); add(`${tag}: engine start graph, silent (render copy)`, r.us, 'no chord pool, no limiter, no track heads here'); }
    { const r=await best((eng)=>{ prep(eng,NIGHT[0],{ old }); },len,{ win }); add(`${tag}: + Night chain, silent input`, r.us); }
    { const r=await best((eng,E)=>{ prep(eng,NIGHT[0],{ old }); eng.ambienceOn(true,0.5,0); eng.ambienceTick(len); },len,{ win }); add(`${tag}: + the forest ambience`, r.us); }
    { const r=await best((eng)=>{ prep(eng,NIGHT[0],{ dry:true, old }); eng.chordOn('hr',[220,262,330,392,494,587],0,0,null,0.01); eng.chordOff('hr',0.05); },len,{ win }); add(`${tag}: dry graph + 6 idle chord voices (the live pool)`, r.us, 'Night never plays a chord'); } }
  /* the master limiter, the real worklet on noise: the only worklet of the live path */
  { const noise=ctx=>{ const b=ctx.createBuffer(2,rate,rate); for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*0.3; } const s=ctx.createBufferSource(); s.buffer=b; s.loop=true; s.start(0); return s; };
    const u0=await bare(ctx=>{ noise(ctx).connect(ctx.destination); });
    const u1=await bare(async ctx=>{ await ctx.audioWorklet.addModule(new URL('../../../core/engine/worklets/dyn-worklet.js',import.meta.url).href); const n=new AudioWorkletNode(ctx,'dyn',{ numberOfOutputs:1, outputChannelCount:[2], processorOptions:{ mode:'limit', keep:true } }); noise(ctx).connect(n); n.connect(ctx.destination); });
    add('master limiter, on signal', u1-u0); }
  /* the rooms and effects by themselves, on the same noise */
  { const sig=ctx=>{ const b=ctx.createBuffer(1,rate,rate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*0.3; const s=ctx.createBufferSource(); s.buffer=b; s.loop=true; s.start(0); return s; };
    const u0=await bare(ctx=>{ sig(ctx).connect(ctx.destination); });
    const ir=(await import('../../../core/pure/dsp.js')).forestIR(rate,1.7);
    const uc=await bare(ctx=>{ const c=ctx.createConvolver(); c.normalize=false; const b=ctx.createBuffer(2,ir[0].length,rate); ir.forEach((d,i)=>b.copyToChannel(d,i)); c.buffer=b; sig(ctx).connect(c); c.connect(ctx.destination); });
    add('the forest room alone (convolution, 1.7 s), on signal', uc-u0, 'offline it does all the work on one thread; live its long part moves to a background thread');
    const us2=await bare(ctx=>{ const w=ctx.createWaveShaper(); w.curve=new Float32Array([-1,0,1]); w.oversample='2x'; sig(ctx).connect(w); w.connect(ctx.destination); });
    add('one waveshaper 2×, on signal', us2-u0, 'each voice has one; the wet branch is at zero in Night');
    const us4=await bare(ctx=>{ const w=ctx.createWaveShaper(); w.curve=new Float32Array([-1,0,1]); w.oversample='4x'; sig(ctx).connect(w); w.connect(ctx.destination); });
    add('one waveshaper 4×, on signal', us4-u0, 'the solo sum has a 2× and a 4× for the expression hand; Night has no expression hand'); }
  { const u=await bare(ctx=>{ const lp=ctx.createBiquadFilter(), g=ctx.createGain(), l=ctx.createOscillator(), lg=ctx.createGain(); g.gain.value=0; lp.frequency.value=520; l.frequency.value=0.06; lg.gain.value=260; l.connect(lg); lg.connect(lp.frequency); for(const hz of [110,165]){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=hz; o.connect(lp); o.start(0); } l.start(0); lp.connect(g); g.connect(ctx.destination); }); add('the idle backing drone (2 saws, filter, zero gain)', u, 'always running; Night uses its own ambience instead'); }
  /* what built banks keep costing when nothing plays: rule #3's price */
  for(const id of ['solo.breath-flute',REF]) for(const [tag,park] of [['old path',false],['parked',true]]){ const r=await best((eng,E,addT)=>{ const i=prep(eng,id,{ dry:true, old:true }); if(park) eng.setLeanPath({ park:true }); for(let k=0;k<4;k++){ eng.leadOn('b'+k,330,0.6,i,off,off,off,off,0.02); eng.leadOff('b'+k,off,0.05); } if(park) addT(0.95,()=>eng.leadParkTick(100)); },len,{ win }); add(`${tag}: dry graph + 4 voices with ${id} built, silent`, r.us, park?'out of the graph while silent':'gated, never stopped: they keep computing for the session'); }
  { const r=await best((eng)=>{ const i=prep(eng,'solo.singing-bowl',{ dry:true }); for(let k=0;k<4;k++){ eng.leadOn('b'+k,330,0.0001,i,off,off,off,off,0.02); eng.leadOff('b'+k,off,0.05); } },16,{ win:[14,15.5] },2); add('dry graph + 4 voices with the bowl built, after its tails', r.us, 'a struck bank costs nothing once its strikes stop'); }
  return out;
}
/* 2. one ringing note, then more */
export async function noteCost(sounds=ALL, tell=()=>{}){
  const len=1.2, win=[0.1,1.1], out={};
  for(const id of sounds){ const N=(prof().voices||{})[id]||4, mine=out[id]={};
    for(const [tag,old] of [['old',true],['lean',false]]){ if(tag==='lean' && id===REF) continue;
      const base=await best((eng)=>{ prep(eng,id,{ old }); },len,{ win });
      const one=await best((eng)=>{ const i=prep(eng,id,{ old }); eng.leadOn('n0',440,1,i,off,off,off,off,0.01); },len,{ win });
      const many=await best((eng)=>{ const i=prep(eng,id,{ old }); for(let k=0;k<N;k++) eng.leadOn('n'+k,HIGH[k%5]*(1+(k>>2)),1,i,off,off,off,off,0.01); },len,{ win });
      mine[tag]={ base:C.round(base.us,0), firstNote:C.round(one.us-base.us,0), N, atN:C.round(many.us,0), perExtraNote:C.round((many.us-one.us)/Math.max(1,N-1),0), pctAtN:C.round(C.loadPct(many.us,base.rate),1) }; }
    tell(id); }
  return out;
}
/* 3. the fixed passages */
export async function passages(sounds=ALL, tell=()=>{}, times=3){
  const out={};
  for(const id of sounds){ out[id]={}; for(const k of ['stress','gentle']){ const X=P[k];
      const r=await best((eng,E,add)=>passage(eng,E,prep(eng,id),id,X,null,add),X.len,{ win:X.win },times);
      out[id][k]=row(r,{ ...r.out });
      if(id!==REF){ const o=await best((eng,E,add)=>passage(eng,E,prep(eng,id,{ old:true }),id,X,null,add),X.len,{ win:X.win },times); out[id][k+'Old']=row(o); out[id][k].saved=C.round(100*(1-r.us/o.us),0); }
      tell(id+' '+k); } }
  return out;
}
/* 4. how long a tail is computed against how long it's heard */
export async function tails(sounds=ALL, tell=()=>{}){
  const out={};
  for(const id of sounds){ out[id]={}; for(const f of [220,440,880]){
      const len= /bowl/.test(id) ? 20 : 12;
      const r=await once((eng,E)=>{ const i=prep(eng,id,{ dry:true }); eng.leadOn('t',f,1,i,off,off,off,off,0.05); eng.leadOff('t',off,0.35); const s=E.pool.ld.strikes.find(x=>x.id===id); return { end:s?s.end-0.05:null, srcs:s?s.srcs.length:null }; },len,{ audio:true });
      const e=C.envelope(r.x,r.rate), peak=e.reduce((m,x)=>Math.max(m,x),0), T=C.tailTimes(e,0.05);
      out[id][f]={ peakDb:C.round(C.dB(peak),1), computedTo:r.out.end==null?'never stops':C.round(r.out.end,2), srcs:r.out.srcs, heardTo:T };
      /* partial by partial: stops against the −80 dBFS floor; k from the levels the code sets */
      const rec=timbreRec(id); if(rec && (rec.engine==='modal'||rec.engine==='tine')){ const trim=C.amp((prof().levels||{})[id]||0), k=(rec.recipe.lvl||0)*trim*0.22; const list=C.partials(rec,f,1,k,-80); out[id][f].partials=list; out[id][f].seconds=C.partialSeconds(list); out[id][f].seconds70=C.partialSeconds(C.partials(rec,f,1,k,-70)); }
    } tell(id); }
  return out;
}
function timbreRec(id){ return TIMBRE_RECORDS.find(r=>r.id===id)||null; }
/* 5. does a fading tail get slower near silence? cost per second of a tail, down to and past silence; the worklet control proves the method can see it */
export async function tailProfile(tell=()=>{}, opt={}){
  const out={ sounds:{} }, list=opt.sounds||['solo.firefly','solo.handpan','solo.singing-bowl'], len=opt.len||24, step=opt.step||2;
  const segs=[]; for(let t=step;t<len;t+=step) segs.push(t);
  const profile=async(id)=>{ let bestSeg=null; for(let i=0;i<2;i++){ const r=await once((eng)=>{ const k=prep(eng,id); eng.leadOn('t',440,1,k,off,off,off,off,0.05); eng.leadOff('t',off,0.35); },len,{ segs }); const d=r.stamps.map((x,j)=> x-(j? r.stamps[j-1]:r.t0)); bestSeg= bestSeg ? bestSeg.map((x,j)=>Math.min(x,d[j])) : d; } return bestSeg.map(ms=>C.round(C.usPerQuantum(ms,step,AC.sampleRate),0)); };
  for(const id of list){ out.sounds[id]={ stepS:step, usPerQuantum:await profile(id) }; tell(id); }
  { let bestSeg=null; for(let i=0;i<2;i++){ const r=await once((eng)=>{ prep(eng,list[0]); },len,{ segs }); const d=r.stamps.map((x,j)=> x-(j? r.stamps[j-1]:r.t0)); bestSeg= bestSeg ? bestSeg.map((x,j)=>Math.min(x,d[j])) : d; } out.noNote=bestSeg.map(ms=>C.round(C.usPerQuantum(ms,step,AC.sampleRate),0)); }
  /* the method can see subnormal numbers: the same arithmetic, ordinary and subnormal, in one offline context each */
  const rate=AC.sampleRate, ctl=async sub=>{ const ctx=new OfflineAudioContext(1,rate*2,rate); await ctx.audioWorklet.addModule(new URL('./headroom-worklet.js',import.meta.url).href); const n=new AudioWorkletNode(ctx,'hr-denorm',{ processorOptions:{ sub } }); let y=null; n.port.onmessage=e=>{ y=e.data.y; }; n.connect(ctx.destination); const t0=performance.now(); await ctx.startRendering(); const ms=performance.now()-t0; await wait(30); return { ms:C.round(ms,0), y }; };
  const a=await ctl(false), b=await ctl(true);
  out.control={ ordinaryMs:a.ms, subnormalMs:b.ms, ratio:C.round(b.ms/Math.max(1,a.ms),1), kept:b.y>0, reads: b.y>0 ? (b.ms>a.ms*1.5 ? 'subnormals are slow here and the method sees it' : 'subnormals cost nothing here') : 'this thread flushes subnormals to zero' };
  return out;
}
/* 6. what-ifs: the same passage on the render copy with one thing changed. Never the live engine. */
const stopInaudible=(rec,k,floorDb)=>(s,t,idx,f,vel)=>{ const list=C.partials(rec,f,vel,k,floorDb); list.forEach((p,j)=>{ const o=s.srcs[j]; if(o && p.audible<p.stop) try{ o.stop(t+p.audible*1.1); }catch(e){} }); };
export async function whatIfs(sounds, tell=()=>{}, opt={}){
  const out={}, X=P[opt.kind||'stress'], times=opt.times||2;
  for(const id of sounds){ const rec=timbreRec(id), trim=C.amp((prof().levels||{})[id]||0), k=(rec.recipe.lvl||0)*trim*0.22, struck=rec.engine==='modal'||rec.engine==='tine', o=out[id]={};
    const go=async(name, conf={})=>{ const r=await best((eng,E,add)=>{ const i=prep(eng,id,{ set:conf.set, caps:conf.caps, dry:conf.dry, ids:conf.ids, old:conf.old, quietFloor:conf.quietFloor });
        const hook=conf.floor!=null&&struck ? (()=>{ const fn=stopInaudible(rec,k,conf.floor); return (s,t,idx)=>fn(s,t,idx,X.F[idx%X.F.length],X.vol*X.vol); })() : null;
        if(conf.flute){ const fi=eng.LEAD_INSTR.findIndex(x=>x.id==='solo.breath-flute'); for(let q=0;q<4;q++){ eng.leadOn('b'+q,330,0.6,fi,off,off,off,off,0.005); eng.leadOff('b'+q,off,0.01); } add(0.9,()=>eng.leadParkTick(100)); }   // parks on the lean path, keeps computing on the old
        return passage(eng,E,i,id,X,hook,add); },X.len,{ win:X.win, audio:true },times);
      o[name]={ us:C.round(r.us,0), pct:C.round(C.loadPct(r.us,r.rate),1), voices:r.out.voices, ring:r.out.ringMax }; return r; };
    const base=await go('as now'), done=[]; const cmp=(name,r)=>{ done.push([name,r.us]); if(r.x){ o[name].residualDb=C.residualDb(base.x,r.x); o[name].worstDiffDb=C.worst(base.x,r.x); } r.x=null; };
    cmp('the old path', await go('the old path',{ old:true }));
    if(struck) cmp('quiet floor −70 dBFS', await go('quiet floor −70 dBFS',{ quietFloor:-70 }));
    if(opt.lite){ cmp('partials stop at -70 dBFS', await go('partials stop at -70 dBFS',{ floor:-70 })); cmp('chain without fdepth', await go('chain without fdepth',{ ids:NCHAIN.filter(x=>x!=='fdepth') })); cmp('Lighter forest room', await go('Lighter forest room',{ set:{ 'fdepth:light':1 } })); cmp('after the flute was tried (4 voices)', await go('after the flute was tried (4 voices)',{ flute:true })); cmp('old path, after the flute was tried', await go('old path, after the flute was tried',{ flute:true, old:true })); }
    else if(struck){ for(const fl of [-80,-70,-60]) cmp(`partials stop at ${fl} dBFS`, await go(`partials stop at ${fl} dBFS`,{ floor:fl })); 
      const cap=(prof().voices||{})[id]; if(cap>1){ for(const c of [cap-1,Math.round(cap/2)]) if(c>=1 && c<cap && !o[`cap ${c}`]) cmp(`cap ${c}`, await go(`cap ${c}`,{ caps:{ ...prof().voices, [id]:c } })); } }
    if(opt.deep && !opt.lite){ cmp('no chain at all', await go('no chain at all',{ dry:true })); for(const fx of NCHAIN) cmp('chain without '+fx, await go('chain without '+fx,{ ids:NCHAIN.filter(x=>x!==fx) })); cmp('Lighter forest room', await go('Lighter forest room',{ set:{ 'fdepth:light':1 } })); cmp('after the flute was tried (4 voices)', await go('after the flute was tried (4 voices)',{ flute:true })); cmp('old path, after the flute was tried', await go('old path, after the flute was tried',{ flute:true, old:true })); }
    /* the baseline again at the end: how far the machine drifted while this block ran */
    { const again=await go('as now, again'), b=Math.min(base.us,again.us); o['as now'].us=C.round(b,0); o['as now'].pct=C.round(C.loadPct(b,again.rate),1); o['as now'].drift=C.round(100*(again.us/base.us-1),0); delete o['as now, again']; for(const [name,us] of done) o[name].saved=C.round(100*(1-us/b),0); }
    tell(id); }
  return out;
}
/* 7. the lab: a bowl's three strikes, the parts alone, against cheaper forms; residual where it's the same arithmetic */
export async function lab(tell=()=>{}){
  const R=timbreRec('solo.singing-bowl').recipe, rate=AC.sampleRate, f0=440, sc=Math.pow(220/f0,R.dk), len=2.4, win=[0.2,2.2], ms=[];
  for(let s=0;s<3;s++) for(const m of R.modes) ms.push({ f:f0*(1+s*0.5)*m.r, g:m.g, d:m.d*sc, a:m.a||R.att, t:0.01 });
  const live=ms.filter(m=>m.f<rate*0.45);
  const time=async(build,keep)=>{ let m=Infinity, x=null; for(let i=0;i<3;i++){ const ctx=new OfflineAudioContext(1,Math.round(rate*len),rate); await build(ctx); const st=[]; for(const t of win) ctx.suspend(t).then(()=>{ st.push(performance.now()); ctx.resume(); }); const b=await ctx.startRendering(); const d=st[1]-st[0]; if(d<m){ m=d; if(keep) x=b.getChannelData(0).slice(); } } return { us:C.usPerQuantum(m,win[1]-win[0],rate), x }; };
  const oscGain=(ctx,kr)=>{ for(const M of live){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=M.f; try{ o.detune.automationRate='k-rate'; }catch(e){} if(kr) try{ g.gain.automationRate='k-rate'; }catch(e){} g.gain.setValueAtTime(0,M.t); g.gain.linearRampToValueAtTime(M.g,M.t+M.a); g.gain.setTargetAtTime(0,M.t+M.a,M.d/6.907755); o.connect(g); g.connect(ctx.destination); o.start(M.t); } };
  const zero=await time(ctx=>{});
  const a=await time(ctx=>oscGain(ctx,false),true), k=await time(ctx=>oscGain(ctx,true),true);
  /* frequency k-rate as well: a sine that doesn't move needs no per-sample rate */
  const f=await time(ctx=>{ for(const M of live){ const o=ctx.createOscillator(), g=ctx.createGain(); try{ o.frequency.automationRate='k-rate'; o.detune.automationRate='k-rate'; g.gain.automationRate='k-rate'; }catch(e){} o.frequency.value=M.f; g.gain.setValueAtTime(0,M.t); g.gain.linearRampToValueAtTime(M.g,M.t+M.a); g.gain.setTargetAtTime(0,M.t+M.a,M.d/6.907755); o.connect(g); g.connect(ctx.destination); o.start(M.t); } },true);
  const j=await time(async ctx=>{ await ctx.audioWorklet.addModule(new URL('./headroom-worklet.js',import.meta.url).href); const n=new AudioWorkletNode(ctx,'hr-modal',{ numberOfOutputs:1, outputChannelCount:[1], processorOptions:{ modes:live } }); n.connect(ctx.destination); });
  const pre=await time(ctx=>{ const b=ctx.createBuffer(1,Math.round(rate*len),rate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=a.x[i]/3; for(let s=0;s<3;s++){ const src=ctx.createBufferSource(), g=ctx.createGain(); src.buffer=b; g.gain.value=1; src.connect(g); g.connect(ctx.destination); src.start(0); } });
  const u=x=>C.round(x-zero.us,0);
  tell('lab');
  return { partials:live.length, sinesPlusGains:u(a.us), gainsAtBlockRate:{ us:u(k.us), residualDb:C.residualDb(a.x,k.x), note:'not the same sound as written: a step on the attack and about −1.3 dB (measured)' }, allAtBlockRate:{ us:u(f.us), residualDb:C.residualDb(a.x,f.x) }, oneJsResonatorNode:{ us:u(j.us), note:'same modes as one worklet node, written in JS; not yet A/B-tested' }, threeBufferReaders:u(pre.us) };
}
/* 8. pre-rendering: time and memory for each struck sound */
export async function prerender(tell=()=>{}){
  const out={}, cur=CUR(), L=rectLayout(cur), pitches=cur.iv.length*L.octaves+1, rate=AC.sampleRate;
  for(const id of ['solo.firefly','solo.handpan','solo.singing-bowl']){ out[id]={ perNote:[] }; for(const f of [220,440,880]){
      const R=await once((eng)=>{ const i=prep(eng,id,{ dry:true }); eng.leadOn('p',f,1,i,off,off,off,off,0.005); }, /bowl/.test(id)?18:6, { audio:true });
      const e=C.envelope(R.x,R.rate), T=C.tailTimes(e,0.05,[-80]), sec=T[-80], gross=R.t1-R.t0; out[id].perNote.push({ f, sec, renderMs:C.round(gross*(sec/(R.x.length/R.rate)),0) }); }
    const secMean=out[id].perNote.reduce((n,x)=>n+x.sec,0)/3, msMean=out[id].perNote.reduce((n,x)=>n+x.renderMs,0)/3;
    out[id].plan=C.prerender(secMean,rate,pitches,3); out[id].prepareS=C.round(msMean*pitches*3/1000,1); out[id].prepareOneVelocityS=C.round(msMean*pitches/1000,1); tell(id); }
  return out;
}
/* 9. the delay of a larger buffer, read from this browser */
export async function buffers(){
  const out=[]; const Ctor=window.AudioContext||window.webkitAudioContext;
  for(const hint of ['interactive','balanced','playback',0.02,0.04,0.08]){ try{ const c=new Ctor({ latencyHint:hint }); await wait(150); out.push({ hint, baseMs:C.round((c.baseLatency||0)*1000,1), outputMs:C.round((c.outputLatency||0)*1000,1), rate:c.sampleRate }); await c.close(); }catch(e){ out.push({ hint, error:String(e&&e.message||e) }); } }
  return out;
}

/* ------------- real time ------------- */
const pb=()=>{ try{ const s=AC.playbackStats; return s && Number.isFinite(s.underrunEvents) ? s.underrunEvents : null; }catch(e){ return null; } };
let LOAD=null, fxKeep=null;
async function loadReady(){ if(LOAD) return LOAD; await AC.audioWorklet.addModule(new URL('./headroom-worklet.js',import.meta.url).href);
  const g=AC.createGain(); g.gain.value=0; g.connect(AC.destination); const n=new AudioWorkletNode(AC,'hr-load',{ numberOfInputs:0, numberOfOutputs:1 }); n.connect(g);
  LOAD={ n, g, perMs:0 }; return LOAD; }
const ask=(n,m,key)=>new Promise(res=>{ const f=e=>{ if(e.data && key in e.data){ n.port.removeEventListener('message',f); res(e.data); } }; n.port.addEventListener('message',f); n.port.start(); n.port.postMessage(m); setTimeout(()=>res(null),3000); });
export async function calibrate(){ const L=await loadReady(); let r=null; for(let i=0;i<4;i++){ r=await ask(L.n,{ calib:1 },'perMs'); await wait(150); } L.perMs=r?r.perMs:0; L.n.port.postMessage({ ms:0 }); return L.perMs; }
function selectSound(id){ for(let k=0;k<6 && timbreIdOf('ld',ST.leadIdx)!==id;k++) document.getElementById('nightSound').click(); return timbreIdOf('ld',ST.leadIdx)===id; }
const FX=[['cecho',0,0.6],['ctone',1,0.5],['cwave',1,0.5]];
function fxSet(){ const key=ST.chainKeyOf('ld'); FX.forEach(([id,i,v])=>{ const p=G.fxParamsOf(key,id); if(p&&p[i]) p[i].set(v); }); }
/* one real-time pass: the row's playing (or the gentle one) for `sec`, ballast in quantum fractions. Its synthetic hand plays; the real one is seen by the detector but makes no note */
async function pass(id, kind, f, sec){
  const L=await loadReady(), qms=128/AC.sampleRate*1000, E=engineCtx();
  L.n.port.postMessage({ ms:f*qms }); await wait(900);
  const lat0=latReport(), det0=lat0.camera.framesDetected, s0=performance.now(), u0=pb(); await ask(L.n,{ read:1 },'read');
  const clk={ t:performance.now(), W:1000, H:600 }, t0=performance.now(); let most=0, srcs=0, ringSum=0, handSum=0, n=0, nfps=0, fps=0;
  G.handsProbe(clk, ()=>true);
  try{ await new Promise(res=>{ const iv=setInterval(()=>{ const t=(performance.now()-t0)/1000; clk.t=performance.now();
      if(t>sec){ clearInterval(iv); G.processHandsProbe({ landmarks:[], handednesses:[] }); res(); return; }
      const gaps= kind==='stress' ? [0,1,2,3].map(k=>(((t*2)+k*0.25)%1)<0.5 ? 0.05 : 1) : [0,1,2,3].map(k=> k<2 && Math.floor(t/0.75)%2===k && (t%0.75)<0.45 ? 0.05 : 1);
      G.processHandsProbe({ landmarks:[pose({ x:0.5+0.2*Math.sin(2*Math.PI*t/14), y:0.5+0.3*Math.sin(2*Math.PI*t/10), s:0.2, gaps })], handednesses:[[{ categoryName:'Right' }]] });
      const live=E.pool.ld.strikes.filter(x=>x.id===id && !x.faded && x.end>AC.currentTime); most=Math.max(most,live.length); ringSum+=live.length; srcs=Math.max(srcs, live.reduce((m,x)=>m+x.srcs.length,0));
      const h=BUS.get('hands'); handSum+=h&&h.landmarks?h.landmarks.length:0; n++; }, 33); }); }
  finally{ G.handsProbe(null); liveAllOff(); }
  await wait(900); const u1=pb(), gaps=await ask(L.n,{ read:1 },'read'); L.n.port.postMessage({ ms:0 });
  const lat=latReport(), I=sceneInfo(), el=(performance.now()-s0)/1000;
  return { kind, f, drop:u1==null?null:u1-u0, gapMax:gaps?gaps.max:null, late:gaps?gaps.late:null, ring:most, ringMean:C.round(ringSum/Math.max(1,n),2), srcMax:srcs, voices:E.pool.ld.v.length,
    det:C.round((lat.camera.framesDetected-det0)/el,1), detMs:lat.stages.detect.mean, hands:C.round(handSum/Math.max(1,n),2), scene: I&&I.webgl ? I.fps : null };
}
const passOk=r=> r.drop!=null ? r.drop<=2 : (r.late||0)<=2;   // the row's allowance on a quiet reference
/* one sound in one condition: the ballast search on the stress passage, and gentle with no ballast */
async function soundBlock(id, sec, tell, depth){
  if(id===REF){ const why=profileApply('profile.full'); if(why) throw new Error(why); } else { if(!selectSound(id)){ const why=profileApply('profile.night'); if(why) throw new Error(why); if(!selectSound(id)) throw new Error('could not choose '+id); } fxSet(); }
  if(id===REF && timbreIdOf('ld',ST.leadIdx)!==REF) throw new Error('reference is '+timbreIdOf('ld',ST.leadIdx));
  tell(`${id}, gentle`); const gentle=await pass(id,'gentle',0,sec);
  const tried=[], passes=[]; let f;
  while((f=C.nextBallast(tried,depth))!=null){ tell(`${id}, ${Math.round(f*100)} %`); const r=await pass(id,'stress',f,sec); passes.push(r); tried.push({ f, ok:passOk(r) }); }
  if(id===REF) { const why=profileApply('profile.night'); if(why) throw new Error(why); fxSet(); }   // Night's face sets its lean path again
  return { id, free:C.freeRange(tried), stress:passes, gentle };
}
export async function plainPasses(ids, kinds, rounds, sec, tell=()=>{}){ const out={}; for(const id of ids){ if(!selectSound(id)) throw new Error('could not choose '+id); fxSet(); const m=out[id]={};
  for(let r=0;r<rounds;r++) for(const k of kinds) for(const [tag,lean] of [['lean',LEAN_PATH],['old',null]]){ A.setLeanPath(lean); await wait(300); tell(`${id} ${k} ${tag} ${r}`); const p=await pass(id,k,0,sec); ((m[k]||(m[k]={}))[tag]||(m[k][tag]=[])).push(p.drop); } }
  A.setLeanPath(LEAN_PATH); return out; }
export const stopCamera=()=>{ pumpDbg({ hold:true }); const s=video.srcObject; if(s) for(const t of s.getTracks()) t.stop(); };
export const openCamera=async()=>{ await startCamera(); pumpDbg({ hold:false }); };
function lightSet(v){ const I=fxInstance(ST.chainKeyOf('ld'),'fdepth'); if(I && I.params[4]) I.params[4].setNorm(v?1:0); A.setLowPower(!!v); }
export const setBase=async b=>{ if(b==='sound'){ stopCamera(); await setBackground('dark'); await wait(1200); } else { await openCamera(); await setSceneLevel('reduced'); await setBackground('forest'); await wait(4500); } };
export const CONDS={
  sound:{ base:'sound', lean:LEAN_PATH, say:'sound alone: no camera, no hand tracking, no room' },
  soundOld:{ base:'sound', lean:null, say:'sound alone, the old path' },
  all:{ base:'all', lean:LEAN_PATH, say:'camera, hand tracking and the forest (medium)' },
  allOld:{ base:'all', lean:null, say:'camera, hand tracking and the forest, the old path' },
  allFloor:{ base:'all', lean:LEAN_PATH, floor:-70, say:'camera, hand tracking and the forest, with the quiet floor at −70 dBFS' },
  light:{ base:'all', lean:LEAN_PATH, light:true, say:'as above, with Lighter forest (delay-network room, 60 % caps)' },
};
/* the plan: each sound lean and old in turn, in the same conditions. A sound's flute or SuperSaw banks stay built, so struck sounds go first */
const pair=(c,id,note)=>[[c,id,note],[c+'Old',id,note]];
export const PLAN=[...['solo.firefly','solo.handpan','solo.singing-bowl'].flatMap(id=>pair('sound',id)), ...['solo.firefly','solo.handpan','solo.singing-bowl'].flatMap(id=>pair('all',id)), ['allFloor','solo.singing-bowl'], ['light','solo.singing-bowl'], ...pair('all','solo.breath-flute'), ...pair('all','solo.singing-bowl','after the flute'), ...pair('sound','solo.breath-flute'), ...pair('sound','solo.singing-bowl','after the flute'), ['sound',REF], ['all',REF]];
export async function realtime(tell=()=>{}, opt={}){
  const plan=opt.plan||PLAN, sec=opt.sec||6, out=[]; let cond=null, base=null, at=0, idle={};
  for(const [c,id,note] of plan){ at++;
    if(c!==cond){ const K=CONDS[c]; if(opt.before) await opt.before(K.base); tell(`${at}/${plan.length}: ${K.say}`);
      if(K.base!==base){ await setBase(K.base); base=K.base; } A.setLeanPath(K.lean); A.setPartialFloor(K.floor==null?null:K.floor); lightSet(!!K.light); cond=c; await wait(3000); const perMs=await calibrate();
      /* idle: the same ballast search with nothing playing */
      const tried=[]; let f; const L=await loadReady(), qms=128/AC.sampleRate*1000; if(!idle[c]) while((f=C.nextBallast(tried,opt.depth))!=null){ L.n.port.postMessage({ ms:f*qms }); await wait(700); const u0=pb(); await ask(L.n,{ read:1 },'read'); await wait(sec*500); const u1=pb(), g=await ask(L.n,{ read:1 },'read'); const late=g?g.late:0, ok= u0==null ? late<=2 : u1-u0<=2; tried.push({ f, ok }); } L.n.port.postMessage({ ms:0 });
      if(!idle[c]) idle[c]={ perMs:C.round(perMs,0), free:C.freeRange(tried) }; }
    const r=await soundBlock(id, sec, s=>tell(`${at}/${plan.length}: ${s}`), opt.depth); r.cond=c; if(note) r.note=note; out.push(r); if(opt.after) opt.after(r,at,plan.length); }
  return { idle, runs:out };
}
const envNow=()=>{ const L=latReport(), S=sceneInfo()||{}; return { ua:navigator.userAgent, cores:navigator.hardwareConcurrency, memGb:navigator.deviceMemory||null, rate:AC.sampleRate, baseMs:C.round((AC.baseLatency||0)*1000,1), outputMs:C.round((AC.outputLatency||0)*1000,1), counter:pb()!=null, capacity:L.audio.capacity||null, detect:{ runs:L.detection.runs, policy:L.detection.policy }, gpu:(L.gpu||{}).renderer||null, level:sceneLevel(), scene:{ webgl:!!S.webgl, pixelRatio:S.pixelRatio }, at:new Date().toISOString() }; };

/* what the phone runs: short offline sections, then the real-time plan */
export async function phoneOffline(tell=()=>{}, opt={}){
  const quick=!!opt.smoke;
  return { shared:await sharedParts(s=>tell('shared: '+s)), notes:await noteCost(quick?['solo.singing-bowl']:ALL, s=>tell('note: '+s)), passages:await passages(quick?['solo.singing-bowl']:ALL, s=>tell('passage: '+s), quick?1:2),
    tails:await tails(quick?['solo.firefly']:ALL, s=>tell('tail: '+s)), tailProfile:await tailProfile(s=>tell('fade: '+s),{ sounds:quick?['solo.firefly']:['solo.singing-bowl'], len:quick?4:20, step:2 }),
    whatIfs:quick?{}:await whatIfs(['solo.singing-bowl'], s=>tell('what-if: '+s),{ times:2, lite:true }), lab:quick?{}:await lab(tell), prerender:quick?{}:await prerender(s=>tell('pre-render: '+s)), buffers:await buffers() };
}
export async function deepOffline(tell=()=>{}){
  return { shared:await sharedParts(s=>tell('shared: '+s)), notes:await noteCost(ALL, s=>tell('note: '+s)), passages:await passages(ALL, s=>tell('passage: '+s), 4),
    tails:await tails(ALL, s=>tell('tail: '+s)), tailProfile:await tailProfile(s=>tell('fade: '+s)),
    whatIfs:await whatIfs(['solo.firefly','solo.handpan','solo.singing-bowl','solo.breath-flute'], s=>tell('what-if: '+s),{ times:3, deep:true }), whatIfsGentle:await whatIfs(['solo.handpan','solo.singing-bowl'], s=>tell('what-if gentle: '+s),{ times:2, kind:'gentle' }),
    lab:await lab(tell), prerender:await prerender(s=>tell('pre-render: '+s)), buffers:await buffers() };
}
export const snapshot=envNow;
export const reportOf=(sections)=>C.report(envNow(), sections);

/* ------------- the panel ------------- */
const W={
  title:['Запас звука','Sound headroom'],
  intro:['Около 25 минут. Сначала телефон считает молча, потом сам играет звуки: без камеры, затем с камерой и лесом. Громкость средняя, зарядка отключена, энергосбережение выключено.','About 25 minutes. First the phone calculates silently, then it plays sounds by itself: with no camera, then with the camera and the forest. Medium volume, charger unplugged, battery saver off.'],
  go:['Начать','Start'], loading:['Запускаю приложение: разрешите камеру…','Starting the app: allow the camera…'],
  offline:['Считаю (звука нет, 5–15 минут). Экран не трогайте.','Calculating (no sound, 5–15 minutes). Don’t touch the screen.'],
  soundPart:['Только звук, без камеры: руку можно убрать. Слушайте треск.','Sound alone, no camera: rest your hand. Listen for crackle.'],
  hand:['Камера и лес. Обопритесь локтем о стол и держите руку в кадре, можно менять руку. Ноты играет тест, а не рука. Слушайте треск.','Camera and forest. Rest your elbow on a table and keep a hand in view; swap hands whenever you like. The test plays the notes, not your hand. Listen for crackle.'],
  ready:['Готово, продолжить','Ready, continue'],
  done:['Готово! Скопируйте текст и пришлите его. Перед другими проверками перезагрузите страницу.','Done! Copy the text and send it. Reload the page before any other check.'], copy:['Скопировать','Copy'], copied:['Скопировано. Пришлите этот текст.','Copied. Send this text.'], copyFail:['Не скопировалось: выделите текст ниже вручную.','Copying failed: select the text below by hand.'],
  fail:['Ошибка, пришлите текст ниже:','An error, send the text below:'],
};
const CSS=`#hrPanel{position:fixed;z-index:2147483000;left:0;right:0;top:0;background:rgba(7,9,13,.92);color:#f1eee4;font:16px/1.35 system-ui,sans-serif;padding:10px 14px 12px;box-sizing:border-box;max-height:100vh;overflow:auto}
#hrPanel.small{background:rgba(7,9,13,.6);font-size:13px;padding:4px 10px}
#hrPanel h2{font-size:18px;margin:0 0 6px}#hrPanel.small h2{display:none}
#hrPanel p{margin:0 0 4px}#hrPanel .en{color:#a4acba;font-size:14px}#hrPanel.small .en{font-size:12px}
#hrPanel button{width:100%;min-height:64px;margin-top:8px;background:#c8f56a;color:#10140a;border:0;border-radius:12px;font:600 19px system-ui,sans-serif}
#hrPanel button[hidden],#hrPanel textarea[hidden],#hrBar[hidden]{display:none}
#hrBar{height:10px;background:#11151d;border:1px solid #3a4454;border-radius:5px;overflow:hidden;margin:6px 0}#hrBar i{display:block;height:100%;width:0;background:#c8f56a}
#hrStep{font:12px ui-monospace,monospace;color:#c8d0dc;min-height:16px}
#hrOut{width:100%;height:32vh;font:11px ui-monospace,monospace;background:#11151d;color:#f1eee4;margin-top:8px}`;
export function mountHeadroom(){
  const el=(tag,props={},...kids)=>{ const e=Object.assign(document.createElement(tag),props); e.append(...kids); return e; };
  const say=el('div'), step=el('div',{ id:'hrStep' }), fill=el('i'), bar=el('div',{ id:'hrBar', hidden:true },fill), go=el('button',{ id:'hrGo', textContent:W.go[0]+' / '+W.go[1] }), no=el('button',{ id:'hrNo', hidden:true }), out=el('textarea',{ id:'hrOut', readOnly:true, hidden:true });
  const panel=el('div',{ id:'hrPanel' },el('h2',{ textContent:W.title[0]+' / '+W.title[1] }),say,bar,step,go,no,out);
  const text=w=>{ say.textContent=''; say.append(el('p',{ textContent:w[0] }),el('p',{ className:'en', textContent:w[1] })); };
  let phase='intro', result=null, resume=null, smoke=false;
  const PLAN_SMOKE=[['sound','solo.firefly'],['soundOld','solo.firefly'],['all','solo.firefly']];
  const press=()=>new Promise(r=>{ resume=r; go.hidden=false; go.disabled=false; });
  async function run(){
    phase='loading'; go.hidden=true; text(W.loading);
    const started=await new Promise(res=>{ const t0=performance.now(), f=()=>{ if(AC && video.readyState>=2 && document.getElementById('bar').classList.contains('on')) res(true); else if(performance.now()-t0>120e3) res(false); else setTimeout(f,300); }; f(); });
    if(!started) throw new Error('the app did not start: '+((document.getElementById('loadmsg')||{}).textContent||''));
    panel.classList.add('small'); await render(); afPause('headroom', true);
    const sections={};
    phase='offline'; text(W.offline); bar.hidden=false; const beforeOff=pb();
    stopCamera(); await setBackground('dark'); await wait(1000);
    let n=0; const N=smoke?12:39; const tellO=s=>{ n++; fill.style.width=Math.min(100,100*n/N)+'%'; step.textContent=s; };
    sections.offline=await phoneOffline(tellO,{ smoke });
    sections.offlineDrops= beforeOff==null?null:pb()-beforeOff;
    phase='realtime'; const plan=smoke?PLAN_SMOKE:PLAN;
    const before=async c=>{ if(c==='sound') text(W.soundPart); else if(!before.asked){ before.asked=true; panel.classList.remove('small'); text(W.hand); go.textContent=W.ready[0]+' / '+W.ready[1]; if(!smoke) await press(); go.hidden=true; panel.classList.add('small'); } else text(W.hand); };
    sections.realtime=await realtime(s=>{ step.textContent=s; },{ plan, sec:smoke?1:6, before, after:(r,at,total)=>{ fill.style.width=(100*at/total)+'%'; } });
    return C.report(envNow(), sections);
  }
  const finish=r=>{ result=r; phase='done'; panel.classList.remove('small'); bar.hidden=true; step.textContent=''; text(W.done); out.value=JSON.stringify(r); out.hidden=false; go.hidden=false; go.disabled=false; go.textContent=W.copy[0]+' / '+W.copy[1]; };
  const copy=async()=>{ try{ await navigator.clipboard.writeText(out.value); text(W.copied); }catch(e){ out.focus(); out.select(); text(W.copyFail); } };
  go.onclick=()=>{ if(resume){ const r=resume; resume=null; r(); return; }
    if(phase==='done') return copy();
    if(phase!=='intro') return;
    const start=document.getElementById('startBtn'); if(start && start.onclick) start.onclick();   // rule #1: inside this tap
    run().then(finish,e=>{ phase='failed'; panel.classList.remove('small'); text(W.fail); out.value=String(e&&e.stack||e); out.hidden=false; });
  };
  text(W.intro); document.head.append(el('style',{ textContent:CSS })); document.body.append(panel);
  /* for tools/smoke-paths.mjs: the short plan through the same code */
  window.__headroom={ phase:()=>phase, result:()=>result, smoke:v=>{ smoke=!!v; } };
}
