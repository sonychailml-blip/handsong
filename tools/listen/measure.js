// RUN 7: the Calm sound pass's measurements (node tools/probe-browser.mjs --no-ui --eval tools/listen/measure.js): for every candidate —
// single notes dry (loudness, clicks, highs, ring time, spectral peaks of the first note) and the phrase in the forest (loudness, peak), plus
// the COST: offline render time of 8 voices vs 1 voice (each held 4 beats, same length) → ms of CPU per voice per second of audio (an ENG2-
// style relative measure; the 8−1 difference removes the engine's own fixed cost). Returns JSON.
const L=await import('./tools/listen/calm-listen.js');
const out=[], V8=[[0,0,0,4],[1,0,0,4],[2,0,0,4],[3,0,0,4],[4,0,0,4],[0,1,0,4],[1,1,0,4],[2,1,0,4]];
const time=async(c,notes)=>{ let best=Infinity; for(let k=0;k<2;k++){ const t0=performance.now(); const b=await L.render(c,'major-penta',0.5,0.8,{ dry:true, notes }); best=Math.min(best, performance.now()-t0); var sec=b.length/b.sampleRate; } return { ms:best, sec }; };
for(const c of L.CANDS){
  const s=await L.render(c,'major-penta',0.5,0.8,{ kind:'single', dry:true }), p=await L.render(c,'major-penta',0.5,0.8,{ kind:'phrase' });
  const a=await time(c,V8.slice(0,1)), b=await time(c,V8);
  out.push({ id:c.id, single:L.analyse(s), phrase:L.analyse(p), peaks:L.peaks(s), msPerVoiceSec:+((b.ms-a.ms)/7/b.sec).toFixed(1) });
}
return out;
