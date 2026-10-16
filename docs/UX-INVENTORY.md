# UX INVENTORY — every control of Handsong today, its problems, and what the redesign needs (2026-10-16)

Written for: the user and the designer of the future redesign (Claude Code itself, per the user's decision). Documentation only — nothing
in the app changed for this. Sources: the markup (`index.html`), `ui.js`, `draw.js`/`views/`, `UI-MAP.md` (the detailed screen map),
`BACKLOG.md`. ⛳ User decision (2026-10-16, BACKLOG §7.19): the layout / section / visual redesign comes LATER, once the missing parts
exist (effects constructor with three placements, expression lab and hand map, Calm, Save/Open ✓, MIDI in/out, audio in); the effects
constructor is redesigned once it is built.

Frequency legend: **A** always (every session, while playing) · **O** often (most sessions) · **R** rarely · **S** setup only (once, or when
changing how the app works). «Taps from ▶» = taps after the start card's ▶ Play, with the top bar collapsed (the default after 3.5 s).

## 1. Screens
| Screen | What it is | How it is reached | Freq |
|---|---|---|---|
| Start card | light card: ▶ Play, Learn, ⛶ Fullscreen, ⬇ Install, language, privacy, feedback, donate | app open | A (once per session) |
| Lesson list | six lessons + «free play» | start card → Learn | R |
| Play screen | the camera picture with the play field drawn over it (roles, note grids, palette, effect bars, hand dots), top bar, play strip, transport | ▶ Play | A |
| Arrangement window | full-screen track list over time (miniatures, mute/solo, freeze dot, sections band, brace) + mixer face | 3: reveal bar → (strip visible) → ✎ in the transport | O |
| Mixer face | level faders, pan knobs, master strip with meter and reduction | arrangement window → 🎚 | R |
| Track editor | piano roll + automation lane + 30-element bar | arrangement window → tap a row | O (for editors) / R (for players) |
| Help overlay `#helpOv` | long Russian instructions | unreachable (no button) | — |
| Demo scenes | start-screen tunings demo | first visit / demo | R |

## 2. The top bar (play screen) — collapses to: role indicator + 🎥 🎙 ●
| Control | Does | Taps from ▶ | Freq | Notes |
|---|---|---|---|---|
| Scale button «Minor pentatonic · A» | opens the Scale panel | 2 (reveal, tap) | O | the most informative label; doubles as a status line |
| 🎛 Sound | opens the Sound panel (timbres, voice modes, hand functions, finger actions, effects constructor, master, diagnostics) | 2 | O | a very long panel (see §3) |
| Role 🎸 Solo / split halves ◧ ◨ | cycles the role (solo → chords → bass → drums) | 1 (stays visible) | A | the only control that stays in the collapsed bar besides recording |
| ◨ split | two roles side by side (landscape only) | 2 | R | hidden in portrait |
| 🔄 camera | front / back camera | 2 | R | |
| ⛶ fullscreen | | 2 | S | duplicated on the start card |
| 🎥 clip · 🎙 audio | record a video clip / audio only to a file | 1 | R | competes with ● (three record buttons side by side) |
| 🎵 Backing | jam / drums-only backing, cycles variants, long-press = menu | 2 | O | the label changes to the playing variant («🥁 Reggae · 4/10») |
| ⚙ Loop | opens the Looper panel (song file, length, metre, tempo, quantise, subdivision, arrangement) | 2 | O | name says «Loop» though the app is a linear song now |
| ● record | take into the armed track or a new one | 1 | A | |

## 3. Panels (one open at a time, light, opaque, top of the screen)
**Scale panel** (S/O): tradition, mode, key (+ cents for 1/1 tunings, «Historical 1/1»), «tuned from» (Pythagorean), chord modes row, A4
(presets + number), note layout (auto / rectangles / rows), fingers per hand, triad / seventh.
**Sound panel** (S/R, very long — scrolls several screens on a phone): timbres (solo, chord, bass, drum kit) and voice modes (polyphonic /
lead for solo and bass) · Hand functions (a select per hand per role in play) · Finger actions (per finger of the effects hand) · Effects
constructor (role select, chain as an accordion: per effect its parameters, each with mode drive/fixed, hand, finger/axis, invert; ▲▼✕;
two «+ add» lists) · Master (Glue on/off) · Diagnostics (latency meter on/off + five test switches, low-light test, notes).
**Looper panel** (O): Song file (name, Save, Open… — SAVE1) · Song (backing length, metre — only on an empty song, tempo, quantise,
subdivision) · Arrangement (harmony, rhythm, bass part, «+ Add tracks»).

## 4. Transport and strip (play screen, under the collapsed bar)
Play strip (canvas): tracks as rows with L#, name, mute/solo, ✕ (double tap), arm by tap, the brace band, footer «tracks a–b of n».
Transport buttons: ▶/❚❚ play-pause (A) · ⟳ repeat the brace (O) · ⤺ undo the last take (O) · ↶ ↷ the one history (O) · ✕ clear the song
(R, undoable) · ■ panic (R) · ✎ arrangement window (O). Empty song with history: only ↶ ↷ remain.

## 5. Arrangement window bar and editor bar
Window bar: ✕ back · title · 🎚/▤ face · zoom − + · ⤢ fit · sections ＋▯ ✂ ⧉ §✎ §✕ · −1 st / +1 st (song transpose) · ↶ ↷.
Editor bar (one scrolling line, 30 elements — UI-MAP «EDITOR BAR»): ✕ · track switch · timbre · mode · axis chip · ✚ insert · All/Mode
rows · ⬚ pick · 🗑 · ⧉ · 📋 · ⧉⁺ · ⌗ + 3 selects · −1° +1° · −1 st +1 st · ↶ ↷ · snap · lane select · + effect · ▲ ▼ ⊘ · ╱/⌐ · ▮▮/•— · zoom.

## 6. Gesture-triggered controls (no button; the hands are the interface)
| Gesture | Where | Does | Freq |
|---|---|---|---|
| Pinch thumb + finger | a note cell / rectangle | plays a note; the finger picks the register (or the note in a rectangle) | A |
| Horizontal position | while pinched | volume (or what the Volume entry is addressed to) | A |
| Hand depth | while pinched | the parameter on «play: depth» (chord brightness by default; volume optionally) | O |
| Index pinch left of the palette split | chord role, typed scales | choose the chord type (palette) | O |
| Register band (rectangles) | bottom band | shift the octave window | O |
| Effects hand (a hand set to «Effects») | anywhere in its role | each finger drives the parameters addressed to it; bars at the right edge | O |
| Expression hand | solo | liveness, wah, texture, space by movement, openness, spread, tilt | R |
| Looper hand | any role | index record, middle play/pause, ring undo take, pinky 3 s clear | R |
| Theremin hand | solo / bass | continuous pitch | R |

## 7. Problems seen (no fixes made)
1. **Duplicates:** ⛶ on the start card and in the bar; ↶ ↷ in three places (transport, window bar, editor bar — consistent, but three
   sets of the same history); 🎚 means «mixer» in the window and «bass» in role labels (now separable in `src/icons.js`); ✕ means close,
   delete, clear and «remove effect»; ⧉ means copy (editor) and duplicate bars (window).
2. **Far from where needed:** the Song file and tempo sit in the «Loop» panel, which most players open rarely; transpose lives only in the
   window/editor bars; the master Glue in the Sound panel, the master LEVEL in the mixer face — two places for the master.
3. **Hidden / hard to find:** the arrangement window behind ✎ (an edit pencil, not «tracks»); the editor only by tapping a row there;
   the backing menu by long-press; the help overlay unreachable; the editor bar overflows sideways on a phone (half its tools off screen);
   the effects constructor is a long accordion deep in the Sound panel; diagnostics/test switches mixed into the same panel.
4. **Inconsistent names:** «Loop» panel vs linear song; «Looper» hand vs «track»; «Sound» panel holds hand functions (not sound);
   «Backing» shows a rhythm name; Russian-only help; icons are device emoji (look different on every phone).
5. **Competes for attention while playing:** three record buttons (🎥 🎙 ●) side by side; the bar re-appearing on any tap over the play
   field; toasts and the «Too dark» hint over the play area; the scale button's long label in the bar.
6. **Hands in the air:** every setting needs a touch — a player whose both hands are in the camera view must drop a hand to change role,
   start/stop recording (except the looper hand), change scale, open panels. Only the looper hand gives hands-free transport.

## 8. Planned parts that are missing (where they will need room)
| Part (BACKLOG) | Needs | Likely place |
|---|---|---|
| Effects constructor with three placements (§7.14: insert on a channel, insert on the master, shared sends) | a full screen of its own: chain per track/role, master chain, send/return buses, routing view | its own screen, entered from the mixer and from a track |
| Expression lab + hand map (§3.29 ➕) | a screen with the live hand, its features, mappings, presets | its own screen from the Sound area |
| Calm mode (§7.16, the first release) | almost no chrome: a minimal play surface, big touch targets | a mode switch on the start card |
| Save / Open (SAVE1 ✓, autosave proposed) | a song library: list, names, versions, restore | a «Songs» screen (today: two buttons in the Looper panel) |
| MIDI in / out (stage 6) | device list, channel mapping, clock | a settings screen |
| Audio in / audio take (stage 5) | input select, level, monitoring, audio tracks in the window | mixer + track rows |
| World tuning catalogue browser | search, regions, listening previews | a full screen replacing the Scale panel's selects |
| Installation (kiosk) mode (§7.18) | lock-down settings, timeout reset | a settings screen behind a PIN |
| Design-system screens (§7.19) | the user's choice among proposals: colours, type, icons | a one-off preview page (artifact) — not in the app |

## 9. Principles for the redesign (proposed)
1. **The play field is sacred:** nothing that is not playing covers it while hands are in view; settings live behind one edge.
2. **Hands-in-the-air first:** what a player needs mid-performance (record, play/pause, undo take, role, key) must be reachable by a
   gesture or ONE large touch target at an edge — never inside a panel.
3. **One place per concept:** master in one place; history buttons with one look; one «tracks» entry (not ✎); a song screen for files.
4. **Frequency decides depth:** A on screen, O one tap, R two taps, S in settings; diagnostics never next to music settings.
5. **Names say what things are today** (song, tracks, sound, hands) — no legacy «loop».
6. **Own icons by meaning** (the icon component already separates «mixer» from «bass»), drawn by us, tested on the camera picture.
7. **Phone portrait is the target:** no sideways-scrolling bars; editor tools grouped in pages or a tool drawer.
8. **Calm by default:** quiet chrome, few colours, toasts away from the play field; teach in the lessons, not in labels.
