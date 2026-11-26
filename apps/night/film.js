/* SHARE-1 — FILMING A CLIP WHILE PLAYING (way A, the founder 2026-11-26: start and stop by the person, the screen's shape, 60 s at most, the
   mark on the whole clip; docs/night/SHARE-PLAN.md). Each drawn frame on a 30-fps grid is composed as the screen shows it — the ROOM's canvas,
   then the 2D canvas (the hands' points and lights) blended with SCREEN exactly as the page composites it — never while the camera layer is on
   (rule #33: the camera picture never enters a clip), plus the corner mark; it goes to the browser's H.264 encoder (WebCodecs). The heard sound
   is read on the AUDIO THREAD (worklets/film-worklet.js on core masterOut — what feeds the speakers) and placed by the audio clock's own output
   timestamp, so a busy main thread loses nothing; AAC through AudioEncoder. pure/mp4.js puts both in an MP4. Nothing leaves the device: the
   file goes to the system share sheet on the person's tap, or is saved. */
import { AC, masterOut } from '../../core/audio.js';
import { cv } from '../../core/palette.js';
import { stackList } from '../../core/legacy-ui/views/stack.js';
import { sceneFrameTap } from './scene/host.js';
import { mp4Write, mp4Read } from './pure/mp4.js';
import { filmBars } from './filmbars.js';

export const FILM=Object.freeze({ maxSec:60, fps:30, keyEvery:60, mark:'Handsong Night · handsong.app', queueMax:8, displayMs:16, aacRates:[44100, 48000] });
/* SHARE-2: three trial qualities for the founder to compare by eye — the frame's size (the room's drawing size, or the screen's up to 1920 on the long side),
   bits per pixel, the encoder's mode (realtime favours speed, quality favours the picture) */
export const FILM_Q=Object.freeze({ a:Object.freeze({ name:'A: room size, about 2.5 Mbit/s, fast (as before)', size:'room', bpp:0.10, min:2.5e6, max:12e6, mode:'realtime', rate:'variable' }),
  b:Object.freeze({ name:'B: room size, 5 Mbit/s steady, quality', size:'room', bpp:1, min:5e6, max:5e6, mode:'quality', rate:'constant' }),
  c:Object.freeze({ name:'C: screen size up to 1920, 6 Mbit/s steady, quality', size:'screen', bpp:1, min:6e6, max:6e6, mode:'quality', rate:'constant' }) });   // the encoder spends a steady rate only when asked (variable undershot: 1.4 of 4 Mbit/s on the room's soft pictures)
let S=null, tapNode=null, tapReady=null;   // the recording in progress; the audio-thread tap (built once, then idle)
const now=()=>performance.now();
const bytesOf=d=>d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset+d.byteLength));   // an encoder's description: a buffer or a view
const cameraOn=()=>stackList().some(m=>m.id==='camera' && m.on);
/* what this browser can do */
export function filmSupport(){ const v=typeof VideoEncoder!=='undefined' && typeof VideoFrame!=='undefined', a=typeof AudioEncoder!=='undefined' && typeof AudioData!=='undefined' && !!AC && !!AC.audioWorklet;
  const rateOk=!AC || FILM.aacRates.includes(AC.sampleRate);
  return { video:v, audio:a && rateOk, why: !v ? 'this browser has no video encoder (WebCodecs)' : !a ? 'no sound encoder here (the clip will be silent)' : !rateOk ? `the sound runs at ${AC.sampleRate} Hz (the clip will be silent)` : '' }; }
/* the H.264 level by the frame's size in macroblocks (constrained baseline: no reordered frames, every player takes it) */
const levelOf=(w, h)=>{ const mb=Math.ceil(w/16)*Math.ceil(h/16); return mb<=3600 ? '1F' : mb<=8192 ? '28' : mb<=22080 ? '33' : null; };
function drawMark(x, w, h){ const fs=Math.max(11, Math.round(h*0.026)), pad=Math.round(h*0.03); x.font=`500 ${fs}px system-ui, sans-serif`; x.textAlign='right'; x.textBaseline='bottom';
  x.shadowColor=cv('share-shadow'); x.shadowBlur=Math.round(fs*0.4); x.fillStyle=cv('share-mark'); x.fillText(FILM.mark, w-pad, h-pad); x.shadowBlur=0; }
/* the audio-thread tap on the master, silent to the speakers (its output into a zero gain: adds exact zeros) */
async function tapBuild(){ if(tapNode) return tapNode; if(!tapReady) tapReady=(async()=>{ await AC.audioWorklet.addModule(new URL('./worklets/film-worklet.js', import.meta.url).href);
    const sink=AC.createGain(); sink.gain.value=0; sink.connect(AC.destination);
    const n=new AudioWorkletNode(AC, 'night-film-tap', { numberOfInputs:1, numberOfOutputs:1, channelCount:2, channelCountMode:'explicit' }); n.connect(sink);
    const m=masterOut(); if(m) m.connect(n); tapNode=n; return n; })(); return tapReady; }

