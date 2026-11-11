/* NIGHT-8 — THE STREAM'S LISTENING SAMPLES (dev only; nothing here ships). Two 40-s stereo WAVs (48 kHz, 16-bit) for the user's ear:
     node tools/brook-render.mjs                      (a) the synthesized stream: apps/night/pure/brook.js with the forest's voices
                                                      (apps/night/rooms/forest/pure/stream.js streamVoices) — the very code the app runs
     node tools/brook-render.mjs --rec FILE.wav       (b) as well: a CC0 recording, looped without a seam (a loop body cut from the file, its
                                                      end crossfaded into its start with equal power, so the join has no step in level or
                                                      phase), played twice through the 40 s; the same RMS as (a)
   Out: tools/.listen/brook-a-synth.wav, brook-b-recording.wav (git-ignored). Prints each file's RMS and peak, and (a)'s longest self-similarity
   over 1…20 s (normalised autocorrelation of the 50-ms energy envelope: a loop would show a peak near 1). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brookNew, brookOut, brookStats } from '../apps/night/pure/brook.js';
import { FOREST_ROOM } from '../apps/night/rooms/forest/pure/room.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT=path.join(ROOT, 'tools', '.listen'), FS=48000, SEC=40;
const argv=process.argv.slice(2), val=f=>{ const i=argv.indexOf(f); return i>=0 ? argv[i+1] : null; };
const db=x=>(20*Math.log10(Math.max(1e-9, x))).toFixed(1)+' dBFS';
const rms=(L, R)=>{ let s=0; for(let i=0;i<L.length;i++) s+=L[i]*L[i]+R[i]*R[i]; return Math.sqrt(s/(2*L.length)); };
const peak=(L, R)=>{ let p=0; for(let i=0;i<L.length;i++) p=Math.max(p, Math.abs(L[i]), Math.abs(R[i])); return p; };
function wavOf(L, R, fs){ const n=L.length, b=Buffer.alloc(44+n*4); b.write('RIFF',0); b.writeUInt32LE(36+n*4,4); b.write('WAVE',8); b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(2,22);
  b.writeUInt32LE(fs,24); b.writeUInt32LE(fs*4,28); b.writeUInt16LE(4,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*4,40);
  for(let i=0;i<n;i++){ b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i]))*32767), 44+i*4); b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i]))*32767), 46+i*4); } return b; }
/* a PCM (16 / 24 / 32-bit int) or float WAV → { fs, L, R } (mono doubled) */
function wavRead(buf){ if(buf.toString('ascii',0,4)!=='RIFF' || buf.toString('ascii',8,12)!=='WAVE') throw new Error('not a WAV');
  let o=12, fmt=null, data=null; while(o+8<=buf.length){ const id=buf.toString('ascii',o,o+4), n=buf.readUInt32LE(o+4); if(id==='fmt ') fmt=buf.subarray(o+8,o+8+n); else if(id==='data') data=buf.subarray(o+8,o+8+n); o+=8+n+(n&1); }
  if(!fmt || !data) throw new Error('no fmt / data chunk'); let tag=fmt.readUInt16LE(0); const ch=fmt.readUInt16LE(2), fs=fmt.readUInt32LE(4), bits=fmt.readUInt16LE(14); if(tag===0xFFFE) tag=fmt.readUInt16LE(24);
  const bps=bits/8, n=Math.floor(data.length/(bps*ch)), L=new Float32Array(n), R=new Float32Array(n);
  const rd=i=> tag===3 ? (bits===32 ? data.readFloatLE(i) : data.readDoubleLE(i)) : bits===16 ? data.readInt16LE(i)/32768 : bits===24 ? data.readIntLE(i,3)/8388608 : data.readInt32LE(i)/2147483648;
  for(let i=0;i<n;i++){ L[i]=rd(i*bps*ch); R[i]= ch>1 ? rd(i*bps*ch+bps) : L[i]; } return { fs, L, R, ch, bits, tag }; }
/* linear resampling to FS (enough for a listening sample) */
function resample(x, from){ if(from===FS) return x; const n=Math.floor(x.length*FS/from), y=new Float32Array(n); for(let i=0;i<n;i++){ const p=i*from/FS, k=Math.floor(p), f=p-k; y[i]=(x[k]||0)*(1-f)+(x[k+1]||0)*f; } return y; }
/* the 50-ms energy envelope's normalised autocorrelation, its largest value over lags 1…20 s */
function selfSim(L, R){ const h=FS/20, m=Math.floor(L.length/h), e=new Float64Array(m); for(let k=0;k<m;k++){ let s=0; for(let i=k*h;i<(k+1)*h;i++) s+=L[i]*L[i]+R[i]*R[i]; e[k]=Math.sqrt(s/h); }
  const mu=e.reduce((a,b)=>a+b,0)/m; for(let k=0;k<m;k++) e[k]-=mu; let best=0, at=0;
  for(let lag=20;lag<=Math.min(400, m-40);lag++){ let s=0, a=0, b=0; for(let k=0;k+lag<m;k++){ s+=e[k]*e[k+lag]; a+=e[k]*e[k]; b+=e[k+lag]*e[k+lag]; } const c=s/Math.sqrt(a*b||1); if(c>best){ best=c; at=lag/20; } }
  return { best, at }; }

