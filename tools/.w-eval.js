const PR=await import('/core/profile.js'), H=await import('/apps/night/scene/host.js'), RS=await import('/apps/night/roomswitch.js'), B2=await import('/apps/night/bed2.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms)), out={ warns:[] }; const ow=console.warn; console.warn=(...a)=>{ out.warns.push(a.map(x=>String(x&&x.stack||x)).join(' ').slice(0,400)); ow(...a); };
const st=()=>{ const l=B2.bed2LofiDbg(); return { room:H.sceneRoom(), wanted:l.wanted, loaded:l.loaded, fail:l.fail, on:l.on }; };
out.sw=!!navigator.serviceWorker && !!navigator.serviceWorker.controller;
await RS.roomSwitch('room.rain', { fast:true }); await wait(20000); out.first=st();
await RS.roomSwitch('room.forest', { fast:true }); await wait(4000);
await RS.roomSwitch('room.rain', { fast:true }); await wait(25000); out.second=st();
out.res=performance.getEntriesByType('resource').filter(e=>/rooms\/rain\/(samples|ep-worklet|lofi|timbres\/e-piano)/.test(e.name)).map(e=>e.name.replace(location.origin,'')+' '+Math.round(e.duration)+'ms '+(e.responseStatus||'')).slice(0,12);
console.warn=ow; return out;
