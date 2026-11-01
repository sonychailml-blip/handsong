# core/DEBT.md: code that is in core/ only because something blocks its move

This list may only shrink (static check 15). Each line: what is here, the rule it breaks, what frees it. Plan: `docs/SPLIT-PLAN.md` §3.3.

- `core/legacy-ui/**` (boot, ui, draw, latmeter, views, style.css): no UI in core. Freed by Night's own start, doors and drawing (NIGHT-n); the rest then moves to `apps/full/` (FULL-n).
- `views/roll.js`, `views/strip.js`: Full-only code in core. Freed when `views/play.js` stops importing them.
- `song/{automation,clipboard,commands,edit-*,quantise,sections,transpose}`, `arrange`, `live/backing`, `autosave`, `clip`, `freeze/registry`: Full-only in practice. Freed by splitting the `recorder.js` facade so Night plays without the recording path (a dedicated CORE run).
- `modules/effects/{forestdepth,calm}`, `modules/ambience/forest`, `modules/timbres/strikes`, `pure/ambience`, `pure/calmui`: Night-only in core. Freed by an engine registration door. Trap: the engine exists as two instances (`audio.js`, `audio.js?render`), so registration must reach both, and GOLD, render tails and the contract rows must follow.
- The Night branches in `state`, `audio`, `views/play`, `gestures/*`, `profile` (`CALM_CHAIN`, `target`): core knows about Night. Each becomes a named option.
- Night's dictionary keys in `i18n.js`: app-only strings in core. Freed when dictionaries become per-app plus shared.
