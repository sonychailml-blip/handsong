/* SPLIT-2: the Full app's entry. Everything shared is in core/; the tutorial and the demo are this app's own. */
import { boot } from '../../core/legacy-ui/boot.js';
import './demo.js';   // side effect: the demo «journey through the tunings» (no camera); guarded, it has no start button today
import { openLessons, wireStarter } from './tutor.js';

wireStarter(boot());   // a lesson or «Free play» starts the app with the same start, inside that click (rule #1)
document.getElementById('learnBtn').onclick=()=>{ openLessons(); };
