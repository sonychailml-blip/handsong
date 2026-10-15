/* LAT2a — the SEARCH SCHEDULE for hand detection. CORE: pure JavaScript (no DOM, camera, model); runs unchanged in node (the data
   runner's row «LAT2 search schedule (core)»). The detector (src/handdet.js) owns two hand models: L1 tracks ONE hand, L2 tracks two
   and — whenever it tracks fewer than two — runs MediaPipe's expensive palm search over the whole frame. This schedule picks, for every
   new camera frame, what runs on it:
     both hands in view  → 'track2' every frame (L2; no palm search while it tracks two);
     one hand in view    → 'track1' every frame (L1), 'search' (L2) on every HAND_SEARCH_EVERY-th processed frame;
     no hand in view     → 'search' on every HAND_SEARCH_EVERY-th processed frame, 'skip' (nothing runs) in between;
     a second hand found → 'track2' from the next frame.
   A tracking action that comes back with NO hand retries a 'search' on the same frame (schedRetry): a hand lost by tracking during a
   fast move is looked for at once, not three frames later.
   Policies (the «Hands tracked» test switch): '2s' = this schedule (default), '2' = L2 on every frame (the app before LAT2), '1' = L1
   on every frame (one hand; L1 searches by itself whenever it tracks none). */

export const HAND_SEARCH_EVERY=3;            // the full-frame search runs on every 3rd processed frame while fewer than 2 hands are tracked
export const HAND_POLICIES=['2s','2','1'];

/* state: mode = hands tracked after the last frame ('none' | 'one' | 'two'); since = processed frames since the last search.
   A fresh schedule searches on its first frame. */
export const schedNew=()=>({ mode:'none', since:HAND_SEARCH_EVERY-1 });

/* what runs on the next frame */
export function schedPlan(s, policy='2s'){
  if(policy==='1') return 'track1';
  if(policy==='2') return s.mode==='two' ? 'track2' : 'search';
  if(s.mode==='two') return 'track2';
  if(s.since+1>=HAND_SEARCH_EVERY) return 'search';
  return s.mode==='one' ? 'track1' : 'skip';
}

/* a tracking action that found nothing is retried as a search on the same frame (null = no retry) */
export const schedRetry=(action, n, policy='2s')=> policy==='2s' && (action==='track1'||action==='track2') && n===0 ? 'search' : null;

/* the state after a frame: `action` = what finally ran on it (the retry, when there was one), n = hands it returned */
export function schedAfter(s, action, n){
  const mode= n>=2 ? 'two' : n===1 ? 'one' : 'none';
  return { mode, since: action==='search' ? 0 : s.since+1 };
}

/* a whole run for tests and the probe: counts[i] = hands IN VIEW on frame i; `found(action, inView)` = what the action returns (default:
   a search or two-hand tracking sees every hand in view up to 2; one-hand tracking sees at most 1 — and nothing when `lost` names the
   frame). Returns the actions in order ('track1>search' = a retry). */
export function schedRun(counts, { policy='2s', lost=[] }={}){
  let s=schedNew(); const out=[];
  counts.forEach((v,i)=>{
    const see=a=> a==='skip' ? 0 : lost.includes(i)&&a!=='search' ? 0 : a==='track1' ? Math.min(v,1) : Math.min(v,2);
    let a=schedPlan(s, policy), n=see(a); const r=schedRetry(a, n, policy);
    if(r){ out.push(a+'>'+r); a=r; n=see(a); } else out.push(a);
    s=schedAfter(s, a, n);
  });
  return out;
}
