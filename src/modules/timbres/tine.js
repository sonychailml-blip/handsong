/* C4a (RUN 6, Calm plan §4.1) — the TINE engine type as a SOLO bank: «Firefly» for the solo hand. An ENGINE SUBMODULE (hard rule #38):
   stateless — every engine value comes from the engine context E (first argument); the bank object it returns lives on its pooled voice.
   A struck tine has no sustain to gate, so — the sanctioned exception to rule #3 that the chord Firefly already is (SND-F1) — each STRIKE
   makes its own partial oscillators (the record's table: ratio, gain, decay, wave; 6-ms linear attack, exponential decay to 0.0001) at its
   moment, into the bank's gate → the voice's own stages (vibrato and humanisation taps on each partial's detune, the voice's envelope,
   level, pan, brightness, route — exactly like every solo bank). They stop by themselves when their decay ends and are disconnected from
   the voice's taps then. setFreq stores the pitch; a sounding note moved to another pitch (a hand moving to another row) STRIKES ANEW
   there — a tine cannot glide. cancel(t) stops strikes that have not begun by t (a voice handed to another owner). */
/* RUN 8 (the Calm crackle; the user: «Full exactly as before»): TWO PATHS per strike, chosen at its moment. FULL (no Calm caps in E) =
   RUN 7's strike exactly — the same nodes in the same order, every tap into every partial's detune (per sample). CALM (E.calmLean, set by the
   Calm face): the strike is admitted under the profile's cap (strikes.js fades the oldest), its partials take their detune at block rate,
   the taps reach them through ONE sum per bank (built on the first such strike) and only when they move at the strike — else the
   humanisation is a fixed detune ({ hum, mod } from audio.leadOn). id = the record's id (the Calm cap's key). */
import { strikeAdmit } from './strikes.js';
function buildTineBank(E, preBus, R, id){
  const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  const taps=[E.build.vib, E.build.hum, E.build.shim||E.lfo.shimPitch].filter(Boolean), parts=R.partials, lvl=R.lvl;
  let f0=220, sounding=false, lastVel=0.6, opt=null, dt=null;
  const live=[];   // this bank's strikes not yet ended: { t, end, oscs, rec }
  function strike(t, vel, _symp, o){
    if(vel!=null) lastVel=vel; if(o) opt=o;
    const now=E.ac.currentTime; for(let i=live.length-1;i>=0;i--) if(live[i].end<now) live.splice(i,1);
    const lean=E.calmLean, g=E.ac.createGain(); g.gain.value=lvl*lastVel; g.connect(ig);
    const rec= lean ? strikeAdmit(E, id, t) : null; if(rec) rec.out=g;
    const mod= lean && (!opt || opt.mod); if(mod && !dt){ dt=E.ac.createGain(); for(const p of taps) p.connect(dt); }
    const oscs=[]; let end=t;
    for(const [ratio,a,decay,type] of parts){
      const o=E.ac.createOscillator(), pg=E.ac.createGain();
      o.type=type; o.frequency.value=f0*ratio; if(lean) try{ o.detune.automationRate='k-rate'; }catch(e){}
      pg.gain.setValueAtTime(0,t); pg.gain.linearRampToValueAtTime(a,t+0.006); pg.gain.exponentialRampToValueAtTime(0.0001,t+decay);
      if(!lean) for(const p of taps) p.connect(o.detune); else if(mod) dt.connect(o.detune); else o.detune.value=opt.hum;
      o.connect(pg); pg.connect(g); o.start(t); o.stop(t+decay+0.05); end=Math.max(end, t+decay+0.05);
      o.onended= !lean ? ()=>{ for(const p of taps) try{ p.disconnect(o.detune); }catch(e){} } : ()=>{ if(mod) try{ dt.disconnect(o.detune); }catch(e){} };   // the taps would keep an ended partial alive
      oscs.push(o);
    }
    if(rec){ rec.end=end; rec.srcs=oscs; } live.push({ t, end, oscs, rec }); sounding=true;
  }
  const bank={ gain:ig, hum:1,
    /* the pitch for the next strike; a sounding note moved to another pitch strikes there (tc / glide: a tine has none) */
    setFreq:(f,tc,t)=>{ const moved=Math.abs(f/f0-1)>1e-4; f0=f; if(moved && sounding && tc!==0) strike(t!=null?t:E.ac.currentTime); },
    strike:(t, vel, symp, o)=>strike(t, vel, symp, o),
    cancel:t=>{ for(const s of live) if(s.t>=t){ for(const o of s.oscs) try{ o.stop(t); }catch(e){} if(s.rec) s.rec.end=t; } sounding=false; } };
  E.build.banks.push(bank);
}
export { buildTineBank };