mkdirSync(OUT, { recursive:true });
const V=FOREST_ROOM.nature.stream.voices, st=brookNew(FS, V), N=FS*SEC, L=new Float32Array(N), R=new Float32Array(N);
const t0=Date.now(); for(let o=0;o<N;o+=128) brookOut(st, L, R, o, Math.min(128, N-o)); const ms=Date.now()-t0;
const fade=Math.round(FS*1.5); for(let i=0;i<fade;i++){ const g=i/fade; L[i]*=g; R[i]*=g; L[N-1-i]*=g; R[N-1-i]*=g; }   // the file's own ends only
const ra=rms(L, R), ss=selfSim(L, R), S=brookStats(st);
writeFileSync(path.join(OUT, 'brook-a-synth.wav'), wavOf(L, R, FS));
console.log(`[brook] (a) synthesized: tools/.listen/brook-a-synth.wav — RMS ${db(ra)}, peak ${db(peak(L, R))}, ${S.made} bubbles (${(S.made/SEC).toFixed(0)}/s), ${S.dropped} dropped; rendered in ${ms} ms (${(ms/SEC/10).toFixed(2)} % of real time at 48 kHz); longest self-similarity ${ss.best.toFixed(3)} at ${ss.at.toFixed(2)} s`);
const rec=val('--rec');
if(rec){ const w=wavRead(readFileSync(rec)), xl=resample(w.L, w.fs), xr=resample(w.R, w.fs), XF=Math.round(FS*3), BODY=Math.min(xl.length-XF-FS, Math.round(FS*24)), from=Math.round(FS*4);
  /* the loop: body [from, from+BODY), its last XF frames crossfaded (equal power) with the XF frames just before `from` — the join is seamless */
  const lp=new Float32Array(BODY), rp=new Float32Array(BODY);
  for(let i=0;i<BODY;i++){ lp[i]=xl[from+i]; rp[i]=xr[from+i]; if(i>=BODY-XF){ const k=(i-(BODY-XF))/XF, a=Math.cos(k*Math.PI/2), b=Math.sin(k*Math.PI/2), j=from-XF+(i-(BODY-XF)); lp[i]=xl[from+i]*a+xl[j]*b; rp[i]=xr[from+i]*a+xr[j]*b; } }
  const BL=new Float32Array(N), BR=new Float32Array(N); for(let i=0;i<N;i++){ BL[i]=lp[i%BODY]; BR[i]=rp[i%BODY]; }
  /* a little distance: a gentle one-pole low-pass at 7 kHz and the stereo a touch narrower (the recording is «up close») */
  const k=1-Math.exp(-2*Math.PI*7000/FS); let zl=0, zr=0; for(let i=0;i<N;i++){ zl+=(BL[i]-zl)*k; zr+=(BR[i]-zr)*k; const m=(zl+zr)/2, s=(zl-zr)/2*0.75; BL[i]=m+s; BR[i]=m-s; }
  const g=ra/rms(BL, BR); for(let i=0;i<N;i++){ BL[i]*=g; BR[i]*=g; } for(let i=0;i<fade;i++){ const q=i/fade; BL[i]*=q; BR[i]*=q; BL[N-1-i]*=q; BR[N-1-i]*=q; }
  writeFileSync(path.join(OUT, 'brook-b-recording.wav'), wavOf(BL, BR, FS)); const sb=selfSim(BL, BR);
  console.log(`[brook] (b) recording: tools/.listen/brook-b-recording.wav — source ${w.fs} Hz, ${w.bits}-bit, ${w.ch} ch, ${(w.L.length/w.fs).toFixed(1)} s; loop body ${(BODY/FS).toFixed(1)} s with a ${XF/FS}-s equal-power join (seams at ${[1,2].map(j=>(j*BODY/FS).toFixed(1)+' s').filter((x,j)=>(j+1)*BODY<N).join(', ')}); RMS ${db(rms(BL, BR))}, peak ${db(peak(BL, BR))}; self-similarity ${sb.best.toFixed(3)} at ${sb.at.toFixed(2)} s`); }
