# CMD1 — every history step a command, serialisable by ids (PLAN ONLY, RUN 4, 2026-10-17)

Written for: the strategist (review), then Claude Code (implementation). No app code was changed for this document. Source: stage-3
plan slice 25 («commands: every history step serialisable by ids; the step-kind registry; `onApplied`; mute/solo/arm/brace/tempo/knob
through the same layer with `undo:false`. Proof: the ED7 sequence — every step serialised, parsed back and USED for ↶/↷ — exact») and
plan §4.13 (the Command contract). User answer (RUN 4): PLAN ONLY, and the plan must say how the undo safety check will compare VALUES,
not objects.

## 1. Why a plan first — the one blocking fact
The one history (`src/song/history.js`, ED7) works on LIVE OBJECTS: a step holds the event objects it moved, removed or added, the payload
objects `a` before and after, the lane point and lane array it edited, the capture record it installed. ↶/↷ put those very objects back.
Its TRIPWIRE (`histHash`) identifies a payload by OBJECT IDENTITY: `pidOf(e.a)` numbers each payload object in a WeakMap; lane points and
capture records likewise. A step parsed back from JSON would carry FRESH copies — equal in value, different objects — so after a round trip
every ↶ would read «changed» and drop the whole history. CMD1 therefore needs (a) a tripwire that compares VALUES, keyed by permanent ids,
and (b) one serialiser per step kind plus a parser that turns ids back into the live objects. Neither changes what ↶/↷ do today.

