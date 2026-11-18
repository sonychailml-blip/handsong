/* AUDIO-2 — «RAIN hand events and the bed» (slow): the founder hears the rain's sound drop out, often when a hand enters or leaves the frame.
   (A) 50 HAND ENTER / LEAVE CYCLES in the rain (Standard, the music held: its bar-by-bar note bursts are not the hand's), near and far by turns, through the real gesture path (the probe clock): what
       is created in the 150 ms after each event is counted per creating site (audio nodes and buffers, WebGL programs, shaders, textures, buffers)
       against the same count after 100 random moments with no hand — nothing may be tied to the events (a site at most HAND.slack more than its
       baseline); no WebGL program or shader at all; no main-thread task over HAND.longMs (my limit, headless). CONTROL: a GainNode planted on every
       event must be caught. MediaPipe's own per-frame texture and framebuffer (every detected frame, hand or not) are reported, not judged.
   (B) THE BED UNDER A STALL: the lo-fi bed's notes are built on the main thread a whole bar at a time once the bar is within the look-ahead
       (bed2.js LOFI_AHEAD). A 1-s main-thread stall timed 0.7 s before each of 6 bar lines must leave NO bed note late (bed2LofiDbg late = 0).
       CONTROL: the old look-ahead (0.6 s) must give late notes. Every wait has an upper limit. */
import { row } from '../core/rows.js';

