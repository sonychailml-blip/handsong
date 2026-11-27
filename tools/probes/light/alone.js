/* LIGHT-3 row «LIGHT on its own» (the founder: «only what it really has; nothing hidden, nothing unused loaded»), measured in the running page —
   runs FIRST, before any row that imports core's gestures for comparison: (1) every script and stylesheet the page has loaded is Light's own or a
   clean core part — none of the shared legacy UI or its stylesheet, the recorder, songs, the backing, track freezing, the renderer, autosave, core's
   gesture state machine, or another app; (2) the page holds none of Full's markup (its top bar, menus, panels). CONTROL: the same test on a list
   with the recorder added must fail. Static twin: check-static (17). */
const NOT_LIGHT=/\/core\/(legacy-ui|song|live|freeze)\/|\/core\/(recorder|arrange|autosave|clip|frzqueue|render|handcal)\.js$|\/core\/gestures\/(hands|roles|looper|expr)\.js$|\/core\/gestures\.js$|\/apps\/(full|night)\//;
const FULL_IDS=['bar','scaleBtn','soundBtn','instrBtn','splitBtn','recBtn','loopPanelBtn','selScale','selTonic','selLead','rollBar','arrOv','helpOv','demoOv','status'];
export async function checkLightAlone(){
  const diffs=[], miss=s=>diffs.push(s);
  const names=performance.getEntriesByType('resource').map(e=>new URL(e.name, location.href).pathname).filter(p=>/\.(m?js|css)$/.test(p));
  const app=names.filter(p=>!p.startsWith('/tools/'));   // the probe modules themselves are not the app
  const bad=app.filter(p=>NOT_LIGHT.test(p));
  for(const p of bad) miss('loaded: '+p);
  if(app.length<10) miss('only '+app.length+' app files seen — the resource list is not what it should be');
  const ids=FULL_IDS.filter(id=>document.getElementById(id)); if(ids.length) miss('Full\'s markup on the page: #'+ids.join(', #'));
  if(!app.filter(p=>NOT_LIGHT.test(p)).length && !([...app, '/core/recorder.js'].filter(p=>NOT_LIGHT.test(p)).length)) miss('CONTROL: a list holding the recorder was not caught');
  const kb=Math.round(performance.getEntriesByType('resource').filter(e=>!new URL(e.name, location.href).pathname.startsWith('/tools/') && /\.(m?js|css)$/.test(e.name)).reduce((s,e)=>s+(e.decodedBodySize||0),0)/1024);
  return { pass:!diffs.length, diffs, note:`${app.length} app scripts and sheets, ${kb} KB` };
}
