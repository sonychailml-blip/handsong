/* SPLIT-2 CP F: the docs split, once (plan §8, §2.7). Moves the docs into docs/{core,full,night}, freezes the logs into archive/, cuts BACKLOG.md by section, applies the rename table to what stays live.
     node tools/split-docs.mjs            do it (refuses to run twice)
     node tools/split-docs.mjs --check    prove nothing was lost: every old BACKLOG line, renamed, is in the three new files; the frozen logs are byte-identical to the saved originals
   The originals are saved first to tools/split-baseline/docs-before/ (git-ignored; git holds them too). archive/, tools/prints and vendor are never rewritten. */
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, rmSync, readdirSync, copyFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toNew } from './split-names.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), at=f=>path.join(ROOT,f), SAVE='tools/split-baseline/docs-before';
const read=f=>readFileSync(at(f),'utf8'), write=(f,t)=>{ mkdirSync(path.dirname(at(f)),{ recursive:true }); writeFileSync(at(f),t); };

/* the one note of the plan (§8), word for word */
export const LOG_NOTE='> 2026-11 (SPLIT-2): the product "Calm" was renamed "Handsong Night" (code id `night`). Everything before this line uses the old name; nothing after it does.';

/* where the moved documents are now: applied to every live text, code comments included */
const PATHS=[ [/docs\/(AUD1|CMD1|ENG2|TIM3|VIS1)-design\.md/g,'docs/core/$1-design.md'], [/docs\/(NAME-INDEX|STALE-NAMES)\.md/g,'docs/core/$1.md'], [/docs\/UX-INVENTORY\.md/g,'docs/full/UX-INVENTORY.md'],
  [/docs\/SPLIT-(PLAN|PROGRESS)\.md/g,'archive/SPLIT-$1.md'], [/docs\/prototypes\//g,'docs/night/prototypes/'], [/docs\/design\/calm\/?/g,'docs/night/design/'] ];
const docPaths=s=>{ let t=s; for(const [a,b] of PATHS) t=t.replace(a,b); return t; };
/* the ordinary English word is not the product: it reads «quiet» here, so the guard stays exact. Then the rename table. */
const WORDS=[ [/a calm backing/g,'a quiet backing'], [/rare in calm music/g,'rare in quiet music'], [/made calm/g,'made quiet'], [/five calm controls/g,'five quiet controls'], [/a calm toast/g,'a quiet toast'],
  [/Спокойный/g,'Night'], [/data\/profiles\/calm\.json/g,'apps/night/data/night.json'], [/data\/profiles\/full\.json/g,'apps/full/data/full.json'], [/--edition calm/g,'HANDSONG_EDITION=release'], [/edition calm/g,'edition release'], [/\?calm&probe/g,'apps/night/?probe'], [/\?calm/g,'apps/night/'] ];
export const docText=s=>{ let t=docPaths(s); for(const [a,b] of WORDS) t=t.replace(a,b); return toNew(t); };

const MOVES=[ ...['AUD1-design','CMD1-design','ENG2-design','TIM3-design','VIS1-design'].map(n=>[`docs/${n}.md`,`docs/core/${n}.md`,docText]), ['docs/STALE-NAMES.md','docs/core/STALE-NAMES.md',null],
  ['docs/UX-INVENTORY.md','docs/full/UX-INVENTORY.md',docText], ['UI-MAP.md','docs/full/UI-MAP.md',docText],
  ['docs/STAGE4-CALM-plan.md','docs/night/STAGE4-NIGHT-plan.md',docText], ['docs/CALM-QUALITY.md','docs/night/QUALITY.md',docText],
  ['docs/design/calm/README.md','docs/night/design/README.md',docText], ...['a-lantern','b-moonglass','c-hush'].map(n=>[`docs/design/calm/${n}.html`,`docs/night/design/${n}.html`,docText]),
  ['docs/prototypes/rooms-of-light.html','docs/night/prototypes/rooms-of-light.html',docText] ];

/* §7 by where it applies (plan §8: §7.16, §7.18, §7.19 and Night items → night; the others → where they apply) */
const SEC7={ core:['7.3','7.4','7.8','7.12'], full:['7.1','7.2','7.5','7.6','7.7','7.9','7.10','7.11','7.13','7.14','7.15','7.20'], night:['7.16','7.17','7.18','7.19'] };
function cutBacklog(text){ const eol=text.includes('\r\n')?'\r\n':'\n', L=text.split(/\r?\n/), out={ core:[], full:[], night:[] }; let to='core';
  for(const line of L){ let m;
    if(/^## 0\. /.test(line)||/^## 1\. /.test(line)||/^## 7\. /.test(line)) to='core';
    else if(/^## [2-6]\. /.test(line)) to='full';
    else if((m=line.match(/^### \S+ (7\.\d+)\. /))){ to=Object.keys(SEC7).find(k=>SEC7[k].includes(m[1])); if(!to) throw new Error('no track for §'+m[1]); }
    out[to].push(line); }
  return { out, eol }; }

const OLD_PATHS='_Paths in older text: `src/core/` → `core/pure/`; `src/ui.js`, `draw.js`, `latmeter.js`, `views/` → `core/legacy-ui/`; other `src/` → `core/`; `data/` → `core/data/`; Night-only and Full-only files → `apps/night/`, `apps/full/`; probes → `tools/probes/`; prints → `tools/prints/`. Map: `tools/split-move.mjs`._';
const WHERE='_The old `BACKLOG.md` was cut by section at SPLIT-2 (nothing lost, `tools/split-docs.mjs --check`). §0, §1, §7.3, §7.4, §7.8, §7.12 → `docs/core/BACKLOG.md`. §2–§6 and the numbers 3.x → `docs/full/BACKLOG.md`, with §7.1, §7.2, §7.5–§7.7, §7.9–§7.11, §7.13–§7.15, §7.20. §7.16–§7.19 → `docs/night/BACKLOG.md`._';
const START={
core:`# BACKLOG — CORE track (\`core/\`, used by both apps)

${LOG_NOTE}

${WHERE}
${OLD_PATHS}

## Open now (written at SPLIT-2, 2026-11-02, English)
- ⬜ **CORE-1: hand calibration and per-effect sensitivity in the engine.** The first CORE run; both apps use it. Opt-in, and with the option absent everything stays exactly as before (core rule 4). The screens are app work: \`docs/full/BACKLOG.md\`, \`docs/night/BACKLOG.md\`.
- ⬜ **ui-snap recheck on the GeForce.** RUN 9's Full screens were captured on the Intel HD 4000 and differ at rendering level from RUN 7's on the GeForce GT 635M (gradients ±1–2, glyph edges). A capture on the GeForce settles it.
- ⬜ **Remove the embedded \`profile.full\` from Night's page** once Night has its own stress reference (\`core/DEBT.md\`).
- ⬜ **Keep shrinking \`core/legacy-ui/\`** and the rest of \`core/DEBT.md\`. Next large piece: split the \`recorder.js\` facade so Night plays without the recording path.
- ⬜ Remove \`tools/split-*\` and \`tools/split-baseline/\` when the user no longer needs the split's proof; the row «OLD NAME gone» then loses its exemption for them.
- ⬜ Replace the temporary row exemptions as they fall away: \`apps/night/migrate.js\` (NIGHT backlog), and the known overlap in \`tools/ui-snap.mjs\` (\`MSG_KNOWN\`).

## Open from the old HANDOFF (kept word for word in \`archive/HANDOFF-history.md\`, «Moved from HANDOFF.md at SPLIT-2»)
- ⬜ User checks on camera and detection: phone latency (defaults; D 30 fps; the worker path, which decides its default) · step 96 (each camera test, then Off → picture back; reload + Zoom normal), then step 95 (evening, each low-light setting 20 s + Copy) · step 97 (camera busy / off / blocked → message, «Try again»).
- ⬜ User checks of the foundation, runner-passed only: steps 91–100.
- ⬜ Tunings as files: F1, F3–F7 not checked by the user; F7 snapshot to renew (change f7).
- ⬜ AF6 memory, the rest (with stage 5, §1). AF2 tails (§1).
- ⬜ Moved after the first release: ROUTE1, IN1, GES2. UI1a after the redesign.
- ⬜ Plans at max effort still to write: latency and hands (detection in a worker, pinch prediction, output buffer, on LAT1's numbers); hearing the room (before stage 5); the synthesis core (one AudioWorklet in Rust → WebAssembly, band-limited, live = freeze = export); a deep code review + type-checking prep every few months.
- ⬜ Engine direction: Rust → WebAssembly module by module from stage 5, effects first, voices in stage 7; offline renders of WASM tracks in a Worker, which also avoids Chrome's worklet-context leak.
- ⬜ Hand tracking off the main thread (§7.8): the worker path is ≈ 2× slower on the user's desktop GPU; phone numbers decide.
- ⬜ Tuning model, the rest: chord build adaptive vs from the tuning · scale-panel switches from the mode's data (F6b) · songs store a copy of each tuning · Scala readiness · a "central tone" for patets · open: 1/1 typed in Hz, Scala \`.kbm\` export.
- ⬜ Small, decided, unscheduled: settings in localStorage (§1) · hand identification \`key+=i\` (full, §4).

---
_Below: the old backlog's text as it stood, renamed. The English index and status banner cover the whole old file._

`,
full:`# BACKLOG — FULL track (\`apps/full/\`)

${LOG_NOTE}

${WHERE}
${OLD_PATHS}

## Open now (written at SPLIT-2, 2026-11-02, English)
- ⬜ **Calibration and sensitivity screen,** on top of CORE-1 (\`docs/core/BACKLOG.md\`).

## Open from the old HANDOFF (kept word for word in \`archive/HANDOFF-history.md\`, «Moved from HANDOFF.md at SPLIT-2»)
- ⬜ Work order after the first release: **5** saving (on the device + file export/import; same format and ids), export with Scala, audio tracks and audio take, mixer per-track effects and meters, AF6 rest, «Listen», WASM effects → **VOL-7** per-note pan → **6** MIDI controller → **7** new-engine instruments, timbre builder, user modes with Scala, sampler → **8** server (accounts, sync, sharing, subscription, marketplace).
- ⬜ **Last stage, after everything else:** the lessons / tutorial update. No lesson or tutorial edits before it (user).
- ⬜ When there is a window: promo video (§3.31) · Spanish / German, awaiting a terminology check (§3.18) · Turkish maqams (§3.25).
- ⬜ User checks, runner-passed only: S4–S6, T7 · ear steps 64, 65, 66, 70 · steps 67, 68 · ED and OWN steps 71–83 · TF steps 84–90.
- ⬜ Tracks: source = the timbre assigned to a finger (only \`recorder.noteSource\` changes); live effects belong to the timbre (chains move from role to timbre; a track has one chain at a time).
- ⬜ Mixer: master = what audio export renders; fader ≠ note volume; per-track effects and meters. Audio take after auto-freeze.
- ⬜ Hearing the room (§7.11): the mic follows the room's key or each chord and its tuning. Traps: freeze the tonic first; follow chords in a chromatic view; echo cancellation. Key detection written by us.
- ⬜ Saving, user's decision (§3.35): the song is the person's work, frozen audio a cache; draft vs project, autosave + versions, \`storage.persist()\`.
- ⬜ Timbre builder (§7.13): 48 gesture addresses, one-AudioWorklet engine for play / freeze / export, multisample export. Product: timbres then songs on a server; paid = what goes through the server; our open versioned timbre format is the truth; app as a MIDI controller.
- ⬜ Bass and solo are one instrument: code mirrors, not merges, until the timbre format.
- ⬜ Decided, not scheduled: register as a setting · timbres on fingers · merging bass / solo code and voice mode as timbre data · 7-note Pythagorean mode (P5, postponed; appended at the end) · voice-leading lines between chords · triad / seventh switch for untyped modes · retrigger in lead mode · study Arabic, Indian and other traditions with musicians · team ideas: two UI faces, hand on a rest, mode lessons, spoken menu, light theme · polyrhythm (§3.24) · swing as a ratio (§3.30) · gesture builder (§3.29) · cultural gate for «Drums only» (§3.33 item 1, a defect) · OWN3 cents per row (deferred, user) · the user's expression hand: pedal-like hand, hand map, expression lab (§3.29).
- ⬜ Known defects kept: captured expression channels are not replayed (§4) · opening the editor silences a ringing latch.

## 7. Product direction (the parts that belong to Full)
_The heading and intro of §7 are in \`docs/core/BACKLOG.md\`. Sections §7.x follow at the end of this file._

---
_Below: the old backlog's text as it stood, renamed._

`,
night:`# BACKLOG — NIGHT track (\`apps/night/\`, Handsong Night)

${LOG_NOTE}

${WHERE}
${OLD_PATHS}

## Open now (written at SPLIT-2, 2026-11-02, English)
- 🐞 **Landscape: the low-light hint overlaps the control panel;** its OK button sits over the «Звук» label. In the baseline since before the split. The overlap check now compares messages with the panel (\`msgCheck\` in \`tools/ui-snap.mjs\`) and names this one as known (\`MSG_KNOWN\`). Fix it, then delete the known line: the check fails while a known line no longer happens.
- ⬜ **A cross-link to the full app, later:** from Night's info card, as a plain web link to the Handsong site or store page. Never a code import.
- ⬜ **Delete \`apps/night/migrate.js\` after the first public release,** with the row «NIGHT migrate» and the file's exemption in the row «OLD NAME gone».
- ⬜ **The user's eye and ear checks of RUN 9: steps 120–124,** and **the Poco measurement** (ⓘ → «Measure this device», 2 minutes with the forest on). Current addresses: \`docs/night/HANDOFF.md\`.
- ⬜ **Background music themes** (ex-RUN 10).
- ⬜ **Port the forest demo with CC0 textures** (ex-RUN 11). Every texture goes in the licence register first (rule #32).
- ⬜ **Rooms as modules:** room contract, catalogue, loader.
- ⬜ **Calibration and sensitivity screen,** on top of CORE-1 (\`docs/core/BACKLOG.md\`).
- ⬜ **A scales library with key choice.**
- ⬜ **C9 offline:** vendored MediaPipe + model, CSP to \`'self'\`, SW precache + update toast, \`storage.persist\` (plan §9.1; the old cache item: \`docs/core/BACKLOG.md\` §1). **C10 release:** the release edition exists (\`tools/build.mjs\`, \`HANDSONG_EDITION=release\`); left are the dist checks, privacy wording, hosting. **C12 release candidate:** both suites on the runner, the user's phone round, fixes, then publish.
- ⬜ **Store packaging, later** (Capacitor: \`webDir: dist\`; the network list in \`archive/SPLIT-PLAN.md\` §4.4 must change first).

## Open from the old HANDOFF (kept word for word in \`archive/HANDOFF-history.md\`, «Moved from HANDOFF.md at SPLIT-2»)
- ⬜ C8 rest: phone numbers, the auto-proposal of a level.
- ⬜ RUN 9's questions to the user: is medium good enough or should high get cheaper · the night's 24 minutes and a cloud every 3 minutes · rare moments every 2.5–5 minutes · 1–3 s to open the forest, or a gentle «waking» moment · the falling star in front of the trees.
- ⬜ User checks without a closing record in the old HANDOFF: steps 101–105 and 114–119 (the user's checks of 106–113 led to RUN 8).
- ⬜ Before the first release: detection in a worker if phone numbers ask for it, the user's own visual design and icon set (§7.19; Night's look is chosen, the audit marks of the rest remain).
- ⬜ After the first release: installation (kiosk) mode §7.18 = stage 4b · «Listen» §7.17 · the plan's later list (§12): more rooms, the forest band, rhythmic backings, more timbres and effects, the expression hand, saved moments, packs, «Plus».
- ⬜ Selling: Vercel Hobby forbids it; a paid plan or other hosting first (§7.12 item 6, \`docs/core/BACKLOG.md\`).

## 7. Product direction (the parts that belong to Night)
_The heading and intro of §7 are in \`docs/core/BACKLOG.md\`._

---
_Below: the old backlog's text as it stood, renamed._

`};

const CHECK=process.argv.includes('--check');
if(CHECK){ const lines=t=>t.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim()!==''); const have=new Map(); for(const k of ['core','full','night']) for(const l of lines(read(`docs/${k}/BACKLOG.md`))) have.set(l,(have.get(l)||0)+1);
  let lost=0, n=0; for(const l0 of lines(read(SAVE+'/BACKLOG.md'))){ const l=docText(l0); n++; const c=have.get(l)||0; if(c>0) have.set(l,c-1); else { lost++; if(lost<20) console.log('  LOST: '+l.slice(0,140)); } }
  console.log(`[split-docs] BACKLOG: old ${n} non-blank lines · lost ${lost}`);
  const same=(a,b)=>Buffer.compare(readFileSync(at(a)),readFileSync(at(b)))===0;
  const logs=[[SAVE+'/NIGHT-LOG.md','archive/NIGHT-RUN-LOG-2026-10.md',0],[SAVE+'/WORK-LOG.md','archive/WORK-LOG-before-split.md',1]].map(([a,b,note])=> note ? read(b).startsWith(read(a)) : same(a,b));
  console.log(`[split-docs] frozen logs word for word: NIGHT ${logs[0]}, WORK ${logs[1]}`);
  const hist=read('archive/HANDOFF-history.md').includes(read(SAVE+'/HANDOFF.md')); console.log(`[split-docs] old HANDOFF in the archive word for word: ${hist}`);
  const ok=!lost&&logs.every(Boolean)&&hist; console.log(ok ? '[split-docs] PASS' : '[split-docs] NOT A PASS'); process.exit(ok?0:1); }

if(existsSync(at('docs/core/BACKLOG.md'))){ console.error('[split-docs] already done'); process.exit(1); }
const ALL=['BACKLOG.md','HANDOFF.md','WORK-LOG.md','NIGHT-LOG.md','docs/NAME-INDEX.md','docs/SPLIT-PLAN.md','docs/SPLIT-PROGRESS.md',...MOVES.map(m=>m[0])];
mkdirSync(at(SAVE),{ recursive:true }); for(const f of ALL) copyFileSync(at(f),at(SAVE+'/'+path.basename(f)));

for(const [a,b,fn] of MOVES){ const t=read(a); write(b, fn ? fn(t) : t); rmSync(at(a)); }
rmSync(at('docs/design'),{ recursive:true }); rmSync(at('docs/prototypes'),{ recursive:true }); rmSync(at('docs/NAME-INDEX.md'));

renameSync(at('NIGHT-LOG.md'),at('archive/NIGHT-RUN-LOG-2026-10.md'));
{ const t=read('WORK-LOG.md'), eol=t.includes('\r\n')?'\r\n':'\n'; write('archive/WORK-LOG-before-split.md', t+(t.endsWith('\n')?'':eol)+eol+LOG_NOTE+eol); rmSync(at('WORK-LOG.md')); }
renameSync(at('docs/SPLIT-PLAN.md'),at('archive/SPLIT-PLAN.md')); renameSync(at('docs/SPLIT-PROGRESS.md'),at('archive/SPLIT-PROGRESS.md'));
{ const t=read('HANDOFF.md'), eol=t.includes('\r\n')?'\r\n':'\n'; appendFileSync(at('archive/HANDOFF-history.md'), `${eol}## Moved from HANDOFF.md at SPLIT-2 (2026-11-02) — the whole file, verbatim${eol}`+t); }

{ const { out, eol }=cutBacklog(docText(read('BACKLOG.md'))); for(const k of ['core','full','night']) write(`docs/${k}/BACKLOG.md`, START[k].replace(/\n/g,eol)+out[k].join(eol)+(out[k].at(-1)===''?'':eol)); rmSync(at('BACKLOG.md')); }

/* code comments and tools: only the moved documents' paths */
const SKIPDIR=new Set(['node_modules','prints','split-baseline','vendor']);
const walk=d=>readdirSync(at(d),{ withFileTypes:true }).flatMap(e=>e.isDirectory() ? (SKIPDIR.has(e.name)||e.name.startsWith('.') ? [] : walk(d+'/'+e.name)) : [d+'/'+e.name]);
let n=0; for(const f of ['core','apps','tools'].flatMap(walk)){ if(!/\.(js|mjs|json|css|html|md)$/.test(f)||/^tools\/split-/.test(f)) continue; const was=read(f), now=docPaths(was); if(now!==was){ write(f,now); n++; console.log('  paths: '+f); } }
console.log(`[split-docs] done; paths updated in ${n} code and tool files. Next: --check.`);
