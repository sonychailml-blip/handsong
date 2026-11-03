/* NIGHT-1 stage 2: row «NIGHT lean path» (P.night; slow: offline renders). What Night takes out of the graph must leave its sound alone, must be undone exactly, and must be something it never plays.
   (1) SAME SOUND: each of Night's four sounds, the stress passage through Night's chain, lean against old: the residual stays at rounding level. CONTROL: dropping the echo must leave that level.
   (2) UNDONE: lean on, then off, renders sample for sample as never touched. CONTROL: left half-way (a stage still cut, on a passage that uses its tremolo) must differ.
   (3) NEVER PLAYED: Night's chain holds nothing the cut stages serve, and a real playing pass through the hand machine reaches no chord, bass or drum voice. CONTROL: a planted chain fails; Full's chords move the counter.
   (4) PARKED, THEN PLAYED AGAIN: a flute and a SuperSaw left silent leave the graph (the count rises; idle work falls), then a new attack matches the same attack never parked: same loudness over time, no click, no later onset, also when the graph change lands one quantum after the attack.
       CONTROLS: disconnecting mid-note must read as a click; reconnecting 120 ms late must read as a lost attack. */
import { row } from '../core/rows.js';
import { leanInfo, engVoices, fxSnapshot } from '../../../core/audio.js';
import * as ST from '../../../core/state.js';
import { profileApply, profileCurrent, profileOf } from '../../../core/profile.js';
import * as G from '../../../core/gestures.js';
import { pose } from '../../../core/gestures/pose.js';
import { liveAllOff } from '../../../core/recorder.js';
import { residualDb, envelope } from './headroom-calc.js';
import { clickOf, kLoud } from './night.js';
import { LEAN_PATH } from '../../../apps/night/shell.js';

const off=undefined, ON=LEAN_PATH, SOUNDS=['solo.firefly','solo.breath-flute','solo.handpan','solo.singing-bowl'];
const CHAIN={ 'ctone:mix':1, 'ctone:tilt':0.5, 'cwave:mix':1, 'cwave:amount':0.5, 'cecho:amount':0.6, 'cecho:time':0.8431089342012043, 'fdepth:mix':1, 'fdepth:depth':0.4, 'fdepth:room':0.5 }, NCHAIN=['ctone','cwave','cecho','fdepth'], HIGH=[440,493.88,554.37,659.26,739.99];
const FORBIDDEN=/^(drv|bright|trm|vib|trem|reverb|dly)/;   // what the cut stages would have served; Night's chain must hold none

/* one render on the copy. setup(eng, E, add) → add(t, fn) runs fn at render time t */
async function ren(setup, len){ const R=await import('../../../core/render.js');
  return R.engineProbe(async(eng,ctx)=>{ const rate=ctx.sampleRate, map=new Map(), add=(t,fn)=>{ const q=Math.floor(t*rate/128); if(!map.has(q)) map.set(q,[]); map.get(q).push(fn); };
    const out=await setup(eng,eng.engineCtx(),add);
    for(const [q,fns] of map){ if(q===0){ for(const f of fns) f(); continue; } ctx.suspend(q*128/rate).then(()=>{ for(const f of fns) f(); ctx.resume(); }); }
    const b=await ctx.startRendering(), L=b.getChannelData(0), Rr=b.getChannelData(b.numberOfChannels>1?1:0), x=new Float32Array(L.length); for(let i=0;i<x.length;i++) x[i]=(L[i]+Rr[i])/2;
    return { x, rate, out }; },{ sec:len }); }
const prep=(eng,id,o={})=>{ const p=profileOf('profile.night'), key=ST.chainKeyOf('ld'), ids=o.ids||NCHAIN; eng.offlineTapMaster();
  for(const k of new Set(ST.chainOwners().map(x=>x.key))){ const c=k===key?ids:[]; for(const x of c) eng.fxInstance(k,x); eng.fxRenderPath(k,c,c); }
  for(const [a,v] of Object.entries(CHAIN)){ const [fx,q]=a.split(':'); if(ids.includes(fx)) eng.fxPlaySet(key,fx,q,v,0); }
  eng.setTimbreTrim(p.levels); eng.setNightStrikes(p.voices); eng.applyFx({}); return eng.LEAD_INSTR.findIndex(x=>x.id===id); };
