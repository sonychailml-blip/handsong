# AUD1 — splitting the sound engine around an «engine context» (PLAN ONLY, 2026-10-16)

Written for: the strategist (review), then Claude Code (implementation). No code was changed for this document.

## 1. Where we are (measured today)
- `src/audio.js` = 3225 lines, ~70 exported names, imported by 34 modules. It is ONE module instance per engine: the live engine is
  `audio.js`, the offline render copy is the same file imported as `'./audio.js?render'` (one copy per session, `render.js`), re-initialised
  against a fresh `OfflineAudioContext` per render. GOLD (`probes/gold.js`) and the SND-F1 rows use the same copy.
- **All engine state is module state** (≈ 45 top-level `let`s and tables): the context `AC`; the master path (`master`, `mGlue`, `mMake`,
  `mLim`, `limiter`, `outLast`, `meterAn`, `masterLvl`, `limRed`); the four role buses (`leadSum`/`leadOut` behind the expression stage,
  `chordBus`, `bassBus`, `drumBus`, `backBus`) and the AF5 TRACK heads (`leadOutT`, `chordBusT`, `bassBusT`, `drumBusT`, live copy only);
  the pools (`lv`/`leadHold`, `cv`/`chordHold`, `bv`/`bassHold`, `ffLive`); the chains (`FX_INST`, `FX_CHAIN_HEAD/OUT/LINKS`, `FX_PLAY_PATH`,
  `FX_AIM`, `FX_DIP_T`); shared LFOs (`vibLFO`, `tremLFO`, `exprVibLFO`); the drone (`dO1`, `dO2`, `dG`, `dPan`, `dView`); worklet readiness
  (`ksReady`, `dynReady`, `frzReady`, `frzStoreNode`, `frzSink`, `capMod`); offline switches (`offline`, `rnd`, `DBG`); injected lookups
  (`trackGainOf`, `trackPanOf`, `trackRouteOf`); the noise buffer; probe taps (`bendTap`, `dbgExprIO`).
- **Static data** lives in the same file: timbre tables (`LEAD_INSTR`, `CHORD_INSTR`, `BASS_INSTR`, `DRUM_KITS`, `KS_BANKS`, `FIREFLY`), effect
  declarations (`FX_FACTORY` + `*_PARAMS`), constants (`REV_A`, `DLY_A`, `EXPR_A`, `BRI_HZ`, `DYN_*` via `core/dsp.js`), the TIM1 registry.
- `initAudio(mkCtx)` resets every table (F3) and builds the graph in a FIXED ORDER that the sound depends on (summing order → 1–3 ULP;
  the FDN's one-entry loops; the chord reverb mix set through `setNorm`). Rule #1 (context created in the click) and rule #3 (pool
  oscillators never stop) live here.
- The plan (archive B, «STAGE 3 — FOUNDATION PLAN» §5.1 and slices 12–13) already fixed the direction: **a builder that leaves `audio.js`
  receives `E` — the engine instance's context — and keeps no module state**; timbres out in AUD1, effects + FDN in AUD2; the full
  «engine as one instance object» conversion only with the WASM engine (W0). This document refines that into options and slices.

## 2. What the engine context `E` holds
One plain object per engine instance, created by that instance's `initAudio`, never shared between instances:

