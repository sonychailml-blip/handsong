/* NIGHT-7: row «NIGHT first cards» — the four first cards: they open, each has its title, text and drawn picture in both languages (no left-over
   {name}); Next walks them and the last closes them, calling back ONCE (CONTROL: a second close calls nothing); Skip closes at any card; Settings →
   «How to play» opens them; while they show, the shell's controls stay hidden; the start screen's privacy line has its words in both languages;
   the players' picture choice switches the scene level both ways (put back after). */
import { row } from '../core/rows.js';
import { withLang, t } from '../../../core/i18n.js';
import { cardsShow, cardsOpen, cardsDbg } from '../../../apps/night/cards.js';
import { sceneLevel, setSceneLevel } from '../../../apps/night/scene/host.js';

const CYR=/[а-яё]/i;
export async function checkNightCards(){
  const d=[], notes=[]; let n=0; const ok=(what, c)=>{ n++; if(!c) d.push(what); }, $=id=>document.getElementById(id);
  const keepLevel=sceneLevel();
  try{
    let calls=0; cardsShow(()=>calls++); ok('the cards did not open', cardsOpen() && !$('nightCards').hidden);
    const seen=[];
    for(let i=0;i<cardsDbg().n;i++){ const pic=$('nightCardPic').querySelector('svg'), parts=pic ? pic.querySelectorAll('*').length : 0, txt=$('nightCardText').textContent;
      seen.push(cardsDbg().title); ok(`card ${i+1}: its picture has ${parts} parts`, parts>=6); ok(`card ${i+1}: a left-over name in its text`, !/\{\w+\}/.test(txt) && txt.length>40);
      if(i===3) ok('the Music card has no music icon', !!$('nightCardPic').querySelector('.np-ico svg, .np-ico path, .np-ico *'));
      if(i<cardsDbg().n-1) $('nightCardNext').click(); }
    ok('four different titles', new Set(seen).size===4);
    $('nightCardNext').click(); ok('the last card did not close them', !cardsOpen() && $('nightCards').hidden); ok('closing called back '+calls+' times', calls===1);
    $('nightCardSkip').click(); ok('CONTROL: a second close called back again', calls===1);
    let skipped=0; cardsShow(()=>skipped++); $('nightCardNext').click(); $('nightCardSkip').click(); ok('Skip did not close them at the second card', !cardsOpen() && skipped===1);
    $('nightInfoBtn').click(); $('nightHowTo').click(); ok('«How to play» did not open them from Settings', cardsOpen() && $('nightInfo').hidden);
    ok('the controls show over the cards', !$('nightShell').classList.contains('show')); $('nightCardSkip').click();
    for(const L of ['en','ru']) withLang(L, ()=>{ const keys=['play','depth','fx','music'].flatMap(k=>[`night.card.${k}.t`, `night.card.${k}.b`]).concat(['night.card.skip','night.card.next','night.card.go','night.privacyLine','night.howTo','night.q.standard','night.q.detailed']);
      const miss=keys.filter(k=>t(k)===k), wrong=keys.filter(k=>L==='ru' ? !CYR.test(t(k)) : CYR.test(t(k))); ok(`${L}: ${miss.length} texts missing (${miss.join(', ')})`, !miss.length); ok(`${L}: ${wrong.length} texts in the other language`, !wrong.length); });
    ok('the privacy line is not on the start screen', !!$('nightPrivacyLine') && $('nightPrivacyLine').textContent.length>20);
    const Q=[...$('nightQualSeg').children], hi=Q.find(b=>b.dataset.q==='full'), lo=Q.find(b=>b.dataset.q==='reduced');
    hi.click(); await new Promise(r=>setTimeout(r, 60)); ok('Detailed did not set the high level: '+sceneLevel(), sceneLevel()==='full'); lo.click(); await new Promise(r=>setTimeout(r, 60)); ok('Standard did not set medium: '+sceneLevel(), sceneLevel()==='reduced');
    notes.push(`four cards: ${seen.join(' · ')}; Skip, the last Next and «How to play» work; both languages complete`);
  } catch(e){ d.push('error: '+(e&&e.stack||e)); }
  finally{ if(cardsOpen()) $('nightCardSkip').click(); if(!$('nightInfo').hidden) $('nightInfoClose').click(); try{ await setSceneLevel(keepLevel); }catch(e){} }
  return { cases:n, total:d.length, differences:d, notes };
}
row({ at:1009.972, night:true, name:'NIGHT first cards', run:()=>checkNightCards(), read:r=>({ cases:r.cases, diff:r.total, list:r.differences, notes:r.notes }) });
