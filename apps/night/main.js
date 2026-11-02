/* SPLIT-2: the Night app's entry: its shell, its ghost light, its forest, its profile. */
import './migrate.js';   // first: the shell reads its settings while it loads
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd } from '../../core/legacy-ui/views/scene/host.js';
import { handFn } from '../../core/state.js';
import { nightShellWire, nightShellFace } from './shell.js';
import { ghostFrame } from './ghost.js';
import { buildForest } from './scene/forest.js';

sceneRoomAdd('forest', { build:buildForest, three:()=>import('./vendor/three-r128/three.min.js') });
nightShellWire(shellDoors()); setFaceHook(nightShellFace);
boot({ profile:'profile.night', frameFilter:(res, t)=>ghostFrame(res, t, handFn.ld.R==='fx' ? 'Left' : 'Right') });
