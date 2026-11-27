/* LIGHT-3 — Handsong's entry (code id light). Option B (the founder, 2026-11-27): Light runs on its own start, frame loop, drawing and hands, and
   imports only the clean parts of core (the sound engine, timbres, effects, scales, the camera and the hand model, state, the pure laws) — none of
   Full's recorder, songs, arrangement or menus. Order: the modes it plays (before core/scales.js loads), its texts, then the page. */
import './scalepick.js';
import './texts.js';
import './icons.js';   // LIGHT-3b: Light's drawn icons join the shared table before the markup is filled
import { applyI18n } from '../../core/i18n.js';
import { lightBoot } from './boot.js';
import { lightShellWire } from './shell.js';
import { lightControlsWire } from './controls.js';
import { onLightStart } from './boot.js';
import { lightCalWire, lightCalOffer } from './calib.js';   // LIGHT-4: the hand setup

applyI18n();   // the page's [data-i18n] texts and drawn icons (the emblem, the buttons) in the chosen language
lightShellWire();   // the bars, once per screen frame
lightControlsWire(root=>applyI18n(root));   // LIGHT-3b: the controls when the hands leave and their sheets (the sheets' icons filled the same way)
lightCalWire(()=>{});   // LIGHT-4: the kept setup applied (per camera); its screens' buttons
onLightStart(()=>{ lightCalOffer(); });   // offered once, after the first start
lightBoot();
/* LIGHT-2b: «How to play» — a short card from the start (the privacy line at its foot) */
{ const card=document.getElementById('lightHow');
  document.getElementById('lightHowBtn').onclick=()=>{ card.hidden=false; document.getElementById('lightHowClose').focus(); };
  document.getElementById('lightHowClose').onclick=()=>{ card.hidden=true; };
  card.addEventListener('click', e=>{ if(e.target===card) card.hidden=true; });
  addEventListener('keydown', e=>{ if(e.key==='Escape' && !card.hidden) card.hidden=true; }); }