/* start: throws a short reason when it cannot. o.onStop(reason) — called when it stops by itself (the 60-s cap) */
export async function filmStart(o={}){
  if(S) return S; const sup=filmSupport(); if(!sup.video) throw new Error(sup.why);
  const q=FILM_Q[o.quality]||FILM_Q.b, st={ q, qKey:FILM_Q[o.quality] ? o.quality : 'b', bars:0, t0:null, last:-1e9, frames:0, dropped:0, video:[], vcfg:null, audio:[], acfg:null, aFirst:null, aDone:false, err:null, started:now(), onStop:o.onStop||null, comp:null, cx:null, enc:null, aenc:null, tap:null, size:null, codec:null, overlay:false };
  S=st;
  /* the sound first (so it covers the first frame): the audio thread's blocks → AudioData → AAC; each block's moment heard from the output timestamp */
  if(sup.audio){ try{ const tap=await tapBuild(); st.tap=tap; const rate=AC.sampleRate;
      st.aenc=new AudioEncoder({ output:(c, m)=>{ if(m && m.decoderConfig && m.decoderConfig.description && !st.acfg) st.acfg={ asc:bytesOf(m.decoderConfig.description), rate:m.decoderConfig.sampleRate||rate, channels:m.decoderConfig.numberOfChannels||2 };
          const d=new Uint8Array(c.byteLength); c.copyTo(d); st.audio.push({ data:d, dur:c.duration }); }, error:e=>{ st.err='sound: '+(e&&e.message||e); } });
      st.aenc.configure({ codec:'mp4a.40.2', sampleRate:rate, numberOfChannels:2, bitrate:160000 });
      tap.port.onmessage=e=>{ const d=e.data; if(S!==st || !d) return; if(d.L && d.L.length){
          if(!st.aFirst){ const ts=AC.getOutputTimestamp ? AC.getOutputTimestamp() : null, ctxT=d.f/rate;   // when this block is HEARD, on the page's clock
            st.aFirst={ f:d.f, heardMs: ts && ts.performanceTime ? ts.performanceTime+(ctxT-ts.contextTime)*1000 : now()+((AC.outputLatency||0)+(AC.baseLatency||0))*1000-(AC.currentTime-ctxT)*1000 }; }
          const pl=new Float32Array(d.L.length*2); pl.set(d.L, 0); pl.set(d.R, d.L.length);
          const ad=new AudioData({ format:'f32-planar', sampleRate:rate, numberOfFrames:d.L.length, numberOfChannels:2, timestamp:Math.round((d.f-st.aFirst.f)*1e6/rate), data:pl });
          try{ st.aenc.encode(ad); }catch(x){ st.err='sound: '+(x&&x.message||x); } ad.close(); }
        if(d.done) st.aDone=true; };
      tap.port.postMessage({ on:true }); }
    catch(e){ st.err='sound: '+(e&&e.message||e); st.tap=null; } }
  /* the picture: after each draw, on the 30-fps grid — the room, the hands' canvas blended as the page blends it, the mark */
  sceneFrameTap((gl, t)=>{ if(S!==st || st.stopping || !gl) return;
    if(!st.enc){ let w=gl.width, h=gl.height; if(st.q.size==='screen'){ const dpr=window.devicePixelRatio||1, W=innerWidth*dpr, H=innerHeight*dpr, k=Math.min(1, 1920/Math.max(W, H)); w=Math.round(W*k); h=Math.round(H*k); }
      w&=~1; h&=~1; const lv=levelOf(w, h); if(!lv || w<16 || h<16){ st.err='the picture is too large to film'; return; }
      st.size=[w, h]; st.codec='avc1.42E0'+lv; st.comp=document.createElement('canvas'); st.comp.width=w; st.comp.height=h; st.cx=st.comp.getContext('2d', { alpha:false });
      st.enc=new VideoEncoder({ output:(c, m)=>{ if(m && m.decoderConfig && m.decoderConfig.description && !st.vcfg) st.vcfg={ avcC:bytesOf(m.decoderConfig.description) };
          const d=new Uint8Array(c.byteLength); c.copyTo(d); st.video.push({ data:d, ts:c.timestamp, key:c.type==='key' }); }, error:e=>{ st.err='video: '+(e&&e.message||e); } });
      st.enc.configure({ codec:st.codec, width:w, height:h, bitrate:Math.round(Math.min(st.q.max, Math.max(st.q.min, w*h*FILM.fps*st.q.bpp))), framerate:FILM.fps, avc:{ format:'avc' }, latencyMode:st.q.mode, bitrateMode:st.q.rate }); st.cx.imageSmoothingQuality='high'; }
    if(st.tap && !st.aFirst && now()-st.started<800) return;   // the picture starts once the sound does
    if(t-st.last<1000/FILM.fps-4) return;
    if(st.enc.encodeQueueSize>FILM.queueMax){ st.dropped++; return; }
    st.last=t; if(st.t0==null) st.t0=t;
    const [w, h]=st.size, x=st.cx; x.globalCompositeOperation='source-over'; x.drawImage(gl, 0, 0, gl.width, gl.height, 0, 0, w, h);
    const ov=document.getElementById('canvas'); if(ov && ov.width && !cameraOn()){ x.globalCompositeOperation='screen'; x.drawImage(ov, 0, 0, ov.width, ov.height, 0, 0, w, h); x.globalCompositeOperation='source-over'; st.overlay=true; }
    st.bars=filmBars(x, w, h);   // SHARE-2: the depth and effects bars as the page shows them
    drawMark(x, w, h);
    const f=new VideoFrame(st.comp, { timestamp:Math.round((t-st.t0)*1000) }); try{ st.enc.encode(f, { keyFrame:st.frames%FILM.keyEvery===0 }); st.frames++; }catch(e){ st.err='video: '+(e&&e.message||e); } f.close();
    if(!st.capped && (t-st.t0)/1000>=FILM.maxSec){ st.capped=true; const cb=st.onStop; setTimeout(()=>{ if(cb) cb('the 60-second limit'); }, 0); } });
  return st; }

