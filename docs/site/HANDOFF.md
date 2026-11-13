# HANDOFF — SITE track (handsong.app, the brand site)

The site lives in `apps/site/`: plain static HTML/CSS (no framework, no build, no canvas runtime). English at `/`, Russian at `/ru/`; pages: home, `night/`, `demo/`, `install/`, and a bilingual `404.html`. Design: the founder's approved variant B «Gallery» (`site-design/`). Rules #32 (licences) and #33 (privacy) apply: no analytics, counters, cookies or third-party requests; fonts self-hosted; CSP self only (meta in every page + header in `apps/site/vercel.json`).

## How it is made
- Texts (both languages): `tools/site/texts.mjs`. Pages, 404, `sitemap.xml`, `robots.txt`: `node tools/site-pages.mjs --write` (never edit the HTML by hand — the check fails on a page that differs).
- Pictures: `node tools/site-images.mjs` (`--only forest|demo|icons`; `--fresh` re-renders the forest). Night card and page: the forest through the still's rest camera (as `tools/night-still.mjs`), undimmed, portrait crop, WebP + JPG ≤ 150 KB. Tech demo card: the live https://handsong.vercel.app start screen at phone size, shown as a phone screen in the card. Install: a drawn wall with the forest projected on it. Sharing picture `img/og.jpg` 1200 × 630 with the emblem and wordmark. Favicons from `favicon.svg`.
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
- `SITE-1` (2026-11-13) built; waits for the Vercel project, DNS, and the user's checks: a link in Telegram shows the picture; the pages on a real phone; the RU redirect in a Russian browser.
