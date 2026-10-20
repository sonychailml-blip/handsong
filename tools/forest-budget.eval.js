/* RUN 9 (slice 5) — the forest's GPU BUDGET, measured the RUN 8 slice-4 way: Calm, the runner's fake camera ON (the hand model runs on every
   frame it gets), two synthetic hands through the real gesture path (the playing hand pinches a note every 0.5 s and moves over the rows; the
   effects hand holds still), the forest at each quality level ALTERNATED with Dark (the reference: no WebGL). Per step: hand detections per
   second and the detection time, the camera's fps, the scene's fps and frame time, audio dropouts. Run: node tools/probe-browser.mjs --eval
   tools/forest-budget.eval.js --no-ui (dev only; nothing here is part of the app). */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PR=await import('./src/profile.js'), H=await import('./src/views/scene/host.js'), G=await import('./src/gestures.js'), PO=await import('./src/gestures/pose.js'),
  V=await import('./src/vision.js'), M=await import('./src/latmeter.js'), A=await import('./src/audio.js'), Q=await import('./src/frzqueue.js');
Q.afPause('runner', true);
const was=PR.profileCurrent(); PR.profileApply('profile.calm');
const keepLevel=H.sceneLevel(), SEC=12, SETTLE=3000;
const pb=()=>{ try{ return A.AC.playbackStats ? A.AC.playbackStats.underrunEvents : NaN; }catch(e){ return NaN; } };
const clk={ t:9e6, W:V.canvas.width, H:V.canvas.height }; G.handsProbe(clk, ()=>true);
let k=0, run=true, t0=performance.now();
(async()=>{ while(run){ const now=performance.now(); clk.t=9e6+(now-t0); clk.W=V.canvas.width; clk.H=V.canvas.height; k++;
  const pinch= (Math.floor((now-t0)/500)%2)===0, y=0.5+0.25*Math.sin((now-t0)/2300);
  G.processHandsProbe({ landmarks:[PO.pose({ x:0.7, y, s:0.21, gaps:[pinch?0.05:1,1,1,1] }), PO.pose({ x:0.27, y:0.5, s:0.19, gaps:[1,1,1,1] })],
    handednesses:[[{ categoryName:'Right' }],[{ categoryName:'Left' }]] });
  await new Promise(r=>requestAnimationFrame(r)); } })();
/* RUN 9 (slice 5): + high without the light's shadow (H.sceneShadowDbg — measurement only), and the longest frame gap while the forest opens */
const SH=H.sceneShadowDbg||(()=>null);
const steps=[['dark',null],['forest high','full',null],['dark',null],['forest high no shadow','full',false],['dark',null],['forest medium','reduced',null],['dark',null],
  ['forest high','full',null],['dark',null],['forest high no shadow','full',false],['dark',null],['forest medium','reduced',null],['dark',null]];
let gapMax=0, lastF=0, watch=false; (function raf(t){ if(watch && lastF) gapMax=Math.max(gapMax, t-lastF); lastF=t; if(run) requestAnimationFrame(raf); })(performance.now());
const rows=[];
try{
  for(const [name,lv,sh] of steps){
    let open=null, gap=null;
    if(lv){ await H.setBackground('dark'); SH(sh); await H.setSceneLevel(lv); gapMax=0; watch=true; const o0=performance.now(); await H.setBackground('forest'); open=Math.round(performance.now()-o0); await wait(2500); watch=false; gap=Math.round(gapMax); }
    else await H.setBackground('dark');
    await wait(SETTLE);
    const r0=M.latReport(), u0=pb(), d0=r0.camera.framesDetected, s0=performance.now();
    let sf=0, sn=0; const tick=setInterval(()=>{ const I=H.sceneInfo(); if(I.webgl){ sf+=I.fps; sn++; } }, 1000);
    await wait(SEC*1000); clearInterval(tick);
    const r=M.latReport(), sec=(performance.now()-s0)/1000, I=H.sceneInfo();
    rows.push({ step:name, det:+((r.camera.framesDetected-d0)/sec).toFixed(2), detMs:r.stages.detect.mean, camFps:r.camera.fps, sceneFps: sn ? +(sf/sn).toFixed(1) : null,
      frameMs: I.webgl ? I.frameMs : null, dropouts: Number.isFinite(u0) ? pb()-u0 : null, webgl:I.webgl, openMs:open, openGapMs:gap, pixelRatio:I.pixelRatio, shadow:I.shadow });
  }
} finally { run=false; SH(null); await wait(50); G.handsProbe(null); await H.setSceneLevel(keepLevel); await H.setBackground('camera'); if(PR.profileCurrent()!==was) PR.profileApply(was); }
/* each forest step against the mean of its two Dark neighbours */
const cmp=rows.map((r,i)=>{ if(r.step==='dark') return null; const a=rows[i-1], b=rows[i+1], ref=(a.det+b.det)/2;
  return `${r.step}: detection ${r.det}/s vs Dark ${ref.toFixed(2)}/s → ${(100*(r.det/ref-1)).toFixed(1)} % · detect ${r.detMs} ms (Dark ${a.detMs} / ${b.detMs}) · scene ${r.sceneFps} fps, ${r.frameMs} ms · dropouts ${r.dropouts} · open ${r.openMs} ms, longest frame gap ${r.openGapMs} ms · pixel ratio ${r.pixelRatio}, shadow ${r.shadow}`; }).filter(Boolean);
return { gpu:(M.latReport().gpu||{}).renderer||null, rows, cmp, handsFed:k };
