/* SITE-1 — THE BRAND SITE'S PAGES from one template: apps/site/{,night/,demo/,install/}index.html in English, the same under ru/, the
   bilingual 404.html, sitemap.xml and robots.txt. The texts live in tools/site/texts.mjs. The written files are plain static HTML (no
   build step on the host); tools/site-check.mjs fails when a page differs from what this tool makes.
     node tools/site-pages.mjs           report which files are out of date (exit 1 if any)
     node tools/site-pages.mjs --write   write them */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { T, LINKS, ORIGIN } from './site/texts.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SITE=path.join(ROOT,'apps/site');
export const CSP="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
export const PAGES=['home','night','demo','install'];
const SLUG={ home:'/', night:'/night/', demo:'/demo/', install:'/install/' };
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const pathOf=(lang,page)=>T[lang].prefix+SLUG[page];
const other=l=>l==='en'?'ru':'en';

const CHEVRON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6"/></svg>';
const EMBLEM='<span class="emblem" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
const pic=(name,w,h,alt,lazy)=>`<picture><source type="image/webp" srcset="/img/${name}.webp"><img src="/img/${name}.jpg" alt="${esc(alt)}" width="${w}" height="${h}" decoding="async"${lazy?' loading="lazy"':''}></picture>`;
/* the Install picture: the forest on a projected wall, a visitor in front (drawn, the projection a real frame) */
const wall=(alt,lazy)=>`<span class="wall"${alt?` role="img" aria-label="${esc(alt)}"`:''}><span class="wall-proj">${pic('forest-wall',720,405,'',lazy)}</span><span class="wall-beam"></span><span class="wall-person"></span></span>`;

