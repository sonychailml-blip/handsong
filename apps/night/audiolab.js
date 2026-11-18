/* AUDIO-3 — THE AUDIO LAB (development edition only; the founder hunts the rain's dropouts). Settings → «Audio lab (development)» opens a small
   panel pinned to the top of the screen that stays while playing:
   - THE GLITCH COUNTER: the browser's own output statistics where it has them (AudioContext.playoutStats / playbackStats: underrun / fallback
     events), and a render-timing check (worklets/lab-worklet.js «night-glitch»: a render call far later than the output buffer allows = a likely
     underrun; the drift = renders falling behind real time); the output latency in ms;
   - RECORD WHAT YOU HEAR: the master (core masterOut — the node that feeds the speakers) into a WAV the founder saves himself; nothing leaves
     the device. Gaps in the WAV = our graph; a clean WAV while he heard gaps = the output (an underrun);
   - TRY: the output buffer (latency hint, applied on the next load) and the palm search's cadence while no hand is in view (applied at once);
   - BYPASS: every part of the rain's sound taken out of the graph one at a time (the bed's own switches, rooms/rain/lofi.js; the nature layers;
     the hand's room as the light delay network instead of the convolution);
   - THE LOG (every 0.5 s): hands in view, the detector's action, long main-thread tasks, the picture's frame time, the glitch numbers, the bed's
     level — Copy puts it on the clipboard.
   Stored choices (latency, search) apply only in the development edition; the release edition never reads them. */
import { AC, setLatencyHint, masterOut, fxInstance } from '../../core/audio.js';
import { setIdleSearchEvery, pumpStats } from '../../core/vision.js';
import { chainKeyOf } from '../../core/state.js';
import { HANDS } from '../../core/gestures.js';
import { nsKey } from '../../core/storens.js';
import { devItems } from './edition.js';
import { bed2LofiEngine } from './bed2.js';
import { natureSkip } from './roomswitch.js';
import { sceneInfo, sceneRoom } from './scene/host.js';

const $=id=>document.getElementById(id), KEY={ lat:nsKey('handsong.labLatency'), idle:nsKey('handsong.labIdleSearch') };
const load=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } }, save=(k, v)=>{ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} };
export const LAB_LATENCY=['interactive', 'balanced', 'playback'], LAB_IDLE=[3, 6, 10];
/* the stored choices, before the start click (main.js imports this module early): the development edition only */
if(devItems()){ const l=load(KEY.lat); if(LAB_LATENCY.includes(l)) setLatencyHint(l); const n=+load(KEY.idle); if(LAB_IDLE.includes(n)) setIdleSearchEvery(n); }
const BED_PARTS=[['bed', 'the whole music bed'], ['piano', 'piano'], ['bass', 'bass'], ['drums', 'drums'], ['vib', 'vibraphone'], ['guitar', 'guitar'],
  ['reverb', 'reverb (convolver)'], ['chorus', 'chorus'], ['tremolo', 'tremolo + auto-pan'], ['delay', 'tape delay'], ['compressor', 'compressor'],
  ['wow', 'wow / flutter'], ['pump', 'sidechain pump'], ['highcut', 'master high-cut'], ['saturation', 'saturation (3 shapers)']];