function play(eng,i,add,hold=0.3){ for(let k=0;k<24;k++){ const t=0.05+k*0.08, own='h'+(k%4); add(t-0.02,()=>{ eng.leadOn(own,HIGH[k%5],1,i,off,off,off,off,t); eng.leadOff(own,off,t+hold); }); } }
const LEN=3.2;

const onset=(x,rate)=>{ const e=envelope(x,rate,0.001), pk=e.reduce((m,v)=>Math.max(m,v),0); return e.findIndex(v=>v>=pk*0.05); };
export async function checkNightLean(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), key=()=>ST.chainKeyOf('ld');
  const was=profileCurrent();
  try{
    /* (1) same sound */
    for(const id of SOUNDS){ const a=await ren((eng,E,add)=>play(eng,prep(eng,id),add),LEN), b=await ren((eng,E,add)=>{ const i=prep(eng,id); eng.setLeanPath(ON); play(eng,i,add); },LEN), r=residualDb(a.x,b.x); n++;
      notes.push(`${id}: lean against old ${r} dB`); if(!(r<=-100)) miss(`${id}: the lean path changes the sound, residual ${r} dB (≤ −100 expected)`); }
    { const id='solo.handpan', a=await ren((eng,E,add)=>play(eng,prep(eng,id),add),LEN), c=await ren((eng,E,add)=>{ const i=prep(eng,id,{ ids:NCHAIN.filter(x=>x!=='cecho') }); eng.setLeanPath(ON); play(eng,i,add); },LEN), r=residualDb(a.x,c.x); n++; notes.push(`CONTROL without the echo: ${r} dB`); if(!(r>-100)) miss(`CONTROL: a passage without its echo reads ${r} dB: the same-sound test cannot fail`);
    /* (2) undone exactly: on, then off, against never touched, over everything that plays */
      const u=await ren((eng,E,add)=>{ const i=prep(eng,id); eng.setLeanPath(ON); eng.setLeanPath(null); play(eng,i,add); eng.chordOn('c',[220,330],0.5,0,null,0.1); eng.chordOff('c',0.6); },LEN), w=await ren((eng,E,add)=>{ const i=prep(eng,id); play(eng,i,add); eng.chordOn('c',[220,330],0.5,0,null,0.1); eng.chordOff('c',0.6); },LEN); n++;
      const ru=residualDb(w.x,u.x); notes.push(`lean on then off against never touched: ${ru} dB`); if(ru!==-Infinity && !(ru<=-120)) miss(`on then off isn't undone: ${ru} dB`);
      const half=await ren((eng,E,add)=>{ const i=prep(eng,id); eng.setLeanPath({ roles:true }); play(eng,i,add); eng.chordOn('c',[220,330],0.5,0,null,0.1); eng.chordOff('c',0.6); },LEN), rh=residualDb(w.x,half.x); n++; notes.push(`CONTROL roles left cut: ${rh} dB`); if(!(rh>-60)) miss('CONTROL: chords left cut did not differ: the undo test cannot fail'); }
    /* (3) never played */
    { const why=profileApply('profile.night'); if(why) throw new Error(why); const snap=Object.keys(fxSnapshot(key())); n++; const bad=snap.filter(k=>FORBIDDEN.test(k)); if(bad.length) miss('Night\'s chain holds what the cut stages serve: '+bad.join());
      n++; if(![...snap,'drv:amt'].some(k=>FORBIDDEN.test(k))) miss('CONTROL: a planted drive did not trip the chain check');
      const I=leanInfo(); n++; for(const k of Object.keys(ON)) if(!I[k]) miss(`Night's face did not set «${k}»`);
      const S0=engVoices(), clk={ t:performance.now(), W:1000, H:600 }, t0=performance.now(); let ch=0, bs=0;
      G.handsProbe(clk,()=>true);
      try{ await new Promise(res=>{ const iv=setInterval(()=>{ const t=(performance.now()-t0)/1000; clk.t=performance.now(); if(t>2){ clearInterval(iv); G.processHandsProbe({ landmarks:[], handednesses:[] }); res(); return; }
          G.processHandsProbe({ landmarks:[pose({ x:0.5+0.2*Math.sin(t*2), y:0.5+0.3*Math.sin(t*3), s:0.2, gaps:[0,1,2,3].map(f=>(((t*2)+f*0.25)%1)<0.5?0.05:1) })], handednesses:[[{ categoryName:'Right' }]] }); const V=engVoices(); ch=Math.max(ch,V.ch.sounding); bs=Math.max(bs,V.bs.sounding); },33); }); }
      finally{ G.handsProbe(null); liveAllOff(); }
      n++; const S1=engVoices(); notes.push(`Night played: chords sounding ${ch}, bass ${bs}, drum hits ${S1.drums.hitsLastSec}`); if(ch||bs||S1.drums.hitsLastSec-S0.drums.hitsLastSec>0) miss(`Night reached a role it doesn't have: chords ${ch}, bass ${bs}, drums ${S1.drums.hitsLastSec}`);
      const f=profileApply('profile.full'); if(f) throw new Error(f); n++; const J=leanInfo(); for(const k of Object.keys(ON)) if(J[k]) miss(`leaving Night left «${k}» on`);
      if(profileOf('profile.full').roles && !profileOf('profile.full').roles.includes('ch')) miss('Full has no chords'); }
    /* (4) parked, then played again */
    for(const id of ['solo.breath-flute','solo.supersaw']){ const F=id==='solo.supersaw' ? 220 : 440;
      /* note 1, a rest long enough to park, note 2 in a fresh render from the same start; only the parked bank differs */
      const b0=(v,i)=>v.banks[i];
      const go=(mode,t=5)=>ren((eng,E,add)=>{ const i=prep(eng,id); if(mode!=='old') eng.setLeanPath({ park:true }); eng.leadOn('a',F,0.7,i,off,off,off,off,0.05); eng.leadOff('a',off,0.45);
          if(mode!=='old') add(4.5,()=>eng.leadParkTick(4.5));
          const v=E.pool.ld.v; if(mode==='late'||mode==='control-late'){ add(t,()=>{ const b=v[0].banks[i]; b.parked=false; eng.leadOn('b',F,0.7,i,off,off,off,off,t+0.001); }); add(t+(mode==='late'?0.0027:0.12),()=>{ b0(v[0],i).gain.connect(v[0].pre); }); }
          else add(t,()=>eng.leadOn('b',F,0.7,i,off,off,off,off,t+0.001));
          add(t+0.6,()=>eng.leadOff('b',off,t+0.601));
          return null; },6.9);
      const seg=(r,t=5)=>r.x.subarray(Math.round((t-0.01)*r.rate), Math.round((t+1.2)*r.rate));
      const old=await go('old'), pk=await go('park'), lt=await go('late'), ct=await go('control-late'); n+=4;
      const A=seg(old), B=seg(pk), C=seg(lt), X=seg(ct), rate=old.rate;
      /* the sound's own spread: the same attack, never parked, at other moments (detuned oscillators beat, so no two attacks of a SuperSaw are alike) */
      let spread=0, ckOwn=clickOf(A,rate); for(const t of [5.13,5.29,5.41]){ const o=seg(await go('old',t),t); spread=Math.max(spread,Math.abs(kLoud(o,rate)-kLoud(A,rate))); ckOwn=Math.max(ckOwn,clickOf(o,rate)); }
      const dL=Math.abs(kLoud(A,rate)-kLoud(B,rate)), dLl=Math.abs(kLoud(A,rate)-kLoud(C,rate)), on=[A,B,C,X].map(s2=>onset(s2,rate)), ck=[B,C].map(s2=>clickOf(s2,rate));
      notes.push(`${id}: again after parking: loudness ${dL.toFixed(2)} dB, ${dLl.toFixed(2)} dB one quantum late, its own spread ${spread.toFixed(2)} dB; onset ${on[0]} / ${on[1]} / ${on[2]} ms (control 120 ms late ${on[3]}); click ${ck.map(c=>c.toFixed(3)).join(' / ')}, its own worst ${ckOwn.toFixed(3)}`);
      const allow=spread+0.5;
      if(!(dL<=allow)) miss(`${id}: louder or softer after parking by ${dL.toFixed(2)} dB (own spread ${spread.toFixed(2)})`); if(!(dLl<=allow)) miss(`${id}: a reconnect one quantum late moves the loudness by ${dLl.toFixed(2)} dB (own spread ${spread.toFixed(2)})`);
      if(on[1]>on[0]+3 || on[2]>on[0]+4) miss(`${id}: a lost attack: onset ${on[0]} → ${on[1]} / ${on[2]} ms`);
      if(ck[0]>ckOwn+0.3 || ck[1]>ckOwn+0.3) miss(`${id}: a click on the return: ${ck[0].toFixed(3)} / ${ck[1].toFixed(3)} against its own worst ${ckOwn.toFixed(3)}`);
      if(!(on[3]>=on[0]+60)) miss(`CONTROL: a reconnect 120 ms late read onset ${on[3]} against ${on[0]} ms: the lost-attack test cannot fail`);
      if(id==='solo.breath-flute'){ const cut2=await ren((eng,E,add)=>{ const i=prep(eng,id); eng.setLeanPath({ park:true }); eng.leadOn('a',F,0.9,i,off,off,off,off,0.05); add(0.5,()=>{ const v=E.pool.ld.v[0]; v.banks[i].gain.disconnect(v.pre); }); },1); n++; const cc=clickOf(cut2.x,rate); notes.push(`CONTROL flute disconnected mid-note: click ${cc.toFixed(3)}`); if(!(cc>ckOwn+0.3)) miss(`CONTROL: a mid-note disconnect reads ${cc.toFixed(3)}: the click test cannot fail`); }
    }
    /* parking counts, and idle work falls */
    { const R=await import('../../../core/render.js'), id='solo.breath-flute'; const idle=mode=>R.engineProbe(async(eng,ctx)=>{ const rate=ctx.sampleRate, i=prep(eng,id,{ ids:[] }); if(mode) eng.setLeanPath({ park:true }); for(let q=0;q<4;q++){ eng.leadOn('b'+q,330,0.6,i,off,off,off,off,0.01); eng.leadOff('b'+q,off,0.05); }
        let parked=0, t0=0, t1=0; ctx.suspend(Math.floor(3.2*rate/128)*128/rate).then(()=>{ if(mode){ eng.leadParkTick(3.2); parked=eng.leanInfo().parked; } t0=performance.now(); ctx.resume(); }); ctx.suspend(Math.floor(5*rate/128)*128/rate).then(()=>{ t1=performance.now(); ctx.resume(); }); await ctx.startRendering(); return { ms:t1-t0, parked }; },{ sec:5.2 });
      let o=Infinity, p=Infinity, c=0; for(let k=0;k<3;k++){ o=Math.min(o,(await idle(false)).ms); const r=await idle(true); p=Math.min(p,r.ms); c=r.parked; } n+=2; notes.push(`4 flute voices silent: ${o.toFixed(0)} ms → ${p.toFixed(0)} ms for 2 s of work, ${c} banks parked`);
      if(c!==4) miss(`${c} of 4 silent flute banks parked`); if(!(p<o*0.8)) miss(`parking saved little: ${o.toFixed(0)} → ${p.toFixed(0)} ms`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  finally{ const w=profileApply(was||'profile.night'); if(w) d.push('could not restore the profile: '+w); }
  return { cases:n, total:d.length, differences:d, notes };
}
/* NIGHT-1 stage 3: row «NIGHT quiet floor» (P.night; slow, offline). Off unless asked: Night's face leaves it off, and Full's strike ignores it. On, at −70 dBFS: what the floor takes away stays below −60 dBFS at its worst sample, strikes end sooner, and nothing is added. CONTROL: a floor at −30 dBFS must break that bound. */
export async function checkQuietFloor(){
  const d=[], notes=[]; let n=0; const miss=s=>d.push(s), peak=(a,b)=>{ let m=0; for(let i=0;i<a.length;i++){ const v=Math.abs(a[i]-b[i]); if(v>m) m=v; } return m>0 ? 20*Math.log10(m) : -Infinity; };
  const go=(id,floor,o={})=>ren((eng,E,add)=>{ const i=prep(eng,id,o); eng.setLeanPath(ON); if(floor!=null) eng.setPartialFloor(floor); let last=0; for(let k=0;k<4;k++){ const t=0.05+k*1.5; add(t-0.02,()=>{ eng.leadOn('h',HIGH[k%5],1,i,off,off,off,off,t); eng.leadOff('h',off,t+0.3); const s=E.pool.ld.strikes.find(x=>x.t===t); if(s) last=Math.max(last,s.end-t); }); } return { ends:()=>last }; },9);
  try{
    const was=profileCurrent(), why=profileApply('profile.night'); if(why) throw new Error(why); n++; { const E=(await import('../../../core/audio.js')).engineCtx(); if(E.partialFloor) miss("Night's face turned the quiet floor on: players must not get it yet"); } profileApply(was||'profile.night');
    for(const id of ['solo.firefly','solo.handpan','solo.singing-bowl']){ const a=await go(id,null), b=await go(id,-70), p=peak(a.x,b.x); n+=2; notes.push(`${id}: at −70 dBFS the worst difference is ${p.toFixed(1)} dBFS; the longest strike ${a.out.ends().toFixed(2)} → ${b.out.ends().toFixed(2)} s`);
      if(!(p<=-60)) miss(`${id}: the floor takes away ${p.toFixed(1)} dBFS (≤ −60 expected)`); if(!(b.out.ends()<a.out.ends())) miss(`${id}: strikes don't end sooner (${a.out.ends().toFixed(2)} → ${b.out.ends().toFixed(2)} s)`); }
    { const a=await go('solo.singing-bowl',null), c=await go('solo.singing-bowl',-30), p=peak(a.x,c.x); n++; notes.push(`CONTROL floor −30 dBFS: ${p.toFixed(1)} dBFS`); if(!(p>-60)) miss(`CONTROL: a floor at −30 dBFS takes away only ${p.toFixed(1)} dBFS: the bound cannot fail`); }
    /* Full's strike (no Night caps) ignores it */
    { const full=(fl)=>ren((eng,E,add)=>{ eng.offlineTapMaster(); const i=eng.LEAD_INSTR.findIndex(x=>x.id==='solo.handpan'); if(fl!=null) eng.setPartialFloor(fl); eng.applyFx({}); eng.leadOn('h',440,1,i,off,off,off,off,0.05); eng.leadOff('h',off,0.35); return null; },6); const a=await full(null), b=await full(-70), r=residualDb(a.x,b.x); n++; notes.push(`Full's strike with the floor set: ${r} dB`); if(!(r<=-100)) miss(`Full's strike follows the floor: ${r} dB`); }
  } catch(e){ miss('error: '+(e&&e.stack||e)); }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.967, night:true, slow:true, name:'NIGHT quiet floor', run:()=>checkQuietFloor(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
row({ at:1009.965, night:true, slow:true, name:'NIGHT lean path', run:()=>checkNightLean(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
