# HANDOFF — SITE track (handsong.app, the brand site)

The site lives in `apps/site/`: plain static HTML/CSS (no framework, no build, no canvas runtime). English at `/`, Russian at `/ru/`; pages: home, `night/`, `demo/`, `space/` (SITE-2: «Handsong Space», formerly «Install»; `/install` and `/ru/install` redirect permanently, `apps/site/vercel.json`), and a bilingual `404.html`. Design: the founder's approved variant B «Gallery» (`site-design/`). Rules #32 (licences) and #33 (privacy) apply: no analytics, counters, cookies or third-party requests; fonts self-hosted; CSP self only (meta in every page + header in `apps/site/vercel.json`).

## How it is made
- Texts (both languages): `tools/site/texts.mjs`. Pages, 404, `sitemap.xml`, `robots.txt`: `node tools/site-pages.mjs --write` (never edit the HTML by hand — the check fails on a page that differs).
- Pictures: `node tools/site-images.mjs` (`--only forest|demo|icons`; `--fresh` re-renders the forest). Night card and page: the forest through the still's rest camera (as `tools/night-still.mjs`), undimmed, portrait crop, WebP + JPG ≤ 150 KB. Tech demo card: the live https://demo.handsong.app start screen (SITE-3: the demo moved there; handsong.vercel.app redirects) at phone size, shown as a phone screen in the card. Space: a drawn wall with the forest projected on it. Sharing picture `img/og.jpg` 1200 × 630 with the emblem and wordmark. Favicons from `favicon.svg`.
- A video later: give a page's text `videoSrc: { src, poster }` (home `home.videoSrc`, Night `night.videoSrc`); the layout's slot renders it (the files go to `apps/site/`, own origin; a host for video needs the user's decision and the CSP).
- Check: `node tools/site-check.mjs` (`--shots` for captures + `tools/.site-shots/index.html`).

## Deploy (the user sets it up once)
Vercel → Add New Project → this repository:
- Project name e.g. `handsong-site`; **Root Directory** `apps/site`; Framework Preset **Other**; Build Command and Output Directory: leave empty (no override); Install Command: empty (vercel.json sets `""`).
- Settings → Git → **Production Branch** `dev`.
- **Ignored Build Step**: already in `apps/site/vercel.json` (`ignoreCommand`; it wins over the dashboard). The same command, if the dashboard field is wanted: `if git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . ; then exit 0; else exit 1; fi` (runs in `apps/site`; exit 0 = skip, 1 = build).
- Settings → Domains: add `handsong.app` and `www.handsong.app`; set `www` to redirect (308) to `handsong.app`.
- Cloudflare DNS (DNS only, grey cloud): `A  @  76.76.21.21` and `CNAME  www  cname.vercel-dns.com`. If Vercel's Domains page shows other values (newer projects may show `A 216.198.79.1` or a project-specific `…vercel-dns-0xx.com`), use what it shows. Leave the `night` record and any MX/TXT (mail for hello@handsong.app) as they are. A CAA record, if present, must allow `letsencrypt.org`.

## State
- ✅ **Live** (the founder, 2026-11-23): https://handsong.app works — the Vercel project and DNS are set up. The waits below for the project and DNS are done; the founder's look at the pages stays open.
- `SITE-4` (2026-11-28): Handsong (play.handsong.app, the Light app) — the FIRST card on the home page and its page `/play/` (both languages); four cards in one row on a wide screen (two by two in between); the card picture `img/light-card.*` = Handsong's start screen from `apps/light/` (`node tools/site-images.mjs --only light`); register: the picture files, the link. site-check PASS (every page, both languages, phone and laptop; 5 controls). ⚠ The site deploys on a push to `dev`.
- `SITE-3` (2026-11-19): the Tech demo card and page link to https://demo.handsong.app (the demo moved; handsong.vercel.app redirects); site-check row «the demo address» (CONTROL a page with the old address).
- `SITE-2` (2026-11-14): the venue product «Install» renamed «Handsong Space» (the founder: «Install» read as installing software and clashed with «Add to Home Screen»); both languages, page `/space/`, the old address a 308 redirect; site-check row «no product named Install» (CONTROLS: a page naming it, the redirect missing). Mock-ups in `site-design/` keep the old name on purpose. Waits for the founder's look at /space/ and /install on the live site.
- `SITE-1` (2026-11-13) built; waits for the Vercel project, DNS, and the user's checks: a link in Telegram shows the picture; the pages on a real phone; the RU redirect in a Russian browser.
