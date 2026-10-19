/* RUN 7 (Calm sound pass) — the MODAL engine type: struck instruments (handpan, singing bowl, kalimba, a richer Firefly) by modal synthesis.
   An ENGINE SUBMODULE (hard rule #38): stateless — every engine value comes from E (first argument); the bank object lives on its voice.
   A struck body is a sum of decaying sine modes (measured partial ratios, gains, T60 decays) excited by a short filtered noise burst (the
   mallet / finger) that also rings a fixed body resonance. Like the tine (C4a) each STRIKE makes its own mode oscillators — the sanctioned
   rule-#3 exception of struck timbres (no sustain to gate) — into the bank's lowpass → gate → the voice's stages (vibrato / humanisation taps
   on each mode's detune, disconnected when the mode ends). Per strike, seeded by E.rnd (renders repeat): tiny ratio, decay and gain variation.
   Higher notes ring shorter (decay × (220/f)^dk); a harder strike is brighter (mode gain × vel^(vb·log2 r)). A sounding note moved to another
   pitch strikes anew there (a struck bar cannot glide); cancel(t) stops strikes not yet begun. Stereo spread is NOT here: the voice path is
   mono up to the track pan (MX2) — width comes from the room (VOL-7 will add a stereo stage per voice). */
import { strikeAdmit } from './strikes.js';   // RUN 8: the per-timbre strike cap
const LN1000=6.907755;   // a T60 decay → setTargetAtTime's time constant (d / ln 1000)

/* cap = { id, n } — the record's id and policies.voices (RUN 8; n absent = no cap) */
function buildModalBank(E, preBus, R, cap){
  const ac=E.ac, ig=ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=R.lp; lp.Q.value=0.5; lp.connect(ig);
  const sum=ac.createGain(); sum.gain.value=R.lvl; sum.connect(lp);
  const taps=[E.build.vib, E.build.hum, E.build.shim||E.lfo.shimPitch].filter(Boolean), J=R.jit||{}, N=R.noise, B=R.body, att=R.att||0.002;
  const dt=ac.createGain(); for(const p of taps) p.connect(dt);   // RUN 8 cost: the taps summed once per bank, ONE connection into each mode's detune
  let f0=220, sounding=false, lastVel=0.6, opt=null;   // opt (RUN 8): { hum, mod } of the last attack — see audio.leadOn
  const live=[];   // this bank's strikes not yet ended: { t, end, srcs }
  const jit=k=> k ? 1+k*(E.rnd()*2-1) : 1;
  function strike(t, vel, _symp, o){
    if(vel!=null) lastVel=vel; if(o) opt=o;
    const mod=!opt || opt.mod;   // the taps only when they move (a fixed detune otherwise — cheaper by a param input per oscillator)
    const now=ac.currentTime; for(let i=live.length-1;i>=0;i--) if(live[i].end<now) live.splice(i,1);
    const v=Math.max(0.05, Math.min(1, lastVel)), nyq=ac.sampleRate*0.45, scale=Math.pow(220/f0, R.dk||0), srcs=[]; let end=t;
    const rec=strikeAdmit(E, cap&&cap.id, cap&&cap.n, t), sg=ac.createGain(); sg.connect(sum); rec.out=sg;   // RUN 8: this strike's own gain (the cap fades it)
    for(const m of R.modes){
      const f=f0*m.r*jit(J.r), d=m.d*scale*jit(J.d), pk=m.g*jit(J.g)*Math.pow(v, (R.vb||0)*Math.max(0, Math.log2(m.r)));
      if(f>=nyq) continue;
      const a=m.a||att, o=ac.createOscillator(), g=ac.createGain(), stop=t+a+d*7/6+0.02;   // RUN 8: −70 dB (was −80: 1/8 shorter life, inaudible)
      o.type=m.w||'sine'; o.frequency.value=f; try{ o.detune.automationRate='k-rate'; }catch(e){}   // cost: the taps move slowly (block rate is inaudible)
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(pk,t+a); g.gain.setTargetAtTime(0,t+a,d/LN1000);
      if(mod) dt.connect(o.detune); else o.detune.value=opt.hum;
      o.connect(g); g.connect(sg); o.start(t); o.stop(stop); end=Math.max(end, stop);
      o.onended=()=>{ try{ dt.disconnect(o.detune); }catch(e){} };   // the taps would keep an ended mode alive
      srcs.push(o);
    }
    if(N){   // the mallet / finger: a noise burst through a bandpass (tracking the pitch by t), into the sum and the body resonance
      const s=ac.createBufferSource(), bp=ac.createBiquadFilter(), g=ac.createGain(), stop=t+0.001+N.d*7/6+0.02;
      s.buffer=E.buf.noise; bp.type='bandpass'; bp.frequency.value=Math.min(nyq, N.hz*Math.pow(f0/220, N.t||0)); bp.Q.value=N.q;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(N.g*v,t+0.001); g.gain.setTargetAtTime(0,t+0.001,N.d/LN1000);
      s.connect(bp); bp.connect(g); g.connect(sg);
      if(B){ const bf=ac.createBiquadFilter(), bg=ac.createGain(); bf.type='bandpass'; bf.frequency.value=B.hz; bf.Q.value=B.q; bg.gain.value=B.g; g.connect(bf); bf.connect(bg); bg.connect(sg); }
      s.start(t, E.rnd()*0.8); s.stop(stop); end=Math.max(end, stop); srcs.push(s);
    }
    rec.end=end; rec.srcs=srcs; live.push({ t, end, srcs, rec }); sounding=true;
  }
  const bank={ gain:ig, hum: R.hum===0 ? 0 : 1,
    /* the pitch for the next strike; a sounding note moved to another pitch strikes there (tc 0 = a fresh attack: leadOn strikes itself) */
    setFreq:(f,tc,t)=>{ const moved=Math.abs(f/f0-1)>1e-4; f0=f; if(moved && sounding && tc!==0) strike(t!=null?t:ac.currentTime); },
    strike:(t, vel, symp, o)=>strike(t, vel, symp, o),
    cancel:t=>{ for(const s of live) if(s.t>=t){ for(const o of s.srcs) try{ o.stop(t); }catch(e){} s.rec.end=t; } sounding=false; } };
  E.build.banks.push(bank);
}
export { buildModalBank };