export const HAND=Object.freeze({ cycles:50, inMs:500, outMs:500, winMs:150, slack:12, longMs:300, stalls:6, stallMs:1000, before:0.7 });
const wait=ms=>new Promise(r=>setTimeout(r, ms));
const busy=ms=>{ const t=performance.now(); while(performance.now()-t<ms){} };
/* the instrumentation: every creation counted by its creating site while `on` (restored after) */
function instrument(){ const C={ on:false, log:[] }, undo=[];
  const site=()=>{ const s=(new Error().stack||'').split('\n').slice(3).find(l=>/(apps|core)\//.test(l) && !/tools\/probes/.test(l))||''; const m=s.match(/(apps|core)\/[^:)]+:\d+/); return m ? m[0] : 'other'; };
  const add=k=>{ if(C.on) C.log.push([performance.now(), k+' @ '+site()]); };
  const wrap=(o, k, tag)=>{ const f=o[k]; if(typeof f!=='function') return; o[k]=function(...a){ add(tag); return f.apply(this, a); }; undo.push(()=>{ o[k]=f; }); };
  for(const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)) if(/^create/.test(k)) wrap(BaseAudioContext.prototype, k, 'audio.'+k);
  for(const GL of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) if(GL) for(const k of ['createProgram', 'createShader', 'createTexture', 'createBuffer', 'createFramebuffer']) wrap(GL.prototype, k, 'gl.'+k);
  const LT=[], po=new PerformanceObserver(l=>{ for(const e of l.getEntries()) if(C.on) LT.push(e.duration); }); try{ po.observe({ type:'longtask', buffered:false }); }catch(e){}
  C.LT=LT; C.restore=()=>{ for(const u of undo.reverse()) u(); try{ po.disconnect(); }catch(e){} }; return C; }
/* the counts per site inside the windows [t, t+w) */
const inWindows=(log, times, w)=>{ const o={}; for(const [t, k] of log) if(times.some(s=>t>=s && t<s+w)) o[k]=(o[k]||0)+1; return o; };
async function cycles(C, plant){ const G=await import('../../../core/gestures.js'), PO=await import('../../../core/gestures/pose.js'), V=await import('../../../core/vision.js'), A=await import('../../../core/audio.js');
  const clk={ t:7e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true); let hand=null;
  const pump=setInterval(()=>{ clk.t+=1000/30; clk.W=V.canvas.width; clk.H=V.canvas.height; G.processHandsProbe(hand ? { landmarks:[PO.pose(hand)], handednesses:[[{ categoryName:'Right' }]] } : { landmarks:[], handednesses:[] }); }, 1000/30);
  const ev=[], rnd=[]; C.log.length=0; C.LT.length=0;
  try{ C.on=true; const t0=performance.now(), base=HAND.cycles*(HAND.inMs+HAND.outMs)*0.5; for(let i=0;i<2*HAND.cycles;i++) rnd.push(t0+Math.random()*(base-HAND.winMs)); await wait(base);   // the baseline: no hand
    for(let i=0;i<HAND.cycles;i++){ ev.push(performance.now()); hand={ x:0.6, y:0.5, s: i%2 ? 0.12 : 0.3, gaps:[1, 1, 1, 1] }; if(plant){ const g=A.AC.createGain(); g.disconnect(); }
      await wait(HAND.inMs); ev.push(performance.now()); hand=null; if(plant){ const g=A.AC.createGain(); g.disconnect(); } await wait(HAND.outMs); } }
  finally{ C.on=false; clearInterval(pump); G.handsProbe(null); }
  const E=inWindows(C.log, ev, HAND.winMs), B=inWindows(C.log, rnd, HAND.winMs), tied=[];
  const mp=[]; for(const [k, n] of Object.entries(E)){ if(!(n-(B[k]||0)>HAND.slack)) continue; (/core\/vendor\/mediapipe\//.test(k) ? mp : tied).push(`${k}: ${n} after the hand events, ${B[k]||0} after random moments`); }   // MediaPipe makes a texture and a framebuffer for EVERY frame it detects (its own code): reported, not judged
  const gl=C.log.filter(([, k])=>/gl\.create(Program|Shader)/.test(k)).map(([, k])=>k);
  return { tied, mp, gl, longMax:Math.round(Math.max(0, ...C.LT)), longN:C.LT.length, events:ev.length }; }
async function stalls(){ const BD=await import('../../../apps/night/bed2.js'), A=await import('../../../core/audio.js'); BD.bed2LofiDbg({ reset:true }); const done=[];
  for(let k=0;k<HAND.stalls;k++){ const D=BD.bed2LofiDbg(), pl=D.players[D.players.length-1]; if(!pl) break;
    const bar=D.origin+pl.at, at=bar-HAND.before; const lim=performance.now()+15000; while(A.AC.currentTime<at && performance.now()<lim) await wait(5);
    if(A.AC.currentTime>bar-0.2){ await wait(300); continue; }   // missed the moment: try the next bar
    busy(HAND.stallMs); done.push(+(bar-A.AC.currentTime).toFixed(2)); await wait(1500); }
  const D=BD.bed2LofiDbg(); return { late:D.late, skipped:D.skipped, worst:+D.worst.toFixed(3), stalls:done.length, ahead:D.ahead }; }
export async function checkRainHands(){ const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); return !!c; };
  const PR=await import('../../../core/profile.js'), H=await import('../../../apps/night/scene/host.js'), RS=await import('../../../apps/night/roomswitch.js'), BD=await import('../../../apps/night/bed.js'), B2=await import('../../../apps/night/bed2.js'), SH=await import('../../../apps/night/shell.js');
  const was=PR.profileCurrent(), room0=H.sceneRoom(), bg0=H.backgroundOf ? H.backgroundOf() : null, hold=SH.nightMusicHoldDbg(false), C=instrument();
  try{
    if(PR.profileCurrent()!=='profile.night'){ const why=PR.profileApply('profile.night'); if(why){ ok('Night did not apply: '+why, false); return { cases:n, total:d.length, differences:d, notes }; } }
    if(H.sceneRoom()!=='room.rain') await RS.roomSwitch('room.rain', { fast:true });
    await H.setBackground('forest'); if(BD.bedModeOf()==='off') document.getElementById('nightMusic').click(); SH.nightMusicHoldDbg(false);   // the runner holds the music off; a room switch keeps that hold
    { const lim=performance.now()+30000; while(!(B2.bed2LofiDbg().on && B2.bed2LofiDbg().players.length) && performance.now()<lim) await wait(200); }
    ok('the rain’s lo-fi bed did not start within 30 s', B2.bed2LofiDbg().on); await wait(3000);
    /* (A) */
    SH.nightMusicHoldDbg(true); await wait(2500);   // (A) with the music held: the bed builds each bar's notes in one burst, which can land in an event's window by chance
    const A1=await cycles(C, false);
    ok(`${A1.tied.length} creating site(s) tied to the hand events: ${A1.tied.slice(0, 4).join('; ')}`, !A1.tied.length);
    ok(`WebGL programs or shaders made during the cycles: ${A1.gl.slice(0, 4).join(', ')}`, !A1.gl.length);
    ok(`a main-thread task of ${A1.longMax} ms during the cycles (limit ${HAND.longMs})`, A1.longMax<=HAND.longMs);
    notes.push(`(A) ${A1.events} hand events: no site of ours tied to them, no program or shader; ${A1.longN} long tasks, the longest ${A1.longMax} ms`+(A1.mp.length ? `; MediaPipe's per-frame textures (its own code, every detected frame): ${A1.mp[0]}` : ''));
    const Ac=await cycles(C, true); ok('CONTROL: a GainNode planted on every hand event was not caught', Ac.tied.some(s=>/createGain/.test(s))); notes.push('CONTROL (A): the planted node caught — '+(Ac.tied.find(s=>/createGain/.test(s))||'not caught'));
    /* (B) */
    SH.nightMusicHoldDbg(false); { const lim=performance.now()+30000; while(!(B2.bed2LofiDbg().on && B2.bed2LofiDbg().players.length) && performance.now()<lim) await wait(200); } await wait(3000);
    const S=await stalls(); ok(`only ${S.stalls} of ${HAND.stalls} stalls could be placed before a bar line`, S.stalls>=HAND.stalls-1);
    ok(`${S.late} bed note(s) came late after a ${HAND.stallMs}-ms stall (the latest ${S.worst} s; ${S.skipped} beat(s) skipped)`, S.late===0);
    notes.push(`(B) ${S.stalls} stalls of ${HAND.stallMs} ms, each ${HAND.before} s before a bar line: ${S.late} late notes (look-ahead ${S.ahead} s)`);
    B2.lofiAheadDbg(0.6); await wait(3000); const Sc=await stalls(); B2.lofiAheadDbg(null);
    ok(`CONTROL: the old look-ahead (0.6 s) gave no late note after ${Sc.stalls} stalls — the check cannot fail`, Sc.late>0);
    notes.push(`CONTROL (B): look-ahead 0.6 s → ${Sc.late} late notes (the latest ${Sc.worst} s), ${Sc.skipped} late beat(s) skipped instead of bunched`);
  } catch(e){ ok('error: '+(e && e.stack || e), false); }
  finally{ C.restore(); B2.lofiAheadDbg(null); SH.nightMusicHoldDbg(hold); try{ if(H.sceneRoom()!==room0) await RS.roomSwitch(room0, { fast:true }); if(bg0) await H.setBackground(bg0); }catch(e){} if(PR.profileCurrent()!==was) PR.profileApply(was||'profile.full'); }
  return { cases:n, total:d.length, differences:d, notes }; }
row({ at:1009.98657, night:true, slow:true, drawn:true, name:'RAIN hand events and the bed', run:()=>checkRainHands(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
export default async function(){ return checkRainHands(); }
