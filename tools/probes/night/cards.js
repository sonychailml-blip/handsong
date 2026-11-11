/* NIGHT-7: row «NIGHT first cards» — the four first cards: they open, each has its title, text and drawn picture in both languages (no left-over
   {name}); Next walks them and the last closes them, calling back ONCE (CONTROL: a second close calls nothing); Skip closes at any card; Settings →
   «How to play» opens them; while they show, the shell's controls stay hidden; the start screen's privacy line has its words in both languages;
   the players' picture choice switches the scene level both ways (put back after).
   NIGHT-7b: «shown» and «closed» are judged by what is on SCREEN (computed display), not by the attribute — the attribute said «closed» while a
   class kept the cards on screen (CONTROL: a style that overrides the attribute is caught). Closed cards are labelled too (filled at load).
   Whether they are due reads their own key only: an old «seen» flag, an unknown value or nothing → due; after they close → not (CONTROL: the
   NIGHT-7 reading, the «seen» flag, would skip them). The start screen holds the two setup tips, Begin, then the privacy line; Settings has no
   «first steps again» (the ghost is gone). */
import { row } from '../core/rows.js';
import { withLang, t } from '../../../core/i18n.js';
import { cardsShow, cardsOpen, cardsDbg, cardsDue, cardsDone, CARDS_KEY } from '../../../apps/night/cards.js';
import { sceneLevel, setSceneLevel } from '../../../apps/night/scene/host.js';

const CYR=/[а-яё]/i;
const onScreen=el=>!!el && getComputedStyle(el).display!=='none' && el.getBoundingClientRect().height>0;
const memStore=o=>{ const m=new Map(Object.entries(o||{})); return { getItem:k=>m.has(k) ? m.get(k) : null, setItem:(k,v)=>m.set(k,v) }; };
export async function checkNightCards(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); }, $=id=>document.getElementById(id);
  const keepLevel=sceneLevel();
  try{
    /* closed: off the screen, yet labelled */
    ok('closed cards are on screen', !cardsOpen() && !onScreen($('nightCards')));
    ok('closed cards hold blank buttons', $('nightCardSkip').textContent.trim().length>0 && $('nightCardNext').textContent.trim().length>0 && $('nightCardTitle').textContent.trim().length>0);
    { const st=document.createElement('style'); st.textContent='#nightShell #nightCards[hidden]{ display:block !important; }'; document.head.appendChild(st);
      ok('CONTROL: a style that overrides the attribute is not caught', onScreen($('nightCards'))); st.remove(); }
    /* due: their own key only */
    ok('due with nothing stored', cardsDue(memStore()));
    ok('an old «seen» flag stops the cards', cardsDue(memStore({ 'handsong.nightSeen':'1', ['handsong.ca'+'lmSeen']:'1' })));
    ok('an unknown stored value stops the cards', cardsDue(memStore({ [CARDS_KEY]:'old' })));
    { const m=memStore({ 'handsong.nightSeen':'1' }); cardsDone(m); ok('still due after they closed', !cardsDue(m)); }
    { const old=st=>st.getItem('handsong.nightSeen')!=='1', stale=memStore({ 'handsong.nightSeen':'1' });   // NIGHT-7's rule
      ok('CONTROL: the NIGHT-7 reading gives the same answer for an old «seen» flag', old(stale)!==cardsDue(stale)); }
    ok('a blocked store does not make them due', cardsDue({ getItem:()=>{ throw new Error('blocked'); } }));
    /* the start screen and settings */
    { const tips=[...document.querySelectorAll('#nightFirstSteps [data-i18n]')].map(e=>e.dataset.i18n), B=$('nightBegin'), L=$('nightPrivacyLine');
      ok('the start tips are '+tips.join(', '), tips.join()==='night.stepLight,night.stepStand');
      ok('the privacy line is not after Begin', !!(B && L && (B.compareDocumentPosition(L) & 4)));
      ok('Settings still has «first steps again»', !$('nightFirstRun')); }
    let calls=0; cardsShow(()=>calls++); ok('the cards did not open', cardsOpen() && onScreen($('nightCards')));
    const seen=[];
    for(let i=0;i<cardsDbg().n;i++){ const pic=$('nightCardPic').querySelector('svg'), parts=pic ? pic.querySelectorAll('*').length : 0, txt=$('nightCardText').textContent;
      seen.push(cardsDbg().title); ok(`card ${i+1}: its picture has ${parts} parts`, parts>=6); ok(`card ${i+1}: a left-over name in its text`, !/\{\w+\}/.test(txt) && txt.length>40);
      if(i===3) ok('the Music card has no music icon', !!$('nightCardPic').querySelector('.np-ico svg, .np-ico path, .np-ico *'));
      if(i<cardsDbg().n-1) $('nightCardNext').click(); }
    ok('four different titles', new Set(seen).size===4);
    ok('the last button is not «'+t('night.card.go')+'»', $('nightCardNext').textContent===t('night.card.go'));
    $('nightCardNext').click(); ok('the last card did not take them off the screen', !cardsOpen() && !onScreen($('nightCards'))); ok('closing called back '+calls+' times', calls===1);
    $('nightCardSkip').click(); ok('CONTROL: a second close called back again', calls===1);
    let skipped=0; cardsShow(()=>skipped++); $('nightCardNext').click(); $('nightCardSkip').click(); ok('Skip did not close them at the second card', !cardsOpen() && !onScreen($('nightCards')) && skipped===1);
    $('nightInfoBtn').click(); $('nightHowTo').click(); ok('«How to play» did not open them from Settings', cardsOpen() && $('nightInfo').hidden);
    ok('the controls show over the cards', !$('nightShell').classList.contains('show')); $('nightCardSkip').click();
    for(const L of ['en','ru']) withLang(L, ()=>{ const keys=['play','depth','fx','music'].flatMap(k=>[`night.card.${k}.t`, `night.card.${k}.b`]).concat(['night.card.skip','night.card.next','night.card.go','night.privacyLine','night.howTo','night.q.standard','night.q.detailed']);
      const miss=keys.filter(k=>t(k)===k), wrong=keys.filter(k=>L==='ru' ? !CYR.test(t(k)) : CYR.test(t(k))); ok(`${L}: ${miss.length} texts missing (${miss.join(', ')})`, !miss.length); ok(`${L}: ${wrong.length} texts in the other language`, !wrong.length); });
    ok('the privacy line is not on the start screen', !!$('nightPrivacyLine') && $('nightPrivacyLine').textContent.length>20);
    const Q=[...$('nightQualSeg').children], hi=Q.find(b=>b.dataset.q==='full'), lo=Q.find(b=>b.dataset.q==='reduced');
    hi.click(); await new Promise(r=>setTimeout(r, 60)); ok('Detailed did not set the high level: '+sceneLevel(), sceneLevel()==='full'); lo.click(); await new Promise(r=>setTimeout(r, 60)); ok('Standard did not set medium: '+sceneLevel(), sceneLevel()==='reduced');
    notes.push(`four cards: ${seen.join(' · ')}; Skip, the last Next and «How to play» work and leave the screen (computed style); due by their own key; both languages complete`);
  } catch(e){ d.push('error: '+(e&&e.stack||e)); }
  finally{ if(cardsOpen()) $('nightCardSkip').click(); if(!$('nightInfo').hidden) $('nightInfoClose').click(); try{ await setSceneLevel(keepLevel); }catch(e){} }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.972, night:true, name:'NIGHT first cards', run:()=>checkNightCards(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
