/* RAIN-4c / RAIN-4d: THE LO-FI BED'S SOUND (the rain room's; the player is apps/night/pure/lofi.js, the driver apps/night/bed2.js). Web Audio, built once
   per context, fetched only with the room. RAIN-4d (the founder: the bed's FM-sample piano «very bad», the guitar «a cheap parody»; our own synthesis
   where it can sound good):
   - THE ELECTRIC PIANO is the hand's own: core's tine engine (core/modules/timbres/tine.js buildTineBank — the same code) with the hand's own record
     (rooms/rain/timbres/e-piano.json); per note a velocity table (soft: the upper partials and the bark down — mellow; hard: up — bark), a slight
     detune (±3 cents, seeded) and a soft release noise (the damper falling);
   - THE NYLON GUITAR is a physical model (our own, from published methods): an extended plucked string (Karplus–Strong with Jaffe and Smith's
     extensions) — a pluck-position comb on the excitation, string damping by frequency (a decay time per pitch and a loop low-pass), a fractional
     delay (an all-pass) for exact tuning, a soft finger noise at the attack — then the body (three resonances and a gentle high cut) and a slight
     vibrato on held notes;
   - the room's CC0 recordings stay for the bass, the vibraphone, the bass drum and the hi-hat; the snare, rim, shaker, open hat and the vinyl are
     generated (RAIN-4c);
   - THE EFFECTS, per track like a lo-fi producer's: the piano through a chorus, a tremolo and an auto-pan; the guitar and the vibraphone through a
     tape delay; the drums high-cut and lightly saturated; a shared warm reverb; the master through a tape (wow and flutter), a soft saturation and a
     gentle compression; slow oscillators let the tremolo, the delay's feedback and the master's high cut BREATHE. The forest's chain is untouched
     (this engine is the rain room's only).
   One-shot sources per note (rule #3's per-hit exception; the tine bank's strikes are core's own sanctioned exception); the slow oscillators start once
   and never stop. Every pitch from the piece's parent view (rule #2). o.legacy: { ep:true } the RAIN-4c sampled piano, { gtr:true } the plain plucked
   string — the listening page's old versions only. */
import { chordRowFreq } from '../../../../core/scales.js';
import { buildTineBank } from '../../../../core/modules/timbres/tine.js';
import { JAZZ_N } from '../../pure/bedjazz.js';
import { sampledLoad } from './sampled.js';

/* levels and colours (by ear against the listening page; my choices) */
export const LOFI_MIX=Object.freeze({ ep:0.06, epOld:0.075, bass:0.07, kick:0.1, snare:0.04, rim:0.05, ghost:0.04, hat:0.027, ohat:0.024, shaker:0.024, vib:0.03, gtr:0.12,
  crackle:0.02, roll:0.011, pump:Object.freeze({ keys:0.26, bass:0.12, tc:0.12 }),
  wet:Object.freeze({ ep:0.3, bass:0.03, beat:0.07, vib:0.4, gtr:0.28 }),
  chorus:Object.freeze({ wet:0.42, d:0.014, depth:0.0026, hz:Object.freeze([0.62, 0.83]) }), trem:Object.freeze({ hz:3.6, depth:0.13, pan:0.32, panHz:0.17 }),
  delay:Object.freeze({ beats:0.75, fb:0.36, wet:0.3, lp:2400, hp:280 }),
  tape:Object.freeze({ base:0.006, wow:0.0009, wowHz:0.5, flutter:0.0001, flutterHz:6.1 }), keys:Object.freeze({ lp:4200, drive:1.5 }),
  beat:Object.freeze({ lp:6500, drive:1.4 }), bus:Object.freeze({ lp:9500, drive:1.12 }), comp:Object.freeze({ thr:-20, ratio:2.2, knee:12, att:0.02, rel:0.3 }),
  breath:Object.freeze({ hz:Object.freeze([0.031, 0.023, 0.017]) }) });
