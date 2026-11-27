/* LIGHT-5b row «LIGHT cards, flare, bars in the clip»: (1) the five teaching cards each have a title, a text and a drawn picture, the step reads
   «n of 5», the privacy line shows on the last card only; (2) the emblem's dot flares on Play (the class and its animation; it settles back by
   itself); (3) the bars are painted into a clip frame as the page shows them — a shown set leaves pixels inside its own box, a hidden set none
   (CONTROL: the same paint with the set hidden must leave nothing). */
import { CARDS, lightCardsShow, lightCardsDbg, lightCardsStepDbg, lightCardsCloseDbg, lightCardsHomeDbg } from '../../../apps/light/cards.js';
import { flare } from '../../../apps/light/boot.js';
import { paintBars, paintMark } from '../../../apps/light/clip.js';
import { lightShellPokeDbg, BAR_FX_MS } from '../../../apps/light/shell.js';

const wait=ms=>new Promise(r=>setTimeout(r, ms));
export async function checkLightCards(){
  const diffs=[], miss=s=>diffs.push(s), notes=[];
  try{ for(const home of [false, true]){   // LIGHT-9: without and with the iPhone home-screen card
    lightCardsHomeDbg(home); lightCardsShow();
    if(CARDS.length!==(home ? 6 : 5) || (home && CARDS[5]!=='home')) miss(`${home ? 'with' : 'without'} the iPhone card: ${CARDS.join(', ')}`);
    if(document.getElementById('lightCardDots').children.length!==CARDS.length) miss('the dots do not follow the cards');
    for(let k=0;k<CARDS.length;k++){ const D=lightCardsStepDbg(k);
      if(!D.title || !D.text || !D.pic) miss(`card ${k+1} (${CARDS[k]}): title «${D.title}», text ${D.text.length} chars, picture ${D.pic}`);
      const step=document.getElementById('lightCardStep').textContent; if(!step.includes(String(k+1)) || !step.includes(String(CARDS.length))) miss(`card ${k+1}: the step reads «${step}»`);
      const priv=!document.getElementById('lightCardPriv').hidden; if(priv!==(CARDS[k]==='clip')) miss(`card ${k+1}: the privacy line ${priv ? 'shows' : 'is hidden'}`); }
    lightCardsCloseDbg(); }
  } finally { lightCardsCloseDbg(); lightCardsHomeDbg(null); }
  if(lightCardsDbg().open) miss('the cards did not close');
  /* the flare: on the start card (hidden after start, but the element and its animation are there) */
  { const e=document.querySelector('#start .light-emblem'); flare();
    if(!e || !e.classList.contains('flare')) miss('the emblem did not get its flare'); else { const g=e.querySelector('.emblem-glow'); const an=g ? getComputedStyle(g).animationName : ''; if(!/lightFlare/.test(an)) miss('the flare has no animation ('+an+')'); } }
  /* the bars in a clip frame */
  { const F=document.getElementById('lightFxBars'), W=innerWidth, H=innerHeight, c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
    const inBox=()=>{ const B=F.getBoundingClientRect(), d=g.getImageData(Math.max(0,B.left|0), Math.max(0,B.top|0), Math.max(1,B.width|0), Math.max(1,B.height|0)).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n; };
    lightShellPokeDbg(); await wait(600); g.clearRect(0,0,W,H); paintBars(g, 1, 1); const on=inBox();   // the set shows for its hold after a use
    await wait(BAR_FX_MS+600); g.clearRect(0,0,W,H); paintBars(g, 1, 1); const off=inBox();
    notes.push(`bars painted: ${on} px shown, ${off} px hidden`);
    if(!(on>200)) miss('a shown bar set left only '+on+' px in its box'); if(off!==0) miss('CONTROL: a hidden set left '+off+' px');
    /* LIGHT-9: the clip's mark «handsong.app» in the bottom right corner (and nothing of it at the left half) */
    g.clearRect(0,0,W,H); paintMark(g, W, H); const cnt=(x,y,w,h)=>{ const d=g.getImageData(x,y,w,h).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n; };
    const br=cnt(W/2|0, H*3/4|0, W/2|0, H/4|0), rest=cnt(0, 0, W/2|0, H|0); notes.push(`the mark: ${br} px bottom right`);
    if(!(br>100) || rest!==0) miss(`the clip's mark: ${br} px bottom right, ${rest} px elsewhere`); }
  return { pass:!diffs.length, diffs, note:notes.join(' · ') };
}
