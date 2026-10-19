/* UI1b (DAY run 2026-10-16): THE ICON COMPONENT — every interface glyph is rendered through here, by a NAME of its meaning.
   Today a name maps to the very Unicode glyph the interface showed before (no visible change); the person's own authored icon set
   (BACKLOG §7.19) replaces the table — and the renderer — in this one place. Names are meanings, so one glyph may serve two names
   (🎚 is both «mixer» and «bass» today) and the redesign can give them different pictures.
   Doors: icon(name) → the icon's text (DOM text, canvas fillText); iconText(s) expands «{i:name}» tokens inside a string (the i18n
   dictionaries carry tokens, t() expands them); applyIcons(root) fills every [data-icon] element of the markup (called by applyI18n).
   Pure module (no DOM at import): i18n.js imports it, and the data runner loads i18n in node. ⛳ An interface glyph outside this file
   fails the licence checker's glyph audit (LIC1, «icon» kind); console texts and probes are exempt there. */
const ICONS={
  // transport and recording
  'play':'▶', 'pause':'⏸', 'pause-bar':'❚', 'stop':'■', 'to-start':'⏮', 'repeat':'⟳', 'record':'●',
  'undo':'↶', 'redo':'↷', 'undo-take':'⤺', 'clear':'✕',
  // generic actions
  'close':'✕', 'delete':'✕', 'remove':'⊘', 'edit':'✎', 'cut':'✂', 'copy':'⧉', 'paste':'📋', 'trash':'🗑', 'add-point':'✚', 'plus':'＋',
  'up':'▲', 'down':'▼', 'fold-closed':'▸', 'fold-open':'▾', 'done':'✓', 'swap':'⇄', 'fit':'⤢', 'pick':'⬚', 'quantise':'⌗',
  // shapes and lanes
  'shape-step':'⌐', 'shape-glide':'╱', 'curve':'⌒', 'bar-empty':'▯', 'bar-full':'▮', 'arrange':'▤',
  // hand axes
  'axis-y':'↕', 'axis-x':'↔', 'axis-z':'◆',
  // screen and panels
  'half-left':'◧', 'split':'◨', 'loop-panel':'⚙', 'fullscreen':'⛶', 'install':'⬇', 'language':'🌐', 'camera':'🔄',
  'clip':'🎥', 'audio-clip':'🎙', 'mixer':'🎚', 'sound':'🎛', 'backing':'🎵',
  // roles
  'solo':'🎸', 'chords':'🎹', 'bass':'🎚', 'drums':'🥁',
  // lessons
  'step-done':'●', 'step-todo':'○',
};
const icon=name=> ICONS[name] ?? '{i:'+name+'}';   // an unknown name stays visible as its token (the data row checks every token)
const iconText=s=> typeof s==='string' && s.includes('{i:') ? s.replace(/\{i:([\w-]+)\}/g, (m,n)=> ICONS[n] ?? m) : s;
function applyIcons(root){ if(!root||!root.querySelectorAll) return; root.querySelectorAll('[data-icon]').forEach(el=>{ const v=el.getAttribute('data-icon'); el.textContent= v.includes('{i:') ? iconText(v) : icon(v); });
  /* RUN 7: drawn icons (data-svg="name") and the emblem (data-svg="emblem") — built once per element */
  root.querySelectorAll('[data-svg]').forEach(el=>{ if(el.firstElementChild && el.firstElementChild.tagName.toLowerCase()==='svg') return; const v=el.getAttribute('data-svg'), doc=el.ownerDocument;
    const g= v==='emblem' ? svgEmblem(doc) : svgIcon(doc, v); if(g) el.replaceChildren(g); else el.textContent='{svg:'+v+'}'; }); }   // a name, or a template with «{i:…}» tokens
/* RUN 7 (C11) — THE CALM FACE'S DRAWN ICONS (the user's design: Moonglass icons, the Hush emblem; our own work, no icon library — rule
   #32, BACKLOG §7.19), by meaning, on a 24 grid. A shape = [kind, tag, attrs]: kind 'tint' = a soft fill of the current colour (its
   opacity in attrs.o), 'line' = a 1.6 round stroke of the current colour, 'acc' / 'acc-line' = the same in the Calm accent (firefly lime),
   'dot' = a solid fill of the current colour. Rendered by svgIcon(doc, name) into an <svg> with DOM calls (no innerHTML); the markup asks
   for one with data-svg="name" (applyIcons fills it). Pure data here — the module still touches no DOM at import. */
