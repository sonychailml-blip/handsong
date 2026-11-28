/* LATENCY LAB — the microphone tap: blocks of 1024 samples with the frame of their first sample (the context's clock, the same clock the click
   is started on). A missing render quantum ends the block early, so a block's samples are always consecutive. */
class LabTap extends AudioWorkletProcessor{
  constructor(){ super(); this.b=new Float32Array(1024); this.n=0; this.f=0; }
  flush(){ if(this.n){ const d=this.b.slice(0, this.n); this.port.postMessage({ f:this.f, d }, [d.buffer]); } this.n=0; }
  process(inputs){
    const ch=inputs[0] && inputs[0][0]; if(!ch) return true;
    if(this.n && currentFrame!==this.f+this.n) this.flush();
    if(!this.n) this.f=currentFrame;
    this.b.set(ch, this.n); this.n+=ch.length; if(this.n+ch.length>this.b.length) this.flush();
    return true;
  }
}
registerProcessor('lab-tap', LabTap);
