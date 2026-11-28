/* LIGHT-12i — THE LATENCY LAB INSIDE LIGHT (address ?probe&lab; development only — a shipped page has no probes). The same measure as
   tools/lab/latency/ (the founder's pinch with a nail tick): each time Light STARTS A NOTE (its note adapter's tap, the very call that reaches the
   engine) the lab's click is started in Light's own audio context, in the same render quantum as the note, to the same output; the microphone
   hears the tick and the click. Light's whole way from the camera to the note (its frame pump, worker, search schedule, gestures) is inside the
   measured time; compare with the lab page's shortest way. Microphone sound stays in memory (4 s), never sent or kept. Light's own note sounds
   too; the click is found where the start check measured it (±15 ms). */
import { AC } from '../../../core/audio.js';
import { lightNoteTapSet } from '../../../apps/light/engine.js';
import { makeClick, analyse, clickHeard, median } from './lab-analyse.js';

const R={ ring:null, end:0, click:null, buf:null, rows:[], busy:false, rt:null, loop:null, last:null, on:false, blocks:0 };
const fmt=v=>v==null ? '—' : (Math.round(v*10)/10).toFixed(1);
let box=null;
const el=(tag, txt, css)=>{ const e=document.createElement(tag); if(txt) e.textContent=txt; if(css) e.style.cssText=css; return e; };
const say=s=>{ if(box) box.querySelector('[data-k=msg]').textContent=s; };

function onMic(e){ const { f, d }=e.data, N=R.ring.length; for(let i=0;i<d.length;i++) R.ring[(f+i)%N]=d[i]; R.end=f+d.length; R.blocks++; }
function win(a, b){ const N=R.ring.length; a=Math.max(a, R.end-N+1); b=Math.min(b, R.end); const x=new Float32Array(Math.max(0,b-a)); for(let i=0;i<x.length;i++) x[i]=R.ring[(a+i)%N]; return { x, a }; }
function play(){ const s=AC.createBufferSource(); s.buffer=R.buf; s.connect(AC.destination); s.start(); return Math.round(AC.currentTime*AC.sampleRate); }
const WAIT=700, outMs=()=>((AC.baseLatency||0)+(AC.outputLatency||0))*1000;

const once=()=>new Promise(res=>{ const p0=play(), sr=AC.sampleRate;
  setTimeout(()=>{ const w=win(p0-Math.round(0.1*sr), p0+Math.round(0.6*sr)), p=p0-w.a, c=clickHeard(w.x, R.click, p, p+Math.round(0.4*sr), 0, p);
    res(c.ok ? (c.at-p)/sr*1000 : null); }, WAIT); });
