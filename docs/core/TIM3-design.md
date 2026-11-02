# TIM3 — timbres as data (PLAN ONLY, RUN 3, 2026-10-16)

Written for: the strategist (review), then Claude Code (implementation). No code was changed for this document. Plan source: stage-3 plan
§4.2 (archive B «STAGE 3 — FOUNDATION PLAN»), slice 22; user decision 2026-10-16: plan first.

## 1. Where we are (measured in code today)
- **Four tables in `src/audio.js`** (since TIM1 every entry has a permanent id; since TIM2 events store the id; songs carry a copy):
  - `LEAD_INSTR` — 23 solo timbres, but only `{id, label, att, rel}`. **The sound itself is code**, by list POSITION, in
    `src/modules/timbres/subtractive.js` `buildLeadBanks` (14 hand-written bodies, e.g. SuperSaw = five saws at −12/−6/0/+6/+12 cents,
    gain 0.17; Organ = harmonics 1–4 at .42/.22/.14/.09; Pad = three triangles ±7 cents through a 2100-Hz lowpass with a filter strike;
    «Bell (FM)» = an inline FM pair with a FIXED index, unlike the other two FM timbres), 2 FM timbres through `fm.js buildFMBank({ratio,
    peak, sus, tau})`, and the 7 KS timbres through `ks.js KS_BANKS` (already data: `fb, damp, exBase, exSpan, nl, symp, body`).
  - `CHORD_INSTR` — 17 chord timbres, **already data**: `t1, t2, ratio, det, m1, m2, lp, lvl, att, rel, fo, ft, fv, hj` (+ Firefly's
    `strike:'firefly'` → `chord-voice.js ffStrike` with the `FIREFLY` partial table).
  - `BASS_INSTR` — 7 bass timbres, **already data**: `t1, t2, det, ratio, lp, lvl, att, rel, fo, ft, fv`.
  - `DRUM_KITS` — 5 kits, only `{id, label}`; each kit's six rows are code in `drumkits.js` (Standard inline in `drumVoice`; Darbuka,
    Tabla, Gamelan, Taiko through their own hit functions with literal parameters).
- **Policies are ROLE properties today**, not timbre ones: voice mode (`state.voiceMode` poly/lead), glide default (`LEAD_GLIDE_TC` 20 ms,
  `BASS_GLIDE_TC` 12 ms), register (bass = two octaves below solo, `bassFreq`), record quantise (chords 1 beat, bass ½, drums 1/sub, solo
  none — `gridFor`).
- **Ids, order, copies:** TIM1 registry (`timbresOf`, `timbreById`, `timbreReg`), positions live only at the engine boundary
  (`timbreIdx` / `timbreKey`); a song file carries `timbres[id] = {role, name, def}` where `def` is the table entry — for a solo timbre that
  entry does NOT describe the sound (the body is code), so today a solo copy is enough only when the id is built-in.

