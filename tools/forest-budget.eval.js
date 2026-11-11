/* RUN 9 (slice 5) — the forest's GPU BUDGET, measured the RUN 8 slice-4 way: Night, the runner's fake camera ON (the hand model runs on every
   frame it gets), two synthetic hands through the real gesture path (the playing hand pinches a note every 0.5 s and moves over the rows; the
   effects hand holds still), the forest at each quality level ALTERNATED with Dark (the reference: no WebGL). Per step: hand detections per
   second and the detection time, the camera's fps, the scene's fps and frame time, audio dropouts. Run: node tools/probe-browser.mjs --eval
   tools/forest-budget.eval.js --no-ui (dev only; nothing here is part of the app).
   NIGHT-6 slice 0: medium also AS IT WAS BEFORE NIGHT-6 (its additions left out through the measurement door: the baseline), each twice, and
   per step the room's draw calls, triangles, shader programs and texture memory. */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PR=await import('/core/profile.js'), H=await import('/apps/night/scene/host.js'), G=await import('/core/gestures.js'), PO=await import('/core/gestures/pose.js'),
  V=await import('/core/vision.js'), M=await import('/core/legacy-ui/latmeter.js'), A=await import('/core/audio.js'), Q=await import('/core/frzqueue.js');
Q.afPause('runner', true);
const was=PR.profileCurrent(); PR.profileApply('profile.night');
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
const BEFORE={ dew:0, webs:0, sorrel:0, forb:0, bilberry:0, anemone:0, nettle:0, sedge:0, fern2:0, softEdges:false, rocks:0, pebbles:0, floaters:0, mistStrips:0, roots:0, logs:0, stumps:0, snags:0, twigs:0, moss:0, ivy:0, woodShrooms:0, flare:false, barkMoss:false, shade:false, gust:false, gustLeaves:0, crowns:false, crownShare:0, young:0, shrubs:0, saplings:0, stars:0, dapple:false, moonFace:false, paint:false, paintR:0, vignette:false, grain:false, breath:false, foxfire:0, flowers:0, groundTex:false, groundMacro:false, litterLeaves:0, litterPebbles:0, litterTwigs:0 }, HARD={ softEdges:false };   // NIGHT-6: soft edges' cost   // NIGHT-6: the counts its slices added
const steps=[['dark',null],['forest high','full',null],['dark',null],['forest medium','reduced',null],['dark',null],['forest medium hard edges','reduced',null,HARD],['dark',null],['forest medium before NIGHT-6','reduced',null,BEFORE],['dark',null],
  ['forest medium','reduced',null],['dark',null],['forest medium hard edges','reduced',null,HARD],['dark',null],['forest medium before NIGHT-6','reduced',null,BEFORE],['dark',null],['forest high','full',null],['dark',null],['forest high, no light shadow','full',0],['dark',null]];   // NIGHT-6 slice 6: what high's cost is
let gapMax=0, lastF=0, watch=false; (function raf(t){ if(watch && lastF) gapMax=Math.max(gapMax, t-lastF); lastF=t; if(run) requestAnimationFrame(raf); })(performance.now());
const rows=[];
try{
  for(const [name,lv,sh,over] of steps){
    let open=null, gap=null;
    if(lv){ await H.setBackground('dark'); SH(sh); H.sceneOptDbg(over ? { lv:over } : null); await H.setSceneLevel(lv); gapMax=0; watch=true; const o0=performance.now(); await H.setBackground('forest'); open=Math.round(performance.now()-o0); await wait(2500); watch=false; gap=Math.round(gapMax); }
    else await H.setBackground('dark');
    await wait(SETTLE);
    const r0=M.latReport(), u0=pb(), d0=r0.camera.framesDetected, s0=performance.now();
    let sf=0, sn=0; const tick=setInterval(()=>{ const I=H.sceneInfo(); if(I.webgl){ sf+=I.fps; sn++; } }, 1000);
    await wait(SEC*1000); clearInterval(tick);
    const r=M.latReport(), sec=(performance.now()-s0)/1000, I=H.sceneInfo();
    rows.push({ step:name, det:+((r.camera.framesDetected-d0)/sec).toFixed(2), detMs:r.stages.detect.mean, camFps:r.camera.fps, sceneFps: sn ? +(sf/sn).toFixed(1) : null,
      frameMs: I.webgl ? I.frameMs : null, dropouts: Number.isFinite(u0) ? pb()-u0 : null, webgl:I.webgl, openMs:open, openGapMs:gap, pixelRatio:I.pixelRatio, shadow:I.shadow,
      calls:I.calls, triangles:I.triangles, programs:I.programs, texMB:+(I.texBytes/1048576).toFixed(2) });   // NIGHT-6 slice 0
  }
} finally { run=false; SH(null); H.sceneOptDbg(null); await wait(50); G.handsProbe(null); await H.setSceneLevel(keepLevel); await H.setBackground('camera'); if(PR.profileCurrent()!==was) PR.profileApply(was); }
/* each forest step against the mean of its two Dark neighbours */
const cmp=rows.map((r,i)=>{ if(r.step==='dark') return null; const a=rows[i-1], b=rows[i+1], ref=(a.det+b.det)/2;
  return `${r.step}: detection ${r.det}/s vs Dark ${ref.toFixed(2)}/s → ${(100*(r.det/ref-1)).toFixed(1)} % · detect ${r.detMs} ms (Dark ${a.detMs} / ${b.detMs}) · scene ${r.sceneFps} fps, ${r.frameMs} ms · dropouts ${r.dropouts} · open ${r.openMs} ms, longest frame gap ${r.openGapMs} ms · pixel ratio ${r.pixelRatio}, shadow ${r.shadow} · draws ${r.calls}, triangles ${r.triangles}, programs ${r.programs}, textures ${r.texMB} MB`; }).filter(Boolean);
return { gpu:(M.latReport().gpu||{}).renderer||null, rows, cmp, handsFed:k };
