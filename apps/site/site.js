/* handsong.app (SITE-1): the language. On the English home, a saved choice — else the browser's first language — may send the visitor to /ru/;
   the RU/EN switch saves the choice. Storage may be missing or refused: the site works without it. */
(function(){
  var KEY='handsong.site.lang';
  function get(){ try{ return window.localStorage.getItem(KEY); }catch(e){ return null; } }
  function set(v){ try{ window.localStorage.setItem(KEY, v); }catch(e){} }
  var p=location.pathname;
  if(p==='/' || p==='/index.html'){
    var saved=get(), langs=navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    var ru= saved==='ru' || (saved!=='en' && /^ru\b/i.test(String(langs[0] || '')));
    if(ru){ location.replace('/ru/' + location.search + location.hash); return; }
  }
  document.addEventListener('click', function(e){
    var a=e.target && e.target.closest ? e.target.closest('a[data-lang]') : null;
    if(a) set(a.getAttribute('data-lang'));
  });
})();
