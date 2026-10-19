// RUN 6 / RUN 7: the listening page's engine part, checked in the app page (node tools/probe-browser.mjs --no-ui --eval tools/listen/check-listen.js).
// Every candidate in every mood renders its PHRASE through the Night forest: not silent, not clipping, no click; a mood changes the notes
// (Glow ≠ Dusk); the same render twice repeats (seeded; largest sample difference ≤ 1e-6); SINGLE notes render dry; the six new sounds' phrase loudness in the forest lies within
// ±2 dB of each other, Firefly (rich) as the anchor (the measure of tools/listen/calm-listen.js analyse). Body of an async function; returns { ok, rows }.
const L=await import('./tools/listen/calm-listen.js');
const rows=[], hash=b=>{ let h=0x811c9dc5; const d=b.getChannelData(0); for(let i=0;i<d.length;i+=7){ const v=Math.round(d[i]*1e6); h^=v; h=Math.imul(h,0x01000193); } return (h>>>0).toString(16); };
for(const c of L.CANDS) for(const [m] of L.MOODS){ const b=await L.render(c,m), lv=L.levelOf(b), a=L.analyse(b);
  rows.push({ id:c.id, mood:m, sec:+(b.length/b.sampleRate).toFixed(2), peak:+lv.peak.toFixed(4), loud:a.loud, click:a.click, h:hash(b) }); }
const single=[]; for(const c of L.CANDS){ const b=await L.render(c,'major-penta',0.5,0.8,{ kind:'single', dry:true }), a=L.analyse(b); single.push({ id:c.id, loud:a.loud, click:a.click, t60:a.t60 }); }
/* repeatability: the same render twice — renders repeat to a few ULP (summation order), so the measure is the largest sample difference
   (≤ 1e-6), not a rounded hash (RUN 7: the hash flipped on a rounding boundary — a lottery measure, replaced) */
const maxDiff=(a,b)=>{ let m=0; for(let c=0;c<2;c++){ const x=a.getChannelData(c), y=b.getChannelData(c); for(let i=0;i<x.length;i++) m=Math.max(m, Math.abs(x[i]-y[i])); } return m; };
const again=await L.render(L.CANDS[1], L.MOODS[0][0]), first=await L.render(L.CANDS[1], L.MOODS[0][0]), rep=maxDiff(again, first), same=rep<=1e-6;
const moodsDiffer=L.CANDS.every(c=>{ const a=rows.find(r=>r.id===c.id&&r.mood==='major-penta'), b=rows.find(r=>r.id===c.id&&r.mood==='minor-penta'); return a.h!==b.h; });
const ref=rows.find(r=>r.id==='solo.firefly-rich'&&r.mood==='major-penta').loud;   // the new six among themselves (today's Firefly is 18 dB quieter)
const balance=L.CANDS.filter(c=>!c.ref).map(c=>({ id:c.id, d:+(rows.find(r=>r.id===c.id&&r.mood==='major-penta').loud-ref).toFixed(2) }));
const bad=rows.filter(r=>!(r.peak>0.005 && r.peak<1 && r.click<=0.5)).concat(single.filter(s=>!(s.click<=0.5))), off=balance.filter(b=>!(Math.abs(b.d)<=2));
return { ok:!bad.length && !off.length && same && moodsDiffer, repeatable:same, repeatDiff:rep, moodsDiffer, bad, off, balance, single, rows };
