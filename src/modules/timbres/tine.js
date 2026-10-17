/* C4a (RUN 6, Calm plan §4.1) — the TINE engine type as a SOLO bank: «Firefly» for the solo hand. An ENGINE SUBMODULE (hard rule #38):
   stateless — every engine value comes from the engine context E (first argument); the bank object it returns lives on its pooled voice.
   A struck tine has no sustain to gate, so — the sanctioned exception to rule #3 that the chord Firefly already is (SND-F1) — each STRIKE
   makes its own partial oscillators (the record's table: ratio, gain, decay, wave; 6-ms linear attack, exponential decay to 0.0001) at its
   moment, into the bank's gate → the voice's own stages (vibrato and humanisation taps on each partial's detune, the voice's envelope,
   level, pan, brightness, route — exactly like every solo bank). They stop by themselves when their decay ends and are disconnected from
   the voice's taps then. setFreq stores the pitch; a sounding note moved to another pitch (a hand moving to another row) STRIKES ANEW
   there — a tine cannot glide. cancel(t) stops strikes that have not begun by t (a voice handed to another owner). */
function buildTineBank(E, preBus, R){
  const ig=E.ac.createGain(); ig.gain.value=0; ig.connect(preBus);
  const taps=[E.build.vib, E.build.hum, E.build.shim||E.lfo.shimPitch].filter(Boolean), parts=R.partials, lvl=R.lvl;
  let f0=220, sounding=false, lastVel=0.6;
  const live=[];   // this bank's strikes not yet ended: { t, end, oscs }
  function strike(t, vel){
    if(vel!=null) lastVel=vel;
    const now=E.ac.currentTime; for(let i=live.length-1;i>=0;i--) if(live[i].end<now) live.splice(i,1);
    const g=E.ac.createGain(); g.gain.value=lvl*lastVel; g.connect(ig);
    const oscs=[]; let end=t;
    for(const [ratio,a,decay,type] of parts){
      const o=E.ac.createOscillator(), pg=E.ac.createGain();
      o.type=type; o.frequency.value=f0*ratio;
      pg.gain.setValueAtTime(0,t); pg.gain.linearRampToValueAtTime(a,t+0.006); pg.gain.exponentialRampToValueAtTime(0.0001,t+decay);
      for(const p of taps) p.connect(o.detune);
      o.connect(pg); pg.connect(g); o.start(t); o.stop(t+decay+0.05); end=Math.max(end, t+decay+0.05);
      o.onended=()=>{ for(const p of taps) try{ p.disconnect(o.detune); }catch(e){} };   // the taps would keep an ended partial alive
      oscs.push(o);
    }
    live.push({ t, end, oscs }); sounding=true;
  }
  const bank={ gain:ig, hum:1,
    /* the pitch for the next strike; a sounding note moved to another pitch strikes there (tc / glide: a tine has none) */
    setFreq:(f,tc,t)=>{ const moved=Math.abs(f/f0-1)>1e-4; f0=f; if(moved && sounding && tc!==0) strike(t!=null?t:E.ac.currentTime); },
    strike:(t, vel)=>strike(t, vel),
    cancel:t=>{ for(const s of live) if(s.t>=t) for(const o of s.oscs) try{ o.stop(t); }catch(e){} sounding=false; } };
  E.build.banks.push(bank);
}
export { buildTineBank };
