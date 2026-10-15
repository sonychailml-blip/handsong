/* LAT2b — hand detection OFF the main thread (a CLASSIC worker: MediaPipe starts each model by importScripts of its loader, which a
   module worker cannot do; our modules come in by dynamic import). Owns one detector (handdet.js: L1 + L2, GPU through an OffscreenCanvas
   WebGL context when the browser offers it). Messages in: init {delegate, w, h}; frame {id, t, bmp, action, policy} (the ImageBitmap is
   TRANSFERRED here and back — the page draws the very frame that was detected); delegate {d}; dbg {o}. Out: ready {warmMs}; fail {msg};
   res {id, res, action, n, ms, t0, t1, bmp} with t0/t1 in the page's clock (timeOrigin difference applied); log {line} for MediaPipe's
   own console lines (the model's real processor, LAT1b). Frames and results never leave the device (rule #33): this file and the
   MediaPipe files it loads are its only network use. */
/* modules load INSIDE init (a dynamic import): a module that cannot load or run here comes back as a 'fail' message with its reason
   instead of the worker's opaque error event */
let D=null, initDone=false;
function tapConsole(MP_LINE){
  for(const k of ['log','info','warn','error','debug']){ const f=console[k]; if(typeof f!=='function') continue;
    console[k]=function(...a){ const s=a[0]; if(typeof s==='string' && s.length<600 && MP_LINE.test(s)) postMessage({ type:'log', line:s }); return f.apply(this,a); }; }
}
const abs=t=>performance.timeOrigin+t;   // the page subtracts its own timeOrigin
self.onmessage=async e=>{
  const m=e.data;
  if(m.type==='init'){
    if(initDone) return; initDone=true;
    try{
      if(m.failInit) throw new Error('probe: worker start refused on purpose');
      const [{ createDetector }, { MP_LINE }]=await Promise.all([import('./handdet.js'), import('./core/latency.js')]);
      tapConsole(MP_LINE);
      const blank=()=>{ const c=new OffscreenCanvas(m.w||640, m.h||480), g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,c.width,c.height); return c; };
      D=await createDetector({ delegate:m.delegate, blank, step:s=>postMessage({ type:'step', step:s }) });
      postMessage({ type:'ready', warmMs:D.warmMs });
    }catch(err){ postMessage({ type:'fail', msg:String(err&&err.message||err) }); }
  }
  else if(m.type==='frame'){
    const t0=abs(performance.now());
    let r=null, err='';
    try{ r=D.run(m.bmp, m.t, m.action, m.policy); }catch(x){ err=String(x&&x.message||x); }
    const t1=abs(performance.now());
    postMessage({ type:'res', id:m.id, res:r?r.res:null, action:r?r.action:m.action, n:r?r.n:0, ms:r?r.ms:0, t0, t1, err, bmp:m.bmp }, [m.bmp]);
  }
  else if(m.type==='delegate'){
    try{ await D.setDelegate(m.d); postMessage({ type:'delegated', d:m.d }); }catch(x){ postMessage({ type:'delegated', d:m.d, err:String(x&&x.message||x) }); }
  }
  else if(m.type==='dbg'){ if(D) D.dbg(m.o||{}); }
};
