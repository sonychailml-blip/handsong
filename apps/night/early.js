/* CORE-20 (audit P1) — MEDIAPIPE'S BINARY EARLY, NEVER AGAINST THE PAGE'S OWN FILES. A classic script after the guard. It waits for the page's
   load event AND for Begin to work (guard.js's __nightBoot: the modules and the scale data have arrived), then for an idle moment, and only then
   preloads MediaPipe's WebAssembly binary and its loader (11 MB with the binary: the files MediaPipe asks for last, after the model). The model and
   the library are already being fetched at that moment by the early model build (core boot earlyModel, CORE-19), so they are not preloaded here
   (a preload issued after their request would download them twice). core/handdet.js's MediaPipe asks for the very same addresses in the very same
   request modes (the binary by fetch, CORS without credentials; the loader as an anonymous script) and gets the preloaded copies. Low priority. Not
   with Save-Data (the model then waits for the tap, as before); not under ?probe&oldstart or ?probe&oldload (the CONTROLS of the start timeline and
   of the loading measurement). The no-SIMD build is left to the library (MediaPipe's own SIMD test decides; preloading the wrong one would cost
   11 MB). The addresses are core/handdet.js's: data row «NIGHT early model files (app)» compares them. */
(function(){
  var MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
  var q=location.search, probe=/[?&]probe\b/.test(q);
  try{ var c=navigator.connection; if(c && c.saveData) return; }catch(e){}
  if(probe && /[?&](oldstart|oldload)\b/.test(q)) return;
  var simd=false; try{ simd=WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }catch(e){}
  if(!simd) return;
  window.__nightEarly={ simd:simd, at:null };
  function add(rel, href, as){ var l=document.createElement('link'); l.rel=rel; l.href=href; if(as) l.as=as; l.crossOrigin='anonymous'; try{ l.fetchPriority='low'; }catch(e){} document.head.appendChild(l); }
  function go(){ add('preload', MP+'/wasm/vision_wasm_internal.wasm', 'fetch'); add('preload', MP+'/wasm/vision_wasm_internal.js', 'script'); window.__nightEarly.at=Math.round(performance.now()); }
  function idle(){ if(typeof requestIdleCallback==='function') requestIdleCallback(go, { timeout:2000 }); else setTimeout(go, 200); }
  function ready(){ return !!(window.__nightBoot && window.__nightBoot.state().done); }
  /* the page's own files first: the load event, then Begin working (checked every 200 ms; never after 60 s — a page that never works needs no binary) */
  function wait(){ var k=0, iv=setInterval(function(){ if(ready()){ clearInterval(iv); idle(); } else if(++k>300) clearInterval(iv); }, 200); }
  if(document.readyState==='complete') wait(); else window.addEventListener('load', wait, { once:true });
})();
