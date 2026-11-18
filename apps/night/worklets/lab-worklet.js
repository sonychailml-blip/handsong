/* AUDIO-3 — THE AUDIO LAB's two processors (development edition only; loaded by apps/night/audiolab.js when the founder opens the lab):
   «night-glitch»: no input, no output (an automatically pulled node); on every render call it reads the wall clock (Date.now) against the audio
     frames rendered. Real-time output asks for audio in callbacks of a few quanta; when a callback comes far later than the buffer allows, the
     render thread fell behind — an output underrun is likely. Every 250 ms it posts { gapMax (ms), calls, drift (ms: wall − audio time since the
     start; a growing drift = renders falling behind) }.
   «night-rec»: the master's signal in (2 channels), no output; while recording, posts Float32 chunks of 4096 frames per channel. Nothing leaves
     the device: the page builds a WAV file the founder saves himself. */
class NightGlitch extends AudioWorkletProcessor{
  constructor(){ super(); this.t0=Date.now(); this.f0=currentFrame; this.last=0; this.gapMax=0; this.calls=0; this.at=this.t0; }
  process(){ const now=Date.now(); if(this.last){ const gap=now-this.last; if(gap>this.gapMax) this.gapMax=gap; } this.last=now; this.calls++;
    if(now-this.at>=250){ const drift=(now-this.t0)-(currentFrame-this.f0)/sampleRate*1000; this.port.postMessage({ gapMax:this.gapMax, calls:this.calls, drift }); this.gapMax=0; this.calls=0; this.at=now; }
    return true; }
}
registerProcessor('night-glitch', NightGlitch);
class NightRec extends AudioWorkletProcessor{
  constructor(){ super(); this.on=false; this.L=new Float32Array(4096); this.R=new Float32Array(4096); this.n=0;
    this.port.onmessage=e=>{ if(e.data && 'on' in e.data){ this.on=!!e.data.on; if(!this.on && this.n){ this.flush(); } } }; }
  flush(){ this.port.postMessage({ L:this.L.slice(0, this.n), R:this.R.slice(0, this.n) }); this.n=0; }
  process(inputs){ if(!this.on) return true; const i=inputs[0]||[], a=i[0], b=i[1]||a; const m=a ? a.length : 128;
    for(let k=0;k<m;k++){ this.L[this.n]=a ? a[k] : 0; this.R[this.n]=b ? b[k] : 0; if(++this.n===4096) this.flush(); }
    return true; }
}
registerProcessor('night-rec', NightRec);
