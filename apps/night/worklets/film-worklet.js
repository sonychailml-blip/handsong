/* SHARE-1 — «night-film-tap»: the heard sound for a clip, read ON THE AUDIO THREAD (the main thread's long tasks — the hands' detection — made
   a main-thread capture drop whole buffers). It passes nothing through (its output stays silent; the caller sends it to a zero gain) and posts
   the master's samples in blocks of 2048 frames with the context frame they start at; on «off» the last part is posted with done:true. */
class NightFilmTap extends AudioWorkletProcessor{
  constructor(){ super(); this.on=false; this.n=0; this.f0=0; this.L=new Float32Array(2048); this.R=new Float32Array(2048);
    this.port.onmessage=e=>{ const d=e.data||{}; if('on' in d){ if(d.on){ this.on=true; this.n=0; } else { this.on=false; this.flush(true); } } }; }
  flush(done){ const L=this.L.slice(0, this.n), R=this.R.slice(0, this.n); this.port.postMessage({ f:this.f0, L, R, done:!!done }, [L.buffer, R.buffer]); this.n=0; }
  process(inputs){ if(!this.on) return true; const i=inputs[0]||[], a=i[0], b=i[1]||a, m=a ? a.length : 128;
    for(let k=0;k<m;k++){ if(this.n===0) this.f0=currentFrame+k; this.L[this.n]=a ? a[k] : 0; this.R[this.n]=b ? b[k] : 0; if(++this.n===2048) this.flush(false); }
    return true; }
}
registerProcessor('night-film-tap', NightFilmTap);
