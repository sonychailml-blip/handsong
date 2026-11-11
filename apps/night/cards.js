/* NIGHT-7 — THE FIRST CARDS: after the calibration offer on a first start (and from Settings → «How to play»), four short cards with simple
   drawn pictures, written from the real gestures (core/gestures/hands.js; the profile apps/night/data/night.json):
   1. Play — the playing hand's thumb touches a fingertip: a note (each finger its own; the hand's height picks the notes); holding the touch
      keeps it sounding (Notes: follow / stay put is in the controls);
   2. Near and far — the hand's size in the picture is its depth: farther, the forest's echo deeper and the light deeper among the trees;
   3. Your other hand — touch a finger to the thumb and move it up or down: index Echo, middle Warm or Bright, ring Wave; it stays;
   4. Music — the Music button: a quiet accompaniment (Still, Drift, Glimmer), off again on a further tap.
   Skippable at every card; the ghost hint plays after them on a first start (shell.js). The pictures are our own line drawings (inline SVG,
   currentColor and the accent token); no image files. */
import { t, onLangChange } from '../../core/i18n.js';
import { svgIcon } from '../../core/icons.js';

const $=id=>document.getElementById(id);
/* a hand seen from the palm, its wrist at (x, y), scale s, mirrored for the left one; pinch: which finger (0 index … 3 little) touches the thumb */
function handSvg(x, y, s, o={}){ const m=o.left ? -1 : 1, P=(dx,dy)=>`${(x+dx*s*m).toFixed(1)},${(y+dy*s).toFixed(1)}`;
  const palm=`M${P(-16,0)} Q${P(-21,-22)} ${P(-15,-34)} L${P(15,-34)} Q${P(21,-22)} ${P(16,0)} Z`;
  const fx=[-12,-4,4,12], fl=[30,33,30,23], fin=fx.map((f,i)=>{ if(o.pinch===i){ return `<path d="M${P(f,-32)} Q${P(f-6,-48)} ${P(-17,-44)}" class="np-limb" stroke-width="${(7*s).toFixed(1)}"/>`; }
    return `<line x1="${P(f,-32).split(',')[0]}" y1="${P(f,-32).split(',')[1]}" x2="${P(f+(i-1.5)*1.6,-32-fl[i]).split(',')[0]}" y2="${P(f+(i-1.5)*1.6,-32-fl[i]).split(',')[1]}" class="np-limb" stroke-width="${(7*s).toFixed(1)}"/>`; }).join('');
  const thumbTip= o.pinch!=null ? P(-19,-42) : P(-36,-30), thumb=`<path d="M${P(-15,-6)} Q${P(-30,-12)} ${thumbTip}" class="np-limb" stroke-width="${(8*s).toFixed(1)}"/>`;
  const touch= o.pinch!=null ? `<circle cx="${P(-18,-43).split(',')[0]}" cy="${P(-18,-43).split(',')[1]}" r="${(5*s).toFixed(1)}" class="np-glow"/>` : '';
  const tips=(o.tips||[]).map(([i,cls])=>{ const q=P(fx[i]+(i-1.5)*1.6, -32-fl[i]).split(','); return `<circle cx="${q[0]}" cy="${q[1]}" r="${(4.5*s).toFixed(1)}" class="${cls}"/>`; }).join('');
  return `<g class="np-hand"><path d="${palm}" class="np-palm"/>${fin}${thumb}</g>${touch}${tips}`; }