const NATURE_PARTS=[['near', 'rain on the glass (near)'], ['far', 'street (far)'], ['cars', 'car and tram passes']];
let open=false, built=false, glitch=null, rec=null, recBuf=[], recOn=false, tick=0, longN=0, longMax=0, lastG={ gapMax:0, calls:0, drift:0 }, late=0, gapLim=0, gaps=[];
const log=[], skip={ near:false, far:false, cars:false };
try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()){ longN++; if(e.duration>longMax) longMax=e.duration; } }).observe({ type:'longtask', buffered:false }); }catch(e){}
const stats=()=>{ const s=AC && (AC.playoutStats || AC.playbackStats); if(!s) return null; const o={}; for(const k in s){ const v=s[k]; if(typeof v==='number') o[k]=v; } return o; };
const latMs=()=>AC ? Math.round(((AC.baseLatency||0)+(AC.outputLatency||0))*1000) : 0;
async function probes(){ if(glitch || !AC) return; try{ await AC.audioWorklet.addModule(new URL('./worklets/lab-worklet.js', import.meta.url).href); }catch(e){ say('the lab worklet did not load: '+e.message); return; }
  const sink=AC.createGain(); sink.gain.value=0; sink.connect(AC.destination);
  glitch=new AudioWorkletNode(AC, 'night-glitch', { numberOfInputs:0, numberOfOutputs:1 }); glitch.connect(sink);
  glitch.port.onmessage=e=>{ lastG=e.data; gaps.push(e.data.gapMax); if(gaps.length>40) gaps.shift();
    if(!gapLim && gaps.length>=20) gapLim=Math.max(25, 2.2*[...gaps].sort((a, b)=>a-b)[Math.floor(gaps.length*0.9)]);   // the first 5 s set what is normal here
    if(gapLim && e.data.gapMax>gapLim) late++; };
  rec=new AudioWorkletNode(AC, 'night-rec', { numberOfInputs:1, numberOfOutputs:1, channelCount:2, channelCountMode:'explicit' }); rec.connect(sink);
  const m=masterOut(); if(m) m.connect(rec);
  rec.port.onmessage=e=>{ if(e.data && e.data.L) recBuf.push([e.data.L, e.data.R]); }; }
function say(t){ const o=$('nightLabMsg'); if(o) o.textContent=t; }
/* a 16-bit stereo WAV of the recorded chunks */
function wav(chunks, rate){ const n=chunks.reduce((a, c)=>a+c[0].length, 0), b=new ArrayBuffer(44+n*4), v=new DataView(b), w=(o, s)=>{ for(let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36+n*4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, rate, true); v.setUint32(28, rate*4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n*4, true);
  let o=44; const q=x=>Math.max(-32768, Math.min(32767, Math.round(x*32767))); for(const [L, R] of chunks) for(let i=0;i<L.length;i++){ v.setInt16(o, q(L[i]), true); v.setInt16(o+2, q(R[i]), true); o+=4; }
  return new Blob([b], { type:'audio/wav' }); }
function recToggle(){ if(!rec){ say('start playing first'); return; }
  if(!recOn){ recBuf=[]; recOn=true; rec.port.postMessage({ on:true }); $('nightLabRec').textContent='Stop and save the WAV'; say('recording what you hear…'); return; }
  recOn=false; rec.port.postMessage({ on:false }); $('nightLabRec').textContent='Record what you hear';
  setTimeout(()=>{ const blob=wav(recBuf, AC.sampleRate), a=document.createElement('a'), d=new Date(), p=x=>String(x).padStart(2, '0');
    a.href=URL.createObjectURL(blob); a.download=`handsong-night-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.wav`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 30000); say(`saved ${(recBuf.reduce((x, c)=>x+c[0].length, 0)/AC.sampleRate).toFixed(1)} s (${(blob.size/1048576).toFixed(1)} MB) to your downloads`); }, 300); }
function line(){ const S=stats(), E=bed2LofiEngine(), ps=pumpStats(), last=ps.log.length ? ps.log[ps.log.length-1] : null, I=sceneInfo()||{};
  const hands=['Left', 'Right'].filter(k=>HANDS[k] && HANDS[k].lm).length;
  return `${(performance.now()/1000).toFixed(1)}s room ${sceneRoom()} hands ${hands} detector ${last ? last.action : '-'} (${ps.sched ? ps.sched.mode : '-'}) long ${longN}/${Math.round(longMax)}ms frame ${I.frameMs!=null ? I.frameMs : '-'}ms `
    +`render gap ${Math.round(lastG.gapMax)}ms drift ${Math.round(lastG.drift)}ms late ${late}${S ? ' out '+JSON.stringify(S) : ''} bed ${E && E.out ? E.out.gain.value.toFixed(3) : '-'}`; }
function render(){ if(!open) return; const S=stats(), u=S ? (S.underrunEvents!=null ? S.underrunEvents : S.fallbackFramesEvents!=null ? S.fallbackFramesEvents : null) : null;
  $('nightLabCount').textContent=`dropouts by the browser: ${u==null ? 'not reported here' : u} · late renders: ${late}${gapLim ? ` (gap over ${Math.round(gapLim)} ms)` : ' (learning what is normal…)'} · drift ${Math.round(lastG.drift)} ms · latency ${latMs()} ms`;
  const E=bed2LofiEngine(), B=E && E.bypassed ? E.bypassed() : {}; for(const [k] of BED_PARTS){ const c=$('nightLab-'+k); if(c) c.checked=!B[k]; } }
