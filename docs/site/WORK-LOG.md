# WORK-LOG — SITE track

Each entry starts: track, number, date, tree hashes before and after (`node tools/tree-hash.mjs core apps/full apps/night`).

# SITE-3 (SITE track, 2026-11-19): the demo at demo.handsong.app
Tree hashes after: apps/site ae5dbf3a7437b014 (no «before» hash: the pages were regenerated before it was taken). Core and Full untouched; Night only `apps/night/licences.html` regenerated (the register's link).
- `tools/site/texts.mjs` LINKS.demo → https://demo.handsong.app; `node tools/site-pages.mjs --write` (home and demo, EN and RU). `tools/site-images.mjs` shoots the demo card from the new address (the picture itself not renewed: the same app).
- `tools/licences.json` (the site's app links), `THIRD-PARTY-LICENSES.md` and `apps/night/licences.html` regenerated.
- `tools/site-check.mjs` row «the demo address» (the home cards and the demo pages link there; no page names handsong.vercel.app; CONTROL caught).
- Verdict: [site-check] PASS — every page in both languages at phone and laptop width …; 5 controls caught · 56.6 s (the new row: clean, its control caught). Fix rounds: 0.

# SITE-2 (SITE track, 2026-11-14): «Install» renamed «Handsong Space»
Tree hashes before and after: core f35f07b9825d7997 · apps/full 0148bb454440c3e3 · apps/night a92abb3fc8dffa21 (NIGHT-14d's, measured with this run's tree) (the site only: core, Full and Night untouched by this run).
- Why (the founder): «Install» read as «install the software» and clashed with «Add to Home Screen»; «Space» is the venue product (museums, galleries, events, hotel lounges, children's centres).
- `tools/site/texts.mjs`: the card and the page under the key `space`, both languages (RU keeps the Latin «Handsong Space»): name, aria, <title> («Handsong Space — a musical installation for your venue» / «… для вашей площадки»), h1, the picture's alt («Handsong Space: the night forest projected on a wall…»), the closing call («where and for whom you'd like Handsong Space»). Kept on purpose: «a musical installation» / «музыкальная инсталляция» (the art form, the word venues use) and the home page's «nothing to install» (it does mean installing software); «You set up the equipment yourself» (setting up equipment) unchanged.
- `tools/site-pages.mjs`: PAGES and the address `/space/`; `apps/site/space/`, `apps/site/ru/space/` written, the old `install/` pages removed; `site.css` classes `app-space`, `hero-space`, `--space`. `apps/site/vercel.json`: `/install`, `/install/` → `/space/` and `/ru/install`, `/ru/install/` → `/ru/space/`, permanent (308).
- `tools/site-check.mjs`: its server honours vercel.json's redirects; row «no product named Install» over every page and file of the site (no «Handsong Install», no «Install» as a name, no link to /install/; the four old addresses → 308 to the new ones); CONTROLS: a page naming «Handsong Install» caught, the redirects removed caught.
- Verdicts: static PASSED · node --check on the changed tools · [probe-data] PASS — 76 checks, 0 differences · [site-check] PASS — every page in both languages at phone and laptop width …; 5 controls caught (the new row: 10 pages and files clean, the four old addresses → 308; CONTROLS a page naming it and the redirects removed caught). Fix rounds: 0.

# SITE-1 (SITE track, 2026-11-13): handsong.app from the approved design
Tree hashes before: core 194d947d7682e4a3 · apps/full d6b90cf2cb4be6da · apps/night bf9492ecf2c60828 · tools/probes 4208a240a10ba762. After: the same (Full, Night, core and their probes untouched).
- `apps/site/`: 8 pages (EN `/`, RU `/ru/`: home, night, demo, install) + bilingual 404, `site.css` (tokens on `:root`, no inline styles), `site.js` (first visit to `/`: a saved choice, else the browser's first language, may go to `/ru/`; the switch saves the choice; storage in try/catch), self-hosted Inter + Literata (Google Fonts subsets latin + cyrillic, unmodified, OFL), pictures, favicons, `robots.txt`, `sitemap.xml` (hreflang), `vercel.json` (CSP + headers, clean URLs, trailing slash, ignoreCommand).
- Wording (founder): «Nothing to install» → «Opens right in your browser.» / «Открывается прямо в браузере.» with the new text. Install card: «More» + «Contact us» (→ the Install page's contact band). Footer on every page (the mock-ups' app pages had none: it carries the socials). CLAUDE.md's track list names SITE-n.
- Tools: `tools/site-pages.mjs`, `tools/site/texts.mjs`, `tools/site-images.mjs`, `tools/site-check.mjs` (3 CONTROLS). Register: 7 entries (two fonts, pictures, icons, own origin, app links, socials); `tools/check-licences.mjs` scans the site's pages (+ 2 CONTROLS), `.xml` counts as our own text.
- «OLD NAME gone» stays at full strength over the site's files: the old word left our texts — English «Quiet, living music…» (card, Night lead), «a gentle living screen» (Install); Russian «Тихая живая музыка…»; the design files in `docs/site/site-design/` reworded the same way (the data runner had failed on them before this run).
- Sizes: home 343 KB (EN) / 427 KB (RU) in total; Night card 78 KB WebP / 116 KB JPG; demo card 38 / 73 KB; og.jpg 96 KB.
