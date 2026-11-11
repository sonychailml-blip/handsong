/* NIGHT-8: THE NATURE WORKLET «night-nature» — the stream's murmur (the law and the synthesis: apps/night/pure/brook.js, imported unchanged, so
   the listening render tools/brook-render.mjs hears exactly this). One node per engine instance, built by apps/night/sound/ambience.js once
   the module is loaded (apps/night/roomswitch.js natureLoad); its stereo output feeds each nature slot's stream gain (so the Room-sounds slider
   and the room crossfade carry it). Messages (batches): { k:'sleep', v, t } — asleep from AudioContext time t (nothing computed, zeros out);
   { k:'light', v } — the Lighter mode (fewer bubbles, the nearest voices); { k:'stats' } → posts { stats }.
   NIGHT-8b: { k:'rec', pcm (mono Float32Array at this context's rate), norm } — the recording (apps/night/pure/brookrec.js): the synthesis
   hands over to it in BROOK_REC.swap s (equal power) and is no longer computed; → posts { rec:{ ok, len } }. Without it the synthesis plays on. */
import { brookNew, brookOut, brookStats } from '../pure/brook.js';
import { recNew, recOut, recStats, BROOK_REC } from '../pure/brookrec.js';

class NightNature extends AudioWorkletProcessor{
  constructor(opt){
    super();
    const o=(opt && opt.processorOptions)||{};
    this.voices=o.voices||[]; this.st=brookNew(sampleRate, this.voices, o.seed>>>0 || undefined); this.st.sleep=!!o.sleep; this.due=[];
    this.rec=null; this.pcm=null; this.swap=1; this.tl=new Float32Array(128); this.tr=new Float32Array(128);
    this.port.onmessage=e=>{ for(const m of (Array.isArray(e.data) ? e.data : [e.data])){
      if(m.k==='sleep') this.due=[m];   // the latest word wins (a wake cancels a sleep still pending)
      else if(m.k==='light'){ this.st.light=!!m.v; if(this.rec) this.rec.light=!!m.v; }
      else if(m.k==='rec'){ const r=m.pcm instanceof Float32Array ? recNew(sampleRate, this.voices, m.pcm.length, +m.norm||1) : null;
        if(r){ r.sleep=this.st.sleep; r.light=this.st.light; this.rec=r; this.pcm=m.pcm; this.swap=0; }
        this.port.postMessage({ rec:{ ok:!!r, len:m.pcm ? m.pcm.length : 0 } }); }
      else if(m.k==='stats') this.port.postMessage({ stats:{ ...brookStats(this.st), sleep:this.st.sleep, light:this.st.light, rec:this.rec ? { ...recStats(this.rec), swap:this.swap } : null } }); } };
  }
  process(inputs, outputs){
    for(let j=this.due.length-1;j>=0;j--){ const m=this.due[j]; if(m.t==null || currentTime>=m.t){ this.st.sleep=!!m.v; if(this.rec) this.rec.sleep=!!m.v; this.due.splice(j, 1); } }
    const o=outputs[0], L=o[0], R=o[1]||o[0], n=L.length;
    if(!this.rec){ brookOut(this.st, L, R, 0, n); return true; }
    if(this.swap>=1 || this.st.sleep){ recOut(this.rec, this.pcm, L, R, 0, n); return true; }
    /* the hand-over: the synthesis fading out (cos), the recording in (sin), per frame */
    if(this.tl.length<n){ this.tl=new Float32Array(n); this.tr=new Float32Array(n); }
    brookOut(this.st, this.tl, this.tr, 0, n); recOut(this.rec, this.pcm, L, R, 0, n);
    const d=1/(BROOK_REC.swap*sampleRate);
    for(let i=0;i<n;i++){ const q=Math.min(1, this.swap+i*d)*Math.PI/2, a=Math.cos(q), b=Math.sin(q); L[i]=L[i]*b+this.tl[i]*a; R[i]=R[i]*b+this.tr[i]*a; }
    this.swap=Math.min(1, this.swap+n*d);
    return true;
  }
}
registerProcessor('night-nature', NightNature);
