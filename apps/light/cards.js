/* LIGHT-5b — THE TEACHING CARDS (the founder: as in Night): five short cards with simple drawn pictures, written from Light's real gestures
   (apps/light/gestures.js; the profile data/light.json): 1. Play — the right hand's height picks a band of notes, each finger touching the thumb
   plays its own note, several at once; 2. Volume and reverb — left ↔ right is the volume, nearer ↔ farther the reverb; 3. Effects — the left hand's
   four fingers: delay, vibrato, tremolo, brightness, each moved up or down; 4. The buttons — take the hands out of view: the key, the scale, the
   sound, the hands, the camera, the sensitivity; 5. Your clip — the round button top right records up to a minute; the privacy line (rule #33).
   From the start page («How to play») and once after the first start (then the hand-setup offer). Skippable at every card. The pictures are our own
   line drawings (inline SVG, currentColor and Light's accent), the hand drawn as Night's cards draw it. */
import { t, onLangChange } from '../../core/i18n.js';

export const CARDS=Object.freeze(['play','depth','fx','menu','clip']), CARDS_KEY='handsong.lightCards', CARDS_V='1';
const $=id=>document.getElementById(id);
/* a hand seen from the palm, its wrist at (x, y), scale s, mirrored for the left one; pinch: which finger touches the thumb; tips: lit fingertips */
/* LIGHT-6b (the founder: the old hand looked odd) — a clean PICTOGRAM hand seen from the palm: a rounded palm, four rounded fingers of natural
   lengths fanning a little, the thumb from the palm's side; its wrist at (x, y), scale s, mirrored for the left hand. pinch: the fingers that touch
   the thumb (each bends to the thumb's tip, a glow where they meet); tips: [finger, class] lit fingertips. All parts one soft colour (lp-hf). */
function handSvg(x, y, s, o={}){ const m=o.left ? -1 : 1, X=dx=>+(x+dx*s*m).toFixed(1), Y=dy=>+(y+dy*s).toFixed(1), W=w=>+(w*s).toFixed(1);
  const pin=new Set(o.pinch||[]), base=[-12,-4,4,12], len=[26,30,28,21], lean=[-2.5,-0.8,0.8,2.5], thumbTip= pin.size ? [-15,-47] : [-31,-27];
  const tipOf=i=> pin.has(i) ? [thumbTip[0]+1.5+i*1.2, thumbTip[1]-1.5] : [base[i]+lean[i], -33-len[i]];
  const palm=`<rect x="${Math.min(X(-17),X(17))}" y="${Y(-37)}" width="${W(34)}" height="${W(37)}" rx="${W(11)}" class="lp-hf"/>`;
  const fingers=base.map((b,i)=>{ const [tx,ty]=tipOf(i);
    return pin.has(i) ? `<path d="M${X(b)},${Y(-31)} Q${X(b-1)},${Y(-50)} ${X(tx)},${Y(ty)}" class="lp-hs" stroke-width="${W(8)}"/>`
      : `<line x1="${X(b)}" y1="${Y(-31)}" x2="${X(tx)}" y2="${Y(ty)}" class="lp-hs" stroke-width="${W(8)}"/>`; }).join('');
  const thumb=`<path d="M${X(-13)},${Y(-11)} Q${X(-26)},${Y(-16)} ${X(thumbTip[0])},${Y(thumbTip[1])}" class="lp-hs" stroke-width="${W(9)}"/>`;
  const touch= pin.size ? `<circle cx="${X(thumbTip[0]+1)}" cy="${Y(thumbTip[1]-1)}" r="${W(5)}" class="lp-glow"/>` : '';
  const tips=(o.tips||[]).map(([i,cls])=>{ const [tx,ty]=tipOf(i); return `<circle cx="${X(tx)}" cy="${Y(ty)}" r="${W(4.6)}" class="${cls}"/>`; }).join('');
  return `<g class="lp-hand">${palm}${fingers}${thumb}</g>${touch}${tips}`; }
