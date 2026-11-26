/* SHARE-1 — FILMING A CLIP WHILE PLAYING (way A, the founder 2026-11-26: start and stop by the person, the screen's shape, 60 s at most, the
   mark on the whole clip; docs/night/SHARE-PLAN.md). Each drawn frame of the ROOM's canvas (never the camera, never the 2D overlay — rule #33)
   on a 30-fps grid is copied with the mark into a small canvas and handed to the browser's H.264 encoder (WebCodecs); the heard sound comes
   from the live output tap (core/audio.js createRecordingTap: after the limiter — exactly what is heard) through the browser's AAC encoder;
   pure/mp4.js puts both in an MP4. Nothing leaves the device: the file goes to the system share sheet on the person's tap, or is saved. */
import { AC, createRecordingTap } from '../../core/audio.js';
import { cv } from '../../core/palette.js';
import { sceneFrameTap } from './scene/host.js';
import { mp4Write, mp4Read } from './pure/mp4.js';

export const FILM=Object.freeze({ maxSec:60, fps:30, keyEvery:60, mark:'Handsong Night · handsong.app', queueMax:8 });
let S=null;   // the recording in progress
const now=()=>performance.now();
const bytesOf=d=>d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset+d.byteLength));   // an encoder's description: a buffer or a view
/* what this browser can do: the video encoder and frames, the sound's encoder and capture path */
export function filmSupport(){ const v=typeof VideoEncoder!=='undefined' && typeof VideoFrame!=='undefined', a=typeof AudioEncoder!=='undefined', cap=typeof MediaStreamTrackProcessor!=='undefined';
  return { video:v, audio:a && cap, why: !v ? 'this browser has no video encoder (WebCodecs)' : !(a && cap) ? 'no sound capture here (the clip will be silent)' : '' }; }
/* the H.264 level by the frame's size in macroblocks (constrained baseline: no reordered frames, every player takes it) */
const levelOf=(w, h)=>{ const mb=Math.ceil(w/16)*Math.ceil(h/16); return mb<=3600 ? '1F' : mb<=8192 ? '28' : mb<=22080 ? '33' : null; };
function drawMark(x, w, h){ const fs=Math.max(11, Math.round(h*0.026)), pad=Math.round(h*0.03); x.font=`500 ${fs}px system-ui, sans-serif`; x.textAlign='right'; x.textBaseline='bottom';
  x.shadowColor=cv('share-shadow'); x.shadowBlur=Math.round(fs*0.4); x.fillStyle=cv('share-mark'); x.fillText(FILM.mark, w-pad, h-pad); x.shadowBlur=0; }

/* start: throws a short reason when it cannot. o.onStop(reason) — called when it stops by itself (the 60-s cap, an encoder error) */
export async function filmStart(o={}){
  if(S) return S; const sup=filmSupport(); if(!sup.video) throw new Error(sup.why);
  S={ t0:null, last:-1e9, frames:0, dropped:0, video:[], vcfg:null, audio:[], acfg:null, aFirst:null, err:null, started:now(), onStop:o.onStop||null, comp:null, cx:null, enc:null, aenc:null, tap:null, reader:null, size:null, codec:null };
  const st=S;
  /* the sound first (so it covers the first frame): the live tap → its track → AudioData → AAC */
  if(sup.audio && AC){ try{ st.tap=createRecordingTap(); const track=st.tap && st.tap.stream.getAudioTracks()[0];
      if(track){ st.reader=new MediaStreamTrackProcessor({ track }).readable.getReader();
        st.aenc=new AudioEncoder({ output:(c, m)=>{ if(m && m.decoderConfig && m.decoderConfig.description && !st.acfg) st.acfg={ asc:bytesOf(m.decoderConfig.description), rate:m.decoderConfig.sampleRate, channels:m.decoderConfig.numberOfChannels };
            const d=new Uint8Array(c.byteLength); c.copyTo(d); st.audio.push({ data:d, ts:c.timestamp }); }, error:e=>{ st.err='sound: '+(e&&e.message||e); } });
        (async()=>{ for(;;){ let r; try{ r=await st.reader.read(); }catch(e){ break; } if(r.done || S!==st || st.stopping) { if(r.value) r.value.close(); break; }
            const ad=r.value; if(!st.aFirst){ st.aFirst={ perfUs:now()*1000-ad.duration, ts:ad.timestamp, rate:ad.sampleRate };
              try{ st.aenc.configure({ codec:'mp4a.40.2', sampleRate:ad.sampleRate, numberOfChannels:Math.min(2, ad.numberOfChannels), bitrate:160000 }); }catch(e){ st.err='sound: '+(e&&e.message||e); } }
            try{ if(st.aenc.state==='configured') st.aenc.encode(ad); }catch(e){ st.err='sound: '+(e&&e.message||e); } ad.close(); } })(); } }
    catch(e){ st.err='sound: '+(e&&e.message||e); } }
  /* the picture: the room's frames after each draw, on the 30-fps grid, with the mark */
  sceneFrameTap((gl, t)=>{ if(S!==st || st.stopping || !gl) return;
    if(!st.enc){ const w=gl.width&~1, h=gl.height&~1, lv=levelOf(w, h); if(!lv || w<16 || h<16){ st.err='the picture is too large to film'; return; }
      st.size=[w, h]; st.codec='avc1.42E0'+lv; st.comp=document.createElement('canvas'); st.comp.width=w; st.comp.height=h; st.cx=st.comp.getContext('2d', { alpha:false });
      st.enc=new VideoEncoder({ output:(c, m)=>{ if(m && m.decoderConfig && m.decoderConfig.description && !st.vcfg) st.vcfg={ avcC:bytesOf(m.decoderConfig.description) };
          const d=new Uint8Array(c.byteLength); c.copyTo(d); st.video.push({ data:d, ts:c.timestamp, key:c.type==='key' }); }, error:e=>{ st.err='video: '+(e&&e.message||e); } });
      st.enc.configure({ codec:st.codec, width:w, height:h, bitrate:Math.round(Math.min(12e6, Math.max(2.5e6, w*h*FILM.fps*0.1))), framerate:FILM.fps, avc:{ format:'avc' }, latencyMode:'realtime' }); }
    if(st.reader && !st.aFirst && now()-st.started<600) return;   // the picture starts once the sound does (its capture takes a moment to begin)
    if(t-st.last<1000/FILM.fps-4) return;
    if(st.enc.encodeQueueSize>FILM.queueMax){ st.dropped++; return; }
    st.last=t; if(st.t0==null) st.t0=t;
    const [w, h]=st.size; st.cx.drawImage(gl, 0, 0, w, h, 0, 0, w, h); drawMark(st.cx, w, h);
    const f=new VideoFrame(st.comp, { timestamp:Math.round((t-st.t0)*1000) }); try{ st.enc.encode(f, { keyFrame:st.frames%FILM.keyEvery===0 }); st.frames++; }catch(e){ st.err='video: '+(e&&e.message||e); } f.close();
    if(!st.capped && (t-st.t0)/1000>=FILM.maxSec){ st.capped=true; const cb=st.onStop; setTimeout(()=>{ if(cb) cb('the 60-second limit'); }, 0); } });
  return st; }

