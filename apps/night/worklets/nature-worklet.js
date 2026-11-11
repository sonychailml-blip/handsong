/* NIGHT-8: THE NATURE WORKLET «night-nature» — the stream's murmur (the law and the synthesis: apps/night/pure/brook.js, imported unchanged, so
   the listening render tools/brook-render.mjs hears exactly this). One node per engine instance, built by apps/night/sound/ambience.js once
   the module is loaded (apps/night/roomswitch.js natureLoad); its stereo output feeds each nature slot's stream gain (so the Room-sounds slider
   and the room crossfade carry it). Messages (batches): { k:'sleep', v, t } — asleep from AudioContext time t (nothing computed, zeros out);
   { k:'light', v } — the Lighter mode (fewer bubbles, the nearest voices); { k:'stats' } → posts { stats }. */
import { brookNew, brookOut, brookStats } from '../pure/brook.js';

class NightNature extends AudioWorkletProcessor{
  constructor(opt){
    super();
    const o=(opt && opt.processorOptions)||{};
    this.st=brookNew(sampleRate, o.voices||[], o.seed>>>0 || undefined); this.st.sleep=!!o.sleep; this.due=[];
    this.port.onmessage=e=>{ for(const m of (Array.isArray(e.data) ? e.data : [e.data])){
      if(m.k==='sleep') this.due=[m];   // the latest word wins (a wake cancels a sleep still pending)
      else if(m.k==='light') this.st.light=!!m.v;
      else if(m.k==='stats') this.port.postMessage({ stats:{ ...brookStats(this.st), sleep:this.st.sleep, light:this.st.light } }); } };
  }
  process(inputs, outputs){
    for(let j=this.due.length-1;j>=0;j--){ const m=this.due[j]; if(m.t==null || currentTime>=m.t){ this.st.sleep=!!m.v; this.due.splice(j, 1); } }
    const o=outputs[0], L=o[0], R=o[1]||o[0]; brookOut(this.st, L, R, 0, L.length);
    return true;
  }
}
registerProcessor('night-nature', NightNature);
