/* RAIN-1 — THE RAIN ROOM'S SOUND FILES from the founder's picks (dev tool; never runs in the app). Needs ffmpeg on the PATH (a dev tool outside the
   repo, as at RAIN-3). From the design sources tools/design/rain/sound/ (CC0, register «rain-sound-candidates»):
   - near-c («Rain on window», ckjzam) → apps/night/rooms/rain/sound/pane.mp3 — the near layer, rumble below 45 Hz removed;
   - far-c («Light rain at night with cars passing by», humi74) → the FAR BED street.mp3: its car-free stretches joined by equal-power crossfades (rain
     and the city's hum, no car), and CARS cars.mp3: each car pass cut out as a mono one-shot, the passes one after another with silence between.
   The car passes are found on the 100-ms loudness envelope (above the bed's median by CAR_DB, merged, padded; a run of 0.5 s is kept out of the bed,
   one of MIN_PASS s becomes a one-shot); each pass's PEAK (its closest moment) is
   measured on the 250-ms smoothed envelope. Prints the passes' table for the room's recipe (rooms/rain/pure/room.js nature.layers.passes.segs:
   [start, length, peak] seconds inside cars.mp3) and writes tools/design/rain/sound/cars.json.
     node tools/rain-sound.mjs          write the three files and the table
     node tools/rain-sound.mjs --dry    only print what it finds */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC=path.join(ROOT, 'tools/design/rain/sound'), OUT=path.join(ROOT, 'apps/night/rooms/rain/sound');