## 2. The target (plan §4.2)
- **Engine type** (code, `src/modules/timbres/<type>.js`, stateless — rule #38): `{ kind:'timbre-engine', id, version, recipe (the passport
  of its fields: name, type, range, default), noteParams, policies, cost:{perVoice}, build(E, recipe, dest) → Bank {gain, setFreq(f, tc, t),
  cancel(t), strike?(t, vel), hum} }`.
- **Timbre record** (data, `data/timbres/<id>.json`): `{ format:'handsong/timbre', version:1, id, family:'solo'|'chord'|'bass'|'kit',
  engine, name, recipe:{…}, env:{att, rel}, level?, policies:{voiceMode, glide, register, quant}, author?, licence? }`.

## 3. Recipe schema per engine type (proposal)
| Engine type | Recipe (fields, today's sources) | Built by today |
|---|---|---|
| `subtractive` | `oscs:[{wave, mult (harmonic, 1 = f), detune (cents), gain}]` in CREATION ORDER · `filter?:{type, freq, Q}` (the bank's lowpass) · `strike?:{open, tc, fv}` (fstrike) · `hum:0|1` · `sat?` | the 12 subtractive bodies of `buildLeadBanks` |
| `fm2` | `{ratio, peak, sus, tau}` (index envelope) | `buildFMBank` (Bell deep, Metallophone) |
| `fm-fixed` | `{ratio, index, carGain}` (fixed index; «Bell (FM)», today's inline body) | `buildLeadBanks` body 4 |
| `ks` | `{fb, damp, exBase, exSpan, nl, symp:{ratios, Q, gain}, body:{hz, Q, db}}` + `fallback:'pluck'` | `KS_BANKS` + `buildKSBank` / `buildKSFallback` |
| `chord2` | `{t1, t2, ratio, det, m1, m2, lp, lvl, fo, ft, fv, hj}` (= `CHORD_INSTR` minus id/label/att/rel) | `newChordVoice` (pool voice: the timbre is baked at the attack) |
| `tine` | `{partials:[[mult, gain, decay, wave], …], lvl}` (= `FIREFLY`) | `ffStrike` (one-shot, SND-F1) |
| `bass2` | `{t1, t2, det, ratio, lp, lvl, fo, ft, fv}` (= `BASS_INSTR`) | `buildBassPool` voices |
| `drumkit` | `{rows:[{synth, params}] ×6}` — `synth` one of the named hit builders (`dum`, `tek`, `noise`, `tabBaya`, `tabNa`, `tabTick`, `gmlFM`, `taikoDrum`, `taikoKa`, the Standard rows) with their literal parameters | `drumkits.js` |
- The subtractive table covers 12 of today's 14 bodies by iterating `oscs` in order; the two odd ones (Reed's resonant lowpass, Organ
  (full)'s drawbars) fit `filter.Q` and `oscs`. Each body is translated BY HAND once and proved (§6) — no generic guess.
- `env` = today's `att` / `rel` (solo, chord, bass); kits have no env. `level` only where today's entry has one (`lvl`).

## 4. How today's tables map to `data/timbres/*.json`
- One file per timbre, file name = id (`data/timbres/solo.supersaw.json` …), 52 files; `data/index.json` gains `timbres:[…ids…]` in TODAY'S
  order (= the TIM1 registry order = the menu order). The loader (`scaleload.js` pattern: fetch, per-file validation with a new
  `core/format.js checkTimbre`, a broken file skipped with one line, nothing valid → an embedded emergency set of today's first timbre per
  family) fills the registry before `initAudio`.
- Positions stay a session handle only (live hands, the panel `<select>`s) until the hands store ids; `LEAD_KS_FROM` and the «KS block is
  the tail» constraint are gone (TIM2 retired them for events; TIM3 removes the last reader, the render's KS test reads `recipe` /
  `engine==='ks'` instead).
- `timbreSnapshot(id)` becomes «the record» — a song file's copy then fully describes every timbre (solo included).

## 5. The person's own timbres (rule #37)
- Same path as tunings/modes (F6): a user record `u.<uuid>` through the SAME validator, stored by `userstore` (kind `timbre`), installed into
  the registry (`registerRecord('timbre', rec)`), listed after the built-ins; built-ins are hidden, never destroyed; the person's order is a
  separate id list. Packs (PACK1): `<pack>/<name>` ids behind the registry gate.
- A song carries the full record; a missing id plays from the copy (like SONG1's scales) and offers «Keep in my timbres»; an engine type the
  app lacks → the family's fallback timbre with a visible note (today's TIM2 stand-in).
- No UI in TIM3 (the timbre builder is stage 7).

## 6. Proof that nothing changes
- **Creation-order guarantee:** the seeded phase draws (`voiceStart` → `E.rnd()`) depend on the ORDER of oscillator creation, so each engine
  type's `build` must create nodes in exactly today's order. Proof row «TIM3 creation trace»: wrap the context's `create*` (as the AUD1 node
  census does) and record, per timbre, the sequence of (method, type/wave, frequency, gain) for one voice built the OLD way (today's code,
  kept behind a probe switch for the slice) and the NEW way (recipe) — the two sequences must be identical, element by element.
- **Bit-exact per timbre:** one note per timbre, the same seed, rendered through both paths → identical samples (not only GOLD's 0.01 dB).
- **GOLD 84/0**, **node census identical**, `tools/timbres.before.json` (every timbre's def, a 1-s render hash, its trace) compared after.
- Frozen seed bass exact, render repeatability, HAND1, TF0, SAVE1 / SONG1 round trips (a v4 file opens to the same song).
- Validator: every damage of a record caught (CONTROLS), a user timbre install / remove keeps recorded songs playing (`P.checkUserDelete`
  pattern).

## 7. Migration
- Song files: version 5 — the `timbres` copies become full records (`{format:'handsong/timbre', …}`); the migration v4 → v5 rewrites a copy
  `{role, name, def}` of a BUILT-IN id into the built-in's record (exact: the built-in is known), and keeps a foreign copy as it is (marked
  `legacy:true` — it plays as the family stand-in, as today). Idempotent; the opened file is never changed.
- Autosaves are song texts → the same migration at restore.
- No change to events (ids since TIM2).

## 8. Slices (proposal)
- **TIM3a (M)** — loader + validator + manifest + records for CHORD and BASS (already data: lowest risk) + the trace row; the registry fills
  from files; `CHORD_INSTR` / `BASS_INSTR` become views over the records.
- **TIM3b (M)** — solo: `subtractive`, `fm2`, `fm-fixed`, `ks`; the 23 bodies translated one by one, each proved by the trace and the
  bit-exact render; `buildLeadBanks` retired.
- **TIM3c (M)** — kits: the `drumkit` type with named row synths; `drumVoice`'s Standard rows and the four kits as data.
- **TIM3d (S)** — the person's own timbres and song copies (v5 migration, «Keep in my timbres»).

## 9. Risks
- A hand translation that changes creation order or one literal changes the seeded sound — the trace row catches order, the bit-exact
  render catches values (both stronger than GOLD).
- Loading 52 small files at start costs requests (today the 106 scale files load the same way; one combined bundle file is an option).
- Policies moving from role to timbre change no behaviour as long as every timbre of a role carries today's role value — the probe pins it.

## 10. Questions for the strategist
1. Kits as data now (TIM3c), or kits stay code engine types (`drum-darbuka` …) until the timbre builder needs them?
2. «Bell (FM)» as its own `fm-fixed` type, or folded into `fm2` with a flag?
3. Policies per timbre in TIM3 (with today's role values), or left on the role until stage 7?
4. One file per timbre (52 requests) or one bundled `data/timbres.json`?

## Review 2026-10-17 (user / strategist answers, recorded at RUN 4)
- **T1** Kits as data: YES, but LAST — TIM3c comes after TIM3d. Row synths stay code; their PARAMETERS become data.
- **T2** «Bell (FM)»: folded into `fm2` with a field ONLY if the creation trace and the bit-exact render are identical; otherwise it keeps
  its own `fm-fixed` type. The proof decides.
- **T3** Policies: written into EVERY record now with today's role values (the format is stable); the app keeps reading the role until
  stage 7; a probe pins record values = role values.
- **T4** Files: one file per timbre in the repo (the source of truth; the same shape as user timbres and packs); the app loads ONE generated
  bundle `data/timbres.bundle.json` built by a tool, with a probe that the bundle = the files. The same bundling may later apply to the
  scale files.
- **T5** SAFETY (new): timbre records will arrive from other people inside songs and packs. The validator bounds EVERY value — gains /
  levels capped, KS feedback < 1 with a margin, filter Q capped, frequencies in a safe range, at most N oscillators / partials per voice, a
  cost cap (ENG2 class); an out-of-bounds or too heavy record is REFUSED with one line, never played. A CONTROL for each bound.
- Order: TIM3a → TIM3b → TIM3d → TIM3c.
