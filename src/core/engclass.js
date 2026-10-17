/* ENG2 (RUN 4) — the engine's PROVISIONAL power class and the dropout rate. CORE: pure (rule #36), runs in node (data row «ENG2 power
   class (core)»). ⛳ User answer E1: classes are PROVISIONAL and decide NOTHING — no setting switches on them until the user's live
   measurements (dropouts per minute on real devices) calibrate the thresholds; offline factors are a RELATIVE measure only. */
export const ENG_CLASS_PROVISIONAL=true;
/* thresholds (ENG2 plan §4, this desktop, before POOL1 — to be re-measured): the benchmark's offline factor (seconds of CPU per second of
   audio, the reference light scene) and the hand detection time (ms, mean) */
export const ENG_THRESH=Object.freeze({ factor:Object.freeze({ high:1.0, low:3.5 }), detect:Object.freeze({ high:35, low:90 }) });
export const ENG_BENCH_KEY='handsong.engBench', ENG_BENCH_V=1;
const fin=x=>typeof x==='number' && Number.isFinite(x);
/* → { cls:'high'|'mid'|'low'|'unknown', why:[reasons] } */
export function engClass({ factor, detectMs, softwareGL }={}){
  const why=[], T=ENG_THRESH;
  if(softwareGL===true) why.push('software graphics');
  if(fin(factor) && factor>T.factor.low) why.push('audio factor '+factor+' > '+T.factor.low);
  if(fin(detectMs) && detectMs>T.detect.low) why.push('detection '+detectMs+' ms > '+T.detect.low);
  if(why.length) return { cls:'low', why };
  if(!fin(factor)) return { cls:'unknown', why:['no benchmark yet'] };
  if(factor<T.factor.high && (!fin(detectMs) || detectMs<T.detect.high)) return { cls:'high', why:['audio factor '+factor+' < '+T.factor.high] };
  return { cls:'mid', why:['between the thresholds'] };
}
/* the benchmark cache (localStorage text) → { factor, at } for this user agent, or null (absent, broken, another agent or version) */
export function benchOf(text, ua){
  try{ const o=JSON.parse(text); return o && o.v===ENG_BENCH_V && o.ua===ua && fin(o.factor) && o.factor>0 ? { factor:o.factor, at:o.at } : null; }
  catch(e){ return null; }
}
export const benchText=(factor, ua, at)=>JSON.stringify({ v:ENG_BENCH_V, ua, factor, at });
/* dropouts per minute from samples [[time ms, cumulative event count]]: the change over the last ≤ 60 s scaled to a minute; null with
   fewer than 10 s of samples (too short to say) or no samples. A counter that went backwards (a new context) restarts the window. */
export function dropRate(samples, now){
  let i=samples.length-1; if(i<1) return null;
  let j=i; while(j>0 && samples[j-1][0]>=now-60e3 && samples[j-1][1]<=samples[j][1]) j--;
  const dt=samples[i][0]-samples[j][0]; if(dt<10e3) return null;
  return Math.round((samples[i][1]-samples[j][1])*60e3/dt*10)/10;
}
