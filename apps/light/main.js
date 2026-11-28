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
import { lightCalWire, lightCalOfferTick } from './calib.js';   // LIGHT-4: the hand setup
import { lightClipWire, clipBusy } from './clip.js';   // LIGHT-5: the clip
import { lightLangWire } from './lang.js';   // LIGHT-9: the language by hand
import { lightUpdateWire } from './update.js';   // LIGHT-10: offline and «a new version is ready»
import { onLightFrame } from './boot.js';
import { lightSheetOpen } from './controls.js';
import { lightCardsWire, lightCardsShow, lightCardsDue, lightCardsOpen } from './cards.js';   // LIGHT-5b: the teaching cards
import { nsKey } from '../../core/storens.js';

applyI18n();   // the page's [data-i18n] texts and drawn icons (the emblem, the buttons) in the chosen language
lightLangWire();   // LIGHT-9
lightShellWire();   // the bars, once per screen frame
lightControlsWire(root=>applyI18n(root));   // LIGHT-3b: the controls when the hands leave and their sheets (the sheets' icons filled the same way)
lightCalWire(()=>{});   // LIGHT-4: the kept setup applied (per camera); its screens' buttons
lightCardsWire(nsKey);   // LIGHT-5b
onLightStart(()=>{ if(lightCardsDue()) lightCardsShow(); });   // the first start: the cards (once; «Skip» on each)
/* LIGHT-9: the hand-setup offer after about a minute of playing, when the hands leave and nothing else is open (once) */
onLightFrame((now, hands)=>{ lightCalOfferTick(now, hands, lightCardsOpen() || lightSheetOpen() || clipBusy()); });
lightClipWire(root=>applyI18n(root));   // LIGHT-5: the clip button, its countdown and card
lightBoot();
lightUpdateWire();   // LIGHT-10: the worker after the start (at once when already installed)
/* LIGHT-5b: «How to play» opens the teaching cards */
document.getElementById('lightHowBtn').onclick=()=>lightCardsShow();