const FS=48000, DRY=process.argv.includes('--dry'), CAR_DB=2.6, PAD=0.45, MIN_PASS=1.6, XF=0.5, GAP=0.5, EDGE=0.25;
const tmp=mkdtempSync(path.join(tmpdir(), 'rain-sound-'));
const ff=(...a)=>execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio:['ignore', 'pipe', 'inherit'] });
const decode=f=>{ const o=path.join(tmp, path.basename(f)+'.f32'); ff('-i', f, '-f', 'f32le', '-ac', '2', '-ar', String(FS), o); const b=readFileSync(o); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset+b.length)); };
const encode=(pcm, ch, file, kbps)=>{ const raw=path.join(tmp, 'out.f32'); writeFileSync(raw, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
  ff('-f', 'f32le', '-ar', String(FS), '-ac', String(ch), '-i', raw, '-af', 'highpass=f=45', '-c:a', 'libmp3lame', '-b:a', kbps+'k', file); };
try{
  /* the far recording: its envelope, the passes, the bed */
  const X=decode(path.join(SRC, 'far-c.mp3')), n=X.length/2, H=FS/10, env=[];
  for(let k=0;k*H<n;k++){ let s=0; const e=Math.min(n, (k+1)*H); for(let i=k*H;i<e;i++) s+=X[2*i]**2+X[2*i+1]**2; env.push(10*Math.log10(s/(2*(e-k*H))+1e-12)); }
  const med=[...env].sort((a, b)=>a-b)[Math.floor(env.length/2)], hot=env.map(v=>v-med>CAR_DB);
  /* runs above the threshold, merged when closer than 0.6 s, kept when at least MIN_PASS long (a single loud tick is not a car) */
  let runs=[]; for(let k=0;k<hot.length;k++) if(hot[k]){ const last=runs[runs.length-1]; if(last && k-last[1]<=6) last[1]=k; else runs.push([k, k]); }
  const pad=([a, b])=>[Math.max(0, a/10-PAD), Math.min(n/FS, (b+1)/10+PAD)], quiet=runs.filter(([a, b])=>(b-a+1)/10>=0.5).map(pad);   // even a short far car stays out of the bed
  runs=runs.filter(([a, b])=>(b-a+1)/10>=MIN_PASS).map(pad);
  /* each pass's peak: the 250-ms smoothed envelope's maximum inside it */
  const sm=env.map((_, k)=>{ let s=0, c=0; for(let j=k-1;j<=k+1;j++) if(j>=0 && j<env.length){ s+=Math.pow(10, env[j]/10); c++; } return 10*Math.log10(s/c); });
  const passes=runs.map(([a, b])=>{ let best=a, bv=-1e9; for(let k=Math.ceil(a*10);k<Math.floor(b*10);k++) if(sm[k]>bv){ bv=sm[k]; best=k/10+0.05; } return { from:+a.toFixed(2), to:+b.toFixed(2), peak:+best.toFixed(2), db:+(bv-med).toFixed(1) }; });
  /* the bed: the stretches between passes (each at least 2 s), joined by equal-power crossfades of XF s */
  const keep=[]; let t=0; for(const [a, b] of quiet){ if(a-t>=2) keep.push([t, a]); t=Math.max(t, b); } if(n/FS-t>=2) keep.push([t, n/FS]);
  const xf=Math.round(XF*FS), pieces=keep.map(([a, b])=>X.subarray(Math.round(a*FS)*2, Math.round(b*FS)*2));
  const bedLen=pieces.reduce((s, p)=>s+p.length/2, 0)-xf*(pieces.length-1), bed=new Float32Array(bedLen*2); let o=0;
  pieces.forEach((p, j)=>{ const m=p.length/2;
    for(let i=0;i<m;i++){ let g=1; if(j>0 && i<xf) g=Math.sin(Math.PI/2*i/xf); if(j<pieces.length-1 && i>=m-xf) g=Math.cos(Math.PI/2*(i-(m-xf))/xf);
      bed[(o+i)*2]+=p[i*2]*g; bed[(o+i)*2+1]+=p[i*2+1]*g; }
    o+=m-xf; });
  /* the cars: each pass mono, faded in and out over EDGE s, one after another with GAP s of silence */
  const segs=[], parts=passes.map(p=>{ const a=Math.round(p.from*FS), b=Math.round(p.to*FS), m=b-a, e=Math.round(EDGE*FS), y=new Float32Array(m);
    for(let i=0;i<m;i++){ const g=Math.min(1, i/e, (m-1-i)/e); y[i]=(X[(a+i)*2]+X[(a+i)*2+1])/2*g; } return y; });
  const gap=Math.round(GAP*FS), carLen=parts.reduce((s, y)=>s+y.length+gap, gap), cars=new Float32Array(carLen); o=gap;
  parts.forEach((y, j)=>{ cars.set(y, o); segs.push([+(o/FS).toFixed(4), +(y.length/FS).toFixed(4), +((passes[j].peak-passes[j].from)).toFixed(4)]); o+=y.length+gap; });
  console.log(`[rain-sound] far-c: median ${med.toFixed(1)} dB, ${passes.length} car passes: ${passes.map(p=>`${p.from}–${p.to} s (peak ${p.peak} s, +${p.db} dB)`).join('; ')}`);
  console.log(`[rain-sound] the bed: ${keep.map(([a, b])=>`${a.toFixed(1)}–${b.toFixed(1)}`).join(', ')} → ${(bedLen/FS).toFixed(1)} s; the cars: ${(carLen/FS).toFixed(1)} s`);
  console.log('[rain-sound] segs for the recipe: '+JSON.stringify(segs));
  if(!DRY){
    const near=decode(path.join(SRC, 'near-c.mp3'));
    encode(near, 2, path.join(OUT, 'pane.mp3'), 96); encode(bed, 2, path.join(OUT, 'street.mp3'), 96); encode(cars, 1, path.join(OUT, 'cars.mp3'), 64);
    writeFileSync(path.join(SRC, 'cars.json'), JSON.stringify({ source:'far-c.mp3', median:+med.toFixed(1), passes, bed:keep.map(([a, b])=>[+a.toFixed(2), +b.toFixed(2)]), segs }, null, 1));
    console.log('[rain-sound] wrote pane.mp3, street.mp3, cars.mp3 and tools/design/rain/sound/cars.json');
  }
} finally { rmSync(tmp, { recursive:true, force:true }); }
