/* NIGHT-7b — NIGHT'S EDITION: the build's (core/edition.js: 'release' in a players' build) or, on any page, «?release» in the address — so the
   players' settings can be checked on Live Server without publishing. The release edition hides every development item (shell.js, calib.js). */
import { EDITION } from '../../core/edition.js';

const asked=(()=>{ try{ return new URLSearchParams(location.search).has('release'); }catch(e){ return false; } })();
export const NIGHT_EDITION= EDITION==='release' || asked ? 'release' : 'dev';
export const devItems=()=>NIGHT_EDITION==='dev';