async function loopTest(){
  if(R.busy) return; R.busy=true; say('Проверка звука: три щелчка…');
  const got=[]; for(let i=0;i<3;i++){ got.push(await once()); await new Promise(r=>setTimeout(r, 150)); }
  const all=got.filter(v=>v!=null).sort((a,b)=>a-b), near=all.length ? all.filter(v=>v-all[0]<=10) : [], two=near.length>=2 ? near : all.slice(1).filter(v=>v-all[1]<=10);
  R.rt= two.length>=2 ? median(two) : null; R.loop={ heard:all.length, all:all.map(v=>Math.round(v)), rt:R.rt };
  say(R.rt!=null ? `Микрофон слышит щелчок (${all.length} из 3, ${fmt(R.rt)} мс). Делайте щипки с тиком ногтем, раз в 2 секунды.` : `Микрофон не слышит щелчок уверенно (${all.length} из 3). Включите звук погромче и нажмите «Проверка звука».`);
  R.busy=false; render();
}
function fire(who){
  if(!R.on || R.busy) return; R.busy=true;
  const p0=play(), sr=AC.sampleRate, out=outMs();
  setTimeout(()=>{
    const w=win(p0-Math.round(1.0*sr), p0+Math.round(0.6*sr)), r=analyse(w.x, sr, R.click, p0-w.a, R.last!=null ? Math.max(0, R.last+Math.round(0.05*sr)-w.a) : 0, R.rt);
    if(r.ok) R.last=w.a+r.clickAt;
    R.rows.push({ n:R.rows.length+1, who, out, ...r }); R.busy=false; render();
  }, WAIT);
}
function render(){
  if(!box) return;
  const ok=R.rows.filter(r=>r.ok);
  box.querySelector('[data-k=sum]').textContent= ok.length ? `Light: от касания до звука ${fmt(median(ok.map(r=>r.total)))} мс (медиана из ${ok.length}, не измерено ${R.rows.length-ok.length}; ${fmt(Math.min(...ok.map(r=>r.total)))}…${fmt(Math.max(...ok.map(r=>r.total)))})` : `Замеров: ${R.rows.length}`;
  box.querySelector('[data-k=rows]').textContent=R.rows.slice(-6).map(r=>r.ok ? `${r.n}: ${fmt(r.total)} мс` : `${r.n}: не измерено (${({ click:'щелчок не найден', clap:'тик не слышен', edge:'тик не найден', short:'меньше 15 мс' })[r.why]||r.why})`).join(' · ');
}
function report(){
  const ok=R.rows.filter(r=>r.ok), vt=document.querySelector('video') && document.querySelector('video').srcObject, s=vt && vt.getVideoTracks()[0] ? vt.getVideoTracks()[0].getSettings() : {};
  const L=[`Лаборатория задержки В LIGHT · ${new Date().toISOString().slice(0,16)}`, `камера Light: ${s.width}×${s.height} @ ${s.frameRate}; звук ${AC.sampleRate} Гц, база ${fmt((AC.baseLatency||0)*1000)} мс, выход ${fmt((AC.outputLatency||0)*1000)} мс`,
    `проверка звука: ${R.loop ? `${R.loop.heard} из 3, щелчок→микрофон ${fmt(R.loop.rt)} мс (все: ${R.loop.all.join(', ')})` : 'не делали'}`,
    ok.length ? `ИТОГ LIGHT: медиана ${fmt(median(ok.map(r=>r.total)))} мс из ${ok.length} (не измерено ${R.rows.length-ok.length}), от ${fmt(Math.min(...ok.map(r=>r.total)))} до ${fmt(Math.max(...ok.map(r=>r.total)))}` : 'ИТОГ LIGHT: нет измерений',
    'n · всего · рука · сходство · петля'];
  for(const r of R.rows) L.push(r.ok ? [r.n, fmt(r.total), r.who, r.score, fmt(r.roundtrip)].join(' · ') : `${r.n} · не измерено (${r.why}) · ${r.who} · сходство ${r.score!=null ? (+r.score).toFixed(2) : '—'}`);
  return L.join('\n');
}
async function begin(){
  if(R.on) return;
  if(!AC){ say('Сначала нажмите «Играть».'); return; }
  try{
    say('Разрешите микрофон…');
    const st=await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    await AC.audioWorklet.addModule(new URL('./lab-tap-worklet.js', import.meta.url));
    const src=AC.createMediaStreamSource(st), tap=new AudioWorkletNode(AC, 'lab-tap', { numberOfOutputs:1 }), mute=AC.createGain();
    mute.gain.value=0; src.connect(tap); tap.connect(mute); mute.connect(AC.destination); tap.port.onmessage=onMic;
    R.ring=new Float32Array(AC.sampleRate*4); R.click=makeClick(AC.sampleRate); R.buf=AC.createBuffer(1, R.click.length, AC.sampleRate); R.buf.copyToChannel(R.click, 0);
    lightNoteTapSet((k, a)=>{ if(k==='leadOn') fire(String(a[0]).split(':')[1]||'?'); });
    R.on=true; await loopTest();
  }catch(e){ say('Не получилось: '+(e && e.message || e)); }
}
export function labInstall(){
  if(box) return;
  box=el('div', '', 'position:fixed;left:8px;bottom:8px;z-index:2147483000;max-width:440px;background:rgba(16,20,24,.92);color:#e8eef2;font:13px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;pointer-events:auto');
  box.appendChild(el('b', 'Замер задержки (Light)'));
  const msg=el('div', 'Сначала «Играть», потом «Начать замер».'); msg.dataset.k='msg'; box.appendChild(msg);
  const sum=el('div', '', 'font-weight:600;margin-top:4px'); sum.dataset.k='sum'; box.appendChild(sum);
  const rows=el('div', '', 'opacity:.8'); rows.dataset.k='rows'; box.appendChild(rows);
  const bar=el('div', '', 'margin-top:6px;display:flex;gap:6px;flex-wrap:wrap');
  for(const [t, f] of [['Начать замер', begin], ['Проверка звука', loopTest], ['Сбросить', ()=>{ R.rows=[]; R.last=null; render(); }],
    ['Скопировать результаты', ()=>{ const t2=report(); navigator.clipboard.writeText(t2).then(()=>say('Скопировано — вставьте в чат.'), ()=>{ console.log(t2); say('Не скопировалось: текст в консоли (F12).'); }); }]]){   // eslint-disable-line no-console
    const b=el('button', t, 'font:inherit;padding:4px 10px;border-radius:7px;border:1px solid #3a4854;background:#24303a;color:inherit;cursor:pointer');
    b.addEventListener('pointerdown', e=>e.stopPropagation()); b.onclick=e=>{ e.stopPropagation(); f(); }; bar.appendChild(b); }
  box.appendChild(bar); document.body.appendChild(box); render();
}
/* for the runner: the panel's state */
export const labDbg=()=>({ on:R.on, rows:R.rows.length, loop:R.loop, blocks:R.blocks, busy:R.busy });
