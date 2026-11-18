/* NIGHT-11 part 2 (audit P2, W5) — AN HONEST START, before any module runs. A classic script (it must run even when the module graph fails), no
   network. From the first paint Begin reads as loading (body.night-loading in the page); main.js calls __nightBoot.ready() once Begin really works.
   After SLOW_MS without that: «Still loading. Check the connection, or reload.» A script that fails to load, or an error or a rejected promise
   before the app is ready (an error after it, while the start card still shows): a plain message with Reload — never a dead page. It also sets
   <html lang> from the chosen language before the first paint (the dictionaries keep it in step afterwards). ?probe&bootslow=MS: the runner's
   shorter wait. */
(function(){
  var T={ en:{ slow:'Still loading. Check the connection, or reload.', fail:'Something did not load. Check the connection, then reload the page.', reload:'Reload' },
          ru:{ slow:'Всё ещё загружается. Проверьте связь или перезагрузите страницу.', fail:'Что-то не загрузилось. Проверьте связь и перезагрузите страницу.', reload:'Перезагрузить' },
          /* LANG-1: the six more languages (apps/night/lang/) */
          es:{ slow:'Todavía cargando. Comprueba la conexión o recarga la página.', fail:'Algo no se ha cargado. Comprueba la conexión y recarga la página.', reload:'Recargar' },
          pt:{ slow:'Ainda carregando. Verifique a conexão ou recarregue a página.', fail:'Algo não carregou. Verifique a conexão e recarregue a página.', reload:'Recarregar' },
          de:{ slow:'Lädt noch. Prüfe die Verbindung oder lade die Seite neu.', fail:'Etwas wurde nicht geladen. Prüfe die Verbindung und lade die Seite neu.', reload:'Neu laden' },
          fr:{ slow:'Chargement en cours. Vérifiez la connexion ou rechargez la page.', fail:'Quelque chose n’a pas été chargé. Vérifiez la connexion, puis rechargez la page.', reload:'Recharger' },
          it:{ slow:'Ancora in caricamento. Controlla la connessione o ricarica la pagina.', fail:'Qualcosa non si è caricato. Controlla la connessione, poi ricarica la pagina.', reload:'Ricarica' },
          ka:{ slow:'ჯერ კიდევ იტვირთება. შეამოწმეთ კავშირი ან გადატვირთეთ გვერდი.', fail:'რაღაც ვერ ჩაიტვირთა. შეამოწმეთ კავშირი და გადატვირთეთ გვერდი.', reload:'გადატვირთვა' } };
  var q=location.search, SLOW_MS=12000, m=/[?&]probe\b/.test(q) && /[?&]bootslow=(\d+)/.exec(q); if(m) SLOW_MS=+m[1];
  function lang(){ try{ var s=localStorage.getItem('handsong.night.lang'); if(s && T[s]) return s; }catch(e){}
    var L=(navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language||'']; for(var i=0;i<L.length;i++){ var c=String(L[i]).slice(0,2).toLowerCase(); if(T[c]) return c; } return 'en'; }
  try{ document.documentElement.setAttribute('lang', lang()); }catch(e){}
  /* DESIGN-1 part D: which level's still the start screen shows from the first paint (night.css: html[data-still]) — the stored picture level */
  try{ document.documentElement.setAttribute('data-still', localStorage.getItem('handsong.sceneLevel')==='full' ? 'full' : 'reduced'); }catch(e){}
  /* RAIN-R1: THE VISIT'S START ROOM — a random real room on every visit (the founder: sometimes the forest, sometimes the rain), or the one the address
     names (?room=forest|rain); an automated browser (navigator.webdriver: the runners) starts in the forest unless the address names a room or asks
     ?room=random (?probe&rnd=0…1 fixes the draw). html[data-room]: the still from the first paint (night.css), the start (roomswitch.js), still.js */
  var ROOMS={ forest:'room.forest', rain:'room.rain' };
  function startRoom(){ var w=(/[?&]room=(\w+)/.exec(q)||[])[1], r=Math.random(), f=/[?&]probe\b/.test(q) && /[?&]rnd=([0-9.]+)/.exec(q); if(f) r=+f[1];
    if(w && ROOMS[w]) return ROOMS[w];
    if(navigator.webdriver && w!=='random') return ROOMS.forest;
    return r<0.5 ? ROOMS.forest : ROOMS.rain; }
  try{ document.documentElement.setAttribute('data-room', startRoom()); }catch(e){}
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
