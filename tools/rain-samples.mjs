/* RAIN-4b — THE RAIN ROOM's RECORDED INSTRUMENTS (dev tool; never runs in the app). From the CC0 sources in tools/design/rain/music/cc0/ (VSCO-2 CE's
   solo contrabass pizzicato, VCSL's TX81Z FM piano, soft-mallet vibraphone, bass drum, suspended cymbals and hi-hat, three Freesound CC0 brush
   recordings — register «rain-music-sources») it writes the room's samples: each note or hit trimmed at its onset, faded, its peak at −3 dBFS, mono
   44.1 kHz MP3 at 96 kb/s → apps/night/rooms/rain/samples/*.mp3 and samples.json (each file's root pitch in Hz, or null for a drum; the SHA-1 of
   every source). The files' names say an octave low for the vibraphone and the bass (measured: «C3» sounds C4) — corrected here.
     node tools/rain-samples.mjs        (needs ffmpeg) */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC=path.join(ROOT, 'tools/design/rain/music/cc0'), OUT=path.join(ROOT, 'apps/night/rooms/rain/samples'), FS=44100;
const dec=f=>{ const r=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(FS), '-'], { maxBuffer:1<<30 }); if(r.status!==0) throw new Error('ffmpeg: '+r.stderr);
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset+r.stdout.length)); };
const enc=(f, x)=>{ const b=Buffer.alloc(x.length*4); for(let i=0;i<x.length;i++) b.writeFloatLE(x[i], i*4); const r=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', String(FS), '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', f], { input:b, maxBuffer:1<<30 }); if(r.status!==0) throw new Error('ffmpeg: '+r.stderr); };
const NOTE={ C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11 }, hz=(n, oct)=>440*Math.pow(2, (NOTE[n]+12*(oct+1)-69)/12);
/* a cut: from `at` s (or the onset), `len` s long, a fade of `fade` s at its end (and `fadeIn` at its start), peak −3 dBFS */
function cut(x, { at=null, len, fade=0.25, fadeIn=0.004 }){ const pk0=x.reduce((a, v)=>Math.max(a, Math.abs(v)), 0); let s= at==null ? 0 : Math.round(at*FS);
  if(at==null){ while(s<x.length && Math.abs(x[s])<pk0*0.02) s++; s=Math.max(0, s-Math.round(0.004*FS)); }
  const n=Math.min(Math.round(len*FS), x.length-s), y=x.slice(s, s+n), fi=Math.round(fadeIn*FS), fo=Math.round(fade*FS);
  for(let i=0;i<fi && i<n;i++) y[i]*=i/fi; for(let i=0;i<fo && i<n;i++) y[n-1-i]*=i/fo;
  const pk=y.reduce((a, v)=>Math.max(a, Math.abs(v)), 0)||1, g=Math.pow(10, -3/20)/pk; for(let i=0;i<n;i++) y[i]*=g; return y; }
const JOBS=[];
for(const f of readdirSync(SRC)){ let m;
  if((m=/^bass_([A-G]s?)(\d)\.wav$/.exec(f))) JOBS.push({ src:f, name:'bass-'+m[1]+m[2], hz:hz(m[1].replace('s', '#'), +m[2]+1), len:2.6, fade:0.4 });
  else if((m=/^ep_([A-G])(\d)\.wav$/.exec(f))) JOBS.push({ src:f, name:'ep-'+m[1]+m[2], hz:hz(m[1], +m[2]), len:3.6, fade:0.8 });
  else if((m=/^vib_([A-G])(\d)\.wav$/.exec(f))) JOBS.push({ src:f, name:'vib-'+m[1]+m[2], hz:hz(m[1], +m[2]+1), len:4, fade:1 }); }
JOBS.push({ src:'kick.wav', name:'kick', hz:null, len:1.1, fade:0.4 }, { src:'ride_pp.wav', name:'ride-tip', hz:null, len:2.4, fade:1.2 }, { src:'ride_soft.wav', name:'ride-wash', hz:null, len:3, fade:1.5 },
  { src:'hat_foot.wav', name:'hat-foot', hz:null, len:0.5, fade:0.2 }, { src:'hat_tick.wav', name:'hat-tick', hz:null, len:0.4, fade:0.2 },
  { src:'brush_614387.mp3', name:'tap-1', hz:null, len:0.45, fade:0.15 }, { src:'brush_725845.mp3', name:'tap-2', hz:null, at:8.86, len:0.4, fade:0.15 }, { src:'brush_725845.mp3', name:'tap-3', hz:null, at:16.0, len:0.4, fade:0.15 },
  { src:'brushset_843460.mp3', name:'swish-1', hz:null, at:10.0, len:1.1, fade:0.35, fadeIn:0.12 }, { src:'brushset_843460.mp3', name:'swish-2', hz:null, at:20.0, len:1.1, fade:0.35, fadeIn:0.12 });
mkdirSync(OUT, { recursive:true }); for(const f of readdirSync(OUT)) if(f.endsWith('.mp3')) unlinkSync(path.join(OUT, f));
const out={ made:'RAIN-4b', rate:FS, files:{}, sources:{} }; let bytes=0;
for(const J of JOBS){ const x=dec(path.join(SRC, J.src)), y=cut(x, J), f=J.name+'.mp3'; enc(path.join(OUT, f), y); const sz=readFileSync(path.join(OUT, f)).length; bytes+=sz;
  out.files[J.name]={ file:f, hz:J.hz==null ? null : +J.hz.toFixed(3), sec:+(y.length/FS).toFixed(3) };
  out.sources[J.src]=createHash('sha1').update(readFileSync(path.join(SRC, J.src))).digest('hex'); }
writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify(out, null, 1)+'\n');
console.log(`[rain-samples] ${JOBS.length} samples, ${(bytes/1024).toFixed(0)} KB → apps/night/rooms/rain/samples/`);