| Group | Fields (today's names) | Owner after AUD1 |
|---|---|---|
| Context | `ac` (AudioContext or OfflineAudioContext), `offline`, `rate`, `rnd` (seeded only in the render copy), `dbg` | instance |
| Master path | `master`, `glue`, `make`, `lim` / `limiter` (fallback), `out` (= `outLast`), `meter`, `level`, `limRed` | instance |
| Role buses | `bus.ld` (`leadOut`, after the expression stage), `bus.ch`, `bus.bs`, `bus.dr`, `bus.drone` (`backBus`); `head` = the live chain heads | instance |
| Track heads (#31) | `trackBus.ld/ch/bs/dr` (live instance only; `null` in the render copy) | instance |
| Shared modulators | `lfo.vib`, `lfo.trem`, `lfo.shim` + `shimPitch`/`shimAmp` | instance |
| Chains | `fx.inst` (per chain key → per effect), `fx.head`, `fx.out`, `fx.links`, `fx.path`, `fx.aim`, `fx.dipT` | instance (AUD2 moves the code that reads them) |
| Pools | `pool.ld` (`lv`, `leadHold`), `pool.ch` (`cv`, `chordHold`, `ffLive`), `pool.bs` (`bv`, `bassHold`) | instance |
| Worklets | `wk.ks`, `wk.dyn`, `wk.frz` (+ `frzStore`, `frzSink`), `wk.cap` — readiness flags and nodes | instance |
| Lookups (injected) | `gainOf`, `panOf`, `routeOf` (recorder installs them on the live instance only) | instance |
| Buffers | `noise` (seeded), `forestIR` cache per rate/length | instance |

**Never in `E`:** static data (timbre tables, `FX_FACTORY` declarations, `REV_A` …) — they are module constants shared by both copies by
design (read-only). **Never outside `E`:** anything created from a context (nodes, buffers, ports) or anything that changes while playing.

## 3. Options

### Option A — «E threaded into extracted builders; audio.js keeps its globals» (the plan's §5.1, minimal)
`audio.js` builds `E` inside `initAudio` from its own module variables (`E.ac = AC`, `E.master = master` …) and passes it to builders that
move out: `modules/timbres/*.js` (`buildLeadBank(E, …)`, `buildFMBank(E, …)`, `buildKSBank(E, …)`, chord/bass voice builders, drum kits)
and, in AUD2, `modules/effects/*.js` + `engine/fdn.js`. The moved files are stateless: they read only `E` and their arguments. `audio.js`
keeps every pool, chain table and the master path as today; only builder BODIES move.
- **For:** smallest diff; the render copy keeps working unchanged (`'./audio.js?render'` gets its own `E`); byte-for-byte graph order is
  easy to keep (call sites stay where they are); each slice is a pure move + one argument.
- **Against:** two sources of truth during the transition (`AC` and `E.ac` — must always be the same object; a probe checks); the
  module-copy trick (`?render`) stays, and with it the rule «one copy per session»; tables stay global, so «live vs render» is still «two
  copies of a module» rather than two objects.

### Option B — «engine instance object now» (`createEngine(ctx)` returns `E` with methods)
Convert `audio.js` into a factory: every table becomes a field of the instance; every exported function becomes a method or takes `E`;
the live engine and the render engine are two instances of the same module (no `?render` copy).
- **For:** the cleanest model; matches the WASM engine's shape (one instance per host); removes the module-copy rule and lets GOLD/
  freeze/«dynamics live = offline» create as many engines as they like.
- **Against:** rewrites ~70 exports and their 34 importers (`render.js` alone calls ~40 of them on the copy); every positional caller of a
  changed signature must be listed (rule #15 report); the graph creation order must be re-proved; high risk for zero audible gain — the
  plan explicitly deferred this to W0 («would rewrite ~150 exports for no gain»).

### Option C — «A now, B's facade later» (recommended)
Option A for AUD1/AUD2, with two additions that make the later conversion mechanical:
1. **`E` is the single place the moved code reads state from**, and `audio.js` itself READS its own module variables only through
   getters on `E` in code that is touched (new or moved lines use `E.x`; untouched lines keep their names). A probe row checks that every
   field of `E` is the very object the module variable holds (`E.ac === AC` …) in BOTH copies, and that the two copies' `E`s share no object.
2. **The engine's outward surface is listed once** (`engine/surface.js`: the names `makeENG`, render, probes and ui use — today's export
   list grouped by caller). At W0 the surface is re-implemented by the instance object (B) and, for WASM, by the worklet bridge; callers do
   not change.
- **For:** A's low risk now; the instance boundary is real and probed; B becomes «change `audio.js` internals behind a fixed surface».
- **Against:** a transitional double reading (`AC` vs `E.ac`) that must be guarded by the probe until W0.

**Recommendation: C.** It gives the stateless-module rule (plan #35-candidate «an engine submodule is stateless») its teeth now, keeps the
render copy and GOLD exactly as they are, and turns the W0 conversion into a surface swap.

## 4. Live vs track chains (#31), renders, GOLD — how each gets its own context
- **Live instance** (`audio.js`): created by `initAudio()` in the start click (rule #1). Its `E` has BOTH the live heads and the TRACK heads
  (`trackBus.*`, chain keys `trackChainKeyOf(liveKey)`); the router per voice (`rL`/`rT`) reads `E.routeOf(owner)` at attack. Rule #31 is a
  property of ONE instance holding TWO networks — unchanged by AUD1. Effects are instantiated per CHAIN KEY in `E.fx.inst`, so the track
  chain and the live chain are already separate instances of the same stateless effect builder.
- **Render instance** (`'./audio.js?render'`, one per session): `initAudio(mkCtx)` with an `OfflineAudioContext` per render → a fresh `E`
  per render; no track heads (`trackBus.* = null`), no frozen store, the browser limiter as the (unheard) end; `offlineTapMaster` taps
  `E.master`. Freeze, `R.aud`, GOLD, «freeze parity», «dynamics live = offline» all use this instance. Nothing moves in AUD1.
- **GOLD** renders through `render.goldRender` on the render instance; after AUD1 its 82 cases must be bit-identical in features (0.01 dB)
  — they are the strongest proof that moved builders build the same graph.
- **Later (W0, stage 5):** offline renders of WASM tracks run in a Worker with the same `.wasm` (no OfflineAudioContext → no RENDER-LEAK).
  The render instance then becomes «a WASM engine in a worker» behind the same surface.

## 5. Shared send / return buses and the three effect placements (BACKLOG §7.14)
Today: one serial chain per chain key (role live / role track) → `master`. §7.14 asks for three placements: **insert on a channel**
(today's chain), **insert on the master** (Glue / Limiter today are fixed nodes `mGlue` → `mMake` → `mLim`), **shared sends** (one room for
many tracks — the Night forest cost note asks exactly for this).
Fit into `E`:
- `E.fx` keys stay opaque chain keys. Add two KINDS of key (not new code paths): `master` (the master insert chain, between `E.master` and
  the fixed `mMake → mLim` end) and `send:<id>` (a return bus: `E.ret[id]` = its own chain whose head is a summing gain and whose tail goes
  to `E.master`). A channel's send amount = a gain node per (channel, send) owned by the channel's chain (`kind:'send'` effect whose `out`
  goes to `E.ret[id].head`) — so «shared reverb» = one `forest` instance on `send:room`, many cheap send gains.
- **#31 holds by construction:** the live network and the track network each get their OWN return buses (`send:room` and
  `track/send:room`), exactly like the chain heads today; a track never feeds a live return.
- **Freeze:** a frozen buffer carries the track's channel chain only; its send amounts must instead feed the shared return LIVE (the
  frozen bus gets a send tap). This is a real design change for AF (a frozen track would otherwise bake a private copy of the room) — it
  belongs to the slice that adds sends (ROUTE1 / §7.14), not to AUD1. AUD1 only reserves the keys and the `E.ret` table.
- **Dynamics / limiter path:** stays `E.master → [master insert chain] → E.make → E.lim → destination`, `E.out = lim` feeds the meter, the
  clip tap and the probe capture (rule #4). The Glue on the master becomes the first entry of the `master` chain (default off) when §7.14 is
  built; until then `mGlue` stays a fixed node. Zero delay remains a probed property («SND-F1b master path»).

## 6. Mapping to the Rust → WASM engine (stage 5+, plan §5.3)
- `E` ≙ the WASM engine instance: one per host (AudioWorklet live, Worker offline, node for tests).
- Stateless timbre / effect builders ≙ the Rust modules' `process` + passport; their parameter declarations (`*_PARAMS`) are already data
  (passports) — keep them data, so the WASM side reads the same declarations.
- Chain keys, send ids and the master chain ≙ the routing table the worklet receives as data (ROUTE1).
- The surface (`engine/surface.js`) ≙ the message protocol to the worklet (explicit Hz, timbre id, values, time — ENG1).
- Order of migration (from the plan): W1 FDN reverb → W2 one chain processor per network → W3 delay, tremolo-mix → W4 new effects → voices
  in stage 7. AUD2's `engine/fdn.js` is the exact JS reference W1 is tested against.

## 7. Slices
- **AUD1a (S)** — `E` created in `initAudio` (both copies) from the module variables; `engine/surface.js` lists the surface (doc + a static
  check that every surface name is exported); probe row «AUD1 engine context»: every `E` field is the module's object, in both copies;
  the copies' `E`s share no object (deep walk of node identities); CONTROL: a deliberately shared field must be caught.
- **AUD1b (M)** — static rule «an engine submodule is stateless»: a module under `src/modules/timbres/` or `src/engine/` declares no
  top-level `let`/`var` and no top-level mutable table (`const X = {}`/`[]`/`new Map()` that is written), imports only `core/`, `config.js`,
  `scales.js`, its own folder and receives `E`; CONTROL: a fake module with a top-level `let` fails.
- **AUD1c (M)** — timbres out: `modules/timbres/subtractive.js` (`mkOsc`, `buildLeadBank` bodies), `fm.js` (`buildFMBank`), `ks.js`
  (`buildKSBank`, `buildKSFallback`, `KS_BANKS`), `chord-voice.js` (`newChordVoice`, `fstrike`, Firefly strike), `bass-voice.js`,
  `drumkits.js` (the five kits' hit builders). Tables (`LEAD_INSTR` …) stay in `audio.js` until TIM3 (the timbre format). Creation order
  kept call for call.
- **AUD2a (M)** — effects out: `modules/effects/{volume,bright,glide,reverb,delay,trem-mix,forest,glue}.js` + `engine/fdn.js`; `FX_FACTORY`
  assembled from the registry in the SAME key order (menu order and `fxAddableIds` depend on it).
- **AUD2b (S)** — generated contract rows per effect (identity at neutral, offline repeat, tail vs declared decay, parameter round trip).
- **AUD2c (S, optional)** — worklets to `src/engine/worklets/` (page-relative `addModule` paths, CSP/NET_LISTED counts updated).
- Later, not AUD: ROUTE1 / §7.14 sends and master inserts (uses `E.ret`, `master` key); W0 instance object behind the surface.

## 8. Probes that prove nothing changed (every AUD slice)
- **GOLD 82 cases at 0.01 dB** (P.all) — timbres, effects, master dynamics: the moved builders build the same sound.
- **frozen seed bass** 0.08686 / 0.055319 / 650886 exact; **render repeatability** (dry ≤ 1e-4, wet ≤ 2e-4); **renders serialized**;
  **MX1 / MX2**; **LR1** live = frozen reverb; **AF2**, **AF6b** (frozen playback); **AF5** track and live isolated (the two networks).
- **SND-F1 rows**: Firefly identity, Night forest IR, dynamics curve/latency/ceiling, «dynamics live = offline», «freeze parity»,
  «SND-F1b master path (live)» (0 frames).
- **TF0** song fingerprint and **HAND1** gesture print (nothing above the engine moved).
- New: «AUD1 engine context» (fields = module objects; copies share nothing; CONTROL) and the static stateless rule (CONTROL).
- Node graph census (new, cheap): count of nodes by type created by `initAudio` in the render copy before/after each slice — must be equal
  (a wrapper on the context's `create*` methods in the probe, restored in `finally`).

## 9. Risks
- Graph creation ORDER changes summing order (1–3 ULP, invisible to GOLD at 0.01 dB but visible to «render repeatability»'s exact checks
  only as noise) — keep call order; the census row catches added/removed nodes.
- Builders that close over module variables by name (e.g. `bldVib`, `bldHum`, `pendSymp`, `voiceFirstOsc`) — these are per-build scratch
  state; they move into `E.build` (reset per voice build), never into the moved module.
- `?render` copy + a moved module: the moved file is imported ONCE (no query string) and shared by both copies — safe only because it is
  stateless; the AUD1b rule is what makes this safe, so it must land before AUD1c.

## Review 2026-10-16 (strategist) — option C APPROVED, with these additions (binding for AUD1a–c, AUD2a–c)
- **R1. `E` never holds a stale copy.** Every field that changes after `initAudio` — worklet readiness flags and nodes (`wk.ks`, `wk.dyn`,
  `wk.frz`, `frzSink`, `capMod`), the limiter fallback, lazily created nodes, `ffLive` — is a getter/setter over the module variable, or is
  written only through `E`. The probe «AUD1 engine context» checks identity THREE times — right after `initAudio`, after all worklets have
  loaded, and after a render has run — in BOTH copies.
- **R2. Pure data only moves to a shared module.** Before `KS_BANKS` (or any other table) moves into a shared module, prove it is pure data
  (no AudioBuffer, node, port or anything made from a context). Anything context-made or cached goes into `E` (like `forestIR`), never into
  the moved module.
- **R3. The LAT rows join every AUD slice's probe list:** «Hand → sound» and «master path 0» unchanged (the SND-F1b master path row included).
- **R4. `--leak` after AUD1c (the KS builders move) and after AUD2a:** the known KS render leak must not grow; the margin rule stays.
- **R5. A cheap speed check:** the total GOLD render time after each AUD slice within +20 % of the time before it (same machine, same run
  conditions); both times reported.
- The stateless-module rule becomes hard rule **#38** (the next free number). The ROUTE1 freeze/send finding (§5: a frozen track must feed
  shared returns LIVE, never bake a private room) is recorded in BACKLOG §7.14.