const mod=(s, n)=>((s%n)+n)%n;
const rng=seed=>{ let s=seed>>>0||1; return ()=>{ s=Math.imul(s^(s>>>15), 2246822507)>>>0; s=Math.imul(s^(s>>>13), 3266489909)>>>0; return ((s^=s>>>16)>>>0)/4294967296; }; };
const buf=(ac, sec, ch, fill)=>{ const b=ac.createBuffer(ch, Math.max(1, Math.round(sec*ac.sampleRate)), ac.sampleRate); for(let c=0;c<ch;c++) fill(b.getChannelData(c), ac.sampleRate, c); return b; };
const curve=k=>{ const n=1024, c=new Float32Array(n), t=Math.tanh(k); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x)/t; } return c; };
function generated(ac){ const out={};
  out.snare=buf(ac, 0.4, 1, (d, sr)=>{ const r=rng(0x534E52); let lp=0, hp=0, px=0; for(let i=0;i<d.length;i++){ const t=i/sr, n=r()*2-1; lp+=0.45*(n-lp); hp=0.92*(hp+lp-px); px=lp;
      d[i]=hp*Math.exp(-t/0.075)*0.8+(Math.sin(2*Math.PI*186*t)*0.6+Math.sin(2*Math.PI*331*t)*0.25)*Math.exp(-t/0.045); } });
  out.rim=buf(ac, 0.14, 1, (d, sr)=>{ const r=rng(0x52494D); for(let i=0;i<d.length;i++){ const t=i/sr; d[i]=(Math.sin(2*Math.PI*1720*t)*0.55+Math.sin(2*Math.PI*830*t)*0.45)*Math.exp(-t/0.014)+(r()*2-1)*Math.exp(-t/0.0035)*0.6; } });
  out.shaker=buf(ac, 0.2, 1, (d, sr)=>{ const r=rng(0x534841); let px=0, hp=0; for(let i=0;i<d.length;i++){ const t=i/sr, n=r()*2-1; hp=0.7*(hp+n-px); px=n; d[i]=hp*Math.min(1, t/0.018)*Math.exp(-Math.max(0, t-0.018)/0.05)*0.7; } });
  out.ohat=buf(ac, 0.6, 1, (d, sr)=>{ const r=rng(0x4F4841); let px=0, hp=0; for(let i=0;i<d.length;i++){ const t=i/sr, n=r()*2-1; hp=0.55*(hp+n-px); px=n;
      d[i]=(hp*0.7+0.3*Math.sign(Math.sin(2*Math.PI*5400*t))*Math.sign(Math.sin(2*Math.PI*7930*t))*(r()*0.5+0.5))*Math.exp(-t/0.2)*0.5; } });
  out.crackle=buf(ac, 7, 2, (d, sr, c)=>{ const r=rng(0x56494E+c*977); let lp=0; for(let i=0;i<d.length;i++){ lp+=0.08*((r()*2-1)-lp); d[i]=lp*0.12; }
    for(let k=0;k<7*11;k++){ const at=Math.floor(r()*d.length), a=(r()<0.12 ? 0.9 : 0.25+r()*0.35)*(r()<0.5 ? -1 : 1), L=Math.floor(sr*(0.0006+r()*0.0012));
      for(let j=0;j<L && at+j<d.length;j++) d[at+j]+=a*Math.exp(-j/(L*0.3))*(j%2 ? -0.6 : 1); } });
  out.ir=buf(ac, 2.4, 2, (d, sr, c)=>{ const r=rng(0x495252+c); let lp=0; for(let i=0;i<d.length;i++){ const t=i/sr; lp+=(0.28-0.2*Math.min(1, t/2))*((r()*2-1)-lp); d[i]=lp*Math.exp(-t/0.55)*0.55*Math.min(1, t/0.012); } });   // warm: darker as it decays
  out.thunk=buf(ac, 0.05, 1, (d, sr)=>{ const r=rng(0x544855); let lp=0, hp=0, px=0; for(let i=0;i<d.length;i++){ const t=i/sr, n=r()*2-1; lp+=0.3*(n-lp); hp=0.9*(hp+lp-px); px=lp; d[i]=hp*Math.exp(-t/0.012)*0.5; } });   // the damper's soft release noise
  return out; }