const tree=(x, y, h)=>`<path d="M${x},${y} l${-h*0.28},0 l${h*0.28},${-h} l${h*0.28},${h} Z" class="np-tree"/>`;
const arrowV=(x, y0, y1)=>`<path d="M${x},${y0} L${x},${y1} M${x-5},${y0+6} L${x},${y0} L${x+5},${y0+6} M${x-5},${y1-6} L${x},${y1} L${x+5},${y1-6}" class="np-line"/>`;
const PICS=[
  /* play: the touch makes a note; holding it, a long one; higher hand, higher notes */
  ()=>`${arrowV(20, 18, 102)}<circle cx="34" cy="26" r="3" class="np-dot"/><circle cx="34" cy="60" r="3" class="np-dot"/><circle cx="34" cy="94" r="3" class="np-dot"/>
    ${handSvg(92, 112, 1.25, { pinch:0 })}
    <circle cx="150" cy="40" r="5" class="np-glow"/><path d="M150,58 L192,58" class="np-hold"/><circle cx="150" cy="58" r="5" class="np-glow"/>`,
  /* near and far: a big hand near the camera, a small one farther; the light deeper among the trees */
  ()=>`<rect x="6" y="48" width="20" height="14" rx="3" class="np-line"/><circle cx="16" cy="55" r="4" class="np-line"/>
    ${handSvg(58, 108, 1.15)}${handSvg(118, 92, 0.6)}<path d="M80,54 L104,54" class="np-dash"/><path d="M98,49 L104,54 L98,59" class="np-line"/>
    ${tree(150, 104, 40)}${tree(172, 104, 54)}${tree(192, 104, 34)}<circle cx="168" cy="72" r="5" class="np-glow"/>`,
  /* the other hand: three fingertips, three effects, up and down */
  ()=>`${handSvg(90, 112, 1.25, { left:true, tips:[[0,'np-t1'],[1,'np-t2'],[2,'np-t3']] })}${arrowV(146, 16, 96)}
    <rect x="164" y="22" width="6" height="70" rx="3" class="np-bar"/><rect x="176" y="22" width="6" height="70" rx="3" class="np-bar"/><rect x="188" y="22" width="6" height="70" rx="3" class="np-bar"/>
    <rect x="164" y="56" width="6" height="36" rx="3" class="np-t1"/><rect x="176" y="40" width="6" height="52" rx="3" class="np-t2"/><rect x="188" y="70" width="6" height="22" rx="3" class="np-t3"/>`,
  /* music: the round button; a soft accompaniment over it */
  ()=>`<circle cx="100" cy="80" r="26" class="np-btn"/><g class="np-ico" transform="translate(86,66)"></g>
    <path d="M40,40 q15,-12 30,0 t30,0 t30,0 t30,0" class="np-wave"/><path d="M52,24 q12,-9 24,0 t24,0 t24,0 t24,0" class="np-wave np-faint"/>`,
];
const CARDS=['play','depth','fx','music'];
let open=false, i=0, done=null;
function render(){ if(!open) return; const k=CARDS[i];
  $('nightCardTitle').textContent=t(`night.card.${k}.t`);
  $('nightCardText').textContent=t(`night.card.${k}.b`, { still:t('night.music.still'), drift:t('night.music.drift'), glimmer:t('night.music.glimmer') });
  $('nightCardStep').textContent=t('night.card.of', { n:i+1, m:CARDS.length });
  $('nightCardSkip').textContent=t('night.card.skip'); $('nightCardNext').textContent=t(i===CARDS.length-1 ? 'night.card.go' : 'night.card.next');
  const pic=$('nightCardPic'); pic.innerHTML=`<svg viewBox="0 0 200 120" class="night-pic" role="presentation">${PICS[i]()}</svg>`;
  const ico=pic.querySelector('.np-ico'); if(ico){ const g=svgIcon(document, 'music'); if(g){ g.setAttribute('width', '28'); g.setAttribute('height', '28'); ico.appendChild(g); } }   // the icon's own svg, sized inside the picture
  for(const d of $('nightCardDots').children) d.classList.toggle('on', +d.dataset.i===i); }
function close(){ if(!open) return; open=false; $('nightCards').hidden=true; document.body.classList.remove('night-cards-open'); const f=done; done=null; if(f) f(); }
/* show the cards from the first; then(): called once they close (finished or skipped) */
export function cardsShow(then){ open=true; i=0; done=then||null; $('nightCards').hidden=false; document.body.classList.add('night-cards-open'); render(); $('nightCardNext').focus({ preventScroll:true }); }
export const cardsOpen=()=>open;
export function cardsWire(){
  $('nightCardDots').replaceChildren(...CARDS.map((_,k)=>{ const d=document.createElement('span'); d.className='night-cards-dot'; d.dataset.i=String(k); return d; }));
  $('nightCardNext').onclick=()=>{ if(i<CARDS.length-1){ i++; render(); } else close(); };
  $('nightCardSkip').onclick=()=>close();
  document.addEventListener('keydown', e=>{ if(open && e.key==='Escape') close(); });
  onLangChange(render); }
/* probe only: which card, how many */
export const cardsDbg=()=>({ open, i, n:CARDS.length, title:open ? $('nightCardTitle').textContent : '' });