export const filmState=()=>S ? { on:true, sec:S.t0==null ? 0 : (now()-S.t0)/1000, frames:S.frames, dropped:S.dropped, size:S.size, codec:S.codec, err:S.err, sound:!!S.aFirst, hands:S.overlay, bars:S.bars, quality:S.qKey } : { on:false };

/* stop → { blob, name, info } (the MP4, checked by reading it back) or throws */
export async function filmStop(){ const st=S; if(!st) throw new Error('not recording'); sceneFrameTap(null); const stopMs=now();
  if(st.tap){ await new Promise(r=>setTimeout(r, 120)); st.tap.port.postMessage({ on:false }); const lim=now()+1500; while(!st.aDone && now()<lim) await new Promise(r=>setTimeout(r, 20)); }   // the sound's last block, heard a moment after the last frame
  st.stopping=true;
  try{ if(st.enc) await st.enc.flush(); if(st.aenc && st.aenc.state==='configured') await st.aenc.flush(); }
  finally{ try{ st.enc && st.enc.close(); }catch(e){} try{ st.aenc && st.aenc.close(); }catch(e){} if(st.tap) st.tap.port.onmessage=null; S=null; }
  if(!st.video.length || !st.vcfg) throw new Error(st.err || 'no picture was filmed');
  /* the sound on the picture's clock: its first sample heard at aFirst.heardMs, the picture seen a display frame after its draw */
  let audio=null;
  if(st.audio.length && st.acfg && st.aFirst){ const rate=st.acfg.rate, frame=1024, pkt=frame*1e6/rate;
    const startUs=(st.aFirst.heardMs-st.t0-FILM.displayMs)*1000;
    let k=0; while(k<st.audio.length && startUs+(k+1)*pkt<=0) k++;
    const first=startUs+k*pkt, skip=Math.max(0, Math.round(-first*rate/1e6)), vEndUs=st.video[st.video.length-1].ts+1e6/FILM.fps;
    let e=st.audio.length; while(e>k && first+(e-1-k)*pkt>=vEndUs) e--;   // nothing past the last frame
    if(k<e) audio={ rate, channels:st.acfg.channels, asc:st.acfg.asc, bitrate:160000, frame, skip, lead:Math.max(0, first), samples:st.audio.slice(k, e), startMs:Math.round(first/1000) }; }
  const bytes=mp4Write({ width:st.size[0], height:st.size[1], avcC:st.vcfg.avcC, samples:st.video }, audio), check=mp4Read(bytes);
  const d=new Date(), p=n=>String(n).padStart(2, '0'), name=`handsong-night-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.mp4`;
  const vd=check.tracks[0], sec=vd.durations.reduce((a, b)=>a+b, 0)/vd.scale, ad=check.tracks[1], asec= ad ? ad.durations.reduce((a, b)=>a+b, 0)/ad.scale : 0;
  return { blob:new Blob([bytes], { type:'video/mp4' }), name, info:{ sec:+sec.toFixed(2), frames:st.video.length, dropped:st.dropped, size:st.size, codec:st.codec, kb:Math.round(bytes.length/1024), hands:st.overlay, quality:st.qKey, kbps:Math.round(bytes.length*8/1000/Math.max(0.1, (st.video[st.video.length-1].ts)/1e6)),
    sound: audio ? `${asec.toFixed(2)} s of sound (${audio.samples.length} AAC packets, ${audio.rate} Hz), starts ${audio.startMs} ms after the first frame` : (st.err || 'none'), soundSec:+asec.toFixed(2), finishMs:Math.round(now()-stopMs), err:st.err } }; }

/* hand the clip over: the share sheet where it takes files (call it from a tap), else a download */
export async function filmShare(blob, name){ const file=new File([blob], name, { type:'video/mp4' });
  if(navigator.canShare && navigator.canShare({ files:[file] })){ try{ await navigator.share({ files:[file], title:'Handsong Night' }); return 'shared'; }catch(e){ if(e && e.name==='AbortError') return 'cancelled'; } }
  filmSave(blob, name); return 'saved'; }
export function filmSave(blob, name){ const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 8000); }