function langSwitch(lang,page,t){
  const a=l=>l===lang ? `<span class="on" aria-current="page" lang="${l}">${l.toUpperCase()}</span>` : `<a href="${pathOf(l,page)}" lang="${l}" hreflang="${l}" data-lang="${l}" title="${esc(T[l].name)}">${l.toUpperCase()}</a>`;
  return `<span class="lang" role="group" aria-label="${esc(t.nav.lang)}">${a('ru')}${a('en')}</span>`;
}
function head(lang,page,title,desc){
  const t=T[lang], url=ORIGIN+pathOf(lang,page);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${ORIGIN+pathOf('en',page)}">
<link rel="alternate" hreflang="ru" href="${ORIGIN+pathOf('ru',page)}">
<link rel="alternate" hreflang="x-default" href="${ORIGIN+pathOf('en',page)}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0f1012">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/icon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Handsong">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:locale:alternate" content="${T[other(lang)].ogLocale}">
<meta property="og:image" content="${ORIGIN}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="hand·song">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ORIGIN}/img/og.jpg">
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/literata-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css">
<script src="/site.js"></script>
</head>
<body>
`;
}
function footer(lang,id){
  const t=T[lang].footer;
  return `<footer class="foot"${id?` id="${id}"`:''}>
<div class="wrap foot-in">
<div class="foot-col"><span class="wordmark wordmark-s">hand·song</span><span class="fine">${esc(t.tag)}</span></div>
<div class="foot-col"><span class="kicker">${esc(t.contact)}</span><span class="email">${LINKS.email}</span></div>
<div class="foot-col"><span class="kicker">${esc(t.social)}</span><div class="btns">
<a class="btn btn-ghost btn-s" href="${LINKS.youtube}" rel="me noopener">YouTube</a>
<a class="btn btn-ghost btn-s" href="${LINKS.instagram}" rel="me noopener">Instagram</a>
<a class="btn btn-ghost btn-s" href="${LINKS.tiktok}" rel="me noopener">TikTok</a>
</div></div>
</div>
</footer>
</body>
</html>
`;
}
function appHeader(lang,page){
  const t=T[lang];
  return `<header class="wrap top">
<a class="back" href="${pathOf(lang,'home')}">${CHEVRON}${esc(t.back)}</a>
<div class="top-r"><a class="wordmark wordmark-s plain" href="${pathOf(lang,'home')}" aria-label="${esc(t.brandHome)}">hand·song</a>${langSwitch(lang,page,t)}</div>
</header>
`;
}
const h1=(a)=>`${esc(a[0])}<i>${esc(a[1])}</i>`;
/* a video block is left out until the video exists: pass { src, poster } in a page's text (videoSrc) and the layout's slot takes it */
const video=(h,v)=>{ if(!v) return ''; const el=`<video class="video" src="${v.src}" poster="${v.poster}" controls preload="none" playsinline></video>`;
  return h ? `<div class="col"><h2 class="h2">${esc(h)}</h2>${el}</div>` : el; };

function home(lang){
  const t=T[lang], H=t.home, C=H.cards, p=l=>pathOf(lang,l);
  const card=(k,picHtml,go,goHref,more,moreHref)=>`<article class="app app-${k}">
<a class="app-pic" href="${p(k)}" aria-label="${esc(C[k].aria)}">${picHtml}<span class="app-cap"><span class="badge">${esc(C[k].badge)}</span><span class="app-name">${esc(C[k].name)}</span></span></a>
<p class="app-text">${esc(C[k].text)}</p>
<div class="btns app-btns"><a class="btn" href="${goHref}">${esc(go)}</a><a class="btn btn-ghost" href="${moreHref}">${esc(more)}</a></div>
</article>`;
  return head(lang,'home',H.title,H.desc)+`<header class="wrap top">
<a class="brand plain" href="${p('home')}" aria-label="${esc(t.brandHome)}">${EMBLEM}<span class="wordmark">hand·song</span></a>
<nav class="nav" aria-label="${esc(t.nav.label)}"><a href="#apps">${esc(t.nav.apps)}</a><a href="#about">${esc(t.nav.about)}</a><a href="#contact">${esc(t.nav.contact)}</a>${langSwitch(lang,'home',t)}</nav>
</header>
<main>
<section id="apps" class="wrap hero-home">
<div class="intro"><h1 class="h1">${h1(H.h1)}</h1><p class="sub">${esc(H.sub)}</p></div>
<div class="apps">
${card('night', pic('night-card',740,1151,''), C.night.go, LINKS.night, C.night.more, p('night'))}
${card('demo', `<span class="screen">${pic('demo-card',740,1151,'',true)}</span>`, C.demo.go, LINKS.demo, C.demo.more, p('demo'))}
${card('install', wall('',true), C.install.go, p('install'), C.install.more, p('install')+'#contact')}
</div>
</section>
<section id="about" class="rule">
<div class="wrap about">
<div class="col"><h2 class="h2">${esc(H.aboutH)}</h2><p class="body">${esc(H.aboutP)}</p>${video('',H.videoSrc)}</div>
<ul class="list list-diff" aria-label="${esc(H.diffLabel)}">
${H.diff.map(([b,s])=>`<li><b>${esc(b)}</b> <span>${esc(s)}</span></li>`).join('\n')}
</ul>
</div>
</section>
</main>
`+footer(lang,'contact');
}
function appPage(lang,page){
  const t=T[lang], P=t[page], heroPic= page==='night' ? `<div class="hero-pic hero-night">${pic('night-card',740,1151,P.picAlt)}</div>`
    : page==='demo' ? `<div class="hero-pic hero-demo"><span class="screen">${pic('demo-card',740,1151,P.picAlt)}</span></div>` : `<div class="hero-pic hero-install">${wall(P.picAlt)}</div>`;
  const goHref= page==='night' ? LINKS.night : page==='demo' ? LINKS.demo : '#contact';
  let body=`<section class="wrap hero">
${heroPic}
<div class="hero-text">
<span class="label">${esc(P.label)}</span>
<h1 class="h1 h1-app">${h1(P.h1)}</h1>
<p class="lead">${esc(P.lead)}</p>
<div class="btns"><a class="btn btn-l" href="${goHref}">${esc(P.go)}</a></div>
${P.small?`<p class="fine">${esc(P.small)}</p>`:''}
</div>
</section>
`;
  if(P.cols) body+=`<section class="rule"><div class="wrap cols">
${P.cols.map(([h,s])=>`<div class="col"><h2 class="h3">${esc(h)}</h2><p class="soft">${esc(s)}</p></div>`).join('\n')}
</div></section>
`;
  if(page==='night') body+=`<section class="rule"><div class="wrap split">
${video(P.videoH,P.videoSrc)}<div class="col col-feats"><h2 class="h2">${esc(P.featH)}</h2><ul class="list">
${P.feats.map(s=>`<li>${esc(s)}</li>`).join('\n')}
</ul></div>
</div></section>
<section class="wrap band-wrap"><div class="band"><p class="band-h">${esc(P.band)}</p><a class="btn btn-l" href="${LINKS.night}">${esc(P.go)}</a></div></section>
`;
  if(page==='demo') body+=`<section class="wrap band-wrap"><div class="band"><p class="band-h">${esc(P.band)}</p><span class="email email-l">${LINKS.email}</span></div></section>
`;
  if(page==='install') body+=`<section class="rule"><div class="wrap stack">
<h2 class="h2">${esc(P.spacesH)}</h2>
<div class="tiles">
${P.spaces.map(([h,s])=>`<div class="tile"><h3 class="h4">${esc(h)}</h3><p class="soft">${esc(s)}</p></div>`).join('\n')}
</div>
</div></section>
<section class="rule"><div class="wrap split">
<div class="col"><h2 class="h2">${esc(P.needH)}</h2><ul class="list">
${P.need.map(s=>`<li>${esc(s)}</li>`).join('\n')}
</ul><p class="fine">${esc(P.needSmall)}</p></div>
<div class="col"><h2 class="h2">${esc(P.easyH)}</h2><ul class="list list-diff">
${P.easy.map(([b,s])=>`<li><b>${esc(b)}</b> <span>${esc(s)}</span></li>`).join('\n')}
</ul></div>
</div></section>
<section id="contact" class="wrap band-wrap"><div class="band band-warm"><div class="band-col"><p class="band-h">${esc(P.bandH)}</p><p class="soft">${esc(P.bandP)}</p></div><span class="email email-xl">${LINKS.email}</span></div></section>
`;
  return head(lang,page,P.title,P.desc)+appHeader(lang,page)+`<main>\n${body}</main>\n`+footer(lang);
}
function page404(){
  const e=T.en.e404, r=T.ru.e404;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(e.title)}</title>
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0f1012">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/icon-32.png" type="image/png" sizes="32x32">
<link rel="stylesheet" href="/site.css">
</head>
<body>
<header class="wrap top"><a class="brand plain" href="/" aria-label="${esc(T.en.brandHome)}">${EMBLEM}<span class="wordmark">hand·song</span></a></header>
<main class="wrap nf">
<section class="nf-col"><h1 class="h1 h1-app">${esc(e.h1)}</h1><p class="soft">${esc(e.p)}</p><div class="btns"><a class="btn" href="/">${esc(e.home)}</a></div></section>
<section class="nf-col" lang="ru"><h2 class="h1 h1-app">${esc(r.h1)}</h2><p class="soft">${esc(r.p)}</p><div class="btns"><a class="btn" href="/ru/">${esc(r.home)}</a></div></section>
</main>
</body>
</html>
`;
}
function sitemap(){
  const u=[]; for(const pg of PAGES) for(const l of ['en','ru']) u.push(`<url><loc>${ORIGIN+pathOf(l,pg)}</loc>${['en','ru'].map(k=>`<xhtml:link rel="alternate" hreflang="${k}" href="${ORIGIN+pathOf(k,pg)}"/>`).join('')}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${u.join('\n')}\n</urlset>\n`;
}
/* every generated file: repo path → text */
export function build(){
  const out={};
  for(const l of ['en','ru']) for(const pg of PAGES){ const rel='apps/site'+pathOf(l,pg)+'index.html'; out[rel]= pg==='home' ? home(l) : appPage(l,pg); }
  out['apps/site/404.html']=page404();
  out['apps/site/sitemap.xml']=sitemap();
  out['apps/site/robots.txt']=`User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
  return out;
}
export function stale(){ return Object.entries(build()).filter(([f,s])=>!existsSync(path.join(ROOT,f)) || readFileSync(path.join(ROOT,f),'utf8')!==s).map(([f])=>f); }

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const files=build();
  if(process.argv.includes('--write')){ for(const [f,s] of Object.entries(files)){ mkdirSync(path.dirname(path.join(ROOT,f)),{ recursive:true }); writeFileSync(path.join(ROOT,f), s); }
    console.log(`[site-pages] wrote ${Object.keys(files).length} files under apps/site/`); }
  else { const s=stale(); console.log(s.length ? `[site-pages] NOT CURRENT — ${s.join(', ')} (run: node tools/site-pages.mjs --write)` : `[site-pages] current — ${Object.keys(files).length} files`); process.exit(s.length?1:0); }
}