## 2. Today — the 23 step kinds and what each holds
| kind | owner module | holds (in memory) | ids that identify it |
|---|---|---|---|
| move | song/history.js | `ev`, `from`/`to` = {t, a, sc?} | event `e.id`; payload by VALUE; view by descriptor |
| timbre | song/history.js | `ch:[{ev, from:a, to:a}]` | event ids; payloads by value |
| del / ins | song/history.js | `evs` (whole event objects) | event ids + the FULL event values (they leave / enter the song) |
| lanetouch | song/history.js | `id` (lane id) | track id (§3.2) |
| batch | song/history.js | `list` of sub-steps (any kind) | recursive |
| ranks | song/history.js | `from`/`to` = Map(lane id → rank) | track ids |
| tab | recorder.js | `id`, `f` (level/pan/name), `from`, `to`, `at` | track id; values |
| master | recorder.js | `from`, `to`, `at` | values |
| key | recorder.js | `from`, `to` (knob) | values |
| snap | recorder.js | `rem`/`add`/`ch` [ev, t, a…], `remT`/`addT` [tk, record], `remL`/`addL` [layer, lane id, row], `mk`, `br`, `st`, `m` | event ids + full values of removed/added events; capture records by `tk` + full values; track ids + rows |
| autmove | song/automation.js | `pt`, `from`/`to` = {t, v} | lane point `p.id` (IDS1 part 2) |
| autshape / autcurve | song/automation.js | `pt`, `from`, `to` | point id; values |
| autins / autdel | song/automation.js | `lane` (the array), `pt`, `at` | capture `tk` (the lane's owner), point id + full point value |
| autfxins / autfxdel / autfxmove | song/automation.js | `ch` (a chain array), `ent`, `at`, `from`, `to` | (capture `tk`, chain key, effect id) |
| autcap | song/automation.js | `tk`, `rec` | `tk` + the full capture record |
| brace / marks / lanelen | song/sections.js | `from`/`to` values; `ch:[{id, from, to}]` | values; track ids |
Not steps (ED7 decision, unchanged): mute, solo, arm, the brace outside ✕ / Open / sections, tempo, tonic, A4 (Open carries them since SONG3).

## 3. Design

### 3.1 The command record (plan §4.13, unchanged)
`{ kind, label, undo:true|false, payload, h }` — in memory a step keeps its object references (speed; today's code untouched); `toJSON`
writes ids and values only; `fromJSON` resolves ids back to live objects. API on top of the one history (no second list):
`register(kind, { apply(u, undo), touched(u, S), toJSON(u, ctx), fromJSON(j, ctx) })` (= today's `histKind` + two functions),
`cmdDo(step)` (= `histPush` + `histSeal`, the single writer stays), `histUndo` / `histRedo` unchanged, `onApplied(fn)` (§3.6).
A kind registered without `toJSON` makes the round-trip row fail by name (no silent hole).

### 3.2 Identities (what «by ids» means for each thing)
- **Events:** `e.id` (IDS1 part 1) — permanent, saved, kept by ↶/↷.
- **Lane points:** `p.id` (IDS1 part 2). **Capture records:** their take number `tk`. **Chain entries:** (tk, chain key, effect id).
- **Views (`sc`):** the descriptor the song file already writes — {mode, key, keyC, tunedFrom, chordMode} — back through `scaleView`
  (memoised, so the same descriptor gives the SAME view object: rule #7 holds after a parse).
- **Tracks — the one missing id.** Steps name tracks by LANE ID (rule #27), but lane ids are session numbers (`laneSeq`) and the song file
  saves tracks by layer. Proposal CMD1b: the file saves each track's lane id (`tracks[].id`, song file v7 (v6 is taken by TIM3d); migration v6 → v7 writes
  nothing — an older file's tracks get fresh ids at open, as events did in IDS1); `laneNew(layer, id?)` stays the ONLY writer (an explicit
  id only from Open; `laneSeq` floors above the file's ids, as `evIdFloor`). Then a serialised step that names a track names the same
  track after Save → Open.
- **Payloads `a`:** by VALUE (canonical JSON — §3.3); `a.ty` (a chord type) as its array of numbers / ratio strings (already a value since
  U2; compared with `tyEq`).

### 3.3 The value tripwire — how the undo safety check compares VALUES, not objects
The tripwire keeps its job (catch a write that bypassed the history — a console, a probe — before ↶ corrupts a song) and its shape
(order-free sum of per-item hashes, FNV, O(items)); only the per-item hash changes from «which object» to «what value, under which id»:
- **Event item** = H(e.id, t, layer, V(a), viewId(sc), sev, tk, jam) where V(a) = FNV of the CANONICAL JSON of the payload: keys sorted
  at every level, numbers written by one rule (finite; −0 → 0; the same 1e-6 rounding today's `num()` uses for beats), arrays in order,
  undefined keys dropped. Today the event item uses the birth number `evSeq` and `pidOf(a)`; the birth number is replaced by `e.id` (both
  are kept by ↶/↷; `e.id` also survives a file).
- **Lane point item** = H(tk, p.id, t, v, sh, k); **capture record** = H(tk, canonical JSON of `chains`, the sorted point ids).
- **Track item** = H(track id, level, pan, name, rank, len) (as today, by the permanent id of §3.2). Markers and master as today.
- **Speed:** V(a) is memoised per payload OBJECT in a WeakMap — a payload is never written in place (every edit puts a NEW payload object;
  this is already the rule of the editor, «нагрузку кладём НОВЫМ объектом»). So after the first hash the cost is today's: ≈ 0.25 ms per 200
  events (measured at ED7); the first hash of a 3000-event song pays one canonical stringify per payload (estimate 5–15 ms, measured in
  CMD1a). A parsed step's payloads are new objects → hashed once, then memoised.
- **In-place writes** (the one thing the memo would hide): today's object-identity tripwire cannot see them either. CMD1a adds a DEEP mode
  (no memo) used by `P.all`'s state guard and by the ED7 row, and the static check gets a rule candidate «no write to `e.a.<x>` outside
  song/ edit kinds» (to be measured: today's in-place writers are probe controls only — `bendDbg`, the S5 probe's `a0.bend` reset).
- **Equivalence proof:** for every state the ED7 sequence visits, the value hash before and after a full serialise → parse → install of the
  song AND its history is equal; and two states that differ in one payload field (CONTROL) hash differently.

### 3.4 Serialisers (one per kind, next to its `histKind`)
- move / timbre: `{ ev:id, from:{t, a:V, view}, to:{…} }` (`a` written as its value; `view` only when the step carries `sc`).
- del / ins / snap: events that leave or enter the song are written WHOLE (the song file's event encoder `song/file.js` — same view numbers,
  same ids), events that stay are written by id; capture records whole (the file's `takes` encoder) or by tk; tracks by id + row.
- aut*: `{ tk, pt:p.id, from, to }`; autins/autdel also the whole point and `at`; autfx*: `{ tk, chain, fx, at, from, to }`; autcap: `{ tk,
  rec:whole }`. tab/master/key/brace/marks/lanelen/ranks: values (Maps as `[[id, v], …]`). batch: `{ list:[…] }`.
- One shared `ctx` per parse resolves an id to THE live object: an event in `events`, else one object per id created from the first whole
  value met (so two parsed steps naming the same deleted event share one object — the identity the in-memory history relies on); lane
  points and capture records the same way; views through `scaleView`. Unknown ids → the parse refuses in words (never a half history).

### 3.5 Where it lives
`src/song/history.js` keeps the list, the registry and the tripwire (value hash: one new pure helper `canonJSON` in `src/core/` — rule #36,
node-tested). Serialisers live with their kinds (history.js, automation.js, sections.js, recorder.js for snap/tab/master/key — moving
snap/tab/master/key out of recorder.js is NOT part of CMD1). `song/commands.js` (new): `histToJSON()`, `histFromJSON(json)` (parse + ctx +
install as the current history), the round-trip probe hook. Folder rule REC1 holds (song/ imports song/, core/, config.js, scales.js).

### 3.6 `onApplied` and the `undo:false` commands
- `onApplied(fn)`: called after every do / ↶ / ↷ with `{ step, dir }` (one list of listeners, in order). First users: autosave (it may
  replace its 1-s hash poll by a dirty flag — optional, CMD1d), later co-play and MIDI learn. Pure: no DOM.
- `undo:false` commands — mute, solo, arm, brace (outside the existing steps), tempo, key knob, A4: one function each (`cmdSet(kind,
  value)`) that applies through today's setter, calls `onApplied`, and is NOT pushed to the history (the ED7 decision stands). Their only
  new effect: the journal sees them (later: shared sessions). No UI change.

## 4. Proof (probe rows; probe budget: deterministic, no audio)
- «CMD1 value tripwire» (quick): the value hash equals itself across a Save → Open of the seed song (where the object hash cannot); one
  changed payload field changes it (CONTROL); an in-place write is caught in deep mode and missed with the memo (CONTROL that shows why
  deep mode exists).
- «CMD1 commands round trip» (quick and all): the ED7 sequence (16 steps of every kind — the row «ED7 one history» already builds it, plus
  an Open step and a section edit): after each step the whole history is serialised, parsed back and INSTALLED in place of the live one;
  then full ↶ and full ↷ compared EXACTLY with the snapshot after each step (the row's own snapshots). CONTROLS: a serialiser that drops
  one field (autmove `from.v`) must fail; the object-identity tripwire (old `histHash`, kept as `histDbg({objHash})`) must answer «changed»
  after the round trip (proves the value tripwire is what makes it work); an unknown kind's serialiser missing must fail by name.
- Existing rows unchanged and PASS: ED7, ED7-fix2, OWN2, BEND-CURVE, ED6, SONG3, IDS1, SAVE1, AUTOSAVE1, HAND1 (no gesture change).

## 5. Slices (each with its probe run; nothing audible changes)
1. **CMD1a** (S) — value tripwire (`core/canon.js` canonical JSON + FNV, node row; `histHash` by ids and values; deep mode; the
   «CMD1 value tripwire» row). Risk: a hash-cost regression on long songs — measured on the seed and the demo song (1774 events).
2. **CMD1b** (S) — permanent track ids in the song file (v7), `laneNew(layer, id?)`, `laneSeqFloor`; SAVE1 / SONG3 / IDS1 rows extended.
3. **CMD1c** (M) — `toJSON`/`fromJSON` for the 23 kinds, `song/commands.js`, the round-trip row with its controls.
4. **CMD1d** (S) — `onApplied` + the `undo:false` setters (journal only); autosave may read the journal (optional, decided then).

## 6. Questions for the strategist / user
1. Track ids in the file (CMD1b, file v7): yes? (Needed for any serialised step that names a track; also useful for ROUTE1 later.)
2. Should a serialised history be SAVED in the song file (undo survives a reload), or is serialisation only for the journal / co-play /
   tests? Recommendation: NOT in the file for now (size: ✕ of a 3000-event song ≈ 1.5–2 MB in a step) — the format allows it later.
3. Autosave on the journal instead of the 1-s poll (CMD1d): only if measured cheaper on the phone; otherwise keep the poll.
