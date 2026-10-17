// RUN 6: the listening page's engine part, checked in the app page (node tools/probe-browser.mjs --eval tools/listen/check-listen.js).
// Every candidate in every mood renders through the Night forest: not silent, not clipping; a mood changes the notes (Glow ≠ Dusk);
// the same render twice is identical (seeded). Body of an async function; returns { ok, rows }.
const L=await import('./tools/listen/calm-listen.js');
const rows=[], hash=b=>{ let h=0x811c9dc5; const d=b.getChannelData(0); for(let i=0;i<d.length;i+=7){ const v=Math.round(d[i]*1e6); h^=v; h=Math.imul(h,0x01000193); } return (h>>>0).toString(16); };
for(const c of L.CANDS) for(const [m] of L.MOODS){ const b=await L.render(c,m), lv=L.levelOf(b);
  rows.push({ id:c.id, mood:m, sec:+(b.length/b.sampleRate).toFixed(2), peak:+lv.peak.toFixed(4), rms:+lv.rms.toFixed(5), h:hash(b) }); }
const again=await L.render(L.CANDS[1], L.MOODS[0][0]), same=hash(again)===rows.find(r=>r.id===L.CANDS[1].id&&r.mood===L.MOODS[0][0]).h;
const moodsDiffer=L.CANDS.every(c=>{ const a=rows.find(r=>r.id===c.id&&r.mood==='major-penta'), b=rows.find(r=>r.id===c.id&&r.mood==='minor-penta'); return a.h!==b.h; });
const bad=rows.filter(r=>!(r.peak>0.01 && r.peak<1));
return { ok:!bad.length && same && moodsDiffer, repeatable:same, moodsDiffer, bad, rows };
