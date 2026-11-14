/* RAIN-3 — THE RAIN ROOM's SOUND CANDIDATES, side by side (dev tool; never runs in the app). For each CC0 candidate in tools/design/rain/sound/
   (rain on a window pane, close; the wet street from above) and for the synthesis (the fallback: RAIN-0's soft hiss), it renders 40 s through the
   SAME law the nature worklet runs (apps/night/pure/layers.js: grains with equal-power joins, never a loop), levels it to the forest's nature
   (K-like loudness of the forest's stream, as the stream's own level was set), measures the joins (the 50-ms envelope's longest self-similarity:
   a heard loop shows as a peak) and the law's cost per 128-frame quantum, and writes the renders (MP3) with a page for the founder to pick by ear.
     node tools/rain-listen.mjs           → tools/design/rain/sound/listen/ (renders, listen.json, index.html)
   Needs ffmpeg (a dev tool outside the repository) to decode and encode. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layersNew, layersRec, layersOn, layersFocus, layersOut, LAYERS } from '../apps/night/pure/layers.js';
import { windNoise } from '../apps/night/pure/ambience.js';
import { FOREST_ROOM } from '../apps/night/rooms/forest/pure/room.js';
import { brookNew, brookOut } from '../apps/night/pure/brook.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC=path.join(ROOT, 'tools/design/rain/sound'), OUT=path.join(SRC, 'listen'), FS=48000, SEC=40;
const CANDS=JSON.parse(readFileSync(path.join(SRC, 'candidates.json'), 'utf8'));
const decode=f=>{ const r=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', String(FS), '-'], { maxBuffer:1<<30 }); if(r.status!==0) throw new Error('ffmpeg: '+r.stderr);
  const all=new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset+r.stdout.length)), n=all.length/2, L=new Float32Array(n), R=new Float32Array(n); for(let i=0;i<n;i++){ L[i]=all[2*i]; R[i]=all[2*i+1]; } return { L, R }; };
const encode=(f, L, R)=>{ const n=L.length, b=Buffer.alloc(n*8); for(let i=0;i<n;i++){ b.writeFloatLE(L[i], i*8); b.writeFloatLE(R[i], i*8+4); }
  const r=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', String(FS), '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', f], { input:b, maxBuffer:1<<30 }); if(r.status!==0) throw new Error('ffmpeg: '+r.stderr); };
const kLoud=(x, rate)=>{ const a1=Math.exp(-2*Math.PI*100/rate), a2=Math.exp(-2*Math.PI*2000/rate), sh=Math.pow(10, 4/20)-1, n=x.length, w=new Float32Array(n); let x1=0, y1=0, x2=0, y2=0, lp=0;   // tools/probes/night/night.js kLoud, the same numbers
  for(let i=0;i<n;i++){ const v=x[i]; y1=a1*(y1+v-x1); x1=v; y2=a1*(y2+y1-x2); x2=y1; lp=lp*a2+(1-a2)*y2; w[i]=y2+sh*(y2-lp); }
  const win=Math.round(0.4*rate), hop=Math.round(0.1*rate), ms=[]; for(let a=0;a+win<=n;a+=hop){ let e=0; for(let i=a;i<a+win;i++) e+=w[i]*w[i]; ms.push(e/win); }
  ms.sort((p, q)=>q-p); const top=ms.slice(0, Math.max(1, Math.ceil(ms.length/4))); return 10*Math.log10(top.reduce((s, v)=>s+v, 0)/top.length+1e-12); };
const mid=(A, B)=>{ const m=new Float32Array(A.length); for(let i=0;i<A.length;i++) m[i]=(A[i]+B[i])/2; return m; };
function selfSim(L, R){ const h=FS/20, m=Math.floor(L.length/h), e=new Float64Array(m); for(let k=0;k<m;k++){ let s=0; for(let i=k*h;i<(k+1)*h;i++) s+=L[i]*L[i]+R[i]*R[i]; e[k]=Math.sqrt(s/h); }
  const mu=e.reduce((a, b)=>a+b, 0)/m; for(let k=0;k<m;k++) e[k]-=mu; let best=0, at=0;
  for(let lag=20;lag<=Math.min(400, m-40);lag++){ let s=0, a=0, b=0; for(let k=0;k+lag<m;k++){ s+=e[k]*e[k+lag]; a+=e[k]*e[k]; b+=e[k+lag]*e[k+lag]; } const c=s/Math.sqrt(a*b||1); if(c>best){ best=c; at=lag/20; } } return { best, at }; }
/* the reference: the forest's stream synthesis at its recipe level (the stream's recording was levelled to it) */
const ref=(()=>{ const V=FOREST_ROOM.nature.stream.voices, st=brookNew(FS, V), N=FS*20, L=new Float32Array(N), R=new Float32Array(N); for(let o=0;o<N;o+=128) brookOut(st, L, R, o, Math.min(128, N-o)); return kLoud(mid(L, R).subarray(FS*2), FS)+20*Math.log10(FOREST_ROOM.nature.stream.gain); })();
/* one layer rendered alone through the law (focus 0 for near, 1 for far), norm 1, gain 1 */
function render(which, L0, R0, norm=1){ const st=layersNew(FS, { near:{ gain:1 }, far:{ gain:1 } }); layersRec(st, which, L0, R0, norm); layersOn(st, true); layersFocus(st, which==='near' ? 0 : 1); st.fs=st.f; st.g=1;
  const N=FS*SEC, nL=new Float32Array(N), nR=new Float32Array(N), fL=new Float32Array(N), fR=new Float32Array(N); let us=0;
  for(let o=0;o<N;o+=128){ const a=process.hrtime.bigint(); layersOut(st, o/FS, nL, nR, fL, fR, o, Math.min(128, N-o)); us+=Number(process.hrtime.bigint()-a)/1000; }
  return which==='near' ? { L:nL, R:nR, us:us/(N/128) } : { L:fL, R:fR, us:us/(N/128) }; }
