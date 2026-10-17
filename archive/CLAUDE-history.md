# CLAUDE.md — moved text (DOC1, 2026-10-17)

Everything below was cut from `CLAUDE.md` at DOC1 WORD FOR WORD (proof: `node tools/doc-split-check.mjs <old> CLAUDE.md
archive/CLAUDE-history.md` → no line lost). Where this text and `CLAUDE.md` disagree, `CLAUDE.md` wins; new detail for a moved section
is appended to that section here. Sections: old header lines · Module map (full) · Architecture · Known limits · How to verify a change
(full steps).

## Old CLAUDE.md header lines (replaced at DOC1)
Guidance for Claude Code in this repository. Concise by design: every rule, number and name is here; the long reasoning behind
each section lives verbatim in `archive/CLAUDE-full.md` (same section titles — grep them). State, open decisions and work order:
`HANDOFF.md` (history: `archive/HANDOFF-history.md`).

## Module map (full, moved at DOC1)
## Module map (every exported/notable name, per module: `docs/NAME-INDEX.md` — grep it, don't read it; reasoning: archive, "Module map")
- `index.html` — markup only (start card, top bar, panels `#panelScale`/`#panelSound`/`#panelLoop`, `#backingMenu`, help overlay,
  `#tutorBar`+`#lessonOv`, transport `#loopTransport`, `#arrBar`, `#rollBar`, `<video>`/`<canvas>`); base path relative. First in `<head>`:
  the CSP `<meta>` (rule #33); the privacy notice `#privacyNote` ends the start card's footer. `src/va-stub.js` — the counter's queue
  stub (classic script, no imports).
- `tokens.css` (UI1b) — the DESIGN TOKENS: every colour, type size / weight / line height, spacing, radius, shadow and z-index of the DOM
  interface as custom properties on `:root` (today's values; names: colours by family + alpha `--c-white-a22`, sizes/spacing by today's px
  `--fs-15`, `--sp-9`, layers by role `--z-panel`). ⛳ `style.css` and JS-set styles carry no such literal (static check 11: also every
  `var(--x)` must be defined there or listed in `RUNTIME_VARS`, today `--role`); a new value is added to tokens.css first. DRAW1b: the CANVAS palette
  too — section «canvas» `--cv-*` (role colours `--cv-role-ld/ch/bs/dr`, `--cv-lane-norole`, effect bars `--cv-fx-*`, 82 family+alpha colours),
  read by `src/palette.js` (`cv(name)` = the token's exact text, cached; `ROLE_COL`, `noRoleCol()`); static check 11 fails on a colour
  literal in `src/views/` or `config.js` and on a `cv()` name without a token (CONTROL). `src/icons.js` (UI1b) — THE ICON COMPONENT: `ICONS` by MEANING (one glyph may serve two names: 🎚 mixer /
  bass), `icon(name)`, `iconText(s)` expands `{i:name}` (the dictionaries carry tokens; `t()` expands them), `applyIcons(root)` fills
  `[data-icon]` (a name or a `{i:…}` template; called by `applyI18n`). ⛳ An interface glyph outside icons.js fails LIC1 (exempt: probes and
  the console texts of songs/recorder/render, `ICON_EXEMPT`); data row «UI1b icons (core)». Proof tool for no-visible-change slices:
  `node tools/ui-snap.mjs --save <tag> [--compare <base>]` (10 screens, computed styles + pixels, fixed fake camera; deterministic).
- `style.css` — all CSS (values through tokens). `manifest.json`/`sw.js` — PWA; the SW is deliberately cache-free (empty `fetch` handler, only so Chromium
  fires `beforeinstallprompt`).
- `src/config.js` (leaf, imports nothing) — thresholds, scheduler timings, pool sizes, palette/FX geometry (`palSplitX` = the single
  palette|notes split, `rectBandY`, `coverView` = the single cover crop), volume curve `volAmp(v)=v²`/`volVel`/`volFromOld`,
  fine-recording constants (the role palette moved to tokens — `palette.ROLE_COL`, DRAW1b), arrangement sizes, the ONE curve law of bends and bus
  lanes (`curveU`/`curveK`, `bendAt`/`bendSplit`, `bendPlan` — BEND-CURVE).
- `src/state.js` — cross-cutting musical/layout state + setters (scale, tonic, `tonicCents` (TF5), `aRef`, `tunedFrom`, instruments, `handFn`,
  `voiceMode`, split + `phoneHalves(W)` (the only `W/2`), registers, camera, editor/window state). Chain-owner key `chainKeyOf(role)`
  → `'role:ld'`, `fxChains`, `FX_VOL`, `chainOwners()`. ⛔ The key is OPAQUE — equality and indexing only, never parsed.
- `src/hooks.js` — nullable callbacks for lower layers; `hooks.tutor(kind,payload)` is the tutorial's single channel; `hooks.cleared()` — ✕ happened (ui: the undo toast, ED7-fix2); `hooks.af(kind)` —
  auto-freeze settle hints (recorder: take, undo, backing, rowDelete, editor, song; ui: panHold, pan); `hooks.afRow(layer)` — the window's
  freeze dot (both set by `frzqueue.js`); `hooks.key()` — a song Transpose step (or its ↶/↷) moved the key knob (ui: `#selTonic`, scale
  button, TF5 row).
- `src/i18n.js` — `LANGS=['en','ru']`, `DICTS`, `t(key,params)` (dict → en → `params.def` → the key), `L(field)`, `store`,
  `applyI18n`; persisted as `handsong.lang`.
- `data/` + `src/scaleload.js` — ALL scale data are JSON files (v1; manifest order = menu order = F0 index); per-file validation; a
  broken file is SKIPPED (one console line, `#loadmsg`); nothing valid → the embedded emergency pair. User files (IndexedDB, ids
  `u.<uuid>`) load after the built-ins through the same validator.
- `src/userstore.js` / `src/userfiles.js` — user file storage and the console API (`window.U` with `?probe`); a record others depend on
  can't be removed; deleting never breaks recordings (`P.checkUserDelete`).
- `src/scales.js` — the teaching layer and pitch truth: builder → `TRADITIONS` (6), `TUNINGS` (18), `CHORD_FAM_SETS`, `SCALES` (74).
  ONE pitch function `pitchHz(T,A,z,k,R)=A·P^R·ρ(k)` (⚠️ keep its multiplication order); chord pricing `chordNotes`; memoised view
  `scaleView`/`CUR()`; predicates (TF5: `keyByOneOne`, `historicalKeyOf`, the cents door `viewKeyC`); rect layout; theremin; `registerRecord`/`unregisterRecord`.
- `src/audio.js` — the Web Audio engine (see "Audio engine"): pools, synthesis paths, drums, drone, metronome, FDN reverb, `FX_FACTORY`,
  chain wiring, track level/pan, master, frozen-track store/reader, probe and render helpers.
- AUD1a (RUN 3): `audio.js` `engineCtx()` → `E`, THE ENGINE CONTEXT of this module instance (live and `?render` copy each their own;
  docs/AUD1-design.md option C, review R1–R5): every field a GETTER over the instance's module variable — `ac`, `offline`, `rate`, `rnd`,
  `dbg`; `master.{in, glue, make, lim, limiter, out, meter, level, limRed}`; `bus.{ldSum, ch, bs, dr, drone}`, `head(key)`; `trackBus.*`;
  `lfo.*`; `expr.*`; `fx.{inst, head, out, links, path, aim, dipT}`; `pool.{ld, ch, bs}`; `wk.{ks, dyn, frz, frzStore, frzSink, cap, capOk}`;
  `look.{gainOf, panOf, routeOf}`; `buf.{noise, forestIRs}`; `drone.*`; `build.*` (scratch of the voice being built, with setters).
  `src/engine/surface.js` — THE ENGINE'S OUTWARD SURFACE: every audio.js export listed by its caller module (static check 12: listed =
  exported, every export listed, every module's calls listed — named imports, `ns.x`, makeENG's `A.x`, the render copy's `eng.x`; CONTROL).
  `render.engineProbe(fn, {real, wrap, phase, after})` (probes only). Probe rows «AUD1 engine context» (three times, both copies, nothing
  shared; CONTROLS stale snapshot / shared node) and «AUD1 node census» (`tools/census.print.json` from `P.dumpCensus()`: nodes by kind of
  the copy's initAudio + one note of every timbre / kit row / the drone; «not applicable» when the live chains differ).
- AUD1c (RUN 3): `src/modules/timbres/` — the TIMBRE BUILDERS moved out of audio.js (rule #38: stateless, the first argument is E, shared
  by both engine copies): `stages.js` (`makePanStage`, `voiceRoute`, `makeBriStage`, `panGains`, `makeSatCurve`/`makeHardCurve`, `BRI_HZ`,
  `BRI_OPEN`, `briHzOf`, `CHORD_LP_MAX/MIN`, `briToHz`, `HUM_CENTS`, `LEAD_GLIDE_TC`, `fstrike`, `freezeDeep`), `voice.js` (`voiceBuild`,
  `voiceStart`, `voiceStartPair`, `mkOsc`), `fm.js` (`buildFMBank`), `ks.js` (`KS_BANKS` deep-frozen, `buildKSBank`, `buildKSFallback`),
  `subtractive.js` (`buildLeadBanks`, `buildLeadBank`), `chord-voice.js` (`newChordVoice`, `buildChordPool`, `FIREFLY`, `FF_END`,
  `ffStrike`), `bass-voice.js` (`buildBassPool`), `drumkits.js` (the five kits' hit synths, `dNoise`, `drumVoice`). Same code, same creation
  order; state read through E (`E.ac`, `E.rnd`, `E.build.*`, `E.pool.*`, `E.look.ownerPan/ownerGain` …). The timbre TABLES (`LEAD_INSTR` …),
  pools, allocation and routing stay in audio.js (until TIM3). Data row «AUD1c timbre data pure (core)» (R2: the modules load in node, the
  tables are pure and deep-frozen; CONTROLS).
- AUD2a (RUN 3): `src/modules/effects/` — the EFFECTS moved out of audio.js (rule #38): `param.js` (`fxNorm`, `fxDenorm`, `fxWrapParam`),
  `reverb.js` (`REV_PARAMS`, `makeReverbFx`), `delay.js` (`DLY_A`, `DLY_PARAMS`, `makeDelayFx`), `trem-mix.js`, `bright.js`, `glide.js`,
  `volume.js`, `forest.js` (`forestBuffer`; the IR cache stays in audio.js — `E.buf.forestData`), `glue.js` (`dynNode` — also the master's
  Glue and Limiter, `makeGlueFx`); `src/engine/fdn.js` (`REV_A`, `apStage`, `buildFDN`, `setRevDecay`, `setRevTone` — the JS reference for the
  WASM reverb W1). Every declaration deep-frozen (shared by both engine copies; the makers copy before wrapping). `FX_FACTORY` stays in
  audio.js, the same keys in the same order; a factory is called `make(E)` (`fxInstance`). `FX_VOL` moved to config.js (state.js
  re-exports it); `BASS_GLIDE_TC` to `modules/timbres/stages.js`.
- ENG1 (RUN 3): THE ENGINE CONTRACT (plan §4.4) in audio.js — `noteOn(voice, n, time)`, `noteSet`, `noteOff`, `bend(voice, plan, time)`,
  `hit(owner, h, time)`, `drone(owner, d, time)`; `n` = { role 'ld'|'ch'|'bs', hz (a chord: a list), vel, timbre (position), deg, oct, values
  (the note's map), bri, glide/live, tie, symp, cancel }; time always last (rule #15). `live/eng.js` makeENG calls ONLY these (+ `timbreIdx`,
  the id → position lookup) and prices every note itself; each call does what the adapter did, in the same order. The engine's REMAINING
  reads of app state (to cut later): `state.js` live timbre positions (`leadIdx`, `bassIdx`, `drumKitIdx`), the live solo scalars `fx`,
  the chain tables (`fxChainOf`, `chainKeyOf`, `trackChainKeyOf`, `CHAIN_SOLO` — routing as data is ROUTE1 / `setGraph`); `scales.js`
  `tonicFreq`, `droneSecondHz` (the drone prices its view — later `drone(owner, {hz, hz2})`); `modules/timbres/ks.js` `baseF()` (the
  sympathetic strings when `symp` is null); `hooks.js` (UI notices).
- AUD2b (RUN 3): `src/probes/fxcontract.js` — GENERATED CONTRACT ROWS, one per `FX_FACTORY` effect, each built ALONE by its own `make(E)` on
  the render copy (`render.engineProbe`, `opt.sec`), a seeded noise burst after 0.4 s of settling: family «AUD2b effect contracts» (quick:
  parameter round trip — default in range, getNorm, norm → units → norm 1e-9; identity at neutral — mix 0 / depth 0 / Glue thr 0, knee 0,
  makeup 0 → the input sample for sample (Glue 1e-6); CONTROLS: a 1 % units error, the effect fully on) and family «AUD2b effect tails»
  (P.all: two renders equal ≤ 2e-4 of peak; the output falls 60 dB below peak no later than render.js's declared tail — reverb decay, forest
  room, delay time·ln1000/ln(1/fb), inserts 50 ms; CONTROL: half the reverb decay must be exceeded). Voice modules: parameters only.
- `src/engine/worklets/ks-worklet.js` (AUD2c: the four worklets live in `src/engine/worklets/`, page-relative `addModule` paths; rule #38
  exempts them) — Karplus–Strong `ks-string` (mandatory worklet: a native delay loop is floored at 128 samples); allpass
  fractional delay + loop-filter phase compensation (< 1 cent); seeded via `processorOptions.seed` only in track renders.
- `src/engine/worklets/frz-worklet.js` — frozen-track STORE (`frz-store`, transferred Int16 chunks) and READER (`frz-reader`: context frame F ≥ startF
  plays buffer frame F + d, integer frames; reports `{ended, played, first, seen}`; `ready`; `ALIVE`). Frame never goes backwards.
  Loaded on the LIVE context only.
- `src/engine/worklets/probe-cap-worklet.js` — probes only: audio-thread capture of the live master (`F0`, `gaps`, `stale`).
- `src/arrange.js` — arrangement data + pure generation (`PROGRESSIONS`, `HARMONIES`, `RHYTHMS`, `BASS_MODES`, `buildArrangement`);
  volumes in the OLD per-role scale, converted at event birth. Imports only `config.js`.
- `src/recorder.js` — since REC1–REC5 (NIGHT run 2026-10-16: 4897 → 725 lines) mostly the FACADE: it re-exports everything that moved
  to `song/`, `transport/`, `freeze/`, `live/` (importers, `render.js` `REC.*`, probes, tutor unchanged) and does the WIRING (`envWire`,
  `clockWire`, `schedWire`, `freezeWire`, `recWire`, `backingWire` — closures, because many targets are declared further down). Still its
  own (the session glue): lane prune/reset/delete, mixer setters, `laneHush`, the drone sync, the editor SESSION (`editOpen`/`editClose`/
  `editSetLayer`, `probeTake`), the snapshot steps + `histCommit` + `clearSong` + the kinds snap/tab/master/key, `softAllOff`/`liveAllOff`/
  `trackResplice`, `backingFollowKey`, `onLoop`, `onUndo`, `seedTake`, `clearRec`, `panic`.
- `src/transport/` (REC4): `clock.js` — the transport state `loop`, song length (`songLen`, `songLenRecalc`, `songLenGrow`), the brace math
  (`songAt`, `rgnReps`, `cycling`, `rgnApply`, `rgnSync`, `braceTap/Move/Set`, `setRegionOn`), the metre map `beatLevel`, the setters
  (`setLoopBpm/Metre/Bars/Sub/Quant`), `loopPos`, and ⛳ THE BEAT ↔ TIME CONVERSIONS (rule #35): `secPerBeat`, `beatNow`, `timeAt`, `secOf`,
  `beatsOf`; `clockWire` (recording, release, swap cancel, chase for a brace jump). `scheduler.js` — replay cursors + their `onInvalidate`
  listener, `scheduleLayers`, `releaseLoopLayersAt`, the chase (`chaseFor`, `chaseNote`, `chasePlay`, `chaseReset`), `fireNear`, metronome,
  `tick`, `stopAtEnd`, `startTransport`, `seekTo`, `clearPump`; `schedWire` (recording state, take, ENG, per-pass closing, sampling, playback).
- `src/freeze/registry.js` (REC5) — frozen tracks: registry by lane id, `freezeSig`/`freezeState`, watcher reads (`frzWatchKey`,
  `frzWatchBump`), install/pending readers, 16-bit store, the AF2 swap, both seams, node life cycle (the plan's split registry + swap waits —
  the seams call both ways); `freezeWire` (capture snapshot, live drone, release, chase).
- `src/live/` (REC5): `eng.js` — `makeENG`, the live `ENG`, play-time pricing `evHz`/`evReg`/`evHzDbg`. `record.js` — recording state and the
  take's per-track state, source routing (`noteSource`, `takeRoute`), `push`, per-role recorders, `recFoldRoll`, the W* calls, `recLatchOpen`,
  `setRecording`/`recStop`/`onRec`; setters for outside writers `curTakeSet`, `recWinReset`, `liveChClear`; `recWire` (fine automaton, the
  take's snapshot step, editor session, capture snapshot, lane reset). `capture.js` — the capture SAMPLING (`takeCapStart`, `takeCapSample`),
  the fine-recording automaton (`fineNew`/`fineStep`/`fineKnee`, `pnSnap`), effect PLAYBACK (`fxLaneMerge`, `fxPlayBuild/Drive/Stop`,
  `fxPlayDriving`, `fxIsDriven`), live isolation (`liveIso`, `setLiveIsolation`, `playKeyOf`), `capReset`. `backing.js` — `loadArrangement`,
  `loadJam`, `backingEvent`, `clearJam` (`backingWire`). ⚠️ A moved `let` is written outside only through such a setter (an
  import cannot be assigned — «Assignment to constant variable» at run time; the static check does not see it).
- `src/song/` (REC1–REC3, stage 3; pure — no DOM, no Web Audio; imports only `song/`, `core/`, `config.js`, `scales.js`): `store.js` —
  `events` (the stable array), `evGen`, THE rebase point `schedInvalidate` (bumps `evGen`, fixes the sorted prefix `sortedLen()`, then runs
  the listeners of `onInvalidate` in order — the note view, then the recorder's cursors, chase cache, song length, brace), birth order `evSeq`/`evSeqFill`/`evOrder`, `compactEvents`, `maxLayer`,
  event kinds `evRole`/`chaseRole`/`isNoteStart`. `lanes.js` — the track tables by lane id (`laneId` via `laneNew` only, mute, solo, level,
  pan, name, rank, material length, edit version), the arm, the pending row delete (`laneDelTap`), readers (`laneOf`, `laneAudible`,
  `laneGated`, `laneLevelOf`/`laneGainOf`, `lanePanOf`, `laneNameOf`, `laneOrder`, `laneLook`, `layerOfOwner` …), table writers
  (`setLaneName`, `moveLane`, `laneForget`, `laneTablesClear`, `laneRow`/`laneRowSet`); what it needs from the recorder (recording, the
  take's layers, audio up, `deleteLane`) comes once through `laneWire`. Still in `recorder.js` (REC2–REC5): `deleteLane`, `lanePrune`,
  `laneReset`, `laneHush`, `toggleLaneMute/Solo`, `setLaneLevel/Pan` (they touch sound, freeze or history).
  `notes.js` (REC2) — owner keys of replayed voices `chOwnerKey`/`bassOwnerKey`/`ldKey` (THE engine keys), fresh slots `layerSlotTop`/
  `layerTakeTop`, chase keys `chaseKind`/`chaseKey`, the note view `songNotes()` (sorted prefix only; reset by its own `onInvalidate`
  listener or `notesReset()`), `songSegs()`, `ldTherm`, `tyEq`, the T6a view checks (`viewAudit`, `editViewCheck`, `trackViewCheck`).
  `history.js` (REC2) — the ONE history (ED7): `histPush` (single writer), the tripwire `histHash`/`histSeal`, `histUndo`/`histRedo`, group
  edits `histGroup`/`histSince`, table steps `histTab`/`histMaster`/`laneNameStep`/`moveLaneStep`, probe controls `histDbg`/`histDbgO`;
  ⛳ STEP KINDS REGISTER THEMSELVES: `histKind(kind, apply(u,undo), touched?(u,S))`, one dispatcher `histApply` (= the recorder's
  `editApply`) and `histTouched`; an unknown kind throws. The song's own kinds (move, del, ins, timbre, lanetouch, batch, ranks) register in
  history.js; each song/ module registers the kinds it owns (automation.js: aut*, autcap; sections.js: brace/marks/lanelen); recorder.js
  registers snap, tab, master, key — a new kind = one
  `histKind` next to its owner. What it needs from above comes once through `histWire` (ready / pause / commit for ↶/↷; capture records,
  markers, master level for the hash). Snapshot steps (`snapBegin`/`snapEnd`/`snapApply`) stay in recorder.js (capture, brace, freeze).
  `edit-notes.js` (REC3) — the editor's edit core (`editGuard`, `editCommit`, `editBatch`, `editPush`, `EDIT_ROLE`, `EDIT_GAP`/
  `EDIT_MIN_LEN`), tie pairs (`tiePartners`, `tieUntiePass`, `untieAcross`), `keyClash`, detach (`detachPlan`/`commitDetach`), `slotPt`,
  `chordMoveTy`, `segChordNotes`, `segPitchPt`, move / resize / delete of segments and hits, `bendTrim`; the editor session (`editLane`,
  `editOpen`…) stays in recorder.js and comes through `editWire` (ready, isOpen, layer, pause, touch). `edit-chords.js` (REC3) — U2–U4
  chord-note edits (`dissolvePlan`, `editDeleteChordNote`, `editMoveChordNote`, `editResizeChordNote`). `edit-group.js` (REC3) — ED1
  (`editGroup`, `editRemap`, `selGroups`, `editMoveWhole`, `editMoveSel`, `editDeleteSel`). REC3 part 2 (NIGHT run, 2026-10-16):
  `env.js` — ⛳ THE SONG LAYER'S ENVIRONMENT `ENV`, wired ONCE by the recorder (`envWire`; an unknown entry throws, an unwired one throws
  when called): the engine's effect declarations (`fxPerm`, `fxParamMetaOf`, `fxNoteField`, `fxParamKeysOf`, `fxDefaultsOf`,
  `fxNoteFollows`, `fxIsPerNote`, `fxSnapshot`, `FX_VOL`), `chainKeyOf`, `live()` (timbres, kit, tunedFrom, tonic, seventh), the transport
  (`ready`, `recording`, `pause`, `metre`, `sub`, `bpm`, `pos`, `brace`, `braceRestore`, `seek`), `af`, `capStart` (the live chain
  snapshot), `laneEditTouch`; a module keeps the old names as one-line forwarders at its top. `capture.js` — the capture records `takeFx`,
  `takeFxVer`/`takeFxTouch`, `FX_CHAIN`, the take counter `takeNext()`, the lane-shape law (`autSmoothOf`, `fxLaneSmooth`, `fxLaneAt`,
  `fxLaneExpand`, `setAutRecSmooth`), `laneRoleOf`, `laneChainKey`, `captureInfoOf` (the SAMPLING `takeCapStart`/`takeCapSample` and the
  playback merge `fxLaneMerge` stay in recorder.js). `automation.js` — bus lane (`autPoints`, `autAddPoint`, `autMovePoint`, …), per-note
  lanes (`pn*`), bend points/shapes (`editBendPoint`, `editBendShape`, `bendEdited`, `bendDbg`), volume bars (`pnBars`, `editVolSel`), the
  track chain (`autChainOf/Add/Remove/Move`, `autCaps`). `edit-insert.js` — `editDefVol`, the session take (`editTake`, `editTakeNow`,
  `editTakeReset`), `editInsPush`, the four inserts, `laneTimbreOf`, `editSetTimbre`. `clipboard.js` (ED2), `quantise.js` (ED3),
  `transpose.js` (ED4 `editDegreeSel`, OWN1 `editTrackMode`, TF3 `editTranspose`/`songTranspose`, `trDbg`). `sections.js` (ED6: `secMarks`
  + its one outside writer `secMarksSet`, `songEdit`, `secAdd/Rename/Delete`, `sections`, `secDbg`, the `song*` history aliases). Still in
  recorder.js: the editor SESSION (`editOpen`/`editClose`/`editSetLayer`), the snapshot steps and the kinds snap/tab/master/key.
- SAVE1 (DAY run): `src/core/songfile.js` — the song FILE's pure core: `songParse` (text cap `SONG_MAX_BYTES` 8 MB, JSON only, keys
  `__proto__`/`constructor`/`prototype` refused anywhere, nesting ≤ 24, newer version refused in words), `songUpgrade` (FMT1 migrations:
  v1 → v2 = TIM2 timbre positions → ids from the FROZEN table `TIM1_POSITIONS`; a copy, idempotent), `songCheck` (strict shapes and
  ranges); `format.js` takes `SONG_VERSION`/`SONG_MIGRATIONS` (kind `song`). `src/song/file.js` — `songData(meta)` (the song → one record:
  events in birth order with view NUMBERS, `views` = {mode, key, keyC, tunedFrom, chordMode}, tracks' table rows, capture records,
  markers, `settings` via ENV, `timbres` = a copy of every timbre used; a chain-less track gets the live chain snapshot and a map-less solo
  note the live solo snapshot IN THE FILE, so saving never changes the song), `songPlan(rec)` (back to installable data: views through
  `scaleView`, a missing mode refuses; a timbre id this app lacks → mapped to an own timbre with equal settings, else kept by id and
  named — its copy is re-saved), `fileDbg` (probe controls). `recorder.songSaveRec/songOpenApply/songMark/songDirty` (open = clear + install
  + ONE history step since SONG3, RUN 4 — see below); `ui.songSaveText/songOpenText` (+ download, file picker, confirm). Frozen audio is never stored.
- PACK1 (RUN 3): `src/core/pack.js` (pure; WebCrypto only, NO network — rule #33; provider-agnostic: a payment provider later only DELIVERS
  a key text) — the pack record `handsong/pack` v1 `{ id (kebab, permanent), name, licence, items:[{kind, id:'<pack>/<name>'}] }` (`packCheck`,
  a newer version refused in words); the LICENCE KEY «HS1.<payload>.<signature>» (base64url; payload `{ v:1, kid, pack, key, issued, until? }`,
  no personal data; ECDSA P-256 / SHA-256, `keySign` for tools/probes only, `keyVerify` offline → refusals malformed / format / unknownKey /
  signature / expired); `PACK_PUBKEYS` holds only the TEST public key (its private half: `tools/.pack-test-key.json`, git-ignored, made by
  `tools/pack-keygen.mjs`; a production pair is made the same way when a provider is chosen — its private half never in the repo);
  `createPackGate` + `packUnlock` (wrongPack; a free pack opens without a key); `core/registry.createRegistry(kind, {gate})` leaves locked
  pack records out of `order()` (`isLocked`), `get` still answers (songs play from their copies). No UI, no stored keys yet. Fixture
  `tools/pack-test-licence.json`; rows «PACK1 packs and licence keys (core)» (node) and «PACK1 licence keys in the page».
- IDS1 (RUN 3, part 1 — events): every event has a PERMANENT id `e.id` (positive integer, unique in its song) — given in array order by
  `song/store.evIdFill` at the one rebase point (`schedInvalidate`), kept by every edit that keeps the object and by ↶/↷ (the same objects),
  saved in the song file (version 4; migration v3→v4 writes nothing — an older file's events get ids at open); Open keeps the file's ids and
  `evIdFloor(max)` continues the counter above them; never reused in a session. `songCheck`: an id, when present, a fresh positive integer.
  Row «IDS1 permanent event ids» (CONTROL `fileDbg({noIds})`). IDS1 part 2: every captured LANE POINT has a permanent id `p.id` too
  (`song/capture.laneIdFill` at the one capture-change hook `takeFxTouch`, `laneIdFloor` at open; file version 5; a copy — the section
  «duplicate» — is a NEW point, never a spread of its original's id); a capture record is identified by its take number `tk`, a chain entry by
  (its chain key, its effect id) — no new field. ⚠️ A lane point is never copied with a spread that keeps `id`.
- SONG1 (RUN 3): file version 3 (`core/songfile.js`: migration v2→v3 adds `records:{}`; `songCheck` checks the shape — kinds tuning /
  palette / chordmodes / mode, keys `u.<uuid>` = the record's id and format). `song/file.js` `songData` writes `records` from
  `scales.userRecordsOf(view)` (the person's own records a view stands on, read from the VIEW — dependencies first); `songNeeds(rec)` →
  `{install, missing}` (pure); `scaleload.checkRecordList(list, D)` checks the copies in order like data files; `ui.songOpenText`: needs →
  check → ask → `registerRecord` each (rolled back on any failure) → plan → open; `songRecs` + `#songKeepRow`/`songKeep()` («Keep in my
  scales» → `userstore.userPut`). Probe control `fileDbg({noRecs})`.
- AUTOSAVE1 (RUN 3): `src/autosave.js` (no DOM) — the song kept on the device by itself: IndexedDB `handsong-songs`/`auto`, one entry per
  song id `{id, name, at, tracks, events, ms, text}` (`text` = exactly what Save writes; restore = `ui.songOpenText` of it, every SAVE1
  check), newest `AS_KEEP` 5 kept (trimmed in the write's transaction). `asTick(now)` every `AS.pollMs` 1 s: key = `histHash()` + the song
  settings; writes after `AS.settleMs` 2.5 s still, ≥ `AS.gapMs` 8 s apart, in `requestIdleCallback`; never while recording, a clip, a
  render (`hooks.renderBusy`), a probe (`asPause('probe')`), a probe's test song (`'probe-song'` hold), or playing when the last write took
  > `AS.playMs` 40 ms; an empty song is never written; material after an empty song = a new song (new id). `asFlush` on pagehide. Setting
  `handsong.autosave` (default on, `asSetEnabled`). Errors → `'full'` (quota) / `'blocked'` / `'error'` + one message. ui: `#asOn/#asOff`,
  `#asStatus`, `#asPick` + `#asRestore` (`asRestoreId`), `#resumeToast` (`songResumeOffer`, at ▶ Play only, once, 30 s). Probe controls
  `asDbg({db, fail, silent, ignoreOff, noTrim})`, `asPut`, `asDrop`.
- `src/frzqueue.js` — auto-freeze: the WATCHER (AF3) and the QUEUE (AF1), lazily loaded by `render.js` (see "Freeze").
- `src/vision.js` — camera + the DETECTION PATH + the FRAME PUMP (LAT2). Path: a detector object `{kind, run(job), setDelegate, dbg, close}`
  built by `buildDet` — the main thread (default, `mainDet`: handdet.js imported dynamically) or the worker (`workerDet`: src/hand-worker.js;
  cannot start / 90 s silent / dies → the main thread by itself, `path.why`); `setDetectPath`, `pathInfo`. Pump: every new camera frame
  (`requestVideoFrameCallback`, else `pollFrame` from the draw loop) → `createImageBitmap(video)` once → one frame in flight, one waiting
  (a newer snapshot REPLACES the waiting one; older-than-processed snapshots dropped) → `schedPlan` picks the action ('skip' runs nothing)
  → result + picture to the sink `setHandsSink(fn, paused)` (main.onHands); nothing is taken while the editor or the window is open.
  Counters `pumpStats()` (snapped, processed, detected, dropped, dup, notNewest, log {id, pf, action, n}); probe hooks `pumpDbg`,
  `detRunDbg`. `openCamera(facing)`, `switchCamera` (the detector is never recreated). LAT1b: `camInfo`
  (requested vs granted `getSettings`), `modelInfo` (the processor the model really runs on: starts from what was ASKED and succeeded —
  MediaPipe throws rather than falls back — and MediaPipe's own log lines (tap for 120 s after a (re)start, `mpTap`) only add evidence:
  asked GPU → 'GPU', or 'GPU+CPU' if an XNNPACK line came while GPU was asked; asked CPU → 'CPU' when its line came now or earlier on the
  page (TFLite prints it ONCE per page; `once`), 'unknown' only if it never came — never «unknown» for GPU (SND-F1b fix)), test switches
  `setHandsTracked('2s'|'2'|'1')` (the schedule's policy, instant) / `setModelDelegate` (`setOptions` on both models, then both warm up —
  MediaPipe prints its processor line only at a model's first inference) / `setCamFps` (reopens the camera) / `setDetectPath` / LAT3
  `setLowLight('off'|'fps15'|'fps24'|'exposure')` (applyConstraints on the running track — the set from `core/camlight.lowConstraints` over
  today's request `camBase()`; then 1 s settle + 2 s count of delivered frames (`vfRing`, the pump's rVFC) → `lowVerdict`; an error or no
  effect → back to Off, reason in `lowInfo().note`; a camera reopen resets it to Off, note 'reopened'; CAM-FIX (rule #34): Off, a
  fall-back, leaving the page and a reopen restore the device (`devRestore`), an open restores what our test record names (`camHeal`, 0a),
  `lowInfo().dev` = the last heal / restore for the meter; probe-only `lowDbg({fail, fakeFps, noFallback, extra, noRestore, noHeal,
  healAll, crash, devClear, reset})`,
  `camSimDbg(sim)` (a simulated UVC webcam around the real track)); 0b ROBUST START: opens are SERIALISED (exactly one getUserMedia each,
  never two in flight; an earlier request still pending → wait ≤ 3 s, else refuse), the old track stopped first; getUserMedia times out
  after 15 s only when camera access is already granted (never during a permission prompt), the first picture after 8 s; a failure stops
  every track it obtained (a timed-out request's late stream is stopped when it lands); `startCamera` retries once after 1 s and throws with
  `camKind` (`core/camlight.camErrKind`: busy / notfound / denied / other); pagehide releases the camera (after the test restore), a page
  back from the back/forward cache reopens it; the start is `initDetector` (once) + `startCamera`; counters `camStats()`, probe-only
  `camOpenDbg({gum, timeoutMs, playFail, noSerial, noRelease, noRetry, reset})`, `camStatsDbg()`; `camInfo` also gives `caps` (getCapabilities),
  `settings`, `label`. `VISION_DEF` = `{hands:'2s', delegate:'GPU', camFps:null, path:'main', low:'off'}`.
- `src/handdet.js` (LAT2) — the DETECTOR, worker-safe (no DOM): `createDetector({delegate, blank, step})` downloads the model ONCE
  (`MP_MODEL`, a fetch) and builds two models from it — L2 (numHands 2) and L1 (numHands 1), sequentially (MediaPipe's loader keeps one
  global) — and warms each on a blank frame (the first inference stalls ≈ 1.3–1.6 s; at start two steps with a yield between them — two
  shorter freezes behind the start card, CAM-FIX); `run(src, t, action, policy)` → plain result
  (`plainResult`: landmarks + handednesses), the action that ran (a tracking action that found no hand retries a search on the same
  frame: 'track1>search') and the model time. The only static import of MediaPipe.
- `src/hand-worker.js` (LAT2b) — a CLASSIC worker (MediaPipe starts each model by `importScripts` of its loader; in a module worker the
  second model fails «ModuleFactory not set»): imports handdet.js and `MP_LINE` dynamically inside `init` (a failure comes back as a
  `fail` message with its reason), ImageBitmaps transferred in and back, times in the page's clock, MediaPipe's log lines forwarded.
- `src/clip.js` — clip/audio recorder (`startClip`/`stopClip`, `activeKind()`, `captureFrame()` last in every frame, `REC_FPS` 30);
  `recKind` is the single truth.
- `src/demo.js` — start-screen tunings demo (own mini-engine); scenes by stable id (`SCENES[].id`).
- `src/tutor.js` — lesson list + step engine (see "The tutorial").
- `src/gestures.js` — the gesture state machine (`HANDS`, `processHands`, owner keys, voice modes, hysteresis, depth, `fxParamsOf` =
  the aim's single door, expression, looper hand). At pinch capture the hand's role and X-range are frozen on `S` (`S.role`, `S.rx0`,
  `S.rx1`, `S.zone`, `S.fn`). HAND1 probe-only: `handsProbe(clk, looperTap)` / `processHandsProbe(res)` (the probe clock), `pinchDbg(d)`;
  `recorder.wTapSet(f)` taps every W* call (all no-ops when unset).
  GES1 (NIGHT run, 2026-10-16; gestures.js 1213 → 903, it re-exports what moved): `src/gestures/features.js` — the PURE gesture math
  (`pinchRatios`, `minFinger`, `touchedFingers` + hysteresis, `emaS`, `smoothstep`, `degRaw`/`degHyst`, `cellHyst`, `clamp`/`clamp01`/
  `dist`, the HAND1 control `pinchDbg`; runs in node — data row «GES1 gesture features (core)»); `gestures/expr.js` — the expression hand
  (`EXPR_CFG`, `EXPR`, `exprFeatures`, `tickExpr`, `exprPrevT` + `exprPrevSet`; `exprWire` brings HANDS); `gestures/fxhand.js` —
  `fxParamsOf`, `captureFx`; `gestures/looper.js` — `doLooper`, `fireLooperCmd` (`looperWire`: the probe clock and tap). GES1 rest (DAY
  run): `gestures/roles.js` — stateless: `depthOf`/`depthN`, voice-mode zones, `liveKey`/`monoKey`, `wOn`/`wOff`, `ACTIONS`,
  `paletteFinger`, `handHalfRole`, `noteHandRole`, `noteVolOf`; `gestures/hands.js` — the state machine: `HANDS`, latch / lead owners,
  `voiceModeReset`, `endPinch`, the probe clock, `processHands`. `gestures.js` is now only the facade (re-exports).
- DRAW1 (DAY run): `src/draw.js` is the FACADE (re-exports); the canvas lives in `src/views/`: `common.js` (FX bar layout, status
  element, transport sync, colour mixing `hexA`/`mixHex`, `noteLbl`, the time axis `laneBeatX`/`laneBeatAt`, editor row geometry
  `rollRowY`/`rollRowAt`, bar heights `ROLL_BAR_H`/`ROLL_TP_H`), `camera.js` (`syncViewRect`, `drawVideoBackground`), `strip.js` (play strip,
  arrangement window, mixer: `drawLooper`, `loopView` + its one outside writer `loopViewClear`, hit tests, probes), `roll.js` (the editor:
  `drawRoll`, `rollView`, axis, lane, hits), `play.js` (`drawOverlays` and the play screen). Imports: play → roll, strip, common; roll →
  strip, common; strip → common (no cycle). The canvas palette is tokens since DRAW1b (`src/palette.js`, `cv('…')`; `FX_META[].col` names a token).
- (before DRAW1, all in draw.js) — canvas: video background, overlays, roles, grids, palette, FX bars, status, `noteLbl` (the ONE label function), the
  editor (`drawRoll`, snapshot `rollView`, `rollAxis`), the strip and arrangement window (`drawLooper(full)`, snapshot `loopView`).
- `src/ui.js` — menus, buttons and handlers: panels, role buttons, split, camera, clip buttons, backing, pointer routing, effects panel,
  hand functions, the editor shell, arrangement window, tutorial helpers.
- `src/main.js` — composition root: `onHands(f)` (one processed camera frame: `syncViewRect` → `processHands` at once → keep its picture
  as `shown` → `latHands`), `loop()` (every screen frame: `pollFrame`, the shown snapshot (or the live video), overlays, `captureFrame`,
  `latFrame`; each distinct error printed once; `latIdle` in the editor/window branch), the start card's `.busy` pulse, `startApp()` (the one start path; calls
  `latStart`), editor/window branch, `?probe` loading (`window.P`, `window.R`, `window.U`).
- `src/core/` — the pure CORE (stage-3 target; no DOM, Web Audio, camera or network; runs in node; rule #36). FMT1: `core/format.js` — the
  file envelope's version rules (`FORMAT_VERSION`, `MIGRATIONS` — one pure step per version, none yet — `upgrade(rec)`: older → migrated
  copy, NEWER refused in words), the scale-data validators (moved from scaleload); `core/registry.js` — id spaces (`USER_ID`, `BUILTIN_ID`,
  `PACK_ID`, `idSpace`; «u.» reserved), `newUserId`, `createRegistry(kind)` (add / hide / show / remove — built-ins never — / rename / the
  person's order). TIM1 (audio.js): every timbre entry's `id`, `timbresOf(role)` → `[{id, idx, name}]` in the registry's order (hidden left
  out), `timbreIdOf(role, idx)`, `timbreById(id)` → `{role, idx, entry}`, `timbreReg(role)`. `core/handsched.js` (LAT2): the SEARCH
  SCHEDULE — `HAND_SEARCH_EVERY` 3, `schedPlan`/`schedAfter`/`schedRetry`/`schedRun`, policies '2s' (default) / '2' / '1' (see "Hand
  detection"). `core/latency.js` (LAT1; LAT2: `MP_LINE`, `handToSound` part `transfer`):
  `makeMeter` (ring of `LAT_N` 240 samples per stage), `statsOf` (mean, nearest-rank p5/p50/p95, jitter = p95 − p5, max), `handToSound`
  (camera + detection + gestures + ½ audio block + base + output; unknown parts listed in `missing`), `looksBluetooth` (`BT_MS` 100 or
  `BT_LABEL`); LAT1b `frameWaitMs` (½ frame), `withFrameWait`, `perMinute`, `splitLongTasks` (startup = before camera start + `STARTUP_MS`
  10 s / playing = last minute), `isSoftwareGL`. `core/camlight.js` (LAT3): `LOW_MODES`/`LOW_TARGET` (15/24/24 fps), `lowConstraints`,
  `exposureSupported`/`exposureUnits` (1/40 s in 100-µs units, clamped, snapped), `lowVerdict` (kept at ≥ 90 % of the target or +25 % =
  'partly'; exposure also needs 'manual' in the settings), the hint decision `darkNew`/`darkStep` (`DARK_FPS` 12, `DARK_MS` 3000,
  `DARK_GRANTED` 24, `DARK_WIN` 1000 ms; once per session, waits for «allowed»), the counter `lostNew`/`lostStep` (`LOST_MS` 1000), `capsText`.
  `core/dsp.js` (SND-F1): `seeded` (mulberry32), `FOREST`/`forestIR` (the Night forest IR,
  seeded per channel, any rate), `irNormScale` (the Web Audio spec's convolver normalisation, applied by us), `f32Hash`, `compCurveDb` /
  `compGainDb` (soft-knee curve), presets `DYN_GLUE`, `DYN_LIMIT`, `dynCoef`.
- `src/engine/worklets/dyn-worklet.js` — SND-F1 dynamics processor `'dyn'` (mode `comp` = Glue: stereo-linked, soft knee, branching peak detector in dB,
  makeup; mode `limit`: instant attack, release, ceiling; `on` = exact bypass with a 10-ms crossfade; all k-rate). Zero lookahead,
  deterministic; imports `core/dsp.js`. Loaded on the live context and, in a track render, only when the chain holds Glue. SND-F1b: the
  limiter holds its peak `hold` seconds before releasing (bass distortion 8 dB over the ceiling: 55 Hz −47 dB vs −27 without hold) and,
  with `report`, posts its reduction every 50 ms. `core/latency.js`: `handToSound` has a `graph` part (the master path's delay,
  `audio.masterDelayMs()` — 0 with our limiter) and `rateOf` (delivered / processed frame rates).
- TIM3a (RUN 4): TIMBRES AS DATA, part 1 (chord + bass). `data/timbres/<id>.json` — one record per timbre `{format:'handsong/timbre', version:1,
  id, family, engine, name, recipe, env:{att, rel}, policies:{voiceMode, glide, register, quant}}` (the source of truth, user answer T4) +
  `data/timbres/index.json` (the menu order); `tools/timbre-bundle.mjs` builds `data/timbres.bundle.json` (GENERATED — never by hand;
  `--check` = bundle equals files); `src/core/timbre.js` (pure) — `checkTimbre` with the T5 SAFETY bounds (`TB`: level ≤ 0.5, gains ≤ 1,
  cut-offs 20…20 000 Hz and the filter envelope ≤ 24 000 Hz, ratio 0.25…8, detune ±100 ¢, ≤ 8 partials with gains summing ≤ 2, ≤ 64 nodes per
  voice, att/rel bounds, policies, names, ids; unknown fields refused; one line per refusal), `ENGINES` chord2 / tine / bass2,
  `TIMBRE_DAMAGES` (one CONTROL per bound). `src/timbreload.js` — top-level await of the bundle, each record checked (refused → skipped with
  one console line, never played), a family left empty → its embedded EMERGENCY record; deep-frozen, shared by both engine copies.
  `audio.js` `CHORD_INSTR` / `BASS_INSTR` are VIEWS over the records in today's entry shape and key order (`timbreView`); Firefly = engine
  `tine`, its partials drive `ffStrike(E, owner, f, amp, bri, parts, t)`; `CHORD_GLIDE_TC` 0.035 (`stages.js`, was a literal);
  `state.VOICE_MODE_DEF`; `live/record.gridFor` exported. Policies in every record = today's role values (T3), pinned by the row «TIM3a
  timbre records loaded, policies = role». Row «TIM3 timbres = before» (`src/probes/timbres.js`, quick): every timbre of every role — table
  entry (exact), node-creation trace of one voice (exact) and a 0.3-s render envelope (≤ 1e-5 of the peak window) = `tools/timbres.before.json`
  (`P.dumpTimbres()` on the code before TIM3; KS timbres render with the real worklet). Node row «TIM3 timbre records (core)».
- TIM3b (RUN 4): the 23 SOLO timbres are records too — engine types `subtractive` (`modules/timbres/subtractive.js buildSubtractive`: ig →
  optional lowpass {freq, Q} → oscillators {wave, mult, gain, detune} in recipe order, `strike` {open, tc, fv} = fstrike, `hum:0`), `fm2`
  (`fm.js buildFMBank`; `fixed:true` = no index strike — «Bell (FM)» folded in, T2 decided by the proof), `ks` (`ks.js buildKSBank` with the
  recipe = the old `KS_BANKS` entry; no worklet → `buildKSFallback`). `buildLeadBank(E, rec, pre, hum, vib, shim)` dispatches by
  `rec.engine`; `audio.js` `LEAD_REC` (records by position), `LEAD_INSTR` = view {id, label, att, rel}, `leadIsKs(i)` (KS by engine;
  `leadCap`, `render.usesKS`); `LEAD_KS_FROM` kept (computed) for old readers. `buildLeadBanks` and `KS_BANKS` are GONE. Validator: the
  solo engines' bounds (≤ 8 oscillators, gains ≤ 2, mult 0.25…16, filter Q ≤ 30, strike envelope ≤ 24 000 Hz, FM ratio / index / tau, KS fb
  ≤ 0.998, ≤ 8 sympathetic strings with Q ≤ 100 and gain ≤ 0.5, body ±24 dB).
- TIM3d (RUN 4): the person's OWN timbres and song copies. Song file version 6 (`core/songfile.js`; migration v5 → v6 marks old copies
  `legacy:true`): `timbres[id]` = the full RECORD of every timbre that has one (`ENV.timRecord` → `audio.timbreRecord`); kits (until TIM3c)
  and legacy copies keep {role, name, def}. `timbreload.js`: the person's own records (user store kind 'timbre', `u.<uuid>` / pack ids) load
  after the built-ins through the same validator; `timbreAddSession(rec)` = the ONE safety door for records added in a session (T5 bounds;
  refused → one line, never played); `timbreAll()`; probe control `timbreCheckDbg`. `audio.js` `timbreInstall(rec)` (+ `timbreSync`, run by
  `renderReset` so the render copy follows), `timbreRecord(id)`, probe `timbreForgetDbg(id)` (leaves the pickers; the table entry stays so
  events keep playing — positions are the session handle). `song/file.js songTimbreNeeds(rec)` lists the record copies of ids this app lacks;
  `ui.songOpenText` installs them (session), refused ones play as the role's stand-in (named in the toast `song.timRefused`, the reason in the
  console); `#songKeepTim` «Keep in my timbres» → `ui.songKeepTimbres()` → user store (loads at the next start). The legacy «equal settings →
  mapped» path stays for v5 copies. Rows: «TIM3d own timbres and song copies» (quick; CONTROL `timbreCheckDbg(true)`); the census and «TIM3
  timbres = before» count built-ins only. `data/songs/triphop.json` renewed to v6 (identical but `saved`, `version`, timbre copies).
- TIM3c (RUN 4): the five KITS are records (engine `drumkit`, no env): six rows `{synth, vm, …params}`; the row synths stay code in
  `modules/timbres/drumkits.js` (`kick snare clap hat tom crash` = the old Standard branches, now named; `dum tek edge baya na tick gong taiko
  ka` = the old hit functions; `SYNTH` table); `drumVoice(E, i, vol, rec, t)` plays row i of the kit RECORD (`audio.js DRUM_REC`;
  `DRUM_KITS` = view {id, label}); the old per-kit dispatchers are gone. Validator: `KIT_SYNTHS` (allowed parameters per synth), vm 0…2,
  frequencies 20…20 000 Hz, durations 0.005…5 s, FM ratio / index; exactly 6 rows; a kit has no env. Policies: quantise 'sub' (1/subdivision).
  Emergency records now for all four families. Kit copies in song files are records too (`triphop.json` renewed again).
- ENG2 (RUN 4): `src/core/engclass.js` (pure) — `engClass` (PROVISIONAL power class high/mid/low/unknown from the benchmark factor, the
  detection time and software graphics; decides NOTHING — user answer E1), `ENG_THRESH`, the benchmark cache (`benchOf`/`benchText`, key
  `handsong.engBench`, per user agent), `dropRate` (dropouts per minute from a cumulative counter, null under 10 s). `audio.js` readouts
  `engVoices`, `engLevels({roles})` (per-role analysers built on the first request only), `engLoad` (`playbackStats` / `playoutStats`,
  `renderCapacity`, feature-detected). `render.js` `engBench` (the reference light scene for 1 s through the render copy, worklets stubbed;
  once per device, ≥ 20 s after start in an idle moment, never while recording, a render is queued or the watcher is paused — so never in a
  runner session) and `R.engine()`. The latency meter adds «Audio dropouts: N per minute» (or «not reported») and «Power class
  (provisional, changes nothing)»; keys `diag.drop*`, `diag.power*`, `diag.cls.*`.
- `src/latmeter.js` — LAT1 latency meter, browser side (UI-level; owns `#latDiag`, `#latWarn` and the Sound-panel toggle `#latOn/#latOff`):
  `requestVideoFrameCallback` (captureTime, presentationTime, presentedFrames → camera fps and «picture taken → app»), per-frame stages
  (LAT2: `latHands` per processed frame — `camera` = capture → detection start, `detect` (+ `detTrack`/`detSearch`), `transfer` (worker),
  `gestures`; `latFrame` per screen frame — `draw`, `loop`; `sameFrameAgain` = the pump's repeats, always 0), audio every 500 ms (`baseLatency`,
  `outputLatency`, `getOutputTimestamp` → `pipeline`), long tasks (PerformanceObserver, last minute); `latReport`/`latText`, console
  `R.latency()` (render.js), «Copy» copies the shown text only; Bluetooth warning once per output device (`handsong.btWarned.<label>`,
  4 s after start and on `devicechange`). Probe-only `latCount`, `latPauseDbg`. Measures only — changes nothing it measures; sends nothing.
  LAT3: the report and Copy text add the camera's name and capabilities (`capsText`), the low-light switch's outcome, hands lost per minute
  (`lostStep` per processed frame), when the longest startup task began relative to the camera start (`maxAtMs`, < 0 = behind the start
  card); switches `swLowOff/swLow15/swLow24/swLowExp` (the last hidden unless `exposureSupported`); the PLAYER HINT `#darkHint` «Too dark»
  (key `lat.dark`, en + ru): `darkStep` on every delivered frame (frame timing only — rule #33), shown once per session, not while
  recording, a clip, the editor or the window (hidden when one starts), auto-hides after 9 s, taps pass through it except its OK; probe-only
  `darkDbg(times, granted)`, `darkHideDbg`, `latLostDbg`.
- `src/render.js` — render context, seeding and track render behind freeze (see "Freeze"): one engine copy per session
  (`'./audio.js?render…'`, ⛔ never a unique specifier per render), `renderTrack`, `freeze`, `renderQueued` (ONE render at a time; ⛔ no
  third door, never await one render inside another), console `R.*`, ear tools, probe bodies.
- `src/songs.js` — demo songs (`P.song(name, {replace:true})`; today `triphop`); refuses while recording, playing, with the editor
  open, or on a non-empty song without `replace`. SONG2 (RUN 3): a demo song is a FILE `data/songs/<name>.json` (the song-file format)
  opened through `ui.songOpenText`; the code generator stays a probe tool (`songBuild`; `P.dumpSong(name)` writes the file's text on
  unchanged code); row «SONG2 demo song file = its generator» (P.all; ids and take numbers aside; CONTROL a changed volume).
- `src/scaleprobe.js` — the browser probe (`P`), since PROBE1 a FACADE: explicit re-exports of `src/probes/<area>.js` (`run` P.all/P.quick/
  orderCheck/material, `tuning`, `seed` P.seed/P.song + write path, `edit`, `history`, `window`, `freeze`, `files`, `key`, `lat`, `detect` (LAT2), `gold`, `hand`,
  `sound` (SND-F1), `guard` api/lock, `kit` shared helpers, `data` the node rows). ⛳ **Rows register themselves** next to their probe: `probes/rows.js`
  `row({ at, name, run, read, slow?, drawn?, realtime?, song?, node? })` (order by `at`; the pre-PROBE1 order = old position × 10),
  `family({ at, name, rows })` for generated rows (module contracts); `rowProblems()` (duplicate names/places, bad shapes) counts as
  differences in P.all and the data runner (CONTROL: a duplicate name must be caught). A new row = a `row()` call in its area file, nothing
  else. `src/probedata.js` + `tools/probe-data.mjs` — the node-runnable part (imports only scales/state/i18n); the data runner runs the
  registry's `node` rows (`probes/data.js`) plus LIC1 and LAT1 core. ⛔ Nothing touching draw/ui/audio/recorder/userfiles goes there.
- `tools/check-licences.mjs` + `tools/licences.json` (LIC1 licence register and its checker; `THIRD-PARTY-LICENSES.md` generated),
  `tools/lex.mjs` (the comment/string lexer shared by both checkers),
- `tools/check-static.mjs` (static checker), `tools/probe-browser.mjs` (browser runner), `tools/scales.before.json` (F0 snapshot),
  `tools/song.print.json` (TF0 song sound fingerprint of the seed), `tools/gold.print.json` (GOLD1 golden renders),
  `tools/gesture.print.json` (HAND1 gesture fingerprint).
- Stale (removed) names to ignore: list in `docs/NAME-INDEX.md`, "Stale names".

## Architecture (full reasoning per section: archive, same titles)
Two clocks in `main.js` (LAT2): each new CAMERA frame → detection (vision.js pump, the search schedule) → `processHands()` at once
(gestures drive audio); each SCREEN frame → the detected frame's picture → `drawOverlays()`. The recorder thins ~60 engine calls/s into a
few intent events per note.

### Hand detection (LAT2) — each frame once, a cheaper search, main thread or worker
- **Two models** (handdet.js): L2 (numHands 2) palm-searches the whole frame on every run while it tracks fewer than two hands (that is
  why two-hand mode cost 75 vs 54 ms on the user's desktop); L1 (numHands 1) tracks one hand by landmarks alone. `setOptions({numHands})`
  per frame was measured and rejected (≈ 1 s graph rebuild per switch, tracking lost).
- **The schedule** (`core/handsched.js`, policy '2s'): both hands tracked → L2 every frame; one → L1 every frame and L2 (the search) on
  every `HAND_SEARCH_EVERY`-th processed frame; none → L2 every 3rd frame, nothing between ('skip'); a second hand found → L2 from the
  next frame; a tracking run that lost every hand retries the search on the SAME frame. Measured with real hands on the user's GPU (Intel
  HD 4000, the runner's headless Chrome uses it; MediaPipe's sample photo, measurement only): one hand 75 → 53 ms per frame (track 42,
  search 75), none 35 → 12, two hands 80 unchanged; jitter of a still hand unchanged. ⛔ Two hands stay tracked everywhere (user decision).
- **Main thread vs worker** (LAT2b): same frames → bit-identical landmarks (12 of 12, sample photo). But WebGL inside a worker is slower on
  this GPU (plain JavaScript is not): one hand 98 vs 53 ms, two 160 vs 80 — so the DEFAULT is the main thread; the worker is the test
  switch «Detection runs in» and takes no main-thread long tasks. Decide again on phone numbers (HANDOFF open check).

### Screen model — one layout, optional split
- Single role: `phoneInstr` ('ld'/'ch'/'bs'/'dr'), cycled by `instrBtn`; what each hand does comes from `handFn`.
- Split (`splitOn`, landscape only: `canSplit()=innerWidth>innerHeight`): left = `SPLIT_ROLES[0]`, right = `[1]` (`instrBtnL/R`);
  ZONE = instrument (either hand plays the half it pinches in); inside a half by POSITION; hand functions per half by role; each half
  its own register band (`setRectOctReg(S.role,…)`). Rotation to portrait auto-disables split (`softAllOff`), no auto re-enable.
- Frozen at capture: `S.role`/`S.rx0`/`S.rx1` from the half `px` lands in (a margin pinch clamps to the nearest edge).

### Gesture model
- Pinch = thumb (4) near a fingertip (8/12/16/20), normalised by hand size; the pinched finger (`S.oct`) picks the register I…IV
  (switchable mid-pinch = 20 ms glide) — in rectangles it picks the note in the rectangle instead.
- Multi-finger (melodic role in POLYPHONIC mode): each touching finger sounds its own note (up to 4 per hand, 8 total);
  `touchedFingers()` with the same `PINCH_ON`/`PINCH_OFF` hysteresis; `S.order` keeps the first-pressed finger primary (position,
  zone, volume, depth); per finger `S.fing[f]={deg,oct,slot}`; ceiling `state.pinchFingers` (1..4, default 4; ONE number for solo and
  bass); at ceiling 1 (and theremin) the owner key carries no finger number (keeps the mid-pinch glide). LEAD mode: one note, nearest
  finger wins. Chords and drums are single-finger; theremin is one note per hand. If ring/little fingers fire falsely, lower the
  ceiling ("Fingers per hand"). The temporary pinch diagnostic is deleted — don't reintroduce it.
- Y = degree (`degHyst`); X = volume (0 at the far left = silence, 1 = old full level; heard as v²) over the hand's frozen range
  (`[palSplitX(rx0,rx1), rx1]` in a typed-chord role, else `[rx0,rx1]`) — the chain's Volume entry, movable to a finger or Fixed; a
  parameter on `play:x` moves TOGETHER with volume. Z = depth `dist(lm[0],lm[9])` (`REV_NEAR`/`REV_RANGE`, historical names), address
  `play:z`; by default the chord chain's brightness listens; volume may too (VOL-4, per hand, nearer = quieter, `inv` flips).

### Camera frame margin — cover fit; RAW vs REMAPPED coordinates
- `config.coverView(vw,vh,W,H,M)` → the centred sub-rectangle with the canvas's aspect (cover, no stretch), inset by `CAM_MARGIN`; computed
  once per frame in `drawVideoBackground`, used as `drawImage` source AND written to `state.viewRect` for `sx`/`sy`. MediaPipe always
  gets the FULL frame. Default `viewRect` = `[M,1-M]²` (= `remapAxis`). Long axis keeps ≥ 12 %; portrait phone + landscape sensor shows
  only the central strip (inherent to cover). RAW coords drive all gesture math; REMAPPED drive position/hit-tests (rule #12).

### Camera switching & mirroring
`camFacing` + `mirrored()` + `flipX` are the single source (front mirrored, back not); `🔄` re-acquires the stream on the SAME `<video>`
(landmarker kept); failure rolls back with a toast.

### Which hand drives depth
`noteHandRole(key,S,W)` returns the hand's role when it is solo, bass or drums AND plays notes; the depth writes into that role's chain;
chords drive depth inside their own branch. Depth is smoothed exactly once per hand per frame (`depthOf` → `emaS(S,'hs',…)`, memo `S.hsF`
cleared where `processHands` begins a hand); readers: effects hand `z`, chord branch, depth block, volume on depth. Both depth loops skip
the Volume entry. With no playing hand in frame nothing is written (no snap to zero). `handHalfRole`: single-role `phoneInstr`; split —
frozen `S.role` when pinched, else the live half under `lm[8]`.

### Rect model — note layout (switchable: `state.rectPref` 'auto'|'rect'|'rows')
- `scales.rectGrid(s) = rectEligible(s) && (rectPref==='auto' ? !!s.rectGrid : rectPref==='rect')`; the scale's `rectGrid` is only its
  default; `'auto'` must stay the default. Every scale is eligible today (the "unavailable" UI branch was removed).
- `rectLayout(s)` (memoised): `k` = first of [4,3,2] that divides (dup=0 tried before dup=1); `dup` = tonic repeated at the period
  boundary (alignment, not equivalence — no `periodOf===2` gate; the duplicated slot labelled `Т` is true for BP, an overstatement for
  Carlos); `block=iv.length+dup`, `perOct=block/k`, `octaves=clamp(floor(RECT_MAX/perOct),1,REG_N)`, `rects=perOct*octaves`,
  `hasReg=octaves<REG_N`, `regBands=hasReg?1:0`, `bands`, `notes=rects*k`; `REG_N=OCT_ROMAN.length` (4), `RECT_MAX=12`. Idle fingers
  beyond `k` play nothing.
- Table (notes → k, dup, rect/oct, octaves, bands): 5 → 3,1,2,4,8 · 6 → 3,0,2,4,8 · 7 → 4,1,2,4,8 · 8 → 4,0,2,4,8 · 9 → 3,0,3,4,12 ·
  11 → 4,1,3,4,12 · 12 → 4,0,3,4,12 · 13 (BP) → 2,1,7,1,7+1 · 19 → 4,1,5,2,10+1 · 20 (gamma) → 4,0,5,2,10+1 · 22 → 2,0,11,1,11+1 ·
  31 → 4,1,8,1,8+1 · 43 (Partch) → 4,1,11,1,11+1.
- Slot ↔ note: `rectNoteAt(g,base)` → `{deg:g%block, oct:base+floor(g/block)}` with `g=rect*k+finger`; inverse `rectSlotOf` (highlight).
  Event format untouched (`deg ∈ [0,iv.length]`, `oct ∈ [0,REG_N-1]`).
- Register band (band 0, bottom) exists only when `hasReg`; it shifts a window of `octaves` periods (`rectBase`/`rectBaseMax` clamp;
  `drawRectOctBand` lists `rectBaseMax()+1` bases); pinched by position (`'oct'` zone, silent; in chords right of the palette only when
  `typedChords`). Bands are equal — don't special-case heights.
- Chords: rect applies to the ROOT grid (right of the palette for typed scales, full range otherwise); type from the palette.
- The finger legend runs LOW at the bottom (row drawn at `NF-1-n`; mapping unchanged). Labels follow the SCALE (`noteLbl`); when
  `octaves>1` the legend drops cents and gains a per-band register marker. 31-TET and Partch are byte-for-byte as before; 19-TET and
  Carlos gamma deliberately changed (2 octaves, 10+1 bands, a 2-octave window).

### Hand functions (`state.handFn`, options in `ui.HANDFN_OPTS`)
- `ld`: fx/note/hold/therm/expr/loop · `bs`: fx/note/hold/therm/loop · `ch`: fx/latch/hold/loop · `dr`: fx/hit/loop.
- `'fx'` — effects hand (all roles): fingers drive the chain parameters addressed to them; bars at the role's right edge, no gate on the
  hand. `'note'` — continuous notes. `'hold'` — note frozen at the first pinch frame (`S.deg`/`S.oct`, finger change gated off), volume
  still follows X, stops on release. `'therm'` — continuous pitch (solo AND bass; `thereminSpan`/`thereminHz`, linear in cents; bass Hz
  `/4`; additive centre-line overlay `drawThereminLines` when `roleHasTherm`); live-only `live` option; the recorder stores the nearest
  step (+ solo `a.bend` cents curve). Chords: `'latch'` (default; keeps ringing; same-degree re-pinch off, other degree glides; jam and
  split depend on it) / `'hold'` (stops on release via `WchOff('latch')`). Drums: `'hit'`. `'loop'` — looper hand (all roles). `'expr'` —
  expression hand (solo only).
- UI: «Hand functions» section (`renderHandFn`), rows per role in play (`noteRolesInPlay()`), change → `setHandFn` + `softAllOff`.

### Voice modes — solo and bass are one melodic instrument, played two ways (V1–V4b; branch closed)
- `state.voiceMode` `{ld:'poly', bs:'lead'}` (defaults = old behaviour). POLYPHONIC: each hand/finger owns a voice under
  `liveKey(role,hand,finger)` (`'lead:L[:f]'`, `'bass:L[:f]'`); `S.snd`; no hand-over. LEAD (mono, legato): one voice per role under
  `monoKey(role)` (`'bass'`, `'lead:M'`), owner `monoOwner[role]` = last pinch; `endPinch` hands back to a still-pinched hand
  (`otherPinched`); the watchdog releases when the owner left. Gestures branch on the MODE (`polyZone`/`leadZone`); sound and recording
  via `wOn`/`wOff(role, own, …)`.
- Switching (`ui.pickVoiceMode`): `softAllOff` then `gestures.voiceModeReset(role)`; a held pinch plays the new mode next frame. A mode change
  mid-take stays in the SAME track (source = role + timbre + view).
- Code MIRRORS, not merges: bass keeps its own voice builder and register (`bassFreq` two octaves below solo). Bass pool lazy up to
  `BASS_POOL_N`=12; bass recording per owner (`recBass` Map, slot `a.v` written only when non-zero).
- Glide: an engine argument (`setFreq(f,tc,t)`; `glide` before `when`); voice module `glide` (4–800 ms, log; `defBy` 20 ms solo, 12 ms
  bass; not in any default chain); a note carries `a.fx['glide:time']`. ⛔ Glide only on a legato move of a sounding voice: a fresh attack
  SETS its pitch; theremin frames and bend points never receive it (their 20 ms is tracking smoothing); theremin notes don't record it.
  Allowed in poly mode too. Retrigger in lead mode is deferred. Accepted cost: in poly bass mode live hands (up to 8) and bass tracks
  share 12 voices.

### Typed chords — the palette
`typedChords` scales split the chord role: left = palette of types (columns = families, rows = variants; `chordFams()`, `palColX`/
`palRowY`), right = note rows. Selection by POSITION on a thumb+index pinch left of `palSplitX` (`S.oct===0`), sticky, both single-role
and split (one gate). Two-axis hysteresis `cellHyst`. Latch identity = (degree + register + type). Octave: finger (non-rect typed scales)
or the octave rectangle (`chordOctReg`, rect typed scales).
Sets (`CHORD_FAM_SETS`): `'chrom12'`, `'edo19'`, `'edo31'` — integer steps in that edo; `'partch'` — 11-limit ratios (О otonal / У
utonal / Диез 7-11 / Станд.; in "As on the instrument" a type is offered on a root only if every tone lies in the 43 pitches —
`chordTypeFits`; greyed with `pal.unfit`; since F8 a pinch there sounds the ROOT ALONE via `chordAtRoot` → `chordUnit`, tag
`tag.rootOnly`/`tag.typeNotOnRoot`; never nearest-pitch substitution; only 1/1 offers all 24 types; 21/20, 11/10, 14/11, 11/7 none);
`'bp'` — BP 3.5.7 ratios (15 chords incl. three with 11; period branch; "Free", default); `'bpsteps'` — BP in its own steps (12 types,
0–13¢ off; no 11; "As on the instrument"); `'nat'` — 24 types as 5-limit ratios (mobile Natural, adaptive); `'natfix'` — 24 types as
semitone offsets for fixed-grid scales (Pythagorean since P2, Natural-fixed preset, meantone, three well temperaments). `'pyth'` is gone.

### Behaviour properties (prefer these over tags/indices)
- ⛳ **Scale-panel principle (F6b):** every scale-panel switch appears from the MODE'S DATA, never from code (today: chord modes via
  `chords.modes`; "tuned from" via `anchor.policy:'choice'` → `tunable` → `ui.renderTunedFrom`).
- `noChords`; `typedChords:'<key>'`; `cents:[…]` (non-equal); `period:<n>` (BP 3, Carlos 3/2; never hardcode `2`); `gridChords` (chords
  read from the fixed cents grid); `fixedKey` (tonic is a key within an anchored grid); `rectGrid` (layout DEFAULT only); `tunable`
  ("tuned from"); `chordModes` (T7b; data `{id, nameKey|name, hintKey|hint, over}`, first = default; `over` laid on the view; choice in
  `state.chordModeSel`, read only by `chordModeOf`/`scaleView`; row of buttons `#chordModeRow`, one per mode, 1..8 — `scaleload.CM_MAX`;
  part of the frozen VIEW; a change starts a new track (`viewIdOf` adds `#mode`); a seam like the tonic (`softAllOff`)).
  `supportsProgressions()` = the mode's `progressions` field else 7 degrees (and `refreshProgAvail` also needs `supportsChords()`).
- ⛳ **User principle (T7b): don't narrow musical possibilities** — when theory restricts, offer it as a MODE.
- **F7 — one Just intonation** (`just-intonation`, index 58): "tuned from" (`anchor:'choice'`, follows the tonic by default;
  `anchor.followHint`) + chord-mode set `justIntonation`: "Free" (`{build:'adaptive', palette:'nat', naming:'ordinal'}`) / "As on the
  instrument" (`{build:'tuning', palette:'natfix', grid:true}`, naming `notes12`). Override whitelist: build, palette, rule, grid
  (→ `gridChords`), naming (→ `degNaming`). Aliases in the mode file (`aliases:[{id, tunedFrom?, chordMode?}]`): `scaleById(oldId)`,
  `viewOfId`, `applyScaleId`; old `ji-adaptive`/`ji-fixed`. ⛳ A mode EQUALS its default chord mode (`scaleload` refuses otherwise;
  `P.checkBare()`). Snapshot comparison keyed by id for modes/views/chord modes; the menu stays positional.

### Music theory & pitch
- 74 scales (0..73). Six menu sections by SOUND (`TRADITIONS`): `common` «Привычное» (diatonic, modes, ethnic, pentatonics/blues,
  SYMMETRIC scales — whole-tone/octatonics/Messiaen are ordinary 12-TET —, exotics, world pentatonics, Japanese), `mideast` (Arabic
  maqamat, 24-TET), `india` (22-shruti grid + ragas), `easia` (gamelan Slendro/Pelog + patets, Far-Eastern pentatonics), `europe`
  (chronological: Pythagorean → Just intonation → meantone → Werckmeister III / Vallotti / Kirnberger III), `exp` (bounded by TUNING:
  19/31-TET, Partch, Bohlen–Pierce, Carlos α/β/γ). A new scale goes where its culture/sound belongs; never a generic "other" bucket.
- Indian: 22-shruti JI grid (min step 22¢) + 10 ragas picking 7 swaras; all `noChords`; labels via the tuning's naming list (`listLbl`):
  full grid «свара · шрути», ragas swaras only; the swara sits on the LAST shruti of its group (tonic «Са · Чхандовати»). A raga is more
  than a scale (not modelled); Kafi and Malhar share a scale by design.
- Tail index map: 50 BP · 51/52/53 Carlos α/β/γ · 54/55/56 Pelog patets Lima/Nem/Barang · 57 Pythagorean · 58 Just intonation · 59
  quarter-comma meantone · 60 22-shruti grid · 61..70 ragas (Bhairav, Yaman, Kafi, Bhairavi, Todi, Khamaj, Asavari, Malhar, Purvi,
  Marwa) · 71 Werckmeister III · 72 Vallotti · 73 Kirnberger III.
- Pitch three ways: equal `P^(iv/edo)` (`P=periodOf`); cents overlay `2^(cents[i]/1200)` (+ top 1200¢; `edo`/`iv` = nominal structure);
  non-octave period (`P^oct`, `P^(step/edo)`, `pc=1200·log2(P)`).
- **Chord pricing — `chordNotes`, four branches in this gate order (don't reorder):** (1) `cents && ty && gridChords` → fixed grid
  (semitone offsets read from the cents grid; pure/wolf spread); (2) `cents && ty` → pure ratios from the root (Partch, mobile Natural;
  its fixedKey sub-branch has no user); (3) `period≠2 && ty && chordBuildOf==='adaptive'` → period-equal ratios (BP "Free"); (4) fallback
  integer path (typed steps add to the root; untyped by the mode's `chordRule` via `ruleChordSteps`: tertian, `stack` — every other mode
  degree, the 14 pentatonic/blues/Japanese modes —, `ratios` (19/31-TET), `power`, `palette`, `none` = no chord). `chordUnit(s)`: `[0]` for
  branches 1 and 4, `[1]` for 2 and 3 (BP "As on the instrument" `[0]`); a new branch adds its line there. `chordBuild`: `'adaptive'` (pure
  ratios, pitches shift per chord, a choir) or `'tuning'` (the tuning's own pitches) — `chordBuildOf` (absent ⇒ 'tuning'). Step sets
  only for their own edo; ratio sets only for cents scales or adaptive builds.
- Seventh (`seventh`): "Sevenths" disabled with a one-line reason where it only doubles the root (`scales.seventhAddsNote`: blues, major
  blues, whole-tone, Prometheus); the choice is kept.

### Reference pitch (`aRef`) — one source
A4 in Hz (default 440, UI 380–480 via presets + clamped input). `a3()=aRef/2` → `baseF(s)` and `cFix(s)` (TF1: both take the view and
read its key through `viewKey`); changes retune everything live (solo, bass, chords, drone, theremin, replayed layers).

### fixedKey — the tonic is a KEY in an anchored grid
The six (Pythagorean, Just intonation preset "from C + As on the instrument", meantone, Werckmeister, Vallotti, Kirnberger): grid nailed to
an anchor (`anchorOf` — C for five; Pythagorean's "tuned from" choice), `cFix(s)` its pitch (an octave down if above the tonic), `keyOf(s)`
the tonic's offset; every fixedKey branch of `leadFreq`/`bassFreq`/`chordNotes`/`centsOf`/`tonicFreq` goes through them (`fixedSlot`).
"Tuned from" (`state.tunedFrom`, 'T' default or 0..11, `setTunedFrom` + `softAllOff` + `updScaleBtn`): only for `tunable`; `CUR()` =
memoised variant per anchor, so each event freezes its anchor; moving the selector retunes nothing recorded; enters the freeze key's
pinned fields and the render's pin list. Panel: the five C-tuned show «Tuned from C (historical practice)» (`#tunedFromNote`,
`panel.scale.tunedFromC`); Pythagorean shows the selector (`#tunedFromRow`/`#selTunedFrom`, `#tunedFromHint`, button «· from X»). Labels
are real note names. Werckmeister's major third ≈ 390¢ in C, ≈ 408¢ in F#. Pythagorean chords read from its own grid (`natfix`,
`gridChords`; user: "must sound like the Pythagorean tuning"). Mobile Natural stays mobile.

### Scheduler — look-ahead is a hard invariant
Chord/bass/drum track events are scheduled at exact times `loop.t0 + (ev.t + off)*spb` inside `SCHED_AHEAD` (≈ 300 ms), tick
`SCHED_TICK_MS` 25 ms; `off` = whole-pass offset when the brace cycles. Live `W*` calls pass no `when` (= `AC.currentTime`). Solo and drone
fire "almost now" through `fireNear` over `(loop.pos, p]` (moving them into the window would be an audible change nobody made). Cost is
bounded by the window: both loops walk a sorted prefix from cursors (`curSched`/`curNear`, `cursLowerBound`). `startTransport` schedules
the FIRST window synchronously. The window masks main-thread blocking, it doesn't remove it. Accepted: drum hits already scheduled play
after stop/panic/mute/delete/jump; surviving tracks may drop out up to one window after undo/`clearJam`.

### Metre & accent grouping
`loop.metre` (seed `BEATS_PER_BAR`, `setLoopMetre`, `METRES=[2,3,4,5,6,7,8,9,10,12,16]`), changeable only while the song is empty and
stopped (`refreshMetreCtl` disables the control). No denominator by design (7/8 vs 7/4 = tempo only). `METRE_GROUPS` (7=3+2+2,
9=2+2+2+3, 16=4×4) + `METRE_KHALI` (16→[2]) → `beatLevel(metre,b)` → accent levels 2/1/0/−1 for the metronome AND the strip ticks; khali
is a weakened head, not silence. `loop.sub` (`SUBS=[4,3]`) only sets live drum quantise and faint ticks (only when ≠4). Count-in is one
bar at any metre, counting in to the start point `loop.lead`. A pattern whose `beats ≠ metre` is skipped.

### Chord readout
While a live latched chord sounds, its root rectangle lists each note's Hz and cents above the root — read from the sounding voices
(`chordHold['latch']` → `latchChordFreqs`), never recomputed. Replayed chords keep the plain highlight.

### Chord brightness — the two-filter invariant
Hand depth → `bd` (0 near/bright … 1 far/dark) rides into `WchOn`/`WchSet` beside `ty`, recorded as `a.bri` (a `|Δbri|>REC_REV_EPS`
change alone pushes a `chSet`). Voice = `o1/o2 → f → fb → g` (`f` attack envelope, `fb` continuous brightness via `briToHz`; rule #19).
Brightness is the chain's `bright` voice module, seeded on `play:z` (removable, fixable, movable). ⚠️ An ABSENT `a.bri` means "not set"
(the filter opens at attack), not "take the live value" (backing chords never carried it). Bass and drums follow the same "absent = not
set" rule; solo alone keeps "absent MAP = live solo chain" (`applyFx` R2).

### Brightness on every role
`bright` declared for all four roles. Chords: `a.bri`. Solo, bass, drums: `a.fx['bright:amt']`. Solo/bass: a brightness stage per voice
(`audio.makeBriStage`): output = x + w·(LP(x) − x), w = 0 when unset or fully open (exact identity). Drums: a per-hit lowpass only when
set (`hitBus`). Ranges `audio.BRI_HZ`: solo 700 Hz–18 kHz, bass 100 Hz–4 kHz, drums 300 Hz–18 kHz. Solo/bass read at attack and follow
while held; drums at the hit. A newly added brightness takes a free effects-hand finger or Fixed, never the playing hand's depth by
itself. Cost: one biquad + two gains per solo and bass voice.

### Looper hand
Function `'loop'` on any role: index = record (`onRec`: into the armed track or a new one; again = stop), middle = play/pause, ring = undo
the last take, pinky = clear all after a `CLEAR_HOLD_MS` 3 s hold with a visible countdown (release cancels). Single-fire by structure
(rule #21). `doLooper` confirms by name (`setLooperMsg`) and says why when impossible («Nothing to play»/«Nothing to undo»/«Already
empty»). The transport buttons still work.

### Audio engine (`initAudio`) — five chains into one master
`master → limiter → destination`. Chains: (1) solo pool; (2) chord pool (2-osc voices, gain-gated; POOL1: grows on demand to `CHORD_POOL_N` 24); (3) bass
pool (lazy up to `BASS_POOL_N` 12, allocation like `leadAlloc`: free, new below the ceiling, steal released-first by oldest `tOn`;
voices record `deg`/`oct`); (4) drums (per-hit synths, `DRUM_KITS`: Standard/Darbuka/Tabla/Gamelan/Taiko, same 6 rows); (5) drone
(detuned saw pair, LFO-swept LP, root `tonicFreq(view)/2`; TF2: the VIEW OF ITS DRONE EVENT (`audio.droneUse` from `ENG.drone` and
`recorder.droneSync` → `droneViewNow`; none = the live view; from silence it takes its pitch at once, `dUp`); second string —
`scales.droneDegree` of that view: nearest 3/2 within
17¢, else 4/3 (octave tunings), else a seventh 15/8·9/5·16/9, else the tonic one period up; BP: the 5:3 degree (878¢) by default
(data `drone.withoutFifth` on bp13; ear switch `R.droneBP('cons'|'period')`); `droneRetune` re-pitches, never re-levels). Plus the
metronome (`metroClick(t,level)`, 4 levels).
- **Reverb = FDN** (`buildFDN`, numbers in `REV_A`; `makeIR`/convolver gone): 80 Hz highpass → pre-delay → 3 input allpass diffusers
  (`apStage`) → 4 delay lines (delay → damping lowpass → feedback gain), Householder mixing (one Σ node + one −2/N node) → stereo taps →
  `outTrim`. ~49 nodes. Real-time params: mix (sends; chord chain starts at `CH_REV_SEND` 0.12), decay (`setRevDecay`, RT60 → per-line
  `g_i=10^(−3·d_i/RT60)`), tone (`setRevTone`). ⚠️ The in-loop lowpass MUST stay at Butterworth Q (`REV_A.toneQ = −3.0103`): Web Audio's
  `Q` is in dB for lowpass, the default 1 dB gives a +1.96 dB peak → loop gain 1.11 > 1 → whistle at ~3.9 kHz. Compute the loop gain.
  Loops are wired with ONE entry (live and render since LR1/AF1; one builder `apStage`/`buildFDN`, no wiring argument): a node pulled
  twice in a quantum returns its previous quantum, so several entries cut the loop in a build-order-dependent place. ⛔ Don't bring the
  old wiring back; more space = a reverb parameter (BACKLOG §3.9b).
- **Effect modules** (`FX_FACTORY`, eight): `vol` (`kind:'voice'`, all roles, `perm`, seeded FIRST on `play:x`, raw 0..1 so `v01 === a.vol`,
  `note:{key:'vol', required:true}`, per-role default `volFromOld(role,0.8)` ≈ 0.894 solo / 0.922 chords / 0.927 bass & drums; hidden from
  add lists, `fxVoiceIdsFor`, lane addresses, `autChainOf`; `fxPerm`), `reverb` (`bus`), `bright` (`voice`, 4 roles), `glide` (`voice`,
  solo+bass, `readAt:'pitch'` → `fxNoteFollows` false), `dly` (`bus`), `trmMix` (bus tremolo, `insert`), `forest` (SND-F1 «Night forest»,
  `bus`: one ConvolverNode per instance, the seeded IR × our normalisation with `normalize=false`, return 0.55, `mix` = send, default 0.8 =
  the prototype; SND-F1b `room` = Short 0.85 / Medium 1.7 (default) / Long 3.4 s — log curve so 0/½/1 are exact, `pick` → the panel shows
  three buttons and the parameter starts «Fixed»; the IR is recomputed for each length (same seeds, own envelope), swapped at once on a
  change (not schedulable)), `glue` (SND-F1 «Glue», `insert`, `cat:'dyn'` → the add list's «Dynamics» group; the dyn worklet, identity gain where it is
  not loaded). A declaration carries `roles`,
  `attach:true` (per-note, `fxIsPerNote`), optional `note:{key,inv,roles}` (own event field, `fxNoteField`), `defBy`, `readAt`. Instances per
  chain-owner key, lazy, never torn down (`FX_INST[key][fxId]`, `fxInstance`). **The chain is SERIAL** (O-1): `fxChainIO(key, head)`;
  `fxResplice`/`fxRespliceSmooth` rebuild `head → fx₁ → … → tail → master` in chain order (connections only). A signal module carries its
  own dry/wet (mix 0 = identity sample for sample). Volume curve: amplitude = `volAmp(v)=v²` × the role's level; attack velocity via
  `volVel`; drums skip the hit at v=0. ⛔ `fxAttach`/`fxRoleBus`/`fxRoleOut` are gone. ⚠️ `fxPlayPath` (AUTO-PROBE): equal EFFECTIVE id
  lists (null = live chain) only record the path and close built effects outside it — no resplice (a needless resplice dipped the role
  40–100 ms and swallowed a track's first attack).
- **Solo is a POOL with owner keys** (`lv[]`/`leadHold`, `LEAD_POOL_N` 12 = 8 live + 4 headroom, `LEAD_POOL_KS` 8): live `'lead:L'/'lead:R'`
  (+`:finger`), `'lead:M'` in lead mode; replay `'leadloop:'+layer+':'+v`. A voice builds ONLY its own bank, lazily (`buildLeadBanks(preBus,
  ksOk, only)`); ⛔ never rebuild all banks. Per voice: bank → `satDry/satWet` (drive, before the envelope — tanh is non-linear) → `env` →
  `tg` → pan → `vol` → `trem` → `leadSum` (+ `makeBriStage`), per-voice vibrato and humanisation; values at attack from the note
  (`applyFx(a.fx)` → `pendFx`). Bus: expression stage → `leadOut` (chain head). Allocation: same owner → same voice; free voice with that
  bank built; any free; new below the cap; steal released first. Glide time `LEAD_GLIDE_TC` 0.02 s, bass `BASS_GLIDE_TC` 0.012 s (live
  and replay). An instrument change MORPHS a sounding solo note (20 ms bank crossfade); bass and chords bake the timbre at attack. A voice
  handed to a NEW owner cancels any scheduled curve (`v.handed` → banks' `cancel(t)`, S5).
- **Offline allocator (F2, `setOffline(true)`, render copy only):** voices carry `freeAt` (attack ⇒ ∞, release ⇒ the release moment
  itself — free from release, like live); no stealing offline (the pool grows; ⚠️ a frozen track may be fuller than live only where the
  live pool overflowed); no second note-pairing formula (`songNotes` is the only pairing). At `offline===false` every branch is the old
  code.
- **Synthesis paths** (a bank = `{gain, setFreq, cancel, strike?}`): (1) subtractive via `mkOsc` (vibrato + humanisation into `.detune`;
  velocity → brightness at attack only; `HUM_CENTS` 4; pads/organs `hum:0, det:0`; bass not pitch-humanised); (2) FM `buildFMBank({ratio,
  peak,sus,tau})` (modulator → carrier frequency; index envelope decays faster than amplitude; «Bell (deep)» 1.41, «Metallophone» 3.51);
  (3) Karplus–Strong `buildKSBank` (worklet `ks-string`; `KS_BANKS` params `fb`, `damp`, `exBase`/`exSpan`, `nl` jawari, `symp` tarab,
  `body`; «String», «Sitar», «Oud», «Koto», «Santur», «Guitar», «Pizzicato»; worklet failure → `buildKSFallback` plucks keep indices).
  Drums per hit `drumHit(row,vol,kit,when)` (tabla `tabBaya` pitch bend, gamelan inline FM `gmlFM`).
- **Voice starts:** `voiceBuild()`/`voiceStart(o)` scatter oscillator phases within one period (solo banks, FM modulators); chord and bass
  voices start their PAIR together (`voiceStartPair`, one delay per voice) — a scattered pair on one frequency freezes a cancelling
  offset. A fresh attack sets its pitch (time constant 0). ⛔ Don't change native waveforms to fix phase.
- **Random draws:** nine `Math.random` sites; the eight in `audio.js` go through `rnd()` (`setRnd`, only the render copy); ⛔ never patch
  `Math.random` globally (`liveRandomIntact`); the KS pluck is seeded only in track renders. None of this is recorded.
- Track level/pan stages: `tg` in every pooled voice (solo `env→tg→pan→vol`, bass `env→tg→pan→vol`, chord `g→tg→pan→bus`), set at attack
  from the owner key; drum hits a per-hit multiplier/pan only when ≠ default; drone `a.lvl ×` level, permanent pan. Pan law: L = √2·cos θ,
  R = √2·sin θ, θ = (p+1)·π/4 (centre exactly 1/1). Reverb input downmixed to mono (`hp.channelCount=1`). `recorder` installs the live
  lookups; ⛔ `renderReset()` only on the engine copy.

### Time, tracks and the recorder (slices S1…S3.5e)
Not a looper since S3.3: a linear song in absolute beats; looping = an optional brace. Names still say `loop`.
- **The event**, created in exactly two places, `push` and `loadArrangement` (the editor is a third, obeying the same law):
  `{t, layer, fn, a, sc, sev, tk}` (+ `jam:true` on backing). `t` absolute song beats ≥ 0, quantised at record time by `gridFor` (chords 1
  beat, bass ½, drums `1/loop.sub`, solo never); while the brace cycles `push` records the FOLDED song beat. `fn`: `leadOn/Set/Off`,
  `chOn/Set/Off`, `bassOn/Set/Off`, `drum`, `drone`. `a` = intent, never frequency: `ti` (TUNING INDEX in the event's frozen view, from
  `tuningIndexOf`; NO degree is stored since T4c-2) and `oct`, `vol`; solo `inst` (on `leadOn`; `leadSet` same), `tie` (a note continued
  across a timbre switch → 20 ms crossfade on replay), `v` (slot among notes open at once), `fx` (the note's effect map, COPIED), `bend`
  (theremin cents curve), `hold`; chords `inst` (on `chOn`), `ty`, `bri`, `k`; bass `inst`, `k`, `v` (non-zero only), `fx` (only when the
  bass chain holds a per-note parameter); drums `row`, `vol`, `kit`, `fx` (only when set); drone `lvl`; `k` = take/pass owner suffix
  (absent = 0); editor-only `sh`/`gen` maps per address `'fxId:pKey'`. `sc`/`sev` frozen view and seventh (rule #7); `tk` take number on
  every event (`takeSeq`, `curTake`; backing layers each their own).
- Frequency derived at play time (`recorder.evHz`; `leadFreqTi`/`bassFreqTi`/`chordNotesAt`); a replayed event without `ti` is not played
  (one warning). Replay goes through `ENG` directly and is never re-recorded (polymodality).
- **Two kinds of beat:** MONOTONIC `m = (now − loop.t0)·bpm/60` (clock: rebases, scheduler window, `rgnReps`, count-in `m < loop.lead`,
  `loop.clickBeat`) vs SONG `p = songAt(m)` (material: recording, `fireNear`, `loop.pos`, resume, end of song, everything shown).
- **Transport:** `startTransport(countIn, from)` is the ONE start path (rebases cursors, `lead=from`, count-in one bar or 60 ms lead-in,
  chases held state if `from > 0`, schedules the first window at once). `setLoopBpm` keeps the beat. `stopAtEnd` stops at the end of the
  material (never while recording or cycling). `seekTo(beat)` (refused while recording). Loading a backing turns ⟳ on (unless recording,
  or a user brace/repeat is set). `loop.bars` = BACKING length (1..8). `loop` fields: `on, bars, metre, sub, bpm, t0, pos, sched, layer,
  clickBeat, quant, rgn:{on,from,to,user}, lead, cnt`.
- **The brace** (`loop.rgn`): one control, two jobs (what cycles when ⟳ is on; where recording starts from stop). `user:false` follows the
  material (`[0, end rounded up to a bar]`, dashed, «auto»); `user:true` stays put (✕ returns to following). Quantised to the bar, ≥ 1 bar,
  clamped (`braceClamp`); bar resolution is deliberate. Tap/drag on its band (nearer edge moves). Refused while recording. `rgnApply` is the
  single writer (exception `braceFollowGrow` while not cycling); while playing it rebases by whole bars; past the new end → jump to the
  brace start. `rgnSync` from `schedInvalidate`. Region-only machinery: `songAt`/`rgnReps` fold, pass split + seam release + chord/bass
  chase in `scheduleLayers`, the wrap branch in `tick` (`liveWrapRelease`, solo chase), the quantise fold in `push`, per-pass closing in
  `recFoldRoll`, `stopAtEnd` suppression.
- **The chase:** chords/bass have one voice per track and glide; entering after an `on` needs `chaseFor(x)` (last `on` per owner + latest
  `set`, minus owners closed) and `chasePlay(x, when, lead, only)` (starts voices with the event's view, map and the REMAINING bend); called
  from `startTransport`, `rgnApply` jumps, each seam, the wrap, `frzLeave` (one track), `trackResplice`. Muted tracks skipped; a track
  whose buffer owns it skipped (`frzBufOwns`). Cached per entry beat, reset by `schedInvalidate`.
- **Tracks (lanes):** layer number (sound address) + lane id (identity, rule #27). `laneAudible` (solo overrides mute), `laneGated()` once
  per scheduler call, `laneHush()` releases newly inaudible tracks. ⛳ **A track holds exactly ONE source** (T2/T3/routing by tuning):
  `noteSource(fn,a,sc)` → `'role:inst|viewKeyId'` (drums `'dr:kit'`; the view's KEY is part of it — TF2: a key change mid-take
  starts a NEW track, user answer Q2); `takeRoute` (inside `push`, after the
  count-in refusal) sends a note START to the take's track of that source, else the unclaimed track born at ●, else a new one (`takeMint`
  → `laneNew`, number from `nextFreeLayer()`); changes/releases follow their note's `layer`. An ARMED track accepts only its own source
  (else a new track; header «L{n} takes only its own sound», `looper.armedOwn`). One ● = one take (`tk`); ⤺ removes all its tracks.
  `recChOn` closes a chord left open in another layer. `laneSourceOf` reads note starts only (`isNoteStart`). Per-take state by layer
  (`takeSt`: `{vBase, vTop, k, chLastT, bsLast}`; `recLayers()`/`isRecLayer()`), `push(…, ly)`.
- **Arming** (`toggleArm`, `armLane` = lane id): ● records into it (no `laneNew`); frozen while recording; a muted armed track allowed
  («(not heard)»); undo/delete/clear of it clears the arm.
- **Owner keys:** replay `'leadloop:N:v'`, `'loop:N[:k]'`, `'bassloop:N[:k][:v]'` (with v=0 byte-identical to before); live `'lead:L'/'R'`
  (+finger), `'lead:M'`, `'latch'`, `'bass'`, `'bass:L[:f]'`. Each ● computes `vBase = layerSlotTop(layer)`, `k = layerTakeTop(layer)`;
  both rise at every seam. `releaseLoopLayersAt(when, layer)` matches `N` or `N:…`. Replay skips only `recording && ev.tk === curTake`.
- **Undo, delete, clear:** ⤺ removes the LAST TAKE (repeatable; a backing undoes layer by layer; never resurrects a deleted row). ✕ on a row
  deletes that track after a second tap within `DEL_CONFIRM_MS` 3 s, NOT undoable, releases only its voices, the recorded track can't be
  deleted, unties surviving tie halves (`untieAcross`). Transport ✕ clears everything (brace back to following, repeat off).
- **Three stops:** pause (▶ while playing, `onLoop`) holds the position; panic (■) = `recStop()` if recording, halt, `softAllOff`, rewind to
  the brace start, keeping song/brace/mutes/arm; clear resets everything. ⛳ `softAllOff` while playing stops only LIVE owners and hands
  every event-played track over with `trackResplice` (release at the horizon + the same chase) — a held track note survives scale/A4
  changes; frozen buffers are stopped only when the transport is stopped. ⛳ TF2: the KEY knob calls `liveAllOff` instead (live owners only,
  closing what a take holds; tracks are not touched at all) and `backingFollowKey` (below, Backing).
- **Closing notes:** every stop that ends a recording closes what is held (`recAllOff`); at each seam (`recFoldRoll`) open solo notes get
  `leadOff` at the pass end, a held bass `bassOff`, a latched/held chord `chOff` at the pass end + a written `chOn` at the pass start (live
  voice untouched, rule #20). `push` refuses during the count-in; held notes are opened by their hand; a LATCHED chord with open fingers is
  opened by `recLatchOpen` (`latchOpenAt`; mirror `liveCh`; only if `chordHold['latch']` still sounds and `recCh` is empty).
- **Cursors:** both replay loops walk `events[0..cursN)`; the take being recorded is appended unsorted after it (safe: replay skips it).
  `schedInvalidate()` is the single reset (rule #28); bumps `evGen`.

### The arrangement window (AR1) and mixer (MX1/MX2), names/colours/order (AR2)
- ✎ opens the window (`ui.openArr`; refused while recording or recording a clip, or with no tracks) = the same strip full-screen
  (`drawLooper(true)`, one snapshot `loopView`, `full:true`): time window `rollBeat0/rollSpan` SHARED with the editor (first entry fits the
  whole song, `arrWinStart`), rows `ARR_ROW_H` 40, header «L# · role» + timbre, M / S / ❄ (`ui.onFreeze(layer)`), note miniatures
  (`laneMini`: segments priced by the engine's functions, placed by log frequency within the track's range; drums one tick per hit). Taps act
  on release: body → editor (`openRoll(layer)`), header → arm; drag scrolls time or rows; two fingers / Ctrl-wheel zoom. `#arrBar` ✕ returns
  to play; the editor's ✕ returns to the window. Row delete stays on the play strip.
- Mixer face (`state.arrFace==='mix'`, 🎚/▤): row body = LEVEL fader (relative drag, double-tap → 100/0 dB, wheel ±1), PAN control
  (−100…+100, centre detent ±4, double-tap → centre, «L 30»/«C»/«R 30»; `mixGeom`: `fx0/fw`, `px0/pfx0/pfw`, `mfx0/mfw`; `loopHit` →
  `'level'`/`'pan'`/`'mlevel'`), MASTER strip (level, output meter after the limiter, gain reduction). Level scale 0…100, gain v², 100 =
  0 dB (dB = 40·log10 v); master = 0.8 × v². Levels/pans are tables keyed by track id (`laneLevel`/`laneLevelOf`/`setLaneLevel`,
  `lanePan`/`lanePanOf`/`setLanePan`, step 0.01); no undo (ED7). Level is NEVER baked into a frozen buffer (bus `frzGain`; never stales);
  PAN is baked (before the chain) and folded into `freezeSig` (`|p<pan>`).
- **Sections (ED6, user decision ED6-1 "lengthen / shorten"):** markers `{id, beat, name}` in `recorder.secMarks` (bar lines; default
  names A, B, …; `secAdd/secRename/secDelete`; cleared by `clearRec`), drawn in the window's sections band (`ARR_SEC_H` 20, snapshot
  `loopView.sec`, hits `'sec'`/`'secband'`; tap a marker → `braceSet` on its section). `recorder.songEdit(kind, a, b)` — `'ins'` (b−a empty
  beats at a), `'cut'` [a,b), `'dup'` [a,b) — on the bars under a USER brace, every track: `secPlan` → steps of the editor's kinds
  (move/del/ins, `autmove/autins/autdel`, `lanetouch` per touched track) + `'brace'`, `'marks'`, `'lanelen'` (`secApply` inside
  `editApply`), applied with `editApply`, NOT `editBatch` (its tie pass would untie pairs that move together; `secUntie` unties only a half
  left alone), then `secCommit` (sort, `schedInvalidate`, `takeFxTouch`, `hooks.af('section')`). Rules: INSERT — from a on everything
  moves (an off exactly at a stays; a note ringing across lengthens; a note closed by the next note's start exactly at a lengthens too);
  CUT — what starts inside goes whole (tail included), a note from before ends at a or is L shorter (its last change inside applies from a,
  its bend keeps the value it had at b; closed by a removed note → an own note-off at a, birth number before the moved notes), lane points
  inside → the last per address at a, drone levels likewise; DUPLICATE — copies of what starts inside at +L (fresh k/v per note, the SAME
  take so its copied lane points govern them, ties dropped, own note-off when the original was closed by its next note), an original
  ringing past b ends at b (its copy carries the tail), then insert-at-b; lanes inside copied after b from the value at a; markers copied.
  Brace (user) mapped, `to` as an end; backing `laneLen` reaching past a grows/shrinks. ONE step of the one history (ED7: `{kind:'batch',
  label:'sec:'+kind, list}`; markers `{kind:'marks', label:'mark'|'rename'|'unmark'}`); `songUndo/songRedo/songCanUndo` are aliases. Refusals `songEditWhy`: 'rec', 'editor',
  'range', 'empty'; ui refuses a brace still following the song. `autdel` remembers its index so ↶ puts the point back in place.
- AR2: `laneName` (≤ 40 chars; empty → default «role · timbre», `laneDefName`), `laneRank`, `laneOrder()` (THE order everywhere; unplaced
  tracks after placed ones by layer number; the take's empty layers last), `moveLane(layer,to)`, `laneLook(layer)` → `{role, tim, drone}`
  memoised on `events.length`+`evGen`; `laneTitle`/`laneCol`; reorder handle (`ARR_HANDLE_W` 28) → `'move'`, `state.laneDrag`; a second
  tap within 350 ms on the name restores the arm and opens `#laneNameIn` (Enter/blur keeps, Esc cancels). Play strip: a name column inside
  the box (`stripCols(W, markW)`; «L#» inside it, grey/red when armed; ellipsis via `stripRowText`). `onLoop`/`loadArrangement` call
  `droneSync()`.
- The play strip scrolls when rows don't fit (`state.laneRow0`; drag defers a row tap to release; footer «Tracks a–b of n»; while recording
  the window shows the recorded track). Mark column `MARK_COL_W` 28 between label and lane when any row shows the arm dot or a ❄
  (snapshot `x0` = lane origin, `bx0` = box edge).

### The track editor — piano roll over the song (S4.0…S5.6, E0–E2, S0–S7, U1–U6, T5, O-4)
- **A note is not an event:** `songNotes()` groups events by the ENGINE's owner key (`chaseRole`/`chaseKind`/`chaseKey`); ⛔ no second
  pairing formula; an `…On` while one is open closes it (`endBy:'next'`); orphans reported; open notes have `end=null`; drums zero length;
  the drone is a level. `songSegs()` = pitch SEGMENTS (boundary = a pitch change only; each with its own `sc`/`sev`; `byEv`); a theremin
  note is ONE segment (`ldTherm`). Both memoised on `songNotes`' identity, reset by `schedInvalidate`. Orphans can no longer be produced
  (S4.1–S4.3: state follows what landed; at a seam only drum hits fold; quantise frozen on the note `q`; per-key order guard
  `chLastT`/`bsLastT`).
- **Shell:** `openRoll` swaps the bar for `#rollBar`; the transport goes `.roll`; `main.loop` takes the editor branch (camera open but not
  read; `processHands(null)` every frame; `latest`/`lastTs` cleared).
- **Refusals:** `editOpen` refuses while recording or a clip records; `onRec` refuses while the editor is open. A BACKING track is read-only
  for NOTES (`editBackingOpen`); timbre replacement is allowed (`editGuard(backingOk)`).
- **One role, no tabs (T4):** the editor's role = the track's (`laneRoleOf`, read in `ui.rollEnterTrack`, kept in `state.rollRole`);
  `rollRole===null` → «No notes in this track».
- **One machinery for four roles** (`ROLL_EDITABLE=['dr','bs','ch','ld']`): drums by hit (`editMoveHit`/`editDeleteHit`/`editInsertHit`);
  pitched roles by SEGMENT through `EDIT_ROLE`, `keyClash`, `editMoveNote`, `detachPlan`/`commitDetach`, `editMoveSeg`/`editResizeSeg`/
  `editDeleteSeg`, all via `editBatch` (one history entry). Insert per role (`ui.ROLL_INSERT` → `editInsertBass`/`editInsertChord`/
  `editInsertLead`). Solo insert: fresh slot `v`, tapped row, timbre from the nearest note-on else `leadIdx`, volume from the nearest solo
  event else `editDefVol('ld')`, the effects map copied EXACTLY from the nearest solo note (absence included); never bend/tie/hold.
- **Independent notes (E1/E2):** a one-segment note drags WHOLE (fresh `k` on clash); an edit touching a neighbour first DETACHES the
  segment (left part closed, segment to a fresh `k`, own note-off, the pitch change after it becomes a note start) — price: slides into/out
  of it re-articulate. A pitch-only change never detaches (new pitch on every pitch-carrying event of the segment). `editKeyGap` is gone.
- **Theremin (S5):** length editable — `recorder.bendTrim` (points with `dt ≤` the new length + an end point; new payload, ↶ restores);
  lengthening holds the last value; the curve is drawn on the note (`draw.rollBendPts`, steps, merged below half a pixel, none under 6 px).
- **Tie pairs (S6):** an edit that MOVES or REMOVES a shared edge (`a.tie`) unties BOTH halves in the same entry (`tieUntiePass` in
  `editBatch`; partner via `tiePartners` — same take, beat, another track, matched by (ti, oct); ambiguous → all candidates); `'lanetouch'`
  bumps the partner's `laneEditVer` both ways. Pitch-only changes keep the pair. Row delete unties too (`untieAcross`).
- **Chords as notes (U1–U5):** drawn as every note `chordNotes` gives; a note on a row when within 1 cent of the row's price
  (`chordRowFreq`), else between rows at its true pitch (lighter, role-colour outline, deviation from the nearest row `rollDevLbl` «−22»);
  root recognised by frequency. Axis sized from the track (`rollChordTotal`). Two-level selection (`state.rollSel` whole chord /
  `state.rollSelNote` one note; `setRollSel` resets the note level; toast `roll.tapAgainNote`). One note: delete (`editDeleteChordNote`),
  move in time / resize (`editMoveChordNote`/`editResizeChordNote` via `chordNoteEdit`), move to another row (U4; target = row under the
  finger once it LEFT its row, `ui.rollNoteTarget`) — each DISSOLVES the chord into one-note chords (`dissolvePlan`, fresh `k` each,
  inner events copied; a one-note copy takes the row's canonical form `chordUnit`). Released without leaving its row → no edit. Insert (U5):
  any row; never dissolves; nothing selected / one note selected → one note (`chordUnit`, timbre nearest chord start else `chIdx`, volume
  nearest else `editDefVol('ch')`, no brightness); a WHOLE chord selected → its SHAPE at the tapped root (typed: rigid; untyped on a bright
  root: by the mode's rule; untyped on a dimmed root: typed with its intervals — option (a), `recorder.chordMoveTy`; timbre, volume,
  brightness, `sev` copied). Rule `'none'` refuses a chord insert. Chord types compared by VALUE (`tyEq`).
- **Pitch axis (T3/T5):** one axis object `draw.rollAxis(view, all)` → `rollView.axis` `{rpp, ents, rowOf, pitchOf, snap, placeTi}`. «All»
  (default `state.rollRowsAll`): every TUNING pitch per register, mode pitches bright, others dimmed (named by the tuning's scheme or
  «(4)»); «Mode»: the compact degree axis; `#rollRows` toggle only when dimmed rows exist. ⛳ Dimmed rows are edit targets (T5): `pitchOf` →
  `{ti, oct}`, `recorder.slotPt`; ghost and drop share `draw.rollDragTarget(d, seg)`. In «Mode» an out-of-mode note sits between degrees
  (`placeTi`, «+100»). The duplicate tonic row (top of a register = bottom of the next) is dimmed, not a bug. A track holds ONE view
  (`draw.rollGroup`/`rollTrackView`); a segment of another view is neither drawn nor hit (`recorder.viewAudit`/`viewWarn`).
- **Labels:** `noteLbl(deg, s=CUR())` takes the scale explicitly (rows in the track's FROZEN scale). Rows fill the height up to
  `ROLL_PITCH_ROW_MAX` 30, else `ROLL_PITCH_ROW_H` 18 with scrolling; length handle only on a segment with its own ending event (`endEv`);
  gutter MEASURED (`rollGutterW`, capped at 42 %, cached on scale+tonic; enters snapshot `x0`).
- **Undo/redo:** `editGuard` (editor open, track alive, not backing, transport PAUSED — pauses itself); every edit: absolute time, `tk`,
  `compactEvents`, ONE `editCommit` (sort, `schedInvalidate`, `takeFxTouch`, `histSeal`); `editPush` → `histPush`, the single writer of the
  ONE history (ED7; a new step drops the redo branch); compound edits = `kind:'batch'` (sub-kinds move/ins/del/timbre/automation/lanetouch).
  Since ED7 the history is the song's: it survives closing the editor and switching tracks; ⤺ is one of its steps.
  Events at one beat keep their order through edits and undo: birth numbers (`evSeq`, filled in `editGuard`), the editor sorts by (beat,
  birth) — `songNotes` pairs a key's events by array order (a note-off and the next note-on often share a beat).
- **Several notes at once (ED1):** `state.rollSelMany` (2+ defining events; one note stays `rollSel`, so every single-note path is
  unchanged), ⬚ pick mode `rollPick` (or Shift: tap adds/removes, a drag on empty space draws `rollBox` → `draw.rollBoxHits`), Ctrl/⌘+A
  (`rollSelectable`), Esc. A group drags (`rollDrag.many {dt, dr}`, pitch per note through `draw.rollShiftPit` — ghost and edit) and deletes
  through `recorder.editMoveSel`/`editDeleteSel`: `editGroup` runs the single edits in sequence and merges what they pushed into ONE
  history entry (a refusal rolls everything back); a note with every segment selected moves/goes WHOLE (`editMoveWhole`, glide intact),
  parts of a line go through `editMoveSeg`/`editDeleteSeg` (detach as one edit would; `editRemap` follows replaced events).
- **Copy, paste, duplicate (ED2):** the clipboard (`recorder.editClip`, copies; lives for the app session) — whole notes as they are,
  adjacent selected segments of a line as ONE note (`runNote`), drum hits. Paste (`editPaste(at)`, at the snapped playhead) only into a
  track of the same role and view (`pasteBlock`/`editPasteWhy`: 'empty'|'role'|'view'); duplicate (`editDuplicateSel(evs, step)`, offset
  `dupOffset`: span to the snap step, past half a bar to whole bars). A paste obeys the birth law: session take, fresh k/v per note, ties
  dropped, `a.vol` always, the TARGET track's timbre/kit (one source per track), theremin `hold` kept; one `'ins'` entry via `editInsPush`.
- **Quantise after recording (ED3):** `recorder.editQuantSel(evs, step, what, amt)` (`what` 'start'|'end'|'both', `amt` 0..1; ui ⌗ +
  grid/what/strength selects, grid defaults to the snap step). A note's START moves the whole note (length kept); a boundary INSIDE a line
  moves by itself — the neighbour's length follows, no detach (user decision 4); an END moves the own note-off (a note closed by the next
  note's start keeps start and end); an edge that would leave a segment < `EDIT_MIN_LEN` stays; inner value events a moved edge passes over
  are dropped; a note reaching into another of its key takes a fresh identity (E1); a shortened theremin trims its bend; drums with starts.
  Notes one by one inside `editGroup` (one entry); pitches never change; nothing moved → false.
- **Volume bars (ED5):** the Volume lane's second face (`state.rollVolBars`, default ON; `#rollVolBars` ▮▮/•— while the lane shows
  Volume): one bar per NOTE at its start (`recorder.pnBars(layer)`, memoised on songNotes; a chord one bar, a drum hit one; a faint line
  where the volume changes inside a note), snapshot `rollView.aut.bars`, hit `'autbar'`. A drag (value axis only — `rollAutDrive` with
  `G.vOnly`; sideways = the fine zone) → `recorder.editVolSel(evs, d)`: every volume value of each whole note +d, clamped 0..1 (rule #30),
  the note's own Volume ramp marks become steps (`'r'/'s'` → `'h'`, generated-for-Volume flags dropped), one `editBatch`; a note of a
  multi-selection moves the whole selection by the same d. ⛳ Per NOTE, not per moment: two notes on one beat keep their own values (the
  line, `pnPlan`, holds one value per beat — the probe's control). No point insert or ╱/⌐ on the bars face.
- **ONE HISTORY (ED7, plan decision 6):** `recorder.hist`/`histFut`, `histPush` the single writer, newest `HIST_MAX` 300 kept (not trimmed
  inside `editGroup`). Steps: the editor's own kinds (unchanged); ED6 sections and markers; `'tab'` {id, f:'level'|'pan'|'name', from, to}
  (`histTab(layer, f, from, merge)` — ui calls it at the END of a fader / pan gesture, a double tap, a rename; wheel steps on one control
  within `HIST_MERGE_MS` 800 merge); `'master'` (`histMaster`); `'ranks'` (`moveLaneStep`); `'snap'` — diff snapshot steps for a TAKE
  (`takeBegin` before the take's lane and capture record exist: `onRec`, `seedTake`; ends in `setRecording(false)`), ⤺ (`'untake'`),
  row delete (`'rowdel'`), backing load/removal (`'backing'`), ✕ (`clearSong` → `'clear'`; also the looper hand's clear): events removed /
  added / changed (objects with beats and payloads), capture records by take, track ids with table rows (`laneRow`, `laneDrop` drops the
  freeze), markers. One pending snapshot at a time: ⤺ / backing / row delete during a take fold into the take's step; `probeTake` and
  `histOff` write none. NOT steps: mute, solo, arm, the brace, tempo, tonic (user answer: listening switches, not edits) — except that the
  ✕ step carries the brace and ⟳ (`br`, `braceKey`), so ↶ of ✕ brings them back (control `histDbg {noBrace}`), and a song Transpose step
  carries the key knob (TF3b). `histUndo`/`histRedo` (aliases `editUndo`/`editRedo`,
  `songUndo`/`songRedo`): refused while recording, pause the transport, `histCommit` bumps the edit version of every track the step
  touches (`histTouched` — events, lane points via their take, chains, snapshot events) → frozen ones go stale and re-freeze ('undo'
  hint). ⛳ TRIPWIRE: each step keeps `h` = `histHash()` (order-free FNV over events: birth number, beat, payload object id, layer; capture
  records and points; track tables; markers; master) of the state it left (`histSeal` in `editCommit`/`autCommit`/after table and snap
  steps); ↶ refuses with 'changed' and drops the history when the state differs (a path writing outside the history — console, probe).
  Song loads reset the history (`loadSong`, `P.seed`, `tutorClearLoop`); every P.all row starts with `histReset()`. ui: `histDo(±1)` behind
  every ↶/↷ (editor `#rollUndo/#rollRedo`, window `#songUndo/#songRedo`, play transport `#histUndo/#histRedo`) and Ctrl/⌘+Z,
  Ctrl/⌘+Shift+Z, Ctrl+Y (not in text fields); toast names the step (`hist.k.*`); an undo that removes the open track closes the editor.
  ED7-fix2: ✕ leaves no strip (empty song), so `recorder.clearSong` → `hooks.cleared` → ui shows `#undoToast` «Song cleared — ↶ Undo»
  (`UNDO_TOAST_MS` 6 s; acts only while ✕ is the newest step, `histTopLabel`), and `draw.drawLooper` keeps the play transport on an empty
  song whenever `histCanUndo()` — class `.empty` shows only ↶ ↷ at `LOOP_EMPTY_TOP`. Probe control `ui.undoUiDbg(true)` (the pre-fix UI).
- **Bend curve (OWN2):** with a theremin note selected, its curve points are handles (`draw.rollBendHandles`, snapshot `rollView.bend`, hit
  `'bendpt'`, `rollBendAt(px,py)` → cents from the attack pitch and beats from the note start, via `hzOfRow` — the inverse of `rowOfHz`).
  Drag: one axis per gesture (time or cents; the first point only cents), ghost dashed with «+35¢ · 1.25»; ✚ + tap inside the selected
  note's time adds a point; 🗑/⌫ deletes the selected point (not the first). `recorder.editBendPoint(ev, 'move'|'add'|'del', i, dt, c)`:
  first point at dt 0, times strictly increasing (clamped between neighbours), inside the note, whole cents ±2400, a NEW payload and array,
  one step (label 'bend'); `bendDbg` = the probe's control (in place). State `rollBendSel`, `rollBendDrag`.
- **Bend shapes (BEND-CURVE, user request):** a point's optional `sh` ('s' glide / 'h' step) and `k` (curvature −1..1) describe the segment
  INTO it; NO `sh` = a recorded point = a step exactly as before (recorded bends are dense). A point the person adds or moves glides in, and
  the next point without a shape glides on (`bendEdited`, pure — the edit and the drag ghost); a delete makes the next shapeless point
  glide. ONE ramp function `config.bendPlan(B, base, spb, t0, from)` for live replay and renders (both engine instances call it through
  `scheduleBend`): a step point = one `setFreq` with the bank's default τ (the old schedule, byte for byte); a glide = sub-steps every
  `BEND_GLIDE_STEP_S` 10 ms aimed at the curve's value at the sub-step's end with τ `BEND_GLIDE_TC` 5 ms. Shape law `curveU(u,k)` =
  exponential (`CURVE_A` 8). The chase passes `a.bendFrom` (no rewritten curve); `bendTrim`, the ED6 insert/cut (`bendIns`/`bendCut`) split
  glides EXACTLY (`bendSplit`: a curve splits into k·u and k·(1−u)); curves without glides take the old paths. UI: a hollow diamond at the
  middle of every glide of the selected note (`rollView.bend.mids`, hit `'bendmid'`) — a vertical drag sets k (`curveK`, snaps to 0 near
  straight), `recorder.editBendShape(ev, i, sh, k)`; with a bend point selected `#rollShape` ╱/⌐ toggles its incoming glide ↔ step.
- **Transpose by degrees (ED4):** `recorder.editDegreeSel(evs, n)` / `editDegreeWhy` ('none'|'reg'|'fit'); ui −1°/+1°, Alt+↓/↑. Pitch
  arithmetic is ONE function `scales.shiftDegrees(ti, oct, view, n)`: degree + n in the segment's frozen view, wrapping into the register;
  an out-of-mode pitch moves from the NEAREST degree (tuning steps, a tie takes the lower) keeping its offset (user decision 5); the root one
  register above the last is written as the top tonic. Pitch-only: every pitch-carrying event of each selected segment, glides whole, no
  detach; chords through `segPitchPt` (untyped follow the rule, typed keep the type, T7 refuses); one `editBatch`. Beats never change.
- **Transpose by semitones (TF3, user answer Q4):** `recorder.editTranspose(n)` / `editTransposeWhy` ('none'|'range'|'drums'|'backing') for
  the open track (`#rollTrDn`/`#rollTrUp` «−1 st / +1 st»), `songTranspose(n)` / `songTransposeWhy` ('rec'|'editor'|'empty'|'none'|'range')
  for every track with pitch, the backing too (`#songTrDn`/`#songTrUp` in `#arrBar`); one plan `transposePlan(layers, n)`: every non-drum
  event's view → `scaleView(mode, its tunedFrom, its chord mode, key ± n)` (`'move'` steps carrying `sc`); notes, beats, payloads untouched;
  keys within `TR_KEY_MIN..MAX` (−12..23). Every tuning prices from the key: 12-note tunings move a semitone (a historical temperament changes
  key colour — expected), Partch / 19/31-TET / gamelan / Bohlen–Pierce move their 1/1 by 100 cents (the key model expresses it — no
  disabled button). One step (label 'transpose'; the song step carries `'lanetouch'` per track), frozen tracks go stale and re-freeze.
  ⛳ **TF3b (user answer 1):** the SONG step also moves the key knob by n (mod 12; sub-step `{kind:'key', from, to}`, `recorder.keyStepSet`:
  setTonic + `liveAllOff` + drone + `hooks.key`) so live playing stays in the song's key; ↶/↷ set the knob ABSOLUTELY to from/to (a knob
  turned in between re-keyed the backing; the step's own view moves restore it, so knob and backing agree). The track step (editor) never
  moves the knob. Cents (`keyC`) ride along unchanged. Probe control `trDbg({noKnob})`.
- **Track into another mode (OWN1):** `#rollMode` lists `scales.modesLikeView(view)` — modes of the SAME tuning (user decision) with the same
  number of degrees; `recorder.editTrackMode(mode)` / `editTrackModeWhy` ('none'|'same'|'reg'|'fit'|'chords'): every event of the track takes
  the new view (`scaleView(mode, its tunedFrom, its chord mode if the new mode has it)`), every pitch-carrying event the same degree there by
  `scales.mapDegrees` (ED4's nearest-degree + offset rule: `degFrom`/`degTo`, shared with `shiftDegrees`); one step (label 'mode'; a `'move'`
  step may carry `sc`); frozen tracks go stale. Rule #7 holds: the view changes only by this explicit edit of the whole track.
- **Timbre replacement (T5):** `#rollTimbre`, entries from `audio.timbresOf(role)`, `editSetTimbre` rewrites every note start and timbre-
  carrying `leadSet` (fresh payloads), one entry `kind:'timbre'`; a frozen track goes stale; effects unchanged; no picker on a drone layer.
  ⌫/Delete = `rollDeleteSel` (not in text fields, not on key repeat or with modifiers).

### Effect ownership, capture and playback (O-0…O-4) and automation
- O-0 chain-owner key (`chainKeyOf`, opaque; `chainOwners()` names kinds). O-1 serial chain, deliberately changed the sound: solo per-note
  send amounts are GONE (`reverb:mix`/`dly:mix` lost `attach`; old events' keys ignored). ⛳ The boundary is the summing of voices: below it
  volume, pitch, theremin Hz, bend, DRIVE, vibrato, per-voice tremolo, BRIGHTNESS, GLIDE (read by each voice from its note); above it the chain.
- O-2 capture per take (`takeFx` by take): the chain snapshot at take start (`takeCapStart`), a lane of what moved (`takeCapSample` via
  `fineStep`), composition changes with times (`FX_CHAIN='#chain'`). Sampled from the recorder heartbeat (`tick`, 25 ms, song beats,
  after the count-in guard) — so a knob turned while a latched chord rings IS recorded. Capture walks declarations (rule #29). Expression
  channels captured, not events (rule #23).
- O-3 playback: `fxPlayBuild` merges takes into one list sorted by `(t, tk)`; `fxPlayDrive(x)` folds it with a forward cursor (refold on a
  backward jump) through each effect's `setNorm`; composition honoured via `fxPlayPath(key, ids)` (gates; the live chain is never
  rewritten); on stop `fxPlayStop` returns the path and pulls back to the aim. ⛔ No driving while recording. A take governs only the
  owners of roles it played (`meta.keys` via `evRole`). Per-note parameters are NOT merged (`fxLaneMerge` skips them).
- O-3.1 aim ≠ sound: `p.cur` = what sounds; `FX_AIM` = where the hand points (one writer); bars draw the aim; a driven parameter is hollow
  with a dimmed label (`fxIsDriven`); per-note parameters are never hollow.
- O-4 the automation lane (same time axis as the note grid, `rollView`): one address (owner, effect, parameter) across the whole track;
  left shelf = the take's snapshot (no handle); drawn as a STEP unless the segment is SMOOTH; drag with one axis per gesture, value snaps
  to tenths near the point and units when pulled aside; TIME IS FREE (no quantise). Part 2: add/remove/reorder effects for one track in its
  CAPTURE (never the live chain); `autChainOf(layer)`, `autChainAdd/Remove/Move(layer, fxId[, dir])`, `autAddPoint(layer,fxId,pKey,t,v)` find
  the track's one chain (`laneChainKey`); `autPoints(layer,key,…)`. The add list = the role's voice modules (`fxVoiceIdsFor`) + bus modules
  (`fxAddableIds`) minus what the track has (mid-take effects included — re-adding would make them sound from the start; ▲▼⊘ disabled on
  them). Chain edits act on EVERY captured take of the track as one entry; a new bus point goes to the latest captured take (`autCaps`);
  a take without a capture inside a captured track never gets one. ⛔ The live chain is read only for a track with no capture in ANY take:
  a chain edit or freeze then snapshots it into the earliest take and NAILS it (`'autcap'` first in the entry; freeze says `frz.pinned`).
- Part 3 per-note addresses edited IN THE NOTES (V4b): lane built from notes (`pnView`, runs of equal values, `pnCarrier`); every edit edits
  the point list and ONE rebuild `pnPlan` rewrites the address (via `editBatch`); "not set" = hollow dot at the role default; between notes
  dimmed; value field per declaration (`fxNoteField`). Removing a voice module strips its values from notes in the same entry. A point mid
  held note gets an ANCHOR change event in every note held there (not glide). ⚠️ Editing Glide over a recorded bass theremin smooths its steps.
- Part 3b Volume lane (VOL-3): listed FIRST on every track with a role (`autAddrs`), per-note, 0..100 = `a.vol`, rule #30 guards; ▲▼⊘
  disabled. A continuous swell is dense (one point per run; reshaping needs ED1/ED5 tools).
- Part 4 effects added mid-take are listed (after the snapshot's addresses; no shelf before their first point).
- Part 5 smooth automation: shape lives on the segment's END point. Bus point `sh`: `'s'` smooth, `'h'` step (hand-placed points always get
  one), absent = RECORDED point and the segment into it is SMOOTH (`autSmoothOf(prev, pt)`; one function for `fxLaneSmooth` — so
  `fxPlayDrive`, `fxLaneExpand`, freeze, `R.live` — and `autPointsCalc` → view `smooth`). Editing a point FREEZES the derived shape of the two
  segments it touches (`autFreeze`). Per-note: `pnPoints` gives `g0` (last event of the previous run), `pnEffSh` → `autSmoothOf`; draw starts
  the diagonal at `g0`; `pnFreeze` (a frozen glide after a hold gets a flat point at `g0`). Straight in the normalised 0..1 scale. ONE law
  `fxLaneAt(e,x)` (with `nx` links and `snap` marks from `fxLaneMerge`); `fxLaneExpand(list, stepBeats)` unrolls smooth bus segments at the
  25 ms tick step for the render and `R.live`; each value through the effect's setter (⛔ no native `linearRampToValueAtTime` — setters are
  the single door and are non-linear). Per-note smooth segments = change events (`pnPlan`): inside held notes `…Set` every `AUT_RAMP_BEAT`
  where the value moved ≥ `AUT_RAMP_EPS`; marks `a.sh[addr]` ('s' point entered smoothly, 'r' inside) and `a.gen[addr]=1`; a generated solo
  change carries `hold:true` only for a theremin note; glide (`readAt:'pitch'`) gets no ramps or anchors. ╱/⌐ button `#rollShape`
  (`autShapePoint`, history `'autshape'`, toast). BEND-CURVE: a bus point may carry `k` (curvature of the glide into it; `fxLaneMerge`
  copies it, `fxLaneAt` applies `curveU`); the selected point's incoming glide shows a diamond (`rollView.aut.mid`, hit `'autmid'`,
  `recorder.autCurvePoint(rec, k)`, step `'autcurve'`); per-note addresses are NOT curved (they live in note events — later). Named limits: a note edit carries its ramp events without rebuilding; anchors only where no
  event; with several takes on one bus address the lane draws a diagonal across another take's snapshot where playback steps.
- **Fine recording** (`recorder.fineStep`/`fineKnee`, one automaton for bus capture and per-note values; constants in config): records
  one-unit steps of the AVERAGE over 2 s (jitter σ ≈ 0.002–0.006 averages out), placed at the window's mean sample time, never before a raw
  sample reached it; a sample > 0.03 from the average restarts the window (fast moves not smoothed); no rest gate (a unit per 5 s still
  records as a line); a PAUSE is found by shape after a gap > 0.5 s ("flat then rising" vs a line, F > 50) → a HOLD point at the previous
  value. Per-note value-only changes carry their own beat (not quantised); pitch/chord changes are. A/B switch `R.recSteps(true|false)`.

### Freeze — tracks rendered offline and played as buffers (F0–F5, A0–A2c, AF1–AF4, AF6b, AUTO-PROBE)
- **A playback MODE** (`recorder.js`): a frozen track plays its buffer instead of its events; events are never discarded; unfreeze = instant
  and lossless. ⛔ Registry keyed by LANE ID (rule #27), never written into events (rule #28; touches neither cursors nor `schedInvalidate`).
  Both replay paths and `chasePlay` skip a fresh-frozen layer (`frzLayer` = `freezeState(layer)==='fresh'`; a stale one falls back to events).
- **Memory (AF6b):** after the render `frzPack`/`frzPackAsync` (async yields every `FRZ_PACK_SLICE` 4 chunks via MessageChannel) quantise each
  channel to Int16 chunks of `FRZ_CHUNK` 2^15 frames with a PER-TRACK scale (q = round(x·32767/peak)); NO dither (TPDF would raise the worst
  error from −96.3 to −86.8 dB re peak, beyond −90, and make refreezes differ). Chunks are TRANSFERRED to the audio-thread store
  (`audio.frzStorePut`); the main thread keeps `key, len, dur, kind, peak, bytes` + the rest map (`blk`/`thr`); Float32 only in the render
  report (`r.buf`). Playback = a reader per start (`audio.frzReader(key, startF, d)`): frame F ≥ startF plays buffer frame F + d; frames on
  the transport grid (`T0F = round(t0·sr)`, `startF = T0F + round((at − t0)·sr)`); no interpolation, no chunk joins in the sound. Without the
  worklet: Float32 `AudioBuffer` + a one-shot source.
- **Two-phase install (AF6b-fix):** `freezeSet` puts the data and builds an idle SPARE reader; the entry waits in `frzPend` (the previous
  freeze keeps playing) until the spare reports `{ready}`; `frzActivate` re-checks lane and signature (refusal words 'sig', 'lane', 'engine'
  after `FRZ_READY_MS` 3 s, 'superseded', 'dropped'). `render.freeze` and probes await `frzWhenReady(layer)`. Each start uses the ready spare
  (`{play:{startF,d}}`) and builds the next. Every reader stays connected to a silent sink (`frzSink`) until it ends (an unpulled node never
  ends — AF6b-fix2). ⛳ A stop is sent `FRZ_STOP_LEAD` 100 ms after the fade's end: `killF` = audible end (fade `FRZ_FADE` 6 ms), `stopF` =
  reader end; the reader reports `seen` (frame the stop arrived). Probe-only: `frzStoreMode('f32'|'noscale'|'i16')`, `frzChunkDbg`,
  `frzNodesInfo`, `frzReadersAlive`.
- **One-shot nodes per start/seek/pass** (rule #3's sanctioned exception). At a brace seam at most two audible nodes per track: the old one
  plays its TAIL over the new pass (overlap, never fold) when the brace reaches the material end; mid-song braces fade the old node (~6 ms).
  Mute/solo = one assignment on the track's bus gain (`makeFrozenBus` straight into `master`, from `laneHush`). Stops: `softAllOff` (only
  when stopped), `stopAtEnd`, `seekTo`, `startTransport`; buffers dropped in `lanePrune`/`laneReset`.
- **Splices by the SCHEDULER at segment start `lo` (horizon T):** LEAVING (`frzLeave`, before the segment's events) for stale-by-edit,
  stale-by-A4/tempo and unfreeze-while-playing (marks `drop`; retired by `frzNearDone` or any stop): the buffer fades with `FRZ_FADE`
  at T, `chasePlay(lo, T, lead, only)` reopens the track's held notes. Splice mark `f.mark = {kind, rep, beat, at}` compared as the PAIR
  (pass, song beat) by `fireNear` too; `FRZ_MARK_GRACE`. Drone sounded live only for audible, not-fresh-frozen layers
  (`droneAudible`/`droneSync`; 20 ms switch). `frzRetire` disconnects the bus after a delay.
- **The swap (AF2, user decision)** — when events own a fresh frozen track while playing (`f.evRun`), `frzPlanSwap` at segment start picks:
  (1) the first REST within `FRZ_SWAP_BARS` 2 bars (bar lines first, then `FRZ_REST_GRID` 0.25 beat); (2) else the next bar line with an
  equal-power crossfade `FRZ_XF` 20 ms; (3) under a cycling brace, if that bar line is the brace end — AT THE SEAM (next pass is the buffer's;
  the seam chase skips the track — `frzChaseSkip`; the pass's voices are CUT at the seam by `voicesCut`). A REST is defined on the RENDERED
  BUFFER: everything within ±`FRZ_REST_WIN` 50 ms of the beat below `FRZ_REST_DB` −60 dB of peak (map `frzBlocks`, `FRZ_BLK` 10 ms blocks).
  The buffer starts at exactly that beat (`frzStart(…, xf)`: offset `startSec + (b − first beat)·spb`, start `t0 + (b + pass offset)·spb`) and
  fades in by `audio.xfRamp` (sin). Double release fixed: `frzSwapCut` → `audio.voicesCut` fades the track's voices — held and released
  (`v.last`) — on `tg` at the swap time; solo cut set ahead by `tick` (`frzLeadAhead`, `FRZ_LEAD_AHEAD` 75 ms) and re-applied by `fireNear`
  (`frzLeadRecut`). Fades are piecewise-linear equal-power (`XF_SEG` 8) — ⛔ never `setValueCurveAtTime`. A swap not yet cut is cancelled if
  the track goes stale (`frzSwapCancel`) or on a brace jump (`frzSwapCancelAll`). Predicates `frzBufNow`, `frzChaseSkip`. Named limits: drum
  tails scheduled before a crossfaded swap and the role's live reverb tail ring over the buffer's tails. Probe-only `frzSwapDbg('old'|'hard'|null)`
  ('hard' is an ear switch only since AUTO-PROBE), `frzSwapInfo`, `braceProbe`.
- **Staleness (F5):** editing is never refused; the buffer goes STALE. `freezeSig(layer)`: event count, first/last beat, SUM of beats, the
  track's `laneEditVer` (bumped by its own edits, `'lanetouch'`), A4, tempo (TF2: NOT the tonic — views carry their keys; the live tonic only
  for an event without a view; probe control `frzSigTonicDbg`), pinned fallbacks only when an event reads them, the drone's live BP choice, the track's
  TIMBRES (`tmix` packs ids `|0`, "indices < 63" — rewrite when string ids arrive), pan, `chordModeVer`, the live solo chain snapshot for solo
  notes without a map (`soloLiveSig`). Memoised per track (`frzSigMemo`), cleared when `frzGlobalKey()` changes (event count + `evGen` +
  `takeFxVer` + pinned fields), which the watcher reads through `frzWatchKey()`. ⛔ Mute/solo and level excluded; other tracks' events
  excluded. The gate is "frozen AND fresh".
- **Auto-freeze (AF3) — tracks freeze themselves, ON by default** (`R.autoFreeze(false)` = off for the session; `src/frzqueue.js`, loaded by
  `render.js`, which `main.startApp` imports right after the engine starts). ONE watcher (timer `QF.pollMs` 250 ms) polls
  `recorder.frzWatchKey()` = `frzGlobalKey` + `frzWatchVer` (bumped by pan) + the live solo chain when a solo note has no map; only when it
  moves are signatures looked at. A track is a CANDIDATE once not fresh and its signature has not changed for the settle delay of the LAST
  trigger — `AF_DELAY` (one place): editor 0.5 s, take/pan/undo/backing/rowDelete/song/any other change 1.0 s, retune 1.5 s (unused while the
  switch is off). Every signature change (and every hint) resets the clock → an edit session of any length = one render after it. Hints
  come through `hooks.af` from the real sites (`recStop`, `onUndo`, `loadArrangement`/`clearJam`, `deleteLane`, `editClose`,
  `songPinChains`; ui pan press/release/wheel/double tap). HOLDS: recording (queue gate), the editor's open track, a held pan control.
  Candidates go through the AF1 queue (priority, gates) and swap in via AF2.
- ⛳ **TF4 (user answer Q5): A4 and tempo re-freeze too** (`AF_REFREEZE_ON_RETUNE` true): a track stale ONLY by them (`recorder.frzRetuneOnly`
  masks field 5 of the signature) waits the 'retune' settle 1.5 s after the LAST move (each move resets it) and plays its events meanwhile.
  Probe control `dbg.noRetune` (the old switch off).
- ⛔ **Not auto-frozen (live by choice):** tracks without a captured
  chain (`laneHasChain` false — auto-freeze NEVER pins the live chain: the queue passes `noPin`; skipped "no chain"); tracks over the memory
  budget `AF_BUDGET_MB` (300 MB touch = `(pointer: coarse)`, 1 GB desktop; estimate before the render, exact `admit(bytes)` in
  `render.freeze` before install, refusal `'budget'`; skipped until the signature changes or memory frees; no eviction until AF6).
- **Chains are pinned at BIRTH, never by auto-freeze:** an editor insert into a track with no captured chain pins the live chain
  (`recorder.editInsPush`: `autCaps(layer,true)`, its `'autcap'` first in the insert's history entry — ↶ removes both); song load pins every
  chain-less track (`recorder.songPinChains()`, called by `P.seed`/`P.song`; the seed: 0 tracks). Inserts into a captured track keep its chain.
- **Interface (AF4): no ❄ anywhere.** Only the arrangement window shows a faint dot at the right end of a row header (`draw`, via
  `hooks.afRow` → `frzqueue.afRowState`): hollow = waiting, pulsing = rendering, nothing = frozen or live by choice (no chain, budget); snapshot
  `loopView.dots`. The play strip shows nothing (its mark column is for the arm dot only). Console: `R.freezeQueue()` (entries, settle
  timers, trigger, skips and why, live-by-choice list, memory used/budget, holds), `R.freeze`/`R.unfreeze`/`R.frozen` (the console `freeze`
  still pins a chain-less track — explicit). No `frz.*` strings remain.
- **Memory of a render (AF3 part 0b, RENDER-LEAK):** Chrome never collects an `OfflineAudioContext` that called `audioWorklet.addModule`
  — context, graph, worklet scope and rendered buffer stay for the session (measured ≈ 6 MB per render of a small track; a hosting iframe,
  navigating it, or taking the graph apart did not free it). So a track render loads the KS worklet ONLY when the track plays a KS timbre
  (`render.usesKS`, `audio.LEAD_KS_FROM`; otherwise `stubWorklet`, the sound is identical; report field `ksLoaded`; probe switch
  `R.renderKsLazy(false)` = the old always-load). KS tracks still pin ≈ 6 MB per render (no workaround found). `render.freeze` also
  DETACHES the report's Float32 data after packing (`releaseBuf`; kept only with `keepBuf` or when the Float32 fallback IS the frozen data).
  Runner check `--leak`.
- **The render (`render.js`):** a second engine instance (`'./audio.js?render…'`, own `AC`, pools, buses, effect tables), one per session,
  re-initialised against a fresh `OfflineAudioContext` per render, sample rate pinned to the live one. Seeded (`setRnd(mulberry32(seed))`
  BEFORE `initAudio`; seed from the LANE ID `seedOfLane`); every render starts and ends with `renderReset()`; ONE render at a time
  (`renderQueued`). `renderTrack(layer)` reuses `makeENG(copy)` and `fxLaneMerge()`; does NOT skip inaudible tracks; every event gets an
  explicit time (solo and drone too); pins A4 (TF2: not the tonic), scale, seventh, the three instrument indices, "tuned from", chord modes BEFORE
  `initAudio` and restores in `finally` (`unpinLive` restores only fields still at the pinned value); tempo recorded, not substituted;
  closes everything left open; taps `master` with gain 1 (`offlineTapMaster`); tail from the captured chain (reverb decay RT60; delay
  `time · ln1000/ln(1/fb)`; longest release) via `fxDenormOf` (largest value over the track); follows chain changes made during a take by
  GATING (`mergeOrders`, `fxRenderPath` wires all effects once, `fxGateAt` opens/closes at recorded beats; a genuine reorder keeps the
  earlier order — `reordered`); every owner key gets an explicit path; the live chain is read nowhere (a capture-less track renders with an
  empty chain — hence `freezePinCaptures`). Solo notes without a map get the live solo chain's snapshot taken at render start
  (`render.patchInst`). `renderTrack(layer, {dry, short, trackGain, trackPan, seed, quiet, layoutOnly, layoutGate})` options are probe/queue
  only. `freeze` takes a ticket (`freezeTicket` — signature + lane id) BEFORE rendering; `freezeSet` refuses if either moved. `A0` times the
  synchronous LAYOUT (`layoutMs`) and pool growth.
- **Probe facts (`R.probe()`, F0–F2):** KS worklet in the offline context, effect instances in that context, buffer shape and peak, one seed
  → the same performance, an isolated noise-only seed test (≈ 70 % of `noiseBuf` covered), KS differing regardless (unseedable in that path),
  `liveRandomIntact`, per-source breakdown, timing split, mix-zero experiment (`zeroMix`, `REV_WET_SEC` 39.7 ms), worklet-cost experiment
  (`stubWorklet`), offline allocator (distinct voices, rms ratio ≈ √N). ⚠️ Its printed verdict tests exact equality and shows red: divide the
  printed max by 7.4506e-9 (1–3 = last bits, fine; millions = a real fault). ⛔ Never widen it into a pass.
- **Repeatability (measured):** same seed → 1–3 ULP (the summand rule: a node with ≥ 3 inputs may sum in a different order); different seed
  ~1.56e7 ULP. Track renders repeat: dry ≤ 1e-4, wet ≤ 2e-4 of peak (one-entry reverb loops). Compare against thresholds relative to peak,
  never `===`.

### Probe rows that render or capture — tolerances and controls
- **POOL1 chord pool on demand** (`P.checkPool`, quick + all, RUN 4): a chord/drum/solo scene and a seed chord track rendered with the
  lazy pool and with the old eager one (`poolDbg({eager})`) agree within 2e-6 of peak (the old pool against itself already differs by up to
  6e-8 — the summand rule; bit for bit is not possible); CONTROL `poolDbg({naive})` (no per-index draws) must exceed it; live: a fitting
  chord builds nothing while it attacks, ≥ 2 spares right after, a burst reaches 24 and never more, the pool never shrinks.
- **ENG2 engine readouts** (`P.checkEngReadouts`, quick + all, RUN 4): `engVoices()` = the pools and follows a silent probe chord / two hits;
  `engLevels({roles})` in dB; `engLoad()` reports `playbackStats` (or the older `playoutStats`) and `renderCapacity` exactly where the
  browser has them, `undefined` elsewhere; the meter's dropouts line and provisional class; `R.engBench({force, noStore})`; `R.engine()`;
  nothing switched. CONTROL: a fake `playbackStats` on the context must reach `engLoad()`. Node row «ENG2 power class (core)»: exact class
  decisions, the benchmark cache, `dropRate` (CONTROLS: over the threshold → low; under 10 s → null). Runner Chrome 155: playbackStats yes,
  renderCapacity no.
- **AF5 track and live isolated** (`P.checkLiveIsolation`, P.quick and P.all, ≈ 4 s; reads values, no audio capture): the live chord chain
  (composition, values, output), the live owner's route/level/pan and the solo scalars stay identical while a chord track gets a Volume-lane
  edit, a reverb-mix point and a pan change — editor open, after leaving, playing unfrozen, playing (fake-)frozen, stopped; the track chain
  carries the edit while playing (positive); a live reverb change never moves the track chain; a frozen track drives no address; the
  MIXER level 0.2 and pan 0.8 of the ARMED track and of a non-armed track leave every live owner's level/pan/route (all roles) and a
  sounding live chord's voices (tg, pan pair, router) unchanged. CONTROLS: `setLiveIsolation(false)` — the live chain must change;
  `recorder.setLiveLeakDbg(layer)` (a live owner takes that track's level/pan) — the voice read-out must change. Console read-out for an ear
  report: `R.liveCheck()` (live owners, sounding live voices' stages, each track's level/pan/arm, live chains).
- **frozen seed bass level**: the sample count follows the live rate (650886 at 48 kHz = 13.560125 s; ±1 sample of rounding) — the
  system output device may run at 44.1 kHz (it did from RENDER-LEAK on); peak/rms keep the ≥ 90 % floor.
- **AF3 auto-freeze watcher** (`P.checkAutoFreeze`, P.quick and P.all, ≈ 2.5 s, deterministic: probe clock, 50-ms ticks, fake 128-sample
  renders through the real ticket/`freezeSet`, watcher scope one track): every trigger renders after its delay and within two ticks, not
  before (default change, pan held then released, editor via the real `editClose`, take end after the recording gate, undo, backing, row
  delete, song); five pan moves 0.6 s apart → one render 1 s after the last; level → none; tonic → none and the track stays FRESH (TF2); TF4:
  A4 (three moves 0.6 s apart), A4 restored, tempo, tempo restored → stale at once, ONE re-render 1.5 s after the last move (+1 tick), fresh; budget → skipped, not retried; an editor-created track carries a pinned chain (↶/↷ keep it consistent). CONTROLS that must
  fail: `dbg.noReset` (clock not reset → early/extra renders), `dbg.level` (a watcher reacting to level renders), `dbg.noRetune` (the
  pre-TF4 switch: an A4 change must stay unrendered), default budget renders the skipped track.
- **TF0 song sound fingerprint** (`P.checkSongPrint`, quick and all, deterministic data, no render): every pitched event's frequencies
  through `recorder.evHz` (what ENG plays and renders with), the live drone's two strings, and per track view the editor rows, labels,
  cents, chord labels, roots and chord-row Hz (labels in English) — at the seed's environment and again after the REAL tonic control
  moved the key +2; compared line by line with `tools/song.print.json` (made by `P.dumpSongPrint()` on unchanged code; renewed only by
  a slice that changes sound by decision). TF2 renewed the +2 half: recorded lines equal the base lines, the backing L14/L15 moves +2 (Q3)
  and its view at the new key adds two lines; the live drone line moves. Applies only to the unchanged seed song in its environment. CONTROL:
  `recorder.evHzDbg(layer, 1)` (one track one cent sharp through the real pricing) must change lines.
- **TF2 recordings keep their key** (`P.checkKeyKeep`, quick and all): the REAL key control +5 — every recorded event keeps its view object,
  sound (`evHz`), view rows/labels/cents/chord rows/drone strings; the live view follows (key and ×2^(5/12)); frozen tracks stay fresh; the
  drone engine sounds the view it is given; the backing takes the new key in its mode, recordings don't; a key change mid-take (sandboxed,
  `seedTake` step `{do}`) lands in a new track; key-less views read the live key; twelve keys = twelve views. CONTROLS: the old reading
  (`keyFollowsDbg(true)`) must move recordings; the old signature (`frzSigTonicDbg(true)`) must stale the frozen track; the drone without a
  view must move; the key set without the handler leaves the backing behind; the same take without the key change keeps one track.
- **TF3 transpose by semitones** (`P.checkTranspose`, quick and all): expected pitch = what the knob n semitones away sounded before TF2
  (key-less view at that live tonic — key colour and non-12 1/1 included). Track +1 (the seed's frozen track): views re-keyed, payloads and
  beats kept, other tracks untouched, one 'transpose' step, the frozen track stale, ↶/↷/↶ exact; B → C (+3 from 9 → key 12) exactly
  ×2^(3/12) on a mobile track; song −1 (backing too, drums untouched), one step, frozen tracks stale, ↶ exact; refusals 'range', 'drums',
  'backing'; the four buttons exist. TF3b: song −1 moves the knob (value, `#selTonic`, live view key), ↶/↷/↶ set it back/again, a knob turned
  by hand between the step and its ↶ — knob and backing restored. CONTROLS: `trDbg({noTouch})` — the frozen track stays fresh, must be
  noticed; `trDbg({ti})` — the naive transpose (tuning index + 1) must miss on the non-12 tracks; `trDbg({noKnob})` — the knob left behind.
- **TF5 tuning anchor 1/1** (`P.checkOneOne`, quick and all, ≈ 17 500 cases, data + real controls): the gate = an independent list of the
  1/1 tunings' ids; every built-in view at 0 ¢ is the plain object (12 keys); 12-note tunings refuse cents; every 1/1 view at +17/−23/+50 ¢
  (keys 9, 2) prices solo/bass/chords per degree×register, tonic and drone ×2^(c/1200) (1e-12); the real Partch controls (label, cents
  field, Q6 no G by itself, recordings and frozen tracks untouched, «Historical 1/1: G» → G 0 ¢); a 12-note mode hides them; Transpose of a
  +13 ¢ seed track keeps the cents, ×2^(1/12), ↶ exact; the +13 ¢ source differs. CONTROLS: `keyCDbg('ungated')`, `keyCDbg('off')`.
  The TF0 fingerprint pins 0 ¢ (its base half proves existing songs unchanged).
- **LAT1 latency meter** (`P.checkLatency`, quick and all, DRAWN, ≈ 2.5 s): frame-loop and detection samples keep arriving over 0.8 s (the
  fake camera has frames, no hands); the report's numbers are plausible (fps 1–240, detection 0.01–2000 ms, gestures ≤ 200, frame interval
  2–2000, base ≤ 500, output ≤ 2000, hand → sound 0.5–5000), the audio block is exactly 128 frames, the camera size readable; the overlay
  shows numbers through the REAL Sound-panel buttons and hides again. CONTROL: `latPauseDbg(true)` — a paused meter must add nothing. The
  pure arithmetic: node row «LAT1 latency stats (core)» (exact values). PRIV1's CSP check is the runner's, not a P row.
- **LAT2 rows** (`src/probes/detect.js`; the fake camera has no hands — the schedule's reaction to hands is driven by a SCRIPT of hands in
  view per model run, L1 never seeing more than one): «LAT2a frame once» (quick, drawn, ≈ 10 s: a detector 120 ms slower than the
  camera, (a) awaited — snapshots dropped, never queued, no frame twice, always the newest; (b) blocking — by the camera's own frame
  counter no frame twice and frames skipped; CONTROLS fault 'dupe' and 'queue') · «LAT2a search schedule (probe clock)» (RUN 4: was «(live)», ≈ 9 s; now frames fed one at a time through the real pump —
  `vision.pumpStepDbg(n)` — ≈ 1.7 s, and each log must equal the core's own expectation `expectLog` frame for frame; quick, drawn:
  no hand → search exactly every 3rd processed frame; scripted one hand then two → track1 between searches, the second hand found by a
  search, track2 every frame after; a lost hand → 'track1>search' on the same frame; CONTROL `schedStay`) · «LAT2b worker = main thread,
  fallback» (P.all only, drawn, ≈ 35 s: the REAL switch puts detection in the worker; the same snapshots through the worker and a fresh
  main-thread detector → identical actions and results (CONTROL: the worker adds a hand); a worker that cannot start (`workerFail`) →
  the main thread with the reason; back to the default) · node «LAT2 search schedule (core)» (exact sequences, retry, policies,
  `handToSound` with `transfer`; CONTROL policy '1'). «LAT3 low light» (`P.checkLowLight`, quick, drawn, ≈ 12–15 s): capabilities and the
  three new lines in the Copy text; «short exposure» offered iff the camera has it; the REAL buttons 15 / 24 fps / short exposure — either
  held with the constraint set claimed (passed, against literals in the probe, AND the applyConstraints calls that went through — format
  and controls in separate calls; since CAM-FIX not `getConstraints`, which Chrome leaves on the last controls set) and a consistent
  verdict, or back at Off with a reason, today's format and automatic exposure (the runner's fake camera: 15 held, 24 refused by Chrome «OverconstrainedError (frameRate)», short
  exposure offered — range 10–100); a simulated OverconstrainedError and a simulated «no effect» fall back to Off and say so (meter and
  switch note), detection keeps running; CONTROL `lowDbg({noFallback})` must be flagged; hands lost through the real `latHands` (1·0·1 →
  one, away 1.3 s → none); «Too dark» through its real show path at the core's frame, taps pass, OK hides, granted 20 → nothing. Node row
  «LAT3 low light (core)» (exact: hint frame, never at granted < 24 / recovered in 2.5 s / 12.5 fps, once per session, waits for allowed;
  loss counts; constraint sets; verdicts; capabilities line; CAM-FIX restore set, heal list, the user's path exposure → 15 fps → Off through
  a minimal UVC model; CONTROLS: a hint without its 3-s wait, a counter without its 1-s limit, the pre-fix Off). «CAM-FIX camera settings
  restored» (`P.checkCamRestore`, quick, drawn, ≈ 2.5 s): the runner's fake camera always reads 'manual' and forgets on reopen, so a
  SIMULATED UVC webcam (the user's ASUS capabilities, controls that persist across opens, Chrome's routing of mixed sets) wraps the real
  track; through the REAL buttons: short exposure sets manual, Off brings automatic exposure + white balance + every other control back
  (values an automatic mode drives excepted) and the meter says so; exposure → 15 fps (15 reaches the format) → Off; a fall-back; an extra
  touched control (brightness) back to its original; pagehide (restored AND the camera released); 0a: a camera our test left dark (record
  stored, the page «crashed» — `lowDbg({crash})`) restored at reopen with the meter line and the record cleared; a manual setting WITHOUT our
  record stays as it is; the warning line. CONTROLS that must be flagged: `lowDbg({noRestore})` (the pre-fix Off), `lowDbg({noHeal})`,
  `lowDbg({healAll})` (the pre-0a heal of every manual mode). «CAM-START robust camera start» (`P.checkCamStart`, quick, drawn, ≈ 12 s):
  the real start made exactly one getUserMedia, never two at once; two opens at once are serialised; through a getUserMedia stand-in —
  not found, not allowed, no picture (busy), no answer in time — each fails after exactly one retry ≈ 1 s later, releases every track (late
  streams too) and the start card (`main.startFail`) shows the right message with «Try again»; the real camera reopens and detects.
  CONTROLS: `camOpenDbg({noSerial})`, `{noRelease}`, `{noRetry}` must be flagged. Node row «LAT3 low light (core)» also: the test record
  (`testRecNext`, `testRecRepair`; CONTROL another camera's record) and `camErrKind` (13 cases). The
  runner also checks every REQUEST of the session — page and workers (a worker has
  no page CSP of its own) — goes to the own origin or the MediaPipe paths; CONTROL: a worker asking example.com (intercepted, aborted).
- **GOLD timbres and effects** (`P.checkGold`, P.all only (slow), ≈ 60–120 s headless): 79 cases rendered alone through the engine copy
  (`render.goldRender(play, sec, chains, post)`: 48 kHz fixed, one seed, offline allocator — seeds the KS pluck —, tapped before the limiter,
  every chain owner on an explicit path; `post` = a master dynamics node, SND-F1): 23 solo, 17 chord (Firefly = `ch 16`), 7 bass timbres
  (one note), 5 kits × 6 rows, the drone (major, key 0, A4 440), vol/bright/glide at three values, reverb/delay/tremolo-mix/Night forest/Glue
  on the chord chain at three settings, the master Glue and Limiter (hot master) → features (mid loudness per 50 ms,
  side energy, 10 octave bands × 3 segments, dB) vs `tools/gold.print.json` (`P.dumpGold()` on unchanged code; renewed only by a slice
  that changes sound by decision, or by a Chrome update that changes built-in DSP — say so). Tolerance 0.01 dB per value; a value below
  `GOLD_FLOOR` −80 dB on BOTH sides is skipped (user decision SND-F1b: inaudible; «fx reverb 3» band 11 at −92 dB flickered ±0.012 dB),
  one side below is compared. CONTROLS: the copy's Warm pad chord filter +1 % (`CHORD_INSTR[0].lp`, restored) must leave its golden case;
  an audible band moved 0.02 dB must be caught, two values under the floor not, one under / one over compared. 82 cases since SND-F1b
  (+ `fx forest medium`, `fx forest short`, `master limiter (hold)`; the Long forest cases set `forest:room` 1 explicitly).
  ⛳ **Renewal rules (user decision, 2026-10-15):** (a) after a Chrome update Claude Code may renew `tools/gold.print.json` itself — only in a
  slice that did not change sound code, only if the shift is spread across many cases (browser-wide), reporting the largest before/after
  differences; (b) in a slice that changed sound code: never renew silently — explain every changed entry (new entries are appended, the
  existing ones stay byte for byte); (c) at the Rust → WASM engine switch: new-engine timbres get fresh entries and old ones are retired —
  matching the old sound is NOT required (new timbres may and should be better); only timbres the user explicitly asks to keep «close to
  the original» get a closeness measurement against their old entry.
- **SND-F1 rows** (`src/probes/sound.js`): «Firefly identity» (quick; one A4 note at velocity 0.7 through the chord path vs the prototype's
  function verbatim: equal after the chord bus level 0.28 within 1e-5 of peak — measured 1.4e-7; L = R; in the live engine a live strike
  routes live, a track owner's to the track chain, a stop before a strike cancels it; CONTROL: tine 4.3 × f must differ) · «Night forest IR»
  (quick; engine IR at 44.1/48 kHz and the live rate = the core's, exact; CONTROL: other rate) · node row «SND-F1 Night forest IR (core)»
  (pinned hashes 44.1 kHz `e3971e11`, 48 kHz `68fc1b7c`, envelope sample by sample, normalisation; CONTROLS: exponent 2.5, another seed) ·
  «dynamics: curve, latency, ceiling» (quick; one 5-channel offline render: Glue's steady gain = `compGainDb` ≤ 0.01 dB at 10 levels, an
  impulse out on its own frame, the Limiter never above its ceiling and exact identity below it; CONTROLS: ratio 2, Limiter off, the
  built-in compressor fails the latency check) · «dynamics live = offline» (slow, REALTIME ≈ 1 s: a fresh Glue node in the live context,
  captured on the audio thread, = offline within 1e-6 of peak; started 0.5 s ahead, a late start is named; CONTROL: makeup +0.5 dB) · «freeze parity (Firefly, Night forest, Glue)»
  (slow, REALTIME ≈ 10 s: a temporary Firefly track whose own chain gets Night forest + Glue in the editor; one warm-up play, then R.live
  captured (÷ the live master gain it contains) vs renderTrack
  (`dynLoaded`) — strike / body / room-tail energies within ±1 dB, LR1's tolerance; option `{room}`; CONTROL: the dry render misses the tail) ·
  «SND-F1b master path (live)» (slow, REALTIME ≈ 1 s: a −50 dBFS impulse into the live master, captured at its input and at `outLast` — same
  frame; CONTROL: a browser compressor on the same master comes out later — measured 264 frames = 5.99 ms at 44.1 kHz). The quick
  dynamics row also pushes many chords + drums 12 dB hot through `DYN_MASTER` (never above −1 dBFS) and reads the live path
  (`masterDyn().path` = glue → gain → limit, 0 ms). «Night forest IR» checks every room length and that a render's chain really plays it.
- **HAND1 gesture fingerprint** (`P.checkGesture`, quick and all, ≈ 1 s): a pose → 21-landmark generator and a scripted performance (solo:
  slow pinch, degrees, volume, register finger, 2–3 fingers; effects hand; lead-mode hand-over; hold; theremin; expression hand; bass and
  its theremin; latch on/glide/off; typed palette on Chromatic; drums; split; looper index/middle/ring edges, the 3-s pinky clear and its
  cancel; a hand leaving the frame) through the REAL `processHands` on the probe clock (`gestures.handsProbe({t, W:1000, H:600}, tap)`:
  time and play field from the clock, app-loop calls ignored, the machine's hands/latch/lead/expression state set aside and put back;
  looper commands printed and swallowed — the transport never starts) → per frame the W* calls (`recorder.wTapSet`), looper commands,
  tutor hooks, live voice keys, hand states, effect aims, the expression display and shown looper messages (English) vs
  `tools/gesture.print.json` (`P.dumpGesture()`). Environment pinned and restored (role, layout, hand functions, voice modes, fingers,
  major key 0, timbres 0, front camera, default crop, palette choice, displays); live chains or a non-default chord-mode choice → «not
  applicable». Recording is not in the print (push stamps from the audio clock; the W* stream is its input; funnels: «write path»).
  CONTROL: `gestures.pinchDbg(0.03)` (PINCH_ON + 0.03) must change the print (the slow approaches cross the threshold).
- **AR1 arrangement window** also checks AF4: no ❄ hittable; the freeze dot from `loopView.dots` — rendering = filled, waiting = hollow,
  frozen rows nothing; TF4: a row stale by A4 shows a hollow (waiting) dot, then re-renders and shows nothing; CONTROL: the rendering row must not read as waiting; the play strip has no dots and, with nothing
  armed, no mark column although a track is frozen and one stale.
- **Capture** (`audio.probeCapture`, audio-thread worklet): every probe checks its marker sits EXACTLY at `Mf − F0` and `gaps` is 0
  (`render.capAligned`), else the row errors with the reason; `R.capStats()` counts captures, stale readings, gaps.
- **LR1 live and frozen reverb agree** (`render.revAgree`): an organ chord (`CHORD_INSTR[2]`) with the chord reverb mix at full, played by
  `R.live` and rendered by the freeze path; tail energy re sustain and tail balance agree within ±1.0 dB each; controls (0.4-s tail,
  400-Hz tone) must fall outside.
- **AF2 freeze swap inaudible** (`render.swapCheck`, ≈ 28 s): temporary tracks at the song end, tempo 180, marker at a whole frame; cases
  and limits as in step 64 (`SW_LEVEL` 1, `SW_GAP` −6, `SW_CLICK` 3, `SW_ONSET` 10 ms, `SW_LEFT` −6, envelope onset `SW_ENV` 20 ms at
  `SW_ON_DB` −30 dB, control shift `SW_ON_CTRL` 15 ms); controls: `frzSwapDbg('old')` must exceed the leftover limit; a hard self-splice
  of the events capture must exceed the click limit.
- **AF6b 16-bit frozen playback** (`render.chunkCheck`, ≈ 17 s): runs A Float32 / B 16-bit / C defective chunks (shift by one sample, chunk
  dropped, a reader that ignores its stop) / D no scale; B vs A ≤ −90 dB re peak (`CK_RES`), reader vs render ≤ −100 dB (`CK_EXACT`),
  chunk-join step ≤ 3× (`CK_STEP`, ≥ `CK_JOINS` 3 joins), exact sample counts per reader, no leaked readers (`ALIVE` back to base within
  1.5 s); controls C and D must exceed −90 dB; the marker sample is excluded from comparisons. The 1.2 dB margin is deterministic (two
  overlapping readers at a seam ≤ 1 LSB = −90.3 dB).
- **render repeatability** (`P.checkRepeat`): dry ≤ 1e-4, wet ≤ 2e-4 of peak (samples and energy); controls pan 0.5 (> 1e-2) and level 0.9
  (RMS ratio exactly 0.9 ± 0.001); solo notes without a map put the live solo chain into the signature.
- **ED6 sections** (`P.checkSections`, quick and all, deterministic, no render): temporary material (a theremin take crossing a bar line,
  three reverb lane points, three markers; the range chosen from the song: notes start inside and others ring across it); insert k bars
  then cut them = the song again at four points — objects, order and payloads bit for bit, shifted beats to 1e-9 beat (a float shift and
  its inverse are not exact: 0.9 + 4 − 4 = 0.9000000000000004); insert / cut / duplicate expectations computed in the probe; ↶/↷ exact;
  touched tracks change their freeze signature, untouched keep it; the seed's frozen track goes stale / stays fresh; CONTROLS: a cut that
  forgets lanes, bends, brace, markers or backing lengths (`recorder.secDbg`) must fail the identity check. Restores the tracks' edit
  versions (`laneVerKeep`) so the frozen track is fresh again.
- **ED7 one history** (`P.checkHistory`, quick and all, ≈ 5 s incl. one re-freeze): a frozen track touched by ↶ goes stale; a sequence of
  16 steps of every kind, full ↶ and full ↷ compared EXACTLY with a snapshot after each step; CONTROLS: a step kind left out (`histDbg
  {skip:'level'}`) and a redo kept after a new step (`histDbg {keepFuture}`) must fail; the tripwire answers 'changed' after a direct write;
  300 steps kept. **OWN2 bend curve** (`P.checkBend`): move / clamp / first point / add / delete exactly as computed, refusals, one step
  each, undo/redo bit for bit; CONTROL: an in-place change survives ↶. ED7 (2b): ✕ then ↶ brings the brace and ⟳ back exactly, ↷ clears
  them; CONTROL `histDbg {noBrace}` must leave the brace following. **ED7-fix2 undo after clear** (`P.checkUndoClear`, quick and all, DRAWN,
  ≈ 6 s incl. re-freezing): the REAL ✕ button → toast with a visible Undo and the ↶-only transport (✕, ▶ hidden); toast Undo, transport ↶
  and Ctrl+Z each bring the song back exactly; CONTROL `undoUiDbg(true)` (no toast, strip hidden) must leave no undo control.
- **BEND-CURVE glides and shapes** (`P.checkBendCurve`, quick and all, deterministic, one short render): recorded curves schedule exactly
  (===) as before, chase entries too; hand points glide / curve ±0.6 / step through the editor (one step each, ↶/↷ bit for bit); the
  ramps applied by Web Audio itself (ConstantSource in an OfflineAudioContext) pass the curve within one sub-step's movement; the render
  copy schedules exactly `bendPlan` of what live replay derives (`render.bendTrace`); bus lane k merges and expands by `curveU`. CONTROLS:
  hand points as old steps miss the glide midpoint; the straight glide is not "above"; the glide does not "hold"; a lane without k sits on
  the line. **OWN1** rows: «OWN1 modes by degrees (sweep)» (`checkModeMap`, data, every view × every same-tuning same-size mode × every
  index and register vs an absolute-step reference; CONTROL: out-of-mode, ties and moved pitches present) and «OWN1 track into another
  mode» (`checkTrackMode`: solo, bass, chord tracks re-mapped exactly, refusals, the frozen track goes stale).
- **renders serialized** (`P.checkQueue`): two renders requested at once each equal alone (≤ 1e-4), the queue held both, song and queue
  untouched after.
- **MX1** (`P.checkMixer`): RMS ratio at track gain 0.25 within 2 %; frozen bus target 0.25, stays fresh; owner gains; master gain 0.8·v².
  **MX2** (`P.checkPan`): dry hard-left share ≥ 0.99, centre 0.5 ± 0.01, wet hard-left ≥ 0.8; pan change stales a freeze, restoring
  refreshes it.

### Ear-testing a render (`R.aud` / `R.live` / `R.stop`) — start HERE when a frozen track sounds wrong
`R.live(n)` (the track through the LIVE engine, transport stopped — reference; follows composition changes and automation at their beats,
smooth segments via `fxLaneExpand` at 25 ms) vs `await R.aud(n)` (render exactly as a freeze would, same seed, played at once through
`makeFrozenBus`; freezes nothing); options `{noHum:true}`, `{expr:'neutral'|'bypass'}`, `{mono:true}`, `{recSteps:true}`; `R.recSteps(true)`
everywhere; `R.stop()`. `n` = LAYER index from 0 (strip L2 = 1). A new hypothesis = one more `DBG` switch (off by default) + a line in
`render.audDesc`. Found and now engine behaviour: (A) a fresh attack sets its pitch; (B) phase scatter at build (`voiceStart`; chord/bass
pairs together). ⛳ Principle: a render is a re-performance on a FRESH engine copy — a note's sound must never depend on the engine's past
(attack pitch, oscillator phase, voice reuse, effect gates; plus master gain applied once). ⛳ Method: when a render sounds wrong, EAR-TEST
before reading code.

### Clip / audio recording
`clip.js`: video = canvas frames (HTML chrome excluded) + the audio tap (`createRecordingTap`, off `limiter`) in ONE WebM; audio = tap only;
mutually exclusive (`activeKind()`); buttons driven by real transitions (`onClipChange`). WebM/Opus (Safari may give mp4) — no MP3/WAV/MP4
promise. While video records, `videoRec` hides the canvas looper box.

### Backing (🎵) — Jam or Drums only
A tap from rest opens `#backingMenu` (Jam / Drums only); the pick starts at once (2 taps); later taps switch variant in that path, the cycle
ends OFF; long-press/right-click re-opens the menu. The menu counts as open for the auto-hiding bar (`backingMenuOpen()`). The playing variant
is NAMED (button `🥁 <name> · 4/10`, CSS ellipsis `#jamBtn{max-width:44vw}`, title, a toast on every change); `backingSel` = the actually
loaded selection; `backingName(sel)` via `L()`. Jam variants keyed on scale PROPERTIES (`supportsProgressions`/`supportsChords`, the mode's
`backing.rhythm` — maqsum for maqams); drums-only = `rhythmsForMetre(loop.metre)` (metre with no pattern → item disabled with a reason). Both
paths go through `loadJam` (one flag `ev.jam`); switching paths clears the previous backing. ⚠️ Known defect: drums-only has no cultural gate
(BACKLOG §3.33 item 1; fix must be property-driven). ⛳ TF2 (user answer Q3): a backing FOLLOWS THE KEY KNOB — `recorder.backingFollowKey()`
re-keys every `ev.jam` event's view in place (arrangements are written in degrees, so this IS the backing re-made in the new key): lane ids,
levels, pans and the transport are kept, its held notes handed over (`trackResplice(only)`), the drone retuned, its frozen tracks stale
(edit version) and re-frozen; not a history step (user answer 2, 2026-10-14). Its notes stay read-only in the editor (Transpose refuses
'backing'). Drum hits keep their view (no pitch — as in Transpose, so ↶ of a song Transpose restores the whole backing, TF3b); the TF5 cents
knob re-keys it too (a 12-note backing ignores cents).

### The expression hand (solo, function `'expr'`)
Plays no notes. Four features off RAW landmarks (`exprFeatures`): energy (palm-centre speed in palm sizes/s; position EMA before
differentiating, velocity smoothed `tauV`), openness, tilt (palm normal from landmarks 0/5/17 incl. `.z`), finger spread (mean pairwise tip
distance). Middle layer (`tickExpr` → `EXPR`): pump-and-decay resonator on energy (`kPump`/`tauE`), an inertia spring per channel
(`springF0` 2.5 Hz, `springZeta`, semi-implicit Euler), `engage` crossfade (`tauEngage`). Four channels → four axes (`applyExpr`,
`EXPR_A`): liveness (pitch+amplitude shimmer `vibHz`, `vibCents`), wah (high-Q peak `wahLo..wahHi`), texture (soft↔hard shaper morph with a
lowpass after), space (delay send). Brightness is deliberately not an axis. Invariants: rule #22 (sub-step `subDt`, `dtMin`/`dtMax` guard,
dead zones `smoothstep` → exactly 0, `orDead`, `sprMin`) and rule #23. The last expression hand that moved owns the instrument (`exprMoveT`).
On screen: one «ВЫР» bar + the hand-dot hue/size.

### The tutorial
`tutor.js`: `LESSONS` as data `{id, titleKey, descKey, steps, next, setup?}` (`steps:null` → «Soon»); steps `{key, gate?, enter?, done?,
final?, reveal?, skipIfDone?}`; `enter(acc)` zeroes what the step measures; `done(acc)` pure; `gate()` drops steps that don't fit the scale.
Chain: basics → chords → tunings → looper → handfn → split. Progress = a quiet ✓ in localStorage (`handsong.lesson.<id>`), never a gate;
finals are a choice card; Skip returns without ✓. One channel `hooks.tutor`; `apply(kind,p)` folds events. `teardown(completed)` is the one
exit. Setup must work from any previous lesson: `tutorReset` (single-role solo, split off, clean loop via `tutorClearLoop`, ALL `handFn`
defaults, every role's Volume back on Horizontal via `fxVolReset`); the Looper lesson switches to `MAJOR_ID` (found by `edo:12 &&
iv==='0,2,4,5,7,9,11'`); Chords and Split start on `CHROMATIC_ID` (`typedChords==='chrom12'`); Split: scale FIRST, then `tutorSplitInit()`
(bass right half if no chords). The strip hides under a working finger by FOCUS (`focusin`/`focusout`/`change`; a native `<select>`
swallows `pointerup`): `.mini` with a panel open, `.hushed` while a finger works inside, back ~1.8 s later.
⛳ **Strip visibility: `.on` is the ONLY gate** — `#tutorBar` `display:none` by default; `.mini`/`.low`/`.hushed` never carry `display`;
the collapsed rule is `#tutorBar.on.mini`; `syncTutorBarPos`/`hushStrip` bail out without `.on`; `teardown` removes all four classes;
`startLesson` calls `tutorSyncBar()` right after adding `.on`.

### Publication & PWA
Live at https://sonychailml-blip.github.io/handsong/ (GitHub Pages; custom domain `handsong.app` intended, not attached; no file in the
app references either URL — update only these docs). Also deployed on **Vercel** at https://handsong.vercel.app (production; user, 2026-10-15): `index.html` loads
**Vercel Web Analytics** (`/_vercel/insights/script.js`, same origin; cookieless page-view counts; inert on GitHub Pages, where the
root-absolute path does not resolve) — kept by the user and named in the privacy notice (Q14, 2026-10-14; register entry
`vercel-web-analytics`); ⚠️ Vercel's Hobby plan forbids commercial use — a paid plan or other hosting before selling. Installable: `manifest.json` (name «Handsong», standalone, three icons incl. maskable)
+ cache-free `sw.js`. Install button by REAL capability: Chromium → held `beforeinstallprompt`; iOS Safari → Share-sheet instruction;
standalone → hidden. If offline is ever wanted, the cache goes in `sw.js` — and MediaPipe from the CDN would still block it.

### Localisation
`LANGS=['en','ru']`. Interface strings in `DICTS` via `t()` (fallback current → en → `params.def` → the key itself, visibly); static markup
`data-i18n`/`data-i18n-title` via `applyI18n()`; JS-built strings redrawn from `onLangChange`; canvas calls `t()`/`L()` per frame. Musical
data names inline, three shapes: bare string (international notation, e.g. `'SuperSaw'`), `{default, ru}` (proper noun, transliterated),
full `{en, ru, …}` (translatable word); `L()` resolves `lang` → `default` → `en` → `ru` → first. ⛔ Identifier hazard (rule #25): `demo.js`
matches by `SCENES[].id`; `ui.fillScales` buckets by `grpKeyOf(s)` (caption via `L(grp)`).

### UI shell
Start card: Play and Learn (both via `main.startApp`, AudioContext inside the click); below them ⛶ fullscreen then ⬇ install (either may be
absent); footer: 🌐 language, note, feedback link, donate (hidden while empty), JS-assembled e-mail. `#helpOv` unreachable from the UI (to
move into the tutorial). Top bar auto-hides (`.min`) after ~3.5 s, reveals on tap/mouse-move (8 px); collapsed keeps only role
indicator(s) + the three record buttons — the same DOM elements; never hides with a panel open or a pointer down; ⛶ in the bar (not in the
collapsed strip). Panels light and opaque, three in one place, opening one closes the others: «Scale» (`#panelScale`), «🎛 Sound»
(`#panelSound`), «Looper» (`#panelLoop`). Transport under the strip: ▶ ⟳ ⤺ ✕ ■ ✎ in play; ⏮ ▶ ⟳ in the window; ⏮ ▶ in the editor.

## Known limits (design around them; reasoning: archive, "Known limits")
- **A chain reordered during a take renders in its earlier order** (gating can't reorder; report `reordered`); live gates fade (τ 0.08) and
  live dips ~40 ms on a composition change that changes the wiring, the render switches instantly; a re-opened live effect may hold an old
  tail, the render's opens empty.
- **One TRACK network per role** (since AF5 the live network is the hands' alone, rule #31): unfrozen tracks of the SAME role share the
  role's track chain — the last writer wins among them (a frozen track has its own sound in its buffer). Per-track chains = BACKLOG.
- (VOL-6 CLOSED 2026-10-14: the user tested that a ringing latched chord follows the hand after release — left–right volume, near–far
  timbre; the old limit «a latched chord with open fingers receives no updates» was wrong.)
- **Several takes through one chain: last writer wins** (sorted `(t, tk)`; ties by higher take; a take governs only its roles' owners);
  network parameters, compositions and expression channels only.
- **Randomness:** see "Audio engine — random draws"; nothing random is recorded; "the same performance" is the requirement.
- **Same performance, never the same samples:** summand rule (1–3 ULP); thresholds relative to peak (dry ≤ 1e-4, wet ≤ 2e-4); dry drift up
  to 1.54e-5 of peak after many renders (node unknown).
- **A track's chain in the editor is the union of its captured takes' snapshots**; mid-take effects are not moved/removed by ▲▼⊘; an effect
  in one take's snapshot but added mid-take in another is removed only from snapshots.
- **Track chains belong to the ROLE, not the track** (rule #31 separates live from tracks, not track from track).
- **Songs save as FILES by hand and AUTOSAVE on the device** (SAVE1, AUTOSAVE1): autosave keeps the last 5 SONGS (one entry per song id,
  not versions of one song; the undo history covers the steps); a probe's test song (P.seed/P.song) is never autosaved; the offer appears
  only at ▶ Play on an empty song (not from a lesson); a private window keeps autosaves only while it is open; SONG1: a song carries
  copies of the person's own tunings / modes / palettes / chord-mode sets (`records`, file version 3) — a mode this app lacks plays from
  the copy (installed for the session, «Keep in my scales» stores it); where the app HAS the id, its own record wins (rule #37); an older
  (v2) file without copies opens only where those records exist; a timbre this app lacks plays as the
  live timbre of its role (its settings stay in the song); `a.ty` comes back as a fresh array (compared by value — `tyEq`); the undo
  history is KEPT across Open since SONG3 (RUN 4): Open is ONE step labelled 'open' (Open still asks first when the song has unsaved
  changes). SONG3: `recorder.songOpenApply(P, meta)` takes a diff snapshot ('snap', label 'open') that also carries the brace, the song's
  settings `st` {aRef, metre, bpm, bars, sub, quant, master} (applied while the song is empty — the metre can change only then) and the
  Song-file name/id `m` (↶/↷ hand them to ui through `hooks.songMeta`, so autosave writes under the right id); the LIVE scale / key / tonic
  cents the file set are listening settings and stay (as for every step). P.song / P.seed still reset the history. Row «SONG3 Open is one
  ↶ step» (P.quick, P.all; CONTROL `histDbg({noOpenSt})`).
- Captured expression channels are not replayed (`fxPlaySet` drops `'expr'`) — BACKLOG §4.
- **A render of a KS (plucked) track pins its offline context** (≈ 6 MB per render, Chrome; other tracks are collected since RENDER-LEAK).
  Since SND-F1 the same holds for a track whose chain holds Glue (the dynamics worklet is loaded only then).
- **Firefly (SND-F1) is a one-shot struck timbre:** a struck note rings out its decay (≤ 1.65 s) after a release, a mute or a stop — only
  strikes that have not begun are cancelled; level, pan and brightness are taken at the strike (a mixer move or a depth change does not
  reach a ringing strike); a chase (start/seek into a held chord) strikes again, as a KS pluck re-plucks. Offered only as a CHORD timbre:
  ⛔ no new solo timbre until stable timbre ids (HANDOFF) — bass/solo Firefly wait for TIM1.
- **Hand detection (LAT2):** a hand entering while one or none is tracked is found by the next search — up to 2 processed frames later
  (≈ 0–70 ms at 30 fps; before LAT2: the next frame); a hand lost by tracking is searched for on the same frame. The worker path runs the
  model ≈ 2× slower on the user's desktop GPU (WebGL in a worker), hence not the default. The picture (matched to hands) updates at the
  detection rate, not the camera's, while hands are in view. Each camera frame costs one ImageBitmap copy (≈ 0.1 ms).
- **Low light slows the camera (LAT3):** a webcam lengthens its exposure in the dark and delivers fewer frames (the user's desktop: 6.3 fps
  in the evening vs 14–30 by day — the frame wait ≈ 79 ms then dominates hand → sound). No web API sets a webcam's «exposure priority»;
  `frameRate.min` may be refused (OverconstrainedError) or ignored by the driver; manual exposure exists only on cameras that report it, and
  a shorter exposure means a darker, noisier picture. The real remedy is light on the hands (BACKLOG §7.18). The hint needs
  requestVideoFrameCallback (no hint without it). CAM-FIX: «short exposure» writes the webcam's OWN exposure (a UVC control that outlives
  the page and other apps — restored per rule #34; in the evening 23 ms instead of the camera's own ≈ 100+ ms is ≈ 5× less light); the
  frame-rate tests write no camera control (only the requested format; a driver may shorten its exposure while one runs, never after). A
  restore is best effort when the page closes; the next open heals.
- **Night forest is costly** (offline render time per second of audio on the dev desktop, SND-F1b): Short ≈ 14 %, Medium ≈ 15 %, Long
  ≈ 27 % of a core; three Medium rooms at once ≈ 48 %, three Long ≈ 122 % (Chrome's partitioned convolution is not linear in length — Short
  saves little over Medium); a phone ≈ 4×. Each chain that holds it has its own convolver (live and track chains separate) — a SHARED
  reverb send (one room per network) is proposed, not built. A Room change swaps the IR at once (cuts the ringing tail); a Room change
  recorded mid-take is applied from the render's start. Under heavy outside load (the user's Chrome + VS Code busy) the LIVE convolver once
  played body/tail −1.2…−6 dB short of frozen; with 3 busy worker threads (SND-F1b) Medium and Long agreed within 0.4 dB — not reproduced.
- **AF5 cost:** ≈ 100 extra GainNodes on the live graph (24 chord routers × 2, built solo voices × 4, bass voices × 3, 4 heads + 4 outs) plus
  the track chains' effect instances when tracks play (a chord reverb ≈ 49 nodes). Synthetic bench on the (slow) dev desktop: routers ≈ +4 %
  of real time, one extra reverb network ≈ +1 %; a phone may be ≈ 4× that — not measured on a phone.
- **The one history (ED7)** keeps 300 steps; mute/solo/arm, the brace, tempo and tonic are not steps; ✕ resets a user brace to following
  (↶ of ✕ restores the song AND the brace with ⟳). A note starting inside a cut is removed with its tail; a note closed by the next note's
  start exactly on an insert point is lengthened (held through the new bars); insert-then-cut leaves beats equal to ~1e-15 beat, not bit
  for bit (float). Copies of a duplicate belong to the source take (⤺ of that take removes them too).
- **After an A4 or tempo change frozen tracks play their events** (through the live pools, with their polyphony ceilings) until they
  re-freeze — 1.5 s after the last move plus one render per track, one at a time (TF4). The key knob stales nothing (TF2).
- **Transpose keys stay within −12..23** (two octaves around the knob); a track or song already there refuses one more step ('range').
- **Paste and arming respect the key** (TF2; accepted by the user 2026-10-14): a clipboard pastes only into a track of the same view — key and
  TF5 cents included; an armed track recorded in another key than the knob's takes nothing (a new track starts, as for another mode). Later:
  «paste transposed into the track's key» (BACKLOG §3.40).
- **The cents nudge is offered only for 1/1 tunings** (TF5); a 12-note tuning in another temperament than 12-TET is moved by A4 (one
  source). Song Transpose moves the knob mod 12 (B + 1 → knob C while the song sits at key 12).

## How to verify a change (full steps, moved at DOC1)
1. Play → camera; app starts single-role solo; the bar hides after ~3.5 s, reveals on tap; not with a panel open. Learn opens the lesson list.
2. Roles play; ● records a take, again stops; a second take = a new row; ⤺ removes the last take; arrangement from beat 0; three panels in
   one place, one at a time.
3. Typed chords (Chromatic, 31-TET, 19-TET): palette by left index pinch; 19-TET minor beats less than 12-TET; 31-TET dom7 = 4:5:6:7.
4. Cents scales (Slendro/Pelog): uneven, octave 2:1, real cents in the tag; gamelan shows the no-chords hint.
5. Six menu sections in order (Common · Middle East · India · Java & Far East · Historical Europe · Experiments); symmetric scales in Common;
   Europe flat and chronological; Experiments only tunings; no sound changed.
6. Split (landscape ◨): halves with their roles; either hand plays the half it pinches; a latched chord rings while the other half plays;
   own register bands; role buttons skip the other half's role; bass/drums stay in their half; FX bars vanish without a solo half; portrait
   auto-disables split.
7. Rectangles: Y picks the rectangle, finger 1 of `k`; 31-TET 8+1 and Partch 11+1 byte-for-byte; 19-TET and Carlos γ 10+1 over two octaves
   with a window band («oct I–II»…).
8. Partch: 11-limit JI; O7 beat-free 4:5:6:7; a recorded Partch chord replays in JI; "Free" every type everywhere; "As on the instrument"
   greys unfit types and a pinch there sounds the root alone with a tag reason (replays as one note).
9. Theremin (hand function, solo and bass): additive centre lines only when assigned; continuous glide; the recorder stores the nearest step;
   bass theremin lower.
10. Bohlen–Pierce: tritave registers, labels `Т,2,3…`, word «тритава»; "Free" pure ratios incl. 11-chords; "As on the instrument" steps
    (3:5:7 = 0·6·10, beats slowly), no 11. Carlos α/β/γ: fifth period, word «рег.»; γ rect; all three no chords.
11. Historical (Europe): Pythagorean alike in every key ("tuned from" = tonic); "from C" → key colours (A major third ≈ 384¢, F# 678¢ wolf);
    moving it never retunes recordings; Natural "Free" pure; fixed grids → pure and wolf; real note names on fixedKey scales.
12. India: 22-shruti uneven, «свара · шрути» (tonic «Са · Чхандовати»); ragas swaras only; no-chords hint; status «cents tuning · N steps».
13. Camera switch 🔄: front mirrored, back not; picture and hand flip together; no second camera → toast.
14. Cover: no stretch on desktop or phone; the hand runs off the edge at the outer rectangles but tracking survives; hand and cell aligned;
    the video clip unstretched.
15. Clip/audio 🎥/🎙: canvas+sound vs sound only; mutually exclusive; buttons return to rest.
16. Backing 🎵: chooser, named variant + toast, cycle ends OFF, long-press menu, drums-only by metre (7 → only «Balkan 7»; disabled at 5/10/12),
    menu keeps the bar up, never deletes the player's layers.
17. Hand functions: separate per role and persistent; hold freezes the note (volume follows X); two solo hands independent; chords
    fx/latch/hold/loop; drums fx/hit/loop.
18. A4: presets (415…444) or 380–480 input (nonsense reverts); 415 lowers everything ~a semitone, mobile and fixed together; drone follows;
    440 byte-for-byte.
19. «Tuned from C (historical practice)» only on the five C-tuned fixedKey scales (follows language); Werckmeister third ≈ 390¢ in C,
    ≈ 408¢ in F#; mobile Natural transposes without character change; cents whole numbers everywhere.
20. Chord readout: live chord lists Hz + cents above root (Partch O7 → 386/702/969); disappears on stop; replayed chords plain.
21. Metre (only empty + stopped): 7 accents 3+2+2; 16 four vibhags, weakened third; count-in one bar; patterns of other metres skipped.
22. Timbres: FM bell/metallophone inharmonic; KS in tune over the whole range; worklet failure → plucks without index shift; fullscreen
    toggles stay in sync, Esc updates them, hidden where unavailable.
23. Chord hold + brightness: hold stops on release; depth changes timbre not pitch; a recorded track keeps ITS brightness; a latched live
    chord survives brace seams.
24. Looper hand: index record (armed track if any)/stop, middle play/pause, ring undo, pinky ~3 s countdown clears (early release cancels);
    named confirmations and reasons; one command per pinch; transport buttons still work.
25. Subdivision: Shuffle limps (long-short); other 4/4 patterns distinct; the original 8 unchanged; arrangement drums use the selected kit;
    division 3 → triplet quantise + faint ticks.
26. Tutorial strip: with no lesson running, opening a panel shows nothing at the bottom (also after finish/Done/Skip/chaining).
27. Expression hand: no notes; resting hand gives exactly zero; movement pumps and decays; jerks overshoot and settle; four distinct axes;
    no 5–8 Hz wobble at low fps; off → solo chain exactly as before.
28. Tutorial: a picked lesson starts the app in the same click; lessons completable after any other (hand functions reset, nothing keeps
    playing, the Looper lesson's chords sound); finals are choice cards; Skip without ✓; strip one line with a panel open, gone while a
    finger works a `<select>`, back ~1.8 s later.
29. Localisation: 🌐 switches chrome, options and canvas labels; survives reload; the demo still plays the right scales; menu groups same.
30. Note layout: default «By mode» unchanged everywhere; never disabled; major in rectangles = 8 rects, 4 octaves, no band, real names,
    register markers, chord highlight in the right block; chromatic 12; pentatonic k=3 (idle pinky dim `—`, «finger not used»); 22-shruti
    k=2; BP 7; theremin lines k per rectangle; a recording replays identically in the other layout.
31. Polyphonic solo: one note sounds exactly as before on every synthesis path; two hands sound together; release stops only that note;
    old loops replay identically and no longer fight live play; bends bend only their voice; a replayed layer doesn't change the live
    instrument; stealing takes released tails first; highlights per rectangle and finger; «Fingers per hand» 1 keeps the glide; 2+ fingers =
    two notes, recorded as two `a.v` streams; eight at once with both tags; legend low at the bottom.
32. PWA: ⬇ only after Chromium offers it; iOS shows instructions; standalone hides both; nothing cached.
33. Linear time: 8 bars play and STOP; ▶ from the end restarts; the strip never grows past the material without repeat; pause + ▶ resumes
    with held chords sounding (chase).
34. Brace: follows («auto»), drag to 3–5 (solid, stays); ⟳ cycles exactly those bars, accents on the bar; ⟳ off/on doesn't move it; ● from
    stop counts in the bar before and records from bar 3; edits refused while recording.
35. Chase: chord/bass/theremin held into a brace sound from the first moment of every pass; muted tracks silent.
36. Tracks: M/S instant; tap a row to arm (outline, «REC → L2», «(not heard)» if muted); ● records into it for that track's source only; old
    and new material both sound.
37. Undo/delete/clear: ⤺ removes the last take (merged takes leave earlier material); row ✕ needs a second tap within 3 s, removes only that
    track, not undoable; transport ✕ clears everything.
38. Stops: pause holds; panic silences and rewinds to the brace start keeping song/brace/mutes/arm; both close held notes in a recording.
39. Track editor: open from the arrangement window (refused while recording/clip; ● refused while open); no phantom pinch on close; drums 6
    rows; pitched rows fill or scroll, named in the track's OWN scale; move/resize/insert/delete/↶/↷ (a new edit kills ↷); independent bass
    notes (E1/E2); no role selector; timbre select (one ↶/↷, frozen goes stale, effects unchanged); ⌫ deletes, not in text fields; chords
    (U2–U4: notes never leave the grid, off-row deviation marks, two-level selection, dissolve on delete/move/resize/pitch, snapping onto a
    row, no-op when released on its own row); backing refuses note edits but accepts timbre; drone has no timbre select; duplicate-tonic row
    dimmed; T3 «All»/«Mode» axes.
40. Serial chain: swapping reverb/delay order is audible; mix 0 = exactly no effect; old layers keep drive/vibrato/tremolo, reverb/delay from
    the live chain.
41. Capture and playback: a swept bus knob (also with a latched chord and open fingers) is recorded and replayed; live knob doesn't reach it;
    bars follow the hand, driven ones hollow; stop returns to the hand; later take wins at the same beat; lane points drawn as steps,
    vertical tenths/units, sideways free, ↶; adding an effect to a chain-less track keeps its sound then detaches it from live knobs;
    per-note lanes from the notes (not hollow during ▶); a mid-take reverb listed, not re-offered, frozen copy brings it in at its moment.
42. Per-pass closing: held solo/bass/latched chord across seams while recording — every pass sounds, nothing rings past its end, the live
    latch never broke.
43. Freezing (by itself since AF3/AF4): a frozen track sounds the same (reverb micro-structure may differ); an edit → it plays its events
    until it re-freezes; a frozen sustained bass survives tonic/A4 changes while playing; a track starting at bar 3 enters at bar 3; a drone
    backing not doubled; console `R.freeze`/`R.unfreeze` still work.
44. One role and timbre per track: split solo+chords in one take = two rows, one ⤺; solo timbre switch mid-note continues in a new row (20 ms
    crossfade, replayed); bass switch mid-note stays; an armed track of another timbre → a new row with the header message; a chord latched
    before ● is written from the first beat.
45. Voice modes and glide: defaults unchanged; poly bass, lead solo (one note, hand-over, glide back); switching with a held pinch; mid-take
    change stays in the track; Glide added changes nothing until moved, heard only on legato moves; backing bass ignores the hand's glide;
    frozen first note without scoop, SuperSaw without swirl.
46. Smooth automation: two points on Reverb·Mix → a diagonal and a gradual rise; ╱/⌐ toggles with toast, ↶/↷; a swell inside one held note;
    frozen glide = events (`R.live(n)` vs `await R.aud(n)`); untouched recordings unchanged; no console errors.
47. Volume on depth (VOL-4): defaults unchanged; Volume on «Playing hand → Depth» per hand (nearer quieter, Invert flips) on every role;
    brightness and volume on depth move together; recorded as played.
48. Sevenths that add no note: greyed with one line in blues, major blues, whole-tone, Prometheus; works elsewhere; the choice is kept.
49. Dimmed rows (T5): bass onto C#, one chord note onto a dimmed row, a whole untyped chord keeps its sound; seek/freeze correct; «Mode» shows
    out-of-mode notes between rows with «+100»; ✚ on a dimmed row inserts there.
50. Insert (U5): dimmed row inserts a bass note; nothing selected → one note; a whole chord selected → its shape (bright untyped follows the
    rule, typed exact); one note selected → one note; no dissolve; ↶/↷.
51. T7: Partch on 1/1 full palette, elsewhere greyed with reason, offered chords pure; BP from steps, no 11 (now the "As on the instrument" mode).
52. T7b chord modes: row only on Partch, BP and the 14 modes; Free vs As on the instrument; Stacked vs Power chord; recordings keep their
    mode; a new mode starts a new track; non-default mode on the scale button.
53. Solo in the editor (S4): move/resize/delete/insert with undo/redo; lead-line detach re-articulates; pitch-only keeps the glide; inserted
    note copies the neighbour's map; frozen goes stale; theremin moves/transposes with its bend.
54. Theremin length and curve (S5): curve drawn as steps in both views; shortening trims the bend (↶ restores); lengthening holds the last
    value; stop/pause mid-bend then plain notes — none bends.
55. Tie pairs (S6): moving/deleting a shared edge unties both (second gets its own attack); ↶ continuous again; pitch-only keeps the pair; a
    frozen partner goes stale; deleting one row unties the other.
56. More tracks than the screen: `P.seed` 18 tracks; rows scroll with a footer and bar; taps still arm/mute/solo/delete; transport visible;
    L18 opens in the editor; few tracks look as before.
57. Arrangement window (AR1): all tracks, thumb-sized rows, miniatures, scroll/zoom/⤢; row → editor at the same span and back; M/S/arm/❄ work;
    ▶ playhead; brace band; portrait fits; play strip unchanged.
58. Mixer (MX1): 🎚 faders and master strip; fader changes only its track; 0 = silent; double-tap 100 / 0 dB; frozen level changes, ❄ stays
    blue; master moves all; meter and limiter readout; ▤ back.
59. Pan (MX2): hard left/right in headphones, centre as before; «L 100»/«C»/«R 100»; double-tap centres; detent; frozen pan change → orange,
    re-freeze → blue, restoring → blue; live hands centred.
60. Fast probes: `P.quick` < ~30–40 s, `P.all` with time printed; hidden tab → «not checked: tab hidden»; `node tools/probe-data.mjs` PASS.
61. Names, colours, order (AR2): «role · timbre» in role colour (distinct in greyscale); double-tap rename shows everywhere; empty → default;
    drag handle reorders everywhere; new take last; event ticks in role colours; phone-width works without zoom.
62. Live reverb (LR1): the room sounds the same after reload and frozen (`R.live` vs `R.aud`); `R.liveReverb` gone; row «LR1 live and
    frozen reverb agree» PASS; strip labels inside the frame at 360 px.
63. Freeze queue (AF1): audible tracks near the playhead freeze first; no new render while recording; costly layouts wait while pinching;
    a track changed while waiting renders once after it settles; `R.autoFreeze(false)` drops waiting ones for the session; `P.freezeCost`.
64. THE SWAP (AF2) — ear test on a held pad (headphones): freeze a long pad while it rings → swap at a bar line with no dip, click or swell;
    rests → nothing to hear; under a brace → at the seam, no doubled attack; stopped → starts exactly like the events. Row «AF2 freeze swap
    inaudible» is run by the runner (`--all`): stopped (envelope onset ≤ 10 ms, level ±1 dB, click), held pad (jump ±1 dB, gap ≥ −6 dB,
    click ≤ 3×, leftover ≤ −6 dB), control old swap (leftover > −6 dB), control hard splice (click > 3×), rest (leftover ≤ −6 dB; jump is
    information), loop seam (jump, gap, click).
65. 16-bit frozen tracks (AF6b) — ear test: a frozen pad and drum track with ⟳ across a bar line — no click or gap at the wrap or on seeks;
    nothing sounds different; `P.freezeCost` «today MB» = real 16-bit bytes; row «AF6b 16-bit frozen playback» (runner).
66. The first attack of a track (AUTO-PROBE fix): a percussive chord track starting at bar 3, ▶ from bar 1 → the first chord at bar 3 has its
    full attack on the beat (before: its first ~40–100 ms swallowed by a needless chord-bus dip). Same for solo/bass tracks starting later.
67. Auto-freeze (AF3) — ear and eye, arrangement window open: (1) record a take, stop — about a second later the row's dot goes hollow →
    pulsing → gone and NOTHING audible changes; (2) edit a track in the editor and leave it — the same, once, ~0.5 s after leaving; (3) move
    a pan control and release — the same, ~1 s after release (moving a LEVEL fader shows no dot); (4) change the tonic — no dot, nothing
    re-freezes, the recordings keep their key (TF2); (5) change A4 — see step 89.
68. No ❄ anywhere (AF4): play strip (no ❄, no stale mark), arrangement window (M · S only; the faint dot only), editor bar (no ❄, no state
    label), no toast about freezing; row «AR1 arrangement window» checks the dot states.
69. Track ≠ live (AF5, rule #31), headphones: record a chord track, lower its volume (Volume lane) and its reverb in the editor, leave — live
    chords stay at full volume and reverb, the track plays quieter; turn a live effect with the hand (chord reverb) while the track plays —
    live chords change, the track doesn't; the same with `R.autoFreeze(false)` (`?probe`) and with the track frozen.
70. The first attack of a track after ▶ is still whole (ear step 66) — the track chain rewires without a dip at a start.
71. Several notes (ED1), eye: ⬚ on → taps add/remove notes (white), a drag on empty space draws a box and adds what it covers, Esc clears,
    Ctrl+A selects all; drag one selected note — every selected note follows (dashed ghosts), rows too; one ↶ puts all back, ↷ again;
    🗑/⌫ deletes the group (one ↶); a fully selected bass/solo glide moves as one gliding note; with ⬚ off, tapping a note selects it alone.
72. Copy/paste/duplicate (ED2), eye and ear: select notes, ⧉ (toast «Copied: n»), move the playhead, 📋 → the same notes at the playhead,
    selected, sounding the same; ⧉⁺ → a copy right after (a phrase longer than half a bar lands on the next bar line); paste into another
    track of the same role and mode → they take THAT track's timbre; into another role or mode → a toast says why; one ↶ per paste.
73. Quantise (ED3), eye and ear: select a few loose notes, ⌗ with «1/4 · Starts · 100%» → their starts sit on the grid lines, lengths kept,
    same pitches; «Ends» → only the ends move; 50% → halfway; a selected glide's middle pitch change moves onto the grid and the line stays one
    gliding note; already on the grid → toast «Nothing moved»; one ↶ puts everything back.
74. Transpose by degrees (ED4), eye and ear: select a melody, +1° → every note one degree of ITS mode higher (in major C→D, E→F), times
    unchanged, a glide stays one gliding note; a note outside the mode (C# in C major) +1° → D#; −1° back; a chord moves to the next
    degree's chord of the mode; past the top register → toast, nothing moves; Alt+↑/↓ do the same; one ↶ per press.
75. Volume bars (ED5), eye and ear: open a track, lane → Volume — bars, one per note; drag one down → that note is quieter, the number
    beside it; drag a bar of a selected group → all selected move together; on a drum track with kick and hat on one beat, lower the hat
    only — the kick keeps its volume; •— shows the line again; one ↶ per drag.
76. Sections (ED6), eye and ear, arrangement window: tap the sections band at bar 3 and bar 5 — markers A and B; double-tap A → rename
    it; tap A → the brace covers bars 3–4; ✂ → bars 3–4 are gone in every track, what followed plays right after bar 2, a held chord
    from bar 2 stops or rings on as before, frozen tracks re-freeze by themselves (dots); ↶ → all back; ⧉ → bars 3–4 play twice; ＋▯ → two
    silent bars before bar 3 (a chord ringing across keeps ringing through them); ↶/↷ after each.
77. Section rename (ED6 fix), mouse and finger: an empty sections strip says «+ section — tap here…»; tap it → marker A; double-click /
    double-tap the name → the field opens and stays (type, Enter); or tap the marker once and press §✎.
78. One undo (ED7): record a take, move a note in the editor, close it, lower a track's fader, rename a track, cut bars in the window,
    press ⤺ — then ↶ (play screen, window or editor, or Ctrl+Z) seven times: each step comes back in reverse order with a toast naming
    it, the take last; ↷ (Ctrl+Shift+Z) replays them; a new edit after ↶ greys ↷; ✕ clear then ↶ → the whole song is back; a frozen
    track touched by ↶ re-freezes by itself (its dot in the window).
79. Bend curve (OWN2), eye and ear: select a theremin note — white dots on its curve; drag one up → it bends higher (dashed ghost,
    «+35¢ · 1.25»), sideways → it moves in time but not past its neighbours; ✚ then tap inside the note → a new point; 🗑 → the selected
    point goes (the first one stays); each one ↶; play it — the replay follows the new curve.
80. Brace after ✕ (ED7-fix): set a brace on bars 3–5, ⟳ on, press ✕, then ↶ — the song AND the brace on bars 3–5 with ⟳ on are back.
81. Bend glides and shapes (BEND-CURVE), headphones: select a theremin note, ✚ and tap two new points far apart in pitch — on ▶ the pitch
    SLIDES between them (no jump); drag the diamond in the middle up → the slide arrives early, down → late; tap the end point, then ⌐ →
    hold then jump; ╱ → slide again; each one ↶; an old recorded theremin note sounds exactly as before; on a chord track's reverb lane,
    select a point → its diamond bends the reverb ramp the same way; frozen and live sound the same (`R.live(n)` vs `await R.aud(n)`).
82. Track into another mode (OWN1), ear: open a C-major solo track, Mode → Dorian — E becomes E♭ and B becomes B♭ everywhere, rhythm and
    volumes unchanged; a C# (outside the mode) stays C# — it keeps its distance from C, the nearest degree below a tie; ↶ brings major back; a frozen track re-freezes by itself (dot).
83. Undo after ✕ (ED7-fix2): with a few tracks, press ✕ — the strip disappears, a box «Song cleared — ↶ Undo» shows for ~6 s under the
    top bar and a lone ↶ ↷ stays where the transport was; tap Undo in the box → everything is back; ✕ again, wait 6 s, tap the lone ↶ →
    back; ✕ again, Ctrl+Z → back. With nothing recorded and an empty history, nothing extra is shown.
84. The key knob (TF2), headphones: play a few recorded tracks and change the tonic in «Scale» — the recordings keep sounding in their key,
    without a gap; your live playing follows the new tonic; in the arrangement window no freeze dot appears on frozen tracks.
85. Backing follows the key (TF2, Q3): start a Jam backing, change the tonic — the backing re-plays in the new key at once (a held chord
    moves), the transport keeps running; a recorded track does not move.
86. Key change while recording (TF2, Q2): record solo, change the tonic mid-take, keep playing — the notes after the change land in a NEW
    track; one ⤺ removes both.
87. Transpose (TF3): in the editor bar «−1 st / +1 st» moves the whole open track a semitone (a toast, one ↶); in the arrangement window bar
    «−1 st / +1 st» moves the whole song (backing too, drums untouched; one ↶); from B a step up goes to C ABOVE, not an octave down; in
    Werckmeister the key colour changes; in Partch / Bohlen–Pierce the 1/1 moves 100 cents; frozen tracks re-freeze (dots).
88. Song Transpose moves the knob (TF3b): note the tonic in «Scale», press «+1 st» in the arrangement window — the tonic reads one semitone
    higher and your live playing fits the song; ↶ — song and tonic back; in the editor «+1 st» leaves the tonic alone.
89. A4 / tempo re-freeze (TF4), headphones, window open: change A4 (e.g. 440 → 442) while frozen tracks play — they keep sounding (now note by
    note, at the new pitch); ~1.5 s after you stop, the dots go hollow → pulsing → gone, one track at a time, with no audible seam; the
    same with the tempo.
90. «1/1 = G» (TF5): pick Partch — the key row reads «1/1 =» with a ¢ field and a button «Historical 1/1: G»; the knob did NOT jump to G
    by itself; type 12 in ¢ → live notes a little higher, the scale button shows «+12¢», recordings unchanged; tap the button → G, ✓,
    disabled; pick a 12-note scale — the ¢ field and the button disappear and nothing is nudged; an old Partch recording sounds as before.
91. Privacy (PRIV1): the start card's footer ends with «Privacy» — a tap opens two short paragraphs (what stays on the device; the Vercel
    counter), in English and Russian; the app starts and plays as before (camera, model, sound). On the Vercel copy: DevTools → Console shows
    no «Refused to …» line and Network shows the counter's `script.js`/`view` requests (same origin).
92. Latency meter (LAT1), on the phone AND the desktop: ▶ Play, then «🎛 Sound» → at the bottom «Diagnostics · Latency meter» → On. A
    small box top-left shows, in ms (average · 95 %): camera fps and «picture taken → app», hand detection, gestures, drawing and the frame
    interval, sound (buffer · output device · audio block · measured path), long tasks in the last minute and «Hand → sound ≈ N ms». Play
    for ~20 s with a hand in view, then «Copy» and paste the text to the strategist. With Bluetooth headphones a one-time warning appears
    ~4 s after start (or after switching the output); the box adds a Bluetooth line. Off hides the box; nothing else changes.
    LAT1b adds lines (camera asked vs given, «camera delivers N fps · we process N fps» (SND-F1b; the wait from the delivered rate), master
    path ms, frame wait, duplicates per minute, model GPU/CPU, graphics hardware/software, long tasks at
    startup and while playing with causes, «Hand → sound incl. frame wait»). LAT2/LAT3 add: where detection runs, tracking vs full-frame
    search, «the model ran on N of N frames/s», the camera's name and capabilities («Camera «…» can: frameRate … · exposureMode …»), the
    low-light line, hands lost per minute, and when the longest startup task began. Test switches under the toggle (session only, defaults
    = the app as before): «Hands tracked» 2 · search every 3rd frame (default) / 2 · every frame / 1; «Hand model on» GPU/CPU; «Camera frame
    rate» default/30/60; «Detection runs in» main thread / background worker; «Low light» Off / at least 15 fps / at least 24 fps / short
    exposure (only if the camera has it). Measurement plan: HANDOFF, LAT1b.
93. Firefly, Night forest, Glue, Limiter (SND-F1), headphones then the phone speaker: «🎛 Sound» → «Chord instrument» → «Firefly»; the
    Chords role; pinches strike soft bell-like chords that ring ~1.5 s and fade (moving to another degree strikes again); «Effects
    constructor» (role Chords) → «+ add effect» → «Night forest» → a forest room; open it (tap its name) → «Room»: Short / Medium / Long
    buttons — compare by ear; → «Dynamics · Glue» → the mix sits a little more even; «Master» → «Glue» On/Off → a gentle level change, no
    delay. The limiter is always on (no switch since SND-F1b): strike many chords hard with drums — no crackle, and nothing sounds quieter
    than before. Record a short chord take with Night forest: the frozen track sounds the same as live (wait ~1 s after stopping).
94. Hand detection (LAT2), desktop then phone: ▶ Play — the start card's message pulses through «Warming up hand tracking…» and the page
    never freezes after it closes; «🎛 Sound» → Diagnostics → Latency meter On. One hand in view ~20 s: «Hand detection … (tracking ·
    full-frame search)», «the model ran on N of N frames/s», duplicates 0; then two hands. A hand that leaves and comes back is picked up
    almost at once; crossing hands, the lead hand-over, the looper's 3-s clear behave as before. Compare «Hands tracked: 2 · search every
    frame» (old) and «Detection runs in: background worker» (fewer long tasks, slower detection on weak GPUs); «Copy» the box after each and
    send it to the strategist. (LAT3: the «Picture» switch is gone — the picture always matches the dots.)
95. Low light (LAT3), desktop in the evening (dim room), one hand: ▶ Play → «🎛 Sound» → Diagnostics → Latency meter On. For each «Low light
    (test)» setting — Off, at least 15 fps, at least 24 fps, short exposure (only if offered): tap it, wait for «Applying…» to end, play
    ~20 s, «Copy»; note how the picture looks (darker? grainy?) and whether the hand gets lost more (the line «Hands lost … per minute»). A
    setting that does nothing or is refused falls back to Off and says why. The hint: in a dim room with Off, within ~4 s of the camera
    slowing below 12 fps a small message «Too dark: the camera slowed to N fps…» appears once at the top, taps go through it, OK or 9 s
    hide it; it never appears while recording or in the editor, and not again in the same session.
96. Camera settings come back (CAM-FIX, rule #34), the user's desktop, one test at a time: ▶ Play → «🎛 Sound» → Diagnostics → Latency meter
    On; the warning «Test: changes the camera's own settings; Off restores them» is under «Low light (test)». For each of «at least 15 fps»,
    «at least 24 fps», «short exposure»: tap it, wait ~3 s, look at the picture, tap «Off», wait ~2 s — the picture must look as before the
    test (short exposure: dark while on, normal after Off; the box says «After the test: camera exposure and white balance back to
    automatic…»). Then reload the page and open Zoom (or the Windows Camera app): the picture is normal. A camera left dark by any app: the
    next ▶ Play heals it and the box says «Camera exposure … was manual — restored to automatic». (0a, 2026-10-15: only a camera OUR test left
    dark is repaired — the box says «… left by an unfinished test — restored»; a manual exposure you set in another app stays as you set it.)
97. Camera start (0b), laptop: close every app using the camera, ▶ Play — starts as before. Then open Zoom (or the Windows Camera app) so it
    holds the camera, reload Handsong, ▶ Play — after a few seconds the start card says «The camera is busy or not responding. Close Zoom…»
    and shows «Try again»; close Zoom, tap «Try again» — the app opens (no second sound engine, no reload). With the camera switched off (a
    camera key, or unplugged): «No camera found. Check that the camera is switched on…». With camera access blocked for the page (lock icon
    → Camera → Block): the message explains how to allow it. The page never hangs on «Starting the camera…».
98. Autosave (AUTOSAVE1): ▶ Play, record a short take, wait ~5 s; «⚙ Loop» → «Song file» says «Autosaved on this device at HH:MM»;
    reload the page, ▶ Play — a box «Continue where you left off? …» appears and the song is NOT loaded yet; «Continue» → the song is back
    (tracks re-freeze by themselves); reload again and choose «New song» → an empty song, and «⚙ Loop → Earlier» still lists the old one
    (Restore brings it back, asking first if the current song has unsaved changes). «Autosave: Off» → nothing new is saved; back On.
99. Open is one undo step (SONG3): with a song playing at one tempo, «⚙ Loop» → «Song file» → Open another song file (another tempo)
    → it plays; press ↶ → the first song is back with its tempo, A4, brace and its name in «Song file» (toast «Undone: song opened»); ↷ →
    the opened song again. Autosave keeps both songs as separate entries in «Earlier».
100. Engine readouts (ENG2): ▶ Play → «🎛 Sound» → Diagnostics → Latency meter On. Two new lines: «Audio dropouts: N per minute» (or
    «counting» for the first 10 s, or «this browser does not report them») and «Power class (provisional, changes nothing): …» — «not measured
    yet» for about the first 20 s after the first start on a device, then a class and the audio test's number. Play chords and drums hard for a
    minute: dropouts should stay at 0 on the desktop; «Copy» and send the text with the phone's numbers (E3). Console (`?probe`): `R.engine()`.

## Superseded at DOC1 (old lines verbatim, replaced in place above by a later slice)
- LAT2a probe clock (RUN 4), SONG3 leftover (RUN 4) and POOL1 (RUN 4) updated these lines of the moved text:
  + history reset, like a song load); `ui.songSaveText/songOpenText` (+ download, file picker, confirm). Frozen audio is never stored.
  counter no frame twice and frames skipped; CONTROLS fault 'dupe' and 'queue') · «LAT2a search schedule (live)» (quick, drawn, ≈ 9 s:
  history starts fresh after Open (Open asks first when the song has unsaved changes).
`master → limiter → destination`. Chains: (1) solo pool; (2) chord pool (`CHORD_POOL_N` 24 always-on 2-osc voices, gain-gated); (3) bass
- TIM3b (RUN 4) replaced the CLAUDE.md convention «A timbre/kit» (old lines verbatim):
- **A timbre/kit** = an entry in `LEAD_INSTR`/`CHORD_INSTR`/`BASS_INSTR`/`DRUM_KITS` WITH a new permanent `id` (TIM1, rule #37; add it to the
  probe's pinned list `TIMBRE_IDS_PINNED`). ⚠️ Events still store the INDEX until TIM2 (`a.inst`/`a.kit`; id ↔ index via `timbreIdOf`/
  `timbreById` at the boundary):
  APPEND only, never insert or reorder. ⛔ A SOLO timbre cannot even be appended (KS banks must be the tail: `LEAD_KS_FROM =
  LEAD_INSTR.length − KS_BANKS.length`); stable timbre ids come first. Chords, bass, kits may append. The editor lists timbres only via
  `audio.timbresOf(role)`.
