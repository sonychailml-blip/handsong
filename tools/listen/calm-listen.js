/* RUN 6 / RUN 7 (Calm sound pass) — the listening page's engine part: a separate instance of the app's engine (audio.js?listen, the render
   copy's method) renders a candidate timbre offline in a Calm mood — a short PHRASE or SINGLE notes (struck / sustained) — through the Night
   forest or DRY (the A/B). Dev tool, never shipped. Used by tools/listen/calm-timbres.html and by the runner's checks (tools/listen/
   check-listen.js, measure.js via --eval). */
import * as E from '../../src/audio.js?listen';               // a separate engine instance (like the render copy audio.js?render)
import { scaleById, scaleView, leadFreq } from '../../src/scales.js';
import { chainOwners, chainKeyOf } from '../../src/state.js';
import { FOREST } from '../../src/core/dsp.js';

const RATE=48000, SEED=0x5eed;
export const MOODS=[['major-penta','Glow'],['minor-penta','Dusk'],['egyptian','Mist']];
const KEY_A=9;                                            // the Calm key (profile.calm key.tonic) — the pitch comes from the view (rule #2)
/* RUN 7: the candidates — six new organic timbres (engines modal / breath) + today's Firefly as the reference the user already knows */
export const CANDS=[
  { id:'solo.firefly-rich', role:'ld', note:'struck tine, richer: more partials, a soft mallet, each note slightly different' },
  { id:'solo.breath-flute', role:'ld', note:'breathy flute: breath noise, a soft chiff, vibrato that fades in' },
  { id:'solo.handpan', role:'ld', note:'handpan: tuned steel, octave and fifth partials, a soft hand strike' },
  { id:'solo.singing-bowl', role:'ld', note:'singing bowl: slow beating partials, a long ring, a felt mallet' },
  { id:'solo.kalimba', role:'ld', note:'kalimba: thumb piano tine, a short wooden box, a slight buzz' },
  { id:'solo.breath-pad', role:'ld', note:'breathing pad: soft voices, slowly breathing, a little air' },
  { id:'solo.firefly', role:'ld', note:'today\'s Firefly — the reference', ref:true },
];
/* the phrase: degrees of the five-note mood (index, octave step, beats) at 72 bpm (Calm's tempo), the last note held */
const BPM=72, BEAT=60/BPM;
const PHRASE=[[0,0,0.5],[1,0,0.5],[2,0,0.5],[4,0,0.5],[3,0,1],[2,0,0.5],[1,0,0.5],[0,1,1],[4,0,0.5],[2,0,0.5],[0,0,2]];
/* single notes: the mood's root, then its fifth-ish degree an octave up, each held 2.5 s — how one note starts, sustains / rings and ends */
const SINGLE=[[0,0,4],[3,1,4]];
export const KINDS=[['phrase','Phrase'],['single','Single notes']];
const mulberry32=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
/* the page's names (the engine's own record names) */
export function nameOf(rec){ const L=E[rec.role==='ch'?'CHORD_INSTR':'LEAD_INSTR'].find(x=>x.id===rec.id); const n=L&&L.label; return typeof n==='string' ? { en:n, ru:'' } : (n||{ en:rec.id, ru:'' }); }
/* opt: room (0 / 0.5 / 1), mix (the forest send), kind ('phrase' | 'single'), dry (no forest), vol (the hand's volume, 0..1), notes (own list) */
export async function render(cand, mood, room=0.5, mix=FOREST.send, opt={}){
  const view=scaleView(scaleById(mood), 'T', undefined, KEY_A, 0), kind=opt.kind||'phrase', dry=!!opt.dry, vol=opt.vol!=null ? opt.vol : 0.7;
  const list=E[cand.role==='ch'?'CHORD_INSTR':'LEAD_INSTR'], idx=list.findIndex(x=>x.id===cand.id);
  if(idx<0) throw new Error(cand.id+' is not in this engine');
  const notes=opt.notes || (kind==='single' ? SINGLE : PHRASE), hold=kind==='single' ? 0.62 : 0.92;
  const len=Math.max(notes.reduce((s,p)=>s+p[2],0), ...notes.map(p=>p[3]||0))*BEAT+(dry?3:FOREST.rooms[2]+1);
  const ctx=new OfflineAudioContext(2, Math.round(RATE*len), RATE);
  E.renderReset(); E.setRnd(mulberry32(SEED)); E.setOffline(true);
  try{
    await E.initAudio(()=>ctx);
    E.offlineTapMaster();
    const key=chainKeyOf(cand.role);
    for(const k of new Set([...chainOwners().map(o=>o.key), key])){ const ids= k===key && !dry ? ['forest'] : []; for(const id of ids) E.fxInstance(k,id); E.fxRenderPath(k, ids, ids); }
    if(!dry){ E.fxPlaySet(key,'forest','room',room,0); E.fxPlaySet(key,'forest','mix',mix,0); }
    let t=0.1; const n=view.iv.length+1;
    notes.forEach(([d,o,b,h],i)=>{ const deg=d%n, oct=1+o+Math.floor(d/n), f=leadFreq(deg, oct, view), dur=b*BEAT, off=h!=null ? h*BEAT : dur*hold, own=(cand.role==='ch'?'loop:':'lead:')+'listen'+i;   // h: own hold (beats)
      if(cand.role==='ch'){ E.chordOn(own, [f], vol, idx, null, t); E.chordOff(own, t+off); }
      else{ E.applyFx({}); E.leadOn(own, f, vol, idx, deg, oct, null, false, t); E.leadOff(own, undefined, t+off); }
      t+=dur; });
    return await ctx.startRendering();
  } finally { E.setOffline(false); E.renderReset(); }
}
/* peak and RMS of a rendered buffer (the runner's check) */
export function levelOf(buf){ let pk=0, s=0, n=0; for(let c=0;c<buf.numberOfChannels;c++){ const d=buf.getChannelData(c); for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pk) pk=v; s+=d[i]*d[i]; n++; } } return { peak:pk, rms:Math.sqrt(s/n) }; }
/* RUN 7: loudness and quality measures of a render (mid signal):
   loud — the mean of the loudest quarter of 400-ms windows after a simple K-like weighting (a 2nd-order high-pass at 100 Hz and a +4 dB
   shelf above 2 kHz, one-pole approximations), in dB — a proxy for how loud the sound FEELS; click — the largest second difference
   relative to the local peak (±5 ms) over the whole render (≤ 0.5 is clean; a switched-on sine reaches 1); hi — the share of energy above
   5 kHz in dB (soft highs for long headphone sessions); t60 — seconds from the peak window until 60 dB below it (-1 = never) */