export const filmState=()=>S ? { on:true, sec:S.t0==null ? 0 : (now()-S.started)/1000, frames:S.frames, dropped:S.dropped, size:S.size, codec:S.codec, err:S.err, sound:!!S.aFirst } : { on:false };

/* stop → { blob, name, info } (the MP4, checked by reading it back) or throws */
export async function filmStop(){ const st=S; if(!st) throw new Error('not recording'); sceneFrameTap(null); const stopMs=now();
  if(st.reader) await new Promise(r=>setTimeout(r, 300));   // the sound arrives a little after it is heard: let its tail in, then stop
  st.stopping=true;
  try{ if(st.reader) try{ await st.reader.cancel(); }catch(e){} if(st.tap) st.tap.dispose();
    if(st.enc) await st.enc.flush(); if(st.aenc && st.aenc.state==='configured') await st.aenc.flush(); }
  finally{ try{ st.enc && st.enc.close(); }catch(e){} try{ st.aenc && st.aenc.close(); }catch(e){} S=null; }
  if(!st.video.length || !st.vcfg) throw new Error(st.err || 'no picture was filmed');
  /* the sound placed on the picture's clock: its first sample's moment heard (+ the output latency), the packets before the first frame skipped */
  let audio=null;
  if(st.audio.length && st.acfg && st.aFirst){ const rate=st.acfg.rate, frame=1024, latUs=AC ? ((AC.outputLatency||0)+(AC.baseLatency||0))*1e6-16000 : 0;
    const startUs=st.aFirst.perfUs+(st.audio[0].ts-st.aFirst.ts)+latUs-st.t0*1000;   // the first packet's moment on the clip's clock (µs)
    let k=0; while(k<st.audio.length && startUs+(k+1)*frame*1e6/rate<=0) k++;
    const first=startUs+k*frame*1e6/rate, skip=Math.max(0, Math.round(-first*rate/1e6));
    const vEndUs=st.video[st.video.length-1].ts+33333; let e=st.audio.length; while(e>k && startUs+(e-1)*frame*1e6/rate>=vEndUs) e--;   // nothing past the last frame
    if(k<e) audio={ rate, channels:st.acfg.channels, asc:st.acfg.asc, bitrate:160000, frame, skip, lead:Math.max(0, first), samples:st.audio.slice(k, e), startMs:Math.round(startUs/1000), latMs:Math.round(latUs/1000) }; }
  const bytes=mp4Write({ width:st.size[0], height:st.size[1], avcC:st.vcfg.avcC, samples:st.video }, audio), check=mp4Read(bytes);
  const d=new Date(), p=n=>String(n).padStart(2, '0'), name=`handsong-night-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.mp4`;
  const vd=check.tracks[0], sec=vd.durations.reduce((a, b)=>a+b, 0)/vd.scale;
  return { blob:new Blob([bytes], { type:'video/mp4' }), name, info:{ sec:+sec.toFixed(2), frames:st.video.length, dropped:st.dropped, size:st.size, codec:st.codec, kb:Math.round(bytes.length/1024),
    sound: audio ? `${audio.samples.length} AAC packets, ${audio.rate} Hz, starts ${audio.startMs} ms after the first frame (latency ${audio.latMs} ms)` : (st.err || `none (packets ${st.audio.length}, config ${!!st.acfg}, first ${!!st.aFirst})`), finishMs:Math.round(now()-stopMs), err:st.err } }; }

/* hand the clip over: the share sheet where it takes files (call it from a tap), else a download */
export async function filmShare(blob, name){ const file=new File([blob], name, { type:'video/mp4' });
  if(navigator.canShare && navigator.canShare({ files:[file] })){ try{ await navigator.share({ files:[file], title:'Handsong Night' }); return 'shared'; }catch(e){ if(e && e.name==='AbortError') return 'cancelled'; } }
  filmSave(blob, name); return 'saved'; }
export function filmSave(blob, name){ const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 8000); }
