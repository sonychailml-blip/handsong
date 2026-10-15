/* LAT2 — the hand DETECTOR: MediaPipe's hand model, worker-safe (no DOM — it runs inside src/hand-worker.js and, as the fallback, on
   the main thread through vision.js). Two models built from ONE downloaded model file: L2 (numHands 2) and L1 (numHands 1); which one
   runs on a frame is chosen by the search schedule (core/handsched.js) — the caller passes the action. Results go out as PLAIN data
   ({ landmarks, handednesses }), the same shape on both paths. Frames are ImageBitmaps (a snapshot of one camera frame).
   Measured (headless, LAT2a): L2 on one hand 87 ms (it palm-searches every frame), L1 45 ms; switching numHands by setOptions ≈ 1 s per
   switch (graph rebuild, tracking lost) — hence two models. The FIRST detection of a model stalls ≈ 1.3–1.6 s (shaders): `warm` runs
   it on a blank frame before the app shows (the 1188-ms startup task of LAT1b was this first detection). */
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
import { schedRetry } from './core/handsched.js';

export const MP_WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
export const MP_MODEL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/* plain copy of a result: landmarks [[{x,y,z}]] and handednesses [[{categoryName, score, index, displayName}]] */
export function plainResult(r){
  const L=(r&&r.landmarks)||[], H=(r&&(r.handednesses||r.handedness))||[];
  return { landmarks:L.map(h=>h.map(p=>({ x:p.x, y:p.y, z:p.z }))),
           handednesses:H.map(c=>c.map(k=>({ categoryName:k.categoryName, score:k.score, index:k.index, displayName:k.displayName }))) };
}
export const EMPTY_RESULT=Object.freeze({ landmarks:[], handednesses:[] });

/* build both models (sequentially: MediaPipe's loader keeps one global while it starts a model) and warm each on a blank frame.
   `blank` makes the warm-up frame (OffscreenCanvas). Runs on the main thread or in a CLASSIC worker (MediaPipe loads its WebAssembly
   loader with a script tag or importScripts; in a module worker the second model could not start). */
export async function createDetector({ delegate='GPU', blank=null, step=null }={}){
  const files=await FilesetResolver.forVisionTasks(MP_WASM);
  if(step) await step('model');
  const buf=new Uint8Array(await (await fetch(MP_MODEL)).arrayBuffer());   // the model file once, for both models
  const mk=n=>HandLandmarker.createFromOptions(files,{ baseOptions:{ modelAssetBuffer:buf.slice(), delegate },
    runningMode:'VIDEO', numHands:n, minHandDetectionConfidence:0.5, minTrackingConfidence:0.5 });
  const L2=await mk(2), L1=await mk(1);
  let ts=0, slowMs=0, script=null, scriptI=0, fake=false;
  const nextTs=t=>{ ts=Math.max(ts+1, Math.floor(t)); return ts; };   // VIDEO mode: strictly increasing timestamps per model
  const warmMs={};
  const warm=()=>{ for(const [k,L] of [['L2',L2],['L1',L1]]){ const t0=performance.now(); L.detectForVideo(blank(), nextTs(performance.now())); warmMs[k]=performance.now()-t0; } };
  if(blank){ if(step) await step('warm'); warm(); }
  const model=a=> a==='track1' ? L1 : L2;
  /* one frame: run `action` ('skip' runs nothing); a tracking action that found no hand retries a search (schedRetry). Returns the
     plain result, the action that finally ran and the model time. Probe hooks: slowMs (busy-wait, a detector slower than the camera)
     script (hand counts per run seen by the SCHEDULE — the result itself stays what the model returned) and fake (a made-up hand is
     added to every result: the worker = main-thread comparison's CONTROL) */
  function run(src, t, action, policy){
    const t0=performance.now(); let res=EMPTY_RESULT, a=action, n=0;
    const once=x=>{ if(x==='skip') return EMPTY_RESULT; return plainResult(model(x).detectForVideo(src, nextTs(t))); };
    const count=(r,x)=> script ? Math.min(script[Math.min(scriptI++, script.length-1)], x==='track1'?1:2) : r.landmarks.length;   // the script = hands IN VIEW; L1 sees one
    res=once(a); n=count(res,a);
    const re=schedRetry(a, n, policy);
    if(re){ a=a+'>'+re; res=once(re); n=count(res,re); }
    if(fake) res={ landmarks:[...res.landmarks, Array.from({ length:21 }, (_,i)=>({ x:0.5, y:0.5+i/100, z:0 }))], handednesses:[...res.handednesses, [{ categoryName:'Left', score:1, index:0, displayName:'Left' }]] };
    if(slowMs){ const e=performance.now()+slowMs; while(performance.now()<e); }
    return { res, action:a, n, ms:performance.now()-t0 };
  }
  return {
    run, warmMs,
    /* both models move; then both warm up — the first inference after a switch stalls, and MediaPipe prints its processor line (LAT1b)
       only at that first inference: warmed here, the line lands in the switch's own window, not later under the next setting */
    async setDelegate(d){ await L2.setOptions({ baseOptions:{ delegate:d } }); await L1.setOptions({ baseOptions:{ delegate:d } }); if(blank) warm(); },
    dbg(o={}){ if('slowMs' in o) slowMs=+o.slowMs||0; if('script' in o){ script=o.script||null; scriptI=0; } if('fake' in o) fake=!!o.fake; },
    close(){ try{ L2.close(); }catch(e){} try{ L1.close(); }catch(e){} },
  };
}