export function analyse(buf){
  const L=buf.getChannelData(0), R=buf.numberOfChannels>1 ? buf.getChannelData(1) : L, n=L.length, sr=buf.sampleRate, m=new Float32Array(n);
  for(let i=0;i<n;i++) m[i]=(L[i]+R[i])/2;
  // K-like weighting: high-pass (two one-pole stages at 100 Hz) + a shelf (+4 dB above ~2 kHz)
  const a1=Math.exp(-2*Math.PI*100/sr), a2=Math.exp(-2*Math.PI*2000/sr), sh=Math.pow(10,4/20)-1, w=new Float32Array(n);
  let x1=0,y1=0,x2=0,y2=0,lp=0;
  for(let i=0;i<n;i++){ const x=m[i]; y1=a1*(y1+x-x1); x1=x; y2=a1*(y2+y1-x2); x2=y1; lp=lp*a2+(1-a2)*y2; w[i]=y2+sh*(y2-lp); }
  const win=Math.round(0.4*sr), hop=Math.round(0.1*sr), ms=[];
  for(let a=0;a+win<=n;a+=hop){ let e=0; for(let i=a;i<a+win;i++) e+=w[i]*w[i]; ms.push(e/win); }
  ms.sort((a,b)=>b-a); const top=ms.slice(0, Math.max(1, Math.ceil(ms.length/4))), loud=10*Math.log10(top.reduce((s,x)=>s+x,0)/top.length+1e-12);
  // clicks: the largest second difference relative to the local peak (±5 ms; near-silence ignored) — smooth tones ≈ 0.01–0.1, a click ≈ 1
  const w5=Math.round(0.005*sr), blk=Math.max(1,w5>>2), bp=new Float32Array(Math.ceil(n/blk)); let click=0, at=0;
  for(let i=0;i<n;i++){ const v=Math.abs(m[i]), b=(i/blk)|0; if(v>bp[b]) bp[b]=v; }
  for(let i=2;i<n;i++){ let p=0; for(let b=Math.max(0,((i-w5)/blk)|0); b<=Math.min(bp.length-1,((i+w5)/blk)|0); b++) if(bp[b]>p) p=bp[b];
    if(p<1e-4) continue; const c=Math.abs(m[i]-2*m[i-1]+m[i-2])/p; if(c>click){ click=c; at=i/sr; } }
  // energy above 5 kHz (one-pole high-pass, twice)
  const h=Math.exp(-2*Math.PI*5000/sr); let hx=0,hy=0,hx2=0,hy2=0, eh=0, et=0;
  for(let i=0;i<n;i++){ const x=m[i]; hy=h*(hy+x-hx); hx=x; hy2=h*(hy2+hy-hx2); hx2=hy; eh+=hy2*hy2; et+=x*x; }
  // T60 from the 20-ms envelope
  const ew=Math.round(0.02*sr), env=[]; for(let a=0;a+ew<=n;a+=ew){ let s=0; for(let i=a;i<a+ew;i++) s+=m[i]*m[i]; env.push(10*Math.log10(s/ew+1e-20)); }
  let pk=0; env.forEach((v,i)=>{ if(v>env[pk]) pk=i; }); const j=env.findIndex((v,i)=>i>pk && v<env[pk]-60);
  let peak=0; for(let i=0;i<n;i++) peak=Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  return { loud:+loud.toFixed(2), peak:+(20*Math.log10(peak+1e-12)).toFixed(2), click:+click.toFixed(3), clickAt:+at.toFixed(3), hi:+(10*Math.log10(eh/(et+1e-20)+1e-12)).toFixed(1), t60: j<0 ? -1 : +((j-pk)*0.02).toFixed(2) };
}
/* a spectrum's strongest peaks (Hz, dB re the strongest) in a window starting at `from` s — to check the modes are where they should be */
export function peaks(buf, from=0.15, nfft=16384, count=8){
  const d=buf.getChannelData(0), sr=buf.sampleRate, a=Math.round(from*sr), re=new Float64Array(nfft), im=new Float64Array(nfft);
  for(let i=0;i<nfft && a+i<d.length;i++) re[i]=d[a+i]*(0.5-0.5*Math.cos(2*Math.PI*i/nfft));
  for(let i=1,j=0;i<nfft;i++){ let b=nfft>>1; for(;j&b;b>>=1) j^=b; j^=b; if(i<j){ [re[i],re[j]]=[re[j],re[i]]; } }
  for(let len=2;len<=nfft;len<<=1){ const ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(let i=0;i<nfft;i+=len){ let cr=1, ci=0; for(let q=0;q<len/2;q++){ const p=i+q, r=p+len/2, tr=re[r]*cr-im[r]*ci, ti=re[r]*ci+im[r]*cr;
      re[r]=re[p]-tr; im[r]=im[p]-ti; re[p]+=tr; im[p]+=ti; const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr; } } }
  const mag=new Float64Array(nfft/2); for(let k=0;k<nfft/2;k++) mag[k]=re[k]*re[k]+im[k]*im[k];
  const pk=[]; for(let k=2;k<nfft/2-2;k++) if(mag[k]>mag[k-1] && mag[k]>=mag[k+1] && mag[k]>mag[k-2] && mag[k]>=mag[k+2]) pk.push(k);
  pk.sort((x,y)=>mag[y]-mag[x]); const top=pk.slice(0,count), m0=mag[top[0]]||1;
  return top.sort((x,y)=>x-y).map(k=>[+(k*sr/nfft).toFixed(1), +(10*Math.log10(mag[k]/m0)).toFixed(1)]);
}
