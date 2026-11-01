/* SPLIT-2: the Night app's entry: its shell, its ghost light, its forest, its profile. */
import { boot } from '../../core/legacy-ui/boot.js';
import { shellDoors, setFaceHook } from '../../core/legacy-ui/ui.js';
import { sceneRoomAdd } from '../../core/legacy-ui/views/scene/host.js';
import { handFn } from '../../core/state.js';
import { calmShellWire, calmShellFace } from './shell.js';
import { ghostFrame } from './ghost.js';
import { buildForest } from './scene/forest.js';

sceneRoomAdd('forest', { build:buildForest, three:()=>import('./vendor/three-r128/three.min.js') });
calmShellWire(shellDoors()); setFaceHook(calmShellFace);
boot({ profile:'profile.calm', frameFilter:(res, t)=>ghostFrame(res, t, handFn.ld.R==='fx' ? 'Left' : 'Right') });
