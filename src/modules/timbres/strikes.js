/* RUN 8 (the Calm crackle) — THE STRIKE CAP of the struck solo engines (tine, modal). An ENGINE SUBMODULE (hard rule #38): stateless — the
   list of ringing strikes lives in the engine instance (E.pool.ld.strikes), shared by every voice's bank. Measured: a struck note makes its own
   oscillators (8 modes + a noise burst for a bowl, ringing up to 16 s), so fast playing piled up ~1000 live sources and the audio thread
   underran (crackle) — in Full too. A timbre record's policies.voices (data) = how many of its strikes may ring at once; a new strike over it
   fades the OLDEST one out (τ 10 ms, stopped 80 ms later at ≈ −70 dB: no click). Times only (the strike's own t), so a render caps exactly
   as live play does. No policies.voices → no cap (every other timbre unchanged). */
const FADE_TC=0.01, FADE_END=0.08;
export const LOW_CAP=0.6;   // C8: in low power a timbre rings at most 60 % of its strikes (at least one)
/* admit a strike at time t of timbre `id` with cap n; returns the record to fill ({ t, end, out, srcs }) — pushed into the list */
export function strikeAdmit(E, id, n, t){
  const L=E.pool.ld.strikes;
  for(let i=L.length-1;i>=0;i--) if(L[i].end<=t) L.splice(i,1);   // over by this strike's time
  if(n>0 && E.lowPower) n=Math.max(1, Math.round(n*LOW_CAP));
  if(n>0 && !E.dbg.noStrikeCap){   // the CONTROL switch (render copy only) turns the cap off
    const mine=L.filter(s=>s.id===id && !s.faded);
    for(let k=mine.length-n+1; k>0; k--){   // over the cap: fade the oldest out
      const o=mine.reduce((a,b)=> b.t<a.t ? b : a); mine.splice(mine.indexOf(o),1);
      const at=Math.max(t, o.t); o.faded=true; o.end=at+FADE_END;
      o.out.gain.cancelScheduledValues(at); o.out.gain.setTargetAtTime(0, at, FADE_TC);
      for(const x of o.srcs) try{ x.stop(E.dbg.strikeCut ? at : at+FADE_END); }catch(e){} }   // strikeCut: the CONTROL — cut at once (a click)
  }
  const s={ id, t, end:t, out:null, srcs:[], faded:false }; L.push(s); return s;
}