const SVG_ICONS={
  sound:[['tint','path',{ d:'M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0v6H3z', o:.18 }], ['line','path',{ d:'M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0' }]],
  mood:[['tint','path',{ d:'M15.5 3.5a8.5 8.5 0 1 0 5 14.5 7 7 0 0 1-5-14.5z', o:.28 }], ['line','path',{ d:'M15.5 3.5a8.5 8.5 0 1 0 5 14.5 7 7 0 0 1-5-14.5z' }]],
  hand:[['tint','path',{ d:'M8 21c-2.2-1.3-3.6-3.6-3.6-6.4V11.5a1.3 1.3 0 0 1 2.6 0V13M7 13V6.3a1.3 1.3 0 0 1 2.6 0V12M9.6 12V4.8a1.3 1.3 0 0 1 2.6 0V12M12.2 12V5.8a1.3 1.3 0 0 1 2.6 0V13M14.8 13V8.6a1.3 1.3 0 0 1 2.6 0v5.6c0 3.8-2.6 6.8-6.2 6.8H8z', o:.18 }],
        ['line','path',{ d:'M8 21c-2.2-1.3-3.6-3.6-3.6-6.4V11.5a1.3 1.3 0 0 1 2.6 0V13M7 13V6.3a1.3 1.3 0 0 1 2.6 0V12M9.6 12V4.8a1.3 1.3 0 0 1 2.6 0V12M12.2 12V5.8a1.3 1.3 0 0 1 2.6 0V13M14.8 13V8.6a1.3 1.3 0 0 1 2.6 0v5.6c0 3.8-2.6 6.8-6.2 6.8H8' }]],
  'note-follow':[['acc','path',{ d:'M7 10h10v4H7z', o:.25 }], ['line','path',{ d:'M12 2.5v5M9.5 5L12 2.5 14.5 5M12 21.5v-5M9.5 19l2.5 2.5 2.5-2.5' }], ['acc-line','rect',{ x:7, y:10, width:10, height:4, rx:2 }]],
  'note-stay':[['acc','path',{ d:'M7 8h10v4H7z', o:.25 }], ['acc-line','rect',{ x:7, y:8, width:10, height:4, rx:2 }], ['line','path',{ d:'M12 12v5M8 19.5h8' }]],
  background:[['tint','path',{ d:'M3.5 5.5h17v13h-17z', o:.15 }], ['line','rect',{ x:3.5, y:5.5, width:17, height:13, rx:3 }], ['line','path',{ d:'M6 16l3.5-5 2.5 3.5 2-2.5 4 4' }], ['acc','circle',{ cx:16.5, cy:9, r:1.2 }]],
  forest:[['tint','path',{ d:'M12 3c4 3 6 7 6 10a6 6 0 0 1-12 0c0-3 2-7 6-10z', o:.2 }], ['line','path',{ d:'M12 3c4 3 6 7 6 10a6 6 0 0 1-12 0c0-3 2-7 6-10zM12 21V9M12 15l3-2.5M12 12.5L9.5 10.5' }]],
  lantern:[['acc','path',{ d:'M8 9h8v8H8z', o:.25 }], ['line','path',{ d:'M10 4h4M12 4v2.5M8 9.5c0-1.7 1.8-3 4-3s4 1.3 4 3V16c0 1.7-1.8 3-4 3s-4-1.3-4-3z' }], ['acc','circle',{ cx:12, cy:13, r:1.6 }]],
  info:[['tint','circle',{ cx:12, cy:12, r:9, o:.14 }], ['line','circle',{ cx:12, cy:12, r:9 }], ['dot','circle',{ cx:12, cy:7.8, r:1.1 }], ['line','path',{ d:'M12 11v6' }]],
  close:[['line','path',{ d:'M6.5 6.5l11 11M17.5 6.5l-11 11' }]],
  /* the sleep timer (quality bar point 9): a crescent and a small «z» — the moon of «Mood» made sleepy */
  sleep:[['tint','path',{ d:'M13 4.5a7.5 7.5 0 1 0 6.5 11 6.2 6.2 0 0 1-6.5-11z', o:.22 }], ['line','path',{ d:'M13 4.5a7.5 7.5 0 1 0 6.5 11 6.2 6.2 0 0 1-6.5-11z' }],
         ['acc-line','path',{ d:'M16 3.5h4l-4 4.5h4' }]],
  /* the effects hand (C5): three short waves rising — «the other hand shapes the sound» */
  effects:[['line','path',{ d:'M4 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0M4 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0' }], ['acc','circle',{ cx:19.5, cy:6.5, r:1.6 }]],
};
/* THE EMBLEM (the Hush app icon, the brand mark above the wordmark): five notes in an arc, the centre one glowing in the firefly lime */
const EMBLEM_DOTS=[[15,24,3],[45,12,3],[105,12,3],[135,24,3]], EMBLEM_GLOW=[75,6,4.2];
const SVGNS='http://www.w3.org/2000/svg';
function svgIcon(doc, name){
  const sh=SVG_ICONS[name]; if(!sh) return null;
  const svg=doc.createElementNS(SVGNS,'svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('class','svgi');
  for(const [kind,tag,a] of sh){ const el=doc.createElementNS(SVGNS,tag), acc=kind==='acc'||kind==='acc-line';
    for(const [k,v] of Object.entries(a)) if(k!=='o') el.setAttribute(k,String(v));
    if(kind==='line'||kind==='acc-line'){ el.setAttribute('fill','none'); el.setAttribute('stroke', acc ? 'var(--calm-accent)' : 'currentColor'); el.setAttribute('stroke-width','1.6'); el.setAttribute('stroke-linecap','round'); el.setAttribute('stroke-linejoin','round'); }
    else { el.setAttribute('fill', acc ? 'var(--calm-accent)' : 'currentColor'); if(a.o!=null) el.setAttribute('fill-opacity',String(a.o)); el.setAttribute('stroke','none'); }
    svg.appendChild(el); }
  return svg;
}
/* the emblem as an <svg> (viewBox 150 × 30) — the four quiet dots in the emblem colour, the centre one lime with a soft glow (CSS .emblem) */
function svgEmblem(doc){
  const svg=doc.createElementNS(SVGNS,'svg'); svg.setAttribute('viewBox','0 0 150 30'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('class','emblem');
  for(const [cx,cy,r] of EMBLEM_DOTS){ const c=doc.createElementNS(SVGNS,'circle'); c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',r); c.setAttribute('class','emblem-dot'); svg.appendChild(c); }
  const g=doc.createElementNS(SVGNS,'circle'); g.setAttribute('cx',EMBLEM_GLOW[0]); g.setAttribute('cy',EMBLEM_GLOW[1]); g.setAttribute('r',EMBLEM_GLOW[2]); g.setAttribute('class','emblem-glow'); svg.appendChild(g);
  return svg;
}
export { ICONS, icon, iconText, applyIcons, SVG_ICONS, svgIcon, svgEmblem };
