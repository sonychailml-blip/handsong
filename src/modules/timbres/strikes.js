/* RUN 8 (the Calm crackle) — THE STRIKE CAP of the struck solo engines (tine, modal), CALM ONLY. An ENGINE SUBMODULE (hard rule #38):
   stateless — the caps (E.strikeCaps: timbre id → n, from data/profiles/calm.json «voices», set by the Calm face) and the list of ringing
   strikes (E.pool.ld.strikes) live in the engine instance. Measured: a struck note makes its own oscillators (8 modes + a noise burst for a
   bowl, ringing up to 16 s), so fast playing piled up ~1000 live sources and the audio thread underran (crackle). A new strike over the cap
   fades the OLDEST one out (τ 10 ms, stopped 80 ms later at ≈ −70 dB: no click); «Lighter forest» (E.lowPower) × LOW_CAP. Times only (the
   strike's own t), so a render caps exactly as live play does. Full sets no caps: its banks never call this (RUN 7's strike, exactly). */
const FADE_TC=0.01, FADE_END=0.08;
export const LOW_CAP=0.6;   // C8: in low power a timbre rings at most 60 % of its strikes (at least one)
/* admit a strike at time t of timbre `id` under its Calm cap; returns the record to fill ({ t, end, out, srcs }) — pushed into the list */
export function strikeAdmit(E, id, t){
  const L=E.pool.ld.strikes; let n=E.strikeCaps.get(id);
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
