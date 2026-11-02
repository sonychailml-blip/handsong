/* NIGHT-1 stage 1: the laptop's numbers. Run: node tools/probe-browser.mjs --app night --eval tools/night-headroom.eval.js --no-ui --cdn-cache --limit-min 60 (dev only). */
const H=await import('/tools/probes/night/headroom.js'), Q=await import('/core/frzqueue.js'), PR=await import('/core/profile.js');
Q.afPause('runner', true);
if(PR.profileCurrent()!=='profile.night') PR.profileApply('profile.night');
const log=s=>console.log('[hr] '+s), out={};
H.stopCamera(); await (await import('/core/legacy-ui/draw.js')).setBackground('dark'); await new Promise(r=>setTimeout(r,1500));
out.offline=await H.deepOffline(log);
out.realtime=await H.realtime(log,{ depth:4 });
return H.reportOf(out);
