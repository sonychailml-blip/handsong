# WORK-LOG — SITE track

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`).

# SITE-1 (SITE track, 2026-11-13): handsong.app from the approved design
Tree hashes before: core 194d947d7682e4a3 · apps/full d6b90cf2cb4be6da · apps/night bf9492ecf2c60828 · tools/probes 4208a240a10ba762. After: the same (Full, Night, core and their probes untouched).
- `apps/site/`: 8 pages (EN `/`, RU `/ru/`: home, night, demo, install) + bilingual 404, `site.css` (tokens on `:root`, no inline styles), `site.js` (first visit to `/`: a saved choice, else the browser's first language, may go to `/ru/`; the switch saves the choice; storage in try/catch), self-hosted Inter + Literata (Google Fonts subsets latin + cyrillic, unmodified, OFL), pictures, favicons, `robots.txt`, `sitemap.xml` (hreflang), `vercel.json` (CSP + headers, clean URLs, trailing slash, ignoreCommand).
- Wording (founder): «Nothing to install» → «Opens right in your browser.» / «Открывается прямо в браузере.» with the new text. Install card: «More» + «Contact us» (→ the Install page's contact band). Footer on every page (the mock-ups' app pages had none: it carries the socials). CLAUDE.md's track list names SITE-n.
- Tools: `tools/site-pages.mjs`, `tools/site/texts.mjs`, `tools/site-images.mjs`, `tools/site-check.mjs` (3 CONTROLS). Register: 7 entries (two fonts, pictures, icons, own origin, app links, socials); `tools/check-licences.mjs` scans the site's pages (+ 2 CONTROLS), `.xml` counts as our own text.
- «OLD NAME gone» stays at full strength over the site's files: the old word left our texts — English «Quiet, living music…» (card, Night lead), «a gentle living screen» (Install); Russian «Тихая живая музыка…»; the design files in `docs/site/site-design/` reworded the same way (the data runner had failed on them before this run).
- Sizes: home 343 KB (EN) / 427 KB (RU) in total; Night card 78 KB WebP / 116 KB JPG; demo card 38 / 73 KB; og.jpg 96 KB.