function build(){ if(built) return; built=true;
  const opts=(id, list, cur)=>{ const e=$(id); e.innerHTML=''; for(const [v, t] of list){ const o=document.createElement('option'); o.value=v; o.textContent=t; if(String(v)===String(cur)) o.selected=true; e.appendChild(o); } };
  opts('nightLabLat', LAB_LATENCY.map(v=>[v, v+(v==='interactive' ? ' (today)' : '')]), load(KEY.lat)||'interactive');
  opts('nightLabIdle', LAB_IDLE.map(v=>[v, v+(v===3 ? ' frames (today)' : ' frames')]), load(KEY.idle)||3);
  const grid=$('nightLabGrid'), box=(id, label)=>{ const l=document.createElement('label'), c=document.createElement('input'); l.className='night-lab-box'; c.type='checkbox'; c.id='nightLab-'+id; c.checked=true; l.append(c, ' '+label); grid.appendChild(l); return c; };
  grid.innerHTML='';
  for(const [k, t] of BED_PARTS) box(k, t).onchange=e=>{ const E=bed2LofiEngine(); if(!E || !E.bypass){ say('the rain’s music is not playing'); e.target.checked=true; return; } E.bypass(k, !e.target.checked); log.push('switch '+k+' '+(e.target.checked ? 'on' : 'OFF')); };
  for(const [k, t] of NATURE_PARTS) box('n-'+k, t).onchange=e=>{ skip[k]=!e.target.checked; if(!natureSkip({ ...skip })) say('the rain’s nature is not playing'); log.push('switch nature '+k+' '+(e.target.checked ? 'on' : 'OFF')); };
  box('handroom', 'hand’s room: convolution (untick = light delay network)').onchange=e=>{ const I=fxInstance(chainKeyOf('ld'), 'fdepth'); if(I && I.params[4]) I.params[4].setNorm(e.target.checked ? 0 : 1); log.push('switch hand room '+(e.target.checked ? 'convolution' : 'LIGHT')); };
  $('nightLabClose').onclick=()=>labOpen(false); $('nightLabRec').onclick=recToggle;
  $('nightLabCopy').onclick=async()=>{ const t=['Handsong Night — audio lab log', navigator.userAgent, `latency ${latMs()} ms, rate ${AC ? AC.sampleRate : '-'}`, ...log].join(String.fromCharCode(10)); try{ await navigator.clipboard.writeText(t); say('log copied ('+log.length+' lines)'); }catch(e){ say('copy failed'); } };
  $('nightLabReset').onclick=()=>{ late=0; longN=0; longMax=0; log.length=0; say('counters reset'); };
  $('nightLabLat').onchange=e=>{ save(KEY.lat, e.target.value==='interactive' ? null : e.target.value); say('reload the page to apply the new buffer'); };
  $('nightLabIdle').onchange=e=>{ const n=+e.target.value; save(KEY.idle, n===3 ? null : String(n)); setIdleSearchEvery(n); say('palm search: every '+n+' frames with no hand'); }; }
export function labOpen(v=!open){ if(!devItems()) return; build(); open=!!v; $('nightLab').hidden=!open; if(open) probes(); render(); }
/* the settings' development item, and the panel's half-second clock */
export function labWire(){ const b=$('nightLabBtn'); if(!b) return; b.hidden=!devItems(); if(!devItems()) return; b.onclick=()=>labOpen(true);
  setInterval(()=>{ if(!open) return; render(); if(++tick%1===0){ log.push(line()); if(log.length>1200) log.shift(); } }, 500); }
/* probe only */
export const labDbg=()=>({ open, built, glitch:!!glitch, rec:!!rec, late, gapLim, lastG:{ ...lastG }, log:log.length, rec_s:recBuf.reduce((x, c)=>x+c[0].length, 0)/(AC ? AC.sampleRate : 1) });
export const labWavDbg=(chunks, rate)=>wav(chunks, rate);
export const labRecNodeDbg=()=>rec;   // probe only: the recorder node