/* RAIN-4c's plain plucked string (the listening page's old guitar only) */
function pluckOld(ac, hz){ const sr=ac.sampleRate, N=Math.max(2, Math.round(sr/hz)), b=ac.createBuffer(1, Math.round(sr*1.8), sr), d=b.getChannelData(0), r=rng(Math.round(hz*100)), line=new Float32Array(N);
  let lp=0; for(let i=0;i<N;i++){ lp+=0.5*((r()*2-1)-lp); line[i]=lp; }
  for(let i=0, k=0;i<d.length;i++){ const a=line[k], n=line[(k+1)%N]; d[i]=a; line[k]=0.4985*(a+n)*0.999; k=(k+1)%N; }
  let m=0; for(let i=0;i<d.length;i++) m=Math.max(m, Math.abs(d[i])); if(m>0) for(let i=0;i<d.length;i++) d[i]*=0.8/m; return b; }
/* THE NYLON STRING (a physical model): hz, vel 0…1 → a buffer. The excitation: noise of one period, darker when soft, through a pluck-position comb
   (plucked at beta of the string: its harmonics at multiples of 1/beta cancel); the loop: the integer delay, a two-point low-pass (half a sample), an
   all-pass for the fractional rest (exact tuning), and a loop gain from the decay time at that pitch (T60 3.6 s at 110 Hz, ∝ 1/√f); a 4-ms finger noise */
export const NYLON=Object.freeze({ beta:0.17, t60:3.6, ref:110, sec:2.8, finger:0.06 });
export function nylonBuffer(ac, hz, vel=0.6){ const sr=ac.sampleRate, N=sr/hz, D=Math.max(2, Math.floor(N-0.6)), dfr=N-D-0.5, C=(1-dfr)/(1+dfr), b=ac.createBuffer(1, Math.round(sr*NYLON.sec), sr), y=b.getChannelData(0);
  const r=rng(Math.round(hz*1000)+Math.round(vel*7)), L=Math.round(N), ex=new Float32Array(L), soft=0.18+0.5*vel; let lp=0; for(let i=0;i<L;i++){ lp+=soft*((r()*2-1)-lp); ex[i]=lp; }
  const P=Math.max(1, Math.round(NYLON.beta*N)); for(let i=L-1;i>=P;i--) ex[i]-=ex[i-P];
  const g=Math.pow(10, -3/(NYLON.t60*Math.sqrt(NYLON.ref/hz)*hz)), M=D+2, line=new Float32Array(M); let w=0, prev=0, apIn=0, apOut=0;
  for(let n=0;n<y.length;n++){ const a=line[(w-D+M)%M], lp2=0.5*(a+prev); prev=a; const ap=C*lp2+apIn-C*apOut; apIn=lp2; apOut=ap; const v=(n<L ? ex[n] : 0)+g*ap; line[w]=v; w=(w+1)%M; y[n]=v; }
  const fr=rng(0x46494E+Math.round(hz)); for(let n=0;n<Math.min(y.length, Math.round(sr*0.004));n++) y[n]+=(fr()*2-1)*NYLON.finger*vel*(1-n/(sr*0.004));
  let m=0; for(let i=0;i<y.length;i++) m=Math.max(m, Math.abs(y[i])); if(m>0) for(let i=0;i<y.length;i++) y[i]*=0.8*Math.pow(vel, 0.6)/m;
  for(let i=y.length-Math.round(sr*0.05);i<y.length;i++) y[i]*=(y.length-i)/(sr*0.05);
  return b; }
