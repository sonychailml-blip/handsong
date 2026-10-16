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
function applyIcons(root){ if(!root||!root.querySelectorAll) return; root.querySelectorAll('[data-icon]').forEach(el=>{ const v=el.getAttribute('data-icon'); el.textContent= v.includes('{i:') ? iconText(v) : icon(v); }); }   // a name, or a template with «{i:…}» tokens
export { ICONS, icon, iconText, applyIcons };