const arcs=(x, y)=>[14, 24, 34].map((r,k)=>`<path d="M${x+r*0.5},${y-r*0.87} A${r},${r} 0 0 1 ${x+r*0.5},${y+r*0.87}" class="lp-wave${k ? ' lp-faint' : ''}"/>`).join('');
const arrowV=(x, y0, y1)=>`<path d="M${x},${y0} L${x},${y1} M${x-5},${y0+6} L${x},${y0} L${x+5},${y0+6} M${x-5},${y1-6} L${x},${y1} L${x+5},${y1-6}" class="lp-line"/>`;
const arrowH=(y, x0, x1)=>`<path d="M${x0},${y} L${x1},${y} M${x0+6},${y-5} L${x0},${y} L${x0+6},${y+5} M${x1-6},${y-5} L${x1},${y} L${x1-6},${y+5}" class="lp-line"/>`;
const PICS={
  /* play: the bands of notes, the hand's height picks one; two fingers touch the thumb — two notes */
  play:()=>`${arrowV(18, 14, 106)}${[22,46,70,94].map(y=>`<rect x="30" y="${y-9}" width="34" height="18" rx="4" class="lp-band${y===46 ? ' lp-on' : ''}"/>`).join('')}
    ${handSvg(118, 112, 1.25, { pinch:[0,1] })}<circle cx="172" cy="36" r="5" class="lp-glow"/><circle cx="188" cy="50" r="5" class="lp-glow"/>`,
  /* volume and reverb: left ↔ right, quieter ↔ louder; near ↔ far, drier ↔ more space */
  depth:()=>`${arrowH(20, 30, 170)}<path d="M36,32 l6,-6 M164,32 l-12,-12" class="lp-line lp-faint"/>
    ${handSvg(52, 112, 1.05)}${handSvg(112, 98, 0.6)}<path d="M76,70 L98,70" class="lp-dash"/><path d="M92,65 L98,70 L92,75" class="lp-line"/>
    <circle cx="156" cy="76" r="5" class="lp-glow"/>${arcs(156, 76)}`,
  /* effects: the left hand's four fingertips, four bars, up and down */
  fx:()=>`${handSvg(78, 112, 1.25, { left:true, tips:[[0,'lp-t1'],[1,'lp-t2'],[2,'lp-t3'],[3,'lp-t4']] })}${arrowV(126, 16, 100)}
    ${[0,1,2,3].map(i=>`<rect x="${144+i*13}" y="22" width="6" height="74" rx="3" class="lp-bar"/>`).join('')}
    <rect x="144" y="56" width="6" height="40" rx="3" class="lp-t1"/><rect x="157" y="40" width="6" height="56" rx="3" class="lp-t2"/><rect x="170" y="74" width="6" height="22" rx="3" class="lp-t3"/><rect x="183" y="62" width="6" height="34" rx="3" class="lp-t4"/>`,
  /* the buttons: no hand in view → the key on top, the scale under it, four round buttons in one frame */
  menu:()=>`<text x="100" y="34" class="lp-key">A</text><rect x="62" y="44" width="76" height="14" rx="7" class="lp-line"/>
    <rect x="34" y="78" width="132" height="34" rx="17" class="lp-line"/>${[56,85,115,144].map(x=>`<circle cx="${x}" cy="95" r="10" class="lp-line"/>`).join('')}`,
  /* your clip: the round button top right, a minute's ring; a clip with its sound */
  clip:()=>`<rect x="20" y="16" width="120" height="88" rx="8" class="lp-line"/><path d="M70,46 L94,60 L70,74 Z" class="lp-line"/>
    <circle cx="168" cy="36" r="18" class="lp-line"/><path d="M168,18 A18,18 0 0 1 186,36" class="lp-hold"/><circle cx="168" cy="36" r="6" class="lp-glow"/>`,
};
let open=false, i=0, done=null;
function render(){ const k=CARDS[i];
  $('lightCardTitle').textContent=t(`light.card.${k}.t`); $('lightCardText').textContent=t(`light.card.${k}.b`);
  $('lightCardPriv').hidden= k!=='clip';
  $('lightCardStep').textContent=t('light.card.of', { n:i+1, m:CARDS.length });
  $('lightCardSkip').textContent=t('light.card.skip'); $('lightCardNext').textContent=t(i===CARDS.length-1 ? 'light.card.go' : 'light.card.next');
  $('lightCardPic').innerHTML=`<svg viewBox="0 0 200 120" class="light-pic" role="presentation">${PICS[k]()}</svg>`;
  for(const d of $('lightCardDots').children) d.classList.toggle('on', +d.dataset.i===i); }
function close(){ if(!open) return; open=false; $('lightCards').hidden=true; try{ localStorage.setItem(KEY(), CARDS_V); }catch(e){} const f=done; done=null; if(f) f(); }
let KEY=()=>CARDS_KEY;
/* show the cards from the first; then(): called once they close (finished or skipped) */
export function lightCardsShow(then){ open=true; i=0; done=then||null; $('lightCards').hidden=false; render(); $('lightCardNext').focus({ preventScroll:true }); }
export const lightCardsOpen=()=>open;
export const lightCardsDue=()=>{ try{ return localStorage.getItem(KEY())!==CARDS_V; }catch(e){ return true; } };
export function lightCardsWire(nsKey){
  KEY=()=>nsKey(CARDS_KEY);
  $('lightCardDots').replaceChildren(...CARDS.map((_,k)=>{ const d=document.createElement('span'); d.className='light-cards-dot'; d.dataset.i=String(k); return d; }));
  $('lightCardNext').onclick=()=>{ if(i<CARDS.length-1){ i++; render(); } else close(); };
  $('lightCardSkip').onclick=()=>close();
  document.addEventListener('keydown', e=>{ if(open && e.key==='Escape') close(); });
  onLangChange(render); render(); }
/* probe only */
export const lightCardsDbg=()=>({ open, i, n:CARDS.length, title:$('lightCardTitle').textContent, text:$('lightCardText').textContent, pic:!!$('lightCardPic').querySelector('svg') });
export const lightCardsStepDbg=n=>{ i=Math.max(0, Math.min(CARDS.length-1, n)); render(); return lightCardsDbg(); };
export const lightCardsCloseDbg=()=>{ const was=done; done=null; close(); done=was; };