/* the piano's three velocity tables from the hand's record: soft — the upper partials ×0.45 and the bark ×0.25; hard — ×1.35 and ×2.2 */
const velTables=R=>['soft', 'mid', 'hard'].map(k=>({ ...R, partials:R.partials.map(([ratio, a, dec, w], i)=>[ratio, i===0 ? a : a*(k==='soft' ? (ratio>10 ? 0.25 : 0.45) : k==='hard' ? (ratio>10 ? 2.2 : 1.35) : 1), dec*(k==='soft' ? 0.9 : 1), w]) }));
/* the engine in context ac, into dest; base: the room folder's URL → a promise of { play(ev, when, pv, k), layer, level, tempo(bpm), out, state() } */
export async function lofiEngine(ac, dest, base, o={}){ const leg=o.legacy||{}, S=await sampledLoad(ac, base), G=generated(ac), M=LOFI_MIX, P=new Map();
  const rec=await (await fetch(new URL('timbres/e-piano.json', base))).json();
  const g=v=>{ const n=ac.createGain(); n.gain.value=v; return n; }, flt=(type, hz, q=0.7, gain=0)=>{ const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=hz; f.Q.value=q; f.gain.value=gain; return f; },
    sat=k=>{ const w=ac.createWaveShaper(); w.curve=curve(k); w.oversample='2x'; return w; }, lfo=(hz, depth, into, type='sine')=>{ const s=ac.createOscillator(), d=g(depth); s.type=type; s.frequency.value=hz; s.connect(d); d.connect(into); s.start(); return d; };
  /* the master: bus → high cut → saturation → tape (wow, flutter) → gentle compression → level */
  const out=g(0), busLp=flt('lowpass', M.bus.lp, 0.4), busSat=sat(M.bus.drive), tape=ac.createDelay(0.05), comp=ac.createDynamicsCompressor();
  tape.delayTime.value=M.tape.base; lfo(M.tape.wowHz, M.tape.wow, tape.delayTime); lfo(M.tape.flutterHz, M.tape.flutter, tape.delayTime);
  comp.threshold.value=M.comp.thr; comp.ratio.value=M.comp.ratio; comp.knee.value=M.comp.knee; comp.attack.value=M.comp.att; comp.release.value=M.comp.rel;
  busLp.connect(busSat); busSat.connect(tape); tape.connect(comp); comp.connect(out); out.connect(dest);
  lfo(M.breath.hz[2], 900, busLp.frequency);   // the master's high cut breathes (±900 Hz over a minute)
  const verb=ac.createConvolver(); verb.buffer=G.ir; verb.connect(busLp);
  const L={ ep:g(1), vib:g(1), gtr:g(1), bass:g(1), beat:g(1), crackle:g(0) }, pumpK=g(1), pumpB=g(1);
  /* the piano: a chorus (two slowly moving delays beside the dry), a tremolo and an auto-pan (their depth breathing), a soft high cut and saturation */
  const epIn=g(1), chorusOut=g(1), trem=g(1), pan=ac.createStereoPanner(), keysLp=flt('lowpass', M.keys.lp, 0.5), keysSat=sat(M.keys.drive);
  epIn.connect(chorusOut); for(const hz of M.chorus.hz){ const dl=ac.createDelay(0.05), wg=g(M.chorus.wet); dl.delayTime.value=M.chorus.d; lfo(hz, M.chorus.depth, dl.delayTime); epIn.connect(dl); dl.connect(wg); wg.connect(chorusOut); }
  const td=lfo(M.trem.hz, M.trem.depth, trem.gain); lfo(M.breath.hz[0], M.trem.depth*0.7, td.gain); lfo(M.trem.panHz, M.trem.pan, pan.pan);
  L.ep.connect(epIn); chorusOut.connect(trem); trem.connect(pan); pan.connect(keysLp); keysLp.connect(keysSat); keysSat.connect(pumpK); pumpK.connect(busLp);
  /* the guitar (its body) and the vibraphone, each with the tape delay: a beat-timed echo, its feedback darkened, its time wavering, its feedback breathing */
  const body=[flt('highpass', 75, 0.7), flt('peaking', 100, 1.4, 7), flt('peaking', 205, 2.5, 5), flt('peaking', 420, 3, 3), flt('lowpass', 5600, 0.6)]; L.gtr.connect(body[0]); for(let i=1;i<body.length;i++) body[i-1].connect(body[i]);
  const dIn=g(1), dl=ac.createDelay(2), fb=g(M.delay.fb), dlp=flt('lowpass', M.delay.lp, 0.6), dhp=flt('highpass', M.delay.hp, 0.6), dWet=g(M.delay.wet);
  dl.delayTime.value=0.5; lfo(0.4, 0.0012, dl.delayTime); dIn.connect(dl); dl.connect(dlp); dlp.connect(dhp); dhp.connect(fb); fb.connect(dl); dhp.connect(dWet); dWet.connect(pumpK); lfo(M.breath.hz[1], 0.1, fb.gain);
  body[body.length-1].connect(pumpK); body[body.length-1].connect(dIn); L.vib.connect(pumpK); L.vib.connect(dIn);
  const bassLp=flt('lowpass', 1400, 0.6); L.bass.connect(bassLp); bassLp.connect(pumpB); pumpB.connect(busLp);
  const beatLp=flt('lowpass', M.beat.lp, 0.5), beatSat=sat(M.beat.drive); L.beat.connect(beatLp); beatLp.connect(beatSat); beatSat.connect(busLp);
  const cr=ac.createBufferSource(); cr.buffer=G.crackle; cr.loop=true; const crg=g(M.crackle); cr.connect(crg); crg.connect(L.crackle); L.crackle.connect(busLp); cr.start();
  for(const [k, v] of Object.entries(M.wet)){ const s=g(v); (k==='gtr' ? body[body.length-1] : L[k]).connect(s); s.connect(verb); }
  /* the piano's voices: tine banks from core (one strike each; a pool round-robin), each into its own release envelope and pan */
  const E={ ac, build:{ banks:[], vib:null, hum:null, shim:null }, lfo:{}, nightLean:false }, TB=velTables(rec.recipe), banks=[];
  for(let v=0;v<3;v++) for(let i=0;i<10;i++){ const pre=g(1); E.build.banks=[]; buildTineBank(E, pre, TB[v], rec.id); const bk=E.build.banks[0]; bk.gain.gain.value=1; const env=g(0), p=ac.createStereoPanner(); pre.connect(env); env.connect(p); p.connect(L.ep); banks.push({ v, bk, env, p }); }
  const next=[0, 0, 0];
  const nearest=(list, hz)=>list.reduce((a, b)=>Math.abs(Math.log(b[0]/hz))<Math.abs(Math.log(a[0]/hz)) ? b : a);
  const one=(bufr, into, when, rate, gain, pan, dur, rel, vib)=>{ const s=ac.createBufferSource(), e=ac.createGain(), p=ac.createStereoPanner(); s.buffer=bufr; s.playbackRate.value=rate; p.pan.value=Math.max(-1, Math.min(1, pan||0));
    if(vib && dur>0.45){ const n=Math.ceil((dur-0.3)*40), c=new Float32Array(n); for(let i=0;i<n;i++) c[i]=rate*(1+0.0023*Math.sin(i/40*2*Math.PI*5.2)*Math.min(1, i/20)); try{ s.playbackRate.setValueCurveAtTime(c, when+0.3, dur-0.3); }catch(e){} }
    e.gain.setValueAtTime(gain, when); if(dur!=null){ e.gain.setValueAtTime(gain, when+dur); e.gain.setTargetAtTime(0, when+dur, rel/4); } s.connect(e); e.connect(p); p.connect(into); s.start(when); s.stop(when+(dur!=null ? dur+rel : bufr.duration/rate)+0.02); };
  let notes=0, beat=60/80; const det=rng(0x444554);
  function play(ev, when, pv, k=1){ const hz=s=>chordRowFreq(mod(s, JAZZ_N), Math.floor(s/JAZZ_N), pv); notes++;
    if(ev.kind==='ep'){ const n=ev.steps.length; ev.steps.forEach((s, i)=>{ const f=hz(s), t=when+i*M.roll, vel=ev.vel;
        if(leg.ep){ const [r0, nm]=nearest(S.notes.ep, f); one(S.buf[nm], L.ep, t, f/r0, k*M.epOld*vel/Math.sqrt(n), (ev.pan||0)+(i-(n-1)/2)*0.16, ev.dur, 0.6); return; }
        const v= vel<0.36 ? 0 : vel<0.5 ? 1 : 2, b=banks.filter(x=>x.v===v)[next[v]++%10];
        b.bk.setFreq(f*Math.pow(2, (det()-0.5)*6/1200), 0, t); b.bk.strike(t, Math.min(1, k*vel*1.6/Math.sqrt(n)));
        b.p.pan.setValueAtTime(Math.max(-1, Math.min(1, (ev.pan||0)+(i-(n-1)/2)*0.16)), t); b.env.gain.cancelScheduledValues(t); b.env.gain.setValueAtTime(M.ep, t); b.env.gain.setValueAtTime(M.ep, t+ev.dur); b.env.gain.setTargetAtTime(0, t+ev.dur, 0.12);
        one(G.thunk, L.ep, t+ev.dur, 1+(det()-0.5)*0.2, k*0.012*vel, b.p.pan.value, null, 0); }); }
    else if(ev.kind==='bass'){ const f=hz(ev.step), [r0, nm]=nearest(S.notes.bass, f); one(S.buf[nm], L.bass, when, f/r0, k*M.bass*ev.vel, ev.pan, ev.dur, 0.12); }
    else if(ev.kind==='vib'){ const f=hz(ev.step), [r0, nm]=nearest(S.notes.vib, f); one(S.buf[nm], L.vib, when, f/r0, k*M.vib*ev.vel, ev.pan, ev.dur*1.5, 0.7); }
    else if(ev.kind==='gtr'){ const f=hz(ev.step); if(leg.gtr){ const key='o'+Math.round(f*10); if(!P.has(key)) P.set(key, pluckOld(ac, f)); one(P.get(key), L.gtr, when, 1, k*0.07*ev.vel, ev.pan, Math.max(0.35, ev.dur*1.4), 0.25); return; }
      const vb=Math.min(2, Math.floor(ev.vel*3)), key=Math.round(f*10)+':'+vb; if(!P.has(key)) P.set(key, nylonBuffer(ac, f, [0.35, 0.6, 0.85][vb])); one(P.get(key), L.gtr, when, 1, k*M.gtr, ev.pan, Math.max(0.4, ev.dur*1.5), 0.3, true); }
    else if(ev.kind==='drum'){ const d=ev.drum, v=k*ev.vel;
      if(d==='kick') one(S.buf.kick, L.beat, when, 0.94, v*M.kick, 0, null, 0);
      else if(d==='snare' || d==='ghost') one(G.snare, L.beat, when, d==='ghost' ? 1.04 : 1, v*(d==='ghost' ? M.ghost : M.snare), ev.pan, null, 0);
      else if(d==='rim') one(G.rim, L.beat, when, 1, v*M.rim, ev.pan, null, 0);
      else if(d==='hat') one(S.buf['hat-foot'], L.beat, when, 1.06, v*M.hat, ev.pan, 0.09, 0.04);
      else if(d==='ohat') one(G.ohat, L.beat, when, 1, v*M.ohat, ev.pan, null, 0);
      else if(d==='shaker') one(G.shaker, L.beat, when, 1, v*M.shaker, ev.pan, null, 0); }
    else if(ev.kind==='pump'){ const a=Math.min(1, ev.vel||0); for(const [n, depth] of [[pumpK, M.pump.keys], [pumpB, M.pump.bass]]){ n.gain.setValueAtTime(1-depth*a, when); n.gain.setTargetAtTime(1, when+0.006, M.pump.tc); } }
    else if(ev.kind==='layer' && ev.layer==='crackle'){ const p=L.crackle.gain; p.setValueAtTime(p.value, when); p.linearRampToValueAtTime(ev.gain, when+ev.ramp); } }
  const layer=(name, v, when, ramp=0)=>{ if(!L[name]) return; const p=L[name].gain; p.cancelScheduledValues(when); p.setValueAtTime(ramp ? p.value : v, when); if(ramp) p.linearRampToValueAtTime(v, when+ramp); };
  const level=(v, when, tc=1.2)=>{ out.gain.setTargetAtTime(v, when, tc/3); };
  /* the piece's tempo: the tape delay's time (a dotted eighth) */
  const tempo=(bpm, when=ac.currentTime)=>{ beat=60/bpm; dl.delayTime.setTargetAtTime(Math.min(1.9, beat*M.delay.beats), when, 0.3); };
  return { play, layer, level, tempo, out, state:()=>({ notes, plucks:P.size, banks:banks.length }) }; }
