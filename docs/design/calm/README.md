# Calm — three design proposals (RUN 6, 2026-10-17)

Docs only: nothing in the app changed. Each page opens by itself in a browser (double-click the file, or through the app's server:
`http://127.0.0.1:5500/docs/design/calm/a-lantern.html`). No network, no fonts are fetched: the named fonts are all **SIL OFL 1.1**; a page
uses them if they are installed on the computer, otherwise it falls back to system fonts (the final app self-hosts the chosen fonts —
Calm plan §8, C11). Every icon, the app icon and the wordmark are drawn by us as SVG on these pages (no icon library, rule #32 / BACKLOG
§7.19). The forests, the black background and the «camera picture» on the mocks are procedural sketches, not the real 3D room.

Each page shows: the idea (en + ru) · the palette as `--calm-*` tokens · the controls over the three backgrounds (Forest, Dark, Camera) ·
the type pairing · ten icons (Sound, Mood, Play with, Notes follow / stay, Background, Forest volume, Lantern, ⓘ, Close) · the app icon at
180 / 64 / 32 / 16 px · the wordmark «Handsong» + «Calm» · mocks in PORTRAIT and LANDSCAPE of the forest with the controls faded in, the
first-run card and the ⓘ panel · the same screens with the longest (Russian) words.

## The three, in plain words
| | **A · Lantern** (`a-lantern.html`) | **B · Moonglass** (`b-moonglass.html`) | **C · Hush** (`c-hush.html`) |
|---|---|---|---|
| Feeling | warm, old, storybook night — the prototype's look made calm | cool moonlight, modern, soft and rounded | almost nothing on screen; quiet and airy |
| Controls | words with small line icons on a soft dark band at the bottom; the chosen one has an ember outline | big round touch buttons in a floating frosted-glass capsule | a short list of lowercase words straight on the night, no boxes |
| Over the camera picture | the dark band behind the controls keeps them readable | the glass blurs the picture behind it — reads the same everywhere | a dark halo around each letter; the weakest of the three on a busy, bright room |
| Colours | parchment words, ember accent, firefly-green light | moon-silver words, firefly-lime accent, moon-blue details | warm white words, lamp-gold accent, firefly light |
| Fonts (OFL) | Marcellus (titles) + Commissioner (text) | Fraunces (titles) + Atkinson Hyperlegible (text, made for low vision) | Jost only (smallest download) |
| Cyrillic | Commissioner yes; Marcellus no (Russian titles need a second serif) | to be checked for both | yes |
| App icon | a pinching hand in line, a firefly at the pinch, trees behind | a crescent moon, the pinch, a lime light | five dots (the five notes) with one glowing |
| Best for | the forest as a story; closest to what you liked in the prototype | children and older people (big targets, very legible); phones in bright rooms | people who want nothing between them and the forest |
| Risk | the most «decorated»; Russian titles need a font decision | the glass blur costs GPU on weak phones (a plain dark fallback is easy) | the controls can feel too hidden; text on a busy camera picture |

## Our suggestion
**B · Moonglass** for Calm v1 if the people we want first are beginners, children and older people (large round targets, the most legible
text, the same look over all three backgrounds), with **A's warm palette** as an option to try on it. **A · Lantern** if Calm should feel
like the prototype's night story. **C · Hush** is the purest, but it asks the most of the person (finding the controls) and reads weakest
over the camera. Mixing is fine: e.g. A's colours and wordmark with B's round buttons.

## What we need from you
1. Which direction (or which parts of which) — by looking at the portrait mocks on your phone (open the file there) and on the desktop.
2. The app icon you like best (it can come from another direction than the controls).
3. Anything that feels wrong — a colour, an icon that does not say what it does, a word.

After your choice, C11 applies it: the tokens go into `tokens.css` (`--calm-*`), the icons into `src/icons.js` (by meaning), the fonts as
self-hosted OFL files with licence entries (LIC1), and the Calm screens get ui-snap pictures for both orientations.

Proposed wording of the two note modes (review 2026-10-17), shown on all three: **Notes: follow the hand** / **Notes: stay put** — ru
**Ноты: за рукой** / **Ноты: на месте**.