/* NIGHT-8b: (c) THE SHIPPED STREAM — the recording the app plays (apps/night/rooms/forest/sound/stream.mp3, decoded here by ffmpeg, a dev tool
   outside the repo; the browser decodes it itself) through the app's own grain law (apps/night/pure/brookrec.js), 40 s, at the room's level
   factor `norm`. Prints the factor that brings the grains to (a)'s K-like loudness (the listening page's measure, as the probes' kLoud) —
   the room's recipe stores it — the joins per voice and the longest self-similarity (a loop would show a peak near 1). */
{ const { spawnSync }=await import('node:child_process'), RC=await import('../apps/night/pure/brookrec.js'), S=FOREST_ROOM.nature.stream;
  const file=path.join(ROOT, 'apps/night/rooms/forest', S.rec.file), dec=spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(FS), '-'], { maxBuffer:1<<28 });
  if(dec.status!==0 || !dec.stdout.length) console.log('[brook] (c) not rendered: ffmpeg could not decode '+file+' — '+String(dec.stderr||dec.error||'').trim());
  else { const pcm=new Float32Array(dec.stdout.buffer.slice(dec.stdout.byteOffset, dec.stdout.byteOffset+dec.stdout.length));
    const kLoud=(x, rate)=>{ const a1=Math.exp(-2*Math.PI*100/rate), a2=Math.exp(-2*Math.PI*2000/rate), sh=Math.pow(10,4/20)-1, n=x.length, w=new Float32Array(n); let x1=0,y1=0,x2=0,y2=0,lp=0;   // tools/probes/night/night.js kLoud, the same numbers
      for(let i=0;i<n;i++){ const v=x[i]; y1=a1*(y1+v-x1); x1=v; y2=a1*(y2+y1-x2); x2=y1; lp=lp*a2+(1-a2)*y2; w[i]=y2+sh*(y2-lp); }
      const win=Math.round(0.4*rate), hop=Math.round(0.1*rate), ms=[]; for(let a=0;a+win<=n;a+=hop){ let e=0; for(let i=a;i<a+win;i++) e+=w[i]*w[i]; ms.push(e/win); }
      ms.sort((p,q)=>q-p); const top=ms.slice(0, Math.max(1, Math.ceil(ms.length/4))); return 10*Math.log10(top.reduce((s,v)=>s+v,0)/top.length+1e-12); };
    const mid=(A, B)=>{ const m=new Float32Array(A.length); for(let i=0;i<A.length;i++) m[i]=(A[i]+B[i])/2; return m; };
    const one=RC.recNew(FS, V, pcm.length, 1), CL=new Float32Array(N), CR=new Float32Array(N); for(let o=0;o<N;o+=128) RC.recOut(one, pcm, CL, CR, o, Math.min(128, N-o));
    const ka=kLoud(mid(L, R).subarray(FS*2), FS), k1=kLoud(mid(CL, CR).subarray(FS*2), FS), want=Math.pow(10, (ka-k1)/20);
    const st2=RC.recNew(FS, V, pcm.length, S.rec.norm), XL=new Float32Array(N), XR=new Float32Array(N), t0=Date.now(); for(let o=0;o<N;o+=128) RC.recOut(st2, pcm, XL, XR, o, Math.min(128, N-o)); const ms=Date.now()-t0;
    for(let i=0;i<fade;i++){ const q=i/fade; XL[i]*=q; XR[i]*=q; XL[N-1-i]*=q; XR[N-1-i]*=q; }
    writeFileSync(path.join(OUT, 'brook-c-shipped.wav'), wavOf(XL, XR, FS)); const sc=selfSim(XL, XR), kc=kLoud(mid(XL, XR).subarray(FS*2), FS);
    let xy=0, xx=0, yy=0; for(let i=0;i<N;i++){ xy+=XL[i]*XR[i]; xx+=XL[i]*XL[i]; yy+=XR[i]*XR[i]; }
    console.log(`[brook] (c) shipped: tools/.listen/brook-c-shipped.wav — ${S.rec.file} decoded: ${(pcm.length/FS).toFixed(1)} s mono; ${st2.grains} grains (${(st2.grains/(V.length*2)).toFixed(1)} per stream in 40 s), ${RC.BROOK_REC.fade}-s equal-power joins, never across the file's ends; RMS ${db(rms(XL, XR))}, peak ${db(peak(XL, XR))}; K-like ${kc.toFixed(2)} dB against (a) ${ka.toFixed(2)} dB (${(kc-ka>=0?'+':'')+(kc-ka).toFixed(2)} dB); L/R correlation ${(xy/Math.sqrt(xx*yy||1)).toFixed(3)}; self-similarity ${sc.best.toFixed(3)} at ${sc.at.toFixed(2)} s; rendered in ${ms} ms`);
    console.log(`[brook] (c) the level factor that matches (a)'s K-like loudness: norm ${want.toFixed(4)} (the room's recipe has ${S.rec.norm})`); } }