mkdirSync(OUT, { recursive:true }); const res=[];
for(const c of CANDS){ const f=path.join(SRC, c.file); if(!existsSync(f)){ res.push({ ...c, missing:true }); continue; }
  const { L, R }=decode(f), r1=render(c.layer, L, R, 1), k1=kLoud(mid(r1.L, r1.R).subarray(FS*2), FS), norm=+Math.pow(10, (ref-k1)/20).toFixed(3), r=render(c.layer, L, R, norm), ss=selfSim(r.L, r.R);
  let xy=0, xx=0, yy=0; for(let i=0;i<r.L.length;i++){ xy+=r.L[i]*r.R[i]; xx+=r.L[i]**2; yy+=r.R[i]**2; }
  const out=`${c.id}.mp3`; encode(path.join(OUT, out), r.L, r.R);
  res.push({ ...c, sec:+(L.length/FS).toFixed(1), norm, k:+kLoud(mid(r.L, r.R).subarray(FS*2), FS).toFixed(1), selfSim:+ss.best.toFixed(3), at:ss.at, corr:+(xy/Math.sqrt(xx*yy||1)).toFixed(3), usQuantum:+r.us.toFixed(1), render:out });
  console.log(`[rain-listen] ${c.id}: ${(L.length/FS).toFixed(1)} s, norm ×${norm}, self-similarity ${ss.best.toFixed(3)} at ${ss.at} s, L/R ${(xy/Math.sqrt(xx*yy||1)).toFixed(2)}, ${r.us.toFixed(1)} µs a quantum`); }
/* the synthesis (RAIN-0's hiss: the room's wind voice, high and wide — the fallback) */
{ const W={ hz:2600, q:0.35 }, n=FS*SEC, x=windNoise(FS, 0x5241494E, 2), L=new Float32Array(n), R=new Float32Array(n), w0=2*Math.PI*W.hz/FS, al=Math.sin(w0)/(2*W.q), b0=al/(1+al), a1=-2*Math.cos(w0)/(1+al), a2=(1-al)/(1+al);
  let x1=0, x2=0, y1=0, y2=0; for(let i=0;i<n;i++){ const v=x[i%x.length], y=b0*v-b0*x2-a1*y1-a2*y2; x2=x1; x1=v; y2=y1; y1=y; L[i]=y; R[i]=y; }
  const k1=kLoud(L.subarray(FS*2), FS), g=Math.pow(10, (ref-k1)/20); for(let i=0;i<n;i++){ L[i]*=g; R[i]*=g; } encode(path.join(OUT, 'synthesis.mp3'), L, R); res.push({ id:'synthesis', layer:'both', render:'synthesis.mp3', selfSim:+selfSim(L, R).best.toFixed(3) }); }
writeFileSync(path.join(OUT, 'listen.json'), JSON.stringify({ reference:+ref.toFixed(1), grain:LAYERS.grain, fade:LAYERS.fade, res }, null, 1));
const row=c=>`<tr><td><b>${c.id}</b></td><td>${c.title||'Синтез (запасной вариант): мягкий шум'}${c.author ? `<br><small>${c.author}, <a href="${c.url}">${c.url}</a>, CC0</small>` : ''}</td><td>${c.missing ? '—' : `<audio controls preload="none" src="${c.render}"></audio>`}</td><td>${c.sec ? c.sec+' с' : ''}</td><td>${c.selfSim!=null ? c.selfSim : ''}</td></tr>`;
writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Звуки комнаты «Дождь»</title>
<style>body{background:#0e0d12;color:#ece6dc;font:16px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:1100px} table{border-collapse:collapse;width:100%} td{padding:10px 12px 10px 0;border-bottom:1px solid #2a2630;vertical-align:top} a{color:#f4c98a} small{color:#a8a092} audio{width:280px}</style>
<h1>Комната «Дождь»: звук — кандидаты</h1>
<p>Каждый кандидат — 40 секунд, сыгранные тем же законом, что и в комнате (зёрна со стыками равной мощности, без петли), выровненные по громкости ручья в лесу. Слушайте в наушниках. Выберите один «близкий» (дождь по стеклу) и один «далёкий» (мокрая улица). Последняя колонка — самоподобие огибающей (меньше — стыки и повторы слышны меньше).</p>
<h2>Близко: дождь по стеклу</h2><table>${res.filter(c=>c.layer==='near').map(row).join('')}</table>
<h2>Далеко: мокрая улица сверху</h2><table>${res.filter(c=>c.layer==='far').map(row).join('')}</table>
<h2>Синтез (сейчас в комнате, запасной)</h2><table>${res.filter(c=>c.layer==='both').map(row).join('')}</table></html>`);
console.log('[rain-listen] → '+path.relative(ROOT, OUT).replace(/\\/g, '/')+'/index.html');
