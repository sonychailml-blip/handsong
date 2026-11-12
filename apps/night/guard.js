/* NIGHT-11 part 2 (audit P2, W5) — AN HONEST START, before any module runs. A classic script (it must run even when the module graph fails), no
   network. From the first paint Begin reads as loading (body.night-loading in the page); main.js calls __nightBoot.ready() once Begin really works.
   After SLOW_MS without that: «Still loading. Check the connection, or reload.» A script that fails to load, or an error or a rejected promise
   before the app is ready (an error after it, while the start card still shows): a plain message with Reload — never a dead page. It also sets
   <html lang> from the chosen language before the first paint (the dictionaries keep it in step afterwards). ?probe&bootslow=MS: the runner's
   shorter wait. */
(function(){
  var T={ en:{ slow:'Still loading. Check the connection, or reload.', fail:'Something did not load. Check the connection, then reload the page.', reload:'Reload' },
          ru:{ slow:'Всё ещё загружается. Проверьте связь или перезагрузите страницу.', fail:'Что-то не загрузилось. Проверьте связь и перезагрузите страницу.', reload:'Перезагрузить' } };
  var q=location.search, SLOW_MS=12000, m=/[?&]probe\b/.test(q) && /[?&]bootslow=(\d+)/.exec(q); if(m) SLOW_MS=+m[1];
  function lang(){ try{ var s=localStorage.getItem('handsong.night.lang'); if(s==='en' || s==='ru') return s; }catch(e){}
    var L=(navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language||'']; for(var i=0;i<L.length;i++){ var c=String(L[i]).slice(0,2).toLowerCase(); if(c==='en' || c==='ru') return c; } return 'en'; }
  try{ document.documentElement.setAttribute('lang', lang()); }catch(e){}
  var done=false, failed=false, slow=false, t0=Date.now();
  function el(id){ return document.getElementById(id); }
  function show(kind){ var L=T[lang()], box=el('nightBootMsg'); if(!box) return false; el('nightBootText').textContent=L[kind]; var b=el('nightBootReload'); b.textContent=L.reload; b.hidden=false; box.hidden=false; box.setAttribute('data-kind', kind); return true; }
  function startShown(){ var s=el('start'); return !!s && s.classList.contains('on'); }
  function soon(kind){ if(show(kind)) return; var k=0, iv=setInterval(function(){ if(show(kind) || ++k>100) clearInterval(iv); }, 100); }   /* the page may not be parsed yet */
  function fail(){ if(failed || (done && !startShown())) return; failed=true; soon('fail'); }
  window.__nightBoot={
    ready:function(){ done=true; document.body.classList.remove('night-loading'); var b=el('nightBegin'); if(b) b.removeAttribute('aria-busy'); var box=el('nightBootMsg'); if(box && !failed) box.hidden=true; },
    state:function(){ return { done:done, failed:failed, slow:slow, ms:Date.now()-t0, slowMs:SLOW_MS }; } };
  setTimeout(function(){ if(!done && !failed){ slow=true; soon('slow'); } }, SLOW_MS);
  window.addEventListener('error', function(e){ var t=e.target; if(t && t!==window && t.nodeType===1){ if(t.tagName==='SCRIPT' && t.type==='module') fail(); return; }   /* only the app's own module graph: a picture, a sound or the page counter that failed is not a dead page */ if(!done || startShown()) fail(); }, true);
  window.addEventListener('unhandledrejection', function(){ if(!done) fail(); });
  document.addEventListener('click', function(e){ var b=e.target && e.target.closest && e.target.closest('#nightBootReload'); if(b) location.reload(); });
})();
